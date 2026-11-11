// こだま: 触れた演奏が、約 5.5 秒後と約 11 秒後に、淡い余韻として同じ場所へ戻る。
// 再生したこだま自身は記録しない（無限ループ禁止）。保留は最大 24 件、超えたら古いものから捨てる。
const STAGES = [
  { delay: 5500, amp: 0.6, vel: 0.45 },
  { delay: 11000, amp: 0.36, vel: 0.22 },
];
const MAX_PENDING = 24;

export function createEcho({ play, onChange }) {
  const pending = []; // { id, stage }
  let played = 0;
  const notify = () => onChange && onChange(played, pending.length);

  function drop(entry) {
    const i = pending.indexOf(entry);
    if (i >= 0) pending.splice(i, 1);
  }

  // x, y: 0–1（y は上が 0）, vel: 元の強さ
  function record(x, y, vel = 1) {
    for (const stage of STAGES) {
      const entry = { id: 0, stage };
      entry.id = setTimeout(() => {
        drop(entry);
        try {
          if (!document.hidden) { play(x, y, vel, stage); played++; }
        } catch { /* こだまの失敗でアプリを落とさない */ }
        notify();
      }, stage.delay);
      pending.push(entry);
    }
    while (pending.length > MAX_PENDING) clearTimeout(pending.shift().id);
    notify();
  }

  return { record };
}
