"use strict";
// ---- Procedural WebAudio SFX (no audio files, nothing copyrighted) ----
(function () {
  var ctx = null, master = null, mbus = null, comp = null, last = {}, curTrack = null, mtimer = null, mstep = 0, mnext = 0, intensity = 0;
  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
    mbus = ctx.createGain(); mbus.gain.value = 0.55; mbus.connect(master); comp = null; if (curTrack) startMusic(curTrack);
  }
  function ok(name, gap) {
    if (!ctx || BB.S.set.mute) return false;
    var n = ctx.currentTime; if (last[name] && n - last[name] < (gap || 0)) return false; last[name] = n; return true;
  }
  function tone(type, f0, f1, dur, vol, delay, dest) {
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, hp, delay, dest) {
    var t = ctx.currentTime + (delay || 0), n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = ctx.createBufferSource(); s.buffer = b; var f = ctx.createBiquadFilter(); f.type = hp ? "highpass" : "lowpass"; f.frequency.value = hp || 900;
    var g = ctx.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(dest || master); s.start(t);
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
    star: function () { if (ok("star", .1)) tone("triangle", 900, 1400, .2, .2); },
    // ---- v0.6 juice SFX (arg = pitch/level where noted) ----
    tick: function (a) { if (ok("tick", .025)) tone("square", 700 + (a || 0) * 40, 0, .03, .07); },
    ping: function (a) { if (ok("ping", .035)) { var f = 1100 * Math.pow(1.0595, Math.min(12, a || 0)); tone("sine", f, 0, .12, .14); tone("triangle", f * 2, 0, .09, .06, .03); } },
    crit: function () { if (ok("crit", .15)) { tone("sawtooth", 300, 1500, .12, .16); tone("square", 1800, 900, .15, .1, .08); noise(.12, .3, 3000); } },
    crack: function () { if (ok("crack", .12)) { noise(.1, .35, 2500); tone("square", 140, 70, .07, .12); } },
    collapse: function () { if (ok("collapse", .12)) { noise(.55, .55, 0); tone("sine", 95, 28, .5, .55); noise(.3, .25, 1800, .08); } },
    thud: function () { if (ok("thud", .06)) { tone("sine", 140, 50, .14, .3); noise(.06, .2, 600); } },
    laser: function () { if (ok("laser", .1)) { tone("sawtooth", 1700, 500, .22, .12); tone("sine", 900, 1500, .22, .08); } },
    ice: function () { if (ok("ice", .15)) { [1500, 1900, 2400].forEach(function (f, i) { tone("triangle", f, f * .7, .2, .09, i * .04); }); noise(.2, .15, 5000); } },
    fire: function () { if (ok("fire", .15)) { noise(.4, .35, 500); tone("sawtooth", 200, 90, .35, .12); } },
    whoosh: function () { if (ok("whoosh", .12)) { noise(.35, .22, 1200); tone("sine", 300, 900, .3, .06); } },
    flap: function () { if (ok("flap", .05)) { noise(.05, .12, 3500); tone("square", 500 + Math.random() * 300, 250, .05, .04); } },
    meteor: function () { if (ok("meteor", .07)) { tone("sine", 900, 120, .35, .12); noise(.3, .2, 800, .22); tone("sine", 100, 35, .3, .4, .28); } },
    tornado: function () { if (ok("tornado", .4)) { noise(1.2, .3, 700); tone("sawtooth", 120, 260, 1.1, .1); } },
    orb: function () { if (ok("orb", .2)) { tone("sine", 880, 1320, .25, .14); tone("sine", 1320, 1760, .3, .1, .08); } },
    orbget: function (a) { if (ok("orbget", .1)) { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone("triangle", f, 0, .14, .16, i * .05); }); if (a === "lucky") [1568, 1976, 2349].forEach(function (f, i) { tone("sine", f, 0, .2, .12, .25 + i * .06); }); } },
    psready: function () { if (ok("psready", .6)) { [660, 880, 1320].forEach(function (f, i) { tone("sine", f, 0, .25, .15, i * .08); }); } },
    psfire: function () { if (ok("psfire", .5)) { tone("sawtooth", 70, 900, .7, .3); noise(.8, .55, 0, .05); tone("sine", 55, 20, .9, .8, .35); [523, 784, 1046, 1568].forEach(function (f, i) { tone("square", f, 0, .18, .12, .4 + i * .07); }); } },
    combo: function (a) { if (ok("combo", .05)) { var f = 440 * Math.pow(1.0595, Math.min(14, (a || 1) * 2)); tone("square", f, f * 1.5, .1, .09); } },
    frenzy: function (a) { if (ok("frenzy", .3)) { var b = 392 * (1 + (a || 1) * .12); [1, 1.25, 1.5, 2].forEach(function (m, i) { tone("sawtooth", b * m, 0, .16, .14, i * .06); }); noise(.25, .3, 1800); tone("sine", 80, 30, .35, .5); } },
    hover: function () { if (ok("hover", .08)) tone("sine", 1000, 0, .03, .03); },
    tap: function () { if (ok("tap", .04)) { tone("triangle", 520, 360, .06, .12); } },
    open: function () { if (ok("open", .1)) { tone("sine", 400, 700, .12, .1); tone("sine", 600, 900, .1, .06, .05); } },
    close: function () { if (ok("close", .1)) tone("sine", 600, 330, .1, .09); },
    hammer: function () { if (ok("hammer", .12)) { tone("square", 1800, 700, .04, .08); noise(.04, .2, 3000); } },
    fanfare: function () { if (ok("fanfare", 1)) { [523, 659, 784, 1046, 784, 1046, 1318].forEach(function (f, i) { tone("square", f, 0, .22, .14, i * .11); tone("triangle", f / 2, 0, .3, .18, i * .11); }); } },
    stingwin: function () { if (ok("stingwin", 1)) { [392, 523, 659, 784, 1046, 1318].forEach(function (f, i) { tone("square", f, 0, .3, .13, i * .1); tone("sawtooth", f / 2, 0, .35, .1, i * .1); }); tone("sine", 65, 30, .8, .5, 0); noise(.5, .25, 4000, .55); } },
    stinglose: function () { if (ok("stinglose", 1)) { [330, 294, 262, 196].forEach(function (f, i) { tone("triangle", f, f * .96, .45, .2, i * .22); tone("sine", f / 2, 0, .5, .2, i * .22); }); } },
    chest: function () { if (ok("chest", .5)) { tone("square", 200, 100, .12, .15); [784, 988, 1175, 1568, 1976].forEach(function (f, i) { tone("triangle", f, 0, .22, .15, .2 + i * .07); }); noise(.3, .2, 5000, .2); } },
    lvl: function () { if (ok("lvl", .7)) { [392, 494, 587, 784, 988, 1175, 1568].forEach(function (f, i) { tone("square", f, 0, .24, .12, i * .08); tone("sine", f * 2, 0, .24, .06, i * .08); }); } },
    spawn2: function () { if (ok("spawn2", .05)) { tone("sine", 200, 700, .14, .12); tone("triangle", 120, 60, .12, .2, .1); } },
    star2: function (a) { if (ok("star2", .08)) { var f = 660 * Math.pow(1.1225, a || 0); tone("triangle", f, f * 1.5, .3, .22); tone("sine", f * 2, 0, .4, .1, .05); noise(.18, .2, 5000); } }
  };
  // ---- original synthesized music (two looping tracks) ----
  // n(semitones from A) -> Hz
  function nf(st) { return 220 * Math.pow(2, st / 12); }
  var TRK = {
    base: {bpm: 96, bass: [0, 0, 7, 5, 0, 0, 7, 9, 5, 5, 12, 7, 3, 3, 10, 7], mel: [12, -1, 14, 16, -1, 14, 12, -1, 16, -1, 19, 16, -1, 14, 12, -1, 17, -1, 16, 14, -1, 12, 14, -1, 9, -1, 12, 14, 16, -1, -1, -1], pad: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [3, 7, 10]], wave: "triangle", mvol: .1, kick: 0},
    raid: {bpm: 134, bass: [0, 0, 0, 12, 0, 0, 10, 0, -2, -2, -2, 10, -2, -2, 8, -2, -4, -4, -4, 8, -4, -4, 7, -4, -5, -5, 7, 7, 12, 10, 7, 5], mel: [12, 15, 19, 15, 12, 15, 20, 15, 10, 14, 17, 14, 10, 14, 19, 14, 8, 12, 15, 12, 8, 12, 17, 12, 7, 10, 14, 10, 12, 15, 19, 24], pad: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]], wave: "sawtooth", mvol: .045, kick: 1}
  };
  function sched() {
    if (!ctx || !curTrack || BB.S.set.mute || BB.S.set.music === false) return;
    var T = TRK[curTrack], spb = 60 / T.bpm / 4 / (1 + intensity * .04);
    while (mnext < ctx.currentTime + .18) {
      var st = mstep % 32, t = mnext - ctx.currentTime, bar = Math.floor(mstep / 8) % 4;
      var bn = T.bass[st % T.bass.length]; if (st % 2 === 0 || T.kick) tone("triangle", nf(bn - 12), 0, spb * (T.kick ? .9 : 1.8), T.kick ? .26 : .22, t, mbus);
      var mn = T.mel[st]; if (mn !== undefined && mn > -1) tone(T.wave, nf(mn), 0, spb * 1.6, T.mvol, t, mbus);
      if (st % 8 === 0) T.pad[bar].forEach(function (n) { tone("sine", nf(n), 0, spb * 7.5, .05, t, mbus); });
      if (T.kick) { if (st % 4 === 0) tone("sine", 130, 45, .12, .45, t, mbus); if (st % 2 === 1) noise(.03, .06 + intensity * .02, 7000, t, mbus); if (st % 8 === 4) noise(.12, .12, 2000, t, mbus); if (intensity >= 2 && st % 2 === 0) tone("square", nf(T.mel[(st + 4) % 32] + 12), 0, spb * .8, .025, t, mbus); }
      else if (st % 4 === 2) noise(.02, .025, 8000, t, mbus);
      mnext += spb; mstep++;
    }
  }
  function startMusic(name) {
    curTrack = name; if (!ctx) return; if (mtimer) { clearInterval(mtimer); mtimer = null; }
    if (!name) return; mstep = 0; mnext = ctx.currentTime + .08; mtimer = setInterval(sched, 40);
  }
  BB.music = function (name) { if (name === curTrack && (mtimer || !ctx)) return; intensity = 0; startMusic(name); };
  BB.musicIntensity = function (n) { intensity = n || 0; };
  BB.setMusic = function (on) { BB.S.set.music = !!on; BB.save(); if (on) { init(); if (ctx && curTrack) startMusic(curTrack); } else if (mtimer) { clearInterval(mtimer); mtimer = null; } };
  BB.vibe = function (p) { try { if (BB.S.set.haptics !== false && navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
  BB.sfx = function (n, a) { try { if (SFX[n]) SFX[n](a); } catch (e) {} };

  BB.audioInit = init;
  // mute toggle shared by Settings and the HUD speaker buttons
  BB.muteLabel = function () { return BB.S.set.mute ? "\uD83D\uDD07" : "\uD83D\uDD0A"; };
  BB.syncMute = function () { [].forEach.call(document.querySelectorAll(".mutebtn"), function (b) { b.textContent = BB.muteLabel(); b.setAttribute("aria-pressed", BB.S.set.mute ? "true" : "false"); }); };
  BB.setMute = function (m) { BB.S.set.mute = !!m; BB.save(); BB.syncMute(); if (!m) { init(); BB.sfx("click"); if (curTrack) startMusic(curTrack); } else if (mtimer) { clearInterval(mtimer); mtimer = null; } };
  BB.toggleMute = function () { BB.setMute(!BB.S.set.mute); return BB.S.set.mute; };
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) { window.addEventListener(ev, init, {passive: true}); });
})();
