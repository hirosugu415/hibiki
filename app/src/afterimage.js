// 水面の残像: 前回の打の位置を、淡い光の染みとして localStorage に残し、再訪時に水底へ浮かべる。最初の一打で洗われる。
// 保存するのは打点の配列（数百バイト）だけ。GL キャンバスの読み出しはしない（空になりうるため）。
const KEY = 'hibiki.afterimage';
const MAX = 14;
// ?demo=1&seed=1 用の決定的な残像（幽霊の一幕に似た位置）
const SEED = [[.3, .62, .8], [.42, .5, .6], [.55, .38, .9], [.68, .55, .7], [.76, .3, .5], [.5, .72, .6], [.2, .4, .5]];

export function createAfterimage({ el, accent, demoSeed }) {
  const body = document.body;
  let pts = [];      // 今回の打
  let state = 'none';
  let dirty = false;
  const setState = (s) => { state = s; body.dataset.afterimage = s; };
  setState('none');

  function read() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      if (!o || !Array.isArray(o.p)) return null;
      const p = o.p.filter((q) => Array.isArray(q) && q.length >= 3 && q.every((v) => Number.isFinite(v))).slice(-MAX)
        .map(([x, y, v]) => [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)), Math.min(1, Math.max(0, v))]);
      return p.length ? p : null;
    } catch { return null; }
  }
  function paint(list) {
    const w = 48, h = Math.max(24, Math.round(w * (innerHeight || 1) / (innerWidth || 1)));
    el.width = w; el.height = h;
    const c = el.getContext('2d');
    if (!c) return false;
    c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = 'lighter';
    const [r, g, b] = accent().map((v) => Math.round((v * 0.8 + 0.2) * 255)); // ムード色を明るい側へ
    const m = Math.max(w, h);
    list.forEach(([x, y, v], i) => {
      const age = 0.55 + 0.45 * ((i + 1) / list.length); // 新しい打ほど少し濃い
      const R = m * (0.18 + 0.1 * v);
      const gr = c.createRadialGradient(x * w, y * h, 0, x * w, y * h, R);
      gr.addColorStop(0, `rgba(${r},${g},${b},${1.0 * age})`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });
    return true;
  }
  function show(list, instant) {
    if (!paint(list)) return;
    el.style.transition = instant ? 'none' : 'opacity 1.4s cubic-bezier(.4,0,.2,1)';
    el.style.opacity = '0';
    void el.offsetWidth;
    el.style.opacity = "0.22";
    setState('shown');
  }
  // 起動時
  if (demoSeed) show(SEED, true);
  else { const l = read(); if (l) show(l, false); }

  return {
    // 打を覚える（保存は静けさのあと）
    record(x, y, vel) {
      pts.push([+x.toFixed(3), +y.toFixed(3), +Math.min(1, vel).toFixed(2)]);
      if (pts.length > MAX) pts.shift();
      dirty = true;
    },
    // 最初の打で洗う
    wash() {
      if (state !== 'shown') return;
      el.style.transition = 'opacity 2.5s cubic-bezier(.4,0,.2,1)';
      el.style.opacity = '0';
      setState('washing');
      setTimeout(() => { setState('washed'); el.width = 1; el.height = 1; }, 2600);
    },
    save() {
      if (!dirty || !pts.length) return;
      try { localStorage.setItem(KEY, JSON.stringify({ p: pts })); dirty = false; if (state !== 'shown' && state !== 'washing') setState('saved'); } catch { /* noop */ }
    },
  };
}
