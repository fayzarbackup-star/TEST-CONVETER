// নির্ণয়: ছবি-স্কোরের কোন অংশে নম্বর কাটছে (image-score.mjs pageScore: সারি-প্রোফাইল ৩৫ · কালি-মিল ৩৫ · রেখা ২০ · সরণ ১০)।
// চালানো: node qa/golden/score-parts.mjs [a03,a05,...]  (শেষ asis-score রানের asis/<id>/image-score.json পড়ে; নতুন রান নয়)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lineRatio } from './image-score.mjs';

const AD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'golden-data', 'asis');
const ids = process.argv[2] ? process.argv[2].split(',') : fs.readdirSync(AD).filter((d) => fs.existsSync(path.join(AD, d, 'image-score.json')));
const T = { row: 0, ink: 0, rec: 0, prec: 0, lines: 0, shift: 0, n: 0 };
console.log('id     স্কোর | হারানো: সারি/৩৫ কালি/৩৫ রেখা/২০ সরণ/১০ | কালি recall prec | রেখা মূল/আমাদের/মিল');
for (const id of ids) {
  const f = path.join(AD, id, 'image-score.json');
  if (!fs.existsSync(f)) continue;
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const P = (j.per || []).filter((p) => !p.missing);
  if (!P.length) continue;
  const avg = (fn) => P.reduce((a, p) => a + fn(p), 0) / P.length;
  const lr = (p) => lineRatio(p.lines);
  const r = { row: 35 * (1 - avg((p) => Math.max(0, p.rowCorr))), ink: 35 * (1 - avg((p) => p.ink.f1)), lines: 20 * (1 - avg(lr)),
    shift: 10 * (1 - avg((p) => Math.max(0, 1 - Math.abs(p.shiftPt) / 36))), rec: avg((p) => p.ink.recall), prec: avg((p) => p.ink.precision) };
  const lt = P.reduce((a, p) => [a[0] + p.lines.truth, a[1] + p.lines.out, a[2] + p.lines.matched], [0, 0, 0]);
  console.log(`${id.padEnd(5)} ${String(j.score).padStart(5)} | ${r.row.toFixed(1).padStart(5)} ${r.ink.toFixed(1).padStart(6)} ${r.lines.toFixed(1).padStart(6)} ${r.shift.toFixed(1).padStart(5)} | ${r.rec.toFixed(2)} ${r.prec.toFixed(2)} | ${lt.join('/')}`);
  ['row', 'ink', 'lines', 'shift', 'rec', 'prec'].forEach((k) => { T[k] += r[k]; }); T.n++;
}
if (T.n) console.log(`গড় (${T.n})   | ${(T.row / T.n).toFixed(1).padStart(5)} ${(T.ink / T.n).toFixed(1).padStart(6)} ${(T.lines / T.n).toFixed(1).padStart(6)} ${(T.shift / T.n).toFixed(1).padStart(5)} | ${(T.rec / T.n).toFixed(2)} ${(T.prec / T.n).toFixed(2)}`);
