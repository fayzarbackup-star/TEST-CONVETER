// ভুলের ধরন-ভিত্তিক রিপোর্ট (Word/Gemini লাগে না, তাৎক্ষণিক): প্রতি ফাইলের layout-score.json + image-score.json পড়ে
// কোন ধরনে (অবস্থান/বিস্তার/উচ্চতা/রেখা/কালি/পাতা/লাইন) মোট কত নম্বর হারাচ্ছে — বড় ক্ষতি আগে।
// চালানো: node qa/golden/asis-report.mjs [--tag X] [--ids a01,a02]   (--tag দিলে qa/golden-data/runs/X)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : ''; };
const DIR = opt('--tag') ? path.join(ROOT, 'qa/golden-data/runs', opt('--tag')) : path.join(ROOT, 'qa/golden-data/asis');
const IDS = opt('--ids') ? new Set(opt('--ids').split(',')) : null;
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));

// layout-score.mjs-এর ওজন: pos 40, ext 20, hgt 10, rules 20, ink 10
const MAX = { pos: 40, ext: 20, hgt: 10, rules: 20, ink: 10 };
const NAME = { pos: 'লাইনের অবস্থান', ext: 'লাইনের দৈর্ঘ্য', hgt: 'লাইনের উচ্চতা/ফন্ট', rules: 'রেখা/টেবিল-দাগ', ink: 'কালি (বাড়তি/হারানো)' };
const loss = Object.fromEntries(Object.keys(MAX).map((k) => [k, []]));
const pageBad = [], lineBad = [], rows = [];

for (const id of fs.readdirSync(DIR).sort()) {
  if (IDS && !IDS.has(id)) continue;
  const lj = path.join(DIR, id, 'layout-score.json'), sj = path.join(DIR, id, 'image-score.json');
  if (!fs.existsSync(lj)) continue;
  const L = read(lj), S = fs.existsSync(sj) ? read(sj) : null;
  for (const k of Object.keys(MAX)) loss[k].push([id, +(MAX[k] - (L.part?.[k] ?? MAX[k])).toFixed(1)]);
  if (L.pages && !L.pages.ok) pageBad.push(`${id} ${L.pages.out}/${L.pages.truth}`);
  let lo = 0, lm = 0;
  for (const p of L.per || []) { lo += p.lines?.orig || 0; lm += p.lines?.matched || 0; }
  if (lo && lm / lo < 0.9) lineBad.push(`${id} ${lm}/${lo}`);
  rows.push([id, L.score, S?.score]);
}

const tot = (k) => loss[k].reduce((a, [, v]) => a + v, 0);
console.log(`ফাইল ${rows.length}টি | গড় লেআউট ${(rows.reduce((a, r) => a + (+r[1] || 0), 0) / (rows.length || 1)).toFixed(1)} | গড় ছবি ${(rows.reduce((a, r) => a + (+r[2] || 0), 0) / (rows.length || 1)).toFixed(1)}`);
console.log('— ধরন অনুযায়ী মোট হারানো নম্বর (বড় আগে), সবচেয়ে ক্ষতিগ্রস্ত ফাইল —');
for (const k of Object.keys(MAX).sort((a, b) => tot(b) - tot(a))) {
  const worst = loss[k].filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([i, v]) => `${i}−${v}`).join(' ');
  console.log(`${NAME[k].padEnd(20)} ${tot(k).toFixed(1).padStart(6)} (/${MAX[k]}) | ${worst}`);
}
if (pageBad.length) console.log(`পাতা-সংখ্যা ভুল: ${pageBad.join(', ')}`);
if (lineBad.length) console.log(`লাইন মেলেনি (<৯০%): ${lineBad.join(', ')}`);
console.log('দুর্বলতম ৫: ' + rows.filter((r) => r[1] != null).sort((a, b) => a[1] - b[1]).slice(0, 5).map((r) => `${r[0]} ${r[1]}`).join(', '));
