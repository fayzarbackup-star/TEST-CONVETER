import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ভিত্তি সুইচগুলো নাম ধরে সক্রিয়করণ (switch-defaults.js require না করে)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT',
  'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4',
  'RULES2', 'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX', 'A02FIX',
  'A06FIX', 'A07FIX6', 'F1FIX', 'A18FIX', 'A08FIX', 'A16FIX6', 'F1FIX2',
  'TABLECOL', 'EXTRALINES', 'A10LINES', 'P1LOSS', 'A01FIX', 'P2DRIFT', 'RULEFIX',
  'A17FIX', 'A14FIX', 'A07FIX', 'A19FIX', 'A11FIX', 'A10FIX', 'LINEGAP',
  'ROTTEXT', 'INDENT', 'FONTFIX', 'A03FIX3', 'A03FIX4', 'FORMKIT', 'PAGES4'
];

function setBaseSwitches() {
  for (const k of Object.keys(globalThis)) {
    if (k.startsWith('__FZ_ON_') || k.startsWith('__FZ_OFF_')) {
      delete globalThis[k];
    }
  }
  for (const name of BASE_SWITCHES) {
    globalThis[`__FZ_ON_${name}`] = true;
  }
}

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

// মূল অপরিবর্তিত রেফারেন্স আউটপুট তৈরি (RULESFIX সম্পূর্ণ নিষ্ক্রিয় অবস্থায়)
const a02Meas = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/runs/S26_3b93d252/a02/measures.json'), 'utf8'));
const a16Meas = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a16/measures.json'), 'utf8'));
const a02GoldenIrRaw = fs.readFileSync(path.join(ROOT, 'qa/golden-data/runs/S26_3b93d252/a02/ir.json'), 'utf8');
const a16GoldenIrRaw = fs.readFileSync(path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a16/ir.json'), 'utf8');

function runPipeline(meas) {
  const mClone = JSON.parse(JSON.stringify(meas));
  const ir = LayoutIR.build(mClone);
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
          if (!it || it.kind !== 'table' || !Array.isArray(it.rows) || it.rows.length === 0) continue;
          const nCols = Math.max(...it.rows.map((r) => r.length));
          if (nCols < 2) continue;
          const wPt = r1(it.widthPt);
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

setBaseSwitches();
globalThis.__FZ_ON_RULESFIX = false;
const offA02 = runPipeline(a02Meas);
const offA16 = runPipeline(a16Meas);
assert(offA02.irJson === baseA02.irJson, 'a02: সুইচ বন্ধ থাকলে IR বাইট-টু-বাইট অভিন্ন');
assert(offA02.xml === baseA02.xml, 'a02: সুইচ বন্ধ থাকলে DOCX XML বাইট-টু-বাইট অভিন্ন');
assert(offA16.irJson === baseA16.irJson, 'a16: সুইচ বন্ধ থাকলে IR বাইট-টু-বাইট অভিন্ন');
assert(offA16.xml === baseA16.xml, 'a16: সুইচ বন্ধ থাকলে DOCX XML বাইট-টু-বাইট অভিন্ন');

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

// পাতা-সংখ্যা অপরিবর্তিত
assert(onA02.ir.pages.length === 1, 'a02: পাতা-সংখ্যা অপরিবর্তিত (১ পাতা)');
assert(onA16.ir.pages.length === 9, 'a16: পাতা-সংখ্যা অপরিবর্তিত (৯ পাতা)');

// a02: পারিবারিক ছক (Band 17) ৩ সারি × ৫ কলামের পূর্ণ নিয়মিত গ্রিড, কৃত্রিম বর্ডার লোপ নেই, শিরোনামের প্রকৃত ছায়া C0BCC7 রক্ষিত
const a02FamilyTbl = onA02.ir.pages[0].bands[17].cells[0].items[0];
assert(a02FamilyTbl.kind === 'table', 'a02: Band 17 একটি একক ছক');
assert(a02FamilyTbl.rows.length === 3 && a02FamilyTbl.rows[0].length === 5, 'a02: পারিবারিক ছক ৩ সারি × ৫ কলামের পূর্ণ নিয়মিত গ্রিড');
assert(a02FamilyTbl.headShade === 'C0BCC7', 'a02: পারিবারিক ছকের শিরোনাম সারির মাপা ছায়া C0BCC7 রক্ষিত');
assert(a02FamilyTbl.vRuleBands === null && a02FamilyTbl.rowBand === null && a02FamilyTbl.vMerges === null, 'a02: পারিবারিক ছকে কৃত্রিম উপ-সারি/উপ-কলাম বা খোলা বর্ডার নেই');
assert(JSON.stringify(a02FamilyTbl.rowHeightsPt) === JSON.stringify([30.2, 30.4, 30.4]), 'a02: পারিবারিক ছকের ৩টি সারির উচ্চতা [30.2, 30.4, 30.4]');
assert(onA02.xml.includes('w:fill="C0BCC7"'), 'a02 XML: শিরোনাম সারিতে w:fill="C0BCC7" উপস্থিত');
const a02TopTables = parseTopLevelTables(onA02.xml);
assert(a02TopTables.length === 4, 'a02 XML: ৪টি উৎস ছকের জন্য ঠিক ৪টি <w:tbl> (কোনো ছক টুকরো হয়নি)');
assert(!a02TopTables[3].includes('<w:tcBorders>'), 'a02 XML: পারিবারিক ছকে কোনো ঘরের বর্ডার মুছে কলাম খোলা রাখা হয়নি');
const a02BodyRowShd = [...a02TopTables[3].matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)].slice(1).some((m) => m[1].includes('<w:shd'));
assert(!a02BodyRowShd, 'a02 XML: পারিবারিক ছকের বডি সারিতে কোনো বাড়তি ধূসর ছায়া (w:shd) নেই');

// a02: তলার ধূসর পাদটীকা বার (Band 25) ও উল্লম্ব বন্ধনী চিত্র (Band 20 c2Fig)
const a02FooterBar = onA02.ir.pages[0].bands[25].cells[0].items[0];
assert(a02FooterBar.lineSpacingPt === 16.7 && a02FooterBar.lineRule === 'exact', 'a02: পাদটীকা বারের লাইন-উচ্চতা ১৬.৭pt exact');
assert(onA02.xml.includes('<w:shd w:val="clear" w:color="auto" w:fill="C1BDC8"/><w:spacing w:before="0" w:after="0" w:line="334" w:lineRule="exact"/>'), 'a02 XML: পাদটীকা বার পূর্ণ ৩৩৪ dxa (১৬.৭pt) উচ্চতায় ছায়াযুক্ত');
let c2FigOrig = null; for (const b of onA02.ir.pages[0].bands) for (const c of b.cells || []) for (const it of c.items || []) if (it && it.kind === 'figure' && it.rect && it.rect.h > it.rect.w * 2.5) c2FigOrig = it;
const c2FigItem = Object.assign({}, c2FigOrig, { _a02VertBraceFig: true, image: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=', pxW: 74, pxH: 392 } });
const c2FigXml = DocxBuilder.paraXml(c2FigItem, 0, { media: [] });
assert(c2FigXml.includes('<a:srcRect l="34520" t="0" r="34520" b="0"/>') || c2FigXml.includes('<a:srcRect'), 'a02 XML: উল্লম্ব বন্ধনী চিত্রে সাদা মার্জিন ক্রপ (<a:srcRect>) উপস্থিত');

// a16 পাতা ৩: বাহ্যিক বাম খাড়া রেখা (85.7pt), ছক প্রস্থ (453.9pt) ও পার্শ্ব-ফুটার (y0 = 703.4pt)
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
assert(dynA02.pages[0].bands[17].cells[0].items[0].rows.length === 3, 'প্রাক-নির্মিত a02 ir.json: RULESFIX চালু করলে ৩×৫ নিয়মিত গ্রিড');
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
verifyXmlTableGridInvariants(onA02.xml, 'a02 XML');
verifyXmlTableGridInvariants(onA16.xml, 'a16 XML');

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
