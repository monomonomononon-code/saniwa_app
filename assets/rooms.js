(function(){
  const CHAR_NAMES = [
    "山姥切国広","歌仙兼定","加州清光","陸奥守吉行","蜂須賀虎徹",
    "堀川国広","薬研藤四郎","髭切","膝丸","一期一振"
  ];

  let characters = CHAR_NAMES.map((n, i) => ({ id: "c" + i, name: n }));

  // 部屋タイプ定義。3D俯瞰図(honmaru3d.html)の TEMPLATE_META とキーを揃えること。
  // floor: 汎用SVG床の描き方 / fill: 床色 / line: 目地色 / accent: 敷物などの差し色
  const TEMPLATE_META = {
    a:       { label: "六畳",       size: 1, aspectClass: "" },
    b:       { label: "広間",       size: 2, aspectClass: "aspect-wide" },
    c:       { label: "洋間",       size: 1, aspectClass: "" },
    living:  { label: "居間",       size: 1, aspectClass: "", floor: "tatami", fill: "#A7A97C", line: "#6E7452", accent: "#7C4A2D" },
    kitchen: { label: "厨",         size: 1, aspectClass: "", floor: "earth",  fill: "#8C8270", line: "#5E564B", accent: "#4F3020" },
    toilet:  { label: "厠",         size: 1, aspectClass: "aspect-small", floor: "plank", fill: "#B9B09A", line: "#8C8270" },
    forge:   { label: "鍛刀部屋",   size: 1, aspectClass: "", floor: "earth",  fill: "#6F6258", line: "#4A423B", accent: "#A8382C" },
    large:   { label: "大型の部屋", size: 2, aspectClass: "aspect-big", floor: "tatami", fill: "#95A077", line: "#59653F" }
  };
  const TEMPLATE_KEYS = Object.keys(TEMPLATE_META);
  function templateOptionsHtml() {
    return TEMPLATE_KEYS.map(key => `<option value="${key}">${TEMPLATE_META[key].label}</option>`).join("");
  }

  const state = {
    unplaced: characters.map(c => ({ id: c.id, name: c.name })),
    rooms: [
      { id: "r0", name: "東の間", template: "a", note: "", occupants: [] },
      { id: "r1", name: "西の間", template: "a", note: "", occupants: [] }
    ]
  };


  // 同じ刀剣男士(charId)が、配置待ちと部屋、または複数の部屋に同時に載っている場合の保険。
  // 通常のドラッグ操作では起こらないが、過去のバージョンの同期処理の不具合で
  // 既に重複したデータを持っているユーザーがいる可能性があるため、読み込み時に必ず正規化する。
  // 優先順位: 先に登場した部屋の occupants > 後の部屋 > 配置待ち(unplaced は最後に扱う)。
  function normalizeLoadedState(raw) {
    const rooms = Array.isArray(raw.rooms) ? raw.rooms.map(r => ({
      id: r && r.id, name: r && r.name, template: r && r.template, note: (r && r.note) || "",
      occupants: Array.isArray(r && r.occupants) ? r.occupants.slice() : []
    })).filter(r => r.id) : [];
    const unplaced = Array.isArray(raw.unplaced) ? raw.unplaced.slice() : [];
    const seen = new Set();
    let duplicateFound = false;
    rooms.forEach(room => {
      room.occupants = room.occupants.filter(o => {
        if (!o || !o.charId || seen.has(o.charId)) { if (o && o.charId) duplicateFound = true; return false; }
        seen.add(o.charId);
        return true;
      });
    });
    const normalizedUnplaced = unplaced.filter(c => {
      if (!c || !c.id || seen.has(c.id)) { if (c && c.id) duplicateFound = true; return false; }
      seen.add(c.id);
      return true;
    });
    return { rooms, unplaced: normalizedUnplaced, duplicateFound };
  }

  const ROOM_STORAGE_KEY = "saniwa-tool.rooms.v1";
  try {
    const saved = JSON.parse(localStorage.getItem(ROOM_STORAGE_KEY));
    if (saved && Array.isArray(saved.unplaced) && Array.isArray(saved.rooms)) {
      const normalized = normalizeLoadedState(saved);
      state.unplaced = normalized.unplaced;
      state.rooms = normalized.rooms;
      // 重複が見つかった場合は、その場でクリーンな状態を保存し直す(表示上だけの補正で終わらせない)。
      if (normalized.duplicateFound) {
        try { localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
      }
    }
  } catch (e) {}
  function saveState() {
    try { localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function syncRooms() {
    try {
      window.parent && window.parent.postMessage({
        source: "rooms",
        type: "rooms_sync",
        rooms: JSON.parse(JSON.stringify(state.rooms)),
        unplaced: JSON.parse(JSON.stringify(state.unplaced))
      }, "*");
    } catch (e) {}
  }
  window.readSaniwaReference = () => JSON.parse(JSON.stringify(state));
  window.addEventListener("pagehide", saveState);
  function findChar(id) {
    if (state.unplaced.find(c => c.id === id)) return state.unplaced.find(c => c.id === id);
    for (const r of state.rooms) {
      const o = r.occupants.find(o => o.charId === id);
      if (o) return { id: o.charId, name: nameOf(o.charId) };
    }
    return null;
  }
  function nameOf(charId) {
    const c = characters.find(c => c.id === charId);
    return c ? c.name : "?";
  }
  function removeFromEverywhere(charId) {
    state.unplaced = state.unplaced.filter(c => c.id !== charId);
    state.rooms.forEach(r => { r.occupants = r.occupants.filter(o => o.charId !== charId); });
  }

  const TATAMI_SVG = {
    a: `<svg viewBox="0 0 400 300" preserveAspectRatio="none">
      <rect width="400" height="300" fill="#9AA179"/>
      <g stroke="#6E7452" stroke-width="2" fill="none" opacity="0.55">
        <rect x="4" y="4" width="192" height="142"/>
        <rect x="204" y="4" width="192" height="142"/>
        <rect x="4" y="154" width="192" height="142"/>
        <rect x="204" y="154" width="192" height="142"/>
      </g>
      <g stroke="#6E7452" stroke-width="1" opacity="0.35">
        <line x1="4" y1="40" x2="196" y2="40"/><line x1="4" y1="75" x2="196" y2="75"/><line x1="4" y1="110" x2="196" y2="110"/>
        <line x1="204" y1="40" x2="396" y2="40"/><line x1="204" y1="75" x2="396" y2="75"/><line x1="204" y1="110" x2="396" y2="110"/>
        <line x1="4" y1="190" x2="196" y2="190"/><line x1="4" y1="225" x2="196" y2="225"/><line x1="4" y1="260" x2="196" y2="260"/>
        <line x1="204" y1="190" x2="396" y2="190"/><line x1="204" y1="225" x2="396" y2="225"/><line x1="204" y1="260" x2="396" y2="260"/>
      </g>
      <rect x="0" y="0" width="400" height="10" fill="#5C3722" opacity="0.5"/>
      <rect x="0" y="0" width="10" height="300" fill="#5C3722" opacity="0.3"/>
      <rect x="150" y="0" width="55" height="10" fill="#D9CBA3" opacity="0.9"/>
    </svg>`,
    b: `<svg viewBox="0 0 400 300" preserveAspectRatio="none">
      <rect width="400" height="300" fill="#8E9A6E"/>
      <g stroke="#6E7452" stroke-width="2" fill="none" opacity="0.55">
        <rect x="4" y="4" width="130" height="292"/>
        <rect x="138" y="4" width="130" height="292"/>
        <rect x="272" y="4" width="124" height="292"/>
      </g>
      <g stroke="#6E7452" stroke-width="1" opacity="0.35">
        <line x1="4" y1="100" x2="134" y2="100"/><line x1="4" y1="200" x2="134" y2="200"/>
        <line x1="138" y1="100" x2="268" y2="100"/><line x1="138" y1="200" x2="268" y2="200"/>
        <line x1="272" y1="100" x2="396" y2="100"/><line x1="272" y1="200" x2="396" y2="200"/>
      </g>
      <rect x="0" y="0" width="400" height="10" fill="#5C3722" opacity="0.5"/>
      <rect x="390" y="0" width="10" height="300" fill="#5C3722" opacity="0.3"/>
      <rect x="0" y="120" width="10" height="60" fill="#D9CBA3" opacity="0.9"/>
    </svg>`,
    c: `<svg viewBox="0 0 400 300" preserveAspectRatio="none">
      <rect width="400" height="300" fill="#BE955F"/>
      <g stroke="#8C6239" stroke-width="1" opacity="0.45">
        <line x1="50" y1="0" x2="50" y2="300"/>
        <line x1="100" y1="0" x2="100" y2="300"/>
        <line x1="150" y1="0" x2="150" y2="300"/>
        <line x1="200" y1="0" x2="200" y2="300"/>
        <line x1="250" y1="0" x2="250" y2="300"/>
        <line x1="300" y1="0" x2="300" y2="300"/>
        <line x1="350" y1="0" x2="350" y2="300"/>
      </g>
      <rect x="110" y="80" width="180" height="120" rx="6" fill="#7C4A2D" opacity="0.28"/>
      <rect x="0" y="0" width="400" height="10" fill="#5C3722" opacity="0.5"/>
      <rect x="150" y="0" width="60" height="10" fill="#E8DFC9" opacity="0.9"/>
    </svg>`
  };

  // 個別SVGを持たない部屋タイプ向けの汎用床。見た目の作り込みは後から TATAMI_SVG に追加すれば差し替わる。
  function makeGenericFloorSvg(meta) {
    const fill = meta.fill || "#9AA179";
    const line = meta.line || "#6E7452";
    let body = "";
    if (meta.floor === "tatami") {
      body = `<g stroke="${line}" stroke-width="2" fill="none" opacity="0.55">
        <rect x="4" y="4" width="192" height="142"/><rect x="204" y="4" width="192" height="142"/>
        <rect x="4" y="154" width="192" height="142"/><rect x="204" y="154" width="192" height="142"/></g>`;
      if (meta.accent) body += `<rect x="150" y="110" width="100" height="80" rx="8" fill="${meta.accent}" opacity="0.35"/>`;
    } else if (meta.floor === "earth") {
      body = `<g fill="${line}" opacity="0.25">
        <circle cx="60" cy="70" r="6"/><circle cx="330" cy="120" r="5"/><circle cx="200" cy="230" r="7"/><circle cx="110" cy="200" r="4"/><circle cx="300" cy="250" r="5"/></g>`;
      if (meta.accent) body += `<rect x="150" y="100" width="100" height="100" rx="6" fill="${meta.accent}" opacity="0.5"/>`;
    } else {
      body = `<g stroke="${line}" stroke-width="1" opacity="0.45">` +
        [50, 100, 150, 200, 250, 300, 350].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="300"/>`).join("") + `</g>`;
    }
    return `<svg viewBox="0 0 400 300" preserveAspectRatio="none">
      <rect width="400" height="300" fill="${fill}"/>${body}
      <rect x="0" y="0" width="400" height="10" fill="#5C3722" opacity="0.5"/>
      <rect x="0" y="0" width="10" height="300" fill="#5C3722" opacity="0.3"/>
      <rect x="150" y="0" width="55" height="10" fill="#D9CBA3" opacity="0.9"/>
    </svg>`;
  }
  function floorSvgOf(template) {
    if (TATAMI_SVG[template]) return TATAMI_SVG[template];
    const meta = TEMPLATE_META[template];
    return meta ? makeGenericFloorSvg(meta) : TATAMI_SVG.a;
  }

  let dragging = null; // { charId, ghostEl }
  let openProfileId = null;
  let addRoomOpen = false;
  let addRoomDraft = { template: "a", name: "", note: "" };

  function notify(text) {
    saveState();
    try {
      window.parent && window.parent.postMessage({ source: "rooms", text: text }, "*");
    } catch (e) { /* 単体表示の場合は何もしない */ }
  }

  // 3D俯瞰図(建築エディタ)からの部屋追加。部屋データの正本はこのページなので、ここで追加して同期し直す。
  function addRoomFromTemplate(template, name, note) {
    const meta = TEMPLATE_META[template] || TEMPLATE_META.a;
    const key = TEMPLATE_META[template] ? template : "a";
    const finalName = (name || "").trim() || meta.label;
    const room = { id: "r" + Date.now() + Math.random().toString(16).slice(2, 6), name: finalName, template: key, note: (note || "").trim(), occupants: [] };
    state.rooms.unshift(room); // 新規部屋は一覧の先頭へ(配置待ちトレイに近く、ドラッグ距離が短くなる)
    notify(`部屋「${finalName}」(${meta.label})を追加`);
    render();
    return room;
  }

  window.addEventListener("message", e => {
    const data = e.data;
    if (!data) return;
    if (data.type === "room_add" && data.template) { addRoomFromTemplate(data.template, data.name, data.note); return; }
    if (data.type !== "characters_sync" || !Array.isArray(data.characters)) return;
    data.characters.forEach(sc => {
      let c = characters.find(x => x.id === sc.id);
      if (!c) {
        c = { id: sc.id, name: sc.name };
        characters.push(c);
        // このページの再読み込み後は characters がハードコードの初期10振りだけに戻るため、
        // 追加済みの刀剣男士は毎回「未登場」として検出される。だが state(配置待ち・部屋)は
        // localStorageから復元済みなので、既にどこかに配置されている場合はここで
        // unplaced へ二重に追加しない(でないと部屋の中とトレイの両方に表示されてしまう)。
        const alreadyPlaced = state.unplaced.some(u => u.id === sc.id) ||
          state.rooms.some(r => r.occupants.some(o => o.charId === sc.id));
        if (!alreadyPlaced) state.unplaced.push({ id: sc.id, name: sc.name });
      }
      c.name = sc.name;
      c.swordType = sc.swordType || "";
      c.activationDate = sc.activationDate || "";
      c.unit = sc.unit || "";
      c.isCaptain = !!sc.isCaptain;
    });
    render();
  });
  try { window.parent && window.parent.postMessage({ source: "rooms", type: "ready" }, "*"); } catch (e) {}

  function root() { return document.getElementById("app"); }

  function render() {
    const el = root();
    el.innerHTML = "";

    const header = document.createElement("div");
    header.className = "header";
    header.innerHTML = `
      <h1><span class="seal">丸</span>本丸 見取り図</h1>
      <p>タグを長押し＆ドラッグして部屋に配置。部屋の中で位置も自由に動かせます。</p>
    `;
    el.appendChild(header);

    const tray = document.createElement("div");
    tray.className = "tray";
    tray.innerHTML = `<div class="tray-label"><span>配置待ちの刀剣男士</span><span>${state.unplaced.length}振り</span></div>`;
    const trayChips = document.createElement("div");
    trayChips.className = "tray-chips";
    trayChips.dataset.dropzone = "unplaced";
    if (state.unplaced.length === 0) {
      trayChips.innerHTML = `<div class="tray-empty">全員どこかの部屋にいます</div>`;
    } else {
      state.unplaced.forEach(c => {
        const chip = document.createElement("div");
        const full = characters.find(x => x.id === c.id);
        chip.className = "chip" + (full && full.isCaptain ? " captain" : "");
        chip.textContent = c.name;
        chip.dataset.charId = c.id;
        attachDrag(chip, c.id);
        trayChips.appendChild(chip);
      });
    }
    tray.appendChild(trayChips);
    el.appendChild(tray);

    // 「＋部屋を追加」は配置待ちトレイのすぐ下、部屋一覧の上に置く(部屋を増やしてすぐ
    // 上のトレイからドラッグしやすいように)。
    const addRow = document.createElement("div");
    addRow.className = "add-room-row";

    const addBtn = document.createElement("button");
    addBtn.className = "add-room-btn wide";
    addBtn.textContent = "＋ 部屋を追加";
    addBtn.onclick = () => {
      addRoomDraft = { template: "a", name: "", note: "" };
      addRoomOpen = true;
      render();
    };
    addRow.appendChild(addBtn);
    el.appendChild(addRow);

    const grid = document.createElement("div");
    grid.className = "rooms-grid";
    state.rooms.forEach(room => grid.appendChild(renderRoom(room)));
    el.appendChild(grid);

    if (openProfileId) {
      el.appendChild(renderProfileModal(openProfileId));
    }
    if (addRoomOpen) {
      el.appendChild(renderAddRoomModal());
    }
    syncRooms();
  }

  function renderAddRoomModal() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.onclick = e => { if (e.target === overlay) { addRoomOpen = false; render(); } };

    const card = document.createElement("div");
    card.className = "modal-card";

    const eyebrow = document.createElement("div");
    eyebrow.className = "m-eyebrow";
    eyebrow.textContent = "新しい部屋";
    card.appendChild(eyebrow);

    const typeRow = document.createElement("div");
    typeRow.className = "type-picker";
    TEMPLATE_KEYS.forEach(val => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "type-btn" + (addRoomDraft.template === val ? " active" : "");
      btn.textContent = TEMPLATE_META[val].label;
      btn.onclick = () => { addRoomDraft.template = val; render(); };
      typeRow.appendChild(btn);
    });
    card.appendChild(typeRow);

    const nameLabel = document.createElement("div");
    nameLabel.className = "m-field-label";
    nameLabel.textContent = "部屋名";
    card.appendChild(nameLabel);
    const nameInput = document.createElement("input");
    nameInput.className = "m-input";
    nameInput.placeholder = "例：東の間";
    nameInput.value = addRoomDraft.name;
    nameInput.oninput = e => { addRoomDraft.name = e.target.value; };
    card.appendChild(nameInput);

    const noteLabel = document.createElement("div");
    noteLabel.className = "m-field-label";
    noteLabel.textContent = "備考";
    card.appendChild(noteLabel);
    const noteInput = document.createElement("input");
    noteInput.className = "m-input";
    noteInput.placeholder = "例：日当たりがいい";
    noteInput.value = addRoomDraft.note;
    noteInput.oninput = e => { addRoomDraft.note = e.target.value; };
    card.appendChild(noteInput);

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "modal-close";
    confirmBtn.textContent = "この内容で追加";
    confirmBtn.onclick = () => {
      const meta = TEMPLATE_META[addRoomDraft.template];
      const finalName = addRoomDraft.name.trim() || meta.label;
      state.rooms.unshift({ // 新規部屋は一覧の先頭へ(配置待ちトレイに近く、ドラッグ距離が短くなる)
        id: "r" + Date.now(),
        name: finalName,
        template: addRoomDraft.template,
        note: addRoomDraft.note.trim(),
        occupants: []
      });
      notify(`部屋「${finalName}」(${meta.label})を追加`);
      addRoomOpen = false;
      render();
    };
    card.appendChild(confirmBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "modal-cancel";
    cancelBtn.textContent = "キャンセル";
    cancelBtn.onclick = () => { addRoomOpen = false; render(); };
    card.appendChild(cancelBtn);

    overlay.appendChild(card);
    return overlay;
  }

  function renderProfileModal(charId) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.onclick = e => { if (e.target === overlay) closeProfile(); };

    const loc = locationOf(charId);
    const c = characters.find(x => x.id === charId) || {};
    const card = document.createElement("div");
    card.className = "modal-card";
    card.innerHTML = `
      <div class="m-eyebrow">刀剣男士 詳細ページ(仮)</div>
      <h2>${nameOf(charId)}</h2>
      <div class="m-row"><span>現在の配属</span><span>${loc}</span></div>
      <div class="m-row"><span>刀種</span><span>${c.swordType || "ー(未入力)"}</span></div>
      <div class="m-row"><span>顕現した年月日</span><span>${c.activationDate || "ー(未入力)"}</span></div>
      <div class="m-row"><span>配属部隊</span><span>${c.unit || "ー(未入力)"}${c.isCaptain ? "（隊長）" : ""}</span></div>
      <div class="m-note">刀剣男士ページで編集した内容がここに反映されます。</div>
    `;
    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.textContent = "閉じる";
    closeBtn.onclick = closeProfile;
    card.appendChild(closeBtn);

    overlay.appendChild(card);
    return overlay;
  }

  function locationOf(charId) {
    if (state.unplaced.find(c => c.id === charId)) return "配置待ち";
    for (const r of state.rooms) {
      if (r.occupants.find(o => o.charId === charId)) return r.name;
    }
    return "不明";
  }

  function openProfile(charId) {
    openProfileId = charId;
    render();
  }
  function closeProfile() {
    openProfileId = null;
    render();
  }

  function renderRoom(room) {
    const meta = TEMPLATE_META[room.template] || TEMPLATE_META.a;
    const card = document.createElement("div");
    card.className = "room-card" + (meta.size === 2 ? " size-large" : "");

    const head = document.createElement("div");
    head.className = "room-head";
    const nameInput = document.createElement("input");
    nameInput.className = "room-name-input";
    nameInput.value = room.name;
    nameInput.oninput = e => { room.name = e.target.value; syncRooms(); };
    const tplSelect = document.createElement("select");
    tplSelect.className = "room-template-select";
    tplSelect.innerHTML = templateOptionsHtml();
    tplSelect.value = TEMPLATE_META[room.template] ? room.template : "a";
    tplSelect.onchange = e => { room.template = e.target.value; render(); };
    head.appendChild(nameInput);
    head.appendChild(tplSelect);
    card.appendChild(head);

    const noteInput = document.createElement("input");
    noteInput.className = "room-note-input";
    noteInput.placeholder = "備考(日当たりがいい、など)";
    noteInput.value = room.note || "";
    noteInput.oninput = e => { room.note = e.target.value; syncRooms(); };
    card.appendChild(noteInput);

    const surface = document.createElement("div");
    surface.className = "room-surface" + (meta.aspectClass ? " " + meta.aspectClass : "");
    surface.dataset.dropzone = "room";
    surface.dataset.roomId = room.id;
    surface.innerHTML = floorSvgOf(room.template);

    room.occupants.forEach(o => {
      const tag = document.createElement("div");
      const full = characters.find(x => x.id === o.charId);
      tag.className = "room-tag" + (full && full.isCaptain ? " captain" : "");
      tag.textContent = nameOf(o.charId);
      tag.style.left = o.x + "%";
      tag.style.top = o.y + "%";
      tag.dataset.charId = o.charId;
      attachDrag(tag, o.charId);
      surface.appendChild(tag);
    });

    if (room.occupants.length === 0) {
      const hint = document.createElement("div");
      hint.className = "room-hint";
      hint.textContent = "ここにタグをドロップ";
      surface.appendChild(hint);
    }

    card.appendChild(surface);
    return card;
  }

  function attachDrag(el, charId) {
    el.addEventListener("pointerdown", e => {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const THRESHOLD = 9; // これ未満の移動ならタップ扱い
      let moved = false;
      let ghost = null;

      const move = ev => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!moved && Math.hypot(dx, dy) > THRESHOLD) {
          moved = true;
          ghost = document.createElement("div");
          ghost.className = "ghost-chip";
          ghost.textContent = nameOf(charId);
          document.body.appendChild(ghost);
        }
        if (moved) {
          positionGhost(ghost, ev.clientX, ev.clientY);
          highlightDropzone(ev.clientX, ev.clientY);
        }
      };
      const up = ev => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", cancel);
        if (moved) {
          clearHighlights();
          handleDrop(ev.clientX, ev.clientY, charId);
          ghost.remove();
          dragging = null;
        } else {
          // 動かずに離した = タップ = 詳細ページへ
          openProfile(charId);
        }
      };
      // ブラウザ側のジェスチャー(スクロール等)でドラッグが中断されると pointerup が来ず
      // pointercancel だけが来ることがある。ここで確実に後始末しないと、document に
      // 貼りっぱなしの move/up リスナーが残り、後の無関係な操作で誤発火して
      // 別の刀剣男士が意図しない場所へ移動する原因になる。
      const cancel = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", cancel);
        clearHighlights();
        if (ghost) ghost.remove();
        dragging = null;
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", cancel);
    });
  }

  function positionGhost(ghost, x, y) {
    ghost.style.left = (x - 20) + "px";
    ghost.style.top = (y - 14) + "px";
  }

  function highlightDropzone(x, y) {
    clearHighlights();
    const target = document.elementFromPoint(x, y);
    const zone = target && target.closest && target.closest('[data-dropzone="room"]');
    if (zone) zone.classList.add("dragover");
  }
  function clearHighlights() {
    document.querySelectorAll(".room-surface.dragover").forEach(n => n.classList.remove("dragover"));
  }

  function handleDrop(x, y, charId) {
    const target = document.elementFromPoint(x, y);
    if (!target) return;
    const roomZone = target.closest && target.closest('[data-dropzone="room"]');
    const trayZone = target.closest && target.closest('[data-dropzone="unplaced"]');

    const prevRoom = state.rooms.find(r => r.occupants.some(o => o.charId === charId));
    const wasUnplaced = state.unplaced.some(c => c.id === charId);

    if (roomZone) {
      const roomId = roomZone.dataset.roomId;
      const room = state.rooms.find(r => r.id === roomId);
      const rect = roomZone.getBoundingClientRect();
      let px = ((x - rect.left) / rect.width) * 100;
      let py = ((y - rect.top) / rect.height) * 100;
      px = Math.max(6, Math.min(94, px));
      py = Math.max(8, Math.min(92, py));
      removeFromEverywhere(charId);
      room.occupants.push({ charId, x: px, y: py });
      if (!prevRoom || prevRoom.id !== room.id) {
        notify(`${nameOf(charId)}を「${room.name}」に配置`);
      }
      render();
    } else if (trayZone) {
      removeFromEverywhere(charId);
      state.unplaced.push({ id: charId, name: nameOf(charId) });
      if (!wasUnplaced) {
        notify(`${nameOf(charId)}を配置待ちに戻した`);
      }
      render();
    }
    // ドロップ先が無効な場所なら何もしない(元の位置のまま)
  }

  render();
})();

