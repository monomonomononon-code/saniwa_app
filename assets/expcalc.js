(function(){
  const CHAR_NAMES = [
    "山姥切国広","歌仙兼定","加州清光","陸奥守吉行","蜂須賀虎徹",
    "堀川国広","薬研藤四郎","髭切","膝丸","一期一振"
  ];

  let characters = CHAR_NAMES.map((n, i) => ({
    id: "c" + i, name: n,
    swordType: "", level: "", unit: "", isCaptain: false, isKiwame: false, activationDate: "",
    currentExp: null, targetExp: null, perLoopExp: null
  }));

  let selectedId = characters[0] ? characters[0].id : null;
  let activeTool = null;
  let mapCategory = "";
  let selectedBattlefield = "";
  let selectedStage = "";
  let selectedBattleResult = "";

  const BATTLEFIELDS = {
    past: ["①維新の記憶", "②江戸の記憶"],
    event: ["大阪城", "夜花奪還作成"]
  };
  const ISSHIN_STAGES = ["1-1 箱館", "1-2 会津", "1-3 宇都宮", "1-4 鳥羽"];

  function notify(text) {
    try { window.parent && window.parent.postMessage({ source: "expcalc", text: text }, "*"); }
    catch (e) {}
  }

  window.addEventListener("message", e => {
    const data = e.data;
    if (!data || data.type !== "characters_sync" || !Array.isArray(data.characters)) return;
    data.characters.forEach(sc => {
      let c = characters.find(x => x.id === sc.id);
      if (!c) {
        c = {
          id: sc.id, name: sc.name, swordType: "", level: "", unit: "", isCaptain: false, isKiwame: false, activationDate: "",
          currentExp: null, targetExp: null, perLoopExp: null
        };
        characters.push(c);
      }
      c.name = sc.name;
      c.swordType = sc.swordType || "";
      c.level = sc.level || "";
      c.unit = sc.unit || "";
      c.isCaptain = !!sc.isCaptain;
      c.isKiwame = !!sc.isKiwame;
      c.activationDate = sc.activationDate || "";
    });
    if (!selectedId && characters[0]) selectedId = characters[0].id;
    render();
  });
  try { window.parent && window.parent.postMessage({ source: "expcalc", type: "ready" }, "*"); } catch (e) {}

  function root() { return document.getElementById("app"); }

  function render() {
    if (activeTool === "experience") return renderExperience();
    if (activeTool === "event") return renderEventNorm();
    renderToolMenu();
  }

  function renderToolMenu() {
    const el = root();
    el.innerHTML = "";

    const header = document.createElement("div");
    header.className = "header";
    header.innerHTML = `
      <h1><span class="seal">戦</span>戦績</h1>
      <p>利用する計算機を選択してください。</p>
    `;
    el.appendChild(header);

    const menu = document.createElement("div");
    menu.className = "tool-menu";
    menu.appendChild(makeToolButton("戦", "経験値計算", "目標までに必要な周回数を計算", () => {
      activeTool = "experience";
      render();
    }));
    menu.appendChild(makeToolButton("祭", "イベントノルマ", "イベント向けの計算機（準備中）", () => {
      activeTool = "event";
      render();
    }));
    el.appendChild(menu);
  }

  function makeToolButton(glyph, title, description, action) {
    const button = document.createElement("button");
    button.className = "tool-menu-button";
    button.innerHTML = `<span class="tool-menu-icon">${glyph}</span><span><strong>${title}</strong><small>${description}</small></span>`;
    button.onclick = action;
    return button;
  }

  function addBackToMenu(el) {
    const button = document.createElement("button");
    button.className = "tool-menu-back";
    button.textContent = "← 戦績";
    button.onclick = () => { activeTool = null; render(); };
    el.appendChild(button);
  }

  function renderEventNorm() {
    const el = root();
    el.innerHTML = "";
    addBackToMenu(el);

    const header = document.createElement("div");
    header.className = "header";
    header.innerHTML = `
      <h1><span class="seal">祭</span>イベントノルマ</h1>
      <p>準備中です。</p>
    `;
    el.appendChild(header);
  }

  function renderExperience() {
    const el = root();
    el.innerHTML = "";
    addBackToMenu(el);

    const header = document.createElement("div");
    header.className = "header";
    header.innerHTML = `
      <h1><span class="seal">戦</span>経験値計算機</h1>
      <p>刀剣男士を選んでから、経験値を入力してください。</p>
    `;
    el.appendChild(header);

    const selectWrap = document.createElement("div");
    selectWrap.className = "select-wrap";
    const selectLabel = document.createElement("div");
    selectLabel.className = "select-label";
    selectLabel.textContent = "刀剣男士を選択";
    selectWrap.appendChild(selectLabel);
    const select = document.createElement("select");
    select.className = "char-select";
    characters.forEach(c => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name;
      if (c.id === selectedId) o.selected = true;
      select.appendChild(o);
    });
    select.onchange = e => { selectedId = e.target.value; render(); };
    selectWrap.appendChild(select);
    el.appendChild(selectWrap);

    const c = characters.find(x => x.id === selectedId);
    if (!c) {
      const hint = document.createElement("div");
      hint.className = "empty-hint";
      hint.textContent = "刀剣男士を選択してください";
      el.appendChild(hint);
      return;
    }

    const infoCard = document.createElement("div");
    infoCard.className = "info-card";
    infoCard.innerHTML = `
      <div class="info-name">${c.name}</div>
      <div class="info-row"><span>刀種</span><span>${c.swordType || ""}</span></div>
      <div class="info-row"><span>レベル</span><span>${c.level ? `Lv.${c.level}` : ""}</span></div>
      <div class="info-row"><span>配属部隊</span><span>${c.unit || ""}${c.unit && c.isCaptain ? '<span class="captain-badge">部隊長</span>' : ""}</span></div>
      <div class="info-row"><span>顕現した年月日</span><span>${c.activationDate || ""}</span></div>
    `;
    el.appendChild(infoCard);

    if (c.unit) {
      const teammates = characters.filter(member => member.id !== c.id && member.unit === c.unit);
      const unitCard = document.createElement("div");
      unitCard.className = "unit-card";
      const unitTitle = document.createElement("div");
      unitTitle.className = "unit-title";
      unitTitle.textContent = `${c.unit}の刀剣男士`;
      unitCard.appendChild(unitTitle);
      if (teammates.length === 0) {
        const empty = document.createElement("div");
        empty.className = "unit-empty";
        empty.textContent = "ほかに配属されている刀剣男士はいません";
        unitCard.appendChild(empty);
      } else {
        teammates.forEach(member => {
          const row = document.createElement("div");
          row.className = "unit-member";
          row.innerHTML = `<span>${member.name}</span><span>${member.swordType || "刀種未設定"}${member.isKiwame ? "　極" : "　初"}${member.level ? `　Lv.${member.level}` : ""}</span>`;
          unitCard.appendChild(row);
        });
      }
      el.appendChild(unitCard);

      const mapSelector = document.createElement("div");
      mapSelector.className = "map-selector";
      const mapButtons = document.createElement("div");
      mapButtons.className = "map-category-buttons";
      [
        ["past", "過去の合戦場"],
        ["event", "イベントマップ"]
      ].forEach(([category, label]) => {
        const button = document.createElement("button");
        button.className = "map-category-button" + (mapCategory === category ? " selected" : "");
        button.textContent = mapCategory === category ? `⚔ ${label}` : label;
        button.onclick = () => {
          mapCategory = category;
          selectedBattlefield = "";
          selectedStage = "";
          selectedBattleResult = "";
          render();
        };
        mapButtons.appendChild(button);
      });
      mapSelector.appendChild(mapButtons);

      if (mapCategory) {
        const battlefieldLabel = document.createElement("div");
        battlefieldLabel.className = "select-label battlefield-label";
        battlefieldLabel.textContent = "合戦場を選択";
        mapSelector.appendChild(battlefieldLabel);
        const battlefieldSelect = document.createElement("select");
        battlefieldSelect.className = "char-select battlefield-select";
        battlefieldSelect.innerHTML = `<option value="">選択してください</option>${BATTLEFIELDS[mapCategory].map(name => `<option value="${name}">${name}</option>`).join("")}`;
        battlefieldSelect.value = selectedBattlefield;
        battlefieldSelect.onchange = e => {
          selectedBattlefield = e.target.value;
          selectedStage = "";
          selectedBattleResult = "";
          render();
        };
        mapSelector.appendChild(battlefieldSelect);

        if (mapCategory === "past" && selectedBattlefield === "①維新の記憶") {
          const stageLabel = document.createElement("div");
          stageLabel.className = "select-label battlefield-label";
          stageLabel.textContent = "マップを選択";
          mapSelector.appendChild(stageLabel);
          const stageSelect = document.createElement("select");
          stageSelect.className = "char-select battlefield-select";
          stageSelect.innerHTML = `<option value="">選択してください</option>${ISSHIN_STAGES.map(name => `<option value="${name}">${name}</option>`).join("")}`;
          stageSelect.value = selectedStage;
          stageSelect.onchange = e => {
            selectedStage = e.target.value;
            selectedBattleResult = "";
            render();
          };
          mapSelector.appendChild(stageSelect);

          if (selectedStage) {
            const resultLabel = document.createElement("div");
            resultLabel.className = "select-label battlefield-label";
            resultLabel.textContent = "想定する戦闘結果";
            mapSelector.appendChild(resultLabel);
            const resultSelect = document.createElement("select");
            resultSelect.className = "char-select battlefield-select";
            resultSelect.innerHTML = `<option value="">選択してください</option>${["完全勝利S", "勝利A", "勝利B", "勝利C"].map(name => `<option value="${name}">${name}</option>`).join("")}`;
            resultSelect.value = selectedBattleResult;
            resultSelect.onchange = e => { selectedBattleResult = e.target.value; };
            mapSelector.appendChild(resultSelect);
          }
        }
      }
      el.appendChild(mapSelector);
    }

    const expCard = document.createElement("div");
    expCard.className = "exp-card";
    expCard.appendChild(makeRow("現在の経験値", c, "currentExp"));
    expCard.appendChild(makeRow("目標経験値", c, "targetExp"));
    expCard.appendChild(makeRow("1周で得る経験値", c, "perLoopExp"));

    const result = document.createElement("div");
    result.className = "exp-result";
    const r = computeResult(c);
    result.textContent = r.text;
    result.classList.add(r.cls);
    expCard.appendChild(result);

    el.appendChild(expCard);
  }

  function makeRow(labelText, c, key) {
    const row = document.createElement("div");
    row.className = "exp-row";
    const label = document.createElement("label");
    label.textContent = labelText;
    const input = document.createElement("input");
    input.type = "number";
    input.inputMode = "numeric";
    input.placeholder = "未入力";
    input.value = c[key] === null ? "" : c[key];
    input.oninput = e => {
      c[key] = e.target.value === "" ? null : Number(e.target.value);
      updateResultOnly(c);
    };
    input.onblur = () => notify(`${c.name}の経験値情報を更新`);
    row.appendChild(label);
    row.appendChild(input);
    return row;
  }

  function computeResult(c) {
    if (c.currentExp === null || c.targetExp === null || c.perLoopExp === null) {
      return { text: "3項目とも入力すると周回数が出ます", cls: "empty" };
    }
    const remaining = c.targetExp - c.currentExp;
    if (remaining <= 0) {
      return { text: "→ すでに目標達成です！", cls: "done" };
    }
    if (c.perLoopExp <= 0) {
      return { text: "1周の経験値を1以上で入力してください", cls: "empty" };
    }
    const loops = Math.ceil(remaining / c.perLoopExp);
    return { text: `→ あと${loops}周！`, cls: "" };
  }

  function updateResultOnly(c) {
    const resultEl = document.querySelector(".exp-result");
    if (!resultEl) return;
    const r = computeResult(c);
    resultEl.textContent = r.text;
    resultEl.className = "exp-result " + r.cls;
  }

  render();
})();

