// commit-msg フック本体: Claude / Anthropic を貢献者として示す行を除去する。
import fs from 'node:fs';

const file = process.argv[2];
if (!file) process.exit(0);
const text = fs.readFileSync(file, 'utf8');
const bad = [
  /^\s*co-authored-by:.*(claude|anthropic)/i,
  /noreply@anthropic\.com/i,
  /generated with .*claude/i,
  /🤖.*claude/i,
];
const lines = text.split(/\r?\n/).filter((l) => !bad.some((re) => re.test(l)));
while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
fs.writeFileSync(file, lines.join('\n') + '\n');
