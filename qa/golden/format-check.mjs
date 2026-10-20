// হুবহু ফরম্যাট-চেক: স্কোর-রানের পরে প্রতিটি নমুনার তিনটি সমস্যা ধরে —
//   ১) ছকের রেখা/মার্জ: মূলের আড়া-খাড়া রেখা আমাদের আউটপুটে আছে কিনা (মার্জ-ঘর ভুল হলে রেখা হারায়/বাড়ে), docx-এ gridSpan/vMerge গোনা
//   ২) বাড়তি লাইন-ফাঁক: সারির উচ্চতা মূলের চেয়ে কত বেশি, আর নিচের দিকে সরণ (dy) কত জমছে
//   ৩) পাতা কাটা: মূল বনাম আমাদের পাতার সংখ্যা
// চালানো: node qa/golden/format-check.mjs [--ids a01,a02] [--tol 3]   বিস্তারিত: qa/golden-data/asis/format-check.json
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const DIR = path.join(ROOT, 'qa/golden-data/asis');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ids = arg('--ids', '') ? arg('--ids').split(',') : fs.readdirSync(DIR).filter((d) => fs.existsSync(path.join(DIR, d, 'layout-score.json')));
const TOL = Number(arg('--tol', 3)); // রেখা মেলানোর সহনশীলতা (pt)
const GAP = 6; // সারি মূলের চেয়ে এর বেশি উঁচু হলে "বাড়তি ফাঁক"

// docx (zip) থেকে word/document.xml পড়া — বাইরের লাইব্রেরি ছাড়া
function docXml(file) {
  if (!fs.existsSync(file)) return '';
  const b = fs.readFileSync(file);
  for (let i = 0; i < b.length - 30; i++) {
    if (b.readUInt32LE(i) !== 0x04034b50) continue;
    const method = b.readUInt16LE(i + 8), csize = b.readUInt32LE(i + 18);
    const nlen = b.readUInt16LE(i + 26), xlen = b.readUInt16LE(i + 28);
    const name = b.toString('utf8', i + 30, i + 30 + nlen);
    const start = i + 30 + nlen + xlen;
    if (name === 'word/document.xml') {
      const data = b.subarray(start, start + csize);
      return (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8');
    }
    i = start + csize - 1;
  }
  return '';
}

const unmatched = (a, b) => a.filter((x) => !b.some((y) => Math.abs(x - y) <= TOL)).length;

const out = [];
for (const id of ids) {
  const ls = JSON.parse(fs.readFileSync(path.join(DIR, id, 'layout-score.json'), 'utf8'));
  let rulesMiss = 0, rulesExtra = 0, rulesOrig = 0, gapRows = 0, gapSum = 0, maxDy = 0, rows = 0;
  for (const p of ls.per || []) {
    const o = p.rules?.orig || { h: [], v: [] }, u = p.rules?.ours || { h: [], v: [] };
    rulesOrig += o.h.length + o.v.length;
    rulesMiss += unmatched(o.h, u.h) + unmatched(o.v, u.v);
    rulesExtra += unmatched(u.h, o.h) + unmatched(u.v, o.v);
    for (const r of p.rows || []) {
      rows++;
      const extra = (r.hOurs ?? r.h) - r.h;
      if (extra > GAP) { gapRows++; gapSum += extra; }
      maxDy = Math.max(maxDy, Math.abs(r.dy || 0));
    }
  }
  const x = docXml(path.join(DIR, id, 'faithful_docx-unicode.docx'));
  const c = (re) => (x.match(re) || []).length;
  const rec = {
    id, score: ls.score,
    pages: ls.pages ? `${ls.pages.out}/${ls.pages.truth}` : '?', pagesOk: ls.pages ? ls.pages.ok : null,
    rulesOrig, rulesMiss, rulesExtra,
    tables: c(/<w:tbl>/g), gridSpan: c(/<w:gridSpan /g), vMerge: c(/<w:vMerge/g),
    rows, gapRows, gapPt: Math.round(gapSum), maxDy: Math.round(maxDy),
  };
  rec.flags = [
    rec.pagesOk === false && 'পাতা',
    rulesOrig && rulesMiss / rulesOrig > 0.15 && 'রেখা',
    rec.tables && !rec.gridSpan && !rec.vMerge && rulesMiss > 0 && 'মার্জ?',
    gapRows && 'ফাঁক',
    maxDy > 20 && 'সরণ',
  ].filter(Boolean);
  out.push(rec);
}

fs.writeFileSync(path.join(DIR, 'format-check.json'), JSON.stringify(out, null, 1));
console.log('id    স্কোর  পাতা  রেখা-হারানো/মোট  বাড়তি-রেখা  ছক  মার্জ  ফাঁক-সারি(pt)  সর্বোচ্চ-সরণ  সমস্যা');
for (const r of out) {
  console.log(`${r.id.padEnd(5)} ${String(r.score).padStart(5)}  ${r.pages.padEnd(4)}  ${String(r.rulesMiss).padStart(3)}/${String(r.rulesOrig).padEnd(10)} ${String(r.rulesExtra).padStart(5)}      ${String(r.tables).padStart(2)}  ${String(r.gridSpan + r.vMerge).padStart(4)}  ${String(r.gapRows).padStart(4)}(${r.gapPt})      ${String(r.maxDy).padStart(5)}     ${r.flags.join(',') || '—'}`);
}
const bad = out.filter((r) => r.flags.length).length;
console.log(`মোট ${out.length}টি নমুনা, সমস্যা-চিহ্নিত ${bad}টি`);
