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

// Load modules under test
const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const GF = require(path.join(ROOT, 'js/layout-engine/faithful/grid-first.js'));
const Docx = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));
const OCR = require(path.join(ROOT, 'js/ai-ocr-engine.js'));

globalThis.FayzarLayoutIR = IR;
globalThis.FayzarLineFit = LF;
globalThis.FayzarGridFirst = GF;
globalThis.FayzarFaithfulDocx = Docx;

const A04_DIR = path.join(ROOT, 'qa/golden-data/asis/a04');
const a04Capture = JSON.parse(fs.readFileSync(path.join(A04_DIR, 'capture.json'), 'utf8'));
const a04Measures = JSON.parse(fs.readFileSync(path.join(A04_DIR, 'measures.json'), 'utf8'));
const a04GoldenIr = JSON.parse(fs.readFileSync(path.join(A04_DIR, 'ir.json'), 'utf8'));

function setRotTextSwitch(on) {
  if (on) {
    globalThis.__FZ_ON_ROTTEXT = true;
    delete globalThis.__FZ_OFF_ROTTEXT;
    process.env.__FZ_ON_ROTTEXT = '1';
  } else {
    delete globalThis.__FZ_ON_ROTTEXT;
    delete globalThis.__FZ_OFF_ROTTEXT;
    delete process.env.__FZ_ON_ROTTEXT;
    if (process.env.FZ_ON) {
      process.env.FZ_ON = process.env.FZ_ON
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && s !== 'ROTTEXT')
        .join(',');
    }
  }
}

function getTablesFromIr(ir) {
  const out = [];
  for (const page of ir.pages || []) {
    for (const band of page.bands || []) {
      for (const cell of band.cells || []) {
        for (const it of cell.items || []) {
          if (it && it.kind === 'table') out.push({ page: page.page, table: it });
        }
      }
    }
  }
  return out;
}

test('ROTTEXT switch OFF (default): output is 100% identical to baseline without rotated cells', () => {
  setRotTextSwitch(false);
  assert.equal(IR.rotTextOn(), false);
  assert.equal(LF.isRotTextOn(), false);
  assert.equal(OCR.isRotTextSwitchEnabled(), false);

  // 1. Prompt is completely unchanged when switch is OFF
  const promptOff = OCR.getGeminiCapturePrompt();
  assert.equal(typeof promptOff, 'string');
  assert.ok(promptOff.length > 500);
  assert.equal(promptOff.includes('⟦rot⟧'), false);

  // 2. Building IR from capture + measures with switch OFF has no rot metadata and matches golden ir.json rows & colFractions
  const capClone = JSON.parse(JSON.stringify(a04Capture));
  const measClone = JSON.parse(JSON.stringify(a04Measures));
  const builtIr = IR.build(capClone, measClone.measures, measClone.pageInfo);
  LF.fit(builtIr);

  const tables = getTablesFromIr(builtIr);
  assert.equal(tables.length, 2);
  for (const { table } of tables) {
    assert.equal(table.cellRots, undefined);
    for (const row of table.rows) {
      for (const cell of row) {
        assert.equal(typeof cell, 'string');
      }
    }
  }

  // Compare Page 1 and Page 2 table rows and colFractions against golden ir.json
  const goldenTables = getTablesFromIr(a04GoldenIr);
  assert.equal(goldenTables.length, 2);
  assert.deepEqual(tables[0].table.colFractions, goldenTables[0].table.colFractions);
  assert.deepEqual(tables[0].table.rows, goldenTables[0].table.rows);
  assert.deepEqual(tables[1].table.colFractions, goldenTables[1].table.colFractions);
  assert.deepEqual(tables[1].table.rows, goldenTables[1].table.rows);

  // 3. DOCX XML with switch OFF has zero <w:textDirection> tags
  const { xml } = Docx.bodyXml(builtIr);
  assert.equal(xml.includes('w:textDirection'), false);

  // Also verify from golden ir.json directly
  const goldenClone = JSON.parse(JSON.stringify(a04GoldenIr));
  const { xml: xmlFromGolden } = Docx.bodyXml(goldenClone);
  assert.equal(xmlFromGolden.includes('w:textDirection'), false);
});

test('ROTTEXT switch ON: detects rotated cells in a04 IR (both IR.build and pre-built ir.json) and preserves narrow columns & row heights', () => {
  setRotTextSwitch(true);
  try {
    assert.equal(IR.rotTextOn(), true);
    assert.equal(LF.isRotTextOn(), true);
    assert.equal(OCR.isRotTextSwitchEnabled(), true);
    assert.equal(OCR.getGeminiCapturePrompt().includes('⟦rot⟧'), true);

    const capClone = JSON.parse(JSON.stringify(a04Capture));
    const measClone = JSON.parse(JSON.stringify(a04Measures));
    const builtIr = IR.build(capClone, measClone.measures, measClone.pageInfo);
    LF.fit(builtIr);

    const tables = getTablesFromIr(builtIr);
    assert.equal(tables.length, 2);

    // Page 1 Table (17 cols x 25 rows)
    const t1 = tables[0].table;
    assert.equal(t1.rows.length, 25);
    assert.equal(t1.colFractions.length, 17);

    // Rotated cells in Page 1 Row 1: 15 vertical headers (cols 0..14)
    const p1RotCols = [];
    t1.rows[1].forEach((cell, k) => {
      const rot = (cell && typeof cell === 'object' && cell.rot) || (t1.cellRots && t1.cellRots[1] && t1.cellRots[1][k]);
      if (rot === 'btLr') p1RotCols.push(k);
    });
    assert.deepEqual(p1RotCols, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    assert.equal(t1.rows[1][0].rot, 'btLr');
    assert.equal(String(t1.rows[1][0]).includes('হইতে'), true);
    assert.equal(t1.rows[0][3].rot, undefined); // "অর্জিত ছুটি" group header in Row 0 is horizontal
    assert.equal(t1.rows[2][0].rot, undefined); // "১" column number in Row 2 is horizontal

    // Column widths on Page 1 are kept narrow (each ~36.4pt, max <= 40pt instead of 72.9pt)
    const maxColWPt1 = Math.max(...t1.colFractions.map((f) => f * t1.widthPt));
    assert.ok(maxColWPt1 <= 40, `Expected max col width <= 40pt on Page 1, got ${maxColWPt1}`);

    // Row heights on Page 1 match measured rules: header Row 0 = 24.9pt, tall rotated Row 1 = 268.8pt
    assert.equal(t1.rowHeightsPt[0], 24.9);
    assert.equal(t1.rowHeightsPt[1], 268.8);
    assert.equal(t1.rowHeightsPt[2], 38.5);
    assert.equal(t1.rowHeightsExact, true);

    // Page 2 Table (12 cols x 26 rows)
    const t2 = tables[1].table;
    assert.equal(t2.rows.length, 26);
    assert.equal(t2.colFractions.length, 12);

    // All 12 columns in Row 2 of Page 2 are vertical rotated headers
    const p2RotCols = [];
    t2.rows[2].forEach((cell, k) => {
      const rot = (cell && typeof cell === 'object' && cell.rot) || (t2.cellRots && t2.cellRots[2] && t2.cellRots[2][k]);
      if (rot === 'btLr') p2RotCols.push(k);
    });
    assert.deepEqual(p2RotCols, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    assert.equal(t2.rows[2][0].rot, 'btLr');
    assert.equal(t2.rows[2][10].rot, 'btLr');
    assert.equal(String(t2.rows[2][10]).includes('মন্তব্য'), true);

    // Column widths on Page 2 have no collapsed 14pt or double-width 77pt columns
    const minColWPt2 = Math.min(...t2.colFractions.map((f) => f * t2.widthPt));
    const maxColWPt2 = Math.max(...t2.colFractions.map((f) => f * t2.widthPt));
    assert.ok(minColWPt2 >= 35, `Expected min col width >= 35pt on Page 2, got ${minColWPt2}`);
    assert.ok(maxColWPt2 <= 80, `Expected max col width <= 80pt on Page 2, got ${maxColWPt2}`);

    // Row heights on Page 2 have the measured tall rotated header band (Row 2 = 243.8pt)
    assert.equal(t2.rowHeightsPt[0], 25.5);
    assert.equal(t2.rowHeightsPt[1], 25.5);
    assert.equal(t2.rowHeightsPt[2], 243.8);
    assert.equal(t2.rowHeightsExact, true);

    // Also verify pre-built golden ir.json is repaired when passed through LF.fit()
    const goldenClone = JSON.parse(JSON.stringify(a04GoldenIr));
    LF.fit(goldenClone);
    const gTables = getTablesFromIr(goldenClone);
    assert.equal(gTables[0].table.rows[1][0].rot, 'btLr');
    assert.equal(gTables[1].table.rows[2][0].rot, 'btLr');
    assert.equal(gTables[1].table.rows[2][10].rot, 'btLr');
  } finally {
    setRotTextSwitch(false);
  }
});

test('ROTTEXT switch ON: DOCX builder emits <w:textDirection w:val="btLr"/> and exact measured row heights for a04', async () => {
  setRotTextSwitch(true);
  try {
    const capClone = JSON.parse(JSON.stringify(a04Capture));
    const measClone = JSON.parse(JSON.stringify(a04Measures));
    const builtIr = IR.build(capClone, measClone.measures, measClone.pageInfo);
    LF.fit(builtIr);
    const { xml } = Docx.bodyXml(builtIr);

    // Count <w:textDirection w:val="btLr"/> in document XML (15 on Page 1 + 12 on Page 2 = 27)
    const tdMatches = [...xml.matchAll(/<w:textDirection w:val="btLr"\/>/g)];
    assert.equal(tdMatches.length, 27);

    // Verify <w:textDirection w:val="btLr"/> is placed inside <w:tcPr>
    const tcPrWithRot = [...xml.matchAll(/<w:tcPr>(?:(?!<\/w:tcPr>)[\s\S])*?<w:textDirection w:val="btLr"\/>(?:(?!<\/w:tcPr>)[\s\S])*?<\/w:tcPr>/g)];
    assert.equal(tcPrWithRot.length, 27);

    // Verify tall rotated rows have exact height matching measured bands (5376 dxa = 268.8pt on Page 1, 4876 dxa = 243.8pt on Page 2)
    assert.ok(
      xml.includes('<w:trHeight w:val="5376" w:hRule="exact"/>'),
      'Expected Page 1 rotated header row to have exact height 5376 dxa (268.8pt)'
    );
    assert.ok(
      xml.includes('<w:trHeight w:val="4876" w:hRule="exact"/>'),
      'Expected Page 2 rotated header row to have exact height 4876 dxa (243.8pt)'
    );

    // Verify rotated cells do NOT have horizontal gridSpan merging across adjacent columns
    for (const m of tcPrWithRot) {
      assert.equal(
        m[0].includes('<w:gridSpan'),
        false,
        `Rotated cell tcPr should not horizontally span multiple columns: ${m[0]}`
      );
    }

    // Verify full Docx.build() produces a valid zip containing word/document.xml with w:textDirection
    const docxBytes = await Docx.build(builtIr, { type: 'uint8array' });
    assert.ok(docxBytes && docxBytes.length > 1000);
    const zip = await Docx.MiniJSZip.loadAsync(docxBytes);
    const docXml = await zip.file('word/document.xml').async('string');
    assert.ok(docXml.includes('<w:textDirection w:val="btLr"/>'));
  } finally {
    setRotTextSwitch(false);
  }
});

test('ROTTEXT switch ON: supports explicit ⟦rot⟧ cell marker and leaves non-rotated tables unchanged', () => {
  setRotTextSwitch(true);
  try {
    // 1. Explicit ⟦rot⟧ marker in capture / IR
    const sampleIr = {
      pages: [
        {
          page: 1,
          widthPt: 595,
          heightPt: 842,
          margins: { top: 36, right: 36, bottom: 36, left: 36 },
          bands: [
            {
              kind: 'flow',
              y0: 50,
              y1: 200,
              cells: [
                {
                  x0: 36,
                  x1: 559,
                  items: [
                    {
                      kind: 'table',
                      rect: { x: 36, y: 50, w: 523, h: 120 },
                      widthPt: 523,
                      heightPt: 120,
                      fontPt: 10,
                      colFractions: [0.1, 0.45, 0.45],
                      rowHeightsPt: [60, 30, 30],
                      rows: [
                        ['⟦rot⟧ক্রমিক নং', 'বিবরণ', 'মন্তব্য'],
                        ['১', 'সাধারণ তথ্য', ''],
                        ['২', 'অন্যান্য', '']
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    LF.fit(sampleIr);
    const tbl = sampleIr.pages[0].bands[0].cells[0].items[0];
    assert.equal(tbl.rows[0][0].rot, 'btLr');
    assert.equal(String(tbl.rows[0][0]), 'ক্রমিক নং');
    assert.equal(tbl.rows[0][1].rot, undefined);

    const { xml } = Docx.bodyXml(sampleIr);
    assert.equal(xml.includes('<w:textDirection w:val="btLr"/>'), true);
    assert.equal(xml.includes('⟦rot⟧'), false);
    assert.equal(xml.includes('ক্রমিক নং'), true);

    // 2. Non-rotated normal table is completely unchanged between switch ON and switch OFF
    const makeNormalIr = () => ({
      pages: [
        {
          page: 1,
          widthPt: 595,
          heightPt: 842,
          margins: { top: 36, right: 36, bottom: 36, left: 36 },
          bands: [
            {
              kind: 'flow',
              y0: 50,
              y1: 170,
              cells: [
                {
                  x0: 36,
                  x1: 559,
                  items: [
                    {
                      kind: 'table',
                      rect: { x: 36, y: 50, w: 523, h: 90 },
                      widthPt: 523,
                      heightPt: 90,
                      fontPt: 11,
                      colFractions: [0.2, 0.4, 0.4],
                      rowHeightsPt: [30, 30, 30],
                      rows: [
                        ['ক্রমিক', 'নাম ও পদবি', 'স্বাক্ষর'],
                        ['১', 'ক খ গ', ''],
                        ['২', 'ঘ ঙ চ', '']
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });

    const irOn = makeNormalIr();
    LF.fit(irOn);
    const xmlOn = Docx.bodyXml(irOn).xml;

    setRotTextSwitch(false);
    const irOff = makeNormalIr();
    LF.fit(irOff);
    const xmlOff = Docx.bodyXml(irOff).xml;

    assert.equal(xmlOn, xmlOff);
  } finally {
    setRotTextSwitch(false);
  }
});
