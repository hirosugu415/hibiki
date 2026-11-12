// 夜光虫: 水中にまばらに浮かぶ青白い光の粒。波面が届くと光り、わずかに押され、小さな鈴の音を返す。
// 描画は Canvas2D 1 枚。呼び出し側のループ（frame）が回っている間だけ動き、止まれば最後のフレームのまま。
const REST_MIN = 0.12, REST_MAX = 0.3, LIT_CAP = 0.55;
const SOUND_MAX = 6; // 1 回の hit で鳴らす粒
const SOUND_POLY = 3; // 同時に鳴る粒（約 0.45 秒の窓）

// シード固定の疑似乱数（毎回同じ配置）
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function createGlimmer({ canvas, view, accent, stone, speed, sound, wake }) {
  const ctx2 = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const body = document.body;
  const parts = [];
  let W = 1, H = 1, count = 0, glints = 0, lastSnd = [];
  const sparks = []; // 波面の縁に乗る点線の光（輪ごとに一組。粒そのものではなく、波が水中の微かな光を拾う描画）
  const SPARK_LIFE = 1300;
  body.dataset.glimmer = '0'; body.dataset.glints = '0';

  function layout() {
    const v = view(); W = v.w; H = v.h;
    const n = W <= 600 ? 32 : 48;
    if (n !== count) { // 粒数は幅で決まる（通常は起動時に一度だけ）
      count = n; parts.length = 0;
      const r = rng(20211);
      for (let i = 0; i < n; i++) {
        parts.push({ fx: r(), fy: r(), x: 0, y: 0, ox: 0, oy: 0, vx: 0, vy: 0, ph: r() * 6.283, sp: 0.35 + r() * 0.55, rad: 1 + Math.pow(r(), 1.6) * 1.5, amp: r(), lit: 0, pend: [] });
      }
      body.dataset.glimmer = String(n);
    }
    // バー・ヒント（下 215px）・「響」（上 90px）の領域には置かない
    const top = 96, bottom = Math.max(top + 80, H - 215), left = 18, right = W - 18;
    for (const p of parts) { p.x = left + p.fx * (right - left); p.y = top + p.fy * (bottom - top); }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    if (ctx2) ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 波源 (x,y: 0–1) から広がる波面が各粒に届く時刻を見積もって予約する
  function hit(x, y, power = 1, opts = {}) {
    if (!ctx2 || !parts.length) return;
    const now = performance.now(), sp = speed(); // px/秒
    const sx = x * W, sy = y * H, st = stone();
    if (opts.sound && power > 0.45) { // 縁の点線の光
      while (sparks.length >= 5) sparks.shift();
      const n = W <= 600 ? 12 : 18, r = rng(Math.floor(sx * 7 + sy * 13 + now) | 1), a0 = r() * 6.283, list = [];
      for (let i = 0; i < n; i++) list.push({ a: a0 + (i + (r() - 0.5) * 0.6) / n * 6.283, ph: r() * 6.283, f: 9 + r() * 7, rad: 1.3 + r() * 0.9, j: (r() - 0.5) * 5 });
      sparks.push({ x: sx, y: sy, t0: now, list });
    }
    const reach = 2000 * Math.max(0.35, Math.min(1.2, power)); // これより遅く届く粒は光らせない
    const cand = [];
    for (const p of parts) {
      const dx = p.x - sx, dy = p.y - sy, d = Math.hypot(dx, dy);
      let delay = d / sp * 1000;
      if (st && d > 1) { // 石の影: 波源と粒を結ぶ線が石を横切れば少し遅らせる
        const t = Math.max(0, Math.min(1, ((st.x - sx) * dx + (st.y - sy) * dy) / (d * d)));
        const cx = sx + dx * t, cy = sy + dy * t;
        if (t < 1 && Math.hypot(st.x - cx, st.y - cy) < st.r && Math.hypot(st.x - sx, st.y - sy) < d) delay += 400;
      }
      if (delay > reach) continue;
      cand.push({ p, delay, ux: d > 1 ? dx / d : 0, uy: d > 1 ? dy / d : 0 });
    }
    cand.sort((a, b) => a.delay - b.delay);
    let sounded = 0, maxAt = 0;
    for (const c of cand) {
      const snd = opts.sound && sounded < SOUND_MAX && c.delay >= 120;
      if (snd) sounded++;
      const at = now + c.delay;
      c.p.pend.push({ at, ux: c.ux, uy: c.uy, str: 0.55 + 0.45 * Math.min(1, power), snd: snd ? now + Math.max(c.delay, 280) : 0 });
      if (at > maxAt) maxAt = at;
    }
    if (cand.length) wake(Math.max(1600, maxAt - now + 1600));
  }

  function fire(p, ev, now) {
    p.lit = 1; p.vx += ev.ux * 34 * ev.str; p.vy += ev.uy * 34 * ev.str;
    glints++; body.dataset.glints = String(glints);
    if (ev.snd) { // 鈴: 横位置の音階音・最高音域・短い減衰。同時 3 声まで
      lastSnd = lastSnd.filter((t) => now - t < 450);
      if (lastSnd.length < SOUND_POLY && sound(p.x / W, p.y / H)) {
        lastSnd.push(now);
        body.dataset.glintLast = Math.round(p.x) + ',' + Math.round(p.y);
      }
    }
  }

  // c97 出会いの粒: 2 つの輪が出会う点に一粒だけ（半径 ~6.5px の青白い芯 + ごく薄い縁、~1.1 秒で消える）
  const meets = [];
  function spark(x, y) {
    if (!ctx2) return;
    meets.push({ x: x * W, y: y * H, t0: performance.now() });
    while (meets.length > 3) meets.shift();
    wake(1400);
  }
  function drawMeets(now, c) {
    for (let k = meets.length - 1; k >= 0; k--) {
      const m = meets[k], age = now - m.t0, LIFE = 1100;
      if (age > LIFE) { meets.splice(k, 1); continue; }
      const u = age / LIFE, env = Math.min(1, age / 90) * Math.pow(1 - u, 1.3), r = 6.5 + 1.5 * u;
      ctx2.fillStyle = `rgba(200,228,255,${(0.2 * env).toFixed(3)})`;
      ctx2.beginPath(); ctx2.arc(m.x, m.y, r * 2.1, 0, 6.283); ctx2.fill();
      ctx2.fillStyle = `rgba(244,250,255,${(0.97 * env).toFixed(3)})`;
      ctx2.beginPath(); ctx2.arc(m.x, m.y, r, 0, 6.283); ctx2.fill();
    }
  }

  function drawSparks(now, c, st) {
    const sp = speed();
    for (let k = sparks.length - 1; k >= 0; k--) {
      const s = sparks[k], age = now - s.t0;
      if (age > SPARK_LIFE) { sparks.splice(k, 1); continue; }
      if (age < 90) continue;
      const u = age / SPARK_LIFE, env = Math.min(1, age / 220) * Math.pow(1 - u, 0.9);
      const R0 = sp * age / 1000;
      for (const q of s.list) {
        const R = R0 + q.j; // 輪の縁の近く（± 2.5px の揺れ）
        const x = s.x + Math.cos(q.a) * R, y = s.y + Math.sin(q.a) * R;
        if (x < 6 || x > W - 6 || y < 70 || y > H - 190) continue; // 「響」・ヒント・バーの領域には出さない
        let al = LIT_CAP * env * (0.7 + 0.3 * Math.sin(q.ph + age / 1000 * q.f));
        if (st) { const d = Math.hypot(x - st.x, y - st.y), e = st.r * 1.12; if (d < e + 24) al *= Math.max(0, (d - e) / 24); }
        if (al < 0.02) continue;
        ctx2.fillStyle = `rgba(${c},${(al * 0.2).toFixed(3)})`; // 点の 2.2 倍・不透明度 1/5 のごく小さな芯の光
        ctx2.beginPath(); ctx2.arc(x, y, q.rad * 2.2, 0, 6.283); ctx2.fill();
        ctx2.fillStyle = `rgba(${c},${al.toFixed(3)})`;
        ctx2.beginPath(); ctx2.arc(x, y, q.rad, 0, 6.283); ctx2.fill();
      }
    }
  }

  function frame(now, dt) {
    if (!ctx2 || !parts.length) return;
    const a = accent(), t = now / 1000;
    const c = a.map((v) => Math.round((v + (1 - v) * 0.55) * 255)).join(','); // 青白（アクセントを白へ寄せる）
    const st = stone();
    const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const kd = Math.exp(-dt / 0.4), w = 1 / 0.6;
    ctx2.clearRect(0, 0, W, H);
    drawSparks(now, c, st);
    drawMeets(now, c);
    for (const p of parts) {
      for (let i = p.pend.length - 1; i >= 0; i--) if (now >= p.pend[i].at) { fire(p, p.pend[i], now); p.pend.splice(i, 1); }
      p.lit *= kd;
      // 臨界減衰ばねで元の位置へ戻る
      p.vx += (-w * w * p.ox - 2 * w * p.vx) * dt; p.vy += (-w * w * p.oy - 2 * w * p.vy) * dt;
      p.ox += p.vx * dt; p.oy += p.vy * dt;
      const x = p.x + p.ox, y = p.y + p.oy;
      const breath = calm ? 0.5 : 0.5 + 0.5 * Math.sin(p.ph + t * p.sp);
      let al = REST_MIN + (REST_MAX - REST_MIN) * (0.35 + 0.65 * p.amp) * breath;
      al = Math.min(LIT_CAP, al + p.lit * (LIT_CAP - al));
      if (st) { // 石の上には出さない
        const d = Math.hypot(x - st.x, y - st.y), e = st.r * 1.12;
        if (d < e + 24) al *= Math.max(0, (d - e) / 24);
      }
      if (al < 0.01) continue;
      const r = p.rad + 0.6 * p.lit; // 点灯で半径 +0.6px（鋭い点のまま）
      if (p.lit > 0.08) { // 芯の光: 点の 2.2 倍・不透明度は点の 1/5（ハローにしない）
        ctx2.fillStyle = `rgba(${c},${(al * 0.2).toFixed(3)})`;
        ctx2.beginPath(); ctx2.arc(x, y, r * 2.2, 0, 6.283); ctx2.fill();
      }
      ctx2.fillStyle = `rgba(${c},${al.toFixed(3)})`;
      ctx2.beginPath(); ctx2.arc(x, y, r, 0, 6.283); ctx2.fill();
    }
  }

  layout();
  return { layout, hit, spark, frame, get count() { return count; } };
}
