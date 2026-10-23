"use strict";
window.addEventListener("DOMContentLoaded", function () {
  BB.UI.init();
  BB.CCUI.init(); BB.CCUI.show();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
  // test hooks (used by headless checks)
  window.__bb = {S: BB.S, UI: BB.UI, Battle: BB.Battle, report: BB.report, CC: BB.CCUI};
});
