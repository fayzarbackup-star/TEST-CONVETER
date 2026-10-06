/**
 * Part-13.2: পরীক্ষার কাগজে অংশভিত্তিক ধারাবাহিক নম্বরায়ন (deterministic, code-level)
 *   node tests/exam-renumber.test.mjs
 *
 * নীতি:
 *   • OCR/পার্সার ট্রান্সক্রিপ্ট **হুবহু** রাখে (ফিডেলিটি) — মডেল প্রম্পটে নম্বর বদলানোর
 *     নির্দেশ নেই (সেই নির্দেশই আগে প্লেসহোল্ডার-দুর্ঘটনা ঘটিয়েছিল)।
 *   • চূড়ান্ত ১।, ২।, ৩। … নম্বরায়ন হয় **এখানে — কোডে**, প্রতি সেকশনে, নির্ধারকভাবে।
 *
 * এই স্যুট পাহারা দেয়: ইউনিট-নিয়ম, পাইপলাইন/ইঞ্জিন-সংযুক্তি, combined-সেকশন,
 * ডিজিট-স্টাইল (বাংলা/ASCII), ফিডেলিটি-গার্ড (subQuestions/মার্ক/উদ্দীপক/text),
 * idempotency এবং opt-out (renumber:false)।
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

global.JSZip = require(path.join(ROOT, 'js', 'jszip.min.js'));
const RN = require(path.join(ROOT, 'js', 'layout-engine', 'exam-renumber.js'));
global.FayzarExamRenumber = RN;
const QE = require(path.join(ROOT, 'js', 'engines', 'question-engine.js'));
const Pipeline = require(path.join(ROOT, 'js', 'layout-engine', 'fayzar-pipeline.js'));
const Export = require(path.join(ROOT, 'js', 'engines', 'export-dual-engine.js'));

const rtfDecode = (s) => String(s)
  .replace(/\\u(-?\d+)\s?\??/g, (_, d) => String.fromCharCode(((Number(d) % 65536) + 65536) % 65536))
  .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
const rtfPlain = (s) => rtfDecode(s).replace(/\\[a-zA-Z]+-?\d*\s?/g, '').replace(/[{}]/g, '');

// ───────────────────────── ১) ইউনিট-নিয়ম ─────────────────────────
{
  T('isExamType: EXAM_* → true', ['EXAM_CQ', 'EXAM_MCQ', 'exam_combined', 'EXAM_MATH', 'EXAM_GENERAL'].every(RN.isExamType));
  T('isExamType: অ-পরীক্ষা → false', ['STAMP_DEED', 'GOVT_APP', 'PROTTOYON', 'GENERAL_TEXT', '', null].every((t) => !RN.isExamType(t)));
  T('toBengaliDigits(12) → ১২', RN.toBengaliDigits(12) === '১২');

  const mk = (nums) => ({ sections: [{ title: 'ক', questions: nums.map((n) => ({ num: n, text: 'প্রশ্ন ' + n, subQuestions: [{ label: 'ক', text: 'উপপ্রশ্ন', mark: '২' }] })) }] });
  const a = mk(['৭২', '৪৪', '৩']);
  RN.renumberExamSections(a);
  T('বাংলা-নম্বর: ৭২/৪৪/৩ → ১/২/৩', a.sections[0].questions.map((q) => q.num).join(',') === '১,২,৩', a.sections[0].questions.map((q) => q.num));
  T('ফিডেলিটি: text অটুট', a.sections[0].questions[0].text === 'প্রশ্ন ৭২');
  T('ফিডেলিটি: subQuestions অটুট', a.sections[0].questions[1].subQuestions[0].label === 'ক' && a.sections[0].questions[1].subQuestions[0].mark === '২');

  const b = mk(['24', '3', '10']);
  RN.renumberExamSections(b);
  T('ASCII-নম্বর: 24/3/10 → 1/2/3 (স্টাইল অটুট)', b.sections[0].questions.map((q) => q.num).join(',') === '1,2,3', b.sections[0].questions.map((q) => q.num));

  const c = mk(['24', '3']);
  RN.renumberExamSections(c, { style: 'bn' });
  T('style জোর করলে bn', c.sections[0].questions.map((q) => q.num).join(',') === '১,২');

  const d = mk(['১', '২']);
  const before = JSON.stringify(d);
  RN.renumberExamSections(d);
  T('idempotent (আগেই ক্রমিক হলে অপরিবর্তিত)', JSON.stringify(d) === before);

  T('sections ছাড়া নিরাপদ', RN.renumberExamSections(null) === null && RN.renumberExamSections({}) !== null);
  T('খালি তালিকা নিরাপদ', RN.renumberExamSections({ sections: [{ questions: [] }, null] }) !== null);

  // দুই সেকশন — প্রতিটি ১ থেকে
  const e = { sections: [{ questions: [{ num: '২৪' }, { num: '৯' }] }, { questions: [{ num: '৫৫' }, { num: '৭' }, { num: '১২' }] }] };
  RN.renumberExamSections(e);
  T('সেকশন-ভিত্তিক রিস্টার্ট: [১,২] ও [১,২,৩]',
    e.sections[0].questions.map((q) => q.num).join(',') === '১,২' && e.sections[1].questions.map((q) => q.num).join(',') === '১,২,৩');
}

// ───────────────────────── ২) পাইপলাইন-সংযুক্তি (প্রিভিউ == ডাউনলোড) ─────────────────────────
const CQ_MD = [
  '১. প্রথম প্রশ্ন? ২',
  'ক. উপপ্রশ্ন এক? ২',
  'খ. উপপ্রশ্ন দুই? ৪',
  '',
].join('\n');
const CQ_FRAG = '৭২। প্রথম উদ্দীপক পড়ে উত্তর দাও:\nক. প্রশ্ন এক? ২\nখ. প্রশ্ন দুই? ৪\n\n৪৪। দ্বিতীয় প্রশ্ন? ২\nক. প্রশ্ন তিন? ২\n';
{
  const html = await Pipeline.process(CQ_FRAG, { docType: 'EXAM_CQ', outputFormat: 'html' });
  const nums = [...String(html.content).matchAll(/class="cq-num[^"]*"[^>]*>([^<]*)</g)].map((m) => m[1]);
  T('প্রিভিউ: s০৭২/৪৪ → ১।/২।', nums.join('|') === '১।|২।', nums);

  const rtf = await Pipeline.process(CQ_FRAG, { docType: 'EXAM_CQ', outputFormat: 'doc' });
  let t = rtf.content; if (t && typeof t.text === 'function') t = await t.text();
  const decoded = rtfPlain(t);
  T('.doc: ধারাবাহিক ১।, ২। ছাপা হয়', decoded.includes('১।') && decoded.includes('২।'));
  T('.doc: মূল ৭২/৪৪ আর নেই', !decoded.includes('৭২') && !decoded.includes('৪৪'));
  T('.doc: উপ-প্রশ্ন ও মার্ক অটুট', decoded.includes('প্রশ্ন এক') && decoded.includes('২'));

  const off = await Pipeline.process(CQ_FRAG, { docType: 'EXAM_CQ', outputFormat: 'html', renumber: false });
  const offNums = [...String(off.content).matchAll(/class="cq-num[^"]*"[^>]*>([^<]*)</g)].map((m) => m[1]);
  T('renumber:false → মূল নম্বর অটুট', offNums.join('|') === '৭২।|৪৪।', offNums);

  const docx = await Pipeline.process(CQ_FRAG, { docType: 'EXAM_CQ', outputFormat: 'docx' });
  const zip = await global.JSZip.loadAsync(Buffer.from(await docx.content.arrayBuffer()));
  const xml = await zip.file('word/document.xml').async('string');
  const pdf = xml.replace(/<[^>]+>/g, '');
  T('.docx: ধারাবাহিক নম্বর, মূল নম্বর নেই', pdf.includes('১।') && pdf.includes('২।') && !pdf.includes('৭২।'));
}
{
  const MCQ_FRAG = '২৪। MCQ এক?\nক. এ\nখ. বি\n\n৩। MCQ দুই?\nক. সি\nখ. ডি\n';
  const html = await Pipeline.process(MCQ_FRAG, { docType: 'EXAM_MCQ', outputFormat: 'html' });
  const nums = [...String(html.content).matchAll(/class="mcq-num">([^<]*)</g)].map((m) => m[1]);
  T('MCQ (বাংলা-স্টাইল): ২৪/৩ → ১./২.', nums.join('|') === '১.|২.', nums);

  const MCQ_EN = '24. MCQ one?\nক. A\nখ. B\n\n3. MCQ two?\nক. C\nখ. D\n';
  const h2 = await Pipeline.process(MCQ_EN, { docType: 'EXAM_MCQ', outputFormat: 'html' });
  const n2 = [...String(h2.content).matchAll(/class="mcq-num">([^<]*)</g)].map((m) => m[1]);
  T('MCQ (ASCII-স্টাইল): 24/3 → 1./2. (ASCII-ই থাকে)', n2.join('|') === '1.|2.', n2);
}

// ───────────────────────── ৩) ইঞ্জিন-সংযুক্তি (সরাসরি ExportDualEngine) ─────────────────────────
{
  const blob = Export.generateWordDoc(CQ_FRAG, 'EXAM_CQ', { format: 'doc' });
  const t = await blob.text();
  const d = rtfPlain(t);
  T('ইঞ্জিন সরাসরি (.doc): ধারাবাহিক ১।, ২।', d.includes('১।') && d.includes('২।'));
  T('ইঞ্জিন সরাসরি: মূল নম্বর ৭২ নেই', !d.includes('৭২'));

  // Combined: CQ + MCQ — দুই সেকশনই ১ থেকে
  const comb = '৭২। প্রথম উদ্দীপক?\nক. এক? ২\nখ. দুই? ৪\n\n---SECTION_BREAK:MCQ---\n\n৩৪। MCQ এক?\nক. এ\nখ. বি\n\n৯। MCQ দুই?\nক. সি\nখ. ডি\n';
  const blob2 = Export.generateWordDoc(comb, 'EXAM_COMBINED', { format: 'doc' });
  const d2 = rtfPlain(await blob2.text());
  const hasCq1 = d2.includes('১।'), hasMcq2 = d2.includes('২।');
  T('Combined: CQ ১। ও MCQ অংশ (১।, ২।) — দুই সেকশনই স্বাধীন ক্রম', hasCq1 && hasMcq2);
  T('Combined: মূল ৭২/৩৪/৯ আর নেই', !d2.includes('৭২') && !d2.includes('৩৪') && !d2.includes('৯।'));
}

// ───────────────────────── ৪) সোর্স-গেট (পুনরাবৃত্তি/রিগ্রেশন ঠেকাতে) ─────────────────────────
{
  const pl = fs.readFileSync(path.join(ROOT, 'js', 'layout-engine', 'fayzar-pipeline.js'), 'utf8');
  T('pipeline: renumber-hook আছে ও opt-out মানে', /FayzarExamRenumber/.test(pl) && /options\.renumber !== false/.test(pl));

  const ee = fs.readFileSync(path.join(ROOT, 'js', 'engines', 'export-dual-engine.js'), 'utf8');
  T('engine: _applyExamRenumber হেল্পার', /_applyExamRenumber\(parsed, docType, options\)\s*\{/.test(ee));
  T('engine: combined-দুই সাইটও নম্বরায়িত (৪ কল-লাইন)', (ee.match(/_applyExamRenumber\(qEngine\.parseQuestionPaper/g) || []).length === 4);

  const ocr = fs.readFileSync(path.join(ROOT, 'js', 'ai-ocr-engine.js'), 'utf8');
  T('OCR-প্রম্পট: ম্যান্ডেট-রেনাম্বার বিলুপ্ত', !/MANDATORY SEQUENTIAL RENUMBERING/.test(ocr));
  T('OCR-প্রম্পট: ফিডেলিটি + ডাউনস্ট্রিম-নোট আছে', /সিস্টেম স্বয়ংক্রিয়ভাবে ডাউনস্ট্রিমে করবে/.test(ocr) && /প্লেসহোল্ডার নয়/.test(ocr));
  T('OCR verify-প্রম্পট: preservation অটুট', /QUESTION NUMBER PRESERVATION \(CRITICAL\)/.test(ocr));
  T('OCR-ফাইল: fixed line-height হ্যাক ফিরে আসেনি', !/mso-line-height-rule/.test(ocr));

  for (const page of ['index.html', 'studio.html']) {  // converter.html এখন হোম-পাতা (২০২৬-১০-০৬)
    const h = fs.readFileSync(path.join(ROOT, page), 'utf8');
    T(`${page}: exam-renumber.js পাইপলাইনের আগে লোড হয়`,
      h.indexOf('exam-renumber.js') >= 0 && h.indexOf('exam-renumber.js') < h.indexOf('fayzar-pipeline.js'));
  }
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
