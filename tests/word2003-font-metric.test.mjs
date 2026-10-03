/**
 * Part-13.2: Word 2003 (.doc) ফন্ট-মেট্রিক স্পেসিং — নিরাপদ সমাধান + নিয়ন্ত্রণ-রান
 *   node tests/word2003-font-metric.test.mjs
 *
 * সমস্যা (বাস্তব): `class 8 math …Word2003.doc`-এ নির্দিষ্ট প্রশ্নে (৯/১০/৪৭) অপশনের
 * মাঝে ৪০–৫০pt ফাঁকা — কারণ: একই লাইনে SutonnyMJ (ANSI) + `Cambria Math`
 * (OpenType-math মেট্রিক্স) ⇒ Word 2003-এর অটো-স্পেসিং লাইন-বক্স ফুলিয়ে দেয়।
 *
 * আগের ভুল "সমাধান" (রিভার্টেড): `mso-line-height-rule:exactly;line-height:14.0pt`
 * ⇒ লম্বা ভগ্নাংশ/সমীকরণের মাথা কেটে যেত (clipping) — প্রশ্ন ৪৭-এ প্রমাণিত।
 *
 * এই সমাধান: **কারণ সরানো, লক্ষণ নয়** — .doc-HTML-এ math-ফন্টকে ANSI-নিরাপদ
 * 'Times New Roman'-এ ম্যাপ (সমীকরণ এখানে EQ-field-এ থাকে, তাই নিরাপদ);
 * কোনো line-height ছোঁয়া হয় না ⇒ clipping-ঝুঁকি শূন্য।
 *
 * টেস্ট-কৌশল: ইউনিট + সোর্স-গেট (সবসময়) এবং ব্রাউজার-E2E **নিয়ন্ত্রণ-রানে**
 * (sanitizer বন্ধ করে পুরোনো আচরণ) — প্রমাণ: (ক) ফিক্স math-ফন্ট মুছে ফেলে,
 * (খ) বাকি সব (টেক্সট/ফন্ট-সাইজ/EQ-ফিল্ড) অপরিবর্তিত থাকে ⇒ "font-only change"।
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
const MATH_RE = /cambria\s*math|mathjax|stix\s*(?:two|general)?|latin\s*modern\s*math/i;

// ───────────────────────── ১) ইউনিট: sanitizeFontFamily ─────────────────────────
{
  require(path.join(ROOT, 'js', 'docx-to-doc-engine.js'));
  const Conv = global.DocxToDocConverter;
  T('converter Node-এ লোড হয় ও static থাকে', typeof Conv === 'function' && typeof Conv.sanitizeFontFamily === 'function');
  const S = Conv.sanitizeFontFamily;
  T("'Cambria Math' → 'Times New Roman'", S('Cambria Math') === 'Times New Roman');
  T("quoted \"'Cambria Math'\" → ANSI-ফন্ট", S("'Cambria Math'") === 'Times New Roman');
  T('STIXGeneral → ANSI-ফন্ট', S('STIXGeneral') === 'Times New Roman');
  T('MathJax_Main → ANSI-ফন্ট', S('MathJax_Main') === 'Times New Roman');
  T('সাধারণ ফন্ট অটুট: SutonnyMJ/Times New Roman/Kalpurush/Nikosh/Bijoy',
    ['SutonnyMJ', 'Times New Roman', 'Kalpurush', 'Nikosh', 'Bijoy'].every((f) => S(f) === f));
  T('প্লেইন "Cambria" (math নয়) অটুট', S('Cambria') === 'Cambria');
  T('null/undefined → খালি স্ট্রিং (নিরাপদ)', S(null) === '' && S(undefined) === '');
}

// ───────────────────────── ২) সোর্স-গেট (হ্যাক ফিরে আসা ঠেকাতে) ─────────────────────────
{
  const ocr = fs.readFileSync(path.join(ROOT, 'js', 'ai-ocr-engine.js'), 'utf8');
  T('ai-ocr-engine: fixed line-height হ্যাক নেই (`mso-line-height-rule`)', !/mso-line-height-rule/.test(ocr));
  T('ai-ocr-engine: `line-height:14.0pt` জাতীয় fixed মান নেই', !/line-height:\s*14(\.0)?pt/i.test(ocr));

  const conv = fs.readFileSync(path.join(ROOT, 'js', 'docx-to-doc-engine.js'), 'utf8');
  T('converter: sanitizeFontFamily সংজ্ঞা + কল-site + static-এক্সপোর্ট', (conv.match(/sanitizeFontFamily/g) || []).length >= 3);
  T('converter: কোনো `exactly` line-height ইনজেকশন নেই', !/mso-line-height-rule\s*:\s*exactly/i.test(conv));
}

// ───────────────────────── ৩) ব্রাউজার E2E (নিয়ন্ত্রণ-রানসহ) ─────────────────────────
let chromium = null;
for (const from of [path.join(ROOT, 'package.json'), path.join(ROOT, 'scratch', 'test_env', 'package.json'), path.join(os.homedir(), 'qa', 'package.json')]) {
  try { chromium = createRequire(from)('playwright').chromium; break; } catch (e) { /* পরের প্রোফাইল */ }
}
if (!chromium) {
  console.log('SKIP: playwright/Chromium নেই — font-metric E2E এড়ানো হলো (ভুয়া পাস নয়)');
  console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
  process.exit(fail ? 1 : 0);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const fp = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(r);
});
await new Promise((res) => server.listen(0, '127.0.0.1', res));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
await page.route('**', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.FayzarAiOcrEngine && window.DocxToDocConverter && window.DocxHandler, { timeout: 45000 });

const MD = [
  'কুমিল্লা জিলা স্কুল',
  'প্রথম সাময়িক পরীক্ষা-২০২৬',
  'শ্রেণি: অষ্টম | বিষয়: গণিত | সময়: ২ ঘণ্টা | পূর্ণমান: ৫০',
  '',
  '১. ৪৮° কোণের পূরক কোণের মান কত?',
  'ক. ৪২° খ. ৪৮° গ. ১৩২° ঘ. ১৪২°',
  '',
  '২. বৃত্তের পরিধি $2\\pi r$ হলে ক্ষেত্রফল কত?',
  'ক. $36\\pi$ খ. $12\\pi$ গ. $9\\pi$ ঘ. $6\\pi$',
  '',
  '৩. সমাধান কর: $\\frac{1-y}{1+y} \\times \\frac{1-a}{1+a}$',
  'ক. $10\\%$ খ. $20\\%$ গ. $30\\%$ ঘ. $7\\frac{1}{2}\\%$',
].join('\n');

const run = (control) => page.evaluate(async ({ md, control }) => {
  const C = window.DocxToDocConverter;
  const orig = C.sanitizeFontFamily;
  if (control) C.sanitizeFontFamily = (x) => x;             // নিয়ন্ত্রণ: পুরোনো আচরণ
  try {
    const master = await window.FayzarAiOcrEngine.generateMasterDocx(md, { docType: 'EXAM_MCQ', pageSize: 'a4-portrait', margin: 'normal', fontSize: '12', columns: 1 });
    const bj = await window.DocxHandler.convertDocx(master, { direction: 'u2b', targetFont: 'SutonnyMJ' });
    const conv = await C.convertDocxToDoc(bj.convertedBlob || bj.blob, { pageSize: 'a4-portrait', margin: 'normal', preserveSutonny: true, optimizeForQuestionPaper: true });
    return await (conv.blob || conv.convertedBlob).text();
  } finally { C.sanitizeFontFamily = orig; }
}, { md: MD, control });

const fixed = await run(false);
const control = await run(true);

{
  T('E2E: ফিক্স করা .doc-কে math-ফন্ট শূন্য', !MATH_RE.test(fixed), (fixed.match(MATH_RE) || []).slice(0, 2));
  T('E2E: নিয়ন্ত্রণ-রানে math-ফন্ট উপস্থিত (বাগ পুনরুৎপাদিত) ⇒ ফিক্সটাই যা সরায়', MATH_RE.test(control), (control.match(MATH_RE) || []).length);

  // টাইমস্ট্যাম্প (o:Created/o:LastSaved) দুই রানে ভিন্ন — নরমালাইজ করে তুলনা (content-only)
  const strip = (h) => String(h)
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, 'TS')
    .replace(/style=(["'])[\s\S]*?\1/g, '')
    .replace(/\s+/g, ' ').trim();
  T('E2E: font-only change — স্টাইল বাদ দিলে টেক্সট অবিকল', strip(fixed) === strip(control));

  const sizes = (h) => { const m = {}; (h.match(/font-size:\s*([\d.]+)pt/g) || []).forEach((x) => { const v = x.split(':')[1].trim(); m[v] = (m[v] || 0) + 1; }); return m; };
  T('E2E: ফন্ট-সাইজ বিতরণ অপরিবর্তিত (কোনো 14pt চাপানো হয়নি)', JSON.stringify(sizes(fixed)) === JSON.stringify(sizes(control)), { fixed: sizes(fixed), control: sizes(control) });
  T('E2E: হেডার ফন্ট-সাইজ অটুট (16pt ধরে রেখেছে)', /font-size:\s*16(\.0)?pt/.test(fixed));

  T('E2E: EQ-ফিল্ড অটুট (MsoFieldCode ≥ 2)', (fixed.match(/MsoFieldCode/g) || []).length >= 2, (fixed.match(/MsoFieldCode/g) || []).length);
  T('E2E: EQ-ফিল্ড separator-free (9i-আচরণ অটুট)', (fixed.match(/field-separator/gi) || []).length === 0);
  T('E2E: ভগ্নাংশ/সুইচ অটুট (`\\F(`)', /\\F\(/.test(fixed));
  T('E2E: কোনো `mso-line-height-rule` নেই (clipping-ঝুঁকি শূন্য)', !/mso-line-height-rule/i.test(fixed));

  const fams = [...fixed.matchAll(/mso-ascii-font-family:\s*'?([^;'"]+)/g)].map((m) => m[1].trim());
  const WL = new Set(['SutonnyMJ', 'Times New Roman', 'Kalpurush', 'Nikosh', 'Bijoy']);
  T('E2E: সব ascii-font-family হোয়াইটলিস্টে', fams.length > 0 && fams.every((f) => WL.has(f)), [...new Set(fams)]);
}

T('পেজ-এরর শূন্য', errs.length === 0, errs.slice(0, 2));

await browser.close();
server.close();
console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
