import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const IR = require('../js/layout-engine/faithful/layout-ir.js');
const LF = require('../js/layout-engine/faithful/line-fit.js');
const DOCX = require('../js/layout-engine/faithful/faithful-docx-builder.js');

const DATA_DIR = fs.existsSync(path.resolve(__dirname, '../qa/golden-data/asis/a07/measures.json'))
  ? path.resolve(__dirname, '../qa/golden-data/asis/a07')
  : path.resolve(__dirname, '../samples/a07');

const measuresData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'measures.json'), 'utf8'));
const baselineIrData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ir.json'), 'utf8'));

function clearA07Switch() {
  delete globalThis.__FZ_ON_A07FIX;
  delete globalThis.__FZ_OFF_A07FIX;
  if (typeof globalThis.window !== 'undefined' && globalThis.window) {
    delete globalThis.window.__FZ_ON_A07FIX;
    delete globalThis.window.__FZ_OFF_A07FIX;
  }
  if (typeof process !== 'undefined' && process.env) {
    delete process.env.__FZ_ON_A07FIX;
    delete process.env.FZ_ON;
  }
}

test('A07FIX সুইচ বন্ধ (ডিফল্ট) থাকলে আউটপুট হুবহু আগের মতো থাকে এবং সব পুরোনো সুইচ অক্ষত থাকে', () => {
  clearA07Switch();
  assert.equal(LF.isA07FixOn(), false);

  // পুরোনো সুইচগুলোর অস্তিত্ব যাচাই
  assert.equal(typeof LF.isP1LossOn, 'function');
  assert.equal(typeof LF.isA01FixOn, 'function');
  assert.equal(typeof LF.isP2DriftOn, 'function');
  assert.equal(typeof LF.isRuleFixOn, 'function');
  assert.equal(typeof LF.isA10LinesOn, 'function');
  assert.equal(typeof LF.isExtraLinesOn, 'function');
  assert.equal(typeof LF.isWrapFitOn, 'function');

  const irOff = IR.build(measuresData.cap, measuresData.measures, measuresData.pageInfo);
  LF.fit(irOff);
  const irOffSnap = JSON.parse(JSON.stringify(irOff));
  assert.equal(irOff.pages.length, 5);
  assert.equal(irOff.pages[0].bands.length, 7);
  assert.equal(irOff.pages[0].bands[5].cells[0].items[0].fontPt, 9);
  assert.equal(irOff.pages[1].bands[3].cells[0].items[0].rows.length, 3);
  assert.equal(irOff.pages[2].bands[2].cells[0].items[0].rows[0].length, 4);
  assert.equal(irOff.pages[2].bands[2].cells[0].items[0].fontPt, 10);
  assert.equal(irOff.pages[3].bands[2].cells[0].items[0].rows[2][2], '');
  assert.equal(irOff.pages[4].bands[5].cells[0].items[0].fontPt, 7);

  const preIrOff = JSON.parse(JSON.stringify(baselineIrData));
  LF.fit(preIrOff);
  assert.deepEqual(preIrOff, baselineIrData);
  const xmlOff1 = DOCX.bodyXml(preIrOff).xml;
  const xmlBuildOff1 = DOCX.bodyXml(irOff).xml;

  // __FZ_OFF_A07FIX সত্য হলে __FZ_ON_A07FIX থাকলেও সুইচ নিষ্ক্রিয় থাকবে
  globalThis.__FZ_ON_A07FIX = true;
  globalThis.__FZ_OFF_A07FIX = true;
  assert.equal(LF.isA07FixOn(), false);
  const irForcedOff = IR.build(measuresData.cap, measuresData.measures, measuresData.pageInfo);
  LF.fit(irForcedOff);
  assert.deepEqual(JSON.parse(JSON.stringify(irForcedOff)), irOffSnap);
  const xmlOff2 = DOCX.bodyXml(JSON.parse(JSON.stringify(baselineIrData))).xml;
  const xmlBuildOff2 = DOCX.bodyXml(irForcedOff).xml;
  assert.equal(xmlOff2, xmlOff1);
  assert.equal(xmlBuildOff2, xmlBuildOff1);
  clearA07Switch();
});

test('A07FIX চালু করলে পাতা ২-এর ছক-২-এ হারানো ২টি ফাঁকা সারি ও ৬টি আড়া-রেখা পুনরুদ্ধার হয় (৩×৮ ⇒ ৫×৮)', () => {
  clearA07Switch();
  globalThis.window = globalThis.window || globalThis;
  globalThis.window.__FZ_ON_A07FIX = true;
  assert.equal(LF.isA07FixOn(), true);

  // ১) পূর্ণ পাইপলাইন (IR.build -> LF.fit -> DOCX.bodyXml)
  const irOn = IR.build(measuresData.cap, measuresData.measures, measuresData.pageInfo);
  LF.fit(irOn);
  const p2Tbl = irOn.pages[1].bands[3].cells[0].items[0];
  assert.equal(p2Tbl.rows.length, 5, 'পাতা ২-এর ছকে ৫টি সারি থাকতে হবে');
  assert.equal(p2Tbl.rows[0].length, 8, 'পাতা ২-এর ছকে ৮টি কলাম থাকতে হবে');
  assert.equal(p2Tbl.srcRulesPt.length, 6, 'পাতা ২-এর ছকে ৬টি আড়া-রেখা থাকতে হবে');
  assert.ok(Math.abs(p2Tbl.rowHeightsPt[0] - 98.4) <= 1.0, 'শিরোনাম-সারির উচ্চতা ~৯৮.৪pt হতে হবে');
  assert.ok(Math.abs(p2Tbl.rowHeightsPt[1] - 14.4) <= 1.0, 'কলাম-নম্বর সারির (১..৮) উচ্চতা ~১৪.৪pt হতে হবে');
  assert.ok(p2Tbl.rowHeightsPt[2] >= 40 && p2Tbl.rowHeightsPt[2] <= 45, '১ম ফাঁকা সারির উচ্চতা ~৪২.৯pt হতে হবে');
  assert.equal(p2Tbl.headFontPt, 11.5, 'শিরোনাম-সারির ফন্ট ১১.৫pt হতে হবে');

  // ২) পূর্ব-নির্মিত ir.json থেকেও পুনরুদ্ধার যাচাই
  const irPre = JSON.parse(JSON.stringify(baselineIrData));
  LF.fit(irPre);
  const p2TblPre = irPre.pages[1].bands[3].cells[0].items[0];
  assert.equal(p2TblPre.rows.length, 5);
  assert.equal(p2TblPre.srcRulesPt.length, 6);

  const xmlOn = DOCX.bodyXml(irOn).xml;
  const p2Section = xmlOn.split(/<w:sectPr>[\s\S]*?<\/w:sectPr>/)[1];
  const p2Trs = [...p2Section.matchAll(/<w:tr>[\s\S]*?<\/w:tr>/g)];
  assert.equal(p2Trs.length, 5, 'পাতা ২-এর DOCX টেবিলে ৫টি <w:tr> থাকতে হবে');
  clearA07Switch();
});

test('A07FIX চালু করলে পাতা ৩-এর ছক-৩-এ বাড়তি ৪র্থ কলাম ভাঁজ হয়ে ৩ কলাম হয় এবং ফন্ট ১১.৫pt ও সঠিক লাইন-দূরত্ব বসে', () => {
  clearA07Switch();
  process.env.FZ_ON = 'A07FIX';
  assert.equal(LF.isA07FixOn(), true);

  const irOn = IR.build(measuresData.cap, measuresData.measures, measuresData.pageInfo);
  LF.fit(irOn);
  const p3Tbl = irOn.pages[2].bands[2].cells[0].items[0];

  assert.equal(p3Tbl.rows.length, 7);
  assert.equal(Math.max(...p3Tbl.rows.map((r) => r.length)), 3, 'বাড়তি ৪র্থ কলাম ভাঁজ হয়ে ৩ কলাম হতে হবে');
  assert.equal(p3Tbl.colFractions.length, 3);
  assert.deepEqual(p3Tbl.fullVRule, [true, true]);
  assert.equal(p3Tbl.fontPt, 11.5, 'বহু-লাইনের ফরম-ছকের ফন্ট ১০pt থেকে ১১.৫pt হতে হবে');
  assert.ok(p3Tbl.rows[3][2].includes('\tহ্যাঁ/না (সম্ভাব্য প্রমাণক)'), 'সারি ৪-এ ডান অংশ ট্যাব দিয়ে যুক্ত থাকতে হবে');
  assert.equal(p3Tbl.rows[5][2].split('\n').length, 4, 'সারি ৬ (ইনোভেশন)-এ (ক) ও (খ) ভেঙে মোট ৪ লাইন হতে হবে');

  const xmlOn = DOCX.bodyXml(irOn).xml;
  const p3Section = xmlOn.split(/<w:sectPr>[\s\S]*?<\/w:sectPr>/)[2];
  const p3MainTbl = [...p3Section.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)][0][0];
  const gridCols = [...p3MainTbl.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)];
  assert.equal(gridCols.length, 3, 'পাতা ৩-এর প্রধান ছকে ৩টি gridCol থাকতে হবে (৪৮০.২৫pt-এর বাড়তি খাড়া রেখা বর্জন)');
  assert.ok(/<w:tab w:val="left" w:pos="\d+"\/>/.test(p3MainTbl), 'ট্যাব-স্টপ XML থাকতে হবে');
  assert.ok(/w:line="30\d" w:lineRule="exact"/.test(p3MainTbl) || /w:line="31\d" w:lineRule="exact"/.test(p3MainTbl), 'বহু-লাইনের ঘরে সঠিক exact লাইন-দূরত্ব থাকতে হবে');
  clearA07Switch();
});

test('A07FIX চালু করলে পাতা ১-এর দ্বি-কলাম স্বাক্ষর, পাতা ৪-এর কোলন কলাম ও ২-লাইনের সারি এবং পাতা ৫-এর ছক সংশোধিত হয়', () => {
  clearA07Switch();
  globalThis.__FZ_ON_A07FIX = true;

  const irOn = IR.build(measuresData.cap, measuresData.measures, measuresData.pageInfo);
  LF.fit(irOn);

  // পাতা ১: স্বাক্ষর গ্রিড পুনরুদ্ধার
  const p1SigBand = irOn.pages[0].bands[4];
  assert.equal(p1SigBand.kind, 'grid', 'পাতা ১-এর স্বাক্ষর ব্যান্ডটি ২-কলামের grid হতে হবে');
  assert.equal(p1SigBand.cells.length, 2);
  assert.equal(p1SigBand.cells[0].items[0].fontPt, 12.5, 'বাম স্বাক্ষরের ফন্ট ৯pt থেকে ১২.৫pt হতে হবে');
  assert.equal(p1SigBand.cells[0].items[0].lines.length, 2, 'বাম স্বাক্ষর ২ লাইনে ("...স্বাক্ষর ও" / "সীলমোহর") থাকতে হবে');

  // পাতা ৪: কোলন কলাম ও ২-লাইনের সারি
  const p4Tbl = irOn.pages[3].bands[2].cells[0].items[0];
  assert.ok(p4Tbl.rows.every((r) => r[2] === ':'), 'পাতা ৪-এর ১২টি সারির সবগুলোতে কোলন (":") থাকতে হবে');
  assert.deepEqual(p4Tbl.fullVRule, [true, true, true]);
  assert.equal(p4Tbl.rows[3][1].split('\n').length, 2, 'পাতা ৪ সারি ৪ ("জিএম পদে... কর্মকাল") ২ লাইনে থাকতে হবে');
  assert.equal(p4Tbl.rows[4][1].split('\n').length, 2, 'পাতা ৪ সারি ৫ ("চাকুরীতে যোগদানের... কর্মকাল") ২ লাইনে থাকতে হবে');

  const xmlOn = DOCX.bodyXml(irOn).xml;
  const p4Section = xmlOn.split(/<w:sectPr>[\s\S]*?<\/w:sectPr>/)[3];
  const p4MainTbl = [...p4Section.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)][0][0];
  const p4Cols = [...p4MainTbl.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => (+m[1]) / 20);
  assert.ok(Math.abs(p4Cols[2] - 13.45) <= 0.5, 'পাতা ৪-এর কোলন কলামের প্রস্থ ~১৩.৪৫pt থাকতে হবে (HEADW দ্বারা চওড়া হবে না)');

  // পাতা ৫: এসিআর ছকের ফন্ট ও কেন্দ্র-সাজানো
  const p5Tbl = irOn.pages[4].bands[5].cells[0].items[0];
  assert.equal(p5Tbl.fontPt, 9.5);
  assert.ok(p5Tbl.colAligns.every((a) => a === 'c'));
  clearA07Switch();
});
