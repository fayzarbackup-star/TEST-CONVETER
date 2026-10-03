// Part-12 আচরণ-প্রোব: লাইন-স্পেসিং লক, NaN-মুক্ত এক্সপোর্ট, ম্যাথ-সীমান্ত
const path = require('path'), fs = require('fs');
const R = (p) => require(path.join(__dirname, '..', p));
const g = globalThis;
g.FayzarLayoutUnits = R('js/layout-engine/layout-units.js');
g.TextRunProcessor = R('js/layout-engine/text-run-processor.js');
g.EquationConverter = R('js/equation-converter.js');
g.ThemeConfig = R('js/layout-engine/theme-config.js'); g.FayzarThemeConfig = g.ThemeConfig;
g.FayzarDocxBuilder = R('js/layout-engine/docx-builder.js'); g.DocxBuilder = g.FayzarDocxBuilder;
g.SchemaValidator = R('js/layout-engine/schema-validator.js'); g.FayzarSchemaValidator = g.SchemaValidator;
g.jszip = R('js/jszip.min.js');
g.McqLayoutPlanner = R('js/layout-engine/mcq-layout-planner.js');
g.CqBookletPlanner = R('js/layout-engine/cq-booklet-planner.js');
g.QuestionEngine = R('js/engines/question-engine.js');
g.ExportDualEngine = R('js/engines/export-dual-engine.js');
const QE = g.QuestionEngine, EX = g.ExportDualEngine;

const pairs = (rtf) => [...rtf.matchAll(/\\fs(\d+)((?:\\f\d+)?)\\sl(\d+)\\slmult(\d)/g)]
  .map((m) => ({ sz: +m[1], sl: +m[3], mult: +m[4] }));
const uniq = (a) => [...new Set(a)];
let fails = 0;
const check = (label, ok, extra) => { if (!ok) { fails++; console.log('   ✗ ' + label + (extra ? ' → ' + extra : '')); } else console.log('   ✓ ' + label + (extra ? ' → ' + extra : '')); };

console.log('— ১. লাইন-স্পেসিং (প্রিভিউ ১.৫ = .rtf = .docx) —');
const parsed = QE.parseQuestionPaper(fs.readFileSync(path.join(__dirname, '..', 'proof', 'samples', 'cq-booklet-6.plain.md'), 'utf8'), { docType: 'EXAM_CQ' });
for (const label of ['CQ', 'MCQ']) {
  const rtf = label === 'CQ' ? EX.generateCqExamRtf(parsed, {}) : EX.generateMcqExamRtf({
    header: { institute: 'আদর্শ বিদ্যালয়', time: '৩ ঘণ্টা', marks: '১০০' },
    sections: [{ questions: Array.from({ length: 40 }, (_, i) => ({ num: i + 1, text: 'নিচের কোনটি সঠিক? প্রশ্ন ' + (i + 1), options: [{ label: 'ক', text: 'আয়তন' }, { label: 'খ', text: 'ভর' }, { label: 'গ', text: 'ঘনত্ব' }, { label: 'ঘ', text: 'বেগ' }], correct: 'গ' })) }],
  }, {});
  const bad = uniq(pairs(rtf).map((p) => {
    // Part-12 পলিসি: সব প্যারাগ্রাফ single-এর গুণক (240) — ১২০-এর নিচে হেয়ারলাইন বাদে
    return ((p.sl === 240 && p.mult === 1) || p.sl < 120) ? null : 'fs' + p.sz + ':sl' + p.sl + '(want 240/mult1)';
  }).filter(Boolean));
  check(label + ' RTF: প্রতিটি \sl = নিজ \fs × ১.৫, \slmult1', bad.length === 0, bad.length ? bad.join(' ') : uniq(pairs(rtf).map((p) => 'fs' + p.sz + ':sl' + p.sl)).join(' '));
  check(label + ' RTF: \sb/\sa ≤ ১৮০', uniq([...rtf.matchAll(/\\s([ba])(\d+)/g)].map((m) => +m[2])).every((v) => v <= 180));
}
// forceSz (বড় ফন্ট) হলেও রেশিও ঠিক থাকে — প্রিভিউ-ডাউনলোড মিলের মূল শর্ত
const big = EX.generateMcqExamRtf({
  header: { institute: 'আদর্শ', time: '৩ ঘণ্টা', marks: '১০০' },
  sections: [{ questions: Array.from({ length: 12 }, (_, i) => ({ num: i + 1, text: 'প্রশ্ন ' + (i + 1), options: [{ label: 'ক', text: '১' }, { label: 'খ', text: '২' }, { label: 'গ', text: '৩' }, { label: 'ঘ', text: '৪' }], correct: 'ক' })) }],
}, { forceSz: 22 });
check('forceSz:22 হলেও একই single-রেশিও (\sl240\slmult1), হেয়ারলাইন বাদে', uniq(pairs(big).map((p) => ((p.sl === 240 && p.mult === 1) || p.sl < 120) ? 'ok' : 'fs' + p.sz + ':sl' + p.sl)).join(',') === 'ok', uniq(pairs(big).map((p) => 'fs' + p.sz + ':sl' + p.sl)).join(' '));

console.log('— ২. NaN-মুক্ত এক্সপোর্ট (অডিট-আইটেম ৮-সহ) —');
(async () => {
  const inputs = [['normal', 720], ['narrow', 576], ['moderate', 1080], ['wide', 1440], [0.6, 864], ['0.6', 864], ['অ', 720], [undefined, 720]];
  for (const [m, wantTop] of inputs) {
    const docx = await EX.generateCqExamDocx(parsed, { margin: m });
    const zip = await g.jszip.loadAsync(Buffer.from(await docx.arrayBuffer()));
    const xml = await zip.file('word/document.xml').async('string');
    const top = (xml.match(/<w:pgMar w:top="(\d+)"/) || [])[1];
    check('CQ DOCX margin=' + JSON.stringify(m), (xml.match(/NaN/g) || []).length === 0 && +top === wantTop, 'pgMar.top=' + top);
    const rtf = EX.generateCqExamRtf(parsed, { margin: m });
    check('CQ RTF margin=' + JSON.stringify(m), (rtf.match(/NaN/g) || []).length === 0);
  }
  // ৩. DOCX লাইন-স্পেস = ২৪০×১.৫ = ৩৬০ (ফন্ট-আপেক্ষিক), ডিভাইডার ১০০ অক্ষুণ্ন
  const dx = await EX.generateCqExamDocx(parsed, {});
  const zip2 = await g.jszip.loadAsync(Buffer.from(await dx.arrayBuffer()));
  const xml2 = await zip2.file('word/document.xml').async('string');
  const lines = uniq(xml2.match(/w:line="\d+"/g) || []);
  check('DOCX w:line ২৪০ (ডিভাইডার ১০০ বাদে বাকি সব)', lines.filter((v) => v !== 'w:line="240"' && v !== 'w:line="100"').length === 0, lines.join(','));
  const rules = uniq(xml2.match(/w:lineRule="\w+"/g) || []);
  check('DOCX: প্রতিটি লাইনে lineRule আছে (auto/যে-কোনো বৈধ)', rules.length > 0 && rules.every((r) => /auto|exactly|atLeast/.test(r)) && rules.includes('w:lineRule="auto"'), rules.join(','));

  // ৪. π / সমীকরণ-সীমান্ত: ডাবল-স্পেস নয়, বাম-ডান প্রতিসাম্য
  const t = 'ক্ষেত্রফল নির্ণয় করো:   \\pi r^2   নির্ণয় করো';
  const rtfMath = EX.formatRtfText(t, {});
  check('RTF: বাংলা↔ম্যাথ সীমানায় ডাবল-স্পেস নেই', !/  /.test(rtfMath.replace(/\\u[0-9]+\?/g, 'x')), JSON.stringify(rtfMath.slice(0, 120)));
  const docxRuns = EX.renderDocxRuns('ক্ষেত্রফল πr² নির্ণয় করো', {}, {});
  check('DOCX: সমীকরণের ভেতরে ট্রেইলিং-স্পেস ঝুলে নেই', !/<m:t[^>]*>\s*π\s+<\/m:t>/.test(docxRuns) || !/<m:t[^>]*>[^<]*\s<\/m:t><\/m:r><m:r>/.test(docxRuns), docxRuns.slice(0, 200));

  console.log(fails ? '\n   ✗ ' + fails + ' টি পরীক্ষা ব্যর্থ' : '\n   ✓ সব ঠিক');
  process.exit(fails ? 1 : 0);
})();
