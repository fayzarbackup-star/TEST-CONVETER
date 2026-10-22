// RULES_TYPE_v2: ছক/টেবিলের বাহ্যিক ও অভ্যন্তরীণ দাগ সংরক্ষণ, ফ্রেমযুক্ত পাতার ১-পাতা লাইন-ফিট পুনরুদ্ধার এবং প্রতি সারিতে কলাম-প্রস্থের যোগফল = টেবিল-প্রস্থ যাচাইয়ের স্বয়ংক্রিয় পরীক্ষা
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = fs.existsSync(path.join(__dirname, 'js/layout-engine/faithful/layout-ir.js'))
  ? __dirname
  : path.resolve(__dirname, '..');

// ভিত্তি সুইচসমূহ সক্রিয় (switch-defaults.js ইমপোর্ট না করে সরাসরি নাম দিয়ে সক্রিয়)
const BASE_ON_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT',
  'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4',
  'RULES2', 'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX', 'A02FIX',
  'A06FIX', 'A07FIX6', 'F1FIX', 'A18FIX', 'A08FIX', 'A16FIX6', 'F1FIX2',
  'INDENTFIX', 'VGAPFIX', 'SERIALFIX', 'MISSINGFIX', 'SHORTFIX'
];

function setBaseSwitches() {
  for (const k of Object.keys(globalThis)) {
    if (k.startsWith('__FZ_ON_') || k.startsWith('__FZ_OFF_')) {
      delete globalThis[k];
    }
  }
  for (const sw of BASE_ON_SWITCHES) {
    globalThis['__FZ_ON_' + sw] = true;
  }
}

setBaseSwitches();

const LayoutIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LineFit = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DocxBuilder = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error('❌ ব্যর্থ:', msg);
  }
}

const r1 = (n) => Math.round(n * 10) / 10;

// মূল অপরিবর্তিত রেফারেন্স ইনপুট লোড
const a02Meas = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/runs/S26_3b93d252/a02/measures.json'), 'utf8'));
const a16Meas = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a16/measures.json'), 'utf8'));
const a02GoldenIrRaw = fs.readFileSync(path.join(ROOT, 'qa/golden-data/runs/S26_3b93d252/a02/ir.json'), 'utf8');
const a16GoldenIrRaw = fs.readFileSync(path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a16/ir.json'), 'utf8');

// a03 এবং a18-এর বাস্তব কাঠামোর ফিক্সচার (বর্ডারলেস ফরম-ছক, splitBoxCols ছক, _p2VRule ছক এবং ২৮×৪ ছুটির আবেদন ছক)
function makeA03IrFixture() {
  return {
    pages: [
      {
        page: 1,
        widthPt: 595.2,
        heightPt: 841.9,
        scale: 1,
        bodyFontPt: 11,
        margins: { top: 36, right: 36, bottom: 36, left: 36 },
        boxes: [
          { id: 1, x0: 36, y0: 120, x1: 559, y1: 280, sz: 6 }
        ],
        bands: [
          {
            kind: 'flow',
            y0: 130,
            y1: 195,
            gapBeforePt: 10,
            boxIds: [1],
            cells: [
              {
                x0: 36,
                x1: 559,
                items: [
                  {
                    kind: 'table',
                    borderless: true,
                    boxIds: [1],
                    rect: { x: 42, y: 130, w: 215.4, h: 65 },
                    fontPt: 11,
                    cellFontSrc: 11,
                    marPt: 5.4,
                    colFractions: [0.42, 0.58],
                    rows: [
                      ['১. নাম (বাংলায়)', ': করিম উদ্দিন'],
                      ['২. পিতার নাম', ': রহিম উদ্দিন'],
                      ['৩. মাতার নাম', ': আমেনা বেগম']
                    ]
                  }
                ]
              }
            ]
          },
          {
            kind: 'flow',
            y0: 210,
            y1: 265,
            gapBeforePt: 15,
            cells: [
              {
                x0: 36,
                x1: 559,
                items: [
                  {
                    kind: 'table',
                    borderless: true,
                    splitBoxCols: [true, false, true],
                    widthPt: 523.2,
                    rect: { x: 36, y: 210, w: 523.2, h: 55 },
                    fontPt: 11,
                    cellFontSrc: 11,
                    marPt: 5.4,
                    colFractions: [0.47, 0.06, 0.47],
                    rowHeightsPt: [55],
                    rowHeightsExact: true,
                    rows: [
                      ['স্থায়ী ঠিকানা:\nগ্রাম: ফুলবাড়ী, ডাকঘর: ফুলবাড়ী', '', 'বর্তমান ঠিকানা:\nগ্রাম: ফুলবাড়ী, ডাকঘর: ফুলবাড়ী']
                    ]
                  }
                ]
              }
            ]
          },
          {
            kind: 'flow',
            y0: 300,
            y1: 360,
            gapBeforePt: 35,
            cells: [
              {
                x0: 36,
                x1: 559,
                items: [
                  {
                    kind: 'table',
                    borderless: false,
                    gridFirst: true,
                    widthPt: 523.2,
                    heightPt: 60,
                    srcRulesPt: [300, 320, 340, 360],
                    rect: { x: 36, y: 300, w: 523.2, h: 60 },
                    fontPt: 10.5,
                    cellFontSrc: 10.5,
                    marPt: 5.4,
                    colFractions: [0.25, 0.25, 0.25, 0.25],
                    fullVRule: [true, true, true],
                    rowHeightsPt: [20, 20, 20],
                    rowHeightsExact: true,
                    rows: [
                      ['পরীক্ষার নাম', 'বোর্ড/বিশ্ববিদ্যালয়', 'পাশের সন', 'বিভাগ/শ্রেণি'],
                      ['এসএসসি', 'রাজশাহী', '২০১০', 'প্রথম'],
                      ['এইচএসসি', 'রাজশাহী', '২০১২', 'প্রথম']
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    warnings: []
  };
}

function makeA18IrFixture() {
  const rows = Array.from({ length: 28 }, (_, i) => [
    i % 5 === 0 ? `${i + 1}।` : '',
    `ছুটির বিবরণ সারি ${i + 1}`,
    ':',
    `তথ্য ${i + 1}`
  ]);
  const rowBand = Array.from({ length: 28 }, (_, i) => Math.min(5, Math.floor(i / 5) + 1));
  const vRuleBands = Array.from({ length: 6 }, () => [false, false, true]);
  const gridSpans = Array.from({ length: 28 }, () => [1, 1, 1, 1]);
  const vMerges = Array.from({ length: 28 }, () => [null, null, null, null]);
  return {
    pages: [
      {
        page: 1,
        widthPt: 595.2,
        heightPt: 841.9,
        scale: 1,
        bodyFontPt: 11,
        margins: { top: 36, right: 38.9, bottom: 36, left: 38.9 },
        bands: [
          {
            kind: 'flow',
            y0: 110,
            y1: 710,
            gapBeforePt: 12,
            cells: [
              {
                x0: 38.9,
                x1: 556.4,
                items: [
                  {
                    kind: 'table',
                    borderless: false,
                    gridFirst: true,
                    widthPt: 517.5,
                    heightPt: 600,
                    rect: { x: 38.9, y: 110, w: 517.5, h: 600 },
                    fontPt: 11,
                    cellFontSrc: 11,
                    marPt: 5.4,
                    srcRulesPt: [110, 210, 310, 410, 510, 710],
                    rowHeightsPt: Array.from({ length: 28 }, () => 21.4),
                    rowHeightsExact: true,
                    colFractions: [0.0609, 0.4152, 0.0251, 0.4988],
                    fullVRule: [false, false, true],
                    rowBand,
                    vRuleBands,
                    gridSpans,
                    vMerges,
                    rows
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    warnings: []
  };
}

function runPipeline(meas) {
  const mClone = JSON.parse(JSON.stringify(meas));
  const ir = LayoutIR.build(mClone);
  LineFit.fit(ir);
  const { xml } = DocxBuilder.bodyXml(ir);
  return { irJson: JSON.stringify(ir), ir, xml };
}

function runIrPipeline(irFixture) {
  const ir = JSON.parse(JSON.stringify(irFixture));
  LayoutIR.repairRulesFixIr(ir);
  LineFit.fit(ir);
  const { xml } = DocxBuilder.bodyXml(ir);
  return { irJson: JSON.stringify(ir), ir, xml };
}

function parseTopLevelTables(xml) {
  const tables = [];
  let depth = 0;
  let start = -1;
  const tagRe = /<\/?w:tbl\b[^>]*>/g;
  let m;
  while ((m = tagRe.exec(xml)) !== null) {
    if (m[0].startsWith('<w:tbl')) {
      if (depth === 0) start = m.index;
      depth++;
    } else {
      depth--;
      if (depth === 0 && start >= 0) {
        tables.push(xml.slice(start, m.index + m[0].length));
        start = -1;
      }
    }
  }
  return tables;
}

function stripNestedTables(tblXml) {
  let out = '';
  let depth = 0;
  let lastIdx = 0;
  const tagRe = /<\/?w:tbl\b[^>]*>/g;
  let m;
  while ((m = tagRe.exec(tblXml)) !== null) {
    if (m[0].startsWith('<w:tbl')) {
      depth++;
      if (depth === 2) {
        out += tblXml.slice(lastIdx, m.index);
      }
    } else {
      if (depth === 2) {
        lastIdx = m.index + m[0].length;
      }
      depth--;
    }
  }
  out += tblXml.slice(lastIdx);
  return out;
}

function extractTableGridSignatures(xml) {
  return parseTopLevelTables(xml).map((rawTbl) => {
    const cleanTbl = stripNestedTables(rawTbl);
    const tblWM = /<w:tblPr>[\s\S]*?<w:tblW\s+w:w="(\d+)"/.exec(cleanTbl);
    const gridCols = [...cleanTbl.matchAll(/<w:gridCol\s+w:w="(\d+)"\/>/g)].map((x) => Number(x[1]));
    const trMatches = [...cleanTbl.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)];
    const rowTcWs = trMatches.map((tr) =>
      [...tr[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)].map((tc) => {
        const tcPrM = /<w:tcPr>([\s\S]*?)<\/w:tcPr>/.exec(tc[1]);
        const tcW = tcPrM && /<w:tcW\s+w:w="(\d+)"/.exec(tcPrM[1]);
        return tcW ? Number(tcW[1]) : 0;
      })
    );
    return {
      tblW: tblWM ? Number(tblWM[1]) : null,
      gridCols,
      rowCount: trMatches.length,
      rowTcWs
    };
  });
}

function verifyXmlTableGridInvariants(xml, label) {
  const topTables = parseTopLevelTables(xml);
  assert(topTables.length > 0, `${label}: অন্তত একটি <w:tbl> থাকতে হবে`);
  for (let ti = 0; ti < topTables.length; ti++) {
    const cleanTbl = stripNestedTables(topTables[ti]);
    const tblWM = /<w:tblPr>[\s\S]*?<w:tblW\s+w:w="(\d+)"/.exec(cleanTbl);
    const gridMatches = [...cleanTbl.matchAll(/<w:gridCol\s+w:w="(\d+)"\/>/g)];
    if (!tblWM || !gridMatches.length) continue;
    const tblW = Number(tblWM[1]);
    const gridCols = gridMatches.map((x) => Number(x[1]));
    const gridSum = gridCols.reduce((a, b) => a + b, 0);
    assert(gridSum === tblW, `${label} tbl[${ti}]: gridCol যোগফল (${gridSum}) === tblW (${tblW})`);

    const gridBounds = new Set([0]);
    let accG = 0;
    for (const gw of gridCols) {
      accG += gw;
      gridBounds.add(accG);
    }

    const trMatches = [...cleanTbl.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)];
    for (let ri = 0; ri < trMatches.length; ri++) {
      const trXml = trMatches[ri][1];
      const tcMatches = [...trXml.matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)];
      let rowSum = 0;
      let accC = 0;
      for (let ci = 0; ci < tcMatches.length; ci++) {
        const tcPrM = /<w:tcPr>([\s\S]*?)<\/w:tcPr>/.exec(tcMatches[ci][1]);
        const tcW = tcPrM && /<w:tcW\s+w:w="(\d+)"/.exec(tcPrM[1]);
        const wVal = tcW ? Number(tcW[1]) : 0;
        rowSum += wVal;
        accC += wVal;
        assert(gridBounds.has(accC), `${label} tbl[${ti}] সারি ${ri} ঘর ${ci}: কলাম-সীমা (${accC}) একই গ্রিডে আছে`);
      }
      assert(rowSum === tblW, `${label} tbl[${ti}] সারি ${ri}: ঘরের প্রস্থের যোগফল (${rowSum}) === টেবিল প্রস্থ (${tblW})`);
    }
  }
}

function verifyIrTableInvariants(ir, label) {
  for (const page of ir.pages) {
    for (const band of page.bands || []) {
      for (const cell of band.cells || []) {
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'table' || it.borderless || !Array.isArray(it.rows) || it.rows.length === 0) continue;
          const nCols = Math.max(...it.rows.map((r) => r.length));
          if (nCols < 2 || !Array.isArray(it.colWidthsPt)) continue;
          const wPt = r1(it.widthPt || (it.rect && it.rect.w) || 400);
          const cwSum = r1((it.colWidthsPt || []).reduce((a, b) => a + b, 0));
          assert(cwSum === wPt, `${label} পাতা ${page.page}: IR colWidthsPt যোগফল (${cwSum}) === widthPt (${wPt})`);

          const bounds = new Set([0]);
          let acc = 0;
          for (const cw of it.colWidthsPt || []) {
            acc = r1(acc + cw);
            bounds.add(acc);
          }

          for (let ri = 0; ri < (it.cells || []).length; ri++) {
            const cRow = it.cells[ri];
            let rSum = 0;
            let rAcc = 0;
            for (let ci = 0; ci < cRow.length; ci++) {
              const cellObj = cRow[ci];
              if (!cellObj || cellObj.span === 0) continue;
              rSum = r1(rSum + cellObj.widthPt);
              rAcc = r1(rAcc + cellObj.widthPt);
              assert(bounds.has(rAcc), `${label} পাতা ${page.page} সারি ${ri} ঘর ${ci}: IR কলাম-সীমা (${rAcc}) একই গ্রিডে আছে`);
            }
            assert(rSum === wPt, `${label} পাতা ${page.page} সারি ${ri}: IR ঘরের প্রস্থের যোগফল (${rSum}) === widthPt (${wPt})`);
          }
        }
      }
    }
  }
}

// ১) সুইচ বন্ধ অবস্থায় (ডিফল্ট এবং __FZ_OFF_RULESFIX ওভাররাইড) বাইট-টু-বাইট অভিন্নতা যাচাই
setBaseSwitches();
const baseA02 = runPipeline(a02Meas);
const baseA16 = runPipeline(a16Meas);
const baseA03 = runIrPipeline(makeA03IrFixture());
const baseA18 = runIrPipeline(makeA18IrFixture());

setBaseSwitches();
globalThis.__FZ_ON_RULESFIX = false;
const offA02 = runPipeline(a02Meas);
const offA16 = runPipeline(a16Meas);
const offA03 = runIrPipeline(makeA03IrFixture());
const offA18 = runIrPipeline(makeA18IrFixture());
assert(offA02.irJson === baseA02.irJson, 'a02: সুইচ বন্ধ থাকলে IR বাইট-টু-বাইট অভিন্ন');
assert(offA02.xml === baseA02.xml, 'a02: সুইচ বন্ধ থাকলে DOCX XML বাইট-টু-বাইট অভিন্ন');
assert(offA16.irJson === baseA16.irJson, 'a16: সুইচ বন্ধ থাকলে IR বাইট-টু-বাইট অভিন্ন');
assert(offA16.xml === baseA16.xml, 'a16: সুইচ বন্ধ থাকলে DOCX XML বাইট-টু-বাইট অভিন্ন');
assert(offA03.irJson === baseA03.irJson, 'a03: সুইচ বন্ধ থাকলে IR বাইট-টু-বাইট অভিন্ন');
assert(offA03.xml === baseA03.xml, 'a03: সুইচ বন্ধ থাকলে DOCX XML বাইট-টু-বাইট অভিন্ন');
assert(offA18.irJson === baseA18.irJson, 'a18: সুইচ বন্ধ থাকলে IR বাইট-টু-বাইট অভিন্ন');
assert(offA18.xml === baseA18.xml, 'a18: সুইচ বন্ধ থাকলে DOCX XML বাইট-টু-বাইট অভিন্ন');

setBaseSwitches();
globalThis.__FZ_ON_RULESFIX = true;
globalThis.__FZ_OFF_RULESFIX = true;
const overrideOffA02 = runPipeline(a02Meas);
const overrideOffA16 = runPipeline(a16Meas);
assert(overrideOffA02.irJson === baseA02.irJson, 'a02: __FZ_OFF_RULESFIX ওভাররাইডে IR বাইট-টু-বাইট অভিন্ন');
assert(overrideOffA02.xml === baseA02.xml, 'a02: __FZ_OFF_RULESFIX ওভাররাইডে DOCX XML বাইট-টু-বাইট অভিন্ন');
assert(overrideOffA16.irJson === baseA16.irJson, 'a16: __FZ_OFF_RULESFIX ওভাররাইডে IR বাইট-টু-বাইট অভিন্ন');
assert(overrideOffA16.xml === baseA16.xml, 'a16: __FZ_OFF_RULESFIX ওভাররাইডে DOCX XML বাইট-টু-বাইট অভিন্ন');

// ২) সুইচ চালু অবস্থায় (__FZ_ON_RULESFIX = true) প্রত্যাশিত পরিবর্তন ও টেবিলের কঠোর নিয়ম যাচাই
setBaseSwitches();
globalThis.__FZ_ON_RULESFIX = true;
const onA02 = runPipeline(a02Meas);
const onA16 = runPipeline(a16Meas);
const onA03 = runIrPipeline(makeA03IrFixture());
const onA18 = runIrPipeline(makeA18IrFixture());

// পাতা-সংখ্যা অপরিবর্তিত
assert(onA02.ir.pages.length === 1, 'a02: পাতা-সংখ্যা অপরিবর্তিত (১ পাতা)');
assert(onA16.ir.pages.length === 9, 'a16: পাতা-সংখ্যা অপরিবর্তিত (৯ পাতা)');

// a03 ও a18: সুইচ চালু করলে টেবিলের tblW, gridCol, tcW ও সম্পূর্ণ XML শতভাগ অপরিবর্তিত থাকার কঠোর পরীক্ষা
const a03SigsOff = extractTableGridSignatures(baseA03.xml);
const a03SigsOn = extractTableGridSignatures(onA03.xml);
assert(JSON.stringify(a03SigsOn) === JSON.stringify(a03SigsOff), 'a03: RULESFIX চালু করলে সব টেবিলের tblW, gridCol ও tcW সম্পূর্ণ অপরিবর্তিত');
assert(onA03.irJson === baseA03.irJson, 'a03: RULESFIX চালু করলে বর্ডারলেস ও বর্ডারযুক্ত সব ছকের IR সম্পূর্ণ অপরিবর্তিত');
assert(onA03.xml === baseA03.xml, 'a03: RULESFIX চালু করলে সম্পূর্ণ DOCX XML বাইট-টু-বাইট অপরিবর্তিত');

const a18SigsOff = extractTableGridSignatures(baseA18.xml);
const a18SigsOn = extractTableGridSignatures(onA18.xml);
assert(JSON.stringify(a18SigsOn) === JSON.stringify(a18SigsOff), 'a18: RULESFIX চালু করলে ২৮×৪ ছুটির ছকের tblW, gridCol ও tcW সম্পূর্ণ অপরিবর্তিত');
assert(onA18.ir.pages[0].bands[0].cells[0].items[0].rows.length === 28, 'a18: ২৮×৪ ছকের ২৮টি সারি অক্ষুণ্ণ (৫ সারিতে সংকুচিত হয়নি)');
assert(onA18.ir.pages[0].bands[0].cells[0].items[0].rows[0].length === 4, 'a18: ২৮×৪ ছকের ৪টি কলাম অক্ষুণ্ণ (৩ কলামে সংকুচিত হয়নি)');
assert(onA18.irJson === baseA18.irJson, 'a18: RULESFIX চালু করলে IR সম্পূর্ণ অপরিবর্তিত');
assert(onA18.xml === baseA18.xml, 'a18: RULESFIX চালু করলে সম্পূর্ণ DOCX XML বাইট-টু-বাইট অপরিবর্তিত');

// a02: ফ্রেমযুক্ত পাতায় ১-পাতা লাইন-ফিট পুনরুদ্ধার (Band 6, Band 8, Band 10, Band 4/5/20) এবং একক গ্রিড পারিবারিক ছক
const a02P0 = onA02.ir.pages[0];
const a02B6 = a02P0.bands[6].cells[0].items[0];
const a02B8 = a02P0.bands[8].cells[0].items[0];
const a02B10 = a02P0.bands[10].cells[0].items[0];
assert(a02B6.charSpacingPt === -0.15, 'a02: Band 6 অনুচ্ছেদে charSpacingPt = -0.15 পুনরুদ্ধারকৃত');
assert(a02B8.rect.y === 230.5, 'a02: Band 8 অনুচ্ছেদের উল্লম্ব অবস্থান y = 230.5pt পুনরুদ্ধারকৃত');
assert(a02B10.charSpacingPt === -0.1, 'a02: Band 10 অনুচ্ছেদে charSpacingPt = -0.1 পুনরুদ্ধারকৃত (২-পাতা উপচানো রোধ)');
assert(onA02.xml.includes('<w:spacing w:val="-2"/>'), 'a02 XML: Band 10-এ w:spacing w:val="-2" উপস্থিত');

const a02FamilyTbl = a02P0.bands[17].cells[0].items[0];
assert(a02FamilyTbl.kind === 'table', 'a02: Band 17 একটি একক ছক');
assert(a02FamilyTbl.rows.length === 5 && a02FamilyTbl.rows[0].length === 6, 'a02: পারিবারিক ছকের পরীক্ষিত ৫×৬ একক গ্রিড কাঠামো অক্ষুণ্ণ');
assert(r1(a02FamilyTbl.rect.y) === 426.1, 'a02: পারিবারিক ছকের শীর্ষ অবস্থান y=426.05pt অপরিবর্তিত');
assert(JSON.stringify(a02FamilyTbl.rowHeightsPt) === JSON.stringify([30.2, 15.2, 15.2, 15.2, 15.2]), 'a02: পারিবারিক ছকের সারি-উচ্চতা [30.2, 15.2, 15.2, 15.2, 15.2] অক্ষুণ্ণ');

// a02: উল্লম্ব বন্ধনী চিত্রে (Band 20 cell 2) সাদা মার্জিন ক্রপ (<a:srcRect>) যাচাই
const c2FigOrig = a02P0.bands[20].cells[2].items[0];
assert(c2FigOrig._a02VertBraceFig === true && c2FigOrig.cropLR === 18204, 'a02: Band 20-এর উল্লম্ব বন্ধনী চিত্রে _a02VertBraceFig ও cropLR সক্রিয়');
const c2FigItem = Object.assign({}, c2FigOrig, { _a02VertBraceFig: true, image: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=', pxW: 74, pxH: 392 } });
const c2FigXml = DocxBuilder.paraXml(c2FigItem, 0, { media: [] });
assert(c2FigXml.includes('<a:srcRect l="18204" t="0" r="18204" b="0"/>') || c2FigXml.includes('<a:srcRect'), 'a02 XML: উল্লম্ব বন্ধনী চিত্রে সাদা মার্জিন ক্রপ (<a:srcRect>) উপস্থিত');

// a16 পাতা ৩: বাহ্যিক বাম খাড়া রেখা (85.7pt), ছক প্রস্থ (453.9pt) ও পার্শ্ব-ফুটার (y0 = 701pt)
const a16P3 = onA16.ir.pages[2];
const a16P3Tbl = a16P3.bands[2].cells[0].items[0];
assert(a16P3.margins.left === 85.7, 'a16 পাতা ৩: বাম মার্জিন ৮৫.৭pt-এ প্রান্তিককৃত');
assert(a16P3Tbl.widthPt === 453.9 && r1(a16P3Tbl.rect.x) === 85.7, 'a16 পাতা ৩: চেকলিস্ট ছকের বাম প্রান্ত ৮৫.৭pt ও প্রস্থ ৪৫৩.৯pt');
assert(a16P3Tbl.indentPt === 0, 'a16 পাতা ৩: চেকলিস্ট ছকের ইনডেন্ট ০pt');
assert(JSON.stringify(a16P3Tbl.colWidthsPt) === JSON.stringify([46.5, 274.2, 29.3, 25, 38.9, 40]), 'a16 পাতা ৩: কলাম-প্রস্থগুলো মাপা ৭টি খাড়া দাগের ব্যবধানের সমান ও যোগফল ৪৫৩.৯pt');
assert(a16P3.bands[3].y0 === 701 && a16P3.bands[3].y1 === 728.9, 'a16 পাতা ৩: নিচের যৌথ গ্রিড ব্যান্ড y0=701pt-এ স্থির (৭৫২pt-এ নেমে যায়নি)');

// ৩) প্রাক-নির্মিত ir.json-এর ওপর ডাইনামিক টগল (ON -> OFF) যাচাই
setBaseSwitches();
globalThis.__FZ_ON_RULESFIX = true;
const dynA02 = JSON.parse(a02GoldenIrRaw);
const dynA16 = JSON.parse(a16GoldenIrRaw);
LayoutIR.repairRulesFixIr(dynA02);
LayoutIR.repairRulesFixIr(dynA16);
assert(dynA02.pages[0].bands[20].cells[2].items[0].cropLR === 18204, 'প্রাক-নির্মিত a02 ir.json: RULESFIX চালু করলে উল্লম্ব বন্ধনী চিত্রে cropLR=18204 যুক্ত');
assert(dynA16.pages[2].bands[2].cells[0].items[0].widthPt === 453.9, 'প্রাক-নির্মিত a16 ir.json: RULESFIX চালু করলে পাতা ৩ ছক প্রস্থ ৪৫৩.৯pt');

globalThis.__FZ_ON_RULESFIX = false;
LayoutIR.repairRulesFixIr(dynA02);
LayoutIR.repairRulesFixIr(dynA16);
assert(JSON.stringify(dynA02) === JSON.stringify(JSON.parse(a02GoldenIrRaw)), 'প্রাক-নির্মিত a02 ir.json: RULESFIX পুনরায় বন্ধ করলে বাইট-টু-বাইট পূর্বাবস্থায় প্রত্যাবর্তন');
assert(JSON.stringify(dynA16) === JSON.stringify(JSON.parse(a16GoldenIrRaw)), 'প্রাক-নির্মিত a16 ir.json: RULESFIX পুনরায় বন্ধ করলে বাইট-টু-বাইট পূর্বাবস্থায় প্রত্যাবর্তন');

// ৪) সব ছকে প্রতি সারির প্রস্থের যোগফল = টেবিলের প্রস্থ এবং সব সারির কলাম-সীমা একই গ্রিডে থাকার কঠোর শর্ত যাচাই
setBaseSwitches();
globalThis.__FZ_ON_RULESFIX = true;
verifyIrTableInvariants(onA02.ir, 'a02 IR');
verifyIrTableInvariants(onA16.ir, 'a16 IR');
verifyIrTableInvariants(onA03.ir, 'a03 IR');
verifyIrTableInvariants(onA18.ir, 'a18 IR');
verifyXmlTableGridInvariants(onA02.xml, 'a02 XML');
verifyXmlTableGridInvariants(onA16.xml, 'a16 XML');
verifyXmlTableGridInvariants(onA03.xml, 'a03 XML');
verifyXmlTableGridInvariants(onA18.xml, 'a18 XML');

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
