/**
 * A16_SCORE_v3 অফলাইন পরীক্ষা-ফাইল (tests/a16-fix3.test.mjs)
 *
 * পরীক্ষা করে:
 * ১) সুইচ অফ (__FZ_ON_A16FIX3 ফ্ল্যাগ ছাড়া) এবং নিষ্ক্রিয়করণ ওভাররাইড (__FZ_OFF_A16FIX3 = true) অবস্থায়
 *    আগের আউটপুটের সাথে ১০০% বাইট-টু-বাইট অভিন্নতা (switch-defaults.js রিকোয়ার না করে)।
 * ২) সুইচ অন (__FZ_ON_A16FIX3 = true) অবস্থায় নমুনা a16-এর ৯টি পাতার সকল মেরামত:
 *    - পাতা সংখ্যা অবিকল ৯ থাকা এবং কোনো পাতায় উপচানো (overflow) না থাকা।
 *    - পাতা ৩, ৪, ৬, ৭, ৮, ৯-এর ছকের নিচের ৬টি অণু-স্বাক্ষর চিত্রের (figure) চওড়া-ক্রপ নিরসন,
 *      প্রকৃত প্রস্থ (২০.০–২৫.৯pt), বাম-ইনডেন্ট (১৬৮.১–১৮৬.০pt), অবস্থান (tblBotY + ২.৬pt),
 *      উচ্চতা (২২.৬–২৫.৯pt) ও XML-এ <a:srcRect> ক্রপিং।
 *    - পাতা ১-এর ডান-অর্ধেকের স্বাক্ষর-চিত্র (ব্যান্ড ৪) ও ৪-লাইনের স্বাক্ষর-ব্লকের (ব্যান্ড ৫)
 *      dropSigDates-জনিত -৬.৭pt উল্লম্ব সরণ নিরসন (y = ৩৪৪.৬pt, উচ্চতা = ৫৩.৭pt), মাঝ-সাজানো
 *      (align = 'c', centerShiftPt = ১৬০.৭pt) এবং ইমেইল লাইনের (om2@mopa.gov.bd) ১০.৫pt ফন্ট।
 *    - পাতা ১-এর শীর্ষ হেডার (১৩pt), গদ্য অনুচ্ছেদের প্রকৃত বাম-ইনডেন্ট (৪৪.৬pt), ২-লাইনের ক্রমিক
 *      তালিকার লাইন-পিচ (১৫.২pt), ১-লাইনের ক্রমিক তালিকার অক্ষর-ফাঁক (০.১৫pt) ও ফুটারের ফন্ট (৭pt)।
 *    - পাতা ২-এর বড় ফন্টের সূচিপত্র পাতায় বুলেট-তালিকার প্রকৃত ফন্ট (২১.৫pt ও ১৮pt) এবং বাম-ইনডেন্ট।
 *    - পাতা ৫, ৬, ৮-এর চেকলিস্ট শিরোনামের ফন্ট (১৯.৫pt, ১৭.৫pt), উপ-শিরোনামের কেন্দ্র-সরণ (-৮.৯pt)
 *      ও ছকের নিচের মোটা নির্দেশনা-অনুচ্ছেদের ফন্ট (১৩pt)।
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// switch-defaults.js রিকোয়ার না করে ভিত্তি সুইচগুলো সক্রিয় করার সহায়ক ফাংশন
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

function setBaseSwitches() {
  for (const name of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + name] = true;
    delete globalThis['__FZ_OFF_' + name];
  }
}

function clearA16Fix3Flags() {
  delete globalThis.__FZ_ON_A16FIX3;
  delete globalThis.__FZ_OFF_A16FIX3;
  if (typeof process !== 'undefined' && process && process.env) {
    delete process.env.__FZ_ON_A16FIX3;
    delete process.env.__FZ_OFF_A16FIX3;
    delete process.env.FZ_ON;
    delete process.env.FZ_OFF;
  }
}

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

globalThis.FayzarLayoutIR = IR;
globalThis.FayzarLineFit = LF;
globalThis.FayzarFaithfulDocx = DB;

const RUN_DIR = path.join(
  ROOT,
  'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2/a16'
);
const rawMeasures = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'measures.json'), 'utf8'));
const goldenIr = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'ir.json'), 'utf8'));

const DUMMY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const clone = (obj) => JSON.parse(JSON.stringify(obj));

// ব্রাউজারে cropFigures যেভাবে IR-এর চিত্রগুলোতে { dataUrl, pxW, pxH } যুক্ত করে তার অনুকরণ
function attachGoldenFigureImages(ir) {
  for (let pi = 0; pi < ir.pages.length; pi++) {
    const p = ir.pages[pi];
    const gP = goldenIr.pages[pi];
    if (!p || !gP) continue;
    p.bands.forEach((b, bi) => {
      const gB = gP.bands[bi];
      if (!b || !gB) return;
      b.cells.forEach((c, ci) => {
        const gC = gB.cells[ci];
        if (!c || !gC) return;
        c.items.forEach((it, ii) => {
          const gIt = gC.items[ii];
          if (it && it.kind === 'figure' && gIt && gIt.image) {
            it.image = Object.assign({ dataUrl: DUMMY_PNG }, gIt.image);
          }
        });
      });
    });
  }
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
// ১. সুইচ অফ (__FZ_ON_A16FIX3 ছাড়া) এবং নিষ্ক্রিয়করণ ওভাররাইড (__FZ_OFF_A16FIX3) পরীক্ষা
// ============================================================================
console.log('--- পর্ব ১: সুইচ অফ ও নিষ্ক্রিয়করণ ওভাররাইড পরীক্ষা ---');
setBaseSwitches();
clearA16Fix3Flags();

check('সুইচ অফ অবস্থায় IR.a16Fix3On() === false', IR.a16Fix3On() === false);
check('সুইচ অফ অবস্থায় LF.isA16Fix3On() === false', LF.isA16Fix3On() === false);
check('সুইচ অফ অবস্থায় DB.a16Fix3On() === false', DB.a16Fix3On() === false);

const irOff = IR.build(clone(rawMeasures.cap), clone(rawMeasures.measures), clone(rawMeasures.pageInfo));
attachGoldenFigureImages(irOff);
LF.fit(irOff);
const docOff = DB.bodyXml(irOff, { title: 'a16' });

check('সুইচ অফ অবস্থায় পাতা সংখ্যা অবিকল ৯', irOff.pages.length === 9);
check(
  'সুইচ অফ অবস্থায় পাতা ১-এর স্বাক্ষর-ব্লক আগের মতোই বাম-সাজানো (align="l", y=337.9)',
  irOff.pages[0].bands[5].cells[0].items[0].align === 'l' &&
    irOff.pages[0].bands[5].cells[0].items[0].rect.y === 337.9
);
check(
  'সুইচ অফ অবস্থায় পাতা ৬-এর অণু-স্বাক্ষর চিত্র আগের মতোই চওড়া (widthPt=70.4, heightPt=31.1)',
  irOff.pages[5].bands[5].cells[0].items[0].widthPt === 70.4 &&
    irOff.pages[5].bands[5].cells[0].items[0].heightPt === 31.1
);
check(
  'সুইচ অফ অবস্থায় পাতা ২-এর প্রথম বুলেট আইটেম ১৮pt',
  irOff.pages[1].bands[0].cells[0].items[0].fontPt === 18
);
check(
  'সুইচ অফ অবস্থায় পাতা ৫-এর শিরোনাম ১৫.৫pt',
  irOff.pages[4].bands[0].cells[0].items[0].fontPt === 15.5
);

// __FZ_ON_A16FIX3 = true থাকলেও __FZ_OFF_A16FIX3 = true দিলে সুইচ নিষ্ক্রিয় থাকে এবং আউটপুট ১০০% অভিন্ন হয়
globalThis.__FZ_ON_A16FIX3 = true;
globalThis.__FZ_OFF_A16FIX3 = true;
check('__FZ_OFF_A16FIX3 ওভাররাইডে IR.a16Fix3On() === false', IR.a16Fix3On() === false);
check('__FZ_OFF_A16FIX3 ওভাররাইডে LF.isA16Fix3On() === false', LF.isA16Fix3On() === false);
check('__FZ_OFF_A16FIX3 ওভাররাইডে DB.a16Fix3On() === false', DB.a16Fix3On() === false);

const irOverrideOff = IR.build(clone(rawMeasures.cap), clone(rawMeasures.measures), clone(rawMeasures.pageInfo));
attachGoldenFigureImages(irOverrideOff);
LF.fit(irOverrideOff);
const docOverrideOff = DB.bodyXml(irOverrideOff, { title: 'a16' });

check(
  '__FZ_OFF_A16FIX3 ওভাররাইডে IR আউটপুট সুইচ-অফ অবস্থার সাথে ১০০% বাইট-টু-বাইট অভিন্ন',
  JSON.stringify(irOff) === JSON.stringify(irOverrideOff)
);
check(
  '__FZ_OFF_A16FIX3 ওভাররাইডে DOCX XML আউটপুট সুইচ-অফ অবস্থার সাথে ১০০% বাইট-টু-বাইট অভিন্ন',
  JSON.stringify(docOff) === JSON.stringify(docOverrideOff)
);

// পরিবেশ চলক (FZ_ON / FZ_OFF) পরীক্ষা
clearA16Fix3Flags();
process.env.FZ_ON = 'WRAPFIT,A16FIX3';
check(
  'FZ_ON=WRAPFIT,A16FIX3 পরিবেশ চলকে সুইচ সক্রিয় হয়',
  IR.a16Fix3On() === true && LF.isA16Fix3On() === true && DB.a16Fix3On() === true
);
process.env.FZ_OFF = 'A16FIX3';
check(
  'FZ_OFF=A16FIX3 পরিবেশ চলকে সুইচ নিষ্ক্রিয় হয়',
  IR.a16Fix3On() === false && LF.isA16Fix3On() === false && DB.a16Fix3On() === false
);

// ============================================================================
// ২. সুইচ অন (__FZ_ON_A16FIX3 = true) অবস্থায় নমুনা a16-এর পূর্ণাঙ্গ পরীক্ষা
// ============================================================================
console.log('--- পর্ব ২: সুইচ অন (__FZ_ON_A16FIX3 = true) অবস্থায় মেরামত পরীক্ষা ---');
clearA16Fix3Flags();
globalThis.__FZ_ON_A16FIX3 = true;

check('সুইচ অন অবস্থায় IR.a16Fix3On() === true', IR.a16Fix3On() === true);
check('সুইচ অন অবস্থায় LF.isA16Fix3On() === true', LF.isA16Fix3On() === true);
check('সুইচ অন অবস্থায় DB.a16Fix3On() === true', DB.a16Fix3On() === true);

const irOn = IR.build(clone(rawMeasures.cap), clone(rawMeasures.measures), clone(rawMeasures.pageInfo));
attachGoldenFigureImages(irOn);
LF.fit(irOn);
const docOn = DB.bodyXml(irOn, { title: 'a16' });

// পাতা সংখ্যা ও পাতা-পরিকল্পনা পরীক্ষা
check('সুইচ অন অবস্থায় মোট পাতা সংখ্যা অবিকল ৯', irOn.pages.length === 9 && goldenIr.pages.length === 9);
const sectCount = (docOn.xml.match(/<w:sectPr\b/g) || []).length;
check('DOCX XML-এ মোট সেকশন (sectPr) সংখ্যা অবিকল ৯ (কোনো পাতা বাড়েনি)', sectCount === 9, `sectCount=${sectCount}`);

let allPagesFitWithoutShrink = true;
for (const p of irOn.pages) {
  const plan = DB.planPage(p);
  if (!plan || plan.f < 1) {
    allPagesFitWithoutShrink = false;
  }
}
check('সব ৯টি পাতায় planPage কোনো উল্লম্ব সংকোচন ছাড়াই (f === 1) পাতার ভেতরে আঁটে', allPagesFitWithoutShrink);

// --- পাতা ১ পরীক্ষা ---
const p1 = irOn.pages[0];
const p1Header = p1.bands[0].cells[0].items[0];
check(
  'পাতা ১ ব্যান্ড ০ (শীর্ষ ডান-ঘেঁষা হেডার): fontPt=13 ও lineSpacingPt=15.2 (row[0] dx0=+8 নিরসন)',
  p1Header.fontPt === 13 && p1Header.lineSpacingPt === 15.2,
  `fontPt=${p1Header.fontPt}, lineSpacingPt=${p1Header.lineSpacingPt}`
);

const p1Para = p1.bands[2].cells[0].items[0];
check(
  'পাতা ১ ব্যান্ড ২ (পদ সৃজন অনুচ্ছেদ): প্রকৃত বাম-ইনডেন্ট ৪৪.৬pt ও ডান-সংকোচন ১৭.৭pt পুনরুদ্ধার (row[3..6] dx0=-3 নিরসন)',
  p1Para.indentPt === 44.6 && p1Para.justRightPt === 17.7,
  `indentPt=${p1Para.indentPt}, justRightPt=${p1Para.justRightPt}`
);

const p1SigFig = p1.bands[4].cells[0].items[0];
const p1SigBlk = p1.bands[5].cells[0].items[0];
check(
  'পাতা ১ ব্যান্ড ৪ (স্বাক্ষর-চিত্র): dropSigDates-এর অতিরিক্ত ৬.৭pt কর্তন রোধ করে উচ্চতা ৩৩.৬pt (y=309..342.6)',
  p1SigFig.heightPt === 33.6 && p1.bands[4].y0 === 309 && p1.bands[4].y1 === 342.6,
  `heightPt=${p1SigFig.heightPt}, y0=${p1.bands[4].y0}, y1=${p1.bands[4].y1}`
);
check(
  'পাতা ১ ব্যান্ড ৫ (পুর্শিয়া আক্তার স্বাক্ষর-ব্লক): y=344.6pt, h=53.7pt, মাঝ-সাজানো (align="c", centerShiftPt=160.7pt)',
  p1SigBlk.rect.y === 344.6 &&
    p1SigBlk.rect.h === 53.7 &&
    p1SigBlk.align === 'c' &&
    p1SigBlk.centerShiftPt === 160.7,
  `y=${p1SigBlk.rect.y}, h=${p1SigBlk.rect.h}, align=${p1SigBlk.align}, centerShiftPt=${p1SigBlk.centerShiftPt}`
);
check(
  'পাতা ১ ব্যান্ড ৫ (স্বাক্ষর-ব্লকের ইমেইল লাইন): XML-এ om2@mopa.gov.bd লাইনটি ১০.৫pt (w:sz="21") ফন্টে নির্মিত',
  /<w:sz w:val="21"\/><w:szCs w:val="21"\/><\/w:rPr><w:t[^>]*>om2@mopa\.gov\.bd<\/w:t>/.test(docOn.xml)
);
check(
  'পাতা ১ ব্যান্ড ৬ (ইউ.ও. নোটের উপরের ফাঁক): স্বাক্ষর-ব্লকের তলা ৩৯৮.৩pt হওয়ায় gapBeforePt=32.6pt অক্ষুণ্ণ',
  p1.bands[6].gapBeforePt === 32.6,
  `gapBeforePt=${p1.bands[6].gapBeforePt}`
);

const p1List1 = p1.bands[8].cells[0].items[0];
const p1List2 = p1.bands[9].cells[0].items[0];
const p1List3 = p1.bands[10].cells[0].items[0];
const p1List5 = p1.bands[12].cells[0].items[0];
const p1Footer = p1.bands[14].cells[0].items[0];
check(
  'পাতা ১ ক্রমিক তালিকা ২. (২-লাইন): lineSpacingPt=15.2pt এবং তালিকা ১., ৩., ৫. (১-লাইন): charSpacingPt=0.15pt',
  p1List2.lineSpacingPt === 15.2 &&
    p1List1.charSpacingPt === 0.15 &&
    p1List3.charSpacingPt === 0.15 &&
    p1List5.charSpacingPt === 0.15
);
check(
  'পাতা ১ ব্যান্ড ১৪ (ফুটার ফাইল-পাথ): fontPt=7pt (row[17] dx1=+7 নিরসন)',
  p1Footer.fontPt === 7,
  `fontPt=${p1Footer.fontPt}`
);

// --- পাতা ২ পরীক্ষা ---
const p2 = irOn.pages[1];
const p2Bullets = p2.bands.slice(0, 5).map((b) => b.cells[0].items[0]);
check(
  'পাতা ২ (সূচিপত্র বুলেট তালিকা): আইটেম ১, ২, ৩, ৫-এর ফন্ট ২১.৫pt এবং আইটেম ৪ (অন্তর্ভুক্তিকরণ)-এর ফন্ট ১৮pt',
  p2Bullets[0].fontPt === 21.5 &&
    p2Bullets[1].fontPt === 21.5 &&
    p2Bullets[2].fontPt === 21.5 &&
    p2Bullets[3].fontPt === 18 &&
    p2Bullets[4].fontPt === 21.5,
  `fonts=${p2Bullets.map((x) => x.fontPt).join(',')}`
);
check(
  'পাতা ২ (সূচিপত্র বুলেট তালিকা): বাম-ইনডেন্ট ১৪১.৯–১৪২.৯pt-এ সমন্বিত',
  p2Bullets[0].indentPt === 141.9 && p2Bullets[3].indentPt === 142.9,
  `indents=${p2Bullets.map((x) => x.indentPt).join(',')}`
);

// --- পাতা ৩, ৪, ৬, ৭, ৮, ৯-এর ছকের নিচের ৬টি অণু-স্বাক্ষর চিত্র পরীক্ষা ---
const sigFigSpecs = [
  { pageIdx: 2, bandIdx: 3, cellIdx: 0, expW: 25.9, expInd: 186.0, expH: 25.0, label: 'পাতা ৩' },
  { pageIdx: 3, bandIdx: 2, cellIdx: 0, expW: 23.0, expInd: 168.1, expH: 22.6, label: 'পাতা ৪' },
  { pageIdx: 5, bandIdx: 5, cellIdx: 0, expW: 25.9, expInd: 183.0, expH: 25.9, label: 'পাতা ৬' },
  { pageIdx: 6, bandIdx: 2, cellIdx: 0, expW: 20.0, expInd: 183.0, expH: 22.6, label: 'পাতা ৭' },
  { pageIdx: 7, bandIdx: 5, cellIdx: 0, expW: 24.2, expInd: 177.0, expH: 23.9, label: 'পাতা ৮' },
  { pageIdx: 8, bandIdx: 5, cellIdx: 0, expW: 25.9, expInd: 186.0, expH: 23.6, label: 'পাতা ৯' }
];

for (const spec of sigFigSpecs) {
  const pg = irOn.pages[spec.pageIdx];
  const fig = pg.bands[spec.bandIdx].cells[spec.cellIdx].items[0];
  check(
    `${spec.label} অণু-স্বাক্ষর চিত্র: প্রস্থ=${spec.expW}pt, ইনডেন্ট=${spec.expInd}pt, উচ্চতা=${spec.expH}pt (চওড়া-ক্রপ ও ছকের রেখা-সংঘর্ষ নিরসন)`,
    fig.widthPt === spec.expW && fig.indentPt === spec.expInd && fig.heightPt === spec.expH,
    `got w=${fig.widthPt}, ind=${fig.indentPt}, h=${fig.heightPt}`
  );
}

const srcRectMatches = docOn.xml.match(/<a:srcRect l="\d+" t="10000" r="\d+" b="0"\/>/g) || [];
check(
  'DOCX XML-এ ৬টি চওড়া-ক্রপকৃত অণু-স্বাক্ষর চিত্রেই <a:srcRect l="..." t="10000" r="..." b="0"/> যুক্ত হয়েছে',
  srcRectMatches.length === 6,
  `srcRectMatches.length=${srcRectMatches.length}`
);

// --- পাতা ৫, ৬, ৮-এর শিরোনাম, উপ-শিরোনাম ও মোটা নির্দেশনা-অনুচ্ছেদ পরীক্ষা ---
const p5Title = irOn.pages[4].bands[0].cells[0].items[0];
const p5BoldPara = irOn.pages[4].bands[5].cells[0].items[0];
const p6Title = irOn.pages[5].bands[0].cells[0].items[0];
const p8Heading = irOn.pages[7].bands[1].cells[0].items[0];

check(
  'পাতা ৫ শিরোনাম (পদের মেয়াদ সংরক্ষণের চেকলিস্ট): fontPt=19.5pt (P5 row[0] dx0=+20, dx1=-18 নিরসন)',
  p5Title.fontPt === 19.5,
  `fontPt=${p5Title.fontPt}`
);
check(
  'পাতা ৫ ছকের নিচের মোটা ২-লাইনের অনুচ্ছেদ: fontPt=13pt ও lineSpacingPt=16pt (P5 row[20] dx1=-7 নিরসন)',
  p5BoldPara.fontPt === 13 && p5BoldPara.lineSpacingPt === 16,
  `fontPt=${p5BoldPara.fontPt}, lineSpacingPt=${p5BoldPara.lineSpacingPt}`
);
check(
  'পাতা ৬ শিরোনাম (পদ স্থায়ীকরণের চেকলিস্ট): fontPt=17.5pt (P6 row[0] dx0=+7, dx1=-6 নিরসন)',
  p6Title.fontPt === 17.5,
  `fontPt=${p6Title.fontPt}`
);
check(
  'পাতা ৮ উপ-শিরোনাম (যানবাহন টিওএন্ডই-তে অন্তর্ভুক্তির ক্ষেত্রে...): centerShiftPt=-8.9pt ও charSpacingPt=0.1pt (P8 row[1] dx0=+8 নিরসন)',
  p8Heading.centerShiftPt === -8.9 && p8Heading.charSpacingPt === 0.1,
  `centerShiftPt=${p8Heading.centerShiftPt}, charSpacingPt=${p8Heading.charSpacingPt}`
);

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
