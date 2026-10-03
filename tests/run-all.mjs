#!/usr/bin/env node
/**
 * Part-12: একক চালক — tests/ এর সব *.test.mjs / *.test.js + স্ন্যাপশট রানার।
 *
 *   node tests/run-all.mjs                 // সব স্যুইট
 *   node tests/run-all.mjs --only=part12   // ছাঁটাই
 *
 * আগে package.json-এর `test` মাত্র ৪টি স্যুইট চালাত ⇒ ১৩টি স্যুইটের বাকি ৯টি
 * (≈৩০০ গেট) `npm test`-এ দেখা যেত না (অডিট-রিপোর্টের আইটেম ৬)। এখন সবগুলোই
 * এক কমান্ডে চলে; যাঁদের বাইরের নির্ভরতা লাগে (playwright/Chromium, LibreOffice)
 * তাঁরা নিজেরাই পরিষ্কারভাবে SKIP ঘোষণা করে, ভুয়া পাস দেয় না।
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TDIR = path.join(ROOT, 'tests');
const ONLY = (process.argv.slice(2).find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';

const suites = fs.readdirSync(TDIR)
  .filter((f) => /\.test\.(mjs|js)$/.test(f))
  .sort()
  .map((f) => ({ name: f.replace(/\.test\.(mjs|js)$/, ''), file: path.join('tests', f) }));
if (ONLY) suites.splice(0, suites.length, ...suites.filter((s) => s.name.includes(ONLY)));

const rows = [];
let totalPass = 0, totalFail = 0, skipped = 0;

function tally(out) {
  const p = [...out.matchAll(/(\d+)\s*(?:পাস|passed)/g)].map((m) => +m[1]).reduce((a, b) => a + b, 0);
  const f = [...out.matchAll(/(\d+)\s*(?:ব্যর্থ|failed)/g)].map((m) => +m[1]).reduce((a, b) => a + b, 0);
  const skip = /SKIP|এড়ানো|স্কিপ|skipped/i.test(out);
  return { p, f, skip };
}

// ১) স্ন্যাপশট রানার (১৫ ফিক্সচার)
{
  const r = spawnSync('node', [path.join(TDIR, 'run-regression.js')], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const t = tally(out);
  rows.push({ name: 'run-regression (snapshots)', code: r.status, ...t });
  totalPass += t.p; totalFail += t.f;
}
// ২) বাকি সব স্যুইট
for (const s of suites) {
  const r = spawnSync('node', [path.join(ROOT, s.file)], { cwd: ROOT, encoding: 'utf8', timeout: 900000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const t = tally(out);
  rows.push({ name: s.name, code: r.status, ...t, file: s.file });
  totalPass += t.p; totalFail += t.f;
}

console.log('\n' + 'স্যুইট'.padEnd(34) + 'গেট'.padStart(8) + 'ফল'.padStart(10) + '  অবস্থা');
console.log('─'.repeat(72));
for (const r of rows) {
  const ok = r.code === 0 && r.f === 0;
  const note = r.skip ? 'স্কিপ-সহ' : (ok ? 'পাস' : (r.code !== 0 ? 'FAIL (exit ' + r.code + ')' : 'ব্যর্থ গেট'));
  if (r.skip) skipped++;
  console.log(String(r.name).padEnd(34) + String(r.p).padStart(8) + String(r.f).padStart(10) + '  ' + note);
}
console.log('─'.repeat(72));
console.log('মোট গেট: ' + totalPass + ' পাস, ' + totalFail + ' ব্যর্থ' + (skipped ? '  (' + skipped + 'টি স্যুইটে বাইরের নির্ভরতা না থাকায় কিছু গেট স্কিপ হয়েছে)' : ''));
process.exit(totalFail || rows.some((r) => r.code !== 0) ? 1 : 0);
