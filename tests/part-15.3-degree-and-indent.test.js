'use strict';

// Part-15.3 regression gates:
//  ১) ডিগ্রি চিহ্ন: `80^\circ` / `^{\circ}` / `^{o}` → সাধারণ মাপের `°` (.docx-এ আর sSup ৮pt নয়); `x^0` প্রকৃত ঘাত অক্ষুণ্ণ
//  ২) ক্রমিক-দূরত্ব (Part-15.4): প্রতিটি প্রশ্নে নম্বর ১–৯ হলে হ্যাঙ্গিং ০.২" (২৮৮), ১০+ হলে ০.৩" (৪৩২);
//     CQ, সাধারণ ও MCQ সব পথে; উপ-প্রশ্ন সবসময় নিজ স্টেম-লেখার সঙ্গে সোজা (ইনডেন্ট + ৪৩২)
// চালানো: node tests/part-15.3-degree-and-indent.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
globalThis.Blob = globalThis.Blob || require('node:buffer').Blob;
require(path.join(ROOT, 'tests/lib/harness.js')).loadEngines();
const { ExportDualEngine: EX, CqBookletPlanner: P, TextRunProcessor: TRP } = globalThis;

let gates = 0;
const check = (cond, msg) => { assert.ok(cond, msg); gates++; };

// ---- ১) ডিগ্রি ----
for (const s of ['80^\\circ', '80^{\\circ}', '80^{o}', '80^°', '80^{°}']) check(TRP.normalizeDegrees(s) === '80°', 'normalizeDegrees: ' + s);
check(TRP.normalizeDegrees('x^0') === 'x^0' && TRP.normalizeDegrees('x^{2}') === 'x^{2}', 'real powers untouched');
check(TRP.normalizeDegrees('e^{ox}') === 'e^{ox}', 'superscript word starting with o untouched');
const docxDeg = EX.renderDocxRuns('$80^\\circ$', { font: 'bijoy' }, { sz: 24 });
check(!/<m:sSup>/.test(docxDeg) && docxDeg.includes('80°'), 'DOCX: 80° is a normal-size run (no sSup)');
const docxAng = EX.renderDocxRuns('$\\angle AOB = 100^\\circ$', { font: 'bijoy' }, { sz: 24 });
check(!/<m:sSup>/.test(docxAng) && docxAng.includes('100°'), 'DOCX: angle expression keeps ° inline');
check(EX.formatRtfText('$80^\\circ$', { font: 'bijoy' }).includes('80\\u176?'), 'RTF: 80° plain');
check(/\\\\S\\\\up4\(/.test(EX.formatRtfText('$80^2$', { font: 'bijoy' })), 'RTF: real exponent still raised (EQ \\S\\up, Part-15.7)');

// ---- ২) প্রশ্ন-ইনডেন্ট (Part-15.4: প্রতিটি প্রশ্ন আলাদা — ১–৯ → ২৮৮, ১০+ → ৪৩২) ----
const g = P.geometry({});
const LU = globalThis.FayzarLayoutUnits;
const qs = (nums) => nums.map((n) => ({ num: n, text: 'প্রশ্ন', subQuestions: [{ label: 'ক', text: 'উপ', mark: '২' }] }));
check(LU.questionIndent('৯', 432, 288) === 288 && LU.questionIndent('১০', 432, 288) === 432, 'shared rule: ৯ → 288, ১০ → 432');
check(LU.questionIndent('1', 432, 288) === 288 && LU.questionIndent('', 432, 288) === 432, 'ASCII digits / no number');
check(P.questionIndent({ num: '৩' }, g) === 288 && P.questionIndent({ num: '১২' }, g) === 432, 'CQ planner uses the shared rule');

const data = { header: { institute: 'স্কুল' }, sections: [
  { title: 'সৃজনশীল প্রশ্ন', questions: qs(['১', '২', '৩']) },
  { title: 'সংক্ষিপ্ত প্রশ্ন', questions: qs(['১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯', '১০', '১১']) }
] };
const rtf = EX.generateCqExamRtf(data, { docType: 'EXAM_CQ', renumber: false });
check((rtf.match(/\\li288\\fi-288/g) || []).length === 12, 'RTF: all 12 stems numbered 1–9 at 288 (both sections)');
check((rtf.match(/\\li432\\fi-432/g) || []).length === 2, 'RTF: stems ১০, ১১ stay at 432');
check((rtf.match(/\\li720\\fi-432/g) || []).length === 12 && (rtf.match(/\\li864\\fi-432/g) || []).length === 2, 'RTF: sub-questions follow their own question indent');
(async () => {
  const inner = await EX.generateCqExamDocx(data, { docType: 'EXAM_CQ', returnInnerXml: true, renumber: false });
  check((inner.bodyXml.match(/<w:ind w:left="288" w:hanging="288"\/>/g) || []).length === 12, 'DOCX: 1–9 stems at 288');
  check((inner.bodyXml.match(/<w:ind w:left="432" w:hanging="432"\/>/g) || []).length === 2, 'DOCX: 10+ stems at 432');
  // Part-15.5 (ব্যবহারকারীর নির্দেশ): MCQ-তে সব প্রশ্নে ০.৩" — বিকল্প-গ্রিড সোজা
  const mcq = { header: {}, sections: [{ questions: ['৯', '১০'].map((n) => ({ num: n, text: 'প্রশ্ন', options: [{ label: 'ক', text: '১' }, { label: 'খ', text: '২' }, { label: 'গ', text: '৩' }, { label: 'ঘ', text: '৪' }] })) }] };
  const mrtf = EX.generateMcqExamRtf(mcq, { returnInnerRtf: true, renumber: false });
  check(!/\\li288\\fi-288/.test(mrtf) && (mrtf.match(/\\li432\\fi-432\\tx432/g) || []).length === 2, 'MCQ RTF: ৯ ও ১০ দুটোই 432');
  console.log(`Part-15.3 degree/indent gates: ${gates} passed, 0 failed`);
})().catch((e) => { console.error(e); process.exit(1); });
