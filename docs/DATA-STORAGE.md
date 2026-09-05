# データ保存構造の調査と、クラウド保存へ向けた整理

`saniwa-app` のデータがどこに・どんな形で保存されているかをまとめたものです。
2026-09-05 に一度まとめ、同日中に「機能ごとのドメイン分け」を追加しています。
まだ認証やクラウド保存(Supabase / Firebase 等)は実装していません。

## 1. 保存のしくみ(全体像)

- 永続化に使っているのは **ブラウザの localStorage だけ** です。IndexedDB、Cookie、Service Worker のキャッシュ、サーバー通信はありません。
- `sessionStorage` はバックアップ画面の「復元しました」通知を一度だけ出すためのフラグに使っているのみです(データではありません)。
- 各機能は `index.html` の中に **iframe** として開かれますが、すべて同じオリジン(同じドメイン)なので localStorage は共有です。iframe だからといって別の場所に保存されているわけではありません。
- 保存キーはすべて `saniwa-tool.<機能名>.v1` という名前で、値は JSON 文字列です。
- 画面同士のデータ受け渡しは、親(`assets/app.js`)経由の `postMessage` で行っています。例: 刀剣男士ページの編集 → 親 → 部屋割り・相関図・戦績・3D に配布。
- どのキーが何を持っているかは、コード上でも `assets/storage-registry.js` の `STORES` 配列が唯一の一覧です。このドキュメントの表は `STORES` の内容をそのまま説明したものです。

### 保存キー一覧

| キー | ドメイン | scope | 内容 | 値の形 | 読み書きしている場所 | 保存タイミング |
|---|---|---|---|---|---|---|
| `saniwa-tool.master.v1` | characters | user | 刀剣男士の台帳(正本) | `Character[]` | `assets/master.js` 17-26行 | 編集モーダルを閉じたとき、新規追加時、セリフ保存時、画面を閉じるとき(pagehide) |
| `saniwa-tool.rooms.v1` | rooms | user | 部屋割り | `{ unplaced: {id,name}[], rooms: Room[] }` | `assets/rooms.js` 36-45行 | 配置変更・部屋追加のたび(notify)、pagehide |
| `saniwa-tool.honmaru3d.v1` | buildingObjects | user | 3D 建築(棟・部屋の位置回転・建築パーツ・家具・時間帯) | `{ version:2, wings, roomLayouts, buildingObjects, timeMode }` | `pages/honmaru3d.html` `loadBuildingState` / `saveBuildingState` | 変更のたびに自動保存、保存ボタン、pagehide |
| `saniwa-tool.network.v1` | relationships | user | 相関図 | `{ tabs: Tab[], activeTabId }` | `assets/network.js` 57-69行 | 関係・配置・タブ操作のたび(notify)、pagehide |
| `saniwa-tool.report.v1` | journal | user | 日報 | `{ version:2, entries: { "YYYY-MM-DD": Entry } }` | `assets/report-data.js` 108-125行 | 日報の保存ボタン、経験値計算機からの記録追加 |
| `saniwa-tool.diary.v1` | journal | user | 日誌 | `{ version:1, works: Work[] }` | `assets/diary.js` 15-40行 | 保存ボタン、章やタイトルの確定時 |
| `saniwa-tool.app.v1` | home | device | ホームの更新履歴、共有キャラ一覧(写し) | `{ activityLog, sharedCharacters }` | `assets/app.js` 243-253行 | キャラ更新受信時、履歴追加時、pagehide |
| `saniwa-tool.pending-import.v1` | backupMetadata | device | バックアップ復元の予約(次回起動時に反映) | `{ format, version, exportedAt, stagedAt, stores }` | `assets/storage-registry.js` | 復元ボタンを押したとき |
| `saniwa-tool.snapshot-before-import.v1` | backupMetadata | device | 復元直前の全データの退避(1世代のみ) | バックアップJSONと同じ形 | 同上 | 復元が実際に反映されるとき(`applyPendingImport`) |
| `saniwa-tool.last-import.v1` | backupMetadata | device | 直近の復元結果の記録 | `{ appliedAt, exportedAt, applied[], failed[] }` | 同上 | 同上 |

読み取り専用で他のキーを覗いている箇所: `assets/diary-reference.js` 15-18行(日誌の参照シートが master / rooms / network / app を読む)。

`domain` と `scope` は `assets/storage-registry.js` の `STORES` 配列に持たせたメタ情報です。`scope: "user"` はユーザーのデータとして将来クラウドに同期する想定、`scope: "device"` はこの端末だけに残してよい情報(同期しなくても困らない)という目安です。

### 保存されていない(メモリ上だけの)もの

再読み込みすると消えます。今回は変更していません。

- 戦績 > 経験値計算機の入力値(現在の経験値、目標経験値、1周の経験値、マップ選択、倍率チェックなど)。`assets/expcalc.js` の `characters[].currentExp` 等と画面上部の `let` 変数。
- 各画面のモーダルの開閉、選択中のタブやツール、3D のカメラ位置、ホームのバナー位置。
- 3D の「建築編集モード」の ON/OFF。

## 2. 機能ドメインごとの整理

「1つのデータが、どの機能の持ち物か」を7つのグループ(ドメイン)に分けました。グループ名は `assets/storage-registry.js` の `DOMAIN_LABELS` と一致させています。

### characters(刀剣男士)

- **正本**: `master.v1`(名前、刀種、極、レベル、顕現日、部隊、隊長、身長、趣味、元主、セリフ、メモ)。
- **写し**: `app.v1.sharedCharacters`(id・名前・刀種・レベル・顕現日・部隊・隊長・極のみ)。部屋割り・相関図・戦績・3D はメモリ上に写しを持つだけで、保存はしない。
- 初期10振りは各ファイルにハードコード(`CHAR_NAMES`)。id は `"c0"`〜`"c9"` と、追加時は `"c" + Date.now()`。

### rooms(部屋割り)

- **正本**: `rooms.v1`。部屋の存在・名前・種類・住人はここだけが正しい。
- `unplaced`(配置待ち)は id に加えて名前も重複して持っている。
- 部屋 id は `"r" + Date.now()`。部屋タイプは `template` キー(a / b / c / living / kitchen / toilet / forge / large)。

### buildingObjects(3D建築: 棟・部屋の3D配置・建築パーツ・家具)

- **正本**: `honmaru3d.v1` の1つのJSONに、次の4つが同居している。
  - `wings`: 棟(建物グループ)の一覧
  - `roomLayouts`: 部屋ごとの3D上の位置・回転・所属棟(部屋そのものの正本は `rooms.v1`。ここは「置き方」だけ)
  - `buildingObjects`: 建築パーツ・外構・家具(廊下、屋根、池、箪笥など)。種類ごとの定義は同ファイル内の `PART_DEFS`
  - `timeMode`: 時間帯(朝/昼/夕/夜)。実態は「settings」寄りの情報だが、既存の保存形式を変えないため今はここに同居させている
- 部屋が削除されても `roomLayouts` に残骸が残る(実害はない)。
- 家具(tansu / chabudai / futon / sofa)は建築パーツと同じ `buildingObjects` 配列に、`category: "furniture"` として入っている。専用の保存先はない。

### relationships(相関図)

- **正本**: `network.v1`。タブ単位。関係の `from` / `to` は刀剣男士の id。
- `activeTabId`(今開いているタブ)は端末ごとに違ってよい情報。

### journal(日報・日誌)

- **日報の正本**: `report.v1`。日付をキーにしたオブジェクト。経験値計算機からの記録は `entries[date].expRecords`。
- **日誌の正本**: `diary.v1`。作品 → 章 → 本文の階層。
- 2つの別キーだが、同じ「記録・執筆」ドメインとしてまとめて扱う。

### settings(ユーザー設定)

- **専用のキーはまだない**。唯一の設定らしい設定は `honmaru3d.v1.timeMode`(時間帯)で、buildingObjects ドメインのJSONに同居している。
- 将来、表示テーマや通知設定などが増えたら、`saniwa-tool.settings.v1` を新設して `scope: "device"` として登録するのが良い(今回は新設していない。中身が空の器を先に作っても実益がないため)。

### backupMetadata(バックアップの内部管理)

- `pending-import.v1` / `snapshot-before-import.v1` / `last-import.v1` の3つ。ユーザーが入力したデータではなく、バックアップ機能自身が使う制御情報。
- ユーザーの本丸データ(characters/rooms/...)には含めない。`scope: "device"` (この端末での作業状態なので、クラウド同期の対象にする必要はない)。

### home(ホーム画面の端末ローカル情報)

- `app.v1` の `activityLog`(更新履歴フィード、最大30件)と `sharedCharacters`(characters ドメインの写し)。
- ユーザーの本丸データそのものではなく、`scope: "device"` 扱い。将来は `sharedCharacters` の保存自体をやめ、起動時に `master.v1` から作る形にするのが望ましい(§6 参照)。

### 今後追加予定: timeline(年表) / schedule(予定)

まだ実装していない機能ですが、同じ仕組みに乗せやすいよう `assets/storage-registry.js` に設計だけ `PLANNED_STORES` として残しています(実際の一覧・バックアップには含まれません)。

| id | 想定キー | ドメイン | scope | 想定する形 |
|---|---|---|---|---|
| timeline | `saniwa-tool.timeline.v1` | timeline | user | `{ version: 1, entries: [{ id, date, title, body }] }`(日誌と同じ「配列を1つのオブジェクトに入れる」形) |
| schedule | `saniwa-tool.schedule.v1` | schedule | user | `{ version: 1, entries: { "YYYY-MM-DD": [{ id, title, memo }] } }`(日報と同じ「日付をキーにしたオブジェクト」の形) |

実装するときの手順は次の1本だけです。

1. 新しいキー(例 `saniwa-tool.timeline.v1`)を決め、その機能ページで読み書きする。
2. `assets/storage-registry.js` の `STORES` 配列に、上の表と同じ内容(id / key / label / owner / domain / scope / summary)を1件足す。

これだけで、一覧表示・全データバックアップ・復元のすべてに自動的に乗ります(`STORES` を見ている `inspect` / `exportAll` / `validateBackup` / `applyPendingImport` はどれもこの配列をループしているだけなので)。

## 3. 気づいた課題(クラウド化の前に知っておくこと)

1. **刀剣男士が3箇所に分かれている**: master、app.sharedCharacters、rooms.unplaced(名前)。同期は postMessage 頼みなので、クラウド同期で片方だけ更新されると食い違います。
2. **id が端末時刻ベース**(`Date.now()`): 2台の端末で同時に追加すると衝突し得ます。クラウド化時は `crypto.randomUUID()` などに切り替えるのが安全です(既存 id はそのまま使えます)。
3. **保存が pagehide 頼みの画面がある**: 刀剣男士・部屋割り・相関図はモーダルを閉じるか画面を離れるまで保存されないことがあります。クラウド同期では「いつ書き込むか」を明示的にする必要があります。
4. **バージョン番号があるのは 3D(version 2)・日報(version 2)・日誌(version 1)だけ**: master / rooms / network / app は形の版が記録されていません。将来の形式変更に備え、全ストアに `schemaVersion` と `updatedAt` を持たせるのが望ましいです。
5. **「端末の状態」と「ユーザーのデータ」が混ざっている**: `network.activeTabId`、`honmaru3d.timeMode`、`app.activityLog` は端末ごとに違ってよい情報です。クラウドに載せるもの・載せないものを分けておくと同期が単純になります(§1 の `scope` 列がこの整理そのものです)。
6. **localStorage の上限**(おおむね 5 MB): 現状は数十 KB 程度なので余裕がありますが、日誌の本文が増えると近づきます。
7. **buildingObjects ドメインが混成**: `honmaru3d.v1` は「部屋の3D配置」「建築パーツ・家具」「時間帯設定」という3つの異なる性質のデータを1つのJSONに同居させています。当面は問題ありませんが、クラウド同期の単位を細分化するとき(§8)は分割候補になります。

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
    "diary":      { "works": [] },
    "timeline":   { "entries": [] },            // 追加予定
    "schedule":   { "entries": {} }              // 追加予定
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
- **`deviceState` は同期対象外**: 時間帯や更新履歴は端末に残す。`saniwa-tool.pending-import.v1` 等の backupMetadata もここには含めない(端末の作業状態そのものなので)。

### 4-2. 保存処理を「アダプタ」に寄せる

各画面が `localStorage.getItem / setItem` を直接呼んでいる箇所を、`assets/storage-registry.js` の窓口経由にします。クラウド化のときは、この窓口の中身を「localStorage に書く + サーバーにも送る」に変えるだけで済み、各画面は触らなくてよくなります。

```
[各画面] --save(id, data)--> [storage adapter] --> localStorage(即時)
                                              └--> クラウド(ログイン中のみ、後で)
[各画面] <--load(id)--------- [storage adapter] <-- localStorage / クラウドから同期済みの値
```

### 4-3. 将来の分割(必要になったら)

日誌の本文が大きくなったら、`diary.works[]` だけを「作品ごとの別ドキュメント」に分けます。他はまとめたままで問題ありません。

## 5. 共通の保存・読み込み関数(今回追加)

`assets/storage-registry.js` に、id を指定するだけで読み書きできる汎用関数を追加しました。**既存の画面はまだこれを使っていません**(rooms.js や master.js の保存処理は今までどおりです)。新しく作る機能(年表・予定など)や、今後1画面ずつ移行するときに使う入り口です。

```js
window.SaniwaStorage.load("rooms");             // localStorage の rooms.v1 を JSON.parse して返す(無ければ null)
window.SaniwaStorage.save("rooms", newValue);   // JSON.stringify して rooms.v1 に保存
window.SaniwaStorage.storeKey("rooms");         // "saniwa-tool.rooms.v1"(実際のキー名)
window.SaniwaStorage.remove("rooms");           // rooms.v1 を削除
```

- `id` は `STORES` 配列の `id` 列(characters なら `"master"`、部屋割りなら `"rooms"` など)。
- 対象は今の7ストアだけで、`pending-import` 等の backupMetadata キーは対象外(内部専用のため直接触る必要がない)。
- 将来クラウド同期を足すときは、この `load` / `save` の中身だけを差し替えれば、呼び出す側(各画面)のコードは変えずに済みます。

バックアップ画面(`pages/backup.html`)の保存状況一覧も、`STORES` の `domain` を見出しにしてグループ表示するよう更新しました(見た目だけの変更で、保存の仕組みは変わっていません)。

## 6. 前回追加したバックアップ機能(参考)

- `assets/storage-registry.js`: 保存キーの台帳(`STORES`)と、全データの書き出し(`exportAll`)・取り込み(`stagePendingImport` → 再読み込み → `applyPendingImport`)。
- `pages/backup.html` / `assets/backup.js` / `assets/backup.css`: ホームのメニュー「設定・バックアップ」から開く画面。保存状況の一覧(ドメイン見出し付き)、JSON のダウンロード・コピー、ファイルまたは貼り付けからの復元、復元前の状態への巻き戻し。
- `assets/app.js`: 起動時の `applyPendingImport()` 呼び出し(1行)と、書き出し前に各画面の未保存状態を保存させる `window.saniwaFlushState`。メニュー項目の追加。
- `index.html`: `storage-registry.js` の読み込み追加。

既存の各画面の保存処理は変更していません。復元は「次回起動時に反映」する方式なので、開いている画面が pagehide で古いデータを書き戻す問題を避けています。復元の直前の状態は `saniwa-tool.snapshot-before-import.v1` に1世代だけ退避され、バックアップ画面から戻せます。

バックアップ JSON の形(今回のドメイン整理で **変更していません**。`format` / `version` はそのままです):

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

古いバージョンで書き出したバックアップ(`domain`/`scope` を知らない頃のもの)も、この形は変わっていないのでそのまま復元できます。動作確認済みです。

## 7. 次の段階(クラウド化)で変更が必要な箇所

| ファイル | 箇所 | 変更内容 |
|---|---|---|
| `assets/storage-registry.js` | `readRaw` / `writeRaw`(または新設の `load` / `save`) | クラウドとの同期を足す窓口。ログイン状態と `updatedAt` の比較をここに集約 |
| `assets/master.js` | 17-26行(読み込み・`saveState`)、`notify` | 窓口経由に置き換え。保存を「モーダルを閉じたとき」に加えて入力確定時にも行う。新規 id を UUID に |
| `assets/rooms.js` | 36-45行、`notify`、`addRoomFromTemplate` | 同上。`unplaced` の名前重複をやめて id だけにするなら `render` の名前引きも修正 |
| `assets/network.js` | 57-69行、`notify`、`makeTab` | 同上。`activeTabId` を deviceState 側へ |
| `pages/honmaru3d.html` | `loadBuildingState` / `saveBuildingState`、`addStructure` の id 生成 | 同上。`timeMode` を deviceState 側へ(可能なら `settings` ドメインへ分離) |
| `assets/report-data.js` | `load` / `save`(108-125行) | 窓口経由に。すでに `version` と正規化関数があるので移行しやすい |
| `assets/diary.js` | `persist` と起動時読み込み(15-40行) | 同上。保存失敗時の扱い(`blocked`)は維持 |
| `assets/app.js` | `APP_STORAGE_KEY` 周り(243-253行)、`sharedCharacters` の初期化 | `sharedCharacters` を保存せず master から生成する。`activityLog` は deviceState 側へ |
| `assets/diary-reference.js` | 15-18行 | 直接 `localStorage.getItem` している部分を窓口経由に |
| 新規 | `pages/timeline.html` / `pages/schedule.html`(実装時) | §2 の `PLANNED_STORES` の形で `STORES` に登録。最初から窓口(`load`/`save`)経由で作れば移行不要 |
| 新規 | 認証・同期モジュール(例: `assets/cloud-sync.js`) | ログイン、ユーザー id の取得、`updatedAt` 比較による同期。Supabase / Firebase はここだけが依存する |

### 段階的な進め方(案)

1. バックアップ機能で「全データを1つの JSON にできる」状態を作る(完了)。
2. 機能ごとのドメイン分けと、共通の読み書き関数(`load`/`save`)を用意する(今回・完了)。
3. 各画面の `localStorage` 直接呼び出しを、上で用意した窓口経由に1画面ずつ置き換える(動作は変えない)。全ストアに `schemaVersion` と `updatedAt` を持たせる。
4. 刀剣男士の正本を master に一本化し、`app.sharedCharacters` の保存をやめる。新規 id を UUID にする。
5. ログイン(Google など)とクラウド DB を追加し、窓口の中で「ローカル保存 + クラウド保存」を行う。最初は Last-Write-Wins で十分。
6. 複数端末での同時編集が気になり始めたら、ストア単位ではなく項目単位(部屋1つ、作品1つ)の `updatedAt` に細分化する。

## 8. クラウド同期の単位(提案)

「どのデータをどの単位で同期するか」を、ドメインごとにまとめます。

| ドメイン | 同期する? | 推奨する同期単位 | 理由 |
|---|---|---|---|
| characters | ○ 同期する | ユーザー1人につき配列まるごと | 数十振り程度で小さく、頻繁に他ドメインから参照されるため一体で扱うのが単純 |
| rooms | ○ 同期する | ユーザー1人につきオブジェクトまるごと | 部屋数は多くても数十件程度。将来増えたら部屋1件単位に分割 |
| buildingObjects | ○ 同期する | 当面はオブジェクトまるごと。将来的には `roomLayouts`(部屋の配置)と `buildingObjects`(パーツ・家具)を分けるのも検討 | 混成ドメインなので、部屋数・パーツ数が増えたときに分割の余地を残す |
| relationships | ○ 同期する | タブ単位(`tabs[]` の1要素ずつ) | タブが増えても、開いていないタブまで毎回まとめて送らずに済む |
| journal(日報) | ○ 同期する | 日付(1エントリ)単位 | 日々の記録なので、過去分を毎回送り直さずに済む。差分同期にも向く |
| journal(日誌) | ○ 同期する | 作品単位、本文が長い作品は章単位も検討 | 本文量が増えやすいデータなので、最初から分割候補として意識しておく |
| timeline(予定) | ○ 同期する | エントリ単位 | 日報と同様、追記が中心のログ的データ |
| schedule(予定) | ○ 同期する | 日付単位 | 日報と同じ形のため同じ粒度が扱いやすい |
| settings | △ 同期してもよいが必須ではない | ユーザー設定としてまるごと | 複数端末で見た目を揃えたい場合のみ同期。無くても支障はない |
| home(activityLog / sharedCharacters) | ✕ 同期しない | 端末ローカル | activityLog は端末ごとのフィードでよく、sharedCharacters は characters の写しなので同期するとむしろ食い違いの原因になる |
| backupMetadata | ✕ 同期しない | 端末ローカル | バックアップ機能自身の作業状態であり、ユーザーの本丸データではない |

まとめると、**「本丸の中身(characters / rooms / buildingObjects / relationships / journal / 今後の timeline・schedule)」はユーザー単位でクラウドに同期し、「この端末での見え方や作業状態(home / settings / backupMetadata)」は端末ローカルに残す**、という分け方が一番シンプルです。同期の実装自体は次の段階(§7)で着手します。
