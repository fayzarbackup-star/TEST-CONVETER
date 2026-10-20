/**
 * A14_BOXSPLIT_v2 — স্বয়ংক্রিয় পরীক্ষা (কোনো বাহ্যিক প্যাকেজ ছাড়া Node.js-এ চলে)
 * পরীক্ষা করে:
 * ১) সুইচ বন্ধ (ডিফল্ট) থাকলে আউটপুট বাইট-প্রতি-বাইট অপরিবর্তিত থাকে (৫টি বেস সুইচ WRAPFIT, NESTBOX, TBLMERGE, A03FIX, A16FIX চালু অবস্থাতেও)।
 * ২) সুইচ চালু (window.__FZ_ON_BOXSPLIT = true বা FZ_ON=BOXSPLIT) থাকলে:
 *    - ক) পাতা ২-এর নিচের দুটি প্রত্যয়ন ফ্রেম-বাক্স ২-কলামের বদলে ১-কলামে থাকে এবং ডান পাশের
 *         "অধ্যক্ষের স্বাক্ষর ও সীল" একই সারিতে ডান-ট্যাবে ('\t') ডান প্রান্তে বসে;
 *    - ক-২) সাধারণ ফ্রেম-বাক্সের ভেতরে খাড়া দাগহীন ২-কলামের গ্রিড-ব্যান্ডও ১-কলামের ডান-ট্যাব লাইনে একীভূত হয়;
 *    - খ) "বিনীত নিবেদন…" অনুচ্ছেদের ২-লাইনের কাঠামো ও প্রথম লাইনের ইনডেন্ট অক্ষুণ্ণ থাকে এবং
 *         প্রতিটি লাইন নিজস্ব ডান-লিডার ট্যাবে ২ লাইনেই সীমাবদ্ধ থাকে (২য় লাইনের প্রস্থ ৪০০pt-এ সংকুচিত হয় না);
 *    - গ) পাতা ৩-এ শিরোনাম-বাক্সের ভেতরের কালিহীন পৃষ্ঠা-নম্বর ("৩") বাদ যায় এবং ১১।–১৪। ক্রমিকের
 *         ঝুলন্ত ইনডেন্ট (-২৩pt), ফন্ট (১২pt) ও উল্লম্ব অবস্থান পুনরুদ্ধার হয়; এবং পাতা ১-এ চ) ক্রমিকের ইনডেন্ট (৫৩.২pt) ও ফন্ট (১৫pt) অক্ষুণ্ণ থাকে।
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

globalThis.window = globalThis;

// বর্তমান প্রোডাকশন বেসের ৫টি ডিফল্ট সুইচ (WRAPFIT, NESTBOX, TBLMERGE, A03FIX, A16FIX) লোড করা
['WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX'].forEach((k) => { globalThis['__FZ_ON_' + k] = true; }); // টেস্ট যে ভিত্তিতে লেখা — প্রোডাকশন-ডিফল্ট বদলালেও স্থির

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const Builder = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

globalThis.FayzarLayoutIR = IR;
globalThis.FayzarLineFit = LF;

const a14Dir = fs.existsSync(path.join(ROOT, 'qa/golden-data/runs/box2/a14/capture.json'))
  ? path.join(ROOT, 'qa/golden-data/runs/box2/a14')
  : path.join(ROOT, 'qa/golden-data/asis/a14');
const captureRaw = JSON.parse(fs.readFileSync(path.join(a14Dir, 'capture.json'), 'utf8'));
const measuresRaw = JSON.parse(fs.readFileSync(path.join(a14Dir, 'measures.json'), 'utf8'));
const goldenIr = JSON.parse(fs.readFileSync(path.join(a14Dir, 'ir.json'), 'utf8'));

const clone = (obj) => JSON.parse(JSON.stringify(obj));

// ১০০px আকারে বাংলা/ইংরেজি লেখার প্রস্থ মাপার ক্যালিব্রেটেড ফাংশন (ব্রাউজারের ক্যানভাস মাপের সমতুল্য)
function measure100(s) {
  let w = 0;
  for (const ch of String(s)) {
    if (ch === '\u09CD') w -= 20;
    else if (/[ঁ-ঃ়া-ৌ]/.test(ch)) w += /[ািীোৌৈে]/.test(ch) ? 20 : 2;
    else if (/[.…·]/.test(ch)) w += 25;
    else if (/\s/.test(ch)) w += 26;
    else if (/[-–—_/()]/.test(ch)) w += 30;
    else w += 46;
  }
  return Math.max(0, w);
}

function flatPageItems(page) {
  const out = [];
  for (const band of page.bands || []) {
    for (const cell of band.cells || []) {
      out.push(...(cell.items || []));
    }
  }
  return out;
}

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  [পাস] ${name}`);
  } else {
    failed++;
    console.error(`  [ব্যর্থ] ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// ============================================================================
// ১. সুইচ বন্ধ (OFF) অবস্থায় বাইট-প্রতি-বাইট অভিন্নতা যাচাই
// ============================================================================
console.log('১. সুইচ বন্ধ (OFF) অবস্থায় আচরণ যাচাই:');
delete globalThis.__FZ_ON_BOXSPLIT;
delete globalThis.__FZ_OFF_BOXSPLIT;
if (typeof process !== 'undefined' && process.env) {
  delete process.env.__FZ_ON_BOXSPLIT;
  delete process.env.FZ_ON;
}

const irOff = IR.build(clone(measuresRaw.cap || captureRaw), clone(measuresRaw.measures), clone(measuresRaw.pageInfo));
LF.fit(irOff, measure100);
const xmlOff = Builder.bodyXml(clone(irOff));
const xmlGoldOff = Builder.bodyXml(clone(goldenIr));

// সুইচ জোরপূর্বক বন্ধ (__FZ_OFF_BOXSPLIT = true) রেখে তুলনা
globalThis.__FZ_ON_BOXSPLIT = true;
globalThis.__FZ_OFF_BOXSPLIT = true;
const irForcedOff = IR.build(clone(measuresRaw.cap || captureRaw), clone(measuresRaw.measures), clone(measuresRaw.pageInfo));
LF.fit(irForcedOff, measure100);
const xmlForcedOff = Builder.bodyXml(clone(irForcedOff));
const xmlGoldForcedOff = Builder.bodyXml(clone(goldenIr));
delete globalThis.__FZ_ON_BOXSPLIT;
delete globalThis.__FZ_OFF_BOXSPLIT;

check(
  'সুইচ বন্ধ থাকলে IR.build + LF.fit আউটপুট বাইট-প্রতি-বাইট অভিন্ন থাকে',
  JSON.stringify(irOff) === JSON.stringify(irForcedOff)
);
check(
  'সুইচ বন্ধ থাকলে Builder.bodyXml (নতুন IR) বাইট-প্রতি-বাইট অভিন্ন থাকে',
  JSON.stringify(xmlOff) === JSON.stringify(xmlForcedOff)
);
check(
  'সুইচ বন্ধ থাকলে গোল্ডেন ir.json থেকে তৈরি DOCX XML বাইট-প্রতি-বাইট অভিন্ন থাকে',
  JSON.stringify(xmlGoldOff) === JSON.stringify(xmlGoldForcedOff)
);

const p2ItemsOff = flatPageItems(irOff.pages[1]);
const tblOff = p2ItemsOff.find((it) => it.kind === 'table');
check(
  'সুইচ বন্ধ থাকলে পাতা ২-এর প্রত্যয়ন ছক আগের মতোই ২-কলামের থাকে',
  tblOff && Array.isArray(tblOff.colFractions) && tblOff.colFractions.length === 2 && tblOff.rows[6].length === 2
);

// ============================================================================
// ২. সুইচ চালু (ON) অবস্থায় a14-এর সমস্যা (ক), (খ) ও পাতা ৩ যাচাই
// ============================================================================
console.log('\n২. সুইচ চালু (window.__FZ_ON_BOXSPLIT = true) অবস্থায় যাচাই:');
globalThis.__FZ_ON_BOXSPLIT = true;

const irOn = IR.build(clone(measuresRaw.cap || captureRaw), clone(measuresRaw.measures), clone(measuresRaw.pageInfo));
LF.fit(irOn, measure100);
const xmlOnObj = Builder.bodyXml(clone(irOn));
const xmlOn = xmlOnObj.xml;

// --- সমস্যা (ক): পাতা ২-এর নিচের দুটি প্রত্যয়ন বাক্স ---
const p2ItemsOn = flatPageItems(irOn.pages[1]);
const tblOn = p2ItemsOn.find((it) => it.kind === 'table');

check(
  'ক-১: প্রত্যয়ন ছকটি ২-কলামের বদলে ১-কলামে রূপান্তরিত হয়েছে (colFractions === null, প্রতি সারিতে ১টি ঘর)',
  tblOn && tblOn.colFractions === null && tblOn.rows.length === 14 && tblOn.rows.every((r) => r.length === 1)
);
check(
  'ক-২: সারি ৬ ও সারি ১৩-তে বাম ও ডান অংশ একই সারিতে ট্যাব (\\t) দিয়ে যুক্ত হয়েছে',
  tblOn &&
    tblOn.rows[6][0].includes('অধ্যক্ষের মোবাইল নং-') &&
    tblOn.rows[6][0].includes('\tঅধ্যক্ষের স্বাক্ষর ও সীল') &&
    tblOn.rows[13][0].includes('অধ্যক্ষের মোবাইল নং-') &&
    tblOn.rows[13][0].includes('\tঅধ্যক্ষের স্বাক্ষর ও সীল')
);
check(
  'ক-৩: প্রত্যয়ন ছকের সারিগুলোর উচ্চতা মাপা কালি-অবস্থান অনুযায়ী নিখুঁত (rowHeightsExact === true)',
  tblOn &&
    tblOn.rowHeightsExact === true &&
    tblOn.rowHeightsPt[5] >= 17 &&
    tblOn.rowHeightsPt[11] >= 17 &&
    tblOn.rowHeightsPt[12] >= 17 &&
    tblOn.rowHeightsPt[6] <= 15.5 &&
    tblOn.rowHeightsPt[13] <= 15.5
);
check(
  'ক-৪: প্রত্যয়ন ছকের ফন্ট বিন্দুহীন লম্বা লাইনের মাপ অনুযায়ী পরিমিত (≤ ৯pt) এবং সারি ৮-এ পর্যাপ্ত বিন্দু অক্ষুণ্ণ আছে',
  tblOn &&
    tblOn.fontPt <= 9 &&
    (tblOn.rows[8][0].match(/\./g) || []).length >= 40
);

const tblStart = xmlOn.lastIndexOf('<w:tbl>', xmlOn.indexOf('বর্তমান কলেজের অধ্যক্ষ কর্তৃক প্রত্যয়ন'));
const tblEnd = xmlOn.indexOf('</w:tbl>', tblStart) + 8;
const certTblXml = xmlOn.slice(tblStart, tblEnd);
const gridCols = certTblXml.match(/<w:gridCol\b[^>]*\/>/g) || [];

check(
  'ক-৫: DOCX XML-এ প্রত্যয়ন ছকে কেবল ১টি <w:gridCol/> আছে (কোনো ৪২pt সরু ডান কলাম নেই)',
  gridCols.length === 1 && gridCols[0].includes('w:w="9146"')
);
check(
  'ক-৬: DOCX XML-এ স্বাক্ষর সারিতে ডান-ট্যাব (<w:tab w:val="right" .../>) ও <w:tab/> রেন্ডার হয়েছে',
  certTblXml.includes('<w:tabs><w:tab w:val="right" w:pos="8520"/></w:tabs>') &&
    certTblXml.includes('<w:r><w:tab/></w:r>')
);

// --- সমস্যা (খ): "বিনীত নিবেদন…" অনুচ্ছেদের লাইন-ভাঙা ও দ্বি-পূরণ লাইনের প্রান্তিক ডট সংরক্ষণ ---
const binitOn = p2ItemsOn.find((it) => (it.text || '').includes('বিনীত নিবেদন'));
check(
  'খ-১: "বিনীত নিবেদন…" অনুচ্ছেদে keepLines === true, ২টি লাইন এবং firstIndentPt === 36 সংরক্ষিত আছে',
  binitOn && binitOn.keepLines === true && Array.isArray(binitOn.lines) && binitOn.lines.length === 2 && binitOn.firstIndentPt === 36
);

const binitXmlIdx = xmlOn.indexOf('বিনীত নিবেদন এই যে, আমি বর্তমানে ');
const binitXmlSlice = xmlOn.slice(Math.max(0, binitXmlIdx - 350), binitXmlIdx + 1200);
check(
  'খ-২: DOCX XML-এ "বিনীত নিবেদন…" অনুচ্ছেদটি ২টি পৃথক <w:p>-তে ডান-লিডার ট্যাবসহ রেন্ডার হয়েছে ("কলেজের একাদশ শ্রেণীর একজন" ১ম লাইনেই আছে)',
  binitXmlSlice.includes('<w:ind w:left="58" w:firstLine="720"/>') &&
    binitXmlSlice.includes('<w:t xml:space="preserve"> কলেজের একাদশ শ্রেণীর একজন</w:t></w:r></w:p>') &&
    binitXmlSlice.includes('<w:t xml:space="preserve">নিয়মিত ছাত্র/ছাত্রী। নিম্নবর্ণিত কারণে আমি </w:t>')
);

const gpaXmlIdx = xmlOn.indexOf('প্রাপ্ত জিপিএ ');
const gpaXmlSlice = xmlOn.slice(xmlOn.lastIndexOf("<w:p>", gpaXmlIdx), xmlOn.indexOf("</w:p>", gpaXmlIdx) + 6);
check(
  'খ-৩: পাতা ২-এ "প্রাপ্ত জিপিএ ... বোর্ড ..."-এ বোর্ডের পরের ডট-লিডার ট্যাব অক্ষুণ্ণ আছে (stripGhostDots মুছে ফেলেনি)',
  gpaXmlSlice.includes('বোর্ড ') && (gpaXmlSlice.match(/w:leader="dot"/g) || []).length === 2
);

// --- পাতা ১ ও পাতা ৩: কালিহীন পৃষ্ঠা-নম্বর, চ) এবং ১১।–১৪। ক্রমিকের ইনডেন্ট/অবস্থান ---
const p1ItemsOn = flatPageItems(irOn.pages[0]);
const choOn = p1ItemsOn.find((it) => (it.text || '').includes('চ)'));
check(
  'গ-০: পাতা ১-এর চ) ক্রমিকে [অসম্পূর্ণ: ...] ও <u> ট্যাগ উপেক্ষা করায় আসল ইনডেন্ট (53.2pt, -17pt) ও ফন্ট (15pt) অক্ষুণ্ণ আছে',
  choOn && choOn.indentPt >= 33 && choOn.firstIndentPt === -17 && choOn.fontPt === 15
);

const p3ItemsOn = flatPageItems(irOn.pages[2]);
const p3PageNo = p3ItemsOn.find((it) => it.type === 'page_number');
const p3Lists = p3ItemsOn.filter((it) => it.type === 'list_item');
const item11 = p3Lists.find((it) => (it.text || '').startsWith('১১।'));
const item14 = p3Lists.find((it) => (it.text || '').startsWith('১৪।'));

check(
  'গ-১: পাতা ৩-এর শিরোনাম-বাক্সের ভেতরের কালিহীন পৃষ্ঠা-নম্বর ("৩") বাদ দেওয়া হয়েছে',
  !p3PageNo && p3Lists.length === 14
);
check(
  'গ-২: পাতা ৩-এর ১১।–১৪। ক্রমিকের ঝুলন্ত ইনডেন্ট (indentPt: 23, firstIndentPt: -23) ও ফন্ট (12pt) পুনরুদ্ধার হয়েছে',
  item11 && item11.indentPt === 23 && item11.firstIndentPt === -23 &&
    item14 && item14.indentPt === 23 && item14.firstIndentPt === -23 && item14.fontPt === 12
);

// --- সাধারণীকরণ পরীক্ষা: ফ্রেম-বাক্সের ভেতরে ২-কলামের গ্রিড-ব্যান্ড থাকলে ১-কলামে ডান-ট্যাবে একীভূত হওয়া ---
const mockPage = {
  page: 1,
  widthPt: 595,
  heightPt: 842,
  scale: 1,
  xform: { left: 0, top: 0, x0: 0, y0: 0, scale: 1 },
  margins: { top: 36, left: 54, right: 54, bottom: 36 },
  bands: [
    {
      kind: 'flow',
      y0: 105,
      y1: 120,
      gapBeforePt: 0,
      cells: [{ x0: 54, x1: 541, items: [{ kind: 'para', text: 'প্রত্যয়ন শিরোনাম', lines: ['প্রত্যয়ন শিরোনাম'], rect: { x: 220, y: 105, w: 150, h: 14 }, fontPt: 11, indentPt: 166 }] }]
    },
    {
      kind: 'grid',
      y0: 160,
      y1: 174,
      gapBeforePt: 40,
      cells: [
        { x0: 54, x1: 380, items: [{ kind: 'para', text: 'অধ্যক্ষের মোবাইল নং- .........................', lines: ['অধ্যক্ষের মোবাইল নং- .........................'], rect: { x: 60, y: 160, w: 200, h: 12 }, fontPt: 10, indentPt: 6 }] },
        { x0: 380, x1: 541, items: [{ kind: 'para', text: 'অধ্যক্ষের স্বাক্ষর ও সীল', lines: ['অধ্যক্ষের স্বাক্ষর ও সীল'], rect: { x: 420, y: 160, w: 95, h: 12 }, fontPt: 10, indentPt: 40 }] }
      ]
    }
  ]
};
IR.applyBoxFrames(mockPage, [{ x0: 55, y0: 100, x1: 535, y1: 185, dashed: false }]);
const mergedBand = mockPage.bands[1];
const mergedItem = mergedBand && mergedBand.cells && mergedBand.cells[0] && mergedBand.cells[0].items[0];
const mockXml = Builder.bodyXml({ pages: [mockPage], warnings: [] }).xml;

check(
  'ঘ-১: ফ্রেম-বাক্সের ভেতরে খাড়া দাগহীন ২-কলামের স্বাক্ষর গ্রিড-ব্যান্ড ১-কলামের ডান-ট্যাব প্রবাহে একীভূত হয়',
  mergedBand.kind === 'flow' &&
    mergedBand.cells.length === 1 &&
    mergedItem &&
    mergedItem.rightTab === true &&
    mergedItem.tabLines[0].includes('\tঅধ্যক্ষের স্বাক্ষর ও সীল') &&
    mockXml.includes('<w:tab w:val="right"')
);

// --- FZ_ON=BOXSPLIT পরিবেশ-চলক (env) দিয়ে সুইচ চালু যাচাই ---
delete globalThis.__FZ_ON_BOXSPLIT;
process.env.FZ_ON = 'BOXSPLIT';
const irEnvOn = IR.build(clone(measuresRaw.cap || captureRaw), clone(measuresRaw.measures), clone(measuresRaw.pageInfo));
const tblEnvOn = flatPageItems(irEnvOn.pages[1]).find((it) => it.kind === 'table');
check(
  'ঙ-১: FZ_ON=BOXSPLIT পরিবেশ-চলক দিয়েও সুইচ সক্রিয় হয়',
  tblEnvOn && tblEnvOn.colFractions === null && tblEnvOn.rows.every((r) => r.length === 1)
);
delete process.env.FZ_ON;

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
