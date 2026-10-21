import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ডিফল্ট সুইচগুলোর তালিকা সরাসরি নির্দিষ্ট করা (switch-defaults.js ইমপোর্ট না করে)
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
  'WIDTH',
  'A16FIX3',
  'A14RULES',
  'A07FIX3',
  'A14FIX4'
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
    delete process.env.__FZ_ON_A02FIX;
    delete process.env.__FZ_OFF_A02FIX;
  }
  for (const sw of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + sw] = true;
  }
}

resetSwitches();

const PG = require(path.join(ROOT, 'js/layout-engine/faithful/page-geometry.js'));
const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const GOLDEN_DIR = path.join(
  ROOT,
  'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2+A14FIX3+WIDTH+A16FIX3+A14RULES+A07FIX3/a02'
);
const measuresRaw = fs.readFileSync(path.join(GOLDEN_DIR, 'measures.json'), 'utf8');
const savedIrRaw = fs.readFileSync(path.join(GOLDEN_DIR, 'ir.json'), 'utf8');

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

console.log('=== A02_SCORE_v1 (A02FIX) একক ও সমন্বিত পরীক্ষা ===');

// ১) সুইচ নিয়ন্ত্রণ ও অগ্রাধিকার পরীক্ষা
resetSwitches();
check('ডিফল্ট অবস্থায় A02FIX বন্ধ থাকে (IR/LF/DB)', !IR.a02FixOn() && !LF.isA02FixOn() && !DB.a02FixOn());

globalThis.__FZ_ON_A02FIX = true;
check('__FZ_ON_A02FIX = true হলে A02FIX চালু হয়', IR.a02FixOn() && LF.isA02FixOn() && !globalThis.__FZ_OFF_A02FIX && DB.a02FixOn());

globalThis.__FZ_OFF_A02FIX = true;
check('__FZ_OFF_A02FIX = true থাকলে __FZ_ON_A02FIX সত্ত্বেও সুইচ বন্ধ থাকে', !IR.a02FixOn() && !LF.isA02FixOn() && !DB.a02FixOn());

resetSwitches();
process.env.FZ_ON = 'WRAPFIT,A02FIX';
check('FZ_ON=A02FIX পরিবেশ চলকে সুইচ চালু হয়', IR.a02FixOn() && LF.isA02FixOn() && DB.a02FixOn());
process.env.FZ_OFF = 'A02FIX';
check('FZ_OFF=A02FIX পরিবেশ চলকে সুইচ জোরপূর্বক বন্ধ হয়', !IR.a02FixOn() && !LF.isA02FixOn() && !DB.a02FixOn());

// ২) A02FIX বন্ধ অবস্থায় বাইট-টু-বাইট অভিন্নতা পরীক্ষা
resetSwitches();
const irOffA = IR.build(JSON.parse(measuresRaw));
LF.fit(irOffA);
const outOffA = DB.bodyXml(irOffA);
const savedIrOff = JSON.parse(savedIrRaw);
LF.fit(savedIrOff);

resetSwitches();
globalThis.__FZ_ON_A02FIX = true;
globalThis.__FZ_OFF_A02FIX = true;
const irOffB = IR.build(JSON.parse(measuresRaw));
LF.fit(irOffB);
const outOffB = DB.bodyXml(irOffB);

check('A02FIX বন্ধ বনাম __FZ_OFF_A02FIX ওভাররাইডে IR সম্পূর্ণ অভিন্ন', JSON.stringify(irOffA) === JSON.stringify(irOffB));
check('A02FIX বন্ধ বনাম __FZ_OFF_A02FIX ওভাররাইডে DOCX XML বাইট-টু-বাইট অভিন্ন', outOffA.xml === outOffB.xml);
check('A02FIX বন্ধ অবস্থায় ফ্রেমের পুরোনো spacePt অপরিবর্তিত থাকে', irOffA.pages[0].frame.spacePt.top === 13.9 && irOffA.pages[0].frame.spacePt.left === 14.4);
check('A02FIX বন্ধ অবস্থায় সংরক্ষিত ir.json-এ Band 0 চিত্রের উচ্চতা ৫৬.৪pt থাকে', savedIrOff.pages[0].bands[0].cells[0].items[0].heightPt === 56.4);

// ৩) A02FIX চালু অবস্থায় measures.json থেকে পূর্ণাঙ্গ পাইপলাইন পরীক্ষা
resetSwitches();
globalThis.__FZ_ON_A02FIX = true;
const irOn = IR.build(JSON.parse(measuresRaw));
LF.fit(irOn);
const pageOn = irOn.pages[0];
const planOn = DB.planPage(pageOn);
const outOn = DB.bodyXml(irOn);

// ৩ক) পাতা-ফ্রেম (Root Cause 1: rows[0] dy=-6, dh=+7, font error 1)
check('পাতা-ফ্রেমের আয়তক্ষেত্র (rectPt) সংরক্ষিত হয়েছে', pageOn.frame.rectPt && pageOn.frame.rectPt.x === 12.5 && pageOn.frame.rectPt.y === 10.1);
check('পাতা-ফ্রেমের spacePt = { top: 9, left: 12, right: 11, bottom: 2 } নির্ধারিত হয়েছে',
  pageOn.frame.spacePt.top === 9 &&
  pageOn.frame.spacePt.left === 12 &&
  pageOn.frame.spacePt.right === 11 &&
  pageOn.frame.spacePt.bottom === 2
);
const sectXml = DB.sectPr(pageOn);
check('sectPr-এ pgBorders space="9/12/2/11" নিখুঁতভাবে নির্গত হয়েছে',
  sectXml.includes('<w:top w:val="single" w:sz="12" w:space="9" w:color="000000"/>') &&
  sectXml.includes('<w:left w:val="single" w:sz="12" w:space="12" w:color="000000"/>') &&
  sectXml.includes('<w:bottom w:val="single" w:sz="12" w:space="2" w:color="000000"/>') &&
  sectXml.includes('<w:right w:val="single" w:sz="12" w:space="11" w:color="000000"/>')
);

// ৩খ) শীর্ষ সরকারি প্রতীক চিত্র (Root Cause 2: global +1.2pt downward shift)
const emblemFig = pageOn.bands[0].cells[0].items[0];
check('শীর্ষ এমব্লেম চিত্রের (Band 0) উচ্চতা ৫৬.৪pt থেকে ৫৫.২pt-এ সমন্বিত হয়েছে', emblemFig.heightPt === 55.2 && emblemFig.widthPt === 55.2);
check('Band 1-এর gapBeforePt ৫.০pt থেকে ৬.২pt-এ সমন্বিত হয়েছে', pageOn.bands[1].gapBeforePt === 6.2);

// ৩গ) শিরোনাম, উপ-শিরোনাম ও ওয়েবসাইট ডট-লিডার সারি (Root Cause 4)
const titleIt = pageOn.bands[1].cells[0].items[0];
const subTitleIt = pageOn.bands[2].cells[0].items[0];
const webIt = pageOn.bands[4].cells[0].items[0];
check('প্রধান শিরোনাম ("অনাপত্তি সনদ (NOC)") ১৭.৫pt ফন্টে পুনরুদ্ধার হয়েছে', titleIt.fontPt === 17.5);
check('উপ-শিরোনাম ("(মন্ত্রণালয়/বিভাগ/কার্যালয়-এর নাম)") ১৩pt ফন্টে পুনরুদ্ধার হয়েছে', subTitleIt.fontPt === 13);
check('ওয়েবসাইট সারি (Band 4) বাম-প্রান্তিক (align="l") ও indentPt=178pt সহ ডট-লিডারে রূপান্তরিত হয়েছে',
  webIt.align === 'l' && webIt.indentPt === 178 && webIt.centerShiftPt === null
);
const webXml = DB.paraXml(webIt, 0);
check('ওয়েবসাইট সারির XML-এ ডান ডট-লিডার ট্যাব (w:pos="6409") ও w:ind w:left="3560" নির্গত হয়েছে',
  webXml.includes('<w:tab w:val="right" w:leader="dot" w:pos="6409"/>') && webXml.includes('<w:ind w:left="3560"/>')
);

// ৩ঘ) একক বিন্দু-রেখা ও দাড়িযুক্ত বিন্দু-রেখার বেসলাইন অফসেট (Root Cause 3: Band 3, 13, 24)
check('Band 3 (একক বিন্দু-রেখা) planPage-এ সঠিক উচ্চতায় (startY ≈ 126.3pt) শুরু হয়েছে',
  Math.abs((pageOn.margins.top + planOn.els.slice(0, 4).reduce((a, e) => a + e.before, 0) + planOn.els.slice(0, 3).reduce((a, e) => a + e.h, 0)) - 126.27) <= 0.2
);
const band24It = pageOn.bands[24].cells[0].items[0];
const band24Xml = DB.paraXml(band24It, 0);
check('Band 24 (".... ।")-এ ডট-লিডার ট্যাব পজিশন ৪২৫৯ dxa (২১৩.০pt) নির্গত হয়েছে',
  band24Xml.includes('w:leader="dot" w:pos="4259"')
);

// ৩ঙ) বডি অনুচ্ছেদ (Band 8 ও Band 10) এবং বোল্ড প্রাপক সারি (Band 23)
const band8It = pageOn.bands[8].cells[0].items[0];
const band10It = pageOn.bands[10].cells[0].items[0];
const band23It = pageOn.bands[23].cells[0].items[0];
check('Band 8 ("জনাব ... ; ... কার্যালয়ে") ১১pt ফন্ট ও y=230.5pt-এ পুনরুদ্ধার হয়েছে',
  band8It.fontPt === 11 && band8It.lineSpacingPt === 0 && band8It.rect.y === 230.5
);
check('Band 10 ("নিযুক্ত আছেন। ... পূর্ব পরিচয়") ১১pt ফন্ট, indentPt=1.9 ও charSpacingPt=-0.1-এ পুনরুদ্ধার হয়েছে',
  band10It.fontPt === 11 && band10It.indentPt === 1.9 && band10It.charSpacingPt === -0.1
);
check('Band 23 ("বিভাগীয় পাসপোর্ট ও ভিসা অফিস...") ১১.৫pt বোল্ড ফন্টে পুনরুদ্ধার হয়েছে',
  band23It.fontPt === 11.5 && band23It.bold === true
);

// ৩চ) ক্রমিক তালিকা (০২।..০৭।) ও তারিখ-বাক্স (Band 12, 14, 15, 16, 18, 19)
const band12It = pageOn.bands[12].cells[0].items[0];
const band14Left = pageOn.bands[14].cells[0].items[0];
const band15Left = pageOn.bands[15].cells[0].items[0];
const band15Right = pageOn.bands[15].cells[1].items[0];
const band16It = pageOn.bands[16].cells[0].items[0];
const band18It = pageOn.bands[18].cells[0].items[0];
const band19It = pageOn.bands[19].cells[0].items[0];
check('Band 12 (০২। বর্তমান ঠিকানা) ১২pt থেকে ১১pt বডি ফন্টে নামানো হয়েছে', band12It.fontPt === 11);
check('Band 14 (০৩।) ও Band 18 (০৬।)-এ charSpacingPt = -0.1 নির্ধারিত হয়েছে', band14Left.charSpacingPt === -0.1 && band18It.charSpacingPt === -0.1);
check('Band 15 (০৪।)-এ charSpacingPt = -0.15 এবং ডান পাশের তারিখ-বাক্সে উচ্চতা ১৬.৫pt নির্ধারিত হয়েছে',
  band15Left.charSpacingPt === -0.15 && band15Right.heightPt === 16.5 && band15Right.boxRuleHeightPt === 16.5
);
check('Band 16 (০৫।)-এ indentPt = 1.4 ও charSpacingPt = -0.2 নির্ধারিত হয়েছে', band16It.indentPt === 1.4 && band16It.charSpacingPt === -0.2);
check('Band 19 (০৭।)-এ indentPt = 1.9 ও charSpacingPt = -0.15 নির্ধারিত হয়েছে', band19It.indentPt === 1.9 && band19It.charSpacingPt === -0.15);

// ৩ছ) পারিবারিক বিবরণী ছক (Root Cause 5: Band 17)
const famTbl = pageOn.bands[17].cells[0].items[0];
check('পারিবারিক ছকের (Band 17) শিরোনাম ফন্ট ১০.৫pt ও বডি ফন্ট ১১pt নির্ধারিত হয়েছে', famTbl.headFontPt === 10.5 && famTbl.fontPt === 11);
check('পারিবারিক ছকের শিরোনামে ২-লাইনের "ক্রমিক\\nনং" ও "সম্পর্ক\\n(টিক দিন)" নির্ধারিত হয়েছে',
  famTbl.rows[0][0] === 'ক্রমিক\nনং' && famTbl.rows[0][2] === 'সম্পর্ক\n(টিক দিন)'
);
check('পারিবারিক ছকের সারি-উচ্চতা [30.2, 15.2, 15.2, 15.2, 15.2] (মোট ৯১.০pt) নির্ধারিত হয়েছে',
  famTbl.heightPt === 91.0 && JSON.stringify(famTbl.rowHeightsPt) === JSON.stringify([30.2, 15.2, 15.2, 15.2, 15.2])
);
check('পারিবারিক ছকের "স্বামী:/স্ত্রী:/পুত্র:/কন্যা:" ঘরে বাম মার্জিন ৯৬ dxa (৪.৮pt) নির্গত হয়েছে',
  outOn.xml.includes('<w:tcMar><w:left w:w="96" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar>')
);

// ৩জ) ৪-কলাম স্বাক্ষর ও সীলমোহর গ্রিড (Root Cause 6: Band 20)
const gridBand = pageOn.bands[20];
const braceFig = gridBand.cells[2].items[0];
check('Band 20-এর খাড়া বন্ধনী-চিত্রের প্রস্থ ১০.৬pt, উচ্চতা ৮৮.৩pt ও বাম-ইনডেন্ট ২.৬pt পুনরুদ্ধার হয়েছে',
  braceFig.widthPt === 10.6 && braceFig.heightPt === 88.3 && braceFig.indentPt === 2.6
);
check('Band 20-এর ৩য় কলামের প্রস্থ ৪০০ dxa (২০pt)-এ স্ফীত না হয়ে প্রকৃত ৩০৬ dxa (১৫.৩pt) নির্গত হয়েছে',
  outOn.xml.includes('<w:gridCol w:w="306"/>')
);
const c3Plan = planOn.els[20].cells[3].its;
check('Band 20-এর ৪র্থ কলামের ৬টি স্বাক্ষর-সারির উল্লম্ব ব্যবধান (before ≈ 3.45pt) সমানীকৃত হয়েছে',
  c3Plan.slice(1).every((x) => Math.abs(x.before - 3.45) <= 0.1)
);

// ৩ঝ) তলার ধূসর পাদটীকা বার ও ১-পাতা সংরক্ষণ (Root Cause 7: Band 25)
const footBar = pageOn.bands[25].cells[0].items[0];
check('তলার ধূসর বারের (Band 25) ফন্ট ১৪.৫pt থেকে ১১pt, centerShiftPt=null এবং y=741.8pt নির্ধারিত হয়েছে',
  footBar.fontPt === 11 && footBar.centerShiftPt === null && footBar.fullWidthShadeBar === true && footBar.rect.y === 741.8
);
check('পুরো পাতা সংকুচিত না হয়ে (planOn.f === 1) এক পাতায় আঁটে', planOn.f === 1);

// ৪) সংরক্ষিত ir.json থেকেও LF.fit + DB.bodyXml সমানভাবে কাজ করার পরীক্ষা
resetSwitches();
globalThis.__FZ_ON_A02FIX = true;
const irSaved = JSON.parse(savedIrRaw);
LF.fit(irSaved);
const planSaved = DB.planPage(irSaved.pages[0]);
check('সংরক্ষিত ir.json-এও ফ্রেম spacePt = { top: 9, left: 12, right: 11, bottom: 2 }, Band 0 উচ্চতা ৫৫.২pt এবং plan.f === 1',
  irSaved.pages[0].frame.spacePt.top === 9 &&
  irSaved.pages[0].frame.spacePt.bottom === 2 &&
  irSaved.pages[0].bands[0].cells[0].items[0].heightPt === 55.2 &&
  irSaved.pages[0].bands[10].cells[0].items[0].fontPt === 11 &&
  irSaved.pages[0].bands[17].cells[0].items[0].headFontPt === 10.5 &&
  planSaved.f === 1
);

// ৫) RULES2-এর সাথে একত্রে (A02FIX + RULES2) সামঞ্জস্য পরীক্ষা
resetSwitches();
globalThis.__FZ_ON_A02FIX = true;
globalThis.__FZ_ON_RULES2 = true;
const irCombo = IR.build(JSON.parse(measuresRaw));
LF.fit(irCombo);
const planCombo = DB.planPage(irCombo.pages[0]);
const outCombo = DB.bodyXml(irCombo);
check('A02FIX + RULES2 একত্রে চালু থাকলেও ফ্রেম spacePt, ছকের উচ্চতা (৯১pt), খাড়া চিত্র (১০.৬×৮৮.৩pt) ও ১-পাতা অক্ষুণ্ণ থাকে',
  irCombo.pages[0].frame.spacePt.top === 9 &&
  irCombo.pages[0].frame.spacePt.bottom === 2 &&
  irCombo.pages[0].bands[17].cells[0].items[0].heightPt === 91.0 &&
  irCombo.pages[0].bands[20].cells[2].items[0].widthPt === 10.6 &&
  planCombo.f === 1 &&
  outCombo.xml.includes('<w:gridCol w:w="306"/>')
);

// ৬) অন্য নথির পাতায় (ফ্রেমহীন বা ভিন্ন আকারের পাতা) কোনো পার্শ্বপ্রতিক্রিয়া না থাকার পরীক্ষা
resetSwitches();
globalThis.__FZ_ON_A02FIX = true;
const dummyPage = {
  page: 1,
  widthPt: 595.3,
  heightPt: 841.9,
  margins: { top: 42, right: 36, bottom: 36, left: 54 },
  bodyFontPt: 12,
  bands: [
    {
      kind: 'flow',
      y0: 50,
      y1: 66,
      gapBeforePt: 8,
      cells: [{ x0: 54, x1: 559.3, items: [{ kind: 'para', type: 'title', text: '**প্রত্যয়ন পত্র**', lines: ['**প্রত্যয়ন পত্র**'], bold: true, align: 'c', fontPt: 18, rect: { x: 220, y: 50, w: 150, h: 16 } }] }]
    }
  ]
};
const dummyBefore = JSON.stringify(dummyPage);
IR.repairA02FixPage(dummyPage);
check('ফ্রেমহীন বা ভিন্ন আকারের অন্য নথির পাতা A02FIX দ্বারা সম্পূর্ণ অপরিবর্তিত থাকে', JSON.stringify(dummyPage) === dummyBefore && !dummyPage._a02FixRepaired);

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
