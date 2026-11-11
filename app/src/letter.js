// 響の手紙: 直近のタップ最大 8 回を URL の #w= に宿す。1 打 = 4 バイト（x, y, 強さ, 直前との間隔）を base64url に。
const MAX = 8, MAX_DT = 4000;
const b64 = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const q = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));

// 戻り値: [{ x, y, vel, dt(ms) }, ...]。壊れていれば null
export function decodeLetter(hash) {
  try {
    const m = /^#w=([A-Za-z0-9_-]+)$/.exec(hash || '');
    if (!m) return null;
    const u = unb64(m[1]);
    if (!u.length || u.length % 4 || u.length > MAX * 4) return null;
    const out = [];
    for (let i = 0; i < u.length; i += 4) out.push({ x: u[i] / 255, y: u[i + 1] / 255, vel: u[i + 2] / 255, dt: u[i + 3] / 255 * MAX_DT });
    return out;
  } catch { return null; }
}

export function createLetterRecorder(onChange) {
  const taps = [];
  let lastT = 0, timer = 0, lastWrite = 0, hash = '';
  function flush() {
    timer = 0; lastWrite = performance.now();
    try { history.replaceState(null, '', location.pathname + location.search + hash); } catch { /* noop */ }
  }
  return {
    record(x, y, vel) {
      const now = performance.now();
      taps.push({ x: q(x), y: q(y), v: q(vel), d: taps.length ? q(Math.min(MAX_DT, now - lastT) / MAX_DT) : 0 });
      if (taps.length > MAX) taps.shift();
      lastT = now;
      const u = new Uint8Array(taps.length * 4);
      taps.forEach((t, i) => { u[i * 4] = t.x; u[i * 4 + 1] = t.y; u[i * 4 + 2] = t.v; u[i * 4 + 3] = i ? t.d : 0; });
      hash = '#w=' + b64(u);
      onChange(taps.length, hash.length);
      // 800ms デバウンス・書き込みは最大 1 回/秒
      clearTimeout(timer);
      timer = setTimeout(flush, Math.max(800, lastWrite + 1000 - now));
    },
  };
}
