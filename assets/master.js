(function(){
  const CHAR_NAMES = [
    "山姥切国広","歌仙兼定","加州清光","陸奥守吉行","蜂須賀虎徹",
    "堀川国広","薬研藤四郎","髭切","膝丸","一期一振"
  ];
  const SWORD_TYPES = ["短刀", "脇差", "打刀", "太刀", "大太刀", "槍", "薙刀", "剣"];
  const UNITS = ["第一部隊", "第二部隊", "第三部隊", "第四部隊", "第五部隊"];
  const UNIT_CAPACITY = 6;

  // 「100振り追加」で一括登録する対象(名前・刀種)
  const BULK_CHARACTERS = [
    ["三日月宗近", "太刀"], ["小狐丸", "太刀"], ["石切丸", "大太刀"], ["岩融", "薙刀"], ["今剣", "短刀"],
    ["大典太光世", "太刀"], ["ソハヤノツルキ", "太刀"], ["数珠丸恒次", "太刀"], ["にっかり青江", "脇差"], ["鬼丸国綱", "太刀"],
    ["鳴狐", "打刀"], ["一期一振", "太刀"], ["鯰尾藤四郎", "脇差"], ["骨喰藤四郎", "脇差"], ["平野藤四郎", "短刀"],
    ["厚藤四郎", "短刀"], ["後藤藤四郎", "短刀"], ["信濃藤四郎", "短刀"], ["前田藤四郎", "短刀"], ["秋田藤四郎", "短刀"],
    ["博多藤四郎", "短刀"], ["乱藤四郎", "短刀"], ["五虎退", "短刀"], ["薬研藤四郎", "短刀"], ["包丁藤四郎", "短刀"],
    ["大包平", "太刀"], ["鶯丸", "太刀"], ["明石国行", "太刀"], ["蛍丸", "大太刀"], ["愛染国俊", "短刀"],
    ["千子村正", "打刀"], ["蜻蛉切", "槍"], ["物吉貞宗", "脇差"], ["太鼓鐘貞宗", "短刀"], ["亀甲貞宗", "打刀"],
    ["燭台切光忠", "太刀"], ["大般若長光", "太刀"], ["小竜景光", "太刀"], ["江雪左文字", "太刀"], ["宗三左文字", "打刀"],
    ["小夜左文字", "短刀"], ["加州清光", "打刀"], ["大和守安定", "打刀"], ["歌仙兼定", "打刀"], ["和泉守兼定", "打刀"],
    ["陸奥守吉行", "打刀"], ["山姥切国広", "打刀"], ["山伏国広", "太刀"], ["堀川国広", "脇差"], ["蜂須賀虎徹", "打刀"],
    ["浦島虎徹", "脇差"], ["長曽祢虎徹", "打刀"], ["髭切", "太刀"], ["膝丸", "太刀"], ["大倶利伽羅", "打刀"],
    ["へし切長谷部", "打刀"], ["不動行光", "短刀"], ["獅子王", "太刀"], ["小烏丸", "太刀"], ["同田貫正国", "打刀"],
    ["鶴丸国永", "太刀"], ["太郎太刀", "大太刀"], ["次郎太刀", "大太刀"], ["日本号", "槍"], ["御手杵", "槍"],
    ["巴形薙刀", "薙刀"], ["毛利藤四郎", "短刀"], ["篭手切江", "脇差"], ["謙信景光", "短刀"], ["小豆長光", "太刀"],
    ["日向正宗", "短刀"], ["静形薙刀", "薙刀"], ["南泉一文字", "打刀"], ["千代金丸", "太刀"], ["山姥切長義", "打刀"],
    ["豊前江", "打刀"], ["祢々切丸", "大太刀"], ["白山吉光", "剣"], ["南海太郎朝尊", "打刀"], ["肥前忠広", "脇差"],
    ["北谷菜切", "短刀"], ["桑名江", "打刀"], ["水心子正秀", "打刀"], ["源清麿", "打刀"], ["松井江", "打刀"],
    ["山鳥毛", "太刀"], ["古今伝授の太刀", "太刀"], ["地蔵行平", "打刀"], ["治金丸", "脇差"], ["日光一文字", "太刀"],
    ["太閤左文字", "短刀"], ["五月雨江", "打刀"], ["大千鳥十文字槍", "槍"], ["泛塵", "脇差"], ["一文字則宗", "太刀"],
    ["村雲江", "打刀"], ["姫鶴一文字", "太刀"], ["福島光忠", "太刀"], ["七星剣", "剣"], ["稲葉江", "打刀"]
  ];
  // 重複判定用: 半角/全角スペースを無視して比較する
  function normalizeCharName(name) {
    return String(name || "").replace(/[ 　]/g, "");
  }

  // 実装済み全刀剣男士マスターデータ(名前・刀種、128振り)。
  // 「新入男士を追加」の名前入力オートコンプリートで使用する。
  const ALL_TOUKEN_MASTER = [
    // 短刀(24)
    ["今剣", "短刀"], ["平野藤四郎", "短刀"], ["厚藤四郎", "短刀"], ["後藤藤四郎", "短刀"], ["信濃藤四郎", "短刀"],
    ["前田藤四郎", "短刀"], ["秋田藤四郎", "短刀"], ["博多藤四郎", "短刀"], ["乱藤四郎", "短刀"], ["五虎退", "短刀"],
    ["薬研藤四郎", "短刀"], ["包丁藤四郎", "短刀"], ["愛染国俊", "短刀"], ["太鼓鐘貞宗", "短刀"], ["小夜左文字", "短刀"],
    ["不動行光", "短刀"], ["毛利藤四郎", "短刀"], ["謙信景光", "短刀"], ["日向正宗", "短刀"], ["北谷菜切", "短刀"],
    ["太閤左文字", "短刀"], ["京極正宗", "短刀"], ["九鬼正宗", "短刀"], ["倶利伽羅江", "短刀"],
    // 脇差(11)
    ["にっかり青江", "脇差"], ["鯰尾藤四郎", "脇差"], ["骨喰藤四郎", "脇差"], ["物吉貞宗", "脇差"], ["堀川国広", "脇差"],
    ["浦島虎徹", "脇差"], ["篭手切江", "脇差"], ["肥前忠広", "脇差"], ["治金丸", "脇差"], ["泛塵", "脇差"],
    ["火車切", "脇差"],
    // 打刀(35)
    ["鳴狐", "打刀"], ["千子村正", "打刀"], ["亀甲貞宗", "打刀"], ["宗三左文字", "打刀"], ["加州清光", "打刀"],
    ["大和守安定", "打刀"], ["歌仙兼定", "打刀"], ["和泉守兼定", "打刀"], ["陸奥守吉行", "打刀"], ["山姥切国広", "打刀"],
    ["蜂須賀虎徹", "打刀"], ["長曽祢虎徹", "打刀"], ["大倶利伽羅", "打刀"], ["へし切長谷部", "打刀"], ["同田貫正国", "打刀"],
    ["南泉一文字", "打刀"], ["山姥切長義", "打刀"], ["豊前江", "打刀"], ["南海太郎朝尊", "打刀"], ["桑名江", "打刀"],
    ["水心子正秀", "打刀"], ["源清麿", "打刀"], ["松井江", "打刀"], ["地蔵行平", "打刀"], ["五月雨江", "打刀"],
    ["村雲江", "打刀"], ["稲葉江", "打刀"], ["石田正宗", "打刀"], ["孫六兼元", "打刀"], ["後家兼光", "打刀"],
    ["富田江", "打刀"], ["大慶直胤", "打刀"], ["安宅切", "打刀"], ["二筋樋貞宗", "打刀"], ["雲重", "打刀"],
    // 太刀(41)
    ["童子切安綱 剥落", "太刀"], ["三日月宗近", "太刀"], ["小狐丸", "太刀"], ["大典太光世", "太刀"], ["ソハヤノツルキ", "太刀"],
    ["数珠丸恒次", "太刀"], ["鬼丸国綱", "太刀"], ["一期一振", "太刀"], ["大包平", "太刀"], ["鶯丸", "太刀"],
    ["明石国行", "太刀"], ["燭台切光忠", "太刀"], ["大般若長光", "太刀"], ["小竜景光", "太刀"], ["江雪左文字", "太刀"],
    ["山伏国広", "太刀"], ["髭切", "太刀"], ["膝丸", "太刀"], ["獅子王", "太刀"], ["小烏丸", "太刀"],
    ["抜丸", "太刀"], ["鶴丸国永", "太刀"], ["小豆長光", "太刀"], ["千代金丸", "太刀"], ["山鳥毛", "太刀"],
    ["古今伝授の太刀", "太刀"], ["日光一文字", "太刀"], ["一文字則宗", "太刀"], ["姫鶴一文字", "太刀"], ["福島光忠", "太刀"],
    ["笹貫", "太刀"], ["八丁念仏", "太刀"], ["実休光忠", "太刀"], ["雲生", "太刀"], ["道誉一文字", "太刀"],
    ["雲次", "太刀"], ["面影", "太刀"], ["古備前信房", "太刀"], ["三郎国宗", "太刀"], ["波平行安", "太刀"],
    ["狐ヶ崎為次", "太刀"],
    // 大太刀(6)
    ["石切丸", "大太刀"], ["蛍丸", "大太刀"], ["太郎太刀", "大太刀"], ["次郎太刀", "大太刀"], ["祢々切丸", "大太刀"],
    ["柏太刀", "大太刀"],
    // 槍(5)
    ["蜻蛉切", "槍"], ["日本号", "槍"], ["御手杵", "槍"], ["大千鳥十文字槍", "槍"], ["人間無骨", "槍"],
    // 薙刀(3)
    ["岩融", "薙刀"], ["巴形薙刀", "薙刀"], ["静形薙刀", "薙刀"],
    // 剣(3)
    ["白山吉光", "剣"], ["七星剣", "剣"], ["丙子椒林剣", "剣"]
  ];
  // 名前候補: クエリを含む名前を全件から探す
  function findToukenSuggestions(query, limit) {
    const q = String(query || "").trim();
    if (!q) return [];
    return ALL_TOUKEN_MASTER.filter(([name]) => name.includes(q)).slice(0, limit || 8);
  }

  // 刀派対応表(名前 → 刀派)。後日、対応表を反映してここを埋める。
  // キーは normalizeCharName() を通した名前(スペース無視)にすること。
  const SWORD_SCHOOL_MAP = {};
  function schoolOf(c) {
    return SWORD_SCHOOL_MAP[normalizeCharName(c.name)] || "";
  }

  // 絞り込み: 各カテゴリ「すべて」(= "all") か、その値そのもの
  let filters = { unit: "all", swordType: "all", school: "all" };
  function matchesFilters(c) {
    return (filters.unit === "all" || c.unit === filters.unit)
      && (filters.swordType === "all" || c.swordType === filters.swordType)
      && (filters.school === "all" || schoolOf(c) === filters.school);
  }
  // 選択肢は既存データに実在する値だけを出す(未使用の部隊・刀種は出さない)
  function unitFilterOptions() {
    return UNITS.filter(u => characters.some(c => c.unit === u));
  }
  function swordTypeFilterOptions() {
    return SWORD_TYPES.filter(t => characters.some(c => c.swordType === t));
  }
  function schoolFilterOptions() {
    const set = new Set();
    characters.forEach(c => { const s = schoolOf(c); if (s) set.add(s); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }

  let characters = CHAR_NAMES.map((n, i) => ({
    id: "c" + i, name: n,
    swordType: "", height: "", hobby: "", formerOwner: "",
    personality: "", memo: "", level: "", activationDate: "", unit: "", isCaptain: false, isKiwame: false
  }));


  const MASTER_STORAGE_KEY = "saniwa-tool.master.v1";
  try {
    const saved = JSON.parse(localStorage.getItem(MASTER_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) characters = saved;
  } catch (e) {}
  function saveState() {
    try { localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(characters)); return true; } catch (e) { return false; }
  }
  window.readSaniwaReference = () => JSON.parse(JSON.stringify(characters));
  window.addEventListener("pagehide", saveState);
  let editingId = null;
  let bulkConfirmOpen = false;
  let filterPanelOpen = false;

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
          level: c.level, activationDate: c.activationDate, unit: c.unit, isCaptain: c.isCaptain, isKiwame: !!c.isKiwame
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
          height: "", hobby: "", formerOwner: "", personality: "", memo: "", level: "",
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
      if (typeof sc.isKiwame === "boolean") c.isKiwame = sc.isKiwame;
    });
    if (changed) render();
  });
  characters.forEach(syncCharacter);
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
    el.appendChild(renderFilterBar());

    const filtered = characters.filter(matchesFilters);

    const grid = document.createElement("div");
    grid.className = "char-grid";
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "filter-empty";
      empty.textContent = "この条件に当てはまる刀剣男士がいません。";
      el.appendChild(empty);
    }
    filtered.forEach(c => {
      const card = document.createElement("button");
      card.className = "char-card";
      card.innerHTML = `
        <div class="ctop">
          <div class="cname"><span class="character-name">${c.name}</span>${c.level ? `<span class="clevel">Lv.${c.level}</span>` : ""}${c.isKiwame ? '<span class="kiwame-mark">🌸</span>' : ""}</div>
        </div>
        <div class="ctype"><span>${c.swordType || "刀種未設定"}</span>${c.unit ? `<span>${c.unit}配属中</span>` : ""}${c.isCaptain ? '<span class="ccaptain">隊長</span>' : ""}</div>
        ${c.memo ? `<div class="cmemo">${escapeHtml(c.memo)}</div>` : ""}
      `;
      card.onclick = () => { editingId = c.id; render(); };
      grid.appendChild(card);
    });
    el.appendChild(grid);

    const addRow = document.createElement("div");
    addRow.className = "add-char-row";
    const addTopRow = document.createElement("div");
    addTopRow.className = "add-char-toprow";
    const addToggle = document.createElement("button");
    addToggle.className = "add-char-toggle";
    addToggle.textContent = "＋ 新入男士を追加";
    const bulkToggle = document.createElement("button");
    bulkToggle.className = "add-char-bulk";
    bulkToggle.type = "button";
    bulkToggle.textContent = "100振り追加";
    bulkToggle.onclick = () => { bulkConfirmOpen = true; render(); };
    const addForm = document.createElement("div");
    addForm.className = "add-char-form";
    addForm.innerHTML = `
      <div class="add-char-name-wrap">
        <input id="new-char-name" placeholder="名前(例：獅子王)" autocomplete="off" />
        <div class="add-char-suggest" id="new-char-suggest"></div>
      </div>
      <select id="new-char-type">
        <option value="">刀種を選択</option>
        ${SWORD_TYPES.map(type => `<option value="${type}">${type}</option>`).join("")}
      </select>
      <button class="add-char-submit" id="new-char-submit">この内容で追加</button>
    `;
    addToggle.onclick = () => addForm.classList.toggle("open");
    addTopRow.appendChild(addToggle);
    addTopRow.appendChild(bulkToggle);
    addRow.appendChild(addTopRow);
    addRow.appendChild(addForm);
    el.appendChild(addRow);

    if (editingId) el.appendChild(renderEditModal(editingId));
    if (bulkConfirmOpen) el.appendChild(renderBulkConfirmModal());

    // 名前入力オートコンプリート: 実装済み全刀剣男士から部分一致で候補を出す。
    // 候補を選ばず自由入力のまま追加することも引き続きできる。
    const nameInput = document.getElementById("new-char-name");
    const typeSelect = document.getElementById("new-char-type");
    const suggestBox = document.getElementById("new-char-suggest");
    if (nameInput && suggestBox) {
      const hideSuggestions = () => { suggestBox.innerHTML = ""; suggestBox.classList.remove("open"); };
      const showSuggestions = () => {
        const matches = findToukenSuggestions(nameInput.value);
        if (!matches.length) { hideSuggestions(); return; }
        suggestBox.innerHTML = "";
        matches.forEach(([name, type]) => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "add-char-suggest-item";
          item.innerHTML = `<span>${escapeHtml(name)}</span><span class="add-char-suggest-type">${type}</span>`;
          item.onmousedown = e => {
            e.preventDefault(); // input の blur より先に発火させ、候補を消さずに選択を確定する
            nameInput.value = name;
            if (typeSelect) typeSelect.value = type;
            hideSuggestions();
          };
          suggestBox.appendChild(item);
        });
        suggestBox.classList.add("open");
      };
      nameInput.oninput = showSuggestions;
      nameInput.onfocus = showSuggestions;
      nameInput.onblur = hideSuggestions;
    }

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
          height: "", hobby: "", formerOwner: "", personality: "", memo: "", level: "",
          activationDate: "", unit: "", isCaptain: false, isKiwame: false
        };
        characters.push(newChar);
        notify(`新入り「${newChar.name}」を追加`);
        syncCharacter(newChar);
        render();
      };
    }
  }

  // 絞り込み/並び替えパネル: 「絞込/並替」ボタンで開閉する。
  // 中身は部隊・刀種・刀派の3カテゴリ、各カテゴリは単一選択+「すべて」。
  // 複数カテゴリを選ぶとAND条件になる(matchesFilters側で判定)。
  function renderFilterBar() {
    const wrap = document.createElement("div");
    wrap.className = "filter-wrap";

    const activeCount = ["unit", "swordType", "school"].filter(k => filters[k] !== "all").length;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "filter-toggle" + (filterPanelOpen ? " open" : "");
    toggle.innerHTML = `<span>絞込 / 並替</span>${activeCount ? `<span class="filter-toggle-count">${activeCount}</span>` : ""}<span class="filter-toggle-chev">${filterPanelOpen ? "▲" : "▼"}</span>`;
    toggle.onclick = () => { filterPanelOpen = !filterPanelOpen; render(); };
    wrap.appendChild(toggle);

    if (!filterPanelOpen) return wrap;

    const bar = document.createElement("div");
    bar.className = "filter-bar";
    const groups = [
      { key: "unit", label: "部隊", options: unitFilterOptions() },
      { key: "swordType", label: "刀種", options: swordTypeFilterOptions() },
      { key: "school", label: "刀派", options: schoolFilterOptions() }
    ];
    groups.forEach(g => {
      const group = document.createElement("div");
      group.className = "filter-group";
      const label = document.createElement("div");
      label.className = "filter-group-label";
      label.textContent = g.label;
      group.appendChild(label);

      const chips = document.createElement("div");
      chips.className = "filter-chips";
      const allChip = document.createElement("button");
      allChip.type = "button";
      allChip.className = "filter-chip" + (filters[g.key] === "all" ? " active" : "");
      allChip.textContent = "すべて";
      allChip.onclick = () => { filters[g.key] = "all"; render(); };
      chips.appendChild(allChip);

      g.options.forEach(opt => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "filter-chip" + (filters[g.key] === opt ? " active" : "");
        chip.textContent = opt;
        chip.onclick = () => { filters[g.key] = opt; render(); };
        chips.appendChild(chip);
      });
      group.appendChild(chips);
      bar.appendChild(group);
    });
    wrap.appendChild(bar);
    return wrap;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderBulkConfirmModal() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.onclick = e => { if (e.target === overlay) { bulkConfirmOpen = false; render(); } };

    const card = document.createElement("div");
    card.className = "modal-card";
    card.innerHTML = `
      <div class="m-eyebrow">一括登録</div>
      <h2>100振り追加</h2>
      <p class="confirm-text">刀剣男士100振りプレゼント対象の刀剣男士を追加しますか？</p>
      <p class="confirm-text confirm-text-sub">すでに登録済みの刀剣男士は追加されません。</p>
      <div class="confirm-actions">
        <button type="button" class="confirm-btn secondary" id="bulk-confirm-no">いいえ</button>
        <button type="button" class="confirm-btn primary" id="bulk-confirm-yes">はい</button>
      </div>
    `;
    overlay.appendChild(card);

    card.querySelector("#bulk-confirm-no").onclick = () => { bulkConfirmOpen = false; render(); };
    card.querySelector("#bulk-confirm-yes").onclick = () => {
      bulkConfirmOpen = false;
      addBulkCharacters();
    };
    return overlay;
  }

  function addBulkCharacters() {
    const existingNames = new Set(characters.map(c => normalizeCharName(c.name)));
    let added = 0, skipped = 0;
    BULK_CHARACTERS.forEach((entry, i) => {
      const name = entry[0], swordType = entry[1];
      const key = normalizeCharName(name);
      if (existingNames.has(key)) { skipped++; return; }
      existingNames.add(key);
      const newChar = {
        id: "c" + Date.now() + "_" + i,
        name, swordType,
        height: "", hobby: "", formerOwner: "", personality: "", memo: "", level: "",
        activationDate: "", unit: "", isCaptain: false, isKiwame: false
      };
      characters.push(newChar);
      syncCharacter(newChar);
      added++;
    });
    if (added) notify(`刀剣男士100振りプレゼント: ${added}振りを一括登録`);
    else saveState();
    render();
    window.alert(`${added}振り追加しました。${skipped}振りは登録済みのためスキップしました。`);
  }

  function unitMembers(unit) {
    return characters.filter(character => character.unit === unit);
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
      if (!c.swordType) {
        c.isKiwame = false;
        if (Number(c.level) > 99) c.level = 99;
      }
      render();
    };
    card.appendChild(swordTypeSelect);

    if (c.swordType) {
      const kiwameRow = document.createElement("div");
      kiwameRow.className = "toggle-row";
      kiwameRow.innerHTML = `<div class="tlabel">極</div>`;
      const kiwameBtn = document.createElement("button");
      kiwameBtn.className = "toggle-switch" + (c.isKiwame ? " on" : "");
      kiwameBtn.innerHTML = `<span class="knob"></span>`;
      kiwameBtn.onclick = () => {
        c.isKiwame = !c.isKiwame;
        if (!c.isKiwame && Number(c.level) > 99) c.level = 99;
        render();
      };
      kiwameRow.appendChild(kiwameBtn);
      card.appendChild(kiwameRow);
    }

    const levelLabel = document.createElement("div");
    levelLabel.className = "m-field-label";
    levelLabel.textContent = "レベル";
    card.appendChild(levelLabel);
    const levelSelect = document.createElement("select");
    levelSelect.className = "m-input";
    const maxLevel = c.isKiwame ? 199 : 99;
    levelSelect.innerHTML = `<option value="">未選択</option>${Array.from({ length: maxLevel }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join("")}`;
    levelSelect.value = c.level || "";
    levelSelect.onchange = e => {
      c.level = e.target.value === "" ? "" : Number(e.target.value);
      render();
    };
    card.appendChild(levelSelect);

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
    unitSelect.innerHTML = `<option value="">未選択</option>${UNITS.map(unit => {
      const isFull = unit !== c.unit && unitMembers(unit).length >= UNIT_CAPACITY;
      return `<option value="${unit}"${isFull ? " disabled" : ""}>${unit}${isFull ? "（定員）" : ""}</option>`;
    }).join("")}`;
    unitSelect.value = c.unit;
    unitSelect.onchange = e => {
      const nextUnit = e.target.value;
      if (nextUnit && nextUnit !== c.unit && unitMembers(nextUnit).length >= UNIT_CAPACITY) return;
      if (nextUnit !== c.unit) c.isCaptain = false;
      c.unit = nextUnit;
      render();
    };
    card.appendChild(unitSelect);

    if (c.unit) {
      const existingCaptain = unitMembers(c.unit).find(member => member.id !== c.id && member.isCaptain);
      if (existingCaptain) {
        const captainStatus = document.createElement("div");
        captainStatus.className = "unit-status";
        captainStatus.textContent = `${existingCaptain.name}が隊長です`;
        card.appendChild(captainStatus);
      } else {
        const captainRow = document.createElement("div");
        captainRow.className = "toggle-row";
        captainRow.innerHTML = `<div class="tlabel">部隊長にする</div>`;
        const captainBtn = document.createElement("button");
        captainBtn.className = "toggle-switch" + (c.isCaptain ? " on" : "");
        captainBtn.innerHTML = `<span class="knob"></span>`;
        captainBtn.onclick = () => {
          const willBeCaptain = !c.isCaptain;
          if (willBeCaptain) {
            unitMembers(c.unit).forEach(member => { if (member.id !== c.id) member.isCaptain = false; });
          }
          c.isCaptain = willBeCaptain;
          render();
        };
        captainRow.appendChild(captainBtn);
        card.appendChild(captainRow);
      }
    }

    field("身長", "height", "例：170cm");
    field("趣味", "hobby", "例：刀の手入れ");
    field("元主", "formerOwner", "例：織田信長");
    window.SaniwaQuotes.mount(card, c, saveState);

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

