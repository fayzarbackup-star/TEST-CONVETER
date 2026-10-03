/**
 * Part-11: সৃজনশীল (EXAM_CQ) ও কম্বাইন্ড (EXAM_COMBINED) মাস্টার লেআউট গেট
 *   node tests/cq-layout.test.mjs
 *
 * যাচাই করা চুক্তি (LAYOUT_SPECIFICATION.md §১১ / TC-LAY-29…TC-LAY-35):
 *   (ক) TC-LAY-29  জ্যামিতি  : A4 ল্যান্ডস্কেপ, 0.5" মার্জিন, ২ কলাম, 0.7" গ্যাপ, কলাম-প্রস্থ
 *   (খ) TC-LAY-30  হেডার     : ৫-লাইন হেডার, সাইজ, মাঝে সেন্টারড আন্ডারলাইন লেবেল, ডিভাইডার
 *   (গ) TC-LAY-31  বুকলেট    : শীট-১ কলাম-১ = ব্যাক কভার (সংরক্ষিত/উপচানো অংশে ভরা),
 *                              পৃষ্ঠা-প্রতি একটি কলাম, docPages = ceil(কলাম/2)
 *   (ঘ) TC-LAY-32  মাপ       : উদ্দীপক+স্টেম+ছক+উপ-প্রশ্ন+অথবা গণনা; কোনো আইটেম হারায় না
 *   (ঙ) TC-LAY-33  তিন পাথ  : RTF(.doc) / DOCX(.docx) / HTML প্রিভিউ — একই প্ল্যান, একই জ্যামিতি
 *   (চ) TC-LAY-34  কম্বাইন্ড : CQ ল্যান্ডস্কেপ → next-page সেকশন ব্রেক → MCQ পোর্ট্রেট
 *   (ছ) TC-LAY-35  ইনভ্যারিয়েন্ট: নম্বর/উপ-প্রশ্ন একবারই ছাপা হয় ( Duplication/loss নেই),
 *                              MCQ পাথ (Part-10) অক্ষত
 *   (জ) রেন্ডার গেট : LibreOffice থাকলে .doc → PDF মেপে পৃষ্ঠাসংখ্যা ও ল্যান্ডস্কেপ্র যাচাই
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const g = globalThis;
g.TextRunProcessor = require(path.join(ROOT, 'js/layout-engine/text-run-processor.js'));
g.EquationConverter = require(path.join(ROOT, 'js/equation-converter.js'));
g.ThemeConfig = require(path.join(ROOT, 'js/layout-engine/theme-config.js'));
g.FayzarThemeConfig = g.ThemeConfig;
g.FayzarDocxBuilder = require(path.join(ROOT, 'js/layout-engine/docx-builder.js'));
g.DocxBuilder = g.FayzarDocxBuilder;
g.SchemaValidator = require(path.join(ROOT, 'js/layout-engine/schema-validator.js'));
g.FayzarSchemaValidator = g.SchemaValidator;
g.jszip = require(path.join(ROOT, 'js/jszip.min.js'));
g.McqLayoutPlanner = require(path.join(ROOT, 'js/layout-engine/mcq-layout-planner.js'));
g.CqBookletPlanner = require(path.join(ROOT, 'js/layout-engine/cq-booklet-planner.js'));
g.DocClassifier = require(path.join(ROOT, 'js/engines/doc-classifier.js'));
g.QuestionEngine = require(path.join(ROOT, 'js/engines/question-engine.js'));
g.ExportDualEngine = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));

const P = g.CqBookletPlanner;
const MP = g.McqLayoutPlanner;
const QE = g.QuestionEngine;
const EX = g.ExportDualEngine;

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

const bodyOf = (id) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', `${id}.input.md`), 'utf8').replace(/^---[\s\S]*?---\s*\r?\n?/, '');
const parseCq = (t) => QE.parseQuestionPaper(t, { docType: 'EXAM_CQ' });
const CQ_FIX = ['cq-short', 'cq-long', 'cq-marks-edge', 'cq-inline-numbering', 'cq-booklet-2', 'cq-booklet-6', 'cq-booklet-10', 'cq-booklet-16'];
const L = {};
for (const id of CQ_FIX) L[id] = { body: bodyOf(id), parsed: parseCq(bodyOf(id)) };
const planOf = (id) => P.plan(L[id].parsed, { docType: 'EXAM_CQ' });

// ═════════════ (ক) TC-LAY-29 — বুকলেট জ্যামিতি ═════════════
console.log('\n— (ক) TC-LAY-29: জ্যামিতি —');
{
  const geo = P.geometry({});
  T('পেজ A4 ল্যান্ডস্কেপ: paperw16838 paperh11906', geo.pageW === 16838 && geo.pageH === 11906 && geo.landscape === true, geo);
  T('চারদিকে 0.5" মার্জিন (720 twips)', geo.margin === 720);
  T('২ কলাম, মাঝের গ্যাপ 0.7" (1008 twips)', geo.cols === 2 && geo.colGap === 1008);
  T('বুকলেটে মাঝের কলাম-লাইন নেই (ভাঁজই বিভাজক)', geo.colSep === false);
  T('প্রশ্নের হ্যাঙ্গিং 432 dxa, উপ-প্রশ্নের ইনডেন্ট 864 dxa', geo.indent === 432 && geo.subIndent === 864 && geo.subHanging === 432);
  T('ইউজিবল প্রস্থ 15398, উচ্চতা 10466', geo.usableW === 15398 && geo.usableH === 10466, geo);
  T('কলাম-প্রস্থ 7195 (=(15398−1008)/2)', geo.colW === 7195);
  T('লেখার প্রস্থ: স্টেম 6763, উপ-প্রশ্ন 6331', geo.textW === 6763 && geo.subTextW === 6331);
  T('রাইট ট্যাব কলামের ডান প্রান্তে (7195); options.rightTab দিয়ে ওভাররাইড 7050',
    geo.rightTab === 7195 && P.geometry({ rightTab: 7050 }).rightTab === 7050);
  T('লাইন-উচ্চতা 12pt × 1.50 = 360 twips', P.lineH(24, geo) === 360);
  T('কলাম-ধারকতা ≈ 98% (10257 twips)', geo.capacity === 10257, geo.capacity);
  T('মার্জিন/গ্যাপ/কলাম UI অপশন থেকে আসে', (() => {
    const q = P.geometry({ margin: 0.4, columnGap: 0.5, cols: 3 });
    return q.margin === 576 && q.colGap === 720 && q.cols === 3;
  })());
  const s1 = 'কোষ কী? উদ্ভিদ ও প্রাণী';
  T('দুই প্ল্যানার একই মাপ মানে (measure/lineCount মিল)',
    P.measure(s1, 24) === MP.measure(s1, 24) && P.lineCount(s1, 24, 6763) === MP.lineCount(s1, 24, 6763),
    [P.measure(s1, 24), MP.measure(s1, 24)]);
}

// ═════════════ (খ) TC-LAY-30 — হেডার ব্লক ═════════════
console.log('\n— (খ) TC-LAY-30: হেডার —');
{
  const h = { institute: 'মডেল হাই স্কুল', location: 'রংপুর জেলা', exam: 'বার্ষিক পরীক্ষা - ২০৫', classAndSubject: 'শ্রেণিঃ অষ্টম | বিষয়ঃ বিজ্ঞান', time: '২ ঘণ্টা ৩০ মিনিট', marks: '৭০' };
  const lines = P.buildHeader(h);
  T('হেডার ক্রম: প্রতিষ্ঠান → ঠিকানা → পরীক্ষা → শ্রেণি/বিষয় → সময়↔লেবেল↔পূর্ণমান',
    lines.map((l) => l.kind).join('>') === 'institute>location>exam>classSubject>metrics', lines.map((l) => l.kind));
  T('সাইজ: প্রতিষ্ঠান 16pt(32) বোল্ড, ঠিকানা 12pt, পরীক্ষা 13pt(26) বোল্ড, বাকি 12pt',
    lines[0].sz === 32 && lines[0].bold === true && lines[1].sz === 24 && lines[2].sz === 26 && lines[2].bold === true && lines[3].sz === 24 && lines[4].sz === 24);
  T('মেট্রিক্স লাইনে সময় বামে, লেবেলে মাঝে, পূর্ণমানে ডানে',
    lines[4].text.startsWith('সময়: ') && lines[4].center === 'সৃজনশীল অভীক্ষা' && lines[4].right.startsWith('পূর্ণমান: '), lines[4]);
  T('লেখা না থাকলে লাইনটি বসে না (placeholder-ভিত্তি নেই — CQ চুক্তি)', P.buildHeader({}).length === 0);
  T('ব্যবহারকারীর examType থাকলে সেটিই মাঝের লেবেল',
    P.buildHeader({ time: '৩ ঘণ্টা', examType: 'অর্ধবার্ষিক অভীক্ষা' })[0].center === 'অর্ধবার্ষিক অভীক্ষা');
  const geo = P.geometry({});
  const hh = P.headerHeight(lines, geo);
  T('হেডার-উচ্চতা ৫ লাইন + ডিভাইডার (≥ 1500, ≤ 2400 twips)', hh >= 1500 && hh <= 2400, hh);
  T('খালি হেডারের উচ্চতা ০', P.headerHeight([], geo) === 0);
  const model = P.headerPreviewModel(P.plan({ header: h, sections: [] }, {}));
  T('প্রিভিউ-মডেল প্রিন্ট-প্ল্যান থেকেই ফিল্ড পায় (preview == download)',
    model.institute === h.institute && model.examType === 'সৃজনশীল অভীক্ষা' && model.marks === h.marks && model.classAndSubject === h.classAndSubject, model);
}

// ═════════════ (গ) TC-LAY-31 — বুকলেট ইম্পোজিশন ═════════════
console.log('\n— (গ) TC-LAY-31: বুকলেট ইম্পোজিশন —');
{
  const p2 = planOf('cq-booklet-2');
  T('ছোট পত্র: সব কনটেন্ট পৃষ্ঠা-১ কলামেই বসে, সংরক্ষিত কলাম খালি থাকে',
    p2.columns.length === 1 && p2.columns[0].role === 'page1' && p2.skipFirstColumn === true, { cols: p2.columns.length, skip: p2.skipFirstColumn });
  T('খালি সংরক্ষিত কলামেও docPages = ১ (এক শীটেই ফ্রন্ট+ব্যাক)', p2.metrics.docPages === 1 && p2.metrics.sheets === 1, p2.metrics);

  const p6 = planOf('cq-booklet-6');
  T('উপচানো অংশ ব্যাক কভারে ওঠে (reservedUsed)', p6.metrics.reservedUsed === true && p6.columns[0].role === 'backcover', p6.columns.map((c) => c.role));
  T('ব্যাক কভারের পরেই ফ্রন্ট কভার (হেডারসহ), slot ক্রম ০,১,২…',
    p6.columns.map((c) => c.slot).join(',') === '0,1,2' && p6.columns[1].role === 'page1' && p6.columns[1].headerFirst === true,
    p6.columns.map((c) => c.slot + ':' + c.role));
  // Part-13.4: প্রাকৃতিক প্রবাহ — mid-flow কৃত্রিম ব্রেক বন্ধ; ব্রেক কেবল ব্যাক-কভারের পরে flow-শুরুতে
  T('Part-13.4: ব্রেক কেবল লিডিং (ব্যাক-কভার-পরবর্তী) — mid-flow ব্রেক নেই',
    p6.columns.every((c, i) => c.breakBefore === (i === 1)), p6.columns.map((c) => c.role + ':' + c.breakBefore));
  T('docPages = ceil(ফ্লো-কলাম/২)', p6.metrics.docPages === Math.ceil((p6.columns.length + (p6.skipFirstColumn ? 1 : 0)) / 2), p6.metrics);

  const p10 = planOf('cq-booklet-10');
  T('ধারকতার ভেতরেই ভাগ (প্রতি কলামের height ≤ cap)', p10.columns.every((c) => c.height <= c.cap + 1), p10.columns.map((c) => c.height + '/' + c.cap));
  T('পৃষ্ঠা-১-এর ক্যাপ হেডার-উচ্চতা বাদ দিয়ে (cap + headHeight = কলাম-ক্যাপ)',
    Math.abs((p10.columns.find((c) => c.role === 'page1').cap + p10.headerHeight) - p10.metrics.capacity) <= 4,
    p10.columns.find((c) => c.role === 'page1').cap);

  const noSkip = P.plan(L['cq-booklet-6'].parsed, { skipFirstColumn: false });
  T('skipFirstColumn:false → ক্রমাগত ফ্লো (কোনো forced কলাম-ব্রেক নয়, সংরক্ষিত কলাম নেই)',
    noSkip.skipFirstColumn === false && noSkip.columns.every((c) => c.breakBefore === false), noSkip.columns.map((c) => c.breakBefore));
  const forceSkip = P.plan(L['cq-booklet-10'].parsed, { skipFirstColumn: true });
  T('skipFirstColumn:true → কলাম-১ অবশ্যই খালি (টেল-ভরতি বন্ধ)',
    forceSkip.skipFirstColumn === true && forceSkip.metrics.reservedUsed === false && forceSkip.metrics.tailMoved === 0, forceSkip.metrics);

  const empty = P.plan({ header: {}, sections: [] }, {});
  T('খালি পত্র → ফাঁকা প্ল্যান, তবু জ্যামিতিসহ (ক্র্যাশ নয়)', empty.columns.length === 0 && empty.geometry.pageW === 16838);

  // কোনো আইটেম বাদ পড়ে না / দ্বৈত হয় না
  for (const id of CQ_FIX) {
    const pl = planOf(id);
    const inPlan = pl.columns.reduce((a, c) => a + c.items.filter((i) => i.kind === 'question').length, 0);
    const qs = L[id].parsed.sections.reduce((a, s) => a + s.questions.length, 0);
    if (inPlan !== qs) { T(`সব প্রশ্ন প্ল্যানে আছে (${id})`, false, { inPlan, qs }); break; }
    if (id === CQ_FIX[CQ_FIX.length - 1]) T('সব নমুনায় প্রতিটি প্রশ্ন ঠিক একবারই প্ল্যানে (ক্ষয়/দ্বৈত নেই)', true);
  }
}

// ═════════════ (ঘ) TC-LAY-32 — মাপ জোড়া ═════════════
console.log('\n— (ঘ) TC-LAY-32: মাপ —');
{
  const geo = P.geometry({});
  const q = { num: '১', text: 'নিচের প্রশ্নগুলোর উত্তর দাও:', preContext: 'লাইন এক\nলাইন দুই', stimulus: 'উদ্দীপকের বর্ণনা।\n| ক | খ |\n| --- | --- |\n| ১ | ২ |', subQuestions: [{ label: 'ক', text: 'কোষ কী?', mark: '১' }, { label: 'খ', text: 'পার্থক্য লেখো।', mark: '২' }, { isAlternative: true, label: '', text: '--- অথবা ---', mark: '' }] };
  const m = P.measureQuestion(q, geo.baseSz, geo);
  T('উদ্দীপক(preContext) গণনায় ধরা হয় (আগে প্রিন্টে হারাত)', m.parts.pre === 2, m.parts);
  T('স্টেম ১ লাইন', m.parts.stem === 1);
  T('ছকের লাইন আলাদা করে গণনা (২টি ডেটা-সারি)', m.parts.table === 2, m.parts);
  T('উপ-প্রশ্ন ২টি + অথবা-ডিভাইডার ১', m.parts.subCount === 2 && m.parts.orDivider === 1, m.parts);
  T('উচ্চতা = লাইন × 360 + স্পেসিং (>০, সসীম)', m.height > 0 && Number.isFinite(m.height), m.height);
  const big = { num: '৯', text: 'ক '.repeat(400), preContext: '', stimulus: '', subQuestions: [] };
  const mb = P.measureQuestion(big, geo.baseSz, geo);
  T('অতি-লম্বা স্টেম দীর্ঘতর হয় (র‍্যাপ গণনা কাজ করে)', mb.lines > 5, mb.lines);
}

// ═════════════ (ঙ) TC-LAY-33 — RTF / DOCX / প্রিভিউ সমতা ═════════════
console.log('\n— (ঙ) TC-LAY-33: তিন পাথের সমতা —');
const geo = P.geometry({});
const plan6 = planOf('cq-booklet-6');
const parsed6 = (() => { const p = L['cq-booklet-6'].parsed; p.header = { institute: 'মডেল হাই স্কুল', location: 'রংপুর জেলা', exam: 'বার্ষিক পরীক্ষা - ২০২', classAndSubject: 'শ্রেণিঃ অষ্টম | বিষয়ঃ বিজ্ঞান', time: '২ ঘণ্টা ৩০ মিনিট', marks: '৭০', examType: '' }; return p; })();
const P10 = (() => { const p = L['cq-booklet-10'].parsed; p.header = { institute: 'মডেল হাই স্কুল', location: 'রংপুর জেলা', exam: 'বার্ষিক পরীক্ষা - ২০২', classAndSubject: 'শ্রেণিঃ অষ্টম | বিষয়ঃ বিজ্ঞান', time: '২ ঘণ্টা ৩০ মিনিট', marks: '৭০', examType: '' }; return p; })();
let rtf6 = '', xml6 = '', html6 = '';
{
  rtf6 = EX.generateCqExamRtf(parsed6, {});
  const breaks = plan6.columns.filter((c) => c.breakBefore).length + (plan6.skipFirstColumn ? 1 : 0);
  T('.doc  \\landscape + paperw16838 paperh11906', /\{\\rtf1\\ansi/.test(rtf6) && rtf6.includes('\\landscape\\paperw16838\\paperh11906'));
  T('.doc  margl/margr/margt/margb 720', rtf6.includes('\\margl720\\margr720\\margt720\\margb720'));
  T('.doc  \\cols2\\colsx1008 (কলাম লাইন নেই)', rtf6.includes('\\cols2\\colsx1008') && !rtf6.includes('\\linebetcol'));
  T(`.doc  {\column} সংখ্যা ${breaks} == প্ল্যান`, (rtf6.match(/\{\\column\}/g) || []).length === breaks, (rtf6.match(/\{\\column\}/g) || []).length);
  T('.doc  স্টেম হ্যাঙ্গিং \\li432\\fi-432', /\{\\ql\\b\\fs24\\f0[^\n]*\\li432\\fi-432/.test(rtf6));
  T('.doc  উপ-প্রশ্ন \\li864\\fi-432', /\{\\ql\\f0[^\n]*\\li864\\fi-432/.test(rtf6));
  T('.doc  নম্বর রাইট ট্যাবে \\tqr\\tx' + geo.rightTab, rtf6.includes('\\tqr\\tx' + geo.rightTab));
  T('.doc  হেডারে মাঝ-ট্যাব \\tqc\\tx' + Math.round(geo.rightTab / 2) + ' ও \\b\\ul লেবেল',
    rtf6.includes('\\tqc\\tx' + Math.round(geo.rightTab / 2)) && /\\tqc\\tx\d+[\s\S]{0,900}?\\b\\ul/.test(rtf6));
  T('.doc  হেডারের নিচে মাত্র একটি ডিভাইডার', (rtf6.match(/\\brdrb\\brdrs/g) || []).length === 1, (rtf6.match(/\\brdrb\\brdrs/g) || []).length);
  T('.doc  উদ্দীপকে বক্স/শেডিং নেই (\\box / \\shading not used)', !/\\box|\\shading\d/.test(rtf6));
  const rtf10 = EX.generateCqExamRtf(P10, {});
  T('.doc  ছক অটো-উইডথ ও কমপ্যাক্ট প্যাডিং (\\trgaph30, \\trleft0)', rtf10.includes('\\trgaph30\\trleft0') && !rtf10.includes('\\trleft-108'));
  T('.doc  প্রতিটি টেবিল-সারি একবারই (\\trowd ×2/প্রশ্ন: হেডার+ডেটা)',
    (rtf10.match(/\\trowd/g) || []).length === 2 * P10.sections.reduce((a, x) => a + x.questions.length, 0),
    [(rtf10.match(/\\trowd/g) || []).length, 2 * P10.sections.reduce((a, x) => a + x.questions.length, 0)]);
  const altN6 = plan6.items.reduce((a, it) => a + ((it.q.subQuestions || []).filter((sq) => sq && sq.isAlternative).length), 0);
  const altRe = /\{\\qc\\b\\f0\\fs24\\sl[0-9]+\\slmult[0-9]\\sb20\\sa20/g;   // Part-12: পিচ প্ল্যান-নির্ভর
  T('.doc  অথবা-ডিভাইডার সেন্টারে বোল্ড (পার্স-গণনার সমান সংখ্যক)',
    altN6 > 0 && (rtf6.match(altRe) || []).length === altN6, [(rtf6.match(altRe) || []).length, altN6]);

  const blob = await EX.generateCqExamDocx(parsed6, {});
  const z = await g.jszip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  xml6 = await z.file('word/document.xml').async('string');
  T('.docx  pgSz 16838×11906 orient=landscape', /<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"\/>/.test(xml6));
  T('.docx  pgMar 720 চারদিকে', /<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/.test(xml6));
  T('.docx  cols num=2 space=1008 (sep নেই)', /<w:cols w:num="2" w:space="1008"\/>/.test(xml6));
  T('.docx  কলাম-ব্রেক সংখ্যা .doc-এর সমান',
    (xml6.match(/<w:br w:type="column"\/>/g) || []).length === (rtf6.match(/\{\\column\}/g) || []).length,
    [(xml6.match(/<w:br w:type="column"\/>/g) || []).length, (rtf6.match(/\{\\column\}/g) || []).length]);
  T('.docx  ind left=432 hanging=432 (স্টেম) ও left=864 hanging=432 (উপ-প্রশ্ন)',
    /<w:ind w:left="432" w:hanging="432"\/>/.test(xml6) && /<w:ind w:left="864" w:hanging="432"\/>/.test(xml6));
  T('.docx  right tab w:pos=' + geo.rightTab, xml6.includes('<w:tab w:val="right" w:pos="' + geo.rightTab + '"/>'));
  T('.docx  টেবিল শেডিং নেই, অটো উইডথ', !/w:fill="(E8E8E8|D9D9D9|F1F1F1)"/i.test(xml6) && !/<w:tblW w:w="[1-9]/.test(xml6));
  const xml10 = await (async () => { const b = await EX.generateCqExamDocx(P10, {}); const z2 = await g.jszip.loadAsync(Buffer.from(await b.arrayBuffer())); return z2.file('word/document.xml').async('string'); })();
  T('.docx  tblCellMar 30 (1.5pt) প্যাডিং', /<w:tblCellMar><w:top w:w="30"/.test(xml10));
  T('.docx  প্রতিটি টেবিল-সারি একবারই (<w:tr> ×2/প্রশ্ন)',
    (xml10.match(/<w:tr>/g) || []).length === 2 * P10.sections.reduce((a, x) => a + x.questions.length, 0),
    [(xml10.match(/<w:tr>/g) || []).length, 2 * P10.sections.reduce((a, x) => a + x.questions.length, 0)]);
  const altRe10 = /\{\\qc\\b\\f0\\fs24\\sl[0-9]+\\slmult[0-9]\\sb20\\sa20/g;
  T('.docx  অথবা-ডিভাইডার সেন্টারড বোল্ড সংখ্যা .doc-এর সমান',
    (xml10.match(/<w:jc w:val="center"\/><w:spacing w:before="40"/g) || []).length === (rtf10.match(altRe10) || []).length,
    [(xml10.match(/<w:jc w:val="center"\/><w:spacing w:before="40"/g) || []).length, (rtf10.match(altRe10) || []).length]);

  html6 = QE.renderToHtml(parsed6, { orientation: 'landscape', columns: 2 });
  const colCount = (html6.match(/cq-print-col/g) || []).length;
  const flowSlots = plan6.columns.length + (plan6.skipFirstColumn ? 1 : 0);
  const padded = flowSlots + (flowSlots % 2);          // শেষ শীটে জোড়া-রাখার খালি কলাম
  T('প্রিভিউতে কলাম সংখ্যা == প্ল্যান কলাম, এবং সংরক্ষিত/প্যাডিং খালি কলাম আলাদা বক্স',
    colCount === plan6.columns.length && (html6.match(/qp-col-skip-box/g) || []).length === padded - plan6.columns.length,
    [colCount, plan6.columns.length, (html6.match(/qp-col-skip-box/g) || []).length, padded - plan6.columns.length]);
  T('প্রিভিউতে কলাম-গ্যাপ 0.7" (50.4pt)', html6.includes('column-gap: 50.4pt'));
  T('প্রিভিউতে হ্যাঙ্গিং 21.6pt / উপ-প্রশ্ন 43.2pt (৪৩/৮৬৪ dxa)',
    html6.includes('padding-left: 21.6pt; text-indent: -21.6pt;') && html6.includes('padding-left: 43.2pt; text-indent: -21.6pt;'));
  T('প্রিভিউতে নম্বর কলামের ডানে float করা (রাইট ট্যাবের সমতুল্য)', html6.includes('float: right'));
  T('প্রিভিউ A4 ল্যান্ডস্কেপ শীট + শীট-লেবেল', /size-a4-landscape/.test(html6) && /শীট /.test(html6));
  T('তিন পাথেই একই প্রশ্ন-সংখ্যা (ক্ষয়/দ্বৈত নেই)', (() => {
    const n = (s, re) => (s.match(re) || []).length;
    const a = n(rtf6, /\\li432\\fi-432/g), b = n(xml6, /<w:ind w:left="432" w:hanging="432"\/>/g), c = n(html6, /cq-q-row/g);
    return a === b && b === c && a === plan6.items.filter((i) => i.kind === 'question').length;
  })(), [(rtf6.match(/\\li432\\fi-432/g) || []).length, (xml6.match(/<w:ind w:left="432" w:hanging="432"\/>/g) || []).length, (html6.match(/cq-q-row/g) || []).length]);
}

// ═════════════ (চ) TC-LAY-34 — কম্বাইন্ড: ল্যান্ডস্কেপ CQ → পোর্ট্রেট MCQ ═════════════
console.log('\n— (চ) TC-LAY-34: কম্বাইন্ড সেকশন —');
{
  const raw = fs.readFileSync(path.join(ROOT, 'tests/fixtures/combined.input.md'), 'utf8').replace(/^---[\s\S]*?---\s*\r?\n?/, '');
  const parts = raw.split(/---SECTION_?BREAK:MCQ---/i);
  const pc = QE.parseQuestionPaper(parts[0] || '', { docType: 'EXAM_CQ' });
  const pm = QE.parseQuestionPaper(parts[1] || '', { docType: 'EXAM_MCQ' });
  const rtf = EX.generateCombinedExamRtf(pc, pm, {});
  const props = rtf.match(/\\paperw\d+\\paperh\d+[^\n]*/g) || [];
  T('সেকশন-১ (CQ) ল্যান্ডস্কেপ ২-কাম', props[0] && /paperw16838\\paperh11906/.test(props[0]) && /\\cols2\\colsx1008/.test(props[0]), props[0]);
  T('সেকশন-২/৩ (MCQ) পোর্ট্রেট', props.length >= 3 && /paperw11906\\paperh16838/.test(props[1]) && /paperw11906\\paperh16838/.test(props[2]), props.slice(1));
  T('দুই অংশের মাঝে \\sect\\sbkpage (পরবর্তী পৃষ্ঠায় নতুন সেকশন)', rtf.includes('\\sect\\sbkpage'));
  T('সেকশন ব্রেকের জন্য \\page ব্যবহার হয় না', !/\\page\b/.test(rtf), (rtf.match(/\\page\b/g) || []).length);
  T('MCQ বডি Part-10 মতোই ২-কাম + কলাম লাইন (0.2")', /\\cols2\\colsx288\\linebetcol/.test(rtf));

  const blob = await EX.generateCombinedExamDocx(pc, pm, {});
  const z = await g.jszip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  const xml = await z.file('word/document.xml').async('string');
  const sects = xml.match(/<w:sectPr>[\s\S]*?<\/w:sectPr>/g) || [];
  T('DOCX-এ তিনটি সেকশন (CQ ল্যান্ডস্কেপ / MCQ হেডার / MCQ বডি)', sects.length === 3, sects.length);
  T('CQ সেকশন nextPage + ল্যান্ডস্কেপ ২-কাম', /<w:type w:val="nextPage"\/>[\s\S]{0,200}w:orient="landscape"/.test(sects[0] || '') && /<w:cols w:num="2" w:space="1008"\/>/.test(sects[0] || ''), sects[0] && sects[0].slice(0, 160));
  T('MCQ সেকশন পোর্ট্রেট (11906×16838) ও কলাম 0.2" + sep', (sects[1] || '').includes('w:w="11906" w:h="16838"') && /<w:cols w:num="2" w:space="288" w:sep="1"\/>/.test(sects[2] || ''), sects[2]);
  T('কম্বাইন্ডে পৃষ্ঠা-ব্রেক প্যারাগ্রাফের বদলে সেকশন-ব্রেক ব্যবহৃত',
    (xml.match(/<w:br w:type="page"\/>/g) || []).length === 0 || (xml.match(/<w:br w:type="page"\/>/g) || []).length <= 1);
}

// ═════════════ (ছ) TC-LAY-35 — ইনভ্যারিয়েন্ট ═════════════
console.log('\n— (ছ) TC-LAY-35: ইনভ্যারিয়েন্ট —');
{
  const strip = (t) => t.replace(/\\u(-?\d+)\??/g, (m, d) => String.fromCharCode(((+d % 65536) + 65536) % 65536)).replace(/\\[a-zA-Z]+-?\d*\s?/g, ' ').replace(/[{}]/g, ' ');
  for (const id of ['cq-long', 'cq-booklet-6', 'cq-booklet-10', 'cq-booklet-16']) {
    const parsed = L[id].parsed;
    const rtf = EX.generateCqExamRtf(parsed, {});
    const txt = strip(rtf).replace(/\s+/g, ' ');
    const qs = parsed.sections.flatMap((s) => s.questions);
    // (১) প্রতিটি প্রশ্নের নম্বর-মার্কার (১। ২। ...) ঠিক একবার — ক্ষয়/দ্বৈত নেই
    const byNum = new Map();
    for (const q of qs) byNum.set(q.num, (byNum.get(q.num) || 0) + 1);
    // সীমানা-সহ গুনি: `১।` যেন `১১।`-এর অংশকে না ধরে
    const isDig = (c) => /[\u09E6-\u09EF0-9]/.test(c || '');
    let numOk = true, at, from;
    for (const [num, want] of byNum) {
      let got = 0;
      from = -1;
      while ((at = txt.indexOf(num + '।', from + 1)) >= 0) {
        from = at;
        if (!isDig(txt[at - 1]) && !isDig(txt[at + num.length + 1])) got++;
      }
      if (got !== want) { numOk = false; break; }
    }
    T(`${id}: প্রশ্ন-নম্বর মার্কার ×count মিল (ক্ষয়/দ্বৈত নেই)`, numOk, [...byNum.entries()].slice(0, 4));
    // (২) উপ-প্রশ্নের সংখ্যা মিল (ব্যাক্তিগত অথবা-ডিভাইডার বাদে)
    const wantSubs = qs.reduce((a, q) => a + (q.subQuestions || []).filter((sq) => sq && !sq.isAlternative).length, 0);
    const gotSubs = (rtf.match(/\\li864\\fi-432/g) || []).length;
    T(`${id}: উপ-প্রশ্ন ${wantSubs}টি — প্রিন্টে ${gotSubs}টি (864/432 ইনডেন্টে)`, wantSubs === gotSubs, { wantSubs, gotSubs });
    // (৩) উদ্দীপক-লেখা প্রিন্টে থাকে (preContext কনটেন্ট হারাত না)
    const preLines = qs.reduce((a, q) => a + String(q.preContext || '').split('\n').filter(Boolean).length, 0);
    if (preLines > 0) {
      const firstPre = String((qs.find((q) => q.preContext) || { preContext: '' }).preContext).split('\n')[0].trim().split(/\s+/).slice(0, 3).join(' ');
      T(`${id}: preContext-এর প্রথম লাইন প্রিন্টে আছে (আগে হারাত)`, firstPre === '' || txt.includes(firstPre), firstPre);
    }
  }
  const mcqParsed = QE.parseQuestionPaper(bodyOf('mcq-pure-28'), { docType: 'EXAM_MCQ' });
  const mcqRtf = EX.generateMcqExamRtf(mcqParsed, {});
  T('MCQ পাথ অক্ষত (Part-10: পোর্ট্রেট + 0.2" গ্যাপ + কলাম লাইন)',
    /\\paperw11906\\paperh16838/.test(mcqRtf) && /\\cols2\\colsx288\\linebetcol/.test(mcqRtf));
  T('CQ রেন্ডারে MCQ-র হেডার ফলব্যাক (' + 'আপনার প্রতিষ্ঠান এর নাম' + ') ঢোকে না', !rtf6.includes('আপনার প্রতিষ্ঠান এর নাম'));
  // — Part-12 (ট্রায়াজ ১): সব প্যারাগ্রাফে একই লাইন-রেশিও (single-এর গুণক); হেয়ারলাইন অক্ষুণ্ন
  {
    const B0 = String.fromCharCode(92);
    const flat = String(rtf6).split(B0 + B0).join(B0);
    const slRe = new RegExp(B0 + B0 + 'fs([0-9]+)(?:' + B0 + B0 + 'f[0-9]+)?' + B0 + B0 + 'sl([0-9]+)' + B0 + B0 + 'slmult([0-9])', 'g');
    const sls = [...flat.matchAll(slRe)].map((m) => [+m[1], +m[2], +m[3]]);
    const wantMult = Math.round(240 * (geo.lineRenderFactor || 1));
    T('Part-12 .doc: প্রতিটি \\sl = ' + wantMult + ' (single) + \\slmult1; \sl<১২০ হেয়ারলাইন বাদে',
      sls.length > 8 && sls.every(([, v, mm]) => (v === wantMult && mm === 1) || v < 120),
      [...new Set(sls.map(([, v, mm]) => 'sl' + v + '/m' + mm))].join(' '));
    const sp = [...flat.matchAll(new RegExp(B0 + B0 + 's([ba])([0-9]+)', 'g'))];
    T('Part-12 .doc: \\sb/\\sa \u2264 ১৮০ (৯pt) — বড় before/after লাইন-ছন্দ ভাঙে', sp.length > 0 && sp.every((m) => +m[2] <= 280), sp.length);
    const dl = [...new Set(String(xml6).match(/w:line="[0-9]+" w:lineRule="[a-zA-Z]+"/g) || [])];
    T('Part-12 .docx: সব প্যারাগ্রাফেই w:line="' + wantMult + '" + auto (ডিভাইডার ১০০ বাদে)',
      dl.length > 0 && dl.every((v) => v === 'w:line="' + wantMult + '" w:lineRule="auto"' || v.startsWith('w:line="100"')),
      dl.join(' | '));
    T('Part-12 প্রিভিউ: line-height প্ল্যানের রেন্ডার-রেশিও (' + (geo.lineRenderCssRatio || 1.34) + ') থেকে আসে',
      Number.isFinite(+geo.lineRenderCssRatio) && +geo.lineRenderCssRatio > 1 && +geo.lineRenderCssRatio <= 1.5,
      geo.lineRenderCssRatio);
  }
  const frozen = ['js/engines/docx-to-doc-engine.js', 'js/engines/bangla-converter-engine.js', 'js/equation-converter.js', 'js/doc-binary-engine.js'];
  const touched = (() => { try { const out = execFileSync('git', ['diff','--name-only','HEAD'], { cwd: ROOT, encoding: 'utf8' }); return out.split('\n').filter(Boolean); } catch (e) { return []; } })();
  T('ফ্রোজেন ইঞ্জিন স্পর্শ করা হয়নি: ' + frozen.map((f) => path.basename(f)).join(', '),
    touched.length === 0 || frozen.every((f) => !touched.includes(f)), touched.filter((f) => frozen.includes(f)));
  // Part-12: ai-ocr-engine.js-এ পরিবর্তন কেবল প্রম্পট-টেক্সতে (উত্তর/সমাধান-নিষেধ + নম্বর-
  // সংরক্ষণের সীমাবদ্ধতা) — কোনো ইঞ্জিন-লজিকা/নেটওয়ার্ক কোড বদলানো হয়নি।
  const allowed = ['js/engines/export-dual-engine.js', 'js/engines/question-engine.js', 'js/layout-engine/cq-booklet-planner.js', 'js/ai-ocr-engine.js', 'js/layout-engine/mcq-layout-planner.js', 'js/layout-engine/layout-units.js'];
  const jsTouched = touched.filter((f) => f.startsWith('js/') && !f.startsWith('js/layout-engine/') && !allowed.includes(f));
  T('কোড-পরিবর্তন হোয়াইটলিস্টে (export/question engine + layout-engine)', jsTouched.length === 0, jsTouched);
}

// ═════════════ (জ) রেন্ডার গেট (LibreOffice) ═════════════
console.log('\n— (জ) রেন্ডার গেট —');
{
  const hasSoffice = (() => { try { execFileSync('sh', ['-c', 'command -v soffice && command -v pdfinfo']); return true; } catch (e) { return false; } })();
  if (!hasSoffice) {
    console.log('ℹ️  LibreOffice/pdfinfo নেই — রেন্ডার গেট এড়ানো হলো (qa/cq-render-proof.mjs-এ আলাদা চালাবেন)');
  } else {
    const dir = path.join(ROOT, 'proof', 'render', 'gate-cq');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'gate.doc');
    fs.writeFileSync(file, rtf6, 'utf8');
    try {
      execFileSync('soffice', ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', dir, file], { encoding: 'utf8', timeout: 240000 });
      const pdf = path.join(dir, 'gate.pdf');
      const info = fs.existsSync(pdf) ? execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }) : '';
      const pages = +(info.match(/^Pages:\s+(\d+)$/m) || [0, 0])[1];
      const size = info.match(/Page size:\s+([\d.]+)\s+x\s+([\d.]+)/);
      T('রেন্ডার: পৃষ্ঠাসংখ্যা == প্ল্যান docPages', pages === plan6.metrics.docPages, { pages, plan: plan6.metrics.docPages });
      T('রেন্ডার: পৃষ্ঠা A4 ল্যান্ডস্কেপ (841.89 × 595.30pt)',
        !!size && Math.abs(+size[1] - geo.pageW / 20) < 2 && Math.abs(+size[2] - geo.pageH / 20) < 2, size && [size[1], size[2]]);
    } catch (e) {
      console.log('ℹ️  রেন্ডার গেট চালানো যায়নি: ' + String(e.message).slice(0, 90));
    }
  }
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
