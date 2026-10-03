/**
 * Part-13.3 — লেআউট ও ফরম্যাটিং রিপোর্টের ফিক্স (৮টি ইস্যু, ৩ বিভাগ)
 *   node tests/part13-3-layout-fixes.test.mjs
 *
 * বিভাগ ১ (উভয় ফরম্যাট): ① কাঠিন্য-লেবেল (সহজমান/মধ্যমান/কঠিনমান) স্ট্রিপ
 *   ② CQ প্রশ্ন-বিরতি ১২pt  ③ হেডারে সময়=বাম / পূর্ণমান=ডান ④ পৃষ্ঠা-ব্রেক প্রবাহ
 * বিভাগ ২ (.docx): MCQ/CQ-তে অকাল পেজ/কলাম-ব্রেক বন্ধ (প্রাকৃতিক প্রবাহ)
 * বিভাগ ৩ (.doc): MCQ অপশনে L-ট্যাব-স্টপ, CQ-তে কলাম-রেখা বন্ধ, মার্ক রাইট-ফ্লাশ,
 *   বুকলেটে হেডিং কলামের শীর্ষে (কলাম-ব্রেক ম্যাপ)
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };
// RTF-এ বাংলা \uNNNN?-এ escaped — টেক্সট-অনুসন্ধানের আগে ডিকোড করি
const rtfPlain = (s) => String(s).replace(/\\u(-?\d+)\s?\??/g, (_, d) => String.fromCharCode(((Number(d) % 65536) + 65536) % 65536));

const EDE = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const QE = require(path.join(ROOT, 'js/engines/question-engine.js'));
const RN = require(path.join(ROOT, 'js/layout-engine/exam-renumber.js'));

// ───────────────────────── ১) স্ট্রিপ-ইউনিট (বিভাগ-১.১) ─────────────────────────
{
  console.log('\n— (১) কাঠিন্য-লেবেল স্ট্রিপ —');
  T("(সহজমান) বাদ", RN.stripDifficultyTags('সূত্র লেখো। (সহজমান)') === 'সূত্র লেখো।');
  T("(মধ্যমান) বাদ", RN.stripDifficultyTags('গণনা করো। (মধ্যমান)') === 'গণনা করো।');
  T("(কঠিনমান) বাদ", RN.stripDifficultyTags('বিশ্লেষণ করো। (কঠিনমান)') === 'বিশ্লেষণ করো।');
  T("(মধ্যম মান) স্পেস-ভ্যারিয়েন্ট বাদ", RN.stripDifficultyTags('লেখো। (মধ্য মান)') === 'লেখো।' || RN.stripDifficultyTags('লেখো। (মধ্যম মান)') === 'লেখো।');
  T('[সহজমান] স্কয়ার-ব্র্যাকেট বাদ', RN.stripDifficultyTags('লেখো। [সহজমান]') === 'লেখো।');
  T('বন্ধনীহীন "সহজমান ২" বাদ', RN.stripDifficultyTags('লেখো। সহজমান ২') === 'লেখো। ২');
  T('✅ সুরক্ষা: [অঙ্কনের চিহ্ন ও বিবরণ আবশ্যক] অটুট',
    RN.stripDifficultyTags('[অঙ্কনের চিহ্ন ও বিবরণ আবশ্যক] চিত্র আঁকো।') === '[অঙ্কনের চিহ্ন ও বিবরণ আবশ্যক] চিত্র আঁকো।');
  T('idempotent (দুবার চালালে একই)', RN.stripDifficultyTags(RN.stripDifficultyTags('লেখো। (সহজমান)')) === 'লেখো।');
  T('খালি/নাল নিরাপদ', RN.stripDifficultyTags('') === '' && RN.stripDifficultyTags(null) === '');

  const pd = {
    sections: [{
      title: 'সৃজনশীল প্রশ্ন (কঠিনমান)',
      questions: [{
        num: '৭২', text: 'উদ্দীপক? (সহজমান)', preContext: 'প্রসঙ্গ (মধ্যমান)',
        stimulus: '', statements: ['বিবৃতি (কঠিন মান)'],
        subQuestions: [{ label: 'ক', text: 'লেখো। (সহজমান)', mark: '২' }, { label: 'খ', text: 'করো।', mark: '৪' }],
        options: [{ label: 'ক', text: 'এ (কঠিনমান)' }]
      }]
    }]
  };
  RN.stripDifficultyTagsFromData(pd);
  const q = pd.sections[0].questions[0];
  T('fields: text/subQuestions/options/statements/preContext/title সবই পরিষ্কার',
    !/মান\)|মান\]/.test(JSON.stringify(pd)) && q.subQuestions[0].text === 'লেখো।' && q.options[0].text === 'এ');
  T('মার্ক/লেবেল/নম্বর অটুট (ফিডেলিটি)', q.subQuestions[0].mark === '২' && q.subQuestions[0].label === 'ক' && q.num === '৭২');
  const numBefore = q.num; RN.renumberExamSections(pd);
  T('রিনাম্বার এখনও কাজ করে (৭২ → ১)', numBefore === '৭২' && q.num === '১');
}

// ───────────────────────── ২) spacing-হেল্পার (বিভাগ-১.২) ─────────────────────────
{
  console.log('\n— (২) প্রশ্ন-বিরতি হেল্পার —');
  const rtf = '{\\ql a\\sa15 x\\par} {\\ql b\\sa20 y\\par}';
  T('RTF: শেষ \\sa → ২৪০, আগের অটুট',
    EDE._bumpLastSpacingRtf(rtf, 240) === '{\\ql a\\sa15 x\\par} {\\ql b\\sa240 y\\par}');
  T('RTF: \\sa না থাকলে no-op', EDE._bumpLastSpacingRtf('{\\ql z\\par}', 240) === '{\\ql z\\par}');
  const xml = '<w:p><w:spacing w:before="40" w:after="20"/></w:p><w:p><w:spacing w:after="20"/></w:p>';
  T('DOCX: শেষ w:after → ২৪০, আগের অটুট',
    EDE._bumpLastSpacingDocx(xml, 240) === '<w:p><w:spacing w:before="40" w:after="20"/></w:p><w:p><w:spacing w:after="240"/></w:p>');
}

// ───────────────────────── ৩) লাইভ: CQ RTF/DOCX (বিভাগ-১.২) ─────────────────────────
const CQ_MD = [
  '৭২। একজন চাল ব্যবসায়ী ৯৫০০ টাকায় বিক্রয় করায় ৫% ক্ষতি হলো। (সহজমান)',
  'ক. সূত্রটি লেখো। ২', 'খ. হিসাব করো। ৪', '',
  '৪৪। বার্ষিক ১০% হারে ২৫০০০ টাকা জমা।',
  'ক. মুনাফা নির্ণয় করো। ২', 'খ. চক্রবৃদ্ধি বের করো। ৪', '',
  '৩। ত্রিভুজের ভূমি ১২ মিটার।',
  'ক. ক্ষেত্রফল কত? ২',
].join('\n');
{
  console.log('\n— (৩) CQ আউটপুট (RTF+DOCX) —');
  const pd = QE.parseQuestionPaper(CQ_MD, { docType: 'EXAM_CQ' });
  RN.stripDifficultyTagsFromData(pd); RN.renumberExamSections(pd);

  const rtf = EDE.generateCqExamRtf(pd, {});
  const qCount = pd.sections.reduce((a, s) => a + s.questions.length, 0);
  T('RTF: প্রতি প্রশ্নে প্রশ্ন-বিরতি \\sa240', (rtf.match(/\\sa240/g) || []).length === qCount, [(rtf.match(/\\sa240/g) || []).length, qCount]);
  const saVals = [...rtf.matchAll(/\\s([ba])(\d+)/g)].map((m) => +m[2]);
  T('RTF: সব \\sb/\\sa ≤ ২৮০ (১৪pt) — লাইন-ছন্দ রক্ষা', saVals.length > 0 && saVals.every((v) => v <= 280), Math.max(...saVals));
  const rtfP = rtfPlain(rtf);
  T('RTF: লেবেল নেই (সহজমান)', !/সহজমান|মধ্যমান|কঠিনমান/.test(rtfP));
  T('RTF: কনটেন্ট অটুট (হিসাব করো/চক্রবৃদ্ধি)', rtfP.includes('হিসাব করো') && rtfP.includes('চক্রবৃদ্ধি'));
  T('RTF: ধারাবাহিক নম্বর ১।/২।/৩।', rtfP.includes('১।') && rtfP.includes('২।') && rtfP.includes('৩।') && !rtfP.includes('৭২।'));

  const docx = await EDE.generateCqExamDocx(pd, { returnInnerXml: true });
  const xml = docx.bodyXml + (docx.sectPr || '');
  T('DOCX: প্রতি প্রশ্নে w:after="240" (১২pt বিরতি)', (xml.match(/w:after="240"/g) || []).length === qCount, [(xml.match(/w:after="240"/g) || []).length, qCount]);
  T('DOCX: সৃজনশীল কলাম-বিভাজক রেখা নেই (w:sep="1" অনুপস্থিত)', !/<w:cols[^>]*w:sep="1"/.test(xml));
  T('DOCX: কনটেন্ট অটুট + লেবেল-মুক্ত', xml.includes('হিসাব করো') && !/সহজমান|মধ্যমান|কঠিনমান/.test(xml));
}

// ───────────────────────── ৪) লাইভ: MCQ প্রবাহ (বিভাগ-২) ─────────────────────────
{
  console.log('\n— (৪) MCQ — কৃত্রিম ব্রেক বন্ধ —');
  // বাংলা-ডিজিট ফিক্সচার (প্রকৃত ফ্লো) — পার্সার বাংলা নম্বর হুবহু রাখে, রিনাম্বার বাংলাতেই করে
  const MCQ_MD = Array.from({ length: 24 }, (_, i) => `${RN.toBengaliDigits(i + 72)}। প্রশ্ন ${i}? (মধ্যমান)\nক. এক খ. দুই গ. তিন ঘ. চার`).join('\n\n');
  const pd = QE.parseQuestionPaper(MCQ_MD, { docType: 'EXAM_MCQ' });
  RN.stripDifficultyTagsFromData(pd); RN.renumberExamSections(pd);

  const rtf = EDE.generateMcqExamRtf(pd, {});
  T('RTF: কোনো \\page নেই (প্রাকৃতিক প্রবাহ)', !/\\page\b/.test(rtf));
  T('RTF: কোনো \\column নেই', !/\\column\b/.test(rtf));
  const rtfM = rtfPlain(rtf);
  T('RTF: ধারাবাহিক নম্বর ১..২৪', rtfM.includes('১।') && rtfM.includes('২৪।') && !rtfM.includes('৭২।'));
  T('RTF: লেবেল-মুক্ত', !/\(মধ্যমান\)/.test(rtfM));

  const docx = await EDE.generateMcqExamDocx(pd, { returnInnerXml: true });
  const xml = docx.bodyXml;
  T('DOCX: কোনো <w:br w:type="page"/> নেই', !xml.includes('<w:br w:type="page"/>'));
  T('DOCX: কোনো <w:br w:type="column"/> নেই', !xml.includes('<w:br w:type="column"/>'));
  T('DOCX: হেডারে right-tab (সময় বাম / পূর্ণমান ডান)', /<w:tab w:val="right" w:pos="\d+"\/>/.test(xml));
}

// ───────────────────────── ৫) প্ল্যানার: col2 ক্যাপাসিটি (বিভাগ-২ রুট-কজ) ─────────────────────────
{
  console.log('\n— (৫) প্ল্যানার: পৃষ্ঠা-১ কলাম-২ পূর্ণ-উচ্চতা —');
  const P = (() => { try { return require(path.join(ROOT, 'js/layout-engine/mcq-layout-planner.js')); } catch (e) { return null; } })();
  if (!P) { console.log('SKIP: planner লোড হয়নি'); }
  else {
    T('balancePageHeader মেথড আছে', typeof P.balancePageHeader === 'function');
    const items = Array.from({ length: 30 }, () => ({ height: 1000 }));
    const b = P.balancePageHeader(items, 9000, 14000, 0);   // cap1+cap2 = 23000 ⇒ 23টি
    T('balancePageHeader: col2 পূর্ণ-উচ্চতা পায় (২৩টি > cap1-only-এর ১৮টি)', b.count === 23, b.count);
    const mk = (n) => ({
      header: { institute: 'স্কুল', exam: 'পরীক্ষা', classAndSubject: 'শ্রেণি ৮' },
      sections: [{ questions: Array.from({ length: n }, (_, i) => ({ num: String(i + 1), text: `প্রশ্ন ${i}?`, options: [{ label: 'ক', text: 'এক' }, { label: 'খ', text: 'দুই' }, { label: 'গ', text: 'তিন' }, { label: 'ঘ', text: 'চার' }] })) }]
    });
    const plan = P.plan(mk(30), { docType: 'EXAM_MCQ' });
    T('৩০টি ছোট MCQ → ১ পৃষ্ঠা, দুই কলামই ভরা', plan.pages.length === 1 && plan.pages[0].col1.length > 0 && plan.pages[0].col2.length > 0,
      [plan.pages.length, plan.pages[0].col1.length, plan.pages[0].col2.length]);
  }
}

// ───────────────────────── ৬) সোর্স-গেট (ভবিষ্যৎ রিগ্রেশন রোধ) ─────────────────────────
{
  console.log('\n— (৬) সোর্স-গেট —');
  const conv = fs.readFileSync(path.join(ROOT, 'js/docx-to-doc-engine.js'), 'utf8');
  T('converter: Word-মান্য `tab-stops:` নির্গত হয়', /pStyles\.push\(`tab-stops:/.test(conv));
  T('converter: কলাম-ব্রেক ম্যাপ (mso-column-break-before)', /mso-column-break-before:always/.test(conv));
  T('converter: পেজ-ব্রেক ম্যাপ (page-break-before:always)', /page-break-before:always/.test(conv));
  T('converter: কলাম-রেখা এখন w:sep-গেটেড (all-solid আর নেই)', /page\.colSep \?/.test(conv) && !/\tmso-column-separator:solid;\\n`\n          : ''/.test(conv));

  const ede = fs.readFileSync(path.join(ROOT, 'js/engines/export-dual-engine.js'), 'utf8');
  T('EDE: MCQ পাথে কৃত্রিম পেজ-ব্রেক আর বসে না', !/if \(pi > 0\) (rtf \+= '\\\\page|bodyXml \+= '<w:p><w:r><w:br w:type="page")/.test(ede));
  T('EDE: strip-হুক আছে (_applyExamRenumber-এ)', /stripDifficultyTagsFromData\(parsed\)/.test(ede));
  T('EDE: ১৩.২-গার্ড অটুট (fixed line-height নেই)', !/mso-line-height-rule/.test(fs.readFileSync(path.join(ROOT, 'js/ai-ocr-engine.js'), 'utf8')));

  const css = fs.readFileSync(path.join(ROOT, 'css/studio.css'), 'utf8');
  T('CSS প্রিভিউ: CQ প্রশ্ন-বিরতি ১২pt (ডাউনলোডের সঙ্গে মিল)', /\.cq-q-item\s*\{[^}]*margin:\s*0 0 12pt 0/m.test(css));
}

// ───────────────────────── ৭) ব্রাউজার-E2E: docx→HTML .doc ফিডেলিটি (বিভাগ-৩) ─────────────────────────
let chromium = null;
for (const from of [path.join(ROOT, 'package.json'), path.join(os.homedir(), 'qa', 'package.json')]) {
  try { chromium = createRequire(from)('playwright').chromium; break; } catch (e) { /* পরের প্রোফাইল */ }
}
if (!chromium) {
  console.log('SKIP: playwright/Chromium নেই — docx→.doc E2E এড়ানো হলো (ভুয়া পাস নয়)');
} else {
  console.log('\n— (৭) ব্রাউজার-E2E: .doc রূপান্তর —');
  const server = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const fp = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { r.writeHead(404); return r.end('nf'); }
    r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(fp).pipe(r);
  });
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  const BASE = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(); const page = await browser.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await page.route('**', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FayzarPipeline && window.DocxHandler && window.DocxToDocConverter, { timeout: 45000 });

  const CQ_LONG = ['কুমিল্লা জিলা স্কুল', 'প্রথম সাময়িক পরীক্ষা-২০২৬', 'শ্রেণি: অষ্টম | বিষয়: গণিত | সময়: ২ ঘণ্টা | পূর্ণমান: ৭০', '']
    .concat(Array.from({ length: 6 }, (_, i) => [
      `${RN.toBengaliDigits(i + 1)}। উদ্দীপক ${i + 1}: চাল ব্যবসায়ীর গল্প। (সহজমান)`,
      'ক. সূত্রটি লেখো। ২', 'খ. হিসাব করো। ৪', 'গ. বিশ্লেষণ করো। ৪', ''
    ]).flat()).join('\n');

  const cqHtml = await page.evaluate(async (md) => {
    const p = await window.FayzarPipeline.process(md, { docType: 'EXAM_CQ', outputFormat: 'docx', pageSize: 'a4-landscape', margin: 'normal', columns: 2 });
    const blob = p.blob || p.contentBlob || p.downloadBlob || p.content;
    const buf = await blob.arrayBuffer();
    const docx = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const bj = await window.DocxHandler.convertDocx(docx, { direction: 'u2b', targetFont: 'SutonnyMJ' });
    const cv = await window.DocxToDocConverter.convertDocxToDoc(bj.convertedBlob || bj.blob, { pageSize: 'a4-landscape', margin: 'normal', preserveSutonny: true, optimizeForQuestionPaper: true });
    return await (cv.blob || cv.convertedBlob).text();
  }, CQ_LONG);

  T('CQ .doc: দুই-কলাম বিন্যাস অটুট', /mso-columns:2/.test(cqHtml));
  T('CQ .doc: কলাম-বিভাজক রেখা নেই (রিপোর্ট-৩.২)', !/mso-column-separator:solid/.test(cqHtml));
  T('CQ .doc: কলাম-ব্রেক Word-মান্য ট্যাগে ম্যাপড (রিপোর্ট-৩.৪)', /<br clear=all style='mso-column-break-before:always'>/.test(cqHtml));
  T('CQ .doc: কৃত্রিম পেজ-ব্রেক নেই', !/page-break-before:always/.test(cqHtml));
  T('CQ .doc: ট্যাব-স্টপ Word-মান্য (tab-stops:) — রুলারে দৃশ্যমান', /tab-stops:/.test(cqHtml) && /tab-stops:[^;"]*right \d/.test(cqHtml));
  T('CQ .doc: মূল ট্যাব-চিহ্ন অটুট (mso-tab-count)', /mso-tab-count:1/.test(cqHtml));
  T('CQ .doc: লেবেল-মুক্ত', !/\(সহজমান\)|\(মধ্যমান\)|\(কঠিনমান\)/.test(cqHtml));

  const mcqHtml = await page.evaluate(async () => {
    const md = ['কুমিল্লা জিলা স্কুল', 'পরীক্ষা-২০২৬', 'শ্রেণি: অষ্টম | সময়: ২ ঘণ্টা | পূর্ণমান: ৫০', '',
      '১. পূরক কোণের মান কত? (মধ্যমান)', 'ক. ৪২° খ. ৪৮° গ. ১৩২° ঘ. ১৪২°', '', '২. পরিধি হলে ক্ষেত্রফল?', 'ক. এক খ. দুই গ. তিন ঘ. চার'].join('\n');
    const master = await window.FayzarAiOcrEngine.generateMasterDocx(md, { docType: 'EXAM_MCQ', pageSize: 'a4-portrait', margin: 'normal', fontSize: '12', columns: 1 });
    const bj = await window.DocxHandler.convertDocx(master, { direction: 'u2b', targetFont: 'SutonnyMJ' });
    const cv = await window.DocxToDocConverter.convertDocxToDoc(bj.convertedBlob || bj.blob, { pageSize: 'a4-portrait', margin: 'normal', preserveSutonny: true, optimizeForQuestionPaper: true });
    return await (cv.blob || cv.convertedBlob).text();
  });

  T('MCQ .doc: হেডারে right-tab স্টপ (সময় বাম / পূর্ণমান ডান)', /tab-stops:[^;"]*right \d/.test(mcqHtml));
  T('MCQ .doc: কৃত্রিম পেজ/কলাম-ব্রেক নেই', !/page-break-before:always|mso-column-break-before/.test(mcqHtml));
  T('MCQ .doc: লেবেল-মুক্ত', !/\(মধ্যমান\)|\(সহজমান\)/.test(mcqHtml));

  T('পেজ-এরর শূন্য', errs.length === 0, errs.slice(0, 2));
  await browser.close(); server.close();
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
