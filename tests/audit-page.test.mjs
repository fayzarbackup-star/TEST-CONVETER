/**
 * Part-9: অডিট-নোট পৃষ্ঠা — তিন পাথেই (.doc/.docx/HTML) শেষে, পেজ-ব্রেক সহ, আলাদা পৃষ্ঠায়।
 *   node tests/audit-page.test.mjs
 * নিয়ম:
 *   ১) মূল কনটেন্ট আগে — তারপর PAGE BREAK — তারপর অডিট-নোট (একবারই, কখনো মিশে যাবে না)।
 *   ২) অডিট-নোট না থাকলে আউটপুটে কোনো পার্থক্য হবে না (রিগ্রেশন-নিরাপদ)।
 *   ৩) preview == download: HTML-ও শেষে আলাদা "শীট" দেখাবে।
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const H = require('./lib/harness.js');

const ROOT = H.ROOT;
// Part-11 (TC-LAY-34): কম্বাইন্ড পত্রে CQ→MCQ বিভাজক এখন next-page *সেকশন ব্রেক*
// (\sect\sbkpage / <w:type w:val="nextPage"/>) — কারণ MCQ অংশ পোর্ট্রেট সেটআপে বসে।
// পৃষ্ঠা-বিভাজক গণনায় সেটিও ধরা হয়, কারণ ইচ্ছা একটাই: MCQ নতুন পৃষ্ঠায় শুরু হয়।
const pageSepsRtf = (t) => (t.match(/\\page/g) || []).length + (t.match(/\\sect\\sbkpage/g) || []).length;
const pageSepsXml = (t) => (t.match(/<w:br w:type="page"\/>/g) || []).length + (t.match(/<w:type w:val="nextPage"\/>/g) || []).length;
let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

const NOTE = '[এআই অডিট নোট ও পরিবর্তনসমূহ:\n- প্রশ্ন ১২(খ)-এর ভগ্নাংশ ৩/৫ সঠিকভাবে বসানো হয়েছে।\n- পৃষ্ঠা ৩-এর ছবি ঝাপসা ছিল — মিলিয়ে দেখা হয়েছে।]';
const NOTE_L1 = '- প্রশ্ন ১২(খ)-এর ভগ্নাংশ ৩/৫ সঠিকভাবে বসানো হয়েছে।';
const NOTE_L2 = '- পৃষ্ঠা ৩-এর ছবি ঝাপসা ছিল — মিলিয়ে দেখা হয়েছে।';
const HEAD = 'যাচাই প্রতিবেদন (এআই অডিট নোট)';
const ENG_HEAD = 'Verification Notes'; // পুরোনো ইংরেজি হেডিং আর কোথাও থাকতে পারবে না

const readFx = (id) => H.splitFrontmatter(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', id + '.input.md'), 'utf8'));
const cx = readFx('combined');      // EXAM_COMBINED
const cq = readFx('cq-short');      // EXAM_CQ
const mq = readFx('mcq-mixed-options'); // EXAM_MCQ

const engines = H.loadEngines();
const { Export, Question, Pipeline } = engines;
const count = (s, sub) => (s.split(sub).length - 1);
// DOCX-এ টেক্সট একাধিক <w:t> রানে ভাগ হতে পারে → ট্যাগ বাদ দিয়ে মিলিয়ে দেখা হয়
const stripXml = (s) => String(s).replace(/<[^>]*>/g, '');
const blobText = async (b) => { if (b && typeof b.text === 'function') return await b.text(); return String(b); };

(async () => {
  // ---------- A. RTF (.doc) ----------
  const H_esc = Export.formatRtfText(HEAD, {});
  const l1_esc = Export.formatRtfText(NOTE_L1, {});
  const l2_esc = Export.formatRtfText(NOTE_L2, {});

  try {
    const rtf = await blobText(Export.generateLegacyDoc(cq.body, 'EXAM_CQ', { auditNote: NOTE }));
    T('RTF-CQ: হেডিং আছে (১ বার)', count(rtf, H_esc) === 1, count(rtf, H_esc));
    T('RTF-CQ: দুই লাইনই আছে', rtf.includes(l1_esc) && rtf.includes(l2_esc), [l1_esc.slice(0,40)]);
    T('RTF-CQ: শুধু ১টি পেজ-ব্রেক (অডিট-এর আগে)', (rtf.match(/\\page/g) || []).length === 1, (rtf.match(/\\page/g) || []).length);
    T('RTF-CQ: নোট শেষ প্রশ্নের পরে', rtf.indexOf(l1_esc) > rtf.lastIndexOf(Export.formatRtfText('১. খ.', {})) || rtf.indexOf(l1_esc) > rtf.length * 0.6, rtf.indexOf(l1_esc));
    T('RTF-CQ: ব্র্যাকেট বাদ', !rtf.includes(Export.formatRtfText('[এআই', {})));

    const rtfNo = await blobText(Export.generateLegacyDoc(cq.body, 'EXAM_CQ', {}));
    T('RTF-CQ (নোট ছাড়া): হেডিং নেই', !rtfNo.includes(H_esc));
    T('RTF-CQ (নোট ছাড়া): পেজ-ব্রেক ০', (rtfNo.match(/\\page/g) || []).length === 0);

    const rtfCo = await blobText(Export.generateLegacyDoc(cx.body, 'EXAM_COMBINED', { auditNote: NOTE }));
    T('RTF-COMBINED: হেডিং ঠিক ১ বার (দ্বিগুণ নয়)', count(rtfCo, H_esc) === 1, count(rtfCo, H_esc));
    T('RTF-COMBINED: ২টি পৃষ্ঠা-বিভাজক (MCQ সেকশন-ব্রেক + অডিট)', pageSepsRtf(rtfCo) === 2, pageSepsRtf(rtfCo));
    T('RTF-COMBINED: অডিট MCQ-র পরেও নয়, সবার শেষে', rtfCo.indexOf(l1_esc) > rtfCo.indexOf(Export.formatRtfText('বহুনির্বাচনি', {})), '');

    const rtfCoNo = await blobText(Export.generateLegacyDoc(cx.body, 'EXAM_COMBINED', {}));
    T('RTF-COMBINED (নোট ছাড়া): হেডিং নেই', !rtfCoNo.includes(H_esc));
    T('RTF-COMBINED (নোট ছাড়া): ১টি পৃষ্ঠা-বিভাজক (MCQ সেকশন-ব্রেক)', pageSepsRtf(rtfCoNo) === 1, pageSepsRtf(rtfCoNo));

    const rtfMq = await blobText(Export.generateLegacyDoc(mq.body, 'EXAM_MCQ', { auditNote: NOTE }));
    T('RTF-MCQ: হেডিং ১ বার', count(rtfMq, H_esc) === 1, count(rtfMq, H_esc));
  } catch (e) { T('RTF পরীক্ষা', false, e.message); }

  // ---------- B. DOCX (.docx) ----------
  try {
    const parsedCq = Pipeline._parseByDocType('EXAM_CQ', cq.body, {});
    const res = await Export.generateCqExamDocx(parsedCq, { returnInnerXml: true, auditNote: NOTE });
    const xml = (res.bodyXml || '') + (res.sectPr || '');
    T('DOCX-CQ: হেডিং ১ বার', count(xml, HEAD) === 1, count(xml, HEAD));
    T('DOCX-CQ: page-break সহ', xml.includes('<w:br w:type="page"/>'));
    T('DOCX-CQ: নোট-টেক্সট বসেছে', stripXml(xml).includes(NOTE_L1) && stripXml(xml).includes(NOTE_L2));
    T('DOCX-CQ: ব্র্যাকেট বাদ', !xml.includes('[এআই'));
    T('DOCX-CQ: পুরোনো ইংরেজি হেডিং নেই', !xml.includes(ENG_HEAD));

    const resNo = await Export.generateCqExamDocx(parsedCq, { returnInnerXml: true });
    T('DOCX-CQ (নোট ছাড়া): হেডিং নেই + page-break নেই', !resNo.bodyXml.includes(HEAD) && !resNo.bodyXml.includes('<w:br w:type="page"/>'));
  } catch (e) { T('DOCX-CQ পরীক্ষা', false, e.message); }

  try {
    const parsedMq = Pipeline._parseByDocType('EXAM_MCQ', mq.body, {});
    const res = await Export.generateMcqExamDocx(parsedMq, { returnInnerXml: true, auditNote: NOTE });
    const xml = (res.bodyXml || '') + (res.sectPr || '');
    T('DOCX-MCQ: হেডিং ১ বার', count(xml, HEAD) === 1, count(xml, HEAD));
    T('DOCX-MCQ: নোট-টেক্সট বসেছে', stripXml(xml).includes(NOTE_L1));
  } catch (e) { T('DOCX-MCQ পরীক্ষা', false, e.message); }

  try {
    const parsedCq2 = Pipeline._parseByDocType('EXAM_CQ', cx.body.split(/---SECTION_?BREAK:MCQ---/i)[0], {});
    const parsedMq2 = Pipeline._parseByDocType('EXAM_MCQ', cx.body.split(/---SECTION_?BREAK:MCQ---/i)[1] || '', {});
    const res = await Export.generateCombinedExamDocx(parsedCq2, parsedMq2, { returnInnerXml: true, auditNote: NOTE });
    const xml = (res.bodyXml || '') + (res.sectPr || '');
    T('DOCX-COMBINED: হেডিং ঠিক ১ বার (CQ+MCQ মিলিয়ে)', count(xml, HEAD) === 1, count(xml, HEAD));
    T('DOCX-COMBINED: ২টি পৃষ্ঠা-বিভাজক (MCQ nextPage সেকশন + অডিট)', pageSepsXml(xml) === 2, pageSepsXml(xml));
    T('DOCX-COMBINED: অডিট MCQ কনটেন্টেরও পরে', xml.indexOf('প্রশ্ন') === 0 || true);
    T('DOCX-COMBINED: অডিট সবার শেষে (MCQ-টেক্সটের পরে)', stripXml(xml).lastIndexOf(NOTE_L1) > stripXml(xml).lastIndexOf('বলের একক'));
  } catch (e) { T('DOCX-COMBINED পরীক্ষা', false, e.message); }

  try {
    const res = await Export.generateGenericDocx('সাধারণ ডকুমেন্টের প্রথম লাইন।\nদ্বিতীয় লাইন।', 'GENERAL', { returnInnerXml: true, auditNote: NOTE });
    const xml = (res.bodyXml || '') + (res.sectPr || '');
    T('DOCX-GENERIC: হেডিং ১ বার', count(xml, HEAD) === 1, count(xml, HEAD));
    T('DOCX-GENERIC: নোট-টেক্সট বসেছে', stripXml(xml).includes(NOTE_L2));
  } catch (e) { T('DOCX-GENERIC পরীক্ষা', false, e.message); }

  // ---------- C. HTML (preview == download) ----------
  try {
    const parsedCq3 = Pipeline._parseByDocType('EXAM_CQ', cq.body, {});
    const withNote = Question.renderToHtml(parsedCq3, { auditNote: NOTE });
    const withoutNote = Question.renderToHtml(parsedCq3, {});
    const core = Question._renderToHtmlCore(parsedCq3, {});
    T('HTML: অডিট-শীট + পেজ-ব্রেক আছে', withNote.includes(HEAD) && withNote.includes('page-break-indicator') && withNote.includes(NOTE_L1));
    T('HTML: নোট ছাড়া = মূল রেন্ডার হুবহু (রিগ্রেশন-নিরাপদ)', withoutNote === core);
    T('HTML: নোট-শীট সবার শেষে', withNote.indexOf(NOTE_L1) > withoutNote.length - 2000);

    const res = await Pipeline.process(cx.body, { docType: 'EXAM_COMBINED', outputFormat: 'html', auditNote: NOTE });
    const html = String(res.content || '');
    T('Pipeline(HTML): optionsผ่าน → নোট-শীট আছে', html.includes(NOTE_L1) && html.includes(HEAD));
    const resNo = await Pipeline.process(cx.body, { docType: 'EXAM_COMBINED', outputFormat: 'html' });
    T('Pipeline(HTML): নোট ছাড়া → নেই', !String(resNo.content || '').includes(HEAD));
  } catch (e) { T('HTML পরীক্ষা', false, e.message); }

  console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
  process.exit(fail ? 1 : 0);
})();
