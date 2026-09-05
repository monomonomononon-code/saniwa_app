# 審神者管理ツール

## 構成

- `index.html` — ホーム画面のHTML
- `assets/main.css` / `assets/app.js` — ホーム画面のスタイルと処理
- `pages/rooms.html` / `assets/rooms.css` / `assets/rooms.js` — 部屋割り
- `pages/network.html` / `assets/network.css` / `assets/network.js` — 相関図
- `pages/master.html` / `assets/master.css` / `assets/master.js` — 刀剣男士
- `pages/expcalc.html` / `assets/expcalc.css` / `assets/expcalc.js` — 経験値計算
- `pages/rooms-menu.html` — 部屋割りメニュー(男士の配置 / 見取り図(3D))
- `pages/honmaru3d.html` — 本丸建築エディタ(3D俯瞰図)。部屋タイプ・建築パーツは同ファイル冒頭の `TEMPLATE_META` / `PART_DEFS` / `PART_RENDERERS` で定義。保存キーは `saniwa-tool.honmaru3d.v1`(version 2)
- `pages/journal.html` — 日報・日誌
- `pages/backup.html` / `assets/backup.js` / `assets/backup.css` — 設定・バックアップ(全データのJSON書き出し / 復元)
- `assets/storage-registry.js` — 保存キーの台帳とバックアップ処理。保存構造の解説は `docs/DATA-STORAGE.md`

部屋タイプ(`TEMPLATE_META`)のキーは `assets/rooms.js` と `pages/honmaru3d.html` で揃えてください。

既存の `saniwa-tool.*.v1` のブラウザ保存キーは変更していません。既存のVercelプロジェクトへ同じ構成でデプロイすれば、利用者の保存済みデータは引き継がれます。
