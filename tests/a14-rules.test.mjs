/**
 * A14_RULES_v1 — নমুনা a14-এর রেখা, টেবিল-বর্ডার, বাক্স-ফ্রেম ও আন্ডারলাইন জ্যামিতি পরীক্ষা
 * চালনা: node tests/a14-rules.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// switch-defaults.js require না করে ভিত্তি ১১টি সুইচ নাম ধরে চালু করা
const BASE_SWITCHES = [
  'WRAPFIT',
  'NESTBOX',
  'TBLMERGE',
  'A03FIX',
  'A16FIX',
  'VSPACE',
  'BOXSPLIT',
  'SERIALHANG',
  'A07FIX2',
  'A14FIX3',
  'WIDTH'
];

function setBaseSwitches() {
  for (const k of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + k] = true;
    delete globalThis['__FZ_OFF_' + k];
  }
}

setBaseSwitches();

const PG = require(path.join(ROOT, 'js/layout-engine/faithful/page-geometry.js'));
const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const Bld = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const DATA_DIR = path.join(
  ROOT,
  'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2+A14FIX3+WIDTH/a14'
);

const rawCap = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'capture.json'), 'utf8'));
const rawMeas = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'measures.json'), 'utf8'));
const rawIr = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ir.json'), 'utf8'));

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`ব্যর্থ: ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ১) সুইচ বন্ধ থাকলে বাইট-বাই-বাইট অভিন্ন আউটপুট যাচাই
delete globalThis.__FZ_ON_A14RULES;
delete globalThis.__FZ_OFF_A14RULES;

check('সুইচ ডিফল্টে বন্ধ (IR/LF/Bld)', !IR.a14RulesOn() && !LF.isA14RulesOn() && !Bld.a14RulesOn());

const irOffFromJson = clone(rawIr);
const xmlOffBaseline = Bld.bodyXml(clone(rawIr)).xml;
LF.fit(irOffFromJson);
const xmlOffAfterFit = Bld.bodyXml(clone(rawIr)).xml;

check('সুইচ বন্ধ থাকলে ir.json থেকে bodyXml অপরিবর্তিত', xmlOffBaseline === xmlOffAfterFit && xmlOffBaseline.length === 56625);

const docxOff1 = await Bld.build(clone(rawIr), { type: 'uint8array' });
const irBuiltOff = IR.build(clone(rawCap), clone(rawMeas.measures), clone(rawMeas.pageInfo));
LF.fit(irBuiltOff);
const xmlBuiltOff = Bld.bodyXml(clone(irBuiltOff)).xml;

// __FZ_OFF_A14RULES ওভাররাইড যাচাই: __FZ_ON_A14RULES ও __FZ_OFF_A14RULES উভয়ই true হলে বন্ধ থাকবে
globalThis.__FZ_ON_A14RULES = true;
globalThis.__FZ_OFF_A14RULES = true;
check('__FZ_OFF_A14RULES ওভাররাইড কার্যকর', !IR.a14RulesOn() && !LF.isA14RulesOn() && !Bld.a14RulesOn());

const xmlOverrideOff = Bld.bodyXml(clone(rawIr)).xml;
const docxOverrideOff = await Bld.build(clone(rawIr), { type: 'uint8array' });
const irBuiltOverrideOff = IR.build(clone(rawCap), clone(rawMeas.measures), clone(rawMeas.pageInfo));
LF.fit(irBuiltOverrideOff);
const xmlBuiltOverrideOff = Bld.bodyXml(clone(irBuiltOverrideOff)).xml;

check(
  '__FZ_OFF_A14RULES ওভাররাইডে bodyXml বাইট-বাই-বাইট অভিন্ন',
  xmlOverrideOff === xmlOffBaseline && xmlBuiltOverrideOff === xmlBuiltOff
);
check(
  '__FZ_OFF_A14RULES ওভাররাইডে IR জ্যামিতি বাইট-বাই-বাইট অভিন্ন',
  JSON.stringify(irBuiltOverrideOff) === JSON.stringify(irBuiltOff)
);
check(
  '__FZ_OFF_A14RULES ওভাররাইডে docx বাইনারি দৈর্ঘ্য অভিন্ন',
  docxOverrideOff.byteLength === docxOff1.byteLength
);

// ২) সুইচ চালু করে উভয় পথে (IR.build এবং সরাসরি ir.json) দাগ ও বক্স জ্যামিতি যাচাই
delete globalThis.__FZ_OFF_A14RULES;
globalThis.__FZ_ON_A14RULES = true;
check('__FZ_ON_A14RULES চালু হলে সক্রিয় (IR/LF/Bld)', IR.a14RulesOn() && LF.isA14RulesOn() && Bld.a14RulesOn());

const irOnFromJson = clone(rawIr);
LF.fit(irOnFromJson);
const xmlOnFromJson = Bld.bodyXml(irOnFromJson).xml;

// প্রোডাকশনে snapBoxesToLines চলার পর ব্লক ১৯-এর box[0]=69.06 হয়ে যাওয়া অনুকরণ করে IR.build পরীক্ষা
const capSnapped = clone(rawCap);
const b19 = capSnapped.blocks.find((b) => b.page === 2 && b.type === 'heading' && /ছাড়পত্রের আবেদন ফরম/.test(b.text || ''));
if (b19) b19.box = [69.06392694063926, 428, 86.7579908675799, 657];
const irOnBuilt = IR.build(capSnapped, clone(rawMeas.measures), clone(rawMeas.pageInfo));
LF.fit(irOnBuilt);
const xmlOnBuilt = Bld.bodyXml(irOnBuilt).xml;

// --- পাতা ১ যাচাই ---
for (const [label, irDoc] of [['ir.json', irOnFromJson], ['IR.build', irOnBuilt]]) {
  const p1 = irDoc.pages[0];
  const b9It = p1.bands[9].cells[0].items[0];
  check(
    `পাতা ১ (${label}): ব্যান্ড ৯ (ঘ) ১-লাইনের list_item থেকে justRightPt অপসারিত ও বাম-সাজানো`,
    b9It.justRightPt == null && b9It.align === 'l',
    `align=${b9It.align}, justRightPt=${b9It.justRightPt}`
  );

  const b11It = p1.bands[11].cells[0].items[0];
  const b11Runs = Bld.runsFor(b11It.lines[0], b11It);
  check(
    `পাতা ১ (${label}): ব্যান্ড ১১ (চ) বাংলা ১৫pt অনুচ্ছেদে <u>www...</u> ইউআরএল ১১.৫pt (w:sz="23") রানে নির্গত`,
    b11Runs.includes('<w:u w:val="single"/><w:sz w:val="23"/><w:szCs w:val="23"/>') &&
      b11Runs.includes('<w:sz w:val="30"/><w:szCs w:val="30"/>'),
    b11Runs
  );

  const dummyMeasure = (s) => s.length * 50;
  const wUrlScaled = LF.lineWidthPt(b11It.lines[0], b11It, dummyMeasure);
  globalThis.__FZ_OFF_A14RULES = true;
  const wUrlUnscaled = LF.lineWidthPt(b11It.lines[0], b11It, dummyMeasure);
  delete globalThis.__FZ_OFF_A14RULES;
  check(
    `পাতা ১ (${label}): lineWidthPt-এ ইনলাইন ইউআরএলের প্রস্থ সংকুচিত (${wUrlScaled.toFixed(1)} < ${wUrlUnscaled.toFixed(1)})`,
    wUrlScaled < wUrlUnscaled - 15
  );

  const plan1 = Bld.planPage(clone(p1));
  let curY1 = p1.margins.top;
  let b11Top = 0;
  plan1.els.forEach((e, idx) => {
    const top = curY1 + e.before * plan1.f;
    if (idx === 11) b11Top = top;
    curY1 = top + e.h;
  });
  const estUnderlineY = b11Top + 14.86;
  check(
    `পাতা ১ (${label}): ব্যান্ড ১১-এর ১ম লাইনের আন্ডারলাইন y≈535.75pt (${estUnderlineY.toFixed(2)}pt)`,
    Math.abs(estUnderlineY - 535.75) <= 0.5,
    `estUnderlineY=${estUnderlineY.toFixed(2)}`
  );
}

// --- পাতা ২ যাচাই ---
for (const [label, irDoc] of [['ir.json', irOnFromJson], ['IR.build', irOnBuilt]]) {
  const p2 = irDoc.pages[1];
  const topBox = p2.boxes && p2.boxes[0];
  const hIt = p2.bands[0].cells[1].items[2];
  check(
    `পাতা ২ (${label}): শীর্ষ বক্স “ছাড়পত্রের আবেদন ফরম” পুনরুদ্ধার (x0≈249.5, x1≈385.8, y0=70.1, y1=87.8)`,
    topBox &&
      Math.abs(topBox.x0 - 249.5) <= 0.2 &&
      Math.abs(topBox.x1 - 385.8) <= 0.2 &&
      topBox.y0 === 70.1 &&
      topBox.y1 === 87.8 &&
      Array.isArray(hIt.boxIds) &&
      hIt.boxIds[0] === topBox.id &&
      hIt.fontPt === 11.5,
    JSON.stringify(topBox)
  );

  const b12It = p2.bands[12].cells[0].items[0];
  const b18It = p2.bands[18].cells[0].items[0];
  check(
    `পাতা ২ (${label}): ব্যান্ড ১২ ও ১৮-এর বিন্দু-পূরণ ফরম লাইনের ফন্ট ১১.৫pt-এ পুনরুদ্ধার`,
    b12It.fontPt === 11.5 && b18It.fontPt === 11.5,
    `b12=${b12It.fontPt}, b18=${b18It.fontPt}`
  );

  const tbl = p2.bands[23].cells[0].items[0];
  const gapIdx = 7;
  const sumBox1 = Math.round(tbl.rowHeightsPt.slice(0, gapIdx).reduce((a, b) => a + b, 0) * 10) / 10;
  const gapH = tbl.rowHeightsPt[gapIdx];
  const sumBox2 = Math.round(tbl.rowHeightsPt.slice(gapIdx + 1).reduce((a, b) => a + b, 0) * 10) / 10;

  check(
    `পাতা ২ (${label}): প্রত্যয়ন ছকের (Band 23) ৪টি আড়া-রেখা [539.8, 633.8, 636.8, 751.3]`,
    JSON.stringify(tbl.srcRulesPt) === JSON.stringify([539.8, 633.8, 636.8, 751.3]),
    JSON.stringify(tbl.srcRulesPt)
  );
  check(
    `পাতা ২ (${label}): প্রত্যয়ন ছকের সারি-উচ্চতা সমষ্টি (Box1=94.0pt, Gap=3.0pt, Box2=114.5pt, Total=211.5pt)`,
    sumBox1 === 94.0 && gapH === 3.0 && sumBox2 === 114.5 && tbl.heightPt === 211.5,
    `box1=${sumBox1}, gap=${gapH}, box2=${sumBox2}, tot=${tbl.heightPt}`
  );
  check(
    `পাতা ২ (${label}): প্রত্যয়ন ছকের প্রস্থ 456.5pt (ডান খাড়া বর্ডার 77.25 + 456.5 = 533.75pt) ও ডান ট্যাব 445.7pt`,
    tbl.widthPt === 456.5 && tbl.rightTabStopPt === 445.7,
    `widthPt=${tbl.widthPt}, rightTabStopPt=${tbl.rightTabStopPt}`
  );
}

// পাতা ২ XML-এ প্রত্যয়ন ছকের আগের ১.০pt স্পেসার (w:line="20") ও প্রস্থ (w:tblW w:w="9130") যাচাই
check(
  'পাতা ২ XML: প্রত্যয়ন ছকের আগে 0.98pt গ্যাপের জন্য w:line="20" স্পেসার ও w:tblW w:w="9130" নির্গত',
  xmlOnFromJson.includes('<w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p><w:tbl><w:tblPr><w:tblW w:w="9130" w:type="dxa"/>') &&
    xmlOnBuilt.includes('<w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p><w:tbl><w:tblPr><w:tblW w:w="9130" w:type="dxa"/>')
);

// --- পাতা ৩ যাচাই ---
for (const [label, irDoc, xmlStr] of [
  ['ir.json', irOnFromJson, xmlOnFromJson],
  ['IR.build', irOnBuilt, xmlOnBuilt]
]) {
  const p3 = irDoc.pages[2];
  const b14It = p3.bands[14].cells[0].items[0];
  check(
    `পাতা ৩ (${label}): ব্যান্ড ১৪ (১৪।)-এর লাইন-পিচ ১৩.২pt (২য় লাইনের আন্ডারলাইন y=707pt-এ স্থাপন)`,
    b14It.lineSpacingPt === 13.2,
    `lineSpacingPt=${b14It.lineSpacingPt}`
  );
  check(
    `পাতা ৩ XML (${label}): শীর্ষ বক্সের (Band 0) বাইরে w:line="364" (18.2pt -> টপ বর্ডার 40.25pt) এবং নিচে w:line="158" (7.9pt -> বটম বর্ডার 67.5pt)`,
    xmlStr.includes('<w:spacing w:before="0" w:after="0" w:line="364" w:lineRule="exact"/>') &&
      xmlStr.includes('<w:spacing w:before="0" w:after="0" w:line="158" w:lineRule="exact"/>')
  );
}

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
