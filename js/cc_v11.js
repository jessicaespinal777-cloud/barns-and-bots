"use strict";
// ---- v0.11: Roll Call presets, Lockbox + At Risk bar, obstacles, Beginner Shield, daily loss cap ----
// All names and art here are original. Everything is stored on the existing cc save object (bb_save_v1) as optional fields, so v0.10 saves load unchanged.
(function () {
  var C = BB.CC, S = BB.S, X = BB.CCUI, V = BB.CCV;
  var $ = function (id) { return document.getElementById(id); };
  function cc() { return X.cc(); }
  function mul() { return S.set.timerMul || 1; }
  function day() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function bt(t) { return cc().bld.filter(function (b) { return b.t === t && b.l >= 1; }); }
  var DAY = 86400000;

  // ---------------- Lockbox ----------------
  // every finished Coin Barn / Salvage Silo shields 20% of its own capacity from raiders
  C.LOCK_PCT = 0.2;
  X.lockC = function () { return Math.floor(bt("barn").reduce(function (a, b) { return a + C.B.barn.cap[b.l] * C.LOCK_PCT; }, 0)); };
  X.lockS = function () { return Math.floor(bt("silo").reduce(function (a, b) { return a + C.B.silo.cap[b.l] * C.LOCK_PCT; }, 0)); };
  X.lockCoins = function () { return Math.min(Math.floor(S.coins), X.lockC()); };
  X.lockSalv = function () { return Math.min(Math.floor(S.salv), X.lockS()); };
  // what a raider can still reach (before the per-raid share and the loot cap)
  X.exposedC = function () { return Math.max(0, Math.floor(S.coins) - X.lockC()); };
  X.exposedS = function () { return Math.max(0, Math.floor(S.salv) - X.lockS()); };
  X.riskC = function () { return Math.floor(Math.min(X.exposedC() * 0.5, C.LOOTC[X.coreL() - 1][1])); };
  X.riskS = function () { return Math.floor(Math.min(X.exposedS() * 0.5, C.LOOTS[X.coreL() - 1][1])); };

  // ---------------- Beginner Shield + daily loss cap ----------------
  X.beginnerMs = function () { var c = cc(); if (!c || !c.bs || X.coreL() >= 4) return 0; return Math.max(0, c.bs - Date.now()); };
  C.LOSSCAP_PCT = 0.25; C.LOSSCAP_TROPHY = 60;
  function lossRec() { var c = cc(); if (!c.loss || c.loss.day !== day()) c.loss = {day: day(), c: 0, s: 0, t: 0}; return c.loss; }
  X.lossCap = function () { return {c: Math.floor(X.coinCap() * C.LOSSCAP_PCT), s: Math.floor(X.salvCap() * C.LOSSCAP_PCT), t: C.LOSSCAP_TROPHY}; };
  X.lossLeft = function () { var r = lossRec(), k = X.lossCap(); return {c: Math.max(0, k.c - r.c), s: Math.max(0, k.s - r.s), t: Math.max(0, k.t - r.t)}; };
  X.lossAdd = function (c, s, t) { var r = lossRec(); r.c += c; r.s += s; r.t += t; };

  // ---------------- Obstacles ----------------
  C.OBS = {
    weed: {name: "Weed Patch", w: 1, h: 1, cost: 20, min: 0.3, g: 1, s: 0, d: "Thorny weeds creep in from the island edge."},
    rock: {name: "Boulder", w: 2, h: 2, cost: 150, min: 3, g: 3, s: 20, d: "A big rock that tumbled onto the plot."},
    pod: {name: "Glow Pod", w: 1, h: 1, cost: 60, min: 1.5, g: 5, s: 0, d: "A rare glowing seed pod. Clear it for a gem trickle."}
  };
  C.OBS_CAP = 12; C.OBS_EVERY = 3 * 60;   // minutes between spawns (divided by the timer multiplier)
  function occupied(x, y, w, h) {
    var c = cc(), i, j, k;
    for (i = 0; i < c.bld.length; i++) { var b = c.bld[i], d = C.B[b.t]; if (x < b.x + d.w && x + w > b.x && y < b.y + d.h && y + h > b.y) return true; }
    for (k = 0; k < (c.obs || []).length; k++) { var o = c.obs[k], od = C.OBS[o.k]; if (x < o.x + od.w && x + w > o.x && y < o.y + od.h && y + h > o.y) return true; }
    return false;
  }
  X.obsAt = function (tx, ty) { var a = cc().obs || []; for (var i = 0; i < a.length; i++) { var o = a[i], d = C.OBS[o.k]; if (tx >= o.x && tx < o.x + d.w && ty >= o.y && ty < o.y + d.h) return o; } return null; };
  X.obsBlocks = function (x, y, w, h) { var a = cc().obs || []; for (var i = 0; i < a.length; i++) { var o = a[i], d = C.OBS[o.k]; if (x < o.x + d.w && x + w > o.x && y < o.y + d.h && y + h > o.y) return true; } return false; };
  X.obsBusy = function () { return (cc().obs || []).filter(function (o) { return o.cl; }).length; };
  function spawnObs(force) {
    var c = cc(); if ((c.obs || []).length >= C.OBS_CAP) return null;
    var r = Math.random(), k = r < 0.6 ? "weed" : r < 0.88 ? "rock" : "pod", d = C.OBS[k], lo = C.RING, hi = C.GRID - C.RING, tries = 60;
    while (tries-- > 0) {
      // bias to the outer two tiles of the buildable plot (the island edge)
      var edge = Math.floor(Math.random() * 4), a = lo + Math.floor(Math.random() * (hi - lo - d.w + 1)), dep = Math.floor(Math.random() * 2), x, y;
      if (edge === 0) { x = a; y = lo + dep; } else if (edge === 1) { x = a; y = hi - d.h - dep; } else if (edge === 2) { x = lo + dep; y = a; } else { x = hi - d.w - dep; y = a; }
      if (x < lo || y < lo || x + d.w > hi || y + d.h > hi) continue;
      if (occupied(x, y, d.w, d.h)) continue;
      var o = {id: ++c.nid, k: k, x: x, y: y, cl: null}; c.obs.push(o); return o;
    }
    return null;
  }
  X.spawnObs = spawnObs;
  X.clearObs = function (o) {
    var c = cc(), d = C.OBS[o.k]; if (!o || o.cl) return false;
    if (X.freeTinker() <= 0) { BB.sfx("deny"); X.toast("All tinkers are busy. Wait, or speed one up."); return false; }
    if (S.coins < d.cost) { BB.sfx("deny"); X.toast("Need " + d.cost + " coins to clear the " + d.name); return false; }
    S.coins -= d.cost; o.cl = {total: d.min, done: 0, last: Date.now()}; BB.sfx("hammer"); V.ring(o.x + d.w / 2, o.y + d.h / 2, 1.4, "#ffd35a"); BB.vibe(10); BB.track("cc_obs_start", {k: o.k}); X.hud(); X.save(); return true;
  };
  function finishObs(o) {
    var c = cc(), d = C.OBS[o.k], i = c.obs.indexOf(o); if (i >= 0) c.obs.splice(i, 1); if (V.selObs === o) V.selObs = null;
    S.gems += d.g; S.salv += d.s; c.pass.pts += 5; X.stat("cleared"); BB.sfx("upgrade"); BB.vibe([15, 30, 20]);
    V.puff(o.x + d.w / 2, o.y + d.h / 2, 16, o.k === "pod" ? "#9ff7ff" : o.k === "rock" ? "#c9bfa8" : "#8fd36a", 50, 0.7); V.ring(o.x + d.w / 2, o.y + d.h / 2, 2, "#ffe08a");
    V.float(o.x + d.w / 2, o.y - 0.3, "+" + d.g + " \u25C6" + (d.s ? " +" + d.s + "s" : ""), "#9fe8ff");
    X.toast(d.name + " cleared! +" + d.g + " play-gems" + (d.s ? ", +" + d.s + " salvage" : "")); BB.track("cc_obs_done", {k: o.k}); X.selBar(); X.save();
  }
  X.v11Tick = function (now) {
    var c = cc(), m = mul(); if (!c.obs) return;
    c.obs.slice().forEach(function (o) { if (o.cl) { o.cl.done += (now - o.cl.last) / 60000 * m; o.cl.last = now; if (o.cl.done >= o.cl.total) finishObs(o); } });
    if (!c.obsNext) c.obsNext = now + C.OBS_EVERY * 60000 / m;
    if (now >= c.obsNext) { var n = 0; while (now >= c.obsNext && n < 4) { spawnObs(); c.obsNext += C.OBS_EVERY * 60000 / m; n++; } if (c.obsNext < now) c.obsNext = now + C.OBS_EVERY * 60000 / m; }
  };
  X.v11Init = function () {
    var c = cc(); if (!c.obs) c.obs = []; if (!c.rc) c.rc = [null, null, null]; if (!c.loss) c.loss = {day: "", c: 0, s: 0, t: 0};
    if (!c.v11) { c.v11 = 1; if (X.coreL() >= 4) c.bs = 0; else if (!c.bs) c.bs = Date.now() + 3 * DAY; for (var i = 0; i < 6; i++) spawnObs(); c.obsNext = Date.now() + C.OBS_EVERY * 60000 / mul(); }
  };
  // obstacle info bar (replaces the building bar when an obstacle is selected)
  X.obsBar = function (o) {
    var d = C.OBS[o.k], el = $("b-sel"), h;
    if (o.cl) h = '<div class="sn"><b>Clearing ' + d.name + '</b><small>A tinker is on it: ' + C.fmtT(o.cl.total - o.cl.done) + ' left.</small></div><div class="sb"></div>';
    else h = '<div class="sn"><b>' + d.name + '</b><small>' + d.d + ' Clearing frees the tiles and pays +' + d.g + ' play-gems' + (d.s ? ' and +' + d.s + ' salvage' : '') + '.</small></div><div class="sb"><button class="btn" data-obs="' + o.id + '">CLEAR<small>' + d.cost + 'c &middot; ' + C.fmtT(d.min) + '</small></button></div>';
    el.classList.remove("hidden"); el.innerHTML = h;
  };

  // ---------------- Roll Call presets ----------------
  X.rcSnapshot = function () {
    var c = cc(), a = {}, sp = {}, k; C.UORDER.forEach(function (u) { var n = (c.army[u] || 0) + c.queue.filter(function (q) { return q.k === u; }).length; if (n) a[u] = n; });
    for (k in c.spells) if (c.spells[k] > 0) sp[k] = c.spells[k]; return {army: a, spells: sp};
  };
  X.rcPlan = function (i) {
    var c = cc(), p = c.rc[i]; if (!p) return null; var add = {}, adds = 0, cost = 0, time = 0, skip = 0, housed = X.housed(), cap = X.housing(), coins = S.coins, tl = 0, sadd = {}, sc = 0, ss = 0, en = X.spellE();
    c.bld.forEach(function (b) { if (b.t === "train" && b.l > tl) tl = b.l; }); var nT = Math.max(1, bt("train").length), wl = 0; c.bld.forEach(function (b) { if (b.t === "workshop" && b.l > wl) wl = b.l; });
    C.UORDER.forEach(function (k) {
      var want = p.army[k] || 0, have = (c.army[k] || 0) + c.queue.filter(function (q) { return q.k === k; }).length, u = C.U[k], mx = C.UMAX && C.UMAX[k], need = want - have;
      while (need > 0) {
        if (tl < u.tb || (mx && have + (add[k] || 0) >= mx) || housed + u.h > cap || coins < u.c) { skip += need; break; }
        add[k] = (add[k] || 0) + 1; adds++; housed += u.h; coins -= u.c; cost += u.c; time += u.tr / nT; need--;
      }
    });
    C.SPORDER.forEach(function (k) {
      var sp = C.SP[k], want = p.spells[k] || 0, have = c.spells[k] || 0, need = want - have;
      while (need > 0) { if (X.coreL() < sp.unl || wl < 1 || en + sp.e > X.spellCap() || coins < sp.c || S.salv - ss < sp.s) { skip += need; break; } sadd[k] = (sadd[k] || 0) + 1; en += sp.e; coins -= sp.c; cost += sp.c; sc += sp.c; ss += sp.s; need--; }
    });
    var tot = 0, tn = 0; for (var k2 in p.army) tot += p.army[k2]; for (var k3 in p.spells) tn += p.spells[k3];
    return {add: add, adds: adds, sadd: sadd, cost: cost, scost: ss, time: time, skip: skip, tot: tot, spells: tn};
  };
  X.rcSave = function (i) { var c = cc(), s = X.rcSnapshot(), n = 0; for (var k in s.army) n += s.army[k]; for (var k2 in s.spells) n += s.spells[k2]; if (!n) { BB.sfx("deny"); X.toast("Nothing to save yet. Train a few troops first."); return; } c.rc[i] = {army: s.army, spells: s.spells, name: (c.rc[i] && c.rc[i].name) || ["Roll 1", "Roll 2", "Roll 3"][i]}; BB.sfx("upgrade"); X.toast("Roll Call " + (i + 1) + " saved"); BB.track("cc_rc_save", {i: i}); X.save(); };
  X.rcClear = function (i) { cc().rc[i] = null; BB.sfx("click"); X.save(); };
  X.rcGo = function (i) {
    var c = cc(), pl = X.rcPlan(i); if (!pl) return; if (!pl.adds && !Object.keys(pl.sadd).length) { BB.sfx("deny"); X.toast(pl.skip ? "Cannot queue more: check housing, coins or Training Barn level" : "Your army already matches Roll Call " + (i + 1)); return; }
    if (!c.queue.length) c.qLast = Date.now();
    C.UORDER.forEach(function (k) { for (var n = 0; n < (pl.add[k] || 0); n++) { S.coins -= C.U[k].c; c.queue.push({k: k, left: C.U[k].tr}); } });
    for (var s in pl.sadd) for (var n2 = 0; n2 < pl.sadd[s]; n2++) { S.coins -= C.SP[s].c; S.salv -= C.SP[s].s; c.spells[s] = (c.spells[s] || 0) + 1; }
    X.stat("train", pl.adds); BB.sfx("upgrade"); BB.vibe(12); BB.track("cc_rc_go", {i: i, n: pl.adds}); X.toast("Roll Call " + (i + 1) + ": queued " + pl.adds + " troops" + (Object.keys(pl.sadd).length ? " + spells" : "") + " (" + X.fmt(pl.cost) + "c, " + C.fmtT(pl.time / 60) + ")" + (pl.skip ? ". " + pl.skip + " skipped (full or short on coins)" : "")); X.hud(); X.save();
  };
  X.rcHTML = function () {
    var c = cc(), h = '<div class="card rc"><h4>Roll Call <small class="muted">3 saved armies, one tap</small></h4><div class="rcrow">';
    for (var i = 0; i < 3; i++) {
      var p = c.rc[i], pl = p ? X.rcPlan(i) : null, tx;
      if (!p) tx = "Empty. Build the army you like, then SAVE.";
      else { var parts = []; C.UORDER.forEach(function (k) { if (p.army[k]) parts.push(p.army[k] + " " + C.U[k].name.split(" ").pop()); }); var spn = Object.keys(p.spells).map(function (k) { return p.spells[k] + " " + C.SP[k].name; }); tx = parts.slice(0, 4).join(", ") + (parts.length > 4 ? " +" + (parts.length - 4) : "") + (spn.length ? " &middot; " + spn.length + " spell type" + (spn.length > 1 ? "s" : "") : ""); }
      var need = pl ? (pl.adds || Object.keys(pl.sadd).length) : 0, ok = pl && (pl.adds || Object.keys(pl.sadd).length);
      h += '<div class="rcs' + (p ? " on" : "") + '"><b>' + (p ? p.name : "Slot " + (i + 1)) + '</b><small>' + tx + '</small>' +
        (p ? '<small class="rcc">' + (ok ? "Needs " + X.fmt(pl.cost) + "c &middot; " + C.fmtT(pl.time / 60) + (pl.skip ? " &middot; " + pl.skip + " won't fit" : "") : (pl.skip ? "Full or short on coins" : "Army ready")) + '</small>' : "") +
        '<div class="rcb"><button class="btn ' + (ok ? "" : "off") + '" data-rc="go:' + i + '">' + (p ? "QUEUE" : "-") + '</button><button class="btn sec" data-rc="save:' + i + '">SAVE</button>' + (p ? '<button class="btn sec" data-rc="clr:' + i + '">&#10005;</button>' : "") + '</div></div>';
    }
    return h + "</div><small>SAVE stores your current army (trained + queued) and spells. QUEUE trains whatever is missing, paying coins as usual.</small></div>";
  };

  // ---------------- HUD: shield text, At Risk bar, clearing chips ----------------
  X.shieldText = function () {
    var now = Date.now(), c = cc();
    if (c.shield > now) return "\u{1F6E1} Shield " + C.fmtT((c.shield - now) / 60000);
    var bm = X.beginnerMs(); if (bm) return "\u{1F331} Beginner Shield " + C.fmtT(bm / 60000);
    if (c.guard > now) return "Guard " + C.fmtT((c.guard - now) / 60000); return "";
  };
  X.riskHud = function () {
    var el = $("b-risk"); if (!el) return; var cap = X.coinCap(), lock = X.lockCoins(), ex = X.exposedC(), at = X.riskC(), left = X.lossLeft(), cp = X.lossCap();
    var ok = X.beginnerMs() > 0 || cc().shield > Date.now(); var key = lock + "|" + ex + "|" + at + "|" + cap + "|" + ok + "|" + left.c; if (el._k === key) return; el._k = key;
    var sw = Math.min(100, lock / cap * 100), ew = Math.min(100 - sw, Math.max(0, ex) / cap * 100), aw = Math.min(ew, at / cap * 100);
    el.innerHTML = '<i class="rk"><u class="sf" style="width:' + sw + '%"></u><u class="ex" style="width:' + (ew - aw) + '%"></u><u class="ar" style="width:' + aw + '%"></u></i><em>' + (ok ? "Safe now" : at ? "At risk " + X.fmt(at) + "c" : "Nothing at risk") + "</em>";
    el.classList.toggle("calm", ok || !at);
  };
  X.riskModal = function () {
    var cap = X.lossCap(), left = X.lossLeft(), r = lossRec(), bm = X.beginnerMs(), c = cc();
    var h = '<h1 class="win" style="font-size:22px">LOCKBOX &amp; RISK</h1><div class="loot"><span>Lockbox (coins)</span><span>' + X.fmt(X.lockCoins()) + " / " + X.fmt(X.lockC()) + "</span><span>Lockbox (salvage)</span><span>" + X.fmt(X.lockSalv()) + " / " + X.fmt(X.lockS()) + "</span><span>At risk (coins)</span><span>" + X.fmt(X.riskC()) + "</span><span>At risk (salvage)</span><span>" + X.fmt(X.riskS()) + "</span></div>";
    h += '<p class="sub">Every Coin Barn and Salvage Silo has a Lockbox that keeps ' + Math.round(C.LOCK_PCT * 100) + '% of its capacity out of a raider\'s reach. Raiders only take a share of what is above that line, so upgrade storages to protect more.</p>';
    h += '<div class="loot"><span>Beginner Shield</span><span>' + (bm ? C.fmtT(bm / 60000) + " left" : c.bs && X.coreL() >= 4 ? "Ended (Core 4)" : "Ended") + "</span><span>Lost today (coins)</span><span>" + X.fmt(r.c) + " / " + X.fmt(cap.c) + "</span><span>Lost today (salvage)</span><span>" + X.fmt(r.s) + " / " + X.fmt(cap.s) + "</span><span>Trophies lost today</span><span>" + r.t + " / " + cap.t + "</span></div>";
    h += '<p class="sub">The first 3 days (or until Core L4) no raiders come. After that a daily loss cap means raids can never take more than ' + Math.round(C.LOSSCAP_PCT * 100) + '% of your storage or ' + cap.t + ' trophies in one day.</p><div class="btns"><button class="btn sec" id="m-no">OK</button></div>';
    X.modal(h, "tall"); $("m-no").onclick = X.close;
  };

  // ---------------- wiring ----------------
  X.v11Bind = function () {
    var base = $("base"); if (!base || base._v11) return; base._v11 = 1;
    base.addEventListener("click", function (e) {
      var t = e.target, el = t.closest ? t.closest("[data-rc],[data-obs],#b-risk,#b-shield") : null; if (!el) return; BB.audioInit && BB.audioInit();
      if (el.dataset.rc) { var p = el.dataset.rc.split(":"), i = +p[1]; if (p[0] === "go") X.rcGo(i); else if (p[0] === "save") X.rcSave(i); else X.rcClear(i); X.panelRefresh(false); return; }
      if (el.dataset.obs) { var o = (cc().obs || []).filter(function (q) { return q.id === +el.dataset.obs; })[0]; if (o) { X.clearObs(o); X.obsBar(o); } return; }
      if (el.id === "b-risk" || el.id === "b-shield") { BB.sfx("click"); X.riskModal(); }
    }, true);
  };
  X.v11Bind();
})();
