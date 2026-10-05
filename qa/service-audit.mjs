// QA: সব কনভার্টার-সার্ভিসের একসাথে যাচাই — প্রতিটি নমুনা লেখা → স্বয়ংক্রিয় ধরন-শনাক্তকরণ + নির্ধারিত ধরনে
// FayzarExport.produce (ইউনিকোড docx / বিজয় docx / Word 2003 .doc) → Word-এ PDF → পাতার ছবি → গ্যালারি (index.html)।
// চালানো (localhost:3008 চালু): node qa/service-audit.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer';

const ROOT = path.resolve('.');
const OUT = path.resolve(process.argv[2] || 'service-audit');
fs.mkdirSync(OUT, { recursive: true });

const SAMPLES = [
  ['01', 'EXAM_CQ', 'সৃজনশীল প্রশ্নপত্র', 'tests/fixtures/cq-short.input.md'],
  ['02', 'EXAM_MCQ', 'বহুনির্বাচনি প্রশ্নপত্র', 'tests/fixtures/mcq-mixed-options.input.md'],
  ['03', 'EXAM_COMBINED', 'সমন্বিত (CQ+MCQ)', 'tests/fixtures/combined.input.md'],
  ['04', 'EXAM_MATH', 'গণিত প্রশ্নপত্র', 'tests/fixtures/math-equations.input.md'],
  ['05', 'EXAM_GENERAL', 'সাধারণ পরীক্ষা (বাংলা)', 'qa/samples/05-general-exam.md'],
  ['06', 'EXAM_GENERAL', 'সাধারণ পরীক্ষা (ইংরেজি)', 'qa/samples/06-english-exam.md'],
  ['07', 'STAMP_DEED', 'স্ট্যাম্প দলিল / হলফনামা', 'qa/samples/07-stamp-deed.md'],
  ['08', 'GOVT_APP', 'আবেদনপত্র', 'qa/samples/08-govt-application.md'],
  ['09', 'PROTTOYON', 'প্রত্যয়নপত্র', 'qa/samples/09-prottoyon.md'],
  ['10', 'ADMIT_CARD', 'প্রবেশপত্র', 'qa/samples/10-admit-card.md'],
  ['11', 'SALARY_SLIP', 'বেতন-স্লিপ', 'qa/samples/11-salary-slip.md'],
  ['12', 'ROUTINE', 'রুটিন', 'qa/samples/12-routine.md'],
  ['13', 'CV_RESUME', 'জীবনবৃত্তান্ত', 'qa/samples/13-cv.md'],
  ['14', 'OFFICE_PAD', 'অফিস প্যাড', 'qa/samples/14-office-pad.md'],
  ['15', 'OFFICIAL_NOTICE', 'নোটিশ / বিজ্ঞপ্তি', 'qa/samples/15-notice.md']
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 600000 });
const results = [];
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  for (const [id, type, label, file] of SAMPLES) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    errs.length = 0;
    const r = await page.evaluate(async (text, type) => {
      const body = text.replace(/^---[\s\S]*?---\s*/, '');
      let auto = null;
      try { const c = window.DocClassifier.classify(body); auto = c && (c.type || c.docType || c); } catch (e) { auto = 'ERR ' + e.message; }
      const enc = async (b) => { const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
      const files = {};
      for (const fmt of ['docx-unicode', 'docx-bijoy', 'doc']) {
        try { const res = await window.FayzarExport.produce(text, { format: fmt, docType: type }); files[fmt] = await enc(res.blob); }
        catch (e) { files[fmt] = 'ERR ' + (e && e.message || e); }
      }
      return { auto: typeof auto === 'object' ? JSON.stringify(auto) : String(auto), files };
    }, text, type);
    const rec = { id, type, label, auto: r.auto, errors: errs.slice(), files: {} };
    for (const [fmt, b64] of Object.entries(r.files)) {
      if (String(b64).startsWith('ERR')) { rec.files[fmt] = { error: b64 }; continue; }
      const name = `${id}-${type}-${fmt === 'doc' ? 'Word2003.doc' : (fmt === 'docx-bijoy' ? 'Bijoy.docx' : 'Unicode.docx')}`;
      fs.writeFileSync(path.join(OUT, name), Buffer.from(b64, 'base64'));
      rec.files[fmt] = { name };
    }
    results.push(rec);
    console.log(id, type, 'auto=', r.auto, Object.entries(rec.files).map(([k, v]) => k + ':' + (v.error ? 'ERR' : 'ok')).join(' '), errs.length ? 'PAGEERR ' + errs[0] : '');
  }
} finally { await browser.close(); }

// Word → PDF (.doc ও বিজয় docx) ও পাতা-সংখ্যা
for (const rec of results) {
  for (const fmt of ['doc', 'docx-bijoy']) {
    const f = rec.files[fmt];
    if (!f || f.error) continue;
    const pdf = path.join(OUT, f.name + '.pdf');
    try {
      const out = execFileSync('powershell', ['-File', 'qa/word-to-pdf.ps1', path.join(OUT, f.name), pdf], { encoding: 'utf8' });
      f.pages = Number((/pages=(\d+)/.exec(out) || [])[1] || 0);
      f.pdf = path.basename(pdf);
    } catch (e) { f.wordError = String(e.message || e).slice(0, 200); }
  }
}

// পাতার ছবি (PDF → PNG, প্রথম ৩ পাতা) — pdf.js দিয়ে
const b2 = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await b2.newPage();
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  for (const rec of results) {
    for (const fmt of ['doc', 'docx-bijoy']) {
      const f = rec.files[fmt];
      if (!f || !f.pdf) continue;
      const b64 = fs.readFileSync(path.join(OUT, f.pdf)).toString('base64');
      const imgs = await page.evaluate(async (b64) => {
        const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        const doc = await window.pdfjsLib.getDocument({ data: u }).promise;
        const out = [];
        for (let p = 1; p <= Math.min(3, doc.numPages); p++) {
          const pg = await doc.getPage(p); const vp = pg.getViewport({ scale: 1.2 });
          const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
          await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          out.push(c.toDataURL('image/png').split(',')[1]);
        }
        return out;
      }, b64);
      f.images = imgs.map((d, k) => { const n = `${f.name}-p${k + 1}.png`; fs.writeFileSync(path.join(OUT, n), Buffer.from(d, 'base64')); return n; });
    }
  }
} finally { await b2.close(); }

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));

// গ্যালারি
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cards = results.map((r) => {
  const d = r.files.doc || {}, b = r.files['docx-bijoy'] || {}, u = r.files['docx-unicode'] || {};
  const typeOk = String(r.auto).includes(r.type);
  const imgs = (d.images || b.images || []).map((n) => `<a href="${n}" target="_blank"><img src="${n}" loading="lazy"></a>`).join('');
  return `<section id="s${r.id}"><h2>${r.id}. ${esc(r.label)} <small>(${r.type})</small></h2>
<p class="meta">স্বয়ংক্রিয় শনাক্ত: <b class="${typeOk ? 'ok' : 'bad'}">${esc(r.auto)}</b>${typeOk ? '' : ' — নির্ধারিত ধরনের সাথে মেলেনি'} ·
.doc পাতা: ${d.pages || '—'} · বিজয় docx পাতা: ${b.pages || '—'}${r.errors.length ? ' · <b class="bad">ত্রুটি: ' + esc(r.errors[0]) + '</b>' : ''}</p>
<p class="dl">ডাউনলোড: ${d.name ? `<a href="${d.name}">Word 2003 .doc</a>` : '<b class="bad">.doc ব্যর্থ</b>'} · ${b.name ? `<a href="${b.name}">বিজয় .docx</a>` : '<b class="bad">বিজয় ব্যর্থ</b>'} · ${u.name ? `<a href="${u.name}">ইউনিকোড .docx</a>` : '<b class="bad">ইউনিকোড ব্যর্থ</b>'}</p>
<div class="pages">${imgs || '<i>ছবি নেই</i>'}</div></section>`;
}).join('\n');
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fayzar লেআউট প্রিভিউ</title><style>
body{font-family:'Kalpurush','SutonnyOMJ','Nirmala UI',sans-serif;margin:0;background:#f1f5f9;color:#0f172a}
header{background:#0f766e;color:#fff;padding:14px 20px} header h1{margin:0;font-size:20px} header p{margin:4px 0 0;font-size:13px;opacity:.9}
nav{padding:10px 20px;background:#fff;border-bottom:1px solid #cbd5e1;font-size:13px;line-height:1.9} nav a{margin-right:10px;color:#0f766e}
section{background:#fff;margin:16px 20px;padding:14px 18px;border-radius:12px;border:1px solid #e2e8f0}
h2{margin:0 0 6px;font-size:17px} small{color:#64748b;font-weight:400} .meta,.dl{font-size:13px;margin:4px 0}
.ok{color:#047857}.bad{color:#b91c1c} .pages{display:flex;gap:10px;overflow-x:auto;padding:8px 0}
.pages img{height:520px;border:1px solid #cbd5e1;box-shadow:0 1px 4px rgba(0,0,0,.08);background:#fff}
</style></head><body><header><h1>Fayzar — সব লেআউটের প্রিভিউ (কৃত্রিম নমুনা)</h1>
<p>প্রতিটি ধরনের Word 2003 .doc আউটপুটের পাতা (Word-এ খুলে PDF করা)। ছবিতে ক্লিক করলে বড় হবে। নিচের লিংকে আসল ফাইল।</p></header>
<nav>${results.map((r) => `<a href="#s${r.id}">${r.id}. ${esc(r.label)}</a>`).join('')}</nav>
${cards}</body></html>`);
console.log('gallery:', path.join(OUT, 'index.html'));
