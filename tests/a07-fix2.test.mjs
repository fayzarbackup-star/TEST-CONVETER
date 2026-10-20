/**
 * A07_SCORE_v2 (সুইচ: __FZ_ON_A07FIX2 / FZ_ON=A07FIX2) — নমুনা a07-এর লেআউট ও কাঠামোগত মেরামতের স্বয়ংক্রিয় পরীক্ষা।
 * কোনো বাহ্যিক নির্ভরতা ছাড়া সরাসরি Node-এ চলে।
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error('ব্যর্থ:', msg);
  }
}

function setBase5Switches() {
  for (const k of Object.keys(globalThis)) {
    if (k.startsWith('__FZ_ON_') || k.startsWith('__FZ_OFF_')) delete globalThis[k];
  }
  if (typeof process !== 'undefined' && process.env) {
    delete process.env.FZ_ON;
    delete process.env.FZ_OFF;
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('__FZ_ON_') || k.startsWith('__FZ_OFF_')) delete process.env[k];
    }
  }
  globalThis.__FZ_ON_WRAPFIT = true;
  globalThis.__FZ_ON_NESTBOX = true;
  globalThis.__FZ_ON_TBLMERGE = true;
  globalThis.__FZ_ON_A03FIX = true;
  globalThis.__FZ_ON_A16FIX = true;
}

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const a07Dir = path.join(ROOT, 'qa/golden-data/runs/base5/a07');
const rawMeasures = fs.readFileSync(path.join(a07Dir, 'measures.json'), 'utf8');
const rawGoldIr = fs.readFileSync(path.join(a07Dir, 'ir.json'), 'utf8');

async function runTests() {
  // ১. সুইচ বন্ধ (OFF) থাকলে পূর্বের আউটপুটের সাথে বাইট-ফর-বাইট অভিন্নতা যাচাই
  setBase5Switches();
  assert(IR.a07Fix2On() === false, 'ডিফল্ট অবস্থায় IR.a07Fix2On() অবশ্যই false হবে');
  assert(LF.isA07Fix2On() === false, 'ডিফল্ট অবস্থায় LF.isA07Fix2On() অবশ্যই false হবে');

  const mOff = JSON.parse(rawMeasures);
  const irOff = IR.build(mOff);
  LF.fit(irOff);
  const xmlOff = DB.bodyXml(irOff).xml;
  const docxOff = await DB.build(irOff, { JSZip: DB.MiniJSZip, type: 'uint8array' });

  const goldIrOff = JSON.parse(rawGoldIr);
  LF.fit(goldIrOff);
  const goldXmlOff = DB.bodyXml(goldIrOff).xml;

  // __FZ_OFF_A07FIX2 সক্রিয় থাকলে __FZ_ON_A07FIX2 থাকা সত্ত্বেও বাইট-ফর-বাইট অভিন্নতা যাচাই
  setBase5Switches();
  globalThis.__FZ_ON_A07FIX2 = true;
  globalThis.__FZ_OFF_A07FIX2 = true;
  assert(IR.a07Fix2On() === false, '__FZ_OFF_A07FIX2=true হলে IR.a07Fix2On() অবশ্যই false হবে');
  assert(LF.isA07Fix2On() === false, '__FZ_OFF_A07FIX2=true হলে LF.isA07Fix2On() অবশ্যই false হবে');

  const mOverride = JSON.parse(rawMeasures);
  const irOverride = IR.build(mOverride);
  LF.fit(irOverride);
  const xmlOverride = DB.bodyXml(irOverride).xml;
  const docxOverride = await DB.build(irOverride, { JSZip: DB.MiniJSZip, type: 'uint8array' });

  assert(JSON.stringify(irOff) === JSON.stringify(irOverride), 'সুইচ অফ ওভাররাইডে IR বাইট-ফর-বাইট অভিন্ন হতে হবে');
  assert(xmlOff === xmlOverride, 'সুইচ অফ ওভাররাইডে XML বাইট-ফর-বাইট অভিন্ন হতে হবে');
  assert(Buffer.compare(Buffer.from(docxOff), Buffer.from(docxOverride)) === 0, 'সুইচ অফ ওভাররাইডে .docx বাইট-ফর-বাইট অভিন্ন হতে হবে');

  // ২. সুইচ চালু (ON) করে measures.json থেকে IR ও .docx নির্মাণ এবং উন্নতি যাচাই
  setBase5Switches();
  globalThis.__FZ_ON_A07FIX2 = true;
  assert(IR.a07Fix2On() === true, '__FZ_ON_A07FIX2=true হলে IR.a07Fix2On() অবশ্যই true হবে');
  assert(LF.isA07Fix2On() === true, '__FZ_ON_A07FIX2=true হলে LF.isA07Fix2On() অবশ্যই true হবে');

  const mOn = JSON.parse(rawMeasures);
  const irOn = IR.build(mOn);
  LF.fit(irOn);
  const xmlOn = DB.bodyXml(irOn).xml;
  const docxOn = await DB.build(irOn, { type: 'uint8array' });

  assert(irOn.pages.length === 5, 'নমুনা a07-এ পাতার সংখ্যা ঠিক ৫টি থাকতে হবে');
  assert(docxOn instanceof Uint8Array && docxOn.length > 5000, 'বৈধ .docx বাইনারি তৈরি হতে হবে');
  assert(xmlOn !== xmlOff, 'A07FIX2 চালু থাকলে XML আউটপুটে প্রত্যাশিত মেরামত প্রতিফলিত হতে হবে');

  // পাতা ১ (ছক-১) যাচাই
  const p1 = irOn.pages[0];
  assert(p1.margins.top <= 25.5, 'পাতা ১-এর উপরের মার্জিন শীর্ষ শিরোনামের অবস্থানের সাথে সমন্বিত হতে হবে (<= 25.5pt)');
  assert(p1.bands.length === 6, 'পাতা ১-এ ২টি স্বাক্ষর ফ্লো-ব্যান্ড একীভূত হয়ে মোট ৬টি ব্যান্ড হতে হবে');
  const p1Title = p1.bands[0].cells[0].items[0];
  assert(p1Title.fontPt === 18, 'পাতা ১-এর "ছক-১" শিরোনামের ফন্ট ১৮pt-এ পুনরুদ্ধার হতে হবে');
  const p1Head = p1.bands[1].cells[0].items[0];
  assert(p1Head.fontPt === 16, 'পাতা ১-এর প্রধান শিরোনামের ফন্ট মাপা wPt অনুযায়ী ১৬pt হতে হবে');
  const p1Tbl = p1.bands[3].cells[0].items[0];
  assert(p1Tbl.exactRuleHeights === true && p1Tbl.rowHeightsExact === true, 'পাতা ১-এর ছকে exactRuleHeights সক্রিয় থাকতে হবে');
  const p1SigBand = p1.bands[4];
  assert(p1SigBand.kind === 'grid' && p1SigBand.cells.length === 2, 'পাতা ১-এর স্বাক্ষর ব্যান্ডটি ২-কলামের গ্রিড হতে হবে');
  const p1LeftSig = p1SigBand.cells[0].items[0];
  const p1RightSig = p1SigBand.cells[1].items[0];
  assert(p1LeftSig.fontPt === 12.5 && p1RightSig.fontPt === 12.5, 'পাতা ১-এর বাম ও ডান উভয় স্বাক্ষরের ফন্ট ১২.৫pt হতে হবে');
  assert(Array.isArray(p1LeftSig.lines) && p1LeftSig.lines.length === 2 && p1LeftSig.keepLines === true, 'পাতা ১-এর বাম স্বাক্ষরটি ২ লাইনে বিভক্ত ও keepLines=true হতে হবে');
  assert(p1LeftSig.lines[1].replace(/\*\*/g, '').trim() === 'সীলমোহর', 'পাতা ১-এর বাম স্বাক্ষরের ২য় লাইন "সীলমোহর" হতে হবে');

  // পাতা ২ (ছক-২) যাচাই
  const p2 = irOn.pages[1];
  assert(p2.margins.top <= 25.5, 'পাতা ২-এর উপরের মার্জিন সমন্বিত হতে হবে');
  const p2Tbl = p2.bands[3].cells[0].items[0];
  assert(p2Tbl.rows.length === 5, 'পাতা ২-এর সংকুচিত ৩-সারির ছকটি ৫ সারিতে পুনরুদ্ধার হতে হবে');
  assert(Array.isArray(p2Tbl.srcRulesPt) && p2Tbl.srcRulesPt.length === 6, 'পাতা ২-এর ছকে ৬টি আড়া-রেখা (srcRulesPt) থাকতে হবে');
  assert(Math.abs(p2Tbl.rowHeightsPt[0] - 98.9) <= 0.6 && Math.abs(p2Tbl.rowHeightsPt[1] - 14.4) <= 0.5, 'পাতা ২-এর ছকের ১ম ও ২য় সারির উচ্চতা যথাক্রমে ~৯৮.৯pt ও ~১৪.৪pt হতে হবে');
  assert(p2Tbl.exactRuleHeights === true && p2Tbl.headFontPt === 11, 'পাতা ২-এর ছকে exactRuleHeights=true ও headFontPt=11 হতে হবে');
  assert(Array.isArray(p2Tbl.cells) && p2Tbl.cells.length === 5, 'পাতা ২-এর ছকের TBLMERGE cellMeta ৫ সারিতে সিঙ্ক্রোনাইজড থাকতে হবে');

  // পাতা ৩ (ছক-৩) যাচাই
  const p3 = irOn.pages[2];
  const p3Head = p3.bands[1].cells[0].items[0];
  assert(p3Head.fontPt === 18, 'পাতা ৩-এর প্রধান শিরোনামের ফন্ট ১৮pt হতে হবে');
  const p3Tbl = p3.bands[2].cells[0].items[0];
  assert(p3Tbl.rows.length === 7 && p3Tbl.rows[0].length === 3, 'পাতা ৩-এর ছকটি ৪ কলাম থেকে ৩ কলামে ভাঁজ হতে হবে');
  assert(Array.isArray(p3Tbl.fullVRule) && p3Tbl.fullVRule.length === 2 && p3Tbl.fullVRule.every(Boolean), 'পাতা ৩-এর ছকে fullVRule=[true,true] থাকতে হবে');
  assert(p3Tbl.rows[3][2].includes('\t') && p3Tbl.rows[3][2].split('\n').length === 6, 'পাতা ৩-এর সারি ৪-এর ৩য় কলামে ৬টি লাইনে ট্যাব-বিভাজিত লেখা থাকতে হবে');
  assert(!p3Tbl._tabStopRatio, 'পাতা ৩-এর ছকে ডান-ট্যাব ব্যবহৃত হবে যাতে লেখা ২ লাইনে না ভাঙে');
  assert(Math.abs(p3Tbl.widthPt - 529.6) <= 0.5, 'পাতা ৩-এর ছকের প্রস্থ ডান খাড়া রেখা (x=591pt) অনুযায়ী ৫২৯.৬pt হতে হবে');
  assert(p3Tbl.exactRuleHeights === true && p3Tbl.fontPt === 10.5, 'পাতা ৩-এর ছকে exactRuleHeights=true ও fontPt=10.5 হতে হবে');
  assert(p3Tbl.rows[5][2].split('\n').length === 2, 'পাতা ৩-এর সারি ৬-এ কৃত্রিম লাইন-ভাঙা ছাড়া ২টি অনুচ্ছেদ থাকতে হবে');

  // পাতা ৪ (ছক-৪) যাচাই
  const p4 = irOn.pages[3];
  const p4Head = p4.bands[1].cells[0].items[0];
  assert(p4Head.underline === false, 'পাতা ৪-এর শিরোনামের কালি-বিহীন ভ্রান্ত আন্ডারলাইন অপসারিত হতে হবে');
  const p4Tbl = p4.bands[2].cells[0].items[0];
  assert(p4Tbl.rows[2][2] === ':' && p4Tbl.rows[4][2] === ':', 'পাতা ৪-এর ছকের সারি ৩ ও ৫-এ হারানো কোলন (":") পুনরুদ্ধার হতে হবে');
  assert(Array.isArray(p4Tbl.fullVRule) && p4Tbl.fullVRule.length === 3 && p4Tbl.fullVRule.every(Boolean), 'পাতা ৪-এর ছকে পূর্ণ খাড়া দাগ fullVRule=[true,true,true] থাকতে হবে');
  assert(Math.abs(p4Tbl.rect.x - 51.3) <= 0.2 && Math.abs(p4Tbl.widthPt - 484.3) <= 0.2, 'পাতা ৪-এর ছকের বাম প্রান্ত (51.3pt) ও প্রস্থ (484.3pt) মাপা রেখার সাথে সংরেখিত হতে হবে');
  assert(p4Tbl.exactRuleHeights === true, 'পাতা ৪-এর ছকে exactRuleHeights=true থাকতে হবে');

  // পাতা ৫ (ছক-৫) যাচাই
  const p5 = irOn.pages[4];
  assert(p5.bands[1].cells[0].items[0].fontPt === 14.5, 'পাতা ৫-এর ১ম শিরোনামের ফন্ট ১৪.৫pt হতে হবে');
  assert(p5.bands[3].cells[0].items[0].fontPt === 16.5, 'পাতা ৫-এর "ব্যাংকের নাম:" অনুচ্ছেদের ফন্ট ১৬.৫pt-এ পুনরুদ্ধার হতে হবে');
  const p5Tbl = p5.bands[5].cells[0].items[0];
  assert(p5Tbl.exactRuleHeights === true && p5Tbl.fontPt === 8.5 && p5Tbl.colAligns.every((a) => a === 'c'), 'পাতা ৫-এর ছকে exactRuleHeights=true, fontPt=8.5 ও মাঝ-সাজানো কলাম থাকতে হবে');
  assert(p5.bands[6].cells[0].items[0].fontPt === 13, 'পাতা ৫-এর পাদটীকার ফন্ট ১৩pt হতে হবে');
  const p5Note = p5.bands[7].cells[0].items[0];
  assert(p5Note.align === 'l' && Math.abs(p5Note.indentPt - 11.3) <= 0.2 && !p5Note.charSpacingPt && p5Note.centerShiftPt == null, 'পাতা ৫-এর নিচের নির্দেশনা লাইনটি বাম-প্রান্তিক (indentPt=11.3pt) ও সংকোচনমুক্ত হতে হবে');

  // ৩. পূর্ব-নির্মিত গোল্ডেন ir.json-এর ওপর LF.fit ও DB.bodyXml চালিয়ে সামঞ্জস্য যাচাই
  const goldIrOn = JSON.parse(rawGoldIr);
  LF.fit(goldIrOn);
  const goldXmlOn = DB.bodyXml(goldIrOn).xml;
  assert(goldXmlOn !== goldXmlOff, 'পূর্ব-নির্মিত ir.json-এও A07FIX2 সক্রিয় হয়ে XML উন্নত করতে হবে');
  assert(goldIrOn.pages[1].bands[3].cells[0].items[0].rows.length === 5, 'পূর্ব-নির্মিত ir.json-এর পাতা ২-এও ৫টি সারি পুনরুদ্ধার হতে হবে');
  assert(goldIrOn.pages[2].bands[2].cells[0].items[0].rows[0].length === 3, 'পূর্ব-নির্মিত ir.json-এর পাতা ৩-এও ৩টি কলাম থাকতে হবে');
  assert(goldIrOn.pages[3].bands[5].cells[0].items[0].widthPt === 19.7 && goldIrOn.pages[3].bands[5].cells[0].items[0].heightPt === 17.8, 'পূর্ব-নির্মিত ir.json-এর পাতা ৪-এর টিক-চিত্রের ৩০০-ডিপিআই আকার (19.7x17.8pt) পুনরুদ্ধার হতে হবে');
  assert(/<w:tab w:val="right"/.test(goldXmlOn), 'পাতা ৩-এর ভাঁজকৃত কলামের জন্য ডান-ট্যাব (<w:tab w:val="right") XML-এ থাকতে হবে');

  console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
