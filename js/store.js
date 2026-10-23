"use strict";
// ---- Save game + local analytics (localStorage only, nothing leaves the device) ----
(function () {
  var SAVE_KEY = "bb_save_v1", EV_KEY = "bb_analytics_v1";
  function dayStr(ts) { var d = new Date(ts); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function fresh() {
    return {v: 1, created: Date.now(), coins: BB.START.coins, gems: BB.START.gems, salv: BB.START.salv, bp: BB.START.bp,
      lvl: 1, upg: null, missions: {}, farmLast: Date.now(), farmStored: 0,
      set: {mute: false, timerMul: 1, rewardMul: 1, calm: false, music: true, haptics: true, tod: "", simple: false, tilt: true}, seen: {}};
  }
  var S;
  function load() {
    try { var j = localStorage.getItem(SAVE_KEY); S = j ? JSON.parse(j) : fresh(); } catch (e) { S = fresh(); }
    var f = fresh(); for (var k in f) if (S[k] === undefined) S[k] = f[k];
    for (var k2 in f.set) if (S.set[k2] === undefined) S.set[k2] = f.set[k2];
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
  load();

  // analytics
  var events = [];
  try { events = JSON.parse(localStorage.getItem(EV_KEY) || "[]"); } catch (e) { events = []; }
  function track(type, data) {
    var ev = {t: Date.now(), d: dayStr(Date.now()), e: type};
    if (data) for (var k in data) ev[k] = data[k];
    events.push(ev); if (events.length > 3000) events.splice(0, events.length - 3000);
    try { localStorage.setItem(EV_KEY, JSON.stringify(events)); } catch (e) {}
    return ev;
  }
  var sessStart = Date.now(), sessEnded = false, sessId = sessStart;
  track("session_start", {sid: sessId, lvl: S.lvl, coins: S.coins, ua: (navigator.userAgent || "").slice(0, 60)});
  function endSession() {
    if (sessEnded) return; sessEnded = true;
    track("session_end", {sid: sessId, sec: Math.round((Date.now() - sessStart) / 1000)});
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") endSession();
    else if (sessEnded) { sessEnded = false; sessStart = Date.now(); sessId = sessStart; track("session_start", {sid: sessId, resumed: 1, lvl: S.lvl}); }
  });
  window.addEventListener("pagehide", endSession);

  function report() {
    var sessions = events.filter(function (e) { return e.e === "session_start" && !e.resumed; });
    var ends = events.filter(function (e) { return e.e === "session_end"; });
    var days = {}; events.forEach(function (e) { days[e.d] = 1; });
    var dayList = Object.keys(days).sort();
    var first = dayList[0] || dayStr(Date.now());
    function plus(n) { var d = new Date(first + "T12:00:00"); d.setDate(d.getDate() + n); return dayStr(d.getTime()); }
    var starts = events.filter(function (e) { return e.e === "mission_start"; });
    var ends2 = events.filter(function (e) { return e.e === "mission_end"; });
    var wins = ends2.filter(function (e) { return e.win; });
    var perMission = {};
    ends2.forEach(function (e) { var m = perMission[e.m] || (perMission[e.m] = {plays: 0, wins: 0}); m.plays++; if (e.win) m.wins++; });
    var totalSec = ends.reduce(function (a, e) { return a + (e.sec || 0); }, 0);
    var upg = events.filter(function (e) { return e.e === "upgrade_start" || e.e === "upgrade_done" || e.e === "upgrade_speedup" || e.e === "upgrade_instant"; });
    return {
      version: BB.VERSION, firstDay: first, daysPlayed: dayList.length, dayList: dayList,
      D1: days[plus(1)] ? "returned" : (dayStr(Date.now()) > plus(1) ? "not returned" : "not yet measurable"),
      D7: days[plus(7)] ? "returned" : (dayStr(Date.now()) > plus(7) ? "not returned" : "not yet measurable"),
      sessions: sessions.length, avgSessionSec: ends.length ? Math.round(totalSec / ends.length) : 0, totalSec: totalSec,
      missionStarts: starts.length, missionEnds: ends2.length, wins: wins.length,
      winRate: ends2.length ? Math.round(100 * wins.length / ends2.length) + "%" : "n/a", perMission: perMission,
      upgradeEvents: upg.map(function (e) { return {e: e.e, lvl: e.to || e.lvl, afterSec: Math.round((e.t - S.created) / 1000), coins: e.coins}; }),
      eventCount: events.length
    };
  }
  window.BB.S = S; BB.save = save; BB.track = track; BB.events = function () { return events; };
  BB.report = report; BB.dayStr = dayStr;
  BB.reset = function () { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(EV_KEY); location.reload(); };
  BB.resetSaveOnly = function () { localStorage.removeItem(SAVE_KEY); location.reload(); };
  setInterval(save, 5000);
})();
