"use strict";
// ---- v0.8 Squad data: 16 original units, 5-element wheel, trials, missions. All names/art/mechanics original (genre-standard collection + team + burst loop). ----
(function () {
  var D = (BB.SQD = {});
  D.EL = [{id: "sun", n: "Sun", col: "#ffc531", dk: "#8a5a00"}, {id: "storm", n: "Storm", col: "#9a7bff", dk: "#3a2a8a"}, {id: "soil", n: "Soil", col: "#c98a4b", dk: "#5a3a1a"}, {id: "frost", n: "Frost", col: "#6fd8ff", dk: "#1c5a7a"}, {id: "spark", n: "Spark", col: "#ff6a3a", dk: "#7a2a10"}];
  // wheel: each element beats the next one (x1.5) and is beaten by the previous one (x0.7)
  // elements: 0 Sun 1 Storm 2 Soil 3 Frost 4 Spark. Wheel order by index: Sun(0)>Storm(1)? keep wheel in index order so the sim stays simple:
  D.adv = function (a, d) { if (a < 0 || d < 0) return 1; if ((a + 1) % 5 === d) return 1.5; if ((d + 1) % 5 === a) return 0.7; return 1; };
  D.WHEEL = "Sun > Storm > Soil > Frost > Spark > Sun";
  // u: id, name, element, base stars, charge rate, leader skill {n, atk, hp, chg, bp}, burst name, role text
  var U = [
    ["baleguard", "Bale Guard", 2, 3, 2.2, ["Hay Wall", 0, 0.10, 0, 0], "Bale Slam", "Plated tank that shrugs off hits"],
    ["sunseed", "Sun Seed", 0, 3, 2.6, ["Warm Sprouts", 0, 0, 0.08, 0], "Dawn Bloom", "Small sprout bot that heals the team"],
    ["gustmill", "Gust Mill", 1, 3, 2.4, ["Tailwind", 0.08, 0, 0, 0], "Gale Spin", "Windmill walker with a chain-lightning spin"],
    ["rimeplanter", "Rime Planter", 3, 3, 2.4, ["Cold Frame", 0, 0.10, 0, 0], "Frost Frame", "Frost sprayer that freezes defenses"],
    ["sawback", "Sawback", 4, 3, 2.8, ["Spin Up", 0.10, 0, 0, 0], "Blade Rush", "Twin-saw tractor, fast to charge"],
    ["herdmaster", "Herd Master", 2, 4, 2.4, ["Herd Instinct", 0.06, 0.12, 0, 0], "Stampede", "Commands the soil herd"],
    ["cropduster", "Crop Duster", 0, 4, 3.0, ["Dusting Run", 0, 0, 0.15, 0], "Seed Barrage", "Biplane drone, charges quickly"],
    ["thunderram", "Thunder Ram", 1, 4, 2.6, ["Ram Charge", 0.14, 0, 0, 0], "Thunder Butt", "Horned storm mech"],
    ["huskgolem", "Husk Reaper", 3, 4, 2.4, ["Hard Frost", 0, 0.12, 0, 0.08], "Winter Harvest", "Frozen scythe scarecrow"],
    ["harvestram", "Harvest Ram", 4, 4, 2.8, ["Full Throttle", 0.12, 0, 0.08, 0], "Overdrive Mow", "Spiked reaper-truck"],
    ["furrowdozer", "Furrow Dozer", 2, 4, 2.2, ["Plow Through", 0, 0.16, 0, 0], "Deep Furrow", "Bulldozer that cracks walls"],
    ["silotitan", "Silo Titan", 2, 5, 2.0, ["Grain Fortress", 0.08, 0.18, 0, 0], "Silo Burst", "Walking granary, the heaviest unit"],
    ["goldenharvest", "Golden Harvest", 0, 5, 2.6, ["Golden Yield", 0.10, 0, 0, 0.10], "Golden Hour", "Gilded combine"],
    ["nova", "Nova", 0, 5, 3.2, ["Bright Idea", 0, 0, 0.20, 0.10], "Sunrise Protocol", "Barn AI hologram"],
    ["scarecrowx", "Scarecrow-X", 1, 5, 2.6, ["Dusk Patrol", 0.16, 0, 0, 0.10], "Midnight Volley", "The ranch's storm sniper"],
    ["coilwalker", "Coil Walker", 4, 5, 3.0, ["Live Wire", 0.14, 0, 0.14, 0], "Grid Overload", "Fence-coil giant that overloads defenses"]
  ];
  D.U = {}; D.ORDER = [];
  U.forEach(function (r) { D.U[r[0]] = {id: r[0], nm: r[1], el: r[2], st: r[3], cr: r[4], ls: {n: r[5][0], atk: r[5][1], hp: r[5][2], chg: r[5][3], bp: r[5][4]}, bn: r[6], role: r[7], art: "assets/sq/" + r[0] + ".webp"}; D.ORDER.push(r[0]); });
  D.STARTERS = ["baleguard", "sunseed", "sawback"];
  D.leadText = function (ls) { var a = []; if (ls.atk) a.push("+" + Math.round(ls.atk * 100) + "% troop attack"); if (ls.hp) a.push("+" + Math.round(ls.hp * 100) + "% troop HP"); if (ls.chg) a.push("+" + Math.round(ls.chg * 100) + "% charge speed"); if (ls.bp) a.push("+" + Math.round(ls.bp * 100) + "% burst power"); return a.join(", "); };
  D.burstText = function (el) { return ["Heals the squad's troops and hits nearby defenses", "Chain lightning on up to 5 buildings", "Shields troops and cracks buildings and walls", "Freezes defenders and defenses in an area", "Overdrives troops and blasts the toughest buildings"][el]; };
  // progression numbers
  D.CAP = {3: 30, 4: 45, 5: 60}; D.LB_MAX = 10;
  D.xpNeed = function (lv) { return Math.round(40 * Math.pow(lv, 1.5)); };
  D.TONIC_XP = 800; D.PART_XP = {3: 300, 4: 900, 5: 2500};
  D.EVO = {3: {core: 8, coins: 6000, h: 24}, 4: {core: 20, coins: 30000, h: 72}};
  D.lbCost = function (lb) { return {sh: lb + 1, h: 12 * (lb + 1)}; };
  D.FUSE_MIN_PER = 20; D.BAYS = 2;
  D.STAM_MAX = 60; D.STAM_SEC = 240;
  // summon
  D.RATES = {3: 0.72, 4: 0.24, 5: 0.04}; D.PITY_HARD = 40; D.PITY_SOFT = 30; D.SOFT_ADD = 0.04;
  D.COST = {one: {tix: 1, gem: 25}, ten: {tix: 10, gem: 225}};
  // trials: 5 elements x 4 tiers
  D.TIER = [{r: "I", fh: 1, stam: 6, tix: 1, gem: 20, core: 2, ton: 3}, {r: "II", fh: 3, stam: 8, tix: 2, gem: 30, core: 3, ton: 4}, {r: "III", fh: 5, stam: 10, tix: 2, gem: 40, core: 5, ton: 6}, {r: "IV", fh: 7, stam: 12, tix: 3, gem: 60, core: 8, ton: 10}];
  D.trials = []; for (var e = 0; e < 5; e++) for (var t = 0; t < 4; t++) D.trials.push({id: e * 4 + t, el: e, tier: t, nm: D.EL[e].n + " Trial " + D.TIER[t].r});
  // missions
  D.DAILY = [{k: "raids", n: "Win 2 raids", g: 2, r: {tix: 1}}, {k: "bursts", n: "Fire 5 bursts", g: 5, r: {coins: 400}}, {k: "trials", n: "Clear 1 trial", g: 1, r: {ton: 2}}, {k: "summons", n: "Summon once", g: 1, r: {gem: 15}}];
  D.DAILY_ALL = {tix: 1, sta: 20}; 
  D.WEEKLY = [{k: "raids", n: "Win 10 raids", g: 10, r: {tix: 3}}, {k: "chain4", n: "Land a 4-chain burst combo", g: 1, r: {gem: 60}}, {k: "trials", n: "Clear 5 trials", g: 5, r: {ton: 6, core: 3}}, {k: "levels", n: "Level up units 10 times", g: 10, r: {tix: 2}}];
  D.WEEKLY_ALL = {tix: 5, gem: 100};
  // codex
  D.CODEX_N = [{n: 4, r: {tix: 2}}, {n: 8, r: {tix: 3, ton: 5}}, {n: 12, r: {tix: 5, gem: 80}}, {n: 16, r: {tix: 10, gem: 200}}];
  D.CODEX_EL = {tix: 1, gem: 50};
})();
