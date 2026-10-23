"use strict";
// ---- Deterministic raid simulation (fixed dt). Used for live raids AND headless async defence raids. ----
(function () {
  var C = BB.CC, N = C.GRID, S = BB.CCSim = {};
  var AUNITS = {
    snatch: {name: "Snatcher", art: "snatcher", hp: 120, dps: 16, rng: 0.9, sp: 2.4, sz: 20},
    sting: {name: "Stinger", art: "stinger", hp: 85, dps: 18, rng: 3.2, sp: 2.0, sz: 20},
    atank: {name: "Brood Tank", art: "tank", hp: 650, dps: 24, rng: 1.0, sp: 1.2, sz: 28},
    guard: {name: "Husk Guard", art: "u_guard", hp: 300, dps: 20, rng: 1.0, sp: 1.8, sz: 22}
  };
  S.AUNITS = AUNITS;
  function boxDist(px, py, b) { var dx = Math.max(b.x - px, 0, px - (b.x + b.w)), dy = Math.max(b.y - py, 0, py - (b.y + b.h)); return Math.hypot(dx, dy); }
  S.crewAlien = function (l) { var a = []; a.push("snatch", "snatch", "snatch"); if (l >= 2) a.push("sting", "sting"); if (l >= 3) a.push("atank"); if (l >= 4) a.push("atank", "sting"); return a; };
  function Heap() { this.a = []; }
  Heap.prototype.push = function (n) { var a = this.a, i = a.length; a.push(n); while (i > 0) { var p = (i - 1) >> 1; if (a[p].f <= n.f) break; a[i] = a[p]; i = p; } a[i] = n; };
  Heap.prototype.pop = function () { var a = this.a, top = a[0], last = a.pop(); if (a.length) { var i = 0, n = a.length; for (;;) { var l = 2 * i + 1, r = l + 1, m = i, f = last.f; if (l < n && a[l].f < f) { m = l; f = a[l].f; } if (r < n && a[r].f < f) m = r; if (m === i) break; a[i] = a[m]; i = m; } a[i] = last; } return top; };

  S.create = function (base, opt) {
    opt = opt || {};
    var sim = {t: 0, dt: opt.dt || 0.05, theme: base.theme || "a", bld: [], tr: [], ev: [], zones: [], uid: 1, loot: {c: 0, s: 0}, destW: 0, totW: 0, coreDead: false, done: false, why: "", stars: 0, pct: 0,
      bdest: 0, defDest: 0, deployed: {}, script: opt.script || null, scriptI: 0, allDeployed: !!opt.allDeployed, ulv: opt.ulv || {}, cap: opt.cap || C.RAID_SEC, rngv: C.rng(base.seed || 1), paths: 0};
    var occ = []; for (var y = 0; y < N; y++) occ.push(new Array(N).fill(-1));
    sim.occ = occ;
    base.bld.forEach(function (b, i) {
      var d = C.B[b.t], l = b.l || 1, m = C.LV[l] || 1;
      var e = {i: i, t: b.t, x: b.x, y: b.y, w: d.w, h: d.h, l: l, kind: d.kind, mx: d.hp * m, hp: d.hp * m, dead: false, cx: b.x + d.w / 2, cy: b.y + d.h / 2, lc: b.lc || 0, ls: b.ls || 0, lcL: b.lc || 0, lsL: b.ls || 0, cool: 0, tgt: null, hit: 0};
      if (d.kind === "def") { e.dps = d.dps * m * 1.3; e.rng = d.rng; e.min = d.min || 0; e.cd = d.cd; e.spl = d.spl || 0; e.g = d.g; e.a = d.a; e.cool = 0.5; }
      if (d.kind === "trap") { e.dmg = d.dmg * m; e.rad = d.rad; }
      if (d.kind === "crew") { e.released = false; }
      if (d.kind !== "wall" && d.kind !== "trap") { var wt = d.w * d.h; sim.totW += wt; e.wt = wt; } else e.wt = 0;
      if (d.kind !== "trap") for (var j = 0; j < d.h; j++) for (var k = 0; k < d.w; k++) occ[b.y + j][b.x + k] = i;
      sim.bld.push(e);
    });
    sim.crewList = base.crewUnits || null;   // explicit crew (player base) {kind:n} of C.U kinds
    // ---- pathfinding ----
    function cost(tx, ty) { if (tx < 0 || ty < 0 || tx >= N || ty >= N) return -1; var o = occ[ty][tx]; if (o < 0) return 1; var b = sim.bld[o]; if (b.dead) return 1; return b.kind === "wall" ? 5 + b.hp / 90 : -1; }
    function findPath(u, tb) {
      sim.paths++;
      var sx = Math.max(0, Math.min(N - 1, Math.floor(u.x))), sy = Math.max(0, Math.min(N - 1, Math.floor(u.y))), rg = Math.max(u.rng, 0.6);
      function hh(x, y) { return Math.max(0, boxDist(x + .5, y + .5, tb) - rg); }
      var open = new Heap(), best = {}, key0 = sy * N + sx; best[key0] = 0;
      open.push({x: sx, y: sy, g: 0, f: hh(sx, sy), p: null}); var it = 0;
      while (open.a.length && it++ < 900) {
        var n = open.pop(); if (n.g > best[n.y * N + n.x] + 1e-6) continue;
        if (boxDist(n.x + .5, n.y + .5, tb) <= rg) { var out = []; for (var q = n; q && q.p; q = q.p) out.push([q.x, q.y]); return out.reverse(); }
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; var nx = n.x + dx, ny = n.y + dy, c = cost(nx, ny); if (c < 0) continue;
          if (dx && dy && (cost(n.x + dx, n.y) < 0 || cost(n.x, n.y + dy) < 0)) continue;
          var g = n.g + c * (dx && dy ? 1.41 : 1), k = ny * N + nx; if (best[k] !== undefined && best[k] <= g) continue; best[k] = g;
          open.push({x: nx, y: ny, g: g, f: g + hh(nx, ny), p: n});
        }
      }
      return null;
    }
    // ---- spawn ----
    function addTroop(kind, x, y, team, o) {
      o = o || {}; var s;
      if (team === "a") {
        if (kind === "hero") { var P = BB.POWER[o.lvl || 1] || [100, 100]; s = {hp: C.HERO.hp * P[0] / 100, dps: C.HERO.dps * P[1] / 100, rng: C.HERO.rng, sp: C.HERO.sp, pref: "any", sz: C.HERO.sz, art: "hero", hero: 1}; if (o.hpFrac) s.hp *= o.hpFrac; s.mxh = C.HERO.hp * P[0] / 100; }
        else if (kind === "decoy") s = {hp: 500, dps: 0, rng: 0, sp: 0, pref: "any", sz: 22, art: "decoy", decoy: 1};
        else { var U = C.U[kind], L = sim.ulv[kind] || 1; s = {hp: U.hp * (1 + 0.25 * (L - 1)), dps: U.dps * (1 + 0.2 * (L - 1)), rng: U.rng, sp: U.sp, pref: U.pref, fly: U.fly, sz: U.sz, art: U.art, boom: U.boom, brad: U.brad}; }
      } else { var A = AUNITS[kind] || C.U[kind]; var LL = o.lv || 1; s = {hp: A.hp * (1 + 0.25 * (LL - 1)), dps: A.dps * (1 + 0.2 * (LL - 1)), rng: A.rng, sp: A.sp, pref: "any", fly: A.fly, sz: A.sz, art: A.art}; }
      var u = {id: sim.uid++, k: kind, team: team, x: x, y: y, hp: s.hp, mx: s.mxh || s.hp, dps: s.dps, rng: s.rng, sp: s.sp, pref: s.pref, fly: s.fly || 0, sz: s.sz, art: s.art, boom: s.boom, brad: s.brad, hero: s.hero, decoy: s.decoy,
        tgt: null, path: null, pi: 0, blk: null, dead: false, bst: 0, hit: 0, ab: 0, face: 1, wob: sim.uid * 0.7, aim: 0};
      if (team === "a") sim.tr.push(u); else sim.df.push(u);
      return u;
    }
    sim.df = [];
    sim.addTroop = addTroop;
    sim.canDeploy = function (x, y) {
      if (x < 0 || y < 0 || x >= N || y >= N) return false;
      if (x >= C.RING - 0.2 && x < N - C.RING + 0.2 && y >= C.RING - 0.2 && y < N - C.RING + 0.2) return false; return true;
    };
    sim.deploy = function (kind, x, y, o) {
      if (sim.done) return null; if (!sim.canDeploy(x, y)) return null;
      var u = addTroop(kind, x, y, "a", o || {lvl: opt.heroLvl, hpFrac: opt.heroHp}); sim.deployed[kind] = (sim.deployed[kind] || 0) + 1; sim.ev.push({k: "spawn", x: x, y: y}); sim.started = true; return u;
    };
    sim.spell = function (kind, x, y) {
      if (sim.done) return; sim.started = true;
      if (kind === "decoy") { var u = addTroop("decoy", x, y, "a"); sim.deployed.decoy = (sim.deployed.decoy || 0) + 1; return u; }
      sim.deployed[kind] = (sim.deployed[kind] || 0) + 1;
      if (kind === "spark") {
        sim.bld.forEach(function (b) { if (!b.dead && b.kind !== "trap" && Math.hypot(b.cx - x, b.cy - y) < 2.2 + b.w / 2) dmgB(b, 260, null); });
        sim.ev.push({k: "boom", x: x, y: y, r: 2.4, c: "spark"});
      } else sim.zones.push({k: kind, x: x, y: y, r: 3, t: kind === "rain" ? 6 : 8, dur: kind === "rain" ? 6 : 8});
    };
    sim.ability = function () {
      var h = null; sim.tr.forEach(function (u) { if (u.hero && !u.dead) h = u; }); if (!h || h.ab > 0 || h.used) return false;
      h.used = true; h.ab = 6; h.hp = Math.min(h.mx, h.hp + h.mx * 0.35); sim.ev.push({k: "boom", x: h.x, y: h.y, r: 2.2, c: "slam"});
      sim.bld.forEach(function (b) { if (!b.dead && b.kind !== "trap" && Math.hypot(b.cx - h.x, b.cy - h.y) < 2.2 + b.w / 2) dmgB(b, h.dps * 3, h); });
      return true;
    };
    // ---- damage ----
    function dmgB(b, amt, src) {
      if (b.dead) return; var d = Math.min(amt, b.hp); b.hp -= amt; b.hit = 0.12;
      if (src !== undefined && b.kind !== "wall") { var f = d / b.mx; if (b.lcL > 0) { var g = Math.min(b.lcL, b.lc * f); b.lcL -= g; sim.loot.c += g; } if (b.lsL > 0) { var g2 = Math.min(b.lsL, b.ls * f); b.lsL -= g2; sim.loot.s += g2; } }
      if (b.hp <= 0) killB(b);
    }
    function killB(b) {
      b.dead = true; b.hp = 0; var o = sim.occ; for (var j = 0; j < b.h; j++) for (var i = 0; i < b.w; i++) if (o[b.y + j][b.x + i] === b.i) o[b.y + j][b.x + i] = -1;
      sim.ev.push({k: "bdead", b: b.i, x: b.cx, y: b.cy, w: b.w, kind: b.kind});
      if (b.kind !== "wall" && b.kind !== "trap") { sim.destW += b.wt; sim.bdest++; if (b.kind === "def") sim.defDest++; if (b.kind === "core") sim.coreDead = true; }
      if (b.kind === "wall") sim.wallDest = (sim.wallDest || 0) + 1;
      if (b.kind === "crew" && !b.released) release(b);
      if (b.lcL > 0) { sim.loot.c += b.lcL * 0; }
    }
    function dmgU(u, amt, srcTeam) { if (u.dead) return; u.hp -= amt; u.hit = 0.1; if (u.hp <= 0) { u.dead = true; sim.ev.push({k: "udead", x: u.x, y: u.y, a: u.art, team: u.team}); } }
    function release(b) {
      b.released = true; var list = [];
      if (sim.crewList) { C.UORDER.forEach(function (k) { for (var i = 0; i < (sim.crewList[k] || 0); i++) list.push(k); }); for (var gi = 0; gi < (sim.crewList.guard || 0); gi++) list.push("guard"); }
      else list = S.crewAlien(b.l);
      list.forEach(function (k, i) { var a = i * 2.399; var u = addTroop(k, b.cx + Math.cos(a) * 1.2, b.cy + Math.sin(a) * 1.2, "d", {lv: b.l}); u.fly = (C.U[k] && C.U[k].fly) || 0; });
      sim.ev.push({k: "release", x: b.cx, y: b.cy});
    }
    // ---- targeting ----
    function pickTarget(u) {
      var best = null, bd = 1e9, defOnly = u.pref === "def", pass;
      for (pass = 0; pass < 2; pass++) {
        for (var i = 0; i < sim.bld.length; i++) {
          var b = sim.bld[i]; if (b.dead || b.kind === "wall" || b.kind === "trap") continue; if (pass === 0 && defOnly && b.kind !== "def") continue;
          var d = Math.hypot(b.cx - u.x, b.cy - u.y); if (d < bd) { bd = d; best = b; }
        }
        if (best) break;
      }
      return best;
    }
    function tick(dt) {
      var pathBudget = 10, i, j, u, b;
      sim.t += dt;
      if (sim.script) { while (sim.scriptI < sim.script.length && sim.script[sim.scriptI].t <= sim.t) { var a = sim.script[sim.scriptI++]; if (a.s) sim.spell(a.k, a.x, a.y); else if (a.k === "ability") sim.ability(); else sim.deploy(a.k, a.x, a.y); } if (sim.scriptI >= sim.script.length) sim.allDeployed = true; }
      // zones
      for (i = 0; i < sim.zones.length; i++) { var z = sim.zones[i]; z.t -= dt; sim.tr.forEach(function (t) { if (t.dead || t.decoy || Math.hypot(t.x - z.x, t.y - z.y) > z.r) return; if (z.k === "rain") t.hp = Math.min(t.mx, t.hp + t.mx * 0.14 * dt); else t.bst = 0.12; }); }
      sim.zones = sim.zones.filter(function (z) { return z.t > 0; });
      // crew triggers
      for (i = 0; i < sim.bld.length; i++) { b = sim.bld[i]; if (b.kind === "crew" && !b.dead && !b.released) { for (j = 0; j < sim.tr.length; j++) { u = sim.tr[j]; if (!u.dead && Math.hypot(u.x - b.cx, u.y - b.cy) < 5.5) { release(b); break; } } } }
      // defences
      for (i = 0; i < sim.bld.length; i++) {
        b = sim.bld[i]; if (b.dead) continue; if (b.hit > 0) b.hit -= dt;
        if (b.kind === "trap") {
          if (b.sprung) continue;
          for (j = 0; j < sim.tr.length; j++) { u = sim.tr[j]; if (!u.dead && !u.fly && !u.decoy && Math.hypot(u.x - (b.x + .5), u.y - (b.y + .5)) < 1.1) {
            b.sprung = true; b.dead = true; sim.ev.push({k: "boom", x: b.x + .5, y: b.y + .5, r: b.rad, c: "trap"});
            sim.tr.forEach(function (t) { if (!t.dead && !t.fly && Math.hypot(t.x - b.x - .5, t.y - b.y - .5) < b.rad) dmgU(t, b.dmg, "d"); }); break; } }
          continue;
        }
        if (b.kind !== "def") continue;
        b.cool -= dt; if (b.cool > 0) continue;
        var tg = b.tgt; if (tg && (tg.dead || !valid(b, tg))) tg = null;
        if (!tg) { var bd = 1e9; for (j = 0; j < sim.tr.length; j++) { u = sim.tr[j]; if (u.dead || !valid(b, u)) continue; var d = Math.hypot(u.x - b.cx, u.y - b.cy); if (d < bd) { bd = d; tg = u; } } b.tgt = tg; }
        if (!tg) { b.cool = 0.1; continue; }
        b.cool = b.cd; var shot = b.dps * b.cd; b.aim = Math.atan2(tg.y - b.cy, tg.x - b.cx);
        if (b.spl) sim.tr.forEach(function (t) { if (!t.dead && ((t.fly && b.a) || (!t.fly && b.g)) && Math.hypot(t.x - tg.x, t.y - tg.y) <= b.spl) dmgU(t, shot, "d"); }); else dmgU(tg, shot, "d");
        sim.ev.push({k: "shot", t: b.t, x1: b.cx, y1: b.cy, x2: tg.x, y2: tg.y, spl: b.spl || 0});
      }
      function valid(bb, t) { if (t.fly ? !bb.a : !bb.g) return false; var d = Math.hypot(t.x - bb.cx, t.y - bb.cy); return d <= bb.rng + 0.5 && d >= bb.min; }
      // attackers
      for (i = 0; i < sim.tr.length; i++) {
        u = sim.tr[i]; if (u.dead) continue; if (u.hit > 0) u.hit -= dt; if (u.ab > 0) u.ab -= dt;
        if (u.decoy) continue;
        var mul = (u.bst > 0 ? 1 : 0), spd = u.sp * (1 + 0.3 * mul) * (u.ab > 0 ? 1.15 : 1), dps = u.dps * (1 + 0.8 * mul) * (u.ab > 0 ? 2 : 1); if (u.bst > 0) u.bst -= dt;
        // fight back vs crew defenders
        var en = null, ed = 1e9; for (j = 0; j < sim.df.length; j++) { var e = sim.df[j]; if (e.dead || (e.fly && u.rng < 1.5 && !u.fly)) continue; var dd = Math.hypot(e.x - u.x, e.y - u.y); if (dd < ed && dd <= u.rng + 1.3) { ed = dd; en = e; } }
        if (en && u.boom === undefined) { u.face = en.x < u.x ? -1 : 1; u.atk = 0.2; if (ed > u.rng + 0.2) { moveTo(u, en.x, en.y, spd * dt); } else dmgU(en, dps * dt, "a"); continue; }
        if (u.blk && u.blk.dead) u.blk = null;
        if (u.blk) {
          var bw = u.blk; if (u.boom) { if (boxDist(u.x, u.y, bw) < 0.6) explode(u); else moveTo(u, bw.cx, bw.cy, spd * dt); } else if (boxDist(u.x, u.y, bw) <= Math.max(u.rng, 0.9)) { dmgB(bw, dps * dt, undefined); u.atk = 0.2; u.face = bw.cx < u.x ? -1 : 1; } else moveTo(u, bw.cx, bw.cy, spd * dt);
          continue;
        }
        if (!u.tgt || u.tgt.dead) { u.tgt = pickTarget(u); u.path = null; if (!u.tgt) continue; }
        var t2 = u.tgt, dist = boxDist(u.x, u.y, t2);
        if (u.boom) { if (dist < 0.7) { explode(u); continue; } }
        else if (dist <= u.rng + 0.05) { dmgB(t2, dps * dt, u); u.atk = 0.2; u.face = t2.cx < u.x ? -1 : 1; u.aim = Math.atan2(t2.cy - u.y, t2.cx - u.x); if (u.rng > 2 && (sim.t * 10 | 0) % 6 === (u.id % 6)) sim.ev.push({k: "bolt", x1: u.x, y1: u.y, x2: t2.cx, y2: t2.cy}); continue; }
        if (u.fly) { moveTo(u, t2.cx, t2.cy, spd * dt); continue; }
        if (!u.path) { if (pathBudget-- <= 0) continue; u.path = findPath(u, t2); u.pi = 0; if (!u.path) { u.tgt = null; u.badT = (u.badT || 0) + 1; if (u.badT > 3) u.dead = true; continue; } }
        if (u.pi >= u.path.length) { u.path = null; continue; }
        var nd = u.path[u.pi], o2 = occ[nd[1]][nd[0]];
        if (o2 >= 0 && sim.bld[o2].kind === "wall" && !sim.bld[o2].dead) { u.blk = sim.bld[o2]; continue; }
        if (moveTo(u, nd[0] + .5, nd[1] + .5, spd * dt) < 0.15) u.pi++;
      }
      // defenders (crew)
      for (i = 0; i < sim.df.length; i++) {
        u = sim.df[i]; if (u.dead) continue; if (u.hit > 0) u.hit -= dt;
        var tg2 = null, bd2 = 1e9; for (j = 0; j < sim.tr.length; j++) { var a2 = sim.tr[j]; if (a2.dead || (a2.fly && u.rng < 1.5 && !u.fly)) continue; var d2 = Math.hypot(a2.x - u.x, a2.y - u.y); if (d2 < bd2) { bd2 = d2; tg2 = a2; } }
        if (!tg2) continue; u.face = tg2.x < u.x ? -1 : 1;
        if (bd2 <= u.rng + 0.2) { dmgU(tg2, u.dps * dt, "d"); u.atk = 0.2; } else moveTo(u, tg2.x, tg2.y, u.sp * dt, true);
      }
      sim.tr = sim.tr.filter(function (t) { return !t.dead; }); sim.df = sim.df.filter(function (t) { return !t.dead; });
      // stats / end
      sim.pct = sim.totW ? Math.floor(sim.destW / sim.totW * 100 + 1e-9) : 0;
      sim.stars = (sim.pct >= 50 ? 1 : 0) + (sim.coreDead ? 1 : 0) + (sim.pct >= 100 ? 1 : 0);
      if (sim.pct >= 100) { sim.done = true; sim.why = "total"; }
      else if (sim.t >= sim.cap) { sim.done = true; sim.why = "time"; }
      else if (sim.started && sim.allDeployed && sim.tr.length === 0) { sim.done = true; sim.why = "out"; }
    }
    function moveTo(u, tx, ty, step, ignoreWalls) {
      var dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy); if (d < 1e-6) return 0; if (u.team === "d" || true) { u.face = dx < 0 ? -1 : 1; }
      var s = Math.min(step, d), nx = u.x + dx / d * s, ny = u.y + dy / d * s;
      if (u.team === "d" && !u.fly) {  // crew units: simple slide around buildings
        if (blocked(nx, ny)) { if (!blocked(nx, u.y)) ny = u.y; else if (!blocked(u.x, ny)) nx = u.x; else { nx = u.x; ny = u.y; } }
      }
      u.x = nx; u.y = ny; u.mv = 0.2; return d - s;
    }
    function blocked(x, y) { var tx = Math.floor(x), ty = Math.floor(y); if (tx < 0 || ty < 0 || tx >= N || ty >= N) return true; var o = occ[ty][tx]; return o >= 0 && !sim.bld[o].dead; }
    function explode(u) {
      u.dead = true; var br = u.brad || 1.5; sim.ev.push({k: "boom", x: u.x, y: u.y, r: br, c: "roll"}); sim.ev.push({k: "udead", x: u.x, y: u.y, a: u.art, team: "a", silent: 1});
      var base = u.boom * (1 + 0.2 * ((sim.ulv.roller || 1) - 1));
      sim.bld.forEach(function (b) { if (!b.dead && b.kind !== "trap" && boxDist(u.x, u.y, b) <= br) dmgB(b, b.kind === "wall" ? base * 8 : base * 1.4, u); });
    }
    sim.step = function (dt) { if (sim.done) return; dt = dt || sim.dt; tick(dt); };
    sim.run = function (maxSec) { var n = Math.ceil((maxSec || sim.cap) / sim.dt); for (var i = 0; i < n && !sim.done; i++) tick(sim.dt); return sim.result(); };
    sim.result = function () { return {stars: sim.stars, pct: sim.pct, coreDead: sim.coreDead, loot: {c: Math.round(sim.loot.c), s: Math.round(sim.loot.s)}, t: Math.round(sim.t), why: sim.why, bdest: sim.bdest, defDest: sim.defDest, deployed: sim.deployed}; };
    return sim;
  };
  // ---- AI attacker for async defence: returns a deploy script (deterministic from seed) ----
  S.aiScript = function (seed, army) {
    var r = C.rng(seed), sc = [], sides = r() < 0.4 ? 2 : 1, t = 0.2;
    function edge(side, u) { var m = 1.5, lo = 3, hi = 20; var p = lo + u * (hi - lo); return side === 0 ? [p, m] : side === 1 ? [N - m, p] : side === 2 ? [p, N - m] : [m, p]; }
    var s1 = Math.floor(r() * 4), s2 = (s1 + 2) % 4, u1 = 0.2 + r() * 0.6;
    function emit(k, n, delay) { for (var i = 0; i < n; i++) { var side = sides === 2 && i % 2 ? s2 : s1, e = edge(side, Math.max(0.05, Math.min(0.95, u1 + (r() - 0.5) * 0.3))); sc.push({t: +(t + i * delay).toFixed(2), k: k, x: e[0], y: e[1]}); } t += n * delay + 0.8; }
    emit("bruiser", army.bruiser || 0, 0.5); emit("roller", army.roller || 0, 0.3); emit("slinger", army.slinger || 0, 0.25); emit("drone", army.drone || 0, 0.4);
    if (army.hero) sc.push({t: +(t + 0.5).toFixed(2), k: "hero", x: edge(s1, u1)[0], y: edge(s1, u1)[1]});
    sc.sort(function (a, b) { return a.t - b.t; }); return sc;
  };
})();
