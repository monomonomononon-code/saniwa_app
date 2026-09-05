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
- `pages/schedule.html` / `assets/schedule.js` / `assets/schedule.css` — 計画表(月表示カレンダー、予定とToDo)。保存は `assets/storage-registry.js` の `load`/`save` 経由(`saniwa-tool.schedule.v1`)のみで、独自の保存処理は持たない
- `pages/timeline.html` / `assets/timeline.js` / `assets/timeline.css` — 年表(縦タイムライン)。`saniwa-tool.timeline.v1` には手動の出来事と、他ドメインへの参照だけを持つ。刀剣男士の顕現は `master.v1` を都度参照して仮想表示(保存なし)。日報は `assets/report.js` の「史へ記す」ボタンで `sourceType:"report"` の参照エントリ(`sourceId`=日報の日付キー)だけを保存し、内容は展開時に `report.v1` を読み直して表示する。どちらも二重管理を避ける設計
- `assets/storage-registry.js` — 保存キーの台帳とバックアップ処理。保存構造の解説は `docs/DATA-STORAGE.md`

新しい機能を追加するときは、`localStorage` を直接触らず `assets/storage-registry.js` の `load`/`save`/`remove`/`storeKey` を使い、保存先を `STORES` 配列に登録してください(そうするだけでバックアップ・復元に自動的に乗ります)。

部屋タイプ(`TEMPLATE_META`)のキーは `assets/rooms.js` と `pages/honmaru3d.html` で揃えてください。

既存の `saniwa-tool.*.v1` のブラウザ保存キーは変更していません。既存のVercelプロジェクトへ同じ構成でデプロイすれば、利用者の保存済みデータは引き継がれます。
