"use strict";
// ---- v0.8 anime-style cut-ins: burst overlays in raids and the hero-reveal sequence for summons. DOM/CSS only; respects the reduced-flashing toggle. ----
(function () {
  var CUT = (BB.CUT = {}), D = BB.SQD, S = BB.S, el, tmr = 0, rv = null;
  function calm() { return !!(S.set && S.set.calm); }
  function stars(n) { var h = ""; for (var i = 0; i < n; i++) h += '<img class="cs" style="animation-delay:' + (0.15 + i * 0.12).toFixed(2) + 's" src="assets/ui_star.webp" alt="">'; return h; }
  CUT.stars = stars;
  function build() {
    if (el) return; el = document.createElement("div"); el.id = "cut"; el.className = "hidden"; (document.getElementById("app") || document.body).appendChild(el);
  }
  // ---- burst cut-in (non-blocking: the battle keeps running underneath) ----
  CUT.burst = function (e) {
    build(); var u = D.U[e.id]; if (!u) return; var E = D.EL[u.el], dur = e.n > 1 ? 720 : 980; if (calm()) dur = 700;
    el.className = "burst" + (calm() ? " calm" : "") + (e.full ? " full" : "") + (e.n > 1 ? " chain" : "");
    el.style.setProperty("--ec", E.col); el.style.setProperty("--ed", E.dk); el.setAttribute("data-el", E.id);
    var chain = e.n > 1 ? '<div class="cut-chain">CHAIN x' + e.n + (e.dist >= 3 ? " &middot; TRIAD" : "") + "</div>" : "";
    el.innerHTML = '<div class="cut-band"></div><div class="cut-lines"></div><div class="cut-art" style="background-image:url(' + u.art + ')"></div><div class="cut-txt"><small>' + E.n.toUpperCase() + " &middot; " + u.nm + "</small><b>" + u.bn + "</b>" + chain + (e.em > 1 ? "<i>ADVANTAGE x1.5</i>" : e.em < 1 ? "<i class=\"w\">resisted x0.7</i>" : "") + (e.full ? "<em>FULL BURST</em>" : "") + "</div>";
    void el.offsetWidth; el.classList.add("go"); clearTimeout(tmr); tmr = setTimeout(function () { el.className = "hidden"; el.innerHTML = ""; }, dur);
  };
  CUT.hide = function () { clearTimeout(tmr); if (el) { el.className = "hidden"; el.innerHTML = ""; } };
  // ---- hero reveal / summon sequence ----
  CUT.reveal = function (items, done) {
    build(); var best = 3; items.forEach(function (r) { if (r.st > best) best = r.st; });
    var box = document.getElementById("reveal"); if (!box) { box = document.createElement("div"); box.id = "reveal"; (document.getElementById("app") || document.body).appendChild(box); } box.className = (calm() ? "calm " : "") + "r" + best; box.style.display = "flex";
    var seq = items.filter(function (r) { return r.st >= 4; }), step = -1;
    function fin() { box.style.display = "none"; box.innerHTML = ""; rv = null; done && done(); }
    function orb() {
      box.innerHTML = '<div class="rv-orb"><i></i></div><div class="rv-tap">Tap to open</div><button class="rv-skip" id="rv-skip">SKIP</button>'; BB.sfx && BB.sfx("charge");
      box.onclick = function (ev) { if (ev.target.id === "rv-skip") { sum(); return; } next(); }; var a = setTimeout(function () { if (step === -1) next(); }, 2600); rv = a;
    }
    function card(r) {
      var u = D.U[r.id], E = D.EL[u.el]; box.className = (calm() ? "calm " : "") + "r" + r.st; box.style.setProperty("--ec", E.col); box.style.setProperty("--ed", E.dk);
      box.innerHTML = '<div class="rv-rays"></div><div class="rv-card"><div class="rv-art" style="background-image:url(' + u.art + ')"></div><div class="rv-info"><div class="rv-st">' + stars(r.st) + '</div><b>' + u.nm + '</b><span class="rv-el">' + E.n + " &middot; Leader: " + u.ls.n + "</span>" + (r.nw ? '<em class="rv-new">NEW!</em>' : '<em class="rv-dup">Duplicate: +1 shard, +1 spare part</em>') + "</div></div><div class=\"rv-tap\">Tap to continue</div><button class=\"rv-skip\" id=\"rv-skip\">SKIP</button>";
      BB.sfx && BB.sfx(r.st === 5 ? "fanfare" : "stingwin"); BB.vibe && BB.vibe(r.st === 5 ? [30, 40, 30, 40, 80] : [20, 30]);
      if (BB.FX && !calm()) { BB.FX.confetti && BB.FX.confetti(innerWidth / 2, innerHeight * 0.35, r.st === 5 ? 80 : 30, true); }
    }
    function sum() {
      box.className = (calm() ? "calm " : "") + "sum"; var h = '<div class="rv-sumt">SUMMON RESULTS</div><div class="rv-grid">';
      items.forEach(function (r, i) { var u = D.U[r.id]; h += '<div class="rv-mini s' + r.st + '" style="animation-delay:' + (i * 0.07).toFixed(2) + 's"><div style="background-image:url(' + u.art + ')"></div><span>' + stars(r.st) + "</span><b>" + u.nm + "</b>" + (r.nw ? "<em>NEW</em>" : "") + "</div>"; });
      box.innerHTML = h + '</div><button class="btn rv-ok" id="rv-ok">OK</button>'; box.onclick = null; document.getElementById("rv-ok").onclick = function (e) { e.stopPropagation(); fin(); };
    }
    function next() { if (rv) { clearTimeout(rv); rv = null; } step++; if (step < seq.length) { card(seq[step]); } else sum(); }
    box.onclick = null; orb();
    box.onclick = function (ev) { if (ev.target.id === "rv-skip") { step = 999; clearTimeout(rv); sum(); return; } if (box.className.indexOf("sum") >= 0) return; next(); };
  };
  CUT.active = function () { var b = document.getElementById("reveal"); return !!(b && b.style.display === "flex"); };
})();
