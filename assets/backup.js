(function () {
  "use strict";
  const store = window.SaniwaStorage;
  const $ = id => document.getElementById(id);
  const status = $("backup-status");
  let previewData = null;

  function message(text, isError) {
    status.textContent = text || "";
    status.style.color = isError ? "var(--hanko)" : "";
  }
  function kb(bytes) { return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`; }
  function formatDate(iso) {
    if (!iso) return "不明";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("ja-JP");
  }
  // 親(ホーム)が開いていれば、各画面のメモリ上の状態を先に保存してもらう
  function flushParent() {
    try { if (window.parent !== window && typeof window.parent.saniwaFlushState === "function") window.parent.saniwaFlushState(); } catch (e) {}
  }

  function renderStores() {
    const list = $("store-list");
    list.replaceChildren();
    let total = 0;
    store.inspect().forEach(item => {
      total += item.bytes;
      const row = document.createElement("div");
      row.className = "store-row" + (item.present ? "" : " empty") + (item.broken ? " broken" : "");
      const label = document.createElement("span"); label.className = "label"; label.textContent = item.label;
      const bytes = document.createElement("span"); bytes.className = "bytes"; bytes.textContent = item.present ? kb(item.bytes) : "未保存";
      const summary = document.createElement("span"); summary.className = "summary";
      summary.textContent = item.broken ? "保存データが壊れていて読めません(バックアップには含まれません)" : (item.summary || (item.present ? "" : "まだデータがありません"));
      const key = document.createElement("span"); key.className = "key"; key.textContent = `${item.key} — ${item.owner}`;
      row.append(label, bytes, summary, key);
      list.appendChild(row);
    });
    $("store-total").textContent = `合計 ${kb(total)}(ブラウザの保存上限はおおむね 5 MB 前後です)`;
  }

  function buildExport() {
    flushParent();
    return JSON.stringify(store.exportAll(), null, 2);
  }

  $("btn-download").onclick = () => {
    const text = buildExport();
    const name = store.suggestedFileName();
    try {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      message(`${name} を書き出しました。ダウンロード先が開かない場合は「テキストをコピー」をお使いください。`);
    } catch (e) {
      message("ファイルを書き出せませんでした。「テキストをコピー」をお使いください。", true);
    }
    renderStores();
  };
  $("btn-copy").onclick = async () => {
    const text = buildExport();
    const box = $("export-text");
    box.value = text;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
      else { box.hidden = false; box.select(); if (!document.execCommand("copy")) throw new Error("copy"); }
      message("バックアップのテキストをコピーしました。メモアプリなどに貼り付けて保管してください。");
    } catch (e) {
      box.hidden = false; $("btn-show").setAttribute("aria-expanded", "true"); $("btn-show").textContent = "内容を隠す";
      message("自動コピーできませんでした。下の内容を全選択してコピーしてください。", true);
    }
  };
  $("btn-show").onclick = () => {
    const box = $("export-text");
    const btn = $("btn-show");
    const open = box.hidden;
    if (open) box.value = buildExport();
    box.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = open ? "内容を隠す" : "内容を表示";
  };

  $("import-file").onchange = async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      $("import-text").value = await file.text();
      message(`${file.name} を読み込みました。「内容を確認」を押してください。`);
      checkImport();
    } catch (err) {
      message("ファイルを読み込めませんでした。", true);
    }
  };
  function checkImport() {
    const preview = $("import-preview");
    const raw = $("import-text").value.trim();
    previewData = null;
    $("btn-import").disabled = true;
    preview.hidden = false;
    preview.replaceChildren();
    if (!raw) { preview.innerHTML = '<span class="error">ファイルを選ぶか、テキストを貼り付けてください。</span>'; return; }
    let data;
    try { data = JSON.parse(raw); }
    catch (e) { preview.innerHTML = '<span class="error">JSONとして読み取れません。コピー漏れがないか確認してください。</span>'; return; }
    const check = store.validateBackup(data);
    if (!check.ok) { preview.innerHTML = `<span class="error"></span>`; preview.firstChild.textContent = check.error; return; }
    const head = document.createElement("div");
    head.textContent = `書き出し日時: ${formatDate(check.exportedAt)}。次のデータが含まれています(含まれていない項目は今のまま残ります)。`;
    const ul = document.createElement("ul");
    check.items.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `${item.label}: ${item.summary || "(内容の要約なし)"}(${kb(item.bytes)})`;
      ul.appendChild(li);
    });
    preview.append(head, ul);
    if (check.unknown.length) {
      const note = document.createElement("div");
      note.className = "error";
      note.textContent = `このバージョンでは扱えない項目は無視します: ${check.unknown.join(", ")}`;
      preview.appendChild(note);
    }
    if (check.newerFormat) {
      const note = document.createElement("div");
      note.className = "error";
      note.textContent = "このアプリより新しい形式のバックアップです。復元できない項目があるかもしれません。";
      preview.appendChild(note);
    }
    previewData = data;
    $("btn-import").disabled = false;
  }
  $("btn-check").onclick = checkImport;

  $("btn-import").onclick = () => {
    if (!previewData) return;
    if (!window.confirm("バックアップの内容で、この端末のデータを置き換えます。\n(置き換え前の状態は1世代分だけ退避され、この画面から戻せます)\n\nよろしいですか？")) return;
    const result = store.stagePendingImport(previewData);
    if (!result.ok) { message(result.error, true); return; }
    previewData = null;
    $("btn-import").disabled = true;
    renderPending();
    message("復元の準備ができました。再読み込みすると反映されます。");
  };
  function renderPending() {
    const pending = store.hasPendingImport();
    $("pending-box").hidden = !pending;
  }
  $("btn-reload").onclick = () => {
    try { window.top.location.reload(); } catch (e) { window.location.reload(); }
  };
  $("btn-cancel-pending").onclick = () => {
    store.cancelPendingImport();
    renderPending();
    message("復元をやめました。データは変わっていません。");
  };

  function renderSnapshot() {
    const info = store.snapshotInfo();
    const card = $("snapshot-card");
    card.hidden = !info;
    if (!info) return;
    const last = store.lastImport();
    $("snapshot-info").textContent = `${last ? formatDate(last.appliedAt) + " に復元を行いました。" : ""}その直前の状態(${info.items.map(i => i.label).join("・")})を退避しています。戻す場合も再読み込みが必要です。`;
  }
  $("btn-restore-snapshot").onclick = () => {
    if (!window.confirm("復元前の状態に戻します。今のデータは、逆に退避されます。よろしいですか？")) return;
    const result = store.stageSnapshotRestore();
    if (!result.ok) { message(result.error, true); return; }
    renderPending();
    message("戻す準備ができました。再読み込みすると反映されます。");
  };

  renderStores();
  renderPending();
  renderSnapshot();
  const last = store.lastImport();
  if (last && !store.hasPendingImport() && sessionStorage.getItem("saniwa-tool.import-notified") !== last.appliedAt) {
    try { sessionStorage.setItem("saniwa-tool.import-notified", last.appliedAt); } catch (e) {}
    message(`${formatDate(last.appliedAt)} にバックアップ(${formatDate(last.exportedAt)} 書き出し)から復元しました。`);
  }
})();
