// 使い方: npm run timelapse [-- --embed] [-- --out path.html]
// shots/ から、サイクル順にスクショ・点数・LOG の要約を並べた 1 枚の HTML を生成する。
//   --embed : 画像を base64 で埋め込み、HTML 単体で持ち運べるようにする（サイズは大きくなる）
import fs from 'node:fs';
import path from 'node:path';
import { SHOTS, P, ROOT } from './lib/paths.mjs';
import { parseFeedback } from './lib/prompt.mjs';
import { readJson } from './lib/util.mjs';

const argv = process.argv.slice(2);
const embed = argv.includes('--embed');
const outArg = argv.indexOf('--out');
const OUT = outArg >= 0 ? path.resolve(ROOT, argv[outArg + 1]) : path.join(SHOTS, 'timelapse.html');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── LOG をサイクルごとに集める ──
const logBy = new Map();
if (fs.existsSync(P.log)) {
  for (const line of fs.readFileSync(P.log, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^- \[cycle (\d+)\]\s*(.*)$/);
    if (!m) continue;
    const c = Number(m[1]);
    const e = logBy.get(c) ?? { main: null, harness: [] };
    if (m[2].startsWith('(harness)')) e.harness.push(m[2].replace('(harness)', '').trim());
    else e.main = m[2];
    logBy.set(c, e);
  }
}

// ── サイクルのデータ ──
const dirs = fs.existsSync(SHOTS) ? fs.readdirSync(SHOTS).filter((d) => /^cycle-\d+$/.test(d)) : [];
const nums = new Set([...dirs.map((d) => Number(d.slice(6))), ...logBy.keys()]);
const cycles = [...nums].sort((a, b) => a - b).map((n) => {
  const pad = String(n).padStart(3, '0');
  const meta = readJson(path.join(SHOTS, `cycle-${pad}`, 'meta.json'));
  const fb = parseFeedback(P.feedback(n));
  const log = logBy.get(n) ?? { main: null, harness: [] };
  const mode = log.main?.match(/mode=(\w+)/)?.[1] ?? '';
  return { n, pad, meta, fb, log, mode };
});

let genre = '';
if (fs.existsSync(P.vision)) {
  const v = fs.readFileSync(P.vision, 'utf8');
  genre = v.match(/^\s*GENRE:\s*(.+)$/im)?.[1] ?? '';
}
const visionText = fs.existsSync(P.vision) ? fs.readFileSync(P.vision, 'utf8') : '';

const imgSrc = (pad, file) => {
  const p = path.join(SHOTS, `cycle-${pad}`, file);
  if (!embed) return `cycle-${pad}/${file}`;
  try { return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64'); } catch { return ''; }
};

// ── スコア推移の SVG ──
const scored = cycles.filter((c) => c.fb.score != null);
function chart() {
  if (!scored.length) return '<p class="muted">まだ評価がありません。</p>';
  const W = 900, H = 180, L = 34, R = 14, T = 14, B = 26;
  const xs = (i) => L + (scored.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (scored.length - 1));
  const ys = (s) => T + (H - T - B) * (1 - s / 10);
  let g = '';
  for (const t of [0, 2, 4, 6, 8, 10]) g += `<line x1="${L}" x2="${W - R}" y1="${ys(t)}" y2="${ys(t)}" class="grid"/><text x="${L - 6}" y="${ys(t) + 4}" class="axis" text-anchor="end">${t}</text>`;
  const pts = scored.map((c, i) => `${xs(i)},${ys(c.fb.score)}`).join(' ');
  let dots = '';
  scored.forEach((c, i) => {
    dots += `<a href="#c${c.n}"><circle cx="${xs(i)}" cy="${ys(c.fb.score)}" r="5" class="dot m-${c.mode || 'normal'}${c.meta && !c.meta.healthy ? ' bad' : ''}"><title>cycle ${c.n}: ${c.fb.score}/10 ${esc(c.fb.summary ?? '')}</title></circle></a>`;
    if (scored.length <= 40 || i % 5 === 0) dots += `<text x="${xs(i)}" y="${H - 8}" class="axis" text-anchor="middle">${c.n}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="サイクルごとのスコア推移">${g}<polyline points="${pts}" class="line"/>${dots}</svg>`;
}

// ── カード ──
function card(c) {
  const shots = c.meta?.screens ?? [];
  const names = [...new Set(shots.map((s) => s.name))];
  const rows = names.map((name) => {
    const items = shots.filter((s) => s.name === name).map((s) =>
      `<figure class="shot ${esc(s.viewport)}${s.blank ? ' blank' : ''}"><img loading="lazy" src="${esc(imgSrc(c.pad, s.file))}" alt="cycle ${c.n} ${esc(name)} ${esc(s.viewport)}" data-full><figcaption>${esc(name)} · ${esc(s.viewport)}</figcaption></figure>`).join('');
    return `<div class="row">${items}</div>`;
  }).join('');
  const health = c.meta ? (c.meta.healthy ? '<span class="b ok">健全</span>' : `<span class="b ng" title="${esc((c.meta.reasons || []).join(' / '))}">NG</span>`) : '';
  const dir = c.fb.direction ? `<span class="b dir-${esc(c.fb.direction)}">${c.fb.direction === 'pivot' ? '方向転換' : '磨く'}</span>` : '';
  const mode = c.mode ? `<span class="b m-${esc(c.mode)}">${esc(c.mode)}</span>` : '';
  const score = c.fb.score != null ? `<span class="score">${c.fb.score}<small>/10</small></span>` : '<span class="score muted">–</span>';
  const summary = c.fb.summary ?? c.log.main?.split(' | ').pop() ?? '';
  const notes = c.log.harness.length ? `<ul class="notes">${c.log.harness.map((h) => `<li>⚙ ${esc(h)}</li>`).join('')}</ul>` : '';
  const errs = c.meta?.consoleErrors?.length ? `<details><summary>コンソールエラー ${c.meta.consoleErrors.length} 件</summary><pre>${esc(c.meta.consoleErrors.join('\n'))}</pre></details>` : '';
  const vision = c.n === 0 ? `<details open><summary>VISION</summary><pre>${esc(visionText)}</pre></details>` : '';
  return `<section class="card" id="c${c.n}"><header><h2>cycle ${c.pad}</h2>${mode}${health}${dir}${score}</header>
<p class="summary">${esc(summary)}</p>${c.log.main ? `<p class="logline">${esc(c.log.main)}</p>` : ''}${notes}${vision}${errs}${rows}</section>`;
}

const last = scored.at(-1);
const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Timelapse — ${esc(genre || 'app evolution')}</title>
<style>
:root{--bg:#0d0e12;--panel:#161820;--line:#272a36;--fg:#e8e9ef;--muted:#8b8fa3;--acc:#7aa2ff;--ok:#4cc38a;--ng:#ff6b6b;--warn:#f0b64a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 system-ui,"Hiragino Sans","Yu Gothic UI",sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:24px 16px 80px}
h1{margin:0 0 4px;font-size:1.6rem}.muted{color:var(--muted)}
.hero{display:flex;gap:24px;flex-wrap:wrap;align-items:baseline;margin-bottom:12px}
.stat b{font-size:1.4rem}
.chartbox{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;margin:12px 0 28px}
svg{width:100%;height:auto;display:block}.grid{stroke:var(--line);stroke-width:1}.axis{fill:var(--muted);font-size:11px}
.line{fill:none;stroke:var(--acc);stroke-width:2}.dot{fill:var(--acc);stroke:var(--bg);stroke-width:2;cursor:pointer}
.dot.m-innovation{fill:#c792ff}.dot.m-repair{fill:var(--warn)}.dot.bad{stroke:var(--ng);stroke-width:3}
.legend{font-size:12px;color:var(--muted);margin-top:4px}.legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin:0 4px 0 12px;vertical-align:baseline}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px;margin:0 0 18px;scroll-margin-top:12px}
.card header{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.card h2{margin:0 8px 0 0;font-size:1.1rem}
.score{margin-left:auto;font-size:1.6rem;font-weight:700}.score small{font-size:.8rem;color:var(--muted);font-weight:400}
.b{font-size:12px;padding:1px 9px;border-radius:99px;border:1px solid var(--line);color:var(--muted)}
.b.ok{color:var(--ok);border-color:var(--ok)}.b.ng{color:var(--ng);border-color:var(--ng)}
.b.m-innovation{color:#c792ff;border-color:#c792ff}.b.m-repair{color:var(--warn);border-color:var(--warn)}
.b.dir-pivot{color:var(--warn);border-color:var(--warn)}.b.dir-polish{color:var(--acc);border-color:var(--acc)}
.summary{margin:10px 0 2px;font-size:1.02rem}.logline{margin:0 0 8px;font-size:12px;color:var(--muted);word-break:break-all}
.notes{margin:6px 0;padding-left:18px;color:var(--warn);font-size:13px}
.row{display:flex;gap:12px;align-items:flex-start;margin-top:12px;flex-wrap:wrap}
.shot{margin:0}.shot img{display:block;border:1px solid var(--line);border-radius:6px;cursor:zoom-in;background:#000}
.shot.desktop img{width:min(640px,100%);height:auto}.shot.mobile img{width:200px;height:auto}.shot.blank img{outline:2px solid var(--ng)}
figcaption{font-size:11px;color:var(--muted);margin-top:2px}
details{margin-top:8px}summary{cursor:pointer;color:var(--muted)}pre{white-space:pre-wrap;background:#0a0b0e;border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12px;overflow:auto;max-height:320px}
#lb{position:fixed;inset:0;background:rgba(0,0,0,.88);display:none;align-items:center;justify-content:center;z-index:9;cursor:zoom-out;overflow:auto;padding:12px}
#lb.on{display:flex}#lb img{max-width:100%;max-height:none;margin:auto}
</style></head><body><div class="wrap">
<div class="hero"><div><h1>${esc(genre || 'App evolution timelapse')}</h1><div class="muted">生成: ${esc(new Date().toLocaleString('ja-JP'))}</div></div>
<div class="stat"><b>${cycles.filter((c) => c.n > 0).length}</b> <span class="muted">サイクル</span></div>
<div class="stat"><b>${last ? last.fb.score : '–'}</b> <span class="muted">最新スコア${scored.length > 1 ? `（初回 ${scored[0].fb.score}）` : ''}</span></div></div>
<div class="chartbox">${chart()}<div class="legend"><i style="background:var(--acc)"></i>normal<i style="background:#c792ff"></i>innovation<i style="background:var(--warn)"></i>repair<i style="background:var(--bg);border:2px solid var(--ng)"></i>ヘルス NG</div></div>
${cycles.map(card).join('\n') || '<p class="muted">shots/ にまだデータがありません。</p>'}
</div><div id="lb"><img alt=""></div>
<script>
const lb=document.getElementById('lb'),im=lb.querySelector('img');
document.addEventListener('click',e=>{const t=e.target;if(t.matches('img[data-full]')){im.src=t.src;lb.classList.add('on')}else if(lb.contains(t)||t===lb){lb.classList.remove('on')}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')lb.classList.remove('on')});
</script></body></html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`timelapse を生成しました: ${OUT}${embed ? '（画像埋め込み）' : ''}`);
