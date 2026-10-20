// ক্রমিক-নম্বর নির্ণয় (সব ফাইল): capture-এর অনুচ্ছেদ-ব্লকে ক্রমিক লাইন ("১।", "২)", "(ক)", "1.") —
// কতগুলো আলাদা ব্লকে আসে, কতগুলো এক ব্লকে একাধিক ক্রমিক জোড়া লাগে (= নিচেরগুলো "একত্রে লেগে যাওয়া")।
// চালানো: node qa/golden/serial-check.mjs [--ids a01,a03]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(ROOT, 'qa/golden-data/asis');
const argv = process.argv.slice(2);
const i = argv.indexOf('--ids');
const IDS = i >= 0 ? new Set(argv[i + 1].split(',')) : null;
const SER = /^\s*(\(?[০-৯0-9]{1,2}[।.)]|\([ক-হa-z]\)|[ক-হ][।.)])\s*/;
let tot = { blocks: 0, multi: 0, inner: 0 };
const ex = [];
for (const id of fs.readdirSync(DIR).sort()) {
  if (IDS && !IDS.has(id)) continue;
  const f = path.join(DIR, id, 'capture.json');
  if (!fs.existsSync(f)) continue;
  const text = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')).text || '';
  const blocks = text.split(/\[\[B:/).slice(1).map((b) => ({ head: b.slice(0, b.indexOf(']]')), body: b.slice(b.indexOf(']]') + 2) }));
  let n = 0, multi = 0, inner = 0;
  for (const b of blocks) {
    if (/t=table/.test(b.head)) continue;
    const lines = b.body.split('\n').map((s) => s.trim()).filter(Boolean);
    const ser = lines.filter((l) => SER.test(l)).length;
    // লাইনের মাঝখানে লুকানো ক্রমিক (যেমন "... শেষ। ৩। পরের") = জোড়া লাগা
    const mid = lines.reduce((a, l) => a + (l.slice(3).match(/\s([০-৯]{1,2}[।)])\s/g) || []).length, 0);
    if (ser) n++;
    if (ser >= 2) { multi++; if (ex.length < 6) ex.push(`${id} ${b.head.match(/box=[^;]+/)?.[0]} ক্রমিক ${ser}`); }
    if (mid) inner += mid;
  }
  tot.blocks += n; tot.multi += multi; tot.inner += inner;
  if (n) console.log(`${id}: ক্রমিক-ব্লক ${n} | এক ব্লকে ≥২ ক্রমিক ${multi} | লাইনের মাঝে লুকানো ক্রমিক ${inner}`);
}
console.log(`মোট: ক্রমিক-ব্লক ${tot.blocks}, বহু-ক্রমিক ব্লক ${tot.multi}, মাঝে-লুকানো ${tot.inner}`);
ex.forEach((e) => console.log('  উদা: ' + e));
