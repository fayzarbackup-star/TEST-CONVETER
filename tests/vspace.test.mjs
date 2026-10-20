import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// প্রোডাকশন ডিফল্ট ৫টি সুইচ চালু করা (WRAPFIT, NESTBOX, TBLMERGE, A03FIX, A16FIX)
require(path.join(ROOT, 'js/layout-engine/faithful/switch-defaults.js'));
const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const B = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const A07_DIR = path.join(ROOT, 'qa/golden-data/runs/base5/a07');
const A16_DIR = path.join(ROOT, 'qa/golden-data/runs/base5/a16');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function setVSpace(on, offOverride = false) {
  delete globalThis.__FZ_ON_VSPACE;
  delete globalThis.__FZ_OFF_VSPACE;
  if (process && process.env) {
    delete process.env.__FZ_ON_VSPACE;
    delete process.env.__FZ_OFF_VSPACE;
    delete process.env.FZ_ON;
    delete process.env.FZ_OFF;
  }
  if (on) globalThis.__FZ_ON_VSPACE = true;
  if (offOverride) globalThis.__FZ_OFF_VSPACE = true;
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
  } catch (err) {
    failed++;
    console.error(`ব্যর্থ: ${name}\n  ${err && err.stack ? err.stack : err}`);
  }
}

// সুইচ বন্ধ অবস্থায় রেফারেন্স আউটপুট সংরক্ষণ
setVSpace(false);
const a07Measures = loadJson(path.join(A07_DIR, 'measures.json'));
const a16Measures = loadJson(path.join(A16_DIR, 'measures.json'));
const a07SavedIrRaw = fs.readFileSync(path.join(A07_DIR, 'ir.json'), 'utf8');
const a16SavedIrRaw = fs.readFileSync(path.join(A16_DIR, 'ir.json'), 'utf8');

const baseA07BuiltIr = IR.build(a07Measures.cap, a07Measures.measures, a07Measures.pageInfo);
LF.fit(baseA07BuiltIr);
const baseA07BuiltIrStr = JSON.stringify(baseA07BuiltIr);
const baseA07BuiltXml = B.bodyXml(baseA07BuiltIr).xml;

const baseA07SavedIr = JSON.parse(a07SavedIrRaw);
LF.fit(baseA07SavedIr);
const baseA07SavedXml = B.bodyXml(baseA07SavedIr).xml;
const baseA07Docx = await B.build(JSON.parse(a07SavedIrRaw), { JSZip: B.MiniJSZip, type: 'uint8array' });
const baseA07DocxHash = sha256(Buffer.from(baseA07Docx));

const baseA16BuiltIr = IR.build(a16Measures.cap, a16Measures.measures, a16Measures.pageInfo);
LF.fit(baseA16BuiltIr);
const baseA16BuiltIrStr = JSON.stringify(baseA16BuiltIr);
const baseA16BuiltXml = B.bodyXml(baseA16BuiltIr).xml;

const baseA16SavedIr = JSON.parse(a16SavedIrRaw);
LF.fit(baseA16SavedIr);
const baseA16SavedXml = B.bodyXml(baseA16SavedIr).xml;
const baseA16Docx = await B.build(JSON.parse(a16SavedIrRaw), { JSZip: B.MiniJSZip, type: 'uint8array' });
const baseA16DocxHash = sha256(Buffer.from(baseA16Docx));

await test('১. প্রোডাকশন ডিফল্ট ৫টি সুইচ (WRAPFIT, NESTBOX, TBLMERGE, A03FIX, A16FIX) সক্রিয় আছে', () => {
  assert.equal(Boolean(globalThis.__FZ_ON_WRAPFIT), true);
  assert.equal(Boolean(globalThis.__FZ_ON_NESTBOX), true);
  assert.equal(Boolean(globalThis.__FZ_ON_TBLMERGE), true);
  assert.equal(Boolean(globalThis.__FZ_ON_A03FIX), true);
  assert.equal(Boolean(globalThis.__FZ_ON_A16FIX), true);
  assert.equal(IR.vspaceOn(), false);
  assert.equal(LF.isVSpaceOn(), false);
  assert.equal(B.vspaceOn(), false);
});

await test('২. VSPACE বন্ধ থাকলে এবং __FZ_OFF_VSPACE ওভাররাইডে a07 ও a16 আউটপুট বাইট-বাই-বাইট অপরিবর্তিত থাকে', async () => {
  setVSpace(true, true);
  assert.equal(IR.vspaceOn(), false);
  assert.equal(LF.isVSpaceOn(), false);
  assert.equal(B.vspaceOn(), false);

  const a07Ir = IR.build(a07Measures.cap, a07Measures.measures, a07Measures.pageInfo);
  LF.fit(a07Ir);
  assert.equal(JSON.stringify(a07Ir), baseA07BuiltIrStr);
  assert.equal(B.bodyXml(a07Ir).xml, baseA07BuiltXml);

  const a07Saved = JSON.parse(a07SavedIrRaw);
  LF.fit(a07Saved);
  assert.equal(B.bodyXml(a07Saved).xml, baseA07SavedXml);
  const a07Docx = await B.build(JSON.parse(a07SavedIrRaw), { JSZip: B.MiniJSZip, type: 'uint8array' });
  assert.equal(sha256(Buffer.from(a07Docx)), baseA07DocxHash);

  const a16Ir = IR.build(a16Measures.cap, a16Measures.measures, a16Measures.pageInfo);
  LF.fit(a16Ir);
  assert.equal(JSON.stringify(a16Ir), baseA16BuiltIrStr);
  assert.equal(B.bodyXml(a16Ir).xml, baseA16BuiltXml);

  const a16Saved = JSON.parse(a16SavedIrRaw);
  LF.fit(a16Saved);
  assert.equal(B.bodyXml(a16Saved).xml, baseA16SavedXml);
  const a16Docx = await B.build(JSON.parse(a16SavedIrRaw), { JSZip: B.MiniJSZip, type: 'uint8array' });
  assert.equal(sha256(Buffer.from(a16Docx)), baseA16DocxHash);
  setVSpace(false);
});

await test('৩. FZ_ON=VSPACE পরিবেশ-চলক ও __FZ_ON_VSPACE গ্লোবাল সুইচ সঠিকভাবে কাজ করে', () => {
  setVSpace(false);
  process.env.FZ_ON = 'VSPACE';
  assert.equal(IR.vspaceOn(), true);
  assert.equal(LF.isVSpaceOn(), true);
  assert.equal(B.vspaceOn(), true);
  process.env.FZ_OFF = 'VSPACE';
  assert.equal(IR.vspaceOn(), false);
  assert.equal(LF.isVSpaceOn(), false);
  assert.equal(B.vspaceOn(), false);
  setVSpace(false);
});

await test('৪. a07 পাতা ১: VSPACE চালু থাকলে দ্বি-কলাম স্বাক্ষর গ্রিড, ছক-১ rowHeightsExact এবং চিত্রের ঠিক উচ্চতা পুনরুদ্ধার হয়', () => {
  setVSpace(true);
  const ir = JSON.parse(a07SavedIrRaw);
  LF.fit(ir);
  const p1 = ir.pages[0];
  const plan = B.planPage(p1);

  // ছক-১: ৫ সারি ও rowHeightsExact = true
  const tbl = p1.bands[3].cells[0].items[0];
  assert.equal(tbl.rows.length, 5);
  assert.equal(tbl.rowHeightsExact, true);

  // ব্যান্ড ৪ ও ৫ একীভূত হয়ে দ্বি-কলামের গ্রিড ব্যান্ডে রূপান্তরিত
  const sigBand = p1.bands[4];
  assert.equal(sigBand.kind, 'grid');
  assert.equal(sigBand.cells.length, 2);
  const leftSig = sigBand.cells[0].items[0];
  const rightSig = sigBand.cells[1].items[0];
  assert.equal(leftSig.fontPt, 12.5);
  assert.equal(leftSig.lines.length, 2);
  assert.equal(leftSig.lineSpacingPt, 13.5);
  assert.equal(leftSig.spaceBeforePt, 0);
  assert.equal(rightSig.spaceBeforePt, 0);

  // নিচের পৃষ্ঠা-নম্বর চিত্রের উচ্চতা +২pt স্ফীতি ছাড়াই ১৩.২pt
  const figEl = plan.els[plan.els.length - 1];
  assert.equal(figEl.it.kind, 'figure');
  assert.equal(figEl.h, 13.2);
  setVSpace(false);
});

await test('৫. a07 পাতা ২: VSPACE চালু থাকলে ছক-২-এর ৩ সারি থেকে ৫ সারি, ৯৮.৯pt শিরোনাম-উচ্চতা ও ১৩.৮pt লাইন-পিচ পুনরুদ্ধার হয়', () => {
  setVSpace(true);
  const ir = JSON.parse(a07SavedIrRaw);
  LF.fit(ir);
  const p2 = ir.pages[1];
  const tbl = p2.bands[3].cells[0].items[0];

  assert.equal(tbl.rows.length, 5);
  assert.deepEqual(tbl.rowHeightsPt, [98.9, 14.4, 42.6, 28.4, 28.4]);
  assert.equal(tbl.rowHeightsExact, true);
  assert.equal(tbl.headFontPt, 11.5);
  assert.equal(tbl._a07HeadPitchPt, 13.8);

  const xml = B.paraXml(tbl, 0, { media: [], availW: 534.7 });
  assert.ok(xml.includes('w:line="276" w:lineRule="exact"'), 'শিরোনাম সারিতে ১৩.৮pt (276 dxa) exact লাইন-পিচ থাকতে হবে');
  setVSpace(false);
});

await test('৬. a07 পাতা ৩: VSPACE চালু থাকলে ছক-৩-এর বাড়তি কলাম ট্যাবে ভাঁজ, ১১.৫pt ফন্ট ও ১৫.৬pt বহু-লাইন পিচ (w:line="312") কার্যকর হয়', () => {
  setVSpace(true);
  const ir = JSON.parse(a07SavedIrRaw);
  LF.fit(ir);
  const p3 = ir.pages[2];
  const tbl = p3.bands[2].cells[0].items[0];

  assert.equal(tbl.rows[0].length, 3);
  assert.equal(tbl.fontPt, 11.5);
  assert.equal(tbl._a07MultiLinePitch, 15.6);
  // সারি ৫ (৬. ইনোভেশন, ৬১.৪৪pt) ২ অনুচ্ছেদে ৪ লাইনে বিভক্ত
  assert.equal(tbl.rows[5][2].split('\n').length, 4);

  const xml = B.paraXml(tbl, 0, { media: [], availW: 543.6 });
  assert.ok(xml.includes('w:line="312" w:lineRule="exact"'), 'বহু-লাইনের ফরম ঘরে ১৫.৬pt (312 dxa) exact লাইন-পিচ থাকতে হবে');
  setVSpace(false);
});

await test('৭. a07 পাতা ৪ ও ৫: VSPACE চালু থাকলে কোলন কলাম পূরণ, ২-লাইনের সারি ভাঙা এবং শিরোনাম ও এসিআর ছকের ফন্ট সংশোধিত হয়', () => {
  setVSpace(true);
  const ir = JSON.parse(a07SavedIrRaw);
  LF.fit(ir);

  // পাতা ৪
  const p4 = ir.pages[3];
  const h4 = p4.bands[1].cells[0].items[0];
  assert.equal(h4.fontPt, 17.5);
  const tbl4 = p4.bands[2].cells[0].items[0];
  assert.equal(tbl4.rows[2][2], ':');
  assert.equal(tbl4.rows[4][2], ':');
  assert.deepEqual(tbl4.fullVRule, [true, true, true]);
  assert.equal(tbl4.rows[3][1].split('\n').length, 2);
  assert.equal(tbl4.rows[4][1].split('\n').length, 2);
  assert.equal(tbl4.rows[8][1].split('\n').length, 2);

  // পাতা ৫
  const p5 = ir.pages[4];
  const h5 = p5.bands[1].cells[0].items[0];
  assert.equal(h5.fontPt, 14);
  const tbl5 = p5.bands[5].cells[0].items[0];
  assert.equal(tbl5.fontPt, 9.5);
  setVSpace(false);
});

await test('৮. a16 পাতা ১: VSPACE চালু থাকলে স্বাক্ষর চিত্রের স্ফীত উচ্চতা (৩৫->২৬.৯pt) ও ক্রমিক তালিকার লাইন-পিচ/before ফাঁক সংশোধিত হয়', () => {
  setVSpace(true);
  const ir = JSON.parse(a16SavedIrRaw);
  LF.fit(ir);
  const p1 = ir.pages[0];
  const plan = B.planPage(p1);

  // ব্যান্ড ৪: স্বাক্ষর চিত্রের উচ্চতা ৩৫pt থেকে ২৬.৯pt-এ পুনরুদ্ধার এবং +২pt স্ফীতি রোধ
  const fig = p1.bands[4].cells[0].items[0];
  assert.equal(fig.heightPt, 26.9);
  assert.equal(plan.els[4].h, 26.9);

  // ব্যান্ড ৯ (২.) ও ব্যান্ড ১১ (৪.): প্রকৃত লাইন-পিচ (১৩.৫pt ও ১৪.৮pt) এবং ব্যান্ড ১০-এর before ফাঁক (≥ ২pt) পুনরুদ্ধার
  const b9 = p1.bands[9].cells[0].items[0];
  const b11 = p1.bands[11].cells[0].items[0];
  assert.equal(b9.lineSpacingPt, 13.5);
  assert.equal(b11.lineSpacingPt, 14.8);
  assert.ok(plan.els[10].before >= 2.0, `ব্যান্ড ১০-এর before ফাঁক (${plan.els[10].before}) অন্তত ২.০pt হতে হবে`);

  // stripGhostDots ও planPage-এর পরেও _a16SingleParaList অক্ষত থেকে একক <w:p> অনুচ্ছেদ তৈরি করে
  const b9Xml = B.paraXml(plan.els[9].it, plan.els[9].before, { media: [], availW: 467.8 });
  const pCount = (b9Xml.match(/<w:p>/g) || []).length;
  assert.equal(pCount, 1, '২-লাইনের ক্রমিক আইটেম একক <w:p> অনুচ্ছেদে রেন্ডার হতে হবে');
  assert.ok(b9Xml.includes('w:line="270" w:lineRule="exact"'), 'ব্যান্ড ৯-এ ১৩.৫pt (270 dxa) exact লাইন-উচ্চতা থাকতে হবে');
  setVSpace(false);
});

await test('৯. a16 পাতা ৩–৯: VSPACE চালু থাকলে অণু-স্বাক্ষর চিত্রগুলোর ছাঁটা উচ্চতা ও প্রস্থ-অনুপাত প্রকৃত মাপে পুনরুদ্ধার হয়', () => {
  setVSpace(true);
  const ir = JSON.parse(a16SavedIrRaw);
  LF.fit(ir);

  const expectedFigs = [
    { page: 3, band: 3, h: 25.2, w: 58.4 },
    { page: 4, band: 2, h: 25.2, w: 51.6 },
    { page: 6, band: 5, h: 31.1, w: 70.4 },
    { page: 7, band: 2, h: 25.2, w: 57.5 },
    { page: 8, band: 5, h: 28.6, w: 61.9 },
    { page: 9, band: 5, h: 28.6, w: 64.1 }
  ];

  for (const exp of expectedFigs) {
    const p = ir.pages[exp.page - 1];
    const plan = B.planPage(p);
    const fig = p.bands[exp.band].cells[0].items[0];
    assert.equal(fig.kind, 'figure');
    assert.equal(fig.heightPt, exp.h, `পাতা ${exp.page}-এর অণু-স্বাক্ষর উচ্চতা ${exp.h}pt হতে হবে`);
    assert.equal(fig.widthPt, exp.w, `পাতা ${exp.page}-এর অণু-স্বাক্ষর প্রস্থ ${exp.w}pt হতে হবে`);
    assert.equal(B.itemH(fig), exp.h, `পাতা ${exp.page}-এর অণু-স্বাক্ষর itemH ${exp.h}pt হতে হবে`);
  }
  setVSpace(false);
});

await test('১০. a16 পাতা ৩, ৫, ৬, ৮ ও ৯: শিরোনাম ফন্ট, ছকের শীর্ষ-রেখা (srcRulesPt[0]) এবং পাতা ৯ সারি ১-এর ১২pt স্ফীতি ও ক্রমশ সরণ রোধ', () => {
  setVSpace(true);
  const ir = JSON.parse(a16SavedIrRaw);
  LF.fit(ir);

  // পাতা ৩ উপ-শিরোনাম ফন্ট ১৪pt -> ১৩.৫pt
  assert.equal(ir.pages[2].bands[1].cells[0].items[0].fontPt, 13.5);
  // পাতা ৫ ছকের নিচের ২-লাইনের মোটা নির্দেশনার লাইন-পিচ ১৫.৮pt -> ১৩.৫pt
  assert.equal(ir.pages[4].bands[5].cells[0].items[0].lineSpacingPt, 13.5);
  // পাতা ৬ শিরোনাম ফন্ট ১৭.৫pt -> ১৫.৫pt এবং ছকের শীর্ষ-রেখা ১৮৩.৮pt -> ১৮২.৩pt
  assert.equal(ir.pages[5].bands[0].cells[0].items[0].fontPt, 15.5);
  assert.equal(ir.pages[5].bands[4].cells[0].items[0].rect.y, 182.3);
  // পাতা ৮ ছকের শীর্ষ-রেখা ১২৯.৬pt -> ১২৭.৭pt (অতিরিক্ত ফাঁকা স্পেসার অনুচ্ছেদ বিলোপ)
  const plan8 = B.planPage(ir.pages[7]);
  assert.equal(ir.pages[7].bands[4].cells[0].items[0].rect.y, 127.7);
  assert.equal(plan8.els[4].before, 0);

  // পাতা ৯ ছকের শীর্ষ-রেখা ১৩২.০pt -> ১৩০.২pt এবং সারি ১ (১। ক)-এর কৃত্রিম \n অপসারণ
  const p9 = ir.pages[8];
  const plan9 = B.planPage(p9);
  const tbl9 = p9.bands[4].cells[0].items[0];
  assert.equal(tbl9.rect.y, 130.2);
  assert.equal(plan9.els[4].before, 0);
  assert.equal(tbl9.rows[1][1].includes('\n'), false, 'পাতা ৯ সারি ১-এ কৃত্রিম \\n না থেকে স্বাভাবিক ২-লাইনের মোড়ানো থাকতে হবে');
  setVSpace(false);
});

await test('১১. VSPACE চালু অবস্থায় capture + measures থেকে পূর্ণ IR ও বৈধ .docx ফাইল তৈরি হয়', async () => {
  setVSpace(true);
  const a07Ir = IR.build(a07Measures.cap, a07Measures.measures, a07Measures.pageInfo);
  LF.fit(a07Ir);
  const a07Docx = await B.build(a07Ir, { JSZip: B.MiniJSZip, type: 'uint8array' });
  assert.ok(a07Docx instanceof Uint8Array && a07Docx.byteLength > 10000);
  const a07Zip = await B.MiniJSZip.loadAsync(a07Docx);
  const a07Xml = await a07Zip.file('word/document.xml').async('string');
  assert.ok(a07Xml.includes('<w:document') && a07Xml.includes('w:line="312" w:lineRule="exact"'));

  const a16Ir = IR.build(a16Measures.cap, a16Measures.measures, a16Measures.pageInfo);
  LF.fit(a16Ir);
  const a16Docx = await B.build(a16Ir, { JSZip: B.MiniJSZip, type: 'uint8array' });
  assert.ok(a16Docx instanceof Uint8Array && a16Docx.byteLength > 10000);
  const a16Zip = await B.MiniJSZip.loadAsync(a16Docx);
  const a16Xml = await a16Zip.file('word/document.xml').async('string');
  assert.ok(a16Xml.includes('<w:document') && !a16Ir.pages[8].bands[4].cells[0].items[0].rows[1][1].includes('\n'));
  setVSpace(false);
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
