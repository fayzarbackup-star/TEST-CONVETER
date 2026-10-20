import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const Builder = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

function resolveDataDir() {
  const qaDir = path.join(ROOT, 'qa/golden-data/asis/a14');
  if (fs.existsSync(path.join(qaDir, 'ir.json'))) return qaDir;
  return path.join(ROOT, 'samples/a14');
}

const DATA_DIR = resolveDataDir();
const rawIrJson = fs.readFileSync(path.join(DATA_DIR, 'ir.json'), 'utf8');
const rawMeasuresJson = fs.existsSync(path.join(DATA_DIR, 'measures.json'))
  ? fs.readFileSync(path.join(DATA_DIR, 'measures.json'), 'utf8')
  : null;

function setSwitch(on) {
  if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
  if (on) {
    delete globalThis.__FZ_OFF_A14FIX;
    delete globalThis.window.__FZ_OFF_A14FIX;
    globalThis.__FZ_ON_A14FIX = true;
    globalThis.window.__FZ_ON_A14FIX = true;
  } else {
    delete globalThis.__FZ_ON_A14FIX;
    delete globalThis.window.__FZ_ON_A14FIX;
    delete globalThis.__FZ_OFF_A14FIX;
    delete globalThis.window.__FZ_OFF_A14FIX;
  }
}

test('A14_SCORE_v1: সুইচ বন্ধ (OFF) থাকলে পূর্বের আউটপুট হুবহু অপরিবর্তিত থাকে', () => {
  setSwitch(false);
  assert.equal(LF.isA14FixOn(), false);

  const ir = JSON.parse(rawIrJson);
  const p1 = ir.pages[0];
  const p2 = ir.pages[1];
  const p3 = ir.pages[2];

  // পাতা-১: পুরোনো অবস্থায় শিরোনামে underline=true এবং চ)-এ indentPt=0
  assert.equal(p1.bands[5].cells[0].items[0].underline, true);
  assert.equal(p1.bands[11].cells[0].items[0].indentPt, 0);

  // পাতা-২: বিনীত নিবেদন অনুচ্ছেদে keepLines=false এবং B45 ছকে ২ কলাম (colFractions.length === 2)
  assert.equal(p2.bands[4].cells[0].items[0].keepLines, false);
  const tblOff = p2.bands[23].cells[0].items[0];
  assert.equal(tblOff.rows.length, 14);
  assert.equal(tblOff.colFractions.length, 2);

  // পাতা-৩: ১৪টি ব্যান্ড (Band 10-এ ১০। ও ১১। একত্রে) এবং শেষে RECITATION সতর্কবার্তা বিদ্যমান
  assert.equal(p3.bands.length, 14);
  assert.equal(p3.bands[10].cells[0].items.length, 2);
  const outOff = Builder.bodyXml(ir);
  assert.ok(outOff.xml.includes('RECITATION'));
});

test('A14_SCORE_v1: সুইচ চালু (ON) থাকলে পাতা-২-এর ২-লাইনের ফরম-অনুচ্ছেদ ও +১৭pt উল্লম্ব সরণ সংশোধিত হয়', () => {
  setSwitch(true);
  assert.equal(LF.isA14FixOn(), true);

  const ir = JSON.parse(rawIrJson);
  LF.fit(ir);
  const p2 = ir.pages[1];
  const b26 = p2.bands[4].cells[0].items[0];

  // "বিনীত নিবেদন এই যে..." অনুচ্ছেদটি ২ লাইনেই অক্ষত থাকে এবং প্রথম লাইনের ৩৬pt ইনডেন্ট বজায় থাকে
  assert.equal(b26.keepLines, true);
  assert.equal(b26.keepJust, true);
  assert.equal(b26.firstIndentPt, 36);
  assert.equal(b26.lines.length, 2);
  assert.ok(b26.justRightPt >= 30);
  assert.ok(b26.fit && b26.fit.fillsCut >= 2);

  const { xml } = Builder.bodyXml(ir);
  // ইনলাইন লিডার-ট্যাবে এক লাইনে গলিয়ে না ফেলে <w:br/> সহ ২-লাইনের অনুচ্ছেদ হিসেবে রেন্ডার হয়
  assert.ok(xml.includes('বিনীত নিবেদন এই যে, আমি বর্তমানে'));
  const plan2 = Builder.planPage(p2);
  assert.equal(plan2.f, 1);
});

test('A14_SCORE_v1: সুইচ চালু (ON) থাকলে পাতা-২-এর জোড়া প্রত্যয়ন-বাক্স ছক ১ কলামে ও ৪টি আনুভূমিক রেখায় এবং বিশেষ দ্রষ্টব্য সঠিক অবস্থানে থাকে', () => {
  setSwitch(true);
  const ir = JSON.parse(rawIrJson);
  LF.fit(ir);
  const p2 = ir.pages[1];
  const tbl = p2.bands[23].cells[0].items[0];

  // অভ্যন্তরীণ ভ্রান্ত খাড়া দাগ (x=492.25) দূর করতে ১ কলামে একীভূত এবং ডান-ট্যাব (\t) ব্যবহৃত
  assert.equal(tbl.colFractions, null);
  assert.equal(tbl.rows.length, 15);
  assert.ok(tbl.rows.every((r) => r.length === 1));
  assert.ok(tbl.rows[6][0].includes('\t'));
  assert.ok(tbl.rows[14][0].includes('\t'));

  // বক্স-১ (0..6), মাঝের ২.৯pt বর্ডারহীন ফাঁক-সারি (7) এবং বক্স-২ (8..14) — মোট উচ্চতা ২১০.৭pt (539.8..750.5)
  assert.equal(tbl.exactRuleHeights, true);
  assert.ok(tbl.gapRows && tbl.gapRows[7] === true);
  assert.equal(tbl.heightPt, 210.7);
  assert.equal(tbl.rect.y, 539.8);
  assert.equal(tbl.rect.h, 210.7);

  // উভয় প্রত্যয়ন বাক্সের শিরোনাম মাঝ-সাজানো, মোটা ও নিচে-দাগযুক্ত
  assert.equal(tbl.cellAligns[0][0], 'c');
  assert.equal(tbl.cellAligns[8][0], 'c');
  assert.ok(tbl.rows[0][0].includes('<u>') && tbl.rows[0][0].includes('**'));
  assert.ok(tbl.rows[8][0].includes('<u>') && tbl.rows[8][0].includes('**'));

  // ছকের নিচের "বিশেষ দ্রষ্টব্য" অনুচ্ছেদ ছকের নিচে (y=752.4) ঝুলন্ত ইনডেন্টসহ (-23pt) ও ভাসমান স্বাক্ষরের চাপে সংকুচিত না হয়ে ১২.২pt লাইন-দূরত্বে থাকে
  const foot = p2.bands[24].cells[0].items[0];
  assert.equal(foot.rect.y, 752.4);
  assert.equal(foot.firstIndentPt, -23);
  assert.equal(foot.align, 'j');
  assert.equal(foot.keepLines, true);
  assert.equal(foot.keepJust, true);
  assert.equal(foot.lineSpacingPt, 12.2);

  const plan2 = Builder.planPage(p2);
  const footPlan = plan2.els.find((e) => e.it && e.it.text && e.it.text.includes('বিশেষ দ্রষ্টব্য'));
  assert.ok(footPlan);
  assert.equal(footPlan.it.lineSpacingPt, 12.2);
});

test('A14_SCORE_v1: সুইচ চালু (ON) থাকলে পাতা-৩-এর ক্রমিক তালিকা (১।–১৪।), উপরের বক্স ও RECITATION সতর্কবার্তা সংশোধিত হয়', () => {
  setSwitch(true);
  const ir = JSON.parse(rawIrJson);
  LF.fit(ir);
  const p3 = ir.pages[2];

  // উপরের বক্সে ভ্রান্ত পৃষ্ঠা-নম্বর "৩" অপসারিত এবং ১টি শিরোনাম + ১৪টি স্বতন্ত্র ক্রমিক অনুচ্ছেদ = মোট ১৫টি ব্যান্ড
  assert.equal(p3.bands.length, 15);
  assert.equal(p3.bands[0].cells[0].items.length, 1);
  assert.equal(p3.bands[0].cells[0].items[0].type, 'heading');
  assert.equal(p3.bands[0].cells[0].items[0].underline, false);

  // ৩। এবং ১১।–১৪। প্রতিটি অনুচ্ছেদে ঝুলন্ত ইনডেন্ট (-23pt), ফন্ট ১২pt ও সঠিক ক্রমবর্ধমান y-অবস্থান রয়েছে
  const item3 = p3.bands[3].cells[0].items[0];
  assert.equal(item3.firstIndentPt, -23);
  assert.equal(item3.indentPt, 23);
  assert.equal(item3.align, 'j');

  const item10 = p3.bands[10].cells[0].items[0];
  const item11 = p3.bands[11].cells[0].items[0];
  const item12 = p3.bands[12].cells[0].items[0];
  const item13 = p3.bands[13].cells[0].items[0];
  const item14 = p3.bands[14].cells[0].items[0];

  assert.ok(item11.rect.y >= item10.rect.y + item10.rect.h + 10);
  assert.ok(item12.rect.y >= item11.rect.y + item11.rect.h + 10);
  assert.ok(item13.rect.y >= item12.rect.y + item12.rect.h + 10);
  assert.ok(item14.rect.y >= item13.rect.y + item13.rect.h + 10);

  for (const it of [item11, item12, item13, item14]) {
    assert.equal(it.fontPt, 12);
    assert.equal(it.indentPt, 23);
    assert.equal(it.firstIndentPt, -23);
    assert.equal(it.align, 'j');
    assert.equal(it.keepLines, true);
    assert.equal(it.keepJust, true);
  }

  // ১৪।-এ RECITATION সতর্কবার্তা নেই (৩ লাইন) এবং ওয়েবসাইট ঠিকানার নিচে দাগ (<u>...</u>) আছে
  assert.equal(item14.lines.length, 3);
  assert.ok(item14.lines[1].includes('<u>www.dinajpureducationboard.gov.bd</u>'));

  const { xml } = Builder.bodyXml(ir);
  assert.ok(!xml.includes('RECITATION'));
  assert.ok(!xml.includes('অসম্পূর্ণ'));
});

test('A14_SCORE_v1: সুইচ চালু (ON) থাকলে পাতা-১-এর ভ্রান্ত শিরোনাম-দাগ, চ)/ছ) ইনডেন্ট ও স্বাক্ষর ব্লক এবং IR.build পথও সঠিক কাজ করে', () => {
  setSwitch(true);
  const ir = JSON.parse(rawIrJson);
  LF.fit(ir);
  const p1 = ir.pages[0];

  // পাতা-১: ভ্রান্ত শিরোনাম underline=false (y=311.25 এর অতিরিক্ত রুল অপসারিত)
  assert.equal(p1.bands[5].cells[0].items[0].underline, false);
  // চ) ও ছ)-এর বাম ইনডেন্ট (53.2pt) এবং ঝুলন্ত ইনডেন্ট (-17 / -19pt) অক্ষত
  assert.equal(p1.bands[11].cells[0].items[0].fontPt, 15);
  assert.equal(p1.bands[11].cells[0].items[0].indentPt, 53.2);
  assert.equal(p1.bands[11].cells[0].items[0].firstIndentPt, -17);
  assert.equal(p1.bands[12].cells[0].items[0].indentPt, 53.2);
  assert.equal(p1.bands[12].cells[0].items[0].firstIndentPt, -19);

  // স্বাক্ষর ঘরে ক্ষুদ্র ডুপ্লিকেট ছবি অপসারিত এবং স্বাক্ষর মাঝ-সাজানো (align === 'c')
  assert.equal(p1.bands[14].cells[1].items.length, 1);
  assert.equal(p1.bands[14].cells[1].items[0].align, 'c');

  // সরাসরি measures.json থেকে IR.build চালালেও একই মেরামত কার্যকর হয়
  if (rawMeasuresJson) {
    const meas = JSON.parse(rawMeasuresJson);
    const builtIr = IR.build(meas.cap, meas.measures, meas.pageInfo);
    LF.fit(builtIr);
    assert.equal(builtIr.pages[0].bands[5].cells[0].items[0].underline, false);
    assert.equal(builtIr.pages[1].bands[23].cells[0].items[0].colFractions, null);
    assert.equal(builtIr.pages[2].bands.length, 15);
  }

  setSwitch(false);
});
