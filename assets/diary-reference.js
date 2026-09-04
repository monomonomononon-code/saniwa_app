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
  function button(label, action) {
    const el = text("button", label); el.type = "button"; el.className = "reference-item";
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
    start(c.name, true);
    fields([["刀種", c.swordType], ["姿", c.isKiwame ? "極 🌸" : "初"], ["レベル", c.level],
      ["配属部隊", c.unit], ["部隊長", c.isCaptain ? "部隊長" : "―"], ["顕現日", c.activationDate],
      ["身長", c.height], ["趣味", c.hobby], ["元主", c.formerOwner], ["性格", c.personality], ["メモ", c.memo]]);
    content.focus({ preventScroll: true });
  }
  function renderList() {
    start(labels[kind]);
    if (kind === "master") {
      records.characters.forEach(c => button(c.name + (c.level ? " Lv." + c.level : "") + (c.isKiwame ? " 🌸" : ""), () => profile(c)));
      if (!records.characters.length) text("p", "刀剣男士データはまだ登録されていません。");
    } else if (kind === "rooms") {
      records.rooms.forEach(room => {
        const names = list(room.occupants).map(o => name(o.charId));
        button(room.name + " — " + (names.join("、") || "入居者なし"), () => {
          start(room.name, true); fields([["メモ", room.note]]);
          text("h3", "所属する刀剣男士"); names.forEach(n => text("p", n));
          if (!names.length) text("p", "入居者はいません。");
          content.focus({ preventScroll: true });
        });
      });
      if (!records.rooms.length) text("p", "部屋割りデータはまだ登録されていません。");
    } else {
      records.tabs.forEach(tab => {
        text("h3", tab.name);
        const relationships = list(tab.relationships);
        relationships.forEach(rel => button(name(rel.from) + " → " + name(rel.to) + "：" + (rel.label || "無題"), () => {
          start(tab.name, true); text("h3", name(rel.from) + " → " + name(rel.to));
          text("p", rel.label || "無題");
          list(rel.episodes).forEach(ep => text("p", ep.text || "（本文なし）"));
          content.focus({ preventScroll: true });
        }));
        if (!relationships.length) text("p", "関係はまだ登録されていません。");
      });
      if (!records.tabs.length) text("p", "関係図データはまだ登録されていません。");
    }
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
      const inside = doc === document && content.contains(e.target);
      if (!inside || (delta > 0 && content.scrollTop <= 0) ||
          (delta < 0 && content.scrollTop + content.clientHeight >= content.scrollHeight)) e.preventDefault();
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
  overlay.addEventListener("touchmove", e => { if (!content.contains(e.target)) e.preventDefault(); }, { passive: false });
  document.addEventListener("keydown", e => {
    if (!opened) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    if (e.key === "Tab" && !overlay.hidden) {
      const items = [...sheet.querySelectorAll('button, [tabindex="0"]')];
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
