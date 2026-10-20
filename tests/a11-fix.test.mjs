import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const LayoutIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LineFit = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DocxBuilder = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const GOLDEN_DIR = path.join(ROOT, 'qa/golden-data/asis/a11');
const FALLBACK_DIR = path.join(ROOT, 'samples/a11');
const DATA_DIR = fs.existsSync(path.join(GOLDEN_DIR, 'capture.json')) ? GOLDEN_DIR : FALLBACK_DIR;

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

function setA11Switch(on) {
  if (on) {
    globalThis.__FZ_ON_A11FIX = true;
    if (globalThis.window) globalThis.window.__FZ_ON_A11FIX = true;
  } else {
    delete globalThis.__FZ_ON_A11FIX;
    if (globalThis.window) delete globalThis.window.__FZ_ON_A11FIX;
    delete process.env.__FZ_ON_A11FIX;
    delete process.env.FZ_ON;
  }
}

test('A11_SCORE_v1: সুইচ বন্ধ থাকলে (OFF) আউটপুট আগের মতো অপরিবর্তিত থাকে', (t) => {
  setA11Switch(false);
  t.after(() => setA11Switch(false));

  assert.equal(LineFit.isA11FixOn(), false);

  const savedIr1 = readJson('ir.json');
  const savedIr2 = readJson('ir.json');
  const xml1 = DocxBuilder.bodyXml(savedIr1).xml;
  const xml2 = DocxBuilder.bodyXml(savedIr2).xml;
  assert.equal(xml1, xml2);

  // সুইচ বন্ধ অবস্থায় পুরোনো ত্রুটিগুলো অপরিবর্তিত থাকে:
  // ১) বরাবর ব্লকে ভুল ruleBelow (srcY: 240.5) রয়ে যায়
  assert.deepEqual(savedIr1.pages[0].bands[1].cells[0].items[0].ruleBelow, { srcY: 240.5, sz: 4 });
  // ২) বিষয় অনুচ্ছেদে ঝুলন্ত ইনডেন্ট লোপ (firstIndentPt === 0)
  assert.equal(savedIr1.pages[0].bands[2].cells[0].items[0].firstIndentPt, 0);
  // ৩) ছবির বক্সে ডুপ্লিকেট figure + para (মোট ২টি আইটেম)
  assert.equal(savedIr1.pages[0].bands[27].cells[2].items.length, 2);
  // ৪) প্রত্যয়ন অনুচ্ছেদে অপরিবর্তিত LaTeX $\checkmark$ রয়ে যায়
  assert.match(savedIr1.pages[0].bands[24].cells[0].items[0].text, /\\checkmark/);
});

test('A11_SCORE_v1: সুইচ চালু করলে (window.__FZ_ON_A11FIX) পূর্ব-নির্মিত ir.json ও নতুন নির্মিত IR উভয় পথেই সব স্থূল বাগ ঠিক হয়', async (t) => {
  globalThis.window = globalThis.window || {};
  setA11Switch(true);
  t.after(() => setA11Switch(false));

  assert.equal(LineFit.isA11FixOn(), true);

  const capture = readJson('capture.json');
  const measuresData = readJson('measures.json');
  const builtIr = LayoutIR.build(capture, measuresData.measures, measuresData.pageInfo);
  LineFit.fit(builtIr);

  const savedIr = readJson('ir.json');
  LineFit.fit(savedIr);

  for (const [label, ir] of [['savedIr', savedIr], ['builtIr', builtIr]]) {
    const p1 = ir.pages[0];
    const p2 = ir.pages[1];

    // ১) "বরাবর..." অনুচ্ছেদ থেকে পরবর্তী "বিষয় :" অনুচ্ছেদের ভেতরে পড়া ভ্রান্ত ruleBelow (240.5pt) অপসারিত
    const barabar = p1.bands[1].cells[0].items[0];
    assert.equal(barabar.ruleBelow, undefined, `${label}: বরাবর অনুচ্ছেদে ভ্রান্ত ruleBelow থাকা যাবে না`);

    // ২) "বিষয় :" (৪ লাইনের নিচে-দাগযুক্ত অনুচ্ছেদ) ও পাতা ২-এর ক্রমিক তালিকায় (০১।–০৭।) ঝুলন্ত ইনডেন্ট (firstIndentPt < 0) পুনরুদ্ধার
    const bishoy = p1.bands[2].cells[0].items[0];
    assert.equal(bishoy.firstIndentPt, -36, `${label}: বিষয় অনুচ্ছেদে -36pt ঝুলন্ত ইনডেন্ট থাকতে হবে`);
    assert.equal(bishoy.fontPt, 11.5, `${label}: বিষয় অনুচ্ছেদে ৪ লাইনে আঁটার জন্য 11.5pt ফন্ট থাকতে হবে`);

    const p2MultiList = p2.bands
      .map((b) => b.cells[0].items[0])
      .filter((it) => it.type === 'list_item' && (it.lines || []).length >= 2);
    assert.ok(p2MultiList.length >= 6, `${label}: পাতা ২-এ অন্তত ৬টি বহু-লাইনের ক্রমিক আইটেম থাকতে হবে`);
    for (const it of p2MultiList) {
      assert.ok(it.firstIndentPt <= -25 && it.firstIndentPt >= -28, `${label}: পাতা ২-এর ক্রমিক আইটেমে ঝুলন্ত ইনডেন্ট (-26/-27pt) থাকতে হবে, পাওয়া গেছে ${it.firstIndentPt}`);
    }

    // ৩) আবেদন ও প্রত্যয়ন অনুচ্ছেদে LaTeX $\checkmark$ -> ইউনিকোড '✓' রূপান্তরিত এবং সমীকরণ ফ্ল্যাগ মুক্ত
    const prarthona = p1.bands[4].cells[0].items[0];
    const protyayon = p1.bands[24].cells[0].items[0];
    assert.ok(prarthona.text.includes('✓') && !prarthona.text.includes('\\checkmark'), `${label}: প্রার্থনা অনুচ্ছেদে ✓ থাকতে হবে`);
    assert.ok(protyayon.text.includes('✓') && !protyayon.text.includes('\\checkmark'), `${label}: প্রত্যয়ন অনুচ্ছেদে ✓ থাকতে হবে`);
    assert.equal(protyayon.hasEquation, undefined, `${label}: প্রত্যয়ন অনুচ্ছেদে hasEquation থাকা যাবে না`);

    // ৪) ৪।–৭। বহু-ক্ষেত্র পূরণ-লাইনে এবং কোলনহীন ৫। লাইনে ভ্রান্ত tabLines অপসারিত ও মূল ফন্ট (12pt) সংরক্ষিত
    for (const bIdx of [11, 12, 13, 14, 15, 16, 17, 18]) {
      const formIt = p1.bands[bIdx].cells[0].items[0];
      assert.equal(formIt.tabLines, null, `${label}: ব্যান্ড ${bIdx}-এ ভ্রান্ত tabLines থাকা যাবে না`);
      assert.equal(formIt.fontPt, 12, `${label}: ব্যান্ড ${bIdx}-এ ফন্ট 12pt হতে হবে`);
    }

    // ৫) পাতা ১-এর প্রত্যয়ন অংশের উপরের বিভাজক রেখাটি পূর্ণ-প্রস্থের দ্বৈত বর্ডার (doubleRule) হিসেবে চিহ্নিত
    const divRule = p1.bands[21].cells[0].items[0];
    assert.equal(divRule.doubleRule, true, `${label}: বিভাজক রেখায় doubleRule=true থাকতে হবে`);
    assert.ok(divRule.rect.w >= 505, `${label}: বিভাজক রেখার প্রস্থ পূর্ণ-প্রস্থ (>=505pt) হতে হবে`);

    // ৬) পাতা ১-এর নিচে ডানদিকের "ছবি" বক্সে ডুপ্লিকেট figure অপসারিত হয়ে কেবল ১টি একক অনুচ্ছেদ ("ছবি") ও বক্স-ফ্রেম অবশিষ্ট
    const photoCellItems = p1.bands[27].cells[2].items;
    assert.equal(photoCellItems.length, 1, `${label}: ছবির ঘরে ডুপ্লিকেট figure বাদ গিয়ে ১টি আইটেম থাকতে হবে`);
    assert.equal(photoCellItems[0].kind, 'para', `${label}: ছবির ঘরের আইটেমটি অনুচ্ছেদ হতে হবে`);
    assert.equal(photoCellItems[0].text.trim(), 'ছবি', `${label}: ছবির ঘরের লেখা 'ছবি' হতে হবে`);
    assert.deepEqual(photoCellItems[0].boxIds, [1], `${label}: ছবির অনুচ্ছেদে boxIds=[1] থাকতে হবে`);

    // ৭) চূড়ান্ত Word XML যাচাই
    const { xml, media } = DocxBuilder.bodyXml(ir);
    assert.equal(media.length, 0, `${label}: ডুপ্লিকেট ছবি না থাকায় এবং লোগো ডেটা ছাড়া মিডিয়া খালি`);
    assert.ok(xml.includes('w:val="double" w:sz="6"'), `${label}: Word XML-এ দ্বৈত আনুভূমিক বর্ডার থাকতে হবে`);
    assert.ok(!xml.includes('checkmark'), `${label}: Word XML-এ আক্ষরিক checkmark লেখা থাকা যাবে না`);
    assert.ok(xml.includes('w:hanging="720"'), `${label}: Word XML-এ বিষয় অনুচ্ছেদের 36pt (720 dxa) ঝুলন্ত ইনডেন্ট থাকতে হবে`);

    // ৮) পূর্ণ .docx বিল্ড যাচাই
    const docxBytes = await DocxBuilder.build(ir, { type: 'uint8array', JSZip: DocxBuilder.MiniJSZip });
    assert.ok(docxBytes instanceof Uint8Array && docxBytes.length > 1000, `${label}: বৈধ .docx বাইট তৈরি হতে হবে`);
  }
});

test('A11_SCORE_v1: FZ_ON=A11FIX পরিবেশ চলক এবং বিদ্যমান সুইচগুলোর অক্ষত আচরণ যাচাই', (t) => {
  setA11Switch(false);
  process.env.FZ_ON = 'A11FIX';
  t.after(() => setA11Switch(false));

  assert.equal(LineFit.isA11FixOn(), true);
  assert.equal(typeof LineFit.isP1LossOn, 'function');
  assert.equal(typeof LineFit.isA01FixOn, 'function');
  assert.equal(typeof LineFit.isP2DriftOn, 'function');
  assert.equal(typeof LineFit.isRuleFixOn, 'function');
  assert.equal(typeof LineFit.isA10LinesOn, 'function');
  assert.equal(typeof LineFit.isA03FixOn, 'function');
  assert.equal(typeof LineFit.isA17FixOn, 'function');
  assert.equal(typeof LineFit.isA14FixOn, 'function');
  assert.equal(typeof LineFit.isA07FixOn, 'function');
});
