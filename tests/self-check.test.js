'use strict';

// Phase 2B-3 gates — স্ব-যাচাই (self-check.js) + রাউটিং (অচেনা ধরন → GENERAL_CLEAN) + ফলব্যাক। Gemini লাগে না।
// ক্যাশ-করা নমুনা: 1 চেনা (T01) + 3 অচেনা (T08/T17/T19); 4টি ইচ্ছাকৃত ভাঙা ইনপুট।
// চালানো: node tests/self-check.test.js

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const g = globalThis;
g.EquationConverter = require(path.join(ROOT, 'js/equation-converter.js'));
g.BanglaConverter = require(path.join(ROOT, 'js/bangla-converter-engine.js'));
g.TextRunProcessor = require(path.join(ROOT, 'js/layout-engine/text-run-processor.js'));
g.jszip = require(path.join(ROOT, 'js/jszip.min.js'));
const JSZip = g.jszip;
const SC = require(path.join(ROOT, 'js/layout-engine/self-check.js'));
const CC = require(path.join(ROOT, 'js/layout-engine/clean-composer.js'));
const E = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
g.ExportDualEngine = E;

let gates = 0;
const check = (cond, name) => { assert.ok(cond, name); gates++; };
const S = path.join(ROOT, 'scratch/samples/new/2026-10-22');
const rd = (p) => fs.readFileSync(p, 'utf8');
const partsOf = async (buf) => {
  const z = await JSZip.loadAsync(buf);
  return { documentXml: await z.file('word/document.xml').async('string'), stylesXml: await z.file('word/styles.xml').async('string') };
};

// kept-text.md-এ ছকের সারি "ক | খ" আকারে; OCR Markdown-এর মতো "| ক | খ |" + বিভাজক-সারি বানাই
function asMd(txt) {
  const out = []; let inT = false;
  for (const l of txt.split(/\r?\n/)) {
    if (l.includes(' | ')) {
      out.push('| ' + l.trim() + ' |');
      if (!inT) { out.push('|' + l.split(' | ').map(() => '---').join('|') + '|'); inT = true; }
    } else { inT = false; out.push(l); }
  }
  return out.join('\n');
}

(async () => {
  // ১) ইউনিট: শব্দ-জোড়া, লেআউট-ছক
  const mk = (b) => `<w:document><w:body>${b}</w:body></w:document>`;
  const split = mk('<w:p><w:r><w:t>ধান</w:t></w:r><w:r><w:t>-</w:t></w:r><w:r><w:t>৬</w:t></w:r></w:p>');
  check(SC.selfCheck(split, 'ধান-৬', {}).checks.c1.value === 1, 'c1: রান-ভাঙা হাইফেন শব্দ ঠিক গোনা হয়');
  const layoutTbl = '<w:tbl><w:tblPr><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/></w:tblBorders></w:tblPr><w:tr><w:tc><w:p/></w:tc><w:tc><w:p/></w:tc></w:tr></w:tbl>';
  const realTbl = '<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single"/></w:tblBorders></w:tblPr><w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl>';
  check(SC.isLayoutTable(layoutTbl) && !SC.isLayoutTable(realTbl), 'c3: nil-বর্ডার ছক = লেআউট-ছক');
  check(SC.selfCheck(mk(layoutTbl + '<w:p><w:r><w:t>ক</w:t></w:r></w:p>'), 'ক', { expected: { tables: [] } }).checks.c3.pass, 'c3: লেআউট-ছক গোনা হয় না');

  // ২) চেনা ফাইল (T01) — পাশ + এঞ্জিন-গেট
  const t01dir = path.join(S, 'out-1b3/T01_jpeg');
  const have = fs.existsSync(path.join(t01dir, 'ocr-text.md'));
  let t01Parts = null, t01Text = '', t01Buf = null;
  if (have) {
    t01Text = rd(path.join(t01dir, 'ocr-text.md'));
    t01Buf = fs.readFileSync(path.join(t01dir, 'T01_jpeg-unicode_docx.docx'));
    t01Parts = await partsOf(t01Buf);
    const r = SC.selfCheck(t01Parts, t01Text, { docType: 'PROTTOYON' });
    check(r.pass && r.errors.length === 0, 'চেনা T01: সব চেক পাশ');
    const blob = await E.generateModernDocx(t01Text, 'PROTTOYON', {});
    check(E.lastSelfCheck && E.lastSelfCheck.pass && E.lastSelfCheck.used === 'template', 'চেনা T01: এঞ্জিনে স্ব-যাচাই পাশ, টেমপ্লেট থাকে');
    check(blob && (blob.size > 1000 || blob.length > 1000), 'চেনা T01: ফাইল তৈরি');
  }

  // ৩) অচেনা ৩টি — GENERAL_CLEAN পথ, স্ব-যাচাই পাশ
  const unknown = {};
  for (const id of ['T08_jpeg', 'T17_jpeg', 'T19_jpeg']) {
    const p = path.join(S, 'out-2a', id, 'kept-text.md');
    if (!fs.existsSync(p)) continue;
    unknown[id] = asMd(rd(p));
    const blob = await E.generateModernDocx(unknown[id], 'GENERAL', {});
    const parts = await partsOf(Buffer.from(await blob.arrayBuffer ? await blob.arrayBuffer() : blob));
    check(/Kalpurush|w:sz/.test(parts.documentXml + parts.stylesXml), id + ': ফাইল তৈরি');
    check(E.lastSelfCheck && E.lastSelfCheck.pass, id + ': অচেনা ধরন GENERAL_CLEAN → স্ব-যাচাই পাশ');
    check(typeof E._generalCleanRender(unknown[id], {}).stats.base === 'number', id + ': রাউটিং GENERAL_CLEAN (doc-model) দিয়ে');
  }

  // ৪) ইচ্ছাকৃত ভাঙা ইনপুট ৪টি
  const T17 = unknown['T17_jpeg'] || 'শিরোনাম\n\nএকটি দুইটি তিনটি চারটি পাঁচটি ছয়টি সাতটি আটটি নয়টি দশটি';
  const goodBlob = await E.generateModernDocx(T17, 'GENERAL', {});
  const goodParts = await partsOf(Buffer.from(await (goodBlob.arrayBuffer ? goodBlob.arrayBuffer() : goodBlob)));
  // (ক) লেখা বাদ
  const dropped = goodParts.documentXml.replace(/<w:t(\s[^>]*)?>[^<]*<\/w:t>/g, (m, a, off) => (off % 2 ? m : '<w:t></w:t>'));
  const rA = SC.selfCheck({ documentXml: dropped, stylesXml: goodParts.stylesXml }, T17, {});
  check(!rA.pass && !rA.checks.c1.pass && rA.errors.some((e) => /লেখা/.test(e)), 'ভাঙা (ক) লেখা বাদ: c1 ব্যর্থ + বাংলা বার্তা');
  // (খ) ভাঙা ছক — ৫×৩ প্রত্যাশিত, পেল ১×১
  const mdTbl = '| ক | খ | গ |\n|---|---|---|\n| ১ | ২ | ৩ |\n| ৪ | ৫ | ৬ |\n| ৭ | ৮ | ৯ |\n| ১০ | ১১ | ১২ |';
  const brokenTbl = mk('<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="100"/></w:tblGrid><w:tr><w:tc><w:p><w:r><w:t>ক খ গ ১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯ ১০ ১১ ১২</w:t></w:r></w:p></w:tc></w:tr></w:tbl>');
  const rB = SC.selfCheck(brokenTbl, mdTbl, {});
  check(!rB.pass && !rB.checks.c3.pass && rB.errors.some((e) => /ছক/.test(e)), 'ভাঙা (খ) ভাঙা ছক: c3 ব্যর্থ + বাংলা বার্তা');
  // (গ) খালি বডি
  const rC = SC.selfCheck(mk('<w:p/>'), T17, {});
  check(!rC.pass && !rC.checks.c1.pass && !rC.checks.c5.pass && rC.errors.length >= 2, 'ভাঙা (গ) খালি বডি: c1+c5 ব্যর্থ');
  // (ঘ) ভুল দিক
  const rD = SC.selfCheck(goodParts, T17, { orientation: 'landscape' });
  check(!rD.pass && !rD.checks.c8.pass && rD.errors.some((e) => /পাতার দিক/.test(e)), 'ভাঙা (ঘ) ভুল দিক: c8 ব্যর্থ + বাংলা বার্তা');

  // ৫) ফলব্যাক: ভাঙা টেমপ্লেট-আউটপুট → GENERAL_CLEAN-এ পুনর্নির্মাণ
  const emptyBlob = await CC.packDocx('<w:p/>', '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>');
  const fixed = await E._selfCheckGate(emptyBlob, T17, 'GENERAL', {});
  check(E.lastSelfCheck.pass && E.lastSelfCheck.used === 'GENERAL_CLEAN' && fixed !== emptyBlob, 'ফলব্যাক: খালি ফাইল → GENERAL_CLEAN, পাশ');
  // দুটোই ব্যর্থ (দিক) → ভালোটা + বাংলা তালিকা, কখনো খালি হাতে নয়
  const worse = await E._selfCheckGate(emptyBlob, T17, 'GENERAL', { expectOrientation: 'landscape' });
  check(!E.lastSelfCheck.pass && E.lastSelfCheck.errors.length >= 1 && E.lastSelfCheck.used === 'GENERAL_CLEAN' && worse && worse !== emptyBlob, 'ফলব্যাক: দুটোই ব্যর্থ → ভালোটা (GENERAL_CLEAN) + ত্রুটি-তালিকা');
  if (have) {
    const keep = await E._selfCheckGate(t01Buf, t01Text, 'PROTTOYON', { expectOrientation: 'landscape' });
    check(!E.lastSelfCheck.pass && E.lastSelfCheck.errors.length >= 1 && keep, 'ফলব্যাক: চেনা ফাইল দুটোই ব্যর্থ → কিছু একটা ফেরত + তালিকা');
  }
  // বন্ধ-সুইচ
  const off = await E._selfCheckGate(emptyBlob, T17, 'GENERAL', { selfCheck: false });
  check(off === emptyBlob, 'selfCheck:false → গেট বন্ধ');
  // বিজয় ও পরীক্ষা-ধরন ছোঁয়া হয় না
  check((await E._selfCheckGate(emptyBlob, T17, 'EXAM_CQ', {})) === emptyBlob, 'পরীক্ষা-ধরন গেটের বাইরে');

  console.log(`self-check: ${gates} passed`);
})().catch((e) => { console.error('FAIL', e && e.stack || e); process.exit(1); });
