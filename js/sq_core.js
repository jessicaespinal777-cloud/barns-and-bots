"use strict";
// ---- v0.8 Squad core: roster state, stats, team pack for the sim, summon (seeded, visible odds, pity), timed fusion/evolution/limit-break, stamina, trials, missions, codex ----
(function () {
  var SQ = (BB.SQ = {}), D = BB.SQD, C = BB.CC, S = BB.S;
  function X() { return BB.CCUI; }
  SQ.D = D;
  function dayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function weekKey() { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function fresh() {
    return {v: 1, init: 0, own: {}, team: ["", "", "", "", "", ""], tix: 0, seed: (Date.now() * 2654435761) >>> 0, pulls: 0, pity: 0, hist: [], jobs: [],
      mat: {ton: 0, c0: 0, c1: 0, c2: 0, c3: 0, c4: 0, cw: 0, p3: 0, p4: 0, p5: 0}, sta: {v: D.STAM_MAX, t: Date.now()}, clr: {}, off: 0, auto: 1,
      ms: {d: {k: "", p: {}, c: {}, all: 0}, w: {k: "", p: {}, c: {}, all: 0}}, cdx: {n: {}, e: {}}, stats: {bursts: 0, best: 0, trials: 0}};
  }
  SQ.st = function () {
    var c = X().cc(), f = fresh(), k; if (!c.sq) c.sq = f; var q = c.sq;
    for (k in f) if (q[k] === undefined) q[k] = f[k]; for (k in f.mat) if (q.mat[k] === undefined) q.mat[k] = 0;
    if (!q.init) { q.init = 1; D.STARTERS.forEach(function (id, i) { q.own[id] = {lv: 1, xp: 0, st: D.U[id].st, lb: 0, sh: 0, nw: 1}; q.team[i] = id; }); q.tix = 6; }
    return q;
  };
  SQ.now = function () { return Date.now() + (SQ.st().off || 0); };
  SQ.warp = function (ms) { var q = SQ.st(); q.off = (q.off || 0) + ms; SQ.settle(); };       // test hook: skip time (documented in README)
  function mul() { return (S.set && S.set.timerMul) || 1; }
  function save() { X().save(); X().hud && X().hud(); }
  // ---------- unit stats ----------
  SQ.cap = function (o) { return D.CAP[o.st] + 2 * o.lb; };
  SQ.pw = function (id) { var o = SQ.st().own[id]; if (!o) return 1; var b = {3: 0.85, 4: 1, 5: 1.2}[o.st]; return Math.min(2.6, +(b * (1 + 0.012 * (o.lv - 1)) * (1 + 0.04 * o.lb)).toFixed(3)); };
  SQ.power = function (id) { return Math.round(SQ.pw(id) * 1000); };
  SQ.lead = function () { var q = SQ.st(), id = q.team.filter(function (t) { return t; })[0]; return id ? D.U[id] : null; };
  SQ.teamIds = function () { return SQ.st().team.filter(function (t) { return t && SQ.st().own[t]; }); };
  SQ.baseEl = function (b) { return b && b.el !== undefined ? b.el : ((b && b.seed | 0) >>> 0) % 5; };
  SQ.pack = function (base) {
    var ids = SQ.teamIds(); if (!ids.length) return null; var L = D.U[ids[0]].ls;
    return {u: ids.map(function (id) { var u = D.U[id]; return {id: id, el: u.el, cr: u.cr, bt: u.el, pw: SQ.pw(id)}; }),
      lead: {atk: Math.min(0.25, L.atk), hp: Math.min(0.25, L.hp), chg: Math.min(0.3, L.chg), bp: Math.min(0.2, L.bp)}, bel: SQ.baseEl(base)};
  };
  // ---------- rewards ----------
  SQ.grant = function (r) {
    var q = SQ.st(), t = [];
    if (r.tix) { q.tix += r.tix; t.push("+" + r.tix + " ticket" + (r.tix > 1 ? "s" : "")); }
    if (r.gem) { X().give(0, 0, r.gem); t.push("+" + r.gem + " gems"); }
    if (r.coins) { X().give(r.coins, 0, 0); t.push("+" + r.coins + " coins"); }
    if (r.ton) { q.mat.ton += r.ton; t.push("+" + r.ton + " tonic"); }
    if (r.core) { if (r.cel !== undefined) { q.mat["c" + r.cel] += r.core; t.push("+" + r.core + " " + D.EL[r.cel].n + " core"); } else { q.mat.cw += r.core; t.push("+" + r.core + " wild core"); } }
    if (r.sta) { var s = SQ.sta(); q.sta.v = Math.min(D.STAM_MAX + 40, s + r.sta); q.sta.t = Date.now(); t.push("+" + r.sta + " energy"); }
    return t.join(", ");
  };
  // ---------- stamina ----------
  SQ.sta = function () { var q = SQ.st(), s = q.sta; if (s.v >= D.STAM_MAX) return s.v; var n = Math.floor((Date.now() - s.t) / (D.STAM_SEC * 1000 / mul())); if (n > 0) { s.v = Math.min(D.STAM_MAX, s.v + n); s.t = s.v >= D.STAM_MAX ? Date.now() : s.t + n * D.STAM_SEC * 1000 / mul(); } return s.v; };
  SQ.staNext = function () { var q = SQ.st(); if (SQ.sta() >= D.STAM_MAX) return 0; return Math.max(0, q.sta.t + D.STAM_SEC * 1000 / mul() - Date.now()); };
  SQ.spend = function (n) { var q = SQ.st(), cur = SQ.sta(); if (cur < n) return false; if (cur >= D.STAM_MAX) q.sta.t = Date.now(); q.sta.v = cur - n; return true; };
  // ---------- leveling ----------
  SQ.addXp = function (id, xp) {
    var o = SQ.st().own[id]; if (!o || xp <= 0) return 0; var gained = 0, cap = SQ.cap(o); o.xp += xp;
    while (o.lv < cap && o.xp >= D.xpNeed(o.lv)) { o.xp -= D.xpNeed(o.lv); o.lv++; gained++; }
    if (o.lv >= cap) o.xp = 0; if (gained) SQ.track("levels", gained); return gained;
  };
  SQ.useTonic = function (id, n) { var q = SQ.st(), o = q.own[id]; n = Math.min(n, q.mat.ton); if (!o || n < 1 || o.lv >= SQ.cap(o)) return 0; q.mat.ton -= n; var g = SQ.addXp(id, n * D.TONIC_XP); save(); return g; };
  // ---------- jobs (fusion / evolution / limit-break) ----------
  SQ.settle = function () {
    var q = SQ.st(), now = SQ.now(), done = [], keep = [];
    q.jobs.forEach(function (j) {
      if (j.end > now) { keep.push(j); return; } var o = q.own[j.id]; if (!o) return;
      if (j.k === "fuse") { var g = SQ.addXp(j.id, j.xp); done.push({j: j, txt: D.U[j.id].nm + " fused: +" + j.xp + " XP" + (g ? ", +" + g + " level" + (g > 1 ? "s" : "") : "")}); }
      else if (j.k === "evo") { o.st++; o.xp = 0; done.push({j: j, txt: D.U[j.id].nm + " evolved to " + o.st + " stars!", evo: 1}); }
      else if (j.k === "lb") { o.lb++; done.push({j: j, txt: D.U[j.id].nm + " limit break " + o.lb + "/" + D.LB_MAX}); }
    });
    if (done.length) { q.jobs = keep; save(); } return done;
  };
  SQ.busy = function (id) { return SQ.st().jobs.some(function (j) { return j.id === id; }); };
  SQ.bayFree = function () { return SQ.st().jobs.length < D.BAYS; };
  function mk(k, id, ms, extra) { var q = SQ.st(), j = {k: k, id: id, start: SQ.now(), end: SQ.now() + Math.round(ms / mul())}; for (var x in extra) j[x] = extra[x]; q.jobs.push(j); return j; }
  SQ.fuse = function (id, r, n) {
    var q = SQ.st(), o = q.own[id]; n = Math.min(n, q.mat["p" + r], 10); if (!o || n < 1) return "No spare parts of that rarity"; if (!SQ.bayFree()) return "Both fusion bays are busy"; if (SQ.busy(id)) return "That unit is already in a bay"; if (o.lv >= SQ.cap(o)) return "At the level cap: evolve or limit break";
    q.mat["p" + r] -= n; mk("fuse", id, n * D.FUSE_MIN_PER * 60000, {xp: n * D.PART_XP[r], n: n}); save(); return "";
  };
  SQ.evoCheck = function (id) {
    var q = SQ.st(), o = q.own[id]; if (!o) return "Not owned"; if (o.st >= 5) return "Already 5 stars"; if (o.lv < SQ.cap(o)) return "Needs level " + SQ.cap(o); var e = D.EVO[o.st], el = D.U[id].el;
    if (q.mat["c" + el] + q.mat.cw < e.core) return "Needs " + e.core + " " + D.EL[el].n + " cores (wild cores count)"; if (S.coins < e.coins) return "Needs " + e.coins + " coins"; if (SQ.busy(id)) return "Already in a bay"; if (!SQ.bayFree()) return "Both bays are busy"; return "";
  };
  SQ.evolve = function (id) {
    var msg = SQ.evoCheck(id); if (msg) return msg; var q = SQ.st(), o = q.own[id], e = D.EVO[o.st], el = D.U[id].el, need = e.core, use = Math.min(need, q.mat["c" + el]); q.mat["c" + el] -= use; q.mat.cw -= need - use; S.coins -= e.coins; mk("evo", id, e.h * 3600000); save(); return "";
  };
  SQ.lbCheck = function (id) {
    var q = SQ.st(), o = q.own[id]; if (!o) return "Not owned"; if (o.st < 5) return "Reach 5 stars first"; if (o.lb >= D.LB_MAX) return "Fully limit-broken"; var c = D.lbCost(o.lb); if (o.sh < c.sh) return "Needs " + c.sh + " shards (duplicate pulls give shards)"; if (SQ.busy(id)) return "Already in a bay"; if (!SQ.bayFree()) return "Both bays are busy"; return "";
  };
  SQ.limitBreak = function (id) { var msg = SQ.lbCheck(id); if (msg) return msg; var q = SQ.st(), o = q.own[id], c = D.lbCost(o.lb); o.sh -= c.sh; mk("lb", id, c.h * 3600000); save(); return ""; };
  SQ.speedCost = function (j) { return Math.max(1, Math.ceil((j.end - SQ.now()) / 1800000)); };
  SQ.speedUp = function (i) { var q = SQ.st(), j = q.jobs[i]; if (!j) return "No such job"; var c = SQ.speedCost(j); if (S.gems < c) return "Needs " + c + " gems (play-currency)"; S.gems -= c; j.end = SQ.now() - 1; SQ.settle(); return ""; };
  // ---------- summon (seeded, odds visible) ----------
  SQ.pool = function (r) { return D.ORDER.filter(function (id) { return D.U[id].st === r; }); };
  SQ.odds = function () { var q = SQ.st(), p5 = 0.04, out = []; if (q.pity >= D.PITY_SOFT) p5 = Math.min(1, 0.04 + (q.pity - D.PITY_SOFT + 1) * D.SOFT_ADD); if (q.pity >= D.PITY_HARD - 1) p5 = 1; return {p5: p5, rows: [5, 4, 3].map(function (r) { return {r: r, p: D.RATES[r], each: D.RATES[r] / SQ.pool(r).length, n: SQ.pool(r).length}; })}; };
  function pullRng(i) { var sd = (SQ.st().seed ^ Math.imul(i + 1, 0x9E3779B1)) >>> 0, g = C.rng(sd); return [g(), g(), g()]; }
  SQ.canSummon = function (n) { var q = SQ.st(), c = n === 10 ? D.COST.ten : D.COST.one; return q.tix >= c.tix ? "tix" : S.gems >= c.gem ? "gem" : ""; };
  SQ.summon = function (n) {
    var q = SQ.st(), c = n === 10 ? D.COST.ten : D.COST.one, how = SQ.canSummon(n); if (!how) return null;
    if (how === "tix") q.tix -= c.tix; else S.gems -= c.gem;
    var out = [], got4 = false, i;
    for (i = 0; i < n; i++) {
      var r = pullRng(q.pulls), o = SQ.odds(), st;
      if (r[0] < o.p5) st = 5; else { var rest = (r[0] - o.p5) / (1 - o.p5); st = rest < 0.25 ? 4 : 3; }
      if (n === 10 && i === 9 && !got4 && st < 4) st = 4;
      if (st >= 4) got4 = true; q.pity = st === 5 ? 0 : q.pity + 1;
      var pool = SQ.pool(st), id = pool[Math.floor(r[1] * pool.length) % pool.length], own = q.own[id], isNew = !own;
      if (isNew) q.own[id] = {lv: 1, xp: 0, st: D.U[id].st, lb: 0, sh: 0, nw: 1}; else { own.sh++; q.mat["p" + st]++; }
      q.pulls++; out.push({id: id, st: st, nw: isNew}); q.hist.unshift({id: id, st: st}); 
    }
    q.hist = q.hist.slice(0, 20); SQ.track("summons", 1); SQ.cdxScan(); save(); BB.track("sq_summon", {n: n, how: how, pity: q.pity, pulls: q.pulls}); return out;
  };
  // ---------- team ----------
  SQ.setSlot = function (slot, id) { var q = SQ.st(), i = q.team.indexOf(id); if (id && i >= 0) q.team[i] = q.team[slot]; q.team[slot] = id; save(); };
  SQ.toTeam = function (id) { var q = SQ.st(); if (q.team.indexOf(id) >= 0) return; var s = q.team.indexOf(""); if (s < 0) s = 5; q.team[s] = id; save(); };
  SQ.leave = function (id) { var q = SQ.st(), i = q.team.indexOf(id); if (i >= 0) { q.team[i] = ""; save(); } };
  SQ.makeLeader = function (id) { var q = SQ.st(), i = q.team.indexOf(id); if (i < 0) { q.team[0] = id; } else { var t = q.team[0]; q.team[0] = id; q.team[i] = t; } save(); };
  // ---------- trials ----------
  SQ.trialBase = function (tr) {
    var T = D.TIER[tr.tier], fh = Math.min(T.fh, C.CORE_MAX), b = JSON.parse(JSON.stringify(BB.CCGen.poolBase(fh, (tr.el * 3 + tr.tier * 2) % 15)));
    b.el = tr.el; b.name = tr.nm; b.tw = 0; b.tl = 0; return b;
  };
  SQ.trialReq = function (tr) { var T = D.TIER[tr.tier]; return X().coreL() >= T.fh ? "" : "Needs Homestead Core L" + T.fh; };
  SQ.trialRewards = function (tr, stars) {
    var q = SQ.st(), T = D.TIER[tr.tier], first = !q.clr[tr.id], t = [], xpEach = 150 * (tr.tier + 1) * (1 + stars);
    if (first) { var r = {tix: T.tix + (stars >= 3 ? 1 : 0), gem: T.gem, core: T.core, cel: tr.el, ton: T.ton}; t.push("FIRST CLEAR: " + SQ.grant(r)); }
    else { var rr = {ton: tr.tier + 1}; if (tr.tier >= 1) { rr.core = 1; rr.cel = tr.el; } t.push(SQ.grant(rr)); }
    if (stars > (q.clr[tr.id] || 0)) q.clr[tr.id] = stars; var lv = 0; SQ.teamIds().forEach(function (id) { lv += SQ.addXp(id, xpEach); }); t.push("Squad +" + xpEach + " XP each" + (lv ? " (" + lv + " level up" + (lv > 1 ? "s" : "") + ")" : ""));
    return {first: first, txt: t.join(". ")};
  };
  SQ.trialStart = function (id) {
    var tr = D.trials[id], T = D.TIER[tr.tier], req = SQ.trialReq(tr); if (req) return req; if (SQ.sta() < T.stam) return "Not enough energy: " + SQ.sta() + "/" + T.stam;
    var cc = X().cc(), has = false; for (var k in cc.army) if (cc.army[k] > 0) has = true; if (!has && cc.heroHp <= 0.2) return "Train some troops first (ARMY tab)";
    X().startScout(SQ.trialBase(tr), "trial", id + 1); return "";
  };
  SQ.trialGo = function (mi) { var tr = D.trials[mi - 1], T = D.TIER[tr.tier]; if (!SQ.spend(T.stam)) return false; save(); return true; };
  SQ.onTrialEnd = function (mi, stars) { var tr = D.trials[mi - 1]; if (stars < 1) return {first: false, txt: "No clear: energy spent. Try the element that beats " + D.EL[tr.el].n + "."}; SQ.track("trials", 1); SQ.st().stats.trials++; var r = SQ.trialRewards(tr, stars); SQ.cdxScan(); return r; };
  // ---------- missions ----------
  SQ.roll = function () {
    var q = SQ.st(), dk = dayKey(), wk = weekKey(); if (q.ms.d.k !== dk) q.ms.d = {k: dk, p: {}, c: {}, all: 0}; if (q.ms.w.k !== wk) q.ms.w = {k: wk, p: {}, c: {}, all: 0}; return q.ms;
  };
  SQ.track = function (k, n) { var ms = SQ.roll(); n = n || 1; ms.d.p[k] = (ms.d.p[k] || 0) + n; ms.w.p[k] = (ms.w.p[k] || 0) + n; };
  SQ.claimMission = function (kind, i) {
    var ms = SQ.roll(), blk = kind === "d" ? ms.d : ms.w, def = (kind === "d" ? D.DAILY : D.WEEKLY)[i]; if (!def || blk.c[i] || (blk.p[def.k] || 0) < def.g) return ""; blk.c[i] = 1; var t = SQ.grant(def.r); save(); return t;
  };
  SQ.claimAll = function (kind) {
    var ms = SQ.roll(), blk = kind === "d" ? ms.d : ms.w, defs = kind === "d" ? D.DAILY : D.WEEKLY; if (blk.all) return ""; for (var i = 0; i < defs.length; i++) if (!blk.c[i]) return ""; blk.all = 1; var t = SQ.grant(kind === "d" ? D.DAILY_ALL : D.WEEKLY_ALL); save(); return t;
  };
  SQ.missionsReady = function () { var ms = SQ.roll(), n = 0; [["d", D.DAILY], ["w", D.WEEKLY]].forEach(function (a) { var blk = ms[a[0]]; a[1].forEach(function (d, i) { if (!blk.c[i] && (blk.p[d.k] || 0) >= d.g) n++; }); }); return n; };
  // ---------- codex ----------
  SQ.owned = function () { var q = SQ.st(); return D.ORDER.filter(function (id) { return q.own[id]; }).length; };
  SQ.cdxScan = function () { };
  SQ.cdxClaims = function () {
    var q = SQ.st(), n = SQ.owned(), out = [];
    D.CODEX_N.forEach(function (m, i) { out.push({k: "n" + i, ok: n >= m.n, done: !!q.cdx.n[i], txt: "Own " + m.n + " units", r: m.r, i: i, t: "n"}); });
    D.EL.forEach(function (e, i) { var all = D.ORDER.filter(function (id) { return D.U[id].el === i; }), have = all.filter(function (id) { return q.own[id]; }).length; out.push({k: "e" + i, ok: have === all.length, done: !!q.cdx.e[i], txt: "Complete the " + e.n + " set (" + have + "/" + all.length + ")", r: D.CODEX_EL, i: i, t: "e"}); });
    return out;
  };
  SQ.cdxClaim = function (t, i) { var q = SQ.st(), o = SQ.cdxClaims().filter(function (c) { return c.t === t && c.i === i; })[0]; if (!o || !o.ok || o.done) return ""; q.cdx[t][i] = 1; var txt = SQ.grant(o.r); save(); return txt; };
  SQ.cdxReady = function () { return SQ.cdxClaims().filter(function (c) { return c.ok && !c.done; }).length; };
  // ---------- raid hooks ----------
  SQ.onBurst = function (e) { var q = SQ.st(); q.stats.bursts++; q.stats.best = Math.max(q.stats.best, e.n); SQ.track("bursts", 1); if (e.n >= 4) SQ.track("chain4", 1); };
  SQ.onRaidWin = function () { SQ.track("raids", 1); };
  SQ.badge = function () { var q = SQ.st(), n = SQ.missionsReady() + SQ.cdxReady(); if (SQ.sta() >= D.STAM_MAX) n++; if (q.tix >= 1 && q.pulls < 10) n++; return n; };
  // auto-battle helper: used by the AUTO+ driver. Fires a ready unit when a chain is live, when 2+ are ready, or when one has waited > 6s.
  SQ.autoBurst = function (r) {
    var s = r.sim; if (!s || !s.sq || !s.started) return false; var rd = [], i; for (i = 0; i < s.sq.length; i++) if (s.sqReady(i)) rd.push(i);
    if (!rd.length) { r._rt = 0; return false; } if (!r._rt) r._rt = s.t;
    var live = s.bch.n > 0 && s.t - s.bch.last <= 2.2; if (!(live || rd.length >= 2 || s.t - r._rt > 6)) return false;
    var pick = rd[0], bs = -1; rd.forEach(function (k) { var q = s.sq[k], sc = q.pw + (live && !((s.bch.els >> q.bt) & 1) ? 1 : 0); if (sc > bs) { bs = sc; pick = k; } });
    return X().rAct({k: "sqb", i: pick});
  };
  // Farm Defense Run hook (side-scroller prototype is built separately; its special move will reuse the squad burst data)
  // ---------- Farm Defense Run: energy cost, daily limits and capped loot (additive save field q.run only) ----------
  D.RUN = {cost: 12, daily: 3, perRun: 900, dayCoins: 1800, dayShards: 3};
  function dayKey() { var d = new Date(SQ.now()); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  SQ.runSt = function () { var q = SQ.st(), k = dayKey(); if (!q.run) q.run = {day: "", n: 0, coins: 0, sh: 0, tix: 0, tot: 0, best: 0, pend: 0}; if (q.run.day !== k) { q.run.day = k; q.run.n = 0; q.run.coins = 0; q.run.sh = 0; q.run.tix = 0; q.run.pend = 0; } return q.run; };
  SQ.runLeft = function () { return Math.max(0, D.RUN.daily - SQ.runSt().n); };
  SQ.runStart = function () { var r = SQ.runSt(); if (r.n >= D.RUN.daily) return "Daily run limit reached (" + D.RUN.daily + "/" + D.RUN.daily + "). Come back tomorrow."; if (!SQ.spend(D.RUN.cost)) return "Not enough energy: a run costs " + D.RUN.cost + "."; r.n++; r.pend = 1; save(); return ""; };
  SQ.runReward = function (d) {
    var r = SQ.runSt(), q = SQ.st(); if (!r.pend || !d) return ""; r.pend = 0;
    var cl = function (v, a, b) { v = +v || 0; return Math.max(a, Math.min(b, v | 0)); }, win = !!d.win, rank = {S: 1, A: 1, B: 1, C: 1}[d.rank] ? d.rank : "C", score = cl(d.score, 0, 40000), resc = cl(d.rescues, 0, 8), kills = cl(d.kills, 0, 80);
    var base = Math.round(score / 50) + resc * 25 + kills * 2; if (win) base += 120 + {S: 160, A: 90, B: 40, C: 0}[rank]; else base = Math.floor(base * 0.5);
    var coins = Math.max(0, Math.min(base, D.RUN.perRun, D.RUN.dayCoins - r.coins)), ton = win ? (rank === "S" || rank === "A" ? 2 : 1) : 0, tix = win && r.tix < 1 ? 1 : 0, id = q.team.filter(function (t) { return t && q.own[t]; })[0], sh = 0;
    if (id && win) sh = Math.max(0, Math.min(rank === "S" ? 2 : 1, D.RUN.dayShards - r.sh));
    var txt = SQ.grant({coins: coins, ton: ton, tix: tix}); if (sh) { q.own[id].sh += sh; txt += (txt ? ", " : "") + "+" + sh + " " + D.U[id].nm + " shard" + (sh > 1 ? "s" : ""); }
    r.coins += coins; r.sh += sh; r.tix += tix; r.tot += 1; r.best = Math.max(r.best || 0, score); save(); return txt || (r.coins >= D.RUN.dayCoins ? "no loot (daily caps reached)" : "no loot this run. Rescue animals and clear aliens to earn some");
  };
  SQ.hooks = {farmRun: {status: "live", page: "run.html", burstPack: function () { return SQ.pack({seed: 0}); }}};
})();
