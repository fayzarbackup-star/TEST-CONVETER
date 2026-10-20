/**
 * A14_SCORE_v3 — a14 (৩ পাতার ছাড়পত্রের আবেদন ফরম) ও সমগোত্রীয় ফরমের লেআউট/ইমেজ-স্কোর উন্নয়নের স্বয়ংক্রিয় পরীক্ষা।
 * চালনা: node tests/a14-fix3.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// প্রোডাকশনের ৮টি ডিফল্ট সুইচ (switch-defaults.js require না করে সরাসরি সক্রিয়করণ)
const DEFAULT_8_SWITCHES = [
  'WRAPFIT',
  'NESTBOX',
  'TBLMERGE',
  'A03FIX',
  'A16FIX',
  'VSPACE',
  'BOXSPLIT',
  'SERIALHANG'
];

function setDefault8Switches() {
  for (const k of DEFAULT_8_SWITCHES) {
    globalThis['__FZ_ON_' + k] = true;
    delete globalThis['__FZ_OFF_' + k];
  }
}

function setA14Fix3(on, useOffFlag = false) {
  if (on) {
    globalThis.__FZ_ON_A14FIX3 = true;
    delete globalThis.__FZ_OFF_A14FIX3;
  } else if (useOffFlag) {
    globalThis.__FZ_ON_A14FIX3 = true;
    globalThis.__FZ_OFF_A14FIX3 = true;
  } else {
    delete globalThis.__FZ_ON_A14FIX3;
    delete globalThis.__FZ_OFF_A14FIX3;
  }
}

setDefault8Switches();
setA14Fix3(false);

const LIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const BLD = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));
const SH = require(path.join(ROOT, 'js/layout-engine/faithful/serial-hang.js'));

const DATA_DIR = path.join(ROOT, 'qa/golden-data/runs/def8/a14');
const rawCap = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'capture.json'), 'utf8'));
const rawMeas = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'measures.json'), 'utf8'));
const rawIrDisk = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ir.json'), 'utf8'));

const clone = (obj) => JSON.parse(JSON.stringify(obj));

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

console.log('=== A14_SCORE_v3 (__FZ_ON_A14FIX3) পরীক্ষা শুরু ===\n');

// ১) সুইচ গেটিং পরীক্ষা
setDefault8Switches();
setA14Fix3(false);
check('সুইচ বন্ধ অবস্থায় a14Fix3On() === false', LIR.a14Fix3On() === false && LF.isA14Fix3On() === false && BLD.a14Fix3On() === false);

setA14Fix3(true);
check('সুইচ চালু অবস্থায় a14Fix3On() === true', LIR.a14Fix3On() === true && LF.isA14Fix3On() === true && BLD.a14Fix3On() === true);

setA14Fix3(false, true);
check('__FZ_OFF_A14FIX3 সক্রিয় থাকলে a14Fix3On() === false', LIR.a14Fix3On() === false && LF.isA14Fix3On() === false && BLD.a14Fix3On() === false);

setA14Fix3(false);
process.env.FZ_ON = 'A14FIX3';
check('process.env.FZ_ON="A14FIX3" থাকলে a14Fix3On() === true', LIR.a14Fix3On() === true && LF.isA14Fix3On() === true && BLD.a14Fix3On() === true);
process.env.FZ_OFF = 'A14FIX3';
check('process.env.FZ_OFF="A14FIX3" থাকলে a14Fix3On() === false', LIR.a14Fix3On() === false && LF.isA14Fix3On() === false && BLD.a14Fix3On() === false);
delete process.env.FZ_ON;
delete process.env.FZ_OFF;

// ২) সুইচ বন্ধ থাকলে বাইট-বাই-বাইট অভিন্নতা পরীক্ষা
setDefault8Switches();
setA14Fix3(false);
const irOff1 = LIR.build(clone(rawCap), clone(rawMeas));
LF.fit(irOff1);
const xmlOff1 = SH.apply(BLD.bodyXml(irOff1, {}).xml).xml;
const xmlDiskOff1 = SH.apply(BLD.bodyXml(clone(rawIrDisk), {}).xml).xml;

setA14Fix3(false, true);
const irOff2 = LIR.build(clone(rawCap), clone(rawMeas));
LF.fit(irOff2);
const xmlOff2 = SH.apply(BLD.bodyXml(irOff2, {}).xml).xml;
const xmlDiskOff2 = SH.apply(BLD.bodyXml(clone(rawIrDisk), {}).xml).xml;

check('সুইচ বন্ধ বনাম __FZ_OFF_A14FIX3: নির্মিত IR বাইট-বাই-বাইট অভিন্ন', JSON.stringify(irOff1) === JSON.stringify(irOff2));
check('সুইচ বন্ধ বনাম __FZ_OFF_A14FIX3: নির্মিত DOCX XML বাইট-বাই-বাইট অভিন্ন', xmlOff1 === xmlOff2);
check('সুইচ বন্ধ বনাম __FZ_OFF_A14FIX3: ডিস্ক IR থেকে DOCX XML বাইট-বাই-বাইট অভিন্ন', xmlDiskOff1 === xmlDiskOff2);

// ৩) সুইচ চালু অবস্থায় পাতা ৩-এর মেরামত যাচাই (capture + measures থেকে)
setDefault8Switches();
setA14Fix3(true);
const irOn = LIR.build(clone(rawCap), clone(rawMeas));
LF.fit(irOn);
const xmlOn = SH.apply(BLD.bodyXml(irOn, {}).xml).xml;

const p3 = irOn.pages[2];
const p3BoxHead = p3.bands[0].cells[0].items[0];
check('পাতা ৩: বক্স-ঘেরা শিরোনামে ডুপ্লিকেট ruleAbove ও ভ্রান্ত আন্ডারলাইন অপসারিত', !p3BoxHead.ruleAbove && p3BoxHead.underline === false);

const p3Plan = BLD.planPage(p3);
const p3Item1Y = p3.margins.top + p3Plan.els[0].before + p3Plan.els[0].h + p3Plan.els[1].before;
check('পাতা ৩: ১। আইটেমের উল্লম্ব শুরু মূলের অবস্থানে (~৭২.০pt)', Math.abs(p3Item1Y - 72.0) <= 1.0, `p3Item1Y=${p3Item1Y}`);

const p3Item3 = p3.bands[3].cells[0].items[0];
check('পাতা ৩: ৩। আইটেমে একীভূত লাইন-স্পেসিং (১৩.২pt) ও ডান-ইনডেন্ট (১৮pt)', p3Item3.lineSpacingPt === 13.2 && p3Item3.justRightPt === 18);

const p3Item8 = p3.bands[8].cells[0].items[0];
check('পাতা ৩: ৮। আইটেমের লাইন-সংঘর্ষ রোধে lineSpacingPt >= ১৪.২pt (আগে ছিল ১৩.২pt)', p3Item8.lineSpacingPt >= 14.2, `lineSpacingPt=${p3Item8.lineSpacingPt}`);

const p3Item12 = p3.bands[12].cells[0].items[0];
check('পাতা ৩: ১২। আইটেমের ডান-ইনডেন্ট ১৮pt পুনরুদ্ধার (আগে ১.৯৯pt-এ কেটে গিয়েছিল)', p3Item12.justRightPt === 18, `justRightPt=${p3Item12.justRightPt}`);

const p3Item14 = p3.bands[14].cells[0].items[0];
check('পাতা ৩: ১৪। আইটেম থেকে [অসম্পূর্ণ: RECITATION ...] আবর্জনা অপসারিত (৩ লাইন)', p3Item14.lines.length === 3 && !/RECITATION|অসম্পূর্ণ/.test(p3Item14.text));
check('পাতা ৩: ১৪। আইটেমের lineSpacingPt >= ১৪.২pt (আগে ছিল ১৩.০pt)', p3Item14.lineSpacingPt >= 14.2, `lineSpacingPt=${p3Item14.lineSpacingPt}`);
check('পাতা ৩: ১৪। আইটেমে ওয়েবসাইট ঠিকানায় <u> আন্ডারলাইন যুক্ত', p3Item14.lines.some((l) => /<u>www\.dinajpureducationboard\.gov\.bd<\/u>/.test(l)));
check('পাতা ৩: চূড়ান্ত XML-এ কোনো RECITATION টেক্সট নেই', !/RECITATION|অসম্পূর্ণ/.test(xmlOn));

// ৪) সুইচ চালু অবস্থায় পাতা ২-এর মেরামত যাচাই
const p2 = irOn.pages[1];
const p2HdrItems = p2.bands[0].cells[1].items;
const p2SubHead = p2HdrItems[p2HdrItems.length - 1];
check('পাতা ২: “ছাড়পত্রের আবেদন ফরম” শিরোনামের বক্স পুনরুদ্ধার ও ফন্ট ১১.৫pt', Array.isArray(p2SubHead.boxIds) && p2SubHead.boxIds.length === 1 && p2SubHead.fontPt === 11.5 && p2SubHead.underline === false);
check('পাতা ২: শীর্ষ গ্রিড-ব্যান্ডের নিচ বক্সের নিচ-কিনারা (৮৭.৮pt) পর্যন্ত বিস্তৃত', Math.abs(p2.bands[0].y1 - 87.8) <= 0.5, `y1=${p2.bands[0].y1}`);

const p2Addr = p2.bands[1].cells[0].items[0];
check('পাতা ২: “বরাবর / কলেজ পরিদর্শক...” ব্লকের লাইন-স্পেসিং ১৩.২pt পুনরুদ্ধার', p2Addr.lineSpacingPt >= 13.2, `lineSpacingPt=${p2Addr.lineSpacingPt}`);

const p2Janab = p2.bands[3].cells[0].items[0];
check('পাতা ২: “জনাব,” সম্বোধনের ফন্ট ১০pt থেকে ১১.৫pt-এ উন্নীত', p2Janab.fontPt === 11.5, `fontPt=${p2Janab.fontPt}`);

const p2Form01 = p2.bands[7].cells[0].items[0];
const p2Form02b = p2.bands[9].cells[0].items[0];
const p2Form03 = p2.bands[10].cells[0].items[0];
check('পাতা ২: ০১। ও ০৩। বহু-পূরণ সারিতে কোলন-ট্যাব অপসারিত (ইনলাইন ডট-লিডার সক্রিয়)', p2Form01.tabLines === null && p2Form03.tabLines === null);
check('পাতা ২: “(খ) মাতার নাম” সারির প্রকৃত বাম-ইনডেন্ট (২০.৬pt) পুনরুদ্ধার', Math.abs(p2Form02b.indentPt - 20.6) <= 0.5, `indentPt=${p2Form02b.indentPt}`);

const p2SubjLine = p2.bands[16].cells[0].items[0];
const p2GpaLine = p2.bands[19].cells[0].items[0];
check('পাতা ২: “১) বাংলা... ৫) ...” সারির বাম-ইনডেন্ট (২৬.৯pt) ও পূর্ণ প্রস্থ পুনরুদ্ধার', Math.abs(p2SubjLine.indentPt - 26.9) <= 0.5 && p2SubjLine.rect.w >= 450);
check('পাতা ২: “প্রাপ্ত জিপিএ ... বোর্ড ...” সারির বাম-ইনডেন্ট (২০.১pt) ও প্রস্থ (১৮৩pt) পুনরুদ্ধার', Math.abs(p2GpaLine.indentPt - 20.1) <= 0.5 && p2GpaLine.rect.w === 183);

const p2CertTbl = p2.bands[23].cells[0].items[0];
check('পাতা ২: প্রত্যয়ন ছকে মাঝের ২.৯pt বর্ডারহীন ফাঁক-সারি (gapRows) ও ১৫টি সারি', p2CertTbl.rows.length === 15 && p2CertTbl.gapRows && p2CertTbl.gapRows[7] === true && p2CertTbl.exactRuleHeights === true);

const p2Foot = p2.bands[24].cells[0].items[0];
check('পাতা ২: বিশেষ দ্রষ্টব্য পাদটীকার অবস্থান (৭৫২.৪pt), ঝুলন্ত ইনডেন্ট (-২৩pt) ও লাইন-দূরত্ব (১২.২pt)', Math.abs(p2Foot.rect.y - 752.4) <= 0.5 && p2Foot.firstIndentPt === -23 && p2Foot.lineSpacingPt === 12.2 && p2Foot.keepJust === true);

const p2Plan = BLD.planPage(p2);
const p2TblEl = p2Plan.els.find((e) => e.it && e.it.kind === 'table');
const p2FigEl = p2Plan.els[p2Plan.els.length - 1];
check('পাতা ২: নিচের স্বাক্ষর-চিত্র ভাসমান (floatAt) হওয়ায় প্রবাহ-উচ্চতা ১pt এবং ছক ওপরে ঠেলা খায়নি', p2FigEl.h === 1 && !!(p2FigEl.it && p2FigEl.it.floatAt) && p2TblEl.before >= 0.8);

// ৫) সুইচ চালু অবস্থায় পাতা ১-এর মেরামত যাচাই
const p1 = irOn.pages[0];
const p1WebIt = p1.bands[1].cells[1].items[0];
check('পাতা ১: শীর্ষ গ্রিডে ২-লাইনের Web ও E-mail এবং ১১.৫pt ফন্ট পুনরুদ্ধার', p1WebIt.lines.length === 2 && /E-mail/i.test(p1WebIt.lines[1]) && p1WebIt.fontPt === 11.5);

const p1MemoIt = p1.bands[2].cells[0].items[0];
check('পাতা ১: স্মারক লাইনে ট্যাব “তারিখ”-এর আগে স্থাপিত', /\tতারিখ\s*:\s*২৩\/০৬\/২০২২/.test(p1MemoIt.tabLines[0]));

const p1CondHead = p1.bands[5].cells[0].items[0];
check('পাতা ১: “ছাড়পত্রের মাধ্যমে ভর্তির ক্ষেত্রে নিম্নলিখিত শর্ত...” শিরোনামের ভ্রান্ত আন্ডারলাইন অপসারিত', p1CondHead.underline === false);

const p1ItemGha = p1.bands[9].cells[0].items[0];
const p1ItemCha = p1.bands[11].cells[0].items[0];
check('পাতা ১: ঘ) ও চ) উপ-আইটেমের বাম-ইনডেন্ট (৫৩.২pt) ও ঝুলন্ত ইনডেন্ট (-১৭pt) পুনরুদ্ধার', p1ItemGha.indentPt === 53.2 && p1ItemGha.firstIndentPt === -17 && p1ItemCha.indentPt === 53.2 && p1ItemCha.firstIndentPt === -17 && !p1ItemCha.charSpacingPt);

const p1SigCell = p1.bands[14].cells[1];
const p1SigIt = p1SigCell.items[0];
check('পাতা ১: স্বাক্ষর ঘরে ক্ষুদ্র ডুপ্লিকেট চিত্র অপসারিত এবং স্বাক্ষর মাঝ-সাজানো ও সঠিক উচ্চতায় (৬৫৭.৯pt)', p1SigCell.items.length === 1 && p1SigIt.align === 'c' && Math.abs(p1SigIt.rect.y - 657.9) <= 0.5);

const p1Footer = p1.bands[15].cells[0].items[0];
check('পাতা ১: ফাইল-পাথ ফুটারের ফন্ট ১০.৫pt থেকে ৭.৫pt-এ সংশোধিত', p1Footer.fontPt === 7.5, `fontPt=${p1Footer.fontPt}`);

// ৬) সরাসরি ডিস্কের প্রি-বিল্ট ir.json থেকেও bodyXml মেরামত যাচাই
const irDiskCopy = clone(rawIrDisk);
const xmlFromDiskOn = SH.apply(BLD.bodyXml(irDiskCopy, {}).xml).xml;
check('ডিস্ক ir.json থেকে: চূড়ান্ত XML-এ কোনো RECITATION নেই এবং ওয়েবসাইট আন্ডারলাইন আছে', !/RECITATION|অসম্পূর্ণ/.test(xmlFromDiskOn) && /www\.dinajpureducationboard\.gov\.bd/.test(xmlFromDiskOn));
check('ডিস্ক ir.json থেকে: পাতা ২-এর প্রত্যয়ন ছকে মাঝের ফাঁক-সারির বাম/ডান বর্ডার nil', /<w:trHeight w:val="58" w:hRule="exact"\/><\/w:trPr><w:tc><w:tcPr><w:tcW w:w="9146" w:type="dxa"\/><w:tcBorders><w:left w:val="nil"\/><w:right w:val="nil"\/><\/w:tcBorders>/.test(xmlFromDiskOn));

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
