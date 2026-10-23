"use strict";
// ---- UI: home, panels, upgrades, missions, results, settings ----
(function () {
  var S = BB.S, $ = function (id) { return document.getElementById(id); };
  var UI = BB.UI = {}, curTab = null, toastT = 0;
  function fmt(n) { return Math.floor(n).toLocaleString("en-US"); }
  function fmtTime(min) {
    var s = Math.max(0, Math.ceil(min * 60)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    return h ? h + "h " + ("0" + m).slice(-2) + "m" : m ? m + "m " + ("0" + sec).slice(-2) + "s" : sec + "s";
  }
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 2300); }
  UI.toast = toast;
  function modal(html, cls) { var m = $("modal"); m.innerHTML = '<div class="mbox ' + (cls || "") + '">' + html + "</div>"; m.classList.remove("hidden"); }
  function closeModal() { $("modal").classList.add("hidden"); $("modal").innerHTML = ""; }
  UI.closeModal = closeModal;
  function starImgs(n) { var s = ""; for (var i = 0; i < 3; i++) s += '<img class="bs' + (i < n ? " on pop" : "") + '" src="assets/' + (i < n ? "ui_star" : "ui_star_off") + '.webp" alt="">'; return s; }
  function stars(n, total) { var s = ""; for (var i = 0; i < (total || 3); i++) s += i < n ? "\u2605" : '<span class="off">\u2605</span>'; return s; }

  // ---------- farm production ----------
  function tickFarm() {
    var now = Date.now(), dm = (now - S.farmLast) / 60000 * S.set.timerMul; S.farmLast = now;
    S.farmStored = Math.min(BB.FARM.cap, S.farmStored + dm * BB.FARM.perMin);
  }
  // ---------- upgrades ----------
  function tickUpgrade() {
    var u = S.upg; if (!u) return false; var now = Date.now();
    u.done += (now - u.last) / 60000 * S.set.timerMul; u.last = now;
    if (u.done >= u.total) { finishUpgrade(); return true; } return false;
  }
  function remainMin() { return S.upg ? Math.max(0, S.upg.total - S.upg.done) : 0; }
  function finishUpgrade(skipped) {
    var to = S.upg.to; S.upg = null; S.lvl = to; BB.save(); BB.track("upgrade_done", {to: to, coins: S.coins, skipped: skipped || ""});
    BB.sfx("upgrade"); showLevelUp(to); UI.refresh();
  }
  function showLevelUp(to) {
    var p = BB.POWER[to], q = BB.POWER[to - 1];
    modal('<h1 class="win">LEVEL ' + to + "!</h1><p class='muted' style='text-align:center;margin:0 0 8px'>Baleguard is now <b>" + BB.UPG[to].tier + "</b> tier</p>" +
      '<div class="card"><div class="kv"><span>Health</span><b>' + q[0] + "% \u2192 " + p[0] + "%</b><span>Damage</span><b>" + q[1] + "% \u2192 " + p[1] + "%</b></div>" +
      "<p class='muted' style='margin:8px 0 0'>" + unlockNote(to) + "</p></div>" +
      '<div class="btns"><button class="btn" id="m-ok">NICE!</button></div>');
    $("m-ok").onclick = closeModal;
  }
  function unlockNote(l) {
    if (l === 4) return "New: Bale Wall lasts 1 s longer and is wider.";
    if (l === 7) return "New: Bale Wall cooldown drops from 12 s to 9 s.";
    if (l === 10) return "New: Twin hay-gun (two shots) and a golden aura. Legend tier!";
    return "Stronger hull, harder-hitting hay-gun.";
  }
  function canAfford(to) { var u = BB.UPG[to]; return S.coins >= u.coins && S.salv >= u.salv && S.bp >= u.bp; }
  UI.startUpgrade = function () {
    if (S.upg) { toast("Already upgrading!"); BB.sfx("deny"); return; }
    if (S.lvl >= BB.LEVEL_CAP) { toast("Baleguard is max level!"); return; }
    var to = S.lvl + 1, u = BB.UPG[to];
    if (!canAfford(to)) {
      BB.sfx("deny"); var need = []; if (S.coins < u.coins) need.push(fmt(u.coins - S.coins) + " more coins"); if (S.salv < u.salv) need.push(fmt(u.salv - S.salv) + " more salvage"); if (S.bp < u.bp) need.push((u.bp - S.bp) + " more blueprints");
      toast("Need " + need.join(", ") + ". Win missions!"); return;
    }
    S.coins -= u.coins; S.salv -= u.salv; S.bp -= u.bp;
    BB.track("upgrade_start", {to: to, coins: S.coins + u.coins, min: u.min});
    if (u.min === 0) { S.lvl = to; BB.track("upgrade_instant", {to: to}); BB.sfx("upgrade"); BB.save(); showLevelUp(to); }
    else { S.upg = {to: to, total: u.min, done: 0, last: Date.now()}; BB.sfx("click"); toast("Upgrading to Level " + to + " (" + fmtTime(u.min) + ")"); }
    BB.save(); UI.refresh();
  };
  UI.speedUp = function () {
    if (!S.upg) return; var rem = remainMin(), g = BB.skipGems(rem);
    if (g === 0) { BB.track("upgrade_speedup", {to: S.upg.to, gems: 0, free: 1}); finishUpgrade("quickfix"); return; }
    if (S.gems < g) { BB.sfx("deny"); toast("Need " + g + " gems. (Mock shop: no real purchases.)"); return; }
    modal("<h1 class='win'>SPEED UP?</h1><p style='text-align:center'>Finish the upgrade to Level " + S.upg.to + " now for <b>" + g + " gems</b>?<br><small class='muted'>Gems are play money in this prototype. No real payment exists.</small></p>" +
      '<div class="btns"><button class="btn sec" id="m-no">NOT NOW</button><button class="btn blue" id="m-yes">SPEED UP ' + g + " \u25C6</button></div>");
    $("m-no").onclick = closeModal; $("m-yes").onclick = function () { S.gems -= g; BB.track("upgrade_speedup", {to: S.upg.to, gems: g}); closeModal(); finishUpgrade("gems"); };
  };

  // ---------- home ----------
  function upgBtnHTML() {
    if (S.lvl >= BB.LEVEL_CAP && !S.upg) return '<div class="up-btn off"><small>MAX LEVEL</small></div>';
    if (S.upg) {
      var rem = remainMin(), g = BB.skipGems(rem);
      return '<div class="up-btn alt" id="btn-speed"><small>' + fmtTime(rem) + '</small><div class="cost">' + (g === 0 ? "FREE FIX" : "SPEED " + g + " \u25C6") + "</div></div>";
    }
    var u = BB.UPG[S.lvl + 1], ok = canAfford(S.lvl + 1);
    return '<div class="up-btn ' + (ok ? "go" : "off") + '" id="btn-upg"><small>UPGRADE</small><div class="cost"><i class="ico coin"></i>' + fmt(u.coins) + "</div></div>";
  }
  function goalHTML() {
    if (S.upg) return "Upgrade running: <b>" + fmtTime(remainMin()) + "</b> left. Meanwhile, win coins in battle!";
    if (S.lvl >= BB.LEVEL_CAP) return "Baleguard is <b>Legend tier</b>. Defeat Vorlax and replay missions for fun!";
    var to = S.lvl + 1, u = BB.UPG[to], mi = nextMission(), m = BB.MISSIONS[mi - 1];
    var parts = ["You have <b>" + fmt(S.coins) + "</b> coins. Level " + to + " costs <b>" + fmt(u.coins) + "</b>."];
    if (u.salv > S.salv) parts.push("Needs <b>" + (u.salv - S.salv) + "</b> more salvage.");
    if (u.bp > S.bp) parts.push("Needs <b>" + (u.bp - S.bp) + "</b> blueprints.");
    parts.push("Mission awards <b>" + m.coins + "</b>.");
    return "NEXT GOAL: " + parts.join(" ");
  }
  function nextMission() { for (var i = 1; i <= 10; i++) { if (!(S.missions[i] && S.missions[i].wins)) return i; } return 10; }
  function novaHTML() {
    var played = Object.keys(S.missions).length;
    if (!played && S.lvl === 1) return "Welcome back, June! Win mission 1 to earn <b>100</b> coins. Level 2 costs 500.";
    if (S.upg) return "Upgrade in progress. Quick Fix is free when under 5 minutes. Fancy a battle meanwhile?";
    if (S.lvl < BB.LEVEL_CAP && canAfford(S.lvl + 1)) return "You can afford <b>Level " + (S.lvl + 1) + "</b>, June! Tap Upgrade.";
    var mi = nextMission(); return "Next up: <b>" + BB.MISSIONS[mi - 1].name + "</b>. " + BB.MISSIONS[mi - 1].nova.split(".")[0] + ".";
  }
  UI.refresh = function () {
    tickFarm(); tickUpgrade();
    $("v-coins").textContent = fmt(S.coins); $("v-gems").textContent = fmt(S.gems); $("v-salv").textContent = fmt(S.salv); $("v-bp").textContent = fmt(S.bp);
    $("goal").innerHTML = goalHTML(); $("nova-text").innerHTML = novaHTML();
    var tier = BB.UPG[S.lvl].tier;
    $("mech-card").innerHTML = '<div class="pic"></div><div class="nm"><h3>BALEGUARD</h3><p>LEVEL ' + S.lvl + " &middot; " + tier.toUpperCase() + '</p><div class="bar"><i style="width:' + (S.lvl * 10) + '%"></i></div></div>' + upgBtnHTML();
    var ub = $("btn-upg"); if (ub) ub.onclick = function () { BB.audioInit(); UI.startUpgrade(); };
    var sb = $("btn-speed"); if (sb) sb.onclick = function () { BB.audioInit(); UI.speedUp(); };
    var bb = $("btn-battle"); bb.classList.toggle("pulse", !Object.keys(S.missions).length || !(S.lvl < BB.LEVEL_CAP && canAfford(S.lvl + 1)));
    if (curTab) renderPanel(curTab, true);
  };
  UI.tick = function () {
    if (!$("home").classList.contains("active")) return;
    var had = !!S.upg, fin = tickUpgrade();
    if (!fin && had) { UI.refresh(); }
    else if ($("v-coins")) { /* light refresh only for farm */ if (curTab === "farm") renderPanel("farm", true); }
  };

  // ---------- tabs / panels ----------
  function setTab(t) {
    BB.sfx("click");
    if (curTab === t) { curTab = null; $("panel").classList.add("hidden"); updateTabs(); BB.track("tab_close", {t: t}); return; }
    curTab = t; $("panel").classList.remove("hidden"); renderPanel(t); updateTabs(); BB.track("tab_view", {t: t});
  }
  function updateTabs() { var tabs = document.querySelectorAll("#tabs button"); for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("active", curTab ? tabs[i].dataset.tab === curTab : tabs[i].dataset.tab === "farm"); }
  UI.openTab = function (t) { if (curTab !== t) setTab(t); };
  function head(t, sub) { return '<h2>' + t + '</h2>' + (sub ? '<p class="sub">' + sub + "</p>" : ""); }
  function renderPanel(t, keepScroll) {
    var p = $("panel"), sc = p.scrollTop, h = "";
    if (t === "farm") h = farmHTML(); else if (t === "mechs") h = mechsHTML(); else if (t === "map") h = mapHTML(); else if (t === "shop") h = shopHTML();
    p.innerHTML = h; if (keepScroll) p.scrollTop = sc; bindPanel(t);
  }
  function farmHTML() {
    var st = Math.floor(S.farmStored), cleared = Object.keys(S.missions).filter(function (k) { return S.missions[k].wins; }).length;
    var herd = BB.ANIMALS.map(function (a, i) { return '<span class="pill ' + (i < 3 ? "g" : "") + '">' + a.name + "</span>"; }).join("");
    return head("YOUR FARM", "Islands reconnected: <b>" + cleared + "/10</b>. Win missions to bring the herd home.") +
      '<div class="card gold"><div class="row"><div class="grow"><h4>Barn &amp; Market Stall</h4><small>Makes ' + BB.FARM.perMin + " coins/min, holds " + BB.FARM.cap + ". " + (S.set.timerMul > 1 ? "(Debug speed on)" : "") + '</small>' +
      '<div class="statbar" style="margin-top:6px"><i style="width:' + Math.round(st / BB.FARM.cap * 100) + '%"></i></div><small>' + st + " / " + BB.FARM.cap + ' coins waiting</small></div>' +
      '<button class="btn ' + (st >= 1 ? "" : "off") + '" id="f-collect">COLLECT<br><span style="font-size:12px">' + st + "</span></button></div></div>" +
      '<div class="card"><h4>The Herd</h4><small>Defend them in battle. Each mission starts with 3 to 6 animals.</small><div style="margin-top:6px">' + herd + "</div></div>" +
      '<div class="card"><h4>Coming later</h4><small>Planting crops, building, decorating, farm upgrades, and expanding to new islands are <b>not in this prototype</b>. They are on the roadmap.</small></div>' +
      '<img class="boss-pic" style="border-color:#e8b14a" src="img/pilots-and-crew-v2.jpg" alt="">';
  }
  function mechsHTML() {
    var p = BB.POWER[S.lvl], nxt = S.lvl < 10 ? BB.POWER[S.lvl + 1] : null, u = S.lvl < 10 ? BB.UPG[S.lvl + 1] : null;
    var req = "";
    if (u) req = '<div class="kv" style="margin-top:6px"><span>Coins</span><b style="color:' + (S.coins >= u.coins ? "#9bffa0" : "#ff8a7a") + '">' + fmt(S.coins) + " / " + fmt(u.coins) + "</b><span>Salvage</span><b style='color:" + (S.salv >= u.salv ? "#9bffa0" : "#ff8a7a") + "'>" + fmt(S.salv) + " / " + fmt(u.salv) + "</b>" +
      (u.bp ? "<span>Blueprints</span><b style='color:" + (S.bp >= u.bp ? "#9bffa0" : "#ff8a7a") + "'>" + S.bp + " / " + u.bp + "</b>" : "") + "<span>Build time</span><b>" + (u.min ? fmtTime(u.min) : "Instant") + "</b></div>";
    var h = head("MECHS", "Baleguard is your only mech in this prototype.") +
      '<div class="card gold"><div class="row" style="align-items:flex-start"><div class="mech-pic" style="background-image:url(img/baleguard.jpg)"></div><div class="grow"><h4 style="font-size:18px">BALEGUARD</h4><small>Pilot: June Hale &middot; Level ' + S.lvl + " &middot; " + BB.UPG[S.lvl].tier + "</small>" +
      '<div style="margin-top:8px;font-size:12px">Health ' + p[0] + '%<div class="statbar"><i style="width:' + p[0] / 2 + '%"></i></div></div><div style="margin-top:6px;font-size:12px">Damage ' + p[1] + '%<div class="statbar d"><i style="width:' + p[1] / 1.8 + '%"></i></div></div></div></div>' +
      (nxt ? "<p class='muted' style='margin:8px 0 0'>Level " + (S.lvl + 1) + ": Health " + nxt[0] + "%, Damage " + nxt[1] + "%</p>" + req : "") +
      (S.upg ? '<div style="margin-top:8px"><button class="btn blue" id="mp-speed" style="width:100%">UPGRADING: ' + fmtTime(remainMin()) + " (speed up " + BB.skipGems(remainMin()) + " \u25C6)</button></div>" : (u ? '<div style="margin-top:8px"><button class="btn ' + (canAfford(S.lvl + 1) ? "" : "off") + '" id="mp-upg" style="width:100%">UPGRADE TO LEVEL ' + (S.lvl + 1) + "</button></div>" : "")) + "</div>" +
      '<div class="card"><h4>Abilities</h4><div class="kv"><b>Hay-gun</b><span>Auto-fires at the nearest enemy.</span><b>Bale Wall</b><span>Tap: a hay wall blocks enemies and beams for ' + (S.lvl >= 4 ? 5 : 4) + " s (cooldown " + (S.lvl >= 7 ? 9 : 12) + " s).</span><b>Haymaker</b><span>Ultimate. Finishing blow in the boss fight.</span></div></div>" +
      '<div class="card"><h4>Upgrade ladder</h4><table class="t"><tr><th>Lv</th><th>Tier</th><th>Coins</th><th>Salv</th><th>BP</th><th>Time</th></tr>' +
      BB.UPG.map(function (x, i) { return i < 2 ? "" : "<tr" + (i === S.lvl + 1 ? ' style="color:#ffd77a"' : "") + "><td>" + i + "</td><td>" + x.tier + "</td><td>" + fmt(x.coins) + "</td><td>" + x.salv + "</td><td>" + (x.bp || "-") + "</td><td>" + (x.min ? fmtTime(x.min) : "Instant") + "</td></tr>"; }).join("") + "</table></div>" +
      '<h2 style="margin-top:14px">LOCKED MECHS</h2><p class="sub">Concept art only. Not playable yet.</p>';
    BB.OTHER_MECHS.forEach(function (m) { h += '<div class="card"><div class="row"><div class="mech-pic locked-pic" style="width:60px;height:80px;background-image:url(img/' + m.id + '.jpg)"></div><div class="grow"><h4>' + m.name + "</h4><small>" + m.role + '</small></div><span class="pill">\uD83D\uDD12 ' + m.bp + " BP</span></div></div>"; });
    return h;
  }
  function mapHTML() {
    var h = head("MISSION MAP", "Ten islands. Clear one to unlock the next. Stars: 1 win, 2 save 60% of the herd, 3 save every animal.");
    for (var i = 1; i <= 10; i++) {
      var m = BB.MISSIONS[i - 1], rec = S.missions[i] || {}, unlocked = i === 1 || (S.missions[i - 1] && S.missions[i - 1].wins) || S.set.unlockAll, nm = nextMission() === i;
      h += '<div class="card mission ' + (m.boss ? "boss " : "") + (unlocked ? "" : "locked ") + (nm && unlocked ? "cur" : "") + '" data-m="' + i + '"><div class="num">' + (m.boss ? "\u2620" : i) + '</div><div class="grow"><h4>' + m.name + '</h4><small><span class="pill">' + (m.boss ? "BOSS" : (m.dur / 60 >= 1 ? Math.floor(m.dur / 60) + "m " + (m.dur % 60 ? m.dur % 60 + "s" : "") : m.dur + "s")) + '</span><span class="pill ' + (i > 6 ? "d" : "") + '">' + ["Easy", "Easy", "Normal", "Normal", "Normal", "Hard", "Hard", "Hard", "Brutal", "BOSS"][i - 1] + "</span>" +
        '<span class="pill g">' + m.coins + " coins</span></small><div class='stars'>" + stars(rec.stars || 0) + (rec.plays ? " <small class='muted' style='letter-spacing:0'>" + rec.wins + "/" + rec.plays + " wins</small>" : "") + '</div></div>' +
        (unlocked ? '<button class="btn" data-go="' + i + '">' + (rec.wins ? "REPLAY" : "PLAY") + "</button>" : '<span class="pill">\uD83D\uDD12</span>') + "</div>";
    }
    return h;
  }
  function shopHTML() {
    var h = head("SHOP", "") + '<div class="mock">\u26A0 PROTOTYPE MOCK. NOTHING HERE IS REAL. No payment system exists, no money can be spent, and nothing is sent anywhere. This screen only shows the planned gem price ladder so we can test the layout.</div>';
    h += '<h2 style="font-size:15px">GEM PACKS (mock)</h2>';
    BB.GEM_PACKS.forEach(function (g, i) {
      h += '<div class="card"><div class="row"><i class="ico gem" style="width:26px;height:26px"></i><div class="grow"><h4>' + fmt(g.gems) + " gems</h4><small>" + (i === 0 || true ? "First purchase doubles (planned)" : "") + '</small></div><button class="btn off" data-mock="gems-' + g.usd + '">$' + g.usd + "<br><small style='font-size:10px;color:#2a1505'>MOCK</small></button></div></div>";
    });
    h += '<h2 style="font-size:15px;margin-top:12px">OFFERS (mock)</h2><div class="card"><div class="row"><div class="grow"><h4>Rancher Starter</h4><small>Planned one-time starter pack.</small></div><button class="btn off" data-mock="rancher">$1.99<br><small style="font-size:10px;color:#2a1505">MOCK</small></button></div></div>' +
      '<div class="card"><div class="row"><div class="grow"><h4>Second Wind</h4><small>Revive in battle. This one really costs <b>30 play-gems</b> in the prototype.</small></div><span class="pill">30 \u25C6</span></div></div>' +
      '<h2 style="font-size:15px;margin-top:12px">UPGRADE SPEED-UPS</h2><div class="card"><small>1 h = 20 \u25C6 &middot; 8 h = 100 \u25C6 &middot; 1 day = 220 \u25C6 &middot; under 5 min free (Nova\'s Quick Fix). Play-gems only.</small></div>';
    return h;
  }
  function bindPanel(t) {
    var p = $("panel");
    var col = $("f-collect"); if (col) col.onclick = function () { tickFarm(); var n = Math.floor(S.farmStored); if (n < 1) { BB.sfx("deny"); return; } S.coins += n; S.farmStored -= n; BB.sfx("coin"); BB.sfx("coin"); BB.track("farm_collect", {n: n}); toast("+" + n + " coins from the barn"); BB.save(); UI.refresh(); };
    var mu = $("mp-upg"); if (mu) mu.onclick = function () { UI.startUpgrade(); };
    var ms = $("mp-speed"); if (ms) ms.onclick = function () { UI.speedUp(); };
    [].forEach.call(p.querySelectorAll("[data-mock]"), function (b) { b.onclick = function () { BB.sfx("deny"); BB.track("shop_mock_tap", {item: b.dataset.mock}); toast("MOCK ONLY. No real payments exist in this prototype."); }; });
    [].forEach.call(p.querySelectorAll("[data-go]"), function (b) { b.onclick = function (ev) { ev.stopPropagation(); UI.briefing(+b.dataset.go); }; });
  }

  // ---------- battle flow ----------
  UI.briefing = function (mi) {
    BB.audioInit(); var m = BB.MISSIONS[mi - 1];
    if (mi > 1 && !(S.missions[mi - 1] && S.missions[mi - 1].wins) && !S.set.unlockAll) { toast("Clear the previous island first!"); return; }
    var h = "";
    if (m.boss) h += '<img class="boss-pic" src="img/vorlax-boss.jpg" alt="Vorlax">';
    h += '<h1 class="' + (m.boss ? "lose" : "win") + '" style="font-size:22px">' + (m.boss ? "BOSS: " : "MISSION " + mi + ": ") + m.name.toUpperCase() + "</h1>" +
      '<div class="goal" style="text-align:left"><b style="color:#0a7a8a">Nova:</b> ' + m.nova + "</div>" +
      "<p class='muted' style='margin:6px 0'>" + (m.boss ? "3 phases: Ark emitters, the King's slam, the Eclipse. Win by finishing Vorlax." : "Survive " + (m.dur >= 60 ? Math.floor(m.dur / 60) + " min" + (m.dur % 60 ? " " + m.dur % 60 + " s" : "") : m.dur + " s") + " and keep the herd and silos safe.") + " Reward: <b>" + m.coins + " coins</b>, " + m.salv + " salvage" + (m.bp ? ", " + m.bp + " blueprints" : "") + ".</p>" +
      '<p class="muted" style="margin:0 0 6px">Controls: drag to move, Bale Wall button (or Space) to block.</p>' +
      '<div class="btns"><button class="btn sec" id="m-no">BACK</button><button class="btn" id="m-go">GO!</button></div>';
    modal(h); $("m-no").onclick = closeModal; $("m-go").onclick = function () { closeModal(); UI.startBattle(mi); };
  };
  UI.startBattle = function (mi) {
    $("home").classList.remove("active"); if ($("base")) $("base").classList.remove("active"); $("battle").classList.add("active");
    var q = new URLSearchParams(location.search); BB.Battle.bot = q.get("bot") === "1"; BB.Battle.timeScale = +(q.get("fast") || 1);
    if (window.__bbFast) BB.Battle.timeScale = window.__bbFast;
    BB.Battle.start(mi, {}, function (res) { onBattleEnd(mi, res); });
  };
  function goHome() { BB.Battle.stop(); $("battle").classList.remove("active"); closeModal(); if (BB.fromCC && BB.CCUI) { BB.fromCC = false; UI.refresh(); BB.CCUI.show(); return; } $("home").classList.add("active"); UI.refresh(); }
  function onBattleEnd(mi, res) {
    if (res.quit) { goHome(); return; }
    if (res.offer) {
      modal("<h1 class='lose'>BALEGUARD IS DOWN!</h1><p style='text-align:center'>Use <b>Second Wind</b> to revive with full health and blast nearby enemies?<br><small class='muted'>30 play-gems (you have " + S.gems + "). Gems are not real money.</small></p>" +
        '<div class="btns"><button class="btn sec" id="m-no">GIVE UP</button><button class="btn blue ' + (S.gems >= 30 ? "" : "off") + '" id="m-yes">SECOND WIND 30 \u25C6</button></div>');
      $("m-no").onclick = function () { closeModal(); BB.Battle.decline(); };
      $("m-yes").onclick = function () { if (S.gems < 30) { BB.sfx("deny"); toast("Not enough gems. Mock shop cannot sell any."); return; } S.gems -= 30; BB.save(); closeModal(); BB.Battle.revive(); };
      return;
    }
    var m = BB.MISSIONS[mi - 1], rec = S.missions[mi] || (S.missions[mi] = {stars: 0, wins: 0, plays: 0}), first = !rec.wins && res.win, prevStars = rec.stars || 0;
    rec.plays++; if (res.win) { rec.wins++; rec.stars = Math.max(rec.stars || 0, res.stars); }
    var mul = S.set.rewardMul || 1, baseC = res.win ? m.coins : 0, baseS = res.win ? m.salv : 0, bp = res.win ? m.bp : 0;
    var lootC = res.win ? res.lootCoins : Math.floor(res.lootCoins / 2), lootS = res.win ? res.lootSalv : Math.floor(res.lootSalv / 2);
    var coins = Math.round((baseC + lootC) * mul), salv = Math.round((baseS + lootS) * mul), gems = 0;
    if (res.win) { gems = (first ? 15 : 0) + Math.max(0, res.stars - prevStars) * 5; }
    var before = {coins: S.coins}; S.coins += coins; S.salv += salv; S.bp += bp * (res.win ? 1 : 0); S.gems += gems; BB.save();
    BB.track("mission_end", {m: mi, win: res.win, sec: res.time, saved: res.saved, total: res.total, stars: res.stars, why: res.why || "", coins: coins, lvl: S.lvl, revive: res.usedRevive ? 1 : 0});
    if (res.win) { if (mi === 10) BB.track("game_beaten", {sec: Math.round((Date.now() - S.created) / 1000)}); }
    var nextIn = !res.win ? "" : mi < 10 ? '<button class="btn" id="m-next">NEXT ISLAND</button>' : "";
    var lvlGoal = "";
    if (S.lvl < BB.LEVEL_CAP && !S.upg) { var u = BB.UPG[S.lvl + 1]; lvlGoal = S.coins >= u.coins && S.salv >= u.salv && S.bp >= u.bp ? "You can afford <b>Level " + (S.lvl + 1) + "</b> now! Go upgrade." : "NEXT GOAL: you have <b>" + fmt(S.coins) + "</b> coins. Level " + (S.lvl + 1) + " costs <b>" + fmt(u.coins) + "</b>. Next mission awards <b>" + BB.MISSIONS[Math.min(9, nextMission() - 1)].coins + "</b>."; }
    var why = {mech: "Baleguard was overwhelmed.", herd: "The whole herd was lost.", silos: "Every silo was drained."}[res.why] || "";
    var ic = function (n) { return '<i class="ic i-' + n + '"></i>'; };
    var h = '<div class="rib ' + (res.win ? "win" : "lose") + '"><span style="font-size:' + (mi === 10 && res.win ? 19 : 27) + 'px">' + (res.win ? (mi === 10 ? "VORLAX DEFEATED!" : "VICTORY!") : "DEFEAT") + "</span></div>" +
      (res.win ? '<div class="bigstars" id="m-stars">' + starImgs(0) + "</div>" : '<p class="muted" style="text-align:center;margin:2px 0">' + why + "</p>") +
      '<div class="loot"><span>' + ic("cow") + 'Herd saved</span><span>' + res.saved + "/" + res.total + "</span>" + (res.win ? "<span>" + ic("coin") + "Mission reward</span><span>+" + Math.round(baseC * mul) + " coins</span>" : "") +
      "<span>" + ic("coin") + "Loot picked up</span><span>+" + Math.round(lootC * mul) + " coins</span><span>" + ic("scrap") + "Salvage</span><span>+" + salv + "</span>" + (bp ? "<span>" + ic("wrench") + "Blueprints</span><span>+" + bp + "</span>" : "") + (gems ? "<span>" + ic("gem") + "Gems</span><span>+" + gems + "</span>" : "") +
      "<span>" + ic("clock") + "Time</span><span>" + Math.floor(res.time / 60) + ":" + ("0" + res.time % 60).slice(-2) + "</span></div>" +
      (mul > 1 ? "<p class='muted' style='text-align:center;margin:0'>Debug reward x" + mul + " applied</p>" : "") +
      (lvlGoal ? '<div class="goal banner">' + lvlGoal + "</div>" : "") +
      (res.win && BB.MEMORY[mi - 1] ? "<p class='muted' style='font-style:italic;text-align:center;margin:4px 0'>" + BB.MEMORY[mi - 1] + "</p>" : "") +
      '<div class="btns"><button class="btn sec" id="m-home">HOME</button>' + (res.win ? nextIn : '<button class="btn" id="m-retry">RETRY</button>') + "</div>";
    modal(h);
    if (res.win) { var n = 0; var iv = setInterval(function () { if (n >= res.stars) { clearInterval(iv); return; } n++; BB.sfx("star"); var el = $("m-stars"); if (el) el.innerHTML = starImgs(n); }, 380); }
    $("m-home").onclick = goHome; var rb = $("m-retry"); if (rb) rb.onclick = function () { goHome(); UI.startBattle(mi); };
    var nb = $("m-next"); if (nb) nb.onclick = function () { goHome(); UI.briefing(mi + 1); };
    UI.refresh();
  }

  // ---------- settings / debug / playtest data ----------
  function settings() {
    var r = BB.report();
    var h = '<h1 class="win" style="font-size:22px">SETTINGS</h1><div class="card"><div class="row"><div class="grow"><h4>Sound</h4></div><button class="btn sec" id="s-mute">' + (S.set.mute ? "OFF" : "ON") + "</button></div></div>" +
      '<div class="card"><h4>Playtest data <small class="muted">(stored only on this device)</small></h4><div class="kv"><span>Sessions</span><b>' + r.sessions + "</b><span>Days played</span><b>" + r.daysPlayed + " (" + r.firstDay + ")</b><span>D1 retention</span><b>" + r.D1 + "</b><span>D7 retention</span><b>" + r.D7 + "</b><span>Avg session</span><b>" + fmtTime(r.avgSessionSec / 60) + "</b><span>Missions played</span><b>" + r.missionEnds + "</b><span>Win rate</span><b>" + r.winRate + "</b><span>Events logged</span><b>" + r.eventCount + "</b></div>" +
      '<div style="margin-top:6px"><button class="btn sec" id="s-copy">COPY JSON</button> <button class="btn sec" id="s-dl">DOWNLOAD</button></div></div>' +
      '<div class="card dbg"><h4>Debug / testing</h4><div>Upgrade &amp; farm timers: ' + [1, 60, 100000].map(function (v) { return '<button class="btn sec" data-tm="' + v + '"' + (S.set.timerMul === v ? ' style="outline:2px solid #ffd35a"' : "") + ">" + (v === 1 ? "Real" : v === 60 ? "x60" : "Instant") + "</button>"; }).join("") + "</div>" +
      "<div>Reward multiplier: " + [1, 5].map(function (v) { return '<button class="btn sec" data-rm="' + v + '"' + (S.set.rewardMul === v ? ' style="outline:2px solid #ffd35a"' : "") + ">x" + v + "</button>"; }).join("") + "</div>" +
      '<div><button class="btn sec" id="d-coins">+10,000 coins</button><button class="btn sec" id="d-gems">+500 gems</button><button class="btn sec" id="d-mats">+200 salv/+30 BP</button><button class="btn sec" id="d-unlock">Unlock all missions</button></div></div>' +
      (BB.CCUI ? BB.CCUI.debugHTML() : "") +
      '<div class="card"><h4>Install on your phone</h4><small>Open this page in Chrome (Android) or Safari (iOS), then use <b>Add to Home Screen</b>. It then runs full-screen and works offline. Installing needs https (a hosted link), not a plain local address.</small></div>' +
      '<div class="card"><button class="btn sec" id="s-reset" style="background:#6b2230;border-color:#ff8a8a">RESET SAVE &amp; DATA</button><small class="muted"> v' + BB.VERSION + " &middot; prototype</small></div>" +
      '<div class="btns"><button class="btn" id="s-close">CLOSE</button></div>';
    modal(h);
    $("s-close").onclick = closeModal; $("s-mute").onclick = function () { S.set.mute = !S.set.mute; BB.save(); settings(); };
    $("s-copy").onclick = function () { var j = JSON.stringify({report: BB.report(), events: BB.events(), save: S}, null, 1); if (navigator.clipboard) navigator.clipboard.writeText(j).then(function () { toast("Copied JSON"); }, function () { toast("Copy blocked: use Download"); }); else toast("Use Download"); };
    $("s-dl").onclick = function () { var b = new Blob([JSON.stringify({report: BB.report(), events: BB.events(), save: S}, null, 1)], {type: "application/json"}), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "barns-and-bots-playtest.json"; a.click(); };
    [].forEach.call(document.querySelectorAll("[data-tm]"), function (b) { b.onclick = function () { S.set.timerMul = +b.dataset.tm; BB.save(); settings(); }; });
    [].forEach.call(document.querySelectorAll("[data-rm]"), function (b) { b.onclick = function () { S.set.rewardMul = +b.dataset.rm; BB.save(); settings(); }; });
    $("d-coins").onclick = function () { S.coins += 10000; BB.save(); UI.refresh(); toast("+10,000 coins"); };
    $("d-gems").onclick = function () { S.gems += 500; BB.save(); UI.refresh(); toast("+500 gems"); };
    $("d-mats").onclick = function () { S.salv += 200; S.bp += 30; BB.save(); UI.refresh(); toast("+200 salvage, +30 blueprints"); };
    $("d-unlock").onclick = function () { S.set.unlockAll = true; BB.save(); UI.refresh(); toast("All missions unlocked"); };
    $("s-reset").onclick = function () { if (confirm("Erase save AND playtest data?")) BB.reset(); };
    if (BB.CCUI) BB.CCUI.debugBind();
  }

  UI.settings = settings;
  // ---------- init ----------
  UI.init = function () {
    [].forEach.call(document.querySelectorAll("#tabs button"), function (b) { b.onclick = function () { BB.audioInit(); setTab(b.dataset.tab); }; });
    [].forEach.call(document.querySelectorAll("[data-go]"), function (b) { b.onclick = function () { BB.audioInit(); UI.openTab(b.dataset.go); }; });
    $("btn-battle").onclick = function () { BB.audioInit(); UI.briefing(nextMission()); };
    $("btn-gear").onclick = function () { BB.audioInit(); BB.sfx("click"); settings(); };
    $("modal").addEventListener("pointerdown", function (e) { if (e.target === $("modal") && $("modal").querySelector("#m-no, #s-close")) closeModal(); });
    function fit() { $("panel").style.top = ($("home").querySelector(".topbar").offsetHeight + 6) + "px"; $("nova").style.top = ($("home").querySelector(".topbar").offsetHeight + 8) + "px"; }
    fit(); window.addEventListener("resize", fit);
    UI.refresh(); setInterval(UI.tick, 1000);
  };
})();
