import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const B = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const A18_DIR = path.join(ROOT, 'qa/golden-data/runs/S21_bb0e8106/a18');
const cap = JSON.parse(fs.readFileSync(path.join(A18_DIR, 'capture.json'), 'utf8'));
const meas = JSON.parse(fs.readFileSync(path.join(A18_DIR, 'measures.json'), 'utf8'));
const savedIrRaw = fs.readFileSync(path.join(A18_DIR, 'ir.json'), 'utf8');

const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4', 'RULES2',
  'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX',
  'A02FIX', 'A06FIX', 'A07FIX6'
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

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  ✓ ' + msg);
  } else {
    failed++;
    console.error('  ✗ ব্যর্থ: ' + msg);
  }
}

console.log('=== A18_SCORE_v1 (A18FIX) টেস্ট স্যুট ===');

// ১) সুইচ-অফ অবস্থায় বাইট-টু-বাইট অভিন্নতা যাচাই
setBaseSwitches(true);
delete globalThis.__FZ_ON_A18FIX;
delete globalThis.__FZ_OFF_A18FIX;

assert(IR.a18FixOn() === false, 'ডিফল্ট লোড ছাড়া IR.a18FixOn() === false');
assert(LF.isA18FixOn() === false, 'ডিফল্ট লোড ছাড়া LF.isA18FixOn() === false');
assert(B.a18FixOn() === false, 'ডিফল্ট লোড ছাড়া B.a18FixOn() === false');

const irOffSaved1 = JSON.parse(savedIrRaw);
const xmlOffSaved1 = B.bodyXml(irOffSaved1).xml;

globalThis.__FZ_ON_A18FIX = true;
globalThis.__FZ_OFF_A18FIX = true;
assert(IR.a18FixOn() === false, '__FZ_OFF_A18FIX = true থাকলে IR.a18FixOn() === false');
const irOffSaved2 = JSON.parse(savedIrRaw);
const xmlOffSaved2 = B.bodyXml(irOffSaved2).xml;
assert(xmlOffSaved1 === xmlOffSaved2, 'সুইচ অফ (__FZ_OFF_A18FIX=true) ও সুইচ অনুপস্থিত অবস্থায় savedIr-এর XML বাইট-টু-বাইট অভিন্ন');

delete globalThis.__FZ_ON_A18FIX;
delete globalThis.__FZ_OFF_A18FIX;
const irBuiltOff1 = IR.build(JSON.parse(JSON.stringify(cap)), JSON.parse(JSON.stringify(meas.measures)), JSON.parse(JSON.stringify(meas.pageInfo)));
LF.fit(irBuiltOff1);
const xmlBuiltOff1 = B.bodyXml(irBuiltOff1).xml;

globalThis.__FZ_ON_A18FIX = true;
globalThis.__FZ_OFF_A18FIX = true;
const irBuiltOff2 = IR.build(JSON.parse(JSON.stringify(cap)), JSON.parse(JSON.stringify(meas.measures)), JSON.parse(JSON.stringify(meas.pageInfo)));
LF.fit(irBuiltOff2);
const xmlBuiltOff2 = B.bodyXml(irBuiltOff2).xml;
assert(xmlBuiltOff1 === xmlBuiltOff2, 'সুইচ অফ অবস্থায় পূর্ণ পাইপলাইনের (IR.build + LF.fit + B.bodyXml) XML বাইট-টু-বাইট অভিন্ন');

// ২) সুইচ অন করার পর পুনরায় অফ করলে স্ন্যাপশট থেকে হুবহু পুনরুদ্ধার যাচাই
delete globalThis.__FZ_OFF_A18FIX;
globalThis.__FZ_ON_A18FIX = true;
assert(IR.a18FixOn() === true && LF.isA18FixOn() === true && B.a18FixOn() === true, '__FZ_ON_A18FIX = true থাকলে তিনটি মডিউলেই সুইচ সক্রিয়');

const irToggle = JSON.parse(savedIrRaw);
const xmlOn = B.bodyXml(irToggle).xml;
assert(xmlOn !== xmlOffSaved1, 'সুইচ অন অবস্থায় XML মেরামতকৃত ও পরিবর্তিত');

globalThis.__FZ_OFF_A18FIX = true;
const xmlRestored = B.bodyXml(irToggle).xml;
assert(xmlRestored === xmlOffSaved1, 'সুইচ অন করার পর অফ করলে (_preA18FixSnap থেকে) XML আগের সাথে বাইট-টু-বাইট অভিন্ন');

// ৩) সুইচ অন অবস্থায় পূর্ণ পাইপলাইন ও সংরক্ষিত IR-এর অভিন্নতা ও কাঠামোগত যাচাই
delete globalThis.__FZ_OFF_A18FIX;
globalThis.__FZ_ON_A18FIX = true;

const irSavedOn = JSON.parse(savedIrRaw);
LF.fit(irSavedOn);
const xmlSavedOn = B.bodyXml(irSavedOn).xml;

const irBuiltOn = IR.build(JSON.parse(JSON.stringify(cap)), JSON.parse(JSON.stringify(meas.measures)), JSON.parse(JSON.stringify(meas.pageInfo)));
LF.fit(irBuiltOn);
const xmlBuiltOn = B.bodyXml(irBuiltOn).xml;
assert(xmlSavedOn === xmlBuiltOn, 'সুইচ অন অবস্থায় IR.build+LF.fit+B.bodyXml এবং savedIr+LF.fit+B.bodyXml বাইট-টু-বাইট অভিন্ন');

const pageOn = irBuiltOn.pages[0];
const b1It = pageOn.bands[1].cells[0].items[0];
const tblIt = pageOn.bands[2].cells[0].items[0];
const b3It = pageOn.bands[3].cells[0].items[0];
const b4It = pageOn.bands[4].cells[0].items[0];

// ৪) ব্যান্ড ১ (শীর্ষ সিভিল সার্ভিস রেগুলেশন বিধি-লাইন) যাচাই
assert(b1It.bold === false, 'ব্যান্ড ১-এর ভ্রান্ত bold অপসারিত (bold === false)');
assert(b1It.fontPt === 13, 'ব্যান্ড ১-এর ফন্ট ১৩pt-এ পুনরুদ্ধারকৃত');
assert(b1It.lineSpacingPt === 13.2 && b1It.lineRule === 'exact', 'ব্যান্ড ১-এর লাইন-উচ্চতা ১৩.২pt exact');
assert(b1It._a06LeaderStopPt === 223.0, 'ব্যান্ড ১-এর বাম হাইফেন-লিডার ট্যাব-স্টপ ২২৩.০pt (x=২৯৫pt)');
assert(/-{40}/.test(b1It.text), 'ব্যান্ড ১-এ পূর্ণ ৪০টি ড্যাশ সংরক্ষিত');
assert(/<w:tab w:val="left" w:leader="hyphen" w:pos="4460"\/>/.test(xmlBuiltOn), 'ব্যান্ড ১-এর XML-এ w:pos="4460" হাইফেন লিডার ট্যাব উপস্থিত');

// ৫) ব্যান্ড ৩ ও ৪ (নিচের দুটি ক্ষুদ্র পাদটীকা) যাচাই
assert(b3It.fontPt === 10 && b3It.charSpacingPt === 0.1, 'ব্যান্ড ৩ পাদটীকার ফন্ট ১০pt এবং অক্ষর-ফাঁক +০.১pt');
assert(b4It.fontPt === 10 && b4It.charSpacingPt === -0.05, 'ব্যান্ড ৪ পাদটীকার ফন্ট ১০pt এবং অক্ষর-ফাঁক -০.০৫pt');

// ৬) ব্যান্ড ২ (২৮×৪ ছুটির আবেদন ছক) অখণ্ডতা, বর্ডার ও গ্রিড যাচাই
const tblMatches = xmlBuiltOn.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
assert(tblMatches.length === 1, 'নথিতে ঠিক ১টি <w:tbl> রয়েছে (টেবিল কখনোই একাধিক টেবিলে ভাঙা হয়নি)');
assert(!/<w:shd\b/.test(xmlBuiltOn), 'নথিতে মূলে না থাকা কোনো ধূসর শেডিং (<w:shd>) যোগ করা হয়নি');

const tblXml = tblMatches[0];
assert(
  /<w:tblBorders><w:top w:val="single"[^>]*\/><w:left w:val="single"[^>]*\/><w:bottom w:val="single"[^>]*\/><w:right w:val="single"[^>]*\/><w:insideH w:val="single"[^>]*\/><w:insideV w:val="single"[^>]*\/><\/w:tblBorders>/.test(tblXml),
  'টেবিলের চারপাশের ও ভেতরের সব বর্ডার (top, left, bottom, right, insideH, insideV) single হিসেবে অক্ষত'
);

const tblWMatch = /<w:tblW w:w="(\d+)" w:type="dxa"\/>/.exec(tblXml);
const tblW = tblWMatch ? +tblWMatch[1] : 0;
const gridCols = [...tblXml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => +m[1]);
const gridSum = gridCols.reduce((a, b) => a + b, 0);
assert(gridCols.length === 4 && gridSum === 10348 && tblW === 10348, 'টেবিলের ৪টি কলামের (<w:gridCol>) যোগফল এবং <w:tblW> উভয়ই ঠিক ১০৩৪৮ dxa');

const gridEdges = [0];
for (const gw of gridCols) gridEdges.push(gridEdges[gridEdges.length - 1] + gw);

const trList = tblXml.match(/<w:tr>[\s\S]*?<\/w:tr>/g) || [];
assert(trList.length === 28, 'টেবিলে ঠিক ২৮টি সারি (<w:tr>) রয়েছে');

let allRowsMatchGrid = true;
for (let ri = 0; ri < trList.length; ri++) {
  const tr = trList[ri];
  const tcs = tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || [];
  let rowW = 0;
  let colCursor = 0;
  for (const tc of tcs) {
    const wMatch = /<w:tcW w:w="(\d+)" w:type="dxa"\/>/.exec(tc);
    const spMatch = /<w:gridSpan w:val="(\d+)"\/>/.exec(tc);
    const wVal = wMatch ? +wMatch[1] : 0;
    const spVal = spMatch ? +spMatch[1] : 1;
    const expectedW = gridEdges[colCursor + spVal] - gridEdges[colCursor];
    if (wVal !== expectedW) allRowsMatchGrid = false;
    rowW += wVal;
    colCursor += spVal;
  }
  if (rowW !== tblW || colCursor !== 4) allRowsMatchGrid = false;
}
assert(allRowsMatchGrid, 'প্রতিটি সারির ঘরের প্রস্থের যোগফল টেবিলের প্রস্থের (১০৩৪৮ dxa) সমান এবং সব সারি একই ৪-কলাম গ্রিড মেনে চলে');

// ৭) সারি ১৫, ১৬, ১৮–২০, ২৪, ২৫, ২৬ ও ২৭-এর সুনির্দিষ্ট মেরামত যাচাই
assert(
  JSON.stringify(tblIt.gridSpans[15]) === JSON.stringify([2, 0, 1, 1]) &&
  /^নম্বর\s+-+/.test(tblIt.rows[15][0]) &&
  /^তারিখ-+/.test(tblIt.rows[15][2]),
  'সারি ১৫-তে "নম্বর ---" কলাম ০–১ (gridSpan=2) এবং "তারিখ---" কলাম ২-এ (gridSpan=1) স্থাপিত'
);
assert(
  /<w:tab w:val="right" w:leader="hyphen" w:pos="4130"\/>/.test(trList[15]) &&
  /<w:tab w:val="right" w:leader="hyphen" w:pos="2250"\/>/.test(trList[15]) &&
  /<w:vAlign w:val="center"\/>/.test(trList[15]) &&
  /w:after="132"/.test(trList[15]),
  'সারি ১৫-এ কলাম ০–১ স্টপ ৪১৩০ dxa, কলাম ২ স্টপ ২২৫০ dxa, vAlign="center" ও w:after="132" কার্যকর'
);

assert(
  /<w:tab w:val="right" w:leader="dot" w:pos="2470"\/>/.test(trList[16]) &&
  /<w:vAlign w:val="center"\/>/.test(trList[16]) &&
  /w:before="132"/.test(trList[16]),
  'সারি ১৬-এ ডট-লিডার স্টপ ২৪৭০ dxa, vAlign="center" এবং w:before="132" (+৩.৩pt নিম্নমুখী সরণ) কার্যকর'
);

assert(
  /<w:spacing w:val="149"\/>/.test(trList[18]) &&
  /<w:spacing w:val="86"\/>/.test(trList[19]) &&
  /<w:spacing w:val="167"\/>/.test(trList[20]),
  'সারি ১৮, ১৯ ও ২০-এর জাস্টিফাইড গদ্য-লাইনে আন্তঃশব্দ ফাঁক (১৪৯, ৮৬ ও ১৬৭ dxa) প্রয়োগকৃত'
);

assert(
  /<w:ind w:left="1160"\/>/.test(trList[24]) &&
  /<w:ind w:left="318"\/>/.test(trList[25]),
  'সারি ২৪ ("সমীপে দাখিল করা হইল।") ও সারি ২৫ ("নিয়ন্ত্রণকারী অফিসার")-এ প্রকৃত বাম-ইনডেন্ট (১১৬০ ও ৩১৮ dxa) স্থাপিত'
);

assert(
  /<w:tab w:val="right" w:leader="hyphen" w:pos="1710"\/>/.test(trList[26]) &&
  /<w:vAlign w:val="center"\/>/.test(trList[26]) &&
  /w:after="92"/.test(trList[26]),
  'সারি ২৬-এ হাইফেন-লিডার স্টপ ১৭১০ dxa (৮৫.৫pt, tw(118) ফ্লোর মুক্ত), vAlign="center" ও w:after="92" কার্যকর'
);

assert(
  JSON.stringify(tblIt.gridSpans[27]) === JSON.stringify([2, 0, 1, 1]) &&
  tblIt.rows[27][0] === '' &&
  tblIt.rows[27][2] === 'প্রধান হিসাবরক্ষণ কর্মকর্তা' &&
  /<w:vAlign w:val="center"\/>/.test(trList[27]) &&
  /w:after="196"/.test(trList[27]),
  'সারি ২৭-এ "প্রধান হিসাবরক্ষণ কর্মকর্তা" কলাম ২-এ (gridSpans=[2,0,1,1]) স্থাপিত এবং vAlign="center" ও w:after="196" কার্যকর'
);

const sectPrCount = (xmlBuiltOn.match(/<w:sectPr\b/g) || []).length;
assert(sectPrCount === 1, 'সম্পূর্ণ আউটপুট ঠিক ১ পাতায় সীমাবদ্ধ (<w:sectPr> সংখ্যা = ১)');

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
