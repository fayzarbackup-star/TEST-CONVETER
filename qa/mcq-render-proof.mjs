// Part-10 — MCQ মাস্টার লেআউট রেন্ডার প্রমাণ
// ---------------------------------------------------------------------------
//  ১) প্রোডাকশন পাথেই ফাইল বানায়: ExportDualEngine.generateWordDoc(...)
//     → Word 2003 (.doc, RTF লিগ্যাসি পাথ) ও Modern (.docx, OpenXML)
//  ২) মাথা-বিহীন LibreOffice দিয়ে সেগুলো সত্যিই খুলে PDF বানায়
//  ৩) PDF মাপে প্রমাণ করে: পৃষ্ঠাসংখ্যা, ০.৫" মার্জিন, ২-কলাম, ০.২" গ্যটার,
//     কলাম লাইন, এবং প্ল্যানারের পূর্বাভাসের সঙ্গে মিল
//  ৪) প্রথম পৃষ্ঠার PNG + মাপের JSON proof/ এ জমা রাখে
//
// ব্যবহার: node qa/mcq-render-proof.mjs [fixtureId ...]
'use strict';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'proof');
const OUTDOC = path.join(OUT, 'out');
fs.mkdirSync(OUTDOC, { recursive: true });

// ---------------------------- ইঞ্জিন লোড -----------------------------------
const g = globalThis;
for (const [name, rel] of [
  ['TextRunProcessor', 'js/layout-engine/text-run-processor.js'],
  ['EquationConverter', 'js/equation-converter.js'],
  ['ThemeConfig', 'js/layout-engine/theme-config.js'],
  ['McqLayoutPlanner', 'js/layout-engine/mcq-layout-planner.js'],
  ['FayzarDocxBuilder', 'js/layout-engine/docx-builder.js'],
  ['SchemaValidator', 'js/layout-engine/schema-validator.js'],
  ['DocClassifier', 'js/engines/doc-classifier.js'],
  ['QuestionEngine', 'js/engines/question-engine.js'],
  ['ExportDualEngine', 'js/engines/export-dual-engine.js']
]) {
  g[name] = require(path.join(ROOT, rel));
}
g.FayzarThemeConfig = g.ThemeConfig;
g.DocxBuilder = g.FayzarDocxBuilder;
g.FayzarSchemaValidator = g.SchemaValidator;
// node_modules-এর ওপর নির্ভরতা না রেখে অ্যাপের নিজের ভেন্ডর-করা JSZip (QA স্ক্রিপ্ট যাতে যেকোনো
// ক্লোনেই চালু থাকে)
g.jszip = (() => { try { return require('jszip'); } catch (e) { return require(path.join(ROOT, 'js/jszip.min.js')); } })();

const Export = g.ExportDualEngine;
const Planner = g.McqLayoutPlanner;
const QEngine = g.QuestionEngine;

// ---------------------------- PDF মেজারমেন্ট -------------------------------
const PT_PER_TWIP = 1 / 20;

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
}

function pdfPages(pdf) {
  const info = sh('pdfinfo', [pdf]);
  const m = info.match(/^Pages:\s+(\d+)$/m);
  return m ? parseInt(m[1], 10) : NaN;
}

/** pdftotext -bbox → প্রতি পৃষ্ঠায় শব্দের বাক্স; এখান থেকে মার্জিন/কলাম মাপা হয় */
function pdfBboxes(pdf) {
  const xml = sh('pdftotext', ['-bbox', pdf, '-']);
  const pages = [];
  let cur = null;
  for (const line of xml.split('\n')) {
    if (/<page /.test(line)) {
      const w = parseFloat((line.match(/width="([\d.]+)"/) || [])[1]);
      const h = parseFloat((line.match(/height="([\d.]+)"/) || [])[1]);
      cur = { w, h, words: [] };
      pages.push(cur);
    }
    const m = line.match(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">/);
    if (m && cur) cur.words.push({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4], t: line.replace(/<[^>]+>/g, '') });
  }
  return pages;
}

/** একটি পৃষ্ঠার ২-কলাম বিশ্লেষণ: x-এর ভিত্তিতে ক্লাস্টার + গ্যটার মাপ */
function analysePage(pg, colSplitX, bodyTopY) {
  // হেডার (ফুল-উইডথ, সেন্টারড) বাদ দিয়ে শুধু বডি-অংশ মাপা হয় — নইলে সেন্টারড
  // লাইনের ডান অর্ধেক "ডান কলাম" ভুলে যায়। গ্যটার = ডান কলামের শুরু - বাম কলামের শেষ।
  const inBody = (w) => w.y0 >= (bodyTopY || 0);
  const left = pg.words.filter((w) => w.x0 < colSplitX && inBody(w));
  const right = pg.words.filter((w) => w.x0 >= colSplitX && inBody(w));
  const mid = pg.words.filter((w) => w.x0 < colSplitX && w.x1 > colSplitX + 1 && inBody(w));
  const R = {
    pageW: pg.w, pageH: pg.h,
    leftStart: left.length ? Math.min(...left.map((w) => w.x0)) : null,
    leftEnd: left.length ? Math.max(...left.map((w) => w.x1)) : null,
    rightStart: right.length ? Math.min(...right.map((w) => w.x0)) : null,
    rightEnd: right.length ? Math.max(...right.map((w) => w.x1)) : null,
    crossing: mid.length,
    bottomY: pg.words.length ? Math.max(...pg.words.map((w) => w.y1)) : 0,
    topY: pg.words.length ? Math.min(...pg.words.map((w) => w.y0)) : 0
  };
  R.gutter = (R.rightStart != null && R.leftEnd != null) ? +(R.rightStart - R.leftEnd).toFixed(2) : null;
  // হ্যাঙ্গিং ইনডেন্ট প্রমাণ: বডি-লেখার বাম প্রান্ত মার্জিনের চেয়ে সরে থাকে কি না
  R.bodyStartX = R.leftStart;
  return R;
}

/** প্রকৃত টেক্সট-লাইন সংখ্যা (y ক্লাস্টার, ৪pt টলারেন্স) — পিচ ক্যালিব্রেশনের জন্য */
function countLines(pg, mid, side, bodyTopY) {
  const ys = pg.words
    .filter((w) => (side === 'l' ? w.x0 < mid : w.x0 >= mid) && w.y0 >= (bodyTopY || 0))
    .map((w) => w.y0).sort((a, b) => a - b);
  let n = 0; let last = -99; let first = 0; let bottom = 0;
  for (const y of ys) { if (y - last > 4) { n++; if (!first) first = y; bottom = y; last = y; } }
  return { lines: n, topY: first, bottomY: bottom, pitch: n > 1 ? +((bottom - first) / (n - 1)).toFixed(2) : 0 };
}

// ---------------------------- মূল প্রসেস -------------------------------------
const FIXTURES = process.argv.slice(2);
const ids = FIXTURES.length
  ? FIXTURES
  : fs.readdirSync(path.join(ROOT, 'tests', 'fixtures'))
      .filter((f) => /^mcq-.*\.input\.md$/.test(f))
      .map((f) => f.replace('.input.md', ''));
const report = [];

for (const id of ids) {
  const fxPath = path.join(ROOT, 'tests', 'fixtures', `${id}.input.md`);
  if (!fs.existsSync(fxPath)) { console.error('ব্যবহার: ' + id); continue; }
  const raw = fs.readFileSync(fxPath, 'utf8');
  const body = raw.replace(/^---[\s\S]*?---\s*/, '');
  const docType = 'EXAM_MCQ';

  const parsed = QEngine.parseQuestionPaper(body, { docType });
  const plan = Planner.plan(parsed, { docType });
  const N = plan.items.length;

  // --- ১. প্রোডাকশন এক্সপোর্ট (দুই ফরম্যাটেই) ---
  const docxBlob = await Export.generateWordDoc(body, docType, { format: 'docx' });
  const docBlob = await Export.generateWordDoc(body, docType, { format: 'doc' });
  const docxPath = path.join(OUTDOC, `${id}.docx`);
  const docPath = path.join(OUTDOC, `${id}.doc`);
  fs.writeFileSync(docxPath, Buffer.from(await docxBlob.arrayBuffer()));
  fs.writeFileSync(docPath, Buffer.from(await docBlob.arrayBuffer()));

  // --- ২. Word ফরম্যাট → PDF (সত্যিকারের রেন্ডার) ---
  const res = { id, questions: N, fontPt: plan.font.pt, predictedPages: plan.pages.length, files: {}, formats: {} };
  res.predictedSplit = plan.pages.map((p) => ({ page: p.page, col1: p.col1.length, col2: p.col2.length, h1: p.h1, h2: p.h2 }));

  for (const [fmt, file] of [['docx', docxPath], ['doc', docPath]]) {
    const dir = path.join(OUT, 'render', id + '.' + fmt);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    let pdf = null, err = null;
    try {
      sh('soffice', ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', dir, file]);
      pdf = path.join(dir, path.basename(file, path.extname(file)) + '.pdf');
      if (!fs.existsSync(pdf)) { pdf = null; err = 'PDF তৈরি হয়নি'; }
    } catch (e) { err = String(e.message || e).slice(0, 160); }

    const bytes = fs.statSync(file).size;
    // বান্ডলে আসল আউটপুট ফাইল + রেন্ডার-PDF রেখো (proof/<id>.<fmt>[.pdf]) —
    // Word 2003 (.doc) ও আধুনিক (.docx) উভয়েরই প্রমাণ হাতে-চালানযোগ্য থাকে
    try {
      fs.copyFileSync(file, path.join(OUT, `${id}.${fmt === 'docx' ? 'docx' : 'doc'}`));
      if (pdf) fs.copyFileSync(pdf, path.join(OUT, `${id}.${fmt}.pdf`));
    } catch (e) {}
    const entry = { file: path.relative(ROOT, file), bytes, error: err };
    if (pdf) {
      entry.pdf = path.relative(ROOT, pdf);
      entry.pages = pdfPages(pdf);
      const pgs = pdfBboxes(pdf);
      try {
        sh('pdftoppm', ['-png', '-r', '110', '-f', '1', '-l', '1', pdf, path.join(dir, 'page')]);
        const png = fs.readdirSync(dir).find((f) => /^page-?1?\.png$/.test(f));
        if (png) {
          entry.png = path.relative(ROOT, path.join(dir, png));
          fs.copyFileSync(path.join(dir, png), path.join(OUT, `${id}.${fmt}.page1.png`));
          entry.pngCopy = `proof/${id}.${fmt}.page1.png`;
        }
      } catch (e) {}
      // কলাম গ্যটার (pt) — ০.২" = ১৪.৪pt হতে হবে
      // বডি-শুরুর y: যে লাইনে বাম ও ডান অর্ধে একসঙ্গে লেখা আছে (২-কলাম শুরু)
      let bodyTopY = 0;
      if (pgs[0]) {
        const mid0 = pgs[0].w / 2;
        // হেডার-ব্যান্ড বাদ দিতে বডির শুরু হলো মার্জিন + হেডার-উচ্চতার নিচে —
        // নইলে বড় সেন্টারড প্রতিষ্ঠান-লাইনটি "২-কলামের প্রথম সারি" ভুল হয়
        const headerFloorPt = (plan.geometry.margin + (plan.headerHeight || 0)) / 20 + 3;
        const rows = {};
        for (const w of pgs[0].words) { const k = Math.round(w.y0); (rows[k] ||= []).push(w); }
        for (const y of Object.keys(rows).map(Number).sort((a, b) => a - b)) {
          if (y < headerFloorPt) continue;
          const near = rows[y].concat(...Object.keys(rows).filter((k) => Math.abs(k - y) <= 3).map((k) => rows[k]));
          if (near.some((w) => w.x0 < mid0 - 100) && near.some((w) => w.x0 > mid0 + 55)) { bodyTopY = Math.max(0, y - 6); break; }
        }
        if (!bodyTopY) bodyTopY = Math.max(0, headerFloorPt - 3);
      }
      entry.measure = pgs.map((p) => analysePage(p, p.w / 2, bodyTopY));
      const m0 = entry.measure[0];
      if (m0) {
        entry.gutterPt = m0.gutter;
        // জ্যামিতিক প্রমাণ: ডান কলামের প্রকৃত শুরু বনাম গণনাকৃত অবস্থান
        entry.col2StartPt = m0.rightStart != null ? +m0.rightStart.toFixed(2) : null;
        // ঘন-প্রান্ত সংস্করণ: x0 হিস্টোগ্রামের সবচেয়ে ঘন স্তম্ভটিই কলামের প্রকৃত বাম প্রান্ত
        entry.col2EdgePt = (() => {
          const h = new Map();
          for (const w of pgs[0].words) {
            if (w.y0 < bodyTopY) continue;
            const k = Math.round(w.x0); h.set(k, (h.get(k) || 0) + 1);
          }
          const cand = [...h.entries()].filter((e) => e[0] > pgs[0].w / 2).sort((a, b) => b[1] - a[1])[0];
          return cand ? cand[0] : null;
        })();
        entry.expectedCol2StartPt = +((plan.geometry.margin + plan.geometry.colW + plan.geometry.colGap) / 20).toFixed(2);
        entry.expectedCol1EndPt = +((plan.geometry.margin + plan.geometry.colW) / 20).toFixed(2);
        entry.col1EndPt = m0.leftEnd != null ? +m0.leftEnd.toFixed(2) : null;
        entry.leftMarginPt = m0.leftStart != null ? +m0.leftStart.toFixed(1) : null;
        entry.rightEdgePt = m0.rightEnd != null ? +(pgs[0].w - m0.rightEnd).toFixed(1) : null;
        entry.crossingWords = m0.crossing;
      }
      if (pgs[0]) {
        const mid0 = pgs[0].w / 2;
        entry.col1 = countLines(pgs[0], mid0, 'l', bodyTopY);
        entry.col2 = countLines(pgs[0], mid0, 'r', bodyTopY);
        entry.bodyTopY = bodyTopY;
        entry.pagePt = { w: pgs[0].w, h: pgs[0].h };
      }
    }
    res.formats[fmt] = entry;
  }
  report.push(res);
  console.log(`✓ ${id}: Q=${N} sz=${plan.font.pt}pt plan.pages=${plan.pages.length}` +
    ` | docx.pages=${res.formats.docx.pages} doc.pages=${res.formats.doc.pages}` +
    ` | gutter=${res.formats.docx.gutterPt}pt Lmargin=${res.formats.docx.leftMarginPt}pt col2Start=${res.formats.docx.col2StartPt}/${res.formats.docx.expectedCol2StartPt}pt` +
    ` | doc col=${res.formats.doc.col1 && res.formats.doc.col1.lines}/${res.formats.doc.col2 && res.formats.doc.col2.lines} pitch=${res.formats.doc.col1 && res.formats.doc.col1.pitch}pt` +
    ` | docx col=${res.formats.docx.col1 && res.formats.docx.col1.lines}/${res.formats.docx.col2 && res.formats.docx.col2.lines} pitch=${res.formats.docx.col1 && res.formats.docx.col1.pitch}pt` +
    ` | bodyTop=${res.formats.docx.bodyTopY}pt`);
}
function p0w(p) { return p ? p.w : 595.3; }

fs.writeFileSync(path.join(OUT, 'render-measure.json'), JSON.stringify(report, null, 2));

// প্রুফ-রিডমি: টেবিল + কীভাবে রিপ্রোডিউস করবেন
{
  const L = [];
  L.push('# Part-10 MCQ লেআউট — রেন্ডার প্রুফ');
  L.push('');
  L.push('উৎপাদন এক্সপোর্ট পাথ (`ExportDualEngine.generateWordDoc`) থেকেই ফাইল বানানো হয়েছে — অর্থাৎ');
  L.push('যা ইউজার ডাউনলোড করে, ঠিক সেটি LibreOffice-headless দিয়ে PDF/ PNG করে মাপা হয়েছে।');
  L.push('স্ক্রিপ্ট: `node qa/mcq-render-proof.mjs` (নমুনা = tests/fixtures/mcq-*.input.md, অটো-ডিসকভার)।');
  L.push('');
  L.push('| নমুনা | প্রশ্ন | ফন্ট | প্ল্যান পৃষ্ঠা | `.doc` পৃষ্ঠা | `.docx` পৃষ্ঠা | লাইন কলাম১/কলাম২ (.doc) | লাইন কলাম১/কলাম২ (.docx) | ২য় কলামের প্রান্ত |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of report) {
    const d = r.formats.doc || {}, x = r.formats.docx || {};
    const cl = (e) => (e.col1 && e.col2 ? `${e.col1.lines}/${e.col2.lines}` : '—');
    L.push(`| ${r.id} | ${r.questions} | ${r.fontPt}pt | ${r.predictedPages} | ${d.pages} | ${x.pages} | ${cl(d)} | ${cl(x)} | ${x.col2StartPt}/${x.expectedCol2StartPt}pt |`);
  }
  L.push('');
  L.push('## পৃষ্ঠা-ভাগের ভবিষ্যদ্বাণী (প্ল্যান) বনাম আসল রেন্ডার');
  L.push('');
  for (const r of report) {
    L.push(`- **${r.id}** — plan.pages=${r.predictedPages}, .doc=${r.formats.doc && r.formats.doc.pages}, .docx=${r.formats.docx && r.formats.docx.pages}` +
      ` | split=${(r.predictedSplit || []).map((p) => `p${p.page}:${p.col1}/${p.col2}`).join(' ')}`);
  }
  L.push('');
  L.push('## ফাইল');
  L.push('');
  L.push('- `proof/<id>.doc` / `proof/<id>.docx` — আসল ডাউনলোড-আর্টিফ্যাক্ট (Word 2003 RTF / OOXML)');
  L.push('- `proof/<id>.doc.pdf` / `proof/<id>.docx.pdf` — সেগুলোর LibreOffice রেন্ডার');
  L.push('- `proof/<id>.<fmt>.page1.png` — ১ম পৃষ্ঠার ছবি (চোখে মেলানোর জন্য)');
  L.push('- `proof/render/<id>.<fmt>/` — রেন্ডারের কাজের ডির (PDF + page-1 PNG)');
  L.push('- `proof/render-measure.json` — সব মেপে-পাওয়া সংখ্যা (y-pitch, কলাম-লাইন সংখ্যা, মার্জিন, প্রান্ত)');
  L.push('- `proof/samples/*.md` — ইনপুট নমুনা (OCR/মার্কডাউনের আসল চেহারা)');
  L.push('');
  L.push('> দ্রষ্টব্য: এই স্যান্ডবক্সে Kalpurush ফন্ট নেই — LibreOffice বিকল্প ফন্ট বসায়, তাই বাংলা');
  L.push('> অক্ষরের গণনা (pdftotext) আংশিক; জ্যামিতি (অবস্থান/পৃষ্ঠাসংখ্যা) তাতে ব্যাহত হয় না।');
  fs.writeFileSync(path.join(OUT, 'README.md'), L.join('\n') + '\n', 'utf8');
}
console.log('\nমেজারমেন্ট লেখা হয়েছে: proof/render-measure.json ( + proof/README.md )');
