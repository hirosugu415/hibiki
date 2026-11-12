// 幽霊の指: ゆっくり旋律的に自動演奏する。座標は 0–1（y は上が 0）。
const MOTIFS = [
  [4, 6, 7, 6, 4],
  [2, 4, 6, 4, 3, 2],
  [7, 6, 4, 6, 9, 7],
  [5, 4, 2, 4, 5, 7],
  [3, 5, 6, 5, 3, 1],
  [6, 8, 9, 8, 6, 4],
];

export function createGhost(api, { demo, seed }) {
  let timers = [];
  let alive = false;
  let motifN = 0, phase = 0, lastIdx = 4, slotN = 0;
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const clear = () => { timers.forEach(clearTimeout); timers = []; api.dotHide(); if (api.holdEnd) api.holdEnd(); if (api.pressCancel) api.pressCancel(); };

  const xOf = (idx) => (idx + 0.5) / 10 + (Math.random() - 0.5) * 0.02;
  const yOf = () => { phase += 0.9; return 0.5 + 0.18 * Math.sin(phase) + (Math.random() - 0.5) * 0.06; };

  // 最初の一幕（デモ）: 石の手前で一音 → 横で一音 → 石をそっとずらす → 長押し
  function firstAct() {
    const st = api.stone ? api.stone() : null;
    if (!st) { later(() => hold(xOf(7), 0.46, 3000), 200); return; }
    const x1 = Math.max(0.06, st.x - st.rx - 0.1), y1 = st.y - 0.02;
    const x2 = Math.min(0.94, st.x + st.rx + 0.16), y2 = Math.max(0.2, st.y - st.ry * 2.2);
    later(() => { if (alive) { lastIdx = 3; api.tap(x1, y1, 0.75); } }, 0);
    later(() => { if (alive) { lastIdx = 7; api.tap(x2, y2, 0.6); } }, 2300);
    // 砂州の手前（中心の左 25%）で一音: 輪が浅瀬で歪み、遅れて鐘が返る
    later(() => {
      if (!alive) return;
      const b = api.bar ? api.bar() : null;
      if (b) { lastIdx = 4; api.tap(Math.max(0.06, Math.min(0.94, b.x - 0.25)), b.y, 0.6); }
    }, 3400);
    later(() => { if (alive) { api.nudge(0.08, -0.03); } }, 4300);
    later(() => { if (alive) hold(xOf(7), Math.max(0.22, st.y - 0.2), 3000); }, 6200);
  }

  // 覚える水の一幕（デモ）: 同じ 4 打を、間 4.5 秒（先頭から先頭）で 2 度 → 水が覚えて周回する間、幽霊は静かに待つ
  const LOOP_PHRASE = [[0.30, 0.40, 0.7], [0.42, 0.31, 0.6], [0.56, 0.37, 0.75], [0.70, 0.29, 0.6]];
  function loopAct() {
    [0, 4500].forEach((base) => LOOP_PHRASE.forEach(([x, y, v], i) => {
      later(() => { if (alive) { lastIdx = 3 + i; api.tap(x, y, v); } }, base + i * 600);
    }));
    // 一度だけの長めの押下（沈む指）: 凹みと、離した後の柔らかい反動
    if (api.pressStart) { later(() => { if (alive) api.pressStart(0.62, 0.6); }, 8200); later(() => { if (api.pressEnd) api.pressEnd(); }, 8550); }
    later(rub, 12500);
    later(playMotif, 6300 + 22000);
  }

  function playMotif() {
    if (!alive) return;
    if (demo && seed && motifN === 0) { motifN++; loopAct(); return; }
    if (demo && motifN === 0) { motifN++; firstAct(); return; }
    if (demo && !seed && motifN === 4) { motifN++; loopAct(); return; }
    const m = MOTIFS[motifN++ % MOTIFS.length];
    let t = 0;
    m.forEach((idx, i) => {
      later(() => { if (!alive) return; lastIdx = idx; api.tap(xOf(idx), yOf(), 0.55 + Math.random() * 0.3); }, t);
      t += (i % 2 ? 1250 : 1500) + Math.random() * 250;
    });
    later(() => {
      if (!alive) return;
      if (motifN === 2 || (motifN % 3 === 0 && (slotN++ % 2 === 1))) circle();
      else if (motifN % 3 === 0) stroke(); else later(playMotif, 1200);
    }, t + 150);
  }

  // 長押し: 泉が湧き、離すと静まる
  function hold(x, y, ms) {
    api.tap(x, y, 0.7);
    later(() => { if (alive) api.holdStart(x, y); }, 280);
    later(() => { api.holdEnd(true); api.dotHide(); later(playMotif, 2200); }, ms);
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

  // 往復のモチーフ: 小さくこする（約 170ms ごとに向きが反転）。水が歌い、花びらの模様が立つ
  function rub() {
    if (!alive) return;
    const m = api.metric ? api.metric() : { w: 800, h: 600 }, S = Math.min(m.w, m.h), A = 0.055 * S;
    const cx = 0.5 * m.w, cy = 0.4 * m.h;
    api.tap((cx - A) / m.w, cy / m.h, 0.4);
    for (let i = 1; i <= 8; i++) {
      later(() => {
        if (!alive) return;
        api.drag((cx + (i % 2 ? A : -A)) / m.w, cy / m.h);
        if (i === 8) { api.dotHide(); }
      }, 300 + i * 170);
    }
  }

  // 円のモチーフ: ほぼ閉じた輪を 1 秒で描く（半径は短辺の 17%）。波が内へ集まり、中心に一点が立つ
  function circle() {
    const m = api.metric ? api.metric() : { w: 800, h: 600 }, S = Math.min(m.w, m.h), R = 0.17 * S;
    const cx = (0.3 + Math.random() * 0.4) * m.w, cy = 0.5 * m.h, N = 20;
    const pt = (k) => [(cx + R * Math.sin(k * Math.PI * 2)) / m.w, (cy - R * Math.cos(k * Math.PI * 2)) / m.h];
    const [x0, y0] = pt(0);
    api.tap(x0, y0, 0.5);
    for (let i = 1; i <= N; i++) {
      later(() => {
        if (!alive) return;
        const [x, y] = pt(i / N);
        api.drag(x, y);
        if (i === N) { api.dotHide(); later(playMotif, 4200); }
      }, 300 + i * 50);
    }
  }

  function start(delay) {
    clear(); alive = true;
    later(playMotif, delay);
  }

  return {
    // 通常モードの「間欠の雨粒」は main.js 側が担当する
    start() { if (demo) start(4500); },
    skipFirst() { motifN = Math.max(motifN, 1); }, // 手紙の再生があるときは最初の一幕（firstAct）を使わない
    retreat() {
      const wasDemo = demo;
      alive = false; clear();
      if (wasDemo) later(() => start(0), 6500);
    },
  };
}
