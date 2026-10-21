import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// প্রোডাকশনে ডিফল্ট-চালু ২১টি ভিত্তি সুইচ সরাসরি সক্রিয় করা (switch-defaults.js require না করে)
const DEFAULT_ON_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4', 'RULES2',
  'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX', 'A02FIX'
];
for (const sw of DEFAULT_ON_SWITCHES) {
  globalThis['__FZ_ON_' + sw] = true;
}

const LayoutIR = require(path.join(rootDir, 'js/layout-engine/faithful/layout-ir.js'));
const LineFit = require(path.join(rootDir, 'js/layout-engine/faithful/line-fit.js'));
const Builder = require(path.join(rootDir, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const measPath = path.join(rootDir, 'qa/golden-data/runs/S21_bb0e8106/f1/measures.json');
const goldenIrPath = path.join(rootDir, 'qa/golden-data/runs/S21_bb0e8106/f1/ir.json');
const meas = JSON.parse(fs.readFileSync(measPath, 'utf8'));
const goldenIr = JSON.parse(fs.readFileSync(goldenIrPath, 'utf8'));

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

// সহায়ক: শীর্ষ-স্তরের ও নেস্টেড সব <w:tbl> ব্লক নিষ্কাশন
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
      tables.push({ start, end, depth: stack.length, xml: xml.slice(start, end) });
    }
  }
  return tables;
}

// সহায়ক: একটি <w:tbl>-এর ভেতরের নেস্টেড টেবিলগুলো মাস্ক করে শুধু তার নিজস্ব সারি ও গ্রিড বিশ্লেষণ
function stripNestedTables(tblXml) {
  let out = '';
  let depth = 0;
  let lastIdx = 0;
  const tagRe = /<\/?w:tbl(?=\s|>)/g;
  let m;
  while ((m = tagRe.exec(tblXml)) !== null) {
    if (m[0] === '<w:tbl') {
      depth++;
      if (depth === 2) {
        out += tblXml.slice(lastIdx, m.index);
      }
    } else {
      if (depth === 2) {
        lastIdx = m.index + '</w:tbl>'.length;
      }
      depth--;
    }
  }
  out += tblXml.slice(lastIdx);
  return out;
}

console.log('=== F1_SCORE_v1 (__FZ_ON_F1FIX) স্বয়ংক্রিয় পরীক্ষা শুরু ===');

// ১. সুইচ বন্ধ অবস্থায় (Switch-OFF) বাইট-টু-বাইট অভিন্নতা যাচাই
delete globalThis.__FZ_ON_F1FIX;
delete globalThis.__FZ_OFF_F1FIX;

const irOff = LayoutIR.build(meas.cap, meas.measures, meas.pageInfo);
const irOffSnap = JSON.stringify(irOff);
LineFit.fit(irOff, meas.measures);
const xmlOff = Builder.bodyXml(irOff).xml;

const irGoldenClone = JSON.parse(JSON.stringify(goldenIr));
LineFit.fit(irGoldenClone, meas.measures);
const xmlGolden = Builder.bodyXml(irGoldenClone).xml;
check(
  'সুইচ বন্ধ অবস্থায় bodyXml আউটপুট গোল্ডেন বেসলাইনের সাথে বাইট-টু-বাইট অভিন্ন',
  xmlOff === xmlGolden
);

// ২. সুইচ চালু অবস্থায় (Switch-ON) মেরামত যাচাই
globalThis.__FZ_ON_F1FIX = true;
delete globalThis.__FZ_OFF_F1FIX;

const irOn = LayoutIR.build(meas.cap, meas.measures, meas.pageInfo);
const irOnRestoredCheck = LayoutIR.build(meas.cap, meas.measures, meas.pageInfo);
globalThis.__FZ_OFF_F1FIX = true;
LayoutIR.restoreF1FixIr(irOnRestoredCheck);
delete globalThis.__FZ_OFF_F1FIX;
check(
  'সুইচ বন্ধ করলে LayoutIR.build আউটপুট সুইচ-অফ বেসলাইন IR-এর সাথে হুবহু অভিন্ন',
  JSON.stringify(irOnRestoredCheck) === irOffSnap
);

LineFit.fit(irOn, meas.measures);
const xmlOn = Builder.bodyXml(irOn).xml;

check('সুইচ চালু করলে f1FixOn() সক্রিয় হয় এবং আউটপুট XML পরিবর্তিত হয়', LayoutIR.f1FixOn() === true && xmlOn !== xmlOff);

// ৩. পাতা সংখ্যা বৃদ্ধি না পাওয়া (৩ পাতা অপরিবর্তিত থাকা)
const sectCountOn = (xmlOn.match(/<w:sectPr>/g) || []).length;
check('সুইচ চালু অবস্থায় পাতা সংখ্যা ঠিক ৩ থাকে (কোনো পাতা বৃদ্ধি পায় না)', irOn.pages.length === 3 && sectCountOn === 3);

// ৪. পাতা ১-এর বিশেষ দ্রষ্টব্য পাদটীকার ফন্ট আকার (১৫pt -> ৯.৫pt) যাচাই
const p1Footnote = irOn.pages[0].bands[1].cells[0].items[0];
check(
  'পাতা ১-এর "(বি.দ্র. তারকা * চিহ্নিত ঘরসমূহ অবশ্যই পূরণ করতে হবে)" পাদটীকার ফন্ট ১৫pt থেকে ৯.৫pt-এ সংশোধিত',
  p1Footnote.fontPt === 9.5 && irOn.pages[0].bodyFontPt < 15
);
check(
  'পাতা ১-এর পাদটীকার XML রানে w:sz w:val="19" (৯.৫pt) ব্যবহৃত হয়েছে',
  /<w:sz w:val="19"\/>(?:(?!<\/w:r>)[\s\S])*?তারকা/.test(xmlOn)
);

// ৫. অঙ্ক-বাক্স গ্রিডে (১১ ও ১৭ ঘর) প্রান্তিক '|' থেকে সৃষ্ট বাড়তি ঘর অপসারণ ও জ্যামিতি যাচাই
const p1Tbl = irOn.pages[0].bands[2].cells[0].items[0];
const p2Tbl = irOn.pages[1].bands[0].cells[0].items[0];
const p3Tbl = irOn.pages[2].bands[0].cells[0].items[0];

const boxCountOf = (cellStr) => String(cellStr || '').slice(LayoutIR.BOX_MARK.length).split(LayoutIR.BOX_SEP).length;
check(
  'পাতা ১-এর মোবাইল নম্বর ছকে ১২টির বদলে ঠিক ১১টি অঙ্ক-বাক্স এবং জন্ম-নিবন্ধন/এনআইডি ছকে ১৮টির বদলে ঠিক ১৭টি অঙ্ক-বাক্স রয়েছে',
  boxCountOf(p1Tbl.rows[1][1]) === 11 &&
  boxCountOf(p1Tbl.rows[14][1]) === 17 &&
  boxCountOf(p1Tbl.rows[18][1]) === 17 &&
  boxCountOf(p1Tbl.rows[21][1]) === 17
);
check(
  'পাতা ২-এর অভিভাবক এনআইডি ছকে ঠিক ১৭টি এবং মোবাইল নম্বর ছকে ঠিক ১১টি অঙ্ক-বাক্স রয়েছে',
  boxCountOf(p2Tbl.rows[1][1]) === 17 &&
  boxCountOf(p2Tbl.rows[2][1]) === 11
);
check(
  'পাতা ১ ও পাতা ২-এর সব ৬টি অঙ্ক-বাক্স সারিতে নিখুঁত _f1BoxSpecs (indentPt, widthPt, heightPt, leadPt) সংযুক্ত হয়েছে',
  Boolean(
    p1Tbl._f1BoxSpecs && p1Tbl._f1BoxSpecs[1] && p1Tbl._f1BoxSpecs[14] && p1Tbl._f1BoxSpecs[18] && p1Tbl._f1BoxSpecs[21] &&
    p2Tbl._f1BoxSpecs && p2Tbl._f1BoxSpecs[1] && p2Tbl._f1BoxSpecs[2] &&
    p1Tbl._f1BoxSpecs[18].heightPt >= 18.0 && p2Tbl._f1BoxSpecs[1].heightPt === 18.5
  )
);

// ৬. বহু-লাইনের রেডিও ও অঙ্ক-বাক্স সারির উল্লম্ব প্রান্তিককরণ (vAlign="top") যাচাই
check(
  'পাতা ১-এর ৫-লাইন রেডিও সারিতে ("শিক্ষা প্রতিষ্ঠানের স্তর") এবং পাতা ২-এর বহু-লাইন সারিগুলোতে vAlign="top" প্রযুক্ত হয়েছে',
  p1Tbl._f1RowMeta[5].vAlign === 'top' &&
  p2Tbl._f1RowMeta[1].vAlign === 'top' &&
  p2Tbl._f1RowMeta[2].vAlign === 'top' &&
  p2Tbl._f1RowMeta[4].vAlign === 'top' &&
  p2Tbl._f1RowMeta[5].vAlign === 'top' &&
  p2Tbl._f1RowMeta[6].vAlign === 'top' &&
  p2Tbl._f1RowMeta[7].vAlign === 'top'
);

// ৭. রেডিও-বাটন ইনডেন্ট ও ট্যাব-স্টপ এবং প্লেসহোল্ডার ("DD/MM/YYYY" ও "Ex, abc@gmail.com") যাচাই
check(
  'পাতা ১, ২ ও ৩-এর রেডিও-বাটন সারিগুলোতে ক্যালিব্রেটেড বাম-ইনডেন্ট (৪১pt, ২০pt, ৪২.৫pt) ও ট্যাব-স্টপ (৫৮.৫pt, ৩৭.৫pt, ৫৯.৫pt) বসেছে',
  p1Tbl.radioIndentPt === 41 && p1Tbl._f1RadioTextTabPt === 58.5 &&
  p2Tbl.radioIndentPt === 20 && p2Tbl._f1RadioTextTabPt === 37.5 &&
  p3Tbl.bulletIndentPt === 42.5 && p3Tbl._f1RadioTextTabPt === 59.5
);
check(
  'পাতা ১-এর "DD/MM/YYYY" প্লেসহোল্ডার হালকা ধূসর (C8C8C8) ও বাম-প্রান্তিক এবং পাতা ২-এর "Ex, abc@gmail.com" প্রসারিত অক্ষর-ব্যবধানে সেট হয়েছে',
  p1Tbl._f1RowMeta[15].cells[1].color === 'C8C8C8' &&
  p1Tbl._f1RowMeta[15].cells[1].align === 'l' &&
  p2Tbl._f1RowMeta[3].cells[1].charSpacingPt === 1.45 &&
  /<w:color w:val="C8C8C8"\/>(?:(?!<\/w:r>)[\s\S])*?DD\/MM\/YYYY/.test(xmlOn)
);

// ৮. পাতা ৩-এর সীমানাহীন "সংযুক্তি:" ছকের ১-কলাম কাঠামো ও বোল্ড শিরোনাম যাচাই
check(
  'পাতা ৩-এর "সংযুক্তি:" ছকের ৪টি সারিই ১-কলামে সমতাকৃত এবং শিরোনামটি ১০.৫pt বোল্ডে সেট হয়েছে',
  p3Tbl.rows.length === 4 &&
  p3Tbl.rows.every((r) => r.length === 1) &&
  p3Tbl.widthPt === 360 &&
  p3Tbl._f1RowMeta[0].cells[0].bold === true &&
  p3Tbl._f1RowMeta[0].cells[0].fontPt === 10.5
);

// ৯. টেবিলের কঠোর নিয়ম যাচাই (কোনো টেবিল বিভাজন নয়, অতিরিক্ত w:shd নয়, এবং প্রতিটি সারিতে sum(w:tcW) === w:tblW)
const allTablesOff = extractAllTables(xmlOff);
const allTablesOn = extractAllTables(xmlOn);
const topTablesOff = allTablesOff.filter((t) => t.depth === 0);
const topTablesOn = allTablesOn.filter((t) => t.depth === 0);

check(
  'মূলের কোনো টেবিল একাধিক <w:tbl>-এ ভাঙা হয়নি (শীর্ষ-স্তরের ও নেস্টেড টেবিল সংখ্যা অপরিবর্তিত)',
  topTablesOn.length === topTablesOff.length && allTablesOn.length === allTablesOff.length
);
check(
  'আউটপুট XML-এ কোনো অতিরিক্ত ধূসর শেডিং (w:shd) যোগ করা হয়নি',
  (xmlOn.match(/<w:shd\b/g) || []).length === (xmlOff.match(/<w:shd\b/g) || []).length
);

let gridUniformOk = true;
let gridDetail = '';
for (let ti = 0; ti < allTablesOn.length; ti++) {
  const flatTbl = stripNestedTables(allTablesOn[ti].xml);
  const tblWM = /<w:tblW\s+w:w="(\d+)"/.exec(flatTbl);
  const tblW = tblWM ? Number(tblWM[1]) : 0;
  const gridCols = [...flatTbl.matchAll(/<w:gridCol\s+w:w="(\d+)"\/>/g)].map((m) => Number(m[1]));
  const gridSum = gridCols.reduce((a, b) => a + b, 0);
  if (gridSum !== tblW) {
    gridUniformOk = false;
    gridDetail = `টেবিল ${ti}: gridSum (${gridSum}) !== tblW (${tblW})`;
    break;
  }
  const trMatches = [...flatTbl.matchAll(/<w:tr>([\s\S]*?)<\/w:tr>/g)];
  for (let ri = 0; ri < trMatches.length; ri++) {
    const trXml = trMatches[ri][1];
    const tcMatches = [...trXml.matchAll(/<w:tcPr>([\s\S]*?)<\/w:tcPr>/g)];
    let rowW = 0;
    let colCursor = 0;
    for (const tcM of tcMatches) {
      const tcPr = tcM[1];
      const wM = /<w:tcW\s+w:w="(\d+)"/.exec(tcPr);
      const spM = /<w:gridSpan\s+w:val="(\d+)"/.exec(tcPr);
      const w = wM ? Number(wM[1]) : 0;
      const sp = spM ? Number(spM[1]) : 1;
      const expectedW = gridCols.slice(colCursor, colCursor + sp).reduce((a, b) => a + b, 0);
      if (w !== expectedW) {
        gridUniformOk = false;
        gridDetail = `টেবিল ${ti} সারি ${ri}: tcW (${w}) !== gridCols sum (${expectedW})`;
        break;
      }
      rowW += w;
      colCursor += sp;
    }
    if (!gridUniformOk) break;
    if (rowW !== tblW || colCursor !== gridCols.length) {
      gridUniformOk = false;
      gridDetail = `টেবিল ${ti} সারি ${ri}: rowW (${rowW}) !== tblW (${tblW})`;
      break;
    }
  }
  if (!gridUniformOk) break;
}
check(
  'সব টেবিলের প্রতিটি সারিতে ঘরের প্রস্থের যোগফল (w:tcW) টেবিলের মোট প্রস্থের (w:tblW) সমান এবং কলাম-গ্রিডে (w:tblGrid) নিখুঁতভাবে সারিবদ্ধ',
  gridUniformOk,
  gridDetail
);

// ১০. __FZ_OFF_F1FIX ওভাররাইড এবং পুনরুদ্ধার (Restoration) যাচাই
globalThis.__FZ_OFF_F1FIX = true;
const xmlRestored = Builder.bodyXml(irOn).xml;
check(
  '__FZ_OFF_F1FIX = true করলে পূর্ব-মেরামতকৃত IR থেকেও বেসলাইন XML হুবহু পুনরুদ্ধার হয়',
  LayoutIR.f1FixOn() === false && xmlRestored === xmlOff
);

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
