import fs from 'node:fs';
import path from 'node:path';
import { HARNESS } from './paths.mjs';

export const DEFAULTS = {
  pollIntervalSec: 5,
  cycleDelaySec: 30,
  maxCycles: 100,
  innovationEvery: 4,
  retry: { waitMinutes: 15, backoffMultiplier: 2, maxWaitMinutes: 120, maxOutputRetries: 2 },
  claude: { command: 'claude', model: null, effort: null, maxBudgetUsd: null, timeoutMinutes: 60, extraArgs: [] },
  app: { installBeforeBuild: true, demoQuery: 'demo=1', buildTimeoutSec: 300 },
  screenshots: {
    settleMs: 1500,
    fullPage: true,
    viewports: [
      { name: 'desktop', width: 1280, height: 800 },
      { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
    ],
    ignoreConsolePatterns: ['favicon'],
  },
  repair: { rollbackAfterFailures: 3 },
  git: { push: true, remote: 'origin', branch: 'main', pushTimeoutSec: 90 },
  dryRun: { pollIntervalSec: 1, cycleDelaySec: 0, maxCycles: 2, innovationEvery: 2, retry: { waitMinutes: 0.02 }, screenshots: { settleMs: 300 } },
};

const merge = (a, b) => {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return b === undefined ? a : b;
  const out = { ...a };
  for (const k of Object.keys(b)) out[k] = (a && typeof a[k] === 'object' && a[k] !== null && !Array.isArray(a[k])) ? merge(a[k], b[k]) : b[k];
  return out;
};

/** 毎ターン読み直す（実行中に config.json を編集すれば次のターンから反映される） */
export function loadConfig({ dryRun = false } = {}) {
  let user = {};
  try { user = JSON.parse(fs.readFileSync(path.join(HARNESS, 'config.json'), 'utf8')); }
  catch (e) { console.warn('config.json を読めません。デフォルト値を使います:', e.message); }
  let cfg = merge(DEFAULTS, user);
  if (dryRun) cfg = merge(cfg, merge(DEFAULTS.dryRun, user.dryRun || {}));
  cfg.innovationEvery = Math.max(2, Number(cfg.innovationEvery) || 4);
  cfg.dry = dryRun;
  return cfg;
}
