"use strict";
// ---- Renderer + input for the base canvas (build mode) and raid canvas (scout / deploy / fight) ----
(function () {
  var C = BB.CC, V = BB.CCV = {}, N = C.GRID, T = C.T, GW = N * T;
  var cv, cx, dpr = 1, cssW = 360, cssH = 700, sc = 1, Hl = 700, gx = 0, gy = 0, IMG = {}, loaded = 0, ready = false, SCACHE = {}, ground = null;
  var ART = ["homestead","workshop","trainbarn","muster","crewhall","tinker","t_blaster","t_sniper","t_lobber","t_flak","t_trap","t_post","a_core","a_blaster","a_sniper","a_lobber","a_flak","a_harv","a_vaultC","a_vaultS","a_wall","a_bunker",
    "u_bruiser","u_slinger","u_roller","u_drone","u_guard","barn","silo","silo_dmg","corn","tree","pine","flowers","pumpkins","hay_round","hay_stack","snatcher","stinger","tank","bg_front","fx_ring","fx_spark","fx_stars","i_coin","i_scrap","cow","sheep","pig"];
  V.mode = "base"; V.parts = []; V.floats = []; V.projs = []; V.rings = []; V.rubble = []; V.shake = 0; V.t = 0;
  V.sel = null; V.ghost = null; V.paint = null; V.sim = null; V.base = null; V.theme = "p"; V.deploy = null; V.showDeploy = false; V.speed = 1; V.paused = false;
  V.cb = {};
  V.load = function () {
    if (loaded) return; loaded = 1; var done = 0;
    ART.forEach(function (n) { var im = new Image(); im.onload = im.onerror = function () { if (++done >= ART.length) { ready = true; SCACHE = {}; V.resize(); } }; im.src = "assets/" + n + ".webp"; IMG[n] = im; });
  };
  V.ready = function () { return ready; };
  V.init = function (canvas) {
    cv = canvas; cx = cv.getContext("2d"); V.load(); window.addEventListener("resize", V.resize); V.resize();
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.style.touchAction = "none";
  };
  V.resize = function () {
    if (!cv) return; var r = cv.getBoundingClientRect(); if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5); cssW = r.width; cssH = r.height; sc = cssW / 360; Hl = cssH / sc;
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); gx = 0; gy = Math.round((Hl - GW) / 2 - 18); SCACHE = {}; buildGround();
  };
  function img(n) { var i = IMG[n]; return i && i.complete && i.naturalWidth ? i : null; }
  function cached(n, w, h) {
    var k = n + "|" + w + "|" + h, c = SCACHE[k]; if (c) return c; var i = img(n); if (!i) return null;
    var pw = Math.max(2, Math.round(w * sc * dpr)), ph = Math.max(2, Math.round(h * sc * dpr)); c = document.createElement("canvas"); c.width = pw; c.height = ph; var g = c.getContext("2d"); g.imageSmoothingQuality = "high";
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
  function tileXY(cxp, cyp) { var r = cv.getBoundingClientRect(); var lx = (cxp - r.left) / r.width * 360, ly = (cyp - r.top) / r.height * Hl; return [(lx - gx) / T, (ly - gy) / T]; }
  V.tileFrom = tileXY;

  // ---------- ground ----------
  function rnd(i) { var x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); }
  function buildGround() {
    if (!cv) return; var g = document.createElement("canvas"); g.width = cv.width; g.height = cv.height; var c = g.getContext("2d"); c.setTransform(sc * dpr, 0, 0, sc * dpr, 0, 0);
    var gr = c.createLinearGradient(0, 0, 0, Hl); gr.addColorStop(0, "#5aa84a"); gr.addColorStop(1, "#3f8a3e"); c.fillStyle = gr; c.fillRect(0, 0, 360, Hl);
    for (var i = 0; i < 260; i++) { c.fillStyle = "rgba(" + (rnd(i) < .5 ? "255,255,200" : "20,70,30") + ",.07)"; c.beginPath(); c.arc(rnd(i * 3) * 360, rnd(i * 5 + 1) * Hl, 3 + rnd(i * 7) * 9, 0, 6.3); c.fill(); }
    // plot
    var alien = V.theme === "a";
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var inner = x >= C.RING && x < N - C.RING && y >= C.RING && y < N - C.RING, odd = (x + y) & 1;
      if (inner) { c.fillStyle = alien ? (odd ? "#54764a" : "#4d6e44") : (odd ? "#7ccb5d" : "#72c256"); c.fillRect(gx + x * T, gy + y * T, T, T); }
      else { c.fillStyle = alien ? "rgba(40,20,70,.20)" : "rgba(30,90,40,.16)"; c.fillRect(gx + x * T, gy + y * T, T, T); }
    }
    c.strokeStyle = alien ? "rgba(190,120,255,.55)" : "rgba(255,255,220,.45)"; c.lineWidth = 2; c.strokeRect(gx + C.RING * T, gy + C.RING * T, (N - 2 * C.RING) * T, (N - 2 * C.RING) * T);
    ground = g; V._groundSprites = true;
  }
  V.setTheme = function (th) { if (V.theme !== th) { V.theme = th; buildGround(); } };
  function drawGroundProps() {
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
  function handleEvents(ev) {
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e.k === "shot") { if (V.projs.length < 50) V.projs.push({x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0, d: e.t === "lobber" ? 0.45 : 0.16, c: e.t, spl: e.spl}); }
      else if (e.k === "bolt") { if (V.projs.length < 50) V.projs.push({x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0, d: 0.12, c: "bolt"}); }
      else if (e.k === "boom") { V.ring(e.x, e.y, e.r, e.c === "spark" ? "#ffe65a" : e.c === "slam" ? "#ffb531" : e.c === "trap" ? "#ff7a5a" : "#fff"); V.puff(e.x, e.y, 10, e.c === "spark" ? "#ffe65a" : "#e8c27a", 50, 0.5); if (e.c === "spark") V.shake = Math.max(V.shake, 0.25); }
      else if (e.k === "bdead") {
        V.puff(e.x, e.y, e.w > 2 ? 22 : e.kind === "wall" ? 5 : 12, e.kind === "wall" ? "#9c7a4a" : "#9a9a9a", e.w > 2 ? 55 : 35, 0.8); V.rubble.push({b: e.b, t: 0});
        if (e.kind !== "wall" && V.sim) { var b = V.sim.bld[e.b]; if (b && (b.lc || b.ls)) V.float(e.x, e.y - 1.2, b.lc ? "+" + b.lc : "+" + b.ls, b.lc ? "#ffd35a" : "#8fd4ff"); }
        if (e.kind === "core") { V.shake = 0.6; } else if (e.w > 2) V.shake = Math.max(V.shake, 0.2);
        if (V.cb.sfx) V.cb.sfx(e.kind === "core" ? "boom" : "hit");
      } else if (e.k === "udead") { if (!e.silent) V.puff(e.x, e.y, 6, e.team === "a" ? "#ffd7a0" : "#a8ff6a", 30, 0.5); }
      else if (e.k === "spawn") V.puff(e.x, e.y, 4, "#e8e0c0", 20, 0.4);
      else if (e.k === "release") { V.ring(e.x, e.y, 2.5, "#c04cff"); if (V.cb.toast) V.cb.toast("Crew defenders released!"); }
    }
    ev.length = 0;
  }
  V.update = function (dt) {
    V.t += dt; var i;
    if (V.shake > 0) V.shake = Math.max(0, V.shake - dt);
    for (i = V.parts.length - 1; i >= 0; i--) { var p = V.parts[i]; p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 25 * dt; if (p.l <= 0) V.parts.splice(i, 1); }
    for (i = V.floats.length - 1; i >= 0; i--) { var f = V.floats[i]; f.t += dt; f.y -= 14 * dt; if (f.t > 1.3) V.floats.splice(i, 1); }
    for (i = V.projs.length - 1; i >= 0; i--) { var q = V.projs[i]; q.t += dt; if (q.t >= q.d) { if (q.c === "lobber") { V.ring(q.x2, q.y2, q.spl || 1.4, "#ff6a3a"); V.puff(q.x2, q.y2, 5, "#e0a050", 30, 0.4); } V.projs.splice(i, 1); } }
    for (i = V.rings.length - 1; i >= 0; i--) { var r = V.rings[i]; r.t += dt; if (r.t > 0.45) V.rings.splice(i, 1); }
    if (V.sim) handleEvents(V.sim.ev);
  };

  // ---------- drawing buildings ----------
  function bSprite(b, theme) { var d = C.B[b.t]; return theme === "a" ? d.aart : d.art; }
  function drawBuilding(b, theme, opts) {
    var d = C.B[b.t], x = gx + b.x * T, y = gy + b.y * T, w = d.w * T, h = d.h * T, a = theme === "a", up = b.up, n = bSprite(b, theme);
    var alpha = up && up.total ? 0.55 : 1, hit = b.hit > 0;
    if (b.t === "wall") {
      if (a) { spr("a_wall", x + T / 2, y + T + 1, T + 3, T + 5, 1); }
      else {
        var nb = opts && opts.wallAt; cx.fillStyle = "#6b4423"; cx.fillRect(x + 5.5, y + 3, 4, 10); cx.fillStyle = "#a8743a"; cx.fillRect(x + 5.5, y + 3, 4, 3); cx.fillStyle = "#8a5a2c";
        if (nb && nb(b.x + 1, b.y)) { cx.fillRect(x + 9, y + 5, 7, 2); cx.fillRect(x + 9, y + 9, 7, 2); } if (nb && nb(b.x, b.y + 1)) { cx.fillRect(x + 6.5, y + 12, 2, 5); }
      }
      if (hit) { cx.fillStyle = "rgba(255,255,255,.5)"; cx.fillRect(x + 3, y + 2, 9, 12); }
      return;
    }
    if (b.t === "trap") { if (!a || opts && opts.showTraps) { cx.globalAlpha = a ? 0.35 : 0.8; spr("t_trap", x + T / 2, y + T, T * 1.1, T, 1); cx.globalAlpha = 1; } return; }
    if (b.t === "field" && !a) {
      cx.fillStyle = "#7b5330"; rr(x + 1, y + 2, w - 2, h - 2, 3); cx.fill(); cx.fillStyle = "#5e3d22"; for (var k = 0; k < 4; k++) cx.fillRect(x + 4, y + 6 + k * 6, w - 8, 1.5);
      cx.globalAlpha = alpha; [[0.2, 0.55], [0.5, 0.45], [0.8, 0.55], [0.35, 0.95], [0.65, 0.95]].forEach(function (p) { spr("corn", x + w * p[0], y + h * p[1] + 6, 15 + b.l * 1.5, 24, 1); }); cx.globalAlpha = 1;
    } else if (b.t === "rig" && !a) { spr("silo_dmg", x + w / 2, y + h + 2, w * 1.0, h * 1.9, alpha); }
    else if (n) {
      var asp = img(n) ? img(n).naturalHeight / img(n).naturalWidth : 1, ww = w * (d.kind === "def" ? 1.15 : 1.22), cap = h * (d.kind === "def" ? 2.2 : 2.0);
      if (a && (b.t === "field" || b.t === "rig")) { cx.fillStyle = b.t === "field" ? "rgba(255,210,70,.35)" : "rgba(90,190,255,.35)"; cx.beginPath(); cx.ellipse(x + w / 2, y + h - 3, w / 2, h / 3, 0, 0, 6.3); cx.fill(); }
      // shadow
      cx.fillStyle = "rgba(0,0,0,.22)"; cx.beginPath(); cx.ellipse(x + w / 2, y + h - 1, w * 0.46, h * 0.22, 0, 0, 6.3); cx.fill();
      spr(n, x + w / 2, y + h + 2, ww, cap, alpha);
      if (b.t === "lobber" || b.t === "blaster") { /* barrel aim handled via sprite only */ }
      if (hit) { cx.globalCompositeOperation = "lighter"; spr(n, x + w / 2, y + h + 2, ww, cap, 0.45); cx.globalCompositeOperation = "source-over"; }
    }
    // collector bubble
    if (opts && opts.bubble) { var st = opts.bubble(b); if (st) { var bob = Math.sin(V.t * 4 + b.x) * 1.5; spr(d.res === "c" ? "i_coin" : "i_scrap", x + w / 2, y - 3 + bob, 13, 13, 1); } }
  }
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function hpBar(x, y, w, f, col) { cx.fillStyle = "rgba(0,0,0,.65)"; cx.fillRect(x - w / 2 - 1, y - 1, w + 2, 4.5); cx.fillStyle = col; cx.fillRect(x - w / 2, y, w * Math.max(0, f), 2.5); }

  // ---------- base mode ----------
  function wallLookup() { var m = {}; (V.base || []).forEach(function (b) { if (b.t === "wall") m[b.x + "," + b.y] = 1; }); return function (x, y) { return m[x + "," + y]; }; }
  function drawBase() {
    var list = V.base || [], wl = wallLookup(), now = Date.now();
    var sorted = list.slice().sort(function (a, b) { return (a.y + C.B[a.t].h) - (b.y + C.B[b.t].h); });
    // placement grid
    if (V.ghost || V.paint) { cx.strokeStyle = "rgba(255,255,255,.28)"; cx.lineWidth = 0.5; cx.beginPath(); for (var i = C.RING; i <= N - C.RING; i++) { cx.moveTo(gx + i * T, gy + C.RING * T); cx.lineTo(gx + i * T, gy + (N - C.RING) * T); cx.moveTo(gx + C.RING * T, gy + i * T); cx.lineTo(gx + (N - C.RING) * T, gy + i * T); } cx.stroke(); }
    var opts = {wallAt: wl, bubble: V.cb.bubble};
    sorted.forEach(function (b) { if (V.ghost && V.ghost.moveId === b.id) return; drawBuilding(b, "p", opts); decorate(b); });
    if (V.sel && !(V.ghost && V.ghost.moveId === V.sel.id)) { var s = V.sel, d = C.B[s.t]; cx.strokeStyle = "rgba(255,230,90," + (0.7 + Math.sin(V.t * 8) * 0.3) + ")"; cx.lineWidth = 1.5; cx.strokeRect(gx + s.x * T - 1, gy + s.y * T - 1, d.w * T + 2, d.h * T + 2);
      if (d.kind === "def") { cx.strokeStyle = "rgba(255,255,255,.5)"; cx.setLineDash([3, 3]); cx.beginPath(); cx.arc(gx + (s.x + d.w / 2) * T, gy + (s.y + d.h / 2) * T, d.rng * T, 0, 6.3); cx.stroke(); cx.setLineDash([]); } }
    if (V.ghost) drawGhost();
    function decorate(b) {
      var d = C.B[b.t], x = gx + b.x * T, y = gy + b.y * T;
      if (b.up) { var f = Math.min(1, b.up.done / b.up.total), tx = C.fmtT(b.up.total - b.up.done); cx.fillStyle = "rgba(0,0,0,.7)"; rr(x, y - 8, d.w * T, 8, 3); cx.fill(); cx.fillStyle = "#ffb531"; cx.fillRect(x + 1, y - 7, (d.w * T - 2) * f, 2.5); cx.fillStyle = "#fff"; cx.font = "bold 6px sans-serif"; cx.textAlign = "center"; cx.fillText(tx, x + d.w * T / 2, y - 1.2); }
      else if (b.t !== "wall" && b.t !== "trap" && b.l > 0 && d.kind !== "core") { /* level tag */ cx.fillStyle = "rgba(20,30,60,.8)"; cx.beginPath(); cx.arc(x + 4, y + 4, 4.5, 0, 6.3); cx.fill(); cx.fillStyle = "#ffe08a"; cx.font = "bold 6.5px sans-serif"; cx.textAlign = "center"; cx.fillText(b.l, x + 4, y + 6.3); }
      else if (d.kind === "core") { cx.fillStyle = "rgba(20,30,60,.85)"; cx.beginPath(); cx.arc(x + 4, y + 4, 5.5, 0, 6.3); cx.fill(); cx.fillStyle = "#ffe08a"; cx.font = "bold 8px sans-serif"; cx.textAlign = "center"; cx.fillText(b.l, x + 4, y + 7); }
    }
  }
  function drawGhost() {
    var g = V.ghost, d = C.B[g.t]; if (g.paintHint) return; var x = gx + g.x * T, y = gy + g.y * T;
    cx.fillStyle = g.ok ? "rgba(90,255,120,.35)" : "rgba(255,70,70,.4)"; cx.fillRect(x, y, d.w * T, d.h * T);
    cx.globalAlpha = 0.85; drawBuilding({t: g.t, x: g.x, y: g.y, l: g.l || 1}, "p", {}); cx.globalAlpha = 1;
    if (d.kind === "def") { cx.strokeStyle = "rgba(255,255,255,.55)"; cx.setLineDash([3, 3]); cx.beginPath(); cx.arc(x + d.w * T / 2, y + d.h * T / 2, d.rng * T, 0, 6.3); cx.stroke(); cx.setLineDash([]); }
  }

  // ---------- raid mode ----------
  function drawRaid() {
    var sim = V.sim; if (!sim) return; var wl = (function () { var m = {}; sim.bld.forEach(function (b) { if (b.t === "wall" && !b.dead) m[b.x + "," + b.y] = 1; }); return function (x, y) { return m[x + "," + y]; }; })();
    var th = V.theme, opts = {wallAt: wl, showTraps: V.scoutTraps};
    if (V.showDeploy) { var rg = C.RING * T, pulse = 0.16 + Math.sin(V.t * 5) * 0.06; cx.save(); cx.beginPath(); cx.rect(gx, gy, GW, GW); cx.rect(gx + rg, gy + rg, GW - 2 * rg, GW - 2 * rg); cx.fillStyle = "rgba(255,225,80," + pulse + ")"; cx.fill("evenodd"); cx.strokeStyle = "rgba(255,225,80,.55)"; cx.lineWidth = 1.5; cx.setLineDash([5, 4]); cx.strokeRect(gx + rg, gy + rg, GW - 2 * rg, GW - 2 * rg); cx.restore(); }
    // rubble
    sim.bld.forEach(function (b) { if (b.dead && b.kind !== "trap") { var d = C.B[b.t]; cx.fillStyle = b.kind === "wall" ? "rgba(70,50,30,.45)" : "rgba(40,30,30,.6)"; rr(gx + b.x * T + 1, gy + b.y * T + 1, d.w * T - 2, d.h * T - 2, 3); cx.fill(); if (b.kind !== "wall") { cx.fillStyle = "rgba(120,110,100,.7)"; cx.fillRect(gx + b.x * T + 3, gy + b.y * T + d.h * T - 5, 5, 3); cx.fillRect(gx + b.x * T + d.w * T - 9, gy + b.y * T + d.h * T - 8, 4, 4); } } });
    // buildings (alive), sorted
    var live = sim.bld.filter(function (b) { return !b.dead; }).sort(function (a, b) { return (a.y + a.h) - (b.y + b.h); });
    live.forEach(function (b) { drawBuilding(b, th, opts); });
    // defence range hint while scouting
    if (V.scout) live.forEach(function (b) { if (b.kind === "def") { cx.strokeStyle = "rgba(255,90,90,.35)"; cx.lineWidth = 1; cx.beginPath(); cx.arc(gx + b.cx * T, gy + b.cy * T, b.rng * T, 0, 6.3); cx.stroke(); } });
    // hp bars (buildings)
    live.forEach(function (b) { if (b.hp < b.mx && b.kind !== "trap") { if (b.kind === "wall" && b.hp > b.mx * 0.7) return; hpBar(gx + b.cx * T, gy + b.y * T - 2, b.kind === "wall" ? 9 : b.w * T * 0.8, b.hp / b.mx, "#6aff6a"); } });
    // units
    var us = sim.tr.concat(sim.df).sort(function (a, b) { return a.y - b.y; });
    us.forEach(function (u) { drawUnit(u); });
    // zones
    sim.zones.forEach(function (z) { var col = z.k === "rain" ? "94,200,255" : "255,154,60"; var px = gx + z.x * T, py = gy + z.y * T, f = z.t / z.dur; cx.fillStyle = "rgba(" + col + "," + (0.18 + 0.1 * Math.sin(V.t * 6)) + ")"; cx.beginPath(); cx.arc(px, py, z.r * T, 0, 6.3); cx.fill(); cx.strokeStyle = "rgba(" + col + ",.8)"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(px, py, z.r * T * (0.6 + 0.4 * f), 0, 6.3); cx.stroke();
      if (z.k === "rain") { cx.strokeStyle = "rgba(180,230,255,.8)"; cx.lineWidth = 1; for (var k = 0; k < 7; k++) { var ax = px + Math.cos(k * 1.9 + V.t) * z.r * T * 0.7, ay = py + ((V.t * 40 + k * 13) % 30) - 20; cx.beginPath(); cx.moveTo(ax, ay); cx.lineTo(ax - 1, ay + 5); cx.stroke(); } } });
  }
  var UCOL = {bruiser: "#ff9a3c", slinger: "#7fd0ff", roller: "#e8d070", drone: "#9aff7a", hero: "#ffd35a"};
  function drawUnit(u) {
    var x = gx + u.x * T, y = gy + u.y * T, bob = Math.abs(Math.sin(V.t * 9 + u.wob)) * (u.mv ? 1.8 : 0.4), sz = u.sz * 1.2 * (u.team === "d" ? 0.95 : 1);
    if (u.mv > 0) u.mv -= 0.05;
    if (u.fly) { cx.fillStyle = "rgba(0,0,0,.22)"; cx.beginPath(); cx.ellipse(x, y + 4, sz * 0.3, sz * 0.12, 0, 0, 6.3); cx.fill(); y -= 10 + Math.sin(V.t * 6 + u.wob) * 1.5; }
    else { cx.fillStyle = "rgba(0,0,0,.28)"; cx.beginPath(); cx.ellipse(x, y + 1, sz * 0.32, sz * 0.12, 0, 0, 6.3); cx.fill(); }
    var art = u.art === "hero" ? "bg_front" : u.art === "decoy" ? "u_guard" : u.art, flip = u.face < 0;
    if (u.art === "snatcher" || u.art === "stinger" || u.art === "tank") flip = false;
    if (u.team === "d" && (u.art === "u_slinger" || u.art === "u_bruiser" || u.art === "u_guard" || u.art === "u_roller" || u.art === "u_drone")) { /* friendly crew on player base */ }
    if (u.decoy) cx.globalAlpha = 0.85;
    if (u.art === "hero") { cx.strokeStyle = "rgba(255,211,90," + (0.5 + 0.3 * Math.sin(V.t * 6)) + ")"; cx.lineWidth = 1.5; cx.beginPath(); cx.ellipse(x, y, 13, 5, 0, 0, 6.3); cx.stroke(); }
    if (u.ab > 0) { cx.fillStyle = "rgba(255,181,49,.35)"; cx.beginPath(); cx.arc(x, y - 8, 16, 0, 6.3); cx.fill(); }
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
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.drawImage(ground, 0, 0);
    var s = sc * dpr, sh = V.shake > 0 ? (Math.random() - 0.5) * V.shake * 8 : 0;
    cx.setTransform(s, 0, 0, s, sh * s, (V.shake > 0 ? (Math.random() - 0.5) * V.shake * 8 : 0) * s);
    if (!ready) { cx.fillStyle = "#fff"; cx.font = "bold 14px sans-serif"; cx.textAlign = "center"; cx.fillText("Loading art...", 180, Hl / 2); return; }
    drawGroundProps();
    if (V.mode === "base") drawBase(); else drawRaid();
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
  };

  // ---------- input ----------
  var drag = null, lastDep = 0;
  function down(e) {
    if (V.cb.audio) V.cb.audio(); var t = tileXY(e.clientX, e.clientY), x = t[0], y = t[1]; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); drag = {x0: x, y0: y, moved: false, id: e.pointerId, onGhost: false};
    if (V.mode === "raid") { if (V.cb.raidTap) V.cb.raidTap(x, y, true); return; }
    if (V.paint) { V.paint.on = true; V.cb.paintAt && V.cb.paintAt(Math.floor(x), Math.floor(y)); return; }
    if (V.ghost) { var g = V.ghost, d = C.B[g.t]; if (x >= g.x - 1 && x <= g.x + d.w + 1 && y >= g.y - 1 && y <= g.y + d.h + 1) { drag.onGhost = true; drag.off = [x - g.x, y - g.y]; return; } }
  }
  function move(e) {
    if (!drag || e.pointerId !== drag.id) return; var t = tileXY(e.clientX, e.clientY), x = t[0], y = t[1];
    if (Math.hypot(x - drag.x0, y - drag.y0) > 0.4) drag.moved = true;
    if (V.mode === "raid") { if (drag.moved && V.cb.raidTap) V.cb.raidTap(x, y, false); return; }
    if (V.paint && V.paint.on) { V.cb.paintAt && V.cb.paintAt(Math.floor(x), Math.floor(y)); return; }
    if (V.ghost && drag.onGhost) { V.cb.ghostMove && V.cb.ghostMove(Math.round(x - drag.off[0]), Math.round(y - drag.off[1])); }
  }
  function up(e) {
    if (!drag || e.pointerId !== drag.id) return; var t = tileXY(e.clientX, e.clientY), x = t[0], y = t[1], d = drag; drag = null;
    if (V.mode === "raid") { V.cb.raidUp && V.cb.raidUp(); return; }
    if (V.paint) { V.paint.on = false; V.cb.paintEnd && V.cb.paintEnd(); return; }
    if (V.ghost) { if (!d.moved && !d.onGhost) V.cb.ghostMove && V.cb.ghostMove(Math.round(x - C.B[V.ghost.t].w / 2), Math.round(y - C.B[V.ghost.t].h / 2)); return; }
    if (!d.moved) V.cb.tap && V.cb.tap(x, y);
  }
  V.dims = function () { return {Hl: Hl, gy: gy, GW: GW}; };
})();
