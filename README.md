# 審神者管理ツール

## 構成

- `index.html` — ホーム画面のHTML
- `assets/main.css` / `assets/app.js` — ホーム画面のスタイルと処理
- `pages/rooms.html` / `assets/rooms.css` / `assets/rooms.js` — 部屋割り
- `pages/network.html` / `assets/network.css` / `assets/network.js` — 相関図
- `pages/master.html` / `assets/master.css` / `assets/master.js` — 刀剣男士
- `pages/expcalc.html` / `assets/expcalc.css` / `assets/expcalc.js` — 経験値計算
- `pages/rooms-menu.html` — 部屋割りメニュー(男士の配置 / 見取り図(3D))
- `pages/honmaru3d.html` — 本丸建築エディタ(3D俯瞰図)。部屋タイプ・建築パーツは同ファイル冒頭の `TEMPLATE_META` / `PART_DEFS` / `PART_RENDERERS` で定義。時間帯は `TIME_PRESETS`、季節は `SEASON_PRESETS`(春のみ実装。夏・秋・冬は同じ形で足して `available: true` にする)。パーツごとの見た目オプション(池のかたち・桜の樹形・石の置き方・樹形)は `PART_PROPS` に定義すると情報パネルの選択欄が自動で増え、値は `item.props` に入る。池や岩組みの「四角く見せない輪郭」は `blobPoints` / `blobShape`、桜の樹冠のように小さな塊を大量に束ねて1メッシュにするものは `mergedBlobs` を使う。桜の樹形は `SAKURA_FORMS` に1行足すと増やせる。保存キーは `saniwa-tool.honmaru3d.v1`(version 2、`timeMode` / `seasonMode` を含む)
- `pages/journal.html` — 日報・日誌
- `pages/backup.html` / `assets/backup.js` / `assets/backup.css` — 設定・バックアップ(全データのJSON書き出し / 復元)
- `pages/schedule.html` / `assets/schedule.js` / `assets/schedule.css` — 計画表(月表示カレンダー、予定とToDo)。保存は `assets/storage-registry.js` の `load`/`save` 経由(`saniwa-tool.schedule.v1`)のみで、独自の保存処理は持たない
- `pages/timeline.html` / `assets/timeline.js` / `assets/timeline.css` — 年表(縦タイムライン)。`saniwa-tool.timeline.v1` には手動の出来事と、他ドメインへの参照だけを持つ。刀剣男士の顕現は `master.v1` を都度参照して仮想表示(保存なし)。日報は `assets/report.js` の「史へ記す」ボタンで `sourceType:"report"` の参照エントリ(`sourceId`=日報の日付キー)だけを保存し、内容は展開時に `report.v1` を読み直して表示する。どちらも二重管理を避ける設計
- `pages/kawaraban.html` / `assets/kawaraban.js` / `assets/kawaraban.css` — 瓦版(総合案内: ご利用について / よくあるご質問 / 各機能の使い方)。`ABOUT_SECTIONS` / `FAQ_ITEMS` / `GUIDE_ITEMS` のデータ配列から表示を組み立てる純粋な閲覧ページで、ユーザーデータは保存しない。FAQの「バックアップに何が含まれるか」は `storage-registry.js` の `STORES` を実際に読んで生成するため、機能追加時にここを手直しする必要はない
- `assets/storage-registry.js` — 保存キーの台帳とバックアップ処理。保存構造の解説は `docs/DATA-STORAGE.md`

新しい機能を追加するときは、`localStorage` を直接触らず `assets/storage-registry.js` の `load`/`save`/`remove`/`storeKey` を使い、保存先を `STORES` 配列に登録してください(そうするだけでバックアップ・復元に自動的に乗ります)。

部屋タイプ(`TEMPLATE_META`)のキーは `assets/rooms.js` と `pages/honmaru3d.html` で揃えてください。

既存の `saniwa-tool.*.v1` のブラウザ保存キーは変更していません。既存のVercelプロジェクトへ同じ構成でデプロイすれば、利用者の保存済みデータは引き継がれます。
