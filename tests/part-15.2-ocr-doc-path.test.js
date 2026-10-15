'use strict';

// Part-15.2 regression gates — ব্যবহারকারীর "class 8 math" OCR-ডাউনলোডে ধরা ৩টি সমস্যা:
//  ১) সময়/পূর্ণমান সেকশন-শিরোনামের পরে আবার ছাপা হতো, উপরে ফলব্যাক "২ ঘণ্টা ৩০ মিনিট/৭০" বসত
//     → ফ্রন্টম্যাটার (frontmatter-header.js) + মেটা-লাইন হেডারে যায়, প্রশ্নের উপরে নয়
//  ২) OCR .doc-এ \frac{৩}{৫} ইংরেজি 3/5 → OCR .doc এখন RTF পথে (বিজয় EQ ফন্ট-রান, Part-15.1)
//  ৩) শেষ MCQ-এর মাঝে দ্বিতীয় "যাচাই প্রতিবেদন" ও বিকল্প-লাইন নোটে টানা → একবারই, শেষে
// চালানো: node tests/part-15.2-ocr-doc-path.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
globalThis.Blob = globalThis.Blob || require('node:buffer').Blob;
require(path.join(ROOT, 'tests/lib/harness.js')).loadEngines();
const { FayzarPipeline, QuestionEngine, ExportDualEngine } = globalThis;
const FM = require(path.join(ROOT, 'js/layout-engine/frontmatter-header.js'));

let gates = 0;
const check = (cond, msg) => { assert.ok(cond, msg); gates++; };
const decode = (rtf) => String(rtf).replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode(+n < 0 ? +n + 65536 : +n));

const OCR_MD = [
  '---',
  'doc_type: EXAM_COMBINED',
  'institute: ফুলবাড়ী আদর্শ উচ্চ বিদ্যালয়',
  'exam: [পরীক্ষার নাম]',
  'grade: অষ্টম',
  'subject: গণিত',
  'time: ৩ ঘন্টা',
  'fullMarks: ১০০',
  '---',
  'শ্রেণি: অষ্টম | বিষয়: গণিত',
  '## সৃজনশীল প্রশ্ন',
  'সময়: ৩ ঘন্টা',
  'পূর্ণ',
  '১। একজন চাল ব্যবসায়ী মুনাফা আসলের $\\frac{৩}{৫}$ অংশ হয়।',
  'ক. সরল মুনাফার সূত্র লেখো। ২',
  'খ. চালের দাম নির্ণয় করো। ৪',
  '---SECTION_BREAK:MCQ---',
  '## বহুনির্বাচনি প্রশ্ন',
  '২৫। কোনো আসল ১০ বছরে তিনগুণ হলে মুনাফার হার কত?',
  'ক. ৭ খ. ১০% গ. ২০% ঘ. ৩০%',
  '২৬। বার্ষিক ১২% মুনাফায় কত বছরে ১০,০০০ টাকার মুনাফা ৪,৮০০ টাকা হবে?',
  'ক. ৪ খ. ৬ গ. ৮ ঘ. ১০',
  ', ইত্যাদি) এবং শিখনফল/তথ্য-ব্যাখ্যা অংশসমূহ নিয়ম অনুযায়ী বাদ দেওয়া হয়েছে।',
  '- মূল ফাইলের সাথে সম্পূর্ণ যাচাইকৃত; কোনো অনুমান বা সংশোধন করা হয়নি।'
].join('\n');
const OCR_AUDIT = '[এআই অডিট নোট ও পরিবর্তনসমূহ:\n- প্রশ্ন ১২(গ): নম্বর সংশোধিত।]';

(async () => {
  // ---- ফ্রন্টম্যাটার মডিউল ----
  const sp = FM.split(OCR_MD);
  check(sp.fields && sp.fields.time === '৩ ঘন্টা' && sp.fields.fullmarks === '১০০', 'frontmatter parsed (time, fullMarks)');
  check(sp.fields.exam === '', 'template placeholder "[পরীক্ষার নাম]" ignored');
  check(!/^---/.test(sp.body.trim()) && /শ্রেণি/.test(sp.body), 'frontmatter body split');
  const h = FM.applyToHeader({ institute: 'উৎসের নাম', time: '' }, sp.fields);
  check(h.institute === 'উৎসের নাম' && h.time === '৩ ঘন্টা', 'source header wins; frontmatter only fills gaps');

  // ---- মেটা-লাইন চেনা ----
  check(QuestionEngine._metaLine('সময়: ৩ ঘন্টা').time === '৩ ঘন্টা', 'meta: time line');
  check(QuestionEngine._metaLine('সময়: ৩ ঘন্টা | পূর্ণমান: ৫০').marks === '৫০', 'meta: time | marks line');
  check(!!QuestionEngine._metaLine('পূর্ণ'), 'meta: broken fragment "পূর্ণ"');
  check(QuestionEngine._metaLine('গ্রামের মানুষ চিন্তিত হয়ে পড়ে।') === null, 'meta: normal sentence with "মান" is not meta');

  // ---- OCR ডাউনলোডের হুবহু পথ: ai-ocr-engine ফ্রন্টম্যাটার কেটে ExportDoc-এ পাঠায় ----
  const body = sp.body.trim();
  const res = await FayzarPipeline.exportDoc(body, {
    docType: 'EXAM_COMBINED', font: 'bijoy', auditNote: OCR_AUDIT, suppressAuditNote: false, __frontmatter: sp.fields
  });
  const rtf = await res.content.text();
  const plain = decode(rtf);
  check(/^\{\\rtf1/.test(rtf), 'OCR .doc is RTF (ExportDualEngine path)');

  // ১) হেডার
  check(!plain.includes('৩০ মিনিট') && !rtf.includes('30 wgwbU'), 'no invented "২ ঘণ্টা ৩০ মিনিট"');
  check(rtf.includes('3 N') && rtf.includes('100'), 'header uses real time ৩ ঘন্টা / marks ১০০ (Bijoy)');
  const cqPart = rtf.split('\\sect\\sbkpage')[0];
  check((cqPart.match(/mgq:/g) || []).length === 1, 'সময় printed once in CQ part (header only)');
  check(!/\{\\f0 c~Y©\}\\par/.test(cqPart) && !/\\par\}\s*\{[^\n]*\{\\f0 c~Y©\}\\par\}/.test(cqPart), 'broken "পূর্ণ" fragment not printed');

  // ২) সমীকরণ
  check(rtf.includes('{\\f0 3}') && rtf.includes('{\\f0 5}') && !/\\u2537\?|\\u2539\?/.test(rtf), '\\frac{৩}{৫} digits in SutonnyMJ Bijoy code');

  // ৩) অডিট নোট
  const auditTitles = (plain.match(/hvPvB cÖwZ‡e`b|যাচাই প্রতিবেদন/g) || []).length;
  check(auditTitles === 1, 'audit sheet printed exactly once (was twice)');
  const q26 = rtf.indexOf('4,800') >= 0 ? rtf.indexOf('4,800') : rtf.indexOf('4800');
  const audit = rtf.indexOf('hvPvB');
  check(q26 > 0 && audit > q26, 'audit sheet comes after the last question');
  const afterQ26 = rtf.slice(q26, audit);
  check(/\{\\f0 K\}\}\) \{\\f0 4\}/.test(afterQ26) && afterQ26.includes('{\\f0 10}'), 'Q26 keeps its options (ক. ৪ … ঘ. ১০)');

  // ছাত্র-কপি: কোনো অডিট নোট নয়
  const stu = await (await FayzarPipeline.exportDoc(body, { docType: 'EXAM_COMBINED', font: 'bijoy', auditNote: null, suppressAuditNote: true, __frontmatter: sp.fields })).content.text();
  check(!/hvPvB cÖwZ‡e`b/.test(stu), 'student copy has no audit sheet');

  // parser: trailing note no longer swallows the option line
  const parsed = QuestionEngine.parseQuestionPaper(body.split('---SECTION_BREAK:MCQ---')[1], { docType: 'EXAM_MCQ' });
  const lastQ = parsed.sections.flatMap((s) => s.questions).pop();
  check(lastQ && (lastQ.options || []).length === 4, 'last MCQ keeps 4 options');
  check(parsed.auditNote && !/ঘ\. ১০/.test(parsed.auditNote), 'trailing note excludes the option line');

  // preview pipeline uses frontmatter too
  const prev = await FayzarPipeline.previewHtml(OCR_MD, { docType: 'EXAM_CQ' });
  check(prev.parsedData.header.time === '৩ ঘন্টা' && !/^---/.test(JSON.stringify(prev.parsedData.sections[0])), 'preview: frontmatter fills header, YAML not in body');

  // Part-15.9: Gemini `doc_type: EXAM_CQ` বললেও আলাদা বহুনির্বাচনি অংশ থাকলে → যৌথ
  const mixed = ['## সৃজনশীল প্রশ্ন', '১। প্রশ্ন এক।', 'ক. উপ ১ ২', '## বহুনির্বাচনি প্রশ্ন',
    '১। মধ্যক কত?', 'ক. ১৬', 'খ. ১৭', 'গ. ২১', 'ঘ. ২৪', '২। কততম পদ?', 'ক. ৫তম', 'খ. ৪তম', 'গ. ৬তম', 'ঘ. ৭তম'].join('\n');
  check(globalThis.DocClassifier.promoteCombined('EXAM_CQ', mixed) === 'EXAM_COMBINED', 'EXAM_CQ with MCQ section → EXAM_COMBINED');
  check(globalThis.DocClassifier.promoteCombined('EXAM_CQ', mixed.split('## বহুনির্বাচনি')[0]) === 'EXAM_CQ', 'pure CQ stays EXAM_CQ');
  check(globalThis.DocClassifier.promoteCombined('EXAM_MCQ', mixed) === 'EXAM_MCQ', 'MCQ type never promoted');
  const mixRtf = await (await FayzarPipeline.exportDoc(mixed, { docType: 'EXAM_CQ' })).content.text();
  check(/\\sect\\sbkpage/.test(mixRtf) && /\\paperw11906\\paperh16838/.test(mixRtf), 'mixed paper exports CQ landscape → MCQ portrait');

  console.log(`Part-15.2 ocr-doc-path gates: ${gates} passed, 0 failed`);
})().catch((e) => { console.error(e); process.exit(1); });
