/**
 * Part-18.9 — আবেদনপত্র-লেআউট (দোকানের আসল নমুনা থেকে মাপা) + বিজয়ে '_' '×' চিহ্নের ঠিক
 * নকশা: A4 পোর্ট্রেট, উপরে ১" বামে ১.২৫" ডানে/নিচে ০.৭৫", ১৩pt, লাইন ১.২, অংশের মাঝে একটি ফাঁকা লাইন;
 * বরাবর/বিষয়/জনাব/নিবেদক বোল্ড, নিবেদক বামে + স্বাক্ষরের ২ লাইন, তফসিল-টেবিল মাঝে বর্ডারসহ,
 * সংযুক্তি ডট-লিডারে কপি-সংখ্যা। লম্বা হলে ধাপে ধাপে মার্জিন/ফন্ট কমিয়ে এক পাতায় (দোকানের চাকরির আবেদনের মতো)।
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
  ['McqLayoutPlanner', 'js/layout-engine/mcq-layout-planner.js'], ['TextRunProcessor', 'js/layout-engine/text-run-processor.js'],
  ['FayzarExamRenumber', 'js/layout-engine/exam-renumber.js'], ['FayzarFrontmatter', 'js/layout-engine/frontmatter-header.js'],
  ['QuestionEngine', 'js/engines/question-engine.js'], ['DocClassifier', 'js/engines/doc-classifier.js'],
  ['FayzarApplicationLayout', 'js/layout-engine/application-layout.js']]) {
  const m = require(path.join(ROOT, p));
  if (m && !globalThis[n]) globalThis[n] = m;
}
const AL = globalThis.FayzarApplicationLayout;
const C = globalThis.DocClassifier;
const E = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const Pipeline = require(path.join(ROOT, 'js/layout-engine/fayzar-pipeline.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');
const noFm = (t) => t.replace(/^---[\s\S]*?---\s*/, '');
const CORR = fx('app-correction.input.md'), HOLD = fx('app-holding.input.md'), JOB = fx('app-job.input.md');
const kinds = (m) => m.blocks.map((b) => b.kind + (b.role ? '/' + b.role : '')).join(' > ');

async function docx(text, font) {
  const out = await E.generateWordDoc(text, 'GOVT_APP', { format: 'docx', font });
  const buf = Buffer.isBuffer(out) ? out : Buffer.from(await out.arrayBuffer());
  return (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');
}
async function rtf(text, font) {
  const b = E.generateWordDoc(text, 'GOVT_APP', { format: 'doc', font });
  return Buffer.from(await b.arrayBuffer()).toString('utf8');
}

// ------------------------------------------------------------- ধরন ও পার্স
test('ক্লাসিফিকেশন: তিন নমুনাই GOVT_APP (ফ্রন্টম্যাটারসহ ও ছাড়া)', () => {
  for (const t of [CORR, HOLD, JOB]) assert.equal(C.classify(t).type, 'GOVT_APP');
  assert.equal(C.classify(noFm(HOLD)).type, 'GOVT_APP');
  assert.equal(C.classify(noFm(CORR)).type, 'GOVT_APP');
});

test('পার্স: উৎসের ক্রম অক্ষত, প্রতিটি অংশ ঠিক ব্লকে', () => {
  assert.equal(kinds(AL.parse(noFm(CORR))), 'line/date > lines/receiver > subject > line/salutation > para/body > para/body > para/prayer > table > closing > attach');
  assert.equal(kinds(AL.parse(noFm(HOLD))), 'line/date > lines/receiver > subject > line/salutation > para/body > para/prayer > heading > caption > table > closing > attach');
  assert.equal(kinds(AL.parse(noFm(JOB))), 'line/date > lines/receiver > subject > line/salutation > para/body > kv > table > para/prayer > closing > attach');
  const job = AL.parse(noFm(JOB));
  const kv = job.blocks.find((b) => b.kind === 'kv');
  assert.equal(kv.rows.length, 12);
  assert.deepEqual(kv.rows[3].more.length, 1, 'ঠিকানার দ্বিতীয় লাইন মানের নিচে');
  const at = AL.parse(noFm(HOLD)).blocks.find((b) => b.kind === 'attach');
  assert.equal(at.items.length, 4); assert.equal(at.items[0].count, '১ কপি'); assert.match(at.total, /মোট/);
});

test('পার্স-নিরাপত্তা: "আবেদনকারীর জমি…" জাতীয় বাক্য সমাপ্তি নয়; মোড়ানো বিষয়-লাইন জোড়া লাগে', () => {
  const t = ['বরাবর,', 'জেলা প্রশাসক', 'বিষয়: জমির নামজারি সংক্রান্ত', 'আবেদন।', 'জনাব,', 'আবেদনকারীর জমি দীর্ঘদিন ধরে বেদখল অবস্থায় আছে।', 'নিবেদক,', '(করিম)'].join('\n');
  const m = AL.parse(t);
  assert.equal(kinds(m), 'lines/receiver > subject > line/salutation > para/body > closing');
  assert.match(m.blocks[1].text, /সংক্রান্ত আবেদন।$/);
});

// ------------------------------------------------------------- .docx
test('.docx নকশা: মার্জিন, ১৩pt/১.২, বোল্ড লেবেল, বিষয় পুরো বোল্ড, তফসিল-টেবিল মাঝে বর্ডারসহ, ডট-লিডার', async () => {
  const xml = await docx(HOLD, 'bijoy');
  assert.match(xml, /<w:pgSz w:w="11906" w:h="16838"\/>/);
  assert.match(xml, /<w:pgMar w:top="1440" w:right="1080" w:bottom="1080" w:left="1800"/, 'এক পাতায় ধরে — দোকানের সাধারণ মাপ');
  assert.match(xml, /w:line="288" w:lineRule="auto"/);
  assert.match(xml, /<w:b\/><w:sz w:val="26"\/>/);
  assert.match(xml, /<w:tbl><w:tblPr><w:tblW w:w="\d+" w:type="dxa"\/><w:jc w:val="center"\/><w:tblBorders><w:top w:val="single"/);
  assert.match(xml, /<w:cantSplit\/>/);
  assert.match(xml, /<w:tab w:val="left" w:leader="dot" w:pos="\d+"\/>/);
  assert.doesNotMatch(xml, /বিনীত নিবেদক/, 'উৎসে যা নেই তা বসে না');
});

test('.docx: নিবেদক বামে (ইনডেন্ট নয়) + স্বাক্ষরের জন্য ২টি ফাঁকা লাইন', async () => {
  const body = AL.renderDocx(AL.parse(noFm(HOLD)), { runs: (t, st) => '<w:r>' + (st && st.b ? '<w:b/>' : '') + '<w:t>' + t + '</w:t></w:r>', isBijoy: true });
  const i = body.indexOf('<w:t>নিবেদক,</w:t>');
  assert.ok(i > 0);
  const para = body.slice(body.lastIndexOf('<w:p>', i), i);
  assert.doesNotMatch(para, /w:ind/);
  const after = body.slice(i);
  assert.match(after, /^<w:t>নিবেদক,<\/w:t><\/w:r><\/w:p>(?:<w:p><w:pPr><w:keepNext\/><w:spacing [^>]*\/><\/w:pPr><\/w:p>){2}/);
});

// ------------------------------------------------------------- Word 2003
test('.doc (Word 2003 RTF): একই মাপ, ডট-লিডার, টেবিল ভাঙে না', async () => {
  const s = await rtf(HOLD, 'bijoy');
  assert.match(s, /\\paperw11906\\paperh16838\\margl1800\\margr1080\\margt1440\\margb1080/);
  assert.match(s, /\\sl288\\slmult1/);
  assert.match(s, /\\tldot\\tx\d+/);
  assert.match(s, /\\trkeep/);
  assert.match(s, /\\clbrdrt\\brdrs/);
});

// ------------------------------------------------------------- এক পাতায় ধরানো (Word-এ মাপা)
test('এক পাতায় ধরানো: ছোট আবেদন সাধারণ মাপে; চাকরির আবেদন (বিজয়) আঁটসাঁট ধাপে; না ধরলে সাধারণ মাপ', () => {
  const g = (t, b) => AL.geometry(AL.parse(noFm(t)), { isBijoy: b });
  assert.equal(g(HOLD, true).fitStep || 0, 0);
  assert.equal(g(CORR, true).fitStep || 0, 0);
  assert.equal(g(JOB, true).fitStep, 3, 'Word-এ মাপা: ধাপ ২-এ দুই পাতা, ধাপ ৩-এ এক পাতা');
  assert.equal(g(JOB, false).fitStep || 0, 0, 'কালপুরুষে আঁটসাঁট মাপেও ধরে না → সাধারণ মাপে দুই পাতা');
  assert.equal(g(HOLD, false).fitStep, 3, 'কালপুরুষে হোল্ডিং-আবেদন আঁটসাঁট মাপে এক পাতা');
});

// ------------------------------------------------------------- প্রিভিউ = ডাউনলোড
test('প্রিভিউ: পাইপলাইন একই মডেল থেকে — পাতা-প্যাডিং, টেবিল, ডট-লিডার', async () => {
  const res = await Pipeline.process(HOLD, { outputFormat: 'html', font: 'bijoy' });
  assert.equal(res.docType, 'GOVT_APP');
  assert.equal(res.parsedData.kind, 'GOVT_APP_LAYOUT');
  assert.match(res.content, /official-application-layout/);
  assert.match(res.content, /padding: 1\.00in 0\.75in 0\.75in 1\.25in/);
  assert.match(res.content, /<table/);
  assert.match(res.content, /dotted/);
  assert.match(res.content, /তফসিল/);
});

// ------------------------------------------------------------- বিজয়ে '_' '×'
// SutonnyMJ রানের ভেতরে '_' বা '×' থাকা চলবে না (Times New Roman বা Cambria Math রানে থাকলে ঠিক আছে)
const inSutonny = (xml, ch) => [...xml.matchAll(/<w:r><w:rPr>(?:(?!<\/w:rPr>).)*?SutonnyMJ(?:(?!<\/w:rPr>).)*<\/w:rPr><w:t[^>]*>([^<]*)<\/w:t>/g)].some((m) => m[1].includes(ch));

test('বিজয়: "_" ও "×" SutonnyMJ রানে নয় (সেখানে থ/ম দেখাত); ইউনিকোড অপরিবর্তিত', () => {
  const bj = E.renderDocxRuns('ক. কথা বলতে ______ বয়ে গেল। ১×৫=৫', { font: 'bijoy' }, { sz: 24 });
  assert.match(bj, /Times New Roman[^<]*"\/><\/w:rPr><w:t xml:space="preserve">______<\/w:t>/);
  assert.ok(bj.includes('×') && !inSutonny(bj, '×'), '× আছে, কিন্তু SutonnyMJ রানে নয়');
  assert.ok(!inSutonny(bj, '___'), 'শূন্যস্থানের দাগ SutonnyMJ রানে নয় (একক _ = বিজয়ের থ, সেটি ঠিক আছে)');
  const lone = E.renderDocxRuns('গুণ চিহ্ন × দেখাও', { font: 'bijoy' }, { sz: 24 });
  assert.ok(lone.includes('×') && !inSutonny(lone, '×'), 'একা × (সংখ্যার মাঝে নয়) — Times New Roman রানে');
  // ইউনিকোড-মাস্টারেও আলাদা রান — সাইটের বিজয় ফাইল মাস্টার থেকে রূপান্তরে হয়, বাংলা-ছাড়া রান অক্ষত থাকে
  const uni = E.renderDocxRuns('ক. কথা বলতে ______ বয়ে গেল।', { font: 'Kalpurush' }, { sz: 24 });
  assert.match(uni, /Times New Roman[^<]*"\/><\/w:rPr><w:t xml:space="preserve">______<\/w:t>/);
  const r = E.formatRtfText('গুণ চিহ্ন × দেখাও', { font: 'bijoy' });
  assert.match(r, /\{\\f1 \\u215\?\}/, '.doc-এও × আলাদা ল্যাটিন রান');
});

test('বিজয় প্রশ্নপত্র: নম্বর-অংশ "১×৫=৫" ও শূন্যস্থান "______" SutonnyMJ রানে নয় (Word ফাইলে)', async () => {
  const t = ['শ্রেণি: চতুর্থ; বিষয়: বাংলা', '১। নিচের শব্দগুলোর অর্থ লিখ: ১×৫=৫', 'আঁধার, হোথা', '২। শূন্যস্থান পূরণ কর: ১×৫=৫', 'ক. কথা বলতে ______ বয়ে গেল।'].join('\n');
  const out = await E.generateWordDoc(t, 'EXAM_GENERAL', { format: 'docx', font: 'bijoy' });
  const xml = await (await JSZip.loadAsync(Buffer.from(await out.arrayBuffer()))).file('word/document.xml').async('string');
  assert.ok(xml.includes('×') && !inSutonny(xml, '×'), '× আছে, SutonnyMJ রানে নয়');
  assert.ok(xml.includes('______') && !inSutonny(xml, '___'), '______ আছে, SutonnyMJ রানে নয়');
});
