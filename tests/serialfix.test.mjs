/**
 * SERIAL_TYPE_v1 — স্বয়ংক্রিয় ইউনিট ও রিগ্রেশন পরীক্ষা (কোনো বাহ্যিক প্যাকেজ ছাড়া Node.js-এ চলে)
 *
 * পরীক্ষা করে:
 * ১) সুইচ বন্ধ (ডিফল্ট) এবং জোরপূর্বক বন্ধ (__FZ_OFF_SERIALFIX = true) অবস্থায় ৫টি গোল্ডেন ফাইলের
 *    (a08, a16, a14, a13, a03) ও প্রভাবহীন ফিক্সচারের IR এবং DOCX XML বাইট-প্রতি-বাইট অভিন্ন থাকে।
 * ২) সুইচ চালু (globalThis.__FZ_ON_SERIALFIX = true / FZ_ON=SERIALFIX) অবস্থায়:
 *    - ক) a08 (পাতা ১: y=160, 184, 209 — ৩টি লাইন) ও a13 (পাতা ১: y=493 — ১টি লাইন):
 *         ১-লাইনের ট্যাব-হীন ও ঝুলন্ত-ইনডেন্টহীন সংক্ষিপ্ত ক্রমিক আইটেমে tabStops=[indentPt+1] (যথাক্রমে 20 dxa ও 30 dxa)
 *         এবং _noSerialHang নির্ধারিত হয়, যাতে SERIALHANG মডিউলের ২৬pt ট্যাব-প্রসারণ ঘটে না।
 *    - খ) a03 (পাতা ২: y=729 — ১টি লাইন):
 *         বর্ডারলেস ৩-কলামের দ্বি-বাক্স ছকে (splitBoxCols=[true, false, true]) অতিরিক্ত ২*marPt+২ প্রস্থ সংযোজন রোধ হয়
 *         (tblW: 10368 dxa -> 10113 dxa), tblInd-এ cellMarTw (108 dxa) বসে (240 -> 348 dxa) এবং উচ্চতা 56.5pt হয়।
 *    - গ) a16 (পাতা ১: y=199 ও y=705 — ২টি লাইন):
 *         ৭pt অ-ইটালিক সংক্ষিপ্ত ফুটারে (rect.h <= 6.5pt) charSpacingPt = -0.05pt (<w:spacing w:val="-1"/>) বসে
 *         এবং ১৯৬–২০৬pt পরিসরের খাড়া বিভাজক রেখার দ্বৈত কালি-খণ্ড (y=195.8, h=2.0 ও y=199.2, h=6.6) সংরক্ষিত হয়।
 *    - ঘ) a14 (পাতা ১: y=824 — ১টি লাইন):
 *         দ্বি-স্তর স্বাক্ষর-চিত্র ও বাম ৩-লাইন প্রাপক ব্লকের উল্লম্ব সংযোগ (lineSpacingPt=16.5pt, fig1.heightPt=44.5pt)
 *         এবং সিগনেচার রো-ব্রিজ (y=743.5) ও নিম্ন-বাম মার্জিন দাগ (x=14, y=824) সংরক্ষিত হয়।
 * ৩) ছকের (table) ইনভ্যারিয়েন্ট যাচাই: প্রতিটি সারির কলামের প্রস্থের যোগফল ছকের মোট প্রস্থের (tblW) সমান এবং সব সারির গ্রিড অভিন্ন।
 * ৪) প্রভাবহীন পৃষ্ঠা/ফিক্সচারে (যেমন প্রশস্ত অনুচ্ছেদ, প্রকৃত ট্যাবযুক্ত ক্রমিক তালিকা, সাধারণ বর্ডারলেস ছক) কোনো পরিবর্তন ঘটে না।
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
// প্রত্যাশিত মাপগুলো INDENTFIX/VGAPFIX-ছাড়া ভিত্তিতে হিসাব করা — তাই এই টেস্টে ও-দুটি বন্ধ
globalThis.__FZ_OFF_INDENTFIX = true;
globalThis.__FZ_OFF_VGAPFIX = true;

globalThis.window = globalThis;

// switch-defaults.js সরাসরি require না করে সোর্স থেকে DEFAULT_ON সুইচগুলো পার্স করে globalThis.__FZ_ON_<NAME> = true সেট করা
const sdSrc = fs.readFileSync(path.join(ROOT, 'js/layout-engine/faithful/switch-defaults.js'), 'utf8');
const defaultOnBlock = sdSrc.match(/(?:const|var)\s+DEFAULT_ON\s*=\s*\[([\s\S]*?)\];/);
const DEFAULT_ON = [];
if (defaultOnBlock) {
  const re = /'([A-Z0-9_]+)'/g;
  let m;
  while ((m = re.exec(defaultOnBlock[1])) !== null) {
    DEFAULT_ON.push(m[1]);
  }
}

function applyBaselineSwitches() {
  for (const name of DEFAULT_ON) {
    globalThis['__FZ_ON_' + name] = true;
  }
}
applyBaselineSwitches();

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const Builder = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const shCandidates = [
  path.join(ROOT, 'js/layout-engine/faithful/serial-hang.js'),
  '/working_dir/c_d0c565f7a10dd67d/bundle/js/layout-engine/faithful/serial-hang.js'
];
const shPath = shCandidates.find((p) => fs.existsSync(p));
const SH = shPath ? require(shPath) : null;

const clone = (obj) => JSON.parse(JSON.stringify(obj));

// ১০০px আকারে বাংলা/ইংরেজি লেখার প্রস্থ মাপার ক্যালিব্রেটেড ফাংশন
function measure100(s) {
  let w = 0;
  for (const ch of String(s)) {
    if (ch === '\u09CD') w -= 20;
    else if (/[ঁ-ঃ়া-ৌ]/.test(ch)) w += /[ািীোৌৈে]/.test(ch) ? 20 : 2;
    else if (/[.…·]/.test(ch)) w += 25;
    else if (/\s/.test(ch)) w += 26;
    else if (/[-–—_/()]/.test(ch)) w += 30;
    else w += 46;
  }
  return Math.max(0, w);
}

function flatPageItems(page) {
  const out = [];
  for (const band of (page && page.bands) || []) {
    for (const cell of (band && band.cells) || []) {
      out.push(...((cell && cell.items) || []));
    }
  }
  return out;
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

const GOLDEN_DIRS = {
  a08: path.join(ROOT, 'qa/golden-data/runs/S28_d1eed75b/a08'),
  a16: path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a16'),
  a14: path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a14'),
  a13: path.join(ROOT, 'qa/golden-data/runs/S27_62af339e/a13'),
  a03: path.join(ROOT, 'qa/golden-data/runs/S26_3b93d252/a03')
};

const EXTRA_UNAFFECTED_CANDIDATES = {
  a01: [
    path.join(ROOT, 'qa/golden-data/asis/a01/measures.json'),
    '/working_dir/c_d60c4538e7efcb99/work/qa/golden-data/runs/base5/a01/measures.json'
  ],
  a07: [
    path.join(ROOT, 'qa/golden-data/asis/a07/measures.json'),
    '/working_dir/c_22674c4767760921/work/qa/golden-data/runs/base5/a07/measures.json'
  ]
};

const fixtures = {};
for (const [k, dir] of Object.entries(GOLDEN_DIRS)) {
  fixtures[k] = {
    measuresRaw: JSON.parse(fs.readFileSync(path.join(dir, 'measures.json'), 'utf8')),
    goldenIr: JSON.parse(fs.readFileSync(path.join(dir, 'ir.json'), 'utf8'))
  };
}
for (const [k, candidates] of Object.entries(EXTRA_UNAFFECTED_CANDIDATES)) {
  const mPath = candidates.find((p) => fs.existsSync(p));
  if (mPath) {
    const irPath = path.join(path.dirname(mPath), 'ir.json');
    fixtures[k] = {
      measuresRaw: JSON.parse(fs.readFileSync(mPath, 'utf8')),
      goldenIr: fs.existsSync(irPath) ? JSON.parse(fs.readFileSync(irPath, 'utf8')) : null
    };
  }
}

function runFull(measuresRaw) {
  const m = clone(measuresRaw);
  const ir = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(ir, measure100);
  const bodyObj = Builder.bodyXml(ir);
  const shApplied = SH ? SH.apply(bodyObj.xml) : { xml: bodyObj.xml, n: 0 };
  return { ir, bodyObj, xml: bodyObj.xml, shXml: shApplied.xml, shChanged: shApplied.n };
}

// নেস্টেড <w:tbl> ভেতর থেকে বাইরে ক্রমান্বয়ে আলাদা করে প্রতিটি ছকের গ্রিড ও কলামের প্রস্থ যাচাই
function extractTablesFlat(xml) {
  const tables = [];
  let s = xml;
  const leafTblRe = /<w:tbl\b[^>]*>(?:(?!<w:tbl\b)[\s\S])*?<\/w:tbl>/;
  let match;
  while ((match = leafTblRe.exec(s)) !== null) {
    tables.push(match[0]);
    s = s.slice(0, match.index) + '<NESTED_TBL_CHECKED/>' + s.slice(match.index + match[0].length);
  }
  return tables;
}

function checkTableInvariants(xml, label) {
  const tables = extractTablesFlat(xml);
  let allOk = true;
  let errDetail = '';

  for (let ti = 0; ti < tables.length; ti++) {
    const tblIdx = ti + 1;
    const tblXml = tables[ti];
    const tblWM = tblXml.match(/<w:tblPr>[\s\S]*?<w:tblW\s+w:w="(\d+)"\s+w:type="dxa"/);
    if (!tblWM) {
      allOk = false;
      errDetail = `tbl#${tblIdx}: <w:tblW> পাওয়া যায়নি`;
      break;
    }
    const tblW = parseInt(tblWM[1], 10);

    const gridMatch = tblXml.match(/<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/);
    if (!gridMatch) {
      allOk = false;
      errDetail = `tbl#${tblIdx}: <w:tblGrid> পাওয়া যায়নি`;
      break;
    }
    const gridCols = [];
    const gcRe = /<w:gridCol\s+w:w="(\d+)"/g;
    let gm;
    while ((gm = gcRe.exec(gridMatch[1])) !== null) {
      gridCols.push(parseInt(gm[1], 10));
    }
    const gridSum = gridCols.reduce((a, b) => a + b, 0);
    if (gridSum !== tblW) {
      allOk = false;
      errDetail = `tbl#${tblIdx}: gridSum (${gridSum}) !== tblW (${tblW})`;
      break;
    }

    const trRe = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
    let trM;
    let rowIdx = 0;
    while ((trM = trRe.exec(tblXml)) !== null) {
      rowIdx++;
      const trXml = trM[1];
      const tcRe = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
      let tcM;
      let rowW = 0;
      let colCursor = 0;
      while ((tcM = tcRe.exec(trXml)) !== null) {
        const tcXml = tcM[1];
        const tcWM = tcXml.match(/<w:tcW\s+w:w="(\d+)"\s+w:type="dxa"/);
        const spanM = tcXml.match(/<w:gridSpan\s+w:val="(\d+)"/);
        const span = spanM ? parseInt(spanM[1], 10) : 1;
        const w = tcWM ? parseInt(tcWM[1], 10) : 0;
        rowW += w;
        const expectedColW = gridCols.slice(colCursor, colCursor + span).reduce((a, b) => a + b, 0);
        if (w !== expectedColW) {
          allOk = false;
          errDetail = `tbl#${tblIdx} row#${rowIdx}: cell w (${w}) !== gridCol span (${expectedColW})`;
          break;
        }
        colCursor += span;
      }
      if (!allOk) break;
      if (rowW !== tblW || colCursor !== gridCols.length) {
        allOk = false;
        errDetail = `tbl#${tblIdx} row#${rowIdx}: rowW (${rowW}) vs tblW (${tblW}), cols (${colCursor}/${gridCols.length})`;
        break;
      }
    }
    if (!allOk) break;
  }

  check(`${label}: সব ছকে (table) কলামের প্রস্থের যোগফল === tblW এবং সব সারির গ্রিড অভিন্ন (${tables.length}টি ছক)`, allOk, errDetail);
}

// ============================================================================
// ১. সুইচ বন্ধ (OFF) ও জোরপূর্বক বন্ধ (__FZ_OFF_SERIALFIX) অবস্থায় বাইট-সমতা
// ============================================================================
console.log('১. সুইচ বন্ধ (OFF) অবস্থায় বাইট-প্রতি-বাইট অভিন্নতা যাচাই:');
delete globalThis.__FZ_ON_SERIALFIX;
delete globalThis.__FZ_OFF_SERIALFIX;
if (typeof process !== 'undefined' && process.env) {
  delete process.env.__FZ_ON_SERIALFIX;
  delete process.env.__FZ_OFF_SERIALFIX;
  delete process.env.FZ_ON;
  delete process.env.FZ_OFF;
}

const offResults = {};
for (const [key, fx] of Object.entries(fixtures)) {
  const rOff = runFull(fx.measuresRaw);
  offResults[key] = rOff;

  globalThis.__FZ_ON_SERIALFIX = true;
  globalThis.__FZ_OFF_SERIALFIX = true;
  const rForcedOff = runFull(fx.measuresRaw);
  delete globalThis.__FZ_ON_SERIALFIX;
  delete globalThis.__FZ_OFF_SERIALFIX;

  check(
    `${key}: সুইচ বন্ধ বনাম জোরপূর্বক বন্ধ (__FZ_OFF_SERIALFIX) অবস্থায় IR ১০০% অভিন্ন`,
    JSON.stringify(rOff.ir) === JSON.stringify(rForcedOff.ir)
  );
  check(
    `${key}: সুইচ বন্ধ বনাম জোরপূর্বক বন্ধ (__FZ_OFF_SERIALFIX) অবস্থায় DOCX XML ১০০% অভিন্ন`,
    rOff.xml === rForcedOff.xml
  );
  if (fx.goldenIr) {
    const goldOffXml = Builder.bodyXml(clone(fx.goldenIr)).xml;
    globalThis.__FZ_ON_SERIALFIX = true;
    globalThis.__FZ_OFF_SERIALFIX = true;
    const goldForcedOffXml = Builder.bodyXml(clone(fx.goldenIr)).xml;
    delete globalThis.__FZ_ON_SERIALFIX;
    delete globalThis.__FZ_OFF_SERIALFIX;
    check(
      `${key}: গোল্ডেন ir.json থেকে তৈরি DOCX XML সুইচ বন্ধ অবস্থায় বাইট-প্রতি-বাইট অভিন্ন`,
      goldOffXml === goldForcedOffXml
    );
  }
}

// ============================================================================
// ২. সুইচ চালু (ON) অবস্থায় ৫টি গোল্ডেন ফাইলের ৮টি লাইনের সংশোধন যাচাই
// ============================================================================
console.log('\n২. সুইচ চালু (globalThis.__FZ_ON_SERIALFIX = true) অবস্থায় ৮টি লাইনের যাচাই:');
globalThis.__FZ_ON_SERIALFIX = true;

const onResults = {};
for (const [key, fx] of Object.entries(fixtures)) {
  onResults[key] = runFull(fx.measuresRaw);
  checkTableInvariants(onResults[key].xml, `${key} (SERIALFIX ON)`);

  // কোনো ছক ভেঙে ২টি হয়নি এবং নতুন কোনো <w:shd> যুক্ত হয়নি
  const tblCountOff = (offResults[key].xml.match(/<w:tbl\b/g) || []).length;
  const tblCountOn = (onResults[key].xml.match(/<w:tbl\b/g) || []).length;
  const shdCountOff = (offResults[key].xml.match(/<w:shd\b/g) || []).length;
  const shdCountOn = (onResults[key].xml.match(/<w:shd\b/g) || []).length;
  check(
    `${key}: ছকের সংখ্যা (${tblCountOn}) ও শেডিং সংখ্যা (${shdCountOn}) অপরিবর্তিত`,
    tblCountOff === tblCountOn && shdCountOff === shdCountOn
  );
}

// --- ক) a08 (পাতা ১: y=160, 184, 209 — ৩টি লাইন) ---
const a08ItemsOn = flatPageItems(onResults.a08.ir.pages[0]);
const a08SerialItems = a08ItemsOn.filter((it) => it._noSerialHang === true);
check(
  'a08-১: পাতা ১-এর ৩টি এক-খণ্ডের সংক্ষিপ্ত ক্রমিক আইটেমে (y=160, 184, 209) _noSerialHang === true এবং tabStops=[1] (20 dxa) নির্ধারিত হয়েছে',
  a08SerialItems.length === 3 && a08SerialItems.every((it) => Array.isArray(it.tabStops) && it.tabStops[0] === 1)
);
check(
  'a08-২: DOCX XML-এ ৩টি সংক্ষিপ্ত ক্রমিক আইটেমে <w:tabs><w:tab w:val="left" w:pos="20"/></w:tabs> রেন্ডার হয়েছে',
  (onResults.a08.xml.match(/<w:tabs><w:tab w:val="left" w:pos="20"\/><\/w:tabs>/g) || []).length === 3
);
if (SH) {
  check(
    'a08-৩: SERIALHANG পোস্ট-প্রসেসরে সুইচ বন্ধে ৩টি লাইনে ট্যাব বসত, সুইচ চালুতে ০টি লাইনে ট্যাব বসে (dx1: 12,11,10 -> 0)',
    offResults.a08.shChanged === 3 && onResults.a08.shChanged === 0 && !onResults.a08.shXml.includes('w:hanging="450"')
  );
}

// --- খ) a13 (পাতা ১: y=493 — ১টি লাইন) ---
const a13ItemsOn = flatPageItems(onResults.a13.ir.pages[0]);
const a13Y493 = a13ItemsOn.find((it) => it.rect && Math.abs(it.rect.y - 492) < 3);
check(
  'a13-১: পাতা ১-এর y=493 ক্রমিক আইটেমে (indentPt=0.5) _noSerialHang === true এবং tabStops=[1.5] (30 dxa) নির্ধারিত হয়েছে',
  !!a13Y493 && a13Y493._noSerialHang === true && Array.isArray(a13Y493.tabStops) && a13Y493.tabStops[0] === 1.5
);
check(
  'a13-২: DOCX XML-এ y=493 আইটেমে <w:tabs><w:tab w:val="left" w:pos="30"/></w:tabs> রেন্ডার হয়েছে',
  onResults.a13.xml.includes('<w:tabs><w:tab w:val="left" w:pos="30"/></w:tabs>')
);
if (SH) {
  check(
    'a13-৩: SERIALHANG পোস্ট-প্রসেসরে y=493 লাইনটি ট্যাব-প্রসারণ থেকে সুরক্ষিত থাকে (dx1: 11 -> 0)',
    onResults.a13.shChanged === offResults.a13.shChanged - 1
  );
}

// --- গ) a03 (পাতা ২: y=729 — ১টি লাইন) ---
const a03P2ItemsOn = flatPageItems(onResults.a03.ir.pages[1]);
const a03SplitTbl = a03P2ItemsOn.find((it) => it.kind === 'table' && Array.isArray(it.splitBoxCols));
check(
  'a03-১: পাতা ২-এর y=729 দ্বি-বাক্স ছকের উচ্চতা 56.5pt ও rowHeightsPt=[56.5] সংরক্ষিত হয়েছে',
  !!a03SplitTbl && a03SplitTbl.heightPt === 56.5 && a03SplitTbl.rowHeightsPt[0] === 56.5
);
check(
  'a03-২: DOCX XML-এ দ্বি-বাক্স ছকের প্রস্থ স্ফীত 10368 dxa (518.4pt) থেকে প্রকৃত 10113 dxa (505.65pt)-এ সংশোধিত হয়েছে (dx1: 8 -> 0)',
  offResults.a03.xml.includes('<w:tblW w:w="10368" w:type="dxa"/>') &&
    onResults.a03.xml.includes('<w:tblW w:w="10113" w:type="dxa"/>')
);
check(
  'a03-৩: DOCX XML-এ বর্ডারলেস দ্বি-বাক্স ছকে cellMarTw (108 dxa) যুক্ত হয়ে <w:tblInd w:w="348" w:type="dxa"/> হয়েছে (dx0: -6 -> 0)',
  offResults.a03.xml.includes('<w:tblW w:w="10368" w:type="dxa"/><w:tblInd w:w="240" w:type="dxa"/>') &&
    onResults.a03.xml.includes('<w:tblW w:w="10113" w:type="dxa"/><w:tblInd w:w="348" w:type="dxa"/>')
);

// --- ঘ) a16 (পাতা ১: y=199 ও y=705 — ২টি লাইন) ---
const a16P1Off = offResults.a16.ir.pages[0];
const a16P1On = onResults.a16.ir.pages[0];
const a16FooterOff = flatPageItems(a16P1Off).find((it) => it.kind === 'para' && it.type === 'footer' && it.fontPt === 7);
const a16FooterOn = flatPageItems(a16P1On).find((it) => it.kind === 'para' && it.type === 'footer' && it.fontPt === 7);
check(
  'a16-১: পাতা ১-এর y=705 অ-ইটালিক ৭pt ফুটারের charSpacingPt +0.1pt থেকে -0.05pt (<w:spacing w:val="-1"/>) হয়েছে (dx1: 9 -> 0)',
  !!a16FooterOff && a16FooterOff.charSpacingPt === 0.1 &&
    !!a16FooterOn && a16FooterOn.charSpacingPt === -0.05 &&
    onResults.a16.xml.includes('<w:spacing w:val="-1"/>')
);
const a16Ovs = a16P1On._a16Fix5Overlays || [];
check(
  'a16-২: পাতা ১-এর y=195.8 (h=2.0) ও y=199.2 (h=6.6) দ্বৈত খাড়া রেখা-খণ্ড সংরক্ষিত হয়েছে এবং y=287.2 বিচ্ছিন্ন খণ্ড বাদ গেছে (y=199 dx1: 436 -> 0)',
  a16Ovs.some((o) => Math.abs(o.y - 195.8) < 0.1 && Math.abs(o.h - 2.0) < 0.1) &&
    a16Ovs.some((o) => Math.abs(o.y - 199.2) < 0.1 && Math.abs(o.h - 6.6) < 0.1) &&
    !a16Ovs.some((o) => Math.abs(o.y - 287.2) < 0.5)
);

// --- ঙ) a14 (পাতা ১: y=824 — ১টি লাইন) ---
const a14P1On = onResults.a14.ir.pages[0];
const a14ItemsOn = flatPageItems(a14P1On);
const a14LeftPara = a14ItemsOn.find((it) => it.kind === 'para' && it.rect && Math.abs(it.rect.y - 713.5) < 2);
const a14RightFig = a14ItemsOn.find((it) => it.kind === 'figure' && it.rect && Math.abs(it.rect.y - 702.5) < 2);
const a14Ovs = a14P1On._a16Fix5Overlays || [];
check(
  'a14-১: পাতা ১-এর বাম কলামের ৩-লাইন প্রাপক ব্লকের lineSpacingPt = 16.5pt এবং নিচের স্বাক্ষর-চিত্রের heightPt = 44.5pt নির্ধারিত হয়েছে',
  !!a14LeftPara && a14LeftPara.lineSpacingPt === 16.5 && !!a14RightFig && a14RightFig.heightPt === 44.5
);
check(
  'a14-২: পাতা ১-এর সিগনেচার রো-ব্রিজ (y=743.5) ও নিম্ন-বাম মার্জিন দাগ (y=823.3, w=94) সংরক্ষিত হয়েছে (dx1: 136 -> 0, dy: -37 -> 0)',
  a14Ovs.some((o) => Math.abs(o.y - 743.5) < 0.5 && Math.abs(o.w - 2.0) < 0.5) &&
    a14Ovs.some((o) => o.y >= 815 && Math.abs(o.w - 94.0) < 0.5)
);

// ============================================================================
// ৩. প্রভাবহীন ফাইল, সিন্থেটিক ফিক্সচার ও রিস্টোর (Restore) যাচাই
// ============================================================================
console.log('\n৩. প্রভাবহীন ফাইল ও সিন্থেটিক ফিক্সচারে শূন্য-প্রভাব (No Misfire) যাচাই:');
for (const uKey of ['a01', 'a07']) {
  if (offResults[uKey] && onResults[uKey]) {
    check(
      `${uKey}: প্রভাবহীন ফাইলে সুইচ চালু থাকলেও IR ও DOCX XML ১০০% অপরিবর্তিত থাকে`,
      JSON.stringify(offResults[uKey].ir) === JSON.stringify(onResults[uKey].ir) &&
        offResults[uKey].xml === onResults[uKey].xml
    );
  }
}

// সিন্থেটিক ফিক্সচার: প্রশস্ত অনুচ্ছেদ (rect.w > 0.25 * widthPt) এবং ইটালিক ৭pt ফুটার থাকলে কোনো পরিবর্তন করবে না
const wideMockPage = {
  page: 1,
  widthPt: 595.2,
  heightPt: 841.9,
  bodyFontPt: 11,
  margins: { top: 54, left: 72, right: 54, bottom: 54 },
  bands: [
    {
      kind: 'flow',
      y0: 120,
      y1: 134,
      cells: [{
        x0: 72,
        x1: 540,
        items: [{
          kind: 'para',
          type: 'list_item',
          text: '১. এটি একটি দীর্ঘ ও প্রশস্ত অনুচ্ছেদ যার প্রস্থ পৃষ্ঠার ২৫ শতাংশের বেশি',
          lines: ['১. এটি একটি দীর্ঘ ও প্রশস্ত অনুচ্ছেদ যার প্রস্থ পৃষ্ঠার ২৫ শতাংশের বেশি'],
          align: 'l',
          fontPt: 11,
          indentPt: 0,
          firstIndentPt: 0,
          rect: { x: 72, y: 120, w: 320, h: 12 }
        }]
      }]
    },
    {
      kind: 'flow',
      y0: 705,
      y1: 712,
      cells: [{
        x0: 72,
        x1: 540,
        items: [{
          kind: 'para',
          type: 'footer',
          text: 'Italic 7pt footer line that should keep its original spacing',
          lines: ['Italic 7pt footer line that should keep its original spacing'],
          align: 'l',
          fontPt: 7,
          italic: true,
          charSpacingPt: 0.1,
          rect: { x: 127, y: 705, w: 167, h: 6.2 }
        }]
      }]
    }
  ]
};
const wideSnapBefore = JSON.stringify(wideMockPage);
IR.repairSerialFixPage(wideMockPage, {});
check(
  'সিন্থেটিক-১: প্রশস্ত অনুচ্ছেদ (rect.w > 0.25 * widthPt) ও ইটালিক ৭pt ফুটারে repairSerialFixPage কোনো পরিবর্তন করে না',
  JSON.stringify(wideMockPage) === wideSnapBefore && !wideMockPage._serialFixRepaired
);

// সুইচ চালু করে repair করার পর সুইচ বন্ধ করে restoreSerialFixIr কল করলে আদি অবস্থা ফিরে আসে
const a08IrCopy = clone(fixtures.a08.goldenIr);
IR.repairSerialFixIr(a08IrCopy, fixtures.a08.measuresRaw.pageInfo);
const wasRepaired = !!a08IrCopy.pages[0]._serialFixRepaired;
delete globalThis.__FZ_ON_SERIALFIX;
IR.repairSerialFixIr(a08IrCopy, fixtures.a08.measuresRaw.pageInfo);
check(
  'রিস্টোর-১: সুইচ বন্ধ করে পুনরায় চালালে _preSerialFixSnap থেকে পৃষ্ঠার আদি অবস্থা হুবহু পুনরুদ্ধার হয়',
  wasRepaired && !a08IrCopy.pages[0]._serialFixRepaired && JSON.stringify(a08IrCopy) === JSON.stringify(fixtures.a08.goldenIr)
);

// পরিবেশ-চলক (process.env.FZ_ON = 'SERIALFIX') দিয়ে সুইচ সক্রিয়তা যাচাই
process.env.FZ_ON = 'SERIALFIX';
check(
  'পরিবেশ-চলক: process.env.FZ_ON="SERIALFIX" থাকলে IR.serialFixOn(), LF.isSerialFixOn(), Builder.serialFixOn() সক্রিয় হয়',
  IR.serialFixOn() === true && LF.isSerialFixOn() === true && Builder.serialFixOn() === true
);
process.env.FZ_OFF = 'SERIALFIX';
check(
  'পরিবেশ-চলক: process.env.FZ_OFF="SERIALFIX" থাকলে সুইচ তাৎক্ষণিক নিষ্ক্রিয় হয়',
  IR.serialFixOn() === false && LF.isSerialFixOn() === false && Builder.serialFixOn() === false
);
delete process.env.FZ_ON;
delete process.env.FZ_OFF;

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
