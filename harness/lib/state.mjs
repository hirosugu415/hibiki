import fs from 'node:fs';
import { P } from './paths.mjs';
import { writeFileAtomic, sleepSync } from './util.mjs';

export const INITIAL_STATE = {
  cycle: 0, turn: 'commander', mode: 'normal', nextMode: 'normal',
  repairStreak: 0, lastHealthyCommit: null, waitUntil: 0, notes: [], done: false,
};

export function readStateSync() {
  for (let i = 0; i < 10; i++) {
    try { return { ...INITIAL_STATE, ...JSON.parse(fs.readFileSync(P.state, 'utf8')) }; }
    catch { sleepSync(100); }
  }
  throw new Error('STATE.json を読めません: ' + P.state);
}

export function writeState(s) {
  writeFileAtomic(P.state, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }, null, 2) + '\n');
}

/** 次サイクルの mode: repair > innovation > normal */
export function computeNextMode(nextCycle, healthy, cfg) {
  if (!healthy) return 'repair';
  return nextCycle % cfg.innovationEvery === 0 ? 'innovation' : 'normal';
}
