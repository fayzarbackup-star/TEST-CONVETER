/**
 * A07_SCORE_v6 — নমুনা a07 ও সমগোত্রীয় বহু-পাতার পদোন্নতি/প্রত্যয়ন ছক-ফরমের জ্যামিতিক, টাইপোগ্রাফিক ও টেবিল-গ্রিড অখণ্ডতা যাচাইয়ের টেস্ট স্যুট।
 * চালানোর নিয়ম: node tests/a07fix6.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// প্রোডাকশনের ভিত্তি-সুইচসমূহ নাম ধরে চালু করা (switch-defaults.js require না করে)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4', 'RULES2',
  'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX'
];

function enableBaseSwitches() {
  for (const k of BASE_SWITCHES) {
    delete globalThis['__FZ_OFF_' + k];
    globalThis['__FZ_ON_' + k] = true;
  }
}

function setA07Fix6(on) {
  if (on) {
    delete globalThis.__FZ_OFF_A07FIX6;
    globalThis.__FZ_ON_A07FIX6 = true;
  } else {
    delete globalThis.__FZ_ON_A07FIX6;
    globalThis.__FZ_OFF_A07FIX6 = true;
  }
}

enableBaseSwitches();
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const LIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const FDB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));
globalThis.FayzarLineFit = LF;
globalThis.FayzarLayoutIR = LIR;
globalThis.FayzarFaithfulDocx = FDB;

const RUN_DIR = path.join(ROOT, 'qa/golden-data/runs/S20_0c8d9f40/a07');
const measData = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'measures.json'), 'utf8'));
const savedIrData = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'ir.json'), 'utf8'));

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ [পাস] ${name}`);
  } else {
    failed++;
    console.error(`  ✗ [ব্যর্থ] ${name}${detail ? ' — ' + detail : ''}`);
  }
}

/**
 * XML থেকে সব মূল <w:tbl> (নেস্টেড সাব-টেবিল বাদে) নিষ্কাশন করে গ্রিড ও ঘরের প্রস্থের অভিন্নতা যাচাই
 */
function extractTopLevelTables(xml) {
  const tables = [];
  const tagRe = /<\/?w:tbl(?=\s|>)/g;
  let depth = 0;
  let start = -1;
  let m;
  while ((m = tagRe.exec(xml)) !== null) {
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

console.log('=== A07_SCORE_v6 টেস্ট স্যুট শুরু ===\n');

// ১. সুইচ এপিআই ও টগল যাচাই
setA07Fix6(false);
check('সুইচ বন্ধ অবস্থায় a07Fix6On() / isA07Fix6On() false রিটার্ন করে', !LIR.a07Fix6On() && !LF.isA07Fix6On() && !FDB.a07Fix6On());

setA07Fix6(true);
check('সুইচ চালু অবস্থায় a07Fix6On() / isA07Fix6On() true রিটার্ন করে', LIR.a07Fix6On() && LF.isA07Fix6On() && !globalThis.__FZ_OFF_A07FIX6 && FDB.a07Fix6On());

globalThis.__FZ_OFF_A07FIX6 = true;
check('__FZ_OFF_A07FIX6 সক্রিয় করলে সুইচ তাৎক্ষণিক নিষ্ক্রিয় হয়', !LIR.a07Fix6On() && !LF.isA07Fix6On() && !FDB.a07Fix6On());

// ২. সুইচ বন্ধ থাকলে বাইট-বাই-বাইট অপরিবর্তিত আউটপুট এবং স্ন্যাপশট পুনরুদ্ধার যাচাই
setA07Fix6(false);
const irOff1 = JSON.parse(JSON.stringify(savedIrData));
const xmlOff1 = FDB.bodyXml(irOff1).xml;

const irToggle = JSON.parse(JSON.stringify(savedIrData));
setA07Fix6(true);
const xmlOnFromSaved = FDB.bodyXml(irToggle).xml;
check('সুইচ চালু করলে savedIr থেকে উৎপন্ন XML-এ প্রত্যাশিত পরিবর্তন আসে', xmlOnFromSaved !== xmlOff1);

setA07Fix6(false);
const xmlRestoredFromSaved = FDB.bodyXml(irToggle).xml;
check('সুইচ পুনরায় বন্ধ করলে XML বাইট-বাই-বাইট আগের অবস্থায় ফিরে আসে', xmlRestoredFromSaved === xmlOff1);

// ৩. পূর্ণ পাইপলাইন (LIR.build -> LF.fit -> FDB.bodyXml / FDB.build) যাচাই
setA07Fix6(true);
const builtIrOn = LIR.build(measData.cap, measData.measures, measData.pageInfo);
LF.fit(builtIrOn);
const { xml: xmlBuiltOn } = FDB.bodyXml(builtIrOn);

check('পাতা-সংখ্যা কঠোরভাবে ৫টিই আছে (কোনো পাতা বাড়েনি)', builtIrOn.pages.length === 5);
const sectBreaks = (xmlBuiltOn.match(/<w:sectPr\b/g) || []).length;
check('DOCX XML-এ ঠিক ৫টি পৃষ্ঠার sectPr বিদ্যমান', sectBreaks === 5, `পাওয়া গেছে: ${sectBreaks}`);
check('সব পাতায় বাম মার্জিন ৪২.৫pt অক্ষুণ্ণ আছে', builtIrOn.pages.every((p) => p.margins && p.margins.left === 42.5));

// ৪. পাতা ১–৫ এর শিরোনাম, আন্ডারলাইন, কেন্দ্র-সরণ ও অনুচ্ছেদ পরিমার্জন যাচাই
const p1 = builtIrOn.pages[0];
const p2 = builtIrOn.pages[1];
const p3 = builtIrOn.pages[2];
const p4 = builtIrOn.pages[3];
const p5 = builtIrOn.pages[4];

const p2Title = p2.bands[0].cells[0].items[0];
const p3Title = p3.bands[0].cells[0].items[0];
check('পাতা ২ ("ছক-২") ও পাতা ৩ ("ছক-৩") ফরম-শিরোনামের হারানো আন্ডারলাইন পুনরুদ্ধার হয়েছে', p2Title.underline === true && p3Title.underline === true);

const p4Title = p4.bands[0].cells[0].items[0];
const p4Head = p4.bands[1].cells[0].items[0];
check('পাতা ৪-এর শীর্ষ শিরোনামদ্বয়ের বাম-সরণ (-৭.২pt -> -২.৭pt) সংশোধিত হয়েছে', p4Title.centerShiftPt === -2.7 && p4Head.centerShiftPt === -2.7);

const p1Head = p1.bands[1].cells[0].items[0];
const p2Head = p2.bands[1].cells[0].items[0];
const p3Head = p3.bands[1].cells[0].items[0];
check('পাতা ১, ২, ৩-এর চওড়া প্রবাহ-শিরোনামে ০.১pt অক্ষর-ফাঁক সংযোজিত হয়েছে', p1Head.charSpacingPt === 0.1 && p2Head.charSpacingPt === 0.1 && p3Head.charSpacingPt === 0.1);

const p1BankLabel = p1.bands[2].cells[0].items[0];
check('পাতা ১-এর "ব্যাংকের নাম: ...." লেবেলে ১৪pt ফন্ট ও ৩২-বিন্দু প্রস্থ স্থাপিত হয়েছে', p1BankLabel.fontPt === 14 && p1BankLabel.text === 'ব্যাংকের নাম: ' + '.'.repeat(32));

const p2Note = p2.bands[4].cells[0].items[0];
check('পাতা ২-এর বন্ধনীযুক্ত নির্দেশনা লাইনে ১৩pt ফন্ট ও +০.২৫pt অক্ষর-ফাঁক স্থাপিত হয়েছে', p2Note.fontPt === 13 && p2Note.charSpacingPt === 0.25);

const p3SigLeft = p3.bands[3].cells[0].items[0];
const p3SigRight = p3.bands[3].cells[1].items[0];
const p3CounterSig = p3.bands[4].cells[0].items[0];
const p4CounterSig = p4.bands[4].cells[0].items[0];
check('পাতা ৩ ও ৪-এর স্বাক্ষর গ্রিড ও প্রতিস্বাক্ষর লাইনে ১২pt ফন্ট স্থাপিত হয়েছে', p3SigLeft.fontPt === 12 && p3SigRight.fontPt === 12 && p3CounterSig.fontPt === 12 && p4CounterSig.fontPt === 12);

const p5AcrIntro = p5.bands[4].cells[0].items[0];
const p5Footnote = p5.bands[6].cells[0].items[0];
check('পাতা ৫-এর এসিআর সূচনা-লেবেল (১৩.৫pt) ও তারকা-পাদটীকা (১৪pt, -০.৩৫pt অক্ষর-ফাঁক) সমন্বিত হয়েছে', p5AcrIntro.fontPt === 13.5 && p5Footnote.fontPt === 14 && p5Footnote.charSpacingPt === -0.35);

// ৫. ছক ১–৫ এর ফন্ট, লাইন-পিচ, ট্যাব ও লাইন-ভাঁজ যাচাই
const tbl1 = p1.bands[3].cells[0].items[0];
const tbl2 = p2.bands[3].cells[0].items[0];
const tbl3 = p3.bands[2].cells[0].items[0];
const tbl4 = p4.bands[2].cells[0].items[0];
const tbl5 = p5.bands[5].cells[0].items[0];

check('ছক-১ (পাতা ১): শিরোনাম কলাম ৪-এ ৪ লাইন ও কলাম ৬-এ ৫ লাইন ভাঁজ এবং ১৩.৮pt পিচ স্থাপিত হয়েছে',
  tbl1.rows[0][4].split('\n').length === 4 && tbl1.rows[0][6].split('\n').length === 5 && tbl1._a07HeadPitchPt === 13.8 && tbl1._a07CompactHdrMar === true);

check('ছক-২ (পাতা ২): শিরোনাম ১১.৫pt ফন্ট, ১৩.৮pt পিচ এবং কলাম ০ (২ লাইন), কলাম ২–৬ (৫ লাইন) ও কলাম ৭ (৭ লাইন) ভাঁজ হয়েছে',
  tbl2.headFontPt === 11.5 && tbl2._a07HeadPitchPt === 13.8 && tbl2.rows[0][0].split('\n').length === 2 && tbl2.rows[0][2].split('\n').length === 5 && tbl2.rows[0][7].split('\n').length === 7);

check('ছক-৩ (পাতা ৩): ১২pt ফন্ট, ১৫.৩pt পিচ, ১০-ড্যাশ পূরণ এবং সারি ৩-এর বাম-ট্যাব অনুপাত (০.৭০৮৫) পুনরুদ্ধার হয়েছে',
  tbl3.fontPt === 12 && tbl3._a07MultiLinePitch === 15.3 && tbl3._tabStopRatio === 0.7085 && tbl3.rows[1][2].includes('----------তারিখ হতে----------') && tbl3.rows[4][2].split('\n').length === 2);

check('ছক-৪ (পাতা ৪): ১৩.৫pt ফন্ট, ১৬.৫pt পিচ এবং সারি ৮–১১-এ মূলের ২ ও ৩-লাইন ভাঁজ স্থাপিত হয়েছে',
  tbl4.fontPt === 13.5 && tbl4._a07MultiLinePitch === 16.5 && tbl4.rows[8][1].split('\n').length === 2 && tbl4.rows[9][1].split('\n').length === 2 && tbl4.rows[10][1].split('\n').length === 3 && tbl4.rows[11][1].split('\n').length === 2);

check('ছক-৫ (পাতা ৫): ১১pt ফন্ট, ১৩.৫pt পিচ, শীর্ষ উল্লম্ব-সাজানো এবং কলাম ২–৬-এ ৩-লাইন ভাঁজ স্থাপিত হয়েছে',
  tbl5.fontPt === 11 && tbl5.headFontPt === 11 && tbl5._a07HeadPitchPt === 13.5 && tbl5.rows[0][0].split('\n').length === 2 && tbl5.rows[0][2].split('\n').length === 3 && tbl5.rows[0][7].split('\n').length === 2);

// ৬. টেবিলের কঠোর নিয়ম যাচাই (একটি উৎস-ছক = একটি <w:tbl>, পূর্ণ গ্রিড, কলাম-সীমা ও প্রস্থের যোগফল অভিন্ন, বাড়তি ছায়া নেই)
const allTblXmls = extractTopLevelTables(xmlBuiltOn);
// নথিতে মোট ৮টি <w:tbl> থাকে: ৫টি বর্ডারযুক্ত উৎস-ছক (ছক ১–৫) + ৩টি বর্ডারলেস ২-কলাম স্বাক্ষর গ্রিড (পাতা ১, ৩, ৪)
const borderedTblXmls = allTblXmls.filter((tx) => /<w:tblBorders><w:top w:val="single"/.test(tx));
check('৫টি উৎস-ছকের প্রতিটির জন্য ঠিক ১টি করে মোট ৫টি বর্ডারযুক্ত <w:tbl> তৈরি হয়েছে (কোনো ছক ভাঙা বা কাটা হয়নি)', borderedTblXmls.length === 5, `পাওয়া গেছে: ${borderedTblXmls.length}`);

const expectedRowsCols = [
  { name: 'ছক-১', rows: 5, cols: 7 },
  { name: 'ছক-২', rows: 5, cols: 8 },
  { name: 'ছক-৩', rows: 7, cols: 3 },
  { name: 'ছক-৪', rows: 12, cols: 4 },
  { name: 'ছক-৫', rows: 3, cols: 9 }
];

borderedTblXmls.forEach((tx, idx) => {
  const spec = expectedRowsCols[idx];
  const tblWM = /<w:tblW w:w="(\d+)" w:type="dxa"\/>/.exec(tx);
  const tblW = tblWM ? Number(tblWM[1]) : -1;
  const gridCols = [...tx.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]));
  const gridSum = gridCols.reduce((a, b) => a + b, 0);

  // কলাম-সীমার ক্রমযোজিত গ্রিড সেট
  const gridBoundaries = new Set();
  let acc = 0;
  for (const gw of gridCols) {
    acc += gw;
    gridBoundaries.add(acc);
  }

  const trMatches = [...tx.matchAll(/<w:tr>([\s\S]*?)<\/w:tr>/g)].map((m) => m[1]);
  check(`${spec.name}: সারি-সংখ্যা (${spec.rows}) ও কলাম-সংখ্যা (${spec.cols}) অবিকল অক্ষুণ্ণ আছে (কোনো gapRows বা ভাঙন নেই)`,
    trMatches.length === spec.rows && gridCols.length === spec.cols,
    `rows=${trMatches.length}, cols=${gridCols.length}`);

  check(`${spec.name}: <w:tblGrid>-এর কলাম-প্রস্থের যোগফল (${gridSum}) === <w:tblW> (${tblW})`,
    gridSum === tblW && tblW > 0);

  let allRowsMatchWidth = true;
  let allRowsOnGrid = true;
  for (let ri = 0; ri < trMatches.length; ri++) {
    const trXml = trMatches[ri];
    const tcMatches = [...trXml.matchAll(/<w:tc><w:tcPr>([\s\S]*?)<\/w:tcPr>/g)].map((m) => m[1]);
    let rowSum = 0;
    let spanSum = 0;
    for (const tcPr of tcMatches) {
      const wM = /<w:tcW w:w="(\d+)" w:type="dxa"\/>/.exec(tcPr);
      const spM = /<w:gridSpan w:val="(\d+)"\/>/.exec(tcPr);
      const wVal = wM ? Number(wM[1]) : 0;
      const spVal = spM ? Number(spM[1]) : 1;
      rowSum += wVal;
      spanSum += spVal;
      if (!gridBoundaries.has(rowSum)) allRowsOnGrid = false;
    }
    if (rowSum !== tblW || spanSum !== spec.cols) allRowsMatchWidth = false;
  }

  check(`${spec.name}: প্রতিটি সারিতে ঘরের প্রস্থের যোগফল = টেবিলের প্রস্থ (${tblW} dxa) এবং সব সারিতে কলাম-সীমা একই গ্রিডে`,
    allRowsMatchWidth && allRowsOnGrid);

  const hasNilCellBorder = /<w:tcBorders>[\s\S]*?<w:(?:top|left|bottom|right) w:val="nil"\/>/.test(tx);
  check(`${spec.name}: কোনো ঘরের দাগ মুছে ফেলা বা কলাম খোলা রাখা হয়নি (tcBorders nil মুক্ত)`, !hasNilCellBorder);

  const hasShading = /<w:shd\b/.test(tx);
  check(`${spec.name}: উৎসে ছায়া না থাকায় কোনো ঘরে বাড়তি ধূসর ছায়া (w:shd) দেওয়া হয়নি`, !hasShading);
});

// ৭. পূর্ণ .docx বাইনারি বিল্ড যাচাই (১০০% অফলাইন)
const docxBuf = await FDB.build(builtIrOn, { type: 'uint8array', pageInfo: measData.pageInfo });
check('অফলাইন পরিবেশে পূর্ণ .docx ফাইল সফলভাবে তৈরি হয়েছে', docxBuf && docxBuf.byteLength > 50000);

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
