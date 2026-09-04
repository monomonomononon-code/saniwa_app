(function () {
  "use strict";
  // Independent of profile/calculator storage. Seed only on the first visit.
  const STORAGE_KEY = "saniwa-tool.diary.v1";
  const $ = id => document.getElementById("diary-" + id);
  const blankChapter = title => ({ title, body: "" });
  const today = () => new Date().toLocaleDateString("ja-JP");
  let works = [], activeWork = null, activeChapter = null, blocked = false, dirty = false;
  function message(text) { $("status").textContent = text; }
  function valid(data) {
    return data && data.version === 1 && Array.isArray(data.works) && data.works.every(work =>
      work && typeof work.title === "string" && typeof work.date === "string" && Array.isArray(work.chapters) &&
      work.chapters.every(ch => ch && typeof ch.title === "string" && typeof ch.body === "string"));
  }
  function persist() {
    if (blocked) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, works }));
      dirty = false;
      message("保存しました（この端末・ブラウザ内）");
      return true;
    } catch (_) {
      dirty = true;
      message("保存できませんでした。画面を閉じずに本文をコピーして保管してください。保存ボタンで再試行できます。");
      return false;
    }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      works = [{ title: "日誌", date: today(), chapters: [blankChapter("本日の出来事")] }];
      persist();
    } else {
      const data = JSON.parse(raw);
      if (!valid(data)) throw new Error("Invalid diary data");
      works = data.works;
    }
  } catch (_) {
    blocked = true;
    message("保存済みの日誌を読み込めませんでした。データ保護のため編集を停止しています。元の保存データは変更していません。");
  }
  const titleOf = item => item.title.trim() || "（タイトル未設定）";
  const count = work => work.chapters.reduce((sum, ch) => sum + ch.body.length, 0);
  function button(text, action, className) {
    const el = document.createElement("button");
    el.type = "button"; el.textContent = text; el.className = className || "";
    el.addEventListener("click", action);
    return el;
  }
  function screen(name) {
    for (const id of ["works", "chapters", "editor"]) $(id).hidden = id !== name;
    if (name === "editor") $("body").dispatchEvent(new Event("diary-editor-open"));
  }
  function openCard(item, meta, action) {
    const card = document.createElement("div"); card.className = "diary-card";
    const open = button("", action, "diary-open");
    const title = document.createElement("strong"); title.textContent = titleOf(item);
    const small = document.createElement("small"); small.className = "diary-meta"; small.textContent = meta;
    open.append(title, small); card.append(open);
    return card;
  }
  function renderWorks() {
    const list = $("work-list"); list.replaceChildren();
    for (const work of works) {
      const card = openCard(work, `${work.date} · ${count(work).toLocaleString()}文字`, () => {
        activeWork = work; renderChapters(); screen("chapters", "work-title");
      });
      const actions = document.createElement("div"); actions.className = "diary-actions";
      actions.append(button("タイトル編集", () => {
        const title = window.prompt("作品タイトル", work.title);
        if (title === null || !title.trim()) return;
        work.title = title.trim(); work.date = today(); persist(); renderWorks();
      }), button("削除", () => {
        if (!window.confirm(`「${titleOf(work)}」を削除しますか？\n含まれる章と本文も削除されます。この操作は取り消せません。`)) return;
        works = works.filter(item => item !== work); persist(); renderWorks();
      }));
      card.append(actions); list.append(card);
    }
    if (!works.length && !blocked) {
      const empty = document.createElement("p"); empty.className = "diary-meta";
      empty.textContent = "作品はまだありません。「新規作品」から追加できます。"; list.append(empty);
    }
  }
  function renderChapters() {
    $("work-title").textContent = titleOf(activeWork);
    $("work-total").textContent = `${count(activeWork).toLocaleString()}文字`;
    const list = $("chapter-list"); list.replaceChildren();
    for (const chapter of activeWork.chapters) {
      list.append(openCard(chapter, `${chapter.body.length.toLocaleString()}文字`, () => {
        activeChapter = chapter;
        $("chapter-title").value = chapter.title; $("body").value = chapter.body;
        $("chapter-heading").textContent = titleOf(chapter);
        $("chapter-title-edit").hidden = true;
        $("chapter-title-display").hidden = false;
        $("back-chapters").textContent = "← " + titleOf(activeWork);
        updateCount(); screen("editor", "chapter-title");
      }));
    }
  }
  function updateCount() { $("char-count").textContent = `${$("body").value.length.toLocaleString()}文字`; }
  function saveEditor() {
    if (!activeChapter || blocked) return;
    activeChapter.title = $("chapter-title").value;
    activeChapter.body = $("body").value;
    activeWork.date = today(); updateCount(); persist();
  }
  $("new-work").addEventListener("click", () => {
    if (blocked) return;
    const title = window.prompt("新規作品のタイトル", "新しい作品");
    if (title === null || !title.trim()) return;
    works.unshift({ title: title.trim(), date: today(), chapters: [blankChapter("第一章")] });
    persist(); renderWorks();
  });
  $("add-chapter").addEventListener("click", () => {
    activeWork.chapters.push(blankChapter("（タイトル未設定）")); activeWork.date = today();
    persist(); renderChapters();
  });
  $("back-works").addEventListener("click", () => { renderWorks(); screen("works", "new-work"); });
  $("back-chapters").addEventListener("click", () => { saveEditor(); renderChapters(); screen("chapters", "work-title"); });
  $("save").addEventListener("click", saveEditor);
  $("edit-title").addEventListener("click", () => {
    $("chapter-title-display").hidden = true;
    $("chapter-title-edit").hidden = false;
    $("chapter-title").focus();
  });
  function finishTitleEdit() {
    saveEditor();
    $("chapter-heading").textContent = titleOf(activeChapter);
    $("chapter-title-edit").hidden = true;
    $("chapter-title-display").hidden = false;
    $("chapter-title").blur();
  }
  $("title-done").addEventListener("click", finishTitleEdit);
  $("chapter-title").addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault(); finishTitleEdit();
    }
  });
  $("chapter-title").addEventListener("input", saveEditor);
  const body = $("body"), INDENT = "　";
  function stripIndent() {
    const pos = body.selectionStart;
    const start = body.value.lastIndexOf("\n", pos - 1) + 1;
    if (body.value[start] === INDENT && "「」―—』『".includes(body.value[start + 1] || "\0")) {
      const end = body.selectionEnd;
      body.value = body.value.slice(0, start) + body.value.slice(start + 1);
      body.setSelectionRange(Math.max(start, pos - 1), Math.max(start, end - 1));
    }
  }
  function insert(text, offset) {
    const pos = body.selectionStart;
    body.value = body.value.slice(0, pos) + text + body.value.slice(body.selectionEnd);
    const caret = pos + (offset === undefined ? text.length : offset);
    body.focus(); body.setSelectionRange(caret, caret); stripIndent(); saveEditor();
    body.dispatchEvent(new Event("diary-content-changed"));
  }
  function enter(event) {
    if (event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    const pos = body.selectionStart;
    const start = body.value.lastIndexOf("\n", pos - 1) + 1;
    const lineEnd = body.value.indexOf("\n", pos);
    const end = lineEnd === -1 ? body.value.length : lineEnd;
    if (body.selectionStart === body.selectionEnd && body.value.slice(start, end) === INDENT) {
      body.setSelectionRange(start, end);
    }
    insert("\n" + INDENT);
  }
  body.addEventListener("keydown", event => { if (event.key === "Enter") enter(event); });
  body.addEventListener("beforeinput", event => { if (event.inputType === "insertLineBreak" && event.cancelable) enter(event); });
  body.addEventListener("input", event => { if (!event.isComposing) stripIndent(); saveEditor(); });
  body.addEventListener("compositionend", () => { stripIndent(); saveEditor(); });
  $("insert-brackets").addEventListener("click", () => insert("「」", 1));
  $("insert-dash").addEventListener("click", () => insert("――"));
  $("insert-ellipsis").addEventListener("click", () => insert("……"));
  $("insert-space").addEventListener("click", () => insert(INDENT));
  window.addEventListener("beforeunload", event => {
    if (dirty) { event.preventDefault(); event.returnValue = ""; }
  });
  renderWorks();
  if (blocked) {
    for (const el of document.querySelectorAll("#diary button, #diary input, #diary textarea")) el.disabled = true;
  }
})();
