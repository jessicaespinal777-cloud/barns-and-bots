"use strict";
// ---- Deterministic raid simulation (fixed dt). Used for live raids AND headless async defence raids. ----
(function () {
  var C = BB.CC, N = C.GRID, S = BB.CCSim = {};
  var AUNITS = {
    snatch: {name: "Snatcher", art: "snatcher", hp: 120, dps: 16, rng: 0.9, sp: 2.4, sz: 20},
    sting: {name: "Stinger", art: "stinger", hp: 85, dps: 18, rng: 3.2, sp: 2.0, sz: 20},
    atank: {name: "Brood Tank", art: "tank", hp: 650, dps: 24, rng: 1.0, sp: 1.2, sz: 28},
    guard: {name: "Husk Guard", art: "u_guard", hp: 300, dps: 20, rng: 1.0, sp: 1.8, sz: 22},
    raker: {name: "Raker", art: "al_raker", hp: 210, dps: 22, rng: 1.0, sp: 2.2, sz: 24},
    blink: {name: "Blinkstalker", art: "al_blink", hp: 150, dps: 30, rng: 1.2, sp: 3.0, sz: 24},
    bastion: {name: "Bastion", art: "al_bastion", hp: 900, dps: 20, rng: 1.0, sp: 1.1, sz: 32},
    shard: {name: "Shardling", art: "al_shard", hp: 420, dps: 26, rng: 1.1, sp: 1.8, sz: 26}
  };
  S.AUNITS = AUNITS;
  function boxDist(px, py, b) { var dx = Math.max(b.x - px, 0, px - (b.x + b.w)), dy = Math.max(b.y - py, 0, py - (b.y + b.h)); return Math.hypot(dx, dy); }
  S.crewAlien = function (l) {
    var a = []; a.push("snatch", "snatch", "raker"); if (l >= 2) a.push("sting", "blink"); if (l >= 3) a.push("atank", "raker"); if (l >= 4) a.push("bastion", "blink", "sting");
    for (var q = 5; q <= l; q++) { a.push(q % 2 ? "shard" : "raker", "blink"); if (q % 2 === 0) a.push("bastion"); } return a;
  };
  // ---- fence compartments: shared by the sim and the base editor ----
  S.occOf = function (list, skipTraps) {
    var o = []; for (var y = 0; y < N; y++) o.push(new Array(N).fill(-1));
    list.forEach(function (b, i) { var d = C.B[b.t]; if (d.kind === "trap" && skipTraps !== false) return; if (b.dead) return; for (var j = 0; j < d.h; j++) for (var k = 0; k < d.w; k++) o[b.y + j][b.x + k] = i; }); return o;
  };
  // flood from the outer ring over free tiles; returns Uint8Array outside[y*N+x]
  S.flood = function (occ) {
    var out = new Uint8Array(N * N), st = [], i; for (i = 0; i < N; i++) { st.push([i, 0], [i, N - 1], [0, i], [N - 1, i]); }
    while (st.length) { var p = st.pop(), x = p[0], y = p[1]; if (x < 0 || y < 0 || x >= N || y >= N || out[y * N + x] || occ[y][x] >= 0) continue; out[y * N + x] = 1; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    return out;
  };
  function exposedB(b, out) {
    var d = C.B[b.t], x, y; for (x = b.x - 1; x <= b.x + d.w; x++) for (y = b.y - 1; y <= b.y + d.h; y++) { if ((x >= b.x && x < b.x + d.w) && (y >= b.y && y < b.y + d.h)) continue; if ((x < b.x || x >= b.x + d.w) && (y < b.y || y >= b.y + d.h)) continue; if (x < 0 || y < 0 || x >= N || y >= N || out[y * N + x]) return true; } return false;
  }
  S.exposedB = exposedB;
  // report for the gap checker: list = [{t,x,y,l}]
  S.analyze = function (list) {
    var occ = S.occOf(list), out = S.flood(occ), r = {sealed: 0, exposed: 0, comps: 0, coreSealed: false, gaps: [], tiles: out, sealedIds: {}, walls: 0};
    list.forEach(function (b, i) { var d = C.B[b.t]; if (d.kind === "wall") { r.walls++; return; } if (d.kind === "trap") return; if (exposedB(b, out)) r.exposed++; else { r.sealed++; r.sealedIds[i] = 1; if (d.kind === "core") r.coreSealed = true; } });
    var seen = new Uint8Array(N * N);
    for (var y = 3; y < N - 3; y++) for (var x = 3; x < N - 3; x++) {
      var k = y * N + x; if (out[k] || seen[k] || occ[y][x] >= 0) continue; var st = [[x, y]], n = 0, has = false; seen[k] = 1;
      while (st.length) { var p = st.pop(); n++; [[1,0],[-1,0],[0,1],[0,-1]].forEach(function (dd) { var nx = p[0] + dd[0], ny = p[1] + dd[1]; if (nx < 0 || ny < 0 || nx >= N || ny >= N) return; if (occ[ny][nx] >= 0) { has = true; return; } var kk = ny * N + nx; if (!out[kk] && !seen[kk]) { seen[kk] = 1; st.push([nx, ny]); } }); }
      if (has) r.comps++;
    }
    // gap tiles: flooded free tiles that sit between two fence tiles (a hole in a line of fences)
    function wl(x, y) { if (x < 0 || y < 0 || x >= N || y >= N) return false; var o = occ[y][x]; return o >= 0 && C.B[list[o].t].kind === "wall"; }
    for (y = 3; y < N - 3; y++) for (x = 3; x < N - 3; x++) { if (!out[y * N + x] || occ[y][x] >= 0) continue; if ((wl(x - 1, y) && wl(x + 1, y)) || (wl(x, y - 1) && wl(x, y + 1))) r.gaps.push([x, y]); }
    return r;
  };
  function Heap() { this.a = []; }
  Heap.prototype.push = function (n) { var a = this.a, i = a.length; a.push(n); while (i > 0) { var p = (i - 1) >> 1; if (a[p].f <= n.f) break; a[i] = a[p]; i = p; } a[i] = n; };
  Heap.prototype.pop = function () { var a = this.a, top = a[0], last = a.pop(); if (a.length) { var i = 0, n = a.length; for (;;) { var l = 2 * i + 1, r = l + 1, m = i, f = last.f; if (l < n && a[l].f < f) { m = l; f = a[l].f; } if (r < n && a[r].f < f) m = r; if (m === i) break; a[i] = a[m]; i = m; } a[i] = last; } return top; };

  S.create = function (base, opt) {
    opt = opt || {};
    var sim = {t: 0, dt: opt.dt || 0.05, theme: base.theme || "a", bld: [], tr: [], ev: [], zones: [], uid: 1, loot: {c: 0, s: 0}, destW: 0, totW: 0, coreDead: false, done: false, why: "", stars: 0, pct: 0,
      bdest: 0, defDest: 0, deployed: {}, surged: false, surgeT: 0, fdirty: true, flo: null, win: [], winI: 0, first: null, breaches: [], entry: {}, heat: new Float32Array(N * N), healed: 0, script: opt.script || null, scriptI: 0, allDeployed: !!opt.allDeployed, ulv: opt.ulv || {}, cap: opt.cap || C.RAID_SEC, rngv: C.rng(base.seed || 1), paths: 0};
    var occ = []; for (var y = 0; y < N; y++) occ.push(new Array(N).fill(-1));
    sim.occ = occ;
    base.bld.forEach(function (b, i) {
      var d = C.B[b.t], l = b.l || 1, m = C.LV[l] || 1;
      var e = {i: i, t: b.t, x: b.x, y: b.y, w: d.w, h: d.h, l: l, kind: d.kind, mx: d.hp * m, hp: d.hp * m, dead: false, cx: b.x + d.w / 2, cy: b.y + d.h / 2, lc: b.lc || 0, ls: b.ls || 0, lcL: b.lc || 0, lsL: b.ls || 0, cool: 0, tgt: null, hit: 0};
      if (d.kind === "def") { e.dps = d.dps * m * 1.3; e.rng = d.rng; e.min = d.min || 0; e.cd = d.cd; e.spl = d.spl || 0; e.g = d.g; e.a = d.a; e.cool = 0.5; e.spec = d.spec || ""; e.sup = d.sup || 0; e.frz = 0; e.half = 0; e.ramp = 0; e.m = m; }
      if (d.kind === "trap") { e.dmg = d.dmg * m; e.rad = d.rad; e.tk = d.tk || "rake"; e.fuse = d.fuse || 0; e.stun = d.stun || 0; }
      if (d.kind === "core") { e.m = m; } if (d.kind === "wall") { e.open = 0; }
      if (d.kind === "crew") { e.released = false; }
      if (d.kind !== "wall" && d.kind !== "trap") { var wt = d.w * d.h; sim.totW += wt; e.wt = wt; } else e.wt = 0;
      if (d.kind !== "trap") for (var j = 0; j < d.h; j++) for (var k = 0; k < d.w; k++) occ[b.y + j][b.x + k] = i;
      sim.bld.push(e);
    });
    sim.shr = sim.bld.filter(function (b) { return b.spec === "shroud"; }); sim.walls = sim.bld.filter(function (b) { return b.kind === "wall"; });
    sim.crewList = base.crewUnits || null;   // explicit crew (player base) {kind:n} of C.U kinds
    // ---- pathfinding ----
    function cost(tx, ty) { if (tx < 0 || ty < 0 || tx >= N || ty >= N) return -1; var o = occ[ty][tx]; if (o < 0) return 1; var b = sim.bld[o]; if (b.dead) return 1; return b.kind === "wall" ? (b.open > 0 ? 1 : hopMode ? 2 : 5 + b.hp / 90) : -1; }
    var hopMode = false;
    function findPath(u, tb) {
      sim.paths++; hopMode = !!u.hop;
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
        if (kind === "hero") { var P = BB.POWER[o.lvl || 1] || [100, 100], H = C.HEROES[o.hid] || C.HEROES.bale; s = {hp: H.hp * P[0] / 100, dps: H.dps * P[1] / 100, rng: H.rng, sp: H.sp, pref: H.pref, sz: H.sz, art: H.art, hero: 1, hid: H.id}; if (o.hpFrac) s.hp *= o.hpFrac; s.mxh = H.hp * P[0] / 100; }
        else if (kind === "decoy") s = {hp: 500, dps: 0, rng: 0, sp: 0, pref: "any", sz: 22, art: "decoy", decoy: 1};
        else { var U = C.U[kind], L = sim.ulv[kind] || 1; s = {hp: U.hp * (1 + 0.25 * (L - 1)), dps: U.dps * (1 + 0.2 * (L - 1)), rng: U.rng, sp: U.sp, pref: U.pref, fly: U.fly, sz: U.sz, art: U.art, boom: U.boom, brad: U.brad, heal: U.heal ? U.heal * (1 + 0.2 * (L - 1)) : 0, hrate: U.hrate ? U.hrate * (1 + 0.15 * (L - 1)) : 0, lootm: U.lootm, lob: U.lob, spl: U.spl, cone: U.cone, hop: U.hop}; }
      } else { var A = AUNITS[kind] || C.U[kind]; var LL = o.lv || 1; s = {hp: A.hp * (1 + 0.25 * (LL - 1)), dps: A.dps * (1 + 0.2 * (LL - 1)), rng: A.rng, sp: A.sp, pref: "any", fly: A.fly, sz: A.sz, art: A.art}; }
      var u = {id: sim.uid++, k: kind, team: team, x: x, y: y, hp: s.hp, mx: s.mxh || s.hp, dps: s.dps, rng: s.rng, sp: s.sp, pref: s.pref, fly: s.fly || 0, sz: s.sz, art: s.art, boom: s.boom, brad: s.brad, heal: s.heal || 0, hrate: s.hrate || 0, lootm: s.lootm || 0, lob: s.lob || 0, spl: s.spl || 0, cone: s.cone || 0, hop: s.hop || 0, hopCd: 0, dig: 0, stun: 0, root: 0, slow: 0, veil: 0, hmul: 1, hero: s.hero, hid: s.hid, decoy: s.decoy,
        tgt: null, path: null, pi: 0, blk: null, dead: false, bst: 0, hit: 0, ab: 0, face: 1, wob: sim.uid * 0.7, aim: 0};
      if (team === "a") sim.tr.push(u); else sim.df.push(u);
      return u;
    }
    sim.df = [];
    function sideOf(x, y) { var dx = x - 12, dy = y - 12; return Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? "North" : "South") : (dx < 0 ? "West" : "East"); }
    sim.sideOf = sideOf;
    sim.addTroop = addTroop;
    sim.canDeploy = function (x, y) {
      if (x < 0 || y < 0 || x >= N || y >= N) return false;
      if (x >= C.RING - 0.2 && x < N - C.RING + 0.2 && y >= C.RING - 0.2 && y < N - C.RING + 0.2) return false; return true;
    };
    sim.deploy = function (kind, x, y, o) {
      if (sim.done) return null; if (!sim.canDeploy(x, y)) return null;
      if (C.UMAX && C.UMAX[kind] && (sim.deployed[kind] || 0) >= C.UMAX[kind]) return null;
      var side = sideOf(x, y); sim.entry[side] = (sim.entry[side] || 0) + 1;
      var u = addTroop(kind, x, y, "a", o || {lvl: opt.heroLvl, hpFrac: opt.heroHp, hid: opt.heroId}); sim.deployed[kind] = (sim.deployed[kind] || 0) + 1; if (kind === "wrench") u.hmul = sim.deployed.wrench > 1 ? 0.6 : 1; sim.ev.push({k: "spawn", x: x, y: y}); sim.started = true; return u;
    };
    sim.spell = function (kind, x, y) {
      if (sim.done) return; sim.started = true;
      if (kind === "decoy") { var u = addTroop("decoy", x, y, "a"); sim.deployed.decoy = (sim.deployed.decoy || 0) + 1; return u; }
      sim.deployed[kind] = (sim.deployed[kind] || 0) + 1;
      if (kind === "spark") {
        sim.bld.forEach(function (b) { if (!b.dead && b.kind !== "trap" && Math.hypot(b.cx - x, b.cy - y) < 2.2 + b.w / 2) dmgB(b, 260, null); });
        sim.ev.push({k: "boom", x: x, y: y, r: 2.4, c: "spark"});
      } else if (kind === "clamp") {
        sim.bld.forEach(function (b) { if (!b.dead && b.kind === "def" && Math.hypot(b.cx - x, b.cy - y) < 3.2 + b.w / 2) { b.frz = 3; b.half = 5; b.ramp = 0; } });
        sim.zones.push({k: "clamp", x: x, y: y, r: 3.2, t: 3, dur: 3}); sim.ev.push({k: "boom", x: x, y: y, r: 3.2, c: "clamp"});
      } else if (kind === "stitch") {
        sim.bld.forEach(function (b) { if (!b.dead && b.kind === "wall" && Math.hypot(b.cx - x, b.cy - y) < 3.2) b.open = 8; });
        sim.tr.forEach(function (t) { t.blk = null; t.path = null; }); sim.zones.push({k: "stitch", x: x, y: y, r: 3.2, t: 8, dur: 8}); sim.ev.push({k: "boom", x: x, y: y, r: 3.2, c: "stitch"});
      } else if (kind === "veil") { sim.zones.push({k: "veil", x: x, y: y, r: 3.4, t: 6, dur: 6}); sim.ev.push({k: "boom", x: x, y: y, r: 3.4, c: "veil"}); }
      else sim.zones.push({k: kind, x: x, y: y, r: 3, t: kind === "rain" ? 6 : 8, dur: kind === "rain" ? 6 : 8});
    };
    sim.ability = function () {
      var h = null; sim.tr.forEach(function (u) { if (u.hero && !u.dead) h = u; }); if (!h || h.ab > 0 || h.used) return false;
      if (h.hid === "scx") {   // Murder of Crows: blind + strike the nearest defenses
        h.used = true; h.ab = 5; h.hp = Math.min(h.mx, h.hp + h.mx * 0.2);
        var dl = sim.bld.filter(function (b) { return !b.dead && b.kind === "def" && Math.hypot(b.cx - h.x, b.cy - h.y) < 11; }).sort(function (a, b) { return Math.hypot(a.cx - h.x, a.cy - h.y) - Math.hypot(b.cx - h.x, b.cy - h.y); }).slice(0, 4), tg = [];
        dl.forEach(function (b) { b.cool = Math.max(b.cool, 0) + 5; b.blind = 5; tg.push([b.cx, b.cy]); dmgB(b, h.dps * 4, h); });
        sim.ev.push({k: "crows", x: h.x, y: h.y, t: tg}); sim.ev.push({k: "boom", x: h.x, y: h.y, r: 1.6, c: "crow"}); return true;
      }
      h.used = true; h.ab = 6; h.hp = Math.min(h.mx, h.hp + h.mx * 0.35); sim.ev.push({k: "boom", x: h.x, y: h.y, r: 2.2, c: "slam"});
      sim.bld.forEach(function (b) { if (!b.dead && b.kind !== "trap" && Math.hypot(b.cx - h.x, b.cy - h.y) < 2.2 + b.w / 2) dmgB(b, h.dps * 3, h); });
      return true;
    };
    // ---- damage ----
    function shrouded(b) { for (var q = 0; q < sim.shr.length; q++) { var sh = sim.shr[q]; if (!sh.dead && sh.frz <= 0 && Math.hypot(sh.cx - b.cx, sh.cy - b.cy) <= sh.rng) return true; } return false; }
    function dmgB(b, amt, src) {
      if (b.dead) return; if (src && src.rng > 2 && sim.shr.length && b.kind !== "wall" && shrouded(b)) amt *= 0.7;
      if (sim.first === null && src && b.kind !== "wall" && b.kind !== "trap") sim.first = sim.t;
      var d = Math.min(amt, b.hp); b.hp -= amt; b.hit = 0.12;
      if (src !== undefined && b.kind !== "wall") { var f = d / b.mx, lm = (src && src.lootm) || 1; if (b.lcL > 0) { var g = Math.min(b.lcL, b.lc * f * lm); b.lcL -= g; sim.loot.c += g; } if (b.lsL > 0) { var g2 = Math.min(b.lsL, b.ls * f * lm); b.lsL -= g2; sim.loot.s += g2; } }
      if (b.hp <= 0) killB(b);
    }
    function killB(b) {
      b.dead = true; b.hp = 0; var o = sim.occ; for (var j = 0; j < b.h; j++) for (var i = 0; i < b.w; i++) if (o[b.y + j][b.x + i] === b.i) o[b.y + j][b.x + i] = -1;
      sim.ev.push({k: "bdead", b: b.i, x: b.cx, y: b.cy, w: b.w, kind: b.kind});
      if (b.kind !== "wall" && b.kind !== "trap") { sim.destW += b.wt; sim.bdest++; if (b.kind === "def") sim.defDest++; if (b.kind === "core") sim.coreDead = true; }
      if (b.kind === "wall") { sim.wallDest = (sim.wallDest || 0) + 1; sim.breaches.push({t: +sim.t.toFixed(1), x: b.x, y: b.y, s: sideOf(b.x, b.y)}); sim.fdirty = true; }
      else if (b.kind !== "trap") sim.fdirty = true;
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
    // ---- targeting (roles: any / def / gdef / air / loot / breaker) ----
    function flo() { if (sim.fdirty || !sim.flo) { sim.flo = S.flood(occ); sim.fdirty = false; sim.fver = (sim.fver || 0) + 1; } return sim.flo; }
    function pickTarget(u) {
      var live = [], i, b, pref = u.pref; for (i = 0; i < sim.bld.length; i++) { b = sim.bld[i]; if (!b.dead && b.kind !== "wall" && b.kind !== "trap") live.push(b); }
      function nearest(fn) { var best = null, bd = 1e9; for (var q = 0; q < live.length; q++) { var bb = live[q]; if (fn && !fn(bb)) continue; var d = Math.hypot(bb.cx - u.x, bb.cy - u.y); if (d < bd) { bd = d; best = bb; } } return best; }
      var t = null;
      if (pref === "def") t = nearest(function (x) { return x.kind === "def" && !x.sup; });
      else if (pref === "gdef") t = nearest(function (x) { return x.kind === "def" && x.g && !x.sup; }) || nearest(function (x) { return x.kind === "def" && !x.sup; });
      else if (pref === "air") t = nearest(function (x) { return x.kind === "def" && x.a && !x.sup; }) || nearest(function (x) { return x.kind === "def" && !x.sup; });
      else if (pref === "loot") t = nearest(function (x) { return (x.kind === "sto" || x.kind === "col") && x.lcL + x.lsL > 1; });
      else if (pref === "breaker") { var out = flo(); t = nearest(function (x) { return !S.exposedB(x, out); }); }
      return t || nearest(null);
    }
    function regTick(dt) {
      var pathBudget = 10, i, j, u, b, q;
      sim.t += dt;
      if (sim.script) { while (sim.scriptI < sim.script.length && sim.script[sim.scriptI].t <= sim.t) { var a = sim.script[sim.scriptI++]; if (a.s) sim.spell(a.k, a.x, a.y); else if (a.k === "ability") sim.ability(); else sim.deploy(a.k, a.x, a.y); } if (sim.scriptI >= sim.script.length) sim.allDeployed = true; }
      // zones
      for (i = 0; i < sim.zones.length; i++) { var z = sim.zones[i]; z.t -= dt; if (z.k === "clamp" || z.k === "stitch") continue; sim.tr.forEach(function (t) { if (t.dead || t.decoy || Math.hypot(t.x - z.x, t.y - z.y) > z.r) return; if (z.k === "rain") t.hp = Math.min(t.mx, t.hp + t.mx * 0.14 * dt); else if (z.k === "veil") t.veil = 0.25; else t.bst = 0.12; }); }
      sim.zones = sim.zones.filter(function (z) { return z.t > 0; });
      if (sim.surgeT > 0) sim.surgeT -= dt;
      for (i = 0; i < sim.walls.length; i++) if (sim.walls[i].open > 0) sim.walls[i].open -= dt;
      // Core weapon: the first time the Core drops to half health it fires a shockwave
      if (!sim.surged) { var core = null; for (i = 0; i < sim.bld.length; i++) if (sim.bld[i].kind === "core") core = sim.bld[i];
        if (core && !core.dead && core.hp <= core.mx * 0.5) { sim.surged = true; sim.surgeT = 5; sim.ev.push({k: "boom", x: core.cx, y: core.cy, r: 4.2, c: "surge"});
          sim.tr.forEach(function (t) { if (t.dead || t.decoy) return; var dx = t.x - core.cx, dy = t.y - core.cy, d = Math.hypot(dx, dy); if (d > 4.2) return; dmgU(t, 90 * (core.m || 1), "d"); t.stun = Math.max(t.stun, 1);
            if (!t.fly && d > 0.01) { for (var st = 0; st < 6; st++) { var nx = t.x + dx / d * 0.25, ny = t.y + dy / d * 0.25; if (blocked(nx, ny)) break; t.x = nx; t.y = ny; } t.path = null; t.blk = null; } }); } }
      // crew triggers
      for (i = 0; i < sim.bld.length; i++) { b = sim.bld[i]; if (b.kind === "crew" && !b.dead && !b.released) { for (j = 0; j < sim.tr.length; j++) { u = sim.tr[j]; if (!u.dead && Math.hypot(u.x - b.cx, u.y - b.cy) < 5.5) { release(b); break; } } } }
      // defences and traps
      for (i = 0; i < sim.bld.length; i++) {
        b = sim.bld[i]; if (b.dead) continue; if (b.hit > 0) b.hit -= dt;
        if (b.kind === "trap") {
          var tx0 = b.x + .5, ty0 = b.y + .5;
          if (b.fuseT > 0) { b.fuseT -= dt; if (b.fuseT <= 0) fireTrap(b); continue; }
          if (b.sprung) continue;
          for (j = 0; j < sim.tr.length; j++) { u = sim.tr[j]; if (u.dead || u.decoy || u.dig > 0) continue; var td = Math.hypot(u.x - tx0, u.y - ty0);
            if (b.tk === "mine" ? (u.fly && td < 1.6) : (!u.fly && td < 1.1)) { b.sprung = true; if (b.tk === "cache") { b.fuseT = b.fuse; sim.ev.push({k: "boom", x: tx0, y: ty0, r: 1, c: "fuse"}); } else fireTrap(b); break; } }
          continue;
        }
        if (b.kind !== "def" || b.sup) continue;
        if (b.blind > 0) b.blind -= dt; if (b.frz > 0) { b.frz -= dt; b.ramp = 0; continue; } if (b.half > 0) b.half -= dt;
        b.cool -= dt * (sim.surgeT > 0 ? 1.6 : 1); if (b.cool > 0) continue;
        var tg = b.tgt; if (tg && (tg.dead || !valid(b, tg))) tg = null;
        if (!tg) { var bd = 1e9; for (j = 0; j < sim.tr.length; j++) { u = sim.tr[j]; if (u.dead || !valid(b, u)) continue; var d = Math.hypot(u.x - b.cx, u.y - b.cy); if (d < bd) { bd = d; tg = u; } } b.tgt = tg; }
        if (!tg) { b.cool = 0.1; if (b.spec === "ramp") b.ramp = Math.max(0, b.ramp - 0.5); continue; }
        b.cool = b.cd * (b.half > 0 ? 2 : 1); var shot = b.dps * b.cd; b.aim = Math.atan2(tg.y - b.cy, tg.x - b.cx);
        if (b.spec === "cone") {
          sim.tr.forEach(function (t) { if (t.dead || !valid(b, t)) return; var ang = Math.atan2(t.y - b.cy, t.x - b.cx), da = Math.abs(((ang - b.aim + 3.1416 * 3) % 6.2832) - 3.1416); if (da <= 0.6) dmgU(t, shot, "d"); });
          sim.ev.push({k: "fan", x1: b.cx, y1: b.cy, a: b.aim, r: b.rng});
        } else if (b.spec === "chain") {
          dmgU(tg, shot, "d"); var hit = [tg], pts = [[b.cx, b.cy], [tg.x, tg.y]], last = tg;
          for (var ch = 0; ch < 2; ch++) { var nx2 = null, nd = 2.8; sim.tr.forEach(function (t) { if (t.dead || !t.fly || hit.indexOf(t) >= 0 || t.dig > 0) return; var dd = Math.hypot(t.x - last.x, t.y - last.y); if (dd < nd) { nd = dd; nx2 = t; } }); if (!nx2) break; dmgU(nx2, shot * 0.7, "d"); hit.push(nx2); pts.push([nx2.x, nx2.y]); last = nx2; }
          sim.ev.push({k: "chain", p: pts});
        } else if (b.spec === "ramp") {
          if (b.rt !== tg) { b.ramp = 0; b.rt = tg; } var mult = 1 + Math.min(3, b.ramp / 2); b.ramp += b.cd; dmgU(tg, shot * mult, "d");
          sim.ev.push({k: "beam", x1: b.cx, y1: b.cy, x2: tg.x, y2: tg.y, m: mult});
        } else {
          if (b.spl) sim.tr.forEach(function (t) { if (!t.dead && ((t.fly && b.a) || (!t.fly && b.g)) && Math.hypot(t.x - tg.x, t.y - tg.y) <= b.spl) dmgU(t, shot, "d"); }); else dmgU(tg, shot, "d");
          if (b.spec === "slow") tg.slow = 3;
          if (b.spec === "knock" && !tg.fly) { var kx = tg.x - b.cx, ky = tg.y - b.cy, kd = Math.hypot(kx, ky) || 1; for (var ks = 0; ks < 6; ks++) { var nx3 = tg.x + kx / kd * 0.25, ny3 = tg.y + ky / kd * 0.25; if (blocked(nx3, ny3)) break; tg.x = nx3; tg.y = ny3; } tg.path = null; tg.blk = null; }
          sim.ev.push({k: "shot", t: b.t, x1: b.cx, y1: b.cy, x2: tg.x, y2: tg.y, spl: b.spl || 0});
        }
      }
      function valid(bb, t) { if (t.fly ? !bb.a : !bb.g) return false; if (t.dig > 0) return false; var d = Math.hypot(t.x - bb.cx, t.y - bb.cy); if (t.veil > 0 && d > 1.5) return false; return d <= bb.rng + 0.5 && d >= bb.min; }
      function fireTrap(b) {
        var x = b.x + .5, y = b.y + .5; b.sprung = true; b.dead = true; b.fuseT = 0; sim.ev.push({k: "boom", x: x, y: y, r: b.rad, c: b.tk === "rake" ? "trap" : b.tk});
        sim.tr.forEach(function (t) {
          if (t.dead || Math.hypot(t.x - x, t.y - y) >= b.rad) return;
          if (b.tk === "rake") { if (!t.fly) dmgU(t, b.dmg, "d"); }
          else if (b.tk === "snare") { if (!t.fly) { dmgU(t, b.dmg, "d"); t.root = 3; } }
          else if (b.tk === "mine") { if (t.fly) { dmgU(t, b.dmg, "d"); t.slow = 3; } }
          else if (b.tk === "cache") { dmgU(t, b.dmg, "d"); }
          else if (b.tk === "stake") { dmgU(t, b.dmg, "d"); t.stun = Math.max(t.stun, b.stun); }
        });
      }
      // attackers
      for (i = 0; i < sim.tr.length; i++) {
        u = sim.tr[i]; if (u.dead) continue; if (u.hit > 0) u.hit -= dt; if (u.ab > 0) u.ab -= dt;
        if (u.decoy) continue;
        if (u.veil > 0) u.veil -= dt; if (u.slow > 0) u.slow -= dt; if (u.root > 0) u.root -= dt; if (u.hopCd > 0) u.hopCd -= dt;
        var hk = (u.y | 0) * N + (u.x | 0); if (hk >= 0 && hk < N * N) sim.heat[hk] += dt;
        if (u.stun > 0) { u.stun -= dt; continue; }
        if (u.dig > 0) { u.dig -= dt; if (u.dig <= 0 && u.digTo) { u.x = u.digTo[0]; u.y = u.digTo[1]; u.digTo = null; sim.ev.push({k: "burrow", x: u.x, y: u.y}); } continue; }
        var mul = (u.bst > 0 ? 1 : 0), spd = u.sp * (1 + 0.3 * mul) * (u.ab > 0 ? 1.15 : 1) * (u.root > 0 ? 0 : 1) * (u.slow > 0 ? 0.5 : 1), dps = u.dps * (1 + 0.8 * mul) * (u.ab > 0 ? 2 : 1); if (u.bst > 0) u.bst -= dt;
        // healer: follow the army and repair the most hurt allies
        if (u.heal) {
          if (u.hb === undefined) u.hb = u.heal;
          if (u.hb > 0) { var cand = sim.tr.filter(function (a2) { return !a2.dead && !a2.decoy && !a2.heal && a2.hp < a2.mx - 0.5 && Math.hypot(a2.x - u.x, a2.y - u.y) <= u.rng; }).sort(function (p1, p2) { return p1.hp / p1.mx - p2.hp / p2.mx; }).slice(0, 3);
            cand.forEach(function (a3) { var amt = Math.min(u.hrate * u.hmul * dt, a3.mx - a3.hp, u.hb); if (amt <= 0) return; a3.hp += amt; u.hb -= amt; sim.healed += amt; });
            if (cand.length && (((sim.t * 10) | 0) % 6 === u.id % 6)) sim.ev.push({k: "heal", x1: u.x, y1: u.y, x2: cand[0].x, y2: cand[0].y}); }
          var fo = null, fd = 1e9; for (j = 0; j < sim.tr.length; j++) { var a4 = sim.tr[j]; if (a4.dead || a4.decoy || a4.heal || a4.id === u.id) continue; var dh = Math.hypot(a4.x - u.x, a4.y - u.y); if (dh < fd) { fd = dh; fo = a4; } }
          if (fo && fd > 1.8) { u.slide = 1; moveTo(u, fo.x, fo.y, spd * dt); }
          continue;
        }
        // fight back vs crew defenders
        var en = null, ed = 1e9; for (j = 0; j < sim.df.length; j++) { var e = sim.df[j]; if (e.dead || (e.fly && u.rng < 1.5 && !u.fly)) continue; var dd = Math.hypot(e.x - u.x, e.y - u.y); if (dd < ed && dd <= u.rng + 1.3) { ed = dd; en = e; } }
        if (en && u.boom === undefined) { u.face = en.x < u.x ? -1 : 1; u.atk = 0.2; if (ed > u.rng + 0.2) { moveTo(u, en.x, en.y, spd * dt); } else { dmgU(en, dps * dt, "a"); if (u.cone) sim.df.forEach(function (o3) { if (o3 !== en && !o3.dead && Math.hypot(o3.x - en.x, o3.y - en.y) <= 1.3) dmgU(o3, dps * dt * u.cone, "a"); }); } continue; }
        if (u.pref === "breaker") { flo(); if (u.fv !== sim.fver) { if (u.fv !== undefined) { u.tgt = null; u.path = null; u.blk = null; } u.fv = sim.fver; } }
        if (u.blk && u.blk.dead) u.blk = null;
        if (u.blk && u.blk.open > 0) { u.blk = null; u.path = null; }
        if (u.blk) {
          var bw = u.blk; if (u.boom) { if (boxDist(u.x, u.y, bw) < 0.6) explode(u); else moveTo(u, bw.cx, bw.cy, spd * dt); } else if (boxDist(u.x, u.y, bw) <= Math.max(u.rng, 0.9)) { dmgB(bw, dps * dt, undefined); if (u.cone) splashB(u, bw, dps * dt * u.cone, 1.4); u.atk = 0.2; u.face = bw.cx < u.x ? -1 : 1; } else moveTo(u, bw.cx, bw.cy, spd * dt);
          continue;
        }
        if (!u.tgt || u.tgt.dead) { u.tgt = pickTarget(u); u.path = null; if (!u.tgt) continue; }
        var t2 = u.tgt, dist = boxDist(u.x, u.y, t2);
        if (u.boom) { if (dist < 0.7) { explode(u); continue; } }
        else if (dist <= u.rng + 0.05) {
          dmgB(t2, dps * dt, u); u.atk = 0.2; u.face = t2.cx < u.x ? -1 : 1; u.aim = Math.atan2(t2.cy - u.y, t2.cx - u.x);
          if (u.cone) splashB(u, t2, dps * dt * u.cone, 1.4); else if (u.spl) splashB(u, t2, dps * dt * 0.5, u.spl + 0.4, true);
          if (u.rng > 2 && (sim.t * 10 | 0) % 6 === (u.id % 6)) sim.ev.push({k: u.lob ? "lob" : "bolt", hid: u.hid, x1: u.x, y1: u.y, x2: t2.cx, y2: t2.cy}); continue; }
        if (u.fly) { moveTo(u, t2.cx, t2.cy, spd * dt); continue; }
        if (!u.path) { if (pathBudget-- <= 0) continue; u.path = findPath(u, t2); u.pi = 0; if (!u.path) { u.tgt = null; u.badT = (u.badT || 0) + 1; if (u.badT > 3) u.dead = true; continue; } }
        if (u.pi >= u.path.length) { u.path = null; continue; }
        var nd = u.path[u.pi], o2 = occ[nd[1]][nd[0]];
        if (o2 >= 0 && sim.bld[o2].kind === "wall" && !sim.bld[o2].dead && !(sim.bld[o2].open > 0)) {
          if (u.hop && u.hopCd <= 0) {   // Burrow Badger: dig under up to 4 fence tiles
            var kk = 0; for (q = u.pi; q < u.path.length && kk < u.hop; q++) { var pn = u.path[q], oo = occ[pn[1]][pn[0]]; if (oo >= 0 && sim.bld[oo].kind === "wall" && !sim.bld[oo].dead && !(sim.bld[oo].open > 0)) kk++; else break; }
            var di = u.pi + kk, dn = u.path[di];
            if (dn && occ[dn[1]][dn[0]] < 0) { u.dig = 0.7; u.digTo = [dn[0] + .5, dn[1] + .5]; u.hopCd = 8; u.pi = di + 1; sim.ev.push({k: "burrow", x: u.x, y: u.y}); continue; }
          }
          u.blk = sim.bld[o2]; continue; }
        if (moveTo(u, nd[0] + .5, nd[1] + .5, spd * dt) < 0.15) u.pi++;
      }
      function splashB(u, tb, amt, rad, byCentre) {
        for (var q2 = 0; q2 < sim.bld.length; q2++) { var ob = sim.bld[q2]; if (ob === tb || ob.dead || ob.kind === "trap") continue; var dd2 = byCentre ? Math.hypot(ob.cx - tb.cx, ob.cy - tb.cy) - ob.w / 2 : boxDist(u.x, u.y, ob); if (dd2 <= rad) dmgB(ob, amt, u); }
        for (var q3 = 0; q3 < sim.df.length; q3++) { var od = sim.df[q3]; if (!od.dead && Math.hypot(od.x - tb.cx, od.y - tb.cy) <= rad + 0.3) dmgU(od, amt * 0.8, "a"); }
      }
      // defenders (crew)
      for (i = 0; i < sim.df.length; i++) {
        u = sim.df[i]; if (u.dead) continue; if (u.hit > 0) u.hit -= dt;
        var tg2 = null, bd2 = 1e9; for (j = 0; j < sim.tr.length; j++) { var a2 = sim.tr[j]; if (a2.dead || a2.dig > 0 || (a2.fly && u.rng < 1.5 && !u.fly)) continue; var d2 = Math.hypot(a2.x - u.x, a2.y - u.y); if (d2 < bd2) { bd2 = d2; tg2 = a2; } }
        if (!tg2) continue; u.face = tg2.x < u.x ? -1 : 1;
        if (bd2 <= u.rng + 0.2) { dmgU(tg2, u.dps * dt, "d"); u.atk = 0.2; } else moveTo(u, tg2.x, tg2.y, u.sp * dt, true);
      }
      sim.tr = sim.tr.filter(function (t) { return !t.dead; }); sim.df = sim.df.filter(function (t) { return !t.dead; });
      // healers and decoys alone cannot win a raid
      if (sim.started && sim.allDeployed && sim.tr.length && sim.tr.every(function (t) { return t.heal || t.decoy; })) sim.tr.forEach(function (t) { t.dead = true; sim.ev.push({k: "udead", x: t.x, y: t.y, a: t.art, team: "a", silent: 1}); });
      sim.tr = sim.tr.filter(function (t) { return !t.dead; });
      // stats / end
      sim.pct = sim.totW ? Math.floor(sim.destW / sim.totW * 100 + 1e-9) : 0;
      sim.stars = (sim.pct >= 50 ? 1 : 0) + (sim.coreDead ? 1 : 0) + (sim.pct >= 100 ? 1 : 0);
      while (sim.winI < 3 && sim.t >= C.WINDOWS[sim.winI].b - 1e-6) { sim.win.push({pct: sim.pct, stars: sim.stars, defs: sim.defDest, c: Math.round(sim.loot.c)}); sim.winI++; }
      if (sim.pct >= 100) { sim.done = true; sim.why = "total"; }
      else if (sim.t >= sim.cap) { sim.done = true; sim.why = "time"; }
      else if (sim.started && sim.allDeployed && sim.tr.length === 0) { sim.done = true; sim.why = "out"; }
    }
    var tick = regTick;
    function moveTo(u, tx, ty, step, ignoreWalls) {
      var dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy); if (d < 1e-6) return 0; if (u.team === "d" || true) { u.face = dx < 0 ? -1 : 1; }
      var s = Math.min(step, d), nx = u.x + dx / d * s, ny = u.y + dy / d * s;
      if ((u.team === "d" || u.slide) && !u.fly) {  // crew units and healers: simple slide around buildings
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
    sim.result = function () { return {win: sim.win, funnel: S.funnel(sim), healed: Math.round(sim.healed), stars: sim.stars, pct: sim.pct, coreDead: sim.coreDead, loot: {c: Math.round(sim.loot.c), s: Math.round(sim.loot.s)}, t: Math.round(sim.t), why: sim.why, bdest: sim.bdest, defDest: sim.defDest, deployed: sim.deployed}; };
    return sim;
  };
  // ---- AI attacker for async defence: returns a deploy script (deterministic from seed) ----
  // ---- funnel-lane summary for the results screen and replays ----
  S.funnel = function (sim) {
    var out = {lines: [], heat: null}, ent = sim.entry || {}, tot = 0, best = null, k;
    for (k in ent) { tot += ent[k]; if (!best || ent[k] > ent[best]) best = k; }
    var br = {}, bb = null; (sim.breaches || []).forEach(function (b) { br[b.s] = (br[b.s] || 0) + 1; if (!bb || br[b.s] > br[bb]) bb = b.s; });
    var sh = {North: 0, South: 0, East: 0, West: 0}, hs = 0, hb = null; for (var y = 3; y < N - 3; y++) for (var x = 3; x < N - 3; x++) { var v = sim.heat[y * N + x]; if (v > 0) { var sd = sim.sideOf(x, y); sh[sd] += v; hs += v; } }
    for (k in sh) if (!hb || sh[k] > sh[hb]) hb = k;
    if (bb) out.lines.push("Main funnel: " + bb + " lane (" + br[bb] + " fence " + (br[bb] === 1 ? "breach" : "breaches") + ")");
    else if (hb && hs > 0) out.lines.push("Main funnel: " + hb + " lane (" + Math.round(sh[hb] / hs * 100) + "% of troop time, no fence breached)");
    if (best) out.lines.push(Math.round(ent[best] / Math.max(1, tot) * 100) + "% of troops entered " + best);
    if (sim.first !== null && sim.first !== undefined) out.lines.push("First building hit at " + Math.floor(sim.first / 60) + ":" + ("0" + Math.floor(sim.first % 60)).slice(-2));
    var w = sim.win || [], prev = 0, names = [], any = false; for (var i = 0; i < 3; i++) { var cur = w[i] ? w[i].pct : sim.pct; names.push(C.WINDOWS[i].n + " +" + Math.max(0, cur - prev) + "%"); prev = Math.max(prev, cur); }
    out.lines.push("Windows: " + names.join(" / "));
    if (!(sim.breaches || []).length && sim.pct < 50) out.lines.push("Tip: no fence broke. Try a Roller, a Burrow Badger or Fence Stitch at the funnel.");
    else if (tot && best && ent[best] === tot && tot > 3) out.lines.push("Tip: every troop used one side. Split the attack to dodge a single kill zone.");
    out.side = best; out.hot = hb; out.breaches = br; out.n = (sim.breaches || []).length; out.heat = hs > 0 ? Array.prototype.slice.call(sim.heat) : null;
    return out;
  };
  S.aiScript = function (seed, army) {
    var r = C.rng(seed), sc = [], sides = r() < 0.4 ? 2 : 1, t = 0.2;
    function edge(side, u) { var m = 1.5, lo = 3, hi = 20; var p = lo + u * (hi - lo); return side === 0 ? [p, m] : side === 1 ? [N - m, p] : side === 2 ? [p, N - m] : [m, p]; }
    var s1 = Math.floor(r() * 4), s2 = (s1 + 2) % 4, u1 = 0.2 + r() * 0.6;
    function emit(k, n, delay) { for (var i = 0; i < n; i++) { var side = sides === 2 && i % 2 ? s2 : s1, e = edge(side, Math.max(0.05, Math.min(0.95, u1 + (r() - 0.5) * 0.3))); sc.push({t: +(t + i * delay).toFixed(2), k: k, x: e[0], y: e[1]}); } t += n * delay + 0.8; }
    emit("bruiser", army.bruiser || 0, 0.5); emit("roller", army.roller || 0, 0.3); emit("slinger", army.slinger || 0, 0.25); emit("drone", army.drone || 0, 0.4);
    ["sow", "hound", "spinner", "badger", "chick", "mule", "kestrel", "wrench"].forEach(function (k) { emit(k, army[k] || 0, k === "chick" ? 0.15 : 0.4); });
    if (army.hero) sc.push({t: +(t + 0.5).toFixed(2), k: "hero", x: edge(s1, u1)[0], y: edge(s1, u1)[1]});
    sc.sort(function (a, b) { return a.t - b.t; }); return sc;
  };
})();
