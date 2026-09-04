(function () {
  "use strict";
  const icons = {
    edit: '<path d="m4 16-1 5 5-1L20 8l-4-4Z"/><path d="m14 6 4 4"/>',
    delete: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>'
  };
  function el(tag, className, value, parent) {
    const node = document.createElement(tag); node.className = className; node.textContent = value;
    parent.appendChild(node); return node;
  }
  function btn(parent, label, action, icon) {
    const b = el("button", icon ? "quote-icon" : "quote-button", icon ? "" : label, parent);
    b.type = "button"; b.setAttribute("aria-label", label); b.title = label;
    if (icon) b.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + icons[icon] + '</svg>';
    b.addEventListener("click", () => action(b)); return b;
  }
  function mount(card, character, persist) {
    const section = el("section", "quote-section", "", card);
    el("h3", "m-field-label", "セリフ", section);
    const rows = el("div", "quote-list", "", section);
    const status = el("p", "quote-status", "", section); status.setAttribute("role", "status");
    const entries = () => Array.isArray(character.quotes) ? character.quotes : [];
    function commit(next) {
      const previous = character.quotes; character.quotes = next;
      let success = false;
      try { success = persist() === true; } catch (_) {}
      if (!success) {
        if (previous === undefined) delete character.quotes; else character.quotes = previous;
        return false;
      }
      return true;
    }
    async function copy(value, source) {
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
        else {
          const temp = el("textarea", "quote-copy-buffer", "", section); temp.value = value; temp.readOnly = true;
          try { temp.select(); if (!document.execCommand("copy")) throw Error("copy"); }
          finally { temp.remove(); source.focus({ preventScroll: true }); }
        }
        status.textContent = "コピーしました。";
      } catch (_) { status.textContent = "コピーできませんでした。セリフの文字を選択してコピーしてください。"; }
    }
    function edit(index, source) {
      const background = card.parentElement, oldInert = background.inert;
      background.inert = true;
      const overlay = el("div", "quote-editor-overlay", "", document.getElementById("app"));
      const modal = el("section", "quote-editor", "", overlay);
      modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "quote-editor-heading");
      el("h2", "", index === null ? "セリフを追加" : "セリフを編集", modal).id = "quote-editor-heading";
      el("p", "quote-speaker", character.name, modal);
      const input = el("input", "m-input", "", modal); input.type = "text";
      input.setAttribute("aria-label", "セリフ"); input.placeholder = "セリフを入力";
      input.value = index === null ? "" : entries()[index].text;
      const error = el("p", "quote-status", "", modal); error.setAttribute("role", "alert");
      const actions = el("div", "quote-editor-actions", "", modal);
      function close() { input.blur(); overlay.remove(); background.inert = oldInert; source.focus({ preventScroll: true }); }
      const save = btn(actions, "保存", () => {
        if (!input.value.trim()) { error.textContent = "セリフを入力してください。"; return; }
        const next = entries().slice();
        if (index === null) next.push({ id: "q" + Date.now() + Math.random().toString(16).slice(2), text: input.value });
        else next[index] = { ...next[index], text: input.value };
        if (!commit(next)) { error.textContent = "保存できませんでした。入力内容を控えて、端末の空き容量などをご確認ください。"; return; }
        close(); render(); status.textContent = "セリフを保存しました。"; add.focus({ preventScroll: true });
      });
      const cancel = btn(actions, "閉じる", close);
      overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
      modal.addEventListener("keydown", e => {
        if (e.key === "Escape") { e.preventDefault(); close(); }
        if (e.key === "Enter" && e.target === input && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); save.click(); }
        if (e.key === "Tab") {
          if (e.shiftKey && document.activeElement === input) { e.preventDefault(); cancel.focus(); }
          else if (!e.shiftKey && document.activeElement === cancel) { e.preventDefault(); input.focus(); }
        }
      });
      input.focus();
    }
    function render() {
      rows.replaceChildren();
      entries().forEach((quote, index) => {
        const row = el("div", "quote-row", "", rows);
        el("span", "quote-text", quote.text, row);
        const actions = el("div", "quote-actions", "", row);
        btn(actions, "セリフを編集", source => edit(index, source), "edit");
        btn(actions, "セリフを削除", () => {
          if (!window.confirm("このセリフを削除しますか？")) return;
          if (!commit(entries().filter((_, i) => i !== index))) { status.textContent = "削除を保存できませんでした。セリフは残しています。"; return; }
          render(); status.textContent = "セリフを削除しました。"; add.focus({ preventScroll: true });
        }, "delete");
        btn(actions, "セリフをコピー", source => copy(quote.text, source), "copy");
      });
      if (!entries().length) el("p", "quote-status", "セリフはまだありません。", rows);
    }
    const add = btn(section, "＋ セリフを追加", source => edit(null, source));
    render();
  }
  window.SaniwaQuotes = { mount };
})();
