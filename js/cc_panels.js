"use strict";
// ---- panels, menus and DOM wiring for the base screen ----
(function () {
  var C = BB.CC, S = BB.S, X = BB.CCUI, V = BB.CCV, G = BB.CCGen;
  var $ = function (id) { return document.getElementById(id); }, cur = null, lastHtml = "";
  function cc() { return X.cc(); }
  function day() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  var ICON = {field: "corn", rig: "i_scrap", wall: "hay_round", trap: "t_trap", core: "homestead"};
  function icon(t) { var d = C.B[t]; return "assets/" + (d.art || ICON[t] || "hay_round") + ".webp"; }
  function cost(c, s, g) { return (c ? '<span class="cs"><i class="ico coin"></i>' + X.fmt(c) + "</span>" : "") + (s ? '<span class="cs"><i class="ico salv"></i>' + s + "</span>" : "") + (g ? '<span class="cs"><i class="ico gem"></i>' + g + "</span>" : ""); }
  function afford(c, s) { return S.coins >= c && S.salv >= s; }
  function bar(p, cl) { return '<div class="bar ' + (cl || "") + '"><i style="width:' + Math.max(0, Math.min(100, p)) + '%"></i></div>'; }
  function reward(r) { var o = []; if (r.c) o.push(X.fmt(r.c) + " coins"); if (r.s) o.push(r.s + " salvage"); if (r.g) o.push(r.g + " gems"); if (r.bp) o.push(r.bp + " blueprints"); return o.join(", "); }
  function grant(r) { X.give(r.c, r.s, r.g); if (r.bp) S.bp += r.bp; }
  function lvOf(t) { var m = 0; X.cc().bld.forEach(function (b) { if (b.t === t && b.l > m) m = b.l; }); return m; }

  // ---------- panels ----------
  function buildHTML() {
    var h = "<h2>BUILD</h2><p class=\"sub\">Core L" + X.coreL() + ". Each building needs a free tinker to construct. Upgrade the Homestead Core to unlock more.</p><div class=\"grid2\">";
    C.ORDER.forEach(function (t) {
      if (t === "core") return; var d = C.B[t], n = X.count(t), mx = X.maxCount(t), lock = !mx, full = mx && n >= mx, c0 = d.c[0];
      if (lock) { var need = 1; while (need < 4 && !d.mx[need]) need++; h += '<div class="bc lock"><img src="' + icon(t) + '" alt=""><b>' + d.name + '</b><small>Core L' + (need + 1) + " to unlock</small></div>"; return; }
      var ok = afford(c0, d.s[0]) && !full;
      h += '<button class="bc' + (ok ? "" : " off") + '" data-build="' + t + '"><img src="' + icon(t) + '" alt=""><b>' + d.name + '</b><em>' + n + "/" + mx + "</em><div class=\"cr\">" + cost(c0, d.s[0]) + '</div><small>' + (t === "wall" ? "no builder needed" : C.fmtT(d.t[0])) + "</small></button>";
    });
    h += "</div>"; var w = X.cc().bld.filter(function (b) { return b.t === "wall"; }); if (w.length) { var l = w[0].l, up = l < X.coreL() && l < 4, tot = w.length * C.B.wall.c[l]; h += '<div class="card"><h4>Fences L' + l + " &middot; " + w.length + " placed</h4><small>Upgrade all fences at once: +HP so raiders take longer to break through.</small><div style=\"margin-top:6px\"><button class=\"btn " + (up && S.coins >= tot ? "" : "off") + '" data-fenceup="1">' + (up ? "UPGRADE ALL <small>" + X.fmt(tot) + "c</small>" : "Upgrade the Core first") + "</button></div></div>"; }
    return h;
  }
  function armyHTML() {
    var c = cc(), cap = X.housing(), used = X.housed(), h = "<h2>ARMY</h2>" + '<div class="card"><div class="row"><div class="grow"><h4>Muster Yards</h4><small>' + used + " / " + cap + " housing used</small></div><b style=\"font-size:20px\">" + used + "/" + cap + "</b></div>" + bar(cap ? used / cap * 100 : 0) + "</div>";
    var tl = lvOf("train"), wl = lvOf("workshop");
    h += "<h3 class=\"sec\">Troops</h3>";
    C.UORDER.forEach(function (k) {
      var u = C.U[k], lv = c.ulv[k] || 1, n = c.army[k] || 0, q = c.queue.filter(function (x) { return x.k === k; }).length, lock = tl < u.tb, can = !lock && used + u.h <= cap && S.coins >= u.c;
      h += '<div class="card row"><img class="uimg" src="assets/' + u.art + '.webp" alt=""><div class="grow"><h4>' + u.name + ' <span class="pill">L' + lv + '</span></h4><small>' + u.d + "<br>HP " + Math.round(u.hp * (1 + 0.25 * (lv - 1))) + " &middot; DPS " + Math.round(u.dps * (1 + 0.2 * (lv - 1))) + " &middot; housing " + u.h + "</small></div><div class=\"rt\"><b>x" + n + (q ? " <span class=\"muted\">+" + q + "</span>" : "") + "</b>" + (lock ? '<span class="pill d">Training Barn L' + u.tb + "</span>" : '<button class="btn ' + (can ? "" : "off") + '" data-train="' + k + '"><i class="ico coin"></i>' + u.c + "<small>" + u.tr + "s</small></button>") + "</div></div>";
    });
    if (c.queue.length) { var q0 = c.queue[0]; h += '<div class="card"><h4>Training: ' + c.queue.length + " queued</h4>" + bar((1 - q0.left / C.U[q0.k].tr) * 100, "g") + '<small>Next: ' + C.U[q0.k].name + " (" + Math.ceil(q0.left) + "s). More Training Barns train faster.</small><div style=\"margin-top:5px\"><button class=\"btn sec\" data-clearq=\"1\">CANCEL QUEUE (refund)</button></div></div>"; }
    h += "<h3 class=\"sec\">Spells <small class=\"muted\">" + X.spellN() + "/" + C.SPCAP + "</small></h3>";
    C.SPORDER.forEach(function (k) {
      var sp = C.SP[k], n = c.spells[k] || 0, can = wl >= 1 && X.spellN() < C.SPCAP && afford(sp.c, sp.s);
      h += '<div class="card row"><i class="sp big" style="background:' + sp.col + '"></i><div class="grow"><h4>' + sp.name + '</h4><small>' + sp.d + '</small></div><div class="rt"><b>x' + n + '</b>' + (wl < 1 ? '<span class="pill d">Needs Workshop</span>' : '<button class="btn ' + (can ? "" : "off") + '" data-brew="' + k + '">' + cost(sp.c, sp.s) + "</button>") + "</div></div>";
    });
    h += "<h3 class=\"sec\">Workshop upgrades</h3>";
    if (wl < 1) h += '<div class="card"><small>Build a Workshop (BUILD tab) to upgrade your troops and brew spells.</small></div>';
    else {
      if (c.lab) h += '<div class="card"><h4>Upgrading ' + C.U[c.lab.k].name + " to L" + c.lab.to + "</h4>" + bar(c.lab.done / c.lab.total * 100, "g") + "<small>" + C.fmtT(c.lab.total - c.lab.done) + ' left</small> <button class="btn blue" data-labskip="1">\u26A1 ' + BB.skipGems(c.lab.total - c.lab.done) + " \u25C6</button></div>";
      C.UORDER.forEach(function (k) {
        var lv = c.ulv[k] || 1, to = lv + 1; if (to > C.LABMAX) { h += '<div class="card row"><div class="grow"><h4>' + C.U[k].name + '</h4><small>Max level reached</small></div></div>'; return; }
        var ok = !c.lab && wl >= to - 1 && afford(C.LAB.c[to - 1], C.LAB.s[to - 1]);
        h += '<div class="card row"><img class="uimg s" src="assets/' + C.U[k].art + '.webp" alt=""><div class="grow"><h4>' + C.U[k].name + ' L' + lv + " \u2192 L" + to + "</h4><small>+25% HP, +20% damage &middot; " + C.fmtT(C.LAB.t[to - 1]) + '</small></div><div class="rt"><button class="btn ' + (ok ? "" : "off") + '" data-lab="' + k + '">' + cost(C.LAB.c[to - 1], C.LAB.s[to - 1]) + "</button></div></div>";
      });
    }
    h += '<h3 class="sec">Hero</h3><div class="card row"><img class="uimg" src="assets/' + X.hero().port + '.webp" alt="" style="object-position:50% 20%"><div class="grow"><h4>' + X.hero().name + ' L' + S.lvl + "</h4><small>HP " + Math.round(c.heroHp * 100) + '%. SURGE: ' + X.hero().surge + '. Change hero or level up on the HERO screen.</small>' + bar(c.heroHp * 100, c.heroHp < 0.3 ? "r" : "g") + '</div><div class="rt"><button class="btn sec" data-nav="hero">HERO</button></div></div>';
    return h;
  }
  function crewHTML() {
    var c = cc(), cl = lvOf("crewhall"), cap = X.crewCap(), used = X.crewUsed(), h = "<h2>RANCH CREW</h2><p class=\"sub\">Sunny Acres Crew &middot; 8 simulated members (offline characters, no real players).</p>";
    h += '<div class="card"><h4>Crew Barn: ' + used + "/" + cap + " housing</h4>";
    if (!cl) h += "<small>Build a Crew Barn (BUILD tab, needs Core L2). Crew troops defend your base when raiders come close.</small>";
    else { var u = []; for (var k in c.crew.units) if (c.crew.units[k]) u.push(c.crew.units[k] + "x " + C.U[k].name); h += "<small>" + (u.join(", ") || "Empty") + "</small>"; h += bar(cap ? used / cap * 100 : 0); h += "<div style=\"margin-top:6px\">" + (c.crew.req ? '<button class="btn off">Request sent... ' + Math.max(0, Math.ceil((c.crew.reqAt - Date.now()) / 1000)) + "s</button>" : '<button class="btn ' + (used < cap ? "" : "off") + '" data-req="1">REQUEST TROOPS</button>') + (used ? ' <button class="btn sec" data-crewclear="1">EMPTY</button>' : "") + "</div>"; }
    h += "</div>";
    if (c.crew.log.length) h += '<div class="card"><h4>Crew chat</h4><small>' + c.crew.log.slice(0, 4).join("<br>") + "</small></div>";
    h += '<h3 class="sec">Members</h3>';
    C.CREWMEM.forEach(function (m, i) {
      var want = (i + new Date().getDate()) % 3 === 0, k = m.t, did = c.crew.don[day() + m.n], n = c.army[k] || 0;
      h += '<div class="card row"><div class="av" style="background:hsl(' + (i * 47) + ',55%,45%)">' + m.n[0] + '</div><div class="grow"><h4>' + m.n + '</h4><small>' + (700 + i * 130) + " trophies &middot; " + (want ? "asks for a " + C.U[k].name : "online") + "</small></div>" + (want ? '<div class="rt"><button class="btn ' + (!did && n > 0 ? "" : "off") + '" data-don="' + i + '">' + (did ? "Donated" : "DONATE") + "</button></div>" : "") + "</div>";
    });
    return h + '<p class="sub">Donating gives battle-pass points. Troops you donate come out of your own army.</p>';
  }
  function tasksHTML() {
    var c = cc(), h = "<h2>TASKS</h2>", dn = c.daily.last === day();
    h += '<h3 class="sec">Daily reward <small class="muted">streak ' + c.daily.streak + "</small></h3><div class=\"days\">";
    C.DAILY.forEach(function (r, i) { var cur = (c.daily.streak % 7) === i && !dn, past = i < (dn ? c.daily.streak % 7 || 7 : c.daily.streak % 7); h += '<div class="day' + (cur ? " cur" : "") + (past ? " past" : "") + '"><b>D' + (i + 1) + "</b><small>" + reward(r).replace(/ coins| salvage| gems| blueprints/g, function (m) { return m[1] === "c" ? "c" : m[1] === "s" ? "s" : m[1] === "g" ? "\u25C6" : "bp"; }) + "</small></div>"; });
    h += '</div><button class="btn ' + (dn ? "off" : "") + '" data-daily="1" style="width:100%;margin-top:6px">' + (dn ? "CLAIMED TODAY" : "CLAIM DAY " + (c.daily.streak % 7 + 1)) + "</button>";
    h += '<h3 class="sec">Daily quests</h3>'; C.QUESTS.forEach(function (q) { var p = c.quests.prog[q.id] || 0, d = p >= q.n, cl = c.quests.claimed[q.id]; h += '<div class="card row"><div class="grow"><h4>' + q.t + "</h4>" + bar(p / q.n * 100, d ? "g" : "") + "<small>" + Math.min(p, q.n) + "/" + q.n + " &middot; " + reward(q.r) + " + " + q.p + ' pass pts</small></div><div class="rt"><button class="btn ' + (d && !cl ? "" : "off") + '" data-quest="' + q.id + '">' + (cl ? "DONE" : "CLAIM") + "</button></div></div>"; });
    h += '<h3 class="sec">Achievements</h3>'; C.ACH.forEach(function (a) { var p = a.ev === "trophies" ? c.trophies : (c.stats[a.ev] || 0), d = p >= a.n, cl = c.ach.claimed[a.id]; h += '<div class="card row"><div class="grow"><h4>' + a.t + "</h4><small>" + a.d + " &middot; " + Math.min(p, a.n) + "/" + a.n + " &middot; " + a.g + " gems</small>" + bar(p / a.n * 100, d ? "g" : "") + '</div><div class="rt"><button class="btn ' + (d && !cl ? "" : "off") + '" data-ach="' + a.id + '">' + (cl ? "DONE" : "CLAIM") + "</button></div></div>"; });
    h += '<h3 class="sec">Harvest Pass <small class="muted">' + c.pass.pts + ' pts</small></h3><div class="mock">MOCK: no real purchase exists. The premium track unlocks with play-gems only, to test how a pass feels.</div>';
    var cum = 0; C.PASS.forEach(function (t, i) { cum += t.pts; var un = c.pass.pts >= cum, cf = c.pass.claimed["f" + i], cp = c.pass.claimed["p" + i]; h += '<div class="card row pass"><b class="tier">' + (i + 1) + '</b><div class="grow"><small>Free: ' + reward(t.free) + "<br>" + (c.pass.prem ? "Premium: " + reward(t.prem) : '<span class="muted">Premium: ' + reward(t.prem) + "</span>") + '</small></div><div class="rt"><button class="btn ' + (un && !cf ? "" : "off") + '" data-pass="f' + i + '">' + (cf ? "\u2714" : un ? "FREE" : cum + "pts") + "</button>" + (c.pass.prem ? '<button class="btn blue ' + (un && !cp ? "" : "off") + '" data-pass="p' + i + '">' + (cp ? "\u2714" : "PREM") + "</button>" : "") + "</div></div>"; });
    if (!c.pass.prem) h += '<button class="btn blue" data-prem="1" style="width:100%">UNLOCK PREMIUM TRACK (mock) 100 \u25C6</button>';
    return h;
  }
  var NAMES = {build: buildHTML, army: armyHTML, crew: crewHTML, tasks: tasksHTML};
  X.panelOpen = function () { return !!cur; };
  X.closePanel = function () { cur = null; $("b-panel").classList.add("hidden"); updNav(); };
  function openPanel(n) { if (cur === n) { X.closePanel(); return; } cur = n; BB.sfx("click"); $("b-panel").classList.remove("hidden"); V.sel = null; X.selBar(); render(false); updNav(); BB.track("cc_tab", {t: n}); }
  X.openPanel = openPanel;
  function render(keep) { var p = $("b-panel"), sc = p.scrollTop, html = NAMES[cur](); if (keep && html === lastHtml) return; lastHtml = html; p.innerHTML = '<button class="px" id="px">\u2716</button>' + html; if (keep) p.scrollTop = sc; $("px").onclick = X.closePanel; }
  X.panelRefresh = function (keep) { if (cur) render(keep); };
  function updNav() { [].forEach.call(document.querySelectorAll("#b-nav button[data-p]"), function (b) { b.classList.toggle("active", b.dataset.p === cur); }); }

  // ---------- modals ----------
  function attackMenu() {
    var c = cc(), L = C.league(c.trophies), fh = X.coreL(), h = '<h1 class="win" style="font-size:24px">ATTACK</h1><div class="card gold"><div class="row"><i class="lg" style="background:' + L.col + ';width:34px;height:34px"></i><div class="grow"><h4>' + L.n + " League</h4><small>" + c.trophies + ' trophies &middot; raids match your Core level</small></div></div></div>';
    h += '<div class="card"><h4>Find a Raid</h4><small>Scout a random alien outpost sized for Core L' + fh + '. Loot it, win trophies. Costs ' + 40 * fh + ' coins to scout.</small><div style="margin-top:6px"><button class="btn" id="a-find" style="width:100%">FIND A RAID</button></div></div>';
    h += '<h3 class="sec" style="margin-top:6px">Campaign</h3>';
    C.STORY.forEach(function (s, i) { var st = c.story[i + 1] || 0, lock = s.fh > fh || (i > 0 && !c.story[i]); h += '<button class="btn camp ' + (lock ? "off" : "") + '" data-story="' + (i + 1) + '"><b>' + (i + 1) + ". " + s.name + '</b><small>' + (s.fh > fh ? "Needs Core L" + s.fh : lock ? "Clear the previous mission" : s.desc) + '</small><span class="stars">' + [0, 1, 2].map(function (j) { return j < st ? "\u2605" : "\u2606"; }).join("") + "</span></button>"; });
    h += '<div class="btns"><button class="btn sec" id="m-no">CLOSE</button></div>'; X.modal(h, "tall");
    $("m-no").onclick = X.close; $("a-find").onclick = function () { X.close(); X.findRaid(); }; [].forEach.call(document.querySelectorAll("[data-story]"), function (b) { b.onclick = function () { if (b.classList.contains("off")) { BB.sfx("deny"); X.toast(b.querySelector("small").textContent); return; } X.close(); X.startStory(+b.dataset.story); }; });
  }
  function logModal() {
    var c = cc(), h = '<h1 class="win" style="font-size:22px">DEFENSE LOG</h1>'; c.unseen = 0;
    if (!c.log.length) h += "<p class=\"sub\" style=\"text-align:center\">No raids on your ranch yet. A shield protects you after a raid, and raiders only come once you have attacked at least once.</p>";
    c.log.forEach(function (e, i) { var mins = Math.max(1, Math.round((Date.now() - e.ts) / 60000)); h += '<div class="card row"><div class="grow"><h4>' + e.att + " raided you</h4><small>" + (e.held ? "Held the line! (0 stars) +" + e.tg + " trophies" : e.stars + " star" + (e.stars === 1 ? "" : "s") + " &middot; " + e.pct + "% &middot; -" + X.fmt(e.lc) + "c -" + e.ls + "s &middot; -" + e.tl + " trophies") + " &middot; " + mins + "m ago</small></div><div class=\"rt\"><button class=\"btn sec\" data-rep=\"" + i + "\">REPLAY</button><button class=\"btn\" data-rev=\"" + i + '">REVENGE</button></div></div>'; });
    h += '<div class="btns"><button class="btn sec" id="m-no">CLOSE</button></div>'; X.modal(h, "tall"); X.hud(); $("m-no").onclick = X.close;
    [].forEach.call(document.querySelectorAll("[data-rep]"), function (b) { b.onclick = function () { var e = cc().log[+b.dataset.rep]; X.watch({base: e.base, script: e.script, heroLvl: Math.min(10, e.fh * 2)}); }; });
    [].forEach.call(document.querySelectorAll("[data-rev]"), function (b) { b.onclick = function () { X.startRevenge(cc().log[+b.dataset.rev]); }; });
  }
  X.logModal = logModal;
  function awayReport(n) {
    var c = cc(); if (!c.unseen) return; var l = c.log.slice(0, c.unseen), lc = 0, ls = 0, tl = 0; l.forEach(function (e) { lc += e.lc; ls += e.ls; tl += e.tl; });
    X.modal('<h1 class="lose" style="font-size:22px">WHILE YOU WERE AWAY</h1><div class="loot"><span>Raids</span><span>' + l.length + "</span><span>Coins lost</span><span>-" + X.fmt(lc) + "</span><span>Salvage lost</span><span>-" + ls + "</span><span>Trophies lost</span><span>-" + tl + '</span></div><p class="sub" style="text-align:center">' + (c.shield > Date.now() ? "Your shield is up. " : "") + "Watch what happened or take revenge.</p>" + '<div class="btns"><button class="btn sec" id="m-no">OK</button><button class="btn" id="a-log">OPEN LOG</button></div>');
    $("m-no").onclick = function () { c.unseen = 0; X.close(); X.hud(); }; $("a-log").onclick = logModal;
  }
  function intro() {
    X.modal('<h1 class="win" style="font-size:22px">WELCOME, RANCHER!</h1><div class="card"><b>1.</b> Collect <b>coins</b> and <b>salvage</b> from your Crop Fields and Scrap Rigs.<br><b>2.</b> Spend them to <b>build and upgrade</b> with your tinkers (timers run offline).<br><b>3.</b> <b>Train troops</b> in ARMY, then tap <b>ATTACK</b> to raid alien outposts for loot and trophies.<br><b>4.</b> Rivals raid <b>you</b> while you are away. Build turrets, fences and traps. Beat Vorlax at the end of the campaign!</div><p class="sub" style="text-align:center">Prototype: gems are play-currency only. There is no real-money shop.</p><div class="btns"><button class="btn" id="m-no">LET\'S GO</button></div>');
    $("m-no").onclick = function () { cc().seen.intro = 1; X.close(); X.save(); };
  }
  function dailyModal() {
    var c = cc(); if (c.daily.last === day()) return; var i = c.daily.streak % 7, r = C.DAILY[i];
    X.modal('<h1 class="win" style="font-size:22px">DAILY REWARD</h1><div class="card gold" style="text-align:center"><h4>Day ' + (i + 1) + '</h4><div style="font-size:18px;margin:6px 0">' + reward(r) + '</div></div><div class="btns"><button class="btn" id="m-no">CLAIM</button></div>'); $("m-no").onclick = function () { claimDaily(); X.close(); };
  }
  function claimDaily() { var c = cc(); if (c.daily.last === day()) return; var r = C.DAILY[c.daily.streak % 7]; grant(r); c.daily.last = day(); c.daily.streak++; c.pass.pts += 20; BB.sfx("upgrade"); X.toast("Daily reward: " + reward(r)); BB.track("cc_daily", {d: c.daily.streak}); X.save(); X.hud(); if (cur) render(false); }
  X.debugHTML = function () {
    return '<div class="card dbg"><h4>Base debug</h4><div><button class="btn sec" id="cd-raid">Trigger raid on me</button><button class="btn sec" id="cd-reset">Reset base (new save)</button><button class="btn sec" id="cd-army">Fill army</button><button class="btn sec" id="cd-res">Fill storage</button></div></div>';
  };
  X.debugBind = function () {
    var c = cc(); var a = $("cd-raid"); if (!a) return; a.onclick = function () { var e = X.simDefense(); X.close(); X.toast(e.att + " raided you: " + e.stars + " stars"); X.hud(); };
    $("cd-reset").onclick = function () { if (confirm("Reset the whole save?")) { localStorage.removeItem("bb_save_v1"); location.reload(); } };
    $("cd-army").onclick = function () { var room = X.housing() - X.housed(); while (room > 0) { var k = ["slinger", "slinger", "bruiser", "slinger"][Math.floor(Math.random() * 4)]; if (C.U[k].h > room) k = "slinger"; c.army[k] = (c.army[k] || 0) + 1; room -= C.U[k].h; } X.close(); X.hud(); X.save(); };
    $("cd-res").onclick = function () { S.coins = X.coinCap(); S.salv = X.salvCap(); X.close(); X.hud(); X.save(); };
  };

  // ---------- bindings ----------
  X.bind = function () {
    var base = $("base");
    base.addEventListener("click", function (e) {
      var t = e.target, el = t.closest ? t.closest("[data-build],[data-train],[data-brew],[data-lab],[data-labskip],[data-clearq],[data-fenceup],[data-req],[data-crewclear],[data-don],[data-daily],[data-quest],[data-ach],[data-pass],[data-prem],[data-collect],[data-up],[data-move],[data-skip],[data-sel],[data-nav],[data-fence]") : null; if (!el) return; var d = el.dataset, c = cc();
      BB.audioInit && BB.audioInit();
      if (d.skip) { e.stopPropagation(); X.skip(X.byId(d.skip)); return; }
      if (d.sel) { V.sel = X.byId(d.sel); X.selBar(); return; }
      if (d.build) { X.startPlace(d.build); return; }
      if (d.collect) { X.collect(X.byId(d.collect)); X.selBar(); return; }
      if (d.up) { X.doUp(X.byId(d.up)); return; }
      if (d.move) { X.startMove(X.byId(d.move)); return; }
      if (d.fence) { X.startPaint(); return; }
      if (d.nav) { if (d.nav === "hero") { toHero(); } else openPanel(d.nav); return; }
      if (d.train) { var u = C.U[d.train]; if (X.housed() + u.h > X.housing()) { BB.sfx("deny"); X.toast("Muster Yards are full. Build or upgrade Muster Yards."); return; } if (S.coins < u.c) { BB.sfx("deny"); X.toast("Not enough coins"); return; } S.coins -= u.c; if (!c.queue.length) c.qLast = Date.now(); c.queue.push({k: d.train, left: u.tr}); X.stat("train"); BB.sfx("click"); render(false); X.hud(); X.save(); return; }
      if (d.clearq) { c.queue.forEach(function (q) { S.coins += C.U[q.k].c; }); c.queue = []; render(false); X.hud(); return; }
      if (d.brew) { var sp = C.SP[d.brew]; if (X.spellN() >= C.SPCAP || !(S.coins >= sp.c && S.salv >= sp.s)) { BB.sfx("deny"); X.toast(X.spellN() >= C.SPCAP ? "Spell slots full" : "Not enough resources"); return; } S.coins -= sp.c; S.salv -= sp.s; c.spells[d.brew] = (c.spells[d.brew] || 0) + 1; BB.sfx("upgrade"); render(false); X.hud(); X.save(); return; }
      if (d.lab) { var k = d.lab, to = (c.ulv[k] || 1) + 1, lc = C.LAB.c[to - 1], ls = C.LAB.s[to - 1]; if (c.lab || lvOf("workshop") < to - 1 || !afford(lc, ls)) { BB.sfx("deny"); X.toast(c.lab ? "Workshop is busy" : lvOf("workshop") < to - 1 ? "Upgrade the Workshop first" : "Not enough resources"); return; } S.coins -= lc; S.salv -= ls; c.lab = {k: k, to: to, total: C.LAB.t[to - 1], done: 0, last: Date.now()}; BB.sfx("upgrade"); render(false); X.hud(); X.save(); return; }
      if (d.labskip) { var g = BB.skipGems(c.lab.total - c.lab.done); if (S.gems < g) { BB.sfx("deny"); X.toast("Not enough play-gems (mock shop, not real money)"); return; } S.gems -= g; c.lab.done = c.lab.total; render(false); X.hud(); return; }
      if (d.fenceup) { var w = c.bld.filter(function (b) { return b.t === "wall"; }), l = w[0].l, tot = w.length * C.B.wall.c[l]; if (l >= Math.min(4, X.coreL()) || S.coins < tot) { BB.sfx("deny"); X.toast(l >= X.coreL() ? "Upgrade the Core first" : "Not enough coins"); return; } S.coins -= tot; w.forEach(function (b) { b.l = l + 1; }); BB.sfx("upgrade"); X.stat("upg"); render(false); X.hud(); X.save(); return; }
      if (d.req) { c.crew.req = true; c.crew.reqAt = Date.now() + 20000 / (S.set.timerMul || 1); BB.sfx("click"); render(false); return; }
      if (d.crewclear) { c.crew.units = {}; render(false); return; }
      if (d.don) { var m = C.CREWMEM[+d.don], kk = m.t; if ((c.army[kk] || 0) < 1) { BB.sfx("deny"); return; } c.army[kk]--; c.crew.don[day() + m.n] = 1; c.pass.pts += 15; X.give(40, 0, 0); BB.sfx("coin"); X.toast("Donated to " + m.n + ": +15 pass pts, +40 coins"); render(false); X.hud(); X.save(); return; }
      if (d.daily) { claimDaily(); return; }
      if (d.quest) { var q = C.QUESTS.filter(function (x) { return x.id === d.quest; })[0]; if ((c.quests.prog[q.id] || 0) >= q.n && !c.quests.claimed[q.id]) { c.quests.claimed[q.id] = 1; grant(q.r); c.pass.pts += q.p; BB.sfx("upgrade"); render(false); X.hud(); X.save(); } return; }
      if (d.ach) { var a = C.ACH.filter(function (x) { return x.id === d.ach; })[0], p = a.ev === "trophies" ? c.trophies : (c.stats[a.ev] || 0); if (p >= a.n && !c.ach.claimed[a.id]) { c.ach.claimed[a.id] = 1; X.give(0, 0, a.g); BB.sfx("upgrade"); render(false); X.hud(); X.save(); } return; }
      if (d.pass) { var tp = d.pass[0], ti = +d.pass.slice(1), cum = 0; for (var i = 0; i <= ti; i++) cum += C.PASS[i].pts; if (c.pass.pts >= cum && !c.pass.claimed[d.pass] && (tp === "f" || c.pass.prem)) { c.pass.claimed[d.pass] = 1; grant(tp === "f" ? C.PASS[ti].free : C.PASS[ti].prem); BB.sfx("upgrade"); render(false); X.hud(); X.save(); } return; }
      if (d.prem) { if (S.gems < 100) { BB.sfx("deny"); X.toast("Needs 100 play-gems. (Mock: nothing here costs real money.)"); return; } S.gems -= 100; c.pass.prem = true; BB.sfx("upgrade"); render(false); X.hud(); X.save(); return; }
    });
    base.addEventListener("pointerdown", function (e) { if (e.target.closest && e.target.closest("#b-panel")) X.panelBusy = true; }, true);
    window.addEventListener("pointerup", function () { X.panelBusy = false; }, true);
    [].forEach.call(document.querySelectorAll("#b-nav button[data-p]"), function (b) { b.onclick = function () { BB.audioInit && BB.audioInit(); openPanel(b.dataset.p); }; });
    $("btn-hero").onclick = toHero; $("btn-base").onclick = function () { BB.sfx("click"); X.show(); }; $("btn-attack").onclick = function () { BB.audioInit && BB.audioInit(); BB.sfx("click"); X.closePanel(); attackMenu(); BB.track("cc_attack_menu", {}); };
    $("b-log").onclick = function () { BB.sfx("click"); logModal(); }; $("b-gear").onclick = function () { BB.audioInit && BB.audioInit(); BB.sfx("click"); BB.UI.settings(); };
    $("b-mute").onclick = function () { BB.toggleMute(); }; $("r-mute").onclick = function () { BB.toggleMute(); }; BB.syncMute(); $("r-end").onclick = X.endBattle; $("r-speed").onclick = function () { X.setSpeed(); BB.sfx("click"); };
    $("b-daily").onclick = function () { BB.sfx("click"); dailyModal(); };
  };
  function toHero() { X.closePanel(); $("base").classList.remove("active"); $("home").classList.add("active"); if (BB.UI.fit) BB.UI.fit(); BB.UI.refresh(); BB.sfx("click"); }
  X.afterInit = function (missed) {
    if (!cc().seen.intro) intro(); else if (cc().unseen) awayReport(); else if (cc().daily.last !== day()) setTimeout(dailyModal, 400);
    cc().stats.core = X.coreL(); window.addEventListener("beforeunload", function () { cc().last = Date.now(); X.save(); }); document.addEventListener("visibilitychange", function () { if (document.hidden) { cc().last = Date.now(); X.save(); } else { var m = X.offlineRaids(); if (cc().unseen && $("base").classList.contains("active") && !X.raidOn()) awayReport(); } });
  };
})();
