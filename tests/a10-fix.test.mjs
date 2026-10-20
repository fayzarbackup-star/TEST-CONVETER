import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const LayoutIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LineFit = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const Builder = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

function resolveDataDir() {
  const goldenDir = path.join(ROOT, 'qa/golden-data/asis/a10');
  if (fs.existsSync(path.join(goldenDir, 'measures.json'))) return goldenDir;
  return path.join(ROOT, 'samples/a10');
}

const DATA_DIR = resolveDataDir();
const measuresData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'measures.json'), 'utf8'));
const savedIrRaw = fs.readFileSync(path.join(DATA_DIR, 'ir.json'), 'utf8');

function setA10Fix(on) {
  if (on) {
    globalThis.__FZ_ON_A10FIX = true;
    delete globalThis.__FZ_OFF_A10FIX;
  } else {
    delete globalThis.__FZ_ON_A10FIX;
    delete globalThis.__FZ_OFF_A10FIX;
    if (typeof process !== 'undefined' && process.env) {
      delete process.env.__FZ_ON_A10FIX;
      delete process.env.FZ_ON;
    }
  }
}

test('A10_SCORE_v1: switch gating keeps existing switches intact and A10FIX OFF output unchanged', () => {
  setA10Fix(false);
  assert.equal(LayoutIR.a10FixOn(), false);
  assert.equal(LineFit.isA10FixOn(), false);
  assert.equal(typeof LayoutIR.p1LossOn, 'function');
  assert.equal(typeof LayoutIR.a17FixOn, 'function');
  assert.equal(typeof LayoutIR.p2DriftOn, 'function');
  assert.equal(typeof LayoutIR.a03FixOn, 'function');
  assert.equal(typeof LayoutIR.a14FixOn, 'function');
  assert.equal(typeof LayoutIR.a07FixOn, 'function');
  assert.equal(typeof LineFit.isA10LinesOn, 'function');
  assert.equal(typeof LineFit.isA01FixOn, 'function');
  assert.equal(typeof LineFit.isRuleFixOn, 'function');

  // Verify A10FIX OFF preserves legacy behavior on both fresh build and pre-built ir.json
  const irOff = LayoutIR.build(measuresData.cap, measuresData.measures, measuresData.pageInfo);
  const p1Tbl1Off = irOff.pages[0].bands[2].cells[0].items[0];
  assert.equal(p1Tbl1Off.noInsideV, undefined);
  assert.deepEqual(p1Tbl1Off.colFractions, [0.9, 0.1]);

  // Without A10FIX, table rowHeightsPt remain in unscaled scan pixels (> 300pt total vs 123.9pt heightPt)
  const p1Tbl2Off = irOff.pages[0].bands[4].cells[0].items[0];
  const sumRbhOff = p1Tbl2Off.rowHeightsPt.reduce((a, b) => a + b, 0);
  assert.ok(sumRbhOff > p1Tbl2Off.heightPt * 2.5, 'Without A10FIX, rowHeightsPt are unscaled');

  const p3RuleOff = irOff.pages[2].bands[8].cells[0].items[0];
  assert.equal(p3RuleOff.shade, 'E6E6E6');
  assert.equal(irOff.pages[3].bands.length, 13);

  const savedOff = JSON.parse(savedIrRaw);
  LineFit.fit(savedOff);
  assert.equal(savedOff.pages[1].bands[2].cells[0].items[0].rows.length, 4);
  assert.equal(savedOff.pages[1].bands[8].cells[0].items[0].fontPt, 15);
  assert.equal(savedOff.pages[1].bands[8].cells[0].items[0].bold, true);
});

test('A10_SCORE_v1: A10FIX ON repairs Page 1 form box (Band 2), register tables (Bands 4 & 10), hanging questions, and dashed rules', () => {
  setA10Fix(true);
  try {
    assert.equal(LayoutIR.a10FixOn(), true);
    assert.equal(LineFit.isA10FixOn(), true);

    const built = LayoutIR.build(measuresData.cap, measuresData.measures, measuresData.pageInfo);
    LineFit.fit(built);
    const saved = JSON.parse(savedIrRaw);
    LineFit.fit(saved);

    for (const [label, ir] of [['fresh build', built], ['saved ir.json', saved]]) {
      const p1 = ir.pages[0];
      assert.equal(p1.margins.top, 30, `${label}: Page 1 top margin adjusted for title ink offset`);

      // Band 2: 7x2 outer-bordered form box
      const tbl1 = p1.bands[2].cells[0].items[0];
      assert.equal(tbl1.noInsideV, true, `${label}: Table 1 removes false interior vertical border`);
      assert.deepEqual(tbl1.fullVRule, [false], `${label}: Table 1 marks interior vRule false`);
      assert.deepEqual(tbl1.colFractions, [0.483, 0.517], `${label}: Table 1 colon column placed at scan x=955.6px`);
      assert.deepEqual(tbl1.colAligns, ['l', 'l'], `${label}: Table 1 columns left-aligned`);
      assert.deepEqual(tbl1.gridSpans[1], [2, 0], `${label}: Table 1 Row 1 ('প্রথম ভাগ') spans 2 columns`);
      assert.deepEqual(tbl1.cellAligns[1], ['c', 'c'], `${label}: Table 1 Row 1 ('প্রথম ভাগ') is centered`);
      assert.equal(tbl1.fontPt, 11.5, `${label}: Table 1 uses bodyFontPt 11.5`);
      assert.deepEqual(tbl1.rowHeightsPt, [27.2, 20.8, 33.9, 33.6, 41, 34.4, 34.3], `${label}: Table 1 scaled rowHeightsPt`);

      // Band 4: 5x3 address table
      const tbl2 = p1.bands[4].cells[0].items[0];
      assert.equal(tbl2.fontPt, 11.5, `${label}: Table 2 header uses bodyFontPt 11.5`);
      assert.equal(tbl2.headFontPt, undefined, `${label}: Table 2 headFontPt cleared`);
      assert.deepEqual(tbl2.rowHeightsPt, [13.9, 27.2, 27.1, 26.9, 27.2], `${label}: Table 2 scaled rowHeightsPt`);

      // Band 5 (Q7) & Band 9 (Q9): hanging indent questions without double-tab shift
      const q7 = p1.bands[5].cells[0].items[0];
      const q9 = p1.bands[9].cells[0].items[0];
      assert.equal(/^\t/.test(q7.tabLines[1]), false, `${label}: Q7 continuation line has no leading tab`);
      assert.equal(q7.tabStops.length, 1, `${label}: Q7 has single tab stop`);
      assert.equal(/^\t/.test(q9.tabLines[1]), false, `${label}: Q9 continuation line has no leading tab`);
      assert.equal(q9.tabStops.length, 1, `${label}: Q9 has single tab stop`);

      // Band 10: 5x4 education table
      const tbl3 = p1.bands[10].cells[0].items[0];
      assert.equal(tbl3.fontPt, 10, `${label}: Table 3 fontPt is 10`);
      assert.equal(tbl3.headFontPt, undefined, `${label}: Table 3 headFontPt cleared so Col 1 stays 2 lines`);
      assert.equal(tbl3.colAligns, null, `${label}: Table 3 header columns all centered`);
      assert.deepEqual(tbl3.rowHeightsPt, [27.8, 20.8, 20.4, 20.8, 20.8], `${label}: Table 3 scaled rowHeightsPt`);
    }

    // Verify Page 1 XML output
    const xml1 = Builder.bodyXml({ pages: [built.pages[0]] }).xml;
    assert.ok(xml1.includes('<w:insideV w:val="nil"/>'), 'Page 1 Table 1 XML suppresses insideV border');
    assert.ok(xml1.includes('<w:gridSpan w:val="2"/>'), 'Page 1 Table 1 Row 1 XML emits gridSpan=2');
    assert.ok(xml1.includes('<w:tab w:val="left" w:pos="410"/>'), 'Page 1 Table 1 serial rows emit 20.5pt tab stop');
    assert.ok(xml1.includes('<w:ind w:left="410"/>'), 'Page 1 Table 1 multi-line serial row emits 20.5pt hanging indent');
  } finally {
    setA10Fix(false);
  }
});

test('A10_SCORE_v1: A10FIX ON repairs Page 2 missing 5th row (Band 2), leader dashes (Bands 4 & 6), and note paragraph (Band 8)', () => {
  setA10Fix(true);
  try {
    const built = LayoutIR.build(measuresData.cap, measuresData.measures, measuresData.pageInfo);
    LineFit.fit(built);
    const saved = JSON.parse(savedIrRaw);
    LineFit.fit(saved);

    for (const [label, ir] of [['fresh build', built], ['saved ir.json', saved]]) {
      const p2 = ir.pages[1];
      assert.equal(p2.margins.top, 32, `${label}: Page 2 top margin adjusted for page number ink offset`);

      // Band 1 (Q10): hanging indent continuation line cleaned
      const q10 = p2.bands[1].cells[0].items[0];
      assert.equal(/^\t/.test(q10.tabLines[1]), false, `${label}: Q10 continuation line has no leading tab`);

      // Band 2: 5x5 employment table (restored from 4x5)
      const tbl4 = p2.bands[2].cells[0].items[0];
      assert.equal(tbl4.rows.length, 5, `${label}: Page 2 Table 4 restored to 5 rows`);
      assert.deepEqual(tbl4.rowHeightsPt, [27.6, 26.8, 27.4, 27.1, 27], `${label}: Page 2 Table 4 exact rule heights`);

      // Band 4 (Q11) & Band 6 (Q12): trailing leader dashes preserved
      const q11 = p2.bands[4].cells[0].items[0];
      const q12 = p2.bands[6].cells[0].items[0];
      assert.match(q11.tabLines[0], /-{6,}।$/, `${label}: Q11 preserves trailing leader dashes`);
      assert.match(q12.tabLines[0], /-{6,}।$/, `${label}: Q12 preserves trailing leader dashes`);

      // Band 8 ('টীকাঃ-'): demoted from 15pt bold to 11.5pt regular with 3 kept lines
      const note = p2.bands[8].cells[0].items[0];
      assert.equal(note.fontPt, 11.5, `${label}: Page 2 note fontPt demoted to 11.5`);
      assert.equal(note.bold, false, `${label}: Page 2 note bold demoted to false`);
      assert.equal(note.keepLines, true, `${label}: Page 2 note preserves 3 scan line breaks`);
      assert.equal(note.align, 'j', `${label}: Page 2 note is justified`);

      // Band 13: 5x3 relatives table
      const tbl5 = p2.bands[13].cells[0].items[0];
      assert.equal(tbl5.fontPt, 11.5, `${label}: Page 2 Table 5 header uses bodyFontPt 11.5`);
      assert.deepEqual(tbl5.rowHeightsPt, [14.3, 27.7, 27.4, 27.3, 27.3], `${label}: Page 2 Table 5 scaled rowHeightsPt`);
    }

    const xml2 = Builder.bodyXml({ pages: [built.pages[1]] }).xml;
    const hyphenLeaders = (xml2.match(/w:leader="hyphen"/g) || []).length;
    assert.ok(hyphenLeaders >= 4, 'Page 2 XML emits hyphen leaders for Q11, Q12, and dashed separator lines');
  } finally {
    setA10Fix(false);
  }
});

test('A10_SCORE_v1: A10FIX ON repairs Page 3 & Page 4 false gray shading, table heights, and missing signature overline', () => {
  setA10Fix(true);
  try {
    const built = LayoutIR.build(measuresData.cap, measuresData.measures, measuresData.pageInfo);
    LineFit.fit(built);
    const saved = JSON.parse(savedIrRaw);
    LineFit.fit(saved);

    for (const [label, ir] of [['fresh build', built], ['saved ir.json', saved]]) {
      const p3 = ir.pages[2];
      // Questions 15, 16, 17 restored to 12pt
      assert.equal(p3.bands[1].cells[0].items[0].fontPt, 12, `${label}: Page 3 Q15 is 12pt`);
      assert.equal(p3.bands[3].cells[0].items[0].fontPt, 12, `${label}: Page 3 Q16 is 12pt`);
      assert.equal(p3.bands[5].cells[0].items[0].fontPt, 12, `${label}: Page 3 Q17 is 12pt`);

      // Band 4: 3x2 references table
      const tbl6 = p3.bands[4].cells[0].items[0];
      assert.deepEqual(tbl6.rowHeightsPt, [14, 34, 33.7], `${label}: Page 3 Table 6 scaled rowHeightsPt`);

      // Band 8: false gray shading removed from dashed separator rule
      const p3Rule = p3.bands[8].cells[0].items[0];
      assert.equal(p3Rule.shade, undefined, `${label}: Page 3 Band 8 false E6E6E6 shade stripped`);

      // Page 4: 14 bands including restored dashed signature overline at Band 8
      const p4 = ir.pages[3];
      assert.equal(p4.bands.length, 14, `${label}: Page 4 has 14 bands with restored signature overline`);
      assert.equal(p4.bands[6].cells[0].items[0].bold, false, `${label}: Page 4 'স্থান ---' is not bold`);
      assert.equal(p4.bands[7].cells[0].items[0].bold, false, `${label}: Page 4 'তারিখঃ ---' is not bold`);

      const sigRule = p4.bands[8].cells[0].items[0];
      assert.equal(sigRule.type, 'other', `${label}: Page 4 Band 8 is the restored dashed overline`);
      assert.deepEqual(sigRule.rect, { x: 348.7, y: 402.2, w: 188.4, h: 1.7 }, `${label}: Page 4 Band 8 rect matches scan overline`);

      const sig2 = p4.bands[13].cells[0].items[0];
      assert.equal(sig2.align, 'l', `${label}: Page 4 bottom signature block is left-aligned`);
      assert.equal(sig2.lines[0].length <= 48, true, `${label}: Page 4 bottom signature dashes fit within rect.w`);
    }

    const xmlBuilt = Builder.bodyXml(built).xml;
    const xmlSaved = Builder.bodyXml(saved).xml;
    assert.equal(xmlBuilt.includes('E6E6E6'), false, 'Full document XML has no false E6E6E6 shading');
    assert.equal(xmlBuilt, xmlSaved, 'Fresh build and pre-built ir.json produce identical DOCX XML under A10FIX');
  } finally {
    setA10Fix(false);
  }
});
