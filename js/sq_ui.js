"use strict";
// ---- v0.8 Squad hub UI (team builder, summon, trials, missions, codex, fusion) + raid squad bar. Original UI, no external assets beyond the generated sq art. ----
(function () {
  var UI = (BB.SQUI = {}), SQ = BB.SQ, D = BB.SQD, CUT = BB.CUT, S = BB.S, root, tab = "squad", sel = "", selTrial = -1, msg = "", tick = 0;
  function X() { return BB.CCUI; }
  function $(id) { return document.getElementById(id); }
  function sfx(n, a) { BB.sfx && BB.sfx(n, a); }
  function vib(p) { BB.vibe && BB.vibe(p); }
  function el(i) { return D.EL[i]; }
  function pill(i) { return '<i class="sq-el" style="background:' + el(i).col + '"></i>'; }
  function wheelSvg() {
    var pts = [], i, cx = 50, cy = 50, r = 38, s = '<svg class="sq-wheel" viewBox="0 0 100 100" aria-label="Element wheel: ' + D.WHEEL + '">';
    for (i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    for (i = 0; i < 5; i++) { var p = pts[i], q = pts[(i + 1) % 5], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L; s += '<line x1="' + (p[0] + ux * 10) + '" y1="' + (p[1] + uy * 10) + '" x2="' + (q[0] - ux * 11) + '" y2="' + (q[1] - uy * 11) + '" stroke="#e8b14a" stroke-width="2"/><path d="M' + (q[0] - ux * 10) + "," + (q[1] - uy * 10) + " l" + (-ux * 5 - uy * 3) + "," + (-uy * 5 + ux * 3) + " l" + (uy * 6) + "," + (-ux * 6) + 'z" fill="#e8b14a"/>'; }
    for (i = 0; i < 5; i++) s += '<circle cx="' + pts[i][0] + '" cy="' + pts[i][1] + '" r="9" fill="' + el(i).col + '" stroke="#0e1330" stroke-width="2"/><text x="' + pts[i][0] + '" y="' + (pts[i][1] + 3) + '" text-anchor="middle" font-size="7" font-weight="900" fill="#0e1330">' + el(i).n.slice(0, 3).toUpperCase() + "</text>";
    return s + "</svg>";
  }
  function fmtT(ms) { var s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h >= 24 ? Math.floor(h / 24) + "d " + (h % 24) + "h" : h ? h + "h " + m + "m" : m + "m " + (s % 60) + "s"; }
  function build() {
    if (root) return; root = document.createElement("div"); root.id = "sq"; root.className = "hidden"; (document.getElementById("app") || document.body).appendChild(root);
    root.addEventListener("click", function (e) { var t = e.target.closest("[data-a]"); if (!t || t.disabled) return; act(t.dataset.a, t.dataset.b, t.dataset.c); });
  }
  UI.open = function (t) { build(); SQ.st(); SQ.settle(); if (t) tab = t; root.classList.remove("hidden"); sfx("click"); draw(); clearInterval(tick); tick = setInterval(timers, 1000); if (BB.FX) BB.FX.clearAll && 0; };
  UI.close = function () { if (!root) return; root.classList.add("hidden"); clearInterval(tick); X().refresh && X().refresh(); X().hud && X().hud(); };
  UI.isOpen = function () { return !!root && !root.classList.contains("hidden"); };
  UI.tab = function (t) { tab = t; sel = ""; msg = ""; draw(); };
  function timers() {
    if (!UI.isOpen()) return; var done = SQ.settle(); if (done.length) { msg = done.map(function (d) { return d.txt; }).join(". "); sfx("stingwin"); draw(); return; }
    [].forEach.call(root.querySelectorAll("[data-end]"), function (n) { n.textContent = fmtT(+n.dataset.end - SQ.now()); });
    var sn = $("sq-stn"); if (sn) sn.textContent = SQ.sta() + "/" + D.STAM_MAX; var sx = $("sq-stx"); if (sx) { var nx = SQ.staNext(); sx.textContent = nx ? "next +1 in " + fmtT(nx) : "full"; }
  }
  function head() {
    var q = SQ.st(), tabs = [["squad", "SQUAD"], ["summon", "SUMMON"], ["trials", "TRIALS"], ["missions", "MISSIONS"], ["codex", "CODEX"], ["run", "RUN"]], b = "";
    var badge = {missions: SQ.missionsReady(), codex: SQ.cdxReady(), summon: q.tix >= 1 ? 1 : 0, trials: SQ.sta() >= D.STAM_MAX ? 1 : 0};
    tabs.forEach(function (t) { b += '<button class="sq-tab' + (tab === t[0] ? " on" : "") + (t[0] === "run" ? " soon" : "") + '" data-a="tab" data-b="' + t[0] + '">' + t[1] + (t[0] === "run" ? "<small>soon</small>" : "") + (badge[t[0]] ? '<em class="sq-dot"></em>' : "") + "</button>"; });
    return '<div class="sq-top"><b class="sq-title">SQUAD HQ</b><span class="sq-chip" title="Summon tickets"><img src="assets/ui_star.webp" alt="">' + q.tix + '</span><span class="sq-chip"><i class="ico gem"></i>' + S.gems + '</span><span class="sq-chip"><span class="bolt">&#9889;</span><b id="sq-stn">' + SQ.sta() + "/" + D.STAM_MAX + '</b></span><button class="sq-x" data-a="close" aria-label="Close">&times;</button></div><div class="sq-tabs">' + b + "</div>";
  }
  function draw() {
    var h = head(), body = tab === "squad" ? squadTab() : tab === "summon" ? summonTab() : tab === "trials" ? trialsTab() : tab === "missions" ? missionsTab() : tab === "codex" ? codexTab() : runTab();
    root.innerHTML = h + '<div class="sq-body" id="sq-body">' + (msg ? '<div class="sq-msg">' + msg + "</div>" : "") + body + "</div>" + (sel && tab === "squad" ? sheet(sel) : "") + '<div class="sq-foot">Prototype: tickets, gems and energy are earned in play. No real-money purchases exist.</div>';
    var b = $("sq-body"); if (b && UI._sc !== undefined && UI._sct === tab) b.scrollTop = UI._sc; UI._sct = tab;
  }
  function art(id, cls) { var u = D.U[id]; return '<div class="' + (cls || "sq-th") + '" style="background-image:url(' + u.art + ')"></div>'; }
  function stars(n) { return CUT.stars(n); }
  // ---------- SQUAD tab ----------
  function squadTab() {
    var q = SQ.st(), h = "", i, ids = SQ.teamIds(), lead = SQ.lead(), pw = 0; ids.forEach(function (id) { pw += SQ.power(id); });
    h += '<div class="sq-sec"><h3>TEAM <small>6 slots &middot; slot 1 is the Leader</small></h3><div class="sq-team">';
    for (i = 0; i < 6; i++) { var id = q.team[i], o = id && q.own[id]; h += o ? '<button class="sq-slot' + (i === 0 ? " lead" : "") + '" style="--ec:' + el(D.U[id].el).col + '" data-a="sel" data-b="' + id + '">' + art(id, "sq-sa") + (i === 0 ? '<span class="crown">LEADER</span>' : "") + "<b>" + D.U[id].nm + "</b><small>Lv " + o.lv + " &middot; " + o.st + "&#9733;</small></button>" : '<button class="sq-slot empty" data-a="pick" data-b="' + i + '"><span>+</span><small>Slot ' + (i + 1) + "</small></button>"; }
    h += '</div><div class="sq-lead">' + (lead ? "<b>Leader skill: " + lead.ls.n + "</b> " + D.leadText(lead.ls) : "Pick a Leader") + '</div><div class="sq-row"><div>' + wheelSvg() + '</div><div class="sq-wtxt"><b>Element wheel</b><br>' + D.WHEEL + "<br><small>Each element deals x1.5 burst damage to the next one and x0.7 to the one before. Every base has an element; the scout card shows it.</small><br><b>Team power " + pw + "</b></div></div></div>";
    h += '<div class="sq-sec"><h3>ROSTER <small>' + SQ.owned() + "/" + D.ORDER.length + " collected &middot; tap a unit</small></h3><div class=\"sq-grid\">";
    D.ORDER.forEach(function (id) { var o = q.own[id], u = D.U[id], intm = q.team.indexOf(id) >= 0; h += o ? '<button class="sq-card' + (intm ? " in" : "") + '" style="--ec:' + el(u.el).col + '" data-a="sel" data-b="' + id + '">' + art(id) + (o.nw ? '<em class="sq-new">NEW</em>' : "") + '<span class="sq-st">' + stars(o.st) + "</span><b>Lv " + o.lv + "</b>" + (SQ.busy(id) ? '<u>BAY</u>' : "") + "</button>" : '<div class="sq-card lock"><div class="sq-th"></div><b>?</b></div>'; });
    h += "</div></div>"; h += baysHtml(); return h;
  }
  function baysHtml() {
    var q = SQ.st(), h = '<div class="sq-sec"><h3>FUSION BAYS <small>' + q.jobs.length + "/" + D.BAYS + " in use &middot; timers run while the game is closed</small></h3>";
    if (!q.jobs.length) h += '<div class="sq-empty">Both bays are free. Fuse spare parts, evolve, or limit break from a unit sheet.</div>';
    q.jobs.forEach(function (j, i) { h += '<div class="sq-job">' + art(j.id, "sq-jt") + "<div><b>" + D.U[j.id].nm + "</b><small>" + (j.k === "fuse" ? "Fusing " + j.n + " parts (+" + j.xp + " XP)" : j.k === "evo" ? "Evolving" : "Limit break") + '</small></div><span class="tm" data-end="' + j.end + '">' + fmtT(j.end - SQ.now()) + '</span><button class="btn sec sm" data-a="speed" data-b="' + i + '">Speed up <small>' + SQ.speedCost(j) + " gems</small></button></div>"; });
    return h + "</div>";
  }
  function sheet(id) {
    var q = SQ.st(), o = q.own[id], u = D.U[id], cap = SQ.cap(o), need = D.xpNeed(o.lv), intm = q.team.indexOf(id) >= 0, h, E = el(u.el), m = q.mat;
    var evo = o.st < 5 ? D.EVO[o.st] : null, evMsg = o.st < 5 ? SQ.evoCheck(id) : "Max stars", lbMsg = SQ.lbCheck(id), lbc = o.lb < D.LB_MAX ? D.lbCost(o.lb) : null;
    h = '<div class="sq-sheet" style="--ec:' + E.col + '"><button class="sq-x sh" data-a="unsel" aria-label="Close">&times;</button><div class="sq-sh-top">' + art(id, "sq-big") + "<div><b class=\"sq-nm\">" + u.nm + "</b><div class=\"sq-st big\">" + stars(o.st) + "</div><div>" + pill(u.el) + E.n + " &middot; " + u.role + "</div><div>Lv <b>" + o.lv + "</b>/" + cap + " &middot; Limit Break " + o.lb + "/" + D.LB_MAX + '</div><div class="sq-bar"><i style="width:' + (o.lv >= cap ? 100 : Math.round(o.xp / need * 100)) + '%"></i></div><small>' + (o.lv >= cap ? "At cap" : o.xp + "/" + need + " XP") + " &middot; Burst power " + SQ.pw(id).toFixed(2) + "</small></div></div>";
    h += '<div class="sq-info"><b>Leader skill: ' + u.ls.n + "</b> " + D.leadText(u.ls) + "<br><b>Burst: " + u.bn + "</b> " + D.burstText(u.el) + " &middot; charge rate x" + u.cr.toFixed(1) + "</div>";
    h += '<div class="sq-btns">' + (intm ? '<button class="btn sec sm" data-a="leave" data-b="' + id + '">REMOVE</button>' : '<button class="btn sm" data-a="join" data-b="' + id + '">ADD TO TEAM</button>') + '<button class="btn sec sm" data-a="lead" data-b="' + id + '">MAKE LEADER</button></div>';
    h += '<div class="sq-mats">Tonics ' + m.ton + " &middot; Parts 3&#9733;" + m.p3 + " 4&#9733;" + m.p4 + " 5&#9733;" + m.p5 + " &middot; " + E.n + " cores " + m["c" + u.el] + " (+" + m.cw + " wild) &middot; Shards " + o.sh + "</div>";
    h += '<div class="sq-btns"><button class="btn sm" data-a="tonic" data-b="' + id + '" data-c="1"' + (m.ton < 1 || o.lv >= cap ? " disabled" : "") + '>TONIC x1</button><button class="btn sm" data-a="tonic" data-b="' + id + '" data-c="5"' + (m.ton < 1 || o.lv >= cap ? " disabled" : "") + ">TONIC x5</button></div>";
    h += '<div class="sq-btns">'; [3, 4, 5].forEach(function (r) { h += '<button class="btn sec sm" data-a="fuse" data-b="' + id + '" data-c="' + r + '"' + (m["p" + r] < 1 ? " disabled" : "") + ">FUSE " + r + "&#9733; parts<small>" + Math.min(10, m["p" + r]) + " of " + m["p" + r] + " &middot; " + D.PART_XP[r] + " XP each</small></button>"; }); h += "</div>";
    h += '<div class="sq-btns"><button class="btn sm" data-a="evo" data-b="' + id + '"' + (evMsg ? " disabled" : "") + ">EVOLVE" + (evo ? "<small>" + evo.core + " cores, " + evo.coins + "c, " + evo.h + "h</small>" : "<small>maxed</small>") + '</button><button class="btn sm" data-a="lb" data-b="' + id + '"' + (lbMsg ? " disabled" : "") + ">LIMIT BREAK" + (lbc ? "<small>" + lbc.sh + " shards, " + lbc.h + "h</small>" : "<small>maxed</small>") + "</button></div>";
    h += '<div class="sq-why">' + (evMsg && o.st < 5 ? "Evolve: " + evMsg + ". " : "") + (lbMsg ? "Limit break: " + lbMsg : "") + "</div></div>";
    return h;
  }
  // ---------- SUMMON tab ----------
  function summonTab() {
    var q = SQ.st(), o = SQ.odds(), h = '<div class="sq-sec sq-ban"><div class="sq-banner" style="background-image:url(assets/sq/cut_scx.webp)"><b>MUSTER CALL</b><small>Standard banner &middot; every unit, always</small></div>';
    var left = Math.max(0, D.PITY_HARD - q.pity);
    h += '<div class="sq-pity"><div class="sq-bar pity"><i style="width:' + Math.min(100, q.pity / D.PITY_HARD * 100) + '%"></i><span style="left:' + D.PITY_SOFT / D.PITY_HARD * 100 + '%"></span></div><b>Pity ' + q.pity + "/" + D.PITY_HARD + "</b> &middot; a 5&#9733; is guaranteed within " + left + " pull" + (left === 1 ? "" : "s") + ". Rate boost starts at " + D.PITY_SOFT + " (+" + Math.round(D.SOFT_ADD * 100) + "% per pull).</div>";
    h += '<table class="sq-odds"><tr><th>Rarity</th><th>Chance</th><th>Pool</th><th>Each</th></tr>';
    o.rows.forEach(function (r) { var names = SQ.pool(r.r).map(function (id) { return D.U[id].nm; }).join(", "); h += "<tr><td>" + r.r + "&#9733;</td><td>" + (r.r === 5 ? (o.p5 * 100).toFixed(1) : (r.p * 100).toFixed(0)) + "%</td><td>" + r.n + " units</td><td>" + (r.each * 100).toFixed(1) + "%</td></tr>"; });
    h += "</table><small>Current 5&#9733; chance: <b>" + (o.p5 * 100).toFixed(1) + "%</b>. The 10-summon guarantees at least one 4&#9733;+. Duplicates give a shard (for limit break) and a spare part (for fusion).</small>";
    h += '<div class="sq-seed">Seed <b>' + (q.seed >>> 0).toString(16).toUpperCase() + "</b> &middot; next pull #" + (q.pulls + 1) + ": results come from this seed and the pull number only, so they are fixed and reproducible.</div>";
    var c1 = SQ.canSummon(1), c10 = SQ.canSummon(10);
    h += '<div class="sq-btns big"><button class="btn" data-a="summon" data-b="1"' + (c1 ? "" : " disabled") + ">SUMMON x1<small>" + (q.tix >= 1 ? "1 ticket" : "25 gems") + '</small></button><button class="btn" data-a="summon" data-b="10"' + (c10 ? "" : " disabled") + ">SUMMON x10<small>" + (q.tix >= 10 ? "10 tickets" : "225 gems") + "</small></button></div>";
    h += '<div class="sq-have">Tickets <b>' + q.tix + "</b> &middot; Gems <b>" + S.gems + "</b> (play-currency only; earn more in trials, missions and raids)</div>";
    if (q.hist.length) { h += '<h3>RECENT</h3><div class="sq-hist">'; q.hist.slice(0, 10).forEach(function (r) { h += '<span class="s' + r.st + '" title="' + D.U[r.id].nm + '">' + art(r.id, "sq-hh") + "</span>"; }); h += "</div>"; }
    return h + "</div>";
  }
  // ---------- TRIALS tab ----------
  function trialsTab() {
    var q = SQ.st(), h = '<div class="sq-sec"><h3>ENERGY <small>spent when you press ATTACK</small></h3><div class="sq-en"><div class="sq-bar en"><i style="width:' + Math.round(SQ.sta() / D.STAM_MAX * 100) + '%"></i></div><b>&#9889; ' + SQ.sta() + "/" + D.STAM_MAX + '</b> <small id="sq-stx">' + (SQ.staNext() ? "next +1 in " + fmtT(SQ.staNext()) : "full") + "</small></div></div>";
    h += '<div class="sq-sec"><h3>TRIALS <small>first clear pays tickets, gems, cores, tonics &middot; defenders use one element</small></h3>';
    for (var e = 0; e < 5; e++) {
      var best = (e + 4) % 5; h += '<div class="sq-trow" style="--ec:' + el(e).col + '"><div class="sq-th2">' + pill(e) + "<b>" + el(e).n + '</b><small>bring ' + el(best).n + "</small></div><div class=\"sq-tiers\">";
      for (var t = 0; t < 4; t++) { var id = e * 4 + t, tr = D.trials[id], T = D.TIER[t], s = q.clr[id] || 0, lock = SQ.trialReq(tr); h += '<button class="sq-tier' + (selTrial === id ? " on" : "") + (lock ? " lock" : "") + '" data-a="trial" data-b="' + id + '"><b>' + T.r + "</b><span>" + [1, 2, 3].map(function (x) { return x <= s ? "&#9733;" : "&#9734;"; }).join("") + "</span><small>&#9889;" + T.stam + "</small></button>"; }
      h += "</div></div>";
    }
    h += "</div>";
    if (selTrial >= 0) {
      var tr = D.trials[selTrial], T = D.TIER[tr.tier], lock = SQ.trialReq(tr), first = !q.clr[tr.id];
      h += '<div class="sq-sec sq-tsel" style="--ec:' + el(tr.el).col + '"><h3>' + tr.nm + '</h3><div>Defenders: ' + pill(tr.el) + el(tr.el).n + " (best attacker: " + el((tr.el + 4) % 5).n + "). Energy " + T.stam + "." + (lock ? " <b class=\"bad\">" + lock + "</b>" : "") + "</div><div>" + (first ? "First clear: <b>" + T.tix + "+ tickets, " + T.gem + " gems, " + T.core + " " + el(tr.el).n + " cores, " + T.ton + " tonics</b> (+1 ticket for 3 stars)" : "Repeat reward: " + (tr.tier + 1) + " tonics" + (tr.tier ? " + 1 core" : "")) + "</div><div>Team XP is earned on any clear. Trials do not change trophies.</div>" + '<button class="btn" data-a="trialgo" data-b="' + tr.id + '"' + (lock || SQ.sta() < T.stam ? " disabled" : "") + ">START TRIAL</button></div>";
    }
    return h;
  }
  // ---------- MISSIONS tab ----------
  function mBlock(kind, title, defs, all, ms) {
    var blk = kind === "d" ? ms.d : ms.w, h = '<div class="sq-sec"><h3>' + title + " <small>" + resetTxt(kind) + "</small></h3>", allDone = true;
    defs.forEach(function (d, i) { var p = Math.min(d.g, blk.p[d.k] || 0), ok = p >= d.g, c = blk.c[i]; if (!c) allDone = false; h += '<div class="sq-ms' + (c ? " done" : "") + '"><div><b>' + d.n + '</b><div class="sq-bar"><i style="width:' + Math.round(p / d.g * 100) + '%"></i></div><small>' + p + "/" + d.g + " &middot; " + rewTxt(d.r) + '</small></div><button class="btn sm" data-a="mclaim" data-b="' + kind + '" data-c="' + i + '"' + (ok && !c ? "" : " disabled") + ">" + (c ? "DONE" : "CLAIM") + "</button></div>"; });
    h += '<div class="sq-ms bonus' + (blk.all ? " done" : "") + '"><div><b>All complete bonus</b><small>' + rewTxt(all) + '</small></div><button class="btn sm" data-a="mall" data-b="' + kind + '"' + (allDone && !blk.all ? "" : " disabled") + ">" + (blk.all ? "DONE" : "CLAIM") + "</button></div></div>"; return h;
  }
  function rewTxt(r) { var t = []; if (r.tix) t.push(r.tix + " ticket" + (r.tix > 1 ? "s" : "")); if (r.gem) t.push(r.gem + " gems"); if (r.coins) t.push(r.coins + " coins"); if (r.ton) t.push(r.ton + " tonics"); if (r.core) t.push(r.core + " cores"); if (r.sta) t.push(r.sta + " energy"); return t.join(", "); }
  function resetTxt(kind) { var n = new Date(SQ.now()), r; if (kind === "d") { r = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n; } else { r = new Date(n.getFullYear(), n.getMonth(), n.getDate() + ((8 - n.getDay()) % 7 || 7)) - n; } return "resets in " + fmtT(r); }
  function missionsTab() { var ms = SQ.roll(); return mBlock("d", "DAILY MISSIONS", D.DAILY, D.DAILY_ALL, ms) + mBlock("w", "WEEKLY MISSIONS", D.WEEKLY, D.WEEKLY_ALL, ms); }
  // ---------- CODEX tab ----------
  function codexTab() {
    var q = SQ.st(), h = '<div class="sq-sec"><h3>UNIT CODEX <small>' + SQ.owned() + "/" + D.ORDER.length + " discovered</small></h3>";
    SQ.cdxClaims().forEach(function (c) { h += '<div class="sq-ms' + (c.done ? " done" : "") + '"><div><b>' + c.txt + "</b><small>" + rewTxt(c.r) + '</small></div><button class="btn sm" data-a="cdx" data-b="' + c.t + '" data-c="' + c.i + '"' + (c.ok && !c.done ? "" : " disabled") + ">" + (c.done ? "DONE" : c.ok ? "CLAIM" : "LOCKED") + "</button></div>"; });
    h += "</div>";
    for (var e = 0; e < 5; e++) { h += '<div class="sq-sec"><h3>' + pill(e) + el(e).n + "</h3><div class=\"sq-grid\">"; D.ORDER.filter(function (id) { return D.U[id].el === e; }).forEach(function (id) { var o = q.own[id], u = D.U[id]; h += o ? '<div class="sq-card" style="--ec:' + el(e).col + '">' + art(id) + '<span class="sq-st">' + stars(o.st) + "</span><b>" + u.nm + "</b></div>" : '<div class="sq-card lock"><div class="sq-th"></div><b>' + u.st + "&#9733; ???</b></div>"; }); h += "</div></div>"; }
    return h;
  }
  function runTab() {
    return '<div class="sq-sec sq-run"><div class="sq-banner" style="background-image:url(assets/sq/cut_scx.webp)"><b>FARM DEFENSE RUN</b><small>COMING SOON</small></div><p>A side-scrolling action mode is being prototyped separately. When it arrives, your squad&#39;s <b>burst</b> will be the special move you trigger mid-run, using the same element wheel, charge meters and leader skills you set up here.</p><p><small>Nothing in this build depends on it. Your team, roster and progress are already saved and will carry over.</small></p><button class="btn sec" disabled>COMING SOON</button></div>';
  }
  // ---------- actions ----------
  function say(t) { msg = t || ""; draw(); }
  function act(a, b, c) {
    var o;
    if (a === "close") return UI.close(); if (a === "tab") { sfx("click"); return UI.tab(b); }
    if (a === "sel") { sel = b; var ob = SQ.st().own[b]; if (ob) ob.nw = 0; sfx("click"); return draw(); } if (a === "unsel") { sel = ""; msg = ""; return draw(); }
    if (a === "pick") { var q = SQ.st(), free = D.ORDER.filter(function (id) { return q.own[id] && q.team.indexOf(id) < 0; })[0]; if (!free) return say("Every unit you own is already on the team"); SQ.setSlot(+b, free); sfx("click"); return draw(); }
    if (a === "join") { var q2 = SQ.st(); if (q2.team.indexOf(b) < 0 && q2.team.indexOf("") < 0 && q2.team.filter(Boolean).length >= 6) return say("Team is full: remove a unit first"); SQ.toTeam(b); sfx("click"); return say("Added to the team"); }
    if (a === "leave") { if (SQ.teamIds().length <= 1) return say("Keep at least one unit on the team"); SQ.leave(b); sel = ""; return draw(); }
    if (a === "lead") { SQ.makeLeader(b); sfx("coin"); return say("Leader set: " + D.U[b].ls.n); }
    if (a === "tonic") { var g = SQ.useTonic(b, +c); sfx(g ? "lvl" : "click"); return say(g ? "Level up x" + g : "Tonic used"); }
    if (a === "fuse") { var m = SQ.fuse(b, +c, 10); if (!m) sfx("click"); return say(m || "Fusion started: check the bays"); }
    if (a === "evo") { var m2 = SQ.evolve(b); return say(m2 || "Evolution started: it takes a while"); }
    if (a === "lb") { var m3 = SQ.limitBreak(b); return say(m3 || "Limit break started"); }
    if (a === "speed") { var m4 = SQ.speedUp(+b); sfx(m4 ? "deny" : "coin"); return say(m4 || "Done!"); }
    if (a === "summon") {
      var res = SQ.summon(+b); if (!res) return say("Not enough tickets or gems"); X().save && X().save(); var r2 = res; msg = ""; UI._sc = 0; CUT.reveal(r2, function () { tab = "summon"; draw(); X().hud && X().hud(); }); return;
    }
    if (a === "trial") { selTrial = selTrial === +b ? -1 : +b; sfx("click"); return draw(); }
    if (a === "trialgo") { var e2 = SQ.trialStart(+b); if (e2) return say(e2); UI.close(); return; }
    if (a === "mclaim") { var t = SQ.claimMission(b, +c); sfx("coin"); X().hud && X().hud(); return say("Claimed: " + t); }
    if (a === "mall") { var t2 = SQ.claimAll(b); sfx("fanfare"); X().hud && X().hud(); return say("Bonus claimed: " + t2); }
    if (a === "cdx") { var t3 = SQ.cdxClaim(b, +c); sfx("fanfare"); X().hud && X().hud(); return say("Codex reward: " + t3); }
  }
  // ---------- raid: squad bar + auto toggle + burst events ----------
  var bar, lastSig = "";
  function mkBar() {
    if (bar) return bar; bar = document.createElement("div"); bar.id = "r-sq"; bar.className = "hidden"; var base = $("base"); (base || document.body).appendChild(bar);
    bar.addEventListener("pointerdown", function (e) {
      var t = e.target.closest("[data-i],#r-auto"); if (!t) return; e.preventDefault(); var r = X().getRaid && X().getRaid(); if (!r) return;
      if (t.id === "r-auto") { r.auto = ((r.auto || 0) + 1) % 3; SQ.st().auto = r.auto; sfx("click"); UI.tick(r, 1); return; }
      var ok = X().rAct({k: "sqb", i: +t.dataset.i}); if (!ok) { sfx("deny"); t.classList.remove("shk"); void t.offsetWidth; t.classList.add("shk"); }
    });
    return bar;
  }
  UI.tick = function (r, force) {
    var b = mkBar(), s = r && r.sim; if (!s || !s.sq || r.phase !== "fight" || (r.kind === "story" && 0)) { b.classList.add("hidden"); return; }
    b.classList.remove("hidden"); b.classList.toggle("ro", !!r.replay);
    var sig = s.sq.length + "|" + (r.auto || 0) + "|" + !!r.replay, h, i;
    if (sig !== lastSig || b.dataset.k !== sig) {
      b.dataset.k = sig; lastSig = sig; h = r.replay ? "" : '<button id="r-auto" class="ra a' + (r.auto || 0) + '">' + ["AUTO<br>OFF", "AUTO", "AUTO+"][r.auto || 0] + "</button>";
      for (i = 0; i < s.sq.length; i++) { var q = s.sq[i], u = D.U[q.id]; h += '<button class="rq" data-i="' + i + '" style="--ec:' + el(u.el).col + '"><i class="rqa" style="background-image:url(' + u.art + ')"></i><span class="rqr"></span><small>' + el(u.el).n.slice(0, 4) + "</small></button>"; }
      h += '<div class="rq-chain" id="rq-chain"></div>'; b.innerHTML = h;
    }
    var nodes = b.querySelectorAll(".rq"), n = 0; for (i = 0; i < nodes.length; i++) { var c = s.sq[i], rd = c.ch >= 99.9; nodes[i].style.setProperty("--p", Math.min(100, c.ch).toFixed(0)); if (nodes[i].classList.contains("rdy") !== rd) nodes[i].classList.toggle("rdy", rd); if (rd) n++; }
    var ch = $("rq-chain"), live = s.bch && s.bch.n > 0 && s.t - s.bch.last <= 2.6; if (ch) { var tx = live ? "CHAIN x" + s.bch.n + " &middot; tap the next unit!" : (n ? "BURST READY" : ""); if (ch.dataset.t !== tx) { ch.dataset.t = tx; ch.innerHTML = tx; } ch.classList.toggle("on", !!tx); }
  };
  UI.hideBar = function () { if (bar) bar.classList.add("hidden"); lastSig = ""; if (bar) bar.dataset.k = ""; };
  UI.ev = function (e) {
    if (e.k !== "sqb") return false; var r = X().getRaid && X().getRaid(), V = BB.CCV, calm = !!(S.set && S.set.calm);
    CUT.burst(e); sfx("ult"); vib([20, 30, 40]); if (r && !r.replay) SQ.onBurst(e);
    if (V) { var c = el(e.el).col; (e.pts || []).slice(0, 6).forEach(function (p) { V.ring(p[0], p[1], 2.4, c); if (!calm) V.puff(p[0], p[1], 8, c, 60, 0.7); }); if (e.cx !== undefined) V.ring(e.cx, e.cy, 4 + Math.min(e.n, 5), c); if (!calm) V.shake = Math.max(V.shake, 0.35 + 0.08 * Math.min(e.n, 5)); }
    return true;
  };
  UI.scoutLine = function (base, kind) {
    var be = SQ.baseEl(base), ids = SQ.teamIds(), good = 0, bad = 0; ids.forEach(function (id) { var a = D.adv(D.U[id].el, be); if (a > 1) good++; else if (a < 1) bad++; });
    var best = (be + 4) % 5, T = kind === "trial" ? D.TIER[D.trials[base ? (D.trials.filter(function (t) { return t.nm === base.name; })[0] || {tier: 0}).id % 4 : 0]] : null;
    return '<div class="sc-sq" style="--ec:' + el(be).col + '"><span>' + pill(be) + "Defenders: <b>" + el(be).n + "</b></span><span>Bring " + pill(best) + "<b>" + el(best).n + "</b> &middot; " + good + " of " + ids.length + " squad units have the edge" + (bad ? ", " + bad + " resisted" : "") + "</span>" + (T ? "<span>&#9889; " + T.stam + " energy on ATTACK</span>" : "") + "</div>";
  };
  var nb = $("nav-sq"); if (nb) nb.addEventListener("click", function () { UI.open("squad"); });
  var hb = $("btn-squad"); if (hb) hb.addEventListener("click", function () { UI.open("squad"); });
})();
