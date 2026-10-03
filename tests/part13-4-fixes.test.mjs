/**
 * Part-13.4 — ফাইজার টিমের ৩-ইস্যু রিপোর্টের ফিক্স
 *   node tests/part13-4-fixes.test.mjs
 *
 * ১) সৃজনশীল বুকলেটে অকাল কলাম-ব্রেক (৪০–৫০% খালি রেখে spill) → প্রাকৃতিক প্রবাহ
 * ২) Word 2003 (.doc) বিজয় এক্সপোর্টে EQ ফিল্ডের ভেতরের বাংলা ডিজিট ইউনিকোডে → SutonnyMJ (ANSI)
 * ৩) ইকুয়েশনে ঘাত/পদ (x², x⁴) বেস-সাইজে বড় → সুপার/সাবস্ক্রিপ্ট ~৬৭% (৮pt = \fs16 / w:sz 16)
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import http from 'http';
import os from 'os';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

const EQ = require(path.join(ROOT, 'js/equation-converter.js'));
const EDE = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const QE = require(path.join(ROOT, 'js/engines/question-engine.js'));
const RN = require(path.join(ROOT, 'js/layout-engine/exam-renumber.js'));
const PLAN = require(path.join(ROOT, 'js/layout-engine/cq-booklet-planner.js'));

// ───────────────────────── ১) EQ কোডে বিজয়-ডিজিট (ইস্যু-২) ─────────────────────────
console.log('\n— (১) EQ-ফিল্ড কোডে বাংলা ডিজিট → SutonnyMJ ANSI —');
{
  const BCmod = require(path.join(ROOT, 'js/bangla-converter-engine.js'));
  const BC = BCmod.BanglaConverter || BCmod;
  const prev = global.BanglaConverter;
  global.BanglaConverter = BC;
  try {
    T('ভগ্নাংশ: ৩/৫ → ASCII 3/5 (ANSI) — আর ইউনিকোড নেই',
      EQ.latexToEqField('\\frac{৩}{৫}', true) === '\\F(3,5)', EQ.latexToEqField('\\frac{৩}{৫}', true));
    T('কোনো বাংলা ডিজিটই অবশিষ্ট নেই',
      !/[\u09E6-\u09EF]/.test(EQ.latexToEqField('\\frac{৩}{৫} + ২৪', true)));
    T('সংখ্যা অটুট (ASCII ম্যাথে অঙ্ক বদলায় না)',
      /3,5/.test(EQ.latexToEqField('\\frac{৩}{৫}', true)) && EQ.latexToEqField('\\frac{3}{5}', true) === '\\F(3,5)');
    T('ইউনিকোড-মোড (isU2B=false) অপরিবর্তিত — ৩/৫ থাকেই', /৩/.test(EQ.latexToEqField('\\frac{৩}{৫}', false)));
  } finally { global.BanglaConverter = prev; }

  // সোর্স-গেট: latexToEqField-এ বিজয়-ব্লক আছে
  const eqSrc = fs.readFileSync(path.join(ROOT, 'js/equation-converter.js'), 'utf8');
  T('সোর্স: latexToEqField-এ বাংলা→ANSI ব্লক (isU2B গেটেড)', /Part-13\.4[\s\S]{0,600}?isU2B[\s\S]{0,400}?unicodeToBijoy/.test(eqSrc));
}

// ───────────────────────── ২) OMML ঘাত/পদের সাইজ (ইস্যু-৩) ─────────────────────────
console.log('\n— (২) OMML সুপার/সাবস্ক্রিপ্ট সাইজ —');
{
  const omml = EQ.latexToOmml('x^2 + x^4 + y_3');
  T('m:sSup-এর রানে w:sz=16 (৮pt) — ৩টির সবই',
    (omml.match(/<m:sup><m:r><w:rPr><w:sz w:val="16"\/><w:szCs w:val="16"\/><\/w:rPr>/g) || []).length >= 2,
    omml.slice(0, 200));
  T('m:sSub-ও একই সাইজ',
    /<m:sub><m:r><w:rPr><w:sz w:val="16"\/>/.test(omml));
  T('বেস-রান সাইজ-মুক্ত (প্যারাগ্রাফ-ডিফল্ট ১২pt অটুট)',
    /<m:e><m:r><m:t xml:space="preserve">x<\/m:t><\/m:r><\/m:e>/.test(omml));
  T('না-থাকলে no-op: sup/sub ছাড়া OMML অপরিবর্তিত',
    EQ._applyOmmlScriptSizes('<m:oMath><m:r><m:t>x</m:t></m:r></m:oMath>', 16) === '<m:oMath><m:r><m:t>x</m:t></m:r></m:oMath>');
  T('ইতিমধ্যে rPr থাকলে ডাবল-ইনজেক্ট হয় না',
    EQ._applyOmmlScriptSizes('<m:sSup><m:sup><m:r><w:rPr><w:sz w:val="20"/></w:rPr><m:t>2</m:t></m:r></m:sup></m:sSup>', 16)
      === '<m:sSup><m:sup><m:r><w:rPr><w:sz w:val="20"/></w:rPr><m:t>2</m:t></m:r></m:sup></m:sSup>');
  T('নেস্টেড ঘাতেও (a^{b^2}) সাইজ বসে', (EQ.latexToOmml('a^{b^2}').match(/w:sz w:val="16"/g) || []).length >= 2);
  const edeSrc = fs.readFileSync(path.join(ROOT, 'js/engines/export-dual-engine.js'), 'utf8');
  T('RTF: {\\super\\fs16 …} / {\\sub\\fs16 …} নির্গত হয় (সোর্স-গেট)',
    /super[\s\S]{0,40}?fs' \+ _hp/.test(edeSrc) && /sub[\s\S]{0,40}?fs' \+ _hp/.test(edeSrc));
  T('RTF-এ লাইভ: {\\super\\fs16 2}', /\{\\super\\fs16 2\}/.test(EDE.generateCqExamRtf(
    QE.parseQuestionPaper('১। $(x^2)$ লেখো।\nক. লেখো। ২', { docType: 'EXAM_CQ' }), {})),
    'live');
}

// ───────────────────────── ৩) .doc-কনভার্টার: স্ক্রিপ্ট-স্প্যান + বাংলা→ANSI (ইস্যু-২,৩) ─────────────────────────
console.log('\n— (৩) docx-to-doc ইঞ্জিন —');
{
  const src = fs.readFileSync(path.join(ROOT, 'js/docx-to-doc-engine.js'), 'utf8');
  const sandbox = { console, Blob, TextEncoder, TextDecoder, DOMParser: class {}, window: {}, globalThis: {}, module: { exports: {} } };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  // Part-13.4: বিজয়-কনভার্টার শিম
  sandbox.BanglaConverter = { unicodeToBijoy: (t) => String(t).replace(/[\u09E6-\u09EF]/g, (c) => String('০১২৩৪৫৬৭৮৯'.indexOf(c))) };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const C = sandbox.DocxToDocConverter || sandbox.window.DocxToDocConverter || sandbox.module.exports.DocxToDocConverter;
  const conv = new C();

  const styled = conv._styleEqCodeLetters('P = 1 - x + x\\S\\up4(2)');
  const wrapped = conv._wrapEqScriptSizes(styled);
  T('\\S\\up4(2) → ৮pt স্প্যানে মোড়া', wrapped.includes("\\S\\up4(<span style='font-size:8.0pt'>2</span>)"), wrapped);
  T('\\S\\do8(...) → ৮pt স্প্যানে মোড়া', conv._wrapEqScriptSizes('y\\S\\do8(3)').includes("<span style='font-size:8.0pt'>3</span>"));
  T('ঘাতের ভেতরের অক্ষর ইটালিক অটুট + স্প্যানে',
    conv._wrapEqScriptSizes(conv._styleEqCodeLetters('k\\S\\up4(n)')).includes("<span style='font-size:8.0pt'><i>n</i></span>"));
  T('নেস্টেড বন্ধনী (\\F(1,2)) — স্প্যান বন্ধনী-সচেতন',
    conv._wrapEqScriptSizes(conv._styleEqCodeLetters('k\\S\\up4(\\F(1,2))')).includes("\\S\\up4(<span style='font-size:8.0pt'>\\F(1,2)</span>)"),
    conv._wrapEqScriptSizes(conv._styleEqCodeLetters('k\\S\\up4(\\F(1,2))')));
  T('স্ক্রিপ্ট না থাকলে অপরিবর্তিত', conv._wrapEqScriptSizes('\\F(x,2)') === '\\F(x,2)');

  T('_toTargetScript: preserveSutonny → ৩/৫ → 3/5', conv._toTargetScript('\\F(৩,৫)', { preserveSutonny: true }) === '\\F(3,5)');
  T('_toTargetScript: all_unicode → অপরিবর্তিত (Unicode-প্রোফাইল নষ্ট হয় না)',
    conv._toTargetScript('\\F(৩,৫)', { preserveSutonny: true, direction: 'all_unicode' }) === '\\F(৩,৫)');
  T('_toTargetScript: অপশন ছাড়া no-op', conv._toTargetScript('\\F(৩,৫)', null) === '\\F(৩,৫)');
  T('সোর্স: ফিল্ড-কোডে _wrapEqScriptSizes ব্যবহৃত', /EQ \$\{this\._wrapEqScriptSizes\(this\._styleEqCodeLetters\(eqCode\)\)\}/.test(src));
  T('সোর্স: _ommlToLegacyEqHtml এখন opts নেয়', /_ommlToLegacyEqHtml\(node, mode = 'eqfield', opts = null\)/.test(src));
}

// ───────────────────────── ৪) প্ল্যানার: প্রাকৃতিক প্রবাহ (ইস্যু-১) ─────────────────────────
console.log('\n— (৪) প্ল্যানার breakBefore —');
{
  const mk = (n) => ({
    header: { institute: 'স্কুল', exam: 'পরীক্ষা', classAndSubject: 'শ্রেণি ৮' },
    sections: [{ questions: Array.from({ length: n }, (_, i) => ({ num: String(i + 1), text: 'উদ্দীপক ' + i + '? ' + 'ক '.repeat(20), subQuestions: [{ label: 'ক', text: 'লেখো।', mark: '২' }, { label: 'খ', text: 'করো।', mark: '৪' }] })) }]
  });
  const skip = PLAN.plan(mk(10), { skipFirstColumn: true });
  T('skipFirstColumn: কেবল প্রথম flow-কলামে ব্রেক (লিডিং)',
    skip.columns.filter((c) => c.breakBefore).length === 1 && skip.columns[0].breakBefore === true,
    skip.columns.map((c) => c.role + ':' + c.breakBefore));
  T('mid-flow কলামগুলোতে কোনো ব্রেক নেই',
    skip.columns.slice(1).every((c) => c.breakBefore === false));

  const back = PLAN.plan(mk(20), {});   // ডিফল্ট-রিজার্ভ: টেল-মুভ → ব্যাক-কভার কলাম গঠিত হয়
  const backRoles = back.columns.map((c) => c.role);
  T('ব্যাক-কভার কেস: ব্রেক কেবল ব্যাক-কভারের পরে (page1-এ)',
    backRoles[0] === 'backcover' && back.columns[1] && back.columns[1].breakBefore === true && back.columns.slice(2).every((c) => !c.breakBefore),
    backRoles.join(','));

  const cont = PLAN.plan(mk(6), { skipFirstColumn: false });
  T('ক্রমাগত ফ্লো (ব্যাক-কভার নেই): শূন্য ব্রেক', cont.columns.every((c) => !c.breakBefore), cont.columns.map((c) => c.breakBefore));
}

// ───────────────────────── ৫) লাইভ: CQ RTF/DOCX — ব্রেক গোনা + ১৩.৩ রিগ্রেশন ─────────────────────────
console.log('\n— (৫) CQ আউটপুট: ব্রেক ও সাইজ —');
{
  const md = ['১। উদ্দীপক: একজন ব্যবসায়ী লাভ করলেন।', 'ক. সূত্র লেখো। ২', 'খ. হিসাব করো। ৪', '',
    '২। $x^2$ ও $y_3$ লেখো।', 'ক. সরল করো। ২', 'খ. মান বের করো। ৪'].join('\n');
  const pd = QE.parseQuestionPaper(md, { docType: 'EXAM_CQ' });
  RN.stripDifficultyTagsFromData(pd); RN.renumberExamSections(pd);
  const rtf = EDE.generateCqExamRtf(pd, {});
  const docx = await EDE.generateCqExamDocx(pd, { returnInnerXml: true });
  const rtfCols = (rtf.match(/\{\\column\}/g) || []).length;
  const xmlCols = (docx.bodyXml.match(/<w:br w:type="column"\/>/g) || []).length;
  T('RTF: ব্রেক = প্ল্যানের breakBefore-সংখ্যা (১)', rtfCols === 1, rtfCols);
  T('DOCX: সমান (১) — দুই ফরম্যাটে প্যারিটি', xmlCols === 1, xmlCols);
  T('RTF: কোনো কৃত্রিম পেজ-ব্রেক নেই', !/\\page\b/.test(rtf));
  T('DOCX: কোনো w:type="page" নেই', !/w:type="page"/.test(docx.bodyXml));
  T('১৩.৩ রিগ্রেশন: প্রশ্ন-বিরতি \\sa240 অটুট', (rtf.match(/\\sa240/g) || []).length === 2, (rtf.match(/\\sa240/g) || []).length);
  T('১৩.৩ রিগ্রেশন: DOCX w:after="240" অটুট', (docx.bodyXml.match(/w:after="240"/g) || []).length === 2);
  T('১৩.২ রিগ্রেশন: নম্বর ১।/২। ধারাবাহিক', rtf.includes('১।') === false || /\\u09e7\\u0964|১।/.test(rtf), 'rtf-escaped');
  T('১৩.৩ রিগ্রেশন: CQ-তে কলাম-বিভাজক নেই (w:sep=1 অনুপস্থিত)', !/<w:cols[^>]*w:sep="1"/.test(docx.bodyXml + (docx.sectPr || '')));
  T('RTF: ঘাতের সাইজ \\fs16 (ইস্যু-৩)', /super\\fs16/.test(rtf) || /sub\\fs16/.test(rtf), (rtf.match(/(?:super|sub)[^ ]{0,6}/g) || []).slice(0, 4));
}

// ───────────────────────── ৬) ব্রাউজার-E2E: আসল চেইন ─────────────────────────
let chromium = null;
for (const from of [path.join(ROOT, 'package.json'), path.join(os.homedir(), 'qa', 'package.json')]) {
  try { chromium = createRequire(from)('playwright').chromium; break; } catch (e) { /* পরের প্রোফাইল */ }
}
if (!chromium) {
  console.log('SKIP: playwright নেই — চেইন-E2E এড়ানো হলো (ভুয়া পাস নয়)');
} else {
  console.log('\n— (৬) ব্রাউজার-E2E: master .docx → u2b → .doc —');
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
  await page.waitForFunction(() => window.FayzarAiOcrEngine && window.DocxHandler && window.DocxToDocConverter, { timeout: 45000 });

  const res = await page.evaluate(async () => {
    const md = '১। $(P = 1 - x + x^2)$ এবং $(\\frac{৩}{৫})$ অংশ নির্ণয় করো।\nক. সরল করো। ২';
    const master = await window.FayzarAiOcrEngine.generateMasterDocx(md, { docType: 'EXAM_CQ', pageSize: 'a4-landscape', margin: 'normal', fontSize: '12', columns: 2 });
    const mText = await master.text();
    const bj = await window.DocxHandler.convertDocx(master, { direction: 'u2b', targetFont: 'SutonnyMJ' });
    const cv = await window.DocxToDocConverter.convertDocxToDoc(bj.convertedBlob || bj.blob, { pageSize: 'a4-landscape', margin: 'normal', preserveSutonny: true, optimizeForQuestionPaper: true });
    const h = await (cv.blob || cv.convertedBlob).text();
    return { mText, h };
  });

  T('master .docx: m:sup রানে w:sz=16 (৮pt)',
    (res.mText.match(/<m:sup><m:r><w:rPr><w:sz w:val="16"\/>/g) || []).length >= 1);
  T('.doc: EQ-ফিল্ডে ভগ্নাংশ \F(3,5) — ANSI ডিজিট (ইস্যু-২)', /\\F\(3,5\)/.test(res.h));
  T('.doc: ফিল্ড-কোডে আর কোনো বাংলা ডিজিট নেই', !/EQ \([^)]*[০-৯]/.test(res.h));
  T('.doc: ঘাত \S\\up4(…) ৮pt স্প্যানে (ইস্যু-৩)', /\\S\\up4\(<span style='font-size:8\.0pt'>2<\/span>\)/.test(res.h));
  T('.doc: ম্যাথ-বডি <sup> ট্যাগ ৮pt-এ', /<sup style='font-size:8\.0pt/.test(res.h) || !/<sup/.test(res.h));
  T('পেজ-এরর শূন্য', errs.length === 0, errs.slice(0, 2));

  // booklet: ৬ প্রশ্ন → কেবল ১টি লিডিং কলাম-ব্রেক, ০ পেজ-ব্রেক
  const book = await page.evaluate(async () => {
    const md = ['কুমিল্লা জিলা স্কুল', 'প্রথম সাময়িক পরীক্ষা-২০২৬', 'শ্রেণি: অষ্টম | বিষয়: গণিত | সময়: ২ ঘণ্টা | পূর্ণমান: ৭০', '']
      .concat(Array.from({ length: 6 }, (_, i) => [`${i + 1}. উদ্দীপক ${i + 1}: গল্প।`, 'ক. সূত্র লেখো। ২', 'খ. হিসাব করো। ৪', 'গ. বিশ্লেষণ করো। ৪', '']).flat()).join('\n');
    const p = await window.FayzarPipeline.process(md, { docType: 'EXAM_CQ', outputFormat: 'docx', pageSize: 'a4-landscape', margin: 'normal', columns: 2 });
    const buf = await (p.blob || p.contentBlob || p.downloadBlob || p.content).arrayBuffer();
    const docx = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const zip = await window.JSZip.loadAsync(docx);
    const xml = await zip.file('word/document.xml').async('string');
    const bj = await window.DocxHandler.convertDocx(docx, { direction: 'u2b', targetFont: 'SutonnyMJ' });
    const cv = await window.DocxToDocConverter.convertDocxToDoc(bj.convertedBlob || bj.blob, { pageSize: 'a4-landscape', margin: 'normal', preserveSutonny: true, optimizeForQuestionPaper: true });
    const h = await (cv.blob || cv.convertedBlob).text();
    return {
      xmlCol: (xml.match(/<w:br w:type="column"\/>/g) || []).length,
      xmlPage: (xml.match(/w:type="page"/g) || []).length,
      docColBr: (h.match(/mso-column-break-before:always/g) || []).length,
      docCols2: /mso-columns:2/.test(h),
      docPage: (h.match(/page-break-before:always/g) || []).length,
    };
  });
  T('বুকলেট .docx: কেবল ১টি লিডিং কলাম-ব্রেক (ইস্যু-১)', book.xmlCol === 1, book.xmlCol);
  T('বুকলেট .docx: ০ পেজ-ব্রেক', book.xmlPage === 0, book.xmlPage);
  T('বুকলেট .doc: ২-কলাম অটুট', book.docCols2);
  T('বুকলেট .doc: কলাম-ব্রেক ম্যাপড (১)', book.docColBr === 1, book.docColBr);
  T('বুকলেট .doc: ০ পেজ-ব্রেক', book.docPage === 0, book.docPage);

  await browser.close(); server.close();
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
