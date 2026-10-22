// Usage: node qa/usability-score.mjs <docx> <expected.json> [ocr-text.md]
// Prints a JSON scorecard {id, checks, safetyPass, lookPass}. Read-only.
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const [docxPath, expPath, ocrPath] = process.argv.slice(2);
if (!docxPath || !expPath) {
  console.error('usage: node qa/usability-score.mjs <docx> <expected.json> [ocr-text.md]');
  process.exit(2);
}

const exp = JSON.parse(fs.readFileSync(expPath, 'utf8'));
const id = path.basename(path.dirname(path.resolve(expPath)));
const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
const docXml = await zip.file('word/document.xml').async('string');
const stylesXml = zip.file('word/styles.xml') ? await zip.file('word/styles.xml').async('string') : '';

const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const wtText = xml => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m => decode(m[1])).join(' ');
const allText = wtText(docXml);

const bnDigits = /[০-৯]/;
const enDigits = /[0-9]/;
const PLACEHOLDERS = ['আপনার প্রতিষ্ঠান', 'ঠিকানা লিখুন', 'পরীক্ষার নাম লিখুন'];

const normWord = w => w.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').normalize('NFC');

// ---------- c1 ----------
function c1() {
  if (!ocrPath || !fs.existsSync(ocrPath)) return { pass: true, value: 'skipped (no ocr-text.md)' };
  let t = fs.readFileSync(ocrPath, 'utf8').replace(/^---[\s\S]*?\n---\s*\n/, '').replace(/[ \t]*<!--\s*r:[A-Za-z,\s]+?-->/g, '');   // 1B-ii: ভূমিকা-চিহ্ন লেখা নয়
  const lines = t.split(/\r?\n/).filter(l => {
    const s = l.trim();
    if (!s) return false;
    if (/^\|?[\s:|-]+\|?$/.test(s)) return false; // table separator
    if (/^[\d০-৯\s.\-–—]+$/.test(s)) return false; // page-number-like
    if (/\[\[B:t=(stamp|header|page_number)/.test(s)) return false;
    if (PLACEHOLDERS.some(p => s.includes(p))) return false;
    return true;
  });
  const words = lines
    .join(' ')
    .replace(/^#+\s*/gm, '')
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/\*\*|__|\||⟦[^⟧]*⟧|\.{3,}/g, ' ')
    .split(/\s+/)
    .map(normWord)
    .filter(w => w && /[\p{L}\p{N}]/u.test(w));
  if (!words.length) return { pass: true, value: 'skipped (no words)' };
  const have = new Set(allText.split(/\s+/).map(normWord));
  const hay = allText.normalize('NFC');
  const hit = words.filter(w => have.has(w) || hay.includes(w)).length;
  const r = hit / words.length;
  return { pass: r >= 0.97, value: +r.toFixed(4) };
}

// ---------- c2 ----------
function c2() {
  const n = (docXml.match(/<w:framePr\b/g) || []).length + (docXml.match(/<w:tblpPr\b/g) || []).length;
  return { pass: n === 0, value: n };
}

// ---------- tables (top-level) ----------
function topTables(xml) {
  const out = [];
  const re = /<w:tbl>|<w:tbl\s|<\/w:tbl>/g;
  let depth = 0, start = -1, m;
  while ((m = re.exec(xml))) {
    if (m[0].startsWith('</')) {
      depth--;
      if (depth === 0) out.push(xml.slice(start, m.index + m[0].length));
    } else {
      if (depth === 0) start = m.index;
      depth++;
    }
  }
  return out;
}
const tables = topTables(docXml).map(x => {
  const rows = x.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || [];
  const grid = (x.match(/<w:gridCol\b/g) || []).length;
  const tcMax = Math.max(0, ...rows.map(r => (r.match(/<w:tc>|<w:tc\s/g) || []).length));
  return { xml: x, rows, nrows: rows.length, ncols: grid || tcMax };
});

function c3() {
  if (!Array.isArray(exp.tables)) return { pass: true, value: 'skipped' };
  const val = { expected: exp.tables.map(t => `${t.rows}x${t.cols}`), got: tables.map(t => `${t.nrows}x${t.ncols}`) };
  let pass = tables.length === exp.tables.length;
  if (pass) exp.tables.forEach((e, i) => {
    if (Math.abs(e.rows - tables[i].nrows) > 1 || Math.abs(e.cols - tables[i].ncols) > 1) pass = false;
  });
  return { pass, value: val };
}

// ---------- c5 ----------
function c5() {
  let defSz = 20;
  const dd = stylesXml.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/);
  const dm = dd && dd[0].match(/<w:sz w:val="(\d+)"/);
  if (dm) defSz = +dm[1];
  const hist = {};
  let min = Infinity;
  for (const m of docXml.matchAll(/<w:r[\s>][\s\S]*?<\/w:r>/g)) {
    const txt = wtText(m[0]).trim();
    if (!txt) continue;
    const sm = m[0].match(/<w:rPr>[\s\S]*?<w:sz w:val="(\d+)"/);
    const sz = sm ? +sm[1] : defSz;
    hist[sz] = (hist[sz] || 0) + txt.length;
    if (sz < min) min = sz;
  }
  const mode = +Object.entries(hist).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  if (mode === null) return { pass: false, value: 'no text runs' };
  return { pass: mode >= 20 && min >= 18, value: { mode, min } };
}

// ---------- c6 ----------
function c6() {
  let bad = [];
  let stat = { rows: 0, rowsWithKeepNext: 0 };
  tables.forEach((t, i) => {
    if (t.nrows <= 15) return;
    const kn = t.rows.filter(r => /<w:keepNext\b/.test(r)).length;
    if (kn > stat.rowsWithKeepNext || !stat.rows) stat = { rows: t.nrows, rowsWithKeepNext: kn };
    if (kn / t.nrows > 0.5) bad.push(`table${i + 1}:keepNext-on-${kn}-of-${t.nrows}-rows`);
  });
  if (tables.length) {
    const first = docXml.indexOf(tables[0].xml.slice(0, 40));
    const before = docXml.slice(0, first);
    const pbs = [...before.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)];
    const last = pbs[pbs.length - 1];
    if (last && /<w:pageBreakBefore\b|<w:br\b[^>]*w:type="page"/.test(last[0])) bad.push('page-break-before-first-table');
    if (/<w:pageBreakBefore\b/.test(tables[0].xml.slice(0, 600))) bad.push('pageBreakBefore-in-first-table');
  }
  return { pass: bad.length === 0, value: { ...stat, issues: bad } };
}

// ---------- c7 ----------
function c7() {
  const found = PLACEHOLDERS.filter(p => allText.includes(p));
  const isExam = String(exp.docType || '').startsWith('EXAM');
  return { pass: isExam || found.length === 0, value: found.length ? found : 'none' };
}

// ---------- c8 ----------
function c8() {
  if (!exp.orientation) return { pass: true, value: 'skipped' };
  const m = docXml.match(/<w:pgSz\b[^>]*>/);
  if (!m) return { pass: false, value: 'no pgSz' };
  const w = +(m[0].match(/w:w="(\d+)"/) || [])[1], h = +(m[0].match(/w:h="(\d+)"/) || [])[1];
  const orient = /w:orient="landscape"/.test(m[0]) || w > h ? 'landscape' : 'portrait';
  return { pass: orient === exp.orientation, value: orient };
}

// ---------- c9 ----------
function c9() {
  if (!exp.digits) return { pass: true, value: 'skipped' };
  const cells = tables.flatMap(t => t.xml.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || []).map(wtText).join(' ');
  const wrong = exp.digits === 'english' ? bnDigits.test(cells) : enDigits.test(cells);
  return { pass: !wrong, value: wrong ? `wrong-digits-in-cells(${exp.digits})` : 'ok' };
}

const checks = { c1: c1(), c2: c2(), c3: c3(), c5: c5(), c6: c6(), c7: c7(), c8: c8(), c9: c9() };
const safetyPass = ['c1', 'c2', 'c3'].every(k => checks[k].pass);
const lookPass = ['c5', 'c6', 'c7', 'c8', 'c9'].every(k => checks[k].pass);
console.log(JSON.stringify({ id, checks, safetyPass, lookPass }));
