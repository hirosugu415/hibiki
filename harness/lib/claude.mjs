import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { HARNESS, ROOT } from './paths.mjs';
import { log, warn, ts } from './util.mjs';

const SETTINGS = path.join(HARNESS, 'claude-settings.json');
const FAKE = path.join(HARNESS, 'dryrun', 'fake-claude.mjs');

/** claude 実行ファイルを探す: config 指定 → PATH → 既知のインストール先 */
export function resolveClaude(command = 'claude') {
  const cands = [];
  if (/[\\/]/.test(command)) {
    cands.push(command);
  } else {
    const w = spawnSync('where', [command], { encoding: 'utf8', windowsHide: true });
    if (w.status === 0) {
      const found = w.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      found.sort((a, b) => (/\.exe$/i.test(b) ? 1 : 0) - (/\.exe$/i.test(a) ? 1 : 0));
      cands.push(...found);
    }
    const home = os.homedir();
    cands.push(path.join(home, '.local', 'bin', 'claude.exe'));
    if (process.env.APPDATA) cands.push(path.join(process.env.APPDATA, 'npm', 'claude.cmd'));
    const extDir = path.join(home, '.vscode', 'extensions');
    try {
      const exts = fs.readdirSync(extDir).filter((d) => d.startsWith('anthropic.claude-code-')).sort().reverse();
      for (const d of exts) cands.push(path.join(extDir, d, 'resources', 'native-binary', 'claude.exe'));
    } catch {}
  }
  const file = cands.find((c) => c && fs.existsSync(c));
  if (!file) return null;
  return { file, shell: /\.(cmd|bat)$/i.test(file) };
}

const q = (s) => (/[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);

function killTree(child) {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
    else child.kill('SIGKILL');
  } catch {}
}

const LIMIT_RE = /usage limit|rate.?limit|limit reached|limit will reset|overloaded|too many requests|\b429\b|\b529\b|resets? (at|in)/i;

function summarizeEvent(ev) {
  if (ev.type === 'assistant') {
    const out = [];
    for (const c of ev.message?.content || []) {
      if (c.type === 'text' && c.text?.trim()) out.push(c.text.trim());
      else if (c.type === 'tool_use') {
        const inp = JSON.stringify(c.input || {});
        out.push(`🔧 ${c.name} ${inp.length > 160 ? inp.slice(0, 160) + '…' : inp}`);
      }
    }
    return out.join('\n');
  }
  if (ev.type === 'result') {
    return `── result: ${ev.subtype}${ev.is_error ? ' (ERROR)' : ''} turns=${ev.num_turns ?? '?'} ${ev.duration_ms ? Math.round(ev.duration_ms / 1000) + 's' : ''} $${(ev.total_cost_usd ?? 0).toFixed(3)}`;
  }
  if (ev.type === 'rate_limit_event' && ev.rate_limit_info?.status && ev.rate_limit_info.status !== 'allowed') {
    return `⚠ rate limit: ${JSON.stringify(ev.rate_limit_info)}`;
  }
  return null;
}

/**
 * claude を非対話で 1 回実行する。プロンプトは stdin で渡す（Windows のコマンドライン長制限を避けるため）。
 * dry-run のときは fake-claude.mjs を代わりに実行する。
 * 戻り値: { ok, reason, resultText, costUsd, exitCode, limitHint }
 */
export function runClaude({ cfg, prompt, logFile, env = {} }) {
  return new Promise((resolve) => {
    let file, args, shell = false;
    if (cfg.dry) {
      file = process.execPath; args = [FAKE];
    } else {
      const r = resolveClaude(cfg.claude.command);
      if (!r) {
        return resolve({ ok: false, reason: `claude が見つかりません (command=${cfg.claude.command})。harness/config.json の claude.command にフルパスを指定してください`, exitCode: -1 });
      }
      file = r.file; shell = r.shell;
      args = ['-p', '--dangerously-skip-permissions', '--output-format', 'stream-json', '--verbose', '--settings', SETTINGS];
      if (cfg.claude.model) args.push('--model', cfg.claude.model);
      if (cfg.claude.effort) args.push('--effort', cfg.claude.effort);
      if (cfg.claude.maxBudgetUsd) args.push('--max-budget-usd', String(cfg.claude.maxBudgetUsd));
      args.push(...(cfg.claude.extraArgs || []));
    }

    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    logStream.write(`\n===== ${ts()} start: ${file} ${args.join(' ')} =====\n`);

    const child = shell
      ? spawn(q(file), args.map(q), { cwd: ROOT, shell: true, windowsHide: true, env: { ...process.env, ...env } })
      : spawn(file, args, { cwd: ROOT, windowsHide: true, env: { ...process.env, ...env } });

    let resultEv = null, limitHint = '', buf = '', errBuf = '', timedOut = false, lastText = '';
    const timer = setTimeout(() => { timedOut = true; warn('claude がタイムアウトしました。プロセスを終了します'); killTree(child); },
      Math.max(1, cfg.claude.timeoutMinutes) * 60 * 1000);

    const handleLine = (line) => {
      if (!line.trim()) return;
      logStream.write(line + '\n');
      let ev = null;
      try { ev = JSON.parse(line); } catch {}
      if (!ev) { console.log(line); if (LIMIT_RE.test(line)) limitHint = line.slice(0, 300); return; }
      if (ev.type === 'result') resultEv = ev;
      const s = summarizeEvent(ev);
      if (s) { console.log(s); lastText = s; }
      if (ev.type === 'result' && ev.is_error && LIMIT_RE.test(String(ev.result))) limitHint = String(ev.result).slice(0, 300);
    };

    child.stdout.on('data', (d) => {
      buf += d.toString('utf8');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { handleLine(buf.slice(0, i).replace(/\r$/, '')); buf = buf.slice(i + 1); }
    });
    child.stderr.on('data', (d) => {
      const t = d.toString('utf8'); errBuf += t; logStream.write('[stderr] ' + t);
      process.stderr.write(t);
      if (LIMIT_RE.test(t)) limitHint = t.slice(0, 300);
    });
    child.on('error', (e) => { clearTimeout(timer); logStream.end(); resolve({ ok: false, reason: 'spawn error: ' + e.message, exitCode: -1 }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (buf.trim()) handleLine(buf);
      logStream.write(`===== ${ts()} exit=${code} =====\n`);
      logStream.end();
      const costUsd = resultEv?.total_cost_usd ?? 0;
      if (timedOut) return resolve({ ok: false, reason: 'timeout', exitCode: code, costUsd, limitHint });
      if (code !== 0) return resolve({ ok: false, reason: `exit code ${code}`, exitCode: code, costUsd, limitHint, resultText: errBuf.slice(-400) || lastText });
      if (!resultEv) return resolve({ ok: false, reason: 'result イベントなし', exitCode: code, costUsd, limitHint });
      if (resultEv.is_error) return resolve({ ok: false, reason: 'result is_error: ' + String(resultEv.result).slice(0, 200), exitCode: code, costUsd, limitHint, resultText: String(resultEv.result) });
      resolve({ ok: true, exitCode: code, costUsd, resultText: String(resultEv.result ?? ''), limitHint });
    });

    child.stdin.on('error', () => {});
    child.stdin.end(prompt);
    log(`claude 起動 (pid ${child.pid}) …`);
  });
}
