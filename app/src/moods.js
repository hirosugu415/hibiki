// ムード定義: 色（0–1 の RGB）・音階・残響。
const rgb = (r, g, b) => [r / 255, g / 255, b / 255];

export const MOODS = {
  calm: {
    id: 'calm', label: '凪',
    deep: rgb(3, 8, 24), mid: rgb(10, 38, 84), accent: rgb(124, 196, 255),
    scale: [0, 2, 4, 7, 9], root: 261.63, // C 長調ペンタトニック
    wetShort: 0.34, wetLong: 0.12, echo: 0.22, bright: 0,
    // look: [屈折, リム光, 鏡面, 減衰/ステップ, リム幅]
    look: [1.0, 0.95, 2.2, 0.9955, 1.0, 0.9915],
  },
  night: {
    id: 'night', label: '夜',
    deep: rgb(5, 3, 18), mid: rgb(34, 20, 88), accent: rgb(178, 152, 255),
    scale: [0, 3, 5, 7, 10], root: 220.0, // A 短調ペンタトニック
    wetShort: 0.1, wetLong: 0.5, echo: 0.3, bright: -0.1,
    look: [0.45, 0.7, 3.0, 0.9968, 0.8, 0.9940],
  },
  dawn: {
    id: 'dawn', label: '暁',
    deep: rgb(80, 20, 46), mid: rgb(236, 138, 94), accent: rgb(255, 214, 140),
    scale: [0, 2, 4, 7, 9], root: 293.66, // D 長調、やや高く明るめ
    wetShort: 0.3, wetLong: 0.14, echo: 0.2, bright: 0.18,
    look: [0.8, 1.35, 1.2, 0.9955, 2.2, 0.9915],
  },
};
export const MOOD_ORDER = ['calm', 'night', 'dawn'];
export const NOTE_COUNT = 10; // 約2オクターブ

export function noteFreq(mood, idx) {
  const i = Math.max(0, Math.min(NOTE_COUNT - 1, idx));
  const semis = mood.scale[i % 5] + 12 * Math.floor(i / 5);
  return mood.root * Math.pow(2, semis / 12);
}
export const noteIndex = (x) => Math.max(0, Math.min(NOTE_COUNT - 1, Math.floor(x * NOTE_COUNT)));
