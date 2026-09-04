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
  function rewards(amount, extras) {
    return Object.freeze({
      ...EMPTY_REWARDS,
      charcoal: amount,
      steel: amount,
      coolant: amount,
      whetstone: amount,
      ...(extras || {})
    });
  }
  // 数値が明示された集計対象だけを保持する。未提示の「その他報酬」は推測しない。
  const DAILY_TASKS = Object.freeze([
    { id: "login", label: "本丸にアクセス", rewards: rewards(200) },
    { id: "sortie", label: "いざ「出陣」", rewards: rewards(300, { requestToken: 2, helpToken: 1 }) },
    { id: "expedition", label: "「遠征」に派遣", rewards: rewards(300, { requestToken: 2, helpToken: 1 }) },
    { id: "practice", label: "「演練」に挑戦", rewards: rewards(300, { requestToken: 2, helpToken: 1 }) },
    { id: "duty", label: "「内番」を実施", rewards: rewards(200, { helpToken: 1 }) },
    { id: "daily3", label: "「日課」を3個達成", rewards: rewards(500, { koban: 300 }) },
    { id: "daily5", label: "「日課」を5個達成", rewards: rewards(1000, { koban: 900 }) }
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
      koban: { manual: 0, tripleCampaign: false },
      expRecords: []
    };
  }
  function normalizeMember(member) {
    if (typeof member === "string") return { id: "", name: member };
    return { id: member && member.id ? String(member.id) : "", name: member && member.name ? String(member.name) : "" };
  }
  function normalizeExpResult(result) {
    return {
      characterId: result && (result.characterId || result.id) ? String(result.characterId || result.id) : "",
      name: result && result.name ? String(result.name) : "",
      exp: result && Number.isFinite(Number(result.exp != null ? result.exp : result.experience)) ? Number(result.exp != null ? result.exp : result.experience) : null,
      expMultiplier: result && Number.isFinite(Number(result.expMultiplier)) ? Number(result.expMultiplier) : 1,
      conditions: result && result.conditions && typeof result.conditions === "object" ? clone(result.conditions) : {}
    };
  }
  function normalizeExpRecord(record) {
    const source = record && typeof record === "object" ? record : {};
    const normalized = { ...clone(source) };
    if (Array.isArray(source.members)) {
      normalized.members = source.members.map(normalizeMember).filter(member => member.name);
      normalized.expResults = Array.isArray(source.expResults) ? source.expResults.map(normalizeExpResult).filter(result => result.name) : [];
      delete normalized.characters;
      return normalized;
    }
    // v1では計算対象が保存されていなかった。誤ったEXP表示を避け、元データは退避して保持する。
    const legacyCharacters = Array.isArray(source.characters) ? clone(source.characters) : [];
    normalized.members = legacyCharacters.map(normalizeMember).filter(member => member.name);
    normalized.expResults = [];
    normalized.legacyExpResults = legacyCharacters;
    normalized.legacyTargetUnknown = legacyCharacters.length > 0;
    delete normalized.characters;
    return normalized;
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
    base.koban.tripleCampaign = !!(source.koban && source.koban.tripleCampaign);
    base.expRecords = Array.isArray(source.expRecords) ? source.expRecords.map(normalizeExpRecord) : [];
    return base;
  }
  function load() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(STORAGE_KEY));
      if (!parsed || typeof parsed !== "object") return { version: 2, entries: {} };
      const entries = {};
      Object.entries(parsed.entries || {}).forEach(([date, entry]) => { entries[date] = normalizeEntry(entry, date); });
      return { version: 2, entries };
    } catch (error) {
      return { version: 2, entries: {} };
    }
  }
  function save(state) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, entries: state.entries || {} }));
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
    entry.expRecords.push(normalizeExpRecord({ id: uid("exp"), createdAt: new Date().toISOString(), ...clone(record) }));
    state.entries[key] = entry;
    return save(state);
  }
  function getCompatibleExpRecords(record, date) {
    const key = date || localDate();
    const entry = normalizeEntry(load().entries[key], key);
    return entry.expRecords.filter(existing => {
      const sameMap = record.mapId && existing.mapId ? record.mapId === existing.mapId : record.mapLabel === existing.mapLabel;
      return sameMap && Number(record.rounds) === Number(existing.rounds);
    }).map(clone);
  }
  function saveExpResult(record, targetRecordId, date) {
    const state = load();
    const key = date || localDate();
    const entry = normalizeEntry(state.entries[key], key);
    const incoming = normalizeExpRecord(record);
    if (!targetRecordId) {
      incoming.id = incoming.id || uid("exp");
      incoming.createdAt = incoming.createdAt || new Date().toISOString();
      entry.expRecords.push(incoming);
    } else {
      const target = entry.expRecords.find(item => item.id === targetRecordId);
      const result = incoming.expResults[0];
      if (!target || !result) return false;
      const resultIndex = target.expResults.findIndex(item => (
        result.characterId && item.characterId ? item.characterId === result.characterId : item.name === result.name
      ));
      if (resultIndex === -1) target.expResults.push(result);
      else target.expResults[resultIndex] = result;
      if (!target.members.some(member => (
        result.characterId && member.id ? member.id === result.characterId : member.name === result.name
      ))) target.members.push({ id: result.characterId, name: result.name });
      target.updatedAt = new Date().toISOString();
    }
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
    load, save, getDailyRewards, getTotals, hasContent, normalizeExpRecord,
    appendExpRecord, getCompatibleExpRecords, saveExpResult, getCatalogs, clone
  };
  if (typeof module !== "undefined" && module.exports) module.exports = global.SaniwaReportStore;
})(typeof globalThis !== "undefined" ? globalThis : window);
