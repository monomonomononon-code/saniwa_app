(function () {
  "use strict";
  const body = document.getElementById("diary-body");
  const editor = document.getElementById("diary-editor");
  const diary = document.getElementById("diary");
  const bar = document.getElementById("diary-inserts");
  const slot = document.getElementById("diary-insert-slot");
  if (!body || !bar || !slot) return;

  // A child iframe's VisualViewport does not reflect the phone keyboard.
  // This app embeds the diary in a same-origin iframe: use its parent viewport.
  let host = window, frame = null;
  try {
    if (window.parent !== window && window.frameElement) {
      void window.parent.document.documentElement;
      host = window.parent;
      frame = window.frameElement;
    }
  } catch (_) { /* Standalone/cross-origin fallback: retain normal controls. */ }
  const viewport = host.visualViewport;
  if (!viewport) return;
  let baselineHeight = Math.max(viewport.height, host.innerHeight);
  let baselineWidth = host.innerWidth;
  let pending = false;
  let followCaret = false;
  let focusGeneration = 0;
  const nav = host.navigator || {};
  const isIOS = /iPad|iPhone|iPod/.test(nav.userAgent || "") ||
    (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  // Safari does not expose its floating accessory bar's rectangle to the page.
  // The visual viewport already excludes most keyboard UI. Keep only a small
  // visual gap, rather than reserving the accessory bar's height a second time.
  const accessoryClearance = isIOS ? 8 : 0;
  let measuredValue = null, measuredWidth = 0;

  function growBody() {
    if (diary.hidden || editor.hidden || !body.getClientRects().length) return;
    const width = body.getBoundingClientRect().width;
    if (body.value === measuredValue && width === measuredWidth) return;
    measuredValue = body.value; measuredWidth = width;
    const oldX = window.scrollX, oldY = window.scrollY;
    const parentX = host.scrollX, parentY = host.scrollY;
    body.style.height = "auto";
    body.style.height = body.scrollHeight + "px";
    body.style.overflowY = "hidden";
    // Measuring must not jump a long document back upward as its height shrinks.
    if (window.scrollX !== oldX || window.scrollY !== oldY) window.scrollTo(oldX, oldY);
    if (frame && (host.scrollX !== parentX || host.scrollY !== parentY)) host.scrollTo(parentX, parentY);
  }
  function revealCaret() {
    if (document.activeElement !== body || diary.hidden || editor.hidden || !body.getClientRects().length ||
        Math.abs(viewport.scale - 1) > .05 || (frame && !frame.getClientRects().length)) return;
    // Mirror the textarea's wrapping so insertion in the middle of a long text
    // follows that caret, not the document's last line. Never move the selection.
    const mirror = document.createElement("div");
    mirror.setAttribute("aria-hidden", "true");
    const style = window.getComputedStyle(body);
    for (const name of ["fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "wordSpacing", "tabSize", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "wordBreak", "overflowWrap", "textIndent", "direction"]) {
      mirror.style[name] = style[name];
    }
    Object.assign(mirror.style, { position: "fixed", top: "0", left: "0", width: body.getBoundingClientRect().width + "px", boxSizing: "border-box", whiteSpace: "pre-wrap", visibility: "hidden", pointerEvents: "none" });
    const marker = document.createElement("span"); marker.textContent = "\u200b";
    mirror.append(document.createTextNode(body.value.slice(0, body.selectionStart)), marker,
      document.createTextNode(body.value.slice(body.selectionStart)));
    document.body.append(mirror);
    const markerRect = marker.getBoundingClientRect();
    const caretY = body.getBoundingClientRect().top + markerRect.top - mirror.getBoundingClientRect().top;
    const lineHeight = parseFloat(style.lineHeight) || markerRect.height || 24;
    mirror.remove();
    const originTop = frame ? frame.getBoundingClientRect().top + frame.clientTop : 0;
    const upper = Math.max(0, viewport.offsetTop - originTop) + 12;
    let lower = Math.min(frame ? window.innerHeight : Infinity, viewport.offsetTop + viewport.height - originTop) - 12;
    if (bar.classList.contains("is-keyboard-docked")) lower = Math.min(lower, parseFloat(bar.style.top) - (window.scrollY || 0) - 12);
    if (lower - upper < lineHeight) return;
    const delta = caretY + lineHeight > lower ? caretY + lineHeight - lower : caretY < upper ? caretY - upper : 0;
    if (Math.abs(delta) < 1) return;
    // Scroll only the editor document. Safari owns parent-page keyboard panning;
    // applying the remaining delta there can create a resize/scroll feedback loop.
    window.scrollBy({ top: delta, behavior: "instant" });
  }

  function reset() {
    followCaret = false;
    bar.classList.remove("is-keyboard-docked");
    bar.classList.remove("is-keyboard-open");
    body.classList.remove("has-keyboard-toolbar");
    for (const name of ["top", "left", "width"]) bar.style.removeProperty(name);
    slot.style.removeProperty("height");
    body.style.removeProperty("clip-path");
    body.style.removeProperty("-webkit-clip-path");
  }
  function update() {
    pending = false;
    // Docking must still run if measuring a long textarea fails on a browser.
    try { growBody(); }
    finally { updateDock(); }
    if (followCaret) {
      followCaret = false;
      revealCaret();
      // Absolute coordinates and clipping must use the post-scroll geometry.
      updateDock();
    }
  }
  function updateDock() {
    const focused = document.activeElement === body;
    const touchDevice = isIOS || nav.maxTouchPoints > 0 || host.matchMedia("(any-pointer: coarse)").matches;
    const layoutHeight = host.document.documentElement.clientHeight;
    if (host.innerWidth !== baselineWidth) {
      baselineWidth = host.innerWidth;
      baselineHeight = Math.max(layoutHeight, host.innerHeight, viewport.height);
    }
    if (!focused) baselineHeight = Math.max(baselineHeight, viewport.height);
    // Keyboard visibility has no universal API. Ignore browser chrome changes
    // and pinch zoom; require a substantial height loss while editing on touch.
    const keyboardOpen = Math.max(baselineHeight, layoutHeight) - viewport.height * (viewport.scale || 1) > 100;
    if (body.dataset?.referenceOpen === "true" || !touchDevice ||
        diary.hidden || editor.hidden || (frame && !frame.getClientRects().length)) {
      reset();
      return;
    }
    const rect = frame ? frame.getBoundingClientRect() : { top: 0, left: 0 };
    const originTop = rect.top + (frame ? frame.clientTop : 0);
    const originLeft = rect.left + (frame ? frame.clientLeft : 0);
    const left = Math.max(0, viewport.offsetLeft - originLeft);
    const right = Math.min(frame ? window.innerWidth : Infinity, viewport.offsetLeft + viewport.width - originLeft);
    const bottom = Math.min(frame ? window.innerHeight : Infinity, viewport.offsetTop + viewport.height - originTop);
    bar.classList.add("is-keyboard-docked");
    if (keyboardOpen) bar.classList.add("is-keyboard-open");
    else bar.classList.remove("is-keyboard-open");
    bar.style.width = Math.max(0, right - left) + "px";
    const height = bar.getBoundingClientRect().height;
    const top = bottom - height - (keyboardOpen ? accessoryClearance : 0);
    if (right <= left || top < Math.max(0, viewport.offsetTop - originTop)) { reset(); return; }
    // Document coordinates avoid relying on an iframe's fixed-position layer
    // while Safari pans the page for the keyboard. No positioned ancestors.
    bar.style.left = (left + (window.scrollX || 0)) + "px";
    bar.style.top = (top + (window.scrollY || 0)) + "px";
    slot.style.height = height + "px";
    body.classList.add("has-keyboard-toolbar");
    // Clip the editing surface itself (including its native caret), not just
    // paint over it with a toolbar. Manual scrolling remains under user control.
    const bodyRect = body.getBoundingClientRect();
    const clippedBottom = Math.min(bodyRect.height, Math.max(0, bodyRect.top + bodyRect.height - top));
    const clip = `inset(0px 0px ${clippedBottom}px 0px)`;
    body.style.clipPath = clip;
    body.style.webkitClipPath = clip;
  }
  function schedule() {
    if (!pending) { pending = true; window.requestAnimationFrame(update); }
  }
  function scheduleCaret() { followCaret = true; schedule(); }
  // Retain the textarea selection and keyboard when tapping an insert button.
  // Click remains the activation event, including keyboard/screen-reader clicks.
  bar.addEventListener("pointerdown", event => {
    if (document.activeElement === body && event.target.closest("button") && event.button === 0) {
      event.preventDefault();
    }
  });
  body.addEventListener("focus", () => {
    followCaret = false;
    const generation = ++focusGeneration;
    schedule();
    // Viewport events can precede the end of the iOS keyboard animation.
    for (const delay of [80, 240, 500]) window.setTimeout(() => {
      if (generation === focusGeneration && document.activeElement === body) schedule();
    }, delay);
  });
  function cancelCaretFollow() {
    followCaret = false;
    focusGeneration++;
    schedule();
  }
  body.addEventListener("blur", cancelCaretFollow);
  body.addEventListener("diary-editor-open", cancelCaretFollow);
  body.addEventListener("diary-reference-change", cancelCaretFollow);
  body.addEventListener("diary-content-changed", scheduleCaret);
  body.addEventListener("input", event => { if (!event.isComposing) scheduleCaret(); });
  body.addEventListener("compositionend", scheduleCaret);
  // Keyboard animation changes geometry, not the user's editing position.
  viewport.addEventListener("resize", schedule);
  viewport.addEventListener("scroll", schedule);
  host.addEventListener("resize", schedule);
  host.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("hashchange", cancelCaretFollow);
  window.addEventListener("pagehide", reset);
  schedule();
})();
