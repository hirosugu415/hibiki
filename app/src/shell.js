// 巻貝: 演奏（最大24打）から決定的に作る対数螺旋の貝殻。
// 打順=角度の進行 / 音高=部屋の大きさ / 強さ=輪郭の濃さ / 横位置=色相の傾き。同じ入力なら同じ形。
const TAU = Math.PI * 2;
const KEY = 'hibiki.shells';
const SLOTS = [[0.16, 0.6], [0.84, 0.64], [0.3, 0.78], [0.7, 0.79], [0.22, 0.5], [0.8, 0.5], [0.1, 0.76], [0.9, 0.78], [0.38, 0.55], [0.62, 0.56], [0.5, 0.84], [0.5, 0.52]];

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hashTaps(taps) {
  let h = 2166136261;
  for (const t of taps) { h = Math.imul(h ^ Math.round(t.x * 997), 16777619); h = Math.imul(h ^ Math.round(t.p * 997), 16777619); h = Math.imul(h ^ Math.round(t.v * 997), 16777619); }
  return h >>> 0;
}
function rgbToHsl(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
  }
  return [h, s, l];
}

// 貝殻の形（正規化座標）。turns: 巻き数 / chambers: 部屋ごとの角度境界 / 点列関数
export function buildShell(taps) {
  const n = taps.length;
  const turns = Math.max(2, Math.min(3.2, 1.6 + n * 0.1));
  const Th = turns * TAU;
  const w = taps.map((t) => 0.55 + 0.9 * t.p);
  const sum = w.reduce((a, b) => a + b, 0);
  const th = [0]; let acc = 0;
  for (let i = 0; i < n; i++) { acc += w[i]; th.push(Th * acc / sum); }
  const hs = hashTaps(taps), rnd = mulberry32(hs);
  const phi = rnd() * TAU;
  const xm = taps.reduce((a, t) => a + t.x, 0) / n;
  const dir = xm < 0.5 ? 1 : -1;
  const b = Math.log(1.85) / TAU;
  const P = (t) => { const r = Math.exp(b * t), a = dir * t + phi; return [r * Math.cos(a), r * Math.sin(a)]; };
  return { n, turns, th, P, xm, Th };
}

// strength: 全体の濃さ(0-1)。size: 描画する正方形の一辺(px)。accent: 0-1 の RGB。
export function paintShell(ctx, size, taps, accent, strength = 1) {
  const S = buildShell(taps), { th, P, n, Th } = S;
  // 境界ボックスで中央に収める
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let t = -TAU * 0.8; t <= Th; t += 0.05) { const [x, y] = P(t); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const sc = (size * 0.92) / Math.max(x1 - x0, y1 - y0);
  const ox = size / 2 - ((x0 + x1) / 2) * sc, oy = size / 2 - ((y0 + y1) / 2) * sc;
  const Q = (t) => { const [x, y] = P(t); return [x * sc + ox, y * sc + oy]; };
  const C = [ox, oy];
  // 色: アクセントを白へ寄せ、横位置で色相を傾ける
  const [h0, s0, l0] = rgbToHsl(accent[0], accent[1], accent[2]);
  const hue = (h0 + (S.xm - 0.5) * 44 + 360) % 360;
  const col = (l, a) => `hsla(${hue.toFixed(0)},${Math.round(30 + s0 * 55)}%,${Math.round(l * 100)}%,${(a * strength).toFixed(3)})`;
  const lw = Math.max(2, size * 0.0085);
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // 部屋の面（ガラス質の濃淡）
  for (let i = 0; i < n; i++) {
    const a = th[i], b = th[i + 1], tp = taps[i];
    const steps = Math.max(4, Math.ceil((b - a) / 0.08));
    ctx.beginPath();
    for (let k = 0; k <= steps; k++) { const [x, y] = Q(a + (b - a) * k / steps); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    for (let k = steps; k >= 0; k--) { const [x, y] = Q(a + (b - a) * k / steps - TAU); ctx.lineTo(x, y); }
    ctx.closePath();
    ctx.fillStyle = col(0.78, 0.05 + 0.13 * (0.35 + 0.65 * tp.v) * (0.7 + 0.3 * (i % 2)));
    ctx.fill();
  }
  // 隔壁（強さ=濃さ）。わずかに内側へ膨らむ曲線
  ctx.lineWidth = lw * 0.85;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = Q(th[i]), [bx, by] = Q(th[i] - TAU);
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const cx = mx + (C[0] - mx) * 0.14, cy = my + (C[1] - my) * 0.14;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, bx, by);
    ctx.strokeStyle = col(0.84, 0.3 + 0.45 * taps[i].v);
    ctx.stroke();
  }
  // 殻の輪郭（螺旋）
  const outline = (width, l, a, dx, dy) => {
    ctx.beginPath();
    for (let t = -TAU * 0.8, first = true; t <= Th + 0.02; t += 0.04) { const [x, y] = Q(t); first ? ctx.moveTo(x + dx, y + dy) : ctx.lineTo(x + dx, y + dy); first = false; }
    ctx.lineWidth = width; ctx.strokeStyle = col(l, a); ctx.stroke();
  };
  outline(lw * 1.6, 0.7, 0.2, 0, 0); // ガラスの縁の滲み
  outline(lw * 1.15, 0.86, 0.6, 0, 0);
  // 開口の端
  { const [ex, ey] = Q(Th), [fx, fy] = Q(Th - TAU); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(fx, fy); ctx.lineWidth = lw; ctx.strokeStyle = col(0.88, 0.5); ctx.stroke(); }
  ctx.restore();
  return S;
}

function loadSaved() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* 保存できなくても動く */ } }

const q2 = (v) => Math.round(v * 100) / 100;

export function createShell({ accent, demo, shellParam, shellsParam }) {
  const body = document.body;
  const ON = shellParam !== '0';
  const SHOW = shellParam === 'show';
  body.dataset.shell = ON ? '0' : 'off';
  body.dataset.shells = '0';
  if (!ON) return { record() {}, dismiss() {} };

  const taps = [];
  let idleT = 0, fired = false, cv = null, hideT = 0, sinkT = 0;
  const dprOf = () => Math.min(2, window.devicePixelRatio || 1);
  const mainSize = () => Math.round(Math.max(200, Math.min(innerWidth * 0.78, innerHeight * 0.52, 520)));

  function fire(list) {
    if (fired || document.hidden) return;
    fired = true;
    const size = mainSize(), dpr = dprOf();
    cv = document.createElement('canvas');
    cv.id = 'shell'; cv.setAttribute('aria-hidden', 'true');
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
    cv.style.cssText = `position:fixed;left:50%;top:44%;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;z-index:1;pointer-events:none;mix-blend-mode:screen;opacity:0;transform:scale(.93);filter:blur(5px);transition:opacity 3.2s cubic-bezier(.22,.7,.2,1),transform 3.6s cubic-bezier(.22,.7,.2,1),filter 3.2s ease-out;will-change:opacity,transform`;
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const S = paintShell(ctx, size, list, accent(), 1);
    document.body.appendChild(cv);
    body.dataset.shell = `${S.n},${S.turns.toFixed(1)}`;
    void cv.offsetWidth;
    cv.style.opacity = '0.92'; cv.style.transform = 'scale(1)'; cv.style.filter = 'blur(0px)';
    if (!SHOW) {
      sinkT = setTimeout(() => { // 水底へ沈んで消える
        if (!cv) return;
        cv.style.transition = 'opacity 3.4s ease-in,transform 3.6s ease-in,filter 3.4s ease-in';
        cv.style.opacity = '0'; cv.style.transform = 'translateY(5vh) scale(.88)'; cv.style.filter = 'blur(7px)';
        hideT = setTimeout(remove, 3800);
      }, 3200 + 1400);
    }
    if (!demo) { // 沈んだ貝殻（座標と打配列のみ・最大12個）
      const all = loadSaved(), slot = SLOTS[all.length % SLOTS.length], r = mulberry32(hashTaps(list));
      all.push({ x: q2(slot[0] + (r() - 0.5) * 0.05), y: q2(slot[1] + (r() - 0.5) * 0.04), t: list.map((t) => [q2(t.x), q2(t.p), q2(t.v)]) });
      save(all.slice(-12));
    }
  }
  function remove() { clearTimeout(sinkT); clearTimeout(hideT); if (cv) { cv.remove(); cv = null; } }
  function dismiss() { // 新しい操作で即座に薄れる
    clearTimeout(idleT);
    if (!cv) return;
    clearTimeout(sinkT); clearTimeout(hideT);
    cv.style.transition = 'opacity .5s ease-out,transform .6s ease-out,filter .5s ease-out';
    cv.style.opacity = '0'; cv.style.filter = 'blur(6px)';
    hideT = setTimeout(remove, 700);
  }
  function record(x, y, vel, pitch) {
    if (fired) { /* 一度きり: 以後の演奏は次の訪問へ */ return; }
    taps.push({ x: Math.max(0, Math.min(1, x)), p: Math.max(0, Math.min(1, pitch)), v: Math.max(0.1, Math.min(1, vel)) });
    if (taps.length > 24) taps.shift();
    clearTimeout(idleT);
    if (taps.length >= 8 && !SHOW) idleT = setTimeout(() => fire(taps.slice()), 10000);
  }
  if (SHOW) { // 固定の12打から（撮影・検証用）
    const fixed = [[.2, .1, .5], [.5, .6, .8], [.8, .9, .6], [.35, .4, .9], [.65, .2, .55], [.45, .8, .7], [.15, .5, .45], [.9, .3, .85], [.55, .95, .6], [.3, .65, .75], [.7, .45, .5], [.4, .15, .9]]
      .map(([x, p, v]) => ({ x, p, v }));
    setTimeout(() => fire(fixed), 300);
  }

  // 水底の貝殻: 再訪時、淡い影として最大5個
  const FLOOR_N = Math.max(0, Math.min(12, parseInt(shellsParam, 10) || 0));
  let list = [];
  if (FLOOR_N > 0) {
    const r = mulberry32(20241);
    for (let i = 0; i < FLOOR_N; i++) {
      const m = 8 + Math.floor(r() * 13), t = [];
      for (let k = 0; k < m; k++) t.push({ x: r(), p: r(), v: 0.4 + 0.6 * r() });
      const s = SLOTS[i % SLOTS.length];
      list.push({ x: s[0] + (r() - 0.5) * 0.05, y: s[1] + (r() - 0.5) * 0.04, taps: t });
    }
  } else if (!demo) {
    list = loadSaved().slice(-5).map((e) => ({ x: e.x, y: e.y, taps: (e.t || []).map(([x, p, v]) => ({ x, p, v })).filter((t) => isFinite(t.x + t.p + t.v)) })).filter((e) => e.taps.length >= 3);
  }
  if (list.length) {
    body.dataset.shells = String(list.length);
    const fc = document.createElement('canvas'); fc.id = 'shells'; fc.setAttribute('aria-hidden', 'true');
    const W = innerWidth, H = innerHeight, dpr = dprOf(), Sm = Math.min(W, H);
    fc.width = Math.round(W * dpr); fc.height = Math.round(H * dpr);
    fc.style.cssText = `position:fixed;left:0;top:0;width:${W}px;height:${H}px;z-index:1;pointer-events:none;mix-blend-mode:screen;opacity:0;transition:opacity 3s ease-out`;
    const fctx = fc.getContext('2d');
    list.forEach((e, i) => {
      const sz = Math.round(Sm * (0.2 + 0.07 * ((i * 7) % 4) / 3) * (W < 600 ? 1.15 : 1));
      const t = document.createElement('canvas'); t.width = t.height = Math.round(sz * dpr);
      const tc = t.getContext('2d'); tc.scale(dpr, dpr);
      paintShell(tc, sz, e.taps, accent(), 0.5);
      fctx.drawImage(t, Math.round(e.x * W - sz / 2) * dpr, Math.round(e.y * H - sz / 2) * dpr);
    });
    document.body.appendChild(fc);
    let back = 0;
    setTimeout(() => { fc.style.opacity = '1'; }, 1200);
    window.addEventListener('pointerdown', () => { // 触れると薄れ、静けさが戻ると再び浮かぶ
      fc.style.transition = 'opacity .8s ease-out'; fc.style.opacity = '0'; clearTimeout(back);
      back = setTimeout(() => { fc.style.transition = 'opacity 4s ease-out'; fc.style.opacity = '1'; }, 9000);
    }, { capture: true, passive: true });
  }
  window.addEventListener('pointerdown', dismiss, { capture: true, passive: true });
  window.addEventListener('keydown', dismiss, { capture: true });
  return { record, dismiss };
}
