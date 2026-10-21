/**
 * A14_SCORE_v5 (A14FIX5) — অফলাইন স্বয়ংক্রিয় ইউনিট ও ইন্টিগ্রেশন টেস্ট স্যুট
 * পরীক্ষা করে:
 * ১. সুইচ বন্ধ থাকলে (__FZ_ON_A14FIX5 = false বা __FZ_OFF_A14FIX5 = true) IR এবং DOCX XML বাইট-বাই-বাইট অপরিবর্তিত থাকে।
 * ২. সুইচ চালু থাকলে (__FZ_ON_A14FIX5 = true বা FZ_ON=A14FIX5) পাতা ১, ২ ও ৩-এর সকল ২৫টি লেআউট ত্রুটির সংশোধন সক্রিয় হয়।
 * ৩. পাতা-সংখ্যা কখনো বাড়ে না (৩ পাতাই থাকে এবং প্রতিটি পাতায় planPage সংকোচন গুণক f === 1)।
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// প্রোডাকশনের ডিফল্ট ভিত্তি-সুইচগুলো নাম ধরে চালু করা (switch-defaults.js require না করে)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES', 'A07FIX3', 'A14FIX4'
];
for (const sw of BASE_SWITCHES) {
  globalThis['__FZ_ON_' + sw] = true;
}

const FayzarLayoutIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const FayzarLineFit = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const FayzarFaithfulDocx = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const DATA_DIR = path.join(
  ROOT,
  'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2+A14FIX3+WIDTH+A16FIX3+A14RULES+A07FIX3+A14FIX4/a14'
);

const rawCapture = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'capture.json'), 'utf8'));
const rawMeasures = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'measures.json'), 'utf8'));
const rawIr = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ir.json'), 'utf8'));

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

function cloneJson(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function buildFromCapture() {
  const cap = cloneJson(rawCapture);
  const ms = cloneJson(rawMeasures);
  return FayzarLayoutIR.build(cap, ms.measures, ms.pageInfo);
}

const DUMMY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
function attachDummyImages(ir) {
  for (const page of ir.pages || []) {
    for (const band of page.bands || []) {
      for (const cell of band.cells || []) {
        for (const it of cell.items || []) {
          if (it && it.kind === 'figure') {
            it.image = Object.assign({ pxW: 200, pxH: 100 }, it.image || {}, { dataUrl: DUMMY_PNG });
          }
        }
      }
    }
  }
  return ir;
}

// ১) সুইচ গেটিং ও পরিবেশ চলক পরীক্ষা
delete globalThis.__FZ_ON_A14FIX5;
delete globalThis.__FZ_OFF_A14FIX5;
delete process.env.__FZ_ON_A14FIX5;
delete process.env.__FZ_OFF_A14FIX5;
delete process.env.FZ_ON;
delete process.env.FZ_OFF;

check(FayzarLayoutIR.a14Fix5On() === false, 'ডিফল্ট অবস্থায় layout-ir-এ a14Fix5On() বন্ধ থাকবে');
check(FayzarLineFit.isA14Fix5On() === false, 'ডিফল্ট অবস্থায় line-fit-এ isA14Fix5On() বন্ধ থাকবে');
check(FayzarFaithfulDocx.a14Fix5On() === false, 'ডিফল্ট অবস্থায় faithful-docx-builder-এ a14Fix5On() বন্ধ থাকবে');

// সুইচ বন্ধ অবস্থায় রেফারেন্স আউটপুট সংগ্রহ
const irBuiltOff1 = buildFromCapture();
FayzarLineFit.fit(irBuiltOff1);
const xmlBuiltOff1 = FayzarFaithfulDocx.bodyXml(irBuiltOff1).xml;
const docxBytesOff1 = await FayzarFaithfulDocx.build(irBuiltOff1, { type: 'uint8array' });

const irLoadedOff1 = attachDummyImages(cloneJson(rawIr));
FayzarLineFit.fit(irLoadedOff1);
const xmlLoadedOff1 = FayzarFaithfulDocx.bodyXml(irLoadedOff1).xml;

// __FZ_ON_A14FIX5 = true কিন্তু __FZ_OFF_A14FIX5 = true থাকলে বন্ধ থাকবে
globalThis.__FZ_ON_A14FIX5 = true;
globalThis.__FZ_OFF_A14FIX5 = true;
check(FayzarLayoutIR.a14Fix5On() === false, '__FZ_OFF_A14FIX5 সক্রিয় থাকলে a14Fix5On() বন্ধ থাকবে');
check(FayzarLineFit.isA14Fix5On() === false, '__FZ_OFF_A14FIX5 সক্রিয় থাকলে isA14Fix5On() বন্ধ থাকবে');
check(FayzarFaithfulDocx.a14Fix5On() === false, '__FZ_OFF_A14FIX5 সক্রিয় থাকলে builder.a14Fix5On() বন্ধ থাকবে');

const irBuiltOff2 = buildFromCapture();
FayzarLineFit.fit(irBuiltOff2);
const xmlBuiltOff2 = FayzarFaithfulDocx.bodyXml(irBuiltOff2).xml;
const docxBytesOff2 = await FayzarFaithfulDocx.build(irBuiltOff2, { type: 'uint8array' });
check(xmlBuiltOff1 === xmlBuiltOff2, '__FZ_OFF_A14FIX5 সক্রিয় থাকলে নির্মিত DOCX XML বাইট-বাই-বাইট অভিন্ন থাকবে');
check(JSON.stringify(irBuiltOff1) === JSON.stringify(irBuiltOff2), '__FZ_OFF_A14FIX5 সক্রিয় থাকলে নির্মিত IR বাইট-বাই-বাইট অভিন্ন থাকবে');
check(Buffer.compare(Buffer.from(docxBytesOff1), Buffer.from(docxBytesOff2)) === 0, 'সুইচ বন্ধ থাকলে চূড়ান্ত .docx বাইনারি বাইট-বাই-বাইট অভিন্ন থাকবে');

delete globalThis.__FZ_OFF_A14FIX5;

// FZ_ON / FZ_OFF পরিবেশ চলকের মাধ্যমে সুইচ পরীক্ষা
delete globalThis.__FZ_ON_A14FIX5;
process.env.FZ_ON = 'A14FIX5';
check(FayzarLayoutIR.a14Fix5On() === true, 'FZ_ON=A14FIX5 থাকলে a14Fix5On() চালু হবে');
check(FayzarLineFit.isA14Fix5On() === true, 'FZ_ON=A14FIX5 থাকলে isA14Fix5On() চালু হবে');
check(FayzarFaithfulDocx.a14Fix5On() === true, 'FZ_ON=A14FIX5 থাকলে builder.a14Fix5On() চালু হবে');
process.env.FZ_OFF = 'A14FIX5';
check(FayzarLayoutIR.a14Fix5On() === false, 'FZ_OFF=A14FIX5 থাকলে FZ_ON সত্ত্বেও বন্ধ থাকবে');
delete process.env.FZ_ON;
delete process.env.FZ_OFF;

// ২) সুইচ চালু অবস্থায় (__FZ_ON_A14FIX5 = true) পরিবর্তন ও সংশোধন যাচাই
globalThis.__FZ_ON_A14FIX5 = true;
check(FayzarLayoutIR.a14Fix5On() === true, '__FZ_ON_A14FIX5 = true দিলে সুইচ চালু হবে');

const irOn = attachDummyImages(cloneJson(rawIr));
FayzarLineFit.fit(irOn);
const { xml: xmlOn, media: mediaOn } = FayzarFaithfulDocx.bodyXml(irOn);
const docxBytesOn = await FayzarFaithfulDocx.build(irOn, { type: 'uint8array' });

check(xmlOn !== xmlLoadedOff1, 'সুইচ চালু থাকলে DOCX XML-এ প্রত্যাশিত পরিবর্তন আসবে');
check(docxBytesOn && docxBytesOn.length > 1000, 'সুইচ চালু থাকলে বৈধ .docx ফাইল তৈরি হবে');
check(irOn.pages.length === 3, 'সুইচ চালু থাকলে পাতা-সংখ্যা ৩ থাকবে (কখনো বাড়বে না)');

// পাতা ১-এর সংশোধন যাচাই
const p1 = irOn.pages[0];
const p1WebIt = p1.bands[1].cells[1].items[0];
check(p1WebIt.fontPt === 13 && p1WebIt.lineSpacingPt === 12 && p1WebIt.charSpacingPt === -0.15, 'পাতা ১: হেডার Web লাইনের ফন্ট ১৩pt, পিচ ১২pt ও অক্ষর-ফাঁক -০.১৫pt হবে');
check(p1WebIt._a14LastLineFontPt === 11.5, 'পাতা ১: হেডার E-mail (২য় লাইন)-এর ফন্ট ১১.৫pt হবে');
const p1WebXml = FayzarFaithfulDocx.paraXml(p1WebIt, 0, { media: [], availW: 400, pageScale: 1 });
check(p1WebXml.includes('<w:sz w:val="26"/>') && p1WebXml.includes('<w:sz w:val="23"/>'), 'পাতা ১: হেডার অনুচ্ছেদে ২৬ ও ২৩ হাফ-পয়েন্ট রান তৈরি হবে');

const p1BodyIt = p1.bands[4].cells[0].items[0];
const p1KaIt = p1.bands[6].cells[0].items[0];
const p1ChaIt = p1.bands[11].cells[0].items[0];
const p1ChhaIt = p1.bands[12].cells[0].items[0];
check(p1BodyIt.lineSpacingPt === 17.3, 'পাতা ১: ৩-লাইনের বডি অনুচ্ছেদের পিচ ১৭.৩pt-এ পুনরুদ্ধার হবে');
check(p1KaIt.lineSpacingPt === 17.3 && p1ChhaIt.lineSpacingPt === 17.3, 'পাতা ১: ক) ও ছ) উপ-দফার পিচ ১৭.৩pt-এ পুনরুদ্ধার হবে');
check(p1ChaIt.lineSpacingPt === 16.2, 'পাতা ১: চ) উপ-দফার পিচ ১৬.২pt অপরিবর্তিত থাকবে যাতে আন্ডারলাইন y=535.25pt-এ থাকে');

const p1TopSigFig = p1.bands[13].cells[0].items[0];
const p1InitSigFig = p1.bands[13].cells[0].items[1];
const p1LeftRecip = p1.bands[14].cells[0].items[0];
const p1RightSig = p1.bands[14].cells[1].items[0];
const p1Footer = p1.bands[15].cells[0].items[0];

check(p1TopSigFig.rect.y === 608 && p1TopSigFig.heightPt === 51, 'পাতা ১: উপরের স্বাক্ষর-চিত্র y=608pt ও উচ্চতা ৫১pt হবে যাতে স্বাক্ষর ব্লকের ১ম লাইনের সাথে যুক্ত থাকে');
check(p1RightSig.rect.y === 656.8 && p1RightSig.lineSpacingPt === 17.6 && p1RightSig._a14LastLineRaise === -3, 'পাতা ১: ৪-লাইনের স্বাক্ষর ব্লকের y=656.8pt, পিচ ১৭.৬pt এবং শেষ লাইন ১.৫pt নিচে থাকবে');
check(p1LeftRecip.lineSpacingPt === 17.5 && p1LeftRecip.rect.h === 44.5, 'পাতা ১: বাম প্রাপক ব্লকের ("অধ্যক্ষ,...") পিচ ১৭.৫pt ও উচ্চতা ৪৪.৫pt হবে');
check(p1InitSigFig.rect.y === 702.5 && p1InitSigFig.heightPt === 42.5 && p1InitSigFig._a14CropTop === 25500, 'পাতা ১: নিচের আদ্যক্ষর-স্বাক্ষর চিত্র y=702.5pt, উচ্চতা ৪২.৫pt ও শীর্ষ ক্রপ ২৫.৫% (25500) হবে');
check(xmlOn.includes('<a:srcRect l="0" t="25500" r="0" b="0"/>'), 'পাতা ১: আদ্যক্ষর-স্বাক্ষর চিত্রে ডুপ্লিকেট লেখা ছাঁটতে <a:srcRect l="0" t="25500" r="0" b="0"/> যুক্ত হবে');
check(p1Footer.fontPt === 7 && p1Footer.charSpacingPt === -0.15, 'পাতা ১: ফাইল-পাথ ফুটারে ৭pt ফন্ট ও -০.১৫pt অক্ষর-ফাঁক থাকবে');

// পাতা ২-এর সংশোধন যাচাই
const p2 = irOn.pages[1];
const p2Recip = p2.bands[1].cells[0].items[0];
check(p2Recip.fontPt === 10 && p2Recip._a14FirstLineFontPt === 12.5 && p2Recip._a14LastLineFontPt === 11, 'পাতা ২: প্রাপক ব্লকের ১ম লাইন ("বরাবর") ১২.৫pt, মধ্যবর্তী লাইন ১০pt এবং শেষ লাইন ("দিনাজপুর।") ১১pt হবে');
const p2RecipXml = FayzarFaithfulDocx.paraXml(p2Recip, 0, { media: [], availW: 516.5, pageScale: 1 });
check(p2RecipXml.includes('<w:sz w:val="25"/>') && p2RecipXml.includes('<w:sz w:val="20"/>') && p2RecipXml.includes('<w:sz w:val="22"/>'), 'পাতা ২: প্রাপক ব্লকের XML-এ ২৫, ২০ ও ২২ হাফ-পয়েন্ট রান থাকবে');

const p2Item08 = p2.bands[21].cells[0].items[0];
check(p2Item08.fontPt === 12.5, 'পাতা ২: ০৮। ক্রমিকের ("০৮। জমাকৃত সোনালী সেবার রশিদ নং-...") ফন্ট ১২.৫pt হবে');

const p2AvailW = p2.widthPt - p2.margins.left - p2.margins.right;
const p2Band7XmlOn = FayzarFaithfulDocx.paraXml(p2.bands[7].cells[0].items[0], 0, { media: [], availW: p2AvailW, pageScale: 1 });
const p2Band8XmlOn = FayzarFaithfulDocx.paraXml(p2.bands[8].cells[0].items[0], 0, { media: [], availW: p2AvailW, pageScale: 1 });
check(p2Band7XmlOn.includes('w:pos="9608"'), 'পাতা ২: ০১। ক্রমিকের ডান বিন্দু-লিডার ট্যাব-স্টপ +২.৫pt বেড়ে ৯৬০৮ dxa হবে');
// লিডার +২.৫pt সাধারণ নিয়ম বাদ (a13 −০.৮ করত) ⇒ আগের মান ৯৪৫২
check(p2Band8XmlOn.includes('w:pos="9452"'), 'পাতা ২: ০২। (ক) ক্রমিকের ডান বিন্দু-লিডার ট্যাব-স্টপ অপরিবর্তিত ৯৪৫২ dxa');

// পাতা ৩-এর সংশোধন যাচাই
const p3 = irOn.pages[2];
const p3Item1 = p3.bands[1].cells[0].items[0];
const p3Item2 = p3.bands[2].cells[0].items[0];
const p3Item3 = p3.bands[3].cells[0].items[0];
const p3Item4 = p3.bands[4].cells[0].items[0];
const p3Item6 = p3.bands[6].cells[0].items[0];
const p3Item8 = p3.bands[8].cells[0].items[0];
const p3Item14 = p3.bands[14].cells[0].items[0];
const p3SigBand = p3.bands[15];

check(p3Item1._a14FirstLineSubDrop === -4 && p3Item4._a14FirstLineSubDrop === -4, 'পাতা ৩: ১। ও ৪। ক্রমিকের ১ম লাইনে ূ-কারযুক্ত শব্দের জন্য _a14FirstLineSubDrop = -4 থাকবে');
check(p3Item2.fontPt === 12.5 && p3Item2.charSpacingPt === -0.15 && p3Item6.fontPt === 12.5 && p3Item6.charSpacingPt === -0.15, 'পাতা ৩: ১-লাইনের বোল্ড ২। ও ৬। ক্রমিকে ১২.৫pt ফন্ট ও -০.১৫pt অক্ষর-ফাঁক থাকবে');
check(p3Item3.lineSpacingPt === 14.8 && p3Item3.rect.y === 145.4 && p3Item3._a14SlashBridgeDrop === -7 && p3Item3._a14LastLineTailDrop === -4, 'পাতা ৩: ৩। ক্রমিকের পিচ ১৪.৮pt, y=145.4pt, স্ল্যাশ-সেতু -৭ এবং শেষাংশ -৪ থাকবে');
const p3Item3Xml = FayzarFaithfulDocx.paraXml(p3Item3, 0, { media: [], availW: 478, pageScale: 1 });
check(p3Item3Xml.includes('<w:position w:val="-7"/><w:sz w:val="28"/>') && p3Item3Xml.includes('<w:position w:val="-4"/>'), 'পাতা ৩: ৩। ক্রমিকের XML-এ স্ল্যাশ-সেতু (-৭, ২৮ হাফ-পয়েন্ট) ও শেষাংশ (-৪) রেন্ডার হবে');

check(p3Item8._a14LastLineFontPt === undefined, 'পাতা ৩: ৮। ক্রমিকের ২য় লাইনে সংকুচিত ফন্ট বাতিল হয়ে পূর্ণ ১২pt থাকবে');
check(p3Item14.lines.length === 4 && p3Item14.lines[2].endsWith('কলেজ থেকে TC') && p3Item14.lines[3] === 'নিয়ে প্রার্থীত কলেজে ভর্তি হবে।', 'পাতা ৩: ১৪। ক্রমিকে RECITATION-ছাঁটা অংশ পুনরুদ্ধার হয়ে ৪টি সম্পূর্ণ লাইন থাকবে');
check(p3Item14.lineSpacingPt === 13.2 && p3Item14.rect.h === 51.6 && p3Item14._a14LastLineSubRaise === 4, 'পাতা ৩: ১৪। ক্রমিকে পিচ ১৩.২pt, উচ্চতা ৫১.৬pt ও ৪র্থ লাইনের প্রথমাংশে _a14LastLineSubRaise = 4 থাকবে');
const p3Item14Xml = FayzarFaithfulDocx.paraXml(p3Item14, 0, { media: [], availW: 478, pageScale: 1 });
check(p3Item14Xml.includes('<w:position w:val="4"/>'), 'পাতা ৩: ১৪। ক্রমিকের ৪র্থ লাইনের প্রথমাংশে <w:position w:val="4"/> রেন্ডার হবে');

check(Boolean(p3SigBand && p3SigBand.y0 === 748.4 && p3SigBand.y1 === 800.9 && p3SigBand.cells[0].items.length === 2), 'পাতা ৩: নিচে সমাপনী স্বাক্ষর ব্যান্ড (y=748.4..800.9) যুক্ত হবে');
const [p3SigFig, p3SigPara] = p3SigBand.cells[0].items;
check(p3SigFig.kind === 'figure' && p3SigFig.rect.x === 30.2 && p3SigFig.rect.y === 750.5 && p3SigFig.widthPt === 105.6 && p3SigFig.heightPt === 50.4, 'পাতা ৩: সমাপনী স্বাক্ষর ব্যান্ডের বাম ভাসমান চিত্র সঠিক অবস্থানে (x=30.2, y=750.5, 105.6x50.4pt) থাকবে');
check(p3SigPara.kind === 'para' && p3SigPara.type === 'signature' && p3SigPara.lines.length === 3 && p3SigPara.bold === true && p3SigPara.align === 'c', 'পাতা ৩: সমাপনী স্বাক্ষর ব্যান্ডের ডান ৩-লাইনের স্বাক্ষর অনুচ্ছেদ সঠিক ফরম্যাটে থাকবে');
check(mediaOn.length === 5, 'সুইচ চালু থাকলে ৩ পাতায় মোট ৫টি ছবি (পাতা ১-এ ৩টি, পাতা ২-এ ১টি, পাতা ৩-এ ১টি) এমবেড হবে');

// ৩) প্রতিটি পাতায় planPage-এর সংকোচন গুণক f === 1 এবং সেকশন-সংখ্যা ৩ যাচাই
for (let pi = 0; pi < irOn.pages.length; pi++) {
  const plan = FayzarFaithfulDocx.planPage(irOn.pages[pi]);
  check(plan.f === 1, `পাতা ${pi + 1}: planPage-এ উল্লম্ব ফাঁক সংকোচন গুণক f === 1 থাকবে`);
}
const sectCount = (xmlOn.match(/<w:sectPr>/g) || []).length;
check(sectCount === 3, 'চূড়ান্ত DOCX XML-এ ঠিক ৩টি সেকশন (<w:sectPr>) থাকবে');

// ৪) capture.json + measures.json থেকে সরাসরি build() করলেও সকল সংশোধন কার্যকর হয়
const irBuiltOn = buildFromCapture();
FayzarLineFit.fit(irBuiltOn);
check(irBuiltOn.pages.length === 3 && irBuiltOn.pages[2].bands.length === 16, 'capture.json থেকে সরাসরি build() করলেও পাতা ৩-এ ১৬টি ব্যান্ড তৈরি হবে');

// ৫) একই IR অবজেক্টে সুইচ চালু করার পর আবার বন্ধ করলে পূর্বাবস্থায় বাইট-বাই-বাইট প্রত্যাবর্তন যাচাই
delete globalThis.__FZ_ON_A14FIX5;
FayzarLineFit.fit(irOn);
const xmlRestored = FayzarFaithfulDocx.bodyXml(irOn).xml;
check(xmlRestored === xmlLoadedOff1, 'একই IR অবজেক্টে সুইচ পুনরায় বন্ধ করলে DOCX XML বাইট-বাই-বাইট আগের অবস্থায় ফিরে যাবে');
check(JSON.stringify(irOn) === JSON.stringify(irLoadedOff1), 'একই IR অবজেক্টে সুইচ পুনরায় বন্ধ করলে IR কাঠামো বাইট-বাই-বাইট আগের অবস্থায় ফিরে যাবে');

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
