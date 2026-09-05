# データ保存構造の調査と、クラウド保存へ向けた整理

2026-09-05 時点の `saniwa-app` について、どのデータがどこに保存されているかを洗い出し、
将来「ユーザーごとにクラウド保存して PC・スマホ間で同期する」ために必要な整理をまとめたものです。

## 1. 保存のしくみ(全体像)

- 永続化に使っているのは **ブラウザの localStorage だけ** です。IndexedDB、Cookie、Service Worker のキャッシュ、サーバー通信はありません。
- `sessionStorage` はバックアップ画面の「復元しました」通知を一度だけ出すためのフラグに使っているのみです(データではありません)。
- 各機能は `index.html` の中に **iframe** として開かれますが、すべて同じオリジン(同じドメイン)なので localStorage は共有です。iframe だからといって別の場所に保存されているわけではありません。
- 保存キーはすべて `saniwa-tool.<機能名>.v1` という名前で、値は JSON 文字列です。
- 画面同士のデータ受け渡しは、親(`assets/app.js`)経由の `postMessage` で行っています。例: 刀剣男士ページの編集 → 親 → 部屋割り・相関図・戦績・3D に配布。

### 保存キー一覧

| キー | 内容 | 値の形 | 読み書きしている場所 | 保存されるタイミング |
|---|---|---|---|---|
| `saniwa-tool.master.v1` | 刀剣男士の台帳(正本) | `Character[]` | `assets/master.js` 17-26行 | 編集モーダルを閉じたとき、新規追加時、セリフ保存時、画面を閉じるとき(pagehide) |
| `saniwa-tool.rooms.v1` | 部屋割り | `{ unplaced: {id,name}[], rooms: Room[] }` | `assets/rooms.js` 36-45行 | 配置変更・部屋追加のたび(notify)、pagehide |
| `saniwa-tool.honmaru3d.v1` | 3D 建築(棟・部屋の位置回転・建築パーツ・家具・時間帯) | `{ version:2, wings, roomLayouts, buildingObjects, timeMode }` | `pages/honmaru3d.html` `loadBuildingState` / `saveBuildingState` | 変更のたびに自動保存、保存ボタン、pagehide |
| `saniwa-tool.network.v1` | 相関図 | `{ tabs: Tab[], activeTabId }` | `assets/network.js` 57-69行 | 関係・配置・タブ操作のたび(notify)、pagehide |
| `saniwa-tool.report.v1` | 日報 | `{ version:2, entries: { "YYYY-MM-DD": Entry } }` | `assets/report-data.js` 108-125行 | 日報の保存ボタン、経験値計算機からの記録追加 |
| `saniwa-tool.diary.v1` | 日誌 | `{ version:1, works: Work[] }` | `assets/diary.js` 15-40行 | 保存ボタン、章やタイトルの確定時 |
| `saniwa-tool.app.v1` | ホームの更新履歴、共有キャラ一覧(写し) | `{ activityLog, sharedCharacters }` | `assets/app.js` 243-253行 | キャラ更新受信時、履歴追加時、pagehide |

読み取り専用で他のキーを覗いている箇所: `assets/diary-reference.js` 15-18行(日誌の参照シートが master / rooms / network / app を読む)。

### 保存されていない(メモリ上だけの)もの

再読み込みすると消えます。今回は変更していません。

- 戦績 > 経験値計算機の入力値(現在の経験値、目標経験値、1周の経験値、マップ選択、倍率チェックなど)。`assets/expcalc.js` の `characters[].currentExp` 等と画面上部の `let` 変数。
- 各画面のモーダルの開閉、選択中のタブやツール、3D のカメラ位置、ホームのバナー位置。
- 3D の「建築編集モード」の ON/OFF。

## 2. データ別の管理状況

| データ | 正本(マスター) | 写し・派生 | 備考 |
|---|---|---|---|
| 刀剣男士 | `master.v1`(名前、刀種、極、レベル、顕現日、部隊、隊長、身長、趣味、元主、セリフ、メモ) | `app.v1.sharedCharacters`(id、名前、刀種、レベル、顕現日、部隊、隊長、極のみ)。部屋割り・相関図・戦績・3D はメモリ上に写しを持つ | 初期10振りは各ファイルにハードコード(`CHAR_NAMES`)。id は `"c0"`〜`"c9"` と `"c" + Date.now()` |
| 部屋割り | `rooms.v1` | `rooms.unplaced` に名前を重複保持 | 部屋 id は `"r" + Date.now()`。部屋タイプは `template` キー(a / b / c / living / kitchen / toilet / forge / large) |
| 3D 建築 | `honmaru3d.v1` | 部屋の存在自体は `rooms.v1` が正本で、3D は `roomLayouts[roomId]` に位置・回転・棟だけを持つ | 部屋が削除されても `roomLayouts` に残骸が残る(害はない) |
| 家具 | `honmaru3d.v1.buildingObjects` のうち `category: "furniture"` の `type`(tansu / chabudai / futon / sofa) | なし | 建築パーツと同じ配列。種類ごとの定義は `PART_DEFS` |
| 日誌 | `diary.v1` | なし | 作品 → 章 → 本文の階層 |
| 相関図 | `network.v1` | なし | タブ単位。関係の from / to は刀剣男士の id |
| 日報 | `report.v1` | 経験値計算機からの記録は `entries[date].expRecords` | 日付キーで管理 |
| ユーザー設定 | `honmaru3d.v1.timeMode`(時間帯)だけ | なし | それ以外の設定項目は現状なし |
| ホーム更新履歴 | `app.v1.activityLog`(最大30件) | なし | 手入力の「公式の更新」も同じ配列 |

## 3. 気づいた課題(クラウド化の前に知っておくこと)

1. **刀剣男士が3箇所に分かれている**: master、app.sharedCharacters、rooms.unplaced(名前)。同期は postMessage 頼みなので、クラウド同期で片方だけ更新されると食い違います。
2. **id が端末時刻ベース**(`Date.now()`): 2台の端末で同時に追加すると衝突し得ます。クラウド化時は `crypto.randomUUID()` などに切り替えるのが安全です(既存 id はそのまま使えます)。
3. **保存が pagehide 頼みの画面がある**: 刀剣男士・部屋割り・相関図はモーダルを閉じるか画面を離れるまで保存されないことがあります。クラウド同期では「いつ書き込むか」を明示的にする必要があります。
4. **バージョン番号があるのは 3D(version 2)・日報(version 2)・日誌(version 1)だけ**: master / rooms / network / app は形の版が記録されていません。将来の形式変更に備え、全ストアに `schemaVersion` と `updatedAt` を持たせるのが望ましいです。
5. **「端末の状態」と「ユーザーのデータ」が混ざっている**: `network.activeTabId`、`honmaru3d.timeMode`、`app.activityLog` は端末ごとに違ってよい情報です。クラウドに載せるもの・載せないものを分けておくと同期が単純になります。
6. **localStorage の上限**(おおむね 5 MB): 現状は数十 KB 程度なので余裕がありますが、日誌の本文が増えると近づきます。

## 4. クラウド保存に移行しやすいデータ構造(提案)

### 4-1. まず「1ユーザー = 1ドキュメント」から始める

初心者向けに一番単純で、後から分割もしやすい形です。今の localStorage の各キーを、そのまま1つの JSON の中に並べます。今回追加したバックアップ JSON がこの形の第一歩です。

```jsonc
{
  "schemaVersion": 1,
  "updatedAt": "2026-09-05T05:00:00.000Z",   // 全体の最終更新(同期の比較に使う)
  "device": { "id": "uuid", "name": "iPhone" }, // どの端末が書いたか(任意)
  "profile": { "displayName": "審神者名" },     // ログイン後に埋める
  "data": {
    "characters": [ ...master.v1 の配列... ],   // 正本はここだけにする
    "rooms":      { "rooms": [], "unplaced": [] },
    "building":   { "wings": [], "roomLayouts": {}, "buildingObjects": [] },
    "network":    { "tabs": [] },
    "report":     { "entries": {} },
    "diary":      { "works": [] }
  },
  "deviceState": {                              // 端末ごとに違ってよい(同期しない)
    "network": { "activeTabId": "" },
    "building": { "timeMode": "noon" },
    "home": { "activityLog": [] }
  }
}
```

ポイント:

- **正本を一本化**: `characters` を正本にし、`app.sharedCharacters` は起動時にそこから作る(保存しない)。`rooms.unplaced` は id だけ持ち、名前は都度引く。
- **各ストアに `updatedAt`**: 「どちらが新しいか」で単純に上書きする方式(Last-Write-Wins)なら、これだけで PC・スマホ間の同期ができます。
- **id は UUID**: 新規作成時だけ `crypto.randomUUID()` に変更。既存の `"c0"` や `"r1720..."` はそのまま。
- **`deviceState` は同期対象外**: 時間帯や更新履歴は端末に残す。

### 4-2. 保存処理を「アダプタ」に寄せる

各画面が `localStorage.getItem / setItem` を直接呼んでいる箇所を、`assets/storage-registry.js` の `readRaw / writeRaw` のような**1つの窓口**経由にします。クラウド化のときは、この窓口の中身を「localStorage に書く + サーバーにも送る」に変えるだけで済み、各画面は触らなくてよくなります。

```
[各画面] --save(id, data)--> [storage adapter] --> localStorage(即時)
                                              └--> クラウド(ログイン中のみ、後で)
[各画面] <--load(id)--------- [storage adapter] <-- localStorage / クラウドから同期済みの値
```

### 4-3. 将来の分割(必要になったら)

日誌の本文が大きくなったら、`diary.works[]` だけを「作品ごとの別ドキュメント」に分けます。他はまとめたままで問題ありません。

## 5. 今回追加したもの(バックアップ機能)

- `assets/storage-registry.js`: 保存キーの台帳(`STORES`)と、全データの書き出し(`exportAll`)・取り込み(`stagePendingImport` → 再読み込み → `applyPendingImport`)。
- `pages/backup.html` / `assets/backup.js` / `assets/backup.css`: ホームのメニュー「設定・バックアップ」から開く画面。保存状況の一覧、JSON のダウンロード・コピー、ファイルまたは貼り付けからの復元、復元前の状態への巻き戻し。
- `assets/app.js`: 起動時の `applyPendingImport()` 呼び出し(1行)と、書き出し前に各画面の未保存状態を保存させる `window.saniwaFlushState`。メニュー項目の追加。
- `index.html`: `storage-registry.js` の読み込み追加。

既存の各画面の保存処理は変更していません。復元は「次回起動時に反映」する方式なので、開いている画面が pagehide で古いデータを書き戻す問題を避けています。復元の直前の状態は `saniwa-tool.snapshot-before-import.v1` に1世代だけ退避され、バックアップ画面から戻せます。

バックアップ JSON の形:

```jsonc
{
  "format": "saniwa-tool-backup",
  "version": 1,
  "exportedAt": "2026-09-05T05:00:00.000Z",
  "stores": {
    "master": [...], "rooms": {...}, "honmaru3d": {...},
    "network": {...}, "report": {...}, "diary": {...}, "app": {...}
  },
  "unreadable": []   // 壊れていて読めなかったキー名
}
```

## 6. 次の段階(クラウド化)で変更が必要な箇所

| ファイル | 箇所 | 変更内容 |
|---|---|---|
| `assets/storage-registry.js` | `readRaw` / `writeRaw` | クラウドとの同期を足す窓口。ログイン状態と `updatedAt` の比較をここに集約 |
| `assets/master.js` | 17-26行(読み込み・`saveState`)、`notify` | 窓口経由に置き換え。保存を「モーダルを閉じたとき」に加えて入力確定時にも行う。新規 id を UUID に |
| `assets/rooms.js` | 36-45行、`notify`、`addRoomFromTemplate` | 同上。`unplaced` の名前重複をやめて id だけにするなら `render` の名前引きも修正 |
| `assets/network.js` | 57-69行、`notify`、`makeTab` | 同上。`activeTabId` を deviceState 側へ |
| `pages/honmaru3d.html` | `loadBuildingState` / `saveBuildingState`、`addStructure` の id 生成 | 同上。`timeMode` を deviceState 側へ |
| `assets/report-data.js` | `load` / `save`(108-125行) | 窓口経由に。すでに `version` と正規化関数があるので移行しやすい |
| `assets/diary.js` | `persist` と起動時読み込み(15-40行) | 同上。保存失敗時の扱い(`blocked`)は維持 |
| `assets/app.js` | `APP_STORAGE_KEY` 周り(243-253行)、`sharedCharacters` の初期化 | `sharedCharacters` を保存せず master から生成する。`activityLog` は deviceState 側へ |
| `assets/diary-reference.js` | 15-18行 | 直接 `localStorage.getItem` している部分を窓口経由に |
| 新規 | 認証・同期モジュール(例: `assets/cloud-sync.js`) | ログイン、ユーザー id の取得、`updatedAt` 比較による同期。Supabase / Firebase はここだけが依存する |

### 段階的な進め方(案)

1. **今回**: バックアップ機能で「全データを1つの JSON にできる」状態を作る(完了)。
2. 各画面の `localStorage` 直接呼び出しを `storage-registry.js` の窓口経由に置き換える(動作は変えない)。全ストアに `schemaVersion` と `updatedAt` を持たせる。
3. 刀剣男士の正本を master に一本化し、`app.sharedCharacters` の保存をやめる。新規 id を UUID にする。
4. ログイン(Google など)とクラウド DB を追加し、窓口の中で「ローカル保存 + クラウド保存」を行う。最初は Last-Write-Wins で十分。
5. 複数端末での同時編集が気になり始めたら、ストア単位ではなく項目単位(部屋1つ、作品1つ)の `updatedAt` に細分化する。
