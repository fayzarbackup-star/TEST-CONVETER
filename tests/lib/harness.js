/**
 * Fayzar Layout Regression Harness (Phase 2 - Step 0)
 * ---------------------------------------------------
 * Loads the ACTIVE engines in Node and produces deterministic text snapshots
 * for every fixture, so that any future change (e.g. the EXAM_CQ work) can be
 * proven not to regress the other layouts.
 *
 * NOTE: This file lives entirely inside tests/. It never modifies any engine.
 * Frozen core engines are never required here.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// 1. Engine loading (engines expect browser-ish globals)
// ---------------------------------------------------------------------------

function loadEngines() {
  const g = globalThis;

  const reg = (name, relPath) => {
    const mod = require(path.join(ROOT, relPath));
    g[name] = mod;
    return mod;
  };

  // Layout engine helpers first (export-dual-engine resolves them via globals)
  reg('FayzarLayoutUnits', 'js/layout-engine/layout-units.js');   // Part-12: শেয়ার্ড একক-নরমালাইজার
  reg('TextRunProcessor', 'js/layout-engine/text-run-processor.js');
  reg('EquationConverter', 'js/equation-converter.js');
  reg('ThemeConfig', 'js/layout-engine/theme-config.js');
  g.FayzarThemeConfig = g.ThemeConfig;
  reg('FayzarDocxBuilder', 'js/layout-engine/docx-builder.js');
  g.DocxBuilder = g.FayzarDocxBuilder;
  reg('McqLayoutPlanner', 'js/layout-engine/mcq-layout-planner.js');
  reg('CqBookletPlanner', 'js/layout-engine/cq-booklet-planner.js');   // Part-12
  reg('SchemaValidator', 'js/layout-engine/schema-validator.js');
  g.FayzarSchemaValidator = g.SchemaValidator;

  // Document engines
  reg('DocClassifier', 'js/engines/doc-classifier.js');
  reg('FayzarGeneralParser', 'js/layout-engine/general-paper-parser.js');   // Part-18.7
  reg('QuestionEngine', 'js/engines/question-engine.js');
  reg('RoutineEngine', 'js/engines/routine-engine.js');
  reg('CertificateEngine', 'js/engines/certificate-engine.js');
  reg('StampEngine', 'js/engines/stamp-engine.js');
  reg('ApplicationEngine', 'js/engines/application-engine.js');
  reg('AdmitCardEngine', 'js/engines/admit-card-engine.js');
  reg('SalarySlipEngine', 'js/engines/salary-slip-engine.js');
  reg('CVEngine', 'js/engines/cv-engine.js');
  reg('ExportDualEngine', 'js/engines/export-dual-engine.js');
  reg('FayzarPipeline', 'js/layout-engine/fayzar-pipeline.js');

  return {
    Pipeline: g.FayzarPipeline,
    Question: g.QuestionEngine,
    Export: g.ExportDualEngine,
    Classifier: g.DocClassifier
  };
}

// ---------------------------------------------------------------------------
// 2. Fixture helpers
// ---------------------------------------------------------------------------

function splitFrontmatter(raw) {
  const text = String(raw || '').replace(/\r\n/g, '\n');
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { meta: {}, body: text.trim() };
  const meta = {};
  m[1].split('\n').forEach((line) => {
    const kv = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  });
  return { meta, body: text.substring(m[0].length).trim() };
}

function listFixtures() {
  const dir = path.join(ROOT, 'tests', 'fixtures');
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.input.md'))
    .sort()
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const { meta, body } = splitFrontmatter(raw);
      return {
        id: f.replace(/\.input\.md$/, ''),
        file: f,
        meta,
        body,
        docType: meta.doc_type || null
      };
    });
}

// ---------------------------------------------------------------------------
// 3. Normalisation — snapshots must be stable across runs/machines
// ---------------------------------------------------------------------------

function normalize(str) {
  return String(str == null ? '' : str)
    .replace(/\r\n/g, '\n')
    .replace(/>\s*</g, '>\n<')      // one XML/HTML tag per line => readable diffs
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stableJson(value) {
  const seen = new WeakSet();
  const walk = (v) => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(walk);
    const out = {};
    Object.keys(v).sort().forEach((k) => { out[k] = walk(v[k]); });
    return out;
  };
  return JSON.stringify(walk(value), null, 2);
}

// ---------------------------------------------------------------------------
// 4. Probes — each probe produces one snapshot section for a fixture
// ---------------------------------------------------------------------------

async function buildSnapshot(engines, fx) {
  const { Pipeline, Question, Export } = engines;
  const docType = fx.docType || 'EXAM_CQ';
  const sections = [];

  const push = (name, body, err) => {
    sections.push(
      `===== ${name} =====\n` +
      (err ? `ERROR: ${err}` : normalize(body))
    );
  };

  // 4.1 Classifier decision (guards against doc-type drift)
  try {
    const cls = engines.Classifier.classify(fx.body);
    push('CLASSIFIER', stableJson({ type: cls.type, reason: cls.reason }));
  } catch (e) { push('CLASSIFIER', '', e.message); }

  // 4.2 Parsed AST (numbering, marks, sub-questions, stimulus)
  let parsed = null;
  try {
    parsed = Pipeline._parseByDocType(docType, fx.body, {});
    push('PARSED', stableJson(parsed));
  } catch (e) { push('PARSED', '', e.message); }

  // 4.3 Structural summary — the invariants we must never break
  try {
    push('STRUCTURE', stableJson(summarizeQuestions(parsed)));
  } catch (e) { push('STRUCTURE', '', e.message); }

  // 4.4 HTML preview
  try {
    const res = await Pipeline.process(fx.body, { docType, outputFormat: 'html' });
    push('HTML', res.content);
  } catch (e) { push('HTML', '', e.message); }

  // 4.5 DOCX inner XML (body + sectPr) — no zipping, so no jszip needed
  try {
    push('DOCX_XML', await docxInnerXml(Export, docType, parsed, fx.body));
  } catch (e) { push('DOCX_XML', '', e.message); }

  // 4.6 Legacy RTF / .doc output
  try {
    // Part-15.5: generateLegacyDoc একটি Blob দেয় — আগে এখানে "[object Blob]" স্ন্যাপশট হতো, ফলে
    // .doc-এর আসল RTF (EQ-ফিল্ড ইত্যাদি) কখনো রিগ্রেশন-যাচাইয়ে আসেনি। এখন পূর্ণ RTF টেক্সট।
    const rtfOut = Export.generateLegacyDoc(fx.body, docType, {});
    push('RTF', rtfOut && typeof rtfOut.text === 'function' ? await rtfOut.text() : rtfOut);
  } catch (e) { push('RTF', '', e.message); }

  return `# fixture: ${fx.id}\n# docType: ${docType}\n\n` + sections.join('\n\n') + '\n';
}

async function docxInnerXml(Export, docType, parsed, rawText) {
  const opts = { returnInnerXml: true };
  let res = null;

  if (parsed && (docType === 'EXAM_CQ' || docType === 'EXAM_MATH' || docType === 'EXAM_GENERAL')) {
    res = await Export.generateCqExamDocx(parsed, opts);
  } else if (parsed && docType === 'EXAM_MCQ') {
    res = await Export.generateMcqExamDocx(parsed, opts);
  } else if (parsed && docType === 'EXAM_COMBINED') {
    // Combined has no returnInnerXml hook; snapshot both halves separately.
    const cq = await Export.generateCqExamDocx(parsed, opts);
    const mcq = await Export.generateMcqExamDocx(parsed, opts);
    return '<!-- CQ PART -->\n' + cq.bodyXml + cq.sectPr +
           '\n<!-- MCQ PART -->\n' + mcq.bodyXml + mcq.sectPr;
  } else {
    return '(no inner-xml probe for docType ' + docType + ')';
  }

  if (!res || typeof res !== 'object' || !('bodyXml' in res)) {
    return '(generator did not honour returnInnerXml)';
  }
  return res.bodyXml + res.sectPr;
}

/**
 * Invariant summary used by the assertion layer:
 * question numbers, sub-question labels and marks EXACTLY as produced.
 */
function summarizeQuestions(parsed) {
  if (!parsed || !Array.isArray(parsed.sections)) return { sections: 0, questions: [] };
  const questions = [];
  parsed.sections.forEach((sec, si) => {
    (sec.questions || []).forEach((q) => {
      questions.push({
        section: si,
        num: q.num || '',
        hasStimulus: !!(q.stimulus && q.stimulus.trim()),
        subs: (q.subQuestions || []).map((s) => `${s.label || '-'}:${s.mark === '' || s.mark == null ? '∅' : s.mark}`),
        optionCount: (q.options || []).length,
        textHead: String(q.text || '').slice(0, 40)
      });
    });
  });
  return {
    sections: parsed.sections.length,
    questionCount: questions.length,
    numbering: questions.map((q) => q.num),
    marks: questions.map((q) => q.subs.join(',')),
    questions
  };
}

module.exports = {
  ROOT,
  loadEngines,
  listFixtures,
  splitFrontmatter,
  buildSnapshot,
  summarizeQuestions,
  normalize,
  stableJson
};
