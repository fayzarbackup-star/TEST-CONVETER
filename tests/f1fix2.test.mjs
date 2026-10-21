/**
 * F1_SCORE_v2 অফলাইন টেস্ট স্যুট (tests/f1fix2.test.mjs)
 * নমুনা f1 (৩-পাতার অনলাইন শিক্ষাবৃত্তি আবেদন ফরম)-এর হালকা ধূসর পূর্ণ টেবিল-গ্রিড বর্ডার (DFDFDF),
 * বাম কলাম ও সেকশন-শিরোনামের ছায়া (F2F2F2), ১৭-ঘর অঙ্ক-বাক্সের ০.৭৫pt বর্ডার, রেডিও-বিকল্পের ফন্ট/অক্ষর-ফাঁক,
 * পাতা ৩ "সংযুক্তি:" ছকের ৯pt শিরোনাম ও বহিঃস্থ বর্ডার এবং সুইচ বন্ধ অবস্থায় ১০০% বাইট-অভিন্নতা যাচাই।
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ভিত্তি সুইচসমূহ (switch-defaults.js লোড না করে সরাসরি সক্রিয়করণ)
const BASELINE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT',
  'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES',
  'A14FIX4', 'RULES2', 'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX',
  'A02FIX', 'A06FIX', 'A07FIX6', 'F1FIX', 'A18FIX'
];

function setBaselineSwitches() {
  for (const k of Object.keys(globalThis)) {
    if (k.startsWith('__FZ_ON_') || k.startsWith('__FZ_OFF_')) {
      delete globalThis[k];
    }
  }
  for (const sw of BASELINE_SWITCHES) {
    globalThis['__FZ_ON_' + sw] = true;
  }
}

setBaselineSwitches();

const FayzarLayoutIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
globalThis.FayzarLayoutIR = FayzarLayoutIR;
const FayzarLineFit = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
globalThis.FayzarLineFit = FayzarLineFit;
const FayzarFaithfulDocx = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));
globalThis.FayzarFaithfulDocx = FayzarFaithfulDocx;

const RUN_DIR = path.join(ROOT, 'qa/golden-data/runs/S24_fa71c3b5/f1');
const rawMeasures = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'measures.json'), 'utf8'));
const goldenIrJson = fs.readFileSync(path.join(RUN_DIR, 'ir.json'), 'utf8');
const goldenIrObj = JSON.parse(goldenIrJson);

// ZIP (.docx) থেকে নির্দিষ্ট ফাইলের টেক্সট নিষ্কাশন
function extractZipEntryText(buf, entryName) {
  let off = 0;
  while (off + 30 <= buf.length) {
    const sig = buf.readUInt32LE(off);
    if (sig !== 0x04034b50) break;
    const method = buf.readUInt16LE(off + 8);
    const compSize = buf.readUInt32LE(off + 18);
    const nameLen = buf.readUInt16LE(off + 26);
    const extraLen = buf.readUInt16LE(off + 28);
    const name = buf.slice(off + 30, off + 30 + nameLen).toString('utf8');
    const dataStart = off + 30 + nameLen + extraLen;
    const raw = buf.slice(dataStart, dataStart + compSize);
    if (name === entryName) {
      return (method === 8 ? zlib.inflateRawSync(raw) : raw).toString('utf8');
    }
    off = dataStart + compSize;
  }
  throw new Error('ZIP entry not found: ' + entryName);
}

// measures.json থেকে সম্পূর্ণ পাইপলাইন (layout-ir -> line-fit -> faithful-docx-builder) চালানো
async function buildPipelineFromMeasures(measuresObj) {
  const mCopy = JSON.parse(JSON.stringify(measuresObj));
  const ir = FayzarLayoutIR.build(mCopy.cap, mCopy.measures, mCopy.pageInfo);
  ir.lineFits = FayzarLineFit.fit(ir);
  const { xml } = FayzarFaithfulDocx.bodyXml(ir);
  const docxBytes = await FayzarFaithfulDocx.build(ir, { type: 'uint8array' });
  const fullDocXml = extractZipEntryText(Buffer.from(docxBytes), 'word/document.xml');
  return { ir, xml, docxBytes, fullDocXml };
}

// নেস্টেড <w:tbl> সহ সব টেবিল আলাদাভাবে নিষ্কাশন এবং প্রতিটি টেবিলের নিজের (অ-নেস্টেড) সারি ও ঘর বিশ্লেষণ
function extractAllTablesWithOwnRows(xml) {
  const tagRe = /<\/?w:tbl(?=\s|>)/g;
  const stack = [];
  const tables = [];
  let m;
  while ((m = tagRe.exec(xml)) !== null) {
    if (m[0] === '<w:tbl') {
      stack.push({ start: m.index, children: [] });
    } else {
      const top = stack.pop();
      if (!top) continue;
      top.end = m.index + '</w:tbl>'.length;
      const rawTbl = xml.slice(top.start, top.end);
      // ভেতরের নেস্টেড টেবিলগুলো মাস্ক করে কেবল এই টেবিলের নিজস্ব <w:tr> ও <w:tc> নিষ্কাশন
      let ownXml = '';
      let pos = top.start;
      for (const ch of top.children) {
        ownXml += xml.slice(pos, ch.start);
        pos = ch.end;
      }
      ownXml += xml.slice(pos, top.end);
      tables.push({ rawTbl, ownXml, depth: stack.length });
      if (stack.length > 0) {
        stack[stack.length - 1].children.push({ start: top.start, end: top.end });
      }
    }
  }
  return tables;
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error('   ', err && err.stack ? err.stack : err);
  }
}

console.log('=== F1_SCORE_v2 (F1FIX2) টেস্ট স্যুট ===');

// ১) সুইচ API ও এক্সপোর্ট যাচাই
await test('১. F1FIX2 সুইচ গেট ও মেরামত ফাংশনগুলো তিনটি মডিউলে এক্সপোর্ট করা হয়েছে', () => {
  assert.equal(typeof FayzarLayoutIR.f1Fix2On, 'function');
  assert.equal(typeof FayzarLayoutIR.repairF1Fix2Page, 'function');
  assert.equal(typeof FayzarLayoutIR.repairF1Fix2Ir, 'function');
  assert.equal(typeof FayzarLayoutIR.restoreF1Fix2Page, 'function');
  assert.equal(typeof FayzarLayoutIR.restoreF1Fix2Ir, 'function');
  assert.equal(typeof FayzarLineFit.isF1Fix2On, 'function');
  assert.equal(typeof FayzarLineFit.repairF1Fix2Page, 'function');
  assert.equal(typeof FayzarLineFit.repairF1Fix2Ir, 'function');
  assert.equal(typeof FayzarLineFit.restoreF1Fix2Page, 'function');
  assert.equal(typeof FayzarLineFit.restoreF1Fix2Ir, 'function');
  assert.equal(typeof FayzarFaithfulDocx.f1Fix2On, 'function');
});

// ২) F1FIX2 বন্ধ অবস্থায় বেসলাইনের সাথে ১০০% বাইট-অভিন্নতা
await test('২. F1FIX2 বন্ধ অবস্থায় IR JSON এবং DOCX document.xml বেসলাইনের সাথে ১০০% বাইট-অভিন্ন', async () => {
  setBaselineSwitches();
  assert.equal(FayzarLayoutIR.f1Fix2On(), false);
  const { ir, fullDocXml } = await buildPipelineFromMeasures(rawMeasures);
  assert.equal(JSON.stringify(ir, null, 1), goldenIrJson.trim());
  // পুনরায় একই পাইপলাইন চালিয়ে ও __FZ_OFF_F1FIX2 দিয়ে বাইট-অভিন্নতা যাচাই
  globalThis.__FZ_OFF_F1FIX2 = true;
  const { ir: ir2, fullDocXml: fullDocXml2 } = await buildPipelineFromMeasures(rawMeasures);
  assert.equal(JSON.stringify(ir2, null, 1), goldenIrJson.trim());
  assert.equal(fullDocXml, fullDocXml2);
});

// ৩) F1FIX2 চালু করার পর __FZ_OFF_F1FIX2 = true করলে ১০০% পূর্বাবস্থায় প্রত্যাবর্তন
await test('৩. F1FIX2 চালু করে পুনরায় __FZ_OFF_F1FIX2 = true করলে IR ও DOCX XML ১০০% বেসলাইনে ফিরে আসে', async () => {
  setBaselineSwitches();
  globalThis.__FZ_ON_F1FIX2 = true;
  assert.equal(FayzarLayoutIR.f1Fix2On(), true);
  const mCopy = JSON.parse(JSON.stringify(rawMeasures));
  const ir = FayzarLayoutIR.build(mCopy.cap, mCopy.measures, mCopy.pageInfo);
  ir.lineFits = FayzarLineFit.fit(ir);
  assert.equal(ir.pages[0]._f1Fix2Repaired, true);

  // এখন __FZ_OFF_F1FIX2 সক্রিয় করে পুনরায় ফিট ও বিল্ড করা
  globalThis.__FZ_OFF_F1FIX2 = true;
  assert.equal(FayzarLayoutIR.f1Fix2On(), false);
  ir.lineFits = FayzarLineFit.fit(ir);
  const { xml } = FayzarFaithfulDocx.bodyXml(ir);

  setBaselineSwitches();
  const baseOut = await buildPipelineFromMeasures(rawMeasures);
  assert.equal(JSON.stringify(ir), JSON.stringify(baseOut.ir));
  assert.equal(xml, baseOut.xml);
});

// ৪) অন্য নথির ক্ষেত্রে F1FIX2 চালু থাকলেও ১০০% অপরিবর্তিত থাকা
await test('৪. ভিন্ন ধরনের নথির (অ-f1 ছক ও অনুচ্ছেদ) ক্ষেত্রে F1FIX2 চালু থাকলেও আউটপুট ১০০% অপরিবর্তিত থাকে', () => {
  const samplePage = {
    page: 1,
    widthPt: 595,
    heightPt: 842,
    margins: { top: 54, right: 54, bottom: 54, left: 54 },
    bodyFontPt: 12,
    bands: [
      {
        kind: 'flow',
        y0: 60,
        y1: 200,
        gapBeforePt: 6,
        cells: [
          {
            x0: 54,
            x1: 541,
            items: [
              {
                kind: 'table',
                borderless: false,
                noVRules: false,
                widthPt: 460,
                heightPt: 80,
                fontPt: 11,
                colFractions: [0.15, 0.35, 0.25, 0.25],
                rowHeightsPt: [25, 25, 30],
                rows: [
                  ['ক্রমিক', 'বিবরণ', 'মন্তব্য', 'স্বাক্ষর'],
                  ['১', 'সাধারণ তথ্য', '', ''],
                  ['২', 'অন্যান্য বিবরণ', '', '']
                ]
              }
            ]
          }
        ]
      }
    ]
  };
  setBaselineSwitches();
  const irOff = { pages: [JSON.parse(JSON.stringify(samplePage))], warnings: [] };
  FayzarLineFit.fit(irOff);
  const xmlOff = FayzarFaithfulDocx.bodyXml(irOff).xml;

  setBaselineSwitches();
  globalThis.__FZ_ON_F1FIX2 = true;
  const irOn = { pages: [JSON.parse(JSON.stringify(samplePage))], warnings: [] };
  FayzarLineFit.fit(irOn);
  const xmlOn = FayzarFaithfulDocx.bodyXml(irOn).xml;

  assert.equal(JSON.stringify(irOn), JSON.stringify(irOff));
  assert.equal(xmlOn, xmlOff);
});

// ৫) F1FIX2 চালু অবস্থায় পাতা সংখ্যা, একক-টেবিল নিয়ম এবং গ্রিড-প্রস্থ (tcW === tblW ও tblGrid) যাচাই
await test('৫. F1FIX2 চালু অবস্থায় ৩ পাতা, একক <w:tbl> কাঠামো এবং প্রতিটি সারিতে sum(tcW) === tblW ও tblGrid প্রান্তিককরণ সঠিক', async () => {
  setBaselineSwitches();
  globalThis.__FZ_ON_F1FIX2 = true;
  const { ir, xml } = await buildPipelineFromMeasures(rawMeasures);

  // ৩টি পাতা (৩টি সেকশন)
  const sectCount = (xml.match(/<w:sectPr>/g) || []).length;
  assert.equal(sectCount, 3, 'নথিতে ঠিক ৩টি পাতা (sectPr) থাকতে হবে');

  // পাতা ১-এ ১টি ২৪×২ ছক, পাতা ২-এ ১টি ১৬×২ ছক এবং পাতা ৩-এ ১টি ৪×১ সংযুক্তি ছক
  const p1Tbl = ir.pages[0].bands[2].cells[0].items[0];
  const p2Tbl = ir.pages[1].bands[0].cells[0].items[0];
  const p3Tbl = ir.pages[2].bands[0].cells[0].items[0];
  assert.equal(p1Tbl.rows.length, 24);
  assert.equal(p2Tbl.rows.length, 16);
  assert.equal(p3Tbl.rows.length, 4);

  // প্রতিটি <w:tbl>-এর গ্রিড ও সারি প্রস্থের গাণিতিক অভিন্নতা যাচাই
  const allTbls = extractAllTablesWithOwnRows(xml);
  assert.ok(allTbls.length >= 9, 'মূল ছক ও অঙ্ক-বাক্স উপ-ছক মিলে অন্তত ৯টি টেবিল থাকতে হবে');

  for (const [ti, tInfo] of allTbls.entries()) {
    const { ownXml } = tInfo;
    const mTblW = /<w:tblW w:w="(\d+)" w:type="dxa"\/>/.exec(ownXml);
    assert.ok(mTblW, `টেবিল #${ti}-এ <w:tblW> থাকতে হবে`);
    const tblW = +mTblW[1];

    const gridMatch = /<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/.exec(ownXml);
    assert.ok(gridMatch, `টেবিল #${ti}-এ <w:tblGrid> থাকতে হবে`);
    const gridCols = [...gridMatch[1].matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => +m[1]);
    const gridSum = gridCols.reduce((a, b) => a + b, 0);
    assert.equal(gridSum, tblW, `টেবিল #${ti}-এ gridCol যোগফল (${gridSum}) ও tblW (${tblW}) সমান হতে হবে`);

    const trMatches = [...ownXml.matchAll(/<w:tr>([\s\S]*?)<\/w:tr>/g)];
    assert.ok(trMatches.length >= 1, `টেবিল #${ti}-এ অন্তত ১টি সারি থাকতে হবে`);
    for (const [ri, trM] of trMatches.entries()) {
      const tcMatches = [...trM[1].matchAll(/<w:tc><w:tcPr>([\s\S]*?)<\/w:tcPr>/g)];
      let rowW = 0;
      let colCursor = 0;
      for (const tcM of tcMatches) {
        const tcPr = tcM[1];
        const wM = /<w:tcW w:w="(\d+)" w:type="dxa"\/>/.exec(tcPr);
        const spM = /<w:gridSpan w:val="(\d+)"\/>/.exec(tcPr);
        assert.ok(wM, `টেবিল #${ti} সারি #${ri}-এ <w:tcW> থাকতে হবে`);
        const w = +wM[1];
        const span = spM ? +spM[1] : 1;
        const expectedW = gridCols.slice(colCursor, colCursor + span).reduce((a, b) => a + b, 0);
        assert.equal(w, expectedW, `টেবিল #${ti} সারি #${ri} কলাম #${colCursor}-এ tcW (${w}) ও gridCol বিস্তার (${expectedW}) সমান হতে হবে`);
        rowW += w;
        colCursor += span;
      }
      assert.equal(colCursor, gridCols.length, `টেবিল #${ti} সারি #${ri}-এ মোট কলাম-বিস্তার (${colCursor}) === ${gridCols.length}`);
      assert.equal(rowW, tblW, `টেবিল #${ti} সারি #${ri}-এ tcW যোগফল (${rowW}) === tblW (${tblW})`);
    }
  }
});

// ৬) পাতা ১ ও পাতা ২-এর হালকা ধূসর পূর্ণ টেবিল-বর্ডার (DFDFDF), অক্ষত সারি-রেখা ও বাম-কলাম ছায়া (F2F2F2) যাচাই
await test('৬. পাতা ১ ও পাতা ২-এর ফরম-ছকে পূর্ণ হালকা ধূসর বর্ডার (DFDFDF), কোনো nil সারি-বর্ডার না থাকা এবং কেবল বাম কলামে (k=0) F2F2F2 ছায়া যাচাই', async () => {
  setBaselineSwitches();
  globalThis.__FZ_ON_F1FIX2 = true;
  const { ir, xml } = await buildPipelineFromMeasures(rawMeasures);

  const p1Tbl = ir.pages[0].bands[2].cells[0].items[0];
  const p2Tbl = ir.pages[1].bands[0].cells[0].items[0];
  assert.equal(p1Tbl.rowBand, null, 'পাতা ১ ছকে rowBand=null হতে হবে যাতে কোনো সারির বর্ডার মুছে না যায়');
  assert.equal(p2Tbl.rowBand, null, 'পাতা ২ ছকে rowBand=null হতে হবে যাতে কোনো সারির বর্ডার মুছে না যায়');

  const topTbls = extractAllTablesWithOwnRows(xml).filter((t) => t.depth === 0);
  // পাতা ১ ও পাতা ২-এর মূল ফরম-ছক খুঁজে বের করা (২৪ ও ১৬ সারি)
  const formTbls = topTbls.filter((t) => {
    const nTr = (t.ownXml.match(/<w:tr>/g) || []).length;
    return nTr === 24 || nTr === 16;
  });
  assert.equal(formTbls.length, 2, '২৪-সারি ও ১৬-সারির ২টি মূল ফরম-ছক থাকতে হবে');

  const expectedLightBorders = '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="DFDFDF"/><w:left w:val="single" w:sz="4" w:space="0" w:color="DFDFDF"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="DFDFDF"/><w:right w:val="single" w:sz="4" w:space="0" w:color="DFDFDF"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="DFDFDF"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="DFDFDF"/></w:tblBorders>';

  for (const fTbl of formTbls) {
    assert.ok(fTbl.ownXml.includes(expectedLightBorders), 'ফরম-ছকে ৬টি দিকেই 0.5pt DFDFDF বর্ডার থাকতে হবে');
    assert.ok(!/<w:tcBorders>/.test(fTbl.ownXml), 'ফরম-ছকের কোনো ঘরে খণ্ডিত বা nil tcBorders থাকতে পারবে না');

    const trMatches = [...fTbl.ownXml.matchAll(/<w:tr>([\s\S]*?)<\/w:tr>/g)];
    for (const [ri, trM] of trMatches.entries()) {
      const tcPrs = [...trM[1].matchAll(/<w:tc><w:tcPr>([\s\S]*?)<\/w:tcPr>/g)].map((m) => m[1]);
      assert.ok(tcPrs[0].includes('<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>'), `সারি #${ri} বাম ঘরে (k=0) F2F2F2 ছায়া থাকতে হবে`);
      if (tcPrs.length > 1) {
        assert.ok(!tcPrs[1].includes('<w:shd'), `সারি #${ri} ডান ঘরে (k=1) কোনো ছায়া (w:shd) থাকতে পারবে না`);
      }
    }
  }
});

// ৭) ১৭-ঘর ও ১১-ঘর অঙ্ক-বাক্সের ০.৭৫pt (w:sz="6") বর্ডার এবং পাতা ১ সেকশন-শিরোনামের #003366 রঙ যাচাই
await test('৭. অঙ্ক-বাক্স উপ-ছকে ০.৭৫pt (w:sz="6") বর্ডার এবং পাতা ১ সেকশন-শিরোনামে #003366 গাঢ় নীল রঙ ও gridSpan=2 যাচাই', async () => {
  setBaselineSwitches();
  globalThis.__FZ_ON_F1FIX2 = true;
  const { xml } = await buildPipelineFromMeasures(rawMeasures);

  const nestedTbls = extractAllTablesWithOwnRows(xml).filter((t) => t.depth === 1);
  assert.equal(nestedTbls.length, 6, 'পাতা ১-এ ৪টি ও পাতা ২-এ ২টি — মোট ৬টি অঙ্ক-বাক্স উপ-ছক থাকতে হবে');
  for (const nt of nestedTbls) {
    assert.ok(nt.ownXml.includes('<w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>'), 'অঙ্ক-বাক্সে w:sz="6" বর্ডার থাকতে হবে');
    assert.ok(nt.ownXml.includes('<w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>'), 'অঙ্ক-বাক্সের ডান দেয়ালে w:sz="6" বর্ডার থাকতে হবে');
  }

  assert.ok(xml.includes('<w:color w:val="003366"/>'), 'পাতা ১ সেকশন-শিরোনামে 003366 গাঢ় নীল রঙ থাকতে হবে');
});

// ৮) পাতা ২ সারি ১, সারি ২, সারি ৭ এবং পাতা ৩ "সংযুক্তি:" ছকের ফন্ট, অক্ষর-ফাঁক ও বহিঃস্থ বর্ডার যাচাই
await test('৮. পাতা ২ (সারি ১, ২, ৭, ১৫) ও পাতা ৩ ("সংযুক্তি:" ৯pt শিরোনাম ও বহিঃস্থ ধূসর বর্ডার) এর সুনির্দিষ্ট মেরামত যাচাই', async () => {
  setBaselineSwitches();
  globalThis.__FZ_ON_F1FIX2 = true;
  const { ir, xml, docxBytes } = await buildPipelineFromMeasures(rawMeasures);

  const p2Tbl = ir.pages[1].bands[0].cells[0].items[0];
  assert.deepEqual(p2Tbl._f1RowMeta[1].cells[0], { beforePt: 10.2, linePt: 11.0 });
  assert.deepEqual(p2Tbl._f1RowMeta[2].cells[0].lineCharSpacingPt, { 1: 0.35 });
  assert.equal(p2Tbl._f1RowMeta[7].cells[1].fontPt, 11.5);
  assert.equal(p2Tbl._f1RowMeta[7].cells[1].charSpacingPt, 0.3);
  assert.equal(p2Tbl._f1RowMeta[7].cells[1].beforePt, 4.5);
  assert.equal(p2Tbl._f1RowMeta[7].cells[1].linePt, 16.0);
  assert.equal(p2Tbl.rowHeightsPt[15], 30.0);

  const p3Tbl = ir.pages[2].bands[0].cells[0].items[0];
  assert.equal(p3Tbl._f1BoxOuterBorders, true);
  assert.equal(p3Tbl._f1LabelColFill, 'F2F2F2');
  assert.equal(p3Tbl._f1RowMeta[0].cells[0].fontPt, 9);
  assert.deepEqual(p3Tbl.rowHeightsPt, [8.5, 21.0, 21.0, 12.0]);

  const expectedOuterBoxBorders = '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="DFDFDF"/><w:left w:val="single" w:sz="4" w:space="0" w:color="DFDFDF"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="DFDFDF"/><w:right w:val="single" w:sz="4" w:space="0" w:color="DFDFDF"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
  assert.ok(xml.includes(expectedOuterBoxBorders), 'পাতা ৩ সংযুক্তি ছকে বহিঃস্থ DFDFDF বর্ডার এবং ভেতরে insideH/V=nil থাকতে হবে');

  assert.ok(docxBytes && docxBytes.byteLength > 2000, 'বৈধ .docx বাইনারি তৈরি হতে হবে');
  const builtDocXml = extractZipEntryText(Buffer.from(docxBytes), 'word/document.xml');
  assert.ok(builtDocXml.includes(expectedOuterBoxBorders));
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
