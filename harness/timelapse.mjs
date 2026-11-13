// 使い方: npm run timelapse [-- --embed] [-- --out path.html] [-- --public dir [--screens home,touched]]
// shots/ と comms/ から、サイクルごとの経過を 1 枚の HTML にまとめる。
//   左  : 文字だけのサイクル一覧（点数・要約・評価全文）。画像は置かない。
//   右  : 選んだサイクルのスクショ。画面名ごとのアコーディオン（開いた画面は他のサイクルでも開いたまま）。
//   ▶   : サイクルを順に自動再生（タイムラプス）。←/→ キーでも移動できる。
//   --embed : 画像を base64 で埋め込み、HTML 単体で持ち運べるようにする（サイズは非常に大きくなる）
//   --public dir : 公開用。指定した画面（既定 home,touched）だけを JPEG に縮小して dir/img/ に書き出し、dir/index.html を作る（動画なし）
import fs from 'node:fs';
import path from 'node:path';
import { SHOTS, P, ROOT } from './lib/paths.mjs';
import { parseFeedback } from './lib/prompt.mjs';
import { readJson } from './lib/util.mjs';

const argv = process.argv.slice(2);
const embed = argv.includes('--embed');
const outArg = argv.indexOf('--out');
const pubArg = argv.indexOf('--public');
const PUB = pubArg >= 0 ? path.resolve(ROOT, argv[pubArg + 1]) : null;
const scrArg = argv.indexOf('--screens');
const PUB_SCREENS = new Set((scrArg >= 0 ? argv[scrArg + 1] : 'home,touched').split(',').map((s) => s.trim()).filter(Boolean));
const OUT = PUB ? path.join(PUB, 'index.html') : outArg >= 0 ? path.resolve(ROOT, argv[outArg + 1]) : path.join(SHOTS, 'timelapse.html');
const pubJobs = []; // { from, to, w }
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

const imgSrc = (pad, file, s) => {
  if (PUB) {
    const rel = `img/c${pad}-${s.viewport}-${s.name}.jpg`;
    pubJobs.push({ from: path.join(SHOTS, `cycle-${pad}`, file), to: path.join(PUB, rel), w: s.viewport === 'mobile' ? 390 : 960 });
    return rel;
  }
  if (!embed) return `cycle-${pad}/${file}`;
  try { return 'data:image/png;base64,' + fs.readFileSync(path.join(SHOTS, `cycle-${pad}`, file)).toString('base64'); } catch { return ''; }
};

// ── サイクルのデータ ──
const dirs = fs.existsSync(SHOTS) ? fs.readdirSync(SHOTS).filter((d) => /^cycle-\d+$/.test(d)) : [];
const nums = new Set([...dirs.map((d) => Number(d.slice(6))), ...logBy.keys()]);
const cycles = [...nums].sort((a, b) => a - b).map((n) => {
  const pad = String(n).padStart(3, '0');
  const meta = readJson(path.join(SHOTS, `cycle-${pad}`, 'meta.json'));
  const fb = parseFeedback(P.feedback(n));
  const log = logBy.get(n) ?? { main: null, harness: [] };
  const mode = log.main?.match(/mode=(\w+)/)?.[1] ?? '';
  let fbBody = '';
  try { fbBody = fs.readFileSync(P.feedback(n), 'utf8').replace(/^\s*(SCORE|DIRECTION|SUMMARY):.*$/gim, '').trim(); } catch { /* なし */ }
  return {
    n, pad, mode,
    healthy: meta ? !!meta.healthy : null,
    reasons: meta?.reasons ?? [],
    errors: meta?.consoleErrors ?? [],
    score: fb.score, direction: fb.direction,
    summary: fb.summary ?? log.main?.split(' | ').pop() ?? '',
    logline: log.main ?? '',
    notes: log.harness,
    feedback: fbBody,
    videos: embed || PUB ? [] : (meta?.videos ?? []).map((v) => ({ viewport: v.viewport, src: `cycle-${pad}/${v.file}`, sec: v.durationSec })),
    screens: (meta?.screens ?? []).filter((s) => !PUB || PUB_SCREENS.has(s.name)).map((s) => ({ name: s.name, viewport: s.viewport, blank: !!s.blank, src: imgSrc(pad, s.file, s) })),
  };
});

let genre = '';
let visionText = '';
if (fs.existsSync(P.vision)) {
  visionText = fs.readFileSync(P.vision, 'utf8');
  genre = visionText.match(/^\s*GENRE:\s*(.+)$/im)?.[1] ?? '';
}

// ── スコア推移の SVG ──
const scored = cycles.filter((c) => c.score != null);
function chart() {
  if (!scored.length) return '<p class="muted">まだ評価がありません。</p>';
  const W = 900, H = 150, L = 34, R = 14, T = 12, B = 24;
  const xs = (i) => L + (scored.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (scored.length - 1));
  const ys = (s) => T + (H - T - B) * (1 - s / 10);
  let g = '';
  for (const t of [0, 2, 4, 6, 8, 10]) g += `<line x1="${L}" x2="${W - R}" y1="${ys(t)}" y2="${ys(t)}" class="grid"/><text x="${L - 6}" y="${ys(t) + 4}" class="axis" text-anchor="end">${t}</text>`;
  const pts = scored.map((c, i) => `${xs(i)},${ys(c.score)}`).join(' ');
  let dots = '';
  scored.forEach((c, i) => {
    dots += `<a href="#c${c.n}"><circle cx="${xs(i)}" cy="${ys(c.score)}" r="5" class="dot m-${c.mode || 'normal'}${c.healthy === false ? ' bad' : ''}" data-n="${c.n}"><title>cycle ${c.n}: ${c.score}/10 ${esc(c.summary)}</title></circle></a>`;
    if (scored.length <= 40 || i % 5 === 0) dots += `<text x="${xs(i)}" y="${H - 7}" class="axis" text-anchor="middle">${c.n}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="サイクルごとのスコア推移">${g}<polyline points="${pts}" class="line"/>${dots}</svg>`;
}

const last = scored.at(-1);
const data = JSON.stringify({ cycles, vision: visionText }).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Timelapse — ${esc(genre || 'app evolution')}</title>
<style>
:root{--bg:#0d0e12;--panel:#161820;--panel2:#1c1f2a;--line:#272a36;--fg:#e8e9ef;--muted:#8b8fa3;--acc:#7aa2ff;--ok:#4cc38a;--ng:#ff6b6b;--warn:#f0b64a}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.6 system-ui,"Hiragino Sans","Yu Gothic UI",sans-serif}
.top{max-width:1500px;margin:0 auto;padding:18px 16px 0}
h1{margin:0;font-size:1.35rem}.muted{color:var(--muted)}
.hero{display:flex;gap:22px;flex-wrap:wrap;align-items:baseline}
.stat b{font-size:1.25rem}
.chartbox{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:8px 12px;margin:10px 0 14px}
svg{width:100%;height:auto;display:block}.grid{stroke:var(--line);stroke-width:1}.axis{fill:var(--muted);font-size:11px}
.line{fill:none;stroke:var(--acc);stroke-width:2}.dot{fill:var(--acc);stroke:var(--bg);stroke-width:2;cursor:pointer}
.dot.m-innovation{fill:#c792ff}.dot.m-repair{fill:var(--warn)}.dot.bad{stroke:var(--ng);stroke-width:3}.dot.cur{stroke:#fff;stroke-width:3}
.legend{font-size:11px;color:var(--muted)}.legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin:0 4px 0 12px}
.main{max-width:1500px;margin:0 auto;padding:0 16px 60px;display:grid;grid-template-columns:minmax(0,1fr) minmax(380px,44%);gap:16px;align-items:start}
/* 左: 文字だけの一覧 */
.list{display:flex;flex-direction:column;gap:8px}
.item{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 14px;cursor:pointer;scroll-margin-top:12px}
.item:hover{border-color:#3a3f52}.item.sel{border-color:var(--acc);background:var(--panel2)}
.item header{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.item h2{margin:0 6px 0 0;font-size:1rem}
.score{margin-left:auto;font-size:1.3rem;font-weight:700}.score small{font-size:.75rem;color:var(--muted);font-weight:400}
.b{font-size:11px;padding:0 8px;border-radius:99px;border:1px solid var(--line);color:var(--muted)}
.b.ok{color:var(--ok);border-color:var(--ok)}.b.ng{color:var(--ng);border-color:var(--ng)}
.b.m-innovation{color:#c792ff;border-color:#c792ff}.b.m-repair{color:var(--warn);border-color:var(--warn)}
.b.dir-pivot{color:var(--warn);border-color:var(--warn)}.b.dir-polish{color:var(--acc);border-color:var(--acc)}
.summary{margin:6px 0 0}.logline{margin:2px 0 0;font-size:11px;color:var(--muted)}
.notes{margin:4px 0 0;padding-left:18px;color:var(--warn);font-size:12px}
.item details{margin-top:6px}.item summary{cursor:pointer;color:var(--muted);font-size:12px}
pre{white-space:pre-wrap;background:#0a0b0e;border:1px solid var(--line);border-radius:8px;padding:10px;font:12px/1.55 ui-monospace,Consolas,monospace;overflow:auto;max-height:340px;margin:6px 0 0;cursor:auto}
/* 右: 画像ビューア（画面に固定） */
.viewer{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px}
.vhead{display:flex;gap:8px;align-items:center;flex-wrap:wrap;position:sticky;top:-12px;background:var(--panel);padding:12px 0 8px;margin:-12px 0 4px;z-index:2}
.vhead h3{margin:0;font-size:1.05rem}.vhead .score{font-size:1.1rem}
button,select{background:var(--panel2);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:3px 11px;font:inherit;cursor:pointer}
button:hover{border-color:var(--acc)}button.on{background:var(--acc);color:#0d0e12;border-color:var(--acc)}
.tools{display:flex;gap:6px;align-items:center;flex-wrap:wrap;width:100%}.tools .sp{flex:1}
.acc{border:1px solid var(--line);border-radius:8px;margin-top:6px;background:var(--bg)}
.acc>summary{cursor:pointer;padding:6px 10px;font-weight:600;list-style:none;display:flex;gap:8px;align-items:center}
.acc>summary::before{content:"▸";color:var(--muted);transition:transform .12s}.acc[open]>summary::before{transform:rotate(90deg)}
.acc>summary small{color:var(--muted);font-weight:400}
.shots{display:flex;gap:10px;align-items:flex-start;padding:0 10px 10px}
.shots figure{margin:0}.shots img{display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:6px;cursor:zoom-in;background:#000}
.shots video{display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:6px;background:#000}
.shots .desktop{flex:1 1 0;min-width:0}.shots .mobile{flex:0 0 28%}.shots .blank img{outline:2px solid var(--ng)}
figcaption{font-size:11px;color:var(--muted);margin-top:2px}
.empty{padding:20px 6px;color:var(--muted)}
#lb{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;z-index:9;cursor:zoom-out;overflow:auto;padding:12px}
#lb.on{display:flex}#lb img{max-width:100%;max-height:100%;margin:auto}
@media (max-width:900px){.main{grid-template-columns:1fr}.viewer{position:sticky;top:0;max-height:52vh;order:-1;z-index:5}}
</style></head><body>
<div class="top">
<div class="hero"><div><h1>${esc(genre || 'App evolution timelapse')}</h1><div class="muted">生成: ${esc(new Date().toLocaleString('ja-JP'))}</div></div>
<div class="stat"><b>${cycles.filter((c) => c.n > 0).length}</b> <span class="muted">サイクル</span></div>
<div class="stat"><b>${last ? last.score : '–'}</b> <span class="muted">最新スコア${scored.length > 1 ? `（初回 ${scored[0].score}）` : ''}</span></div></div>
<div class="chartbox">${chart()}<div class="legend"><i style="background:var(--acc)"></i>normal<i style="background:#c792ff"></i>innovation<i style="background:var(--warn)"></i>repair<i style="background:var(--bg);border:2px solid var(--ng)"></i>ヘルス NG</div></div>
</div>
<div class="main"><div class="list" id="list"></div><aside class="viewer" id="viewer"></aside></div>
<div id="lb"><img alt=""></div>
<script id="data" type="application/json">${data}</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const C = D.cycles;
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(k)); }
  return e;
}
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('tl.' + k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem('tl.' + k, JSON.stringify(v)); } catch {} } };
const openNames = new Set(store.get('open', []));
let cur = -1, timer = null;

// ── 左: 文字だけの一覧 ──
const list = document.getElementById('list');
const items = C.map((c, i) => {
  const dirLabel = c.direction === 'pivot' ? '方向転換' : '磨く';
  const el = h('article', { class: 'item', id: 'c' + c.n, onclick: (e) => { if (!e.target.closest('details')) select(i); } },
    h('header', {},
      h('h2', {}, 'cycle ' + c.pad),
      c.mode && h('span', { class: 'b m-' + c.mode }, c.mode),
      c.healthy != null && (c.healthy ? h('span', { class: 'b ok' }, '健全') : h('span', { class: 'b ng', title: c.reasons.join(' / ') }, 'NG')),
      c.direction && h('span', { class: 'b dir-' + c.direction }, dirLabel),
      c.score != null ? h('span', { class: 'score' }, String(c.score), h('small', {}, '/10')) : h('span', { class: 'score muted' }, '–')),
    h('p', { class: 'summary' }, c.summary),
    c.notes.length > 0 && h('ul', { class: 'notes' }, c.notes.map((t) => h('li', {}, '⚙ ' + t))),
    c.n === 0 && h('details', {}, h('summary', {}, 'VISION'), h('pre', {}, D.vision)),
    c.feedback && h('details', {}, h('summary', {}, '評価の全文'), h('pre', {}, c.feedback)),
    c.errors.length > 0 && h('details', {}, h('summary', {}, 'コンソールエラー ' + c.errors.length + ' 件'), h('pre', {}, c.errors.join('\\n'))));
  list.append(el);
  return el;
});

// ── 右: 画像ビューア ──
const viewer = document.getElementById('viewer');
function loadImgs(root) { root.querySelectorAll('img[data-src]').forEach((im) => { im.src = im.dataset.src; im.removeAttribute('data-src'); }); }
function renderViewer() {
  const c = C[cur];
  viewer.replaceChildren();
  const prevBtn = h('button', { onclick: () => step(-1), title: '前のサイクル (←)' }, '◀');
  const nextBtn = h('button', { onclick: () => step(1), title: '次のサイクル (→)' }, '▶');
  const play = h('button', { id: 'play', class: timer ? 'on' : '', onclick: togglePlay }, timer ? '■ 停止' : '▶ 再生');
  const speed = h('select', { id: 'speed', onchange: () => { store.set('speed', speed.value); if (timer) { stopPlay(); startPlay(); } } },
    [['2200', 'ゆっくり'], ['1100', '普通'], ['500', '速い'], ['250', '最速']].map(([v, t]) => h('option', { value: v }, t)));
  speed.value = store.get('speed', '1100');
  viewer.append(h('div', { class: 'vhead' }, h('h3', {}, 'cycle ' + c.pad), c.score != null && h('span', { class: 'score' }, String(c.score), h('small', {}, '/10')),
    h('div', { class: 'tools' }, prevBtn, nextBtn, play, speed,
      hasVideos && h('button', { id: 'vplay', class: vmode ? 'on' : '', onclick: toggleVideoPlay, title: '各サイクルの demo 動画を順に連続再生' }, vmode ? '■ 動画停止' : '🎬 動画再生'),
      h('span', { class: 'sp' }),
      h('button', { onclick: () => toggleAll(true) }, '全て開く'), h('button', { onclick: () => toggleAll(false) }, '全て閉じる'))));
  if (c.videos.length) {
    const vopen = vmode || openNames.has('動画');
    const vdet = h('details', { class: 'acc', 'data-name': '動画', open: vopen },
      h('summary', {}, '動画（demo）', h('small', {}, c.videos.map((v) => v.viewport + ' ' + v.sec + 's').join(' · '))),
      h('div', { class: 'shots' }, c.videos.map((v) => {
        const vid = h('video', { controls: true, playsinline: true, loop: !vmode, preload: 'metadata', 'data-vsrc': v.src });
        vid.muted = true;
        if (vmode) vid.addEventListener('ended', () => { const j = nextVideoIdx(cur); if (j < 0) { vmode = false; renderViewer(); } else select(j, { scroll: true }); });
        return h('figure', { class: v.viewport }, vid, h('figcaption', {}, v.viewport));
      })));
    const loadVideos = () => vdet.querySelectorAll('video[data-vsrc]').forEach((vd) => { vd.src = vd.dataset.vsrc; vd.removeAttribute('data-vsrc'); if (vmode || vdet.dataset.play) vd.play().catch(() => {}); });
    vdet.addEventListener('toggle', () => { if (vdet.open) { openNames.add('動画'); vdet.dataset.play = '1'; loadVideos(); } else openNames.delete('動画'); store.set('open', [...openNames]); });
    viewer.append(vdet);
    if (vopen) loadVideos();
  }
  const names = [...new Set(c.screens.map((s) => s.name))];
  if (!names.length) { if (!c.videos.length) viewer.append(h('p', { class: 'empty' }, c.n === 0 ? 'cycle 0 はアプリが空のためスクショはありません。' : 'このサイクルにはスクショがありません。')); return; }
  const anyOpen = names.some((n) => openNames.has(n));
  names.forEach((name, i) => {
    const shots = c.screens.filter((s) => s.name === name);
    const open = openNames.has(name) || (!anyOpen && i === 0);
    const det = h('details', { class: 'acc', 'data-name': name, open },
      h('summary', {}, name, h('small', {}, shots.map((s) => s.viewport).join(' · '))),
      h('div', { class: 'shots' }, shots.map((s) => h('figure', { class: s.viewport + (s.blank ? ' blank' : '') },
        h('img', { 'data-src': s.src, alt: 'cycle ' + c.n + ' ' + name + ' ' + s.viewport, 'data-full': true }), h('figcaption', {}, s.viewport + (s.blank ? '（真っ白）' : ''))))));
    det.addEventListener('toggle', () => {
      if (det.open) { openNames.add(name); loadImgs(det); } else openNames.delete(name);
      store.set('open', [...openNames]);
    });
    viewer.append(det);
    if (open) loadImgs(det);
  });
}
function toggleAll(on) { viewer.querySelectorAll('details.acc').forEach((d) => { d.open = on; }); }

// ── 選択・再生 ──
function select(i, { scroll = false } = {}) {
  if (i < 0 || i >= C.length || i === cur) return;
  cur = i;
  items.forEach((el, k) => el.classList.toggle('sel', k === i));
  document.querySelectorAll('.dot').forEach((d) => d.classList.toggle('cur', Number(d.dataset.n) === C[i].n));
  if (scroll) items[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  history.replaceState(null, '', '#c' + C[i].n);
  renderViewer();
}
function step(d) { select(Math.min(C.length - 1, Math.max(0, cur + d)), { scroll: true }); }
const hasVideos = C.some((c) => c.videos.length);
let vmode = false;
function nextVideoIdx(from) { for (let i = from + 1; i < C.length; i++) if (C[i].videos.length) return i; return -1; }
function toggleVideoPlay() {
  if (vmode) { vmode = false; renderViewer(); return; }
  stopPlay(); vmode = true;
  const j = C[cur].videos.length && nextVideoIdx(cur) >= 0 ? cur : C.findIndex((c) => c.videos.length);
  if (j !== cur) select(j, { scroll: true }); else renderViewer();
}
function startPlay() {
  if (timer) return;
  vmode = false;
  if (cur >= C.length - 1) select(C.findIndex((c) => c.screens.length) , { scroll: true });
  timer = setInterval(() => { if (cur >= C.length - 1) { stopPlay(); renderPlayBtn(); return; } step(1); }, Number(store.get('speed', '1100')));
  renderPlayBtn();
}
function stopPlay() { clearInterval(timer); timer = null; }
function togglePlay() { timer ? (stopPlay(), renderPlayBtn()) : startPlay(); }
function renderPlayBtn() { const b = document.getElementById('play'); if (b) { b.textContent = timer ? '■ 停止' : '▶ 再生'; b.classList.toggle('on', !!timer); } }

document.addEventListener('keydown', (e) => {
  if (e.target.matches('select,input')) return;
  if (e.key === 'Escape') document.getElementById('lb').classList.remove('on');
  else if (e.key === 'ArrowRight' || e.key === 'j') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowLeft' || e.key === 'k') { e.preventDefault(); step(-1); }
  else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
});
const lb = document.getElementById('lb'), lbImg = lb.querySelector('img');
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.matches && t.matches('img[data-full]')) { lbImg.src = t.src; lb.classList.add('on'); }
  else if (lb.contains(t) || t === lb) lb.classList.remove('on');
  else if (t.closest && t.closest('.chartbox a')) { const n = Number(t.closest('a').getAttribute('href').slice(2)); const i = C.findIndex((c) => c.n === n); if (i >= 0) { e.preventDefault(); select(i, { scroll: true }); } }
});
const fromHash = () => { const m = location.hash.match(/^#c(\\d+)$/); return m ? C.findIndex((c) => c.n === Number(m[1])) : -1; };
window.addEventListener('hashchange', () => { const i = fromHash(); if (i >= 0) select(i, { scroll: true }); });
const start = fromHash();
const lastShot = C.map((c) => c.screens.length > 0).lastIndexOf(true);
select(start >= 0 ? start : Math.max(0, lastShot), { scroll: start >= 0 });
</script></body></html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`timelapse を生成しました: ${OUT}${embed ? '（画像埋め込み）' : ''}`);

// ── 公開用: 画像を JPEG に縮小（ブラウザの canvas を借りる。追加の npm パッケージは不要） ──
if (PUB && pubJobs.length) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<canvas id="c"></canvas>');
  let done = 0, bytes = 0;
  for (const j of pubJobs) {
    let png; try { png = fs.readFileSync(j.from).toString('base64'); } catch { continue; }
    const b64 = await page.evaluate(async ({ png, w }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
      const sc = Math.min(1, w / img.naturalWidth), c = document.getElementById('c');
      c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.8).split(',')[1];
    }, { png, w: j.w });
    fs.mkdirSync(path.dirname(j.to), { recursive: true });
    const buf = Buffer.from(b64, 'base64'); fs.writeFileSync(j.to, buf); bytes += buf.length; done++;
  }
  await browser.close();
  console.log(`公開用の画像: ${done} 枚, ${(bytes / 1e6).toFixed(1)} MB → ${path.join(PUB, 'img')}`);
}
