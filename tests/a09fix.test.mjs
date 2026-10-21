/**
 * A09_SCORE_v1 ইউনিট টেস্ট (tests/a09fix.test.mjs)
 * সুইচ: __FZ_ON_A09FIX / FZ_ON=A09FIX (এবং __FZ_OFF_A09FIX / FZ_OFF=A09FIX)
 *
 * যাচাই করা হয়েছে:
 * ১) সুইচ বন্ধ (OFF) অবস্থায় layout-ir, line-fit এবং faithful-docx-builder-এর আউটপুট শতভাগ অপরিবর্তিত (byte-for-byte identical) থাকে।
 * ২) __FZ_OFF_A09FIX = true থাকলে __FZ_ON_A09FIX = true থাকা সত্ত্বেও সুইচ নিষ্ক্রিয় থাকে।
 * ৩) সুইচ চালু (ON) অবস্থায় নমুনা a09-এ:
 *    - ব্যান্ড ০ ('সংযোজনী-৭') ও ব্যান্ড ১ (কেন্দ্রীভূত শিরোনাম 'আনুতোষিক ও অবসর ভাতা...')-এর ফন্ট ১৪.৫pt থেকে ১৪pt-এ সংশোধিত হয় (w:sz="28");
 *    - ব্যান্ড ৮ (২-লাইনের বাম-ইনডেন্ট সমাপ্তি অনুচ্ছেদ)-এর লাইন-পিচ ১২.৭pt থেকে ১৩.৯pt-এ সংশোধিত হয় (w:line="278");
 *    - ব্যান্ড ৯ (১০-কলাম, ১৫-সারির ফাঁকা-বডি ফরম-ছক)-এর শিরোনাম-সারিতে ফন্ট ৮.৫pt থেকে ১১.৫pt (w:sz="23"), বোল্ড (<w:b/>), শীর্ষ প্রান্তিককরণ (<w:vAlign w:val="top"/>), ১৪.০pt লাইন-পিচ (w:line="280"), কলাম ৫–৭-এর সঠিক ক্রম ('মনোনীত হার(%)', 'বৈবাহিক অবস্থা', 'প্রতিবন্ধিতা') এবং ২–৩ লাইনের স্বাভাবিক শব্দ-ভাঙন পুনরুদ্ধার হয়;
 *    - ব্যান্ড ১০ ('২। ...' ৩-লাইনের ক্রমিক অনুচ্ছেদ)-এর লাইন-পিচ ১৪.৯pt থেকে ১৩.৯pt-এ সংশোধিত হয় (w:line="278");
 *    - ব্যান্ড ১২ ('বি:দ্র: ...' ১-লাইনের ইনডেন্টযুক্ত অনুচ্ছেদ)-এ ফন্ট ১১.৫pt-এ সংকোচনের বদলে প্রকৃত ১২pt ফন্ট (w:sz="24") ও হালকা অক্ষর-সংকোচন (charSpacingPt = -0.15, <w:spacing w:val="-3"/>) প্রযুক্ত হয়;
 *    - ব্যান্ড ১৪ (ডান-প্রান্তের ২-লাইনের সীলমোহর/স্বাক্ষর ব্লক)-এর লাইন-পিচ ১৪.৯pt থেকে ১৪.৪pt-এ (w:line="288") সংশোধিত হয় এবং ঝুলন্ত ইনডেন্ট (_origSigInd) সংরক্ষিত থাকে;
 *    - সম্পূর্ণ নথিটি কঠোরভাবে ১ পাতায় সংরক্ষিত থাকে।
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// switch-defaults.js সরাসরি রিকোয়ার না করে ভিত্তি সুইচগুলো স্পষ্টভাবে সেট করা হচ্ছে
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES', 'A07FIX3', 'A14FIX4'
];

function setBaseSwitches() {
  for (const k of Object.keys(globalThis)) {
    if (k.startsWith('__FZ_ON_') || k.startsWith('__FZ_OFF_')) {
      delete globalThis[k];
    }
  }
  for (const sw of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + sw] = true;
  }
}

setBaseSwitches();

const LayoutIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LineFit = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const Builder = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

function findA09Dir() {
  const candidates = [
    path.join(ROOT, 'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2+A14FIX3+WIDTH+A16FIX3+A14RULES+A07FIX3+A14FIX4/a09'),
    path.join(ROOT, 'qa/golden-data/asis/a09')
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'capture.json')) && fs.existsSync(path.join(c, 'ir.json'))) {
      return c;
    }
  }
  const runsDir = path.join(ROOT, 'qa/golden-data/runs');
  if (fs.existsSync(runsDir)) {
    for (const entry of fs.readdirSync(runsDir)) {
      const p = path.join(runsDir, entry, 'a09');
      if (fs.existsSync(path.join(p, 'capture.json')) && fs.existsSync(path.join(p, 'ir.json'))) {
        return p;
      }
    }
  }
  throw new Error('a09 golden data directory not found');
}

const a09Dir = findA09Dir();
const rawCap = JSON.parse(fs.readFileSync(path.join(a09Dir, 'capture.json'), 'utf8'));
const rawMeas = JSON.parse(fs.readFileSync(path.join(a09Dir, 'measures.json'), 'utf8'));
const rawGoldIrStr = fs.readFileSync(path.join(a09Dir, 'ir.json'), 'utf8');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err && err.stack ? err.stack : err}`);
    failed++;
  }
}

console.log('=== A09_SCORE_v1 (__FZ_ON_A09FIX) ইউনিট টেস্ট ===');

// ১) সুইচ হেল্পার ও OFF বনাম ON গেটিং যাচাই
test('১. সুইচ বন্ধ (OFF) ও __FZ_OFF_A09FIX ওভাররাইড অবস্থায় গেট-ফাংশন false রিটার্ন করে', () => {
  setBaseSwitches();
  delete globalThis.__FZ_ON_A09FIX;
  delete globalThis.__FZ_OFF_A09FIX;
  assert.equal(LayoutIR.a09FixOn(), false);
  assert.equal(LineFit.isA09FixOn(), false);
  assert.equal(Builder.a09FixOn(), false);

  globalThis.__FZ_ON_A09FIX = true;
  assert.equal(LayoutIR.a09FixOn(), true);
  assert.equal(LineFit.isA09FixOn(), true);
  assert.equal(Builder.a09FixOn(), true);

  globalThis.__FZ_OFF_A09FIX = true;
  assert.equal(LayoutIR.a09FixOn(), false);
  assert.equal(LineFit.isA09FixOn(), false);
  assert.equal(Builder.a09FixOn(), false);
});

// ২) সুইচ বন্ধ অবস্থায় (OFF) আউটপুট হুবহু অপরিবর্তিত থাকার নিশ্চয়তা
test('২. সুইচ বন্ধ (OFF) এবং __FZ_OFF_A09FIX=true অবস্থায় IR ও DOCX XML হুবহু অভিন্ন থাকে', () => {
  setBaseSwitches();
  delete globalThis.__FZ_ON_A09FIX;
  delete globalThis.__FZ_OFF_A09FIX;

  const irOff1 = LayoutIR.build(
    JSON.parse(JSON.stringify(rawCap)),
    JSON.parse(JSON.stringify(rawMeas.measures)),
    JSON.parse(JSON.stringify(rawMeas.pageInfo))
  );
  LineFit.fit(irOff1);
  const xmlOff1 = Builder.bodyXml(irOff1).xml;

  const goldOff1 = JSON.parse(rawGoldIrStr);
  LineFit.fit(goldOff1);
  const xmlGoldOff1 = Builder.bodyXml(goldOff1).xml;

  // এখন __FZ_ON_A09FIX = true কিন্তু __FZ_OFF_A09FIX = true দিয়ে তুলনা
  globalThis.__FZ_ON_A09FIX = true;
  globalThis.__FZ_OFF_A09FIX = true;

  const irOff2 = LayoutIR.build(
    JSON.parse(JSON.stringify(rawCap)),
    JSON.parse(JSON.stringify(rawMeas.measures)),
    JSON.parse(JSON.stringify(rawMeas.pageInfo))
  );
  LineFit.fit(irOff2);
  const xmlOff2 = Builder.bodyXml(irOff2).xml;

  const goldOff2 = JSON.parse(rawGoldIrStr);
  LineFit.fit(goldOff2);
  const xmlGoldOff2 = Builder.bodyXml(goldOff2).xml;

  assert.equal(JSON.stringify(irOff1), JSON.stringify(irOff2));
  assert.equal(xmlOff1, xmlOff2);
  assert.equal(JSON.stringify(goldOff1), JSON.stringify(goldOff2));
  assert.equal(xmlGoldOff1, xmlGoldOff2);

  // OFF অবস্থায় পুরোনো ত্রুটিগুলো বিদ্যমান ছিল তা নিশ্চিত করা
  const tblOff = goldOff1.pages[0].bands[9].cells[0].items[0];
  assert.equal(tblOff.fontPt, 8.5);
  assert.equal( goldOff1.pages[0].bands[1].cells[0].items[0].fontPt, 14.5 );
  assert.equal( goldOff1.pages[0].bands[12].cells[0].items[0].fontPt, 11.5 );
});

// ৩) ব্যান্ড ০ ('সংযোজনী-৭') ও ব্যান্ড ১ (কেন্দ্রীভূত শিরোনাম)-এর ১৪.৫pt -> ১৪pt ফন্ট সংশোধন
test('৩. সুইচ চালু (ON) অবস্থায় ব্যান্ড ০ হেডার ও ব্যান্ড ১ কেন্দ্রীভূত শিরোনামের ফন্ট ১৪.৫pt থেকে ১৪pt-এ সংশোধিত হয়', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A09FIX = true;

  const irOn = LayoutIR.build(
    JSON.parse(JSON.stringify(rawCap)),
    JSON.parse(JSON.stringify(rawMeas.measures)),
    JSON.parse(JSON.stringify(rawMeas.pageInfo))
  );
  LineFit.fit(irOn);
  const xmlOn = Builder.bodyXml(irOn).xml;

  const goldOn = JSON.parse(rawGoldIrStr);
  LineFit.fit(goldOn);
  const xmlGoldOn = Builder.bodyXml(goldOn).xml;

  for (const ir of [irOn, goldOn]) {
    const hdrIt = ir.pages[0].bands[0].cells[0].items[0];
    const titleIt = ir.pages[0].bands[1].cells[0].items[0];
    assert.equal(hdrIt.fontPt, 14);
    assert.equal(titleIt.fontPt, 14);
    assert.equal(titleIt._a16LockFit, true);
  }

  for (const xml of [xmlOn, xmlGoldOn]) {
    assert.equal(xml.includes('<w:sz w:val="29"/>'), false, '১৪.৫pt (w:sz=29) থাকা উচিত নয়');
    assert.equal(xml.includes('<w:sz w:val="28"/>'), true, '১৪pt (w:sz=28) থাকা আবশ্যক');
  }
});

// ৪) ব্যান্ড ৯ (১০-কলাম, ১৫-সারি ফাঁকা-বডি ফরম-ছক)-এর বোল্ড বহু-লাইন শিরোনাম, ১১.৫pt ফন্ট ও শীর্ষ প্রান্তিককরণ
test('৪. সুইচ চালু (ON) অবস্থায় ১০-কলাম ফাঁকা-বডি ফরম-ছকের শিরোনাম ১১.৫pt বোল্ড, শীর্ষ-প্রান্তিক, ১৪pt লাইন-পিচ ও সঠিক শব্দ-ভাঙন পায়', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A09FIX = true;

  const irOn = LayoutIR.build(
    JSON.parse(JSON.stringify(rawCap)),
    JSON.parse(JSON.stringify(rawMeas.measures)),
    JSON.parse(JSON.stringify(rawMeas.pageInfo))
  );
  LineFit.fit(irOn);
  const xmlOn = Builder.bodyXml(irOn).xml;

  const goldOn = JSON.parse(rawGoldIrStr);
  LineFit.fit(goldOn);
  const xmlGoldOn = Builder.bodyXml(goldOn).xml;

  const expectedRow0 = [
    'ক্রমিক\nনং',
    'নাম',
    'জন্ম\nতারিখ',
    'বয়স',
    'সম্পর্ক',
    'মনোনীত\nহার(%)',
    'বৈবাহিক\nঅবস্থা',
    'প্রতিবন্ধিতা',
    'ছবি\n(স্ট্যাম্প\nসাইজ)',
    'তারিখসহ\nস্বাক্ষর'
  ];

  for (const ir of [irOn, goldOn]) {
    const tbl = ir.pages[0].bands[9].cells[0].items[0];
    assert.equal(tbl.fontPt, 11.5);
    assert.equal(tbl.cellFontSrc, 11.5);
    assert.equal(tbl.headBold, true);
    assert.equal(tbl.bold, true);
    assert.equal(tbl._a07HeadPitchPt, 14.0);
    assert.deepEqual(tbl.headVAlign, new Array(10).fill('t'));
    assert.deepEqual(tbl.rows[0], expectedRow0);
    if (Array.isArray(tbl.cells) && Array.isArray(tbl.cells[0])) {
      assert.deepEqual(tbl.cells[0].map((c) => c.text), expectedRow0);
    }
  }

  for (const xml of [xmlOn, xmlGoldOn]) {
    const tblMatch = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/);
    assert.ok(tblMatch, 'টেবিল XML বিদ্যমান থাকতে হবে');
    const tr0 = tblMatch[0].match(/<w:tr>[\s\S]*?<\/w:tr>/)[0];
    assert.equal((tr0.match(/<w:vAlign w:val="top"\/>/g) || []).length, 10, '১০টি কলামেই vAlign=top থাকতে হবে');
    assert.equal((tr0.match(/<w:p>/g) || []).length, 17, '১০টি কলামে মোট ১৭টি লাইন-অনুচ্ছেদ থাকতে হবে');
    assert.equal((tr0.match(/<w:b\/>/g) || []).length, 17, '১৭টি লাইন-অনুচ্ছেদেই বোল্ড (<w:b/>) থাকতে হবে');
    assert.equal((tr0.match(/w:line="280" w:lineRule="exact"/g) || []).length, 17, '১৭টি লাইন-অনুচ্ছেদেই ১৪.০pt (w:line=280) লাইন-পিচ থাকতে হবে');
    assert.equal((tr0.match(/<w:sz w:val="23"\/>/g) || []).length, 34, '১৭টি অনুচ্ছেদ ও রানে ১১.৫pt (w:sz=23) থাকতে হবে');
  }
});

// ৫) ব্যান্ড ১২ ('বি:দ্র: ...') অনুচ্ছেদের ১২pt ফন্ট ও -0.15pt অক্ষর-সংকোচন পুনরুদ্ধার
test('৫. সুইচ চালু (ON) অবস্থায় ব্যান্ড ১২ (বি:দ্র:) অনুচ্ছেদে ১১.৫pt সংকোচন রোধ করে ১২pt ফন্ট ও charSpacingPt=-0.15 প্রযুক্ত হয়', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A09FIX = true;

  const irOn = LayoutIR.build(
    JSON.parse(JSON.stringify(rawCap)),
    JSON.parse(JSON.stringify(rawMeas.measures)),
    JSON.parse(JSON.stringify(rawMeas.pageInfo))
  );
  LineFit.fit(irOn);
  const xmlOn = Builder.bodyXml(irOn).xml;

  const goldOn = JSON.parse(rawGoldIrStr);
  LineFit.fit(goldOn);
  const xmlGoldOn = Builder.bodyXml(goldOn).xml;

  for (const ir of [irOn, goldOn]) {
    const noteIt = ir.pages[0].bands[12].cells[0].items[0];
    assert.equal(noteIt.fontPt, 12);
    assert.equal(noteIt.charSpacingPt, -0.15);
    assert.equal(noteIt.fit, undefined);
    // ব্যান্ড ৭ (পূরণ-রেখাযুক্ত অনুচ্ছেদ) অপরিবর্তিত থাকে
    const band7It = ir.pages[0].bands[7].cells[0].items[0];
    assert.equal(band7It.fontPt, 12);
  }

  for (const xml of [xmlOn, xmlGoldOn]) {
    assert.ok(xml.includes('বি:দ্র:'), 'বি:দ্র: লেখাটি XML-এ থাকতে হবে');
    assert.ok(xml.includes('<w:spacing w:val="-3"/>'), '-0.15pt অক্ষর-সংকোচন (<w:spacing w:val="-3"/>) থাকতে হবে');
  }
});

// ৬) ব্যান্ড ৮, ব্যান্ড ১০ ও ব্যান্ড ১৪-এর বহু-লাইন অনুচ্ছেদের লাইন-পিচ ও ঝুলন্ত ইনডেন্ট এবং ১-পাতার নিশ্চয়তা
test('৬. সুইচ চালু (ON) অবস্থায় ব্যান্ড ৮ (১৩.৯pt), ব্যান্ড ১০ (১৩.৯pt) ও ব্যান্ড ১৪ (১৪.৪pt + _origSigInd) সংশোধিত হয় এবং নথি ১ পাতায় থাকে', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A09FIX = true;

  const irOn = LayoutIR.build(
    JSON.parse(JSON.stringify(rawCap)),
    JSON.parse(JSON.stringify(rawMeas.measures)),
    JSON.parse(JSON.stringify(rawMeas.pageInfo))
  );
  LineFit.fit(irOn);
  const xmlOn = Builder.bodyXml(irOn).xml;

  const goldOn = JSON.parse(rawGoldIrStr);
  LineFit.fit(goldOn);
  const xmlGoldOn = Builder.bodyXml(goldOn).xml;

  for (const ir of [irOn, goldOn]) {
    assert.equal(ir.pages.length, 1, 'নথিটি অবশ্যই ১ পাতার হতে হবে');
    const b8 = ir.pages[0].bands[8].cells[0].items[0];
    const b10 = ir.pages[0].bands[10].cells[0].items[0];
    const b14 = ir.pages[0].bands[14].cells[0].items[0];
    assert.equal(b8.lineSpacingPt, 13.9);
    assert.equal(b10.lineSpacingPt, 13.9);
    assert.equal(b14.lineSpacingPt, 14.4);
    assert.ok(b14._origSigInd, 'ব্যান্ড ১৪-তে _origSigInd সংরক্ষিত থাকতে হবে');
    assert.equal(b14._origSigInd.firstIndentPt, -128);
  }

  for (const xml of [xmlOn, xmlGoldOn]) {
    assert.equal((xml.match(/<w:sectPr\b/g) || []).length, 1, 'একটিমাত্র সেকশন (১ পাতা) থাকতে হবে');
    assert.equal(xml.includes('<w:pageBreakBefore/>'), false, 'কোনো অতিরিক্ত পৃষ্ঠা-বিরতি থাকা যাবে না');
    assert.ok(xml.includes('w:line="278" w:lineRule="exact"'), '১৩.৯pt (w:line=278) লাইন-পিচ থাকতে হবে');
    assert.ok(xml.includes('w:line="288" w:lineRule="exact"'), '১৪.৪pt (w:line=288) লাইন-পিচ থাকতে হবে');
    assert.ok(xml.includes('w:hanging="2560"'), 'ব্যান্ড ১৪-এর ঝুলন্ত ইনডেন্ট (w:hanging="2560") থাকতে হবে');
  }
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
