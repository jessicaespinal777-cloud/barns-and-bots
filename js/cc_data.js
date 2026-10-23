"use strict";
// ---- Base-raid core loop: data tables (all names original to Barns & Bots) ----
(function () {
  var C = BB.CC = {};
  C.GRID = 24; C.T = 15; C.RING = 3;            // 24x24 tiles, buildable zone is tiles 3..20
  C.LV = [0, 1, 1.5, 2.2, 3.1];                  // per-level stat multiplier
  C.RAID_SEC = 180;
  // Homestead Core level (1..4) gates everything else. mx = max count at core level 1..4
  // c/s/t: coin cost, salvage cost, minutes to build/upgrade TO level 1..4
  C.B = {
    core:    {name: "Homestead Core", w: 3, h: 3, art: "homestead", aart: "a_core", hp: 900, kind: "core", mx: [1,1,1,1], c: [0,1500,6000,20000], s: [0,40,150,500], t: [0,2,20,120], d: "Your base's heart. Upgrading it unlocks new buildings and levels. Destroying it on a raid earns a star."},
    tinker:  {name: "Tinker Shed", w: 2, h: 2, art: "tinker", hp: 300, kind: "work", mx: [2,3,3,4], c: [150,600,1500,3000], s: [0,0,0,0], t: [0.2,1,5,20], d: "Each shed gives you one tinker. Tinkers build and upgrade (one job each)."},
    field:   {name: "Crop Field", w: 3, h: 2, art: null, aart: "a_harv", hp: 250, kind: "col", res: "c", rate: [0,40,70,110,160], cap: [0,500,1100,2200,4000], mx: [2,3,4,5], c: [100,400,1100,2600], s: [0,0,0,0], t: [0.2,1,6,30], d: "Grows coins over time. Tap it to collect."},
    rig:     {name: "Scrap Rig", w: 2, h: 2, art: null, aart: "a_harv", hp: 250, kind: "col", res: "s", rate: [0,6,10,16,24], cap: [0,60,140,300,600], mx: [1,2,3,4], c: [150,500,1300,2800], s: [0,0,0,0], t: [0.3,1.5,8,35], d: "Salvages scrap. Tap it to collect."},
    barn:    {name: "Coin Barn", w: 3, h: 3, art: "barn", aart: "a_vaultC", hp: 500, kind: "sto", res: "c", cap: [0,2000,6000,15000,40000], mx: [1,2,2,3], c: [200,800,2200,6000], s: [0,0,0,0], t: [0.3,2,10,45], d: "Stores coins. Raiders loot a share of what is inside."},
    silo:    {name: "Salvage Silo", w: 2, h: 2, art: "silo", aart: "a_vaultS", hp: 450, kind: "sto", res: "s", cap: [0,200,500,1000,2000], mx: [1,1,2,3], c: [250,900,2400,6500], s: [0,0,0,0], t: [0.3,2,10,45], d: "Stores salvage."},
    blaster: {name: "Hay Blaster", w: 2, h: 2, art: "t_blaster", aart: "a_blaster", hp: 300, kind: "def", dps: 16, rng: 5.5, cd: 0.7, g: 1, a: 0, mx: [2,3,4,5], c: [120,500,1500,4000], s: [0,0,10,40], t: [0.2,1.5,10,40], d: "Fires hay bales at ground troops. Cannot hit air."},
    sniper:  {name: "Scarecrow Sniper", w: 2, h: 2, art: "t_sniper", aart: "a_sniper", hp: 240, kind: "def", dps: 24, rng: 8.5, cd: 1.1, g: 1, a: 1, mx: [0,1,2,3], c: [400,900,2400,6000], s: [0,10,25,60], t: [0.5,3,15,50], d: "Long range. Hits ground AND air, one target at a time."},
    lobber:  {name: "Silo Lobber", w: 3, h: 3, art: "t_lobber", aart: "a_lobber", hp: 340, kind: "def", dps: 28, rng: 9.5, min: 3, cd: 3, spl: 1.5, g: 1, a: 0, mx: [0,0,1,2], c: [900,1800,3200,7500], s: [0,0,40,90], t: [0.5,4,20,60], d: "Splash damage on crowds. Cannot hit units close to it or in the air."},
    flak:    {name: "Flak Sunflower", w: 2, h: 2, art: "t_flak", aart: "a_flak", hp: 300, kind: "def", dps: 36, rng: 7.5, cd: 1.2, spl: 1, g: 0, a: 1, mx: [0,1,1,2], c: [500,1000,2600,6500], s: [0,15,40,80], t: [0.5,4,18,55], d: "Shreds air units. Cannot hit the ground."},
    trap:    {name: "Rake Trap", w: 1, h: 1, art: "t_trap", aart: "t_trap", hp: 20, kind: "trap", dmg: 220, rad: 2, mx: [0,2,3,4], c: [150,300,500,800], s: [0,0,0,0], t: [0.1,0.5,1,2], d: "Hidden. Springs on ground troops that step close, one use."},
    camp:    {name: "Muster Yard", w: 3, h: 3, art: "muster", aart: "muster", hp: 400, kind: "camp", cap: [0,25,30,35,40], mx: [1,2,3,4], c: [200,700,2000,5000], s: [0,0,0,0], t: [0.2,1.5,8,40], d: "Holds your army. Each yard adds housing."},
    train:   {name: "Training Barn", w: 3, h: 3, art: "trainbarn", aart: "trainbarn", hp: 400, kind: "train", mx: [1,1,2,2], c: [300,1200,3500,8000], s: [0,0,20,60], t: [0.3,3,15,50], d: "Trains troops. Higher level unlocks new troops (Roller L2, Drone L3)."},
    workshop:{name: "Workshop", w: 3, h: 3, art: "workshop", aart: "workshop", hp: 400, kind: "lab", mx: [0,1,1,1], c: [800,2000,5000,12000], s: [0,40,100,200], t: [0.5,5,25,60], d: "Upgrade your troops with coins and salvage."},
    crewhall:{name: "Crew Barn", w: 3, h: 3, art: "crewhall", aart: "a_bunker", hp: 500, kind: "crew", cap: [0,5,10,15,20], mx: [0,1,1,1], c: [1000,2500,6000,15000], s: [0,30,80,160], t: [0.5,6,30,90], d: "Holds helper troops donated by your Ranch Crew. They defend when raiders come close."},
    wall:    {name: "Fence", w: 1, h: 1, art: "fence_h", aart: "a_wall", hp: 160, kind: "wall", mx: [25,50,75,100], c: [20,45,90,180], s: [0,0,0,0], t: [0,0,0,0], d: "Drag to paint fences. Blocks raiders until they chew through."}
  };
  C.ORDER = ["tinker","field","rig","barn","silo","blaster","sniper","lobber","flak","trap","camp","train","workshop","crewhall","wall"];
  C.DEFS = {blaster: 1, sniper: 1, lobber: 1, flak: 1};
  // Troops (L1 stats). h = housing, tr = train seconds, pref = favourite target, tb = training barn level needed
  C.U = {
    slinger: {name: "Pitchfork Slinger", art: "u_slinger", hp: 55, dps: 13, rng: 3.4, sp: 2.6, h: 1, tr: 6,  c: 25,  tb: 1, pref: "any", sz: 15, d: "Fragile and ranged. Needs a tank in front."},
    bruiser: {name: "Hay Bruiser", art: "u_bruiser", hp: 520, dps: 26, rng: 0.9, sp: 1.5, h: 5, tr: 20, c: 190, tb: 1, pref: "def", sz: 22, d: "Tank. Goes for defenses first and soaks up fire."},
    roller:  {name: "Bale Roller", art: "u_roller", hp: 80, dps: 0, rng: 0.5, sp: 3.0, h: 2, tr: 12, c: 100, tb: 2, pref: "wall", sz: 16, boom: 80, brad: 1.5, d: "Rolls up to fences and bursts. Great at opening walls."},
    drone:   {name: "Sparrow Drone", art: "u_drone", hp: 140, dps: 30, rng: 0.8, sp: 3.2, h: 2, tr: 16, c: 160, tb: 3, pref: "def", fly: 1, sz: 18, d: "Flies over fences. Targets defenses first."}
  };
  C.UORDER = ["slinger", "bruiser", "roller", "drone"];
  C.SP = {
    rain:  {name: "Rain Cloud", c: 120, s: 0, d: "Heals troops in the area for 6 s.", col: "#5ec8ff"},
    spark: {name: "Spark Rod", c: 150, s: 4, d: "Strikes buildings in the area for big damage.", col: "#ffe65a"},
    boost: {name: "Sunburst Boost", c: 180, s: 0, d: "Troops in the area hit harder and run faster for 8 s.", col: "#ff9a3c"},
    decoy: {name: "Decoy Scarecrow", c: 90, s: 0, d: "A dummy that soaks fire and lures crew defenders.", col: "#d9b36a"}
  };
  C.SPORDER = ["rain", "spark", "boost", "decoy"]; C.SPCAP = 4;
  C.HERO = {name: "Baleguard", hp: 900, dps: 42, rng: 1.2, sp: 1.8, sz: 28};
  C.LABMAX = 3; C.LAB = {c: [0, 600, 1800, 5000], s: [0, 20, 60, 140], t: [0, 2, 12, 40]};  // upgrade troop TO lvl
  // Leagues
  C.LEAGUES = [{n: "Seedling", min: 0, col: "#9bd06b"}, {n: "Sprout", min: 200, col: "#6fd1a0"}, {n: "Pitchfork", min: 500, col: "#7fb2ff"},
    {n: "Scarecrow", min: 900, col: "#d9a8ff"}, {n: "Harvester", min: 1400, col: "#ffb454"}, {n: "Barn-Master", min: 2000, col: "#ff6e6e"}];
  C.league = function (tr) { var L = C.LEAGUES[0]; for (var i = 0; i < C.LEAGUES.length; i++) if (tr >= C.LEAGUES[i].min) L = C.LEAGUES[i]; return L; };
  C.DAILY = [{c: 300}, {s: 20}, {g: 10}, {c: 800}, {bp: 2}, {g: 25}, {g: 50, c: 2000}];
  C.QUESTS = [
    {id: "win1", t: "Win a raid (1+ star)", n: 1, ev: "win", r: {g: 8}, p: 40},
    {id: "star3", t: "Earn 3 stars total", n: 3, ev: "stars", r: {c: 400}, p: 40},
    {id: "coll", t: "Collect 600 coins", n: 600, ev: "collect", r: {s: 15}, p: 30},
    {id: "train", t: "Train 12 troops", n: 12, ev: "train", r: {c: 300}, p: 30},
    {id: "upg", t: "Finish an upgrade", n: 1, ev: "upg", r: {g: 6}, p: 30},
    {id: "defs", t: "Destroy 4 defenses", n: 4, ev: "defs", r: {s: 12}, p: 40}
  ];
  C.ACH = [
    {id: "w1", t: "First Raid", d: "Win a raid", ev: "win", n: 1, g: 10}, {id: "w10", t: "Raid Veteran", d: "Win 10 raids", ev: "win", n: 10, g: 40},
    {id: "s30", t: "Star Collector", d: "Earn 30 stars", ev: "stars", n: 30, g: 40}, {id: "bd", t: "Demolition", d: "Destroy 100 buildings", ev: "bdest", n: 100, g: 30},
    {id: "core3", t: "Settling In", d: "Upgrade the Homestead Core to level 3", ev: "core", n: 3, g: 50}, {id: "wall", t: "Fence Builder", d: "Place 60 fences", ev: "walls", n: 60, g: 20},
    {id: "tr500", t: "Rising Rancher", d: "Reach 500 trophies", ev: "trophies", n: 500, g: 50}, {id: "def", t: "Held the Line", d: "Beat back a raid with no stars", ev: "held", n: 1, g: 25}
  ];
  C.PASS = [];  for (var i = 1; i <= 10; i++) C.PASS.push({pts: i * 100, free: i % 3 === 0 ? {g: 15} : i % 2 ? {c: 250 * i} : {s: 10 * i}, prem: {g: 30 + i * 5}});
  C.CREWMEM = [{n: "Mina", t: "bruiser"}, {n: "Dex", t: "slinger"}, {n: "Odalys", t: "roller"}, {n: "Tobi", t: "slinger"}, {n: "Hana", t: "drone"}, {n: "Rowan", t: "bruiser"}, {n: "Pepper", t: "slinger"}, {n: "Juno", t: "roller"}];
  C.NAMES = ["Zorg-7", "Vexa Prime", "Nullbloom", "Skreel Hive", "Drossgate", "Grim Orchard", "Voidpatch", "Hollowmaw", "Spore Keep", "Blight Hold", "Krex Den", "Mawfield", "Thornpit", "Gloom Silo", "Rustbeak", "Quill Nest", "Ashmote", "Cinder Roost", "Lurk Hollow", "Nibble Station"];
  C.STORY = [
    {name: "Wake-Up Call", fh: 1, desc: "A tiny scout outpost. One lone blaster."},
    {name: "Sunflower Ridge", fh: 1, desc: "Fenced vaults and two blasters. Use a tank first."},
    {name: "Silo Siege", fh: 1, desc: "A walled core. Break in with rollers."},
    {name: "Spore Fields", fh: 2, desc: "Introduces sniper towers."}, {name: "Windmill Run", fh: 2, desc: "Walls and a crew bunker."},
    {name: "Cloudline Dairy", fh: 2, desc: "Flak flowers. Bring drones carefully."}, {name: "Orchard Overrun", fh: 3, desc: "Lobbers punish crowds."},
    {name: "Brood Hollow", fh: 3, desc: "Double walls, two lobbers."}, {name: "Titan's Shadow", fh: 4, desc: "A fortress. Lure the crew first."},
    {name: "Vorlax's Ark", fh: 4, desc: "Raid the Ark, then duel the Harvester King."}
  ];
  C.fmtT = function (min) { var s = Math.max(0, Math.ceil(min * 60)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60; return h ? h + "h " + ("0" + m).slice(-2) + "m" : m ? m + "m " + ("0" + sec).slice(-2) + "s" : sec + "s"; };
  C.rng = function (seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
})();
