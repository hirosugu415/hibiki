// dry-run 用のダミー claude。stdin のプロンプトは読み捨て、環境変数で渡された役割に応じて
// 本物のエージェントが書くはずのファイルを書き、git commit する。出力は stream-json 風。
//
// テスト用の環境変数:
//   FAKE_BREAK_CYCLE=N   builder が cycle N でビルドを壊す（repair モードのテスト）
//   FAKE_TAMPER=1        VISION.md と harness/ を書き換える（ガードのテスト）
//   FAKE_FAIL_ONCE=1     最初の呼び出しだけ失敗する（リトライのテスト）
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const role = process.env.HARNESS_ROLE;
const N = Number(process.env.HARNESS_CYCLE);
const mode = process.env.HARNESS_MODE;
const root = process.env.HARNESS_ROOT || process.cwd();
const emit = (o) => console.log(JSON.stringify(o));
const say = (text) => emit({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
const write = (rel, text) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const append = (rel, text) => fs.appendFileSync(path.join(root, rel), text);
const git = (...a) => spawnSync('git', a, { cwd: root, encoding: 'utf8' });

process.stdin.resume();
await new Promise((r) => { process.stdin.on('end', r); process.stdin.on('error', r); setTimeout(r, 3000); });

emit({ type: 'system', subtype: 'init', cwd: root });

if (process.env.FAKE_FAIL_ONCE === '1') {
  const flag = path.join(root, 'logs', '.fake-failed-once');
  if (!fs.existsSync(flag)) {
    fs.mkdirSync(path.dirname(flag), { recursive: true }); fs.writeFileSync(flag, '1');
    say('(dummy) usage limit reached — simulated failure');
    emit({ type: 'result', subtype: 'error', is_error: true, result: 'usage limit reached (simulated)', total_cost_usd: 0 });
    process.exit(1);
  }
}

say(`(dummy) role=${role} cycle=${N} mode=${mode}`);

if (role === 'commander') {
  if (N === 0) {
    write('comms/VISION.md', '# VISION\nGENRE: Dummy Garden — dry-run 用のダミーアプリ\n## コンセプト\nダミー。\n## 絶対のルール\nUX最優先\n');
    write('comms/orders/ORDERv1.md', '# ORDER v1 (mode: normal)\n## 目的\n最小の核を作る（dummy）\n');
  } else {
    const score = Math.min(9, 3 + N);
    write(`comms/feedback/FEEDBACKv${N}.md`, `SCORE: ${score}/10\nDIRECTION: ${N % 2 ? 'polish' : 'pivot'}\nSUMMARY: (dummy) cycle ${N} の評価。スコア ${score}\n\n# FEEDBACK v${N}\n辛口のつもりのダミー評価。\n`);
    write(`comms/orders/ORDERv${N + 1}.md`, `# ORDER v${N + 1}\n(dummy) 次の指示。mode=${mode}\n`);
    if (mode === 'innovation') append('comms/IDEAS.md', `\n## Cycle ${N} — 決定 (commander)\n- 案A: 採用 — dummy\n- 案B: 却下 — dummy\n- 案C: 却下 — dummy\n`);
  }
  if (process.env.FAKE_TAMPER === '1' && N > 0) {
    append('comms/VISION.md', '\nTAMPERED BY COMMANDER\n');
    append('harness/config.json', '\n');
  }
} else if (role === 'builder') {
  if (mode === 'innovation') {
    append('comms/IDEAS.md', `\n## Cycle ${N} — 提案 (builder)\n### 案A: dummy A\n### 案B: dummy B\n### 案C: dummy C\n`);
  } else {
    const main = path.join(root, 'app', 'src', 'main.js');
    const hue = (N * 47) % 360;
    fs.writeFileSync(main,
      `import './style.css';\n// dummy cycle ${N}\ndocument.querySelector('#app').innerHTML = \`\n  <main style="padding:2rem">\n    <h1 style="color:hsl(${hue} 80% 65%)">Dummy Garden — cycle ${N}</h1>\n    <button id="b" style="font-size:1.4rem;padding:.6rem 1.2rem">grow</button>\n    <p id="out">mode: ${mode}</p>\n  </main>\`;\ndocument.querySelector('#b').addEventListener('click', () => { document.querySelector('#out').textContent = 'grown!'; });\n`);
    if (process.env.FAKE_ALWAYS_BREAK === '1' || (mode !== 'repair' && String(process.env.FAKE_BREAK_CYCLE) === String(N))) {
      fs.appendFileSync(main, "\nimport './does-not-exist.js';\n");   // ビルドを壊す
    }
    if (mode === 'repair') { /* main.js は上で書き直されるので壊れない = 修復 */ }
    write('app/shots.json', JSON.stringify({ screens: [{ name: 'home', url: '/', steps: [] }, { name: 'grown', url: '/', steps: [{ click: '#b' }, { wait: 200 }] }] }, null, 2));
  }
  write(`comms/reports/REPORTv${N}.md`, `# REPORT v${N} (mode: ${mode})\n(dummy) 実装した。\n`);
  if (process.env.FAKE_TAMPER === '1') {
    write('harness/tampered.txt', 'x');
    append('harness/config.json', '\n');
  }
  git('add', '-A');
  git('commit', '-q', '-m', `cycle ${N}: dummy builder work\n\nCo-Authored-By: Claude <noreply@anthropic.com>`);
}

emit({ type: 'result', subtype: 'success', is_error: false, result: 'done (dummy)', num_turns: 1, duration_ms: 10, total_cost_usd: 0 });
