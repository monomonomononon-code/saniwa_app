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
      A: { id: "A", type: "unknown", label: "A", knownTerminalId: "D" },
      B: { id: "B", type: "unknown", label: "B", knownTerminalId: "D" },
      C: { id: "C", type: "resource", label: "C" },
      D: { id: "D", type: "boss", label: "D", baseExperience: 150, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: null },
      { from: "sortie", to: "B", probability: null }
    ]
  };

  MAP_EXPERIENCE["1-3 宇都宮"].graph = {
    startNodeId: null,
    nodes: {
      A: { id: "A", type: "normal", label: "A", baseExperience: 80 },
      B: { id: "B", type: "resource", label: "B" },
      C: { id: "C", type: "normal", label: "C", baseExperience: 80, terminal: "other" },
      D: { id: "D", type: "boss", label: "D", baseExperience: 240, terminal: "boss" }
    },
    connections: [
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
      F: { id: "F", type: "normal", label: "F", baseExperience: 100 },
      G: { id: "G", type: "boss", label: "G", baseExperience: 300, terminal: "boss" }
    },
    connections: [
      { from: "sortie", to: "A", probability: null },
      { from: "sortie", to: "C", probability: null },
      { from: "E", to: "F", probability: null },
      { from: "E", to: "G", probability: null }
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
      if (!connection || !connection.from || !connection.to || !Number.isFinite(connection.probability)) {
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

      const connections = outgoingByNode[nodeId];
      if (!connections || connections.length === 0) {
        invalidGraph = true;
        return;
      }
      const totalProbability = connections.reduce((sum, connection) => sum + connection.probability, 0);
      if (Math.abs(totalProbability - 1) > 1e-9) {
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
      const connections = outgoingByNode[nodeId];
      if (!connections || connections.length === 0) {
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
    calculateMapRouteOutcomes,
    roundExperience,
    formatExperience
  };

  global.ExperienceCalculator = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
