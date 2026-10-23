"use strict";
// ---- Battle engine: top-down farm defense on a 360xH logical canvas ----
(function () {
  var cv, ctx, W = 360, H = 640, scale = 1, dpr = 1, B = null, raf = 0, lastT = 0, onEnd = null, ground = null;
  var PI = Math.PI, TAU = PI * 2, rnd = Math.random;
  function R(a, b) { return a + rnd() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function ang(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
  var keys = {}, joy = {id: null, ox: 0, oy: 0, x: 0, y: 0, on: false}, btnPress = false, ptrs = {};
  var BTN = {x: 0, y: 0, r: 36};
  var PAUSE = {x: 26, y: 26, r: 18};

  var Battle = {timeScale: 1, bot: false, active: false};
  BB.Battle = Battle;

  // ---------- layout ----------
  function resize() {
    if (!cv) return;
    var host = cv.parentNode, cw = host.clientWidth, ch = host.clientHeight;
    if (!cw || !ch) return;
    H = clamp(Math.round(360 * ch / cw), 640, 820);
    scale = Math.min(cw / W, ch / H);
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.style.width = Math.floor(W * scale) + "px"; cv.style.height = Math.floor(H * scale) + "px";
    cv.width = Math.floor(W * scale * dpr); cv.height = Math.floor(H * scale * dpr);
    BTN.x = W - 48; BTN.y = H - 64; SC = {};
    if (B) { buildGround(); }
  }
  window.addEventListener("resize", function () { if (Battle.active) resize(); });

  function arena() { return {x0: 22, y0: 74, x1: W - 22, y1: H - 56}; }

  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function layout() { var a = arena(); return {fx: W / 2, fy: Math.round(a.y0 + (a.y1 - a.y0) * 0.60)}; }

  // ---------- create ----------
  Battle.start = function (mi, opts, cb) {
    cv = document.getElementById("cv"); ctx = cv.getContext("2d");
    onEnd = cb; opts = opts || {};
    var m = BB.MISSIONS[mi - 1], lvl = BB.S.lvl, pw = BB.POWER[lvl];
    Battle.active = true;
    resize();
    var L = layout(), a = arena();
    B = {mi: mi, m: m, boss: !!m.boss, t: 0, over: false, overT: 0, paused: false, shake: 0, flash: 0, flashCol: "#fff", slow: 0,
      hpm: 1 + 0.09 * (mi - 1), dmgm: 1 + 0.05 * (mi - 1), lvl: lvl, dm: pw[1] / 100,
      P: {x: W / 2, y: L.fy - 130, r: 13, hp: 170 * pw[0] / 100, max: 170 * pw[0] / 100, face: -PI / 2, aim: -PI / 2, fire: 0, wallCd: 0, inv: 0, usedWall: false, mx: 0, my: 0, walk: 0, mv: 0, view: null, hit: 0, muz: 0, spec: 0},
      enemies: [], bullets: [], parts: [], texts: [], pick: [], walls: [], beams: [], tele: [],
      silos: [{x: L.fx - 112, y: L.fy - 8, hp: 100, max: 100, flash: 0, dead: false}, {x: L.fx + 112, y: L.fy - 8, hp: 100, max: 100, flash: 0, dead: false}],
      animals: [], lootCoins: 0, lootSalv: 0, kills: 0, lost: 0, rescued: 0, usedRevive: false, specialUses: 0,
      acc: {sn: 2.5, wk: m.wk ? 9 : 99999, py: 8}, hint: "", hintT: 0, sawGrab: false, dark: 0, finisher: false, ultDone: false, victoryT: 0,
      bossState: null, cam: 0, mute: false, resultSent: false, bonusLife: 0};
    for (var i = 0; i < m.animals; i++) {
      var an = BB.ANIMALS[i], col = i % 3, row = Math.floor(i / 3);
      var hx = L.fx - 52 + col * 52 + R(-6, 6), hy = L.fy - 18 + row * 36 + R(-4, 4);
      B.animals.push({name: an.name, kind: an.kind, x: hx, y: hy, hx: hx, hy: hy, wx: hx, wy: hy, state: "idle", hp: 30, max: 30, claimed: null, carrier: null, fall: 0, wt: R(0, 3), flash: 0});
    }
    B.fx = []; B.later = []; B.banner = null; B.at = 0; B.introT = 0; B.coinBump = 0; B.salvBump = 0; B.cl = initClouds(); B.tgt = null;
    if (B.boss) { startBoss(); B.t = 0; B.introT = 3.6; }
    else { B.banner = {t0: 0, dur: 2.6, title: "MISSION " + mi, sub: m.name.toUpperCase(), kind: "win"}; }
    loadAssets();
    BB.track("mission_start", {m: mi, lvl: lvl, coins: BB.S.coins});
    buildGround();
    Battle.paused = false;
    if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); }
    BB.sfx("click");
  };
  Battle.stop = function () { Battle.active = false; if (raf) cancelAnimationFrame(raf); raf = 0; B = null; joy.on = false; joy.id = null; ptrs = {}; keys = {}; };
  Battle.state = function () { return B; };

  function startBoss() {
    var a = arena();
    B.bs = {phase: 1, arkX: W / 2, arkY: a.y0 + 8, arkDir: 1, beamT: 3.5, snT: 7, emitters: 0, vor: null, slamN: 0, hint: "KILL THE BEAM EMITTERS!"};
    [-92, 0, 92].forEach(function (dx) {
      var e = mkEnemy("emitter", W / 2 + dx, a.y0 + 40); e.ox = dx; B.enemies.push(e); B.bs.emitters++;
    });
    B.hint = "Shoot the Ark's beam emitters! Dodge the purple beams."; B.hintT = 6;
  }

  // ---------- enemies ----------
  function mkEnemy(type, x, y) {
    var hpm = B.hpm, e = {type: type, x: x, y: y, flash: 0, t: R(0, 10), state: "seek", hx: 0, hy: 1, carry: null, hitCd: 0, id: Math.random()};
    switch (type) {
      case "snatcher": e.hp = 24 * hpm; e.r = 9; e.sp = 70; e.fly = true; break;
      case "leech": e.hp = 75 * hpm; e.r = 12; e.sp = 30; e.drain = 7; break;
      case "tank": e.hp = 230 * hpm; e.r = 17; e.sp = 19; e.drain = 12; break;
      case "stinger": e.hp = 9 * hpm; e.r = 6; e.sp = 86; e.fly = true; break;
      case "pylon": e.hp = 150 * hpm; e.r = 15; e.sp = 0; e.spawnT = 3; e.grow = 0; break;
      case "emitter": e.hp = 300; e.r = 15; e.sp = 0; e.fly = true; break;
      case "vorlax": e.hp = 1000; e.r = 32; e.sp = 26; e.fly = false; break;
    }
    e.max = e.hp; return e;
  }
  function spawnEdge() {
    var a = arena(), s = rnd();
    if (s < .6) return {x: R(a.x0, a.x1), y: -20};
    if (s < .8) return {x: -20, y: R(a.y0 - 40, H * .5)};
    return {x: W + 20, y: R(a.y0 - 40, H * .5)};
  }
  function spawnGroup() {
    var m = B.m, t = B.t;
    B.acc.sn -= 1 / 60 * 0; // placeholder (dt handled in update)
  }

  // ---------- input ----------
  function toLogical(ev) { var rc = cv.getBoundingClientRect(); return {x: (ev.clientX - rc.left) / rc.width * W, y: (ev.clientY - rc.top) / rc.height * H}; }
  function bind() {
    if (bind.done) return; bind.done = true;
    cv = document.getElementById("cv");
    cv.addEventListener("pointerdown", function (ev) {
      if (!B) return; ev.preventDefault(); BB.audioInit();
      var p = toLogical(ev);
      if (B.paused) { pausedTap(p); return; }
      if (B.introT > 0.5) { B.introT = 0.5; return; }
      if (dist(p.x, p.y, PAUSE.x, PAUSE.y) < PAUSE.r + 8) { B.paused = true; return; }
      if (B.over) return;
      if (dist(p.x, p.y, BTN.x, BTN.y) < BTN.r + 12) { btnPress = true; ptrs[ev.pointerId] = "btn"; try { cv.setPointerCapture(ev.pointerId); } catch (e) {} return; }
      if (joy.id === null) {
        joy.id = ev.pointerId; joy.on = true; joy.ox = joy.x = p.x; joy.oy = joy.y = p.y; try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
      }
    });
    cv.addEventListener("pointermove", function (ev) { if (joy.id === ev.pointerId) { var p = toLogical(ev); joy.x = p.x; joy.y = p.y; } });
    function up(ev) { if (joy.id === ev.pointerId) { joy.id = null; joy.on = false; } delete ptrs[ev.pointerId]; }
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    window.addEventListener("keydown", function (e) {
      keys[e.key.toLowerCase()] = true;
      if ((e.key === " " || e.key === "e") && B && !B.paused) btnPress = true;
      if ((e.key === "Escape" || e.key === "p") && B && !B.over) B.paused = !B.paused;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].indexOf(e.key.toLowerCase()) >= 0 && Battle.active) e.preventDefault();
    });
    window.addEventListener("keyup", function (e) { keys[e.key.toLowerCase()] = false; });
    document.addEventListener("visibilitychange", function () { if (document.hidden && B && !B.over) B.paused = true; });
  }
  window.addEventListener("DOMContentLoaded", function () { bind(); loadAssets(); });
  function pausedTap(p) {
    if (p.y > H / 2 - 70 && p.y < H / 2 - 10) { B.paused = false; BB.sfx("click"); }
    else if (p.y > H / 2 + 10 && p.y < H / 2 + 70) { quit(); }
  }
  function quit() {
    BB.track("mission_end", {m: B.mi, win: false, abandon: true, sec: Math.round(B.t), saved: 0});
    var cb = onEnd; Battle.stop(); if (cb) cb({quit: true});
  }
  function inputVec() {
    var x = 0, y = 0;
    if (keys["a"] || keys["arrowleft"]) x -= 1; if (keys["d"] || keys["arrowright"]) x += 1;
    if (keys["w"] || keys["arrowup"]) y -= 1; if (keys["s"] || keys["arrowdown"]) y += 1;
    if (joy.on) { var dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.sqrt(dx * dx + dy * dy), mx = 44; if (d > 6) { var k = Math.min(1, d / mx); x = dx / d * k; y = dy / d * k; }
      if (d > mx) { joy.ox = joy.x - dx / d * mx; joy.oy = joy.y - dy / d * mx; } }
    var l = Math.sqrt(x * x + y * y); if (l > 1) { x /= l; y /= l; }
    return {x: x, y: y};
  }

  // ---------- main loop ----------
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (!B) return;
    if (!B.paused) B.at += dt;
    if (!B.paused) {
      var tot = dt * Math.max(1, Battle.timeScale), steps = Math.max(1, Math.ceil(tot / (1 / 60)));
      for (var i = 0; i < steps; i++) update(tot / steps * (B.slow > 0 ? .35 : 1));
    }
    if (B) draw();
  }
  Battle._step = function (dt) { if (B) update(dt); };
  Battle._draw = function () { if (B) draw(); };

  // ---------- helpers ----------
  function pop(x, y, txt, col, size) { if (B.texts.length > 34) B.texts.shift(); B.texts.push({x: x, y: y, vy: -34, life: .8, max: .8, txt: txt, col: col || "#fff", size: size || 12}); }
  function burst(x, y, col, n, sp, sz) {
    n = Math.min(n, 40); for (var i = 0; i < n; i++) { var a = rnd() * TAU, v = R(.3, 1) * (sp || 100); B.parts.push({x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(.35, .7) * (sz || 1), max: .7 * (sz || 1), col: col, sz: R(1.5, 3.2)}); }
    if (B.parts.length > 220) B.parts.splice(0, B.parts.length - 220);
  }
  function shake(v) { B.shake = Math.max(B.shake, v); }
  function flash(col, v) { B.flashCol = col; B.flash = v; }
  function aliveAnimals() { return B.animals.filter(function (a) { return a.state !== "gone"; }); }
  function aliveSilos() { return B.silos.filter(function (s) { return !s.dead; }); }
  function nearest(list, x, y, pred) { var best = null, bd = 1e9; for (var i = 0; i < list.length; i++) { var o = list[i]; if (pred && !pred(o)) continue; var d = dist(x, y, o.x, o.y); if (d < bd) { bd = d; best = o; } } return best; }
  function hurtPlayer(d, srcx, srcy) { 
    var P = B.P; if (P.inv > 0 || B.over) return;
    P.hp -= d * B.dmgm; P.inv = .55; P.hit = .3; shake(5); flash("#ff3b2e", .22); BB.sfx("hurt"); burst(P.x, P.y, "#ff6a3a", 8, 80);
    pop(P.x, P.y - 16, "-" + Math.round(d * B.dmgm), "#ff7b6a", 13);
    if (srcx !== undefined) { var a = ang(srcx, srcy, P.x, P.y); P.x += Math.cos(a) * 10; P.y += Math.sin(a) * 10; }
  }
  function hurtAnimal(an, d) {
    if (an.state === "gone") return; an.hp -= d; an.flash = .15;
    if (an.hp <= 0) loseAnimal(an);
  }
  function loseAnimal(an) {
    if (an.state === "gone") return;
    an.state = "gone"; B.lost++; burst(an.x, an.y, "#ffffff", 12, 80); BB.sfx("lost"); flash("#ff3b2e", .25); shake(4);
    pop(an.x, an.y - 10, an.name + " lost!", "#ff7b6a", 13);
  }
  function dropLoot(e, coins, salv) {
    for (var i = 0; i < coins; i++) B.pick.push({x: e.x, y: e.y, vx: R(-70, 70), vy: R(-90, -10), k: "coin", v: 2 + Math.floor(B.mi / 3), life: 9, g: 0});
    for (i = 0; i < salv; i++) B.pick.push({x: e.x, y: e.y, vx: R(-70, 70), vy: R(-90, -10), k: "salv", v: 1, life: 9, g: 0});
  }
  function killEnemy(e) {
    e.dead = true; B.kills++; BB.sfx("kill"); shake(e.type === "tank" || e.type === "pylon" ? 6 : 2.5);
    var cols = {snatcher: "#4de8ff", leech: "#ff9a3a", tank: "#e0661e", stinger: "#a6ff4a", pylon: "#c86bff", emitter: "#ff4aa8", vorlax: "#ff4aff"};
    burst(e.x, e.y, cols[e.type] || "#fff", 12, 110, 1.2); deathFx(e);
    if (e.carry) { var an = e.carry; an.state = "falling"; an.fall = .7; an.carrier = null; an.x = e.x; an.y = e.y; B.rescued++; fxAdd({k: "sp", n: "fx_stars", x: e.x, y: e.y, t: 0, dur: .8, s: 50, rot: 0}); pop(e.x, e.y - 14, "RESCUED!", "#9bffa0", 14); BB.sfx("rescue"); e.carry = null; }
    var bonus = B.hpm;
    switch (e.type) {
      case "snatcher": dropLoot(e, 1 + (rnd() < .5 ? 1 : 0), rnd() < .25 ? 1 : 0); break;
      case "leech": dropLoot(e, 2, rnd() < .6 ? 1 : 0); break;
      case "tank": dropLoot(e, 4, 2); break;
      case "stinger": if (rnd() < .35) dropLoot(e, 1, 0); break;
      case "pylon": dropLoot(e, 4, 2); break;
      case "emitter": dropLoot(e, 5, 3); break;
    }
    if (e.type === "stinger" || e.type === "snatcher") for (var i = 0; i < B.animals.length; i++) if (B.animals[i].claimed === e) B.animals[i].claimed = null;
  }
  function damageEnemy(e, d, sx, sy, kind) {
    if (e.dead) return;
    var mul = 1, clang = false;
    if (e.type === "leech" || e.type === "tank") {
      var ax = sx - e.x, ay = sy - e.y, al = Math.sqrt(ax * ax + ay * ay) || 1, dot = (ax * e.hx + ay * e.hy) / al;
      if (dot > .35) { mul = .4; clang = true; } else if (dot < -.35) { mul = 1.7; }
    }
    if (e.type === "vorlax") { mul = e.exposed ? 2.2 : .1; if (!e.exposed) clang = true; }
    var dmg = d * mul; e.hp -= dmg; e.flash = .09; dmgNum(e, dmg, mul);
    if (clang) { BB.sfx("clang"); if (rnd() < .4) pop(e.x, e.y - 12, "CLANG", "#ffe08a", 10); } else { BB.sfx("hit"); if (mul > 1.5 && rnd() < .5) pop(e.x, e.y - 12, "BACK HIT", "#ff9bd0", 10); }
    if (e.type === "vorlax" && e.hp > 0) B.bs.vor_hp = e.hp;
    if (e.hp <= 0) {
      if (e.type === "vorlax") { vorDie(e); return; }
      killEnemy(e);
    }
  }

  // ---------- update ----------
  function update(dt) {
    var P = B.P, m = B.m, a = arena(), L = layout();
    if (B.introT > 0) { B.introT -= dt; updateFx(dt); return; }
    B.t += dt; B.slow = Math.max(0, B.slow - dt);
    B.shake = Math.max(0, B.shake - dt * 22); B.flash = Math.max(0, B.flash - dt);
    if (B.hintT > 0) B.hintT -= dt;
    if (B.over) { B.overT += dt; updateFx(dt); if (B.overT > (B.win ? 1.6 : 1.2) && !B.resultSent) finish(); return; }

    // player input
    var iv = Battle.bot ? botInput() : inputVec();
    var spd = 112 * (1 + (B.lvl - 1) * .012);
    var moving = iv.x * iv.x + iv.y * iv.y > .01;
    P.x = clamp(P.x + iv.x * spd * dt, a.x0 + 8, a.x1 - 8); P.y = clamp(P.y + iv.y * spd * dt, a.y0 - 4, a.y1 - 8);
    if (moving) { P.face = Math.atan2(iv.y, iv.x); P.walk += dt * 9; P.dustT = (P.dustT || 0) - dt; if (P.dustT <= 0) { P.dustT = .11; dust(P.x - iv.x * 5, P.y + 12, 1); } }
    P.mv += ((moving ? 1 : 0) - P.mv) * Math.min(1, dt * 10); P.hit = Math.max(0, P.hit - dt); P.muz = Math.max(0, P.muz - dt); P.spec = Math.max(0, P.spec - dt);
    P.inv = Math.max(0, P.inv - dt); P.fire -= dt; P.wallCd = Math.max(0, P.wallCd - dt);

    // auto-aim
    var range = 175, tgt = null, bs = 1e9;
    for (var i = 0; i < B.enemies.length; i++) {
      var e = B.enemies[i]; if (e.dead) continue; if (e.type === "vorlax" && e.state === "arrive") continue;
      var d = dist(P.x, P.y, e.x, e.y) - e.r; if (d > range) continue;
      var sc = d - (e.carry ? 90 : 0) - (e.type === "pylon" ? 10 : 0); if (sc < bs) { bs = sc; tgt = e; }
    }
    if (tgt) { P.aim = ang(P.x, P.y, tgt.x, tgt.y); } else P.aim = P.face;
    B.tgt = tgt || null;
    if (tgt && P.fire <= 0) {
      P.fire = Math.max(.14, .27 - B.lvl * .009);
      var dmg = 15 * B.dm, shots = B.lvl >= 10 ? 2 : 1;
      for (var s = 0; s < shots; s++) {
        var aa = P.aim + (shots > 1 ? (s ? .1 : -.1) : 0);
        B.bullets.push({x: P.x + Math.cos(aa) * 14, y: P.y + Math.sin(aa) * 14, vx: Math.cos(aa) * 430, vy: Math.sin(aa) * 430, dmg: dmg, life: .6, sx: P.x, sy: P.y, tr: []});
      }
      BB.sfx("shoot"); P.muz = .08;
    }

    // special
    if (btnPress) {
      btnPress = false;
      if (B.finisher && !B.ultDone) useUlt();
      else if (P.wallCd <= 0) {
        var wa = tgt ? P.aim : P.face, wd = 40;
        B.walls.push({x: P.x + Math.cos(wa) * wd, y: P.y + Math.sin(wa) * wd, a: wa + PI / 2, len: 100 + (B.lvl >= 4 ? 20 : 0), life: 4 + (B.lvl >= 4 ? 1 : 0), max: 4 + (B.lvl >= 4 ? 1 : 0)});
        P.wallCd = B.lvl >= 7 ? 9 : 12; P.usedWall = true; B.specialUses++; BB.sfx("wall"); shake(4); burst(P.x + Math.cos(wa) * wd, P.y + Math.sin(wa) * wd, "#e8c25a", 10, 90); wallFx(P.x + Math.cos(wa) * wd, P.y + Math.sin(wa) * wd); P.spec = .55;
        BB.track("special_used", {m: B.mi, t: Math.round(B.t)});
      } else { BB.sfx("deny"); }
    }
    for (i = B.walls.length - 1; i >= 0; i--) { B.walls[i].life -= dt; B.walls[i].age = (B.walls[i].age || 0) + dt; if (B.walls[i].life <= 0) B.walls.splice(i, 1); }

    director(dt);

    // enemies
    for (i = 0; i < B.enemies.length; i++) updateEnemy(B.enemies[i], dt);
    B.enemies = B.enemies.filter(function (e) { return !e.dead && !e.gone; });
    // enemy separation (cheap)
    for (i = 0; i < B.enemies.length; i++) for (var j = i + 1; j < B.enemies.length; j++) {
      var e1 = B.enemies[i], e2 = B.enemies[j]; if (e1.type === "emitter" || e2.type === "emitter" || e1.type === "pylon" || e2.type === "pylon" || e1.type === "vorlax" || e2.type === "vorlax") continue;
      if (!!e1.fly !== !!e2.fly) continue;
      var dx = e2.x - e1.x, dy = e2.y - e1.y, dd = Math.sqrt(dx * dx + dy * dy), mn = e1.r + e2.r - 2;
      if (dd < mn && dd > .01) { var pu = (mn - dd) / 2; dx /= dd; dy /= dd; e1.x -= dx * pu; e1.y -= dy * pu; e2.x += dx * pu; e2.y += dy * pu; }
    }

    // bullets
    for (i = B.bullets.length - 1; i >= 0; i--) {
      var b = B.bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; if (b.tr) { b.tr.push(b.x, b.y); if (b.tr.length > 14) b.tr.splice(0, 2); } var hit = false;
      if (b.life <= 0) { B.bullets.splice(i, 1); continue; }
      for (j = 0; j < B.enemies.length; j++) {
        var en = B.enemies[j]; if (en.dead) continue; if (en.type === "vorlax" && en.state === "arrive") continue;
        if (dist(b.x, b.y, en.x, en.y) < en.r + 3) { damageEnemy(en, b.dmg, b.sx, b.sy); impact(b.x, b.y); hit = true; break; }
      }
      if (hit) B.bullets.splice(i, 1);
    }

    // animals
    for (i = 0; i < B.animals.length; i++) {
      var an = B.animals[i]; an.flash = Math.max(0, an.flash - dt); an.wt -= dt;
      if (an.state === "idle") {
        if (an.wt <= 0) { an.wt = R(1.5, 4); an.wx = an.hx + R(-14, 14); an.wy = an.hy + R(-8, 8); }
        var dd2 = dist(an.x, an.y, an.wx, an.wy); if (dd2 > 1) { an.x += (an.wx - an.x) / dd2 * 12 * dt; an.y += (an.wy - an.y) / dd2 * 12 * dt; }
      } else if (an.state === "carried") { if (an.carrier && !an.carrier.dead) { an.x = an.carrier.x; an.y = an.carrier.y + 12; } }
      else if (an.state === "falling") { an.fall -= dt; var dh = dist(an.x, an.y, an.hx, an.hy); an.x += (an.hx - an.x) * Math.min(1, dt * 2.5); an.y += (an.hy - an.y) * Math.min(1, dt * 2.5); if (an.fall <= 0) { an.state = "idle"; } }
    }
    // silos
    for (i = 0; i < B.silos.length; i++) { var si = B.silos[i]; si.flash = Math.max(0, si.flash - dt); if (si.dead ? rnd() < dt * 6 : (si.hp < si.max * .4 && rnd() < dt * 2.5)) smoke(si.x + R(-6, 6), si.y - 4); if (!si.dead && si.hp <= 0) { si.dead = true; explode(si.x, si.y - 6, 74, "e"); shake(6); flash("#ff3b2e", .3); BB.sfx("lost"); burst(si.x, si.y, "#cfd6e6", 24, 120, 1.4); pop(si.x, si.y - 18, "Silo drained!", "#ff7b6a", 13); } }

    // pickups
    for (i = B.pick.length - 1; i >= 0; i--) {
      var pk = B.pick[i]; pk.life -= dt; pk.g += dt;
      if (pk.g < .4) { pk.x += pk.vx * dt; pk.y += pk.vy * dt; pk.vy += 260 * dt; pk.vx *= .96; }
      var dp = dist(pk.x, pk.y, P.x, P.y);
      if (pk.g > .3 && dp < 90) { var pa = ang(pk.x, pk.y, P.x, P.y); pk.x += Math.cos(pa) * 280 * dt; pk.y += Math.sin(pa) * 280 * dt; }
      if (dp < 15) {
        if (pk.k === "coin") { B.lootCoins += pk.v; B.coinBump = .3; BB.sfx("coin"); burst(P.x, P.y - 6, "#ffd23a", 3, 50, .7); if (rnd() < .5) pop(P.x + R(-8, 8), P.y - 18, "+" + pk.v, "#ffd23a", 11); }
        else { B.lootSalv += pk.v; B.salvBump = .3; BB.sfx("salv"); pop(P.x + R(-8, 8), P.y - 18, "+1 salvage", "#cfd6e6", 10); }
        B.pick.splice(i, 1); continue;
      }
      if (pk.life <= 0) B.pick.splice(i, 1);
    }
    updateFx(dt);

    // hints (mission 1 tutorial)
    if (B.mi === 1 && !B.boss) {
      var h = "";
      if (B.t < 7) h = "Drag anywhere to move Baleguard"; else if (B.t < 16) h = "Baleguard auto-fires at the nearest enemy";
      if (B.sawGrab && B.t < 40) h = "A drone grabbed an animal! Shoot it to rescue!";
      if (!h && B.t > 24 && !P.usedWall && B.t < 60) h = "Tap BALE WALL to block enemies for 4 s";
      B.hint = h; B.hintT = h ? 1 : 0;
    }

    // win / lose
    if (!B.over) {
      var left = aliveAnimals().length, sl = aliveSilos().length;
      if (P.hp <= 0) lose("mech");
      else if (left === 0) lose("herd");
      else if (sl === 0) lose("silos");
      else if (!B.boss && B.t >= m.dur) win();
    }
  }
  function updateFx(dt) {
    var i;
    for (i = B.parts.length - 1; i >= 0; i--) { var p = B.parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .93; p.vy *= .93; if (p.life <= 0) B.parts.splice(i, 1); }
    for (i = B.texts.length - 1; i >= 0; i--) { var t = B.texts[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= .95; if (t.life <= 0) B.texts.splice(i, 1); }
    for (i = B.fx.length - 1; i >= 0; i--) { var f = B.fx[i]; f.t += dt; if (f.t >= f.dur) B.fx.splice(i, 1); }
    for (i = B.later.length - 1; i >= 0; i--) { var l = B.later[i]; l.t -= dt; if (l.t <= 0) { B.later.splice(i, 1); l.f(); } }
    B.coinBump = Math.max(0, B.coinBump - dt); B.salvBump = Math.max(0, B.salvBump - dt);
  }

  // ---------- director (normal missions) ----------
  function director(dt) {
    var m = B.m, ac = B.acc, a = arena();
    if (B.boss) return bossUpdate(dt);
    var remaining = m.dur - B.t;
    if (remaining < 6) return; // let the last seconds breathe
    var cnt = function (t) { return B.enemies.filter(function (e) { return e.type === t && !e.dead; }).length; };
    ac.sn -= dt;
    if (m.sn && ac.sn <= 0) {
      ac.sn = m.sn * 1.2 * R(.8, 1.2);
      var n = 1 + Math.floor((B.mi - 1) / 4) + (B.t > m.dur * .6 && B.mi > 4 ? 1 : 0); if (B.mi === 1) n = B.t < 30 ? 1 : 2;
      if (cnt("snatcher") < 2 + Math.ceil(B.mi / 2)) for (var i = 0; i < n; i++) { var sp = spawnEdge(), e = mkEnemy("snatcher", sp.x + i * 14, sp.y); B.enemies.push(e); }
    }
    ac.wk -= dt;
    if (m.wk && ac.wk <= 0) {
      ac.wk = m.wk * 1.3 * R(.8, 1.2);
      var tanks = cnt("tank");
      var useTank = m.tank > tanks && rnd() < .45;
      var sp2 = {x: R(a.x0 + 20, a.x1 - 20), y: a.y0 - 10}, e2 = mkEnemy(useTank ? "tank" : "leech", sp2.x, sp2.y);
      B.enemies.push(e2);
      if (!useTank && B.mi >= 6 && rnd() < .5) B.enemies.push(mkEnemy("leech", sp2.x + R(-30, 30), sp2.y - 16));
      pop(e2.x, Math.max(e2.y + 30, 90), "Siphon Legion!", "#ffb066", 11);
    }
    ac.py -= dt;
    if (m.py && ac.py <= 0) {
      ac.py = 22 * R(.8, 1.1);
      if (cnt("pylon") < m.py) {
        var L = layout(), px, py, tries = 0;
        do { px = R(a.x0 + 24, a.x1 - 24); py = R(a.y0 + 20, L.fy - 90); tries++; } while (dist(px, py, B.P.x, B.P.y) < 90 && tries < 10);
        var pe = mkEnemy("pylon", px, py); B.enemies.push(pe); pop(px, py + 22, "Spore Pylon!", "#d28bff", 11); BB.sfx("warn");
      }
    }
  }

  // ---------- enemy AI ----------
  function wallPush(e, rad) {
    for (var i = 0; i < B.walls.length; i++) {
      var w = B.walls[i], cx = Math.cos(w.a), cy = Math.sin(w.a), hl = w.len / 2;
      var px = e.x - w.x, py = e.y - w.y, t = clamp(px * cx + py * cy, -hl, hl), qx = w.x + cx * t, qy = w.y + cy * t;
      var dx = e.x - qx, dy = e.y - qy, d = Math.sqrt(dx * dx + dy * dy), mn = rad + 7;
      if (d < mn) { if (d < .01) { dx = -cy; dy = cx; d = 1; } e.x += dx / d * (mn - d); e.y += dy / d * (mn - d); e.blocked = .2; }
    }
  }
  function updateEnemy(e, dt) {
    var ox0 = e.x, oy0 = e.y;
    var P = B.P; e.t += dt; e.flash = Math.max(0, e.flash - dt); e.hitCd = Math.max(0, e.hitCd - dt); e.blocked = Math.max(0, (e.blocked || 0) - dt);
    var a = arena(), i, tg, d, ang0;
    switch (e.type) {
      case "snatcher":
        if (e.state === "seek") {
          tg = nearest(B.animals, e.x, e.y, function (an) { return an.state === "idle" && (!an.claimed || an.claimed === e || an.claimed.dead); });
          if (tg) { tg.claimed = e; moveTo(e, tg.x, tg.y, e.sp, dt); e.hx = Math.cos(ang(e.x, e.y, tg.x, tg.y)); e.hy = Math.sin(ang(e.x, e.y, tg.x, tg.y));
            if (dist(e.x, e.y, tg.x, tg.y) < 11) { tg.state = "carried"; tg.carrier = e; e.carry = tg; e.state = "flee"; tg.claimed = null; B.sawGrab = true; BB.sfx("grab"); pop(e.x, e.y - 14, "GRABBED!", "#4de8ff", 12); flash("#4de8ff", .12); } }
          else { // no free animals: harass the mech
            var ca = e.t * 1.6; moveTo(e, P.x + Math.cos(ca) * 50, P.y + Math.sin(ca) * 50, e.sp, dt);
          }
        } else {
          var ex = nearestExit(e); moveTo(e, ex.x, ex.y, e.sp * 1.1, dt); e.hx = Math.cos(ang(e.x, e.y, ex.x, ex.y)); e.hy = Math.sin(ang(e.x, e.y, ex.x, ex.y));
          if (e.x < -22 || e.x > W + 22 || e.y < -22 || e.y > H + 22) { if (e.carry) { loseAnimal(e.carry); B.animals.forEach(function (x) { if (x === e.carry) x.carrier = null; }); } e.carry = null; e.gone = true; }
        }
        if (e.hitCd <= 0 && dist(e.x, e.y, P.x, P.y) < e.r + P.r) { hurtPlayer(5, e.x, e.y); e.hitCd = 1.2; }
        break;
      case "leech": case "tank":
        tg = nearest(B.silos, e.x, e.y, function (s) { return !s.dead; });
        var tx, ty, dsil = 1e9;
        if (tg) { tx = tg.x; ty = tg.y; dsil = dist(e.x, e.y, tx, ty); } else { var aa = nearest(B.animals, e.x, e.y, function (an) { return an.state !== "gone"; }); if (aa) { tx = aa.x; ty = aa.y; } else { tx = P.x; ty = P.y; } }
        // chase mech if it is very close and in the way
        var dpm = dist(e.x, e.y, P.x, P.y); if (dpm < 55 && B.mi > 1) { tx = P.x; ty = P.y; }
        if (tg && dsil < 30) { // drain
          e.hx = (tx - e.x) / dsil; e.hy = (ty - e.y) / dsil; tg.hp -= e.drain * dt * (1 + .05 * B.mi); tg.flash = .1; e.state = "drain"; e.drTg = tg;
          if (rnd() < dt * 10) burst(tg.x, tg.y, "#ff9a3a", 1, 40, .8);
        } else { e.state = "walk"; moveTo(e, tx, ty, e.sp, dt, true); }
        wallPush(e, e.r);
        if (dpm < e.r + P.r + 2 && e.hitCd <= 0) { hurtPlayer(e.type === "tank" ? 14 : 9, e.x, e.y); e.hitCd = .8; }
        break;
      case "stinger":
        tg = nearest(B.animals, e.x, e.y, function (an) { return an.state === "idle" || an.state === "falling"; });
        var stx = P.x, sty = P.y; if (tg && dist(e.x, e.y, tg.x, tg.y) < 600) { stx = tg.x; sty = tg.y; }
        moveTo(e, stx + Math.sin(e.t * 7) * 6, sty + Math.cos(e.t * 6) * 6, e.sp, dt);
        if (tg && dist(e.x, e.y, tg.x, tg.y) < 12) { hurtAnimal(tg, 4 * dt * (1 + .05 * B.mi)); if (rnd() < dt * 4) burst(tg.x, tg.y, "#a6ff4a", 2, 40, .7); }
        if (dist(e.x, e.y, P.x, P.y) < e.r + P.r && e.hitCd <= 0) { hurtPlayer(5, e.x, e.y); e.hitCd = .7; }
        wallPush(e, e.r);
        break;
      case "pylon":
        e.grow = Math.min(1, e.grow + dt * 1.5); e.spawnT -= dt;
        if (e.spawnT <= 0) {
          e.spawnT = 6.2 - Math.min(2, B.mi * .15);
          var stn = B.enemies.filter(function (x) { return x.type === "stinger"; }).length;
          if (stn < 8 + B.mi) for (i = 0; i < 2; i++) { var st = mkEnemy("stinger", e.x + R(-10, 10), e.y + R(-10, 10)); B.enemies.push(st); }
          burst(e.x, e.y, "#c86bff", 8, 60); BB.sfx("warn");
        }
        break;
      case "emitter":
        e.x = B.bs.arkX + e.ox; e.y = B.bs.arkY + 34; break;
      case "vorlax": vorlaxAI(e, dt); break;
    }
    var mdx = e.x - ox0, mdy = e.y - oy0;
    if (mdx * mdx + mdy * mdy > .0004) { var ta = Math.atan2(mdy, mdx); if (e.va === undefined) e.va = ta; else { var dd = ta - e.va; while (dd > PI) dd -= TAU; while (dd < -PI) dd += TAU; e.va += dd * Math.min(1, dt * 9); } }
    if ((e.type === "leech" || e.type === "tank") && e.state !== "drain" && rnd() < dt * 4) dust(e.x - (e.hx || 0) * 9, e.y - (e.hy || 0) * 9 + e.r * .6, 1);
  }
  function moveTo(e, x, y, sp, dt, ground) {
    var dx = x - e.x, dy = y - e.y, d = Math.sqrt(dx * dx + dy * dy); if (d < .5) return;
    var s = sp * (e.blocked > 0 ? .5 : 1) * dt; e.x += dx / d * Math.min(s, d); e.y += dy / d * Math.min(s, d);
    if (ground) { e.hx += (dx / d - e.hx) * Math.min(1, dt * 5); e.hy += (dy / d - e.hy) * Math.min(1, dt * 5); var l = Math.sqrt(e.hx * e.hx + e.hy * e.hy) || 1; e.hx /= l; e.hy /= l; }
  }
  function nearestExit(e) {
    var c = [{x: e.x, y: -40, d: e.y + 40}, {x: -40, y: e.y, d: e.x + 40}, {x: W + 40, y: e.y, d: W + 40 - e.x}].sort(function (a, b) { return a.d - b.d; });
    return c[0];
  }

  // ---------- boss ----------
  function bossUpdate(dt) {
    var bs = B.bs, a = arena(), P = B.P, i;
    if (bs.arkOut > 0 && bs.arkOut < 1) bs.arkOut = Math.min(1, bs.arkOut + dt * .6);
    if (bs.phase === 1) {
      bs.arkX += bs.arkDir * 24 * dt; if (bs.arkX > W / 2 + 40) bs.arkDir = -1; if (bs.arkX < W / 2 - 40) bs.arkDir = 1;
      var live = B.enemies.filter(function (e) { return e.type === "emitter" && !e.dead; });
      bs.emitters = live.length;
      bs.beamT -= dt;
      if (bs.beamT <= 0 && live.length) {
        bs.beamT = 4.2 + live.length * .5; var em = live[Math.floor(rnd() * live.length)];
        var tx = clamp(P.x + R(-20, 20), a.x0, a.x1), ty = Math.min(H - 40, P.y + 40);
        var ba = ang(em.x, em.y, tx, ty); B.tele.push({kind: "beam", x: em.x, y: em.y, a: ba, t: 0, tele: 1.2, dur: .55, done: false, hit: {}, em: em});
        BB.sfx("warn"); pop(em.x, em.y + 22, "!", "#ff4aff", 18);
      }
      bs.snT -= dt;
      if (bs.snT <= 0) { bs.snT = 9; var cs = B.enemies.filter(function (e) { return e.type === "snatcher"; }).length; if (cs < 4) for (i = 0; i < 2; i++) B.enemies.push(mkEnemy("snatcher", bs.arkX + R(-40, 40), a.y0 - 10)); }
      if (live.length === 0) {
        bs.phase = 2; bs.arkOut = .001; banner("PHASE 2", "THE KING LANDS!", "lose"); B.slow = .25; B.hint = "THE KING LANDS! Wait for his slam, then hit the exposed core!"; B.hintT = 6;
        var v = mkEnemy("vorlax", W / 2, a.y0 - 60); v.hp = v.max = 7500; v.state = "arrive"; v.exposed = false; v.stT = 0; v.slams = 0; v.hx = 0; v.hy = 1; B.enemies.push(v); bs.vor = v;
        shake(10); BB.sfx("roar"); flash("#b04bff", .5); BB.track("boss_phase", {phase: 2, sec: Math.round(B.t)});
      }
    }
    // beams / telegraphs
    for (i = B.tele.length - 1; i >= 0; i--) {
      var tl = B.tele[i]; tl.t += dt;
      if (tl.kind === "beam") {
        if (tl.em && !tl.em.dead) { tl.x = tl.em.x; tl.y = tl.em.y; }
        var len = beamLen(tl);
        if (tl.t >= tl.tele && !tl.fired) { tl.fired = true; BB.sfx("beam"); shake(4); }
        if (tl.fired && tl.t < tl.tele + tl.dur) {
          var ex = tl.x + Math.cos(tl.a) * len, ey = tl.y + Math.sin(tl.a) * len;
          if (!tl.hit.p && distSeg(P.x, P.y, tl.x, tl.y, ex, ey) < 14 + P.r) { tl.hit.p = 1; hurtPlayer(24, tl.x, tl.y); }
          B.animals.forEach(function (an, k) { if (an.state !== "gone" && !tl.hit["a" + k] && distSeg(an.x, an.y, tl.x, tl.y, ex, ey) < 16) { tl.hit["a" + k] = 1; hurtAnimal(an, 22); } });
          B.silos.forEach(function (s, k) { if (!s.dead && !tl.hit["s" + k] && distSeg(s.x, s.y, tl.x, tl.y, ex, ey) < 22) { tl.hit["s" + k] = 1; s.hp -= 30; s.flash = .2; burst(s.x, s.y, "#ff4aff", 8, 80); } });
          for (var q = 0; q < 2; q++) B.parts.push({x: tl.x + Math.cos(tl.a) * R(0, len), y: tl.y + Math.sin(tl.a) * R(0, len), vx: R(-30, 30), vy: R(-30, 30), life: .3, max: .3, col: "#e86bff", sz: 2.5});
        }
        if (tl.t > tl.tele + tl.dur) B.tele.splice(i, 1);
      } else if (tl.kind === "slam") {
        if (!tl.fired && tl.t >= tl.tele) {
          tl.fired = true; BB.sfx("slam"); shake(14); flash("#ffffff", .3);
          burst(tl.x, tl.y, "#b04bff", 30, 220, 1.5); slamFx(tl);
          if (dist(P.x, P.y, tl.x, tl.y) < tl.r + P.r) hurtPlayer(tl.big ? 38 : 28, tl.x, tl.y);
          B.animals.forEach(function (an) { if (an.state !== "gone" && an.state !== "carried" && dist(an.x, an.y, tl.x, tl.y) < tl.r) hurtAnimal(an, tl.big ? 18 : 10); });
          B.silos.forEach(function (s) { if (!s.dead && dist(s.x, s.y, tl.x, tl.y) < tl.r + 14) { s.hp -= tl.big ? 30 : 16; s.flash = .2; } });
          if (tl.vor && !tl.vor.dead) { tl.vor.state = "stun"; tl.vor.stT = tl.big ? 4 : 3; tl.vor.exposed = true; pop(tl.vor.x, tl.vor.y - 40, "CORE EXPOSED!", "#ffec6b", 14); }
        }
        if (tl.t > tl.tele + .25) B.tele.splice(i, 1);
      }
    }
  }
  function beamLen(tl) {
    var len = 900, ex = tl.x + Math.cos(tl.a) * len, ey = tl.y + Math.sin(tl.a) * len;
    for (var i = 0; i < B.walls.length; i++) {
      var w = B.walls[i], hl = w.len / 2, wx0 = w.x - Math.cos(w.a) * hl, wy0 = w.y - Math.sin(w.a) * hl, wx1 = w.x + Math.cos(w.a) * hl, wy1 = w.y + Math.sin(w.a) * hl;
      var r = segInt(tl.x, tl.y, ex, ey, wx0, wy0, wx1, wy1); if (r !== null && r * len < len) len = Math.min(len, r * len);
    }
    return len;
  }
  function segInt(x1, y1, x2, y2, x3, y3, x4, y4) {
    var d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3); if (Math.abs(d) < 1e-6) return null;
    var t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d, u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
  }
  function distSeg(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy, t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
    return dist(px, py, x1 + dx * t, y1 + dy * t);
  }
  function vorlaxAI(e, dt) {
    var bs = B.bs, a = arena(), P = B.P, L = layout();
    var frac = e.hp / e.max;
    if (e.state === "arrive") { e.y += 120 * dt; if (e.y >= a.y0 + 90) { e.y = a.y0 + 90; e.state = "walk"; e.stT = 2.6; shake(12); BB.sfx("slam"); burst(e.x, e.y, "#8a6a3a", 30, 200, 1.5); } return; }
    if (bs.phase === 2 && frac <= .5) { bs.phase = 3; B.dark = 0; banner("PHASE 3", "ECLIPSE!", "lose"); B.slow = .3; ringFx(e.x, e.y, 170, "190,90,255", .8, 8); B.hint = "ECLIPSE! He's enraged. Survive the big slams!"; B.hintT = 6; flash("#6a1b9a", .6); BB.sfx("roar"); shake(10); BB.track("boss_phase", {phase: 3, sec: Math.round(B.t)}); }
    if (bs.phase === 3) { B.dark = Math.min(.45, B.dark + dt * .4); }
    if (!B.finisher && bs.phase === 3 && frac <= .14) {
      B.finisher = true; e.state = "kneel"; e.exposed = true; B.hint = "FINISH HIM! Tap HAYMAKER!"; B.hintT = 99; BB.sfx("roar"); shake(8); B.tele = B.tele.filter(function (t) { return t.kind !== "slam"; });
    }
    if (e.state === "kneel") { if (B.hintT < 1) B.hintT = 99; return; }
    var enrage = bs.phase === 3 ? 1.5 : 1;
    if (e.state === "walk") {
      e.stT -= dt; e.exposed = false;
      var tx = L.fx, ty = L.fy - 60; moveTo(e, tx, ty, e.sp * enrage, dt, true); wallPush(e, e.r);
      if (e.stT <= 0) {
        e.slams++; var big = bs.phase === 3 && e.slams % 3 === 0;
        var sx = dist(P.x, P.y, e.x, e.y) < 230 ? P.x : e.x, sy = dist(P.x, P.y, e.x, e.y) < 230 ? P.y : e.y + 40;
        if (rnd() < .4) { var an = nearest(B.animals, e.x, e.y, function (q) { return q.state === "idle"; }); if (an && dist(an.x, an.y, e.x, e.y) < 200) { sx = an.x; sy = an.y; } }
        B.tele.push({kind: "slam", x: sx, y: sy, r: big ? 120 : 66, big: big, t: 0, tele: big ? 1.6 : 1.0, fired: false, vor: e});
        e.state = "tele"; e.stT = big ? 1.9 : 1.2; BB.sfx("warn"); if (big) pop(sx, sy - 30, "ECLIPSE SLAM!", "#ff8aff", 14);
      }
      // minions
      e.minT = (e.minT === undefined ? 6 : e.minT) - dt;
      if (e.minT <= 0) {
        e.minT = bs.phase === 3 ? 5.5 : 9;
        var cs = B.enemies.filter(function (q) { return q.type === "stinger" || q.type === "snatcher" || q.type === "leech"; }).length;
        if (cs < 5) { B.enemies.push(mkEnemy("snatcher", R(a.x0, a.x1), a.y0 - 10)); if (bs.phase === 3) { B.enemies.push(mkEnemy("stinger", R(a.x0, a.x1), a.y0 - 10)); B.enemies.push(mkEnemy("stinger", R(a.x0, a.x1), a.y0 - 10)); } else B.enemies.push(mkEnemy("leech", R(a.x0 + 20, a.x1 - 20), a.y0 - 10)); }
      }
    } else if (e.state === "tele") { e.stT -= dt; if (e.stT <= 0 && e.state === "tele") { e.state = "walk"; e.stT = 1; } }
    else if (e.state === "stun") { e.stT -= dt; e.exposed = true; if (e.stT <= 0) { e.exposed = false; e.state = "walk"; e.stT = bs.phase === 3 ? 2.4 : 3.6; } }
    if (dist(e.x, e.y, P.x, P.y) < e.r + P.r && e.hitCd <= 0) { hurtPlayer(14, e.x, e.y); e.hitCd = 1; }
  }
  function useUlt() {
    var e = B.bs && B.bs.vor; if (!e || e.dead) return; B.ultDone = true; BB.sfx("ult"); flash("#ffffff", .8); shake(16); B.slow = 1.4;
    burst(e.x, e.y, "#7fe3ff", 60, 300, 2); B.hint = ""; B.hintT = 0;
    e.hp = 0; vorDie(e);
  }
  function vorDie(e) {
    e.dead = true; BB.sfx("roar"); shake(18); flash("#ffffff", .9); burst(e.x, e.y, "#ff4aff", 70, 280, 2); burst(e.x, e.y, "#ffec6b", 40, 200, 1.5); deathChain(e);
    dropLoot(e, 20, 10); B.enemies.forEach(function (x) { if (x !== e && !x.dead) { x.hp = 0; killEnemy(x); } }); B.tele = [];
    B.slow = 1.8; win();
  }

  // ---------- win / lose ----------
  function win() {
    if (B.over) return; B.over = true; B.win = true; B.overT = 0;
    B.enemies.forEach(function (e) { if (!e.dead) { e.dead = true; burst(e.x, e.y, "#fff", 6, 60); } });
    BB.sfx("win"); flash("#fff6a8", .5); ringFx(B.P.x, B.P.y, 120, "255,230,120", .7, 6); fxAdd({k: "sp", n: "fx_stars", x: B.P.x, y: B.P.y - 14, t: 0, dur: 1, s: 90, rot: 0});
  }
  function lose(why) {
    if (B.over) return;
    if (why === "mech" && !B.usedRevive && !B.reviveAsked) { B.reviveAsked = true; B.over = true; B.win = false; B.why = why; B.overT = 0; B.reviveOffer = true; BB.sfx("lose"); shake(10); return; }
    B.over = true; B.win = false; B.why = why; B.overT = 0; BB.sfx("lose"); shake(10);
  }
  Battle.revive = function () {
    if (!B || !B.reviveOffer) return false;
    B.reviveOffer = false; B.usedRevive = true; B.over = false; B.resultSent = false; B.overT = 0; B.win = false;
    B.P.hp = B.P.max; B.P.inv = 2.5; flash("#9bffa0", .5); BB.sfx("upgrade");
    B.enemies.forEach(function (e) { if (dist(e.x, e.y, B.P.x, B.P.y) < 140 && e.type !== "vorlax" && e.type !== "emitter" && e.type !== "pylon") { e.hp = 0; killEnemy(e); } });
    burst(B.P.x, B.P.y, "#9bffa0", 40, 220, 1.5); pop(B.P.x, B.P.y - 26, "SECOND WIND!", "#9bffa0", 15);
    BB.track("second_wind", {m: B.mi});
    return true;
  };
  function finish() {
    if (B.resultSent) return;
    if (B.reviveOffer) { B.resultSent = true; if (onEnd) onEnd({offer: true, why: B.why}); return; }
    B.resultSent = true;
    var total = B.animals.length, saved = aliveAnimals().length;
    var stars = 0; if (B.win) { stars = 1; if (saved >= Math.ceil(total * .6)) stars = 2; if (saved === total && !B.usedRevive) stars = 3; }
    var res = {win: B.win, why: B.why, mi: B.mi, stars: stars, saved: saved, total: total, lootCoins: B.lootCoins, lootSalv: B.lootSalv, time: Math.round(B.t), kills: B.kills, hpLeft: Math.round(B.P.hp / B.P.max * 100), usedRevive: B.usedRevive};
    if (onEnd) onEnd(res);
  }
  Battle.confirmEnd = function () { /* UI finished with the result; stop loop */ Battle.stop(); };

  // ---------- optional test bot (?bot=1) ----------
  function botInput() {
    var P = B.P, L = layout(), tx = L.fx, ty = L.fy - 40, best = null, bd = 1e9;
    for (var i = 0; i < B.enemies.length; i++) {
      var e = B.enemies[i]; if (e.dead || e.type === "ark" || (e.type === "vorlax" && e.state === "arrive")) continue;
      var pr = e.carry ? -200 : e.type === "emitter" ? -60 : e.type === "pylon" ? -20 : (e.type === "leech" || e.type === "tank") ? -50 : e.type === "vorlax" ? 120 : 0; var d = dist(P.x, P.y, e.x, e.y) + pr; if (d < bd) { bd = d; best = e; }
    }
    if (best) {
      var ds = dist(P.x, P.y, best.x, best.y), want = best.type === "leech" || best.type === "tank" ? 120 : best.type === "vorlax" ? 150 : 100;
      if (best.carry || best.type === "pylon" || best.type === "emitter") want = 80;
      if (ds > want + 20) { tx = best.x; ty = best.y; }
      else if (ds < want - 30 && best.type !== "vorlax") { var aw0 = ang(best.x, best.y, P.x, P.y); tx = P.x + Math.cos(aw0) * 60; ty = P.y + Math.sin(aw0) * 60; }
      else { tx = P.x; ty = P.y; }
      if (best.type === "emitter") { tx = best.x; ty = best.y + 110; }
      if (best.type === "vorlax" && !best.exposed) { tx = P.x + (P.x < best.x ? -1 : 1) * 0; ty = P.y; }
    }
    // dodge telegraphs
    for (i = 0; i < B.tele.length; i++) { var t = B.tele[i]; if (t.kind === "slam" && dist(P.x, P.y, t.x, t.y) < t.r + 40) { var aw = ang(t.x, t.y, P.x, P.y); tx = P.x + Math.cos(aw) * 100; ty = P.y + Math.sin(aw) * 100; }
      if (t.kind === "beam" && distSeg(P.x, P.y, t.x, t.y, t.x + Math.cos(t.a) * 900, t.y + Math.sin(t.a) * 900) < 40) { tx = P.x + 60; ty = P.y; } }
    var near = B.enemies.some(function (e) { return (e.type === "leech" || e.type === "tank") && dist(e.x, e.y, P.x, P.y) < 80; });
    if (near && P.wallCd <= 0 && rnd() < .05) btnPress = true;
    if (B.finisher && !B.ultDone) btnPress = true;
    var dx = tx - P.x, dy = ty - P.y, d2 = Math.sqrt(dx * dx + dy * dy);
    if (d2 < 6) return {x: 0, y: 0}; var k = Math.min(1, d2 / 30); return {x: dx / d2 * k, y: dy / d2 * k};
  }
  Battle.decline = function () { if (!B) return; B.reviveOffer = false; B.resultSent = false; B.overT = 5; };

  // ======================================================================
  //  v2 art layer: sprites, caches, effects, HUD
  // ======================================================================
  var ASSETS = ["bg_front", "bg_side", "bg_back", "bg_special", "snatcher", "walker", "tank", "stinger", "pylon", "emitter", "ark", "vor_idle", "vor_stun", "vor_eclipse",
    "cow", "sheep", "pig", "chicken", "silo", "silo_dmg", "barn", "windmill", "hay_round", "hay_stack", "pumpkins", "corn", "cabbage", "wheat", "tree", "pine", "flowers",
    "fence_h", "fence_h2", "fence_v", "gate", "balewall", "i_coin", "i_scrap", "i_heart", "ui_ring", "ui_banner_win", "ui_banner_lose", "ui_btn_green", "ui_btn_orange",
    "ui_pause", "ui_panel", "ui_star", "ui_star_off", "island", "sky", "cloud1", "cloud2", "cloud3", "cloud4", "cloud5", "cloud6",
    "fx_e1", "fx_e2", "fx_e3", "fx_e4", "fx_e5", "fx_e6", "fx_p1", "fx_p2", "fx_p3", "fx_p4", "fx_p5", "fx_p6", "fx_bolt", "fx_spark", "fx_ring", "fx_orb", "fx_goo", "fx_stars"];
  var IMG = {}, SC = {}, GC = {}, assetsDone = 0, assetsReady = false, assetsStarted = false, skyC = null, ctime = 0, DL = [];
  var FLC = {w: "#ffffff", r: "rgba(255,60,40,.62)", p: "rgba(200,90,255,.5)", g: "rgba(70,70,86,.6)"};
  function loadAssets() {
    if (assetsStarted) return; assetsStarted = true;
    ASSETS.forEach(function (n) {
      var im = new Image(); im.decoding = "async";
      im.onload = im.onerror = function () { if (++assetsDone >= ASSETS.length) { assetsReady = true; SC = {}; if (B && cv) buildGround(); } };
      im.src = "assets/" + n + ".webp"; IMG[n] = im;
    });
  }
  Battle.assetsReady = function () { return assetsReady; };
  function ok(n) { var i = IMG[n]; return i && i.complete && i.naturalWidth ? i : null; }
  function hOf(n, w) { var i = ok(n); return i ? w * i.naturalHeight / i.naturalWidth : w; }
  function spr(n, hL, fl) {
    var im = ok(n); if (!im) return null;
    var k = n + "|" + ((hL * 4) | 0) + "|" + (fl || ""), c = SC[k]; if (c) return c;
    var s = scale * dpr, th = Math.max(2, Math.round(hL * s)), tw = Math.max(2, Math.round(im.naturalWidth * th / im.naturalHeight));
    c = document.createElement("canvas"); c.width = tw; c.height = th; var x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(im, 0, 0, tw, th);
    if (fl) { x.globalCompositeOperation = "source-atop"; x.fillStyle = FLC[fl]; x.fillRect(0, 0, tw, th); }
    SC[k] = c; return c;
  }
  // draw sprite n with logical height h; anchor (ax, ay) as fraction of the sprite; o: rot, fx (flip), a (alpha), fl (flash key), sx, sy, add
  function dspr(c, n, x, y, h, o) {
    o = o || {}; var cs = spr(n, h, o.fl);
    if (!cs) { c.fillStyle = o.fb || "rgba(255,255,255,.35)"; c.beginPath(); c.arc(x, y - (o.ay === undefined ? 1 : o.ay) * 0 - h * .3, h * .3, 0, TAU); c.fill(); return false; }
    var s = scale * dpr, w = cs.width / s, hh = cs.height / s, ax = o.ax === undefined ? .5 : o.ax, ay = o.ay === undefined ? 1 : o.ay;
    c.save(); c.translate(x, y); if (o.rot) c.rotate(o.rot);
    var sx = (o.sx || 1) * (o.fx ? -1 : 1), sy = o.sy || 1; if (sx !== 1 || sy !== 1) c.scale(sx, sy);
    if (o.a !== undefined) c.globalAlpha = o.a; if (o.add) c.globalCompositeOperation = "lighter";
    c.drawImage(cs, -w * ax, -hh * ay, w, hh); c.restore(); return true;
  }
  function glowC(col) {
    var c = GC[col]; if (c) return c; c = document.createElement("canvas"); c.width = c.height = 64; var x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(" + col + ",1)"); g.addColorStop(.3, "rgba(" + col + ",.45)"); g.addColorStop(1, "rgba(" + col + ",0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); GC[col] = c; return c;
  }
  function glow(c, x, y, r, col, a) { c.globalAlpha = a; c.globalCompositeOperation = "lighter"; c.drawImage(glowC(col), x - r, y - r, r * 2, r * 2); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; }
  function shadowC() {
    if (GC.sh) return GC.sh; var c = document.createElement("canvas"); c.width = 64; c.height = 32; var x = c.getContext("2d"); x.scale(1, .5);
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(10,20,10,.7)"); g.addColorStop(.6, "rgba(10,20,10,.35)"); g.addColorStop(1, "rgba(10,20,10,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); GC.sh = c; return c;
  }
  function shadow(c, x, y, rx, ry, a) { c.globalAlpha = a === undefined ? 1 : a; c.drawImage(shadowC(), x - rx, y - ry, rx * 2, ry * 2); c.globalAlpha = 1; }
  function txt(c, s, x, y, size, fill, stroke, align, lw) {
    c.font = "900 " + size + "px 'Arial Black',Impact,'Helvetica Neue',sans-serif"; c.textAlign = align || "center"; c.textBaseline = "middle"; c.lineJoin = "round";
    if (stroke) { c.lineWidth = lw || Math.max(2, size * .22); c.strokeStyle = stroke; c.strokeText(s, x, y); }
    c.fillStyle = fill; c.fillText(s, x, y);
  }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); }
  function easeBack(t) { if (t <= 0) return 0; if (t >= 1) return 1; var s = 1.9; t -= 1; return t * t * ((s + 1) * t + s) + 1; }

  // ---------- fx helpers ----------
  function fxAdd(o) { B.fx.push(o); if (B.fx.length > 80) B.fx.shift(); return o; }
  function explode(x, y, size, pal) { fxAdd({k: "ex", x: x, y: y, t: 0, dur: .55, s: size, p: pal || "e", rot: R(0, TAU)}); }
  function ringFx(x, y, r, col, dur, w) { fxAdd({k: "ring", x: x, y: y, t: 0, dur: dur || .4, r: r, col: col || "255,255,255", w: w || 3}); }
  function sparkFx(x, y, s) { fxAdd({k: "sp", n: "fx_spark", x: x, y: y, t: 0, dur: .2, s: s, rot: R(0, TAU)}); }
  function gooFx(x, y, s) { fxAdd({k: "goo", x: x, y: y, t: 0, dur: .9, s: s, rot: R(0, TAU)}); }
  function later(t, f) { B.later.push({t: t, f: f}); }
  function dust(x, y, n) { for (var i = 0; i < n; i++) B.parts.push({k: "d", x: x + R(-3, 3), y: y + R(-2, 2), vx: R(-12, 12), vy: R(-14, -4), life: R(.3, .5), max: .5, cs: "rgb(222,205,160)", sz: R(2.5, 4.2)}); }
  function smoke(x, y) { B.parts.push({k: "d", x: x, y: y, vx: R(-6, 6), vy: R(-24, -14), life: R(.7, 1.1), max: 1.1, cs: "rgb(80,80,92)", sz: R(4, 6.5), grow: 1}); }
  function impact(x, y) { burst(x, y, "#fff3a8", 3, 60, .7); sparkFx(x, y, 20); }
  function wallFx(x, y) { ringFx(x, y, 46, "120,230,255", .45, 5); fxAdd({k: "sp", n: "fx_stars", x: x, y: y, t: 0, dur: .6, s: 60, rot: 0}); }
  function dmgNum(e, dmg, mul) {
    if (B.texts.length > 30) return; var big = mul > 1.5;
    B.texts.push({x: e.x + R(-6, 6), y: e.y - e.r - 8, vy: -44, life: .55, max: .55, txt: String(Math.max(1, Math.round(dmg))), col: big ? "#ff9bd0" : "#fff3a8", size: big ? 14 : 11, pop: 1});
  }
  function deathFx(e) {
    switch (e.type) {
      case "snatcher": explode(e.x, e.y - 8, 52, "e"); break;
      case "leech": explode(e.x, e.y, 60, "e"); burst(e.x, e.y, "#ffd23a", 8, 130, 1); break;
      case "tank": explode(e.x, e.y, 94, "e"); ringFx(e.x, e.y, 58, "255,170,60", .5, 5); break;
      case "stinger": gooFx(e.x, e.y, 38); break;
      case "pylon": explode(e.x, e.y - 4, 100, "p"); gooFx(e.x, e.y + 6, 70); ringFx(e.x, e.y, 68, "190,90,255", .5, 5); break;
      case "emitter": explode(e.x, e.y, 100, "p"); explode(e.x + 18, e.y + 6, 64, "e"); ringFx(e.x, e.y, 64, "255,90,255", .5, 5); break;
    }
  }
  function slamFx(tl) {
    explode(tl.x, tl.y, tl.r * 1.5, "p"); ringFx(tl.x, tl.y, tl.r * 1.15, "255,120,255", .5, 7); ringFx(tl.x, tl.y, tl.r * .7, "255,255,255", .35, 4);
    for (var i = 0; i < 6; i++) dust(tl.x + R(-tl.r, tl.r) * .7, tl.y + R(-tl.r, tl.r) * .5, 1);
  }
  function deathChain(e) {
    for (var i = 0; i < 7; i++) (function (i) { later(i * .16, function () { if (!B) return; var ax = e.x + R(-46, 46), ay = e.y + R(-52, 30); explode(ax, ay, R(60, 110), i % 2 ? "e" : "p"); shake(8); }); })(i);
    later(1.2, function () { if (B) { ringFx(e.x, e.y, 200, "255,240,160", .9, 9); fxAdd({k: "sp", n: "fx_stars", x: e.x, y: e.y, t: 0, dur: 1.2, s: 140, rot: 0}); } });
  }
  function banner(title, sub, kind) { B.banner = {t0: B.at, dur: 2.4, title: title, sub: sub, kind: kind || "win"}; }
  function initClouds() {
    var a = [], i; for (i = 0; i < 8; i++) a.push({n: "cloud" + (1 + i % 6), x: R(0, 440), y: R(-20, H), h: R(34, 62), v: R(4, 9), d: R(.2, .5), a: R(.75, .95), f: 0});
    for (i = 0; i < 3; i++) a.push({n: "cloud" + (1 + i * 2), x: R(0, 520), y: H - 6 + R(-14, 12), h: R(60, 84), v: R(8, 13), d: 1.2, a: .92, f: 1});
    return a;
  }

  // ---------- ground prerender ----------
  function buildGround() {
    var s = scale * dpr, pw = Math.floor(W * s), ph = Math.floor(H * s), sk = document.createElement("canvas"); sk.width = pw; sk.height = ph; var c = sk.getContext("2d");
    var im = ok("sky");
    if (im) { var k = Math.max(pw / im.naturalWidth, ph / im.naturalHeight); c.drawImage(im, (pw - im.naturalWidth * k) / 2, 0, im.naturalWidth * k, im.naturalHeight * k); }
    else { var gr = c.createLinearGradient(0, 0, 0, ph); gr.addColorStop(0, "#5bb8f5"); gr.addColorStop(1, "#d8f1ff"); c.fillStyle = gr; c.fillRect(0, 0, pw, ph); }
    var g = document.createElement("canvas"); g.width = pw; g.height = ph; c = g.getContext("2d"); c.setTransform(s, 0, 0, s, 0, 0);
    var a = arena(), L = layout(), ii = ok("island");
    if (ii) {
      var iw = ii.naturalWidth, ih = ii.naturalHeight, dx = -30, dw = W + 60, kx = dw / iw, cut = Math.round(ih * .84), botTop = H - 62, topY = -70;
      c.imageSmoothingQuality = "high";
      c.drawImage(ii, 0, 0, iw, cut, dx, topY, dw, botTop - topY + 1);
      c.drawImage(ii, 0, cut, iw, ih - cut, dx, botTop, dw, (ih - cut) * kx);
    } else { c.fillStyle = "#6cc04a"; rr(c, 4, 20, W - 8, H - 60, 30); c.fill(); }
    // soft darker rim so the playfield reads
    var vg = c.createRadialGradient(W / 2, H * .5, H * .25, W / 2, H * .5, H * .75); vg.addColorStop(0, "rgba(0,40,0,0)"); vg.addColorStop(1, "rgba(0,40,0,.22)"); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    // farmyard dirt
    var yx0 = L.fx - 86, yx1 = L.fx + 86, yy0 = L.fy - 44, yy1 = L.fy + 44;
    c.save(); c.shadowColor = "rgba(50,30,5,.45)"; c.shadowBlur = 12; c.fillStyle = "rgba(196,150,86,.93)"; rr(c, yx0 - 6, yy0 - 8, yx1 - yx0 + 12, yy1 - yy0 + 16, 22); c.fill(); c.restore();
    c.fillStyle = "rgba(222,184,120,.55)"; rr(c, yx0 + 6, yy0 + 2, yx1 - yx0 - 12, yy1 - yy0 - 6, 16); c.fill();
    var seed = 11 + B.mi; function sr() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    c.fillStyle = "rgba(120,80,35,.28)"; for (var q = 0; q < 46; q++) { c.beginPath(); c.arc(yx0 + sr() * (yx1 - yx0), yy0 + sr() * (yy1 - yy0), .8 + sr() * 1.5, 0, TAU); c.fill(); }
    // props (y-sorted)
    var pr = [];
    function add(n, x, y, h, sh) { pr.push({n: n, x: x, y: y, h: h, sh: sh}); }
    var fw = 34.4;
    for (var i = 0; i < 5; i++) add("fence_h", yx0 + 6 + fw * (i + .5), yy0 - 2, 19, 0);
    for (i = 0; i < 5; i++) { if (i === 2) { add("gate", L.fx, yy1 + 4, 26, 0); continue; } add("fence_h2", yx0 + 6 + fw * (i + .5), yy1 + 2, 19, 0); }
    [yx0 + 2, yx1 - 2].forEach(function (sx) { add("fence_v", sx, yy0 + 40, 40, 0); add("fence_v", sx, yy0 + 82, 40, 0); });
    add("barn", L.fx, a.y1 + 6, 96, 1); add("windmill", a.x0 + 24, a.y1 + 2, 104, 1);
    add("hay_stack", a.x1 - 26, a.y1 - 6, 36, 1); add("hay_round", L.fx - 100, L.fy + 66, 26, 1); add("hay_round", L.fx + 98, L.fy + 70, 24, 1);
    add("pumpkins", a.x1 - 70, a.y1 - 2, 22, 1); add("cabbage", a.x0 + 74, a.y1 - 2, 18, 1);
    add("pine", a.x0 - 4, a.y0 + 24, 52, 1); add("tree", a.x1 + 2, a.y0 + 70, 54, 1); add("tree", a.x0 - 2, a.y0 + 170, 54, 1); add("pine", a.x1 + 4, a.y0 + 250, 50, 1);
    add("tree", a.x0 - 2, a.y0 + 420, 52, 1); add("pine", a.x1 + 3, a.y0 + 460, 52, 1);
    for (i = 0; i < 4; i++) add("corn", a.x0 + 8 + i * 13, a.y0 + 330 + (i % 2) * 4, 30, 0);
    for (i = 0; i < 3; i++) add("wheat", a.x1 - 10 - i * 14, a.y0 + 340 + (i % 2) * 4, 26, 0);
    for (i = 0; i < 12; i++) { var fxp = sr() * (W - 40) + 20, fyp = a.y0 + sr() * (a.y1 - a.y0); if (Math.abs(fxp - L.fx) < 100 && Math.abs(fyp - L.fy) < 70) continue; add("flowers", fxp, fyp, 11 + sr() * 4, 0); }
    pr.sort(function (p, q) { return p.y - q.y; });
    for (i = 0; i < pr.length; i++) { var p = pr[i]; if (p.sh) shadow(c, p.x + 3, p.y - 1, p.h * .42, p.h * .1, .55); dspr(c, p.n, p.x, p.y, p.h, {ay: 1}); }
    ground = g; skyC = sk;
  }

  // ---------- draw ----------
  function draw() {
    var c = ctx, s = scale * dpr, i, P = B.P; ctime = performance.now() / 1000;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (skyC) c.drawImage(skyC, 0, 0); else { c.fillStyle = "#5bb8f5"; c.fillRect(0, 0, cv.width, cv.height); }
    c.setTransform(s, 0, 0, s, 0, 0);
    drawClouds(c, 0);
    var shx = 0, shy = 0; if (B.shake > 0) { shx = (rnd() - .5) * B.shake; shy = (rnd() - .5) * B.shake; }
    c.save(); c.translate(shx, shy);
    if (ground) c.drawImage(ground, 0, 0, W, H); else { c.fillStyle = "#6cc04a"; c.fillRect(0, 0, W, H); }
    // ground decals
    if (B.boss && B.bs.phase >= 2 && B.bs.vor && !B.bs.vor.dead) { var vv = B.bs.vor; shadow(c, vv.x, vv.y + 34, 58, 16, .8); }
    for (i = 0; i < B.tele.length; i++) if (B.tele[i].kind === "slam") drawTele(c, B.tele[i]);
    for (i = 0; i < B.tele.length; i++) if (B.tele[i].kind === "beam") drawTele(c, B.tele[i]);
    for (i = 0; i < B.pick.length; i++) drawPick(c, B.pick[i]);
    drawArkShadow(c);
    // flyer shadows
    for (i = 0; i < B.enemies.length; i++) { var e = B.enemies[i]; if (e.dead) continue; if (e.type === "snatcher") shadow(c, e.x, e.y + 12, 11, 4.5, .5); else if (e.type === "stinger") shadow(c, e.x, e.y + 11, 7, 3, .45); }
    // target marker
    if (B.tgt && !B.tgt.dead && !B.over) drawTarget(c, B.tgt);
    // y-sorted ground layer
    DL.length = 0;
    for (i = 0; i < B.silos.length; i++) DL.push({y: B.silos[i].y + 16, k: 0, o: B.silos[i]});
    for (i = 0; i < B.animals.length; i++) { var an = B.animals[i]; if (an.state !== "gone" && an.state !== "carried") DL.push({y: an.y, k: 1, o: an}); }
    for (i = 0; i < B.enemies.length; i++) { var en = B.enemies[i]; if (en.dead || en.fly || en.type === "emitter") continue; DL.push({y: en.y + (en.type === "vorlax" ? 34 : en.r * .5), k: 2, o: en}); }
    for (i = 0; i < B.walls.length; i++) DL.push({y: B.walls[i].y + 8, k: 3, o: B.walls[i]});
    DL.push({y: P.y + 12, k: 4, o: P});
    DL.sort(function (p, q) { return p.y - q.y; });
    for (i = 0; i < DL.length; i++) { var d = DL[i]; if (d.k === 0) drawSilo(c, d.o); else if (d.k === 1) drawAnimal(c, d.o); else if (d.k === 2) drawEnemy(c, d.o); else if (d.k === 3) drawWall(c, d.o); else drawPlayer(c, d.o); }
    // drain tethers
    for (i = 0; i < B.enemies.length; i++) { var dn = B.enemies[i]; if (!dn.dead && dn.state === "drain" && dn.drTg) drawDrain(c, dn); }
    // carried animals + flyers
    for (i = 0; i < B.animals.length; i++) if (B.animals[i].state === "carried") drawAnimal(c, B.animals[i]);
    drawArk(c);
    for (i = 0; i < B.enemies.length; i++) { var f = B.enemies[i]; if (!f.dead && (f.fly || f.type === "emitter") && f.type !== "vorlax") drawEnemy(c, f); }
    if (B.boss && B.bs.vor && B.bs.vor.fly) drawEnemy(c, B.bs.vor);
    for (i = 0; i < B.tele.length; i++) if (B.tele[i].kind === "beam" && B.tele[i].t >= B.tele[i].tele) drawBeam(c, B.tele[i]);
    drawBullets(c); drawParts(c); drawFx(c);
    for (i = 0; i < B.texts.length; i++) {
      var t = B.texts[i], al = Math.min(1, t.life / (t.max * .4)), sc = t.pop ? 1 + .5 * Math.max(0, (t.life / t.max - .8) / .2) : 1; c.globalAlpha = al;
      c.save(); c.translate(t.x, t.y); c.scale(sc, sc); txt(c, t.txt, 0, 0, t.size, t.col, "rgba(20,10,40,.95)"); c.restore();
    }
    c.globalAlpha = 1; c.restore();
    drawClouds(c, 1);
    if (B.dark > 0) { c.fillStyle = "rgba(40,0,70," + (B.dark * .35) + ")"; c.fillRect(0, 0, W, H); }
    if (B.boss && B.bs.phase === 3) { var vg = c.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); vg.addColorStop(0, "rgba(60,0,90,0)"); vg.addColorStop(1, "rgba(60,0,90,.38)"); c.fillStyle = vg; c.fillRect(0, 0, W, H); }
    if (B.flash > 0) { c.globalAlpha = Math.min(.7, B.flash * 1.6); c.fillStyle = B.flashCol; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    if (P.hp / P.max < .3 && !B.over) { var pl = .5 + .5 * Math.sin(ctime * 6), rg = c.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .7); rg.addColorStop(0, "rgba(255,0,0,0)"); rg.addColorStop(1, "rgba(255,0,0," + (.18 + .15 * pl) + ")"); c.fillStyle = rg; c.fillRect(0, 0, W, H); }
    if (joy.on && !B.paused) drawJoy(c);
    if (B.introT <= 0) drawHUD(c);
    if (B.banner) drawBanner(c);
    if (B.introT > 0) drawIntro(c);
    if (B.over) drawEnd(c);
    if (B.paused) drawPause(c);
  }

  function drawClouds(c, layer) {
    var P = B.P, cl = B.cl; if (!cl) return;
    for (var i = 0; i < cl.length; i++) {
      var q = cl[i]; if (q.f !== layer) continue;
      var w = hOf(q.n, q.h) * 0 + q.h * (ok(q.n) ? ok(q.n).naturalWidth / ok(q.n).naturalHeight : 1.5), span = W + 2 * w;
      var x = ((q.x + ctime * q.v - (P.x - W / 2) * q.d * .18) % span + span) % span - w, y = q.y - (P.y - H / 2) * q.d * .06;
      dspr(c, q.n, x, y, q.h, {ax: 0, ay: .5, a: q.a});
    }
  }
  function drawJoy(c) {
    c.globalAlpha = .35; c.fillStyle = "#fff"; c.beginPath(); c.arc(joy.ox, joy.oy, 36, 0, TAU); c.fill();
    c.globalAlpha = .6; c.strokeStyle = "#fff"; c.lineWidth = 2; c.stroke();
    c.globalAlpha = .75; c.fillStyle = "#ffe08a"; var dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(d, 44) / d;
    c.beginPath(); c.arc(joy.ox + dx * k, joy.oy + dy * k, 17, 0, TAU); c.fill(); c.globalAlpha = 1;
  }
  function drawTarget(c, e) {
    var y = e.y + (e.fly ? 12 : e.r * .55), r = Math.max(10, e.r + 5) * (1 + .06 * Math.sin(ctime * 8));
    c.save(); c.translate(e.x, y); c.scale(1, .5); c.strokeStyle = "rgba(255,225,70,.95)"; c.lineWidth = 2.4; c.setLineDash([8, 6]); c.lineDashOffset = -ctime * 24;
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); c.restore();
  }
  function drawPick(c, pk) {
    var bob = Math.sin(ctime * 5 + pk.x) * 1.4;
    if (pk.k === "coin") { shadow(c, pk.x, pk.y + 5, 5, 2, .5); dspr(c, "i_coin", pk.x, pk.y + 6 + bob, 13, {sx: Math.max(.3, Math.abs(Math.cos(ctime * 5 + pk.x * .3)))}); glow(c, pk.x, pk.y + bob, 9, "255,210,60", .35); }
    else { shadow(c, pk.x, pk.y + 5, 5, 2, .5); dspr(c, "i_scrap", pk.x, pk.y + 6 + bob, 13, {rot: Math.sin(ctime * 3 + pk.x) * .3}); glow(c, pk.x, pk.y + bob, 8, "150,200,255", .3); }
  }
  function drawBullets(c) {
    c.save(); c.globalCompositeOperation = "lighter"; c.lineCap = "round";
    for (var i = 0; i < B.bullets.length; i++) {
      var b = B.bullets[i], t = b.tr; if (t && t.length >= 4) {
        for (var k = 2; k < t.length; k += 2) { var f = k / t.length; c.strokeStyle = "rgba(90,210,255," + (f * .6) + ")"; c.lineWidth = 1 + f * 4.5; c.beginPath(); c.moveTo(t[k - 2], t[k - 1]); c.lineTo(t[k], t[k + 1]); c.stroke(); }
      }
    }
    c.restore();
    for (i = 0; i < B.bullets.length; i++) { var q = B.bullets[i]; glow(c, q.x, q.y, 11, "120,220,255", .65); dspr(c, "fx_bolt", q.x, q.y, 26, {ay: .5, rot: Math.atan2(q.vy, q.vx), add: 1}); c.fillStyle = "#fff"; c.beginPath(); c.arc(q.x, q.y, 2.2, 0, TAU); c.fill(); }
  }
  function drawParts(c) {
    var i, p, a;
    for (i = 0; i < B.parts.length; i++) { p = B.parts[i]; if (p.k !== "d") continue; a = p.life / p.max; c.globalAlpha = a * .5; c.fillStyle = p.cs; c.beginPath(); c.arc(p.x, p.y, p.sz * (p.grow ? 1 + (1 - a) * 1.5 : 1 + (1 - a) * .7), 0, TAU); c.fill(); }
    c.globalCompositeOperation = "lighter";
    for (i = 0; i < B.parts.length; i++) { p = B.parts[i]; if (p.k === "d") continue; a = p.life / p.max; c.globalAlpha = Math.min(1, a * 1.3); c.fillStyle = p.col; c.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz); }
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  }
  function drawFx(c) {
    var XF = {e: ["fx_e1", "fx_e2", "fx_e3", "fx_e4", "fx_e5", "fx_e6"], p: ["fx_p1", "fx_p2", "fx_p3", "fx_p4", "fx_p5", "fx_p6"]}, FS = [.8, 1, 1.1, 1.1, 1.1, 1.1];
    for (var i = 0; i < B.fx.length; i++) {
      var f = B.fx[i], u = f.t / f.dur;
      if (f.k === "ex") {
        var fr = u * 5.999, i0 = Math.floor(fr), fq = fr - i0, al = u > .75 ? (1 - u) / .25 : 1, sz = f.s * (.75 + .35 * u), fl = XF[f.p];
        if (u < .4) glow(c, f.x, f.y, f.s * .75, f.p === "p" ? "220,90,255" : "255,170,60", .6 * (1 - u / .4));
        dspr(c, fl[i0], f.x, f.y, Math.round(sz * FS[i0] / 4) * 4, {ay: .5, rot: f.rot * .15, a: (1 - fq) * al});
        if (i0 < 5) dspr(c, fl[i0 + 1], f.x, f.y, Math.round(sz * FS[i0 + 1] / 4) * 4, {ay: .5, rot: f.rot * .15, a: fq * al});
      } else if (f.k === "sp") {
        dspr(c, f.n, f.x, f.y - (f.n === "fx_stars" ? u * 14 : 0), Math.round(f.s * (.55 + .6 * u) / 3) * 3, {ay: .5, rot: f.rot + u * (f.n === "fx_stars" ? 0 : 1.2), a: 1 - u * u, add: 1});
      } else if (f.k === "goo") {
        dspr(c, "fx_goo", f.x, f.y, Math.round(f.s * (.55 + .5 * ease(u * 3)) / 4) * 4, {ay: .5, rot: f.rot, a: 1 - u * u * u});
      } else if (f.k === "ring") {
        c.globalAlpha = (1 - u) * .9; c.strokeStyle = "rgba(" + f.col + ",1)"; c.lineWidth = f.w * (1 - u) + 1; c.beginPath(); c.ellipse(f.x, f.y, f.r * ease(u), f.r * ease(u) * .62, 0, 0, TAU); c.stroke(); c.globalAlpha = 1;
      }
    }
  }

  // ---------- world objects ----------
  function drawSilo(c, s) {
    shadow(c, s.x + 5, s.y + 17, 24, 8, .6);
    var dead = s.dead, nm = dead || s.hp < s.max * .5 ? "silo_dmg" : "silo", sq = s.flash > 0 ? 1 + s.flash * .25 : 1;
    dspr(c, nm, s.x, s.y + 19, 66, {ay: 1, fl: dead ? "g" : undefined, sy: sq, sx: 2 - sq});
    if (s.flash > 0 && !dead) dspr(c, nm, s.x, s.y + 19, 66, {ay: 1, fl: "w", a: Math.min(.7, s.flash * 5), sy: sq, sx: 2 - sq});
    if (!dead) bar(c, s.x - 17, s.y + 24, 34, 6, s.hp / s.max, "#7dff7d", "#2fb52f");
    else txt(c, "DRAINED", s.x, s.y + 28, 7, "#ff9a8a", "rgba(40,0,0,.9)");
  }
  var AH = {cow: 26, sheep: 24, pig: 21, chicken: 20}, AFACE = {cow: 1, sheep: 1, pig: 1, chicken: 1};
  function drawAnimal(c, an) {
    var h = AH[an.kind] || 24, dx = an.x - (an.lx === undefined ? an.x : an.lx), carried = an.state === "carried", mv = Math.abs(dx) > .01;
    if (mv) an.face = dx > 0 ? 1 : -1; an.lx = an.x; if (!an.face) an.face = 1;
    var fx = an.face * AFACE[an.kind] < 0, hop = mv ? -Math.abs(Math.sin(ctime * 11 + an.wt * 5)) * 2.4 : 0, idle = 1 + Math.sin(ctime * 2.2 + an.wt * 4) * .018;
    if (carried) {
      var car = an.carrier || {x: an.x, y: an.y}; var sw = Math.sin(ctime * 9 + an.wt) * .22;
      c.strokeStyle = "rgba(255,90,90,.8)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(car.x, car.y + 6); c.lineTo(an.x, an.y + 2); c.stroke();
      dspr(c, an.kind, an.x, an.y + 2, h * .85, {ay: .1, rot: sw, fx: fx, fl: an.flash > 0 ? "r" : undefined});
      txt(c, "!", an.x + 12, an.y + 4, 13, "#ffec6b", "#702000");
      return;
    }
    var fall = an.state === "falling" ? Math.min(1, (an.fall || 0) / .7) : 0;
    shadow(c, an.x, an.y + 3, h * .55, h * .17, .55);
    dspr(c, an.kind, an.x, an.y + 4 + hop - fall * 6, h, {ay: 1, fx: fx, sy: idle, sx: 2 - idle, fl: an.flash > 0 ? "r" : undefined});
    if (an.hp < an.max) bar(c, an.x - 10, an.y + 8, 20, 4, an.hp / an.max, "#ffd35a", "#e8962a");
  }
  function drawPlayer(c, P) {
    var a = P.aim, cx = Math.cos(a), sy = Math.sin(a), sc = {bg_front: Math.max(0, sy), bg_back: Math.max(0, -sy), bg_side: Math.abs(cx)}, best = "bg_front", bv = -1, k;
    for (k in sc) if (sc[k] > bv) { bv = sc[k]; best = k; }
    if (!P.view || sc[P.view] < bv - .22) P.view = best;
    var nm = P.spec > 0 ? "bg_special" : P.view, H0 = {bg_front: 58, bg_side: 58, bg_back: 47, bg_special: 56}[nm], fx = nm === "bg_side" && cx < 0;
    var bob = -Math.abs(Math.sin(P.walk)) * 3.2 * P.mv + Math.sin(ctime * 3) * .7 * (1 - P.mv), lean = Math.sin(P.walk) * .05 * P.mv, sq = 1 + Math.sin(P.walk * 2) * .03 * P.mv;
    var gy = P.y + 14, blink = P.inv > 0 && P.hit <= 0 && Math.floor(ctime * 20) % 2 === 0;
    shadow(c, P.x, gy, 20, 7, .65);
    var tier = B.lvl >= 10 ? "255,220,90" : B.lvl >= 7 ? "255,200,90" : B.lvl >= 4 ? "120,230,255" : null;
    if (tier) glow(c, P.x, P.y + 6, 36, tier, .22 + .06 * Math.sin(ctime * 3));
    // facing ring + arrow
    c.save(); c.translate(P.x, gy - 1); c.scale(1, .45); c.strokeStyle = "rgba(120,230,255,.35)"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 23, 0, TAU); c.stroke(); c.restore();
    var ax = P.x + cx * 25, ay = gy - 1 + sy * 11; c.save(); c.translate(ax, ay); c.rotate(Math.atan2(sy * .45, cx)); c.globalCompositeOperation = "lighter"; c.fillStyle = "rgba(140,235,255,.95)"; c.beginPath(); c.moveTo(7, 0); c.lineTo(-3, -4.5); c.lineTo(-3, 4.5); c.closePath(); c.fill(); c.restore();
    dspr(c, nm, P.x, gy + 1 + bob, H0, {ay: 1, fx: fx, rot: lean, sy: sq, sx: 2 - sq, a: blink ? .45 : 1});
    if (P.hit > 0) dspr(c, nm, P.x, gy + 1 + bob, H0, {ay: 1, fx: fx, rot: lean, sy: sq, sx: 2 - sq, fl: "r", a: Math.min(1, P.hit * 4)});
    if (P.muz > 0) { var mx = P.x + cx * 20, my = P.y + sy * 18 - 2; dspr(c, "fx_spark", mx, my, 24 * (P.muz / .08 * .5 + .6), {ay: .5, rot: ctime * 20, add: 1}); glow(c, mx, my, 16, "255,230,150", .6); }
    if (B.lvl >= 10) dspr(c, "fx_stars", P.x, P.y - 4, 56, {ay: .5, add: 1, a: .22 + .12 * Math.sin(ctime * 4)});
  }
  function drawWall(c, w) {
    var age = w.age || 0, life = w.life, grow = easeBack(age / .22), fade = life < .8 ? life / .8 : 1, len = w.len;
    var aa = w.a; while (aa > PI / 2) aa -= PI; while (aa < -PI / 2) aa += PI;
    var ph = hOf("balewall", len * 1.3);
    glow(c, w.x, w.y, len * .75, "110,225,255", .22 * fade * grow);
    dspr(c, "balewall", w.x, w.y, ph, {ay: .5, rot: aa + .55, a: fade, sx: grow, sy: grow});
    // energy sparkle
    c.globalAlpha = .4 * fade; c.strokeStyle = "#aef"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(w.x - Math.cos(aa) * len * .5, w.y - Math.sin(aa) * len * .5); c.lineTo(w.x + Math.cos(aa) * len * .5, w.y + Math.sin(aa) * len * .5); c.stroke(); c.globalAlpha = 1;
  }
  function drawDrain(c, e) {
    var t = e.drTg; c.save(); c.globalCompositeOperation = "lighter"; c.strokeStyle = "rgba(255,150,60,.75)"; c.lineWidth = 2.2; c.beginPath();
    var x0 = e.x, y0 = e.y - 4, x1 = t.x, y1 = t.y - 8, n = 5; c.moveTo(x0, y0);
    for (var i = 1; i < n; i++) { var u = i / n; c.lineTo(x0 + (x1 - x0) * u + Math.sin(ctime * 30 + i * 2) * 3, y0 + (y1 - y0) * u + Math.cos(ctime * 27 + i) * 3); }
    c.lineTo(x1, y1); c.stroke(); c.restore(); glow(c, t.x, t.y - 8, 14, "255,150,60", .5);
  }
  function arkOff() { var bs = B.bs; if (!bs) return 0; if (B.introT > 0) return -280 * Math.pow(Math.min(1, B.introT / 3.0), 2); if (bs.arkOut > 0) return -330 * ease(bs.arkOut); return 0; }
  function drawArkShadow(c) {
    var bs = B.bs; if (!B.boss || !bs || bs.phase > 1 && !(bs.arkOut > 0 && bs.arkOut < 1)) return;
    var al = (bs.arkOut > 0 ? 1 - bs.arkOut : 1) * (B.introT > 0 ? 1 - Math.min(1, B.introT / 3) : 1);
    shadow(c, bs.arkX, bs.arkY + 190, 150, 36, .5 * al);
  }
  function drawArk(c) {
    var bs = B.bs; if (!B.boss || !bs || (bs.phase > 1 && !(bs.arkOut > 0 && bs.arkOut < 1))) return;
    var off = arkOff(), w = 340, h = hOf("ark", w), al = bs.arkOut > 0 ? 1 - bs.arkOut : 1;
    var bob = Math.sin(ctime * 1.6) * 3;
    dspr(c, "ark", bs.arkX, bs.arkY + 40 + off + bob, h, {ay: .5, a: al});
    glow(c, bs.arkX, bs.arkY + 60 + off + bob, 110, "190,70,255", .14 * al);
  }
  function arkEmitterY(e) { return e.y + arkOff() + Math.sin(ctime * 1.6) * 3; }
  function drawEnemy(c, e) {
    var fl = e.flash > 0 ? Math.min(e.type === "vorlax" ? .45 : .75, e.flash / .09 * .8) : 0, x = e.x, y = e.y, t = e.t || 0, hx = e.hx || 0, hy = e.hy || 0, rot;
    switch (e.type) {
      case "snatcher": {
        var bob = Math.sin(t * 7) * 2.4, tilt = clamp(hx, -1, 1) * .16 + Math.sin(t * 5) * .03;
        glow(c, x, y + bob - 2, 14, "70,210,255", .22);
        dspr(c, "snatcher", x, y - 8 + bob, 36, {ay: .5, rot: tilt}); if (fl) dspr(c, "snatcher", x, y - 8 + bob, 36, {ay: .5, rot: tilt, fl: "w", a: fl});
        break;
      }
      case "leech": {
        rot = Math.atan2(hy, hx) + PI / 2; var wb = Math.sin(t * 9) * .07, sq = 1 + Math.sin(t * 18) * .03;
        shadow(c, x, y + 10, 17, 6, .6);
        dspr(c, "walker", x, y, 46, {ay: .5, rot: rot + wb, sy: sq}); if (fl) dspr(c, "walker", x, y, 46, {ay: .5, rot: rot + wb, sy: sq, fl: "w", a: fl});
        break;
      }
      case "tank": {
        rot = Math.atan2(hy, hx) + PI / 2; var tb = Math.sin(t * 6) * .035;
        shadow(c, x, y + 16, 25, 9, .65);
        dspr(c, "tank", x, y, 66, {ay: .5, rot: rot + tb}); if (fl) dspr(c, "tank", x, y, 66, {ay: .5, rot: rot + tb, fl: "w", a: fl});
        break;
      }
      case "stinger": {
        rot = (e.va === undefined ? hy > 0 ? PI / 2 : -PI / 2 : e.va) + PI / 2; var bb = Math.sin(t * 9) * 2, fw = 1 + Math.sin(t * 40) * .1;
        glow(c, x, y + bb, 11, "130,255,90", .28);
        dspr(c, "stinger", x, y - 6 + bb, 30, {ay: .5, rot: rot, sx: fw}); if (fl) dspr(c, "stinger", x, y - 6 + bb, 30, {ay: .5, rot: rot, sx: fw, fl: "w", a: fl});
        break;
      }
      case "pylon": {
        var gr = e.grow !== undefined ? clamp(e.grow, .2, 1) : 1, pu = .5 + .5 * Math.sin(t * 3);
        c.globalAlpha = .5; c.fillStyle = "rgba(120,40,160,.35)"; c.beginPath(); c.ellipse(x, y + 12, 34, 14, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
        shadow(c, x + 3, y + 13, 22, 7, .6);
        dspr(c, "pylon", x, y + 14, 68, {ay: 1, sx: gr, sy: gr}); if (fl) dspr(c, "pylon", x, y + 14, 68, {ay: 1, sx: gr, sy: gr, fl: "w", a: fl});
        glow(c, x, y - 28 * gr, 16 + pu * 6, "150,255,90", .45 + pu * .25);
        break;
      }
      case "emitter": {
        var ey = arkEmitterY(e), ch = 0;
        for (var i = 0; i < B.tele.length; i++) { var tl = B.tele[i]; if (tl.em === e && tl.kind === "beam") ch = Math.min(1, tl.t / tl.tele); }
        glow(c, x, ey + 2, 22 + ch * 16, "255,80,255", .3 + ch * .6);
        dspr(c, "emitter", x, ey, 50, {ay: .5}); if (fl) dspr(c, "emitter", x, ey, 50, {ay: .5, fl: "w", a: fl});
        if (e.hp < e.max) bar(c, x - 16, ey + 28, 32, 5, e.hp / e.max, "#ff7bff", "#b030c0");
        return;
      }
      case "vorlax": drawVorlax(c, e, fl); return;
    }
    if (e.hp < e.max && e.type !== "vorlax") bar(c, x - 11, y - e.r - (e.fly ? 18 : 10), 22, 4, e.hp / e.max, "#ff6b5a", "#c02a1e");
  }
  function drawVorlax(c, e, fl) {
    var bs = B.bs, st = e.state, exposed = e.exposed || st === "stun" || st === "kneel", nm = exposed ? "vor_stun" : bs.phase === 3 ? "vor_eclipse" : "vor_idle";
    var w = 122, h = hOf(nm, w), t = e.t || 0, walking = st === "walk" || st === "arrive", bob = walking ? -Math.abs(Math.sin(t * 4.2)) * 3.5 : Math.sin(t * 2) * 1.2, rock = walking ? Math.sin(t * 4.2) * .035 : 0;
    var wind = 0, big = false; for (var i = 0; i < B.tele.length; i++) { var tl = B.tele[i]; if (tl.vor === e && tl.kind === "slam" && !tl.fired) { wind = Math.min(1, tl.t / tl.tele); big = tl.big; } }
    var fx = (e.hx || 0) < -.2 ? 1 : 0, fy = e.y + 38 + bob - wind * 10, sq = 1 + wind * .1 * Math.sin(wind * 20) + (wind > 0 ? wind * .06 : 0);
    if (bs.phase === 3 || wind) glow(c, e.x, e.y + 4, 82 + wind * 30, big || bs.phase === 3 ? "190,70,255" : "255,70,70", .25 + wind * .35);
    if (st === "arrive") shadow(c, e.x, e.y + 36, 60, 17, .5);
    dspr(c, nm, e.x, fy, h, {ay: 1, fx: fx, rot: rock, sy: sq, sx: 2 - sq}); if (fl) dspr(c, nm, e.x, fy, h, {ay: 1, fx: fx, rot: rock, sy: sq, sx: 2 - sq, fl: "w", a: fl});
    if (exposed && !e.dead) {
      var cy = fy - h * .52, pu = .5 + .5 * Math.sin(ctime * 8); glow(c, e.x, cy, 30 + pu * 8, "255,230,90", .55);
      var ay = fy - h - 6 + Math.sin(ctime * 8) * 3; c.fillStyle = "#ffe14a"; c.strokeStyle = "#5a3a00"; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x - 9, ay - 10); c.lineTo(e.x + 9, ay - 10); c.lineTo(e.x, ay + 2); c.closePath(); c.stroke(); c.fill();
    }
  }

  // ---------- telegraphs / beams ----------
  function drawTele(c, tl) {
    if (tl.kind === "slam") {
      var p = Math.min(1, tl.t / tl.tele), pu = .5 + .5 * Math.sin(tl.t * 14), col = tl.big ? "255,50,160" : "255,70,50";
      c.save(); c.translate(tl.x, tl.y); c.scale(1, .82);
      c.fillStyle = "rgba(" + col + "," + (.15 + .1 * pu) + ")"; c.beginPath(); c.arc(0, 0, tl.r, 0, TAU); c.fill();
      c.fillStyle = "rgba(" + col + "," + (.2 + .32 * p) + ")"; c.beginPath(); c.arc(0, 0, tl.r * p, 0, TAU); c.fill();
      c.lineWidth = 3; c.strokeStyle = "rgba(255,244,235,.95)"; c.setLineDash([10, 7]); c.lineDashOffset = -tl.t * 40; c.beginPath(); c.arc(0, 0, tl.r, 0, TAU); c.stroke(); c.setLineDash([]);
      c.strokeStyle = "rgba(" + col + ",1)"; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, tl.r * p, 0, TAU); c.stroke(); c.restore();
      c.fillStyle = "rgba(255,230,60," + (.75 + .25 * pu) + ")"; c.strokeStyle = "#601010"; c.lineWidth = 2; c.beginPath(); c.moveTo(tl.x, tl.y - 13); c.lineTo(tl.x + 12, tl.y + 8); c.lineTo(tl.x - 12, tl.y + 8); c.closePath(); c.stroke(); c.fill();
      txt(c, "!", tl.x, tl.y + 1, 12, "#601010", null);
    } else {
      var len = beamLen(tl), pr = Math.min(1, tl.t / tl.tele), pl = .5 + .5 * Math.sin(tl.t * 16);
      if (tl.t < tl.tele) {
        c.save(); c.translate(tl.x, tl.y); c.rotate(tl.a);
        c.fillStyle = "rgba(255,40,200," + (.12 + .12 * pl) + ")"; c.fillRect(0, -27, len, 54);
        c.fillStyle = "rgba(255,60,220," + (.12 + .35 * pr) + ")"; c.fillRect(0, -27 * pr, len, 54 * pr);
        c.strokeStyle = "rgba(255,230,255,.9)"; c.lineWidth = 2; c.setLineDash([12, 8]); c.lineDashOffset = -tl.t * 60; c.beginPath(); c.moveTo(0, -27); c.lineTo(len, -27); c.moveTo(0, 27); c.lineTo(len, 27); c.stroke(); c.setLineDash([]);
        c.restore();
      }
    }
  }
  function drawBeam(c, tl) {
    var len = beamLen(tl), u = clamp((tl.t - tl.tele) / tl.dur, 0, 1), w = Math.sin(u * PI) * .7 + .3, ex = tl.x + Math.cos(tl.a) * len, ey = tl.y + Math.sin(tl.a) * len;
    c.save(); c.globalCompositeOperation = "lighter"; c.lineCap = "round";
    c.strokeStyle = "rgba(190,60,255,.45)"; c.lineWidth = 38 * w; c.beginPath(); c.moveTo(tl.x, tl.y); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = "rgba(255,110,240,.8)"; c.lineWidth = 22 * w; c.stroke();
    c.strokeStyle = "rgba(255,255,255,.95)"; c.lineWidth = 8 * w; c.stroke(); c.restore();
    glow(c, tl.x, tl.y, 34, "255,110,255", .85); glow(c, ex, ey, 30, "255,150,255", .7);
    dspr(c, "fx_orb", tl.x, tl.y, 40, {ay: .5, add: 1, a: .8});
  }

  // ---------- HUD ----------
  function bar(c, x, y, w, h, f, c1, c2) {
    f = clamp(f, 0, 1); c.fillStyle = "rgba(8,10,24,.88)"; rr(c, x - 1.5, y - 1.5, w + 3, h + 3, (h + 3) / 2); c.fill();
    c.fillStyle = "#33395a"; rr(c, x, y, w, h, h / 2); c.fill();
    if (f > 0) { var fw = Math.max(h, w * f); c.fillStyle = c2; rr(c, x, y, fw, h, h / 2); c.fill(); c.fillStyle = c1; rr(c, x, y, fw, h * .62, h / 2); c.fill(); c.fillStyle = "rgba(255,255,255,.4)"; rr(c, x + 2, y + h * .14, Math.max(2, fw - 4), h * .24, h * .12); c.fill(); }
  }
  function ribbonText(c, kind, cx, cy, w, s1, size) {
    var nm = kind === "lose" ? "ui_banner_lose" : "ui_banner_win", h = hOf(nm, w); dspr(c, nm, cx, cy, h, {ay: .5});
    if (s1 !== undefined) txt(c, s1, cx, cy + 1, size, "#fff8d8", "rgba(40,20,0,.95)");
  }
  function drawHUD(c) {
    var P = B.P, m = B.m, bs = B.bs, i;
    var g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, "rgba(12,16,44,.88)"); g.addColorStop(1, "rgba(12,16,44,.55)"); c.fillStyle = g; c.fillRect(0, 0, W, 62);
    c.fillStyle = "rgba(232,177,74,.9)"; c.fillRect(0, 62, W, 2); c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(0, 0, W, 1);
    dspr(c, "ui_pause", PAUSE.x, PAUSE.y, 36, {ay: .5});
    // hp
    dspr(c, "i_heart", 52, 22, 20, {ay: .5}); bar(c, 62, 15, 62, 14, P.hp / P.max, P.hp / P.max < .3 ? "#ff7a6a" : "#7dff7d", P.hp / P.max < .3 ? "#c02a1e" : "#2fb52f");
    txt(c, String(Math.max(0, Math.ceil(P.hp))), 93, 22.5, 8.5, "#fff", "rgba(0,0,0,.8)", "center", 2);
    // silos
    for (i = 0; i < B.silos.length; i++) { var s = B.silos[i], bx = 12 + i * 58; dspr(c, s.dead ? "silo_dmg" : "silo", bx + 7, 56, 24, {ay: 1, fl: s.dead ? "g" : undefined}); bar(c, bx + 17, 44, 32, 6, s.hp / s.max, "#ffd35a", "#e8962a"); }
    // centre ribbon
    var secs = Math.max(0, Math.ceil(m.dur - B.t)), tm = Math.floor(secs / 60) + ":" + ("0" + secs % 60).slice(-2), warn = !B.boss && secs <= 10 && !B.over;
    if (B.boss) { ribbonText(c, "lose", W / 2 + 4, 31, 108, "BOSS", 15); }
    else { ribbonText(c, warn ? "lose" : "win", W / 2 + 4, 31, 108, tm, 17 + (warn ? 2 * Math.sin(ctime * 10) : 0)); }
    // loot (right)
    var cb = 1 + B.coinBump * .8, sb = 1 + B.salvBump * .8;
    dspr(c, "i_coin", 252, 21, 17 * cb, {ay: .5}); txt(c, String(B.lootCoins), 263, 21.5, 11, "#ffe07a", "rgba(40,20,0,.95)", "left");
    dspr(c, "i_scrap", 308, 21, 16 * sb, {ay: .5}); txt(c, String(B.lootSalv), 319, 21.5, 11, "#d6e4ff", "rgba(10,20,50,.95)", "left");
    // herd
    var n = B.animals.length, x0 = 243 + (6 - Math.min(6, n)) * 9;
    for (i = 0; i < n; i++) { var an = B.animals[i], gone = an.state === "gone", cx = x0 + i * 18.5 + 9, cy = 47;
      c.fillStyle = gone ? "rgba(120,30,30,.6)" : an.state === "carried" ? "rgba(255,90,60,.7)" : "rgba(255,255,255,.2)"; c.beginPath(); c.arc(cx, cy, 8.4, 0, TAU); c.fill();
      c.strokeStyle = gone ? "#c04040" : an.state === "carried" ? "#ffb03a" : "rgba(255,255,255,.55)"; c.lineWidth = 1.4; c.stroke();
      dspr(c, an.kind, cx, cy + 6.5, 13, {ay: 1, fl: gone ? "g" : undefined, a: gone ? .6 : 1});
      if (gone) { c.strokeStyle = "#ff5050"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 5, cy - 5); c.lineTo(cx + 5, cy + 5); c.moveTo(cx + 5, cy - 5); c.lineTo(cx - 5, cy + 5); c.stroke(); }
    }
    // boss bar
    if (B.boss && bs) {
      var by = 70, phase = bs.phase, frac, label;
      if (phase === 1) { frac = bs.emitters / 3; label = "ARK EMITTERS"; } else { var v = bs.vor; frac = v ? clamp(v.hp / v.max, 0, 1) : 0; label = "VORLAX"; }
      c.fillStyle = "rgba(14,10,36,.82)"; rr(c, 14, by - 2, W - 28, 24, 12); c.fill(); c.strokeStyle = "#e8b14a"; c.lineWidth = 2; c.stroke();
      txt(c, label, 30, by + 10, 8, "#ffe9a8", "rgba(0,0,0,.8)", "left", 2);
      bar(c, 100, by + 3, W - 100 - 62, 14, frac, "#ff7bd8", "#a01ea0");
      for (i = 0; i < 3; i++) { c.fillStyle = i < phase ? "#ffd34a" : "rgba(255,255,255,.2)"; c.beginPath(); c.arc(W - 48 + i * 12, by + 10, 4, 0, TAU); c.fill(); c.strokeStyle = "rgba(0,0,0,.6)"; c.lineWidth = 1; c.stroke(); }
    }
    // hint
    if (B.hintT > 0 && B.hint && !B.over && B.introT <= 0) {
      var ha = Math.min(1, B.hintT), lines = wrapText(c, B.hint, 300), hh = 10 + lines.length * 14, hy = H - 150 - hh;
      c.globalAlpha = ha; c.fillStyle = "rgba(12,16,44,.82)"; rr(c, 24, hy, W - 48, hh, 12); c.fill(); c.strokeStyle = "rgba(255,225,130,.8)"; c.lineWidth = 1.5; c.stroke();
      for (i = 0; i < lines.length; i++) txt(c, lines[i], W / 2, hy + 12 + i * 14, 10.5, "#fff", "rgba(0,0,0,.6)", "center", 2);
      c.globalAlpha = 1;
    }
    drawAbility(c);
  }
  function wrapText(c, s, mw) {
    c.font = "900 10.5px 'Arial Black',Impact,sans-serif"; var words = s.split(" "), out = [], cur = "";
    for (var i = 0; i < words.length; i++) { var t = cur ? cur + " " + words[i] : words[i]; if (c.measureText(t).width > mw && cur) { out.push(cur); cur = words[i]; } else cur = t; }
    if (cur) out.push(cur); return out;
  }
  function drawAbility(c) {
    var P = B.P, x = BTN.x, y = BTN.y, ready = P.wallCd <= 0, ult = B.finisher && !B.ultDone, cdMax = B.lvl >= 7 ? 9 : 12, pu = .5 + .5 * Math.sin(ctime * 6);
    var sc = ready ? 1 + .035 * pu : 1, h = 92 * sc;
    if (ready || ult) glow(c, x, y, 54, ult ? "255,90,220" : "255,215,90", .35 + .3 * pu);
    c.fillStyle = "rgba(10,18,50,.9)"; c.beginPath(); c.arc(x, y, 31 * sc, 0, TAU); c.fill();
    dspr(c, "ui_ring", x, y + 0, h, {ay: .5});
    var icon = ult ? "bg_special" : "balewall", ih = ult ? 36 : 30;
    dspr(c, icon, x, y + 1, ih * sc, {ay: .5, rot: ult ? 0 : -.3, a: ready || ult ? 1 : .4});
    if (!ready && !ult) {
      var f = clamp(P.wallCd / cdMax, 0, 1); c.fillStyle = "rgba(6,10,30,.62)"; c.beginPath(); c.moveTo(x, y); c.arc(x, y, 30, -PI / 2, -PI / 2 + TAU * f); c.closePath(); c.fill();
      txt(c, String(Math.ceil(P.wallCd)), x, y + 1, 19, "#fff", "rgba(0,0,30,.95)");
      c.strokeStyle = "#5ad2ff"; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.arc(x, y, 40, -PI / 2, -PI / 2 + TAU * (1 - f)); c.stroke(); c.lineCap = "butt";
    } else if (ready) { c.strokeStyle = "rgba(255,240,150," + (.5 + .4 * pu) + ")"; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 40, 0, TAU); c.stroke(); }
    c.fillStyle = "rgba(10,14,40,.85)"; rr(c, x - 31, y + 40, 62, 13, 6.5); c.fill();
    txt(c, ult ? "HAYMAKER!" : ready ? "BALE WALL" : "RECHARGING", x, y + 47, 7.5, ready || ult ? "#ffe9a8" : "#9aa6c8", null);
  }
  function drawBanner(c) {
    var b = B.banner, age = B.at - b.t0; if (age > b.dur) { B.banner = null; return; }
    var inn = easeBack(age / .4), out = clamp((b.dur - age) / .35, 0, 1), y = H * .3 + (1 - inn) * -70, w = 270 * (.6 + .4 * inn);
    c.globalAlpha = out; var nm = b.kind === "lose" ? "ui_banner_lose" : "ui_banner_win";
    dspr(c, nm, W / 2, y, hOf(nm, w), {ay: .5});
    txt(c, b.title, W / 2, y - 3, 22 * (.6 + .4 * inn), "#fff8d8", "rgba(40,20,0,.95)");
    if (b.sub) txt(c, b.sub, W / 2, y + hOf(nm, w) / 2 + 12, 11, "#ffffff", "rgba(0,0,0,.9)", "center", 3);
    c.globalAlpha = 1;
  }
  function drawIntro(c) {
    var T = 3.6, u = 1 - B.introT / T, bar0 = 74 * Math.min(1, u * 8, B.introT * 3), pu = Math.sin(ctime * 14) > 0;
    c.fillStyle = "#05030c"; c.fillRect(0, 0, W, bar0); c.fillRect(0, H - bar0, W, bar0);
    c.fillStyle = "#e8b14a"; c.fillRect(0, bar0 - 2, W, 2); c.fillRect(0, H - bar0, W, 2);
    if (u < .4) {
      c.fillStyle = "rgba(200,20,40," + (.25 + (pu ? .2 : 0)) + ")"; c.fillRect(0, H * .42, W, 70); c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(0, H * .42, W, 2); c.fillRect(0, H * .42 + 68, W, 2);
      txt(c, "WARNING", W / 2, H * .42 + 25, 26, pu ? "#fff" : "#ffd0d0", "#600010"); txt(c, "DARK ARK INBOUND", W / 2, H * .42 + 52, 11, "#ffe9a8", "rgba(0,0,0,.9)");
    } else {
      var k = clamp((u - .4) / .15, 0, 1), vo = ease(k), vy = H * .62 - 8 + (1 - vo) * 30, vh = hOf("vor_idle", 190);
      c.globalAlpha = vo; glow(c, W / 2, vy - 80, 150, "190,60,255", .45 * vo); dspr(c, "vor_idle", W / 2, vy, vh, {ay: 1, a: vo}); c.globalAlpha = 1;
      var rb = easeBack((u - .5) / .12), out = clamp(B.introT / .4, 0, 1); c.globalAlpha = out;
      dspr(c, "ui_banner_lose", W / 2, H * .25, hOf("ui_banner_lose", 300 * (.5 + .5 * rb)), {ay: .5});
      txt(c, "VORLAX", W / 2, H * .25 - 2, 30 * (.5 + .5 * rb), "#fff8d8", "#401000");
      txt(c, "THE HARVEST KING", W / 2, H * .25 + 52, 12, "#ffe9a8", "rgba(0,0,0,.9)", "center", 3);
      c.globalAlpha = 1;
    }
    if (B.introT > .5) txt(c, "TAP TO SKIP", W / 2, H - bar0 + 22, 9, "rgba(255,255,255,.65)", null);
  }
  function calcStars() {
    var total = B.animals.length, saved = 0; B.animals.forEach(function (a) { if (a.state !== "gone") saved++; });
    var hpf = B.P.hp / B.P.max, st = 1; if (saved === total) st++; if (hpf > .5 && !B.usedRevive) st++; return st;
  }
  function drawEnd(c) {
    var t = B.overT, win0 = B.win;
    if (win0) {
      var cr = clamp(t / .4, 0, 1); c.save(); c.globalCompositeOperation = "lighter"; c.translate(W / 2, H * .34); c.rotate(ctime * .25); c.fillStyle = "rgba(255,225,120," + (.14 * cr) + ")";
      for (var i = 0; i < 12; i++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(0, 0); c.lineTo(-26, -H); c.lineTo(26, -H); c.closePath(); c.fill(); } c.restore();
      var cols = ["#ff5a5a", "#ffd34a", "#5adcff", "#7dff7d", "#ff8ae0"];
      for (i = 0; i < 46; i++) { var sd = (i * 97.13) % 1, sy = (((i * 53.7) % H) + t * (70 + (i % 5) * 22)) % (H + 30) - 15, sx = ((i * 131.7) % W) + Math.sin(t * 3 + i) * 10; c.fillStyle = cols[i % 5]; c.save(); c.translate(sx, sy); c.rotate(t * 4 + i); c.fillRect(-3, -1.6, 6, 3.2); c.restore(); }
    } else { c.fillStyle = "rgba(30,10,30," + (.5 * clamp(t / .6, 0, 1)) + ")"; c.fillRect(0, 0, W, H); }
    var inn = easeBack(t / .5), nm = win0 ? "ui_banner_win" : "ui_banner_lose", bw = 320 * (.4 + .6 * inn), by = H * .34 + (1 - inn) * -120;
    dspr(c, nm, W / 2, by, hOf(nm, bw), {ay: .5});
    txt(c, win0 ? (B.boss ? "VORLAX DEFEATED!" : "VICTORY!") : B.reviveOffer ? "DOWN!" : "DEFEAT", W / 2, by - 3, (B.boss && win0 ? 20 : 30) * (.4 + .6 * inn), "#fff8d8", "rgba(40,10,0,.95)");
    if (win0) { var st = calcStars(); for (i = 0; i < 3; i++) { var pk = easeBack((t - .5 - i * .25) / .3); if (pk > 0) dspr(c, i < st ? "ui_star" : "ui_star_off", W / 2 + (i - 1) * 54, by + 84 - (i === 1 ? 10 : 0), 50 * pk, {ay: .5, rot: (i - 1) * .12}); } }
  }
  function btnRect(c, nm, cx, cy, w, h, label, size) {
    var im = ok(nm); if (!im) { c.fillStyle = "#6c3"; rr(c, cx - w / 2, cy - h / 2, w, h, 12); c.fill(); txt(c, label, cx, cy, size, "#fff", "rgba(0,0,0,.6)"); return; }
    var iw = im.naturalWidth, ih = im.naturalHeight, k = h / (ih * .84), cuts = [0, .3, .4, .6, .7, 1], nat = [], i, tot = 0, stretch = w - iw * k * .6 - 0;
    // pieces: caps and centre keep natural width; two plain bands stretch
    var capL = iw * .3 * k, mid = iw * .2 * k, capR = iw * .3 * k, band = (w - capL - mid - capR) / 2; if (band < 0) band = 0;
    var dy = cy - ih * k / 2, x = cx - w / 2;
    c.drawImage(im, 0, 0, iw * .3, ih, x, dy, capL, ih * k); x += capL;
    c.drawImage(im, iw * .3, 0, iw * .1, ih, x, dy, band, ih * k); x += band;
    c.drawImage(im, iw * .4, 0, iw * .2, ih, x, dy, mid, ih * k); x += mid;
    c.drawImage(im, iw * .6, 0, iw * .1, ih, x, dy, band, ih * k); x += band;
    c.drawImage(im, iw * .7, 0, iw * .3, ih, x, dy, capR, ih * k);
    txt(c, label, cx, cy, size, "#fff", "rgba(20,40,0,.9)");
  }
  function drawPause(c) {
    c.fillStyle = "rgba(6,8,30,.72)"; c.fillRect(0, 0, W, H);
    var pw = 250, ph = hOf("ui_panel", pw); dspr(c, "ui_panel", W / 2, H / 2, ph + 40, {ay: .5, sx: pw / (ph + 40) * hOf("ui_panel", 1) * 0 + 1});
    txt(c, "PAUSED", W / 2, H / 2 - 78, 26, "#fff8d8", "#401000");
    btnRect(c, "ui_btn_green", W / 2, H / 2 - 38, 190, 50, "RESUME", 18);
    btnRect(c, "ui_btn_orange", W / 2, H / 2 + 36, 190, 50, "QUIT", 18);
    txt(c, "Quit counts as an abandoned mission", W / 2, H / 2 + 80, 8.5, "#5a3a10", null);
  }
})();
