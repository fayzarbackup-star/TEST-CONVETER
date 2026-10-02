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
  T('৬-অপশন → `.doc`-এ ৬টি ভগ্নাংশ (Equation Editor \\F( ))', cnt(String(rtf), /\\F\(/g) === 6, cnt(String(rtf), /\\F\(/g));
  T('৬-অপশন → `.doc`-এ ম্যাথ-জোন নেই (Word 2003-safe)', cnt(String(rtf), /\\mmath\{/g) === 0, cnt(String(rtf), /\\mmath\{/g));
  T('৬-অপশন → `.doc`-এ EQ-ফিল্ড আছে (2003-নেটিভ)', cnt(String(rtf), /fldinst EQ/g) >= 1, cnt(String(rtf), /fldinst EQ/g));
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
    const rF = cnt(String(rtf), /\\F\(/g);
    T('আসল ফাইল: ভগ্নাংশ প্রিভিউ == DOCX', hF === dF && hF > 0, `${hF} / ${dF}`);
    T('Part-9f: `.doc`-এ ভগ্নাংশ = Equation Editor \\F( ) — সংখ্যা মেলে', dF > 0 && rF === dF, `${dF} / ${rF}`);
    T('Part-9f: `.doc`-এ EQ-ফিল্ড আছে (Word 2003-নেটিভ)', cnt(String(rtf), /fldinst EQ/g) >= 1, cnt(String(rtf), /fldinst EQ/g));
    T('Part-9f: `.doc`-এ RTF ম্যাথ-জোন নেই (2003 ক্র্যাশ-মুক্ত)', cnt(String(rtf), /\\mmath\{/g) === 0, cnt(String(rtf), /\\mmath\{/g));
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
  T('Part-9f: `.doc`-এ RTF ম্যাথ-জোন নেই (Word 2003-safe)', cnt(R, /\\mmath\{/g) === 0, cnt(R, /\\mmath\{/g));
  T('Part-9f: `.doc`-এ EQ-ফিল্ড (Equation Editor, 2003-নেটিভ) আছে', cnt(R, /fldinst EQ/g) >= 1, cnt(R, /fldinst EQ/g));

  const realDocx = fs.readFileSync(path.join(H.ROOT, 'js/engines/export-dual-engine.js'), 'utf8');
  T('Part-9f: EDE আর ম্যাথ-জোন এমিট করে না', !/out \+= zone\.rtf/.test(realDocx));
  T('Part-9f: EDE-তে docMath সুইচ + EQ-ফিল্ড রাইটার আছে', realDocx.includes('docMathMode') && realDocx.includes('fldinst EQ'));
  const client = fs.readFileSync(path.join(H.ROOT, 'js/ai-ocr-engine.js'), 'utf8');
  T('Part-9f: ক্লায়েন্টেও ম্যাথ-জোন এমিট নেই (ডেড RTF পাথও 2003-safe)', !/rtf \+= _zone/.test(client));
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

  // (গ) Part-9f: `.doc` RTF — ম্যাথ-জোন নেই; সরল রাশি = প্লেইন ইটালিক পাঠ্য (2003-safe)
  const plainRtf = Export.generateLegacyDoc('১। `$y = x - 3$` রেখাটি আঁক।', 'EXAM_CQ', {});
  const PR = typeof plainRtf.text === 'function' ? await plainRtf.text() : String(plainRtf);
  T('Part-9f: সরল সমীকরণে কোনো ম্যাথ-জোন/EQ-ফিল্ড নেই', cnt(PR, /\\mmath\{/g) === 0 && !/fldinst EQ/.test(PR), PR.slice(0, 90));
  T('Part-9f: সরল সমীকরণের রাশি হুবহু পাঠ্যে আছে', PR.includes('y = x - 3'));

  // (গ২) Part-9f: docMath:'plain' মোড — জটিল সমীকরণেও ফিল্ড ছাড়া পাঠ্য
  let rtfPlain = Export.generateLegacyDoc('২। `$\\frac{1}{2}$ + `$\\sqrt{3}$`', 'EXAM_CQ', { docMath: 'plain' });
  if (rtfPlain && rtfPlain.text) rtfPlain = await rtfPlain.text();
  T("Part-9f: docMath:'plain' → EQ-ফিল্ড ০ + ম্যাথ-জোন ০", cnt(String(rtfPlain), /fldinst EQ/g) === 0 && cnt(String(rtfPlain), /\\mmath\{/g) === 0,
    cnt(String(rtfPlain), /fldinst EQ/g) + ' / ' + cnt(String(rtfPlain), /\\mmath\{/g));

  // (গ৩) Part-9f: সুপার/সাবস্ক্রিপ্ট → RTF `{\\super}`/`{\\sub}` (EQ সুইচ যেন পাঠ্যে না থাকে)
  let rtfSup = Export.generateLegacyDoc('৩। `$x^2 + y_3$` লেখ।', 'EXAM_CQ', {});
  if (rtfSup && rtfSup.text) rtfSup = await rtfSup.text();
  const SUP = String(rtfSup);
  T('Part-9f: সুপারস্ক্রিপ্ট → {\\super ...}', /\{\\super /.test(SUP), SUP.slice(0, 120));
  T('Part-9f: সাবস্ক্রিপ্ট → {\\sub ...}', /\{\\sub /.test(SUP), SUP.slice(0, 120));
  T('Part-9f: কাঁচা EQ সুইচ (`\\S\\up`/`\\S\\do`) পাঠ্যে নেই', !/[\\]{1,2}S[\\]{1,2}(up|do)/.test(SUP), SUP.slice(0, 120));

  // (ঘ) Part-9f: docx-to-doc-engine — `.doc`-এ OMML নয়, 2003-নেটিভ EQ ফিল্ড
  const d2d = fs.readFileSync(path.join(H.ROOT, 'js/docx-to-doc-engine.js'), 'utf8');
  T('Part-9f: `.doc` ইঞ্জিনে OMML সিরিয়ালাইজার আর নেই', !d2d.includes('_serializeOmmlNode'));
  T('Part-9f: `.doc` ইঞ্জিনে 2003-নিরাপদ EQ-ফিল্ড রাইটার আছে', d2d.includes('_ommlToLegacyEqHtml') && d2d.includes('mso-element:field-begin'));
  T('Part-9f: oMath ব্র্যাঞ্চ EQ-ফিল্ড পথ ব্যবহার করে', /mathHtml = this\._ommlToLegacyEqHtml\(child/.test(d2d));
}


// ---------- ৯) Part-9c-fix2: OCR-এর ভাঙা `$` জোড়া লাগানো ----------
{
  const brk1 = EC.splitTextAndMath('$F(x, y, z) $= x$ ^3 + y^3 + z^3 - 3xyz$').filter(s => s.type === 'math');
  T('ভাঙা-১: তিন টুকরো → এক ইকুয়েশন', brk1.length === 1 && brk1[0].value.includes('y^3 + z^3'), JSON.stringify(brk1.map(b => b.value)));

  const brk2 = EC.splitTextAndMath('$\\ $theta =$ \\frac{\\pi}{3}$ হলে দেখাও').filter(s => s.type === 'math');
  T('ভাঙা-২: `\\ theta` মেরামত + \\frac অটুট', brk2.length === 1 && /\\theta = \\frac\{\\pi\}\{3\}/.test(brk2[0].value), JSON.stringify(brk2.map(b => b.value)));

  const brk3 = EC.splitTextAndMath('$x^2 + y^2 + z^ $2 = xy + yz +$  zx$।').filter(s => s.type === 'math');
  T('ভাঙা-৩: জোড়া লেগে এক ইকুয়েশন', brk3.length === 1 && /zx$/.test(brk3[0].value.trim()), JSON.stringify(brk3.map(b => b.value)));

  // বাংলা-গ্লু থাকলে জোড়া লাগা যাবে না (সত্যিকারের টেক্সট)
  const noMerge = EC.splitTextAndMath('$a + b$ এরপর $c + d$');
  T('বাংলা-গ্লু থাকলে আলাদাই থাকে', noMerge.filter(s => s.type === 'math').length === 2, JSON.stringify(noMerge.map(s => s.type + ':' + s.value)));

  // .doc/.docx-এ কাঁচা ল্যাটেক্স ০
  const probePath = '/home/user/probe/live3/height_cq.live-preview.txt';
  if (fs.existsSync(probePath)) {
    const liveCq = fs.readFileSync(probePath, 'utf8');
    const xml = Export.renderDocxRuns(liveCq.split('\n').find(l => l.includes('theta')) || '', {}, { sz: 24 });
    T('লাইভ-OCR-এর `$\\ $theta` লাইন এখন OMML', /<m:oMath/.test(xml), xml.slice(0, 100));
  } else {
    T('লাইভ-OCR-এর `$\\ $theta` ফাইল-টেস্ট (ফাইল না থাকায় স্কিপ)', true);
  }
}


// ---------- ১০) Part-9d: \operatorname র্যাপার + ## হেডিং-লিক ----------
{
  const op = EC.latexToOmml('\\operatorname{cosec}(\\theta)', false) || '';
  T('\\operatorname{cosec} → cosec (কাঁচা র্যাপার নেই)', /cosec/.test(op.replace(/<[^>]+>/g, '')) && !/operatorname/.test(op), op.replace(/<[^>]+>/g, '').slice(0, 60));
  const opw = EC.latexToOmml('\\operatornamewithlimits{lim}_{x \\to 0}', false) || '';
  T('\\operatornamewithlimits → ভিতরের নাম', !/operatornamewithlimits/.test(opw), opw.replace(/<[^>]+>/g, '').slice(0, 60));

  // ## হেডিং-লিক: `## উদাহরণ ২৯।` লাইনে ## আর থাকবে না, কিন্তু `## ১২।` প্রশ্ন-শিরোনাম অটুট
  const html = String((await Pipeline.process('## ১২। `$x$` যাচাই।\n## উদাহরণ ২৯। `$y = x - 3$`\nক. দেখাও।', { docType: 'EXAM_CQ', outputFormat: 'html' })).content || '');
  const plain = html.replace(/<[^>]*>/g, '');
  T('## হেডিং-লিক নেই', !/#/.test(plain), plain.slice(0, 80));
  T('প্রশ্ন-শিরোনাম অটুট (১২।)', plain.includes('১২।'));
  T('"উদাহরণ ২৯" লাইন থাকেছে (তথ্য হারায়নি)', plain.includes('উদাহরণ ২৯'));
}


// ---------- ১১) Part-9e: ভূত-লেবেল, ভেক্টর-তীর (<m:acc>), কোটেশন-আর্টিফ্যাক্ট, log_{√} ----------
{
  // (ক) MCQ-তে `$3\vec{a} - 2\vec{b}$`-এর ভিতরের a/b আর ভূত-লেবেল বানাবে না
  const line = '\tক. `$3\\vec{a} - 2\\vec{b}$`\tখ. `$-3\\vec{a} + 2\\vec{b}$`\tগ. `$7\\vec{a} - 4\\vec{b}$`\tঘ. `$7\\vec{a} + 4\\vec{b}$`';
  const qe2 = require('../js/engines/question-engine.js');
  const opts = qe2.parseMcqOptions(line);
  T('ভূত-লেবেল নেই (ঠিক ৪টি অপশন ক/খ/গ/ঘ)', opts.length === 4 && opts.map(o => o.label).join('') === 'কখগঘ', opts.map(o => o.label).join(''));
  T('`\\vec` অপশনে অটুট', opts[0].text.includes('\\vec{a}'), opts[0].text.slice(0, 40));

  // (খ) ভেক্টর → সত্যিকারের OMML অ্যাকসেন্ট (combining নয়)
  const vo = EC.latexToOmml('5\\vec{a} - 3\\vec{b}', false) || '';
  T('ভেক্টর = <m:acc> ×২ (মাথার উপরে তীর)', (vo.match(/<m:acc>/g) || []).length === 2, (vo.match(/<m:acc>/g) || []).length);
  T('ভেক্টরে combining-চিহ্ন নেই (রানের টেক্সট পরিষ্কার)', !/\u20D7/.test((vo.match(/<m:t[^>]*>[^<]*<\/m:t>/g) || []).join('')), vo.replace(/<[^>]+>/g, '').slice(0, 40));
  T('m:acc-এর chr = U+20D7 (Word-এর মানক)', /<m:chr m:val="\u20D7"\/>/.test(vo), (vo.match(/<m:chr[^>]*>/) || [''])[0]);
  T('$\\overline{AB}$ = <m:bar>', /<m:bar>/.test(EC.latexToOmml('\\overline{AB}', false) || ''));

  // (গ) কোটেশন-আর্টিফ্যাক্ট + ব্যাকটিক-LaTeX
  T("720' → 720", EC.sanitizePlainLatex("সহগ 720' হলে") === 'সহগ 720 হলে', EC.sanitizePlainLatex("সহগ 720' হলে"));
  T("'32' → 32", EC.sanitizePlainLatex("উত্তর '32' সঠিক") === 'উত্তর 32 সঠিক', EC.sanitizePlainLatex("উত্তর '32' সঠিক"));
  T('`\\{3\\}` → {3}', EC.sanitizePlainLatex('`\\{3\\}`') === '{3}', EC.sanitizePlainLatex('`\\{3\\}`'));
  T('`\\{\\pm 3\\}` → {± 3}', EC.sanitizePlainLatex('`\\{\\pm 3\\}`').includes('±') && !/\\\\/.test(EC.sanitizePlainLatex('`\\{\\pm 3\\}`')), EC.sanitizePlainLatex('`\\{\\pm 3\\}`'));
  const btSegs = EC.splitTextAndMath('মান `$x$` এর পর `\{3\}`');
  T('ব্যাকটিক-$ ম্যাথ হিসেবে টিকে আছে', btSegs.some(g => g.type === 'math' && g.value.includes('x')), JSON.stringify(btSegs.map(g => g.type + ':' + g.value)));
  T('ব্যাকটিক-LaTeX টেক্সটে ` নেই', !btSegs.some(g => g.type === 'text' && g.value.includes('`')), JSON.stringify(btSegs.map(g => g.type + ':' + g.value)));

  // (ঘ) `log_{\sqrt{27}}` — ব্রেসে আটকাবে না, √27 সাবস্ক্রিপ্টে যাবে
  const lo = EC.latexToOmml('\\log_{\\sqrt{27}}, x = 3\\frac{1}{3}', false) || '';
  T('log_√27: ব্রেস নেই', !/\{/.test(lo.replace(/<[^>]+>/g, '')) || !/log \{/.test(lo.replace(/<[^>]+>/g, '')), lo.replace(/<[^>]+>/g, '').slice(0, 40));
  T('log_√27: √27 সাবস্ক্রিপ্টে (m:rad m:sub-এ)', /<m:sub>\s*<m:rad>/.test(lo.replace(/\s+/g, '')), lo.slice(0, 90));

  // (ঙ) সেট-নোটেশনের ভিতরের \frac অটুট (m:f)
  const so = EC.latexToOmml('\\{x \\in \\mathbb{R} : x \\neq \\frac{1}{2}\\}', false) || '';
  T('সেট-নোটেশনে ভগ্নাংশ টিকে আছে (m:f)', /<m:f>/.test(so), so.replace(/<[^>]+>/g, '').slice(0, 50));
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
