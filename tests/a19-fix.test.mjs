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

const LayoutIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LineFit = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const FaithfulDocx = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const GOLDEN_DIR = fs.existsSync(path.join(ROOT, 'qa/golden-data/asis/a19/ir.json'))
  ? path.join(ROOT, 'qa/golden-data/asis/a19')
  : path.join(ROOT, 'samples/a19');

const captureData = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'capture.json'), 'utf8'));
const measuresData = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'measures.json'), 'utf8'));
const goldenIr = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'ir.json'), 'utf8'));

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function setA19Switch(on) {
  if (on) {
    delete globalThis.__FZ_OFF_A19FIX;
    globalThis.__FZ_ON_A19FIX = true;
    if (typeof globalThis.window === 'object' && globalThis.window) {
      delete globalThis.window.__FZ_OFF_A19FIX;
      globalThis.window.__FZ_ON_A19FIX = true;
    }
    process.env.FZ_ON = 'A19FIX';
    delete process.env.FZ_OFF;
  } else {
    delete globalThis.__FZ_ON_A19FIX;
    delete globalThis.__FZ_OFF_A19FIX;
    if (typeof globalThis.window === 'object' && globalThis.window) {
      delete globalThis.window.__FZ_ON_A19FIX;
      delete globalThis.window.__FZ_OFF_A19FIX;
    }
    delete process.env.__FZ_ON_A19FIX;
    delete process.env.__FZ_OFF_A19FIX;
    delete process.env.FZ_ON;
    delete process.env.FZ_OFF;
  }
}

// Compute baseline outputs before enabling switch
setA19Switch(false);
const baselineIrForXml = clone(goldenIr);
const baselineXml = FaithfulDocx.bodyXml(baselineIrForXml).xml;
const baselineBuiltIr = LayoutIR.build(clone(captureData), clone(measuresData.measures), clone(measuresData.pageInfo));

test('A19FIX switch OFF preserves exact baseline behavior across IR, LineFit, and DOCX XML', () => {
  setA19Switch(false);
  assert.equal(LayoutIR.a19FixOn(), false);
  assert.equal(LineFit.isA19FixOn(), false);

  const irCopy = clone(goldenIr);
  const { xml } = FaithfulDocx.bodyXml(irCopy);
  assert.equal(xml, baselineXml, 'bodyXml with switch OFF must match baseline identically');

  const builtCopy = LayoutIR.build(clone(captureData), clone(measuresData.measures), clone(measuresData.pageInfo));
  assert.deepEqual(builtCopy, baselineBuiltIr, 'LayoutIR.build with switch OFF must match baseline identically');

  // Verify FZ_OFF=A19FIX overrides FZ_ON=A19FIX
  globalThis.__FZ_ON_A19FIX = true;
  globalThis.__FZ_OFF_A19FIX = true;
  assert.equal(LayoutIR.a19FixOn(), false);
  assert.equal(LineFit.isA19FixOn(), false);
  setA19Switch(false);
});

test('A19FIX Bug #1: fixes boxed instruction banner, open-sided table borders, underline rule, and split 10| block on golden ir.json', () => {
  setA19Switch(true);
  try {
    assert.equal(LayoutIR.a19FixOn(), true);
    assert.equal(LineFit.isA19FixOn(), true);

    const ir = clone(goldenIr);
    LineFit.fit(ir);
    const page = ir.pages[0];

    // 1. Band 3 ("দ্রষ্টব্য : ...") wrapped in 4-sided box (223.5 & 251.75 srcPt rules) without duplicate underline
    assert.ok(Array.isArray(page.boxes) && page.boxes.length === 1, 'Band 3 instruction box should be recovered in page.boxes');
    const bx = page.boxes[0];
    assert.equal(bx.y0, 125.1);
    assert.equal(bx.y1, 141);
    assert.ok(Math.abs(bx.x0 - 67) <= 0.5 && Math.abs(bx.x1 - 502.5) <= 0.5);

    const noteIt = page.bands[3].cells[0].items[0];
    assert.deepEqual(noteIt.boxIds, [bx.id]);
    assert.equal(noteIt.underline, false);
    assert.equal(noteIt.ruleBelow, undefined);
    assert.equal(noteIt.centerShiftPt, undefined);

    // 2. Band 5 (Main Form Table ১।–৯।) exact 9 row heights (ending at 677pt = 1209.25 srcPt), Col 0 left-aligned, Row ৬। underlined
    const mainTbl = page.bands[5].cells[0].items[0];
    assert.equal(mainTbl.kind, 'table');
    assert.equal(mainTbl.fontPt, 11.5);
    assert.equal(mainTbl.colAligns[0], 'l');
    assert.equal(mainTbl.exactRuleHeights, true);
    assert.equal(mainTbl.heightPt, 470);
    assert.deepEqual(mainTbl.rowHeightsPt, [21.7, 44.9, 22.3, 22.9, 44.9, 118.8, 60.2, 89.5, 44.8]);
    assert.ok(
      mainTbl.rows[5][1].includes('<u>উত্তরপত্রে এবং নকলের</u>') &&
      mainTbl.rows[5][1].includes('<u>কাগজপত্রে লাল কালি দিয়ে অবশ্যই চিহ্নিত করতে হবে</u>'),
      'Row ৬। directive should have underline markup restored'
    );

    // 3. Band 6 (Section ১০।) unified from 3 split borderless tables into 1 full-width 3-row table with bottom+right borders
    assert.equal(page.bands.length, 11, '3 split bands for ১০। should be unified into 1 band (13 -> 11 bands)');
    const sec10Tbl = page.bands[6].cells[0].items[0];
    assert.equal(sec10Tbl.kind, 'table');
    assert.equal(sec10Tbl.rows.length, 3);
    assert.equal(sec10Tbl.fontPt, 11.5);
    assert.ok(sec10Tbl.widthPt >= 515, 'Section ১০। table should span full form width');
    assert.equal(sec10Tbl.heightPt, 85.9);
    assert.deepEqual(sec10Tbl.rowHeightsPt, [28.2, 24.2, 33.5]);

    // 4. Band 8 (Bottom Committee Table ১১।–১৩।) compact row heights and continuation indent
    const botTbl = page.bands[8].cells[0].items[0];
    assert.equal(botTbl.kind, 'table');
    assert.equal(botTbl.heightPt, 44.5);
    assert.deepEqual(botTbl.rowHeightsPt, [15.5, 13.5, 15.5]);

    // 5. Verify DOCX XML table borders and cell properties
    const { xml } = FaithfulDocx.bodyXml(ir);
    const tbls = [...xml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)].map((m) => m[0]);
    assert.equal(tbls.length, 7, 'XML should contain 7 tables (header grid, note box, main table, sec 10 table, sec 11-13 table, 2 footer grids)');

    // Main table (tbls[2]): top, left, right borders nil; bottom, insideH, insideV single
    const mainBdr = /<w:tblBorders>[\s\S]*?<\/w:tblBorders>/.exec(tbls[2])[0];
    assert.match(mainBdr, /<w:top w:val="nil"\/>/);
    assert.match(mainBdr, /<w:left w:val="nil"\/>/);
    assert.match(mainBdr, /<w:right w:val="nil"\/>/);
    assert.match(mainBdr, /<w:bottom w:val="single"/);
    assert.match(mainBdr, /<w:insideH w:val="single"/);
    assert.match(mainBdr, /<w:insideV w:val="single"/);

    // Section 10 table (tbls[3]): only bottom and right borders single; matching 488 dxa Col 0 width
    const sec10Bdr = /<w:tblBorders>[\s\S]*?<\/w:tblBorders>/.exec(tbls[3])[0];
    assert.match(sec10Bdr, /<w:top w:val="nil"\/>/);
    assert.match(sec10Bdr, /<w:left w:val="nil"\/>/);
    assert.match(sec10Bdr, /<w:insideH w:val="nil"\/>/);
    assert.match(sec10Bdr, /<w:insideV w:val="nil"\/>/);
    assert.match(sec10Bdr, /<w:bottom w:val="single"/);
    assert.match(sec10Bdr, /<w:right w:val="single"/);
    assert.match(tbls[2], /<w:gridCol w:w="487"\/>/);
    assert.match(tbls[3], /<w:gridCol w:w="487"\/>/);

    // Bottom committee table (tbls[4]): only top and insideV borders single; Row 1 Col 0 indented by 560 dxa (28pt)
    const botBdr = /<w:tblBorders>[\s\S]*?<\/w:tblBorders>/.exec(tbls[4])[0];
    assert.match(botBdr, /<w:top w:val="single"/);
    assert.match(botBdr, /<w:insideV w:val="single"/);
    assert.match(botBdr, /<w:left w:val="nil"\/>/);
    assert.match(botBdr, /<w:right w:val="nil"\/>/);
    assert.match(botBdr, /<w:insideH w:val="nil"\/>/);
    assert.match(botBdr, /<w:bottom w:val="nil"\/>/);
    assert.match(tbls[4], /<w:ind w:left="560"\/>/);
  } finally {
    setA19Switch(false);
  }
});

test('A19FIX Bug #2: fixes intro paragraph firstIndent/lineSpacing/justRight and multi-line table cell justification & pitch across build and ir.json', () => {
  setA19Switch(true);
  try {
    // Pathway A: From capture.json + measures.json via LayoutIR.build + LineFit.fit
    const builtIr = LayoutIR.build(clone(captureData), clone(measuresData.measures), clone(measuresData.pageInfo));
    LineFit.fit(builtIr);
    const introBuilt = builtIr.pages[0].bands[4].cells[0].items[0];
    assert.equal(introBuilt.firstIndentPt, 17.4, 'First-line indent (17.4pt) must be preserved after LineFit.fit');
    assert.equal(introBuilt.lineSpacingPt, 16.1, 'Scaled lineSpacingPt (16.1pt) must be preserved');
    assert.equal(introBuilt.justRightPt, 5.7, 'justRightPt (5.7pt) must be computed on justified intro paragraph');

    // Pathway B: From pre-built ir.json where firstIndentPt and lineSpacingPt were zeroed out
    const preIr = clone(goldenIr);
    LineFit.fit(preIr);
    const introPre = preIr.pages[0].bands[4].cells[0].items[0];
    assert.equal(introPre.firstIndentPt, 17.4, 'First-line indent (17.4pt) must be recovered on pre-built ir.json');
    assert.equal(introPre.lineSpacingPt, 16.1, 'Line spacing (16.1pt) must be recovered on pre-built ir.json');
    assert.equal(introPre.justRightPt, 5.7, 'justRightPt (5.7pt) must be recovered on pre-built ir.json');

    const { xml } = FaithfulDocx.bodyXml(preIr);
    // Intro paragraph has firstLine="348" (17.4pt), left="114" (5.7pt), right="114" (5.7pt), line="322" (16.1pt exact)
    assert.match(xml, /<w:spacing w:before="\d+" w:after="0" w:line="322" w:lineRule="exact"\/><w:ind w:left="114" w:right="114" w:firstLine="348"\/><w:jc w:val="both"\/>/);

    // Main table multi-line prose cells (৫।–৯। Col 1) use single <w:p> with <w:jc w:val="both"/> and <w:br/>
    const mainTblXml = [...xml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)][2][0];
    const bothParas = [...mainTblXml.matchAll(/<w:p><w:pPr>[^<]*<w:spacing[^>]*w:lineRule="exact"\/>[^<]*<w:jc w:val="both"\/>[\s\S]*?<\/w:p>/g)];
    assert.equal(bothParas.length, 5, 'All 5 multi-line prose cells (৫।–৯।) should render as justified <w:p> blocks with exact line spacing');
    bothParas.forEach((m) => {
      assert.match(m[0], /<w:r><w:br\/><\/w:r>/, 'Multi-line prose cell should join lines with <w:br/>');
    });

    // Main table fill-dot cells in Col 1 / Col 2 use right-aligned dot-leader tabs
    assert.match(mainTblXml, /<w:tab w:val="right" w:leader="dot" w:pos="\d+"\/>/);
  } finally {
    setA19Switch(false);
  }
});
