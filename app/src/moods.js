// ムード定義: 色（0–1 の RGB）・音階・残響。
const rgb = (r, g, b) => [r / 255, g / 255, b / 255];

export const MOODS = {
  calm: {
    id: 'calm', label: '凪',
    deep: rgb(3, 8, 24), mid: rgb(10, 38, 84), accent: rgb(124, 196, 255),
    scale: [0, 2, 4, 7, 9], root: 261.63, // C 長調ペンタトニック
    wetShort: 0.34, wetLong: 0.12, echo: 0.22, bright: 0,
    // look: [屈折, リム光, 鏡面, 減衰/ステップ, リム幅]
    look: [1.0, 0.95, 2.2, 0.9974, 1.0, 0.9915],
    sky: rgb(20, 30, 44), // 映り込む空（薄青）。RENDER で上端にだけ足す
  },
  night: {
    id: 'night', label: '夜',
    deep: rgb(5, 3, 18), mid: rgb(34, 20, 88), accent: rgb(178, 152, 255),
    scale: [0, 3, 5, 7, 10], root: 220.0, // A 短調ペンタトニック
    wetShort: 0.1, wetLong: 0.5, echo: 0.3, bright: -0.1,
    look: [0.45, 0.7, 3.0, 0.9979, 0.8, 0.9940],
    sky: rgb(6, 8, 20), // 極弱い群青
  },
  dawn: {
    id: 'dawn', label: '暁',
    deep: rgb(80, 20, 46), mid: rgb(236, 138, 94), accent: rgb(255, 214, 140),
    scale: [0, 2, 4, 7, 9], root: 293.66, // D 長調、やや高く明るめ
    wetShort: 0.3, wetLong: 0.14, echo: 0.2, bright: 0.18,
    look: [0.8, 1.35, 1.2, 0.9974, 2.2, 0.9915],
    sky: rgb(46, 26, 26), // 桃色の地平
  },
};
export const MOOD_ORDER = ['calm', 'night', 'dawn'];
export const NOTE_COUNT = 10; // 約2オクターブ

export function noteFreq(mood, idx) {
  const i = Math.max(0, Math.min(NOTE_COUNT - 1, idx));
  const semis = mood.scale[i % 5] + 12 * Math.floor(i / 5);
  return mood.root * hourRatio * Math.pow(2, semis / 12);
}
export const noteIndex = (x) => Math.max(0, Math.min(NOTE_COUNT - 1, Math.floor(x * NOTE_COUNT)));

// ---- 刻の水: 時刻 → 空の色の変換・音階の中心・残響の長さ（ムードの上に足すだけ） ----
// mul/add は空色 (sky) に sky*mul+add として掛ける。add は最大 0.08 以内。
const HOUR_KEYS = [
  { h: 1, mul: [0.55, 0.62, 0.78], add: [0, 0.004, 0.016], semis: -2, rev: 1.15 }, // 深い夜
  { h: 6, mul: [0.85, 1.0, 1.2], add: [0, 0.014, 0.045], semis: -0.5, rev: 1.0 }, // 朝: 冷たい青灰
  { h: 13, mul: [1, 1, 1], add: [0, 0, 0], semis: 0, rev: 0.85 }, // 昼: 中立
  { h: 19, mul: [1.35, 0.9, 0.35], add: [0.075, 0.032, 0], semis: -0.7, rev: 1.05 }, // 夕: 琥珀
];
const ease = (t) => t * t * (3 - 2 * t);
export function hourTint(hour) {
  const h = ((hour % 24) + 24) % 24;
  const n = HOUR_KEYS.length;
  let i = n - 1;
  for (let k = 0; k < n; k++) if (h >= HOUR_KEYS[k].h) i = k;
  const a = HOUR_KEYS[i], b = HOUR_KEYS[(i + 1) % n];
  const ah = a.h, bh = b.h + (b.h <= a.h ? 24 : 0), hh = h + (h < a.h ? 24 : 0);
  const t = ease(Math.max(0, Math.min(1, (hh - ah) / (bh - ah))));
  const mix = (x, y) => x + (y - x) * t;
  return {
    mul: a.mul.map((v, j) => mix(v, b.mul[j])),
    add: a.add.map((v, j) => Math.min(0.08, mix(v, b.add[j]))),
    semis: mix(a.semis, b.semis), rev: mix(a.rev, b.rev),
  };
}
let hourRatio = 1;
export function setHourPitch(semis) { hourRatio = Math.pow(2, semis / 12); }
