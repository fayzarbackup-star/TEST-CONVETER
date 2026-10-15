// নির্ণয় (নতুন রান ছাড়া): ছকের প্রতিটি সারিতে Word আমাদের trHeight-এর ওপর কত বাড়তি যোগ করে।
// .docx-এর <w:trHeight> (মান, exact/atLeast) বনাম out.raw.json-এর Word-সারি-উচ্চতা (পরের সারির শুরু − এই সারির শুরু)।
// চালানো: node qa/golden/row-overhead.mjs [id,id…]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AD = path.join(ROOT, 'qa/golden-data/asis');
const arg = process.argv[2];
const ids = arg ? arg.split(',') : fs.readdirSync(AD).filter((d) => fs.existsSync(path.join(AD, d, 'out.raw.json')) && fs.existsSync(path.join(AD, d, 'faithful_docx-unicode.docx')));

// docx থেকে document.xml (PowerShell-এর zip দিয়ে — বাড়তি প্যাকেজ লাগে না)
function docXml(file) {
  const ps = `Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${file.replace(/'/g, "''")}'); $e=$z.GetEntry('word/document.xml'); $r=New-Object IO.StreamReader($e.Open()); [Console]::OutputEncoding=[Text.Encoding]::UTF8; $r.ReadToEnd(); $z.Dispose()`;
  return execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}
// শীর্ষ-স্তরের ছক (ভেতরের ছক বাদ) → সারির trHeight
function topTables(xml) {
  const out = []; let depth = 0, cur = null;
  const re = /<w:tbl>|<\/w:tbl>|<w:tr>|<w:trHeight w:val="(\d+)" w:hRule="(\w+)"\/>|<w:tcBorders>|<w:sz w:val="(\d+)"/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[0] === '<w:tbl>') { depth++; if (depth === 1) { cur = { rows: [] }; out.push(cur); } }
    else if (m[0] === '</w:tbl>') depth--;
    else if (m[0] === '<w:tr>' && depth === 1) cur.rows.push({ h: null, rule: null });
    else if (m[1] && depth === 1 && cur.rows.length) { const r = cur.rows[cur.rows.length - 1]; r.h = +m[1] / 20; r.rule = m[2]; }
    else if (m[3] && depth === 1 && cur.rows.length) { const r = cur.rows[cur.rows.length - 1]; r.sz = Math.max(r.sz || 0, +m[3]); }
  }
  return out;
}

const all = { exact: [], atLeast: [] }, per = {};
for (const id of ids) {
  let raw, xml;
  try { raw = JSON.parse(fs.readFileSync(path.join(AD, id, 'out.raw.json'), 'utf8').replace(/^﻿/, '')); xml = docXml(path.join(AD, id, 'faithful_docx-unicode.docx')); } catch { continue; }
  const X = topTables(xml), W = (raw.tables || []).filter((t) => !t.nested);
  X.forEach((xt, ti) => {
    const w = W[ti];
    if (!w || w.rows !== xt.rows.length) return;
    const top = {}, pg = {};
    w.cells.forEach((c) => { if (top[c.row] == null || c.y < top[c.row]) { top[c.row] = c.y; pg[c.row] = c.page; } });
    for (let r = 1; r < xt.rows.length; r++) {
      const x = xt.rows[r - 1];
      if (!x.h || top[r] == null || top[r + 1] == null || pg[r] !== pg[r + 1]) continue;
      const d = top[r + 1] - top[r] - x.h;
      (all[x.rule] || (all[x.rule] = [])).push(d);
      const p = (per[id] = per[id] || { n: 0, sum: 0, pos: 0 }); p.n++; p.sum += d; if (d > 1) p.pos++;
    }
  });
}
const q = (a, f) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(2) : '-'; };
for (const [k, a] of Object.entries(all)) if (a.length) console.log(`${k}: ${a.length} সারি | Word − trHeight: p10 ${q(a, 0.1)} মধ্যমা ${q(a, 0.5)} p90 ${q(a, 0.9)} | >১pt ${a.filter((v) => v > 1).length}`);
console.log('ফাইল (গড় বাড়তি/সারি, >১pt সারি): ' + Object.entries(per).sort((a, b) => b[1].sum / b[1].n - a[1].sum / a[1].n).map(([k, v]) => `${k} ${(v.sum / v.n).toFixed(2)} (${v.pos}/${v.n})`).join(', '));
