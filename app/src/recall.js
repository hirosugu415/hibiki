// 追想: 触れるのをやめた静けさの間に、直近の自分の演奏が、変形・減衰しながら水面へ戻ってくる。
// 記録するのは人（と幽霊の指）の演奏だけ。追想自身の再生は記録しない（無限ループ禁止）。
// 1 周目: 元の順で間隔 1.5 倍 / 2 周目: 1 音おきに 5 度上で / 3 周目: 最高音 1 つだけ。
const MAX_MEMORY = 6;
const NOTES = 10; // moods.js の NOTE_COUNT（ペンタトニック 5 音 × 2 オクターブ）
const idxOf = (x) => Math.max(0, Math.min(NOTES - 1, Math.floor(x * NOTES)));

// 5 度上 = ペンタトニックで 3 段上。範囲を超えるなら 1 オクターブ下へ丸める
function fifthUp(x) {
  let i = idxOf(x) + 3;
  if (i > NOTES - 1) i -= 5;
  return (i + 0.5) / NOTES;
}

export function createRecall({ play, onChange, idleMs = 6000 }) {
  const memory = []; // { x, y, vel, t }
  let idleTimer = 0;
  let playTimers = [];
  let gen = 0;
  let last = '';
  const notify = () => onChange && onChange(memory.length, gen, last);

  function stopPlayback() { playTimers.forEach(clearTimeout); playTimers = []; }
  const later = (fn, ms) => { playTimers.push(setTimeout(fn, ms)); };

  function emit(x, y, vel) {
    if (document.hidden) return;
    try { play(x, y, vel); last = `${x.toFixed(3)},${y.toFixed(3)}`; } catch { /* 追想の失敗でアプリを落とさない */ }
    notify();
  }

  // notes: [{ x, y, vel, gap }]（gap = 直前の音からの間隔 ms）。全体の長さを返す
  function schedule(notes, startAt) {
    let t = startAt;
    notes.forEach((n, i) => { if (i > 0) t += n.gap; later(() => emit(n.x, n.y, n.vel), t); });
    return t;
  }

  function run() {
    if (memory.length < 3) return;
    const mem = memory.slice();
    const gaps = mem.map((m, i) => (i === 0 ? 0 : Math.max(400, Math.min(2400, (m.t - mem[i - 1].t) * 1.5))));

    gen = 1; notify();
    const g1 = mem.map((m, i) => ({ x: m.x, y: m.y, vel: m.vel * 0.55, gap: gaps[i] }));
    let end = schedule(g1, 0);

    const g2 = mem.filter((_, i) => i % 2 === 0).map((m, i) => ({ x: fifthUp(m.x), y: m.y, vel: m.vel * 0.35, gap: i === 0 ? 0 : 1800 }));
    const start2 = end + 2600;
    later(() => { gen = 2; notify(); }, start2);
    end = schedule(g2, start2);

    const top = mem.reduce((a, m) => (m.x > a.x ? m : a), mem[0]);
    const start3 = end + 3200;
    later(() => { gen = 3; notify(); }, start3);
    schedule([{ x: top.x, y: top.y, vel: top.vel * 0.2, gap: 0 }], start3);
  }

  function arm() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!document.hidden) { stopPlayback(); run(); } else arm(); }, idleMs);
  }

  return {
    record(x, y, vel = 1) {
      memory.push({ x, y, vel, t: performance.now() });
      while (memory.length > MAX_MEMORY) memory.shift();
      notify(); arm();
    },
    // 実プレイヤーの接触: 再演は即停止。記憶は残す
    interrupt() {
      clearTimeout(idleTimer); stopPlayback();
      if (gen !== 0) { gen = 0; notify(); }
      if (memory.length) arm();
    },
  };
}
