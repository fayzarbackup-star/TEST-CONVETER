/**
 * part-8b: ইকুয়েশন রেন্ডার — তিন পাথই (EQ .doc / OMML .docx / HTML প্রিভিউ) — স্থায়ী টেস্ট।
 *   node tests/equation-render.test.mjs
 * নিয়ম: কোন পাথেই কাঁচা LaTeX (ব্যাকস্ল্যাশ/কমান্ড-নাম) থাকতে পারবে না;
 *       প্রিভিউ রেন্ডারার ভগ্নাংশ/সূচক/বর্গমূল সত্যিকারের HTML-এ আঁকবে।
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const H = require('./lib/harness.js');

import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EC = require(path.join(ROOT, 'js/equation-converter.js'));

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

// কাঁচা LaTeX ধরার কঠোর নিয়ম: ব্যাকস্ল্যাশ, অথবা কমান্ড-নাম-কথা
const RAW_WORDS = /(dfrac|tfrac|cfrac|vec|overline|underline|overrightarrow|triangle|parallel|perp|begin\{|end\{|cases|vmatrix|pmatrix|bmatrix|times|cdot|Rightarrow|rightarrow|infty|partial|percent|ldots|cdots|square|sqrt|angle|circ|degree|mathrm|text\{|left\s*[([{]|right\s*[)\]}])/;
const hasRaw = (s) => /\\/.test(String(s)) || RAW_WORDS.test(String(s));

const ommlText = (x) => (String(x).match(/<m:t[^>]*>([\s\S]*?)<\/m:t>/g) || []).map((t) => t.replace(/<[^>]*>/g, '')).join('|');
const eqStrip = (x) => String(x).replace(/\\(?:F|R|S|up|do|al|ar|ac|con|B|I|X|A|o|b|bc|lc|rc)\s*\d*\s*\(?/gi, '');
const htmlText = (x) => String(x).replace(/<[^>]*>/g, '');

const CASES = [
  ['\\frac{1}{2}', 'সাধারণ ভগ্নাংশ'],
  ['\\dfrac{3}{4}', '\\dfrac'],
  ['\\frac{-b+\\sqrt{b^2-4ac}}{2a}', 'নেস্টেড ভগ্নাংশ+বর্গমূল'],
  ['\\sqrt[3]{27}', 'ঘনমূল'],
  ['\\sqrt{x^2+y^2}', 'বর্গমূল রাশি'],
  ['x^{10}', 'সূচক'],
  ['H_2SO_4', 'রসায়ন'],
  ['10^{-3}', 'ঋণাত্মক সূচক'],
  ['2\\times10^{8}', 'বৈজ্ঞানিক রূপ'],
  ['30^\\circ', 'ডিগ্রি'],
  ['\\angle ABC = 90^\\circ', 'কোণ'],
  ['\\sin 30^\\circ = \\frac{1}{2}', 'sin/cos'],
  ['\\cos^2\\theta', 'cos^2'],
  ['\\pi r^2', 'πr²'],
  ['\\vec{F} = m\\vec{a}', 'ভেক্টর'],
  ['\\overline{AB}', 'রেখাংশ বার'],
  ['\\overline{AB} \\perp CD', 'লম্ব'],
  ['AB \\parallel CD', 'সমান্তরাল'],
  ['\\triangle ABC', 'ত্রিভুজ'],
  ['\\lim_{x\\to 0}\\frac{\\sin x}{x} = 1', 'লিমিট'],
  ['\\int_0^1 x^2\\,dx', 'ইন্টিগ্রাল'],
  ['\\sum_{i=1}^{n} i', 'সিগমা'],
  ['\\log_{10} 100 = 2', 'লগ'],
  ['\\left(\\frac{a}{b}\\right)^2', 'left/right'],
  ['5\\%', 'শতাংশ'],
  ['\\text{cm}', '\\text'],
  ['\\begin{cases} x+y=5 \\\\ x-y=1 \\end{cases}', 'cases'],
  ['\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', 'নির্ণায়ক'],
];

let badDocx = 0, badDoc = 0, badPrev = 0;
for (const [c, label] of CASES) {
  const oTxt = ommlText(EC.latexToOmml(c, false));
  const oOmml = EC.latexToOmml(c, false);
  const dTxt = eqStrip(EC.latexToEqField(c, false));
  const pTxt = htmlText(EC.latexToPreviewHtml(c, 12));
  const okO = oOmml.includes('<m:oMath>') && !hasRaw(oTxt);
  const okD = dTxt.trim().length > 0 && !hasRaw(dTxt);
  const okP = pTxt.trim().length > 0 && !hasRaw(pTxt);
  if (!okO) badDocx++; if (!okD) badDoc++; if (!okP) badPrev++;
  T(`.docx ✓ ${label}`, okO, oTxt.slice(0, 70));
  T(`.doc  ✓ ${label}`, okD, dTxt.slice(0, 70));
  T(`প্রিভিউ ✓ ${label}`, okP, pTxt.slice(0, 70));
}
T('তিন পাথেই সব কেস (ব্যর্থ: docx=' + badDocx + ', doc=' + badDoc + ', preview=' + badPrev + ')',
  badDocx === 0 && badDoc === 0 && badPrev === 0, null);

// ---- প্রিভিউ-রেন্ডারারের গঠন-চেক ----
const frac = EC.latexToPreviewHtml('\\frac{1}{2}', 12);
T('প্রিভিউ: ভগ্নাংশ = সত্যিকারের ভগ্নাংশ-মার্কআপ', frac.includes('border-top') && frac.includes('display:block'), frac.slice(0, 90));
const sup = EC.latexToPreviewHtml('x^{10}', 12);
T('প্রিভিউ: সূচক = <sup>', sup.includes('<sup'), sup.slice(0, 90));
const rad = EC.latexToPreviewHtml('\\sqrt{2}', 12);
T('প্রিভিউ: বর্গমূল = √ + বার', rad.includes('√') && rad.includes('border-top'), rad.slice(0, 90));

// ---- question-engine ওয়্যারিং (স্ট্যাটিক) ----
const qeSrc = fs.readFileSync(path.join(ROOT, 'js/engines/question-engine.js'), 'utf8');
T('question-engine: richText/richTextBlock আছে', qeSrc.includes('richText(text)') && qeSrc.includes('richTextBlock(text)'));
T('question-engine: কল-সাইট ≥ ৭টি', (qeSrc.match(/this\.richText\(/g) || []).length >= 7, (qeSrc.match(/this\.richText\(/g) || []).length);

// ---- ফাংশনাল: পাইপলাইন HTML-এ কাঁচা $ বা পাইপ-টেবিল থাকবে না ----
const SAMPLE = [
  '১। সমাধান করো: $x^2 + 2x + 1 = 0$ এবং $\\frac{1}{2}$ দেখাও।',
  '',
  '| যৌগ | উদাহরণ |',
  '|---|---|',
  '| X | NaOH, Ca(OH)$_2$ |',
].join('\n');

(async () => {
  try {
    const res = await H.loadEngines().Pipeline.process(SAMPLE, { docType: 'EXAM_CQ', outputFormat: 'html' });
    const html = String(res.content || '');
    T('প্রিভিউ HTML-এ কাঁচা $ নেই', !html.includes('$'), html.slice(0, 90));
    T('প্রিভিউ HTML-এ পাইপ-টেবিল নেই', !/\|\s*-{2,}\s*\|/.test(html), html.slice(0, 90));
    T('প্রিভিউ HTML-এ ইকুয়েশন-মার্কআপ আছে (sup/frac)', /<sup|border-top|eq-rendered/.test(html), html.slice(0, 120));
  } catch (e) { T('পাইপলাইন HTML', false, e.message); }

  console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
  process.exit(fail ? 1 : 0);
})();
