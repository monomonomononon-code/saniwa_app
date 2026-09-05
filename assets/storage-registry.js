/*
 * 保存データの台帳(レジストリ)とバックアップ処理。
 *
 * このアプリの永続データはすべて localStorage の "saniwa-tool.*.v1" キーに
 * JSON 文字列として入っています。各機能ページは自分のキーだけを読み書きし、
 * 互いのデータは親(index.html)経由の postMessage で同期しています。
 *
 * このファイルは各機能の保存処理には手を入れず、
 *   - どのキーに何が入っているかの一覧(STORES)
 *   - 全データの書き出し(exportAll)
 *   - 全データの取り込み(stagePendingImport → 再読み込み → applyPendingImport)
 * だけを提供します。
 *
 * 取り込みを「再読み込み後に適用」する理由:
 *   各ページは pagehide(画面を閉じる瞬間)にメモリ上の状態を保存するため、
 *   その場で localStorage を書き換えても、再読み込み時に古い状態で上書きされてしまう。
 *   そこで取り込み内容をいったん pending キーに退避し、次回起動の最初(app.js 先頭)で反映する。
 *
 * 将来クラウド保存にする場合は、readRaw / writeRaw を差し替える(または同期処理を足す)のが入口。
 */
(function (global) {
  "use strict";

  const PREFIX = "saniwa-tool.";
  const FORMAT = "saniwa-tool-backup";
  const FORMAT_VERSION = 1;
  const PENDING_KEY = PREFIX + "pending-import.v1";
  const SNAPSHOT_KEY = PREFIX + "snapshot-before-import.v1";
  const LAST_IMPORT_KEY = PREFIX + "last-import.v1";

  const count = (n, unit) => `${n}${unit}`;
  // id: バックアップJSON内のキー / key: localStorage のキー / owner: 読み書きしているファイル
  const STORES = [
    { id: "master", key: PREFIX + "master.v1", label: "刀剣男士", owner: "assets/master.js",
      summary: d => Array.isArray(d) ? count(d.length, "振り") : "" },
    { id: "rooms", key: PREFIX + "rooms.v1", label: "部屋割り", owner: "assets/rooms.js",
      summary: d => d && Array.isArray(d.rooms) ? `${count(d.rooms.length, "室")} / 配置待ち${count((d.unplaced || []).length, "振り")}` : "" },
    { id: "honmaru3d", key: PREFIX + "honmaru3d.v1", label: "本丸建築(3D)", owner: "pages/honmaru3d.html",
      summary: d => d ? `棟${(d.wings || []).length} / パーツ${count((d.buildingObjects || []).length, "件")} / 時間帯:${d.timeMode || "-"}` : "" },
    { id: "network", key: PREFIX + "network.v1", label: "相関図", owner: "assets/network.js",
      summary: d => d && Array.isArray(d.tabs) ? `${count(d.tabs.length, "タブ")} / 関係${count(d.tabs.reduce((n, t) => n + (t.relationships || []).length, 0), "件")}` : "" },
    { id: "report", key: PREFIX + "report.v1", label: "日報", owner: "assets/report-data.js",
      summary: d => d && d.entries ? count(Object.keys(d.entries).length, "日分") : "" },
    { id: "diary", key: PREFIX + "diary.v1", label: "日誌", owner: "assets/diary.js",
      summary: d => d && Array.isArray(d.works) ? `${count(d.works.length, "作品")} / ${count(d.works.reduce((n, w) => n + (w.chapters || []).length, 0), "章")}` : "" },
    { id: "app", key: PREFIX + "app.v1", label: "ホーム(更新履歴・共有キャラ一覧)", owner: "assets/app.js",
      summary: d => d ? `履歴${count((d.activityLog || []).length, "件")} / 共有キャラ${count((d.sharedCharacters || []).length, "振り")}` : "" }
  ];
  const byId = Object.fromEntries(STORES.map(s => [s.id, s]));

  function readRaw(key) {
    try { return global.localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeRaw(key, value) {
    try {
      if (value === null) global.localStorage.removeItem(key); else global.localStorage.setItem(key, value);
      return true;
    } catch (e) { return false; }
  }
  function parseJson(raw) {
    if (raw == null) return { present: false, value: null };
    try { return { present: true, value: JSON.parse(raw) }; }
    catch (e) { return { present: true, broken: true, value: null, raw }; }
  }
  function byteLength(str) {
    try { return new TextEncoder().encode(str).length; } catch (e) { return (str || "").length; }
  }

  // 現在の保存状況の一覧(表示用)
  function inspect() {
    return STORES.map(s => {
      const raw = readRaw(s.key);
      const parsed = parseJson(raw);
      let summary = "";
      if (parsed.present && !parsed.broken) { try { summary = s.summary(parsed.value) || ""; } catch (e) {} }
      return { id: s.id, key: s.key, label: s.label, owner: s.owner, present: parsed.present, broken: !!parsed.broken, bytes: raw ? byteLength(raw) : 0, summary };
    });
  }

  // 全データを1つのJSONにまとめる。壊れていて読めないキーは unreadable に名前だけ残す
  function exportAll() {
    const stores = {};
    const unreadable = [];
    STORES.forEach(s => {
      const parsed = parseJson(readRaw(s.key));
      if (!parsed.present) return;
      if (parsed.broken) { unreadable.push(s.id); return; }
      stores[s.id] = parsed.value;
    });
    return {
      format: FORMAT,
      version: FORMAT_VERSION,
      app: "審神者管理ツール",
      exportedAt: new Date().toISOString(),
      userAgent: (global.navigator && global.navigator.userAgent) || "",
      stores,
      unreadable
    };
  }

  // バックアップJSONの検査。取り込み前に内容を見せるための情報も返す
  function validateBackup(data) {
    if (!data || typeof data !== "object") return { ok: false, error: "JSONの形式が読み取れません。" };
    if (data.format !== FORMAT) return { ok: false, error: "このアプリのバックアップファイルではありません(format が違います)。" };
    if (!data.stores || typeof data.stores !== "object") return { ok: false, error: "stores がありません。" };
    const known = [], unknown = [];
    Object.keys(data.stores).forEach(id => (byId[id] ? known : unknown).push(id));
    if (!known.length) return { ok: false, error: "復元できるデータが含まれていません。" };
    const items = known.map(id => {
      const s = byId[id];
      let summary = "";
      try { summary = s.summary(data.stores[id]) || ""; } catch (e) {}
      return { id, label: s.label, summary, bytes: byteLength(JSON.stringify(data.stores[id])) };
    });
    return { ok: true, exportedAt: data.exportedAt || "", version: data.version, items, unknown, newerFormat: Number(data.version) > FORMAT_VERSION };
  }

  // 取り込みを予約する(実際の書き換えは次回起動時)
  function stagePendingImport(data) {
    const check = validateBackup(data);
    if (!check.ok) return check;
    const staged = { format: FORMAT, version: FORMAT_VERSION, exportedAt: data.exportedAt || "", stagedAt: new Date().toISOString(), stores: {} };
    check.items.forEach(item => { staged.stores[item.id] = data.stores[item.id]; });
    if (!writeRaw(PENDING_KEY, JSON.stringify(staged))) {
      return { ok: false, error: "取り込み内容を一時保存できませんでした。端末の空き容量を確認してください。" };
    }
    return { ok: true, items: check.items };
  }
  function hasPendingImport() { return readRaw(PENDING_KEY) != null; }
  function cancelPendingImport() { return writeRaw(PENDING_KEY, null); }

  // 起動時に呼ぶ。予約があれば「復元前の状態を1世代退避 → 各キーを書き換え」を行う
  function applyPendingImport() {
    const raw = readRaw(PENDING_KEY);
    if (raw == null) return null;
    let data;
    try { data = JSON.parse(raw); } catch (e) { writeRaw(PENDING_KEY, null); return null; }
    if (!data || data.format !== FORMAT || !data.stores) { writeRaw(PENDING_KEY, null); return null; }

    const snapshot = exportAll();
    snapshot.reason = "before-import";
    writeRaw(SNAPSHOT_KEY, JSON.stringify(snapshot));

    const applied = [], failed = [];
    STORES.forEach(s => {
      if (!Object.prototype.hasOwnProperty.call(data.stores, s.id)) return; // 含まれていないキーは触らない
      const value = data.stores[s.id];
      if (value === null || value === undefined) return;               // null も「変更なし」扱い(削除はしない)
      (writeRaw(s.key, JSON.stringify(value)) ? applied : failed).push(s.id);
    });
    writeRaw(PENDING_KEY, null);
    const result = { appliedAt: new Date().toISOString(), exportedAt: data.exportedAt || "", applied, failed };
    writeRaw(LAST_IMPORT_KEY, JSON.stringify(result));
    return result;
  }

  function lastImport() {
    const parsed = parseJson(readRaw(LAST_IMPORT_KEY));
    return parsed.present && !parsed.broken ? parsed.value : null;
  }
  function snapshotInfo() {
    const parsed = parseJson(readRaw(SNAPSHOT_KEY));
    if (!parsed.present || parsed.broken) return null;
    const check = validateBackup(parsed.value);
    return check.ok ? { exportedAt: parsed.value.exportedAt, items: check.items } : null;
  }
  // 「復元前の状態に戻す」= 退避スナップショットを取り込み予約にする
  function stageSnapshotRestore() {
    const parsed = parseJson(readRaw(SNAPSHOT_KEY));
    if (!parsed.present || parsed.broken) return { ok: false, error: "戻せる退避データがありません。" };
    return stagePendingImport(parsed.value);
  }

  function suggestedFileName(date) {
    const d = date || new Date();
    const p = n => String(n).padStart(2, "0");
    return `saniwa-tool-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
  }

  global.SaniwaStorage = {
    FORMAT, FORMAT_VERSION, STORES, PENDING_KEY, SNAPSHOT_KEY,
    readRaw, writeRaw, inspect, exportAll, validateBackup,
    stagePendingImport, hasPendingImport, cancelPendingImport, applyPendingImport,
    lastImport, snapshotInfo, stageSnapshotRestore, suggestedFileName
  };
  if (typeof module !== "undefined" && module.exports) module.exports = global.SaniwaStorage;
})(typeof globalThis !== "undefined" ? globalThis : window);
