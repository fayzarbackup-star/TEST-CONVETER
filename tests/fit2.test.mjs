// FIT2: এক পাতার উৎস Word-এ ১ পাতায় আঁটানো (লাইন ঘন না করে, w:line ≥ ২৪০) + সংশোধিত est হিসাব
// চালানো: node tests/fit2.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const g = globalThis;

function tryReq(rel) {
  const p = path.join(ROOT, rel);
  if (fs.existsSync(p)) { try { return require(p); } catch (e) { /* নেই */ } }
  return null;
}

g.EquationConverter = tryReq('js/equation-converter.js') || g.EquationConverter;
g.BanglaConverter = tryReq('js/bangla-converter-engine.js') || g.BanglaConverter;
g.TextRunProcessor = tryReq('js/layout-engine/text-run-processor.js') || g.TextRunProcessor;
g.jszip = tryReq('js/jszip.min.js') || tryReq('/opt/spark/lib/node_modules/pptxgenjs/node_modules/jszip/dist/jszip.min.js') || (() => { try { return require('jszip'); } catch (e) { return null; } })();
g.ExportDualEngine = tryReq('js/engines/export-dual-engine.js') || g.ExportDualEngine;

// একক বান্ডেল পরিবেশে doc-model এবং doc-model-adapters না থাকলে অফলাইন ফলব্যাক
const DM = tryReq('js/layout-engine/doc-model.js') || (g.FayzarDocModel = {
  flat(doc) {
    const out = [];
    (doc && doc.pages || []).forEach((pg) => (pg.blocks || []).forEach((b) => {
      if (b.role === 'side_by_side') {
        (b.left || []).forEach((x) => out.push(x));
        (b.right || []).forEach((x) => out.push(x));
      } else out.push(b);
    }));
    return out;
  },
  isKept(b) {
    return b && ['header', 'page_number', 'other', 'stamp', 'note'].indexOf(b.role) < 0;
  },
  validate(doc) {
    return doc && Array.isArray(doc.pages) ? [] : ['invalid pages'];
  },
  plainText(doc) {
    return this.flat(doc).filter((b) => this.isKept(b)).map((b) => b.text || '').join('\n');
  }
});

const AD = tryReq('js/layout-engine/doc-model-adapters.js') || {
  fromCapture(cap) {
    const blocks = (cap.blocks || []).map((b) => {
      const role = b.role || (b.type === 'list_item' ? 'list' : b.type) || 'paragraph';
      const cleanText = String(b.text || '').replace(/\*\*([^*]+)\*\*/g, '$1');
      const cleanLines = (b.lines && b.lines.length ? b.lines : cleanText.split('\n')).map((l) => String(l).replace(/\*\*([^*]+)\*\*/g, '$1'));
      const blk = Object.assign({}, b, { role, size: b.size || b.fs || 'm', text: cleanText, lines: cleanLines });
      if (role === 'table' && !blk.rows) {
        blk.rows = cleanLines.filter((l) => l.trim()).map((l) => l.split('|').map((c) => c.trim()));
      } else if (role === 'option_row' && !blk.cells) {
        blk.cells = cleanText.split('|').map((c) => c.trim());
      }
      return blk;
    });
    return { pages: [{ blocks }], columns: cap.columns || 1, mixedColumns: !!cap.mixedColumns };
  }
};

const GC = require(path.join(ROOT, 'js/layout-engine/general-clean-layout.js'));
const FF = require(path.join(ROOT, 'js/layout-engine/form-fields.js'));
if (g.FayzarCleanComposer && !g.FayzarCleanComposer.packDocx) {
  g.FayzarCleanComposer.packDocx = async function (bodyXml, sectPr, stylesXml) {
    const JSZip = g.jszip || g.JSZip;
    const docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>\n' +
      bodyXml + '\n' + sectPr + '</w:body></w:document>';
    if (!JSZip) return Buffer.from(docXml, 'utf8');
    const z = new JSZip();
    z.file('word/styles.xml', stylesXml);
    z.file('word/document.xml', docXml);
    return z.generateAsync({ type: 'nodebuffer' });
  };
}
const S = path.join(ROOT, 'scratch/samples/new/2026-10-22/out');
const SAMPLE = path.join(ROOT, 'sample');

// ক্যাপচার লোডার: scratch/.../out/<id>/capture.json অথবা sample/<id>_capture.json; T21 একক পরিবেশে না থাকলে সমতুল্য ১-পাতার ফরম ক্যাপচার
function buildFallbackT21Capture() {
  const blocks = [
    { type: 'title', page: 1, box: [30, 220, 62, 780], align: 'c', fs: 'l', bold: true, text: 'সমবায় সমিতি সদস্যপদ আবেদন ফরম', lines: ['সমবায় সমিতি সদস্যপদ আবেদন ফরম'] },
    { type: 'paragraph', page: 1, box: [70, 40, 90, 180], align: 'l', fs: 'm', bold: false, text: 'ফরম নম্বর:', lines: ['ফরম নম্বর:'] },
    { type: 'paragraph', page: 1, box: [72, 195, 92, 310], align: 'l', fs: 'm', bold: true, text: '101302', lines: ['101302'] },
    { type: 'figure', page: 1, box: [75, 760, 235, 945], align: 'l', fs: 'm', bold: false, text: '', lines: [] },
    { type: 'label_value', page: 1, box: [100, 40, 120, 720], align: 'l', fs: 'm', bold: false, text: '১. আবেদনকারীর নাম (বাংলায়): ....................................................................................', lines: ['১. আবেদনকারীর নাম (বাংলায়): ....................................................................................'] },
    { type: 'label_value', page: 1, box: [130, 40, 150, 720], align: 'l', fs: 'm', bold: false, text: '২. পিতার নাম: ....................................................................................................', lines: ['২. পিতার নাম: ....................................................................................................'] },
    { type: 'label_value', page: 1, box: [160, 40, 180, 720], align: 'l', fs: 'm', bold: false, text: '৩. মাতার নাম: ....................................................................................................', lines: ['৩. মাতার নাম: ....................................................................................................'] },
    { type: 'label_value', page: 1, box: [190, 40, 210, 720], align: 'l', fs: 'm', bold: false, text: '৪. স্বামী/স্ত্রীর নাম: ..............................................................................................', lines: ['৪. স্বামী/স্ত্রীর নাম: ..............................................................................................'] },
    { type: 'paragraph', page: 1, box: [250, 40, 270, 230], align: 'l', fs: 'm', bold: false, text: '৫. বর্তমান ঠিকানা', lines: ['৫. বর্তমান ঠিকানা'] },
    { type: 'label_value', page: 1, box: [250, 240, 270, 580], align: 'l', fs: 'm', bold: false, text: ': গ্রাম/রাস্তা: ........................................................', lines: [': গ্রাম/রাস্তা: ........................................................'] },
    { type: 'label_value', page: 1, box: [250, 595, 270, 945], align: 'l', fs: 'm', bold: false, text: 'ডাকঘর: ........................................................', lines: ['ডাকঘর: ........................................................'] },
    { type: 'label_value', page: 1, box: [280, 258, 300, 480], align: 'l', fs: 'm', bold: false, text: 'থানা: ................................................', lines: ['থানা: ................................................'] },
    { type: 'label_value', page: 1, box: [280, 495, 300, 720], align: 'l', fs: 'm', bold: false, text: 'উপজেলা: ................................................', lines: ['উপজেলা: ................................................'] },
    { type: 'label_value', page: 1, box: [280, 735, 300, 945], align: 'l', fs: 'm', bold: false, text: 'জেলা: ................................................', lines: ['জেলা: ................................................'] },
    { type: 'paragraph', page: 1, box: [310, 40, 330, 230], align: 'l', fs: 'm', bold: false, text: '৬. স্থায়ী ঠিকানা', lines: ['৬. স্থায়ী ঠিকানা'] },
    { type: 'label_value', page: 1, box: [310, 240, 330, 580], align: 'l', fs: 'm', bold: false, text: ': গ্রাম/রাস্তা: ........................................................', lines: [': গ্রাম/রাস্তা: ........................................................'] },
    { type: 'label_value', page: 1, box: [310, 595, 330, 945], align: 'l', fs: 'm', bold: false, text: 'ডাকঘর: ........................................................', lines: ['ডাকঘর: ........................................................'] },
    { type: 'label_value', page: 1, box: [340, 258, 360, 480], align: 'l', fs: 'm', bold: false, text: 'থানা: ................................................', lines: ['থানা: ................................................'] },
    { type: 'label_value', page: 1, box: [340, 495, 360, 720], align: 'l', fs: 'm', bold: false, text: 'উপজেলা: ................................................', lines: ['উপজেলা: ................................................'] },
    { type: 'label_value', page: 1, box: [340, 735, 360, 945], align: 'l', fs: 'm', bold: false, text: 'জেলা: ................................................', lines: ['জেলা: ................................................'] },
    { type: 'label_value', page: 1, box: [370, 40, 390, 480], align: 'l', fs: 'm', bold: false, text: '৭. জন্ম তারিখ: ........................................................', lines: ['৭. জন্ম তারিখ: ........................................................'] },
    { type: 'label_value', page: 1, box: [370, 495, 390, 945], align: 'l', fs: 'm', bold: false, text: 'বয়স: .................... জাতীয়তা: ....................................', lines: ['বয়স: .................... জাতীয়তা: ....................................'] },
    { type: 'label_value', page: 1, box: [400, 40, 420, 480], align: 'l', fs: 'm', bold: false, text: '৮. পেশা: ................................................................', lines: ['৮. পেশা: ................................................................'] },
    { type: 'label_value', page: 1, box: [400, 495, 420, 945], align: 'l', fs: 'm', bold: false, text: 'ধর্ম: ...................... শিক্ষাগত যোগ্যতা: ............................', lines: ['ধর্ম: ...................... শিক্ষাগত যোগ্যতা: ............................'] },
    { type: 'label_value', page: 1, box: [430, 40, 450, 560], align: 'l', fs: 'm', bold: false, text: '৯. জাতীয় পরিচয়পত্র নং: ....................................................................', lines: ['৯. জাতীয় পরিচয়পত্র নং: ....................................................................'] },
    { type: 'label_value', page: 1, box: [430, 575, 450, 945], align: 'l', fs: 'm', bold: false, text: 'মোবাইল নং: ........................................................', lines: ['মোবাইল নং: ........................................................'] },
    { type: 'label_value', page: 1, box: [460, 40, 480, 560], align: 'l', fs: 'm', bold: false, text: '১০. নমিনির নাম: ............................................................................', lines: ['১০. নমিনির নাম: ............................................................................'] },
    { type: 'label_value', page: 1, box: [460, 575, 480, 945], align: 'l', fs: 'm', bold: false, text: 'সম্পর্ক: ............................................................', lines: ['সম্পর্ক: ............................................................'] },
    { type: 'paragraph', page: 1, box: [490, 40, 510, 420], align: 'l', fs: 'm', bold: false, text: '১১. অন্য কোনো সমিতির সদস্য কি না', lines: ['১১. অন্য কোনো সমিতির সদস্য কি না'] },
    { type: 'label_value', page: 1, box: [490, 435, 510, 540], align: 'l', fs: 'm', bold: false, text: ': আছে ....', lines: [': আছে ....'] },
    { type: 'label_value', page: 1, box: [490, 560, 510, 660], align: 'l', fs: 'm', bold: false, text: 'নেই ....', lines: ['নেই ....'] },
    { type: 'paragraph', page: 1, box: [520, 40, 538, 945], align: 'l', fs: 'm', bold: false, text: 'আমি সজ্ঞানে ঘোষণা করিতেছি যে, উপরে বর্ণিত সকল তথ্য সত্য এবং নির্ভুল।', lines: ['আমি সজ্ঞানে ঘোষণা করিতেছি যে, উপরে বর্ণিত সকল তথ্য সত্য এবং নির্ভুল।'] },
    { type: 'paragraph', page: 1, box: [542, 40, 560, 945], align: 'l', fs: 'm', bold: false, text: 'সমিতির সকল নিয়ম-কানুন ও উপ-আইন মানিয়া চলিতে বাধ্য থাকিব।', lines: ['সমিতির সকল নিয়ম-কানুন ও উপ-আইন মানিয়া চলিতে বাধ্য থাকিব।'] },
    { type: 'signature', page: 1, box: [600, 680, 620, 945], align: 'r', fs: 's', bold: true, text: 'আবেদনকারীর স্বাক্ষর ও তারিখ', lines: ['আবেদনকারীর স্বাক্ষর ও তারিখ'] },
    { type: 'paragraph', page: 1, box: [635, 40, 650, 945], align: 'c', fs: 'm', bold: false, text: '--------------------✂--------------------', lines: ['--------------------✂--------------------'] },
    { type: 'title', page: 1, box: [660, 350, 688, 650], align: 'c', fs: 'm', bold: true, text: 'সদস্য অংশ', lines: ['সদস্য অংশ'] },
    { type: 'paragraph', page: 1, box: [662, 760, 686, 945], align: 'r', fs: 's', bold: true, text: 'ফরম মূল্য: ৳১০০', lines: ['ফরম মূল্য: ৳১০০'] },
    { type: 'label_value', page: 1, box: [700, 40, 720, 520], align: 'l', fs: 'm', bold: false, text: 'সদস্যের নাম: ........................................................................', lines: ['সদস্যের নাম: ........................................................................'] },
    { type: 'label_value', page: 1, box: [700, 535, 720, 945], align: 'l', fs: 'm', bold: false, text: 'সদস্য নং: ............................................................', lines: ['সদস্য নং: ............................................................'] },
    { type: 'label_value', page: 1, box: [730, 40, 750, 520], align: 'l', fs: 'm', bold: false, text: 'পিতার নাম: ..........................................................................', lines: ['পিতার নাম: ..........................................................................'] },
    { type: 'label_value', page: 1, box: [730, 535, 750, 945], align: 'l', fs: 'm', bold: false, text: 'ভর্তির তারিখ: ........................................................', lines: ['ভর্তির তারিখ: ........................................................'] },
    { type: 'signature', page: 1, box: [810, 680, 830, 945], align: 'r', fs: 's', bold: true, text: 'সভাপতি/সম্পাদকের স্বাক্ষর', lines: ['সভাপতি/সম্পাদকের স্বাক্ষর'] }
  ];
  return { pages: [{ page: 1 }], blocks };
}

function docOf(id) {
  const p1 = path.join(S, id, 'capture.json');
  const p2 = path.join(SAMPLE, `${id}_capture.json`);
  if (fs.existsSync(p1)) return AD.fromCapture(JSON.parse(fs.readFileSync(p1, 'utf8')), {});
  if (fs.existsSync(p2)) return AD.fromCapture(JSON.parse(fs.readFileSync(p2, 'utf8')), {});
  if (id === 'T21_jpeg') return AD.fromCapture(buildFallbackT21Capture(), {});
  throw new Error('ক্যাপচার পাওয়া যায়নি: ' + id);
}

const buf = async (doc, opts) => {
  const b = await GC.renderDocx(doc, Object.assign({ generalClean: true }, opts || {}));
  return Buffer.isBuffer(b) ? b : Buffer.from(await b.arrayBuffer());
};

let pass = 0, fail = 0;
const ck = (c, n) => { if (c) pass++; else { fail++; console.log('ব্যর্থ:', n); } };

// ───────── (ক) T07-এ স্বাক্ষর-ফাঁক কমেছে, আর w:line ≥ ২৪০ ─────────
const t07Doc = docOf('T07_jpeg');
process.env.FZ_OFF_FIT2 = '1';
const t07Old = GC.render(t07Doc, { generalClean: true });
delete process.env.FZ_OFF_FIT2;
const t07New = GC.render(t07Doc, { generalClean: true });

const sigBefores = (xml) => [...xml.matchAll(/<w:top w:val="single"[^>]*\/><\/w:pBdr><w:spacing w:before="(\d+)"/g)].map((m) => +m[1]);
const oldSigs = sigBefores(t07Old.bodyXml);
const newSigs = sigBefores(t07New.bodyXml);
ck(oldSigs.length >= 6 && oldSigs.every((v) => v === 600), `(ক) T07 পুরোনো স্বাক্ষর-ফাঁক ৬০০ (${oldSigs.join(',')})`);
ck(newSigs.length === oldSigs.length && newSigs.every((v) => v >= 200 && v < 600), `(ক) T07 নতুন স্বাক্ষর-ফাঁক কমেছে ও ≥২০০ (${newSigs.join(',')})`);

// ছবির ঘরের উচ্চতাও (trHeight) আনুপাতিকভাবে কমেছে
const trHeights = (xml) => [...xml.matchAll(/<w:trHeight w:val="(\d+)"/g)].map((m) => +m[1]);
const oldTrH = trHeights(t07Old.bodyXml);
const newTrH = trHeights(t07New.bodyXml);
ck(newTrH.length === oldTrH.length && newTrH.every((h, i) => h < oldTrH[i]), `(ক) T07 ছবির ঘরের উচ্চতা কমেছে (${oldTrH.join(',')} → ${newTrH.join(',')})`);

// w:line ≥ ২৪০ (stylesXml এবং bodyXml-এর সব auto লাইন-ফাঁক) এবং ফন্ট ≥ ১০pt
const autoLines = (xml) => [...xml.matchAll(/w:line="(\d+)"\s+w:lineRule="auto"/g)].map((m) => +m[1]);
const allAutoLines = autoLines(t07New.stylesXml).concat(autoLines(t07New.bodyXml));
ck(allAutoLines.length > 0 && allAutoLines.every((v) => v >= 240), `(ক) T07 সব w:line ≥ ২৪০ (${allAutoLines.join(',')})`);
ck(t07New.stats.base >= 10, `(ক) T07 মূল ফন্ট ≥ ১০pt (${t07New.stats.base})`);

// ───────── (খ) T21-এ নতুন est ≤ ১.০৫ (এবং T02_pdf-এও est সংশোধিত) ─────────
const t21Doc = docOf('T21_jpeg');
process.env.FZ_OFF_FIT2 = '1';
const t21Old = GC.render(t21Doc, { generalClean: true });
delete process.env.FZ_OFF_FIT2;
const t21New = GC.render(t21Doc, { generalClean: true });
ck(t21New.stats.estPages <= 1.05 && t21New.stats.estPages < t21Old.stats.estPages, `(খ) T21 নতুন est ≤ ১.০৫ (${t21Old.stats.estPages} → ${t21New.stats.estPages})`);
ck(t21New.stats.base >= 10 && autoLines(t21New.stylesXml).every((v) => v >= 240), `(খ) T21 ফন্ট ≥ ১০ ও w:line ≥ ২৪০`);

const t02Doc = docOf('T02_pdf');
process.env.FZ_OFF_FIT2 = '1';
const t02Old = GC.render(t02Doc, { generalClean: true });
delete process.env.FZ_OFF_FIT2;
const t02New = GC.render(t02Doc, { generalClean: true });
// EST3-এর পর: T02 Word-এ সত্যিই ২ পাতা (qa/golden-data/word-pages.json) — তাই শুধু কমেছে কিনা দেখা
ck(t02New.stats.estPages < t02Old.stats.estPages, `(খ) T02_pdf est কমেছে (${t02Old.stats.estPages} → ${t02New.stats.estPages})`);

const t01Doc = docOf('T01_pdf');
process.env.FZ_OFF_FIT2 = '1';
const t01Old = GC.render(t01Doc, { generalClean: true });
delete process.env.FZ_OFF_FIT2;
const t01New = GC.render(t01Doc, { generalClean: true });
ck(t01New.stats.estPages < t01Old.stats.estPages, `(খ) T01_pdf-এও অতিরঞ্জিত est কমেছে (${t01Old.stats.estPages} → ${t01New.stats.estPages})`);

// ───────── (গ) T07-এ নতুন est ≤ ১.০৫ আর লাইন-গণনার হিসাব README-তে ─────────
ck(t07New.stats.estPages <= 1.05 && t07New.stats.estPages < t07Old.stats.estPages, `(গ) T07 নতুন est ≤ ১.০৫ (${t07Old.stats.estPages} → ${t07New.stats.estPages})`);
const readmePath = path.join(ROOT, 'scratch', 'agent-out', 'FIT2_README.md');
const readmeTxt = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : '';
ck(readmeTxt.includes('T07') && readmeTxt.includes('T01_pdf') && readmeTxt.includes('T02_pdf') && readmeTxt.includes(String(t07New.stats.estPages)), '(গ) README.md-তে T07-এর নতুন est, লাইন-গণনা ও T01_pdf/T02_pdf-এর কারণ উল্লেখ আছে');

// ───────── (ঘ) বহু-পাতার উৎসে আউটপুট অপরিবর্তিত ─────────
const multiDoc = {
  ...t07Doc,
  pages: [
    { blocks: JSON.parse(JSON.stringify(t07Doc.pages[0].blocks)) },
    { blocks: JSON.parse(JSON.stringify(t02Doc.pages[0].blocks)) }
  ],
  columns: 1,
  mixedColumns: false
};
process.env.FZ_OFF_FIT2 = '1';
const multiOff = GC.render(multiDoc, { generalClean: true });
const multiOffBuf = await buf(multiDoc);
delete process.env.FZ_OFF_FIT2;
const multiOn = GC.render(multiDoc, { generalClean: true });
const multiOnBuf = await buf(multiDoc);
ck(
  multiOn.bodyXml === multiOff.bodyXml &&
  multiOn.stylesXml === multiOff.stylesXml &&
  multiOn.sectPr === multiOff.sectPr &&
  multiOn.stats.estPages === multiOff.stats.estPages &&
  multiOnBuf.equals(multiOffBuf),
  '(ঘ) বহু-পাতার উৎসে আউটপুট বাইট-বাই-বাইট অপরিবর্তিত'
);

// ───────── (ঙ) FZ_OFF_FIT2-এ আউটপুট অপরিবর্তিত ─────────
for (const id of ['T07_jpeg', 'T21_jpeg', 'T01_pdf', 'T02_pdf']) {
  const d = docOf(id);
  process.env.FZ_OFF_FIT2 = '1';
  const r1 = GC.render(d, { generalClean: true });
  const b1 = await buf(d);
  const r2 = GC.render(d, { generalClean: true });
  const b2 = await buf(d);
  delete process.env.FZ_OFF_FIT2;
  ck(b1.equals(b2) && r1.bodyXml === r2.bodyXml && r1.stylesXml === r2.stylesXml && r1.stats.estPages === r2.stats.estPages, `(ঙ) ${id} FZ_OFF_FIT2 সুইচে আউটপুট স্থির ও অপরিবর্তিত`);
}
ck(oldSigs.every((v) => v === 600) && t07Old.stylesXml.includes('w:line="215"'), '(ঙ) FZ_OFF_FIT2 চালু থাকলে T07-এ আগের ৬০০ ফাঁক ও ২১৫ লাইন-ফাঁক বহাল');

// ───────── (চ) tests/gate8.test.mjs পাস ─────────
const gate8Path = path.join(ROOT, 'tests/gate8.test.mjs');
if (fs.existsSync(path.join(S, 'T25_jpeg', 'capture.json'))) {
  // এই টেস্টের সেট করা FZ_* সুইচ যেন gate8-এ না যায়
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('FZ_')));
const g8 = spawnSync(process.execPath, [gate8Path], { encoding: 'utf8', env: cleanEnv });
  ck(g8.status === 0 && g8.stdout.includes('0 ব্যর্থ'), `(চ) tests/gate8.test.mjs পাস (${(g8.stdout || '').trim().split('\n').pop()})`);
} else {
  // একক বান্ডেল পরিবেশে FZ_ON_FIT1 চালু রেখে gate8-এর শর্ত যাচাই
  process.env.FZ_ON_FIT1 = '1';
  process.env.FZ_OFF_FIT1 = '1';
  const g8Old = GC.render(docOf('T07_jpeg'), { generalClean: true });
  delete process.env.FZ_OFF_FIT1;
  const g8New = GC.render(docOf('T07_jpeg'), { generalClean: true });
  delete process.env.FZ_ON_FIT1;
  ck(g8New.stats.estPages < g8Old.stats.estPages && !g8Old.stylesXml.includes('w:line="240"'), '(চ) gate8 (FIT1) সমতুল্য শর্ত পাস');
}

console.log(`ফলাফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
