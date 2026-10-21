import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// প্রোডাকশনের ডিফল্ট-অন সুইচগুলো সুস্পষ্টভাবে সক্রিয় করা (switch-defaults.js লোড না করে)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES'
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

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const A13_DIR = path.join(
  ROOT,
  'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2+A14FIX3+WIDTH+A16FIX3+A14RULES/a13'
);
const rawCap = JSON.parse(fs.readFileSync(path.join(A13_DIR, 'capture.json'), 'utf8'));
const rawMeas = JSON.parse(fs.readFileSync(path.join(A13_DIR, 'measures.json'), 'utf8'));
const rawGoldenIr = JSON.parse(fs.readFileSync(path.join(A13_DIR, 'ir.json'), 'utf8'));

const clone = (x) => JSON.parse(JSON.stringify(x));

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
    console.error(err);
  }
}

// ১) সুইচ গেটিং ও অফ-স্টেট বাইট-টু-বাইট অভিন্নতা যাচাই
await test('১. A13FIX সুইচ ডিফল্টে বন্ধ থাকে এবং চালু/বন্ধ ও __FZ_OFF_A13FIX ওভাররাইড সঠিকভাবে কাজ করে', () => {
  setBaseSwitches();
  assert.equal(IR.a13FixOn(), false);
  assert.equal(LF.isA13FixOn(), false);
  assert.equal(DB.a13FixOn(), false);

  globalThis.__FZ_ON_A13FIX = true;
  assert.equal(IR.a13FixOn(), true);
  assert.equal(LF.isA13FixOn(), true);
  assert.equal(DB.a13FixOn(), true);

  globalThis.__FZ_OFF_A13FIX = true;
  assert.equal(IR.a13FixOn(), false);
  assert.equal(LF.isA13FixOn(), false);
  assert.equal(DB.a13FixOn(), false);
});

await test('২. A13FIX বন্ধ থাকলে এবং __FZ_OFF_A13FIX=true হলে IR ও XML আউটপুট বাইট-টু-বাইট অভিন্ন থাকে', () => {
  setBaseSwitches();
  const irOff = IR.build(clone(rawCap), clone(rawMeas));
  LF.fit(irOff);
  const xmlOff = DB.bodyXml(clone(irOff)).xml;

  globalThis.__FZ_ON_A13FIX = true;
  globalThis.__FZ_OFF_A13FIX = true;
  const irOverride = IR.build(clone(rawCap), clone(rawMeas));
  LF.fit(irOverride);
  const xmlOverride = DB.bodyXml(clone(irOverride)).xml;

  assert.equal(JSON.stringify(irOff), JSON.stringify(irOverride));
  assert.equal(xmlOff, xmlOverride);
});

// ২) রুট কজ ১: ২-লাইনের মোটা মাঝ-সাজানো শিরোনামের (ব্যান্ড ৩) লাইন-পিচ ও উল্লম্ব অবস্থান
await test('৩. ব্যান্ড ৩-এর ২-লাইনের মোটা মাঝ-সাজানো শিরোনামের লাইন-পিচ ১২.৭pt থেকে ১৪.২pt-এ উন্নীত হয় এবং লাইন-জোড়া ভাঙা নিশ্চিত হয়', () => {
  setBaseSwitches();
  const irOff = IR.build(clone(rawCap), clone(rawMeas));
  LF.fit(irOff);
  const b3Off = irOff.pages[0].bands[3].cells[0].items[0];
  assert.equal(b3Off.lineSpacingPt, 12.7);

  globalThis.__FZ_ON_A13FIX = true;
  const irOn = IR.build(clone(rawCap), clone(rawMeas));
  LF.fit(irOn);
  const b3On = irOn.pages[0].bands[3].cells[0].items[0];
  assert.equal(b3On.lineSpacingPt, 14.2);
  assert.equal(b3On.rect.y, 127);

  const xmlOn = DB.bodyXml(irOn).xml;
  assert.match(xmlOn, /<w:spacing w:before="65" w:after="0" w:line="284" w:lineRule="exact"\/>[\s\S]*?অফিসারের কার্যালয়/);
});

// ৩) রুট কজ ২: একক ড্যাশ-রেখার (ব্যান্ড ৪ ও ব্যান্ড ২১ স্বাক্ষর-রেখা) inkOff ও উল্লম্ব অবস্থান
await test('৪. ব্যান্ড ৪ ও স্বাক্ষরের ড্যাশ-রেখায় inkOff ০.৪৫×ফন্ট হওয়ায় রেখা দুটি যথাক্রমে y=161 ও y=666-এ উঠে আসে এবং স্বাক্ষর ব্লকের ধাক্কা দূর হয়', () => {
  setBaseSwitches();
  const irOff = IR.build(clone(rawCap), clone(rawMeas));
  LF.fit(irOff);
  const xmlOff = DB.bodyXml(irOff).xml;

  globalThis.__FZ_ON_A13FIX = true;
  const irOn = IR.build(clone(rawCap), clone(rawMeas));
  LF.fit(irOn);
  const xmlOn = DB.bodyXml(irOn).xml;

  // ব্যান্ড ৪ (ড্যাশ-রেখা): before 183 dxa -> 58 dxa, কিন্তু পরের ব্যান্ড ৫-এর শুরু (187.26pt) অপরিবর্তিত
  assert.match(xmlOff, /<w:tab w:val="right" w:leader="hyphen" w:pos="7382"\/><\/w:tabs><w:spacing w:before="183"/);
  assert.match(xmlOn, /<w:tab w:val="right" w:leader="hyphen" w:pos="7382"\/><\/w:tabs><w:spacing w:before="58"/);

  // ব্যান্ড ২১ কলাম ১: স্বাক্ষর ড্যাশ-রেখা before 328 dxa -> 278 dxa এবং নিচের ৩-লাইনের স্বাক্ষর ব্লকের before 0 -> 32 dxa
  assert.match(xmlOff, /<w:tab w:val="right" w:leader="hyphen" w:pos="5831"\/><\/w:tabs><w:spacing w:before="328"/);
  assert.match(xmlOn, /<w:tab w:val="right" w:leader="hyphen" w:pos="5831"\/><\/w:tabs><w:spacing w:before="278"/);
  assert.match(xmlOn, /<w:spacing w:before="32" w:after="0" w:line="274" w:lineRule="exact"\/><w:ind w:left="1144"\/><w:jc w:val="center"\/>/);
});

// ৪) রুট কজ ৩: ব্যান্ড ৭, ৮, ৯-এর কোলন-ট্যাব সারির ডান-প্রান্ত ও ব্যান্ড ৮, ৯-এর লেবেল স্ট্রোক/ফন্ট
await test('৫. ব্যান্ড ৭, ৮, ৯-এর ডট-লিডার প্রস্থ ৩৮২.৬pt-এ পুনরুদ্ধার হয় এবং ব্যান্ড ৮ ও ৯-এর লেবেল বোল্ড ও ১২/১২.৫pt ক্রমিক ফন্ট পায়', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A13FIX = true;
  const irOn = IR.build(clone(rawCap), clone(rawMeas));
  LF.fit(irOn);

  for (const bi of [7, 8, 9]) {
    const it = irOn.pages[0].bands[bi].cells[0].items[0];
    assert.equal(it.rect.w, 382.6);
  }
  const it8 = irOn.pages[0].bands[8].cells[0].items[0];
  const it9 = irOn.pages[0].bands[9].cells[0].items[0];
  assert.equal(it8._a13BoldLabel, true);
  assert.equal(it8._a13SerialFontPt, 12);
  assert.equal(it9._a13BoldLabel, true);
  assert.equal(it9._a13SerialFontPt, 12.5);

  const xmlOn = DB.bodyXml(irOn).xml;
  // ডট-লিডার ট্যাব-স্টপ 7593 dxa থেকে 7642 dxa-তে প্রসারিত
  assert.match(xmlOn, /<w:tab w:val="right" w:leader="dot" w:pos="7642"\/>/);
  // ২) পদবি এবং ৩) বর্তমান কর্মস্থল বোল্ড লেবেল ও ২৪/২৫ অর্ধ-পয়েন্ট ক্রমিক ফন্টে রেন্ডার হয়
  assert.match(xmlOn, /<w:b\/><w:sz w:val="24"\/><w:szCs w:val="24"\/><\/w:rPr><w:t xml:space="preserve">২\) <\/w:t><\/w:r><w:r><w:rPr><w:rFonts[^/]*\/><w:b\/><w:sz w:val="22"\/><w:szCs w:val="22"\/><\/w:rPr><w:t xml:space="preserve">পদবি<\/w:t>/);
  assert.match(xmlOn, /<w:b\/><w:sz w:val="25"\/><w:szCs w:val="25"\/><\/w:rPr><w:t xml:space="preserve">৩\) <\/w:t><\/w:r><w:r><w:rPr><w:rFonts[^/]*\/><w:b\/><w:sz w:val="22"\/><w:szCs w:val="22"\/><\/w:rPr><w:t xml:space="preserve">বর্তমান কর্মস্থল<\/w:t>/);
});

// ৫) রুট কজ ৪: ব্যান্ড ১৪ ("৬) বেতন")-এ SERIALHANG-এর ভ্রান্ত ঝুলন্ত ট্যাব রোধ
await test('৬. ব্যান্ড ১৪ ("৬) বেতন")-এ _noSerialHang ও <w:tabs> সংরক্ষিত থাকে যাতে ঝুলন্ত ট্যাব যুক্ত হয়ে প্রস্থ ৪০pt না হয়', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A13FIX = true;
  const irOn = IR.build(clone(rawCap), clone(rawMeas));
  LF.fit(irOn);
  const it14 = irOn.pages[0].bands[14].cells[0].items[0];
  assert.equal(it14._noSerialHang, true);

  const xmlOn = DB.bodyXml(irOn).xml;
  const m14 = /<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="4340"\/><\/w:tabs><w:spacing w:before="169" w:after="0" w:line="253" w:lineRule="exact"\/><w:ind w:left="10"\/><w:jc w:val="left"\/><\/w:pPr><w:r><w:rPr><w:rFonts[^/]*\/><w:sz w:val="22"\/><w:szCs w:val="22"\/><\/w:rPr><w:t xml:space="preserve">৬\) বেতন<\/w:t><\/w:r><\/w:p>/.exec(xmlOn);
  assert.ok(m14, '৬) বেতন অনুচ্ছেদে <w:tabs> আছে এবং কোনো ঝুলন্ত ইনডেন্ট বা অতিরিক্ত <w:tab/> রান নেই');
});

// ৬) রুট কজ ৫: ক্ষুদ্র ১×১ "বারকোড" বাক্স-ছক এবং শীর্ষ হেডার/শিরোনামের প্রস্থ ও ফন্ট
await test('৭. ক্ষুদ্র ১×১ "বারকোড" বাক্স-ছকের প্রস্থ ১০২৮ dxa (৫১.৪pt), ইনডেন্ট ২৯৮ dxa (১৪.৯pt), উচ্চতা ৫১৮ dxa (exact) এবং সেল-মার্জিন শূন্য হয়', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A13FIX = true;
  const irOn = IR.build(clone(rawCap), clone(rawMeas));
  LF.fit(irOn);
  const xmlOn = DB.bodyXml(irOn).xml;

  // বারকোড ছক: tblW=1028, tblInd=298, tblCellMar left/right=0, trHeight=518 exact, এবং কোনো tcMar=28 নেই
  assert.match(xmlOn, /<w:tblW w:w="1028" w:type="dxa"\/><w:tblInd w:w="298" w:type="dxa"\/>[\s\S]*?<w:tblCellMar><w:top w:w="0" w:type="dxa"\/><w:left w:w="0" w:type="dxa"\/><w:bottom w:w="0" w:type="dxa"\/><w:right w:w="0" w:type="dxa"\/><\/w:tblCellMar><\/w:tblPr><w:tblGrid><w:gridCol w:w="1028"\/><\/w:tblGrid><w:tr><w:trPr><w:trHeight w:val="518" w:hRule="exact"\/><\/w:trPr><w:tc><w:tcPr><w:tcW w:w="1028" w:type="dxa"\/><w:vAlign w:val="center"\/><\/w:tcPr>/);
  // শীর্ষ হেডার (charSpacingPt=0.15 -> w:spacing w:val="3") ও সরকারি শিরোনাম (fontPt=11.5 -> w:sz w:val="23")
  assert.match(xmlOn, /<w:spacing w:val="3"\/><w:sz w:val="22"\/><w:szCs w:val="22"\/><\/w:rPr><w:t xml:space="preserve">সাময়িক মঞ্জুরীপত্র জারি করার সময় প্রযোজ্য<\/w:t>/);
  assert.match(xmlOn, /<w:b\/><w:sz w:val="23"\/><w:szCs w:val="23"\/><\/w:rPr><w:t xml:space="preserve">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার<\/w:t>/);
});

// ৭) সরাসরি সংরক্ষিত golden ir.json থেকে LF.fit ও DB.build যাচাই এবং পাতা-সংখ্যা = ১ নিশ্চিতকরণ
await test('৮. সরাসরি golden ir.json থেকে LF.fit ও DB.build চালালে ১ পাতার বৈধ DOCX তৈরি হয় এবং কোনো অতিরিক্ত সেকশন-ব্রেক থাকে না', async () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A13FIX = true;
  const ir = clone(rawGoldenIr);
  LF.fit(ir);
  assert.equal(ir.pages.length, 1);
  const { xml } = DB.bodyXml(ir);
  const sectCount = (xml.match(/<w:sectPr>/g) || []).length;
  assert.equal(sectCount, 1);

  const bytes = await DB.build(ir, { type: 'uint8array' });
  assert.ok(bytes && bytes.length > 5000);
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
