(function (global) {
  "use strict";

  function createStandardBossRouteMap(id, normalExperience, bossExperience) {
    return {
      id,
      routes: {
        boss: {
          label: "ボス到達ルート",
          battles: [
            { id: "normal-1", cellId: "A", type: "normal", label: "道中戦", baseExperience: normalExperience },
            { id: "boss", cellId: "BOSS", type: "boss", label: "ボス戦", baseExperience: bossExperience }
          ]
        }
      },
      // 実際の接続・終点・分岐確率は資料が揃ってから登録します。
      // ここでは経験値データだけを先に保持し、確率未設定では期待値計算を行いません。
      graph: {
        startNodeId: null,
        nodes: {
          "normal-1": { id: "normal-1", type: "normal", label: "道中戦", baseExperience: normalExperience },
          boss: { id: "boss", type: "boss", label: "ボス戦", baseExperience: bossExperience, terminal: "boss" }
        },
        connections: []
      }
    };
  }

  // routes は分岐に備えて複数持てます。各 battles 要素がルート上の戦闘マスです。
  const MAP_EXPERIENCE = {
    "1-1 函館": createStandardBossRouteMap("1-1-hakodate", 30, 90),
    "1-2 会津": createStandardBossRouteMap("1-2-aizu", 50, 150),
    "1-3 宇都宮": createStandardBossRouteMap("1-3-utsunomiya", 80, 240),
    "1-4 鳥羽": createStandardBossRouteMap("1-4-toba", 100, 300),
    "2-1 鳥羽": createStandardBossRouteMap("2-1-toba", 120, 360),
    "2-2 江戸": createStandardBossRouteMap("2-2-edo", 140, 420),
    "2-3 江戸（元禄）": createStandardBossRouteMap("2-3-edo-genroku", 170, 510),
    "2-4 大阪（大阪冬の陣）": createStandardBossRouteMap("2-4-osaka-winter", 200, 600)
  };

  // 維新の記憶：ユーザーから明示されたマス・接続情報のみを登録。
  // probability: null は「確率未設定」を表し、期待値計算を停止させます。
  MAP_EXPERIENCE["1-1 函館"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 30 },
      B: { id: "B", type: "boss", label: "B", baseExperience: 90, terminal: "boss" },
      C: { id: "C", type: "normal", label: "C", baseExperience: 30, terminal: "other" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: null },
      { from: "A", to: "C", probability: null }
    ]
  };

  MAP_EXPERIENCE["1-2 会津"].graph = {
    startNodeId: "sortie",
    guaranteedBossArrival: true,
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 50 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 50 },
      C: { id: "C", type: "resource", label: "C" },
      D: { id: "D", type: "boss", label: "D", baseExperience: 150, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: null },
      { from: "sortie", to: "B", probability: null },
      { from: "A", to: "D", probability: 1 },
      { from: "B", to: "C", probability: 1 },
      { from: "C", to: "D", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["1-3 宇都宮"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 80 },
      B: { id: "B", type: "resource", label: "B" },
      C: { id: "C", type: "normal", label: "C", baseExperience: 80, terminal: "other" },
      D: { id: "D", type: "boss", label: "D", baseExperience: 240, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: 1 },
      { from: "B", to: "C", probability: null },
      { from: "B", to: "D", probability: null }
    ]
  };

  MAP_EXPERIENCE["1-4 鳥羽"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 100 },
      B: { id: "B", type: "resource", label: "B" },
      C: { id: "C", type: "normal", label: "C", baseExperience: 100 },
      D: { id: "D", type: "resource", label: "D" },
      E: { id: "E", type: "normal", label: "E", baseExperience: 100 },
      F: { id: "F", type: "normal", label: "F", baseExperience: 100, terminal: "other" },
      G: { id: "G", type: "boss", label: "G", baseExperience: 300, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: null },
      { from: "sortie", to: "C", probability: null },
      { from: "A", to: "B", probability: 1 },
      { from: "B", to: "E", probability: 1 },
      { from: "C", to: "D", probability: 1 },
      { from: "D", to: "E", probability: 1 },
      { from: "E", to: "F", probability: null },
      { from: "E", to: "G", probability: null }
    ]
  };

  // 江戸の記憶：明示されたマス種別・接続・終点のみを登録。
  MAP_EXPERIENCE["2-1 鳥羽"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 120 },
      B: { id: "B", type: "resource", label: "B（玉鋼）", rewards: { "玉鋼": 1 }, terminal: "other" },
      C: { id: "C", type: "normal", label: "C", baseExperience: 120, terminal: "other" },
      D: { id: "D", type: "normal", label: "D", baseExperience: 120 },
      E: { id: "E", type: "resource", label: "E（砥石）", rewards: { "砥石": 1 } },
      F: { id: "F", type: "boss", label: "F", baseExperience: 360, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: null },
      { from: "sortie", to: "D", probability: null },
      { from: "A", to: "B", probability: null },
      { from: "A", to: "C", probability: null },
      { from: "D", to: "E", probability: 1 },
      { from: "E", to: "F", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["2-2 江戸"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 140 },
      B: { id: "B", type: "resource", label: "B（木炭）", rewards: { "木炭": 1 } },
      C: { id: "C", type: "normal", label: "C", baseExperience: 140, terminal: "other" },
      D: { id: "D", type: "normal", label: "D", baseExperience: 140 },
      E: { id: "E", type: "normal", label: "E", baseExperience: 140 },
      F: { id: "F", type: "boss", label: "F", baseExperience: 420, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: null },
      { from: "A", to: "E", probability: null },
      { from: "B", to: "C", probability: null },
      { from: "B", to: "D", probability: null },
      { from: "D", to: "F", probability: 1 },
      { from: "E", to: "F", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["2-3 江戸（元禄）"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 170 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 170 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 170, terminal: "other" },
      D: { id: "D", type: "resource", label: "D（冷却材）", rewards: { "冷却材": 1 } },
      E: { id: "E", type: "normal", label: "E", baseExperience: 170 },
      F: { id: "F", type: "normal", label: "F", baseExperience: 170 },
      G: { id: "G", type: "boss", label: "G", baseExperience: 510, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: null },
      { from: "sortie", to: "E", probability: null },
      { from: "A", to: "B", probability: 1 },
      { from: "B", to: "C", probability: null },
      { from: "B", to: "G", probability: null },
      { from: "E", to: "D", probability: null },
      { from: "E", to: "F", probability: null },
      // 東南側ルートはボス到達固定という指定に基づく確定遷移です。
      { from: "D", to: "G", probability: 1 },
      { from: "F", to: "G", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["2-4 大阪（大阪冬の陣）"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 200 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 200, terminal: "other" },
      C: { id: "C", type: "normal", label: "C", baseExperience: 200 },
      D: { id: "D", type: "normal", label: "D", baseExperience: 200 },
      E: { id: "E", type: "boss", label: "E", baseExperience: 600, terminal: "boss" },
      F: { id: "F", type: "normal", label: "F", baseExperience: 200 },
      G: { id: "G", type: "resource", label: "G（依頼札）", rewards: { "依頼札": 1 }, terminal: "other" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: null },
      { from: "A", to: "C", probability: null },
      { from: "C", to: "D", probability: null },
      { from: "C", to: "F", probability: null },
      // ボス到達時の戦闘回数が4回という指定に基づく確定遷移です。
      { from: "D", to: "E", probability: 1 },
      { from: "F", to: "G", probability: 1 }
    ]
  };

  // 織豊の記憶：明示されたマス種別・接続・終点・確率のみを登録。
  MAP_EXPERIENCE["3-1 関ヶ原"] = createStandardBossRouteMap("3-1-sekigahara", 230, 690);
  MAP_EXPERIENCE["3-1 関ヶ原"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 230 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 230 },
      C: { id: "C", type: "boss", label: "C", baseExperience: 690, terminal: "boss" },
      D: { id: "D", type: "normal", label: "D", baseExperience: 230 },
      E: { id: "E", type: "resource", label: "E（砥石×20）", rewards: { "砥石": 20 }, terminal: "other" }
    },
    connections: [
      { from: "sortie", to: "A", probability: null },
      { from: "sortie", to: "B", probability: null },
      { from: "A", to: "D", probability: 1 },
      { from: "B", to: "C", probability: null },
      { from: "B", to: "D", probability: null },
      { from: "D", to: "E", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["3-2 本能寺"] = createStandardBossRouteMap("3-2-honnouji", 250, 750);
  MAP_EXPERIENCE["3-2 本能寺"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 250 },
      B: { id: "B", type: "resource", label: "B（依頼札×1）", rewards: { "依頼札": 1 } },
      C: { id: "C", type: "normal", label: "C", baseExperience: 250, terminal: "other" },
      D: { id: "D", type: "resource", label: "D（玉鋼×30）", rewards: { "玉鋼": 30 } },
      E: { id: "E", type: "normal", label: "E", baseExperience: 250, terminal: "other" },
      F: { id: "F", type: "normal", label: "F", baseExperience: 250 },
      G: { id: "G", type: "normal", label: "G", baseExperience: 250 },
      H: { id: "H", type: "boss", label: "H", baseExperience: 750, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 0.4 },
      { from: "sortie", to: "F", probability: 0.6 },
      { from: "A", to: "B", probability: 0.6 },
      { from: "A", to: "D", probability: 0.4 },
      { from: "B", to: "C", probability: 1 },
      { from: "D", to: "E", probability: 1 },
      { from: "F", to: "G", probability: 1 },
      { from: "G", to: "D", probability: null },
      { from: "G", to: "H", probability: null }
    ]
  };

  MAP_EXPERIENCE["3-3 越前"] = createStandardBossRouteMap("3-3-echizen", 280, 840);
  MAP_EXPERIENCE["3-3 越前"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 280 },
      B: { id: "B", type: "resource", label: "B（木炭×50）", rewards: { "木炭": 50 } },
      C: { id: "C", type: "normal", label: "C", baseExperience: 280 },
      D: { id: "D", type: "boss", label: "D", baseExperience: 840, terminal: "boss" },
      E: { id: "E", type: "normal", label: "E", baseExperience: 280 },
      F: { id: "F", type: "resource", label: "F（玉鋼×50）", rewards: { "玉鋼": 50 }, terminal: "other" },
      G: { id: "G", type: "normal", label: "G", baseExperience: 280, terminal: "other" },
      H: { id: "H", type: "normal", label: "H", baseExperience: 280, terminal: "other" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: 0.6 },
      { from: "A", to: "E", probability: 0.4 },
      { from: "B", to: "C", probability: 1 },
      { from: "C", to: "D", probability: null },
      { from: "C", to: "G", probability: null },
      { from: "E", to: "F", probability: 0.5 },
      { from: "E", to: "H", probability: 0.5 }
    ]
  };

  MAP_EXPERIENCE["3-4 安土"] = createStandardBossRouteMap("3-4-azuchi", 320, 960);
  MAP_EXPERIENCE["3-4 安土"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 320 },
      B: { id: "B", type: "resource", label: "B（砥石×40）", rewards: { "砥石": 40 } },
      C: { id: "C", type: "normal", label: "C", baseExperience: 320, terminal: "other" },
      D: { id: "D", type: "normal", label: "D", baseExperience: 320 },
      E: { id: "E", type: "normal", label: "E", baseExperience: 320 },
      F: { id: "F", type: "resource", label: "F（依頼札×1）", rewards: { "依頼札": 1 }, terminal: "other" },
      G: { id: "G", type: "normal", label: "G", baseExperience: 320 },
      H: { id: "H", type: "boss", label: "H", baseExperience: 960, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 0.25 },
      { from: "sortie", to: "D", probability: 0.75 },
      { from: "A", to: "B", probability: 1 },
      { from: "B", to: "C", probability: 1 },
      { from: "D", to: "E", probability: null },
      { from: "D", to: "G", probability: null },
      { from: "E", to: "F", probability: 1 },
      { from: "G", to: "B", probability: null },
      { from: "G", to: "H", probability: null }
    ]
  };

  // 戦国の記憶：明示されたマス種別・接続・終点・確率・編成条件のみを登録。
  MAP_EXPERIENCE["4-1 長篠"] = createStandardBossRouteMap("4-1-nagashino", 360, 1080);
  MAP_EXPERIENCE["4-1 長篠"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 360 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 360 },
      C: { id: "C", type: "resource", label: "C（冷却材×40）", rewards: { "冷却材": 40 }, terminal: "other" },
      D: { id: "D", type: "normal", label: "D", baseExperience: 360 },
      E: { id: "E", type: "resource", label: "E（依頼札×1）", rewards: { "依頼札": 1 } },
      F: { id: "F", type: "normal", label: "F", baseExperience: 360 },
      G: { id: "G", type: "normal", label: "G", baseExperience: 360 },
      H: { id: "H", type: "normal", label: "H", baseExperience: 360 },
      I: { id: "I", type: "normal", label: "I", baseExperience: 360 },
      J: { id: "J", type: "normal", label: "J", baseExperience: 360 },
      K: { id: "K", type: "boss", label: "K", baseExperience: 1080, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: null },
      { from: "sortie", to: "B", probability: null },
      { from: "sortie", to: "B", probability: 1, condition: { type: "unit_contains_sword_type", swordType: "大太刀" } },
      { from: "A", to: "C", probability: null },
      { from: "A", to: "D", probability: null },
      { from: "B", to: "E", probability: null },
      { from: "B", to: "F", probability: null },
      { from: "D", to: "G", probability: 1 },
      { from: "E", to: "F", probability: 1 },
      { from: "G", to: "J", probability: 1 },
      { from: "F", to: "H", probability: null },
      { from: "F", to: "I", probability: null },
      { from: "F", to: "J", probability: null },
      { from: "H", to: "I", probability: 1 },
      { from: "I", to: "J", probability: 1 },
      { from: "J", to: "K", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["4-2 三方ヶ原"] = createStandardBossRouteMap("4-2-mikatagahara", 390, 1170);
  MAP_EXPERIENCE["4-2 三方ヶ原"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 390 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 390 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 390 },
      D: { id: "D", type: "normal", label: "D", baseExperience: 390 },
      E: { id: "E", type: "normal", label: "E", baseExperience: 390 },
      F: { id: "F", type: "resource", label: "F（砥石×60）", rewards: { "砥石": 60 } },
      G: { id: "G", type: "normal", label: "G", baseExperience: 390 },
      H: { id: "H", type: "normal", label: "H", baseExperience: 390, terminal: "other" },
      I: { id: "I", type: "boss", label: "I", baseExperience: 1170, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: null },
      { from: "sortie", to: "B", probability: null },
      { from: "sortie", to: "C", probability: null },
      { from: "A", to: "D", probability: 1 },
      { from: "B", to: "D", probability: 1 },
      { from: "C", to: "D", probability: 1 },
      { from: "D", to: "E", probability: null },
      { from: "D", to: "F", probability: null },
      { from: "E", to: "F", probability: null },
      { from: "E", to: "G", probability: null },
      { from: "F", to: "H", probability: 1 },
      { from: "G", to: "I", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["4-3 桶狭間"] = createStandardBossRouteMap("4-3-okehazama", 400, 1200);
  MAP_EXPERIENCE["4-3 桶狭間"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 400 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 400 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 400 },
      D: { id: "D", type: "normal", label: "D", baseExperience: 400 },
      E: { id: "E", type: "resource", label: "E（木炭×65）", rewards: { "木炭": 65 }, terminal: "other" },
      F: { id: "F", type: "normal", label: "F", baseExperience: 400 },
      G: { id: "G", type: "resource", label: "G（冷却材×65）", rewards: { "冷却材": 65 } },
      H: { id: "H", type: "normal", label: "H", baseExperience: 400 },
      I: { id: "I", type: "resource", label: "I（玉鋼×65）", rewards: { "玉鋼": 65 }, terminal: "other" },
      J: { id: "J", type: "normal", label: "J", baseExperience: 400 },
      K: { id: "K", type: "boss", label: "K", baseExperience: 1200, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: 0.5 },
      { from: "A", to: "C", probability: 0.5 },
      { from: "B", to: "D", probability: 0.667 },
      { from: "B", to: "H", probability: 0.333 },
      { from: "C", to: "D", probability: 1 },
      { from: "D", to: "E", probability: 0.5 },
      { from: "D", to: "F", probability: 0.5 },
      { from: "F", to: "G", probability: 1 },
      { from: "G", to: "H", probability: 1 },
      { from: "H", to: "I", probability: 0.55 },
      { from: "H", to: "J", probability: 0.45 },
      { from: "J", to: "K", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["4-4 京都（西陣）"] = createStandardBossRouteMap("4-4-kyoto-nishijin", 420, 1260);
  MAP_EXPERIENCE["4-4 京都（西陣）"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 420 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 420 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 420 },
      D: { id: "D", type: "normal", label: "D", baseExperience: 420 },
      E: { id: "E", type: "normal", label: "E", baseExperience: 420 },
      F: { id: "F", type: "normal", label: "F", baseExperience: 420 },
      G: { id: "G", type: "normal", label: "G", baseExperience: 420 },
      H: { id: "H", type: "resource", label: "H（冷却材×65）", rewards: { "冷却材": 65 } },
      I: { id: "I", type: "normal", label: "I", baseExperience: 420 },
      J: { id: "J", type: "normal", label: "J", baseExperience: 420 },
      K: { id: "K", type: "resource", label: "K（依頼札×1）", rewards: { "依頼札": 1 }, terminal: "other" },
      L: { id: "L", type: "boss", label: "L", baseExperience: 1260, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: null },
      { from: "A", to: "C", probability: null },
      { from: "A", to: "D", probability: null },
      { from: "B", to: "H", probability: 1 },
      { from: "H", to: "I", probability: 1 },
      { from: "I", to: "F", probability: 1 },
      { from: "C", to: "E", probability: 1 },
      { from: "D", to: "E", probability: 1 },
      { from: "E", to: "F", probability: 1 },
      { from: "F", to: "G", probability: null },
      { from: "F", to: "J", probability: null },
      { from: "G", to: "L", probability: 1 },
      { from: "J", to: "K", probability: 1 }
    ]
  };

  // 武家の記憶：明示されたマス種別・接続・終点・確率・編成条件のみを登録。
  MAP_EXPERIENCE["5-1 鎌倉（元弘の乱）"] = createStandardBossRouteMap("5-1-kamakura", 440, 1320);
  MAP_EXPERIENCE["5-1 鎌倉（元弘の乱）"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 440 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 440 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 440 },
      D: { id: "D", type: "normal", label: "D", baseExperience: 440, terminal: "other" },
      E: { id: "E", type: "normal", label: "E", baseExperience: 440 },
      F: { id: "F", type: "normal", label: "F", baseExperience: 440 },
      G: { id: "G", type: "normal", label: "G", baseExperience: 440 },
      H: { id: "H", type: "boss", label: "H", baseExperience: 1320, terminal: "boss" },
      I: { id: "I", type: "resource", label: "I（木炭×60）", rewards: { "木炭": 60 }, terminal: "other" },
      J: { id: "J", type: "normal", label: "J", baseExperience: 440, terminal: "other" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: null },
      { from: "A", to: "J", probability: null },
      { from: "B", to: "C", probability: null },
      { from: "B", to: "F", probability: null },
      { from: "C", to: "D", probability: null },
      { from: "C", to: "E", probability: null },
      { from: "E", to: "G", probability: 1 },
      { from: "F", to: "G", probability: null },
      { from: "F", to: "I", probability: null },
      { from: "G", to: "H", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["5-2 博多湾（元寇）"] = createStandardBossRouteMap("5-2-hakatabay", 460, 1380);
  MAP_EXPERIENCE["5-2 博多湾（元寇）"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 460 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 460 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 460 },
      D: { id: "D", type: "resource", label: "D（冷却材×85）", rewards: { "冷却材": 85 } },
      E: { id: "E", type: "normal", label: "E", baseExperience: 460, terminal: "other" },
      F: { id: "F", type: "normal", label: "F", baseExperience: 460 },
      G: { id: "G", type: "resource", label: "G（木炭×70）", rewards: { "木炭": 70 } },
      H: { id: "H", type: "normal", label: "H", baseExperience: 460 },
      I: { id: "I", type: "resource", label: "I（玉鋼×60）", rewards: { "玉鋼": 60 }, terminal: "other" },
      J: { id: "J", type: "normal", label: "J", baseExperience: 460, terminal: "other" },
      K: { id: "K", type: "boss", label: "K", baseExperience: 1380, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: 1 },
      { from: "B", to: "C", probability: null },
      { from: "B", to: "F", probability: null },
      { from: "B", to: "C", probability: 0.1, condition: { type: "unit_sword_type_count_at_least", swordType: "脇差", count: 3 } },
      { from: "B", to: "F", probability: 0.9, condition: { type: "unit_sword_type_count_at_least", swordType: "脇差", count: 3 } },
      { from: "C", to: "D", probability: 1 },
      { from: "D", to: "E", probability: 1 },
      { from: "F", to: "G", probability: 1 },
      { from: "G", to: "H", probability: 0.2 },
      { from: "G", to: "J", probability: 0.2 },
      { from: "G", to: "K", probability: 0.6 },
      { from: "H", to: "I", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["5-3 墨俣（承久の乱）"] = createStandardBossRouteMap("5-3-sunomata", 480, 1440);
  MAP_EXPERIENCE["5-3 墨俣（承久の乱）"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 480 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 480 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 480, terminal: "other" },
      D: { id: "D", type: "normal", label: "D", baseExperience: 480 },
      E: { id: "E", type: "normal", label: "E", baseExperience: 480 },
      F: { id: "F", type: "normal", label: "F", baseExperience: 480 },
      G: { id: "G", type: "resource", label: "G（砥石×90）", rewards: { "砥石": 90 } },
      H: { id: "H", type: "resource", label: "H（玉鋼×90）", rewards: { "玉鋼": 90 } },
      I: { id: "I", type: "normal", label: "I", baseExperience: 480 },
      J: { id: "J", type: "normal", label: "J", baseExperience: 480 },
      K: { id: "K", type: "normal", label: "K", baseExperience: 480 },
      L: { id: "L", type: "boss", label: "L", baseExperience: 1440, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: null },
      { from: "A", to: "D", probability: null },
      { from: "B", to: "C", probability: 1 },
      { from: "D", to: "E", probability: null },
      { from: "D", to: "F", probability: null },
      { from: "D", to: "G", probability: null },
      { from: "E", to: "F", probability: null },
      { from: "E", to: "H", probability: null },
      { from: "F", to: "H", probability: null },
      { from: "F", to: "I", probability: null },
      { from: "G", to: "I", probability: 1 },
      { from: "H", to: "J", probability: 1 },
      { from: "I", to: "J", probability: null },
      { from: "I", to: "K", probability: null },
      { from: "J", to: "L", probability: 1 },
      { from: "K", to: "L", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["5-4 厚樫山（阿津賀志山の戦い）"] = createStandardBossRouteMap("5-4-atsukashiyama", 500, 1500);
  MAP_EXPERIENCE["5-4 厚樫山（阿津賀志山の戦い）"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 500 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 500 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 500 },
      D: { id: "D", type: "normal", label: "D", baseExperience: 500 },
      E: { id: "E", type: "normal", label: "E", baseExperience: 500 },
      F: { id: "F", type: "normal", label: "F", baseExperience: 500 },
      G: { id: "G", type: "resource", label: "G（木炭×80）", rewards: { "木炭": 80 } },
      H: { id: "H", type: "normal", label: "H", baseExperience: 500, terminal: "other" },
      I: { id: "I", type: "normal", label: "I", baseExperience: 500 },
      J: { id: "J", type: "boss", label: "J", baseExperience: 1500, terminal: "boss" },
      K: { id: "K", type: "normal", label: "K", baseExperience: 500 },
      L: { id: "L", type: "resource", label: "L（冷却材×90）", rewards: { "冷却材": 90 }, terminal: "other" },
      M: { id: "M", type: "normal", label: "M", baseExperience: 500 },
      N: { id: "N", type: "normal", label: "N", baseExperience: 500, terminal: "other" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: null },
      { from: "A", to: "C", probability: null },
      { from: "B", to: "D", probability: null },
      { from: "B", to: "E", probability: null },
      { from: "C", to: "F", probability: 1 },
      { from: "D", to: "H", probability: null },
      { from: "D", to: "I", probability: null },
      { from: "E", to: "D", probability: null },
      { from: "E", to: "F", probability: null },
      { from: "F", to: "G", probability: null },
      { from: "F", to: "H", probability: null },
      { from: "G", to: "I", probability: 1 },
      { from: "I", to: "M", probability: 1 },
      { from: "M", to: "J", probability: null },
      { from: "M", to: "N", probability: null },
      { from: "M", to: "J", probability: 1, condition: { type: "unit_contains_all_sword_types", swordTypes: ["短刀", "脇差", "打刀", "太刀"] } }
    ]
  };

  MAP_EXPERIENCE["6-1 京都（市中）"] = createStandardBossRouteMap("6-1-kyoto-shichu", 510, 1600);
  // 確率未公表の傾向は記録のみ。条件付き接続・数値補正には使用しません。
  MAP_EXPERIENCE["6-1 京都（市中）"].metadata = {
    routeTendencies: [
      {
        scope: "boss_arrival",
        swordType: "短刀",
        effectMaxCount: 5,
        description: "部隊内の短刀数が多いほどボスへ到達しやすく、短刀5振り以上で効果最大",
        probability: null,
        applyToCalculation: false
      },
      {
        from: "G",
        to: "H",
        swordType: "短刀",
        minCount: 5,
        description: "短刀5振り以上でHへ高確率（具体的な確率は未公表）",
        probability: null,
        applyToCalculation: false
      }
    ]
  };
  MAP_EXPERIENCE["6-1 京都（市中）"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 510 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 510 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 510, terminal: "other" },
      D: { id: "D", type: "normal", label: "D", baseExperience: 510 },
      E: { id: "E", type: "normal", label: "E", baseExperience: 510, terminal: "other" },
      F: { id: "F", type: "normal", label: "F", baseExperience: 510 },
      G: { id: "G", type: "normal", label: "G", baseExperience: 510 },
      H: { id: "H", type: "resource", label: "H（冷却材×80）", rewards: { "冷却材": 80 } },
      I: { id: "I", type: "normal", label: "I", baseExperience: 510, terminal: "other" },
      J: { id: "J", type: "normal", label: "J", baseExperience: 510 },
      K: { id: "K", type: "normal", label: "K", baseExperience: 510, terminal: "other" },
      L: { id: "L", type: "normal", label: "L", baseExperience: 510 },
      M: { id: "M", type: "normal", label: "M", baseExperience: 510, terminal: "other" },
      N: { id: "N", type: "normal", label: "N", baseExperience: 510 },
      O: { id: "O", type: "normal", label: "O", baseExperience: 510, terminal: "other" },
      P: { id: "P", type: "boss", label: "P", baseExperience: 1600, terminal: "boss" },
      Q: { id: "Q", type: "resource", label: "Q（砥石×70）", rewards: { "砥石": 70 } },
      R: { id: "R", type: "normal", label: "R", baseExperience: 510 },
      S: { id: "S", type: "normal", label: "S", baseExperience: 510, terminal: "other" },
      T: { id: "T", type: "normal", label: "T", baseExperience: 510 },
      U: { id: "U", type: "normal", label: "U", baseExperience: 510, terminal: "other" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: null },
      { from: "A", to: "F", probability: null },
      { from: "B", to: "C", probability: null },
      { from: "B", to: "D", probability: null },
      { from: "D", to: "E", probability: null },
      { from: "D", to: "Q", probability: null },
      { from: "F", to: "G", probability: 1 },
      { from: "G", to: "H", probability: null },
      { from: "G", to: "J", probability: null },
      { from: "H", to: "I", probability: 1 },
      { from: "J", to: "K", probability: null },
      { from: "J", to: "L", probability: null },
      { from: "L", to: "M", probability: null },
      { from: "L", to: "N", probability: null },
      { from: "N", to: "O", probability: null },
      { from: "N", to: "P", probability: null },
      { from: "Q", to: "R", probability: 1 },
      { from: "R", to: "T", probability: null },
      { from: "R", to: "S", probability: null },
      { from: "T", to: "U", probability: null },
      { from: "T", to: "P", probability: null }
    ]
  };

  MAP_EXPERIENCE["6-2 京都（三条大橋）"] = createStandardBossRouteMap("6-2-kyoto-sanjo", 520, 1620);
  MAP_EXPERIENCE["6-2 京都（三条大橋）"].metadata = {
    routeTendencies: [{
      swordType: "短刀",
      description: "短刀数による到達傾向は、短刀6振りでのA→D固定以外は具体的な確率未登録",
      probability: null,
      applyToCalculation: false
    }]
  };
  MAP_EXPERIENCE["6-2 京都（三条大橋）"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 520 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 520 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 520, terminal: "other" },
      D: { id: "D", type: "normal", label: "D", baseExperience: 250 },
      E: { id: "E", type: "normal", label: "E", baseExperience: 250 },
      F: { id: "F", type: "normal", label: "F", baseExperience: 250 },
      G: { id: "G", type: "normal", label: "G", baseExperience: 250 },
      H: { id: "H", type: "normal", label: "H", baseExperience: 250 },
      I: { id: "I", type: "normal", label: "I", baseExperience: 250 },
      J: { id: "J", type: "normal", label: "J", baseExperience: 250 },
      K: { id: "K", type: "resource", label: "K（冷却材×70）", rewards: { "冷却材": 70 } },
      L: { id: "L", type: "normal", label: "L", baseExperience: 520, terminal: "other" },
      M: { id: "M", type: "normal", label: "M", baseExperience: 520 },
      N: { id: "N", type: "resource", label: "N（玉鋼×80）", rewards: { "玉鋼": 80 } },
      O: { id: "O", type: "normal", label: "O", baseExperience: 520, terminal: "other" },
      P: { id: "P", type: "normal", label: "P", baseExperience: 550 },
      Q: { id: "Q", type: "normal", label: "Q", baseExperience: 580 },
      R: { id: "R", type: "normal", label: "R", baseExperience: 520, terminal: "other" },
      S: { id: "S", type: "boss", label: "S", baseExperience: 1620, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: null },
      { from: "A", to: "D", probability: null },
      { from: "A", to: "D", probability: 1, condition: { type: "unit_all_sword_type", swordType: "短刀", size: 6 } },
      { from: "B", to: "C", probability: 1 },
      { from: "D", to: "E", probability: 1 },
      { from: "E", to: "F", probability: 1 },
      { from: "F", to: "G", probability: 1 },
      { from: "G", to: "H", probability: 1 },
      { from: "H", to: "I", probability: 1 },
      { from: "I", to: "J", probability: 1 },
      { from: "J", to: "K", probability: null },
      { from: "J", to: "M", probability: null },
      { from: "K", to: "L", probability: 1 },
      { from: "M", to: "N", probability: null },
      { from: "M", to: "P", probability: null },
      { from: "N", to: "O", probability: 1 },
      { from: "P", to: "Q", probability: 1 },
      { from: "Q", to: "R", probability: null },
      { from: "Q", to: "S", probability: null }
    ]
  };

  MAP_EXPERIENCE["6-3 京都（池田屋二階）"] = createStandardBossRouteMap("6-3-kyoto-ikedaya-second-floor", 530, 1640);
  MAP_EXPERIENCE["6-3 京都（池田屋二階）"].metadata = {
    routeTendencies: [{
      swordType: "短刀",
      count: 4,
      description: "部隊内の短刀が4振り以上いるとボスへ到達しやすいとされるが、具体的な確率は未登録",
      probability: null,
      applyToCalculation: false
    }]
  };
  MAP_EXPERIENCE["6-3 京都（池田屋二階）"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 530 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 270 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 270 },
      D: { id: "D", type: "normal", label: "D", baseExperience: 270 },
      E: { id: "E", type: "normal", label: "E", baseExperience: 270 },
      F: { id: "F", type: "normal", label: "F", baseExperience: 270 },
      G: { id: "G", type: "normal", label: "G", baseExperience: 270 },
      H: { id: "H", type: "resource", label: "H（木炭×40）", rewards: { "木炭": 40 }, terminal: "other" },
      I: { id: "I", type: "resource", label: "I（玉鋼×10）", rewards: { "玉鋼": 10 } },
      J: { id: "J", type: "normal", label: "J", baseExperience: 530, terminal: "other" },
      K: { id: "K", type: "normal", label: "K", baseExperience: 560 },
      L: { id: "L", type: "normal", label: "L", baseExperience: 590 },
      M: { id: "M", type: "normal", label: "M", baseExperience: 530, terminal: "other" },
      N: { id: "N", type: "normal", label: "N", baseExperience: 620 },
      O: { id: "O", type: "normal", label: "O", baseExperience: 530 },
      P: { id: "P", type: "resource", label: "P（依頼札×1）", rewards: { "依頼札": 1 }, terminal: "other" },
      Q: { id: "Q", type: "boss", label: "Q", baseExperience: 1640, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: 1 },
      { from: "B", to: "C", probability: 1 },
      { from: "C", to: "D", probability: 1 },
      { from: "D", to: "E", probability: 1 },
      { from: "E", to: "F", probability: 1 },
      { from: "F", to: "G", probability: 1 },
      { from: "G", to: "H", probability: null },
      { from: "G", to: "I", probability: null },
      { from: "I", to: "J", probability: null },
      { from: "I", to: "K", probability: null },
      { from: "K", to: "L", probability: 1 },
      { from: "L", to: "M", probability: null },
      { from: "L", to: "N", probability: null },
      { from: "N", to: "O", probability: null },
      { from: "N", to: "Q", probability: null },
      { from: "O", to: "P", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["6-4 京都（池田屋一階）"] = createStandardBossRouteMap("6-4-kyoto-ikedaya-first-floor-third-map", 190, 1880);
  MAP_EXPERIENCE["6-4 京都（池田屋一階）"].metadata = {
    mapPhase: 3,
    description: "第三MAP（2回目のボス撃破以降）の周回のみを対象とする",
    routeTendencies: [{
      swordType: "短刀",
      count: 4,
      description: "部隊内の短刀が4振り以上いるとボスへ到達しやすいとされるが、具体的な確率は未登録",
      probability: null,
      applyToCalculation: false
    }]
  };
  MAP_EXPERIENCE["6-4 京都（池田屋一階）"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 220 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 190 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 190 },
      D: { id: "D", type: "normal", label: "D", baseExperience: 190 },
      E: { id: "E", type: "normal", label: "E", baseExperience: 190 },
      F: { id: "F", type: "normal", label: "F", baseExperience: 190 },
      G: { id: "G", type: "normal", label: "G", baseExperience: 190, terminal: "other" },
      H: { id: "H", type: "normal", label: "H", baseExperience: 190, terminal: "other" },
      I: { id: "I", type: "normal", label: "I", baseExperience: 190 },
      J: { id: "J", type: "normal", label: "J", baseExperience: 190 },
      K: { id: "K", type: "normal", label: "K", baseExperience: 190 },
      L: { id: "L", type: "normal", label: "L", baseExperience: 220, terminal: "other" },
      M: { id: "M", type: "resource", label: "M（砥石×70）", rewards: { "砥石": 70 }, terminal: "other" },
      N: { id: "N", type: "normal", label: "N", baseExperience: 220 },
      O: { id: "O", type: "normal", label: "O", baseExperience: 220 },
      P: { id: "P", type: "boss", label: "P", baseExperience: 1880, terminal: "boss" },
      Q: { id: "Q", type: "normal", label: "Q", baseExperience: 220 },
      R: { id: "R", type: "resource", label: "R（木炭×80）", rewards: { "木炭": 80 }, terminal: "other" },
      S: { id: "S", type: "normal", label: "S", baseExperience: 220, terminal: "other" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: 1 },
      { from: "B", to: "C", probability: 1 },
      { from: "C", to: "D", probability: 1 },
      { from: "D", to: "E", probability: 1 },
      { from: "E", to: "F", probability: null },
      { from: "E", to: "H", probability: null },
      { from: "E", to: "I", probability: null },
      { from: "F", to: "G", probability: 1 },
      { from: "I", to: "J", probability: 1 },
      { from: "J", to: "K", probability: null },
      { from: "J", to: "M", probability: null },
      { from: "J", to: "N", probability: null },
      { from: "K", to: "L", probability: 1 },
      { from: "N", to: "O", probability: null },
      { from: "N", to: "Q", probability: null },
      { from: "O", to: "S", probability: null },
      { from: "O", to: "P", probability: null },
      { from: "Q", to: "R", probability: 1 }
    ]
  };

  MAP_EXPERIENCE["7-1 江戸（新橋）"] = createStandardBossRouteMap("7-1-edo-shinbashi", 300, 3000);
  MAP_EXPERIENCE["7-1 江戸（新橋）"].metadata = {
    branchNotes: [{
      from: "A",
      description: "部隊に太刀・大太刀・槍・薙刀のいずれかが1振り以上いる場合、Bへ約2/3、Kへ約1/3",
      approximate: true
    }]
  };
  MAP_EXPERIENCE["7-1 江戸（新橋）"].graph = {
    startNodeId: "sortie",
    nodes: {
      sortie: { id: "sortie", type: "start", label: "出陣" },
      A: { id: "A", type: "normal", label: "A", baseExperience: 300 },
      B: { id: "B", type: "normal", label: "B", baseExperience: 300 },
      C: { id: "C", type: "normal", label: "C", baseExperience: 400 },
      D: { id: "D", type: "normal", label: "D", baseExperience: 1000 },
      E: { id: "E", type: "normal", label: "E", baseExperience: 400 },
      F: { id: "F", type: "resource", label: "F（依頼札×1）", rewards: { "依頼札": 1 }, terminal: "other" },
      G: { id: "G", type: "normal", label: "G", baseExperience: 1000 },
      H: { id: "H", type: "resource", label: "H（玉鋼×100）", rewards: { "玉鋼": 100 } },
      I: { id: "I", type: "normal", label: "I", baseExperience: 1000 },
      J: { id: "J", type: "boss", label: "J", baseExperience: 3000, terminal: "boss" },
      K: { id: "K", type: "normal", label: "K", baseExperience: 300 },
      L: { id: "L", type: "resource", label: "L（木炭×140）", rewards: { "木炭": 140 }, terminal: "other" },
      M: { id: "M", type: "normal", label: "M", baseExperience: 400 },
      N: { id: "N", type: "normal", label: "N", baseExperience: 1000 },
      O: { id: "O", type: "normal", label: "O", baseExperience: 400 },
      P: { id: "P", type: "resource", label: "P（冷却材×100）", rewards: { "冷却材": 100 }, terminal: "other" }
    },
    connections: [
      { from: "sortie", to: "A", probability: 1 },
      { from: "A", to: "B", probability: null },
      { from: "A", to: "K", probability: null },
      { from: "A", to: "B", probability: 2 / 3, condition: { type: "unit_contains_any_sword_type", swordTypes: ["太刀", "大太刀", "槍", "薙刀"] } },
      { from: "A", to: "K", probability: 1 / 3, condition: { type: "unit_contains_any_sword_type", swordTypes: ["太刀", "大太刀", "槍", "薙刀"] } },
      { from: "B", to: "C", probability: 1 },
      { from: "C", to: "D", probability: null },
      { from: "C", to: "G", probability: null },
      { from: "D", to: "E", probability: 1 },
      { from: "E", to: "F", probability: null },
      { from: "E", to: "I", probability: null },
      { from: "G", to: "H", probability: 1 },
      { from: "H", to: "I", probability: 1 },
      { from: "I", to: "J", probability: 1 },
      { from: "K", to: "L", probability: null },
      { from: "K", to: "M", probability: null },
      { from: "M", to: "N", probability: 1 },
      { from: "N", to: "O", probability: 1 },
      { from: "O", to: "P", probability: null },
      { from: "O", to: "I", probability: null }
    ]
  };

  const RANK_MULTIPLIERS = {
    "完全勝利S": 1.2,
    "勝利A": 1.2,
    "勝利B": 1.0,
    "勝利C": 1.0,
    "敗北": 0.8
  };

  const MVP_MODES = {
    "毎回誉を取る": 2.0,
    "誉を取らない": 1.0
  };

  function getMvpMultiplier(mode, unitSize) {
    if (mode !== "部隊内で均等") return MVP_MODES[mode] || 1.0;
    const size = Number(unitSize);
    if (!Number.isFinite(size) || size < 1) return 1.0;
    return ((size - 1) / size * 1.0) + (1 / size * 2.0);
  }

  function conditionMatches(condition, input) {
    if (!condition) return false;
    if (condition.type === "unit_all_sword_type") {
      return Array.isArray(input.unitMembers)
        && input.unitMembers.length === condition.size
        && input.unitMembers.every(member => member.swordType === condition.swordType);
    }
    if (condition.type === "unit_contains_sword_type") {
      return Array.isArray(input.unitMembers) && input.unitMembers.some(member => member.swordType === condition.swordType);
    }
    if (condition.type === "unit_contains_any_sword_type") {
      return Array.isArray(condition.swordTypes) && Array.isArray(input.unitMembers)
        && input.unitMembers.some(member => condition.swordTypes.includes(member.swordType));
    }
    if (condition.type === "unit_sword_type_count_at_least") {
      const count = Array.isArray(input.unitMembers)
        ? input.unitMembers.filter(member => member.swordType === condition.swordType).length
        : 0;
      return count >= condition.count;
    }
    if (condition.type === "unit_contains_all_sword_types") {
      return Array.isArray(condition.swordTypes) && condition.swordTypes.every(swordType => (
        Array.isArray(input.unitMembers) && input.unitMembers.some(member => member.swordType === swordType)
      ));
    }
    return false;
  }

  // 条件付き接続が成立する場合は、それを通常のランダム接続より優先します。
  function getActiveConnections(connections, input) {
    const conditionalConnections = connections.filter(connection => connection.condition && conditionMatches(connection.condition, input));
    return conditionalConnections.length > 0
      ? conditionalConnections
      : connections.filter(connection => !connection.condition);
  }

  function getMapRoute(stageName, routeId) {
    const map = MAP_EXPERIENCE[stageName];
    if (!map || !map.routes) return null;
    return map.routes[routeId] || null;
  }

  function getMapExperience(stageName, encounterType, cellId) {
    const map = MAP_EXPERIENCE[stageName];
    if (!map || !map.routes) return null;
    const battles = Object.values(map.routes).flatMap(route => route.battles || []);
    const battle = battles.find(item => item.type === encounterType && (!cellId || item.cellId === cellId));
    return battle ? battle.baseExperience : null;
  }

  function calculateExperience(options) {
    const input = options || {};
    const baseExperience = Number(input.baseExperience);
    if (!Number.isFinite(baseExperience)) {
      return { valid: false, reason: "base_experience_missing" };
    }

    const captainMultiplier = input.isCaptain ? 1.5 : 1.0;
    const mvpMultiplier = getMvpMultiplier(input.mvpMode, input.unitSize);
    const rankMultiplier = RANK_MULTIPLIERS[input.rank] || 1.0;
    const campaignMultiplier = input.isDoubleExperience ? 2.0 : 1.0;
    const extraMultipliers = Array.isArray(input.extraMultipliers)
      ? input.extraMultipliers.filter(value => Number.isFinite(Number(value))).map(Number)
      : [];
    const modifiers = [captainMultiplier, mvpMultiplier, rankMultiplier, campaignMultiplier, ...extraMultipliers];
    const totalMultiplier = modifiers.reduce((total, multiplier) => total * multiplier, 1.0);

    return {
      valid: true,
      baseExperience,
      rawExperience: baseExperience * totalMultiplier,
      totalMultiplier,
      multipliers: {
        captain: captainMultiplier,
        mvp: mvpMultiplier,
        rank: rankMultiplier,
        campaign: campaignMultiplier,
        extra: extraMultipliers
      }
    };
  }

  function calculateExpectedRewards(nodeProbabilities, nodes) {
    const rewards = {};
    Object.entries(nodeProbabilities).forEach(([nodeId, arrivalProbability]) => {
      const nodeRewards = nodes[nodeId].rewards || {};
      Object.entries(nodeRewards).forEach(([name, amount]) => {
        if (Number.isFinite(amount)) rewards[name] = (rewards[name] || 0) + amount * arrivalProbability;
      });
    });
    return rewards;
  }

  // 各戦闘マスへ同じ補正ロジックを適用し、ルート全体を合算します。
  function calculateRouteExperience(options) {
    const input = options || {};
    const route = getMapRoute(input.stageName, input.routeId || "boss");
    if (!route) return { valid: false, reason: "route_missing" };
    const battleResults = route.battles.map(battle => ({
      battle,
      calculation: calculateExperience({
        baseExperience: battle.baseExperience,
        isCaptain: input.isCaptain,
        mvpMode: input.mvpMode,
        unitSize: input.unitSize,
        rank: input.rank,
        isDoubleExperience: input.isDoubleExperience,
        extraMultipliers: input.extraMultipliers
      })
    }));
    if (battleResults.some(result => !result.calculation.valid)) {
      return { valid: false, reason: "battle_calculation_failed" };
    }
    return {
      valid: true,
      route,
      battles: battleResults,
      rawExperience: battleResults.reduce((sum, result) => sum + result.calculation.rawExperience, 0)
    };
  }

  // マスの到達確率を辿り、各戦闘マスの期待経験値を合算します。
  // 接続確率が一つでも未設定なら、推測せず invalid を返します。
  function calculateMapExpectedExperience(options) {
    const input = options || {};
    const map = MAP_EXPERIENCE[input.stageName];
    const graph = map && map.graph;
    if (!graph || !graph.startNodeId || !graph.nodes) {
      return { valid: false, reason: "route_probability_data_missing" };
    }

    const outgoingByNode = {};
    for (const connection of graph.connections || []) {
      if (!connection || !connection.from || !connection.to) {
        return { valid: false, reason: "route_probability_data_missing" };
      }
      (outgoingByNode[connection.from] ||= []).push(connection);
    }

    const nodeProbabilities = {};
    let invalidGraph = false;
    function visit(nodeId, probability, ancestry) {
      const node = graph.nodes[nodeId];
      if (!node || ancestry.includes(nodeId)) {
        invalidGraph = true;
        return;
      }
      nodeProbabilities[nodeId] = (nodeProbabilities[nodeId] || 0) + probability;
      if (node.terminal) return;

      const connections = getActiveConnections(outgoingByNode[nodeId] || [], input);
      if (connections.length === 0) {
        invalidGraph = true;
        return;
      }
      const totalProbability = connections.reduce((sum, connection) => sum + connection.probability, 0);
      if (connections.some(connection => !Number.isFinite(connection.probability) || connection.probability < 0 || connection.probability > 1) || Math.abs(totalProbability - 1) > 1e-9) {
        invalidGraph = true;
        return;
      }
      connections.forEach(connection => visit(connection.to, probability * connection.probability, [...ancestry, nodeId]));
    }

    visit(graph.startNodeId, 1, []);
    if (invalidGraph) return { valid: false, reason: "route_probability_data_missing" };

    const battleResults = Object.entries(nodeProbabilities)
      .map(([nodeId, arrivalProbability]) => ({ node: graph.nodes[nodeId], arrivalProbability }))
      .filter(result => result.node.type === "normal" || result.node.type === "boss")
      .map(result => ({
        ...result,
        calculation: calculateExperience({
          baseExperience: result.node.baseExperience,
          isCaptain: input.isCaptain,
          mvpMode: input.mvpMode,
          unitSize: input.unitSize,
          rank: input.rank,
          isDoubleExperience: input.isDoubleExperience,
          extraMultipliers: input.extraMultipliers
        })
      }));
    if (battleResults.some(result => !result.calculation.valid)) {
      return { valid: false, reason: "battle_calculation_failed" };
    }

    return {
      valid: true,
      map,
      battles: battleResults,
      bossArrivalProbability: battleResults.find(result => result.node.terminal === "boss")?.arrivalProbability || 0,
      rewards: calculateExpectedRewards(nodeProbabilities, graph.nodes),
      rawExperience: battleResults.reduce((sum, result) => sum + result.calculation.rawExperience * result.arrivalProbability, 0)
    };
  }

  // 公式確率がない分岐だけは、各遷移を均等確率として期待値を算出します。
  // 公式確率が全て登録されたマップでは、この関数ではなく calculateMapExpectedExperience を使います。
  function calculateMapProvisionalExpectedExperience(options) {
    const input = options || {};
    const map = MAP_EXPERIENCE[input.stageName];
    const graph = map && map.graph;
    if (!graph || !graph.startNodeId || !graph.nodes) {
      return { valid: false, reason: "route_structure_data_missing" };
    }

    const outgoingByNode = {};
    for (const connection of graph.connections || []) {
      if (!connection || !connection.from || !connection.to) {
        return { valid: false, reason: "route_structure_data_missing" };
      }
      (outgoingByNode[connection.from] ||= []).push(connection);
    }

    const nodeProbabilities = {};
    let invalidGraph = false;
    let usedProvisionalProbabilities = false;
    function visit(nodeId, probability, ancestry) {
      const node = graph.nodes[nodeId];
      if (!node || ancestry.includes(nodeId)) {
        invalidGraph = true;
        return;
      }
      nodeProbabilities[nodeId] = (nodeProbabilities[nodeId] || 0) + probability;
      if (node.terminal) return;

      const connections = getActiveConnections(outgoingByNode[nodeId] || [], input);
      if (connections.length === 0) {
        invalidGraph = true;
        return;
      }
      const officialProbabilities = connections.every(connection => Number.isFinite(connection.probability));
      const totalProbability = officialProbabilities
        ? connections.reduce((sum, connection) => sum + connection.probability, 0)
        : null;
      if (officialProbabilities && Math.abs(totalProbability - 1) > 1e-9) {
        invalidGraph = true;
        return;
      }
      if (!officialProbabilities) usedProvisionalProbabilities = true;
      const fallbackProbability = 1 / connections.length;
      connections.forEach(connection => {
        const branchProbability = officialProbabilities ? connection.probability : fallbackProbability;
        visit(connection.to, probability * branchProbability, [...ancestry, nodeId]);
      });
    }

    visit(graph.startNodeId, 1, []);
    if (invalidGraph) return { valid: false, reason: "route_structure_data_missing" };

    const battleResults = Object.entries(nodeProbabilities)
      .map(([nodeId, arrivalProbability]) => ({ node: graph.nodes[nodeId], arrivalProbability }))
      .filter(result => result.node.type === "normal" || result.node.type === "boss")
      .map(result => ({
        ...result,
        calculation: calculateExperience({
          baseExperience: result.node.baseExperience,
          isCaptain: input.isCaptain,
          mvpMode: input.mvpMode,
          unitSize: input.unitSize,
          rank: input.rank,
          isDoubleExperience: input.isDoubleExperience,
          extraMultipliers: input.extraMultipliers
        })
      }));
    if (battleResults.some(result => !result.calculation.valid)) {
      return { valid: false, reason: "battle_data_missing" };
    }

    return {
      valid: true,
      map,
      battles: battleResults,
      usedProvisionalProbabilities,
      rewards: calculateExpectedRewards(nodeProbabilities, graph.nodes),
      rawExperience: battleResults.reduce((sum, result) => sum + result.calculation.rawExperience * result.arrivalProbability, 0)
    };
  }

  // 分岐確率を使わず、開始から各終点までの到達可能なルートを列挙します。
  // 確率未設定でも、ルート別の獲得経験値・最小値・最大値を算出できます。
  function calculateMapRouteOutcomes(options) {
    const input = options || {};
    const map = MAP_EXPERIENCE[input.stageName];
    const graph = map && map.graph;
    if (!graph || !graph.startNodeId || !graph.nodes) {
      return { valid: false, reason: "route_structure_data_missing" };
    }

    const outgoingByNode = {};
    for (const connection of graph.connections || []) {
      if (!connection || !connection.from || !connection.to) {
        return { valid: false, reason: "route_structure_data_missing" };
      }
      (outgoingByNode[connection.from] ||= []).push(connection);
    }

    const paths = [];
    let invalidGraph = false;
    function visit(nodeId, nodePath, connectionPath) {
      const node = graph.nodes[nodeId];
      if (!node || nodePath.some(item => item.id === nodeId)) {
        invalidGraph = true;
        return;
      }
      const nextNodePath = [...nodePath, node];
      if (node.terminal) {
        paths.push({ nodes: nextNodePath, connections: connectionPath, terminal: node });
        return;
      }
      const connections = getActiveConnections(outgoingByNode[nodeId] || [], input);
      if (connections.length === 0) {
        invalidGraph = true;
        return;
      }
      connections.forEach(connection => visit(connection.to, nextNodePath, [...connectionPath, connection]));
    }

    visit(graph.startNodeId, [], []);
    if (invalidGraph || paths.length === 0) {
      return { valid: false, reason: "route_structure_data_missing" };
    }

    const outcomes = paths.map(path => {
      const battles = path.nodes
        .filter(node => node.type === "normal" || node.type === "boss")
        .map(node => ({
          node,
          calculation: calculateExperience({
            baseExperience: node.baseExperience,
            isCaptain: input.isCaptain,
            mvpMode: input.mvpMode,
            unitSize: input.unitSize,
            rank: input.rank,
            isDoubleExperience: input.isDoubleExperience,
            extraMultipliers: input.extraMultipliers
          })
        }));
      if (battles.some(result => !result.calculation.valid)) {
        return { invalid: true };
      }
      return {
        terminal: path.terminal,
        nodes: path.nodes,
        battles,
        rawExperience: battles.reduce((sum, result) => sum + result.calculation.rawExperience, 0),
        probabilityConfigured: path.connections.every(connection => Number.isFinite(connection.probability))
      };
    });
    if (outcomes.some(outcome => outcome.invalid)) {
      return { valid: false, reason: "battle_data_missing" };
    }

    const values = outcomes.map(outcome => outcome.rawExperience);
    const minExperience = Math.min(...values);
    const maxExperience = Math.max(...values);
    return {
      valid: true,
      map,
      outcomes,
      probabilitiesConfigured: outcomes.every(outcome => outcome.probabilityConfigured),
      allOutcomesEqual: values.every(value => Math.abs(value - values[0]) < 1e-9),
      minExperience,
      maxExperience
    };
  }

  // 丸め規則を計算本体から分離。現在の表示は切り捨てです。
  function roundExperience(value, method) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return null;
    if (method === "ceil") return Math.ceil(numericValue);
    if (method === "round") return Math.round(numericValue);
    // 216 が 215.99999999999997 になるような浮動小数点誤差だけを補正してから切り捨てます。
    const tolerance = Number.EPSILON * Math.max(1, Math.abs(numericValue)) * 4;
    return Math.floor(numericValue + tolerance);
  }

  function formatExperience(value, method) {
    const rounded = roundExperience(value, method);
    return rounded === null ? "" : new Intl.NumberFormat("ja-JP").format(rounded);
  }

  const api = {
    MAP_EXPERIENCE,
    RANK_MULTIPLIERS,
    getMapRoute,
    getMapExperience,
    getMvpMultiplier,
    calculateExperience,
    calculateRouteExperience,
    calculateMapExpectedExperience,
    calculateMapProvisionalExpectedExperience,
    calculateMapRouteOutcomes,
    roundExperience,
    formatExperience
  };

  global.ExperienceCalculator = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
