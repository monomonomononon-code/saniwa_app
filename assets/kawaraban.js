(function () {
  "use strict";
  // 案内・FAQ専用の閲覧ページ。ユーザーデータの保存/削除は一切行わない。
  // storage-registry.js は「バックアップに何が含まれるか」をFAQの回答に
  // 動的に反映するためだけに読み込んでおり(STORES/DOMAIN_LABELSの参照のみ)、
  // load/save/remove は呼び出さない。

  const root = document.getElementById("app");

  // =====================================================================
  // データ定義(ここを増やすだけで表示が増える。HTMLへの直書きはしない)
  // =====================================================================

  // ---- ご利用について(先頭の非公式表示は特別扱いで別途固定表示する) ----
  const ABOUT_SECTIONS = [
    {
      title: "データの保存について",
      body: [
        "入力した内容は、このアプリを動かしているサーバーではなく、今お使いの端末・ブラウザの中だけに保存されます。",
        "運営者のサーバーへ保存・送信される仕組みはありません。"
      ]
    },
    {
      title: "端末間の同期について",
      body: [
        "パソコンとスマートフォンなど、複数の端末やブラウザの間でデータが自動的に同期されることはありません。",
        "それぞれの端末・ブラウザは、別々の保存データを持ちます。"
      ]
    },
    {
      title: "バックアップについて",
      body: [
        "「設定・バックアップ」画面から、保存されているデータ全体をJSONファイルまたはテキストとして書き出せます。",
        "機種変更やブラウザの変更、誤ってデータを消してしまった場合に備えて、定期的にバックアップを作成しておくことをおすすめします。"
      ]
    },
    {
      title: "バックアップデータの取り扱いについて",
      body: [
        "バックアップには、日報や日誌など、ご自身で入力した内容がそのまま含まれる場合があります。",
        "他の方へ送ったり、インターネット上に公開したりする際はご注意ください。"
      ]
    },
    {
      title: "ブラウザのデータ削除について",
      body: [
        "ブラウザの設定から「サイトデータ」やキャッシュ、閲覧履歴などを削除すると、このツールに保存していた内容も一緒に失われる可能性があります。",
        "削除する前には、念のためバックアップを取っておくことをおすすめします。"
      ]
    }
  ];

  // ---- 保存対象の一覧(FAQの回答に使う)。storage-registry.js の登録内容から作るため、
  // 実装(STORES)が変わってもこの一文だけ直す必要がない。 ----
  // schedule/buildingObjects は内部の登録名と画面上の名前が違うため、表示名だけ読み替える。
  const DOMAIN_DISPLAY_OVERRIDES = { schedule: "計画表", buildingObjects: "本丸建築(3D)" };
  function backupContentsText() {
    const S = window.SaniwaStorage;
    if (!S || !Array.isArray(S.STORES)) {
      return "刀剣男士・部屋割り・本丸建築(3D)・相関図・日報・日誌・計画表・年表など、現在保存されているユーザーデータ";
    }
    const seen = new Set();
    const labels = [];
    S.STORES.forEach(s => {
      if (s.scope !== "user" || seen.has(s.domain)) return; // 端末ローカルの情報は案内から除く
      seen.add(s.domain);
      labels.push(DOMAIN_DISPLAY_OVERRIDES[s.domain] || (S.DOMAIN_LABELS && S.DOMAIN_LABELS[s.domain]) || s.label);
    });
    return `${labels.join("・")}など、現在このアプリが保存しているユーザーデータ`;
  }

  // ---- よくあるご質問 ----
  const FAQ_ITEMS = [
    { question: "データはどこに保存されますか？", answer: "使用中の端末・ブラウザの中に保存されます。他のサーバーには保存されません。" },
    { question: "入力したデータはサーバーへ送信されますか？", answer: "現在の保存機能では送信されません。入力内容は、この端末・ブラウザの中だけにとどまります。" },
    { question: "パソコンとスマートフォンで同期できますか？", answer: "自動での同期には対応していません。端末やブラウザが変わると、別々の保存データとして扱われます。" },
    { question: "機種変更するときはどうすればいいですか？", answer: "古い端末で「設定・バックアップ」からバックアップを作成し、新しい端末でそのバックアップから復元してください。" },
    { question: "ブラウザを変えたらデータがありません。", answer: "保存場所がブラウザごとに異なるためです。以前のブラウザでバックアップを作成し、新しいブラウザで復元してください。" },
    { question: "ブラウザの履歴やデータを削除しても大丈夫ですか？", answer: "サイトのデータを削除すると、本ツールの保存データも一緒に失われる可能性があります。削除する前にバックアップを取ることをおすすめします。" },
    { question: "バックアップには何が含まれますか？", answer: () => `${backupContentsText()}が含まれます。` },
    { question: "3D本丸が重い・操作しづらいです。", answer: "端末の性能やブラウザによって動作の快適さが変わります。部屋や建築パーツ、家具を多く配置するほど負荷が増える傾向があるため、動きが重いと感じたら配置数を見直してみてください。" },
    { question: "データが消えました。復元できますか？", answer: "バックアップを作成していれば、そのバックアップから復元できます。バックアップがなく、端末内のデータ自体が既に削除されている場合は、残念ながら復元できない可能性があります。" }
  ];

  // ---- 各機能の使い方 ----
  const GUIDE_CATEGORIES = [
    { id: "manage", label: "本丸を管理する" },
    { id: "record", label: "記録する" },
    { id: "calc", label: "計算する" },
    { id: "settings", label: "設定・その他" }
  ];
  const GUIDE_ITEMS = [
    {
      id: "master", category: "manage", glyph: "刀", title: "刀剣男士", summary: "刀剣男士の情報を一覧で管理",
      whatItDoes: "刀剣男士を一覧で管理する機能です。刀種・レベル・極・顕現年月日・配属部隊・隊長・身長・趣味・元主・セリフ・メモなどをキャラクターごとに記録できます。",
      howToUse: "ホーム画面の「刀」から開きます。一覧のカードをタップすると編集画面が開き、内容を変更して画面を閉じると自動的に保存されます。「＋新入男士を追加」で新しい刀剣男士を追加できます。",
      savedData: "名前・刀種・レベル・極・顕現年月日・配属部隊・隊長・身長・趣味・元主・セリフ・メモ",
      notes: "顕現年月日を変更すると、年表の顕現表示もあわせて更新されます。",
      related: "部屋割り・相関図・戦績(経験値計算機)・年表(顕現の自動反映)"
    },
    {
      id: "rooms", category: "manage", glyph: "丸", title: "部屋割り", summary: "部屋を作って刀剣男士を配置",
      whatItDoes: "本丸の部屋を作り、刀剣男士をドラッグで配置する機能です。六畳・広間・洋間・居間・厨・厠・鍛刀部屋・大型の部屋など、部屋の種類ごとに見た目が変わります。",
      howToUse: "ホーム画面の「丸」から開き、「男士の配置」を選びます。配置待ちのタグを長押ししてドラッグすると部屋に配置でき、「＋部屋を追加」で新しい部屋を作れます。",
      savedData: "部屋の名前・種類・備考と、部屋ごとに配置した刀剣男士",
      notes: "部屋そのものの追加・削除・種類変更はこの画面で行います。3D俯瞰図側では部屋の位置や回転だけを扱います。",
      related: "本丸3D俯瞰図(同じ「丸」のメニューから「見取り図（3D）」で開けます)"
    },
    {
      id: "housing3d", category: "manage", glyph: "俯", title: "本丸3D俯瞰図 / ハウジング", summary: "本丸を3Dで見渡し、建築物を配置",
      whatItDoes: "部屋割りで作った部屋を3D空間に立体表示する機能です。建築編集モードでは、部屋を「棟」としてまとめたり、廊下・縁側・屋根・門・塀・庭・池・畑・馬小屋・太鼓橋・石・花びらの絨毯・家具(箪笥・ちゃぶ台・布団・ソファ)などを追加・移動・回転・サイズ変更したりできます。「植栽」タブの桜・松・竹・低木・花・樹木は季節に合わせて色や花が変わり、朝・昼・夕・夜の時間帯表示と、春(夏・秋・冬は準備中)の季節表示を別々に切り替えられます。春は花びらが舞います。",
      howToUse: "部屋割りのメニューから「見取り図（3D）」を選びます。「建築編集」で編集モードに入り、パーツ追加のパネルからカテゴリごとに選んで配置します。右上の「朝昼夕夜」で時間帯、「春夏秋冬」で季節を切り替えます。池・桜・石・樹木は、選んだときに出る「池のかたち」「枝ぶり」「石の置き方」「樹形」で見た目を変えられます。",
      savedData: "棟の情報、部屋ごとの3D上の位置・回転、建築パーツ・家具・植栽の位置とサイズ、時間帯と季節の設定",
      notes: "端末の性能によっては、配置するパーツや家具が多いほど動作が重くなる場合があります。",
      related: "部屋割り(部屋そのものの追加・種類変更・住人の配置はこちらで行います)"
    },
    {
      id: "network", category: "manage", glyph: "縁", title: "相関図", summary: "刀剣男士どうしの関係を図にする",
      whatItDoes: "刀剣男士どうしの関係を図として作る機能です。単体・三角・四角・丸のテンプレートで配置し、ノードはドラッグで自由に動かせます。矢印付きの関係とエピソードも追加できます。",
      howToUse: "ホーム画面の「縁」から開きます。「＋刀剣男士を追加」で配置し、「＋関係を追加」で矢印と関係のラベルを付けます。タブを使えば複数の相関図を分けて管理できます。",
      savedData: "タブごとの配置・関係・エピソード",
      notes: "特にありません。",
      related: "刀剣男士(名前や刀種などのプロフィールを共有して表示します)"
    },
    {
      id: "report", category: "record", glyph: "報", title: "日報", summary: "その日の活動を記録するカレンダー",
      whatItDoes: "その日の日課(本丸へのアクセス・出陣・遠征・演練・内番など)、入手した刀剣男士、資材・札の収支、イベント・通常マップの周回数、小判の収支、経験値計算機からの記録を、日付ごとにカレンダー形式で記録する機能です。",
      howToUse: "ホーム画面の「記」から開き、「日報」を選びます。カレンダーで日付を選び、「編集」から入力します。",
      savedData: "日付ごとの日課の達成状況・入手した刀剣男士・資材や小判の収支・周回数・経験値の記録",
      notes: "画面のいちばん下にある「史へ記す」を押すと、その日の記録を年表に残せます。年表側は日報の内容をコピーせず、開くたびに最新の日報を読み直して表示します。",
      related: "年表(「史へ記す」連携)、戦績(経験値計算機からの記録がここに残ります)"
    },
    {
      id: "diary", category: "record", glyph: "誌", title: "日誌", summary: "自由に書ける小説・読み物形式の記録",
      whatItDoes: "作品ごとに章を分けて、自由に文章を書ける読み物寄りの記録機能です。執筆しながら、部屋割り・相関図・刀剣男士のデータを閲覧専用で参照できます。",
      howToUse: "ホーム画面の「記」から開き、「日誌」を選びます。「＋新規作品」で作品を作り、「＋章を追加」で章を増やして執筆します。",
      savedData: "作品のタイトル・章のタイトル・本文",
      notes: "現在、日誌の内容を年表へ自動で送る機能はありません(年表と連携しているのは日報のみです)。",
      related: "部屋割り・相関図・刀剣男士(執筆中に参照シートとして閲覧できます)"
    },
    {
      id: "schedule", category: "record", glyph: "計", title: "計画表", summary: "月間カレンダーで予定とToDoを管理",
      whatItDoes: "月間カレンダー上にイベントや予定を登録できる機能です。開始日・終了日・メモに加えて、予定ごとにToDoを設定でき、完了・未完了を管理できます。複数日にまたがる予定は帯状に表示されます。",
      howToUse: "ホーム画面の「計」から開きます。日付をタップするとその日の予定を確認・追加でき、予定をタップすると詳細を編集できます。",
      savedData: "予定ごとの開始日・終了日・タイトル・メモ・ToDo",
      notes: "特にありません。",
      related: "年表(今後、計画表の記録を年表へ送る機能を追加しやすい構造になっています)"
    },
    {
      id: "timeline", category: "record", glyph: "史", title: "年表", summary: "自本丸の歴史を時系列で振り返る",
      whatItDoes: "自本丸で起きた出来事を、年ごとの見出しで時系列に振り返れる機能です。手動での出来事の追加に加えて、刀剣男士の顕現年月日が自動で反映され、日報は「史へ記す」から参照表示できます。",
      howToUse: "ホーム画面の「史」から開きます。「＋出来事を追加」で手動の記録を作れます。年のプルダウンで見たい年へ移動でき、新しい順・古い順を切り替えられます。",
      savedData: "手動で追加した出来事と、日報への参照だけを保存します。刀剣男士の顕現は保存せず、刀剣男士のデータを都度参照して表示するだけです。",
      notes: "顕現の表示は刀剣男士ページのデータをそのまま参照しているため、この画面からは編集・削除できません(「刀剣男士ページを開く」から編集します)。日報の参照は「史から外す」で解除できます。",
      related: "刀剣男士(顕現の自動反映)、日報(「史へ記す」連携)"
    },
    {
      id: "expcalc", category: "calc", glyph: "戦", title: "戦績", summary: "経験値計算機で周回数を計算",
      whatItDoes: "経験値計算機では、選んだ刀剣男士が目標のレベルに到達するまでに必要な周回数などを計算できます。イベントノルマ計算機は現在準備中で、まだご利用いただけません。",
      howToUse: "ホーム画面の「戦」から開き、「経験値計算」を選びます。刀剣男士と、マップ・出撃条件などを選ぶと計算されます。",
      savedData: "この画面自体には保存機能がなく、再読み込みすると入力内容は消えます。計算結果を「日報へ記録」した場合のみ、日報側に残ります。",
      notes: "イベントノルマ計算機は準備中のため、まだ使用できません。",
      related: "日報(計算結果を記録できます)"
    },
    {
      id: "backup", category: "settings", glyph: "設", title: "設定・バックアップ", summary: "保存データの書き出しと復元",
      whatItDoes: "この端末に保存されている全データをまとめて確認し、JSONファイルまたはテキストとして書き出したり、書き出したデータから復元したりできる機能です。",
      howToUse: "ホーム画面の「設」から開きます。「JSONファイルをダウンロード」または「テキストをコピー」でバックアップを作成できます。復元は、ファイルを選ぶかテキストを貼り付けて「内容を確認」→「この内容で復元する」の順に進めます。",
      savedData: "この画面自体が新しく保存するのは、復元の一時的な作業状態と、直前の状態の退避分だけです。ユーザーの本丸データそのものは、各機能側の保存先にそのまま残ります。",
      notes: "復元は次に画面を再読み込みしたときに反映されます。復元の直前の状態は1世代だけ自動で退避され、この画面から元に戻すこともできます。",
      related: "アプリ内のすべての機能(現在バックアップの対象になっているのは、刀剣男士・部屋割り・本丸建築(3D)・相関図・日報・日誌・計画表・年表です)"
    }
  ];

  // =====================================================================
  // 表示ヘルパー
  // =====================================================================
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function pageHeader(seal, title, desc) {
    const header = el("div", "header");
    const h1 = document.createElement("h1");
    h1.appendChild(el("span", "seal", seal));
    h1.appendChild(document.createTextNode(title));
    header.appendChild(h1);
    if (desc) header.appendChild(el("p", null, desc));
    return header;
  }
  function backLink() {
    const a = document.createElement("a");
    a.className = "kw-back";
    a.href = "#";
    a.textContent = "← 瓦版トップへ戻る";
    return a;
  }
  function card(href, glyph, title, summary, small) {
    const a = document.createElement("a");
    a.className = "kw-card" + (small ? " small" : "");
    a.href = href;
    a.appendChild(el("span", "kw-card-icon", glyph));
    const copy = el("div", "kw-card-copy");
    copy.appendChild(el("strong", null, title));
    copy.appendChild(el("small", null, summary));
    a.appendChild(copy);
    return a;
  }

  // =====================================================================
  // 各画面の描画
  // =====================================================================
  function renderTop() {
    const wrap = el("div", "kw-page");
    wrap.appendChild(pageHeader("瓦", "瓦版", "このアプリのご利用について、よくあるご質問、各機能の使い方をまとめた案内ページです。"));
    const menu = el("div", "kw-menu");
    menu.appendChild(card("#about", "利", "ご利用について", "データの保存場所やバックアップなど、使う前に知っておきたいこと"));
    menu.appendChild(card("#faq", "問", "よくあるご質問", "保存・同期・バックアップなどについてのFAQ"));
    menu.appendChild(card("#guide", "使", "各機能の使い方", "刀剣男士・部屋割り・日報など、各機能の説明"));
    wrap.appendChild(menu);
    return wrap;
  }

  function renderAbout() {
    const wrap = el("div", "kw-page");
    wrap.appendChild(backLink());
    wrap.appendChild(pageHeader("利", "ご利用について"));

    const notice = el("div", "kw-notice");
    notice.appendChild(el("strong", null, "非公式のファンツールです"));
    notice.appendChild(el("p", null, "「審神者管理ツール」は、刀剣乱舞をお楽しみの審神者の方向けに作られた、個人制作の非公式ファンツールです。刀剣乱舞の公式運営・権利者とは関係がありません。"));
    wrap.appendChild(notice);

    ABOUT_SECTIONS.forEach(section => {
      const block = el("section", "kw-section");
      block.appendChild(el("h2", null, section.title));
      section.body.forEach(paragraph => block.appendChild(el("p", null, paragraph)));
      wrap.appendChild(block);
    });
    return wrap;
  }

  function renderFaq() {
    const wrap = el("div", "kw-page");
    wrap.appendChild(backLink());
    wrap.appendChild(pageHeader("問", "よくあるご質問"));

    const list = el("div", "kw-faq-list");
    FAQ_ITEMS.forEach(item => {
      const row = el("div", "kw-faq-item");
      const q = document.createElement("button");
      q.type = "button";
      q.className = "kw-faq-question";
      q.appendChild(el("span", null, item.question));
      q.appendChild(el("span", "kw-faq-chevron", "▾"));
      const answerBox = el("div", "kw-faq-answer");
      const answerText = typeof item.answer === "function" ? item.answer() : item.answer;
      answerBox.appendChild(el("p", null, answerText));
      answerBox.hidden = true;
      q.onclick = () => {
        answerBox.hidden = !answerBox.hidden;
        q.querySelector(".kw-faq-chevron").textContent = answerBox.hidden ? "▾" : "▴";
      };
      row.append(q, answerBox);
      list.appendChild(row);
    });
    wrap.appendChild(list);
    return wrap;
  }

  function renderGuideList() {
    const wrap = el("div", "kw-page");
    wrap.appendChild(backLink());
    wrap.appendChild(pageHeader("使", "各機能の使い方", "気になる機能を選ぶと、詳しい説明を確認できます。"));

    GUIDE_CATEGORIES.forEach(cat => {
      const items = GUIDE_ITEMS.filter(item => item.category === cat.id);
      if (!items.length) return;
      const group = el("section", "kw-guide-group");
      group.appendChild(el("h2", null, cat.label));
      const list = el("div", "kw-guide-list");
      items.forEach(item => list.appendChild(card(`#guide/${item.id}`, item.glyph, item.title, item.summary, true)));
      group.appendChild(list);
      wrap.appendChild(group);
    });
    return wrap;
  }

  function renderGuideDetail(id) {
    const item = GUIDE_ITEMS.find(g => g.id === id);
    const wrap = el("div", "kw-page");
    wrap.appendChild(backLink());
    if (!item) {
      wrap.appendChild(pageHeader("使", "各機能の使い方"));
      wrap.appendChild(el("p", "kw-empty", "該当する機能の説明が見つかりませんでした。"));
      return wrap;
    }
    wrap.appendChild(pageHeader(item.glyph, item.title, item.summary));
    [
      ["何ができる機能か", item.whatItDoes],
      ["基本的な使い方", item.howToUse],
      ["保存される内容", item.savedData],
      ["注意点", item.notes],
      ["関連する別機能", item.related]
    ].forEach(([label, value]) => {
      if (!value) return;
      const block = el("section", "kw-section");
      block.appendChild(el("h2", null, label));
      block.appendChild(el("p", null, value));
      wrap.appendChild(block);
    });
    return wrap;
  }

  // =====================================================================
  // ルーティング(#top・#about・#faq・#guide・#guide/<id>)
  // =====================================================================
  function parseHash() {
    const raw = (window.location.hash || "").replace(/^#/, "");
    const [section, sub] = raw.split("/");
    return { section: section || "top", sub: sub || null };
  }
  function render() {
    const { section, sub } = parseHash();
    root.innerHTML = "";
    let view;
    if (section === "about") view = renderAbout();
    else if (section === "faq") view = renderFaq();
    else if (section === "guide" && sub) view = renderGuideDetail(sub);
    else if (section === "guide") view = renderGuideList();
    else view = renderTop();
    root.appendChild(view);
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", render);
  render();
})();
