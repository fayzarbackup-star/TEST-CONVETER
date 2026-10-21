import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// প্রোডাকশনের ২০টি ডিফল্ট সুইচ নাম ধরে চালু করা (switch-defaults.js require না করে)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4', 'RULES2',
  'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX'
];

function enableBaseSwitches() {
  for (const k of Object.keys(globalThis)) {
    if (k.startsWith('__FZ_ON_') || k.startsWith('__FZ_OFF_')) {
      delete globalThis[k];
    }
  }
  for (const sw of BASE_SWITCHES) {
    globalThis[`__FZ_ON_${sw}`] = true;
  }
}

enableBaseSwitches();

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const measPath = path.join(ROOT, 'qa/golden-data/runs/S21_8de24d5f/a03/measures.json');
const rawMeas = JSON.parse(fs.readFileSync(measPath, 'utf8'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ পাস: ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ব্যর্থ: ${name}\n  ${err && err.stack ? err.stack : err}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'শর্ত পূরণ হয়নি');
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'মান মেলেনি'}: প্রত্যাশিত=${JSON.stringify(expected)}, প্রাপ্ত=${JSON.stringify(actual)}`);
  }
}

// ১. সুইচ চালু/বন্ধ ও অগ্রাধিকার যাচাই
test('১. __FZ_ON_A03FIX4 ও __FZ_OFF_A03FIX4 সুইচ তিন মডিউলেই সঠিকভাবে কাজ করে', () => {
  enableBaseSwitches();
  assertEq(IR.a03Fix4On(), false, 'ডিফল্টে IR.a03Fix4On বন্ধ থাকার কথা');
  assertEq(LF.isA03Fix4On(), false, 'ডিফল্টে LF.isA03Fix4On বন্ধ থাকার কথা');
  assertEq(DB.a03Fix4On(), false, 'ডিফল্টে DB.a03Fix4On বন্ধ থাকার কথা');

  globalThis.__FZ_ON_A03FIX4 = true;
  assertEq(IR.a03Fix4On(), true, '__FZ_ON_A03FIX4=true হলে IR চালু');
  assertEq(LF.isA03Fix4On(), true, '__FZ_ON_A03FIX4=true হলে LF চালু');
  assertEq(DB.a03Fix4On(), true, '__FZ_ON_A03FIX4=true হলে DB চালু');

  globalThis.__FZ_OFF_A03FIX4 = true;
  assertEq(IR.a03Fix4On(), false, '__FZ_OFF_A03FIX4=true হলে IR বন্ধ');
  assertEq(LF.isA03Fix4On(), false, '__FZ_OFF_A03FIX4=true হলে LF বন্ধ');
  assertEq(DB.a03Fix4On(), false, '__FZ_OFF_A03FIX4=true হলে DB বন্ধ');

  delete globalThis.__FZ_OFF_A03FIX4;
  delete globalThis.__FZ_ON_A03FIX4;
});

// ২. সুইচ বন্ধ থাকলে আউটপুট বাইট-বাই-বাইট অপরিবর্তিত
test('২. A03FIX4 বন্ধ থাকলে IR ও DOCX XML আউটপুট বাইট-বাই-বাইট অপরিবর্তিত থাকে', () => {
  enableBaseSwitches();
  const irBase = IR.build(JSON.parse(JSON.stringify(rawMeas)));
  LF.fit(irBase);
  const xmlBase = DB.bodyXml(irBase).xml;

  // চালু করে আবার বন্ধ করলে স্ন্যাপশট থেকে হুবহু আগের অবস্থায় ফেরে
  globalThis.__FZ_ON_A03FIX4 = true;
  const irToggle = IR.build(JSON.parse(JSON.stringify(rawMeas)));
  LF.fit(irToggle);

  globalThis.__FZ_ON_A03FIX4 = false;
  LF.fit(irToggle);
  const xmlRestored = DB.bodyXml(irToggle).xml;

  assertEq(JSON.stringify(irToggle), JSON.stringify(irBase), 'স্ন্যাপশট পুনরুদ্ধারের পর IR হুবহু এক হতে হবে');
  assertEq(xmlRestored, xmlBase, 'সুইচ বন্ধ করলে DOCX XML বাইট-বাই-বাইট এক হতে হবে');
});

// ৩. পাতা-সংখ্যা ও কালো ব্যানার ও বোল্ড অপসারণ যাচাই
test('৩. A03FIX4 চালু থাকলে পাতা-সংখ্যা ২ থাকে, কালো ব্যানার পূর্ণ-প্রস্থ হয় ও অবাঞ্ছিত বোল্ড সরে যায়', () => {
  enableBaseSwitches();
  globalThis.__FZ_ON_A03FIX4 = true;
  const ir = IR.build(JSON.parse(JSON.stringify(rawMeas)));
  LF.fit(ir);

  assertEq(ir.pages.length, 2, 'পাতা-সংখ্যা অবশ্যই ২ থাকতে হবে');

  const p1 = ir.pages[0];
  const p2 = ir.pages[1];

  // পাতা ১-এর ২য় কালো ব্যানারের ফন্ট ১৫.৫pt অক্ষুণ্ণ আছে (যাতে ২২তম লাইন হারানো না যায়)
  const p1Banners = [];
  p1.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
    if (it.kind === 'para' && it.shade === '000000') p1Banners.push(it);
    if (it.kind === 'para' && !it.shade) {
      assertEq(Boolean(it.bold), false, `পাতা ১-এর সাধারণ অনুচ্ছেদে বোল্ড থাকা যাবে না: ${it.text}`);
    }
  })));
  assertEq(p1Banners.length, 2, 'পাতা ১-এ ২টি কালো ব্যানার থাকবে');
  assertEq(p1Banners[0].align, 'c', '১ম ব্যানার কেন্দ্র-সাজানো');
  assertEq(p1Banners[0].indentPt, 0, '১ম ব্যানার ইনডেন্ট ০');
  assertEq(p1Banners[1].fontPt, 15.5, 'পাতা ১-এর ২য় ব্যানারের ফন্ট ১৫.৫pt থাকবে');

  const p2Banners = [];
  p2.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
    if (it.kind === 'para' && it.shade === '000000') p2Banners.push(it);
    if (it.kind === 'para' && !it.shade) {
      assertEq(Boolean(it.bold), false, `পাতা ২-এর সাধারণ অনুচ্ছেদে বোল্ড থাকা যাবে না: ${it.text}`);
    }
  })));
  assertEq(p2Banners.length, 2, 'পাতা ২-এ ২টি কালো ব্যানার থাকবে');
});

// ৪. ড্রিফট নিরসন যাচাই (_padBottomPt, a03P2VExtra, splitBoxCols ও অনুচ্ছেদ-ফাঁক)
test('৪. A03FIX4 চালু থাকলে পাতা ১ ও পাতা ২-এ কোনো উল্লম্ব ড্রিফট বা বক্স-প্যাডিং বিলোপ ঘটে না', () => {
  enableBaseSwitches();
  globalThis.__FZ_ON_A03FIX4 = true;
  const ir = IR.build(JSON.parse(JSON.stringify(rawMeas)));
  LF.fit(ir);
  const xml = DB.bodyXml(ir).xml;

  // ১) পাতা ১-এ ১. পেনশনারের নাম (B6) ৩ লাইন * ১৬pt = ৪৮pt এবং নিচের দাগের ফাঁক ১pt (w:line="20")
  assert(xml.includes('<w:spacing w:before="22" w:after="0" w:line="320" w:lineRule="exact"/>'), 'পাতা ১-এ ১ নং অনুচ্ছেদের লাইন-উচ্চতা ১৬pt (320 dxa) হতে হবে');

  // ২) পাতা ২-এর ২য় কালো ব্যানারের আগের ফাঁক (w:before="657" = 32.85pt) অক্ষুণ্ণ থাকে (A03FIX3-এ এটি 0 হয়ে -৩৮pt ড্রিফট হয়েছিল)
  assert(xml.includes('<w:shd w:val="clear" w:color="auto" w:fill="000000"/><w:spacing w:before="657"'), 'পাতা ২-এর ২য় কালো ব্যানারের আগের ফাঁক 657 dxa (32.85pt) অক্ষুণ্ণ থাকতে হবে');

  // ৩) পাতা ২-এর উপরের বক্সের (Box 2) নিচের প্যাডিং (w:line="120" = 6.0pt) অক্ষুণ্ণ থাকে (A03FIX3-এ এটি 4 dxa হয়ে -৬pt ড্রিফট হয়েছিল)
  assert(xml.includes('<w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/>'), 'পাতা ২-এর বক্স ২-এর নিচের প্যাডিং 120 dxa (6.0pt) অক্ষুণ্ণ থাকতে হবে');

  // ৪) পাতা ২-এর স্বাক্ষর-তারিখ বক্সের উচ্চতা 1228 dxa (61.4pt) অক্ষুণ্ণ থাকে
  assert(xml.includes('<w:trHeight w:val="1228" w:hRule="atLeast"/>'), 'স্বাক্ষর ও তারিখ বক্সের উচ্চতা 1228 dxa (61.4pt) হতে হবে');

  // ৫) চেকবক্স বর্ডার-রান (<w:bdr w:val="single" w:sz="6" w:space="0" w:color="000000"/>) তৈরি হয়েছে
  assert(xml.includes('<w:bdr w:val="single" w:sz="6" w:space="0" w:color="000000"/>'), 'চেকবক্সগুলোর বর্ডার-রান তৈরি হতে হবে');
});

// ৫. টেবিলের কঠোর নিয়ম যাচাই (পূর্ণ গ্রিড, প্রস্থের যোগফল = টেবিলের প্রস্থ, কলাম-সীমা একই গ্রিডে, বাড়তি ছায়া নেই)
test('৫. সব টেবিলে প্রতিটি সারিতে ঘরের প্রস্থের যোগফল = টেবিলের প্রস্থ এবং সব সারির কলাম-সীমা একই গ্রিডে থাকে', () => {
  enableBaseSwitches();
  globalThis.__FZ_ON_A03FIX4 = true;
  const ir = IR.build(JSON.parse(JSON.stringify(rawMeas)));
  LF.fit(ir);
  const xml = DB.bodyXml(ir).xml;

  // XML থেকে সব <w:tbl> বের করা (নেস্টেড টেবিলসহ)
  function extractAllTables(str) {
    const tables = [];
    const stack = [];
    const re = /<\/?w:tbl(?=\s|>)/g;
    let m;
    while ((m = re.exec(str)) !== null) {
      if (m[0] === '<w:tbl') {
        stack.push(m.index);
      } else {
        const start = stack.pop();
        if (start !== undefined) {
          tables.push(str.slice(start, m.index + '</w:tbl>'.length));
        }
      }
    }
    return tables;
  }

  // শুধুমাত্র শীর্ষ-স্তরের সন্তান ট্যাগ বের করার সহায়ক
  function directBlocks(xmlFragment, tagName) {
    const out = [];
    let depth = 0;
    let start = -1;
    const re = new RegExp(`<\\/?w:${tagName}(?=\\s|>|\\/)`, 'g');
    let m;
    while ((m = re.exec(xmlFragment)) !== null) {
      const idx = m.index;
      const selfClose = xmlFragment.indexOf('>', idx);
      const isSelfClosing = xmlFragment[selfClose - 1] === '/';
      if (m[0] === `<w:${tagName}`) {
        if (isSelfClosing) {
          if (depth === 0) out.push(xmlFragment.slice(idx, selfClose + 1));
        } else {
          if (depth === 0) start = idx;
          depth++;
        }
      } else {
        depth--;
        if (depth === 0 && start >= 0) {
          out.push(xmlFragment.slice(start, idx + `</w:${tagName}>`.length));
          start = -1;
        }
      }
    }
    return out;
  }

  // নেস্টেড <w:tbl> বাদ দিয়ে কেবল নিজস্ব <w:tblGrid> ও <w:tr> পরীক্ষা
  function stripNestedTables(tblXml) {
    let out = '';
    let depth = 0;
    let last = 0;
    const re = /<\/?w:tbl(?=\s|>)/g;
    let m;
    while ((m = re.exec(tblXml)) !== null) {
      if (m[0] === '<w:tbl') {
        if (depth === 1) {
          out += tblXml.slice(last, m.index);
        }
        depth++;
      } else {
        depth--;
        if (depth === 1) {
          last = m.index + '</w:tbl>'.length;
        }
      }
    }
    out += tblXml.slice(last);
    return out;
  }

  const allTables = extractAllTables(xml);
  assert(allTables.length >= 10, 'অন্তত ১০টি টেবিল থাকতে হবে');

  allTables.forEach((rawTbl, tIdx) => {
    const shallow = stripNestedTables(rawTbl);
    const tblWM = /<w:tblW w:w="(\d+)"/.exec(shallow);
    assert(tblWM, `টেবিল #${tIdx}-এ tblW থাকতে হবে`);
    const tblW = Number(tblWM[1]);

    const gridCols = [...shallow.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((x) => Number(x[1]));
    assert(gridCols.length >= 1, `টেবিল #${tIdx}-এ অন্তত ১টি gridCol থাকতে হবে`);
    const gridSum = gridCols.reduce((a, b) => a + b, 0);
    assertEq(gridSum, tblW, `টেবিল #${tIdx}-এ gridCol প্রস্থের যোগফল = tblW হতে হবে`);

    // কলাম-সীমার ক্রমযোজিত সেট
    const validBoundaries = new Set([0]);
    let acc = 0;
    for (const gw of gridCols) {
      acc += gw;
      validBoundaries.add(acc);
    }

    const trs = directBlocks(shallow, 'tr');
    trs.forEach((tr, rIdx) => {
      const tcs = directBlocks(tr, 'tc');
      let rowW = 0;
      let colCount = 0;
      tcs.forEach((tc, cIdx) => {
        const tcWM = /<w:tcW w:w="(\d+)"/.exec(tc);
        assert(tcWM, `টেবিল #${tIdx} সারি #${rIdx} ঘর #${cIdx}-এ tcW থাকতে হবে`);
        const w = Number(tcWM[1]);
        const gsM = /<w:gridSpan w:val="(\d+)"\/>/.exec(tc);
        const span = gsM ? Number(gsM[1]) : 1;

        // ঘরের প্রস্থ অবশ্যই সংশ্লিষ্ট gridCol-গুলোর যোগফলের সমান হবে
        const expectedW = gridCols.slice(colCount, colCount + span).reduce((a, b) => a + b, 0);
        assertEq(w, expectedW, `টেবিল #${tIdx} সারি #${rIdx} ঘর #${cIdx}-এর প্রস্থ gridCol-এর সমান হতে হবে`);

        rowW += w;
        colCount += span;
        assert(validBoundaries.has(rowW), `টেবিল #${tIdx} সারি #${rIdx} ঘর #${cIdx}-এর ডান সীমা (${rowW}) গ্রিড-সীমায় নেই`);

        // কোনো ঘরে বাড়তি ধূসর ছায়া (w:shd) নেই
        const tcPrM = /<w:tcPr>([\s\S]*?)<\/w:tcPr>/.exec(tc);
        if (tcPrM) {
          assert(!/<w:shd\b/.test(tcPrM[1]), `টেবিল #${tIdx} সারি #${rIdx} ঘর #${cIdx}-এ অবাঞ্ছিত w:shd থাকা যাবে না`);
        }
      });
      assertEq(rowW, tblW, `টেবিল #${tIdx} সারি #${rIdx}-এ ঘরের প্রস্থের যোগফল = টেবিলের প্রস্থ হতে হবে`);
      assertEq(colCount, gridCols.length, `টেবিল #${tIdx} সারি #${rIdx}-এ মোট কলাম-স্প্যান = মোট gridCol হতে হবে`);
    });
  });
});

// ৬. অন্য ডকুমেন্টের (ফ্রেমযুক্ত বা কালো ব্যানারহীন পাতা, যেমন a01, a02, a07, a12, a14) অপরিবর্তিত থাকা যাচাই
test('৬. সংকীর্ণ শর্তের কারণে অন্য ধরনের পাতায় (ফ্রেমযুক্ত বা কালো-ব্যানারহীন) A03FIX4 কোনো পরিবর্তন করে না', () => {
  enableBaseSwitches();
  globalThis.__FZ_ON_A03FIX4 = true;

  const otherPage = {
    page: 1,
    widthPt: 595,
    heightPt: 842,
    margins: { top: 36, right: 36, bottom: 36, left: 36 },
    frame: { style: 'single', spacePt: { top: 4, left: 4, right: 4, bottom: 4 } },
    boxes: [{ id: 1, x0: 40, x1: 550, y0: 50, y1: 700, sz: 6 }],
    bands: [
      {
        kind: 'flow',
        y0: 60,
        y1: 80,
        gapBeforePt: 10,
        cells: [{ x0: 36, x1: 559, items: [{ kind: 'para', text: '**১. সাধারণ শিরোনাম**', lines: ['**১. সাধারণ শিরোনাম**'], bold: true, fontPt: 12 }] }]
      }
    ]
  };
  const snapBefore = JSON.stringify(otherPage);
  IR.repairA03Fix4Page(otherPage);
  assertEq(JSON.stringify(otherPage), snapBefore, 'ফ্রেমযুক্ত পাতায় A03FIX4 কোনো পরিবর্তন করবে না');
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
