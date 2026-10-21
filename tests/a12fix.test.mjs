/**
 * A12_SCORE_v1 — নমুনা a12 (প্রাপ্য পেনশনের বৈধ উত্তরাধিকারী ঘোষণাপত্র) লেআউট ও রেন্ডারিং সংশোধন পরীক্ষা।
 * চালানোর নিয়ম: node tests/a12fix.test.mjs
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

// switch-defaults.js লোড না করে ডিফল্ট বেস সুইচগুলো সরাসরি পিন করা
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE',
  'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3',
  'A14RULES', 'A14FIX4', 'RULES2', 'A13FIX'
];

function resetSwitches() {
  for (const k of Object.keys(globalThis)) {
    if (k.startsWith('__FZ_ON_') || k.startsWith('__FZ_OFF_')) {
      delete globalThis[k];
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    delete process.env.FZ_ON;
    delete process.env.FZ_OFF;
    delete process.env.__FZ_ON_A12FIX;
    delete process.env.__FZ_OFF_A12FIX;
  }
  for (const name of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + name] = true;
  }
}

resetSwitches();

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const B = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const A12_DIR = path.join(ROOT, 'qa/golden-data/runs/DEF16b/a12');
const capture = JSON.parse(fs.readFileSync(path.join(A12_DIR, 'capture.json'), 'utf8'));
const measuresData = JSON.parse(fs.readFileSync(path.join(A12_DIR, 'measures.json'), 'utf8'));
const goldIrRaw = fs.readFileSync(path.join(A12_DIR, 'ir.json'), 'utf8');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error('   ', err && err.stack ? err.stack : err);
  }
}

console.log('=== A12_SCORE_v1 (A12FIX) সুইচ ও লেআউট পরীক্ষা ===');

// ১) সুইচ বন্ধ থাকলে পূর্বের আচরণের সাথে বাইট-ফর-বাইট অভিন্নতা যাচাই
test('১. A12FIX সুইচ ডিফল্টভাবে বন্ধ থাকে এবং বন্ধ অবস্থায় IR ও XML অপরিবর্তিত থাকে', () => {
  resetSwitches();
  assert.equal(IR.a12FixOn(), false);
  assert.equal(LF.isA12FixOn(), false);
  assert.equal(B.a12FixOn(), false);

  const irOff = JSON.parse(goldIrRaw);
  LF.fit(irOff);
  const xmlOff = B.bodyXml(irOff).xml;

  // পুরনো আচরণের বৈশিষ্ট্যগুলো যাচাই (সুইচ বন্ধ অবস্থায় যেমন ছিল)
  const itemsOff = irOff.pages[0].bands.flatMap((b) => b.cells[0].items);
  const b7Off = itemsOff.find((it) => it.lines && it.lines[0] === '৩।');
  const b8Off = itemsOff.find((it) => it.lines && it.lines[0] === '৪।');
  assert.equal(b7Off.indentPt, 8.6);
  assert.equal(b8Off.indentPt, 8.6);

  const b15Off = itemsOff.find((it) => it.tabLines && String(it.tabLines[0]).startsWith('(২)\t'));
  assert.deepEqual(b15Off.tabStops, [36, 44.4]);
  assert.equal(b15Off.fontPt, 11);
  assert.ok(String(b15Off.tabLines[1]).startsWith('\t\t'));

  // __FZ_OFF_A12FIX = true থাকলে __FZ_ON_A12FIX = true থাকলেও সুইচ বন্ধ থাকবে এবং আউটপুট বাইট-ফর-বাইট অভিন্ন হবে
  globalThis.__FZ_ON_A12FIX = true;
  globalThis.__FZ_OFF_A12FIX = true;
  assert.equal(IR.a12FixOn(), false);
  assert.equal(LF.isA12FixOn(), false);
  assert.equal(B.a12FixOn(), false);

  const irForcedOff = JSON.parse(goldIrRaw);
  LF.fit(irForcedOff);
  const xmlForcedOff = B.bodyXml(irForcedOff).xml;

  assert.equal(JSON.stringify(irForcedOff), JSON.stringify(irOff));
  assert.equal(xmlForcedOff, xmlOff);
});

// ২) সুইচ চালুর সব উপায় যাচাই (__FZ_ON_A12FIX এবং FZ_ON=A12FIX)
test('২. __FZ_ON_A12FIX = true এবং FZ_ON=A12FIX দ্বারা সুইচ সক্রিয় হয়', () => {
  resetSwitches();
  globalThis.__FZ_ON_A12FIX = true;
  assert.equal(IR.a12FixOn(), true);
  assert.equal(LF.isA12FixOn(), true);
  assert.equal(B.a12FixOn(), true);

  resetSwitches();
  process.env.FZ_ON = 'A12FIX';
  assert.equal(IR.a12FixOn(), true);
  assert.equal(LF.isA12FixOn(), true);
  assert.equal(B.a12FixOn(), true);
});

// ৩) অনুচ্ছেদ (২) (ব্লক ১৫)-এর ভ্রান্ত কোলন-ট্যাব ইনডেন্ট, কর্তিত ড্যাশ ও অনুচ্ছেদ-বিভাজন সংশোধন
test('৩. অনুচ্ছেদ (২)-এর ২য় ও ৩য় লাইনের ভ্রান্ত \\t\\t ইনডেন্ট ও অতিরিক্ত ট্যাব-স্টপ অপসারণ, ৬-ড্যাশ ও ১২pt ফন্ট পুনরুদ্ধার এবং একক জাস্টিফাইড অনুচ্ছেদে রূপান্তর', () => {
  resetSwitches();
  globalThis.__FZ_ON_A12FIX = true;

  const ir = JSON.parse(goldIrRaw);
  LF.fit(ir);
  const { xml } = B.bodyXml(ir);

  const items = ir.pages[0].bands.flatMap((b) => b.cells[0].items);
  const b15 = items.find((it) => it.tabLines && String(it.tabLines[0]).startsWith('(২)\t'));
  assert.ok(b15, 'ব্লক ১৫ পাওয়া গেছে');
  assert.deepEqual(b15.tabStops, [36], 'অতিরিক্ত 44.4pt ট্যাব-স্টপ অপসারিত হয়ে [36] থাকবে');
  assert.equal(b15.fontPt, 12, 'ফন্ট ১১pt থেকে ১২pt-এ পুনরুদ্ধার হবে');
  assert.equal(b15.align, 'j', 'অনুচ্ছেদ জাস্টিফাইড (align="j") হবে');
  assert.equal(b15.keepLines, true);
  assert.equal(b15.keepJust, true);
  assert.equal(b15.indentPt, 0);
  assert.equal(b15.firstIndentPt, 0);
  assert.equal(b15.lineSpacingPt, 14);
  assert.ok(b15.tabLines[0].includes('------ নং ক্রমিকে'), 'কর্তিত ৬টি ড্যাশ (------) পুনরুদ্ধার হবে');
  assert.ok(!b15.tabLines[1].startsWith('\t'), '২য় লাইনের শুরুতে ভ্রান্ত ট্যাব থাকবে না');
  assert.ok(!b15.tabLines[2].startsWith('\t'), '৩য় লাইনের শুরুতে ভ্রান্ত ট্যাব থাকবে না');

  // XML-এ ৩টি আলাদা বাম-সাজানো অনুচ্ছেদের বদলে <w:br/>-যুক্ত একক জাস্টিফাইড অনুচ্ছেদ তৈরি হয়েছে কি না যাচাই
  const pMatches = [...xml.matchAll(/<w:p>[\s\S]*?<\/w:p>/g)].map((m) => m[0]);
  const b15Paras = pMatches.filter((p) => p.includes('আমি আরও ঘোষণা করিতেছি যে') || p.includes('সমাজ সেবা অধিদপ্তরের') || p.includes('সংযোজন করা হইল'));
  assert.equal(b15Paras.length, 1, 'ব্লক ১৫ একক <w:p> অনুচ্ছেদ হিসেবে রেন্ডার হবে');
  assert.ok(b15Paras[0].includes('<w:jc w:val="both"/>'), 'ব্লক ১৫-এ <w:jc w:val="both"/> থাকবে');
  assert.ok(b15Paras[0].includes('w:line="280" w:lineRule="exact"'), 'ব্লক ১৫-এ w:line="280" থাকবে');
  assert.ok(!b15Paras[0].includes('w:pos="888"'), 'ভ্রান্ত 44.4pt (888 dxa) ট্যাব-স্টপ XML-এ থাকবে না');
});

// ৪) একক ক্রমিক তালিকা (১।–১০।)-এর ৩। ও ৪। আইটেমের ভ্রান্ত গ্রিড-ইনডেন্ট (8.6pt) ও প্রস্থ সংশোধন
test('৪. ক্রমিক তালিকা ১।–১০।-এ ৩। ও ৪।-এর ভ্রান্ত 8.6pt ইনডেন্ট (w:left="172") নিরসন ও প্রস্থ সমতাকরণ', () => {
  resetSwitches();
  globalThis.__FZ_ON_A12FIX = true;

  const ir = JSON.parse(goldIrRaw);
  LF.fit(ir);
  const { xml } = B.bodyXml(ir);

  const items = ir.pages[0].bands.flatMap((b) => b.cells[0].items);
  const serialItems = items.filter((it) => it.type === 'list_item' && Array.isArray(it.lines) && it.lines.length === 1 && /^[০-৯]{1,2}।$/.test(it.lines[0].trim()));
  assert.equal(serialItems.length, 10, '১০টি ক্রমিক আইটেম (১।–১০।) থাকবে');
  for (const it of serialItems) {
    assert.equal(it.indentPt, 0, `${it.lines[0]}-এর indentPt = 0 হবে`);
    assert.equal(it.charSpacingPt, -0.5, `${it.lines[0]}-এর charSpacingPt = -0.5 হবে`);
    assert.ok(it.rect.w >= 7, `${it.lines[0]}-এর প্রস্থ >= 7pt হবে`);
  }
  assert.ok(!xml.includes('<w:ind w:left="172"/>'), 'XML-এ ৩। বা ৪।-এর ভ্রান্ত w:left="172" ইনডেন্ট থাকবে না');
});

// ৫) ৭-কলামের মনোনীত উত্তরাধিকারী ছকের ২-লাইনের মোটা শিরোনাম, সারি-উচ্চতা ও টেবিলের কঠোর নিয়ম যাচাই
test('৫. ৭-কলামের ছকের ২-লাইনের মোটা শিরোনাম এবং টেবিলের কঠোর নিয়ম (একক <w:tbl>, পূর্ণ বর্ডার, শূন্য শেডিং, tcW যোগফল == tblW এবং অভিন্ন tblGrid)', () => {
  resetSwitches();
  globalThis.__FZ_ON_A12FIX = true;

  const irFromBuild = IR.build(capture, measuresData.measures, measuresData.pageInfo);
  LF.fit(irFromBuild);
  const xmlFromBuild = B.bodyXml(irFromBuild).xml;

  const irFromGold = JSON.parse(goldIrRaw);
  LF.fit(irFromGold);
  const xmlFromGold = B.bodyXml(irFromGold).xml;

  // IR.build এবং goldIr উভয় পথেই অভিন্ন XML উৎপন্ন হয়
  assert.equal(xmlFromBuild, xmlFromGold, 'IR.build এবং goldIr উভয় পথে অভিন্ন XML তৈরি হবে');

  const tbl = irFromGold.pages[0].bands.flatMap((b) => b.cells[0].items).find((it) => it.kind === 'table');
  assert.ok(tbl, 'টেবিল আইটেম পাওয়া গেছে');
  assert.equal(tbl.headBold, true, 'শিরোনাম মোটা (headBold=true) হবে');
  assert.equal(tbl.headFontPt, 12, 'শিরোনামের ফন্ট ১২pt হবে');
  assert.deepEqual(tbl.rowHeightsPt, [28.3, 14.9], 'সারি-উচ্চতা [28.3, 14.9] হবে');
  assert.deepEqual(
    tbl.rows[0],
    [
      'ক্রমিক নং',
      'নাম ও জন্ম তারিখ',
      'সম্পর্ক',
      'মনোনীত\nহার%',
      'বৈবাহিক\nঅবস্থা',
      'প্রতিবন্ধিতা\n(যদি থাকে)',
      'ছবি\n(স্ট্যাম্প সাইজ)'
    ],
    'কলাম ৪–৭-এর শিরোনাম মূলের মতো ২ লাইনে বিভক্ত হবে'
  );

  // কঠোর নিয়ম ১: ১টি উৎস টেবিল = ১টি <w:tbl>
  const tblMatches = [...xmlFromGold.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)].map((m) => m[0]);
  assert.equal(tblMatches.length, 1, 'সম্পূর্ণ ডকুমেন্টে ঠিক ১টি <w:tbl> থাকবে');
  const tblXml = tblMatches[0];

  // কঠোর নিয়ম ২: কোনো বর্ডার nil নয়, কোনো আংশিক tcBorders নেই, কোনো ধূসর শেডিং (w:shd) নেই
  for (const side of ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']) {
    const re = new RegExp(`<w:${side} w:val="single" w:sz="4" w:space="0" w:color="000000"\\/>`);
    assert.ok(re.test(tblXml), `টেবিলে পূর্ণ ${side} বর্ডার থাকবে`);
  }
  assert.ok(!tblXml.includes('w:val="nil"'), 'টেবিলে কোনো nil বর্ডার থাকবে না');
  assert.ok(!tblXml.includes('<w:tcBorders>'), 'টেবিলে কোনো আংশিক <w:tcBorders> থাকবে না');
  assert.ok(!tblXml.includes('<w:shd'), 'টেবিলে কোনো অযাচিত ধূসর শেডিং (<w:shd>) থাকবে না');

  // কঠোর নিয়ম ৩: প্রতিটি সারিতে ঘরের প্রস্থের যোগফল == টেবিলের মোট প্রস্থ (tblW) এবং সব সারির কলাম-সীমা tblGrid-এর সাথে অভিন্ন
  const tblWMatch = /<w:tblW w:w="(\d+)" w:type="dxa"\/>/.exec(tblXml);
  assert.ok(tblWMatch, '<w:tblW> পাওয়া গেছে');
  const tblW = Number(tblWMatch[1]);

  const gridCols = [...tblXml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]));
  assert.equal(gridCols.length, 7, 'tblGrid-এ ৭টি কলাম থাকবে');
  const gridSum = gridCols.reduce((a, b) => a + b, 0);
  assert.equal(gridSum, tblW, `tblGrid কলামগুলোর যোগফল (${gridSum}) == tblW (${tblW}) হবে`);

  const gridBoundaries = [];
  let accGrid = 0;
  for (const w of gridCols) {
    accGrid += w;
    gridBoundaries.push(accGrid);
  }

  const trMatches = [...tblXml.matchAll(/<w:tr>[\s\S]*?<\/w:tr>/g)].map((m) => m[0]);
  assert.equal(trMatches.length, 2, 'টেবিলে ২টি সারি (<w:tr>) থাকবে');

  trMatches.forEach((trXml, ri) => {
    const tcWidths = [...trXml.matchAll(/<w:tcW w:w="(\d+)" w:type="dxa"\/>/g)].map((m) => Number(m[1]));
    assert.equal(tcWidths.length, 7, `সারি ${ri}-এ ৭টি ঘর থাকবে`);
    const rowSum = tcWidths.reduce((a, b) => a + b, 0);
    assert.equal(rowSum, tblW, `সারি ${ri}-এর tcW যোগফল (${rowSum}) == tblW (${tblW}) হবে`);

    const rowBoundaries = [];
    let accRow = 0;
    for (const w of tcWidths) {
      accRow += w;
      rowBoundaries.push(accRow);
    }
    assert.deepEqual(rowBoundaries, gridBoundaries, `সারি ${ri}-এর কলাম-সীমা tblGrid-এর সাথে হুবহু মিলবে`);
  });
});

// ৬) শুরুর জাস্টিফাইড গদ্য-অনুচ্ছেদে অপ্রয়োজনীয় অক্ষর-সংকোচন রোধ ও নিচের লেবেল-মান আইটেমগুলোর ফন্ট সমন্বয়
test('৬. শুরুর গদ্য-অনুচ্ছেদে অপ্রয়োজনীয় w:spacing="-3" অপসারণ এবং নিচের লেবেল-মান আইটেমগুলোর প্রস্থ সমন্বয়', () => {
  resetSwitches();
  globalThis.__FZ_ON_A12FIX = true;

  const ir = JSON.parse(goldIrRaw);
  LF.fit(ir);
  const { xml } = B.bodyXml(ir);

  const pMatches = [...xml.matchAll(/<w:p>[\s\S]*?<\/w:p>/g)].map((m) => m[0]);
  const introPara = pMatches.find((p) => p.includes('গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের অর্থ মন্ত্রণালয়ের'));
  assert.ok(introPara, 'শুরুর গদ্য-অনুচ্ছেদ পাওয়া গেছে');
  assert.ok(!introPara.includes('<w:spacing w:val="-3"/>'), 'শুরুর গদ্য-অনুচ্ছেদে অপ্রয়োজনীয় অক্ষর-সংকোচন (-3) থাকবে না');

  const labelPara1 = pMatches.find((p) => p.includes('মনোনীত উত্তরাধিকারীঃ'));
  const labelPara2 = pMatches.find((p) => p.includes('মনোনয়নকারীর স্বাক্ষর ও তারিখঃ'));
  assert.ok(labelPara1 && labelPara1.includes('<w:sz w:val="25"/>'), 'মনোনীত উত্তরাধিকারীঃ ১২.৫pt (sz=25) হবে');
  assert.ok(labelPara2 && labelPara2.includes('<w:sz w:val="25"/>'), 'মনোনয়নকারীর স্বাক্ষর ও তারিখঃ ১২.৫pt (sz=25) হবে');
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
