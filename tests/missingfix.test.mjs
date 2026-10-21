/**
 * MISSING_TYPE_v1 — লেখা হারানো/বাড়তি লাইন ত্রুটির জ্যামিতিক ও কাঠামোগত সংস্কারের স্বয়ংসম্পূর্ণ অফলাইন টেস্ট
 * যাচাই করে:
 * ১) সুইচ বন্ধ থাকলে (__FZ_OFF_MISSINGFIX = true বা ডিফল্ট বন্ধ) IR ও DOCX XML বাইট-বাই-বাইট অপরিবর্তিত থাকে;
 * ২) সুইচ চালু করার পর পুনরায় বন্ধ করলে স্ন্যাপশট থেকে মূল IR ও DOCX XML হুবহু পুনরুদ্ধার হয়;
 * ৩) সুইচ চালু থাকলে (__FZ_ON_MISSINGFIX = true) ৬টি নথিতে (f1, a16, a14, a13, a06, a07) প্রত্যাশিত জ্যামিতিক সংস্কার ঘটে এবং পাতা-সংখ্যা অপরিবর্তিত থাকে;
 * ৪) প্রতিটি ছকে (<w:tbl>) সারির ঘরগুলোর প্রস্থের যোগফল (<w:tcW>) টেবিলের মোট প্রস্থের (<w:tblW>) সমান এবং সব সারিতে কলাম-সীমা একই গ্রিডে (<w:tblGrid>) আবদ্ধ থাকে;
 * ৫) অক্ষতিগ্রস্ত কাঠামোর নথিতে (যেমন a18, a08, a12, a01, a02, a03 ধাঁচের পাতা) সুইচ চালু থাকলেও কোনো অনাকাঙ্ক্ষিত পরিবর্তন ঘটে না।
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// switch-defaults.js require না করে প্রয়োজনীয় ভিত্তি-সুইচগুলো নাম ধরে চালু করা
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT',
  'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4',
  'RULES2', 'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX', 'A02FIX',
  'A06FIX', 'A07FIX6', 'F1FIX', 'A18FIX', 'A08FIX', 'A16FIX6', 'F1FIX2'
];

function setBaseSwitches() {
  for (const k of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + k] = true;
    delete globalThis['__FZ_OFF_' + k];
  }
}

function setMissingFix(on) {
  if (on) {
    globalThis.__FZ_ON_MISSINGFIX = true;
    delete globalThis.__FZ_OFF_MISSINGFIX;
  } else {
    delete globalThis.__FZ_ON_MISSINGFIX;
    globalThis.__FZ_OFF_MISSINGFIX = true;
  }
}

setBaseSwitches();
setMissingFix(false);

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

const GOLDEN_FILES = {
  f1: path.join(ROOT, 'qa/golden-data/runs/S28_d1eed75b/f1'),
  a16: path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a16'),
  a14: path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a14'),
  a13: path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a13'),
  a06: path.join(ROOT, 'qa/golden-data/runs/S26_3b93d252/a06'),
  a07: path.join(ROOT, 'qa/golden-data/runs/S25_18025270/a07')
};

function loadBundle(name) {
  const dir = GOLDEN_FILES[name];
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'measures.json'), 'utf8'));
  const irSnap = JSON.parse(fs.readFileSync(path.join(dir, 'ir.json'), 'utf8'));
  return { m, irSnap };
}

function measureFn(t, bold) {
  return String(t || '').length * (bold ? 52 : 50);
}

/**
 * XML থেকে সব শীর্ষ-স্তরের <w:tbl> ব্লক বের করে প্রতিটি টেবিলের গ্রিড ও কলাম-সীমা যাচাই
 */
function extractTopLevelTables(xml) {
  const tables = [];
  const tagRe = /<\/?w:tbl(?=\s|>)/g;
  let depth = 0;
  let startIdx = -1;
  let m;
  while ((m = tagRe.exec(xml)) !== null) {
    if (m[0] === '<w:tbl') {
      if (depth === 0) startIdx = m.index;
      depth++;
    } else {
      depth--;
      if (depth === 0 && startIdx >= 0) {
        tables.push(xml.slice(startIdx, m.index + '</w:tbl>'.length));
        startIdx = -1;
      }
    }
  }
  return tables;
}

function extractDirectRowsAndCells(tblXml) {
  // নেস্টেড টেবিলগুলো সাময়িকভাবে মাস্ক করে শুধু বর্তমান টেবিলের সরাসরি <w:tr> ও <w:tc> বিশ্লেষণ
  const inner = tblXml.replace(/^<w:tbl[^>]*>/, '').replace(/<\/w:tbl>$/, '');
  let masked = '';
  const tagRe = /<\/?w:tbl(?=\s|>)/g;
  let depth = 0;
  let lastIdx = 0;
  let m;
  while ((m = tagRe.exec(inner)) !== null) {
    if (m[0] === '<w:tbl') {
      if (depth === 0) masked += inner.slice(lastIdx, m.index);
      depth++;
    } else {
      depth--;
      if (depth === 0) lastIdx = m.index + '</w:tbl>'.length;
    }
  }
  if (depth === 0) masked += inner.slice(lastIdx);

  const tblWMatch = /<w:tblPr>[\s\S]*?<w:tblW\s+w:w="(\d+)"/.exec(masked);
  const tblW = tblWMatch ? Number(tblWMatch[1]) : 0;
  const gridMatch = /<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/.exec(masked);
  const gridCols = gridMatch
    ? [...gridMatch[1].matchAll(/<w:gridCol\s+w:w="(\d+)"\/>/g)].map((x) => Number(x[1]))
    : [];
  const rows = [...masked.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)].map((rm) => {
    const trBody = rm[1];
    const cells = [...trBody.matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)].map((cm) => {
      const tcPr = (/<w:tcPr>([\s\S]*?)<\/w:tcPr>/.exec(cm[1]) || [])[1] || '';
      const wMatch = /<w:tcW\s+w:w="(\d+)"/.exec(tcPr);
      const spanMatch = /<w:gridSpan\s+w:val="(\d+)"/.exec(tcPr);
      return {
        w: wMatch ? Number(wMatch[1]) : 0,
        span: spanMatch ? Number(spanMatch[1]) : 1,
        tcPr
      };
    });
    return cells;
  });
  return { tblW, gridCols, rows, masked };
}

function verifyTableInvariants(xml, label) {
  const tables = extractTopLevelTables(xml);
  check(tables.length > 0, `${label}: অন্তত একটি <w:tbl> থাকতে হবে`);
  for (let ti = 0; ti < tables.length; ti++) {
    const { tblW, gridCols, rows } = extractDirectRowsAndCells(tables[ti]);
    const gridSum = gridCols.reduce((a, b) => a + b, 0);
    check(gridCols.length >= 1 && Math.abs(gridSum - tblW) <= 2, `${label} tbl[${ti}]: tblGrid যোগফল (${gridSum}) === tblW (${tblW})`);
    const gridBounds = [];
    let acc = 0;
    for (const gw of gridCols) {
      acc += gw;
      gridBounds.push(acc);
    }
    for (let ri = 0; ri < rows.length; ri++) {
      const rCells = rows[ri];
      const rowSum = rCells.reduce((a, c) => a + c.w, 0);
      const spanSum = rCells.reduce((a, c) => a + c.span, 0);
      check(Math.abs(rowSum - tblW) <= 2, `${label} tbl[${ti}] row[${ri}]: ঘরের প্রস্থের যোগফল (${rowSum}) === tblW (${tblW})`);
      check(spanSum === gridCols.length, `${label} tbl[${ti}] row[${ri}]: কলাম স্প্যান যোগফল (${spanSum}) === মোট কলাম (${gridCols.length})`);
      let curBound = 0;
      let colIdx = 0;
      let allAligned = true;
      for (const c of rCells) {
        curBound += c.w;
        colIdx += c.span;
        const expectedBound = gridBounds[colIdx - 1];
        if (expectedBound == null || Math.abs(curBound - expectedBound) > 2) {
          allAligned = false;
        }
      }
      check(allAligned, `${label} tbl[${ti}] row[${ri}]: সব কলাম-সীমা tblGrid-এর সাথে হুবহু মিলেছে`);
    }
  }
}

// ১) সুইচ বন্ধ অবস্থায় (MISSINGFIX OFF) বাইট-বাই-বাইট অভিন্নতা এবং ON -> OFF রিস্টোর যাচাই
for (const name of Object.keys(GOLDEN_FILES)) {
  const { m } = loadBundle(name);
  setMissingFix(false);
  delete globalThis.__FZ_OFF_MISSINGFIX; // ডিফল্ট বন্ধ অবস্থা যাচাই
  check(!IR.missingFixOn() && !LF.isMissingFixOn() && !DB.missingFixOn(), `${name}: ডিফল্ট অবস্থায় MISSINGFIX বন্ধ`);

  const irOff1 = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff1, measureFn);
  const irOff1Json = JSON.stringify(irOff1);
  const xmlOff1 = DB.bodyXml(irOff1).xml;

  setMissingFix(false); // স্পষ্ট __FZ_OFF_MISSINGFIX = true
  const irOff2 = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff2, measureFn);
  const irOff2Json = JSON.stringify(irOff2);
  const xmlOff2 = DB.bodyXml(irOff2).xml;

  check(irOff1Json === irOff2Json, `${name}: ডিফল্ট বন্ধ এবং __FZ_OFF_MISSINGFIX অবস্থায় IR বাইট-বাই-বাইট অভিন্ন`);
  check(xmlOff1 === xmlOff2, `${name}: ডিফল্ট বন্ধ এবং __FZ_OFF_MISSINGFIX অবস্থায় DOCX XML বাইট-বাই-বাইট অভিন্ন`);

  // সুইচ চালু করে মেরামত ও পুনরায় বন্ধ করে স্ন্যাপশট রিস্টোর যাচাই
  setMissingFix(true);
  check(IR.missingFixOn() && LF.isMissingFixOn() && DB.missingFixOn(), `${name}: __FZ_ON_MISSINGFIX = true করলে সুইচ চালু`);
  const irOn1 = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn1, measureFn);
  const xmlOn = DB.bodyXml(irOn1).xml;
  check(xmlOn !== xmlOff1, `${name}: MISSINGFIX চালু থাকলে DOCX XML-এ লক্ষ্যভিত্তিক সংস্কার প্রতিফলিত হয়`);

  // স্ন্যাপশট রিস্টোর যাচাই (একই IR-এ চালু -> বন্ধ -> রেন্ডার)
  const irToggle = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irToggle, measureFn);
  setMissingFix(false);
  IR.repairMissingFixIr(irToggle, m.pageInfo);
  const irRestoredJson = JSON.stringify(irToggle);
  const xmlRestored = DB.bodyXml(irToggle).xml;
  check(irRestoredJson === irOff1Json, `${name}: MISSINGFIX চালু থেকে বন্ধ করলে IR বাইট-বাই-বাইট পূর্বাবস্থায় ফিরে আসে`);
  check(xmlRestored === xmlOff1, `${name}: MISSINGFIX চালু থেকে বন্ধ করলে DOCX XML বাইট-বাই-বাইট পূর্বাবস্থায় ফিরে আসে`);
}

// ২) ৬টি লক্ষ্য ফাইলের প্রতিটি ক্ষেত্রে MISSINGFIX চালু অবস্থায় সুনির্দিষ্ট জ্যামিতিক সংস্কার ও টেবিল অক্ষত থাকা যাচাই

// ২ক) a16 পাতা ৩: ছক-পরবর্তী দ্বি-কলাম গ্রিড ব্যান্ডে স্বাক্ষর-চিত্র ও পাদটীকার উল্লম্ব অবস্থান পুনরুদ্ধার
{
  const { m } = loadBundle('a16');
  setMissingFix(false);
  const irOff = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff, measureFn);
  const p3Off = irOff.pages[2];
  const gridBandOff = p3Off.bands[3];
  const ftOff = gridBandOff.cells[1].items[0];
  check(ftOff.rect.y >= 750, 'a16 P3 (OFF): পাদটীকা ভ্রান্তভাবে y>=750pt-এ নেমে গিয়েছিল');

  setMissingFix(true);
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn, measureFn);
  const p3On = irOn.pages[2];
  const gridBandOn = p3On.bands[3];
  const figOn = gridBandOn.cells[0].items[0];
  const ftOn = gridBandOn.cells[1].items[0];
  check(irOn.pages.length === irOff.pages.length, 'a16 (ON): মোট পাতা-সংখ্যা অপরিবর্তিত (৯ পাতা)');
  check(ftOn.rect.y >= figOn.rect.y && ftOn.rect.y <= figOn.rect.y + figOn.rect.h, `a16 P3 (ON): পাদটীকা চিত্রের উল্লম্ব সীমার ভেতরে পুনরুদ্ধার হয়েছে (y=${ftOn.rect.y})`);
  check(Math.abs(gridBandOn.y0 - figOn.rect.y) <= 0.2 && gridBandOn.y1 <= 730, `a16 P3 (ON): গ্রিড ব্যান্ডের সীমানা y0=${gridBandOn.y0}..y1=${gridBandOn.y1} সঠিক`);
  const xmlOn = DB.bodyXml(irOn).xml;
  verifyTableInvariants(xmlOn, 'a16 (ON)');
}

// ২খ) f1 পাতা ২: সারি ১-এর বাম ২-লাইন লেবেলের উচ্চতা অঙ্ক-বাক্সের ভেতরে আবদ্ধ রাখা এবং রেডিও-বিকল্পের আন্ডারলাইন পুনরুদ্ধার
{
  const { m } = loadBundle('f1');
  setMissingFix(false);
  const irOff = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff, measureFn);
  const tblP2Off = irOff.pages[1].bands[0].cells[0].items[0];
  check(tblP2Off._f1RowMeta[1].cells[0].beforePt >= 10 && tblP2Off._f1RowMeta[1].cells[0].linePt >= 11, 'f1 P2 (OFF): সারি ১ বাম লেবেলের beforePt=10.2 ও linePt=11.0 ছিল');

  setMissingFix(true);
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn, measureFn);
  const tblP2On = irOn.pages[1].bands[0].cells[0].items[0];
  check(irOn.pages.length === 3, 'f1 (ON): মোট পাতা-সংখ্যা অপরিবর্তিত (৩ পাতা)');
  check(tblP2On._f1RowMeta[1].cells[0].beforePt <= 8.0 && tblP2On._f1RowMeta[1].cells[0].linePt <= 10.5, 'f1 P2 (ON): সারি ১ বাম লেবেলের beforePt=7.5 ও linePt=10.2 দ্বারা অঙ্ক-বাক্সের সীমায় আবদ্ধ');
  check(tblP2On._f1RadioUnderline === true, 'f1 P2 (ON): অনুবৃত্তি পাতার রেডিও-বিকল্পে আন্ডারলাইন ফ্ল্যাগ সক্রিয়');
  const xmlOn = DB.bodyXml(irOn).xml;
  check(xmlOn.includes('<w:u w:val="single"/>'), 'f1 P2 (ON): DOCX XML-এ রেডিও-বিকল্পে আন্ডারলাইন যুক্ত হয়েছে');
  verifyTableInvariants(xmlOn, 'f1 (ON)');
}

// ২গ) a14 পাতা ২ ও পাতা ৩: পাতা ৩-এ সংযুক্ত ২-লাইন দফার (diag.lines === 1, rect.h >= 28) মধ্যবর্তী ফাঁক পূরণ ও পাতা ২-এ বাম স্ক্যান-প্রান্ত ওভারলে
{
  const { m } = loadBundle('a14');
  setMissingFix(false);
  const irOff = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff, measureFn);
  const item3Off = irOff.pages[2].bands[3].cells[0].items[0];
  check(item3Off.lineSpacingPt === 14.8 && item3Off._a14SlashBridgeDrop === -7, 'a14 P3 (OFF): সংযুক্ত ২-লাইন দফার পিচ ১৪.৮pt ও স্ল্যাশ-ড্রপ -৭ ছিল');

  setMissingFix(true);
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn, measureFn);
  const item3On = irOn.pages[2].bands[3].cells[0].items[0];
  check(irOn.pages.length === 3, 'a14 (ON): মোট পাতা-সংখ্যা অপরিবর্তিত (৩ পাতা)');
  check(item3On.lineSpacingPt === 13.8 && item3On._a14SlashBridgeDrop === -9, 'a14 P3 (ON): সংযুক্ত ২-লাইন দফার পিচ ১৩.৮pt ও স্ল্যাশ-ড্রপ -৯ দ্বারা ১px ফাঁক পূরণ');
  check(Array.isArray(irOn.pages[1]._a16Fix5Overlays) && irOn.pages[1]._a16Fix5Overlays.some((o) => o.y === 824), 'a14 P2 (ON): নিচের বাম স্ক্যান-প্রান্তের ওভারলে যুক্ত হয়েছে');
  const xmlOn = DB.bodyXml(irOn).xml;
  verifyTableInvariants(xmlOn, 'a14 (ON)');
}

// ২ঘ) a13 পাতা ১: শীর্ষ প্রতীক চিত্রের পূর্ণ মাপা উচ্চতা সংরক্ষণ ও ক্রমিক সারির পিচ সমন্বয়
{
  const { m } = loadBundle('a13');
  setMissingFix(true);
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn, measureFn);
  const figB1 = irOn.pages[0].bands[1].cells[0].items[0];
  const itemB9 = irOn.pages[0].bands[9].cells[0].items[0];
  check(irOn.pages.length === 1, 'a13 (ON): মোট পাতা-সংখ্যা অপরিবর্তিত (১ পাতা)');
  check(Math.abs(figB1.heightPt - 39.4) <= 0.2, `a13 P1 (ON): শীর্ষ প্রতীকের পূর্ণ মাপা উচ্চতা পুনরুদ্ধার (${figB1.heightPt}pt)`);
  check(itemB9.lineSpacingPt === 10.5 && itemB9.lineRule === 'exact', 'a13 P1 (ON): উঁচু এস্টিমেটযুক্ত কোলন-ট্যাব সারির পিচ ১০.৫pt exact');
  const xmlOn = DB.bodyXml(irOn).xml;
  verifyTableInvariants(xmlOn, 'a13 (ON)');
}

// ২ঙ) a06 পাতা ১: উঁচু শীর্ষ-মার্জিনযুক্ত কোলন-ট্যাব তালিকায় রেফ-যুক্ত লেবেলের উর্ধ্ব-মাত্রা পৃথকীকরণ
{
  const { m } = loadBundle('a06');
  setMissingFix(true);
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn, measureFn);
  const itemB11 = irOn.pages[0].bands[11].cells[0].items[0];
  check(irOn.pages.length === 1, 'a06 (ON): মোট পাতা-সংখ্যা অপরিবর্তিত (১ পাতা)');
  check(itemB11._missingFixRephRaise === 2, 'a06 P1 (ON): রেফ-যুক্ত কোলন-ট্যাব সারিতে উর্ধ্ব-মাত্রা অফসেট সক্রিয়');
  const xmlOn = DB.bodyXml(irOn).xml;
  check(xmlOn.includes('<w:position w:val="2"/>'), 'a06 P1 (ON): DOCX XML-এ <w:position w:val="2"/> রেন্ডার হয়েছে');
}

// ২চ) a07 পাতা ১–৪: একটি উৎস-ছক = একটি <w:tbl>, পূর্ণ বর্ডার অক্ষত রেখে ঘরের ভেতরের মাপা লাইন-পিচ প্রয়োগ
{
  const { m } = loadBundle('a07');
  setMissingFix(false);
  const irOff = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff, measureFn);
  const xmlOff = DB.bodyXml(irOff).xml;
  const tblsOff = extractTopLevelTables(xmlOff);

  setMissingFix(true);
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn, measureFn);
  const xmlOn = DB.bodyXml(irOn).xml;
  const tblsOn = extractTopLevelTables(xmlOn);

  check(irOn.pages.length === 5, 'a07 (ON): মোট পাতা-সংখ্যা অপরিবর্তিত (৫ পাতা)');
  const borderedTblsOn = tblsOn.filter((t) => !t.includes('<w:top w:val="nil"/>'));
  const borderedTblsOff = tblsOff.filter((t) => !t.includes('<w:top w:val="nil"/>'));
  check(tblsOn.length === tblsOff.length && borderedTblsOn.length === borderedTblsOff.length && borderedTblsOn.length === 5, `a07 (ON): ৫টি বর্ডারযুক্ত উৎস-ছকের জন্য ঠিক ৫টি <w:tbl> অক্ষত আছে (${borderedTblsOn.length})`);
  verifyTableInvariants(xmlOn, 'a07 (ON)');

  for (let ti = 0; ti < tblsOn.length; ti++) {
    const { masked } = extractDirectRowsAndCells(tblsOn[ti]);
    check(!/<w:tcBorders>[\s\S]*?w:val="nil"/.test(masked), `a07 tbl[${ti}]: কোনো ঘরের বর্ডার মুছে ফেলা (nil) হয়নি`);
    check(!/<w:shd\b/.test(masked), `a07 tbl[${ti}]: উৎসে ছায়া না থাকায় কোনো ঘরে বাড়তি ধূসর ছায়া (w:shd) যোগ করা হয়নি`);
  }
}

// ৩) অক্ষতিগ্রস্ত কাঠামোর নথিতে (যেমন a18, a08, a12, a01, a02, a03 ধাঁচের সাধারণ অনুচ্ছেদ ও ছক) সুইচ চালু থাকলেও অপরিবর্তিত থাকা যাচাই
{
  const sampleUnchangedIr = {
    pages: [
      {
        page: 1,
        widthPt: 595.2,
        heightPt: 841.9,
        bodyFontPt: 12,
        margins: { top: 54, right: 54, bottom: 54, left: 54 },
        boxes: [],
        bands: [
          {
            kind: 'flow',
            y0: 54,
            y1: 70,
            gapBeforePt: 0,
            cells: [
              {
                x0: 54,
                x1: 541.2,
                items: [
                  {
                    kind: 'para',
                    type: 'heading',
                    rect: { x: 180, y: 54, w: 235, h: 16 },
                    text: 'সাধারণ শিরোনাম',
                    lines: ['সাধারণ শিরোনাম'],
                    fontPt: 14,
                    bold: true,
                    align: 'c',
                    indentPt: 0,
                    firstIndentPt: 0,
                    spaceBeforePt: 0
                  }
                ]
              }
            ]
          },
          {
            kind: 'flow',
            y0: 90,
            y1: 190,
            gapBeforePt: 20,
            cells: [
              {
                x0: 54,
                x1: 541.2,
                items: [
                  {
                    kind: 'table',
                    type: 'table',
                    rect: { x: 54, y: 90, w: 487.2, h: 100 },
                    widthPt: 487.2,
                    heightPt: 100,
                    fontPt: 11,
                    borderless: false,
                    colFractions: [0.2, 0.4, 0.4],
                    rowHeightsPt: [25, 25, 25, 25],
                    rows: [
                      ['১', 'ক', 'খ'],
                      ['২', 'গ', 'ঘ'],
                      ['৩', 'ঙ', 'চ'],
                      ['৪', 'ছ', 'জ']
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

  setMissingFix(false);
  const irCopyOff = JSON.parse(JSON.stringify(sampleUnchangedIr));
  LF.fit(irCopyOff, measureFn);
  const xmlUnchangedOff = DB.bodyXml(irCopyOff).xml;

  setMissingFix(true);
  const irCopyOn = JSON.parse(JSON.stringify(sampleUnchangedIr));
  LF.fit(irCopyOn, measureFn);
  const xmlUnchangedOn = DB.bodyXml(irCopyOn).xml;

  check(JSON.stringify(irCopyOff) === JSON.stringify(irCopyOn), 'অক্ষতিগ্রস্ত নথি: MISSINGFIX চালু ও বন্ধ অবস্থায় IR সম্পূর্ণ অভিন্ন');
  check(xmlUnchangedOff === xmlUnchangedOn, 'অক্ষতিগ্রস্ত নথি: MISSINGFIX চালু ও বন্ধ অবস্থায় DOCX XML সম্পূর্ণ অভিন্ন');
}

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
