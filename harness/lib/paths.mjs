import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..', '..');
export const HARNESS = path.join(ROOT, 'harness');
export const COMMS = path.join(ROOT, 'comms');
export const APP = path.join(ROOT, 'app');
export const SHOTS = path.join(ROOT, 'shots');
export const LOGS = path.join(ROOT, 'logs');
export const STOP_FILE = path.join(ROOT, 'STOP');

export const pad = (n, w = 3) => String(n).padStart(w, '0');
export const shotsDir = (cycle) => path.join(SHOTS, `cycle-${pad(cycle)}`);

export const P = {
  state: path.join(COMMS, 'STATE.json'),
  vision: path.join(COMMS, 'VISION.md'),
  ideas: path.join(COMMS, 'IDEAS.md'),
  log: path.join(COMMS, 'LOG.md'),
  order: (v) => path.join(COMMS, 'orders', `ORDERv${v}.md`),
  report: (v) => path.join(COMMS, 'reports', `REPORTv${v}.md`),
  feedback: (v) => path.join(COMMS, 'feedback', `FEEDBACKv${v}.md`),
};

export const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
