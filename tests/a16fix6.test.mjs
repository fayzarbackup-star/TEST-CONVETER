import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const BLD = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

// প্রোডাকশনের ভিত্তি সুইচসমূহ (switch-defaults.js ছাড়াই সরাসরি নাম ধরে সক্রিয়করণ)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT',
  'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4',
  'RULES2', 'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX', 'A02FIX',
  'A06FIX', 'A07FIX6'
];

function setBaseSwitches(on = true) {
  for (const sw of BASE_SWITCHES) {
    if (on) {
      globalThis['__FZ_ON_' + sw] = true;
      delete globalThis['__FZ_OFF_' + sw];
    } else {
      delete globalThis['__FZ_ON_' + sw];
    }
  }
}

let passed = 0;
let failed = 0;

function check(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error('❌ ব্যর্থ:', msg);
  }
}

// ১) সুইচ চালু/বন্ধ ও পরিবেশ চলক যাচাই
setBaseSwitches(true);
delete globalThis.__FZ_ON_A16FIX6;
delete globalThis.__FZ_OFF_A16FIX6;
check(IR.a16Fix6On() === false && LF.isA16Fix6On() === false && BLD.a16Fix6On() === false, 'ডিফল্ট অবস্থায় A16FIX6 সুইচ বন্ধ থাকবে');

globalThis.__FZ_ON_A16FIX6 = true;
check(IR.a16Fix6On() === true && LF.isA16Fix6On() === true && BLD.a16Fix6On() === true, '__FZ_ON_A16FIX6=true হলে তিন মডিউলেই সুইচ চালু হবে');

globalThis.__FZ_OFF_A16FIX6 = true;
check(IR.a16Fix6On() === false && LF.isA16Fix6On() === false && BLD.a16Fix6On() === false, '__FZ_OFF_A16FIX6=true হলে সুইচ অগ্রাধিকার ভিত্তিতে বন্ধ হবে');
delete globalThis.__FZ_OFF_A16FIX6;
delete globalThis.__FZ_ON_A16FIX6;

process.env.FZ_ON = 'A16FIX6';
check(IR.a16Fix6On() === true && LF.isA16Fix6On() === true && BLD.a16Fix6On() === true, 'FZ_ON=A16FIX6 পরিবেশ চলকে সুইচ চালু হবে');
process.env.FZ_OFF = 'A16FIX6';
check(IR.a16Fix6On() === false && LF.isA16Fix6On() === false && BLD.a16Fix6On() === false, 'FZ_OFF=A16FIX6 পরিবেশ চলকে সুইচ বন্ধ হবে');
delete process.env.FZ_ON;
delete process.env.FZ_OFF;

// ২) গোল্ডেন ডেটা লোড (a16)
const a16Dir = path.join(ROOT, 'qa/golden-data/runs/S21_bb0e8106/a16');
const capture = JSON.parse(fs.readFileSync(path.join(a16Dir, 'capture.json'), 'utf8'));
const measures = JSON.parse(fs.readFileSync(path.join(a16Dir, 'measures.json'), 'utf8'));
const savedIrRaw = fs.readFileSync(path.join(a16Dir, 'ir.json'), 'utf8');

// ৩) সুইচ বন্ধ অবস্থায় বাইট-বাই-বাইট অভিন্নতা এবং চালু->বন্ধ করলে পূর্ণ পুনরুদ্ধার যাচাই
globalThis.__FZ_ON_A16FIX6 = false;
const irBuildOff = IR.build(JSON.parse(JSON.stringify(capture)), JSON.parse(JSON.stringify(measures)));
LF.fit(irBuildOff);
const xmlBuildOff = BLD.bodyXml(irBuildOff).xml;

globalThis.__FZ_ON_A16FIX6 = true;
const irBuildOn = IR.build(JSON.parse(JSON.stringify(capture)), JSON.parse(JSON.stringify(measures)));
LF.fit(irBuildOn);
const xmlBuildOn = BLD.bodyXml(irBuildOn).xml;

check(xmlBuildOff !== xmlBuildOn, 'A16FIX6 চালু থাকলে আউটপুট XML-এ প্রত্যাশিত পরিবর্তন প্রতিফলিত হবে');

globalThis.__FZ_ON_A16FIX6 = false;
LF.fit(irBuildOn);
const xmlBuildRestored = BLD.bodyXml(irBuildOn).xml;
check(xmlBuildRestored === xmlBuildOff, 'IR.build-এ A16FIX6 চালু করার পর বন্ধ করলে XML বাইট-বাই-বাইট পূর্বাবস্থায় ফিরবে');

// সংরক্ষিত ir.json (ছবিসহ)-এর ওপর চালু/বন্ধ পুনরুদ্ধার পরীক্ষা
const DUMMY_PNG = 'data:image/png;base64,' + BLD.makeGrayPngBase64(2, 2, 0);
function attachDummyImgDataUrl(irObj) {
  for (const p of irObj.pages || []) {
    for (const b of p.bands || []) {
      for (const c of b.cells || []) {
        for (const it of c.items || []) {
          if (it && it.kind === 'figure' && it.image && !it.image.dataUrl) {
            it.image.dataUrl = DUMMY_PNG;
          }
        }
      }
    }
  }
  return irObj;
}

globalThis.__FZ_ON_A16FIX6 = false;
const irSavedOff = attachDummyImgDataUrl(JSON.parse(savedIrRaw));
LF.fit(irSavedOff);
const xmlSavedOff = BLD.bodyXml(irSavedOff).xml;

globalThis.__FZ_ON_A16FIX6 = true;
const irSavedOn = attachDummyImgDataUrl(JSON.parse(savedIrRaw));
LF.fit(irSavedOn);
const xmlSavedOn = BLD.bodyXml(irSavedOn).xml;

// ৪) পাতা ১ (স্মারকপত্র) সংস্কার যাচাই
const p1 = irSavedOn.pages[0];
const p1Overlays = p1._a16Fix5Overlays || [];
check(p1Overlays.length === 13, 'পাতা ১-এ বাম মার্জিন খাড়া-রেখার ঠিক ১৩টি ওভারলে খণ্ড থাকবে');
check(!p1Overlays.some((ov) => ov.y < 50), 'পাতা ১-এ শীর্ষ খাড়া-রেখার ভ্রান্ত স্টাব (y<50, h=27.8<30) অপসারিত হয়েছে');
check(p1Overlays.every((ov) => Math.abs(ov.x - 97.8) < 0.05 && ov.w === 1), 'পাতা ১-এর সব খাড়া-রেখা ওভারলে x=97.8pt ও প্রস্থ 1pt-এ অবস্থিত');
const p1BotRule = p1Overlays[p1Overlays.length - 1];
check(p1BotRule && p1BotRule.y === 309.0 && p1BotRule.h === 265.0, 'পাতা ১-এর নিচের খাড়া-রেখা y=309..574 (h=265pt, দফা ৪ পর্যন্ত) সীমাবদ্ধ থাকবে');

const p1Item6Band = p1.bands[13];
const p1Item6 = p1Item6Band && p1Item6Band.cells[0].items[0];
check(p1Item6Band && p1Item6Band.y0 === 592.3 && p1Item6 && p1Item6.lineSpacingPt === 14.0, 'পাতা ১-এর দফা ৬-এর শুরু y0=592.3pt ও লাইন-পিচ 14.0pt হবে যাতে দফা ৫ থেকে পৃথক থাকে');

const p1Footer = p1.bands[14] && p1.bands[14].cells[0].items[0];
check(p1Footer && p1Footer.fontPt === 7 && p1Footer.charSpacingPt === 0.1, 'পাতা ১-এর ফাইল-পাথ ফুটারের ফন্ট 7pt ও অক্ষর-ফাঁক +0.1pt পুনরুদ্ধার হয়েছে');

// ৫) পাতা ২ (চেকলিস্ট সূচিপত্র বুলেট) সংস্কার যাচাই
const p2 = irSavedOn.pages[1];
const p2B1 = p2.bands[1].cells[0].items[0];
const p2B2 = p2.bands[2].cells[0].items[0];
const p2B3 = p2.bands[3].cells[0].items[0];
const p2B4 = p2.bands[4].cells[0].items[0];
check(p2B1.fontPt === 20.5 && p2B1.charSpacingPt === 0.25, 'পাতা ২-এর ২য় বুলেটে ("পদ সংরক্ষণ") fontPt=20.5 ও charSpacingPt=0.25 থাকবে');
check(p2B2.fontPt === 18.5 && p2B2.charSpacingPt === 0.55 && p2.bands[2].y0 === 220.8, 'পাতা ২-এর ৩য় বুলেটে ("পদ স্থায়ীকরণ") fontPt=18.5, charSpacingPt=0.55 ও y0=220.8pt থাকবে');
check(/অন্তর্ভুক্তি\*{0,2}$/.test(p2B3.text.trim()) && p2B3.charSpacingPt === 0.15, 'পাতা ২-এর ৪র্থ বুলেটে বাড়তি "করণ" প্রত্যয়হীন লেখা ও charSpacingPt=0.15 থাকবে');
check(p2B4.fontPt === 20.0 && p2B4.charSpacingPt === 0.55, 'পাতা ২-এর ৫ম বুলেটে ("সাংগঠনিক কাঠামো অনুমোদন") fontPt=20.0 ও charSpacingPt=0.55 থাকবে');

// ৬) পাতা ৬, ৭ ও ৮-এর অণু-স্বাক্ষর চিত্র (<a:srcRect>) এবং পাদটীকা/স্বাক্ষর অবস্থান যাচাই
const p6 = irSavedOn.pages[5];
const p6Fig = p6.bands[5].cells[0].items[0];
const p6Foot = p6.bands[6].cells[0].items[0];
check(p6Fig._a16WideSigCrop === true && p6Fig._a16TrimLR === 27500 && p6Fig._a16TrimTop === 11000, 'পাতা ৬-এর অণু-স্বাক্ষরে _a16WideSigCrop=true, _a16TrimLR=27500 ও _a16TrimTop=11000 থাকবে');
check(p6Fig.widthPt === 33.5 && p6Fig.heightPt === 25.5 && p6.bands[5].y0 === 724.8, 'পাতা ৬-এর অণু-স্বাক্ষরের আকার 33.5x25.5pt ও y0=724.8pt হবে');
check(p6Foot.lineSpacingPt === 12.0 && p6.bands[6].y0 === 752.0, 'পাতা ৬-এর "অঃ পৃঃ দ্রঃ" পাদটীকার y0=752.0pt ও lineSpacingPt=12.0pt হবে');

const p7 = irSavedOn.pages[6];
const p7Fig = p7.bands[2].cells[0].items[0];
const p7Sig = p7.bands[3].cells[0].items[0];
check(p7Fig._a16WideSigCrop === true && p7Fig._a16TrimLR === 28000 && p7Fig._a16TrimTop === 10000, 'পাতা ৭-এর অণু-স্বাক্ষরে _a16WideSigCrop=true, _a16TrimLR=28000 ও _a16TrimTop=10000 থাকবে');
check(p7Fig.widthPt === 25.0 && p7Fig.heightPt === 21.2 && p7.bands[2].y0 === 292.3, 'পাতা ৭-এর অণু-স্বাক্ষরের আকার 25.0x21.2pt ও y0=292.3pt হবে');
check(p7Sig.fontPt === 13.0 && p7Sig.lineSpacingPt === 15.5 && p7.bands[3].y0 === 315.6, 'পাতা ৭-এর স্বাক্ষর ব্লকের y0=315.6pt, fontPt=13.0pt ও lineSpacingPt=15.5pt হবে');

const p8 = irSavedOn.pages[7];
const p8Fig = p8.bands[5].cells[0].items[0];
const p8Sig = p8.bands[6].cells[0].items[0];
check(p8Fig._a16WideSigCrop === true && p8Fig._a16TrimTop === 10000, 'পাতা ৮-এর অণু-স্বাক্ষরে _a16WideSigCrop=true ও _a16TrimTop=10000 থাকবে');
check(p8Fig.widthPt === 24.2 && p8Fig.heightPt === 25.0 && p8.bands[5].y0 === 489.1, 'পাতা ৮-এর অণু-স্বাক্ষরের আকার 24.2x25.0pt ও y0=489.1pt হবে');
check(p8.bands[6].y0 === 533.5 && p8Sig.rect.y === 533.5, 'পাতা ৮-এর স্বাক্ষর ব্লকের y0=533.5pt অক্ষুণ্ণ থাকবে');

// XML-এ <a:srcRect> ট্যাগ উপস্থিতি যাচাই
check(xmlSavedOn.includes('<a:srcRect l="27500" t="11000" r="27500" b="0"/>'), 'পাতা ৬-এর অণু-স্বাক্ষর চিত্রে সঠিক <a:srcRect l="27500" t="11000" r="27500" b="0"/> নির্গত হয়েছে');
check(xmlSavedOn.includes('<a:srcRect l="28000" t="10000" r="28000" b="0"/>'), 'পাতা ৭-এর অণু-স্বাক্ষর চিত্রে সঠিক <a:srcRect l="28000" t="10000" r="28000" b="0"/> নির্গত হয়েছে');
check(xmlSavedOn.includes('<a:srcRect l="27635" t="10000" r="27635" b="0"/>'), 'পাতা ৮-এর অণু-স্বাক্ষর চিত্রে সঠিক <a:srcRect l="27635" t="10000" r="27635" b="0"/> নির্গত হয়েছে');

// সংরক্ষিত ir.json-এ সুইচ বন্ধ করলে পুনরুদ্ধার যাচাই
globalThis.__FZ_ON_A16FIX6 = false;
LF.fit(irSavedOn);
const xmlSavedRestored = BLD.bodyXml(irSavedOn).xml;
check(xmlSavedRestored === xmlSavedOff, 'সংরক্ষিত ir.json-এ A16FIX6 চালু করার পর বন্ধ করলে XML বাইট-বাই-বাইট পূর্বাবস্থায় ফিরবে');

// ৭) পাতা-সংখ্যা ও টেবিলের কঠোর নিয়ম যাচাই (কোনো টেবিল ভাঙেনি, কোনো অতিরিক্ত ছায়া নেই, প্রতিটি সারিতে কলাম-গ্রিড অভিন্ন)
globalThis.__FZ_ON_A16FIX6 = true;
const sectCount = (xmlSavedOn.match(/<w:sectPr>/g) || []).length;
check(sectCount === 9 && irSavedOn.pages.length === 9, 'নথির পাতা-সংখ্যা কঠোরভাবে ৯ থাকবে (কখনো বাড়বে না)');
check(!/<w:shd\b/.test(xmlSavedOn), 'কোনো ঘরে বাড়তি ধূসর ছায়া (<w:shd>) যুক্ত হয়নি');

// XML থেকে সব <w:tbl> ব্লক পার্স করে গ্রিড ও ঘরের প্রস্থের সমতা যাচাই
function extractTables(xml) {
  const tables = [];
  const stack = [];
  const re = /<\/?w:tbl(?=\s|>)/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[0] === '<w:tbl') {
      stack.push(m.index);
    } else {
      const start = stack.pop();
      if (stack.length === 0 && start !== undefined) {
        tables.push(xml.slice(start, m.index + '</w:tbl>'.length));
      }
    }
  }
  return tables;
}

function splitDirectChildren(innerXml, tag) {
  const chunks = [];
  let depth = 0;
  let curStart = -1;
  const re = new RegExp(`<\\/?(?:w:tbl|${tag})(?=\\s|>|\\/)`, 'g');
  let m;
  while ((m = re.exec(innerXml)) !== null) {
    const tok = m[0];
    if (tok === '<w:tbl') {
      depth++;
    } else if (tok === '</w:tbl') {
      depth--;
    } else if (depth === 0) {
      if (tok === `<${tag}`) {
        curStart = m.index;
      } else if (tok === `</${tag}` && curStart >= 0) {
        chunks.push(innerXml.slice(curStart, m.index + `</${tag}>`.length));
        curStart = -1;
      }
    }
  }
  return chunks;
}

const topTables = extractTables(xmlSavedOn);
const borderedTopTables = topTables.filter((t) => /<w:tblBorders><w:top w:val="single"/.test(t.slice(0, 600)));
check(borderedTopTables.length === 7, 'পাতা ৩–৯-এর ৭টি চেকলিস্ট উৎস-ছকের জন্য ঠিক ৭টি বর্ডারযুক্ত শীর্ষ <w:tbl> থাকবে (কোনো ছক টুকরো হয়নি)');

let allTablesGridValid = true;
for (let ti = 0; ti < topTables.length; ti++) {
  const tblXml = topTables[ti];
  const inner = tblXml.replace(/^<w:tbl>/, '').replace(/<\/w:tbl>$/, '');
  const tblWMatch = /<w:tblW w:w="(\d+)"/.exec(inner);
  const gridMatch = /<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/.exec(inner);
  const gridCols = gridMatch ? [...gridMatch[1].matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((x) => +x[1]) : [];
  const gridSum = gridCols.reduce((a, b) => a + b, 0);
  const tblW = tblWMatch ? +tblWMatch[1] : -1;
  if (gridCols.length < 2 || gridSum !== tblW) {
    allTablesGridValid = false;
  }
  const cumEdges = [0];
  for (const w of gridCols) cumEdges.push(cumEdges[cumEdges.length - 1] + w);
  const edgeSet = new Set(cumEdges);

  const rows = splitDirectChildren(inner, 'w:tr');
  for (let ri = 0; ri < rows.length; ri++) {
    const tcs = splitDirectChildren(rows[ri], 'w:tc');
    let rowSum = 0;
    let colIdx = 0;
    for (const tc of tcs) {
      const tcPrMatch = /<w:tcPr>([\s\S]*?)<\/w:tcPr>/.exec(tc);
      const tcPr = tcPrMatch ? tcPrMatch[1] : '';
      const wMatch = /<w:tcW w:w="(\d+)"/.exec(tcPr);
      const spanMatch = /<w:gridSpan w:val="(\d+)"\/>/.exec(tcPr);
      const cw = wMatch ? +wMatch[1] : 0;
      const span = spanMatch ? +spanMatch[1] : 1;
      rowSum += cw;
      colIdx += span;
      if (!edgeSet.has(rowSum)) {
        allTablesGridValid = false;
      }
    }
    if (rowSum !== gridSum || colIdx !== gridCols.length) {
      allTablesGridValid = false;
    }
  }
}
check(allTablesGridValid, 'সব ছকের প্রতিটি সারিতে ঘরের প্রস্থের যোগফল = টেবিলের প্রস্থ এবং সব সারিতে কলাম-সীমা একই গ্রিডে আবদ্ধ');

// ৮) ভিন্ন নথির (অ-a16) পাতায় কোনো পার্শ্বপ্রতিক্রিয়া না থাকার পরীক্ষা
const dummyPage = {
  page: 1,
  widthPt: 595.2,
  heightPt: 841.9,
  bodyFontPt: 12,
  margins: { top: 54, right: 54, bottom: 54, left: 54 },
  bands: [
    {
      kind: 'flow',
      y0: 72,
      y1: 90,
      gapBeforePt: 18,
      cells: [{ x0: 54, x1: 541.2, items: [{ kind: 'para', type: 'paragraph', text: 'সাধারণ অনুচ্ছেদ পরীক্ষা', lines: ['সাধারণ অনুচ্ছেদ পরীক্ষা'], fontPt: 12, rect: { x: 54, y: 72, w: 200, h: 18 } }] }]
    }
  ]
};
const dummyBefore = JSON.stringify(dummyPage);
IR.repairA16Fix6Page(dummyPage);
check(JSON.stringify(dummyPage) === dummyBefore && !dummyPage._a16Fix6Repaired, 'অ-a16 সাধারণ পাতায় repairA16Fix6Page কোনো পরিবর্তন করবে না');

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
