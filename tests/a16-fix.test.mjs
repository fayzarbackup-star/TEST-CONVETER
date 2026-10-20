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

const goldenDir = fs.existsSync(path.join(__dirname, '../qa/golden-data/asis/a16/capture.json'))
  ? path.join(__dirname, '../qa/golden-data/asis/a16')
  : path.join(__dirname, '../samples/a16');

const captureRaw = fs.readFileSync(path.join(goldenDir, 'capture.json'), 'utf8');
const measuresRaw = fs.readFileSync(path.join(goldenDir, 'measures.json'), 'utf8');
const irRaw = fs.readFileSync(path.join(goldenDir, 'ir.json'), 'utf8');

function cloneCaptureAndMeasures() {
  const capture = JSON.parse(captureRaw);
  const mObj = JSON.parse(measuresRaw);
  return {
    capture,
    measures: mObj.measures || mObj,
    pageInfo: mObj.pageInfo || {}
  };
}

function findBorderedTable(page) {
  return page.bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((it) => it && it.kind === 'table' && !it.borderless);
}

function setA16Switch(on) {
  if (on) {
    globalThis.__FZ_ON_A16FIX = true;
    if (globalThis.window) globalThis.window.__FZ_ON_A16FIX = true;
  } else {
    delete globalThis.__FZ_ON_A16FIX;
    if (globalThis.window) delete globalThis.window.__FZ_ON_A16FIX;
  }
}

test('A16_SCORE_v1: সুইচ বন্ধ (OFF) থাকলে পূর্বের আউটপুট এবং অন্যান্য সব সুইচ অবিকল থাকে', () => {
  setA16Switch(false);
  assert.equal(IR.a16FixOn(), false);
  assert.equal(LF.isA16FixOn(), false);

  // অন্যান্য পূর্ববর্তী সুইচগুলো অক্ষত আছে কিনা যাচাই
  for (const fn of ['p1LossOn', 'a17FixOn', 'p2DriftOn', 'a03FixOn', 'a14FixOn', 'a07FixOn']) {
    assert.equal(typeof IR[fn], 'function', `IR.${fn} থাকতে হবে`);
  }
  for (const fn of ['isP1LossOn', 'isA01FixOn', 'isP2DriftOn', 'isRuleFixOn', 'isA10LinesOn', 'isA03FixOn', 'isA17FixOn', 'isA14FixOn', 'isA07FixOn']) {
    assert.equal(typeof LF[fn], 'function', `LF.${fn} থাকতে হবে`);
  }

  const savedIr = JSON.parse(irRaw);
  // সুইচ বন্ধ অবস্থায় repairA16Ir কোনো পরিবর্তন করবে না
  const beforeStr = JSON.stringify(savedIr);
  IR.repairA16Ir(savedIr);
  LF.repairA16Ir(savedIr);
  assert.equal(JSON.stringify(savedIr), beforeStr);

  // প্রি-বিল্ট ir.json-এ সুইচ বন্ধ অবস্থায় পূর্বের ত্রুটিগুলো অপরিবর্তিত থাকে
  const p1 = savedIr.pages[0];
  assert.equal(p1.bands[2].cells[0].items[0].indentPt, 33.219054931640585);
  assert.equal(p1.bands[4].cells[0].items[0].heightPt, 35);
  assert.deepEqual(p1.bands[9].cells[0].items[0].tabStops, [75.3, 84.1]);
  assert.equal(p1.bands[14].cells[0].items[0].fontPt, 9);

  const p6Tbl = findBorderedTable(savedIr.pages[5]);
  assert.equal(p6Tbl.srcRulesPt.length, 17);
  assert.equal(Math.round(p6Tbl.rowHeightsPt[9] * 10) / 10, 28.3);

  const p8Tbl = findBorderedTable(savedIr.pages[7]);
  assert.equal(p8Tbl.srcRulesPt.length, 12);
  assert.equal(Math.round(p8Tbl.rowHeightsPt[10] * 10) / 10, 15.6);
  assert.equal(Math.round(p8Tbl.rowHeightsPt[13] * 10) / 10, 47.0);
});

test('A16_SCORE_v1: সুইচ চালু (ON) করলে পাতা ৬, ৮ ও ৫-এর চেকলিস্ট ছকের আড়া-রেখা, সারি-উচ্চতা, নেস্টেড উপ-ছক ও ২-লাইনের মোড়ানো সংশোধিত হয়', () => {
  setA16Switch(true);
  try {
    assert.equal(IR.a16FixOn(), true);
    assert.equal(LF.isA16FixOn(), true);

    const { capture, measures, pageInfo } = cloneCaptureAndMeasures();
    const builtIr = IR.build(capture, measures, pageInfo);
    LF.fit(builtIr);

    const savedIr = JSON.parse(irRaw);
    LF.fit(savedIr);

    for (const [label, ir] of [['IR.build', builtIr], ['saved ir.json', savedIr]]) {
      // ১) পাতা ৬: ১৭ সারির ছকে ১৮টি আড়া-রেখা পুনরুদ্ধার, সারি ৯..১৬-এর প্রকৃত উচ্চতা এবং ২-লাইনের সারিতে লাইন-ভাঙা
      const p6 = ir.pages[5];
      const p6Tbl = findBorderedTable(p6);
      assert.equal(p6Tbl.rows.length, 17, `${label}: পাতা ৬-এ ১৭টি সারি`);
      assert.equal(p6Tbl.srcRulesPt.length, 18, `${label}: পাতা ৬-এ তলার আড়া-রেখাসহ ১৮টি রেখা থাকতে হবে`);
      assert.ok(p6Tbl.srcRulesPt[17] >= 720 && p6Tbl.srcRulesPt[17] <= 724, `${label}: পাতা ৬-এর তলার আড়া-রেখা ~722.4pt-এ`);
      assert.ok(p6Tbl.rowHeightsPt[9] >= 49 && p6Tbl.rowHeightsPt[9] <= 52, `${label}: পাতা ৬ সারি ৯ (৫।, ৩ লাইন) ~50.9pt`);
      assert.ok(p6Tbl.rowHeightsPt[10] >= 33 && p6Tbl.rowHeightsPt[10] <= 35, `${label}: পাতা ৬ সারি ১০ (৬। ক, ২ লাইন) ~34.0pt`);
      assert.ok(p6Tbl.rowHeightsPt[14] >= 16.5 && p6Tbl.rowHeightsPt[14] <= 19, `${label}: পাতা ৬ সারি ১৪ (৭।, ১ লাইন) ~17.8pt`);
      assert.ok(p6Tbl.rowHeightsPt[15] >= 33 && p6Tbl.rowHeightsPt[15] <= 35.5, `${label}: পাতা ৬ সারি ১৫ (৮।, ২ লাইন) ~34.5pt`);
      assert.ok(p6Tbl.rowHeightsPt[16] >= 43 && p6Tbl.rowHeightsPt[16] <= 46, `${label}: পাতা ৬ সারি ১৬ (উপ-ছক) ~44.5pt`);
      for (const ri of [4, 6, 7, 15]) {
        assert.ok(String(p6Tbl.rows[ri][1]).includes('\n'), `${label}: পাতা ৬ সারি ${ri}-এ ২-লাইনের মোড়ানো নিশ্চিত করতে '\\n' থাকতে হবে`);
      }

      // ২) পাতা ৮: ১৫ সারির ছকে খণ্ডিত ৪টি আড়া-রেখাসহ মোট ১৬টি রেখা পুনরুদ্ধার এবং সারি ১০ ও ১৩-এর উচ্চতা সংশোধন
      const p8 = ir.pages[7];
      const p8Tbl = findBorderedTable(p8);
      assert.equal(p8Tbl.rows.length, 15, `${label}: পাতা ৮-এ ১৫টি সারি`);
      assert.equal(p8Tbl.srcRulesPt.length, 16, `${label}: পাতা ৮-এ ১৬টি আড়া-রেখা পুনরুদ্ধার হতে হবে`);
      assert.ok(p8Tbl.rowHeightsPt[10] >= 30 && p8Tbl.rowHeightsPt[10] <= 32.5, `${label}: পাতা ৮ সারি ১০ (৬। গ, ২ লাইন) ~31.2pt`);
      assert.ok(p8Tbl.rowHeightsPt[13] >= 30 && p8Tbl.rowHeightsPt[13] <= 32.5, `${label}: পাতা ৮ সারি ১৩ (৮।, ২ লাইন) ~31.5pt`);
      assert.ok(String(p8Tbl.rows[10][1]).includes('\n'), `${label}: পাতা ৮ সারি ১০-এ ২-লাইনের মোড়ানো নিশ্চিত করতে '\\n' থাকতে হবে`);

      // ৩) পাতা ৫: ১৫ সারির ছকে y≈518pt-এর খণ্ডিত রেখাসহ ১৬টি রেখা পুনরুদ্ধার এবং শিরোনাম ও ব্যান্ড ৫-এর মোটা অনুচ্ছেদ সংশোধন
      const p5 = ir.pages[4];
      const p5Tbl = findBorderedTable(p5);
      assert.equal(p5Tbl.srcRulesPt.length, 16, `${label}: পাতা ৫-এ ১৬টি আড়া-রেখা পুনরুদ্ধার হতে হবে`);
      assert.ok(p5Tbl.rowHeightsPt[12] >= 30 && p5Tbl.rowHeightsPt[12] <= 32.5, `${label}: পাতা ৫ সারি ১২ ~31.2pt`);
      assert.ok(p5Tbl.rowHeightsPt[13] >= 30 && p5Tbl.rowHeightsPt[13] <= 32.5, `${label}: পাতা ৫ সারি ১৩ ~31.1pt`);
      assert.equal(p5.bands[0].cells[0].items[0].fontPt, 15.5, `${label}: পাতা ৫ শিরোনাম 15.5pt`);
      const p5BoldPara = p5.bands[5].cells[0].items[0];
      assert.equal(p5BoldPara.fontPt, 12.5, `${label}: পাতা ৫ ব্যান্ড ৫ ফন্ট 12.5pt`);
      assert.equal(p5BoldPara.lineSpacingPt, 15.8, `${label}: পাতা ৫ ব্যান্ড ৫ লাইন-পিচ 15.8pt`);
      assert.equal(p5BoldPara.keepLines, true);
      assert.equal(p5BoldPara.keepJust, true);
      assert.ok(p5BoldPara.justRightPt >= 30, `${label}: পাতা ৫ ব্যান্ড ৫ justRightPt >= 30pt`);
    }

    // DOCX XML যাচাই: পাতা ৬-এ নেস্টেড উপ-ছকের বাহ্যিক বর্ডার nil (শুধু insideH/insideV single) এবং সারি ৪, ৬, ৭, ১৫-এর উচ্চতা অক্ষত
    const { xml } = DOCX.bodyXml(savedIr);
    assert.ok(
      xml.includes('<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders>'),
      'পাতা ৬-এর নেস্টেড উপ-ছকে বাহ্যিক বর্ডার nil এবং কেবল ভেতরের insideH/insideV বর্ডার থাকতে হবে'
    );
  } finally {
    setA16Switch(false);
  }
});

test('A16_SCORE_v1: সুইচ চালু (ON) করলে পাতা ৩-এ পাশাপাশি ছক একত্রীকরণ রোধ, পাতা ৩–৯-এর অণু-স্বাক্ষর চিত্র ও পাতা ১-এর স্মারকপত্র সংশোধিত হয়', () => {
  setA16Switch(true);
  try {
    const savedIr = JSON.parse(irRaw);
    LF.fit(savedIr);
    const { xml } = DOCX.bodyXml(savedIr);

    // ১) পাতা ৩-এ চেকলিস্ট ছক এবং নিচের অণু-স্বাক্ষরের গ্রিড-ছকের মাঝে TINY অনুচ্ছেদ থাকায় Word ছক দুটিকে একত্রিত করবে না
    assert.ok(
      /<\/w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="4" w:lineRule="exact"\/><w:rPr><w:sz w:val="2"\/><\/w:rPr><\/w:pPr><\/w:p><w:tbl>/.test(xml),
      'পাশাপাশি দুটি <w:tbl>-এর মাঝে ক্ষুদ্র বিচ্ছিন্নকারী অনুচ্ছেদ (TINY) থাকতে হবে'
    );

    // ২) পাতা ৩, ৪, ৬, ৭, ৮, ৯-এর অণু-স্বাক্ষর চিত্রের (figure) উচ্চতা অর্ধেক (10.4..13.2pt) থেকে প্রকৃত মাপে (25.2..31.1pt) পুনরুদ্ধার
    for (const p of [3, 4, 6, 7, 8, 9]) {
      const pg = savedIr.pages[p - 1];
      const fig = pg.bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((it) => it && it.kind === 'figure');
      assert.ok(fig && fig.heightPt >= 25, `পাতা ${p}-এর অণু-স্বাক্ষর চিত্রের উচ্চতা >= 25pt হতে হবে (পাওয়া গেছে ${fig && fig.heightPt})`);
    }

    // ৩) পাতা ১: স্বাক্ষর চিত্র (26.9pt), ইউ.ও. নোটের রেখার ইনডেন্ট, অনুচ্ছেদের ইনডেন্ট ও ডান-প্রান্ত, ঝুলন্ত তালিকা ১.–৬. এবং ফুটার (7.5pt)
    const p1 = savedIr.pages[0];
    assert.equal(p1.bands[1].cells[0].items[0].justRightPt, 18.7);
    assert.equal(p1.bands[2].cells[0].items[0].indentPt, 41.7);
    assert.equal(p1.bands[2].cells[0].items[0].justRightPt, 17.7);
    assert.equal(p1.bands[4].cells[0].items[0].heightPt, 26.9);
    assert.equal(p1.bands[14].cells[0].items[0].fontPt, 7.5);

    for (const bi of [8, 9, 10, 11, 12, 13]) {
      const li = p1.bands[bi].cells[0].items[0];
      assert.equal(li.fontPt, 12.5, `পাতা ১ ব্যান্ড ${bi}-এর ফন্ট 12.5pt`);
      assert.deepEqual(li.tabStops, [75.3], `পাতা ১ ব্যান্ড ${bi}-এ একক ট্যাব-স্টপ [75.3]`);
    }
    for (const bi of [9, 11, 13]) {
      const li = p1.bands[bi].cells[0].items[0];
      assert.equal(li.firstIndentPt, -33.1, `পাতা ১ ব্যান্ড ${bi}-এ ঝুলন্ত ইনডেন্ট -33.1pt`);
      assert.equal(li.align, 'j', `পাতা ১ ব্যান্ড ${bi}-এ উভয়-পাশ সমান (align='j')`);
      assert.equal(li.keepLines, true);
      assert.equal(li.keepJust, true);
      assert.ok(!li.tabLines[1].startsWith('\t'), `পাতা ১ ব্যান্ড ${bi}-এর ২য় লাইনে অতিরিক্ত শুরুর ট্যাব থাকবে না`);
    }
    assert.ok(xml.includes('<w:ind w:left="824" w:right="316"/>'), 'পাতা ১-এর ইউ.ও. নোটের উপরের বিভাজক রেখায় বডি-মার্জিন ইনডেন্ট থাকতে হবে');
  } finally {
    setA16Switch(false);
  }
});
