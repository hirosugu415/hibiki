// 覚える水: 人が同じフレーズを 2 度弾くと、水が覚えて静かに最大 4 周まわって溶ける。
// フレーズ = 3〜6 打・各間隔 ≤1.5s・全体 ≤4.6s。2 つ目が前回と一致（位置 0.11 以内・間隔 ±40%（長い方基準）・打数一致）で学習。
const GAP = 1500, MAX_SPAN = 4600, HORIZON = 8000, POS_TOL = 0.11, DT_TOL = 0.4;
const AMPS = [0.35, 0.26, 0.17, 0.09];

export function createLoop({ play, short, onState, onLearn }) {
  const nowMs = () => performance.now();
  let run = null;          // 進行中のまとまり { taps, ok(前回と一致し続けているか), bad }
  let prev = null;         // 前回のフレーズ { taps, end }
  let timers = [];
  let active = null;       // 周回中 { taps, period, k, n, amp }
  let finTimer = 0;
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const stop = () => { timers.forEach(clearTimeout); timers = []; active = null; onState('off'); };

  const span = (taps) => taps[taps.length - 1].t - taps[0].t;
  function same(a, b) {
    if (a.length !== b.length) return false;
    const s = short();
    for (let i = 0; i < a.length; i++) {
      if (Math.hypot((a[i].x - b[i].x) * s.w, (a[i].y - b[i].y) * s.h) / s.m > POS_TOL) return false;
      if (i) {
        const da = a[i].t - a[i - 1].t, db = b[i].t - b[i - 1].t;
        if (Math.abs(da - db) > Math.max(90, DT_TOL * Math.max(da, db))) return false;
      }
    }
    return true;
  }
  function spread(taps) { // 少なくとも 2 か所に散っている（同じ点の連打は覚えない）
    const s = short();
    let m = 0;
    for (const a of taps) for (const b of taps) m = Math.max(m, Math.hypot((a.x - b.x) * s.w, (a.y - b.y) * s.h) / s.m);
    return m > 0.12;
  }
  function finalize() {
    finTimer = 0;
    if (!run) return;
    const r = run; run = null;
    if (!r.bad && r.taps.length >= 3 && r.taps.length <= 6 && span(r.taps) <= MAX_SPAN) prev = { taps: r.taps, end: r.taps[r.taps.length - 1].t };
  }

  function start(taps) {
    stop();
    const sp = span(taps);
    active = { taps, period: Math.min(6000, sp + 1100), k: 0, mul: 1, n: 4 };
    onState('learned'); onLearn();
    const t0 = taps[0].t;
    const cycle = () => {
      if (!active) return;
      const a = active;
      if (a.k >= a.n) { later(() => { if (active === a) stop(); }, 1500); return; }
      const amp = AMPS[Math.min(a.k, 3)] * a.mul;
      a.k++;
      onState(`cycle,${a.k}/4`);
      taps.forEach((p) => later(() => { if (active === a) play(p.x, p.y, p.vel * amp); }, p.t - t0));
      later(cycle, a.period);
    };
    later(cycle, 1200);
  }

  return {
    // human=true: 実際の人の触れ（周回中なら 2 周かけて引く）。デモでは幽霊の打を human=false で渡す
    tap(x, y, vel, human = true) {
      const t = nowMs();
      if (human && active && active.n > 0) { // 周回中の触れ: 演奏を邪魔しない。あと 2 周、半分の音量で
        active.n = Math.min(active.n, active.k + 2); active.mul *= 0.5;
        if (active.k === 0) stop(); // 学習直後〜1 周目前は止める
      }
      if (!run || t - run.taps[run.taps.length - 1].t > GAP) { if (finTimer) clearTimeout(finTimer); finalize(); run = { taps: [], bad: false }; }
      run.taps.push({ t, x, y, vel });
      if (run.taps.length > 6) run.bad = true;
      clearTimeout(finTimer); finTimer = setTimeout(finalize, GAP + 50);
      // 学習の判定: 前回のフレーズが直近 8 秒以内に終わっていて、ここまで全部一致して打数も揃った
      const n = run.taps.length;
      if (!run.bad && prev && n >= 3 && n === prev.taps.length && prev.end >= run.taps[0].t - HORIZON
          && span(run.taps) <= MAX_SPAN && spread(run.taps) && same(run.taps, prev.taps)) {
        const taps = run.taps.slice();
        prev = { taps, end: t };
        start(taps);
      }
    },
  };
}
