// 幽霊の指: ゆっくり旋律的に自動演奏する。座標は 0–1（y は上が 0）。
const MOTIFS = [
  [4, 6, 7, 6, 4],
  [2, 4, 6, 4, 3, 2],
  [7, 6, 4, 6, 9, 7],
  [5, 4, 2, 4, 5, 7],
  [3, 5, 6, 5, 3, 1],
  [6, 8, 9, 8, 6, 4],
];

export function createGhost(api, { demo }) {
  let timers = [];
  let alive = false;
  let motifN = 0, phase = 0, lastIdx = 4;
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const clear = () => { timers.forEach(clearTimeout); timers = []; api.dotHide(); };

  const xOf = (idx) => (idx + 0.5) / 10 + (Math.random() - 0.5) * 0.02;
  const yOf = () => { phase += 0.9; return 0.5 + 0.18 * Math.sin(phase) + (Math.random() - 0.5) * 0.06; };

  function playMotif() {
    if (!alive) return;
    const m = MOTIFS[motifN++ % MOTIFS.length];
    let t = 0;
    m.forEach((idx, i) => {
      later(() => { if (!alive) return; lastIdx = idx; api.tap(xOf(idx), yOf(), 0.55 + Math.random() * 0.3); }, t);
      t += (i % 2 ? 1250 : 1500) + Math.random() * 250;
    });
    later(() => {
      if (!alive) return;
      if (motifN % 3 === 0) stroke(); else later(playMotif, 1200);
    }, t + 150);
  }

  // 短いドラッグの軌跡
  function stroke() {
    const dir = lastIdx > 5 ? -1 : 1;
    const x0 = xOf(lastIdx), x1 = Math.min(0.92, Math.max(0.08, x0 + dir * (0.22 + Math.random() * 0.1)));
    const y0 = yOf(), N = 10;
    api.tap(x0, y0, 0.5);
    for (let i = 1; i <= N; i++) {
      later(() => {
        if (!alive) return;
        const k = i / N;
        api.drag(x0 + (x1 - x0) * k, y0 - Math.sin(k * Math.PI) * 0.14 - k * 0.06);
        if (i === N) { api.dotHide(); later(playMotif, 1600); }
      }, i * 70);
    }
  }

  function start(delay) {
    clear(); alive = true;
    later(playMotif, delay);
  }

  // 通常モード: 触れられないまま約 8 秒で、控えめな一滴を 1〜2 回
  function nudgeOnce() {
    later(() => {
      alive = true;
      api.tap(0.38 + Math.random() * 0.24, 0.5 + Math.random() * 0.1, 0.45);
      later(() => { api.tap(0.6 + Math.random() * 0.15, 0.42, 0.35); alive = false; }, 2300);
    }, 8000);
  }

  return {
    start() { demo ? start(800) : nudgeOnce(); },
    retreat() {
      const wasDemo = demo;
      alive = false; clear();
      if (wasDemo) later(() => start(0), 6500);
    },
  };
}
