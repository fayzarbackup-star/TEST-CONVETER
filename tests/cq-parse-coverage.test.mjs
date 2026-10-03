/**
 * Part-9j: প্রশ্ন-কভারেজ রিগ্রেশন — `MD → question-engine → docx`
 *   node tests/cq-parse-coverage.test.mjs
 *
 * কেন এই স্যুট (ব্যবহারকারীর আসল রিপোর্ট: class 8 math, ১২ পৃষ্ঠা):
 *   MD-তে সব প্রশ্ন ছিল, কিন্তু Word আউটপুটে প্রায় সব প্রশ্ন নিঃশব্দে হারিয়ে গিয়েছিল।
 *   কারণ চারটি আলাদা পার্সার-ডিফেক্ট, প্রতিটির জন্য এখানে লক-ইন টেস্ট:
 *     ৯j-ক) `## প্রশ্ন ১২। ...` — হেডিং-চিহ্ন ও সংখ্যার মাঝে `প্রশ্ন` শব্দ → regex ফেল → প্রশ্নই তৈরি হত না
 *     ৯j-খ) মার্ক-ক্লাস `[১২৩৪\d]` — ৮/১০/১২ মার্ক ধরা পড়ত না (`\d` বাংলা অঙ্ক ধরে না)
 *     ৯j-গ) inline সংক্ষেপ `গ. সা. গু.` → লাইন দুই টুকরো হয়ে option-এ (CQ-তে অদৃশ্য) → সাব-প্রশ্ন+মার্ক হারাত
 *     ৯j-ঘ) হেডার-স্ক্যান `ক) ঢাকা ...`-কে header.location ভেবে body-লাইন গিলে ফেলত → প্রথম প্রশ্ন বাদ
 */
import fs from 'fs';
import { createRequire } from 'module';

import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
global.JSZip = require(path.join(ROOT, 'js/jszip.min.js'));
const qe = require(path.join(ROOT, 'js/engines/question-engine.js'));
const eng = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

// ───────────────────────── CQ ফিক্সচার (ব্যবহারকারীর ফাইলের হুবহু আকৃতি) ─────────────────────────
const CQ = `# আপনার প্রতিষ্ঠান এর নাম
## ঠিকানা লিখুন
### পরীক্ষার নাম লিখুন
বিষয়: গণিত
সময়: ২ ঘণ্টা ৩০ মিনিট\tপূর্ণ
## প্রশ্ন ১২। একজন চাল ব্যবসায়ী কিছু চাল ৯৫০০ টাকায় বিক্রয় করায় তার ৫% ক্ষতি হলো।
\tক. সরল মুনাফা ও চক্রবৃদ্ধি মুনাফার সূত্র লেখো। (সহজমান)\t২
\tখ. চাল বিক্রেতা ঐ চাল কত টাকায় বিক্রয় করলে ৭% লাভ হতো? (মধ্যমান)\t৮
\tগ. $x$-এর মান নির্ণয় করো। (কঠিনমান)\t৮
## প্রশ্ন ০৭। বার্ষিক ১০% হারে ২৫,০০০ টাকা ব্যাংকে জমা রাখা হলো।
\tক. ২ বছরের মুনাফা-আসল নির্ণয় করো। (সহজমান)\t২
\tখ. ৩ বছরের সরল ও চক্রবৃদ্ধি মুনাফার পার্থক্য নির্ণয় করো। (মধ্যমান)\t৮
\tগ. $A, B$ ও $C$ এর গ. সা. গু. নির্ণয় করো। (কঠিনমান)\t৮
# সৃজনশীল প্রশ্ন ও সমাধান
## প্রশ্ন ৩। প্রাথমিক ও মাধ্যমিক উপাত্ত কাকে বলে?
## প্রশ্ন ১৬। একটি সামান্তরিকের দুইটি সন্নিহিত বাহুর দৈর্ঘ্য যথাক্রমে ৫ সে. মি. ও ৭ সে. মি.।`;

const MCQ = `বহুনির্বাচনি অভীক্ষা
সময়: ৩০ মিনিট
## প্রশ্ন ১। বাংলাদেশের রাজধানী কোনটি?
ক) ঢাকা খ) চট্টগ্রাম গ) খুলনা ঘ) রাজশাহী
## প্রশ্ন ২। ২+২=?
ক) ৩ খ) ৪ গ) ৫ ঘ) ৬`;

const stripHeads = (t) => t.replace(/^[ \t]*#{1,6}[ \t]*(?![\u09E6-\u09EF\d]+[।.)])/gm, ''); // production stripOcrArtifacts-এর ৩.৫ ধাপ

const allQ = (p) => p.sections.flatMap((s) => s.questions);

// ───────────────────────── ১) CQ: সব প্রশ্ন টিকে আছে (৯j-ক) ─────────────────────────
{
  const p = qe.parseQuestionPaper(CQ, { docType: 'EXAM_CQ' });
  const qs = allQ(p);
  T('৯j-ক: `## প্রশ্ন ১২।` হেডিং ধরা পড়ে (num ১২)', qs.some((q) => q.num === '১২'), qs.map((q) => q.num));
  T('৯j-ক: ৪টি প্রশ্নই ধরা পড়ে (১২/০৭/৩/১৬)', ['১২', '০৭', '৩', '১৬'].every((n) => qs.some((q) => q.num === n)), qs.map((q) => q.num));
  T('৯j-ক: শূন্য-প্যাডেড `০৭` অটুট', qs.some((q) => q.num === '০৭'));
  T('সেকশন-শিরোনাম `#` ছাড়া মেলে', p.sections.some((s) => s.title.replace(/^#\s*/, '').trim() === 'সৃজনশীল প্রশ্ন ও সমাধান'), p.sections.map((s) => s.title));
}

// ───────────────────────── ২) সাব-প্রশ্ন + মার্ক (৯j-খ/গ) ─────────────────────────
{
  const p = qe.parseQuestionPaper(CQ, { docType: 'EXAM_CQ' });
  const q12 = allQ(p).find((q) => q.num === '১২');
  const q07 = allQ(p).find((q) => q.num === '০৭');
  T('৯j-খ: প্রশ্ন ১২-এ ৩টি সাব-প্রশ্ন (ক/খ/গ)', (q12.subQuestions || []).length === 3, q12.subQuestions);
  T('৯j-খ: মার্ক ২/৮/৮ হুবহু (৮ আর ডিফল্ট ২/৩ নয়)', (q12.subQuestions || []).map((s) => s.mark).join(',') === '২,৮,৮', (q12.subQuestions || []).map((s) => s.mark));
  T('৯j-খ: প্রশ্ন ০৭-এও মার্ক ২/৮/৮', (q07.subQuestions || []).map((s) => s.mark).join(',') === '২,৮,৮', (q07.subQuestions || []).map((s) => s.mark));
  const abbr = (q07.subQuestions || []).find((s) => s.label === 'গ');
  T('৯j-গ: inline সংক্ষেপ `গ. সা. গু.` একই সাব-প্রশ্নে অটুট', !!abbr && abbr.text.includes('গ. সা. গু.'), abbr && abbr.text);
  T('৯j-গ: সাব-প্রশ্নের টেক্সটে কাঁচা `\\t`-মার্ক লিক নেই', !(q07.subQuestions || []).some((s) => /[\t]/.test(s.text)), (q07.subQuestions || []).map((s) => s.text));
  T('৯j-গ: CQ-তে options ০ (সাব-প্রশ্ন option-এ চলে যায় না)', (q12.options || []).length === 0 && (q07.options || []).length === 0, [q12.options.length, q07.options.length]);
}

// ───────────────────────── ৩) হেডার-স্ক্যান body খায় না (৯j-ঘ) ─────────────────────────
{
  const p = qe.parseQuestionPaper(MCQ, { docType: 'EXAM_MCQ' });
  const qs = allQ(p);
  T('৯j-ঘ: MCQ-তে ২টি প্রশ্নই টেকে (`ক) ঢাকা ...` body-লাইন গেলে না)', qs.length === 2, qs.map((q) => q.num));
  T('৯j-ঘ: ৪টি অপশন-ই option হিসেবে ধরা পড়ে (sub নয়)', qs.every((q) => (q.options || []).length === 4 && (q.subQuestions || []).length === 0), qs.map((q) => [q.options.length, q.subQuestions.length]));
  T('৯j-ঘ: header.location-এ অপশন-লাইন ঢোকে না', !/ঢাকা/.test(p.header.location || ''), p.header.location);
}

// ───────────────────────── ৪) strip-করা (production) টেক্সটেও একই ফল ─────────────────────────
{
  const p = qe.parseQuestionPaper(stripHeads(CQ), { docType: 'EXAM_CQ' });
  const qs = allQ(p);
  T('production strip-এর পরেও ৪/৪ প্রশ্ন', ['১২', '০৭', '৩', '১৬'].every((n) => qs.some((q) => q.num === n)), qs.map((q) => q.num));
  T('production strip-এর পরেও মার্ক ২/৮/৮', (qs.find((q) => q.num === '১২').subQuestions || []).map((s) => s.mark).join(',') === '২,৮,৮');
}

// ───────────────────────── ৫) আর্টিফ্যাক্ট: docx-এ সব প্রশ্ন পৌঁছায় ─────────────────────────
{
  const blob = await eng.generateModernDocx(stripHeads(CQ), 'EXAM_CQ', { font: 'Kalpurush' });
  const buf = Buffer.from(await blob.arrayBuffer());
  const outPath = path.join(ROOT, 'scratch/cq9j_coverage.docx');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  const zip = await global.JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('string');
  const txt = xml.replace(/<[^>]+>/g, '');
  // ১৩.২: আর্টিফ্যাক্ট-লেভেলে (EDE _resolveParsed) নম্বর এখন সেকশনভিত্তিক ১..N —
  // মূল গাইড-নম্বর ১২/০৭/১৬ ছাপা হয় না; parser-ফিডেলিটি (নিচে qs[]) অপরিবর্তিত থাকে।
  // ফিক্সচারে ২টি সেকশন (মূল পরীক্ষা + 'সৃজনশীল প্রশ্ন ও সমাধান') ⇒ নীতিমতে প্রতিটি
  // সেকশনই ১। থেকে শুরু করে (১।, ২।)×২; মূল গাইড-নম্বর ১২/০৭/১৬ আর ছাপা হয় না।
  T('আর্টিফ্যাক্ট: প্রতি সেকশন ১।, ২। ছাপে; মূল গাইড-নম্বর থাকে না',
    (txt.match(/১।/g) || []).length >= 2 && (txt.match(/২।/g) || []).length >= 2 &&
    !txt.includes('১২।') && !txt.includes('০৭।') && !txt.includes('১৬।'), txt.slice(0, 120));
  T('আর্টিফ্যাক্ট: সাব-প্রশ্নের লেখা হারায়নি (সূত্র লেখো/সা. গু.)', txt.includes('সূত্র লেখো') && txt.includes('সা. গু.'));
  T('আর্টিফ্যাক্ট: মার্ক ২ ও ৮ টেক্সটে আছে', txt.includes('২') && txt.includes('৮'));
  T('আর্টিফ্যাক্ট: কাঁচা LaTeX (`\\frac`) নেই — OMML/সঠিক রেন্ডার', !/\\frac|\\sqrt/.test(txt));
  T('আর্টিফ্যাক্ট: docx আকার যুক্তিসঙ্গত (>= ৪ KB)', buf.length >= 4096, buf.length);
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
