/**
 * INDENT_TYPE_v1 অটোমেটেড টেস্ট স্যুট (tests/indentfix.test.mjs)
 * অফলাইনে কোনো বাহ্যিক নির্ভরতা ছাড়া সরাসরি `node tests/indentfix.test.mjs` দিয়ে চালানো যাবে।
 * যাচাই করে:
 * ১) সুইচ বন্ধ থাকলে (__FZ_OFF_INDENTFIX = true বা সুইচ না দিলে) IR এবং DOCX XML বাইট-টু-বাইট অভিন্ন থাকে।
 * ২) সুইচ চালু করে আবার বন্ধ করলে (restoreIndentFixIr) স্ন্যাপশট থেকে পূর্বাবস্থা হুবহু ফিরে আসে।
 * ৩) সুইচ চালু থাকলে (__FZ_ON_INDENTFIX = true) a16, a14, a01, a03, a06 ও a07-এর প্রত্যাশিত জ্যামিতিক সংস্কার প্রযুক্ত হয়।
 * ৪) সমস্ত টেবিলের কঠোর জ্যামিতিক শর্ত (একক <w:tbl>, কলাম প্রস্থের যোগফল == টেবিল প্রস্থ, অভিন্ন কলাম-গ্রিড সীমা, অক্ষত বর্ডার) বজায় থাকে।
 * ৫) অপ্রভাবিত নমুনার (f1, a18, a08, a12, a13, a02 ধাঁচের) পাতা ও টেবিল বাইট-টু-বাইট অপরিবর্তিত থাকে।
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const BLD = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const GOLDEN_DIRS = {
  a16: path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a16'),
  a14: path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a14'),
  a07: path.join(ROOT, 'qa/golden-data/runs/S25_18025270/a07'),
  a03: path.join(ROOT, 'qa/golden-data/runs/S26_3b93d252/a03'),
  a06: path.join(ROOT, 'qa/golden-data/runs/S26_3b93d252/a06'),
  a01: path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a01')
};

const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT',
  'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4',
  'RULES2', 'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX', 'A02FIX',
  'A06FIX', 'A07FIX6', 'F1FIX', 'A18FIX', 'A08FIX', 'A16FIX6', 'F1FIX2'
];

function setBaseSwitches(on) {
  for (const k of BASE_SWITCHES) {
    if (on) {
      globalThis['__FZ_ON_' + k] = true;
      delete globalThis['__FZ_OFF_' + k];
    } else {
      delete globalThis['__FZ_ON_' + k];
      delete globalThis['__FZ_OFF_' + k];
    }
  }
}

function setIndentFix(state) {
  if (state === true) {
    globalThis.__FZ_ON_INDENTFIX = true;
    delete globalThis.__FZ_OFF_INDENTFIX;
  } else if (state === false) {
    delete globalThis.__FZ_ON_INDENTFIX;
    globalThis.__FZ_OFF_INDENTFIX = true;
  } else {
    delete globalThis.__FZ_ON_INDENTFIX;
    delete globalThis.__FZ_OFF_INDENTFIX;
  }
}

function loadRawIr(name) {
  return JSON.parse(fs.readFileSync(path.join(GOLDEN_DIRS[name], 'ir.json'), 'utf8'));
}

/**
 * শীর্ষ-স্তরের <w:tbl> ব্লকগুলো বের করে আনা (নেস্টেড সাব-টেবিল বাদে বাইরের টেবিলগুলো আলাদা করা)
 */
function extractTopLevelTables(xml) {
  const tables = [];
  const re = /<\/?w:tbl(?=\s|>)/g;
  let depth = 0;
  let start = -1;
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[0] === '<w:tbl') {
      if (depth === 0) start = m.index;
      depth++;
    } else {
      depth--;
      if (depth === 0 && start >= 0) {
        tables.push(xml.slice(start, m.index + '</w:tbl>'.length));
        start = -1;
      }
    }
  }
  return tables;
}

/**
 * একটি <w:tbl> ব্লকের ভেতরের শুধু নিজস্ব <w:tr> সারিগুলো বের করা (নেস্টেড টেবিলের সারি বাদে)
 */
function extractDirectRows(tblXml) {
  const rows = [];
  const tokenRe = /<\/?w:tbl(?=\s|>)|<\/?w:tr(?=\s|>)/g;
  let tblDepth = 0;
  let trStart = -1;
  let m;
  while ((m = tokenRe.exec(tblXml)) !== null) {
    const tok = m[0];
    if (tok === '<w:tbl') {
      tblDepth++;
    } else if (tok === '</w:tbl') {
      tblDepth--;
    } else if (tok === '<w:tr' && tblDepth === 1) {
      trStart = m.index;
    } else if (tok === '</w:tr' && tblDepth === 1 && trStart >= 0) {
      rows.push(tblXml.slice(trStart, m.index + '</w:tr>'.length));
      trStart = -1;
    }
  }
  return rows;
}

/**
 * একটি <w:tr> সারির ভেতরের শুধু নিজস্ব <w:tc> ঘরগুলোর প্রস্থ ও gridSpan বের করা
 */
function extractDirectCells(trXml) {
  const cells = [];
  const tokenRe = /<\/?w:tbl(?=\s|>)|<\/?w:tc(?=\s|>)/g;
  let tblDepth = 0;
  let tcStart = -1;
  let m;
  while ((m = tokenRe.exec(trXml)) !== null) {
    const tok = m[0];
    if (tok === '<w:tbl') {
      tblDepth++;
    } else if (tok === '</w:tbl') {
      tblDepth--;
    } else if (tok === '<w:tc' && tblDepth === 0) {
      tcStart = m.index;
    } else if (tok === '</w:tc' && tblDepth === 0 && tcStart >= 0) {
      const tcXml = trXml.slice(tcStart, m.index + '</w:tc>'.length);
      const tcPrMatch = /<w:tcPr>([\s\S]*?)<\/w:tcPr>/.exec(tcXml);
      const tcPr = tcPrMatch ? tcPrMatch[1] : '';
      const wMatch = /<w:tcW w:w="(\d+)"/.exec(tcPr);
      const spanMatch = /<w:gridSpan w:val="(\d+)"/.exec(tcPr);
      cells.push({
        w: wMatch ? Number(wMatch[1]) : 0,
        span: spanMatch ? Number(spanMatch[1]) : 1,
        tcPr
      });
      tcStart = -1;
    }
  }
  return cells;
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error('ব্যর্থ:', msg);
  }
}

// ============================================================================
// ১. সুইচ গেটিং ও বাইট-টু-বাইট অভিন্নতা পরীক্ষা (OFF বনাম baseline এবং ON -> OFF restore)
// ============================================================================
for (const name of Object.keys(GOLDEN_DIRS)) {
  // ক) কোনো সুইচ ছাড়া (ন্যূনতম পরিবেশ) OFF বনাম __FZ_OFF_INDENTFIX=true
  setBaseSwitches(false);
  setIndentFix(null);
  const irBaseMin = loadRawIr(name);
  LF.fit(irBaseMin);
  const xmlBaseMin = BLD.bodyXml(irBaseMin).xml;

  setIndentFix(false);
  const irOffMin = loadRawIr(name);
  LF.fit(irOffMin);
  const xmlOffMin = BLD.bodyXml(irOffMin).xml;

  assert(JSON.stringify(irBaseMin) === JSON.stringify(irOffMin), `${name}: ন্যূনতম পরিবেশে INDENTFIX বন্ধ থাকলে IR অভিন্ন`);
  assert(xmlBaseMin === xmlOffMin, `${name}: ন্যূনতম পরিবেশে INDENTFIX বন্ধ থাকলে DOCX XML বাইট-টু-বাইট অভিন্ন`);

  // খ) পূর্ণ পরিবেশে (BASE_SWITCHES চালু) OFF বনাম ON -> OFF restore
  setBaseSwitches(true);
  setIndentFix(false);
  const irBaseFull = loadRawIr(name);
  LF.fit(irBaseFull);
  const strBaseFull = JSON.stringify(irBaseFull);
  const xmlBaseFull = BLD.bodyXml(irBaseFull).xml;

  setIndentFix(true);
  const irToggle = loadRawIr(name);
  LF.fit(irToggle);
  setIndentFix(false);
  LF.repairIndentFixIr(irToggle);
  const strRestored = JSON.stringify(irToggle);
  const xmlRestored = BLD.bodyXml(irToggle).xml;

  assert(strBaseFull === strRestored, `${name}: INDENTFIX চালু করে বন্ধ করলে (restoreIndentFixIr) IR বাইট-টু-বাইট পূর্বাবস্থায় ফেরে`);
  assert(xmlBaseFull === xmlRestored, `${name}: INDENTFIX চালু করে বন্ধ করলে DOCX XML বাইট-টু-বাইট পূর্বাবস্থায় ফেরে`);
}

// ============================================================================
// ২. নমুনাভিত্তিক জ্যামিতিক সংস্কার যাচাই (শুধু __FZ_ON_INDENTFIX = true এবং পূর্ণ সুইচ উভয় মোডে)
// ============================================================================

// ২.১: a16 পাতা ১ — বাম মার্জিন খাড়া-রেখা ওভারলে, ৪র্থ দফার বাম টিক-লেজ ও ৫ম/৬ষ্ঠ দফার বিচ্ছিন্ন খাড়া রেখা-খণ্ড
for (const withBase of [false, true]) {
  setBaseSwitches(withBase);
  setIndentFix(true);
  const irA16 = loadRawIr('a16');
  LF.fit(irA16);
  const p1 = irA16.pages[0];
  const ovs = p1._a16Fix5Overlays;
  assert(Array.isArray(ovs) && ovs.length === 17, `a16 (base=${withBase}): পাতা ১-এ ১৭টি খাড়া-রেখা ওভারলে খণ্ড তৈরি হয়েছে`);
  const hasTick1 = ovs && ovs.some((o) => Math.abs(o.y - 196.2) <= 0.5 && Math.abs(o.h - 1.8) <= 0.3);
  const hasTick2 = ovs && ovs.some((o) => Math.abs(o.y - 199.5) <= 0.5 && Math.abs(o.h - 6.3) <= 0.4);
  const hasSpurious287 = ovs && ovs.some((o) => Math.abs(o.y - 287.2) <= 1.0);
  const hasLeftTail = ovs && ovs.some((o) => Math.abs(o.x - 92.0) <= 0.5 && Math.abs(o.y - 558.5) <= 1.0 && o.w === 6.0);
  const tailSegs = ovs ? ovs.filter((o) => o.y >= 576 && Math.abs(o.x - 98.8) <= 0.5) : [];
  assert(hasTick1 && hasTick2 && !hasSpurious287, `a16 (base=${withBase}): y=196.2 ও y=199.5 টিকদ্বয় আছে এবং ভ্রান্ত y=287.2 টিক বর্জিত`);
  assert(hasLeftTail, `a16 (base=${withBase}): y=558.5-এ ৬pt বাম টিক-লেজ (x=92.0) পুনরুদ্ধার হয়েছে`);
  assert(tailSegs.length === 3, `a16 (base=${withBase}): ৫ম ও ৬ষ্ঠ দফার ৩টি লাইনের জন্য ৩টি বিচ্ছিন্ন খাড়া রেখা-খণ্ড সংযোজিত`);
  const gap1 = tailSegs[0].y - (309.0 + 265.0);
  const gap2 = tailSegs[1].y - (tailSegs[0].y + tailSegs[0].h);
  const gap3 = tailSegs[2].y - (tailSegs[1].y + tailSegs[1].h);
  assert(gap1 >= 3.5 && gap2 >= 3.5 && gap3 >= 3.5, `a16 (base=${withBase}): দফা ৪, ৫ ও ৬-এর খাড়া রেখা-খণ্ডগুলোর উল্লম্ব ফাঁক >= ৩.5pt (${gap1.toFixed(1)}, ${gap2.toFixed(1)}, ${gap3.toFixed(1)})`);
  const outA16 = BLD.bodyXml(irA16);
  assert(outA16.xml.includes('<wp:anchor') && outA16.media.length >= 1, `a16 (base=${withBase}): DOCX XML-এ ওভারলে ড্রয়িং সংযোজিত`);
}

// ২.২: a14 পাতা ১ ও পাতা ৩ — দ্বি-কলাম স্বাক্ষর গ্রিড সংযোগ, নিচের স্ক্যান-দাগ ও ২-লাইনের ঝুলন্ত তালিকার উল্লম্ব সেতুবন্ধন
for (const withBase of [false, true]) {
  setBaseSwitches(withBase);
  setIndentFix(true);
  const irA14 = loadRawIr('a14');
  LF.fit(irA14);
  const p1 = irA14.pages[0];
  const gridBand = p1.bands.find((b) => b.kind === 'grid' && b.y0 >= 640);
  const leftIt = gridBand && gridBand.cells[0].items[0];
  const figBand = p1.bands.find((b) => b.kind === 'flow' && b.cells[0].items.some((x) => x.kind === 'figure' && x.rect && x.rect.y >= 695));
  const initFig = figBand && figBand.cells[0].items.find((x) => x.kind === 'figure' && x.rect && x.rect.y >= 695);
  assert(leftIt && leftIt.lineSpacingPt === 16.5 && leftIt._a14LastLineRaise === 3, `a14 পাতা ১ (base=${withBase}): বাম স্বাক্ষর অনুচ্ছেদে lineSpacingPt=16.5 ও _a14LastLineRaise=3`);
  assert(initFig && initFig.rect.y === 704.0 && initFig.rect.h === 44.5, `a14 পাতা ১ (base=${withBase}): ভাসমান আদ্যক্ষর চিত্র y=704.0, h=44.5-এ স্থাপিত`);
  assert(Array.isArray(p1._a16Fix5Overlays) && p1._a16Fix5Overlays.some((o) => o.x === 14.0 && o.y === 823.5 && o.w === 94.0), `a14 পাতা ১ (base=${withBase}): নিচের স্ক্যান-দাগ ওভারলে (x=14, y=823.5, w=94) সংযোজিত`);

  const p3 = irA14.pages[2];
  const bridgeBand = p3.bands.find((b) => b.kind === 'flow' && b.cells[0].items[0] && b.cells[0].items[0].rect && Math.abs(b.cells[0].items[0].rect.y - 145.4) <= 1.5);
  const listIt = bridgeBand && bridgeBand.cells[0].items[0];
  assert(listIt && Math.abs(listIt.indentPt - 21.1) <= 0.2 && Math.abs(listIt.firstIndentPt + 21.1) <= 0.2 && listIt.lineSpacingPt === 14.0 && listIt._a14SlashBridgeDrop === -11, `a14 পাতা ৩ (base=${withBase}): ২-লাইনের ক্রমিক দফায় indentPt=21.1, firstIndentPt=-21.1, lineSpacingPt=14.0, _a14SlashBridgeDrop=-11`);
  const xmlA14 = BLD.bodyXml(irA14).xml;
  assert(/<w:position w:val="-11"\/><w:sz w:val="3[256]"\/>/.test(xmlA14), `a14 পাতা ৩ (base=${withBase}): DOCX XML-এ স্ল্যাশ-সেতুবন্ধন রানে position=-11 ও বর্ধিত ফন্ট প্রযুক্ত`);
}

// ২.৩: a01 পাতা ২ — ডান-ঘেঁষা ৩-লাইনের মাঝ-সাজানো স্বাক্ষর ব্লকের ১ম ও ২য় লাইনের বাম-প্রান্ত সমন্বয়
for (const withBase of [false, true]) {
  setBaseSwitches(withBase);
  setIndentFix(true);
  const irA01 = loadRawIr('a01');
  LF.fit(irA01);
  const p2 = irA01.pages[1];
  const sigIt = p2.bands[5].cells[0].items[0];
  assert(sigIt && sigIt.centerShiftPt === 90.6 && sigIt._indentFixLineNbsp && sigIt._indentFixLineNbsp[0] === 2, `a01 পাতা ২ (base=${withBase}): ৩-লাইনের স্বাক্ষর ব্লকে centerShiftPt=90.6 ও ১ম লাইনে ২টি অদৃশ্য স্পেস`);
  const xmlA01 = BLD.bodyXml(irA01).xml;
  assert(xmlA01.includes('<w:ind w:left="3624"/><w:jc w:val="center"/>'), `a01 পাতা ২ (base=${withBase}): DOCX XML-এ <w:ind w:left="3624"/> প্রযুক্ত`);
  assert(xmlA01.includes('\u00a0\u00a0</w:t>'), `a01 পাতা ২ (base=${withBase}): DOCX XML-এ ১ম লাইনের শেষে ২টি non-breaking space প্রযুক্ত`);
}

// ২.৪: a03 পাতা ২ — ২-বাক্সের বিভক্ত ছকের (splitBoxCols=[true,false,true]) বাহ্যিক প্রস্থ ও বাম ইনডেন্ট সমন্বয়
for (const withBase of [false, true]) {
  setBaseSwitches(withBase);
  setIndentFix(true);
  const irA03 = loadRawIr('a03');
  LF.fit(irA03);
  const p2 = irA03.pages[1];
  const splitTbl = p2.bands[18].cells[0].items[0];
  assert(splitTbl && splitTbl.heightPt === 56.5 && splitTbl.rowHeightsPt[0] === 56.5 && splitTbl.exactRuleHeights === true, `a03 পাতা ২ (base=${withBase}): বিভক্ত বাক্স-ছকের উচ্চতা ৫৬.৫pt নির্ধারিত`);
  const xmlA03 = BLD.bodyXml(irA03).xml;
  assert(/<w:tblW w:w="1011[34]" w:type="dxa"\/><w:tblInd w:w="348" w:type="dxa"\/>/.test(xmlA03), `a03 পাতা ২ (base=${withBase}): বিভক্ত বাক্স-ছকে tblW=10113/10114 dxa (505.7pt) ও tblInd=348 dxa (17.4pt -> বাম বর্ডার x0=48pt)`);
}

// ২.৫: a06 পাতা ১ — ৩টি স্তূপীকৃত ডান-প্রান্তিক লিডার+লেবেল অনুচ্ছেদের বাম-প্রান্ত সমন্বয়
for (const withBase of [false, true]) {
  setBaseSwitches(withBase);
  setIndentFix(true);
  const irA06 = loadRawIr('a06');
  LF.fit(irA06);
  const p1 = irA06.pages[0];
  const ldrItems = [p1.bands[4].cells[0].items[0], p1.bands[5].cells[0].items[0], p1.bands[6].cells[0].items[0]];
  assert(ldrItems[0].indentPt === 95 && ldrItems[1].indentPt === 94 && ldrItems[2].indentPt === 100.4, `a06 পাতা ১ (base=${withBase}): ৩টি লিডার+লেবেল অনুচ্ছেদে indentPt = [95, 94, 100.4]`);
  const xmlA06 = BLD.bodyXml(irA06).xml;
  assert(xmlA06.includes('<w:ind w:left="2008"/>') && xmlA06.includes('<w:tab w:val="left" w:leader="hyphen" w:pos="5916"/>'), `a06 পাতা ১ (base=${withBase}): ৩য় লিডার অনুচ্ছেদে w:left=2008 dxa ও অপরিবর্তিত ট্যাব-স্টপ pos=5916 dxa`);
}

// ২.৬: a07 পাতা ২ — চওড়া ১-লাইনের বোল্ড নির্দেশনা অনুচ্ছেদের বাম-প্রান্ত স্থিরকরণ ও প্রস্থ পূরণ
for (const withBase of [false, true]) {
  setBaseSwitches(withBase);
  setIndentFix(true);
  const irA07 = loadRawIr('a07');
  LF.fit(irA07);
  const p2 = irA07.pages[1];
  const instrIt = p2.bands[4].cells[0].items[0];
  assert(instrIt && instrIt.align === 'l' && instrIt.indentPt === 37.2 && instrIt.centerShiftPt === null && instrIt.fontPt === 13 && instrIt.charSpacingPt === 0.35, `a07 পাতা ২ (base=${withBase}): নির্দেশনা অনুচ্ছেদে align=l, indentPt=37.2, fontPt=13, charSpacingPt=0.35`);
  const xmlA07 = BLD.bodyXml(irA07).xml;
  assert(xmlA07.includes('<w:ind w:left="744"/><w:jc w:val="left"/>') && xmlA07.includes('<w:spacing w:val="7"/>'), `a07 পাতা ২ (base=${withBase}): DOCX XML-এ w:left=744 dxa (x0=79.7pt) ও spacing=7 (0.35pt) প্রযুক্ত`);
}

// ============================================================================
// ৩. কঠোর টেবিল অখণ্ডতা যাচাই (সব গোল্ডেন ফাইলের সব টেবিলের জন্য)
// ============================================================================
setBaseSwitches(true);
for (const [name, dir] of Object.entries(GOLDEN_DIRS)) {
  setIndentFix(false);
  const irOff = loadRawIr(name);
  LF.fit(irOff);
  const xmlOff = BLD.bodyXml(irOff).xml;
  const tblsOff = extractTopLevelTables(xmlOff);

  setIndentFix(true);
  const irOn = loadRawIr(name);
  LF.fit(irOn);
  const xmlOn = BLD.bodyXml(irOn).xml;
  const tblsOn = extractTopLevelTables(xmlOn);

  // ১) টেবিল সংখ্যা অপরিবর্তিত (কোনো টেবিল ভেঙে ২টি হয়নি বা মুছে যায়নি)
  assert(tblsOn.length === tblsOff.length, `${name}: শীর্ষ-স্তরের টেবিল সংখ্যা অপরিবর্তিত (${tblsOn.length})`);

  // a07, a16, a06, a01-এ সব টেবিল XML বাইট-টু-বাইট অভিন্ন থাকা উচিত; a14-এ সব বর্ডারযুক্ত ছক (পাতা ২) অভিন্ন থাকা উচিত
  if (name !== 'a03' && name !== 'a14') {
    assert(JSON.stringify(tblsOn) === JSON.stringify(tblsOff), `${name}: সকল টেবিলের XML বাইট-টু-বাইট সম্পূর্ণ অপরিবর্তিত`);
  } else if (name === 'a14') {
    const borderedOff = tblsOff.filter((t) => t.includes('w:val="single"'));
    const borderedOn = tblsOn.filter((t) => t.includes('w:val="single"'));
    assert(JSON.stringify(borderedOn) === JSON.stringify(borderedOff), `a14: সকল বর্ডারযুক্ত ছকের XML বাইট-টু-বাইট সম্পূর্ণ অপরিবর্তিত`);
  }

  // ২) প্রতিটি টেবিলের প্রতিটি সারির কলাম প্রস্থের যোগফল == টেবিল প্রস্থ এবং কলাম-গ্রিড সীমা অভিন্ন
  tblsOn.forEach((tXml, ti) => {
    const tblWMatch = /<w:tblPr>[\s\S]*?<w:tblW w:w="(\d+)"/.exec(tXml);
    const tblW = tblWMatch ? Number(tblWMatch[1]) : 0;
    const gridCols = [...(/<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/.exec(tXml)?.[1] || '').matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]));
    const gridSum = gridCols.reduce((a, b) => a + b, 0);
    assert(tblW > 0 && Math.abs(tblW - gridSum) <= 2, `${name} টেবিল #${ti + 1}: tblW (${tblW}) == tblGrid যোগফল (${gridSum})`);

    const gridEdges = [0];
    for (const gw of gridCols) gridEdges.push(gridEdges[gridEdges.length - 1] + gw);

    const rows = extractDirectRows(tXml);
    assert(rows.length >= 1, `${name} টেবিল #${ti + 1}: অন্তত ১টি সারি বিদ্যমান`);

    rows.forEach((rXml, ri) => {
      const cells = extractDirectCells(rXml);
      const rowSum = cells.reduce((a, c) => a + c.w, 0);
      const spanSum = cells.reduce((a, c) => a + c.span, 0);
      assert(Math.abs(rowSum - tblW) <= 2, `${name} টেবিল #${ti + 1} সারি #${ri + 1}: ঘরের প্রস্থের যোগফল (${rowSum}) == tblW (${tblW})`);
      assert(spanSum === gridCols.length, `${name} টেবিল #${ti + 1} সারি #${ri + 1}: মোট কলাম স্প্যান (${spanSum}) == গ্রিড কলাম সংখ্যা (${gridCols.length})`);

      // প্রতিটি ঘরের ডান সীমা ঠিক কলাম-গ্রিডের সীমার সাথে মেলে কিনা
      let cumW = 0;
      let colIdx = 0;
      for (const cell of cells) {
        cumW += cell.w;
        colIdx += cell.span;
        const expectedEdge = gridEdges[colIdx];
        assert(Math.abs(cumW - expectedEdge) <= 2, `${name} টেবিল #${ti + 1} সারি #${ri + 1}: কলাম সীমা (${cumW}) == গ্রিড সীমা (${expectedEdge})`);
      }
    });
  });
}

// ============================================================================
// ৪. অপ্রভাবিত নমুনার (f1, a18, a08, a12, a13, a02 ধাঁচের) অপরিবর্তনীয়তা পরীক্ষা
// ============================================================================
const unaffectedPages = [
  { name: 'a16_p2_to_p9', pages: loadRawIr('a16').pages.slice(1) },
  { name: 'a14_p2', pages: [loadRawIr('a14').pages[1]] },
  { name: 'a07_p1_p3_p4_p5', pages: [loadRawIr('a07').pages[0], loadRawIr('a07').pages[2], loadRawIr('a07').pages[3], loadRawIr('a07').pages[4]] },
  { name: 'a03_p1', pages: [loadRawIr('a03').pages[0]] },
  { name: 'a01_p1', pages: [loadRawIr('a01').pages[0]] }
,
  {
    name: 'synthetic_f1_noVRules_form',
    pages: [{
      page: 1, widthPt: 595, heightPt: 842, bodyFontPt: 11,
      margins: { top: 44, right: 55, bottom: 44, left: 57.6 },
      bands: [{
        kind: 'flow', y0: 155, y1: 680, gapBeforePt: 0,
        cells: [{
          x0: 57.6, x1: 540,
          items: [{
            kind: 'table', type: 'table', borderless: false, noVRules: true,
            widthPt: 482, heightPt: 520, indentPt: 0, fontPt: 11,
            colFractions: [0.35, 0.65], colAligns: ['l', 'l'],
            rows: Array.from({ length: 24 }, (_, i) => [`সারি ${i + 1}`, `মান ${i + 1}`])
          }]
        }]
      }]
    }]
  },
  {
    name: 'synthetic_a18_28x4_table',
    pages: [{
      page: 1, widthPt: 595, heightPt: 842, bodyFontPt: 11,
      margins: { top: 42, right: 42, bottom: 42, left: 54 },
      bands: [{
        kind: 'flow', y0: 90, y1: 720, gapBeforePt: 0,
        cells: [{
          x0: 54, x1: 553,
          items: [{
            kind: 'table', type: 'table', borderless: false,
            widthPt: 499, heightPt: 620, indentPt: 0, fontPt: 11,
            colFractions: [0.1, 0.4, 0.25, 0.25], colAligns: ['c', 'l', 'l', 'l'],
            rows: Array.from({ length: 28 }, (_, i) => [`${i + 1}`, `বিবরণ ${i + 1}`, '', ''])
          }]
        }]
      }]
    }]
  },
  {
    name: 'synthetic_a08_12x3_table',
    pages: [{
      page: 1, widthPt: 595, heightPt: 842, bodyFontPt: 12,
      margins: { top: 50, right: 50, bottom: 50, left: 57 },
      bands: [{
        kind: 'flow', y0: 210, y1: 520, gapBeforePt: 0,
        cells: [{
          x0: 57, x1: 545,
          items: [{
            kind: 'table', type: 'table', borderless: false,
            widthPt: 488, heightPt: 310, indentPt: 0, fontPt: 12,
            colFractions: [0.12, 0.58, 0.30], colAligns: ['c', 'l', 'c'],
            rows: Array.from({ length: 12 }, (_, i) => [`${i + 1}`, `দফা ${i + 1}`, ''])
          }]
        }]
      }]
    }]
  },
  {
    name: 'synthetic_a12_7col_table',
    pages: [{
      page: 1, widthPt: 595, heightPt: 842, bodyFontPt: 12,
      margins: { top: 48, right: 48, bottom: 48, left: 54 },
      bands: [{
        kind: 'flow', y0: 260, y1: 420, gapBeforePt: 0,
        cells: [{
          x0: 54, x1: 547,
          items: [{
            kind: 'table', type: 'table', borderless: false,
            widthPt: 493, heightPt: 160, indentPt: 0, fontPt: 11,
            colFractions: [0.08, 0.22, 0.14, 0.14, 0.14, 0.14, 0.14],
            rows: Array.from({ length: 5 }, (_, i) => Array.from({ length: 7 }, (__, j) => `${i}:${j}`))
          }]
        }]
      }]
    }]
  },
  {
    name: 'synthetic_a13_colon_list',
    pages: [{
      page: 1, widthPt: 595, heightPt: 842, bodyFontPt: 13,
      margins: { top: 54, right: 54, bottom: 54, left: 60 },
      bands: [{
        kind: 'flow', y0: 200, y1: 220, gapBeforePt: 0,
        cells: [{
          x0: 60, x1: 540,
          items: [{
            kind: 'para', type: 'list_item', align: 'l', fontPt: 13,
            indentPt: 0, firstIndentPt: 0, rect: { x: 60, y: 200, w: 470, h: 16 },
            tabLines: ['০১। নাম	: ................................'], tabStops: [217], lines: ['০১। নাম : ................................'], text: '০১। নাম : ................................'
          }]
        }]
      }]
    }]
  },
  {
    name: 'synthetic_a02_framed_page',
    pages: [{
      page: 1, widthPt: 595, heightPt: 842, bodyFontPt: 11,
      frame: { style: 'double', spacePt: { top: 24, right: 24, bottom: 24, left: 24 } },
      margins: { top: 54, right: 54, bottom: 54, left: 54 },
      bands: [{
        kind: 'flow', y0: 120, y1: 135, gapBeforePt: 0,
        cells: [{
          x0: 54, x1: 541,
          items: [{
            kind: 'para', type: 'heading', align: 'c', bold: true, fontPt: 13,
            indentPt: 140, centerShiftPt: 0, rect: { x: 194, y: 120, w: 207, h: 14 },
            lines: ['অনাপত্তি সনদ (NOC)'], text: 'অনাপত্তি সনদ (NOC)'
          }]
        }]
      }]
    }]
  }
];

for (const sample of unaffectedPages) {
  setBaseSwitches(true);
  setIndentFix(false);
  const irOff = { pages: JSON.parse(JSON.stringify(sample.pages)) };
  LF.fit(irOff);
  const xmlOff = BLD.bodyXml(irOff).xml;

  setIndentFix(true);
  const irOn = { pages: JSON.parse(JSON.stringify(sample.pages)) };
  LF.fit(irOn);
  const xmlOn = BLD.bodyXml(irOn).xml;

  assert(JSON.stringify(irOff) === JSON.stringify(irOn), `${sample.name}: অপ্রভাবিত পাতার IR বাইট-টু-বাইট অভিন্ন`);
  assert(xmlOff === xmlOn, `${sample.name}: অপ্রভাবিত পাতার DOCX XML বাইট-টু-বাইট অভিন্ন`);
}

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
