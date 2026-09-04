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
  let selectedMapVariant = "";
  let selectedBattleResult = "";
  let selectedMvp = "部隊内で均等";
  let isDoubleExperience = false;

  const BATTLEFIELDS = {
    past: [
      "維新の記憶", "江戸の記憶", "織豊の記憶", "戦国の記憶",
      "武家の記憶", "池田屋の記憶", "延享の記憶", "青野原の記憶"
    ],
    event: ["大阪城", "夜花奪還作戦"]
  };
  const EVENT_STAGES = { "夜花奪還作戦": "yoka-2026-edo-shitamachi" };
  const NORMAL_MAPS = {
    "維新の記憶": ["1-1 函館", "1-2 会津", "1-3 宇都宮", "1-4 鳥羽"],
    "江戸の記憶": ["2-1 鳥羽", "2-2 江戸", "2-3 江戸（元禄）", "2-4 大阪（大阪冬の陣）"],
    "織豊の記憶": ["3-1 関ヶ原", "3-2 本能寺", "3-3 越前", "3-4 安土"],
    "戦国の記憶": ["4-1 長篠", "4-2 三方ヶ原", "4-3 桶狭間", "4-4 京都（西陣）"],
    "武家の記憶": ["5-1 鎌倉（元弘の乱）", "5-2 博多湾（元寇）", "5-3 墨俣（承久の乱）", "5-4 厚樫山（阿津賀志山の戦い）"],
    "池田屋の記憶": ["6-1 京都（市中）", "6-2 京都（三条大橋）", "6-3 京都（池田屋二階）", "6-4 京都（池田屋一階）"],
    "延享の記憶": ["7-1 江戸（新橋）", "7-2 江戸（白金台）", "7-3 江戸（江戸城下）", "7-4 江戸（江戸城内）"],
    "青野原の記憶": ["8-1 京都（阿弥陀ヶ峰）", "8-2 信濃（上田城）", "8-3 美濃（青野原）", "8-4 京都（五条）"]
  };

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
          selectedMapVariant = "";
          selectedBattleResult = "";
          selectedMvp = "部隊内で均等";
          isDoubleExperience = false;
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
          selectedStage = mapCategory === "event" ? EVENT_STAGES[selectedBattlefield] || "" : "";
          selectedMapVariant = "";
          selectedBattleResult = "";
          selectedMvp = "部隊内で均等";
          isDoubleExperience = false;
          render();
        };
        mapSelector.appendChild(battlefieldSelect);

        if (mapCategory === "past" && NORMAL_MAPS[selectedBattlefield]) {
          const stageLabel = document.createElement("div");
          stageLabel.className = "select-label battlefield-label";
          stageLabel.textContent = "マップを選択";
          mapSelector.appendChild(stageLabel);
          const stageSelect = document.createElement("select");
          stageSelect.className = "char-select battlefield-select";
          stageSelect.innerHTML = `<option value="">選択してください</option>${NORMAL_MAPS[selectedBattlefield].map(name => `<option value="${name}">${name}</option>`).join("")}`;
          stageSelect.value = selectedStage;
          stageSelect.onchange = e => {
            selectedStage = e.target.value;
            selectedMapVariant = "";
            selectedBattleResult = "";
            selectedMvp = "部隊内で均等";
            isDoubleExperience = false;
            render();
          };
          mapSelector.appendChild(stageSelect);
        }

        if (selectedStage) {
          const mapVariants = window.ExperienceCalculator.getMapVariants(selectedStage);
          if (mapVariants.length > 0) {
            const routeLabel = document.createElement("label");
            routeLabel.className = "select-label battlefield-label";
            routeLabel.style.display = "block";
            routeLabel.textContent = "ルートを選択";
            routeLabel.htmlFor = "map-variant-select";
            mapSelector.appendChild(routeLabel);
            const routeSelect = document.createElement("select");
            routeSelect.id = "map-variant-select";
            routeSelect.className = "char-select battlefield-select";
            routeSelect.innerHTML = '<option value="">選択してください</option>';
            mapVariants.forEach(variant => {
              const option = document.createElement("option");
              option.value = variant.id;
              option.textContent = variant.label;
              routeSelect.appendChild(option);
            });
            routeSelect.value = selectedMapVariant;
            routeSelect.onchange = e => {
              selectedMapVariant = e.target.value;
              selectedBattleResult = "";
              selectedMvp = "部隊内で均等";
              isDoubleExperience = false;
              render();
            };
            mapSelector.appendChild(routeSelect);
          }

          if (selectedStage && (mapVariants.length === 0 || mapVariants.some(variant => variant.id === selectedMapVariant))) {
            const resultLabel = document.createElement("div");
            resultLabel.className = "select-label battlefield-label";
            resultLabel.textContent = "想定する戦闘結果";
            mapSelector.appendChild(resultLabel);
            const resultSelect = document.createElement("select");
            resultSelect.className = "char-select battlefield-select";
            resultSelect.innerHTML = `<option value="">選択してください</option>${["完全勝利S", "勝利A", "勝利B", "勝利C", "敗北"].map(name => `<option value="${name}">${name}</option>`).join("")}`;
            resultSelect.value = selectedBattleResult;
            resultSelect.onchange = e => {
              selectedBattleResult = e.target.value;
              render();
            };
            mapSelector.appendChild(resultSelect);

            if (selectedBattleResult) {
              const mvpLabel = document.createElement("div");
              mvpLabel.className = "select-label battlefield-label";
              mvpLabel.textContent = "誉";
              mapSelector.appendChild(mvpLabel);
              const mvpSelect = document.createElement("select");
              mvpSelect.className = "char-select battlefield-select";
              mvpSelect.innerHTML = `${["毎回誉を取る", "誉を取らない", "部隊内で均等"].map(name => `<option value="${name}">${name}</option>`).join("")}`;
              mvpSelect.value = selectedMvp;
              mvpSelect.onchange = e => {
                selectedMvp = e.target.value;
                render();
              };
              mapSelector.appendChild(mvpSelect);

              if (selectedMvp === "部隊内で均等") {
                const mvpNote = document.createElement("div");
                mvpNote.className = "mvp-note";
                mvpNote.textContent = "※周回をしていて部隊員の桜が剥がれない状態を指します";
                mapSelector.appendChild(mvpNote);
              }

              const doubleExperienceRow = document.createElement("label");
              doubleExperienceRow.className = "double-experience-row";
              const doubleExperienceCheck = document.createElement("input");
              doubleExperienceCheck.type = "checkbox";
              doubleExperienceCheck.checked = isDoubleExperience;
              doubleExperienceCheck.onchange = e => {
                isDoubleExperience = e.target.checked;
                render();
              };
              doubleExperienceRow.appendChild(doubleExperienceCheck);
              doubleExperienceRow.append("経験値2倍CP");
              mapSelector.appendChild(doubleExperienceRow);

              renderCalculatedExperience(mapSelector, c);
            }
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

  function renderCalculatedExperience(container, character) {
    const calculator = window.ExperienceCalculator;
    if (!calculator) return;
    const resultCard = document.createElement("div");
    resultCard.className = "calculated-experience";

    const unitMembers = characters.filter(member => member.unit === character.unit);
    const unitSize = unitMembers.length;
    const calculationOptions = {
      stageName: selectedStage,
      variantId: selectedMapVariant,
      isCaptain: character.isCaptain,
      mvpMode: selectedMvp,
      unitSize,
      unitMembers,
      rank: selectedBattleResult,
      isDoubleExperience
    };
    if (mapCategory === "event") {
      renderEventCalculation(resultCard, calculator, calculationOptions);
      container.appendChild(resultCard);
      return;
    }
    const routeOutcomes = calculator.calculateMapRouteOutcomes(calculationOptions);
    if (!routeOutcomes.valid) {
      resultCard.classList.add("pending");
      resultCard.textContent = routeOutcomes.reason === "route_structure_data_missing"
        ? "ルート構造データ未登録"
        : "経験値データ未登録";
      container.appendChild(resultCard);
      return;
    }

    const expected = routeOutcomes.probabilitiesConfigured
      ? calculator.calculateMapExpectedExperience(calculationOptions)
      : calculator.calculateMapProvisionalExpectedExperience(calculationOptions);
    if (!expected.valid) {
      resultCard.classList.add("pending");
      resultCard.textContent = "ルート構造データ未登録";
      container.appendChild(resultCard);
      return;
    }

    const isProvisional = !routeOutcomes.probabilitiesConfigured && expected.usedProvisionalProbabilities;
    resultCard.innerHTML = `
      <div class="calculated-experience-label">${expected.map.routeType === "linear" ? "周回数別の獲得経験値" : "周回数別の獲得期待値"}</div>
    `;
    if (isProvisional) {
      const note = document.createElement("div");
      note.className = "provisional-note";
      note.textContent = "※分岐確率が未登録のため、各分岐を均等確率として算出した暫定値です";
      resultCard.appendChild(note);
    }
    appendLoopTotals(resultCard, calculator, expected.rawExperience, undefined, expected.rewards);
    appendCustomLoopInput(resultCard, calculator, expected.rawExperience, undefined, expected.rewards);
    if (isProvisional) appendRouteDetails(resultCard, calculator, routeOutcomes.outcomes);
    container.appendChild(resultCard);
  }

  function renderEventCalculation(card, calculator, options) {
    const result = calculator.calculateEventMapExperience(options);
    if (!result.valid) { card.textContent = "ルート構造データ未登録"; return; }
    const title = document.createElement("div");
    title.className = "calculated-experience-label";
    title.textContent = `${result.map.eventName} ${result.map.year}・${result.map.mapName}`;
    card.appendChild(title);
    if (result.usedProvisionalProbabilities) {
      const note = document.createElement("div");
      note.className = "provisional-note";
      note.textContent = result.experienceSource === "measured_average"
        ? "※資材期待値は、未登録の分岐を均等確率と仮定した暫定値です。経験値にはこの仮定を使用していません。"
        : "※分岐確率が未登録のため、各分岐を均等確率として算出した暫定値です";
      card.appendChild(note);
    }
    const resourceNote = document.createElement("div");
    resourceNote.className = "provisional-note";
    resourceNote.textContent = "※資材種類は等確率と仮定し、資材量は50＝40%・100＝40%・150＝20%で計算しています。";
    card.appendChild(resourceNote);
    const experienceNote = document.createElement("div");
    experienceNote.className = "mvp-note";
    experienceNote.textContent = result.experienceAvailable
      ? (result.experienceSource === "measured_average"
        ? `※実測基礎期待値 約${calculator.formatExperience(result.baseExperience)} EXP/周${result.measurementSampleSize ? `（サンプル数 n=${result.measurementSampleSize}周）` : ""}。ランダムルート・苦無出現の影響を含む倍率適用前の実測値に、既存の補正を適用しています。`
        : "登録された苦無出現率に基づく経験値です。")
      : (result.reason === "invalid_measurement" ? "実測値が不正なため経験値を算出できません。" : "苦無出現率が未登録のため経験値は算出待ちです。資材期待値と戦闘回数は下記で確認できます。");
    card.appendChild(experienceNote);
    appendLoopTotals(card, calculator, result.rawExperience, undefined, result.rewards);
    appendCustomLoopInput(card, calculator, result.rawExperience, undefined, result.rewards);
    const details = document.createElement("details");
    details.className = "route-details";
    const summary = document.createElement("summary");
    summary.textContent = "戦闘回数別の参考EXP（1周・ボス戦を含む）";
    details.appendChild(summary);
    const referenceNote = document.createElement("div");
    referenceNote.className = "mvp-note";
    referenceNote.textContent = result.experienceSource === "measured_average"
      ? `※${result.measurementSampleSize || "登録済み"}周実測を基にした参考値。平均${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 4 }).format(result.expectedBattleCount)}戦（均等分岐）を基準に実測平均EXPを戦闘回数で比例配分し、選択中の補正を適用しています。回数別の実測平均や正式な苦無出現率に基づく値ではありません。`
      : "※実測1周平均経験値が未登録のため、回数別の参考EXPは算出できません。";
    details.appendChild(referenceNote);
    result.battleCountReferences.forEach(reference => {
      const row = document.createElement("div");
      row.className = "route-outcome";
      const count = document.createElement("span");
      count.textContent = `${reference.battleCount}戦`;
      const experience = document.createElement("strong");
      experience.textContent = reference.rawExperience === null ? "算出待ち" : `約${calculator.formatExperience(reference.rawExperience)} EXP`;
      row.append(count, experience);
      details.appendChild(row);
    });
    card.appendChild(details);
  }

  function appendRouteDetails(card, calculator, outcomes) {
    const details = document.createElement("details");
    details.className = "route-details";
    const summary = document.createElement("summary");
    summary.textContent = "ルート別詳細";
    details.appendChild(summary);
    const uniqueOutcomes = outcomes.filter((outcome, index) => {
      return outcomes.findIndex(other => (
        other.terminal.id === outcome.terminal.id &&
        Math.abs(other.rawExperience - outcome.rawExperience) < 1e-9
      )) === index;
    });
    uniqueOutcomes.forEach(outcome => {
      const row = document.createElement("div");
      row.className = "route-outcome";
      const routeLabel = outcome.terminal.terminal === "boss" ? "ボス到達時" : "逸れ時";
      row.innerHTML = `<span>${routeLabel}（${outcome.terminal.label}）</span><strong>${calculator.formatExperience(outcome.rawExperience)} EXP</strong>`;
      details.appendChild(row);
    });
    card.appendChild(details);
  }

  function formatRewardExpectations(rewards, count) {
    return Object.entries(rewards || {}).map(([name, amount]) => {
      const formatted = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(amount * count);
      return `${name} ${formatted}${name === "依頼札" ? "枚" : ""}`;
    }).join("\n");
  }

  function appendLoopTotals(card, calculator, minExperience, maxExperience, rewards) {
    const totals = document.createElement("div");
    totals.className = "loop-totals";
    [50, 100, 200, 500].forEach(count => {
      const row = document.createElement("div");
      const minimum = minExperience === null ? null : calculator.formatExperience(minExperience * count);
      const maximum = calculator.formatExperience((maxExperience === undefined ? minExperience : maxExperience) * count);
      const rewardText = formatRewardExpectations(rewards, count);
      row.innerHTML = `<span>${count}周</span><strong>${minimum === null ? "経験値：算出待ち" : `${minimum === maximum ? minimum : `最小 ${minimum}～最大 ${maximum}`} EXP`}</strong>`;
      if (rewardText) {
        const rewardLabel = document.createElement("small");
        rewardLabel.className = "loop-reward";
        rewardLabel.textContent = rewardText;
        row.appendChild(rewardLabel);
      }
      totals.appendChild(row);
    });
    card.appendChild(totals);
  }

  function appendCustomLoopInput(card, calculator, minExperience, maxExperience, rewards) {
    const customRow = document.createElement("div");
    customRow.className = "custom-loop-row";
    const customLabel = document.createElement("label");
    customLabel.textContent = "任意の周回数";
    const customInput = document.createElement("input");
    customInput.type = "number";
    customInput.inputMode = "numeric";
    customInput.min = "1";
    customInput.step = "1";
    customInput.placeholder = "周回数";
    const customResult = document.createElement("div");
    customResult.className = "custom-loop-result";
    customInput.oninput = e => {
      const count = Number(e.target.value);
      if (!Number.isInteger(count) || count <= 0) {
        customResult.textContent = "";
        return;
      }
      const minimum = minExperience === null ? null : calculator.formatExperience(minExperience * count);
      const maximum = calculator.formatExperience((maxExperience === undefined ? minExperience : maxExperience) * count);
      const rewardText = formatRewardExpectations(rewards, count);
      customResult.textContent = `${count}周：${minimum === null ? "経験値：算出待ち" : `${minimum === maximum ? minimum : `最小 ${minimum}～最大 ${maximum}`} EXP`}${rewardText ? `\n${rewardText}` : ""}`;
    };
    customRow.append(customLabel, customInput);
    card.append(customRow, customResult);
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

