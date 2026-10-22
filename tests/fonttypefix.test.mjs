/**
 * FONT_TYPE_v3 — ফন্ট-আকার, লাইন-উচ্চতা, কালি-উচ্চতা (|h - hOurs| >= 3) ও ছকের কলাম-প্রস্থ রাউন্ডিং বণ্টন পরীক্ষা
 * সুইচ: __FZ_ON_FONTTYPEFIX / FZ_ON=FONTTYPEFIX (বন্ধ: __FZ_OFF_FONTTYPEFIX / FZ_OFF=FONTTYPEFIX)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ভিত্তি সুইচসমূহ নাম ধরে চালু করা (switch-defaults.js require না করে)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT',
  'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4',
  'RULES2', 'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX', 'A02FIX',
  'A06FIX', 'A07FIX6', 'F1FIX', 'A18FIX', 'A08FIX', 'A16FIX6', 'F1FIX2',
  'INDENTFIX', 'VGAPFIX', 'SERIALFIX', 'MISSINGFIX', 'SHORTFIX', 'RULESFIX'
];

function resetBaseSwitches() {
  for (const k of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + k] = true;
    delete globalThis['__FZ_OFF_' + k];
  }
  delete globalThis.__FZ_ON_FONTFIX;
  delete globalThis.__FZ_OFF_FONTFIX;
  delete globalThis.__FZ_ON_FONTTYPEFIX;
  delete globalThis.__FZ_OFF_FONTTYPEFIX;
}

resetBaseSwitches();

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

let passed = 0;
let failed = 0;

function check(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error('ব্যর্থ:', msg);
  }
}

const r1 = (v) => Math.round(v * 10) / 10;

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function getDocxXml(ir) {
  const res = DB.bodyXml(ir);
  return typeof res === 'string' ? res : (res && res.xml) || '';
}

function findExistingIrPath(doc) {
  const candidates = [
    `qa/golden-data/runs/RULESFIX/${doc}/ir.json`,
    `qa/golden-data/asis/${doc}/ir.json`
  ];
  for (const rel of candidates) {
    if (fs.existsSync(path.join(ROOT, rel))) return rel;
  }
  return null;
}

function serializeIr(ir) {
  return JSON.stringify(ir);
}

function verifyTableInvariants(ir, xml, label) {
  let irTables = 0;
  for (const page of ir.pages || []) {
    for (const band of page.bands || []) {
      for (const cell of band.cells || []) {
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'table' || it.borderless) continue;
          irTables++;
          const rows = it.rows || [];
          const nCols = Math.max(0, ...rows.map((r) => (Array.isArray(r) ? r.length : 0)));
          check(rows.length >= 1 && nCols >= 1, `${label} p${page.page}: IR ছকের সারি ও কলাম সংখ্যা বৈধ`);

          if (Array.isArray(it.colWidthsPt) && it.colWidthsPt.length > 0 && it.widthPt > 0) {
            const colSum = r1(it.colWidthsPt.reduce((a, b) => a + b, 0));
            const wPt = r1(it.widthPt);
            check(
              Math.abs(colSum - wPt) < 0.05,
              `${label} page ${page.page} IR table: colWidthsPt sum (${colSum}) == widthPt (${wPt})`
            );
          }

          if (Array.isArray(it.cells) && it.cells.length > 0 && Array.isArray(it.colWidthsPt) && it.colWidthsPt.length > 0) {
            const mCols = it.colWidthsPt.length;
            const gridEdges = [0];
            for (let k = 0; k < mCols; k++) {
              gridEdges.push(r1(gridEdges[k] + it.colWidthsPt[k]));
            }
            const totalW = gridEdges[mCols];
            for (let ri = 0; ri < it.cells.length; ri++) {
              const cRow = it.cells[ri] || [];
              let rowW = 0;
              let colCursor = 0;
              let edgesMatch = true;
              for (let ci = 0; ci < cRow.length; ci++) {
                const cObj = cRow[ci];
                if (!cObj || !(cObj.span > 0)) continue;
                rowW = r1(rowW + (cObj.widthPt || 0));
                colCursor += cObj.span;
                const expectedEdge = gridEdges[Math.min(mCols, colCursor)];
                if (Math.abs(rowW - expectedEdge) > 0.25) edgesMatch = false;
              }
              check(
                Math.abs(rowW - totalW) <= 0.25 && edgesMatch,
                `${label} p${page.page} r${ri}: প্রতিটি সারিতে ঘরের প্রস্থের যোগফল (${rowW}) = টেবিলের প্রস্থ (${totalW}) ও কলাম-সীমা একই গ্রিডে`
              );
            }
          }
        }
      }
    }
  }

  if (typeof xml === 'string' && xml.length > 0) {
    const topTbls = [];
    const tblTokRe = /<\/?w:tbl\b[^>]*>/g;
    let depth = 0;
    let startIdx = -1;
    let tok;
    while ((tok = tblTokRe.exec(xml)) !== null) {
      if (tok[0].startsWith('</')) {
        depth--;
        if (depth === 0 && startIdx >= 0) {
          topTbls.push(xml.slice(startIdx, tok.index + tok[0].length));
          startIdx = -1;
        }
      } else {
        if (depth === 0) startIdx = tok.index;
        depth++;
      }
    }
    check(topTbls.length >= irTables, `${label}: DOCX-এ কোনো উৎস ছক ভাঙা বা হারানো হয়নি (${topTbls.length} >= ${irTables})`);

    topTbls.forEach((tXml, ti) => {
      const stripNested = (s) => {
        let out = '';
        let d = 0;
        let last = 0;
        const re = /<\/?w:tbl\b[^>]*>/g;
        let m;
        while ((m = re.exec(s)) !== null) {
          if (!m[0].startsWith('</')) {
            if (d === 1) out += s.slice(last, m.index);
            d++;
          } else {
            d--;
            if (d === 1) last = m.index + m[0].length;
          }
        }
        out += s.slice(last);
        return out;
      };
      const outerXml = stripNested(tXml);
      const tblWM = /<w:tblW w:w="(\d+)"/.exec(outerXml);
      const gridM = /<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/.exec(outerXml);
      if (!tblWM || !gridM) return;
      const tblW = Number(tblWM[1]);
      const gridCols = [...gridM[1].matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]));
      const gridSum = gridCols.reduce((a, b) => a + b, 0);
      check(gridSum === tblW, `${label} tbl#${ti}: DOCX gridCol যোগফল (${gridSum}) == tblW (${tblW})`);

      const gridBounds = [0];
      gridCols.forEach((w) => gridBounds.push(gridBounds[gridBounds.length - 1] + w));

      const trMatches = [...outerXml.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)];
      trMatches.forEach((trM, ri) => {
        const tcMatches = [...trM[1].matchAll(/<w:tcPr>([\s\S]*?)<\/w:tcPr>/g)];
        let rowTw = 0;
        let colIdx = 0;
        let aligned = true;
        tcMatches.forEach((tcM) => {
          const wM = /<w:tcW w:w="(\d+)"/.exec(tcM[1]);
          const spM = /<w:gridSpan w:val="(\d+)"/.exec(tcM[1]);
          const w = wM ? Number(wM[1]) : 0;
          const sp = spM ? Number(spM[1]) : 1;
          rowTw += w;
          colIdx += sp;
          if (gridBounds[colIdx] !== rowTw) aligned = false;
        });
        check(rowTw === tblW && aligned, `${label} tbl#${ti} tr#${ri}: সারির ঘরের প্রস্থের যোগফল (${rowTw}) == টেবিলের প্রস্থ (${tblW})`);
      });
    });
  }
}

// ============================================================================
// ১. সুইচ নিয়ন্ত্রণ পরীক্ষা (__FZ_ON_FONTTYPEFIX ও __FZ_OFF_FONTTYPEFIX)
// ============================================================================
resetBaseSwitches();
check(IR.fontTypeFixOn() === false, 'ডিফল্ট অবস্থায় IR.fontTypeFixOn() বন্ধ');
check(LF.isFontTypeFixOn() === false, 'ডিফল্ট অবস্থায় LF.isFontTypeFixOn() বন্ধ');
check(DB.fontTypeFixOn() === false, 'ডিফল্ট অবস্থায় DB.fontTypeFixOn() বন্ধ');

globalThis.__FZ_ON_FONTTYPEFIX = true;
check(IR.fontTypeFixOn() === true, '__FZ_ON_FONTTYPEFIX=true হলে IR.fontTypeFixOn() চালু');
check(LF.isFontTypeFixOn() === true, '__FZ_ON_FONTTYPEFIX=true হলে LF.isFontTypeFixOn() চালু');
check(DB.fontTypeFixOn() === true, '__FZ_ON_FONTTYPEFIX=true হলে DB.fontTypeFixOn() চালু');

globalThis.__FZ_OFF_FONTTYPEFIX = true;
check(IR.fontTypeFixOn() === false, '__FZ_OFF_FONTTYPEFIX=true দিলে পুনরায় IR.fontTypeFixOn() বন্ধ');
check(LF.isFontTypeFixOn() === false, '__FZ_OFF_FONTTYPEFIX=true দিলে পুনরায় LF.isFontTypeFixOn() বন্ধ');
check(DB.fontTypeFixOn() === false, '__FZ_OFF_FONTTYPEFIX=true দিলে পুনরায় DB.fontTypeFixOn() বন্ধ');

// ============================================================================
// ২. নমুনা ১ (a14 পাতা ২): জোড়া প্রত্যয়ন-বাক্স ছকে colWidthsPt sum (456.5) == widthPt (456.5)
// ============================================================================
{
  resetBaseSwitches();
  const makeA14Page2Mock = () => ({
    pages: [
      {
        page: 2,
        widthPt: 595.3,
        heightPt: 841.9,
        margins: { top: 21.6, right: 18, bottom: 21.6, left: 57.6 },
        bodyFontPt: 11.5,
        bands: [
          {
            kind: 'flow',
            y0: 539.8,
            y1: 751.3,
            gapBeforePt: 10,
            cells: [
              {
                x0: 57.6,
                x1: 577.3,
                items: [
                  {
                    kind: 'table',
                    borderless: false,
                    widthPt: 457.3,
                    heightPt: 211.5,
                    fontPt: 9,
                    cellFontSrc: 9,
                    boxSplitCollapsed: true,
                    rect: { x: 57.6, y: 539.8, w: 457.3, h: 211.5 },
                    srcRulesPt: [539.8, 633.8, 636.8, 751.3],
                    rows: [
                      ['প্রত্যয়ন পত্র', ''],
                      ['প্রত্যয়ন করা যাইতেছে যে, ..........................................', ''],
                      ['পিতা ...................................................................', ''],
                      ['অধ্যক্ষের স্বাক্ষর', 'তারিখ ................'],
                      ['প্রত্যয়ন পত্র (২য় অংশ)', ''],
                      ['প্রত্যয়ন করা যাইতেছে যে, ..........................................', ''],
                      ['মাতা ...................................................................', ''],
                      ['অধ্যক্ষের স্বাক্ষর', 'তারিখ ................']
                    ],
                    rowHeightsPt: [20, 24, 24, 26, 25, 28, 30, 34.5]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  });

  // ক) TBLMERGE -> A14FIX3 -> A14RULES পাইপলাইনে colWidthsPt sum == widthPt (456.5) যাচাই
  const irPipe = makeA14Page2Mock();
  IR.repairTblMergeIr(irPipe);
  IR.repairA14Fix3Ir(irPipe);
  IR.repairA14RulesIr(irPipe);
  const tblPipe = irPipe.pages[0].bands[0].cells[0].items[0];
  const sumPipe = r1(tblPipe.colWidthsPt.reduce((a, b) => a + b, 0));
  check(
    tblPipe.widthPt === 456.5 && sumPipe === 456.5,
    `a14 page 2 IR table (pipeline): colWidthsPt sum (${sumPipe}) == widthPt (${tblPipe.widthPt})`
  );
  verifyTableInvariants(irPipe, getDocxXml(irPipe), 'a14-p2-pipe');

  // খ) প্রাক-নির্মিত IR-এ (যেখানে colWidthsPt sum = 457.3 এবং widthPt = 456.5) FONTFIX ও FONTTYPEFIX যাচাই
  const makePrebuiltStaleA14P2 = () => {
    const ir = makeA14Page2Mock();
    IR.repairTblMergeIr(ir);
    IR.repairA14Fix3Ir(ir);
    const t = ir.pages[0].bands[0].cells[0].items[0];
    t.widthPt = 456.5;
    t.colWidthsPt = [228.7, 228.6];
    return ir;
  };

  // FONTFIX চালু অবস্থায়
  resetBaseSwitches();
  globalThis.__FZ_ON_FONTFIX = true;
  const irFf = makePrebuiltStaleA14P2();
  IR.repairFontFixIr(irFf);
  const tblFf = irFf.pages[0].bands[0].cells[0].items[0];
  const sumFf = r1(tblFf.colWidthsPt.reduce((a, b) => a + b, 0));
  check(
    sumFf === 456.5 && tblFf.widthPt === 456.5,
    `a14 page 2 IR table (FONTFIX): colWidthsPt sum (${sumFf}) == widthPt (${tblFf.widthPt})`
  );

  // FONTTYPEFIX চালু ও বন্ধ অবস্থায়
  resetBaseSwitches();
  const irFtx = makePrebuiltStaleA14P2();
  const snapBeforeFtx = serializeIr(irFtx);
  globalThis.__FZ_ON_FONTTYPEFIX = true;
  IR.repairFontTypeFixIr(irFtx);
  const tblFtx = irFtx.pages[0].bands[0].cells[0].items[0];
  const sumFtx = r1(tblFtx.colWidthsPt.reduce((a, b) => a + b, 0));
  check(
    sumFtx === 456.5 && tblFtx.widthPt === 456.5,
    `a14 page 2 IR table (FONTTYPEFIX): colWidthsPt sum (${sumFtx}) == widthPt (${tblFtx.widthPt})`
  );
  verifyTableInvariants(irFtx, '', 'a14-p2-ftx');

  globalThis.__FZ_OFF_FONTTYPEFIX = true;
  IR.repairFontTypeFixIr(irFtx);
  check(
    serializeIr(irFtx) === snapBeforeFtx,
    'a14 page 2 IR table: FONTTYPEFIX বন্ধ করলে প্রাক-নির্মিত IR বাইট-টু-বাইট পূর্বাবস্থায় ফিরে আসে'
  );
}

// যদি ডিস্কে আসল a14/ir.json থাকে তবে সেটিতেও সরাসরি যাচাই
{
  const a14Rel = findExistingIrPath('a14');
  if (a14Rel) {
    resetBaseSwitches();
    const irOff = loadJson(a14Rel);
    LF.fit(irOff);
    const snapOff = serializeIr(irOff);
    const xmlOff = getDocxXml(loadJson(a14Rel));

    globalThis.__FZ_ON_FONTTYPEFIX = true;
    const irOn = loadJson(a14Rel);
    LF.fit(irOn);
    const xmlOn = getDocxXml(loadJson(a14Rel));
    verifyTableInvariants(irOn, xmlOn, 'a14');

    globalThis.__FZ_OFF_FONTTYPEFIX = true;
    IR.repairFontTypeFixIr(irOn);
    const xmlRestored = getDocxXml(loadJson(a14Rel));
    check(serializeIr(irOn) === snapOff, 'a14: সুইচ বন্ধ করলে IR বাইট-টু-বাইট অপরিবর্তিত');
    check(xmlRestored === xmlOff, 'a14: সুইচ বন্ধ করলে DOCX XML বাইট-টু-বাইট অপরিবর্তিত');
  }
}

// ============================================================================
// ৩. নমুনা ২ (a07): পাতা ৩ ছক-৩ ও পাতা ৪ ছক-৪ ফন্ট ও লাইন-পিচ পুনরুদ্ধার এবং বাইট-টু-বাইট অভিন্নতা
// ============================================================================
{
  const a07Rel = findExistingIrPath('a07');
  check(!!a07Rel, 'a07 গোল্ডেন IR ফাইল বিদ্যমান');
  if (a07Rel) {
    resetBaseSwitches();
    const irOff = loadJson(a07Rel);
    LF.fit(irOff);
    const snapOff = serializeIr(irOff);
    const xmlOff = getDocxXml(loadJson(a07Rel));

    const p3TblOff = irOff.pages[2].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((x) => x.kind === 'table');
    const p4TblOff = irOff.pages[3].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((x) => x.kind === 'table');
    check(p3TblOff && p3TblOff.fontPt === 12, 'a07 পাতা ৩ ছক-৩: সুইচ বন্ধ থাকলে ফন্ট ১২pt');
    check(p4TblOff && p4TblOff._a07MultiLinePitch === 15.6, 'a07 পাতা ৪ ছক-৪: সুইচ বন্ধ থাকলে লাইন-পিচ ১৫.৬pt');

    // সুইচ চালু করলে প্রত্যাশিত পরিবর্তন
    globalThis.__FZ_ON_FONTTYPEFIX = true;
    const irOn = loadJson(a07Rel);
    LF.fit(irOn);
    const xmlOn = getDocxXml(loadJson(a07Rel));

    const p3TblOn = irOn.pages[2].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((x) => x.kind === 'table');
    const p4TblOn = irOn.pages[3].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((x) => x.kind === 'table');
    check(p3TblOn && p3TblOn.fontPt === 11 && p3TblOn._a07MultiLinePitch === 15.4, 'a07 পাতা ৩ ছক-৩: সুইচ চালু থাকলে ফন্ট ১১pt ও লাইন-পিচ ১৫.৪pt');
    check(p4TblOn && p4TblOn.fontPt === 12.5 && p4TblOn._a07MultiLinePitch === 16.5, 'a07 পাতা ৪ ছক-৪: সুইচ চালু থাকলে ফন্ট ১২.৫pt ও লাইন-পিচ ১৬.৫pt');
    check(xmlOn !== xmlOff, 'a07: সুইচ চালু থাকলে DOCX XML-এ প্রত্যাশিত পরিবর্তন ঘটে');
    check(xmlOn.includes('w:line="308" w:lineRule="exact"'), 'a07 পাতা ৩ ছক-৩: DOCX-এ ১৫.৪pt (308 twips) লাইন-পিচ প্রয়োগ হয়েছে');
    verifyTableInvariants(irOn, xmlOn, 'a07');

    // সুইচ পুনরায় বন্ধ করলে বাইট-টু-বাইট অভিন্নতা
    globalThis.__FZ_OFF_FONTTYPEFIX = true;
    IR.repairFontTypeFixIr(irOn);
    const xmlRestored = getDocxXml(loadJson(a07Rel));
    check(serializeIr(irOn) === snapOff, 'a07: সুইচ বন্ধ করলে IR বাইট-টু-বাইট অপরিবর্তিত');
    check(xmlRestored === xmlOff, 'a07: সুইচ বন্ধ করলে DOCX XML বাইট-টু-বাইট অপরিবর্তিত');
  }
}

// ============================================================================
// ৪. নমুনা ৩ (a14 পাতা ১ ও পাতা ৩, a13 পাতা ১, a03 পাতা ২): জ্যামিতিক নিয়ম যাচাই
// ============================================================================
{
  resetBaseSwitches();
  const makeMockMultiPageIr = () => ({
    pages: [
      // পাতা ১: দ্বি-স্তর ভাসমান স্বাক্ষর-চিত্র ও বাম ৩-লাইন প্রাপক ব্লক (a14 পাতা ১ জ্যামিতি)
      {
        page: 1,
        widthPt: 595.3,
        heightPt: 841.9,
        margins: { top: 21.6, right: 18, bottom: 21.6, left: 57.6 },
        bodyFontPt: 14,
        bands: [
          {
            kind: 'flow',
            y0: 610,
            y1: 745,
            gapBeforePt: 10,
            cells: [
              {
                x0: 57.6,
                x1: 577.3,
                items: [
                  { kind: 'figure', widthPt: 80, heightPt: 40, rect: { x: 380, y: 610, w: 80, h: 40 }, floatAt: { x: 380, y: 610 } },
                  { kind: 'figure', widthPt: 75, heightPt: 42.5, rect: { x: 361.8, y: 702.5, w: 75, h: 42.5 }, floatAt: { x: 361.8, y: 702.5 } }
                ]
              }
            ]
          },
          {
            kind: 'grid',
            y0: 656.8,
            y1: 756.7,
            gapBeforePt: 0,
            cells: [
              {
                x0: 57.6,
                x1: 310,
                items: [
                  {
                    kind: 'para',
                    type: 'paragraph',
                    fontPt: 15,
                    firstIndentPt: -24,
                    indentPt: 24,
                    lineSpacingPt: 16.5,
                    lineRule: 'exact',
                    rect: { x: 57.6, y: 713.5, w: 220, h: 43.2 },
                    lines: ['১। প্রথম লাইন', '২য় লাইন', '৩য় লাইন']
                  }
                ]
              },
              {
                x0: 310,
                x1: 577.3,
                items: [
                  {
                    kind: 'para',
                    type: 'signature',
                    align: 'c',
                    fontPt: 14,
                    rect: { x: 330, y: 656.8, w: 200, h: 68 },
                    lines: ['স্বাক্ষরকারী', 'পদবি', 'কার্যালয়', 'তারিখ']
                  }
                ]
              }
            ]
          },
          {
            kind: 'flow',
            y0: 786,
            y1: 793,
            gapBeforePt: 29.3,
            cells: [
              {
                x0: 57.6,
                x1: 577.3,
                items: [{ kind: 'para', type: 'footer', fontPt: 7, rect: { x: 57.6, y: 786, w: 200, h: 7 }, lines: ['footer'] }]
              }
            ]
          }
        ]
      },
      // পাতা ২: কোলন-ট্যাব দ্বৈত-চরম ফলা/রেফ আইটেম (a13 পাতা ১ জ্যামিতি) ও কালো ব্যানার (a03 পাতা ২ জ্যামিতি)
      {
        page: 2,
        widthPt: 595.3,
        heightPt: 841.9,
        margins: { top: 36, right: 36, bottom: 36, left: 54 },
        bodyFontPt: 11,
        boxes: [{ id: 1, x0: 48, x1: 548, y0: 270, y1: 500, sz: 6, dashed: false }],
        bands: [
          {
            kind: 'flow',
            y0: 276,
            y1: 290,
            gapBeforePt: 10,
            cells: [
              {
                x0: 54,
                x1: 540,
                items: [
                  {
                    kind: 'para',
                    type: 'heading',
                    shade: '000000',
                    color: 'FFFFFF',
                    fontPt: 12,
                    rect: { x: 54, y: 276, w: 480, h: 12 },
                    lines: ['শিরোনাম ব্যানার']
                  }
                ]
              }
            ]
          },
          {
            kind: 'flow',
            y0: 297,
            y1: 310,
            gapBeforePt: 7,
            cells: [
              {
                x0: 54,
                x1: 540,
                items: [
                  {
                    kind: 'para',
                    type: 'paragraph',
                    fontPt: 11,
                    tabLines: [['ক। বর্তমান কর্মস্থলে যোগদানের তারিখ', ':', '০১/০১/২০২৫']],
                    tabStops: [180, 195],
                    diag: { ratio: 0.85, estPt: 13.0, inkPt: 10.5 },
                    rect: { x: 54, y: 297, w: 420, h: 10.5 },
                    lines: ['ক। বর্তমান কর্মস্থলে যোগদানের তারিখ\t:\t০১/০১/২০২৫']
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  });

  const irBase = makeMockMultiPageIr();
  const snapOff = serializeIr(irBase);
  const xmlOff = getDocxXml(makeMockMultiPageIr());

  globalThis.__FZ_ON_FONTTYPEFIX = true;
  const irOn = makeMockMultiPageIr();
  IR.repairFontTypeFixIr(irOn);

  const p1Left = irOn.pages[0].bands[1].cells[0].items[0];
  const p1Fig1 = irOn.pages[0].bands[0].cells[0].items[1];
  const p2Banner = irOn.pages[1].bands[0].cells[0].items[0];
  const p2TabIt = irOn.pages[1].bands[1].cells[0].items[0];

  check(p1Left.lineSpacingPt === 17.5 && p1Fig1.heightPt === 44.5, 'পাতা ১: দ্বি-স্তর ভাসমান স্বাক্ষর ও বাম ৩-লাইন প্রাপক ব্লকের উচ্চতা ৪৪.৫pt ও পিচ ১৭.৫pt');
  check(p2Banner.lineSpacingPt === 16.8 && p2Banner.lineRule === 'exact', 'পাতা ২: কালো ব্যানারে +৩pt নিম্ন-প্যাডিংসহ ১৬.৮pt exact লাইন-উচ্চতা');
  check(p2TabIt._fontTypeLabelFontPt === 9.5 && p2TabIt._fontTypeLabelCharSpacingPt === 0.3, 'পাতা ২: কোলন-ট্যাব সারির প্রথম সেগমেন্টে ৯.৫pt ফন্ট ও +০.৩pt অক্ষর-ফাঁক');

  const xmlOn = getDocxXml(makeMockMultiPageIr());
  check(xmlOn !== xmlOff, 'মক নমুনায় সুইচ চালু থাকলে DOCX XML পরিবর্তিত হয়');

  globalThis.__FZ_OFF_FONTTYPEFIX = true;
  IR.repairFontTypeFixIr(irOn);
  const xmlRestored = getDocxXml(makeMockMultiPageIr());
  check(serializeIr(irOn) === snapOff, 'মক নমুনায় সুইচ বন্ধ করলে IR বাইট-টু-বাইট অপরিবর্তিত');
  check(xmlRestored === xmlOff, 'মক নমুনায় সুইচ বন্ধ করলে DOCX XML বাইট-টু-বাইট অপরিবর্তিত');
}

// ============================================================================
// ৫. সংযুক্ত সকল গোল্ডেন ডেটাসেট (a17, a10, a19, a05, a04) এবং ছক-অভিন্নতা যাচাই
// ============================================================================
for (const doc of ['a17', 'a10', 'a19', 'a05', 'a04']) {
  const rel = findExistingIrPath(doc);
  if (!rel) continue;
  resetBaseSwitches();
  const irOff = loadJson(rel);
  LF.fit(irOff);
  const snapOff = serializeIr(irOff);
  const xmlOff = getDocxXml(loadJson(rel));

  globalThis.__FZ_ON_FONTTYPEFIX = true;
  const irOn = loadJson(rel);
  LF.fit(irOn);
  const xmlOn = getDocxXml(loadJson(rel));
  verifyTableInvariants(irOn, xmlOn, doc);

  globalThis.__FZ_OFF_FONTTYPEFIX = true;
  IR.repairFontTypeFixIr(irOn);
  const xmlRestored = getDocxXml(loadJson(rel));
  check(serializeIr(irOn) === snapOff, `${doc}: সুইচ বন্ধ করলে IR বাইট-টু-বাইট অপরিবর্তিত`);
  check(xmlRestored === xmlOff, `${doc}: সুইচ বন্ধ করলে DOCX XML বাইট-টু-বাইট অপরিবর্তিত`);
}

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
