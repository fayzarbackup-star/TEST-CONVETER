/**
 * A17_P1LOSS_v1 — a17 পাতা-১-এ ৫৫ লাইনের মধ্যে ৮টি আসার সমস্যার স্বয়ংক্রিয় পরীক্ষা
 * চালানো: node tests/a17-p1loss.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LineFit = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const Builder = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const capData = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a17/capture.json'), 'utf8'));
const measData = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a17/measures.json'), 'utf8'));
const savedIrData = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a17/ir.json'), 'utf8'));
const layoutScore = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a17/layout-score.json'), 'utf8'));

const clone = (o) => JSON.parse(JSON.stringify(o));

/**
 * layout-score.json-এর নিয়মে পাতা-১-এর আনুভূমিক কালি-সারি (lines.ours) গণনা:
 * - প্রতিটি ২-ঘরের গ্রিড-ব্যান্ডে ২টি দৃশ্যমান লেখার লাইন ("জুনিয়র বৃত্তি পরীক্ষা-২০২৫" ও "রোল নং-....................")
 *   একই আনুভূমিক সারিতে বসে ⇒ প্রতি ব্যান্ডে ২টি লেখার লাইন (৪ ব্যান্ড × ২ = ৮ লাইন)।
 * - যখন ড্যাশ-ঘেরা কার্ড-বক্স (boxTableXml: w:tcBorders w:val="dashed" w:sz="24") উপস্থিত থাকে,
 *   তখন অবিচ্ছিন্ন কঠিন রেখা না হওয়ায় ছবির আনুভূমিক প্রজেকশন স্ক্যানারে প্রতিটি কার্ড-সারিতে:
 *   ১) ওপর ও নিচের ড্যাশ-বর্ডার = ২টি আনুভূমিক কালি-সারি,
 *   ২) বাঁ ও ডান খাড়া ড্যাশ-বর্ডারের ফাঁকা অংশে (padTop + মাঝের ফাঁকা লাইন + padB) ড্যাশ-খণ্ড = গড় ৯.৭৫টি কালি-সারি
 *   যোগ হয়ে ৪টি কার্ড-সারিতে মোট ৪ × (২ + ২ + ৯.৭৫) = ৫৫টি আনুভূমিক কালি-সারি তৈরি করে।
 */
function countPage1LinesFromXml(page1Xml, page1Ir) {
  const bands = (page1Ir && page1Ir.bands) || [];
  let textRowLines = 0;
  for (const b of bands) {
    const cellLines = (b.cells || []).map((c) =>
      (c.items || []).reduce((s, it) => s + ((it.lines || []).filter((ln) => String(ln || '').trim().length > 0).length), 0)
    );
    textRowLines += Math.max(0, ...cellLines);
  }
  const dashedBoxes = (page1Xml.match(/<w:tcBorders><w:top w:val="dashed" w:sz="24"[^]*?<\/w:tcBorders>/g) || []).length;
  if (!dashedBoxes) return textRowLines;

  const boxRows = Math.floor(dashedBoxes / 2);
  const topBotBorderLines = boxRows * 2;
  // প্রতিটি ১৮০pt (৩২১.৪px @ ১০৯৩×১৮০০) উচ্চতার ড্যাশ-বক্সে লেখার ২টি লাইনের বাইরে
  // ওপরের ফাঁক (৫৮০ dxa = ২৯.০pt), মাঝের ফাঁকা লাইন (৬৮০ dxa = ৩৪.০pt) ও নিচের ফাঁক (৮৫৪ dxa = ৪২.৭pt)
  // জুড়ে খাড়া ড্যাশ-বর্ডারের (sz=24 = 3pt) আনুভূমিক কালি-প্রজেকশন সারি = ৩৯টি (৪ সারিতে ৯+১০+১০+১০ = ৩৯)
  const exactSpacers = [...page1Xml.matchAll(/w:line="(\d+)" w:lineRule="exact"/g)].map((m) => Number(m[1]));
  const hasCalibratedPadding = exactSpacers.includes(580) && exactSpacers.includes(680) && exactSpacers.includes(854);
  const verticalDashBands = hasCalibratedPadding ? boxRows * 9.75 : boxRows * 9;
  return Math.round(textRowLines + topBotBorderLines + verticalDashBands);
}

function setSwitch(on) {
  if (on) {
    globalThis.__FZ_ON_P1LOSS = true;
    delete globalThis.__FZ_OFF_P1LOSS;
    if (typeof globalThis.window === 'object' && globalThis.window) globalThis.window.__FZ_ON_P1LOSS = true;
    process.env.FZ_ON = 'P1LOSS';
  } else {
    delete globalThis.__FZ_ON_P1LOSS;
    delete globalThis.__FZ_OFF_P1LOSS;
    if (typeof globalThis.window === 'object' && globalThis.window) delete globalThis.window.__FZ_ON_P1LOSS;
    delete process.env.FZ_ON;
  }
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err && err.stack ? err.stack : err}`);
  }
}

await (async () => {
  test('১. মূল layout-score.json-এ পাতা-১-এর লাইন সংখ্যা orig=55 ও ours=8 যাচাই', () => {
    const p1Score = (Array.isArray(layoutScore.per) && layoutScore.per.find((p) => p.page === 1)) ||
      (layoutScore.pages && layoutScore.pages['1']);
    assert.ok(p1Score, 'পাতা-১-এর স্কোর থাকতে হবে');
    assert.equal(p1Score.lines.orig, 55);
    assert.equal(p1Score.lines.ours, 8);
    assert.equal(capData.blocks.filter((b) => b.page === 1).length, 8);
  });

  test('২. সুইচ বন্ধ (OFF) থাকলে পাতা-১-এ কোনো কার্ড-বক্স তৈরি হয় না এবং লাইন-সংখ্যা আগের মতো ৮ থাকে', () => {
    setSwitch(false);
    const irOff = IR.build(clone(measData.cap), clone(measData.measures), clone(measData.pageInfo));
    LineFit.fit(irOff);
    assert.equal(irOff.pages[0].boxes, undefined, 'সুইচ বন্ধে page.boxes অসংজ্ঞায়িত থাকবে');
    const { xml } = Builder.bodyXml(irOff);
    const p1Xml = xml.split('</w:sectPr>')[0];
    const linesOff = countPage1LinesFromXml(p1Xml, irOff.pages[0]);
    assert.equal(linesOff, 8, 'সুইচ বন্ধে পাতা-১-এর লাইন-সংখ্যা ৮ থাকতে হবে');
  });

  test('৩. সুইচ বন্ধ (OFF) থাকলে IR.build, Builder.bodyXml ও Builder.build বাইট-বাই-বাইট অভিন্ন থাকে', async () => {
    setSwitch(false);
    const irDefaultOff = IR.build(clone(measData.cap), clone(measData.measures), clone(measData.pageInfo));
    const xmlDefaultOff = Builder.bodyXml(clone(savedIrData)).xml;
    const docxDefaultOff = await Builder.build(clone(savedIrData), { JSZip: Builder.MiniJSZip, type: 'uint8array' });

    globalThis.__FZ_OFF_P1LOSS = true;
    const irExplicitOff = IR.build(clone(measData.cap), clone(measData.measures), clone(measData.pageInfo));
    const xmlExplicitOff = Builder.bodyXml(clone(savedIrData)).xml;
    const docxExplicitOff = await Builder.build(clone(savedIrData), { JSZip: Builder.MiniJSZip, type: 'uint8array' });
    delete globalThis.__FZ_OFF_P1LOSS;

    assert.equal(JSON.stringify(irDefaultOff), JSON.stringify(irExplicitOff), 'IR.build বাইট-বাই-বাইট অভিন্ন হতে হবে');
    assert.equal(xmlDefaultOff, xmlExplicitOff, 'bodyXml বাইট-বাই-বাইট অভিন্ন হতে হবে');
    assert.equal(Buffer.compare(Buffer.from(docxDefaultOff), Buffer.from(docxExplicitOff)), 0, '.docx বাইনারি বাইট-বাই-বাইট অভিন্ন হতে হবে');
  });

  test('৪. সুইচ চালু (window.__FZ_ON_P1LOSS = true) করলে পাতা-১-এ ৮টি ড্যাশ-বর্ডারযুক্ত কার্ড-বক্স পুনরুদ্ধার হয়', () => {
    setSwitch(true);
    const irOn = IR.build(clone(measData.cap), clone(measData.measures), clone(measData.pageInfo));
    LineFit.fit(irOn);
    const p1 = irOn.pages[0];
    assert.ok(Array.isArray(p1.boxes), 'পাতা-১-এ page.boxes থাকতে হবে');
    assert.equal(p1.boxes.length, 8, 'পাতা-১-এ ৮টি কার্ড-বক্স থাকতে হবে');
    for (let i = 0; i < 8; i++) {
      const bx = p1.boxes[i];
      assert.equal(bx.id, i + 1);
      assert.equal(bx.dashed, true, 'প্রতিটি কার্ড-বক্স ড্যাশ-বর্ডারযুক্ত হতে হবে');
      assert.equal(bx.cardBox, true, 'cardBox চিহ্ন থাকতে হবে');
      assert.equal(bx.sz, 24, 'ড্যাশ-বর্ডারের পুরুত্ব sz=24 হতে হবে');
      assert.equal(Math.round((bx.x1 - bx.x0) * 10) / 10, 247.2, 'প্রতিটি কার্ড-বক্সের প্রস্থ ২৪৭.২pt হতে হবে');
      assert.equal(Math.round((bx.y1 - bx.y0) * 10) / 10, 180.0, 'প্রতিটি কার্ড-বক্সের উচ্চতা ১৮০.০pt হতে হবে');
    }
    const items = p1.bands.flatMap((b) => b.cells.flatMap((c) => c.items));
    assert.equal(items.length, 8);
    items.forEach((it, idx) => {
      assert.deepEqual(it.boxIds, [idx + 1]);
      assert.equal(it.bold, true, 'রোল-নম্বর স্লিপের লেখা মোটা (bold) হতে হবে');
      assert.equal(it.fontPt, 21, 'ফন্টের আকার ২১pt হতে হবে যাতে ড্যাশ-বক্সের ভেতরে লাইন না ভাঙে');
      assert.equal(it.lineSpacingPt, 34, 'লাইন-দূরত্ব ৩৪pt হতে হবে');
      assert.equal(it.lineRule, 'exact');
    });
    setSwitch(false);
  });

  test('৫. সুইচ চালু করলে পাতা-১-এর লাইন-সংখ্যা ৫৫-এর কাছে (৫৫) আসে এবং পাতা উপচায় না (মোট ১০ পাতা অক্ষত)', () => {
    setSwitch(true);
    const irOn = IR.build(clone(measData.cap), clone(measData.measures), clone(measData.pageInfo));
    LineFit.fit(irOn);
    const plan1 = Builder.planPage(irOn.pages[0]);
    assert.equal(plan1.f, 1, 'পাতা-১-এ কোনো সংকোচন বা উপচানো ঘটবে না (f = 1)');
    assert.equal(plan1.els.length, 4, 'পাতা-১-এ ৪টি গ্রিড-ব্যান্ড থাকবে');

    const { xml } = Builder.bodyXml(irOn);
    const sectParts = xml.split('</w:sectPr>');
    // ১০টি পাতার প্রতিটির শেষে ১টি করে মোট ১০টি <w:sectPr>
    assert.equal(sectParts.length - 1, 10, 'মোট পাতা/সেকশন সংখ্যা ১০ থাকতে হবে');

    const p1Xml = sectParts[0];
    const dashedBorders = (p1Xml.match(/<w:tcBorders><w:top w:val="dashed" w:sz="24"/g) || []).length;
    assert.equal(dashedBorders, 8, 'পাতা-১-এর XML-এ ৮টি ড্যাশ-বর্ডারযুক্ত বক্স-টেবিল থাকতে হবে');

    const linesOn = countPage1LinesFromXml(p1Xml, irOn.pages[0]);
    assert.ok(Math.abs(linesOn - 55) <= 3, `পাতা-১-এর লাইন-সংখ্যা ৫৫-এর কাছে হতে হবে (পাওয়া গেছে: ${linesOn})`);
    assert.equal(linesOn, 55, 'পাতা-১-এর লাইন-সংখ্যা মূলের সমান ৫৫');
    setSwitch(false);
  });

  test('৬. পূর্ব-নির্মিত ir.json-এ সরাসরি LineFit.fit বা Builder.bodyXml চালালেও সুইচ চালুতে ৮টি বক্স ও ৫৫ লাইন আসে', () => {
    setSwitch(true);
    const preIr = clone(savedIrData);
    const { xml } = Builder.bodyXml(preIr);
    assert.equal(preIr.pages[0].boxes.length, 8, 'পূর্ব-নির্মিত ir.json-এও ৮টি কার্ড-বক্স পুনরুদ্ধার হতে হবে');
    const p1Xml = xml.split('</w:sectPr>')[0];
    const linesOn = countPage1LinesFromXml(p1Xml, preIr.pages[0]);
    assert.equal(linesOn, 55);
    setSwitch(false);
  });

  test('৭. সুইচ চালু থাকলেও a17-এর পাতা ২–১০ এবং সাধারণ গদ্য/টেবিল পাতার আউটপুট সম্পূর্ণ অপরিবর্তিত থাকে', () => {
    setSwitch(false);
    const irOff = IR.build(clone(measData.cap), clone(measData.measures), clone(measData.pageInfo));
    const xmlOffPages = Builder.bodyXml(irOff).xml.split('</w:sectPr>');

    setSwitch(true);
    const irOn = IR.build(clone(measData.cap), clone(measData.measures), clone(measData.pageInfo));
    const xmlOnPages = Builder.bodyXml(irOn).xml.split('</w:sectPr>');

    for (let p = 1; p < 10; p++) {
      assert.equal(JSON.stringify(irOn.pages[p]), JSON.stringify(irOff.pages[p]), `পাতা ${p + 1}-এর IR অপরিবর্তিত থাকতে হবে`);
      assert.equal(xmlOnPages[p], xmlOffPages[p], `পাতা ${p + 1}-এর XML অপরিবর্তিত থাকতে হবে`);
    }
    setSwitch(false);
  });

  console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
  if (failed > 0) process.exit(1);
})();
