/**
 * A14_SCORE_v4 (A14FIX4) স্বয়ংক্রিয় একক পরীক্ষা
 *
 * কোনো বাহ্যিক নির্ভরতা বা switch-defaults.js ছাড়াই Node-এ চলে।
 * সুইচ বন্ধ (OFF) থাকলে পূর্বতন আউটপুট বাইট-বাই-বাইট অপরিবর্তিত থাকে এবং
 * সুইচ চালু (ON) থাকলে পাতা ১, পাতা ২ ও পাতা ৩-এর সব বড় ভুল সংশোধিত হয়।
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// প্রোডাকশনের ভিত্তি-সুইচগুলো স্পষ্টভাবে চালু করা (switch-defaults.js ছাড়া)
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
    globalThis[`__FZ_ON_${sw}`] = true;
  }
}

setBaseSwitches();

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
globalThis.FayzarLayoutIR = IR;
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
globalThis.FayzarLineFit = LF;
const DB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));
globalThis.FayzarFaithfulDocx = DB;

const RUN_DIR = path.join(
  ROOT,
  'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2+A14FIX3+WIDTH+A16FIX3+A14RULES/a14'
);

const rawCap = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'capture.json'), 'utf8'));
const rawMeas = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'measures.json'), 'utf8'));
const rawGoldenIr = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'ir.json'), 'utf8'));

const clone = (obj) => JSON.parse(JSON.stringify(obj));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  [পাস] ${name}`);
  } catch (err) {
    failed++;
    console.error(`  [ব্যর্থ] ${name}: ${err && err.message ? err.message : err}`);
  }
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'মান মেলেনি'} — প্রত্যাশিত: ${JSON.stringify(expected)}, প্রাপ্ত: ${JSON.stringify(actual)}`);
  }
}

function assertClose(actual, expected, tol, msg) {
  if (typeof actual !== 'number' || Math.abs(actual - expected) > tol) {
    throw new Error(`${msg || 'কাছাকাছি মান মেলেনি'} — প্রত্যাশিত: ${expected}±${tol}, প্রাপ্ত: ${actual}`);
  }
}

function assertTrue(cond, msg) {
  if (!cond) {
    throw new Error(msg || 'শর্ত সত্য হয়নি');
  }
}

// ১. সুইচ হেল্পার পরীক্ষা
test('১. সুইচ হেল্পার: ডিফল্ট বন্ধ, __FZ_ON_A14FIX4-এ চালু এবং __FZ_OFF_A14FIX4-এ বন্ধ', () => {
  setBaseSwitches();
  assertEq(IR.a14Fix4On(), false, 'ডিফল্ট অবস্থায় IR.a14Fix4On() বন্ধ থাকবে');
  assertEq(LF.isA14Fix4On(), false, 'ডিফল্ট অবস্থায় LF.isA14Fix4On() বন্ধ থাকবে');
  assertEq(DB.a14Fix4On(), false, 'ডিফল্ট অবস্থায় DB.a14Fix4On() বন্ধ থাকবে');

  globalThis.__FZ_ON_A14FIX4 = true;
  assertEq(IR.a14Fix4On(), true, '__FZ_ON_A14FIX4=true হলে IR.a14Fix4On() চালু হবে');
  assertEq(LF.isA14Fix4On(), true, '__FZ_ON_A14FIX4=true হলে LF.isA14Fix4On() চালু হবে');
  assertEq(DB.a14Fix4On(), true, '__FZ_ON_A14FIX4=true হলে DB.a14Fix4On() চালু হবে');

  globalThis.__FZ_OFF_A14FIX4 = true;
  assertEq(IR.a14Fix4On(), false, '__FZ_OFF_A14FIX4=true হলে IR.a14Fix4On() বন্ধ হবে');
  assertEq(LF.isA14Fix4On(), false, '__FZ_OFF_A14FIX4=true হলে LF.isA14Fix4On() বন্ধ হবে');
  assertEq(DB.a14Fix4On(), false, '__FZ_OFF_A14FIX4=true হলে DB.a14Fix4On() বন্ধ হবে');
});

// ২. সুইচ বন্ধ (OFF) থাকলে গোল্ডেন IR অপরিবর্তিত থাকা
test('২. সুইচ বন্ধ থাকলে capture+measures থেকে নির্মিত IR গোল্ডেন IR-এর সমান', () => {
  setBaseSwitches();
  const irOff = IR.build(clone(rawCap), clone(rawMeas.measures), clone(rawMeas.pageInfo));
  assertEq(irOff.pages.length, 3, 'পাতা-সংখ্যা ৩ থাকবে');
  // পাতা ১ ব্যান্ড ১ ও ব্যান্ড ১৩-১৫ গোল্ডেন IR-এর সমান
  assertEq(irOff.pages[0].bands[1].cells[1].items[0].fontPt, rawGoldenIr.pages[0].bands[1].cells[1].items[0].fontPt, 'পাতা ১ হেডার ফন্ট অপরিবর্তিত');
  assertEq(irOff.pages[0].bands[13].cells[0].items.length, 1, 'পাতা ১ ব্যান্ড ১৩-এ ১টি আইটেম');
  assertEq(irOff.pages[0].bands[15].cells[0].items[0].fontPt, 7.5, 'পাতা ১ ফুটার ফন্ট ৭.৫pt');
  assertEq(irOff.pages[1].bands[1].cells[0].items[0].fontPt, 11.5, 'পাতা ২ প্রাপক ব্লক ফন্ট ১১.৫pt');
  assertEq(irOff.pages[1].bands[24].cells[0].items[0].fontPt, 11.5, 'পাতা ২ বিশেষ দ্রষ্টব্য ফন্ট ১১.৫pt');
  assertEq(irOff.pages[2].bands[2].cells[0].items[0].fontPt, 12, 'পাতা ৩ ক্রমিক ২। ফন্ট ১২pt');
});

// ৩. সুইচ বন্ধ (OFF) ও __FZ_OFF_A14FIX4 থাকলে XML বাইট-বাই-বাইট অভিন্ন
test('৩. সুইচ বন্ধ এবং __FZ_OFF_A14FIX4 থাকলে জেনারেটেড Word XML বাইট-বাই-বাইট অভিন্ন', () => {
  setBaseSwitches();
  const ir1 = clone(rawGoldenIr);
  LF.fit(ir1);
  const xmlBase = DB.bodyXml(ir1).xml;

  setBaseSwitches();
  globalThis.__FZ_ON_A14FIX4 = true;
  globalThis.__FZ_OFF_A14FIX4 = true;
  const ir2 = clone(rawGoldenIr);
  LF.fit(ir2);
  const xmlForcedOff = DB.bodyXml(ir2).xml;

  assertEq(xmlForcedOff, xmlBase, '__FZ_OFF_A14FIX4 থাকলে XML বাইট-বাই-বাইট অভিন্ন হতে হবে');
});

// ৪. পাতা ১: শীর্ষ হেডার ("Web : ... / E-mail : ...") ও লোগোর উচ্চতা মেরামত
test('৪. পাতা ১: শীর্ষ হেডারের ফন্ট (১৩.৫pt), লাইন-পিচ (১২pt) ও লোগোর প্রকৃত উচ্চতা (৪৭.৫pt) পুনরুদ্ধার', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A14FIX4 = true;
  const irOn = IR.build(clone(rawCap), clone(rawMeas.measures), clone(rawMeas.pageInfo));
  LF.fit(irOn);
  const b1 = irOn.pages[0].bands[1];
  const logoIt = b1.cells[0].items[0];
  const webIt = b1.cells[1].items[0];
  assertEq(webIt.fontPt, 13.5, 'পাতা ১ Web/E-mail ফন্ট ১৩.৫pt');
  assertEq(webIt.lineSpacingPt, 12, 'পাতা ১ Web/E-mail লাইন-পিচ ১২pt');
  assertClose(logoIt.heightPt, 47.5, 0.1, 'পাতা ১ লোগোর উচ্চতা ৪৭.৫pt');
});

// ৫. পাতা ১: উপরের স্বাক্ষর (Block 14) ও নিচের আদ্যক্ষর-স্বাক্ষর (Block 17) পুনরুদ্ধার
test('৫. পাতা ১: উপরের স্বাক্ষরের পূর্ণ প্রস্থ (১৯৯.১pt, উচ্চতা ৪৬.৩–৪৭.৬pt) এবং নিচের আদ্যক্ষর-স্বাক্ষর পুনঃস্থাপন', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A14FIX4 = true;
  const irOn = IR.build(clone(rawCap), clone(rawMeas.measures), clone(rawMeas.pageInfo));
  LF.fit(irOn);
  const b13 = irOn.pages[0].bands[13];
  assertEq(b13.cells[0].items.length, 2, 'ব্যান্ড ১৩-এ উপরের স্বাক্ষর ও নিচের আদ্যক্ষর-স্বাক্ষর উভয়ই ভাসমান চিত্র হিসেবে থাকবে');
  const topSig = b13.cells[0].items[0];
  const botSig = b13.cells[0].items[1];
  assertClose(topSig.widthPt, 199.1, 0.2, 'উপরের স্বাক্ষর চিত্রের প্রস্থ ১৯৯.১pt (তারিখ ২৩/৬/২০২২ অন্তর্ভুক্ত)');
  assertTrue(topSig.heightPt >= 45 && topSig.heightPt <= 48, 'উপরের স্বাক্ষর চিত্রের উচ্চতা ৪৫–৪৮pt');
  assertTrue(topSig.box[3] >= 910, 'উপরের স্বাক্ষরের ক্রপ-বক্স ডানদিকে ৯১০+ পর্যন্ত বিস্তৃত');
  assertClose(botSig.widthPt, 73.8, 0.2, 'নিচের আদ্যক্ষর-স্বাক্ষর চিত্রের প্রস্থ ৭৩.৮pt');
  assertTrue(botSig.heightPt >= 39 && botSig.heightPt <= 43, 'নিচের আদ্যক্ষর-স্বাক্ষর চিত্রের উচ্চতা ৩৯–৪৩pt');
  assertTrue(Boolean(botSig.floatAt), 'নিচের আদ্যক্ষর-স্বাক্ষর চিত্রটি ভাসমান (floatAt)');
});

// ৬. পাতা ১: ফাইল-পাথ ফুটারে ৭pt ফন্ট এবং ব্যাকস্ল্যাশকে LaTeX/OMML গণিত হিসেবে না ভাঙা
test('৬. পাতা ১: ফাইল-পাথ ফুটারের ফন্ট ৭pt এবং ExportDualEngine থাকলেও ব্যাকস্ল্যাশ অক্ষুণ্ণ রাখা', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A14FIX4 = true;
  const irOn = clone(rawGoldenIr);
  LF.fit(irOn);
  const footIt = irOn.pages[0].bands[15].cells[0].items[0];
  assertEq(footIt.fontPt, 7, 'ফাইল-পাথ ফুটারের ফন্ট ৭pt');

  // মক ExportDualEngine যা ব্যাকস্ল্যাশকে গণিত মনে করে বিকৃত করে
  const prevEngine = globalThis.ExportDualEngine;
  globalThis.ExportDualEngine = {
    renderDocxRuns(txt) {
      return `<w:r><w:t>${String(txt).replace(/\\\\[A-Za-z]+/g, 'MATH_CORRUPTED')}</w:t></w:r>`;
    }
  };
  try {
    const runXml = DB.runsFor('C:\\Users\\USER\\Desktop\\T.C-2021-2022\\T.C2021-2022.doc', footIt);
    assertTrue(runXml.includes('C:\\Users\\USER\\Desktop\\T.C-2021-2022\\T.C2021-2022.doc'), 'ফাইল-পাথে ব্যাকস্ল্যাশ হুবহু অক্ষুণ্ণ থাকবে');
    assertTrue(!runXml.includes('MATH_CORRUPTED'), 'ফাইল-পাথ কখনোই ExportDualEngine গণিত পার্সারে যাবে না');
  } finally {
    if (prevEngine === undefined) delete globalThis.ExportDualEngine;
    else globalThis.ExportDualEngine = prevEngine;
  }
});

// ৭. পাতা ২: প্রাপক ব্লক, ১-লাইনের অ-পূরণ অনুচ্ছেদ এবং বিন্দু-পূরণ সারির ফন্ট ও পিচ
test('৭. পাতা ২: প্রাপক ব্লক (১০pt/১২pt), অ-পূরণ লাইন (১০pt/১১pt), সম্বোধন ও পূরণ-সারির (১২.৫pt) পরিমার্জন', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A14FIX4 = true;
  const irOn = clone(rawGoldenIr);
  LF.fit(irOn);
  const p2 = irOn.pages[1];

  // ব্যান্ড ১: বরাবর / কলেজ পরিদর্শক...
  const recip = p2.bands[1].cells[0].items[0];
  assertEq(recip.fontPt, 10, 'প্রাপক ব্লকের ফন্ট ১০pt');
  assertEq(recip.lineSpacingPt, 12, 'প্রাপক ব্লকের লাইন-পিচ ১২pt');

  // ব্যান্ড ২, ৫, ৬, ২০: ১-লাইনের অ-পূরণ অনুচ্ছেদ
  assertEq(p2.bands[2].cells[0].items[0].fontPt, 11, 'বিষয় লাইনের ফন্ট ১১pt');
  assertEq(p2.bands[5].cells[0].items[0].fontPt, 10, 'সমাপনী অনুচ্ছেদের ফন্ট ১০pt');
  assertEq(p2.bands[6].cells[0].items[0].fontPt, 11, 'তথ্য শিরোনামের ফন্ট ১১pt');
  assertEq(p2.bands[20].cells[0].items[0].fontPt, 11, '০৭। ছাড়পত্র গ্রহণের কারণ লাইনের ফন্ট ১১pt');

  // ব্যান্ড ৩ ও ৪: জনাব, এবং বিনীত নিবেদন...
  assertEq(p2.bands[3].cells[0].items[0].lineSpacingPt, 10.1, 'জনাব, লাইনের পিচ ১০.১pt');
  assertEq(p2.bands[4].cells[0].items[0]._a14SplitLeaderFirstLh, 12, 'বিনীত নিবেদন প্রথম লাইনের উচ্চতা ১২pt');

  // ব্যান্ড ৭, ৯, ১০: ১-লাইনের বিন্দু-পূরণ সারি (০১।, (খ) মাতার নাম, ০৩।)
  assertEq(p2.bands[7].cells[0].items[0].fontPt, 12.5, '০১। সারির ফন্ট ১২.৫pt');
  assertEq(p2.bands[9].cells[0].items[0].fontPt, 12.5, '(খ) মাতার নাম সারির ফন্ট ১২.৫pt');
  assertEq(p2.bands[10].cells[0].items[0].fontPt, 12.5, '০৩। সারির ফন্ট ১২.৫pt');
});

// ৮. পাতা ২: ৬) ... ৭) ... (৪র্থ বিষয়)। লাইনের ডট-লিডার ট্যাব-স্টপ ও নিচের বিশেষ দ্রষ্টব্য পাদটীকা
test('৮. পাতা ২: (৪র্থ বিষয়)। লাইনের ট্যাব-স্টপ ডানে প্রসারণ এবং বিশেষ দ্রষ্টব্য পাদটীকা (১০.৫pt) ও ভাসমান স্বাক্ষরে behindDoc="1"', () => {
  setBaseSwitches();
  const irOff = clone(rawGoldenIr);
  LF.fit(irOff);
  const xmlOff = DB.bodyXml(irOff).xml;

  setBaseSwitches();
  globalThis.__FZ_ON_A14FIX4 = true;
  const irOn = clone(rawGoldenIr);
  // ভাসমান চিত্রের XML পরীক্ষার জন্য ডামি dataUrl সংযোজন
  irOn.pages[1].bands[24].cells[0].items[1].image = { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', pxW: 100, pxH: 50 };
  LF.fit(irOn);
  const xmlOn = DB.bodyXml(irOn).xml;

  // বিশেষ দ্রষ্টব্য ফন্ট ১০.৫pt (sz=21) এবং লাইন-পিচ ১১.৪pt (w:line="228")
  const foot = irOn.pages[1].bands[24].cells[0].items[0];
  assertEq(foot.fontPt, 10.5, 'বিশেষ দ্রষ্টব্য পাদটীকার ফন্ট ১০.৫pt');
  assertEq(foot.lineSpacingPt, 11.4, 'বিশেষ দ্রষ্টব্য পাদটীকার লাইন-পিচ ১১.৪pt');

  // ৬) ... ৭) ... (৪র্থ বিষয়)। লাইনের ২য় ট্যাব-স্টপ ৭৫৬৫ twips থেকে বেড়ে >= ৭৮৫০ twips হয়েছে
  assertTrue(xmlOff.includes('w:pos="7565"'), 'সুইচ বন্ধ থাকলে ২য় ট্যাব-স্টপ 7565 twips');
  const mTabOn = /<w:tabs><w:tab w:val="left" w:leader="dot" w:pos="4\d{3}"\/><w:tab w:val="left" w:leader="dot" w:pos="(\d+)"\/><\/w:tabs>/.exec(xmlOn);
  assertTrue(Boolean(mTabOn) && Number(mTabOn[1]) >= 7850, 'সুইচ চালু থাকলে ২য় ট্যাব-স্টপ >= 7850 twips');

  // ভাসমান স্বাক্ষর চিত্রে behindDoc="1"
  assertTrue(xmlOn.includes('behindDoc="1"'), 'ভাসমান স্বাক্ষর চিত্রে behindDoc="1" থাকবে যাতে লেখা না ঢাকে');
  assertTrue(!xmlOn.includes('behindDoc="0"'), 'ভাসমান স্বাক্ষর চিত্রে behindDoc="0" থাকবে না');
});

// ৯. পাতা ৩: ক্রমিক নির্দেশনা তালিকার (২।, ৩।, ৬।, ৮।, ১১।) ফন্ট, পিচ ও শেষ-লাইন সংযোগ
test('৯. পাতা ৩: ১-লাইনের নির্দেশনার ফন্ট (১২.৫pt), ৩।-এর পিচ (১৪pt), ৮।-এর ২য় লাইন (১১.৫pt) ও ১১।-এর ৪র্থ লাইনের position', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A14FIX4 = true;
  const irOn = clone(rawGoldenIr);
  LF.fit(irOn);
  const xmlOn = DB.bodyXml(irOn).xml;
  const p3 = irOn.pages[2];

  assertEq(p3.bands[2].cells[0].items[0].fontPt, 12.5, 'ক্রমিক ২।-এর ফন্ট ১২.৫pt');
  assertEq(p3.bands[3].cells[0].items[0].lineSpacingPt, 14, 'ক্রমিক ৩।-এর লাইন-পিচ ১৪pt');
  assertEq(p3.bands[6].cells[0].items[0].fontPt, 12.5, 'ক্রমিক ৬।-এর ফন্ট ১২.৫pt');
  assertEq(p3.bands[8].cells[0].items[0]._a14LastLineFontPt, 11.5, 'ক্রমিক ৮।-এর শেষ লাইনের ফন্ট ১১.৫pt');
  assertEq(p3.bands[11].cells[0].items[0]._a14LastLineRaise, 2, 'ক্রমিক ১১।-এর শেষ লাইনের ঊর্ধ্ব-সরণ ২ half-pt');
  assertTrue(xmlOn.includes('<w:position w:val="2"/>'), 'পাতা ৩-এর XML-এ <w:position w:val="2"/> উপস্থিত');
});

// ১০. পাতা-সংখ্যা ও পুনরাবৃত্ত কল (Idempotency) পরীক্ষা
test('১০. পাতা-সংখ্যা কখনো ৩-এর বেশি হয় না এবং বারবার fit/bodyXml চালালেও আউটপুট অভিন্ন থাকে', () => {
  setBaseSwitches();
  globalThis.__FZ_ON_A14FIX4 = true;
  const irOn = IR.build(clone(rawCap), clone(rawMeas.measures), clone(rawMeas.pageInfo));
  LF.fit(irOn);
  const xml1 = DB.bodyXml(irOn).xml;
  const irSnap1 = JSON.stringify(irOn);

  // পুনরায় repairA14Fix4Ir ও bodyXml চালানো
  IR.repairA14Fix4Ir(irOn);
  const xml2 = DB.bodyXml(irOn).xml;
  const irSnap2 = JSON.stringify(irOn);

  const sectCount = (xml1.match(/<w:sectPr\b/g) || []).length;
  assertEq(sectCount, 3, 'ডকুমেন্টে ঠিক ৩টি পাতা (sectPr) থাকবে');
  assertEq(irSnap2, irSnap1, 'পুনরায় fit/bodyXml চালালেও IR অপরিবর্তিত (Idempotent)');
  assertEq(xml2, xml1, 'পুনরায় fit/bodyXml চালালেও XML অপরিবর্তিত (Idempotent)');
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
