/**
 * Part-19.2 — সাজানো ল্যান্ডস্কেপ সনদ/প্রশংসাপত্র (দোকানের নমুনা Dreamland প্রত্যয়ন ও রাঙামাটি প্রশংসাপত্র; মাপ certificate-layout.js-এর মাথায়)
 * single: A4 ল্যান্ডস্কেপ, ডাবল পাতা-বর্ডার, গ্রেড-ছক শিরোনাম-মাথার ডানে, মূল লেখা বোল্ড ১৫pt ও ১.৭।
 * stub  : বামে মুড়ি + ডানে মূল সনদ, দুটোই ৪.৫pt দাগের বক্সে; শিরোনাম ছোট বক্সে।
 * কখন: PROTTOYON + page_orientation: landscape বা মুড়ি+মূল দুই অংশ; সাধারণ প্রত্যয়ন আগের মতো letter-layout-এ। ফিক্সচার বেনামি।
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const [n, p] of [['FayzarLayoutUnits', 'js/layout-engine/layout-units.js'], ['CqBookletPlanner', 'js/layout-engine/cq-booklet-planner.js'],
  ['TextRunProcessor', 'js/layout-engine/text-run-processor.js'], ['FayzarFrontmatter', 'js/layout-engine/frontmatter-header.js'],
  ['DocClassifier', 'js/engines/doc-classifier.js'], ['FayzarApplicationLayout', 'js/layout-engine/application-layout.js'],
  ['FayzarLetterLayout', 'js/layout-engine/letter-layout.js'], ['FayzarCertificateLayout', 'js/layout-engine/certificate-layout.js']]) {
  const m = require(path.join(ROOT, p));
  if (m && !globalThis[n]) globalThis[n] = m;
}
const CT = globalThis.FayzarCertificateLayout;
const C = globalThis.DocClassifier;
const E = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const Pipeline = require(path.join(ROOT, 'js/layout-engine/fayzar-pipeline.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');
// নুকতা এক রূপে — precomposed য়/ড়/ঢ় (মডেলও তাই করে)
const N = (s) => String(s).replace(/য়/g, 'য়').replace(/ড়/g, 'ড়').replace(/ঢ়/g, 'ঢ়');
const LAND = fx('cert-landscape.input.md'), STUB = fx('cert-stub.input.md'), PORT = fx('prottoyon-school.input.md');

async function docx(text, font) {
  const out = await E.generateWordDoc(text, 'PROTTOYON', { format: 'docx', font });
  return (await JSZip.loadAsync(Buffer.from(await out.arrayBuffer()))).file('word/document.xml').async('string');
}
async function rtf(text, font) {
  const b = E.generateWordDoc(text, 'PROTTOYON', { format: 'doc', font });
  return Buffer.from(await b.arrayBuffer()).toString('utf8');
}

// ------------------------------------------------------------- কখন এই লেআউট
test('বাছাই: ল্যান্ডস্কেপ/মুড়িসহ সনদ এই মডিউলে; সাধারণ পোর্ট্রেট প্রত্যয়ন আগের মতো (wants=false)', () => {
  for (const t of [LAND, STUB, PORT]) assert.equal(C.classify(t).type, 'PROTTOYON');
  assert.equal(CT.wants(LAND), true);
  assert.equal(CT.wants(STUB), true);
  assert.equal(CT.wants(STUB.replace('page_orientation: landscape\n', '')), true, 'মুড়ি+মূল ধরা পড়ে ফ্রন্টম্যাটার ছাড়াও');
  assert.equal(CT.wants(STUB.replace('page_orientation: landscape\n', '').replace('***\n', '')), true, '"***" ছাড়াও (প্রথম লাইন আবার এলে)');
  assert.equal(CT.wants(PORT), false);
  assert.equal(CT.wants(LAND.replace('landscape', 'portrait')), false);
});

test('OCR প্রম্পট: PROTTOYON নিয়মের নিচে page_orientation ও মুড়ির *** নিয়ম', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/ai-ocr-engine.js'), 'utf8');
  const i = src.indexOf('doc_type: PROTTOYON, columns: 1');
  assert.ok(i > 0);
  assert.match(src.slice(i, i + 500), /page_orientation: landscape[\s\S]*counterfoil \(মুড়ি\)[\s\S]*\*\*\*/);
});

// ------------------------------------------------------------- পার্স
test('পার্স single: প্রতিষ্ঠান/ঠিকানা/সন, গ্রেড-ছক, শিরোনাম, ৩ অনুচ্ছেদ, তারিখ + স্বাক্ষর-ব্লক', () => {
  const m = CT.parse(LAND);
  assert.equal(m.kind, 'CERT_LAYOUT');
  assert.equal(m.variant, 'single');
  const p = m.parts[0];
  assert.deepEqual(p.head.map((x) => x.role), ['org', 'addr', 'meta']);
  assert.equal(p.tables.length, 1);
  assert.equal(p.tables[0].rows.length, 5);
  assert.equal(N(p.title), N('প্রত্যয়ন পত্র'));
  assert.equal(p.blocks.map((b) => b.kind).join(' > '), 'para > para > para');
  assert.match(p.footer.date, /^তারিখঃ/);
  assert.deepEqual(p.footer.sign.slice(0, 2), ['(রফিক উদ্দিন)', 'প্রধান শিক্ষক']);
});

test('পার্স stub: মুড়ি বামে (ঘর-সারি, এক লাইনে তারিখ+প্রধান শিক্ষক), মূল সনদ ডানে (গদ্য); দুই অংশেই ক্রমিক/তারিখ', () => {
  const m = CT.parse(STUB);
  assert.equal(m.variant, 'stub');
  const [s, mn] = m.parts;
  assert.equal(s.role, 'stub');
  assert.equal(mn.role, 'main');
  assert.equal(s.title, 'প্রশংসা পত্র');
  assert.equal(N(mn.title), N('প্রশংসা পত্র/ ছাড়পত্র'));
  assert.equal(s.blocks[0].kind, 'serial');
  assert.equal(s.blocks.filter((b) => b.kind === 'line').length, 7, 'মুড়ির প্রতিটি সারি আলাদা লাইন (জোড়া নয়)');
  assert.deepEqual(s.footer.sign, ['প্রধান শিক্ষক']);
  assert.equal(mn.blocks[0].kind, 'serial');
  assert.ok(mn.blocks.some((b) => b.kind === 'para'));
  assert.equal(mn.footer.sign[0], 'স্বাক্ষর');
  // উৎসে মূল আগে, মুড়ি পরে থাকলেও মুড়ি বামে
  const parts = STUB.split('***\n');
  const fm = parts[0].match(/^---[\s\S]*?---\n/)[0];
  const swapped = fm + parts[1] + '***\n' + parts[0].slice(fm.length);
  assert.equal(CT.parse(swapped).parts[0].title, 'প্রশংসা পত্র');
});

test('এক পাতা: বিজয়ে single সাধারণ ধাপে; সবচেয়ে ছোট ধাপেও মূল লেখা ≥১২pt', () => {
  const g = CT.geometry(CT.parse(LAND), { isBijoy: true });
  assert.equal(g.fitStep, 0);
  for (const role of ['single', 'main', 'stub']) assert.ok(CT._style(role, { shrink: CT.STEPS[CT.STEPS.length - 1] }).body >= 24);
});

// ------------------------------------------------------------- .docx
test('.docx single: A4 ল্যান্ডস্কেপ, ডাবল পাতা-বর্ডার, গ্রেড-ছক জোড়া ঘরের পাশে, শিরোনাম ৩২pt, মূল লেখা বোল্ড ১.৭', async () => {
  const xml = await docx(LAND, 'bijoy');
  assert.match(xml, /<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"\/>/);
  assert.match(xml, /<w:pgBorders w:offsetFrom="page"><w:top w:val="double"/);
  assert.match(xml, /<w:vMerge w:val="restart"\/>/);
  assert.match(xml, /<w:vMerge\/>/);
  assert.match(xml, /<w:sz w:val="64"\/>/, 'শিরোনাম ৩২pt');
  assert.match(xml, /w:line="408" w:lineRule="auto"\/>/, 'মূল লেখা ১.৭');
  assert.match(xml, /<w:keepNext\/>/, 'তারিখ/স্বাক্ষর শেষ লেখার সাথে');
  const uni = await docx(LAND, 'Kalpurush');
  assert.ok(N(uni).includes(N('প্রত্যয়ন পত্র')) && N(uni).includes(N('অগ্রগতি প্রয়োজন')), 'লেখা অক্ষত');
});

test('.docx stub: মুড়ি | ফাঁক | মূল — দুই ঘরে ৪.৫pt দাগ, শিরোনাম বক্সে, পাতা-বর্ডার নেই', async () => {
  const xml = await docx(STUB, 'bijoy');
  assert.match(xml, /w:orient="landscape"/);
  assert.equal((xml.match(/<w:top w:val="single" w:sz="36"/g) || []).length, 2);
  assert.match(xml, /<w:pBdr><w:top w:val="single" w:sz="12"/, 'শিরোনাম বক্সে');
  assert.doesNotMatch(xml, /<w:pgBorders/);
  assert.match(xml, /<w:tab w:val="right" w:pos="\d+"\/>/, 'ক্রমিক বামে, তারিখ ডানে');
});

// ------------------------------------------------------------- Word 2003
test('.doc (RTF): ল্যান্ডস্কেপ, single-এ পাতা-বর্ডার ও জোড়া ঘর; stub-এ এক সারির তিন ঘর; একটিই ডকুমেন্ট', async () => {
  const s = await rtf(LAND, 'bijoy');
  assert.match(s, /\\landscape\\paperw16838\\paperh11906/);
  assert.match(s, /\\pgbrdropt32/);
  assert.match(s, /\\clvmgf/);
  assert.match(s, /\\clvmrg/);
  assert.equal((s.match(/\{\\rtf1/g) || []).length, 1);
  const t = await rtf(STUB, 'bijoy');
  assert.match(t, /\\brdrw60/);
  assert.equal((t.match(/\\row\}/g) || []).length, 1);
  assert.match(t, /\\box\\brdrs/);
  assert.doesNotMatch(t, /\\pgbrdr/);
});

// ------------------------------------------------------------- প্রিভিউ = ডাউনলোড; পোর্ট্রেট অপরিবর্তিত
test('প্রিভিউ: পাইপলাইন একই মডেল থেকে (ল্যান্ডস্কেপ পাতা); সাধারণ প্রত্যয়ন LETTER_LAYOUT-এই', async () => {
  const r = await Pipeline.process(STUB, { outputFormat: 'html', font: 'bijoy' });
  assert.equal(r.docType, 'PROTTOYON');
  assert.equal(r.parsedData.kind, 'CERT_LAYOUT');
  assert.match(r.content, /size-a4-landscape official-certificate-layout/);
  assert.equal((r.content.match(/class="paper-sheet/g) || []).length, 1);
  const l = await Pipeline.process(LAND, { outputFormat: 'html', font: 'Kalpurush' });
  assert.equal(l.parsedData.kind, 'CERT_LAYOUT');
  const p = await Pipeline.process(PORT, { outputFormat: 'html', font: 'bijoy' });
  assert.equal(p.parsedData.kind, 'LETTER_LAYOUT');
  const px = await docx(PORT, 'bijoy');
  assert.match(px, /<w:pgSz w:w="11906" w:h="16838"\/>/, 'পোর্ট্রেট প্রত্যয়ন আগের মতো');
});
