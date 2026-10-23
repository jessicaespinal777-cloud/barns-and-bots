"use strict";
// ---- v0.7 base minigame: "Scare the Crows" (tap / swipe crows off the crop plots). Daily bonus once per day, free practice after. Original art + code. ----
(function () {
  var M = BB.MINI = {}, DUR = 25, W = 360, H = 560, cv, cx, el, raf = 0, st = null, pt = null;
  var PLOTS = [[70, 250], [180, 250], [290, 250], [70, 380], [180, 380], [290, 380]];
  function X() { return BB.CCUI; }
  function sfx(n) { BB.sfx && BB.sfx(n); }
  function hz(p) { BB.vibe && BB.vibe(p); }
  function today() { return new Date().toDateString(); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function build() {
    if (el) return; el = document.createElement("div"); el.id = "mini"; el.className = "hidden";
    el.innerHTML = '<div class="mini-box"><div class="mini-top"><b id="mini-t">25</b><span id="mini-s">0</span><button id="mini-x" aria-label="Close">&times;</button></div><canvas id="mini-cv"></canvas><div class="mini-hint" id="mini-h">Tap or swipe the crows. Do not touch the hens!</div></div>';
    document.body.appendChild(el); cv = document.getElementById("mini-cv"); cx = cv.getContext("2d");
    document.getElementById("mini-x").onclick = function () { M.close(); };
    cv.addEventListener("pointerdown", function (e) { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} pt = {id: e.pointerId}; hit(e, true); });
    cv.addEventListener("pointermove", function (e) { if (pt && pt.id === e.pointerId) hit(e, false); });
    cv.addEventListener("pointerup", function () { pt = null; }); cv.addEventListener("pointercancel", function () { pt = null; });
  }
  function fit() { var r = cv.parentNode.getBoundingClientRect(), k = Math.min(r.width / W, (r.height - 70) / H), dpr = Math.min(2, window.devicePixelRatio || 1); cv.style.width = W * k + "px"; cv.style.height = H * k + "px"; cv.width = W * k * dpr; cv.height = H * k * dpr; cx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0); }
  M.start = function () {
    build(); var c = X().cc(); c.mini = c.mini || {day: "", best: 0, done: 0, plays: 0}; el.classList.remove("hidden"); fit();
    st = {t: 0, score: 0, combo: 0, best: 0, lost: 0, crows: [], hens: [], parts: [], pop: [], plots: PLOTS.map(function (p) { return {x: p[0], y: p[1], bare: 0}; }), nxt: 0.6, over: false, ended: 0, last: performance.now(), shake: 0, hn: 0};
    st.hens.push({x: 60, y: 480, vx: 18, ph: 0}, {x: 290, y: 495, vx: -14, ph: 2});
    document.getElementById("mini-h").textContent = "Tap or swipe the crows. Do not touch the hens!"; sfx("honk"); hz(12);
    if (BB.music) BB.music("base"); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  };
  M.close = function () { cancelAnimationFrame(raf); raf = 0; if (el) el.classList.add("hidden"); st = null; X().refresh && X().refresh(); };
  function toLocal(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  function hit(e, first) {
    if (!st || st.over) return; var p = toLocal(e), i, got = false;
    for (i = st.crows.length - 1; i >= 0; i--) { var c = st.crows[i]; if (c.fl) continue; if (Math.hypot(p[0] - c.x, p[1] - (c.y - 8)) < (c.gold ? 30 : 28)) { scare(c); got = true; } }
    if (!got) for (i = 0; i < st.hens.length; i++) { var h = st.hens[i]; if (!h.pan && Math.hypot(p[0] - h.x, p[1] - (h.y - 8)) < 24 && first !== undefined) { h.pan = 1.2; st.score = Math.max(0, st.score - 2); st.combo = 0; st.shake = 4; sfx("cluck"); sfx("deny"); hz([30, 30]); pop(h.x, h.y - 26, "-2 OUCH", "#ff8a8a"); for (var q = 0; q < 8; q++) feather(h.x, h.y - 10, "#fff"); } }
    if (!got && first) sfx("tick");
  }
  function scare(c) {
    c.fl = 1; c.vx = (c.x < 180 ? -1 : 1) * rnd(160, 230); c.vy = -rnd(140, 220); st.combo++; st.best = Math.max(st.best, st.combo);
    var pts = (c.gold ? 3 : 1) + (st.combo >= 5 ? 1 : 0) + (st.combo >= 10 ? 1 : 0); st.score += pts; sfx(c.gold ? "coin" : "honk"); hz(c.gold ? [10, 20, 20] : 8); st.shake = Math.max(st.shake, c.gold ? 4 : 1.5);
    pop(c.x, c.y - 30, "+" + pts + (st.combo >= 5 ? " x" + st.combo : ""), c.gold ? "#ffe65a" : "#fff"); for (var q = 0; q < 9; q++) feather(c.x, c.y - 8, c.gold ? "#ffd35a" : "#2a2438");
    if (c.pl) c.pl.busy = 0; document.getElementById("mini-s").textContent = st.score;
  }
  function feather(x, y, col) { if (st.parts.length < 80) st.parts.push({x: x, y: y, vx: rnd(-90, 90), vy: rnd(-130, -20), l: rnd(0.4, 0.9), c: col, r: rnd(0, 6)}); }
  function pop(x, y, s, c) { st.pop.push({x: x, y: y, s: s, c: c, t: 0}); }
  function spawn() {
    var free = st.plots.filter(function (p) { return !p.busy && p.bare <= 0; }); if (!free.length) return; var pl = free[Math.floor(Math.random() * free.length)], left = Math.random() < 0.5;
    pl.busy = 1; st.crows.push({x: left ? -30 : W + 30, y: rnd(40, 160), tx: pl.x, ty: pl.y, pl: pl, s: "in", tm: 0, peck: rnd(2.0, 2.8) - Math.min(0.7, st.t * 0.02), gold: Math.random() < 0.09, ph: rnd(0, 6)});
  }
  function step(dt) {
    st.t += dt; var left = DUR - st.t, i;
    if (left <= 0) { if (!st.over) end(); }
    if (!st.over) { st.nxt -= dt; if (st.nxt <= 0) { spawn(); st.nxt = Math.max(0.38, 1.05 - st.t * 0.026) * rnd(0.7, 1.2); if (Math.random() < 0.12) spawn(); } }
    st.crows.forEach(function (c) {
      c.tm += dt; c.ph += dt * 14;
      if (c.fl) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 120 * dt; c.rm = c.x < -50 || c.x > W + 50 || c.y < -60; }
      else if (c.s === "in") { var dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy), sp = 230; if (d < 6) { c.s = "peck"; c.tm = 0; sfx("tick"); } else { c.x += dx / d * sp * dt; c.y += dy / d * sp * dt; } }
      else if (c.s === "peck") { if (c.tm >= c.peck) { c.s = "steal"; c.tm = 0; c.pl.bare = 4; c.pl.busy = 0; st.lost++; st.combo = 0; st.shake = 5; sfx("deny"); hz([40, 30, 40]); pop(c.x, c.y - 30, "STOLEN!", "#ff6a6a"); c.fl = 1; c.vx = (c.x < 180 ? -1 : 1) * 120; c.vy = -90; c.laugh = 1; } }
    });
    st.crows = st.crows.filter(function (c) { return !c.rm; });
    st.plots.forEach(function (p) { if (p.bare > 0) p.bare -= dt; });
    st.hens.forEach(function (h) { h.ph += dt * 5; h.x += h.vx * dt; if (h.x < 30 || h.x > W - 30) h.vx *= -1; if (h.pan > 0) h.pan -= dt; });
    st.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.l -= dt; }); st.parts = st.parts.filter(function (p) { return p.l > 0; });
    st.pop.forEach(function (p) { p.t += dt; p.y -= 30 * dt; }); st.pop = st.pop.filter(function (p) { return p.t < 0.8; });
    st.shake *= Math.pow(0.002, dt);
    document.getElementById("mini-t").textContent = Math.max(0, Math.ceil(left));
    if (st.over && performance.now() - st.ended > 900 && !st.shown) { st.shown = 1; result(); }
  }
  function end() { st.over = true; st.ended = performance.now(); sfx("perfect"); hz([20, 30, 60]); st.crows.forEach(function (c) { if (!c.fl) { c.fl = 1; c.vx = (c.x < 180 ? -1 : 1) * 200; c.vy = -150; if (c.pl) c.pl.busy = 0; } }); }
  function result() {
    var c = X().cc(), m = c.mini, first = m.day !== today(), cropsLeft = 6 - st.lost, sc = st.score, coins = 0, salv = 0, txt;
    m.plays++; m.best = Math.max(m.best, sc);
    if (first) { coins = Math.min(900, 140 + sc * 30 + cropsLeft * 20); salv = Math.min(10, Math.floor(sc / 4)); m.day = today(); m.done++; var g = X().giveCapped(coins, salv); coins = g[0]; salv = g[1]; X().save && X().save(); txt = "Daily bonus: +" + X().fmt(coins) + " coins" + (salv ? ", +" + salv + " salvage" : "") + "."; sfx("coin"); if (BB.FX) BB.FX.confetti && BB.FX.confetti(180, 260, 40, false); }
    else txt = "Daily bonus already collected. Free practice run.";
    st.res = {score: sc, coins: coins, salv: salv, first: first};
    var box = el.querySelector(".mini-box"), d = document.createElement("div"); d.className = "mini-res"; d.innerHTML = "<h2>" + (sc >= 25 ? "SCARECROW LEGEND" : sc >= 14 ? "FIELD GUARDIAN" : sc >= 6 ? "NICE SHOOING" : "THE CROWS WON") + "</h2><p>Crows scared <b>" + sc + "</b> &middot; best combo <b>" + st.best + "</b> &middot; crops saved <b>" + cropsLeft + "/6</b></p><p class=\"gold\">" + txt + "</p><button class=\"btn\" id=\"mini-again\">PLAY AGAIN</button> <button class=\"btn sec\" id=\"mini-done\">BACK TO FARM</button>";
    box.appendChild(d); document.getElementById("mini-again").onclick = function () { box.removeChild(d); M.start(); }; document.getElementById("mini-done").onclick = function () { M.close(); };
    try { BB.track && BB.track("mini_crows", {score: sc, first: first ? 1 : 0}); } catch (e) {}
  }
  function drawCrow(c) {
    var fly = c.fl || c.s === "in", wing = Math.sin(c.ph) * (fly ? 0.9 : 0.15), s = c.gold ? 1.25 : 1, body = c.gold ? "#e8b52e" : "#2a2438", dir = (c.fl ? c.vx : c.tx - c.x) >= 0 ? 1 : -1, pk = c.s === "peck" ? Math.abs(Math.sin(c.tm * 12)) * 6 : 0;
    cx.save(); cx.translate(c.x, c.y); cx.scale(dir * s, s); cx.fillStyle = "rgba(0,0,0,.2)"; cx.beginPath(); cx.ellipse(0, 8 + (fly ? 20 : 0), 12, 3, 0, 0, 6.3); cx.fill();
    cx.fillStyle = body; cx.strokeStyle = "#0e0a18"; cx.lineWidth = 1.5; cx.beginPath(); cx.ellipse(0, -8, 12, 9, 0, 0, 6.3); cx.fill(); cx.stroke();
    cx.save(); cx.translate(-2, -10); cx.rotate(-0.4 - wing); cx.fillStyle = c.gold ? "#c89420" : "#3a3250"; cx.beginPath(); cx.ellipse(-4, 0, 11, 5, 0, 0, 6.3); cx.fill(); cx.stroke(); cx.restore();
    cx.beginPath(); cx.arc(9, -14 + pk, 6, 0, 6.3); cx.fill(); cx.stroke(); cx.fillStyle = "#ffb531"; cx.beginPath(); cx.moveTo(14, -15 + pk); cx.lineTo(21, -12 + pk); cx.lineTo(14, -11 + pk); cx.fill(); cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(10, -16 + pk, 2, 0, 6.3); cx.fill(); cx.fillStyle = "#000"; cx.beginPath(); cx.arc(10.8, -16 + pk, 1, 0, 6.3); cx.fill();
    cx.fillStyle = body; cx.beginPath(); cx.moveTo(-11, -9); cx.lineTo(-20, -6); cx.lineTo(-11, -4); cx.fill();
    if (c.s === "peck") { var k = c.tm / c.peck; cx.restore(); cx.fillStyle = "rgba(0,0,0,.5)"; cx.fillRect(c.x - 14, c.y - 38, 28, 4); cx.fillStyle = k > 0.7 ? "#ff5a4a" : "#ffd35a"; cx.fillRect(c.x - 14, c.y - 38, 28 * k, 4); return; }
    cx.restore();
  }
  function draw() {
    var sx = st.shake ? rnd(-st.shake, st.shake) : 0, sy = st.shake ? rnd(-st.shake, st.shake) : 0; cx.save(); cx.translate(sx, sy);
    var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#8fd3ff"); g.addColorStop(0.32, "#d9f1ff"); g.addColorStop(0.33, "#8bc65a"); g.addColorStop(1, "#5a9b3c"); cx.fillStyle = g; cx.fillRect(-10, -10, W + 20, H + 20);
    cx.fillStyle = "#6fae45"; for (var r = 0; r < 8; r++) { cx.fillRect(-10, 190 + r * 44, W + 20, 20); }
    cx.fillStyle = "#b25a3a"; cx.fillRect(0, 150, W, 40); cx.fillStyle = "#8f4528"; for (r = 0; r < 12; r++) cx.fillRect(r * 32 + 4, 150, 3, 40);
    st.plots.forEach(function (p) {
      cx.fillStyle = "#6a4423"; cx.beginPath(); cx.ellipse(p.x, p.y + 10, 40, 16, 0, 0, 6.3); cx.fill();
      if (p.bare > 0) { cx.fillStyle = "#4a2f18"; cx.beginPath(); cx.ellipse(p.x, p.y + 10, 30, 10, 0, 0, 6.3); cx.fill(); cx.fillStyle = "#fff"; cx.font = "bold 11px sans-serif"; cx.textAlign = "center"; cx.fillText("EATEN", p.x, p.y + 14); return; }
      for (var i = -2; i <= 2; i++) { var sw = Math.sin(st.t * 2 + i + p.x) * 1.5; cx.strokeStyle = "#3f8a2a"; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(p.x + i * 12, p.y + 12); cx.quadraticCurveTo(p.x + i * 12 + sw, p.y, p.x + i * 12 + sw * 1.5, p.y - 12); cx.stroke(); cx.fillStyle = "#ffcf4a"; cx.beginPath(); cx.arc(p.x + i * 12 + sw * 1.5, p.y - 14, 4, 0, 6.3); cx.fill(); }
    });
    st.hens.forEach(function (h) { var d = h.vx >= 0 ? 1 : -1, bob = Math.abs(Math.sin(h.ph)) * 2; cx.save(); cx.translate(h.x, h.y - bob); cx.scale(d, 1); if (h.pan > 0) cx.rotate(Math.sin(st.t * 40) * 0.2); cx.fillStyle = "rgba(0,0,0,.2)"; cx.beginPath(); cx.ellipse(0, 8 + bob, 12, 3, 0, 0, 6.3); cx.fill(); cx.fillStyle = "#fff6e4"; cx.strokeStyle = "#7a5a3a"; cx.lineWidth = 1.5; cx.beginPath(); cx.ellipse(0, -8, 13, 10, 0, 0, 6.3); cx.fill(); cx.stroke(); cx.beginPath(); cx.arc(10, -17, 6, 0, 6.3); cx.fill(); cx.stroke(); cx.fillStyle = "#e0433a"; cx.beginPath(); cx.arc(10, -24, 3, 0, 6.3); cx.fill(); cx.fillStyle = "#ffb531"; cx.beginPath(); cx.moveTo(15, -17); cx.lineTo(20, -15); cx.lineTo(15, -14); cx.fill(); cx.fillStyle = "#000"; cx.beginPath(); cx.arc(11, -18, 1.1, 0, 6.3); cx.fill(); cx.restore(); });
    st.crows.slice().sort(function (a, b) { return a.y - b.y; }).forEach(drawCrow);
    st.parts.forEach(function (p) { cx.save(); cx.globalAlpha = Math.min(1, p.l * 2); cx.translate(p.x, p.y); cx.rotate(p.r + p.l * 8); cx.fillStyle = p.c; cx.fillRect(-1.5, -4, 3, 8); cx.restore(); });
    cx.font = "bold 16px sans-serif"; cx.textAlign = "center"; st.pop.forEach(function (p) { cx.globalAlpha = Math.max(0, 1 - p.t / 0.8); cx.strokeStyle = "#1a1220"; cx.lineWidth = 4; cx.strokeText(p.s, p.x, p.y); cx.fillStyle = p.c; cx.fillText(p.s, p.x, p.y); cx.globalAlpha = 1; });
    if (st.combo >= 3 && !st.over) { cx.font = "bold 22px sans-serif"; cx.fillStyle = "#ffe65a"; cx.strokeStyle = "#5a2a00"; cx.lineWidth = 4; cx.strokeText("COMBO x" + st.combo, W / 2, 60); cx.fillText("COMBO x" + st.combo, W / 2, 60); }
    cx.restore();
  }
  function loop(t) { if (!st) return; var dt = Math.min(0.05, (t - st.last) / 1000); st.last = t; step(dt); if (st) { draw(); raf = requestAnimationFrame(loop); } }
  M.state = function () { return st; };
  var b = document.getElementById("b-crow"); if (b) b.onclick = function () { sfx("click"); M.start(); };
})();
