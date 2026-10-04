'use strict';

// Dedicated Part-14.2 regression gates. Run from the repository root:
//   node tests/part-14.2-regression.test.js
// Requires the repository's existing (unchanged) BanglaConverter and TextRunProcessor files.

const assert = require('node:assert/strict');
const path = require('node:path');
const REPO = path.resolve(__dirname, '..');
const fromRepo = (p) => require(path.join(REPO, p));

const BanglaConverter = fromRepo('js/bangla-converter-engine.js');
global.BanglaConverter = BanglaConverter;
const EquationConverter = fromRepo('js/equation-converter.js');
global.EquationConverter = EquationConverter;
const TextRunProcessor = fromRepo('js/layout-engine/text-run-processor.js');
global.TextRunProcessor = TextRunProcessor;

const CqBookletPlanner = fromRepo('js/layout-engine/cq-booklet-planner.js');
const McqLayoutPlanner = fromRepo('js/layout-engine/mcq-layout-planner.js');
const QuestionEngine = fromRepo('js/engines/question-engine.js');
const ExportDualEngine = fromRepo('js/engines/export-dual-engine.js');

let gates = 0;
function check(condition, message) {
  assert.ok(condition, message);
  gates++;
}
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  gates++;
}
function includes(text, fragment, message) {
  check(String(text).includes(fragment), message || `expected output to include ${JSON.stringify(fragment)}`);
}

const CREATIVE_TYPES = ['EXAM_CQ', 'EXAM_MATH', 'EXAM_GENERAL'];
const HEADER_EXPECTED = {
  institute: 'আপনার প্রতিষ্ঠানের নাম',
  location: 'ঠিকানা লিখুন',
  exam: 'পরীক্ষার নাম লিখুন',
  classAndSubject: 'শ্রেণি ও বিষয়',
  examType: 'সৃজনশীল অভীক্ষা',
  time: '২ ঘণ্টা ৩০ মিনিট',
  marks: '৭০'
};

function creativeData(header = {}) {
  return {
    header,
    sections: [{
      title: '',
      questions: [{
        num: '১',
        text: 'সৃজনশীল প্রশ্নের বিবরণ',
        preContext: '',
        stimulus: '',
        statements: [],
        subQuestions: [],
        options: []
      }]
    }]
  };
}

function modelFromHeaderLines(lines) {
  const model = { institute: '', location: '', exam: '', classAndSubject: '', examType: '', time: '', marks: '' };
  for (const line of lines || []) {
    if (line.kind === 'institute') model.institute = line.text || '';
    else if (line.kind === 'location') model.location = line.text || '';
    else if (line.kind === 'exam') model.exam = line.text || '';
    else if (line.kind === 'classSubject') model.classAndSubject = line.text || '';
    else if (line.kind === 'metrics') {
      model.examType = line.center || '';
      model.time = String(line.text || '').replace(/^(?:সময়|সময়):\s*/, '');
      model.marks = String(line.right || '').replace(/^পূর্ণমান:\s*/, '');
    }
  }
  return model;
}

function decodeRtfUnicode(text) {
  return String(text).replace(/\\u(-?\d+)\??/g, (_, raw) => {
    const value = Number(raw);
    return String.fromCharCode(value < 0 ? value + 65536 : value);
  });
}

function countMatches(text, regex) {
  return (String(text).match(regex) || []).length;
}

function paragraphsContaining(source, marker, endMarker) {
  const out = [];
  let cursor = 0;
  while (true) {
    const at = source.indexOf(marker, cursor);
    if (at < 0) break;
    const end = source.indexOf(endMarker, at);
    if (end < 0) break;
    out.push(source.slice(at, end));
    cursor = end + endMarker.length;
  }
  return out;
}

async function main() {
  // 1. CQ-style fallback values appear in creative CQ, Math, and General plans/previews/Word outputs.
  for (const docType of CREATIVE_TYPES) {
    const data = creativeData();
    const plan = CqBookletPlanner.plan(data, { docType, skipFirstColumn: false });
    const model = CqBookletPlanner.headerPreviewModel(plan);
    for (const [field, value] of Object.entries(HEADER_EXPECTED)) {
      equal(model[field], value, `${docType}: planner preview-model ${field} fallback`);
    }

    const preview = QuestionEngine._renderToHtmlCore(data, {
      docType,
      orientation: 'landscape',
      skipFirstColumn: false,
      editable: true
    });
    for (const value of Object.values(HEADER_EXPECTED)) {
      includes(preview, value, `${docType}: editable preview includes ${value}`);
    }
    includes(preview, 'contenteditable="true"', `${docType}: preview remains editable`);

    const rtf = ExportDualEngine.generateCqExamRtf(data, {
      docType,
      returnInnerRtf: true,
      skipFirstColumn: false,
      renumber: false
    });
    const decodedRtf = decodeRtfUnicode(rtf);
    for (const value of Object.values(HEADER_EXPECTED)) {
      includes(decodedRtf, value, `${docType}: Word RTF includes ${value}`);
    }

    const docx = await ExportDualEngine.generateCqExamDocx(data, {
      docType,
      returnInnerXml: true,
      skipFirstColumn: false,
      renumber: false
    });
    for (const value of Object.values(HEADER_EXPECTED)) {
      includes(docx.bodyXml, value, `${docType}: Word DOCX includes ${value}`);
    }
  }

  // Portrait/standard preview uses the same creative fallback gate, not only the booklet branch.
  const standardPreview = QuestionEngine._renderToHtmlCore(creativeData(), {
    docType: 'EXAM_MATH', orientation: 'portrait', editable: true
  });
  includes(standardPreview, HEADER_EXPECTED.classAndSubject, 'EXAM_MATH portrait preview gets class/subject fallback');
  includes(standardPreview, 'সময়: ২ ঘণ্টা ৩০ মিনিট', 'EXAM_MATH portrait preview gets time fallback');

  // Caller-provided values win; only missing metadata is filled.
  const partialPlan = CqBookletPlanner.plan(creativeData({
    institute: 'উদাহরণ বিদ্যালয়',
    classAndSubject: 'দশম শ্রেণি — গণিত',
    time: '১ ঘণ্টা',
    marks: '২৫'
  }), { docType: 'EXAM_GENERAL', skipFirstColumn: false });
  const partialModel = CqBookletPlanner.headerPreviewModel(partialPlan);
  equal(partialModel.institute, 'উদাহরণ বিদ্যালয়', 'explicit institute remains unchanged');
  equal(partialModel.classAndSubject, 'দশম শ্রেণি — গণিত', 'explicit class/subject remains unchanged');
  equal(partialModel.time, '১ ঘণ্টা', 'explicit time remains unchanged');
  equal(partialModel.marks, '২৫', 'explicit marks remain unchanged');
  equal(partialModel.location, HEADER_EXPECTED.location, 'missing address is filled');
  equal(partialModel.exam, HEADER_EXPECTED.exam, 'missing exam title is filled');

  const mcqTypePlan = CqBookletPlanner.plan(creativeData(), { docType: 'EXAM_MCQ', skipFirstColumn: false });
  const mcqTypeModel = CqBookletPlanner.headerPreviewModel(mcqTypePlan);
  equal(mcqTypeModel.institute, '', 'CQ-style fallback is not broadened to EXAM_MCQ');

  // Export fallback plan must match the primary planner when the CQ planner is unavailable.
  const originalCqResolver = ExportDualEngine._getCqPlanner;
  try {
    ExportDualEngine._getCqPlanner = () => null;
    for (const docType of ['EXAM_MATH', 'EXAM_GENERAL']) {
      const fallbackPlan = ExportDualEngine._cqPlanFallback(creativeData(), { docType });
      const fallbackModel = modelFromHeaderLines(fallbackPlan.headerLines);
      for (const [field, value] of Object.entries(HEADER_EXPECTED)) {
        equal(fallbackModel[field], value, `${docType}: export fallback plan ${field}`);
      }
    }
  } finally {
    ExportDualEngine._getCqPlanner = originalCqResolver;
  }

  // 2. Equation fields preserve Bengali digits; ASCII digits remain ASCII when authored as ASCII.
  const bnEqField = EquationConverter.latexToEqField('\\frac{৩}{৫}', true);
  includes(bnEqField, '৩', 'Bijoy .doc EQ field preserves Bengali numerator digit');
  includes(bnEqField, '৫', 'Bijoy .doc EQ field preserves Bengali denominator digit');
  check(!bnEqField.includes('3') && !bnEqField.includes('5'), 'Bengali source digits are not remapped to ASCII in EQ field');

  const asciiEqField = EquationConverter.latexToEqField('\\frac{3}{5}', true);
  includes(asciiEqField, '3', 'ASCII numerator remains ASCII');
  includes(asciiEqField, '5', 'ASCII denominator remains ASCII');
  const mixedEqField = EquationConverter.latexToEqField('\\frac{৩}{5}', true);
  includes(mixedEqField, '৩', 'mixed equation keeps its Bengali source digit');
  includes(mixedEqField, '5', 'mixed equation keeps its ASCII source digit');
  check(!mixedEqField.includes('3'), 'mixed equation does not convert Bengali digit to ASCII');

  const textEqField = EquationConverter.latexToEqField('\\text{বাংলা ৩}', true);
  includes(textEqField, '৩', 'Bengali digit in a text macro remains Bengali');
  const simpleMath = EquationConverter.sanitizeSimpleMath('\\text{বাংলা ৩}', true);
  includes(simpleMath, '৩', 'simple-math text conversion preserves Bengali digits');
  const readableHtml = EquationConverter.latexToReadableHtml('\\frac{৩}{৫}', true);
  includes(readableHtml, '৩', 'readable equation HTML preserves numerator digit');
  includes(readableHtml, '৫', 'readable equation HTML preserves denominator digit');

  const omml = EquationConverter.latexToOmml('\\frac{৩}{৫}', true);
  includes(omml, '৩', 'DOCX OMML preserves Bengali numerator digit');
  includes(omml, '৫', 'DOCX OMML preserves Bengali denominator digit');

  const rtfEquation = ExportDualEngine.formatRtfText('$\\frac{৩}{৫}$', { font: 'bijoy' });
  const rtfThree = `\\u${'৩'.charCodeAt(0)}?`;
  const rtfFive = `\\u${'৫'.charCodeAt(0)}?`;
  includes(rtfEquation, rtfThree, 'Bijoy RTF equation field retains Bengali numerator code point');
  includes(rtfEquation, rtfFive, 'Bijoy RTF equation field retains Bengali denominator code point');
  const docxEquation = ExportDualEngine.renderDocxRuns('$\\frac{৩}{৫}$', { font: 'bijoy' });
  includes(docxEquation, '৩', 'DOCX export run preserves Bengali numerator digit');
  includes(docxEquation, '৫', 'DOCX export run preserves Bengali denominator digit');

  // 3. Math-grid choice is based on display width, not the presence of TeX markers/operators.
  const geom = McqLayoutPlanner.geometry({});
  const makeOptions = (values) => values.map((text, i) => ({ label: ['ক', 'খ', 'গ', 'ঘ'][i], text }));
  const visualCases = [
    { name: '2πr', values: ['$2\\pi r$', '$2r$', '$r$', '$\\pi$'] },
    { name: 'roots and scalar values', values: ['$\\sqrt{7}$', '$2\\sqrt{7}$', '$5$', '$10$'] },
    { name: 'simple fractions', values: ['$\\frac{1}{2}$', '$\\frac{3}{4}$', '$\\frac{5}{6}$', '$\\frac{7}{8}$'] },
    { name: 'short operators', values: ['$+$', '$−$', '$÷$', '$=$'] },
    { name: 'plain slash fractions', values: ['1/2', '2/3', '3/4', '4/5'] }
  ];
  for (const sample of visualCases) {
    const grid = McqLayoutPlanner.decideOptionsGrid(makeOptions(sample.values), 24, geom);
    equal(grid.cols, 4, `${sample.name}: short visual math stays in four columns`);
    equal(grid.stops.length, 3, `${sample.name}: four-column grid exposes its three separator stops`);
    check(grid.tabJumps.every((count) => count === 1), `${sample.name}: one left-tab advances to each planned stop`);
  }

  const twoColValues = Array(4).fill('$\\sqrt{1234567890}$');
  const twoColGrid = McqLayoutPlanner.decideOptionsGrid(makeOptions(twoColValues), 24, geom);
  equal(twoColGrid.cols, 2, 'medium visual equation width selects a 2×2 grid');
  equal(twoColGrid.stops.length, 1, 'two-column grid has a single half-width stop');
  check(twoColGrid.tabJumps.every((count) => count === 1), 'two-column rows use one tab to the half-width stop');

  const longValues = Array(4).fill('$\\sqrt{12345678901234567890}$');
  const oneColGrid = McqLayoutPlanner.decideOptionsGrid(makeOptions(longValues), 24, geom);
  equal(oneColGrid.cols, 1, 'visually long equations still fall back to one column');

  const originalMcqResolver = QuestionEngine._getMcqPlanner;
  try {
    QuestionEngine._getMcqPlanner = () => null;
    const fallbackHtml = QuestionEngine.renderMcqOptions(makeOptions(visualCases[0].values), { szHalf: 24 });
    includes(fallbackHtml, 'mcq-grid-4', 'preview no-planner fallback also keeps short math in four columns');
  } finally {
    QuestionEngine._getMcqPlanner = originalMcqResolver;
  }

  const originalExportMcqResolver = ExportDualEngine._getMcqPlanner;
  try {
    ExportDualEngine._getMcqPlanner = () => null;
    const fallbackPlan = ExportDualEngine._mcqPlanFallback({
      header: {},
      sections: [{ questions: [{ num: '১', text: 'প্রশ্ন', options: makeOptions(visualCases[0].values) }] }]
    }, {});
    equal(fallbackPlan.items[0].grid.cols, 4, 'export no-planner fallback also keeps short math in four columns');
  } finally {
    ExportDualEngine._getMcqPlanner = originalExportMcqResolver;
  }

  // The RTF \tx and DOCX w:tabs/w:tab payloads must agree with the selected 4/2-column plan.
  async function assertExportGrid(values, expectedCols, label) {
    const data = {
      header: {},
      sections: [{ questions: [{
        num: '১', text: 'বৃত্তের ক্ষেত্রফল', preContext: '', stimulus: '', statements: [], subQuestions: [],
        options: makeOptions(values)
      }] }]
    };
    const plan = McqLayoutPlanner.plan(data, {});
    const item = plan.items[0];
    equal(item.grid.cols, expectedCols, `${label}: planner chose expected grid`);

    const stopRtf = `\\li${plan.geometry.indent}` + item.grid.stops.map((stop) => `\\tx${stop}`).join('');
    const rtf = ExportDualEngine.generateMcqExamRtf(data, { returnInnerRtf: true, renumber: false });
    const rtfRows = paragraphsContaining(rtf, stopRtf, '\\par');
    equal(rtfRows.length, item.grid.rows.length, `${label}: RTF emits one option paragraph per planned row`);
    for (let row = 0; row < rtfRows.length; row++) {
      equal(countMatches(rtfRows[row], /\\tab/g), Math.max(0, item.grid.rows[row].length - 1), `${label}: RTF row ${row + 1} uses tabs matching its stops`);
    }

    const stopXml = item.grid.stops.map((stop) => `<w:tab w:val="left" w:pos="${stop}"/>`).join('');
    const docx = await ExportDualEngine.generateMcqExamDocx(data, { returnInnerXml: true, renumber: false });
    const docxRows = paragraphsContaining(docx.bodyXml, `<w:tabs>${stopXml}</w:tabs>`, '</w:p>');
    equal(docxRows.length, item.grid.rows.length, `${label}: DOCX emits one option paragraph per planned row`);
    for (let row = 0; row < docxRows.length; row++) {
      equal(countMatches(docxRows[row], /<w:r><w:tab\/><\/w:r>/g), Math.max(0, item.grid.rows[row].length - 1), `${label}: DOCX row ${row + 1} tabs match the same stops`);
    }
  }

  await assertExportGrid(visualCases[0].values, 4, 'four-across math grid');
  await assertExportGrid(twoColValues, 2, 'two-by-two math grid');

  console.log(`Part-14.2 regression gates passed: ${gates}`);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
