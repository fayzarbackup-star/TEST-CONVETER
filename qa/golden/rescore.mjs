// শুধু মাপ আবার: আগের রানের asis/<id>/out.pdf বনাম মূল PDF — Gemini/Word ছাড়াই (মাপকাঠি বদলের পরে সব ফাইলের নতুন স্কোর)।
// চালানো: node qa/golden/rescore.mjs [a03,a05,...] [--sanity]
//   --sanity : ফাঁকি-যাচাই — মূল বনাম মূল (≈১০০ হওয়া উচিত) আর মূল বনাম অন্য ফাইলের আউটপুট (কম হওয়া উচিত)
// আগের স্কোর image-score.json থেকে পড়ে পাশে দেখায়; ফল asis/<id>/image-score.json-এ
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageScore } from './image-score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AD = path.join(ROOT, 'qa/golden-data/asis');
const SRC = process.env.ASIS_DIR || path.join(process.env.USERPROFILE || '', 'Downloads', 'AS it IS');
const argv = process.argv.slice(2);
const SAN = argv.includes('--sanity');
const ids = argv.find((a) => !a.startsWith('--'));
const man = JSON.parse(fs.readFileSync(path.join(AD, 'manifest.json'), 'utf8').replace(/^﻿/, ''))
  .filter((e) => !ids || ids.split(',').includes(e.id));
const spec = (e) => { const p = path.join(SRC, e.src); return e.range ? `${p}::${e.range}` : p; };
let sum = 0, n = 0;
for (const e of man) {
  const od = path.join(AD, e.id), out = path.join(od, 'out.pdf');
  if (!fs.existsSync(out)) continue;
  if (SAN) {
    const tmp = path.join(od, '_sanity');
    const self = await imageScore(spec(e), spec(e), tmp);
    const other = man[(man.indexOf(e) + 1) % man.length];
    const wrong = await imageScore(spec(e), path.join(AD, other.id, 'out.pdf'), tmp);
    console.log(`${e.id.padEnd(4)} নিজে ${self.score} | ভুল-ফাইল(${other.id}) ${wrong.score}`);
    fs.rmSync(tmp, { recursive: true, force: true });
    continue;
  }
  const sj = path.join(od, 'image-score.json');
  let prev = '';
  try { prev = JSON.parse(fs.readFileSync(sj, 'utf8')).score; } catch {}
  let r;
  for (let t = 0; ; t++) { try { r = await imageScore(spec(e), out, od); break; } catch (err) { if (t >= 2) { console.log(`${e.id} ব্যর্থ: ${err.message}`); break; } } }
  if (!r) continue;
  sum += r.score; n++;
  console.log(`${e.id.padEnd(4)} ${String(prev).padStart(5)} → ${String(r.score).padStart(5)}  পাতা ${r.pages.out}/${r.pages.truth}`);
}
if (n) console.log(`গড় ${(sum / n).toFixed(1)} (${n})`);
