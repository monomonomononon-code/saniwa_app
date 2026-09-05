(function () {
  "use strict";
  // 本文の高さを内容に合わせて自動で伸ばすだけの、最小限のスクリプト。
  //
  // 以前はここでソフトウェアキーボードの表示位置を検知し、挿入ボタン(diary-inserts)を
  // キーボードの上に追従させていたが、端末・ブラウザによって位置ずれ・ボタンの被り・
  // 挙動不安定が起きやすかったため廃止した。挿入ボタンは journal.html 側で
  // 文字数表示の隣(本文欄の上)に常時固定表示する、通常のレイアウトに変更している。
  const body = document.getElementById("diary-body");
  const editor = document.getElementById("diary-editor");
  const diary = document.getElementById("diary");
  if (!body) return;

  // 同一オリジンの親ウィンドウ(index.html)に埋め込まれている場合は、
  // 高さ測定中に親ページのスクロール位置がずれないよう、そちらも合わせて復元する。
  let host = window;
  try {
    if (window.parent !== window && window.frameElement) {
      void window.parent.document.documentElement;
      host = window.parent;
    }
  } catch (_) { /* 別オリジン等で参照できない場合は自分のウィンドウだけ扱う */ }

  let measuredValue = null, measuredWidth = 0;
  function growBody() {
    if (!diary || !editor || diary.hidden || editor.hidden || !body.getClientRects().length) return;
    const width = body.getBoundingClientRect().width;
    if (body.value === measuredValue && width === measuredWidth) return;
    measuredValue = body.value; measuredWidth = width;
    const oldX = window.scrollX, oldY = window.scrollY;
    const parentX = host.scrollX, parentY = host.scrollY;
    body.style.height = "auto";
    body.style.height = body.scrollHeight + "px";
    body.style.overflowY = "hidden";
    // 高さの再計測でページが上に飛ばないよう、直前のスクロール位置に戻す。
    if (window.scrollX !== oldX || window.scrollY !== oldY) window.scrollTo(oldX, oldY);
    if (host !== window && (host.scrollX !== parentX || host.scrollY !== parentY)) host.scrollTo(parentX, parentY);
  }

  let pending = false;
  function schedule() {
    if (!pending) { pending = true; window.requestAnimationFrame(() => { pending = false; growBody(); }); }
  }

  body.addEventListener("input", event => { if (!event.isComposing) schedule(); });
  body.addEventListener("compositionend", schedule);
  body.addEventListener("diary-content-changed", schedule);
  // 画面回転などで表示幅が変わったときも再計測する。
  host.addEventListener("resize", schedule);
  window.addEventListener("resize", schedule);
  schedule();
})();
