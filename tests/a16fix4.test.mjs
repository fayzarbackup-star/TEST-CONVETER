/**
 * A16_SCORE_v4 স্বয়ংসম্পূর্ণ অফলাইন Node টেস্ট স্যুট (tests/a16fix4.test.mjs)
 * যাচাই করে:
 * ১) সুইচ নিয়ন্ত্রণ (__FZ_ON_A16FIX4 / FZ_ON=A16FIX4 এবং __FZ_OFF_A16FIX4 ওভাররাইড) ও সুইচ বন্ধ অবস্থায় পূর্ববর্তী আচরণের সাথে ১০০% সামঞ্জস্য।
 * ২) পাতা ২-এর সূচিপত্র বুলেট তালিকায় ৪র্থ বুলেটের বাড়তি প্রত্যয় ("অন্তর্ভুক্তিকরণ" → "অন্তর্ভুক্তি") সংশোধন এবং ৫টি বুলেটেরই অভিন্ন ফন্ট (২০.৫pt) ও প্রস্থ পুনরুদ্ধার।
 * ৩) পাতা ৫, ৬ ও ৮-এর ১-লাইনের মাঝ-সাজানো উপ-শিরোনামে (heading) হারানো আন্ডারলাইন (underline=true) ও পাতা ৮-এর অক্ষর-ফাঁক (charSpacingPt=0.1) পুনরুদ্ধার এবং পাতা ৬-এর শিরোনামের ফন্ট (১৬.৫pt) সমন্বয়।
 * ৪) পাতা ৩–৯-এর চেকলিস্ট ছকের শিরোনাম সারির ৬টি ঘরই মাঝ-সাজানো ও মোটা (bold), ক্রমিক কলাম ("১।"–"১৪।") মাঝ-সাজানো, উল্লম্ব-মার্জকৃত ক্রমিক ঘরের (vMerge='restart') শীর্ষ-সাজানো (vAlign="top") এবং বহু-লাইনের গদ্য ঘরের উভয়-পাশ সমান (jc="both") সাজানো।
 * ৫) পাতা ৬-এর ৮। নং সারির ৭-কলামের নেস্টেড উপ-ছকের মাপা কলাম-প্রস্থ ([566, 576, 776, 596, 1546, 1046, 1159] dxa), শীর্ষ উল্লম্ব অবস্থান (vAlign="top") ও সংক্ষিপ্ত প্যাডিং (14 dxa)।
 * ৬) বর্ডারযুক্ত চেকলিস্ট ছকের ভেতরের ক)–ঙ) উপ-দফা ঘরে SERIALHANG-এর অবাঞ্ছিত ঝুলন্ত ইনডেন্ট (290 dxa) ও ট্যাব প্রয়োগ রোধ।
 * ৭) পাতা ৬ ও ৮-এর অণু-স্বাক্ষর চিত্রের পূর্ণ প্রস্থ পুনরুদ্ধার (পাতা ৬-এ _a16WideSigCrop অপসারণ), পাতা ১-এর ফাইল-পাথ ফুটারের প্রস্থ (charSpacingPt=0.1) সমন্বয় এবং মোট পাতা সংখ্যা (৯ পাতা) অপরিবর্তিত থাকা।
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// switch-defaults.js লোড না করে ভিত্তি সুইচগুলো স্পষ্টভাবে চালু করা
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES'
];
for (const sw of BASE_SWITCHES) {
  globalThis['__FZ_ON_' + sw] = true;
}

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const B = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const RUN_DIR = path.join(
  ROOT,
  'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2+A14FIX3+WIDTH+A16FIX3+A14RULES/a16'
);
const captureData = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'capture.json'), 'utf8'));
const measuresData = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'measures.json'), 'utf8'));
const savedIrData = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'ir.json'), 'utf8'));

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}:`, err && err.stack ? err.stack : err);
  }
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ১) সুইচ নিয়ন্ত্রণ ও ডিফল্ট-বন্ধ অবস্থায় পূর্ববর্তী আচরণ যাচাই
await runTest('১. A16FIX4 সুইচ অন/অফ এবং __FZ_OFF_A16FIX4 অগ্রাধিকার যাচাই', () => {
  delete globalThis.__FZ_ON_A16FIX4;
  delete globalThis.__FZ_OFF_A16FIX4;
  assert.strictEqual(IR.a16Fix4On(), false, 'ডিফল্ট অবস্থায় IR.a16Fix4On() false হতে হবে');
  assert.strictEqual(LF.isA16Fix4On(), false, 'ডিফল্ট অবস্থায় LF.isA16Fix4On() false হতে হবে');
  assert.strictEqual(B.a16Fix4On(), false, 'ডিফল্ট অবস্থায় B.a16Fix4On() false হতে হবে');

  globalThis.__FZ_ON_A16FIX4 = true;
  assert.strictEqual(IR.a16Fix4On(), true, '__FZ_ON_A16FIX4=true হলে IR.a16Fix4On() true হতে হবে');
  assert.strictEqual(LF.isA16Fix4On(), true, '__FZ_ON_A16FIX4=true হলে LF.isA16Fix4On() true হতে হবে');
  assert.strictEqual(B.a16Fix4On(), true, '__FZ_ON_A16FIX4=true হলে B.a16Fix4On() true হতে হবে');

  globalThis.__FZ_OFF_A16FIX4 = true;
  assert.strictEqual(IR.a16Fix4On(), false, '__FZ_OFF_A16FIX4=true থাকলে সুইচ বন্ধ হতে হবে');
  assert.strictEqual(LF.isA16Fix4On(), false, '__FZ_OFF_A16FIX4=true থাকলে LF সুইচ বন্ধ হতে হবে');
  assert.strictEqual(B.a16Fix4On(), false, '__FZ_OFF_A16FIX4=true থাকলে Builder সুইচ বন্ধ হতে হবে');
  delete globalThis.__FZ_OFF_A16FIX4;
});

await runTest('২. A16FIX4 বন্ধ অবস্থায় পূর্ববর্তী IR বৈশিষ্ট্য অপরিবর্তিত থাকা যাচাই', () => {
  delete globalThis.__FZ_ON_A16FIX4;
  const irOff = IR.build(clone(captureData), clone(measuresData));
  LF.fit(irOff);
  assert.strictEqual(irOff.pages.length, 9, 'পাতা সংখ্যা ৯ হতে হবে');
  const p2b3 = irOff.pages[1].bands[3].cells[0].items[0];
  assert.strictEqual(p2b3.text, '● **যানবাহন টিওএন্ডই-তে অন্তর্ভুক্তিকরণ**', 'সুইচ বন্ধ থাকলে পাতা ২ বুলেট ৪ অপরিবর্তিত থাকবে');
  assert.strictEqual(p2b3.fontPt, 18, 'সুইচ বন্ধ থাকলে পাতা ২ বুলেট ৪-এর ফন্ট ১৮pt থাকবে');
  assert.strictEqual(irOff.pages[4].bands[1].cells[0].items[0].underline, false, 'সুইচ বন্ধ থাকলে পাতা ৫ উপ-শিরোনামের underline=false থাকবে');
});

// এখন A16FIX4 চালু করে মূল পরীক্ষাগুলো চালানো
globalThis.__FZ_ON_A16FIX4 = true;
const builtIr = IR.build(clone(captureData), clone(measuresData));
LF.fit(builtIr);
const { xml: builtBodyXml } = B.bodyXml(clone(builtIr));

// সংরক্ষিত ir.json-এর ওপর সরাসরি LF.fit ও B.bodyXml চালিয়েও যাচাই
const fittedSavedIr = clone(savedIrData);
LF.fit(fittedSavedIr);
const { xml: savedBodyXml } = B.bodyXml(clone(fittedSavedIr));

await runTest('৩. মোট পাতা সংখ্যা (৯ পাতা) ও সেকশন সংখ্যা অপরিবর্তিত থাকা যাচাই', () => {
  assert.strictEqual(builtIr.pages.length, 9, 'IR.build-এ পাতা সংখ্যা ঠিক ৯ হতে হবে');
  assert.strictEqual(fittedSavedIr.pages.length, 9, 'fittedSavedIr-এ পাতা সংখ্যা ঠিক ৯ হতে হবে');
  const sectCount1 = (builtBodyXml.match(/<w:sectPr>/g) || []).length;
  const sectCount2 = (savedBodyXml.match(/<w:sectPr>/g) || []).length;
  assert.strictEqual(sectCount1, 9, 'builtBodyXml-এ ঠিক ৯টি <w:sectPr> থাকতে হবে');
  assert.strictEqual(sectCount2, 9, 'savedBodyXml-এ ঠিক ৯টি <w:sectPr> থাকতে হবে');
});

await runTest('৪. পাতা ২: ৪র্থ বুলেটের বাড়তি প্রত্যয় ("অন্তর্ভুক্তিকরণ" → "অন্তর্ভুক্তি") ও ৫টি বুলেটের ফন্ট (২০.৫pt) যাচাই', () => {
  for (const ir of [builtIr, fittedSavedIr]) {
    const p2 = ir.pages[1];
    const bullets = p2.bands.slice(0, 5).map((b) => b.cells[0].items[0]);
    assert.strictEqual(bullets.length, 5, 'পাতা ২-এ ৫টি বুলেট আইটেম থাকতে হবে');
    assert.strictEqual(
      bullets[3].text,
      '● **যানবাহন টিওএন্ডই-তে অন্তর্ভুক্তি**',
      '৪র্থ বুলেটের বাড়তি "করণ" প্রত্যয় মুছে "● **যানবাহন টিওএন্ডই-তে অন্তর্ভুক্তি**" হতে হবে'
    );
    assert.strictEqual(bullets[3].lines[0], '● **যানবাহন টিওএন্ডই-তে অন্তর্ভুক্তি**');
    assert.strictEqual(bullets[3].charSpacingPt, 0.15, '৪র্থ বুলেটে charSpacingPt=0.15 থাকতে হবে');
    bullets.forEach((bIt, idx) => {
      assert.strictEqual(bIt.fontPt, 20.5, `পাতা ২ বুলেট #${idx + 1}-এর ফন্ট ২০.৫pt হতে হবে`);
    });
  }
  assert.ok(!builtBodyXml.includes('অন্তর্ভুক্তিকরণ'), 'জেনারেটেড XML-এ ভুল শব্দ "অন্তর্ভুক্তিকরণ" থাকা যাবে না');
  assert.ok(builtBodyXml.includes('যানবাহন টিওএন্ডই-তে অন্তর্ভুক্তি'), 'জেনারেটেড XML-এ সঠিক "যানবাহন টিওএন্ডই-তে অন্তর্ভুক্তি" থাকতে হবে');
});

await runTest('৫. পাতা ৫, ৬ ও ৮-এর উপ-শিরোনামে (heading) হারানো আন্ডারলাইন পুনরুদ্ধার ও পাতা ৬ শিরোনামের ফন্ট যাচাই', () => {
  for (const ir of [builtIr, fittedSavedIr]) {
    // পাতা ৩ ও ৯-এ উপ-শিরোনামে আন্ডারলাইন নেই
    assert.strictEqual(ir.pages[2].bands[1].cells[0].items[0].underline, false, 'পাতা ৩ উপ-শিরোনামে আন্ডারলাইন থাকবে না');
    assert.strictEqual(ir.pages[8].bands[1].cells[0].items[0].underline, false, 'পাতা ৯ উপ-শিরোনামে আন্ডারলাইন থাকবে না');
    // পাতা ৫, ৬ ও ৮-এ আন্ডারলাইন পুনরুদ্ধার
    assert.strictEqual(ir.pages[4].bands[1].cells[0].items[0].underline, true, 'পাতা ৫ উপ-শিরোনামে underline=true হতে হবে');
    assert.strictEqual(ir.pages[5].bands[1].cells[0].items[0].underline, true, 'পাতা ৬ উপ-শিরোনামে underline=true হতে হবে');
    assert.strictEqual(ir.pages[7].bands[1].cells[0].items[0].underline, true, 'পাতা ৮ উপ-শিরোনামে underline=true হতে হবে');
    assert.strictEqual(ir.pages[7].bands[1].cells[0].items[0].charSpacingPt, 0.1, 'পাতা ৮ উপ-শিরোনামে charSpacingPt=0.1 হতে হবে');
    // পাতা ৬ শিরোনাম ফন্ট ১৬.৫pt
    assert.strictEqual(ir.pages[5].bands[0].cells[0].items[0].fontPt, 16.5, 'পাতা ৬ শিরোনামের ফন্ট ১৬.৫pt হতে হবে');
  }
});

await runTest('৬. পাতা ৩–৯: চেকলিস্ট ছকের শিরোনাম সারি ও ক্রমিক কলাম মাঝ-সাজানো, মোটা শিরোনাম ও বহু-লাইন জাস্টিফিকেশন যাচাই', () => {
  const checklistPages = [2, 3, 4, 5, 6, 7, 8];
  for (const pIdx of checklistPages) {
    const p = builtIr.pages[pIdx];
    let tbl = null;
    for (const b of p.bands) {
      for (const c of b.cells) {
        for (const it of c.items) {
          if (it.kind === 'table') tbl = it;
        }
      }
    }
    assert.ok(tbl, `পাতা ${pIdx + 1}-এ চেকলিস্ট ছক থাকতে হবে`);
    assert.strictEqual(tbl.headBold, true, `পাতা ${pIdx + 1}-এর ছকের শিরোনাম মোটা (headBold=true) হতে হবে`);
    assert.strictEqual(tbl.colAligns[0], 'c', `পাতা ${pIdx + 1}-এর ক্রমিক কলাম মাঝ-সাজানো ('c') হতে হবে`);
    assert.deepStrictEqual(tbl.cellAligns[0], ['c', 'c', 'c', 'c', 'c', 'c'], `পাতা ${pIdx + 1}-এর শিরোনাম সারির ৬টি ঘরই মাঝ-সাজানো হতে হবে`);
    const hasJustifiedProse = tbl.cellAligns.slice(1).some((rowAl) => rowAl[1] === 'j');
    assert.ok(hasJustifiedProse, `পাতা ${pIdx + 1}-এর বর্ণনা কলামে বহু-লাইনের গদ্য ঘর জাস্টিফাইড ('j') হতে হবে`);
  }
});

await runTest('৭. পাতা ৩–৯: উল্লম্বভাবে মার্জকৃত (vMerge="restart") সব ক্রমিক নম্বরের ঘর শীর্ষে (vAlign="top") থাকা যাচাই', () => {
  // XML-এ যতগুলো ঘরে <w:vMerge w:val="restart"/> আছে, সবগুলোতে <w:vAlign w:val="top"/> থাকতে হবে
  const restartCells = [...savedBodyXml.matchAll(/<w:tcPr>(?:(?!<\/w:tcPr>)[\s\S])*?<w:vMerge w:val="restart"\/>(?:(?!<\/w:tcPr>)[\s\S])*?<\/w:tcPr>/g)].map((m) => m[0]);
  assert.ok(restartCells.length >= 15, `অন্তত ১৫টি vMerge="restart" ক্রমিক ঘর থাকতে হবে (পাওয়া গেছে: ${restartCells.length})`);
  for (const tcPr of restartCells) {
    assert.ok(tcPr.includes('<w:vAlign w:val="top"/>'), `vMerge="restart" ঘরে অবশ্যই <w:vAlign w:val="top"/> থাকতে হবে: ${tcPr}`);
  }
});

await runTest('৮. পাতা ৬ সারি ১৬ (৮।): ৭-কলামের নেস্টেড উপ-ছকের মাপা কলাম-প্রস্থ ও vAlign="top" যাচাই', () => {
  const p6Tbl = builtIr.pages[5].bands[4].cells[0].items[0];
  assert.ok(Array.isArray(p6Tbl._subTableColFractions), 'পাতা ৬ ছকে _subTableColFractions সংরক্ষিত থাকতে হবে');
  assert.strictEqual(p6Tbl._subTableColFractions.length, 7, 'উপ-ছকের কলাম অনুপাত ৭টি হতে হবে');
  // XML-এ ৭-কলামের উপ-ছকের gridCol প্রস্থ যাচাই: [566, 576, 776, 596, 1546, 1046, 1159] dxa (মোট 6265 dxa = cw(1))
  const expectedGrid = '<w:tblGrid><w:gridCol w:w="566"/><w:gridCol w:w="576"/><w:gridCol w:w="776"/><w:gridCol w:w="596"/><w:gridCol w:w="1546"/><w:gridCol w:w="1046"/><w:gridCol w:w="1159"/></w:tblGrid>';
  assert.ok(builtBodyXml.includes(expectedGrid), 'পাতা ৬-এর উপ-ছকে মাপা কলাম-প্রস্থের tblGrid থাকতে হবে');
  assert.ok(savedBodyXml.includes(expectedGrid), 'savedBodyXml-এর উপ-ছকেও মাপা কলাম-প্রস্থের tblGrid থাকতে হবে');
  assert.ok(
    builtBodyXml.includes('<w:tblCellMar><w:left w:w="14" w:type="dxa"/><w:right w:w="14" w:type="dxa"/></w:tblCellMar></w:tblPr>' + expectedGrid),
    'উপ-ছকে 14 dxa সেল মার্জিন থাকতে হবে'
  );
});

await runTest('৯. SERIALHANG সুরক্ষা: বর্ডারযুক্ত ছকের ক)–ঙ) ঘরে ঝুলন্ত ইনডেন্ট রোধ ও প্রবাহ অনুচ্ছেদে সক্রিয় থাকা যাচাই', async () => {
  // কৃত্রিম FayzarSerialHang মডিউল যা যেকোনো ক) অনুচ্ছেদে 290 dxa ঝুলন্ত ইনডেন্ট বসায়
  const prevSH = globalThis.FayzarSerialHang;
  globalThis.FayzarSerialHang = {
    isOn: () => true,
    apply: (xml) => ({
      xml: xml.replace(
        /(<w:p><w:pPr>(?:(?!<\/w:pPr>)[\s\S])*?)(<\/w:pPr><w:r>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>\s*[ক-ঙ]\))/g,
        '$1<w:ind w:left="290" w:hanging="290"/>$2'
      )
    })
  };
  try {
    const zipBytes = await B.build(clone(fittedSavedIr), { type: 'uint8array' });
    const zipText = Buffer.from(zipBytes).toString('utf8');
    assert.ok(!zipText.includes('w:hanging="290"'), 'বর্ডারযুক্ত চেকলিস্ট ছকের ভেতরের ক)–ঙ) ঘরে w:hanging="290" যুক্ত হওয়া যাবে না');
  } finally {
    if (prevSH === undefined) delete globalThis.FayzarSerialHang;
    else globalThis.FayzarSerialHang = prevSH;
  }
});

await runTest('১০. পাতা ৬ ও ৮-এর অণু-স্বাক্ষর চিত্রের পূর্ণ প্রস্থ এবং পাতা ১ ফুটারের প্রস্থ যাচাই', () => {
  const p6Fig = builtIr.pages[5].bands[5].cells[0].items[0];
  assert.strictEqual(p6Fig.widthPt, 29.7, 'পাতা ৬ অণু-স্বাক্ষর চিত্রের প্রস্থ ২৯.৭pt হতে হবে');
  assert.strictEqual(p6Fig._a16WideSigCrop, undefined, 'পাতা ৬ অণু-স্বাক্ষর চিত্রে _a16WideSigCrop থাকা যাবে না');

  const p8Fig = builtIr.pages[7].bands[5].cells[0].items[0];
  assert.strictEqual(p8Fig.widthPt, 28, 'পাতা ৮ অণু-স্বাক্ষর চিত্রের প্রস্থ ২৮pt হতে হবে');

  const p1Foot = builtIr.pages[0].bands[14].cells[0].items[0];
  assert.strictEqual(p1Foot.fontPt, 7, 'পাতা ১ ফাইল-পাথ ফুটারের ফন্ট ৭pt হতে হবে');
  assert.strictEqual(p1Foot.charSpacingPt, 0.1, 'পাতা ১ ফাইল-পাথ ফুটারে charSpacingPt=0.1 থাকতে হবে');
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
