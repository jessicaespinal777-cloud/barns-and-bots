// ---- v0.10 RIG2: detail layer. Part-based creature + troop rigs (procedural vector parts), strike timing (wind-up / strike / follow-through),
// per-part damage states, shed plates, smoke trails, slashes, decals, bullet kinds and muzzle-flash shapes. Cosmetic only (never touches the sim).
(function () {
  var RIG = BB.RIG; if (!RIG) return; var R2 = BB.RIG2 = {}, TAU = Math.PI * 2, PI = Math.PI, sin = Math.sin, cos = Math.cos, min = Math.min, max = Math.max, abs = Math.abs;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function calm() { return !!(BB.FX && BB.FX.calm && BB.FX.calm()); }
  function take(a) { for (var k = 0; k < a.length; k++) if (!a[k].on) return a[k]; return null; }
  // ---------- new bullet kinds ----------
  var K = RIG.KIND;
  K.rocket = {spd: 300, len: 24, w: 3.2, c: "#ffb060", c2: "#fff", glow: "#ff7a20", rocket: 1, smoke: 1};
  K.tracer = {spd: 900, len: 70, w: 1.4, c: "#fff6c0", c2: "#fff", glow: "#ffe080"};
  K.acid = {spd: 250, len: 10, w: 5, c: "#b8ff3a", c2: "#f0ffb0", glow: "#7adc10", orb: 1, arc: 1, drip: 1};
  K.shardb = {spd: 600, len: 20, w: 2.6, c: "#9be8ff", c2: "#fff", glow: "#5ac8ff", crystal: 1};
  K.slug = {spd: 520, len: 18, w: 4, c: "#ffd070", c2: "#fff", glow: "#ff9a30", orb: 1, smoke: 1};
  K.stinger = {spd: 560, len: 22, w: 2.2, c: "#e8ff7a", c2: "#fff", glow: "#a8e820"};
  // ---------- pools: smoke puffs, slash arcs, ground decals, shed plates ----------
  var SM = [], SL = [], DC = [], SH = [], q0;
  for (q0 = 0; q0 < 70; q0++) SM.push({on: 0});
  for (q0 = 0; q0 < 14; q0++) SL.push({on: 0});
  for (q0 = 0; q0 < 36; q0++) DC.push({on: 0});
  for (q0 = 0; q0 < 14; q0++) SH.push({on: 0});
  RIG.pool.sm = SM; RIG.pool.sl = SL; RIG.pool.dc = DC; RIG.pool.sh = SH;
  RIG.smoke = function (x, y, r, c, life, up) { var s = take(SM); if (!s) return; s.on = 1; s.x = x; s.y = y; s.r = r || 3; s.c = c || "#555"; s.l = s.l0 = (life || 0.9) * (calm() ? 0.6 : 1); s.vy = -(up || 14) - rnd(0, 8); s.vx = rnd(-6, 6); };
  RIG.slash = function (x, y, ang, len, c, wid, dir) { var s = take(SL); if (!s) return; s.on = 1; s.x = x; s.y = y; s.a = ang; s.len = len || 20; s.c = c || "#fff"; s.w = wid || 3; s.l = s.l0 = calm() ? 0.14 : 0.22; s.dir = dir || 1; };
  RIG.decal = function (x, y, kind, r) { var d = take(DC); if (!d) { d = DC[0]; for (var k = 0; k < DC.length; k++) if (DC[k].l < d.l) d = DC[k]; } d.on = 1; d.x = x; d.y = y; d.k = kind; d.r = r || 6; d.l = d.l0 = kind === "acid" ? 9 : 14; d.rot = rnd(0, TAU); d.sq = rnd(0.45, 0.6); d.n = (Math.random() * 7) | 0; };
  RIG.shed = function (i, n, o) {
    var nd = i.d.map && i.d.map[n], m = i.wm[n]; if (!nd || !m || !RIG.parts[nd.im]) return; var s = take(SH); if (!s) return; o = o || {}; var pt = RIG.parts[nd.im];
    s.on = 1; s.pt = pt; s.pv = nd.pv; s.m = [m[0], m[1], m[2], m[3], m[4], m[5]]; s.ox = 0; s.oy = 0; s.rot = 0; s.vx = (o.vx !== undefined ? o.vx : -i.face * rnd(30, 90)); s.vy = -rnd(90, 170); s.vr = rnd(-9, 9); s.l = s.l0 = 1.5; s.gy = i.gy + rnd(-2, 3) - m[5]; s.b = 0;
    if (!calm()) { RIG.spark(m[4], m[5], rnd(0, TAU), rnd(40, 120), 0.3, "#ffd070"); RIG.spark(m[4], m[5], rnd(0, TAU), rnd(40, 120), 0.3, "#fff"); }
  };
  var _upd = RIG.update; RIG.update = function (dt) {
    _upd(dt); var k, b, s;
    for (k = 0; k < RIG.pool.bu.length; k++) { b = RIG.pool.bu[k]; if (!b.on || b.delay > 0 || !b.k.smoke) continue; b.sm -= dt; if (b.sm <= 0) { b.sm = calm() ? 0.07 : 0.03; RIG.smoke(b.x - b.ux * 6, b.y - b.uy * 6, rnd(1.6, 3.2), b.k.rocket ? "#8a8a96" : "#9a8a6a", 0.7, 6); if (b.k.rocket && !calm()) RIG.spark(b.x - b.ux * 8, b.y - b.uy * 8, b.rot + PI + rnd(-0.5, 0.5), rnd(30, 80), 0.18, "#ffb040", 0); } }
    for (k = 0; k < SM.length; k++) { s = SM[k]; if (!s.on) continue; s.l -= dt; if (s.l <= 0) { s.on = 0; continue; } s.x += s.vx * dt; s.y += s.vy * dt; s.vy *= 0.97; s.r += dt * 4; }
    for (k = 0; k < SL.length; k++) { s = SL[k]; if (!s.on) continue; s.l -= dt; if (s.l <= 0) s.on = 0; }
    for (k = 0; k < DC.length; k++) { s = DC[k]; if (!s.on) continue; s.l -= dt; if (s.l <= 0) s.on = 0; }
    for (k = 0; k < SH.length; k++) { s = SH[k]; if (!s.on) continue; s.l -= dt; if (s.l <= 0) { s.on = 0; continue; } s.vy += 700 * dt; s.ox += s.vx * dt; s.oy += s.vy * dt; s.rot += s.vr * dt; if (s.oy > s.gy && s.vy > 0) { s.oy = s.gy; s.vy *= -0.35; s.vx *= 0.5; s.vr *= 0.3; s.b++; } }
  };
  // impacts leave a decal (scorch / acid / crack) and heavy kinds add a smoke wisp
  var _imp = RIG.impact; RIG.impact = function (x, y, kind, ang, big) {
    _imp(x, y, kind, ang, big); var heavy = kind === "cannon" || kind === "plasma" || kind === "rocket" || kind === "slug" || kind === "acid";
    RIG.decal(x, y + 5, kind === "acid" ? "acid" : (heavy ? "scorch" : "nick"), (heavy ? 8 : 3) * (big || 1));
    if (heavy && !calm()) { RIG.smoke(x, y, 3, "#6a6a74", 0.8, 12); if (kind === "rocket") RIG.ring(x, y, 22 * (big || 1), 0.26, "#ffb060", 3); }
  };
  RIG.drawDecals = function (cx) {
    for (var k = 0; k < DC.length; k++) {
      var d = DC[k]; if (!d.on) continue; var f = d.l / d.l0, a = min(1, f * 3) * (d.k === "nick" ? 0.35 : 0.55);
      cx.save(); cx.translate(d.x, d.y); cx.rotate(d.rot); cx.scale(1, d.sq); cx.globalAlpha = a;
      if (d.k === "acid") { cx.fillStyle = "#6ab81c"; cx.beginPath(); cx.arc(0, 0, d.r, 0, TAU); cx.fill(); cx.fillStyle = "#b8ff3a"; cx.globalAlpha = a * 0.5; cx.beginPath(); cx.arc(-d.r * 0.2, -d.r * 0.2, d.r * 0.5, 0, TAU); cx.fill(); for (var j = 0; j < 4; j++) { cx.beginPath(); cx.arc(cos(j * 1.6 + d.n) * d.r * 1.15, sin(j * 1.6 + d.n) * d.r * 0.9, d.r * 0.22, 0, TAU); cx.fill(); } }
      else if (d.k === "scorch") { var g = cx.createRadialGradient(0, 0, 0, 0, 0, d.r); g.addColorStop(0, "rgba(10,6,8,.9)"); g.addColorStop(0.6, "rgba(26,16,14,.55)"); g.addColorStop(1, "rgba(30,20,14,0)"); cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, d.r, 0, TAU); cx.fill(); cx.strokeStyle = "rgba(10,6,8,.6)"; cx.lineWidth = 0.8; for (var j2 = 0; j2 < 5; j2++) { var aa = j2 * 1.3 + d.n; cx.beginPath(); cx.moveTo(cos(aa) * d.r * 0.5, sin(aa) * d.r * 0.5); cx.lineTo(cos(aa) * d.r * 1.1, sin(aa) * d.r * 1.1); cx.stroke(); } }
      else { cx.fillStyle = "#1a1210"; cx.beginPath(); cx.arc(0, 0, d.r, 0, TAU); cx.fill(); }
      cx.restore();
    }
  };
  var _dfx = RIG.drawFx; RIG.drawFx = function (cx) {
    var k, s, cl = calm();
    var bt = cx.getTransform(), ga0 = cx.globalAlpha;
    for (k = 0; k < SH.length; k++) { s = SH[k]; if (!s.on) continue; var ca = cos(s.rot), sa = sin(s.rot), m = s.m, pt = s.pt; cx.setTransform(bt); cx.globalAlpha = ga0 * min(1, s.l * 2); cx.transform(ca * m[0] - sa * m[1], sa * m[0] + ca * m[1], ca * m[2] - sa * m[3], sa * m[2] + ca * m[3], m[4] + s.ox, m[5] + s.oy); cx.drawImage(pt.im, pt.sx, pt.sy, pt.sw, pt.sh, -s.pv[0] * pt.dw, -s.pv[1] * pt.dh, pt.dw, pt.dh); }
    cx.setTransform(bt); cx.globalAlpha = ga0;
    for (k = 0; k < SM.length; k++) { s = SM[k]; if (!s.on) continue; var f = s.l / s.l0; cx.globalAlpha = f * 0.5; cx.fillStyle = s.c; cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, TAU); cx.fill(); }
    cx.globalAlpha = 1; _dfx(cx);
    // rocket bodies + crystal / acid details over the generic bullet streak
    for (k = 0; k < RIG.pool.bu.length; k++) { var b = RIG.pool.bu[k]; if (!b.on || b.delay > 0) continue; var kd = b.k;
      if (kd.rocket) { var an = Math.atan2(b.uy, b.ux); cx.save(); cx.translate(b.x, b.y); cx.rotate(an); cx.fillStyle = "#d8dce6"; cx.fillRect(-7, -1.7, 11, 3.4); cx.fillStyle = "#e84a3a"; cx.beginPath(); cx.moveTo(4, -1.7); cx.lineTo(8, 0); cx.lineTo(4, 1.7); cx.fill(); cx.fillStyle = "#8a90a0"; cx.fillRect(-7, -3, 3, 6); cx.globalCompositeOperation = "lighter"; cx.fillStyle = "#ffb040"; cx.beginPath(); cx.moveTo(-7, -1.6); cx.lineTo(-13 - rnd(0, 4), 0); cx.lineTo(-7, 1.6); cx.fill(); cx.restore(); }
      else if (kd.crystal) { var an2 = Math.atan2(b.uy, b.ux); cx.save(); cx.translate(b.x, b.y); cx.rotate(an2); cx.fillStyle = "#e8fcff"; cx.beginPath(); cx.moveTo(7, 0); cx.lineTo(0, -2.6); cx.lineTo(-5, 0); cx.lineTo(0, 2.6); cx.fill(); cx.restore(); }
      else if (kd.drip && !cl && Math.random() < 0.3) RIG.spark(b.x, b.y, PI / 2, rnd(10, 30), 0.3, "#b8ff3a", 300); }
    for (k = 0; k < SL.length; k++) { s = SL[k]; if (!s.on) continue; var f2 = 1 - s.l / s.l0; cx.save(); cx.translate(s.x, s.y); cx.rotate(s.a); cx.globalAlpha = (1 - f2) * 0.9; cx.strokeStyle = s.c; cx.lineCap = "round";
      var a0 = -0.9 * s.dir + f2 * 0.5 * s.dir, a1 = a0 + 1.8 * s.dir * min(1, f2 * 3 + 0.3); cx.lineWidth = s.w * (1 - f2 * 0.6); cx.beginPath(); cx.arc(0, 0, s.len * (0.7 + f2 * 0.3), a0, a1, s.dir < 0); cx.stroke(); cx.strokeStyle = "#fff"; cx.lineWidth = max(0.8, s.w * 0.35); cx.beginPath(); cx.arc(0, 0, s.len * (0.7 + f2 * 0.3), a0 + 0.5 * s.dir, a1, s.dir < 0); cx.stroke(); cx.restore(); }
    cx.globalAlpha = 1;
  };
  var _clr = RIG.clearFx; RIG.clearFx = function () { _clr(); [SM, SL, DC, SH].forEach(function (a) { for (var k = 0; k < a.length; k++) a[k].on = 0; }); };
  var _lc = RIG.liveCount; RIG.liveCount = function () { var n = _lc(); [SM, SL, DC, SH].forEach(function (a) { for (var k = 0; k < a.length; k++) if (a[k].on) n++; }); return n; };
  R2.noop = 0;
  // ---------- muzzle-flash shapes (one canvas each, cached): star / cone (shotgun) / slit (rail) / ring (cannon) / bloom (plasma) / needle ----------
  var FS = {};
  RIG.shapeFor = function (kind) { return {rifle: "star", pellet: "cone", cannon: "ring", rail: "rail", plasma: "bloom", frost: "bloomc", bolt: "needle", seed: "cone", spit: "bloom"}[kind] || "star"; };
  RIG.flashShape = function (n) {
    if (FS[n]) return FS[n]; var c = document.createElement("canvas"), W = n === "cone" || n === "rail" || n === "needle" ? 96 : 64, H = 64; c.width = W; c.height = H; var g = c.getContext("2d"), gr;
    if (n === "cone") { gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "rgba(255,250,210,1)"); gr.addColorStop(0.4, "rgba(255,190,70,.85)"); gr.addColorStop(1, "rgba(255,120,20,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 32); g.lineTo(W, 6); g.lineTo(W, 58); g.closePath(); g.fill(); for (var k = -2; k <= 2; k++) { g.strokeStyle = "rgba(255,240,180,.8)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(4, 32); g.lineTo(W * 0.92, 32 + k * 10); g.stroke(); } }
    else if (n === "rail") { gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(80,255,235,.9)"); gr.addColorStop(1, "rgba(30,200,190,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 32); g.lineTo(W * 0.2, 25); g.lineTo(W, 31); g.lineTo(W, 33); g.lineTo(W * 0.2, 39); g.closePath(); g.fill(); g.fillStyle = "rgba(200,255,250,.9)"; g.beginPath(); g.arc(4, 32, 9, 0, TAU); g.fill(); }
    else if (n === "needle") { gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(190,150,255,.8)"); gr.addColorStop(1, "rgba(120,80,255,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 32); g.lineTo(W, 31); g.lineTo(W, 33); g.closePath(); g.fill(); g.fillRect(0, 29, W * 0.4, 6); }
    else if (n === "ring") { gr = g.createRadialGradient(32, 32, 0, 32, 32, 28); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(130,200,255,.7)"); gr.addColorStop(1, "rgba(60,140,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.strokeStyle = "rgba(210,240,255,.95)"; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 17, 0, TAU); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.arc(32, 32, 26, 0, TAU); g.stroke(); }
    else if (n === "bloom" || n === "bloomc") { var c1 = n === "bloom" ? "255,140,50" : "120,225,255"; gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(" + c1 + ",.9)"); gr.addColorStop(1, "rgba(" + c1 + ",0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
    else { c = RIG.flashImg(); }
    FS[n] = {im: c, dir: n === "cone" || n === "rail" || n === "needle"}; return FS[n];
  };
  RIG.drawFlash = function (cx, fs, mx, my, sz, ang, cl) {
    var ga = cx.globalAlpha, s = sz * (cl ? 0.45 : 0.85 + Math.random() * 0.5); cx.globalCompositeOperation = "lighter"; cx.globalAlpha = ga * (cl ? 0.5 : 1); cx.save(); cx.translate(mx, my);
    if (fs.dir) { cx.rotate(ang || 0); cx.drawImage(fs.im, 0, -s * 0.33, s * 1.5, s * 0.66); } else { if (!cl) cx.rotate((ang || 0) + Math.random() * 0.6); cx.drawImage(fs.im, -s / 2, -s / 2, s, s); }
    cx.restore(); cx.globalCompositeOperation = "source-over"; cx.globalAlpha = ga;
  };
  // ---------- strike timing + damage states, wrapped around the existing make / define / step ----------
  var _make = RIG.make; RIG.make = function (kind) { var i = _make(kind); if (i) { i.sk = 0; i.sd = 0.5; i.stF = 0; i.strikeNow = 0; i.dmg = 0; i.shed = {}; i.smT = 0; i.armorBreak = 0; } return i; };
  var _def = RIG.define; RIG.define = function (kind, d) {
    d.nodes.forEach(function (nd) { if (nd.sh !== undefined) { var nm = nd.n, ov = nd.vis; nd.vis = function (i) { return !i.shed[nm] && (!ov || ov(i)); }; (d.shedAt = d.shedAt || {})[nm] = nd.sh; } });
    return _def(kind, d);
  };
  RIG.strike = function (i, dur) { if (!i || i.sk > 0.12) return; i.sk = i.sd = dur || 0.5; i.stF = 0; i.strikeNow = 0; };
  RIG.atkC = function (i) { if (!(i.sk > 0)) return 0; var ap = 1 - i.sk / i.sd; if (ap < 0.34) { var u = ap / 0.34; return -u * u * (3 - 2 * u); } if (ap < 0.5) return -1 + 2 * ((ap - 0.34) / 0.16); var v = (ap - 0.5) / 0.5; return 1 - v * v * (3 - 2 * v); };
  var _step = RIG.step; RIG.step = function (i, dt, inp) {
    if (i.sk > 0) { i.sk = max(0, i.sk - dt); if (!i.stF && 1 - i.sk / i.sd >= 0.5) { i.stF = 1; i.strikeNow = 1; } }
    var sa = i.d.shedAt; if (sa && i.dmg > 0) for (var n in sa) if (i.dmg >= sa[n] && !i.shed[n]) { i.shed[n] = 1; i.armorBreak = 1; RIG.shed(i, n); }
    _step(i, dt, inp);
  };
  // damage overlay helper: cracks (seeded), scorch patches, dents; sparks + smoke emitted as hp drops. Used as nd.after on a body node.
  R2.dmgAfter = function (w, h, cxo, cyo) {
    return function (cx, i) {
      var dm = i.dmg; if (!(dm > 0.18)) return; var sd = (i.seed * 7) | 0, n = 1 + ((dm - 0.18) * 7 | 0); cx.save(); cx.lineCap = "round";
      for (var k = 0; k < n && k < 6; k++) { var a = ((sd + k * 53) % 100) / 100 * 6.28, r0 = w * (0.08 + ((sd + k * 17) % 10) * 0.02), x0 = (cxo || 0) + cos(a) * r0, y0 = (cyo || 0) + sin(a) * r0 * 0.8;
        cx.strokeStyle = "rgba(10,6,10,.85)"; cx.lineWidth = 0.9; cx.beginPath(); cx.moveTo(x0, y0); var xx = x0, yy = y0, aa = a; for (var j = 0; j < 4; j++) { aa += (((sd + k * 5 + j * 11) % 7) - 3) * 0.28; xx += cos(aa) * w * 0.1; yy += sin(aa) * w * 0.1; cx.lineTo(xx, yy); } cx.stroke();
        cx.strokeStyle = "rgba(255,230,160,.35)"; cx.lineWidth = 0.4; cx.stroke(); }
      if (dm > 0.45) { cx.fillStyle = "rgba(16,10,12,.35)"; cx.beginPath(); cx.ellipse((cxo || 0) + w * 0.15, (cyo || 0) + h * 0.1, w * 0.18, h * 0.14, 0.5, 0, TAU); cx.fill(); }
      if (dm > 0.62 && !calm() && i.t > i.smT) { i.smT = i.t + 0.16; var m = i.wm[i.d.dmgNode || "torso"] || i.wm.root, gs = i.gs || 1; if (m) { RIG.smoke(m[4], m[5] - 6 * gs, 2.4 * gs, "#4a4a52", 0.9, 12); if (dm > 0.8) RIG.spark(m[4], m[5], rnd(-3, 0), rnd(30, 90), 0.3, "#ffd070", 200); } }
      cx.restore();
    };
  };
  R2.mkc = function (w, h, fn, KU) { KU = KU || 4; var c = document.createElement("canvas"); c.width = Math.ceil(w * KU); c.height = Math.ceil(h * KU); var g = c.getContext("2d"); g.scale(KU, KU); g.lineJoin = "round"; g.lineCap = "round"; fn(g, w, h); return c; };
  // ---------- painter library (vector parts rendered once into canvases, KU px per unit) ----------
  var OUT = "rgba(14,8,22,.95)";
  function sh(c, a) { var n = parseInt(c.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, t = a < 0 ? 0 : 255, p = Math.abs(a); return "rgb(" + Math.round(r + (t - r) * p) + "," + Math.round(g + (t - g) * p) + "," + Math.round(b + (t - b) * p) + ")"; }
  function lg(g, y0, y1, c) { var gr = g.createLinearGradient(0, y0, 0, y1 + 0.01); gr.addColorStop(0, sh(c, 0.32)); gr.addColorStop(0.5, c); gr.addColorStop(1, sh(c, -0.45)); return gr; }
  function fp(g, c, y0, y1, lw) { g.fillStyle = lg(g, y0, y1, c); g.fill(); g.strokeStyle = OUT; g.lineWidth = lw || 0.9; g.stroke(); }
  function ell(g, x, y, rx, ry, c, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); fp(g, c, y - ry, y + ry); }
  function poly(g, pts, c, lw) { g.beginPath(); g.moveTo(pts[0], pts[1]); var y0 = pts[1], y1 = pts[1]; for (var k = 2; k < pts.length; k += 2) { g.lineTo(pts[k], pts[k + 1]); y0 = min(y0, pts[k + 1]); y1 = max(y1, pts[k + 1]); } g.closePath(); fp(g, c, y0, y1, lw); }
  function rr(g, x, y, w, h, r, c, lw) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); fp(g, c, y, y + h, lw); }
  function spike(g, x, y, a, l, w, c) { var ca = cos(a), sa = sin(a); poly(g, [x - sa * w, y + ca * w, x + ca * l, y + sa * l, x + sa * w, y - ca * w], c, 0.7); }
  function glow(g, x, y, r, c) { var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "#fff"); gr.addColorStop(0.3, c); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function eye(g, x, y, r, c) { g.fillStyle = "#120a1c"; g.beginPath(); g.ellipse(x, y, r * 1.15, r, 0, 0, TAU); g.fill(); g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r * 0.8, r * 0.75, 0, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(x + r * 0.3, y - r * 0.3, r * 0.25, 0, TAU); g.fill(); }
  function line(g, x0, y0, x1, y1, c, w) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  function rivet(g, x, y, r) { g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.arc(x - r * 0.2, y - r * 0.2, r, 0, TAU); g.fill(); g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.arc(x + r * 0.2, y + r * 0.2, r * 0.8, 0, TAU); g.fill(); }
  function hi(g, path) { g.save(); g.strokeStyle = "rgba(255,255,255,.28)"; g.lineWidth = 0.7; g.beginPath(); path(g); g.stroke(); g.restore(); }
  R2.L = {sh: sh, lg: lg, fp: fp, ell: ell, poly: poly, rr: rr, spike: spike, glow: glow, eye: eye, line: line, rivet: rivet, hi: hi, OUT: OUT};
  // species builder: parts -> canvases, nodes -> RIG.define. nodes use short part names; pose(i, p, X) runs inside a poseFn that resets all nodes first.
  var BUILT = R2.built = {};
  function build(kind, o) {
    var names = [], k; for (k in o.parts) { var pr = o.parts[k]; RIG.addCanvas(kind + "_" + k, R2.mkc(pr[0], pr[1], pr[2], o.KU || 4), pr[0], pr[1]); }
    var nodes = o.nodes.map(function (nd) { var n2 = {}; for (var q in nd) n2[q] = nd[q]; if (nd.im) n2.im = kind + "_" + nd.im; return n2; });
    var d = {H: o.H, q: {}, nodes: nodes, sc0: 1, dmgNode: o.dmgNode || "torso", fly: !!o.fly, sz: o.sz};
    if (o.mz) { d.mzNode = o.mz; }
    d.poseFn = function (i) {
      var p = i.p, n; for (n in p) { var e = p[n]; e.r = 0; e.dx = 0; e.dy = 0; e.sx = 1; e.sy = 1; }
      var t = i.t, w = i.mv, ph = i.ph, ap = i.sk > 0 ? 1 - i.sk / i.sd : 0, c = RIG.atkC(i);
      var X = {t: t, w: w, ph: ph, c: c, ap: ap, atk: i.sk > 0 ? 1 : 0, br: sin(t * 2.2 + i.seed), fl: i.fl, hit: i.hit, rc: i.rc, dm: i.dmg || 0, s1: i.sp.a, s2: i.sp2.a, s3: i.sp3.a, aim: i.al, ak: i.ak, face: i.face};
      o.pose(i, p, X); if (i.mz && o.mz) { }
    };
    var df = RIG.define(kind, d); if (o.done) o.done(df); BUILT[kind] = df; return df;
  }
  R2.build = build;
  // =====================================================================================================================================
  // ALIEN RIGS. Facing +x. Feet / ground at y=0, pivot-fraction helper pv(px,py,w,h) = joint position inside the part image.
  function pv(px, py, w, h) { return [px / w, py / h]; }
  function pal(o) { return o; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function swing(c, rest, wind, hitv, foll) { return c < 0 ? lerp(rest, wind, -c) : lerp(rest, hitv, c); }
  // ---- Snatcher: hovering pod with two articulated hook-claws (claw swipe) ----
  var PS = pal({steel: "#9db4c8", dk: "#5a7690", ink: "#2a3a4c", teal: "#40d8f0", fin: "#37a8c0", bone: "#e8dcc0"});
  build("sn_snatch", {
    H: 36, sz: 20, dmgNode: "pod", mz: {n: "clawF", x: 7, y: 8, dir: 0},
    parts: {
      pod: [24, 24, function (g, w, h) { g.beginPath(); g.arc(12, 12, 10.5, 0, TAU); var gr = g.createRadialGradient(8, 7, 1, 12, 12, 12); gr.addColorStop(0, "#eaf4ff"); gr.addColorStop(0.45, PS.steel); gr.addColorStop(1, PS.ink); g.fillStyle = gr; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
        g.strokeStyle = "rgba(20,30,45,.7)"; g.lineWidth = 0.9; g.beginPath(); g.ellipse(12, 13, 10.4, 3.2, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(12, 1.8); g.lineTo(12, 7); g.moveTo(4, 7); g.lineTo(8, 9.5); g.stroke(); rivet(g, 5, 14, 0.7); rivet(g, 19, 14, 0.7); rivet(g, 12, 21, 0.7);
        g.fillStyle = "#0c1822"; g.beginPath(); g.arc(14.5, 10, 4.6, 0, TAU); g.fill(); glow(g, 14.5, 10, 4.2, PS.teal); g.strokeStyle = "rgba(220,250,255,.9)"; g.lineWidth = 0.6; g.beginPath(); g.arc(14.5, 10, 4.4, 0, TAU); g.stroke(); g.fillStyle = "#06121c"; g.beginPath(); g.arc(14.9, 10, 1.4, 0, TAU); g.fill(); hi(g, function (g2) { g2.arc(12, 12, 9, 3.6, 4.9); }); }],
      fin: [14, 10, function (g, w, h) { poly(g, [13, 5, 6, 0.8, 1, 4.5, 6, 9], PS.fin); line(g, 11.5, 5, 3, 4.5, "rgba(255,255,255,.5)", 0.5); }],
      uarm: [6, 11, function (g, w, h) { rr(g, 1.5, 0.5, 3, 9.5, 1.5, PS.dk); ell(g, 3, 1.5, 2.4, 2.4, PS.steel); rivet(g, 3, 6, 0.6); }],
      claw: [17, 15, function (g, w, h) { ell(g, 4, 3.5, 3.6, 3.4, PS.steel); g.fillStyle = PS.teal; g.beginPath(); g.arc(4, 3.5, 1, 0, TAU); g.fill(); for (var k = 0; k < 3; k++) { var a = 0.15 + k * 0.5; g.beginPath(); g.moveTo(5 + k, 5 + k * 0.6); g.bezierCurveTo(9 + k * 2, 5 + k * 3, 14 + k, 9 + k * 2, 14 + k * 0.5, 14 - k * 0.6); g.bezierCurveTo(12 + k * 0.5, 9 + k, 9, 8 + k, 5.4 + k, 8 + k * 0.8); g.closePath(); fp(g, k === 1 ? PS.bone : "#c8d4de", 5, 14, 0.6); } }],
      jet: [10, 11, function (g, w, h) { poly(g, [2, 0, 8, 0, 6.5, 6, 3.5, 6], PS.ink); ell(g, 5, 6.2, 2.4, 1, "#18242f"); }]
    },
    nodes: [
      {n: "pod", par: null, x: 0, y: -22, im: "pod", pv: pv(12, 12, 24, 24), z: 0, after: null},
      {n: "finB", par: "pod", x: -6, y: -2, im: "fin", pv: pv(13, 5, 14, 10), z: -2, r0: -0.4}, {n: "finF", par: "pod", x: -6, y: 2, im: "fin", pv: pv(13, 5, 14, 10), z: -1, r0: 0.25},
      {n: "jet", par: "pod", x: -1, y: 10, im: "jet", pv: pv(5, 0, 10, 11), z: -1},
      {n: "uarmB", par: "pod", x: 4, y: 6, im: "uarm", pv: pv(3, 1.5, 6, 11), z: -3}, {n: "clawB", par: "uarmB", x: 0, y: 8.5, im: "claw", pv: pv(4, 3.5, 17, 15), z: 0},
      {n: "uarmF", par: "pod", x: 7, y: 6, im: "uarm", pv: pv(3, 1.5, 6, 11), z: 3}, {n: "clawF", par: "uarmF", x: 0, y: 8.5, im: "claw", pv: pv(4, 3.5, 17, 15), z: 0}
    ],
    pose: function (i, p, X) {
      var c = X.c, bob = sin(X.t * 3.1 + i.seed) * 1.1;
      p.pod.dy = bob - X.w * 0.8 - (c < 0 ? -c * 1.5 : -c * 0); p.pod.r = X.w * 0.12 + (c < 0 ? c * 0.25 : c * 0.28) - X.fl * 0.3; p.pod.dx = c > 0 ? c * 3.5 : c * 1.8;
      p.finF.r = sin(X.t * 9) * 0.18 + X.s1 * 0.5; p.finB.r = -sin(X.t * 9 + 1) * 0.18 + X.s2 * 0.5;
      p.jet.sy = 1 + sin(X.t * 22) * 0.12 + X.w * 0.3; p.jet.sx = 1 + sin(X.t * 17) * 0.05;
      var rest = -0.35 + sin(X.t * 2.1 + i.seed) * 0.08 + sin(X.ph) * 0.35 * X.w;
      p.uarmF.r = swing(c, rest, 2.25, -1.25); p.clawF.r = swing(c, -0.25, 0.7, -0.9); p.clawF.sx = 1 + (c > 0 ? c * 0.15 : 0);
      var restB = -0.1 - sin(X.ph) * 0.3 * X.w + sin(X.t * 1.7) * 0.07; p.uarmB.r = swing(c, restB, 1.6, -0.7); p.clawB.r = swing(c, -0.1, 0.5, -0.6);
    },
    done: function (d) { d.map.pod.after = function (cx, i) { R2.dmgAfter(24, 24, 12, 12)(cx, i); var k = 0.55 + 0.45 * sin(i.t * 4 + i.seed) + (i.sk > 0 ? 0.6 : 0); if (!calm()) { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = min(1, k) * 0.7; var gr = cx.createRadialGradient(2.5, -2, 0, 2.5, -2, 8); gr.addColorStop(0, "#9ff"); gr.addColorStop(1, "rgba(60,220,255,0)"); cx.fillStyle = gr; cx.fillRect(-8, -10, 20, 16); cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1; } };
      d.map.jet.after = function (cx, i) { if (calm()) return; var f = 3 + sin(i.t * 30) * 1.5 + i.mv * 3; cx.globalCompositeOperation = "lighter"; var gr = cx.createLinearGradient(0, 6, 0, 6 + f * 2.6); gr.addColorStop(0, "rgba(160,250,255,.95)"); gr.addColorStop(1, "rgba(60,160,255,0)"); cx.fillStyle = gr; cx.beginPath(); cx.moveTo(-1.8, 6); cx.lineTo(1.8 + 3.2, 6); cx.lineTo(2.5, 6 + f * 2.6); cx.fill(); cx.globalCompositeOperation = "source-over"; }; }
  });
  // ---- Stinger: wasp flyer. Wings flap, abdomen curls forward and spits (acid / stinger bolt) ----
  var PT = {pur: "#7a4bb4", dk: "#3c2468", grn: "#8cff3a", gd: "#4aa81c", bone: "#efe6c8", wing: "rgba(190,150,255,.55)"};
  build("sn_sting", {
    H: 34, sz: 20, fly: true, dmgNode: "thorax", mz: {n: "tip", x: -9, y: 0, dir: PI},
    parts: {
      thorax: [18, 15, function (g) { g.beginPath(); g.ellipse(9, 7.5, 8.2, 6.6, 0, 0, TAU); fp(g, PT.pur, 1, 14); poly(g, [3, 3, 9, 1.4, 14, 3, 9, 4.4], PT.dk, 0.6); g.strokeStyle = "rgba(140,255,58,.8)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(5, 9); g.lineTo(9, 11); g.lineTo(13, 9); g.stroke(); rivet(g, 9, 6, 0.8); }],
      head: [13, 12, function (g) { g.beginPath(); g.ellipse(6.5, 6, 6, 5, 0, 0, TAU); fp(g, PT.dk, 1, 11); eye(g, 8, 4.6, 2.3, PT.grn); spike(g, 5, 2, -1.9, 5.5, 1.1, PT.bone); spike(g, 8, 1.6, -1.3, 5, 1, PT.bone); poly(g, [8, 8.5, 12.5, 7.5, 11, 11, 8, 10.5], PT.bone, 0.6); }],
      jaw: [8, 6, function (g) { poly(g, [0.5, 0.5, 7.5, 2, 5, 5, 1, 3.5], PT.bone, 0.6); }],
      abd1: [14, 11, function (g) { g.beginPath(); g.ellipse(7, 5.5, 6.8, 5, 0, 0, TAU); fp(g, PT.pur, 0.5, 10.5); for (var k = 0; k < 3; k++) { g.strokeStyle = "rgba(20,10,40,.7)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(3 + k * 3, 1); g.quadraticCurveTo(4 + k * 3, 5.5, 3 + k * 3, 10); g.stroke(); } glow(g, 10.5, 5.5, 2, PT.grn); }],
      abd2: [12, 8, function (g) { g.beginPath(); g.ellipse(6, 4, 5.6, 3.6, 0, 0, TAU); fp(g, PT.dk, 0.5, 7.5); line(g, 2, 4, 9, 4, "rgba(140,255,58,.55)", 0.7); }],
      tip: [11, 7, function (g) { poly(g, [10.5, 3.5, 5, 1, 0.3, 3.5, 5, 6], PT.bone, 0.6); poly(g, [3, 3.5, 0, 3.5, 3, 4.5], PT.grn, 0.4); glow(g, 2, 3.5, 2.2, PT.grn); }],
      wing: [24, 13, function (g) { g.beginPath(); g.moveTo(2, 12); g.bezierCurveTo(2, 3, 12, 0, 23, 1.5); g.bezierCurveTo(19, 7, 11, 11, 2, 12); g.closePath(); g.fillStyle = PT.wing; g.fill(); g.strokeStyle = "rgba(60,30,110,.8)"; g.lineWidth = 0.7; g.stroke(); g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 0.4; for (var k = 0; k < 4; k++) { g.beginPath(); g.moveTo(2, 12); g.lineTo(21, 2.5 + k * 1.6); g.stroke(); } }],
      leg: [4, 10, function (g) { rr(g, 1.2, 0, 1.6, 9, 0.8, PT.dk, 0.5); poly(g, [0.6, 9, 3.4, 9, 2, 10], PT.bone, 0.3); }]
    },
    nodes: [
      {n: "thorax", par: null, x: 0, y: -22, im: "thorax", pv: pv(9, 7.5, 18, 15), z: 0},
      {n: "legB", par: "thorax", x: 1, y: 6, im: "leg", pv: pv(2, 0.5, 4, 10), z: -3}, {n: "legF", par: "thorax", x: 5, y: 6, im: "leg", pv: pv(2, 0.5, 4, 10), z: 3},
      {n: "wingB", par: "thorax", x: -2, y: -5, im: "wing", pv: pv(2, 12, 24, 13), z: -4, r0: -0.5}, {n: "wingF", par: "thorax", x: 1, y: -6, im: "wing", pv: pv(2, 12, 24, 13), z: 4, r0: -0.1},
      {n: "abd1", par: "thorax", x: -6, y: 2, im: "abd1", pv: pv(13, 5.5, 14, 11), z: -1, fl: 0}, {n: "abd2", par: "abd1", x: -11, y: 0, im: "abd2", pv: pv(11, 4, 12, 8), z: -1}, {n: "tip", par: "abd2", x: -9.5, y: 0, im: "tip", pv: pv(10.5, 3.5, 11, 7), z: -1},
      {n: "head", par: "thorax", x: 9, y: -1, im: "head", pv: pv(3, 7, 13, 12), z: 2}, {n: "jaw", par: "head", x: 4, y: 5.5, im: "jaw", pv: pv(1, 1, 8, 6), z: 1}
    ],
    pose: function (i, p, X) {
      var c = X.c, t = X.t, fr = calm() ? 14 : 38;
      p.thorax.dy = sin(t * 3 + i.seed) * 1.5 - X.w * 1; p.thorax.r = X.w * 0.12 - X.fl * 0.4 + (c < 0 ? c * 0.25 : -c * 0.2);
      var fw = sin(t * fr + i.seed) * 0.55; p.wingF.r = fw; p.wingB.r = fw * 0.9 + 0.15; p.wingF.sy = 0.6 + abs(cos(t * fr * 0.5)) * 0.4; p.wingB.sy = p.wingF.sy;
      var cu = c < 0 ? c * 0.55 : 0.2 + c * 1.4, rest = 0.7 + sin(t * 2.2) * 0.1;
      p.abd1.r = rest + cu * 0.9; p.abd2.r = 0.25 + cu * 0.9; p.tip.r = 0.1 + cu * 0.6;
      p.head.r = c < 0 ? c * 0.3 : -c * 0.35 + sin(t * 1.5) * 0.04; p.jaw.r = (c > 0.1 ? 0.7 * c : 0.1 + sin(t * 3) * 0.05) + (c < 0 ? -c * 0.5 : 0);
      p.legF.r = sin(t * 3) * 0.2 + 0.2; p.legB.r = -sin(t * 3) * 0.2 + 0.1;
    },
    done: function (d) { d.map.tip.after = function (cx, i) { if (i.sk > 0 && !calm()) glowBlob(cx, -2, 0, 5 + 3 * sin(i.t * 30), "#b8ff3a", 0.8); }; }
  });
  function glowBlob(cx, x, y, r, c, a) { cx.save(); cx.globalCompositeOperation = "lighter"; cx.globalAlpha = a; var gr = cx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "#fff"); gr.addColorStop(0.35, c); gr.addColorStop(1, "rgba(0,0,0,0)"); cx.fillStyle = gr; cx.beginPath(); cx.arc(x, y, r, 0, TAU); cx.fill(); cx.restore(); }
  R2.glowBlob = glowBlob;
  // ---------- generic biped skeleton (pelvis > torso > head/arms, thigh > shin). S.dims[part] = [w, h, pivotX, pivotY]; S.J = joint offsets ----------
  function biped(kind, S) {
    var D = S.dims, J = S.J, parts = {}, k;
    ["torso", "head", "uarm", "farm", "thigh", "shin"].forEach(function (n) { if (S.parts[n]) parts[n] = [D[n][0], D[n][1], S.parts[n]]; });
    for (k in S.parts) if (!parts[k]) parts[k] = [S.xd[k][0], S.xd[k][1], S.parts[k]];
    function nd(n, par, im, off, z, extra) { var d = D[im]; var o = {n: n, par: par, x: off[0], y: off[1], im: im, pv: pv(d[2], d[3], d[0], d[1]), z: z}; if (extra) for (var q in extra) o[q] = extra[q]; return o; }
    var nodes = [{n: "pelvis", par: null, x: 0, y: J.hipY, z: 0}];
    nodes.push(nd("thighB", "pelvis", "thigh", [J.hip[0] - 1.5, J.hip[1]], -5), nd("shinB", "thighB", "shin", J.knee, 0));
    (S.back || []).forEach(function (b) { nodes.push(b); });
    nodes.push(nd("uarmB", "torso", "uarm", J.sh, -3), nd("farmB", "uarmB", "farm", J.elbow, 0));
    nodes.splice(nodes.length - 2, 0, nd("torso", "pelvis", "torso", [0, 0], 0));
    // order matters for parent lookup only through names, so reorder: torso must exist before kids (RIG.define resolves by name)
    nodes.push(nd("head", "torso", "head", J.head, 3));
    (S.mid || []).forEach(function (b) { nodes.push(b); });
    nodes.push(nd("thighF", "pelvis", "thigh", [J.hip[0] + 1.5, J.hip[1]], 4), nd("shinF", "thighF", "shin", J.knee, 0));
    nodes.push(nd("uarmF", "torso", "uarm", J.sh, 5), nd("farmF", "uarmF", "farm", J.elbow, 0));
    (S.front || []).forEach(function (b) { nodes.push(b); });
    return build(kind, {H: S.H, sz: S.sz, KU: S.KU, dmgNode: "torso", mz: S.mz, parts: parts, nodes: nodes, done: S.done, pose: function (i, p, X) {
      var c = X.c, w = X.w, ph = X.ph, s = sin(ph), G = S.gait || {};
      p.pelvis.dy = -abs(s) * (G.bob || 1.4) * w + (S.crouch ? S.crouch * X.br * 0.2 : 0) + X.br * 0.35; p.pelvis.dx = 0;
      p.torso.r = (G.lean || 0.1) * w + X.br * 0.015 - X.fl * 0.3; p.head.r = -p.torso.r * 0.6 + sin(X.t * 1.7 + i.seed) * 0.03;
      var sw = G.sw || 0.75;
      p.thighF.r = -s * sw * w - 0.08; p.shinF.r = (max(0, s) * 1.05 + 0.1) * w + 0.12; p.thighB.r = s * sw * w + 0.1; p.shinB.r = (max(0, -s) * 1.05 + 0.1) * w + 0.12;
      p.uarmF.r = s * (G.asw || 0.5) * w + 0.1 - 0.1; p.farmF.r = -0.35 - w * 0.1; p.uarmB.r = -s * (G.asw || 0.5) * w - 0.05; p.farmB.r = -0.25 - w * 0.1;
      if (S.pose) S.pose(i, p, X, c, G);
    }});
  }
  R2.biped = biped;
  function tube(g, x, y, w, l, c) { rr(g, x, y, w, l, w * 0.42, c, 0.8); }
  // ---- Raker: crimson armoured raider with two serrated rake blades (chop / rake) ----
  var PR = {red: "#9a3a30", dk: "#4a1c20", ink: "#241014", bone: "#e8d8b8", org: "#ff8a30", blade: "#d8dce4"};
  biped("sn_raker", {
    H: 56, sz: 24, KU: 5, mz: {n: "farmF", x: 0, y: 22, dir: 1.2},
    dims: {torso: [24, 22, 12, 20], head: [16, 15, 6, 13], uarm: [8, 12, 4, 2.5], farm: [10, 26, 5, 2.5], thigh: [10, 13, 5, 2.5], shin: [11, 15, 5.5, 2]},
    J: {hipY: -26, hip: [0, 0], knee: [0, 11], head: [1, -19], sh: [2, -17], elbow: [0, 10]},
    gait: {lean: 0.14, sw: 0.7, asw: 0.35},
    parts: {
      torso: function (g) { g.beginPath(); g.moveTo(5, 21); g.lineTo(3, 9); g.quadraticCurveTo(4, 1, 12, 0.8); g.quadraticCurveTo(20, 1, 21, 9); g.lineTo(19, 21); g.closePath(); fp(g, PR.dk, 1, 21); for (var k = 0; k < 3; k++) line(g, 7, 8 + k * 4, 17, 8 + k * 4, "rgba(255,138,48,.55)", 0.7); poly(g, [5, 20, 19, 20, 17, 16, 7, 16], PR.red, 0.7); rivet(g, 8, 18, 0.7); rivet(g, 16, 18, 0.7); spike(g, 5, 8, 3.3, 5, 1.4, PR.bone); spike(g, 6, 13, 3.0, 4, 1.2, PR.bone); },
      head: function (g) { g.beginPath(); g.moveTo(3, 13); g.lineTo(2, 6); g.quadraticCurveTo(6, 0.5, 11, 2); g.lineTo(15, 7); g.lineTo(14, 12); g.lineTo(8, 14); g.closePath(); fp(g, PR.red, 1, 14); spike(g, 3, 4, -2.6, 6, 1.3, PR.bone); spike(g, 5, 2.4, -2.1, 5.5, 1.1, PR.bone); poly(g, [8, 6, 15, 6.5, 15, 8.8, 8.5, 8.4], "#140a0a", 0.5); glow(g, 12.5, 7.6, 2.6, PR.org); poly(g, [11, 12, 14, 11, 13.5, 14.5], PR.bone, 0.5); },
      uarm: function (g) { tube(g, 1, 0.5, 6, 11, PR.dk); ell(g, 4, 1.8, 3.2, 2.6, PR.red); },
      farm: function (g) { tube(g, 1.5, 0.5, 7, 9, PR.red); rr(g, 2.5, 8.5, 5, 3.2, 1, PR.dk, 0.6); g.beginPath(); g.moveTo(3, 11); g.bezierCurveTo(1, 17, 3, 22, 9.5, 25.5); g.bezierCurveTo(7.5, 21, 7.5, 15, 7.5, 11); g.closePath(); fp(g, PR.blade, 11, 25, 0.8); for (var k = 0; k < 4; k++) poly(g, [7.5, 13 + k * 3, 9.8, 14.2 + k * 3, 7.5, 15.2 + k * 3], "#aab0bc", 0.4); line(g, 4, 12, 8.5, 24, "rgba(255,255,255,.6)", 0.4); },
      thigh: function (g) { tube(g, 1.5, 0.5, 7, 12, PR.dk); ell(g, 5, 2.4, 3.6, 2.8, PR.red); },
      shin: function (g) { tube(g, 2, 0.5, 6, 11, PR.red); poly(g, [1, 11, 9, 11, 11, 14.6, 6, 15, 1.5, 14.5], PR.dk, 0.7); spike(g, 10, 13.4, 0, 2.5, 1, PR.bone); },
      plate: function (g) { g.beginPath(); g.moveTo(1, 2); g.lineTo(15, 2); g.lineTo(13, 12); g.lineTo(3, 12); g.closePath(); fp(g, PR.red, 2, 12); line(g, 4, 5, 12, 5, "rgba(255,255,255,.35)", 0.6); glow(g, 8, 8, 1.6, PR.org); },
      pauld: function (g) { g.beginPath(); g.ellipse(7, 6, 6.5, 4.2, -0.2, Math.PI, TAU); g.lineTo(13, 8); g.lineTo(1, 8); g.closePath(); fp(g, PR.red, 1, 8); spike(g, 3, 2, -2.2, 5, 1.4, PR.bone); spike(g, 8, 1.6, -1.5, 5, 1.3, PR.bone); }
    },
    xd: {plate: [16, 14], pauld: [14, 9]},
    mid: [{n: "plate", par: "torso", x: -4, y: 4, im: "plate", pv: [0.1, 0.1], z: 4, sh: 0.55}],
    front: [{n: "pauld", par: "torso", x: 2, y: -18, im: "pauld", pv: [0.5, 0.8], z: 7, sh: 0.35}],
    pose: function (i, p, X, c) {
      if (X.atk) {
        var up = c < 0 ? -c * 2.4 : 0, ch = c > 0 ? c : 0;
        p.torso.r += c < 0 ? c * 0.35 : c * 0.4; p.uarmF.r = c < 0 ? 2.4 * c - 0.2 : -2.2 + ch * 3.0; p.farmF.r = c < 0 ? 0.3 * -c : -0.1 + ch * 0.5;
        p.uarmB.r = c < 0 ? 2.0 * c : -1.8 + ch * 2.5 - 0.4; p.farmB.r = 0.2; p.pelvis.dy += c < 0 ? -c * 2 : ch * 2; p.pelvis.dx = c > 0 ? c * 3 : c * 1.2; p.head.r += c * 0.3;
      }
    }
  });
  // ---- Blinkstalker: lanky violet stalker, crouch-and-pounce, blade fingers, flowing crest ribbons ----
  var PB = {pur: "#5a4a9c", dk: "#2c2456", ink: "#150f2c", lav: "#b49cff", bone: "#e6dcf4"};
  biped("sn_blink", {
    H: 58, sz: 24, KU: 5, mz: {n: "farmF", x: 0, y: 20, dir: 1.2},
    dims: {torso: [16, 22, 8, 21], head: [18, 13, 5, 11], uarm: [6, 14, 3, 2], farm: [8, 24, 4, 2], thigh: [8, 15, 4, 2.5], shin: [9, 16, 4.5, 2], rib: [16, 5, 1, 2.5]},
    J: {hipY: -29, hip: [0, 0], knee: [0, 13.5], head: [2, -19], sh: [1, -18], elbow: [0, 12.5]},
    gait: {lean: 0.2, sw: 0.85, asw: 0.6, bob: 2},
    parts: {
      torso: function (g) { g.beginPath(); g.moveTo(5, 21); g.quadraticCurveTo(3, 10, 5, 3); g.quadraticCurveTo(8, 0.5, 11, 3); g.quadraticCurveTo(14, 11, 11, 21); g.closePath(); fp(g, PB.pur, 1, 21); for (var k = 0; k < 4; k++) line(g, 6 + (k % 2), 6 + k * 3.3, 11, 6.5 + k * 3.3, "rgba(180,156,255,.6)", 0.6); glow(g, 8, 12, 2.2, PB.lav); spike(g, 5, 7, 3.3, 5, 1.2, PB.bone); spike(g, 5.5, 12, 3.2, 4.5, 1.1, PB.bone); spike(g, 6, 17, 3.1, 4, 1, PB.bone); },
      head: function (g) { g.beginPath(); g.moveTo(3, 10); g.quadraticCurveTo(2, 3, 8, 1.5); g.quadraticCurveTo(15, 2.5, 17.5, 8); g.lineTo(11, 11); g.closePath(); fp(g, PB.pur, 1, 11); poly(g, [8, 5, 15, 6.5, 8.5, 7.6], "#0a0618", 0.4); glow(g, 12, 6.2, 2.4, PB.lav); spike(g, 3, 4, -2.6, 8, 1.2, PB.bone); spike(g, 5.5, 2.4, -2.3, 8, 1, PB.bone); poly(g, [11, 10.5, 17, 8.6, 13, 12.4], PB.bone, 0.4); },
      uarm: function (g) { tube(g, 0.8, 0.5, 4.4, 13, PB.dk); rivet(g, 3, 2, 0.6); },
      farm: function (g) { tube(g, 1.3, 0.5, 4.6, 12, PB.pur); ell(g, 3.8, 12, 2.4, 2, PB.dk); for (var k = 0; k < 3; k++) { var x0 = 2 + k * 1.8; g.beginPath(); g.moveTo(x0, 13); g.quadraticCurveTo(x0 + 1.6 + k * 0.5, 19, x0 + 3 - k * 0.2, 23.5 - k * 1.2); g.quadraticCurveTo(x0 + 1.4, 18, x0 + 1.4, 13); g.closePath(); fp(g, PB.bone, 13, 23, 0.6); } },
      thigh: function (g) { tube(g, 1, 0.5, 6, 14, PB.dk); ell(g, 4, 2.6, 3.2, 2.6, PB.pur); },
      shin: function (g) { tube(g, 1.6, 0.5, 5.2, 13, PB.pur); poly(g, [1.5, 13, 7.6, 13, 9, 15.4, 5.6, 15.6, 2.6, 15.2], PB.dk, 0.6); spike(g, 8.6, 14.6, 0, 3, 0.9, PB.bone); spike(g, 3, 5, 3.2, 3.5, 1, PB.bone); },
      rib: function (g) { g.beginPath(); g.moveTo(1, 2.5); g.quadraticCurveTo(7, 0, 15.5, 3); g.quadraticCurveTo(7, 4.5, 1, 2.5); fp(g, PB.lav, 0, 5, 0.5); }
    },
    xd: {rib: [16, 5]},
    back: [{n: "ribA", par: "pelvis", x: -1, y: -22, im: "rib", pv: [0.05, 0.5], z: -6, r0: 3.4}],
    mid: [{n: "ribB", par: "head", x: 4, y: 3, im: "rib", pv: [0.05, 0.5], z: -2, r0: 3.5}],
    pose: function (i, p, X, c) {
      p.ribA.r = sin(X.t * 5 + 1) * 0.25 - X.w * 0.4 + X.s1 * 0.8; p.ribB.r = sin(X.t * 6) * 0.3 - X.w * 0.35 + X.s2 * 0.8; p.ribB.sx = 1.2;
      if (X.atk) {
        var ch = c > 0 ? c : 0, cr = c < 0 ? -c : 0;
        p.pelvis.dy += cr * 4; p.pelvis.dx = -cr * 3 + ch * 9; p.thighF.r += -cr * 0.7 - ch * 0.8; p.shinF.r += cr * 1.1; p.thighB.r += cr * 0.5 - ch * 0.2; p.shinB.r += cr * 1.0 + ch * 0.4;
        p.torso.r += cr * -0.1 + ch * 0.45; p.head.r += ch * 0.2;
        p.uarmF.r = cr * 1.0 - ch * 1.7; p.farmF.r = cr * 0.8 - ch * 0.3; p.uarmB.r = cr * 1.3 - ch * 1.9; p.farmB.r = cr * 0.6 - ch * 0.2;
      }
    }
  });
  // ---- Shardling: dark crystal-backed creature, tail whip ----
  var PH = {ol: "#4a5a30", dk: "#1c2616", ink: "#0e140a", cry: "#a6ff5a", cd: "#5ac820", bone: "#d8cfa8", gl: "#c8ff7a"};
  function crystal(g, x, y, a, l, w, c) { poly(g, [x - sin(a) * w, y + cos(a) * w, x + cos(a) * l, y + sin(a) * l, x + sin(a) * w, y - cos(a) * w], c, 0.7); line(g, x, y, x + cos(a) * l * 0.8, y + sin(a) * l * 0.8, "rgba(255,255,255,.55)", 0.5); }
  biped("sn_shard", {
    H: 58, sz: 26, KU: 5, mz: {n: "tail3", x: 11, y: 0, dir: 0},
    dims: {torso: [24, 22, 12, 21], head: [17, 15, 6, 13], uarm: [9, 12, 4.5, 2.5], farm: [10, 18, 5, 2.5], thigh: [10, 13, 5, 2.5], shin: [11, 15, 5, 2], tail: [14, 8, 1.5, 4], club: [20, 16, 2, 8], bak: [22, 22, 14, 18]},
    J: {hipY: -26, hip: [0, 0], knee: [0, 11], head: [2, -19], sh: [2, -17], elbow: [0, 10]},
    gait: {lean: 0.16, sw: 0.65, asw: 0.4},
    parts: {
      torso: function (g) { g.beginPath(); g.moveTo(4, 21); g.lineTo(3, 9); g.quadraticCurveTo(5, 1, 12, 1); g.quadraticCurveTo(20, 1.5, 21, 10); g.lineTo(19, 21); g.closePath(); fp(g, PH.ol, 1, 21); poly(g, [8, 5, 16, 5, 15, 13, 9, 13], PH.dk, 0.6); glow(g, 12, 9, 3.2, PH.cry); crystal(g, 12, 6, -1.57, 4.2, 1.6, PH.cry); for (var k = 0; k < 3; k++) crystal(g, 5 + k * 0.4, 8 + k * 4, 3.3 + k * 0.1, 5, 1.3, PH.cd); },
      head: function (g) { g.beginPath(); g.moveTo(3, 13); g.lineTo(2, 7); g.quadraticCurveTo(6, 1, 11, 3); g.lineTo(16, 8); g.lineTo(14, 13); g.closePath(); fp(g, PH.ol, 1, 13); crystal(g, 5, 3.5, -2.2, 8, 1.8, PH.cry); crystal(g, 8, 2.5, -1.7, 7, 1.5, PH.cd); eye(g, 11.5, 7.5, 2, PH.gl); poly(g, [10, 12, 15, 11, 14, 14.5], PH.bone, 0.5); },
      uarm: function (g) { tube(g, 1, 0.5, 7, 11, PH.dk); ell(g, 4.5, 2, 3.4, 2.8, PH.ol); crystal(g, 5, 2, -1.2, 4, 1.4, PH.cd); },
      farm: function (g) { tube(g, 1.5, 0.5, 7, 11, PH.ol); ell(g, 5, 11.5, 3.6, 3.2, PH.dk); for (var k = 0; k < 3; k++) { var x0 = 2.5 + k * 2.4; g.beginPath(); g.moveTo(x0, 13); g.quadraticCurveTo(x0 + 2, 17, x0 + 2.4, 17.8); g.quadraticCurveTo(x0 + 0.8, 15.4, x0 + 0.2, 13); fp(g, PH.bone, 13, 18, 0.5); } },
      thigh: function (g) { tube(g, 1.5, 0.5, 7, 12, PH.dk); ell(g, 5, 2.6, 3.6, 2.8, PH.ol); },
      shin: function (g) { tube(g, 2, 0.5, 7, 11, PH.ol); poly(g, [1, 11, 9, 11, 11, 14.6, 6, 15, 1.5, 14.5], PH.dk, 0.7); spike(g, 10, 13.4, 0, 2.5, 1, PH.bone); crystal(g, 4, 5, 3.2, 3.5, 1.1, PH.cd); },
      tail: function (g) { g.beginPath(); g.moveTo(1, 1); g.quadraticCurveTo(7, 0, 13.8, 2.2); g.lineTo(13.8, 5.8); g.quadraticCurveTo(7, 8, 1, 7); g.closePath(); fp(g, PH.ol, 0, 8, 0.7); crystal(g, 7, 1, -1.7, 3, 1, PH.cd); },
      club: function (g) { g.beginPath(); g.moveTo(1, 5); g.quadraticCurveTo(8, 2, 12, 5); g.quadraticCurveTo(8, 12, 1, 11); g.closePath(); fp(g, PH.dk, 2, 12, 0.7); crystal(g, 9, 8, 0, 11, 3.2, PH.cry); crystal(g, 8, 5, -0.9, 7.5, 2.2, PH.cd); crystal(g, 8, 11, 0.9, 7.5, 2.2, PH.cd); glow(g, 10, 8, 2.4, PH.gl); },
      bak: function (g) { crystal(g, 3, 20, -1.75, 18, 3.4, PH.cd); crystal(g, 7, 19, -1.35, 20, 3.8, PH.cry); crystal(g, 11, 19, -1.0, 15, 3, PH.cd); }
    },
    xd: {tail: [14, 8], club: [20, 16], bak: [22, 22]},
    back: [{n: "tail1", par: "pelvis", x: -3, y: -3, im: "tail", pv: [0.05, 0.5], z: -4, r0: 3.5, fl: 0}, {n: "tail2", par: "tail1", x: 13, y: 0, im: "tail", pv: [0.05, 0.5], z: -4, r0: 0}, {n: "tail3", par: "tail2", x: 13, y: 0, im: "club", pv: [0.1, 0.5], z: -4}],
    mid: [{n: "bak", par: "torso", x: -2, y: -4, im: "bak", pv: [0.64, 0.82], z: -5, sh: 0.6}],
    pose: function (i, p, X, c) {
      // tails extend toward -x via r0 ~ PI (mirrored); positive r rotates clockwise => tail tip goes up when r is negative here
      p.tail1.r = sin(X.t * 2.4 + i.seed) * 0.12 + X.s1 * 0.6 - X.w * 0.2; p.tail2.r = sin(X.t * 2.4 + 0.8 + i.seed) * 0.2 + X.s2 * 0.6; p.tail3.r = sin(X.t * 2.4 + 1.6) * 0.25 + X.s3 * 0.6;
      if (X.atk) { var cw = c < 0 ? c : c * 0.0, ch = c > 0 ? c : 0;
        p.tail1.r += c < 0 ? c * 0.9 : -ch * 1.1 + 0.2; p.tail2.r += c < 0 ? c * 0.8 : -ch * 1.3; p.tail3.r += c < 0 ? c * 0.7 : -ch * 1.1;
        p.torso.r += c < 0 ? c * 0.3 : c * 0.35; p.uarmF.r = c < 0 ? c * 1.3 : -1.3 * c; p.farmF.r = -0.5 * abs(c); p.uarmB.r = c * -0.8; p.pelvis.dx = c * 2; }
    }
  });
  // ---- Bastion: heavy armoured brute with a tower shield (sheds plates) and a slam hammer ----
  var PM = {st: "#4a505c", dk: "#23272f", ink: "#12141a", lt: "#7a8394", org: "#ff8a2a", od: "#b04a10"};
  biped("sn_bastion", {
    H: 66, sz: 32, KU: 5, mz: {n: "hammer", x: 0, y: 28, dir: 1.57},
    dims: {torso: [32, 28, 16, 26], head: [16, 13, 6, 11], uarm: [13, 14, 6.5, 3], farm: [13, 14, 6.5, 3], thigh: [13, 14, 6.5, 3], shin: [14, 16, 6.5, 2.5], hammer: [20, 34, 10, 6], shield: [22, 38, 5, 8], plateS: [14, 16]},
    J: {hipY: -28, hip: [0, 0], knee: [0, 12], head: [2, -23], sh: [3, -21], elbow: [0, 12]},
    gait: {lean: 0.08, sw: 0.5, asw: 0.3, bob: 1},
    parts: {
      torso: function (g) { g.beginPath(); g.moveTo(4, 27); g.lineTo(2, 10); g.quadraticCurveTo(5, 1, 16, 1); g.quadraticCurveTo(27, 1, 30, 10); g.lineTo(28, 27); g.closePath(); fp(g, PM.st, 1, 27); poly(g, [8, 15, 24, 15, 22, 26, 10, 26], PM.dk, 0.7); glow(g, 16, 8, 3.2, PM.org); line(g, 8, 20, 24, 20, "rgba(255,138,42,.5)", 0.8); rivet(g, 6, 9, 0.9); rivet(g, 26, 9, 0.9); rivet(g, 8, 24, 0.8); rivet(g, 24, 24, 0.8); },
      head: function (g) { rr(g, 2, 1.5, 12, 10.5, 3, PM.st, 0.9); poly(g, [3, 5.2, 14, 5.2, 14, 7.8, 3, 7.8], "#07080b", 0.4); glow(g, 11, 6.5, 2.4, PM.org); line(g, 8, 1.5, 8, 5, "rgba(255,255,255,.3)", 0.6); },
      uarm: function (g) { tube(g, 1, 0.5, 11, 13, PM.dk); ell(g, 6.5, 2.6, 5, 3.6, PM.lt); rivet(g, 6.5, 2.6, 1); },
      farm: function (g) { tube(g, 1.5, 0.5, 10, 11, PM.st); rr(g, 1.5, 9, 10, 4.6, 1.5, PM.dk, 0.8); line(g, 2, 11, 11, 11, "rgba(255,138,42,.6)", 0.6); },
      thigh: function (g) { tube(g, 1, 0.5, 11, 13, PM.dk); ell(g, 6.5, 2.8, 5, 3.6, PM.st); },
      shin: function (g) { tube(g, 1.8, 0.5, 9.6, 12, PM.st); poly(g, [0.5, 12, 13, 12, 14, 15.6, 7, 16, 1, 15.6], PM.dk, 0.8); rivet(g, 6.5, 6, 0.9); line(g, 3, 9, 10, 9, "rgba(255,138,42,.5)", 0.6); },
      hammer: function (g) { rr(g, 8.6, 0, 2.8, 22, 1, "#6a4a2a", 0.7); rr(g, 1.5, 20, 17, 12, 2.4, PM.dk, 0.9); rr(g, 3, 21.5, 14, 4.5, 1.5, PM.lt, 0.6); glow(g, 10, 28, 3, PM.org); rivet(g, 4, 28, 0.8); rivet(g, 16, 28, 0.8); },
      shield: function (g) { g.beginPath(); g.moveTo(2, 4); g.quadraticCurveTo(11, 0.5, 20, 4); g.lineTo(18.5, 28); g.quadraticCurveTo(11, 37.5, 3.5, 28); g.closePath(); fp(g, PM.st, 1, 36, 1); g.beginPath(); g.moveTo(5, 8); g.lineTo(17, 8); g.lineTo(16, 26); g.quadraticCurveTo(11, 32, 6, 26); g.closePath(); fp(g, PM.dk, 8, 30, 0.7); glow(g, 11, 17, 3.6, PM.org); line(g, 11, 8, 11, 30, "rgba(255,138,42,.55)", 0.8); rivet(g, 4.5, 6, 0.9); rivet(g, 18, 6, 0.9); },
      plateS: function (g) { poly(g, [1, 2, 13, 1, 12, 15, 2, 14], PM.lt, 0.8); rivet(g, 4, 4, 0.7); }
    },
    xd: {hammer: [20, 34], shield: [22, 38], plateS: [14, 16]},
    mid: [{n: "plateS", par: "torso", x: 4, y: -12, im: "plateS", pv: [0.5, 0.5], z: 4, sh: 0.5}],
    front: [{n: "hammer", par: "farmF", x: 0, y: 11, im: "hammer", pv: [0.5, 0.18], z: 1, r0: -0.2}, {n: "shield", par: "farmB", x: 1, y: 9, im: "shield", pv: [0.5, 0.3], z: 9, sh: 0.7, r0: 0}],
    pose: function (i, p, X, c) {
      p.farmB.r = -0.9; p.uarmB.r = -0.1 + sin(X.ph) * 0.1 * X.w; p.shield.r = 0.5 + X.br * 0.02 + (c < 0 ? c * 0.3 : 0); p.uarmF.r = -0.3; p.farmF.r = -1.1; p.hammer.r = -0.55;
      if (X.atk) { var ch = c > 0 ? c : 0, cr = c < 0 ? -c : 0;
        p.pelvis.dy += cr * 2.5 - ch * 1; p.torso.r += -cr * 0.2 + ch * 0.35; p.uarmF.r = -cr * 2.7 - ch * -0.2 + ch * 2.6 * 0; p.uarmF.r = c < 0 ? -0.3 + 2.4 * c : -2.7 + ch * 3.1; p.farmF.r = c < 0 ? -1.1 - 0.0 * c : -1.1 + ch * 1.1; p.hammer.r = c < 0 ? -0.55 + c * 0.9 : -1.45 + ch * 1.5; p.uarmB.r += -cr * 0.5 + ch * 0.4; p.head.r += ch * 0.2; p.pelvis.dx = ch * 3; }
    }
  });
  // ---- Brood Tank: armoured beetle-tank, six legs, Spore Lobber sac on its back (acid lob) ----
  var PK = {sh: "#8a5a30", dk: "#3e2612", lt: "#c08850", cop: "#d8803a", org: "#ff9a30", bone: "#e8d8b0", ac: "#b8ff3a"};
  build("sn_atank", {
    H: 42, sz: 28, KU: 5, dmgNode: "shell", mz: {n: "sac", x: 0, y: -13, dir: -1.2},
    parts: {
      shell: [42, 24, function (g) { g.beginPath(); g.moveTo(2, 20); g.quadraticCurveTo(1, 6, 12, 3); g.quadraticCurveTo(24, 0.5, 34, 5); g.quadraticCurveTo(41, 10, 40, 20); g.closePath(); fp(g, PK.sh, 1, 22, 1); for (var k = 0; k < 4; k++) line(g, 9 + k * 7, 4 + k * 0.6, 8 + k * 7, 21, "rgba(40,20,8,.65)", 0.9); poly(g, [3, 19, 39, 19, 38, 22, 4, 22], PK.dk, 0.7); glow(g, 4, 14, 2.6, PK.org); rivet(g, 15, 9, 0.9); rivet(g, 29, 9, 0.9); }],
      snout: [22, 18, function (g) { g.beginPath(); g.moveTo(1, 3); g.quadraticCurveTo(10, 0.5, 14, 4); g.lineTo(21, 9); g.lineTo(14, 14); g.quadraticCurveTo(8, 17.5, 1, 15); g.closePath(); fp(g, PK.sh, 1, 16, 1); poly(g, [12, 8, 21.5, 9, 12, 10.6], PK.cop, 0.6); for (var k = 0; k < 3; k++) line(g, 13 + k * 2, 6.6 + k * 0.3, 14 + k * 2, 11.4 - k * 0.3, "rgba(60,30,10,.7)", 0.5); eye(g, 8, 6.5, 2.4, PK.ac); spike(g, 6, 3, -1.8, 5, 1.2, PK.bone); poly(g, [12, 13, 18, 11.4, 15, 15.6], PK.bone, 0.5); }],
      leg: [6, 14, function (g) { tube(g, 1.2, 0.5, 3.6, 8, PK.dk); g.beginPath(); g.moveTo(2, 7.4); g.quadraticCurveTo(5.5, 12, 3.6, 13.8); g.lineTo(2.4, 13.8); g.quadraticCurveTo(0.6, 11, 1, 7.4); fp(g, PK.bone, 7, 14, 0.6); }],
      sac: [18, 18, function (g) { g.beginPath(); g.ellipse(9, 9.5, 7.5, 7.5, 0, 0, TAU); fp(g, "#4c7a1a", 2, 17, 1); glow(g, 9, 9.5, 6, PK.ac); poly(g, [6, 2.6, 12, 2.6, 11, 0.4, 7, 0.4], PK.dk, 0.6); g.fillStyle = "rgba(255,255,255,.4)"; g.beginPath(); g.ellipse(6.5, 6, 2, 1.2, -0.6, 0, TAU); g.fill(); }],
      armor: [14, 9, function (g) { poly(g, [1, 6, 4, 1, 12, 1.4, 13, 7, 7, 8.4], PK.lt, 0.8); rivet(g, 5, 4, 0.7); rivet(g, 10, 4.4, 0.7); }],
      armor2: [12, 8, function (g) { poly(g, [1, 6, 3, 1, 10, 1.4, 11, 6, 6, 7.4], PK.cop, 0.8); rivet(g, 6, 4, 0.7); }]
    },
    nodes: [
      {n: "root", par: null, x: 0, y: -17, z: 0},
      {n: "lgB1", par: "root", x: -13, y: 8, im: "leg", pv: pv(3, 0.5, 6, 14), z: -4}, {n: "lgB2", par: "root", x: 0, y: 8, im: "leg", pv: pv(3, 0.5, 6, 14), z: -4}, {n: "lgB3", par: "root", x: 12, y: 8, im: "leg", pv: pv(3, 0.5, 6, 14), z: -4},
      {n: "shell", par: "root", x: 0, y: 0, im: "shell", pv: pv(21, 12, 42, 24), z: 0},
      {n: "armor", par: "shell", x: 2, y: -10, im: "armor", pv: [0.5, 0.5], z: 2, sh: 0.4}, {n: "armor2", par: "shell", x: -8, y: -9, im: "armor2", pv: [0.5, 0.5], z: 2, sh: 0.65},
      {n: "sac", par: "shell", x: -8, y: -11, im: "sac", pv: pv(9, 13, 18, 18), z: 1},
      {n: "snout", par: "shell", x: 19, y: -1, im: "snout", pv: pv(2, 9, 22, 18), z: 3},
      {n: "lgF1", par: "root", x: -13, y: 8, im: "leg", pv: pv(3, 0.5, 6, 14), z: 5}, {n: "lgF2", par: "root", x: 0, y: 8, im: "leg", pv: pv(3, 0.5, 6, 14), z: 5}, {n: "lgF3", par: "root", x: 12, y: 8, im: "leg", pv: pv(3, 0.5, 6, 14), z: 5}
    ],
    pose: function (i, p, X) {
      var s = sin(X.ph), c = X.c, k, ch = c > 0 ? c : 0, cr = c < 0 ? -c : 0;
      p.root.dy = -abs(s) * 1.2 * X.w + X.br * 0.3 + cr * 2; p.root.r = -ch * 0.12 + cr * 0.06;
      var ids = ["1", "2", "3"], ph = [0, 2.1, 4.2];
      for (k = 0; k < 3; k++) { p["lgF" + ids[k]].r = sin(X.ph + ph[k]) * 0.7 * X.w + 0.05; p["lgB" + ids[k]].r = -sin(X.ph + ph[k]) * 0.7 * X.w - 0.1; }
      p.shell.r = X.fl * -0.2 + sin(X.t * 2.4) * 0.01; p.snout.r = sin(X.t * 1.8 + i.seed) * 0.05 + (c > 0 ? ch * 0.3 : cr * -0.15) + X.s1 * 0.6;
      p.sac.sx = 1 + cr * 0.4 - ch * 0.35 + sin(X.t * 3) * 0.03; p.sac.sy = 1 + cr * 0.55 - ch * 0.4 + sin(X.t * 3) * 0.03;
    }
  });
  // =====================================================================================================================================
  // CREW TROOP RIGS (straw / copper / wood palette): Pitchfork Slinger, Hay Bruiser, Bale Roller, Sparrow Drone
  K.tine = {spd: 520, len: 18, w: 2.6, c: "#e8d8a0", c2: "#fff", glow: "#ffe090"};
  var PF = {straw: "#e0b45a", sd: "#a87a28", wood: "#8a5a2a", wd: "#4a2c14", ink: "#2a1a10", org: "#f08a2a", cop: "#c8682a", met: "#a8b4c4", blue: "#4a78b8", red: "#c0382a"};
  biped("sn_slinger", {
    H: 54, sz: 15, KU: 5, mz: {n: "fork", x: 0, y: -27, dir: -1.57},
    dims: {torso: [16, 18, 8, 17], head: [20, 17, 10, 14], uarm: [6, 11, 3, 2], farm: [7, 10, 3.5, 2], thigh: [7, 11, 3.5, 2], shin: [8, 12, 3.5, 1.5], fork: [11, 34, 5.5, 26]},
    J: {hipY: -22, hip: [0, 0], knee: [0, 10], head: [0, -16], sh: [1, -15], elbow: [0, 9.5]},
    gait: {lean: 0.08, sw: 0.7, asw: 0.5},
    parts: {
      torso: function (g) { g.beginPath(); g.moveTo(3, 17); g.lineTo(2, 6); g.quadraticCurveTo(8, 0.5, 14, 6); g.lineTo(13, 17); g.closePath(); fp(g, PF.blue, 1, 17, 0.9); poly(g, [3, 15, 13, 15, 13, 17, 3, 17], PF.wd, 0.6); line(g, 8, 3, 8, 15, "rgba(0,0,0,.35)", 0.6); rr(g, 5.5, 8, 5, 4, 0.8, PF.straw, 0.5); line(g, 3, 6, 1, 8, PF.straw, 1); },
      head: function (g) { ell(g, 10, 10, 5.4, 5.2, PF.straw); g.fillStyle = "#1a1008"; g.beginPath(); g.arc(12, 9, 1.1, 0, TAU); g.arc(8.4, 9, 1.1, 0, TAU); g.fill(); line(g, 9, 12.4, 12.6, 12.4, "#1a1008", 0.7); g.beginPath(); g.ellipse(10, 6, 9.6, 2.4, -0.05, 0, TAU); fp(g, PF.sd, 4, 8, 0.9); g.beginPath(); g.moveTo(5.6, 6); g.quadraticCurveTo(10, -1, 14.6, 6); g.closePath(); fp(g, PF.straw, 0, 6, 0.9); line(g, 6, 5, 14, 5, PF.red, 1.2); },
      uarm: function (g) { tube(g, 0.8, 0.5, 4.4, 10, PF.blue); },
      farm: function (g) { tube(g, 1, 0.5, 4.8, 8, PF.straw); ell(g, 3.5, 9, 2.2, 2, "#c89a58"); },
      thigh: function (g) { tube(g, 1, 0.5, 5, 10.4, PF.wd); },
      shin: function (g) { tube(g, 1.2, 0.5, 4.6, 10, PF.wd); poly(g, [0.6, 10, 7, 10, 8, 12, 1, 12], PF.ink, 0.6); },
      fork: function (g) { rr(g, 4.6, 6, 1.8, 26, 0.7, PF.wood, 0.6); g.beginPath(); g.moveTo(1, 8); g.lineTo(1, 2); g.moveTo(5.5, 8); g.lineTo(5.5, 0); g.moveTo(10, 8); g.lineTo(10, 2); g.moveTo(1, 8); g.lineTo(10, 8); g.lineWidth = 1.5; g.strokeStyle = PF.met; g.stroke(); g.lineWidth = 0.5; g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(5.5, 6); g.lineTo(5.5, 1); g.stroke(); }
    },
    xd: {fork: [11, 34]},
    front: [{n: "fork", par: "farmF", x: 0, y: 8, im: "fork", pv: [0.5, 26 / 34], z: 8, r0: 0.9}],
    pose: function (i, p, X, c) {
      p.uarmF.r = -0.5 + sin(X.ph) * 0.2 * X.w; p.farmF.r = -0.9; p.fork.r = X.br * 0.04 + 0.1;
      if (X.atk) { var ch = c > 0 ? c : 0, cr = c < 0 ? -c : 0;
        p.torso.r += -cr * 0.25 + ch * 0.3; p.uarmF.r = -0.5 + cr * 1.2 - ch * 0.9; p.farmF.r = -0.9 + cr * 0.9 - ch * 0.3; p.fork.r = 0.1 + cr * 0.4 + ch * 0.5; p.pelvis.dx = -cr * 2 + ch * 3; p.head.r += cr * -0.15; p.uarmB.r = -0.4 - cr * 0.6 + ch * 0.5; }
    }
  });
  biped("sn_bruiser", {
    H: 60, sz: 22, KU: 5, mz: {n: "farmF", x: 0, y: 19, dir: 1.2},
    dims: {torso: [32, 26, 16, 24], head: [16, 14, 7, 12], uarm: [13, 14, 6.5, 3], farm: [16, 22, 8, 3], thigh: [12, 13, 6, 2.5], shin: [13, 14, 6.5, 2], pad: [16, 10]},
    J: {hipY: -25, hip: [0, 0], knee: [0, 11], head: [1, -22], sh: [4, -20], elbow: [0, 11]},
    gait: {lean: 0.1, sw: 0.5, asw: 0.35, bob: 1},
    parts: {
      torso: function (g) { g.beginPath(); g.moveTo(3, 25); g.lineTo(2, 9); g.quadraticCurveTo(6, 1, 16, 1); g.quadraticCurveTo(26, 1, 30, 9); g.lineTo(29, 25); g.closePath(); fp(g, PF.straw, 1, 25, 1); for (var k = 0; k < 9; k++) line(g, 4 + k * 3, 4 + (k % 3), 3 + k * 3 + ((k % 2) ? 2 : -2), 22, "rgba(120,80,20,.55)", 0.6); rr(g, 5, 17, 22, 5, 1.5, PF.wd, 0.8); rr(g, 12, 16.4, 8, 6.4, 1.2, PF.cop, 0.7); rivet(g, 16, 19.6, 1); },
      head: function (g) { rr(g, 2, 1, 12, 11, 2.5, PF.wood, 0.9); line(g, 2, 5, 14, 5, PF.wd, 0.8); g.fillStyle = "#1a0e06"; g.fillRect(4, 6, 8, 2.4); glow(g, 6, 7.2, 1.8, PF.org); glow(g, 10, 7.2, 1.8, PF.org); },
      uarm: function (g) { tube(g, 1, 0.5, 11, 13, PF.straw); ell(g, 6.5, 2.4, 5, 3.6, PF.cop); rivet(g, 6.5, 2.4, 1); },
      farm: function (g) { tube(g, 2, 0.5, 12, 11, PF.cop); rr(g, 0.8, 10, 14.4, 11, 3, PF.org, 0.9); rr(g, 2.4, 11, 11, 3.2, 1.2, "#ffb860", 0.5); for (var k = 0; k < 3; k++) line(g, 3.6 + k * 3.8, 15, 3.6 + k * 3.8, 20, "rgba(100,40,0,.6)", 0.7); },
      thigh: function (g) { tube(g, 1, 0.5, 10, 12, PF.wd); ell(g, 6, 2.6, 4.4, 3, PF.straw); },
      shin: function (g) { tube(g, 1.6, 0.5, 9, 11, PF.straw); poly(g, [0.5, 11, 12, 11, 13, 14, 6, 14, 1, 14], PF.wd, 0.8); line(g, 3, 6, 10, 6, "rgba(120,80,20,.6)", 0.7); },
      pad: function (g) { poly(g, [1, 6, 3, 1, 13, 1, 15, 6, 8, 9], PF.cop, 0.8); rivet(g, 8, 4.4, 0.8); }
    },
    xd: {pad: [16, 10]},
    front: [{n: "pad", par: "torso", x: 4, y: -22, im: "pad", pv: [0.5, 0.5], z: 7, sh: 0.5}],
    pose: function (i, p, X, c) {
      if (X.atk) { var ch = c > 0 ? c : 0, cr = c < 0 ? -c : 0;
        p.pelvis.dy += cr * 2.5; p.torso.r += -cr * 0.2 + ch * 0.35; p.torso.sy = 1 - cr * 0.06 + ch * 0.06; p.uarmF.r = c < 0 ? 2.3 * c : -2.3 + ch * 2.8; p.farmF.r = c < 0 ? 0.6 * c : -0.6 + ch * 0.6; p.uarmB.r = c < 0 ? 1.8 * c : -1.8 + ch * 2.3; p.farmB.r = -0.4; p.pelvis.dx = ch * 4 - cr * 2; p.head.r += ch * 0.15; }
    }
  });
  // Bale Roller: barrel on two wheels with a lit bomb and a rolling-eye slit
  build("sn_roller", {
    H: 34, sz: 16, KU: 5, dmgNode: "barrel", mz: {n: "barrel", x: 0, y: 0, dir: 0},
    parts: {
      barrel: [30, 26, function (g) { g.beginPath(); g.ellipse(15, 13, 14, 12, 0, 0, TAU); fp(g, PF.cop, 1, 25, 1); for (var k = -1; k <= 1; k++) { g.strokeStyle = PF.wd; g.lineWidth = 1.6; g.beginPath(); g.ellipse(15, 13, 14, 12, 0, 0, 0); g.moveTo(15 + k * 7, 1.4 + abs(k) * 1.4); g.quadraticCurveTo(15 + k * 8.5, 13, 15 + k * 7, 24.6 - abs(k) * 1.4); g.stroke(); } rr(g, 8, 8.6, 14, 5, 1.5, "#120a06", 0.6); glow(g, 12, 11, 1.8, PF.org); glow(g, 18, 11, 1.8, PF.org); hi(g, function (g2) { g2.arc(15, 13, 11, 3.6, 4.8); }); }],
      wheel: [16, 16, function (g) { g.beginPath(); g.arc(8, 8, 7.4, 0, TAU); fp(g, PF.wd, 0, 16, 1); for (var k = 0; k < 6; k++) { var a = k * PI / 3; line(g, 8, 8, 8 + cos(a) * 6.4, 8 + sin(a) * 6.4, PF.straw, 1.3); } ell(g, 8, 8, 2.2, 2.2, PF.met); }],
      bomb: [12, 16, function (g) { g.beginPath(); g.arc(6, 10.5, 5.4, 0, TAU); fp(g, "#2a2a30", 5, 16, 0.9); g.fillStyle = "rgba(255,255,255,.3)"; g.beginPath(); g.ellipse(4.2, 8.4, 1.6, 1, -0.6, 0, TAU); g.fill(); rr(g, 4.6, 3.4, 2.8, 2.4, 0.6, PF.met, 0.6); line(g, 6, 3.6, 8, 1, PF.sd, 0.8); }],
      cap: [10, 4, function (g) { poly(g, [0.5, 3.5, 2, 0.5, 8, 0.5, 9.5, 3.5], PF.straw, 0.6); }]
    },
    nodes: [
      {n: "root", par: null, x: 0, y: -9, z: 0},
      {n: "wheelB", par: "root", x: -7, y: 3, im: "wheel", pv: [0.5, 0.5], z: -2}, {n: "barrel", par: "root", x: 0, y: -4, im: "barrel", pv: [0.5, 0.5], z: 0},
      {n: "bomb", par: "barrel", x: -2, y: -11, im: "bomb", pv: [0.5, 0.8], z: 1}, {n: "wheelF", par: "root", x: 7, y: 3, im: "wheel", pv: [0.5, 0.5], z: 3}
    ],
    pose: function (i, p, X) {
      var c = X.c, cr = c < 0 ? -c : 0, rot = i.ph * 1.6; p.wheelF.r = rot; p.wheelB.r = rot; p.root.dy = -abs(sin(i.ph * 2)) * 0.8 * X.w + X.br * 0.2; p.root.r = X.w * 0.06 - X.fl * 0.15;
      p.barrel.sx = 1 + cr * 0.12 - (c > 0 ? c * 0.18 : 0); p.barrel.sy = 1 - cr * 0.1 + (c > 0 ? c * 0.15 : 0); p.bomb.r = sin(X.t * 8) * 0.12 + (X.s1 * 0.5); p.bomb.sy = 1 + sin(X.t * 20) * 0.04;
    },
    done: function (d) { d.map.bomb.after = function (cx, i) { if (calm()) return; var f = 1 + sin(i.t * 31) * 0.4; glowBlob(cx, 2, -7.4, 3.2 * f, "#ffc040", 0.9); }; }
  });
  // Sparrow Drone: quad-rotor with a gun pod
  build("sn_drone", {
    H: 30, sz: 18, KU: 5, fly: true, dmgNode: "hull", mz: {n: "pod", x: 7, y: 2, dir: 0.2},
    parts: {
      hull: [26, 16, function (g) { g.beginPath(); g.ellipse(13, 8, 11.6, 6.6, 0, 0, TAU); fp(g, PF.straw, 1, 15, 1); rr(g, 14, 4.6, 8, 5, 2, "#10202a", 0.7); glow(g, 19, 7, 2.1, "#7aff5a"); line(g, 4, 8, 12, 8, PF.sd, 0.8); poly(g, [2, 9, 6, 11, 3, 13.4], PF.cop, 0.6); rivet(g, 9, 5, 0.7); }],
      arm: [16, 5, function (g) { rr(g, 0.5, 1.6, 15, 2.2, 1, PF.wd, 0.6); ell(g, 14, 2.6, 1.6, 1.6, PF.met); }],
      rotor: [20, 4, function (g) { g.beginPath(); g.ellipse(10, 2, 9.6, 1.1, 0, 0, TAU); g.fillStyle = "rgba(220,230,240,.55)"; g.fill(); g.strokeStyle = "rgba(40,50,60,.7)"; g.lineWidth = 0.5; g.stroke(); }],
      pod: [12, 8, function (g) { rr(g, 0.5, 1.4, 6, 5, 1.4, PF.dk0 || "#3a3a44", 0.7); rr(g, 5, 2.6, 6.4, 2.2, 0.8, PF.met, 0.5); glow(g, 10.5, 3.7, 1, "#ffd070"); }]
    },
    nodes: [
      {n: "hull", par: null, x: 0, y: -16, im: "hull", pv: [0.5, 0.5], z: 0},
      {n: "armB", par: "hull", x: -2, y: -4, im: "arm", pv: [0.04, 0.5], z: -3, r0: -0.4}, {n: "rotB", par: "armB", x: 14, y: 0, im: "rotor", pv: [0.5, 0.5], z: 0, r0: 0.4},
      {n: "pod", par: "hull", x: 6, y: 6, im: "pod", pv: [0.12, 0.45], z: 1},
      {n: "armF", par: "hull", x: 2, y: -4, im: "arm", pv: [0.04, 0.5], z: 4, r0: 0.35}, {n: "rotF", par: "armF", x: 14, y: 0, im: "rotor", pv: [0.5, 0.5], z: 0, r0: -0.35}
    ],
    pose: function (i, p, X) {
      var c = X.c, cr = c < 0 ? -c : 0, ch = c > 0 ? c : 0, f = calm() ? 12 : 34;
      p.hull.dy = sin(X.t * 2.4 * 2.4 + i.seed) * 1.8 - X.w * 1.5 + cr * 2; p.hull.r = X.w * 0.18 + cr * 0.3 - ch * 0.2 - X.fl * 0.4; p.hull.dx = ch * -2;
      p.rotF.sx = 0.35 + abs(sin(X.t * f + i.seed)) * 0.65; p.rotB.sx = 0.35 + abs(cos(X.t * f * 1.1)) * 0.65; p.rotF.sy = 1; p.armF.r = 0.35 + sin(X.t * 3) * 0.04; p.armB.r = -0.4 + sin(X.t * 3 + 1) * 0.04;
      p.pod.r = c < 0 ? c * 0.3 : -ch * 0.2;
    }
  });
  // ---------- HIVE HEART (core boss structure): pulsing organ, shell plates that peel with damage, whipping tendrils, crown spikes ----------
  build("sn_heart", {
    H: 62, sz: 40, KU: 4,
    parts: {
      body: [46, 46, function (g) { g.beginPath(); g.ellipse(23, 24, 20, 21, 0, 0, TAU); fp(g, PT.dk, 3, 45, 1.1); g.beginPath(); g.ellipse(23, 26, 14, 15, 0, 0, TAU); g.fillStyle = "#20103c"; g.fill(); for (var k = 0; k < 5; k++) { g.strokeStyle = "rgba(140,255,58," + (0.25 + k * 0.05) + ")"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(23, 8); g.quadraticCurveTo(10 + k * 6, 24, 23 + (k - 2) * 3, 42); g.stroke(); } for (k = 0; k < 6; k++) rivet(g, 23 + cos(k * 1.05 + 0.5) * 18, 24 + sin(k * 1.05 + 0.5) * 18, 1); }],
      core: [20, 28, function (g) { poly(g, [10, 1, 18, 9, 17, 22, 10, 27, 3, 22, 2, 9], "#46d82a", 0.9); line(g, 10, 1, 10, 27, "rgba(255,255,255,.5)", 0.6); line(g, 2, 9, 17, 22, "rgba(255,255,255,.28)", 0.5); line(g, 18, 9, 3, 22, "rgba(255,255,255,.28)", 0.5); glow(g, 10, 14, 11, PT.grn); }],
      plate: [18, 26, function (g) { g.beginPath(); g.moveTo(2, 25); g.bezierCurveTo(-1, 10, 6, 2, 16, 1); g.bezierCurveTo(17, 12, 14, 20, 9, 25); g.closePath(); fp(g, PT.pur, 1, 25, 1); line(g, 5, 20, 13, 6, "rgba(255,255,255,.28)", 0.6); line(g, 6, 22, 15, 9, "rgba(20,10,40,.6)", 0.6); rivet(g, 8, 14, 1); }],
      tend1: [8, 24, function (g) { g.beginPath(); g.moveTo(1, 1); g.bezierCurveTo(7, 7, 7, 17, 5, 23); g.lineTo(2.5, 23); g.bezierCurveTo(3, 15, 2, 7, 1, 1); g.closePath(); fp(g, PT.pur, 0, 23, 0.8); for (var k = 0; k < 3; k++) rivet(g, 4, 6 + k * 6, 0.6); }],
      tend2: [8, 22, function (g) { g.beginPath(); g.moveTo(2, 0); g.lineTo(6, 0); g.lineTo(5, 15); g.lineTo(2.5, 15); g.closePath(); fp(g, PT.dk, 0, 15, 0.8); poly(g, [2.5, 14, 5, 14, 6.5, 21, 3.8, 18, 1.5, 21], PT.bone, 0.6); }],
      spike: [8, 18, function (g) { poly(g, [0.5, 17, 4, 0.5, 7.5, 17], PT.bone, 0.7); line(g, 4, 3, 4, 14, "rgba(120,90,60,.5)", 0.5); }]
    },
    nodes: [
      {n: "body", par: null, x: 0, y: -24, im: "body", pv: pv(23, 24, 46, 46), z: 0},
      {n: "tA1", par: "body", x: -13, y: 16, im: "tend1", pv: pv(2, 1, 8, 24), z: -3, fl: 1}, {n: "tA2", par: "tA1", x: 0, y: 22, im: "tend2", pv: pv(4, 1, 8, 22), z: -3, fl: 1},
      {n: "tB1", par: "body", x: 13, y: 16, im: "tend1", pv: pv(2, 1, 8, 24), z: -3}, {n: "tB2", par: "tB1", x: 0, y: 22, im: "tend2", pv: pv(4, 1, 8, 22), z: -3},
      {n: "sp1", par: "body", x: -9, y: -15, im: "spike", pv: pv(4, 17, 8, 18), z: -1, r0: -0.4}, {n: "sp2", par: "body", x: 0, y: -19, im: "spike", pv: pv(4, 17, 8, 18), z: -1, sy: 1.2}, {n: "sp3", par: "body", x: 9, y: -15, im: "spike", pv: pv(4, 17, 8, 18), z: -1, r0: 0.4},
      {n: "core", par: "body", x: 0, y: 1, im: "core", pv: pv(10, 14, 20, 28), z: 1},
      {n: "pL", par: "body", x: -14, y: -3, im: "plate", pv: pv(14, 24, 18, 26), z: 2, fl: 1}, {n: "pR", par: "body", x: 14, y: -3, im: "plate", pv: pv(14, 24, 18, 26), z: 2, fl: 0, r0: 0.1}
    ],
    pose: function (i, p, X) {
      var t = X.t, bt = (t * 1.15 + i.seed) % 1, pu = Math.pow(sin(min(1, bt * 2.6) * PI), 2) * (bt < 0.4 ? 1 : 0) + (bt > 0.45 && bt < 0.7 ? 0.35 * sin((bt - 0.45) / 0.25 * PI) : 0), dm = X.dm, c = X.c, hp = X.hit;
      p.body.sx = p.body.sy = 1 + pu * 0.055 + (hp > 0 ? hp * 0.03 : 0) + (c > 0 ? c * 0.05 : 0); p.body.dy = -pu * 0.6;
      p.core.sx = p.core.sy = 0.9 + pu * 0.28 + dm * 0.1 + (calm() ? 0 : sin(t * 16) * dm * 0.04);
      var k = 0.35 + dm * 0.5, sw = c < 0 ? c * 0.9 : c * 1.4;
      p.tA1.r = 0.6 + sin(t * 1.7 + 1) * 0.16 * k - sw * 0.7; p.tA2.r = 0.3 - sin(t * 2.3 + 0.5) * 0.3 * k - sw * 0.8;
      p.tB1.r = -0.6 - sin(t * 1.5) * 0.16 * k + sw * 0.7; p.tB2.r = -0.3 + sin(t * 2.1) * 0.3 * k + sw * 0.8;
      var op = dm * 0.7 + pu * 0.05; p.pL.r = -op; p.pR.r = op; p.pL.dx = -op * 4; p.pR.dx = op * 4;
      p.sp1.r = -0.4 - pu * 0.06 - dm * 0.1; p.sp3.r = 0.4 + pu * 0.06 + dm * 0.1; p.sp2.sy = 1.2 + pu * 0.1;
    },
    done: function (d) { d.map.core.after = function (cx, i) { if (!calm()) glowBlob(cx, 0, 0, 12 + 4 * sin(i.t * 4), "#8cff3a", 0.38 + i.dmg * 0.25); else glowBlob(cx, 0, 0, 12, "#8cff3a", 0.4); }; }
  });
  // P0 attack-state entry point: anticipation -> strike -> recover for part rigs; chibi/hero rigs get their punch pose
  RIG.attack = function (i, dur) { if (!i) return; if (i.sd !== undefined || i.sk !== undefined) RIG.strike(i, dur); if (RIG.punch) RIG.punch(i); };
  //@@END
})();
