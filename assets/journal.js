(function () {
  "use strict";
  const entries = {
    report: { glyph: "報", title: "日報", description: "経験値、資材、周回数、成果" },
    diary: { glyph: "誌", title: "日誌", description: "本日の出来事、短文メモ、創作寄りの記録" }
  };
  function render() {
    const key = window.location.hash.slice(1);
    const entry = Object.prototype.hasOwnProperty.call(entries, key) ? entries[key] : null;
    document.getElementById("journal-menu").hidden = !!entry;
    document.getElementById("journal-detail").hidden = !entry || key === "diary";
    document.getElementById("diary").hidden = key !== "diary";
    if (entry) {
      document.getElementById("detail-glyph").textContent = entry.glyph;
      document.getElementById("detail-name").textContent = entry.title;
      document.getElementById("detail-description").textContent = entry.description;
    }
    document.title = `${entry ? entry.title : "日報・日誌"} | 審神者管理ツール`;
  }
  window.addEventListener("hashchange", render);
  render();
})();
