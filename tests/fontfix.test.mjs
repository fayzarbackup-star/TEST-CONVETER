/**
 * FONT_v1 — হুবহু-মোডে লাইন-উচ্চতা ও ফন্ট-আকার মেরামতের স্বয়ংক্রিয় পরীক্ষা
 * চালানো: node tests/fontfix.test.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// প্রোডাকশনের ৯টি ডিফল্ট ভিত্তি-সুইচ নাম ধরে চালু করা (switch-defaults.js require না করে)
const BASE_SWITCHES = [
  'WRAPFIT',
  'NESTBOX',
  'TBLMERGE',
  'A03FIX',
  'A16FIX',
  'VSPACE',
  'BOXSPLIT',
  'SERIALHANG',
  'A07FIX2'
];

function enableBaseSwitches() {
  for (const name of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + name] = true;
    delete globalThis['__FZ_OFF_' + name];
  }
}

enableBaseSwitches();

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

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

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const GOLDEN_BASE = path.join(
  ROOT,
  'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2'
);

// ১. সুইচ গেটিং ও অগ্রাধিকার পরীক্ষা (__FZ_ON_FONTFIX, FZ_ON=FONTFIX, __FZ_OFF_FONTFIX)
{
  delete globalThis.__FZ_ON_FONTFIX;
  delete globalThis.__FZ_OFF_FONTFIX;
  delete process.env.FZ_ON;
  delete process.env.FZ_OFF;
  check(IR.fontFixOn() === false && LF.isFontFixOn() === false && DB.fontFixOn() === false, 'ডিফল্ট অবস্থায় FONTFIX বন্ধ থাকবে');

  globalThis.__FZ_ON_FONTFIX = true;
  check(IR.fontFixOn() === true && LF.isFontFixOn() === true && DB.fontFixOn() === true, '__FZ_ON_FONTFIX = true দিলে সুইচ চালু হবে');

  globalThis.__FZ_OFF_FONTFIX = true;
  check(IR.fontFixOn() === false && LF.isFontFixOn() === false && DB.fontFixOn() === false, '__FZ_OFF_FONTFIX = true দিলে সুইচ বন্ধ হবে');

  delete globalThis.__FZ_ON_FONTFIX;
  delete globalThis.__FZ_OFF_FONTFIX;
  process.env.FZ_ON = 'FONTFIX';
  check(IR.fontFixOn() === true && LF.isFontFixOn() === true && DB.fontFixOn() === true, 'FZ_ON=FONTFIX পরিবেশ চলকে সুইচ চালু হবে');

  process.env.FZ_OFF = 'FONTFIX';
  check(IR.fontFixOn() === false && LF.isFontFixOn() === false && DB.fontFixOn() === false, 'FZ_OFF=FONTFIX পরিবেশ চলকে সুইচ বন্ধ হবে');

  delete process.env.FZ_ON;
  delete process.env.FZ_OFF;
}

// ২. বাংলা কার ও যুক্তাক্ষরের কালি-অনুপাত (inkRatioFor) পরীক্ষা
{
  delete globalThis.__FZ_ON_FONTFIX;
  const rOffEKar = IR.inkRatioFor('রোল নং');
  const rOffConj = IR.inkRatioFor('পদ স্থায়ীকরণ');
  globalThis.__FZ_ON_FONTFIX = true;
  const rOnEKarWithLo = IR.inkRatioFor('রোল ও ব্র');
  const rOnConj = IR.inkRatioFor('পদ স্থায়ীকরণ');
  check(rOffEKar === 0.83 && rOnEKarWithLo === 0.85, 'FONTFIX চালু থাকলে ে/ো মাত্রার উপরের কার হিসেবে গণ্য হয়ে নিচের কারের সাথে ১.০০ অনুপাত তৈরি করবে না (০.৮৫ হবে)');
  check(rOffConj === 0.83 && rOnConj === 1.0, 'FONTFIX চালু থাকলে ী-কার ও নিচের যুক্তাক্ষর/ফলা (স্থ, ্য) থাকলে পূর্ণ অনুপাত ১.০০ হবে');
  delete globalThis.__FZ_ON_FONTFIX;
}

// ৩. স্বয়ংসম্পূর্ণ (Synthetic) ইউনিট পরীক্ষা — গোল্ডেন ডেটা ফোল্ডার না থাকলেও ৪টি মূল কারণ যাচাই
{
  const synthIr = {
    pages: [
      {
        page: 1,
        widthPt: 595,
        heightPt: 842,
        scale: 1,
        bodyFontPt: 11.5,
        margins: { top: 24, right: 18, bottom: 24, left: 57.6 },
        bands: [
          {
            kind: 'grid',
            y0: 25,
            y1: 90,
            gapBeforePt: 1,
            cells: [
              {
                x0: 57.6,
                x1: 577,
                items: [
                  {
                    kind: 'para',
                    type: 'heading',
                    fs: 'l',
                    bold: true,
                    fontPt: 8,
                    lines: ['“ছাড়পত্রের আবেদন ফরম”'],
                    text: '“ছাড়পত্রের আবেদন ফরম”',
                    rect: { x: 224, y: 74, w: 171, h: 12 },
                    diag: { inkPt: 8.2, estPt: 8.2, wPt: 20.8 }
                  }
                ]
              }
            ]
          },
          {
            kind: 'flow',
            y0: 159,
            y1: 168,
            gapBeforePt: 10,
            cells: [
              {
                x0: 57.6,
                x1: 577,
                items: [
                  {
                    kind: 'para',
                    type: 'paragraph',
                    fs: 'm',
                    bold: false,
                    fontPt: 10,
                    lines: ['জনাব,'],
                    text: 'জনাব,',
                    rect: { x: 60, y: 159, w: 20, h: 8.2 },
                    diag: { inkPt: 8.2, estPt: 9.9, wPt: 9.9 }
                  }
                ]
              }
            ]
          },
          ...Array.from({ length: 6 }, (_, k) => ({
            kind: 'flow',
            y0: 200 + k * 20,
            y1: 212 + k * 20,
            gapBeforePt: 8,
            cells: [
              {
                x0: 57.6,
                x1: 577,
                items: [
                  {
                    kind: 'para',
                    type: 'paragraph',
                    fs: 'm',
                    bold: false,
                    fontPt: k === 4 ? 9 : (k === 3 ? 10 : 11.5),
                    lines: [`০${k + 1}। আবেদনকারীর তথ্য ক্রমিক নং ${k + 1} : ..............................`],
                    text: `০${k + 1}। আবেদনকারীর তথ্য ক্রমিক নং ${k + 1} : ..............................`,
                    rect: { x: 61, y: 200 + k * 20, w: 472, h: 10.1 },
                    diag: { inkPt: 10.1, estPt: k === 4 ? 9.2 : 11.5, wPt: k === 4 ? 9.2 : 11.5 }
                  }
                ]
              }
            ]
          })),
          {
            kind: 'flow',
            y0: 786,
            y1: 794,
            gapBeforePt: 20,
            cells: [
              {
                x0: 57.6,
                x1: 577,
                items: [
                  {
                    kind: 'para',
                    type: 'footer',
                    fs: 's',
                    bold: false,
                    fontPt: 10.5,
                    lines: ['C:\\Users\\USER\\Desktop\\T.C2021-2022.doc'],
                    text: 'C:\\Users\\USER\\Desktop\\T.C2021-2022.doc',
                    rect: { x: 77, y: 786, w: 167, h: 7.2 },
                    diag: { inkPt: 7.2, estPt: 6.9, wPt: 6.9 }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };

  delete globalThis.__FZ_ON_FONTFIX;
  const offCopy = clone(synthIr);
  LF.fit(offCopy);
  check(offCopy.pages[0].bands[0].cells[0].items[0].fontPt === 8, 'সুইচ বন্ধ থাকলে সংশ্লেষিত ফরমের শিরোনাম ৮pt অপরিবর্তিত থাকে');
  check(offCopy.pages[0].bands[8].cells[0].items[0].fontPt === 10.5, 'সুইচ বন্ধ থাকলে সংশ্লেষিত ফুটার ১০.৫pt অপরিবর্তিত থাকে');

  globalThis.__FZ_ON_FONTFIX = true;
  const onCopy = clone(synthIr);
  LF.fit(onCopy);
  check(onCopy.pages[0].bands[0].cells[0].items[0].fontPt === 11.5, 'সুইচ চালু থাকলে বাক্সে কাটা শিরোনাম ১১.৫pt-এ উন্নীত হয়');
  check(onCopy.pages[0].bands[1].cells[0].items[0].fontPt === 11.5, 'সুইচ চালু থাকলে "জনাব," ১১.৫pt-এ সমতাকৃত হয়');
  check(onCopy.pages[0].bands[5].cells[0].items[0].fontPt === 11.5 && onCopy.pages[0].bands[6].cells[0].items[0].fontPt === 11.5, 'সুইচ চালু থাকলে ফরমের সব পূরণ-সারির ফন্ট ১১.৫pt-এ সামঞ্জস্যপূর্ণ হয়');
  check(onCopy.pages[0].bands[8].cells[0].items[0].fontPt === 7, 'সুইচ চালু থাকলে ক্ষুদ্র ফাইল-পাথ ফুটার ৭pt হয়');
  delete globalThis.__FZ_ON_FONTFIX;
}

// ৪. গোল্ডেন ডেটা (a07, a14, a16) দিয়ে সুইচ-বন্ধ অভিন্নতা ও সুইচ-চালু ফন্ট/পিচ যাচাই
if (fs.existsSync(GOLDEN_BASE)) {
  for (const doc of ['a07', 'a14', 'a16']) {
    const dir = path.join(GOLDEN_BASE, doc);
    const cap = JSON.parse(fs.readFileSync(path.join(dir, 'capture.json'), 'utf8'));
    const meas = JSON.parse(fs.readFileSync(path.join(dir, 'measures.json'), 'utf8'));
    const irGold = JSON.parse(fs.readFileSync(path.join(dir, 'ir.json'), 'utf8'));

    // সুইচ বন্ধ অবস্থায় (ডিফল্ট) বিল্ড ও XML
    delete globalThis.__FZ_ON_FONTFIX;
    delete globalThis.__FZ_OFF_FONTFIX;
    const irOff = IR.build(clone(cap), clone(meas.measures), clone(meas.pageInfo));
    LF.fit(irOff);
    const xmlOff = DB.bodyXml(clone(irOff)).xml;
    const xmlGoldOff = DB.bodyXml(clone(irGold)).xml;

    // __FZ_ON_FONTFIX + __FZ_OFF_FONTFIX ওভাররাইড অবস্থায় বিল্ড ও XML (বাইট-বাই-বাইট অভিন্নতা)
    globalThis.__FZ_ON_FONTFIX = true;
    globalThis.__FZ_OFF_FONTFIX = true;
    const irOverride = IR.build(clone(cap), clone(meas.measures), clone(meas.pageInfo));
    LF.fit(irOverride);
    const xmlOverride = DB.bodyXml(clone(irOverride)).xml;
    const xmlGoldOverride = DB.bodyXml(clone(irGold)).xml;

    check(JSON.stringify(irOff) === JSON.stringify(irOverride), `${doc}: __FZ_OFF_FONTFIX থাকলে IR আউটপুট বাইট-বাই-বাইট অভিন্ন`);
    check(xmlOff === xmlOverride && xmlGoldOff === xmlGoldOverride, `${doc}: __FZ_OFF_FONTFIX থাকলে bodyXml আউটপুট বাইট-বাই-বাইট অভিন্ন`);

    // সুইচ চালু অবস্থায় বিল্ড ও ফিট
    delete globalThis.__FZ_OFF_FONTFIX;
    globalThis.__FZ_ON_FONTFIX = true;
    const irOn = IR.build(clone(cap), clone(meas.measures), clone(meas.pageInfo));
    LF.fit(irOn);
    const xmlOn = DB.bodyXml(clone(irOn)).xml;

    // প্রাক-নির্মিত ir.json-এর ওপর LF.fit চালালেও একই ফন্ট-সংস্কার কার্যকর হয় কিনা
    const irPre = clone(irGold);
    LF.fit(irPre);

    check(irOn.pages.length === irOff.pages.length, `${doc}: পাতা-সংখ্যা অপরিবর্তিত (${irOn.pages.length})`);
    check(xmlOn.length > 1000 && xmlOn !== xmlOff, `${doc}: সুইচ চালু থাকলে সংশোধিত XML উৎপন্ন হয়`);

    if (doc === 'a14') {
      const p1 = irOn.pages[0];
      const p2 = irOn.pages[1];
      const p3 = irOn.pages[2];

      // পাতা ১: বহু-লাইনের অনুচ্ছেদের আসল লাইন-পিচ (m.pitchPt) ও ফাইল-পাথ ফুটার (7pt)
      check(p1.bands[4].cells[0].items[0].lineSpacingPt === 17.3, 'a14 p1 b4: ৩-লাইনের অনুচ্ছেদের লাইন-পিচ ১৬.৩ থেকে ১৭.৩pt-এ পুনরুদ্ধার');
      check(p1.bands[6].cells[0].items[0].lineSpacingPt === 18.2, 'a14 p1 b6: ২-লাইনের অনুচ্ছেদের লাইন-পিচ ১৬.২ থেকে ১৮.২pt-এ পুনরুদ্ধার');
      check(p1.bands[11].cells[0].items[0].lineSpacingPt === 18, 'a14 p1 b11: ২-লাইনের অনুচ্ছেদের লাইন-পিচ ১৬.২ থেকে ১৮.০pt-এ পুনরুদ্ধার');
      check(p1.bands[12].cells[0].items[0].lineSpacingPt === 17.8, 'a14 p1 b12: ৩-লাইনের অনুচ্ছেদের লাইন-পিচ ১৬.২ থেকে ১৭.৮pt-এ পুনরুদ্ধার');
      check(p1.bands[15].cells[0].items[0].fontPt === 7, 'a14 p1 b15: ফাইল-পাথ ফুটারের ফন্ট ১০.৫pt থেকে ৭pt-এ সংশোধন');

      // পাতা ২: একই ফরমের ভেতরে ফন্ট-সামঞ্জস্য (১১.৫pt) ও প্রত্যয়ন-বাক্স ছক (৯pt)
      check(p2.bands[0].cells[1].items[2].fontPt === 11.5, 'a14 p2 b0.c1.i2: বাক্সে কাটা পড়া শিরোনাম "ছাড়পত্রের আবেদন ফরম" ৮pt থেকে ১১.৫pt');
      check(p2.bands[3].cells[0].items[0].fontPt === 11.5, 'a14 p2 b3: সংক্ষিপ্ত সম্বোধন "জনাব," ১০pt থেকে ১১.৫pt');
      check(p2.bands[5].cells[0].items[0].bold === false, 'a14 p2 b5: সাধারণ গদ্য লাইনে ভ্রান্ত bold নিরসন');
      check(p2.bands[12].cells[0].items[0].fontPt === 11.5, 'a14 p2 b12: পূরণ-সারি "বিভাগ ... শ্রেণী ..." ১০pt থেকে ১১.৫pt');
      check(p2.bands[18].cells[0].items[0].fontPt === 11.5, 'a14 p2 b18: পূরণ-সারি "০৬। এস.এস.সি পাশের রোল নং ..." ৯pt থেকে ১১.৫pt');
      check(p2.bands[23].cells[0].items[0].fontPt === 9 && irPre.pages[1].bands[23].cells[0].items[0].fontPt === 9, 'a14 p2 b23: প্রত্যয়ন-বাক্স ছকের ফন্ট ৮.৫pt থেকে ৯pt');

      // পাতা ৩: শিরোনাম ১৩pt, ১৪টি ক্রমিক তালিকায় ভ্রান্ত bold নিরসন ও ডান-ইনডেন্ট (১৮pt) সমন্বয়
      check(p3.bands[0].cells[0].items[0].fontPt === 13, 'a14 p3 b0: নির্দেশনা শিরোনাম ১২pt থেকে ১৩pt');
      const p3Lists = p3.bands.slice(1).map((b) => b.cells[0].items[0]);
      check(p3Lists.length === 14 && p3Lists.every((it) => it.bold === false && it.fontPt === 12), 'a14 p3 b1..b14: ১৪টি ক্রমিক আইটেমে ভ্রান্ত bold=true দূর হয়ে ১২pt সাধারণ ফন্ট');
      check(p3.bands[8].cells[0].items[0].justRightPt === 18, 'a14 p3 b8: ৮নং ক্রমিকের সংকুচিত ডান-ইনডেন্ট ৫৬.৯pt থেকে ১৮pt-এ সংশোধন (লাইন-ভাঙা রোধ)');
      check(p3.bands[14].cells[0].items[0].lines.length === 3, 'a14 p3 b14: ১৪নং ক্রমিক থেকে ফাঁকা ও অসম্পূর্ণ RECITATION লাইন অপসারণ (৫ -> ৩ লাইন)');
    }

    if (doc === 'a07') {
      const p1 = irOn.pages[0];
      const p2 = irOn.pages[1];
      const p3 = irOn.pages[2];
      const p4 = irOn.pages[3];
      const p5 = irOn.pages[4];

      check(p1.bands[0].cells[0].items[0].fontPt === 18, 'a07 p1 b0: শিরোনাম "ছক-১" ১৮pt অক্ষত');
      check(p1.bands[4].cells[0].items[0].fontPt === 12 && p1.bands[4].cells[1].items[0].fontPt === 12, 'a07 p1 b4: মোটা স্বাক্ষর-লেবেল ১২.৫pt থেকে ১২pt');
      check(p2.bands[4].cells[0].items[0].fontPt === 13.5, 'a07 p2 b4: মোটা নির্দেশনা অনুচ্ছেদ ১৪pt থেকে ১৩.৫pt');
      check(p3.bands[1].cells[0].items[0].fontPt === 16.5, 'a07 p3 b1: মোটা শিরোনাম ১৮pt থেকে ১৬.৫pt-এ সমন্বয়');
      check(p3.bands[2].cells[0].items[0].fontPt === 11, 'a07 p3 b2: বহু-লাইনের ছক-৩ এর ফন্ট ১১.৫pt থেকে ১১pt (অতিরিক্ত লাইন-ভাঙা রোধ)');
      check(p3.bands[3].cells[0].items[0].fontPt === 12 && p3.bands[3].cells[1].items[0].fontPt === 12 && p3.bands[4].cells[0].items[0].fontPt === 12, 'a07 p3 b3..b4: মোটা স্বাক্ষর-লেবেলগুলোর ফন্ট অভিন্ন ১২pt');
      check(p4.bands[2].cells[0].items[0].fontPt === 12.5, 'a07 p4 b2: ছক-৪ এর ফন্ট ১২.৫pt অক্ষত');
      check(p4.bands[3].cells[0].items[0].fontPt === 12 && p4.bands[3].cells[1].items[0].fontPt === 12 && p4.bands[4].cells[0].items[0].fontPt === 12, 'a07 p4 b3..b4: পাতা ৪-এর মোটা স্বাক্ষর-লেবেলগুলোর ফন্ট অভিন্ন ১২pt');
      check(p5.bands[3].cells[0].items[0].fontPt === 14, 'a07 p5 b3: "ব্যাংকের নাম:" লেবেলের ফন্ট ১৬.৫pt থেকে পাতার মূল ফন্ট ১৪pt-এ সমতাকরণ');
      check(p5.bands[7].cells[0].items[0].fontPt === 13.5, 'a07 p5 b7: পাতা ৫-এর মোটা নির্দেশনা অনুচ্ছেদ পাতা ২-এর সমান ১৩.৫pt');
    }

    if (doc === 'a16') {
      const p1 = irOn.pages[0];
      const p2 = irOn.pages[1];
      const p3 = irOn.pages[2];
      const p5 = irOn.pages[4];
      const p6 = irOn.pages[5];
      const p8 = irOn.pages[7];
      const p9 = irOn.pages[8];

      check(p1.bands[1].cells[0].items[0].lineSpacingPt === 15.1, 'a16 p1 b1: বিষয় অনুচ্ছেদের লাইন-পিচ ১৪.৪ থেকে ১৫.১pt-এ পুনরুদ্ধার');
      check(p1.bands[14].cells[0].items[0].fontPt === 7, 'a16 p1 b14: ফাইল-পাথ ফুটারের ফন্ট ৭.৫pt থেকে ৭pt');

      const bullets = p2.bands.slice(0, 5).map((b) => b.cells[0].items[0]);
      check(bullets.every((it) => it.fontPt === 21), 'a16 p2 b0..b4: প্রচ্ছদ পাতার ৫টি বুলেট আইটেমের ফন্ট ১৮pt থেকে ২১pt-এ একীকরণ');

      check(p3.bands[0].cells[0].items[0].fontPt === 18.5 && p5.bands[0].cells[0].items[0].fontPt === 18.5 && p8.bands[0].cells[0].items[0].fontPt === 18.5 && p9.bands[0].cells[0].items[0].fontPt === 18.5, 'a16 p3,p5,p8,p9: চেকলিস্ট শিরোনামগুলোর ফন্ট অভিন্ন ১৮.৫pt (পাতা ৫-এর ১৫.৫pt ও পাতা ৩/৯-এর ১৯.৫pt সংশোধন)');
      check(p6.bands[0].cells[0].items[0].fontPt === 17.5, 'a16 p6 b0: পাতা ৬-এর চেকলিস্ট শিরোনাম ১৫.৫pt থেকে ১৭.৫pt');

      check(p3.bands[1].cells[0].items[0].fontPt === 13 && p5.bands[1].cells[0].items[0].fontPt === 13 && p6.bands[1].cells[0].items[0].fontPt === 13 && p8.bands[1].cells[0].items[0].fontPt === 13 && p9.bands[1].cells[0].items[0].fontPt === 13, 'a16 p3,p5,p6,p8,p9: চেকলিস্টের বন্ধনীযুক্ত মোটা উপ-শিরোনামগুলোর ফন্ট অভিন্ন ১৩pt');

      check(p5.bands[2].cells[0].items[0].fontPt === 13 && p5.bands[3].cells[0].items[0].fontPt === 13 && p6.bands[2].cells[0].items[0].fontPt === 13 && p6.bands[3].cells[0].items[0].fontPt === 13 && p8.bands[2].cells[0].items[0].fontPt === 13 && p8.bands[3].cells[0].items[0].fontPt === 13 && p9.bands[2].cells[0].items[0].fontPt === 13 && p9.bands[3].cells[0].items[0].fontPt === 13, 'a16 p5,p6,p8,p9: প্রশাসনিক মন্ত্রণালয় ও উদ্যোক্তা সংস্থা লেবেলগুলোর ফন্ট অভিন্ন ১৩pt');
    }
  }
}

// ৫. FONT_v2: প্রোডাকশনের ১২টি ডিফল্ট ভিত্তি-সুইচসহ (A14FIX3, WIDTH, A16FIX3 চালু) A/B রিগ্রেশন নিরসন ও লাইন-উচ্চতা/ফন্ট যাচাই
{
  const V2_SWITCHES = ['A14FIX3', 'WIDTH', 'A16FIX3'];
  for (const name of V2_SWITCHES) {
    globalThis['__FZ_ON_' + name] = true;
    delete globalThis['__FZ_OFF_' + name];
  }

  // সংশ্লেষিত (Synthetic) FONT_v2 যাচাই (গোল্ডেন ডেটা না থাকলেও চলবে)
  const synthV2Ir = {
    pages: [
      {
        page: 1,
        widthPt: 595,
        heightPt: 842,
        scale: 1,
        bodyFontPt: 15,
        margins: { top: 21.6, right: 18, bottom: 20.4, left: 57.6 },
        bands: [
          {
            kind: 'flow',
            y0: 331,
            y1: 363,
            gapBeforePt: 10,
            cells: [{ x0: 57.6, x1: 577, items: [{ kind: 'para', type: 'list_item', fs: 'm', fontPt: 15, align: 'j', indentPt: 53.2, firstIndentPt: -18, justRightPt: 15.1, lineSpacingPt: 16.2, lines: ['ক) প্রথম লাইন', 'হবে।'], text: 'ক) প্রথম লাইন\nহবে।', rect: { x: 110.4, y: 331.6, w: 451.5, h: 31.2 }, diag: { inkPt: 16.3, estPt: 14.6, wPt: 14.6 } }] }]
          },
          {
            kind: 'flow',
            y0: 366,
            y1: 398,
            gapBeforePt: 3,
            cells: [{ x0: 57.6, x1: 577, items: [{ kind: 'para', type: 'list_item', fs: 'm', fontPt: 15, align: 'j', indentPt: 53.2, firstIndentPt: -17, justRightPt: 15.6, lineSpacingPt: 17, lines: ['খ) প্রথম লাইন', 'যাবে।'], text: 'খ) প্রথম লাইন\nযাবে।', rect: { x: 111.3, y: 366.1, w: 450.1, h: 32.1 }, diag: { inkPt: 15.8, estPt: 15.1, wPt: 15.1 } }] }]
          },
          {
            kind: 'flow',
            y0: 470,
            y1: 485,
            gapBeforePt: 2,
            cells: [{ x0: 57.6, x1: 577, items: [{ kind: 'para', type: 'list_item', fs: 'm', fontPt: 15, align: 'j', indentPt: 53.2, firstIndentPt: -17, justRightPt: 31.9, lineSpacingPt: 0, lines: ['ঘ) ছাড়পত্র গ্রহণের স্বপক্ষে প্রামাণ্য কাগজপত্র আবেদন ফরমের সাথে অবশ্যই দাখিল করতে হবে।'], text: 'ঘ) ছাড়পত্র গ্রহণের স্বপক্ষে প্রামাণ্য কাগজপত্র আবেদন ফরমের সাথে অবশ্যই দাখিল করতে হবে।', rect: { x: 110.8, y: 470.7, w: 434.3, h: 14.9 }, diag: { inkPt: 14.9, estPt: 14.9, wPt: 14.9 } }] }]
          },
          {
            kind: 'flow',
            y0: 522,
            y1: 553,
            gapBeforePt: 3,
            cells: [{ x0: 57.6, x1: 577, items: [{ kind: 'para', type: 'list_item', fs: 'm', fontPt: 15, align: 'j', indentPt: 53.2, firstIndentPt: -17, justRightPt: 16.1, lineSpacingPt: 16.2, lines: ['চ) ছাড়পত্রের আবেদন ফরম অত্র শিক্ষা বোর্ডের ওয়েবসাইট <u>www.dinajpureducationboard.gov.bd</u>', 'হতে সংগ্রহ করতে হবে।'], text: 'চ) ছাড়পত্রের আবেদন ফরম অত্র শিক্ষা বোর্ডের ওয়েবসাইট <u>www.dinajpureducationboard.gov.bd</u>\nহতে সংগ্রহ করতে হবে।', rect: { x: 110.8, y: 522.5, w: 450.1, h: 31.2 }, diag: { inkPt: 15.4, estPt: 14.6, wPt: 14.6 } }] }]
          }
        ]
      }
    ]
  };
  globalThis.__FZ_ON_FONTFIX = true;
  LF.fit(synthV2Ir);
  check(synthV2Ir.pages[0].bands[2].cells[0].items[0].align === 'l' && synthV2Ir.pages[0].bands[2].cells[0].items[0].justRightPt == null, 'FONT_v2 সংশ্লেষিত পরীক্ষা: ১-লাইনের ঘ) আইটেমে ভ্রান্ত ডান-ইনডেন্ট অপসারিত');
  check(synthV2Ir.pages[0].bands[3].cells[0].items[0].charSpacingPt === -0.3 && synthV2Ir.pages[0].bands[3].cells[0].items[0].lineSpacingPt === 16.2, 'FONT_v2 সংশ্লেষিত পরীক্ষা: চ) ওয়েবসাইট আইটেমে -০.৩pt অক্ষর-ফাঁক ও ১৬.২pt লাইন-পিচ সংরক্ষিত');
  delete globalThis.__FZ_ON_FONTFIX;

  const GOLDEN_V2_BASE = path.join(
    ROOT,
    'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2+A14FIX3+WIDTH'
  );

  if (fs.existsSync(GOLDEN_V2_BASE)) {
    for (const doc of ['a07', 'a14']) {
      const dir = path.join(GOLDEN_V2_BASE, doc);
      const cap = JSON.parse(fs.readFileSync(path.join(dir, 'capture.json'), 'utf8'));
      const meas = JSON.parse(fs.readFileSync(path.join(dir, 'measures.json'), 'utf8'));
      const irGold = JSON.parse(fs.readFileSync(path.join(dir, 'ir.json'), 'utf8'));

      // সুইচ বন্ধ বনাম __FZ_OFF_FONTFIX ওভাররাইডে বাইট-বাই-বাইট অভিন্নতা
      delete globalThis.__FZ_ON_FONTFIX;
      delete globalThis.__FZ_OFF_FONTFIX;
      const irOff = IR.build(clone(cap), clone(meas.measures), clone(meas.pageInfo));
      LF.fit(irOff);
      const xmlOff = DB.bodyXml(clone(irOff)).xml;
      const xmlGoldOff = DB.bodyXml(clone(irGold)).xml;

      globalThis.__FZ_ON_FONTFIX = true;
      globalThis.__FZ_OFF_FONTFIX = true;
      const irOverride = IR.build(clone(cap), clone(meas.measures), clone(meas.pageInfo));
      LF.fit(irOverride);
      const xmlOverride = DB.bodyXml(clone(irOverride)).xml;
      const xmlGoldOverride = DB.bodyXml(clone(irGold)).xml;

      check(JSON.stringify(irOff) === JSON.stringify(irOverride), `${doc} (v2): __FZ_OFF_FONTFIX থাকলে IR আউটপুট বাইট-বাই-বাইট অভিন্ন`);
      check(xmlOff === xmlOverride && xmlGoldOff === xmlGoldOverride, `${doc} (v2): __FZ_OFF_FONTFIX থাকলে bodyXml আউটপুট বাইট-বাই-বাইট অভিন্ন`);

      // সুইচ চালু অবস্থায় পরীক্ষা
      delete globalThis.__FZ_OFF_FONTFIX;
      globalThis.__FZ_ON_FONTFIX = true;
      const irOn = IR.build(clone(cap), clone(meas.measures), clone(meas.pageInfo));
      LF.fit(irOn);
      const xmlOn = DB.bodyXml(clone(irOn)).xml;

      const irPre = clone(irGold);
      LF.fit(irPre);
      const xmlGoldOn = DB.bodyXml(clone(irPre)).xml;

      if (doc === 'a14') {
        const p1 = irPre.pages[0];
        const p2 = irPre.pages[1];
        const p3 = irPre.pages[2];

        // পাতা ১: ঘ) ১-লাইনের আইটেমে ভ্রান্ত ডান-ইনডেন্ট (w:right="638") অপসারণ ও চ) দীর্ঘ ওয়েবসাইট লাইনে অক্ষর-ফাঁক সংকোচন
        check(p1.bands[4].cells[0].items[0].lineSpacingPt === 17.3 && p1.bands[6].cells[0].items[0].lineSpacingPt === 18.2, 'a14 (v2) p1 b4,b6: গদ্য ও ক) অনুচ্ছেদের লাইন-পিচ ১৭.৩ ও ১৮.২pt পুনরুদ্ধার');
        check(p1.bands[9].cells[0].items[0].align === 'l' && p1.bands[9].cells[0].items[0].justRightPt == null, 'a14 (v2) p1 b9: ১-লাইনের ঘ) আইটেমে ভ্রান্ত ডান-ইনডেন্ট (৩১.৯pt) ও জাস্টিফাই সরিয়ে "হবে।" মোড়ানো রোধ');
        check(p1.bands[11].cells[0].items[0].charSpacingPt === -0.3 && p1.bands[11].cells[0].items[0].lineSpacingPt === 16.2, 'a14 (v2) p1 b11: চ) ওয়েবসাইট লাইনে মোড়ানো রোধে -০.৩pt অক্ষর-ফাঁক ও ১৬.২pt পিচ সংরক্ষণ');
        check(p1.bands[12].cells[0].items[0].lineSpacingPt === 16.2 && p1.bands[15].cells[0].items[0].fontPt === 7, 'a14 (v2) p1 b12,b15: ছ) ১৬.২pt পিচ অক্ষত রেখে ফুটার ৭pt-এ সংশোধন');

        // পাতা ২: ফরমের ১১.৫pt সমতাকরণ ও ৯pt প্রত্যয়ন-বাক্স ছক (+৪.২ স্কোর উন্নতি) অক্ষুণ্ণ
        check(p2.bands[0].cells[1].items[2].fontPt === 11.5 && p2.bands[12].cells[0].items[0].fontPt === 11.5 && p2.bands[18].cells[0].items[0].fontPt === 11.5 && p2.bands[23].cells[0].items[0].fontPt === 9, 'a14 (v2) p2: শিরোনাম, পূরণ-সারি (১১.৫pt) ও প্রত্যয়ন ছক (৯pt) সংস্কার অক্ষুণ্ণ');

        // পাতা ৩: ১৪টি বোল্ড নির্দেশনা আইটেমের আসল বোল্ড অক্ষুণ্ণ রাখা (যাতে পাতা ৩-এর স্কোর ৯৬.০ থেকে ৮৭.৯-এ না নামে)
        const p3Lists = p3.bands.slice(1).map((b) => b.cells[0].items[0]);
        check(p3.bands[0].cells[0].items[0].fontPt === 13 && p3Lists.length === 14 && p3Lists.every((it) => it.bold === true && it.fontPt === 12), 'a14 (v2) p3: ১৪টি ক্রমিক নির্দেশনায় আসল bold=true ও ১২pt ফন্ট সংরক্ষিত (পাতা ৩-এর -৮.১ পতন রোধ)');
        check(xmlGoldOn.includes('<w:spacing w:val="-6"/>') && !xmlGoldOn.includes('w:right="638"'), 'a14 (v2) XML: ঘ)-এ w:right="638" বর্জিত এবং চ)-এ w:spacing w:val="-6" যুক্ত');
      }

      if (doc === 'a07') {
        const p1 = irOn.pages[0];
        const p2 = irOn.pages[1];
        const p3 = irOn.pages[2];
        const p4 = irOn.pages[3];
        const p5 = irOn.pages[4];

        // স্বাক্ষর-লেবেল (১২.৫ -> ১২pt) ও নিচের টিক-চিত্র সংস্কার অক্ষুণ্ণ রেখে পাতা ২, ৩ ও ৫-এর ক্ষতিকর ফন্ট-সংকোচন রোধ
        check(p1.bands[4].cells[0].items[0].fontPt === 12 && p1.bands[4].cells[1].items[0].fontPt === 12, 'a07 (v2) p1: স্বাক্ষর-লেবেল ১২.৫pt থেকে ১২pt-এ সমন্বয়');
        check(p2.bands[4].cells[0].items[0].fontPt === 14 && p2.bands[5].cells[0].items[0].widthPt === 20.8, 'a07 (v2) p2: নির্দেশনা অনুচ্ছেদ ১৪pt অক্ষত এবং টিক-চিত্রের আকার পুনরুদ্ধার (dh: -৩ -> ০)');
        check(p3.bands[1].cells[0].items[0].fontPt === 18 && p3.bands[2].cells[0].items[0].fontPt === 11.5 && p3.bands[3].cells[0].items[0].fontPt === 12 && p3.bands[4].cells[0].items[0].fontPt === 12, 'a07 (v2) p3: শিরোনাম ১৮pt ও ছক-৩ ১১.৫pt অক্ষত রেখে স্বাক্ষর-লেবেল ১২pt');
        check(p4.bands[2].cells[0].items[0].fontPt === 12.5 && p4.bands[3].cells[0].items[0].fontPt === 12 && p4.bands[5].cells[0].items[0].widthPt === 20.8, 'a07 (v2) p4: ছক-৪ ১২.৫pt, স্বাক্ষর-লেবেল ১২pt এবং টিক-চিত্র পুনরুদ্ধার (+৩.৪ স্কোর উন্নতি)');
        check(p5.bands[3].cells[0].items[0].fontPt === 16.5 && p5.bands[7].cells[0].items[0].fontPt === 14, 'a07 (v2) p5: "ব্যাংকের নাম:" ১৬.৫pt ও নির্দেশনা ১৪pt অক্ষত (পাতা ৫-এর -১.৪ পতন রোধ)');
        check(xmlOn !== xmlOff && xmlGoldOn.includes('<w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr><w:t xml:space="preserve">উপব্যবস্থাপনা পরিচালক পদে পদোন্নতিযোগ্য মহাব্যবস্থাপকগণের বিস্তারিত তথ্য</w:t>'), 'a07 (v2) XML: পাতা ৩-এর ১৮pt শিরোনাম (sz=36) অক্ষত');
      }
    }
  }

  for (const name of V2_SWITCHES) {
    delete globalThis['__FZ_ON_' + name];
  }
}

delete globalThis.__FZ_ON_FONTFIX;
delete globalThis.__FZ_OFF_FONTFIX;

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
