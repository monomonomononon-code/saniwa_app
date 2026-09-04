(function (global) {
  "use strict";

  const STORAGE_KEY = "saniwa-tool.report.v1";
  const RESOURCE_KEYS = [
    { id: "charcoal", label: "木炭" },
    { id: "steel", label: "玉鋼" },
    { id: "coolant", label: "冷却材" },
    { id: "whetstone", label: "砥石" },
    { id: "requestToken", label: "依頼札" },
    { id: "helpToken", label: "手伝い札" }
  ];
  const EMPTY_REWARDS = Object.freeze({
    charcoal: 0, steel: 0, coolant: 0, whetstone: 0,
    requestToken: 0, helpToken: 0, koban: 0
  });
  function rewards(amount) {
    return Object.freeze({ ...EMPTY_REWARDS, charcoal: amount, steel: amount, coolant: amount, whetstone: amount });
  }
  // 数値が明示された集計対象だけを保持する。未提示の「その他報酬」は推測しない。
  const DAILY_TASKS = Object.freeze([
    { id: "login", label: "本丸にアクセス", rewards: rewards(200) },
    { id: "sortie", label: "いざ「出陣」", rewards: rewards(300) },
    { id: "expedition", label: "「遠征」に派遣", rewards: rewards(300) },
    { id: "practice", label: "「演練」に挑戦", rewards: rewards(300) },
    { id: "duty", label: "「内番」を実施", rewards: rewards(200) },
    { id: "daily3", label: "「日課」を3個達成", rewards: rewards(500) },
    { id: "daily5", label: "「日課」を5個達成", rewards: rewards(1000) }
  ]);

  const clone = value => JSON.parse(JSON.stringify(value));
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  function localDate(date) {
    const d = date instanceof Date ? date : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function uid(prefix) {
    if (global.crypto && typeof global.crypto.randomUUID === "function") return `${prefix}-${global.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  function emptyResources() {
    return Object.fromEntries(RESOURCE_KEYS.map(item => [item.id, 0]));
  }
  function createEntry(date) {
    return {
      date,
      dailyTasks: {},
      obtainedSwords: [],
      resources: { manual: emptyResources() },
      eventRuns: [],
      normalMapRuns: [],
      koban: { manual: 0 },
      expRecords: []
    };
  }
  function normalizeEntry(input, date) {
    const base = createEntry(date);
    const source = input && typeof input === "object" ? input : {};
    base.dailyTasks = source.dailyTasks && typeof source.dailyTasks === "object" ? { ...source.dailyTasks } : {};
    base.obtainedSwords = Array.isArray(source.obtainedSwords) ? clone(source.obtainedSwords) : [];
    const manual = source.resources && source.resources.manual ? source.resources.manual : {};
    RESOURCE_KEYS.forEach(item => { base.resources.manual[item.id] = number(manual[item.id]); });
    base.eventRuns = Array.isArray(source.eventRuns) ? clone(source.eventRuns) : [];
    base.normalMapRuns = Array.isArray(source.normalMapRuns) ? clone(source.normalMapRuns) : [];
    base.koban.manual = number(source.koban && source.koban.manual);
    base.expRecords = Array.isArray(source.expRecords) ? clone(source.expRecords) : [];
    return base;
  }
  function load() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(STORAGE_KEY));
      if (!parsed || typeof parsed !== "object") return { version: 1, entries: {} };
      const entries = {};
      Object.entries(parsed.entries || {}).forEach(([date, entry]) => { entries[date] = normalizeEntry(entry, date); });
      return { version: 1, entries };
    } catch (error) {
      return { version: 1, entries: {} };
    }
  }
  function save(state) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, entries: state.entries || {} }));
      return true;
    } catch (error) {
      return false;
    }
  }
  function getDailyRewards(entry) {
    const total = { ...EMPTY_REWARDS };
    DAILY_TASKS.forEach(task => {
      if (!entry.dailyTasks || !entry.dailyTasks[task.id]) return;
      Object.keys(total).forEach(key => { total[key] += number(task.rewards[key]); });
    });
    return total;
  }
  function getTotals(entry) {
    const daily = getDailyRewards(entry);
    const resources = {};
    RESOURCE_KEYS.forEach(item => {
      const manual = number(entry.resources && entry.resources.manual && entry.resources.manual[item.id]);
      resources[item.id] = { manual, daily: daily[item.id], total: manual + daily[item.id] };
    });
    const kobanManual = number(entry.koban && entry.koban.manual);
    return { resources, koban: { manual: kobanManual, daily: daily.koban, total: kobanManual + daily.koban } };
  }
  function hasContent(entry) {
    if (!entry) return false;
    const totals = getTotals(entry);
    return DAILY_TASKS.some(task => entry.dailyTasks && entry.dailyTasks[task.id]) ||
      entry.obtainedSwords.length > 0 || entry.eventRuns.length > 0 || entry.normalMapRuns.length > 0 ||
      entry.expRecords.length > 0 || RESOURCE_KEYS.some(item => totals.resources[item.id].manual !== 0) ||
      totals.koban.manual !== 0;
  }
  function appendExpRecord(record, date) {
    const state = load();
    const key = date || localDate();
    const entry = normalizeEntry(state.entries[key], key);
    entry.expRecords.push({ id: uid("exp"), createdAt: new Date().toISOString(), ...clone(record) });
    state.entries[key] = entry;
    return save(state);
  }
  function getCatalogs() {
    const calculator = global.ExperienceCalculator || {};
    const normalMaps = Object.keys(calculator.MAP_EXPERIENCE || {}).sort((a, b) => a.localeCompare(b, "ja", { numeric: true }));
    const eventMaps = Object.values(calculator.EVENT_MAPS || {}).map(map => ({
      id: map.id,
      label: `${map.eventName}${map.year ? ` ${map.year}` : ""}${map.mapName ? `・${map.mapName}` : ""}`
    }));
    return { normalMaps, eventMaps };
  }

  global.SaniwaReportStore = {
    STORAGE_KEY, RESOURCE_KEYS, DAILY_TASKS, localDate, uid, createEntry, normalizeEntry,
    load, save, getDailyRewards, getTotals, hasContent, appendExpRecord, getCatalogs, clone
  };
  if (typeof module !== "undefined" && module.exports) module.exports = global.SaniwaReportStore;
})(typeof globalThis !== "undefined" ? globalThis : window);
