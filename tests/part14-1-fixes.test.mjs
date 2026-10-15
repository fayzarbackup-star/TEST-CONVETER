import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CqBookletPlanner = require('../js/layout-engine/cq-booklet-planner.js');
const McqLayoutPlanner = require('../js/layout-engine/mcq-layout-planner.js');
globalThis.CqBookletPlanner = CqBookletPlanner;
globalThis.McqLayoutPlanner = McqLayoutPlanner;

const QuestionEngine = require('../js/engines/question-engine.js');
globalThis.QuestionEngine = QuestionEngine;
const ExportDualEngine = require('../js/engines/export-dual-engine.js');

const completeCqHeader = {
  institute: 'প্রতিষ্ঠান',
  location: 'রংপুর',
  exam: 'বার্ষিক পরীক্ষা',
  classAndSubject: 'শ্রেণি ৮ | বাংলা',
  time: '২ ঘণ্টা',
  examType: 'সৃজনশীল অভীক্ষা',
  marks: '৭০'
};

function cqData(questionCount = 1, wordRepeats = 1, header = completeCqHeader) {
  return {
    header: { ...header },
    sections: [{
      title: '',
      questions: Array.from({ length: questionCount }, (_, i) => ({
        num: String(i + 1),
        text: 'বাংলা শব্দ '.repeat(wordRepeats),
        preContext: '',
        stimulus: '',
        statements: [],
        subQuestions: [],
        options: []
      }))
    }]
  };
}

function mcqData(options) {
  return {
    header: {},
    sections: [{
      title: '',
      questions: [{
        num: '1',
        text: 'প্রশ্ন',
        preContext: '',
        stimulus: '',
        statements: [],
        subQuestions: [],
        options
      }]
    }]
  };
}

function labeled(texts) {
  return texts.map((text, i) => ({ label: 'কখগঘ'[i] || String(i + 1), text }));
}

function countMatches(text, regex) {
  return [...String(text).matchAll(regex)].length;
}

test('CQ fallback header supplies editable, field-level placeholders', () => {
  assert.equal(CqBookletPlanner.buildHeader({}).length, 0, 'legacy opt-out behavior remains intact');

  const plan = CqBookletPlanner.plan({ header: {}, sections: [] }, { docType: 'EXAM_CQ' });
  const model = CqBookletPlanner.headerPreviewModel(plan);
  assert.deepEqual(model, {
    institute: 'আপনার প্রতিষ্ঠানের নাম',
    location: 'ঠিকানা লিখুন',
    exam: 'পরীক্ষার নাম লিখুন',
    classAndSubject: 'শ্রেণি ও বিষয়',
    examType: 'সৃজনশীল অভীক্ষা',
    time: '২ ঘণ্টা ৩০ মিনিট',
    marks: '৭০',
    instructions: ''
  });

  const preview = QuestionEngine.renderToHtml(
    { header: {}, sections: [{ title: '', questions: [{ num: '1', text: 'নমুনা', options: [], subQuestions: [] }] }] },
    { orientation: 'landscape', docType: 'EXAM_CQ', editable: true }
  );
  for (const value of Object.values(model)) {
    if (value) assert.ok(preview.includes(value), `CQ preview should display “${value}”`);
  }
  assert.match(preview, /contenteditable="true"/);

  const mathPreview = QuestionEngine.renderToHtml(
    { header: {}, sections: [{ title: '', questions: [{ num: '1', text: 'নমুনা', options: [], subQuestions: [] }] }] },
    { orientation: 'landscape', docType: 'EXAM_MATH' }
  );
  assert.ok(mathPreview.includes('আপনার প্রতিষ্ঠানের নাম'), 'CQ placeholders must support Math exams');
});

test('CQ export plan carries the same placeholders into Word output', async () => {
  const parsed = cqData(1, 1, {});
  const plan = ExportDualEngine._cqPlan(parsed, {});
  const values = [
    'আপনার প্রতিষ্ঠানের নাম', 'ঠিকানা লিখুন', 'পরীক্ষার নাম লিখুন', 'শ্রেণি ও বিষয়',
    '২ ঘণ্টা ৩০ মিনিট', 'সৃজনশীল অভীক্ষা', '৭০'
  ];
  for (const value of values) assert.ok(plan.headerLines.some((line) => `${line.text || ''} ${line.center || ''} ${line.right || ''}`.includes(value)));

  const docx = await ExportDualEngine.generateCqExamDocx(parsed, { returnInnerXml: true });
  for (const value of values) assert.ok(docx.bodyXml.includes(value), `DOCX XML should contain “${value}”`);

  const mathPlan = ExportDualEngine._cqPlan({ header: {}, sections: [] }, { docType: 'EXAM_MATH' });
  assert.equal(mathPlan.headerLines.length, 5, 'Math document types should receive creative fallbacks');
});

test('CQ flow keeps pages 1–3 in order before considering the back cover', () => {
  // This fixture yields three natural flow columns with remaining space; none may be
  // reclassified as the back cover merely because a back-cover slot is reserved.
  const plan = CqBookletPlanner.plan(cqData(10, 28), { docType: 'EXAM_CQ' });
  assert.equal(plan.metrics.reservedUsed, false);
  assert.deepEqual(plan.columns.map((column) => column.role), ['page1', 'page', 'page']);
  assert.deepEqual(plan.columns.map((column) => column.page), [1, 2, 3]);
});

test('CQ back-fill is delayed until flow reaches page 4 and leaves pages 1–3 intact', () => {
  const plan = CqBookletPlanner.plan(cqData(10, 46), { docType: 'EXAM_CQ' });
  const backCover = plan.columns.find((column) => column.role === 'backcover');
  assert.ok(backCover, 'a full fourth flow column may be moved to the reserved back cover');
  assert.equal(backCover.page, 4);
  assert.ok(plan.metrics.tailMoved > 0);
  assert.deepEqual(
    plan.columns.filter((column) => column.role !== 'backcover').map((column) => column.page),
    [1, 2, 3]
  );
});

test('CQ question height uses render line ratio instead of inflating with capacity line factor', () => {
  const geometry = CqBookletPlanner.geometry({});
  const measured = CqBookletPlanner.measureQuestion({
    num: '1', text: 'বাংলা শব্দ '.repeat(40), preContext: '', stimulus: '',
    statements: [], subQuestions: [], options: []
  }, geometry.baseSz, geometry);
  const renderLineH = Math.round((geometry.baseSz / 2) * 20 * geometry.lineRenderCssRatio);
  const spacingLines = (measured.parts.stem ? 4 : 0) + measured.parts.subCount * 2 +
    ((measured.parts.stimulus + measured.parts.pre) ? 3 : 0) + (measured.parts.orDivider ? 4 : 0);
  assert.equal(measured.height, measured.parts.total * renderLineH + spacingLines * 10);
  assert.ok(measured.height < measured.parts.total * CqBookletPlanner.lineH(geometry.baseSz, geometry) + spacingLines * 10);
});

test('MCQ choices adapt to 4-across, 2×2, and one-per-row grids consistently', async () => {
  const small = labeled(['A', 'B', 'C', 'D']);
  const medium = labeled(['A', 'একটি মাঝারি বাক্য', 'একটি মাঝারি বাক্য', 'একটি মাঝারি বাক্য']);
  const long = labeled(Array(4).fill('এটি একটি অত্যন্ত দীর্ঘ বিকল্পের পাঠ্য যা অর্ধেক কলামেরও বেশি জায়গা নেবে'));
  const math = labeled(['$x^2+1$', '$a+b$', '$2x$', '$y=0$']);
  const cases = [
    { name: 'small', options: small, cols: 4 },
    { name: 'medium', options: medium, cols: 2 },
    { name: 'long', options: long, cols: 1 },
    { name: 'math', options: math, cols: 4 }
  ];

  const geometry = McqLayoutPlanner.geometry({});
  const quarterStops = geometry.optionTabStops4;
  assert.equal(quarterStops.length, 4);
  assert.equal(quarterStops[1] - quarterStops[0], quarterStops[2] - quarterStops[1]);
  assert.ok(Math.abs((quarterStops[2] - quarterStops[1]) - (quarterStops[3] - quarterStops[2])) <= 1);

  for (const entry of cases) {
    const grid = McqLayoutPlanner.decideOptionsGrid(entry.options, 24, geometry);
    assert.equal(grid.cols, entry.cols, `${entry.name} planner grid`);
    assert.deepEqual(grid.tabStops4, quarterStops);

    const parsed = mcqData(entry.options);
    const exportPlan = ExportDualEngine._mcqPlan(parsed, {}, 'EXAM_MCQ');
    assert.equal(exportPlan.items[0].grid.cols, entry.cols, `${entry.name} export grid`);
    assert.equal(ExportDualEngine._mcqPlanFallback(parsed, {}).items[0].grid.cols, entry.cols, `${entry.name} fallback export grid`);

    const preview = QuestionEngine.renderMcqOptions(entry.options, {
      planItem: exportPlan.items[0], gridCols: exportPlan.items[0].grid.cols, szHalf: exportPlan.font.sz
    });
    assert.ok(preview.includes(`mcq-grid-${entry.cols}`), `${entry.name} preview grid`);

    const originalGetPlanner = QuestionEngine._getMcqPlanner;
    try {
      QuestionEngine._getMcqPlanner = () => null;
      const fallbackPreview = QuestionEngine.renderMcqOptions(entry.options, {});
      assert.ok(fallbackPreview.includes(`mcq-grid-${entry.cols}`), `${entry.name} fallback preview grid`);
    } finally {
      QuestionEngine._getMcqPlanner = originalGetPlanner;
    }
  }

  const mixedParsed = mcqData(medium);
  const mixedPlan = ExportDualEngine._mcqPlan(mixedParsed, {}, 'EXAM_MCQ');
  assert.deepEqual(mixedPlan.items[0].grid.rows, [[0, 1], [2, 3]]);
  assert.deepEqual(mixedPlan.items[0].grid.tabJumps, [1, 1]);

  // Part-15.5: MCQ-তে সব প্রশ্নে ০.৩" — অপশন-স্টপ প্ল্যানের হুবহু (সরানো নেই)
  const dI = 0;
  const rtf = ExportDualEngine.generateMcqExamRtf(mixedParsed, { returnInnerRtf: true });
  for (const stop of mixedPlan.items[0].grid.stops) assert.ok(rtf.includes(`\\tx${stop + dI}`), `RTF tab stop ${stop + dI}`);
  assert.ok(rtf.includes('\\tab'), 'short first option uses tab to reach the half-width stop');

  const docx = await ExportDualEngine.generateMcqExamDocx(mixedParsed, { returnInnerXml: true });
  for (const stop of mixedPlan.items[0].grid.stops) assert.ok(docx.bodyXml.includes(`<w:tab w:val="left" w:pos="${stop + dI}"/>`), `DOCX tab stop ${stop + dI}`);
  assert.ok(countMatches(docx.bodyXml, /<w:r><w:tab\/><\/w:r>/g) >= 4, 'Word options and question text remain tab-adjustable');
});

test('Math and General DOCX/RTF dispatch retain their type for CQ-style export plumbing', async () => {
  const originalDocx = ExportDualEngine.generateCqExamDocx;
  const originalRtf = ExportDualEngine.generateCqExamRtf;
  try {
    ExportDualEngine.generateCqExamDocx = async (_parsed, options) => ({ docType: options.docType });
    const docxResult = await ExportDualEngine.generateModernDocx('1. নমুনা', 'EXAM_MATH');
    assert.equal(docxResult.docType, 'EXAM_MATH');

    ExportDualEngine.generateCqExamRtf = (_parsed, options) => options.docType;
    const blob = ExportDualEngine.generateLegacyDoc('1. নমুনা', 'EXAM_GENERAL');
    assert.equal(await blob.text(), 'EXAM_GENERAL');
  } finally {
    ExportDualEngine.generateCqExamDocx = originalDocx;
    ExportDualEngine.generateCqExamRtf = originalRtf;
  }
});
