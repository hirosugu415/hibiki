// Web Audio: ベル/マリンバ風の減衰音 + 自前生成リバーブ + フィードバックディレイ。
const MAX_VOICES = 12;

function makeIR(ctx, seconds, power, darkness) {
  const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const k = i / len;
      const a = 0.5 + darkness * k * 0.45; // 後半ほど高域を落とす
      lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
      d[i] = lp * Math.pow(1 - k, power) * (i < 400 ? i / 400 : 1);
    }
  }
  return buf;
}

export function createAudio() {
  let ctx = null, unavailable = false, muted = false, gesture = false;
  let master, bus, wetS, wetL, echoSend, rvSend;
  const voices = [];

  const publish = () => {
    let s = 'idle';
    if (unavailable) s = 'unavailable';
    else if (muted) s = 'muted';
    else if (ctx && ctx.state === 'running') s = 'running';
    document.body.dataset.audio = s;
  };

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { unavailable = true; return; }
    try {
      ctx = new AC({ latencyHint: 'interactive' });
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.25;
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
      master.connect(comp); comp.connect(ctx.destination);

      bus = ctx.createGain(); bus.connect(master);

      const rvIn = ctx.createGain(); rvIn.gain.value = 0.9;
      const convS = ctx.createConvolver(); convS.buffer = makeIR(ctx, 2.0, 2.6, 0.6);
      const convL = ctx.createConvolver(); convL.buffer = makeIR(ctx, 4.4, 2.2, 0.8);
      wetS = ctx.createGain(); wetS.gain.value = 0.3;
      wetL = ctx.createGain(); wetL.gain.value = 0.12;
      rvIn.connect(convS); rvIn.connect(convL);
      convS.connect(wetS); convL.connect(wetL);
      wetS.connect(master); wetL.connect(master);
      bus.connect(rvIn); rvSend = rvIn;

      const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.33;
      const fb = ctx.createGain(); fb.gain.value = 0.34;
      const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400;
      echoSend = ctx.createGain(); echoSend.gain.value = 0.22;
      bus.connect(delay); delay.connect(dlp); dlp.connect(fb); fb.connect(delay);
      dlp.connect(echoSend); echoSend.connect(master); echoSend.connect(rvIn);

      ctx.addEventListener('statechange', publish);
    } catch {
      unavailable = true; ctx = null;
    }
  }

  async function unlock() {
    gesture = true;
    if (!ctx && !unavailable) build();
    if (ctx && pendingMood) { setMood(pendingMood); pendingMood = null; }
    if (ctx && ctx.state !== 'running') { try { await ctx.resume(); } catch { /* noop */ } }
    publish();
  }

  let revK = 1, lastMood = null;
  function setReverbK(k) { revK = k; if (lastMood) setMood(lastMood); }
  function setMood(m) {
    lastMood = m;
    if (!ctx) { pendingMood = m; return; }
    const t = ctx.currentTime;
    wetS.gain.setTargetAtTime(m.wetShort * (2 - revK), t, 0.25);
    wetL.gain.setTargetAtTime(m.wetLong * revK, t, 0.25);
    echoSend.gain.setTargetAtTime(m.echo, t, 0.25);
  }
  let pendingMood = null;

  function setMuted(v) {
    muted = v;
    if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
    publish();
  }

  function trim() {
    const t = ctx.currentTime;
    while (voices.length >= MAX_VOICES) {
      const v = voices.shift();
      try {
        v.out.gain.cancelScheduledValues(t);
        v.out.gain.setTargetAtTime(0, t, 0.03);
        v.stop(t + 0.25);
      } catch { /* noop */ }
    }
  }

  function voice(freq, bright, vel, pan, decay = 1, level = 1, delay = 0, depth = 0) {
    const t = ctx.currentTime;
    trim();
    const out = ctx.createGain();
    const dp = Math.max(0, Math.min(1, depth || 0));
    out.gain.value = 1 - 0.2 * dp; // 奥ほど最大 −2dB
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.Q.value = 0.4;
    const lp0 = 900 + 7200 * Math.pow(bright, 1.4);
    const lp = Math.max(lp0 * (1 - 0.45 * dp), Math.min(lp0, 2000)); // 奥ほどこもるが 2kHz は残す
    filt.frequency.value = lp;
    const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pn) { pn.pan.value = pan; filt.connect(pn); pn.connect(out); } else filt.connect(out);
    out.connect(bus);
    let send = null;
    if (dp > 0.01 && rvSend) { send = ctx.createGain(); send.gain.value = 0.4 * dp; out.connect(send); send.connect(rvSend); } // 残響 send を最大 +40%
    document.body.dataset.depth = dp.toFixed(2) + ',' + (1 + 0.4 * dp).toFixed(2) + ',' + Math.round(lp);

    const tau = (0.55 + (1 - bright) * 0.35) * decay;
    const partials = [
      { r: 1, g: 1, d: 1 },
      { r: 2, g: 0.18 + 0.4 * bright, d: 0.55 },
      { r: 3.01, g: 0.05 + 0.22 * bright, d: 0.32 },
    ];
    const peak = 0.2 * (0.45 + 0.55 * vel) * level;
    const oscs = [];
    let end = t;
    for (const p of partials) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = freq * p.r * (p.r === 1 ? 1 : 1 + (Math.random() - 0.5) * 0.002);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak * p.g, t + 0.007);
      const pt = tau * p.d;
      g.gain.setTargetAtTime(0, t + 0.01, pt);
      o.connect(g); g.connect(filt);
      const stopAt = t + 0.01 + pt * 9;
      o.start(t); o.stop(stopAt);
      end = Math.max(end, stopAt);
      oscs.push(o);
    }
    const rec = {
      out,
      stop: (at) => oscs.forEach((o) => { try { o.stop(at); } catch { /* noop */ } }),
    };
    voices.push(rec);
    oscs[0].onended = () => {
      const i = voices.indexOf(rec); if (i >= 0) voices.splice(i, 1);
      try { out.disconnect(); filt.disconnect(); if (send) send.disconnect(); } catch { /* noop */ }
    };
  }

  // x: 0–1（左→右）、bright: 0–1（下→上）
  function play(freq, bright, vel = 1, x = 0.5, decay = 1, level = 1, delay = 0, depth = 0) {
    if (unavailable || muted || !gesture) return;
    try {
      if (!ctx) { unlock().then(() => { if (ctx && ctx.state === 'running') { if (pendingMood) setMood(pendingMood); voice(freq, bright, vel, (x * 2 - 1) * 0.5, decay, level, delay, depth); } }); return; }
      if (ctx.state !== 'running') {
        ctx.resume().then(() => { if (ctx.state === 'running') voice(freq, bright, vel, (x * 2 - 1) * 0.5, decay, level, delay, depth); publish(); }).catch(() => {});
        return;
      }
      voice(freq, bright, vel, (x * 2 - 1) * 0.5, decay, level, delay, depth);
    } catch { /* 音が出せなくても波紋は動く */ }
  }


  // 持続する声（長押しの泉）。サステイン + 5Hz・約 ±0.3% のビブラート。release() で 0.6 秒以内に必ず止まる。
  function voiceHold(freq, bright, pan = 0, level = 1) {
    if (unavailable || muted || !gesture || !ctx || ctx.state !== 'running') return null;
    try {
      const t = ctx.currentTime;
      trim();
      const out = ctx.createGain();
      out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(level, t + 0.22);
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.Q.value = 0.4;
      filt.frequency.value = 900 + 6000 * Math.pow(bright, 1.4);
      const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pn) { pn.pan.value = pan; filt.connect(pn); pn.connect(out); } else filt.connect(out);
      out.connect(bus);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5;
      const lfoG = ctx.createGain(); lfoG.gain.value = 5; // cents（約 0.3%）
      lfo.connect(lfoG);
      const oscs = [lfo];
      const peak = 0.075;
      for (const p of [{ r: 1, g: 1 }, { r: 2, g: 0.16 + 0.3 * bright }, { r: 3.01, g: 0.04 + 0.12 * bright }]) {
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.value = freq * p.r;
        lfoG.connect(o.detune);
        const g = ctx.createGain(); g.gain.value = peak * p.g;
        o.connect(g); g.connect(filt);
        o.start(t); oscs.push(o);
      }
      lfo.start(t);
      let done = false;
      const rec = {
        out,
        stop: (at) => oscs.forEach((o) => { try { o.stop(at); } catch { /* noop */ } }),
      };
      voices.push(rec);
      oscs[1].onended = () => {
        const i = voices.indexOf(rec); if (i >= 0) voices.splice(i, 1);
        try { out.disconnect(); filt.disconnect(); } catch { /* noop */ }
      };
      return {
        fade(sec) { if (done) return; done = true; try { const n = ctx.currentTime; if (out.gain.cancelAndHoldAtTime) out.gain.cancelAndHoldAtTime(n); else out.gain.cancelScheduledValues(n); out.gain.linearRampToValueAtTime(0, n + sec); rec.stop(n + sec + 0.1); } catch { /* noop */ } },
        release() {
          if (done) return; done = true;
          try {
            const n = ctx.currentTime;
            if (out.gain.cancelAndHoldAtTime) out.gain.cancelAndHoldAtTime(n); else out.gain.cancelScheduledValues(n);
            out.gain.setTargetAtTime(0, n, 0.12);
            rec.stop(n + 0.62);
          } catch { /* noop */ }
        },
      };
    } catch { return null; }
  }

  // 砂の粒音: 図形が組み上がる約 0.4 秒だけ、高域の短いノイズ（極小音量）
  function sand(pan = 0) {
    if (unavailable || muted || !gesture || !ctx || ctx.state !== 'running') return;
    try {
      const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.45);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() < 0.35 ? Math.random() * 2 - 1 : 0) * Math.sin(Math.PI * i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3800;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);
      const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      src.connect(hp); hp.connect(g);
      if (pn) { pn.pan.value = pan; g.connect(pn); pn.connect(bus); } else g.connect(bus);
      src.start(t); src.onended = () => { try { g.disconnect(); } catch { /* noop */ } };
    } catch { /* noop */ }
  }

  function applyPendingMood() { if (ctx && pendingMood) { setMood(pendingMood); pendingMood = null; } }

  publish();
  return { unlock, setReverbK, play, voiceHold, sand, setMood, setMuted, applyPendingMood, get muted() { return muted; }, get live() { return !!(ctx && !unavailable && !muted && gesture && ctx.state === 'running'); } };
}
