// হুবহু-ফরমের লেআউট-স্কোর (Word লাগে না): আগে বানানো asis/<id>/out.pdf বনাম মূল PDF।
// চালানো: node qa/golden/asis-layout.mjs [--ids a01,a02] [--save-baseline]
// সারাংশ ≤৩০ লাইন; বিস্তারিত asis/<id>/layout-score.json; মোট qa/golden-data/score-asis-layout.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { layoutScore } from './layout-score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AD = path.join(ROOT, 'qa/golden-data/asis');
const SRC = process.env.ASIS_DIR || path.join(process.env.USERPROFILE || '', 'Downloads', 'AS it IS');
const argv = process.argv.slice(2);
const i = argv.indexOf('--ids'), IDS = i >= 0 && argv[i + 1] ? new Set(argv[i + 1].split(',')) : null;
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const man = read(path.join(AD, 'manifest.json')).filter((e) => !IDS || IDS.has(e.id));
const all = {}, rows = [];
for (const e of man) {
  const od = path.join(AD, e.id), pdf = path.join(SRC, e.src), out = path.join(od, 'out.pdf');
  if (!fs.existsSync(pdf) || !fs.existsSync(out)) { rows.push(`${e.id} — PDF নেই`); continue; }
  try {
    const r = await layoutScore(e.range ? `${pdf}::${e.range}` : pdf, out, od);   // range ⇒ শুধু ওই পাতা (image-score renderMasks)
    all[e.id] = r;
    const p = r.part;
    rows.push(`${e.id.padEnd(4)} ${String(r.score).padStart(5)} | পাতা ${r.pages.out}/${r.pages.truth} | অবস্থান ${p.pos} বিস্তার ${p.ext} উচ্চতা ${p.hgt} দাগ ${p.rules} কালি ${p.ink}`);
  } catch (err) { rows.push(`${e.id} — ব্যর্থ: ${String(err.message).slice(0, 80)}`); }
}
const ids = Object.keys(all);
const mean = (f) => +(ids.reduce((s, k) => s + f(all[k]), 0) / Math.max(1, ids.length)).toFixed(1);
const total = { n: ids.length, score: mean((r) => r.score), pos: mean((r) => r.part.pos), ext: mean((r) => r.part.ext), hgt: mean((r) => r.part.hgt), rules: mean((r) => r.part.rules), ink: mean((r) => r.part.ink) };
const sumPath = path.join(ROOT, 'qa/golden-data/score-asis-layout.json'), basePath = path.join(ROOT, 'qa/golden-data/baseline-asis-layout.json');
// --ids চালালে আগের মোট-ফাইলের বাকি id রাখা (একটি চালালে সব মুছে যেত — ২০২৬-১০-১২)
const prev = IDS && fs.existsSync(sumPath) ? read(sumPath).ids || {} : {};
fs.writeFileSync(sumPath, JSON.stringify({ at: new Date().toISOString(), total, ids: Object.assign(prev, Object.fromEntries(ids.map((k) => [k, all[k].score]))) }, null, 1));
if (argv.includes('--save-baseline')) fs.writeFileSync(basePath, fs.readFileSync(sumPath));
const regress = [];
let base = null;
if (fs.existsSync(basePath) && !argv.includes('--save-baseline')) {
  const b = read(basePath); base = b.total.score;
  for (const k of ids) if (b.ids[k] != null && all[k].score < b.ids[k] - 1) regress.push(`${k} ${b.ids[k]}→${all[k].score}`);
}
rows.slice(0, 26).forEach((r) => console.log(r));
console.log(`মোট ${ids.length}টি | লেআউট-গড় ${total.score}${base != null ? ` (ভিত্তি ${base})` : ''} | অবস্থান ${total.pos}/৪০ বিস্তার ${total.ext}/২০ উচ্চতা ${total.hgt}/১০ দাগ ${total.rules}/২০ কালি ${total.ink}/১০`);
if (regress.length) { console.log('REGRESSION: ' + regress.join(', ')); process.exitCode = 2; }
