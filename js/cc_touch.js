"use strict";
// ---- v0.7 hands-on touch layer: gestures for raids + base, camera, critters, orbs, rhythm. All original code. ----
// Raid inputs become recorded sim actions (X.rAct / X.deployUnit / X.castSpell) so replays reproduce them.
(function () {
  var C = BB.CC, V = BB.CCV, T = C.T, N = C.GRID, TCH = BB.TCH = {}, ptr = {}, pinch = null, L = null, cv = null;
  var X = function () { return BB.CCUI; }, FXo = function () { return BB.FX; };
  var tapPrev = {t: 0, x: 0, y: 0, o: null}, hintEl = null, hintT = 0, lastEdge = -1;
  function now() { return performance.now(); }
  function S() { return BB.S; }
  function cc() { return X().cc(); }
  function simple() { return !!(S().set && S().set.simple); }
  function raid() { return V.mode === "raid" ? X().raidInfo() : null; }
  function live() { var r = raid(); return r && r.phase === "fight" && !r.replay && !r.sim.done ? r : null; }
  function dims() { return V.ctx(); }
  function tileOf(px, py) { var g = dims(), p = V.logical(px, py); return [(p[0] - g.gx) / T, (p[1] - g.gy) / T, p[0], p[1]]; }
  function scrLog(px, py) { var r = cv.getBoundingClientRect(); return [(px - r.left) / r.width * 360, (py - r.top) / r.height * dims().Hl]; }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function hz(p) { BB.vibe && BB.vibe(p); }
  function sfx(n, a) { BB.sfx && BB.sfx(n, a); }

  // ---------- hint chips (one-time, tiny, never block input) ----------
  TCH.hint = function (key, txt, ms) {
    var c = cc(); if (!c || !c.hints || c.hints[key]) return; if (hintEl && hintT > 0) return; c.hints[key] = 1;
    if (!hintEl) { hintEl = document.createElement("div"); hintEl.id = "hintchip"; (document.getElementById("base") || document.body).appendChild(hintEl); }
    hintEl.textContent = txt; hintEl.className = "show" + (V.mode === "raid" ? " rd" : ""); hintT = (ms || 4200) / 1000;
  };
  TCH.resetHints = function () { var c = cc(); if (c) c.hints = {}; };

  // ---------- attach ----------
  TCH.attach = function (canvas, legacy) {
    cv = canvas; L = legacy;
    cv.addEventListener("pointerdown", pdown); cv.addEventListener("pointermove", pmove); cv.addEventListener("pointerup", pup); cv.addEventListener("pointercancel", pup);
    cv.addEventListener("wheel", function (e) { e.preventDefault(); var q = scrLog(e.clientX, e.clientY); V.camZoomAt(V.uc.z * (e.deltaY < 0 ? 1.12 : 0.89), q[0], q[1]); if (V.uc.z < 1.03) V.camReset(true); }, {passive: false});
    cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    initSensors();
  };

  // ---------- pointers ----------
  function pdown(e) {
    if (L && V.cb.audio) V.cb.audio(); var id = e.pointerId; try { cv.setPointerCapture(id); } catch (x) {}
    var p = ptr[id] = {id: id, cx: e.clientX, cy: e.clientY, sx: e.clientX, sy: e.clientY, t0: now(), mode: "pending", moved: false, tl: tileOf(e.clientX, e.clientY), s: [], e: e};
    p.tl0 = p.tl; p.s.push([p.t0, e.clientX, e.clientY]);
    var ids = Object.keys(ptr);
    if (ids.length >= 2) { startPinch(); return; }
    if (V.ghost || V.paint) { p.mode = "legacy"; L.down(e); return; }
    if (V.mode === "raid") raidDown(p); else baseDown(p);
  }
  function pmove(e) {
    var p = ptr[e.pointerId]; if (!p) return; p.cx = e.clientX; p.cy = e.clientY; p.e = e; var t = now(); p.s.push([t, e.clientX, e.clientY]); if (p.s.length > 12) p.s.shift();
    p.tl = tileOf(e.clientX, e.clientY); var mvPx = Math.hypot(e.clientX - p.sx, e.clientY - p.sy); if (mvPx > 9) p.moved = true;
    if (pinch) { pinchMove(); return; }
    if (p.mode === "legacy") { L.move(e); return; }
    if (p.mode === "dead") return;
    if (V.mode === "raid") raidMove(p); else baseMove(p);
  }
  function pup(e) {
    var p = ptr[e.pointerId]; if (!p) return; p.cx = e.clientX; p.cy = e.clientY; p.tl = tileOf(e.clientX, e.clientY); p.e = e; delete ptr[e.pointerId];
    if (pinch) { if (!Object.keys(ptr).length) endPinch(); else { var rest = ptr[Object.keys(ptr)[0]]; if (rest) rest.mode = "dead"; endPinch(); } return; }
    if (p.mode === "legacy") { L.up(e); return; }
    if (p.mode === "dead") return;
    if (V.mode === "raid") raidUp(p); else baseUp(p);
  }
  function velocity(p, ms) {
    var s = p.s, n = s.length; if (n < 2) return [0, 0]; var last = s[n - 1], i = n - 2; while (i > 0 && last[0] - s[i][0] < ms) i--; var f = s[i], dt = Math.max(16, last[0] - f[0]);
    return [(last[1] - f[1]) / dt * 1000, (last[2] - f[2]) / dt * 1000];
  }

  // ---------- two-finger pinch zoom + pan (raid and base) ----------
  function startPinch() {
    var ids = Object.keys(ptr), a = ptr[ids[0]], b = ptr[ids[1]]; if (!a || !b) return; cancelSingle(a); cancelSingle(b);
    var m = scrLog((a.cx + b.cx) / 2, (a.cy + b.cy) / 2);
    pinch = {d0: Math.max(30, Math.hypot(a.cx - b.cx, a.cy - b.cy)), z0: V.uc.z, mx: m[0], my: m[1], a: a.id, b: b.id}; V.uc.vx = V.uc.vy = 0; V.uc.anim = null;
    a.mode = b.mode = "dead"; sfx("tick");
  }
  function pinchMove() {
    var a = ptr[pinch.a], b = ptr[pinch.b]; if (!a || !b) return; var d = Math.hypot(a.cx - b.cx, a.cy - b.cy), m = scrLog((a.cx + b.cx) / 2, (a.cy + b.cy) / 2);
    V.camZoomAt(pinch.z0 * d / pinch.d0, m[0], m[1]); V.camPan(m[0] - pinch.mx, m[1] - pinch.my); pinch.mx = m[0]; pinch.my = m[1];
    TCH.hint("pinch2", "Pinch to zoom, drag with two fingers to pan", 3000);
  }
  function endPinch() { pinch = null; Object.keys(ptr).forEach(function (k) { ptr[k].mode = "dead"; }); if (V.uc.z < 1.04) V.camReset(true); }
  function cancelSingle(p) {
    if (p.mode === "ch") { var r = live(); r && X().rAct({k: "hch", on: 0}); }
    if (p.mode === "lift") dropLift(p, true);
  }

  // ---------- base: pickups ----------
  var pk = TCH.pk = [];
  TCH.spawn = function (x, y, kind, v, n) {
    for (var i = 0; i < (n || 1); i++) { if (pk.length > 24) return; pk.push({x: x + (Math.random() - 0.5) * 8, y: y, z: 0, vz: 90 + Math.random() * 60, vx: (Math.random() - 0.5) * 60, k: kind, v: v, t: 0, got: 0}); }
  };
  function collectPk(o) {
    if (o.got) return; o.got = 1; var r = o.k === "c" ? X().giveCapped(o.v, 0) : X().giveCapped(0, o.v); var amt = o.k === "c" ? r[0] : r[1];
    if (FXo()) FXo().flyWorld(o.x, o.y - o.z, o.k === "c" ? "c" : "s", 3, amt); sfx(o.k === "c" ? "coin" : "salv"); hz(8); V.float((o.x - dims().gx) / T, (o.y - dims().gy) / T - 0.4, "+" + amt, o.k === "c" ? "#ffd35a" : "#8fd4ff"); X().save && X().save();
  }
  function pkAt(lx, ly, r) { for (var i = 0; i < pk.length; i++) { var o = pk[i]; if (!o.got && Math.hypot(lx - o.x, ly - (o.y - o.z)) < (r || 13)) return o; } return null; }

  // ---------- base: critters (tap to react, hold to pet, double-tap to feed) ----------
  function petReward(h, kind) {
    var c = cc(), day = new Date().toDateString(), pt = c.pets; if (pt.day !== day) { pt.day = day; pt.n = 0; pt.t = {}; } var key = h.t + h.i, nowM = Date.now(), gap = kind === "feed" ? 90000 : 40000;
    if (pt.n >= 30 || (pt.t[key + kind] && nowM - pt.t[key + kind] < gap)) return false; pt.t[key + kind] = nowM; pt.n++; var o = h.o, g = dims();
    TCH.spawn(o.x, o.y - 10, kind === "feed" ? "s" : "c", kind === "feed" ? 6 : 4, kind === "feed" ? 2 : 1); return true;
  }
  TCH.critterTap = function (h, kind) { FXo().critterReact(h, kind); hz(kind === "pet" ? [8, 30, 8] : 12); var got = petReward(h, kind); if (kind === "feed" || kind === "pet") { if (got) V.float((h.o.x - dims().gx) / T, (h.o.y - dims().gy) / T - 1.2, kind === "feed" ? "Yum! +seeds" : "Happy! +coins", "#ffb3cf"); } };
  function critterBurst(a) { }

  // ---------- base: down / move / up ----------
  function bldAt(tx, ty) { var c = cc(), best = null; for (var i = 0; i < c.bld.length; i++) { var b = c.bld[i], d = C.B[b.t]; if (tx >= b.x && tx < b.x + d.w && ty >= b.y && ty < b.y + d.h) best = b; } return best; }
  function baseDown(p) {
    var tl = p.tl, g = dims(); p.pkh = pkAt(tl[2], tl[3], 14);
    if (p.pkh) { collectPk(p.pkh); p.mode = "sweep"; return; }
    p.crit = FXo() && FXo().critterAt(tl[2], tl[3]); p.b = bldAt(tl[0], tl[1]);
    p.sweepable = !!(p.b && X().collectable(p.b));
  }
  function baseMove(p) {
    var tl = p.tl, g = dims();
    if (p.mode === "sweep") { var o = pkAt(tl[2], tl[3], 16); if (o) collectPk(o); var b = bldAt(tl[0], tl[1]); if (b && X().collectable(b)) { X().collect(b); } return; }
    if (p.mode === "lift") { liftMove(p); return; }
    if (p.mode === "pending" && p.moved) {
      if (p.sweepable) { p.mode = "sweep"; X().collect(p.b); TCH.hint("sweep", "Swipe across collectors to sweep them all", 3200); return; }
      p.mode = "pan"; p.last = scrLog(p.sx, p.sy); V.uc.vx = V.uc.vy = 0; V.uc.anim = null;
    }
    if (p.mode === "pan") { var q = scrLog(p.cx, p.cy); V.camPan(q[0] - p.last[0], q[1] - p.last[1]); p.last = q; if (V.uc.z > 1.05) TCH.hint("pan", "Pan with inertia. Double-tap a building to focus", 3000); }
  }
  function baseUp(p) {
    var t = now(), tl = p.tl, g = dims();
    if (p.mode === "lift") { dropLift(p); return; }
    if (p.mode === "sweep") { if (p.pkh) cc(); return; }
    if (p.mode === "pan") { var v = velocity(p, 110), r = cv.getBoundingClientRect(), k = 360 / r.width; if (Math.hypot(v[0], v[1]) > 200) V.camFling(v[0] * k * 0.9, v[1] * k * 0.9); return; }
    if (p.mode === "held") return;
    // tap
    var dbl = t - tapPrev.t < 330 && Math.hypot(p.tl[2] - tapPrev.x, p.tl[3] - tapPrev.y) < 22;
    if (p.crit) { var same = dbl && tapPrev.o === p.crit.o; TCH.critterTap(p.crit, same ? "feed" : "tap"); tapPrev = {t: t, x: tl[2], y: tl[3], o: p.crit.o}; return; }
    if (dbl) { tapPrev = {t: 0, x: 0, y: 0, o: null}; var b = p.b; if (b) { var d = C.B[b.t]; V.camFocus(b.x + d.w / 2, b.y + d.h / 2, 2.0); sfx("tick"); hz(10); } else if (V.uc.z > 1.05) V.camReset(true); else V.camFocus(tl[0], tl[1], 1.7); return; }
    tapPrev = {t: t, x: tl[2], y: tl[3], o: null};
    V.cb.tap && V.cb.tap(tl[0], tl[1]);
  }
  // long press while still: pet critter / lift building
  function baseHold(p) {
    if (p.crit) { p.mode = "held"; TCH.critterTap(p.crit, "pet"); hz([10, 40, 10]); return; }
    if (p.b && !p.b.up_locked) { liftStart(p); }
  }

  // ---------- base: lift + rearrange (long-press a building, drag, snap, drop with a tween) ----------
  function liftStart(p) {
    var b = p.b, d = C.B[b.t]; p.mode = "lift"; X().closePanel && X().closePanel(); V.sel = b; X().selBar && X().selBar();
    V.lift = {id: b.id, b: b, fx: b.x, fy: b.y, tx: b.x, ty: b.y, ok: true, ox: 0, oy: 0}; var tl = p.tl; V.lift.ox = tl[0] - (b.x + d.w / 2); V.lift.oy = tl[1] - (b.y + d.h / 2);
    sfx("lift"); hz(16); TCH.hint("lift", "Drag to rearrange. Drops snap to the grid", 3000);
  }
  function liftMove(p) {
    var l = V.lift; if (!l) return; var b = l.b, d = C.B[b.t], tl = p.tl; l.fx = tl[0] - l.ox - d.w / 2; l.fy = tl[1] - l.oy - d.h / 2;
    var nx = Math.round(l.fx), ny = Math.round(l.fy); if (nx !== l.tx || ny !== l.ty) { l.tx = nx; l.ty = ny; l.ok = X().fits(b.t, nx, ny, b.id); hz(l.ok ? 4 : 9); sfx("tick"); }
  }
  function dropLift(p, cancel) {
    var l = V.lift; V.lift = null; if (!l) return; var b = l.b, d = C.B[b.t], ok = !cancel && l.ok && X().fits(b.t, l.tx, l.ty, b.id), ox = b.x, oy = b.y;
    var cur = V.offs[b.id] || {dx: l.fx - b.x, dy: l.fy - b.y, z: 6};
    if (ok) { b.x = l.tx; b.y = l.ty; X().moveBuilding(b, b.x, b.y); sfx("hammer"); hz([14, 20]); V.puff(b.x + d.w / 2, b.y + d.h, 6, "#d8c9a0", 30, 0.4); }
    else { if (!cancel) { sfx("deny"); hz(20); } }
    V.offs[b.id] = {dx: cur.dx + (ox - b.x) , dy: cur.dy + (oy - b.y), z: cur.z, settle: 1, vz: 0};
    X().selBar && X().selBar();
  }

  // ---------- raid ----------
  var ST = TCH.st = {aim: null, path: null, fly: [], rally: null, mpath: null, trail: [], steerMark: null, focusMark: null, perfT: 0, beatFlash: 0};
  function clampT(v) { return Math.max(0.5, Math.min(N - 0.5, v)); }
  function weakAt(r, x, y) {
    var best = null, bd = 99; r.sim.bld.forEach(function (b) { if (b.dead || b.kind !== "def" || !b.wkOpen || b.wkUsed === b.wkWin) return; var d = Math.hypot(x - b.cx, y - b.cy); if (d <= Math.max(1.15, b.w / 2 + 0.55) && d < bd) { bd = d; best = b; } }); return best;
  }
  function bldHit(r, x, y) {
    var best = null, bd = 0.75; r.sim.bld.forEach(function (b) { if (b.dead || b.kind === "trap") return; var dx = Math.max(b.x - x, 0, x - (b.x + b.w)), dy = Math.max(b.y - y, 0, y - (b.y + b.h)), d = Math.hypot(dx, dy); if (d < bd || (d === 0 && best && best.kind === "wall" && b.kind !== "wall")) { bd = d; best = b; } }); return best;
  }
  function troopsNear(r, x, y, rad) { var n = 0; r.sim.tr.forEach(function (u) { if (!u.dead && !u.hero && !u.heal && !u.decoy && Math.hypot(u.x - x, u.y - y) <= rad) n++; }); return n; }
  function raidDown(p) {
    var r = raid(), tl = p.tl, x = tl[0], y = tl[1]; p.r = r;
    if (!r) { p.mode = "pan"; p.last = scrLog(p.sx, p.sy); return; }
    if (r.phase !== "fight" || r.replay || r.sim.done) { p.mode = "pending"; p.view = true; return; }
    if (FXo()) { var oid = FXo().orbAt(x, y); if (oid >= 0) { X().puTap(oid); p.mode = "magnet"; ST.mag = {x: tl[2], y: tl[3], t: 0.6}; return; } }
    var wb = weakAt(r, x, y); if (wb && X().rAct({k: "weak", b: wb.i})) { p.mode = "dead"; return; }
    var sel = r.sel;
    if (sel && sel.t === "s" && (r.spl[sel.k] || 0) > 0) { p.mode = "aim"; ST.aim = {k: sel.k, x: x, y: y, t: 0}; sfx("lift"); hz(6); TCH.hint("aim", "Drag to aim the spell. Flick to throw it. Release to cast.", 3800); return; }
    var hh0 = r.sim.heroU(), nearHero = !!(hh0 && Math.hypot(hh0.x - x, hh0.y - y) < 1.1);
    if (sel && !nearHero && ((sel.t === "u" && (r.army[sel.k] || 0) > 0) || (sel.t === "h" && !r.sim.heroU() && !r.sim.tr.some(function (u) { return u.hero; })))) {
      var cx0 = clampT(x), cy0 = clampT(y);
      if (r.sim.canDeploy(cx0, cy0)) { p.mode = "deploy"; p.path = [[x, y]]; p.lastD = [x, y]; p.n = 1; ST.path = p.path; V.cb.raidTap && V.cb.raidTap(x, y, true); p.dep0 = now(); TCH.hint("stream", "Hold and drag along the edge to stream troops", 3600); return; }
    }
    p.mode = "ctl"; var h = r.sim.heroU(); p.onHero = !!(h && Math.hypot(h.x - x, h.y - y) < 1.3); p.nearT = troopsNear(r, x, y, 1.6) > 1; p.ctlPath = [[x, y]];
    if (simple()) { p.mode = "pending"; p.simple = true; }
  }
  function raidMove(p) {
    var r = live(); if (!r) return; var tl = p.tl, x = tl[0], y = tl[1];
    if (p.mode === "magnet") { ST.mag = {x: tl[2], y: tl[3], t: 0.6}; if (FXo()) { var oid = FXo().orbAt(x, y); if (oid >= 0) { X().puTap(oid); sfx("magnet"); } } return; }
    if (p.mode === "aim") { ST.aim.x = x; ST.aim.y = y; return; }
    if (p.mode === "deploy") {
      p.path.push([x, y]); if (p.path.length > 80) p.path.shift(); var step = dist(p.lastD, [x, y]);
      if (step >= 0.55 || (step >= 0.2 && now() - p.dep0 > 160)) { p.lastD = [x, y]; p.dep0 = now(); var before = r.dep ? 1 : 0; V.cb.raidTap && V.cb.raidTap(x, y, false); p.n++; }
      return;
    }
    if (p.mode === "ctl" || p.mode === "pending") {
      if (p.view || p.simple) { if (p.moved) { if (p.mode === "pending") { p.mode = "pan"; p.last = scrLog(p.sx, p.sy); } } if (p.mode === "pan") panStep(p); return; }
      var el = now() - p.t0, mv = Math.hypot(x - p.tl0[0], y - p.tl0[1]), h = r.sim.heroU();
      if (!p.dec) {
        if (p.nearT && !p.onHero && mv > 0.5) { p.dec = "march"; p.ctlPath = [[p.tl0[0], p.tl0[1]]]; TCH.hint("march", "Drag a line to send a squad marching along it", 3600); }
        else if (el < 240 && mv > 1.3) { p.dec = "swipe"; doDash(r, h, p.tl0, [x, y]); p.mode = "dead"; return; }
        else if (el >= 240 && mv > 0.4) { p.dec = "steer"; p.lastS = 0; }
      }
      if (p.dec === "march") { var lp = p.ctlPath[p.ctlPath.length - 1]; if (dist(lp, [x, y]) >= 0.5 && p.ctlPath.length < 30) { p.ctlPath.push([x, y]); ST.mpath = {p: p.ctlPath, t: 9}; } }
      else if (p.dec === "steer" && h) { var t = now(); if (t - p.lastS > 100) { p.lastS = t; if (X().rAct({k: "hmove", x: clampT(x), y: clampT(y)})) ST.steerMark = {x: x, y: y, t: 0.9}; } }
    }
  }
  function panStep(p) { var q = scrLog(p.cx, p.cy); if (p.last) V.camPan(q[0] - p.last[0], q[1] - p.last[1]); p.last = q; }
  function doDash(r, h, a, b) {
    if (!h) return; var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; if (X().rAct({k: "hdash", x: h.x + dx / d * 3, y: h.y + dy / d * 3})) { TCH.hint("dash2", "Dash gives brief invulnerability", 2600); }
    else if (h.dcd > 0) { sfx("deny"); }
  }
  function raidUp(p) {
    var r = raid(), t = now(), tl = p.tl, mode = p.mode; ST.path = null;
    if (!r) return;
    if (mode === "pan") { var v = velocity(p, 110), rc = cv.getBoundingClientRect(), k = 360 / rc.width; if (Math.hypot(v[0], v[1]) > 200) V.camFling(v[0] * k * 0.9, v[1] * k * 0.9); return; }
    if (mode === "aim") { fireAim(p, r); return; }
    if (mode === "ch") { X().rAct({k: "hch", on: 0}); return; }
    if (mode === "deploy" || mode === "magnet" || mode === "held" || mode === "dead") return;
    if (!live()) return;
    if (p.simple) { if (!p.moved && t - p.t0 < 350) { var dbl0 = t - tapPrev.t < 330; tapPrev = {t: t, x: tl[2], y: tl[3], o: null}; } return; }
    if (p.dec === "march") { if (p.ctlPath.length >= 2) { var pts = p.ctlPath, out = [pts[0]], q; for (q = 1; q < pts.length; q++) out.push(pts[q]); if (out.length > 14) { var st = out.length / 14, o2 = []; for (q = 0; q < 14; q++) o2.push(out[Math.floor(q * st)]); o2.push(out[out.length - 1]); out = o2; } if (X().rAct({k: "march", p: out})) { ST.mpath = {p: out, t: 1.4}; } else { sfx("deny"); ST.mpath = null; } } else ST.mpath = null; return; }
    if (p.dec === "steer") return;
    if (!p.dec && t - p.t0 < 420 && !p.moved) {
      var dbl = t - tapPrev.t < 330 && Math.hypot(tl[2] - tapPrev.x, tl[3] - tapPrev.y) < 40; tapPrev = {t: t, x: tl[2], y: tl[3], o: null};
      var ab = document.getElementById("r-ab"); if (dbl && ab && !ab.classList.contains("zero")) { tapPrev.t = 0; ab.click(); hz([20, 30, 40]); return; }
      var h = r.sim.heroU(); if (!h) return; var b = bldHit(r, tl[0], tl[1]);
      if (b) { if (X().rAct({k: "hfocus", b: b.i})) { TCH.hint("focus", "Tapped a building: your hero focuses it", 3000); } }
      else if (X().rAct({k: "hmove", x: clampT(tl[0]), y: clampT(tl[1])})) { ST.steerMark = {x: tl[0], y: tl[1], t: 0.9}; TCH.hint("steer", "Tap anywhere to walk your hero. Swipe to dash.", 3600); }
    }
  }
  function raidHold(p) {
    var r = live(); if (!r || p.simple) return; if (p.dec) return;
    if (p.onHero) { if (X().rAct({k: "hch", on: 1})) { p.mode = "ch"; TCH.hint("chan", "Holding your hero: channel for a big damage burst", 3200); } else { p.mode = "held"; sfx("deny"); } }
    else if (troopsNear(r, p.tl[0], p.tl[1], 99) > 0) { if (X().rAct({k: "rally", x: clampT(p.tl[0]), y: clampT(p.tl[1])})) { p.mode = "held"; ST.rally = {x: p.tl[0], y: p.tl[1], t: 6}; TCH.hint("rally", "Hold on the field: troops rally to that spot", 3200); } else { p.mode = "held"; sfx("deny"); } }
  }
  function fireAim(p, r) {
    var a = ST.aim; ST.aim = null; if (!a) return; var v = velocity(p, 90), rc = cv.getBoundingClientRect(), pxT = T * rc.width / 360 * V.uc.z, vt = [v[0] / pxT, v[1] / pxT], sp = Math.hypot(vt[0], vt[1]), mv = Math.hypot(a.x - p.tl0[0], a.y - p.tl0[1]);
    var pend = 0; ST.fly.forEach(function (f) { if (f.k === a.k) pend++; }); if ((r.spl[a.k] || 0) - pend < 1) return;
    if (sp > 7 && mv > 1.0) { var d = Math.min(7.5, 1.5 + sp * 0.4), nx = vt[0] / sp, ny = vt[1] / sp, x1 = Math.max(0.2, Math.min(N - 0.2, a.x + nx * d)), y1 = Math.max(0.2, Math.min(N - 0.2, a.y + ny * d)); ST.fly.push({k: a.k, x0: a.x, y0: a.y, x1: x1, y1: y1, t: 0, d: Math.max(0.3, d / 16)}); sfx("whoosh"); hz(10); TCH.hint("flick", "Flick-throw lands where it arcs", 2600); }
    else X().castSpell(a.k, a.x, a.y);
  }

  // ---------- sim events -> touch visuals (also plays in replays) ----------
  var TELC = {lobber: "#ff6a3a", sniper: "#ff3a3a"};
  TCH.ev = function (e) {
    var g = dims(), k = e.k, X0 = g.gx + (e.x || 0) * T, Y0 = g.gy + (e.y || 0) * T, F = FXo();
    if (k === "tele") {
      sfx("telew"); hz(5); if (V.projs.length < 50) V.projs.push({x1: e.bx, y1: e.by, x2: e.x, y2: e.y, t: 0, d: e.d, c: e.c, spl: e.r});
      TCH.hint("dodge", "Red circle = incoming shot. Swipe your hero out of it!", 4200); return false;
    }
    if (k === "shot" && e.tl) { if (V.cb.sfx) V.cb.sfx("dshot"); return true; }
    if (k === "hgo") { ST.steerMark = {x: e.x, y: e.y, t: 0.9}; V.ring(e.x, e.y, 0.7, "#8fe9ff"); sfx("tick"); hz(4); }
    else if (k === "focus") { ST.focusMark = {x: e.x, y: e.y, t: 1.4}; V.ring(e.x, e.y, 1.6, "#ffd35a"); sfx("lock"); hz(6); }
    else if (k === "dash") { sfx("dash"); hz([8, 12, 8]); for (var i = 0; i < 6; i++) V.puff(e.x - e.dx * i * 0.28, e.y - e.dy * i * 0.28, 2, "#bff3ff", 24, 0.35); ST.trail.push({x: e.x, y: e.y, dx: e.dx, dy: e.dy, t: 0.35}); if (F) { F.shake(1.5); } }
    else if (k === "chan") { if (e.on) { sfx("charge"); hz([5, 5, 5, 5, 5]); } }
    else if (k === "rally") { sfx("horn"); hz([10, 30, 14]); V.ring(e.x, e.y, 1.4, "#7dffb0"); }
    else if (k === "march") { sfx("horn"); hz(10); }
    else if (k === "weak") { sfx("weak"); hz([16, 20, 30]); if (F) { F.shake(4); F.hitstop(0.05); F.flash && F.flash("#fff7c0", 0.2); } V.ring(e.x, e.y, 1.8, "#fff1a0"); V.float(e.x, e.y - 1.3, "WEAK POINT!", "#ffe65a"); for (var j = 0; j < 8; j++) V.puff(e.x, e.y, 2, "#fff7c0", 80, 0.5); }
    else if (k === "dodge") { sfx("dodge"); hz([12, 14, 22]); V.float(e.x, e.y - 1.2, e.perfect || e.pf ? "PERFECT DODGE!" : "DODGE!", e.perfect || e.pf ? "#ffe65a" : "#8fe9ff"); V.ring(e.x, e.y, 1.5, "#8fe9ff"); if (F && F.slow) F.slow(0.5, 0.18); }
    else if (k === "perf") { sfx("perfect"); hz([10, 10, 22]); V.float(e.x, e.y - 1.1, "PERFECT!", "#ffe65a"); V.ring(e.x, e.y, 1.2, "#ffe65a"); }
    else if (k === "skill") { if (e.bc || e.bs) V.float(e.x || 0, (e.y || 0) - 0.4, "+" + (e.bc ? e.bc + "c" : "") + (e.bs ? " " + e.bs + "s" : ""), "#ffd35a"); }
    else if (k === "beat") {
      ST.beatFlash = 0.25; if (e.good) { sfx("beat"); hz(12); (e.pts || []).forEach(function (q, i) { if (i < 6) { V.ring(q[0], q[1], 0.9, "#ffe65a"); V.puff(q[0], q[1], 2, "#ffe65a", 60, 0.4); } }); if (F) F.shake(1.2); }
      else { sfx("tick"); }
    }
    return false;
  };

  // ---------- overlays drawn in world space ----------
  TCH.draw = function (cx, gx, gy, T0) {
    var sim = V.sim, tt = V.t, calm = BB.S && BB.S.set && BB.S.set.calm, i;
    if (V.lift) { var b = V.lift.b, d = C.B[b.t]; cx.fillStyle = V.lift.ok ? "rgba(90,255,120,.38)" : "rgba(255,70,70,.42)"; cx.fillRect(gx + V.lift.tx * T0, gy + V.lift.ty * T0, d.w * T0, d.h * T0); cx.strokeStyle = V.lift.ok ? "#9dffb0" : "#ff8a8a"; cx.lineWidth = 1.2; cx.strokeRect(gx + V.lift.tx * T0, gy + V.lift.ty * T0, d.w * T0, d.h * T0); }
    pk.forEach(function (o) { if (o.got) return; cx.save(); cx.translate(o.x, o.y - o.z); cx.fillStyle = "rgba(0,0,0,.25)"; cx.beginPath(); cx.ellipse(0, o.z, 5, 2, 0, 0, 6.3); cx.fill(); var sp = Math.abs(Math.sin(tt * 6 + o.x)); cx.fillStyle = o.k === "c" ? "#ffd35a" : "#8fd4ff"; cx.strokeStyle = "#3a2a10"; cx.lineWidth = 1; cx.beginPath(); cx.ellipse(0, 0, 3.6 * (0.45 + sp * 0.55), 4.4, 0, 0, 6.3); cx.fill(); cx.stroke(); cx.restore(); });
    var cr = FXo() && FXo().amb && FXo().amb(); if (cr && V.mode !== "raid") { var bub = function (o, x, y) { if (o.sayT > 0 && o.say) { var w = 6 + o.say.length * 4.2, a = Math.min(1, o.sayT * 3); cx.save(); cx.globalAlpha = a; cx.translate(x, y - 14 - (1 - o.sayT) * 6); cx.fillStyle = "#fff"; cx.strokeStyle = "#2a2018"; cx.lineWidth = 1; cx.beginPath(); cx.roundRect ? cx.roundRect(-w / 2, -8, w, 12, 4) : cx.rect(-w / 2, -8, w, 12); cx.fill(); cx.stroke(); cx.fillStyle = "#2a2018"; cx.font = "bold 8px sans-serif"; cx.textAlign = "center"; cx.fillText(o.say, 0, 1); cx.restore(); } }; cr.an.forEach(function (o) { bub(o, o.x, o.y - (o.sz || 12) * 0.5); }); cr.wk.forEach(function (o) { bub(o, o.x, o.y - 6); }); }
    if (V.mode !== "raid" || !sim) return;
    // telegraphs
    for (i = 0; i < sim.tele.length; i++) {
      var p = sim.tele[i], x = gx + p.x * T0, y = gy + p.y * T0, r = p.r * T0, k = 1 - p.t / p.d, col = TELC[p.c] || "#ff4a3a", pul = calm ? 0.3 : 0.2 + 0.18 * Math.sin(tt * 18);
      cx.save(); cx.fillStyle = "rgba(255,60,40," + (pul + k * 0.2).toFixed(3) + ")"; cx.beginPath(); cx.arc(x, y, r, 0, 6.3); cx.fill(); cx.strokeStyle = col; cx.lineWidth = 2; cx.setLineDash([5, 4]); cx.lineDashOffset = -tt * 20; cx.beginPath(); cx.arc(x, y, r, 0, 6.3); cx.stroke(); cx.setLineDash([]);
      cx.fillStyle = "rgba(255,230,200," + (0.35 + k * 0.4).toFixed(2) + ")"; cx.beginPath(); cx.arc(x, y, r * k, 0, 6.3); cx.fill(); cx.fillStyle = "#fff"; cx.font = "bold 12px sans-serif"; cx.textAlign = "center"; cx.strokeStyle = "#a00"; cx.lineWidth = 3; cx.strokeText("!", x, y + 4); cx.fillText("!", x, y + 4); cx.restore();
    }
    // weak points
    sim.bld.forEach(function (b) { if (b.dead || !b.wkOpen || b.wkUsed === b.wkWin) return; var x = gx + b.cx * T0, y = gy + b.cy * T0, pu = 1 + (calm ? 0 : Math.sin(tt * 10) * 0.12); cx.save(); cx.strokeStyle = "#ffe65a"; cx.fillStyle = "rgba(255,230,90,.28)"; cx.lineWidth = 1.6; cx.beginPath(); cx.arc(x, y - 3, 8 * pu, 0, 6.3); cx.fill(); cx.stroke(); cx.beginPath(); cx.moveTo(x - 11, y - 3); cx.lineTo(x + 11, y - 3); cx.moveTo(x, y - 14); cx.lineTo(x, y + 8); cx.stroke(); cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(x, y - 3, 2, 0, 6.3); cx.fill(); cx.restore(); });
    // hero overlays
    var h = sim.heroU && sim.heroU();
    if (h && !h.dead) {
      var hx = gx + h.x * T0, hy = gy + h.y * T0;
      if (h.steer) { var sx = gx + h.steer[0] * T0, sy = gy + h.steer[1] * T0; cx.strokeStyle = "rgba(143,233,255,.7)"; cx.lineWidth = 1.2; cx.setLineDash([3, 4]); cx.beginPath(); cx.moveTo(hx, hy); cx.lineTo(sx, sy); cx.stroke(); cx.setLineDash([]); cx.beginPath(); cx.arc(sx, sy, 5 + Math.sin(tt * 8) * 1.2, 0, 6.3); cx.stroke(); }
      if (h.lock && !h.lock.dead) { var lx = gx + h.lock.cx * T0, ly = gy + h.lock.cy * T0, lr = Math.max(9, h.lock.w * T0 * 0.6 + 3); cx.strokeStyle = "#ffd35a"; cx.lineWidth = 1.6; for (var q = 0; q < 4; q++) { var an = q * 1.5708 + tt * 2; cx.beginPath(); cx.arc(lx, ly, lr, an, an + 0.9); cx.stroke(); } }
      if (h.inv > 0) { cx.strokeStyle = "rgba(143,233,255," + Math.min(1, h.inv * 4).toFixed(2) + ")"; cx.lineWidth = 2; cx.beginPath(); cx.arc(hx, hy - 4, 12, 0, 6.3); cx.stroke(); }
      if (h.chan > 0) { var cp = 1 - h.chan / 3; cx.strokeStyle = "rgba(255,181,49,.9)"; cx.lineWidth = 2.2; cx.beginPath(); cx.arc(hx, hy - 4, 14 + Math.sin(tt * 20) * 1.5, -1.57, -1.57 + 6.28 * (1 - cp)); cx.stroke(); }
      if (h.dcd > 0) { cx.strokeStyle = "rgba(255,255,255,.55)"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(hx, hy + 8, 6, 0, 6.28 * (1 - h.dcd / 1.5)); cx.stroke(); }
    }
    if (ST.focusMark && ST.focusMark.t > 0) { cx.strokeStyle = "rgba(255,211,90," + Math.min(1, ST.focusMark.t).toFixed(2) + ")"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(gx + ST.focusMark.x * T0, gy + ST.focusMark.y * T0, 14 + (1.4 - ST.focusMark.t) * 10, 0, 6.3); cx.stroke(); }
    if (ST.steerMark && ST.steerMark.t > 0) { var sm = ST.steerMark, al = Math.min(1, sm.t * 2); cx.strokeStyle = "rgba(143,233,255," + al.toFixed(2) + ")"; cx.lineWidth = 2; cx.beginPath(); cx.arc(gx + sm.x * T0, gy + sm.y * T0, 4 + (0.9 - sm.t) * 18, 0, 6.3); cx.stroke(); }
    if (ST.rally && ST.rally.t > 0) { var rl = ST.rally, rx = gx + rl.x * T0, ry = gy + rl.y * T0; cx.strokeStyle = "#7dffb0"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(rx, ry + 6); cx.lineTo(rx, ry - 16); cx.stroke(); cx.fillStyle = "#7dffb0"; cx.beginPath(); cx.moveTo(rx, ry - 16); cx.lineTo(rx + 12, ry - 12 + Math.sin(tt * 7) * 1.5); cx.lineTo(rx, ry - 7); cx.fill(); cx.globalAlpha = 0.25; cx.beginPath(); cx.arc(rx, ry, 20, 0, 6.3); cx.fill(); cx.globalAlpha = 1; }
    if (ST.mpath && ST.mpath.p.length) { cx.strokeStyle = "rgba(125,255,176," + Math.min(1, ST.mpath.t).toFixed(2) + ")"; cx.lineWidth = 2.4; cx.setLineDash([5, 4]); cx.lineDashOffset = -tt * 24; cx.beginPath(); ST.mpath.p.forEach(function (q, j) { var x2 = gx + q[0] * T0, y2 = gy + q[1] * T0; if (!j) cx.moveTo(x2, y2); else cx.lineTo(x2, y2); }); cx.stroke(); cx.setLineDash([]); var ep = ST.mpath.p[ST.mpath.p.length - 1]; cx.fillStyle = "#7dffb0"; cx.beginPath(); cx.arc(gx + ep[0] * T0, gy + ep[1] * T0, 3.5, 0, 6.3); cx.fill(); }
    if (ST.path && ST.path.length > 1) { cx.strokeStyle = "rgba(255,225,80,.8)"; cx.lineWidth = 2; cx.setLineDash([2, 4]); cx.beginPath(); ST.path.forEach(function (q, j) { var x2 = gx + q[0] * T0, y2 = gy + q[1] * T0; if (!j) cx.moveTo(x2, y2); else cx.lineTo(x2, y2); }); cx.stroke(); cx.setLineDash([]); }
    if (ST.aim) { var a = ST.aim, ax = gx + a.x * T0, ay = gy + a.y * T0, col2 = C.SP[a.k].col, rr = 3 * T0; cx.save(); cx.fillStyle = col2; cx.globalAlpha = 0.2 + (calm ? 0 : 0.06 * Math.sin(tt * 10)); cx.beginPath(); cx.arc(ax, ay, rr, 0, 6.3); cx.fill(); cx.globalAlpha = 0.95; cx.strokeStyle = col2; cx.lineWidth = 2; cx.setLineDash([6, 4]); cx.lineDashOffset = -tt * 18; cx.beginPath(); cx.arc(ax, ay, rr, 0, 6.3); cx.stroke(); cx.setLineDash([]); cx.beginPath(); cx.moveTo(ax - 8, ay); cx.lineTo(ax + 8, ay); cx.moveTo(ax, ay - 8); cx.lineTo(ax, ay + 8); cx.stroke(); cx.restore(); }
    ST.fly.forEach(function (f) { var k2 = Math.min(1, f.t / f.d), x2 = f.x0 + (f.x1 - f.x0) * k2, y2 = f.y0 + (f.y1 - f.y0) * k2, arc = Math.sin(k2 * 3.1416) * 28; cx.fillStyle = "rgba(0,0,0,.25)"; cx.beginPath(); cx.ellipse(gx + x2 * T0, gy + y2 * T0, 5, 2.5, 0, 0, 6.3); cx.fill(); cx.fillStyle = C.SP[f.k].col; cx.strokeStyle = "#fff"; cx.lineWidth = 1.2; cx.beginPath(); cx.arc(gx + x2 * T0, gy + y2 * T0 - arc, 5, 0, 6.3); cx.fill(); cx.stroke(); cx.strokeStyle = "rgba(255,255,255,.35)"; cx.beginPath(); cx.arc(gx + f.x1 * T0, gy + f.y1 * T0, 3 * T0, 0, 6.3); cx.setLineDash([4, 4]); cx.stroke(); cx.setLineDash([]); });
    ST.trail.forEach(function (tr) { cx.strokeStyle = "rgba(191,243,255," + (tr.t * 2).toFixed(2) + ")"; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(gx + tr.x * T0, gy + tr.y * T0 - 4); cx.lineTo(gx + (tr.x + tr.dx * 2.1) * T0, gy + (tr.y + tr.dy * 2.1) * T0 - 4); cx.stroke(); });
    if (ST.mag && ST.mag.t > 0) { cx.fillStyle = "rgba(160,220,255," + (ST.mag.t * 0.4).toFixed(2) + ")"; cx.beginPath(); cx.arc(ST.mag.x, ST.mag.y, 18 * (1.2 - ST.mag.t * 0.4), 0, 6.3); cx.fill(); }
  };

  // ---------- timing helpers ----------
  var PERIOD = 1100;
  TCH.perfNow = function () { var t = now() % PERIOD; return t >= 880 || t < 45; };
  TCH.perfFx = function (u) { /* sim emits "perf" for the burst; add a client sparkle + haptic */ ST.perfT = 0.3; };
  var ringEl = null, beatEl = null, autoT = 0, autoN = 0, autoSp = 0;
  function ensureDom() {
    var host = document.getElementById("base") || document.body;
    if (!ringEl) { ringEl = document.createElement("div"); ringEl.id = "pring"; ringEl.innerHTML = "<i></i>"; ringEl.style.display = "none"; host.appendChild(ringEl); }
    if (!beatEl) {
      beatEl = document.createElement("button"); beatEl.id = "r-beat"; beatEl.innerHTML = "<i></i><b>TAP ON THE BEAT</b>"; beatEl.style.display = "none"; host.appendChild(beatEl);
      beatEl.addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); var r = live(); if (r && X().rAct({k: "beat"})) { beatEl.classList.remove("hit"); void beatEl.offsetWidth; beatEl.classList.add("hit"); } });
    }
  }

  // ---------- simple controls: auto-battle driver using only recorded primitives ----------
  function simpleDrive(r, dt) {
    var s = r.sim; autoT -= dt; if (autoT > 0) return; autoT = 0.5; if ((r.auto === 2 || simple()) && BB.SQ && BB.SQ.autoBurst) BB.SQ.autoBurst(r);
    var h = s.heroU(), defs = [], i, cxs = 0, cys = 0; s.bld.forEach(function (b) { if (!b.dead && b.kind === "def") { defs.push(b); cxs += b.cx; cys += b.cy; } });
    var tx = defs.length ? cxs / defs.length : N / 2, ty = defs.length ? cys / defs.length : N / 2;
    if (!h && !r.hero && cc().heroHp > 0.2 && !r.noHero) { r.sel = {t: "h", k: "hero"}; edgeDeploy(r, tx, ty, 0); return; }
    var k = null; C.UORDER.forEach(function (q) { if (!k && (r.army[q] || 0) > 0) k = q; });
    if (k) { r.sel = {t: "u", k: k}; var n = 0; while (n < 3 && (r.army[k] || 0) > 0) { edgeDeploy(r, tx, ty, autoN++); n++; } }
    var ab = document.getElementById("r-ab"); if (ab && !ab.classList.contains("zero") && s.charge >= 99.9) { ab.click(); }
    if (s.charge >= 99.9 && !s.ps) X().psTap && X().psTap();
    autoSp -= 0.5; if (autoSp <= 0) { autoSp = 9; var sk = null; C.SPORDER.forEach(function (q) { if (!sk && (r.spl[q] || 0) > 0) sk = q; }); if (sk && defs.length) { var tb = defs[(autoN++) % defs.length]; X().castSpell(sk, tb.cx, tb.cy); } }
    FXo() && s.pus.forEach(function (o) { if (o && !o.got && X().puTap) X().puTap(o.id); });
    if (h && !h.lock && defs.length && autoN % 5 === 0) { var tb2 = defs[autoN % defs.length]; X().rAct({k: "hfocus", b: tb2.i}); }
  }
  function edgeDeploy(r, tx, ty, n) {
    var side = n % 4, m = 0.5, x, y, lat = (n * 1.7) % 6 - 3; if (side === 0) { x = m; y = ty + lat; } else if (side === 1) { x = N - m; y = ty + lat; } else if (side === 2) { y = m; x = tx + lat; } else { y = N - m; x = tx + lat; }
    x = clampT(x); y = clampT(y); if (!r.sim.canDeploy(x, y)) { x = m; y = clampT(ty); } V.cb.raidTap && V.cb.raidTap(x, y, true);
  }

  // ---------- per frame ----------
  var holdScan = 0;
  TCH.update = function (dt) {
    var i, k;
    if (hintT > 0) { hintT -= dt; if (hintT <= 0 && hintEl) hintEl.className = ""; }
    ensureDom(); var sm = !!BB.S.set.simple; if (document.body.classList.contains("simple") !== sm) document.body.classList.toggle("simple", sm);
    var R = V.mode === "raid" ? raid() : null, lr = live();
    // hold detection
    for (k in ptr) { var p = ptr[k]; if (!p.hd && !p.moved && p.mode !== "dead" && p.mode !== "legacy") { var el = now() - p.t0; if (V.mode === "raid" ? (el >= 420 && p.mode === "ctl") : (el >= 400 && p.mode === "pending")) { p.hd = 1; if (V.mode === "raid") raidHold(p); else baseHold(p); } } }
    // timers
    ["steerMark", "focusMark", "rally", "mag"].forEach(function (n) { var o = ST[n]; if (o && o.t > 0) o.t -= dt; });
    if (ST.mpath && ST.mpath.t > 0 && ST.mpath.t < 9) ST.mpath.t -= dt; if (ST.beatFlash > 0) ST.beatFlash -= dt; if (ST.perfT > 0) ST.perfT -= dt;
    for (i = ST.trail.length - 1; i >= 0; i--) { ST.trail[i].t -= dt; if (ST.trail[i].t <= 0) ST.trail.splice(i, 1); }
    for (i = ST.fly.length - 1; i >= 0; i--) { var f = ST.fly[i]; f.t += dt; if (f.t >= f.d) { ST.fly.splice(i, 1); if (live()) X().castSpell(f.k, f.x1, f.y1); } }
    // pickups
    var g = dims(); for (i = pk.length - 1; i >= 0; i--) { var o = pk[i]; if (o.got) { pk.splice(i, 1); continue; } o.t += dt; if (o.z > 0 || o.vz > 0) { o.vz -= 420 * dt; o.z += o.vz * dt; o.x += o.vx * dt; if (o.z < 0) { o.z = 0; o.vz = -o.vz * 0.4; o.vx *= 0.6; if (Math.abs(o.vz) < 25) o.vz = 0; } } o.x = Math.max(8, Math.min(352, o.x)); if (o.t > 14) o.got = 1; }
    // building offsets (lift follows finger, drops settle with a bounce)
    for (k in V.offs) { var q = V.offs[k], b = null; if (V.lift && V.lift.id == k) { b = V.lift.b; q.dx += (V.lift.fx - b.x - q.dx) * Math.min(1, dt * 22); q.dy += (V.lift.fy - b.y - q.dy) * Math.min(1, dt * 22); q.z += (7 - q.z) * Math.min(1, dt * 18); q.settle = 0; }
      else { q.dx -= q.dx * Math.min(1, dt * 14); q.dy -= q.dy * Math.min(1, dt * 14); if (q.settle) { q.vz = (q.vz || 0) - 260 * dt; q.z += q.vz * dt; if (q.z <= 0) { q.z = 0; q.vz = Math.abs(q.vz) > 40 ? -q.vz * 0.35 : 0; } } else q.z *= 0.8; if (Math.abs(q.dx) < 0.01 && Math.abs(q.dy) < 0.01 && q.z < 0.2 && !q.vz) delete V.offs[k]; } }
    // perfect ring over the selected deploy button
    var show = false;
    if (lr && lr.sel && (lr.sel.t === "u" || lr.sel.t === "h") && !simple()) {
      var btn = document.querySelector("#r-bar .tb.sel"); if (btn) { var rc = btn.getBoundingClientRect(), t = now() % PERIOD / PERIOD, sc = 2.4 - 1.4 * t, good = TCH.perfNow(); ringEl.style.display = "block"; ringEl.style.left = (rc.left + rc.width / 2 - 28) + "px"; ringEl.style.top = (rc.top + rc.height / 2 - 28) + "px"; ringEl.firstChild.style.transform = "scale(" + sc.toFixed(3) + ")"; ringEl.className = good ? "good" : ""; show = true; if (lr.sel.t === "u" && !(lr.army[lr.sel.k] > 0)) show = false; }
    }
    if (!show) ringEl.style.display = "none";
    // beat pad
    var bp = lr && lr.sim.ps > 0 && !simple();
    if (bp) { var ph = ((lr.sim.t - lr.sim.psT) % 0.5) / 0.5, off = Math.min(ph, 1 - ph) * 0.5; beatEl.style.display = "flex"; beatEl.firstChild.style.transform = "scale(" + (1 + (1 - ph) * 1.1).toFixed(3) + ")"; beatEl.className = (off <= 0.15 ? "good" : ""); TCH.hint("beat", "Power Surge: tap the pad on the beat for a bigger surge", 4200); }
    else beatEl.style.display = "none";
    if (lr && (simple() || lr.auto > 0)) simpleDrive(lr, dt);
    sensorStep(dt);
  };

  // ---------- sensors: tilt parallax + shake-to-collect ----------
  var sens = {on: false, tx: 0, ty: 0, last: 0, shakeT: 0, ask: false};
  function initSensors() {
    window.addEventListener("deviceorientation", function (e) { if (!S().set || S().set.tilt === false || S().set.calm) { sens.tx = sens.ty = 0; return; } if (e.gamma == null) return; sens.on = true; sens.tx = Math.max(-1, Math.min(1, (e.gamma || 0) / 25)); sens.ty = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 25)); });
    window.addEventListener("devicemotion", function (e) { if (!S().set || S().set.tilt === false) return; var a = e.accelerationIncludingGravity; if (!a) return; var m = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0), t = now(); if (sens.lastM && Math.abs(m - sens.lastM) > 22 && t - sens.shakeT > 1500) { sens.shakeT = t; TCH.shake(); } sens.lastM = m; });
    document.addEventListener("pointerdown", function () { if (sens.ask) return; sens.ask = true; try { if (window.DeviceMotionEvent && DeviceMotionEvent.requestPermission && S().set && S().set.tilt !== false) { DeviceMotionEvent.requestPermission().catch(function () {}); } if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission && S().set && S().set.tilt !== false) DeviceOrientationEvent.requestPermission().catch(function () {}); } catch (x) {} }, {once: true, capture: true});
  }
  function sensorStep(dt) { var tl = V.tilt, k = Math.min(1, dt * 6); var tx = sens.on ? sens.tx : (tl.mx || 0), ty = sens.on ? sens.ty : (tl.my || 0); tl.x += (tx - tl.x) * k; tl.y += (ty - tl.y) * k; }
  TCH.shake = function () {
    if (V.mode !== "base" || !cc()) return false; var n = X().collectAll("shake"); if (n) hz([30, 30, 30, 30, 60]); return n;
  };
  TCH.tiltFake = function (x, y) { V.tilt.mx = x; V.tilt.my = y; }; // test hook when no sensors exist

  // ---------- upgrade crank (drag the handle across; haptic notches; release early to snap back) ----------
  document.addEventListener("pointerdown", function (e) {
    var cr = e.target.closest && e.target.closest(".crank"); if (!cr) return; e.preventDefault(); var knob = cr.firstElementChild, rc = cr.getBoundingClientRect(), id = +cr.dataset.crank, w = rc.width - 40, x0 = e.clientX, lastN = 0, done = false;
    try { cr.setPointerCapture(e.pointerId); } catch (x) {} cr.classList.add("on");
    function mv(ev) { if (done) return; var d = Math.max(0, Math.min(w, ev.clientX - x0)), f = d / w; knob.style.transform = "translateX(" + d + "px) rotate(" + (d * 4) + "deg)"; cr.style.setProperty("--p", (f * 100).toFixed(0) + "%"); var n = Math.floor(f * 8); if (n !== lastN) { lastN = n; sfx("crank"); hz(5); } if (f >= 0.97) { done = true; cr.classList.remove("on"); var b = X().findB && X().findB(id); if (!b) b = cc().bld.filter(function (q) { return q.id === id; })[0]; if (b && X().crank(b)) { hz([20, 30, 50]); V.puff(b.x + 1, b.y + 1, 14, "#ffd35a", 90, 0.6); BB.FX && BB.FX.shake(3); } X().selBar && X().selBar(); } }
    function up() { cr.removeEventListener("pointermove", mv); cr.removeEventListener("pointerup", up); cr.removeEventListener("pointercancel", up); if (!done) { cr.classList.remove("on"); knob.style.transform = ""; cr.style.setProperty("--p", "0%"); } }
    cr.addEventListener("pointermove", mv); cr.addEventListener("pointerup", up); cr.addEventListener("pointercancel", up);
  }, true);
})();
