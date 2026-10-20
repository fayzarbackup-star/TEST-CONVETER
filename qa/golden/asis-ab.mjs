// সুইচ A/B তুলনা: একই ফাইলগুলো সুইচ-বন্ধ (ভিত্তি) আর সুইচ-চালু অবস্থায় আলাদা ফোল্ডারে স্কোর করে প্রতি ফাইলে পার্থক্য দেখায়।
// fixture (qa/golden-data/asis) বদলায় না। docx না বদলালে Word-ধাপ বাদ (asis-score-এর ছাপ) — তাই যে ফাইলে সুইচের প্রভাব নেই সেটা দ্রুত।
// চালানো: node qa/golden/asis-ab.mjs --on A07FIX[,RULEFIX] [--base A01FIX] [--ids a01,a07]
//   --base : ভিত্তিতেও যে সুইচ চালু থাকবে (যেমন আগে-গৃহীত সুইচ); --on : ভিত্তির উপরে যা পরীক্ষা হচ্ছে
// ফল: পার্থক্য-টেবিল (≤৩০ লাইন), খারাপ হলে exitCode 2
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : ''; };
const ON = opt('--on'), BASE = opt('--base'), IDS = opt('--ids');
if (!ON) { console.log('--on <SWITCH[,..]> দিন'); process.exit(1); }
const tagOf = (s) => (s ? s.replace(/[^A-Za-z0-9_]+/g, '+') : 'off');
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));

function run(fzOn) {
  const tag = tagOf(fzOn);
  const args = [path.join(ROOT, 'qa/golden/asis-score.mjs'), '--tag', tag, '--kill-stale-word'];
  if (IDS) args.push('--ids', IDS);
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, FZ_ON: fzOn }, timeout: 4 * 60 * 60 * 1000 });
  const fails = (r.stdout || '').split('\n').filter((l) => /ব্যর্থ|নেই|লক/.test(l));
  fails.forEach((l) => console.log(`[${tag}] ${l.trim()}`));
  const sp = path.join(ROOT, 'qa/golden-data/runs', tag, 'score.json');
  return fs.existsSync(sp) ? read(sp) : { ids: {}, layout: {} };
}

const both = [BASE, ON].filter(Boolean).join(',');
const A = run(BASE), B = run(both);
let worse = 0, better = 0;
const lines = [];
for (const id of Object.keys(B.ids).sort()) {
  const di = +(B.ids[id] - (A.ids[id] ?? NaN)).toFixed(1), dl = +((+B.layout?.[id]) - (+A.layout?.[id])).toFixed(1);
  const d = Number.isNaN(dl) ? di : dl;
  if (d <= -1) worse++; else if (d >= 1) better++;
  const mark = d <= -1 ? '▼' : d >= 1 ? '▲' : ' ';
  lines.push(`${mark} ${id.padEnd(6)} লেআউট ${A.layout?.[id] ?? '–'}→${B.layout?.[id] ?? '–'} (${dl > 0 ? '+' : ''}${dl}) | ছবি ${A.ids[id] ?? '–'}→${B.ids[id]} (${di > 0 ? '+' : ''}${di})`);
}
lines.slice(0, 26).forEach((l) => console.log(l));
console.log(`ভিত্তি [${BASE || 'সব বন্ধ'}] গড় ${A.total?.score} → [${both}] গড় ${B.total?.score} | ভালো ${better}, খারাপ ${worse}`);
if (worse) process.exitCode = 2;
