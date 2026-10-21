/**
 * MISSING_TYPE_v2 — শূন্য-ক্ষতি নীতিতে (Zero-Regression) লেখা হারানো/বাড়তি লাইন ত্রুটির লক্ষ্য-সারিভিত্তিক সংস্কারের স্বয়ংসম্পূর্ণ অফলাইন টেস্ট
 * যাচাই করে:
 * ১) সুইচ বন্ধ থাকলে (__FZ_OFF_MISSINGFIX = true বা ডিফল্ট বন্ধ) IR ও DOCX XML বাইট-বাই-বাইট অপরিবর্তিত থাকে;
 * ২) সুইচ চালু করার পর পুনরায় বন্ধ করলে স্ন্যাপশট থেকে মূল IR ও DOCX XML হুবহু পুনরুদ্ধার হয় এবং ক্রপকৃত ছবি (it.image) হারায় না;
 * ৩) a06 ও a13-এ সুইচ চালু করলে (INDENTFIX/VGAPFIX/SERIALFIX চালু ও বন্ধ উভয় অবস্থাতেই) পাতার সারি-সংখ্যা, প্রথম ও শেষ সারির y,
 *    অন্য সব সারির y/উচ্চতা এবং শীর্ষ প্রতীক চিত্র (it.image / media) সম্পূর্ণ অপরিবর্তিত থাকে;
 * ৪) শূন্য-ক্ষতি নীতি অনুযায়ী a14 ও a07-এ পাতার সারি-সংখ্যা, প্রথম/শেষ সারির y, ছকের উচ্চতা ও সব ক্রপকৃত ছবি সম্পূর্ণ অক্ষত থাকে;
 * ৫) a16 (পাতা ৩) ও f1 (পাতা ২)-এ সংস্কার কেবল লক্ষ্য-সারিতে সীমিত থাকে এবং পাতার বাকি সব সারির y/উচ্চতা/পাতা-বিরতি অপরিবর্তিত থাকে;
 * ৬) প্রতিটি ছকে (<w:tbl>) সারির ঘরগুলোর প্রস্থের যোগফল (<w:tcW>) টেবিলের মোট প্রস্থের (<w:tblW>) সমান এবং সব সারিতে কলাম-সীমা একই গ্রিডে (<w:tblGrid>) আবদ্ধ থাকে;
 * ৭) অক্ষতিগ্রস্ত কাঠামোর নথিতে সুইচ চালু থাকলেও কোনো অনাকাঙ্ক্ষিত পরিবর্তন ঘটে না।
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = fs.existsSync(path.join(__dirname, 'js/layout-engine/faithful/layout-ir.js'))
  ? __dirname
  : path.resolve(__dirname, '..');

// switch-defaults.js-এর গৃহীত ডিফল্ট-চালু সুইচসমূহ (INDENTFIX, VGAPFIX, SERIALFIX সহ)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT',
  'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4',
  'RULES2', 'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX', 'A02FIX',
  'A06FIX', 'A07FIX6', 'F1FIX', 'A18FIX', 'A08FIX', 'A16FIX6', 'F1FIX2',
  'INDENTFIX', 'VGAPFIX', 'SERIALFIX'
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
 * ব্রাউজার পাইপলাইনের cropFigures ধাপের অনুকরণে প্রতিটি figure আইটেমে ডামি ক্রপকৃত ছবি সংযোজন
 */
function attachCroppedFigures(ir) {
  const dummyPng = 'data:image/png;base64,' + DB.makeGrayPngBase64(4, 4, 128);
  let count = 0;
  for (const p of (ir && ir.pages) || []) {
    for (const b of (p && p.bands) || []) {
      for (const c of (b && b.cells) || []) {
        for (const it of (c && c.items) || []) {
          if (it && it.kind === 'figure') {
            count++;
            it.image = { dataUrl: dummyPng, pxW: 40, pxH: 40, figIdx: count };
          }
        }
      }
    }
  }
  return count;
}

/**
 * পাতার সারি-সংখ্যা এবং প্রথম ও শেষ সারির y-অবস্থান ও উচ্চতা নিষ্কাশন
 */
function extractPageRowMetrics(page) {
  const bands = (page && page.bands) || [];
  let rowCount = 0;
  const bandYs = [];
  for (const b of bands) {
    bandYs.push({ y0: b.y0, y1: b.y1, gap: b.gapBeforePt });
    for (const c of b.cells || []) {
      for (const it of c.items || []) {
        if (!it) continue;
        if (it.kind === 'table' && Array.isArray(it.rows)) {
          rowCount += it.rows.length;
        } else if (it.kind === 'para') {
          const nLn = (Array.isArray(it.tabLines) && it.tabLines.length) || (Array.isArray(it.lines) && it.lines.length) || 1;
          rowCount += nLn;
        } else {
          rowCount += 1;
        }
      }
    }
  }
  const firstBand = bands[0];
  const lastBand = bands[bands.length - 1];
  const firstIt = firstBand && firstBand.cells && firstBand.cells[0] && firstBand.cells[0].items && firstBand.cells[0].items[0];
  const lastIt = lastBand && lastBand.cells && lastBand.cells[0] && lastBand.cells[0].items && lastBand.cells[0].items[lastBand.cells[0].items.length - 1];
  return {
    bandCount: bands.length,
    rowCount,
    firstBandY0: firstBand ? firstBand.y0 : null,
    firstBandY1: firstBand ? firstBand.y1 : null,
    lastBandY0: lastBand ? lastBand.y0 : null,
    lastBandY1: lastBand ? lastBand.y1 : null,
    firstItemY: firstIt && firstIt.rect ? firstIt.rect.y : null,
    lastItemY: lastIt && lastIt.rect ? lastIt.rect.y : null,
    bandYs
  };
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

  // স্ন্যাপশট রিস্টোর যাচাই (একই IR-এ চালু -> বন্ধ -> রেন্ডার)
  setMissingFix(true);
  check(IR.missingFixOn() && LF.isMissingFixOn() && DB.missingFixOn(), `${name}: __FZ_ON_MISSINGFIX = true করলে সুইচ চালু`);
  const irToggle = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irToggle, measureFn);
  setMissingFix(false);
  IR.repairMissingFixIr(irToggle, m.pageInfo);
  const irRestoredJson = JSON.stringify(irToggle);
  const xmlRestored = DB.bodyXml(irToggle).xml;
  check(irRestoredJson === irOff1Json, `${name}: MISSINGFIX চালু থেকে বন্ধ করলে IR বাইট-বাই-বাইট পূর্বাবস্থায় ফিরে আসে`);
  check(xmlRestored === xmlOff1, `${name}: MISSINGFIX চালু থেকে বন্ধ করলে DOCX XML বাইট-বাই-বাইট পূর্বাবস্থায় ফিরে আসে`);
}

// ২) a06 ও a13-এ সুইচ চালু করলে পাতার সারি-সংখ্যা, প্রথম ও শেষ সারির y এবং ক্রপকৃত প্রতীক-চিত্র অপরিবর্তিত থাকা যাচাই
//    (INDENTFIX/VGAPFIX/SERIALFIX চালু এবং বন্ধ — উভয় অবস্থাতেই যাচাই)
for (const toggleNewFixes of [true, false]) {
  for (const k of ['INDENTFIX', 'VGAPFIX', 'SERIALFIX']) {
    if (toggleNewFixes) {
      globalThis['__FZ_ON_' + k] = true;
      delete globalThis['__FZ_OFF_' + k];
    } else {
      delete globalThis['__FZ_ON_' + k];
      globalThis['__FZ_OFF_' + k] = true;
    }
  }
  const modeLabel = toggleNewFixes ? 'নতুন ৩ সুইচ চালু' : 'নতুন ৩ সুইচ বন্ধ';

  for (const name of ['a06', 'a13']) {
    const { m } = loadBundle(name);

    setMissingFix(false);
    const irOff = IR.build(m.cap, m.measures, m.pageInfo);
    LF.fit(irOff, measureFn);
    const figCountOff = attachCroppedFigures(irOff);
    const metricsOff = extractPageRowMetrics(irOff.pages[0]);
    const planOff = DB.planPage(irOff.pages[0]);
    const outOff = DB.bodyXml(irOff);

    setMissingFix(true);
    const irOn = IR.build(m.cap, m.measures, m.pageInfo);
    LF.fit(irOn, measureFn);
    const figCountOn = attachCroppedFigures(irOn);
    const metricsOn = extractPageRowMetrics(irOn.pages[0]);
    const planOn = DB.planPage(irOn.pages[0]);
    const outOn = DB.bodyXml(irOn);

    check(irOn.pages.length === 1 && irOff.pages.length === 1, `${name} (${modeLabel}): পাতা-সংখ্যা অপরিবর্তিত (১ পাতা)`);
    check(metricsOn.bandCount === metricsOff.bandCount, `${name} (${modeLabel}): ব্যান্ড-সংখ্যা অপরিবর্তিত (${metricsOn.bandCount})`);
    check(metricsOn.rowCount === metricsOff.rowCount, `${name} (${modeLabel}): পাতার মোট সারি-সংখ্যা অপরিবর্তিত (${metricsOn.rowCount})`);
    check(metricsOn.firstBandY0 === metricsOff.firstBandY0 && metricsOn.firstItemY === metricsOff.firstItemY, `${name} (${modeLabel}): প্রথম সারির y অপরিবর্তিত (y0=${metricsOn.firstBandY0})`);
    check(metricsOn.lastBandY0 === metricsOff.lastBandY0 && metricsOn.lastBandY1 === metricsOff.lastBandY1 && metricsOn.lastItemY === metricsOff.lastItemY, `${name} (${modeLabel}): শেষ সারির y ও পাতার মোট উচ্চতা অপরিবর্তিত (y0=${metricsOn.lastBandY0}, y1=${metricsOn.lastBandY1})`);
    check(JSON.stringify(metricsOn.bandYs) === JSON.stringify(metricsOff.bandYs), `${name} (${modeLabel}): পাতার প্রতিটি সারির y0, y1 ও gapBeforePt হুবহু অপরিবর্তিত`);
    check(planOn.els.length === planOff.els.length && Math.abs(planOn.f - planOff.f) < 1e-6, `${name} (${modeLabel}): planPage এলিমেন্ট সংখ্যা ও স্কেল ফ্যাক্টর অপরিবর্তিত`);
    check(figCountOn === figCountOff && outOn.media.length === outOff.media.length && outOn.media.length >= 1, `${name} (${modeLabel}): শীর্ষ প্রতীক চিত্র (media=${outOn.media.length}) অক্ষত আছে`);
    check(outOn.xml === outOff.xml, `${name} (${modeLabel}): শূন্য-ক্ষতি নীতিতে DOCX XML সম্পূর্ণ অক্ষত`);
  }
}
setBaseSwitches();

// ৩) লক্ষ্যভিত্তিক সংস্কার যাচাই (a16 পাতা ৩ এবং f1 পাতা ২) ও বাকি সারির y অক্ষত থাকা যাচাই

// ৩ক) a16 পাতা ৩: ছক-পরবর্তী দ্বি-কলাম গ্রিড ব্যান্ডে স্বাক্ষর-চিত্র ও পাদটীকার উল্লম্ব অবস্থান পুনরুদ্ধার (বাকি সব ব্যান্ড ও ছবি অক্ষত)
{
  const { m } = loadBundle('a16');
  setMissingFix(false);
  const irOff = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff, measureFn);
  attachCroppedFigures(irOff);
  const p3Off = irOff.pages[2];
  const metricsP3Off = extractPageRowMetrics(p3Off);
  const gridBandOff = p3Off.bands[3];
  const ftOff = gridBandOff.cells[1].items[0];
  check(ftOff.rect.y >= 750, 'a16 P3 (OFF): পাদটীকা ভ্রান্তভাবে y>=750pt-এ নেমে গিয়েছিল');
  const outOff = DB.bodyXml(irOff);

  setMissingFix(true);
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn, measureFn);
  attachCroppedFigures(irOn);
  const p3On = irOn.pages[2];
  const metricsP3On = extractPageRowMetrics(p3On);
  const gridBandOn = p3On.bands[3];
  const figOn = gridBandOn.cells[0].items[0];
  const ftOn = gridBandOn.cells[1].items[0];
  check(irOn.pages.length === irOff.pages.length, 'a16 (ON): মোট পাতা-সংখ্যা অপরিবর্তিত (৯ পাতা)');
  check(metricsP3On.bandCount === metricsP3Off.bandCount && metricsP3On.rowCount === metricsP3Off.rowCount, 'a16 P3 (ON): পাতা ৩-এর ব্যান্ড ও সারি-সংখ্যা অপরিবর্তিত');
  check(metricsP3On.firstBandY0 === metricsP3Off.firstBandY0, 'a16 P3 (ON): পাতা ৩-এর প্রথম সারির y0 অপরিবর্তিত');
  check(JSON.stringify(metricsP3On.bandYs.slice(0, 3)) === JSON.stringify(metricsP3Off.bandYs.slice(0, 3)), 'a16 P3 (ON): লক্ষ্য ব্যান্ড (ব্যান্ড ৩) বাদে বাকি সব ব্যান্ডের (০–২) y0/y1/gap অপরিবর্তিত');
  check(ftOn.rect.y >= figOn.rect.y && ftOn.rect.y <= figOn.rect.y + figOn.rect.h, `a16 P3 (ON): পাদটীকা চিত্রের উল্লম্ব সীমার ভেতরে পুনরুদ্ধার হয়েছে (y=${ftOn.rect.y})`);
  check(Math.abs(gridBandOn.y0 - figOn.rect.y) <= 0.2 && gridBandOn.y1 <= 730, `a16 P3 (ON): গ্রিড ব্যান্ডের সীমানা y0=${gridBandOn.y0}..y1=${gridBandOn.y1} সঠিক`);
  const outOn = DB.bodyXml(irOn);
  check(outOn.media.length === outOff.media.length && outOn.media.length === 9, `a16 (ON): পাতা ৩-এর স্বাক্ষর-চিত্রসহ সব ৯টি ছবি অক্ষত আছে (${outOn.media.length})`);
  verifyTableInvariants(outOn.xml, 'a16 (ON)');
}

// ৩খ) f1 পাতা ২: সারি ১-এর বাম ২-লাইন লেবেলের উচ্চতা অঙ্ক-বাক্সের ভেতরে আবদ্ধ রাখা এবং রেডিও-বিকল্পের আন্ডারলাইন পুনরুদ্ধার (ব্যান্ড ও সারির y অপরিবর্তিত)
{
  const { m } = loadBundle('f1');
  setMissingFix(false);
  const irOff = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff, measureFn);
  const metricsP2Off = extractPageRowMetrics(irOff.pages[1]);
  const tblP2Off = irOff.pages[1].bands[0].cells[0].items[0];
  check(tblP2Off._f1RowMeta[1].cells[0].beforePt >= 10 && tblP2Off._f1RowMeta[1].cells[0].linePt >= 11, 'f1 P2 (OFF): সারি ১ বাম লেবেলের beforePt=10.2 ও linePt=11.0 ছিল');

  setMissingFix(true);
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn, measureFn);
  const metricsP2On = extractPageRowMetrics(irOn.pages[1]);
  const tblP2On = irOn.pages[1].bands[0].cells[0].items[0];
  check(irOn.pages.length === 3, 'f1 (ON): মোট পাতা-সংখ্যা অপরিবর্তিত (৩ পাতা)');
  check(metricsP2On.bandCount === metricsP2Off.bandCount && metricsP2On.rowCount === metricsP2Off.rowCount, 'f1 P2 (ON): পাতা ২-এর ব্যান্ড ও সারি-সংখ্যা অপরিবর্তিত');
  check(metricsP2On.firstBandY0 === metricsP2Off.firstBandY0 && metricsP2On.lastBandY1 === metricsP2Off.lastBandY1, 'f1 P2 (ON): পাতা ২-এর প্রথম ও শেষ সারির y অপরিবর্তিত');
  check(JSON.stringify(tblP2On.rowHeightsPt) === JSON.stringify(tblP2Off.rowHeightsPt), 'f1 P2 (ON): ছকের সব সারির উচ্চতা (rowHeightsPt) অপরিবর্তিত');
  check(tblP2On._f1RowMeta[1].cells[0].beforePt <= 8.0 && tblP2On._f1RowMeta[1].cells[0].linePt <= 10.5, 'f1 P2 (ON): সারি ১ বাম লেবেলের beforePt=7.5 ও linePt=10.2 দ্বারা অঙ্ক-বাক্সের সীমায় আবদ্ধ');
  check(tblP2On._f1RadioUnderline === true, 'f1 P2 (ON): অনুবৃত্তি পাতার রেডিও-বিকল্পে আন্ডারলাইন ফ্ল্যাগ সক্রিয়');
  const xmlOn = DB.bodyXml(irOn).xml;
  check(xmlOn.includes('<w:u w:val="single"/>'), 'f1 P2 (ON): DOCX XML-এ রেডিও-বিকল্পে আন্ডারলাইন যুক্ত হয়েছে');
  verifyTableInvariants(xmlOn, 'f1 (ON)');
}

// ৪) শূন্য-ক্ষতি নীতি যাচাই: a14 ও a07-এ পাতার সারি-সংখ্যা, প্রথম/শেষ সারির y, ছক এবং সব ছবি সম্পূর্ণ অক্ষত থাকা যাচাই
for (const name of ['a14', 'a07']) {
  const { m } = loadBundle(name);
  setMissingFix(false);
  const irOff = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff, measureFn);
  attachCroppedFigures(irOff);
  const outOff = DB.bodyXml(irOff);

  setMissingFix(true);
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn, measureFn);
  attachCroppedFigures(irOn);
  const outOn = DB.bodyXml(irOn);

  check(irOn.pages.length === irOff.pages.length, `${name} (ON): পাতা-সংখ্যা অপরিবর্তিত (${irOn.pages.length})`);
  check(outOn.media.length === outOff.media.length && outOn.media.length > 0, `${name} (ON): সব ক্রপকৃত ছবি অক্ষত আছে (media=${outOn.media.length})`);
  for (let pi = 0; pi < irOn.pages.length; pi++) {
    const mOff = extractPageRowMetrics(irOff.pages[pi]);
    const mOn = extractPageRowMetrics(irOn.pages[pi]);
    check(mOn.rowCount === mOff.rowCount && mOn.firstBandY0 === mOff.firstBandY0 && mOn.lastBandY1 === mOff.lastBandY1, `${name} P${pi + 1} (ON): সারি-সংখ্যা ও প্রথম/শেষ সারির y অপরিবর্তিত`);
  }
  check(outOn.xml === outOff.xml, `${name} (ON): শূন্য-ক্ষতি নীতিতে DOCX XML সম্পূর্ণ অক্ষত`);
  verifyTableInvariants(outOn.xml, `${name} (ON)`);
}

// ৫) অক্ষতিগ্রস্ত কাঠামোর নথিতে (যেমন a18, a08, a12, a01, a02, a03 ধাঁচের সাধারণ অনুচ্ছেদ ও ছক) সুইচ চালু থাকলেও অপরিবর্তিত থাকা যাচাই
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
