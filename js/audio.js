"use strict";
// ---- Procedural WebAudio SFX (no audio files, nothing copyrighted) ----
(function () {
  var ctx = null, master = null, last = {};
  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
  }
  function ok(name, gap) {
    if (!ctx || BB.S.set.mute) return false;
    var n = ctx.currentTime; if (last[name] && n - last[name] < (gap || 0)) return false; last[name] = n; return true;
  }
  function tone(type, f0, f1, dur, vol, delay) {
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, hp, delay) {
    var t = ctx.currentTime + (delay || 0), n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = ctx.createBufferSource(); s.buffer = b; var f = ctx.createBiquadFilter(); f.type = hp ? "highpass" : "lowpass"; f.frequency.value = hp || 900;
    var g = ctx.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  var SFX = {
    shoot: function () { if (ok("shoot", .07)) tone("square", 520, 220, .08, .12); },
    hit: function () { if (ok("hit", .04)) { noise(.08, .3, 1500); tone("triangle", 200, 90, .08, .15); } },
    clang: function () { if (ok("clang", .06)) { tone("square", 900, 600, .07, .12); noise(.05, .2, 4000); } },
    kill: function () { if (ok("kill", .03)) { noise(.22, .45, 400); tone("sawtooth", 300, 60, .2, .18); } },
    coin: function () { if (ok("coin", .045)) { tone("square", 880, 0, .06, .1); tone("square", 1320, 0, .09, .1, .05); } },
    salv: function () { if (ok("salv", .05)) tone("triangle", 600, 900, .1, .15); },
    wall: function () { if (ok("wall", .1)) { tone("sine", 140, 40, .35, .5); noise(.25, .5, 0); } },
    hurt: function () { if (ok("hurt", .15)) { tone("sawtooth", 160, 50, .2, .25); noise(.15, .3, 300); } },
    grab: function () { if (ok("grab", .2)) { tone("sine", 1200, 1700, .12, .15); tone("sine", 1700, 1200, .12, .15, .12); } },
    rescue: function () { if (ok("rescue", .2)) { tone("triangle", 520, 0, .1, .2); tone("triangle", 780, 0, .15, .2, .1); } },
    lost: function () { if (ok("lost", .2)) { tone("sawtooth", 400, 80, .5, .22); } },
    warn: function () { if (ok("warn", .3)) tone("square", 300, 300, .12, .12); },
    slam: function () { if (ok("slam", .1)) { tone("sine", 90, 30, .5, .7); noise(.4, .6, 0); } },
    beam: function () { if (ok("beam", .2)) { tone("sawtooth", 200, 900, .5, .2); } },
    roar: function () { if (ok("roar", .5)) { tone("sawtooth", 110, 40, 1.1, .35); noise(.9, .3, 0); } },
    ult: function () { if (ok("ult", .3)) { tone("sawtooth", 80, 1200, .6, .3); noise(.7, .5, 0, .1); tone("sine", 60, 20, .8, .7, .3); } },
    win: function () { if (ok("win", 1)) [523, 659, 784, 1046].forEach(function (f, i) { tone("square", f, 0, .22, .15, i * .13); tone("triangle", f / 2, 0, .3, .2, i * .13); }); },
    lose: function () { if (ok("lose", 1)) [440, 392, 330, 262].forEach(function (f, i) { tone("sawtooth", f, f * .9, .3, .15, i * .18); }); },
    click: function () { if (ok("click", .04)) tone("square", 660, 880, .05, .08); },
    upgrade: function () { if (ok("upg", .5)) [392, 523, 659, 784, 1046].forEach(function (f, i) { tone("triangle", f, 0, .2, .2, i * .09); }); },
    deny: function () { if (ok("deny", .1)) tone("square", 160, 120, .15, .15); },
    deploy: function () { if (ok("deploy", .05)) { tone("triangle", 330, 520, .07, .1); } },
    pew: function () { if (ok("pew", .09)) tone("square", 760, 380, .06, .05); },
    rail: function () { if (ok("rail", .12)) { tone("sawtooth", 1400, 300, .12, .08); noise(.05, .12, 3000); } },
    dshot: function () { if (ok("dshot", .08)) { tone("triangle", 240, 110, .09, .08); noise(.04, .1, 1200); } },
    boom: function () { if (ok("boom", .08)) { noise(.35, .5, 0); tone("sine", 110, 35, .35, .5); } },
    zap: function () { if (ok("zap", .1)) { tone("sawtooth", 1200, 200, .18, .15); noise(.12, .3, 2500); } },
    crows: function () { if (ok("crows", .3)) { [0, .07, .14, .22].forEach(function (d, i) { tone("sawtooth", 900 - i * 110, 380, .12, .12, d); }); noise(.4, .2, 2000, .05); } },
    spell: function () { if (ok("spell", .15)) { tone("sine", 500, 900, .25, .18); tone("sine", 700, 1100, .25, .1, .06); } },
    pop: function () { if (ok("pop", .05)) tone("sine", 420, 120, .09, .09); },
    star: function () { if (ok("star", .1)) tone("triangle", 900, 1400, .2, .2); }
  };
  BB.sfx = function (n) { try { if (SFX[n]) SFX[n](); } catch (e) {} };
  BB.audioInit = init;
  // mute toggle shared by Settings and the HUD speaker buttons
  BB.muteLabel = function () { return BB.S.set.mute ? "\uD83D\uDD07" : "\uD83D\uDD0A"; };
  BB.syncMute = function () { [].forEach.call(document.querySelectorAll(".mutebtn"), function (b) { b.textContent = BB.muteLabel(); b.setAttribute("aria-pressed", BB.S.set.mute ? "true" : "false"); }); };
  BB.setMute = function (m) { BB.S.set.mute = !!m; BB.save(); BB.syncMute(); if (!m) { init(); BB.sfx("click"); } };
  BB.toggleMute = function () { BB.setMute(!BB.S.set.mute); return BB.S.set.mute; };
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) { window.addEventListener(ev, init, {passive: true}); });
})();
