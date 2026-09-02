(function(){
  const CHAR_NAMES = [
    "山姥切国広","歌仙兼定","加州清光","陸奥守吉行","蜂須賀虎徹",
    "堀川国広","薬研藤四郎","髭切","膝丸","一期一振"
  ];
  let characters = CHAR_NAMES.map((n, i) => ({ id: "c" + i, name: n }));
  function nameOf(id) { const c = characters.find(c => c.id === id); return c ? c.name : "?"; }

  const ANCHORS = [[30,30],[70,30],[30,70],[70,70],[50,50],[15,50],[85,50],[50,15],[50,85],[20,80]];

  const SHAPE_META = {
    solo:     { label: "単体",       min: 1, max: 1,  r: 0  },
    triangle: { label: "三角(3人)",  min: 3, max: 3,  r: 10 },
    square:   { label: "四角(4人)",  min: 4, max: 4,  r: 11 },
    circle:   { label: "丸(5〜10人)",min: 5, max: 10, r: 13 }
  };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function computeShapePositions(shape, anchor, ids) {
    const meta = SHAPE_META[shape];
    const [ax, ay] = anchor;
    const n = ids.length;
    const result = {};
    if (shape === "solo") {
      result[ids[0]] = { x: ax, y: ay };
      return result;
    }
    ids.forEach((id, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      result[id] = {
        x: clamp(ax + meta.r * Math.cos(angle), 4, 96),
        y: clamp(ay + meta.r * Math.sin(angle), 4, 96)
      };
    });
    return result;
  }

  function makeTab(name) {
    return {
      id: "t" + Date.now() + Math.random().toString(16).slice(2),
      name,
      placedIds: [],
      positions: {},
      relationships: [],
      groupCount: 0
    };
  }

  let tabs = [ makeTab("古参勢") ];
  let activeTabId = tabs[0].id;
  function activeTab() { return tabs.find(t => t.id === activeTabId) || tabs[0]; }

  let openProfileId = null;


  const NETWORK_STORAGE_KEY = "saniwa-tool.network.v1";
  try {
    const saved = JSON.parse(localStorage.getItem(NETWORK_STORAGE_KEY));
    if (saved && Array.isArray(saved.tabs) && saved.tabs.length) {
      tabs = saved.tabs;
      activeTabId = saved.tabs.some(tab => tab.id === saved.activeTabId) ? saved.activeTabId : saved.tabs[0].id;
    }
  } catch (e) {}
  function saveState() {
    try { localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify({ tabs, activeTabId })); } catch (e) {}
  }
  window.addEventListener("pagehide", saveState);
  function notify(text) {
    saveState();
    try {
      window.parent && window.parent.postMessage({ source: "network", text: text }, "*");
    } catch (e) { /* 単体表示の場合は何もしない */ }
  }

  window.addEventListener("message", e => {
    const data = e.data;
    if (!data || data.type !== "characters_sync" || !Array.isArray(data.characters)) return;
    data.characters.forEach(sc => {
      let c = characters.find(x => x.id === sc.id);
      if (!c) {
        c = { id: sc.id, name: sc.name };
        characters.push(c);
      }
      c.name = sc.name;
      c.swordType = sc.swordType || "";
      c.activationDate = sc.activationDate || "";
      c.unit = sc.unit || "";
      c.isCaptain = !!sc.isCaptain;
    });
    render();
  });
  try { window.parent && window.parent.postMessage({ source: "network", type: "ready" }, "*"); } catch (e) {}
  let editingRelId = null;
  let addRelOpen = false;
  let addRelDraft = { from: "", to: "", label: "" };
  let addCharOpen = false;
  let addCharDraft = { shape: "solo", selected: [] };
  let tabManageOpen = false;

  function hasReverse(rel, list) {
    return list.some(r => r.from === rel.to && r.to === rel.from);
  }

  function root() { return document.getElementById("app"); }

  function render() {
    const el = root();
    el.innerHTML = "";
    const tab = activeTab();

    const header = document.createElement("div");
    header.className = "header";
    header.innerHTML = `
      <h1><span class="seal">縁</span>本丸 相関図</h1>
      <p>「刀剣男士を追加」で丸・三角・四角・単体のテンプレ配置。ノードはドラッグで自由に動かせます。</p>
    `;
    el.appendChild(header);

    const tabRow = document.createElement("div");
    tabRow.className = "tab-strip-row";
    const strip = document.createElement("div");
    strip.className = "tab-strip";
    tabs.forEach(t => {
      const chip = document.createElement("button");
      chip.className = "tab-chip" + (t.id === activeTabId ? " active" : "");
      chip.textContent = t.name;
      chip.onclick = () => { activeTabId = t.id; render(); };
      strip.appendChild(chip);
    });
    tabRow.appendChild(strip);
    const gear = document.createElement("button");
    gear.className = "tab-gear";
    gear.textContent = "\u2699";
    gear.onclick = () => { tabManageOpen = true; render(); };
    tabRow.appendChild(gear);
    el.appendChild(tabRow);

    const canvas = document.createElement("div");
    canvas.className = "canvas-wrap";
    canvas.id = "canvas";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.innerHTML = `
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--hanko)"></path>
        </marker>
      </defs>
    `;

    tab.relationships.forEach(rel => {
      const p1 = tab.positions[rel.from];
      const p2 = tab.positions[rel.to];
      if (!p1 || !p2) return;
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = -dy / dist, ny = dx / dist;
      const offset = hasReverse(rel, tab.relationships) ? 5 : 0;
      const mx = (p1.x + p2.x) / 2 + nx * offset;
      const my = (p1.y + p2.y) / 2 + ny * offset;
      const trimTo = trimPoint({ x: mx, y: my }, p2, 6);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${p1.x} ${p1.y} Q ${mx} ${my} ${trimTo.x} ${trimTo.y}`);
      path.setAttribute("stroke", "var(--hanko)");
      path.setAttribute("stroke-width", "0.6");
      path.setAttribute("fill", "none");
      path.setAttribute("opacity", "0.75");
      path.setAttribute("marker-end", "url(#arrow)");

      const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hitPath.setAttribute("d", path.getAttribute("d"));
      hitPath.setAttribute("stroke", "transparent");
      hitPath.setAttribute("stroke-width", "4");
      hitPath.setAttribute("fill", "none");
      hitPath.style.cursor = "pointer";
      hitPath.addEventListener("click", () => { editingRelId = rel.id; render(); });

      svg.appendChild(path);
      svg.appendChild(hitPath);
      rel._labelPos = { x: mx, y: my };
    });

    canvas.appendChild(svg);

    tab.relationships.forEach(rel => {
      const lp = rel._labelPos;
      if (!lp) return;
      const label = document.createElement("div");
      label.className = "edge-label";
      label.textContent = rel.label || "（無題）";
      label.style.left = lp.x + "%";
      label.style.top = lp.y + "%";
      label.onclick = () => { editingRelId = rel.id; render(); };
      canvas.appendChild(label);
    });

    tab.placedIds.forEach(charId => {
      const p = tab.positions[charId];
      if (!p) return;
      const chip = document.createElement("div");
      const full = characters.find(x => x.id === charId);
      chip.className = "node-chip" + (full && full.isCaptain ? " captain" : "");
      chip.textContent = nameOf(charId);
      chip.style.left = p.x + "%";
      chip.style.top = p.y + "%";
      attachNodeDrag(chip, charId);
      canvas.appendChild(chip);
    });

    if (tab.placedIds.length === 0) {
      const empty = document.createElement("div");
      empty.className = "canvas-empty";
      empty.textContent = "「＋ 刀剣男士を追加」でここに配置していきます";
      canvas.appendChild(empty);
    }

    el.appendChild(canvas);

    const actionRow = document.createElement("div");
    actionRow.className = "action-row";
    const addCharBtn = document.createElement("button");
    addCharBtn.className = "action-btn primary";
    addCharBtn.textContent = "＋ 刀剣男士を追加";
    addCharBtn.onclick = () => {
      addCharDraft = { shape: "solo", selected: [] };
      addCharOpen = true;
      render();
    };
    const addRelBtn = document.createElement("button");
    addRelBtn.className = "action-btn secondary";
    addRelBtn.textContent = "＋ 関係を追加";
    addRelBtn.disabled = tab.placedIds.length < 2;
    addRelBtn.onclick = () => {
      if (tab.placedIds.length < 2) return;
      addRelDraft = { from: tab.placedIds[0], to: tab.placedIds[1], label: "" };
      addRelOpen = true;
      render();
    };
    actionRow.appendChild(addCharBtn);
    actionRow.appendChild(addRelBtn);
    el.appendChild(actionRow);

    const hint = document.createElement("div");
    hint.className = "rel-list-hint";
    hint.textContent = `配置済み：${tab.placedIds.length}振り／関係：${tab.relationships.length}件`;
    el.appendChild(hint);

    if (openProfileId) el.appendChild(renderProfileModal(openProfileId));
    if (editingRelId) el.appendChild(renderEditRelModal(editingRelId));
    if (addRelOpen) el.appendChild(renderAddRelModal());
    if (addCharOpen) el.appendChild(renderAddCharModal());
    if (tabManageOpen) el.appendChild(renderTabManageModal());
  }

  function trimPoint(ctrl, p2, amountPercent) {
    const dx = p2.x - ctrl.x, dy = p2.y - ctrl.y;
    const dist = Math.hypot(dx, dy) || 1;
    const t = Math.min(amountPercent / dist, 0.9);
    return { x: p2.x - dx * t, y: p2.y - dy * t };
  }

  function attachNodeDrag(el, charId) {
    el.addEventListener("pointerdown", e => {
      e.preventDefault();
      const tab = activeTab();
      const canvas = document.getElementById("canvas");
      const startX = e.clientX, startY = e.clientY;
      const THRESHOLD = 9;
      let moved = false;

      const move = ev => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!moved && Math.hypot(dx, dy) > THRESHOLD) moved = true;
        if (moved) {
          const rect = canvas.getBoundingClientRect();
          let px = ((ev.clientX - rect.left) / rect.width) * 100;
          let py = ((ev.clientY - rect.top) / rect.height) * 100;
          px = clamp(px, 4, 96);
          py = clamp(py, 4, 96);
          tab.positions[charId] = { x: px, y: py };
          el.style.left = px + "%";
          el.style.top = py + "%";
          renderEdgesOnly();
        }
      };
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        if (moved) render();
        else openProfile(charId);
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    });
  }

  function renderEdgesOnly() {
    const tab = activeTab();
    const canvas = document.getElementById("canvas");
    if (!canvas) return;
    canvas.querySelectorAll(".edge-label").forEach(n => n.remove());
    const svg = canvas.querySelector("svg");
    svg.querySelectorAll("path").forEach(n => n.remove());

    tab.relationships.forEach(rel => {
      const p1 = tab.positions[rel.from];
      const p2 = tab.positions[rel.to];
      if (!p1 || !p2) return;
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = -dy / dist, ny = dx / dist;
      const offset = hasReverse(rel, tab.relationships) ? 5 : 0;
      const mx = (p1.x + p2.x) / 2 + nx * offset;
      const my = (p1.y + p2.y) / 2 + ny * offset;
      const trimTo = trimPoint({ x: mx, y: my }, p2, 6);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${p1.x} ${p1.y} Q ${mx} ${my} ${trimTo.x} ${trimTo.y}`);
      path.setAttribute("stroke", "var(--hanko)");
      path.setAttribute("stroke-width", "0.6");
      path.setAttribute("fill", "none");
      path.setAttribute("opacity", "0.75");
      path.setAttribute("marker-end", "url(#arrow)");
      svg.appendChild(path);

      const label = document.createElement("div");
      label.className = "edge-label";
      label.textContent = rel.label || "（無題）";
      label.style.left = mx + "%";
      label.style.top = my + "%";
      label.onclick = () => { editingRelId = rel.id; render(); };
      canvas.appendChild(label);
    });
  }

  function openProfile(charId) { openProfileId = charId; render(); }

  function renderProfileModal(charId) {
    const tab = activeTab();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.onclick = e => { if (e.target === overlay) { openProfileId = null; render(); } };

    const related = tab.relationships.filter(r => r.from === charId || r.to === charId);
    const c = characters.find(x => x.id === charId) || {};
    const card = document.createElement("div");
    card.className = "modal-card";
    let statsHtml = `
      <div class="m-row"><span>刀種</span><span>${c.swordType || "ー(未入力)"}</span></div>
      <div class="m-row"><span>顕現した年月日</span><span>${c.activationDate || "ー(未入力)"}</span></div>
      <div class="m-row"><span>配属部隊</span><span>${c.unit || "ー(未入力)"}${c.isCaptain ? "（隊長）" : ""}</span></div>
    `;
    let rowsHtml = related.map(r => {
      const other = r.from === charId ? r.to : r.from;
      const dir = r.from === charId ? "→" : "←";
      return `<div class="m-row"><span>${dir} ${nameOf(other)}</span><span>${r.label || "（無題）"}</span></div>`;
    }).join("") || `<div class="m-row"><span>関係</span><span>まだなし</span></div>`;

    card.innerHTML = `
      <div class="m-eyebrow">刀剣男士 詳細ページ(仮)</div>
      <h2>${nameOf(charId)}</h2>
      ${statsHtml}
      ${rowsHtml}
    `;
    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.textContent = "閉じる";
    closeBtn.onclick = () => { openProfileId = null; render(); };
    card.appendChild(closeBtn);

    overlay.appendChild(card);
    return overlay;
  }

  function renderEditRelModal(relId) {
    const tab = activeTab();
    const rel = tab.relationships.find(r => r.id === relId);
    if (!rel) return document.createElement("div");

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.onclick = e => { if (e.target === overlay) { editingRelId = null; render(); } };

    const card = document.createElement("div");
    card.className = "modal-card";

    const eyebrow = document.createElement("div");
    eyebrow.className = "m-eyebrow";
    eyebrow.textContent = `${nameOf(rel.from)} → ${nameOf(rel.to)}`;
    card.appendChild(eyebrow);

    const labelLabel = document.createElement("div");
    labelLabel.className = "m-field-label";
    labelLabel.textContent = "関係ラベル";
    card.appendChild(labelLabel);
    const labelInput = document.createElement("input");
    labelInput.className = "m-input";
    labelInput.value = rel.label;
    labelInput.placeholder = "例：友達、マブダチ、気になる";
    labelInput.oninput = e => { rel.label = e.target.value; };
    card.appendChild(labelInput);

    const epLabel = document.createElement("div");
    epLabel.className = "m-field-label";
    epLabel.textContent = "エピソード";
    card.appendChild(epLabel);

    rel.episodes.forEach(ep => {
      const row = document.createElement("div");
      row.className = "episode-item";
      const input = document.createElement("input");
      input.value = ep.text;
      input.placeholder = "エピソードを入力";
      input.oninput = e => { ep.text = e.target.value; };
      const del = document.createElement("button");
      del.className = "episode-del";
      del.textContent = "\u00d7";
      del.onclick = () => { rel.episodes = rel.episodes.filter(x => x.id !== ep.id); render(); };
      row.appendChild(input);
      row.appendChild(del);
      card.appendChild(row);
    });

    const addEp = document.createElement("button");
    addEp.className = "episode-add";
    addEp.textContent = "＋ エピソードを追加";
    addEp.onclick = () => { rel.episodes.push({ id: "e" + Date.now(), text: "" }); render(); };
    card.appendChild(addEp);

    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.textContent = "閉じる";
    closeBtn.onclick = () => { editingRelId = null; render(); };
    card.appendChild(closeBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "modal-danger";
    delBtn.textContent = "この関係を削除";
    delBtn.onclick = () => {
      tab.relationships = tab.relationships.filter(r => r.id !== rel.id);
      editingRelId = null;
      render();
    };
    card.appendChild(delBtn);

    overlay.appendChild(card);
    return overlay;
  }

  function renderAddRelModal() {
    const tab = activeTab();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.onclick = e => { if (e.target === overlay) { addRelOpen = false; render(); } };

    const card = document.createElement("div");
    card.className = "modal-card";

    const eyebrow = document.createElement("div");
    eyebrow.className = "m-eyebrow";
    eyebrow.textContent = "新しい関係";
    card.appendChild(eyebrow);

    const fromLabel = document.createElement("div");
    fromLabel.className = "m-field-label";
    fromLabel.textContent = "誰から見た関係か(from)";
    card.appendChild(fromLabel);
    const fromSelect = document.createElement("select");
    fromSelect.className = "m-select";
    tab.placedIds.forEach(id => {
      const o = document.createElement("option");
      o.value = id; o.textContent = nameOf(id);
      if (id === addRelDraft.from) o.selected = true;
      fromSelect.appendChild(o);
    });
    fromSelect.onchange = e => { addRelDraft.from = e.target.value; };
    card.appendChild(fromSelect);

    const toLabel = document.createElement("div");
    toLabel.className = "m-field-label";
    toLabel.textContent = "相手(to)";
    card.appendChild(toLabel);
    const toSelect = document.createElement("select");
    toSelect.className = "m-select";
    tab.placedIds.forEach(id => {
      const o = document.createElement("option");
      o.value = id; o.textContent = nameOf(id);
      if (id === addRelDraft.to) o.selected = true;
      toSelect.appendChild(o);
    });
    toSelect.onchange = e => { addRelDraft.to = e.target.value; };
    card.appendChild(toSelect);

    const labelLabel = document.createElement("div");
    labelLabel.className = "m-field-label";
    labelLabel.textContent = "関係ラベル";
    card.appendChild(labelLabel);
    const labelInput = document.createElement("input");
    labelInput.className = "m-input";
    labelInput.placeholder = "例：友達";
    labelInput.value = addRelDraft.label;
    labelInput.oninput = e => { addRelDraft.label = e.target.value; };
    card.appendChild(labelInput);

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "modal-close";
    confirmBtn.textContent = "この内容で追加";
    confirmBtn.onclick = () => {
      if (addRelDraft.from === addRelDraft.to) return;
      const finalLabel = addRelDraft.label.trim() || "（無題）";
      tab.relationships.push({
        id: "rel" + Date.now(),
        from: addRelDraft.from,
        to: addRelDraft.to,
        label: finalLabel,
        episodes: []
      });
      notify(`${nameOf(addRelDraft.from)} → ${nameOf(addRelDraft.to)}「${finalLabel}」を追加`);
      addRelOpen = false;
      render();
    };
    card.appendChild(confirmBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "modal-cancel";
    cancelBtn.textContent = "キャンセル";
    cancelBtn.onclick = () => { addRelOpen = false; render(); };
    card.appendChild(cancelBtn);

    overlay.appendChild(card);
    return overlay;
  }

  function renderAddCharModal() {
    const tab = activeTab();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.onclick = e => { if (e.target === overlay) { addCharOpen = false; render(); } };

    const card = document.createElement("div");
    card.className = "modal-card";

    const eyebrow = document.createElement("div");
    eyebrow.className = "m-eyebrow";
    eyebrow.textContent = "刀剣男士を追加";
    card.appendChild(eyebrow);

    const shapeLabel = document.createElement("div");
    shapeLabel.className = "m-field-label";
    shapeLabel.textContent = "配置の形";
    card.appendChild(shapeLabel);

    const shapeRow = document.createElement("div");
    shapeRow.className = "shape-picker";
    Object.keys(SHAPE_META).forEach(key => {
      const btn = document.createElement("button");
      btn.className = "shape-btn" + (addCharDraft.shape === key ? " active" : "");
      btn.textContent = SHAPE_META[key].label;
      btn.onclick = () => {
        addCharDraft.shape = key;
        const meta = SHAPE_META[key];
        if (addCharDraft.selected.length > meta.max) {
          addCharDraft.selected = addCharDraft.selected.slice(0, meta.max);
        }
        render();
      };
      shapeRow.appendChild(btn);
    });
    card.appendChild(shapeRow);

    const meta = SHAPE_META[addCharDraft.shape];
    const countLabel = document.createElement("div");
    countLabel.className = "select-count";
    countLabel.textContent = meta.min === meta.max
      ? `${addCharDraft.selected.length} / ${meta.min}人 選択中`
      : `${addCharDraft.selected.length}人 選択中（${meta.min}〜${meta.max}人）`;
    card.appendChild(countLabel);

    const listLabel = document.createElement("div");
    listLabel.className = "m-field-label";
    listLabel.textContent = "配置する刀剣男士";
    card.appendChild(listLabel);

    const list = document.createElement("div");
    list.className = "char-check-list";
    const available = characters.filter(c => !tab.placedIds.includes(c.id));
    if (available.length === 0) {
      const p = document.createElement("div");
      p.className = "char-check-row";
      p.textContent = "追加できる刀剣男士がいません(全員配置済み)";
      list.appendChild(p);
    }
    available.forEach(c => {
      const row = document.createElement("div");
      row.className = "char-check-row";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = addCharDraft.selected.includes(c.id);
      const atMax = addCharDraft.selected.length >= meta.max;
      cb.disabled = !cb.checked && atMax;
      cb.onchange = () => {
        if (cb.checked) {
          if (addCharDraft.shape === "solo") {
            addCharDraft.selected = [c.id];
          } else if (addCharDraft.selected.length < meta.max) {
            addCharDraft.selected.push(c.id);
          }
        } else {
          addCharDraft.selected = addCharDraft.selected.filter(id => id !== c.id);
        }
        render();
      };
      const span = document.createElement("span");
      span.textContent = c.name;
      row.appendChild(cb);
      row.appendChild(span);
      list.appendChild(row);
    });
    card.appendChild(list);

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "modal-close";
    confirmBtn.textContent = "この内容で配置する";
    const valid = addCharDraft.selected.length >= meta.min && addCharDraft.selected.length <= meta.max;
    confirmBtn.disabled = !valid;
    confirmBtn.onclick = () => {
      if (!valid) return;
      const anchor = ANCHORS[tab.groupCount % ANCHORS.length];
      const positions = computeShapePositions(addCharDraft.shape, anchor, addCharDraft.selected);
      Object.assign(tab.positions, positions);
      tab.placedIds.push(...addCharDraft.selected);
      tab.groupCount += 1;
      const names = addCharDraft.selected.map(nameOf).join("・");
      notify(`「${tab.name}」に${SHAPE_META[addCharDraft.shape].label}で${names}を配置`);
      addCharOpen = false;
      render();
    };
    card.appendChild(confirmBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "modal-cancel";
    cancelBtn.textContent = "キャンセル";
    cancelBtn.onclick = () => { addCharOpen = false; render(); };
    card.appendChild(cancelBtn);

    overlay.appendChild(card);
    return overlay;
  }

  function renderTabManageModal() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.onclick = e => { if (e.target === overlay) { tabManageOpen = false; render(); } };

    const card = document.createElement("div");
    card.className = "modal-card";

    const eyebrow = document.createElement("div");
    eyebrow.className = "m-eyebrow";
    eyebrow.textContent = "タブを管理";
    card.appendChild(eyebrow);

    tabs.forEach(t => {
      const row = document.createElement("div");
      row.className = "tab-row";

      const input = document.createElement("input");
      input.value = t.name;
      input.oninput = e => { t.name = e.target.value; };
      row.appendChild(input);

      const dup = document.createElement("button");
      dup.className = "tab-dup";
      dup.textContent = "複製";
      dup.onclick = () => {
        const copy = JSON.parse(JSON.stringify(t));
        copy.id = "t" + Date.now() + Math.random().toString(16).slice(2);
        copy.name = t.name + "のコピー";
        const idx = tabs.indexOf(t);
        tabs.splice(idx + 1, 0, copy);
        notify(`タブ「${t.name}」を複製`);
        render();
      };
      row.appendChild(dup);

      if (tabs.length > 1) {
        const del = document.createElement("button");
        del.className = "tab-del";
        del.textContent = "削除";
        del.onclick = () => {
          tabs = tabs.filter(x => x.id !== t.id);
          if (activeTabId === t.id) activeTabId = tabs[0].id;
          notify(`タブ「${t.name}」を削除`);
          render();
        };
        row.appendChild(del);
      }

      card.appendChild(row);
    });

    const addTabBtn = document.createElement("button");
    addTabBtn.className = "modal-close";
    addTabBtn.textContent = "＋ 新しいタブを追加";
    addTabBtn.onclick = () => {
      const newTab = makeTab("新しいタブ");
      tabs.push(newTab);
      activeTabId = newTab.id;
      render();
    };
    card.appendChild(addTabBtn);

    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-cancel";
    closeBtn.textContent = "閉じる";
    closeBtn.onclick = () => { tabManageOpen = false; render(); };
    card.appendChild(closeBtn);

    overlay.appendChild(card);
    return overlay;
  }

  render();
})();

