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
  // v0.9: posted sentinels. Deterministic from the generator PRNG; stored in the base (gd) so replays are exact.
  G.guards = function (bld, fh, rnd, o) {
    if (o && o.guards === false) return [];
    var tab = C.GUARDS[Math.min(5, fh)] || [], out = [], occ = {};
    bld.forEach(function (b) { var d = C.B[b.t]; if (d.kind === "trap") return; for (var j = 0; j < d.h; j++) for (var i = 0; i < d.w; i++) occ[(b.x + i) + "," + (b.y + j)] = 1; });
    var anchors = []; bld.forEach(function (b) { var d = C.B[b.t]; if (d.kind === "crew") anchors.push([b.x + d.w / 2, b.y + d.h / 2 + 2]); });
    bld.forEach(function (b) { var d = C.B[b.t]; if (d.kind === "def" && anchors.length < 6) anchors.push([b.x + d.w / 2, b.y + d.h / 2 + 1.8]); });
    function free(px, py) { var x = Math.floor(px), y = Math.floor(py); return x >= 1 && y >= 1 && x < N - 1 && y < N - 1 && !occ[x + "," + y]; }
    function inner() { for (var k = 0; k < 24; k++) { var a = rnd() * 6.283, px = 11.5 + Math.cos(a) * 2.7, py = 11.5 + Math.sin(a) * 2.7; if (free(px, py)) return [px, py]; } return [11.5, 14.4]; }
    var lv = Math.max(1, Math.ceil(fh / 2)), idx = 0;
    tab.forEach(function (e) { for (var k = 0; k < e[1]; k++) {
      var pos, warden = e[0] === "bastion" || e[0] === "shard";
      if (warden || !anchors.length) pos = inner(); else { var an = anchors[idx++ % anchors.length]; pos = [an[0] + (rnd() - 0.5) * 1.6, an[1] + (rnd() - 0.5) * 1.2]; if (!free(pos[0], pos[1])) pos = [an[0], an[1]]; }
      out.push({k: e[0], x: Math.round(pos[0] * 10) / 10, y: Math.round(pos[1] * 10) / 10, l: lv, ar: warden ? 3.4 : 4.2, lr: warden ? 4.5 : 6.8});
    } });
    return out;
  };
  G.make = function (seed, fh, o) {
    o = o || {}; var rnd = C.rng(seed), g = mk(), bld = [];
    var lv = Math.max(1, Math.min(C.CORE_MAX, fh - (rnd() < 0.3 ? 1 : 0) + (o.lvBonus || 0)));
    function add(t, x, y, l) { var d = C.B[t]; bld.push({t: t, x: x, y: y, l: l || lv}); put(g, x, y, d.w, d.h); return bld[bld.length - 1]; }
    function cnt(t) { var m = C.B[t].mx[fh - 1]; return m; }
    var ff = o.diff || 0;  // -1 easier .. +1 harder
    var n = {
      blaster: Math.max(1, cnt("blaster") - (rnd() < 0.5 ? 1 : 0) + (ff > 0 ? 0 : 0)), sniper: cnt("sniper") ? Math.max(0, cnt("sniper") - (rnd() < 0.4 ? 1 : 0)) : 0,
      lobber: cnt("lobber") ? Math.max(1, cnt("lobber") - (rnd() < 0.5 ? 1 : 0)) : 0, flak: cnt("flak") ? Math.max(1, cnt("flak") - (rnd() < 0.4 ? 1 : 0)) : 0,
      trap: Math.round(cnt("trap") * (0.5 + rnd() * 0.5)), vc: Math.max(1, cnt("barn") - (rnd() < 0.4 ? 1 : 0)), vs: Math.max(1, cnt("silo") - (rnd() < 0.4 ? 1 : 0)),
      hc: Math.max(1, cnt("field") - 1 + (rnd() < 0.5 ? 1 : 0)), hs: Math.max(1, cnt("rig") - (rnd() < 0.5 ? 1 : 0)), crew: fh >= 2 && rnd() < 0.8 ? 1 : 0
    };
    ["fan", "storm", "coil", "crane", "driver", "shroud"].forEach(function (t) { var c0 = cnt(t); n[t] = c0 ? Math.max(1, Math.round(c0 * (0.6 + rnd() * 0.4))) : 0; });
    ["snare", "mine", "cache", "stake"].forEach(function (t) { n[t] = Math.round(cnt(t) * (0.5 + rnd() * 0.5)); });
    if (fh >= 5) { n.vc = Math.max(n.vc, 2); n.vs = Math.max(n.vs, 2); }
    if (o.counts) for (var k in o.counts) n[k] = o.counts[k];
    var cx = 10, cy = 10; add("core", cx, cy, fh);
    // ---- v0.9 HIVE layout: a rounded hive body around the Hive Heart, a barricade ring, spitter nests on the four diagonals, brood pits on the gates, harvesters out in the creep ----
    var r = fh >= 6 ? 5 : fh >= 3 ? 4 : 3, hh = r + 1, ch = Math.max(1, Math.floor(hh / 2));
    function mkReg(h, c) { return function (x, y) { var dx = Math.abs(x - 11), dy = Math.abs(y - 11); return dx <= h && dy <= h && dx + dy <= 2 * h - c; }; }
    var inReg = mkReg(hh, ch);
    function isRing(reg, x, y) { return reg(x, y) && (!reg(x + 1, y) || !reg(x - 1, y) || !reg(x, y + 1) || !reg(x, y - 1)); }
    function inside(x, y, w, h) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) { if (!inReg(i, j) || isRing(inReg, i, j)) return false; } return true; }
    function touchReg(x, y, w, h) { for (var j = y - 1; j <= y + h; j++) for (var i = x - 1; i <= x + w; i++) { if (inReg(i, j)) return true; } return false; }
    function inner(t, l) {
      var d = C.B[t];
      for (var tries = 0; tries < 80; tries++) { var x = 11 - hh + 1 + Math.floor(rnd() * (2 * hh - 1 - d.w)), y = 11 - hh + 1 + Math.floor(rnd() * (2 * hh - 1 - d.h)); if (fits(g, x, y, d.w, d.h, 0) && inside(x, y, d.w, d.h)) return add(t, x, y, l); }
      return null;
    }
    var innerList = []; if (n.vc > 0) innerList.push("barn"); if (n.vs > 0) innerList.push("silo");
    if (fh >= 5 && n.vc > 1) innerList.push("barn"); if (n.coil) { innerList.push("coil"); n.coil--; }
    if (n.lobber) innerList.push("lobber"); else if (n.sniper) { innerList.push("sniper"); n.sniper--; }
    innerList.forEach(function (t) { var b = inner(t); if (b) { if (t === "barn") n.vc--; if (t === "silo") n.vs--; if (t === "lobber") n.lobber--; } });
    var wallLv = Math.max(1, lv);
    var gaps = {}; if (!o.noGap) { var ng = rnd() < 0.55 ? 1 : 0; for (var q = 0; q < ng; q++) gaps[Math.floor(rnd() * 4)] = 1 + Math.floor(rnd() * 2); }
    var walls = [];
    function wall(x, y) { if (x < R0 || y < R0 || x > R1 || y > R1) return; if (g[y][x]) return; walls.push({t: "wall", x: x, y: y, l: wallLv}); g[y][x] = 2; }
    // ring-placement helper: search outward from an angle/distance, never inside the hive body
    function ringSpot(t, ang, dist, mg) {
      var d = C.B[t];
      for (var k = 0; k < 30; k++) {
        var a = ang + (k % 2 ? 1 : -1) * Math.floor((k + 1) / 2) * 0.2, rr = dist + Math.floor(k / 8) * 0.9;
        var x = Math.round(11.5 + Math.cos(a) * rr - d.w / 2), y = Math.round(11.5 + Math.sin(a) * rr - d.h / 2);
        if (fits(g, x, y, d.w, d.h, mg == null ? 1 : mg) && !touchReg(x, y, d.w, d.h)) return add(t, x, y);
      }
      return null;
    }
    function anySpot(t) {
      var d = C.B[t];
      for (var tries = 0; tries < 60; tries++) { var x = R0 + Math.floor(rnd() * (R1 - R0 + 2 - d.w)), y = R0 + Math.floor(rnd() * (R1 - R0 + 2 - d.h)); if (fits(g, x, y, d.w, d.h, 1) && !touchReg(x, y, d.w, d.h)) return add(t, x, y); }
      return null;
    }
    // brood pits sit on the gate lanes (opposite pair on bigger hives); each releases a share of the brood
    var pitN = fh >= 3 ? 2 : (n.crew ? 1 : 0), pa0 = Math.floor(rnd() * 4) * Math.PI / 2, pits = [];
    for (var pi = 0; pi < pitN; pi++) { var pb = ringSpot("crewhall", pa0 + pi * Math.PI, hh + 2.9, 1); if (pb) pits.push(pb); }
    if (pits.length) { var lst = BB.CCSim.crewAlien(lv), per = Math.ceil(lst.length / pits.length); pits.forEach(function (p, k) { p.gn = per; p.go = k * per; }); }
    // defenders: strongest spitters on the four diagonals (hive corners), the rest in the mid ring
    var dq = []; ["sniper", "lobber", "flak", "blaster", "fan", "storm", "coil", "crane", "driver", "shroud"].forEach(function (t) { for (var k = 0; k < n[t]; k++) dq.push(t); });
    var dr0 = Math.floor(rnd() * 4);
    dq.forEach(function (t, k) {
      var sp = null;
      if (k < 4) sp = ringSpot(t, Math.PI / 4 + ((k + dr0) % 4) * Math.PI / 2, hh * 1.0 + 2.3, 1);
      else sp = ringSpot(t, rnd() * Math.PI * 2, hh + 2 + rnd() * 2.6, 1);
      if (!sp) anySpot(t);
    });
    // leftover vaults sit just outside the barricade
    for (var a = 0; a < n.vc; a++) { if (!ringSpot("barn", rnd() * 6.28, hh + 2.2, 1)) anySpot("barn"); }
    for (var b2 = 0; b2 < n.vs; b2++) { if (!ringSpot("silo", rnd() * 6.28, hh + 2.2, 1)) anySpot("silo"); }
    for (var c = 0; c < n.hc; c++) { if (!ringSpot("field", rnd() * 6.28, hh + 4.6, 1)) anySpot("field"); }
    for (var e = 0; e < n.hs; e++) { if (!ringSpot("rig", rnd() * 6.28, hh + 4.6, 1)) anySpot("rig"); }
    // inner barricade ring (acid barricades), with an optional gate gap
    if (!o.noWalls) {
      for (var wy = 0; wy < N; wy++) for (var wx = 0; wx < N; wx++) {
        if (!isRing(inReg, wx, wy)) continue;
        var dx0 = wx - 11, dy0 = wy - 11, sdn = Math.abs(dy0) >= Math.abs(dx0) ? (dy0 < 0 ? 0 : 1) : (dx0 < 0 ? 2 : 3), pr = sdn < 2 ? Math.abs(dx0) : Math.abs(dy0);
        if (gaps[sdn] && pr < gaps[sdn]) continue; wall(wx, wy);
      }
    }
    // outer barricade arcs on a larger octagon (monsters wall off the approach lanes)
    if (!o.noWalls && fh >= 2) {
      var arcs = fh >= 6 ? 5 : fh >= 3 ? 3 : 1, oh = hh + 4, oreg = mkReg(oh, Math.max(2, Math.floor(oh * 0.6)));
      for (var s = 0; s < arcs; s++) {
        var a0 = rnd() * Math.PI * 2, aw = 0.5 + rnd() * 0.5;
        for (var wy2 = 0; wy2 < N; wy2++) for (var wx2 = 0; wx2 < N; wx2++) {
          if (!isRing(oreg, wx2, wy2)) continue; var an = Math.atan2(wy2 - 11, wx2 - 11), da = ((an - a0) % 6.2832 + 9.4248) % 6.2832 - 3.1416; if (Math.abs(da) < aw) wall(wx2, wy2);
        }
      }
    }
    bld = bld.concat(walls);
    // traps (free tiles near the compartment)
    [["trap", n.trap], ["snare", n.snare], ["mine", n.mine], ["cache", n.cache], ["stake", n.stake]].forEach(function (pr) {
      for (var tn = 0; tn < pr[1]; tn++) {
        for (var tt = 0; tt < 30; tt++) { var tx = 4 + Math.floor(rnd() * 16), ty = 4 + Math.floor(rnd() * 16); if (!g[ty][tx] && !inReg(tx, ty) && Math.hypot(tx - 11, ty - 11) < hh + 6.5) { bld.push({t: pr[0], x: tx, y: ty, l: lv}); g[ty][tx] = 3; break; } }
      }
    });
    // loot
    var base = C.LOOTC[fh - 1], lo = base[0] + rnd() * (base[1] - base[0]);
    var ls = C.LOOTS[fh - 1]; var salv = ls[0] + rnd() * (ls[1] - ls[0]);
    if (o.loot) { lo = o.loot[0]; salv = o.loot[1]; }
    var wC = 0, wS = 0; bld.forEach(function (b) { var d = C.B[b.t]; if (d.res === "c") wC += d.kind === "sto" ? 3 : 1; if (d.res === "s") wS += d.kind === "sto" ? 3 : 1; });
    lo = Math.round(lo / 10) * 10; salv = Math.round(salv);
    bld.forEach(function (b) { var d = C.B[b.t]; if (d.res === "c") b.lc = Math.round(lo * (d.kind === "sto" ? 3 : 1) / wC); if (d.res === "s") b.ls = Math.round(salv * (d.kind === "sto" ? 3 : 1) / wS); });
    var gd = G.guards(bld, fh, rnd, o);
    return {gd: gd, hr: hh, seed: seed, fh: fh, name: o.name || C.NAMES[seed % C.NAMES.length], tr: o.tr || (fh * 150 + Math.round(rnd() * 120) - 40 + (fh > 1 ? 150 : 0) + (fh > 4 ? (fh - 4) * 60 : 0)), bld: bld, lootC: lo, lootS: salv, theme: "a"};
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
        "....BBCCC.",
        "....BBCCC.",
        "...T......",
        ".SS...VVV.",
        ".SS...VVV.",
        "......VVV."], 7, 6).filter(function (b, k, arr) { return !(b.t === "blaster" && b.x === 10 && b.y === 7) || arr.indexOf(b) === k; })};
      base.bld = base.bld.filter(function (b) { return !(b.t === "blaster" && b.x === 10); });  // only one blaster
      base.bld.push({t: "field", x: 14, y: 5, l: 1}, {t: "rig", x: 4, y: 12, l: 1});
      base.lootC = 350; base.lootS = 14;
    } else if (i === 2) {
      base = {bld: ascii([
        "..........",
        ".B.B.B.B..",
        "..T..#####",
        "......#CCC",
        "......#CCC",
        "......#CCC",
        "....T.#...",
        ".VVV..#SS.",
        ".VVV..#SS.",
        ".VVV..####"], 6, 5)};
      base.bld = base.bld.filter(function (b) { return !(b.t === "blaster" && b.x === 8); });
      base.bld.push({t: "field", x: 4, y: 14, l: 1}, {t: "rig", x: 14, y: 15, l: 1});
      base.lootC = 500; base.lootS = 22;
    } else { base = G.make(7700 + i * 31, fh, {noGap: i === 9, counts: i === 3 ? {blaster: 3, trap: 2} : null, diff: i / 10 + (i <= 3 ? 0.3 : 0), lvBonus: i >= 4 && i < 7 ? 1 : 0, guards: i > 3}); base.bld.forEach(function (b) { b.lc = b.lc; }); }
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
  // Bases are deterministic from their seed, so the pool is regenerated lazily and cached in memory (nothing big goes in localStorage).
  var POOL_KEY = "bb_pool_v2", memo = {};
  G.POOLN = 15;
  G.poolBase = function (fh, i) { var k = fh + ":" + i; if (!memo[k]) memo[k] = G.make(1000 * fh + i * 37 + 11, fh); return memo[k]; };
  G.ensurePool = function () { try { localStorage.removeItem("bb_pool_v1"); localStorage.setItem(POOL_KEY, JSON.stringify({v: 2, n: G.POOLN})); } catch (e) {} return {v: 2}; };
  G.find = function (fh, trophies, rnd, avoidSeed) {
    var want = fh, r = rnd(); if (r < 0.25 && fh > 1) want = fh - 1; else if (r > 0.85 && fh < C.CORE_MAX) want = fh + 1;
    var i = Math.floor(rnd() * G.POOLN), b = G.poolBase(want, i); if (b.seed === avoidSeed) b = G.poolBase(want, (i + 1) % G.POOLN);
    return JSON.parse(JSON.stringify(b));
  };
  // attacker's own base for "Revenge" (generated from its seed)
  G.attackerBase = function (seed, fh) { var b = G.make(seed ^ 0x5a5a, fh); b.name = C.NAMES[(seed >>> 3) % C.NAMES.length]; return b; };
})();
