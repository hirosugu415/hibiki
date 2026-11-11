import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';
import { APP, shotsDir } from './paths.mjs';
import { log, warn, sleep, readJson } from './util.mjs';
import { runSteps } from './steps.mjs';

const VITE_BIN = path.join(APP, 'node_modules', 'vite', 'bin', 'vite.js');

function killTree(child) {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
    else child.kill('SIGKILL');
  } catch {}
}

/** 子プロセスを実行して出力を集める（node 直実行 or npm） */
function exec(file, args, { cwd, timeoutMs, shell = false }) {
  return new Promise((resolve) => {
    let out = '';
    const c = spawn(file, args, { cwd, shell, windowsHide: true });
    const t = setTimeout(() => { out += '\n[harness] timeout\n'; killTree(c); }, timeoutMs);
    c.stdout.on('data', (d) => { out += d; });
    c.stderr.on('data', (d) => { out += d; });
    c.on('error', (e) => { clearTimeout(t); resolve({ code: -1, out: out + String(e) }); });
    c.on('close', (code) => { clearTimeout(t); resolve({ code, out }); });
  });
}

/** npm を Windows でも shell なしで呼ぶ（node 同梱の npm-cli.js を使う） */
function npmCmd(args) {
  const cli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (fs.existsSync(cli)) return [process.execPath, [cli, ...args], false];
  return ['npm', args, true];
}

export async function buildApp(cfg, outDir) {
  const t0 = Date.now();
  let text = '';
  if (cfg.app.installBeforeBuild) {
    const [f, a, sh] = npmCmd(['install', '--no-audit', '--no-fund']);
    const r = await exec(f, a, { cwd: APP, timeoutMs: cfg.app.buildTimeoutSec * 1000, shell: sh });
    text += `$ npm install (app)\n${r.out}\n`;
    if (r.code !== 0) { fs.writeFileSync(path.join(outDir, 'build.log'), text); return { ok: false, ms: Date.now() - t0, step: 'install' }; }
  }
  const r = await exec(process.execPath, [VITE_BIN, 'build'], { cwd: APP, timeoutMs: cfg.app.buildTimeoutSec * 1000 });
  text += `$ vite build\n${r.out}\n`;
  fs.writeFileSync(path.join(outDir, 'build.log'), text);
  const ok = r.code === 0 && fs.existsSync(path.join(APP, 'dist', 'index.html'));
  return { ok, ms: Date.now() - t0, step: 'build' };
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on('error', reject);
  });
}

/** vite preview を起動し、{ url, stop } を返す */
export async function startPreview() {
  const port = await freePort();
  const child = spawn(process.execPath, [VITE_BIN, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: APP, windowsHide: true });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const url = `http://127.0.0.1:${port}`;
  const stop = () => killTree(child);
  process.once('exit', stop);
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(url); if (r.ok || r.status < 500) return { url, stop }; } catch {}
    if (child.exitCode !== null) break;
    await sleep(500);
  }
  stop();
  throw new Error('vite preview が起動しません:\n' + out.slice(-500));
}

/** カメラ/マイクなしでも動くよう、偽デバイス・自動許可で Chromium を起動する */
export async function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: [
      '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    ],
  });
}

export function contextOptions(vp) {
  return {
    viewport: { width: vp.width, height: vp.height },
    isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1,
    permissions: ['camera', 'microphone', 'geolocation', 'clipboard-read', 'clipboard-write'],
    geolocation: { latitude: 35.68, longitude: 139.76 },
    locale: 'ja-JP',
  };
}

/** ページのコンソールエラー・例外・失敗リクエストを集める */
export function attachErrorCollectors(page, bucket, ignore = []) {
  const skip = (t) => ignore.some((p) => t.includes(p));
  page.on('console', (m) => { if (m.type() === 'error' && !skip(m.text())) bucket.push(`console.error: ${m.text()}`); });
  page.on('pageerror', (e) => { if (!skip(String(e))) bucket.push(`pageerror: ${e.message || e}`); });
  page.on('requestfailed', (r) => {
    const f = r.failure()?.errorText || '';
    if (/ERR_ABORTED/.test(f) || skip(r.url())) return;
    bucket.push(`requestfailed: ${r.url()} ${f}`);
  });
  page.on('response', (r) => { if (r.status() >= 400 && !skip(r.url())) bucket.push(`http ${r.status()}: ${r.url()}`); });
}

/** ほぼ単色（＝真っ白/真っ黒）のスクリーンショットか判定 */
export function isBlankPng(file) {
  try {
    const png = PNG.sync.read(fs.readFileSync(file));
    const d = png.data, n = png.width * png.height;
    const counts = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const top = Math.max(...counts.values());
    return { blank: top / n >= 0.9995, colors: counts.size };
  } catch (e) { return { blank: false, colors: -1, error: String(e) }; }
}

/** demo モードの動き（幽霊の指の演奏）を数秒録画して video-<viewport>.webm に残す。失敗しても健全性には影響しない。 */
export async function recordDemoVideos(browser, baseUrl, cfg, dir, meta) {
  const v = cfg.screenshots.video;
  if (!v?.enabled) return;
  meta.videos = [];
  const demo = cfg.app.demoQuery ? '?' + cfg.app.demoQuery : '';
  for (const name of v.viewports ?? ['desktop']) {
    const vp = cfg.screenshots.viewports.find((x) => x.name === name);
    if (!vp) continue;
    const tmp = path.join(dir, '.video-tmp');
    let ctx;
    try {
      const k = Math.min(1, (v.maxWidth ?? 960) / vp.width);
      const size = { width: Math.round((vp.width * k) / 2) * 2, height: Math.round((vp.height * k) / 2) * 2 };
      ctx = await browser.newContext({ ...contextOptions(vp), recordVideo: { dir: tmp, size } });
      const page = await ctx.newPage();
      const video = page.video();
      await page.goto(new URL('/' + demo, baseUrl + '/').toString(), { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout((v.durationSec ?? 14) * 1000);
      await ctx.close();
      ctx = null;
      const out = `video-${name}.webm`;
      fs.renameSync(await video.path(), path.join(dir, out));
      meta.videos.push({ viewport: name, file: out, durationSec: v.durationSec ?? 14, bytes: fs.statSync(path.join(dir, out)).size });
    } catch (e) {
      meta.warnings.push(`[video-${name}] 録画できませんでした: ${String(e.message || e).split('\n')[0]}`);
    } finally {
      try { await ctx?.close(); } catch {}
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
}

export function loadScreens() {
  const j = readJson(path.join(APP, 'shots.json'));
  const screens = Array.isArray(j?.screens) && j.screens.length ? j.screens : [{ name: 'home', url: '/', steps: [] }];
  return { screens, parsedOk: !!j };
}

/**
 * 1 サイクル分のビルド→撮影→ヘルスチェック。shots/cycle-NNN/ に成果物を書き、meta を返す。
 */
export async function captureCycle(cycle, cfg) {
  const dir = shotsDir(cycle);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const meta = { cycle, at: new Date().toISOString(), build: null, screens: [], consoleErrors: [], warnings: [], videos: [], healthy: false, reasons: [] };

  log(`cycle ${cycle}: app をビルド中 …`);
  meta.build = await buildApp(cfg, dir);
  if (!meta.build.ok) {
    meta.reasons.push(`ビルド失敗 (${meta.build.step}) — build.log 参照`);
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
    return meta;
  }

  let preview, browser;
  try {
    preview = await startPreview();
    browser = await launchBrowser();
    const { screens, parsedOk } = loadScreens();
    if (!parsedOk) meta.warnings.push('app/shots.json を読めないため home のみ撮影');
    const demo = cfg.app.demoQuery ? '?' + cfg.app.demoQuery : '';

    for (const vp of cfg.screenshots.viewports) {
      for (const sc of screens) {
        const ctx = await browser.newContext(contextOptions(vp));
        const page = await ctx.newPage();
        page.setDefaultTimeout(5000);
        const errs = [];
        attachErrorCollectors(page, errs, cfg.screenshots.ignoreConsolePatterns);
        const name = String(sc.name || 'screen').replace(/[^\w-]/g, '_');
        const prefix = `${vp.name}-${name}`;
        const entry = { viewport: vp.name, name, file: `${prefix}.png`, blank: false, stepErrors: [] };
        try {
          const u = new URL(sc.url || '/', preview.url + '/');
          if (!u.search && demo) u.search = demo;
          await page.goto(u.toString(), { waitUntil: 'load', timeout: 15000 });
          await page.waitForTimeout(cfg.screenshots.settleMs);
          const res = await runSteps(page, sc.steps, { baseUrl: preview.url, shotDir: dir, prefix, demoQuery: cfg.app.demoQuery, fullPage: cfg.screenshots.fullPage });
          entry.stepErrors = res.filter((r) => !r.ok).map((r) => `step ${r.i} ${JSON.stringify(r.step)}: ${r.error}`);
          await page.waitForTimeout(Math.min(cfg.screenshots.settleMs, 800));
          await page.screenshot({ path: path.join(dir, entry.file), fullPage: cfg.screenshots.fullPage });
          const b = isBlankPng(path.join(dir, entry.file));
          entry.blank = b.blank; entry.colors = b.colors;
        } catch (e) {
          entry.error = String(e.message || e).split('\n')[0];
          meta.reasons.push(`${prefix}: 画面を開けない/撮れない (${entry.error})`);
        }
        for (const e of errs) meta.consoleErrors.push(`[${prefix}] ${e}`);
        for (const e of entry.stepErrors) meta.warnings.push(`[${prefix}] ${e}`);
        if (entry.blank) meta.reasons.push(`${prefix}: 画面が真っ白/単色`);
        meta.screens.push(entry);
        await ctx.close();
      }
    }
    await recordDemoVideos(browser, preview.url, cfg, dir, meta);
  } catch (e) {
    meta.reasons.push('撮影処理の失敗: ' + String(e.message || e).split('\n')[0]);
  } finally {
    try { await browser?.close(); } catch {}
    try { preview?.stop(); } catch {}
  }

  meta.consoleErrors = [...new Set(meta.consoleErrors)].slice(0, 50);
  if (meta.consoleErrors.length) meta.reasons.push(`コンソールエラー ${meta.consoleErrors.length} 件`);
  fs.writeFileSync(path.join(dir, 'console-errors.log'), meta.consoleErrors.join('\n') + (meta.consoleErrors.length ? '\n' : ''));
  meta.healthy = meta.reasons.length === 0;
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  log(`cycle ${cycle}: 撮影完了 healthy=${meta.healthy}${meta.healthy ? '' : ' — ' + meta.reasons.join(' / ')}`);
  return meta;
}
