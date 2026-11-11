// 使い方: node harness/tools/probe.mjs <steps.json> [--viewport desktop|mobile] [--build] [--out <dir>] [--url <path>]
// app/dist を vite preview で配信し、Playwright でステップを実行する。結果は JSON を標準出力へ。
import fs from 'node:fs';
import path from 'node:path';
import { APP, ROOT, shotsDir, rel } from '../lib/paths.mjs';
import { readStateSync } from '../lib/state.mjs';
import { loadConfig } from '../lib/config.mjs';
import { buildApp, startPreview, launchBrowser, contextOptions, attachErrorCollectors, isBlankPng } from '../lib/capture.mjs';
import { runSteps } from '../lib/steps.mjs';

const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const VALUE_OPTS = new Set(['--viewport', '--out', '--url']);
const stepsFile = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_OPTS.has(argv[i - 1])));
if (!stepsFile) { console.error('usage: node harness/tools/probe.mjs <steps.json> [--viewport desktop|mobile] [--build] [--out dir] [--url /path]'); process.exit(1); }

const cfg = loadConfig();
const vp = cfg.screenshots.viewports.find((v) => v.name === opt('--viewport', 'desktop')) ?? cfg.screenshots.viewports[0];
let cycle = 0; try { cycle = readStateSync().cycle; } catch {}
const outDir = path.resolve(ROOT, opt('--out', path.join(shotsDir(cycle), 'probe')));
fs.mkdirSync(outDir, { recursive: true });

const raw = JSON.parse(fs.readFileSync(path.resolve(ROOT, stepsFile), 'utf8'));
const steps = Array.isArray(raw) ? raw : raw.steps;

if (argv.includes('--build') || !fs.existsSync(path.join(APP, 'dist', 'index.html'))) {
  const b = await buildApp(cfg, outDir);
  if (!b.ok) { console.log(JSON.stringify({ ok: false, error: 'build failed', log: rel(path.join(outDir, 'build.log')) }, null, 2)); process.exit(2); }
}

const preview = await startPreview();
const browser = await launchBrowser();
let exit = 0;
try {
  const ctx = await browser.newContext(contextOptions(vp));
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  const errs = [];
  attachErrorCollectors(page, errs, cfg.screenshots.ignoreConsolePatterns);
  const u = new URL(opt('--url', '/'), preview.url + '/');
  if (!u.search && cfg.app.demoQuery) u.search = '?' + cfg.app.demoQuery;
  await page.goto(u.toString(), { waitUntil: 'load' });
  await page.waitForTimeout(cfg.screenshots.settleMs);
  const results = await runSteps(page, steps, { baseUrl: preview.url, shotDir: outDir, prefix: vp.name, demoQuery: cfg.app.demoQuery, fullPage: cfg.screenshots.fullPage });
  const out = results.map((r) => ({
    i: r.i, step: r.step, ok: r.ok,
    ...(r.error ? { error: r.error } : {}),
    ...(r.value !== undefined ? { value: r.value } : {}),
    ...(r.file ? { file: rel(r.file), blank: isBlankPng(r.file).blank } : {}),
  }));
  if (out.some((r) => !r.ok)) exit = 3;
  console.log(JSON.stringify({ ok: exit === 0, viewport: vp.name, url: u.toString(), consoleErrors: [...new Set(errs)], steps: out }, null, 2));
  await ctx.close();
} finally {
  await browser.close();
  preview.stop();
}
process.exit(exit);
