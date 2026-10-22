/**
 * SHORT_TYPE_v1: ৫টি নথির (f1, a16, a14, a01, a07) মোট ১০টি ছোট লাইন (dx1 <= -8)
 * সাধারণ জ্যামিতিক ও কাঠামোগত নিয়মে মেরামতের স্বয়ংক্রিয় পরীক্ষা।
 * চালানো: node tests/shortfix.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');

// প্রোডাকশনের ডিফল্ট-চালু ভিত্তি-সুইচগুলো স্পষ্টভাবে নাম ধরে চালু করা (switch-defaults.js require না করে)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT',
  'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4',
  'RULES2', 'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX', 'A02FIX',
  'A06FIX', 'A07FIX6', 'F1FIX', 'A18FIX', 'A08FIX', 'A16FIX6', 'F1FIX2'
];
for (const k of BASE_SWITCHES) {
  globalThis['__FZ_ON_' + k] = true;
}

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const FB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

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

/**
 * শীর্ষ-স্তরের এবং নেস্টেড সকল <w:tbl>-এর গ্রিড অখণ্ডতা যাচাই:
 * ১) প্রতিটি সারিতে ঘরের প্রস্থের (<w:tcW>) যোগফল = টেবিলের প্রস্থ (<w:tblW>) এবং <w:tblGrid>-এর যোগফল;
 * ২) সব সারিতে কলাম-সীমা (cumulative cell boundaries) একই গ্রিড-কলাম সীমায় অবস্থিত।
 */
function extractAllTables(xml) {
  const tables = [];
  const stack = [];
  const tagRe = /<\/?w:tbl(?=\s|>)/g;
  let m;
  while ((m = tagRe.exec(xml)) !== null) {
    if (m[0] === '<w:tbl') {
      stack.push(m.index);
    } else if (stack.length > 0) {
      const start = stack.pop();
      const end = m.index + '</w:tbl>'.length;
      tables.push({ start, end, raw: xml.slice(start, end), depth: stack.length });
    }
  }
  return tables;
}

function stripNestedTables(tblRaw) {
  let out = '';
  let depth = 0;
  let lastIdx = 0;
  const tagRe = /<\/?w:tbl(?=\s|>)/g;
  let m;
  while ((m = tagRe.exec(tblRaw)) !== null) {
    if (m[0] === '<w:tbl') {
      if (depth === 1) {
        out += tblRaw.slice(lastIdx, m.index);
      }
      depth++;
    } else {
      depth--;
      if (depth === 1) {
        lastIdx = m.index + '</w:tbl>'.length;
      }
    }
  }
  out += tblRaw.slice(lastIdx);
  return out;
}

function verifyTableGridInvariants(xml, docName) {
  const tables = extractAllTables(xml);
  check(tables.length > 0, `${docName}: অন্তত একটি <w:tbl> থাকতে হবে`);
  let allRowsOk = true;
  let allBoundsOk = true;

  for (let ti = 0; ti < tables.length; ti++) {
    const shallow = stripNestedTables(tables[ti].raw);
    const tblWM = /<w:tblW\s+w:w="(\d+)"/.exec(shallow);
    const gridCols = [...shallow.matchAll(/<w:gridCol\s+w:w="(\d+)"/g)].map((x) => Number(x[1]));
    const gridSum = gridCols.reduce((a, b) => a + b, 0);
    const tblW = tblWM ? Number(tblWM[1]) : gridSum;
    if (gridCols.length > 0 && tblW !== gridSum) {
      allRowsOk = false;
      console.error(`${docName} tbl[${ti}]: tblW (${tblW}) !== gridSum (${gridSum})`);
    }
    const gridBounds = new Set([0]);
    let accG = 0;
    for (const gw of gridCols) {
      accG += gw;
      gridBounds.add(accG);
    }

    const trMatches = [...shallow.matchAll(/<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/g)];
    for (let ri = 0; ri < trMatches.length; ri++) {
      const trBody = trMatches[ri][1];
      const tcMatches = [...trBody.matchAll(/<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g)];
      let rowW = 0;
      for (const tc of tcMatches) {
        const wM = /<w:tcW\s+w:w="(\d+)"/.exec(tc[1]);
        const cw = wM ? Number(wM[1]) : 0;
        rowW += cw;
        if (gridCols.length > 0 && !gridBounds.has(rowW)) {
          allBoundsOk = false;
          console.error(`${docName} tbl[${ti}] row[${ri}]: কলাম-সীমা ${rowW} গ্রিডে নেই (${[...gridBounds].join(',')})`);
        }
      }
      if (rowW !== tblW) {
        allRowsOk = false;
        console.error(`${docName} tbl[${ti}] row[${ri}]: সারির প্রস্থের যোগফল (${rowW}) !== টেবিলের প্রস্থ (${tblW})`);
      }
    }
  }
  check(allRowsOk, `${docName}: প্রতিটি সারিতে ঘরের প্রস্থের যোগফল = টেবিলের প্রস্থ`);
  check(allBoundsOk, `${docName}: সব সারিতে কলাম-সীমা একই গ্রিডে সংরেখিত`);
}

const GOLDEN_FILES = {
  f1: path.join(ROOT, 'qa/golden-data/runs/S28_d1eed75b/f1/measures.json'),
  a16: path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a16/measures.json'),
  a14: path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a14/measures.json'),
  a01: path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a01/measures.json'),
  a07: path.join(ROOT, 'qa/golden-data/runs/S25_18025270/a07/measures.json')
};

// ১) সুইচ API ও পরিবেশ চলক যাচাই
globalThis.__FZ_ON_SHORTFIX = false;
delete globalThis.__FZ_OFF_SHORTFIX;
check(IR.shortFixOn() === false && LF.isShortFixOn() === false && FB.shortFixOn() === false, 'ডিফল্ট অবস্থায় __FZ_ON_SHORTFIX=false হলে সুইচ বন্ধ থাকে');

globalThis.__FZ_ON_SHORTFIX = true;
check(IR.shortFixOn() === true && LF.isShortFixOn() === true && FB.shortFixOn() === true, '__FZ_ON_SHORTFIX=true হলে সুইচ চালু হয়');

globalThis.__FZ_OFF_SHORTFIX = true;
check(IR.shortFixOn() === false && LF.isShortFixOn() === false && FB.shortFixOn() === false, '__FZ_OFF_SHORTFIX=true থাকলে সুইচ অগ্রাধিকার ভিত্তিতে বন্ধ হয়');
delete globalThis.__FZ_OFF_SHORTFIX;

// ২) প্রতিটি ফাইলের সুইচ বন্ধ বনাম চালু এবং পুনরুদ্ধার (restore) যাচাই
const results = {};
for (const [name, fPath] of Object.entries(GOLDEN_FILES)) {
  const rawMs = fs.readFileSync(fPath, 'utf8');

  // বন্ধ অবস্থায় নির্মাণ
  globalThis.__FZ_ON_SHORTFIX = false;
  delete globalThis.__FZ_OFF_SHORTFIX;
  const msOff = JSON.parse(rawMs);
  const irOff = IR.build(msOff);
  LF.fit(irOff);
  const irOffSnap = JSON.stringify(irOff);
  const xmlOff = FB.bodyXml(irOff).xml;
  const irOffAfterXml = JSON.stringify(irOff);

  // চালু অবস্থায় নির্মাণ
  globalThis.__FZ_ON_SHORTFIX = true;
  const msOn = JSON.parse(rawMs);
  const irOn = IR.build(msOn);
  LF.fit(irOn);
  const xmlOn = FB.bodyXml(irOn).xml;

  check(xmlOn !== xmlOff, `${name}: SHORTFIX চালু থাকলে DOCX XML-এ প্রত্যাশিত পরিবর্তন ঘটে`);
  check(irOn.pages.length === irOff.pages.length, `${name}: পাতা-সংখ্যা অপরিবর্তিত থাকে (${irOn.pages.length})`);

  // চালু অবস্থায় নির্মিত IR থেকে __FZ_OFF_SHORTFIX দ্বারা পুনরুদ্ধার যাচাই
  const irToggle = IR.build(JSON.parse(rawMs));
  LF.fit(irToggle);
  globalThis.__FZ_OFF_SHORTFIX = true;
  IR.repairShortFixIr(irToggle);
  check(JSON.stringify(irToggle) === irOffSnap, `${name}: সুইচ বন্ধ করলে LF.fit-পরবর্তী IR বাইট-টু-বাইট অভিন্ন অবস্থায় ফেরে`);
  const xmlToggle = FB.bodyXml(irToggle).xml;
  check(JSON.stringify(irToggle) === irOffAfterXml, `${name}: সুইচ বন্ধ করলে চূড়ান্ত IR বাইট-টু-বাইট অভিন্ন থাকে`);
  check(xmlToggle === xmlOff, `${name}: সুইচ বন্ধ করলে DOCX XML বাইট-টু-বাইট অভিন্ন থাকে`);
  delete globalThis.__FZ_OFF_SHORTFIX;

  results[name] = { irOff, xmlOff, irOn, xmlOn };
}

// ৩) f1: পাতা ১ (y=533) ও পাতা ২ (y=85)-এ ১৭-ঘরের নেস্টেড অঙ্ক-বাক্সের ডান বর্ডার ক্লিয়ারেন্স যাচাই
{
  const { irOff, irOn, xmlOn } = results.f1;
  const tblP1Off = irOff.pages[0].bands[2].cells[0].items[0];
  const tblP1On = irOn.pages[0].bands[2].cells[0].items[0];
  const tblP2Off = irOff.pages[1].bands[0].cells[0].items[0];
  const tblP2On = irOn.pages[1].bands[0].cells[0].items[0];

  const p1Col1Off = tblP1Off.widthPt * tblP1Off.colFractions[1];
  const p1Col1On = tblP1On.widthPt * tblP1On.colFractions[1];
  const p1BoxRight = 5.4 + tblP1On._f1BoxSpecs[14].indentPt + tblP1On._f1BoxSpecs[14].widthPt;
  check(p1Col1Off < p1BoxRight && p1Col1On >= p1BoxRight + 2.0, `f1 পাতা ১: ২য় কলামের প্রস্থ (${p1Col1Off.toFixed(1)} -> ${p1Col1On.toFixed(1)}pt) ১৭-ঘরের বাক্স-গ্রিডের ডান প্রান্ত (${p1BoxRight.toFixed(1)}pt) থেকে নিরাপদ ক্লিয়ারেন্স রাখে`);

  const p2Col1Off = tblP2Off.widthPt * tblP2Off.colFractions[1];
  const p2Col1On = tblP2On.widthPt * tblP2On.colFractions[1];
  const p2BoxRight = 5.4 + tblP2On._f1BoxSpecs[1].indentPt + tblP2On._f1BoxSpecs[1].widthPt;
  check(p2Col1Off < p2BoxRight && p2Col1On >= p2BoxRight + 2.0, `f1 পাতা ২: ২য় কলামের প্রস্থ (${p2Col1Off.toFixed(1)} -> ${p2Col1On.toFixed(1)}pt) ১৭-ঘরের বাক্স-গ্রিডের ডান প্রান্ত (${p2BoxRight.toFixed(1)}pt) থেকে নিরাপদ ক্লিয়ারেন্স রাখে`);

  verifyTableGridInvariants(xmlOn, 'f1');
}

// ৪) a16: পাতা ১ (y=250, y=269) খণ্ডিত খাড়া-রেখা টিক ও পাতা ৩ (y=704) গ্রিড-ব্যান্ডের ফুটার সংরেখণ যাচাই
{
  const { irOff, irOn, xmlOn } = results.a16;
  const ovsOff = irOff.pages[0]._a16Fix5Overlays || [];
  const ovsOn = irOn.pages[0]._a16Fix5Overlays || [];
  check(
    ovsOff.some((o) => Math.abs(o.y - 287.2) < 0.5) && !ovsOn.some((o) => Math.abs(o.y - 287.2) < 0.5) &&
    ovsOn.filter((o) => o.y >= 195 && o.y <= 206).length === 2,
    'a16 পাতা ১: আন্তঃব্যান্ড খাড়া-রেখা টিক y=196.2 ও y=199.5-এ ২ খণ্ডে বিভক্ত এবং নিচের অতিরিক্ত y=287.2 টিক অপসারিত'
  );

  const b3Off = irOff.pages[2].bands[3];
  const b3On = irOn.pages[2].bands[3];
  const ftOffY = b3Off.cells[1].items[0].rect.y;
  const ftOnY = b3On.cells[1].items[0].rect.y;
  const figOn = b3On.cells[0].items[0].rect;
  check(
    ftOffY >= 750 && ftOnY >= figOn.y && ftOnY <= figOn.y + figOn.h,
    `a16 পাতা ৩: গ্রিড-ব্যান্ডের ফুটার ভ্রান্ত y=${ftOffY}pt থেকে চিত্রের সমাপতন সীমায় (y=${ftOnY}pt) পুনরুদ্ধারকৃত`
  );

  verifyTableGridInvariants(xmlOn, 'a16');
}

// ৫) a14: পাতা ৩ (y=145) সংযুক্ত ২-লাইনের ক্রমিক নির্দেশনায় স্ল্যাশ-সেতুর গভীরতা যাচাই
{
  const { irOff, irOn, xmlOff, xmlOn } = results.a14;
  const it3Off = irOff.pages[2].bands[3].cells[0].items[0];
  const it3On = irOn.pages[2].bands[3].cells[0].items[0];
  check(
    it3Off._a14SlashBridgeDrop === -7 && it3On._a14SlashBridgeDrop === -10 && it3On._a14LastLineTailDrop === -8,
    'a14 পাতা ৩: সংযুক্ত ২-লাইন নির্দেশনায় _a14SlashBridgeDrop (-7 -> -10) ও _a14LastLineTailDrop (-4 -> -8) গভীরতা বৃদ্ধি'
  );
  check(
    !xmlOff.includes('<w:position w:val="-10"/><w:sz w:val="30"/>') && xmlOn.includes('<w:position w:val="-10"/><w:sz w:val="30"/>'),
    'a14 পাতা ৩: DOCX XML-এ স্ল্যাশ-সেতু ১৫pt ফন্ট ও -১০ অর্ধ-পয়েন্ট অবস্থানে রেন্ডারকৃত'
  );
}

// ৬) a01: পাতা ১ (y=349) দীর্ঘ প্রান্তিক লেখাসহ ইনলাইন লিডার ট্যাব-স্টপ প্রসারণ যাচাই
{
  const { xmlOff, xmlOn } = results.a01;
  check(
    xmlOff.includes('<w:tab w:val="left" w:leader="hyphen" w:pos="4616"/>') &&
    xmlOn.includes('<w:tab w:val="left" w:leader="hyphen" w:pos="4766"/>'),
    'a01 পাতা ১: দীর্ঘ প্রান্তিক লেখার ইনলাইন হাইফেন-লিডার ট্যাব-স্টপ 4616 dxa থেকে 4766 dxa-তে প্রসারিত (dx1=-8 নিরসন)'
  );
  verifyTableGridInvariants(xmlOn, 'a01');
}

// ৭) a07: পাতা ২ (y=123), পাতা ৪ (y=141) ও পাতা ৫ (y=179)-এ টেবিল অক্ষত রেখে ডান-মার্জিন প্রান্তিক বিন্দু সংরক্ষণ যাচাই
{
  const { irOff, irOn, xmlOn } = results.a07;
  for (const pIdx of [1, 3, 4]) {
    const ovOff = irOff.pages[pIdx]._a16Fix5Overlays || [];
    const ovOn = irOn.pages[pIdx]._a16Fix5Overlays || [];
    check(
      ovOff.length === 0 && ovOn.length === 1 && Math.abs(ovOn[0].x - 577.0) <= 0.5 && Math.abs(ovOn[0].y - 179.2) <= 0.5,
      `a07 পাতা ${pIdx + 1}: ছক অক্ষত রেখে ডান-মার্জিন প্রান্তিক বিন্দু (x=${ovOn[0] && ovOn[0].x}, y=${ovOn[0] && ovOn[0].y}) সংরক্ষিত`
    );
  }
  check((irOn.pages[0]._a16Fix5Overlays || []).length === 0 && (irOn.pages[2]._a16Fix5Overlays || []).length === 0, 'a07 পাতা ১ ও পাতা ৩: অপ্রয়োজনীয় পাতায় কোনো ওভারলে যোগ হয়নি');
  verifyTableGridInvariants(xmlOn, 'a07');
}

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
