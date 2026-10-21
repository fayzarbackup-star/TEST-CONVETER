/**
 * A06_SCORE_v1 — নমুনা a06 ও সমগোত্রীয় গৃহ নির্মাণ ঋণ উপযুক্ততা প্রত্যয়ন ফরমের লেআউট ও রেন্ডারিং মেরামতের স্বয়ংক্রিয় পরীক্ষা
 * চালানো: node tests/a06fix.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// switch-defaults.js require না করে প্রয়োজনীয় ভিত্তি-সুইচসমূহ নাম ধরে সক্রিয় করা
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT',
  'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4',
  'RULES2', 'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX'
];

function resetBaseSwitches() {
  for (const k of BASE_SWITCHES) {
    delete globalThis['__FZ_OFF_' + k];
    globalThis['__FZ_ON_' + k] = true;
  }
  delete globalThis.__FZ_ON_A06FIX;
  delete globalThis.__FZ_OFF_A06FIX;
  if (typeof process !== 'undefined' && process.env) {
    delete process.env.__FZ_ON_A06FIX;
    delete process.env.__FZ_OFF_A06FIX;
    delete process.env.FZ_ON;
    delete process.env.FZ_OFF;
  }
}

resetBaseSwitches();

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const Docx = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const A06_DIR = path.join(ROOT, 'qa/golden-data/runs/S20_0c8d9f40/a06');
const a06Meas = JSON.parse(fs.readFileSync(path.join(A06_DIR, 'measures.json'), 'utf8'));
const a06SavedIr = JSON.parse(fs.readFileSync(path.join(A06_DIR, 'ir.json'), 'utf8'));

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

// ১) সুইচ গেটিং পরীক্ষা (__FZ_ON_A06FIX, FZ_ON=A06FIX, __FZ_OFF_A06FIX, FZ_OFF=A06FIX)
{
  resetBaseSwitches();
  check(IR.a06FixOn() === false && LF.isA06FixOn() === false && Docx.a06FixOn() === false, 'ডিফল্ট অবস্থায় A06FIX সুইচ বন্ধ থাকবে');

  globalThis.__FZ_ON_A06FIX = true;
  check(IR.a06FixOn() === true && LF.isA06FixOn() === true && Docx.a06FixOn() === true, '__FZ_ON_A06FIX = true দিলে তিনটি মডিউলেই সুইচ চালু হবে');

  globalThis.__FZ_OFF_A06FIX = true;
  check(IR.a06FixOn() === false && LF.isA06FixOn() === false && Docx.a06FixOn() === false, '__FZ_OFF_A06FIX = true দিলে সুইচ ওভাররাইড হয়ে বন্ধ হবে');

  resetBaseSwitches();
  process.env.FZ_ON = 'WIDTH,A06FIX';
  check(IR.a06FixOn() === true && LF.isA06FixOn() === true && Docx.a06FixOn() === true, 'FZ_ON=A06FIX পরিবেশ চলকে সুইচ চালু হবে');

  process.env.FZ_OFF = 'A06FIX';
  check(IR.a06FixOn() === false && LF.isA06FixOn() === false && Docx.a06FixOn() === false, 'FZ_OFF=A06FIX পরিবেশ চলকে সুইচ বন্ধ হবে');
}

// ২) সুইচ বন্ধ থাকলে বাইট-বাই-বাইট অভিন্ন আউটপুট এবং চালু->বন্ধ রিস্টোর যাচাই
{
  resetBaseSwitches();
  globalThis.__FZ_ON_A06FIX = false;
  const irOff = IR.build(JSON.parse(JSON.stringify(a06Meas.cap)), JSON.parse(JSON.stringify(a06Meas.measures)), JSON.parse(JSON.stringify(a06Meas.pageInfo)));
  LF.fit(irOff);
  const xmlOff = Docx.bodyXml(irOff).xml;

  // সুইচ চালু করে build + fit + bodyXml
  globalThis.__FZ_ON_A06FIX = true;
  const irOn = IR.build(JSON.parse(JSON.stringify(a06Meas.cap)), JSON.parse(JSON.stringify(a06Meas.measures)), JSON.parse(JSON.stringify(a06Meas.pageInfo)));
  LF.fit(irOn);
  const xmlOn = Docx.bodyXml(irOn).xml;
  check(xmlOn !== xmlOff, 'A06FIX চালু থাকলে আউটপুট XML-এ মেরামত প্রতিফলিত হবে');

  // পুনরায় সুইচ বন্ধ করলে বাইট-বাই-বাইট পূর্বাবস্থায় ফিরে যাবে
  globalThis.__FZ_ON_A06FIX = false;
  const xmlRestored = Docx.bodyXml(irOn).xml;
  check(JSON.stringify(irOn) === JSON.stringify(irOff), 'A06FIX বন্ধ করলে IR বাইট-বাই-বাইট পূর্বাবস্থায় ফিরে যাবে');
  check(xmlRestored === xmlOff, 'A06FIX বন্ধ করলে DOCX XML বাইট-বাই-বাইট পূর্বাবস্থায় ফিরে যাবে');
}

// ৩) প্রবাহ-শিরোনামের (ব্যান্ড ৭) মুছে যাওয়া আন্ডারলাইন পুনরুদ্ধার ও অক্ষর-সংকোচন যাচাই
{
  resetBaseSwitches();
  globalThis.__FZ_ON_A06FIX = true;
  const ir = IR.build(JSON.parse(JSON.stringify(a06Meas.cap)), JSON.parse(JSON.stringify(a06Meas.measures)), JSON.parse(JSON.stringify(a06Meas.pageInfo)));
  LF.fit(ir);
  const hIt = ir.pages[0].bands[7].cells[0].items[0];
  check(hIt.underline === true, 'ব্যান্ড ৭-এর প্রত্যয়ন শিরোনামে মুছে যাওয়া আন্ডারলাইন পুনরুদ্ধার হয়েছে (underline === true)');
  check(hIt.charSpacingPt === -0.1, 'ব্যান্ড ৭-এর শিরোনামে প্রস্থ-সমন্বয়ের জন্য charSpacingPt === -0.1 বসেছে');
  const { xml } = Docx.bodyXml(ir);
  const paras = xml.match(/<w:p>[\s\S]*?<\/w:p>/g) || [];
  check(paras[7].includes('<w:u w:val="single"/>') && paras[7].includes('<w:spacing w:val="-2"/>'), 'ব্যান্ড ৭-এর XML-এ <w:u w:val="single"/> এবং <w:spacing w:val="-2"/> নির্গত হয়েছে');
}

// ৪) তালিকার ৪, ৫, ৭ ও ৮ নং দফার বিভক্ত "তারিখ" সংযোজন এবং ১)–১০) দফার কোলন/ডট-লিডার সমতাকরণ যাচাই
{
  resetBaseSwitches();
  globalThis.__FZ_ON_A06FIX = true;
  const ir = JSON.parse(JSON.stringify(a06SavedIr));
  LF.fit(ir);
  const p = ir.pages[0];

  const expectedLabels = {
    9: '১) আবেদনকারীর নাম',
    10: '২) পদবি',
    11: '৩) বর্তমান কর্মস্থল',
    12: '৪) বর্তমান কর্মস্থলে যোগদানের তারিখ',
    13: '৫) চাকুরিতে যোগদানের তারিখ',
    14: '৬) জাতীয় পরিচয় পত্র নম্বর (NID)/স্মার্ট কার্ড নম্বর',
    15: '৭) জন্ম তারিখ',
    16: '৮) পিআরএল শেষ হওয়ার তারিখ',
    17: '৯) মোবাইল নম্বর',
    18: '১০) ই-মেইল'
  };

  for (const [biStr, expLbl] of Object.entries(expectedLabels)) {
    const bi = Number(biStr);
    const it = p.bands[bi].cells[0].items[0];
    const segs = String(it.tabLines[0] || '').split('\t');
    check(segs[0] === expLbl && segs[1] === ':', `ব্যান্ড ${bi}-এ লেবেল "${expLbl}" এবং কোলন ":" সঠিক ট্যাব-খণ্ডে আছে`);
    check(Array.isArray(it.tabStops) && it.tabStops[0] === 203.5 && it.tabStops[1] === 211.6, `ব্যান্ড ${bi}-এ ট্যাব-স্টপ [203.5, 211.6]-এ সমতাকৃত`);
  }

  check(p.bands[14].cells[0].items[0].rect.w === 335.5, '৬ নং দফার (NID) ডান-প্রান্ত মূলের কালি-সীমা 335.5pt-এ সমন্বিত');
  check(p.bands[16].cells[0].items[0].rect.w === 342 && p.bands[17].cells[0].items[0].rect.w === 342 && p.bands[18].cells[0].items[0].rect.w === 342, '৮, ৯ ও ১০ নং দফার ডান-প্রান্ত 342.0pt-এ সমন্বিত');

  const { xml } = Docx.bodyXml(ir);
  const paras = xml.match(/<w:p>[\s\S]*?<\/w:p>/g) || [];
  for (let idx = 9; idx <= 18; idx++) {
    const pXml = paras[idx];
    check(
      pXml.includes('<w:tab w:val="left" w:pos="4070"/><w:tab w:val="left" w:pos="4232"/><w:tab w:val="right" w:leader="dot"') &&
      pXml.includes('<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:tab/></w:r>'),
      `তালিকা অনুচ্ছেদ P[${idx}]-এ ৪0৭০ ও ৪২৩২ dxa কোলন/ডট স্টপ এবং স্পষ্ট ২৪-হাফ-পয়েন্ট বোল্ড ডট-লিডার ট্যাব নির্গত হয়েছে`
    );
  }
}

// ৫) উপরের ৩টি লিডার+লেবেল সারির (ব্যান্ড ৪–৬: দপ্তরের নাম, পরিদপ্তর/অধিদপ্তর, মন্ত্রণালয়/বিভাগ) ফন্ট ও ট্যাব-স্টপ একীকরণ যাচাই
{
  resetBaseSwitches();
  globalThis.__FZ_ON_A06FIX = true;
  const ir = JSON.parse(JSON.stringify(a06SavedIr));
  LF.fit(ir);
  const p = ir.pages[0];

  for (const bi of [4, 5, 6]) {
    const it = p.bands[bi].cells[0].items[0];
    check(it.fontPt === 10.5, `ব্যান্ড ${bi}-এর লিডার+লেবেল ফন্ট 10.5pt-এ একীভূত`);
    check(it._a06LeaderStopPt === 295.8, `ব্যান্ড ${bi}-এর লিডার ট্যাব-স্টপ 295.8pt-এ একীভূত`);
  }

  const { xml } = Docx.bodyXml(ir);
  const paras = xml.match(/<w:p>[\s\S]*?<\/w:p>/g) || [];
  for (const idx of [4, 5, 6]) {
    check(
      paras[idx].includes('<w:tab w:val="left" w:leader="hyphen" w:pos="5916"/>') &&
      paras[idx].includes('<w:sz w:val="21"/>'),
      `লিডার+লেবেল অনুচ্ছেদ P[${idx}]-এ অভিন্ন ট্যাব-স্টপ 5916 dxa (295.8pt) ও 10.5pt ফন্ট নির্গত হয়েছে`
    );
  }
}

// ৬) ৩-লাইনের জাস্টিফাইড প্রত্যয়ন গদ্য-অনুচ্ছেদে (ব্যান্ড ৮) ডান-ইনডেন্ট (justRightPt = 20.1), অক্ষর-সংকোচন (-0.15pt) ও লাইন-পিচ (18.0pt) যাচাই
{
  resetBaseSwitches();
  globalThis.__FZ_ON_A06FIX = true;
  const ir = JSON.parse(JSON.stringify(a06SavedIr));
  // চওড়া মেজার ফাংশন দিয়েও LF.fit চালালে justRightPt বা firstIndentPt মুছে যাবে না
  LF.fit(ir, () => 600);
  const proseIt = ir.pages[0].bands[8].cells[0].items[0];
  check(proseIt.justRightPt === 20.1, 'ব্যান্ড ৮-এর গদ্য অনুচ্ছেদে চওড়া মেজারেও justRightPt === 20.1 সংরক্ষিত আছে');
  check(proseIt.firstIndentPt === 34 && proseIt.fontPt === 10.5, 'ব্যান্ড ৮-এর গদ্য অনুচ্ছেদে firstIndentPt === 34 এবং fontPt === 10.5 সংরক্ষিত আছে');
  check(proseIt.charSpacingPt === -0.15 && proseIt.lineSpacingPt === 18, 'ব্যান্ড ৮-এর গদ্য অনুচ্ছেদে charSpacingPt === -0.15 এবং lineSpacingPt === 18 বসেছে');

  const { xml } = Docx.bodyXml(ir);
  const paras = xml.match(/<w:p>[\s\S]*?<\/w:p>/g) || [];
  const p8 = paras[8];
  check(
    p8.includes('w:right="402"') && p8.includes('w:firstLine="680"') && p8.includes('w:line="360" w:lineRule="exact"'),
    'ব্যান্ড ৮-এর XML-এ w:right="402", w:firstLine="680" এবং w:line="360" নির্গত হয়েছে'
  );
  const spacingMatches = p8.match(/<w:spacing w:val="-3"\/>/g) || [];
  check(spacingMatches.length >= 3, 'ব্যান্ড ৮-এর তিনটি লাইনের রানেই <w:spacing w:val="-3"/> (-0.15pt) নির্গত হয়েছে');
}

// ৭) ৩০০-ডিপিআই এমব্লেম চিত্র (ব্যান্ড ১), পাতার শীর্ষ মার্জিন, নিচের স্বাক্ষর (ব্যান্ড ১৯) ও ১-পাতা সংরক্ষণ যাচাই
{
  resetBaseSwitches();
  globalThis.__FZ_ON_A06FIX = true;
  const ir = JSON.parse(JSON.stringify(a06SavedIr));
  ir.pages[0].bands[1].cells[0].items[0].image.dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  LF.fit(ir);
  const p = ir.pages[0];
  const figIt = p.bands[1].cells[0].items[0];
  const sigIt = p.bands[19].cells[0].items[0];

  check(p.margins.top === 153, 'পাতার শীর্ষ মার্জিন 154.6pt থেকে 153.0pt-এ সমন্বিত হয়েছে');
  check(figIt.widthPt === 40.3 && figIt.heightPt === 39.4 && figIt.indentPt === 200.2 && figIt._a07FigLeadPt === 1.5, 'ব্যান্ড ১-এর ৩০০-ডিপিআই এমব্লেম চিত্রে 40.3x39.4pt আকার, 200.2pt ইনডেন্ট ও 1.5pt বেসলাইন লিড বসেছে');
  check(sigIt.lineSpacingPt === 11.5 && sigIt.rect.y === 697.2 && sigIt.centerShiftPt === 120.2, 'ব্যান্ড ১৯-এর স্বাক্ষরে 11.5pt লাইন-পিচ, 697.2pt y-অবস্থান ও 120.2pt কেন্দ্র-সরণ বসেছে');

  const { xml } = Docx.bodyXml(ir);
  const sectCount = (xml.match(/<w:sectPr>/g) || []).length;
  const pageBreakCount = (xml.match(/<w:pageBreakBefore\/>/g) || []).length;
  check(sectCount === 1 && pageBreakCount === 0, 'আউটপুট নথি ঠিক ১ পাতায় সংরক্ষিত আছে (কোনো অতিরিক্ত পাতা বা পেজ-ব্রেক নেই)');

  const u8 = await Docx.build(ir, { type: 'uint8array' });
  check(u8 instanceof Uint8Array && u8.length > 1000 && u8[0] === 0x50 && u8[1] === 0x4b, 'Docx.build বৈধ .docx ZIP বাইনারি তৈরি করেছে');
}

// ৮) সমগোত্রীয় ফরম (a01/a12/a13 ধাঁচের অনুচ্ছেদ) অক্ষত থাকা এবং টেবিলের কঠোর গ্রিড-নিয়ম যাচাই
{
  resetBaseSwitches();
  const mockIr = {
    pages: [
      {
        page: 1,
        widthPt: 595.2,
        heightPt: 841.8,
        margins: { top: 54, left: 54, right: 54, bottom: 54 },
        scale: 1,
        bodyFontPt: 12,
        bands: [
          {
            kind: 'flow',
            gapBeforePt: 0,
            y0: 60,
            y1: 110,
            cells: [
              {
                x0: 54,
                x1: 541.2,
                items: [
                  {
                    kind: 'para',
                    type: 'paragraph',
                    rect: { x: 54, y: 60, w: 487.2, h: 42 },
                    text: 'প্রত্যয়ন করা যাইতেছে যে, জনাব ক খ গ অত্র দপ্তরে কর্মরত আছেন।\nতাহার স্বভাব ও চরিত্র ভালো।\nতিনি কোনো রাষ্ট্রবিরোধী কাজের সহিত জড়িত নহেন।',
                    lines: [
                      'প্রত্যয়ন করা যাইতেছে যে, জনাব ক খ গ অত্র দপ্তরে কর্মরত আছেন।',
                      'তাহার স্বভাব ও চরিত্র ভালো।',
                      'তিনি কোনো রাষ্ট্রবিরোধী কাজের সহিত জড়িত নহেন।'
                    ],
                    keepLines: true,
                    keepJust: true,
                    align: 'j',
                    firstIndentPt: 28,
                    indentPt: 0,
                    justRightPt: 0,
                    lineSpacingPt: 14,
                    fontPt: 12
                  }
                ]
              }
            ]
          },
          {
            kind: 'flow',
            gapBeforePt: 12,
            y0: 122,
            y1: 210,
            cells: [
              {
                x0: 54,
                x1: 541.2,
                items: [
                  {
                    kind: 'table',
                    type: 'table',
                    rect: { x: 54, y: 122, w: 480, h: 80 },
                    widthPt: 480,
                    heightPt: 80,
                    fontPt: 11,
                    borderless: false,
                    gridFirst: true,
                    colFractions: [0.15, 0.45, 0.40],
                    rowHeightsPt: [26, 27, 27],
                    rowHeightsExact: true,
                    rows: [
                      ['ক্রমিক', 'বিবরণ', 'মন্তব্য'],
                      ['১', 'মূল বেতন ও ভাতা', 'প্রযোজ্য'],
                      ['২', 'অন্যান্য কর্তন', 'নাই']
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };

  globalThis.__FZ_ON_A06FIX = false;
  const xmlMockOff = Docx.bodyXml(JSON.parse(JSON.stringify(mockIr))).xml;
  globalThis.__FZ_ON_A06FIX = true;
  const xmlMockOn = Docx.bodyXml(JSON.parse(JSON.stringify(mockIr))).xml;

  check(xmlMockOn === xmlMockOff, 'a01/a12/a13 ধাঁচের সাধারণ অনুচ্ছেদ ও টেবিল A06FIX চালু থাকলেও সম্পূর্ণ অপরিবর্তিত থাকে');

  // টেবিলের কঠোর নিয়ম যাচাই: ১টি উৎস ছক = ১টি <w:tbl>, বাড়তি ছায়া নেই, প্রতিটি সারিতে ঘরের প্রস্থের যোগফল = টেবিলের প্রস্থ এবং সব সারিতে কলাম-সীমা একই গ্রিডে
  const tblMatches = xmlMockOn.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
  check(tblMatches.length === 1, 'একটি উৎস-ছক থেকে ঠিক একটি <w:tbl> তৈরি হয়েছে (টেবিল ভাঙা হয়নি)');
  const tblXml = tblMatches[0];
  check(!tblXml.includes('<w:shd'), 'উৎসে ছায়া না থাকায় টেবিলের কোনো ঘরে বাড়তি ধূসর ছায়া (<w:shd>) বসানো হয়নি');

  const tblW = Number((/<w:tblW w:w="(\d+)"/.exec(tblXml) || [])[1] || 0);
  const gridCols = [...tblXml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]));
  const gridSum = gridCols.reduce((a, b) => a + b, 0);
  const gridEdges = [];
  let accG = 0;
  for (const w of gridCols) { accG += w; gridEdges.push(accG); }

  const trMatches = [...tblXml.matchAll(/<w:tr>[\s\S]*?<\/w:tr>/g)].map((m) => m[0]);
  check(trMatches.length === 3 && tblW === gridSum, 'টেবিলের মোট প্রস্থ ও <w:tblGrid>-এর কলামগুলোর যোগফল সমান');

  for (let ri = 0; ri < trMatches.length; ri++) {
    const tcWidths = [...trMatches[ri].matchAll(/<w:tcW w:w="(\d+)"/g)].map((m) => Number(m[1]));
    const rowSum = tcWidths.reduce((a, b) => a + b, 0);
    let accR = 0;
    const rowEdges = tcWidths.map((w) => { accR += w; return accR; });
    check(
      rowSum === tblW && rowEdges.every((e) => gridEdges.includes(e)),
      `টেবিলের সারি ${ri + 1}-এ ঘরের প্রস্থের যোগফল (${rowSum}) = টেবিলের প্রস্থ (${tblW}) এবং সব কলাম-সীমা একই গ্রিডে অবস্থিত`
    );
  }
}

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
