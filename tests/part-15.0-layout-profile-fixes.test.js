'use strict';

// Part-15.0 regression gates (অডিট ২০২৬-১০-০৪-এর ধাপ ১–৪):
//  ১) EXAM_GENERAL = A4 পোর্ট্রেট, ১-কলাম হেডার + কন্টিনিউয়াস ২-কলাম বডি, CQ লেবেল/কাল্পনিক মান নেই
//  ২) ইংরেজি পত্রের হেডার, `Part-A` শিরোনাম, `1.` নম্বর, `(a)` উপ-প্রশ্ন ও ডানে মার্ক অক্ষত
//  ৩) schema-validator ব্যর্থ হলেও এক্সপোর্ট থামে না
//  ৪) যৌথ পত্র চিহ্ন ছাড়াও CQ (ল্যান্ডস্কেপ) → MCQ (পোর্ট্রেট) আলাদা হয়
// চালানো: node tests/part-15.0-layout-profile-fixes.test.js

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
globalThis.Blob = globalThis.Blob || require('node:buffer').Blob;
require(path.join(ROOT, 'tests/lib/harness.js')).loadEngines();
const { CqBookletPlanner, QuestionEngine, ExportDualEngine, DocClassifier } = globalThis;

let gates = 0;
const check = (cond, msg) => { assert.ok(cond, msg); gates++; };
const decode = (rtf) => String(rtf).replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode(+n < 0 ? +n + 65536 : +n));

const PRIMARY = [
  'ফুলবাড়ী সরকারি প্রাথমিক বিদ্যালয়',
  '২য় সাময়িক পরীক্ষা - ২০২৬',
  '১। শূন্যস্থান পূরণ কর: ১×৫=৫',
  '(ক) আমাদের দেশের নাম ______।',
  '২। নদী কাকে বলে? ২'
].join('\n');

const ENGLISH = [
  'Fulbari Govt. High School',
  'Half Yearly Examination 2026',
  'Class: Eight   Subject: English 2nd Paper',
  'Time: 2 hours   Full Marks: 50',
  'Part-A: Grammar (30 Marks)',
  '1. Fill in the blanks with suitable articles. [0.5×10=5]',
  '(a) He is ___ honest man.',
  '(b) I saw ___ elephant.',
  '2. Rewrite the sentences correctly. [1×5=5]'
].join('\n');

(async () => {
  // ---- ১) EXAM_GENERAL প্রোফাইল ----
  const prof = CqBookletPlanner.profile('EXAM_GENERAL');
  check(prof.landscape === false && prof.booklet === false && prof.headerSpan === 'page', 'GENERAL profile: portrait, no booklet, page-wide header');
  const cqProf = CqBookletPlanner.profile('EXAM_CQ');
  check(cqProf.landscape === true && cqProf.booklet === true && cqProf.colGap === 1008, 'CQ profile unchanged');

  const pGen = QuestionEngine.parseQuestionPaper(PRIMARY, { docType: 'EXAM_GENERAL' });
  const plan = CqBookletPlanner.plan(pGen, { docType: 'EXAM_GENERAL' });
  check(plan.geometry.pageW === 11906 && plan.geometry.pageH === 16838, 'GENERAL page is A4 portrait');
  check(plan.geometry.colGap === 360 && plan.geometry.colSep === true, 'GENERAL gap 0.25" with column line');
  check(plan.skipFirstColumn === false && !plan.columns.some((c) => c.breakBefore), 'GENERAL starts at column 1, no forced breaks');

  const rtfGen = decode(await ExportDualEngine.generateWordDoc(PRIMARY, 'EXAM_GENERAL', { format: 'doc', font: 'unicode' }).text());
  check(!/\\landscape/.test(rtfGen), 'GENERAL RTF has no \\landscape');
  check(/\\paperw11906\\paperh16838[^\n]*\\cols1/.test(rtfGen), 'GENERAL RTF header section is 1 column');
  check(/\\sect\\sbknone\\cols2\\colsx360\\linebetcol/.test(rtfGen), 'GENERAL RTF continuous 2-col body');
  check(!rtfGen.includes('{\\column}'), 'GENERAL RTF has no reserved back-cover column');
  check(rtfGen.includes('ফুলবাড়ী সরকারি প্রাথমিক বিদ্যালয়'), 'primary school institute name kept (বিদ্যালয় recognised)');
  check(!rtfGen.includes('সৃজনশীল অভীক্ষা') && !rtfGen.includes('৩০ মিনিট'), 'GENERAL: no CQ label, no invented time');

  const docxGen = await ExportDualEngine.generateCqExamDocx(pGen, { docType: 'EXAM_GENERAL' });
  check(docxGen && docxGen.size > 0, 'GENERAL DOCX generated');
  const inner = await ExportDualEngine.generateCqExamDocx(pGen, { docType: 'EXAM_GENERAL', returnInnerXml: true });
  check(!/w:orient="landscape"/.test(inner.sectPr) && /w:space="360" w:sep="1"/.test(inner.sectPr), 'GENERAL DOCX sectPr portrait 2-col');

  const prevGen = QuestionEngine._renderToHtmlCore(pGen, { docType: 'EXAM_GENERAL', orientation: 'landscape' });
  check(!prevGen.includes('ব্যাক কভার') && !prevGen.includes('সৃজনশীল অভীক্ষা'), 'GENERAL preview is not a booklet and has no CQ label');

  // ---- ২) ইংরেজি পত্র ----
  const pEn = QuestionEngine.parseQuestionPaper(ENGLISH, { docType: 'EXAM_GENERAL' });
  check(pEn.header.institute === 'Fulbari Govt. High School', 'English institute parsed');
  check(pEn.header.exam === 'Half Yearly Examination 2026', 'English exam parsed');
  check(pEn.header.time === '2 hours' && pEn.header.marks === '50', 'English time/marks parsed');
  check(/Class: Eight/.test(pEn.header.classAndSubject) && /Subject: English/.test(pEn.header.classAndSubject), 'English class/subject parsed');
  check(pEn.sections.some((s) => /^Part-A/.test(s.title)), 'Part-A heading kept as section title');
  check(CqBookletPlanner.paperLang(pEn) === 'en' && CqBookletPlanner.paperLang(pGen) === 'bn', 'paper language detection');

  const rtfEn = decode(await ExportDualEngine.generateWordDoc(ENGLISH, 'EXAM_GENERAL', { format: 'doc' }).text());
  for (const s of ['Fulbari Govt. High School', 'Half Yearly Examination 2026', 'Time: 2 hours', 'Full Marks: 50', 'Part-A: Grammar']) {
    check(rtfEn.includes(s), 'English RTF keeps: ' + s);
  }
  check(!rtfEn.includes('আপনার প্রতিষ্ঠানের নাম') && !rtfEn.includes('পূর্ণমান'), 'English RTF has no Bangla placeholders/labels');
  check(rtfEn.includes('1.}\\tab') && !rtfEn.includes('1।'), 'English question delimiter is "."');
  check(rtfEn.includes('(a) He is') && rtfEn.includes('(b) I saw'), 'English sub-questions on own lines as (a)/(b)');
  check(/\\tab \{\\f1 \[0\.5/.test(rtfEn) || /\\tab [^\n]*\[0\.5/.test(rtfEn), 'stem marks moved to the right tab');

  // ---- ৩) validator non-fatal ----
  const v = ExportDualEngine._getSchemaValidator();
  check(v && v.validate('EXAM_CQ', { sections: [] }) === false, 'schema validator failure is a warning, not a throw');

  // ---- ৪) যৌথ পত্র: চিহ্ন ছাড়াও বিভাজন ----
  const combined = fs.readFileSync(path.join(ROOT, 'tests/fixtures/combined.input.md'), 'utf8');
  const noMarker = combined.replace(/^.*SECTION_?BREAK.*$/gim, '');
  const parts = ExportDualEngine._splitCombined(noMarker);
  check(parts.length === 2 && /বহুনির্বাচন/.test(parts[1]) && !/বহুনির্বাচন/.test(parts[0]), 'combined split at MCQ heading without marker');
  const rtfC = await ExportDualEngine.generateWordDoc(noMarker, 'EXAM_COMBINED', { format: 'doc' }).text();
  check(/\\landscape/.test(rtfC) && /\\sect\\sbkpage/.test(rtfC) && /\\sect\\sbknone\\paperw11906/.test(rtfC), 'combined (no marker): landscape CQ → next-page → portrait MCQ');
  const withMarker = await ExportDualEngine.generateWordDoc(combined, 'EXAM_COMBINED', { format: 'doc' }).text();
  check(withMarker === rtfC, 'combined output identical with and without marker');
  check(ExportDualEngine._splitCombined('১। রহিম স্কুলে যায়।\nক. স্কুল কোথায়? ১').length === 1, 'stimulus mentioning স্কুল does not trigger a split');

  console.log(`Part-15.0 layout-profile gates: ${gates} passed, 0 failed`);
})().catch((e) => { console.error(e); process.exit(1); });
