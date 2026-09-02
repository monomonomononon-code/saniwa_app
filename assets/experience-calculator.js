(function (global) {
  "use strict";

  // routes は分岐に備えて複数持てます。各 battles 要素がルート上の戦闘マスです。
  const MAP_EXPERIENCE = {
    "1-1 函館": {
      id: "1-1-hakodate",
      routes: {
        boss: {
          label: "ボス到達ルート",
          battles: [
            { id: "normal-1", cellId: "A", type: "normal", label: "道中戦", baseExperience: 30 },
            { id: "boss", cellId: "BOSS", type: "boss", label: "ボス戦", baseExperience: 90 }
          ]
        }
      }
    }
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
    roundExperience,
    formatExperience
  };

  global.ExperienceCalculator = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
