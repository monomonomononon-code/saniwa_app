(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const body = $("diary-body"), app = $("app"), overlay = $("diary-reference-overlay");
  const sheet = $("diary-reference-sheet"), content = $("diary-reference-content");
  const title = $("diary-reference-title"), closeButton = $("diary-reference-close");
  let host = window, frame = null;
  try { if (window.frameElement && window.parent.document) { host = window.parent; frame = window.frameElement; } } catch (_) {}
  const viewport = host.visualViewport;
  let opened = false, saved, trigger, records, kind, unlock = [], generation = 0;
  let selectedTab = null;
  let profileLayer = null, profileScroll = null, profileReturnFocus = null, sheetInert = false;
  const labels = { rooms: "部屋割り", network: "関係図", master: "刀剣男士" };
  const list = value => Array.isArray(value) ? value.filter(x => x && typeof x === "object") : [];
  function read(key) {
    const raw = localStorage.getItem("saniwa-tool." + key + ".v1");
    return raw ? JSON.parse(raw) : null;
  }
  function load() {
    let live = {};
    try { live = host.readSaniwaReferences?.() || {}; } catch (_) {}
    const master = live.master ?? read("master");
    const shared = live.shared ?? read("app")?.sharedCharacters;
    // Master owns profile fields; shared data supplies names before it is opened.
    const characters = new Map(list(shared).map(c => [c.id, c]));
    list(master).forEach(c => characters.set(c.id, c));
    return { rooms: list((live.rooms ?? read("rooms"))?.rooms),
      tabs: list((live.network ?? read("network"))?.tabs), characters: [...characters.values()] };
  }
  function name(id) { return records.characters.find(c => c.id === id)?.name || "未登録の刀剣男士（" + id + "）"; }
  function text(tag, value, parent = content) {
    const el = document.createElement(tag); el.textContent = value; parent.append(el); return el;
  }
  function button(label, action, parent = content, className = "reference-item") {
    const el = text("button", label, parent); el.type = "button"; el.className = className;
    el.addEventListener("click", action); return el;
  }
  function start(heading, back) {
    content.replaceChildren(); content.scrollTop = 0; title.textContent = heading;
    if (back) button("← 一覧", () => { renderList(); content.focus({ preventScroll: true }); });
  }
  function fields(values) {
    const dl = document.createElement("dl"); content.append(dl);
    values.forEach(([label, value]) => { text("dt", label, dl); text("dd", value === "" || value == null ? "未登録" : String(value), dl); });
  }
  function profile(c) {
    if (profileLayer) return;
    profileReturnFocus = document.activeElement;
    sheetInert = sheet.inert; sheet.inert = true;
    profileLayer = text("div", "", overlay); profileLayer.className = "reference-profile-overlay";
    const card = text("section", "", profileLayer); card.className = "reference-profile-card";
    card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "reference-profile-name");
    profileScroll = text("div", "", card); profileScroll.className = "reference-profile-scroll";
    profileScroll.tabIndex = 0;
    text("p", "刀剣男士 プロフィール（閲覧専用）", profileScroll).className = "reference-profile-eyebrow";
    const heading = text("h2", c.name, profileScroll); heading.id = "reference-profile-name";
    const field = (label, value) => {
      const dl = text("dl", "", profileScroll);
      text("dt", label, dl);
      text("dd", value === "" || value == null ? "未登録" : String(value), dl);
    };
    field("刀種", c.swordType);
    const kiwame = text("div", "", profileScroll); kiwame.className = "reference-profile-kiwame";
    text("span", "極", kiwame);
    text("span", c.isKiwame ? "極 🌸" : "初", kiwame).className = "reference-profile-state";
    const switchMark = text("span", "", kiwame);
    switchMark.className = "reference-profile-switch" + (c.isKiwame ? " on" : "");
    switchMark.setAttribute("aria-hidden", "true");
    field("レベル", c.level); field("顕現した年月日", c.activationDate); field("配属部隊", c.unit);
    const captain = c.unit && records.characters.find(x => x.unit === c.unit && x.isCaptain);
    if (c.isCaptain || captain) text("p", c.isCaptain ? "部隊長" : captain.name + "が隊長です", profileScroll).className = "reference-profile-captain";
    [["身長", c.height], ["趣味", c.hobby], ["元主", c.formerOwner], ["性格", c.personality], ["メモ", c.memo]].forEach(([label,value]) => field(label,value));
    const footer = text("div", "", card); footer.className = "reference-profile-footer";
    const dismiss = button("閉じる", () => closeProfile(), footer, "reference-profile-close");
    profileLayer.addEventListener("click", e => { if (e.target === profileLayer) closeProfile(); });
    dismiss.focus({ preventScroll: true });
  }
  function closeProfile(restoreFocus = true) {
    if (!profileLayer) return;
    profileLayer.remove(); profileLayer = null; profileScroll = null;
    sheet.inert = sheetInert;
    if (restoreFocus) profileReturnFocus?.focus({ preventScroll: true });
    profileReturnFocus = null;
  }
  function renderList() {
    start(labels[kind]);
    if (kind === "master") {
      const grid = text("div", ""); grid.className = "reference-character-grid";
      records.characters.forEach(c => {
        const card = button("", () => profile(c), grid, "reference-character-card");
        const heading = text("span", "", card); heading.className = "reference-character-name";
        text("span", c.name, heading);
        if (c.level) text("small", "Lv." + c.level, heading);
        if (c.isKiwame) text("span", "🌸", heading);
        const meta = text("span", [c.swordType || "刀種未設定", c.unit ? c.unit + "配属中" : ""].filter(Boolean).join(" "), card);
        meta.className = "reference-character-meta";
        if (c.isCaptain) text("span", "隊長", meta).className = "reference-captain";
        if (c.memo) text("span", c.memo, card).className = "reference-character-memo";
      });
      if (!records.characters.length) text("p", "刀剣男士データはまだ登録されていません。");
    } else if (kind === "rooms") {
      const grid = text("div", ""); grid.className = "reference-room-grid";
      records.rooms.forEach(room => {
        const names = list(room.occupants).map(o => name(o.charId));
        const detail = () => {
          start(room.name, true); fields([["メモ", room.note]]);
          text("h3", "所属する刀剣男士");
          list(room.occupants).forEach(o => button(name(o.charId), () => showCharacter(o.charId)));
          if (!names.length) text("p", "入居者はいません。");
          content.focus({ preventScroll: true });
        };
        const template = ["a", "b", "c"].includes(room.template) ? room.template : "a";
        const card = text("article", "", grid); card.className = "reference-room-card" + (template === "b" ? " wide" : "");
        const head = text("div", "", card); head.className = "reference-room-head";
        button(room.name, detail, head, "reference-room-name");
        text("span", { a: "六畳", b: "広間", c: "洋間" }[template], head);
        text("p", room.note || "備考なし", card).className = "reference-room-note";
        const surface = text("div", "", card); surface.className = "reference-room-surface";
        surface.style.backgroundImage = 'url("../assets/reference-room-' + template + '.svg?v=svg-2")';
        list(room.occupants).forEach(o => {
          const chip = button(name(o.charId), () => showCharacter(o.charId), surface, "reference-room-chip");
          place(chip, o);
        });
        if (!names.length) text("span", "入居者なし", surface).className = "reference-room-empty";
      });
      if (!records.rooms.length) text("p", "部屋割りデータはまだ登録されていません。");
    } else {
      renderNetwork();
      if (!records.tabs.length) text("p", "関係図データはまだ登録されていません。");
    }
  }
  function showCharacter(id) {
    profile(records.characters.find(c => c.id === id) || { name: name(id) });
  }
  function place(el, p) {
    const coord = n => Number.isFinite(Number(n)) ? Number(n) : 50;
    el.style.left = coord(p.x) + "%"; el.style.top = coord(p.y) + "%";
  }
  function renderNetwork() {
    if (!records.tabs.length) return;
    const tab = records.tabs.find(t => t.id === selectedTab) || records.tabs[0];
    selectedTab = tab.id;
    const tabs = text("div", ""); tabs.className = "reference-network-tabs";
    records.tabs.forEach(t => {
      const btn = button(t.name, () => { selectedTab = t.id; renderList(); }, tabs, "reference-network-tab");
      btn.setAttribute("aria-pressed", String(t === tab));
    });
    const canvas = text("div", ""); canvas.className = "reference-network-canvas";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100"); svg.setAttribute("aria-hidden", "true");
    const makeSvg = (tag, attrs, parent) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v)); parent.append(el); return el;
    };
    const defs = makeSvg("defs", {}, svg);
    const marker = makeSvg("marker", { id: "reference-arrow", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: "auto-start-reverse" }, defs);
    makeSvg("path", { d: "M0,0 L10,5 L0,10 z", fill: "#A8382C" }, marker);
    canvas.append(svg);
    const relationships = list(tab.relationships), positions = tab.positions || {};
    const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
    relationships.forEach(rel => {
      const p1 = positions[rel.from], p2 = positions[rel.to];
      const detail = () => {
        start(tab.name, true); text("h3", name(rel.from) + " → " + name(rel.to)); text("p", rel.label || "無題");
        list(rel.episodes).forEach(ep => text("p", ep.text || "（本文なし）")); content.focus({ preventScroll: true });
      };
      if (!valid(p1) || !valid(p2)) { button(name(rel.from) + " → " + name(rel.to) + "：" + (rel.label || "無題"), detail); return; }
      // Match the source diagram's curved reverse edges and endpoint trimming.
      const dx = p2.x-p1.x, dy = p2.y-p1.y, dist = Math.hypot(dx,dy) || 1;
      const offset = relationships.some(r => r.from === rel.to && r.to === rel.from) ? 5 : 0;
      const mx = (p1.x+p2.x)/2-dy/dist*offset, my = (p1.y+p2.y)/2+dx/dist*offset;
      const length = Math.hypot(p2.x-mx,p2.y-my) || 1;
      makeSvg("path", { d: `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x-(p2.x-mx)/length*6} ${p2.y-(p2.y-my)/length*6}`,
        stroke: "#A8382C", "stroke-width": .6, fill: "none", opacity: .75, "marker-end": "url(#reference-arrow)" }, svg);
      const label = button(rel.label || "無題", detail, canvas, "reference-edge-label");
      label.setAttribute("aria-label", name(rel.from) + " → " + name(rel.to) + "：" + (rel.label || "無題"));
      place(label, {x:mx,y:my});
    });
    (Array.isArray(tab.placedIds) ? tab.placedIds : []).forEach(id => {
      if (!valid(positions[id])) return;
      const captain = records.characters.find(c => c.id === id)?.isCaptain;
      const chip = button(name(id), () => showCharacter(id), canvas, "reference-node" + (captain ? " captain" : ""));
      place(chip, positions[id]);
    });
    if (!tab.placedIds?.length) text("p", "配置された刀剣男士はいません。", canvas);
  }
  function position() {
    if (!opened || overlay.hidden) return;
    const rect = frame ? frame.getBoundingClientRect() : { top: 0, left: 0 };
    const top = Math.max(0, (viewport?.offsetTop || 0) - rect.top - (frame?.clientTop || 0));
    const bottom = Math.min(window.innerHeight, (viewport?.offsetTop || 0) + (viewport?.height || host.innerHeight) - rect.top - (frame?.clientTop || 0));
    Object.assign(overlay.style, { top: top + window.scrollY + "px", left: window.scrollX + "px",
      width: document.documentElement.clientWidth + "px", height: Math.max(0, bottom - top) + "px" });
  }
  function lock(doc) {
    for (const el of [doc.documentElement, doc.body]) {
      const previous = el.style.overflow;
      el.style.overflow = "hidden"; unlock.push(() => { el.style.overflow = previous; });
    }
    let lastY = 0;
    const track = e => { lastY = e.touches[0]?.clientY || 0; };
    const prevent = e => {
      const y = e.touches[0]?.clientY || 0, delta = y - lastY; lastY = y;
      const scroller = profileScroll || content;
      const inside = doc === document && scroller.contains(e.target);
      if (!inside || (delta > 0 && scroller.scrollTop <= 0) ||
          (delta < 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight)) e.preventDefault();
    };
    doc.addEventListener("touchstart", track, { passive: true });
    doc.addEventListener("touchmove", prevent, { passive: false });
    unlock.push(() => { doc.removeEventListener("touchstart", track); doc.removeEventListener("touchmove", prevent); });
  }
  function open(type, source) {
    if (opened) return;
    kind = type; trigger = source; opened = true;
    const token = ++generation;
    saved = { start: body.selectionStart, end: body.selectionEnd, direction: body.selectionDirection,
      x: window.scrollX, y: window.scrollY, px: host.scrollX, py: host.scrollY, inert: app.inert };
    body.dataset.referenceOpen = "true";
    document.activeElement?.blur(); // Never focus an input in the reference sheet.
    app.inert = true;
    lock(document); if (frame) lock(host.document);
    body.dispatchEvent(new Event("diary-reference-change"));
    // Wait for the keyboard to retract, rather than show the sheet over it.
    let stable = 0, previous = -1, attempts = 0;
    function waitForKeyboard() {
      if (!opened || generation !== token) return;
      const height = (viewport?.height || host.innerHeight) * (viewport?.scale || 1);
      stable = Math.abs(height - previous) < 1 ? stable + 1 : 0; previous = height;
      const layout = host.document.documentElement.clientHeight;
      if (layout - height > 120 || stable < 2) {
        if (++attempts > 30) {
          close();
          $("diary-status").textContent = "キーボードを閉じてから、資料ボタンをもう一度押してください。";
          return;
        }
        window.setTimeout(waitForKeyboard, 80); return;
      }
      try { records = load(); renderList(); }
      catch (_) { start(labels[kind]); text("p", "資料データを読み込めませんでした。保存内容は変更していません。"); }
      overlay.hidden = false; position(); closeButton.focus({ preventScroll: true });
    }
    waitForKeyboard();
  }
  function close() {
    if (!opened) return;
    closeProfile(false);
    opened = false; generation++; overlay.hidden = true; sheet.style.transform = "";
    app.inert = saved.inert; unlock.reverse().forEach(fn => fn()); unlock = [];
    delete body.dataset.referenceOpen;
    body.setSelectionRange(saved.start, saved.end, saved.direction);
    trigger?.focus({ preventScroll: true }); // Keep keyboard closed until the body is tapped.
    window.scrollTo(saved.x, saved.y); if (frame) host.scrollTo(saved.px, saved.py);
    body.dispatchEvent(new Event("diary-reference-change"));
  }
  document.querySelectorAll("[data-reference]").forEach(el => el.addEventListener("click", () => open(el.dataset.reference, el)));
  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  overlay.addEventListener("touchmove", e => { if (!(profileScroll || content).contains(e.target)) e.preventDefault(); }, { passive: false });
  document.addEventListener("keydown", e => {
    if (!opened) return;
    if (e.key === "Escape") { e.preventDefault(); if (profileLayer) closeProfile(); else close(); }
    if (e.key === "Tab" && !overlay.hidden) {
      const items = [...(profileLayer || sheet).querySelectorAll('button, [tabindex="0"]')];
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  const handle = $("diary-reference-handle"); let drag = null;
  handle.addEventListener("pointerdown", e => { if (e.button !== 0) return; drag = { id: e.pointerId, y: e.clientY }; handle.setPointerCapture(e.pointerId); });
  handle.addEventListener("pointermove", e => { if (drag?.id === e.pointerId) sheet.style.transform = "translateY(" + Math.max(0, e.clientY - drag.y) + "px)"; });
  handle.addEventListener("pointerup", e => { if (drag?.id !== e.pointerId) return; const distance = e.clientY - drag.y; drag = null; sheet.style.transform = ""; if (distance > 60) close(); });
  handle.addEventListener("pointercancel", () => { drag = null; sheet.style.transform = ""; });
  viewport?.addEventListener("resize", position); viewport?.addEventListener("scroll", position);
  window.addEventListener("resize", position); window.addEventListener("scroll", position);
  host.addEventListener("scroll", position);
  window.addEventListener("hashchange", close); window.addEventListener("pagehide", close);
})();
