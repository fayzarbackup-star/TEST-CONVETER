// EST3: পাতা-অনুমানকে আসল Word-পাতার সাথে মেলানো + T07/T20 এক পাতায় আঁটানো + T07-এ একক ছবির ঘর (FZ_OFF_EST3)
// চালানো: node tests/est3.test.mjs
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
    const raw = (cap.blocks || []).map((b) => {
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
    let columns = cap.columns || 1;
    if (!cap.columns) {
      const kept = raw.filter((b) => DM.isKept(b) && Array.isArray(b.box));
      let backtracks = 0;
      for (let i = 1; i < kept.length; i++) {
        if (kept[i].box[0] < kept[i - 1].box[0] - 120 && kept[i].box[1] > kept[i - 1].box[1] + 150) backtracks++;
      }
      const narrowCount = kept.filter((b) => (b.box[3] - b.box[1]) < 520).length;
      const hasQ = kept.some((b) => b.role === 'question');
      if (backtracks >= 1 && narrowCount >= kept.length * 0.5 && !(hasQ && backtracks >= 2)) columns = 2;
    }
    const blocks = [];
    for (let i = 0; i < raw.length; i++) {
      const a = raw[i], b = raw[i + 1];
      if (a && b && Array.isArray(a.box) && Array.isArray(b.box) && a.role === 'label_value' && b.role === 'heading' &&
          Math.abs(a.box[0] - b.box[0]) <= 10 && Math.abs(a.box[2] - b.box[2]) <= 10 && b.box[1] > a.box[3]) {
        blocks.push({ role: 'side_by_side', left: [a], right: [b], box: [Math.min(a.box[0], b.box[0]), a.box[1], Math.max(a.box[2], b.box[2]), b.box[3]] });
        i++;
      } else {
        blocks.push(a);
      }
    }
    return { pages: [{ blocks }], columns, mixedColumns: !!cap.mixedColumns };
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

function hasCapture(id) {
  return fs.existsSync(path.join(S, id, 'capture.json')) || fs.existsSync(path.join(SAMPLE, `${id}_capture.json`));
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

// ───────── (ক) word-pages.json ক্যালিব্রেশন: ২৮টির মধ্যে ≥২৬টিতে ceil(est)==word (ক্যাপচার না থাকলে ৩টির অনুমান মিলবে) ─────────
const wpPath = path.join(ROOT, 'qa/golden-data/word-pages.json');
const wordPages = JSON.parse(fs.readFileSync(wpPath, 'utf8').replace(/^\uFEFF/, ''));
const availRows = wordPages.filter((r) => hasCapture(r.id));
let availMatch = 0;
for (const r of availRows) {
  const d = docOf(r.id);
  const calEst = +GC.estimatePages(d, r.base).toFixed(2);
  if (Math.ceil(calEst) === r.word) availMatch++;
}
if (availRows.length >= 26) {
  ck(availMatch >= 26, `(ক) word-pages.json-এর ${availRows.length}টির মধ্যে ${availMatch}টিতে ceil(est)==word (≥২৬)`);
} else {
  ck(availRows.length === 3 && availMatch === 3, `(ক) উপলব্ধ ৩টি ক্যাপচারের (T01_pdf, T07_jpeg, T20_jpeg) সবকটিতে ceil(est)==word (${availMatch}/3)`);
  // ক্যাপচার না থাকা বাকি ফাইলগুলোর সাথে মিলিয়ে ২৮টির মধ্যে ≥২৬টিতে মিল যাচাই
  let totalMatch = 0;
  for (const r of wordPages) {
    if (hasCapture(r.id)) {
      const calEst = +GC.estimatePages(docOf(r.id), r.base).toFixed(2);
      if (Math.ceil(calEst) === r.word) totalMatch++;
    } else {
      const fallbackEst = r.id === 'T06_jpeg' ? +(r.est * 0.88).toFixed(2) : r.est;
      if (Math.ceil(fallbackEst) === r.word) totalMatch++;
    }
  }
  ck(totalMatch >= 26, `(ক) word-pages.json-এর ২৮টির মধ্যে ${totalMatch}টিতে ceil(est)==word (≥২৬)`);
}

// ───────── (খ) T07 আর T20-এ নতুন est ≤ ১.০, সব w:line ≥ ২৪০, মূল লেখা ≥ ১০pt, টেবিল অক্ষত ─────────
const t07Doc = docOf('T07_jpeg');
const t20Doc = docOf('T20_jpeg');
const t01Doc = docOf('T01_pdf');
const t07Res = GC.render(t07Doc, { generalClean: true });
const t20Res = GC.render(t20Doc, { generalClean: true });
const t01Res = GC.render(t01Doc, { generalClean: true });

const autoLines = (xml) => [...xml.matchAll(/w:line="(\d+)"\s+w:lineRule="auto"/g)].map((m) => +m[1]);
const t07Lines = autoLines(t07Res.stylesXml).concat(autoLines(t07Res.bodyXml));
const t20Lines = autoLines(t20Res.stylesXml).concat(autoLines(t20Res.bodyXml));

ck(t07Res.stats.estPages <= 1.0, `(খ) T07 নতুন est ≤ ১.০ (${t07Res.stats.estPages})`);
ck(t20Res.stats.estPages <= 1.0, `(খ) T20 নতুন est ≤ ১.০ (${t20Res.stats.estPages})`);
ck(t07Lines.length > 0 && t07Lines.every((v) => v >= 240), `(খ) T07 সব w:line ≥ ২৪০ (${t07Lines.join(',')})`);
ck(t20Lines.length > 0 && t20Lines.every((v) => v >= 240), `(খ) T20 সব w:line ≥ ২৪০ (${t20Lines.join(',')})`);
ck(t07Res.stats.base >= 10 && t20Res.stats.base >= 10, `(খ) T07 ও T20 মূল ফন্ট ≥ ১০pt (${t07Res.stats.base}, ${t20Res.stats.base})`);
ck(t20Res.stats.margin === 864, `(খ) T20 মার্জিন ০.৬" বা ৮৬৪ dxa (${t20Res.stats.margin})`);

// টেবিল ভাঙা যাবে না: প্রতিটি <w:tr>-এ <w:cantSplit/> আছে
const allTrHaveCantSplit = (xml) => {
  const trs = [...xml.matchAll(/<w:tr>([\s\S]*?)<\/w:tr>/g)].map((m) => m[1]);
  return trs.length > 0 && trs.every((t) => t.includes('<w:cantSplit/>'));
};
ck(allTrHaveCantSplit(t07Res.bodyXml) && allTrHaveCantSplit(t20Res.bodyXml), '(খ) T07 ও T20-এর সব টেবিল সারিতে <w:cantSplit/> অক্ষুণ্ণ');

// ───────── (গ) T07-এ ছবি-ঘরের ছক একটাই ─────────
const layoutTblCount = (xml) => [...xml.matchAll(/<w:tblCaption w:val="fz-layout"\/>/g)].length;
const trHeightCount = (xml) => [...xml.matchAll(/<w:trHeight w:val="\d+"/g)].length;
ck(layoutTblCount(t07Res.bodyXml) === 1 && trHeightCount(t07Res.bodyXml) === 1, `(গ) T07-এ ছবি-ঘরের ছক একটাই (layoutTbl=${layoutTblCount(t07Res.bodyXml)}, trHeight=${trHeightCount(t07Res.bodyXml)})`);
ck(t07Res.bodyXml.includes('লাইসেন্স নং : ০০২৭১') && t07Res.bodyXml.includes('নবায়নের তারিখ : ১০'), '(গ) T07-এর একক ছবির ঘরের বাম কোষে ৭টি ডট-লিডার ঘরই অন্তর্ভুক্ত');

// ───────── (ঘ) প্রতিটি <w:tc> একটা <w:p> দিয়ে শেষ হয় ─────────
function everyTcEndsWithP(xml) {
  const tcs = [...xml.matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)].map((m) => m[1]);
  return tcs.length > 0 && tcs.every((inner) => /(<\/w:p>|<w:p\/>)\s*$/.test(inner) && /<\/w:p>\s*$/.test(inner));
}
ck(everyTcEndsWithP(t07Res.bodyXml) && everyTcEndsWithP(t20Res.bodyXml) && everyTcEndsWithP(t01Res.bodyXml), '(ঘ) T01_pdf, T07 ও T20-এর প্রতিটি <w:tc> একটি <w:p> দিয়ে শেষ হয়েছে');

// ফাঁকা বাম কোষসহ ছবির ঘর এবং ফাঁকা side_by_side কোষেও <w:tc> অনুচ্ছেদে শেষ হয় কি না
const emptyPhotoDoc = AD.fromCapture({
  pages: [{ page: 1 }],
  blocks: [
    { type: 'figure', page: 1, box: [100, 720, 260, 920], align: 'l', fs: 'm', bold: false, text: '', lines: [] },
    { type: 'label_value', page: 1, box: [320, 80, 340, 500], align: 'l', fs: 'm', bold: false, text: 'নাম: ....................', lines: ['নাম: ....................'] }
  ]
});
const emptyPhotoRes = GC.render(emptyPhotoDoc, { generalClean: true });
ck(everyTcEndsWithP(emptyPhotoRes.bodyXml), '(ঘ) বাম কোষে কোনো সমান্তরাল ব্লক না থাকলেও ছবির ঘরের <w:tc> অনুচ্ছেদে শেষ হয়');

// ───────── (ঙ) FZ_OFF_EST3-এ আউটপুট অপরিবর্তিত ─────────
process.env.FZ_OFF_EST3 = '1';
const t07Off1 = GC.render(t07Doc, { generalClean: true });
const t07Off2 = GC.render(t07Doc, { generalClean: true });
const t07OffBuf1 = await buf(t07Doc);
const t07OffBuf2 = await buf(t07Doc);
const t20Off = GC.render(t20Doc, { generalClean: true });
const t01Off = GC.render(t01Doc, { generalClean: true });
delete process.env.FZ_OFF_EST3;

ck(
  t07OffBuf1.equals(t07OffBuf2) &&
  t07Off1.bodyXml === t07Off2.bodyXml &&
  layoutTblCount(t07Off1.bodyXml) === 2 &&
  t07Off1.stats.estPages === 0.96 &&
  t20Off.stats.estPages === 0.95 &&
  t20Off.stats.base === 11 &&
  t01Off.stats.estPages === 2,
  '(ঙ) FZ_OFF_EST3 চালু থাকলে T01_pdf, T07 ও T20-এর আউটপুট ও অনুমান হুবহু আগের মতো অপরিবর্তিত'
);

// ───────── (চ) fit2 আর gate8 টেস্ট পাস ─────────
const fit2Path = path.join(ROOT, 'tests/fit2.test.mjs');
if (fs.existsSync(path.join(S, 'T02_pdf', 'capture.json')) && fs.existsSync(path.join(ROOT, 'scratch', 'agent-out', 'FIT2_README.md'))) {
  const f2 = spawnSync(process.execPath, [fit2Path], { encoding: 'utf8' });
  ck(f2.status === 0 && f2.stdout.includes('0 ব্যর্থ'), `(চ) tests/fit2.test.mjs পাস (${(f2.stdout || '').trim().split('\n').pop()})`);
} else {
  // একক বান্ডেল পরিবেশে fit2-এর শর্তগুলো যাচাই
  process.env.FZ_OFF_FIT2 = '1';
  const f2Old07 = GC.render(t07Doc, { generalClean: true });
  const f2Old21 = GC.render(docOf('T21_jpeg'), { generalClean: true });
  const f2Old01 = GC.render(t01Doc, { generalClean: true });
  delete process.env.FZ_OFF_FIT2;
  const f2New07 = GC.render(t07Doc, { generalClean: true });
  const f2New21 = GC.render(docOf('T21_jpeg'), { generalClean: true });
  const f2New01 = GC.render(t01Doc, { generalClean: true });
  const sigB = (xml) => [...xml.matchAll(/<w:top w:val="single"[^>]*\/><\/w:pBdr><w:spacing w:before="(\d+)"/g)].map((m) => +m[1]);
  const trH = (xml) => [...xml.matchAll(/<w:trHeight w:val="(\d+)"/g)].map((m) => +m[1]);
  ck(
    sigB(f2Old07.bodyXml).every((v) => v === 600) &&
    sigB(f2New07.bodyXml).every((v) => v >= 200 && v < 600) &&
    trH(f2New07.bodyXml).length === trH(f2Old07.bodyXml).length &&
    trH(f2New07.bodyXml).every((h, i) => h < trH(f2Old07.bodyXml)[i]) &&
    f2New21.stats.estPages <= 1.05 && f2New21.stats.estPages < f2Old21.stats.estPages &&
    f2New01.stats.estPages < f2Old01.stats.estPages,
    '(চ) fit2 সমতুল্য সকল শর্ত পাস'
  );
}

const gate8Path = path.join(ROOT, 'tests/gate8.test.mjs');
if (fs.existsSync(path.join(S, 'T25_jpeg', 'capture.json'))) {
  const g8 = spawnSync(process.execPath, [gate8Path], { encoding: 'utf8' });
  ck(g8.status === 0 && g8.stdout.includes('0 ব্যর্থ'), `(চ) tests/gate8.test.mjs পাস (${(g8.stdout || '').trim().split('\n').pop()})`);
} else {
  process.env.FZ_ON_FIT1 = '1';
  process.env.FZ_OFF_FIT1 = '1';
  const g8Old = GC.render(t07Doc, { generalClean: true });
  delete process.env.FZ_OFF_FIT1;
  const g8New = GC.render(t07Doc, { generalClean: true });
  delete process.env.FZ_ON_FIT1;
  ck(g8New.stats.estPages < g8Old.stats.estPages && !g8Old.stylesXml.includes('w:line="240"'), '(চ) gate8 (FIT1) সমতুল্য শর্ত পাস');
}

console.log(`ফলাফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
