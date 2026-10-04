'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const DocClassifier = require(path.join(repoRoot, 'js/engines/doc-classifier.js'));
const QuestionEngine = require(path.join(repoRoot, 'js/engines/question-engine.js'));
const CqBookletPlanner = require(path.join(repoRoot, 'js/layout-engine/cq-booklet-planner.js'));
const ExportDualEngine = require(path.join(repoRoot, 'js/engines/export-dual-engine.js'));
const ExamRenumber = require(path.join(repoRoot, 'js/layout-engine/exam-renumber.js'));
globalThis.FayzarExamRenumber = ExamRenumber;

function testOcrPrompts() {
  const ocrSource = read('js/ai-ocr-engine.js');
  assert.match(ocrSource, /## ক-বিভাগ \(সংক্ষিপ্ত প্রশ্ন\)/, 'main OCR prompt must show an explicit short-question heading');
  assert.match(ocrSource, /## সৃজনশীল প্রশ্ন/, 'main OCR prompt must show an explicit creative-question heading');
  assert.match(ocrSource, /Reserve ## for category headings/);
  assert.match(ocrSource, /downstream renumberer resets each parsed section/i);
  assert.match(ocrSource, /EXAM_MATH/, 'the OCR archetype list must include math exams');

  const sandbox = {
    LAYOUT_TEMPLATES: {
      'question-2col': { name: 'Question Paper', columns: 2, sampleMarkdown: '' },
      'creative-cq': { name: 'Creative Question Paper', columns: 2, sampleMarkdown: '' }
    },
    module: { exports: {} }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(read('js/layout-engine/gemini-prompt-factory.js'), sandbox, {
    filename: 'js/layout-engine/gemini-prompt-factory.js'
  });
  const prompt = sandbox.module.exports.getPrompt('creative-cq').promptText;
  assert.match(prompt, /## ক-বিভাগ \(সংক্ষিপ্ত প্রশ্ন\)/);
  assert.match(prompt, /## সৃজনশীল প্রশ্ন/);
  assert.match(prompt, /EXAM_GENERAL \| EXAM_CQ \| EXAM_MATH/);
  assert.match(prompt, /downstream renumberer/i);
}

function testMixedSectionClassificationAndParsing() {
  const mixedWithWrongFrontmatter = `---
doc_type: EXAM_GENERAL
columns: 2
---
## ক-বিভাগ (সংক্ষিপ্ত প্রশ্ন)
৮। প্রথম সংক্ষিপ্ত প্রশ্ন
৯। দ্বিতীয় সংক্ষিপ্ত প্রশ্ন
## খ-বিভাগ (সৃজনশীল প্রশ্ন ও সমাধান)
[উদ্দীপক ১]
উদ্দীপকের বর্ণনা।
১২। উদ্দীপকের ভিত্তিতে উত্তর দাও
ক. প্রথম উপপ্রশ্ন ১
খ. দ্বিতীয় উপপ্রশ্ন ২
১৩। আরেকটি সৃজনশীল প্রশ্ন
ক. আরেকটি উপপ্রশ্ন ১`;

  const classification = DocClassifier.classify(mixedWithWrongFrontmatter);
  assert.equal(classification.type, 'EXAM_CQ', 'a clearly mixed short+creative paper must not obey a mistaken EXAM_GENERAL frontmatter');

  const mathClassification = DocClassifier.classify('---\ndoc_type: EXAM_MATH\ncolumns: 2\n---\n## গণিত\n১। x + ২ = ৫');
  assert.equal(mathClassification.type, 'EXAM_MATH', 'EXAM_MATH frontmatter must be recognized explicitly');
  const combinedClassification = DocClassifier.classify(`---\ndoc_type: EXAM_GENERAL\n---\n## সৃজনশীল প্রশ্ন\nউদ্দীপক: ...\n---SECTION_BREAK:MCQ---\n## গ-বিভাগ (বহুনির্বাচনী প্রশ্ন)\n১। প্রশ্ন`);
  assert.equal(combinedClassification.type, 'EXAM_COMBINED', 'a creative+MCQ section marker must override mistaken generic frontmatter');

  const body = `## ক-বিভাগ (সংক্ষিপ্ত প্রশ্ন)
৮। প্রথম সংক্ষিপ্ত প্রশ্ন
৯। দ্বিতীয় সংক্ষিপ্ত প্রশ্ন
[উদ্দীপক ১]
উদ্দীপকের বর্ণনা।
## খ-বিভাগ (সৃজনশীল প্রশ্ন ও সমাধান)
১২। উদ্দীপকের ভিত্তিতে উত্তর দাও
ক. প্রথম উপপ্রশ্ন ১
খ. দ্বিতীয় উপপ্রশ্ন ২
১৩। আরেকটি সৃজনশীল প্রশ্ন
ক. আরেকটি উপপ্রশ্ন ১`;
  const parsed = QuestionEngine.parseQuestionPaper(body, { docType: 'EXAM_CQ' });

  assert.equal(parsed.sections.length, 2, 'category headings must create two independent parsed sections');
  assert.equal(parsed.sections[0].title, 'ক-বিভাগ (সংক্ষিপ্ত প্রশ্ন)', 'Markdown markers should not leak into the printed section title');
  assert.equal(parsed.sections[1].title, 'খ-বিভাগ (সৃজনশীল প্রশ্ন ও সমাধান)');
  assert.deepEqual(parsed.sections.map((section) => section.questions.length), [2, 2]);
  assert.equal(parsed.sections[0].questions[1].stimulus, '', 'a creative stimulus must not be attached to the previous short question');
  assert.match(parsed.sections[1].questions[0].stimulus, /উদ্দীপক ১/);

  ExamRenumber.renumberExamSections(parsed);
  assert.deepEqual(parsed.sections.map((section) => section.questions.map((question) => question.num)), [
    ['১', '২'],
    ['১', '২']
  ], 'final exam numbering must restart independently in each parsed category');

  const mcq = QuestionEngine.parseQuestionPaper(`## গ-বিভাগ (বহুনির্বাচনী প্রশ্ন)\n৭। একটি MCQ প্রশ্ন\nক. বিকল্প এক\tখ. বিকল্প দুই\tগ. বিকল্প তিন\tঘ. বিকল্প চার\n৮। আরেকটি MCQ প্রশ্ন\nক. উত্তর ক\tখ. উত্তর খ\tগ. উত্তর গ\tঘ. উত্তর ঘ`, { docType: 'EXAM_MCQ' });
  assert.equal(mcq.sections.length, 1);
  assert.equal(mcq.sections[0].title, 'গ-বিভাগ (বহুনির্বাচনী প্রশ্ন)', 'MCQ category heading should be retained as its own section');
  ExamRenumber.renumberExamSections(mcq);
  assert.deepEqual(mcq.sections[0].questions.map((question) => question.num), ['১', '২'], 'MCQ serials should reset within the MCQ category');
}

function assertPlaceholderHeader(plan, label) {
  const headerText = (plan.headerLines || []).map((line) => [line.text, line.center, line.right].filter(Boolean).join(' ')).join('\n');
  for (const placeholder of ['আপনার প্রতিষ্ঠানের নাম', 'ঠিকানা লিখুন', 'পরীক্ষার নাম লিখুন', 'শ্রেণি ও বিষয়', 'সময়:', 'পূর্ণমান:']) {
    assert.ok(headerText.includes(placeholder), `${label}: missing editable header field ${placeholder}`);
  }
}

async function testCreativeHeaderPlacement() {
  const parsed = {
    header: {},
    sections: [{
      title: 'খ-বিভাগ (সৃজনশীল প্রশ্ন)',
      questions: [{
        num: '১',
        text: 'RIGHT_COLUMN_QUESTION',
        preContext: '',
        stimulus: '',
        statements: [],
        subQuestions: [],
        options: []
      }]
    }]
  };

  for (const docType of ['EXAM_MATH', 'EXAM_COMBINED']) {
    const plan = CqBookletPlanner.plan(parsed, { docType, skipFirstColumn: true });
    assertPlaceholderHeader(plan, docType);
  }

  const options = { docType: 'EXAM_COMBINED', skipFirstColumn: true };
  const fallbackPlan = ExportDualEngine._cqPlanFallback(parsed, options);
  assertPlaceholderHeader(fallbackPlan, 'planner-unavailable combined fallback');
  assert.equal(fallbackPlan.columns[0].colInPage, 2, 'fallback plan must honor a reserved left column');
  assert.equal(fallbackPlan.columns[0].breakBefore, true);
  const plan = ExportDualEngine._cqPlan(parsed, options);
  assertPlaceholderHeader(plan, 'combined creative booklet export');
  const firstContentColumn = plan.columns.find((column) => column.role === 'page1');
  assert.ok(firstContentColumn, 'booklet plan must identify its page-1 content column');
  assert.equal(plan.skipFirstColumn, true, 'left cover column should remain reserved');
  assert.equal(firstContentColumn.colInPage, 2, 'the first content column must be the physical right column');
  assert.equal(firstContentColumn.breakBefore, true, 'the renderer must advance past the reserved left column before the header');
  assert.equal(firstContentColumn.headerFirst, true, 'the editable header must be attached to the actual page-1 content column');

  const preview = QuestionEngine._renderToHtmlCore(parsed, {
    orientation: 'landscape',
    docType: 'EXAM_COMBINED',
    skipFirstColumn: true,
    editable: true
  });
  const blankLeftColumn = preview.indexOf('qp-col-skip-box');
  const previewHeader = preview.indexOf('আপনার প্রতিষ্ঠানের নাম');
  const previewQuestion = preview.indexOf('RIGHT_COLUMN_QUESTION');
  assert.ok(blankLeftColumn >= 0 && previewHeader > blankLeftColumn, 'editable preview header must be in the content column after the reserved left column');
  assert.ok(previewQuestion > previewHeader, 'editable preview header must precede the first question');
  assert.match(preview, /data-col="2"/, 'first-page content should be marked as physical column 2');
  assert.match(preview, /contenteditable="true"/, 'the fallback fields must remain editable in preview');

  const combinedRtf = ExportDualEngine.generateCombinedExamRtf(parsed, { header: {}, sections: [] }, options);
  const firstColumnBreak = combinedRtf.indexOf('{\\column}');
  const headerStart = combinedRtf.indexOf('{\\qc\\b\\fs32', firstColumnBreak);
  const questionStart = combinedRtf.indexOf('RIGHT_COLUMN_QUESTION');
  assert.ok(firstColumnBreak >= 0, 'combined booklet output should reserve the left column');
  assert.ok(headerStart > firstColumnBreak, 'header must be emitted after the reserved-column break');
  assert.ok(questionStart > headerStart, 'header must precede the first-page question');

  const docxParts = await ExportDualEngine.generateCqExamDocx(parsed, {
    ...options,
    returnInnerXml: true
  });
  assert.ok(docxParts && typeof docxParts.bodyXml === 'string', 'DOCX generator should return its focused XML body');
  const docxColumnBreak = docxParts.bodyXml.indexOf('<w:br w:type="column"/>');
  const docxHeader = docxParts.bodyXml.indexOf('আপনার প্রতিষ্ঠানের নাম');
  const docxQuestion = docxParts.bodyXml.indexOf('RIGHT_COLUMN_QUESTION');
  assert.ok(docxColumnBreak >= 0, 'DOCX output should move into the right column first');
  assert.ok(docxHeader > docxColumnBreak, 'DOCX editable header must follow the blank-left-column break');
  assert.ok(docxQuestion > docxHeader, 'DOCX header must precede the first-page question');
}

(async () => {
  testOcrPrompts();
  testMixedSectionClassificationAndParsing();
  await testCreativeHeaderPlacement();
  console.log('Part-14.3 focused regression: PASS (mixed-section headings/classification, per-section numbering, and right-column editable header in HTML/RTF/DOCX).');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
