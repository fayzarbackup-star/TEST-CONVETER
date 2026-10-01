/**
 * Part-9b: ইকুয়েশন-হার্ডেনিং — স্থায়ী টেস্ট
 *   node tests/eq-hardening.test.mjs
 * নিয়ম:
 *   ১) \binom → কোনো পাথে কাঁচা LaTeX নয় (C(n, r) ফর্মে)।
 *   ২) MCQ-তে ৪টির বেশি অপশন থাকলে সবগুলোই তিন পাথে ছাপা হবে (বাদ পড়বে না)।
 *   ৩) একই অপশন-লেবেল আবার শুরু হলে সেটা নতুন প্রশ্ন — আগের প্রশ্নে জোড়া লাগবে না।
 *   ৪) docType-সচেতন পার্সিং: MCQ ডকে অপশন→options, CQ ডকে অপশন→subQuestions।
 *   ৫) অপশন না থাকলে subQuestions-এর লাইনও MCQ রেন্ডারে (HTML/DOCX/RTF) ছাপা হবে।
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const H = require('./lib/harness.js');
const EC = require('../js/equation-converter.js');

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };
const cnt = (s, re) => (String(s).match(re) || []).length;
const plain = (s) => String(s).replace(/<[^>]*>/g, '');

const { Pipeline, Export, Question } = H.loadEngines();

// ---------- ১) \binom ----------
{
  const src = '\\binom{n}{r}';
  const pv = EC.latexToPreviewHtml(src, 12);
  const om = EC.latexToOmml(src, false);
  const eq = EC.latexToEqField(src, false);
  T('binom → প্রিভিউতে কাঁচা LaTeX নেই', !/\\binom|\{|\}|\$/ .test(plain(pv)), plain(pv));
  T('binom → OMML-এ কাঁচা LaTeX নেই', !/\\binom|\{/.test(plain(om)), plain(om));
  T('binom → EQ ফিল্ডে কাঁচা LaTeX নেই', !/\\binom|\{/.test(eq), eq);
  T('binom → C(n, r) ফর্মে', /C\(n,\s*r\)/.test(plain(pv)) && /C\(n,\s*r\)/.test(plain(om)));
}

// ---------- ২+৩) MCQ অপশন: ৪টির বেশি + পুনরাবৃত্ত লেবেল ----------
const MCQ = [
  '---', 'doc_type: EXAM_MCQ', '---', '',
  '১. প্রথম প্রশ্ন?', 'ক. $\\frac{1}{2}$', 'খ. $\\frac{1}{3}$', 'গ. $\\frac{1}{4}$', 'ঘ. $\\frac{1}{5}$',
  '২. দ্বিতীয় প্রশ্ন?', 'ক. $\\frac{1}{6}$', 'খ. $\\frac{1}{7}$', 'গ. $\\frac{1}{8}$', 'ঘ. $\\frac{1}{9}$',
  '', '৩. লম্বা অপশনের প্রশ্ন (৫০+ অক্ষর)?',
  'ক. $(1 + \\frac{x}{1 + x})$ কে $(1 - \\frac{x}{1 + x})$ দ্বারা গুণ করে বিস্তারিত সমাধান লেখো',
  'খ. ছোট অপশন', 'গ. আরেকটি', 'ঘ. শেষটি',
].join('\n');

{
  const p = Pipeline._parseByDocType('EXAM_MCQ', MCQ, {});
  const qs = p.sections.flatMap((s) => s.questions);
  const over = qs.filter((q) => (q.options || []).length > 4).length;
  T('অপশন ৪-এর বেশি কোনো প্রশ্ন নেই', over === 0, over);
  T('তিনটি প্রশ্নই আছে', qs.length >= 3, qs.length);
  const q3 = qs.find((q) => (q.text || '').includes('লম্বা অপশন'));
  T('MCQ ডকে লম্বা লাইনও option হিসেবে থাকে', !!q3 && (q3.options || []).length === 4 && (q3.subQuestions || []).length === 0,
    q3 ? { o: q3.options.length, s: q3.subQuestions.length } : null);

  const pCq = Pipeline._parseByDocType('EXAM_CQ', MCQ, {});
  const qCq = pCq.sections.flatMap((s) => s.questions)[0];
  T('CQ ডকে সাব-প্রশ্ন হিসেবে থাকে (আগের আচরণ অটুট)', (qCq.subQuestions || []).length === 4 && (qCq.options || []).length === 0,
    { o: qCq.options.length, s: qCq.subQuestions.length });
}

{
  const doc = [...MCQ.split('\n'), '', '৪. নতুন প্রশ্ন?', 'ক. এক', 'খ. দুই', 'গ. তিন', 'ঘ. চার'].join('\n');
  const p = Pipeline._parseByDocType('EXAM_MCQ', doc, {});
  const qs = p.sections.flatMap((s) => s.questions);
  T('একই লেবেল আবার এলে নতুন প্রশ্ন হয় (তথ্য গিলে ফেলে না)', qs.length >= 4, qs.length);
}

// ---------- ৪) চার-এর বেশি অপশন তিন পাথে (৬-অপশনের নমুনা) ----------
{
  const doc6 = ['---', 'doc_type: EXAM_MCQ', '---', '', '১. ছয় লেবেল?',
    'ক. $\\frac{1}{2}$', 'খ. $\\frac{1}{3}$', 'গ. $\\frac{1}{4}$', 'ঘ. $\\frac{1}{5}$',
    'ঙ. $\\frac{1}{6}$', 'চ. $\\frac{1}{7}$'].join('\n');
  const p = Pipeline._parseByDocType('EXAM_MCQ', doc6, {});
  const q = p.sections.flatMap((s) => s.questions)[0];
  // ঙ/চ লেবেল পার্সার চেনে না — তাই কৃত্রিমভাবে অপশন বাড়িয়ে রেন্ডার-ক্ষমতা মাপি
  q.options = q.options.concat([{ label: 'ঙ', text: '$\\frac{1}{6}$' }, { label: 'চ', text: '$\\frac{1}{7}$' }]);
  const dXml = await Export.generateMcqExamDocx(p, { returnInnerXml: true });
  const xml = (dXml.bodyXml || '') + (dXml.sectPr || '');
  let rtf = Export.generateMcqExamRtf(p, {}); if (rtf && rtf.text) rtf = await rtf.text();
  T('৬-অপশন → DOCX-এ ৬টি ভগ্নাংশ', cnt(xml, /<m:f>/g) === 6, cnt(xml, /<m:f>/g));
  T('৬-অপশন → DOCX-এ শেষ লেবেলগুলোও আছে', xml.includes('ঙ') && xml.includes('চ'));
  T('৬-অপশন → RTF-এ ৬টি ম্যাথ-জোন ভগ্নাংশ', cnt(String(rtf), /\\mf\{/g) >= 6, cnt(String(rtf), /\\mf\{/g));
  T('৬-অপশন → RTF-এ কোনো EQ-ফিল্ড নেই (Equation Editor নয়)', !/fldinst EQ/.test(String(rtf)));
}

// ---------- ৫) subQuestions ফলব্যাক (অপশন না থাকলে সেগুলোও ছাপা হয়) ----------
{
  const doc = ['---', 'doc_type: EXAM_MCQ', '---', '', '১. প্রশ্ন যার অপশন নেই?', 'ক. হার্ডডিস্ক', 'খ. র‍্যাম', 'গ. মাইক্রোপ্রসেসর', 'ঘ. মাদারবোর্ড'].join('\n');
  const pCq = Pipeline._parseByDocType('EXAM_CQ', doc, {});
  const q = pCq.sections.flatMap((s) => s.questions)[0];
  const fake = { sections: [{ title: '', questions: [{ ...q, options: [] }] }], header: pCq.header };
  const dXml = await Export.generateMcqExamDocx(fake, { returnInnerXml: true });
  const xml = (dXml.bodyXml || '') + (dXml.sectPr || '');
  T('MCQ-DOCX-এ subQuestions ফলব্যাক ছাপে', xml.includes('হার্ডডিস্ক') && xml.includes('মাদারবোর্ড'));
  const html = Question.renderToHtml(fake, {});
  T('MCQ-HTML-এ subQuestions ফলব্যাক ছাপে', html.includes('হার্ডডিস্ক') && html.includes('মাদারবোর্ড'));
}

// ---------- ৬) আসল ৪৬-পৃষ্ঠার ফাইল (থাকলে): তিন পাথের ভগ্নাংশ-প্যারিটি ----------
{
  const realPath = '/home/user/uploads/live-verify-part7-run3-output.txt';
  if (fs.existsSync(realPath)) {
    const real = fs.readFileSync(realPath, 'utf8').replace(/^---[\s\S]*?---\s*/, '');
    const parts = real.split(/---SECTION_?BREAK:MCQ---/i);
    const html = String((await Pipeline.process(real, { docType: 'EXAM_COMBINED', outputFormat: 'html' })).content || '');
    const cq = await Export.generateCqExamDocx(Pipeline._parseByDocType('EXAM_CQ', parts[0] || '', {}), { returnInnerXml: true });
    const mq = await Export.generateMcqExamDocx(Pipeline._parseByDocType('EXAM_MCQ', parts[1] || '', {}), { returnInnerXml: true });
    const xml = (cq.bodyXml || '') + (cq.sectPr || '') + (mq.bodyXml || '') + (mq.sectPr || '');
    let rtf = Export.generateLegacyDoc(real, 'EXAM_COMBINED', {}); if (rtf && rtf.text) rtf = await rtf.text();
    const hF = cnt(html, /vertical-align:-0\.45em/g), dF = cnt(xml, /<m:f>/g);
    const rF = cnt(String(rtf), /\\mf\{/g) + cnt(String(rtf), /\\F\s*\(/g);
    T('আসল ফাইল: ভগ্নাংশ প্রিভিউ == DOCX', hF === dF && hF > 0, `${hF} / ${dF}`);
    T('আসল ফাইল: ভগ্নাংশ DOCX == .doc (ম্যাথ-জোন)', dF === rF, `${dF} / ${rF}`);
    T('আসল ফাইল: .doc-এ কোনো EQ-ফিল্ড নেই', !/fldinst EQ/.test(String(rtf)), cnt(String(rtf), /fldinst EQ/g));
    T('আসল ফাইল: কাঁচা LaTeX নেই (HTML/DOCX)', cnt(plain(html), /\\[a-zA-Z]{2,}/g) === 0 && cnt(plain(xml), /\\[a-zA-Z]{2,}/g) === 0);
    T('আসল ফাইল: $ চিহ্ন নেই', cnt(plain(html), /\$/g) === 0);
  } else {
    T('আসল ফাইল-টেস্ট (ফাইল না থাকায় স্কিপ)', true);
  }
}


// ---------- ৭) Part-9c: .doc = নেটিভ RTF ম্যাথ-জোন (ইকুয়েশন এডিটযোগ্য) ----------
{
  const EC2 = EC;
  const zone = EC2.ommlToRtfMath(EC2.latexToOmml('\\frac{1}{2}', false));
  T('RTF ম্যাথ-জোন গঠন ঠিক (\\mmath + \\moMath + \\mf)', /\{\\mmath\{\\\*\\moMath .*\\mf\{/.test(zone.rtf) && zone.rtf.includes('\\mmathPict'), zone.rtf.slice(0, 80));
  T('RTF ম্যাথ-জোনে টেক্সট রান আছে', /\{\\mr [^{}]+\}/.test(zone.rtf));

  const fx = H.splitFrontmatter(fs.readFileSync(path.join(H.ROOT, 'tests', 'fixtures', 'math-equations.input.md'), 'utf8'));
  let rtf = Export.generateLegacyDoc(fx.body, 'EXAM_MATH', {});
  if (rtf && typeof rtf.text === 'function') rtf = await rtf.text();
  const R = String(rtf);
  T('.doc-এ EQ-ফিল্ড (Equation Editor) নেই', !/fldinst EQ/.test(R), cnt(R, /fldinst EQ/g));
  T('.doc-এ নেটিভ ম্যাথ-জোন আছে', cnt(R, /\\mmath\{/g) >= 1, cnt(R, /\\mmath\{/g));

  const realDocx = fs.readFileSync(path.join(H.ROOT, 'js/engines/export-dual-engine.js'), 'utf8');
  T('formatRtfText এখন ম্যাথ-জোন ব্যবহার করে', realDocx.includes('ommlToRtfMath'));
  const client = fs.readFileSync(path.join(H.ROOT, 'js/ai-ocr-engine.js'), 'utf8');
  T('ক্লায়েন্ট RTF পাথেও ম্যাথ-জোন', client.includes('ommlToRtfMath'));
  const dh = fs.readFileSync(path.join(H.ROOT, 'js/docx-handler.js'), 'utf8');
  T('docx-handler আর OMML→EQ রূপান্তর করে না', !/Parse native OMML equations \(<m:oMath>\) to EQ fields/.test(dh) && dh.includes('_ommlStringToNodes'));
  T('docx-handler জটিল ম্যাথে OMML এমিট করে', dh.includes('<m:oMath') && dh.includes('_ommlStr'));
}


// ---------- ৮) Part-9c-fix: CQ বন্ধনী-সাবপ্রশ্ন + needsEqField + .doc নেটিভ OMML ----------
{
  // (ক) `ক)` `খ)` বন্ধনী-লেবেল CQ-তে subQuestions হবে, options নয়
  const cqText = '১২। `$x, y, z$` এর একটি বহুপদী, `$F = x^3$`।\nক) দেখাও যে, `$F$` চক্র-ক্রমিক রাশি।\nখ) `$F$` কে উৎপাদকে বিশ্লেষণ কর।\nগ) যদি `$x = 1$` হয় তবে দেখাও।';
  const cqParsed = require('../js/engines/question-engine.js').parseQuestionPaper(cqText, { docType: 'EXAM_CQ' });
  const q1 = cqParsed.sections[0].questions[0];
  T('CQ: ক) খ) গ) → subQuestions', (q1.subQuestions || []).length === 3, 'subs=' + (q1.subQuestions || []).length);
  T('CQ: বন্ধনী-লেবেল options-এ যায় না', (q1.options || []).length === 0, 'opts=' + (q1.options || []).length);

  // (খ) needsEqField: যেকোনো `$...$` রাশি = ইকুয়েশন (সংখ্যা/একক বাদে)
  const nf = [['y = x - 3', true], ['y = x + 3, y = x - 3', true], ['A(-4, 13)', true], ['R - {3/2}', true], ['75, 65', false], ['8 cm', false], ['5', false], ['cm', false]];
  for (const [latex, want] of nf) {
    const got = EC.needsEqField(latex);
    T(`needsEqField(${JSON.stringify(latex)}) = ${want}`, got === want, 'got=' + got);
  }

  // (গ) `.doc` RTF: সরল সমীকরণও ম্যাথ-জোনে (আগে প্লেইন ইটালিক হতো)
  const plainRtf = Export.generateLegacyDoc('১। `$y = x - 3$` রেখাটি আঁক।', 'EXAM_CQ', {});
  const PR = typeof plainRtf.text === 'function' ? await plainRtf.text() : String(plainRtf);
  T('.doc: `y = x - 3` এখন ম্যাথ-জোনে', /\\mmath\{[^}]*\\mr y = x - 3/.test(PR), PR.slice(PR.indexOf('\\mmath', 200) - 20, PR.indexOf('\\mmath', 200) + 60));

  // (ঘ) docx-to-doc-engine: EQ-ফিল্ড নিষ্ক্রিয় + OMML সিরিয়ালাইজার
  const d2d = fs.readFileSync(path.join(H.ROOT, 'js/docx-to-doc-engine.js'), 'utf8');
  T('.doc ইঞ্জিনে OMML সিরিয়ালাইজার আছে', d2d.includes('_serializeOmmlNode'));
  T('.doc ইঞ্জিনে পুরোনো EQ-ফিল্ড HTML আর বানানো হয় না', !/mso-element:field-begin/.test(d2d));
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
