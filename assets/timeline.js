(function () {
  "use strict";
  // 保存はすべて assets/storage-registry.js の共通API(load/save)経由。
  // このファイルでは localStorage を一切直接触らない。
  const store = window.SaniwaStorage;
  if (!store) return;

  const STORE_ID = "timeline";
  const CATEGORIES = [
    { id: "summon", label: "顕現", color: "#9C7A2E" },
    { id: "event", label: "イベント", color: "#3F5A70" },
    { id: "honmaru", label: "本丸の出来事", color: "#7A4B32" },
    { id: "achievement", label: "達成", color: "#A8382C" },
    { id: "other", label: "その他", color: "#5C544A" }
  ];
  const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
  const CATEGORY_IDS = CATEGORIES.map(c => c.id);
  const SOURCE_TYPES = ["manual", "character", "journal", "system"];

  const $ = id => document.getElementById(id);
  const timelineEl = $("tl-timeline");
  const emptyEl = $("tl-empty");
  const editorOverlayEl = $("tl-editor-overlay");
  const errorEl = $("tl-editor-error");
  const viewOverlayEl = $("tl-view-overlay");

  // ---- 日付ユーティリティ ----
  function isDateKey(v) { return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v); }
  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function weekdayOf(key) {
    const [y, m, d] = key.split("-").map(Number);
    return ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, d).getDay()];
  }
  function formatMD(key) { const [, m, d] = key.split("-"); return `${Number(m)}月${Number(d)}日`; }
  function formatYMD(key) {
    const [y, m, d] = key.split("-");
    return `${Number(y)}年${Number(m)}月${Number(d)}日（${weekdayOf(key)}）`;
  }
  function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

  // ---- 手動項目の正規化(壊れた/古い保存内容でも安全な形に補正して読む) ----
  function normalizeEntry(e) {
    const id = e && e.id ? String(e.id) : makeId("evt");
    const date = isDateKey(e && e.date) ? e.date : localDateKey(new Date());
    const title = e && typeof e.title === "string" ? e.title : "";
    const description = e && typeof e.description === "string" ? e.description : "";
    const category = CATEGORY_IDS.includes(e && e.category) ? e.category : "other";
    const sourceType = SOURCE_TYPES.includes(e && e.sourceType) ? e.sourceType : "manual";
    const sourceId = sourceType !== "manual" && e && e.sourceId != null ? String(e.sourceId) : null;
    const now = new Date().toISOString();
    const createdAt = e && typeof e.createdAt === "string" ? e.createdAt : now;
    const updatedAt = e && typeof e.updatedAt === "string" ? e.updatedAt : createdAt;
    return { id, date, title, description, category, sourceType, sourceId, createdAt, updatedAt };
  }
  function normalizeState(raw) {
    return { version: 1, entries: Array.isArray(raw && raw.entries) ? raw.entries.map(normalizeEntry) : [] };
  }

  let state = normalizeState(store.load(STORE_ID));
  function persist() {
    const ok = store.save(STORE_ID, state);
    if (!ok) window.alert("保存できませんでした。端末の空き容量をご確認ください。");
    return ok;
  }

  // ---- 刀剣男士の顕現イベント(仮想の項目) ----
  // master.v1 を source of truth とし、timeline.v1 へは一切コピー・保存しない。
  // 表示のたびにここで動的に生成するだけなので、顕現年月日を変更/削除しても
  // 年表側は次に描画したときに自然に追随し、重複が発生する余地もない。
  function characterEntries() {
    const raw = store.load("master");
    const characters = Array.isArray(raw) ? raw : [];
    return characters
      .filter(c => c && isDateKey(c.activationDate))
      .map(c => ({
        id: "char:" + c.id,
        date: c.activationDate,
        title: `${c.name || "名称未設定"} 顕現`,
        description: "",
        category: "summon",
        sourceType: "character",
        sourceId: String(c.id),
        virtual: true
      }));
  }
  function allEntries() {
    // sourceType:"character" は本来ここ(timeline.v1)に保存されない前提だが、
    // 万一混入していても表示上は無視し、上の動的生成分だけを使う(重複防止の保険)。
    const persisted = state.entries.filter(e => e.sourceType !== "character");
    return persisted.concat(characterEntries());
  }

  // ---- 並び順・状態 ----
  let sortOrder = "desc"; // 新しい順をデフォルトに(直近の出来事から振り返れるように)
  let draft = null;   // 手動項目の編集下書き(保存ボタンを押すまで state には反映しない)
  let viewerEntry = null; // 顕現(参照専用)モーダルで表示中の項目

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // ---- 年表本体の描画 ----
  function groupByYear(entries) {
    const map = new Map();
    entries.forEach(e => {
      const year = e.date.slice(0, 4);
      if (!map.has(year)) map.set(year, []);
      map.get(year).push(e);
    });
    return map;
  }

  function renderTimeline() {
    const sorted = allEntries().sort((a, b) => {
      const cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id < b.id ? -1 : 1);
      return sortOrder === "asc" ? cmp : -cmp;
    });
    timelineEl.innerHTML = "";
    emptyEl.hidden = sorted.length > 0;
    if (!sorted.length) { renderYearJump([]); return; }

    const grouped = groupByYear(sorted); // Map の挿入順 = sorted の順序 = 年の並びも自動的に正しくなる
    grouped.forEach((yearEntries, year) => {
      const section = el("section", "tl-year");
      section.id = `tl-year-${year}`;
      section.appendChild(el("h2", "tl-year-head", `${year}年`));
      const items = el("div", "tl-items");
      yearEntries.forEach(entry => items.appendChild(renderItem(entry)));
      section.appendChild(items);
      timelineEl.appendChild(section);
    });
    renderYearJump(Array.from(grouped.keys()));
  }

  function renderItem(entry) {
    const cat = CATEGORY_BY_ID[entry.category] || CATEGORY_BY_ID.other;
    const item = document.createElement("button");
    item.type = "button";
    item.className = "tl-item" + (entry.virtual ? " virtual" : "");
    item.style.setProperty("--tl-color", cat.color);
    item.appendChild(el("span", "tl-item-date", formatMD(entry.date)));
    const titleRow = el("div", "tl-item-title-row");
    titleRow.appendChild(el("span", "tl-item-title", entry.title || "(無題の出来事)"));
    titleRow.appendChild(el("span", "tl-item-cat", cat.label));
    if (entry.virtual) titleRow.appendChild(el("span", "tl-item-auto-badge", "刀剣男士データより自動反映"));
    item.appendChild(titleRow);
    if (entry.description) item.appendChild(el("p", "tl-item-desc", entry.description));
    item.onclick = () => (entry.virtual ? openViewer(entry) : openEditor(entry.id));
    return item;
  }

  function renderYearJump(years) {
    const select = $("tl-year-jump");
    const prevValue = select.value;
    select.innerHTML = '<option value="">年へ移動…</option>' + years.map(y => `<option value="${y}">${y}年</option>`).join("");
    select.value = years.includes(prevValue) ? prevValue : "";
  }
  $("tl-year-jump").onchange = e => {
    const year = e.target.value;
    if (!year) return;
    const target = document.getElementById(`tl-year-${year}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    e.target.value = "";
  };

  function updateOrderButtons() {
    $("tl-order-desc").classList.toggle("active", sortOrder === "desc");
    $("tl-order-asc").classList.toggle("active", sortOrder === "asc");
  }
  $("tl-order-desc").onclick = () => { sortOrder = "desc"; updateOrderButtons(); renderTimeline(); };
  $("tl-order-asc").onclick = () => { sortOrder = "asc"; updateOrderButtons(); renderTimeline(); };
  updateOrderButtons();

  // ---- 手動項目の追加・編集モーダル ----
  (function populateCategorySelect() {
    const select = $("tl-field-category");
    select.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join("");
  })();

  function openEditor(entryId) {
    const existing = entryId ? state.entries.find(e => e.id === entryId) : null;
    draft = existing
      ? JSON.parse(JSON.stringify(existing))
      : { id: null, date: localDateKey(new Date()), title: "", description: "", category: "other" };
    errorEl.textContent = "";
    $("tl-editor-eyebrow").textContent = draft.id ? "出来事を編集" : "新しい出来事";
    $("tl-editor-title").textContent = draft.id ? (draft.title || "(無題の出来事)") : "新しい出来事";
    $("tl-field-date").value = draft.date;
    $("tl-field-title").value = draft.title;
    $("tl-field-category").value = draft.category;
    $("tl-field-description").value = draft.description;
    $("tl-delete").hidden = !draft.id;
    editorOverlayEl.hidden = false;
    $("tl-field-title").focus();
  }
  function closeEditor() { editorOverlayEl.hidden = true; draft = null; }

  $("tl-field-date").onchange = e => { draft.date = e.target.value || draft.date; };
  $("tl-field-title").oninput = e => { draft.title = e.target.value; };
  $("tl-field-category").onchange = e => { draft.category = e.target.value; };
  $("tl-field-description").oninput = e => { draft.description = e.target.value; };

  $("tl-save").onclick = () => {
    const title = draft.title.trim();
    if (!title) { errorEl.textContent = "タイトルを入力してください。"; $("tl-field-title").focus(); return; }
    const normalized = normalizeEntry({
      id: draft.id || makeId("evt"),
      date: draft.date,
      title,
      description: draft.description,
      category: draft.category,
      sourceType: "manual",
      sourceId: null,
      createdAt: draft.createdAt
    });
    normalized.updatedAt = new Date().toISOString();
    const idx = state.entries.findIndex(e => e.id === normalized.id);
    if (idx === -1) state.entries.push(normalized); else state.entries[idx] = normalized;
    if (!persist()) return;
    closeEditor();
    renderTimeline();
  };
  $("tl-delete").onclick = () => {
    if (!draft.id) return;
    if (!window.confirm(`「${draft.title || "この出来事"}」を削除しますか？`)) return;
    state.entries = state.entries.filter(e => e.id !== draft.id);
    if (!persist()) return;
    closeEditor();
    renderTimeline();
  };
  $("tl-close").onclick = closeEditor;
  editorOverlayEl.addEventListener("click", e => { if (e.target === editorOverlayEl) closeEditor(); });

  // ---- 顕現(参照専用)モーダル ----
  function openViewer(entry) {
    viewerEntry = entry;
    $("tl-view-title").textContent = entry.title;
    $("tl-view-date").textContent = formatYMD(entry.date);
    viewOverlayEl.hidden = false;
  }
  function closeViewer() { viewOverlayEl.hidden = true; viewerEntry = null; }
  $("tl-view-close").onclick = closeViewer;
  $("tl-view-open-master").onclick = () => {
    try { window.parent && window.parent.postMessage({ source: "timeline", type: "open_character_list" }, "*"); } catch (e) {}
  };
  viewOverlayEl.addEventListener("click", e => { if (e.target === viewOverlayEl) closeViewer(); });

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!editorOverlayEl.hidden) closeEditor();
    if (!viewOverlayEl.hidden) closeViewer();
  });

  $("tl-add-btn").onclick = () => openEditor(null);

  renderTimeline();
})();
