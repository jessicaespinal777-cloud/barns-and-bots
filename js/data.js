"use strict";
// ---- Game data. Numbers come from the design Page (Baleguard cost/time/power curve). ----
window.BB = {VERSION: "0.6.0"};
BB.LEVEL_CAP = 10;
// upgrade TO level n: tier, coins, salvage, blueprints, timer minutes
BB.UPG = [null,
  {tier: "Rookie",  coins: 0,     salv: 0,    bp: 0,  min: 0},
  {tier: "Rookie",  coins: 500,   salv: 10,   bp: 0,  min: 0},
  {tier: "Rookie",  coins: 1200,  salv: 25,   bp: 0,  min: 3},
  {tier: "Veteran", coins: 2500,  salv: 50,   bp: 5,  min: 15},
  {tier: "Veteran", coins: 5000,  salv: 100,  bp: 10, min: 45},
  {tier: "Veteran", coins: 9000,  salv: 180,  bp: 15, min: 90},
  {tier: "Elite",   coins: 15000, salv: 300,  bp: 20, min: 180},
  {tier: "Elite",   coins: 25000, salv: 500,  bp: 30, min: 300},
  {tier: "Elite",   coins: 40000, salv: 800,  bp: 40, min: 480},
  {tier: "Legend",  coins: 60000, salv: 1200, bp: 60, min: 720}
];
// [health %, damage %] by level
BB.POWER = [null, [100,100],[108,107],[116,114],[125,122],[135,130],[146,139],[158,148],[171,158],[185,169],[200,180]];
BB.START = {coins: 400, gems: 120, salv: 10, bp: 0};
// speed-up gem price points (minutes -> gems), from the Page: 1h 20, 8h 100, 1 day 220
BB.skipGems = function (mins) {
  if (mins <= 5) return 0;
  var pts = [[0, 0], [60, 20], [480, 100], [1440, 220]];
  for (var i = 1; i < pts.length; i++) {
    if (mins <= pts[i][0]) {
      var a = pts[i - 1], b = pts[i];
      return Math.max(1, Math.ceil(a[1] + (b[1] - a[1]) * (mins - a[0]) / (b[0] - a[0])));
    }
  }
  return 220 + Math.ceil((mins - 1440) / 60 * 9);
};
BB.GEM_PACKS = [
  {usd: "0.99", gems: 80}, {usd: "4.99", gems: 500}, {usd: "9.99", gems: 1100},
  {usd: "19.99", gems: 2400}, {usd: "49.99", gems: 6500}, {usd: "99.99", gems: 14000}
];
BB.ANIMALS = [
  {name: "Moo-riel", kind: "cow"}, {name: "Bessie", kind: "cow"}, {name: "Wooly", kind: "sheep"},
  {name: "Hamlet", kind: "pig"}, {name: "Daisy", kind: "cow"}, {name: "Biscuit", kind: "sheep"}
];
// 10 missions. dur seconds (0 = boss). sn/wk = seconds between Snatcher / Siphon waves, py = max Blight pylons, tank = tank crawlers allowed
BB.MISSIONS = [
  {id: 1, name: "Wake-Up Call",      dur: 90,  sn: 7,   wk: 0,  py: 0, tank: 0, animals: 3, coins: 100,  salv: 6,   bp: 0, nova: "Something took Moo-riel! Baleguard is online, June. Shoot the Hook Drones before they flee off the island!"},
  {id: 2, name: "Sunflower Ridge",   dur: 120, sn: 6,   wk: 16, py: 0, tank: 0, animals: 4, coins: 130,  salv: 8,   bp: 0, nova: "Siphon Legion walkers drain silos. Their front plates are tough: flank them and hit the back!"},
  {id: 3, name: "Silo Siege",        dur: 150, sn: 5.5, wk: 13, py: 0, tank: 0, animals: 4, coins: 170,  salv: 12,  bp: 0, nova: "More walkers. Use Bale Wall to hold a lane while your cannon works."},
  {id: 4, name: "Spore Fields",      dur: 180, sn: 6,   wk: 13, py: 1, tank: 0, animals: 5, coins: 230,  salv: 16,  bp: 2, nova: "Blight Brood. Spore Pylons spawn Stingers non-stop. Smash the pylon first!"},
  {id: 5, name: "Windmill Run",      dur: 180, sn: 5,   wk: 11, py: 1, tank: 1, animals: 5, coins: 300,  salv: 22,  bp: 3, nova: "Tank Crawlers incoming: slow, heavy, weak in the back."},
  {id: 6, name: "Cloudline Dairy",   dur: 180, sn: 4.5, wk: 10, py: 2, tank: 1, animals: 5, coins: 400,  salv: 30,  bp: 4, nova: "Two pylons on this island. Prioritize, June."},
  {id: 7, name: "Orchard Overrun",   dur: 180, sn: 4,   wk: 9,  py: 2, tank: 2, animals: 6, coins: 540,  salv: 40,  bp: 5, nova: "They are pushing hard. Keep that wall cooldown rolling."},
  {id: 8, name: "Brood Hollow",      dur: 180, sn: 4,   wk: 8,  py: 3, tank: 2, animals: 6, coins: 720,  salv: 55,  bp: 6, nova: "Three pylons. This is where they nest. Burn it down."},
  {id: 9, name: "Titan's Shadow",    dur: 180, sn: 3.5, wk: 7,  py: 3, tank: 3, animals: 6, coins: 950,  salv: 70,  bp: 7, nova: "Vorlax's Ark is on the long-range scanner. One more island, then we face him."},
  {id: 10, name: "Vorlax, the Harvester King", dur: 0, sn: 0, wk: 0, py: 0, tank: 0, animals: 6, coins: 1500, salv: 100, bp: 8, boss: true, nova: "That's the Ark. Shoot down its beam emitters, survive the King's scythe, then finish the Eclipse. Save the herd!"}
];
BB.MEMORY = [
  "Nova remembers a barn dance. June, you were four.", "Nova recalls the smell of fresh hay and a hand-drawn blueprint.",
  "Nova finds an old log: 'Baleguard, built for the herd.'", "Nova remembers June's grandfather welding the first bale fist.",
  "Nova unlocks a map: ten islands, one Ark.", "Nova remembers the sunrise on Cloudline.",
  "Nova detects a second signal under the Ark.", "Nova recalls the Brood's first spore on the orchard.",
  "Nova remembers the fall of the Old Barn.", "The Ark is down. The islands are reconnected. The herd is safe, for now."
];
BB.OTHER_MECHS = [
  {id: "scarecrow-x", name: "Scarecrow-X", role: "Stealth Raider", bp: 60},
  {id: "silo-titan", name: "Silo Titan", role: "Heavy Tank", bp: 80},
  {id: "cropduster", name: "Cropduster", role: "Air Support", bp: 70},
  {id: "herdmaster", name: "Herdmaster", role: "Healer / Support", bp: 90},
  {id: "harvest-ram", name: "Harvest Ram", role: "Bruiser", bp: 100},
  {id: "gustmill", name: "Gustmill", role: "Crowd Control", bp: 110}
];
BB.FARM = {perMin: 25, cap: 750};
