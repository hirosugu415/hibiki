import fs from 'node:fs';
import path from 'node:path';
import { HARNESS, ROOT, P, rel, shotsDir } from './paths.mjs';
import { readJson } from './util.mjs';

/** FEEDBACK 冒頭の機械可読ヘッダ (SCORE / DIRECTION / SUMMARY) を読む */
export function parseFeedback(file) {
  try {
    const t = fs.readFileSync(file, 'utf8');
    const score = t.match(/^\s*SCORE:\s*(\d+(?:\.\d+)?)/im)?.[1];
    const direction = t.match(/^\s*DIRECTION:\s*(\w+)/im)?.[1]?.toLowerCase();
    const summary = t.match(/^\s*SUMMARY:\s*(.+)$/im)?.[1]?.trim();
    return { score: score != null ? Number(score) : null, direction: direction || null, summary: summary || null };
  } catch { return { score: null, direction: null, summary: null }; }
}

export function scoreHistory(upTo, last = 8) {
  const out = [];
  for (let c = Math.max(1, upTo - last + 1); c <= upTo; c++) {
    const f = parseFeedback(P.feedback(c));
    if (f.score != null) out.push(`c${c}:${f.score}`);
  }
  return out.join(' → ') || '(まだなし)';
}

export function readTemplate(role) {
  return fs.readFileSync(path.join(HARNESS, 'prompts', `${role}.md`), 'utf8');
}

const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

function shotSection(cycle) {
  const dir = shotsDir(cycle);
  const meta = readJson(path.join(dir, 'meta.json'));
  if (!meta) return '(shots/ に撮影結果がありません)';
  const L = [];
  L.push(`- ヘルス: **${meta.healthy ? 'OK' : 'NG'}**${meta.reasons?.length ? ' — ' + meta.reasons.join(' / ') : ''}`);
  L.push(`- ビルド: ${meta.build?.ok ? '成功' : '失敗'}（${rel(path.join(dir, 'build.log'))}）`);
  L.push(`- コンソールエラー: ${meta.consoleErrors?.length ?? 0} 件（${rel(path.join(dir, 'console-errors.log'))}）`);
  if (meta.warnings?.length) L.push(`- 警告: ${meta.warnings.slice(0, 10).join(' | ')}`);
  L.push('- スクリーンショット（Read ツールで画像として必ず開いて見ること）:');
  for (const s of meta.screens || []) L.push(`  - ${rel(path.join(dir, s.file))}${s.blank ? '  ← 真っ白判定' : ''}`);
  L.push(`- 差分: ${rel(path.join(dir, 'diff.stat.txt'))}（概要）, ${rel(path.join(dir, 'diff.patch'))}（app/ の詳細）`);
  return L.join('\n');
}

/**
 * 役割プロンプト（harness/prompts/<role>.md）に、今回のターン固有の情報を差し込んで返す。
 */
export function buildPrompt(role, st, cfg, { notes = [], retryNote = '' } = {}) {
  const N = st.cycle;
  const vars = {
    ROOT, CYCLE: N, PREV: N - 1, NEXT: N + 1, MODE: st.mode, NEXT_MODE: st.nextMode,
    INNOVATION_EVERY: cfg.innovationEvery, MAX_CYCLES: cfg.maxCycles, DEMO_QUERY: cfg.app.demoQuery,
    SHOTS_DIR: rel(shotsDir(N)),
    ORDER: rel(P.order(N)), ORDER_NEXT: rel(P.order(N + 1)), REPORT: rel(P.report(N)),
    FEEDBACK: rel(P.feedback(N)), FEEDBACK_PREV: rel(P.feedback(N - 1)), REPORT_PREV: rel(P.report(N - 1)),
  };
  let text = fill(readTemplate(role), vars);

  const ctx = [];
  ctx.push('\n\n---\n## 今回のターン情報（ハーネスが自動生成。上の説明より優先）\n');
  ctx.push(`- プロジェクトフォルダ: \`${ROOT}\`（これより外には一切触れない）`);
  ctx.push(`- サイクル: **${N}** / 上限 ${cfg.maxCycles}　　今回の mode: **${st.mode}**${role === 'commander' ? `　　次サイクルの mode: **${st.nextMode}**` : ''}`);
  ctx.push(`- 直近の評価スコア推移: ${scoreHistory(N)}`);
  if (role === 'builder') {
    ctx.push(`- 読む: \`app/NOTES.md\`（最初に）, \`${rel(P.vision)}\`, \`${rel(P.order(N))}\`${N > 1 ? `, \`${rel(P.feedback(N - 1))}\`` : ''}${st.mode === 'innovation' ? `, \`${rel(P.ideas)}\`（末尾だけ）` : ''}`);
    ctx.push(`- 書く: \`${rel(P.report(N))}\`, \`app/NOTES.md\`（記憶ノートの更新）${st.mode === 'innovation' ? `, \`${rel(P.ideas)}\`（追記のみ）` : ''}、および app/ 配下`);
    if (!fs.existsSync(path.join(ROOT, 'app', 'NOTES.md'))) ctx.push('- `app/NOTES.md` はまだありません。今回、コードを把握したついでに作成してください（4KB 以内）。');
  } else if (N === 0) {
    ctx.push(`- これはサイクル0です。書く: \`${rel(P.vision)}\`, \`${rel(P.order(1))}\``);
  } else {
    ctx.push(`- 読む: \`${rel(P.vision)}\`, \`${rel(P.order(N))}\`, \`${rel(P.report(N))}\`, \`${SHOTS_REL(N)}\` 配下の主要画像（6〜8枚）${st.mode === 'innovation' ? `, \`${rel(P.ideas)}\`（末尾の今サイクル分だけ）` : ''}`);
    try {
      const recent = fs.readFileSync(P.log, 'utf8').split(/\r?\n/).filter((l) => /^- \[cycle \d+\] mode=/.test(l)).slice(-6);
      if (recent.length) ctx.push('- 直近の LOG（LOG.md は読まなくてよい）:\n' + recent.map((l) => '  ' + l).join('\n'));
    } catch { /* LOG なし */ }
    ctx.push(`- 書く: \`${rel(P.feedback(N))}\`, \`${rel(P.order(N + 1))}\`${st.mode === 'innovation' ? `, \`${rel(P.ideas)}\`（採否の追記）` : ''}`);
    ctx.push('\n### 今サイクルの撮影・ヘルスチェック結果\n' + shotSection(N));
  }
  if (notes.length) ctx.push('\n### ハーネスからの通知\n' + notes.map((n) => `- ${n}`).join('\n'));
  if (retryNote) ctx.push('\n### 再試行について\n' + retryNote);
  return text + ctx.join('\n') + '\n';
}

const SHOTS_REL = (n) => rel(shotsDir(n));
