(function(){
  const root = document.getElementById("app");

  const homeView = document.createElement("div");
  homeView.className = "view active";
  homeView.id = "home-view";
  homeView.innerHTML = `
    <div class="home-header">
      <div class="seal">審</div>
      <h1>審神者管理ツール</h1>
      <p>本丸運営のためのお助けツール集(仮)</p>
    </div>
    <div class="search-row">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <div class="search-input-wrap">
          <input class="search-input" placeholder="キーワードを検索" />
        </div>
      </div>
      <div class="menu-wrap">
        <button class="menu-btn" id="menu-btn">
          <span class="menu-icon">☰</span>
          <span class="menu-label">メニュー</span>
        </button>
      </div>
    </div>
    <div class="banner-wrap">
      <div class="banner-track" id="banner-track"></div>
      <button class="banner-arrow prev" id="banner-prev">‹</button>
      <button class="banner-arrow next" id="banner-next">›</button>
    </div>
    <div class="banner-dots" id="banner-dots"></div>
    <div class="icon-grid">
      <button class="app-icon-btn" id="open-rooms">
        <div class="app-icon-glyph rooms">丸</div>
        <div class="app-icon-label">部屋割り</div>
      </button>
      <button class="app-icon-btn" id="open-network">
        <div class="app-icon-glyph network">縁</div>
        <div class="app-icon-label">相関図</div>
      </button>
      <button class="app-icon-btn" id="open-master">
        <div class="app-icon-glyph master">刀</div>
        <div class="app-icon-label">刀剣男士</div>
      </button>
      <button class="app-icon-btn soon" id="open-honmaru">
        <div class="app-icon-glyph soon">本</div>
        <div class="app-icon-label">本丸設定</div>
      </button>
    </div>
    <div class="home-note">アイコンをタップすると各ツールが開きます。戻るときは上の「← ホーム」から。</div>
    <div class="feed-section">
      <div class="feed-title"><span class="dot"></span>最近の更新</div>
      <div class="feed-list" id="feed-list"></div>
      <button class="feed-add-toggle" id="feed-add-toggle">＋ 公式の更新を追加</button>
      <div class="feed-add-form" id="feed-add-form">
        <select id="feed-add-account">
          <option value="刀剣乱舞X">刀剣乱舞 X（運営）</option>
          <option value="本丸通信">本丸通信</option>
        </select>
        <input id="feed-add-text" placeholder="投稿内容(メモでOK)" />
        <input id="feed-add-url" placeholder="投稿のURL(任意)" />
        <button class="feed-add-submit" id="feed-add-submit">この内容で追加</button>
      </div>
    </div>
    <div class="gov-section">
      <div class="gov-banner">政府へのご連絡</div>
      <div class="gov-box">
        <a class="gov-link" href="https://www.toukenranbu.jp" target="_blank" rel="noopener">
          <span class="gov-mark">・</span><span class="gov-name">刀剣乱舞 公式サイト</span>
        </a>
        <a class="gov-link" href="https://x.com/touken_staff?s=11&t=Q6jIjnXHdKMg42DONGJCjg" target="_blank" rel="noopener">
          <span class="gov-mark">・</span><span class="gov-name">刀剣乱舞 X（運営）</span>
        </a>
        <a class="gov-link" href="https://x.com/tkrb_ht?s=11&t=Q6jIjnXHdKMg42DONGJCjg" target="_blank" rel="noopener">
          <span class="gov-mark">・</span><span class="gov-name">本丸通信</span>
        </a>
      </div>
      <div class="gov-note">お手続きはこちらの窓口よりお願いいたします</div>
    </div>
  `;
  root.appendChild(homeView);

  // ---- サイドメニュー(スライドパネル) ----
  const menuOverlay = document.createElement("div");
  menuOverlay.className = "menu-overlay";
  menuOverlay.id = "menu-overlay";

  const menuPanel = document.createElement("div");
  menuPanel.className = "menu-panel";
  menuPanel.id = "menu-panel";
  menuPanel.innerHTML = `
    <div class="menu-panel-head">
      <button class="menu-close" id="menu-close">
        <span class="x">×</span><span class="lbl">閉じる</span>
      </button>
      <div class="seal-name">審神者管理ツール</div>
    </div>
    <div class="menu-section-title">本丸のコンテンツ</div>
    <div class="menu-list" id="menu-list"></div>
  `;
  root.appendChild(menuOverlay);
  root.appendChild(menuPanel);

  const MENU_ITEMS = [
    { label: "部屋割り", glyph: "丸", color: "var(--wood)", action: () => showView("rooms-view") },
    { label: "相関図",   glyph: "縁", color: "var(--hanko)", action: () => showView("network-view") },
    { label: "刀剣男士", glyph: "刀", color: "var(--moss)", action: () => showView("master-view") },
    { label: "本丸設定",       glyph: "本", color: "var(--tag-border)", disabled: true },
    { label: "設定",           glyph: "設", color: "var(--tag-border)", disabled: true }
  ];
  const menuList = document.getElementById("menu-list");
  MENU_ITEMS.forEach(item => {
    const row = document.createElement("button");
    row.className = "menu-row" + (item.disabled ? " disabled" : "");
    row.innerHTML = `
      <span class="row-icon" style="background:${item.color}">${item.glyph}</span>
      <span>${item.label}</span>
      ${item.disabled ? '<span class="row-tag">準備中</span>' : ""}
    `;
    if (!item.disabled) {
      row.onclick = () => { item.action(); closeMenu(); };
    }
    menuList.appendChild(row);
  });

  function openMenu() {
    menuOverlay.classList.add("open");
    menuPanel.classList.add("open");
  }
  function closeMenu() {
    menuOverlay.classList.remove("open");
    menuPanel.classList.remove("open");
  }
  document.getElementById("menu-btn").onclick = openMenu;
  document.getElementById("menu-close").onclick = closeMenu;
  menuOverlay.onclick = closeMenu;

  // ---- バナーカルーセル(色べた塗りプレースホルダー) ----
  const BANNER_COLORS = ["#8C5D3D", "#A8382C", "#6E7452", "#B98D5B", "#5C3722"];
  const BANNER_LABELS = ["お知らせ①", "お知らせ②", "お知らせ③", "お知らせ④", "お知らせ⑤"];
  const BANNER_IMAGES = ["https://i.imgur.com/eHy5qgK.png", null, null, null, null];
  const track = document.getElementById("banner-track");
  const dotsWrap = document.getElementById("banner-dots");
  let bannerIndex = 0;

  BANNER_COLORS.forEach((color, i) => {
    const slide = document.createElement("div");
    slide.className = "banner-slide";
    slide.style.background = color;
    if (BANNER_IMAGES[i]) {
      slide.style.backgroundImage = `url("${BANNER_IMAGES[i]}")`;
      slide.style.backgroundSize = "cover";
      slide.style.backgroundPosition = "center";
      slide.setAttribute("role", "img");
      slide.setAttribute("aria-label", BANNER_LABELS[i]);
    } else {
      slide.textContent = BANNER_LABELS[i];
    }
    track.appendChild(slide);

    const dot = document.createElement("button");
    dot.className = "banner-dot" + (i === 0 ? " active" : "");
    dot.onclick = () => { goToSlide(i); resetTimer(); };
    dotsWrap.appendChild(dot);
  });

  function goToSlide(i) {
    bannerIndex = (i + BANNER_COLORS.length) % BANNER_COLORS.length;
    track.style.transform = `translateX(-${bannerIndex * 100}%)`;
    dotsWrap.querySelectorAll(".banner-dot").forEach((d, idx) => {
      d.classList.toggle("active", idx === bannerIndex);
    });
  }

  let bannerTimer = null;
  function resetTimer() {
    if (bannerTimer) clearInterval(bannerTimer);
    bannerTimer = setInterval(() => goToSlide(bannerIndex + 1), 3500);
  }
  document.getElementById("banner-prev").onclick = () => { goToSlide(bannerIndex - 1); resetTimer(); };
  document.getElementById("banner-next").onclick = () => { goToSlide(bannerIndex + 1); resetTimer(); };
  resetTimer();

  function makeSubView(id, title) {
    const view = document.createElement("div");
    view.className = "view";
    view.id = id;
    const topbar = document.createElement("div");
    topbar.className = "sub-topbar";
    const backBtn = document.createElement("button");
    backBtn.className = "back-btn";
    backBtn.textContent = "← ホーム";
    backBtn.onclick = () => showView("home-view");
    const titleEl = document.createElement("div");
    titleEl.className = "sub-title";
    titleEl.textContent = title;
    topbar.appendChild(backBtn);
    topbar.appendChild(titleEl);
    const frameWrap = document.createElement("div");
    frameWrap.className = "sub-frame-wrap";
    const iframe = document.createElement("iframe");
    frameWrap.appendChild(iframe);
    view.appendChild(topbar);
    view.appendChild(frameWrap);
    root.appendChild(view);
    return { view, iframe };
  }

  const roomsSub = makeSubView("rooms-view", "部屋割り");
  const networkSub = makeSubView("network-view", "相関図");
  const masterSub = makeSubView("master-view", "刀剣男士");

  let roomsLoaded = false, networkLoaded = false, masterLoaded = false;
  let activityLog = [];

  const SHARED_CHAR_NAMES = [
    "山姥切国広","歌仙兼定","加州清光","陸奥守吉行","蜂須賀虎徹",
    "堀川国広","薬研藤四郎","髭切","膝丸","一期一振"
  ];
  let sharedCharacters = SHARED_CHAR_NAMES.map((n, i) => ({
    id: "c" + i, name: n, swordType: "", activationDate: "", unit: ""
  }));

  const APP_STORAGE_KEY = "saniwa-tool.app.v1";
  try {
    const saved = JSON.parse(localStorage.getItem(APP_STORAGE_KEY));
    if (saved && Array.isArray(saved.activityLog)) activityLog = saved.activityLog;
    if (saved && Array.isArray(saved.sharedCharacters)) sharedCharacters = saved.sharedCharacters;
  } catch (e) {}
  function saveAppState() {
    try {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({ activityLog, sharedCharacters }));
    } catch (e) {}
  }
  window.addEventListener("pagehide", saveAppState);

  function broadcastCharacters() {
    [roomsSub, networkSub, masterSub].forEach(sub => {
      try {
        sub.iframe.contentWindow && sub.iframe.contentWindow.postMessage(
          { type: "characters_sync", characters: sharedCharacters }, "*"
        );
      } catch (e) {}
    });
  }

  function renderFeed() {
    const list = document.getElementById("feed-list");
    if (!list) return;
    if (activityLog.length === 0) {
      list.innerHTML = `<div class="feed-empty">まだ更新はありません。部屋割りや相関図を触ると、ここに履歴が表示されます。</div>`;
      return;
    }
    list.innerHTML = "";
    activityLog.forEach(item => {
      const row = document.createElement(item.url ? "a" : "div");
      row.className = "feed-item" + (item.url ? " linked" : "");
      if (item.url) {
        row.href = item.url;
        row.target = "_blank";
        row.rel = "noopener";
        row.style.textDecoration = "none";
        row.style.color = "inherit";
      }
      const icon = document.createElement("div");
      icon.className = "feed-icon " + item.source;
      icon.textContent = item.source === "rooms" ? "丸" : item.source === "network" ? "縁" : item.source === "master" ? "刀" : "X";
      const text = document.createElement("div");
      text.className = "feed-text";
      text.textContent = item.text;
      const time = document.createElement("div");
      time.className = "feed-time";
      time.textContent = item.time;
      row.appendChild(icon);
      row.appendChild(text);
      row.appendChild(time);
      list.appendChild(row);
    });
  }

  window.addEventListener("message", e => {
    const data = e.data;
    if (!data || !data.source) return;
    if (data.source !== "rooms" && data.source !== "network" && data.source !== "master") return;

    if (data.type === "ready") {
      try { e.source && e.source.postMessage({ type: "characters_sync", characters: sharedCharacters }, "*"); } catch (err) {}
      return;
    }
    if (data.type === "character_update" && data.character) {
      const idx = sharedCharacters.findIndex(c => c.id === data.character.id);
      if (idx === -1) {
        sharedCharacters.push(Object.assign(
          { id: data.character.id, name: data.character.name, swordType: "", activationDate: "", unit: "" },
          data.character
        ));
      } else {
        sharedCharacters[idx] = Object.assign({}, sharedCharacters[idx], data.character);
      }
      broadcastCharacters();
      saveAppState();
    }
    if (!data.text) return;
    const now = new Date();
    const time = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
    activityLog.unshift({ source: data.source, text: data.text, time });
    if (activityLog.length > 30) activityLog.length = 30;
    renderFeed();
    saveAppState();
  });

  renderFeed();

  const feedAddToggle = document.getElementById("feed-add-toggle");
  const feedAddForm = document.getElementById("feed-add-form");
  feedAddToggle.onclick = () => feedAddForm.classList.toggle("open");

  document.getElementById("feed-add-submit").onclick = () => {
    const account = document.getElementById("feed-add-account").value;
    const textEl = document.getElementById("feed-add-text");
    const urlEl = document.getElementById("feed-add-url");
    const text = textEl.value.trim();
    if (!text) return;
    const now = new Date();
    const time = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
    activityLog.unshift({ source: "x", text: `[${account}] ${text}`, time, url: urlEl.value.trim() || null });
    if (activityLog.length > 30) activityLog.length = 30;
    textEl.value = "";
    urlEl.value = "";
    feedAddForm.classList.remove("open");
    renderFeed();
    saveAppState();
  };

  function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    if (id === "rooms-view" && !roomsLoaded) {
      roomsSub.iframe.src = "pages/rooms.html";
      roomsLoaded = true;
    }
    if (id === "network-view" && !networkLoaded) {
      networkSub.iframe.src = "pages/network.html";
      networkLoaded = true;
    }
    if (id === "master-view" && !masterLoaded) {
      masterSub.iframe.src = "pages/master.html";
      masterLoaded = true;
    }
  }

  document.getElementById("open-rooms").onclick = () => showView("rooms-view");
  document.getElementById("open-network").onclick = () => showView("network-view");
  document.getElementById("open-master").onclick = () => showView("master-view");
})();

