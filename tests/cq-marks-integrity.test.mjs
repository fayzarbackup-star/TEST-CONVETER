/**
 * CQ মার্ক-অখণ্ডতা টেস্ট (ধাপ ১)
 *   node tests/cq-marks-integrity.test.mjs
 *
 * দুটি নিয়ম স্থায়ীভাবে পাহারা দেয়:
 *   ১. মার্ক কখনো **দুইবার** ছাপা হবে না — `[১]`/`(৩)`/`মান: ৫` প্রশ্নের টেক্সটে থেকে
 *      যেত আর আলাদা মার্ক-কলামেও বসত।
 *   ২. উৎসে মার্ক না থাকলে ইঞ্জিন **নিজে মার্ক বানাবে না** (আগে ক→১, খ→২, গ→৩, ঘ→৪
 *      বসিয়ে দিত — এটি তথ্য আবিষ্কার, ব্যবহারকারীর স্পষ্ট নিষেধ)।
 *
 * সম্পূর্ণ অফলাইন; কোনো নেটওয়ার্ক বা ব্রাউজার লাগে না।
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');

const QE = require(path.join(ROOT, 'js/engines/question-engine.js'));
const EX = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
globalThis.QuestionEngine = QE;

let pass = 0, fail = 0;
const T = (name, cond, extra) => {
  if (cond) { pass++; console.log('✅ ' + name); }
  else { fail++; console.log('❌ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};

const subsOf = (parsed) => (parsed.sections[0].questions || []).flatMap(q => q.subQuestions || []);

// ───────────────── (ক) সব মার্ক-ফরম্যাট একবারেই, সঠিকভাবে ─────────────────
const body = [
  '১। উদ্দীপক: একটি বস্তু গতিশীল।',
  'ক. প্রশ্ন এক? [১]',
  'খ. প্রশ্ন দুই? (২)',
  'গ. দূরত্ব নির্ণয় করো। ১০',
  'ঘ. মতামত দাও। মান: ৫'
].join('\n');

const parsed = QE.parseQuestionPaper(body, { docType: 'EXAM_CQ' });
const subs = subsOf(parsed);

T('৪টি সাব-প্রশ্নই পার্স হয়েছে', subs.length === 4, subs.length);
T('ব্র্যাকেট মার্ক [১] শনাক্ত', subs[0] && subs[0].mark === '১', subs[0]);
T('বন্ধনী মার্ক (২) শনাক্ত', subs[1] && subs[1].mark === '২', subs[1]);
T('বহু-অঙ্কের মার্ক ১০ অক্ষুণ্ন', subs[2] && subs[2].mark === '১০', subs[2]);
T('"মান: ৫" মার্ক হিসেবে শনাক্ত (মুছে যায় না)', subs[3] && subs[3].mark === '৫', subs[3]);

T('মার্ক প্রশ্নের টেক্সটে অবশিষ্ট নেই (ডাবল প্রিন্ট বন্ধ)',
  subs.every(s => !/\[\s*[০-৯\d]+\s*\]|\(\s*[০-৯\d]+\s*\)|মান\s*[:ঃ]|[\s\t][০-৯\d]+$/.test(s.text)),
  subs.map(s => s.text));

// ───────────────── (খ) মার্ক না থাকলে কখনোই বানানো হবে না ─────────────────
const noMarkBody = [
  '১। উদ্দীপক দুই।',
  'ক. প্রথম প্রশ্ন?',
  'খ. দ্বিতীয় প্রশ্ন?',
  'গ. তৃতীয় প্রশ্ন?',
  'ঘ. চতুর্থ প্রশ্ন?'
].join('\n');

const noMark = subsOf(QE.parseQuestionPaper(noMarkBody, { docType: 'EXAM_CQ' }));
T('মার্কবিহীন ৪টি সাব-প্রশ্নই পার্স হয়', noMark.length === 4, noMark.length);
T('কোনো মার্ক আবিষ্কার করা হয়নি (সব খালি)',
  noMark.every(s => s.mark === ''), noMark.map(s => s.label + ':' + s.mark));

// আংশিক: কিছু লাইনে মার্ক আছে, কিছুতে নেই — যেগুলোতে নেই সেগুলো খালিই থাকবে
const mixed = subsOf(QE.parseQuestionPaper(
  ['২। উদ্দীপক।', 'ক. আছে? ১', 'খ. নেই?', 'গ. আছে? ৩', 'ঘ. নেই?'].join('\n'),
  { docType: 'EXAM_CQ' }
));
T('মিশ্র ক্ষেত্রে শুধু প্রকৃত মার্কগুলোই থাকে',
  mixed.map(s => s.mark).join(',') === '১,,৩,', mixed.map(s => s.label + ':' + s.mark));

// ───────────────── (গ) চূড়ান্ত DOCX-এ প্রভাব ─────────────────
const r = await EX.generateCqExamDocx(parsed, { returnInnerXml: true });
const texts = [...String(r.bodyXml || '').matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).filter(t => t.trim());

T('DOCX-এ "১" ঠিক একবার আছে (দুইবার নয়)',
  texts.filter(t => t.trim() === '১').length === 1, texts);
T('DOCX টেক্সটে ব্র্যাকেট-মার্ক অবশিষ্ট নেই',
  !texts.some(t => /\[\s*[০-৯\d]+\s*\]|\(\s*[০-৯\d]+\s*\)/.test(t)), texts.filter(t => /[\[\(]/.test(t)));

const rNo = await EX.generateCqExamDocx(QE.parseQuestionPaper(noMarkBody, { docType: 'EXAM_CQ' }), { returnInnerXml: true });
const textsNo = [...String(rNo.bodyXml || '').matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).filter(t => t.trim());
T('মার্কবিহীন প্রশ্নপত্রের DOCX-এ কোনো একক সংখ্যা-মার্ক বসেনি',
  !textsNo.some(t => /^[০-৯\d]{1,2}$/.test(t.trim())), textsNo);

// ───────────────── (ঘ) MCQ পাথ অপরিবর্তিত ─────────────────
const mcq = QE.parseQuestionPaper(
  ['১. বলের একক কী?', 'ক. জুল', 'খ. নিউটন', 'গ. ওয়াট', 'ঘ. প্যাসকেল'].join('\n'),
  { docType: 'EXAM_MCQ' }
);
const mq = mcq.sections[0].questions[0];
T('MCQ অপশন আগের মতোই options[]-এ যায় (সাব-প্রশ্নে নয়)',
  (mq.options || []).length === 4 && (mq.subQuestions || []).length === 0,
  { options: (mq.options || []).length, subs: (mq.subQuestions || []).length });
T('MCQ অপশন-টেক্সট অক্ষত', (mq.options || []).map(o => o.text).join('|') === 'জুল|নিউটন|ওয়াট|প্যাসকেল',
  (mq.options || []).map(o => o.text));

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
