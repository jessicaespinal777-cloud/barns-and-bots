"use strict";
// ---- Base + raid game logic and screen flow (panels live in cc_panels.js) ----
(function () {
  var C = BB.CC, G = BB.CCGen, Sim = BB.CCSim, V = BB.CCV, S = BB.S, N = C.GRID, S2 = BB.CCSim;
  var $ = function (id) { return document.getElementById(id); };
  var X = BB.CCUI = {}, cc = null, raid = null, lastSave = 0, ghostFor = null;
  var FAKE = ["Tex Harlan", "Bramble", "Lola Reyes", "Farmer Quill", "Juniper", "Old Gus", "Mags Turner", "Piper", "Hollis", "Wren", "Dusty", "Clover"];
  X.fmt = function (n) { return Math.floor(n).toLocaleString("en-US"); };
  X.toast = function (m) { BB.UI.toast(m); };
  X.modal = function (h, cls) { var m = $("modal"); m.innerHTML = '<div class="mbox ' + (cls || "") + '">' + h + "</div>"; m.classList.remove("hidden"); };
  X.close = function () { BB.UI.closeModal(); };
  function mul() { return S.set.timerMul || 1; }
  function day() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }

  // ---------- state ----------
  function fresh() {
    var n = Date.now(), id = 0;
    function b(t, x, y, l) { return {id: ++id, t: t, x: x, y: y, l: l || 1, up: null, st: 0, lt: n}; }
    return {v: 2, nid: 20, bld: [b("core", 10, 9), b("barn", 14, 9), b("field", 6, 9), b("tinker", 14, 13), b("camp", 6, 13), b("train", 10, 14), b("blaster", 15, 5)],
      army: {slinger: 5, bruiser: 3}, queue: [], qLast: n, spells: {}, ulv: {slinger: 1, bruiser: 1, roller: 1, drone: 1}, lab: null, heroHp: 1, heroT: n, hero: "bale", hh: {},
      crew: {units: {}, req: null, reqAt: 0, don: {}, log: []}, trophies: 0, shield: 0, log: [], unseen: 0, story: {}, daily: {last: "", streak: 0}, quests: {day: "", prog: {}, claimed: {}},
      ach: {claimed: {}}, pass: {pts: 0, prem: false, claimed: {}}, stats: {}, nextRaid: n + 8 * 60000, seen: {}, last: n, rep: [], lastRaid: null, guard: 0, prevLayout: null};
  }
  X.ensure = function () {
    if (!S.cc) S.cc = fresh(); cc = S.cc; var f = fresh(); for (var k in f) if (cc[k] === undefined) cc[k] = f[k];
    if (cc.tut === undefined) cc.tut = (cc.stats && cc.stats.attacks) || cc.bld.length > 7 || (cc.trophies || 0) > 0 ? 9 : 0;
    if (!cc.v || cc.v < 2) { cc.v = 2; cc.guard = 0; cc.prevLayout = null; if (cc.log) cc.log.forEach(function (e) { if (e && e.base && !e.base.fh) e.base.fh = e.fh || 1; }); BB.track("cc_migrate_v2", {}); }
    return cc;
  };
  X.cc = function () { return cc; };
  // ---------- heroes ----------
  X.heroUnlocked = function (id) { var H = C.HEROES[id]; if (!H) return false; if (!H.unl) return true; return !!(cc.story && cc.story[H.unl.story]); };
  X.heroId = function () { return C.HEROES[cc.hero] && X.heroUnlocked(cc.hero) ? cc.hero : "bale"; };
  X.hero = function () { return C.HEROES[X.heroId()]; };
  X.selectHero = function (id) {
    if (raid && raid.phase === "fight") return false;
    if (!X.heroUnlocked(id)) { BB.sfx("deny"); X.toast("Locked: " + (C.HEROES[id] && C.HEROES[id].unlTxt || "keep playing")); return false; }
    var cur = X.heroId(); if (cur === id) return true;
    cc.hh[cur] = cc.heroHp; cc.hero = id; cc.heroHp = cc.hh[id] == null ? 1 : cc.hh[id]; cc.heroT = Date.now(); BB.sfx("upgrade"); BB.track("cc_hero_select", {id: id}); X.save(); return true;
  };
  function stat(k, n) { cc.stats[k] = (cc.stats[k] || 0) + (n === undefined ? 1 : n); questEv(k, n === undefined ? 1 : n); }
  X.stat = stat;
  function questEv(ev, n) {
    if (cc.quests.day !== day()) { cc.quests = {day: day(), prog: {}, claimed: {}}; }
    C.QUESTS.forEach(function (q) { if (q.ev === ev) cc.quests.prog[q.id] = Math.min(q.n, (cc.quests.prog[q.id] || 0) + n); });
  }
  function bt(t) { return cc.bld.filter(function (b) { return b.t === t; }); }
  function done(t) { return bt(t).filter(function (b) { return b.l >= 1; }); }
  X.coreL = function () { var c = bt("core")[0]; return c ? c.l : 1; };
  X.maxCount = function (t) { return C.B[t].mx[X.coreL() - 1]; };
  X.count = function (t) { return bt(t).length; };
  X.tinkers = function () { return done("tinker").length; };
  X.busy = function () { return cc.bld.filter(function (b) { return b.up; }).length; };
  X.freeTinker = function () { return X.tinkers() - X.busy(); };
  X.coinCap = function () { return 500 + done("barn").reduce(function (a, b) { return a + C.B.barn.cap[b.l]; }, 0); };
  X.salvCap = function () { return 50 + done("silo").reduce(function (a, b) { return a + C.B.silo.cap[b.l]; }, 0); };
  X.housing = function () { return done("camp").reduce(function (a, b) { return a + C.B.camp.cap[b.l]; }, 0); };
  X.housed = function () { var h = 0; C.UORDER.forEach(function (k) { h += (cc.army[k] || 0) * C.U[k].h; }); cc.queue.forEach(function (q) { h += C.U[q.k].h; }); return h; };
  X.crewCap = function () { return done("crewhall").reduce(function (a, b) { return a + C.B.crewhall.cap[b.l]; }, 0); };
  X.crewUsed = function () { var h = 0; for (var k in cc.crew.units) h += (cc.crew.units[k] || 0) * (C.U[k] ? C.U[k].h : 1); return h; };
  X.spellN = function () { var n = 0; for (var k in cc.spells) n += cc.spells[k]; return n; };
  X.spellE = function () { var n = 0; for (var k in cc.spells) n += (cc.spells[k] || 0) * (C.SP[k] ? C.SP[k].e || 1 : 1); return n; };
  X.spellCap = function () { return C.SPCAPE[Math.min(C.SPCAPE.length, X.coreL()) - 1] || 2; };
  X.grid = function (ex) { var o = []; for (var i = 0; i < N; i++) o.push(new Array(N).fill(0)); cc.bld.forEach(function (b) { if (b.id === ex) return; var d = C.B[b.t]; for (var j = 0; j < d.h; j++) for (var k = 0; k < d.w; k++) o[b.y + j][b.x + k] = b.id; }); return o; };
  function fits(t, x, y, ex) {
    var d = C.B[t]; if (x < C.RING || y < C.RING || x + d.w > N - C.RING || y + d.h > N - C.RING) return false; var g = X.grid(ex);
    for (var j = 0; j < d.h; j++) for (var k = 0; k < d.w; k++) if (g[y + j][x + k]) return false; return true;
  }
  function findSpot(t) { var d = C.B[t], best = null, bd = 1e9; for (var y = C.RING; y <= N - C.RING - d.h; y++) for (var x = C.RING; x <= N - C.RING - d.w; x++) { if (!fits(t, x, y)) continue; var dd = Math.hypot(x - 10, y - 11); if (dd < bd) { bd = dd; best = [x, y]; } } return best; }
  function give(c, s, g) { S.coins += c || 0; S.salv += s || 0; S.gems += g || 0; }
  X.give = give;
  function addCapped(c, s) { var gc = Math.max(0, Math.min(c, X.coinCap() - S.coins)), gs = Math.max(0, Math.min(s, X.salvCap() - S.salv)); S.coins += gc; S.salv += gs; return [gc, gs]; }
  X.addCapped = addCapped;
  X.save = function () { BB.save(); lastSave = Date.now(); };

  // ---------- timers ----------
  function finishUp(b, skipped) {
    var to = b.up.to; b.up = null; b.l = to; b.lt = Date.now(); if (b.t === "core") { cc.stats.core = to; } stat("upg"); BB.sfx("upgrade"); BB.track("cc_upgrade_done", {t: b.t, to: to, skipped: skipped || ""});
    V.puff(b.x + C.B[b.t].w / 2, b.y + C.B[b.t].h / 2, 14, "#ffe08a", 40, 0.7); V.ring(b.x + C.B[b.t].w / 2, b.y + C.B[b.t].h / 2, 2.5, "#ffe08a");
    X.toast(C.B[b.t].name + " is now level " + to + "!"); if (BB.FX) { var fw = V.dims(), fx0 = (b.x + C.B[b.t].w / 2) * C.T, fy0 = fw.gy + (b.y + C.B[b.t].h / 2) * C.T; BB.FX.upDone(fx0, fy0, b.t === "core" ? "CORE LEVEL " + to + "!" : "UPGRADED!", C.B[b.t].name + " L" + to, b.t === "core"); BB.sfx(b.t === "core" ? "fanfare" : "lvl"); BB.vibe([20, 40, 30]); } if (cc.tut === 3) { cc.tut = 9; BB.FX && BB.FX.arrowOff(); }
    X.save();
  }
  function tickTimers() {
    var now = Date.now(), m = mul();
    cc.bld.forEach(function (b) {
      if (b.up) { b.up.done += (now - b.up.last) / 60000 * m; b.up.last = now; if (b.up.done >= b.up.total) finishUp(b); }
      var d = C.B[b.t]; if (d.kind === "col") { if (b.l >= 1 && !b.up) { var cap = d.cap[b.l]; b.st = Math.min(cap, (b.st || 0) + d.rate[b.l] * (now - (b.lt || now)) / 60000 * m); } b.lt = now; }
    });
    if (cc.lab) { cc.lab.done += (now - cc.lab.last) / 60000 * m; cc.lab.last = now; if (cc.lab.done >= cc.lab.total) { cc.ulv[cc.lab.k] = cc.lab.to; BB.sfx("upgrade"); X.toast(C.U[cc.lab.k].name + " is now level " + cc.lab.to + "!"); cc.lab = null; stat("upg"); X.save(); } }
    // training queue (one stream; Training Barns speed it up)
    var nT = Math.max(1, done("train").length), dt = (now - cc.qLast) / 1000 * m * nT; cc.qLast = now;
    while (cc.queue.length && dt > 0) { var q = cc.queue[0], use = Math.min(dt, q.left); q.left -= use; dt -= use; if (q.left <= 0.001) { cc.queue.shift(); cc.army[q.k] = (cc.army[q.k] || 0) + 1; } else break; }
    // hero regen (full in 4 min)
    if (cc.heroHp < 1) { cc.heroHp = Math.min(1, cc.heroHp + (now - cc.heroT) / 240000 * m); } for (var hk in cc.hh) if (cc.hh[hk] < 1) cc.hh[hk] = Math.min(1, cc.hh[hk] + (now - cc.heroT) / 240000 * m); cc.heroT = now;
    // crew donations
    if (cc.crew.req && now >= cc.crew.reqAt) { fillCrew(); }
    if (cc.shield && cc.shield < now) cc.shield = 0;
  }
  function fillCrew() {
    var cap = X.crewCap(), used = X.crewUsed(), pat = ["bruiser", "slinger", "slinger", "roller", "drone", "slinger", "chick", "hound"], i = 0, got = [];
    cc.crew.req = null; cc.crew.reqAt = 0;
    while (i < 40) { var k = pat[i % pat.length], mem = C.CREWMEM[(i * 3) % C.CREWMEM.length]; i++; var h = C.U[k].h; if (used + h > cap) { if (k === "slinger" && used + 1 > cap) break; continue; } if (C.U[k].tb > X.coreL()) continue;
      cc.crew.units[k] = (cc.crew.units[k] || 0) + 1; used += h; got.push(mem.n + " sent a " + C.U[k].name); }
    cc.crew.log = got.slice(0, 6).concat(cc.crew.log).slice(0, 12); X.toast("Your crew filled the Crew Barn!"); X.save();
  }
  X.tick = function () {
    if (!cc) return; if (!$("base").classList.contains("active")) { tickTimers(); return; }
    tickTimers(); maybeAsyncRaid(); X.hud(); if (X.panelOpen && X.panelOpen() && !X.panelBusy) X.panelRefresh(true);
    if (Date.now() - lastSave > 4000) X.save();
  };

  // ---------- HUD ----------
  function cnt(el, v) {
    if (el._raf && v === el._cv) return; if (el._cv === undefined || !BB.FX || v <= el._cv + 4) { if (el._raf) { cancelAnimationFrame(el._raf); el._raf = 0; } el.textContent = X.fmt(v); el._cv = v; return; }
    if (el._cvTo === v) return; el._cvTo = v; var go = function () { el._cvTo = undefined; BB.FX.count(el, v, 800, X.fmt, true); }; if (X._cntDelay && performance.now() < X._cntDelay) setTimeout(go, X._cntDelay - performance.now()); else go();
  }
  X.hud = function () {
    if (raid) return;
    cnt($("bv-coins"), S.coins); cnt($("bv-salv"), S.salv); cnt($("bv-gems"), S.gems);
    $("bc-coins").style.width = Math.min(100, S.coins / X.coinCap() * 100) + "%"; $("bc-salv").style.width = Math.min(100, S.salv / X.salvCap() * 100) + "%";
    var L = C.league(cc.trophies); $("b-league").innerHTML = '<i class="lg" style="background:' + L.col + '"></i><b>' + cc.trophies + "</b><small>" + L.n + "</small>";
    var sh = cc.shield > Date.now() ? "\u{1F6E1} Shield " + C.fmtT((cc.shield - Date.now()) / 60000) : cc.guard > Date.now() ? "Guard " + C.fmtT((cc.guard - Date.now()) / 60000) : ""; $("b-shield").textContent = sh; $("b-shield").style.display = sh ? "" : "none";
    $("b-tink").innerHTML = "<b>" + X.freeTinker() + "/" + X.tinkers() + "</b> tinkers free";
    var q = cc.bld.filter(function (b) { return b.up; }).sort(function (a, b) { return (a.up.total - a.up.done) - (b.up.total - b.up.done); }), h = "";
    q.forEach(function (b) { var rem = b.up.total - b.up.done, g = BB.skipGems(rem); h += '<button class="chip" data-sel="' + b.id + '"><img src="assets/' + (C.B[b.t].art || (b.t === "field" ? "corn" : "silo_dmg")) + '.webp" alt=""><span>' + C.B[b.t].name.split(" ")[0] + " " + C.fmtT(rem) + '</span><i class="gm" data-skip="' + b.id + '">\u25C6' + g + "</i></button>"; });
    if (cc.lab) { var rl = cc.lab.total - cc.lab.done; h += '<button class="chip" data-nav="army"><img src="assets/workshop.webp" alt=""><span>' + C.U[cc.lab.k].name.split(" ")[1] + " L" + cc.lab.to + " " + C.fmtT(rl) + "</span></button>"; }
    if (h !== X._qh) { X._qh = h; $("b-queue").innerHTML = h; }
    $("b-goal").innerHTML = goalText(); $("b-daily").classList.toggle("ready", cc.daily.last !== day()); $("log-badge").textContent = cc.unseen || ""; $("log-badge").style.display = cc.unseen ? "" : "none";
    var nq = C.QUESTS.filter(function (q) { return (cc.quests.prog[q.id] || 0) >= q.n && !cc.quests.claimed[q.id]; }).length + (cc.daily.last !== day() ? 1 : 0);
    var tb = $("nav-tasks"); if (tb) tb.classList.toggle("dot", nq > 0);
  };
  function goalText() {
    if (cc.tut === 3) return "Tap your Coin Barn, then UPGRADE it: it finishes in seconds!";
    if (!cc.stats.attacks) { var hs = X.housed(); if (!hs && !(cc.army.slinger || cc.army.bruiser)) return "Next: open ARMY and train your first troops"; return "Next: tap ATTACK and clear Campaign Mission 1"; }
    var core = bt("core")[0]; if (core && !core.up && core.l < C.CORE_MAX) { var c = C.B.core.c[core.l]; return "Next goal: upgrade the Homestead Core to L" + (core.l + 1) + " (" + X.fmt(c) + " coins) to unlock new buildings"; }
    if (cc.daily.last !== day()) return "Next: claim today's daily reward in TASKS";
    return "Next goal: reach " + (C.LEAGUES[C.LEAGUES.indexOf(C.league(cc.trophies)) + 1] || C.LEAGUES[5]).min + " trophies for the next league";
  }

  // ---------- build / place ----------
  X.startPlace = function (t) {
    var d = C.B[t], cl = X.coreL(); if (X.count(t) >= X.maxCount(t)) { BB.sfx("deny"); X.toast(X.maxCount(t) ? "You have the maximum for this Core level" : "Upgrade the Homestead Core to unlock " + d.name); return; }
    if (t === "wall") { return X.startPaint(); }
    if (S.coins < d.c[0] || S.salv < d.s[0]) { BB.sfx("deny"); X.toast("Not enough " + (S.coins < d.c[0] ? "coins" : "salvage")); return; }
    if (X.freeTinker() <= 0) { BB.sfx("deny"); X.toast("All tinkers are busy. Wait, or speed one up with gems."); return; }
    var sp = findSpot(t); if (!sp) { X.toast("No room left on the plot"); return; }
    X.closePanel(); V.ghost = {t: t, x: sp[0], y: sp[1], ok: true}; V.sel = null; X.selBar(); ghostBar();
  };
  function ghostBar() {
    var g = V.ghost, el = $("b-sel"); if (!g) { return; } var d = C.B[g.t];
    if (g.moveId) { g.ok = fits(g.t, g.x, g.y, g.moveId); } else g.ok = fits(g.t, g.x, g.y);
    el.classList.remove("hidden"); el.innerHTML = '<div class="sn"><b>' + (g.moveId ? "Move " : "Place ") + d.name + '</b><small>Drag the building, then confirm</small></div><div class="sb"><button class="btn sec" id="gx">\u2716</button><button class="btn ' + (g.ok ? "" : "off") + '" id="gok">\u2714' + (g.moveId ? "" : " " + X.fmt(d.c[0]) + "c") + "</button></div>";
    $("gx").onclick = function () { V.ghost = null; X.selBar(); }; $("gok").onclick = function () { if (!g.ok) { BB.sfx("deny"); return; } confirmPlace(); };
  }
  function confirmPlace() {
    var g = V.ghost, d = C.B[g.t];
    if (g.moveId) { var b = cc.bld.filter(function (x) { return x.id === g.moveId; })[0]; b.x = g.x; b.y = g.y; V.ghost = null; BB.sfx("click"); X.selBar(); X.save(); return; }
    S.coins -= d.c[0]; S.salv -= d.s[0]; var nb = {id: ++cc.nid, t: g.t, x: g.x, y: g.y, l: 0, up: {to: 1, total: d.t[0], done: 0, last: Date.now()}, st: 0, lt: Date.now()}; cc.bld.push(nb);
    V.ghost = null; BB.sfx("upgrade"); V.puff(g.x + d.w / 2, g.y + d.h / 2, 12, "#e8d9a0", 40, 0.6); BB.track("cc_build", {t: g.t}); stat("built"); V.sel = nb; X.selBar(); X.hud(); X.save();
  }
  X.ghostMove = function (x, y) { if (!V.ghost) return; var d = C.B[V.ghost.t]; V.ghost.x = Math.max(C.RING, Math.min(N - C.RING - d.w, x)); V.ghost.y = Math.max(C.RING, Math.min(N - C.RING - d.h, y)); ghostBar(); };
  // fences
  X.startPaint = function () { X.closePanel(); V.ghost = null; V.sel = null; V.paint = {on: false, erase: false, n: 0}; paintBar(); };
  function paintBar() {
    var p = V.paint, el = $("b-sel"); el.classList.remove("hidden");
    el.innerHTML = '<div class="sn"><b>Fences ' + cc.bld.filter(function (b) { return b.t === "wall"; }).length + "/" + X.maxCount("wall") + '</b><small>Drag on the plot to ' + (p.erase ? "remove" : "paint") + " (" + C.B.wall.c[0] + "c each)</small></div><div class=\"sb\"><button class=\"btn sec\" id=\"pe\">" + (p.erase ? "ERASING" : "PAINT") + "</button><button class=\"btn\" id=\"pd\">DONE</button></div>";
    $("pe").onclick = function () { p.erase = !p.erase; paintBar(); }; $("pd").onclick = function () { V.paint = null; X.save(); X.selBar(); };
  }
  X.paintAt = function (x, y) {
    var p = V.paint; if (!p || x < C.RING || y < C.RING || x >= N - C.RING || y >= N - C.RING) return; var ex = cc.bld.filter(function (b) { return b.t === "wall" && b.x === x && b.y === y; })[0];
    if (p.erase) { if (ex) { cc.bld.splice(cc.bld.indexOf(ex), 1); BB.sfx("click"); } return; }
    if (ex) return; if (!fits("wall", x, y)) return; if (X.count("wall") >= X.maxCount("wall")) { if (!p.warned) { X.toast("Fence limit reached. Upgrade the Core for more."); p.warned = 1; } return; }
    if (S.coins < C.B.wall.c[0]) { if (!p.warned2) { X.toast("Not enough coins for more fences"); p.warned2 = 1; } return; }
    S.coins -= C.B.wall.c[0]; cc.bld.push({id: ++cc.nid, t: "wall", x: x, y: y, l: 1, up: null, st: 0, lt: 0}); p.n++; stat("walls"); if (p.n % 3 === 1) BB.sfx("click"); paintBar(); X.hud();
  };
  // selection
  X.tapAt = function (x, y) {
    var tx = Math.floor(x), ty = Math.floor(y), hit = null; cc.bld.forEach(function (b) { var d = C.B[b.t]; if (tx >= b.x && tx < b.x + d.w && ty >= b.y && ty < b.y + d.h && (!hit || d.kind !== "wall")) hit = b; });
    if (hit && C.B[hit.t].kind === "col" && collectable(hit)) { X.collect(hit); }
    V.sel = hit; BB.sfx("click"); X.selBar();
  };
  function collectable(b) { return b.l >= 1 && (b.st || 0) >= 1; }
  X.collect = function (b) {
    var d = C.B[b.t], amt = Math.floor(b.st || 0); if (amt < 1) return; var r = d.res === "c" ? addCapped(amt, 0)[0] : addCapped(0, amt)[1];
    if (r <= 0) { BB.sfx("deny"); X.toast("Storage full! Build or upgrade a " + (d.res === "c" ? "Coin Barn" : "Salvage Silo")); return; }
    b.st -= r; BB.sfx(d.res === "c" ? "coin" : "salv"); if (BB.FX) { var dm = V.dims(); BB.FX.flyWorld((b.x + d.w / 2) * C.T, dm.gy + b.y * C.T, d.res, Math.min(8, 2 + Math.floor(r / 40)), r); BB.vibe(10); } V.float(b.x + d.w / 2, b.y - 0.5, "+" + r, d.res === "c" ? "#ffd35a" : "#8fd4ff"); if (d.res === "c") stat("collect", r); X.hud();
  };
  X.bubble = function (b) { var d = C.B[b.t]; return d.kind === "col" && b.l >= 1 && (b.st || 0) >= Math.max(15, d.cap[b.l] * 0.12); };
  X.selBar = function () {
    var el = $("b-sel"), b = V.sel; if (V.ghost || V.paint) return; if (!b) { el.classList.add("hidden"); el.innerHTML = ""; return; }
    var d = C.B[b.t], h = "", info = "", lv = b.l;
    if (b.up) { info = "Under construction. " + C.fmtT(b.up.total - b.up.done) + " left."; }
    else if (d.kind === "def" && d.sup) info = "Support &middot; range " + d.rng + " &middot; ranged hits on nearby defenses do 30% less &middot; HP " + Math.round(d.hp * C.LV[lv - 1 < 0 ? 0 : lv])
    else if (d.kind === "def") info = (d.spec ? C.SPECTXT[d.spec] + " &middot; " : "") + "Damage " + Math.round(d.dps * C.LV[lv] * 1.3) + "/s &middot; range " + d.rng + " &middot; hits " + (d.g && d.a ? "ground + air" : d.g ? "ground only" : "air only") + " &middot; HP " + Math.round(d.hp * C.LV[lv]);
    else if (d.kind === "trap") info = (C.TRAPTXT[d.tk || "rake"] || d.d) + " &middot; hidden from raiders until they scout it"
    else if (d.kind === "col") info = "Makes " + d.rate[lv] + "/min &middot; holds " + X.fmt(b.st || 0) + "/" + X.fmt(d.cap[lv]);
    else if (d.kind === "sto") info = "Capacity " + X.fmt(d.cap[lv]) + " &middot; raiders can loot a share";
    else if (d.kind === "camp") info = "Army housing +" + d.cap[lv];
    else if (d.kind === "crew") info = "Holds " + d.cap[lv] + " housing of crew troops (" + X.crewUsed() + "/" + X.crewCap() + ")";
    else if (d.kind === "core") info = "Level " + lv + " &middot; unlocks buildings up to Core L" + Math.min(C.CORE_MAX, lv + 1);
    else info = d.d;
    h += '<div class="sn"><b>' + d.name + " L" + Math.max(lv, b.up ? b.up.to : lv) + "</b><small>" + info + '</small></div><div class="sb">';
    if (b.up) { var g = BB.skipGems(b.up.total - b.up.done); h += '<button class="btn blue" data-skip="' + b.id + '">\u26A1 ' + g + " \u25C6</button>"; }
    else {
      if (d.kind === "col" && collectable(b)) h += '<button class="btn" data-collect="' + b.id + '">COLLECT</button>';
      var can = canUp(b); if (can === true) h += '<button class="btn" data-up="' + b.id + '">UPGRADE<small>' + X.fmt(d.c[lv]) + "c" + (d.s[lv] ? " " + d.s[lv] + "s" : "") + " &middot; " + C.fmtT(d.t[lv]) + "</small></button>"; else if (can) h += '<button class="btn off" data-up="' + b.id + '">' + can + "</button>";
      if (d.kind === "wall") h += '<button class="btn sec" data-fence="1">FENCES</button>';
      else h += '<button class="btn sec" data-move="' + b.id + '">MOVE</button>';
      if (d.kind === "train" || d.kind === "camp" || d.kind === "lab") h += '<button class="btn sec" data-nav="army">ARMY</button>';
      if (d.kind === "crew") h += '<button class="btn sec" data-nav="crew">CREW</button>';
    }
    el.classList.remove("hidden"); el.innerHTML = h + "</div>"; X._selId = b.id;
  };
  function canUp(b) {
    var d = C.B[b.t], l = b.l; if (d.kind === "wall") return "Use Upgrade All in ARMY \u2192 Fences"; var cap = b.t === "core" ? C.CORE_MAX : X.coreL(); if (l >= cap) return b.t === "core" ? "Max level" : "Upgrade the Core first"; if (l >= C.CORE_MAX) return "Max level";
    if (S.coins < d.c[l] || S.salv < d.s[l]) return "Need " + (S.coins < d.c[l] ? X.fmt(d.c[l]) + " coins" : d.s[l] + " salvage"); if (X.freeTinker() <= 0) return "Tinkers busy"; return true;
  }
  X.doUp = function (b) {
    var d = C.B[b.t], l = b.l, can = canUp(b); if (can !== true) { BB.sfx("deny"); X.toast(can); return; }
    S.coins -= d.c[l]; S.salv -= d.s[l]; var early = (cc.stats.upg || 0) < 3 ? Math.min(d.t[l], 0.1) : d.t[l]; b.up = {to: l + 1, total: early, done: 0, last: Date.now()}; BB.sfx("hammer"); V.ring(b.x + d.w / 2, b.y + d.h / 2, 1.8, "#ffd35a"); BB.vibe(12); BB.track("cc_upgrade_start", {t: b.t, to: l + 1}); X.selBar(); X.hud(); X.save();
  };
  X.skip = function (b) {
    if (!b.up) return; var g = BB.skipGems(b.up.total - b.up.done); if (S.gems < g) { BB.sfx("deny"); X.toast("Not enough play-gems. (Gems are not real money; the shop is a mock.)"); return; }
    S.gems -= g; BB.track("cc_speedup", {t: b.t, gems: g}); finishUp(b, "gems"); X.selBar(); X.hud();
  };
  X.byId = function (id) { return cc.bld.filter(function (b) { return b.id === +id; })[0]; };
  X.startMove = function (b) { var d = C.B[b.t]; V.sel = null; V.ghost = {t: b.t, x: b.x, y: b.y, ok: true, moveId: b.id, l: b.l}; ghostBar(); };

  // ---------- practice raid on your own base ----------
  function practiceArmy() {
    var cl = X.coreL(), o = {}, base = {slinger: 20, chick: 10, bruiser: 4, roller: 3, sow: 2, drone: 3, hound: 3, wrench: 2, mule: 3, spinner: 3, badger: 3, kestrel: 3};
    C.UORDER.forEach(function (k) { if (base[k] && C.U[k].tb <= cl) o[k] = base[k]; }); return o;
  }
  function practiceSpells() {
    var cl = X.coreL(), o = {}; C.SPORDER.forEach(function (k) { if (C.SP[k].unl <= cl) o[k] = 1; }); return o;
  }
  X.startPractice = function () {
    if (cc.bld.filter(function (b) { return C.B[b.t].kind === "def"; }).length === 0) { BB.sfx("deny"); X.toast("Build a defense first, then test your base"); return; }
    var b = defBase(true); b.name = "Your base (practice)"; b.fh = X.coreL(); b.tw = 0; b.tl = 0; b.seed = 7; b.practice = true; b.theme = "p";
    BB.track("cc_practice_start", {fh: b.fh}); X.startScout(b, "practice");
  };
  // ---------- base tools: ranges, fence check, presets ----------
  X.toggleRanges = function () { V.showRanges = !V.showRanges; BB.sfx("click"); };
  X.checkFences = function () {
    var a = S2.analyze(cc.bld); V.analysis = a; V.analysisT = Date.now(); var n = a.sealed + a.exposed;
    var msg = a.walls === 0 ? "No fences yet. Build a ring to make compartments." : "Compartments " + a.comps + " | sealed buildings " + a.sealed + "/" + n + " | gap tiles " + a.gaps.length + " | Core " + (a.coreSealed ? "sealed" : "EXPOSED");
    X.toast(msg); BB.track("cc_fence_check", {comps: a.comps, gaps: a.gaps.length, core: a.coreSealed ? 1 : 0}); return a;
  };
  X.fenceSummary = function () {
    var a = V.analysis; if (!a) return "Tap CHECK FENCES to tint sealed (green) and exposed (red) buildings and mark one-tile gaps.";
    var n = a.sealed + a.exposed; return "<b>" + a.comps + "</b> compartment" + (a.comps === 1 ? "" : "s") + " &middot; <b>" + a.sealed + "/" + n + "</b> sealed &middot; <b>" + a.gaps.length + "</b> gap tile" + (a.gaps.length === 1 ? "" : "s") + " &middot; Core <b>" + (a.coreSealed ? "sealed" : "exposed") + "</b>";
  };
  var PRESETS = {
    farm: {n: "Farm", rings: [5, 8], zone: {sto: [0], def: [0, 1], col: [1, 2], camp: [1], train: [1], lab: [1], work: [1], crew: [0], trap: [1]}, tg: {sto: 2.7, def: 3.8, col: 7, camp: 6.5, train: 6.5, lab: 6.5, work: 6.5, crew: 3.8, trap: 6}},
    trophy: {n: "Trophy", rings: [4, 6, 8], zone: {sto: [3, 2], def: [0, 1], col: [2, 3], camp: [2], train: [2], lab: [2], work: [2], crew: [1], trap: [1, 2]}, tg: {sto: 9, def: 3.5, col: 7.5, camp: 7, train: 6.5, lab: 6.5, work: 6.5, crew: 4, trap: 5.5}},
    fort: {n: "Fortress", rings: [7, 5, 3], zone: {sto: [0], def: [0, 1], col: [0, 1], camp: [1], train: [1], lab: [1], work: [1], crew: [0], trap: [3, 2]}, tg: {sto: 2.7, def: 4, col: 4.8, camp: 5, train: 5, lab: 5, work: 5, crew: 3.5, trap: 8.5}}
  };
  X.PRESETS = PRESETS;
  var presetN = 0;
  X.applyPreset = function (key) {
    var P = PRESETS[key]; if (!P) return; if (raid) return;
    var snap = cc.bld.map(function (b) { return {id: b.id, x: b.x, y: b.y}; });
    var occ = []; for (var y = 0; y < N; y++) occ.push(new Array(N).fill(0));
    var seed = (++presetN) * 7919 + key.length * 131 + cc.bld.length; function r() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    var CEN = 11.5, pos = {};
    function free(x, y, w, h) { if (x < C.RING || y < C.RING || x + w > N - C.RING || y + h > N - C.RING) return false; for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if (occ[y + j][x + i]) return false; return true; }
    function mark(x, y, w, h) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) occ[y + j][x + i] = 1; }
    var core = cc.bld.filter(function (b) { return b.t === "core"; })[0]; if (core) { pos[core.id] = [10, 10]; mark(10, 10, C.B.core.w, C.B.core.h); }
    // fence rings
    var walls = cc.bld.filter(function (b) { return b.t === "wall"; }), left = walls.length, radii = [], wi = 0;
    P.rings.forEach(function (R) { if (left >= 8 * R) { radii.push(R); left -= 8 * R; } else { var m = Math.floor(left / 8); if (m >= 3 && radii.indexOf(m) < 0 && (!radii.length || m < Math.min.apply(null, radii) || m > Math.max.apply(null, radii))) { radii.push(m); left -= 8 * m; } } });
    if (!radii.length && left > 0) { radii.push(Math.max(3, Math.min(5, Math.floor(left / 8) || 3))); }
    radii.sort(function (a, b) { return a - b; });
    function ringTiles(R) { var t = []; for (var i = -R; i <= R; i++) { t.push([11 + i, 11 - R], [11 + i, 11 + R]); if (i > -R && i < R) t.push([11 - R, 11 + i], [11 + R, 11 + i]); } return t; }
    radii.forEach(function (R) { ringTiles(R).forEach(function (p) { if (wi < walls.length && free(p[0], p[1], 1, 1)) { pos[walls[wi].id] = [p[0], p[1]]; mark(p[0], p[1], 1, 1); wi++; } }); });
    // leftover fences: a short spur row just outside the outer ring so nothing is orphaned
    var outerR = radii.length ? radii[radii.length - 1] : 3;
    function band(cx0, cy0) { var d = Math.max(Math.abs(cx0 - CEN), Math.abs(cy0 - CEN)) - 0.5; var b = 0; for (var i = 0; i < radii.length; i++) if (d > radii[i] + 0.5 - 0.5) b = i + 1; return b; }
    // buildings
    var others = cc.bld.filter(function (b) { return b.t !== "core" && b.t !== "wall"; });
    var prio = {def: 0, sto: 1, crew: 2, col: 3, camp: 4, train: 4, lab: 4, work: 4, trap: 9}; others.sort(function (a, b) { var A = C.B[a.t], B = C.B[b.t]; return (prio[A.kind] - prio[B.kind]) || (B.w * B.h - A.w * A.h); });
    var placed = []; var fail = 0;
    others.forEach(function (b) {
      var d = C.B[b.t], k = d.kind, zone = P.zone[k] || [1], tg = P.tg[k] || 6, best = null, bs = 1e9;
      for (var y = C.RING; y + d.h <= N - C.RING; y++) for (var x = C.RING; x + d.w <= N - C.RING; x++) {
        if (!free(x, y, d.w, d.h)) continue; var cxx = x + d.w / 2, cyy = y + d.h / 2, dist = Math.hypot(cxx - CEN, cyy - CEN), bd = band(cxx, cyy);
        var sc = Math.abs(dist - tg) + r() * 0.7 + (zone.indexOf(Math.min(bd, radii.length)) < 0 ? 40 : 0);
        if (k === "def" || k === "trap") placed.forEach(function (q) { if (q.t === b.t || (k === "def" && q.k === "def")) { var dd = Math.hypot(q.cx - cxx, q.cy - cyy); if (dd < 3.5) sc += (3.5 - dd) * (k === "def" ? 0.8 : 0.5); } });
        if (sc < bs) { bs = sc; best = [x, y, cxx, cyy]; }
      }
      if (!best) { fail++; return; } pos[b.id] = [best[0], best[1]]; mark(best[0], best[1], d.w, d.h); placed.push({t: b.t, k: k, cx: best[2], cy: best[3]});
    });
    if (fail || wi < walls.length && false) { BB.sfx("deny"); X.toast("That layout does not fit your buildings. Nothing was moved."); return; }
    // leftover walls: free tiles on the ring just outside the outer fence, filled from the top
    for (; wi < walls.length; wi++) { var ok = false, R2 = outerR + 1; for (var k2 = 0; k2 < 3 && !ok; k2++) { var tl = ringTiles(R2 + k2); for (var q = 0; q < tl.length; q++) { if (free(tl[q][0], tl[q][1], 1, 1)) { pos[walls[wi].id] = [tl[q][0], tl[q][1]]; mark(tl[q][0], tl[q][1], 1, 1); ok = true; break; } } } if (!ok) { pos[walls[wi].id] = null; } }
    cc.prevLayout = snap; cc.bld.forEach(function (b) { var p = pos[b.id]; if (p) { b.x = p[0]; b.y = p[1]; } });
    V.sel = null; V.analysis = null; X.selBar(); BB.sfx("upgrade"); BB.track("cc_preset", {k: key, rings: radii.length}); X.checkFences(); X.save();
    X.toast(P.n + " layout applied (" + radii.length + " fence ring" + (radii.length === 1 ? "" : "s") + "). You can undo it.");
  };
  X.undoLayout = function () {
    if (!cc.prevLayout) { X.toast("Nothing to undo"); return; } var m = {}; cc.prevLayout.forEach(function (p) { m[p.id] = p; });
    cc.bld.forEach(function (b) { var p = m[b.id]; if (p) { b.x = p.x; b.y = p.y; } }); cc.prevLayout = null; V.analysis = null; BB.sfx("click"); X.save(); X.toast("Layout restored");
  };

  // ---------- async defence raids ----------
  function defBase(noLoot) {
    var barns = done("barn"), silos = done("silo"), lc = Math.min(S.coins * 0.5, C.LOOTC[X.coreL() - 1][1]), ls = Math.min(S.salv * 0.5, C.LOOTS[X.coreL() - 1][1]); if (noLoot) { lc = 0; ls = 0; }
    var bld = cc.bld.filter(function (b) { return b.l >= 1; }).map(function (b) {
      var o = {t: b.t, x: b.x, y: b.y, l: b.l}, d = C.B[b.t];
      if (d.kind === "sto" && d.res === "c") o.lc = Math.floor(lc / Math.max(1, barns.length)); if (d.kind === "sto" && d.res === "s") o.ls = Math.floor(ls / Math.max(1, silos.length));
      if (d.kind === "col") { if (d.res === "c") o.lc = noLoot ? 0 : Math.floor(b.st || 0); else o.ls = noLoot ? 0 : Math.floor(b.st || 0); } return o; });
    return {seed: 1, fh: X.coreL(), name: "Your base", bld: bld, theme: "p", crewUnits: JSON.parse(JSON.stringify(cc.crew.units))};
  }
  X.defBase = defBase;
  function aiArmy(fh, r) {
    var a = [{slinger: 8, bruiser: 1}, {slinger: 14, bruiser: 3, roller: 2}, {slinger: 22, bruiser: 5, roller: 4, drone: 3}, {slinger: 30, bruiser: 8, roller: 6, drone: 5, hero: 1}][Math.min(4, fh) - 1], o = {};
    if (fh > 4) { var g = Math.pow(1.3, fh - 4); a = {slinger: 30 * g, bruiser: 8 * g, roller: 6 + (fh - 4), drone: 5 * g, hero: 1, chick: 12 * g}; if (fh >= 4) a.sow = 2; if (fh >= 5) { a.hound = 3; a.mule = 3; } if (fh >= 6) { a.spinner = 3; a.wrench = 2; } if (fh >= 7) a.badger = 3; if (fh >= 8) a.kestrel = 3; }
    else if (fh >= 3) { a.sow = 1; a.hound = 2; }
    for (var k in a) o[k] = Math.max(1, Math.round(a[k] * (0.7 + r() * 0.5))); return o;
  }
  X.simDefense = function (seedIn) {
    var now = Date.now(), seed = seedIn || (now % 100000 + 17), r = C.rng(seed), fh = X.coreL(), army = aiArmy(fh, r), script = Sim.aiScript(seed, army), base = defBase();
    var sim = Sim.create(base, {script: script, ulv: {}, heroLvl: Math.min(10, fh * 2), crewUnits: null}); sim.crewList = base.crewUnits; var res = sim.run(); var st = res.stars, pct = res.pct;
    var lc = Math.min(S.coins, res.loot.c), ls = Math.min(S.salv, res.loot.s); S.coins -= lc; S.salv -= ls;
    var tl = st === 0 ? 0 : Math.min(cc.trophies, 8 + st * 6 + Math.min(fh, 6) * 2), tg = st === 0 ? 8 : 0; cc.trophies = Math.max(0, cc.trophies - tl + tg);
    if (st >= 1) { cc.shield = Math.max(cc.shield, now + (st === 3 ? 16 : pct >= 50 ? 12 : 8) * 3600000 / mul() * 1); } else stat("held");
    var e = {ts: now, att: FAKE[seed % FAKE.length], aseed: seed, stars: st, pct: pct, lc: lc, ls: ls, tl: tl, tg: tg, held: st === 0, fh: fh, base: base, script: script, army: army};
    cc.log.unshift(e); cc.log = cc.log.slice(0, 8); cc.unseen++; BB.track("cc_defense", {stars: st, pct: pct, lc: lc, ls: ls}); X.save(); return e;
  };
  function maybeAsyncRaid() {
    var now = Date.now(); if (now < cc.nextRaid || raid || V.ghost) return; if (cc.shield > now) { cc.nextRaid = now + 5 * 60000 / mul(); return; }
    if (cc.guard > now) { cc.nextRaid = now + 3 * 60000 / mul(); return; }
    if (!(cc.stats.attacks >= 1)) { cc.nextRaid = now + 3 * 60000 / mul(); return; }
    cc.nextRaid = now + (7 + Math.random() * 12) * 60000 / mul(); var e = X.simDefense(); X.toast(e.held ? "A raid on your ranch was beaten back!" : e.att + " raided your ranch! Check the LOG.");
  }
  X.offlineRaids = function () {
    var now = Date.now(), away = (now - cc.last) / 60000; cc.last = now; if (!(cc.stats.attacks >= 1) || away < 6) return 0; var n = Math.min(3, Math.floor(away / 15)), made = 0;
    for (var i = 0; i < n; i++) { if (cc.shield > now || cc.guard > now) break; X.simDefense((now % 90000) + i * 977); made++; }
    cc.nextRaid = now + 10 * 60000 / mul(); return made;
  };

  // ---------- raid flow ----------
  X.raidOn = function () { return raid; };
  X.findRaid = function (rnd) {
    var fh = X.coreL(), fee = 40 * fh; if (S.coins < fee) { BB.sfx("deny"); X.toast("Need " + fee + " coins to scout a raid"); return; }
    if (!C.UORDER.some(function (k) { return cc.army[k] > 0; }) && !(cc.heroHp > 0.2)) { BB.sfx("deny"); X.toast("Train some troops first (ARMY)"); return; }
    S.coins -= fee; var b = G.find(fh, cc.trophies, rnd || Math.random, raid && raid.base ? raid.base.seed : 0); b.tw = 18 + Math.min(fh, 8) * 6; b.tl = 10 + Math.min(fh, 8) * 3; b.loot = b; applyGap(b, fh); BB.track("cc_find_raid", {fh: fh}); X.startScout(b, "find");
  };
  // loot scales with the Core level gap (lower targets pay less, higher targets pay a bit more)
  function applyGap(b, mine) { var gm = C.gapMul(mine, b.fh || mine); b.gapm = gm; if (gm !== 1) b.bld.forEach(function (x) { if (x.lc) x.lc = Math.round(x.lc * gm); if (x.ls) x.ls = Math.round(x.ls * gm); }); }
  X.startStory = function (i) {
    var sd = C.STORY[i - 1]; if (sd.fh > X.coreL()) { BB.sfx("deny"); X.toast("Needs Homestead Core L" + sd.fh); return; } var b = G.story(i); b.tw = 0; b.tl = 0; X.startScout(b, "story", i);
  };
  X.startRevenge = function (e) { var b = G.attackerBase(e.aseed, e.fh); b.name = "Revenge: " + b.name; b.tw = 20 + Math.min(e.fh, 8) * 6; b.tl = 8; applyGap(b, X.coreL()); X.startScout(b, "revenge"); };
  X.startScout = function (base, kind, mi) {
    X.close(); X.closePanel(); V.ghost = null; V.paint = null; V.sel = null; var sim = Sim.create(base, {ulv: cc.ulv, heroLvl: S.lvl, heroHp: cc.heroHp, heroId: X.heroId(), cap: C.RAID_SEC});
    if (base.crewUnits) sim.crewList = base.crewUnits;
    raid = {base: base, kind: kind, mi: mi || 0, sim: sim, phase: "scout", sel: null, rec: [], acc: 0, speed: 1, hero: false, hpHero: null, dep: {}, lastDep: 0, army: cc.army, spl: cc.spells};
    if (kind === "practice") { raid.army = practiceArmy(); raid.spl = practiceSpells(); raid.noHero = true; }
    V.showHeat = false; V.analysis = null; V.showRanges = false;
    document.body.classList.add("raiding"); $("base").classList.add("m-raid"); V.mode = "raid"; V.setTheme(base.theme === "a" ? "a" : "p"); V.sim = sim; V.scout = true; V.showDeploy = false; V.parts = []; V.projs = []; V.rings = []; V.floats = []; V.rubble = [];
    $("b-sel").classList.add("hidden"); scoutHTML(); raidHud(); BB.sfx("click"); if (BB.FX) { BB.FX.camReset(); BB.FX.scoutPan(base.name, kind === "story" ? raid.mi : 0); BB.FX.hudOn = false; } BB.music && BB.music("raid");
  };
  function lootOf(b) { var c = 0, s = 0; b.bld.forEach(function (x) { c += x.lc || 0; s += x.ls || 0; }); return [c, s]; }
  function threat(i) { var n = Math.min(5, 1 + Math.floor((i + 1) / 2)), t = ""; for (var k = 0; k < 5; k++) t += k < n ? '<i class="on"></i>' : "<i></i>"; return t; }
  function scoutHTML() {
    var b = raid.base, l = lootOf(b), el = $("r-scout"), fh = X.coreL(), sd = raid.kind === "story" ? C.STORY[raid.mi - 1] : null;
    el.classList.remove("hidden");
    el.innerHTML = '<div class="sc-name"><b>' + b.name + "</b><small>" + (sd ? "Campaign " + raid.mi + "/10 &middot; " + sd.desc : (raid.kind === "practice" ? "Practice raid on your own base &middot; no loot, no trophies" : "Alien outpost &middot; Core L" + b.fh + (b.gapm && b.gapm !== 1 ? " &middot; loot x" + b.gapm.toFixed(2) + (b.gapm < 1 ? " (lower Core)" : " (higher Core bonus)") : ""))) + "</small></div>" +
      '<div class="sc-loot"><span><i class="ico coin"></i>' + X.fmt(l[0]) + '</span><span><i class="ico salv"></i>' + X.fmt(l[1]) + "</span>" + (raid.kind !== "story" && raid.kind !== "practice" ? '<span class="tw">\u25B2 +' + b.tw + ' \u25BC -' + b.tl + "</span>" : "") + "</div>" +
      '<div class="sc-btns">' + (raid.kind === "find" ? '<button class="btn sec" id="sc-next">NEXT <small>' + 40 * fh + "c</small></button>" : "") + '<button class="btn sec" id="sc-back">BACK</button><button class="btn" id="sc-go">ATTACK!</button></div>' + (sd ? '<div class="sc-threat">THREAT <b>' + threat(raid.mi) + "</b></div>" : "") + '<div class="sc-hint">Scout the base: red circles show defense range. Look for gaps, walls, and the crew barn.</div>';
    $("sc-back").onclick = function () { leaveRaid(true); }; $("sc-go").onclick = beginRaid; if (cc.tut === 1 && BB.FX) setTimeout(function () { if (raid && raid.phase === "scout" && cc.tut === 1) BB.FX.arrow($("sc-go"), "Tap ATTACK!"); }, 1700); var n = $("sc-next"); if (n) n.onclick = function () { var old = raid.base.seed; leaveRaid(true); X.findRaid(); };
  }
  function beginRaid() {
    if (BB.FX) BB.FX.arrowOff();
    raid.phase = "fight"; V.scout = false; V.showDeploy = true; $("r-scout").classList.add("hidden"); raid.sim.started = false; raid.sim.allDeployed = false; if (raid.kind !== "practice") { cc.stats.attacks = (cc.stats.attacks || 0) + 1; stat("attacks", 0); if (!(cc.shield > Date.now())) cc.guard = Date.now() + C.GUARD_MIN * 60000 / mul(); } BB.track("cc_raid_start", {kind: raid.kind, mi: raid.mi, fh: raid.base.fh});
    var first = null; C.UORDER.forEach(function (k) { if (!first && raid.army[k] > 0) first = {t: "u", k: k}; }); raid.sel = first || (cc.heroHp > 0.2 && !raid.noHero ? {t: "h", k: "hero"} : null); raid.army0 = JSON.parse(JSON.stringify(raid.army)); raid.spells0 = JSON.parse(JSON.stringify(raid.spl));
    raid.t0 = performance.now(); raid.hpHero = cc.heroHp; raidBar(); raidHud(); BB.sfx("click"); if (BB.FX) { BB.FX.hudOn = !raid.replay; BB.FX.banner("RAID!", "#ff8a3a", "Tap the glowing edge to deploy", {big: true}); BB.sfx("roar"); BB.vibe([25, 30, 45]); BB.FX.shake(3); if (cc.tut === 1 || cc.tut === 2) { cc.tut = 2; setTimeout(function () { var b0 = document.querySelector("#r-bar .tb[data-t]:not(.zero)"); if (b0 && raid && cc.tut === 2) BB.FX.arrow(b0, "Pick a troop, then tap the yellow edge"); }, 600); } }
  }
  function leaveRaid(refund) {
    var wasReplay = raid && raid.replay; raid = null; V.sim = null; V.mode = "base"; V.scout = false; V.showDeploy = false; V.showHeat = false; V.setTheme("p"); document.body.classList.remove("raiding"); $("base").classList.remove("m-raid"); $("r-scout").classList.add("hidden"); $("r-bar").innerHTML = "";
    X.close(); V.parts = []; V.rings = []; V.projs = []; V.floats = []; if (BB.FX) { BB.FX.camReset(); BB.FX.hudOn = false; BB.FX.clearAll(); } BB.music && BB.music("base"); X.hud(); X.selBar(); X.save(); if (cc.tut === 3 && BB.FX) setTimeout(function () { BB.FX.arrow($("b-goal"), "Your next step"); }, 900);
  }
  X.leaveRaid = leaveRaid;
  function troopBtn(k, t) {
    var n = t === "u" ? raid.army[k] || 0 : t === "s" ? raid.spl[k] || 0 : (cc.heroHp > 0.2 && !raid.hero && !raid.noHero ? 1 : 0), art = t === "u" ? C.U[k].art : t === "h" ? X.hero().port : null, sel = raid.sel && raid.sel.t === t && raid.sel.k === k;
    var ic = t === "s" ? '<i class="sp" style="background:' + C.SP[k].col + '"></i>' : '<img src="assets/' + art + '.webp" alt="">'; if (!n && t !== "h") return ""; if (t === "h" && raid.noHero) return "";
    return '<button class="tb' + (sel ? " sel" : "") + (n ? "" : " zero") + '" data-t="' + t + '" data-k="' + k + '">' + ic + "<b>" + (t === "h" ? "HERO" : t === "s" ? (C.SP[k].short || C.SP[k].name.split(" ")[0]) + " " + n : "x" + n) + "</b></button>";
  }
  function raidBar() {
    if (!raid || raid.replay) { $("r-bar").innerHTML = ""; return; } var h = "";
    C.UORDER.forEach(function (k) { h += troopBtn(k, "u"); }); h += troopBtn("hero", "h"); C.SPORDER.forEach(function (k) { h += troopBtn(k, "s"); });
    if (raid.hero) h += '<button class="tb ab" id="r-ab"><i class="sp" style="background:' + (X.heroId() === "scx" ? "#46e6d2" : "#ffb531") + '"></i><b>SURGE</b></button>';
    $("r-bar").innerHTML = h; [].forEach.call($("r-bar").querySelectorAll(".tb[data-t]"), function (b) { b.onclick = function () { raid.sel = {t: b.dataset.t, k: b.dataset.k}; BB.sfx("click"); raidBar(); }; });
    var ab = $("r-ab"); if (ab) ab.onclick = function () { if (raid.sim.ability()) { raid.rec.push({t: +raid.sim.t.toFixed(2), k: "ability"}); BB.sfx(X.heroId() === "scx" ? "crows" : "ult"); ab.classList.add("zero"); } };
  }
  function fmtClock(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function raidHud() {
    if (!raid) return; var s = raid.sim, left = raid.phase === "scout" ? C.RAID_SEC : C.RAID_SEC - s.t; if (raid.replay) left = C.RAID_SEC - s.t;
    $("r-timer").textContent = (raid.phase === "scout" ? "Scouting" : fmtClock(left));
    var pt = s.pct + "%", pe = $("r-pct"); if (raid._pt !== pt) { var up = raid._pt !== undefined; raid._pt = pt; pe.textContent = pt; if (up && BB.FX) BB.FX.bump(pe); }
    var pb = $("r-pbar"); if (pb) { var pi = pb.firstChild; if (pi) pi.style.width = Math.min(100, s.pct) + "%"; pb.classList.toggle("h1", s.pct >= 50); pb.classList.toggle("h2", s.pct >= 100); }
    if (raid._st !== s.stars) {
      var gained = raid._st !== undefined && s.stars > raid._st; raid._st = s.stars; var st = ""; for (var i = 0; i < 3; i++) st += '<img class="' + (gained && i === s.stars - 1 ? "pop" : "") + '" src="assets/' + (i < s.stars ? "ui_star" : "ui_star_off") + '.webp" alt="">'; $("r-stars").innerHTML = st;
      if (gained && BB.FX) { BB.sfx("star2", s.stars); BB.vibe([20, 30, 40]); BB.FX.starBurst($("r-stars").children[s.stars - 1]); BB.FX.banner(s.stars === 3 ? "THREE STARS!" : s.stars === 2 ? "CORE DOWN!" : "ONE STAR!", "#ffd35a", "", {big: s.stars === 3}); if (s.stars === 3) { BB.FX.confetti(innerWidth / 2, innerHeight * 0.4, 60, true); BB.FX.flash("#fff1b0", 0.4); } }
    }
    var ld = raid._ld || (raid._ld = {c: 0, s: 0}); ld.c += (s.loot.c - ld.c) * 0.4; ld.s += (s.loot.s - ld.s) * 0.4; if (Math.abs(s.loot.c - ld.c) < 1) ld.c = s.loot.c; if (Math.abs(s.loot.s - ld.s) < 1) ld.s = s.loot.s;
    var lh = '<span><i class="ico coin"></i>+' + X.fmt(Math.round(ld.c)) + '</span><span><i class="ico salv"></i>+' + X.fmt(Math.round(ld.s)) + "</span>"; if (lh !== raid._lh) { raid._lh = lh; $("r-loot").innerHTML = lh; }
    $("r-end").style.display = raid.phase === "fight" || raid.replay ? "" : "none"; $("r-end").textContent = raid.replay ? "CLOSE" : raid.kind === "practice" ? "END TEST" : "END BATTLE"; $("r-speed").style.display = raid.phase === "fight" || raid.replay ? "" : "none"; $("r-speed").textContent = "x" + raid.speed;
    var rw = $("r-win"); if (rw) { var tt = raid.phase === "scout" ? 0 : s.t, hw = ""; C.WINDOWS.forEach(function (w, i) { var act = tt >= w.a && tt < w.b, pc = Math.max(0, Math.min(1, (tt - w.a) / (w.b - w.a))); hw += '<span class="' + (act ? "on" : tt >= w.b ? "past" : "") + '" style="flex:' + (w.b - w.a) + '"><i style="width:' + Math.round(pc * 100) + '%"></i><b>' + w.n + "</b></span>"; }); if (hw !== X._wh) { X._wh = hw; rw.innerHTML = hw; } rw.style.display = raid.phase === "scout" ? "none" : ""; }
    $("r-star1").className = s.pct >= 50 ? "on" : ""; $("r-star2").className = s.coreDead ? "on" : ""; $("r-star3").className = s.pct >= 100 ? "on" : "";
  }
  var denyAt = 0;
  X.raidTap = function (x, y, first) {
    if (!raid || raid.phase !== "fight" || raid.replay || raid.sim.done || !raid.sel) return; var s = raid.sim, sel = raid.sel, now = performance.now();
    if (sel.t === "s") { if (!first) return; if (x < 0 || y < 0 || x > N || y > N) return; if ((raid.spl[sel.k] || 0) < 1) return; s.spell(sel.k, x, y); if (BB.FX) BB.FX.spell(sel.k, x, y); raid.rec.push({t: +s.t.toFixed(2), s: 1, k: sel.k, x: +x.toFixed(2), y: +y.toFixed(2)}); raid.spl[sel.k]--; BB.sfx("ult"); V.ring(x, y, 3, C.SP[sel.k].col); if (!raid.spl[sel.k]) { raid.sel = null; } raidBar(); startClock(); return; }
    if (!first && now - raid.lastDep < 85) return; var cx = Math.max(0.5, Math.min(N - 0.5, x)), cy = Math.max(0.5, Math.min(N - 0.5, y));
    if (!s.canDeploy(cx, cy)) { if (first && now - denyAt > 1200) { denyAt = now; X.toast("Deploy troops from the edge, outside the plot"); BB.sfx("deny"); } return; }
    raid.lastDep = now; if (BB.FX) { BB.FX.deployRing(cx, cy, sel.t === "h"); BB.vibe(6); } var jx = (Math.random() - 0.5) * 0.5, jy = (Math.random() - 0.5) * 0.5;
    if (sel.t === "u") { if ((raid.army[sel.k] || 0) < 1) return; var u = s.deploy(sel.k, cx + jx, cy + jy); if (!u) return; raid.rec.push({t: +s.t.toFixed(2), k: sel.k, x: +(cx + jx).toFixed(2), y: +(cy + jy).toFixed(2)}); raid.army[sel.k]--; raid.dep[sel.k] = (raid.dep[sel.k] || 0) + 1; BB.sfx("shoot"); if (cc.tut === 2) { cc.tut = 3; BB.FX && BB.FX.arrowOff(); } if (!raid.army[sel.k]) { raid.sel = null; C.UORDER.forEach(function (k) { if (!raid.sel && raid.army[k] > 0) raid.sel = {t: "u", k: k}; }); raidBar(); } else raidBar(); }
    else if (sel.t === "h") { if (raid.hero || cc.heroHp <= 0.2) return; var h = s.deploy("hero", cx, cy, {lvl: S.lvl, hpFrac: cc.heroHp, hid: X.heroId()}); if (!h) return; raid.hero = h; raid.rec.push({t: +s.t.toFixed(2), k: "hero", x: +cx.toFixed(2), y: +cy.toFixed(2)}); BB.sfx("roar"); if (BB.FX) BB.FX.heroEntrance(cx, cy, X.heroId()); raid.sel = null; C.UORDER.forEach(function (k) { if (!raid.sel && raid.army[k] > 0) raid.sel = {t: "u", k: k}; }); raidBar(); }
    startClock();
  };
  X.puTap = function (id) { if (!raid || raid.phase !== "fight" || raid.replay || raid.sim.done) return; if (raid.sim.collectPU(id) !== false) { raid.rec.push({t: +raid.sim.t.toFixed(2), k: "pu", id: id}); startClock(); BB.vibe(12); } };
  X.psTap = function () { if (!raid || raid.phase !== "fight" || raid.replay || raid.sim.done) return; if (raid.sim.psurge()) { raid.rec.push({t: +raid.sim.t.toFixed(2), k: "ps"}); startClock(); } else BB.sfx("deny"); };
  var upc = {t: 0, ids: {}};
  X.upReady = function (b) { var now = performance.now(); if (now - upc.t > 700) { upc.t = now; upc.ids = {}; if (!raid && X.freeTinker() > 0) cc.bld.forEach(function (q) { if (!q.up && q.l >= 1 && q.t !== "wall" && q.t !== "trap" && canUp(q) === true) upc.ids[q.id] = 1; }); } return upc.ids[b.id]; };
  function startClock() { if (raid && !raid.clock) { raid.clock = true; } }
  X.raidUp = function () { if (raid && raid.phase === "fight" && !raid.replay) { var left = C.UORDER.some(function (k) { return raid.army[k] > 0; }) || (cc.heroHp > 0.2 && !raid.hero && !raid.noHero); raid.sim.allDeployed = !left; } };
  X.endBattle = function () { if (!raid) return; if (raid.replay) { leaveRaid(); return; } if (raid.phase === "fight") { raid.sim.done = true; raid.sim.why = "surrender"; finishRaid(); } };
  function finishRaid() {
    var s = raid.sim, r = s.result(), kind = raid.kind, base = raid.base, st = r.stars, win = st >= 1; raid.phase = "done"; V.showDeploy = false; V.showHeat = true;
    // hero hp
    if (raid.hero) { cc.heroHp = raid.hero.dead || raid.hero.hp <= 0 ? 0 : Math.max(0.05, raid.hero.hp / raid.hero.mx); cc.heroT = Date.now(); }
    if (kind === "practice") {
      V.showHeat = true; cc.lastRaid = {base: base, script: raid.rec, ulv: cc.ulv, heroLvl: S.lvl, heroId: X.heroId(), heroHp: 1, kind: "practice", mi: 0, army: raid.army0}; BB.track("cc_practice_end", {stars: st, pct: r.pct, sec: r.t, n: r.funnel.n}); stat("practice"); BB.sfx(win ? "stingwin" : "stinglose"); X.save();
      showResults(r, [0, 0], 0, "Practice only: no loot, no trophies, no troops spent.", false, 1); return;
    }
    var firstClear = false, rewards = "", lootMul = 1;
    if (kind === "story") { var prev = cc.story[raid.mi] || 0, hadX = X.heroUnlocked("scx"); if (st > prev) cc.story[raid.mi] = st; if (win && !prev) { firstClear = true; var gem = 6 + raid.mi * 2; give(0, 0, gem); rewards = "First clear bonus: +" + gem + " gems"; } if (!hadX && X.heroUnlocked("scx")) { rewards += (rewards ? ". " : "") + "NEW HERO: Scarecrow-X unlocked! Pick him in the HERO tab."; BB.track("cc_hero_unlock", {id: "scx"}); } else lootMul = 0.5; }
    var got = addCapped(Math.round(r.loot.c * lootMul), Math.round(r.loot.s * lootMul)), td = 0;
    if (kind !== "story") { td = win ? Math.min(base.tw + (st - 1) * 3, 60) : -base.tl; if (cc.trophies + td < 0) td = -cc.trophies; cc.trophies += td; }
    if (win) { stat("win"); stat("stars", st); } stat("bdest", r.bdest); if (r.defDest) stat("defs", r.defDest); cc.stats.trophies = Math.max(cc.stats.trophies || 0, cc.trophies);
    cc.pass.pts += 10 + st * 8; cc.lastRaid = {base: base, script: raid.rec, ulv: cc.ulv, heroLvl: S.lvl, heroId: X.heroId(), heroHp: raid.hpHero, kind: kind, mi: raid.mi, army: raid.army0}; cc.rep.unshift({ts: Date.now(), name: base.name, stars: st, pct: r.pct, kind: kind}); cc.rep = cc.rep.slice(0, 5);
    BB.track("cc_raid_end", {kind: kind, mi: raid.mi, stars: st, pct: r.pct, lc: r.loot.c, sec: r.t, why: r.why, td: td}); BB.sfx(win ? "stingwin" : "stinglose"); X.save();
    showResults(r, got, td, rewards, firstClear, lootMul);
  }
  function funnelHTML(f) {
    if (!f || !f.lines || !f.lines.length) return "";
    return '<div class="card funnel"><h4>Lane report</h4><small>' + f.lines.join("<br>") + "</small></div>";
  }
  X.funnelHTML = funnelHTML;
  function starRow(n) { var s = ""; for (var i = 0; i < 3; i++) s += '<img class="bs' + (i < n ? " on pop" : "") + '" src="assets/' + (i < n ? "ui_star" : "ui_star_off") + '.webp" alt="">'; return s; }
  function resultFx(r, got, td, rewards, lootMul) {
    var F = BB.FX; if (!F) return; var win = r.stars >= 1, vals = document.querySelectorAll("#modal .loot span, .modal .loot span");
    BB.vibe(win ? [40, 50, 40, 50, 90] : [160]);
    [].forEach.call(document.querySelectorAll(".bigstars2 img"), function (im, i) { if (!im.classList.contains("on")) return; im.style.animationDelay = (0.25 + i * 0.4) + "s"; setTimeout(function () { if (!im.isConnected) return; BB.sfx("star2", i + 1); BB.vibe(18); F.starBurst(im); }, 250 + i * 400); });
    if (r.stars === 3) setTimeout(function () { F.confetti(innerWidth / 2, innerHeight * 0.38, 90, true); F.confetti(innerWidth * 0.2, innerHeight * 0.5, 40, true); F.confetti(innerWidth * 0.8, innerHeight * 0.5, 40, true); F.flash("#fff1b0", 0.45); BB.sfx("fanfare"); }, 1300);
    var tgt = {1: [got[0], function (v) { return "+" + X.fmt(v) + (lootMul < 1 ? " (repeat: half)" : ""); }], 3: [got[1], function (v) { return "+" + X.fmt(v); }], 5: [td, function (v) { return (v >= 0 ? "+" : "") + v; }]};
    [1, 3, 5].forEach(function (i) { var el = vals[i], t = tgt[i]; if (!el || !t || raid.kind === "practice") return; el._cv = 0; setTimeout(function () { if (el.isConnected) F.count(el, t[0], 1000, t[1], true); }, 500 + i * 120); });
    if (/NEW HERO/.test(rewards || "")) setTimeout(function () { F.levelUp("HERO UNLOCKED!", "Scarecrow-X joins your farm"); }, 1800);
  }
  function showResults(r, got, td, rewards, firstClear, lootMul) {
    var win = r.stars >= 1, kind = raid.kind, L = C.league(cc.trophies), boss = raid.base.boss;
    var h = '<h1 class="' + (win ? "win" : "lose") + '">' + (kind === "practice" ? "PRACTICE RESULT" : win ? (r.stars === 3 ? "TOTAL VICTORY!" : "RAID WON!") : "RAID FAILED") + '</h1><div class="bigstars2">' + starRow(r.stars) + '</div><div class="muted" style="text-align:center">' + raid.base.name + " &middot; " + r.pct + "% destroyed" + (r.coreDead ? " &middot; Core down" : "") + '</div>' + (kind === "practice" ? "" : '<div class="loot"><span>Coins looted</span><span>+' + X.fmt(got[0]) + (lootMul < 1 ? " (repeat: half)" : "") + "</span><span>Salvage looted</span><span>+" + X.fmt(got[1]) + "</span>" + (kind !== "story" ? "<span>Trophies</span><span>" + (td >= 0 ? "+" : "") + td + "</span><span>League</span><span>" + L.n + " (" + cc.trophies + ")</span>" : "") + (raid.base.gapm && raid.base.gapm !== 1 ? "<span>Core gap</span><span>loot x" + raid.base.gapm.toFixed(2) + "</span>" : "") + "</div>") + (rewards ? '<div class="muted" style="text-align:center;color:#ffd77a">' + rewards + "</div>" : "");
    h += funnelHTML(r.funnel);
    if (got[0] < Math.round(r.loot.c * lootMul) - 1 && kind !== "practice") h += '<div class="muted" style="text-align:center">Storage was full: some loot was lost.</div>';
    var btns = '<button class="btn sec" id="rs-home">HOME</button><button class="btn sec" id="rs-rep">REPLAY</button>';
    if (boss && win) btns += '<button class="btn blue" id="rs-duel">DUEL VORLAX!</button>'; else if (kind === "story" && win && raid.mi < 10) btns += '<button class="btn" id="rs-next">NEXT MISSION</button>'; else if (kind === "find") btns += '<button class="btn" id="rs-again">FIND ANOTHER</button>'; else if (kind === "practice") btns += '<button class="btn" id="rs-prac">TRY AGAIN</button>';
    X.modal(h + '<div class="btns">' + btns + "</div>", "res"); var mi = raid.mi, kd = kind, base = raid.base;
    resultFx(r, got, td, rewards, lootMul);
    $("rs-home").onclick = function () { if (BB.FX && kd !== "practice") { X._cntDelay = performance.now() + 750; leaveRaid(); BB.FX.flyScreen(innerWidth / 2, innerHeight * 0.45, "c", 8, got[0]); BB.FX.flyScreen(innerWidth / 2 + 30, innerHeight * 0.5, "s", 5, got[1]); } else leaveRaid(); }; $("rs-rep").onclick = function () { X.watchLast(); };
    var d = $("rs-duel"); if (d) d.onclick = function () { leaveRaid(); BB.fromCC = true; $("base").classList.remove("active"); BB.UI.startBattle(10); };
    var n = $("rs-next"); if (n) n.onclick = function () { leaveRaid(); X.startStory(mi + 1); }; var a = $("rs-again"); if (a) a.onclick = function () { leaveRaid(); X.findRaid(); }; var pr = $("rs-prac"); if (pr) pr.onclick = function () { leaveRaid(); X.startPractice(); };
  }
  X.watchLast = function () { if (cc.lastRaid) X.watch(cc.lastRaid); };
  X.watch = function (rp) {
    X.close(); if (raid) { leaveRaid(); } var base = rp.base; var sim = Sim.create(base, {script: rp.script, ulv: rp.ulv || {}, heroLvl: rp.heroLvl || 1, heroId: rp.heroId, heroHp: rp.heroHp, cap: C.RAID_SEC}); if (rp.crew || base.crewUnits) sim.crewList = base.crewUnits || null;
    raid = {base: base, kind: "replay", sim: sim, phase: "fight", replay: true, speed: 1, rec: [], dep: {}, acc: 0}; document.body.classList.add("raiding"); $("base").classList.add("m-raid"); V.mode = "raid"; V.setTheme(base.theme === "a" ? "a" : "p"); V.sim = sim; V.scout = false; V.showDeploy = false; V.showHeat = false; V.parts = []; V.projs = []; V.rings = []; V.floats = [];
    $("b-sel").classList.add("hidden"); $("r-scout").classList.add("hidden"); $("r-bar").innerHTML = ""; raidHud();
  };
  // ---------- main loop ----------
  var last = 0;
  function frame(ts) {
    requestAnimationFrame(frame); var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; if (!$("base").classList.contains("active")) return;
    if (!V.ready()) { V.draw(); return; } var tsc = BB.FX ? BB.FX.step(dt) : 1;
    if (raid && (raid.phase === "fight" || raid.replay) && !raid.sim.done) {
      var q = new URLSearchParams(location.search), fast = +(q.get("fast") || 1) * (window.__ccFast || 1); raid.acc += dt * raid.speed * fast * tsc; var n = 0, sim = raid.sim;
      while (raid.acc >= sim.dt && n < 40 * Math.max(1, fast) && !sim.done) { raid.acc -= sim.dt; if (raid.phase === "fight" && (sim.started || raid.replay || sim.t > 0 || raid.clock)) sim.step(sim.dt); n++; if (sim.done) break; }
      if (!raid.clock && !raid.replay) raid.acc = 0;
      if (sim.done && !raid.replay) { finishRaid(); } else if (sim.done && raid.replay && !raid.shown) { raid.shown = 1; V.showHeat = true; X.toast("Replay finished"); X.modal('<h1 class="win" style="font-size:20px">REPLAY SUMMARY</h1><div class="muted" style="text-align:center">' + sim.pct + "% &middot; " + sim.stars + ' star' + (sim.stars === 1 ? "" : "s") + "</div>" + funnelHTML(S2.funnel(sim)) + '<div class="btns"><button class="btn sec" id="m-no">WATCH THE MAP</button><button class="btn" id="m-cl">CLOSE REPLAY</button></div>'); $("m-no").onclick = X.close; $("m-cl").onclick = function () { X.close(); leaveRaid(); }; }
    }
    if (raid && raid.sim && raid.sim.done && raid.replay === undefined && raid.phase === "fight") finishRaid();
    V.update(dt); V.draw(); if (raid) { if (((performance.now() / 100) | 0) !== X._rh) { X._rh = (performance.now() / 100) | 0; raidHud(); } }
  }
  X.show = function () { $("home").classList.remove("active"); $("battle").classList.remove("active"); $("base").classList.add("active"); V.resize(); X.hud(); X.selBar(); };
  X.init = function () {
    X.ensure(); V.init($("bcv")); V.cb.tap = X.tapAt; V.cb.ghostMove = X.ghostMove; V.cb.paintAt = X.paintAt; V.cb.paintEnd = function () { X.save(); }; V.cb.raidTap = X.raidTap; V.cb.raidUp = X.raidUp; V.cb.bubble = X.bubble; V.cb.sfx = function (n) { BB.sfx(n); };
    V.cb.audio = function () { BB.audioInit && BB.audioInit(); }; V.cb.puTap = X.puTap; V.cb.upReady = X.upReady; if (BB.FX) { BB.FX.init(); BB.FX.cb = {ps: X.psTap}; } BB.music && BB.music("base"); V.cb.toast = X.toast; V.base = cc.bld; V.mode = "base";
    var missed = X.offlineRaids(); if (cc.tut === 0 && BB.FX) setTimeout(function () { if (cc.tut === 0 && !raid) BB.FX.arrow($("btn-attack"), "Your first raid! Tap ATTACK"); }, 700); X.hud(); X.bind(); setInterval(X.tick, 1000); requestAnimationFrame(frame); window.__cc = {X: X, V: V, cc: function () { return cc; }, raid: function () { return raid; }};
    if (X.afterInit) X.afterInit(missed);
  };
  X.setSpeed = function () { if (raid) { raid.speed = raid.speed === 1 ? 2 : raid.speed === 2 ? 3 : 1; } };
  X.raidInfo = function () { return raid; };
})();
