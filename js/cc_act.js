"use strict";
// ---- v0.10 ACTION LAYER (cosmetic only): part-rig creatures in raids, attack timing, hit tint, local hit-stop,
// death break-up + remnants, damage numbers, callouts, kill feed, segmented health bars, target lines, battle camera.
// Nothing here touches the deterministic sim state; replays stay identical. Reads only unit fields.
(function () {
  var C = BB.CC, V = BB.CCV, FX = BB.FX, H = FX._h, T = C.T, TAU = 6.2832, px = H.px, py = H.py, sfx = H.sfx, R = H.R, calm = H.calm;
  function RG() { return BB.RIG && BB.RIG.ready ? BB.RIG : null; }
  // u.k -> part-rig kind. Units not listed (Husk Guard, hound, badger, kestrel, ...) stay on the sliced-sprite path.
  var CRK = {
    slinger: {r: "sn_slinger", b: "tine", per: 0.85, sf: 1.0}, bruiser: {r: "sn_bruiser", per: 0.75, sf: 1.0, heavy: 1}, roller: {r: "sn_roller", per: 1, sf: 1.0}, drone: {r: "sn_drone", b: "tracer", per: 0.42, sf: 1.0, gun: 1},
    snatch: {r: "sn_snatch", per: 0.8, sf: 1.0}, sting: {r: "sn_sting", b: "stinger", per: 0.8, sf: 1.0}, atank: {r: "sn_atank", b: "acid", per: 1.4, sf: 1.0, lob: 1, heavy: 1},
    raker: {r: "sn_raker", per: 0.75, sf: 1.0}, blink: {r: "sn_blink", per: 0.6, sf: 1.0}, bastion: {r: "sn_bastion", per: 1.2, sf: 1.0, heavy: 1}, shard: {r: "sn_shard", b: "shardb", per: 0.85, sf: 1.0}
  };
  var NAMES = {slinger: "Pitchfork Slinger", bruiser: "Hay Golem", roller: "Barrel Roller", drone: "Sprayer Drone", snatch: "Snatcher", sting: "Stinger", atank: "Brood Tank", guard: "Husk Guard", raker: "Raker", blink: "Blink", bastion: "Bastion", shard: "Shard", hound: "Hound", badger: "Badger", chick: "Chick", sow: "Sow", wrench: "Wrench", mule: "Mule", spinner: "Spinner", kestrel: "Kestrel", bale: "Bale", scx: "Scarecrow-X"};
  FX.crKinds = CRK; FX.names = NAMES;
  FX.crOf = function (u) { if (!u || u.decoy || u.hero) return null; return CRK[u.k] || null; };
  var lastCrit = -9, reg = [], regSim = null, stat = FX.crStat = {made: 0, strikes: 0, deaths: 0, rigDraws: 0, sliced: 0};
  function regAdd(e) { if (reg.length > 160) reg.shift(); reg.push(e); }
  function tgPos(u) { var t = u.tgt; if (!t || t.dead) return null; if (t.cx !== undefined && t.w !== undefined) return [t.cx, t.cy]; if (t.x !== undefined) return [t.x, t.y]; return null; }
  var lastNum = 0, sfxT = 0;
  function sfxRate(n) { if (V.t - sfxT > 0.045) { sfxT = V.t; sfx(n); } }
  FX.attackerOf = attackerOf;
  // ---- v0.10.1: the sliced-sprite creatures (hounds, badgers, Husk Guards, kestrels, ...) get the same reaction set ----
  FX.spHit = function (u, f, x, y, sz, drop, dt) {
    var mx = Math.max(1, u.mx), RGr = RG(), i, al = u.team === "d"; if (f.hp1 === undefined) { f.hp1 = u.hp; f.kbv = 0; f.kdx = 0; f.hl = 0; f.kh = 0; f.stg = 0; f.ooT = 0; f.hAt = -9; f.stag = 0; }
    var dh = f.hp1 - u.hp; f.hp1 = u.hp;
    if (dh > 0.01 && V.t - f.hAt > 0.16 && !u.decoy) {
      var att = attackerOf(u), ax = att ? px(att.x) : x - (u.face < 0 ? -1 : 1) * 30, big = dh > mx * 0.08 || (att && att.hero && dh > mx * 0.04), dx = x - ax, kd = Math.abs(dx) < 2 ? -(u.face < 0 ? -1 : 1) : (dx > 0 ? 1 : -1), col = al ? ICH : WRM, wy = y - drop - sz * (0.4 + R(0, 0.45)), n = calm() ? 1 : big ? 8 : 4;
      f.hAt = V.t; f.kdx = kd; f.kbv = (big ? 4.6 : 2.2) + Math.min(2, dh / mx * 10); f.kh = big ? 3 : 1.2; f.hl = big ? 1 : 0.65; if (big) f.stag = V.t + 0.45;
      if (RGr) { for (i = 0; i < n; i++) RGr.spark(x, wy, (kd > 0 ? 0 : Math.PI) + R(-0.9, 0.9) - 0.35 * (i & 1), R(55, big ? 190 : 130), R(0.28, 0.55), col[i & 3], 340); if (big && RGr.decal && Math.random() < 0.55) RGr.decal(x + kd * R(6, 14), y + 3, al ? "acid" : "scorch", 2.4 + R(0, 2)); }
      H.burst(x, wy, big ? 4 : 2, {s0: 30, s1: 90, g: 120, l0: 0.1, l1: 0.22, r0: 1, r1: 1.9, cols: ["#ffffff", "#fff4c8"], ty: 1});
      if (big) H.addRing(x, wy, 11, "rgba(255,248,214,.8)", {d: 0.2, w: 2});
      var st = Math.min(3, Math.floor((1 - Math.max(0, u.hp) / mx) * 4)); if (st > f.stg && u.hp > 0) { f.stg = st; if (!calm() && RGr) { for (i = 0; i < 9; i++) RGr.spark(x, wy, R(-3.1, 0), R(60, 170), R(0.35, 0.7), col[i & 3], 340); H.addRing(x, wy, 14, al ? "#a8ff6a" : "#ffd7a0", {d: 0.25, w: 2}); } }
    }
    f.kbv *= Math.exp(-dt * 8.5); f.kh *= Math.exp(-dt * 9); f.hl *= Math.exp(-dt * 6);
    var d = 1 - Math.max(0, u.hp) / mx; if (RGr && !calm() && d >= 0.4 && u.hp > 0 && V.t > f.ooT) { f.ooT = V.t + (0.75 - 0.5 * d) * (0.6 + Math.random() * 0.8); RGr.spark(x + R(-4, 4), y - drop - sz * 0.5, 1.57 + R(-0.4, 0.4), R(6, 28), 0.5, al ? "#8fd23a" : "#d9a35a", 300); if (d > 0.6) RGr.smoke(x + R(-3, 3), y - drop - sz * 0.7, 2.2, al ? "#4b5a2c" : "#55504a", 0.7, 10); if (RGr.decal && !u.fly && Math.random() < 0.3) RGr.decal(x + R(-5, 5), y + 3, al ? "acid" : "scorch", 1.6 + R(0, 1.2)); }
    var sw = V.t < f.stag ? Math.sin(V.t * 26) * 0.12 : 0, hp = f.hl * (calm() ? 0.4 : 1);
    return {tilt: f.kdx * hp * 0.34 * (1 + 0.3 * Math.cos((V.t - f.hAt) * 26)) + sw, dx: f.kdx * f.kbv * (calm() ? 0.3 : 1), dy: -f.kh * (calm() ? 0.3 : 1), d: d};
  };
  // damage states drawn over the sprite in its local frame: cracks, bite, drips; hit-flash stays with the caller
  FX.spDmg = function (cx, u, f, sz, d) {
    if (d < 0.22 || u.hp <= 0) return; var sd = ((u.id !== undefined ? u.id : u.wob || 1) * 7919) % 97, w = sz * 0.42, hh = sz * 1.1, al = u.team === "d", k, a, b;
    function r(n) { return ((sd * 31 + n * 17) % 23) / 23 - 0.5; }
    cx.save(); cx.lineCap = "round"; cx.lineJoin = "round"; var nC = d >= 0.7 ? 4 : d >= 0.45 ? 3 : 1;
    for (k = 0; k < nC; k++) { var x0 = r(k * 3) * w * 1.5, y0 = -hh * (0.3 + 0.55 * ((k * 0.37 + 0.1) % 1)); cx.beginPath(); cx.moveTo(x0, y0); a = x0; b = y0; for (var j = 1; j < 4; j++) { a += r(k * 5 + j) * sz * 0.26; b += sz * (0.07 + 0.06 * (j & 1)); cx.lineTo(a, b); }
      cx.strokeStyle = "rgba(20,12,6,.8)"; cx.lineWidth = 1.5; cx.stroke(); cx.strokeStyle = al ? "rgba(168,255,106,.55)" : "rgba(255,200,120,.5)"; cx.lineWidth = 0.6; cx.stroke(); }
    if (d >= 0.55) { var bx = r(40) * w, by = -hh * 0.62, bs = sz * 0.17; cx.fillStyle = "#1b1008"; cx.beginPath(); cx.moveTo(bx - bs, by + bs * 0.4); cx.lineTo(bx - bs * 0.3, by - bs); cx.lineTo(bx + bs * 0.2, by - bs * 0.2); cx.lineTo(bx + bs, by - bs * 0.7); cx.lineTo(bx + bs * 0.6, by + bs * 0.9); cx.closePath(); cx.fill(); cx.strokeStyle = al ? "#8fd23a" : "#d9a35a"; cx.lineWidth = 0.9; cx.stroke(); }
    if (d >= 0.38) { cx.strokeStyle = al ? "#8fd23a" : "#d9a35a"; cx.lineWidth = 1.3; for (k = 0; k < (d >= 0.65 ? 3 : 2); k++) { var dx2 = r(60 + k) * w * 1.3, ln = sz * (0.12 + 0.16 * (calm() ? 0.5 : (0.5 + 0.5 * Math.sin(V.t * 1.7 + k * 2 + sd)))); cx.beginPath(); cx.moveTo(dx2, -hh * 0.5); cx.lineTo(dx2, -hh * 0.5 + ln); cx.stroke(); } }
    cx.restore();
  };
  // ---- per-frame draw (called from FX.unit after the unit transform is set; origin = feet, y-up negative) ----
  // returns true when the rig was drawn
  // ---- v0.10.1 hit reactions: attacker lookup, struck-part pick, ichor/spark spray, wound drips ----
  var ICH = ["#a8ff6a", "#d8ff8a", "#6fb02a", "#e6ffb0"], WRM = ["#ffd7a0", "#fff4c8", "#c08a3a", "#e0e0e8"];
  function attackerOf(u) {
    var sim = V.sim, L, i, k, b = null, bd = 1e9, d; if (!sim) return null;
    for (var pass = 0; pass < 2 && !b; pass++) { L = u.team === "d" ? sim.tr : sim.df; for (i = 0; i < L.length; i++) { k = L[i]; if (k.dead || k.decoy) continue; if (pass === 0 ? k.tgt === u : 1) { d = Math.abs(k.x - u.x) + Math.abs(k.y - u.y); if (d < bd && (pass === 0 || d < 7)) { bd = d; b = k; } } } }
    return b;
  }
  var GRPN = [["head", "headF", "snout", "jawF", "head1"], ["thorax", "body", "torso", "pelvis", "hull", "pod", "root"], ["farmF", "clawF", "uarmF", "wingF", "armF", "forkF"], ["shinF", "thighF", "lgF1", "lgB1", "wheelF", "shinB"]];
  function nodeW(rig, g, X, Y, lx, ly, drop, sX, sY, fly, kbx) {
    var l = GRPN[g] || GRPN[1], m = null, i, wm = rig.wm; for (i = 0; i < l.length && !m; i++) m = wm[l[i]]; if (!m) for (i in wm) { m = wm[i]; break; }
    if (!m) return {x: X + lx, y: Y - drop + ly - 10}; return {x: X + lx + m[4] * sX + kbx * sX, y: Y - drop + ly + m[5] * sY + (fly ? 8 : 0)};
  }
  function hitFx(u, f, rig, rg, dh, mx, sz, X, Y, lx, ly, drop, sX, sY, face) {
    var al = u.team === "d", att = attackerOf(u), ax = att ? px(att.x) : X - face * 30, ay = att ? py(att.y) : Y, big = dh > mx * 0.08 || (att && att.hero && dh > mx * 0.04);
    var dx = X - ax, kd = Math.abs(dx) < 2 ? -face : (dx > 0 ? 1 : -1), front = ((-kd) * face) > 0 ? 1 : -1, g, rr = Math.random();
    if (att && att.rng > 2) g = rr < 0.45 ? 0 : rr < 0.85 ? 1 : 2; else g = rr < 0.22 ? 0 : rr < 0.62 ? 1 : rr < 0.82 ? 2 : 3;
    if (big && rr < 0.5) g = 1;
    f.kdx = kd; f.kbv = (big ? 4.4 : 2.1) + Math.min(2, dh / mx * 10); f.kh = big ? 3 : 1.2; if (big) f.stag = V.t + 0.45;
    rg.hitP(rig, {big: big, dir: front, grp: g}); f.hAt = V.t; f.hg = g;
    var w = nodeW(rig, g, X, Y, lx, ly, drop, sX, sY, u.fly, 0), ang = Math.atan2(Y - ay, dx) - 0.55 * (dx > 0 ? 1 : -1) * 0, n = calm() ? 1 : big ? 8 : 4;
    f.wn = w; var col = al ? ICH : WRM, i;
    for (i = 0; i < n; i++) rg.spark(w.x, w.y, (kd > 0 ? 0 : Math.PI) + R(-0.9, 0.9) - 0.35 * (i & 1), R(55, big ? 190 : 130), R(0.28, 0.55), col[i & 3], 340);
    H.burst(w.x, w.y, big ? 4 : 2, {s0: 30, s1: 90, g: 120, l0: 0.1, l1: 0.22, r0: 1, r1: 1.9, cols: ["#ffffff", "#fff4c8"], ty: 1});
    if (big) { H.addRing(w.x, w.y, 11, "rgba(255,248,214,.8)", {d: 0.2, w: 2}); if (rg.decal && Math.random() < 0.55) rg.decal(X + kd * R(6, 14), Y + 3, al ? "acid" : "scorch", 2.4 + R(0, 2)); }
    var st = Math.min(3, Math.floor((1 - Math.max(0, u.hp) / mx) * 4)); if (st > (f.stg || 0) && u.hp > 0) { f.stg = st; if (!calm()) { for (i = 0; i < 9; i++) rg.spark(w.x, w.y, R(-3.1, 0), R(60, 170), R(0.35, 0.7), col[i & 3], 340); H.addRing(w.x, w.y, 14, al ? "#a8ff6a" : "#ffd7a0", {d: 0.25, w: 2}); } f.fz = Math.max(f.fz, V.t + 0.05); }
    if (rg.gust && 0) rg.gust();
  }
  function ooze(u, f, rig, rg, X, Y, lx, ly, drop, sX, sY, sz, kbx) {
    if (calm() || rig.dmg < 0.4 || V.t < (f.ooT || 0) || u.hp <= 0) return; var al = u.team === "d";
    f.ooT = V.t + (0.75 - 0.5 * rig.dmg) * (0.6 + Math.random() * 0.8); var w = nodeW(rig, f.hg === undefined ? 1 : f.hg, X, Y, lx, ly, drop, sX, sY, u.fly, kbx);
    rg.spark(w.x + R(-2, 2), w.y, 1.57 + R(-0.4, 0.4), R(6, 28), 0.5, al ? "#8fd23a" : "#d9a35a", 300); if (rig.dmg > 0.6) rg.smoke(w.x, w.y - 2, 2.2, al ? "#4b5a2c" : "#55504a", 0.7, 10);
    if (rg.decal && !u.fly && Math.random() < 0.3) rg.decal(X + R(-5, 5), Y + 3, al ? "acid" : "scorch", 1.6 + R(0, 1.2));
  }
  FX.crGo = function (u, f, cr, sz, moving, atk, X, Y, lx, ly, drop, age, sX, sY, bob) {
    var rg = RG(), cx = H.cx(), dt = Math.min(0.05, V.dtv || 0.016); if (!rg) return false; cx.translate(0, bob + (u.fly ? 8 : 0));
    if (regSim !== V.sim) { regSim = V.sim; reg.length = 0; }
    var rig = f.rigC;
    if (!rig) {
      rig = f.rigC = rg.make(cr.r); if (!rig) return false; rig.ph = Math.random() * TAU; rig.seed = Math.random() * 40; f.hp0 = u.hp; f.acc = 0; f.nextAtk = V.t + Math.random() * cr.per; f.numT = V.t + 0.35; f.kb = 0; f.kbv = 0; f.kdx = 0; f.kh = 0; f.stag = 0; f.stg = 0; f.ooT = 0; f.fz = 0; f.tint = 0; f.wp = u.hp / u.mx < 0.3;
      f.cr = cr; regAdd({u: u, f: f, rig: rig, cr: cr, X: X, Y: Y}); stat.made++;
    }
    var face = u.face < 0 ? -1 : 1, mx = Math.max(1, u.mx), hp = Math.max(0, u.hp), dh = f.hp0 - hp; f.hp0 = hp; rig.dmg = 1 - hp / mx;
    if (dh > 0) f.acc += dh;
    if (dh > 0.01 && V.t - (f.hAt || -9) > 0.16 && (u.hit > 0 || dh > 0)) { hitFx(u, f, rig, rg, dh, mx, sz, X, Y, lx, ly, drop, sX, sY, face); rg.hit(rig, dh > mx * 0.08); f.fz = Math.max(f.fz, V.t + (dh > mx * 0.08 ? 0.05 : 0.03)); }
    f.hitP = u.hit > 0; f.kbv *= Math.exp(-dt * 8.5); f.kh *= Math.exp(-dt * 9); f.kb = f.kbv;
    // anticipation / strike / recover: the sim's attack tick (u.atk) arms a wind-up; rig.strikeNow fires the effect on the strike frame
    if (atk && V.t >= f.nextAtk) { f.nextAtk = V.t + cr.per * (0.88 + Math.random() * 0.24); rg.strike(rig, Math.min(0.7, cr.per * 0.82)); }
    var a = u.aim; if (a === undefined) a = face > 0 ? 0 : Math.PI;
    var sdt = V.t < f.fz ? 0.0005 : dt, Ld = rig.dmg > 0.4 ? Math.min(1, (rig.dmg - 0.4) / 0.45) : 0; if (V.t < f.stag) sdt *= 0.4;
    var kbx = f.kdx * f.kbv * (calm() ? 0.3 : 1); rig.wo = {x: X + lx + kbx * sX, y: Y - drop + ly + (u.fly ? 8 : 0), sx: sX, sy: sY}; if (moving) rig.ph += sdt * 11 * (1 - 0.42 * Ld);
    rg.step(rig, sdt, {mv: moving ? 1 : 0, face: face, aim: atk ? a : undefined, air: u.fly ? 1 : 0, ph: rig.ph, sp: u.sp * (1 - 0.35 * Ld)});
    var s = sz * 1.15 * cr.sf / rig.d.H; if (age < 0.28) s *= 0.5 + 0.5 * FX.back(age / 0.28);
    cx.save(); cx.translate(kbx, -f.kh * (calm() ? 0.3 : 1));
    rg.draw(cx, rig, 0, 0, s, face); stat.rigDraws++;
    if (f.wp && u.hp > 0 && sz >= 26 && rig.d.H) { var wpn = rig.wm[GRPN[1][0]] || rig.wm.thorax; if (wpn) { var rr2 = 5 + (calm() ? 0 : Math.sin(V.t * 9) * 1.2); cx.strokeStyle = "rgba(109,240,255,.9)"; cx.lineWidth = 1.2; cx.beginPath(); cx.arc(wpn[4], wpn[5], rr2, 0, TAU); cx.moveTo(wpn[4] - rr2 - 3, wpn[5]); cx.lineTo(wpn[4] - rr2 + 2, wpn[5]); cx.moveTo(wpn[4] + rr2 - 2, wpn[5]); cx.lineTo(wpn[4] + rr2 + 3, wpn[5]); cx.stroke(); } }
    cx.restore(); ooze(u, f, rig, rg, X, Y, lx, ly, drop, sX, sY, sz, kbx);
    // world-space muzzle position
    var mzp = rig.mz, mxw = X + lx + (mzp.x * sX) + kbx * sX, myw = Y - drop + ly + (mzp.y * sY) + (u.fly ? 8 : 0);
    if (rig.armorBreak) { rig.armorBreak = 0; FX.num(X, Y - sz * 1.3, "ARMOR BREAK", "#ffb531", 1.15, {crit: 1, d: 1.1}); H.burst(X, Y - sz * 0.5, 7, {s0: 30, s1: 90, g: 140, l0: 0.3, l1: 0.7, r0: 1, r1: 2.4, cols: ["#c8c8d0", "#ffb531", "#7a7a86"], ty: 4}); FX.shake(1.6); f.fz = Math.max(f.fz, V.t + 0.04); }
    if (!f.wp && hp / mx < 0.3 && hp > 0 && sz >= 26) { f.wp = 1; FX.num(X, Y - sz * 1.3, "WEAK POINT", "#6df0ff", 1.05, {crit: 1, d: 1.0}); }
    if (V.t >= f.numT && f.acc > 0.5) {
      f.numT = V.t + 0.5; var amt = Math.round(f.acc), big = f.acc >= mx * 0.24 && V.t - lastCrit > 0.9; if (big) lastCrit = V.t; f.acc = 0;
      if (u.team === "d" && lastNum !== (V.t * 20 | 0)) { lastNum = V.t * 20 | 0; if (big) FX.num(X, Y - sz * 1.15, "CRIT " + amt, "#ffd35a", 1.5, {crit: 1, d: 1.05}); else if (!calm()) FX.num(X, Y - sz * 1.05, amt, "#fff4d8", 0.95, {d: 0.7}); }
    }
    if (rig.strikeNow) { rig.strikeNow = 0; stat.strikes++; strikeFx(u, f, cr, rig, rg, sz, face, mxw, myw, X, Y, a); }
    f.px = X; f.py = Y;
    return true;
  };
  function strikeFx(u, f, cr, rig, rg, sz, face, mx, my, X, Y, a) {
    var tp = tgPos(u), ex, ey, ranged = cr.b && u.rng > 2, big = cr.heavy ? 1 : 0;
    if (tp) { ex = px(tp[0]); ey = py(tp[1]) - 5; } else { ex = X + face * 40; ey = Y - sz * 0.3; }
    if (ranged) {
      var arc = cr.lob ? Math.min(34, Math.hypot(ex - mx, ey - my) * 0.45) : 0;
      rg.bullet(mx, my, ex, ey, cr.b, {imp: 1, arc: arc, big: cr.lob ? 1 : 0});
      rig.flash = calm() ? 0.05 : 0.09; rig.rc = Math.max(rig.rc || 0, 0.7);
      if (cr.gun && rg.fire) rg.fire(rig, {aim: a, pow: 0.5});
      if (rg.smoke) rg.smoke(mx, my, cr.lob ? 4 : 2.4, cr.lob ? "#7c9a3a" : "#9a9aa4", 0.75, 12);
      sfxRate(cr.lob ? "dshot" : "pew");
    } else {
      var ang = Math.atan2(ey - Y + sz * 0.5, ex - X); if (rg.slash) rg.slash(X + face * sz * 0.25, Y - sz * 0.55, ang, sz * (big ? 1.05 : 0.8), u.team === "d" ? "#d8ff8a" : "#fff0b8", big ? 3.4 : 2.4, face);
      H.burst(ex, ey, big ? 7 : 4, {s0: 25, s1: big ? 120 : 80, g: 90, l0: 0.2, l1: 0.5, r0: 1, r1: 2.2, cols: ["#fff4c8", "#ffb531", "#e0e0e8"], ty: 4});
      if (rg.decal && Math.random() < 0.5) rg.decal(ex + R(-3, 3), ey + 5, "nick", big ? 4 : 2.6);
      f.fz = Math.max(f.fz, V.t + (big ? 0.05 : 0.035));
      var t = u.tgt; if (t && t._f) t._f.fz = Math.max(t._f.fz || 0, V.t + 0.035);
      if (big) { FX.shake(1.3); H.addRing(ex, ey + 3, 14, "rgba(255,240,200,.7)", {d: 0.25, w: 2}); }
      sfxRate(big ? "thud" : "hit");
    }
  }
  // events from the sim for ranged attackers that now draw their own part-rig bullets: drop the old generic projectile
  FX.crOwns = function (e) {
    for (var i = 0; i < reg.length; i++) { var r = reg[i], u = r.u; if (!r.cr.b || u.dead || u.rng <= 2) continue; if (Math.abs(u.x - e.x1) + Math.abs(u.y - e.y1) < 0.8) return true; }
    return false;
  };
  // ---- death: part break-up, remnant decal, puffs, kill-feed ----
  FX.crDead = function (e, X0, Y0) {
    var rg = RG(), r = null, i, sim = V.sim, killer = null, vname = NAMES[e.k] || null;
    for (i = 0; i < reg.length; i++) { var q = reg[i]; if (q.u.dead && !q.gone && q.u.art === e.a && Math.abs(q.u.x - e.x) < 0.02 && Math.abs(q.u.y - e.y) < 0.02) { r = q; break; } }
    var du = r ? r.u : null;
    if (!du && sim) { var L = sim.tr.concat(sim.df); for (i = 0; i < L.length; i++) if (L[i].dead && L[i].art === e.a && Math.abs(L[i].x - e.x) < 0.02 && Math.abs(L[i].y - e.y) < 0.02) { du = L[i]; break; } }
    if (du) { vname = du.hero ? NAMES[du.hid === "scx" ? "scx" : "bale"] : (NAMES[du.k] || "Unit");
      if (sim) { var L2 = sim.tr.concat(sim.df); for (i = 0; i < L2.length; i++) { var k = L2[i]; if (!k.dead && k.team !== du.team && k.tgt === du) { killer = k.hero ? NAMES[k.hid === "scx" ? "scx" : "bale"] : (NAMES[k.k] || "Unit"); break; } } } }
    if (vname) FX.feed(killer || (du && du.team === "d" ? "Squad" : "The Hive"), vname, du ? du.team : e.team);
    if (!r || !rg) return false;
    r.gone = 1; r.f.gone = 1; stat.deaths++; var rig = r.rig, cr = r.cr, face = r.u.face < 0 ? -1 : 1, al = e.team === "d";
    rig.gx = X0; rig.gy = Y0; var wmk; for (wmk in rig.wm) { var m = rig.wm[wmk]; m[4] += X0; m[5] += Y0; }
    var kd = r.f.kdx || -face, kdn = calm() ? 3 : 7;
    rg.kill(rig, {big: cr.heavy ? 1.2 : 0.8, kx: kd * 0.7, col: al ? "#a8ff6a" : "#ffd7a0", life: calm() ? 2.4 : 4.6});
    for (i = 0; i < kdn; i++) rg.spark(X0, Y0 - 12, (kd > 0 ? 0 : Math.PI) + R(-1.1, 1.1) - 0.3, R(70, 200), R(0.4, 0.8), (al ? ICH : WRM)[i & 3], 340);
    if (rg.decal) rg.decal(X0, Y0 + 3, al ? "acid" : "scorch", cr.heavy ? 11 : 7);
    if (rg.smoke) { rg.smoke(X0, Y0 - 8, cr.heavy ? 7 : 5, al ? "#4b5a2c" : "#55504a", 0.8, 14); if (!calm()) rg.smoke(X0 + R(-5, 5), Y0 - 14, 4, "#6a6a6e", 0.7, 18); }
    H.burst(X0, Y0 - 6, al ? 8 : 9, {s0: 30, s1: 110, g: 90, l0: 0.3, l1: 0.8, r0: 1.5, r1: 3, cols: al ? ["#a8ff6a", "#e6ffb0", "#5b7a2a"] : ["#ffd7a0", "#fff", "#c08a3a"], ty: 3});
    H.addRing(X0, Y0, cr.heavy ? 22 : 14, al ? "#a8ff6a" : "#ffd7a0", {d: 0.3});
    if (cr.heavy) { FX.shake(2.2); if (!FX._hsT || V.t - FX._hsT > 0.15) { FX._hsT = V.t; FX.hitstop(0.045); } }
    sfx(al ? "pop" : "hurt"); return true;
  };
  // ---- kill feed (DOM strip, top-left under the HUD) ----
  var feedEl = null, feedN = 0;
  function feedBox() { if (feedEl) return feedEl; var b = document.getElementById("base"); if (!b) return null; feedEl = document.createElement("div"); feedEl.id = "kfeed"; feedEl.className = "kfeed"; b.appendChild(feedEl); return feedEl; }
  FX.feed = function (who, whom, vteam) {
    var el = feedBox(); if (!el || V.mode !== "raid") return; if (el.childNodes.length >= 4) el.removeChild(el.firstChild);
    var d = document.createElement("div"); d.className = "kf " + (vteam === "d" ? "kd" : "ka"); d.textContent = who + "  >  " + whom; el.appendChild(d); feedN++;
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 3400);
  };
  FX.feedClear = function () { if (feedEl) feedEl.innerHTML = ""; };
  // ---- segmented health bar: hidden at full, appears on first damage, thick outlined, white lag segment ----
  FX.bar = function (cx, x, by, bw, cur, lag, col, mx, gold) {
    var n = Math.max(2, Math.min(10, Math.round(Math.sqrt(mx) / 3.2))), h = 3.2, x0 = x - bw / 2, i;
    cx.fillStyle = gold ? "#3a2a08" : "#0a0a10"; cx.fillRect(x0 - 1.2, by - 1.2, bw + 2.4, h + 2.4);
    cx.fillStyle = "#2a2a34"; cx.fillRect(x0, by, bw, h);
    if (lag > cur) { cx.fillStyle = "#ffffff"; cx.fillRect(x0, by, bw * lag, h); }
    cx.fillStyle = col; cx.fillRect(x0, by, bw * cur, h); cx.fillStyle = "rgba(255,255,255,.35)"; cx.fillRect(x0, by, bw * cur, 1);
    cx.fillStyle = "rgba(10,10,16,.85)"; for (i = 1; i < n; i++) cx.fillRect(x0 + bw * i / n - 0.3, by - 0.4, 0.7, h + 0.8);
    if (gold) { cx.strokeStyle = "#ffd35a"; cx.lineWidth = 0.7; cx.strokeRect(x0 - 1.2, by - 1.2, bw + 2.4, h + 2.4); }
  };
  // ---- target line + aim reticle (zoomed in, or for the hero) ----
  var tlN = 0, tlT = 0;
  FX.tline = function (u, X, Y) {
    var cx = H.cx(), tp = tgPos(u); if (!tp || (V.uc.z < 1.25 && !u.hero)) return; if (tlT !== V.t) { tlT = V.t; tlN = 0; } if (tlN++ > 7) return;
    var ex = px(tp[0]), ey = py(tp[1]) - 4, c = u.team === "d" ? "255,120,100" : "255,230,150";
    cx.save(); cx.strokeStyle = "rgba(" + c + ",.38)"; cx.lineWidth = 0.8; cx.setLineDash([2, 3]); cx.lineDashOffset = calm() ? 0 : -V.t * 14; cx.beginPath(); cx.moveTo(X, Y); cx.lineTo(ex, ey); cx.stroke(); cx.setLineDash([]);
    cx.strokeStyle = "rgba(" + c + ",.8)"; cx.lineWidth = 1; var rr = 4 + (calm() ? 0 : Math.sin(V.t * 8) * 0.6); cx.beginPath(); cx.arc(ex, ey, rr, 0, TAU); cx.moveTo(ex - rr - 2, ey); cx.lineTo(ex - rr + 2, ey); cx.moveTo(ex + rr - 2, ey); cx.lineTo(ex + rr + 2, ey); cx.moveTo(ex, ey - rr - 2); cx.lineTo(ex, ey - rr + 2); cx.moveTo(ex, ey + rr - 2); cx.lineTo(ex, ey + rr + 2); cx.stroke(); cx.restore();
  };
  // ---- battle camera: auto-zoom + follow on active fights, CLOSE action-focus mode, manual pinch/zoom always wins for a few seconds ----
  var manualT = -99, camOwn = 0, camSt = {n: 0, hot: 0, mode: "auto"};
  FX.camStat = camSt;
  ["camPan", "camZoomAt", "camFocus"].forEach(function (n) { var o = V[n]; V[n] = function () { manualT = V.t; camOwn = 0; return o.apply(V, arguments); }; });
  function camMode() { var m = BB.S && BB.S.set && BB.S.set.cam; return m === "close" || m === "off" ? m : "auto"; }
  FX.camCycle = function () {
    var S = BB.S; if (!S) return; S.set = S.set || {}; var m = camMode(); S.set.cam = m === "auto" ? "close" : m === "close" ? "off" : "auto"; if (S.set.cam === "off") { V.camReset(true); camOwn = 0; } manualT = -99; BB.save && BB.save(); camBtn(); sfx("click");
  };
  function camBtn() { var b = document.getElementById("r-cam"); if (b) b.textContent = "CAM " + camMode().toUpperCase(); }
  function focusInfo(sim) {
    var sx = 0, sy = 0, w = 0, n = 0, hero = null, i, u, L = sim.tr, wt;
    for (i = 0; i < L.length; i++) { u = L[i]; if (u.dead || u.decoy) continue; if (u.hero) hero = u; if (u.atk > 0 || u.hit > 0) { wt = u.hero ? 3 : 1; sx += u.x * wt; sy += u.y * wt; w += wt; n++; } }
    L = sim.df; for (i = 0; i < L.length; i++) { u = L[i]; if (u.dead || u.decoy) continue; if (u.atk > 0 && u.tgt && !u.tgt.dead) { sx += u.x * 0.35; sy += u.y * 0.35; w += 0.35; n++; } }
    if (!w) return hero && V.t - (hero._f ? hero._f.mvT : -99) < 1.2 ? {x: hero.x, y: hero.y, n: 1} : null;
    return {x: sx / w, y: sy / w, n: n};
  }
  function camAuto(dt) {
    var uc = V.uc, sim = V.sim, m = camMode(); if (V.mode !== "raid" || !sim || m === "off") return; var rd = BB.CCUI && BB.CCUI.getRaid ? BB.CCUI.getRaid() : null;
    if (sim.done || !sim.started && sim.t <= 0) { if (camOwn && sim.done) { camOwn = 0; V.camReset(true); } return; }
    if (uc.anim && !camOwn) return; if (V.t - manualT < 3.5) return;
    var f = focusInfo(sim), tz = f ? (m === "close" ? 2.25 : 1.55) : 1; camSt.mode = m; camSt.n = f ? f.n : 0;
    if (tz === 1 && uc.z < 1.02) { camOwn = 0; return; }
    if (tz === 1 && !camOwn) return;
    camOwn = 1; uc.anim = null; uc.vx = uc.vy = 0; var Gc = H.G(), Hl = Gc.Hl, kz = 1 - Math.exp(-dt * (tz > uc.z ? 2.4 : 1.1)), kp = 1 - Math.exp(-dt * 3.2);
    uc.z += (tz - uc.z) * kz; if (Math.abs(uc.z - 1) < 0.004 && tz === 1) { uc.z = 1; camOwn = 0; }
    var tx = 0, ty = 0; if (f && tz > 1) { tx = -(px(f.x) - 180) * uc.z; ty = -(py(f.y) - Hl / 2) * uc.z; }
    var mx = (uc.z - 1) * 180 + 4, my = (uc.z - 1) * Hl / 2 + 4; tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
    uc.x += (tx - uc.x) * kp; uc.y += (ty - uc.y) * kp;
  }
  var abSeen = {};
  FX.actUpdate = function (dt) {
    camAuto(dt);
    var sim = V.sim; if (V.mode !== "raid" || !sim) return;
    // hero finisher kill-cam: the moment a hero ability fires, a short slow-mo + a tight push-in (both calm-aware via FX.slow / FX.zoom)
    for (var i = 0; i < sim.tr.length; i++) { var u = sim.tr[i]; if (!u.hero || u.dead) continue; var on = u.ab > 0; if (on && !abSeen[u.id]) { abSeen[u.id] = 1; if (FX.heroKC) FX.heroKC(u); } else if (!on) abSeen[u.id] = 0; }
  };
  FX.heroKC = function (u) { FX.slow(0.5, 0.32); FX.zoom(1.18, px(u.x), py(u.y), 0.5); FX.num(px(u.x), py(u.y) - 40, u.hid === "scx" ? "OVERDRIVE" : "HEROIC SWING", "#fff0a0", 1.2, {crit: 1, d: 1.0}); };
  // button + feed wiring
  function wire() {
    var b = document.getElementById("r-cam"); if (b && !b._w) { b._w = 1; b.addEventListener("click", function (e) { e.stopPropagation(); FX.camCycle(); }); camBtn(); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
  setInterval(function () { var b = document.getElementById("r-cam"); if (b) { if (!b._w) wire(); b.style.display = V.mode === "raid" ? "" : "none"; } var k = document.getElementById("kfeed"); if (k) k.style.display = V.mode === "raid" ? "" : "none"; if (V.mode !== "raid" && feedEl && feedEl.firstChild) feedEl.innerHTML = ""; }, 400);
  // ---- Hive Heart: part-rig organ drawn in place of the flat core sprite on the monsters' side of a raid ----
  var hearts = (typeof WeakMap !== "undefined") ? new WeakMap() : null, lags = hearts ? new WeakMap() : null;
  FX.heartDraw = function (b, x, y, w, h, ww, cap, alpha) {
    var rg = RG(); if (!rg || !hearts || !rg.has("sn_heart")) return false;
    var st = hearts.get(b), cxh = 0, cyh = 0, cx = H.cx(), dt = Math.min(0.05, V.dtv || 0.016);
    if (!st) { try { st = {rig: rg.make("sn_heart"), hit: 0, dead: 0}; } catch (e) { return false; } st.rig.seed = 1.7; hearts.set(b, st); stat.heart = 1; }
    var rig = st.rig; rig.dmg = Math.max(0, Math.min(1, 1 - b.hp / b.mx));
    if (st.hp1 === undefined) { st.hp1 = b.hp; st.jx = 0; st.jy = 0; st.hAt = -9; st.ooT = 0; st.stg = 0; } var dh = st.hp1 - b.hp; st.hp1 = b.hp, cxh = x + w / 2, cyh = y + h * 0.5;
    if ((dh > 0.01 || (b.hit > 0 && !st.hit)) && V.t - st.hAt > 0.14) {
      st.hAt = V.t; var big = dh > b.mx * 0.04, bu = null, sim = V.sim, L = sim ? sim.tr : [], bd = 1e9, ii, k2, dd, kd = 1;
      for (ii = 0; ii < L.length; ii++) { k2 = L[ii]; if (k2.dead || k2.decoy) continue; dd = Math.abs(px(k2.x) - cxh) + Math.abs(py(k2.y) - cyh); if (dd < bd) { bd = dd; bu = k2; } } if (bu) kd = cxh > px(bu.x) ? 1 : -1;
      rg.hit(rig, true); st.jx = kd * (big ? 3.2 : 1.6) * (calm() ? 0.3 : 1); st.jy = big ? 1.8 : 0.8; var n = calm() ? 2 : big ? 9 : 5;
      for (ii = 0; ii < n; ii++) rg.spark(cxh + R(-8, 8), cyh + R(-8, 6), (kd > 0 ? 0 : Math.PI) + R(-1, 1) - 0.4 * (ii & 1), R(50, 170), R(0.3, 0.6), ICH[ii & 3], 340);
      H.burst(cxh, cyh, 3, {s0: 30, s1: 90, g: 120, l0: 0.1, l1: 0.22, r0: 1, r1: 2, cols: ["#ffffff", "#fff4c8"], ty: 1}); if (big) H.addRing(cxh, cyh, 16, "rgba(255,248,214,.8)", {d: 0.22, w: 2});
      var sg = Math.min(3, Math.floor(rig.dmg * 4)); if (sg > st.stg && b.hp > 0) { st.stg = sg; if (!calm()) { for (ii = 0; ii < 10; ii++) rg.spark(cxh, cyh, R(-3.1, 0), R(60, 170), R(0.35, 0.7), ICH[ii & 3], 340); H.addRing(cxh, cyh, 22, "#a8ff6a", {d: 0.3, w: 2}); FX.shake(1.2); } }
    } st.hit = b.hit > 0 ? 1 : 0; st.jx *= Math.exp(-dt * 9); st.jy *= Math.exp(-dt * 10);
    if (!calm() && rig.dmg >= 0.4 && b.hp > 0 && V.t > st.ooT) { st.ooT = V.t + (0.7 - 0.45 * rig.dmg) * (0.6 + Math.random() * 0.8); rg.spark(cxh + R(-9, 9), cyh + R(-4, 8), 1.57 + R(-0.4, 0.4), R(6, 26), 0.55, "#8fd23a", 300); if (rig.dmg > 0.6) rg.smoke(cxh + R(-8, 8), cyh - 6, 2.6, "#4b5a2c", 0.8, 11); }
    if (b.hit > 0 && !st.lash) { st.lash = 1; rg.strike(rig, 0.5); } else if (!(b.hit > 0)) st.lash = 0;
    rg.step(rig, V.hs > 0 ? 0.0005 : dt, {mv: 0, face: 1}); cx.save(); cx.globalAlpha = alpha;
    var s = Math.min(cap * 1.08 / rig.d.H, ww * 1.0 / 52); rg.draw(cx, rig, x + w / 2 + st.jx, y + h + 2 - st.jy, s, 1); cx.restore(); return true;
  };
  FX.bar2 = function (cx, x, y, w, f, col, key) {
    var lg = f, dt = Math.min(0.05, V.dtv || 0.016); if (key && lags) { var o = lags.get(key); lg = o === undefined ? f : Math.max(f, o - dt * 0.35); lags.set(key, lg); }
    FX.bar(cx, x, y, w, Math.max(0, f), lg, col, key && key.mx ? key.mx : 100, false);
  };
  FX.actReset = function () { if (BB.RIG && BB.RIG.clearFx) BB.RIG.clearFx(); reg.length = 0; abSeen = {}; camOwn = 0; manualT = -99; FX.feedClear(); };
})();
