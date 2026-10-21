/**
 * A07_SCORE_v3 — অফলাইন Node.js স্বয়ংক্রিয় পরীক্ষা (কোনো বাহ্যিক প্যাকেজ ছাড়া)
 * সুইচ: __FZ_ON_A07FIX3 / FZ_ON=A07FIX3 (এবং __FZ_OFF_A07FIX3 ওভাররাইড)
 * যাচাই করে:
 * ১) সুইচ বন্ধ থাকলে আউটপুট পূর্বের সাথে ১০০% অভিন্ন (বাইট-টু-বাইট) থাকে;
 * ২) সুইচ চালু থাকলে পাতা ১–৫ এর ১০টি অমিল লাইন, ৮টি হঠাৎ লাফ, ৫টি বাম-প্রান্তের ত্রুটি,
 *    মুছে যাওয়া শিরোনাম-আন্ডারলাইন এবং সংকুচিত টিক-চিত্র সম্পূর্ণরূপে সংশোধিত হয় এবং পাতা-সংখ্যা ৫-ই থাকে।
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// উৎপাদনের ১১টি ভিত্তি সুইচ সক্রিয়করণ (switch-defaults.js লোড না করে সরাসরি globalThis-এ স্থাপন)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH'
];
for (const sw of BASE_SWITCHES) {
  globalThis['__FZ_ON_' + sw] = true;
}

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const B = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const GOLDEN_DIR = path.join(
  ROOT,
  'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2+A14FIX3+WIDTH/a07'
);
const captureData = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'capture.json'), 'utf8'));
const measuresData = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'measures.json'), 'utf8'));
const goldenIrRaw = fs.readFileSync(path.join(GOLDEN_DIR, 'ir.json'), 'utf8');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err && err.stack ? err.stack : err}`);
  }
}

function getPageTable(page) {
  for (const band of page.bands || []) {
    for (const cell of band.cells || []) {
      for (const it of cell.items || []) {
        if (it && it.kind === 'table') return it;
      }
    }
  }
  return null;
}

function getPageFigure(page) {
  for (const band of page.bands || []) {
    for (const cell of band.cells || []) {
      for (const it of cell.items || []) {
        if (it && it.kind === 'figure') return it;
      }
    }
  }
  return null;
}

// ১) সুইচ হেল্পার ও আইসোলেশন পরীক্ষা (OFF বনাম ON বনাম __FZ_OFF_A07FIX3)
await test('১. সুইচ নিয়ন্ত্রণ: ডিফল্ট বন্ধ, __FZ_ON_A07FIX3 চালু এবং __FZ_OFF_A07FIX3 ওভাররাইড যাচাই', () => {
  delete globalThis.__FZ_ON_A07FIX3;
  delete globalThis.__FZ_OFF_A07FIX3;
  assert.equal(IR.a07Fix3On(), false);
  assert.equal(LF.isA07Fix3On(), false);
  assert.equal(B.a07Fix3On(), false);

  globalThis.__FZ_ON_A07FIX3 = true;
  assert.equal(IR.a07Fix3On(), true);
  assert.equal(LF.isA07Fix3On(), true);
  assert.equal(B.a07Fix3On(), true);

  globalThis.__FZ_OFF_A07FIX3 = true;
  assert.equal(IR.a07Fix3On(), false);
  assert.equal(LF.isA07Fix3On(), false);
  assert.equal(B.a07Fix3On(), false);
  delete globalThis.__FZ_OFF_A07FIX3;
  delete globalThis.__FZ_ON_A07FIX3;
});

await test('২. সুইচ বন্ধ অবস্থায় (OFF) পূর্বের আউটপুটের সাথে ১০০% বাইট-টু-বাইট অভিন্নতা এবং ON->OFF স্ন্যাপশট পুনরুদ্ধার', () => {
  globalThis.__FZ_ON_A07FIX3 = false;
  delete globalThis.__FZ_OFF_A07FIX3;

  const irOff1 = JSON.parse(goldenIrRaw);
  LF.fit(irOff1);
  const xmlOff1 = B.bodyXml(irOff1).xml;

  // একই IR বস্তুতে সুইচ চালু করে পুনরায় বন্ধ করলে পূর্বাবস্থায় হুবহু ফিরে আসা যাচাই
  globalThis.__FZ_ON_A07FIX3 = true;
  LF.fit(irOff1);
  const xmlOn = B.bodyXml(irOff1).xml;
  assert.notEqual(xmlOn, xmlOff1, 'সুইচ চালু হলে XML পরিবর্তিত হওয়া আবশ্যক');

  globalThis.__FZ_ON_A07FIX3 = false;
  LF.fit(irOff1);
  const xmlOffRestored = B.bodyXml(irOff1).xml;
  assert.equal(xmlOffRestored, xmlOff1, 'সুইচ বন্ধ করলে পূর্বের XML হুবহু পুনরুদ্ধার হওয়া আবশ্যক');
});

// সুইচ চালু করে মূল মেরামতসমূহ পরীক্ষা
globalThis.__FZ_ON_A07FIX3 = true;
delete globalThis.__FZ_OFF_A07FIX3;

const irOn = JSON.parse(goldenIrRaw);
LF.fit(irOn);
const { xml: docXmlOn } = B.bodyXml(irOn);

const builtIrOn = IR.build(captureData, measuresData.measures, measuresData.pageInfo);
LF.fit(builtIrOn);
const { xml: builtXmlOn } = B.bodyXml(builtIrOn);

await test('৩. পাতা-সংখ্যা ও উল্লম্ব পরিকল্পনা: ৫টি পাতাই অক্ষুণ্ণ এবং কোনো পাতায় সংকোচন বা উপচানো নেই (f === 1)', () => {
  assert.equal(irOn.pages.length, 5);
  assert.equal(builtIrOn.pages.length, 5);
  const sectCount = (docXmlOn.match(/<w:sectPr>/g) || []).length;
  assert.equal(sectCount, 5, 'ডকুমেন্টে ঠিক ৫টি সেকশন (পাতা) থাকতে হবে');
  for (let p = 0; p < 5; p++) {
    const plan1 = B.planPage(irOn.pages[p]);
    const plan2 = B.planPage(builtIrOn.pages[p]);
    assert.equal(plan1.f, 1, `পাতা ${p + 1}-এ উল্লম্ব ফাঁক সংকোচন গুণক f=1 হতে হবে`);
    assert.equal(plan2.f, 1, `IR.build পাতা ${p + 1}-এ উল্লম্ব ফাঁক সংকোচন গুণক f=1 হতে হবে`);
  }
});

await test('৪. পাতা ১, ২, ৩, ৪ ও ৫-এর প্রবাহ-শিরোনামে (flow heading) আন্ডারলাইন পুনরুদ্ধার ও ভ্রান্ত আন্ডারলাইন রোধ', () => {
  // পাতা ১ ব্যান্ড ১ (Block 1): আন্ডারলাইন পুনরুদ্ধার (y=95.75 রেখা)
  const p1Heading = irOn.pages[0].bands[1].cells[0].items[0];
  assert.equal(p1Heading.underline, true, 'পাতা ১ প্রধান শিরোনামের underline=true পুনরুদ্ধার হতে হবে');

  // পাতা ২ ব্যান্ড ১ (Block 8): আংশিক <u> সরিয়ে পূর্ণ underline=true নিশ্চিতকরণ
  const p2Heading = irOn.pages[1].bands[1].cells[0].items[0];
  assert.equal(p2Heading.underline, true, 'পাতা ২ প্রধান শিরোনামের পূর্ণ underline=true থাকতে হবে');
  assert.equal(/<\/?u>/i.test(p2Heading.lines[0]), false, 'পাতা ২ শিরোনামে খণ্ডিত <u> ট্যাগ থাকা যাবে না');

  // পাতা ৩ ব্যান্ড ১ (Block 14): আন্ডারলাইন পুনরুদ্ধার (y=84.75 রেখা)
  const p3Heading = irOn.pages[2].bands[1].cells[0].items[0];
  assert.equal(p3Heading.underline, true, 'পাতা ৩ প্রধান শিরোনামের underline=true পুনরুদ্ধার হতে হবে');

  // পাতা ৪ ব্যান্ড ১ (Block 21): কালি-বিহীন ভ্রান্ত আন্ডারলাইন বন্ধ থাকা (sH < sV)
  const p4Heading = irOn.pages[3].bands[1].cells[0].items[0];
  assert.equal(p4Heading.underline, false, 'পাতা ৪ শিরোনামে ভ্রান্ত underline=false থাকতে হবে');

  // পাতা ৫ ব্যান্ড ১ (Block 28) ও ব্যান্ড ২ (Block 29): উপ-শিরোনামের অক্ষর-ফাঁক ০.৫৫pt এবং ২য় শিরোনামের আন্ডারলাইন পুনরুদ্ধার (y=100.25 রেখা)
  const p5Sub1 = irOn.pages[4].bands[1].cells[0].items[0];
  const p5Sub2 = irOn.pages[4].bands[2].cells[0].items[0];
  assert.equal(p5Sub1.underline, false);
  assert.equal(p5Sub1.charSpacingPt, 0.55, 'পাতা ৫-এর ১ম উপ-শিরোনামের charSpacingPt=0.55 হতে হবে');
  assert.equal(p5Sub2.underline, true, 'পাতা ৫-এর ২য় উপ-শিরোনামের underline=true পুনরুদ্ধার হতে হবে');
});

await test('৫. পাতা ১: ছক-১ এর ফাঁকা বডি-সারিতে বাম কলামের খোলা প্রান্ত (dx0=-40 নিরসন), সারি ১–২ এর আংশিক আড়া-রেখা এবং দ্বি-কলাম স্বাক্ষরের বাম-প্রান্ত (dx0=-7 নিরসন)', () => {
  const p1 = irOn.pages[0];
  const tbl1 = getPageTable(p1);
  assert.equal(tbl1.gridFirst, true);
  assert.equal(tbl1.rows.length, 5);
  assert.deepEqual(tbl1._a07OpenLeftCol0Rows, { 1: true, 2: true, 3: true, 4: true });
  assert.equal(tbl1._a07EmptyBodyCol0Nil, true);
  assert.deepEqual(tbl1._a07PartialHRuleCols, { 1: [4, 5] });

  // দ্বি-কলাম স্বাক্ষর গ্রিড (Block 4 ও Block 5)
  const sigBand = p1.bands[4];
  assert.equal(sigBand.kind, 'grid');
  const leftSig = sigBand.cells[0].items[0];
  const rightSig = sigBand.cells[1].items[0];
  assert.equal(leftSig.fontPt, 12, 'বাম স্বাক্ষরের ফন্ট ১২pt হতে হবে');
  assert.equal(rightSig.fontPt, 12, 'ডান স্বাক্ষরের ফন্ট ১২pt হতে হবে');
  assert.equal(leftSig.centerShiftPt, 2.5, 'বাম স্বাক্ষরের কেন্দ্র-সরণ +২.৫pt হতে হবে');
  assert.equal(leftSig.lineSpacingPt, 14, 'বাম স্বাক্ষরের লাইন-পিচ ১৪pt হতে হবে');
  assert.equal(sigBand.y0, 393.1, 'স্বাক্ষর ব্যান্ডের y0 = 393.1pt হতে হবে');
});

await test('৬. পাতা ২: ছক-২ এর শিরোনাম-ফন্ট (১১pt/১২.২pt) পুনরুদ্ধার এবং সারি ৩–৪ এর আংশিক আড়া-রেখা (১টি অমিল লাইন নিরসন)', () => {
  const p2 = irOn.pages[1];
  const tbl2 = getPageTable(p2);
  assert.equal(tbl2.gridFirst, true);
  assert.equal(tbl2.rows.length, 5);
  assert.equal(tbl2.headFontPt, 11, 'পাতা ২ ছক-২ এর শিরোনাম ফন্ট ১১pt হতে হবে');
  assert.equal(tbl2._a07HeadPitchPt, 12.2, 'পাতা ২ ছক-২ এর শিরোনাম লাইন-পিচ ১২.২pt হতে হবে');
  assert.deepEqual(tbl2._a07PartialHRuleCols, { 3: [2, 3, 4, 5, 6, 7] });
});

await test('৭. পাতা ৩: ছক-৩ এর ফন্ট (১০.৫pt), সারি ০–১ আংশিক আড়া-রেখা এবং বহু-লাইনের সারির অভ্যন্তরীণ বিরতি (৫টি অমিল লাইন ও ৫টি হঠাৎ লাফ নিরসন)', () => {
  const p3 = irOn.pages[2];
  const tbl3 = getPageTable(p3);
  assert.equal(tbl3.fontPt, 10.5, 'পাতা ৩ ছক-৩ এর ফন্ট ১০.৫pt হতে হবে');
  assert.equal(tbl3._a07MultiLinePitch, 15.6);
  assert.equal(tbl3._a07RowVAlignTop, true);
  assert.equal(tbl3.rows.length, 16, 'পাতা ৩ ছক-৩ উপ-সারি ও ফাঁক-সারিসহ ১৬টি সারিতে বিভক্ত হতে হবে');
  assert.deepEqual(tbl3.gapRows, { 3: true, 6: true, 8: true, 11: true });
  assert.deepEqual(tbl3._a07NoVBorderRows, { 15: true });
  assert.deepEqual(tbl3._a07PartialHRuleCols, { 0: [2] });

  // মোট উচ্চতা অপরিবর্তিত থাকা যাচাই (৫৭৩.১pt)
  const sumRbh = Math.round(tbl3.rowHeightsPt.reduce((a, b) => a + b, 0) * 10) / 10;
  assert.equal(sumRbh, 573.1, 'উপ-সারিগুলোর উচ্চতার যোগফল মূল ছকের উচ্চতার (৫৭৩.১pt) সমান থাকতে হবে');
});

await test('৮. পাতা ৪ ও ৫: ছক-৪ এর সারি ৩–৬ আংশিক আড়া-রেখা ও সারি ১১ এর উপ-সারি বিভাজন (dx0=-12 ও ৩টি হঠাৎ লাফ নিরসন) এবং ছক-৫ এর ফন্ট (৮.৫pt)', () => {
  const p4 = irOn.pages[3];
  const tbl4 = getPageTable(p4);
  assert.equal(tbl4.gridFirst, true);
  assert.equal(tbl4.rows.length, 14, 'পাতা ৪ ছক-৪ এর শেষ সারি বিভাজনের পর মোট ১৪টি সারি হতে হবে');
  assert.deepEqual(tbl4.gapRows, { 12: true });
  assert.deepEqual(tbl4._a07OpenLeftCol0Rows, { 11: true });
  assert.deepEqual(tbl4._a07PartialHRuleCols, { 3: [1, 2, 3], 4: [1, 2, 3], 5: [1, 2, 3] });
  assert.equal(tbl4.rows[11][0], '১২.');
  assert.equal(tbl4.rows[13][1], 'যুক্ত করুন।');
  const sumRbh4 = Math.round(tbl4.rowHeightsPt.reduce((a, b) => a + b, 0) * 10) / 10;
  assert.equal(sumRbh4, 316.8, 'পাতা ৪ ছক-৪ এর মোট উচ্চতা ৩১৬.৮pt অক্ষুণ্ণ থাকতে হবে');

  const p5 = irOn.pages[4];
  const tbl5 = getPageTable(p5);
  assert.equal(tbl5.gridFirst, true);
  assert.equal(tbl5.fontPt, 8.5, 'পাতা ৫ ছক-৫ এর ফন্ট ৮.৫pt হতে হবে');
});

await test('৯. পাতা ১–৫ এর নিচের ৩০০-ডিপিআই টিক-চিত্রগুলোর (figure) প্রকৃত আকার ও _a07FigLeadPt সংরক্ষণ (পাতা ৪-এর চিত্র-বিভাজন নিরসন)', () => {
  const expectedFigs = [
    { w: 20.4, h: 15.6, lead: 3.6 },
    { w: 20.6, h: 19.4, lead: 4.0 },
    { w: 21.4, h: 19.0, lead: 4.1 },
    { w: 19.7, h: 17.8, lead: 3.7 },
    { w: 30.5, h: 17.8, lead: 3.5 }
  ];
  for (let p = 0; p < 5; p++) {
    const fig = getPageFigure(irOn.pages[p]);
    assert.ok(fig, `পাতা ${p + 1}-এ টিক-চিত্র থাকতে হবে`);
    assert.equal(fig.widthPt, expectedFigs[p].w, `পাতা ${p + 1} চিত্রের প্রস্থ সঠিক হতে হবে`);
    assert.equal(fig.heightPt, expectedFigs[p].h, `পাতা ${p + 1} চিত্রের উচ্চতা সঠিক হতে হবে`);
    assert.equal(fig._a07FigLeadPt, expectedFigs[p].lead, `পাতা ${p + 1} চিত্রের _a07FigLeadPt সঠিক হতে হবে`);
    assert.equal(B.itemH(fig), expectedFigs[p].h, `পাতা ${p + 1} চিত্রের itemH অতিরিক্ত +২pt যোগ করবে না`);
  }
});

await test('১০. পূর্ণাঙ্গ .docx বাইনারি নির্মাণ (B.build) ও XML বর্ডার-ট্যাগ যাচাই', async () => {
  assert.ok(docXmlOn.includes('<w:tcBorders><w:top w:val="nil"/><w:bottom w:val="nil"/><w:left w:val="nil"/><w:right w:val="nil"/></w:tcBorders>'), 'বর্ডারহীন ফাঁক-সারির (gapRows) চারপাশের বর্ডার nil থাকতে হবে');
  const docxBytes = await B.build(irOn, { type: 'uint8array' });
  assert.ok(docxBytes instanceof Uint8Array && docxBytes.byteLength > 10000, 'বৈধ .docx জিপ বাইনারি তৈরি হতে হবে');
  assert.equal(docxBytes[0], 0x50); // 'P'
  assert.equal(docxBytes[1], 0x4b); // 'K'
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
