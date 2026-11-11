// dry-run: claude の代わりにダミーコマンドを使い、2 つのループを隔離したサンドボックスで実際に回して検証する。
//   npm run dry-run
//   npm run dry-run -- --break-cycle 1   # cycle 1 でビルドを壊し、repair モードが発動するか確認
//   npm run dry-run -- --tamper          # VISION.md / harness/ の改変が元に戻されるか確認
//   npm run dry-run -- --fail-once       # claude 失敗 → 待機 → 再試行を確認
//   npm run dry-run -- --cycles 3
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { ROOT } from '../lib/paths.mjs';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const CYCLES = Number(opt('--cycles', 2));
const BREAK = opt('--break-cycle', '');
const TAMPER = argv.includes('--tamper');
const FAIL_ONCE = argv.includes('--fail-once');
// --always-break: builder が repair 中でも壊し続ける → 連続失敗で app/ の自動ロールバックが働くか確認（rollbackAfterFailures=2 に下げる）
const ALWAYS_BREAK = argv.includes('--always-break');

const SB = path.join(ROOT, '.dryrun', 'sandbox');
// junction は「リンクだけ」外す。外せなければ中止する（再帰削除でリンク先の本物の node_modules を消さないため）
const unlinkJunction = (p) => {
  let st; try { st = fs.lstatSync(p); } catch { return; }
  if (!st.isSymbolicLink()) return;
  for (const f of [fs.rmdirSync, fs.unlinkSync]) { try { f(p); return; } catch {} }
  console.error(`junction を外せません: ${p}\n手動で削除してください (cmd /c rmdir "${p}")`);
  process.exit(1);
};

// ── サンドボックス作成 ──
if (fs.existsSync(SB)) {
  unlinkJunction(path.join(SB, 'node_modules'));
  unlinkJunction(path.join(SB, 'app', 'node_modules'));
  fs.rmSync(SB, { recursive: true, force: true });
}
fs.mkdirSync(SB, { recursive: true });
const skip = (src) => !/[\\/](node_modules|dist)([\\/]|$)/.test(src);
for (const f of ['package.json', '.gitignore']) fs.copyFileSync(path.join(ROOT, f), path.join(SB, f));
fs.cpSync(path.join(ROOT, 'harness'), path.join(SB, 'harness'), { recursive: true, filter: skip });
// app/ は実運用で進化していくので、dry-run では「最初のコミット時点の雛形」を使う（git が無ければ現在の app/）
{
  const g = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  const rootSha = g('rev-list', '--max-parents=0', 'HEAD').stdout?.toString().trim().split('\n')[0];
  const files = rootSha ? g('ls-tree', '-r', '--name-only', rootSha, 'app').stdout.toString().split('\n').filter(Boolean) : [];
  if (files.length) {
    for (const f of files) {
      const out = path.join(SB, f);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, g('show', `${rootSha}:${f}`).stdout);
    }
  } else fs.cpSync(path.join(ROOT, 'app'), path.join(SB, 'app'), { recursive: true, filter: skip });
}
for (const [t, l] of [[path.join(ROOT, 'node_modules'), path.join(SB, 'node_modules')], [path.join(ROOT, 'app', 'node_modules'), path.join(SB, 'app', 'node_modules')]]) {
  if (!fs.existsSync(t)) { console.error(`先に npm run setup を実行してください (${t} がありません)`); process.exit(1); }
  fs.symlinkSync(t, l, 'junction');
}
const cfgPath = path.join(SB, 'harness', 'config.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
// サンドボックスの node_modules は本物へのリンクなので、npm install でリンクを壊されないよう install は省略する
cfg.dryRun = { ...(cfg.dryRun || {}), maxCycles: CYCLES, app: { installBeforeBuild: false } };
if (ALWAYS_BREAK) cfg.dryRun.repair = { rollbackAfterFailures: 2 };
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

// push の検証用に、ローカルの bare リポジトリを origin にする
const REMOTE = path.join(ROOT, '.dryrun', 'remote.git');
fs.rmSync(REMOTE, { recursive: true, force: true });
spawnSync('git', ['init', '-q', '--bare', '-b', 'main', REMOTE]);
spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: SB });
spawnSync('git', ['remote', 'add', 'origin', REMOTE], { cwd: SB });

console.log(`サンドボックス: ${SB}\n条件: cycles=${CYCLES} break-cycle=${BREAK || '-'} tamper=${TAMPER} fail-once=${FAIL_ONCE}\n`);

// ── 2 つのループを同時に起動 ──
const env = { ...process.env, HARNESS_DRY_RUN: '1' };
if (BREAK) env.FAKE_BREAK_CYCLE = BREAK;
if (TAMPER) env.FAKE_TAMPER = '1';
if (FAIL_ONCE) env.FAKE_FAIL_ONCE = '1';
if (ALWAYS_BREAK) env.FAKE_ALWAYS_BREAK = '1';
const run = (role) => new Promise((resolve) => {
  const c = spawn(process.execPath, ['harness/loop.mjs', role], { cwd: SB, env, windowsHide: true });
  const pipe = (s) => { let b = ''; s.on('data', (d) => { b += d; let i; while ((i = b.indexOf('\n')) >= 0) { console.log(`  | ${b.slice(0, i).replace(/\r$/, '')}`); b = b.slice(i + 1); } }); };
  pipe(c.stdout); pipe(c.stderr);
  const t = setTimeout(() => { console.error(`${role}: タイムアウト`); spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F']); }, 10 * 60 * 1000);
  c.on('close', (code) => { clearTimeout(t); resolve(code); });
});
const [codeB, codeC] = await Promise.all([run('builder'), run('commander')]);

// ── timelapse ──
const tl = spawnSync(process.execPath, ['harness/timelapse.mjs'], { cwd: SB, encoding: 'utf8' });

// ── 検証 ──
const sh = (...a) => spawnSync('git', a, { cwd: SB, encoding: 'utf8' }).stdout.trim();
const ex = (p) => fs.existsSync(path.join(SB, p));
const readJ = (p) => { try { return JSON.parse(fs.readFileSync(path.join(SB, p), 'utf8')); } catch { return null; } };
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });

const state = readJ('comms/STATE.json');
check('builder / commander が正常終了', codeB === 0 && codeC === 0, `exit ${codeB}/${codeC}`);
check(`STATE: done=true, cycle=${CYCLES + 1}`, state?.done === true && state?.cycle === CYCLES + 1, JSON.stringify(state));
check('VISION.md がある', ex('comms/VISION.md'));
const tags = sh('tag').split('\n').filter(Boolean);
for (let c = 0; c <= CYCLES; c++) check(`git タグ cycle-${String(c).padStart(3, '0')}`, tags.includes(`cycle-${String(c).padStart(3, '0')}`));
for (let c = 1; c <= CYCLES; c++) {
  const d = `shots/cycle-${String(c).padStart(3, '0')}`;
  check(`cycle ${c}: orders/reports/feedback が揃う`, ex(`comms/orders/ORDERv${c}.md`) && ex(`comms/reports/REPORTv${c}.md`) && ex(`comms/feedback/FEEDBACKv${c}.md`));
  check(`cycle ${c}: ORDERv${c + 1} がある`, ex(`comms/orders/ORDERv${c + 1}.md`));
  if (ALWAYS_BREAK) continue;   // 毎回壊すシナリオでは個別のヘルスは見ず、下のロールバック検査で判定する
  const meta = readJ(`${d}/meta.json`);
  const expectBroken = BREAK && Number(BREAK) === c;
  if (!expectBroken) check(`cycle ${c}: スクショ（デスクトップ/スマホ）`, ex(`${d}/desktop-home.png`) && ex(`${d}/mobile-home.png`) && meta?.screens?.length >= 2, `${meta?.screens?.length ?? 0} 枚`);
  else check(`cycle ${c}: ビルド失敗のためスクショ無し・build.log あり`, !ex(`${d}/desktop-home.png`) && ex(`${d}/build.log`));
  if (!expectBroken) check(`cycle ${c}: demo 動画 (video-desktop.webm) が録画された`, ex(`${d}/video-desktop.webm`) && meta?.videos?.length >= 1 && meta.videos[0].bytes > 1000, JSON.stringify(meta?.videos ?? []));
  check(`cycle ${c}: healthy=${expectBroken ? 'false(意図的に破壊)' : 'true'}`, expectBroken ? meta?.healthy === false : meta?.healthy === true, (meta?.reasons || []).join(' / '));
}
const logText = ex('comms/LOG.md') ? fs.readFileSync(path.join(SB, 'comms/LOG.md'), 'utf8') : '';
for (let c = 0; c <= CYCLES; c++) check(`LOG.md に cycle ${String(c).padStart(3, '0')} の行`, logText.includes(`[cycle ${String(c).padStart(3, '0')}]`));
const msgs = sh('log', '--format=%B%n---%an <%ae>');
check('git 履歴に Claude / Anthropic の共同作者表記がない', !/claude|anthropic/i.test(msgs), 'ダミーが Co-Authored-By を付けても commit-msg フックで除去される');
{
  const rg = (...a) => spawnSync('git', ['--git-dir', REMOTE, ...a], { encoding: 'utf8' }).stdout.trim();
  check('push: remote の main が手元の HEAD と一致', rg('rev-parse', 'main') === sh('rev-parse', 'HEAD'), `remote=${rg('rev-parse', 'main').slice(0, 8)} local=${sh('rev-parse', 'HEAD').slice(0, 8)}`);
  const rtags = rg('tag').split('\n').filter(Boolean);
  check('push: cycle タグが remote に上がっている', tags.length > 0 && tags.every((t) => rtags.includes(t)), rtags.join(','));
}
if (CYCLES >= 2 && !BREAK && !ALWAYS_BREAK) check('評価 OK のとき commander が先に "accepted" コミットを作る', /cycle \d+: accepted \(score/.test(sh('log', '--format=%s')));
check('コミット数 (初期 + 各サイクル)', Number(sh('rev-list', '--count', 'HEAD')) >= 1 + CYCLES * 2, `${sh('rev-list', '--count', 'HEAD')} commits`);
check('timelapse.html が生成された', ex('shots/timelapse.html'), tl.stderr.trim().slice(0, 200));
if (CYCLES >= 2 && !BREAK && !ALWAYS_BREAK) {
  check('innovation モード (cycle 2) で IDEAS.md に提案と決定が記録', /Cycle 2 — 提案/.test(fs.readFileSync(path.join(SB, 'comms/IDEAS.md'), 'utf8')) && /Cycle 2 — 決定/.test(fs.readFileSync(path.join(SB, 'comms/IDEAS.md'), 'utf8')));
}
if (BREAK) {
  const next = readJ(`shots/cycle-${String(Number(BREAK) + 1).padStart(3, '0')}/meta.json`);
  check(`cycle ${Number(BREAK) + 1} が repair モードで走り、修復された`, /mode=repair/.test(logText) && next?.healthy === true, 'LOG に mode=repair');
}
if (TAMPER) {
  check('VISION.md の改変が元に戻された', !/TAMPERED/.test(fs.readFileSync(path.join(SB, 'comms/VISION.md'), 'utf8')));
  check('harness/ の改変が元に戻された（tampered.txt が無い）', !ex('harness/tampered.txt'));
  check('LOG に harness の revert 記録', /\(harness\).*元に戻した/.test(logText));
}
if (FAIL_ONCE) check('失敗 → 再試行で最終的に進んだ', state?.done === true);
if (ALWAYS_BREAK) {
  check('連続失敗で app/ が自動ロールバックされた（LOG に記録）', /自動ロールバック/.test(logText));
  check('ロールバック後のビルドが通る（app/ が健全）', readJ(`shots/cycle-${String(CYCLES).padStart(3, '0')}/meta.json`)?.healthy === true || /自動ロールバック/.test(logText));
}

console.log('\n==== dry-run 検証結果 ====');
for (const c of checks) console.log(`${c.ok ? '  PASS' : '  FAIL'}  ${c.name}${c.detail && !c.ok ? '  ← ' + c.detail : ''}`);
const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} 通過。サンドボックス: ${SB}`);
console.log('--- LOG.md ---\n' + logText);
console.log('--- git log ---\n' + sh('log', '--oneline', '--decorate'));
process.exit(failed ? 1 : 0);
