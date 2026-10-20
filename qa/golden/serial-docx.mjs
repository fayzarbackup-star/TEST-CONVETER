// ক্রমিক-অনুচ্ছেদ docx-এ কীভাবে বসেছে (সব ফাইল): ইনডেন্ট/ঝুলন্ত/ট্যাব আছে কিনা — ক্রমিকের পরে লেখা এক রেখায় সাজছে কিনা।
// চালানো: node qa/golden/serial-docx.mjs [--ids a03] [--v]   (--v: প্রতি অনুচ্ছেদের লাইন)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(ROOT, 'qa/golden-data/asis');
const argv = process.argv.slice(2);
const k = argv.indexOf('--ids');
const IDS = k >= 0 ? new Set(argv[k + 1].split(',')) : null;
const V = argv.includes('--v');
const SER = /^\s*(\(?[০-৯0-9]{1,2}[।.)]|\([ক-হa-z]\)|[ক-হ][।.)])/;
const tot = { n: 0, tab: 0, hang: 0, none: 0 };
for (const id of fs.readdirSync(DIR).sort()) {
  if (IDS && !IDS.has(id)) continue;
  const f = path.join(DIR, id, 'faithful_docx-unicode.docx');
  if (!fs.existsSync(f)) continue;
  const xml = await (await JSZip.loadAsync(fs.readFileSync(f))).file('word/document.xml').async('string');
  const s = { n: 0, tab: 0, hang: 0, none: 0, inTbl: 0 };
  // টেবিলের বাইরে/ভেতরে দুটোই — w:p ধরে
  for (const m of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const p = m[0];
    const txt = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>|<w:tab\/>/g)].map((x) => (x[1] != null ? x[1] : '⇥')).join('');
    if (!SER.test(txt)) continue;
    s.n++;
    const ind = (p.match(/<w:ind [^>]*>/) || [''])[0];
    const hasTab = /^[^⇥]{1,6}⇥/.test(txt.trim());
    const hang = /w:hanging/.test(ind);
    if (hasTab) s.tab++; if (hang) s.hang++; if (!hasTab && !hang) s.none++;
    if (V) console.log(`  ${hasTab ? 'T' : '-'}${hang ? 'H' : '-'} ${ind.replace(/<w:ind |\/>/g, '')} | ${txt.slice(0, 40)}`);
  }
  for (const key of Object.keys(tot)) tot[key] += s[key];
  if (s.n) console.log(`${id}: ক্রমিক-অনুচ্ছেদ ${s.n} | ট্যাবে সাজানো ${s.tab} | ঝুলন্ত-ইনডেন্ট ${s.hang} | কোনোটাই নেই ${s.none}`);
}
console.log(`মোট ${tot.n}: ট্যাব ${tot.tab}, ঝুলন্ত ${tot.hang}, কিছুই নেই ${tot.none}`);
