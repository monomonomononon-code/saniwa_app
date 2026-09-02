(function(){
  const CHAR_NAMES = [
    "山姥切国広","歌仙兼定","加州清光","陸奥守吉行","蜂須賀虎徹",
    "堀川国広","薬研藤四郎","髭切","膝丸","一期一振"
  ];
  const SWORD_TYPES = ["短刀", "脇差", "打刀", "太刀", "大太刀", "槍", "薙刀", "剣"];

  let characters = CHAR_NAMES.map((n, i) => ({
    id: "c" + i, name: n,
    swordType: "", height: "", hobby: "", formerOwner: "",
    personality: "", memo: "", activationDate: "", unit: "", isCaptain: false, isKiwame: false
  }));


  const MASTER_STORAGE_KEY = "saniwa-tool.master.v1";
  try {
    const saved = JSON.parse(localStorage.getItem(MASTER_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) characters = saved;
  } catch (e) {}
  function saveState() {
    try { localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(characters)); } catch (e) {}
  }
  window.addEventListener("pagehide", saveState);
  let editingId = null;

  function notify(text) {
    saveState();
    try { window.parent && window.parent.postMessage({ source: "master", text: text }, "*"); }
    catch (e) {}
  }

  function syncCharacter(c) {
    try {
      window.parent && window.parent.postMessage({
        source: "master",
        type: "character_update",
        character: {
          id: c.id, name: c.name, swordType: c.swordType,
          activationDate: c.activationDate, unit: c.unit, isCaptain: c.isCaptain
        }
      }, "*");
    } catch (e) {}
  }

  window.addEventListener("message", e => {
    const data = e.data;
    if (!data || data.type !== "characters_sync" || !Array.isArray(data.characters)) return;
    let changed = false;
    data.characters.forEach(sc => {
      let c = characters.find(x => x.id === sc.id);
      if (!c) {
        c = {
          id: sc.id, name: sc.name, swordType: "",
          height: "", hobby: "", formerOwner: "", personality: "", memo: "",
          activationDate: "", unit: "", isCaptain: false, isKiwame: false
        };
        characters.push(c);
        changed = true;
      }
      c.name = sc.name;
      c.swordType = sc.swordType || c.swordType || "";
      c.activationDate = sc.activationDate || c.activationDate || "";
      c.unit = sc.unit || c.unit || "";
      c.isCaptain = !!sc.isCaptain;
    });
    if (changed) render();
  });
  try { window.parent && window.parent.postMessage({ source: "master", type: "ready" }, "*"); } catch (e) {}

  function root() { return document.getElementById("app"); }

  function render() {
    const el = root();
    el.innerHTML = "";

    const header = document.createElement("div");
    header.className = "header";
    header.innerHTML = `
      <h1><span class="seal">刀</span>刀剣男士</h1>
      <p>タップで各キャラの設定を編集できます。メモ欄は何でも自由に書けます。</p>
    `;
    el.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "char-grid";
    characters.forEach(c => {
      const card = document.createElement("button");
      card.className = "char-card";
      card.innerHTML = `
        <div class="ctop">
          <div class="cname">${c.name}</div>
          ${c.isCaptain ? '<div class="ccaptain">隊長</div>' : ""}
        </div>
        <div class="ctype">${c.swordType || "刀種未設定"}${c.unit ? "　" + c.unit + "配属中" : ""}</div>
        ${c.memo ? `<div class="cmemo">${escapeHtml(c.memo)}</div>` : ""}
      `;
      card.onclick = () => { editingId = c.id; render(); };
      grid.appendChild(card);
    });
    el.appendChild(grid);

    const addRow = document.createElement("div");
    addRow.className = "add-char-row";
    const addToggle = document.createElement("button");
    addToggle.className = "add-char-toggle";
    addToggle.textContent = "＋ 新入男士を追加";
    const addForm = document.createElement("div");
    addForm.className = "add-char-form";
    addForm.innerHTML = `
      <input id="new-char-name" placeholder="名前(例：獅子王)" />
      <select id="new-char-type">
        <option value="">刀種を選択</option>
        ${SWORD_TYPES.map(type => `<option value="${type}">${type}</option>`).join("")}
      </select>
      <button class="add-char-submit" id="new-char-submit">この内容で追加</button>
    `;
    addToggle.onclick = () => addForm.classList.toggle("open");
    addRow.appendChild(addToggle);
    addRow.appendChild(addForm);
    el.appendChild(addRow);

    if (editingId) el.appendChild(renderEditModal(editingId));

    const submitBtn = document.getElementById("new-char-submit");
    if (submitBtn) {
      submitBtn.onclick = () => {
        const nameEl = document.getElementById("new-char-name");
        const typeEl = document.getElementById("new-char-type");
        const name = nameEl.value.trim();
        if (!name) return;
        const newChar = {
          id: "c" + Date.now(),
          name,
          swordType: typeEl.value.trim(),
          height: "", hobby: "", formerOwner: "", personality: "", memo: "",
          activationDate: "", unit: "", isCaptain: false, isKiwame: false
        };
        characters.push(newChar);
        notify(`新入り「${newChar.name}」を追加`);
        syncCharacter(newChar);
        render();
      };
    }
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderEditModal(charId) {
    const c = characters.find(x => x.id === charId);
    if (!c) return document.createElement("div");

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.onclick = e => { if (e.target === overlay) closeModal(); };

    const card = document.createElement("div");
    card.className = "modal-card";

    const eyebrow = document.createElement("div");
    eyebrow.className = "m-eyebrow";
    eyebrow.textContent = "刀剣男士 設定編集";
    card.appendChild(eyebrow);

    const h2 = document.createElement("h2");
    h2.textContent = c.name;
    card.appendChild(h2);

    function field(labelText, key, placeholder) {
      const lbl = document.createElement("div");
      lbl.className = "m-field-label";
      lbl.textContent = labelText;
      card.appendChild(lbl);
      const input = document.createElement("input");
      input.className = "m-input";
      input.placeholder = placeholder || "";
      input.value = c[key];
      input.oninput = e => { c[key] = e.target.value; };
      card.appendChild(input);
    }

    const swordTypeLabel = document.createElement("div");
    swordTypeLabel.className = "m-field-label";
    swordTypeLabel.textContent = "刀種";
    card.appendChild(swordTypeLabel);
    const swordTypeSelect = document.createElement("select");
    swordTypeSelect.className = "m-input";
    swordTypeSelect.innerHTML = `<option value="">未選択</option>${SWORD_TYPES.map(type => `<option value="${type}">${type}</option>`).join("")}`;
    swordTypeSelect.value = c.swordType;
    swordTypeSelect.onchange = e => {
      c.swordType = e.target.value;
      if (!c.swordType) c.isKiwame = false;
      render();
    };
    card.appendChild(swordTypeSelect);

    if (c.swordType) {
      const kiwameRow = document.createElement("div");
      kiwameRow.className = "toggle-row";
      kiwameRow.innerHTML = `<div class="tlabel">極にする</div>`;
      const kiwameBtn = document.createElement("button");
      kiwameBtn.className = "toggle-switch" + (c.isKiwame ? " on" : "");
      kiwameBtn.innerHTML = `<span class="knob"></span>`;
      kiwameBtn.onclick = () => { c.isKiwame = !c.isKiwame; render(); };
      kiwameRow.appendChild(kiwameBtn);
      card.appendChild(kiwameRow);
    }

    const dateLabel = document.createElement("div");
    dateLabel.className = "m-field-label";
    dateLabel.textContent = "顕現した年月日";
    card.appendChild(dateLabel);
    const dateInput = document.createElement("input");
    dateInput.className = "m-input";
    dateInput.type = "date";
    dateInput.value = c.activationDate;
    dateInput.oninput = e => { c.activationDate = e.target.value; };
    card.appendChild(dateInput);

    const unitLabel = document.createElement("div");
    unitLabel.className = "m-field-label";
    unitLabel.textContent = "配属部隊";
    card.appendChild(unitLabel);
    const unitSelect = document.createElement("select");
    unitSelect.className = "m-input";
    unitSelect.innerHTML = `
      <option value="">未選択</option>
      <option value="第一部隊">第一部隊</option>
      <option value="第二部隊">第二部隊</option>
      <option value="第三部隊">第三部隊</option>
      <option value="第四部隊">第四部隊</option>
      <option value="第五部隊">第五部隊</option>
    `;
    unitSelect.value = c.unit;
    unitSelect.onchange = e => {
      c.unit = e.target.value;
      if (!c.unit) c.isCaptain = false;
      render();
    };
    card.appendChild(unitSelect);

    if (c.unit) {
      const captainRow = document.createElement("div");
      captainRow.className = "toggle-row";
      captainRow.innerHTML = `<div class="tlabel">部隊長にする</div>`;
      const captainBtn = document.createElement("button");
      captainBtn.className = "toggle-switch" + (c.isCaptain ? " on" : "");
      captainBtn.innerHTML = `<span class="knob"></span>`;
      captainBtn.onclick = () => { c.isCaptain = !c.isCaptain; render(); };
      captainRow.appendChild(captainBtn);
      card.appendChild(captainRow);
    }

    field("身長", "height", "例：170cm");
    field("趣味", "hobby", "例：刀の手入れ");
    field("元主", "formerOwner", "例：織田信長");
    field("性格", "personality", "例：面倒見がいいが素直じゃない");

    const memoLabel = document.createElement("div");
    memoLabel.className = "m-field-label";
    memoLabel.textContent = "メモ";
    card.appendChild(memoLabel);
    const memoInput = document.createElement("textarea");
    memoInput.className = "m-textarea";
    memoInput.placeholder = "自由に書いてください";
    memoInput.value = c.memo;
    memoInput.oninput = e => { c.memo = e.target.value; };
    card.appendChild(memoInput);
    const hint = document.createElement("div");
    hint.className = "memo-hint";
    hint.textContent = "例：「育成中、経験値〇〇」「初期刀」「審神者と結婚した」など、何でも自由に";
    card.appendChild(hint);

    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.textContent = "閉じる";
    closeBtn.onclick = closeModal;
    card.appendChild(closeBtn);

    overlay.appendChild(card);
    return overlay;
  }

  function closeModal() {
    const c = characters.find(x => x.id === editingId);
    if (c) {
      notify(`${c.name}のプロフィールを更新`);
      syncCharacter(c);
    }
    editingId = null;
    render();
  }

  render();
})();

