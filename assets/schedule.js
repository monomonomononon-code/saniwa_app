(function () {
  "use strict";
  // 保存はすべて assets/storage-registry.js の共通API(load/save)経由。
  // このファイルでは localStorage を一切直接触らない。
  const store = window.SaniwaStorage;
  if (!store) return;

  const STORE_ID = "schedule";
  const MAX_LANES = 4; // 1週間に同時表示するイベントバーの最大段数(超えた分は「+N」で丸める)
  const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
  // 既存アプリの配色(wood/hanko/moss/gold/indigo/grape/teal)から、予定ごとに安定して色を割り当てる
  const PALETTE = ["#7A4B32", "#A8382C", "#5B6B45", "#9C7A2E", "#3F5A70", "#70536B", "#2F6B5E"];

  const $ = id => document.getElementById(id);
  const monthTitleEl = $("sched-month-title");
  const gridEl = $("sched-grid");
  const dayTitleEl = $("sched-day-title");
  const dayListEl = $("sched-day-list");
  const overlayEl = $("sched-editor-overlay");
  const errorEl = $("sched-editor-error");

  // ---- 日付ユーティリティ(すべて "YYYY-MM-DD" のローカル日付キーで扱う) ----
  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function keyToDate(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function daysBetween(fromKey, toKey) {
    return Math.round((keyToDate(toKey) - keyToDate(fromKey)) / 86400000);
  }
  function weekdayOf(key) { return WEEKDAY_LABELS[keyToDate(key).getDay()]; }
  function formatMD(key) { const [, m, d] = key.split("-"); return `${Number(m)}/${Number(d)}`; }
  function formatYMD(key) {
    const [y, m, d] = key.split("-");
    return `${Number(y)}年${Number(m)}月${Number(d)}日（${weekdayOf(key)}）`;
  }
  function formatRange(startKey, endKey) {
    return startKey === endKey ? formatYMD(startKey) : `${formatYMD(startKey)} 〜 ${formatMD(endKey)}（${weekdayOf(endKey)}）`;
  }
  function isDateKey(v) { return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v); }
  function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
  function colorForId(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  // ---- データの正規化(壊れた/古い保存内容でも安全な形に補正して読む) ----
  function normalizeTodo(t) {
    return {
      id: t && t.id ? String(t.id) : makeId("todo"),
      text: t && typeof t.text === "string" ? t.text : "",
      done: !!(t && t.done)
    };
  }
  function normalizeEvent(e) {
    const id = e && e.id ? String(e.id) : makeId("evt");
    const title = e && typeof e.title === "string" ? e.title : "";
    const startDate = isDateKey(e && e.startDate) ? e.startDate : localDateKey(new Date());
    let endDate = isDateKey(e && e.endDate) ? e.endDate : startDate;
    if (endDate < startDate) endDate = startDate; // 終了日が開始日より前なら開始日に合わせる
    const memo = e && typeof e.memo === "string" ? e.memo : "";
    const todos = Array.isArray(e && e.todos) ? e.todos.map(normalizeTodo) : [];
    const now = new Date().toISOString();
    const createdAt = e && typeof e.createdAt === "string" ? e.createdAt : now;
    const updatedAt = e && typeof e.updatedAt === "string" ? e.updatedAt : createdAt;
    return { id, title, startDate, endDate, memo, todos, createdAt, updatedAt };
  }
  function normalizeState(raw) {
    return { version: 1, events: Array.isArray(raw && raw.events) ? raw.events.map(normalizeEvent) : [] };
  }

  let state = normalizeState(store.load(STORE_ID));
  function persist() {
    const ok = store.save(STORE_ID, state);
    if (!ok) window.alert("保存できませんでした。端末の空き容量をご確認ください。");
    return ok;
  }

  const todayDate = new Date();
  const todayKey = localDateKey(todayDate);
  let visibleMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  let selectedDate = todayKey;
  let draft = null; // 追加・編集モーダルで操作中の下書き(保存ボタンを押すまで state には反映しない)

  function eventsForDay(dateKey) {
    return state.events
      .filter(e => e.startDate <= dateKey && e.endDate >= dateKey)
      .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
  }

  // ---- 月表示カレンダー ----
  function buildCellDates() {
    const year = visibleMonth.getFullYear(), month = visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const cells = [];
    for (let i = 0; i < 42; i++) cells.push(new Date(year, month, i - firstWeekday + 1));
    return cells;
  }

  function renderCalendar() {
    const year = visibleMonth.getFullYear(), month = visibleMonth.getMonth();
    monthTitleEl.textContent = `${year}年 ${month + 1}月`;
    gridEl.innerHTML = "";
    const cellDates = buildCellDates();

    for (let week = 0; week < 6; week++) {
      const weekDates = cellDates.slice(week * 7, week * 7 + 7);
      const weekStartKey = localDateKey(weekDates[0]);
      const weekEndKey = localDateKey(weekDates[6]);
      const dayRow = week * (MAX_LANES + 1) + 1;

      weekDates.forEach((d, col) => {
        const key = localDateKey(d);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sched-day";
        btn.style.gridColumn = String(col + 1);
        btn.style.gridRow = String(dayRow);
        btn.dataset.dateKey = key;
        if (d.getMonth() !== month) btn.classList.add("outside");
        if (key === todayKey) btn.classList.add("today");
        if (key === selectedDate) btn.classList.add("selected");
        const num = document.createElement("span");
        num.className = "sched-day-num";
        num.textContent = String(d.getDate());
        btn.appendChild(num);
        const dayEventCount = eventsForDay(key).length;
        btn.setAttribute("aria-label", `${formatYMD(key)}${dayEventCount ? `、予定${dayEventCount}件` : ""}`);
        btn.onclick = () => {
          selectedDate = key;
          if (d.getMonth() !== month) visibleMonth = new Date(d.getFullYear(), d.getMonth(), 1);
          renderCalendar();
          renderDayPanel();
        };
        gridEl.appendChild(btn);
      });

      // その週に重なる予定を、開始日順に貪欲法でレーン(段)へ割り当てる。
      // 同じ予定は週をまたいでも毎回この計算をやり直すだけで、常に矛盾なく描画できる。
      const weekEvents = state.events.filter(e => e.endDate >= weekStartKey && e.startDate <= weekEndKey);
      const sorted = weekEvents.slice().sort((a, b) =>
        a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : (a.id < b.id ? -1 : 1)
      );
      const laneEnds = [];
      const overflowByDay = {};
      sorted.forEach(ev => {
        const clampedStart = ev.startDate < weekStartKey ? weekStartKey : ev.startDate;
        const clampedEnd = ev.endDate > weekEndKey ? weekEndKey : ev.endDate;
        const startCol = daysBetween(weekStartKey, clampedStart);
        const endCol = daysBetween(weekStartKey, clampedEnd);
        let lane = laneEnds.findIndex(end => end < startCol);
        if (lane === -1) lane = laneEnds.length;
        if (lane >= MAX_LANES) {
          for (let c = startCol; c <= endCol; c++) {
            const k = localDateKey(weekDates[c]);
            overflowByDay[k] = (overflowByDay[k] || 0) + 1;
          }
          return;
        }
        laneEnds[lane] = endCol;

        const bar = document.createElement("button");
        bar.type = "button";
        bar.className = "sched-bar";
        bar.style.gridColumn = `${startCol + 1} / ${endCol + 2}`;
        bar.style.gridRow = String(dayRow + 1 + lane);
        bar.style.setProperty("--sched-color", colorForId(ev.id));
        if (ev.startDate >= weekStartKey) bar.classList.add("cap-start");
        if (ev.endDate <= weekEndKey) bar.classList.add("cap-end");
        bar.textContent = ev.title || "(無題の予定)";
        bar.title = `${ev.title || "(無題の予定)"}(${formatRange(ev.startDate, ev.endDate)})`;
        bar.onclick = () => openEditor(ev.id);
        gridEl.appendChild(bar);
      });

      Object.keys(overflowByDay).forEach(k => {
        const dayBtn = gridEl.querySelector(`.sched-day[data-date-key="${k}"]`);
        if (!dayBtn) return;
        const more = document.createElement("span");
        more.className = "sched-day-more";
        more.textContent = `+${overflowByDay[k]}`;
        dayBtn.appendChild(more);
      });
    }
  }

  // ---- その日の予定一覧(パネル) ----
  function renderDayPanel() {
    dayTitleEl.textContent = formatYMD(selectedDate);
    dayListEl.innerHTML = "";
    const dayEvents = eventsForDay(selectedDate);
    if (!dayEvents.length) {
      const empty = document.createElement("p");
      empty.className = "sched-day-empty";
      empty.textContent = "この日の予定はまだありません。";
      dayListEl.appendChild(empty);
      return;
    }
    dayEvents.forEach(ev => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "sched-day-row";
      row.style.setProperty("--sched-color", colorForId(ev.id));
      const title = document.createElement("span");
      title.className = "sched-day-row-title";
      title.textContent = ev.title || "(無題の予定)";
      row.appendChild(title);
      if (ev.startDate !== ev.endDate) {
        const range = document.createElement("span");
        range.className = "sched-day-row-range";
        range.textContent = formatRange(ev.startDate, ev.endDate);
        row.appendChild(range);
      }
      if (ev.todos.length) {
        const done = ev.todos.filter(t => t.done).length;
        const progress = document.createElement("span");
        progress.className = "sched-day-row-progress";
        progress.textContent = `ToDo ${done}/${ev.todos.length}`;
        row.appendChild(progress);
      }
      row.onclick = () => openEditor(ev.id);
      dayListEl.appendChild(row);
    });
  }

  // ---- 追加・編集モーダル ----
  function openEditor(eventId) {
    const existing = eventId ? state.events.find(e => e.id === eventId) : null;
    draft = existing
      ? JSON.parse(JSON.stringify(existing))
      : { id: null, title: "", startDate: selectedDate, endDate: selectedDate, memo: "", todos: [] };
    errorEl.textContent = "";
    renderEditor();
    overlayEl.hidden = false;
    $("sched-field-title").focus();
  }
  function closeEditor() {
    overlayEl.hidden = true;
    draft = null;
  }
  function renderEditor() {
    $("sched-editor-eyebrow").textContent = draft.id ? "予定を編集" : "新しい予定";
    $("sched-editor-title").textContent = draft.id ? (draft.title || "(無題の予定)") : "新しい予定";
    $("sched-field-title").value = draft.title;
    $("sched-field-start").value = draft.startDate;
    $("sched-field-end").value = draft.endDate;
    $("sched-field-memo").value = draft.memo;
    $("sched-delete").hidden = !draft.id;
    renderTodoList();
  }
  function renderTodoList() {
    const list = $("sched-todo-list");
    list.innerHTML = "";
    if (!draft.todos.length) {
      const p = document.createElement("p");
      p.className = "sched-todo-empty";
      p.textContent = "ToDoはまだありません。";
      list.appendChild(p);
    }
    draft.todos.forEach(todo => {
      const row = document.createElement("div");
      row.className = "sched-todo-row" + (todo.done ? " done" : "");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = todo.done;
      checkbox.setAttribute("aria-label", `${todo.text || "ToDo"}を完了にする`);
      checkbox.onchange = () => { todo.done = checkbox.checked; row.classList.toggle("done", todo.done); };
      const text = document.createElement("span");
      text.className = "sched-todo-text";
      text.textContent = todo.text;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "sched-todo-del";
      del.textContent = "×";
      del.setAttribute("aria-label", "ToDoを削除");
      del.onclick = () => { draft.todos = draft.todos.filter(t => t.id !== todo.id); renderTodoList(); };
      row.append(checkbox, text, del);
      list.appendChild(row);
    });
  }

  $("sched-field-title").oninput = e => { draft.title = e.target.value; };
  $("sched-field-start").onchange = e => { draft.startDate = e.target.value || draft.startDate; };
  $("sched-field-end").onchange = e => { draft.endDate = e.target.value || draft.endDate; };
  $("sched-field-memo").oninput = e => { draft.memo = e.target.value; };

  $("sched-todo-add").onclick = () => {
    const input = $("sched-todo-input");
    const text = input.value.trim();
    if (!text) return;
    draft.todos.push({ id: makeId("todo"), text, done: false });
    input.value = "";
    renderTodoList();
    input.focus();
  };
  $("sched-todo-input").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); $("sched-todo-add").click(); }
  });

  $("sched-save").onclick = () => {
    const title = draft.title.trim();
    if (!title) { errorEl.textContent = "タイトルを入力してください。"; $("sched-field-title").focus(); return; }
    const normalized = normalizeEvent({
      id: draft.id || makeId("evt"),
      title,
      startDate: draft.startDate,
      endDate: draft.endDate,
      memo: draft.memo,
      todos: draft.todos,
      createdAt: draft.createdAt
    });
    normalized.updatedAt = new Date().toISOString();
    const idx = state.events.findIndex(e => e.id === normalized.id);
    if (idx === -1) state.events.push(normalized); else state.events[idx] = normalized;
    if (!persist()) return;
    closeEditor();
    renderCalendar();
    renderDayPanel();
  };
  $("sched-delete").onclick = () => {
    if (!draft.id) return;
    if (!window.confirm(`「${draft.title || "この予定"}」を削除しますか？`)) return;
    state.events = state.events.filter(e => e.id !== draft.id);
    if (!persist()) return;
    closeEditor();
    renderCalendar();
    renderDayPanel();
  };
  $("sched-close").onclick = closeEditor;
  overlayEl.addEventListener("click", e => { if (e.target === overlayEl) closeEditor(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !overlayEl.hidden) closeEditor(); });

  $("sched-add-btn").onclick = () => openEditor(null);
  $("sched-prev").onclick = () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    renderCalendar();
  };
  $("sched-next").onclick = () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    renderCalendar();
  };
  $("sched-today").onclick = () => {
    visibleMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    selectedDate = todayKey;
    renderCalendar();
    renderDayPanel();
  };

  renderCalendar();
  renderDayPanel();
})();
