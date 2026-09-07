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

  // ---- 部屋の配置(見取り図の何段目・何列目か)は array の並び順ではなく、
  // 各部屋が持つ明示的な slot 番号で決める(0,1が1段目、2,3が2段目…)。
  // こうすることで「この2部屋だけ入れ替える/この空きマスへ移す」がその部屋以外に
  // 一切影響しない(並び替えのために間の部屋を詰め直す、という副作用が起きない)。
  const GRID_COLS = 2;
  function roomSpan(room) {
    const meta = TEMPLATE_META[room.template] || TEMPLATE_META.a;
    return meta.size === 2 ? 2 : 1;
  }
  function occupiedSlots(rooms, excludeId) {
    const set = new Set();
    rooms.forEach(r => {
      if (r.id === excludeId) return;
      set.add(r.slot);
      if (roomSpan(r) === 2) set.add(r.slot + 1);
    });
    return set;
  }
  // 空いているslotのうち一番手前を返す(2列部屋は必ず列0から始まる偶数slotのみ)
  function nextAvailableSlot(rooms, span, excludeId) {
    const used = occupiedSlots(rooms, excludeId);
    let slot = 0;
    while (true) {
      if (span === 2 && slot % GRID_COLS !== 0) { slot++; continue; }
      const free = span === 2 ? (!used.has(slot) && !used.has(slot + 1)) : !used.has(slot);
      if (free) return slot;
      slot++;
    }
  }
  // 指定のslotに、そのspanの部屋が(他の部屋とぶつからず)そのまま収まるか
  function slotFits(rooms, slot, span, excludeId) {
    if (span === 2 && slot % GRID_COLS !== 0) return false;
    const used = occupiedSlots(rooms, excludeId);
    return span === 2 ? (!used.has(slot) && !used.has(slot + 1)) : !used.has(slot);
  }
  // そのslotを占めている部屋を返す(2列部屋は2つのslotどちらでも見つかる)
  function occupantAt(rooms, slot, excludeId) {
    return rooms.find(r => {
      if (r.id === excludeId) return false;
      return r.slot === slot || (roomSpan(r) === 2 && r.slot + 1 === slot);
    }) || null;
  }
  // 2部屋の位置を入れ替える。大きさが同じならslotをそのまま交換するだけでよいが、
  // 大きさが違う場合は、そのまま交換すると大型の部屋が1マス分の場所にはみ出して
  // しまうため、小さい方を大きい方の元位置へ、大きい方は(小さい方が元いた場所に
  // ちょうど収まるならそこへ、収まらなければ)別の空いている場所へ動かす。
  function swapRoomPositions(a, b) {
    const spanA = roomSpan(a), spanB = roomSpan(b);
    if (spanA === spanB) {
      const tmp = a.slot;
      a.slot = b.slot;
      b.slot = tmp;
    } else {
      const small = spanA < spanB ? a : b;
      const big = spanA < spanB ? b : a;
      const smallOldSlot = small.slot;
      const bigOldSlot = big.slot;
      small.slot = bigOldSlot;
      big.slot = slotFits(state.rooms, smallOldSlot, 2, big.id)
        ? smallOldSlot
        : nextAvailableSlot(state.rooms, 2, big.id);
    }
  }
  // 読み込んだデータにslotが無い(旧バージョンの保存データ)場合は、これまでの
  // 詰め表示と同じ並びになるように、登録順で自動採番する(見た目が変わらない移行措置)。
  function ensureSlots(rooms) {
    const used = new Set();
    rooms.forEach(r => {
      if (typeof r.slot === "number" && Number.isFinite(r.slot)) {
        used.add(r.slot);
        if (roomSpan(r) === 2) used.add(r.slot + 1);
      }
    });
    let cursor = 0;
    rooms.forEach(r => {
      if (typeof r.slot === "number" && Number.isFinite(r.slot)) return;
      const span = roomSpan(r);
      while (true) {
        if (span === 2 && cursor % GRID_COLS !== 0) { cursor++; continue; }
        const free = span === 2 ? (!used.has(cursor) && !used.has(cursor + 1)) : !used.has(cursor);
        if (free) break;
        cursor++;
      }
      r.slot = cursor;
      used.add(cursor);
      if (span === 2) used.add(cursor + 1);
    });
  }

  const state = {
    unplaced: characters.map(c => ({ id: c.id, name: c.name })),
    rooms: [
      { id: "r0", name: "東の間", template: "a", note: "", occupants: [], slot: 0 },
      { id: "r1", name: "西の間", template: "a", note: "", occupants: [], slot: 1 }
    ]
  };


  // 同じ刀剣男士(charId)が、配置待ちと部屋、または複数の部屋に同時に載っている場合の保険。
  // 通常のドラッグ操作では起こらないが、過去のバージョンの同期処理の不具合で
  // 既に重複したデータを持っているユーザーがいる可能性があるため、読み込み時に必ず正規化する。
  // 優先順位: 先に登場した部屋の occupants > 後の部屋 > 配置待ち(unplaced は最後に扱う)。
  function normalizeLoadedState(raw) {
    const rooms = Array.isArray(raw.rooms) ? raw.rooms.map(r => ({
      id: r && r.id, name: r && r.name, template: r && r.template, note: (r && r.note) || "",
      occupants: Array.isArray(r && r.occupants) ? r.occupants.slice() : [],
      slot: (r && typeof r.slot === "number" && Number.isFinite(r.slot)) ? r.slot : undefined
    })).filter(r => r.id) : [];
    ensureSlots(rooms);
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
  // 現在進行中のドラッグ(タグ移動・部屋並び替えのどちらか一方のみ)を指す。
  // 実機では指を離した時の後始末(pointerup)がまれに発火せず、documentに貼った
  // move/upリスナーが残ったままになることがある。pointerIdでの照合は環境によって
  // 信用できない(pointerdown時と後続のmove/upとでidの報告が食い違う端末があり、
  // 単純比較すると自分自身の操作まで無視されてしまう)ため、代わりに「今アクティブな
  // ドラッグはこれ」という参照(オブジェクト)そのものを共有変数に持たせて比較する。
  // さらに、新しいドラッグを始める瞬間に前のドラッグが残っていれば強制的に後片付け
  // してから始めるので、残骸のリスナーがそのまま延々居座ることも無い。
  let activeDrag = null;
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
    const span = meta.size === 2 ? 2 : 1;
    const room = {
      id: "r" + Date.now() + Math.random().toString(16).slice(2, 6), name: finalName, template: key,
      note: (note || "").trim(), occupants: [], slot: nextAvailableSlot(state.rooms, span)
    };
    state.rooms.unshift(room);
    notify(`部屋「${finalName}」(${meta.label})を追加`);
    render();
    return room;
  }

  // 3D俯瞰図(見取り図)からの部屋削除。誰も配置されていない部屋だけ削除できる
  // (男士が入っている部屋を誤って消せないようにするための安全策)。
  function removeRoomIfEmpty(roomId) {
    const room = state.rooms.find(r => r.id === roomId);
    if (!room || (room.occupants || []).length > 0) return;
    state.rooms = state.rooms.filter(r => r.id !== roomId);
    const meta = TEMPLATE_META[room.template] || TEMPLATE_META.a;
    notify(`部屋「${room.name || meta.label}」を削除`);
    render();
  }

  // この画面(男士の配置)からの部屋削除。誰かが配置されていても削除でき、
  // その場合は配置されていた刀剣男士を配置待ちへ戻す。
  function removeRoom(roomId) {
    const room = state.rooms.find(r => r.id === roomId);
    if (!room) return;
    const meta = TEMPLATE_META[room.template] || TEMPLATE_META.a;
    const occCount = (room.occupants || []).length;
    const confirmMsg = occCount > 0
      ? `「${room.name || meta.label}」を削除しますか？\n配置されている${occCount}振りは配置待ちに戻ります。`
      : `「${room.name || meta.label}」を削除しますか？`;
    if (!window.confirm(confirmMsg)) return;
    (room.occupants || []).forEach(o => {
      if (!state.unplaced.some(c => c.id === o.charId)) {
        state.unplaced.push({ id: o.charId, name: nameOf(o.charId) });
      }
    });
    state.rooms = state.rooms.filter(r => r.id !== roomId);
    notify(`部屋「${room.name || meta.label}」を削除${occCount ? "(住人は配置待ちに戻しました)" : ""}`);
    render();
  }

  window.addEventListener("message", e => {
    const data = e.data;
    if (!data) return;
    if (data.type === "room_add" && data.template) { addRoomFromTemplate(data.template, data.name, data.note); return; }
    if (data.type === "room_delete" && data.roomId) { removeRoomIfEmpty(data.roomId); return; }
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
    // characters_sync は刀剣男士の正本(全件)なので、ここに無い = 削除された刀剣男士とみなし、
    // 配置待ち・各部屋のタグからも消す(そのままだと「?」タグとして残ってしまう)。
    const validIds = new Set(data.characters.map(sc => sc.id));
    characters = characters.filter(c => validIds.has(c.id));
    let changed = false;
    const beforeUnplaced = state.unplaced.length;
    state.unplaced = state.unplaced.filter(c => validIds.has(c.id));
    if (state.unplaced.length !== beforeUnplaced) changed = true;
    state.rooms.forEach(r => {
      const before = r.occupants.length;
      r.occupants = r.occupants.filter(o => validIds.has(o.charId));
      if (r.occupants.length !== before) changed = true;
    });
    if (changed) { saveState(); syncRooms(); }
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

    ensureSlots(state.rooms); // 保険(通常は読み込み時点で全部屋に付与済み)
    const grid = document.createElement("div");
    grid.className = "rooms-grid";
    state.rooms.forEach(room => {
      const card = renderRoom(room);
      const span = roomSpan(room);
      const col = room.slot % GRID_COLS;
      const row = Math.floor(room.slot / GRID_COLS);
      card.style.gridColumn = (col + 1) + " / span " + span;
      card.style.gridRow = (row + 1) + " / span 1";
      grid.appendChild(card);
    });
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
      const span = meta.size === 2 ? 2 : 1;
      state.rooms.unshift({
        id: "r" + Date.now(),
        name: finalName,
        template: addRoomDraft.template,
        note: addRoomDraft.note.trim(),
        occupants: [],
        slot: nextAvailableSlot(state.rooms, span)
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
    // 部屋の削除・並び替えの両方から参照する。刀剣男士タグのドロップ判定は
    // (部屋の隙間に落としても部屋の中に落としたことになるよう)カード全体を対象にする。
    card.dataset.dropzone = "room";
    card.dataset.roomId = room.id;

    const head = document.createElement("div");
    head.className = "room-head";
    const dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "room-drag-handle";
    dragHandle.textContent = "⠿";
    dragHandle.title = "ドラッグして並び替え";
    dragHandle.setAttribute("aria-label", "部屋を並び替え");
    attachRoomDrag(dragHandle, room.id);
    const nameInput = document.createElement("input");
    nameInput.className = "room-name-input";
    nameInput.value = room.name;
    nameInput.oninput = e => { room.name = e.target.value; syncRooms(); };
    const tplSelect = document.createElement("select");
    tplSelect.className = "room-template-select";
    tplSelect.innerHTML = templateOptionsHtml();
    tplSelect.value = TEMPLATE_META[room.template] ? room.template : "a";
    tplSelect.onchange = e => {
      room.template = e.target.value;
      // 種類の変更でマスの数(1→2列)が変わり、隣の部屋と重なってしまう場合は
      // その部屋だけ空いている場所へ動かす(重なったまま表示させないための保険)。
      const span = roomSpan(room);
      const used = occupiedSlots(state.rooms, room.id);
      const fits = span === 2
        ? (room.slot % GRID_COLS === 0 && !used.has(room.slot) && !used.has(room.slot + 1))
        : !used.has(room.slot);
      if (!fits) room.slot = nextAvailableSlot(state.rooms, span, room.id);
      render();
    };
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "room-delete-btn";
    deleteBtn.textContent = "×";
    deleteBtn.title = "部屋を削除";
    deleteBtn.setAttribute("aria-label", "部屋を削除");
    deleteBtn.onclick = () => removeRoom(room.id);
    head.appendChild(dragHandle);
    head.appendChild(nameInput);
    head.appendChild(tplSelect);
    head.appendChild(deleteBtn);
    card.appendChild(head);

    const noteInput = document.createElement("input");
    noteInput.className = "room-note-input";
    noteInput.placeholder = "備考(日当たりがいい、など)";
    noteInput.value = room.note || "";
    noteInput.oninput = e => { room.note = e.target.value; syncRooms(); };
    card.appendChild(noteInput);

    const surface = document.createElement("div");
    surface.className = "room-surface" + (meta.aspectClass ? " " + meta.aspectClass : "");
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
      // 前のドラッグの後始末が実機の都合で漏れていても、新しく掴んだ瞬間に
      // 強制的に片付けてから始める(残骸が新しい操作の邪魔をしないように)。
      if (activeDrag) { try { activeDrag.cleanup(); } catch (err) {} activeDrag = null; }
      const startX = e.clientX;
      const startY = e.clientY;
      const THRESHOLD = 9; // これ未満の移動ならタップ扱い
      let moved = false;
      let ghost = null;
      const self = {};

      function cleanup() {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", cancel);
        clearHighlights();
        if (ghost) { ghost.remove(); ghost = null; }
        if (activeDrag === self) activeDrag = null;
      }
      self.cleanup = cleanup;
      activeDrag = self;

      const move = ev => {
        if (activeDrag !== self) return; // 既に後片付け済み(=このドラッグはもう無効)
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
        if (activeDrag !== self) return;
        const wasMoved = moved;
        cleanup();
        dragging = null;
        if (wasMoved) {
          // 万一ここで例外が起きても、再描画だけは必ず行い、次の操作で
          // 掴めなくなる(掴み手が古いままになる)のを防ぐ。
          try { handleDrop(ev.clientX, ev.clientY, charId); } catch (err) { render(); }
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
        if (activeDrag !== self) return;
        cleanup();
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
    if (zone) {
      const surfaceEl = zone.querySelector(".room-surface");
      if (surfaceEl) surfaceEl.classList.add("dragover");
    }
  }
  function clearHighlights() {
    document.querySelectorAll(".room-surface.dragover").forEach(n => n.classList.remove("dragover"));
  }

  // 部屋の判定対象はカード全体(見出し・備考欄も含む)にしてあるので、部屋の隙間や
  // 画面外など「本当に部屋の外」に投げ出した時だけ配置待ちへ戻る。部屋の上のほうに
  // 少しずれて落としても、その部屋への配置として扱われる。
  function handleDrop(x, y, charId) {
    const target = document.elementFromPoint(x, y);
    const roomZone = target && target.closest && target.closest('[data-dropzone="room"]');
    const room = roomZone && state.rooms.find(r => r.id === roomZone.dataset.roomId);

    const prevRoom = state.rooms.find(r => r.occupants.some(o => o.charId === charId));
    const wasUnplaced = state.unplaced.some(c => c.id === charId);

    if (room) {
      const surfaceEl = roomZone.querySelector(".room-surface") || roomZone;
      const rect = surfaceEl.getBoundingClientRect();
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
    } else {
      // 配置待ちトレイに落とした場合も、部屋の外(隙間・画面外)に投げ出した場合も同じ扱い
      removeFromEverywhere(charId);
      state.unplaced.push({ id: charId, name: nameOf(charId) });
      if (!wasUnplaced) {
        notify(`${nameOf(charId)}を配置待ちに戻した`);
      }
      render();
    }
  }

  // ---- 部屋そのものの並び替え(刀剣男士タグのドラッグとは別の仕組み) ----
  // 見出しの掴みどころ(room-drag-handle)からしか始まらないので、タグの移動と混ざらない。
  function attachRoomDrag(handle, roomId) {
    handle.addEventListener("pointerdown", e => {
      e.preventDefault();
      // 前のドラッグの後始末が実機の都合で漏れていても、新しく掴んだ瞬間に
      // 強制的に片付けてから始める(残骸が新しい操作の邪魔をしないように)。
      if (activeDrag) { try { activeDrag.cleanup(); } catch (err) {} activeDrag = null; }
      const startX = e.clientX;
      const startY = e.clientY;
      const THRESHOLD = 9;
      let moved = false;
      let ghost = null;
      const sourceCard = handle.closest(".room-card");
      const self = {};

      function cleanup() {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", cancel);
        clearRoomDropHighlight();
        if (sourceCard) sourceCard.classList.remove("room-dragging-source");
        if (ghost) { ghost.remove(); ghost = null; }
        if (activeDrag === self) activeDrag = null;
      }
      self.cleanup = cleanup;
      activeDrag = self;

      const move = ev => {
        if (activeDrag !== self) return; // 既に後片付け済み(=このドラッグはもう無効)
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!moved && Math.hypot(dx, dy) > THRESHOLD) {
          moved = true;
          const room = state.rooms.find(r => r.id === roomId);
          ghost = document.createElement("div");
          ghost.className = "ghost-room";
          ghost.textContent = (room && room.name) || "部屋";
          document.body.appendChild(ghost);
          if (sourceCard) sourceCard.classList.add("room-dragging-source");
        }
        if (moved) {
          positionGhost(ghost, ev.clientX, ev.clientY);
          highlightRoomDropTarget(ev.clientX, ev.clientY, sourceCard);
        }
      };
      const up = ev => {
        if (activeDrag !== self) return;
        const wasMoved = moved;
        cleanup();
        if (wasMoved) {
          // 万一ここで例外が起きても、再描画だけは必ず行い、次の操作で
          // 掴めなくなる(掴み手が古いままになる)のを防ぐ。
          try { handleRoomDrop(ev.clientX, ev.clientY, roomId); } catch (err) { render(); }
        }
      };
      // pointercancel でも後片付けする(タグ移動と同じ理由)
      const cancel = () => {
        if (activeDrag !== self) return;
        cleanup();
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", cancel);
    });
  }
  function highlightRoomDropTarget(x, y, sourceCard) {
    clearRoomDropHighlight();
    const target = document.elementFromPoint(x, y);
    const card = target && target.closest && target.closest(".room-card");
    if (card && card !== sourceCard) card.classList.add("room-drop-target");
  }
  function clearRoomDropHighlight() {
    document.querySelectorAll(".room-card.room-drop-target").forEach(n => n.classList.remove("room-drop-target"));
  }
  // 部屋の並び替え。各部屋は明示的なslot(何段目・何列目)を持っているので、
  // 常にこの2通りのどちらかしか起きない:
  //   ・既存の部屋の上に落とした → その部屋とだけ slot を交換する(他の部屋のslotは一切変えない)。
  //   ・空いているマスに落とした → 掴んでいる部屋のslotをそこへ直接書き換えるだけ(他の部屋には触れない)。
  // 部屋の外(グリッドから離れた場所・画面外)や自分自身の上に落とした場合は何もしない。
  function handleRoomDrop(x, y, roomId) {
    const moving = state.rooms.find(r => r.id === roomId);
    if (!moving) return;
    const target = document.elementFromPoint(x, y);
    const card = target && target.closest && target.closest(".room-card");

    if (card && card.dataset.roomId === roomId) return; // 自分自身の上に落とした

    if (card && card.dataset.roomId) {
      // 既存の部屋の上 → その2部屋だけ入れ替える
      const other = state.rooms.find(r => r.id === card.dataset.roomId);
      if (!other) return;
      swapRoomPositions(moving, other);
      notify(`部屋「${moving.name}」と「${other.name}」を入れ替え`);
      render();
      return;
    }

    // 部屋の上ではない場合、本当にグリッドの近くに落としたのかを確認する
    // (的外れな場所に投げ出した時にまで反応しないための安全策)。
    const grid = document.querySelector(".rooms-grid");
    const gridRect = grid && grid.getBoundingClientRect();
    const margin = 40;
    const withinGrid = gridRect && x >= gridRect.left - margin && x <= gridRect.right + margin
      && y >= gridRect.top - margin && y <= gridRect.bottom + margin;
    if (!withinGrid) return;

    // 全部屋(掴んでいる部屋自身も含む)から「段(row)ごとのY範囲」を集める。同じ段の
    // 部屋だけを比べることで、別の段にある部屋を誤って巻き込まない
    // (六畳2つの下に六畳1つ、のような場合の誤爆対策)。
    // 掴んでいる部屋自身も含めるのは、その部屋が今いる段に他の部屋が1つも無い
    // (=1部屋だけで段を作っている)場合でも、その段を認識できるようにするため。
    // 除外すると、その段だけ判定材料が無くなり同じ段の中で動かせなくなってしまう。
    const rowRanges = new Map(); // row -> { top, bottom }
    state.rooms.forEach(r => {
      const el = grid.querySelector('[data-room-id="' + r.id + '"]');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const row = Math.floor(r.slot / GRID_COLS);
      const cur = rowRanges.get(row);
      if (!cur) rowRanges.set(row, { top: rect.top, bottom: rect.bottom });
      else { cur.top = Math.min(cur.top, rect.top); cur.bottom = Math.max(cur.bottom, rect.bottom); }
    });
    if (!rowRanges.size) return;

    let targetRow = null;
    rowRanges.forEach((range, row) => {
      if (targetRow === null && y >= range.top && y <= range.bottom) targetRow = row;
    });
    if (targetRow === null) {
      // どの段の範囲にも入らない(段の間の隙間・グリッドの余白など) → 中心が一番近い段を採用
      let bestDist = Infinity;
      rowRanges.forEach((range, row) => {
        const d = Math.abs((range.top + range.bottom) / 2 - y);
        if (d < bestDist) { bestDist = d; targetRow = row; }
      });
    }

    const col = (x - gridRect.left) < gridRect.width / 2 ? 0 : 1;
    let targetSlot = targetRow * GRID_COLS + col;
    const span = roomSpan(moving);
    if (span === 2 && targetSlot % GRID_COLS !== 0) targetSlot -= 1; // 2列部屋は必ず列0始まり
    if (targetSlot === moving.slot) return;

    const used = occupiedSlots(state.rooms, roomId);
    const free = span === 2 ? (!used.has(targetSlot) && !used.has(targetSlot + 1)) : !used.has(targetSlot);

    if (free) {
      moving.slot = targetSlot;
      notify(`部屋「${moving.name}」の並び順を変更`);
      render();
      return;
    }

    // 空いていない場合: 例えば「上段は空欄+六畳、下段は広間」のように、大型の部屋が
    // 1マス分の空きだけでは収まらないケース。その段を塞いでいる部屋が1つだけなら、
    // 部屋の上に直接落とした時と同じく、その部屋とだけ入れ替える。
    const blockingSlots = span === 2 ? [targetSlot, targetSlot + 1] : [targetSlot];
    const blockers = new Set();
    blockingSlots.forEach(s => {
      const r = occupantAt(state.rooms, s, roomId);
      if (r) blockers.add(r);
    });
    if (blockers.size !== 1) return; // 複数の部屋にまたがるなど、判断できない場合は何もしない
    const blocker = [...blockers][0];
    swapRoomPositions(moving, blocker);
    notify(`部屋「${moving.name}」と「${blocker.name}」を入れ替え`);
    render();
  }

  render();
})();

