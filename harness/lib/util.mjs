import fs from 'node:fs';
import path from 'node:path';
import { STOP_FILE, LOGS } from './paths.mjs';

export const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

let roleTag = 'harness';
export const setRoleTag = (t) => { roleTag = t; };
export const log = (...a) => console.log(`[${ts()}] [${roleTag}]`, ...a);
export const warn = (...a) => console.warn(`[${ts()}] [${roleTag}] !`, ...a);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** STOP ファイルの状態: null | 'boundary'(サイクル完了で停止) | 'now'(今のターン後に停止) */
export function stopMode() {
  if (!fs.existsSync(STOP_FILE)) return null;
  try {
    const t = fs.readFileSync(STOP_FILE, 'utf8').trim().toLowerCase();
    return t.startsWith('now') ? 'now' : 'boundary';
  } catch { return 'boundary'; }
}

/** STOP を監視しながら待つ。STOP が現れたら true を返す（待機は中断）。 */
export async function sleepUnlessStop(ms, step = 2000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (stopMode()) return true;
    await sleep(Math.min(step, end - Date.now()));
  }
  return !!stopMode();
}

export function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

/** 一時ファイル → rename。Windows で相手が読み込み中の EPERM に備えてリトライ。 */
export function writeFileAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  for (let i = 0; i < 20; i++) {
    try { fs.renameSync(tmp, file); return; }
    catch (e) {
      if (i === 19) { try { fs.rmSync(tmp, { force: true }); } catch {} throw e; }
      sleepSync(50);
    }
  }
}

export function appendLine(file, line) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, line.endsWith('\n') ? line : line + '\n');
}

/** mkdir の原子性を使った簡易ロック（起動時の git init 競合避け） */
export async function withLock(lockDir, fn, { staleMs = 60000, timeoutMs = 90000 } = {}) {
  const start = Date.now();
  for (;;) {
    try { fs.mkdirSync(lockDir); break; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try { if (Date.now() - fs.statSync(lockDir).mtimeMs > staleMs) fs.rmSync(lockDir, { recursive: true, force: true }); } catch {}
      if (Date.now() - start > timeoutMs) throw new Error('lock timeout: ' + lockDir);
      await sleep(300);
    }
  }
  try { return await fn(); } finally { try { fs.rmSync(lockDir, { recursive: true, force: true }); } catch {} }
}

export const logFilePath = (name) => { fs.mkdirSync(LOGS, { recursive: true }); return path.join(LOGS, name); };
