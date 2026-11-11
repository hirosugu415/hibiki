// 使い方: node harness/loop.mjs builder|commander [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, COMMS, P, pad, rel, shotsDir, STOP_FILE } from './lib/paths.mjs';
import { log, warn, sleep, sleepUnlessStop, stopMode, setRoleTag, appendLine, logFilePath, withLock, readJson } from './lib/util.mjs';
import { loadConfig } from './lib/config.mjs';
import { INITIAL_STATE, readStateSync, writeState, computeNextMode } from './lib/state.mjs';
import * as G from './lib/git.mjs';
import { runClaude, resolveClaude } from './lib/claude.mjs';
import { buildPrompt, parseFeedback } from './lib/prompt.mjs';
import { captureCycle } from './lib/capture.mjs';

const role = process.argv[2];
if (!['builder', 'commander'].includes(role)) {
  console.error('usage: node harness/loop.mjs builder|commander [--dry-run]');
  process.exit(1);
}
const dryRun = process.argv.includes('--dry-run') || process.env.HARNESS_DRY_RUN === '1';
setRoleTag(role);

const cycleTag = (n) => `cycle-${pad(n)}`;
const logLine = (s) => appendLine(P.log, s);

// ───────── 初期化（2 つのループが同時に起動しても競合しないようロックする）─────────
async function ensureInit() {
  await withLock(path.join(ROOT, '.harness-lock'), async () => {
    G.ensureRepoSync();
    for (const d of ['orders', 'reports', 'feedback']) fs.mkdirSync(path.join(COMMS, d), { recursive: true });
    fs.mkdirSync(path.join(ROOT, 'shots'), { recursive: true });
    fs.mkdirSync(path.join(ROOT, 'logs'), { recursive: true });
    if (!fs.existsSync(P.state)) writeState({ ...INITIAL_STATE, lastHealthyCommit: G.head() });
    if (!fs.existsSync(P.ideas)) fs.writeFileSync(P.ideas, '# IDEAS\n\n革新的アイデアの提案（builder）と採否の記録（commander）。追記のみ。\n');
    if (!fs.existsSync(P.log)) fs.writeFileSync(P.log, '# LOG\n\n全サイクルの1行要約（ハーネスが追記）。\n\n');
    G.commitAll('init: comms');
  });
}

// ───────── claude 実行（失敗時は待って再試行）─────────
async function runAgent({ cfg: cfg0, prompt, cycle, expected, strict }) {
  let cfg = cfg0, failures = 0, outputRetries = 0, retryNote = '';
  for (;;) {
    const res = await runClaude({
      cfg, prompt: prompt + retryNote,
      logFile: logFilePath(`${role}-c${pad(cycle)}.log`),
      env: { HARNESS_ROLE: role, HARNESS_CYCLE: String(cycle), HARNESS_MODE: readStateSync().mode, HARNESS_ROOT: ROOT },
    });
    if (!res.ok) {
      failures++;
      const r = cfg.retry;
      const waitMin = Math.min(r.waitMinutes * Math.pow(r.backoffMultiplier, failures - 1), r.maxWaitMinutes);
      warn(`claude 失敗 (連続 ${failures} 回): ${res.reason}${res.limitHint ? ' / ' + res.limitHint : ''}`);
      warn(`${waitMin} 分待って再試行します（STOP ファイルで中断可）`);
      if (await sleepUnlessStop(waitMin * 60 * 1000)) return { aborted: true };
      cfg = loadConfig({ dryRun });
      continue;
    }
    failures = 0;
    const missing = expected.filter((f) => !fs.existsSync(f));
    if (!missing.length) return { ok: true, res };
    outputRetries++;
    warn(`期待した出力がありません: ${missing.map(rel).join(', ')}`);
    if (!strict && outputRetries > cfg.retry.maxOutputRetries) return { ok: true, res, missing };
    retryNote = `前回の実行では次のファイルが作られていませんでした。必ず作成してください: ${missing.map(rel).join(', ')}。` +
      '前回の作業が途中まで残っている可能性があるので、`git status` で状況を確認し、続きから行うこと。';
    if (strict && outputRetries > 2) {
      if (await sleepUnlessStop(cfg.retry.waitMinutes * 60 * 1000)) return { aborted: true };
    }
  }
}

function writeStub(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

// ───────── リモートへの定期 push（失敗しても実験は止めない）─────────
function autoPush(cfg, label) {
  if (!cfg.git?.push) return;
  const r = G.pushSafe({ remote: cfg.git.remote, branch: cfg.git.branch, timeoutSec: cfg.git.pushTimeoutSec });
  if (r.skipped) return;
  if (r.ok) log(`push 完了 (${label})${r.tagsOk ? '' : ' ※タグの push は一部失敗'}`);
  else warn(`push 失敗 (${label}): ${r.branchErr} — 実験は続行します。後で手動 push してください`);
}

// ───────── builder のターン ─────────
async function builderTurn(st) {
  const cfg = loadConfig({ dryRun });
  const N = st.cycle;
  const pre = G.head();
  log(`cycle ${N} (mode=${st.mode}) builder 開始`);
  const prompt = buildPrompt('builder', st, cfg, { notes: st.notes });
  const r = await runAgent({ cfg, prompt, cycle: N, expected: [P.report(N)] });
  if (r.aborted) return false;

  const notes = [];
  if (r.missing) {
    writeStub(P.report(N), `# REPORT v${N}\n\n(ハーネス生成) builder は REPORT を書きませんでした。実装内容は git log / diff から判断してください。\n`);
    notes.push('builder が REPORT を書かなかったため、ハーネスが空の REPORT を生成した。自己申告がないので差分とスクショだけで評価すること。');
  }

  const reverted = G.revertProtected(pre, { protectVision: true });
  if (reverted.length) {
    const msg = `禁止領域への変更を元に戻した: ${reverted.join(', ')}`;
    warn(msg); logLine(`- [cycle ${pad(N)}] (harness) builder: ${msg}`);
    notes.push(`builder が ${msg}（harness/・VISION.md・root の package.json は編集禁止）。`);
  }

  let meta = await captureCycle(N, cfg);
  let repairStreak = meta.healthy ? 0 : (st.repairStreak || 0) + 1;
  let lastHealthyCommit = st.lastHealthyCommit;

  // 修復が続いて直らない場合は、最後に健全だった app/ に自動ロールバック
  if (!meta.healthy && repairStreak >= cfg.repair.rollbackAfterFailures && lastHealthyCommit) {
    warn(`ヘルス NG が ${repairStreak} サイクル連続。app/ を ${lastHealthyCommit.slice(0, 8)} に自動ロールバックします`);
    try {
      G.rollbackApp(lastHealthyCommit);
      G.commitAll(`cycle ${N}: harness auto-rollback of app/ to last healthy commit`);
      const msg = `修復に ${repairStreak} サイクル失敗したため、app/ を最後に健全だった状態 (${lastHealthyCommit.slice(0, 8)}) へ自動ロールバックした`;
      logLine(`- [cycle ${pad(N)}] (harness) ${msg}`);
      notes.push(msg + '。ロールバックされた機能は、より小さな単位で作り直すこと。');
      meta = await captureCycle(N, cfg);
      repairStreak = 0;
    } catch (e) { warn('ロールバック失敗: ' + e.message); }
  }

  if (G.commitAll(`cycle ${N}: builder (${st.mode}) [harness auto-commit]`)) log('未コミットの変更をハーネスがコミットしました');
  if (meta.healthy) lastHealthyCommit = G.head();

  // commander 向けの差分資料
  const d = G.diffAgainstPrev(N);
  fs.writeFileSync(path.join(shotsDir(N), 'diff.stat.txt'), `base: ${d.base}\n${d.stat}\n`);
  fs.writeFileSync(path.join(shotsDir(N), 'diff.patch'), d.patch);

  writeState({
    ...st, turn: 'commander',
    nextMode: computeNextMode(N + 1, meta.healthy, cfg),
    repairStreak, lastHealthyCommit, notes,
  });
  log(`cycle ${N}: builder 完了 → commander へ（次の mode: ${computeNextMode(N + 1, meta.healthy, cfg)}）`);
  autoPush(cfg, `cycle ${N} builder`);
  return true;
}

// ───────── commander のターン ─────────
async function commanderTurn(st) {
  const cfg = loadConfig({ dryRun });
  const N = st.cycle;
  const pre = G.head();
  const visionExisted = G.git(['cat-file', '-e', `${pre}:comms/VISION.md`]).code === 0;
  log(`cycle ${N} (mode=${st.mode}) commander 開始`);
  const expected = N === 0 ? [P.vision, P.order(1)] : [P.feedback(N), P.order(N + 1)];
  const prompt = buildPrompt('commander', st, cfg, { notes: st.notes });
  const r = await runAgent({ cfg, prompt, cycle: N, expected, strict: N === 0 });
  if (r.aborted) return false;

  const notes = [];
  if (r.missing) {
    for (const f of r.missing) {
      if (f === P.feedback(N)) writeStub(f, `SCORE: 0/10\nDIRECTION: polish\nSUMMARY: (ハーネス生成) commander が FEEDBACK を書かなかった\n\n# FEEDBACK v${N}\n(ハーネス生成)\n`);
      if (f === P.order(N + 1)) {
        const prev = fs.existsSync(P.order(N)) ? fs.readFileSync(P.order(N), 'utf8') : '';
        writeStub(f, `# ORDER v${N + 1}\n\n(ハーネス生成) commander が ORDER を書かなかったため、前回の ORDER を引き継ぐ。未達成の項目を優先すること。\n\n---\n${prev}\n`);
      }
    }
    notes.push('commander が必要なファイルを書かなかったため、ハーネスが代替を生成した。');
  }

  const reverted = G.revertProtected(pre, { protectVision: visionExisted });
  if (reverted.length) {
    const msg = `禁止領域への変更を元に戻した: ${reverted.join(', ')}`;
    warn(msg); logLine(`- [cycle ${pad(N)}] (harness) commander: ${msg}`);
    notes.push(`commander が ${msg}（VISION.md はサイクル0で確定、harness/ は編集禁止）。`);
  }

  // LOG に 1 行要約
  const meta = readJson(path.join(shotsDir(N), 'meta.json'));
  if (N === 0) {
    const genre = fs.existsSync(P.vision) ? (fs.readFileSync(P.vision, 'utf8').match(/^\s*GENRE:\s*(.+)$/im)?.[1] ?? '') : '';
    logLine(`- [cycle 000] mode=normal | VISION と ORDERv1 を作成 | ${genre.trim()}`);
  } else {
    const f = parseFeedback(P.feedback(N));
    const health = meta ? (meta.healthy ? 'ok' : 'NG') : '?';
    logLine(`- [cycle ${pad(N)}] mode=${st.mode} | score ${f.score ?? '?'}/10 | health=${health} | ${f.direction ?? '?'} | ${f.summary ?? '(要約なし)'}`);
  }

  G.commitAll(`cycle ${N}: commander feedback + ORDERv${N + 1}`);
  G.tag(cycleTag(N));
  log(`cycle ${N}: コミットとタグ ${cycleTag(N)} を作成`);

  const done = N >= cfg.maxCycles;
  writeState({
    ...st, cycle: N + 1, turn: 'builder', mode: st.nextMode,
    nextMode: computeNextMode(N + 2, true, cfg), notes,
    waitUntil: done ? 0 : Date.now() + cfg.cycleDelaySec * 1000, done,
  });
  log(done ? `最大サイクル数 (${cfg.maxCycles}) に達したので終了します` : `cycle ${N} 完了 → cycle ${N + 1} の builder へ（mode=${st.nextMode}）`);
  autoPush(cfg, `cycle ${N} commander`);
  return true;
}

// ───────── メインループ ─────────
async function main() {
  if (stopMode()) { console.log(`STOP ファイルがあります (${STOP_FILE})。削除してから起動してください。`); return; }
  await ensureInit();
  const cfg0 = loadConfig({ dryRun });
  if (dryRun) log('*** DRY-RUN: claude の代わりにダミーコマンドを使います ***');
  else {
    const c = resolveClaude(cfg0.claude.command);
    if (!c) { console.error(`claude が見つかりません。harness/config.json の claude.command にフルパスを指定してください。`); process.exit(1); }
    log(`claude: ${c.file}`);
  }
  log(`起動。state=${JSON.stringify(readStateSync())}`);

  for (;;) {
    const sm = stopMode();
    const st = readStateSync();
    if (st.done) { log('実験は完了しています。終了します'); return; }
    if (sm === 'now' || (sm && st.turn === 'builder')) { log(`STOP を検出しました (${sm})。サイクルの区切りで停止します`); return; }

    if (st.turn !== role) { await sleep(loadConfig({ dryRun }).pollIntervalSec * 1000); continue; }
    if (role === 'builder' && st.waitUntil > Date.now()) {
      if (await sleepUnlessStop(Math.min(st.waitUntil - Date.now(), 5000), 1000)) continue;
      continue;
    }

    let ok;
    try { ok = role === 'builder' ? await builderTurn(st) : await commanderTurn(st); }
    catch (e) { warn('ターン処理で例外: ' + (e.stack || e)); ok = false; await sleep(10000); }
    if (ok === false && stopMode()) { log('STOP のため中断しました（ターンは未完了。再開すれば同じターンからやり直します）'); return; }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
