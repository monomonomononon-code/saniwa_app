(function(){
  function send(type) {
    try { window.parent.postMessage({ source: "roomsMenu", type }, "*"); } catch (e) {}
  }

  document.getElementById("open-room-editor").onclick = () => send("open_rooms_editor");
  document.getElementById("open-honmaru3d").onclick = () => send("open_honmaru3d");
  send("ready");
})();
