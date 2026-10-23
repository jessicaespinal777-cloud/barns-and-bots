"use strict";
// ---- v0.6 JUICE ENGINE: pooled particles, trails, bolts, beams, camera (shake / hit-stop / slow-mo / zoom),
// unit animation, turret recoil, damage stages, collapses, power-up orbs, combo + Power Surge visuals, ambient base life.
// Purely visual: nothing here changes the deterministic sim (replays stay identical). All procedural, no new art.
(function () {
  var C = BB.CC, V = BB.CCV, T = C.T, N = C.GRID, FX = BB.FX = {}, TAU = 6.2832, G = null;
  FX.q = 1;
  function calm() { return !!(BB.S && BB.S.set && BB.S.set.calm); }
  function R(a, b) { return a + Math.random() * (b - a); }
  function qn(n) { return Math.max(1, Math.round(n * FX.q * (calm() ? 0.5 : 1))); }
  function px(x) { return G.gx + x * T; } function py(y) { return G.gy + y * T; }
  function sfx(n, a) { BB.sfx && BB.sfx(n, a); }
  function ease(f) { return 1 - Math.pow(1 - f, 3); }
  function back(f) { var c = 1.7; return 1 + (c + 1) * Math.pow(f - 1, 3) + c * Math.pow(f - 1, 2); }
  var TIER = [null, {n: "FRENZY", c: "#ffb531"}, {n: "OVERDRIVE", c: "#ff5ad0"}, {n: "RAMPAGE", c: "#5af0ff"}];
  var PUI = {rage: {n: "TURBO", c: "#ff8a3a"}, shield: {n: "BUBBLE SHIELD", c: "#6fe0ff"}, heal: {n: "PULSE HEAL", c: "#7dff9a"}, burst: {n: "LOOT BURST", c: "#ffd35a"}, chain: {n: "SPARK CHAIN", c: "#fff06a"}};
  FX.PUI = PUI; FX.TIER = TIER; FX.R = R; FX.calm = calm; FX.ease = ease; FX.back = back;

  // ---- camera ----
  var cam = FX.cam = {z: 1, tz: 1, zh: 0, fx: 180, fy: 350, shake: 0, hs: 0, slowV: 1, slowT: 0};
  FX.shake = function (a) { cam.shake = Math.max(cam.shake, a * (calm() ? 0.25 : 1)); };
  FX.hitstop = function (s) { if (!calm()) cam.hs = Math.max(cam.hs, s); };
  FX.slow = function (v, s) { if (!calm()) { cam.slowV = v; cam.slowT = Math.max(cam.slowT, s); } };
  FX.zoom = function (z, fx, fy, hold) { if (calm()) z = 1 + (z - 1) * 0.25; cam.tz = z; cam.zh = hold || 0.5; if (fx !== undefined) { cam.fx = fx; cam.fy = fy; } };
  var ovFlash = FX.ovFlash = {a: 0, c: "#fff"};
  FX.flash = function (c, a) { if (calm()) return; ovFlash.c = c; ovFlash.a = Math.max(ovFlash.a, a); };
  FX.step = function (rdt) {
    cam.shake *= Math.pow(0.0009, rdt); if (cam.shake < 0.05) cam.shake = 0;
    var sc = 1; if (cam.hs > 0) { cam.hs -= rdt; sc = 0.04; } else if (cam.slowT > 0) { cam.slowT -= rdt; sc = cam.slowV; if (cam.slowT <= 0) cam.slowV = 1; }
    if (cam.zh > 0) { cam.zh -= rdt; if (cam.zh <= 0) cam.tz = 1; }
    cam.z += (cam.tz - cam.z) * Math.min(1, rdt * (cam.tz > cam.z ? 9 : 5)); if (Math.abs(cam.z - 1) < 0.002 && cam.tz === 1) cam.z = 1;
    ovFlash.a = Math.max(0, ovFlash.a - rdt * 2.4);
    return sc;
  };
  FX.camReset = function () { cam.z = cam.tz = 1; cam.zh = 0; cam.shake = 0; cam.hs = 0; cam.slowT = 0; cam.slowV = 1; ovFlash.a = 0; };

  // ---- pools ----
  var PCAP = 380, P = [], live = 0, pfree = 0, i0;
  for (i0 = 0; i0 < PCAP; i0++) P.push({on: 0});
  function cap() { return calm() ? 170 : FX.q < 0.8 ? 230 : PCAP; }
  // ty: 0 dot, 1 streak, 2 smoke, 3 glow(add), 4 debris/confetti rect, 5 flame(add), 6 star(add)
  function sp(x, y, o) {
    if (live >= cap()) return null; var p = null, k;
    for (k = 0; k < PCAP; k++) { var j = (pfree + k) % PCAP; if (!P[j].on) { p = P[j]; pfree = (j + 1) % PCAP; break; } }
    if (!p) return null; live++;
    p.on = 1; p.x = x; p.y = y; p.vx = o.vx || 0; p.vy = o.vy || 0; p.g = o.g || 0; p.l = p.m = o.l || 0.6; p.r = o.r || 2; p.c = o.c || "#fff"; p.ty = o.ty || 0; p.rot = o.rot || 0; p.vr = o.vr || 0; p.grow = o.grow || 0; p.drag = o.drag || 0; p.al = o.al === undefined ? 1 : o.al;
    return p;
  }
  FX.sp = sp;
  function burst(x, y, n, o) {
    n = qn(n);
    for (var i = 0; i < n; i++) {
      var a = o.a0 !== undefined ? R(o.a0, o.a1) : Math.random() * TAU, s = R(o.s0 || 20, o.s1 || 60);
      sp(x + R(-(o.j || 0), o.j || 0), y + R(-(o.j || 0), o.j || 0), {vx: Math.cos(a) * s, vy: Math.sin(a) * s + (o.up || 0), g: o.g, l: R(o.l0 || 0.4, o.l1 || 0.8), r: R(o.r0 || 1.2, o.r1 || 2.6), c: o.cols ? o.cols[(Math.random() * o.cols.length) | 0] : o.c, ty: o.ty, rot: Math.random() * TAU, vr: R(-9, 9), grow: o.grow, drag: o.drag});
    }
  }
  FX.burst = burst;
  var rings = [], bolts = [], beams = [], projs = [], ghosts = [], colls = [], crows = [], nums = [], meteors = [], later = [], tors = [];
  function pushCap(arr, o, m) { if (arr.length >= m) arr.shift(); arr.push(o); return o; }
  function addRing(x, y, r, c, o) { o = o || {}; pushCap(rings, {x: x, y: y, r: r, c: c, t: 0, d: o.d || 0.5, w: o.w || 2.5, fill: o.fill || 0, add: o.add}, 34); }
  FX.later = function (d, fn) { if (later.length < 40) later.push({d: d, fn: fn}); };
  FX.num = function (x, y, txt, col, sc, o) { o = o || {}; pushCap(nums, {x: x + R(-4, 4), y: y, s: String(txt), c: col, z: sc || 1, t: 0, d: o.d || 0.9, crit: o.crit}, calm() ? 14 : 30); };
  // overrides of the v0.5 cheap helpers: everything now goes through the pools and caps
  V.puff = function (x, y, n, col, spd, life) { if (!G) return; burst(px(x), py(y), n, {s0: (spd || 30) * 0.3, s1: (spd || 30) * 1.2, up: -10, g: 25, l0: (life || 0.6) * 0.6, l1: (life || 0.6) * 1.3, r0: 1.5, r1: 4, c: col || "#d9c9a0", ty: 2, grow: 5}); };
  V.ring = function (x, y, r, col) { if (G) addRing(px(x), py(y), r * T, col || "#fff", {d: 0.5}); };
  V.float = function (x, y, txt, col) { if (G) FX.num(px(x), py(y), txt, col || "#fff", 1); };

  // ---- bolts / beams / projectiles ----
  function jag(x1, y1, x2, y2, segs, amp) {
    var pts = [[x1, y1]], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    for (var i = 1; i < segs; i++) { var f = i / segs, o = R(-amp, amp); pts.push([x1 + dx * f + nx * o, y1 + dy * f + ny * o]); } pts.push([x2, y2]); return pts;
  }
  FX.bolt = function (x1, y1, x2, y2, c, o) { o = o || {}; var L = Math.hypot(x2 - x1, y2 - y1), sg = Math.max(4, Math.min(11, (L / 14) | 0)); pushCap(bolts, {a: jag(x1, y1, x2, y2, sg, o.amp || 7), b: jag(x1, y1, x2, y2, sg, o.amp || 7), t: 0, d: o.d || 0.28, c: c || "#bff4ff", w: o.w || 2}, 26); };
  FX.beam = function (x1, y1, x2, y2, c, o) { o = o || {}; pushCap(beams, {x1: x1, y1: y1, x2: x2, y2: y2, c: c, t: 0, d: o.d || 0.3, w: o.w || 3}, 12); burst(x2, y2, 6, {s0: 30, s1: 90, l0: 0.2, l1: 0.45, r0: 1, r1: 2, c: c, ty: 3, g: 60}); };
  var PCOL = {blaster: ["#ffd35a", "#fff3b0"], sniper: ["#e8fcff", "#7fe8ff"], lobber: ["#7a6a5a", "#ffb060"], flak: ["#ff5ad0", "#ffc4f0"], bolt: ["#ffe8a0", "#fff"], scx: ["#46e6d2", "#d8fff8"], troop: ["#9fe8ff", "#fff"]};
  function addProj(x1, y1, x2, y2, kind, d, o) {
    o = o || {}; var al = V.theme === "a", pc = PCOL[kind] || PCOL.blaster; if (al && kind === "blaster") pc = ["#9aff4a", "#e8ffc0"]; if (al && kind === "lobber") pc = ["#7aff3a", "#d8ff90"];
    pushCap(projs, {x1: x1, y1: y1, x2: x2, y2: y2, k: kind, t: 0, d: d, c: pc[0], c2: pc[1], arc: o.arc || 0, tr: [], spl: o.spl || 0}, 60);
  }
  function projImpact(q) {
    var x = q.x2, y = q.y2;
    if (q.k === "lobber") { addRing(x, y, (q.spl || 1.4) * T, "#ff8a3a", {d: 0.45, fill: 1}); burst(x, y, 12, {s0: 30, s1: 100, g: 90, l0: 0.3, l1: 0.7, r0: 1.5, r1: 3, cols: ["#ff9a3a", "#ffd35a", "#6b4b30"], ty: 4}); burst(x, y, 5, {s0: 10, s1: 40, l0: 0.5, l1: 0.9, r0: 3, r1: 6, c: "rgba(90,80,70,.7)", ty: 2, up: -20, grow: 8}); sp(x, y, {l: 0.25, r: 10, c: "#ffb060", ty: 3}); FX.shake(2.2); }
    else if (q.k === "flak") { burst(x, y, 10, {s0: 30, s1: 90, l0: 0.2, l1: 0.5, r0: 1, r1: 2.5, cols: ["#ff5ad0", "#ffc4f0", "#fff"], ty: 3}); addRing(x, y, 14, "#ff7ad8", {d: 0.3}); }
    else if (q.k === "sniper") burst(x, y, 6, {s0: 40, s1: 110, l0: 0.15, l1: 0.35, r0: 1, r1: 2, c: "#bff4ff", ty: 1});
    else burst(x, y, 5, {s0: 30, s1: 80, l0: 0.15, l1: 0.35, r0: 1, r1: 2, c: q.c, ty: 3});
  }
  function muzzle(x, y, ang, c, big) {
    burst(x, y, big ? 9 : 5, {a0: ang - 0.45, a1: ang + 0.45, s0: 50, s1: 130, l0: 0.08, l1: 0.2, r0: 1.2, r1: 2.4, c: c, ty: 1});
    sp(x, y, {l: 0.09, r: big ? 9 : 6, c: "#fff6c0", ty: 3}); sp(x, y, {l: 0.14, r: big ? 14 : 9, c: c, ty: 3, al: 0.6});
  }
  // ---- big effect builders ----
  function banner(txt, col, sub, o) { FX.banner && FX.banner(txt, col, sub, o); }
  function lightningStorm(x, y, rad) {
    var n = calm() ? 2 : 4; for (var i = 0; i < n; i++) (function (i) { FX.later(i * 0.07, function () { var a = Math.random() * TAU, d = Math.random() * rad, tx = x + Math.cos(a) * d, ty = y + Math.sin(a) * d * 0.7; FX.bolt(tx + R(-30, 30), ty - 240, tx, ty, "#fff6a0", {w: 2.6, amp: 14, d: 0.32}); burst(tx, ty, 8, {s0: 40, s1: 120, l0: 0.2, l1: 0.5, r0: 1, r1: 2.4, c: "#fff06a", ty: 3, g: 50}); addRing(tx, ty, 14, "#fff06a", {d: 0.3}); }); })(i);
  }
  FX.meteors = function (x, y, rad, n, kind) {
    n = calm() ? Math.min(n, 4) : n;
    for (var i = 0; i < n; i++) (function (i) { FX.later(i * 0.085, function () { var a = Math.random() * TAU, d = Math.sqrt(Math.random()) * rad, tx = x + Math.cos(a) * d, ty = y + Math.sin(a) * d * 0.8; pushCap(meteors, {x: tx - 70, y: ty - 260, tx: tx, ty: ty, t: 0, d: 0.34, k: kind, rot: Math.random() * TAU}, 18); sfx("meteor"); }); })(i);
  };
  function meteorHit(m) {
    addRing(m.tx, m.ty, 18, m.k === "hay" ? "#e8c050" : "#ff8a3a", {d: 0.4, fill: 1});
    burst(m.tx, m.ty, 10, {s0: 30, s1: 100, g: 110, l0: 0.3, l1: 0.7, r0: 1.5, r1: 3, cols: m.k === "hay" ? ["#e8c050", "#c89a30", "#fff0b0"] : ["#ff8a3a", "#ffd35a", "#5a4030"], ty: 4});
    burst(m.tx, m.ty, 4, {s0: 6, s1: 25, l0: 0.5, l1: 0.9, r0: 3, r1: 6, c: "rgba(110,95,80,.7)", ty: 2, up: -18, grow: 7}); FX.shake(2.5); sfx("thud");
  }
  FX.tornado = function (x, y, dur) { pushCap(tors, {x: x, y: y, t: 0, d: dur || 2.6}, 4); sfx("tornado"); };
  FX.slamFx = function (x, y) {
    addRing(x, y, 52, "#ffb531", {d: 0.6, w: 4, fill: 1}); addRing(x, y, 80, "#fff3c0", {d: 0.75, w: 2});
    burst(x, y, 22, {s0: 60, s1: 170, g: 150, l0: 0.4, l1: 0.9, r0: 1.5, r1: 3.5, cols: ["#e8c050", "#c89a30", "#8a6a40"], ty: 4});
    burst(x, y, 10, {s0: 20, s1: 70, l0: 0.5, l1: 1, r0: 4, r1: 8, c: "rgba(150,125,95,.65)", ty: 2, up: -14, grow: 9});
    FX.meteors(x, y, 3.2 * T, 9, "hay"); FX.shake(7); FX.hitstop(0.06); FX.slow(0.35, 0.4); FX.zoom(1.12, x, y, 0.45); FX.flash("#ffe9a0", 0.35); sfx("slam"); BB.vibe && BB.vibe([30, 30, 60]);
  };
  FX.crowsFx = function (hx, hy, tg) {
    var X0 = px(hx), Y0 = py(hy), n = qn(calm() ? 22 : 54), i, tt = (tg && tg.length) ? tg : [[hx, hy - 4]];
    for (i = 0; i < n && crows.length < 90; i++) { var T2 = tt[i % tt.length]; crows.push({hx: X0, hy: Y0, tx: px(T2[0]), ty: py(T2[1]), delay: R(0, 0.5), t: 0, d: R(1.0, 1.5), ph: Math.random() * TAU, rad: R(14, 62), dir: Math.random() < 0.5 ? 1 : -1, hit: 0, trl: []}); }
    for (i = 0; i < qn(calm() ? 6 : 22) && crows.length < 90; i++) { crows.push({hx: X0, hy: Y0, tx: R(10, window.innerWidth - 10), ty: R(60, window.innerHeight - 120), delay: R(0, 0.7), t: 0, d: R(1.2, 1.9), ph: Math.random() * TAU, rad: R(30, 90), dir: Math.random() < 0.5 ? 1 : -1, hit: 0, trl: []}); }
    FX.zoom(1.22, X0, Y0 - 10, 1.5); FX.slow(0.45, 1.0); FX.shake(3); FX.dark = {t: 0, d: 2.2}; sfx("crows"); BB.vibe && BB.vibe([20, 40, 20, 40, 40]);
    banner("MURDER OF CROWS", "#46e6d2", "Scarecrow-X unleashes the flock", {big: 1}); addRing(X0, Y0, 70, "#46e6d2", {d: 0.7, w: 3});
  };
  FX.heroEntrance = function (x, y, hid) {
    var X0 = px(x), Y0 = py(y), H = C.HEROES[hid] || C.HEROES.bale, sc = hid === "scx";
    FX.bolt(X0 + 8, Y0 - 330, X0, Y0, sc ? "#9ffff0" : "#ffe9a0", {w: 3.4, amp: 18, d: 0.45});
    addRing(X0, Y0, 46, sc ? "#46e6d2" : "#ffd35a", {d: 0.7, w: 4, fill: 1}); addRing(X0, Y0, 78, "#fff", {d: 0.9, w: 2});
    burst(X0, Y0, 22, {s0: 40, s1: 140, g: 100, l0: 0.4, l1: 0.9, r0: 1.5, r1: 3, cols: sc ? ["#46e6d2", "#fff", "#2a2438"] : ["#ffd35a", "#fff", "#c89a30"], ty: 4});
    burst(X0, Y0, 9, {s0: 10, s1: 50, l0: 0.5, l1: 1, r0: 4, r1: 8, c: "rgba(160,140,110,.6)", ty: 2, up: -12, grow: 9});
    FX.shake(5); FX.hitstop(0.05); FX.slow(0.4, 0.45); FX.zoom(1.14, X0, Y0, 0.6); FX.flash("#fff", 0.4); sfx("roar"); BB.vibe && BB.vibe([40, 30, 80]);
    banner(H.name.toUpperCase(), sc ? "#46e6d2" : "#ffd35a", "enters the field");
  };
  FX.spell = function (kind, x, y) {
    var X0 = px(x), Y0 = py(y);
    if (kind === "boost") { addRing(X0, Y0, 3 * T, "#ff9a3c", {d: 0.7, w: 4, fill: 1, add: 1}); FX.tornado(X0, Y0, 2.4); for (var i = 0; i < 3; i++) (function (i) { FX.later(i * 0.15, function () { addRing(X0, Y0, (1.2 + i * 0.9) * T, "#ffb060", {d: 0.5, w: 2, add: 1}); }); })(i); burst(X0, Y0, 16, {s0: 30, s1: 90, up: -40, l0: 0.5, l1: 1.1, r0: 1.5, r1: 3, c: "#ff9a3c", ty: 5}); sfx("fire"); }
    else if (kind === "rain") { addRing(X0, Y0, 3 * T, "#5ec8ff", {d: 0.6, w: 3, fill: 1}); burst(X0, Y0 - 40, 14, {a0: 1.4, a1: 1.7, s0: 90, s1: 160, l0: 0.3, l1: 0.5, r0: 1, r1: 1.8, c: "#aee8ff", ty: 1}); sfx("whoosh"); }
    else if (kind === "veil") { addRing(X0, Y0, 3 * T, "#c9b8ff", {d: 0.8, w: 3, fill: 1, add: 1}); burst(X0, Y0, 14, {s0: 10, s1: 60, up: -30, l0: 0.6, l1: 1.2, r0: 1.5, r1: 3, c: "#e0d4ff", ty: 3}); sfx("spell"); }
    else if (kind === "decoy") { burst(X0, Y0, 10, {s0: 20, s1: 80, l0: 0.4, l1: 0.8, r0: 1.5, r1: 3, cols: ["#d9b36a", "#fff3c0"], ty: 4, g: 80}); addRing(X0, Y0, 20, "#d9b36a", {d: 0.4}); sfx("spawn2"); }
    else { addRing(X0, Y0, 3 * T, "#fff", {d: 0.6, w: 3}); sfx("spell"); }
  };
  // ---- sim event router (returns true when FX fully handled the event) ----
  var seenOrbTip = false;
  FX.ev = function (e) {
    if (!G) return false; var k = e.k, i, b, X0, Y0, X1, Y1, X2, Y2, ang;
    if (k === "shot") {
      X1 = px(e.x1); Y1 = py(e.y1); X2 = px(e.x2); Y2 = py(e.y2); ang = Math.atan2(Y2 - Y1, X2 - X1); var kind = e.t, d = kind === "lobber" ? 0.5 : kind === "sniper" ? 0.1 : 0.2, bf = null;
      if (V.sim) for (i = 0; i < V.sim.bld.length; i++) { b = V.sim.bld[i]; if (Math.abs(b.cx - e.x1) < 0.01 && Math.abs(b.cy - e.y1) < 0.01) { bf = b; break; } }
      var L = bf ? Math.min(14, Math.max(8, bf.w * T * 0.4)) : 9; if (bf) { var f = bf._f || (bf._f = {ra: ang, rc: 0, ls: -9, lang: ang}); f.rc = 1; f.ls = V.t; f.lang = ang; }
      muzzle(X1 + Math.cos(ang) * L, Y1 + Math.sin(ang) * L - 4, ang, (PCOL[kind] || PCOL.blaster)[0], kind === "sniper" || kind === "lobber");
      addProj(X1 + Math.cos(ang) * L, Y1 + Math.sin(ang) * L - 4, X2, Y2, kind, d, {arc: kind === "lobber" ? 26 : 0, spl: e.spl});
      sfx(kind === "sniper" ? "rail" : kind === "lobber" ? "thud" : "dshot"); return true;
    }
    if (k === "bolt" || k === "lob") {
      var hk = e.hid === "scx" ? "scx" : e.hid ? "bolt" : "troop"; X1 = px(e.x1); Y1 = py(e.y1); X2 = px(e.x2); Y2 = py(e.y2); ang = Math.atan2(Y2 - Y1, X2 - X1);
      addProj(X1, Y1 - 8, X2, Y2, k === "lob" ? "lobber" : hk, k === "lob" ? 0.45 : e.hid === "scx" ? 0.08 : 0.16, {arc: k === "lob" ? 20 : 0, spl: 1});
      if (e.hid === "scx") { FX.beam(X1, Y1 - 8, X2, Y2, "#46e6d2", {d: 0.12, w: 2}); muzzle(X1, Y1 - 8, ang, "#46e6d2", 1); sfx("rail"); } else { muzzle(X1, Y1 - 8, ang, "#9fe8ff", 0); sfx(e.hid ? "pew" : "shoot"); }
      return true;
    }
    if (k === "chain") {
      if (e.p && e.p.length > 1) for (i = 1; i < e.p.length; i++) { FX.bolt(px(e.p[i - 1][0]), py(e.p[i - 1][1]), px(e.p[i][0]), py(e.p[i][1]), "#bff4ff", {w: 2.4, amp: 9, d: 0.3}); burst(px(e.p[i][0]), py(e.p[i][1]), 5, {s0: 30, s1: 90, l0: 0.15, l1: 0.4, r0: 1, r1: 2.2, c: "#e8fcff", ty: 3}); }
      sfx("zap"); if (e.p && e.p[0]) sp(px(e.p[0][0]), py(e.p[0][1]), {l: 0.2, r: 10, c: "#bff4ff", ty: 3, al: 0.7}); return true;
    }
    if (k === "beam") { FX.beam(px(e.x1), py(e.y1), px(e.x2), py(e.y2), "#ffcf6a", {d: 0.32, w: 3.4}); sp(px(e.x1), py(e.y1), {l: 0.2, r: 11, c: "#ffe8a0", ty: 3}); sfx("laser"); FX.shake(0.8); return true; }
    if (k === "fan") { var a0 = e.a; X1 = px(e.x1); Y1 = py(e.y1); burst(X1 + Math.cos(a0) * 10, Y1 + Math.sin(a0) * 10, 14, {a0: a0 - 0.45, a1: a0 + 0.45, s0: 80, s1: 200, l0: 0.2, l1: 0.45, r0: 1, r1: 2.2, cols: ["#ffe9a0", "#fff", "#c8e870"], ty: 1}); sfx("whoosh"); return true; }
    if (k === "dmg") {
      X0 = px(e.x); Y0 = py(e.y);
      if (e.u) { if (!calm()) FX.num(X0, Y0 - 12, "-" + Math.round(e.a), "#ff9a8a", 0.8, {d: 0.7}); return true; }
      if (e.crit) { FX.num(X0, Y0 - 14, "CRIT " + Math.round(e.a), "#ffb531", 1.7, {crit: 1, d: 1.1}); burst(X0, Y0, 12, {s0: 40, s1: 130, l0: 0.25, l1: 0.6, r0: 1.5, r1: 3, cols: ["#ffe65a", "#fff", "#ff9a3a"], ty: 6}); addRing(X0, Y0, 24, "#ffb531", {d: 0.35, w: 3}); FX.shake(3); FX.hitstop(0.05); FX.flash("#fff0b0", 0.12); sfx("crit"); BB.vibe && BB.vibe(25); }
      else FX.num(X0, Y0 - 12, Math.round(e.a), e.a > 120 ? "#fff3b0" : "#ffffff", e.a > 120 ? 1.15 : 0.9, {d: 0.8});
      return true;
    }
    if (k === "bdead") { collapse(e); return true; }
    if (k === "udead") {
      if (e.silent) return true; X0 = px(e.x); Y0 = py(e.y); var sz = 18; for (var kk in C.U) if (C.U[kk].art === e.a) sz = C.U[kk].sz; if (e.a === "hero") sz = 28;
      pushCap(ghosts, {art: e.a, x: X0, y: Y0, vx: R(-26, 26), z: 0, vz: R(110, 150), rot: 0, vr: R(-7, 7), t: 0, d: 0.95, sz: sz, flip: Math.random() < 0.5, b: 0}, 24);
      burst(X0, Y0, e.team === "a" ? 7 : 10, {s0: 30, s1: 90, g: 70, l0: 0.3, l1: 0.7, r0: 1.5, r1: 3, cols: e.team === "a" ? ["#ffd7a0", "#fff", "#ff9a8a"] : ["#a8ff6a", "#fff", "#6ad0ff"], ty: 3});
      addRing(X0, Y0, 14, e.team === "a" ? "#ffd7a0" : "#a8ff6a", {d: 0.3}); sfx(e.team === "a" ? "hurt" : "pop"); if (e.team === "a") BB.vibe && BB.vibe(12); return true;
    }
    if (k === "spawn") { X0 = px(e.x); Y0 = py(e.y); addRing(X0, Y0, 14, "#fff7c0", {d: 0.45, w: 2.5, fill: 1}); addRing(X0, Y0, 22, "#ffd35a", {d: 0.6, w: 1.5}); burst(X0, Y0, 8, {s0: 20, s1: 60, l0: 0.3, l1: 0.6, r0: 1.5, r1: 3, c: "#e8e0c0", ty: 2, up: -8, grow: 4}); sfx("spawn2"); return true; }
    if (k === "boom") {
      X0 = px(e.x); Y0 = py(e.y); var rr = e.r * T;
      if (e.c === "spark") { lightningStorm(X0, Y0, rr); addRing(X0, Y0, rr * 1.3, "#ffe65a", {d: 0.6, w: 4, fill: 1, add: 1}); FX.shake(5); FX.hitstop(0.05); FX.flash("#fff7a0", 0.22); sfx("zap"); sfx("boom"); BB.vibe && BB.vibe(30); return true; }
      if (e.c === "clamp") { addRing(X0, Y0, rr, "#a8e8ff", {d: 0.7, w: 4, fill: 1, add: 1}); addRing(X0, Y0, rr * 0.6, "#fff", {d: 0.5, w: 2}); burst(X0, Y0, 18, {s0: 40, s1: 120, g: 40, l0: 0.5, l1: 1, r0: 1.5, r1: 3.5, cols: ["#e8fcff", "#a8e8ff", "#7fd0ff"], ty: 4}); burst(X0, Y0, 6, {s0: 10, s1: 40, l0: 0.8, l1: 1.4, r0: 5, r1: 9, c: "rgba(200,240,255,.45)", ty: 2, up: -6, grow: 6}); sfx("ice"); FX.shake(2); return true; }
      if (e.c === "stitch") { addRing(X0, Y0, rr, "#9be26b", {d: 0.7, w: 3, fill: 1}); burst(X0, Y0, 14, {s0: 20, s1: 70, up: -30, l0: 0.6, l1: 1.2, r0: 1.5, r1: 3, cols: ["#9be26b", "#d8ff9a"], ty: 3}); sfx("spell"); return true; }
      if (e.c === "slam" || e.c === "surge") { FX.slamFx(X0, Y0); return true; }
      if (e.c === "crow") return true;
      var trap = e.c === "fuse" || e.c === "roll" || e.c === "trap"; addRing(X0, Y0, Math.max(14, rr), trap ? "#ff7a5a" : "#fff", {d: 0.5, w: 3, fill: 1});
      sp(X0, Y0, {l: 0.12, r: Math.max(10, rr * 0.8), c: "#fff3c0", ty: 3}); sp(X0, Y0, {l: 0.3, r: Math.max(14, rr), c: "#ff9a3a", ty: 3, al: 0.55});
      burst(X0, Y0, trap ? 18 : 10, {s0: 30, s1: 120, g: 100, l0: 0.3, l1: 0.8, r0: 1.5, r1: 3.5, cols: ["#ff9a3a", "#ffd35a", "#6b4b30", "#fff"], ty: 4});
      burst(X0, Y0, 6, {s0: 8, s1: 30, l0: 0.6, l1: 1.2, r0: 4, r1: 9, c: "rgba(80,70,65,.7)", ty: 2, up: -16, grow: 8});
      if (trap) { FX.shake(4); FX.hitstop(0.04); sfx("boom"); BB.vibe && BB.vibe(25); var nb = qn(3); for (i = 0; i < nb; i++) (function (i) { FX.later(0.07 + i * 0.07, function () { var ex = X0 + R(-rr, rr), ey = Y0 + R(-rr, rr) * 0.8; sp(ex, ey, {l: 0.18, r: 9, c: "#ffd35a", ty: 3}); burst(ex, ey, 6, {s0: 30, s1: 90, g: 90, l0: 0.25, l1: 0.5, r0: 1.5, r1: 2.8, cols: ["#ff9a3a", "#ffd35a"], ty: 4}); addRing(ex, ey, 12, "#ff7a5a", {d: 0.3}); sfx("boom"); }); })(i); }
      else sfx("boom"); return true;
    }
    if (k === "combo") { FX.combo(e); return true; }
    if (k === "pudrop") { X0 = px(e.x); Y0 = py(e.y); var pu = PUI[e.pk] || PUI.burst, pc = e.lucky ? "#ffd35a" : pu.c; addRing(X0, Y0, 26, pc, {d: 0.5, w: 3, add: 1}); burst(X0, Y0, 10, {s0: 30, s1: 100, g: 30, l0: 0.4, l1: 0.8, r0: 1.5, r1: 3, c: pc, ty: 6}); sfx("orb"); BB.vibe && BB.vibe(10);
      if (!seenOrbTip) { seenOrbTip = true; banner("POWER ORB!", pc, "Tap the glowing orb before it fades"); } else FX.num(X0, Y0 - 22, e.lucky ? "LUCKY ORB!" : "ORB!", pc, 1.1, {d: 1}); return true; }
    if (k === "puexp") { X0 = px(e.x); Y0 = py(e.y); burst(X0, Y0, 6, {s0: 10, s1: 40, l0: 0.3, l1: 0.6, r0: 1, r1: 2, c: "#999", ty: 2, up: -10}); return true; }
    if (k === "pugot") { puGot(e); return true; }
    if (k === "psurge") { psurge(e); return true; }
    if (k === "crows") { FX.crowsFx(e.x, e.y, e.t); return true; }
    if (k === "heal") { X0 = px(e.x2); Y0 = py(e.y2); if (!calm()) burst(X0, Y0 - 6, 2, {s0: 5, s1: 25, up: -35, l0: 0.5, l1: 0.9, r0: 1.2, r1: 2, c: "#7dff9a", ty: 3}); return false; }
    return false;
  };
  function puGot(e) {
    var X0 = px(e.x), Y0 = py(e.y), pu = PUI[e.pk] || PUI.burst, c = e.lucky ? "#ffd35a" : pu.c, tr = V.sim ? V.sim.tr : [], i;
    addRing(X0, Y0, 60, c, {d: 0.55, w: 4, fill: 1, add: 1}); burst(X0, Y0, 16, {s0: 50, s1: 150, g: 40, l0: 0.4, l1: 0.9, r0: 1.5, r1: 3.2, c: c, ty: 6}); sfx("orbget", e.lucky ? "lucky" : ""); BB.vibe && BB.vibe(e.lucky ? [20, 30, 20, 30, 60] : [20, 30, 20]);
    banner(e.lucky ? "LUCKY CACHE x3!" : pu.n + "!", c, e.pk === "burst" && e.pts ? "+" + (e.pts[0] || 0) + " coins  +" + (e.pts[1] || 0) + " salvage" : null);
    if (e.pk === "burst") { FX.flyWorld(X0, Y0, "c", Math.min(10, 4 + (e.lucky ? 5 : 0)), e.pts && e.pts[0]); FX.flyWorld(X0, Y0, "s", Math.min(6, 3 + (e.lucky ? 3 : 0)), e.pts && e.pts[1]); if (e.lucky) { FX.confetti(X0, Y0, 30); FX.flash("#ffe9a0", 0.2); } }
    else if (e.pk === "chain") { var prev = [X0, Y0]; (e.pts || []).forEach(function (p, i) { FX.later(i * 0.09, function () { var qx = px(p[0]), qy = py(p[1]); FX.bolt(prev[0], prev[1], qx, qy, "#fff06a", {w: 2.4, amp: 10, d: 0.3}); burst(qx, qy, 7, {s0: 30, s1: 100, g: 60, l0: 0.2, l1: 0.5, r0: 1, r1: 2.4, c: "#fff06a", ty: 3}); addRing(qx, qy, 18, "#fff06a", {d: 0.3}); sfx("zap"); prev = [qx, qy]; }); }); FX.shake(2); }
    else { var n = 0; for (i = 0; i < tr.length && n < 8; i++) { var u = tr[i]; if (u.dead || u.decoy) continue; n++; var ux = px(u.x), uy = py(u.y); addRing(ux, uy, 20, c, {d: 0.5, w: 2.5, add: 1}); burst(ux, uy - 6, 5, {s0: 10, s1: 50, up: -45, l0: 0.5, l1: 1, r0: 1.5, r1: 2.8, c: c, ty: e.pk === "heal" ? 3 : 5}); } FX.flash(c, 0.1); }
  }
  function psurge(e) {
    var pts = e.pts || [], cx0 = 0, cy0 = 0; pts.forEach(function (p) { cx0 += p[0]; cy0 += p[1]; }); if (pts.length) { cx0 /= pts.length; cy0 /= pts.length; } else { cx0 = N / 2; cy0 = N / 2; }
    var X0 = px(cx0), Y0 = py(cy0); addRing(X0, Y0, 190, "#e8d0ff", {d: 0.9, w: 6, fill: 1, add: 1}); addRing(X0, Y0, 120, "#fff", {d: 0.7, w: 3, add: 1});
    pts.slice(0, 8).forEach(function (p, i) { var ux = px(p[0]), uy = py(p[1]); addRing(ux, uy, 34, "#c89aff", {d: 0.6, w: 3, add: 1}); burst(ux, uy, 8, {s0: 40, s1: 130, g: -30, l0: 0.4, l1: 0.9, r0: 1.5, r1: 3, cols: ["#e8d0ff", "#fff", "#9a6aff"], ty: 6});
      if (V.sim) { var best = null, bd = 1e9; V.sim.bld.forEach(function (b) { if (b.dead || b.kind === "trap") return; var d = Math.hypot(b.cx - p[0], b.cy - p[1]); if (d < bd) { bd = d; best = b; } }); if (best && bd < 6) FX.later(0.05 + i * 0.05, function () { FX.bolt(ux, uy, px(best.cx), py(best.cy), "#e8d0ff", {w: 2.6, amp: 12, d: 0.35}); burst(px(best.cx), py(best.cy), 8, {s0: 40, s1: 110, l0: 0.2, l1: 0.5, r0: 1, r1: 2.4, c: "#e8d0ff", ty: 3}); }); } });
    FX.shake(8); FX.hitstop(0.07); FX.slow(0.4, 0.55); FX.zoom(1.1, X0, Y0, 0.6); FX.flash("#efe0ff", 0.5); FX.rays = {t: 0, d: 1.3, x: X0, y: Y0}; FX.surgeT = 7;
    sfx("psfire"); BB.vibe && BB.vibe([30, 40, 30, 40, 90]); banner("POWER SURGE!", "#d9b8ff", "Troops charged for 7 seconds", {big: 1});
  }
  // ---- combo ----
  var comboTier = 0;
  FX.combo = function (e) {
    if (e.n === 0) { comboTier = 0; BB.musicIntensity && BB.musicIntensity(0); return; }
    sfx("combo", e.n); if (e.x !== undefined) { var X0 = px(e.x), Y0 = py(e.y); if (e.n >= 2) FX.num(X0, Y0 - 24, "x" + e.n, e.tier ? TIER[e.tier].c : "#fff", 1 + Math.min(0.8, e.n * 0.06), {d: 0.8}); }
    if (e.up && e.tier) { var t = TIER[e.tier], X1 = px(e.x), Y1 = py(e.y); comboTier = e.tier; BB.musicIntensity && BB.musicIntensity(e.tier);
      addRing(X1, Y1, 40 + e.tier * 20, t.c, {d: 0.6, w: 4, fill: 1, add: 1}); burst(X1, Y1, 12 + e.tier * 6, {s0: 50, s1: 150, g: 20, l0: 0.4, l1: 0.9, r0: 1.5, r1: 3.2, cols: [t.c, "#fff"], ty: 6});
      banner(t.n + "!", t.c, "x" + e.n + " streak" + (e.bc ? "  +" + e.bc + " bonus coins" : ""), {big: e.tier >= 2}); sfx("frenzy", e.tier); BB.vibe && BB.vibe(e.tier >= 2 ? [25, 25, 50] : 20);
      FX.shake(2 + e.tier * 1.5); if (e.tier >= 2) { FX.flash(t.c, 0.16); FX.zoom(1.06, X1, Y1, 0.3); } if (e.bc) { FX.flyWorld(X1, Y1, "c", 4, e.bc); FX.flyWorld(X1, Y1, "s", 2, e.bs); } }
  };
  FX.tierNow = function () { return comboTier; };
  // ---- collapse / debris ----
  function bsprite(b) { var d = C.B[b.t]; return V.theme === "a" ? d.aart : d.art; }
  function collapse(e) {
    var b = V.sim && V.sim.bld[e.b], X0 = px(e.x), Y0 = py(e.y), big = e.w > 2, core = e.kind === "core", wall = e.kind === "wall";
    if (b) { var f = b._f || (b._f = {}); f.dead = V.t; var d = C.B[b.t]; if (!wall && b.kind !== "trap" && bsprite(b)) pushCap(colls, {art: bsprite(b), x: px(b.x) + d.w * T / 2, by: py(b.y) + d.h * T + 2, ww: d.w * T * (d.kind === "def" ? 1.15 : 1.22), cap: d.h * T * (d.kind === "def" ? 2.2 : 2.0), t: 0, d: core ? 0.9 : 0.55}, 12); }
    burst(X0, Y0, wall ? 6 : big ? 26 : 14, {s0: 30, s1: wall ? 80 : 150, g: 130, l0: 0.4, l1: 1.0, r0: 1.5, r1: 3.8, cols: wall ? ["#9c7a4a", "#6b4423", "#c8a066"] : ["#8a8a8a", "#b0a090", "#6a5a50", "#d8c8a8"], ty: 4});
    burst(X0, Y0 + 2, wall ? 3 : big ? 10 : 6, {s0: 8, s1: 40, l0: 0.7, l1: 1.5, r0: 5, r1: big ? 12 : 8, c: "rgba(150,135,115,.6)", ty: 2, up: -10, grow: 9});
    if (!wall) { addRing(X0, Y0 + 4, big ? 54 : 32, "rgba(220,205,170,.9)", {d: 0.5, w: 3}); sp(X0, Y0, {l: 0.15, r: big ? 22 : 13, c: "#fff3c0", ty: 3}); FX.shake(big ? 4.5 : 1.8); if (big) FX.hitstop(0.05); sfx("collapse"); BB.vibe && BB.vibe(big ? 40 : 15); } else sfx("crack");
    if (core) { FX.shake(13); FX.hitstop(0.1); FX.slow(0.4, 0.8); FX.zoom(1.2, X0, Y0, 0.9); FX.flash("#fff", 0.55); addRing(X0, Y0, 140, "#ffd35a", {d: 0.9, w: 6, fill: 1, add: 1}); burst(X0, Y0, 30, {s0: 60, s1: 200, g: 60, l0: 0.6, l1: 1.3, r0: 2, r1: 4, cols: ["#ffd35a", "#fff", "#ff9a3a"], ty: 6}); banner("CORE DESTROYED!", "#ffd35a", "star earned", {big: 1}); BB.vibe && BB.vibe([40, 30, 40, 30, 120]); }
    if (b && !wall && b.kind !== "trap") { var nc = b.lc ? Math.min(7, 2 + Math.ceil(b.lc / 120)) : 0, ns = b.ls ? Math.min(5, 1 + Math.ceil(b.ls / 20)) : 0; if (nc) FX.flyWorld(X0, Y0, "c", nc, b.lc); if (ns) FX.flyWorld(X0, Y0, "s", ns, b.ls); }
  }
  // ---- per-frame update ----
  var ema = 0.016, slowT = 0, fastT = 0, T2 = 0;
  FX.update = function (dt) {
    G = V.ctx && V.ctx(); if (!G || !G.cx) return; V.dtv = dt; var i, p;
    ema += (dt - ema) * 0.05; if (ema > 0.026) { slowT += dt; fastT = 0; } else if (ema < 0.019) { fastT += dt; slowT = 0; } if (slowT > 1.5 && FX.q > 0.5) { FX.q -= 0.2; slowT = 0; } if (fastT > 6 && FX.q < 1) { FX.q = Math.min(1, FX.q + 0.2); fastT = 0; }
    for (i = 0; i < PCAP; i++) { p = P[i]; if (!p.on) continue; p.l -= dt; if (p.l <= 0) { p.on = 0; live--; continue; } if (p.drag) { var dr = Math.max(0, 1 - p.drag * dt); p.vx *= dr; p.vy *= dr; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.rot += p.vr * dt; if (p.grow) p.r += p.grow * dt; }
    for (i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t >= rings[i].d) rings.splice(i, 1); }
    for (i = bolts.length - 1; i >= 0; i--) { bolts[i].t += dt; if (bolts[i].t >= bolts[i].d) bolts.splice(i, 1); }
    for (i = beams.length - 1; i >= 0; i--) { beams[i].t += dt; if (beams[i].t >= beams[i].d) beams.splice(i, 1); }
    for (i = nums.length - 1; i >= 0; i--) { nums[i].t += dt; if (nums[i].t >= nums[i].d) nums.splice(i, 1); }
    for (i = colls.length - 1; i >= 0; i--) { colls[i].t += dt; if (colls[i].t >= colls[i].d) colls.splice(i, 1); }
    for (i = ghosts.length - 1; i >= 0; i--) { var gh = ghosts[i]; gh.t += dt; gh.x += gh.vx * dt; gh.vz -= 520 * dt; gh.z += gh.vz * dt; if (gh.z < 0) { gh.z = 0; if (gh.vz < -60 && !gh.b) { gh.b = 1; gh.vz = -gh.vz * 0.45; burst(gh.x, gh.y, 3, {s0: 10, s1: 30, l0: 0.2, l1: 0.4, r0: 1.5, r1: 2.5, c: "#d9c9a0", ty: 2}); } else gh.vz = 0; } gh.rot += gh.vr * dt; if (gh.t >= gh.d) ghosts.splice(i, 1); }
    for (i = projs.length - 1; i >= 0; i--) { var q = projs[i]; q.t += dt; var f = Math.min(1, q.t / q.d), x = q.x1 + (q.x2 - q.x1) * f, y = q.y1 + (q.y2 - q.y1) * f - Math.sin(f * 3.14159) * q.arc; q.px = x; q.py = y; q.tr.push(x, y); if (q.tr.length > 14) q.tr.splice(0, 2); if (q.k === "lobber" && Math.random() < 0.5 * FX.q) sp(x, y, {vx: R(-6, 6), vy: R(-14, -4), l: 0.4, r: 2, c: "rgba(120,110,100,.6)", ty: 2, grow: 5}); if (q.t >= q.d) { projImpact(q); projs.splice(i, 1); } }
    for (i = meteors.length - 1; i >= 0; i--) { var m = meteors[i]; m.t += dt; if (m.t >= m.d) { meteorHit(m); meteors.splice(i, 1); } else if (Math.random() < 0.8 * FX.q) { var mf = m.t / m.d; sp(m.x + (m.tx - m.x) * mf, m.y + (m.ty - m.y) * mf, {vx: R(-8, 8), vy: R(-8, 8), l: 0.3, r: 3, c: m.k === "hay" ? "#e8c050" : "#ff9a3a", ty: 5}); } }
    for (i = tors.length - 1; i >= 0; i--) { var to = tors[i]; to.t += dt; if (to.t >= to.d) { tors.splice(i, 1); continue; } if (Math.random() < 0.5 * FX.q) { var ta = to.t * 9 + Math.random() * TAU, tr = R(4, 22); sp(to.x + Math.cos(ta) * tr, to.y - R(0, 40), {vx: Math.cos(ta + 1.6) * 40, vy: -15, l: 0.5, r: 1.6, c: "#ffd9a0", ty: 5}); } }
    for (i = crows.length - 1; i >= 0; i--) { var cr = crows[i]; cr.t += dt; if (cr.t < cr.delay) continue; var cf = (cr.t - cr.delay) / cr.d; if (cf >= 1) { if (!cr.hit) { cr.hit = 1; burst(cr.tx, cr.ty, 3, {s0: 20, s1: 70, g: 60, l0: 0.3, l1: 0.7, r0: 1.2, r1: 2.4, cols: ["#1a1426", "#46e6d2", "#fff"], ty: 4}); } crows.splice(i, 1); continue; }
      var pos = crowPos(cr, cf); cr.trl.push(pos[0], pos[1]); if (cr.trl.length > 12) cr.trl.splice(0, 2); cr.cx = pos[0]; cr.cy = pos[1]; }
    for (i = later.length - 1; i >= 0; i--) { later[i].d -= dt; if (later[i].d <= 0) { var fn = later[i].fn; later.splice(i, 1); try { fn(); } catch (er) {} } }
    if (FX.dark) { FX.dark.t += dt; if (FX.dark.t > FX.dark.d) FX.dark = null; } if (FX.rays) { FX.rays.t += dt; if (FX.rays.t > FX.rays.d) FX.rays = null; } if (FX.surgeT > 0) FX.surgeT -= dt;
    ambientUpdate(dt); simStatusFx(dt); if (FX.uiUpdate) FX.uiUpdate(dt);
  };
  function crowPos(cr, f) {
    if (f < 0.38) { var s = f / 0.38, a = cr.ph + s * 7 * cr.dir; return [cr.hx + Math.cos(a) * cr.rad * (0.3 + s), cr.hy - 6 - s * 30 + Math.sin(a * 1.3) * cr.rad * 0.4 * s]; }
    var s2 = (f - 0.38) / 0.62, e2 = s2 * s2 * (3 - 2 * s2), sx = cr.hx + Math.cos(cr.ph + 7 * cr.dir) * cr.rad * 1.3, sy = cr.hy - 36 + Math.sin((cr.ph + 7 * cr.dir) * 1.3) * cr.rad * 0.52;
    return [sx + (cr.tx - sx) * e2 + Math.sin(s2 * 3.14) * cr.rad * 0.5 * cr.dir, sy + (cr.ty - sy) * e2 - Math.sin(s2 * 3.14) * 24];
  }
  function simStatusFx(dt) {
    var sim = V.sim; if (!sim || V.mode !== "raid") return; T2 += dt; if (T2 < 0.08) return; T2 = 0; var i, b;
    for (i = 0; i < sim.bld.length; i++) {
      b = sim.bld[i]; if (b.kind === "trap" || b.kind === "wall") continue; var f = b._f, hp = b.hp / b.mx;
      if (b.dead) { if (f && f.dead && V.t - f.dead < 5 && Math.random() < 0.35 * FX.q) sp(px(b.cx) + R(-8, 8), py(b.cy) + R(-4, 4), {vx: R(-4, 4), vy: R(-22, -10), l: 1.1, r: 3, c: "rgba(70,65,62,.55)", ty: 2, grow: 6}); continue; }
      if (hp < 0.66 && Math.random() < (hp < 0.33 ? 0.55 : 0.28) * FX.q) sp(px(b.cx) + R(-b.w * 4, b.w * 4), py(b.cy) - R(2, 10), {vx: R(-4, 4), vy: R(-26, -12), l: 1.2, r: 3, c: hp < 0.33 ? "rgba(40,36,36,.65)" : "rgba(100,95,92,.55)", ty: 2, grow: 7});
      if (hp < 0.4 && Math.random() < 0.55 * FX.q) sp(px(b.cx) + R(-b.w * 4, b.w * 4), py(b.cy) - R(0, 8), {vx: R(-6, 6), vy: R(-34, -18), l: 0.5, r: R(2.5, 4.5), c: Math.random() < 0.5 ? "#ff8a2a" : "#ffd35a", ty: 5});
    }
    var tr = sim.tr, ps = sim.ps > 0;
    for (i = 0; i < tr.length && i < 30; i++) { var u = tr[i]; if (u.dead) continue; if ((u.bst > 0 || ps) && Math.random() < 0.18 * FX.q) sp(px(u.x) + R(-5, 5), py(u.y) - R(0, 10), {vx: R(-5, 5), vy: R(-40, -22), l: 0.45, r: 2, c: ps ? "#d9b8ff" : "#ff9a3a", ty: 5}); }
  }
  // ---- drawing (world space, inside the camera transform) ----
  function glowDot(cx, x, y, r, c, a) { cx.globalAlpha = a; cx.fillStyle = c; cx.beginPath(); cx.arc(x, y, r, 0, TAU); cx.fill(); cx.globalAlpha = a * 0.35; cx.beginPath(); cx.arc(x, y, r * 1.9, 0, TAU); cx.fill(); cx.globalAlpha = 1; }
  FX.drawWorld = function () {
    var cx = G.cx, i, j, p;
    ghosts.forEach(function (gh) { var f = gh.t / gh.d, art = gh.art === "hero" ? "bg_front" : gh.art; cx.save(); cx.translate(gh.x, gh.y - gh.z); cx.rotate(gh.rot); G.spr(art, 0, 0, gh.sz, gh.sz * 1.15, Math.max(0, 1 - f * f), gh.flip); cx.globalCompositeOperation = "lighter"; G.spr(art, 0, 0, gh.sz, gh.sz * 1.15, 0.55 * (1 - f), gh.flip); cx.restore(); cx.globalCompositeOperation = "source-over"; });
    colls.forEach(function (c) { var f = c.t / c.d, sy = Math.max(0.06, 1 - ease(f) * 0.94), sx = 1 + f * 0.14; cx.save(); cx.translate(c.x + R(-1, 1) * (1 - f) * 2.5, c.by + f * 3); cx.scale(sx, sy); G.spr(c.art, 0, 0, c.ww, c.cap, Math.max(0, 1 - f * f * 0.9)); cx.restore(); });
    tors.forEach(function (t) { var f = t.t / t.d, al = Math.min(1, f * 6, (1 - f) * 4); for (j = 0; j < 7; j++) { var h = j / 7, r = 6 + h * 20, yy = t.y - h * 44, ph = t.t * 9 + j * 0.9; cx.globalAlpha = 0.35 * al; cx.strokeStyle = j % 2 ? "#fff3d0" : "#ffb870"; cx.lineWidth = 2.2; cx.beginPath(); cx.ellipse(t.x + Math.sin(ph) * 3, yy, r, r * 0.34, 0, 0, TAU); cx.stroke(); } cx.globalAlpha = 1; });
    meteors.forEach(function (m) { var f = m.t / m.d, x = m.x + (m.tx - m.x) * f, y = m.y + (m.ty - m.y) * f; cx.save(); cx.translate(x, y); cx.rotate(m.rot + f * 8); if (m.k === "hay") { cx.fillStyle = "#d8b048"; cx.beginPath(); cx.arc(0, 0, 6.5, 0, TAU); cx.fill(); cx.strokeStyle = "#8a6a20"; cx.lineWidth = 1.2; cx.beginPath(); cx.arc(0, 0, 3.6, 0, TAU); cx.moveTo(-6, 0); cx.lineTo(6, 0); cx.stroke(); } else glowDot(cx, 0, 0, 5, "#ff9a3a", 0.9); cx.restore(); });
    for (var pass = 0; pass < 2; pass++) {
      cx.globalCompositeOperation = pass ? "lighter" : "source-over";
      for (i = 0; i < PCAP; i++) {
        p = P[i]; if (!p.on) continue; var add = p.ty === 3 || p.ty === 5 || p.ty === 6; if ((pass === 1) !== add) continue; var lf = p.l / p.m;
        if (p.ty === 1) { cx.globalAlpha = lf * p.al; cx.strokeStyle = p.c; cx.lineWidth = p.r * 0.8; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); cx.stroke(); }
        else if (p.ty === 4) { cx.globalAlpha = Math.min(1, lf * 2) * p.al; cx.fillStyle = p.c; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2); cx.restore(); }
        else if (p.ty === 2) { cx.globalAlpha = lf * lf * 0.8 * p.al; cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, TAU); cx.fill(); }
        else if (p.ty === 6) { cx.globalAlpha = Math.min(1, lf * 2) * p.al; cx.fillStyle = p.c; var s = p.r * (0.6 + lf); cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillRect(-s, -0.7, s * 2, 1.4); cx.fillRect(-0.7, -s, 1.4, s * 2); cx.restore(); }
        else { cx.globalAlpha = (add ? lf : Math.min(1, lf * 2)) * p.al; cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, Math.max(0.4, p.r * (p.ty === 5 ? lf + 0.3 : 1)), 0, TAU); cx.fill(); }
      }
    }
    cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1;
    rings.forEach(function (r) { var f = r.t / r.d, e = ease(f), rad = r.r * (0.2 + 0.8 * e); if (r.add) cx.globalCompositeOperation = "lighter"; if (r.fill) { cx.globalAlpha = (1 - f) * 0.22; cx.fillStyle = r.c; cx.beginPath(); cx.arc(r.x, r.y, rad, 0, TAU); cx.fill(); } cx.globalAlpha = 1 - f; cx.strokeStyle = r.c; cx.lineWidth = r.w * (1 - f * 0.6); cx.beginPath(); cx.ellipse(r.x, r.y, rad, rad * 0.86, 0, 0, TAU); cx.stroke(); cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over"; });
    cx.globalCompositeOperation = "lighter"; cx.lineCap = "round";
    beams.forEach(function (b) { var f = b.t / b.d, al = 1 - f, w = b.w * (1 - f * 0.4); cx.globalAlpha = 0.28 * al; cx.strokeStyle = b.c; cx.lineWidth = w * 3.5; cx.beginPath(); cx.moveTo(b.x1, b.y1); cx.lineTo(b.x2, b.y2); cx.stroke(); cx.globalAlpha = 0.7 * al; cx.lineWidth = w * 1.6; cx.stroke(); cx.globalAlpha = al; cx.strokeStyle = "#fff"; cx.lineWidth = w * 0.7; cx.stroke(); glowDot(cx, b.x2, b.y2, 5 * al + 2, b.c, al); });
    cx.lineJoin = "round";
    bolts.forEach(function (b) { var f = b.t / b.d, al = f < 0.7 ? 1 : (1 - f) / 0.3, pts = ((b.t * 40) | 0) % 2 ? b.a : b.b; cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1]); for (j = 1; j < pts.length; j++) cx.lineTo(pts[j][0], pts[j][1]); cx.globalAlpha = 0.3 * al; cx.strokeStyle = b.c; cx.lineWidth = b.w * 4; cx.stroke(); cx.globalAlpha = 0.8 * al; cx.lineWidth = b.w * 1.8; cx.stroke(); cx.globalAlpha = al; cx.strokeStyle = "#fff"; cx.lineWidth = b.w * 0.8; cx.stroke(); });
    cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1; cx.lineCap = "butt";
    projs.forEach(function (q) {
      var tr = q.tr, n = tr.length / 2; cx.globalCompositeOperation = "lighter";
      for (j = 1; j < n; j++) { var a = j / n; cx.globalAlpha = a * 0.7; cx.strokeStyle = q.c; cx.lineWidth = (q.k === "sniper" ? 2.4 : 2) * a + 0.4; cx.beginPath(); cx.moveTo(tr[(j - 1) * 2], tr[(j - 1) * 2 + 1]); cx.lineTo(tr[j * 2], tr[j * 2 + 1]); cx.stroke(); }
      var x = q.px, y = q.py; if (x !== undefined) { if (q.k === "lobber") { cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1; cx.fillStyle = q.c; cx.beginPath(); cx.arc(x, y, 3.4, 0, TAU); cx.fill(); glowDot(cx, x, y, 3, q.c2, 0.4); } else glowDot(cx, x, y, q.k === "flak" ? 3.2 : 2.4, q.c2, 0.95); }
      cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1;
    });
    crows.forEach(function (cr) { if (cr.cx === undefined || cr.t < cr.delay) return; var tr = cr.trl, n = tr.length / 2; cx.strokeStyle = "rgba(90,240,220,.8)"; cx.lineWidth = 2.4; cx.beginPath(); for (j = 0; j < n; j++) { if (j) cx.lineTo(tr[j * 2], tr[j * 2 + 1]); else cx.moveTo(tr[0], tr[1]); } cx.stroke(); var fl = Math.sin(cr.t * 34 + cr.ph) * 3.2, dx = n > 1 ? tr[n * 2 - 2] - tr[n * 2 - 4] : 1; cx.save(); cx.translate(cr.cx, cr.cy); cx.scale(dx < 0 ? -2.2 : 2.2, 2.2); cx.fillStyle = "#16101f"; cx.beginPath(); cx.ellipse(0, 0, 3.4, 1.9, 0, 0, TAU); cx.fill(); cx.beginPath(); cx.moveTo(-1, 0); cx.lineTo(-4, -4 - fl); cx.lineTo(1.5, -1); cx.moveTo(-1, 0); cx.lineTo(-4, 4 + fl); cx.lineTo(1.5, 1); cx.fill(); cx.fillStyle = "#46e6d2"; cx.fillRect(2, -0.8, 1.2, 1.2); cx.restore(); });
    drawOrbs(cx); drawNums(cx);
  };
  function drawNums(cx) {
    cx.textAlign = "center"; cx.lineJoin = "round";
    nums.forEach(function (n) { var f = n.t / n.d, pop = f < 0.15 ? back(f / 0.15) : 1, sz = Math.round(9 * n.z * (0.6 + 0.4 * pop)); cx.globalAlpha = f > 0.65 ? Math.max(0, (1 - f) / 0.35) : 1; cx.font = "900 " + sz + "px 'Trebuchet MS',sans-serif"; var y = n.y - ease(f) * (n.crit ? 22 : 16); cx.lineWidth = 3; cx.strokeStyle = "rgba(20,10,30,.85)"; cx.strokeText(n.s, n.x, y); cx.fillStyle = n.c; cx.fillText(n.s, n.x, y); });
    cx.globalAlpha = 1;
  }
  var OG = {rage: function (cx) { cx.beginPath(); cx.moveTo(0, -5); cx.quadraticCurveTo(5, 0, 2, 5); cx.quadraticCurveTo(0, 2, -2, 5); cx.quadraticCurveTo(-5, 0, 0, -5); cx.fill(); }, shield: function (cx) { cx.beginPath(); cx.moveTo(-4, -4); cx.lineTo(4, -4); cx.lineTo(4, 1); cx.quadraticCurveTo(4, 5, 0, 6); cx.quadraticCurveTo(-4, 5, -4, 1); cx.closePath(); cx.fill(); }, heal: function (cx) { cx.fillRect(-1.6, -5, 3.2, 10); cx.fillRect(-5, -1.6, 10, 3.2); }, burst: function (cx) { cx.beginPath(); for (var i = 0; i < 10; i++) { var r = i % 2 ? 2.4 : 5.5, a = i / 10 * TAU - 1.57; cx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } cx.closePath(); cx.fill(); }, chain: function (cx) { cx.beginPath(); cx.moveTo(1, -6); cx.lineTo(-3, 0.5); cx.lineTo(0, 0.5); cx.lineTo(-1, 6); cx.lineTo(4, -1); cx.lineTo(1, -1); cx.closePath(); cx.fill(); }};
  function drawOrbs(cx) {
    var sim = V.sim; if (!sim || !sim.pus) return; var tNow = sim.t;
    sim.pus.forEach(function (o) {
      var pu = PUI[o.k] || PUI.burst, c = o.lucky ? "#ffd35a" : pu.c, age = tNow - o.t, left = o.ttl - age, sc = Math.min(1, back(Math.min(1, age / 0.35))), bob = Math.sin(V.t * 5 + o.id) * 2.2, x = px(o.x), y = py(o.y) - 14 + bob, pul = 1 + Math.sin(V.t * 8) * 0.07, urgent = left < 3.5 && ((V.t * 6) | 0) % 2;
      cx.save(); cx.translate(x, y); cx.scale(sc * pul, sc * pul); cx.globalCompositeOperation = "lighter"; glowDot(cx, 0, 0, 11, c, 0.5); glowDot(cx, 0, 0, 16 + Math.sin(V.t * 6) * 2, c, 0.18); cx.globalCompositeOperation = "source-over";
      cx.fillStyle = "rgba(15,10,30,.75)"; cx.beginPath(); cx.arc(0, 0, 9.5, 0, TAU); cx.fill(); cx.strokeStyle = urgent ? "#fff" : c; cx.lineWidth = 2; cx.beginPath(); cx.arc(0, 0, 9.5, 0, TAU); cx.stroke();
      cx.strokeStyle = "rgba(255,255,255,.85)"; cx.lineWidth = 1.6; cx.beginPath(); cx.arc(0, 0, 12.5, -1.57, -1.57 + TAU * Math.max(0, left / o.ttl)); cx.stroke();
      cx.fillStyle = o.lucky ? "#ffe9a0" : "#fff"; (OG[o.k] || OG.burst)(cx); cx.restore();
      if (o.lucky || age < 2.5) { cx.font = "900 6.5px 'Trebuchet MS',sans-serif"; cx.textAlign = "center"; cx.lineWidth = 2; cx.strokeStyle = "rgba(0,0,0,.8)"; var lb = o.lucky ? "LUCKY x3" : "TAP", ly = y - 17 - Math.abs(Math.sin(V.t * 6)) * 2; cx.strokeText(lb, x, ly); cx.fillStyle = c; cx.fillText(lb, x, ly); }
      if (Math.random() < 0.25 * FX.q) sp(x + R(-8, 8), y + R(-8, 8), {vx: R(-6, 6), vy: R(-20, -8), l: 0.5, r: 1.4, c: c, ty: 6});
    });
  }
  FX.orbAt = function (tx, ty) {
    var sim = V.sim; if (!sim || !sim.pus) return -1; var best = -1, bd = 1.9;
    sim.pus.forEach(function (o) { var d = Math.hypot(o.x - tx, o.y - 0.9 - ty); if (d < bd) { bd = d; best = o.id; } }); return best;
  };
  // ---- buildings: shake, cracks, turret barrels, construction ----
  FX.bshake = function (b) { return b.hit > 0 && !calm() ? Math.sin(V.t * 90) * 0.9 : 0; };
  function crackAt(cx, x, y, w, h, seed, n) {
    cx.strokeStyle = "rgba(20,14,12,.75)"; cx.lineWidth = 0.9; cx.beginPath();
    for (var i = 0; i < n; i++) { var r = Math.sin((seed + i) * 12.9898) * 43758.5453; r -= Math.floor(r); var r2 = Math.sin((seed + i) * 78.233) * 12345.678; r2 -= Math.floor(r2); var sx = x + w * (0.2 + 0.6 * r), sy = y + h * (0.25 + 0.5 * r2); cx.moveTo(sx, sy); cx.lineTo(sx + (r2 - 0.5) * 9, sy + 4 + r * 3); cx.lineTo(sx + (r - 0.5) * 12, sy + 8 + r2 * 4); }
    cx.stroke();
  }
  function rr2(cx, x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); cx.fill(); }
  FX.bldOver = function (b, x, y, w, h) {
    var cx = G.cx, hp = b.hp / b.mx;
    if (hp < 0.72 && b.kind !== "wall") { cx.save(); cx.beginPath(); cx.rect(x + 1, y + h * 0.1, w - 2, h * 0.9); cx.clip(); crackAt(cx, x, y, w, h, b.i || 1, hp < 0.4 ? 5 : 3); if (hp < 0.4) { cx.fillStyle = "rgba(10,6,4,.18)"; cx.fillRect(x, y, w, h); } cx.restore(); }
    if (b.frz > 0) { cx.fillStyle = "rgba(150,225,255,.28)"; cx.fillRect(x + 1, y + h * 0.1, w - 2, h * 0.9); cx.strokeStyle = "rgba(230,250,255,.8)"; cx.lineWidth = 1; cx.strokeRect(x + 1.5, y + h * 0.1 + 0.5, w - 3, h * 0.9 - 1); }
    if (b.kind === "def") {
      var f = b._f || (b._f = {ra: b.aim || 0, rc: 0, ls: -9, lang: 0}), dt = V.dtv || 0.016, tgtA = V.t - f.ls < 1.2 ? f.lang : f.ra + Math.sin(V.t * 0.8 + (b.i || 0)) * 0.015, da = tgtA - f.ra; while (da > 3.14159) da -= TAU; while (da < -3.14159) da += TAU; f.ra += da * Math.min(1, dt * 16); f.rc = Math.max(0, f.rc - dt * 7);
      var pxc = x + w / 2, pyc = y + h * 0.42, L = Math.min(14, Math.max(8, w * 0.42)), rec = f.rc * 3.2, heat = Math.max(0, 1 - (V.t - f.ls) / 0.5), th = b.t === "lobber" ? 4.2 : b.t === "sniper" ? 2.4 : 3.2;
      cx.save(); cx.translate(pxc, pyc); cx.rotate(f.ra); cx.fillStyle = "#262a36"; rr2(cx, -2 - rec, -th / 2, L + 2, th, 1.4); cx.fillStyle = "#4a5266"; cx.fillRect(-1 - rec, -th / 2, L, 0.9); cx.fillStyle = heat > 0 ? "rgb(255," + (150 + ((1 - heat) * 90 | 0)) + ",60)" : "#7a8398"; cx.fillRect(L - 2 - rec, -th / 2 - 0.4, 2.6, th + 0.8); cx.restore();
      cx.fillStyle = "#3a4054"; cx.beginPath(); cx.arc(pxc, pyc, 2.6, 0, TAU); cx.fill(); cx.fillStyle = heat > 0 ? "#ffb060" : "#8a94ac"; cx.beginPath(); cx.arc(pxc, pyc, 1.1, 0, TAU); cx.fill();
    }
  };
  // ---- units ----
  var AUR = [null, null, "#cfe8ff", "#ffd35a"];
  FX.unit = function (u) {
    if (!G) return false; var cx = G.cx, f = u._f, dt = V.dtv || 0.016;
    if (!f) f = u._f = {born: V.t, rx: u.x, ry: u.y, ph: Math.random() * TAU, mvT: -9, sq: 0, drop: u.hero ? 130 : 38, landed: 0, nextHit: 0, nextDust: 0, hs: u.hp};
    var kk = 1 - Math.exp(-dt * 20), dx = u.x - f.rx, dy = u.y - f.ry; if (Math.abs(dx) + Math.abs(dy) > 3) { f.rx = u.x; f.ry = u.y; dx = dy = 0; } else { f.rx += dx * kk; f.ry += dy * kk; }
    var moving = Math.hypot(dx, dy) > 0.012; if (moving) f.mvT = V.t; moving = V.t - f.mvT < 0.18; var age = V.t - f.born;
    var sz = u.sz * 1.2, x = px(f.rx), y = py(f.ry);
    f.ph += dt * (moving ? (u.fly ? 9 : 13) : 2.6); var s1 = Math.sin(f.ph), bob = moving ? Math.abs(s1) * Math.max(2, sz * 0.14) : s1 * 0.5 + 0.5, drop = 0;
    if (age < 0.3) { var df = age / 0.3; drop = f.drop * (1 - df) * (1 - df); } else if (!f.landed) { f.landed = 1; f.sq = 0.35; var gp = px(u.x), gq = py(u.y); addRing(gp, gq, 17, u.hero ? "#ffd35a" : "#fff", {d: 0.35, w: 2}); burst(gp, gq, u.hero ? 8 : 4, {s0: 15, s1: 50, l0: 0.25, l1: 0.5, r0: 1.5, r1: 3, c: "#d9c9a0", ty: 2, grow: 3}); if (u.hero) { FX.shake(2.5); sfx("thud"); } }
    f.sq = Math.max(0, f.sq - dt * 3.4); var atk = u.atk > 0, lx = 0, ly = 0, lunge = 0;
    if (atk) { var tg = u.tgt, tx = tg ? (tg.cx !== undefined ? tg.cx : tg.x) : u.x + u.face, ty = tg ? (tg.cy !== undefined ? tg.cy : tg.y) : u.y, ang = Math.atan2(ty - u.y, tx - u.x), per = u.rng > 2 ? 0.55 : 0.4, ph = ((V.t + (u.wob || 0)) % per) / per;
      lunge = u.rng > 2 ? -Math.sin(ph * 3.14) * 1.2 : Math.pow(Math.sin(Math.min(1, ph * 1.6) * 3.14), 2) * Math.min(5, sz * 0.28); lx = Math.cos(ang) * lunge; ly = Math.sin(ang) * lunge * 0.6;
      if (u.rng <= 2 && V.t > f.nextHit && ph > 0.35) { f.nextHit = V.t + per; var hx = px(tx), hy = py(ty); burst(hx - Math.cos(ang) * 6, hy - Math.sin(ang) * 6 - 4, 3, {a0: ang + 2.6, a1: ang + 3.7, s0: 40, s1: 100, l0: 0.12, l1: 0.3, r0: 1, r1: 1.8, c: "#fff3b0", ty: 1}); if (u.sz >= 20) { addRing(hx, hy, 12, "#ffb060", {d: 0.25, w: 2}); FX.shake(0.7); sfx("thud"); } else sfx("hit"); }
    }
    var stretch = f.sq > 0 ? 1 - f.sq * 0.45 * Math.min(1, f.sq * 2) : 1, wk = moving ? Math.cos(f.ph * 2) * 0.07 : Math.sin(V.t * 3 + (u.wob || 0)) * 0.02, hitp = u.hit > 0 ? 0.12 : 0, sY = (1 + wk) * stretch * (1 - hitp * 0.5) * (age < 0.3 ? 1 + (1 - age / 0.3) * 0.25 : 1), sX = (1 - wk * 0.9) * (f.sq > 0 ? 1 + f.sq * 0.4 : 1) * (1 + hitp);
    var gy2 = y; if (u.fly) { cx.fillStyle = "rgba(0,0,0,.22)"; cx.beginPath(); cx.ellipse(x, y + 4, sz * 0.3, sz * 0.12, 0, 0, TAU); cx.fill(); y -= 10 + Math.sin(V.t * 6 + (u.wob || 0)) * 1.5; bob *= 0.5; }
    else { var shs = 1 - Math.min(0.4, bob * 0.04 + drop * 0.008); cx.fillStyle = "rgba(0,0,0," + (0.28 * (1 - Math.min(0.6, drop * 0.02))) + ")"; cx.beginPath(); cx.ellipse(x, y + 1, sz * 0.32 * shs, sz * 0.12 * shs, 0, 0, TAU); cx.fill(); }
    var lv = V.sim && V.sim.ulv && u.team === "a" && !u.hero ? (V.sim.ulv[u.k] || 1) : 1, tier = u.hero ? 3 : lv >= 3 ? 3 : lv >= 2 ? 2 : 0, ps = V.sim && V.sim.ps > 0 && u.team === "a" && !u.decoy;
    if (u.team === "a" && (tier >= 2 || u.bst > 0 || ps)) {
      cx.globalCompositeOperation = "lighter"; var pu = 0.6 + 0.4 * Math.sin(V.t * 5 + (u.wob || 0));
      if (tier >= 2) { cx.globalAlpha = 0.28 * pu * (tier === 3 ? 1.3 : 1); cx.fillStyle = AUR[tier]; cx.beginPath(); cx.ellipse(x, gy2 + 1, sz * 0.55, sz * 0.2, 0, 0, TAU); cx.fill(); if (tier === 3 && Math.random() < 0.06 * FX.q) sp(x + R(-6, 6), gy2 - R(0, 8), {vy: R(-25, -12), l: 0.7, r: 1.4, c: "#ffe9a0", ty: 6}); }
      if (u.bst > 0) { cx.globalAlpha = 0.45 * pu; cx.fillStyle = "#ff8a3a"; cx.beginPath(); cx.ellipse(x, gy2, sz * 0.62, sz * 0.24, 0, 0, TAU); cx.fill(); }
      if (ps) { cx.globalAlpha = 0.5 * pu; cx.fillStyle = "#c89aff"; cx.beginPath(); cx.ellipse(x, gy2, sz * 0.7, sz * 0.26, 0, 0, TAU); cx.fill(); }
      cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
    }
    if (u.stun > 0) { cx.strokeStyle = "#ffe65a"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(x, y - sz * 0.9 - 2 + Math.sin(V.t * 10), 4, 0, TAU); cx.stroke(); }
    if (u.root > 0) { cx.strokeStyle = "rgba(216,192,128,.9)"; cx.lineWidth = 1.5; cx.beginPath(); cx.ellipse(x, gy2, 10, 4, 0, 0, TAU); cx.stroke(); }
    if (u.slow > 0) { cx.fillStyle = "rgba(120,200,255,.35)"; cx.beginPath(); cx.ellipse(x, gy2, 11, 5, 0, 0, TAU); cx.fill(); }
    if (u.hero) { cx.strokeStyle = (u.hid === "scx" ? "rgba(70,230,210," : "rgba(255,211,90,") + (0.5 + 0.3 * Math.sin(V.t * 6)) + ")"; cx.lineWidth = 1.5; cx.beginPath(); cx.ellipse(x, gy2, 13, 5, 0, 0, TAU); cx.stroke(); }
    if (u.ab > 0) { cx.globalCompositeOperation = "lighter"; cx.fillStyle = u.hid === "scx" ? "rgba(70,230,210,.35)" : "rgba(255,181,49,.4)"; cx.beginPath(); cx.arc(x, y - 8, 16 + Math.sin(V.t * 12) * 2, 0, TAU); cx.fill(); cx.globalCompositeOperation = "source-over"; if (Math.random() < 0.3 * FX.q) sp(x + R(-8, 8), y - R(0, 18), {vx: R(-8, 8), vy: R(-40, -20), l: 0.5, r: 1.8, c: u.hid === "scx" ? "#46e6d2" : "#ffd35a", ty: 5}); }
    var art = u.art === "hero" ? "bg_front" : u.art, flip = u.face < 0, tilt = u.k === "roller" ? V.t * 8 : Math.sin(f.ph) * (moving ? 0.1 : 0.015) + (atk ? lunge * 0.03 : 0);
    cx.globalAlpha = u.veil > 0 ? 0.45 : u.dig > 0 ? 0.25 : 1; if (u.dig > 0) { cx.fillStyle = "rgba(90,60,30,.7)"; cx.beginPath(); cx.ellipse(x, y + 1, 9, 4, 0, 0, TAU); cx.fill(); }
    cx.save(); cx.translate(x + lx, y - bob - drop + ly); if (u.k === "roller") { cx.translate(0, -sz * 0.4); cx.rotate(tilt); cx.translate(0, sz * 0.4); } else cx.rotate(tilt); cx.scale(sX, sY);
    G.spr(art, 0, 0, sz, sz * 1.15, 1, flip);
    if (u.hit > 0) { cx.globalCompositeOperation = "lighter"; G.spr(art, 0, 0, sz, sz * 1.15, 0.7, flip); cx.globalCompositeOperation = "source-over"; }
    cx.restore(); cx.globalAlpha = 1;
    if (u.shld > 0) { cx.globalCompositeOperation = "lighter"; cx.strokeStyle = "rgba(120,230,255," + (0.5 + 0.2 * Math.sin(V.t * 9)) + ")"; cx.lineWidth = 1.6; cx.fillStyle = "rgba(100,210,255,.12)"; cx.beginPath(); cx.ellipse(x, y - sz * 0.45 - bob, sz * 0.62, sz * 0.7, 0, 0, TAU); cx.fill(); cx.stroke(); cx.globalCompositeOperation = "source-over"; }
    if (moving && !u.fly && V.t > f.nextDust && !u.dig) { f.nextDust = V.t + 0.17 + R(0, 0.08); sp(x - u.face * 3 + R(-2, 2), gy2, {vx: R(-6, 6), vy: R(-10, -2), l: 0.35, r: 1.6, c: "rgba(200,185,150,.6)", ty: 2, grow: 4}); }
    f.hs += (u.hp - f.hs) * Math.min(1, dt * 3); if (f.hs < u.hp) f.hs = u.hp;
    var bw = u.hero ? 20 : Math.max(8, sz * 0.7), by = y - sz * 1.1 - bob - drop;
    if ((u.hp < u.mx && !u.decoy) || u.hero || u.decoy) { var col = u.decoy || u.hero ? "#ffd35a" : u.team === "a" ? "#6ad0ff" : "#ff6a6a"; cx.fillStyle = "rgba(0,0,0,.65)"; cx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 4.5); cx.fillStyle = "rgba(255,255,255,.8)"; cx.fillRect(x - bw / 2, by, bw * Math.max(0, f.hs / u.mx), 2.5); cx.fillStyle = col; cx.fillRect(x - bw / 2, by, bw * Math.max(0, u.hp / u.mx), 2.5); }
    return true;
  };
  // ---- lighting ----
  FX.tod = function () {
    var q = (location.search.match(/[?&]tod=([a-z]+)/) || [])[1]; if (q) return q; var s = BB.S.set.tod; if (s && s !== "auto") return s;
    var h = new Date().getHours(); return h >= 7 && h < 16 ? "day" : (h >= 16 && h < 20) || (h >= 5 && h < 7) ? "gold" : "night";
  };
  FX.drawLight = function () {
    var cx = G.cx, mode = FX.tod(), W = 360, H = G.Hl, i;
    if (mode === "gold") { var g = cx.createLinearGradient(0, 0, W * 0.9, H * 0.7); g.addColorStop(0, "rgba(255,196,96,.20)"); g.addColorStop(0.5, "rgba(255,170,80,.07)"); g.addColorStop(1, "rgba(120,60,120,.12)"); cx.fillStyle = g; cx.fillRect(0, 0, W, H); }
    else if (mode === "night") { cx.fillStyle = "rgba(14,22,62,.30)"; cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = "lighter"; var list = V.mode === "raid" && V.sim ? V.sim.bld : (V.base || []);
      for (i = 0; i < list.length; i++) { var b = list[i], d = C.B[b.t]; if (!d || d.kind === "wall" || d.kind === "trap" || b.dead) continue; var bx = G.gx + (b.cx !== undefined ? b.cx : b.x + d.w / 2) * T, by = G.gy + (b.cy !== undefined ? b.cy : b.y + d.h / 2) * T, fl = calm() ? 1 : 0.85 + 0.15 * Math.sin(V.t * 7 + i * 1.7), gr = cx.createRadialGradient(bx, by, 1, bx, by, 22); gr.addColorStop(0, "rgba(255,200,110," + (0.30 * fl) + ")"); gr.addColorStop(1, "rgba(255,170,80,0)"); cx.fillStyle = gr; cx.fillRect(bx - 22, by - 22, 44, 44); } cx.globalCompositeOperation = "source-over"; }
    if (!FX._vig || FX._vig.h !== H) { var c = document.createElement("canvas"); c.width = 90; c.height = Math.max(2, Math.round(H / 4)); var v = c.getContext("2d"), rg = v.createRadialGradient(45, c.height / 2, c.height * 0.3, 45, c.height / 2, c.height * 0.82); rg.addColorStop(0, "rgba(10,10,30,0)"); rg.addColorStop(1, "rgba(10,10,30,.34)"); v.fillStyle = rg; v.fillRect(0, 0, 90, c.height); FX._vig = {c: c, h: H}; }
    cx.drawImage(FX._vig.c, 0, 0, W, H);
    if (FX.rays && !calm()) { var rs = FX.rays, f = rs.t / rs.d; cx.globalCompositeOperation = "lighter"; cx.fillStyle = "rgba(220,190,255," + ((1 - f) * 0.35) + ")"; for (var k = 0; k < 10; k++) { var a = k * 0.628 + rs.t * 0.8; cx.beginPath(); cx.moveTo(rs.x, rs.y); cx.arc(rs.x, rs.y, 520, a, a + 0.14); cx.closePath(); cx.fill(); } cx.globalCompositeOperation = "source-over"; }
    if ((mode === "night" || mode === "gold") && V.mode === "base") { cx.globalCompositeOperation = "lighter"; for (var q = 0; q < 9; q++) { var fx2 = 40 + (q * 97) % 280 + Math.sin(V.t * 0.6 + q) * 14, fy2 = G.gy + 20 + (q * 53) % 340 + Math.cos(V.t * 0.8 + q * 2) * 10, fa = calm() ? 0.5 : 0.35 + 0.35 * Math.sin(V.t * 2.5 + q * 3); cx.fillStyle = "rgba(255,240,140," + fa + ")"; cx.beginPath(); cx.arc(fx2, fy2, 1.3, 0, TAU); cx.fill(); } cx.globalCompositeOperation = "source-over"; }
  };
  // ---- ambient life (base) ----
  var amb = null, homeSmoke = 0;
  function pickSpot(a) {
    var Hl = G.Hl, gy = G.gy, bot = G.gy + N * T; a.sx = a.sx || 0; var top = Math.random() < 0.4 && gy > 34;
    a.tx = R(14, 340); a.ty = top ? R(12, Math.max(14, gy - 8)) : R(bot + 10, Math.max(bot + 12, Hl - 14)); if (a.ty > Hl - 6) a.ty = Hl - 8; a.wait = R(0.5, 3.5);
  }
  function initAmbient() {
    var Hl = G.Hl; amb = {an: [], cl: [], wk: [], H: Hl};
    var kinds = [["cow", 26], ["sheep", 20], ["pig", 20], ["chicken", 15], ["chicken", 14], ["sheep", 19]];
    kinds.forEach(function (k, i) { var a = {art: k[0], sz: k[1], x: R(20, 340), y: 0, ph: R(0, 6), face: 1, wait: R(0, 2), sx: 0}; pickSpot(a); a.x = a.tx; a.y = a.ty; pickSpot(a); amb.an.push(a); });
    for (var i = 0; i < 4; i++) amb.cl.push({art: "cloud" + (1 + i % 3), x: R(-40, 360), y: R(10, Math.max(30, Hl - 80)), v: R(3, 7), w: R(70, 120)});
    amb.wk = [{x: 0, y: 0, tx: 0, ty: 0, ph: 0, wait: 0, f: 1, col: "#8fe0a0"}, {x: 0, y: 0, tx: 0, ty: 0, ph: 2, wait: 1, f: 1, col: "#ffb870"}];
  }
  function ambientUpdate(dt) {
    if (!amb || amb.H !== G.Hl) initAmbient(); var i;
    amb.an.forEach(function (a) { if (a.wait > 0) { a.wait -= dt; a.moving = 0; return; } var dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy); if (d < 2) { pickSpot(a); return; } var sp0 = a.art === "chicken" ? 16 : 9; a.x += dx / d * sp0 * dt; a.y += dy / d * sp0 * dt; a.face = dx < 0 ? -1 : 1; a.moving = 1; a.ph += dt * (a.art === "chicken" ? 16 : 9); });
    amb.cl.forEach(function (c) { c.x += c.v * dt; if (c.x > 380) { c.x = -c.w - 10; c.y = R(10, Math.max(30, G.Hl - 80)); } });
    if (V.mode === "base" && V.base) {
      var hs = null, tk = null, list = V.base.filter(function (b) { return b.t !== "wall" && b.t !== "trap"; }); for (i = 0; i < V.base.length; i++) { if (V.base[i].t === "core") hs = V.base[i]; if (V.base[i].t === "tinker") tk = V.base[i]; }
      homeSmoke -= dt; if (hs && homeSmoke <= 0) { homeSmoke = R(0.35, 0.6) / FX.q; sp(G.gx + (hs.x + 2.3) * T, G.gy + (hs.y + 0.1) * T, {vx: R(2, 8), vy: R(-16, -9), l: 2, r: 2.2, c: "rgba(235,235,235,.6)", ty: 2, grow: 4}); }
      amb.wk.forEach(function (w, k) { if (!tk || !list.length) return; if (w.wait > 0) { w.wait -= dt; if (w.wait <= 0 || w.building) { } w.moving = 0; if (w.wait > 0) { if (w.hammer && Math.random() < dt * 3) sp(w.x + 3 * w.f, w.y - 6, {vx: R(-30, 30), vy: R(-50, -20), g: 120, l: 0.3, r: 1.2, c: "#ffd35a", ty: 5}); return; } } var dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy); if (!w.tx || d < 2) { var b = list[(Math.random() * list.length) | 0], dd = C.B[b.t]; w.tx = G.gx + (b.x + dd.w * (0.3 + Math.random() * 0.4)) * T; w.ty = G.gy + (b.y + dd.h) * T + 3; w.wait = R(1, 3); w.hammer = !!b.up || Math.random() < 0.4; if (!w.x) { w.x = G.gx + (tk.x + 1) * T; w.y = G.gy + (tk.y + 2) * T + 3; } return; } w.x += dx / d * 18 * dt; w.y += dy / d * 18 * dt; w.f = dx < 0 ? -1 : 1; w.ph += dt * 14; w.moving = 1; });
    }
  }
  FX.drawBelow = function () {
    if (!amb) return; var cx = G.cx; cx.fillStyle = "rgba(10,30,20,.10)"; amb.cl.forEach(function (c) { cx.beginPath(); cx.ellipse(c.x + c.w * 0.5 + 14, c.y + c.w * 0.5 + 22, c.w * 0.4, c.w * 0.14, 0, 0, TAU); cx.fill(); });
  };
  FX.drawClouds = function () { if (!amb || V.mode !== "base") return; amb.cl.forEach(function (c) { G.spr(c.art, c.x + c.w / 2, c.y + c.w * 0.5, c.w, c.w * 0.7, FX.tod() === "night" ? 0.25 : 0.62); }); };
  FX.drawBaseLife = function () {
    if (!amb || V.mode !== "base") return; var cx = G.cx, items = [];
    amb.an.forEach(function (a) { items.push([a.y, function () { var bob = a.moving ? Math.abs(Math.sin(a.ph)) * 1.8 : 0, tl = a.moving ? Math.sin(a.ph) * 0.07 : 0, graze = !a.moving ? Math.max(0, Math.sin(V.t * 1.4 + a.x)) * 0.08 : 0; cx.fillStyle = "rgba(0,0,0,.2)"; cx.beginPath(); cx.ellipse(a.x, a.y, a.sz * 0.36, a.sz * 0.1, 0, 0, TAU); cx.fill(); cx.save(); cx.translate(a.x, a.y - bob); cx.rotate(tl + graze * a.face); G.spr(a.art, 0, 0, a.sz, a.sz * 1.1, 1, a.face < 0); cx.restore(); }]); });
    amb.wk.forEach(function (w, k) { if (!w.x) return; items.push([w.y, function () { var bob = w.moving ? Math.abs(Math.sin(w.ph)) * 1.6 : 0; cx.fillStyle = "rgba(0,0,0,.22)"; cx.beginPath(); cx.ellipse(w.x, w.y, 4.5, 1.6, 0, 0, TAU); cx.fill(); cx.save(); cx.translate(w.x, w.y - bob); cx.scale(w.f, 1); cx.fillStyle = "#3a4054"; rr2(cx, -3.5, -9, 7, 7.5, 2.5); cx.fillStyle = w.col; rr2(cx, -3, -8.5, 6, 3.4, 1.8); cx.fillStyle = "#fff"; cx.fillRect(0.4, -7.6, 1.6, 1.4); cx.fillStyle = "#262a36"; var lg = w.moving ? Math.sin(w.ph) * 1.6 : 0; cx.fillRect(-2.4 + lg, -1.6, 1.6, 1.6); cx.fillRect(0.8 - lg, -1.6, 1.6, 1.6); var sw = w.hammer && !w.moving ? Math.sin(V.t * 14 + k) : 0; cx.strokeStyle = "#a07040"; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(3, -5); cx.lineTo(3 + 3.5 * Math.cos(-0.9 + sw), -5 + 3.5 * Math.sin(-0.9 + sw)); cx.stroke(); cx.fillStyle = "#c8ccd8"; cx.fillRect(3 + 3.5 * Math.cos(-0.9 + sw) - 1.5, -5 + 3.5 * Math.sin(-0.9 + sw) - 1, 3, 2); cx.restore(); }]); });
    items.sort(function (a, b) { return a[0] - b[0]; }); items.forEach(function (it) { it[1](); });
    // windmill (decor, top-right corner)
    var wx = 332, wy = Math.max(30, G.gy - 2); cx.fillStyle = "rgba(0,0,0,.18)"; cx.beginPath(); cx.ellipse(wx, wy + 1, 14, 3.5, 0, 0, TAU); cx.fill(); cx.fillStyle = "#c9a36a"; cx.beginPath(); cx.moveTo(wx - 8, wy); cx.lineTo(wx - 4.5, wy - 28); cx.lineTo(wx + 4.5, wy - 28); cx.lineTo(wx + 8, wy); cx.closePath(); cx.fill(); cx.fillStyle = "#a8794a"; cx.fillRect(wx - 2.5, wy - 8, 5, 8); cx.fillStyle = "#8a4b32"; cx.beginPath(); cx.moveTo(wx - 6, wy - 28); cx.lineTo(wx, wy - 35); cx.lineTo(wx + 6, wy - 28); cx.closePath(); cx.fill();
    cx.save(); cx.translate(wx, wy - 27); cx.rotate(V.t * (calm() ? 0.5 : 1.3)); for (var b = 0; b < 4; b++) { cx.rotate(1.5708); cx.fillStyle = "#f2e8d0"; cx.fillRect(1, -2.4, 18, 4.8); cx.fillStyle = "#a07040"; cx.fillRect(1, -0.5, 18, 1); } cx.fillStyle = "#6a4423"; cx.beginPath(); cx.arc(0, 0, 2.2, 0, TAU); cx.fill(); cx.restore();
  };
  // tinker propeller + crop sway + construction + collectable glow
  FX.sway = function (i) { return Math.sin(V.t * 1.8 + i * 1.3) * 1.3; };
  FX.tinkerOver = function (x, y, w, h) { var cx = G.cx; cx.save(); cx.translate(x + w * 0.5, y + 2); cx.fillStyle = "#6a7088"; cx.fillRect(-0.8, -5, 1.6, 5); cx.scale(Math.cos(V.t * 24), 1); cx.fillStyle = "rgba(230,235,245,.85)"; cx.beginPath(); cx.ellipse(0, -5, 9, 1.4, 0, 0, TAU); cx.fill(); cx.restore(); };
  FX.constructOver = function (b, x, y, w, h) {
    var cx = G.cx, f = b._f || (b._f = {}), s = V.t * 12;
    cx.strokeStyle = "rgba(160,112,64,.9)"; cx.lineWidth = 1.1; cx.beginPath(); cx.moveTo(x + 1, y + h); cx.lineTo(x + 1, y + h * 0.15); cx.moveTo(x + w - 1, y + h); cx.lineTo(x + w - 1, y + h * 0.15); for (var i = 1; i < 4; i++) { var yy = y + h * (0.15 + i * 0.22); cx.moveTo(x + 1, yy); cx.lineTo(x + w - 1, yy); } cx.stroke();
    cx.fillStyle = "rgba(255,200,60,.9)"; for (i = 0; i < 6; i++) cx.fillRect(x + 1 + i * (w - 2) / 6, y + h * 0.13, (w - 2) / 6 - 1, 2);
    var hx = x + w * (0.5 + 0.3 * Math.sin(V.t * 0.9)), sw = Math.sin(s); cx.save(); cx.translate(hx, y + h * 0.55); cx.strokeStyle = "#a07040"; cx.lineWidth = 1.4; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(Math.cos(-1 + sw * 0.9) * 6, Math.sin(-1 + sw * 0.9) * 6); cx.stroke(); cx.fillStyle = "#c8ccd8"; cx.fillRect(Math.cos(-1 + sw * 0.9) * 6 - 2, Math.sin(-1 + sw * 0.9) * 6 - 1.5, 4, 3); cx.restore();
    if (sw > 0.97 && V.t - (f.hs || 0) > 0.2) { f.hs = V.t; burst(hx + 4, y + h * 0.55 + 4, 4, {s0: 30, s1: 90, g: 120, l0: 0.25, l1: 0.45, r0: 1, r1: 1.8, cols: ["#ffd35a", "#fff"], ty: 5}); if (Math.random() < 0.4) sfx("hammer"); }
    if (Math.random() < 0.05 * FX.q) sp(x + R(2, w - 2), y + h, {vx: R(-6, 6), vy: R(-10, -4), l: 0.7, r: 2, c: "rgba(210,195,160,.6)", ty: 2, grow: 4});
  };
  FX.homeReady = function (x, y, w, res) {
    var cx = G.cx, c = res === "c" ? "255,211,90" : "143,212,255", pu = 0.5 + 0.5 * Math.sin(V.t * 5); cx.globalCompositeOperation = "lighter"; var g = cx.createRadialGradient(x + w / 2, y - 3, 1, x + w / 2, y - 3, 15 + pu * 3); g.addColorStop(0, "rgba(" + c + ",.55)"); g.addColorStop(1, "rgba(" + c + ",0)"); cx.fillStyle = g; cx.fillRect(x + w / 2 - 20, y - 24, 40, 40); cx.globalCompositeOperation = "source-over";
    if (Math.random() < 0.08 * FX.q) sp(x + w / 2 + R(-8, 8), y - 4 + R(-4, 4), {vy: R(-24, -10), l: 0.6, r: 1.5, c: "rgb(" + c + ")", ty: 6});
  };
  FX.init = function () { document.body.classList.toggle("calm", calm()); FX.initDom && FX.initDom(); };
  // ======== UI / overlay layer (screen space, #fxo canvas) ========
  var oc = null, ox = null, OW = 0, OH = 0, ODPR = 1, banners = [], flies = [], confs = [], icoImg = {}, hudBump = {}, lastTs = 0, idle = false;
  function img(n) { if (!icoImg[n]) { var i = new Image(); i.src = "assets/" + n + ".webp"; icoImg[n] = i; } var i2 = icoImg[n]; return i2.complete && i2.naturalWidth ? i2 : null; }
  FX.banner = function (txt, col, sub, o) {
    o = o || {}; if (banners.length > 2) banners.shift(); if (banners.length && banners[banners.length - 1].txt === txt && banners[banners.length - 1].t < 0.5) return;
    banners.push({txt: txt, c: col || "#fff", sub: sub, t: 0, d: o.big ? 2.0 : 1.5, big: !!o.big});
  };
  function toScreen(x, y) { var r = G && G.rect && G.rect(); if (!r) return [x, y]; return [r.left + x / 360 * r.width, r.top + y / G.Hl * r.height]; }
  FX.toScreen = toScreen;
  function targetEl(kind) {
    var ids = V.mode === "raid" ? null : (kind === "c" ? "bv-coins" : "bv-salv"), el = null;
    if (ids) el = document.getElementById(ids); else { var l = document.getElementById("r-loot"); el = l && l.children[kind === "c" ? 0 : 1]; }
    if (!el) return null; var r = el.getBoundingClientRect(); if (!r.width) return null; return {x: r.left + r.width * 0.3, y: r.top + r.height / 2, el: el};
  }
  FX.flyWorld = function (X, Y, kind, count, total) { var s = toScreen(X, Y); FX.flyScreen(s[0], s[1], kind, count, total); };
  FX.flyScreen = function (sx, sy, kind, count, total, tgt) {
    var t = tgt || targetEl(kind) || {x: kind === "c" ? 60 : 150, y: 24}; count = Math.max(1, Math.min(count || 4, calm() ? 4 : 10)); if (flies.length > 50) return;
    for (var i = 0; i < count; i++) flies.push({x0: sx + R(-10, 10), y0: sy + R(-6, 6), x1: t.x, y1: t.y, el: t.el, kind: kind, t: -i * 0.06 - R(0, 0.05), d: R(0.55, 0.8), cp: R(-70, 70), n: i, last: i === count - 1, val: total ? total / count : 0, sp: R(0, 6)});
    idle = false;
  };
  FX.confetti = function (x, y, n, screen) {
    var s = screen ? [x, y] : toScreen(x, y), cols = ["#ffd35a", "#ff5ad0", "#5af0ff", "#9be26b", "#ff8a3a", "#fff"]; n = Math.min(n || 60, calm() ? 20 : 90); if (confs.length > 200) return;
    for (var i = 0; i < n; i++) { var a = R(-2.6, -0.55); var sp0 = R(160, 520); confs.push({x: s[0], y: s[1], vx: Math.cos(a) * sp0, vy: Math.sin(a) * sp0, w: R(5, 10), h: R(3, 6), r: R(0, 6), vr: R(-12, 12), c: cols[(Math.random() * cols.length) | 0], t: 0, d: R(1.6, 2.8), sw: R(2, 7)}); }
    idle = false;
  };
  FX.bump = function (el) { if (!el) return; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); };
  FX.count = function (el, to, dur, fmt, tickSfx) {
    if (!el) return; var from = +el._cv || 0, t0 = performance.now(), last = -1; el._cv = to; dur = dur || 900; if (el._raf) cancelAnimationFrame(el._raf); fmt = fmt || function (v) { return String(v); };
    (function st(ts) { var f = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - f, 3), v = Math.round(from + (to - from) * e); el.textContent = fmt(v); var tk = Math.floor(f * 12); if (tickSfx && tk !== last) { last = tk; sfx("tick", tk); } if (f < 1) el._raf = requestAnimationFrame(st); else { el._raf = 0; el.textContent = fmt(to); FX.bump(el); } })(t0);
  };
  FX.starBurst = function (el) { if (!el) return; var r = el.getBoundingClientRect(); var x = r.left + r.width / 2, y = r.top + r.height / 2; for (var i = 0; i < 14; i++) { var a = i / 14 * TAU, s0 = R(90, 220); confs.push({x: x, y: y, vx: Math.cos(a) * s0, vy: Math.sin(a) * s0, w: 6, h: 6, r: R(0, 6), vr: R(-8, 8), c: i % 2 ? "#ffd35a" : "#fff7c0", t: 0, d: R(0.5, 0.9), sw: 0, star: 1}); } FX.ring2 = {x: x, y: y, t: 0}; idle = false; };
  FX.arrow = function (el, txt) {
    FX.arrowOff(); if (!el) return; var a = document.createElement("div"); a.className = "tut-arrow"; a.innerHTML = "<b>" + (txt || "") + "</b><i></i>"; document.body.appendChild(a); FX._ar = {a: a, el: el};
    FX.placeArrow();
  };
  FX.placeArrow = function () { var A = FX._ar; if (!A) return; if (!document.body.contains(A.el)) { FX.arrowOff(); return; } var md = document.querySelector(".mbox"); A.a.style.display = (md && !md.contains(A.el)) ? "none" : ""; var r = A.el.getBoundingClientRect(); var aw = A.a.offsetWidth || 120, cx = r.left + r.width / 2, lx = Math.max(aw / 2 + 6, Math.min(window.innerWidth - aw / 2 - 6, cx)); A.a.style.left = lx + "px"; var ii = A.a.lastChild; if (ii) ii.style.transform = "translateX(" + Math.max(-aw / 2 + 16, Math.min(aw / 2 - 16, cx - lx)) + "px)"; A.a.style.top = (r.top - 8) + "px"; A.a.classList.toggle("below", r.top < 110); if (r.top < 110) A.a.style.top = (r.bottom + 8) + "px"; };
  FX.arrowOff = function () { if (FX._ar) { FX._ar.a.remove(); FX._ar = null; } };
  FX.initDom = function () {
    if (oc) return; oc = document.createElement("canvas"); oc.id = "fxo"; document.body.appendChild(oc); ox = oc.getContext("2d"); sizeO(); window.addEventListener("resize", sizeO);
    var base = document.getElementById("base") || document.body, cb = document.createElement("div"); cb.id = "r-combo"; cb.className = "r-combo hidden"; cb.innerHTML = '<b></b><span></span><i><u></u></i>'; base.appendChild(cb);
    var ps = document.createElement("button"); ps.id = "r-ps"; ps.className = "r-ps hidden"; ps.innerHTML = '<span class="psf"></span><b>POWER SURGE</b><em></em>'; base.appendChild(ps); ps.addEventListener("click", function () { if (FX.cb && FX.cb.ps) FX.cb.ps(); });
    var top = document.getElementById("r-top"); if (top && !document.getElementById("r-pbar")) { var pb = document.createElement("div"); pb.id = "r-pbar"; pb.className = "r-pbar"; pb.innerHTML = '<i></i><u class="m1"></u><u class="m2"></u>'; var row = top.querySelector(".r-row"); if (row) row.after(pb); else top.appendChild(pb); }
    requestAnimationFrame(oloop);
  };
  function sizeO() { ODPR = Math.min(window.devicePixelRatio || 1, 2); OW = window.innerWidth; OH = window.innerHeight; oc.width = Math.round(OW * ODPR); oc.height = Math.round(OH * ODPR); idle = false; }
  var uiT = 0;
  FX.uiUpdate = function (dt) {
    var raid = V.mode === "raid" && V.sim && !V.sim.done && FX.hudOn, cb = document.getElementById("r-combo"), ps = document.getElementById("r-ps"); if (!cb || !ps) return;
    uiT += dt; if (uiT < 0.05) return; uiT = 0;
    if (!raid) { if (!cb.classList.contains("hidden")) cb.classList.add("hidden"); if (!ps.classList.contains("hidden")) ps.classList.add("hidden"); return; }
    var sim = V.sim, c = sim.cmb, live = c.n >= 2 && sim.t - c.last < 4, t = c.tier;
    if (!live && comboTier) { comboTier = 0; BB.musicIntensity && BB.musicIntensity(0); }
    cb.classList.toggle("hidden", !live); if (live) { var tt = TIER[t]; cb.style.setProperty("--cc", tt ? tt.c : "#fff"); cb.dataset.tier = t; var bn = cb.children[0], nn = "x" + c.n; if (cb._n !== c.n) { cb._n = c.n; bn.textContent = nn; cb.children[1].textContent = tt ? tt.n : "COMBO"; cb.classList.remove("hit"); void cb.offsetWidth; cb.classList.add("hit"); } cb.children[2].firstChild.style.width = Math.max(0, 100 - (sim.t - c.last) / 4 * 100) + "%"; }
    var ch = Math.min(100, sim.charge || 0), rdy = ch >= 100 && !sim.done, act = sim.ps > 0; ps.classList.toggle("hidden", !(sim.started || sim.t > 0) || (sim.done)); ps.classList.toggle("ready", rdy && !act); ps.classList.toggle("active", act); ps.firstChild.style.width = (act ? Math.max(0, sim.ps / 7 * 100) : ch) + "%";
    ps.children[1].textContent = act ? "SURGING" : rdy ? "POWER SURGE" : Math.floor(ch) + "%"; if (rdy && !ps._r) { ps._r = 1; sfx("psready"); BB.vibe && BB.vibe([15, 30, 15]); banner("SURGE READY!", "#d9b8ff", "Tap the glowing meter"); } if (!rdy) ps._r = 0;
  };
  function oloop(ts) {
    requestAnimationFrame(oloop); var dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016); lastTs = ts; FX.placeArrow && FX._ar && FX.placeArrow();
    var i, a = ovFlash.a > 0.01, hasDark = FX.dark, act = banners.length || flies.length || confs.length || a || hasDark || FX.ring2 || (FX.cam && FX.cam.z > 1.01 && FX.vig);
    if (!act) { if (!idle) { ox.clearRect(0, 0, oc.width, oc.height); idle = true; } return; } idle = false;
    ox.setTransform(ODPR, 0, 0, ODPR, 0, 0); ox.clearRect(0, 0, OW, OH);
    if (hasDark) { var d = FX.dark, f = d.t / d.d, al = f < 0.2 ? f / 0.2 : f > 0.7 ? (1 - f) / 0.3 : 1; ox.fillStyle = "rgba(8,4,24," + (0.5 * al) + ")"; ox.fillRect(0, 0, OW, OH); }
    if (a) { ox.globalAlpha = Math.min(0.9, ovFlash.a); ox.fillStyle = ovFlash.c; ox.fillRect(0, 0, OW, OH); ox.globalAlpha = 1; }
    for (i = banners.length - 1; i >= 0; i--) { var b = banners[i]; b.t += dt; if (b.t >= b.d) { banners.splice(i, 1); continue; } }
    banners.forEach(function (b, k) {
      var f = b.t / b.d, inn = Math.min(1, b.t / 0.22), sc = back(inn) * (b.big ? 1.25 : 1) * (f > 0.82 ? 1 - (f - 0.82) / 0.18 * 0.3 : 1), al = f > 0.8 ? (1 - f) / 0.2 : 1, y = OH * 0.27 + k * 46 * (b.big ? 1.4 : 1) - (f > 0.8 ? (f - 0.8) * 60 : 0), px0 = Math.min(OW * 0.12, 46), sz = Math.round(px0 * (b.big ? 1 : 0.78));
      ox.save(); ox.globalAlpha = al; ox.translate(OW / 2, y); ox.scale(sc, sc); ox.textAlign = "center"; ox.lineJoin = "round"; ox.font = "900 " + sz + "px 'Trebuchet MS',Impact,sans-serif"; var mw = (ox.measureText(b.txt).width + sz * 0.3) * sc; if (mw > OW * 0.94) { var kk = OW * 0.94 / mw; ox.scale(kk, kk); } ox.shadowColor = b.c; ox.shadowBlur = calm() ? 0 : 18; ox.lineWidth = sz * 0.2; ox.strokeStyle = "rgba(20,8,40,.92)"; ox.strokeText(b.txt, 0, 0); ox.shadowBlur = 0; var g = ox.createLinearGradient(0, -sz * 0.8, 0, sz * 0.1); g.addColorStop(0, "#fff"); g.addColorStop(0.5, b.c); g.addColorStop(1, b.c); ox.fillStyle = g; ox.fillText(b.txt, 0, 0);
      if (b.sub) { ox.font = "800 " + Math.round(sz * 0.36) + "px 'Trebuchet MS',sans-serif"; ox.lineWidth = 4; ox.strokeStyle = "rgba(20,8,40,.9)"; ox.strokeText(b.sub, 0, sz * 0.55); ox.fillStyle = "#fff"; ox.fillText(b.sub, 0, sz * 0.55); } ox.restore();
    });
    for (i = flies.length - 1; i >= 0; i--) {
      var fl = flies[i]; fl.t += dt; if (fl.t < 0) continue; var f2 = Math.min(1, fl.t / fl.d), e = f2 * f2 * (3 - 2 * f2), mx = (fl.x0 + fl.x1) / 2 + fl.cp, my = Math.min(fl.y0, fl.y1) - 40, u = 1 - e, x = u * u * fl.x0 + 2 * u * e * mx + e * e * fl.x1, y = u * u * fl.y0 + 2 * u * e * my + e * e * fl.y1;
      var im = img(fl.kind === "c" ? "i_coin" : "i_scrap"), sz2 = 15 * (1 - e * 0.35); ox.globalCompositeOperation = "lighter"; ox.fillStyle = fl.kind === "c" ? "rgba(255,211,90,.35)" : "rgba(143,212,255,.35)"; ox.beginPath(); ox.arc(x, y, sz2 * 0.9, 0, TAU); ox.fill(); ox.globalCompositeOperation = "source-over";
      ox.save(); ox.translate(x, y); if (fl.kind === "c") ox.scale(Math.cos(fl.t * 14 + fl.sp), 1); else ox.rotate(fl.t * 8); if (im) ox.drawImage(im, -sz2 / 2, -sz2 / 2, sz2, sz2); else { ox.fillStyle = fl.kind === "c" ? "#ffd35a" : "#8fd4ff"; ox.beginPath(); ox.arc(0, 0, sz2 / 2.4, 0, TAU); ox.fill(); } ox.restore();
      if (f2 >= 1) { flies.splice(i, 1); sfx("ping", fl.n + (fl.kind === "s" ? 2 : 0)); if (fl.el) FX.bump(fl.el); if (fl.val && FX.onFly) FX.onFly(fl.kind, fl.val); if (fl.last) BB.vibe && BB.vibe(8); }
    }
    for (i = confs.length - 1; i >= 0; i--) { var c = confs[i]; c.t += dt; if (c.t >= c.d) { confs.splice(i, 1); continue; } c.vy += 420 * dt; c.vx *= 1 - dt * 1.2; c.x += c.vx * dt + Math.sin(c.t * c.sw) * 20 * dt; c.y += c.vy * dt; c.r += c.vr * dt; ox.globalAlpha = Math.min(1, (c.d - c.t) * 2); ox.fillStyle = c.c; ox.save(); ox.translate(c.x, c.y); ox.rotate(c.r); if (c.star) { ox.fillRect(-c.w / 2, -0.8, c.w, 1.6); ox.fillRect(-0.8, -c.w / 2, 1.6, c.w); } else { ox.scale(1, Math.cos(c.t * 8 + c.r)); ox.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); } ox.restore(); }
    ox.globalAlpha = 1; if (FX.ring2) { var rg = FX.ring2; rg.t += dt; if (rg.t > 0.5) FX.ring2 = null; else { ox.strokeStyle = "rgba(255,230,140," + (1 - rg.t / 0.5) + ")"; ox.lineWidth = 3; ox.beginPath(); ox.arc(rg.x, rg.y, 8 + rg.t * 90, 0, TAU); ox.stroke(); } }
  }

  // ---- v0.6 late additions: scout pan, deploy ring, upgrade fanfare, clear ----
  var pan = null, _step0 = FX.step;
  FX.step = function (rdt) {
    var r = _step0(rdt);
    if (pan) {
      pan.t += rdt; var f = Math.min(1, pan.t / pan.d), e = ease(f), k = calm() ? 0.25 : 1;
      cam.z = cam.tz = 1 + 0.55 * k * (1 - e); cam.zh = 0.3; cam.fx = 180; cam.fy = 40 + 280 * e;
      if (f >= 1) { pan = null; cam.tz = 1; cam.zh = 0.01; }
    }
    return r;
  };
  FX.scoutPan = function (name, mi) {
    pan = {t: 0, d: 2.3}; cam.z = cam.tz = 1.55; sfx("whoosh");
    var thr = mi ? Math.min(5, 1 + Math.floor((mi + 1) / 2)) : 0, st = ""; for (var i = 0; i < 5; i++) st += i < thr ? "\u25A0" : "\u25A1";
    banner(name ? name.toUpperCase() : "SCOUTING", "#ffd35a", mi ? "Mission " + mi + "  Threat " + st : "Scouting the outpost", {big: true});
  };
  FX.deployRing = function (cx, cy, hero) {
    var X0 = px(cx), Y0 = py(cy); addRing(X0, Y0, hero ? 34 : 22, hero ? "#ffd35a" : "#fff2a0", {d: 0.45, w: 3}); addRing(X0, Y0, hero ? 18 : 11, "#ffffff", {d: 0.3, w: 2, fill: 1});
    burst(X0, Y0, hero ? 14 : 7, {s0: 20, s1: 60, l0: 0.25, l1: 0.5, c: "#e8d9b0", g: 80, ty: 2, grow: 6, up: -10});
  };
  FX.upDone = function (x, y, txt, sub, big) {
    var X0 = x, Y0 = y; addRing(X0, Y0, 50, "#ffe08a", {d: 0.7, w: 4}); addRing(X0, Y0, 28, "#fff", {d: 0.5, w: 2});
    burst(X0, Y0, 26, {s0: 40, s1: 140, l0: 0.5, l1: 1.0, cols: ["#ffe08a", "#fff", "#ffb531"], ty: 6, g: 60, r0: 2, r1: 4});
    banner(txt, "#ffe08a", sub, {big: !!big}); if (big) { FX.confetti(innerWidth / 2, innerHeight * 0.55, 70, true); FX.flash("#fff1b0", 0.5); FX.shake(5); }
    FX.hudPulse && FX.hudPulse();
  };
  FX.levelUp = function (txt, sub) { banner(txt, "#ffd35a", sub, {big: true}); FX.confetti(innerWidth / 2, innerHeight * 0.55, 80, true); FX.flash("#fff1b0", 0.45); sfx("fanfare"); BB.vibe && BB.vibe([30, 40, 30, 40, 60]); };
  FX.clearAll = function () {
    var i; for (i = 0; i < PCAP; i++) P[i].on = 0; live = 0; rings.length = 0; bolts.length = 0; beams.length = 0; projs.length = 0; ghosts.length = 0; colls.length = 0; crows.length = 0; nums.length = 0; meteors.length = 0; later.length = 0; tors.length = 0; banners.length = 0; flies.length = 0; confs.length = 0; pan = null; FX.arrowOff();
  };

  FX.upBadge = function (x, y, w) {
    var cx = G.cx, bob = Math.sin(V.t * 5 + x) * 1.6, X0 = x + w / 2, Y0 = y - 6 + bob, pu = 0.5 + 0.5 * Math.sin(V.t * 6 + x);
    cx.save(); cx.globalCompositeOperation = "lighter"; var g = cx.createRadialGradient(X0, Y0, 1, X0, Y0, 12 + pu * 3); g.addColorStop(0, "rgba(130,255,150,.55)"); g.addColorStop(1, "rgba(130,255,150,0)"); cx.fillStyle = g; cx.fillRect(X0 - 16, Y0 - 16, 32, 32); cx.restore();
    cx.save(); cx.translate(X0, Y0); var sc = 1 + pu * 0.12; cx.scale(sc, sc); cx.fillStyle = "#3ed16a"; cx.strokeStyle = "#0e5a2a"; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(0, -6); cx.lineTo(6, 1); cx.lineTo(2.2, 1); cx.lineTo(2.2, 6); cx.lineTo(-2.2, 6); cx.lineTo(-2.2, 1); cx.lineTo(-6, 1); cx.closePath(); cx.fill(); cx.stroke(); cx.restore();
  };
  FX.chest = function (streak) {
    FX.confetti(innerWidth / 2, innerHeight * 0.4, 70, true); FX.flash("#fff1b0", 0.35); FX.flyScreen(innerWidth / 2, innerHeight * 0.4, "c", 8, 0); FX.flyScreen(innerWidth / 2, innerHeight * 0.42, "s", 5, 0);
    if (streak >= 3) banner("STREAK x" + streak + "!", "#ff8a3a", "Keep it going for bigger gifts", {big: false}); BB.vibe && BB.vibe([30, 40, 60]);
  };
})();
