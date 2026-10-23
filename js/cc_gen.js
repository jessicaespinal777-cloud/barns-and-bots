"use strict";
// ---- Procedural alien-outpost generator, hand-made story bases, local base pool ----
(function () {
  var C = BB.CC, G = BB.CCGen = {}, N = C.GRID, R0 = C.RING, R1 = C.GRID - C.RING - 1; // buildable 3..20
  function mk() { var g = []; for (var y = 0; y < N; y++) { g.push(new Array(N).fill(0)); } return g; }
  function fits(g, x, y, w, h, mg) {
    mg = mg || 0;
    if (x < R0 || y < R0 || x + w - 1 > R1 || y + h - 1 > R1) return false;
    for (var j = y - mg; j < y + h + mg; j++) for (var i = x - mg; i < x + w + mg; i++) { if (i < 0 || j < 0 || i >= N || j >= N) continue; if (g[j][i]) return false; }
    return true;
  }
  function put(g, x, y, w, h) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) g[j][i] = 1; }
  G.make = function (seed, fh, o) {
    o = o || {}; var rnd = C.rng(seed), g = mk(), bld = [];
    var lv = Math.max(1, Math.min(4, fh - (rnd() < 0.3 ? 1 : 0) + (o.lvBonus || 0)));
    function add(t, x, y, l) { var d = C.B[t]; bld.push({t: t, x: x, y: y, l: l || lv}); put(g, x, y, d.w, d.h); return bld[bld.length - 1]; }
    function cnt(t) { var m = C.B[t].mx[fh - 1]; return m; }
    var ff = o.diff || 0;  // -1 easier .. +1 harder
    var n = {
      blaster: Math.max(1, cnt("blaster") - (rnd() < 0.5 ? 1 : 0) + (ff > 0 ? 0 : 0)), sniper: cnt("sniper") ? Math.max(0, cnt("sniper") - (rnd() < 0.4 ? 1 : 0)) : 0,
      lobber: cnt("lobber") ? Math.max(1, cnt("lobber") - (rnd() < 0.5 ? 1 : 0)) : 0, flak: cnt("flak") ? Math.max(1, cnt("flak") - (rnd() < 0.4 ? 1 : 0)) : 0,
      trap: Math.round(cnt("trap") * (0.5 + rnd() * 0.5)), vc: Math.max(1, cnt("barn") - (rnd() < 0.4 ? 1 : 0)), vs: Math.max(1, cnt("silo") - (rnd() < 0.4 ? 1 : 0)),
      hc: Math.max(1, cnt("field") - 1 + (rnd() < 0.5 ? 1 : 0)), hs: Math.max(1, cnt("rig") - (rnd() < 0.5 ? 1 : 0)), crew: fh >= 2 && rnd() < 0.8 ? 1 : 0
    };
    if (o.counts) for (var k in o.counts) n[k] = o.counts[k];
    var cx = 10, cy = 10; add("core", cx, cy, fh);
    var r = fh >= 3 ? 4 : 3, X0 = 11 - r - 1, X1 = 11 + r + 1;  // wall ring perimeter at X0/X1
    // inner items
    function inner(t, l) {
      var d = C.B[t];
      for (var tries = 0; tries < 80; tries++) { var x = X0 + 1 + Math.floor(rnd() * (X1 - X0 - d.w)), y = X0 + 1 + Math.floor(rnd() * (X1 - X0 - d.h)); if (fits(g, x, y, d.w, d.h, 0)) return add(t, x, y, l); }
      return null;
    }
    var innerList = []; if (n.vc > 0) innerList.push("barn"); if (n.vs > 0) innerList.push("silo"); if (n.crew) innerList.push("crewhall");
    if (n.lobber) innerList.push("lobber"); else if (n.sniper) { innerList.push("sniper"); n.sniper--; }
    innerList.forEach(function (t) { var b = inner(t); if (b) { if (t === "barn") n.vc--; if (t === "silo") n.vs--; if (t === "crewhall") n.crew = 0; if (t === "lobber") n.lobber--; } });
    var wallLv = Math.max(1, lv);
    var gaps = {}; if (!o.noGap) { var ng = rnd() < 0.55 ? 1 : 0; for (var q = 0; q < ng; q++) gaps[Math.floor(rnd() * 4)] = 1 + Math.floor(rnd() * 2); }
    var walls = [];
    function wall(x, y) { if (x < R0 || y < R0 || x > R1 || y > R1) return; if (g[y][x]) return; walls.push({t: "wall", x: x, y: y, l: wallLv}); g[y][x] = 2; }
    if (!o.noWalls) {
      for (var i = X0; i <= X1; i++) {
        var side = [[i, X0, 0], [i, X1, 1], [X0, i, 2], [X1, i, 3]];
        side.forEach(function (s) { if (gaps[s[2]] && Math.abs(i - 11) < gaps[s[2]]) return; wall(s[0], s[1]); });
      }
    }
    // spread helper
    function spot(t, zone, margin) {
      var d = C.B[t], best = null, bs = -1;
      for (var tries = 0; tries < 40; tries++) {
        var x = R0 + Math.floor(rnd() * (R1 - R0 + 2 - d.w)), y = R0 + Math.floor(rnd() * (R1 - R0 + 2 - d.h));
        if (!fits(g, x, y, d.w, d.h, margin == null ? 1 : margin)) continue;
        var dx = x + d.w / 2 - 11.5, dy = y + d.h / 2 - 11.5, dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (zone === "mid" && (dist < r + 2.5 || dist > r + 5.5)) continue;
        if (zone === "out" && dist < r + 4) continue;
        var sc = 0; bld.forEach(function (b) { var bd = C.B[b.t]; if (bd.kind === "def") sc = Math.min(sc || 99, Math.hypot(b.x - x, b.y - y)); });
        sc = (sc || 5) + rnd() * 3 + (zone === "out" ? dist : 0);
        if (sc > bs) { bs = sc; best = [x, y]; }
      }
      if (best) return add(t, best[0], best[1]); return null;
    }
    ["sniper", "lobber", "flak", "blaster"].forEach(function (t) { for (var k = 0; k < n[t]; k++) spot(t, rnd() < 0.5 ? "mid" : "any"); });
    for (var a = 0; a < n.vc; a++) spot("barn", "mid");
    for (var b2 = 0; b2 < n.vs; b2++) spot("silo", "mid");
    if (n.crew) spot("crewhall", "mid");
    for (var c = 0; c < n.hc; c++) spot("field", "out");
    for (var e = 0; e < n.hs; e++) spot("rig", "out");
    // outer wall arcs
    if (!o.noWalls && fh >= 2) {
      var arcs = fh >= 3 ? 3 : 1;
      for (var s = 0; s < arcs; s++) {
        var sd = Math.floor(rnd() * 4), len = 6 + Math.floor(rnd() * 4), st = 7 + Math.floor(rnd() * 5), off = 3 + Math.floor(rnd() * 2) ; var P = sd < 2 ? (sd ? R1 - off : R0 + off) : (sd === 2 ? R0 + off : R1 - off);
        for (var l = 0; l < len; l++) { if (sd < 2) wall(st + l, P); else wall(P, st + l); }
      }
    }
    bld = bld.concat(walls);
    // traps (free tiles near the compartment)
    for (var tn = 0; tn < n.trap; tn++) {
      for (var tt = 0; tt < 30; tt++) { var tx = 5 + Math.floor(rnd() * 14), ty = 5 + Math.floor(rnd() * 14); if (!g[ty][tx] && Math.max(Math.abs(tx - 11), Math.abs(ty - 11)) > r + 0.5) { bld.push({t: "trap", x: tx, y: ty, l: lv}); g[ty][tx] = 3; break; } }
    }
    // loot
    var base = [[450, 600], [1700, 2400], [5000, 7000], [10500, 15000]][fh - 1], lo = base[0] + rnd() * (base[1] - base[0]);
    var ls = [[20, 40], [60, 110], [140, 260], [320, 600]][fh - 1]; var salv = ls[0] + rnd() * (ls[1] - ls[0]);
    if (o.loot) { lo = o.loot[0]; salv = o.loot[1]; }
    var wC = 0, wS = 0; bld.forEach(function (b) { var d = C.B[b.t]; if (d.res === "c") wC += d.kind === "sto" ? 3 : 1; if (d.res === "s") wS += d.kind === "sto" ? 3 : 1; });
    lo = Math.round(lo / 10) * 10; salv = Math.round(salv);
    bld.forEach(function (b) { var d = C.B[b.t]; if (d.res === "c") b.lc = Math.round(lo * (d.kind === "sto" ? 3 : 1) / wC); if (d.res === "s") b.ls = Math.round(salv * (d.kind === "sto" ? 3 : 1) / wS); });
    return {seed: seed, fh: fh, name: o.name || C.NAMES[seed % C.NAMES.length], tr: o.tr || (fh * 150 + Math.round(rnd() * 120) - 40 + (fh > 1 ? 150 : 0)), bld: bld, lootC: lo, lootS: salv, theme: "a"};
  };
  // hand-made story bases (ASCII). legend: C core  B blaster  V coin vault  S salv vault  h coin harvester  r scrap harvester  # wall  X crew bunker  T trap  K sniper  F flak  L lobber  .=empty
  function ascii(rows, ox, oy) {
    var out = [], key = {C: "core", B: "blaster", V: "barn", S: "silo", h: "field", r: "rig", X: "crewhall", K: "sniper", F: "flak", L: "lobber"}, seen = {};
    rows.forEach(function (row, j) { for (var i = 0; i < row.length; i++) { var ch = row[i], x = ox + i, y = oy + j; if (ch === "#") out.push({t: "wall", x: x, y: y, l: 1}); else if (ch === "T") out.push({t: "trap", x: x, y: y, l: 1}); else if (key[ch]) { var id = ch + "@" + (i - (i % 1)) + "," + j; if (seen[x + "," + y]) continue; var d = C.B[key[ch]]; for (var a = 0; a < d.w; a++) for (var b = 0; b < d.h; b++) seen[(x + a) + "," + (y + b)] = 1; out.push({t: key[ch], x: x, y: y, l: 1}); } } });
    return out;
  }
  G.story = function (i) {           // i = 1..10
    var sd = C.STORY[i - 1], fh = sd.fh, base;
    if (i === 1) {
      base = {bld: ascii([
        "..........",
        "..BB......",
        "..BB......",
        "......CCC.",
        "......CCC.",
        "......CCC.",
        "..........",
        ".SS...VVV.",
        ".SS...VVV.",
        "......VVV."], 7, 6).filter(function (b, k, arr) { return !(b.t === "blaster" && b.x === 10 && b.y === 7) || arr.indexOf(b) === k; })};
      base.bld = base.bld.filter(function (b) { return !(b.t === "blaster" && b.x === 10); });  // only one blaster
      base.bld.push({t: "field", x: 14, y: 5, l: 1}, {t: "rig", x: 4, y: 12, l: 1});
      base.lootC = 350; base.lootS = 14;
    } else if (i === 2) {
      base = {bld: ascii([
        "..........",
        ".B.B.B....",
        ".....#####",
        "......#CCC",
        "......#CCC",
        "......#CCC",
        "......#...",
        ".VVV..#SS.",
        ".VVV..#SS.",
        ".VVV..####"], 6, 5)};
      base.bld = base.bld.filter(function (b) { return !(b.t === "blaster" && b.x === 8); });
      base.bld.push({t: "field", x: 4, y: 14, l: 1}, {t: "rig", x: 14, y: 15, l: 1});
      base.lootC = 500; base.lootS = 22;
    } else { base = G.make(7700 + i * 31, fh, {noGap: i === 9, diff: i / 10, lvBonus: i >= 4 && i < 7 ? 1 : 0}); base.bld.forEach(function (b) { b.lc = b.lc; }); }
    if (!base.seed) {
      base.seed = 7700 + i; base.fh = fh; var lo = base.lootC, sv = base.lootS, wC = 0, wS = 0;
      base.bld.forEach(function (b) { var d = C.B[b.t]; if (d.res === "c") wC += d.kind === "sto" ? 3 : 1; if (d.res === "s") wS += d.kind === "sto" ? 3 : 1; });
      base.bld.forEach(function (b) { var d = C.B[b.t]; if (d.res === "c") b.lc = Math.round(lo * (d.kind === "sto" ? 3 : 1) / wC); if (d.res === "s") b.ls = Math.round(sv * (d.kind === "sto" ? 3 : 1) / wS); });
      base.theme = "a"; base.tr = 60;
    }
    base.name = sd.name; base.story = i;
    if (i === 10) { // boss base: bigger loot, extra defenses
      var bs = G.make(9910, 4, {name: sd.name, loot: [14000, 700], noGap: true}); bs.story = 10; bs.boss = true; return bs;
    }
    return base;
  };
  // ----- local pool -----
  var POOL_KEY = "bb_pool_v1", pool = null;
  G.ensurePool = function () {
    try { pool = JSON.parse(localStorage.getItem(POOL_KEY) || "null"); } catch (e) { pool = null; }
    if (pool && pool.v === 1 && pool.list && pool.list.length >= 60) return pool;
    var list = []; for (var fh = 1; fh <= 4; fh++) for (var i = 0; i < 15; i++) { var b = G.make(1000 * fh + i * 37 + 11, fh); list.push(b); }
    pool = {v: 1, list: list}; try { localStorage.setItem(POOL_KEY, JSON.stringify(pool)); } catch (e) {}
    return pool;
  };
  G.find = function (fh, trophies, rnd, avoidSeed) {
    var p = G.ensurePool().list, want = fh;
    var r = rnd(); if (r < 0.25 && fh > 1) want = fh - 1; else if (r > 0.92 && fh < 4) want = fh + 1;
    var c = p.filter(function (b) { return b.fh === want && b.seed !== avoidSeed; });
    var b = c[Math.floor(rnd() * c.length)];
    return JSON.parse(JSON.stringify(b));
  };
  // attacker's own base for "Revenge" (generated from its seed)
  G.attackerBase = function (seed, fh) { var b = G.make(seed ^ 0x5a5a, fh); b.name = C.NAMES[(seed >>> 3) % C.NAMES.length]; return b; };
})();
