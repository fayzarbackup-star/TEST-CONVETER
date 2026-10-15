/**
 * Part-18.9 — ব্যবহারকারীর সিদ্ধান্ত (২০২৬-১০-০৯):
 *  (ক) ২য়–৫ম শ্রেণির সাধারণ পত্র (EXAM_GENERAL) → EXAM_PRIMARY প্রোফাইল: A4 ল্যান্ডস্কেপ, ২ কলাম,
 *      ০.৭" গ্যাপ, কলাম-লাইন নেই, হেডার কলামের শীর্ষে; ২ কলামে ধরলে এক পাতা, বেশি হলে বুকলেট।
 *      (দোকানের আসল ৪র্থ শ্রেণির বাংলা/গণিত পত্র থেকে মাপা।) ১ম ও ৬ষ্ঠ+ শ্রেণি আগের মতো।
 *  (খ) শুধু-সৃজনশীল ও শুধু-বহুনির্বাচনি পত্র = যৌথ পত্রের সংশ্লিষ্ট অংশের হুবহু লেআউট।
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
  ['QuestionEngine', 'js/engines/question-engine.js'], ['DocClassifier', 'js/engines/doc-classifier.js']]) {
  const m = require(path.join(ROOT, p));
  if (m && !globalThis[n]) globalThis[n] = m;
}
const P = globalThis.CqBookletPlanner;
const Q = globalThis.QuestionEngine;
const C = globalThis.DocClassifier;
const FM = globalThis.FayzarFrontmatter;
const E = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');

const CLASS4 = fx('primary-class4-bangla.input.md');
const noFm = (t) => t.replace(/^---[\s\S]*?---\s*/, '');

async function docxXml(text, type, opts = {}) {
  const out = await E.generateWordDoc(text, type, { format: 'docx', ...opts });
  const buf = Buffer.isBuffer(out) ? out : Buffer.from(await out.arrayBuffer());
  return (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');
}
async function rtfText(text, type) {
  const blob = await E.generateWordDoc(text, type, { format: 'doc' });
  return Buffer.isBuffer(blob) ? blob.toString('utf8') : Buffer.from(await blob.arrayBuffer()).toString('utf8');
}
const qData = (n, words = 30) => ({
  header: { institute: 'আদর্শ মডেল স্কুল', classAndSubject: 'শ্রেণি: চতুর্থ; বিষয়: বাংলা' },
  sections: [{ title: '', questions: Array.from({ length: n }, (_, i) => ({ num: String(i + 1), text: 'বাংলা শব্দ '.repeat(words), preContext: '', stimulus: '', statements: [], subQuestions: [], options: [] })) }]
});

// ---------------------------------------------------------------- (ক) শ্রেণি → প্রোফাইল
test('শ্রেণি পড়া: অঙ্ক, ক্রমবাচক, বাংলা শব্দ, ইংরেজি শব্দ', () => {
  assert.equal(P.parseGrade('৪'), 4);
  assert.equal(P.parseGrade('৪র্থ'), 4);
  assert.equal(P.parseGrade('চতুর্থ'), 4);
  assert.equal(P.parseGrade('Four'), 4);
  assert.equal(P.parseGrade('প্রাক-প্রাথমিক'), 0);
  assert.equal(P.parseGrade('................'), 0);
  assert.equal(P.gradeOf({ header: { classAndSubject: 'শ্রেণি: চতুর্থ; বিষয়: বাংলা' } }), 4);
  assert.equal(P.gradeOf({ header: { classAndSubject: 'শ্রেণিঃ ৫ম  |  বিষয়: গণিত' } }), 5);
  assert.equal(P.gradeOf({ header: { classAndSubject: 'Class: Three' } }), 3);
  assert.equal(P.gradeOf({ header: {} }, { __frontmatter: { grade: '2' } }), 2);
  assert.equal(P.gradeOf({ header: {} }, { grade: 'পঞ্চম' }), 5);
});

test('প্রোফাইল-চাবি: শুধু EXAM_GENERAL + ২য়–৫ম শ্রেণি → EXAM_PRIMARY', () => {
  const g = (n) => ({ header: {} , __n: n });
  for (const n of [2, 3, 4, 5]) assert.equal(P.layoutKey('EXAM_GENERAL', g(n), { grade: n }), 'EXAM_PRIMARY', 'শ্রেণি ' + n);
  for (const n of [0, 1, 6, 8, 10]) assert.equal(P.layoutKey('EXAM_GENERAL', g(n), { grade: n }), 'EXAM_GENERAL', 'শ্রেণি ' + n);
  for (const t of ['EXAM_CQ', 'EXAM_MATH', 'EXAM_COMBINED']) assert.equal(P.layoutKey(t, g(4), { grade: 4 }), t, t + ' বদলায় না');
});

test('EXAM_PRIMARY জ্যামিতি = দোকানের আসল ৪র্থ শ্রেণির পত্র (A4 ল্যান্ডস্কেপ, ০.৫" মার্জিন, ০.৭" গ্যাপ, লাইন নেই)', () => {
  const geo = P.geometry({ docType: 'EXAM_GENERAL', profileKey: 'EXAM_PRIMARY' });
  assert.equal(geo.pageW, 16838); assert.equal(geo.pageH, 11906); assert.equal(geo.landscape, true);
  assert.equal(geo.margin, 720); assert.equal(geo.cols, 2); assert.equal(geo.colGap, 1008); assert.equal(geo.colSep, false);
  const plan = P.plan(qData(3), { docType: 'EXAM_GENERAL' });
  assert.equal(plan.profileKey, 'EXAM_PRIMARY');
  assert.equal(plan.headerSpan, 'column');
  assert.ok(plan.headerLines.every((l) => (l.center || '') !== 'সৃজনশীল অভীক্ষা'), 'সাধারণ পত্রে "সৃজনশীল অভীক্ষা" লেবেল নয়');
});

test('অটো-বুকলেট: ১–২ কলাম = এক পাতা (কলাম ১ থেকে), ৩ কলাম = ব্যাক কভার ফাঁকা, ৪+ = ব্যাক কভারে উপচানো অংশ', () => {
  const colsOf = (pl) => pl.columns.filter((c) => c.role !== 'backcover').length;
  let n = 1, plan;
  plan = P.plan(qData(2), { docType: 'EXAM_GENERAL' });
  assert.equal(colsOf(plan), 1); assert.equal(plan.skipFirstColumn, false);
  // ঠিক ২ কলাম
  for (n = 2; n < 200; n++) { plan = P.plan(qData(n), { docType: 'EXAM_GENERAL' }); if (colsOf(plan) === 2) break; }
  assert.equal(colsOf(plan), 2, '২-কলামের নমুনা পাওয়া গেছে');
  assert.equal(plan.skipFirstColumn, false); assert.equal(plan.metrics.reservedUsed, false);
  assert.equal(plan.columns[0].role, 'page1'); assert.equal(plan.columns[0].breakBefore, false);
  // ৩ কলাম
  for (; n < 400; n++) { plan = P.plan(qData(n), { docType: 'EXAM_GENERAL' }); if (colsOf(plan) === 3) break; }
  assert.equal(colsOf(plan), 3, '৩-কলামের নমুনা পাওয়া গেছে');
  assert.equal(plan.skipFirstColumn, true, '৩ কলাম → বুকলেট, শীট-১-এর ১ম কলাম ফাঁকা');
  // ৪+ কলাম
  plan = P.plan(qData(n * 2), { docType: 'EXAM_GENERAL' });
  assert.equal(plan.metrics.reservedUsed, true, 'উপচানো অংশ ব্যাক কভারে');
  // স্পষ্ট skipFirstColumn:false → কখনো বুকলেট নয়
  plan = P.plan(qData(n * 2), { docType: 'EXAM_GENERAL', skipFirstColumn: false });
  assert.equal(plan.skipFirstColumn, false); assert.equal(plan.metrics.reservedUsed, false);
});

test('ক–ঙ উপ-প্রশ্ন: "ঙ." পঞ্চম উপ-প্রশ্ন (আগে বিকল্প হয়ে "(ঙ)" ছাপা হতো); ক্রম না মিললে নয়', () => {
  const qs = Q.parseQuestionPaper(noFm(CLASS4), { docType: 'EXAM_GENERAL' }).sections.flatMap((s) => s.questions);
  for (const n of ['২', '৩']) {
    const q = qs.find((x) => x.num === n);
    assert.equal(q.subQuestions.map((s) => s.label).join(''), 'কখগঘঙ', 'প্রশ্ন ' + n);
    assert.equal(q.options.length, 0);
  }
  const mcq = Q.parseQuestionPaper('১। কোনটি ফল?\nক. আম খ. জাম গ. কাঁঠাল ঘ. লিচু', { docType: 'EXAM_MCQ' }).sections[0].questions[0];
  assert.equal(mcq.options.length, 4, 'বহুনির্বাচনি অপরিবর্তিত');
});

test('ক্লাসিফিকেশন অপরিবর্তিত: ৪র্থ শ্রেণির পত্র EXAM_GENERAL-ই থাকে (ডকটাইপ বদলায় না)', () => {
  assert.equal(C.classify(CLASS4).type, 'EXAM_GENERAL');
  assert.equal(C.classify(noFm(CLASS4)).type, 'EXAM_GENERAL');
});

test('.docx: ৪র্থ শ্রেণি → ল্যান্ডস্কেপ ২-কলাম ০.৭" গ্যাপ, লাইন নেই, এক পাতায় কলাম-ব্রেক নেই, হেডার প্রথম প্রশ্নের আগে', async () => {
  for (const text of [CLASS4, noFm(CLASS4)]) {
    const xml = await docxXml(text, 'EXAM_GENERAL');
    assert.match(xml, /<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"\/>/);
    assert.match(xml, /<w:cols w:num="2" w:space="1008"\/>/);
    assert.doesNotMatch(xml, /w:sep="1"/);
    assert.doesNotMatch(xml, /<w:cols w:num="1"\/>/, '১-কলাম হেডার-সেকশন নেই (হেডার কলামে)');
    assert.doesNotMatch(xml, /<w:br w:type="column"\/>/, '২ কলামে ধরে — ব্যাক কভারের ব্রেক নয়');
    const iHead = xml.indexOf('আদর্শ মডেল স্কুল'), iQ1 = xml.indexOf('নিচের শব্দগুলোর অর্থ');
    assert.ok(iHead > 0 && iQ1 > iHead, 'হেডার আগে, তারপর প্রশ্ন');
  }
});

test('.doc (Word 2003): একই জ্যামিতি — \\landscape, ২ কলাম, \\colsx1008, \\linebetcol নেই', async () => {
  const rtf = await rtfText(CLASS4, 'EXAM_GENERAL');
  assert.match(rtf, /\\landscape\\paperw16838\\paperh11906/);
  assert.match(rtf, /\\cols2\\colsx1008/);
  assert.doesNotMatch(rtf, /\\linebetcol/);
});

test('প্রিভিউ = ডাউনলোড: ৪র্থ শ্রেণির প্রিভিউ ল্যান্ডস্কেপ কলাম-প্ল্যানে, এক পাতায় "ব্যাক কভার" লেবেল নেই', () => {
  const fm = FM.split(CLASS4);
  const parsed = Q.parseQuestionPaper(fm.body, { docType: 'EXAM_GENERAL' });
  FM.applyToHeader(parsed.header, fm.fields);
  const html = Q.renderToHtml(parsed, { docType: 'EXAM_GENERAL', __frontmatter: fm.fields });
  assert.match(html, /size-a4-landscape/);
  assert.match(html, /column-gap: 50.4pt/);
  assert.doesNotMatch(html, /ব্যাক কভার/);
});

test('১ম ও ৭ম শ্রেণির সাধারণ পত্র আগের মতো পোর্ট্রেট (০.২৫" গ্যাপ, কলাম-লাইন)', async () => {
  const c1 = CLASS4.replace('grade: 4', 'grade: 1').replace('শ্রেণি: চতুর্থ', 'শ্রেণি: প্রথম');
  const c7 = CLASS4.replace('grade: 4', 'grade: 7').replace('শ্রেণি: চতুর্থ', 'শ্রেণি: সপ্তম');
  for (const t of [c1, c7]) {
    const xml = await docxXml(t, 'EXAM_GENERAL');
    assert.doesNotMatch(xml, /w:orient="landscape"/);
    assert.match(xml, /<w:cols w:num="2" w:space="360" w:sep="1"\/>/);
  }
});

test('আসল OCR (৫ম শ্রেণির বৃত্তি গণিত) → EXAM_PRIMARY ল্যান্ডস্কেপ', async () => {
  const t = fx('real-ocr/class5.md');
  assert.equal(C.classify(t).type, 'EXAM_GENERAL');
  const xml = await docxXml(t, 'EXAM_GENERAL');
  assert.match(xml, /w:orient="landscape"/);
  assert.match(xml, /<w:cols w:num="2" w:space="1008"\/>/);
});

// ---------------------------------------------------------------- (খ) যৌথ ↔ একক সমতা
const INLINE_BREAK = '<w:p><w:pPr><w:sectPr><w:type w:val="nextPage"/>';
const bodyOf = (xml) => xml.replace(/^[\s\S]*?<w:body>/, '').replace(/<\/w:body>[\s\S]*$/, '');
const dropFinalSect = (b) => b.replace(/<w:sectPr>(?:(?!<w:sectPr>)[\s\S])*<\/w:sectPr>\s*$/, '').trim();

for (const [cqF, mcqF] of [['cq-booklet-6.input.md', 'mcq-pure-28.input.md'], ['cq-short.input.md', 'mcq-shrink-21.input.md'], ['cq-long.input.md', 'mcq-mixed-options.input.md']]) {
  test(`যৌথ পত্রের অংশ = একক পত্র (${cqF} + ${mcqF}) — .docx বডি ও পাতার মাপ হুবহু`, async () => {
    // নমুনা-ফাইলের নিজস্ব ফ্রন্টম্যাটার বাদ (আসল OCR-এ ফ্রন্টম্যাটার কেবল ফাইলের শুরুতে একবার) — শুধু লেআউট মেলানো
    const cq = noFm(fx(cqF)), mcq = noFm(fx(mcqF));
    const comb = bodyOf(await docxXml(cq.trim() + '\n\n---SECTION_BREAK:MCQ---\n\n' + mcq.trim(), 'EXAM_COMBINED'));
    const cut = comb.indexOf(INLINE_BREAK);
    assert.ok(cut > 0, 'যৌথ পত্রে সৃজনশীল→বহুনির্বাচনি সেকশন-ব্রেক আছে');
    const end = comb.indexOf('</w:sectPr></w:pPr></w:p>', cut) + '</w:sectPr></w:pPr></w:p>'.length;
    const combCq = comb.slice(0, cut).trim(), combCqSect = comb.slice(cut, end), combMcq = dropFinalSect(comb.slice(end));

    const cqOnlyXml = bodyOf(await docxXml(cq, 'EXAM_CQ'));
    const mcqOnlyXml = bodyOf(await docxXml(mcq, 'EXAM_MCQ'));
    assert.equal(combCq, dropFinalSect(cqOnlyXml), 'সৃজনশীল অংশ হুবহু');
    assert.equal(combMcq, dropFinalSect(mcqOnlyXml), 'বহুনির্বাচনি অংশ হুবহু');
    const geo = (s) => (s.match(/<w:pgSz[^>]*>|<w:pgMar[^>]*>|<w:cols[^>]*>/g) || []).join('');
    assert.equal(geo(combCqSect), geo(cqOnlyXml.match(/<w:sectPr>(?:(?!<w:sectPr>)[\s\S])*<\/w:sectPr>\s*$/)[0]), 'সৃজনশীল পাতার মাপ');
    assert.equal(geo(comb.slice(end)), geo(mcqOnlyXml), 'বহুনির্বাচনি পাতার মাপ (হেডার + বডি সেকশন)');
  });
}
