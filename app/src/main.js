import './style.css';
import { MOODS, MOOD_ORDER, NOTE_COUNT, noteFreq, noteIndex, hourTint, setHourPitch } from './moods.js';
import { createGL } from './wave-gl.js';
import { create2D } from './wave-2d.js';
import { createAudio } from './audio.js';
import { createGhost } from './ghost.js';
import { createLoop } from './loop.js';
import { createEcho } from './echo.js';
import { createGlimmer } from './glimmer.js';
import { createAfterimage } from './afterimage.js';
import { createShell } from './shell.js';
import { decodeLetter, createLetterRecorder } from './letter.js';

const params = new URLSearchParams(location.search);
const SKY_K = params.has('sky') ? Math.max(0, Math.min(2, parseFloat(params.get('sky')) || 0)) : 1; // 空の映り込みの強さ（?sky=0 で無し）
const DEMO = params.get('demo') === '1';

const SEED = params.get('seed') === '1';
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
const PKEYS = ['deep', 'mid', 'accent', 'look', 'sky'];
const pal = { deep: [...MOODS.calm.deep], mid: [...MOODS.calm.mid], accent: [...MOODS.calm.accent], look: [...MOODS.calm.look], sky: [...MOODS.calm.sky] };
let mood = MOODS[store.get('mood')] || MOODS.calm;
let target = mood;
const afterimage = createAfterimage({ el: document.getElementById('afterimage'), accent: () => mood.accent, demoSeed: DEMO && SEED });
const shell = createShell({ accent: () => mood.accent, demo: DEMO, shellParam: params.get('shell'), shellsParam: params.get('shells'), play: (x, y, v) => { quietTap = true; try { tap(x, y, v, false); } finally { quietTap = false; } } });
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
// ---- 刻の水: ?hour=0–24 で固定。無効・未指定は実時刻（60秒に1回だけ更新） ----
const hourParam = params.has('hour') && params.get('hour') !== '' ? Number(params.get('hour')) : NaN;
const HOUR_FIXED = Number.isFinite(hourParam) && hourParam >= 0 && hourParam <= 24;
let hourTintNow = hourTint(13), hourNow = 13;
function applyHour() {
  const d = new Date();
  hourNow = HOUR_FIXED ? hourParam : d.getHours() + d.getMinutes() / 60;
  hourTintNow = hourTint(hourNow);
  setHourPitch(hourTintNow.semis);
  audio.setReverbK(hourTintNow.rev);
  const t = hourTintNow, f = (v, n) => v.toFixed(n);
  document.body.dataset.hour = f(hourNow, 1) + ',m' + t.mul.map((v) => f(v, 2)).join(':') + '+a' + t.add.map((v) => f(v, 3)).join(':') + ',' + f(t.rev, 3) + ',b' + f(t.band, 2);
  document.body.dataset.hourPitch = f(t.semis, 2);
}
applyHour();
if (!HOUR_FIXED) setInterval(() => { applyHour(); wake(600); }, 60000);
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
let stoneMoveT = -1e9, stoneLife = 0, lastSX = -1, lastSY = -1, lastST = 0;
function pushStone() {
  if (!backend || !backend.setStone) return;
  { const now = performance.now(), dt = Math.max(1, now - lastST) / 1000; // 速さ(画面比/秒)で判定。ゆっくりの漂いは動きとみなさない
    if (lastSX >= 0 && (Math.abs(stone.x - lastSX) + Math.abs(stone.y - lastSY)) / dt > 0.035) stoneMoveT = now;
    lastSX = stone.x; lastSY = stone.y; lastST = now; }
  backend.setStone(stone.x, 1 - stone.y, stoneR());
  pushBar();
  document.body.dataset.stones = '1';
  { const R = stoneR(); document.body.dataset.sandHalo = '1,' + Math.max(3.2, 0.28 * Math.min(viewW, viewH) / R).toFixed(2); }
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

// ---- 潮の門(c81): 水面を横切る堤と1つの門。堤で割れた波は門を抜けた分だけ反対側へ半円に広がる（回折）。?gate=0 で無効、デモは既定 on、通常は ?gate=1 のオプトイン ----
const GATE_PARAM = params.get('gate');
const GATE_ON = GATE_PARAM === '1';
const gate = { k: GATE_ON ? 1 : 0, key: '', echoT: 0 };
document.body.dataset.gate = GATE_ON ? '0,0,0' : 'off';
document.body.dataset.gateHits = '0';
const gateS = () => Math.min(viewW, viewH);
const gateYf = () => (viewH > viewW ? 0.47 : 0.5);              // 堤の中心 y（上からの画面比。石・砂州・ヒントを避ける）
const gateHw = () => Math.max(0.065 * gateS(), 26);               // 堤の半幅 CSS px（帯の全幅は短辺の 13%）
const gateGw = () => (viewH > viewW ? Math.max(0.12 * gateS(), 42) : 0.075 * gateS());                // 門の半幅
const gateXf = () => 0.55 + 0.05 * Math.sin(2 * Math.PI * performance.now() / 180000 + 0.7); // 約3分で画面幅の1割ゆっくり漂う
function pushGate() {
  if (!GATE_ON || !backend || !backend.setGate) return;
  const k = gate.k;
  if (k < 0.01) { backend.setGate(0, 0, 0, 0); } else backend.setGate((1 - gateYf()) * viewH, gateXf() * viewW, gateGw(), gateHw() * k);
  const key = gateYf().toFixed(3) + ',' + gateXf().toFixed(3) + ',' + (2 * gateGw() / viewW).toFixed(3);
  if (key !== gate.key) { gate.key = key; document.body.dataset.gate = key; }
}
// 泉・こすって咲く花・長押しの泉が出ている間は、堤をそっとほどく（干渉させない）
function gateStep(dt) {
  if (!GATE_ON) return;
  const off = fountain || springsLive() || bowl;
  const tk = off ? 0 : 1;
  gate.k += (tk - gate.k) * (1 - Math.exp(-dt / 0.6));
  if (Math.abs(tk - gate.k) < 0.004) gate.k = tk;
  document.body.dataset.gateK = gate.k.toFixed(2);
  pushGate();
}
// 門を抜けた輪が届く頃に 1 音（石の響きと同じ仕組み）。堤を挟んで反対側の波が門から出る。1 タップ最大 1 回
function gateEcho(x, yTop) {
  if (!GATE_ON || !backend || backend.kind !== 'webgl2' || gate.k < 0.5) return;
  const gx = gateXf(), gy = gateYf(), band = gateHw() / viewH;
  if (Math.abs(yTop - gy) < band * 0.8) return;
  const dist = Math.hypot((x - gx) * viewW, (yTop - gy) * viewH);
  const speed = 0.68 * 95 * (viewW / 420);
  const delay = Math.max(250, Math.min(4500, dist / speed * 1000 * 1.15));
  const hz = noteFreq(target, noteIndex(gx));
  setTimeout(() => {
    const now = performance.now();
    if (audio.muted || document.hidden || gate.k < 0.5 || now - gate.echoT < 500) return;
    gate.echoT = now;
    document.body.dataset.gateHits = String((+document.body.dataset.gateHits || 0) + 1);
    audio.play(Math.min(1800, hz * 2), 0.45, 0.3, gx, 1.4);
  }, delay);
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
// ---- 砂の眠り sandSleep: 眠る(0.05) → 最初の打で 0.35 へ(約0.8s) → 12秒無入力で 0.15 へゆっくり戻る → 次の打で再び 0.35 ----
const SLEEP_HOME = 0.05, SLEEP_AWAKE = 0.35, SLEEP_REST = 0.15;
let sandSleep = SLEEP_HOME, sleepTarget = SLEEP_HOME, sleepTimer = 0;
document.body.dataset.sandSleep = sandSleep.toFixed(2);
// 径方向の目覚め: 打点から波頭(輪と同じ速さ)の内側だけ砂が見える。2波まで保持し、全面に届いた波は全面扱い
let wakeA = null, wakeB = null, wakeAll = false, wakeLast = 0, calm = 1;
const wakeFull = (w) => { // 最遠コーナーまでの距離(短辺比)
  const s = Math.min(viewW, viewH);
  return Math.max(Math.hypot(w.x * viewW, w.y * viewH), Math.hypot((1 - w.x) * viewW, w.y * viewH), Math.hypot(w.x * viewW, (1 - w.y) * viewH), Math.hypot((1 - w.x) * viewW, (1 - w.y) * viewH)) / s + 0.05;
};
const wakeR = (w, now) => w ? (WAVE_SPEED() * (now - w.t) / 1000 + 12) / Math.min(viewW, viewH) : 0;
function sandWake(x, yTop) {
  const now = performance.now();
  if (now - wakeLast > 13000) { wakeA = wakeB = null; wakeAll = false; } // 無操作の後は眠りから広げ直す
  wakeLast = now;
  if (wakeA && wakeR(wakeA, now) >= wakeFull(wakeA)) wakeAll = true;
  wakeA = wakeB; wakeB = { x, y: 1 - yTop / viewH, t: now };
  const need = wakeFull(wakeB) * Math.min(viewW, viewH) / WAVE_SPEED() * 1000 + 300;
  sleepTarget = SLEEP_AWAKE; wake(Math.max(2600, need));
  clearTimeout(sleepTimer);
  sleepTimer = setTimeout(() => { sleepTarget = SLEEP_REST; wake(9000); }, 12000);
}
function stepWake() {
  if (!backend || !backend.setWake) return;
  const now = performance.now();
  const rA = wakeAll ? 9 : wakeR(wakeA, now), rB = wakeR(wakeB, now);
  backend.setWake([wakeA ? wakeA.x : 0.5, wakeA ? wakeA.y : 0.5, rA, 0], [wakeB ? wakeB.x : 0.5, wakeB ? wakeB.y : 0.5, rB, 0]);
  const full = wakeAll || (wakeB && rB >= wakeFull(wakeB));
  document.body.dataset.wakeR = wakeAll ? '1.00+' : wakeB ? Math.min(1, rB / wakeFull(wakeB)).toFixed(2) : '0.00';
  return !full && !!wakeB;
}
// 石の砂線の寿命: 動いている間 1、止まってから 2.5 秒で ease-out に 0（乗算ゲート）
function stepLife(dt) {
  const el = (performance.now() - stoneMoveT) / 1000;
  const u = Math.min(1, Math.max(0, el / 2.5));
  const tgt = (1 - u) * (1 - u);
  const d = tgt - stoneLife;
  if (!d) return false;
  stoneLife = Math.abs(d) < 0.001 ? tgt : stoneLife + d * (1 - Math.exp(-dt / (d > 0 ? 0.12 : 0.05)));
  if (backend && backend.setLife) backend.setLife(stoneLife);
  document.body.dataset.stoneLife = stoneLife.toFixed(2);
  return true;
}
// 輪が通り過ぎた後の砂線: 最後の打から0.4秒後に静まり始め約4秒で約55%、全面覚醒中は0.72倍・手紙再生中は0.8倍。次の打で戻る
function stepCalm(dt) {
  const el = (performance.now() - wakeLast) / 1000;
  const q = Math.min(1, Math.max(0, (el - 0.4) / 3.6));
  if (wakeLast && el > 4) afterimage.save(); // 約4秒の静けさで水面の記憶を残す
  const tgt = wakeLast ? (1 - 0.45 * q * q * (3 - 2 * q)) * (wakeAll ? 0.72 : 1) * (document.body.dataset.letterPlay === '1' ? 0.8 : 1) : 1;
  const d = tgt - calm;
  if (Math.abs(d) < 0.001) { if (!d) return false; calm = tgt; }
  else calm += d * (1 - Math.exp(-dt / (d > 0 ? 0.25 : 0.7)));
  if (backend && backend.setCalm) backend.setCalm(calm);
  document.body.dataset.sandCalm = calm.toFixed(2);
  return true;
}
function stepSleep(dt) {
  const d = sleepTarget - sandSleep;
  if (Math.abs(d) < 0.0005) { if (!d) return false; sandSleep = sleepTarget; }
  else sandSleep += d * (1 - Math.exp(-dt / (d > 0 ? 0.45 : 3.5)));
  if (backend && backend.setSleep) backend.setSleep(sandSleep);
  document.body.dataset.sandSleep = sandSleep.toFixed(2);
  return true;
}
// ---- 初音: 初回のタップだけ、根音・3度・5度が少しずれて鳴る（デモは毎回初回） ----
let hatsuneDone = DEMO ? false : store.get('hatsune') === '1';
document.body.dataset.hatsune = hatsuneDone ? '1' : '0';
function hatsune(x, yTop, vel) {
  if (hatsuneDone) return false;
  hatsuneDone = true; document.body.dataset.hatsune = '1';
  if (!DEMO) store.set('hatsune', '1');
  const m = target, i0 = Math.floor(noteIndex(x) / 5) * 5, br = Math.min(1, Math.max(0, 1 - yTop + m.bright));
  [[0, 0, 1], [2, 0.18, 0.8], [4, 0.36, 0.7]].forEach(([d, t, lv]) => audio.play(noteFreq(m, Math.min(NOTE_COUNT - 1, i0 + d)), br, vel, x, 1, lv, t));
  return true;
}
let clearK = 0; // 雨あがり: 減衰を最大 +0.0004（0.04%）だけ緩める
function tick(now) {
  updateSandDrift(performance.now());
  const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
  last = now;
  if (bowl) bowlStep(dt);
  gateStep(dt);
  springStep(dt);
  const k = 1 - Math.exp(-dt / 0.3);
  let moving = false;
  for (const key of PKEYS) for (let i = 0; i < pal[key].length; i++) {
    const d = target[key][i] - pal[key][i];
    if (Math.abs(d) > 0.0005) { pal[key][i] += d * k; moving = true; } else pal[key][i] = target[key][i];
  }
  if (stepSleep(dt)) moving = true;
  if (stepWake()) moving = true;
  if (stepLife(dt)) moving = true;
  if (stepCalm(dt) || (wakeLast && performance.now() - wakeLast < 4500)) moving = true;
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
  if (plateStep(dt)) moving = true;
  if (dentStep(dt, performance.now())) moving = true;
  shoal.phase = (shoal.phase + dt) % BAR_PERIOD; pushBar();
  const clearT = document.body.dataset.weather === 'clearing' ? 1 : 0;
  clearK += (clearT - clearK) * (1 - Math.exp(-dt / (clearT ? 0.8 : 1.2)));
  if (clearK < 0.002 && !clearT) clearK = 0; else moving = true;
  document.body.dataset.clearK = clearK.toFixed(3);
  if (backend.setSky) backend.setSky(SKY_K);
  document.body.dataset.sky = target.id + ',' + SKY_K.toFixed(2) + ',' + (1 - 0.2 * Math.min(1, innerWidth / innerHeight)).toFixed(3);
  const hk = innerHeight > innerWidth ? 1.5 : 1; // 縦長は空の寄与が小さいので刻の差を強める（昼は恒等）
  const palT = { ...pal, sky: pal.sky.map((v, i) => Math.max(0, v * (1 + (hourTintNow.mul[i] - 1) * hk) + hourTintNow.add[i] * hk)), band: innerHeight > innerWidth ? 1 + (hourTintNow.band - 1) * 2.4 : hourTintNow.band };
  try { backend.frame(dt, clearK ? { ...palT, look: [pal.look[0], pal.look[1], pal.look[2], pal.look[3] + 0.0004 * clearK, pal.look[4], pal.look[5]] } : palT); } catch { /* 描画失敗でも落とさない */ }
  try { glimmer.frame(now, dt); } catch { /* noop */ }
  if (now < keepUntil || moving) requestAnimationFrame(tick); else running = false;
}

// ---- 砂の図形（クラドニ）: 音の高さ(横位置の度数)が板の振動モード (n,m) を決め、砂が節の線に集まる ----
const PLATE_MODES = [[1, 2], [1, 3], [2, 3], [2, 5], [3, 4], [3, 5], [4, 7], [3, 8], [5, 8], [6, 9]];
const PLATE_MODES_S = [[1, 2], [1, 3], [2, 3], [1, 4], [2, 5], [3, 4], [2, 7], [3, 5], [4, 5], [3, 7]]; // スマホ用: 線の少ない組
const plate = { n: 0, m: 0, a: 0, age: 9, idx: -1, at: -1e9, figs: 0, shown: '' };
document.body.dataset.plateFig = '0';
function plateTouch(x, quiet) {
  const idx = noteIndex(x), now = performance.now();
  if (document.body.dataset.sandHold === '1' && plate.idx >= 0) { plate.age = 0; return; } // 撮影用: 砂の図形を保つ
  if (idx !== plate.idx && now - plate.at >= 500) {
    plate.idx = idx; plate.at = now; const pm = (Math.min(innerWidth, innerHeight) < 600 ? PLATE_MODES_S : PLATE_MODES)[idx]; plate.n = pm[0]; plate.m = pm[1];
    plate.a = Math.min(plate.a, 0.12); // 砂がいったんほどけて次の図形へ集まり直す
    plate.figs++; document.body.dataset.plateFig = String(plate.figs);
    if (!quiet) audio.sand((x * 2 - 1) * 0.5);
  }
  plate.age = 0;
}
function plateStep(dt) {
  if (!backend || !backend.setPlate) return false;
  if (fountain || document.body.dataset.sandHold === '1') plate.age = Math.min(plate.age, 0.5); // 歌っている間（と撮影用フック）は保つ
  plate.age += dt;
  if (plate.age < 1.0) plate.a = Math.min(1, plate.a + dt / 0.7);
  else plate.a = Math.max(0, plate.a - dt / 5.0);
  const on = plate.a > 0.001;
  backend.setPlate(on ? plate.n : 0, on ? plate.m : 0, on ? plate.a : 0, 0);
  const s = on ? `${plate.n},${plate.m},${plate.a.toFixed(2)}` : '0';
  if (s !== plate.shown) { plate.shown = s; document.body.dataset.plate = s; }
  return on;
}
document.body.dataset.plate = '0';
// ---- 触れる → 波紋 + 音 ----
const LIVE = 14000;
let touched = store.get('hint') === '1';
if (touched) hint.classList.add('gone');

// 砂の畝の見積もり: 最後の打から減衰(τ1.8s)。"粒半径の最大変化px,波頭の数"（砂は位置を動かさず密度と半径だけが応える）
let lastRip = 0;
document.body.dataset.sandDrift = '0,0';
function updateSandDrift(now) {
  if (!lastRip) return;
  const dt = (now - lastRip) / 1000, f = Math.exp(-dt / 1.8);
  document.body.dataset.sandDrift = dt > 6 ? '0,0' : `${(0.5 * f).toFixed(2)},${Math.round(3 * f)}`;
  if (dt > 6) lastRip = 0;
}
function ripple(x, yTop, amp, radius, live = LIVE) {
  if (!backend) return;
  lastRip = performance.now();
  backend.splat(x, 1 - yTop, amp, radius);
  wake(live);
}
function note(x, yTop, vel) {
  const m = target;
  audio.play(noteFreq(m, noteIndex(x)), Math.min(1, Math.max(0, 1 - yTop + m.bright)), vel, x, 1, 1, 0, 1 - yTop);
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
let ghostTap = false; // 幽霊の指の打か（デモ以外では残像を洗わず・覚えない）
let quietTap = false; // 周回再生の打か（残像に触れない）
function tap(x, yTop, vel = 1, record = true) {
  if (!quietTap && (!ghostTap || DEMO)) { afterimage.wash(); afterimage.record(x, yTop, vel); }
  plateTouch(x, !record);
  sandWake(x, yTop);
  ripple(x, yTop, (0.3 + 0.2 * vel) * (quietTap ? 0.5 : 1), quietTap ? 0.009 : 0.013);
  if (!hatsune(x, yTop, vel)) note(x, yTop, vel);
  stoneEcho(x, yTop);
  barChime(x, yTop);
  gateEcho(x, yTop);
  glimmer.hit(x, yTop, 0.6 + 0.4 * vel, { sound: true });
  if (!backend || backend.kind !== 'webgl2') flash(x, yTop, vel); // WebGL2 では光は屈折シェーダーが描く
  if (record) { echo.record(x, yTop, vel); shell.record(x, yTop, vel, noteIndex(x) / (NOTE_COUNT - 1)); }
}

// ---- 覚える水: 同じフレーズを 2 度弾くと、弱い幽霊の打として最大 4 周まわって溶ける（loop.js） ----
document.body.dataset.loop = 'off';
const memory = createLoop({
  play(x, yTop, vel) {
    if (document.hidden) return;
    quietTap = true; try { tap(x, yTop, Math.max(0.12, vel), false); } finally { quietTap = false; }
  },
  short: () => ({ w: viewW, h: viewH, m: Math.min(viewW, viewH) }),
  onState(s) { document.body.dataset.loop = s; wmGlowSet(s.startsWith('cycle') ? 1 : 0); },
  onLearn() { // 「響」が一度だけ呼吸する
    wmGlowSet(2000);
    wordmark.classList.remove('learn'); void wordmark.offsetWidth; wordmark.classList.add('learn');
    setTimeout(() => wordmark.classList.remove('learn'), 2000);
  },
});

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
// ---- 双つの泉(c77): 離した泉は約 8 秒、線形に弱まりながら湧き続ける（最大 2 つ）。共有の拍で打つので、2 つ目を置くと干渉縞が静止して見える ----
const SPRINGS_ON = params.get('springs') !== '0';
const SPR_DEMO = params.get('springs') === 'demo' || params.get('sprdemo') === '1'; // 撮影用: 1.5s 後に A を置いて離し、続けて B を長押し
const SPR = { LIFE: 8000, HOLD: parseFloat(params.get("sprhold")) || 3000, get AMP() { return parseFloat(params.get("spamp")) || (viewW < 600 ? 0.34 : 0.24); }, get RAD() { return parseFloat(params.get("sprad")) || 0.026; }, get LAM() { return parseFloat(params.get("splam")) || (viewW < 600 ? 0.102 : 0.11); }, F: () => 0.68 * 95 * (viewW / 420) / (SPR.LAM * Math.min(viewW, viewH)) }; // 振幅は通常の泉(0.2)の 0.6 倍・波長は短辺の 11%
const springs = []; // { x, y, idx, t0, end, lv0, voice, n }
let sprClock = 0;
// 離した直後は hold ms のあいだ振幅を保ち（新しい泉と釣り合わせて縞を左右対称に）、その後なめらかにほどける
const sprLevel = (s, now) => { const h = s.hold || 0, u = Math.min(1, Math.max(0, (now - s.t0 - h) / (s.end - s.t0 - h))); return Math.max(0, s.lv0 * (1 - u * u * (3 - 2 * u))); };
const springsLive = () => SPRINGS_ON && springs.length > 0;
function springsData() {
  const pts = springs.map((s) => [s.x, s.y]);
  if (fountain && springsLive()) pts.push([fountain.ref.x, fountain.ref.y]);
  const q = (v) => (+v).toFixed(3);
  document.body.dataset.springs = pts.length ? pts.length + ',' + pts.slice(0, 2).map((p) => q(p[0]) + ',' + q(p[1])).join(',') : '0';
}
function springKill(s, ms) {
  const now = performance.now();
  s.lv0 = sprLevel(s, now); s.t0 = now; s.end = now + ms; s.hold = 0;
  if (s.voice) { s.voice.fade(ms / 1000); s.voice = null; }
}
// 連続駆動: 共有のシミュレーション時間 sprT の正弦で全ての泉を同位相・同周波数で駆動 → 縞が静止して見える
let sprT = 0, sprPh = 0;
function springStep(dt) {
  if (!SPRINGS_ON || !backend) return;
  const now = performance.now();
  for (let i = springs.length - 1; i >= 0; i--) if (now >= springs[i].end) springs.splice(i, 1);
  const f = fountain;
  if (!springs.length) { if (f && f.shared) { f.shared = false; springsData(); if (!f.timer) fountainTick(f); } else if (sprClock) { sprClock = 0; springsData(); } return; }
  sprClock = 1;
  sprT += dt;
  const w = Math.sin(2 * Math.PI * SPR.F() * sprT), g = SPR.AMP * (dt / 0.07) * w;
  const lvA = springs.length ? sprLevel(springs[0], now) : 1;
  springs.forEach((s, i) => ripple(s.x, s.y, g * (i === 0 ? lvA : Math.min(lvA, sprLevel(s, now))), SPR.RAD, 600));
  if (f && f.shared) { const rp = Math.min(1, (now - (f.t0 || now)) / 1500); ripple(f.ref.x, f.ref.y, g * (springs.length ? lvA : 1) * rp, SPR.RAD, 600); }
  const ph = Math.floor(sprT * SPR.F() / 2); // 2 周期ごとに粒が脈打つ（光だけ）
  if (ph !== sprPh) {
    sprPh = ph;
    for (const s of springs) { const l = sprLevel(s, now); if (l > 0.3) glimmer.hit(s.x, s.y, 0.35 * l); }
    if (f && f.shared) { glimmer.hit(f.ref.x, f.ref.y, 0.4); if (f.owner === 'ghost') dotShow(f.ref.x, f.ref.y); }
  }
  springsData();
}
function springClockEnsure() { sprClock = 1; }
function springAdopt(f) { // 離した泉を余韻の泉にする
  const now = performance.now();
  while (springs.length >= 2) springKill(springs.shift(), 400);
  springs.push({ x: f.ref.x, y: f.ref.y, idx: f.idx, t0: now, end: now + SPR.LIFE, lv0: springs.length ? sprLevel(springs[0], now) : 1, hold: SPR.HOLD, voice: f.voice, n: 0 });
  if (f.voice) f.voice.fade(SPR.LIFE / 1000);
  springClockEnsure();
  springsData();
}
function fountainTick(f) {
  f.timer = 0;
  if (fountain !== f) return;
  if (springsLive()) { f.shared = true; springClockEnsure(); springsData(); return; } // 共有の拍に合流
  f.shared = false;
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
  if (SPRINGS_ON) while (springs.length >= 2) springKill(springs.shift(), 400); // 3 つ目: 最古を即フェードアウト
  const f = fountain = { t0: performance.now(), owner, ref, timer: 0, voice: null, idx: noteIndex(ref.x), shared: false };
  plateTouch(ref.x, false);
  const m = target;
  let lv = 1;
  if (springsLive()) { // 近い 2 音（隣り合う音階音）にして、ごく緩い唸りに
    const L = springs[springs.length - 1];
    f.idx = Math.max(0, Math.min(NOTE_COUNT - 1, L.idx + (ref.x >= L.x ? 1 : -1)));
    lv = 0.72;
  }
  const hz = noteFreq(m, f.idx);
  { const dd = dents.get(owner); if (dd) dd.fountain = true; }
  f.voice = audio.voiceHold(hz, Math.min(1, Math.max(0, 1 - ref.y + m.bright)), (ref.x * 2 - 1) * 0.5, lv);
  document.body.dataset.holding = '1';
  document.body.dataset.holdHz = hz.toFixed(1);
  fountainTick(f);
  springsData();
}
// reward=true は正常に離したとき（pointerup / ゴーストの長押し終わり）だけ。1 回の離しにつき必ず 1 回。
function fountainStop(owner, reward = false) {
  const f = fountain;
  if (!f || (owner !== undefined && f.owner !== owner)) return;
  fountain = null;
  if (f.timer) clearTimeout(f.timer);
  document.body.dataset.holding = '0';
  delete document.body.dataset.holdHz;
  if (reward && SPRINGS_ON && backend) springAdopt(f);
  else { if (f.voice) f.voice.release(); springsData(); }
  if (reward) releaseRing(f);
}
// 離した瞬間の大きなひと輪: 泉の輪より太く（半径 約 1.5 倍）・強く（振幅 約 2 倍）ゆっくり広がる。
function releaseRing(f) {
  const { x, y } = f.ref;
  const k = noteIndex(x) / (NOTE_COUNT - 1);
  ripple(x, y, 0.4, mix(0.022, 0.014, k) * 1.5, 6000);
  glimmer.hit(x, y, 1, { sound: true });
  const m = target, hz = noteFreq(m, noteIndex(x));
  audio.play(hz >= 200 ? hz / 2 : hz, Math.min(1, Math.max(0, 1 - y + m.bright)), 0.8, x, 1, 1, 0, 1 - y);
  const n = (+document.body.dataset.releases || 0) + 1;
  document.body.dataset.releases = String(n);
}

// ---- 沈む指: 押している間、指の下がごく浅く凹む（勾配だけ）。離すと約 120ms 後に柔らかい輪が 1 つ立つ ----
// 凹みは毎フレームの負の高さ splat（縁・塗りなし）。指にはバネで少し遅れて付く。通常タップ(<160ms)は何も足さない。
const DENT = { R: 0.08, RM: 0.095, AMP: 0.08, GAIN: 6.0, REB_MS: 160, DELAY: 120, LEVEL: 0.316, FOLLOW: 0.09, FADE_FROM: 600 };
const DENT_ONLY = params.get("dent") === "1";
const dents = new Map(); // owner -> { x, y, px, py, t0, k, path, fountain, ending }
let reboundN = 0, dentInfo = [0, 0];
document.body.dataset.touch = '0,0.0000,0';
document.body.dataset.touchPos = '';
function dentStart(id, x, y) {
  if (!backend) return;
  dents.set(id, { x, y, px: x, py: y, t0: performance.now(), k: 0, path: 0, fountain: false, ending: 0 });
  wake(800);
}
function dentEnd(id, reward) {
  const d = dents.get(id);
  if (!d || d.ending) return;
  const held = performance.now() - d.t0;
  d.ending = performance.now();
  if (!reward || d.fountain || (held < DENT.REB_MS && d.path < 0.03)) return; // 通常タップ・泉・中断は反動なし
  const x = d.px, y = d.py;
  setTimeout(() => {
    if (document.hidden || !backend) return;
    ripple(x, y, 0.16, 0.021, 4000);
    const m = target;
    audio.play(noteFreq(m, noteIndex(x)), Math.min(1, Math.max(0, 1 - y + m.bright)), 0.6, x, 1.3, DENT.LEVEL, 0, 1 - y);
    reboundN++;
    document.body.dataset.touch = dentInfo[0] + ',' + dentInfo[1].toFixed(4) + ',' + reboundN;
  }, DENT.DELAY);
}
// ---- 近づく指: マウスが押さずに動いているとき、カーソルの下にごく弱い窪み（沈む指と同じ描画 uniform の弱い版）。音なし・タッチでは出ない ----
const HOVER_ON = params.get("hover") !== "0";
const HOVER = { R: 0.1, RM: 0.1, GAIN: 8, HOLD: 700, FADE: 2600, FOLLOW: 0.14 };
const hover = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, k: 0, last: 0, live: false };
document.body.dataset.hover = HOVER_ON ? "on" : "off";
function hoverMove(e) {
  if (!HOVER_ON || !backend || e.pointerType !== "mouse" || e.buttons || pointers.size || dents.size || (stone.grab)) return;
  const x = e.clientX / viewW, y = e.clientY / viewH;
  if (!hover.live) { hover.px = x; hover.py = y; hover.live = true; }
  hover.x = x; hover.y = y; hover.last = performance.now();
  wake(HOVER.HOLD + HOVER.FADE + 200);
}
function hoverStep(dt, now) {
  if (!hover.live) return false;
  const idle = now - hover.last;
  let tgt = idle < HOVER.HOLD ? 1 : Math.max(0, 1 - (idle - HOVER.HOLD) / HOVER.FADE);
  tgt = tgt * tgt * (3 - 2 * tgt);
  hover.k += (tgt - hover.k) * (1 - Math.exp(-dt / (tgt > hover.k ? 0.35 : 0.5)));
  hover.px += (hover.x - hover.px) * (1 - Math.exp(-dt / HOVER.FOLLOW)); hover.py += (hover.y - hover.py) * (1 - Math.exp(-dt / HOVER.FOLLOW));
  if (idle > HOVER.HOLD + HOVER.FADE && hover.k < 0.004) { hover.live = false; hover.k = 0; if (backend.setDent) backend.setDent(0.5, 0.5, HOVER.R, 0); document.body.dataset.hoverK = "0"; return false; }
  if (backend.setDent) backend.setDent(hover.px, 1 - hover.py, viewH > viewW ? HOVER.RM : HOVER.R, hover.k * HOVER.GAIN);
  document.body.dataset.hoverK = hover.k.toFixed(3);
  return true;
}
function hoverLeave() { hover.last = Math.min(hover.last, performance.now() - HOVER.HOLD); }
function dentStep(dt, now) {
  if (!dents.size) return hoverStep(dt, now);
  hover.live = false; hover.k = 0;
  let shown = false;
  for (const [id, d] of dents) {
    const age = now - d.t0;
    if (age > 12000 && !d.ending) dentEnd(id, false);
    d.px += (d.x - d.px) * (1 - Math.exp(-dt / DENT.FOLLOW)); d.py += (d.y - d.py) * (1 - Math.exp(-dt / DENT.FOLLOW));
    let k = Math.min(1, age / 150); k = k * k * (3 - 2 * k);
    if (d.fountain && age > DENT.FADE_FROM) k *= Math.max(0, 1 - (age - DENT.FADE_FROM) / 300);
    if (d.ending) { const e = (now - d.ending) / 140; k *= Math.max(0, 1 - e); if (e >= 1) { dents.delete(id); continue; } }
    d.k = k;
    if (!shown) { shown = true; if (backend.setDent) backend.setDent(d.px, 1 - d.py, viewH > viewW ? DENT.RM : DENT.R, k * DENT.GAIN); }
    dentInfo = [Math.round(age), DENT.AMP * DENT.GAIN * k];
    document.body.dataset.touch = Math.round(age) + ',' + (DENT.AMP * DENT.GAIN * k).toFixed(4) + ',' + reboundN;
    document.body.dataset.touchPos = [d.px, d.py, d.x, d.y].map((v) => v.toFixed(3)).join(',');
  }
  if (!shown && backend.setDent) backend.setDent(0.5, 0.5, DENT.R, 0);
  if (!dents.size) { document.body.dataset.touch = dentInfo[0] + ',0.0000,' + reboundN; }
  return true;
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
  const p = { id: e.pointerId, x, y, idx: noteIndex(x), t: now, t0: now, moveT: now, lx: e.clientX, ly: e.clientY, timer: 0 };
  pointers.set(e.pointerId, p);
  if (DENT_ONLY) { dentStart(e.pointerId, x, y); return; } // 撮影用: 凹み単体（?dent=1）
  tap(x, y, 1);
  memory.tap(x, y, 1, true);
  letterRec.record(x, y, 1);
  vesselAdd(1);
  armHold(e.pointerId, p);
  dentStart(e.pointerId, x, y);
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
  { const d = dents.get(p.id); if (d) { d.path += dist; d.x = x; d.y = y; } }
  gatherTrack(p, x * viewW, y * viewH);
  bowlTrack(p, x * viewW, y * viewH);
  p.x = x; p.y = y;
}
// ---- 集まる輪(c71): ほぼ閉じた円を 1.5 秒以内に描くと、波が内側へ集まり中心に一点が立つ。?gather=0 で無効 ----
const GATHER_ON = params.get('gather') !== '0';
let gatherCount = 0, gatherAt = -1e9;
document.body.dataset.gather = GATHER_ON ? '0,0,0,0' : 'off';
// 判定: 直近1.5s の軌跡のうち、始終点距離 < 周長の12%・多角形面積 > 短辺²の3%・4πA/L² > 0.6（円=1、直線/往復/S字は≈0）
function gatherTrack(p, px, py) {
  if (!GATHER_ON) return;
  const now = performance.now(), tr = p.trail || (p.trail = []);
  if (!tr.length) tr.push({ x: p.x * viewW, y: p.y * viewH, t: now });
  const l = tr[tr.length - 1];
  if (Math.hypot(px - l.x, py - l.y) < 3) return;
  tr.push({ x: px, y: py, t: now });
  while (tr.length && now - tr[0].t > 1500) tr.shift();
  if (now - gatherAt < 2000 || tr.length < 8) return;
  const n = tr.length, cum = [0], S = Math.min(viewW, viewH);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(tr[i].x - tr[i - 1].x, tr[i].y - tr[i - 1].y);
  const e = tr[n - 1];
  for (let i = 0; i < n - 6; i++) {
    const L = cum[n - 1] - cum[i];
    if (L < S * 0.5 || Math.hypot(e.x - tr[i].x, e.y - tr[i].y) >= L * 0.12) continue;
    let a2 = 0;
    for (let j = i; j < n; j++) { const q = tr[j], r = tr[j + 1 < n ? j + 1 : i]; a2 += q.x * r.y - r.x * q.y; }
    const A = Math.abs(a2) / 2;
    if (A <= S * S * 0.03 || 4 * Math.PI * A / (L * L) < 0.6) continue;
    gatherFire(tr.slice(i));
    p.trail = [e];
    return;
  }
}
function gatherFire(pts) {
  gatherAt = performance.now(); gatherCount++;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const q of pts) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let R = 0; for (const q of pts) R += Math.hypot(q.x - cx, q.y - cy); R /= pts.length;
  const speed = 0.68 * 95 * (viewW / 420);
  const ms = Math.round(Math.max(500, Math.min(2600, R / speed * 1000)));
  const fx = cx / viewW, fy = cy / viewH;
  document.body.dataset.gather = `${gatherCount},${fx.toFixed(3)},${fy.toFixed(3)},${ms}`;
  const k = Math.min(14, pts.length);
  for (let i = 0; i < k; i++) { const q = pts[Math.floor(i * pts.length / k)]; ripple(q.x / viewW, q.y / viewH, 0.1, 0.022, ms + 1500); }
  setTimeout(() => {
    ripple(fx, fy, 0.6, 0.019, 2000);
    glimmer.hit(fx, fy, 0.5, { sound: false });
    if (document.hidden) return;
    const b = noteIndex(fx), top = NOTE_COUNT - 1;
    [[0, 0.3], [2, 0.26], [4, 0.22]].forEach(([s, v], j) => setTimeout(() => {
      audio.play(noteFreq(target, Math.min(top, b + s)), 0.5, v, fx, 1.6, 1, 0, 1 - fy);
    }, j * 90));
  }, ms);
}
// ---- こすると水が歌う(c73): 小さな往復ドラッグで、指の周りに n 重対称の定在模様を立てる。?bowl=0 で無効、?bowl=demo で 1.5s 後に自動発火 ----
const BOWL_PARAM = params.get('bowl');
const BOWL_ON = BOWL_PARAM !== '0';
const BOWL_N = Math.max(4, Math.min(8, parseInt(params.get('bowln')) || 6)); // 見える花びら(ローブ)の枚数。駆動は cos(mθ), m=n/2
let bowlCount = 0;
document.body.dataset.bowl = BOWL_ON ? '0' : 'off';
function bowlTrack(p, px, py) {
  if (!BOWL_ON) return;
  const now = performance.now(), S = Math.min(viewW, viewH), H = Math.max(8, S * 0.02);
  let r = p.rub;
  if (!r || now - r.t > 450) r = p.rub = { u: null, ox: px, oy: py, ext: 0, revs: r ? r.revs : [], t: now };
  r.t = now;
  const dx = px - r.ox, dy = py - r.oy;
  if (!r.u) { const d = Math.hypot(dx, dy); if (d < H) return; r.u = [dx / d, dy / d]; r.ext = d; return; }
  const s = dx * r.u[0] + dy * r.u[1];
  if (s > r.ext) { r.ext = s; return; }
  if (s >= r.ext - H) return;
  const ex = r.ox + r.u[0] * r.ext, ey = r.oy + r.u[1] * r.ext;
  r.revs.push({ x: ex, y: ey, t: now });
  r.ox = ex; r.oy = ey; r.u = [-r.u[0], -r.u[1]];
  r.ext = Math.max(0, (px - ex) * r.u[0] + (py - ey) * r.u[1]);
  const rv = r.revs;
  while (rv.length && now - rv[0].t > 1000) rv.shift();
  if (rv.length < 4 || bowl) return;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, mx = 0, my = 0;
  for (const q of rv) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); mx += q.x; my += q.y; }
  if (Math.max(x1 - x0, y1 - y0) > S * 0.24) return;
  const rate = 1000 / ((rv[rv.length - 1].t - rv[0].t) / (rv.length - 1) || 250);
  const n = Math.max(4, Math.min(8, 2 * Math.round(2 + (rate - 4) / 3)));
  r.revs = [];
  bowlFire(mx / rv.length / viewW, my / rv.length / viewH, n);
}
const BOWL_DUR = 3, BOWL_K = 24, KR = 6.6;
const MOBILE_AMP = parseFloat(params.get('bamp')) || 1;
let bowl = null; // 発火中の状態（シミュレーション時間 t 秒で駆動: 低 fps でも波速と周波数の比が崩れない）
function bowlFire(fx, fy, n) {
  const S = Math.min(viewW, viewH), R = S * 0.12, v = 0.68 * 95 * (viewW / 420);
  n = 2 * Math.max(2, Math.min(4, Math.round(n / 2)));
  bowl = { fx, fy, n, m: n / 2, amp: 0.95 * (viewW < 600 ? MOBILE_AMP : 1), t: 0, R, f: v * KR / (2 * Math.PI * R) }; // 輪の縁で kR≈7（J_n の山が輪の内側に入る）
  bowlCount++;
  document.body.dataset.bowl = `${n},${fx.toFixed(3)},${fy.toFixed(3)},${BOWL_DUR * 1000}`;
  wake(1200);
  if (backend.setBowl) backend.setBowl(fx, 1 - fy, R, 1);
  const b = noteIndex(fx);
  for (let j = 0; j < 6; j++) setTimeout(() => {
    if (document.hidden) return;
    audio.play(noteFreq(target, Math.min(NOTE_COUNT - 1, b + (j % 2 ? 2 : 0))), 0.45, 0.3 * (j < 3 ? 1 : j < 5 ? 0.62 : 0.34), fx, 1.8, 1, 0, 1 - fy);
  }, j * 450);
  glimmer.hit(fx, fy, 0.25, { sound: false });
}
function bowlStep(dt) {
  const B = bowl; if (!B) return;
  B.t += dt;
  if (B.t >= BOWL_DUR + 1.2) { bowl = null; if (backend.setBowl) backend.setBowl(0.5, 0.5, 1, 0); document.body.dataset.bowl = `${B.n},${B.fx.toFixed(3)},${B.fy.toFixed(3)},0`; return; }
  const w = Math.sin(2 * Math.PI * B.f * B.t), t = B.t;
  if (t >= BOWL_DUR) return; // 駆動は終わり、吸収帯だけ残して余韻を静かに畳む
  const e = (t < 1.2 ? 1 : t < 2.4 ? 0.62 : 0.34) * (t > BOWL_DUR - 0.9 ? (BOWL_DUR - t) / 0.9 : 1) * Math.min(1, t / 0.15);
  for (let i = 0; i < BOWL_K; i++) {
    const th = i / BOWL_K * Math.PI * 2;
    ripple(B.fx + Math.cos(th) * B.R / viewW, B.fy + Math.sin(th) * B.R / viewH, 0.055 * B.amp * (dt / 0.07) * e * w * Math.cos(B.m * th), 0.034, 600);
  }
}
if (BOWL_PARAM === 'demo') setTimeout(() => { // 石の影響の外・ワードマークの下に収まる位置
  const S = Math.min(viewW, viewH), ext = S * 0.12 * 1.55 + 10;
  const fy = Math.max((84 + ext) / viewH, Math.min(0.4, stone.y - (stoneR() + ext) / viewH));
  bowlFire(0.5, fy, BOWL_N);
}, 1500);
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
  if (!p) { hoverMove(e); return; }
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
  dentEnd(e.pointerId, e.type === 'pointerup');
  fountainStop(e.pointerId, e.type === 'pointerup');
}
function releaseAll() {
  stone.grab = null;
  for (const [id, p] of pointers) { if (p.timer) clearTimeout(p.timer); pointers.delete(id); }
  fountainStop();
  for (const id of [...dents.keys()]) dentEnd(id, false);
}
window.addEventListener('blur', releaseAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
function bindCanvas(el) {
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hoverLeave(); });
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('lostpointercapture', onUp);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
bindCanvas(canvas);

// ---- 幽霊の指 ----
const ghostPtr = { x: 0.5, y: 0.5, idx: 0, t: 0 };
// 幽霊の指が演奏している間は「触れてみてください」を出さない（打が途切れて6秒で復帰）
let ghostPlayTimer = 0;
function ghostPlayNote() {
  document.body.dataset.ghostPlay = '1';
  clearTimeout(ghostPlayTimer);
  ghostPlayTimer = setTimeout(() => { document.body.dataset.ghostPlay = '0'; }, 6000);
}
if (SPR_DEMO) {
  const S = () => Math.min(viewW, viewH), ys = () => (viewH < viewW ? 0.38 : 0.44), sd = () => parseFloat(params.get("spd")) || (viewW < 600 ? 0.34 : 0.27);
  const pt = (sg) => ({ x: 0.5 + sg * sd() / 2 * S() / viewW, y: ys() }); // 画面サイズ確定後(発火時)に計算
  let pa, pb;
  setTimeout(() => { pa = pt(-1); tap(pa.x, pa.y, 0.7); fountainStart('demoA', pa); }, 1500);
  setTimeout(() => fountainStop('demoA', true), 1700);
  setTimeout(() => { pb = pt(1); tap(pb.x, pb.y, 0.7); fountainStart('demoB', pb); }, 2700);
}
const ghost = createGhost({
  bar() { return { x: shoal.x, y: shoal.y, rx: barRx() / viewW }; },
  stone() { return { x: stone.x, y: stone.y, rx: stoneR() / viewW, ry: stoneR() / viewH }; },
  gate() { return GATE_ON ? { x: gateXf(), y: gateYf(), hw: gateHw() / viewH } : null; },
  nudge(dx, dy) { // 石をそっとずらす（掴んで離すだけの小さな移動）
    stone.glide = false; stone.vx = stone.vy = 0;
    [stone.tx, stone.ty] = clampStone(stone.x + dx, stone.y + dy);
    grabPing(); wake(1800);
  },
  tap(x, y, vel) {
    if (SPR_DEMO) return;
    if (BOWL_PARAM === 'demo' && (bowl || bowlCount === 0 || performance.now() < 8000)) return; // 撮影用: 花のデモ中は幽霊の打を休ませる（ほどける様子だけを見せる）
    // 石の真上には打たない（石に吸われてしまうので、少し上へずらす）
    const sr = stoneR() * 1.25;
    if (Math.hypot((x - stone.x) * viewW, (y - stone.y) * viewH) < sr) y = stone.y - sr / viewH;
    ghostPtr.trail = null; ghostPtr.rub = null;
    dotShow(x, y);
    ghostPlayNote();
    ghostPtr.x = x; ghostPtr.y = y; ghostPtr.idx = noteIndex(x); ghostPtr.t = performance.now();
    if (!(RAIN_FORCE && rainForced)) lastGhostAct = performance.now();
    ghostTap = true; try { tap(x, y, vel); } finally { ghostTap = false; }
    if (DEMO) memory.tap(x, y, vel, false);
    if (DEMO) letterRec.record(x, y, vel); // デモ時のみ、幽霊の打も手紙に記録（「響」を押せるように）
    vesselAdd(DEMO ? 2 : 1); // デモの幽霊は約 10 秒で満たす
  },
  drag(x, y) { dotShow(x, y); strokeTo(ghostPtr, x, y, true); },
  holdStart(x, y) { if (SPR_DEMO) return; ghostPtr.x = x; ghostPtr.y = y; fountainStart('ghost', ghostPtr); },
  holdEnd(reward) { fountainStop('ghost', !!reward); },
  pressStart(x, y) { dotShow(x, y); dentStart('ghostPress', x, y); },
  pressEnd() { dentEnd('ghostPress', true); },
  pressCancel() { dentEnd('ghostPress', false); },
  metric() { return { w: viewW, h: viewH }; },
  dotHide() { dot.classList.remove('show'); },
}, { demo: DEMO, seed: SEED });
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
  hint.textContent = hintWas.text; delete hint.dataset.say;
  if (hintWas.gone) hint.classList.add('gone');
  hintWas = null;
}
// ヒントの文言を ms だけ差し替える（元の文言と表示状態は hintWas に 1 つだけ保持し、二重に差し替えない）
function hintSay(text, ms) {
  if (hintWas === null) hintWas = { text: hint.textContent, gone: hint.classList.contains('gone') };
  hint.textContent = text; hint.dataset.say = '1';
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
  later(() => { letterTimers = []; document.body.dataset.letterPlay = '0'; ghostPlayNote(); if (hint.textContent === 'だれかの水面') hintRestore(); ghost.start(); }, t + 1800);
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
  later(() => { voicedTimers = []; document.body.dataset.letterPlay = '0'; ghostPlayNote(); if (hint.textContent === 'だれかの水面') hintRestore(); }, t + 1800);
}

// ---- 間欠の雨粒（通常モードのみ。触れられていない間、7〜11 秒に一滴） ----
let ambientN = 0;
document.body.dataset.ambient = '0';
function drop() {
  if (document.hidden || !backend || performance.now() - lastTouch < 8000 || rain > 0.05) return;
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
  if (stone.grab || fountain || springsLive() || pointers.size || performance.now() - lastTouch < 3500) return false;
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

// ---- 雨: 触れずにいる水面の天気。40s 無操作で小雨、90s から本降り。触れると退き、止めると雨あがり ----
// 雨粒は tap() を通さない（砂・石・初音・残像・覚える水に触れない）。小さな輪 + 極小の音のみ。
const rainParam = parseFloat(params.get('rain'));
const RAIN_FORCE = Number.isFinite(rainParam) ? Math.max(0, Math.min(1, rainParam)) : null;
const RAIN_MAX_LIVE = 6, RAIN_LIFE = 2400;
let rain = RAIN_FORCE || 0, rainForced = RAIN_FORCE !== null, rainSeen = rain > 0.02;
let rainLastAct = performance.now(), lastGhostAct = -1e9, clearingUntil = 0, rainTimer = 0, rainStepT = performance.now();
const rainLive = [];
let rainRng = (() => { let a = (SEED || rainForced ? 0x2f6e2b1 : (Date.now() ^ 0x9e3779b9)) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const rainActed = () => { rainLastAct = performance.now(); if (rainForced) { rainForced = false; } };
for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel']) window.addEventListener(ev, (e) => { if (ev === 'pointermove' && e.pointerType === 'mouse' && !e.buttons && !pointers.size) return; rainActed(); }, { capture: true, passive: true });
const smooth01 = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
function rainTarget(now) {
  if (rainForced) return RAIN_FORCE;
  if (DEMO && !RAIN_FORCE) return 0; // デモの通常撮影には降らせない
  const idle = (now - Math.max(rainLastAct, lastTouch, lastGhostAct)) / 1000;
  if (idle < 40) return 0;
  if (idle < 90) return 0.35 * smooth01((idle - 40) / 50);
  return 0.35 + 0.65 * smooth01((idle - 90) / 60);
}
function rainStep() {
  const now = performance.now(), dt = Math.min(0.5, (now - rainStepT) / 1000); rainStepT = now;
  const tgt = rainTarget(now);
  const prev = rain;
  rain += (tgt - rain) * (1 - Math.exp(-dt / (tgt < rain ? 0.55 : 2.5))); // 退くのは速く、立ち上がりは緩やかに
  if (rain < 0.004) rain = 0;
  if (prev > 0.04) rainSeen = true;
  // 触れて雨が退いたあと、手を止めてから約 6 秒だけ「雨あがり」
  const act = Math.max(rainLastAct, lastTouch, lastGhostAct);
  if (rainSeen && tgt === 0 && rain < prev && now - act < 1500) clearingUntil = act + 6000;
  const clearing = rainSeen && now < clearingUntil && tgt === 0;
  if (!clearing && rain < 0.02) rainSeen = false;
  document.body.dataset.rain = rain.toFixed(2);
  document.body.dataset.weather = clearing ? 'clearing' : rain < 0.02 ? 'dry' : rain <= 0.35 ? 'drizzle' : 'rain';
  if (rain > 0.02 && !rainTimer) scheduleRain(rainFirst ? 300 : null);
  if (rainTimer && rain <= 0.02) { clearTimeout(rainTimer); rainTimer = 0; }
}
let rainFirst = rainForced;
function rainDrop() {
  const now = performance.now();
  while (rainLive.length && rainLive[0] < now) rainLive.shift();
  document.body.dataset.rainLive = String(rainLive.length);
  if (document.hidden || !backend || backend.kind !== 'webgl2' || rainLive.length >= RAIN_MAX_LIVE || pointers.size || fountain || springsLive()) return false;
  const sx = stone.x * viewW, sy = stone.y * viewH, avoid = stoneR() * 1.9;
  const top = 100 / viewH, bottom = 1 - 225 / viewH;
  for (let tries = 0; tries < 8; tries++) {
    const x = 0.08 + rainRng() * 0.84, y = top + rainRng() * Math.max(0.1, bottom - top);
    if (Math.hypot(x * viewW - sx, y * viewH - sy) < avoid) continue;
    ripple(x, y, 0.07 + 0.07 * rain, 0.0105, RAIN_LIFE); // 通常の打(0.5)の 1/3 以下
    rainLive.push(now + RAIN_LIFE);
    const m = target;
    audio.play(noteFreq(m, 5 + Math.floor(rainRng() * 5)), 0.5, 0.35, x, 0.8, 0.12);
    return true;
  }
  return false;
}
function scheduleRain(first) {
  let ms;
  if (first != null) ms = first;
  else if (rain <= 0.35) ms = (2000 + rainRng() * 2000) * (1 + (0.35 - rain) / 0.35);
  else { const t = (rain - 0.35) / 0.65; ms = (2000 + (600 - 2000) * t) + rainRng() * (2000 + (1500 - 2000) * t); }
  rainFirst = false;
  rainTimer = setTimeout(() => { rainTimer = 0; try { if (rain > 0.02) { rainDrop(); scheduleRain(); } } catch { /* noop */ } }, ms);
}
document.body.dataset.rain = rain.toFixed(2);
document.body.dataset.weather = 'dry';
setInterval(() => { try { rainStep(); } catch { /* noop */ } }, 120);

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
// 満ちた「響」の発光は学習・周回中だけ淡く出し、終了後 2 秒で通常(home と同じ見え方)へ
let wmGlow = false, wmGlowTimer = 0;
function wmGlowSet(v) {
  clearTimeout(wmGlowTimer);
  if (v === 1) { wmGlow = true; vesselShow(); return; }
  if (v === 0) { wmGlowTimer = setTimeout(() => { wmGlow = false; vesselShow(); }, 2000); return; }
  wmGlow = true; vesselShow(); wmGlowTimer = setTimeout(() => { wmGlow = false; vesselShow(); }, v);
}
function vesselShow() {
  const f = Math.min(1, vessel / VESSEL_N), full = f >= 1;
  wordmark.style.setProperty('--fill', (full && !wmGlow ? 0 : f).toFixed(3));
  document.body.dataset.vessel = f.toFixed(3);
  document.body.dataset.vesselCall = full ? '1' : '0';
  document.body.setAttribute('data-vesselcall', full ? '1' : '0');
  wordmark.classList.toggle('ready', full);
  document.body.dataset.wmGlow = full && !wmGlow ? '0' : '1';
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

addEventListener('pagehide', () => afterimage.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) afterimage.save(); });
