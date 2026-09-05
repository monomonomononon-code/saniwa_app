(function () {
  "use strict";
  const store = window.SaniwaReportStore;
  if (!store) return;
  // 年表(timeline.v1)への「史へ記す」連携。assets/storage-registry.js の共通API経由のみで読み書きし、
  // 日報の内容そのものは複製しない(sourceType:"report", sourceId:日付キー の参照だけを保存する)。
  const timelineStore = window.SaniwaStorage || null;

  const today = new Date();
  let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDate = store.localDate(today);
  let state = store.load();
  let draft = null;

  const $ = id => document.getElementById(id);
  const monthTitle = $("report-month-title");
  const calendarGrid = $("report-calendar-grid");
  const selectedDateTitle = $("report-selected-date");
  const dayContent = $("report-day-content");
  const overlay = $("report-editor-overlay");
  const modal = $("report-editor");
  const resourceNames = Object.fromEntries(store.RESOURCE_KEYS.map(item => [item.id, item.label]));

  function formatNumber(value, digits) {
    return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: digits == null ? 2 : digits }).format(Number(value) || 0);
  }
  function signed(value) {
    const n = Number(value) || 0;
    return `${n > 0 ? "+" : ""}${formatNumber(n)}`;
  }
  function dateLabel(key) {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return `${year}年${month}月${day}日（${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]}）`;
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function currentEntry() {
    return store.normalizeEntry(state.entries[selectedDate], selectedDate);
  }

  function renderCalendar() {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    monthTitle.textContent = `${year}年 ${month + 1}月`;
    calendarGrid.innerHTML = "";
    const firstWeekday = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const previousDays = new Date(year, month, 0).getDate();
    for (let index = 0; index < 42; index += 1) {
      let cellDate;
      let outside = false;
      if (index < firstWeekday) {
        cellDate = new Date(year, month - 1, previousDays - firstWeekday + index + 1);
        outside = true;
      } else if (index >= firstWeekday + days) {
        cellDate = new Date(year, month + 1, index - firstWeekday - days + 1);
        outside = true;
      } else {
        cellDate = new Date(year, month, index - firstWeekday + 1);
      }
      const key = store.localDate(cellDate);
      const button = element("button", "report-date", String(cellDate.getDate()));
      button.type = "button";
      button.setAttribute("aria-label", dateLabel(key));
      if (outside) button.classList.add("outside");
      if (key === store.localDate(today)) button.classList.add("today");
      if (key === selectedDate) button.classList.add("selected");
      if (store.isDailyComplete(state.entries[key])) {
        button.classList.add("daily-complete");
        button.appendChild(element("span", "report-complete-mark", "💮"));
        button.setAttribute("aria-label", `${dateLabel(key)}、日課をすべて達成`);
      } else if (store.hasContent(state.entries[key])) {
        button.classList.add("has-record");
        button.appendChild(element("span", "report-record-dot"));
      }
      button.onclick = () => {
        selectedDate = key;
        if (outside) visibleMonth = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
        renderCalendar();
        renderDay();
      };
      calendarGrid.appendChild(button);
    }
  }

  function addViewSection(title, content) {
    const section = element("section", "report-view-section");
    section.appendChild(element("h3", "", title));
    section.appendChild(content);
    dayContent.appendChild(section);
  }
  function textList(items, emptyText) {
    if (!items.length) return element("p", "report-empty-line", emptyText);
    const list = element("ul", "report-view-list");
    items.forEach(text => list.appendChild(element("li", "", text)));
    return list;
  }
  function renderResourceSummary(entry) {
    const totals = store.getTotals(entry);
    const table = element("div", "report-summary-table");
    store.RESOURCE_KEYS.forEach(item => {
      const values = totals.resources[item.id];
      const row = element("div", "report-summary-row");
      row.append(element("span", "", item.label), element("strong", values.total > 0 ? "positive" : values.total < 0 ? "negative" : "", signed(values.total)));
      table.appendChild(row);
    });
    return table;
  }
  function conditionLabels(conditions) {
    if (!conditions) return [];
    const labels = [];
    if (conditions.rank) labels.push(conditions.rank);
    if (conditions.mvp) labels.push(`誉：${conditions.mvp}`);
    if (conditions.doubleExperience) labels.push("経験値2倍");
    if (conditions.kebiishi) labels.push("検非違使出現済み");
    if (conditions.variant) labels.push(conditions.variant);
    return labels;
  }
  function renderExpRecord(record, editable) {
    const card = element("article", "report-exp-record");
    const head = element("div", "report-exp-head");
    const heading = element("strong", "", record.mapLabel || "経験値計算");
    const rounds = element("span", "", `${formatNumber(record.rounds, 0)}周`);
    head.append(heading, rounds);
    card.appendChild(head);
    const members = Array.isArray(record.members) ? record.members : [];
    const expResults = Array.isArray(record.expResults) ? record.expResults : [];
    const memberNames = members.map(member => member.name).filter(Boolean);
    const memberBlock = element("div", "report-run-members");
    memberBlock.append(element("span", "report-exp-subtitle", "周回メンバー"), element("p", "", memberNames.join(" / ") || "記録なし"));
    card.appendChild(memberBlock);
    const calculated = element("div", "report-calculated-members");
    calculated.appendChild(element("span", "report-exp-subtitle", "経験値計算済み"));
    if (!expResults.length) calculated.appendChild(element("p", "report-empty-line", record.legacyTargetUnknown ? "旧形式の記録のため、計算対象を判別できません" : "なし"));
    expResults.forEach(result => {
      const resultBox = element("div", "report-calculated-result");
      const row = element("div", "report-exp-row");
      const value = element("strong", "report-approx-value");
      value.append(element("small", "report-approx", "約"), document.createTextNode(`${formatNumber(result.exp)} EXP`));
      row.append(element("span", "", result.name || "刀剣男士"), value);
      resultBox.appendChild(row);
      const labels = conditionLabels(result.conditions);
      if (Number(result.expMultiplier) > 1 && !labels.includes("経験値2倍")) labels.push(`経験値×${formatNumber(result.expMultiplier)}`);
      if (labels.length) resultBox.appendChild(element("p", "report-exp-conditions", labels.join(" ／ ")));
      calculated.appendChild(resultBox);
    });
    card.appendChild(calculated);
    if (!record.legacyTargetUnknown) {
      const calculatedKeys = new Set(expResults.map(result => result.characterId || result.name));
      const uncalculated = members.filter(member => !calculatedKeys.has(member.id || member.name)).map(member => member.name);
      const pending = element("div", "report-uncalculated-members");
      pending.append(element("span", "report-exp-subtitle", "未計算"), element("p", "", uncalculated.join(" / ") || "なし"));
      card.appendChild(pending);
    }
    const resources = Object.entries(record.resources || {}).filter(([, amount]) => Number(amount));
    if (resources.length) {
      const resourceBox = element("div", "report-exp-resources");
      resources.forEach(([name, amount]) => {
        const line = element("span", "");
        line.append(document.createTextNode(`${name} `), element("small", "report-approx", "約"), document.createTextNode(`${formatNumber(amount)}${name === "依頼札" ? "枚" : ""}`));
        resourceBox.appendChild(line);
      });
      card.appendChild(resourceBox);
    }
    if (editable) {
      const remove = element("button", "report-remove", "削除");
      remove.type = "button";
      remove.onclick = () => {
        draft.expRecords = draft.expRecords.filter(item => item.id !== record.id);
        renderExpEditor();
      };
      card.appendChild(remove);
    }
    return card;
  }
  function renderDay() {
    selectedDateTitle.textContent = dateLabel(selectedDate);
    dayContent.innerHTML = "";
    const entry = currentEntry();
    if (!store.hasContent(entry)) {
      const empty = element("div", "report-day-empty");
      empty.append(element("span", "report-day-empty-mark", "記"), element("p", "", "この日の記録はまだありません。"));
      dayContent.appendChild(empty);
      return;
    }
    const checkedTasks = store.DAILY_TASKS.filter(task => entry.dailyTasks[task.id]).map(task => task.label);
    addViewSection("日課", textList(checkedTasks, "達成記録なし"));
    addViewSection("入手した刀剣男士", textList(entry.obtainedSwords.map(item => `${item.name} ×${item.count}`), "入手記録なし"));
    addViewSection("資材・札の収支", renderResourceSummary(entry));
    addViewSection("イベント周回", textList(entry.eventRuns.map(item => `${item.label}　${formatNumber(item.rounds, 0)}周`), "周回記録なし"));
    addViewSection("通常マップ周回", textList(entry.normalMapRuns.map(item => `${item.label}　${formatNumber(item.rounds, 0)}周`), "周回記録なし"));
    const totals = store.getTotals(entry);
    addViewSection("小判の収支", element("p", `report-koban-view ${totals.koban.total > 0 ? "positive" : totals.koban.total < 0 ? "negative" : ""}`, signed(totals.koban.total)));
    const expWrap = element("div", "report-exp-list");
    if (!entry.expRecords.length) expWrap.appendChild(element("p", "report-empty-line", "経験値記録なし"));
    entry.expRecords.forEach(record => expWrap.appendChild(renderExpRecord(record, false)));
    addViewSection("経験値計算機からの記録", expWrap);

    if (timelineStore) dayContent.appendChild(renderTimelineToggle(selectedDate));
  }

  // ---- 年表(史)への登録・解除 ----
  // sourceType:"report" + sourceId(日付キー) の組を一意なキーとして扱い、重複登録を防ぐ。
  // 日付キーは report.v1 の entries が本来持つ一意なキーそのものなので、新たなIDを発行しない。
  function loadTimelineEntries() {
    const data = timelineStore.load("timeline");
    return Array.isArray(data && data.entries) ? data.entries : [];
  }
  function findTimelineEntryIndex(entries, dateKey) {
    return entries.findIndex(e => e && e.sourceType === "report" && e.sourceId === dateKey);
  }
  function toggleTimelineEntry(dateKey) {
    const entries = loadTimelineEntries();
    const idx = findTimelineEntryIndex(entries, dateKey);
    if (idx === -1) {
      const now = new Date().toISOString();
      entries.push({
        id: store.uid("tl"), date: dateKey, title: "日報", description: "",
        category: "honmaru", sourceType: "report", sourceId: dateKey,
        createdAt: now, updatedAt: now
      });
    } else {
      entries.splice(idx, 1);
    }
    timelineStore.save("timeline", { version: 1, entries });
    renderDay();
  }
  function renderTimelineToggle(dateKey) {
    const wrap = element("div", "report-timeline-section");
    const registered = findTimelineEntryIndex(loadTimelineEntries(), dateKey) !== -1;
    const btn = element("button", "report-timeline-btn" + (registered ? " active" : ""),
      registered ? "史に記録済み（外す）" : "史へ記す");
    btn.type = "button";
    btn.onclick = () => toggleTimelineEntry(dateKey);
    wrap.appendChild(btn);
    return wrap;
  }

  function removeButton(action) {
    const button = element("button", "report-remove", "削除");
    button.type = "button";
    button.onclick = action;
    return button;
  }
  function renderSimpleEditList(target, items, labeler, removeAt) {
    target.innerHTML = "";
    if (!items.length) target.appendChild(element("p", "report-empty-line", "まだ登録されていません"));
    items.forEach((item, index) => {
      const row = element("div", "report-edit-item");
      row.append(element("span", "", labeler(item)), removeButton(() => removeAt(index)));
      target.appendChild(row);
    });
  }
  function renderObtainedEditor() {
    renderSimpleEditList($("report-obtained-list"), draft.obtainedSwords, item => `${item.name} ×${item.count}`, index => {
      draft.obtainedSwords.splice(index, 1);
      renderObtainedEditor();
    });
  }
  function renderRunEditors() {
    renderSimpleEditList($("report-event-list"), draft.eventRuns, item => `${item.label}　${item.rounds}周`, index => {
      draft.eventRuns.splice(index, 1); renderRunEditors();
    });
    renderSimpleEditList($("report-map-list"), draft.normalMapRuns, item => `${item.label}　${item.rounds}周`, index => {
      draft.normalMapRuns.splice(index, 1); renderRunEditors();
    });
  }
  function renderExpEditor() {
    const list = $("report-exp-editor-list");
    list.innerHTML = "";
    if (!draft.expRecords.length) list.appendChild(element("p", "report-empty-line", "経験値計算機から追加された記録はありません"));
    draft.expRecords.forEach(record => list.appendChild(renderExpRecord(record, true)));
  }
  function updateResourceTotals() {
    const totals = store.getTotals(draft);
    store.RESOURCE_KEYS.forEach(item => {
      const values = totals.resources[item.id];
      const daily = $(`report-resource-daily-${item.id}`);
      const total = $(`report-resource-total-${item.id}`);
      if (daily) daily.textContent = signed(values.daily);
      if (total) total.textContent = signed(values.total);
    });
    $("report-koban-total").textContent = `日課分 ${signed(totals.koban.daily)} ／ 合計 ${signed(totals.koban.total)}`;
  }
  function updateKobanTools() {
    const multiplier = draft.koban.tripleCampaign ? 3 : 1;
    document.querySelectorAll("[data-koban-add]").forEach(button => {
      button.textContent = `＋${formatNumber(Number(button.dataset.kobanAdd) * multiplier, 0)}`;
    });
    $("report-koban-triple").checked = draft.koban.tripleCampaign;
  }
  function buildResourceEditor() {
    const wrap = $("report-resource-editor");
    wrap.innerHTML = "";
    const head = element("div", "report-resource-row report-resource-head");
    ["", "手入力", "日課分", "合計"].forEach(label => head.appendChild(element("span", "", label)));
    wrap.appendChild(head);
    store.RESOURCE_KEYS.forEach(item => {
      const row = element("div", "report-resource-row");
      row.appendChild(element("label", "", item.label));
      const input = document.createElement("input");
      input.type = "number";
      input.inputMode = "numeric";
      input.step = "1";
      input.value = draft.resources.manual[item.id] || "";
      input.placeholder = "0";
      input.setAttribute("aria-label", `${item.label}の手入力収支`);
      input.oninput = () => { draft.resources.manual[item.id] = Number(input.value) || 0; updateResourceTotals(); };
      row.append(input, element("span", "report-resource-value", ""));
      row.lastChild.id = `report-resource-daily-${item.id}`;
      const total = element("strong", "report-resource-value");
      total.id = `report-resource-total-${item.id}`;
      row.appendChild(total);
      wrap.appendChild(row);
    });
    updateResourceTotals();
  }
  function populateCatalogs() {
    const catalogs = store.getCatalogs();
    const eventSelect = $("report-event-name");
    const mapSelect = $("report-map-name");
    eventSelect.innerHTML = "";
    mapSelect.innerHTML = "";
    eventSelect.appendChild(new Option("イベントを選択", ""));
    catalogs.eventMaps.forEach(item => eventSelect.appendChild(new Option(item.label, item.id)));
    mapSelect.appendChild(new Option("通常マップを選択", ""));
    catalogs.normalMaps.forEach(label => mapSelect.appendChild(new Option(label, label)));
  }
  function renderTaskEditor() {
    const list = $("report-task-list");
    list.innerHTML = "";
    store.DAILY_TASKS.forEach(task => {
      const label = element("label", "report-check-item");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!draft.dailyTasks[task.id];
      input.onchange = () => { draft.dailyTasks[task.id] = input.checked; updateResourceTotals(); };
      label.append(input, element("span", "", task.label));
      list.appendChild(label);
    });
  }
  function openEditor() {
    draft = store.clone(currentEntry());
    $("report-editor-title").textContent = dateLabel(selectedDate);
    renderTaskEditor();
    renderObtainedEditor();
    buildResourceEditor();
    populateCatalogs();
    renderRunEditors();
    $("report-koban").value = draft.koban.manual || "";
    updateKobanTools();
    renderExpEditor();
    overlay.hidden = false;
    document.body.classList.add("report-modal-open");
    requestAnimationFrame(() => modal.focus());
  }
  function closeEditor() {
    overlay.hidden = true;
    document.body.classList.remove("report-modal-open");
    draft = null;
    $("report-edit").focus();
  }
  function addRun(type) {
    const isEvent = type === "event";
    const select = $(isEvent ? "report-event-name" : "report-map-name");
    const input = $(isEvent ? "report-event-rounds" : "report-map-rounds");
    const rounds = Number(input.value);
    if (!select.value || !Number.isInteger(rounds) || rounds <= 0) return;
    const item = { id: store.uid(isEvent ? "event" : "map"), refId: select.value, label: select.options[select.selectedIndex].text, rounds };
    draft[isEvent ? "eventRuns" : "normalMapRuns"].push(item);
    select.value = "";
    input.value = "";
    renderRunEditors();
  }

  $("report-prev-month").onclick = () => { visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1); renderCalendar(); };
  $("report-next-month").onclick = () => { visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1); renderCalendar(); };
  $("report-edit").onclick = openEditor;
  $("report-editor-close").onclick = closeEditor;
  overlay.addEventListener("click", event => { if (event.target === overlay) closeEditor(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !overlay.hidden) closeEditor(); });
  $("report-add-sword").onclick = () => {
    const name = $("report-sword-name").value.trim();
    const count = Number($("report-sword-count").value);
    if (!name || !Number.isInteger(count) || count <= 0) return;
    draft.obtainedSwords.push({ id: store.uid("sword"), name, count });
    $("report-sword-name").value = "";
    $("report-sword-count").value = "1";
    renderObtainedEditor();
  };
  $("report-add-event").onclick = () => addRun("event");
  $("report-add-map").onclick = () => addRun("map");
  $("report-koban").oninput = event => { draft.koban.manual = Number(event.target.value) || 0; updateResourceTotals(); };
  $("report-koban-triple").onchange = event => {
    draft.koban.tripleCampaign = event.target.checked;
    updateKobanTools();
  };
  document.querySelectorAll("[data-koban-add]").forEach(button => {
    button.onclick = () => {
      const multiplier = draft.koban.tripleCampaign ? 3 : 1;
      draft.koban.manual += Number(button.dataset.kobanAdd) * multiplier;
      $("report-koban").value = draft.koban.manual;
      updateResourceTotals();
    };
  });
  $("report-save").onclick = () => {
    state.entries[selectedDate] = store.normalizeEntry(draft, selectedDate);
    if (!store.save(state)) return;
    closeEditor();
    renderCalendar();
    renderDay();
  };
  window.addEventListener("storage", event => {
    if (event.key !== store.STORAGE_KEY || !overlay.hidden) return;
    state = store.load();
    renderCalendar();
    renderDay();
  });

  renderCalendar();
  renderDay();
})();
