/**
 * A03_SCORE_v3 (A03FIX3) — ইউনিট টেস্ট স্যুট
 * চালু: globalThis.__FZ_ON_A03FIX3 = true (বা FZ_ON=A03FIX3)
 * বন্ধ: globalThis.__FZ_OFF_A03FIX3 = true (বা FZ_OFF=A03FIX3)
 * শূন্য বাহ্যিক নির্ভরতা (শুধু Node বিল্ট-ইন মডিউল ব্যবহৃত)।
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ডিফল্ট ১৮টি সুইচ সরাসরি নামের মাধ্যমে পিন করা (switch-defaults.js ইমপোর্ট না করে)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE',
  'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3',
  'A14RULES', 'A14FIX4', 'RULES2', 'A13FIX', 'A16FIX5', 'A14FIX5'
];

function resetBaseSwitches() {
  for (const k of Object.keys(globalThis)) {
    if (k.startsWith('__FZ_ON_') || k.startsWith('__FZ_OFF_')) {
      delete globalThis[k];
    }
  }
  for (const sw of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + sw] = true;
  }
}

resetBaseSwitches();

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const B = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const irJsonPath = path.join(ROOT, 'qa/golden-data/runs/DEF18/a03/ir.json');
const measuresPath = path.join(ROOT, 'qa/golden-data/runs/DEF18/a03/measures.json');
const rawIrJson = JSON.parse(fs.readFileSync(irJsonPath, 'utf8'));
const rawMeasures = JSON.parse(fs.readFileSync(measuresPath, 'utf8'));

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

function getAllItems(page) {
  const out = [];
  for (const b of (page && page.bands) || []) {
    if (b.item) out.push(b.item);
    for (const it of b.items || []) out.push(it);
    for (const c of b.cells || []) {
      for (const it of c.items || []) out.push(it);
    }
  }
  return out;
}

function parseXmlTables(xml) {
  const tables = [];
  const openTag = '<w:tbl>';
  const closeTag = '</w:tbl>';
  const stack = [];
  let idx = 0;
  while (idx < xml.length) {
    const nextOpen = xml.indexOf(openTag, idx);
    const nextClose = xml.indexOf(closeTag, idx);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      stack.push(nextOpen);
      idx = nextOpen + openTag.length;
    } else {
      const start = stack.pop();
      const end = nextClose + closeTag.length;
      if (start !== undefined) {
        tables.push(xml.slice(start, end));
      }
      idx = end;
    }
  }
  return tables;
}

function stripNestedTables(tblXml) {
  const inner = tblXml.slice('<w:tbl>'.length, tblXml.length - '</w:tbl>'.length);
  let out = '';
  let depth = 0;
  let idx = 0;
  while (idx < inner.length) {
    const nextOpen = inner.indexOf('<w:tbl>', idx);
    const nextClose = inner.indexOf('</w:tbl>', idx);
    if (depth === 0) {
      if (nextOpen === -1) {
        out += inner.slice(idx);
        break;
      }
      out += inner.slice(idx, nextOpen);
      depth = 1;
      idx = nextOpen + '<w:tbl>'.length;
    } else {
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        idx = nextOpen + '<w:tbl>'.length;
      } else {
        depth--;
        idx = nextClose + '</w:tbl>'.length;
      }
    }
  }
  return '<w:tbl>' + out + '</w:tbl>';
}

// ১. সুইচ এপিআই ও টগল যাচাই
resetBaseSwitches();
check('১. ডিফল্ট অবস্থায় A03FIX3 বন্ধ থাকে', IR.a03Fix3On() === false && LF.isA03Fix3On() === false && B.a03Fix3On() === false);

globalThis.__FZ_ON_A03FIX3 = true;
check('২. __FZ_ON_A03FIX3 = true দিলে সুইচ চালু হয়', IR.a03Fix3On() === true && LF.isA03Fix3On() === true && B.a03Fix3On() === true);

globalThis.__FZ_OFF_A03FIX3 = true;
check('৩. __FZ_OFF_A03FIX3 = true দিলে সুইচ বন্ধ হয়', IR.a03Fix3On() === false && LF.isA03Fix3On() === false && B.a03Fix3On() === false);

// ২. সুইচ বন্ধ অবস্থায় পূর্বের কোডের সাথে বাইট-ফর-বাইট অভিন্নতা ও রেস্টোরেশন যাচাই
resetBaseSwitches();
const irOff1 = JSON.parse(JSON.stringify(rawIrJson));
LF.fit(irOff1);
const xmlOffFromIr = B.bodyXml(irOff1).xml;

const irBuiltOff = IR.build(JSON.parse(JSON.stringify(rawMeasures)));
LF.fit(irBuiltOff);
const xmlOffFromMeasures = B.bodyXml(irBuiltOff).xml;

const irToggle = JSON.parse(JSON.stringify(rawIrJson));
globalThis.__FZ_ON_A03FIX3 = true;
LF.fit(irToggle);
const xmlOnFromIr = B.bodyXml(irToggle).xml;

delete globalThis.__FZ_ON_A03FIX3;
globalThis.__FZ_OFF_A03FIX3 = true;
LF.fit(irToggle);
const xmlRestoredFromIr = B.bodyXml(irToggle).xml;

check('৪. A03FIX3 চালু ও বন্ধ আউটপুট ভিন্ন (ফিক্স সক্রিয় হয়েছে)', xmlOnFromIr !== xmlOffFromIr);
check('৫. A03FIX3 চালু করার পর পুনরায় বন্ধ করলে (restoreA03Fix3Ir) আউটপুট বাইট-ফর-বাইট অভিন্ন', xmlRestoredFromIr === xmlOffFromIr);

// ৩. A03FIX3 চালু অবস্থায় IR ও XML বৈশিষ্ট্য যাচাই
resetBaseSwitches();
globalThis.__FZ_ON_A03FIX3 = true;
const irOn = JSON.parse(JSON.stringify(rawIrJson));
LF.fit(irOn);
const xmlOn = B.bodyXml(irOn).xml;

const builtOn = IR.build(JSON.parse(JSON.stringify(rawMeasures)));
LF.fit(builtOn);
const xmlBuiltOn = B.bodyXml(builtOn).xml;

check('৫.১. measures.json থেকে তৈরি IR-এও A03FIX3 চালু ও বন্ধ আউটপুট স্বতন্ত্র', xmlBuiltOn !== xmlOffFromMeasures);

// ৩.১: ৪টি কালো ব্যানারের (B5, B21, B44, B57) বাম ইনডেন্ট ০ এবং সঠিক উচ্চতা ও পজিশন
const p1Items = getAllItems(irOn.pages[0]);
const p2Items = getAllItems(irOn.pages[1]);
const allOnItems = p1Items.concat(p2Items);
const banners = allOnItems.filter((it) => it && it.shade === '000000');

check('৬. উভয় পৃষ্ঠায় মোট ৪টি কালো ব্যানার (shade=000000) অক্ষুণ্ন আছে (টেবিলে রূপান্তর করা হয়নি)', banners.length === 4 && banners.every((b) => b.type !== 'table'));
check('৭. ৪টি কালো ব্যানারের কোনোটিতেই বাম ইনডেন্ট বা centerShiftPt নেই (indentPt=0, centerShiftPt=null)', banners.every((b) => (b.indentPt || 0) === 0 && b.centerShiftPt == null));
check('৮. ৪টি কালো ব্যানারের উচ্চতা ও টেক্সট পজিশনিং (২০.৫pt, ১৮.০pt, ১৭.৫pt, ১৮.০pt) নির্ভুল',
  banners.length === 4 &&
  banners[0].lineSpacingPt === 20.5 && banners[0]._a14PosVal === 6 &&
  banners[1].lineSpacingPt === 18.0 && banners[1]._a14PosVal === 4 &&
  banners[2].lineSpacingPt === 17.5 && banners[2]._a14PosVal === 4 &&
  banners[3].lineSpacingPt === 18.0 && banners[3]._a14PosVal === 5
);
check('৯. XML-এ কালো ব্যানারের অনুচ্ছেদে কোনো <w:ind w:left="250"/> নেই', !/<w:shd w:val="clear" w:color="auto" w:fill="000000"\/>[\s\S]{0,120}<w:ind\b/.test(xmlOn));

// ৩.২: পৃষ্ঠা ১-এর বডি ফন্ট সাইজ (১৩.৫pt থেকে ১২pt) ও সিরিয়াল নম্বর স্পেসিং
const p1SerialItems = p1Items.filter((it) => it && it.kind === 'para' && /^(৪|৫|৬|৭|১০|১১|১৩|১৪)\./.test(String(it.text || '').trim()));
check('১০. পৃষ্ঠা ১-এর সাধারণ এক-লাইনের ক্রমিক আইটেমগুলোর ফন্ট সাইজ ১২pt এবং লাইন স্পেসিং ১৫.৫২৫pt লক করা',
  p1SerialItems.length === 8 && p1SerialItems.every((it) => it.fontPt === 12 && it.lineSpacingPt === 15.525)
);
const singleDigitSerials = p1Items.filter((it) => it && it.kind === 'para' && /^[২৩৪৫৬৭৮]\./.test(String(it.text || '').trim()));
check('১১. পৃষ্ঠা ১-এর এক-অঙ্কের ক্রমিক নম্বরের (২.–৮.) পরে সারিবদ্ধতার জন্য ৩টি স্পেস রয়েছে',
  singleDigitSerials.length === 7 && singleDigitSerials.every((it) => /^[২৩৪৫৬৭৮]\.   \S/.test(String(it.text || '')))
);

// ৩.৩: B18 ("১২. পারিবারিক...") টেবিলের উচ্চতা ১৩.৭৫pt লক করা
const b18 = p1Items.find((it) => it && it.type === 'table' && it.rows && String(it.rows[0]?.[0] || '').includes('১২.'));
check('১২. পৃষ্ঠা ১-এর ১২ নং টেবিলের (B18) উচ্চতা ১৩.৭৫pt exact লক করা',
  Boolean(b18 && Array.isArray(b18.rowHeightsPt) && b18.rowHeightsPt[0] === 13.75 && b18.rowHeightsExact === true)
);

// ৩.৪: চেকবক্স বর্ডার রান (<w:bdr>) ও B46 মাস/বছর বক্স যাচাই
const boxItems = allOnItems.filter((it) => it && it._a03BoxRuns === true);
check('১৩. উভয় পৃষ্ঠার ১১টি চেকবক্স আইটেমে _a03BoxRuns সক্রিয় এবং B25/B26 বাম-সারিবদ্ধ (align=l)',
  boxItems.length === 11 &&
  p1Items.filter((it) => it && it._a03BoxRuns && (String(it.text).includes('স্বামী') || String(it.text).includes('বিধবা'))).every((it) => it.align === 'l' && it.keepJust === false)
);
const b46 = p2Items.find((it) => it && it._a03MonthYearBoxes === true);
check('১৪. পৃষ্ঠা ২-এর B46 ("মাস / বছর") আইটেমে _a03MonthYearBoxes সক্রিয় এবং আন্ডারলাইন ট্যাগ মুক্ত',
  Boolean(b46 && !/<\/?u>/i.test(String(b46.text || '')) && xmlOn.includes('\u00a0'.repeat(22)) && xmlOn.includes('\u00a0'.repeat(8)))
);

// ৩.৫: দিন | মাস | বছর টেবিল (B24 ও B56) — ১টি উৎস টেবিল = ১টি <w:tbl>, gridSpans=[2,0,2,0,4,0,0,0], কোনো nil বর্ডার নেই
const dateTablesIr = allOnItems.filter((it) => it && it.type === 'table' && it.rows && it.rows.length === 2 && String(it.rows[0]?.[0] || '').includes('দিন'));
const dateTablesBuilt = getAllItems(builtOn.pages[0]).concat(getAllItems(builtOn.pages[1])).filter((it) => it && it.type === 'table' && it.rows && it.rows.length === 2 && String(it.rows[0]?.[0] || '').includes('দিন'));
check('১৫. দিন | মাস | বছর টেবিল দুটি (B24 ও B56) ভাঙা হয়নি এবং প্রতিটিতে ৮টি কলাম ও gridSpans=[[2,0,2,0,4,0,0,0],[1..1]] রয়েছে',
  dateTablesIr.length === 2 && dateTablesBuilt.length === 2 &&
  dateTablesIr.concat(dateTablesBuilt).every((t) =>
    t.rows.length === 2 &&
    t.rows[0].length === 8 &&
    JSON.stringify(t.gridSpans[0]) === JSON.stringify([2, 0, 2, 0, 4, 0, 0, 0]) &&
    JSON.stringify(t.gridSpans[1]) === JSON.stringify([1, 1, 1, 1, 1, 1, 1, 1]) &&
    t.vRuleBands.every((rb) => rb.every((v) => v === true))
  )
);

// ৩.৬: পৃষ্ঠা ২-এর খাড়া দাগ (x=303.25pt ও x=269.75pt) এবং B61 স্বাক্ষর বাক্স
const b53 = p2Items.find((it) => it && it.type === 'table' && it.rows && it.rows.length === 3 && String(it.rows[0]?.[0] || '').includes('যদি হিসাব'));
check('১৬. পৃষ্ঠা ২-এর B53 টেবিলের কলাম বিভাজন x=303.25pt (colFractions=[267.75/522.5, 254.75/522.5]) এবং indentPt=0',
  Boolean(b53 && b53.indentPt === 0 && b53.widthPt === 522.5 && Math.abs(b53.colFractions[0] - 267.75 / 522.5) < 1e-6)
);
const fullVRuleBands = irOn.pages[1].bands.filter((b) => b && b._a03FullVRule === true);
check('১৭. পৃষ্ঠা ২-এর ৫টি গ্রিড ব্যান্ডে (Band 0, 1, 2, 11, 13) পূর্ণ খাড়া দাগের জন্য _a03FullVRule সক্রিয়',
  fullVRuleBands.length === 5 && irOn.pages[1].bands[11]._a03FullVRule === true && irOn.pages[1].bands[13]._a03FullVRule === true
);
const b61 = p2Items.find((it) => it && it.type === 'table' && Array.isArray(it.splitBoxCols));
check('১৮. পৃষ্ঠা ২-এর স্বাক্ষর টেবিল (B61) উচ্চতা ৫৬.৫pt এবং XML-এ tblW=10113 ও tblInd=348',
  Boolean(b61 && b61.heightPt === 56.5 && xmlOn.includes('<w:tblW w:w="10113" w:type="dxa"/><w:tblInd w:w="348" w:type="dxa"/>'))
);

// ৪. কঠোর টেবিল গ্রিড ও বর্ডার যাচাই (ir.json ও measures.json উভয় পাইপলাইনে)
for (const [label, docXml] of [['ir.json পাইপলাইন', xmlOn], ['measures.json পাইপলাইন', xmlBuiltOn]]) {
  const rawTables = parseXmlTables(docXml);
  let allGridAligned = rawTables.length === 21;
  let zeroNilCellBorders = true;
  let noGrayShadingInTables = true;

  for (const fullTbl of rawTables) {
    const ownTbl = stripNestedTables(fullTbl);
    const tblWM = /<w:tblPr>[\s\S]*?<w:tblW w:w="(\d+)"/.exec(ownTbl);
    const gridM = /<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/.exec(ownTbl);
    if (!tblWM || !gridM) {
      allGridAligned = false;
      break;
    }
    const tblW = Number(tblWM[1]);
    const gridCols = [...gridM[1].matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]));
    const gridSum = gridCols.reduce((a, b) => a + b, 0);
    if (gridSum !== tblW) {
      allGridAligned = false;
      break;
    }
    const trMatches = [...ownTbl.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)];
    for (const trM of trMatches) {
      const trXml = trM[1];
      const tcMatches = [...trXml.matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)];
      let colCursor = 0;
      let rowWidthSum = 0;
      for (const tcM of tcMatches) {
        const tcXml = tcM[1];
        const tcPrM = /<w:tcPr>([\s\S]*?)<\/w:tcPr>/.exec(tcXml);
        if (!tcPrM) {
          allGridAligned = false;
          break;
        }
        const tcPr = tcPrM[1];
        const wM = /<w:tcW w:w="(\d+)"/.exec(tcPr);
        const gsM = /<w:gridSpan w:val="(\d+)"\/>/.exec(tcPr);
        const w = wM ? Number(wM[1]) : 0;
        const gs = gsM ? Number(gsM[1]) : 1;
        const expectedW = gridCols.slice(colCursor, colCursor + gs).reduce((a, b) => a + b, 0);
        if (w !== expectedW) {
          allGridAligned = false;
          break;
        }
        if (/<w:tcBorders>[\s\S]*?w:val="nil"/.test(tcPr)) {
          zeroNilCellBorders = false;
        }
        if (/<w:shd\b/.test(tcPr)) {
          noGrayShadingInTables = false;
        }
        rowWidthSum += w;
        colCursor += gs;
      }
      if (rowWidthSum !== tblW || colCursor !== gridCols.length) {
        allGridAligned = false;
        break;
      }
    }
  }

  check(`১৯.${label === 'ir.json পাইপলাইন' ? '১' : '২'} (${label}): সব ২১টি টেবিলের প্রতিটি সারির সেলের মোট প্রস্থ tblW ও tblGrid-এর সাথে ১০০% সারিবদ্ধ এবং কোনো খোলা (nil) সেল-বর্ডার বা ধূসর শেডিং নেই`,
    allGridAligned && zeroNilCellBorders && noGrayShadingInTables
  );
}

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
