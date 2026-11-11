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
  let master, bus, wetS, wetL, echoSend;
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
      bus.connect(rvIn);

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

  function setMood(m) {
    if (!ctx) { pendingMood = m; return; }
    const t = ctx.currentTime;
    wetS.gain.setTargetAtTime(m.wetShort, t, 0.25);
    wetL.gain.setTargetAtTime(m.wetLong, t, 0.25);
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

  function voice(freq, bright, vel, pan) {
    const t = ctx.currentTime;
    trim();
    const out = ctx.createGain();
    out.gain.value = 1;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.Q.value = 0.4;
    filt.frequency.value = 900 + 7200 * Math.pow(bright, 1.4);
    const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pn) { pn.pan.value = pan; filt.connect(pn); pn.connect(out); } else filt.connect(out);
    out.connect(bus);

    const tau = 0.55 + (1 - bright) * 0.35;
    const partials = [
      { r: 1, g: 1, d: 1 },
      { r: 2, g: 0.18 + 0.4 * bright, d: 0.55 },
      { r: 3.01, g: 0.05 + 0.22 * bright, d: 0.32 },
    ];
    const peak = 0.2 * (0.45 + 0.55 * vel);
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
      try { out.disconnect(); filt.disconnect(); } catch { /* noop */ }
    };
  }

  // x: 0–1（左→右）、bright: 0–1（下→上）
  function play(freq, bright, vel = 1, x = 0.5) {
    if (unavailable || muted || !gesture) return;
    try {
      if (!ctx) { unlock().then(() => { if (ctx && ctx.state === 'running') { if (pendingMood) setMood(pendingMood); voice(freq, bright, vel, (x * 2 - 1) * 0.5); } }); return; }
      if (ctx.state !== 'running') {
        ctx.resume().then(() => { if (ctx.state === 'running') voice(freq, bright, vel, (x * 2 - 1) * 0.5); publish(); }).catch(() => {});
        return;
      }
      voice(freq, bright, vel, (x * 2 - 1) * 0.5);
    } catch { /* 音が出せなくても波紋は動く */ }
  }


  // 持続する声（長押しの泉）。サステイン + 5Hz・約 ±0.3% のビブラート。release() で 0.6 秒以内に必ず止まる。
  function voiceHold(freq, bright, pan = 0) {
    if (unavailable || muted || !gesture || !ctx || ctx.state !== 'running') return null;
    try {
      const t = ctx.currentTime;
      trim();
      const out = ctx.createGain();
      out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(1, t + 0.22);
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

  function applyPendingMood() { if (ctx && pendingMood) { setMood(pendingMood); pendingMood = null; } }

  publish();
  return { unlock, play, voiceHold, setMood, setMuted, applyPendingMood, get muted() { return muted; } };
}
