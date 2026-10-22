import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// প্রোডাকশনের ভিত্তি-সুইচগুলো নাম ধরে চালু করা (switch-defaults.js require না করে)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT',
  'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4',
  'RULES2', 'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX', 'A02FIX',
  'A06FIX', 'A07FIX6', 'F1FIX', 'A18FIX', 'A08FIX', 'A16FIX6', 'F1FIX2',
  'INDENTFIX', 'VGAPFIX', 'SERIALFIX', 'MISSINGFIX', 'SHORTFIX', 'RULESFIX'
];

function enableBaseSwitches() {
  for (const sw of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + sw] = true;
    delete globalThis['__FZ_OFF_' + sw];
  }
}

enableBaseSwitches();

const IR = require(path.join(rootDir, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(rootDir, 'js/layout-engine/faithful/line-fit.js'));
const DB = require(path.join(rootDir, 'js/layout-engine/faithful/faithful-docx-builder.js'));

globalThis.FayzarLayoutIR = IR;
globalThis.FayzarLineFit = LF;
globalThis.FayzarDocxBuilder = DB;

function loadRunJson(docId, fileName) {
  const p = path.join(rootDir, 'qa/golden-data/runs/LINEWIDTHFIX', docId, fileName);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/**
 * DOCX XML-এর প্রতিটি <w:tbl>-এর কলাম-গ্রিড ও সারিগুলোর প্রস্থ-যোগফল যাচাই:
 * ১) প্রতিটি সারিতে ঘরের প্রস্থের যোগফল (<w:tcW>) = টেবিলের মোট প্রস্থ (<w:tblW>)
 * ২) সব সারিতে কলাম-সীমা একই <w:tblGrid>-এর গ্রিড-কলাম সীমানার সাথে মিলে যায়
 */
function verifyAllTablesGridAndWidths(xml, label) {
  const topTables = [];
  let rem = String(xml || '');
  const leafRe = /<w:tbl>((?:(?!<w:tbl>)[\s\S])*?)<\/w:tbl>/;
  while (leafRe.test(rem)) {
    rem = rem.replace(leafRe, (_, inner) => {
      topTables.push(inner);
      return '';
    });
  }
  assert.ok(topTables.length > 0, `${label}: অন্তত একটি <w:tbl> থাকতে হবে`);
  for (let ti = 0; ti < topTables.length; ti++) {
    const topTblXml = topTables[ti];
    const tblWM = /<w:tblW\s+w:w="(\d+)"/.exec(topTblXml);
    const gridCols = [...topTblXml.matchAll(/<w:gridCol\s+w:w="(\d+)"\/>/g)].map((m) => Number(m[1]));
    if (!tblWM || gridCols.length === 0) continue;
    const tblW = Number(tblWM[1]);
    const gridSum = gridCols.reduce((a, b) => a + b, 0);
    assert.equal(gridSum, tblW, `${label} টেবিল #${ti + 1}: gridCol যোগফল (${gridSum}) != tblW (${tblW})`);

    const gridBounds = new Set([0]);
    let accG = 0;
    for (const gw of gridCols) {
      accG += gw;
      gridBounds.add(accG);
    }

    const trMatches = [...topTblXml.matchAll(/<w:tr>([\s\S]*?)<\/w:tr>/g)];
    for (let ri = 0; ri < trMatches.length; ri++) {
      const trXml = trMatches[ri][1];
      const tcMatches = [...trXml.matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)];
      let rowW = 0;
      let colSpanSum = 0;
      for (const tcM of tcMatches) {
        const tcXml = tcM[1];
        const tcWM = /<w:tcW\s+w:w="(\d+)"/.exec(tcXml);
        assert.ok(tcWM, `${label} টেবিল #${ti + 1} সারি #${ri + 1}: <w:tcW> অনুপস্থিত`);
        const w = Number(tcWM[1]);
        rowW += w;
        assert.ok(gridBounds.has(rowW), `${label} টেবিল #${ti + 1} সারি #${ri + 1}: কলাম-সীমা ${rowW} গ্রিডে নেই`);
        const gsM = /<w:gridSpan\s+w:val="(\d+)"\/>/.exec(tcXml);
        colSpanSum += gsM ? Number(gsM[1]) : 1;
      }
      assert.equal(rowW, tblW, `${label} টেবিল #${ti + 1} সারি #${ri + 1}: ঘরের প্রস্থের যোগফল (${rowW}) != টেবিলের প্রস্থ (${tblW})`);
      assert.equal(colSpanSum, gridCols.length, `${label} টেবিল #${ti + 1} সারি #${ri + 1}: মোট কলাম-স্প্যান (${colSpanSum}) != গ্রিড কলাম (${gridCols.length})`);
    }
  }
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    enableBaseSwitches();
    delete globalThis.__FZ_ON_LINEWIDTHFIX;
    delete globalThis.__FZ_OFF_LINEWIDTHFIX;
    fn();
    passed++;
  } catch (err) {
    failed++;
    console.error(`❌ ব্যর্থ: ${name}\n`, err);
  }
}

// টেস্ট ১: সুইচ নিয়ন্ত্রণ (__FZ_ON_LINEWIDTHFIX ও __FZ_OFF_LINEWIDTHFIX)
test('১. LINEWIDTHFIX সুইচ চালু/বন্ধ ও অগ্রাধিকার যাচাই', () => {
  assert.equal(IR.lineWidthFixOn(), false);
  assert.equal(LF.isLineWidthFixOn(), false);
  assert.equal(DB.lineWidthFixOn(), false);

  globalThis.__FZ_ON_LINEWIDTHFIX = true;
  assert.equal(IR.lineWidthFixOn(), true);
  assert.equal(LF.isLineWidthFixOn(), true);
  assert.equal(DB.lineWidthFixOn(), true);

  globalThis.__FZ_OFF_LINEWIDTHFIX = true;
  assert.equal(IR.lineWidthFixOn(), false);
  assert.equal(LF.isLineWidthFixOn(), false);
  assert.equal(DB.lineWidthFixOn(), false);
});

// টেস্ট ২: a14 (পাতা ৩ y=145 ও পাতা ২ y=260) — সুইচ চালু থাকলে প্রত্যাশিত পরিবর্তন এবং বন্ধ থাকলে বাইট-টু-বাইট অভিন্নতা
test('২. a14: পাতা ৩ y=145 সংযুক্ত ২-লাইন তালিকায় keepJust পুনরুদ্ধার ও পাতা ২ y=260 ডট-লিডার সংরক্ষণ', () => {
  globalThis.__FZ_ON_LINEWIDTHFIX = false;
  const irOff = loadRunJson('a14', 'ir.json');
  const xmlOff = DB.bodyXml(irOff).xml;
  const irOffSnap = JSON.stringify(irOff);

  assert.equal(irOff.pages[2].bands[3].cells[0].items[0].keepJust, false);

  // সুইচ চালু থাকলে পাতা ৩-এর ব্যান্ড ৩ (y=145, ৩। শিক্ষাবর্ষের শুরুতে...) keepJust=true (<w:jc w:val="both"/>) হয়
  globalThis.__FZ_ON_LINEWIDTHFIX = true;
  const irOn = loadRunJson('a14', 'ir.json');
  const xmlOn = DB.bodyXml(irOn).xml;

  const p3Item3 = irOn.pages[2].bands[3].cells[0].items[0];
  assert.equal(p3Item3.keepJust, true, 'a14 পাতা ৩ y=145 আইটেমে keepJust=true হতে হবে');
  assert.notEqual(xmlOn, xmlOff, 'সুইচ চালু থাকলে a14 XML-এ প্রত্যাশিত পরিবর্তন থাকতে হবে');

  // পাতা ২ y=260 ডট-লিডার লাইনে পূর্ণ প্রস্থের ট্যাব-স্টপ (lpos = 472.62pt => 9452 dxa) অক্ষুণ্ণ থাকে এবং শিরোনাম-বক্স সরে না
  assert.ok(xmlOn.includes('<w:tab w:val="right" w:leader="dot" w:pos="9452"/>'), 'a14 পাতা ২ y=260 ডট-লিডার পূর্ণ প্রস্থে (9452 dxa) থাকতে হবে');
  const expectedXmlOn = xmlOff.replace(
    '<w:ind w:left="844" w:right="360" w:hanging="422"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SutonnyOMJ" w:hAnsi="SutonnyOMJ" w:cs="SutonnyOMJ"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">৩। শিক্ষাবর্ষের শুরুতে',
    '<w:ind w:left="844" w:right="360" w:hanging="422"/><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SutonnyOMJ" w:hAnsi="SutonnyOMJ" w:cs="SutonnyOMJ"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">৩। শিক্ষাবর্ষের শুরুতে'
  );
  assert.equal(xmlOn, expectedXmlOn, 'a14 পাতা ১ ও ২-এ কোনো পার্শ্বপ্রতিক্রিয়া ছাড়াই কেবল পাতা ৩ y=145 উভয়-প্রান্ত সমান (both) হবে');

  // টেবিলের গ্রিড ও প্রস্থ যাচাই
  verifyAllTablesGridAndWidths(xmlOn, 'a14');

  // সুইচ পুনরায় বন্ধ করলে IR ও XML বাইট-টু-বাইট পূর্বাবস্থায় ফেরে
  globalThis.__FZ_ON_LINEWIDTHFIX = false;
  const xmlRestored = DB.bodyXml(irOn).xml;
  assert.equal(xmlRestored, xmlOff, 'সুইচ বন্ধ করলে a14 XML বাইট-টু-বাইট অভিন্ন হতে হবে');
  assert.equal(JSON.stringify(irOn), irOffSnap, 'সুইচ বন্ধ করলে a14 IR বাইট-টু-বাইট অভিন্ন হতে হবে');
});

// টেস্ট ৩: a18 — ২৮×৪ ফরম-ছকের বাইরের বাম ও ডান খাড়া বর্ডার সংরক্ষণ ও ৪টি ক্ষতিগ্রস্ত সারি (y=70, 103, 120, 282) রক্ষা
test('৩. a18: ২৮×৪ ছকের বাইরের বর্ডার সংরক্ষণ, একক <w:tbl> ও কলাম-গ্রিড যাচাই', () => {
  globalThis.__FZ_ON_LINEWIDTHFIX = false;
  const irOff = loadRunJson('a18', 'ir.json');
  const xmlOff = DB.bodyXml(irOff).xml;
  const irOffSnap = JSON.stringify(irOff);

  globalThis.__FZ_ON_LINEWIDTHFIX = true;
  const irOn = loadRunJson('a18', 'ir.json');
  const xmlOn = DB.bodyXml(irOn).xml;

  // a18-এর মূল ছকে বাম ও ডান বাইরের বর্ডার single থাকবে (nil নয়)
  assert.ok(xmlOn.includes('<w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>'), 'a18 ছকে বাম বর্ডার থাকতে হবে');
  assert.ok(xmlOn.includes('<w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>'), 'a18 ছকে ডান বর্ডার থাকতে হবে');
  assert.equal(xmlOn, xmlOff, 'a18-এ সুইচ চালু থাকলেও কোনো রিগ্রেশন হবে না');
  assert.equal(JSON.stringify(irOn), irOffSnap);

  // টেবিল কখনো ভাঙবে না এবং প্রতি সারিতে ঘরের প্রস্থের যোগফল = টেবিলের প্রস্থ
  verifyAllTablesGridAndWidths(xmlOn, 'a18');
});

// টেস্ট ৪: a13 ও a06 — ২১টি ডট-লিডার লাইনে (a13-এ ১১টি, a06-এ ১০টি) পূর্ণ প্রস্থ ও বোল্ড লেবেল সংরক্ষণ
test('৪. a13 ও a06: ডট-লিডার ট্যাব-স্টপ সংকোচন রোধ ও বাইট-টু-বাইট সংরক্ষণ', () => {
  for (const docId of ['a13', 'a06']) {
    globalThis.__FZ_ON_LINEWIDTHFIX = false;
    const irOff = loadRunJson(docId, 'ir.json');
    const xmlOff = DB.bodyXml(irOff).xml;
    const irOffSnap = JSON.stringify(irOff);

    globalThis.__FZ_ON_LINEWIDTHFIX = true;
    const irOn = loadRunJson(docId, 'ir.json');
    const xmlOn = DB.bodyXml(irOn).xml;

    assert.equal(xmlOn, xmlOff, `${docId}: ডট-লিডার লাইনে কোনো সংকোচন বা রিগ্রেশন হবে না`);
    assert.equal(JSON.stringify(irOn), irOffSnap, `${docId}: IR অপরিবর্তিত থাকবে`);
    assert.ok(!xmlOn.includes('<w:tab/></w:r><w:r><w:rPr><w:rFonts w:ascii="SutonnyOMJ" w:hAnsi="SutonnyOMJ" w:cs="SutonnyOMJ"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve"> .</w:t>'), `${docId}: ডট-লিডার শেষে ভ্রান্ত যতিচিহ্ন রান থাকবে না`);
  }
});

// টেস্ট ৫: স্কেলকৃত ফরম-ছক (scale < 0.85, যেমন a19/a17) — উন্মুক্ত-পাশের ক্রমিক ছক একক <w:tbl>-এ একীভূতকরণ ও সুইচ বন্ধে অভিন্নতা
test('৫. স্কেলকৃত ফরম পাতা (scale < 0.85): বিভক্ত বর্ডারলেস সারি একক <w:tbl>-এ সংযোজন ও সুইচ বন্ধে অভিন্নতা', () => {
  const makeScaledPageIr = () => ({
    pages: [{
      page: 1,
      widthPt: 595.3,
      heightPt: 841.9,
      scale: 0.72,
      bodyFontPt: 11,
      margins: { top: 36, right: 36, bottom: 36, left: 36 },
      boxes: [],
      bands: [
        {
          kind: 'flow',
          y0: 100,
          y1: 310,
          gapBeforePt: 10,
          cells: [{
            x0: 36,
            x1: 559.3,
            items: [{
              kind: 'table',
              borderless: false,
              widthPt: 520,
              heightPt: 210,
              fontPt: 12.5,
              rect: { x: 36, y: 100, w: 520, h: 210 },
              colFractions: [0.08, 0.42, 0.50],
              fullVRule: [false, true],
              srcRulesPt: [135, 170, 205, 240, 275, 310],
              rowHeightsPt: [35, 35, 35, 35, 35, 35],
              rows: [
                ['১।', 'প্রতিষ্ঠানের নাম', '....................................'],
                ['২।', 'কেন্দ্রের নাম', '১\n২\n৩\n৪'],
                ['৩।', 'উপজেলা', ''],
                ['৪।', 'জেলা', ''],
                ['৫।', 'মোট পরীক্ষার্থী', ''],
                ['৬।', 'উপস্থিত পরীক্ষার্থী', '']
              ]
            }]
          }]
        },
        {
          kind: 'flow',
          y0: 315,
          y1: 330,
          gapBeforePt: 5,
          cells: [{
            x0: 36,
            x1: 559.3,
            items: [{
              kind: 'table',
              borderless: true,
              splitPart: 0,
              box: [100, 315, 500, 345],
              widthPt: 520,
              heightPt: 15,
              fontPt: 11,
              rect: { x: 36, y: 315, w: 520, h: 15 },
              colFractions: [0.08, 0.92],
              rows: [['১০।', 'কেন্দ্র সচিবের নাম ও স্বাক্ষর :']]
            }]
          }]
        },
        {
          kind: 'flow',
          y0: 331,
          y1: 345,
          gapBeforePt: 1,
          cells: [{
            x0: 36,
            x1: 559.3,
            items: [{
              kind: 'table',
              borderless: true,
              splitPart: 1,
              box: [100, 315, 500, 345],
              widthPt: 520,
              heightPt: 14,
              fontPt: 11,
              rect: { x: 36, y: 331, w: 520, h: 14 },
              colFractions: [0.08, 0.92],
              rows: [['', 'সিলমোহর :']]
            }]
          }]
        }
      ]
    }]
  });

  globalThis.__FZ_ON_LINEWIDTHFIX = false;
  const irOff = makeScaledPageIr();
  const xmlOff = DB.bodyXml(irOff).xml;
  const snapOff = JSON.stringify(irOff);

  globalThis.__FZ_ON_LINEWIDTHFIX = true;
  const irOn = makeScaledPageIr();
  const xmlOn = DB.bodyXml(irOn).xml;

  assert.equal(irOn.pages[0].bands.length, 1, 'বিভক্ত ছক মূল ছকে একীভূত হয়ে ১টি ব্যান্ড থাকতে হবে');
  assert.equal(irOn.pages[0].bands[0].cells[0].items[0].rows.length, 7, 'মূল ছকে ৭টি সারি থাকতে হবে');
  assert.notEqual(xmlOn, xmlOff);
  verifyAllTablesGridAndWidths(xmlOn, 'scaled-form');

  globalThis.__FZ_ON_LINEWIDTHFIX = false;
  const xmlRestored = DB.bodyXml(irOn).xml;
  assert.equal(xmlRestored, xmlOff, 'সুইচ বন্ধ করলে স্কেলকৃত পাতার XML বাইট-টু-বাইট পূর্বাবস্থায় ফিরতে হবে');
  assert.equal(JSON.stringify(irOn), snapOff, 'সুইচ বন্ধ করলে স্কেলকৃত পাতার IR বাইট-টু-বাইট পূর্বাবস্থায় ফিরতে হবে');
});

// টেস্ট ৬: ফ্রেমযুক্ত পাতা (যেমন a02) — সুইচ চালু থাকলেও line-fit ও পাশাপাশি টেবিলের ফাঁক সম্পূর্ণ অপরিবর্তিত থাকে
test('৬. ফ্রেমযুক্ত পাতা (a02 নিয়ন্ত্রণ): সুইচ চালু থাকলেও IR ও DOCX XML বাইট-টু-বাইট অপরিবর্তিত', () => {
  const makeFramedPageIr = () => ({
    pages: [{
      page: 1,
      widthPt: 595.3,
      heightPt: 841.9,
      scale: 1,
      bodyFontPt: 11,
      frame: { style: 'double', spacePt: { top: 12, right: 12, bottom: 12, left: 12 } },
      margins: { top: 42, right: 42, bottom: 42, left: 42 },
      boxes: [],
      bands: [
        {
          kind: 'flow',
          y0: 60,
          y1: 72,
          gapBeforePt: 18,
          cells: [{
            x0: 42,
            x1: 553.3,
            items: [{
              kind: 'para',
              type: 'list_item',
              rect: { x: 78, y: 60, w: 460, h: 12 },
              fontPt: 11,
              indentPt: 36,
              firstIndentPt: 0,
              tabStops: [160, 168],
              tabLines: ['(ক) প্রার্থীর নাম\t:\t........................................................................'],
              lines: ['(ক) প্রার্থীর নাম : ........................................................................'],
              text: '(ক) প্রার্থীর নাম : ........................................................................'
            }]
          }]
        },
        {
          kind: 'flow',
          y0: 90,
          y1: 150,
          gapBeforePt: 18,
          cells: [{
            x0: 42,
            x1: 553.3,
            items: [{
              kind: 'table',
              borderless: false,
              widthPt: 500,
              heightPt: 60,
              fontPt: 11,
              rect: { x: 42, y: 90, w: 500, h: 60 },
              colFractions: [0.3, 0.7],
              rows: [['ক্রমিক', 'বিবরণ'], ['১', '..................................................']]
            }]
          }]
        }
      ]
    }]
  });

  globalThis.__FZ_ON_LINEWIDTHFIX = false;
  const irOff = makeFramedPageIr();
  LF.fitItem(irOff.pages[0].bands[0].cells[0].items[0], 511.3);
  const xmlOff = DB.bodyXml(irOff).xml;

  globalThis.__FZ_ON_LINEWIDTHFIX = true;
  const irOn = makeFramedPageIr();
  LF.fitItem(irOn.pages[0].bands[0].cells[0].items[0], 511.3);
  const xmlOn = DB.bodyXml(irOn).xml;

  assert.equal(xmlOn, xmlOff, 'ফ্রেমযুক্ত পাতায় LINEWIDTHFIX চালু থাকলেও XML বাইট-টু-বাইট অভিন্ন থাকতে হবে');
  assert.equal(JSON.stringify(irOn), JSON.stringify(irOff), 'ফ্রেমযুক্ত পাতায় LINEWIDTHFIX চালু থাকলেও IR বাইট-টু-বাইট অভিন্ন থাকতে হবে');
  verifyAllTablesGridAndWidths(xmlOn, 'framed-a02');
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
