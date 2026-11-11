import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './paths.mjs';

export function git(args, { check = false, input } = {}) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', input, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  const out = { code: r.status ?? -1, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
  if (check && out.code !== 0) throw new Error(`git ${args.join(' ')} 失敗: ${out.stderr || out.stdout}`);
  return out;
}

export const head = () => {
  const r = git(['rev-parse', '--verify', '-q', 'HEAD']);   // コミットが無い間は失敗扱いにする（"HEAD" 文字列を返させない）
  return r.code === 0 ? r.stdout : null;
};

/** Claude / Anthropic を貢献者として示す行をコミットメッセージから必ず除去するフック */
const HOOK_SH = [
  '#!/bin/sh',
  '# harness 管理: コミットメッセージから Claude の共同作者表記を除去する',
  'exec node "$(git rev-parse --show-toplevel)/harness/tools/strip-attribution.mjs" "$1"',
  '',
].join('\n');

export function ensureRepoSync() {
  // 親ディレクトリの .git を拾わないよう、ROOT 直下の .git の有無で判定する
  if (!fs.existsSync(path.join(ROOT, '.git'))) git(['init', '-b', 'main'], { check: true });
  git(['config', 'core.autocrlf', 'false']);
  git(['config', 'core.safecrlf', 'false']);
  if (!git(['config', 'user.name']).stdout) git(['config', 'user.name', 'harness']);
  if (!git(['config', 'user.email']).stdout) git(['config', 'user.email', 'harness@localhost']);
  const hooks = path.join(ROOT, '.git', 'hooks');
  fs.mkdirSync(hooks, { recursive: true });
  fs.writeFileSync(path.join(hooks, 'commit-msg'), HOOK_SH, { mode: 0o755 });
  if (!head()) {
    git(['add', '-A'], { check: true });
    git(['commit', '-q', '-m', 'initial: harness + app scaffold', '--allow-empty'], { check: true });
  }
}

/** 変更があればコミット。コミットしたら true */
export function commitAll(message) {
  git(['add', '-A'], { check: true });
  if (!git(['status', '--porcelain']).stdout) return false;
  git(['commit', '-q', '-m', message], { check: true });
  return true;
}

export const tag = (name) => git(['tag', '-f', name], { check: true });

/** 直前サイクルのタグ（なければ最初のコミット）との差分 */
export function diffAgainstPrev(cycle) {
  const prevTag = `cycle-${String(cycle - 1).padStart(3, '0')}`;
  let base = git(['rev-parse', '--verify', '-q', prevTag]).stdout;
  if (!base) base = git(['rev-list', '--max-parents=0', 'HEAD']).stdout.split('\n')[0];
  const stat = git(['diff', '--stat', base, 'HEAD', '--', 'app', 'comms']).stdout;
  let patch = git(['diff', base, 'HEAD', '--', 'app']).stdout;
  const LIM = 200 * 1024;
  if (patch.length > LIM) patch = patch.slice(0, LIM) + '\n...(truncated)\n';
  return { base, stat, patch };
}

const PROTECTED = ['harness', 'package.json', 'package-lock.json', '.claude', '.gitignore'];

/**
 * 保護対象（harness/・VISION.md・root の package.json 等）が pre から変わっていたら元に戻す。
 * 戻したパスの一覧を返す。
 */
export function revertProtected(pre, { protectVision }) {
  const targets = [...PROTECTED];
  if (protectVision) targets.push('comms/VISION.md');
  const changed = new Set();
  for (const t of targets) {
    git(['diff', '--name-only', pre, '--', t]).stdout.split('\n').filter(Boolean).forEach((f) => changed.add(f));
    git(['ls-files', '--others', '--exclude-standard', '--', t]).stdout.split('\n').filter(Boolean).forEach((f) => changed.add(f));
  }
  for (const f of changed) {
    if (git(['cat-file', '-e', `${pre}:${f}`]).code === 0) {
      git(['checkout', pre, '--', f]);
    } else {
      git(['rm', '-f', '-q', '--ignore-unmatch', '--', f]);
      try { fs.rmSync(path.join(ROOT, f), { force: true }); } catch {}
    }
  }
  return [...changed];
}

/** app/ を指定コミットの内容に戻す（その後に追加されたファイルは削除） */
export function rollbackApp(sha) {
  const added = git(['diff', '--name-only', '--diff-filter=A', sha, 'HEAD', '--', 'app']).stdout.split('\n').filter(Boolean);
  for (const f of added) git(['rm', '-f', '-q', '--ignore-unmatch', '--', f]);
  git(['checkout', sha, '--', 'app'], { check: true });
}
