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

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const BLD = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const GOLDEN_DIR = fs.existsSync(path.join(ROOT, 'qa/golden-data/asis/a03/ir.json'))
  ? path.join(ROOT, 'qa/golden-data/asis/a03')
  : path.join(ROOT, 'samples/a03');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, name), 'utf8'));
}

function setA03Fix(on) {
  if (on) {
    globalThis.__FZ_ON_A03FIX = true;
    delete globalThis.__FZ_OFF_A03FIX;
    if (typeof process !== 'undefined' && process.env) {
      process.env.__FZ_ON_A03FIX = '1';
      delete process.env.__FZ_OFF_A03FIX;
    }
  } else {
    delete globalThis.__FZ_ON_A03FIX;
    delete globalThis.__FZ_OFF_A03FIX;
    if (typeof process !== 'undefined' && process.env) {
      delete process.env.__FZ_ON_A03FIX;
      delete process.env.__FZ_OFF_A03FIX;
      if (process.env.FZ_ON) {
        process.env.FZ_ON = process.env.FZ_ON.split(',').filter((x) => x.trim() !== 'A03FIX').join(',');
      }
    }
  }
}

test('A03FIX switch OFF preserves baseline IR and DOCX XML output unchanged', () => {
  setA03Fix(false);
  assert.equal(LF.isA03FixOn(), false);
  assert.equal(IR.a03FixOn(), false);

  const ir1 = loadJson('ir.json');
  const ir2 = loadJson('ir.json');
  const xml1 = BLD.bodyXml(ir1).xml;

  // Verify that calling repairA03Ir with switch OFF is a no-op
  LF.repairA03Ir(ir2);
  const xml2 = BLD.bodyXml(ir2).xml;
  assert.equal(xml1, xml2);

  // Baseline Page 2 has only 1 box (missing top address box) and 25 bands
  assert.equal(ir2.pages[0].bands.length, 20);
  assert.equal(ir2.pages[1].boxes.length, 1);
  assert.equal(ir2.pages[1].bands.length, 25);
});

test('A03FIX switch ON fixes Page 2 split address box, missing vertical/horizontal borders, full-width dark banner, two-field tabs, and bottom signature/date boxes', () => {
  setA03Fix(true);
  assert.equal(LF.isA03FixOn(), true);
  assert.equal(IR.a03FixOn(), true);

  const ir = loadJson('ir.json');
  LF.fit(ir);
  const p2 = ir.pages[1];

  // 1) Top 2-column address box (y=50.4..236.1) is restored as Box 2 wrapping Bands 0..2
  assert.equal(p2.boxes.length, 2);
  const topBox = p2.boxes[0];
  assert.equal(topBox.x0, 35.5);
  assert.equal(topBox.x1, 558);
  assert.ok(Math.abs(topBox.y0 - 50.4) <= 1, `expected topBox.y0 near 50.4, got ${topBox.y0}`);
  assert.ok(Math.abs(topBox.y1 - 236.1) <= 1, `expected topBox.y1 near 236.1, got ${topBox.y1}`);

  // Band 0 is now a 2-column grid with middle vertical divider at x=297.8 and ruleBelow at 195.8
  const b0 = p2.bands[0];
  assert.equal(b0.kind, 'grid');
  assert.equal(b0.cells.length, 2);
  assert.equal(b0.cells[0].ruleRight, true);
  assert.equal(b0.cells[0].x1, 297.8);
  assert.equal(b0.cells[1].x0, 297.8);
  assert.equal(b0.cells[0].items.length, 5);
  assert.equal(b0.cells[1].items.length, 6);
  assert.ok(b0.ruleBelow && Math.abs(b0.ruleBelow.srcY - 195.8) <= 0.5);

  // Bands 1 & 2 (মোবাইল/ই-মেইল and পরিচয় সনাক্তকরণ চিহ্ন/উচ্চতা) are inside topBox with middle divider and no ghost dots
  const b1 = p2.bands[1];
  const b2 = p2.bands[2];
  assert.deepEqual(b1.boxIds, [topBox.id]);
  assert.deepEqual(b2.boxIds, [topBox.id]);
  assert.equal(b1.cells[0].ruleRight, true);
  assert.equal(b2.cells[0].ruleRight, true);
  assert.equal(b1.cells[0].items[0].text, 'মোবাইল :');
  assert.equal(b1.cells[1].items[0].text, 'ই-মেইল :');

  // 2) Checkbox & total lines in middle section (Bands 4, 5, 10, 11)
  const b4It = p2.bands[4].cells[0].items[0];
  assert.deepEqual(b4It.tabLines, ['গ্রস পেনশন সমর্পণের পরিমাণ : সম্পূর্ণ ⟦ ⟧\tঅর্ধেক ⟦ ⟧']);
  assert.deepEqual(b4It.tabStops, [284]);

  const b5It = p2.bands[5].cells[0].items[0];
  assert.equal(b5It.tabLines, null);
  assert.equal(b5It.tabStops, null);

  const b10It = p2.bands[10].cells[0].items[0];
  assert.equal(b10It.tabLines, null);
  assert.equal(b10It.tabStops, null);

  const b11It = p2.bands[11].cells[0].items[0];
  assert.deepEqual(b11It.tabLines, ['পেনশন উত্তোলন করা হয় : হিসাব রক্ষণ অফিস হতে ⟦ ⟧\tব্যাংক হতে ⟦ ⟧']);
  assert.deepEqual(b11It.tabStops, [364.2]);

  // 3) Band 12 (3x2 borderless form table): duplicate ruleSpans removed, middle vertical divider enabled
  const b12Tbl = p2.bands[12].cells[0].items[0];
  assert.equal(b12Tbl.kind, 'table');
  assert.deepEqual(b12Tbl.ruleSpans, []);
  assert.deepEqual(b12Tbl.fullVRule, [true]);
  assert.equal(b12Tbl._p2VRule, true);

  // 4) Band 13 (মাসিক পেনশন শেষ হওয়ার তারিখ | দিন-মাস-বছর): vertical divider at x=269.8 restored
  const b13 = p2.bands[13];
  assert.equal(b13.kind, 'grid');
  assert.equal(b13.cells[0].ruleRight, true);
  assert.equal(b13.cells[0].x1, 269.8);
  assert.equal(b13.cells[1].x0, 269.8);

  // 5) Band 14 (ভবিষ্যতে সরাসরি ব্যাংক হিসাবে...): full-width dark banner (shadeRun removed)
  const b14It = p2.bands[14].cells[0].items[0];
  assert.equal(b14It.shade, '000000');
  assert.equal(b14It.shadeRun, undefined);
  assert.equal(b14It.indentPt, 0);

  // 6) Bands 16 & 17 (ব্যাংকের নাম : শাখার নাম : and হিসাব নম্বর : হিসাবের ধরণ :): hallucinated dots removed, tab before second label
  const b16It = p2.bands[16].cells[0].items[0];
  const b17It = p2.bands[17].cells[0].items[0];
  assert.deepEqual(b16It.tabLines, ['ব্যাংকের নাম :\tশাখার নাম :']);
  assert.deepEqual(b16It.tabStops, [252.8]);
  assert.deepEqual(b17It.tabLines, ['হিসাব নম্বর :\tহিসাবের ধরণ : সঞ্চয়ী ⟦ ⟧ চলতি ⟦ ⟧']);
  assert.deepEqual(b17It.tabStops, [252.8]);

  // 7) Band 18 (স্বাক্ষর : | তারিখ :): converted to 1x3 split-box table with bordered left & right cells
  const b18Tbl = p2.bands[18].cells[0].items[0];
  assert.deepEqual(b18Tbl.rows, [['স্বাক্ষর :', '', 'তারিখ :']]);
  assert.deepEqual(b18Tbl.splitBoxCols, [true, false, true]);
  assert.equal(b18Tbl.rowHeightsExact, true);
  assert.ok(b18Tbl.rowHeightsPt[0] >= 55);

  const { xml } = BLD.bodyXml(ir);
  assert.ok(!xml.includes('<w:shd w:val="clear" w:color="auto" w:fill="000000"/></w:rPr>'), 'full-width banner should not use run-level shading');
  setA03Fix(false);
});

test('A03FIX switch ON fixes Page 1 duplicate/shifted horizontal rules, multi-field tabs, and bottom 2-column section (vertical rule 289.25, horizontal rule 623.3, 2-line ধর্ম paragraph)', () => {
  setA03Fix(true);
  const ir = loadJson('ir.json');
  LF.fit(ir);
  const p1 = ir.pages[0];

  // 1) Band 5 (৩. পেনশনের ধরণ): false tab removed and fontPt restored to 13.5
  const b5It = p1.bands[5].cells[0].items[0];
  assert.equal(b5It.tabLines, null);
  assert.equal(b5It.tabStops, null);
  assert.equal(b5It.fontPt, 13.5);

  // 2) Bands 6, 15, 16 (two-field form lines): hallucinated dots stripped, tab placed before second label
  const b6It = p1.bands[6].cells[0].items[0];
  assert.deepEqual(b6It.tabLines, ['৪. পিপিও নং :\tইস্যুর তারিখ :']);
  assert.deepEqual(b6It.tabStops, [202]);

  const b15It = p1.bands[15].cells[0].items[0];
  assert.deepEqual(b15It.tabLines, ['১৩. পেনশন মঞ্জুরী আদেশ নং :\tতারিখ :']);
  assert.deepEqual(b15It.tabStops, [277.8]);

  const b16It = p1.bands[16].cells[0].items[0];
  assert.deepEqual(b16It.tabLines, ['১৪. মঞ্জুরকারী কর্তৃপক্ষ :\tমন্ত্রণালয় :']);
  assert.deepEqual(b16It.tabStops, [272.5]);
  assert.equal(b16It.fontPt, 13.5);

  // 3) Bands 11 & 14 (৯. পারিবারিক পেনশনের... and ১২. পারিবারিক পেনশনারের...): duplicate ruleSpans removed, left-aligned columns, exact ruleBelow gap
  const b11Tbl = p1.bands[11].cells[0].items[0];
  const b14Tbl = p1.bands[14].cells[0].items[0];
  assert.deepEqual(b11Tbl.ruleSpans, []);
  assert.deepEqual(b11Tbl.colAligns, ['l', 'l']);
  assert.equal(b11Tbl.ruleBelow._p2Rule, true);
  assert.deepEqual(b14Tbl.ruleSpans, []);
  assert.deepEqual(b14Tbl.colAligns, ['l', 'l']);
  assert.equal(b14Tbl.ruleBelow._p2Rule, true);

  // 4) Bottom 2-column section (Band 18 merged into Band 19 -> new Band 18):
  //    - Vertical rule at x=289.25 (ruleRight: true)
  //    - Horizontal rule at y=623.3 below লিঙ্গ :
  //    - জন্ম তারিখ : merged as first item of right column
  //    - ধর্ম and বৈবাহিক অবস্থা preserve 2 lines (keepLines: true, keepJust: true)
  assert.equal(p1.bands.length, 19);
  const b18 = p1.bands[18];
  assert.equal(b18.kind, 'grid');
  assert.equal(b18.cells[0].x0, 35.5);
  assert.equal(b18.cells[0].x1, 289.25);
  assert.equal(b18.cells[0].ruleRight, true);
  assert.equal(b18.cells[1].x0, 289.25);
  assert.equal(b18.cells[1].x1, 559);

  const lingaIt = b18.cells[0].items[0];
  assert.deepEqual(lingaIt.tabLines, ['**লিঙ্গ :** পুরুষ ⟦ ⟧\tমহিলা ⟦ ⟧']);
  assert.ok(lingaIt.ruleBelow && Math.abs(lingaIt.ruleBelow.srcY - 623.3) <= 0.5);

  const dharmaIt = b18.cells[0].items[1];
  assert.equal(dharmaIt.keepLines, true);
  assert.equal(dharmaIt.keepJust, true);
  assert.equal(dharmaIt.lines.length, 2);

  const dobLabelIt = b18.cells[1].items[0];
  assert.equal(dobLabelIt.text, 'জন্ম তারিখ :');

  const maritalIt = b18.cells[1].items[2];
  assert.equal(maritalIt.keepLines, true);
  assert.equal(maritalIt.keepJust, true);
  assert.equal(maritalIt.lines.length, 2);

  // 5) Verify planned positions of Band 11 (432.8) and Band 14 (497.8) rules in planPage
  const { els } = BLD.planPage(p1);
  let cur = p1.margins.top;
  const ends = {};
  els.forEach((e, idx) => {
    cur += e.before + e.h;
    ends[idx] = cur;
  });
  assert.ok(Math.abs(ends[11] - 433.3) <= 1.0, `expected Band 11 end near 433.3, got ${ends[11]}`);
  assert.ok(Math.abs(ends[14] - 498.8) <= 1.0, `expected Band 14 end near 498.8, got ${ends[14]}`);

  setA03Fix(false);
});

test('A03FIX works identically when building IR from scratch via FayzarLayoutIR.build', () => {
  setA03Fix(true);
  const meas = loadJson('measures.json');
  const ir = IR.build(meas.cap, meas.measures, meas.pageInfo);
  LF.fit(ir);

  assert.equal(ir.pages.length, 2);
  assert.equal(ir.pages[0].bands.length, 19);
  assert.equal(ir.pages[0].bands[18].cells[0].ruleRight, true);
  assert.equal(ir.pages[0].bands[18].cells[0].x1, 289.25);
  assert.equal(ir.pages[1].boxes.length, 2);
  assert.equal(ir.pages[1].bands.length, 19);
  assert.deepEqual(ir.pages[1].bands[18].cells[0].items[0].splitBoxCols, [true, false, true]);

  setA03Fix(false);
});
