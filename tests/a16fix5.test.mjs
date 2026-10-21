/**
 * A16_SCORE_v5 ইউনিট ও ইন্টিগ্রেশন টেস্ট (tests/a16fix5.test.mjs)
 * ==============================================================
 * কোনো বাহ্যিক লাইব্রেরি বা switch-defaults.js ছাড়াই ১৪টি বেস সুইচ পিন করে
 * __FZ_ON_A16FIX5 ও __FZ_OFF_A16FIX5 সুইচের কার্যকারিতা যাচাই করে।
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// switch-defaults.js লোড না করে টেস্টের শুরুতে ১৪টি ডিফল্ট-চালু বেস সুইচ পিন করা
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES', 'A07FIX3'
];

function resetSwitches() {
  for (const k of Object.keys(globalThis)) {
    if (k.startsWith('__FZ_ON_') || k.startsWith('__FZ_OFF_')) {
      delete globalThis[k];
    }
  }
  for (const sw of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + sw] = true;
  }
}

resetSwitches();

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const BLD = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const RUN_DIR = path.join(
  ROOT,
  'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2+A14FIX3+WIDTH+A16FIX3+A14RULES+A07FIX3/a16'
);

const rawCapture = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'capture.json'), 'utf8'));
const rawMeasures = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'measures.json'), 'utf8'));
const rawGoldenIr = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'ir.json'), 'utf8'));

const clone = (obj) => JSON.parse(JSON.stringify(obj));

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

// ১) সুইচ গেটিং যাচাই (OFF, ON, এবং OFF ওভাররাইড)
resetSwitches();
check(
  'ডিফল্ট অবস্থায় A16FIX5 সুইচ বন্ধ থাকে (a16Fix5On === false)',
  IR.a16Fix5On() === false && LF.isA16Fix5On() === false && BLD.a16Fix5On() === false
);

globalThis.__FZ_ON_A16FIX5 = true;
check(
  '__FZ_ON_A16FIX5 = true দিলে তিনটি মডিউলেই সুইচ সক্রিয় হয় এবং A16FIX4 বন্ধ থাকে',
  IR.a16Fix5On() === true && LF.isA16Fix5On() === true && BLD.a16Fix5On() === true && IR.a16Fix4On() === false
);

globalThis.__FZ_OFF_A16FIX5 = true;
check(
  '__FZ_OFF_A16FIX5 = true দিলে __FZ_ON_A16FIX5 থাকা সত্ত্বেও সুইচ নিষ্ক্রিয় হয়',
  IR.a16Fix5On() === false && LF.isA16Fix5On() === false && BLD.a16Fix5On() === false
);

// ২) সুইচ বন্ধ (OFF) থাকলে পূর্বতন আচরণের সাথে বাইট-ফর-বাইট অভিন্নতা যাচাই
resetSwitches();
const irBase = IR.build(clone(rawCapture), clone(rawMeasures.measures), clone(rawMeasures.pageInfo));
LF.fit(irBase);
const docxBase = BLD.bodyXml(clone(irBase));

resetSwitches();
globalThis.__FZ_ON_A16FIX5 = true;
globalThis.__FZ_OFF_A16FIX5 = true;
const irDisabled = IR.build(clone(rawCapture), clone(rawMeasures.measures), clone(rawMeasures.pageInfo));
LF.fit(irDisabled);
const docxDisabled = BLD.bodyXml(clone(irDisabled));

check(
  'A16FIX5 বন্ধ থাকলে IR এবং DOCX XML বেসলাইনের সাথে বাইট-ফর-বাইট অভিন্ন থাকে',
  JSON.stringify(irBase) === JSON.stringify(irDisabled) &&
    docxBase.xml === docxDisabled.xml &&
    docxBase.media.length === docxDisabled.media.length
);

// ৩) A16FIX5 চালু অবস্থায় (ক্যাপচার + মেজার্স থেকে পূর্ণ বিল্ড) সকল পাতার মেরামত যাচাই
resetSwitches();
globalThis.__FZ_ON_A16FIX5 = true;
const irOn = IR.build(clone(rawCapture), clone(rawMeasures.measures), clone(rawMeasures.pageInfo));
LF.fit(irOn);
const docxOn = BLD.bodyXml(clone(irOn));

const sectCount = (docxOn.xml.match(/<w:sectPr>/g) || []).length;
check(
  'পাতা সংখ্যা অপরিবর্তিত থাকে (IR-এ ৯টি পাতা এবং DOCX-এ ঠিক ৯টি সেকশন)',
  irOn.pages.length === 9 && sectCount === 9,
  `pages=${irOn.pages.length}, sectCount=${sectCount}`
);

// পাতা ১: বাম মার্জিনের খাড়া বিভাজক রেখা (_a16Fix5Overlays) ও ফুটারের প্রস্থ
const p1 = irOn.pages[0];
const p1Footer = p1.bands[p1.bands.length - 1].cells[0].items[0];
check(
  'পাতা ১ (ইউ.ও. নোট): বাম মার্জিনের খাড়া রেখার ৪টি ওভারলে খণ্ড (x=98 ও টিক x=92) সংযুক্ত হয়েছে',
  Array.isArray(p1._a16Fix5Overlays) &&
    p1._a16Fix5Overlays.length === 4 &&
    Math.abs(p1._a16Fix5Overlays[0].x - 97.9) <= 0.2 &&
    p1._a16Fix5Overlays[2].y === 309 &&
    p1._a16Fix5Overlays[2].h === 308 &&
    p1._a16Fix5Overlays[3].y === 555
);
check(
  'পাতা ১: ক্ষুদ্র ফাইল-পাথ ফুটারে (fontPt=7) ডান-প্রান্ত মেলানোর জন্য charSpacingPt = 0.1 নির্ধারিত হয়েছে',
  p1Footer.fontPt === 7 && p1Footer.charSpacingPt === 0.1
);

// পাতা ২: সূচিপত্র বুলেটগুলোর ফন্ট ২০.৫pt ও ৪র্থ বুলেটের বাড়তি "করণ" প্রত্যয় সংশোধন
const p2 = irOn.pages[1];
const p2Bullets = p2.bands.map((b) => b.cells[0].items[0]).filter((it) => it.type === "list_item");
check(
  'পাতা ২ (সূচিপত্র): ৫টি বুলেটের সবকটির ফন্ট ২০.৫pt-এ সমতাকৃত হয়েছে (ফন্ট-উচ্চতা ত্রুটি নিরসন)',
  p2Bullets.length === 5 && p2Bullets.every((it) => it.fontPt === 20.5)
);
check(
  'পাতা ২: ৪র্থ বুলেটে ক্যাপচারের বাড়তি প্রত্যয় ("অন্তর্ভুক্তিকরণ" → "অন্তর্ভুক্তি") সংশোধিত ও charSpacingPt = 0.15 সেট হয়েছে',
  /অন্তর্ভুক্তি\*{0,2}$/.test(p2Bullets[3].text.trim()) &&
    !/অন্তর্ভুক্তিকরণ/.test(p2Bullets[3].text) &&
    p2Bullets[3].charSpacingPt === 0.15
);

// পাতা ৪: শীর্ষ-ডান স্ক্যান-চিহ্ন (_a16Fix5Overlays) ও স্বাক্ষর-ব্লকের উল্লম্ব অবস্থান
const p4 = irOn.pages[3];
const p4Sig = p4.bands[3].cells[0].items[0];
const p4SigBase = irBase.pages[3].bands[3].cells[0].items[0];
check(
  'পাতা ৪ (-০২- অনুবৃত্তি পাতা): ২টি অমিল সারি নিরসনে শীর্ষ-ডান কোণের ২টি স্ক্যান-বিন্দু (y=12, 37) যুক্ত হয়েছে',
  Array.isArray(p4._a16Fix5Overlays) &&
    p4._a16Fix5Overlays.length === 2 &&
    p4._a16Fix5Overlays[0].x === 553 &&
    p4._a16Fix5Overlays[0].y === 12 &&
    p4._a16Fix5Overlays[1].x === 577 &&
    p4._a16Fix5Overlays[1].y === 37
);
check(
  'পাতা ৪: ৩-লাইনের স্বাক্ষর-ব্লক ("স্বাক্ষর/-") ২.০pt উপরে সরিয়ে dy=+2 ত্রুটি নিরসন করা হয়েছে',
  Math.abs((p4SigBase.rect.y - p4Sig.rect.y) - 2.0) <= 0.15
);

// পাতা ৫: উপ-শিরোনামের আন্ডারলাইন, অণু-স্বাক্ষর চিত্র ও স্বাক্ষর-ব্লক
const p5 = irOn.pages[4];
const p5Head = p5.bands[1].cells[0].items[0];
const p5Fig = p5.bands[6].cells[0].items[0];
const p5Sig = p5.bands[7].cells[0].items[0];
const p5SigBase = irBase.pages[4].bands[7].cells[0].items[0];
check(
  'পাতা ৫: উপ-শিরোনামে (heading) মুছে যাওয়া আন্ডারলাইন (underline=true) পুনরুদ্ধার হয়েছে',
  p5Head.underline === true
);
check(
  'পাতা ৫: অণু-স্বাক্ষর চিত্রে A07FIX3-এর _a07FigLeadPt অপসারিত হয়ে প্রকৃত প্রস্থ (২১.১pt) ও উচ্চতা (২৫.০pt) পুনরুদ্ধার হয়েছে',
  p5Fig._a07FigLeadPt === undefined && p5Fig.widthPt === 21.1 && p5Fig.heightPt === 25.0
);
check(
  'পাতা ৫: নিচের স্বাক্ষর-ব্লক ("স্বাক্ষর/-") ৩.২pt উপরে সরিয়ে dy=+4 ত্রুটি নিরসন করা হয়েছে',
  Math.abs((p5SigBase.rect.y - p5Sig.rect.y) - 3.2) <= 0.15
);

// পাতা ৬: শিরোনাম ফন্ট ১৬.৫pt, উপ-শিরোনাম আন্ডারলাইন, অণু-স্বাক্ষর চিত্রের পূর্ণ প্রস্থ ও ফুটারের অবস্থান
const p6 = irOn.pages[5];
const p6Title = p6.bands[0].cells[0].items[0];
const p6Head = p6.bands[1].cells[0].items[0];
const p6Fig = p6.bands[5].cells[0].items[0];
const p6Footer = p6.bands[6].cells[0].items[0];
check(
  'পাতা ৬: শিরোনামের (title) ফন্ট ১৬.৫pt এবং উপ-শিরোনামের আন্ডারলাইন (underline=true) পুনরুদ্ধার হয়েছে',
  p6Title.fontPt === 16.5 && p6Head.underline === true
);
check(
  'পাতা ৬: ছকের নিচের অণু-স্বাক্ষর চিত্রের পূর্ণ প্রস্থ (২৯.৭pt) পুনরুদ্ধার ও _a16WideSigCrop অপসারিত হয়েছে (dx1=-11 নিরসন)',
  p6Fig.widthPt === 29.7 && p6Fig.heightPt === 22.0 && p6Fig._a16WideSigCrop === undefined
);
check(
  'পাতা ৬: ফুটারের ("অঃ পৃঃ দ্রঃ") লাইন-উচ্চতা ১১.৫pt ও উল্লম্ব অবস্থান ২.০pt উপরে সমন্বয় করা হয়েছে (dy=+4 নিরসন)',
  p6Footer.lineSpacingPt === 11.5 && Math.abs(p6Footer.rect.y - 750.4) <= 0.2
);

// পাতা ৭: শীর্ষ-ডান স্ক্যান-চিহ্ন (_a16Fix5Overlays), অণু-স্বাক্ষর চিত্র ও স্বাক্ষর-ব্লক
const p7 = irOn.pages[6];
const p7Fig = p7.bands[2].cells[0].items[0];
const p7Sig = p7.bands[3].cells[0].items[0];
check(
  'পাতা ৭ (-০২- অনুবৃত্তি পাতা): ৩টি অমিল সারি নিরসনে শীর্ষ-ডান কোণের ৪টি স্ক্যান-বিন্দু (y=13, 35, 37, 55) যুক্ত হয়েছে',
  Array.isArray(p7._a16Fix5Overlays) &&
    p7._a16Fix5Overlays.length === 4 &&
    p7._a16Fix5Overlays[0].y === 13 &&
    p7._a16Fix5Overlays[1].y === 35 &&
    p7._a16Fix5Overlays[2].y === 37 &&
    p7._a16Fix5Overlays[3].y === 55
);
check(
  'পাতা ৭: অণু-স্বাক্ষর চিত্রের উচ্চতা ১৮.৮pt এবং স্বাক্ষর-ব্লকের ফন্ট ১৩.৫pt, পিচ ১৪.৬pt ও অবস্থান ৪.৫pt উপরে সমন্বয় করা হয়েছে',
  p7Fig.heightPt === 18.8 &&
    p7Sig.fontPt === 13.5 &&
    p7Sig.lineSpacingPt === 14.6 &&
    Math.abs(p7Sig.rect.y - 313.2) <= 0.2
);

// পাতা ৮ ও পাতা ৯: উপ-শিরোনাম আন্ডারলাইন, অণু-স্বাক্ষর চিত্র ও স্বাক্ষর-ব্লক
const p8 = irOn.pages[7];
const p8Head = p8.bands[1].cells[0].items[0];
const p8Fig = p8.bands[5].cells[0].items[0];
const p8Sig = p8.bands[6].cells[0].items[0];
const p9 = irOn.pages[8];
const p9Sig = p9.bands[6].cells[0].items[0];
check(
  'পাতা ৮: উপ-শিরোনামে আন্ডারলাইন (underline=true) ও charSpacingPt = 0.1 এবং অণু-স্বাক্ষর চিত্রের পূর্ণ প্রস্থ (২৮.০pt) পুনরুদ্ধার হয়েছে',
  p8Head.underline === true &&
    p8Head.charSpacingPt === 0.1 &&
    p8Fig.widthPt === 28.0 &&
    p8Fig._a16WideSigCrop === undefined
);
check(
  'পাতা ৮ ও পাতা ৯: নিচের স্বাক্ষর-ব্লক ২.০pt উপরে সরিয়ে dy=+2..+3 ত্রুটি নিরসন করা হয়েছে',
  Math.abs(p8Sig.rect.y - 533.5) <= 0.2 && Math.abs(p9Sig.rect.y - 620.4) <= 0.2
);

// ৪) সরাসরি পূর্ব-নির্মিত ir.json লোড করে planPage / bodyXml চালালেও একই মেরামত কার্যকর হওয়া যাচাই
const prebuiltIr = clone(rawGoldenIr);
const docxFromPrebuilt = BLD.bodyXml(prebuiltIr);
const anchorCount = (docxFromPrebuilt.xml.match(/<wp:anchor[^>]*behindDoc="1"/g) || []).length;
check(
  'পূর্ব-নির্মিত ir.json থেকে সরাসরি bodyXml তৈরি করলেও ১০টি ভাসমান ওভারলে অ্যাঙ্কর (৪ + ২ + ৪) যুক্ত হয়',
  anchorCount === 10,
  `anchorCount=${anchorCount}`
);

// ৫) বিশুদ্ধ জাভাস্ক্রিপ্টে তৈরি PNG (makeGrayPngBase64) এর বৈধতা যাচাই
const pngB64 = BLD.makeGrayPngBase64(2, 2, 0);
const pngBuf = Buffer.from(pngB64, 'base64');
const isPngSig = pngBuf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
const ihdrLen = pngBuf.readUInt32BE(8);
const ihdrType = pngBuf.subarray(12, 16).toString('ascii');
const idatOffset = 8 + 12 + ihdrLen;
const idatLen = pngBuf.readUInt32BE(idatOffset);
const idatType = pngBuf.subarray(idatOffset + 4, idatOffset + 8).toString('ascii');
const idatData = pngBuf.subarray(idatOffset + 8, idatOffset + 8 + idatLen);
const decompressed = zlib.inflateSync(idatData);
check(
  'makeGrayPngBase64 বৈধ গ্রেস্কেল PNG (সঠিক স্বাক্ষর, IHDR, zlib IDAT ও IEND) তৈরি করে',
  isPngSig &&
    ihdrType === 'IHDR' &&
    idatType === 'IDAT' &&
    decompressed.length === 2 * (1 + 2) &&
    decompressed.every((b) => b === 0)
);

// ৬) পূর্ণ .docx ZIP বিল্ড ও নন-ম্যাচিং পাতার অপরিবর্তনীয়তা যাচাই
const zipBytes = await BLD.build(clone(rawGoldenIr), { type: 'uint8array' });
check(
  'FayzarFaithfulDocx.build বৈধ .docx ZIP আর্কাইভ (PK\\x03\\x04) তৈরি করে',
  zipBytes instanceof Uint8Array && zipBytes.length > 10000 && zipBytes[0] === 0x50 && zipBytes[1] === 0x4b
);

const unrelatedPage = {
  page: 1,
  widthPt: 595.2,
  heightPt: 841.9,
  margins: { top: 54, left: 54, right: 54, bottom: 54 },
  bodyFontPt: 12,
  bands: [
    {
      kind: 'flow',
      y0: 60,
      y1: 75,
      gapBeforePt: 6,
      cells: [
        {
          x0: 54,
          x1: 541.2,
          items: [
            {
              kind: 'para',
              type: 'paragraph',
              text: 'সাধারণ গদ্য অনুচ্ছেদ যা চেকলিস্ট বা স্মারক নয়।',
              lines: ['সাধারণ গদ্য অনুচ্ছেদ যা চেকলিস্ট বা স্মারক নয়।'],
              fontPt: 12,
              align: 'l',
              indentPt: 0,
              rect: { x: 54, y: 60, w: 240, h: 14 }
            }
          ]
        }
      ]
    }
  ]
};
const unrelatedBefore = JSON.stringify(unrelatedPage);
IR.repairA16Fix5Page(unrelatedPage);
check(
  'অ-সম্পর্কিত সাধারণ পাতায় repairA16Fix5Page কোনো পরিবর্তন করে না',
  JSON.stringify(unrelatedPage) === unrelatedBefore && unrelatedPage._a16Fix5Overlays === undefined
);

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
