(function (global) {
  "use strict";

  // マップごとに道中・ボスを分け、さらに cells にマス別の経験値を追加できる構造です。
  const MAP_EXPERIENCE = {
    "1-1 函館": {
      id: "1-1-hakodate",
      encounters: {
        normal: { label: "道中戦", baseExperience: 30, cells: {} },
        boss: { label: "ボス戦", baseExperience: 90, cells: {} }
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

  function getMapExperience(stageName, encounterType, cellId) {
    const map = MAP_EXPERIENCE[stageName];
    const encounter = map && map.encounters[encounterType];
    if (!encounter) return null;
    // 将来 cells: { "A": { baseExperience: 40 } } のようにマス別設定ができます。
    const cell = cellId && encounter.cells[cellId];
    return cell && Number.isFinite(cell.baseExperience)
      ? cell.baseExperience
      : encounter.baseExperience;
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
    getMapExperience,
    getMvpMultiplier,
    calculateExperience,
    roundExperience,
    formatExperience
  };

  global.ExperienceCalculator = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
