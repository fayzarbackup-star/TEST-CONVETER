import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// switch-defaults.js require না করে নাম ধরে ভিত্তি-সুইচগুলো সক্রিয় করা
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT', 'SERIALHANG',
  'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4', 'RULES2', 'A13FIX',
  'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX', 'A02FIX', 'A06FIX', 'A07FIX6', 'F1FIX',
  'A18FIX', 'A08FIX', 'A16FIX6', 'F1FIX2', 'INDENTFIX', 'VGAPFIX', 'SERIALFIX', 'MISSINGFIX',
  'SHORTFIX', 'RULESFIX'
];
for (const sw of BASE_SWITCHES) {
  globalThis['__FZ_ON_' + sw] = true;
}

const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const DOCX = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error('ব্যর্থ:', msg);
  }
}

const runsRoot = path.join(ROOT, 'qa/golden-data/runs');
const docDirs = {};
for (const sub of fs.readdirSync(runsRoot)) {
  const subPath = path.join(runsRoot, sub);
  if (fs.statSync(subPath).isDirectory()) {
    for (const d of fs.readdirSync(subPath)) {
      const dp = path.join(subPath, d);
      if (fs.statSync(dp).isDirectory()) docDirs[d] = dp;
    }
  }
}

function setFontTypeFix(on) {
  if (on) {
    globalThis.__FZ_ON_FONTTYPEFIX = true;
    delete globalThis.__FZ_OFF_FONTTYPEFIX;
  } else {
    delete globalThis.__FZ_ON_FONTTYPEFIX;
    delete globalThis.__FZ_OFF_FONTTYPEFIX;
  }
}

function extractBalancedTagBlocks(xml, tagName) {
  const blocks = [];
  const re = new RegExp(`<(\\/?)${tagName}(?=\\s|>)`, 'g');
  let depth = 0;
  let start = -1;
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[1] === '') {
      if (depth === 0) start = m.index;
      depth++;
    } else {
      depth--;
      if (depth === 0 && start >= 0) {
        const closeEnd = xml.indexOf('>', m.index);
        blocks.push(xml.slice(start, closeEnd + 1));
        start = -1;
      }
    }
  }
  return blocks;
}

function stripNestedTables(tblXml) {
  const inner = tblXml.slice('<w:tbl>'.length, -'</w:tbl>'.length);
  const nested = extractBalancedTagBlocks(inner, 'w:tbl');
  let cleaned = inner;
  for (const nb of nested) {
    cleaned = cleaned.replace(nb, '');
  }
  return '<w:tbl>' + cleaned + '</w:tbl>';
}

function verifyTableInvariants(xml, ir, docName) {
  const rawTbls = extractBalancedTagBlocks(xml, 'w:tbl');
  for (let ti = 0; ti < rawTbls.length; ti++) {
    const tbl = stripNestedTables(rawTbls[ti]);
    const tblPrM = /<w:tblPr>[\s\S]*?<\/w:tblPr>/.exec(tbl);
    const tblGridM = /<w:tblGrid>[\s\S]*?<\/w:tblGrid>/.exec(tbl);
    if (!tblPrM || !tblGridM) continue;
    const tblWM = /<w:tblW w:w="(\d+)" w:type="dxa"\/>/.exec(tblPrM[0]);
    const gridCols = [...tblGridM[0].matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]));
    if (!tblWM || !gridCols.length) continue;
    const tblW = Number(tblWM[1]);
    const gridSum = gridCols.reduce((a, b) => a + b, 0);
    assert(
      tblW === gridSum,
      `${docName} ছক ${ti + 1}: tblW (${tblW}) == gridCol যোগফল (${gridSum})`
    );
    const trs = extractBalancedTagBlocks(tbl, 'w:tr');
    for (let ri = 0; ri < trs.length; ri++) {
      const tr = trs[ri];
      const tcWs = [...tr.matchAll(/<w:tcPr><w:tcW w:w="(\d+)" w:type="dxa"\/>/g)].map((m) => Number(m[1]));
      const rowSum = tcWs.reduce((a, b) => a + b, 0);
      assert(
        rowSum === tblW,
        `${docName} ছক ${ti + 1} সারি ${ri + 1}: ঘরের প্রস্থের যোগফল (${rowSum}) == ছকের প্রস্থ (${tblW})`
      );
    }
  }
  for (const p of (ir && ir.pages) || []) {
    for (const b of (p && p.bands) || []) {
      for (const c of (b && b.cells) || []) {
        for (const it of (c && c.items) || []) {
          if (it && it.kind === 'table' && !it.borderless && Array.isArray(it.colWidthsPt) && it.colWidthsPt.length >= 2) {
            const sumW = Math.round(it.colWidthsPt.reduce((a, b0) => a + b0, 0) * 10) / 10;
            const targetW = Math.round((it.widthPt || it.rect.w) * 10) / 10;
            assert(sumW === targetW, `${docName} পাতা ${p.page} IR ছক: colWidthsPt যোগফল (${sumW}) == widthPt (${targetW})`);
          }
        }
      }
    }
  }
}

// ১) ডিফল্ট-বন্ধ ও সুইচ টগল যাচাই
setFontTypeFix(false);
assert(LF.isFontTypeFixOn() === false, 'ডিফল্ট অবস্থায় LF.isFontTypeFixOn() বন্ধ থাকতে হবে');
assert(IR.fontTypeFixOn() === false, 'ডিফল্ট অবস্থায় IR.fontTypeFixOn() বন্ধ থাকতে হবে');
assert(DOCX.fontTypeFixOn() === false, 'ডিফল্ট অবস্থায় DOCX.fontTypeFixOn() বন্ধ থাকতে হবে');

setFontTypeFix(true);
assert(LF.isFontTypeFixOn() === true, '__FZ_ON_FONTTYPEFIX = true দিলে LF.isFontTypeFixOn() চালু হবে');
assert(IR.fontTypeFixOn() === true, '__FZ_ON_FONTTYPEFIX = true দিলে IR.fontTypeFixOn() চালু হবে');
assert(DOCX.fontTypeFixOn() === true, '__FZ_ON_FONTTYPEFIX = true দিলে DOCX.fontTypeFixOn() চালু হবে');

globalThis.__FZ_OFF_FONTTYPEFIX = true;
assert(IR.fontTypeFixOn() === false, '__FZ_OFF_FONTTYPEFIX = true দিলে সুইচ বন্ধ হবে');
setFontTypeFix(false);

// ২) সব গোল্ডেন ফাইলে সুইচ বন্ধ বনাম চালু এবং পুনরায় বন্ধ (restore) অবস্থায় বাইট-টু-বাইট অভিন্নতা ও ছক-অখণ্ডতা যাচাই
for (const doc of ['a16', 'a14', 'a13', 'a03', 'a06', 'a07']) {
  setFontTypeFix(false);
  const measures = JSON.parse(fs.readFileSync(path.join(docDirs[doc], 'measures.json'), 'utf8'));
  const irBuiltOff = IR.build(measures);
  LF.fit(irBuiltOff);
  const xmlBuiltOff = DOCX.bodyXml(irBuiltOff).xml;
  const irBuiltOffStr = JSON.stringify(irBuiltOff);

  const irFile = JSON.parse(fs.readFileSync(path.join(docDirs[doc], 'ir.json'), 'utf8'));
  const xmlFileOff = DOCX.bodyXml(irFile).xml;
  const irFileOffStr = JSON.stringify(irFile);
  const tblCountOff = (xmlFileOff.match(/<w:tbl>/g) || []).length;
  const shdCountOff = (xmlFileOff.match(/<w:shd\b/g) || []).length;
  const sectCountOff = (xmlFileOff.match(/<w:sectPr\b/g) || []).length;

  // সুইচ চালু করে পরীক্ষা
  setFontTypeFix(true);
  const xmlFileOn = DOCX.bodyXml(irFile).xml;
  assert(xmlFileOn !== xmlFileOff, `${doc}: FONTTYPEFIX চালু থাকলে DOCX XML-এ প্রত্যাশিত পরিবর্তন ঘটবে`);

  const tblCountOn = (xmlFileOn.match(/<w:tbl>/g) || []).length;
  const shdCountOn = (xmlFileOn.match(/<w:shd\b/g) || []).length;
  const sectCountOn = (xmlFileOn.match(/<w:sectPr\b/g) || []).length;
  assert(tblCountOn === tblCountOff, `${doc}: ছকের সংখ্যা অপরিবর্তিত থাকতে হবে (${tblCountOn} == ${tblCountOff})`);
  assert(shdCountOn === shdCountOff, `${doc}: ঘরে কোনো বাড়তি ধূসর ছায়া (w:shd) যোগ হবে না (${shdCountOn} == ${shdCountOff})`);
  assert(sectCountOn === sectCountOff, `${doc}: পাতা-সংখ্যা কখনো বাড়বে না (${sectCountOn} == ${sectCountOff})`);
  verifyTableInvariants(xmlFileOn, irFile, doc);

  // সুইচ পুনরায় বন্ধ করে বাইট-টু-বাইট অভিন্নতা যাচাই
  setFontTypeFix(false);
  const xmlFileRestored = DOCX.bodyXml(irFile).xml;
  const irFileRestoredStr = JSON.stringify(irFile);
  assert(irFileRestoredStr === irFileOffStr, `${doc}: সুইচ বন্ধ করলে IR বাইট-টু-বাইট আগের অবস্থায় ফিরবে`);
  assert(xmlFileRestored === xmlFileOff, `${doc}: সুইচ বন্ধ করলে DOCX XML বাইট-টু-বাইট আগের অবস্থায় ফিরবে`);

  setFontTypeFix(true);
  const irBuiltOn = IR.build(measures);
  LF.fit(irBuiltOn);
  DOCX.bodyXml(irBuiltOn);
  setFontTypeFix(false);
  const xmlBuiltRestored = DOCX.bodyXml(irBuiltOn).xml;
  assert(JSON.stringify(irBuiltOn) === irBuiltOffStr, `${doc}: IR.build + restoreFontTypeFixIr বাইট-টু-বাইট অভিন্ন`);
  assert(xmlBuiltRestored === xmlBuiltOff, `${doc}: IR.build থেকে নির্মিত DOCX XML সুইচ বন্ধে বাইট-টু-বাইট অভিন্ন`);
}

// ৩) ফাইলভিত্তিক সুনির্দিষ্ট জ্যামিতিক মেরামত যাচাই (সুইচ চালু অবস্থায়)
setFontTypeFix(true);

// ৩ক) a16: পাতা ১ আন্তঃব্যান্ড খাড়া টিক ও ফুটার এবং পাতা ৪ ছক-পরবর্তী আদ্যক্ষর চিত্রের উচ্চতা
{
  const irA16 = JSON.parse(fs.readFileSync(path.join(docDirs.a16, 'ir.json'), 'utf8'));
  DOCX.bodyXml(irA16);
  const p1 = irA16.pages[0];
  const ovs = p1._a16Fix5Overlays || [];
  assert(ovs.some((o) => o.y === 196.4 && o.h === 1.9), 'a16 পাতা ১: ১ম আন্তঃব্যান্ড খাড়া টিক y=196.4, h=1.9');
  assert(ovs.some((o) => o.y === 199.5 && o.h === 6.3), 'a16 পাতা ১: ২য় আন্তঃব্যান্ড খাড়া টিক y=199.5, h=6.3');
  assert(ovs.some((o) => o.y === 269.2 && o.h === 8.5), 'a16 পাতা ১: ৪র্থ বডি-লাইনের খাড়া টিক y=269.2, h=8.5');
  assert(ovs.filter((o) => o.y >= 575).every((o) => o.x === 98.8), 'a16 পাতা ১: ৫ম ও ৬ষ্ঠ দফার টিক x=vx+1.0 (98.8)');
  const foot1 = p1.bands[p1.bands.length - 1].cells[0].items[0];
  assert(foot1.charSpacingPt === 0.1, 'a16 পাতা ১: ৭pt ফুটারের charSpacingPt = 0.1');

  const p4 = irA16.pages[3];
  const fig4 = p4.bands[2].cells[0].items[0];
  assert(fig4.heightPt === 25.2 && fig4.widthPt === 23.5, 'a16 পাতা ৪: ছক-পরবর্তী আদ্যক্ষর চিত্রের উচ্চতা ২৫.২pt ও প্রস্থ ২৩.৫pt');
  const p7 = irA16.pages[6];
  const fig7 = p7.bands[2].cells[0].items[0];
  assert(fig7.heightPt === 21.2, 'a16 পাতা ৭: কম ফাঁকের আদ্যক্ষর চিত্রের উচ্চতা ২১.২pt অপরিবর্তিত');
}

// ৩খ) a14: পাতা ১ প্রাপক ব্লকের পিচ ১৭.৫pt এবং পাতা ৩ স্ল্যাশ-সেতু, নিম্ন-স্বরচিহ্ন ও সমাপনী স্বাক্ষর ব্যান্ড
{
  const irA14 = JSON.parse(fs.readFileSync(path.join(docDirs.a14, 'ir.json'), 'utf8'));
  const { xml: xmlA14 } = DOCX.bodyXml(irA14);
  const p1 = irA14.pages[0];
  const leftIt = p1.bands[14].cells[0].items[0];
  assert(leftIt.lineSpacingPt === 17.5 && leftIt.lineRule === undefined && leftIt._a14LastLineRaise === undefined, 'a14 পাতা ১: বাম ৩-লাইন প্রাপক ব্লকের পিচ ১৭.৫pt পুনরুদ্ধার');

  const p3 = irA14.pages[2];
  const b3It = p3.bands[3].cells[0].items[0];
  assert(b3It.lineSpacingPt === 14.8 && b3It.lineRule === undefined, 'a14 পাতা ৩: সংযুক্ত ২-লাইন দফার লাইন-পিচ ১৪.৮pt');
  const b8It = p3.bands[8].cells[0].items[0];
  assert(b8It._fontTypeRaiseLastLineSubU === 3, 'a14 পাতা ৩: ৮। দফার ২য় লাইনের ূ-কারের নিম্ন-বিস্তার নিয়ন্ত্রণ (_fontTypeRaiseLastLineSubU=3)');
  assert(xmlA14.includes('<w:position w:val="3"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t xml:space="preserve">ূ</w:t>'), 'a14 পাতা ৩: DOCX XML-এ ২য় লাইনের ূ-কার +৩ হাফ-পয়েন্ট উত্তোলিত');
  const sigFig3 = p3.bands[15].cells[0].items[0];
  const sigPara3 = p3.bands[15].cells[0].items[1];
  assert(sigFig3.heightPt === 52 && sigFig3.widthPt === 107.6 && sigPara3.centerShiftPt === 127.2, 'a14 পাতা ৩: সমাপনী স্বাক্ষর ব্যান্ডের উচ্চতা ৫২pt ও প্রস্থ সংরেখিত');
}

// ৩গ) a13: পাতা ১ ব্যান্ড ৯ কোলন-ট্যাব লেবেলের ফন্ট-নিয়ন্ত্রণ
{
  const irA13 = JSON.parse(fs.readFileSync(path.join(docDirs.a13, 'ir.json'), 'utf8'));
  const { xml: xmlA13 } = DOCX.bodyXml(irA13);
  const b9It = irA13.pages[0].bands[9].cells[0].items[0];
  assert(b9It._fontTypeLabelFontPt === 9.5 && b9It._fontTypeLabelCharSpacingPt === 0.3, 'a13 পাতা ১: ব্যান্ড ৯-এর লেবেলে _fontTypeLabelFontPt=9.5 ও _fontTypeLabelCharSpacingPt=0.3');
  assert(xmlA13.includes('<w:spacing w:val="6"/><w:sz w:val="19"/><w:szCs w:val="19"/>'), 'a13 পাতা ১: DOCX XML-এ ব্যান্ড ৯-এর বাম লেবেলে ৯.৫pt ফন্ট ও +০.৩pt অক্ষর-ফাঁক');
}

// ৩ঘ) a03: পাতা ১ ও পাতা ২ কালো ব্যানারের নিম্ন-প্যাডিং
{
  const irA03 = JSON.parse(fs.readFileSync(path.join(docDirs.a03, 'ir.json'), 'utf8'));
  DOCX.bodyXml(irA03);
  const p1Banner = irA03.pages[0].bands[1].cells[0].items[0];
  const p2Banner1 = irA03.pages[1].bands[3].cells[0].items[0];
  const p2Banner2 = irA03.pages[1].bands[14].cells[0].items[0];
  assert(p1Banner.lineSpacingPt === 21 && p1Banner.lineRule === 'exact', 'a03 পাতা ১: ১ম কালো ব্যানারের উচ্চতা ২১pt');
  assert(p2Banner1.lineSpacingPt === 17.4 && p2Banner1.lineRule === 'exact' && p2Banner1._a14PosVal === 4, 'a03 পাতা ২: ইনলাইন-চেকবক্সের উপরের কালো ব্যানারের উচ্চতা ১৭.৪pt');
  assert(p2Banner2.lineSpacingPt === 16.6 && p2Banner2.lineRule === 'exact', 'a03 পাতা ২: ২য় কালো ব্যানারের উচ্চতা ১৬.৬pt');
}

// ৩ঙ) a06: পাতা ১ সরকারি প্রতীক চিত্রের অবস্থান, উচ্চতা ও তারকা-ফাঁক সেতু
{
  const irA06 = JSON.parse(fs.readFileSync(path.join(docDirs.a06, 'ir.json'), 'utf8'));
  DOCX.bodyXml(irA06);
  const p1 = irA06.pages[0];
  const fig = p1.bands[1].cells[0].items[0];
  assert(fig.indentPt === 199.4 && fig.heightPt === 40.4 && fig._a07FigLeadPt === 2.5, 'a06 পাতা ১: প্রতীক চিত্রের indentPt=199.4, heightPt=40.4, _a07FigLeadPt=2.5');
  assert(Array.isArray(p1._a16Fix5Overlays) && p1._a16Fix5Overlays.some((o) => o.w === 1.5 && o.h === 2), 'a06 পাতা ১: প্রতীক চিত্রের নিচে ১.৫x২.০pt তারকা-ফাঁক সেতু ওভারলে');
}

// ৩চ) a07: পাতা ৩ ছক-৩ (১১pt ফন্ট ও ১৫.৪pt পিচ) এবং পাতা ৪ ছক-৪ (১২.৫pt ফন্ট ও ১৬.৫pt পিচ)
{
  const irA07 = JSON.parse(fs.readFileSync(path.join(docDirs.a07, 'ir.json'), 'utf8'));
  const { xml: xmlA07 } = DOCX.bodyXml(irA07);
  const tbl3 = irA07.pages[2].bands[2].cells[0].items[0];
  const tbl4 = irA07.pages[3].bands[2].cells[0].items[0];
  assert(tbl3.fontPt === 11 && tbl3.cellFontSrc === 11 && tbl3._a07MultiLinePitch === 15.4, 'a07 পাতা ৩: ছক-৩-এর ফন্ট ১১pt ও লাইন-পিচ ১৫.৪pt');
  assert(!/----------/.test(tbl3.rows[1][2]) && /--------/.test(tbl3.rows[1][2]), 'a07 পাতা ৩: ছক-৩ সারি ১-এর ৯-লাইন ঘরে ৮-ড্যাশ পূরণ পুনরুদ্ধার');
  assert(tbl4.fontPt === 12.5 && tbl4.cellFontSrc === 12.5 && tbl4._a07MultiLinePitch === 16.5, 'a07 পাতা ৪: ছক-৪-এর ফন্ট ১২.৫pt ও লাইন-পিচ ১৬.৫pt');
  assert(xmlA07.includes('w:line="328" w:lineRule="exact"'), 'a07 পাতা ৪: DOCX XML-এ ছক-৪-এর বহু-লাইন ঘরে পূর্ণ সারি-উচ্চতা পিচ (328 twips)');
}

// ৪) অক্ষতিগ্রস্ত কাঠামোর (যেমন f1, a18, a08, a12, a01, a02) প্রতিনিধিত্বমূলক পাতায় FONTTYPEFIX চালু থাকলেও শূন্য পরিবর্তন যাচাই
{
  const unaffectedPages = [
    {
      page: 1, widthPt: 595.2, heightPt: 841.9, bodyFontPt: 11,
      margins: { top: 24, left: 54, right: 54, bottom: 24 },
      bands: [{
        kind: 'flow', y0: 100, y1: 300, gapBeforePt: 76,
        cells: [{
          x0: 54, x1: 541,
          items: [{
            kind: 'table', type: 'table', borderless: false,
            rect: { x: 54, y: 100, w: 487, h: 200 }, widthPt: 487, heightPt: 200,
            fontPt: 10.5, colFractions: [0.35, 0.65],
            rowHeightsPt: [100, 100],
            rows: [['১. নাম', 'কখগ'], ['২. পদবি', 'ঘঙচ']]
          }]
        }]
      }]
    },
    {
      page: 1, widthPt: 595.2, heightPt: 841.9, bodyFontPt: 12,
      frame: { style: 'single', spacePt: { top: 10, left: 10, right: 10, bottom: 10 } },
      margins: { top: 36, left: 48, right: 48, bottom: 36 },
      bands: [{
        kind: 'flow', y0: 50, y1: 80, gapBeforePt: 14,
        cells: [{
          x0: 48, x1: 547,
          items: [{ kind: 'para', type: 'paragraph', fontPt: 12, rect: { x: 48, y: 50, w: 499, h: 30 }, lines: ['সাধারণ অনুচ্ছেদ ১', 'সাধারণ অনুচ্ছেদ ২'], text: 'সাধারণ অনুচ্ছেদ ১\nসাধারণ অনুচ্ছেদ ২' }]
        }]
      }]
    }
  ];
  setFontTypeFix(false);
  const irUnaffOff = { pages: JSON.parse(JSON.stringify(unaffectedPages)) };
  const xmlUnaffOff = DOCX.bodyXml(irUnaffOff).xml;

  setFontTypeFix(true);
  const irUnaffOn = { pages: JSON.parse(JSON.stringify(unaffectedPages)) };
  const xmlUnaffOn = DOCX.bodyXml(irUnaffOn).xml;

  assert(JSON.stringify(irUnaffOn) === JSON.stringify(irUnaffOff), 'অক্ষতিগ্রস্ত পাতায় FONTTYPEFIX চালু থাকলেও IR সম্পূর্ণ অপরিবর্তিত');
  assert(xmlUnaffOn === xmlUnaffOff, 'অক্ষতিগ্রস্ত পাতায় FONTTYPEFIX চালু থাকলেও DOCX XML বাইট-টু-বাইট অপরিবর্তিত');
}

setFontTypeFix(false);
console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
