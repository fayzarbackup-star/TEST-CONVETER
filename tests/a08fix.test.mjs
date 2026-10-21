/**
 * A08_SCORE_v1 — নমুনা a08 (না-দাবী সনদপত্র ফরম) লেআউট ও ইমেজ স্কোর মেরামত পরীক্ষা
 * পরীক্ষা চালানো: node tests/a08fix.test.mjs
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// প্রোডাকশনের ভিত্তি সুইচগুলো স্পষ্টভাবে চালু করা (switch-defaults.js ছাড়া)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4', 'RULES2',
  'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX',
  'A02FIX', 'A06FIX', 'A07FIX6'
];
for (const k of BASE_SWITCHES) {
  globalThis['__FZ_ON_' + k] = true;
}

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const measPath = path.join(ROOT, 'qa/golden-data/runs/S21_bb0e8106/a08/measures.json');
const measData = JSON.parse(fs.readFileSync(measPath, 'utf8'));

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}:`, err && err.stack ? err.stack : err);
  }
}

// ১) ডিফল্ট-বন্ধ ও সুইচ নিয়ন্ত্রণ পরীক্ষা
await test('১. ডিফল্ট অবস্থায় A08FIX বন্ধ থাকে এবং __FZ_ON_A08FIX / __FZ_OFF_A08FIX সঠিকভাবে কাজ করে', () => {
  delete globalThis.__FZ_ON_A08FIX;
  delete globalThis.__FZ_OFF_A08FIX;
  assert.strictEqual(IR.a08FixOn(), false, 'ডিফল্ট অবস্থায় IR.a08FixOn() অবশ্যই false হবে');
  assert.strictEqual(LF.isA08FixOn(), false, 'ডিফল্ট অবস্থায় LF.isA08FixOn() অবশ্যই false হবে');
  assert.strictEqual(DB.a08FixOn(), false, 'ডিফল্ট অবস্থায় DB.a08FixOn() অবশ্যই false হবে');

  globalThis.__FZ_ON_A08FIX = true;
  assert.strictEqual(IR.a08FixOn(), true, '__FZ_ON_A08FIX=true হলে IR.a08FixOn() অবশ্যই true হবে');
  assert.strictEqual(LF.isA08FixOn(), true, '__FZ_ON_A08FIX=true হলে LF.isA08FixOn() অবশ্যই true হবে');
  assert.strictEqual(DB.a08FixOn(), true, '__FZ_ON_A08FIX=true হলে DB.a08FixOn() অবশ্যই true হবে');

  globalThis.__FZ_OFF_A08FIX = true;
  assert.strictEqual(IR.a08FixOn(), false, '__FZ_OFF_A08FIX=true হলে IR.a08FixOn() অবশ্যই false হবে');
  assert.strictEqual(LF.isA08FixOn(), false, '__FZ_OFF_A08FIX=true হলে LF.isA08FixOn() অবশ্যই false হবে');
  assert.strictEqual(DB.a08FixOn(), false, '__FZ_OFF_A08FIX=true হলে DB.a08FixOn() অবশ্যই false হবে');

  delete globalThis.__FZ_ON_A08FIX;
  delete globalThis.__FZ_OFF_A08FIX;
});

// ২) সুইচ চালু করার পর বন্ধ করলে পূর্বাবস্থায় হুবহু প্রত্যাবর্তন (byte-for-byte identity)
await test('২. A08FIX বন্ধ করলে IR ও XML বাইট-ফর-বাইট পূর্বাবস্থায় ফিরে আসে', () => {
  delete globalThis.__FZ_ON_A08FIX;
  delete globalThis.__FZ_OFF_A08FIX;

  const irOff = IR.build(measData.cap, measData.measures, measData.pageInfo);
  LF.fit(irOff);
  const xmlOff = DB.bodyXml(irOff).xml;

  globalThis.__FZ_ON_A08FIX = true;
  const irOn = IR.build(measData.cap, measData.measures, measData.pageInfo);
  LF.fit(irOn);
  const xmlOn = DB.bodyXml(irOn).xml;
  assert.notStrictEqual(xmlOff, xmlOn, 'A08FIX চালু হলে XML পরিবর্তিত হওয়া আবশ্যক');

  // এখন সুইচ বন্ধ করে পুনরায় LF.fit ও DB.bodyXml চালালে হুবহু আগের XML ফিরবে
  globalThis.__FZ_OFF_A08FIX = true;
  LF.fit(irOn);
  const xmlRestored = DB.bodyXml(irOn).xml;
  assert.strictEqual(xmlRestored, xmlOff, 'A08FIX বন্ধ করলে XML বাইট-ফর-বাইট আগের মতো হতে হবে');

  delete globalThis.__FZ_ON_A08FIX;
  delete globalThis.__FZ_OFF_A08FIX;
});

// ৩) শীর্ষ ডান-সাজানো হেডার ("সংযোজনী-৮") মেরামত যাচাই
await test('৩. ব্যান্ড ০ ("সংযোজনী-৮") হেডারে ১২pt ফন্ট, ১৩.৮pt ঠিক লাইন-উচ্চতা, ২.০pt ডান-ইনডেন্ট ও +০.২৫pt অক্ষর-ফাঁক প্রযুক্ত হয়', () => {
  globalThis.__FZ_ON_A08FIX = true;
  delete globalThis.__FZ_OFF_A08FIX;

  const ir = IR.build(measData.cap, measData.measures, measData.pageInfo);
  LF.fit(ir);
  const page = ir.pages[0];
  const hdr = page.bands[0].cells[0].items[0];

  assert.strictEqual(hdr.type, 'header');
  assert.strictEqual(hdr.fontPt, 12, 'হেডারের ফন্ট ১৩pt থেকে ১২pt-এ নামাতে হবে');
  assert.strictEqual(hdr.lineSpacingPt, 13.8, 'হেডারের লাইন-উচ্চতা ১৩.৮pt হতে হবে');
  assert.strictEqual(hdr.lineRule, 'exact', 'হেডারের lineRule exact হতে হবে');
  assert.strictEqual(hdr.rightIndentPt, 2.0, 'হেডারের ডান-ইনডেন্ট ২.০pt (৪০ dxa) হতে হবে');
  assert.strictEqual(hdr.charSpacingPt, 0.25, 'হেডারে +০.২৫pt অক্ষর-ফাঁক থাকতে হবে');

  const { xml } = DB.bodyXml(ir);
  assert.ok(xml.includes('<w:ind w:right="40"/>'), 'হেডারে w:right="40" থাকতে হবে');
  assert.ok(xml.includes('<w:spacing w:val="5"/><w:sz w:val="24"/><w:szCs w:val="24"/>'), 'হেডারে ২৪ half-pt ফন্ট ও ৫ dxa অক্ষর-ফাঁক থাকতে হবে');
});

// ৪) ৩টি ক্রমিক লেবেলে SERIALHANG প্রতিরোধ, ফন্ট একীকরণ ও রেফ-মাত্রা সেতুবন্ধন যাচাই
await test('৪. ব্যান্ড ২–৪ ("১. অফিসের নামঃ", "২. কর্মকর্তার নাম ও পদবিঃ", "৩. কার্যকালঃ")-এ ঝুলন্ত ট্যাব রোধ, ১৩pt ফন্ট এবং রেফ-মাত্রা সেতুবন্ধন প্রযুক্ত হয়', async () => {
  globalThis.__FZ_ON_A08FIX = true;
  delete globalThis.__FZ_OFF_A08FIX;

  const ir = IR.build(measData.cap, measData.measures, measData.pageInfo);
  LF.fit(ir);
  const page = ir.pages[0];

  const it1 = page.bands[2].cells[0].items[0];
  const it2 = page.bands[3].cells[0].items[0];
  const it3 = page.bands[4].cells[0].items[0];
  const it4 = page.bands[5].cells[0].items[0];

  assert.strictEqual(it1.indentPt, 0);
  assert.strictEqual(it2.indentPt, 0);
  assert.strictEqual(it3.indentPt, 0);
  assert.strictEqual(it4.indentPt, 0);

  assert.strictEqual(it1.fontPt, 13);
  assert.strictEqual(it2.fontPt, 13);
  assert.strictEqual(it3.fontPt, 13, '৩. কার্যকালঃ-এর ফন্ট ১৩.৫pt থেকে ১৩pt-এ একীভূত হতে হবে');
  assert.strictEqual(it4.fontPt, 13);
  assert.strictEqual(it4.charSpacingPt, 0.05);

  assert.strictEqual(it1._noSerialHang, true);
  assert.strictEqual(it2._noSerialHang, true);
  assert.strictEqual(it3._noSerialHang, true);
  assert.strictEqual(it2._a08BridgeMode, 'para2');
  assert.strictEqual(it3._a08BridgeMode, 'para3');
  assert.strictEqual(it2.rect.y, 183.8);
  assert.strictEqual(it3.rect.y, 208.8);

  const { xml } = DB.bodyXml(ir);
  // প-তে +০.৫pt (w:val="1") ও দ-তে +১.০pt (w:val="2") এবং বিঃ অক্ষত (যাতে বিসর্গে ডটেড সার্কেল না আসে)
  assert.ok(xml.includes('<w:position w:val="1"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">প</w:t>'), 'ব্যান্ড ৩-এ প-এর ওপর w:position=1 থাকতে হবে');
  assert.ok(xml.includes('<w:position w:val="2"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">দ</w:t>'), 'ব্যান্ড ৩-এ দ-এর ওপর w:position=2 থাকতে হবে');
  assert.ok(xml.includes('<w:t xml:space="preserve">বিঃ</w:t>'), 'ব্যান্ড ৩-এ বিঃ মূল ব্যঞ্জনবর্ণসহ এক রানে থাকতে হবে');

  // কা-তে +০.৫pt (w:val="1") ও লঃ-তে +১.০pt (w:val="2")
  assert.ok(xml.includes('<w:position w:val="1"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">কা</w:t>'), 'ব্যান্ড ৪-এ কা-এর ওপর w:position=1 থাকতে হবে');
  assert.ok(xml.includes('<w:position w:val="2"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">লঃ</w:t>'), 'ব্যান্ড ৪-এ লঃ-এর ওপর w:position=2 থাকতে হবে');

  // কোনো রানে একা বিসর্গ ("ঃ") থাকা চলবে না (নইলে ইউনিকোড ডটেড সার্কেল আসে)
  assert.ok(!/<w:t[^>]*>ঃ<\/w:t>/.test(xml), 'কোনো রানে ব্যঞ্জনবর্ণ ছাড়া একা বিসর্গ থাকা চলবে না');

  // SERIALHANG মডিউল চালু থাকলেও এই ৩টি অনুচ্ছেদে ঝুলন্ত ট্যাব ঢুকবে না
  const pMatches = xml.match(/<w:p>[\s\S]*?<\/w:p>/g) || [];
  const serialParas = pMatches.filter((p) => /অফিসের নামঃ|কর্মকর্তার নাম ও |৩\. কার্য/.test(p));
  assert.strictEqual(serialParas.length, 3);
  for (const sp of serialParas) {
    assert.ok(sp.includes('<w:tabs><w:tab w:val="left" w:pos="4340"/></w:tabs>'), 'SERIALHANG রোধক ট্যাব-স্টপ থাকতে হবে');
    assert.ok(!sp.includes('w:hanging='), 'ঝুলন্ত ইনডেন্ট থাকা চলবে না');
    assert.ok(!sp.includes('<w:tab/>'), 'অনুচ্ছেদের ভেতরে কোনো ট্যাব রান থাকা চলবে না');
  }
});

// ৫) ১২×৩ পাওনা-ছকের অখণ্ডতা, কলাম-কেন্দ্রীকরণ, শীর্ষ উল্লম্ব প্রান্তিককরণ ও নিখুঁত গ্রিড যাচাই
await test('৫. ব্যান্ড ৬ (১২×৩ পাওনা-ছক)-এর গ্রিড অক্ষত থাকে, কলাম ০ ও ২ এবং সারি ০–১ কেন্দ্রীভূত হয় এবং সব ঘর top-aligned হয়', () => {
  globalThis.__FZ_ON_A08FIX = true;
  delete globalThis.__FZ_OFF_A08FIX;

  const ir = IR.build(measData.cap, measData.measures, measData.pageInfo);
  LF.fit(ir);
  const tbl = ir.pages[0].bands[6].cells[0].items[0];

  assert.strictEqual(tbl.kind, 'table');
  assert.strictEqual(tbl.borderless, false);
  assert.strictEqual(tbl.rows.length, 12);
  assert.strictEqual(tbl.widthPt, 470.64);
  assert.strictEqual(tbl.heightPt, 237.25);
  assert.deepStrictEqual(tbl.colAligns, ['c', 'l', 'c']);
  assert.deepStrictEqual(tbl.cellAligns[0], ['c', 'c', 'c']);
  assert.deepStrictEqual(tbl.cellAligns[1], ['c', 'c', 'c']);
  for (let ri = 2; ri < 12; ri++) {
    assert.deepStrictEqual(tbl.cellAligns[ri], ['c', 'l', 'c']);
  }
  assert.deepStrictEqual(tbl.headVAlign, ['t', 't', 't']);
  assert.strictEqual(tbl._a07RowVAlignTop, true);
  assert.strictEqual(tbl._a08Table, true);

  const { xml } = DB.bodyXml(ir);
  const tblMatches = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
  assert.strictEqual(tblMatches.length, 1, 'নথিতে ঠিক ১টি অখণ্ড <w:tbl> থাকতে হবে');
  const tblXml = tblMatches[0];

  // পূর্ণ বর্ডার ও কোনো অতিরিক্ত ছায়া (w:shd) বা nil বর্ডার না থাকা যাচাই
  assert.ok(tblXml.includes('<w:tblBorders><w:top w:val="single"'), 'পূর্ণ টেবিল বর্ডার থাকতে হবে');
  assert.ok(!tblXml.includes('w:val="nil"'), 'কোনো ঘরের বর্ডার nil করা চলবে না');
  assert.ok(!tblXml.includes('<w:shd'), 'কোনো ঘরে অতিরিক্ত ছায়া (w:shd) যোগ করা চলবে না');

  // tblW ও tblGrid-এর প্রস্থের সমষ্টি যাচাই
  const mTblW = /<w:tblW w:w="(\d+)" w:type="dxa"\/>/.exec(tblXml);
  assert.ok(mTblW, 'tblW থাকতে হবে');
  const tblW = Number(mTblW[1]);
  assert.strictEqual(tblW, 9411, 'ছকের মোট প্রস্থ ৯৪১১ dxa (৪৭০.৬৪pt) হতে হবে');

  const gridCols = [...tblXml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]));
  assert.deepStrictEqual(gridCols, [1435, 4655, 3321], 'tblGrid কলাম-প্রস্থ [1435, 4655, 3321] dxa হতে হবে');
  assert.strictEqual(gridCols.reduce((a, b) => a + b, 0), tblW, 'tblGrid কলামগুলোর যোগফল tblW-এর সমান হতে হবে');

  // প্রতিটি সারির ঘর-প্রস্থ, উল্লম্ব প্রান্তিককরণ (top) ও আনুভূমিক সাজানো যাচাই
  const trMatches = tblXml.match(/<w:tr>[\s\S]*?<\/w:tr>/g) || [];
  assert.strictEqual(trMatches.length, 12, 'ছকে ঠিক ১২টি সারি থাকতে হবে');

  trMatches.forEach((trXml, ri) => {
    const tcMatches = trXml.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || [];
    assert.strictEqual(tcMatches.length, 3, `সারি ${ri}-এ ঠিক ৩টি ঘর থাকতে হবে`);
    const tcWidths = tcMatches.map((tc) => Number(/<w:tcW w:w="(\d+)"/.exec(tc)[1]));
    assert.deepStrictEqual(tcWidths, gridCols, `সারি ${ri}-এর ঘরের প্রস্থ tblGrid-এর সমান হতে হবে`);
    assert.strictEqual(tcWidths.reduce((a, b) => a + b, 0), tblW, `সারি ${ri}-এর ঘরের প্রস্থের যোগফল tblW-এর সমান হতে হবে`);

    tcMatches.forEach((tc, ci) => {
      assert.ok(tc.includes('<w:vAlign w:val="top"/>'), `সারি ${ri} কলাম ${ci}-এ vAlign="top" থাকতে হবে`);
      const expJc = (ri <= 1 || ci === 0 || ci === 2) ? 'center' : 'left';
      assert.ok(tc.includes(`<w:jc w:val="${expJc}"/>`), `সারি ${ri} কলাম ${ci}-এ jc="${expJc}" থাকতে হবে`);
      const expLine = ri === 1 ? '304' : '273';
      assert.ok(tc.includes(`w:line="${expLine}" w:lineRule="exact"`), `সারি ${ri} কলাম ${ci}-এ w:line="${expLine}" থাকতে হবে`);
    });
  });
});

// ৬) নিচের ২-লাইনের স্বাক্ষর ব্লক ও ১-পাতা সীমা যাচাই
await test('৬. ব্যান্ড ৭ (স্বাক্ষর ব্লক)-এ ১৬pt লাইন-পিচ, ৬০৫pt অবস্থান, ১২৪pt কেন্দ্র-সরণ ও +০.০৫pt অক্ষর-ফাঁক প্রযুক্ত হয় এবং পাতা-সংখ্যা ১ থাকে', () => {
  globalThis.__FZ_ON_A08FIX = true;
  delete globalThis.__FZ_OFF_A08FIX;

  const ir = IR.build(measData.cap, measData.measures, measData.pageInfo);
  LF.fit(ir);
  assert.strictEqual(ir.pages.length, 1, 'পাতা-সংখ্যা ঠিক ১ থাকতে হবে');

  const sig = ir.pages[0].bands[7].cells[0].items[0];
  assert.strictEqual(sig.type, 'signature');
  assert.strictEqual(sig.fontPt, 13);
  assert.strictEqual(sig.lineSpacingPt, 16.0);
  assert.strictEqual(sig.lineRule, 'exact');
  assert.strictEqual(sig.centerShiftPt, 124.0);
  assert.strictEqual(sig.charSpacingPt, 0.05);
  assert.strictEqual(sig.rect.y, 605.0);

  const { xml } = DB.bodyXml(ir);
  assert.ok(xml.includes('w:line="320" w:lineRule="exact"/><w:ind w:left="4960"/><w:jc w:val="center"/>'), 'স্বাক্ষর ব্লকে w:line="320" ও w:left="4960" থাকতে হবে');
  assert.ok(!xml.includes('<w:pageBreakBefore/>'), 'অতিরিক্ত কোনো পৃষ্ঠা-বিরতি থাকা চলবে না');
});

// ৭) ভিন্ন কাঠামোর পাতায় A08FIX কোনো পরিবর্তন ঘটায় না
await test('৭. অন্য কোনো নথির কাঠামোতে A08FIX চালু থাকলেও কোনো পরিবর্তন ঘটে না', () => {
  globalThis.__FZ_ON_A08FIX = true;
  delete globalThis.__FZ_OFF_A08FIX;

  const dummyPage = {
    page: 1,
    widthPt: 612,
    heightPt: 792,
    margins: { top: 72, left: 72, right: 72, bottom: 72 },
    bands: [
      {
        kind: 'flow',
        y0: 100,
        y1: 115,
        gapBeforePt: 28,
        cells: [{ x0: 72, x1: 540, items: [{ kind: 'para', type: 'header', align: 'r', fontPt: 13, rightIndentPt: 4, rect: { x: 490, y: 100, w: 45, h: 10 }, text: 'সাধারণ হেডার', lines: ['সাধারণ হেডার'] }] }]
      }
    ]
  };
  const beforeJson = JSON.stringify(dummyPage);
  IR.repairA08FixPage(dummyPage);
  assert.strictEqual(JSON.stringify(dummyPage), beforeJson, 'ভিন্ন কাঠামোর পাতা অপরিবর্তিত থাকতে হবে');
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
