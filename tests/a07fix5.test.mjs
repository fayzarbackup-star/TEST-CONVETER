import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ডিফল্ট-চালু ভিত্তি-সুইচগুলো নাম ধরে সক্রিয় করা (switch-defaults.js require না করে)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4', 'RULES2', 'A13FIX'
];

function resetSwitches() {
  for (const k of Object.keys(globalThis)) {
    if (k.startsWith('__FZ_ON_') || k.startsWith('__FZ_OFF_')) {
      delete globalThis[k];
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    delete process.env.FZ_ON;
    delete process.env.FZ_OFF;
    delete process.env.__FZ_ON_A07FIX5;
    delete process.env.__FZ_OFF_A07FIX5;
  }
  for (const s of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + s] = true;
  }
}

resetSwitches();

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const B = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const DATA_DIR = path.join(ROOT, 'qa/golden-data/runs/DEF16b/a07');
const cap = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'capture.json'), 'utf8'));
const meas = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'measures.json'), 'utf8'));
const rawIrText = fs.readFileSync(path.join(DATA_DIR, 'ir.json'), 'utf8');

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// ১) সুইচ চালু/বন্ধ ও পরিবেশ-চলক যাচাই
resetSwitches();
check('ডিফল্টে A07FIX5 বন্ধ থাকে', !IR.a07Fix5On() && !LF.isA07Fix5On() && !B.a07Fix5On());

globalThis.__FZ_ON_A07FIX5 = true;
check('__FZ_ON_A07FIX5 = true দিলে সুইচ চালু হয়', IR.a07Fix5On() && LF.isA07Fix5On() && B.a07Fix5On());

globalThis.__FZ_OFF_A07FIX5 = true;
check('__FZ_OFF_A07FIX5 = true দিলে সুইচ অগ্রাধিকার পেয়ে বন্ধ হয়', !IR.a07Fix5On() && !LF.isA07Fix5On() && !B.a07Fix5On());

resetSwitches();
process.env.FZ_ON = 'A07FIX5';
check('FZ_ON=A07FIX5 পরিবেশ-চলকে সুইচ চালু হয়', IR.a07Fix5On() && LF.isA07Fix5On() && B.a07Fix5On());

process.env.FZ_OFF = 'A07FIX5';
check('FZ_OFF=A07FIX5 পরিবেশ-চলকে সুইচ বন্ধ হয়', !IR.a07Fix5On() && !LF.isA07Fix5On() && !B.a07Fix5On());

// ২) সুইচ বন্ধ অবস্থায় আউটপুট অপরিবর্তিত এবং চালু→বন্ধ করলে বাইট-বাই-বাইট পূর্বাবস্থায় ফেরা
resetSwitches();
const irOffFromCap = IR.build(cap, meas);
const irOffFromCapJson = JSON.stringify(irOffFromCap);
LF.fit(irOffFromCap);
const xmlOffFromCap = B.bodyXml(irOffFromCap).xml;

const irOffFromSaved = JSON.parse(rawIrText);
LF.fit(irOffFromSaved);
const xmlOffFromSaved = B.bodyXml(irOffFromSaved).xml;

// একই IR অবজেক্টে A07FIX5 চালু করে আবার বন্ধ করলে আগের বাইট-বাই-বাইট আউটপুট ফেরা
const irToggle = JSON.parse(rawIrText);
globalThis.__FZ_ON_A07FIX5 = true;
LF.fit(irToggle);
const xmlToggleOn = B.bodyXml(irToggle).xml;
check('সুইচ চালু করলে XML আউটপুটে প্রত্যাশিত পরিবর্তন আসে', xmlToggleOn !== xmlOffFromSaved);

globalThis.__FZ_ON_A07FIX5 = false;
LF.fit(irToggle);
const xmlToggleRestored = B.bodyXml(irToggle).xml;
check('সুইচ পুনরায় বন্ধ করলে আউটপুট বাইট-বাই-বাইট অপরিবর্তিত অবস্থায় ফেরে', xmlToggleRestored === xmlOffFromSaved);

resetSwitches();
const irOffAgain = IR.build(cap, meas);
check('সুইচ বন্ধ অবস্থায় IR.build আউটপুট বাইট-বাই-বাইট অভিন্ন', JSON.stringify(irOffAgain) === irOffFromCapJson);
LF.fit(irOffAgain);
check('সুইচ বন্ধ অবস্থায় bodyXml আউটপুট বাইট-বাই-বাইট অভিন্ন', B.bodyXml(irOffAgain).xml === xmlOffFromCap);

// ৩) A07FIX5 চালু অবস্থায় পূর্ণ পাইপলাইন (capture+measures এবং ir.json উভয় উৎস থেকে)
resetSwitches();
globalThis.__FZ_ON_A07FIX5 = true;

const irOnCap = IR.build(cap, meas);
LF.fit(irOnCap);
const xmlOnCap = B.bodyXml(irOnCap).xml;

const irOnSaved = JSON.parse(rawIrText);
LF.fit(irOnSaved);
const xmlOnSaved = B.bodyXml(irOnSaved).xml;

// পাতা-সংখ্যা কখনো না বাড়া (৫ পাতা স্থির)
const sectCountCap = (xmlOnCap.match(/<w:sectPr[\s>]/g) || []).length;
const sectCountSaved = (xmlOnSaved.match(/<w:sectPr[\s>]/g) || []).length;
check('পাতা-সংখ্যা অপরিবর্তিত থাকে (৫টি পাতা)', irOnCap.pages.length === 5 && irOnSaved.pages.length === 5 && sectCountCap === 5 && sectCountSaved === 5);

// ৪) টেবিলের কঠোর নিয়ম যাচাই:
// - প্রতিটি উৎস-ছক = একটি <w:tbl> (মোট ৫টি বর্ডারযুক্ত উৎস-ছক: ছক-১..৫)
// - কোনো টেবিল ভাঙা বা সারি কাটা নয় (সারি সংখ্যা যথাক্রমে ৫, ৫, ৭, ১২, ৩; কলাম সংখ্যা ৭, ৮, ৩, ৪, ৯)
// - কোনো ঘরের দাগ মুছে ফেলা নয় (nil বর্ডার = ০)
// - প্রতিটি সারিতে ঘরের প্রস্থের যোগফল = টেবিলের প্রস্থ (tblW) = গ্রিডের যোগফল (tblGrid)
// - সব সারিতে কলাম-সীমা একই গ্রিডে সংরেখিত
// - ঘরে অকারণ ধূসর ছায়া (w:shd) নেই
function extractBorderedTables(xml) {
  const allTbls = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
  return allTbls.filter((t) => /<w:tblBorders>[\s\S]*?<w:top w:val="single"/.test(t));
}

const expectedRows = [5, 5, 7, 12, 3];
const expectedCols = [7, 8, 3, 4, 9];

for (const [srcLabel, xml] of [['capture+measures', xmlOnCap], ['saved ir.json', xmlOnSaved]]) {
  const tbls = extractBorderedTables(xml);
  check(`[${srcLabel}] a07-এর প্রতিটি উৎস-ছক ঠিক একটি <w:tbl> (৫টি ছক)`, tbls.length === 5, `পাওয়া গেছে ${tbls.length}টি`);

  tbls.forEach((tblXml, idx) => {
    const tblNo = idx + 1;
    const trs = tblXml.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || [];
    check(`[${srcLabel}] ছক-${tblNo}-এর সারি-সংখ্যা অক্ষত (${expectedRows[idx]}টি সারি)`, trs.length === expectedRows[idx], `পাওয়া গেছে ${trs.length}টি`);

    const nilBorders = tblXml.match(/<w:(top|bottom|left|right) w:val="nil"\/>/g) || [];
    check(`[${srcLabel}] ছক-${tblNo}-এ কোনো ঘরের দাগ মুছে ফেলা বা খোলা রাখা হয়নি (nil বর্ডার = ০)`, nilBorders.length === 0, `nil বর্ডার: ${nilBorders.length}`);

    const shds = tblXml.match(/<w:shd\b[^>]*>/g) || [];
    check(`[${srcLabel}] ছক-${tblNo}-এ অকারণ ধূসর ছায়া (w:shd) নেই`, shds.length === 0, `w:shd সংখ্যা: ${shds.length}`);

    const tblWMatch = /<w:tblW w:w="(\d+)" w:type="dxa"\/>/.exec(tblXml);
    const tblW = tblWMatch ? Number(tblWMatch[1]) : -1;
    const gridCols = (tblXml.match(/<w:gridCol w:w="(\d+)"\/>/g) || []).map((g) => Number(/(\d+)/.exec(g)[1]));
    const gridSum = gridCols.reduce((a, b) => a + b, 0);

    check(`[${srcLabel}] ছক-${tblNo}-এর কলাম-সংখ্যা অক্ষত (${expectedCols[idx]}টি কলাম) এবং tblW === gridSum`, gridCols.length === expectedCols[idx] && tblW === gridSum, `cols=${gridCols.length}, tblW=${tblW}, gridSum=${gridSum}`);

    const expectedBounds = [];
    let acc = 0;
    for (const w of gridCols) {
      acc += w;
      expectedBounds.push(acc);
    }

    let allRowSumsEqual = true;
    let allRowBoundsMatch = true;
    for (let ri = 0; ri < trs.length; ri++) {
      const tcWs = (trs[ri].match(/<w:tcW w:w="(\d+)" w:type="dxa"\/>/g) || []).map((c) => Number(/(\d+)/.exec(c)[1]));
      const rowSum = tcWs.reduce((a, b) => a + b, 0);
      if (rowSum !== tblW || rowSum !== gridSum) {
        allRowSumsEqual = false;
      }
      const rowBounds = [];
      let rAcc = 0;
      for (const w of tcWs) {
        rAcc += w;
        rowBounds.push(rAcc);
      }
      if (JSON.stringify(rowBounds) !== JSON.stringify(expectedBounds)) {
        allRowBoundsMatch = false;
      }
    }
    check(`[${srcLabel}] ছক-${tblNo}-এর প্রতিটি সারিতে ঘরের প্রস্থের যোগফল = টেবিলের প্রস্থ (${tblW} dxa)`, allRowSumsEqual);
    check(`[${srcLabel}] ছক-${tblNo}-এর সব সারিতে কলাম-সীমা একই নিয়মিত গ্রিডে সংরেখিত`, allRowBoundsMatch);
  });
}

// ৫) লেআউট, ফন্ট, লাইন-পিচ, শিরোনাম-আন্ডারলাইন, স্বাক্ষর ও টিক-চিত্রের সুনির্দিষ্ট উন্নতি যাচাই
const p1 = irOnSaved.pages[0];
const p2 = irOnSaved.pages[1];
const p3 = irOnSaved.pages[2];
const p4 = irOnSaved.pages[3];
const p5 = irOnSaved.pages[4];

// ৫ক) প্রবাহ-শিরোনামের আন্ডারলাইন পুনরুদ্ধার (পাতা ১, ২, ৩, ৫) এবং পাতা ৪-এ ভ্রান্ত আন্ডারলাইন না থাকা
check('পাতা ১-এর প্রবাহ-শিরোনামে মুছে যাওয়া আন্ডারলাইন পুনরুদ্ধার হয়েছে', p1.bands[1].cells[0].items[0].underline === true);
check('পাতা ২-এর প্রবাহ-শিরোনামে আংশিক <u> ট্যাগ পরিষ্কার হয়ে পূর্ণ আন্ডারলাইন হয়েছে', p2.bands[1].cells[0].items[0].underline === true && !/<u>/i.test(p2.bands[1].cells[0].items[0].text));
check('পাতা ৩-এর প্রবাহ-শিরোনামে মুছে যাওয়া আন্ডারলাইন পুনরুদ্ধার হয়েছে', p3.bands[1].cells[0].items[0].underline === true);
check('পাতা ৪-এর আন্ডারলাইনহীন শিরোনামে ভ্রান্ত আন্ডারলাইন বসেনি', p4.bands[1].cells[0].items[0].underline === false);
check('পাতা ৫-এর ২য় উপ-শিরোনামে মুছে যাওয়া আন্ডারলাইন পুনরুদ্ধার হয়েছে', p5.bands[2].cells[0].items[0].underline === true);

// ৫খ) পাতা ৫-এর ১ম উপ-শিরোনামে প্রস্থ-ঘাটতি (dx0=+5, dx1=-6) নিরসনে অক্ষর-ফাঁক ০.৫৫pt
check('পাতা ৫-এর ১ম উপ-শিরোনামে charSpacingPt = 0.55 স্থাপিত হয়েছে', p5.bands[1].cells[0].items[0].charSpacingPt === 0.55);

// ৫গ) পাতা ১-এর দ্বি-কলাম স্বাক্ষর গ্রিডের ফন্ট (১২pt), কেন্দ্র-সরণ (+২.৫pt), লাইন-পিচ (১৪pt) ও উল্লম্ব অবস্থান (৩৯৩.১pt)
const sigLeft = p1.bands[4].cells[0].items[0];
const sigRight = p1.bands[4].cells[1].items[0];
check('পাতা ১-এর দ্বি-কলাম স্বাক্ষরে ফন্ট ১২pt, পিচ ১৪pt, কেন্দ্র-সরণ +২.৫pt ও y=393.1pt সমন্বিত', sigLeft.fontPt === 12 && sigRight.fontPt === 12 && sigLeft.centerShiftPt === 2.5 && sigLeft.lineSpacingPt === 14 && sigLeft.rect.y === 393.1);

// ৫ঘ) পাতা ১–৫ এর ৩০০-ডিপিআই ক্রপকৃত টিক-চিত্রের প্রকৃত আকার ও _a07FigLeadPt সংরক্ষণ
const figs = [
  p1.bands[5].cells[0].items[0],
  p2.bands[5].cells[0].items[0],
  p3.bands[5].cells[0].items[0],
  p4.bands[5].cells[0].items[0],
  p5.bands[8].cells[0].items[0]
];
check('পাতা ১–৫ এর সব টিক-চিত্রে প্রকৃত প্রস্থ/উচ্চতা ও _a07FigLeadPt সংরক্ষিত হয়েছে', figs.every((f) => f && f.widthPt > f.rect.w && f.heightPt > f.rect.h && f._a07FigLeadPt > 0));

// ৫ঙ) ছক-২, ছক-৩, ছক-৪ ও ছক-৫ এর ফন্ট, লাইন-পিচ ও উল্লম্ব-সাজানো যাচাই
const tbl2Cap = irOnCap.pages[1].bands[3].cells[0].items[0];
const tbl3Saved = p3.bands[2].cells[0].items[0];
const tbl4Saved = p4.bands[2].cells[0].items[0];
const tbl5Saved = p5.bands[5].cells[0].items[0];

check('পাতা ২ ছক-২ এর শিরোনাম-ফন্ট ১১pt ও লাইন-পিচ ১২.২pt সংরক্ষিত', tbl2Cap.headFontPt === 11 && tbl2Cap._a07HeadPitchPt === 12.2);
check('পাতা ৩ ছক-৩ এর ফন্ট ১০.৫pt, পিচ ১৫.৬pt ও বডি-সারির শীর্ষ সাজানো সক্রিয়', tbl3Saved.fontPt === 10.5 && tbl3Saved._a07MultiLinePitch === 15.6 && tbl3Saved._a07RowVAlignTop === true);
check('পাতা ৪ ছক-৪ ও পাতা ৫ ছক-৫ এর গ্রিড-প্রথম ও ফন্ট-লক সক্রিয়', tbl4Saved.gridFirst === true && tbl5Saved.fontPt === 8.5 && tbl5Saved.gridFirst === true);

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
