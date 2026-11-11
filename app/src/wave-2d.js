// Canvas2D フォールバック: 同心円の波紋だけの簡易版。
export function create2D(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return null;
  let w = 1, h = 1, px = 1;
  const rings = [];
  const css = (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;

  function resize(cssW, cssH, dpr) {
    px = Math.min(dpr, 2);
    w = Math.max(1, Math.round(cssW * px)); h = Math.max(1, Math.round(cssH * px));
    canvas.width = w; canvas.height = h;
    return true;
  }
  // uy は下が 0（GL 側と同じ）
  function splat(ux, uy, amp, radiusShort) {
    rings.push({ x: ux, y: 1 - uy, age: 0, a: Math.min(1, amp * 2.2), r0: radiusShort });
    if (rings.length > 40) rings.shift();
  }
  function frame(dt, pal) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.6, 0, w * 0.5, h * 0.6, Math.max(w, h) * 0.8);
    g.addColorStop(0, css(pal.mid)); g.addColorStop(1, css(pal.deep));
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const m = Math.min(w, h);
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      const life = 4.2;
      if (r.age > life) { rings.splice(i, 1); continue; }
      const k = r.age / life;
      for (let j = 0; j < 3; j++) {
        const rad = (r.age * 0.28 - j * 0.035) * m + r.r0 * m;
        if (rad <= 0) continue;
        const a = r.a * (1 - k) * (1 - k) * (0.5 - j * 0.14);
        ctx.strokeStyle = css(pal.accent, Math.max(0, a));
        ctx.lineWidth = (2.4 - j * 0.6) * px;
        ctx.beginPath(); ctx.arc(r.x * w, r.y * h, rad, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }
  return { kind: '2d', resize, splat, frame };
}
