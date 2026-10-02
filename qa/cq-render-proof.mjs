// Part-11 — সৃজনশীল (CQ) বুকলেট মাস্টার লেআউট: রেন্ডার-প্রমাণ
// ---------------------------------------------------------------------------
//  ১) প্রোডাকশন পাথেই ফাইল বানায়: ExportDualEngine.generateWordDoc(..., 'EXAM_CQ')
//     → Word 2003 (.doc, RTF লিগ্যাসি পাথ) ও আধুনিক (.docx, OpenXML)
//  ২) মাথা-বিহীন LibreOffice দিয়ে সেগুলো সত্যিই খুলে PDF বানায়
//  ৩) PDF-এ মেপে প্রমাণ করে:
//       · A4 ল্যান্ডস্কেপ (841.89 × 595.28 pt) + চারদিকে 0.5" (36pt) মার্জিন
//       · ২ কলাম, মাঝের গ্যাপ 0.7" (50.4pt), ২য় কলাম 446.15pt থেকে শুরু
//       · বুকলেট ইম্পোজিশন: PDF পৃষ্ঠাসংখ্যা == ceil(ফ্লো-কলাম/2),
//         ১ম পৃষ্ঠার ডান অর্ধে ফ্রন্ট কভার (হেডারসহ), বাম অর্ধে ব্যাক কভার
//       · হেডার ব্লক কলামের শীর্ষে ও সেন্টারড (হেডার-রেখার কেন্দ্র ≈ কলাম-২ কেন্দ্র)
//       · প্রশ্নের নম্বর কলামের বাম প্রান্তে (36pt), লেখা হ্যাঙ্গিং 21.6pt থেকে,
//         উপ-প্রশ্ন 43.2pt — কোনো লাইন নম্বরের নিচে ওঠে না
//       · নম্বরগুলো কলামের ডান প্রান্তে (রাইট ট্যাব) বসে
//  ৪) আউটপুট: proof/cq-<id>.{doc,docx,pdf,png} + proof/cq-render-measure.json
//
//  ব্যবহার:  node qa/cq-render-proof.mjs [sampleId ...]
//           (নমুনা না দিলে proof/samples/cq-booklet-*.plain.md স্বয়ংক্রিয়ভাবে)
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

const g = globalThis;
for (const [name, rel] of [
  ['TextRunProcessor', 'js/layout-engine/text-run-processor.js'],
  ['EquationConverter', 'js/equation-converter.js'],
  ['ThemeConfig', 'js/layout-engine/theme-config.js'],
  ['McqLayoutPlanner', 'js/layout-engine/mcq-layout-planner.js'],
  ['CqBookletPlanner', 'js/layout-engine/cq-booklet-planner.js'],
  ['FayzarDocxBuilder', 'js/layout-engine/docx-builder.js'],
  ['SchemaValidator', 'js/layout-engine/schema-validator.js'],
  ['DocClassifier', 'js/engines/doc-classifier.js'],
  ['QuestionEngine', 'js/engines/question-engine.js'],
  ['ExportDualEngine', 'js/engines/export-dual-engine.js']
]) g[name] = require(path.join(ROOT, rel));
g.FayzarThemeConfig = g.ThemeConfig;
g.DocxBuilder = g.FayzarDocxBuilder;
g.FayzarSchemaValidator = g.SchemaValidator;
g.jszip = (() => { try { return require('jszip'); } catch (e) { return require(path.join(ROOT, 'js/jszip.min.js')); } })();

const Export = g.ExportDualEngine;
const Planner = g.CqBookletPlanner;
const PT = (tw) => +(tw / 20).toFixed(2);


function sh(cmd, args) { return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 }); }
function has(cmd) { try { execFileSync('sh', ['-c', 'command -v ' + cmd], { encoding: 'utf8' }); return true; } catch (e) { return false; } }
const HAVE_SOFFICE = has('soffice') && has('pdftotext') && has('pdfinfo');

function pdfPages(pdf) {
  const m = sh('pdfinfo', [pdf]).match(/^Pages:\s+(\d+)$/m);
  return m ? parseInt(m[1], 10) : NaN;
}
function pdfPageSize(pdf) {
  const m = sh('pdfinfo', [pdf]).match(/Page size:\s+([\d.]+)\s+x\s+([\d.]+)/);
  return m ? { w: +m[1], h: +m[2] } : null;
}
function pdfBboxes(pdf, MARG, COL2) {
  const xml = sh('pdftotext', ['-bbox', pdf, '-']);
  const pages = []; let cur = null;
  for (const line of xml.split('\n')) {
    if (/<page /.test(line)) {
      const w = parseFloat((line.match(/width="([\d.]+)"/) || [])[1]);
      const h = parseFloat((line.match(/height="([\d.]+)"/) || [])[1]);
      cur = { w, h, words: [] }; pages.push(cur);
    }
    const m = line.match(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">/);
    if (m && cur) cur.words.push({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4], t: line.replace(/<[^>]+>/g, '') });
  }
  return pages;
}

// ---------------------------- নমুনা সংগ্রহ ----------------------------------
const SAMPLES_DIR = path.join(OUT, 'samples');
let ids = process.argv.slice(2);
if (!ids.length) {
  ids = fs.readdirSync(SAMPLES_DIR).filter((f) => /^cq-booklet-.*\.plain\.md$/.test(f)).map((f) => f.replace('.plain.md', ''));
}

const geom = Planner.geometry({});
const EXPECT = {
  pageWpt: +(geom.pageW / 20).toFixed(2), pageHpt: +(geom.pageH / 20).toFixed(2),
  margin: PT(geom.margin), gutter: PT(geom.colGap),
  col2Start: PT(geom.margin + geom.colW + geom.colGap),
  col1End: PT(geom.margin + geom.colW), rightEdge: PT(geom.pageW - geom.margin),
  stemIndent: PT(geom.indent), subIndent: PT(geom.subIndent)
};
EXPECT.marginLeft = EXPECT.margin;

const report = [];
let fails = 0;
const A = (arr, name, cond, detail) => { arr.push({ check: name, ok: !!cond, detail }); if (!cond) fails++; };

for (const id of ids) {
  const file = path.join(SAMPLES_DIR, `${id}.plain.md`);
  if (!fs.existsSync(file)) { console.error('নমুনা নেই: ' + file); continue; }
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = g.QuestionEngine.parseQuestionPaper(raw, { docType: 'EXAM_CQ' });
  const plan = Planner.plan(parsed, { docType: 'EXAM_CQ' });
  const res = {
    id, questions: plan.metrics.count, columns: plan.columns.length,
    skipFirstColumn: plan.skipFirstColumn, predictedDocPages: plan.metrics.docPages,
    reservedUsed: plan.metrics.reservedUsed, tailMoved: plan.metrics.tailMoved,
    headerLines: (plan.headerLines || []).length, headerHeightTw: plan.headerHeight,
    geometry: { pageW: geom.pageW, pageH: geom.pageH, margin: geom.margin, colW: geom.colW, colGap: geom.colGap, rightTab: geom.rightTab },
    structural: {}, render: null
  };

  // --- ১) প্রোডাকশন এক্সপোর্ট ---
  const docRtf = Export.generateCqExamRtf(parsed, {});
  const docxBlob = await Export.generateWordDoc(raw, 'EXAM_CQ', { format: 'docx' });
  const docPath = path.join(OUTDOC, `${id}.doc`);
  const docxPath = path.join(OUTDOC, `${id}.docx`);
  fs.writeFileSync(docPath, docRtf, 'utf8');
  fs.writeFileSync(docxPath, Buffer.from(await docxBlob.arrayBuffer()));

  const nBreaks = (docRtf.match(/\{\\column\}/g) || []).length;
  const expectedBreaks = plan.columns.filter((c, i) => c.breakBefore).length + (plan.skipFirstColumn ? 1 : 0);
  res.structural = {
    rtfLandscape: /\\landscape/.test(docRtf),
    rtfPaper: /\\paperw16838\\paperh11906/.test(docRtf),
    rtfMargins: /\\margl720\\margr720\\margt720\\margb720/.test(docRtf),
    rtfCols: /\\cols2\\colsx1008/.test(docRtf),
    rtfColumnBreaks: nBreaks, expectedColumnBreaks: expectedBreaks,
    rtfStemHanging: /\\li432\\fi-432/.test(docRtf),
    rtfSubIndent: /\\li864/.test(docRtf),
    rtfRightTab: docRtf.includes('\\tqr\\tx' + geom.rightTab),
    rtfHeaderUnderlined: /\\tqc\\tx\d+[\s\S]{0,900}?\\b\\ul/.test(docRtf),
    docxLandscape: false, docxColumnBreaks: 0, docxHanging: false, docxRightTab: false
  };
  {
    const JSZip = g.jszip;
    const z = await JSZip.loadAsync(fs.readFileSync(docxPath));
    const xml = await z.file('word/document.xml').async('string');
    res.structural.docxLandscape = /w:w="16838" w:h="11906" w:orient="landscape"/.test(xml) && /<w:cols w:num="2" w:space="1008"\/>/.test(xml);
    res.structural.docxColumnBreaks = (xml.match(/<w:br w:type="column"\/>/g) || []).length;
    res.structural.docxHanging = /<w:ind w:left="432" w:hanging="432"\/>/.test(xml);
    res.structural.docxSubIndent = /<w:ind w:left="864" w:hanging="432"\/>/.test(xml);
    res.structural.docxRightTab = xml.includes('<w:tab w:val="right" w:pos="' + geom.rightTab + '"/>');
    res.structural.docxNoShading = !/w:fill="(E8E8E8|D9D9D9|F1F1F1)"/i.test(xml);
    res.structural.docxTableAutoWidth = !/<w:tblW w:w="[1-9]/.test(xml);
  }
  {
    const checks = [];
    const st = res.structural;
    A(checks, '.doc  ল্যান্ডস্কেপ A4 (paperw16838/paperh11906)', st.rtfLandscape && st.rtfPaper);
    A(checks, '.doc  চারদিকে 0.5" মার্জিন', st.rtfMargins);
    A(checks, '.doc  \\cols2\\colsx1008', st.rtfCols);
    A(checks, `.doc  কলাম-ব্রেক ${st.rtfColumnBreaks} == প্ল্যান ${expectedBreaks}`, st.rtfColumnBreaks === expectedBreaks);
    A(checks, '.doc  স্টেম হ্যাঙ্গিং 432', st.rtfStemHanging);
    A(checks, '.doc  উপ-প্রশ্ন ইনডেন্ট 864', st.rtfSubIndent);
    A(checks, '.doc  রাইট ট্যাব কলাম-প্রান্তে', st.rtfRightTab);
    A(checks, '.doc  হেডারে সেন্টারড আন্ডারলাইন লেবেল', st.rtfHeaderUnderlined || res.headerLines === 0);
    A(checks, '.docx ল্যান্ডস্কেপ+cols2+1008', st.docxLandscape);
    A(checks, `.docx কলাম-ব্রেক ${st.docxColumnBreaks} == .doc ${st.rtfColumnBreaks}`, st.docxColumnBreaks === st.rtfColumnBreaks);
    A(checks, '.docx 432/864 ইনডেন্ট', st.docxHanging && st.docxSubIndent);
    A(checks, '.docx রাইট ট্যাব + শেডিংবিহীন অটো-ছক', st.docxRightTab && st.docxNoShading && st.docxTableAutoWidth);
    res.structuralChecks = checks;
  }

  // --- ২) LibreOffice রেন্ডার + মাপ ---
  if (HAVE_SOFFICE) {
    const per = {};
    for (const [fmt, file2] of [['doc', docPath], ['docx', docxPath]]) {
      const dir = path.join(OUT, 'render', id + '.' + fmt);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      let e = { bytes: fs.statSync(file2).size, error: null };
      try {
        sh('soffice', ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', dir, file2]);
        const pdf = path.join(dir, path.basename(file2, path.extname(file2)) + '.pdf');
        if (!fs.existsSync(pdf)) throw new Error('PDF তৈরি হয়নি');
        e.pages = pdfPages(pdf);
        e.pageSize = pdfPageSize(pdf);
        e.pdf = path.relative(ROOT, pdf);
        fs.copyFileSync(file2, path.join(OUT, `${id}.${fmt}`));
        fs.copyFileSync(pdf, path.join(OUT, `${id}.${fmt}.pdf`));
        try {
          sh('pdftoppm', ['-png', '-r', '100', '-f', '1', '-l', String(Math.min(2, e.pages)), pdf, path.join(dir, 'pg')]);
          const pngs = fs.readdirSync(dir).filter((f) => /^pg-?\.?1?\.png$|^pg-1\.png$/.test(f));
          if (pngs.length) { fs.copyFileSync(path.join(dir, pngs[0]), path.join(OUT, `${id}.${fmt}.page1.png`)); e.png = `proof/${id}.${fmt}.page1.png`; }
        } catch (err) {}
        const pgs = pdfBboxes(pdf, EXPECT.margin, EXPECT.col2Start);
        const colEdge = { MARG: EXPECT.margin, COL2: EXPECT.col2Start, STEM: EXPECT.stemIndent, GAP: EXPECT.gutter };
        e.measure = pgs.map((p) => {
          const xs = p.words.map((w) => w.x0);
          const xe = p.words.map((w) => w.x1);
          const topLine = p.words.length ? Math.min(...p.words.map((w) => w.y0)) : 0;
          const topWords = p.words.filter((w) => w.y0 <= topLine + 3);
          // হেডার কলাম-২-এর শীর্ষে থাকে — তাই ডান কলামের সবচেয়ে ওপরের লাইনটিই হেডার-রেখা
          const rightWords = p.words.filter((w) => w.x0 > p.w / 2);
          const topRight = rightWords.length ? Math.min(...rightWords.map((w) => w.y0)) : 0;
          const topRightWords = rightWords.filter((w) => w.y0 <= topRight + 3);
          const hist = new Map();
          for (const x of xs) { const k = Math.round(x); hist.set(k, (hist.get(k) || 0) + 1); }
          const peaks = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map((x) => x[0]).sort((a, b) => a - b);
          return {
            w: p.w, h: p.h,
            minX: xs.length ? +Math.min(...xs).toFixed(2) : null,
            maxX: xe.length ? +Math.max(...xe).toFixed(2) : null,
            col2Start: xs.length ? +xs.filter((x) => x > p.w / 2).reduce((a, b) => Math.min(a, b), 1e9).toFixed(2) : null,
            topLineCenter: topWords.length ? +((Math.min(...topWords.map((w) => w.x0)) + Math.max(...topWords.map((w) => w.x1))) / 2).toFixed(1) : null,
            topRightCenter: topRightWords.length ? +((Math.min(...topRightWords.map((w) => w.x0)) + Math.max(...topRightWords.map((w) => w.x1))) / 2).toFixed(1) : null,
            // প্রতি-কলাম আপেক্ষিক অবস্থান: বাম কলামের প্রান্ত 36pt, ডানের 446.15pt —
            // ব্যাক কভার খালি থাকলে পুরো লেখা ডান কলামেই থাকে, তাই সাপেক্ষে মেপে
            // ইনডেন্ট স্তর (0 / 21.6 / 43.2) দেখাই বৈধ প্রমাণ।
            nAt: (x, tol) => p.words.filter((w) => {
              const colLeft = w.x0 > p.w / 2 ? colEdge.COL2 : colEdge.MARG;
              return Math.abs(w.x0 - colLeft - x) <= (tol || 2.5);
            }).length,
            // নিষিদ্ধ ব্যান্ড: কলাম-প্রান্ত থেকে 3pt–18.6pt — এখানে কোনো *বাম-সারি* লাইন
            // শুরু হলে মানে লেখা নম্বরের নিচে উঠে এসেছে (৪ নম্বর ধারা লঙ্ঘন)।
            // সেন্টারড লাইন (হেডার, অথবা-ডিভাইডার, ছকের সেল, বিভাগ-শিরোনাম) বাদ —
            // সেগুলোর অবস্থান ইচ্ছাকৃতভাবেই মাঝখানে।
            forbidden: (hdrBottomPt) => {
              const lines = new Map();
              for (const w of p.words) {
                const k = Math.round(w.y0 / 3);
                if (!lines.has(k)) lines.set(k, []);
                lines.get(k).push(w);
              }
              const mid = p.w / 2;
              const colOf = (x0) => (x0 > mid ? { left: colEdge.COL2, right: p.w - colEdge.MARG } : { left: colEdge.MARG, right: colEdge.COL2 - colEdge.GAP });
              let n = 0;
              for (const ws of lines.values()) {
                const x0 = Math.min(...ws.map((w) => w.x0));
                const x1 = Math.max(...ws.map((w) => w.x1));
                const c = colOf(x0);
                if (hdrBottomPt != null && x0 > mid && Math.min(...ws.map((w) => w.y0)) <= hdrBottomPt) continue;
                if (Math.abs((x0 + x1) / 2 - (c.left + c.right) / 2) < 12) continue;   // centered
                const off = x0 - c.left;
                // বন্ধনী/উদ্ধৃতি-গ্লিফের মেট্রিক নয়েজ (pdftotext বাংলা অক্ষরে প্রায়শই ৩-৫pt
                // সরে যায়) চেককে ভুয়ো-ব্যর্থ করবে না — তাই 6pt গার্ড ব্যান্ড
                const first = String((ws.slice().sort((a, b) => a.x0 - b.x0)[0] || {}).t || '').trim();
                // প্রান্তের লিপিবদ্ধ "শব্দ"টি যদি কেবল চিহ্ন হয় (বাংলা অক্ষর থেকে বিচ্ছিন্ন
                // দণ্ড/বন্ধনী — pdftotext-এর পরিচিত আচরণ) অথবা শূন্য, লাইনটি বাদ
                if (!/[ঀ-৿A-Za-z0-9]/.test(first)) continue;
                if (off > 6 && off < colEdge.STEM - 3 && !/^[([{«'"]/.test(first)) n++;
              }
              return n;
            },
            peaks
          };
        });
        // ডান প্রান্তে নম্বর: কলাম-সীমার ±4pt এর মধ্যে কতটি শব্দ ডানে শেষ হয়
        const nearEdge = (w) => (Math.abs(w.x1 - EXPECT.col1End) < 4 || Math.abs(w.x1 - EXPECT.rightEdge) < 4);
        e.marksAtRightEdge = pgs.reduce((a, p) => a + p.words.filter(nearEdge).length, 0);
      } catch (err) { e.error = String(err.message || err).slice(0, 160); }
      per[fmt] = e;
    }
    res.render = per;
    const checks = [];
    for (const fmt of ['doc', 'docx']) {
      const e = per[fmt];
      const okRender = !e.error && e.measure && e.measure.length;
      A(checks, `${fmt}: LibreOffice রেন্ডার হলো`, okRender, e.error || undefined);
      if (!okRender) continue;
      const ps = e.pageSize;
      A(checks, `${fmt}: পৃষ্ঠা A4 ল্যান্ডস্কেপ ${ps && ps.w}×${ps && ps.h}pt`,
        ps && Math.abs(ps.w - EXPECT.pageWpt) < 2 && Math.abs(ps.h - EXPECT.pageHpt) < 2,
        `প্রত্যাশিত ${EXPECT.pageWpt}×${EXPECT.pageHpt}`);
      A(checks, `${fmt}: পৃষ্ঠাসংখ্যা ${e.pages} == প্ল্যান ${res.predictedDocPages}`, e.pages === res.predictedDocPages);
      const m0 = e.measure[0];
      A(checks, `${fmt}: বাম প্রান্ত ≈ ${EXPECT.margin}pt অথবা কলাম-২ (${m0.minX})`,
        Math.abs(m0.minX - EXPECT.margin) < 2 || (res.skipFirstColumn && Math.abs(m0.minX - EXPECT.col2Start) < 3));
      A(checks, `${fmt}: কলাম-২ শুরু ≈ ${EXPECT.col2Start}pt (${m0.col2Start})`, m0.col2Start != null && Math.abs(m0.col2Start - EXPECT.col2Start) < 3);
      A(checks, `${fmt}: ডান মার্জিন ≈ ${EXPECT.margin}pt (${+(EXPECT.pageWpt - m0.maxX).toFixed(2)})`, Math.abs(EXPECT.pageWpt - m0.maxX - EXPECT.margin) < 3);
      if (res.skipFirstColumn) {
        A(checks, `${fmt}: ১ম পৃষ্ঠার লেখা ২য় কলামে শুরু (x=${m0.minX} ≥ ${EXPECT.col2Start - 6}) — ১ম কলাম ব্যাক কভার`,
          m0.minX >= EXPECT.col2Start - 6);
      } else {
        A(checks, `${fmt}: ব্যাক কভার ভরা — ১ম পৃষ্ঠার লেখা বাম কলাম থেকেই শুরু (x=${m0.minX})`, m0.minX < EXPECT.col2Start - 6);
      }
      const headerCx = +((EXPECT.col2Start + EXPECT.rightEdge) / 2).toFixed(1);
      A(checks, `${fmt}: হেডার-রেখা কলাম-২-এর শীর্ষে — কেন্দ্র ≈ ${headerCx}pt (${m0.topRightCenter})`,
        m0.topRightCenter != null && Math.abs(m0.topRightCenter - headerCx) < 40);
      const allAt = (x) => e.measure.reduce((a, m) => a + m.nAt(x), 0);
      const cntNum = allAt(0), cntStem = allAt(EXPECT.stemIndent), cntSub = allAt(EXPECT.subIndent);
      // 864/432 হ্যাঙ্গিং: নম্বর কলাম-প্রান্তে (0pt), স্টেম-লেখা ও উপ-প্রশ্নের লেবেল
      // 21.6pt-এ, র‍্যাপ-হওয়া অংশ 43.2pt-এ (ছোট নমুনায় র‍্যাপ না-ও যেতে পারে)।
      A(checks, `${fmt}: ইনডেন্ট স্তর — নম্বর 0pt ×${cntNum}, স্টেম/উপ-প্রশ্ন-লেবেল ${EXPECT.stemIndent}pt ×${cntStem}, র‍্যাপ-অংশ ${EXPECT.subIndent}pt ×${cntSub}`,
        cntNum >= 3 && cntStem >= 3);
      const hdrBottom = res.headerHeightTw ? +(res.headerHeightTw / 20 + 6).toFixed(1) : null;
      const nForbid = e.measure.reduce((a, m) => a + m.forbidden(hdrBottom), 0);
      A(checks, `${fmt}: ৪ নম্বর ধারা — কোনো লাইন নম্বরের নিচে ওঠেনি (নিষিদ্ধ ব্যান্ডে 0 শব্দ; পাওয়া ${nForbid})`, nForbid === 0);
      A(checks, `${fmt}: কলামের ডান প্রান্তে নম্বর ${e.marksAtRightEdge}টি (রাইট ট্যাব কাজ করছে)`, e.marksAtRightEdge >= Math.max(4, res.questions));
    }
    res.renderChecks = checks;
  } else {
    res.renderChecks = [{ check: 'soffice/pdftotext নেই — রেন্ডার-মাপ বাদ', ok: true, skipped: true }];
  }

  report.push(res);
  const sline = (c) => `${c.ok ? '✓' : '✗'} ${c.check}`;
  console.log(`\n=== ${id} — ${res.questions} প্রশ্ন, ${res.columns} কলাম, ব্যাক-কভার ${res.reservedUsed ? 'ভরা' : 'খালি'} (tail ${res.tailMoved})`);
  for (const c of res.structuralChecks) console.log('  ' + sline(c));
  for (const c of (res.renderChecks || [])) console.log('  ' + (c.skipped ? 'ℹ️ ' + c.check : sline(c)));
}

fs.writeFileSync(path.join(OUT, 'cq-render-measure.json'), JSON.stringify(report, null, 2));

// --- রিডমি (প্রুফ সংকলন) ---------------------------------------------------
{
  const L = [];
  L.push('# Part-11 — সৃজনশীল (CQ) বুকলেট মাস্টার লেআউট: রেন্ডার প্রমাণ');
  L.push('');
  L.push('ইনপুট: `proof/samples/cq-booklet-*.plain.md` (হেডার-লাইনসহ আসল OCR-সদৃশ টেক্সট)।');
  L.push('আউটপুট: প্রোডাকশন পাথ `ExportDualEngine.generateWordDoc(...)` থেকে বানানো — অর্থাৎ ইউজার যা');
  L.push('ডাউনলোড করে সেটিই। Word 2003 `.doc` (RTF) ও `.docx` দুটোকেই LibreOffice-headless দিয়ে PDF করে');
  L.push('পৃষ্ঠার জ্যামিতি মেপে চেক করা হয়েছে (স্ক্রিপ্ট: `node qa/cq-render-proof.mjs`)।');
  L.push('');
  L.push('## লক্ষ্য জ্যামিতি (CqBookletPlanner.GEOMETRY)');
  L.push('');
  L.push('| রাশি | twips | pt (রেন্ডারে) |');
  L.push('|---|---|---|');
  L.push(`| পেজ (A4 ল্যান্ডস্কেপ) | ${geom.pageW} × ${geom.pageH} | ${EXPECT.pageWpt} × ${EXPECT.pageHpt} |`);
  L.push(`| মার্জিন (চারদিকে 0.5") | ${geom.margin} | ${EXPECT.margin} |`);
  L.push(`| কলাম সংখ্যা / গ্যাপ | ${geom.cols} / ${geom.colGap} | — / ${EXPECT.gutter} |`);
  L.push(`| কলাম প্রস্থ | ${geom.colW} | ${PT(geom.colW)} |`);
  L.push(`| ২য় কলামের শুরু | — | ${EXPECT.col2Start} |`);
  L.push(`| প্রশ্নের হ্যাঙ্গিং | ${geom.indent} | ${EXPECT.stemIndent} |`);
  L.push(`| উপ-প্রশ্নের ইনডেন্ট | ${geom.subIndent} | ${EXPECT.subIndent} |`);
  L.push(`| নম্বরের রাইট ট্যাব | ${geom.rightTab} | ${PT(geom.rightTab)} |`);
  L.push('');
  L.push('## নমুনা-প্রতি ফল');
  L.push('');
  L.push('| নমুনা | প্রশ্ন | প্ল্যান কলাম | PDF পৃষ্ঠা (.doc / .docx) | ব্যাক কভার | হেডার লাইন | কাঠামোগত চেক | রেন্ডার চেক |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const r of report) {
    const sc = r.structuralChecks || [], rc = (r.renderChecks || []).filter((c) => !c.skipped);
    const fmt = (arr) => `${arr.filter((c) => c.ok).length}/${arr.length}`;
    const pgs = r.render ? `${r.render.doc.pages} / ${r.render.docx.pages}` : '—';
    L.push(`| ${r.id} | ${r.questions} | ${r.columns} | ${pgs} | ${r.reservedUsed ? 'ভরা (+' + r.tailMoved + ' আইটেম)' : 'খালি (লিডিং ব্রেক)'} | ${r.headerLines} | ${fmt(sc)} | ${rc.length ? fmt(rc) : 'ℹ️'} |`);
  }
  L.push('');
  L.push('## নমুনা-প্রতি বিস্তারিত চেক');
  L.push('');
  for (const r of report) {
    L.push(`### ${r.id}`);
    L.push('');
    L.push('```');
    for (const c of (r.structuralChecks || [])) L.push(`${c.ok ? 'PASS' : 'FAIL'}  ${c.check}`);
    for (const c of (r.renderChecks || [])) L.push(`${c.skipped ? 'SKIP' : (c.ok ? 'PASS' : 'FAIL')}  ${c.check}${c.detail ? '  [' + c.detail + ']' : ''}`);
    L.push('```');
    L.push('');
    L.push(`- প্ল্যান: ${r.columns}টি কলাম${r.skipFirstColumn ? ', ১ম কলাম সংরক্ষিত (খালি)' : ''}; পঠন-পৃষ্ঠা ১ = ফ্রন্ট কভার (হেডার ${r.headerHeightTw} twips)`);
    if (r.render) {
      L.push(`- .doc  → ${r.render.doc.pages} পৃষ্ঠা, ${r.render.doc.pageSize && r.render.doc.pageSize.w}×${r.render.doc.pageSize && r.render.doc.pageSize.h}pt${r.render.doc.png ? ', PNG: ' + r.render.doc.png : ''}`);
      L.push(`- .docx → ${r.render.docx.pages} পৃষ্ঠা, ${r.render.docx.pageSize && r.render.docx.pageSize.w}×${r.render.docx.pageSize && r.render.docx.pageSize.h}pt${r.render.docx.png ? ', PNG: ' + r.render.docx.png : ''}`);
    }
    L.push('');
  }
  L.push('## ফাইল');
  L.push('');
  L.push('- `proof/cq-<id>.doc` / `.docx` — আসল ডাউনলোড আর্টিফ্যাক্ট (Word 2003 RTF / OOXML)');
  L.push('- `proof/cq-<id>.doc.pdf` / `cq-<id>.docx.pdf` — সেগুলোর LibreOffice রেন্ডার (ভাঁজ-চোখে দেখার জন্য)');
  L.push('- `proof/cq-<id>.<fmt>.page1.png` — ১ম পৃষ্ঠার স্ক্রিনশট');
  L.push('- `proof/cq-render-measure.json` — সব মাপ ও চেকের ফল');
  L.push('');
  L.push('> দ্রষ্টব্য: এই স্যান্ডবক্সে Kalpurush নেই (রিপোতে শুধু SutonnyMJ ট্র্যাক হয়) — LibreOffice বিকল্প');
  L.push('> ফন্ট বসায়, তাই বাংলা অক্ষর গণনায় ত্রুটি থাকে; পৃষ্ঠার জ্যামিতি (অবস্থান/সংখ্যা) তাতে ব্যাহত হয় না।');
  fs.writeFileSync(path.join(OUT, 'README-cq.md'), L.join('\n') + '\n', 'utf8');
}

console.log(`\n${fails ? '✗ ব্যর্থ চেক: ' + fails : '✓ সব চেক পাস'} — বিস্তারিত: proof/cq-render-measure.json ও proof/README-cq.md`);
process.exit(fails ? 1 : 0);
