// WORK_PLAN A4: হুবহু-মোডের স্কোর — সোনালি নমুনা → (ক্যাশ করা) ক্যাপচার → আমাদের .docx → Word-মাপ → সত্যের সাথে তুলনা।
// চালানো: node qa/golden/faithful-score.mjs [--ids g01,g05] [--input pdf|photo] [--capture] [--save-baseline]
//   --capture : ক্যাপচার না থাকলে Gemini-তে নেওয়া (খরচ; অ্যাপ-সার্ভার localhost:3008 চালু থাকতে হবে — START_SERVER.bat)।
//   ক্যাপচার থাকলে সবসময় বিনা খরচে বর্তমান ইঞ্জিন দিয়ে নতুন .docx বানায় — উন্নতির পরে শুধু এটাই চালাতে হয়।
// সারাংশ ≤৩০ লাইন; বিস্তারিত: <id>/faithful-<input>/score.json, মোট: qa/golden-data/score-<input>.json
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { finalize } from './finalize-golden.mjs';
import { compare } from './compare-truth.mjs';
import { docxParagraphRuns } from './docx-runs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GD = path.join(ROOT, 'qa/golden-data');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const INPUT = opt('--input', 'pdf');
const IDS = opt('--ids', '') ? new Set(opt('--ids').split(',')) : null;
const CAPTURE = argv.includes('--capture');
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));

const subsetPath = path.join(GD, 'subset.json'); // A3-এর বাছাই করা সেট (না থাকলে --ids লাগবে)
const ids = IDS ? [...IDS] : fs.existsSync(subsetPath) ? read(subsetPath).ids : [];
if (!ids.length) { console.log('কোনো id নেই: --ids দিন বা qa/golden-data/subset.json বানান'); process.exit(1); }

const rows = [], all = {};
for (const id of ids) {
  const dir = path.join(GD, id), od = path.join(dir, `faithful-${INPUT}`);
  const srcFile = INPUT === 'photo' ? path.join(dir, 'photo-1.jpg') : path.join(dir, 'source.pdf');
  if (!fs.existsSync(path.join(dir, 'truth.json'))) { rows.push(`${id} — truth.json নেই (finalize-golden চালান)`); continue; }
  const hasCap = fs.existsSync(path.join(od, 'capture.json'));
  if (!hasCap && !CAPTURE) { rows.push(`${id} — ক্যাপচার নেই (--capture)`); continue; }
  // ১) ক্যাপচার (ক্যাশ) + বর্তমান ইঞ্জিনে .docx
  const e2e = spawnSync(process.execPath, [path.join(ROOT, 'qa/faithful-e2e.mjs'), srcFile, od], { encoding: 'utf8', timeout: 40 * 60 * 1000 });
  const docx = path.join(od, 'faithful_docx-unicode.docx');
  if (e2e.status !== 0 || !fs.existsSync(docx)) { rows.push(`${id} — e2e ব্যর্থ: ${(e2e.stderr || e2e.stdout || '').split('\n').filter(Boolean).slice(-1)[0] || e2e.status}`.slice(0, 160)); continue; }
  // ২) Word-এ আমাদের আউটপুট মাপা (সত্যের মতো একই কোড)
  const ms = spawnSync('powershell', ['-NoProfile', '-File', path.join(ROOT, 'qa/golden/measure-doc.ps1'), docx, path.join(od, 'out.raw.json'), path.join(od, 'out.pdf')], { encoding: 'utf8', timeout: 10 * 60 * 1000 });
  if (ms.status !== 0 || !fs.existsSync(path.join(od, 'out.raw.json'))) { rows.push(`${id} — Word-মাপ ব্যর্থ`); continue; }
  // ৩) তুলনা
  const truth = read(path.join(dir, 'truth.json'));
  const out = finalize(read(path.join(od, 'out.raw.json')), await docxParagraphRuns(docx));
  const m = compare(truth, out);
  fs.writeFileSync(path.join(od, 'score.json'), JSON.stringify(m, null, 1));
  all[id] = m;
  const f = (v, d = 0) => (v == null ? '–' : (+v).toFixed(d));
  rows.push(`${id} ${f(m.score, 1).padStart(5)} | পাতা ${m.pages.out}/${m.pages.truth} | লেখা ${f(m.text.recall * 100)}% | মিল ${f(m.items.share * 100)}% | dy ${f(m.pos.dyMedian)}pt | আকার±${f(m.size.mae, 1)} | মোটা ${f(m.bold * 100)}% | টেবিল ${m.tables.gridOk}/${m.tables.truth} প্রস্থ-ভুল ${f(m.tables.widthErr, 2)}` +
    (m.fmt && m.fmt.score != null ? ` || ফরম্যাট ${f(m.fmt.score)}% (ইটা ${f(m.fmt.italic * 100)} নিচে-দাগ ${f(m.fmt.underline * 100)} সারি ${f(m.fmt.align * 100)} পটি ${m.fmt.shadeCount.join('/')} ছবি ${m.fmt.imageCount.join('/')})` : ''));
}

const scored = Object.values(all);
const avg = (k) => (scored.length ? scored.reduce((a, m) => a + k(m), 0) / scored.length : 0);
const total = { n: scored.length, score: +avg((m) => m.score).toFixed(1), pagesOk: scored.filter((m) => m.pages.ok).length, textRecall: +avg((m) => m.text.recall).toFixed(3),
  fmt: +avg((m) => (m.fmt && m.fmt.score != null ? m.fmt.score : 0)).toFixed(1) };
const sumPath = path.join(GD, `score-${INPUT}.json`);
fs.writeFileSync(sumPath, JSON.stringify({ at: new Date().toISOString(), total, ids: Object.fromEntries(Object.entries(all).map(([k, m]) => [k, m.score])) }, null, 1));

// ভিত্তিরেখা: সংরক্ষণ বা তুলনা (কোনো নমুনার স্কোর ১-এর বেশি কমলে REGRESSION)
const basePath = path.join(GD, `baseline-${INPUT}.json`);
const regress = [];
if (argv.includes('--save-baseline')) fs.writeFileSync(basePath, fs.readFileSync(sumPath));
else if (fs.existsSync(basePath)) {
  const b = read(basePath);
  for (const [id, m] of Object.entries(all)) if (b.ids[id] != null && m.score < b.ids[id] - 1) regress.push(`${id} ${b.ids[id]}→${m.score}`);
  total.baseline = b.total.score;
}
rows.slice(0, 22).forEach((r) => console.log(r));
console.log(`মোট ${total.n}টি | গড় স্কোর ${total.score}${total.baseline != null ? ` (ভিত্তি ${total.baseline})` : ''} | পাতা মিলেছে ${total.pagesOk}/${total.n} | লেখা ${(total.textRecall * 100).toFixed(0)}% | ফরম্যাট-পূর্ণতা ${total.fmt}%`);
if (regress.length) { console.log('REGRESSION: ' + regress.join(', ')); process.exitCode = 2; }
