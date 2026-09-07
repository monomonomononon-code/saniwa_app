(function () {
  "use strict";
  // 本文は内容に合わせて伸ばし、入力中のカーソル行が見切れた時だけ
  // iframe 内を最小限スクロールする。キーボードやツールバー自体は動かさない。
  const body = document.getElementById("diary-body");
  const editor = document.getElementById("diary-editor");
  const diary = document.getElementById("diary");
  const storageNote = document.getElementById("diary-storage-note");
  if (!body) return;

  // 日誌は通常 index.html 内の iframe にある。親の VisualViewport を見ることで、
  // 実機キーボードで実際に見えている範囲を iframe 座標へ変換できる。
  let host = window, frame = null;
  try {
    if (window.parent !== window && window.frameElement) {
      void window.parent.document.documentElement;
      host = window.parent;
      frame = window.frameElement;
    }
  } catch (_) { /* 単体表示・別オリジンでは自分の viewport を使う */ }

  let measuredValue = null, measuredWidth = 0;
  function growBody() {
    if (!diary || !editor || diary.hidden || editor.hidden || !body.getClientRects().length) return;
    const width = body.getBoundingClientRect().width;
    if (body.value === measuredValue && width === measuredWidth) return;
    measuredValue = body.value;
    measuredWidth = width;
    const oldX = window.scrollX, oldY = window.scrollY;
    body.style.height = "auto";
    body.style.height = body.scrollHeight + "px";
    body.style.overflowY = "hidden";
    // height:auto で一瞬縮んだ時のスクロール上限変化だけを同じフレーム内で戻す。
    // 親画面は戻さず、この直後にカーソル基準で必要な分だけ移動する。
    if (window.scrollX !== oldX || window.scrollY !== oldY) window.scrollTo(oldX, oldY);
  }

  const mirror = document.createElement("div");
  const marker = document.createElement("span");
  mirror.setAttribute("aria-hidden", "true");
  marker.textContent = "\u200b";
  Object.assign(mirror.style, {
    position: "fixed",
    visibility: "hidden",
    pointerEvents: "none",
    overflow: "visible",
    minHeight: "0",
    maxHeight: "none",
    height: "auto"
  });
  document.body.appendChild(mirror);

  const copiedStyles = [
    "boxSizing", "fontFamily", "fontSize", "fontStyle", "fontWeight", "fontVariant",
    "lineHeight", "letterSpacing", "wordSpacing", "textAlign", "textIndent", "textTransform",
    "direction", "whiteSpace", "overflowWrap", "wordBreak", "tabSize",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle"
  ];

  function caretRect() {
    const bodyRect = body.getBoundingClientRect();
    const style = window.getComputedStyle(body);
    copiedStyles.forEach(name => { mirror.style[name] = style[name]; });
    mirror.style.top = (bodyRect.top - body.scrollTop) + "px";
    mirror.style.left = bodyRect.left + "px";
    mirror.style.width = bodyRect.width + "px";
    const caret = Math.max(0, typeof body.selectionEnd === "number" ? body.selectionEnd : body.value.length);
    mirror.replaceChildren(document.createTextNode(body.value.slice(0, caret)), marker);
    return marker.getBoundingClientRect();
  }

  function visibleBounds() {
    let top = 0, bottom = window.innerHeight;
    const viewport = host.visualViewport || (host === window ? window.visualViewport : null);
    if (viewport && frame) {
      const frameRect = frame.getBoundingClientRect();
      const border = frame.clientTop || 0;
      top = Math.max(0, viewport.offsetTop - frameRect.top - border);
      bottom = Math.min(window.innerHeight, viewport.offsetTop + viewport.height - frameRect.top - border);
    } else if (viewport) {
      top = Math.max(0, viewport.offsetTop);
      bottom = Math.min(window.innerHeight, viewport.offsetTop + viewport.height);
    }
    // キーボードが閉じている時は、固定した保存先注記の上までを本文の可視範囲にする。
    if (storageNote) {
      const noteRect = storageNote.getBoundingClientRect();
      if (noteRect.bottom > top && noteRect.top < bottom) bottom = Math.min(bottom, noteRect.top);
    }
    return { top, bottom };
  }

  function keepCaretVisible() {
    if (document.activeElement !== body || body.dataset.referenceOpen !== undefined) return;
    if (!body.getClientRects().length) return;
    const caret = caretRect();
    const visible = visibleBounds();
    const margin = 20;
    let delta = 0;
    if (caret.bottom > visible.bottom - margin) {
      delta = caret.bottom - (visible.bottom - margin);
    } else if (caret.top < visible.top + margin) {
      delta = caret.top - (visible.top + margin);
    }
    // 可視範囲内なら一切動かさない。これが入力ごとの不自然な跳ねを防ぐ。
    if (Math.abs(delta) > 1) window.scrollBy(0, delta);
  }

  let pending = false, followPending = false;
  function schedule(followCaret) {
    followPending = followPending || !!followCaret;
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => {
      pending = false;
      const shouldFollow = followPending;
      followPending = false;
      growBody();
      if (shouldFollow) window.requestAnimationFrame(keepCaretVisible);
    });
  }

  // キーボード表示は数段階で viewport が縮む端末がある。初回フォーカス後だけ
  // 短時間再確認し、毎回の入力では可視範囲外になった時だけ追従する。
  let focusGeneration = 0, viewportSettlingUntil = 0;
  body.addEventListener("focus", () => {
    const token = ++focusGeneration;
    viewportSettlingUntil = performance.now() + 700;
    schedule(true);
    [80, 180, 320, 520].forEach(delay => window.setTimeout(() => {
      if (token === focusGeneration && document.activeElement === body) schedule(true);
    }, delay));
  });
  body.addEventListener("blur", () => { focusGeneration++; });
  body.addEventListener("input", () => schedule(true));
  body.addEventListener("compositionend", () => schedule(true));
  body.addEventListener("diary-content-changed", () => schedule(true));
  body.addEventListener("diary-editor-open", () => schedule(false));
  body.addEventListener("pointerup", () => schedule(true));
  body.addEventListener("keyup", event => {
    if (!event.isComposing && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(event.key)) {
      schedule(true);
    }
  });
  document.addEventListener("selectionchange", () => {
    if (document.activeElement === body) schedule(true);
  });

  const viewports = new Set([window.visualViewport, host.visualViewport].filter(Boolean));
  viewports.forEach(viewport => {
    viewport.addEventListener("resize", () => schedule(true));
    viewport.addEventListener("scroll", () => {
      if (document.activeElement === body && performance.now() < viewportSettlingUntil) schedule(true);
    });
  });
  window.addEventListener("resize", () => schedule(document.activeElement === body));
  if (host !== window) host.addEventListener("resize", () => schedule(document.activeElement === body));
  schedule(false);
})();
