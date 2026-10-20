import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

require(path.join(ROOT, 'js/layout-engine/faithful/grid-first.js'));
const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const BLD = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const a03MeasPath = path.join(ROOT, 'qa/golden-data/asis/a03/measures.json');
const a03IrPath = path.join(ROOT, 'qa/golden-data/asis/a03/ir.json');
const a13IrPath = path.join(ROOT, 'qa/golden-data/asis/a13/ir.json');

function resetSwitches() {
  delete globalThis.__FZ_ON_NESTBOX;
  delete globalThis.__FZ_OFF_NESTBOX;
  delete globalThis.__FZ_ON_A03FIX;
  delete globalThis.__FZ_OFF_A03FIX;
  if (typeof process !== 'undefined' && process.env) {
    delete process.env.__FZ_ON_NESTBOX;
    delete process.env.__FZ_OFF_NESTBOX;
    delete process.env.FZ_ON;
    delete process.env.FZ_OFF;
  }
}

test('NESTBOX_v1: ডিফল্টে সুইচ বন্ধ এবং সুইচ বন্ধ থাকলে a03 ও a13-এর আউটপুট অবিকল থাকে', () => {
  resetSwitches();
  assert.equal(IR.nestBoxOn(), false);
  assert.equal(LF.isNestBoxOn(), false);
  assert.equal(BLD.nestBoxOn(), false);

  const meas03 = JSON.parse(fs.readFileSync(a03MeasPath, 'utf8'));
  const ir03Off1 = IR.build(meas03.cap, meas03.measures, meas03.pageInfo);
  LF.fit(ir03Off1);
  const xml03Off1 = BLD.bodyXml(ir03Off1).xml;

  // সুইচ বন্ধ অবস্থায় পাতা ১ ও পাতা ২-এ কেবল ১টি করে বক্স থাকে
  assert.equal(ir03Off1.pages[0].boxes.length, 1);
  assert.equal(ir03Off1.pages[1].boxes.length, 1);

  // সুইচ চালু করে আবার বন্ধ করলে আগের আউটপুটের সাথে হুবহু মেলে
  globalThis.__FZ_ON_NESTBOX = true;
  assert.equal(IR.nestBoxOn(), true);
  resetSwitches();
  assert.equal(IR.nestBoxOn(), false);

  const ir03Off2 = IR.build(meas03.cap, meas03.measures, meas03.pageInfo);
  LF.fit(ir03Off2);
  const xml03Off2 = BLD.bodyXml(ir03Off2).xml;

  assert.deepEqual(ir03Off2, ir03Off1);
  assert.equal(xml03Off2, xml03Off1);
});

test('NESTBOX_v1: সুইচ চালু থাকলে a03-এ মাপা রেখা থেকে আলাদা বক্স (>= 2), ঘরের ভেতরে নেস্টেড টেবিল ও পাশাপাশি বক্স তৈরি হয়', () => {
  resetSwitches();
  globalThis.__FZ_ON_NESTBOX = true;
  assert.equal(IR.nestBoxOn(), true);
  assert.equal(LF.isNestBoxOn(), true);
  assert.equal(BLD.nestBoxOn(), true);

  const meas03 = JSON.parse(fs.readFileSync(a03MeasPath, 'utf8'));
  const ir03On = IR.build(meas03.cap, meas03.measures, meas03.pageInfo);
  LF.fit(ir03On);
  const xml03On = BLD.bodyXml(ir03On).xml;

  // ১. পাতা ১ ও পাতা ২ উভয়েই আলাদা বক্স (>= 2) শনাক্ত হয়েছে
  assert.ok(Array.isArray(ir03On.pages[0].boxes) && ir03On.pages[0].boxes.length >= 2, 'Page 1 must have >= 2 boxes');
  assert.ok(Array.isArray(ir03On.pages[1].boxes) && ir03On.pages[1].boxes.length >= 2, 'Page 2 must have >= 2 boxes');

  const closedP1 = IR.detectClosedBoxes(ir03On.pages[0], meas03.pageInfo['1']);
  const closedP2 = IR.detectClosedBoxes(ir03On.pages[1], meas03.pageInfo['2']);
  assert.ok(closedP1.length >= 2, 'detectClosedBoxes on Page 1 must return >= 2 closed boxes');
  assert.ok(closedP2.length >= 2, 'detectClosedBoxes on Page 2 must return >= 2 closed boxes');

  // ২. পাতা ১-এর নিচের অংশে ২-কলাম বক্স-গ্রিড: বাম কলামে লিঙ্গ ও ধর্ম (মাঝে অনুভূমিক বিভাজক রেখা) এবং ডান কলামে জন্ম তারিখ + নেস্টেড দিন|মাস|বছর টেবিল
  const p1BottomGrid = ir03On.pages[0].bands[ir03On.pages[0].bands.length - 1];
  assert.equal(p1BottomGrid.kind, 'grid');
  assert.equal(p1BottomGrid.cells.length, 2);
  assert.equal(p1BottomGrid.cells[0].ruleRight, true);
  assert.ok(p1BottomGrid.cells[0].items[0].ruleBelow, 'Left column top item (লিঙ্গ) must have horizontal divider ruleBelow');
  assert.ok(p1BottomGrid.cells[1].items.some((it) => it.kind === 'para' && /জন্ম তারিখ/.test(it.text || '')), 'Right column must contain জন্ম তারিখ header');
  assert.ok(p1BottomGrid.cells[1].items.some((it) => it.kind === 'table' && !it.borderless), 'Right column must contain nested দিন|মাস|বছর table');

  // ৩. পাতা ২-এর উপরের ঠিকানা অংশে পাশাপাশি ২টি বক্স এবং উভয় ঘরে নেস্টেড পোষ্ট কোড ৪-ঘর টেবিল
  const p2TopGrid = ir03On.pages[1].bands[0];
  assert.equal(p2TopGrid.kind, 'grid');
  assert.equal(p2TopGrid.cells.length, 2);
  assert.equal(p2TopGrid.cells[0].ruleRight, true);
  const leftHasNestedPostCode = p2TopGrid.cells[0].items.some((it) => it.kind === 'table' && it.boxLabel);
  const rightHasNestedPostCode = p2TopGrid.cells[1].items.some((it) => it.kind === 'table' && it.boxLabel);
  assert.equal(leftHasNestedPostCode, true, 'Left address box must have nested post-code table');
  assert.equal(rightHasNestedPostCode, true, 'Right address box must have nested post-code table');

  // ৪. পাতা ২-এর নিচে পাশাপাশি স্বাক্ষর ও তারিখ বক্স ([বাক্স ১, ফাঁক, বাক্স ২]) এবং মাঝের ফাঁক বর্ডারহীন
  const p2LastBand = ir03On.pages[1].bands[ir03On.pages[1].bands.length - 1];
  const sigDateTbl = p2LastBand.cells[0].items[0];
  assert.equal(sigDateTbl.kind, 'table');
  assert.deepEqual(sigDateTbl.splitBoxCols, [true, false, true]);
  assert.equal(sigDateTbl.rows[0].length, 3);
  assert.ok(/<w:tcBorders><w:top w:val="single"/.test(xml03On), 'DOCX XML must render 4-sided cell borders for splitBoxCols');

  // ৫. পূর্ব-নির্মিত ir.json পথেও একইভাবে >= 2 বক্স ও অভিন্ন XML তৈরি হয়
  const ir03FromJson = JSON.parse(fs.readFileSync(a03IrPath, 'utf8'));
  const xml03FromJson = BLD.bodyXml(ir03FromJson).xml;
  assert.ok(ir03FromJson.pages[0].boxes.length >= 2);
  assert.ok(ir03FromJson.pages[1].boxes.length >= 2);
  assert.equal(xml03FromJson, xml03On);

  resetSwitches();
});

test('NESTBOX_v1: সুইচ চালু থাকলেও আলাদা বক্সবিহীন ফাইল a13 সম্পূর্ণ অপরিবর্তিত থাকে (কোনো রিগ্রেশন নেই)', () => {
  resetSwitches();
  const ir13Off = JSON.parse(fs.readFileSync(a13IrPath, 'utf8'));
  LF.fit(ir13Off);
  const xml13Off = BLD.bodyXml(ir13Off).xml;

  globalThis.__FZ_ON_NESTBOX = true;
  const ir13On = JSON.parse(fs.readFileSync(a13IrPath, 'utf8'));
  LF.fit(ir13On);
  const xml13On = BLD.bodyXml(ir13On).xml;

  assert.deepEqual(ir13On, ir13Off);
  assert.equal(xml13On, xml13Off);
  resetSwitches();
});
