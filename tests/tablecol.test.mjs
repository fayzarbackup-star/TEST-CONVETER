// tests/tablecol.test.mjs
// a07 পাতা ৩-এর টেবিলে বাড়তি কলাম রোধ ও পরিমাপ-ভিত্তিক ফন্ট/লাইন-পিচ পরীক্ষা

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const irMod = require('../js/layout-engine/faithful/layout-ir.js');
const docxMod = require('../js/layout-engine/faithful/faithful-docx-builder.js');

let a07Dir = path.join(__dirname, '../qa/golden-data/asis/a07');
if (!fs.existsSync(path.join(a07Dir, 'capture.json'))) {
  const fallbacks = [
    path.join(__dirname, '../../qa/golden-data/asis/a07'),
    path.join(process.cwd(), 'qa/golden-data/asis/a07'),
    path.join(process.cwd(), '../qa/golden-data/asis/a07'),
  ];
  for (const fb of fallbacks) {
    if (fs.existsSync(path.join(fb, 'capture.json'))) {
      a07Dir = fb;
      break;
    }
  }
}

const cap = JSON.parse(fs.readFileSync(path.join(a07Dir, 'capture.json'), 'utf8'));
const measuresData = JSON.parse(fs.readFileSync(path.join(a07Dir, 'measures.json'), 'utf8'));
const goldenIr = JSON.parse(fs.readFileSync(path.join(a07Dir, 'ir.json'), 'utf8'));

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
  } else {
    failCount++;
    console.error('ব্যর্থ:', message);
  }
}

function clearSwitches() {
  delete globalThis.__FZ_ON_TABLECOL;
  delete process.env.FZ_ON;
  delete process.env.__FZ_ON_TABLECOL;
  if (typeof global.window !== 'undefined') delete global.window.__FZ_ON_TABLECOL;
}

// পরীক্ষা ১: সুইচ বন্ধ অবস্থায় (ডিফল্ট) আউটপুট অপরিবর্তিত ও টেবিলে ৪ কলাম
clearSwitches();

const irOff = irMod.build(cap, measuresData.measures, measuresData.pageInfo);
const p3Off = irOff.pages[2];
const tblOff = p3Off.bands.find((b) => b.cells && b.cells[0].items[0].kind === 'table').cells[0].items[0];
const maxColsOff = Math.max(...tblOff.rows.map((r) => r.length));

assert(maxColsOff === 4, `সুইচ বন্ধে পাতা ৩-এর ছকে ৪ কলাম থাকবে (পাওয়া গেছে: ${maxColsOff})`);

const xmlBaseline = docxMod.bodyXml(goldenIr).xml;
const xmlOff = docxMod.bodyXml(goldenIr).xml;
assert(xmlBaseline === xmlOff, 'সুইচ বন্ধে XML আউটপুট বাইট-বাই-বাইট অপরিবর্তিত');

// পরীক্ষা ২: সুইচ চালু অবস্থায় (__FZ_ON_TABLECOL = true) পাতা ৩-এর ছকে ৩ কলাম
globalThis.__FZ_ON_TABLECOL = true;

const irOn = irMod.build(cap, measuresData.measures, measuresData.pageInfo);
const p3On = irOn.pages[2];
const tblOn = p3On.bands.find((b) => b.cells && b.cells[0].items[0].kind === 'table').cells[0].items[0];
const maxColsOn = Math.max(...tblOn.rows.map((r) => r.length));

assert(maxColsOn === 3, `সুইচ চালুতে পাতা ৩-এর ছক ৩ কলাম হবে (পাওয়া গেছে: ${maxColsOn})`);
assert(tblOn.rows.every((r) => r.length === 3), 'সুইচ চালুতে পাতা ৩-এর সব সারির দৈর্ঘ্য ৩');

// পরীক্ষা ৩: ৪ নম্বর সারিতে ডান-সারিবদ্ধ লেখা ডান-ট্যাব হিসেবে ঘরের ভেতরে যুক্ত হয়েছে
const row4Col3 = tblOn.rows[3][2];
assert(row4Col3.includes('\t'), 'সারি ৪-এর বিবরণে ডান-ট্যাব (\\t) বিদ্যমান');
assert(row4Col3.includes('হ্যাঁ/না (সম্ভাব্য প্রমাণক)'), 'সারি ৪-এর বিবরণে হ্যাঁ/না (সম্ভাব্য প্রমাণক) বিদ্যমান');

// পরীক্ষা ৪: মাপা খাড়া রেখা অনুযায়ী ৩ কলামের অনুপাত (colFractions)
assert(Array.isArray(tblOn.colFractions) && tblOn.colFractions.length === 3, 'colFractions-এর দৈর্ঘ্য ৩');
assert(Math.abs(tblOn.colFractions.reduce((a, b) => a + b, 0) - 1.0) < 0.001, 'colFractions-এর যোগফল ১');

// পরীক্ষা ৫: মাপা রেখা ও কালি থেকে ফন্ট-আকার ও লাইন-পিচ
assert(tblOn.fontPt >= 11, `ঘরের ফন্ট-আকার মূলের মাপ থেকে উদ্ধার (পাওয়া গেছে: ${tblOn.fontPt} pt)`);
assert(tblOn.lineSpacingPt >= 14 && tblOn.lineSpacingPt <= 17, `ঘরের লাইন-পিচ মূলের মাপ থেকে উদ্ধার (পাওয়া গেছে: ${tblOn.lineSpacingPt} pt)`);

// পরীক্ষা ৬: Word XML জেনারেশনে ডান-ট্যাব (<w:tab w:val="right" .../>) ও লাইন-উচ্চতা
const xmlOn = docxMod.bodyXml(irOn).xml;
assert(xmlOn.includes('<w:tab w:val="right"'), 'XML-এ ডান-ট্যাব (<w:tab w:val="right") যুক্ত হয়েছে');
assert(xmlOn.includes('<w:tab/>'), 'XML-এ রান-ট্যাব (<w:tab/>) যুক্ত হয়েছে');
assert(xmlOn.includes('w:lineRule="exact"'), 'XML-এ লাইন-পিচ (w:lineRule="exact") যুক্ত হয়েছে');

// পরীক্ষা ৭: process.env.FZ_ON = "TABLECOL" মাধ্যমে সুইচ কার্যকর হওয়া
clearSwitches();
process.env.FZ_ON = 'TABLECOL';
const irEnv = irMod.build(cap, measuresData.measures, measuresData.pageInfo);
const tblEnv = irEnv.pages[2].bands.find((b) => b.cells && b.cells[0].items[0].kind === 'table').cells[0].items[0];
assert(Math.max(...tblEnv.rows.map((r) => r.length)) === 3, 'process.env.FZ_ON="TABLECOL" মাধ্যমে সুইচ সক্রিয় ও ৩ কলাম');

// পরীক্ষা ৮: window.__FZ_ON_TABLECOL মাধ্যমে সুইচ কার্যকর হওয়া
clearSwitches();
global.window = { __FZ_ON_TABLECOL: true };
const irWin = irMod.build(cap, measuresData.measures, measuresData.pageInfo);
const tblWin = irWin.pages[2].bands.find((b) => b.cells && b.cells[0].items[0].kind === 'table').cells[0].items[0];
assert(Math.max(...tblWin.rows.map((r) => r.length)) === 3, 'window.__FZ_ON_TABLECOL=true মাধ্যমে সুইচ সক্রিয় ও ৩ কলাম');
delete global.window;

// পরীক্ষা ৯: সুইচ পুনরায় বন্ধ করলে আগের আচরণে প্রত্যাবর্তন
clearSwitches();
const irOffAgain = irMod.build(cap, measuresData.measures, measuresData.pageInfo);
const tblOffAgain = irOffAgain.pages[2].bands.find((b) => b.cells && b.cells[0].items[0].kind === 'table').cells[0].items[0];
const maxColsOffAgain = Math.max(...tblOffAgain.rows.map((r) => r.length));
assert(maxColsOffAgain === 4, 'সুইচ বন্ধ করলে ছক পুনরায় আগের মতো ৪ কলামে ফেরে');

console.log(`ফলাফল: ${passCount} পাস, ${failCount} ব্যর্থ`);

if (failCount > 0) {
  process.exit(1);
}
