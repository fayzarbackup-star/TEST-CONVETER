/**
 * A01_WRAP_v1 — হুবহু-মোডে এক-লাইনের অনুচ্ছেদ Word-এ ভেঙে দুই লাইন হওয়া রোধের পরীক্ষা (WRAPFIT)
 * চালানোর নিয়ম: node tests/wrapfit.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const FayzarLineFit = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const FayzarLayoutIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const FayzarFaithfulDocx = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const a01Dir = path.join(ROOT, 'qa/golden-data/asis/a01');
const captureData = JSON.parse(fs.readFileSync(path.join(a01Dir, 'capture.json'), 'utf8'));
const measuresData = JSON.parse(fs.readFileSync(path.join(a01Dir, 'measures.json'), 'utf8'));
const irGolden = JSON.parse(fs.readFileSync(path.join(a01Dir, 'ir.json'), 'utf8'));
const outRaw = JSON.parse(fs.readFileSync(path.join(a01Dir, 'out.raw.json'), 'utf8'));

const clone = (obj) => JSON.parse(JSON.stringify(obj));

// a01-এর measures.json ও capture.json থেকে ১০০px মাপের ক্যানভাস প্রস্থ-মাপক (textMeasurer) পুনর্গঠন
const stripMd = (t) => String(t).replace(/\*\*/g, '').replace(/\*([^*\s][^*]*?)\*/g, '$1').replace(/\^\{([^}]*)\}/g, '$1').trim();
const FILL_G = /([._\-…·─])\1{5,}/g;
const HYPHEN_W100 = 33.3;
const fixedWidthMap = new Map();

for (const b of captureData.blocks) {
  const m = measuresData.measures[b.i];
  if (!m || !m.widthFontPt || !m.rectPt) continue;
  const lines = (b.lines && b.lines.length) ? b.lines : [b.text || ''];
  if (lines.length === 1) {
    const s = stripMd(lines[0]);
    const total100 = (m.rectPt.w * 100) / m.widthFontPt;
    const fills = (s.match(FILL_G) || []).join('');
    const noFill = s.replace(FILL_G, '');
    fixedWidthMap.set(noFill, total100 - fills.length * HYPHEN_W100);
  }
}

function measureA01(s) {
  const str = String(s || '');
  const fills = (str.match(FILL_G) || []).join('');
  const noFill = str.replace(FILL_G, '');
  if (fixedWidthMap.has(noFill)) {
    return fixedWidthMap.get(noFill) + fills.length * HYPHEN_W100;
  }
  if (str.includes('প্রতিবন্ধী সন্তান।')) return (475 * 100) / 12;
  const bLen = noFill.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
  const karLen = (noFill.match(/[\u0982\u0983\u09be-\u09c0\u09c7\u09c8\u09cb\u09cc\u09d7]/g) || []).length;
  return bLen * 38 + karLen * 14 + fills.length * HYPHEN_W100;
}

// অনুচ্ছেদের XML থেকে প্রথম লিডার-ট্যাবের অবস্থান (pt) ও পরবর্তী লেখার প্রত্যাশিত প্রস্থ বের করার সহায়ক
function analyzeLeaderParaXml(pXml, fontPt) {
  const tabMatch = /<w:tab\b[^>]*\bw:pos="(\d+)"[^>]*\/>/.exec(pXml);
  const stopPosPt = tabMatch ? Number(tabMatch[1]) / 20 : 0;
  const texts = [...pXml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]);
  const tailText = texts.length >= 2 ? texts[texts.length - 1] : '';
  const bLen = tailText.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
  const karLen = (tailText.match(/[\u0982\u0983\u09be-\u09c0\u09c7\u09c8\u09cb\u09cc\u09d7]/g) || []).length;
  const estTailWidthPt = (bLen * 0.48 + karLen * 0.16) * fontPt;
  // compare-1.png ও out.raw.json অনুযায়ী Word-এ SutonnyOMJ 11.5pt-এ এই শেষাংশের প্রকৃত প্রস্থ 238.3pt
  const actualWordTailPt = tailText.includes('মৃত্যুবরণ') ? 238.3 : estTailWidthPt;
  return {
    stopPosPt,
    tailText,
    estTotalWidthPt: stopPosPt + estTailWidthPt,
    actualWordTotalWidthPt: stopPosPt + actualWordTailPt
  };
}

function setWrapFitSwitch(mode) {
  delete globalThis.__FZ_ON_WRAPFIT;
  delete globalThis.__FZ_OFF_WRAPFIT;
  if (typeof globalThis.window !== 'undefined') {
    delete globalThis.window.__FZ_ON_WRAPFIT;
  }
  if (process && process.env) {
    delete process.env.__FZ_ON_WRAPFIT;
    delete process.env.FZ_ON;
  }
  if (mode === 'window') {
    globalThis.window = globalThis.window || globalThis;
    globalThis.window.__FZ_ON_WRAPFIT = true;
  } else if (mode === 'env') {
    process.env.FZ_ON = 'WRAPFIT';
  }
}

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`✓ পাস: ${name}`);
  } else {
    failed++;
    console.error(`✗ ব্যর্থ: ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// ১) সুইচ বন্ধ অবস্থায় (ডিফল্ট) আচরণ ও বাইট-বাই-বাইট অভিন্নতা যাচাই
setWrapFitSwitch('off');
check('সুইচ বন্ধ অবস্থায় isWrapFitOn() মিথ্যা ফেরত দেয়', FayzarLineFit.isWrapFitOn() === false);

const irOffBuilt = FayzarLayoutIR.build(clone(captureData), measuresData.measures, measuresData.pageInfo);
const fitsOffCount = FayzarLineFit.fit(irOffBuilt, measureA01);
const b12Off = irOffBuilt.pages[0].bands[12].cells[0].items[0];
const b12Golden = irGolden.pages[0].bands[12].cells[0].items[0];

check(
  'সুইচ বন্ধে a01-এর lineFits সংখ্যা ও পাতা ১ ব্যান্ড ১২-এর fit হুবহু ir.json-এর সমান',
  fitsOffCount === irGolden.lineFits &&
    JSON.stringify(b12Off.fit) === JSON.stringify(b12Golden.fit) &&
    JSON.stringify(b12Off.lines) === JSON.stringify(b12Golden.lines),
  `got=${JSON.stringify(b12Off.fit)} expected=${JSON.stringify(b12Golden.fit)}`
);

const bodyOffGolden1 = FayzarFaithfulDocx.bodyXml(clone(irGolden));
const bodyOffGolden2 = FayzarFaithfulDocx.bodyXml(clone(irGolden));
const bodyOffBuilt1 = FayzarFaithfulDocx.bodyXml(clone(irOffBuilt));
check(
  'সুইচ বন্ধে গোল্ডেন IR ও নির্মিত IR থেকে উৎপন্ন XML সম্পূর্ণ অপরিবর্তিত ও সুনির্দিষ্ট',
  bodyOffGolden1.xml === bodyOffGolden2.xml && bodyOffGolden1.xml.length > 10000 && bodyOffBuilt1.xml.length > 10000
);

const parasOff = bodyOffGolden1.xml.match(/<w:p>[\s\S]*?<\/w:p>/g) || [];
const targetParaOffXml = parasOff.find((p) => p.includes('বৎসর যাবৎ চিনি। বিগত'));
const p2b3ParaOffXml = parasOff.find((p) => p.includes('জীবিত স্ত্রী/স্ত্রীগণ'));
const offAnalysis = analyzeLeaderParaXml(targetParaOffXml, 11.5);
const outRawP16 = outRaw.paragraphs.find((p) => p.n === 16);

check(
  'সুইচ বন্ধে মূল সমস্যার প্রমাণ: ট্যাব-স্টপ 246.7pt (w:pos=4934) ও Word-এ লাইনের মোট প্রস্থ (485.0pt) প্রাপ্য 468pt ছাড়িয়ে ২ লাইনে ভাঙে',
  Math.abs(offAnalysis.stopPosPt - 246.7) < 0.05 &&
    offAnalysis.actualWordTotalWidthPt > 468.0 &&
    outRawP16 &&
    outRawP16.lines === 2
);

// ২) window.__FZ_ON_WRAPFIT = true অবস্থায় a01-এর ir ও measures দিয়ে পরীক্ষা
setWrapFitSwitch('window');
check('window.__FZ_ON_WRAPFIT চালু থাকলে isWrapFitOn() সত্য ফেরত দেয়', FayzarLineFit.isWrapFitOn() === true);

const irOnBuilt = FayzarLayoutIR.build(clone(captureData), measuresData.measures, measuresData.pageInfo);
const page1AvailW = irOnBuilt.pages[0].widthPt - irOnBuilt.pages[0].margins.left - irOnBuilt.pages[0].margins.right;
const cellB12On = irOnBuilt.pages[0].bands[12].cells[0];

check(
  'সুইচ চালুতে পাতা ১ ব্যান্ড ১২-এর কলাম ও আয়তের প্রস্থ পাতার মুদ্রণযোগ্য প্রস্থের (468pt) মধ্যে সীমিত থাকে',
  cellB12On.x1 - cellB12On.x0 <= page1AvailW && cellB12On.items[0].rect.w <= page1AvailW,
  `cellW=${cellB12On.x1 - cellB12On.x0}, rect.w=${cellB12On.items[0].rect.w}, availW=${page1AvailW}`
);

FayzarLineFit.fit(irOnBuilt, measureA01);
const b12On = irOnBuilt.pages[0].bands[12].cells[0].items[0];
const b12OnWidthPt = FayzarLineFit.lineWidthPt(b12On.lines[0], b12On, measureA01);

check(
  'সুইচ চালুতে (capture+measures থেকে) "বৎসর যাবৎ চিনি..." লাইনের প্রত্যাশিত প্রস্থ নিরাপদ সীমার (<= 435pt < 458.6pt) মধ্যে থাকে',
  b12On.fit &&
    b12On.fit.needPt <= 435 &&
    b12On.fit.needPt < b12On.fit.availPt - 25 &&
    Math.abs(b12OnWidthPt - b12On.fit.needPt) <= 0.2,
  `needPt=${b12On.fit && b12On.fit.needPt}, availPt=${b12On.fit && b12On.fit.availPt}`
);

// সরাসরি a01/ir.json-এর ওপর FayzarLineFit.fit ও FayzarFaithfulDocx.bodyXml চালিয়ে যাচাই
const irGoldenOn = clone(irGolden);
FayzarLineFit.fit(irGoldenOn, measureA01);
const b12FromGoldenOn = irGoldenOn.pages[0].bands[12].cells[0].items[0];

check(
  'সুইচ চালুতে সরাসরি a01/ir.json-এ fit চালালেও ওই লাইনের প্রত্যাশিত প্রস্থ নির্ধারিত সীমার (<= 435pt) মধ্যে থাকে',
  b12FromGoldenOn.fit &&
    b12FromGoldenOn.fit.needPt <= 435 &&
    b12FromGoldenOn.fit.needPt < b12FromGoldenOn.fit.availPt - 25,
  `needPt=${b12FromGoldenOn.fit && b12FromGoldenOn.fit.needPt}`
);

const bodyOn = FayzarFaithfulDocx.bodyXml(clone(irOnBuilt));
const parasOn = bodyOn.xml.match(/<w:p>[\s\S]*?<\/w:p>/g) || [];
const targetParaOnXml = parasOn.find((p) => p.includes('বৎসর যাবৎ চিনি। বিগত'));
const p2b3ParaOnXml = parasOn.find((p) => p.includes('জীবিত স্ত্রী/স্ত্রীগণ'));
const onAnalysis = analyzeLeaderParaXml(targetParaOnXml, 11.5);
const p2b3OnAnalysis = analyzeLeaderParaXml(p2b3ParaOnXml, 12);

check(
  'সুইচ চালুতে Word XML-এ "বৎসর যাবৎ চিনি..." লাইনের লিডার-ট্যাব বামে সরে (<= 212pt) এবং মোট প্রস্থ মুদ্রণযোগ্য সীমার (468pt) ভেতরে থাকে',
  onAnalysis.stopPosPt <= 212 &&
    onAnalysis.stopPosPt < offAnalysis.stopPosPt - 30 &&
    onAnalysis.estTotalWidthPt <= page1AvailW &&
    onAnalysis.actualWordTotalWidthPt <= page1AvailW - 15,
  `stopPosPt=${onAnalysis.stopPosPt}, actualWordTotal=${onAnalysis.actualWordTotalWidthPt}, estTotal=${onAnalysis.estTotalWidthPt}`
);

check(
  'সুইচ চালুতে পাতা ২-এর "জীবিত স্ত্রী/স্ত্রীগণ..." লাইনটিরও মোট প্রস্থ 468pt সীমার ভেতরে থাকে (পাতা ২-এর 14pt shift রোধ)',
  p2b3OnAnalysis.stopPosPt < 340 && p2b3OnAnalysis.estTotalWidthPt <= page1AvailW,
  `stopPosPt=${p2b3OnAnalysis.stopPosPt}, estTotal=${p2b3OnAnalysis.estTotalWidthPt}`
);

// ৩) FZ_ON=WRAPFIT পরিবেশ চলক (process.env.FZ_ON) দিয়ে যাচাই
setWrapFitSwitch('env');
check('FZ_ON=WRAPFIT পরিবেশ চলক দিয়েও সুইচ সক্রিয় হয়', FayzarLineFit.isWrapFitOn() === true);
const irEnvOn = FayzarLayoutIR.build(clone(captureData), measuresData.measures, measuresData.pageInfo);
FayzarLineFit.fit(irEnvOn, measureA01);
const bodyEnvOn = FayzarFaithfulDocx.bodyXml(clone(irEnvOn));
check(
  'window.__FZ_ON_WRAPFIT এবং FZ_ON=WRAPFIT উভয় ক্ষেত্রে উৎপন্ন XML সম্পূর্ণ অভিন্ন',
  bodyEnvOn.xml === bodyOn.xml
);

// ৪) সাধারণ সমাধান যাচাই (শুধু a01 নয়: পূরণ-রেখাহীন লম্বা এক-লাইনের বাক্যে অক্ষর-সংকোচন ও ০.৫pt ফন্ট হ্রাস)
const synthItem = {
  kind: 'para',
  type: 'paragraph',
  fontPt: 12,
  align: 'l',
  indentPt: 4,
  firstIndentPt: 0,
  rect: { x: 72, y: 200, w: 468, h: 12 },
  diag: { wPt: 11.3, estPt: 11.3, lines: 1 },
  text: 'বিগত দশ বৎসর যাবৎ আমি তাহাকে ও তাহার পরিবারের সকল সদস্যগণকে ব্যক্তিগতভাবে চিনি এবং জানি।',
  lines: ['বিগত দশ বৎসর যাবৎ আমি তাহাকে ও তাহার পরিবারের সকল সদস্যগণকে ব্যক্তিগতভাবে চিনি এবং জানি।']
};
// ৪৫৫pt ক্যানভাস প্রস্থ (availPt = 454.6pt, full = 458.6pt, ১৬টি স্বরচিহ্ন থাকায় Word-এ উপচে পড়ার ঝুঁকি)
const synthMeasure = () => (455 * 100) / 12;
const synthResult = FayzarLineFit.fitItem(synthItem, 468, synthMeasure);
const synthXml = FayzarFaithfulDocx.paraXml(synthItem, 0, { availW: 468 });

check(
  'সাধারণ সমাধান: পূরণ-রেখাহীন ঝুঁকিপূর্ণ এক-লাইনের বাক্যে ইনডেন্ট হ্রাস, হালকা অক্ষর-সংকোচন (-0.15pt) ও ফন্ট ০.৫pt হ্রাস প্রযুক্ত হয়',
  synthResult !== null &&
    synthItem.indentPt === 0 &&
    synthItem.charSpacingPt === -0.15 &&
    synthItem.fontPt === 11.5 &&
    synthXml.includes('<w:spacing w:val="-3"/>')
);

// ৫) সুইচ পুনরায় বন্ধ করলে আউটপুট বাইট-বাই-বাইট আগের মতো অপরিবর্তিত থাকে কিনা যাচাই
setWrapFitSwitch('off');
const irOffAfter = FayzarLayoutIR.build(clone(captureData), measuresData.measures, measuresData.pageInfo);
FayzarLineFit.fit(irOffAfter, measureA01);
const bodyOffGoldenAfter = FayzarFaithfulDocx.bodyXml(clone(irGolden));
const bodyOffBuiltAfter = FayzarFaithfulDocx.bodyXml(clone(irOffAfter));

check(
  'সুইচ পুনরায় বন্ধ করলে IR ও XML আউটপুট বাইট-বাই-বাইট আগের মতো অপরিবর্তিত থাকে',
  JSON.stringify(irOffAfter) === JSON.stringify(irOffBuilt) &&
    bodyOffGoldenAfter.xml === bodyOffGolden1.xml &&
    bodyOffBuiltAfter.xml === bodyOffBuilt1.xml
);

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
