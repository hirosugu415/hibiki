import './style.css';
import { MOODS, MOOD_ORDER, NOTE_COUNT, noteFreq, noteIndex } from './moods.js';
import { createGL } from './wave-gl.js';
import { create2D } from './wave-2d.js';
import { createAudio } from './audio.js';
import { createGhost } from './ghost.js';
import { createEcho } from './echo.js';
import { createGlimmer } from './glimmer.js';
import { decodeLetter, createLetterRecorder } from './letter.js';

const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1';

const store = {
  get(k) { try { return localStorage.getItem('hibiki.' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('hibiki.' + k, v); } catch { /* noop */ } },
};

const canvas = document.getElementById('water');
const hint = document.getElementById('hint');
const dot = document.getElementById('ghost-dot');
const bar = document.getElementById('bar');
const muteBtn = document.getElementById('mute');
const moodBtns = [...document.querySelectorAll('.mood')];

// ---- 描画バックエンド（WebGL2 → Canvas2D） ----
let backend = params.get('fallback') === '1' ? null : createGL(canvas);
let viewW = 1, viewH = 1;
function sizeBackend() {
  viewW = window.innerWidth || 1; viewH = window.innerHeight || 1;
  const ok = backend.resize(viewW, viewH, window.devicePixelRatio || 1);
  if (ok === false && backend.kind === 'webgl2') toFallback();
}
function toFallback() {
  // 同じ canvas は WebGL コンテキストに取られているため、置き換えて 2D を使う
  const fresh = canvas.cloneNode(false);
  canvas.replaceWith(fresh);
  bindCanvas(fresh);
  backend = create2D(fresh);
  sizeBackend();
}
if (!backend) {
  backend = create2D(canvas);
}
if (!backend) { document.body.dataset.render = 'none'; }
document.body.dataset.render = backend ? backend.kind : 'none';

// ---- パレット（ムード切替で約 1 秒クロスフェード） ----
const PKEYS = ['deep', 'mid', 'accent', 'look'];
const pal = { deep: [...MOODS.calm.deep], mid: [...MOODS.calm.mid], accent: [...MOODS.calm.accent], look: [...MOODS.calm.look] };
let mood = MOODS[store.get('mood')] || MOODS.calm;
let target = mood;
const themeMeta = document.querySelector('meta[name="theme-color"]');
const to255 = (c) => c.map((v) => Math.round(v * 255)).join(' ');
function applyCss() {
  const r = document.documentElement.style;
  r.setProperty('--accent', to255(pal.accent));
  r.setProperty('--deep', to255(pal.deep));
}
function snapPalette(m) { for (const k of PKEYS) for (let i = 0; i < pal[k].length; i++) pal[k][i] = m[k][i]; applyCss(); }
snapPalette(mood);

// ---- 音 ----
let lastTouch = -1e9; // 最後に人が触れた時刻（雨粒の抑制に使う）
const audio = createAudio();
audio.setMood(mood);
window.addEventListener('pointerdown', (e) => {
  lastTouch = performance.now(); audio.unlock(); audio.applyPendingMood();
  if (!(e.target && e.target.closest && e.target.closest('#wordmark'))) letterVoice();
}, { capture: true });
window.addEventListener('keydown', () => { lastTouch = performance.now(); audio.unlock(); audio.applyPendingMood(); }, { capture: true });

// ---- 石: 水に浮かぶ暗い石。波を反射・回折させ、ドラッグで動かせる ----
const stone = { x: 0.5, y: 0.6, tx: 0.5, ty: 0.6, grab: null, hitT: 0, glide: false, vx: 0, vy: 0 };
document.body.dataset.stones = '0';
document.body.dataset.stoneHits = '0';
document.body.dataset.stonePush = '0';
const stoneR = () => Math.max(0.07 * Math.min(viewW, viewH), 44); // CSS px
function clampStone(x, y) {
  const r = stoneR(), rx = r / viewW + 0.015;
  const top = (84 + r) / viewH, bottom = 1 - (112 + r) / viewH;
  return [Math.min(1 - rx, Math.max(rx, x)), Math.min(Math.max(top, bottom), Math.max(top, y))];
}
function pushStone() {
  if (!backend || !backend.setStone) return;
  backend.setStone(stone.x, 1 - stone.y, stoneR());
  pushBar();
  document.body.dataset.stones = '1';
  document.body.dataset.stone = stone.x.toFixed(3) + ',' + stone.y.toFixed(3);
}
function placeStone() { [stone.x, stone.y] = clampStone(stone.x, stone.y); stone.tx = stone.x; stone.ty = stone.y; stone.glide = false; stone.vx = stone.vy = 0; pushStone(); }

// ---- 砂州: 波を曲げる浅瀬。ゆっくり往復する（位相は rAF が回っている間の dt だけで進める） ----
const BAR_PERIOD = 90; // 秒
const shoal = { phase: BAR_PERIOD * Math.asin(0.4) / (2 * Math.PI), x: 0.62, y: 0.33, chimeT: 0, key: '' };
document.body.dataset.barChimes = '0';
const barRx = () => 0.26 * Math.min(viewW, viewH), barRy = () => 0.13 * Math.min(viewW, viewH); // CSS px
function barPlace() {
  const w = shoal.phase / BAR_PERIOD * Math.PI * 2;
  // 画面が狭いほど振れ幅を縮め、砂州の左右の端が画面内に収まるようにする（desktop ではほぼ従来どおり）
  shoal.x = 0.5 + Math.max(0.05, 0.5 - barRx() / viewW - 0.06) * Math.sin(w);
  shoal.y = 0.33 + 0.03 * Math.sin(w * 1.5 + 1);
}
function pushBar() {
  if (!backend || !backend.setBar) return;
  barPlace();
  backend.setBar(shoal.x, 1 - shoal.y, barRx(), barRy());
  const k = shoal.x.toFixed(3) + ',' + shoal.y.toFixed(3);
  if (k !== shoal.key) { shoal.key = k; document.body.dataset.bar = k; }
}

// ---- 夜光虫: 水中の光の粒（波面が届くと光り、押され、鈴を鳴らす）。ループが回っている間だけ描く ----
const WAVE_SPEED = () => 0.68 * 95 * (Math.max(viewW, viewH) / 420); // px/秒（sim は長辺 420 セルなので長辺で割る）
const glimmer = createGlimmer({
  canvas: document.getElementById('glimmer'),
  view: () => ({ w: viewW, h: viewH }),
  accent: () => pal.accent,
  stone: () => (backend && backend.setStone ? { x: stone.x * viewW, y: stone.y * viewH, r: stoneR() } : null),
  speed: WAVE_SPEED,
  sound(x, yTop) { // 輪の音の 1/4 以下の音量・最高音域・短い減衰
    if (!audio.live) return false;
    const i = noteIndex(x);
    audio.play(Math.min(2600, noteFreq(target, 5 + (i % 5)) * 2), 0.9, 0.5, x, 0.32, 0.2);
    return true;
  },
  wake,
});

// ---- ループ制御（静止時は止めて CPU/GPU を休ませる） ----
let running = false, last = 0, keepUntil = 0;
function wake(ms) {
  const now = performance.now();
  keepUntil = Math.max(keepUntil, now + ms);
  if (!running && backend) { running = true; last = now; requestAnimationFrame(tick); }
}
function tick(now) {
  const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
  last = now;
  const k = 1 - Math.exp(-dt / 0.3);
  let moving = false;
  for (const key of PKEYS) for (let i = 0; i < pal[key].length; i++) {
    const d = target[key][i] - pal[key][i];
    if (Math.abs(d) > 0.0005) { pal[key][i] += d * k; moving = true; } else pal[key][i] = target[key][i];
  }
  if (moving) applyCss();
  { // 石の追従（軽い慣性）
    const dx = stone.tx - stone.x, dy = stone.ty - stone.y;
    if (stone.glide) { // 波に押されたとき: 臨界減衰ばね（行き過ぎず、ゆっくり滑り出して止まる）
      const w = 1 / 0.26;
      stone.vx += (w * w * dx - 2 * w * stone.vx) * dt; stone.vy += (w * w * dy - 2 * w * stone.vy) * dt;
      stone.x += stone.vx * dt; stone.y += stone.vy * dt; pushStone(); moving = true;
      if (Math.abs(dx) < 0.0002 && Math.abs(dy) < 0.0002 && Math.abs(stone.vx) + Math.abs(stone.vy) < 0.0004) {
        stone.x = stone.tx; stone.y = stone.ty; stone.glide = false; stone.vx = stone.vy = 0; pushStone();
      }
    } else if (Math.abs(dx) > 0.0002 || Math.abs(dy) > 0.0002) {
      const ks = 1 - Math.exp(-dt / 0.07);
      stone.x += dx * ks; stone.y += dy * ks; pushStone(); moving = true;
    } else if (dx || dy) { stone.x = stone.tx; stone.y = stone.ty; pushStone(); }
  }
  shoal.phase = (shoal.phase + dt) % BAR_PERIOD; pushBar();
  try { backend.frame(dt, pal); } catch { /* 描画失敗でも落とさない */ }
  try { glimmer.frame(now, dt); } catch { /* noop */ }
  if (now < keepUntil || moving) requestAnimationFrame(tick); else running = false;
}

// ---- 触れる → 波紋 + 音 ----
const LIVE = 14000;
let touched = store.get('hint') === '1';
if (touched) hint.classList.add('gone');

function ripple(x, yTop, amp, radius, live = LIVE) {
  if (!backend) return;
  backend.splat(x, 1 - yTop, amp, radius);
  wake(live);
}
function note(x, yTop, vel) {
  const m = target;
  audio.play(noteFreq(m, noteIndex(x)), Math.min(1, Math.max(0, 1 - yTop + m.bright)), vel, x);
}
// 触れた瞬間の光の滲み。色は音高（x）に応じて、アクセントの周りでわずかに変える。
const mix = (a, b, t) => a + (b - a) * t;
function flash(x, yTop, vel, soft = 1) {
  if (!document.body || !target) return;
  const a = pal.accent, k = noteIndex(x) / (NOTE_COUNT - 1); // 0=低 … 1=高
  const white = 0.1 + 0.34 * k; // 高い音ほど白寄り
  const c = a.map((v) => Math.round(mix(v, 1, white) * 255));
  const warm = (0.5 - k) * 0.12; // 低い音は少しだけ暖色/深め
  const rgb = [c[0] + warm * 255, c[1], c[2] - warm * 255].map((v) => Math.max(0, Math.min(255, Math.round(v))));
  const size = (150 + 70 * vel) * (soft < 1 ? 0.8 : 1);
  const el = document.createElement('div');
  el.className = 'flash';
  el.style.cssText = `left:${x * viewW}px;top:${yTop * viewH}px;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;` +
    `background:radial-gradient(closest-side, rgb(${rgb.join(' ')} / ${((0.5 + 0.2 * k) * soft).toFixed(2)}), rgb(${rgb.join(' ')} / ${(0.3 * soft).toFixed(2)}) 50%, rgb(${rgb.join(' ')} / ${(0.1 * soft).toFixed(2)}) 78%, transparent)`;
  document.body.appendChild(el);
  const done = () => el.remove();
  if (el.animate) {
    const an = el.animate([{ opacity: 0, transform: 'scale(.35)' }, { opacity: 1, transform: 'scale(.8)', offset: .18 }, { opacity: 0, transform: 'scale(1.25)' }],
      { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    an.onfinish = done; an.oncancel = done;
  } else setTimeout(done, 460);
  setTimeout(done, 900);
}
// こだまの戻りの光輪: 波シミュレーションとは独立した CSS 要素（transform / opacity のみ）。数秒かけて広がって消える。
const rings = [];
const calmMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
function echoRing(x, yTop, st) {
  if (!document.body) return;
  while (rings.length >= 8) rings.shift().remove();
  const size = Math.round(210 * st.ring), dur = st.ring < 1 ? 3200 : 2800;
  const el = document.createElement('div');
  el.className = 'echo-ring';
  el.style.cssText = `left:${x * viewW}px;top:${yTop * viewH}px;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;--o:${st.ring < 1 ? 0.7 : 1}`;
  document.body.appendChild(el);
  rings.push(el);
  const done = () => { el.remove(); const i = rings.indexOf(el); if (i >= 0) rings.splice(i, 1); };
  const calm = calmMotion && calmMotion.matches;
  if (el.animate) {
    const fade = el.animate([{ opacity: 0 }, { opacity: 1, offset: .16 }, { opacity: .5, offset: .6 }, { opacity: 0 }], { duration: dur, easing: 'linear', fill: 'forwards' });
    if (!calm) el.animate([{ transform: 'scale(.2)' }, { transform: 'scale(1)' }], { duration: dur, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    else el.style.transform = 'scale(.7)';
    fade.onfinish = done; fade.oncancel = done;
  }
  setTimeout(done, dur + 600);
}
// 波が石に届いたとき、波源と反対へそっと押す。近いほど強く、1 回は石の半径まで。
function pushByWave(x, yTop) {
  if (stone.grab) return;
  const r = stoneR(), ddx = (stone.x - x) * viewW, ddy = (stone.y - yTop) * viewH;
  const d = Math.hypot(ddx, ddy);
  if (d < 1) return;
  let m = r * (0.15 + 0.55 * Math.exp(-Math.max(0, d - r) / (4 * r)));
  m = Math.min(r, m * (DEMO ? 0.5 : 1));
  const [nx, ny] = clampStone(stone.tx + ddx / d * m / viewW, stone.ty + ddy / d * m / viewH);
  if (nx === stone.tx && ny === stone.ty) return;
  stone.tx = nx; stone.ty = ny; stone.glide = true;
  document.body.dataset.stonePush = String((+document.body.dataset.stonePush || 0) + 1);
  wake(2600);
}
// 波が石に届く頃（距離÷波速の概算）に、石が低くそっと鳴る。1 タップにつき最大 1 回。
function stoneEcho(x, yTop) {
  if (!backend || backend.kind !== 'webgl2') return;
  const r = stoneR(), dist = Math.max(0, Math.hypot((x - stone.x) * viewW, (yTop - stone.y) * viewH) - r);
  const speed = 0.68 * 95 * (viewW / 420); // sim の波速 ≈ √0.47 セル/ステップ × 95Hz
  const delay = Math.min(4000, dist / speed * 1000);
  const hz = noteFreq(target, noteIndex(x));
  setTimeout(() => {
    const now = performance.now();
    if (now - stone.hitT < 180) return;
    stone.hitT = now;
    const n = (+document.body.dataset.stoneHits || 0) + 1;
    document.body.dataset.stoneHits = String(n);
    audio.play(hz >= 200 ? hz / 2 : hz, 0.2, 0.34, stone.x, 0.55);
    backend.firePulse(); wake(1600);
    pushByWave(x, yTop);
  }, delay);
}
// 波が砂州の中心に届く頃（浅瀬は遅いので 1.4 倍）、砂州がやわらかい鐘を 1 回鳴らす。1 タップ最大 1 回・間隔 0.6 秒以上
function barChime(x, yTop) {
  if (!backend || backend.kind !== 'webgl2' || audio.muted) return;
  const dist = Math.hypot((x - shoal.x) * viewW, (yTop - shoal.y) * viewH);
  const speed = 0.68 * 95 * (viewW / 420);
  const delay = Math.max(250, Math.min(5000, dist / speed * 1000 * 1.4));
  const hzBase = noteFreq(target, noteIndex(shoal.x));
  setTimeout(() => {
    const now = performance.now();
    if (audio.muted || document.hidden || now - shoal.chimeT < 600) return;
    // 石と重なっているときは鐘だけ抑える
    if (Math.hypot((shoal.x - stone.x) * viewW, (shoal.y - stone.y) * viewH) < stoneR() + barRy()) return;
    shoal.chimeT = now;
    document.body.dataset.barChimes = String((+document.body.dataset.barChimes || 0) + 1);
    audio.play(Math.min(1600, hzBase * 2), 0.55, 0.3, shoal.x, 1.7);
  }, delay);
}
const letterRec = createLetterRecorder((n, len) => { document.body.dataset.letter = `n=${n};len=${len}`; });
function tap(x, yTop, vel = 1, record = true) {
  ripple(x, yTop, 0.3 + 0.2 * vel, 0.013);
  note(x, yTop, vel);
  stoneEcho(x, yTop);
  barChime(x, yTop);
  glimmer.hit(x, yTop, 0.6 + 0.4 * vel, { sound: true });
  if (!backend || backend.kind !== 'webgl2') flash(x, yTop, vel); // WebGL2 では光は屈折シェーダーが描く
  if (record) echo.record(x, yTop, vel);
}

// ---- こだま: 触れた場所が数秒後にそっと戻る（自身は記録しない） ----
document.body.dataset.echoes = '0';
document.body.dataset.echoPending = '0';
const echo = createEcho({
  play(x, yTop, vel, st) {
    ripple(x, yTop, (0.3 + 0.2 * vel) * st.amp, 0.018, 5000);
    note(x, yTop, vel * st.vel);
    echoRing(x, yTop, st);
  },
  onChange(n, p) { document.body.dataset.echoes = String(n); document.body.dataset.echoPending = String(p); },
});

// ---- 長押しの泉: 動かさずに 260ms 押し続けると、その点から輪が湧き続け、音が伸びる ----
const HOLD_MS = 260;
document.body.dataset.holding = '0';
let fountain = null; // { owner, ref, timer, voice }
function fountainTick(f) {
  f.timer = 0;
  if (fountain !== f) return;
  const k = noteIndex(f.ref.x) / (NOTE_COUNT - 1); // 0=低 … 1=高
  // 低い音ほどゆったり・太く、高い音ほど細かく
  ripple(f.ref.x, f.ref.y, 0.2, mix(0.022, 0.014, k), 1400);
  f.n = (f.n || 0) + 1;
  if (f.n % 2 === 1) glimmer.hit(f.ref.x, f.ref.y, 0.5); // 泉の周りの粒が輪の間隔で脈打つ（光だけ）
  if (f.owner === 'ghost') dotShow(f.ref.x, f.ref.y);
  f.timer = setTimeout(() => fountainTick(f), mix(340, 230, k));
}
function fountainStart(owner, ref) {
  if (!backend || fountain) return;
  const f = fountain = { owner, ref, timer: 0, voice: null };
  const m = target, hz = noteFreq(m, noteIndex(ref.x));
  f.voice = audio.voiceHold(hz, Math.min(1, Math.max(0, 1 - ref.y + m.bright)), (ref.x * 2 - 1) * 0.5);
  document.body.dataset.holding = '1';
  document.body.dataset.holdHz = hz.toFixed(1);
  fountainTick(f);
}
// reward=true は正常に離したとき（pointerup / ゴーストの長押し終わり）だけ。1 回の離しにつき必ず 1 回。
function fountainStop(owner, reward = false) {
  const f = fountain;
  if (!f || (owner !== undefined && f.owner !== owner)) return;
  fountain = null;
  if (f.timer) clearTimeout(f.timer);
  if (f.voice) f.voice.release();
  document.body.dataset.holding = '0';
  delete document.body.dataset.holdHz;
  if (reward) releaseRing(f);
}
// 離した瞬間の大きなひと輪: 泉の輪より太く（半径 約 1.5 倍）・強く（振幅 約 2 倍）ゆっくり広がる。
function releaseRing(f) {
  const { x, y } = f.ref;
  const k = noteIndex(x) / (NOTE_COUNT - 1);
  ripple(x, y, 0.4, mix(0.022, 0.014, k) * 1.5, 6000);
  glimmer.hit(x, y, 1, { sound: true });
  const m = target, hz = noteFreq(m, noteIndex(x));
  audio.play(hz >= 200 ? hz / 2 : hz, Math.min(1, Math.max(0, 1 - y + m.bright)), 0.8, x);
  const n = (+document.body.dataset.releases || 0) + 1;
  document.body.dataset.releases = String(n);
}

const pointers = new Map();
function armHold(id, p) {
  const wait = () => {
    p.timer = 0;
    if (pointers.get(id) !== p) return;
    const still = performance.now() - Math.max(p.t0, p.moveT);
    if (still >= HOLD_MS) fountainStart(id, p); else p.timer = setTimeout(wait, HOLD_MS - still + 5);
  };
  p.timer = setTimeout(wait, HOLD_MS + 5);
}
// 初回の触れで、アニメーション中の現在の不透明度から素早く消す
function hideHint() {
  try { hint.style.animation = 'none'; hint.style.opacity = getComputedStyle(hint).opacity; void hint.offsetWidth; } catch { /* noop */ }
  hint.classList.add('gone');
}
function onDown(e) {
  if (e.button > 0 && e.pointerType === 'mouse') return;
  e.preventDefault();
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  if (!touched) { touched = true; store.set('hint', '1'); hideHint(); }
  ghost.retreat();
  letterStop();
  if (!stone.grab && backend && backend.setStone && Math.hypot(e.clientX - stone.x * viewW, e.clientY - stone.y * viewH) <= stoneR() + 10) {
    stone.grab = { id: e.pointerId, ox: stone.x - e.clientX / viewW, oy: stone.y - e.clientY / viewH };
    stone.glide = false; stone.vx = stone.vy = 0;
    grabPing();
    return;
  }
  const x = e.clientX / viewW, y = e.clientY / viewH;
  const old = pointers.get(e.pointerId);
  if (old) onUp(e);
  const now = performance.now();
  const p = { x, y, idx: noteIndex(x), t: now, t0: now, moveT: now, lx: e.clientX, ly: e.clientY, timer: 0 };
  pointers.set(e.pointerId, p);
  tap(x, y, 1);
  letterRec.record(x, y, 1);
  vesselAdd(1);
  armHold(e.pointerId, p);
}
function strokeTo(p, x, y, fromGhost) {
  const dx = (x - p.x) * viewW / Math.min(viewW, viewH), dy = (y - p.y) * viewH / Math.min(viewW, viewH);
  const dist = Math.hypot(dx, dy), step = 0.03;
  // 連続した1本の筋: 距離に比例して注入し（遅いほど弱く）、同時波源は最大 10 に間引く
  const n = Math.max(1, Math.min(10, Math.ceil(dist / step)));
  const amp = (fromGhost ? 0.07 : 0.13) * Math.min(1, dist / (n * step));
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    ripple(p.x + (x - p.x) * k, p.y + (y - p.y) * k, amp, 0.026);
  }
  const idx = noteIndex(x), now = performance.now();
  if (idx !== p.idx && now - p.t > (fromGhost ? 220 : 110)) { note(x, y, 0.7); p.idx = idx; p.t = now; }
  p.x = x; p.y = y;
}
// 石を掴んだ瞬間のわずかな波（縁のすぐ外に小さく 4 点）と、縁の光
function grabPing() {
  const r = stoneR() * 1.18;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + 0.6;
    ripple(stone.x + Math.cos(a) * r / viewW, stone.y + Math.sin(a) * r / viewH, 0.07, 0.01, 1500);
  }
  backend.firePulse(); wake(1600);
}
function onMove(e) {
  if (stone.grab && stone.grab.id === e.pointerId) {
    e.preventDefault(); lastTouch = performance.now();
    [stone.tx, stone.ty] = clampStone(e.clientX / viewW + stone.grab.ox, e.clientY / viewH + stone.grab.oy);
    wake(600);
    return;
  }
  const p = pointers.get(e.pointerId);
  if (!p) return;
  e.preventDefault();
  lastTouch = performance.now();
  if (Math.hypot(e.clientX - p.lx, e.clientY - p.ly) > 4) { p.moveT = lastTouch; p.lx = e.clientX; p.ly = e.clientY; }
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (evs.length ? evs : [e])) strokeTo(p, ev.clientX / viewW, ev.clientY / viewH, false);
}
function onUp(e) {
  if (stone.grab && stone.grab.id === e.pointerId) { stone.grab = null; return; }
  const p = pointers.get(e.pointerId);
  if (p && p.timer) clearTimeout(p.timer);
  pointers.delete(e.pointerId);
  fountainStop(e.pointerId, e.type === 'pointerup');
}
function releaseAll() {
  stone.grab = null;
  for (const [id, p] of pointers) { if (p.timer) clearTimeout(p.timer); pointers.delete(id); }
  fountainStop();
}
window.addEventListener('blur', releaseAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
function bindCanvas(el) {
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('lostpointercapture', onUp);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
bindCanvas(canvas);

// ---- 幽霊の指 ----
const ghostPtr = { x: 0.5, y: 0.5, idx: 0, t: 0 };
const ghost = createGhost({
  bar() { return { x: shoal.x, y: shoal.y, rx: barRx() / viewW }; },
  stone() { return { x: stone.x, y: stone.y, rx: stoneR() / viewW, ry: stoneR() / viewH }; },
  nudge(dx, dy) { // 石をそっとずらす（掴んで離すだけの小さな移動）
    stone.glide = false; stone.vx = stone.vy = 0;
    [stone.tx, stone.ty] = clampStone(stone.x + dx, stone.y + dy);
    grabPing(); wake(1800);
  },
  tap(x, y, vel) {
    // 石の真上には打たない（石に吸われてしまうので、少し上へずらす）
    const sr = stoneR() * 1.25;
    if (Math.hypot((x - stone.x) * viewW, (y - stone.y) * viewH) < sr) y = stone.y - sr / viewH;
    dotShow(x, y);
    ghostPtr.x = x; ghostPtr.y = y; ghostPtr.idx = noteIndex(x); ghostPtr.t = performance.now();
    tap(x, y, vel);
    if (DEMO) letterRec.record(x, y, vel); // デモ時のみ、幽霊の打も手紙に記録（「響」を押せるように）
    vesselAdd(DEMO ? 2 : 1); // デモの幽霊は約 10 秒で満たす
  },
  drag(x, y) { dotShow(x, y); strokeTo(ghostPtr, x, y, true); },
  holdStart(x, y) { ghostPtr.x = x; ghostPtr.y = y; fountainStart('ghost', ghostPtr); },
  holdEnd(reward) { fountainStop('ghost', !!reward); },
  dotHide() { dot.classList.remove('show'); },
}, { demo: DEMO });
function dotShow(x, y) {
  dot.style.transform = `translate(${x * viewW}px, ${y * viewH}px)`;
  dot.classList.add('show');
  clearTimeout(dotShow.t);
  dotShow.t = setTimeout(() => dot.classList.remove('show'), 420);
}

// ---- 響の手紙: #w= があれば、幽霊の指が記録された演奏を一度だけなぞる ----
const letter = decodeLetter(location.hash);
document.body.dataset.letter = 'n=0;len=' + (letter ? location.hash.length : 0);
document.body.dataset.letterPlay = '0';
let letterTimers = [], hintWas = null, hintTimer = 0;
function hintRestore() {
  clearTimeout(hintTimer); hintTimer = 0;
  if (hintWas === null) return;
  hint.textContent = hintWas.text;
  if (hintWas.gone) hint.classList.add('gone');
  hintWas = null;
}
// ヒントの文言を ms だけ差し替える（元の文言と表示状態は hintWas に 1 つだけ保持し、二重に差し替えない）
function hintSay(text, ms) {
  if (hintWas === null) hintWas = { text: hint.textContent, gone: hint.classList.contains('gone') };
  hint.textContent = text;
  if (hintWas.gone) { hint.style.animation = 'none'; hint.style.opacity = '.7'; } // 触れた後は静かな不透明度で見せる
  hint.classList.remove('gone');
  clearTimeout(hintTimer); hintTimer = setTimeout(hintRestore, ms);
}
// ユーザーが触れたら再生は中断（ユーザー優先）。再開は ghost.retreat が担当
function letterStop() {
  if (!letterTimers.length) return;
  letterTimers.forEach(clearTimeout); letterTimers = [];
  document.body.dataset.letterPlay = '0';
  if (hint.textContent === 'だれかの水面') hintRestore();
}
function letterPlay(taps) {
  document.body.dataset.letterPlay = '1';
  const later = (fn, ms) => { letterTimers.push(setTimeout(fn, ms)); };
  hintSay('だれかの水面', 2000);
  let t = 450;
  taps.forEach((s, i) => {
    if (i) t += Math.min(3000, Math.max(300, s.dt));
    later(() => { dotShow(s.x, s.y); tap(s.x, s.y, Math.max(0.4, s.vel), false); }, t);
  });
  later(() => { letterTimers = []; document.body.dataset.letterPlay = '0'; if (hint.textContent === 'だれかの水面') hintRestore(); ghost.start(); }, t + 1800);
}

// 受け手の最初の pointerdown（AudioContext が起きる操作）の約 0.6 秒後に、手紙を音つきで一度だけなぞる。
// 中断しない（ユーザーの打と並行して鳴ってよい）。
let voicedTaps = letter, voicedTimers = [], voicedDone = false;
if (letter) document.body.dataset.letterVoiced = '0';
function letterVoice() {
  if (!voicedTaps || !backend) return;
  const taps = voicedTaps; voicedTaps = null; voicedDone = true;
  const later = (fn, ms) => { voicedTimers.push(setTimeout(fn, ms)); };
  let t = 600;
  later(() => {
    document.body.dataset.letterVoiced = '1';
    document.body.dataset.letterPlay = '1';
    audio.unlock();
    hintSay('だれかの水面', 2000);
  }, t);
  taps.forEach((s, i) => {
    if (i) t += Math.min(3000, Math.max(300, s.dt));
    later(() => { dotShow(s.x, s.y); tap(s.x, s.y, Math.max(0.4, s.vel), false); }, t + 20);
  });
  later(() => { voicedTimers = []; document.body.dataset.letterPlay = '0'; if (hint.textContent === 'だれかの水面') hintRestore(); }, t + 1800);
}

// ---- 間欠の雨粒（通常モードのみ。触れられていない間、7〜11 秒に一滴） ----
let ambientN = 0;
document.body.dataset.ambient = '0';
function drop() {
  if (document.hidden || !backend || performance.now() - lastTouch < 8000) return;
  const x = 0.1 + Math.random() * 0.8;
  // バー（下 ~100px）とヒント（下 ~150px）の領域、ワードマーク（上 ~80px）を避ける
  const top = 90 / viewH, bottom = 1 - 215 / viewH;
  const y = top + Math.random() * Math.max(0.1, bottom - top);
  ripple(x, y, 0.2, 0.013, 5000); // 小さな波なので短く見守って止める
  const m = target;
  audio.play(noteFreq(m, 6 + Math.floor(Math.random() * 4)), Math.min(1, 0.65 + m.bright), 0.16, x);
  ambientN++;
  document.body.dataset.ambient = String(ambientN);
}
function scheduleDrop() {
  setTimeout(() => { try { drop(); } catch { /* noop */ } scheduleDrop(); }, 7000 + Math.random() * 4000);
}
if (!DEMO) scheduleDrop();

// ---- 石のさざ波: 水に浮いて揺れている手がかり。無音・stoneHits は増やさない。触れている間は出さない ----
let stoneLaps = 0;
document.body.dataset.stoneLaps = '0';
function stoneLap() {
  if (document.hidden || !backend || backend.kind !== 'webgl2') return false;
  if (stone.grab || fountain || pointers.size || performance.now() - lastTouch < 3500) return false;
  const r = stoneR() * 1.06, N = 18;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    ripple(stone.x + Math.cos(a) * r / viewW, stone.y + Math.sin(a) * r / viewH, 0.1, 0.014, 2600);
  }
  stoneLaps++;
  document.body.dataset.stoneLaps = String(stoneLaps);
  return true;
}
function scheduleLap(ms) {
  setTimeout(() => {
    let ok = false;
    try { ok = stoneLap(); } catch { /* noop */ }
    // 出せなかったら少し待って再試行。出せたら 8〜14 秒後（2 回目だけは 8〜11 秒）
    scheduleLap(ok ? 8000 + Math.random() * (stoneLaps === 1 ? 3000 : 6000) : 3000);
  }, ms);
}
if (!DEMO) scheduleLap(2000);

// ---- UI: ムード・ミュート ----
const seg = document.querySelector('.seg');
function selectMood(id, persist = true) {
  target = MOODS[id] || MOODS.calm;
  moodBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mood === target.id)));
  seg.style.setProperty('--i', String(MOOD_ORDER.indexOf(target.id)));
  if (themeMeta) themeMeta.setAttribute('content', '#' + target.deep.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join(''));
  document.body.dataset.mood = target.id;
  audio.setMood(target);
  if (persist) store.set('mood', target.id);
  wake(1500);
}
moodBtns.forEach((b) => b.addEventListener('click', () => selectMood(b.dataset.mood)));
selectMood(mood.id, false);
muteBtn.addEventListener('click', () => {
  const m = !audio.muted;
  audio.setMuted(m);
  muteBtn.setAttribute('aria-pressed', String(m));
  muteBtn.setAttribute('aria-label', m ? 'ミュート解除' : 'ミュート');
});

// ---- リサイズ ----
let rt = 0;
function onResize() {
  if (!backend) return;
  sizeBackend();
  glimmer.layout();
  placeStone();
  wake(400);
}
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(onResize, 80); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(onResize, 80); });
// iOS: ピンチ・ダブルタップ拡大を抑止
['gesturestart', 'gesturechange'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault()));

if (backend) {
  sizeBackend();
  glimmer.layout();
  placeStone();
  wake(1200);
  // 起動直後に、音なしの小さな一滴で水面が「生きている」ことを示す
  if (!DEMO && !letter) setTimeout(() => ripple(0.5, 0.52, 0.2, 0.014), 350);
}
if (letter && backend) { ghost.skipFirst(); letterPlay(letter); } else ghost.start();
// 同じページの中でハッシュだけが変わった（手紙のリンクを貼り替えた）ときも、もう一度なぞる
window.addEventListener('hashchange', () => {
  const l = decodeLetter(location.hash);
  if (!l || !backend) return;
  letterStop(); ghost.skipFirst(); ghost.retreat(); letterPlay(l);
  if (!voicedDone) { voicedTaps = l; document.body.dataset.letterVoiced = '0'; }
});

// ---- 「響」をタップして手紙を渡す（URL を共有シート / クリップボードへ。UI は足さない） ----
document.body.dataset.letterShare = '0';
const wordmark = document.getElementById('wordmark');
function copyFallback(url) {
  try {
    const ta = document.createElement('textarea');
    ta.value = url; ta.setAttribute('readonly', ''); ta.setAttribute('aria-hidden', 'true');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return !!ok;
  } catch { return false; }
}
function shareLetter() {
  ghost.retreat(); // 押したら幽霊の指は静かに退く（通常のタップと同じ）
  const url = letterRec.commit();
  if (!url) { document.body.dataset.letterShare = 'none'; return; }
  const done = (ok) => {
    document.body.dataset.letterShare = ok ? '1' : 'fail';
    if (ok) hintSay('手紙を渡しました', 2000);
    if (ok || DEMO) { vesselReset(); vesselRing(); } // デモはクリップボード不可でも、押した体験（輪）を見せる
  };
  const viaClipboard = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => done(true), () => done(copyFallback(url)));
        return;
      }
    } catch { /* noop */ }
    done(copyFallback(url));
  };
  let coarse = false;
  try { coarse = matchMedia('(pointer: coarse)').matches; } catch { /* noop */ }
  if (coarse && navigator.share) {
    try {
      navigator.share({ url }).then(() => done(true), (err) => { if (!err || err.name !== 'AbortError') viaClipboard(); });
    } catch { viaClipboard(); }
  } else viaClipboard();
}
// ---- 「響」が遊んだ量で満ちる（8 打で満ち、満ちたら一度だけ鈴・以後ゆっくり明滅） ----
const VESSEL_N = 8;
let vessel = 0, vesselRung = false;
document.body.dataset.vessel = '0'; document.body.dataset.vesselCall = '0';
function vesselShow() {
  const f = Math.min(1, vessel / VESSEL_N), full = f >= 1;
  wordmark.style.setProperty('--fill', f.toFixed(3));
  document.body.dataset.vessel = f.toFixed(3);
  document.body.dataset.vesselCall = full ? '1' : '0';
  document.body.setAttribute('data-vesselcall', full ? '1' : '0');
  wordmark.classList.toggle('ready', full);
  if (full && !vesselRung) {
    vesselRung = true;
    vesselRing();
    setTimeout(() => { // 輪の 1/4 以下の音量の小さな鈴（ミュート時は audio 側で鳴らない）
      if (document.hidden) return;
      audio.play(noteFreq(target, 9) * 2, 0.8, 0.4, 0.12, 1.5, 0.22);
    }, 900);
  }
}
// 「響」の中心から水面全体へ、静かな大きな輪を 1 つ（音は足さない。手紙・満ちには記録しない）
let vesselRings = 0;
document.body.dataset.vesselRing = '0';
function vesselRing() {
  try {
    const r = wordmark.getBoundingClientRect();
    ripple((r.left + r.width / 2) / viewW, (r.top + r.height / 2) / viewH, 0.36, 0.04, 2600);
    document.body.dataset.vesselRing = String(++vesselRings);
  } catch { /* noop */ }
}
function vesselAdd(w) { if (vessel >= VESSEL_N) return; vessel = Math.min(VESSEL_N, vessel + w); vesselShow(); }
function vesselReset() { vessel = 0; vesselRung = false; vesselShow(); }

wordmark.addEventListener('click', shareLetter);
wordmark.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shareLetter(); }
});
