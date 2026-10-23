"use strict";
// ---- Renderer + input for the base canvas (build mode) and raid canvas (scout / deploy / fight) ----
(function () {
  var C = BB.CC, V = BB.CCV = {}, N = C.GRID, T = C.T, GW = N * T;
  var cv, cx, dpr = 1, cssW = 360, cssH = 700, sc = 1, Hl = 700, gx = 0, gy = 0, IMG = {}, loaded = 0, ready = false, SCACHE = {}, ground = null;
  var ART = ["homestead","workshop","trainbarn","muster","crewhall","tinker","t_blaster","t_sniper","t_lobber","t_flak","t_trap","t_post","a_core","a_blaster","a_sniper","a_lobber","a_flak","a_harv","a_vaultC","a_vaultS","a_wall","a_bunker",
    "u_bruiser","u_slinger","u_roller","u_drone","u_guard","barn","silo","silo_dmg","corn","tree","pine","flowers","pumpkins","hay_round","hay_stack","snatcher","stinger","tank","bg_front","scx","fx_ring","fx_spark","fx_stars","i_coin","i_scrap","cow","sheep","pig","chicken","cloud1","cloud2","cloud3","u_chick","u_sow","u_hound","u_wrench","u_mule","u_spinner","u_badger","u_kestrel","al_raker","al_blink","al_bastion","al_shard","t_fan","t_storm","t_coil","t_crane","t_driver","t_shroud","a_fan","a_storm","a_coil","a_crane","a_driver","a_shroud","tp_snare","tp_mine","tp_cache","tp_stake"];
  V.mode = "base"; V.parts = []; V.floats = []; V.projs = []; V.rings = []; V.rubble = []; V.shake = 0; V.t = 0;
  V.offs = {}; V.lift = null; V.sel = null; V.ghost = null; V.paint = null; V.sim = null; V.base = null; V.theme = "p"; V.deploy = null; V.showDeploy = false; V.speed = 1; V.paused = false;
  V.cb = {}; V.fx = []; V.showRanges = false; V.showHeat = false; V.analysis = null;
  V.load = function () {
    if (loaded) return; loaded = 1; var done = 0;
    ART.forEach(function (n) { var im = new Image(); im.onload = im.onerror = function () { if (++done >= ART.length) { ready = true; SCACHE = {}; V.resize(); } }; im.src = "assets/" + n + ".webp"; IMG[n] = im; });
  };
  V.ready = function () { return ready; };
  V.init = function (canvas) {
    cv = canvas; cx = cv.getContext("2d"); V.load(); window.addEventListener("resize", V.resize); V.resize();
    if (BB.TCH) BB.TCH.attach(cv, {down: down, move: move, up: up}); else { cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); }
    cv.style.touchAction = "none";
  };
  V.resize = function () {
    if (!cv) return; var r = cv.getBoundingClientRect(); if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5); cssW = r.width; cssH = r.height; sc = cssW / 360; Hl = cssH / sc;
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); gx = 0; gy = Math.round((Hl - GW) / 2 - 18); SCACHE = {}; buildGround();
  };
  function img(n) { var i = IMG[n]; return i && i.complete && i.naturalWidth ? i : null; }
  var SCN = 0;
  function cached(n, w, h) {
    var zq = uc.z * ((BB.FX && BB.FX.cam && BB.FX.cam.z > 1.002) ? BB.FX.cam.z : 1), zb = zq > 2.2 ? 2.5 : zq > 1.7 ? 2 : zq > 1.25 ? 1.5 : 1; // v0.10: zoom-bucketed sprite cache keeps close-ups crisp
    var k = n + "|" + w + "|" + h + "|" + zb, c = SCACHE[k]; if (c) return c; var i = img(n); if (!i) return null; if (++SCN > 360) { SCACHE = {}; SCN = 0; }
    var pw = Math.min(768, Math.max(2, Math.round(w * sc * dpr * zb))), ph = Math.min(768, Math.max(2, Math.round(h * sc * dpr * zb))); c = document.createElement("canvas"); c.width = pw; c.height = ph; var g = c.getContext("2d"); g.imageSmoothingQuality = "high";
    var s = i; // step-down for quality
    if (i.naturalWidth > pw * 2) { var m = document.createElement("canvas"); m.width = Math.round(i.naturalWidth / 2); m.height = Math.round(i.naturalHeight / 2); m.getContext("2d").drawImage(i, 0, 0, m.width, m.height); s = m; }
    g.drawImage(s, 0, 0, pw, ph); SCACHE[k] = c; return c;
  }
  // draw sprite: bottom-centre anchored. w in logical px; maxH caps height
  function spr(n, x, by, w, maxH, alpha, flip) {
    var i = img(n); if (!i) return false; var asp = i.naturalHeight / i.naturalWidth, h = w * asp; if (maxH && h > maxH) { h = maxH; w = h / asp; }
    w = Math.round(w * 2) / 2; h = Math.round(h * 2) / 2; var c = cached(n, w, h); if (!c) return false;
    if (alpha !== undefined && alpha < 1) cx.globalAlpha = alpha;
    if (flip) { cx.save(); cx.translate(x, 0); cx.scale(-1, 1); cx.drawImage(c, -w / 2, by - h, w, h); cx.restore(); } else cx.drawImage(c, x - w / 2, by - h, w, h);
    cx.globalAlpha = 1; return true;
  }
  // ---- v0.7 user camera: pan / pinch zoom / focus tween / tilt parallax, composed with the cinematic FX camera ----
  var uc = V.uc = {z: 1, x: 0, y: 0, vx: 0, vy: 0, anim: null}; V.tilt = {x: 0, y: 0};
  function mat(shx, shy) {
    var FXo = BB.FX, cam = FXo && FXo.cam, cz = cam && cam.z > 1.002 ? cam.z : 1, tx0 = shx, ty0 = shy;
    if (cz > 1) { tx0 -= cam.fx * (cz - 1); ty0 -= cam.fy * (cz - 1); }
    var uz = uc.z, c = 180, cy = Hl / 2, tl = V.tilt, ux = uc.x + tl.x * 6, uy = uc.y + tl.y * 6;
    return {a: cz * uz, e: (tx0 - c) * uz + c + ux, f: (ty0 - cy) * uz + cy + uy, cz: cz};
  }
  V.mat = mat;
  function clampPan(soft) {
    var mx = (uc.z - 1) * 180 + (soft ? 14 : 4), my = (uc.z - 1) * Hl / 2 + (soft ? 14 : 4);
    if (uc.x > mx) uc.x = mx; if (uc.x < -mx) uc.x = -mx; if (uc.y > my) uc.y = my; if (uc.y < -my) uc.y = -my;
  }
  V.camPan = function (dx, dy) { uc.anim = null; uc.x += dx; uc.y += dy; var mx = (uc.z - 1) * 180 + 26, my = (uc.z - 1) * Hl / 2 + 26; uc.x = Math.max(-mx, Math.min(mx, uc.x)); uc.y = Math.max(-my, Math.min(my, uc.y)); };
  V.camFling = function (vx, vy) { uc.vx = vx; uc.vy = vy; };
  V.camZoomAt = function (nz, qx, qy) {
    nz = Math.max(1, Math.min(2.6, nz)); var c = 180, cy = Hl / 2, pxw = (qx - c - uc.x) / uc.z, pyw = (qy - cy - uc.y) / uc.z; uc.anim = null; uc.z = nz; uc.x = qx - c - pxw * nz; uc.y = qy - cy - pyw * nz; clampPan(true);
  };
  V.camFocus = function (tx, ty, z, dur) {
    z = Math.max(1, Math.min(2.6, z || 1.8)); var wx = gx + tx * T, wy = gy + ty * T, tgx = -(wx - 180) * z, tgy = -(wy - Hl / 2) * z, mx = (z - 1) * 180 + 4, my = (z - 1) * Hl / 2 + 4;
    uc.vx = uc.vy = 0; uc.anim = {t: 0, d: dur || 0.45, z0: uc.z, x0: uc.x, y0: uc.y, z1: z, x1: Math.max(-mx, Math.min(mx, tgx)), y1: Math.max(-my, Math.min(my, tgy))};
  };
  V.camReset = function (smooth) { uc.vx = uc.vy = 0; if (smooth) uc.anim = {t: 0, d: 0.4, z0: uc.z, x0: uc.x, y0: uc.y, z1: 1, x1: 0, y1: 0}; else { uc.z = 1; uc.x = 0; uc.y = 0; uc.anim = null; } };
  V.camStep = function (dt) {
    if (uc.anim) { var a = uc.anim; a.t += dt; var k = Math.min(1, a.t / a.d), e = 1 - Math.pow(1 - k, 3); uc.z = a.z0 + (a.z1 - a.z0) * e; uc.x = a.x0 + (a.x1 - a.x0) * e; uc.y = a.y0 + (a.y1 - a.y0) * e; if (k >= 1) uc.anim = null; return; }
    if (Math.abs(uc.vx) > 1 || Math.abs(uc.vy) > 1) { uc.x += uc.vx * dt; uc.y += uc.vy * dt; var f = Math.exp(-4.2 * dt); uc.vx *= f; uc.vy *= f; }
    else { uc.vx = uc.vy = 0; }
    var mx = (uc.z - 1) * 180 + 4, my = (uc.z - 1) * Hl / 2 + 4; // spring back from overscroll
    if (uc.x > mx) uc.x += (mx - uc.x) * Math.min(1, dt * 10); if (uc.x < -mx) uc.x += (-mx - uc.x) * Math.min(1, dt * 10); if (uc.y > my) uc.y += (my - uc.y) * Math.min(1, dt * 10); if (uc.y < -my) uc.y += (-my - uc.y) * Math.min(1, dt * 10);
  };
  V.toClient = function (lx, ly) { var r = cv.getBoundingClientRect(), M = mat(0, 0); return [r.left + (lx * M.a + M.e) / 360 * r.width, r.top + (ly * M.a + M.f) / Hl * r.height]; };
  V.logical = function (cxp, cyp) { var r = cv.getBoundingClientRect(), M = mat(0, 0), lx = (cxp - r.left) / r.width * 360, ly = (cyp - r.top) / r.height * Hl; return [(lx - M.e) / M.a, (ly - M.f) / M.a]; };
  function tileXY(cxp, cyp) { var p = V.logical(cxp, cyp); return [(p[0] - gx) / T, (p[1] - gy) / T]; }
  V.tileFrom = tileXY;

  // ---------- ground ----------
  function rnd(i) { var x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); }
  function hiveGround(c) {
    // v0.9: the raid ground is the hive's creep: dark soil, a glowing membrane ring, veins and egg sacs around the Hive Heart
    var hx = V.hc ? V.hc[0] : 11.5, hy = V.hc ? V.hc[1] : 11.5, hr = V.hr || 5, px = gx + hx * T, py = gy + hy * T, R = (hr + 3.4) * T;
    var rg = c.createRadialGradient(px, py, T, px, py, R); rg.addColorStop(0, "rgba(150,70,170,.55)"); rg.addColorStop(0.55, "rgba(110,50,140,.32)"); rg.addColorStop(1, "rgba(60,30,90,0)");
    c.fillStyle = rg; c.beginPath(); c.arc(px, py, R, 0, 6.3); c.fill();
    // veins
    c.lineCap = "round";
    for (var i = 0; i < 14; i++) {
      var a = i / 14 * 6.2832 + rnd(i + 3) * 0.3, len = (hr + 1.5 + rnd(i * 5) * 4) * T, mx = px + Math.cos(a + 0.35) * len * 0.5, my = py + Math.sin(a + 0.35) * len * 0.5, ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len;
      c.strokeStyle = "rgba(205,120,230,.30)"; c.lineWidth = 3.4; c.beginPath(); c.moveTo(px + Math.cos(a) * T * 1.4, py + Math.sin(a) * T * 1.4); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
      c.strokeStyle = "rgba(255,170,230,.22)"; c.lineWidth = 1.2; c.stroke();
    }
    // membrane rim (octagon-ish, matches the barricade ring)
    c.strokeStyle = "rgba(210,130,255,.55)"; c.lineWidth = 2.2; c.setLineDash([6, 5]); c.beginPath();
    for (var k = 0; k < 8; k++) { var aa = (k + 0.5) / 8 * 6.2832, rr = (hr + 0.6) * T * (k % 2 ? 1.22 : 1.06); var xx = px + Math.cos(aa) * rr, yy = py + Math.sin(aa) * rr; if (k) c.lineTo(xx, yy); else c.moveTo(xx, yy); }
    c.closePath(); c.stroke(); c.setLineDash([]);
    // egg sacs
    for (var e = 0; e < 26; e++) { var ea = rnd(e * 11 + 2) * 6.2832, er = (hr + 1.2 + rnd(e * 7 + 5) * 5.2) * T, ex2 = px + Math.cos(ea) * er, ey2 = py + Math.sin(ea) * er, s = 2.5 + rnd(e * 3) * 3.5;
      if (ex2 < gx + C.RING * T || ex2 > gx + (N - C.RING) * T || ey2 < gy + C.RING * T || ey2 > gy + (N - C.RING) * T) continue;
      c.fillStyle = "rgba(30,10,50,.5)"; c.beginPath(); c.ellipse(ex2, ey2 + s * 0.6, s * 1.2, s * 0.6, 0, 0, 6.3); c.fill();
      c.fillStyle = e % 3 ? "rgba(170,230,120,.75)" : "rgba(255,150,210,.75)"; c.beginPath(); c.ellipse(ex2, ey2, s, s * 1.25, 0, 0, 6.3); c.fill();
      c.fillStyle = "rgba(255,255,255,.45)"; c.beginPath(); c.ellipse(ex2 - s * 0.3, ey2 - s * 0.45, s * 0.3, s * 0.4, 0, 0, 6.3); c.fill(); }
  }
  function buildGround() {
    if (!cv) return; var g = document.createElement("canvas"); g.width = cv.width; g.height = cv.height; var c = g.getContext("2d"); c.setTransform(sc * dpr, 0, 0, sc * dpr, 0, 0);
    var alien = V.theme === "a";
    var gr = c.createLinearGradient(0, 0, 0, Hl); if (alien) { gr.addColorStop(0, "#2c2140"); gr.addColorStop(1, "#1f1832"); } else { gr.addColorStop(0, "#5aa84a"); gr.addColorStop(1, "#3f8a3e"); } c.fillStyle = gr; c.fillRect(0, 0, 360, Hl);
    for (var i = 0; i < 260; i++) { c.fillStyle = "rgba(" + (alien ? (rnd(i) < .5 ? "190,130,230" : "10,0,30") : (rnd(i) < .5 ? "255,255,200" : "20,70,30")) + ",.07)"; c.beginPath(); c.arc(rnd(i * 3) * 360, rnd(i * 5 + 1) * Hl, 3 + rnd(i * 7) * 9, 0, 6.3); c.fill(); }
    // plot
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var inner = x >= C.RING && x < N - C.RING && y >= C.RING && y < N - C.RING, odd = (x + y) & 1;
      if (inner) { c.fillStyle = alien ? (odd ? "#4a3a58" : "#43344f") : (odd ? "#7ccb5d" : "#72c256"); c.fillRect(gx + x * T, gy + y * T, T, T); }
      else { c.fillStyle = alien ? "rgba(20,5,40,.22)" : "rgba(30,90,40,.16)"; c.fillRect(gx + x * T, gy + y * T, T, T); }
    }
    if (alien && V.mode === "raid") hiveGround(c);
    c.strokeStyle = alien ? "rgba(190,120,255,.55)" : "rgba(255,255,220,.45)"; c.lineWidth = 2; c.strokeRect(gx + C.RING * T, gy + C.RING * T, (N - 2 * C.RING) * T, (N - 2 * C.RING) * T);
    ground = g; V._groundSprites = true;
  }
  V.setTheme = function (th, base) {
    var hc = null, hr = 0;
    if (th === "a" && base) { var co = null; (base.bld || []).forEach(function (b) { if (b.t === "core") co = b; }); if (co) hc = [co.x + 1.5, co.y + 1.5]; hr = base.hr || (base.fh >= 6 ? 6 : base.fh >= 3 ? 5 : 4); }
    var key = th + "|" + (hc ? hc.join(",") : "") + "|" + hr + "|" + V.mode;
    if (V._gk !== key) { V._gk = key; V.theme = th; V.hc = hc; V.hr = hr; buildGround(); }
  };
  function drawGroundProps() {
    if (V.theme === "a" && V.mode === "raid") return;
    // decoration outside the plot: trees, flowers, hay (drawn each frame cheaply, cached sprites)
    var list = [[2, -2, "tree", 34], [330, -6, "pine", 30], [8, 22 + 0, "flowers", 20], [300, 12, "tree", 30], [-4, Hl - 14, "pine", 34], [320, Hl - 8, "tree", 36], [40, Hl - 4, "hay_stack", 26], [250, Hl - 2, "pumpkins", 22]];
    var topY = gy - 10, botY = gy + GW + 12;
    var a = [[10, topY - 4, "tree", 36], [48, topY + 2, "flowers", 20], [310, topY - 2, "pine", 30], [338, topY + 6, "tree", 28], [140, topY - 6, "hay_stack", 26], [8, botY + 22, "pine", 36], [330, botY + 20, "tree", 38], [280, botY + 34, "pumpkins", 22], [50, botY + 40, "flowers", 22], [170, botY + 48, "hay_round", 24]];
    a.forEach(function (p) { spr(p[2], p[0], p[1] + 20, p[3], p[3] * 1.4, V.mode === "raid" && V.theme === "a" ? 0.75 : 1); });
  }

  // ---------- fx ----------
  V.puff = function (x, y, n, col, sp, life) { for (var i = 0; i < n && V.parts.length < 200; i++) { var a = Math.random() * 6.28, s = (0.3 + Math.random()) * (sp || 30); V.parts.push({x: gx + x * T, y: gy + y * T, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, l: (life || 0.6) * (0.6 + Math.random() * 0.8), m: life || 0.6, c: col || "#d9c9a0", r: 1.5 + Math.random() * 2.5}); } };
  V.float = function (x, y, txt, col) { if (V.floats.length > 26) V.floats.shift(); V.floats.push({x: gx + x * T, y: gy + y * T, t: 0, s: txt, c: col || "#fff"}); };
  V.ring = function (x, y, r, col) { V.rings.push({x: gx + x * T, y: gy + y * T, r: r * T, t: 0, c: col || "#fff"}); };
  var ZC = {clamp: "#a8e8ff", stitch: "#9be26b", veil: "#c9b8ff", snare: "#d8c080", mine: "#ff9a3a", cache: "#ffd35a", stake: "#5af0ff", fuse: "#ffb040", surge: "#ffd35a"};
  function handleEvents(ev) {
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i]; if (e.k === "sqb" && BB.FX && BB.FX.squadBurst) BB.FX.squadBurst(e); if (e.k === "sqb" && BB.SQUI && BB.SQUI.ev(e)) continue; if (BB.TCH && BB.TCH.ev(e)) continue; if (BB.FX && BB.FX.ev(e)) continue;
      if (e.k === "shot") { if (V.cb.sfx) V.cb.sfx("dshot"); if (V.projs.length < 50) V.projs.push({x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0, d: e.t === "lobber" ? 0.45 : 0.16, c: e.t, spl: e.spl}); }
      else if (e.k === "bolt") { if (V.cb.sfx) V.cb.sfx(e.hid === "scx" ? "rail" : "pew"); if (V.projs.length < 50) V.projs.push({x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0, d: 0.12, c: "bolt"}); }
      else if (e.k === "crows") { if (V.cb.sfx) V.cb.sfx("crows"); (e.t || []).forEach(function (p) { V.puff(p[0], p[1], 12, "#2a2438", 70, 0.8); V.ring(p[0], p[1], 1.4, "#46e6d2"); }); V.shake = Math.max(V.shake, 0.3); }
      else if (e.k === "fan") { if (V.fx.length < 40) V.fx.push({k: "fan", x: e.x1, y: e.y1, a: e.a, r: e.r, t: 0, d: 0.3}); if (V.cb.sfx) V.cb.sfx("dshot"); }
      else if (e.k === "chain") { if (V.fx.length < 40) V.fx.push({k: "chain", p: e.p, t: 0, d: 0.28}); if (V.cb.sfx) V.cb.sfx("zap"); }
      else if (e.k === "beam") { if (V.fx.length < 40) V.fx.push({k: "beam", x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0, d: 0.3}); if (V.cb.sfx) V.cb.sfx("rail"); }
      else if (e.k === "heal") { if (V.fx.length < 40) V.fx.push({k: "heal", x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0, d: 0.45}); }
      else if (e.k === "burrow") { V.puff(e.x, e.y, 8, "#8a6a40", 40, 0.5); }
      else if (e.k === "boom") { if (V.cb.sfx) V.cb.sfx(e.c === "slam" ? "slam" : e.c === "spark" ? "zap" : e.c === "crow" ? "" : "boom"); V.ring(e.x, e.y, e.r, ZC[e.c] || (e.c === "spark" ? "#ffe65a" : e.c === "slam" ? "#ffb531" : e.c === "crow" ? "#46e6d2" : e.c === "trap" ? "#ff7a5a" : "#fff")); V.puff(e.x, e.y, 10, e.c === "spark" ? "#ffe65a" : "#e8c27a", 50, 0.5); if (e.c === "spark") V.shake = Math.max(V.shake, 0.25); }
      else if (e.k === "bdead") {
        V.puff(e.x, e.y, e.w > 2 ? 22 : e.kind === "wall" ? 5 : 12, e.kind === "wall" ? "#9c7a4a" : "#9a9a9a", e.w > 2 ? 55 : 35, 0.8); V.rubble.push({b: e.b, t: 0});
        if (e.kind !== "wall" && V.sim) { var b = V.sim.bld[e.b]; if (b && (b.lc || b.ls)) V.float(e.x, e.y - 1.2, b.lc ? "+" + b.lc : "+" + b.ls, b.lc ? "#ffd35a" : "#8fd4ff"); }
        if (e.kind === "core") { V.shake = 0.6; } else if (e.w > 2) V.shake = Math.max(V.shake, 0.2);
        if (V.cb.sfx) V.cb.sfx(e.kind === "core" ? "boom" : "hit");
      } else if (e.k === "udead") { if (V.cb.sfx) V.cb.sfx(e.team === "a" ? "hurt" : "pop"); if (!e.silent) V.puff(e.x, e.y, 6, e.team === "a" ? "#ffd7a0" : "#a8ff6a", 30, 0.5); }
      else if (e.k === "spawn") { if (V.cb.sfx) V.cb.sfx("deploy"); V.puff(e.x, e.y, 4, "#e8e0c0", 20, 0.4); }
      else if (e.k === "release") { V.ring(e.x, e.y, 2.5, "#c04cff"); if (V.cb.toast) V.cb.toast("Crew defenders released!"); }
    }
    ev.length = 0;
  }
  V.update = function (dt) {
    V.t += dt; var i; if (V.ghost && V.ghost.vx !== undefined) { var gk = Math.min(1, dt * 20); V.ghost.vx += (V.ghost.x - V.ghost.vx) * gk; V.ghost.vy += (V.ghost.y - V.ghost.vy) * gk; } if (BB.FX) BB.FX.update(dt); V.camStep(dt); if (BB.TCH) BB.TCH.update(dt);
    if (V.shake > 0) V.shake = Math.max(0, V.shake - dt);
    for (i = V.parts.length - 1; i >= 0; i--) { var p = V.parts[i]; p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 25 * dt; if (p.l <= 0) V.parts.splice(i, 1); }
    for (i = V.floats.length - 1; i >= 0; i--) { var f = V.floats[i]; f.t += dt; f.y -= 14 * dt; if (f.t > 1.3) V.floats.splice(i, 1); }
    for (i = V.projs.length - 1; i >= 0; i--) { var q = V.projs[i]; q.t += dt; if (q.t >= q.d) { if (q.c === "lobber") { V.ring(q.x2, q.y2, q.spl || 1.4, "#ff6a3a"); V.puff(q.x2, q.y2, 5, "#e0a050", 30, 0.4); } V.projs.splice(i, 1); } }
    for (i = V.fx.length - 1; i >= 0; i--) { var fx = V.fx[i]; fx.t += dt; if (fx.t >= fx.d) V.fx.splice(i, 1); }
    for (i = V.rings.length - 1; i >= 0; i--) { var r = V.rings[i]; r.t += dt; if (r.t > 0.45) V.rings.splice(i, 1); }
    if (V.sim) handleEvents(V.sim.ev);
  };

  // ---------- drawing buildings ----------
  function bSprite(b, theme) { var d = C.B[b.t]; return theme === "a" ? d.aart : d.art; }
  function drawBuilding(b, theme, opts) {
    var d = C.B[b.t], x = gx + b.x * T, y = gy + b.y * T, w = d.w * T, h = d.h * T, a = theme === "a", up = b.up, n = bSprite(b, theme);
    var alpha = up && up.total ? 0.55 : 1, hit = b.hit > 0, FXo = BB.FX; if (FXo && hit && opts && opts.raid) x += FXo.bshake(b);
    if (b.t === "wall") {
      if (a) { spr("a_wall", x + T / 2, y + T + 1, T + 3, T + 5, 1); }
      else {
        var nb = opts && opts.wallAt; cx.fillStyle = "#6b4423"; cx.fillRect(x + 5.5, y + 3, 4, 10); cx.fillStyle = "#a8743a"; cx.fillRect(x + 5.5, y + 3, 4, 3); cx.fillStyle = "#8a5a2c";
        if (nb && nb(b.x + 1, b.y)) { cx.fillRect(x + 9, y + 5, 7, 2); cx.fillRect(x + 9, y + 9, 7, 2); } if (nb && nb(b.x, b.y + 1)) { cx.fillRect(x + 6.5, y + 12, 2, 5); }
      }
      if (hit) { cx.fillStyle = "rgba(255,255,255,.5)"; cx.fillRect(x + 3, y + 2, 9, 12); }
      return;
    }
    if (d.kind === "trap") { if (!a || opts && opts.showTraps) { cx.globalAlpha = a ? 0.4 : 0.85; spr(d.art || "t_trap", x + T / 2, y + T, T * 1.1, T, 1); cx.globalAlpha = 1; } return; }
    if (b.t === "field" && !a) {
      cx.fillStyle = "#7b5330"; rr(x + 1, y + 2, w - 2, h - 2, 3); cx.fill(); cx.fillStyle = "#5e3d22"; for (var k = 0; k < 4; k++) cx.fillRect(x + 4, y + 6 + k * 6, w - 8, 1.5);
      cx.globalAlpha = alpha; [[0.2, 0.55], [0.5, 0.45], [0.8, 0.55], [0.35, 0.95], [0.65, 0.95]].forEach(function (p, ci) { spr("corn", x + w * p[0] + (FXo ? FXo.sway(ci + b.x) : 0), y + h * p[1] + 6, 15 + b.l * 1.5, 24, 1); }); cx.globalAlpha = 1;
    } else if (b.t === "rig" && !a) { spr("silo_dmg", x + w / 2, y + h + 2, w * 1.0, h * 1.9, alpha); }
    else if (n) {
      var asp = img(n) ? img(n).naturalHeight / img(n).naturalWidth : 1, ww = w * (d.kind === "def" ? 1.15 : 1.22), cap = h * (d.kind === "def" ? 2.2 : 2.0);
      if (a && (b.t === "field" || b.t === "rig")) { cx.fillStyle = b.t === "field" ? "rgba(255,210,70,.35)" : "rgba(90,190,255,.35)"; cx.beginPath(); cx.ellipse(x + w / 2, y + h - 3, w / 2, h / 3, 0, 0, 6.3); cx.fill(); }
      // shadow
      cx.fillStyle = "rgba(0,0,0,.22)"; cx.beginPath(); cx.ellipse(x + w / 2, y + h - 1, w * 0.46, h * 0.22, 0, 0, 6.3); cx.fill();
      var hd = a && b.t === "core" && FXo && FXo.heartDraw && opts && opts.raid && FXo.heartDraw(b, x, y, w, h, ww, cap, alpha);
      if (!hd) spr(n, x + w / 2, y + h + 2, ww, cap, alpha);
      if (FXo) { FXo.bldOver(b, x, y, w, h); if (b.t === "tinker") FXo.tinkerOver(x, y, w, h); if (up && up.total) FXo.constructOver(b, x, y, w, h); }
      if (b.blind > 0) { cx.fillStyle = "rgba(20,16,36,.45)"; cx.beginPath(); cx.ellipse(x + w / 2, y + h * 0.55, w * 0.42, h * 0.38, 0, 0, 6.3); cx.fill(); cx.fillStyle = "#46e6d2"; cx.font = "bold 12px sans-serif"; cx.textAlign = "center"; cx.fillText("?", x + w / 2, y + h * 0.62); }
      if (b.t === "lobber" || b.t === "blaster") { /* barrel aim handled via sprite only */ }
      if (hit && !hd) { cx.globalCompositeOperation = "lighter"; spr(n, x + w / 2, y + h + 2, ww, cap, 0.45); cx.globalCompositeOperation = "source-over"; }
    }
    // collector bubble
    if (V.cb.upReady && V.mode === "base" && FXo && V.cb.upReady(b) && !(opts && opts.bubble && opts.bubble(b))) FXo.upBadge(x, y, w);
    if (opts && opts.bubble) { var st = opts.bubble(b); if (st) { if (FXo) FXo.homeReady(x, y, w, d.res); var bob = Math.sin(V.t * 4 + b.x) * 1.5; spr(d.res === "c" ? "i_coin" : "i_scrap", x + w / 2, y - 3 + bob, 13, 13, 1); } }
  }
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function hpBar(x, y, w, f, col, key) { if (key && BB.FX && BB.FX.bar2) return BB.FX.bar2(cx, x, y, w, f, col, key); cx.fillStyle = "rgba(0,0,0,.65)"; cx.fillRect(x - w / 2 - 1, y - 1, w + 2, 4.5); cx.fillStyle = col; cx.fillRect(x - w / 2, y, w * Math.max(0, f), 2.5); }

  // ---------- base mode ----------
  function wallLookup() { var m = {}; (V.base || []).forEach(function (b) { if (b.t === "wall") m[b.x + "," + b.y] = 1; }); return function (x, y) { return m[x + "," + y]; }; }
  function drawAnalysis(sorted) {
    var a = V.analysis, pulse = 0.5 + 0.2 * Math.sin(V.t * 5);
    sorted.forEach(function (b) { var dd = C.B[b.t]; if (dd.kind === "wall" || dd.kind === "trap") return; var idx = V.base.indexOf(b), ok = a.sealedIds[idx]; cx.fillStyle = ok ? "rgba(90,255,130,.28)" : "rgba(255,80,80,.32)"; cx.fillRect(gx + b.x * T, gy + b.y * T, dd.w * T, dd.h * T); });
    a.gaps.forEach(function (g) { cx.strokeStyle = "rgba(255,230,40," + pulse + ")"; cx.lineWidth = 2; cx.strokeRect(gx + g[0] * T + 2, gy + g[1] * T + 2, T - 4, T - 4); cx.fillStyle = "rgba(255,230,40,.35)"; cx.fillRect(gx + g[0] * T + 2, gy + g[1] * T + 2, T - 4, T - 4); });
  }
  function drawBase() {
    var list = V.base || [], wl = wallLookup(), now = Date.now();
    var sorted = list.slice().sort(function (a, b) { return (a.y + C.B[a.t].h) - (b.y + C.B[b.t].h); });
    // placement grid
    if (V.ghost || V.paint) { cx.strokeStyle = "rgba(255,255,255,.28)"; cx.lineWidth = 0.5; cx.beginPath(); for (var i = C.RING; i <= N - C.RING; i++) { cx.moveTo(gx + i * T, gy + C.RING * T); cx.lineTo(gx + i * T, gy + (N - C.RING) * T); cx.moveTo(gx + C.RING * T, gy + i * T); cx.lineTo(gx + (N - C.RING) * T, gy + i * T); } cx.stroke(); }
    var opts = {wallAt: wl, bubble: V.cb.bubble};
    var liftB = V.lift ? V.lift.b : null, hasOffs = false, ok0; for (ok0 in V.offs) { hasOffs = true; break; }
    if (liftB) sorted = sorted.filter(function (b) { return b !== liftB; }).concat([liftB]); else if (hasOffs) sorted = sorted.slice().sort(function (a, b) { var oa = V.offs[a.id], ob = V.offs[b.id]; return (a.y + C.B[a.t].h + (oa ? oa.dy : 0)) - (b.y + C.B[b.t].h + (ob ? ob.dy : 0)); });
    sorted.forEach(function (b) {
      if (V.ghost && V.ghost.moveId === b.id) return; var o = hasOffs || liftB ? V.offs[b.id] : null;
      if (o) { var dd0 = C.B[b.t]; cx.save(); if (o.z > 0.5) { cx.fillStyle = "rgba(0,0,0,.28)"; cx.beginPath(); cx.ellipse(gx + (b.x + o.dx + dd0.w / 2) * T, gy + (b.y + o.dy + dd0.h) * T - 2, dd0.w * T * 0.42, 4 + o.z * 0.25, 0, 0, 6.3); cx.fill(); } cx.translate(o.dx * T, o.dy * T - o.z); if (o.z > 4) { cx.translate(gx + (b.x + dd0.w / 2) * T, gy + (b.y + dd0.h) * T); cx.scale(1.04, 1.04); cx.translate(-(gx + (b.x + dd0.w / 2) * T), -(gy + (b.y + dd0.h) * T)); } }
      drawBuilding(b, "p", opts); decorate(b); if (o) cx.restore();
    });
    if (V.sel && !(V.ghost && V.ghost.moveId === V.sel.id)) { var s = V.sel, d = C.B[s.t]; cx.strokeStyle = "rgba(255,230,90," + (0.7 + Math.sin(V.t * 8) * 0.3) + ")"; cx.lineWidth = 1.5; cx.strokeRect(gx + s.x * T - 1, gy + s.y * T - 1, d.w * T + 2, d.h * T + 2);
      if (d.kind === "def") { cx.strokeStyle = "rgba(255,255,255,.5)"; cx.setLineDash([3, 3]); cx.beginPath(); cx.arc(gx + (s.x + d.w / 2) * T, gy + (s.y + d.h / 2) * T, d.rng * T, 0, 6.3); cx.stroke(); cx.setLineDash([]); } }
    if (V.showRanges) sorted.forEach(function (b) { var dd = C.B[b.t]; if (dd.kind === "def") { cx.strokeStyle = dd.sup ? "rgba(120,200,255,.5)" : "rgba(255,255,255,.4)"; cx.lineWidth = 1; cx.setLineDash([3, 3]); cx.beginPath(); cx.arc(gx + (b.x + dd.w / 2) * T, gy + (b.y + dd.h / 2) * T, dd.rng * T, 0, 6.3); cx.stroke(); cx.setLineDash([]); } });
    if (V.analysis) drawAnalysis(sorted);
    if (V.ghost) drawGhost();
    function decorate(b) {
      var d = C.B[b.t], x = gx + b.x * T, y = gy + b.y * T;
      if (b.up) { var f = Math.min(1, b.up.done / b.up.total), tx = C.fmtT(b.up.total - b.up.done); cx.fillStyle = "rgba(0,0,0,.7)"; rr(x, y - 8, d.w * T, 8, 3); cx.fill(); cx.fillStyle = "#ffb531"; cx.fillRect(x + 1, y - 7, (d.w * T - 2) * f, 2.5); cx.fillStyle = "#fff"; cx.font = "bold 6px sans-serif"; cx.textAlign = "center"; cx.fillText(tx, x + d.w * T / 2, y - 1.2); }
      else if (b.t !== "wall" && b.t !== "trap" && b.l > 0 && d.kind !== "core") { /* level tag */ cx.fillStyle = "rgba(20,30,60,.8)"; cx.beginPath(); cx.arc(x + 4, y + 4, 4.5, 0, 6.3); cx.fill(); cx.fillStyle = "#ffe08a"; cx.font = "bold 6.5px sans-serif"; cx.textAlign = "center"; cx.fillText(b.l, x + 4, y + 6.3); }
      else if (d.kind === "core") { cx.fillStyle = "rgba(20,30,60,.85)"; cx.beginPath(); cx.arc(x + 4, y + 4, 5.5, 0, 6.3); cx.fill(); cx.fillStyle = "#ffe08a"; cx.font = "bold 8px sans-serif"; cx.textAlign = "center"; cx.fillText(b.l, x + 4, y + 7); }
    }
  }
  function drawGhost() {
    var g = V.ghost, d = C.B[g.t]; if (g.paintHint) return; if (g.vx === undefined) { g.vx = g.x; g.vy = g.y; } var x = gx + g.vx * T, y = gy + g.vy * T;
    cx.fillStyle = g.ok ? "rgba(90,255,120,.35)" : "rgba(255,70,70,.4)"; cx.fillRect(x, y, d.w * T, d.h * T);
    cx.globalAlpha = 0.85; drawBuilding({t: g.t, x: g.vx, y: g.vy, l: g.l || 1}, "p", {}); cx.globalAlpha = 1;
    if (d.kind === "def") { cx.strokeStyle = "rgba(255,255,255,.55)"; cx.setLineDash([3, 3]); cx.beginPath(); cx.arc(x + d.w * T / 2, y + d.h * T / 2, d.rng * T, 0, 6.3); cx.stroke(); cx.setLineDash([]); }
  }

  // ---------- raid mode ----------
  function drawRaid() {
    var sim = V.sim; if (!sim) return; var wl = (function () { var m = {}; sim.bld.forEach(function (b) { if (b.t === "wall" && !b.dead) m[b.x + "," + b.y] = 1; }); return function (x, y) { return m[x + "," + y]; }; })();
    var th = V.theme, opts = {wallAt: wl, showTraps: V.scoutTraps, raid: 1};
    if (V.showDeploy) { var rg = C.RING * T, pulse = 0.16 + Math.sin(V.t * 5) * 0.06; cx.save(); cx.beginPath(); cx.rect(gx, gy, GW, GW); cx.rect(gx + rg, gy + rg, GW - 2 * rg, GW - 2 * rg); cx.fillStyle = "rgba(255,225,80," + pulse + ")"; cx.fill("evenodd"); cx.strokeStyle = "rgba(255,225,80,.55)"; cx.lineWidth = 1.5; cx.setLineDash([5, 4]); cx.strokeRect(gx + rg, gy + rg, GW - 2 * rg, GW - 2 * rg); cx.restore(); }
    // rubble
    sim.bld.forEach(function (b) { if (b.dead && b.kind !== "trap") { var d = C.B[b.t]; cx.fillStyle = b.kind === "wall" ? "rgba(70,50,30,.45)" : "rgba(40,30,30,.6)"; rr(gx + b.x * T + 1, gy + b.y * T + 1, d.w * T - 2, d.h * T - 2, 3); cx.fill(); if (b.kind !== "wall") { cx.fillStyle = "rgba(120,110,100,.7)"; cx.fillRect(gx + b.x * T + 3, gy + b.y * T + d.h * T - 5, 5, 3); cx.fillRect(gx + b.x * T + d.w * T - 9, gy + b.y * T + d.h * T - 8, 4, 4); } } });
    // buildings (alive), sorted
    var live = sim.bld.filter(function (b) { return !b.dead; }).sort(function (a, b) { return (a.y + a.h) - (b.y + b.h); });
    live.forEach(function (b) { drawBuilding(b, th, opts); });
    // defence range hint while scouting
    if (V.scout || V.showRanges) live.forEach(function (b) { if (b.kind === "def") { cx.strokeStyle = "rgba(255,90,90,.35)"; cx.lineWidth = 1; cx.beginPath(); cx.arc(gx + b.cx * T, gy + b.cy * T, b.rng * T, 0, 6.3); cx.stroke(); } });
    // lane heat (after a raid or replay)
    if (V.showHeat && sim.heat) { var mxh = 0, hi; for (hi = 0; hi < sim.heat.length; hi++) if (sim.heat[hi] > mxh) mxh = sim.heat[hi]; if (mxh > 0) for (var hy = 0; hy < N; hy++) for (var hx = 0; hx < N; hx++) { var hv = sim.heat[hy * N + hx] / mxh; if (hv > 0.06) { cx.fillStyle = "rgba(" + (hv > 0.5 ? "255,90,40" : "255,200,60") + "," + (0.12 + 0.4 * hv).toFixed(2) + ")"; cx.fillRect(gx + hx * T, gy + hy * T, T, T); } } }
    // hp bars (buildings)
    live.forEach(function (b) { if (b.hp < b.mx && b.kind !== "trap") { if (b.kind === "wall" && b.hp > b.mx * 0.7) return; hpBar(gx + b.cx * T, gy + b.y * T - 2, b.kind === "wall" ? 9 : b.w * T * 0.8, b.hp / b.mx, "#6aff6a", b); } });
    if (BB.RIG && BB.RIG.drawDecals) BB.RIG.drawDecals(cx);
    // units
    var us = sim.tr.concat(sim.df).sort(function (a, b) { return a.y - b.y; });
    us.forEach(function (u) { drawUnit(u); });
    // fx (defense special shots, healing)
    V.fx.forEach(function (f) { var k = 1 - f.t / f.d; cx.globalAlpha = Math.max(0, k);
      if (f.k === "fan") { cx.fillStyle = "rgba(255,240,170,.45)"; cx.beginPath(); cx.moveTo(gx + f.x * T, gy + f.y * T); cx.arc(gx + f.x * T, gy + f.y * T, f.r * T, f.a - 0.45, f.a + 0.45); cx.closePath(); cx.fill(); }
      else if (f.k === "chain" && f.p && f.p.length > 1) { cx.strokeStyle = "#bff4ff"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(gx + f.p[0][0] * T, gy + f.p[0][1] * T); for (var pi = 1; pi < f.p.length; pi++) { var ax = gx + f.p[pi][0] * T, ay = gy + f.p[pi][1] * T, bx = gx + f.p[pi - 1][0] * T, by = gy + f.p[pi - 1][1] * T; cx.lineTo((ax + bx) / 2 + (Math.random() - .5) * 6, (ay + by) / 2 + (Math.random() - .5) * 6); cx.lineTo(ax, ay); } cx.stroke(); }
      else if (f.k === "beam") { cx.strokeStyle = "#ffcf6a"; cx.lineWidth = 2.2; cx.beginPath(); cx.moveTo(gx + f.x1 * T, gy + f.y1 * T); cx.lineTo(gx + f.x2 * T, gy + f.y2 * T); cx.stroke(); }
      else if (f.k === "heal") { cx.strokeStyle = "#7dffa0"; cx.lineWidth = 1.5; cx.setLineDash([2, 3]); cx.beginPath(); cx.moveTo(gx + f.x1 * T, gy + f.y1 * T - 6); cx.lineTo(gx + f.x2 * T, gy + f.y2 * T - 6); cx.stroke(); cx.setLineDash([]); cx.fillStyle = "#7dffa0"; cx.font = "bold 9px sans-serif"; cx.textAlign = "center"; cx.fillText("+", gx + f.x2 * T, gy + f.y2 * T - 14 - (1 - k) * 8); }
      cx.globalAlpha = 1; });
    // zones
    sim.zones.forEach(function (z) { var col = z.k === "rain" ? "94,200,255" : z.k === "clamp" ? "168,232,255" : z.k === "stitch" ? "155,226,107" : z.k === "veil" ? "201,184,255" : "255,154,60"; var px = gx + z.x * T, py = gy + z.y * T, f = z.t / z.dur; cx.fillStyle = "rgba(" + col + "," + (0.18 + 0.1 * Math.sin(V.t * 6)) + ")"; cx.beginPath(); cx.arc(px, py, z.r * T, 0, 6.3); cx.fill(); cx.strokeStyle = "rgba(" + col + ",.8)"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(px, py, z.r * T * (0.6 + 0.4 * f), 0, 6.3); cx.stroke();
      if (z.k === "rain") { cx.strokeStyle = "rgba(180,230,255,.8)"; cx.lineWidth = 1; for (var k = 0; k < 7; k++) { var ax = px + Math.cos(k * 1.9 + V.t) * z.r * T * 0.7, ay = py + ((V.t * 40 + k * 13) % 30) - 20; cx.beginPath(); cx.moveTo(ax, ay); cx.lineTo(ax - 1, ay + 5); cx.stroke(); } } });
  }
  var UCOL = {chick: "#ffe27a", sow: "#d99aa0", hound: "#c98a5a", wrench: "#8fe0a0", mule: "#b0a080", spinner: "#ff7a7a", badger: "#a08060", kestrel: "#9ad0ff", bruiser: "#ff9a3c", slinger: "#7fd0ff", roller: "#e8d070", drone: "#9aff7a", hero: "#ffd35a"};
  function drawUnit(u) {
    if (BB.FX && BB.FX.unit(u)) return;
    var x = gx + u.x * T, y = gy + u.y * T, bob = Math.abs(Math.sin(V.t * 9 + u.wob)) * (u.mv ? 1.8 : 0.4), sz = u.sz * 1.2 * (u.team === "d" ? 0.95 : 1);
    if (u.mv > 0) u.mv -= 0.05;
    if (u.fly) { cx.fillStyle = "rgba(0,0,0,.22)"; cx.beginPath(); cx.ellipse(x, y + 4, sz * 0.3, sz * 0.12, 0, 0, 6.3); cx.fill(); y -= 10 + Math.sin(V.t * 6 + u.wob) * 1.5; }
    else { cx.fillStyle = "rgba(0,0,0,.28)"; cx.beginPath(); cx.ellipse(x, y + 1, sz * 0.32, sz * 0.12, 0, 0, 6.3); cx.fill(); }
    var art = u.art === "hero" ? "bg_front" : u.art === "decoy" ? "u_guard" : u.art, flip = u.face < 0;
    if (u.art === "snatcher" || u.art === "stinger" || u.art === "tank") flip = false;
    if (u.team === "d" && (u.art === "u_slinger" || u.art === "u_bruiser" || u.art === "u_guard" || u.art === "u_roller" || u.art === "u_drone")) { /* friendly crew on player base */ }
    if (u.decoy) cx.globalAlpha = 0.85;
    if (u.veil > 0) cx.globalAlpha = 0.45;
    if (u.dig > 0) { cx.fillStyle = "rgba(90,60,30,.7)"; cx.beginPath(); cx.ellipse(x, y + 1, 9, 4, 0, 0, 6.3); cx.fill(); cx.globalAlpha = 0.25; }
    if (u.team === "d" || u.team === "a") { /* statuses below */ }
    if (u.stun > 0) { cx.strokeStyle = "#ffe65a"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(x, y - sz * 0.9 - 2 + Math.sin(V.t * 10) * 1, 4, 0, 6.3); cx.stroke(); }
    if (u.root > 0) { cx.strokeStyle = "rgba(216,192,128,.9)"; cx.lineWidth = 1.5; cx.beginPath(); cx.ellipse(x, y, 10, 4, 0, 0, 6.3); cx.stroke(); }
    if (u.slow > 0) { cx.fillStyle = "rgba(120,200,255,.35)"; cx.beginPath(); cx.ellipse(x, y, 11, 5, 0, 0, 6.3); cx.fill(); }
    if (u.hero) { cx.strokeStyle = (u.hid === "scx" ? "rgba(70,230,210," : "rgba(255,211,90,") + (0.5 + 0.3 * Math.sin(V.t * 6)) + ")"; cx.lineWidth = 1.5; cx.beginPath(); cx.ellipse(x, y, 13, 5, 0, 0, 6.3); cx.stroke(); }
    if (u.ab > 0) { cx.fillStyle = u.hid === "scx" ? "rgba(70,230,210,.3)" : "rgba(255,181,49,.35)"; cx.beginPath(); cx.arc(x, y - 8, 16, 0, 6.3); cx.fill(); }
    if (u.bst > 0) { cx.strokeStyle = "rgba(255,154,60,.9)"; cx.lineWidth = 1; cx.beginPath(); cx.arc(x, y - sz * 0.35, sz * 0.5, 0, 6.3); cx.stroke(); }
    var tilt = u.k === "roller" ? V.t * 8 : Math.sin(V.t * 9 + u.wob) * (u.mv ? 0.08 : 0.02);
    cx.save(); cx.translate(x, y - bob); if (u.k === "roller") { cx.translate(0, -sz * 0.4); cx.rotate(tilt); cx.translate(0, sz * 0.4); } else cx.rotate(tilt);
    spr(art, 0, 0, sz, sz * 1.15, 1, flip); cx.restore(); cx.globalAlpha = 1;
    if (u.hit > 0) { cx.globalCompositeOperation = "lighter"; cx.save(); cx.translate(x, y - bob); spr(art, 0, 0, sz, sz * 1.15, 0.5, flip); cx.restore(); cx.globalCompositeOperation = "source-over"; }
    if (u.hp < u.mx && !u.decoy) hpBar(x, y - sz * 1.1 - bob, Math.max(8, sz * 0.7), u.hp / u.mx, u.team === "a" ? "#6ad0ff" : "#ff6a6a");
    else if (u.decoy) hpBar(x, y - sz * 1.1, 14, u.hp / u.mx, "#ffd35a");
    if (u.hero) hpBar(x, y - sz * 1.1 - bob, 20, u.hp / u.mx, "#ffd35a");
  }

  // ---------- main draw ----------
  V.draw = function () {
    if (!cx || !ground) return;
    var FXo = BB.FX, cam = FXo && FXo.cam, z = cam ? cam.z : 1, s = sc * dpr, shk = (V.shake > 0 ? V.shake * 8 : 0) + (cam ? cam.shake : 0), sh = shk > 0 ? (Math.random() - 0.5) * shk * 2 : 0, sv = shk > 0 ? (Math.random() - 0.5) * shk * 2 : 0;
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.drawImage(ground, 0, 0);
    var M = mat(sh, sv);
    if (M.a > 1.002 || Math.abs(M.e) > 0.01 || Math.abs(M.f) > 0.01) { // damped background layer = parallax against the world layer
      var ag = 1 + (M.a - 1) * 0.6, c0 = 180, cy0 = Hl / 2, offx = M.e - (1 - M.a) * c0, offy = M.f - (1 - M.a) * cy0;
      cx.setTransform(s * ag, 0, 0, s * ag, ((1 - ag) * c0 + offx * 0.6) * s, ((1 - ag) * cy0 + offy * 0.6) * s); cx.drawImage(ground, 0, 0, ground.width, ground.height, 0, 0, 360, Hl);
    }
    cx.setTransform(s * M.a, 0, 0, s * M.a, M.e * s, M.f * s);
    if (!ready) { cx.fillStyle = "#fff"; cx.font = "bold 14px sans-serif"; cx.textAlign = "center"; cx.fillText("Loading art...", 180, Hl / 2); return; }
    if (FXo) FXo.drawBelow();
    drawGroundProps();
    if (FXo && V.mode === "base") FXo.drawBaseLife();
    if (V.mode === "base") drawBase(); else drawRaid();
    if (FXo) { FXo.drawWorld(); FXo.drawLight(); FXo.drawClouds(); }
    // projectiles
    V.projs.forEach(function (q) {
      var f = q.t / q.d, x = gx + (q.x1 + (q.x2 - q.x1) * f) * T, y = gy + (q.y1 + (q.y2 - q.y1) * f) * T, a = V.theme === "a";
      if (q.c === "lobber") { var h = Math.sin(f * 3.14) * 22; cx.fillStyle = a ? "#8aff4a" : "#555"; cx.beginPath(); cx.arc(x, y - h, 3.2, 0, 6.3); cx.fill(); }
      else if (q.c === "sniper") { cx.strokeStyle = "rgba(255,255,255,.9)"; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(gx + q.x1 * T, gy + q.y1 * T); cx.lineTo(x, y); cx.stroke(); }
      else if (q.c === "flak") { cx.fillStyle = "#ff5ad0"; cx.beginPath(); cx.arc(x, y, 2.6, 0, 6.3); cx.fill(); cx.fillStyle = "rgba(255,150,230,.5)"; cx.beginPath(); cx.arc(x, y, 5, 0, 6.3); cx.fill(); }
      else if (q.c === "bolt") { cx.strokeStyle = "#ffe8a0"; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(x - (q.x2 - q.x1) * 1.2, y - (q.y2 - q.y1) * 1.2); cx.lineTo(x, y); cx.stroke(); }
      else { cx.fillStyle = a ? "#9aff4a" : "#ffd35a"; cx.beginPath(); cx.arc(x, y, 2.4, 0, 6.3); cx.fill(); cx.fillStyle = a ? "rgba(150,255,60,.35)" : "rgba(255,200,60,.4)"; cx.beginPath(); cx.arc(x, y, 4.5, 0, 6.3); cx.fill(); }
    });
    V.rings.forEach(function (r) { var f = r.t / 0.45; cx.strokeStyle = r.c; cx.globalAlpha = 1 - f; cx.lineWidth = 2; cx.beginPath(); cx.arc(r.x, r.y, r.r * (0.3 + 0.7 * f), 0, 6.3); cx.stroke(); cx.globalAlpha = 1; });
    V.parts.forEach(function (p) { cx.globalAlpha = Math.max(0, p.l / p.m); cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.3); cx.fill(); }); cx.globalAlpha = 1;
    cx.font = "bold 9px sans-serif"; cx.textAlign = "center"; cx.lineWidth = 2.5; cx.strokeStyle = "rgba(0,0,0,.7)";
    V.floats.forEach(function (f) { cx.globalAlpha = Math.max(0, 1 - f.t / 1.3); cx.strokeText(f.s, f.x, f.y); cx.fillStyle = f.c; cx.fillText(f.s, f.x, f.y); }); cx.globalAlpha = 1;
    if (BB.TCH) BB.TCH.draw(cx, gx, gy, T);
  };

  // ---------- input ----------
  var drag = null, lastDep = 0;
  function down(e) {
    if (V.cb.audio) V.cb.audio(); var t = tileXY(e.clientX, e.clientY), x = t[0], y = t[1]; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); drag = {x0: x, y0: y, moved: false, id: e.pointerId, onGhost: false};
    if (V.mode === "raid") { if (BB.FX) { var oid = BB.FX.orbAt(x, y); if (oid >= 0) { if (V.cb.puTap) V.cb.puTap(oid); return; } } if (V.cb.raidTap) V.cb.raidTap(x, y, true); return; }
    if (V.paint) { V.paint.on = true; V.cb.paintAt && V.cb.paintAt(Math.floor(x), Math.floor(y)); return; }
    if (V.ghost) { var g = V.ghost, d = C.B[g.t]; if (x >= g.x - 1 && x <= g.x + d.w + 1 && y >= g.y - 1 && y <= g.y + d.h + 1) { drag.onGhost = true; drag.off = [x - g.x, y - g.y]; return; } drag.any = true; }
  }
  function move(e) {
    if (!drag || e.pointerId !== drag.id) return; var t = tileXY(e.clientX, e.clientY), x = t[0], y = t[1];
    if (Math.hypot(x - drag.x0, y - drag.y0) > 0.4) drag.moved = true;
    if (V.mode === "raid") { if (drag.moved && V.cb.raidTap) V.cb.raidTap(x, y, false); return; }
    if (V.paint && V.paint.on) { V.cb.paintAt && V.cb.paintAt(Math.floor(x), Math.floor(y)); return; }
    if (V.ghost && drag.any && drag.moved) { var gd = C.B[V.ghost.t]; V.cb.ghostMove && V.cb.ghostMove(Math.round(x - gd.w / 2), Math.round(y - gd.h / 2)); return; }
    if (V.ghost && drag.onGhost) { V.cb.ghostMove && V.cb.ghostMove(Math.round(x - drag.off[0]), Math.round(y - drag.off[1])); }
  }
  function up(e) {
    if (!drag || e.pointerId !== drag.id) return; var t = tileXY(e.clientX, e.clientY), x = t[0], y = t[1], d = drag; drag = null;
    if (V.mode === "raid") { V.cb.raidUp && V.cb.raidUp(); return; }
    if (V.paint) { V.paint.on = false; V.cb.paintEnd && V.cb.paintEnd(); return; }
    if (V.ghost) { if (!d.moved && !d.onGhost) V.cb.ghostMove && V.cb.ghostMove(Math.round(x - C.B[V.ghost.t].w / 2), Math.round(y - C.B[V.ghost.t].h / 2)); return; }
    if (!d.moved) V.cb.tap && V.cb.tap(x, y);
  }
  function sprSlice(n, x, by, w, maxH, st, flip) {
    var i = img(n); if (!i) return false; var asp = i.naturalHeight / i.naturalWidth, h = w * asp; if (maxH && h > maxH) { h = maxH; w = h / asp; }
    w = Math.round(w * 2) / 2; h = Math.round(h * 2) / 2; var c = cached(n, w, h); if (!c) return false;
    if (!BB.RIG) return spr(n, x, by, w, maxH, 1, flip); BB.RIG.sliceDraw(cx, c, 0, 0, c.width, c.height, x, by, w, h, st, flip); return true;
  }
  V.ctx = function () { return {cx: cx, gx: gx, gy: gy, Hl: Hl, spr: spr, sprSlice: sprSlice, toClient: V.toClient, rect: function () { return cv.getBoundingClientRect(); }}; };
  V.dims = function () { return {Hl: Hl, gy: gy, GW: GW}; };
})();
