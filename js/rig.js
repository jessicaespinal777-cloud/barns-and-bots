"use strict";
// ---- v0.9 RIG: part-based (paper-doll) characters. Every body part is its own node with a pivot, rotation, offset and squash/stretch.
// Cosmetic only: it reads sim state and never writes it, so deterministic replays are unaffected.
// Parts come from an AI-generated atlas (Scarecrow-X, Baleguard) or from prerendered procedural vector canvases (squad variants, turrets, creatures).
(function () {
  var BB = window.BB = window.BB || {}, RIG = BB.RIG = {}, D = BB.RIGD || null, PI = Math.PI, TAU = PI * 2;
  var sin = Math.sin, cos = Math.cos, abs = Math.abs, max = Math.max, min = Math.min, exp = Math.exp;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrap(a) { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function calm() { return !!(RIG.forceCalm || (BB.S && BB.S.set && BB.S.set.calm)); }
  RIG.calm = calm;
  RIG.stats = {draws: 0, nodes: 0};

  // ---------- parts registry ----------
  var PARTS = RIG.parts = {}, atlas = null;
  RIG.ready = false;
  RIG.load = function (base) {
    if (atlas || !D) return; atlas = new Image();
    atlas.onload = function () { for (var k in D.r) { var r = D.r[k]; PARTS[k] = {im: atlas, sx: r[0], sy: r[1], sw: r[2], sh: r[3], dw: r[4], dh: r[5]}; } RIG.ready = true; };
    atlas.src = (base || "") + D.atlas;
  };
  RIG.addCanvas = function (name, cv, dw, dh) { PARTS[name] = {im: cv, sx: 0, sy: 0, sw: cv.width, sh: cv.height, dw: dw, dh: dh}; };

  // ---------- defs ----------
  var DEFS = RIG.defs = {};
  // node: {n, par, x, y, pv:[fx,fy] (pivot as fraction of the image), im (part name), z, r0, fl (mirror), after(cx,i)}
  RIG.define = function (kind, d) {
    d.kind = kind; d.map = {}; d.roots = [];
    d.nodes.forEach(function (nd) { nd.z = nd.z || 0; nd.r0 = nd.r0 || 0; nd.kids = []; nd.pv = nd.pv || [0.5, 0.5]; d.map[nd.n] = nd; });
    d.nodes.forEach(function (nd) { if (nd.par) d.map[nd.par].kids.push(nd); else d.roots.push(nd); });
    d.nodes.forEach(function (nd) { nd.kids.sort(function (a, b) { return a.z - b.z; }); });
    DEFS[kind] = d; return d;
  };
  RIG.has = function (kind) { return !!DEFS[kind]; };

  // ---------- instances ----------
  var SEED = 1;
  RIG.make = function (kind) {
    var d = DEFS[kind]; if (!d) return null; SEED = (SEED * 16807) % 2147483647;
    var i = {kind: kind, d: d, seed: SEED % 100, t: SEED % 17, ph: (SEED % 6), mv: 0, ak: 0, aim: 0, aimT: 0.5, al: 0.5, rc: 0, flash: 0, hit: 0, fl: 0, punch: 0, pside: 0, vic: 0, bst: 0, hold: 0, air: 0, crouch: 0, face: 1, cast: 0,
      p: {}, wm: {}, sp: {a: 0, v: 0}, sp2: {a: 0, v: 0}, sp3: {a: 0, v: 0}, mz: {x: 0, y: 0, a: 0}, ej: {x: 0, y: 0}, gx: 0, gy: 0, gs: 1, capAll: false, dead: 0, lastFire: -9, atkT: 0, ex: {}};
    d.nodes.forEach(function (nd) { i.p[nd.n] = {r: 0, dx: 0, dy: 0, sx: 1, sy: 1}; i.wm[nd.n] = new Float64Array([1, 0, 0, 1, 0, 0]); });
    return i;
  };
  function spring(s, tgt, dt, k, c) { var f = (tgt - s.a) * k - s.v * c; s.v += f * dt; s.a += s.v * dt; if (s.a > 1.4) s.a = 1.4; else if (s.a < -1.4) s.a = -1.4; }

  // ---------- pooled cosmetic effects: bullets, casings, sparks, rings (all in the caller's logical coordinates) ----------
  var BU = [], CA = [], SPK = [], RG = [], q0;
  for (q0 = 0; q0 < 56; q0++) BU.push({on: 0});
  for (q0 = 0; q0 < 44; q0++) CA.push({on: 0});
  for (q0 = 0; q0 < 150; q0++) SPK.push({on: 0});
  for (q0 = 0; q0 < 28; q0++) RG.push({on: 0});
  RIG.pool = {bu: BU, ca: CA, sp: SPK, rg: RG};
  function take(a) { for (var k = 0; k < a.length; k++) if (!a[k].on) return a[k]; return null; }
  var KIND = {
    rifle: {spd: 680, len: 26, w: 1.8, c: "#ffe9a0", c2: "#fff", glow: "#ffb830"},
    rail: {spd: 980, len: 54, w: 2.4, c: "#42f0e0", c2: "#e8ffff", glow: "#18d8c8"},
    cannon: {spd: 420, len: 20, w: 4.6, c: "#6fc8ff", c2: "#ffffff", glow: "#3a9bff", orb: 1},
    pellet: {spd: 560, len: 14, w: 1.6, c: "#ffd070", c2: "#fff", glow: "#ff9a30"},
    plasma: {spd: 480, len: 18, w: 3.4, c: "#ff7a3a", c2: "#ffe6b0", glow: "#ff5a20", orb: 1},
    spit: {spd: 330, len: 12, w: 3.6, c: "#9bff4a", c2: "#e8ffb0", glow: "#6adc20", orb: 1, arc: 1},
    frost: {spd: 520, len: 22, w: 3, c: "#9be8ff", c2: "#fff", glow: "#5ac8ff"},
    bolt: {spd: 760, len: 34, w: 2.4, c: "#c8b0ff", c2: "#fff", glow: "#9a7bff"},
    seed: {spd: 480, len: 16, w: 3, c: "#ffe05a", c2: "#fff", glow: "#ffc531", orb: 1}
  };
  RIG.KIND = KIND;
  RIG.bullet = function (x1, y1, x2, y2, kind, o) {
    var b = take(BU); if (!b) return null; var k = KIND[kind] || KIND.rifle, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1; o = o || {};
    b.on = 1; b.x = x1; b.y = y1; b.sx = x1; b.sy = y1; b.ex = x2; b.ey = y2; b.ux = dx / L; b.uy = dy / L; b.L = L; b.d = 0; b.k = k; b.kind = kind; b.spd = (o.spd || k.spd) * (0.92 + Math.random() * 0.16);
    b.arc = o.arc !== undefined ? o.arc : (k.arc ? min(26, L * 0.28) : 0); b.sm = 0; b.rot = Math.atan2(dy, dx); b.imp = o.imp !== false; b.big = o.big || 1; b.delay = o.delay || 0; return b;
  };
  RIG.spark = function (x, y, a, spd, life, c, g) {
    var s = take(SPK); if (!s) return; s.on = 1; s.x = x; s.y = y; s.vx = cos(a) * spd; s.vy = sin(a) * spd; s.l = life; s.l0 = life; s.c = c; s.g = g === undefined ? 380 : g;
  };
  RIG.ring = function (x, y, r1, life, c, w) { var r = take(RG); if (!r) return; r.on = 1; r.x = x; r.y = y; r.r = 2; r.r1 = r1; r.l = life; r.l0 = life; r.c = c; r.w = w || 2; };
  RIG.impact = function (x, y, kind, ang, big) {
    var k = KIND[kind] || KIND.rifle, n = Math.round((kind === "cannon" || kind === "plasma" ? 9 : 5) * (big || 1) * (calm() ? 0.4 : 1)), a0 = (ang === undefined ? -PI / 2 : ang + PI), j;
    for (j = 0; j < n; j++) RIG.spark(x, y, a0 + rnd(-1.3, 1.3), rnd(60, 190) * (big || 1), rnd(0.18, 0.4), j % 3 ? k.c : "#fff");
    RIG.ring(x, y, (kind === "cannon" || kind === "plasma" ? 15 : 8) * (big || 1), calm() ? 0.14 : 0.2, k.c, 2);
  };
  RIG.casing = function (x, y, vx, vy, gy) {
    var c = take(CA); if (!c) return; c.on = 1; c.x = x; c.y = y; c.vx = vx; c.vy = vy; c.r = rnd(0, TAU); c.vr = rnd(-16, 16); c.l = 1.1; c.gy = gy + rnd(-2, 3); c.b = 0;
  };
  var flashCv = null;
  function flashImg() {
    if (flashCv) return flashCv; flashCv = document.createElement("canvas"); flashCv.width = flashCv.height = 64; var c = flashCv.getContext("2d"), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,236,160,.95)"); g.addColorStop(0.6, "rgba(255,150,40,.35)"); g.addColorStop(1, "rgba(255,120,20,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    c.fillStyle = "rgba(255,250,220,.95)"; c.beginPath(); for (var k = 0; k < 8; k++) { var a = k * PI / 4, r = k % 2 ? 11 : 31; c.lineTo(32 + cos(a) * r, 32 + sin(a) * r); } c.closePath(); c.fill(); return flashCv;
  }
  RIG.flashImg = flashImg;
  // step the pools (dt in seconds). Call once per frame.
  RIG.update = function (dt) {
    var k, b, c, s, r;
    for (k = 0; k < BU.length; k++) {
      b = BU[k]; if (!b.on) continue; if (b.delay > 0) { b.delay -= dt; continue; } b.d += b.spd * dt; var f = min(1, b.d / b.L);
      b.x = b.sx + (b.ex - b.sx) * f; b.y = b.sy + (b.ey - b.sy) * f - (b.arc ? sin(f * PI) * b.arc : 0);
      if (b.d >= b.L) { b.on = 0; if (b.imp) RIG.impact(b.ex, b.ey, b.kind, Math.atan2(b.uy, b.ux), b.big); }
    }
    for (k = 0; k < CA.length; k++) {
      c = CA[k]; if (!c.on) continue; c.l -= dt; if (c.l <= 0) { c.on = 0; continue; } c.vy += 520 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt;
      if (c.y > c.gy && c.vy > 0) { c.y = c.gy; c.vy *= -0.38; c.vx *= 0.6; c.vr *= 0.5; c.b++; if (c.b > 2) { c.vy = 0; c.vx = 0; c.vr = 0; } }
    }
    for (k = 0; k < SPK.length; k++) { s = SPK[k]; if (!s.on) continue; s.l -= dt; if (s.l <= 0) { s.on = 0; continue; } s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt; }
    for (k = 0; k < RG.length; k++) { r = RG[k]; if (!r.on) continue; r.l -= dt; if (r.l <= 0) { r.on = 0; continue; } r.r = r.r1 * (1 - r.l / r.l0); }
  };
  // draw the pools (call after the units, inside the world transform).
  RIG.drawFx = function (cx) {
    var k, b, c, s, r, cl = calm(), any = false;
    for (k = 0; k < CA.length; k++) {
      c = CA[k]; if (!c.on) continue; cx.save(); cx.globalAlpha = min(1, c.l * 2.2); cx.translate(c.x, c.y); cx.rotate(c.r); cx.fillStyle = "#e8b64a"; cx.fillRect(-1.6, -0.8, 3.2, 1.6); cx.fillStyle = "#fff0b0"; cx.fillRect(-1.6, -0.8, 1.2, 0.7); cx.restore();
    }
    cx.lineCap = "round";
    for (k = 0; k < BU.length; k++) {
      b = BU[k]; if (!b.on || b.delay > 0) continue; var kd = b.k, tl = min(b.d, kd.len * b.big), tx = b.x - b.ux * tl, ty = b.y - b.uy * tl + (b.arc ? 0 : 0);
      var g = cx.createLinearGradient(tx, ty, b.x, b.y); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, kd.c);
      cx.strokeStyle = g; cx.lineWidth = kd.w * (kd.orb ? 0.75 : 1) * b.big; cx.beginPath(); cx.moveTo(tx, ty); cx.lineTo(b.x, b.y); cx.stroke();
      cx.strokeStyle = kd.c2; cx.lineWidth = max(0.8, kd.w * 0.38 * b.big); cx.beginPath(); cx.moveTo(b.x - b.ux * tl * 0.5, b.y - b.uy * tl * 0.5); cx.lineTo(b.x, b.y); cx.stroke();
      if (kd.orb) { cx.fillStyle = kd.c; cx.beginPath(); cx.arc(b.x, b.y, kd.w * 0.85 * b.big, 0, TAU); cx.fill(); cx.fillStyle = kd.c2; cx.beginPath(); cx.arc(b.x, b.y, kd.w * 0.4 * b.big, 0, TAU); cx.fill(); }
      if (!cl) { any = true; }
    }
    for (k = 0; k < SPK.length; k++) {
      s = SPK[k]; if (!s.on) continue; cx.strokeStyle = s.c; cx.globalAlpha = min(1, s.l / s.l0 * 1.6); cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(s.x, s.y); cx.lineTo(s.x - s.vx * 0.045, s.y - s.vy * 0.045); cx.stroke();
    }
    cx.globalAlpha = 1;
    for (k = 0; k < RG.length; k++) { r = RG[k]; if (!r.on) continue; cx.globalAlpha = r.l / r.l0 * 0.8; cx.strokeStyle = r.c; cx.lineWidth = r.w; cx.beginPath(); cx.arc(r.x, r.y, r.r, 0, TAU); cx.stroke(); }
    cx.globalAlpha = 1;
  };
  RIG.clearFx = function () { var a = [BU, CA, SPK, RG], z, k; for (z = 0; z < 4; z++) for (k = 0; k < a[z].length; k++) a[z][k].on = 0; };
  RIG.liveCount = function () { var n = 0, a = [BU, CA, SPK, RG], z, k; for (z = 0; z < 4; z++) for (k = 0; k < a[z].length; k++) if (a[z][k].on) n++; return n; };

  // ---------- 2-bone IK (angles in the parent's frame; limbs hang along +y at rotation 0) ----------
  function ik(i, pre, sx, sy, L1, L2, tx, ty, bend) {
    var dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy), dm = max(abs(L1 - L2) + 0.5, min(d, L1 + L2 - 0.3)), base = Math.atan2(dy, dx);
    var a = Math.acos(clamp((L1 * L1 + dm * dm - L2 * L2) / (2 * L1 * dm), -1, 1)), t1 = base + bend * a, ex = sx + cos(t1) * L1, ey = sy + sin(t1) * L1, t2 = Math.atan2(ty - ey, tx - ex);
    return [t1 - PI / 2, t2 - t1];
  }
  function P(i, n) { return i.p[n]; }
  function ndx(i, n) { return i.d.map[n]; }
  // generic biped / chibi pose. d.q has the tuning numbers; d.hold selects how the arms hold the weapon.
  function pose(i) {
    var d = i.d, q = d.q, p = i.p, t = i.t, w = i.mv, ph = i.ph, rc = i.rc, ak = i.ak, br = sin(t * 2.3 + i.seed), air = i.air ? 1 : 0, cr = i.crouch ? 1 : 0, fl = i.fl, vic = i.vic, bst = i.bst, k, n, nd;
    for (k in p) { var pp = p[k]; pp.r = 0; pp.dx = 0; pp.dy = 0; pp.sx = 1; pp.sy = 1; }
    var vb = vic > 0 ? abs(sin(t * 9)) * 2.4 : 0, pul = bst > 0 ? sin(min(1, bst) * PI) : 0;
    var pel = p.pelvis; pel.dy = -(w * abs(sin(ph)) * q.bob + (1 - w) * br * q.br) - air * 3 + cr * q.crh - vb + bst * 1.5; pel.r = sin(ph) * 0.04 * w * q.sway + fl * 0.05;
    var legs = ["legF", "legB"], lg;
    for (k = 0; k < 2; k++) {
      n = legs[k]; lg = p[n]; if (!lg) continue; var off = k ? PI : 0, s = sin(ph + off), c = cos(ph + off), st = k ? q.stB : q.stF;
      lg.r = s * q.swing * w + (1 - w) * st * (1 + ak * 0.7) + fl * (k ? 0.2 : -0.1) + air * (k ? -0.5 : 0.7) + cr * (k ? -0.45 : 0.55) - pul * (k ? 0.2 : -0.1);
      lg.dy = -max(0, c) * q.lift * w - air * (k ? 2 : 1); lg.sy = 1 - 0.07 * max(0, c) * w; if (q.legSx) lg.sx = 1 + 0.05 * s * w;
    }
    var tor = p.torso, al = i.al, rest = q.rest || 0.8, hd = p.head, aimA = al * ak + rest * (1 - ak) + sin(t * 2.1 + i.seed) * 0.03 * (1 - ak) - (1 - ak) * w * 0.15;
    if (vic > 0) { aimA = -1.15 + sin(t * 7) * 0.12; ak = 1; }
    tor.r = q.lean * w + al * q.aimLean * ak - rc * q.kick - fl * 0.34 - pul * 0.14 + (bst > 0 ? (bst > 0.7 ? (bst - 0.7) * 0.9 : -0.12) : 0);
    tor.dx = -rc * q.kdx - fl * 2.2 + (bst > 0.7 ? -1.5 : 0); tor.dy = -rc * 0.25 + fl * 0.8; tor.sy = 1 + br * 0.014 + pul * 0.05 - rc * 0.025; tor.sx = 1 - br * 0.01 - pul * 0.04 + rc * 0.02;
    if (hd) { hd.r = -tor.r * 0.7 + al * 0.12 * ak - rc * 0.12 - fl * 0.28 + i.sp.a * 0.5 + (1 - ak) * sin(t * 1.3 + i.seed) * 0.04; hd.dy = -rc * 0.5 + fl * 0.6 + (w * abs(sin(ph)) * 0.3); hd.sy = 1 - rc * 0.03; }
    if (p.hat) { p.hat.r = i.sp.a * 1.1 + fl * 0.2; p.hat.dy = -abs(i.sp.v) * 0.04; }
    if (p.cape) { p.cape.r = i.sp2.a; p.cape.sy = 1 + w * 0.06 + abs(i.sp2.v) * 0.02; p.cape.sx = 1 + abs(i.sp2.a) * 0.15; }
    if (p.wingL) { p.wingL.r = -0.55 + i.sp2.a * 0.9 + sin(t * 3 + 1) * 0.05 - pul * 0.4; p.wingR.r = 0.5 - i.sp3.a * 0.9 + sin(t * 3.4) * 0.05 + pul * 0.4; }
    if (p.crow) { var cj = rc * 2.4 + (vic > 0 ? vb : 0); p.crow.dy = -cj + sin(t * 1.7) * 0.2; p.crow.r = sin(t * 2.6 + i.seed) * 0.07 + i.sp3.a * 0.4; p.crow.sx = 1 + rc * 0.06; p.crow.sy = 1 - rc * 0.05; }
    if (p.antL) { p.antL.r = i.sp2.a * 1.2 + sin(t * 4) * 0.05; }
    if (p.fan) { p.fan.r = t * (2 + w * 6 + ak * 4 + pul * 10); }
    if (p.tank) { p.tank.r = i.sp2.a * 0.5; p.tank.sy = 1 + rc * 0.08; }
    if (p.extra) { p.extra.r = i.sp3.a * 0.8 + sin(t * 2.2) * 0.04; p.extra.sy = 1 + pul * 0.1; }
    var wp = p.wpn, hold = d.hold;
    if (hold === "two" || hold === "one") {
      var W = d.W, pvx = d.wpv[0] * d.wdw, pvy = d.wpv[1] * d.wdh, par = pel.r + tor.r, wr = aimA - par - (bst > 0 ? 0 : 0) - rc * 0.1;
      wp.r = wr; var kx = cos(aimA) * rc * q.kback, ky = sin(aimA) * rc * q.kback; wp.dx = -kx + (bst > 0 ? -1 : 0); wp.dy = -ky + sin(t * 2.3) * 0.25 * (1 - ak) + w * abs(sin(ph)) * 0.8 * (1 - ak);
      wp.sx = 1 + pul * 0.08; wp.sy = 1 + pul * 0.1;
      var wx = W[0] + wp.dx, wy = W[1] + wp.dy, cw = cos(wr), sw = sin(wr);
      var gF = d.gF, gB = d.gB, fx = wx + ((gF[0] - d.wpv[0]) * d.wdw) * cw - ((gF[1] - d.wpv[1]) * d.wdh) * sw, fy = wy + ((gF[0] - d.wpv[0]) * d.wdw) * sw + ((gF[1] - d.wpv[1]) * d.wdh) * cw;
      var bx = wx + ((gB[0] - d.wpv[0]) * d.wdw) * cw - ((gB[1] - d.wpv[1]) * d.wdh) * sw, by = wy + ((gB[0] - d.wpv[0]) * d.wdw) * sw + ((gB[1] - d.wpv[1]) * d.wdh) * cw;
      var af = p.armFu, afl = p.armFl, ab = p.armBu, abl = p.armBl, S1 = d.sF, S2 = d.sB, r1 = ik(i, "F", S1[0], S1[1], d.L1, d.L2, fx, fy, 1);
      af.r = r1[0]; afl.r = r1[1];
      var wB = hold === "two" ? max(ak, 1 - w * 1.0) : 0, sw1 = sin(ph + PI) * 0.75 * w * (1 - ak), fkU = sw1, fkL = 0.35 + max(0, -sw1) * 0.7;
      if (hold === "one" || wB < 1) { }
      var r2 = ik(i, "B", S2[0], S2[1], d.L1, d.L2, bx, by, 1);
      ab.r = fkU * (1 - wB) + r2[0] * wB; abl.r = fkL * (1 - wB) + r2[1] * wB;
      if (hold === "one") { ab.r = sw1 + (ak > 0.5 ? -0.2 : 0); abl.r = 0.3 + max(0, -sw1) * 0.8; }
      if (d.walkFront) { var wf = (1 - ak) * w * 0.5; af.r += wf * sin(ph) * 0.4; }
    } else if (hold === "cannon") {
      var af2 = p.armFu, cf = p.armFl, ab2 = p.armBu, fb = p.armBl, par2 = pel.r + tor.r, sg = sin(ph + PI) * 0.6 * w * (1 - ak);
      var aimU = aimA * 0.55 - par2 + 0.1, ua = aimU * ak + (sg + 0.12) * (1 - ak);
      af2.r = ua - rc * 0.22; var absC = aimA - d.axis - rc * 0.08, restC = 0.55 - d.axis + sin(t * 2) * 0.03; cf.r = (absC * ak + restC * (1 - ak)) - par2 - af2.r - 0 + (d.cr0 || 0);
      cf.dx = -cos(aimA) * rc * 1.6; cf.dy = -sin(aimA) * rc * 1.6;
      var pn = i.punch, pe = pn > 0 ? sin(clamp(1 - pn, 0, 1) * PI) : 0, side = i.pside ? 1 : -1;
      ab2.r = -sg * 0.9 - 0.08 + pe * 1.35 + (vic > 0 ? -2.2 + sin(t * 7) * 0.3 : 0) + (bst > 0.4 ? -0.8 : 0); fb.r = -0.25 - pe * 0.4 + max(0, sg) * 0.4 + (1 - pe) * 0.1; fb.dx = pe * 3; fb.sx = 1 + pe * 0.12; fb.sy = 1 + pe * 0.12;
      if (p.cannonGlow) { }
    }
    if (d.pose2) d.pose2(i, q, pul);
  }
  RIG.pose = pose;

  // ---------- per-frame step ----------
  RIG.step = function (i, dt, inp) {
    if (!i) return; inp = inp || {}; dt = min(dt, 0.1); i.t += dt; var mvT = inp.mv || 0, q = i.d.q;
    i.mv += (mvT - i.mv) * min(1, dt * 9);
    if (inp.ph !== undefined && inp.ph !== null) i.ph = inp.ph; else if (i.mv > 0.04) i.ph += dt * (5.5 + 6.5 * i.mv) * (inp.sp || 1);
    if (inp.face) i.face = inp.face; i.air = inp.air || 0; i.crouch = inp.crouch || 0;
    var hold = i.hold > 0; if (hold) i.hold -= dt;
    var has = inp.aim !== undefined && inp.aim !== null;
    if (has) { var a = inp.aim, al = i.face > 0 ? a : PI - a; i.aimT = clamp(wrap(al), -1.3, 1.45); }
    i.ak += (((has || hold) ? 1 : 0) - i.ak) * min(1, dt * ((has || hold) ? 15 : 3.2));
    if (i.ak > 0.02) i.al += (i.aimT - i.al) * min(1, dt * 20); else i.al = i.aimT;
    i.rc *= exp(-dt * 12); i.flash -= dt; i.hit = max(0, i.hit - dt * 5); i.fl = max(0, i.fl - dt * 5.5); i.punch = max(0, i.punch - dt * 4.2); i.bst = max(0, i.bst - dt * 0.85); i.vic = max(0, i.vic - dt);
    // secondary motion (hat / cape / wings / head lag)
    var drive = -i.mv * 0.5 - i.rc * 0.5 + sin(i.t * 2.6 + i.seed) * 0.06 * (0.5 + i.mv) - i.fl * 0.5; spring(i.sp, drive * 0.3, dt, 70, 7); spring(i.sp2, drive, dt, 34, 4.2); spring(i.sp3, drive * 0.8 + sin(i.t * 3.1) * 0.05, dt, 42, 5);
    (i.d.poseFn || pose)(i);
  };
  // triggers
  RIG.fire = function (i, o) {
    if (!i) return null; o = o || {}; i.rc = max(i.rc, 0.55 + 0.45 * (o.pow || 1)); i.flash = o.flash || 0.075; i.hold = o.hold || 0.55; i.lastFire = i.t;
    if (o.aim !== undefined) { i.aimT = clamp(wrap(i.face > 0 ? o.aim : PI - o.aim), -1.3, 1.45); }
    if (!o.noCase && i.d.casing) { var e = i.ej, f = i.face; RIG.casing(e.x, e.y, -f * rnd(25, 70), -rnd(70, 140), i.gy); }
    if (i.d.hold === "cannon") i.punch = i.punch; return i.mz;
  };
  RIG.punch = function (i) { if (!i) return; i.punch = 1; i.pside = !i.pside; };
  RIG.hit = function (i, big) { if (!i) return; i.hit = 1; i.fl = big ? 1 : 0.7; };
  RIG.victory = function (i, s) { if (i) i.vic = s || 2.4; };
  RIG.burst = function (i) { if (i) { i.bst = 1; i.hold = 1.2; } };

  // ---------- draw ----------
  var CAP = 0;
  function dn(cx, i, nd, pm, bm, o) {
    var p = i.p[nd.n], m = i.wm[nd.n], r = nd.r0 + p.r, cs = cos(r), sn = sin(r), sx = p.sx * (nd.sx || 1), sy = p.sy * (nd.sy || 1), fl = nd.fl ? -1 : 1;
    if (nd.vis && !nd.vis(i)) return;
    var a = cs * sx * fl, b = sn * sx * fl, c = -sn * sy, d = cs * sy, e = nd.x + p.dx, f = nd.y + p.dy;
    // world (rig-space) matrix = pm * local
    m[0] = pm[0] * a + pm[2] * b; m[1] = pm[1] * a + pm[3] * b; m[2] = pm[0] * c + pm[2] * d; m[3] = pm[1] * c + pm[3] * d; m[4] = pm[0] * e + pm[2] * f + pm[4]; m[5] = pm[1] * e + pm[3] * f + pm[5];
    var k, kids = nd.kids, kl = kids.length;
    for (k = 0; k < kl; k++) { if (kids[k].z >= 0) break; dn(cx, i, kids[k], m, bm, o); }
    var pt = PARTS[nd.im];
    if (pt && !nd.hide) {
      cx.setTransform(bm[0] * m[0] + bm[2] * m[1], bm[1] * m[0] + bm[3] * m[1], bm[0] * m[2] + bm[2] * m[3], bm[1] * m[2] + bm[3] * m[3], bm[0] * m[4] + bm[2] * m[5] + bm[4], bm[1] * m[4] + bm[3] * m[5] + bm[5]);
      var dx = -nd.pv[0] * pt.dw, dy = -nd.pv[1] * pt.dh; cx.drawImage(pt.im, pt.sx, pt.sy, pt.sw, pt.sh, dx, dy, pt.dw, pt.dh); RIG.stats.nodes++;
      if (i.hit > 0.02 && !calm() && !nd.nohit) { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = i.hit * 0.55 * o.alpha; cx.drawImage(pt.im, pt.sx, pt.sy, pt.sw, pt.sh, dx, dy, pt.dw, pt.dh); cx.globalAlpha = o.alpha; cx.globalCompositeOperation = "source-over"; }
    } else if (nd.fn && !nd.hide) { cx.setTransform(bm[0] * m[0] + bm[2] * m[1], bm[1] * m[0] + bm[3] * m[1], bm[0] * m[2] + bm[2] * m[3], bm[1] * m[2] + bm[3] * m[3], bm[0] * m[4] + bm[2] * m[5] + bm[4], bm[1] * m[4] + bm[3] * m[5] + bm[5]); nd.fn(cx, i, o); }
    if (nd.after) { cx.setTransform(bm[0] * m[0] + bm[2] * m[1], bm[1] * m[0] + bm[3] * m[1], bm[0] * m[2] + bm[2] * m[3], bm[1] * m[2] + bm[3] * m[3], bm[0] * m[4] + bm[2] * m[5] + bm[4], bm[1] * m[4] + bm[3] * m[5] + bm[5]); nd.after(cx, i, o); }
    for (; k < kl; k++) dn(cx, i, kids[k], m, bm, o);
  }
  // local point of node n -> outer (caller) coordinates
  function toOuter(i, n, lx, ly, out) { var m = i.wm[n]; out.x = m[0] * lx + m[2] * ly + m[4]; out.y = m[1] * lx + m[3] * ly + m[5]; return out; }
  RIG.toOuter = toOuter;
  var ROOT = new Float64Array(6);
  // draw a rig with its feet at (x,y); s = scale; face = +1 / -1. Returns nothing; muzzle/ejection positions are refreshed in i.mz / i.ej (outer coordinates).
  RIG.draw = function (cx, i, x, y, s, face, o) {
    if (!i) return; o = o || {}; o.alpha = o.alpha === undefined ? 1 : o.alpha; face = face || i.face || 1; i.face = face; i.gx = x; i.gy = y; i.gs = s;
    var bt = cx.getTransform(), bm = [bt.a, bt.b, bt.c, bt.d, bt.e, bt.f]; ROOT[0] = face * s; ROOT[1] = 0; ROOT[2] = 0; ROOT[3] = s; ROOT[4] = x; ROOT[5] = y;
    var ga = cx.globalAlpha; cx.globalAlpha = ga * o.alpha; var o2 = o; o2.alpha = 1;
    var d = i.d, k; if (d.aura && i.bst > 0 && !calm()) { }
    for (k = 0; k < d.roots.length; k++) dn(cx, i, d.roots[k], ROOT, bm, o2);
    cx.setTransform(bt); cx.globalAlpha = ga; o.alpha = o2.alpha;
    if (d.mzNode) {
      var mn = d.mzNode, e = i.mz, m = i.wm[mn.n]; toOuter(i, mn.n, mn.x, mn.y, e); e.a = Math.atan2(m[1], m[0]) * 1; e.a = Math.atan2(m[1] * (mn.ax || 1) , m[0] * (mn.ax || 1)) + (mn.rot || 0);
      var dm = toOuter(i, mn.n, mn.x + cos(mn.dir || 0) * 10, mn.y + sin(mn.dir || 0) * 10, {}); e.a = Math.atan2(dm.y - e.y, dm.x - e.x);
      if (d.ejNode) toOuter(i, d.ejNode.n, d.ejNode.x, d.ejNode.y, i.ej);
    }
    RIG.stats.draws++;
  };
  RIG.muzzle = function (i) { return i.mz; };

  // ---------- shared pieces ----------
  function flashAfter(mx, my, sz, ang, shape) {
    return function (cx, i) {
      if (i.flash <= 0) return; var cl = calm(), fs0 = shape && RIG.flashShape ? RIG.flashShape(shape) : null; if (fs0) { RIG.drawFlash(cx, fs0, mx, my, sz, ang, cl); return; } var im = flashImg(), s = sz * (cl ? 0.42 : 0.8 + Math.random() * 0.55), ga = cx.globalAlpha;
      cx.globalCompositeOperation = "lighter"; cx.globalAlpha = ga * (cl ? 0.5 : 1); cx.save(); cx.translate(mx, my); if (!cl) cx.rotate((ang || 0) + Math.random() * 0.6); cx.drawImage(im, -s / 2, -s / 2, s, s); cx.restore(); cx.globalCompositeOperation = "source-over"; cx.globalAlpha = ga;
    };
  }
  RIG.flashAfter = flashAfter;
  function glowAfter(mx, my, r, col) {
    return function (cx, i) {
      var a = max(i.rc * 0.8, i.bst > 0 ? 0.9 : 0, i.ak * 0.25); if (a < 0.05 || calm()) return; var ga = cx.globalAlpha; cx.globalCompositeOperation = "lighter"; cx.globalAlpha = ga * a; cx.fillStyle = col; cx.beginPath(); cx.arc(mx, my, r, 0, TAU); cx.fill(); cx.globalCompositeOperation = "source-over"; cx.globalAlpha = ga;
    };
  }
  RIG.glowAfter = glowAfter;

  // ---------- Scarecrow-X (AI-generated parts: hat, head, torso, pelvis, 2 arm segments x2, rifle, leg x2, cape, crow, scythe) ----------
  RIG.define("scx", {
    H: 96, hold: "two", casing: 1, W: [6, -17], wpv: [0.30, 0.55], wdw: 46, wdh: 12.4, gF: [0.58, 0.62], gB: [0.2, 0.78], sF: [10, -24], sB: [-10, -24], L1: 14, L2: 18,
    q: {bob: 1.7, br: 0.45, crh: 5, swing: 0.62, lift: 3.2, stF: 0.14, stB: -0.2, sway: 1, lean: 0.07, aimLean: 0.12, kick: 0.10, kdx: 1.6, kback: 4.2, rest: 0.95},
    mzNode: {n: "wpn", x: 32.2, y: -1.2, dir: 0}, ejNode: {n: "wpn", x: 9, y: -3},
    nodes: [
      {n: "pelvis", x: 0, y: -33, im: "pelvis", pv: [0.5, 0.12]},
      {n: "legB", par: "pelvis", x: -3.6, y: 6, im: "leg", pv: [0.45, 0.07], z: -2},
      {n: "legF", par: "pelvis", x: 3.6, y: 6, im: "leg", pv: [0.45, 0.07], z: -1},
      {n: "torso", par: "pelvis", x: 0, y: 0, im: "torso", pv: [0.5, 0.92]},
      {n: "scythe", par: "torso", x: -5, y: -20, im: "scythe", pv: [0.5, 0.12], r0: 0.55, z: -5},
      {n: "cape", par: "torso", x: -2, y: -24, im: "cape", pv: [0.5, 0.05], z: -3},
      {n: "armBu", par: "torso", x: -10, y: -24, im: "arm_u", pv: [0.5, 0.04], z: -1},
      {n: "armBl", par: "armBu", x: 0, y: 14, im: "arm_l", pv: [0.5, 0.05]},
      {n: "head", par: "torso", x: 0, y: -27, im: "head", pv: [0.5, 0.9], z: 1},
      {n: "hat", par: "head", x: 0, y: -19, im: "hat", pv: [0.5, 0.78]},
      {n: "crow", par: "torso", x: -11, y: -26, im: "crow", pv: [0.5, 0.88], fl: true, z: 0.5},
      {n: "wpn", par: "torso", x: 6, y: -17, im: "rifle", pv: [0.30, 0.55], z: 2, after: null},
      {n: "armFu", par: "torso", x: 10, y: -24, im: "arm_u", pv: [0.5, 0.04], z: 3},
      {n: "armFl", par: "armFu", x: 0, y: 14, im: "arm_l", pv: [0.5, 0.05]}
    ]
  });
  DEFS.scx.map.wpn.after = flashAfter(32.2, -1.2, 44, 0, "rail");

  // ---------- Baleguard (AI-generated parts: cockpit dome w/ pilot, pelvis, 2 tractor-wheel legs, 2 upper arms, hay-bale fist, energy cannon forearm, 2 solar wings) ----------
  RIG.define("bale", {
    H: 66, hold: "cannon", casing: 0, axis: 0.8,
    q: {bob: 1.2, br: 0.35, crh: 3, swing: 0.3, lift: 1.6, stF: 0.05, stB: -0.07, sway: 1.2, lean: 0.08, aimLean: 0.1, kick: 0.07, kdx: 1.2, kback: 3, rest: 0.6, legSx: 1},
    mzNode: {n: "armFl", x: 13.5, y: 13.5, dir: 0.8}, ejNode: null,
    nodes: [
      {n: "pelvis", x: 0, y: -24, im: "b_pelvis", pv: [0.5, 0.1]},
      {n: "legB", par: "pelvis", x: -5, y: 3, im: "b_legB", pv: [0.42, 0.08], z: -2},
      {n: "legF", par: "pelvis", x: 5, y: 3, im: "b_legA", pv: [0.42, 0.08], z: -1},
      {n: "torso", par: "pelvis", x: 0, y: 2, im: "b_dome", pv: [0.5, 0.9]},
      {n: "wingL", par: "torso", x: -9, y: -28, im: "b_wingA", pv: [0.5, 0.9], z: -3},
      {n: "wingR", par: "torso", x: 9, y: -30, im: "b_wingB", pv: [0.5, 0.9], z: -3},
      {n: "armBu", par: "torso", x: -15, y: -26, im: "b_armB", pv: [0.5, 0.1], z: -1},
      {n: "armBl", par: "armBu", x: 0, y: 17, im: "b_fist", pv: [0.72, 0.1]},
      {n: "armFu", par: "torso", x: 15, y: -26, im: "b_armA", pv: [0.5, 0.1], z: 2},
      {n: "armFl", par: "armFu", x: 0, y: 17, im: "b_cannon", pv: [0.3, 0.14], after: null}
    ]
  });
  DEFS.bale.map.armFl.after = function (cx, i) { flashAfter(13.5, 13.5, 50, 0, "ring")(cx, i); glowAfter(13.5, 13.5, 6, "#6fc8ff")(cx, i); };

  // ---------- death: the parts fly apart and tumble (cosmetic ragdoll) ----------
  var COR = [], q1;
  for (q1 = 0; q1 < 8; q1++) COR.push({on: 0, pcs: [], l: 0});
  RIG.kill = function (i, o) {
    if (!i) return; o = o || {}; var c = null, k, n, nd, d = i.d;
    for (k = 0; k < COR.length; k++) if (!COR[k].on) { c = COR[k]; break; } if (!c) c = COR[0];
    c.on = 1; c.l = 1.9; c.pcs.length = 0; var F = i.face * i.gs, S = i.gs, ox = i.gx, oy = i.gy, cxm = ox, cym = oy - (d.H || 60) * S * 0.5, big = o.big || 1;
    for (n = 0; n < d.nodes.length; n++) {
      nd = d.nodes[n]; var pt = PARTS[nd.im]; if (!pt || nd.hide || (nd.vis && !nd.vis(i))) continue; var m = i.wm[nd.n];
      var A = [m[0], m[1], m[2], m[3], m[4], m[5]];
      var dx = A[4] - cxm, dy = A[5] - cym, pc = {pt: pt, pv: nd.pv, a: A[0], b: A[1], c: A[2], d: A[3], e: A[4], f: A[5], ox: 0, oy: 0, rot: 0, vx: dx * 4.2 * big + (o.kx || 0) * 60 + rnd(-30, 30), vy: -rnd(110, 250) * big + dy * 2.5, vr: rnd(-7, 7), gy: oy + rnd(-2, 3), b2: 0};
      c.pcs.push(pc);
    }
    c.glow = o.glow || 0; c.col = o.col || "#ffd070";
    if (!calm()) { for (k = 0; k < 9; k++) RIG.spark(cxm, cym, rnd(0, TAU), rnd(40, 160), rnd(0.25, 0.5), k % 2 ? c.col : "#fff"); }
    RIG.ring(cxm, cym, 22 * S * 2.4, calm() ? 0.15 : 0.26, c.col, 2);
  };
  function updCor(dt) {
    for (var k = 0; k < COR.length; k++) {
      var c = COR[k]; if (!c.on) continue; c.l -= dt; if (c.l <= 0) { c.on = 0; continue; }
      for (var j = 0; j < c.pcs.length; j++) { var p = c.pcs[j]; if (p.b2 > 2) continue; p.vy += 760 * dt; p.ox += p.vx * dt; p.oy += p.vy * dt; p.rot += p.vr * dt; if (p.f + p.oy > p.gy && p.vy > 0) { p.oy = p.gy - p.f; p.vy *= -0.32; p.vx *= 0.55; p.vr *= 0.5; p.b2++; if (p.b2 > 2) { p.vx = p.vy = p.vr = 0; } } }
    }
  }
  function drawCor(cx) {
    var bt = cx.getTransform(), ga = cx.globalAlpha;
    for (var k = 0; k < COR.length; k++) {
      var c = COR[k]; if (!c.on) continue; cx.globalAlpha = ga * min(1, c.l / 0.7);
      for (var j = 0; j < c.pcs.length; j++) {
        var p = c.pcs[j], ca = cos(p.rot), sa = sin(p.rot); cx.setTransform(bt); cx.transform(ca * p.a - sa * p.b, sa * p.a + ca * p.b, ca * p.c - sa * p.d, sa * p.c + ca * p.d, p.e + p.ox, p.f + p.oy);
        cx.drawImage(p.pt.im, p.pt.sx, p.pt.sy, p.pt.sw, p.pt.sh, -p.pv[0] * p.pt.dw, -p.pv[1] * p.pt.dh, p.pt.dw, p.pt.dh);
      }
    }
    cx.setTransform(bt); cx.globalAlpha = ga;
  }
  RIG.drawCorpses = drawCor;
  var _upd = RIG.update; RIG.update = function (dt) { _upd(dt); updCor(dt); };
  var _dfx = RIG.drawFx; RIG.drawFx = function (cx) { drawCor(cx); _dfx(cx); };
  var _clr = RIG.clearFx; RIG.clearFx = function () { _clr(); for (var k = 0; k < COR.length; k++) COR[k].on = 0; };
  RIG.corpses = function () { var n = 0; for (var k = 0; k < COR.length; k++) if (COR[k].on) n++; return n; };

  // ---------- parametric chibi squad rigs (one shared skeleton, per-hero palette + weapon + extra: honest "variants", not unique art) ----------
  var KU = 3;
  function mk(w, h, fn) { var c = document.createElement("canvas"); c.width = Math.ceil(w * KU); c.height = Math.ceil(h * KU); var g = c.getContext("2d"); g.scale(KU, KU); g.lineJoin = "round"; g.lineCap = "round"; fn(g, w, h); return c; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function shade(c, a) { var n = parseInt(c.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255; function f(v) { return clamp(Math.round(a > 0 ? v + (255 - v) * a : v * (1 + a)), 0, 255); } return "rgb(" + f(r) + "," + f(gg) + "," + f(b) + ")"; }
  function fillR(g, x, y, w, h, r, c) { var gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, shade(c, 0.28)); gr.addColorStop(0.5, c); gr.addColorStop(1, shade(c, -0.35)); g.fillStyle = gr; rr(g, x, y, w, h, r); g.fill(); g.strokeStyle = "rgba(20,14,12,.85)"; g.lineWidth = 0.9; g.stroke(); }
  var WPN = {
    rifle: {w: 30, h: 9, kind: "rifle"}, spray: {w: 24, h: 10, kind: "frost"}, cannon: {w: 24, h: 13, kind: "cannon"}, saw: {w: 20, h: 16, kind: "pellet"}, staff: {w: 34, h: 12, kind: "frost"}, gat: {w: 28, h: 11, kind: "pellet"}, seed: {w: 24, h: 10, kind: "seed"}, bolt: {w: 28, h: 9, kind: "bolt"}
  };
  function wpnImg(t, c, c2) {
    var s = WPN[t];
    return mk(s.w, s.h, function (g, w, h) {
      var my = h * 0.55; g.fillStyle = "#2c2f3a";
      if (t === "rifle" || t === "bolt") { fillR(g, 2, my - 2.4, w - 4, 4.8, 1.6, "#3b4054"); fillR(g, w * 0.28 - 4, my - 1, 8, 6.5, 1.4, c); g.fillStyle = c2; g.fillRect(w - 7, my - 3.4, 6, 1.4); g.fillStyle = t === "bolt" ? "#d6c4ff" : "#ffe9a0"; g.fillRect(w - 2.4, my - 1.4, 2, 2.8); }
      else if (t === "gat") { fillR(g, 3, my - 2.8, 9, 6, 1.5, c); for (var k = -1; k <= 1; k++) fillR(g, 10, my - 0.6 + k * 1.9, w - 12, 1.6, 0.6, "#4a5062"); g.fillStyle = "#ffcf70"; g.fillRect(w - 2, my - 3, 1.6, 6); }
      else if (t === "seed") { fillR(g, 2, my - 3, 12, 6.5, 2.4, c); fillR(g, 11, my - 2, w - 13, 4, 1.4, "#4a5062"); g.fillStyle = c2; g.beginPath(); g.arc(7, my - 3.2, 3, 0, TAU); g.fill(); g.fillStyle = "#ffe05a"; g.fillRect(w - 2.4, my - 1.6, 2, 3.2); }
      else if (t === "spray") { fillR(g, 2, my - 3, 13, 6.4, 2, c); fillR(g, 13, my - 1.6, w - 14, 3.2, 1, "#6a7488"); g.fillStyle = "#bfeeff"; g.beginPath(); g.arc(w - 2, my, 2.2, 0, TAU); g.fill(); }
      else if (t === "cannon") { fillR(g, 2, my - 5, 14, 10, 3, c); fillR(g, 12, my - 3.6, w - 13, 7.2, 2, "#4a5062"); fillR(g, w - 7, my - 4.4, 5, 8.8, 1.6, c2); g.fillStyle = "#cfe9ff"; g.beginPath(); g.arc(w - 2.4, my, 2, 0, TAU); g.fill(); }
      else if (t === "saw") { fillR(g, 2, my - 3, 8, 6, 1.6, "#4a5062"); g.fillStyle = "#cfd6e2"; g.beginPath(); for (var j = 0; j < 14; j++) { var a = j / 14 * TAU, r = j % 2 ? 5.6 : 7.4; g.lineTo(w - 9 + cos(a) * r, my + sin(a) * r); } g.closePath(); g.fill(); g.strokeStyle = "#2c2f3a"; g.lineWidth = 0.8; g.stroke(); g.fillStyle = c; g.beginPath(); g.arc(w - 9, my, 2.2, 0, TAU); g.fill(); }
      else if (t === "staff") { g.strokeStyle = "#6b4a2a"; g.lineWidth = 2.2; g.beginPath(); g.moveTo(1, my + 1); g.lineTo(w - 6, my - 1); g.stroke(); g.fillStyle = "#cfe9ff"; g.strokeStyle = "#2c2f3a"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(w - 8, my - 1); g.quadraticCurveTo(w - 2, my - 9, w + 0, my + 1); g.quadraticCurveTo(w - 4, my - 4, w - 9, my + 1); g.closePath(); g.fill(); g.stroke(); }
    });
  }
  function chibiParts(id, cf) {
    var c = cf.c, c2 = cf.c2, ac = cf.ac, N = "ch_" + id + "_";
    RIG.addCanvas(N + "head", mk(20, 20, function (g) { g.fillStyle = "#e8c9a0"; g.beginPath(); g.arc(10, 11.5, 8.2, 0, TAU); g.fill(); g.strokeStyle = "rgba(20,14,12,.85)"; g.lineWidth = 0.9; g.stroke(); var gr = g.createLinearGradient(0, 2, 0, 12); gr.addColorStop(0, shade(c, 0.3)); gr.addColorStop(1, shade(c, -0.25)); g.fillStyle = gr; g.beginPath(); g.arc(10, 10.5, 8.6, PI, 0); g.lineTo(18.4, 11.4); g.lineTo(1.6, 11.4); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#1b2030"; rr(g, 4, 10.4, 12, 4.4, 2); g.fill(); g.fillStyle = ac; g.fillRect(6, 11.6, 2.4, 2); g.fillRect(11.6, 11.6, 2.4, 2); }), 20, 20);
    PARTS[N + "head"].dw = 20; PARTS[N + "head"].dh = 20;
    RIG.addCanvas(N + "torso", mk(24, 26, function (g) { fillR(g, 3, 3, 18, 21, 5, c); fillR(g, 7, 6, 10, 9, 3, c2); g.fillStyle = ac; g.beginPath(); g.arc(12, 10.5, 2.2, 0, TAU); g.fill(); g.fillStyle = "#2a2e3c"; g.fillRect(4, 18, 16, 3); g.fillStyle = ac; g.fillRect(10.5, 18, 3, 3); }), 24, 26);
    RIG.addCanvas(N + "pelvis", mk(16, 8, function (g) { fillR(g, 1, 0.5, 14, 6.5, 2.4, "#3b4054"); g.fillStyle = ac; g.fillRect(6.5, 2, 3, 2.4); }), 16, 8);
    RIG.addCanvas(N + "leg", mk(8, 17, function (g) { fillR(g, 1.4, 0.4, 5.2, 10, 2.2, shade(c, -0.2)); fillR(g, 0.4, 10.4, 7.2, 5.8, 2.4, c2); }), 8, 17);
    RIG.addCanvas(N + "arm_u", mk(6, 11, function (g) { fillR(g, 0.8, 0.4, 4.4, 10, 2.1, c); }), 6, 11);
    RIG.addCanvas(N + "arm_l", mk(6, 11, function (g) { fillR(g, 0.8, 0.4, 4.4, 7.4, 2, shade(c, -0.12)); fillR(g, 0.4, 6.8, 5.2, 3.8, 1.8, "#e8c9a0"); }), 6, 11);
    var ws = WPN[cf.w]; RIG.addCanvas(N + "wpn", wpnImg(cf.w, c, c2), ws.w, ws.h);
    if (cf.ha) RIG.addCanvas(N + "hat", mk(24, 16, function (g) {
      var h = cf.ha; g.strokeStyle = "rgba(20,14,12,.85)"; g.lineWidth = 0.9;
      if (h === "sprout") { g.fillStyle = "#58c06a"; g.beginPath(); g.moveTo(12, 15); g.quadraticCurveTo(2, 14, 3, 4); g.quadraticCurveTo(11, 4, 12, 15); g.fill(); g.stroke(); g.fillStyle = "#7ee28a"; g.beginPath(); g.moveTo(12, 15); g.quadraticCurveTo(22, 14, 21, 3); g.quadraticCurveTo(13, 4, 12, 15); g.fill(); g.stroke(); }
      else if (h === "horns") { g.fillStyle = "#efe2c4"; g.beginPath(); g.moveTo(5, 15); g.quadraticCurveTo(0, 8, 4, 1); g.quadraticCurveTo(6, 8, 9, 13); g.fill(); g.stroke(); g.beginPath(); g.moveTo(19, 15); g.quadraticCurveTo(24, 8, 20, 1); g.quadraticCurveTo(18, 8, 15, 13); g.fill(); g.stroke(); }
      else if (h === "halo") { g.strokeStyle = "#fff2a8"; g.lineWidth = 2; g.beginPath(); g.ellipse(12, 10, 8, 2.6, 0, 0, TAU); g.stroke(); g.strokeStyle = ac; g.lineWidth = 0.8; g.stroke(); }
      else if (h === "cap") { fillR(g, 4, 8, 16, 7, 3, c2); fillR(g, 3, 13, 18, 2.4, 1, shade(c2, -0.3)); }
      else if (h === "crest") { g.fillStyle = ac; g.beginPath(); g.moveTo(5, 15); g.lineTo(8, 4); g.lineTo(11, 11); g.lineTo(13, 2); g.lineTo(16, 11); g.lineTo(19, 5); g.lineTo(19, 15); g.closePath(); g.fill(); g.stroke(); }
      else if (h === "ant") { g.strokeStyle = "#3b4054"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(12, 15); g.lineTo(12, 6); g.stroke(); g.fillStyle = ac; g.beginPath(); g.arc(12, 5, 2.6, 0, TAU); g.fill(); g.stroke(); }
    }), 24, 16);
    var e = cf.ex;
    if (e === "fan") RIG.addCanvas(N + "ex", mk(26, 26, function (g) { g.translate(13, 13); for (var k = 0; k < 4; k++) { g.rotate(PI / 2); g.fillStyle = k % 2 ? c2 : "#efe2c4"; g.strokeStyle = "rgba(20,14,12,.85)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(7, -3, 12, -11); g.lineTo(2.5, -9); g.closePath(); g.fill(); g.stroke(); } g.fillStyle = ac; g.beginPath(); g.arc(0, 0, 2.2, 0, TAU); g.fill(); }), 26, 26);
    if (e === "saw") RIG.addCanvas(N + "ex", mk(26, 26, function (g) { g.translate(13, 13); g.fillStyle = "#cfd6e2"; g.beginPath(); for (var j = 0; j < 16; j++) { var a = j / 16 * TAU, r = j % 2 ? 9.5 : 12.4; g.lineTo(cos(a) * r, sin(a) * r); } g.closePath(); g.fill(); g.strokeStyle = "#2c2f3a"; g.lineWidth = 0.9; g.stroke(); g.fillStyle = ac; g.beginPath(); g.arc(0, 0, 3.4, 0, TAU); g.fill(); }), 26, 26);
    if (e === "tank") RIG.addCanvas(N + "ex", mk(12, 20, function (g) { fillR(g, 1, 1, 10, 17, 4, c2); g.fillStyle = ac; g.fillRect(2.4, 6, 7.2, 3); fillR(g, 4, 0, 4, 3, 1, "#4a5062"); }), 12, 20);
    if (e === "wings") { RIG.addCanvas(N + "exL", mk(18, 18, function (g) { g.fillStyle = "rgba(255,240,170,.95)"; g.strokeStyle = "rgba(20,14,12,.8)"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(9, 17); g.quadraticCurveTo(-3, 12, 1, 1); g.quadraticCurveTo(10, 4, 9, 17); g.fill(); g.stroke(); }), 18, 18); RIG.addCanvas(N + "exR", mk(18, 18, function (g) { g.fillStyle = "rgba(255,240,170,.95)"; g.strokeStyle = "rgba(20,14,12,.8)"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(9, 17); g.quadraticCurveTo(21, 12, 17, 1); g.quadraticCurveTo(8, 4, 9, 17); g.fill(); g.stroke(); }), 18, 18); }
    if (e === "coil") RIG.addCanvas(N + "ex", mk(14, 24, function (g) { g.strokeStyle = "#3b4054"; g.lineWidth = 1.3; g.beginPath(); g.moveTo(7, 24); g.lineTo(7, 4); g.stroke(); for (var k = 0; k < 4; k++) { g.strokeStyle = ac; g.lineWidth = 1.6; g.beginPath(); g.ellipse(7, 8 + k * 4, 5 - k * 0.4, 1.7, 0, 0, TAU); g.stroke(); } g.fillStyle = "#fff"; g.beginPath(); g.arc(7, 3.5, 2, 0, TAU); g.fill(); }), 14, 24);
    if (e === "pack") RIG.addCanvas(N + "ex", mk(16, 22, function (g) { fillR(g, 1, 1, 14, 20, 4, shade(c, -0.3)); g.fillStyle = ac; g.fillRect(3, 5, 10, 2.4); g.fillRect(3, 10, 10, 2.4); }), 16, 22);
  }
  function chibiDef(id, cf) {
    var N = "ch_" + id + "_", ws = WPN[cf.w], two = cf.hold !== "one", nodes = [
      {n: "pelvis", x: 0, y: -27, im: N + "pelvis", pv: [0.5, 0.12]},
      {n: "legB", par: "pelvis", x: -3.2, y: 4.5, im: N + "leg", pv: [0.5, 0.06], z: -2},
      {n: "legF", par: "pelvis", x: 3.2, y: 4.5, im: N + "leg", pv: [0.5, 0.06], z: -1},
      {n: "torso", par: "pelvis", x: 0, y: 0.5, im: N + "torso", pv: [0.5, 0.94]},
      {n: "armBu", par: "torso", x: -8.2, y: -20, im: N + "arm_u", pv: [0.5, 0.06], z: -1},
      {n: "armBl", par: "armBu", x: 0, y: 9.5, im: N + "arm_l", pv: [0.5, 0.06]},
      {n: "head", par: "torso", x: 0, y: -22, im: N + "head", pv: [0.5, 0.92], z: 1},
      {n: "wpn", par: "torso", x: 5, y: -11, im: N + "wpn", pv: [0.28, 0.55], z: 2},
      {n: "armFu", par: "torso", x: 8.2, y: -20, im: N + "arm_u", pv: [0.5, 0.06], z: 3},
      {n: "armFl", par: "armFu", x: 0, y: 9.5, im: N + "arm_l", pv: [0.5, 0.06]}
    ];
    if (cf.ha) nodes.push({n: cf.ha === "ant" ? "antL" : "hat", par: "head", x: 0, y: -16.5, im: N + "hat", pv: [0.5, 0.95]});
    if (cf.ex === "fan" || cf.ex === "saw") nodes.push({n: "fan", par: "torso", x: -10, y: -13, im: N + "ex", pv: [0.5, 0.5], z: -3});
    if (cf.ex === "tank") nodes.push({n: "tank", par: "torso", x: -10, y: -9, im: N + "ex", pv: [0.5, 0.15], z: -3});
    if (cf.ex === "pack") nodes.push({n: "extra", par: "torso", x: -10, y: -8, im: N + "ex", pv: [0.5, 0.15], z: -3});
    if (cf.ex === "coil") nodes.push({n: "extra", par: "torso", x: -9, y: -12, im: N + "ex", pv: [0.5, 0.9], z: -3});
    if (cf.ex === "wings") { nodes.push({n: "wingL", par: "torso", x: -5, y: -19, im: N + "exL", pv: [0.5, 0.9], z: -3}); nodes.push({n: "wingR", par: "torso", x: 5, y: -19, im: N + "exR", pv: [0.5, 0.9], z: -3}); }
    var w = ws.w, d = {
      H: 64, hold: two ? "two" : "one", casing: cf.cs ? 1 : 0, bk: cf.bk || ws.kind, W: [5, -11], wpv: [0.28, 0.55], wdw: ws.w, wdh: ws.h, gF: [0.64, 0.6], gB: [0.24, 0.6], sF: [8.2, -20], sB: [-8.2, -20], L1: 9.5, L2: 9.5, cfg: cf,
      q: {bob: 1.3, br: 0.4, crh: 4, swing: 0.6, lift: 2.4, stF: 0.12, stB: -0.16, sway: 1, lean: 0.06, aimLean: 0.1, kick: 0.1, kdx: 1.3, kback: 3.2, rest: 0.9},
      mzNode: {n: "wpn", x: (1 - 0.28) * w, y: (0.45 - 0.55) * ws.h, dir: 0}, ejNode: {n: "wpn", x: 0.15 * w, y: -2}, nodes: nodes
    };
    var df = RIG.define("ch_" + id, d); df.map.wpn.after = flashAfter((1 - 0.28) * w, -1, 22, 0, RIG.shapeFor ? RIG.shapeFor(ws.kind) : null);
    if (cf.w === "saw") { df.pose2 = function (i) { i.p.wpn.r += 0; }; }
    return df;
  }
  RIG.CHIBI = {
    sunseed: {c: "#e8b73a", c2: "#fff1b0", ac: "#7ee28a", w: "seed", ha: "sprout", ex: "pack", bk: "seed"},
    gustmill: {c: "#6a8fd8", c2: "#dfe9ff", ac: "#9bd8ff", w: "bolt", ha: "ant", ex: "fan", bk: "bolt"},
    rimeplanter: {c: "#7fc6e8", c2: "#e8f8ff", ac: "#bff0ff", w: "spray", ha: "cap", ex: "tank", bk: "frost"},
    sawback: {c: "#d98a2e", c2: "#ffe0a0", ac: "#ffd24a", w: "saw", ha: "crest", ex: "saw", bk: "pellet"},
    herdmaster: {c: "#8a6a44", c2: "#e8d4a8", ac: "#9be06a", w: "gat", ha: "horns", ex: "pack", bk: "pellet", cs: 1},
    cropduster: {c: "#f0c04a", c2: "#fff6c8", ac: "#ff8a3a", w: "seed", ha: "cap", ex: "wings", bk: "seed"},
    thunderram: {c: "#5f6fd0", c2: "#d4dcff", ac: "#ffe65a", w: "bolt", ha: "horns", ex: "coil", bk: "bolt"},
    huskgolem: {c: "#9ac8e0", c2: "#e8f4fa", ac: "#8ae8ff", w: "staff", ha: "crest", hold: "one", bk: "frost"},
    harvestram: {c: "#c9573a", c2: "#ffd0a0", ac: "#ffb030", w: "saw", ha: "horns", ex: "saw", hold: "one", bk: "pellet"},
    furrowdozer: {c: "#a3703a", c2: "#f0d49a", ac: "#ffb830", w: "cannon", ha: "cap", ex: "pack", bk: "cannon"},
    silotitan: {c: "#a9b3c4", c2: "#e8eef8", ac: "#ffd35a", w: "cannon", ha: "cap", ex: "tank", bk: "cannon"},
    goldenharvest: {c: "#e6b02a", c2: "#fff1a8", ac: "#fff", w: "gat", ha: "crest", ex: "wings", bk: "plasma", cs: 1},
    nova: {c: "#e8f0ff", c2: "#bfe0ff", ac: "#6ad8ff", w: "bolt", ha: "halo", ex: "coil", bk: "rail"},
    coilwalker: {c: "#d0742a", c2: "#ffd7a0", ac: "#ffe65a", w: "bolt", ha: "ant", ex: "coil", bk: "bolt"}
  };
  RIG.initChibi = function () { if (RIG._ch) return; RIG._ch = 1; for (var id in RIG.CHIBI) { chibiParts(id, RIG.CHIBI[id]); chibiDef(id, RIG.CHIBI[id]); } };
  // call after the atlas is ready (canvas parts do not need the atlas, so this is safe at any time)
  RIG.initChibi();

  // ---------- turret / nest rigs for buildings: swivel ring, housing, per-barrel recoil, vents, muzzle flash ----------
  // st persists on the building (st.ra aim angle, st.rc[0..2] barrel recoil, st.alt, st.heat, st.spin). o: {x,y,s,theme:"a"|"p",type,t}
  RIG.turretNew = function () { return {ra: 0, rc: [0, 0, 0], alt: 0, heat: 0, spin: 0, fl: 0, open: 0}; };
  RIG.turretFire = function (st, pow) { st.alt = (st.alt + 1) % 2; st.rc[st.alt] = 1; st.rc[2] = 1; st.heat = 1; st.fl = calm() ? 0.05 : 0.08; st.open = 1; };
  RIG.turretStep = function (st, dt, aim, idle) {
    var da = wrap(aim - st.ra); st.ra += da * min(1, dt * 14); for (var k = 0; k < 3; k++) st.rc[k] = max(0, st.rc[k] - dt * (k < 2 ? 6.5 : 5)); st.heat = max(0, st.heat - dt * 1.8); st.fl -= dt; st.open = max(0, st.open - dt * 2.5); st.spin += dt * (1.5 + st.heat * 9);
  };
  RIG.turretMuzzle = function (st, o, out) {
    var L = (o.type === "sniper" ? 1.3 : o.type === "lobber" ? 0.8 : 1) * o.s * 1.05, side = (st.alt ? 1 : -1) * (o.type === "sniper" || o.type === "lobber" ? 0 : 0.17 * o.s * 0.4); var ca = cos(st.ra), sa = sin(st.ra);
    out.x = o.x + ca * L - sa * side; out.y = o.y + sa * L + ca * side; out.a = st.ra; return out;
  };
  RIG.drawTurret = function (cx, st, o) {
    var x = o.x, y = o.y, s = o.s, tp = o.type || "", al = o.theme === "a", sn = tp === "sniper", lb = tp === "lobber", heat = st.heat, cl = calm(), tt = o.t || 0;
    cx.save(); cx.translate(x, y);
    // swivel ring (rotates opposite for a visible bearing)
    cx.save(); cx.rotate(-st.ra * 0.5 + st.spin * 0.15); cx.strokeStyle = al ? "#3a2a52" : "#262a36"; cx.lineWidth = 1.6; cx.beginPath(); cx.arc(0, 0, s * 0.3, 0, TAU); cx.stroke(); cx.strokeStyle = al ? "#b46aff" : "#8a94ac"; cx.lineWidth = 1; cx.setLineDash([2.2, 3.4]); cx.beginPath(); cx.arc(0, 0, s * 0.3, 0, TAU); cx.stroke(); cx.setLineDash([]); cx.restore();
    cx.rotate(st.ra);
    var bl = (sn ? 1.3 : lb ? 0.8 : 1) * s, th = (lb ? 0.3 : sn ? 0.17 : 0.2) * s, n = (sn || lb) ? 1 : 2, k, off, rc;
    if (al) {
      // organic spitter: two claw-barrels that flex apart, a pulsing bulb, glowing maw
      var open = st.open * 0.5, pul = 1 + sin(tt * 6) * 0.05 + heat * 0.18;
      for (k = 0; k < (n === 1 ? 1 : 2); k++) {
        off = n === 1 ? 0 : (k ? 1 : -1) * (0.13 * s + open * s * 0.2); rc = st.rc[n === 1 ? 2 : k] * s * 0.28; cx.save(); cx.translate(-rc, off); cx.rotate((n === 1 ? 0 : (k ? 1 : -1)) * open * 0.4);
        var gr = cx.createLinearGradient(0, -th, 0, th); gr.addColorStop(0, "#6b3a8a"); gr.addColorStop(1, "#2a1840"); cx.fillStyle = gr; cx.beginPath(); cx.moveTo(-s * 0.1, -th * 0.9); cx.quadraticCurveTo(bl * 0.6, -th * 0.7, bl, -th * 0.35); cx.lineTo(bl, th * 0.35); cx.quadraticCurveTo(bl * 0.6, th * 0.7, -s * 0.1, th * 0.9); cx.closePath(); cx.fill(); cx.strokeStyle = "rgba(20,8,30,.85)"; cx.lineWidth = 0.8; cx.stroke();
        cx.fillStyle = "rgb(" + (150 + heat * 100 | 0) + ",255," + (90 + heat * 40 | 0) + ")"; cx.beginPath(); cx.ellipse(bl, 0, th * 0.25 + heat * 0.8, th * 0.4 + heat * 0.8, 0, 0, TAU); cx.fill(); cx.restore();
      }
      cx.fillStyle = "#8a3fd0"; cx.beginPath(); cx.ellipse(-s * 0.04, 0, s * 0.24 * pul, s * 0.2 * pul, 0, 0, TAU); cx.fill(); cx.strokeStyle = "rgba(20,8,30,.85)"; cx.lineWidth = 0.9; cx.stroke(); cx.fillStyle = "rgba(190,255,120," + (0.55 + heat * 0.4) + ")"; cx.beginPath(); cx.arc(-s * 0.05, 0, s * 0.09 * pul, 0, TAU); cx.fill();
    } else {
      for (k = 0; k < (n === 1 ? 1 : 2); k++) {
        off = n === 1 ? 0 : (k ? 1 : -1) * s * 0.13; rc = st.rc[n === 1 ? 2 : k] * s * 0.3; cx.save(); cx.translate(-rc, off);
        cx.fillStyle = "#262a36"; rr(cx, -s * 0.1, -th / 2, bl + s * 0.1, th, 1.4); cx.fill(); cx.fillStyle = "#4a5266"; cx.fillRect(-s * 0.05, -th / 2, bl * 0.9, th * 0.28);
        cx.fillStyle = heat > 0 ? "rgb(255," + (150 + ((1 - heat) * 90 | 0)) + ",60)" : "#7a8398"; cx.fillRect(bl - 2, -th / 2 - 0.4, 2.8, th + 0.8); cx.restore();
      }
      cx.fillStyle = "#3a4054"; rr(cx, -s * 0.2, -s * 0.2, s * 0.4, s * 0.4, 2.2); cx.fill(); cx.strokeStyle = "#1c202c"; cx.lineWidth = 0.8; cx.stroke(); cx.fillStyle = heat > 0.1 ? "rgb(255," + (120 + (1 - heat) * 100 | 0) + ",60)" : "#8a94ac"; cx.fillRect(-s * 0.1, -s * 0.03, s * 0.2, s * 0.06);
    }
    if (st.fl > 0) { var fm = flashImg(), fs = (lb ? 17 : 13) * (cl ? 0.5 : 0.85 + Math.random() * 0.5) * (s / 12); cx.globalCompositeOperation = "lighter"; cx.globalAlpha = cl ? 0.5 : 1; cx.drawImage(fm, bl - fs * 0.25, -fs / 2, fs, fs); cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over"; }
    cx.restore();
  };

  // ---------- creature slicing: head / body / feet bands of an existing sprite move independently (raid aliens + troops) ----------
  // src: Image or canvas, (sx,sy,sw,sh) = source rect, drawn bottom-anchored at (x,y) into a w x h box. st: {ph, atk (0..1 attack swing), hit, mv, rc, lean}
  RIG.sliceDraw = function (cx, src, sx, sy, sw, sh, x, y, w, h, st, flip) {
    var ph = st.ph || 0, mv = st.mv || 0, atk = st.atk || 0, rc = st.rc || 0, ht = st.hit || 0, bob = (mv ? abs(sin(ph)) * h * 0.05 : sin(ph * 0.2) * h * 0.012), lunge = atk * w * 0.18, lean = (mv ? 0.05 : 0.01) * sin(ph * 0.5) - atk * 0.14 + rc * 0.1, fx = flip ? -1 : 1;
    var cutA = 0.42, cutB = 0.76, hy = sh * cutA, by = sh * cutB, y0 = y - h;
    cx.save(); cx.translate(x, y); cx.scale(fx, 1);
    // feet (two halves step alternately)
    var fh = h * (1 - cutB), fy = -fh, fw = w / 2, sA = sin(ph) * w * 0.1 * mv, sB = -sA, liftA = max(0, cos(ph)) * h * 0.06 * mv, liftB = max(0, -cos(ph)) * h * 0.06 * mv;
    cx.drawImage(src, sx, sy + by, sw / 2, sh - by, -fw + sA, fy - liftA, fw, fh);
    cx.drawImage(src, sx + sw / 2, sy + by, sw / 2, sh - by, 0 + sB, fy - liftB, fw, fh);
    // body (pivot at the hips)
    var bh = h * (cutB - cutA);
    cx.save(); cx.translate(lunge * 0.6, -fh - bob); cx.rotate(lean); cx.scale(1 + ht * 0.08 + atk * 0.05, 1 - ht * 0.06 - atk * 0.03);
    cx.drawImage(src, sx, sy + hy, sw, by - hy, -w / 2, -bh, w, bh);
    // head / weapon band
    var hh = h * cutA; cx.translate(0, -bh); cx.rotate(-lean * 1.6 - atk * 0.2 + sin(ph * 1.3) * 0.03 * (1 - mv) - rc * 0.15); cx.translate(lunge * 0.5 - rc * 3, 0); cx.scale(1 + atk * 0.06, 1 + rc * 0.05 - atk * 0.04);
    cx.drawImage(src, sx, sy, sw, hy, -w / 2, -hh, w, hh);
    cx.restore(); cx.restore();
  };
})();
