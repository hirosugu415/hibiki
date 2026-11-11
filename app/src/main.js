import './style.css';
import { MOODS, MOOD_ORDER, noteFreq, noteIndex } from './moods.js';
import { createGL } from './wave-gl.js';
import { create2D } from './wave-2d.js';
import { createAudio } from './audio.js';
import { createGhost } from './ghost.js';

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
const pal = { deep: [...MOODS.calm.deep], mid: [...MOODS.calm.mid], accent: [...MOODS.calm.accent] };
let mood = MOODS[store.get('mood')] || MOODS.calm;
let target = mood;
const themeMeta = document.querySelector('meta[name="theme-color"]');
const to255 = (c) => c.map((v) => Math.round(v * 255)).join(' ');
function applyCss() {
  const r = document.documentElement.style;
  r.setProperty('--accent', to255(pal.accent));
  r.setProperty('--deep', to255(pal.deep));
}
function snapPalette(m) { for (const k of ['deep', 'mid', 'accent']) for (let i = 0; i < 3; i++) pal[k][i] = m[k][i]; applyCss(); }
snapPalette(mood);

// ---- 音 ----
const audio = createAudio();
audio.setMood(mood);
window.addEventListener('pointerdown', () => { audio.unlock(); audio.applyPendingMood(); }, { capture: true });
window.addEventListener('keydown', () => { audio.unlock(); audio.applyPendingMood(); }, { capture: true });

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
  for (const key of ['deep', 'mid', 'accent']) for (let i = 0; i < 3; i++) {
    const d = target[key][i] - pal[key][i];
    if (Math.abs(d) > 0.0005) { pal[key][i] += d * k; moving = true; } else pal[key][i] = target[key][i];
  }
  if (moving) applyCss();
  try { backend.frame(dt, pal); } catch { /* 描画失敗でも落とさない */ }
  if (now < keepUntil || moving) requestAnimationFrame(tick); else running = false;
}

// ---- 触れる → 波紋 + 音 ----
const LIVE = 14000;
let touched = store.get('hint') === '1';
if (touched) hint.classList.add('gone');

function ripple(x, yTop, amp, radius) {
  if (!backend) return;
  backend.splat(x, 1 - yTop, amp, radius);
  wake(LIVE);
}
function note(x, yTop, vel) {
  const m = target;
  audio.play(noteFreq(m, noteIndex(x)), Math.min(1, Math.max(0, 1 - yTop + m.bright)), vel, x);
}
function tap(x, yTop, vel = 1) {
  ripple(x, yTop, 0.3 + 0.2 * vel, 0.013);
  note(x, yTop, vel);
}

const pointers = new Map();
function onDown(e) {
  if (e.button > 0 && e.pointerType === 'mouse') return;
  e.preventDefault();
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  if (!touched) { touched = true; store.set('hint', '1'); hint.classList.add('gone'); }
  ghost.retreat();
  const x = e.clientX / viewW, y = e.clientY / viewH;
  pointers.set(e.pointerId, { x, y, idx: noteIndex(x), t: performance.now() });
  tap(x, y, 1);
}
function strokeTo(p, x, y, fromGhost) {
  const dx = (x - p.x) * viewW / Math.min(viewW, viewH), dy = (y - p.y) * viewH / Math.min(viewW, viewH);
  const dist = Math.hypot(dx, dy), step = 0.022;
  const n = Math.max(1, Math.ceil(dist / step));
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    ripple(p.x + (x - p.x) * k, p.y + (y - p.y) * k, 0.045, 0.012);
  }
  const idx = noteIndex(x), now = performance.now();
  if (idx !== p.idx && now - p.t > (fromGhost ? 220 : 110)) { note(x, y, 0.7); p.idx = idx; p.t = now; }
  p.x = x; p.y = y;
}
function onMove(e) {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  e.preventDefault();
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (evs.length ? evs : [e])) strokeTo(p, ev.clientX / viewW, ev.clientY / viewH, false);
}
function onUp(e) { pointers.delete(e.pointerId); }
function bindCanvas(el) {
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
bindCanvas(canvas);

// ---- 幽霊の指 ----
const ghostPtr = { x: 0.5, y: 0.5, idx: 0, t: 0 };
const ghost = createGhost({
  tap(x, y, vel) {
    dotShow(x, y);
    ghostPtr.x = x; ghostPtr.y = y; ghostPtr.idx = noteIndex(x); ghostPtr.t = performance.now();
    tap(x, y, vel);
  },
  drag(x, y) { dotShow(x, y); strokeTo(ghostPtr, x, y, true); },
  dotHide() { dot.classList.remove('show'); },
}, { demo: DEMO });
function dotShow(x, y) {
  dot.style.transform = `translate(${x * viewW}px, ${y * viewH}px)`;
  dot.classList.add('show');
  clearTimeout(dotShow.t);
  dotShow.t = setTimeout(() => dot.classList.remove('show'), 420);
}

// ---- UI: ムード・ミュート ----
const seg = document.querySelector('.seg');
function selectMood(id, persist = true) {
  target = MOODS[id] || MOODS.calm;
  moodBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mood === target.id)));
  seg.style.setProperty('--i', String(MOOD_ORDER.indexOf(target.id)));
  if (themeMeta) themeMeta.setAttribute('content', '#' + target.deep.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join(''));
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
  wake(400);
}
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(onResize, 80); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(onResize, 80); });
// iOS: ピンチ・ダブルタップ拡大を抑止
['gesturestart', 'gesturechange'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault()));

if (backend) {
  sizeBackend();
  wake(1200);
  // 起動直後に、音なしの小さな一滴で水面が「生きている」ことを示す
  if (!DEMO) setTimeout(() => ripple(0.5, 0.52, 0.2, 0.014), 350);
}
ghost.start();
