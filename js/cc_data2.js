"use strict";
// ---- v0.5 data layer: Core levels 1-10 (formula-extended tables), new troops, defenses, traps, spells ----
// All names are original working labels (see LEGAL-NOTES in the README). Loaded right after cc_data.js.
(function () {
  var C = BB.CC, M = 10; C.CORE_MAX = M;
  C.LV = [0, 1, 1.5, 2.2, 3.1, 3.8, 4.5, 5.2, 5.9, 6.6];
  function nice(v) { if (v < 10) return Math.round(v * 10) / 10; var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10) - 1); return Math.round(v / p) * p; }
  function grow(a, n, k, floorv) { while (a.length < n) { var p = a[a.length - 1]; a.push(nice(Math.max(p * k, floorv || 0))); } return a; }
  // ----- new buildings -----
  var B = C.B;
  function def(o) { o.kind = "def"; o.w = o.w || 2; o.h = o.h || 2; return o; }
  B.fan = def({name: "Seed Fan", art: "t_fan", aart: "a_fan", hp: 320, dps: 20, rng: 4.8, cd: 0.9, g: 1, a: 1, spec: "cone", mx: [0,1,1,2,2,2,3,3,3,4], c: [380,900,2200,5000], s: [0,10,30,70], t: [0.4,3,9,26], d: "Sweeps a wide cone of seeds across ground AND air troops. Short range, great against swarms."});
  B.storm = def({name: "Stormpost", art: "t_storm", aart: "a_storm", hp: 280, dps: 22, rng: 7.8, cd: 1.4, g: 0, a: 1, spec: "chain", mx: [0,0,0,1,1,1,2,2,2,3], c: [2400,4500,8500,15000], s: [0,40,90,180], t: [3,10,26,60], d: "Air only. Lightning jumps from the first target to two more flyers nearby."});
  B.coil = def({name: "Haywire Coil", art: "t_coil", aart: "a_coil", hp: 330, dps: 12, rng: 5.2, cd: 0.25, g: 1, a: 1, spec: "ramp", mx: [0,0,0,0,1,1,1,2,2,2], c: [4500,8000,14000,24000], s: [0,60,120,240], t: [6,16,40,90], d: "A beam that ramps up to 4x damage while it stays on one target. Break line of sight, or stun it, to reset."});
  B.crane = def({name: "Harpoon Crane", art: "t_crane", aart: "a_crane", hp: 260, dps: 14, rng: 8, cd: 1.5, g: 0, a: 1, spec: "slow", mx: [0,0,0,0,1,1,2,2,2,3], c: [4200,7600,13000,22000], s: [0,50,110,220], t: [5,14,36,80], d: "Air only. Harpoons slow flyers by half for 3 s."});
  B.driver = def({name: "Fence Driver", art: "t_driver", aart: "a_driver", hp: 420, dps: 30, rng: 3.2, cd: 1.8, g: 1, a: 0, spec: "knock", mx: [0,0,0,0,0,0,1,1,2,2], c: [9000,15000,26000,44000], s: [0,90,180,320], t: [10,26,60,130], d: "Short range ground slammer. Knocks troops back 1.5 tiles."});
  B.shroud = def({name: "Chaff Shroud", art: "t_shroud", aart: "a_shroud", hp: 300, dps: 0, rng: 4.5, cd: 1, g: 0, a: 0, spec: "shroud", sup: 1, mx: [0,0,0,0,0,1,1,1,2,2], c: [7000,12000,21000,36000], s: [0,70,150,280], t: [8,20,50,110], d: "Support. Cuts ranged damage to buildings within 4.5 tiles by 30%."});
  function trap(o) { o.kind = "trap"; o.w = 1; o.h = 1; o.hp = 20; o.s = o.s || [0,0,0,0]; return o; }
  B.snare = trap({name: "Snare Reel", art: "tp_snare", aart: "tp_snare", tk: "snare", dmg: 40, rad: 2.2, mx: [0,0,2,2,3,3,4,4,5,5], c: [200,400,700,1200], t: [0.1,0.5,1,2], d: "Hidden. Roots every ground troop nearby for 3 s."});
  B.mine = trap({name: "Chaff Mine", art: "tp_mine", aart: "tp_mine", tk: "mine", dmg: 200, rad: 2.4, mx: [0,0,0,2,2,3,3,4,4,5], c: [300,600,1000,1700], t: [0.1,0.5,1,2], d: "Hidden. Bursts when a flyer passes: damages and slows flyers for 3 s."});
  B.cache = trap({name: "Decoy Cache", art: "tp_cache", aart: "tp_cache", tk: "cache", dmg: 360, rad: 2.6, fuse: 1.2, mx: [0,0,0,0,1,2,2,3,3,4], c: [500,900,1500,2400], t: [0.2,1,2,3], d: "Looks like a loot crate. Troops reach it, then it blows up 1.2 s later."});
  B.stake = trap({name: "Pulse Stake", art: "tp_stake", aart: "tp_stake", tk: "stake", dmg: 60, rad: 2.2, stun: 1.8, mx: [0,0,0,0,0,2,2,3,3,4], c: [700,1200,2000,3200], t: [0.2,1,2,3], d: "Hidden. Stuns every troop nearby for 1.8 s."});
  // ----- explicit counts / caps for existing buildings (index = Core level - 1) -----
  var MX = {core: [1,1,1,1,1,1,1,1,1,1], tinker: [2,3,3,4,4,5,5,5,5,5], field: [2,3,4,5,5,6,6,6,6,6], rig: [1,2,3,4,4,5,5,5,5,5], barn: [1,2,2,3,3,3,4,4,4,4], silo: [1,1,2,3,3,3,3,3,3,3],
    blaster: [2,3,4,5,5,6,6,7,7,7], sniper: [0,1,2,3,3,4,4,5,5,5], lobber: [0,0,1,2,2,3,3,3,3,3], flak: [0,1,1,2,2,3,3,3,3,3], trap: [0,2,3,4,5,5,6,6,7,8],
    camp: [1,2,3,4,4,4,4,4,4,4], train: [1,1,2,2,2,3,3,3,3,3], workshop: [0,1,1,1,1,1,1,1,1,1], crewhall: [0,1,1,1,1,1,1,1,1,1], wall: [25,50,75,100,130,160,190,220,250,280]};
  for (var k in MX) B[k].mx = MX[k];
  var ARR = {
    field: {rate: [0,40,70,110,160,230,320,440,600,800,1050], cap: [0,500,1100,2200,4000,6500,10000,15000,22000,32000,45000]},
    rig: {rate: [0,6,10,16,24,34,46,62,82,108,140], cap: [0,60,140,300,600,1000,1600,2500,3800,5500,8000]},
    barn: {cap: [0,2000,6000,15000,40000,90000,180000,320000,520000,800000,1200000]},
    silo: {cap: [0,200,500,1000,2000,4000,7000,11000,16000,23000,32000]},
    camp: {cap: [0,25,30,35,40,45,50,60,65,70,80]},
    crewhall: {cap: [0,5,10,15,20,25,30,35,40,45,50]}
  };
  for (k in ARR) for (var f in ARR[k]) B[k][f] = ARR[k][f];
  // costs / times: grow every table to Core 10
  for (k in B) {
    var d = B[k]; if (!d.c) continue; var zero = d.s.every(function (v) { return v === 0; });
    grow(d.c, M, k === "wall" ? 2.0 : k === "trap" ? 1.7 : 2.2); grow(d.t, M, 2.05);
    if (zero && k !== "wall") { while (d.s.length < M) d.s.push(0); } else grow(d.s, M, 1.9, 1);
    if (k === "wall") { while (d.s.length < M) d.s.push(0); while (d.t.length < M) d.t.push(0); }
    if (k === "trap" || d.tk) for (var q = 0; q < M; q++) d.t[q] = Math.min(d.t[q], 30);
  }
  B.core.t = [0,2,12,48,480,1440,2880,4320,5760,8640];
  B.core.c = [0,1500,5000,15000,36000,80000,170000,340000,620000,1000000]; B.core.s = [0,40,130,400,900,1800,3500,6000,9500,14000];
  B.core.hp = 900;
  B.tinker.t = [0.2,1,4,12,30,70,150,300,600,1000];
  C.ORDER = ["tinker","field","rig","barn","silo","blaster","sniper","lobber","flak","fan","storm","coil","crane","driver","shroud","trap","snare","mine","cache","stake","camp","train","workshop","crewhall","wall"];
  C.DEFS = {blaster: 1, sniper: 1, lobber: 1, flak: 1, fan: 1, storm: 1, coil: 1, crane: 1, driver: 1, shroud: 1};
  C.TRAPS = {trap: 1, snare: 1, mine: 1, cache: 1, stake: 1};
  C.unlockCore = function (t) { var m = B[t].mx; for (var i = 0; i < m.length; i++) if (m[i] > 0) return i + 1; return 99; };
  B.train.d = "Trains troops. Higher level unlocks new troops (see the Army tab).";
  // ----- troops (L1 stats). New roles: loot-seeker, healer, splash, fence-jumper, air escort. -----
  var U = C.U;
  U.roller.pref = "breaker"; U.roller.d = "Rolls toward the nearest building sealed inside fences and bursts on the fence in the way.";
  U.bruiser.d = "Tank. Goes for defenses first and soaks up fire."; U.drone.d = "Flies over fences. Targets defenses first.";
  U.chick = {name: "Rivet Chick", art: "u_chick", hp: 46, dps: 11, rng: 0.8, sp: 3.7, h: 1, tr: 5, c: 20, tb: 1, pref: "any", sz: 13, d: "Cheap and fast. Swarms the nearest building."};
  U.sow = {name: "Scrap Sow", art: "u_sow", hp: 380, dps: 14, rng: 0.9, sp: 1.9, h: 4, tr: 16, c: 150, tb: 2, pref: "loot", lootm: 1.3, sz: 22, d: "Loot-seeker. Hits storages and collectors first and carries 30% more loot."};
  U.hound = {name: "Rusthound", art: "u_hound", hp: 170, dps: 22, rng: 0.9, sp: 3.4, h: 2, tr: 12, c: 110, tb: 3, pref: "gdef", sz: 17, d: "Sprints to the nearest defense that can hit ground troops."};
  U.wrench = {name: "Wrenchling", art: "u_wrench", hp: 100, dps: 0, rng: 3.5, sp: 2.2, h: 4, tr: 18, c: 180, tb: 4, pref: "any", heal: 800, hrate: 24, sz: 18, d: "Healer. Repairs up to 3 troops nearby from a limited tool kit. Max 2 per raid, the second works at 60%."};
  U.mule = {name: "Clod Mule", art: "u_mule", hp: 115, dps: 22, rng: 6.5, sp: 1.6, h: 4, tr: 18, c: 200, tb: 5, pref: "gdef", lob: 1, spl: 1.2, sz: 20, d: "Lobs shells over fences with splash damage. Fragile, keep it behind your tanks."};
  U.spinner = {name: "Shearspinner", art: "u_spinner", hp: 300, dps: 24, rng: 0.9, sp: 2.0, h: 4, tr: 22, c: 260, tb: 6, pref: "gdef", cone: 0.5, sz: 22, d: "Spinning blades also hit buildings and defenders around its target."};
  U.badger = {name: "Burrow Badger", art: "u_badger", hp: 270, dps: 26, rng: 0.9, sp: 2.6, h: 3, tr: 20, c: 220, tb: 7, pref: "def", hop: 4, sz: 20, d: "Fence-jumper. Digs under up to 4 fence tiles every 8 s, then pops up past them."};
  U.kestrel = {name: "Kite Kestrel", art: "u_kestrel", hp: 190, dps: 26, rng: 4.5, sp: 2.8, h: 3, tr: 18, c: 210, tb: 8, pref: "air", fly: 1, sz: 20, d: "Air escort. Goes for flying defenders and anti-air defenses first."};
  C.UORDER = ["slinger", "chick", "bruiser", "roller", "sow", "drone", "hound", "wrench", "mule", "spinner", "badger", "kestrel"];
  C.UMAX = {wrench: 2};
  C.PREF = {any: "Nearest building", def: "Defenses first", gdef: "Ground-hitting defenses first", air: "Anti-air first", loot: "Loot first", breaker: "Sealed buildings (breaks fences)"};
  C.CREWMEM.push({n: "Bix", t: "chick"}, {n: "Sol", t: "hound"});
  // troop upgrades: up to level 8
  C.LABMAX = 8; C.LAB = {c: [0,600,1700,4200,9500,19000,38000,70000], s: [0,20,55,120,260,520,1000,1800], t: [0,2,8,24,90,240,600,1500]};
  // ----- spells: energy budget -----
  var SP = C.SP;
  SP.rain.e = 1; SP.spark.e = 1; SP.boost.e = 2; SP.decoy.e = 1;
  SP.clamp = {name: "Ground Clamp", c: 220, s: 8, e: 2, unl: 4, d: "Freezes defenses in the area for 3 s, then halves their fire rate for 5 s.", col: "#a8e8ff"};
  SP.stitch = {name: "Fence Stitch", c: 160, s: 0, e: 1, unl: 3, d: "Opens a gap: fences in the area are walk-through for 8 s.", col: "#9be26b"};
  SP.veil = {name: "Fog Veil", c: 150, s: 4, e: 1, unl: 5, d: "Troops inside are hidden from defenses beyond 1.5 tiles for 6 s.", col: "#c9b8ff"};
  SP.rain.unl = 1; SP.spark.unl = 1; SP.boost.unl = 1; SP.decoy.unl = 1;
  SP.rain.short = "Rain"; SP.spark.short = "Spark"; SP.boost.short = "Boost"; SP.decoy.short = "Decoy"; SP.clamp.short = "Clamp"; SP.stitch.short = "Stitch"; SP.veil.short = "Veil";
  C.SPORDER = ["rain", "spark", "boost", "decoy", "stitch", "clamp", "veil"];
  C.SPCAPE = [2, 3, 4, 5, 6, 7, 8, 8, 9, 9]; C.SPCAP = 9;
  // ----- raid timeline windows (seconds) -----
  C.WINDOWS = [{n: "Setup", a: 0, b: 40, tip: "Place tanks and breakers"}, {n: "Pressure", a: 40, b: 110, tip: "Spells and the main push"}, {n: "Finish", a: 110, b: 180, tip: "Clean up stragglers"}];
  // ----- protection -----
  C.SPECTXT = {cone: "Cone blast hits a line of troops", chain: "Chain lightning jumps between troops", ramp: "Damage ramps up on one target", slow: "Slows what it hits", knock: "Knocks troops back", shroud: "Support: weakens ranged hits on nearby defenses"};
  C.TRAPTXT = {rake: "Bursts when stepped on", snare: "Roots troops in place", mine: "Big burst vs ground groups", cache: "Fake loot lures troops, then pops", stake: "Pulse that stuns troops"};
  C.GUARD_MIN = 30;
  C.gapMul = function (mine, theirs) { var g = theirs - mine; return g < 0 ? Math.max(0.25, 1 + 0.25 * g) : Math.min(1.4, 1 + 0.1 * g); };
  // ----- loot tables per Core level -----
  C.LOOTC = [[450,600],[1700,2400],[5000,7000],[10500,15000],[20000,29000],[37000,52000],[62000,88000],[95000,130000],[135000,185000],[180000,250000]];
  C.LOOTS = [[20,40],[60,110],[140,260],[320,600],[600,1000],[1000,1700],[1600,2600],[2300,3600],[3200,5000],[4300,6500]];
})();
