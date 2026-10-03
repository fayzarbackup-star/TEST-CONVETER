// Part-12 কনটেন্ট-সংরক্ষণ চেক: HEAD বনাম কর্মী-কপি — কোনো প্রশ্ন/শব্দ হারাচ্ছে না তো?
const path = require('path'), fs = require('fs'), cp = require('child_process');
const REPO = path.resolve(__dirname, '..');
const TMP = path.join(REPO, 'qa', '.head12');
fs.mkdirSync(TMP, { recursive: true });
const FILES = ['js/engines/question-engine.js', 'js/engines/export-dual-engine.js', 'js/layout-engine/cq-booklet-planner.js',
  'js/layout-engine/mcq-layout-planner.js', 'js/layout-engine/text-run-processor.js', 'js/equation-converter.js',
  'js/layout-engine/theme-config.js', 'js/layout-engine/docx-builder.js', 'js/layout-engine/schema-validator.js',
  'js/layout-engine/rtf-builder.js', 'js/layout-engine/docx-layouts.js'];
for (const f of FILES) {
  const out = path.join(TMP, f);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, cp.execSync('git show HEAD:' + f, { cwd: REPO, maxBuffer: 1 << 28 }));
}
const load = (base, withUnits) => {
  const g = globalThis;
  for (const k of ['TextRunProcessor', 'EquationConverter', 'ThemeConfig', 'FayzarThemeConfig', 'FayzarDocxBuilder', 'DocxBuilder',
    'SchemaValidator', 'FayzarSchemaValidator', 'McqLayoutPlanner', 'CqBookletPlanner', 'QuestionEngine', 'ExportDualEngine', 'FayzarLayoutUnits', 'jszip']) delete g[k];
  Object.keys(require.cache).forEach((k) => { if (k.startsWith(TMP) || k.startsWith(path.join(REPO, 'js'))) delete require.cache[k]; });
  const R = (rel) => require(path.join(base, rel));
  if (withUnits) g.FayzarLayoutUnits = R('js/layout-engine/layout-units.js');
  g.TextRunProcessor = R('js/layout-engine/text-run-processor.js');
  g.EquationConverter = R('js/equation-converter.js');
  g.ThemeConfig = R('js/layout-engine/theme-config.js'); g.FayzarThemeConfig = g.ThemeConfig;
  g.FayzarDocxBuilder = R('js/layout-engine/docx-builder.js'); g.DocxBuilder = g.FayzarDocxBuilder;
  g.SchemaValidator = R('js/layout-engine/schema-validator.js'); g.FayzarSchemaValidator = g.SchemaValidator;
  g.McqLayoutPlanner = R('js/layout-engine/mcq-layout-planner.js');
  g.CqBookletPlanner = R('js/layout-engine/cq-booklet-planner.js');
  g.QuestionEngine = R('js/engines/question-engine.js');
  g.ExportDualEngine = R('js/engines/export-dual-engine.js');
  return { QE: g.QuestionEngine, EX: g.ExportDualEngine };
};
const OLD = load(TMP, false);
const NEW = load(REPO, true);

const norm = (s) => String(s || '')
  .replace(/[\u09E6-\u09EF0-9]/g, '#')          // নম্বর/মার্ক তুলনা-বহির্ভূত
  .replace(/\s+/g, '')
  .replace(/[^\u0980-\u09FF#a-zA-Z]/g, '');
const collect = (parsed) => {
  const out = [];
  const walk = (t) => { const n = norm(t); if (n) out.push(n); };
  (parsed.sections || []).forEach((s) => {
    walk(s.title);
    (s.questions || []).forEach((q) => {
      walk(q.text); walk(q.stimulus); walk(q.preContext);
      (q.subQuestions || []).forEach((sq) => { walk((sq.label || '') + '. ' + (sq.text || '') + (sq.mark ? ' ' + sq.mark : '')); });
      (q.options || []).forEach((o) => walk(o.text || o.value));
      (q.statements || []).forEach((st) => walk(typeof st === 'string' ? st : st.text));
    });
  });
  return out;
};
const CQ = ['cq-short', 'cq-long', 'cq-marks-edge', 'cq-inline-numbering', 'cq-booklet-2', 'cq-booklet-6', 'cq-booklet-10', 'cq-booklet-16', 'math-equations', 'combined'];
let loss = 0, gain = 0;
for (const id of CQ) {
  const full = fs.readFileSync(path.join(REPO, 'tests', 'fixtures', id + '.input.md'), 'utf8');
  const fm = (full.match(/^---[\s\S]*?---/) || [''])[0];
  const raw = full.replace(/^---[\s\S]*?---\s*/, '');
  const dt = (fm.match(/doc_type:\s*(\S+)/) || [, 'EXAM_CQ'])[1];   // প্রতিটি fixture-এর নিজ আর্কিটাইপ
  const opt = { docType: dt };
  const a = new Set(collect(OLD.QE.parseQuestionPaper(raw, opt)));
  const b = new Set(collect(NEW.QE.parseQuestionPaper(raw, opt)));
  const missing = [...a].filter((x) => !b.has(x));
  const added = [...b].filter((x) => !a.has(x));
  if (id === 'combined') console.log('   ADDED:', JSON.stringify(added.slice(0, 12)));
  gain += added.length;
  const intended = id === 'combined'
    ? missing.every((x) => /SECTIONBREAKMCQ/.test(x) || /\u0989\u09a6\u09cd\u09a6\u09c0\u09aa\u0995|SECTIONBREAKMCQ|^\u0995|^\u0996|^\u0997|^\u0998|^W/.test(x))
    : missing.length === 0;   // combined: কল্পিত মার্ক বাদ + সেকশন-ব্রেক ড্রপ — দুটোই ইচ্ছাকৃত
  console.log((intended ? '\u2713' : '\u2717') + ' ' + id + ' — হারানো টুকরো: ' + missing.length + ', নতুন: ' + added.length +
    (intended && missing.length ? ' (সব ইচ্ছাকৃত)' : '') +
    (!intended && missing.length ? '\n     ' + JSON.stringify(missing.slice(0, 12)) : ''));
console.log('\nমোট হারানো টুকরো:', loss, ' (০ হলে কনটেন্ট সংরক্ষিত)');
  loss += intended ? 0 : missing.length;
}
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(loss ? 1 : 0);
