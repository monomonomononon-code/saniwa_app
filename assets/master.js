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

  // 刀派対応表(名前 → 刀派)。対応表に無い刀剣男士は「流派なし」として扱う(推測で埋めない)。
  // キーは normalizeCharName() を通した名前(スペース無視)。
  const SWORD_SCHOOL_MAP = {
    "三日月宗近": "三条", "小狐丸": "三条", "石切丸": "三条", "岩融": "三条", "今剣": "三条",

    "大典太光世": "三池", "ソハヤノツルキ": "三池",

    "数珠丸恒次": "青江", "にっかり青江": "青江", "狐ヶ崎為次": "青江",

    "鬼丸国綱": "粟田口", "鳴狐": "粟田口", "一期一振": "粟田口", "鯰尾藤四郎": "粟田口",
    "骨喰藤四郎": "粟田口", "平野藤四郎": "粟田口", "厚藤四郎": "粟田口", "後藤藤四郎": "粟田口",
    "信濃藤四郎": "粟田口", "前田藤四郎": "粟田口", "秋田藤四郎": "粟田口", "博多藤四郎": "粟田口",
    "乱藤四郎": "粟田口", "五虎退": "粟田口", "薬研藤四郎": "粟田口", "包丁藤四郎": "粟田口",
    "毛利藤四郎": "粟田口", "白山吉光": "粟田口",

    "大包平": "古備前", "鶯丸": "古備前", "八丁念仏": "古備前", "古備前信房": "古備前",

    "明石国行": "来", "蛍丸": "来", "愛染国俊": "来", "面影": "来",

    "千子村正": "村正", "蜻蛉切": "村正",

    "物吉貞宗": "貞宗", "太鼓鐘貞宗": "貞宗", "亀甲貞宗": "貞宗", "二筋樋貞宗": "貞宗",

    "燭台切光忠": "長船", "大般若長光": "長船", "小竜景光": "長船", "謙信景光": "長船",
    "小豆長光": "長船", "福島光忠": "長船", "実休光忠": "長船", "後家兼光": "長船", "安宅切": "長船",

    "江雪左文字": "左文字", "宗三左文字": "左文字", "小夜左文字": "左文字", "太閤左文字": "左文字",

    "歌仙兼定": "兼定", "和泉守兼定": "兼定", "人間無骨": "兼定",

    "山姥切国広": "堀川", "山伏国広": "堀川", "堀川国広": "堀川",

    "蜂須賀虎徹": "虎徹", "浦島虎徹": "虎徹",
    "長曽祢虎徹": "虎徹…？", // ユーザー確認済み: 公式表記としてそのまま扱う(蜂須賀・浦島とは別区分)

    "篭手切江": "江", "豊前江": "江", "桑名江": "江", "松井江": "江", "五月雨江": "江",
    "村雲江": "江", "稲葉江": "江", "富田江": "江", "倶利伽羅江": "江",

    "日向正宗": "正宗", "石田正宗": "正宗", "京極正宗": "正宗", "九鬼正宗": "正宗",

    "南泉一文字": "福岡一文字", "山鳥毛": "福岡一文字", "日光一文字": "福岡一文字",
    "一文字則宗": "福岡一文字", "姫鶴一文字": "福岡一文字", "道誉一文字": "福岡一文字",

    "古今伝授の太刀": "豊後国行平", "地蔵行平": "豊後国行平",

    "大倶利伽羅": "広光", "火車切": "広光",

    "雲生": "鵜飼", "雲次": "鵜飼", "雲重": "鵜飼",

    "笹貫": "波平", "波平行安": "波平"
  };
  function schoolOf(c) {
    return SWORD_SCHOOL_MAP[normalizeCharName(c.name)] || "";
  }

  // グループ定義(名前・カテゴリ・所属する刀剣男士名)。
  // members の表記は normalizeCharName() で比較するので、スペース有無は気にしなくてよい。
  const GROUP_CATEGORIES = ["兄弟", "かつての主や時代繋がり", "所蔵元繋がり", "回想繋がり", "絵師繋がり", "ゲーム内イベント繋がり", "その他"];
  const GROUP_DEFS = [
    // --- 兄弟 ---
    { category: "兄弟", name: "藤四郎兄弟", members: ["一期一振", "鯰尾藤四郎", "骨喰藤四郎", "平野藤四郎", "厚藤四郎", "後藤藤四郎", "信濃藤四郎", "前田藤四郎", "秋田藤四郎", "博多藤四郎", "乱藤四郎", "五虎退", "薬研藤四郎", "包丁藤四郎", "毛利藤四郎", "白山吉光"] },
    { category: "兄弟", name: "国広三兄弟", members: ["山姥切国広", "山伏国広", "堀川国広"] },
    { category: "兄弟", name: "虎徹三兄弟", members: ["蜂須賀虎徹", "浦島虎徹", "長曽祢虎徹"] },
    { category: "兄弟", name: "左文字兄弟", members: ["江雪左文字", "宗三左文字", "小夜左文字", "太閤左文字"] },
    { category: "兄弟", name: "貞宗兄弟", members: ["物吉貞宗", "太鼓鐘貞宗", "亀甲貞宗", "二筋樋貞宗"] },
    { category: "兄弟", name: "大太刀兄弟", members: ["太郎太刀", "次郎太刀"] },
    { category: "兄弟", name: "源氏兄弟", members: ["髭切", "膝丸"] },
    { category: "兄弟", name: "三池兄弟", members: ["大典太光世", "ソハヤノツルキ"] },
    { category: "兄弟", name: "光忠兄弟", members: ["燭台切光忠", "福島光忠", "実休光忠"] },
    { category: "兄弟", name: "長光兄弟", members: ["大般若長光", "小豆長光"] },
    { category: "兄弟", name: "景光兄弟", members: ["小竜景光", "謙信景光"] },
    { category: "兄弟", name: "正宗兄弟", members: ["日向正宗", "石田正宗", "京極正宗", "九鬼正宗"] },
    { category: "兄弟", name: "広光兄弟", members: ["大倶利伽羅", "火車切"] },

    // --- かつての主や時代繋がり ---
    { category: "かつての主や時代繋がり", name: "平安組", members: ["三日月宗近", "鶴丸国永", "小狐丸", "小烏丸", "抜丸", "今剣", "岩融", "髭切", "膝丸", "獅子王", "石切丸", "鶯丸", "大包平"] },
    { category: "かつての主や時代繋がり", name: "義経主従", members: ["今剣", "岩融"] },
    { category: "かつての主や時代繋がり", name: "源氏組", members: ["今剣", "岩融", "髭切", "膝丸", "獅子王", "童子切安綱", "石切丸"] },
    { category: "かつての主や時代繋がり", name: "織田組", members: ["宗三左文字", "へし切長谷部", "不動行光", "薬研藤四郎", "実休光忠"] },
    { category: "かつての主や時代繋がり", name: "伊達組", members: ["燭台切光忠", "大倶利伽羅", "鶴丸国永", "太鼓鐘貞宗"] },
    { category: "かつての主や時代繋がり", name: "細川組", members: ["歌仙兼定", "小夜左文字", "篭手切江", "松井江", "地蔵行平", "古今伝授の太刀"] },
    { category: "かつての主や時代繋がり", name: "本多組", members: ["蜻蛉切", "桑名江"] },
    { category: "かつての主や時代繋がり", name: "真田組", members: ["大千鳥十文字槍", "泛塵", "千子村正"] },
    { category: "かつての主や時代繋がり", name: "福島組", members: ["日本号", "福島光忠"] },
    { category: "かつての主や時代繋がり", name: "池田組", members: ["鳴狐", "大包平", "浦島虎徹", "毛利藤四郎", "面影"] },
    { category: "かつての主や時代繋がり", name: "沖田組", members: ["加州清光", "大和守安定", "一文字則宗"] },
    { category: "かつての主や時代繋がり", name: "土方組", members: ["和泉守兼定", "堀川国広"] },
    { category: "かつての主や時代繋がり", name: "龍馬組", members: ["陸奥守吉行", "肥前忠広"] },
    { category: "かつての主や時代繋がり", name: "新撰組男士", members: ["和泉守兼定", "堀川国広", "加州清光", "大和守安定", "長曽祢虎徹", "孫六兼元", "一文字則宗"] },
    { category: "かつての主や時代繋がり", name: "幕末刀剣組", members: ["和泉守兼定", "堀川国広", "加州清光", "大和守安定", "長曽祢虎徹", "陸奥守吉行", "肥前忠広", "南海太郎朝尊", "孫六兼元", "一文字則宗"] },
    { category: "かつての主や時代繋がり", name: "足利組", members: ["三日月宗近", "骨喰藤四郎", "薬研藤四郎", "厚藤四郎", "鶯丸", "日本号", "髭切", "一期一振", "五虎退", "大典太光世", "大般若長光", "地蔵行平"] },
    { category: "かつての主や時代繋がり", name: "黒田組", members: ["へし切長谷部", "博多藤四郎", "日本号", "厚藤四郎", "日光一文字", "五月雨江", "安宅切", "小夜左文字"] },
    { category: "かつての主や時代繋がり", name: "結城組", members: ["御手杵", "明石国行", "亀甲貞宗", "稲葉江", "石田正宗", "道誉一文字", "二筋樋貞宗", "ソハヤノツルキ", "童子切安綱"] },
    { category: "かつての主や時代繋がり", name: "肥後組", members: ["歌仙兼定", "同田貫正国", "蛍丸"] },
    { category: "かつての主や時代繋がり", name: "最上組", members: ["髭切", "亀甲貞宗"] },
    { category: "かつての主や時代繋がり", name: "安達組", members: ["鶴丸国永", "髭切"] },
    { category: "かつての主や時代繋がり", name: "上杉組", members: ["五虎退", "謙信景光", "小豆長光", "山鳥毛", "姫鶴一文字", "後家兼光", "火車切"] },
    { category: "かつての主や時代繋がり", name: "小田原組", members: ["江雪左文字", "山姥切国広", "山姥切長義", "地蔵行平", "日光一文字", "小豆長光"] },
    { category: "かつての主や時代繋がり", name: "前田組", members: ["前田藤四郎", "平野藤四郎", "大典太光世", "愛染国俊", "白山吉光", "五月雨江", "村雲江", "富田江", "信濃藤四郎"] },
    { category: "かつての主や時代繋がり", name: "森兄弟組", members: ["人間無骨", "不動行光", "愛染国俊"] },
    { category: "かつての主や時代繋がり", name: "京極組", members: ["にっかり青江", "京極正宗", "道誉一文字"] },
    { category: "かつての主や時代繋がり", name: "一之箱", members: ["骨喰藤四郎", "一期一振", "南泉一文字", "鯰尾藤四郎", "宗三左文字", "にっかり青江"] },
    { category: "かつての主や時代繋がり", name: "南部組", members: ["亀甲貞宗", "道誉一文字"] },
    { category: "かつての主や時代繋がり", name: "酒井組", members: ["信濃藤四郎", "古備前信房"] },

    // --- 所蔵元繋がり ---
    { category: "所蔵元繋がり", name: "献上組", members: ["一期一振", "平野藤四郎", "鶯丸", "鶴丸国永", "鬼丸国綱", "獅子王", "日本号", "五虎退", "小烏丸", "小竜景光"] },
    { category: "所蔵元繋がり", name: "トーハク組", members: ["三日月宗近", "大包平", "獅子王", "鳴狐", "亀甲貞宗", "厚藤四郎", "小竜景光", "大般若長光", "毛利藤四郎", "石田正宗", "童子切安綱"] },
    { category: "所蔵元繋がり", name: "三名槍", members: ["蜻蛉切", "御手杵", "日本号"] },
    { category: "所蔵元繋がり", name: "天下五剣組", members: ["三日月宗近", "大典太光世", "数珠丸恒次", "鬼丸国綱", "童子切安綱"] },
    { category: "所蔵元繋がり", name: "江戸三作", members: ["源清麿", "水心子正秀", "大慶直胤"] },
    { category: "所蔵元繋がり", name: "徳美組", members: ["鯰尾藤四郎", "後藤藤四郎", "物吉貞宗", "南泉一文字", "山姥切長義", "五月雨江"] },
    { category: "所蔵元繋がり", name: "紀州徳川組", members: ["江雪左文字", "日向正宗", "松井江", "骨喰藤四郎", "数珠丸恒次"] },
    { category: "所蔵元繋がり", name: "琉球宝刀組", members: ["千代金丸", "北谷菜切", "治金丸"] },
    { category: "所蔵元繋がり", name: "佐野美組", members: ["蜻蛉切", "松井江", "火車切"] },
    { category: "所蔵元繋がり", name: "四天王寺組", members: ["七星剣", "丙子椒林剣"] },
    { category: "所蔵元繋がり", name: "徳ミュ組", members: ["燭台切光忠", "八丁念仏"] },
    { category: "所蔵元繋がり", name: "京博組", members: ["陸奥守吉行", "秋田藤四郎", "桑名江", "笹貫"] },
    { category: "所蔵元繋がり", name: "ちはく組", members: ["信濃藤四郎", "古備前信房"] },

    // --- 絵師繋がり ---
    { category: "絵師繋がり", name: "シラノ刀", members: ["鶯丸", "髭切", "膝丸"] },
    { category: "絵師繋がり", name: "小宮刀", members: ["大倶利伽羅", "へし切長谷部", "大包平"] },
    { category: "絵師繋がり", name: "トイチ刀", members: ["山姥切国広", "太鼓鐘貞宗", "山姥切長義"] },
    { category: "絵師繋がり", name: "めくりコンビ", members: ["にっかり青江", "歌仙兼定"] },
    { category: "絵師繋がり", name: "minato刀", members: ["御手杵", "不動行光", "大千鳥十文字槍"] },
    { category: "絵師繋がり", name: "煮たか刀", members: ["陸奥守吉行", "肥前忠広", "篭手切江"] },
    { category: "絵師繋がり", name: "lack刀", members: ["一文字則宗", "孫六兼元"] },
    { category: "絵師繋がり", name: "こぺ刀", members: ["雲生", "雲次"] },

    // --- ゲーム内イベント繋がり ---
    { category: "ゲーム内イベント繋がり", name: "初期刀組", members: ["加州清光", "歌仙兼定", "陸奥守吉行", "山姥切国広", "蜂須賀虎徹"] },
    { category: "ゲーム内イベント繋がり", name: "大阪城地下組", members: ["博多藤四郎", "後藤藤四郎", "信濃藤四郎", "包丁藤四郎", "毛利藤四郎"] },
    { category: "ゲーム内イベント繋がり", name: "政府刀", members: ["山姥切長義", "肥前忠広", "南海太郎朝尊", "水心子正秀", "源清麿", "地蔵行平", "古今伝授の太刀", "一文字則宗", "狐ヶ崎為次"] },
    { category: "ゲーム内イベント繋がり", name: "文久土佐組", members: ["陸奥守吉行", "肥前忠広", "南海太郎朝尊"] },
    { category: "ゲーム内イベント繋がり", name: "天保江戸組", members: ["水心子正秀", "源清麿"] },

    // --- 回想繋がり ---
    { category: "回想繋がり", name: "無用組", members: ["御手杵", "同田貫正国"] },
    { category: "回想繋がり", name: "足利宝剣", members: ["三日月宗近", "骨喰藤四郎"] },
    { category: "回想繋がり", name: "京極の丹碧", members: ["にっかり青江", "京極正宗"] },
    { category: "回想繋がり", name: "神剣回想組", members: ["石切丸", "にっかり青江"] },

    // --- その他 ---
    { category: "その他", name: "鳥太刀", members: ["鶴丸国永", "鶯丸", "小烏丸", "山鳥毛", "姫鶴一文字"] },
    { category: "その他", name: "レア4太刀", members: ["一期一振", "鶯丸", "江雪左文字", "鶴丸国永", "髭切", "膝丸", "小竜景光", "大般若長光", "古今伝授の太刀", "日光一文字", "姫鶴一文字", "福島光忠", "抜丸", "実休光忠", "古備前信房", "三郎国宗", "狐ヶ崎為次"] },
    { category: "その他", name: "大将組", members: ["薬研藤四郎", "厚藤四郎", "後藤藤四郎", "信濃藤四郎"] },
    { category: "その他", name: "国宝大将組", members: ["後藤藤四郎", "厚藤四郎"] },
    { category: "その他", name: "大将コンビ", members: ["薬研藤四郎", "厚藤四郎"] },
    { category: "その他", name: "大将トリオ", members: ["薬研藤四郎", "厚藤四郎", "後藤藤四郎"] },
    { category: "その他", name: "粟田口短刀年長組", members: ["薬研藤四郎", "厚藤四郎", "後藤藤四郎", "信濃藤四郎", "乱藤四郎"] },
    { category: "その他", name: "本科と写し／伯仲コンビ", members: ["山姥切国広", "山姥切長義"] },
    { category: "その他", name: "山猫組", members: ["山姥切国広", "山姥切長義", "南泉一文字"] },
    { category: "その他", name: "和睦コンビ", members: ["江雪左文字", "数珠丸恒次"] },
    { category: "その他", name: "おかっぱ藤四郎", members: ["前田藤四郎", "平野藤四郎"] },
    { category: "その他", name: "眼鏡男士", members: ["薬研藤四郎", "明石国行", "博多藤四郎", "亀甲貞宗", "巴形薙刀", "篭手切江", "南海太郎朝尊", "山鳥毛", "日光一文字", "笹貫", "石田正宗", "波平行安"] },
    { category: "その他", name: "倶利伽羅龍組", members: ["骨喰藤四郎", "大倶利伽羅", "日本号", "浦島虎徹", "小竜景光", "古今伝授の太刀", "倶利伽羅江", "千子村正", "不動行光"] },
    { category: "その他", name: "化け猫ライダー", members: ["南泉一文字", "山姥切長義", "豊前江"] },
    { category: "その他", name: "花鳥風月", members: ["歌仙兼定", "蜂須賀虎徹", "宗三左文字", "にっかり青江"] },
    { category: "その他", name: "クリスマス組", members: ["毛利藤四郎", "白山吉光", "陸奥守吉行", "肥前忠広", "篭手切江"] },
    { category: "その他", name: "オカン組", members: ["薬研藤四郎", "燭台切光忠"] },
    { category: "その他", name: "忠犬コンビ", members: ["へし切長谷部", "不動行光"] },
    { category: "その他", name: "狐借虎威コンビ", members: ["鳴狐", "五虎退"] },
    { category: "その他", name: "御前組", members: ["巴形薙刀", "静形薙刀"] }
  ];
  function groupsOf(c) {
    return GROUP_DEFS.filter(g => g.members.some(m => normalizeCharName(m) === normalizeCharName(c.name)));
  }

  // 絞り込み: カテゴリごとに選んだ値の配列。空配列 = 「すべて」。
  // 同じカテゴリ内は複数選択可(OR)、カテゴリ間はAND。
  const NO_SCHOOL = "__no_school__"; // 「流派なし」の絞り込み用の特別な値(実際の流派名と衝突しない)
  let filters = { unit: [], swordType: [], school: [], group: [] };
  function matchesFilters(c) {
    const unitOk = filters.unit.length === 0 || filters.unit.includes(c.unit);
    const typeOk = filters.swordType.length === 0 || filters.swordType.includes(c.swordType);
    const schoolOk = filters.school.length === 0 || filters.school.some(s => s === NO_SCHOOL ? !schoolOf(c) : schoolOf(c) === s);
    const groupOk = filters.group.length === 0 || groupsOf(c).some(g => filters.group.includes(g.name));
    return unitOk && typeOk && schoolOk && groupOk;
  }
  // 選択肢は既存データに実在する値だけを出す(未使用の部隊・刀種は出さない)。{value, label} で統一する。
  function unitFilterOptions() {
    return UNITS.filter(u => characters.some(c => c.unit === u)).map(u => ({ value: u, label: u }));
  }
  function swordTypeFilterOptions() {
    return SWORD_TYPES.filter(t => characters.some(c => c.swordType === t)).map(t => ({ value: t, label: t }));
  }
  function schoolFilterOptions() {
    const set = new Set();
    let hasNoSchool = false;
    characters.forEach(c => {
      const s = schoolOf(c);
      if (s) set.add(s); else hasNoSchool = true;
    });
    const opts = Array.from(set).sort((a, b) => a.localeCompare(b, "ja")).map(s => ({ value: s, label: s }));
    if (hasNoSchool) opts.push({ value: NO_SCHOOL, label: "流派なし" });
    return opts;
  }
  // グループは登録数が多くなる想定なので、現在のデータに実在するものだけを対象にする
  function groupTagOptions() {
    return GROUP_DEFS.filter(g => characters.some(c => groupsOf(c).includes(g)));
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
  let filterGroupsOpen = {}; // カテゴリごとの開閉状態(部隊/刀種/刀派/グループ、今後増える分もキーを足すだけでよい)。未登場のキーは閉じている扱い。
  let groupCategoryFilter = ""; // グループ内の2段階目: 選んでいるカテゴリ(絞り込み条件そのものではなく、タグ一覧を絞るための表示用)
  let groupSearchText = ""; // グループ名の検索欄の入力値
  let addCharModalOpen = false;
  let duplicateConfirm = null; // 追加しようとした内容が重複していた時の確認待ち { name, swordType, level }

  // 新入り登録の確定処理。通常追加/重複確認「はい」の両方から呼ぶ。
  function commitNewCharacter(draft) {
    const newChar = {
      id: "c" + Date.now(),
      name: draft.name,
      swordType: draft.swordType || "",
      height: "", hobby: "", formerOwner: "", personality: "", memo: "",
      level: draft.level || 1,
      activationDate: "", unit: "", isCaptain: false, isKiwame: false
    };
    characters.push(newChar);
    notify(`新入り「${newChar.name}」を追加`);
    syncCharacter(newChar);
    render();
  }

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

    const toolbar = document.createElement("div");
    toolbar.className = "list-toolbar";
    toolbar.appendChild(renderFilterToggle());
    const toolbarActions = document.createElement("div");
    toolbarActions.className = "list-toolbar-actions";
    const addToggle = document.createElement("button");
    addToggle.type = "button";
    addToggle.className = "add-char-toggle";
    addToggle.textContent = "＋ 新入男士を追加";
    addToggle.onclick = () => { addCharModalOpen = true; render(); };
    const bulkToggle = document.createElement("button");
    bulkToggle.type = "button";
    bulkToggle.className = "add-char-bulk";
    bulkToggle.textContent = "100振り追加";
    bulkToggle.onclick = () => { bulkConfirmOpen = true; render(); };
    toolbarActions.appendChild(addToggle);
    toolbarActions.appendChild(bulkToggle);
    toolbar.appendChild(toolbarActions);
    el.appendChild(toolbar);
    if (filterPanelOpen) el.appendChild(renderFilterPanel());

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

    if (editingId) el.appendChild(renderEditModal(editingId));
    if (bulkConfirmOpen) el.appendChild(renderBulkConfirmModal());
    if (addCharModalOpen) el.appendChild(renderAddCharModal());
    if (duplicateConfirm) el.appendChild(renderDuplicateConfirmModal());
  }

  // 絞込/並替の開閉ボタン(ツールバーに配置)
  function renderFilterToggle() {
    const activeCount = filters.unit.length + filters.swordType.length + filters.school.length + filters.group.length;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "filter-toggle" + (filterPanelOpen ? " open" : "");
    toggle.innerHTML = `<span>絞込 / 並替</span>${activeCount ? `<span class="filter-toggle-count">${activeCount}</span>` : ""}<span class="filter-toggle-chev">${filterPanelOpen ? "▲" : "▼"}</span>`;
    toggle.onclick = () => { filterPanelOpen = !filterPanelOpen; render(); };
    return toggle;
  }

  // 絞り込みパネルの中身: 部隊・刀種・刀派の3カテゴリ(今後も同じ形でカテゴリを足せる)。
  // カテゴリ見出しをタップすると、そのカテゴリだけ開閉する(他のカテゴリの開閉状態には影響しない)。
  // 同じカテゴリ内は複数選択可(OR、例: 粟田口+兼定)、カテゴリ間はAND(例: 第二部隊+脇差)。
  function renderFilterPanel() {
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
      const isOpen = !!filterGroupsOpen[g.key];
      const count = filters[g.key].length;

      const header = document.createElement("button");
      header.type = "button";
      header.className = "filter-group-header" + (isOpen ? " open" : "");
      header.innerHTML = `<span>${g.label}</span>${count ? `<span class="filter-toggle-count">${count}</span>` : ""}<span class="filter-group-chev">${isOpen ? "▲" : "▼"}</span>`;
      header.onclick = () => { filterGroupsOpen[g.key] = !isOpen; render(); };
      group.appendChild(header);

      if (isOpen) {
        const chips = document.createElement("div");
        chips.className = "filter-chips";
        const allChip = document.createElement("button");
        allChip.type = "button";
        allChip.className = "filter-chip" + (filters[g.key].length === 0 ? " active" : "");
        allChip.textContent = "すべて";
        allChip.onclick = () => { filters[g.key] = []; render(); };
        chips.appendChild(allChip);

        g.options.forEach(opt => {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "filter-chip" + (filters[g.key].includes(opt.value) ? " active" : "");
          chip.textContent = opt.label;
          chip.onclick = () => {
            const list = filters[g.key];
            const i = list.indexOf(opt.value);
            if (i === -1) list.push(opt.value); else list.splice(i, 1);
            render();
          };
          chips.appendChild(chip);
        });
        group.appendChild(chips);
      }
      bar.appendChild(group);
    });
    bar.appendChild(renderGroupFilterGroup());
    return bar;
  }

  // 「グループ」は件数が多くなる想定なので2段階選択にする:
  // ①グループ全体の開閉 → ②7つのカテゴリから選ぶ(タグ一覧を絞るための表示用の選択、絞り込み条件そのものではない)
  // → 該当するグループタグ(複数選択可・OR)を選ぶ。検索欄でも直接タグを絞れる。
  function renderGroupFilterGroup() {
    const group = document.createElement("div");
    group.className = "filter-group";
    const isOpen = !!filterGroupsOpen.group;
    const count = filters.group.length;

    const header = document.createElement("button");
    header.type = "button";
    header.className = "filter-group-header" + (isOpen ? " open" : "");
    header.innerHTML = `<span>グループ</span>${count ? `<span class="filter-toggle-count">${count}</span>` : ""}<span class="filter-group-chev">${isOpen ? "▲" : "▼"}</span>`;
    header.onclick = () => { filterGroupsOpen.group = !isOpen; render(); };
    group.appendChild(header);
    if (!isOpen) return group;

    const catRow = document.createElement("div");
    catRow.className = "filter-chips";
    const allChip = document.createElement("button");
    allChip.type = "button";
    allChip.className = "filter-chip" + (filters.group.length === 0 ? " active" : "");
    allChip.textContent = "すべて";
    allChip.onclick = () => { filters.group = []; groupCategoryFilter = ""; groupSearchText = ""; render(); };
    catRow.appendChild(allChip);
    GROUP_CATEGORIES.forEach(cat => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip" + (groupCategoryFilter === cat ? " active" : "");
      chip.textContent = cat;
      chip.onclick = () => { groupCategoryFilter = groupCategoryFilter === cat ? "" : cat; render(); };
      catRow.appendChild(chip);
    });
    group.appendChild(catRow);

    const searchWrap = document.createElement("div");
    searchWrap.className = "group-search-wrap";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "group-search-input";
    searchInput.placeholder = "グループ名で検索";
    searchInput.value = groupSearchText;
    searchWrap.appendChild(searchInput);
    group.appendChild(searchWrap);

    const tagsWrap = document.createElement("div");
    tagsWrap.className = "filter-chips";
    group.appendChild(tagsWrap);

    // 検索欄の入力ではタグ一覧だけを差し替える(パネル全体をrender()し直すと入力中にフォーカスが外れるため)
    searchInput.oninput = () => { groupSearchText = searchInput.value; renderGroupTagChips(tagsWrap); };
    renderGroupTagChips(tagsWrap);

    return group;
  }

  function renderGroupTagChips(container) {
    container.innerHTML = "";
    const q = groupSearchText.trim();
    // 「すべて」(カテゴリ未選択 かつ 検索なし)の間は92個ぶんのタグを出さない。
    // 「すべて」は一覧を全部見せる意味ではなく、グループ条件で絞り込まないという意味にする。
    if (!groupCategoryFilter && !q) {
      const hint = document.createElement("div");
      hint.className = "group-tags-empty";
      hint.textContent = "カテゴリを選ぶか、グループ名で検索してください。";
      container.appendChild(hint);
      return;
    }
    let opts = groupTagOptions();
    // 検索文字があれば、カテゴリの選択に関係なく全グループから探す
    if (q) opts = opts.filter(g => g.name.includes(q));
    else opts = opts.filter(g => g.category === groupCategoryFilter);

    if (!opts.length) {
      const empty = document.createElement("div");
      empty.className = "group-tags-empty";
      empty.textContent = "該当するグループがありません。";
      container.appendChild(empty);
      return;
    }
    opts.forEach(def => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip" + (filters.group.includes(def.name) ? " active" : "");
      chip.textContent = def.name;
      chip.onclick = () => {
        const list = filters.group;
        const i = list.indexOf(def.name);
        if (i === -1) list.push(def.name); else list.splice(i, 1);
        render();
      };
      container.appendChild(chip);
    });
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

  // 新入男士を追加するポップアップ。名前入力は実装済み全刀剣男士からの
  // オートコンプリート付き(候補を選ばない自由入力も可)。
  // 名前が全刀剣男士マスターの表記と完全一致したら刀種を自動選択する。
  // レベルは追加時点でデフォルト1を選択しておく。
  function renderAddCharModal() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.onclick = e => { if (e.target === overlay) { addCharModalOpen = false; render(); } };

    const card = document.createElement("div");
    card.className = "modal-card";
    card.innerHTML = `
      <div class="m-eyebrow">新入り登録</div>
      <h2>新入男士を追加</h2>
      <div class="m-field-label">名前</div>
      <div class="add-char-name-wrap">
        <input id="new-char-name" class="m-input" placeholder="名前(例：獅子王)" autocomplete="off" />
        <div class="add-char-suggest" id="new-char-suggest"></div>
      </div>
      <div class="m-field-label">刀種</div>
      <select id="new-char-type" class="m-input">
        <option value="">刀種を選択</option>
        ${SWORD_TYPES.map(type => `<option value="${type}">${type}</option>`).join("")}
      </select>
      <div class="m-field-label">レベル</div>
      <select id="new-char-level" class="m-input">
        ${Array.from({ length: 99 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}
      </select>
      <div class="confirm-actions">
        <button type="button" class="confirm-btn secondary" id="new-char-cancel">キャンセル</button>
        <button type="button" class="confirm-btn primary" id="new-char-submit">この内容で追加</button>
      </div>
    `;
    overlay.appendChild(card);

    const nameInput = card.querySelector("#new-char-name");
    const typeSelect = card.querySelector("#new-char-type");
    const levelSelect = card.querySelector("#new-char-level");
    const suggestBox = card.querySelector("#new-char-suggest");
    levelSelect.value = "1"; // 追加時はレベル1をデフォルトで選択しておく

    const hideSuggestions = () => { suggestBox.innerHTML = ""; suggestBox.classList.remove("open"); };
    const applyExactMatch = () => {
      const exact = ALL_TOUKEN_MASTER.find(([name]) => name === nameInput.value.trim());
      if (exact) typeSelect.value = exact[1];
    };
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
          typeSelect.value = type;
          hideSuggestions();
        };
        suggestBox.appendChild(item);
      });
      suggestBox.classList.add("open");
    };
    nameInput.oninput = () => { showSuggestions(); applyExactMatch(); };
    nameInput.onfocus = () => {
      showSuggestions();
      // ソフトキーボードが開いた後にカードの表示位置がずれても、名前欄が隠れないよう寄せ直す
      setTimeout(() => nameInput.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
    };
    nameInput.onblur = hideSuggestions;

    card.querySelector("#new-char-cancel").onclick = () => { addCharModalOpen = false; render(); };
    card.querySelector("#new-char-submit").onclick = () => {
      const name = nameInput.value.trim();
      if (!name) return;
      const draft = { name, swordType: typeSelect.value.trim(), level: Number(levelSelect.value) || 1 };
      addCharModalOpen = false;
      // 半角/全角スペース違いも同一とみなして重複を確認する(normalizeCharNameと同じ規則)
      const dup = characters.find(x => normalizeCharName(x.name) === normalizeCharName(name));
      if (dup) { duplicateConfirm = draft; render(); return; }
      commitNewCharacter(draft);
    };

    return overlay;
  }

  // 同名(スペース違い含む)の刀剣男士が既にいる時の確認ポップ。
  // 「はい」でそのまま追加、「いいえ」で追加せず閉じる。
  function renderDuplicateConfirmModal() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.onclick = e => { if (e.target === overlay) { duplicateConfirm = null; render(); } };

    const name = duplicateConfirm.name;
    const card = document.createElement("div");
    card.className = "modal-card";
    card.innerHTML = `
      <div class="m-eyebrow">確認</div>
      <h2>登録済みです</h2>
      <p class="confirm-text">${escapeHtml(name)}は既に登録されています。</p>
      <p class="confirm-text confirm-text-sub">${escapeHtml(name)}を登録しますか？</p>
      <div class="confirm-actions">
        <button type="button" class="confirm-btn secondary" id="dup-confirm-no">いいえ</button>
        <button type="button" class="confirm-btn primary" id="dup-confirm-yes">はい</button>
      </div>
    `;
    overlay.appendChild(card);

    card.querySelector("#dup-confirm-no").onclick = () => { duplicateConfirm = null; render(); };
    card.querySelector("#dup-confirm-yes").onclick = () => {
      const draft = duplicateConfirm;
      duplicateConfirm = null;
      commitNewCharacter(draft);
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
        height: "", hobby: "", formerOwner: "", personality: "", memo: "", level: 1,
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

    const bottomActions = document.createElement("div");
    bottomActions.className = "modal-bottom-actions";
    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.textContent = "閉じる";
    closeBtn.onclick = closeModal;
    bottomActions.appendChild(closeBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "modal-delete";
    deleteBtn.textContent = "削除";
    deleteBtn.onclick = () => {
      if (!window.confirm(`${c.name}を削除しますか？\nこの操作は取り消せません。`)) return;
      characters = characters.filter(x => x.id !== c.id);
      editingId = null;
      notify(`${c.name}を削除`);
      // 親(app.js)の共有リストにも削除を伝える。伝えないと、他の画面を触るたびに
      // 親から古い characters_sync が返ってきて削除したキャラが復活してしまう。
      try { window.parent && window.parent.postMessage({ source: "master", type: "character_delete", id: c.id }, "*"); } catch (e) {}
      render();
    };
    bottomActions.appendChild(deleteBtn);
    card.appendChild(bottomActions);

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

