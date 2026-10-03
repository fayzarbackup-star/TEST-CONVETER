// Part-12: প্রশ্ন-ইঞ্জিন পার্স আচরণ (গ্রুপিং / মার্ক / বিভাগ-মান)
const path = require('path'), fs = require('fs');
const R = (p) => require(path.join(__dirname, '..', p));
const g = globalThis;
g.FayzarLayoutUnits = R('js/layout-engine/layout-units.js');
g.TextRunProcessor = R('js/layout-engine/text-run-processor.js');
g.QuestionEngine = R('js/engines/question-engine.js');
const QE = g.QuestionEngine;

const s1 = [
  '১. নিচের উদ্দীপকটি পড়ে প্রশ্নগুলোর উত্তর দাও।',
  'ক. ১৬ ভুট্টা ৪ টাকায় বিক্রি করলে ২০% লস হয়। মূল দাম নির্ণয় করো। ৩',
  'খ. ৪০ মিটার লম্বা একটি রাস্তার দুই পাশে ৭ মিটার চওড়া ফুটপাথ আছে। ফুটপাথ দুটির ক্ষেত্রফল বের করো। ৪',
  'গ. একটি ত্রিভুজের তিন বাহুর অনুপাত ৩:৪:৫ এবং পরিসীমা ২৪ সেমি। ক্ষেত্রফল নির্ণয় করো। ৩',
  'ঘ. ৫ টাকায় ৩টি কমলা কিনে ৪ টাকায় ২টি করে কমলা বিক্রি করা হলো। শতকরা লাভ বা লস নির্ণয় করো। ৪',
  '২. নিচের উদ্দীপকটি পড়ে প্রশ্নগুলোর উত্তর দাও।',
  'ক. ৩০ জন শিক্ষার্থীর গড় বয়স ১৪ বছর। ৫ জন নতুন শিক্ষার্থী যোগ হলে গড় বয়স ১৫ বছর হলো। নতুনদের গড় বয়স কত? ২',
  'খ. একটি আয়তক্ষেত্রের দৈর্ঘ্য ও প্রস্থের অনুপাত ৫:৩, পরিসীমা ৬৪ সেমি। ক্ষেত্রফল নির্ণয় করো। ৩',
  'গ. ৪ জন একসাথে ১২ দিনে কাজ শেষ করে। ৬ জন কত দিনে করবে? ৪',
  'ঘ. একটি গাড়ি ৬০ কিমি/ঘ বেগে ২ ঘণ্টা চলে। একই পথ ৪০ কিমি/ঘ বেগে যেতে কত সময় লাগবে? ২',
].join('\n');

const s2 = [
  '[উদ্দীপক 1]',
  'একটি মোটরসাইকেল ২০ মিটার/সে.বেগে চলছে।',
  '1. ক. বেগকে কিমি/ঘ-এ রূপান্তর করো।',
  'খ. ৫ সেকেন্ডে অতিক্রান্ত দূরত্ব নির্ণয় করো। ২',
  '[উদ্দীপক 2]',
  'মিয়া সাহেব ৪০০ মিটার দৌড়ের প্রতিযোগিতায় অংশ নেন।',
  '4. ক. তার গড় বেগ নির্ণয় করো। ৩',
  'গ. শেষ ১০০ মিটারে ত্বরণ কমে যায় কেন? ব্যাখ্যা করো।',
].join('\n');

const s3 = 'বিভাগ: গণিত (সৃজনশীল প্রশ্ন) মান: ২০\n১. উৎপাদকে বিশ্লেষণ করো: x² + 5x + 6। ৪\n২. সমাধান করো ২x - 6 = 0। ৩';

let fails = 0;
const check = (label, ok, extra) => { if (!ok) { fails++; console.log('   ✗ ' + label + (extra ? ' → ' + extra : '')); } else console.log('   ✓ ' + label + (extra ? ' → ' + extra : '')); };

const p1 = QE.parseQuestionPaper(s1, { docType: 'EXAM_CQ' });
const q1 = p1.sections.flatMap((s) => s.questions);
check('নমুনা ১: ৮টি চ্যাপ্টা প্রশ্ন নয় — ২টি গ্রুপ', q1.length === 2, 'questions=' + q1.length);
check('প্রতিটিতে ৪টি সাব-প্রশ্ন', q1.every((q) => q.subQuestions.length === 4), q1.map((q) => q.subQuestions.length).join('/'));
check('উদ্দীপক স্টেম হিসেবে নয়, উদ্দীপক ফিল্ডে', q1.every((q) => /^নিচের উদ্দীপকটি/.test(q.stimulus || '') && !q.text), JSON.stringify({ t: q1[0].text, s: (q1[0].stimulus || '').slice(0, 20) }));
const m1 = q1[0].subQuestions.map((s) => s.mark).join(',');
const m2 = q1[1].subQuestions.map((s) => s.mark).join(',');
check('মার্ক উৎস অনুযায়ী (ক:৩ খ:৪ গ:৩ ঘ:৪)', m1 === '৩,৪,৩,৪', m1);
check('দ্বিতীয় গ্রুপের মার্ক (২,৩,৪,২)', m2 === '২,৩,৪,২', m2);
check('সাব-প্রশ্নের টেক্সটে মার্ক হিসেবে শেষ শব্দ কাটা যায়নি',
  q1[0].subQuestions.every((s) => /[।.?]$/.test(s.text) || s.text.length > 10),
  JSON.stringify(q1[0].subQuestions.map((s) => s.text.slice(-14))));

const p2 = QE.parseQuestionPaper(s2, { docType: 'EXAM_CQ' });
const q2 = p2.sections.flatMap((s) => s.questions);
check('নমুনা ২: প্রশ্ন ২টি (মার্কার বাদে)', q2.length === 2, 'questions=' + q2.length + ' :: ' + q2.map((q) => q.num).join(','));
check('উদ্দীপক সঠিক প্রশ্নে যুক্ত (Q1-এ মোটরসাইকেল)', /মোটরসাইকেল/.test(q2[0].stimulus || ''), JSON.stringify(q2.map((q) => (q.stimulus || '').slice(0, 16))));
check('Q2-এর সঙ্গে দ্বিতীয় উদ্দীপক', /মিয়া সাহেব/.test(q2[1].stimulus || ''), JSON.stringify((q2[1].stimulus || '').slice(0, 20)));
check('মার্ক কল্পনা করা হয়নি (খ→২ আসল, গ→খালি)', q2[0].subQuestions.map((s) => s.mark).join(',') === ',২' && q2[1].subQuestions.map((s) => s.mark).join(',') === '৩,',
  q2.map((q) => q.subQuestions.map((s) => s.label + ':' + s.mark).join(' ')).join(' | '));
check('মার্কার লাইন আগের প্রশ্নের বডিতে মিশেনি', q2.every((q) => !/\[উদ্দীপক/.test((q.text || '') + (q.subQuestions || []).map((s) => s.text).join(' '))));

const p3 = QE.parseQuestionPaper(s3, { docType: 'EXAM_CQ' });
check('বিভাগ শিরোনাম থেকে মান আলাদা', p3.sections[0].marks === '২০' && !/মান/.test(p3.sections[0].title), JSON.stringify({ title: p3.sections[0].title, marks: p3.sections[0].marks }));
check('বিভাগ-প্রশ্নগুলো ঠিক আছে', p3.sections[0].questions.length === 2, 'q=' + p3.sections[0].questions.length);

// রিগ্রেশন: সাধারণ (উদ্দীপকহীন) সৃজনশীল প্রশ্ন
const p4 = QE.parseQuestionPaper(fs.readFileSync(path.join(__dirname, '..', 'proof', 'samples', 'cq-booklet-6.plain.md'), 'utf8'), { docType: 'EXAM_CQ' });
const n4 = p4.sections.reduce((a, s) => a + s.questions.length, 0);
console.log('   · cq-booklet-6 fixture-এর প্রশ্ন সংখ্যা:', n4, '| সাব-প্রশ্নের মার্ক:', p4.sections[0].questions.slice(0, 2).map((q) => (q.subQuestions || []).map((s) => s.mark).join('/')).join(' , '));
console.log(fails ? '\n   ✗ ' + fails + ' ব্যর্থ' : '\n   ✓ সব ঠিক');
process.exit(fails ? 1 : 0);
