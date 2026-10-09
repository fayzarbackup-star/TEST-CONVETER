/**
 * Part-18.9 — এক কলামের পত্র (ব্যবহারকারীর সিদ্ধান্ত ২০২৬-১০-০৯: "এক কলামের সৃজনশীল পত্র লম্বালম্বি হয়, ইংরেজির মতো সাধারণ")
 *  - EXAM_ONECOL প্রোফাইল: A4 লম্বালম্বি, ১ কলাম, হেডার উপরে (সৃজনশীলে "সৃজনশীল অভীক্ষা" লেবেল থাকে)
 *  - স্বয়ংক্রিয়: Gemini-র `source_columns: 1` (শুধু ছাপা উৎসে; হাতে-লেখায় 0) → এক কলাম
 *  - ফলাফল-পাতার বোতাম (state.layoutColumns = 1 | 2 | 'auto') সবকিছুর ওপরে; ২য়–৫ম শ্রেণির নিয়ম স্বয়ংক্রিয়ে অগ্রাধিকার পায়
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
const FM = globalThis.FayzarFrontmatter;
const E = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');
const noFm = (t) => t.replace(/^---[\s\S]*?---\s*/, '');
const CQ = noFm(fx('cq-booklet-6.input.md'));
const MCQ = noFm(fx('mcq-pure-28.input.md'));

async function docxXml(text, type, opts = {}) {
  const out = await E.generateWordDoc(text, type, { format: 'docx', font: 'Kalpurush', ...opts });
  const buf = Buffer.isBuffer(out) ? out : Buffer.from(await out.arrayBuffer());
  return (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');
}
const withFm = (body, extra) => '---\ndoc_type: EXAM_CQ\n' + extra + '\n---\n' + body;

test('প্রোফাইল-চাবি: বোতাম > ২য়–৫ম শ্রেণি > উৎসের কলাম', () => {
  const pd = { header: {} };
  assert.equal(P.layoutKey('EXAM_CQ', pd, { layoutColumns: 1 }), 'EXAM_ONECOL');
  assert.equal(P.layoutKey('EXAM_CQ', pd, { __frontmatter: { source_columns: '1' } }), 'EXAM_ONECOL', 'স্বয়ংক্রিয়: ছাপা উৎস এক কলাম');
  assert.equal(P.layoutKey('EXAM_CQ', pd, { __frontmatter: { source_columns: '0' } }), 'EXAM_CQ', 'হাতে-লেখা/অজানা → বুকলেট');
  assert.equal(P.layoutKey('EXAM_CQ', pd, { __frontmatter: { source_columns: '1' }, layoutColumns: 2 }), 'EXAM_CQ', 'বোতাম "২ কলাম" উৎসের ওপরে');
  assert.equal(P.layoutKey('EXAM_GENERAL', pd, { grade: 4, __frontmatter: { source_columns: '1' } }), 'EXAM_PRIMARY', '২য়–৫ম: শ্রেণির নিয়ম স্বয়ংক্রিয়ে অগ্রাধিকার');
  assert.equal(P.layoutKey('EXAM_GENERAL', pd, { grade: 4, layoutColumns: '1' }), 'EXAM_ONECOL', 'বোতাম সবকিছুর ওপরে');
  assert.equal(P.layoutKey('EXAM_GENERAL', pd, { grade: 8, __frontmatter: { source_columns: '১' } }), 'EXAM_ONECOL', 'বাংলা অঙ্কও');
  assert.equal(P.layoutKey('EXAM_MCQ', pd, { layoutColumns: 1 }), 'EXAM_MCQ', 'বহুনির্বাচনি এ পথে নয়');
  assert.equal(P.layoutKey('EXAM_CQ', pd, { __frontmatter: { columns: '1' } }), 'EXAM_CQ', 'পুরোনো "columns" তথ্য (ধরন-ভিত্তিক) গণ্য নয়');
});

test('জ্যামিতি: A4 লম্বালম্বি, ১ কলাম, ০.৫" মার্জিন — রপ্তানির columns:2 ডিফল্ট উপেক্ষিত', () => {
  const g = P.geometry({ docType: 'EXAM_CQ', profileKey: 'EXAM_ONECOL', cols: 2 });
  assert.equal(g.pageW, 11906); assert.equal(g.pageH, 16838); assert.equal(g.landscape, false);
  assert.equal(g.cols, 1); assert.equal(g.margin, 720);
  assert.equal(g.colW, 11906 - 1440);
});

test('.docx (বোতাম "১ কলাম"): সৃজনশীল পত্র লম্বালম্বি এক কলামে, কলাম-ব্রেক নেই, "সৃজনশীল অভীক্ষা" লেবেল থাকে', async () => {
  const xml = await docxXml(CQ, 'EXAM_CQ', { layoutColumns: 1 });
  assert.match(xml, /<w:pgSz w:w="11906" w:h="16838"\/>/);
  assert.doesNotMatch(xml, /w:orient="landscape"/);
  assert.match(xml, /<w:cols w:num="1" w:space="\d+"\/>/);
  assert.doesNotMatch(xml, /<w:br w:type="column"\/>/);
  assert.match(xml, /সৃজনশীল অভীক্ষা/);
  const base = await docxXml(CQ, 'EXAM_CQ');
  assert.match(base, /w:orient="landscape"/, 'বাছাই ছাড়া আগের মতো বুকলেট');
});

test('.docx (স্বয়ংক্রিয়): ফ্রন্টম্যাটারে source_columns: 1 → এক কলাম; 0 → বুকলেট', async () => {
  const one = await docxXml(withFm(CQ, 'source_columns: 1'), 'EXAM_CQ');
  assert.doesNotMatch(one, /w:orient="landscape"/);
  assert.match(one, /<w:cols w:num="1"/);
  const zero = await docxXml(withFm(CQ, 'source_columns: 0'), 'EXAM_CQ');
  assert.match(zero, /w:orient="landscape"/);
});

test('.doc (Word 2003 RTF): লম্বালম্বি, \\cols1, \\landscape নেই', async () => {
  const blob = E.generateWordDoc(CQ, 'EXAM_CQ', { format: 'doc', layoutColumns: 1 });
  const rtf = Buffer.from(await blob.arrayBuffer()).toString('utf8');
  assert.doesNotMatch(rtf, /\\landscape/);
  assert.match(rtf, /\\paperw11906\\paperh16838/);
  assert.match(rtf, /\\cols1/);
});

test('যৌথ পত্র + "১ কলাম": সৃজনশীল অংশ লম্বালম্বি এক কলাম, বহুনির্বাচনি অংশ আগের মতো', async () => {
  const xml = await docxXml(CQ.trim() + '\n\n---SECTION_BREAK:MCQ---\n\n' + MCQ.trim(), 'EXAM_COMBINED', { layoutColumns: 1 });
  const sects = xml.match(/<w:sectPr>[\s\S]*?<\/w:sectPr>/g) || [];
  assert.match(sects[0], /<w:cols w:num="1"/);
  assert.doesNotMatch(sects[0], /landscape/);
  assert.match(sects[sects.length - 1], /<w:cols w:num="2" w:space="288" w:sep="1"\/>/, 'বহুনির্বাচনির নিজস্ব ২ কলাম');
});

test('প্রিভিউ = ডাউনলোড: এক কলামে প্রতি পাতা A4 লম্বালম্বি, বুকলেট-লেবেল নেই', () => {
  const parsed = Q.parseQuestionPaper(CQ, { docType: 'EXAM_CQ' });
  const html = Q.renderToHtml(parsed, { docType: 'EXAM_CQ', orientation: 'landscape', layoutColumns: 1 });
  assert.match(html, /A4 লম্বালম্বি, ১ কলাম/);
  assert.match(html, /size-a4-portrait/);
  assert.doesNotMatch(html, /ব্যাক কভার/);
});

test('OCR-প্রম্পট: source_columns তথ্য চাওয়া হয়, হাতে-লেখায় 0', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/ai-ocr-engine.js'), 'utf8');
  assert.match(src, /source_columns: <1, 2 or 0/);
  assert.match(src, /Handwritten drafts are always 0/);
});

test('স্তরযুক্ত সাধারণ পত্র (ঙ-লেবেল): মূল প্রশ্নের নিচের লেবেলহীন লাইন আলাদা (উদ্দীপক), প্রশ্নে জোড়া নয়', () => {
  const GP = require(path.join(ROOT, 'js/layout-engine/general-paper-parser.js'));
  const body = noFm(fx('primary-class4-bangla.input.md'));
  assert.ok(GP.isNested(body), 'ঙ. দুবার → স্তরযুক্ত পার্সার (ব্রাউজারের মতো)');
  const qs = Q.parseQuestionPaper(body, { docType: 'EXAM_GENERAL' }).sections.flatMap((s) => s.questions);
  const q1 = qs.find((q) => q.num === '১');
  assert.match(q1.text, /১×৫=৫$/, 'নম্বর প্রশ্ন-লাইনের শেষে (রাইট-ট্যাবে বসে)');
  assert.match(q1.stimulus, /^আঁধার, ফেরিওয়ালা/);
  const q2 = qs.find((q) => q.num === '২');
  assert.equal(q2.subQuestions.map((s) => s.label).join(''), 'কখগঘঙ');
});

test('সাইটের বিজয়/.doc: ইউনিকোড-মাস্টারের এক-পাতা-ফিট শেষ ফন্টের (SutonnyMJ) মাপে', async () => {
  const JOB = fx('app-job.input.md');
  const forBijoy = await docxXml(JOB, 'GOVT_APP', { targetFont: 'bijoy' });
  assert.match(forBijoy, /<w:pgMar w:top="720" w:right="720" w:bottom="540" w:left="1152"/, 'বিজয়ের জন্য আঁটসাঁট ধাপে এক পাতা');
  const forUnicode = await docxXml(JOB, 'GOVT_APP', { targetFont: 'unicode' });
  assert.match(forUnicode, /<w:pgMar w:top="1440" w:right="1080" w:bottom="1080" w:left="1800"/, 'ইউনিকোডে ধরে না → সাধারণ মাপ');
  const eng = fs.readFileSync(path.join(ROOT, 'js/ai-ocr-engine.js'), 'utf8');
  assert.equal((eng.match(/targetFont: format === 'unicode_docx' \? 'unicode' : 'bijoy'/g) || []).length, 3);
});

test('সাইটের ডাউনলোড ও ফলাফল-পাতা: কলাম-পছন্দ ইঞ্জিনে যায়', () => {
  const eng = fs.readFileSync(path.join(ROOT, 'js/ai-ocr-engine.js'), 'utf8');
  assert.equal((eng.match(/layoutColumns: \(state\.layoutColumns \|\| 'auto'\)/g) || []).length, 3, 'চিত্রসহ, মাস্টার ও .doc তিন পথেই');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /id="colPick"/);
  for (const v of ['auto', '1', '2']) assert.match(html, new RegExp('data-cols="' + v + '"'));
});
