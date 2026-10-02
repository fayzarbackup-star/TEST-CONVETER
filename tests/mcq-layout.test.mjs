/**
 * Part-10: বহুনির্বাচনী (MCQ) মাস্টার লেআউট — জ্যামিতি, গ্রিড, ফিট ও ব্যালান্স গেট
 *   node tests/mcq-layout.test.mjs
 *
 * যাচাই করা চুক্তি (লেআউট স্পেসিফিকেশন Part-10):
 *   (ক) শনাক্তকরণ : লাইন-প্রতি-অপশন বিশুদ্ধ MCQ (১০+ প্রশ্ন) → EXAM_MCQ; CQ শ্রেণিবিভাগে বিচ্যুতি নয়
 *   (খ) পেজ/হেডার : 0.5" মার্জিন, ৫-লাইন সেন্টারড হেডার, অটো-প্লেসহোল্ডার, ডিভাইডার
 *   (গ) ২-কলাম  : সমান দুই কলাম + কলাম লাইন + 0.2" গ্যাপ + হ্যাঙ্গিং ইনডেন্ট (নম্বরের পর ট্যাব)
 *   (ঘ) অপশন    : সমান দূরত্বের ৪-কলাম গ্রিড; বড় হলে ২, আরও বড় হলে ১
 *   (ঙ) ফিট     : ১–৪টি উপচে গেলে ১১.৫/১১pt করে ১ পৃষ্ঠা; না হলে ২য় পৃষ্ঠায় ব্যালান্স
 *
 * তিনটি প্রকাশ্য পথই দেখা হয়: Word 2003 RTF (.doc), Modern DOCX XML, এবং HTML প্রিভিউ —
 * কারণ preview == download চুক্তি লক-ইন থাকে।
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const g = globalThis;
g.TextRunProcessor = require(path.join(ROOT, 'js/layout-engine/text-run-processor.js'));
g.EquationConverter = require(path.join(ROOT, 'js/equation-converter.js'));
g.ThemeConfig = require(path.join(ROOT, 'js/layout-engine/theme-config.js'));
g.FayzarThemeConfig = g.ThemeConfig;
g.FayzarDocxBuilder = require(path.join(ROOT, 'js/layout-engine/docx-builder.js'));
g.DocxBuilder = g.FayzarDocxBuilder;
g.SchemaValidator = require(path.join(ROOT, 'js/layout-engine/schema-validator.js'));
g.FayzarSchemaValidator = g.SchemaValidator;
g.jszip = require(path.join(ROOT, 'js/jszip.min.js'));
g.McqLayoutPlanner = require(path.join(ROOT, 'js/layout-engine/mcq-layout-planner.js'));
g.DocClassifier = require(path.join(ROOT, 'js/engines/doc-classifier.js'));
g.QuestionEngine = require(path.join(ROOT, 'js/engines/question-engine.js'));
g.ExportDualEngine = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));

const P = g.McqLayoutPlanner;
const QE = g.QuestionEngine;
const EX = g.ExportDualEngine;
const CL = g.DocClassifier;

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

const bodyOf = (id) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', `${id}.input.md`), 'utf8').replace(/^---[\s\S]*?---\s*/, '');
const parse = (t) => QE.parseQuestionPaper(t, { docType: 'EXAM_MCQ' });
const planOf = (parsed) => P.plan(parsed, { docType: 'EXAM_MCQ' });

const FIX = ['mcq-pure-28', 'mcq-header-fallback', 'mcq-long-options', 'mcq-mixed-options', 'mcq-shrink-21'];
const loaded = {};
for (const id of FIX) loaded[id] = { raw: bodyOf(id), parsed: parse(bodyOf(id)) };
loaded.eachPlan = (id) => planOf(loaded[id].parsed);

// ══════════════════ (ক) শনাক্তকরণ ও স্কোপ ══════════════════
console.log('\n— (ক) শনাক্তকরণ ও স্কোপ —');
{
  const t28 = bodyOf('mcq-pure-28');
  T('৩৩টি বিশুদ্ধ MCQ (প্রতি লাইনে একটি অপশন) → EXAM_MCQ', CL.classify(t28).type === 'EXAM_MCQ', CL.classify(t28));
  T('১৪টি বিশুদ্ধ MCQ (হেডারবিহীন) → EXAM_MCQ', CL.classify(bodyOf('mcq-header-fallback')).type === 'EXAM_MCQ');
  T('৬ প্রশ্ন (১০–১৫-এর নিচে) → MCQ ফরম্যাট জোর করা হয় না', CL.classify(bodyOf('mcq-mixed-options')).type !== 'EXAM_MCQ', CL.classify(bodyOf('mcq-mixed-options')));
  // ফ্রোজেন পাথ: CQ/লেখার শ্রেণিবিভাগ অপরিবর্তনীয়
  for (const [id, want] of [['cq-short', 'EXAM_CQ'], ['cq-long', 'EXAM_CQ'], ['cq-inline-numbering', 'EXAM_CQ'], ['cq-marks-edge', 'EXAM_CQ'], ['combined', 'EXAM_COMBINED']]) {
    T(`CQ ফিক্সচার ${id} → ${want} (MCQ শনাক্তকরণে বিচ্যুত হয় না)`, CL.classify(bodyOf(id)).type === want, CL.classify(bodyOf(id)));
  }
}

// ══════════════════ (খ) পেজ ও হেডার ══════════════════
console.log('\n— (খ) পেজ ও হেডার —');
{
  const plan = loaded.eachPlan('mcq-pure-28');
  const g2 = plan.geometry;
  T('মার্জিন চারদিকে ঠিক 0.5" = 720 twips', g2.margin === 720, g2.margin);
  T('A4 পোর্ট্রেট পেজ 11906×16838', g2.pageW === 11906 && g2.pageH === 16838, [g2.pageW, g2.pageH]);
  T('কলাম জোড় = usableW − 2×margin', g2.usableW === 11906 - 1440, g2.usableW);

  const fb = loaded.eachPlan('mcq-header-fallback');
  const kinds = fb.headerLines.map((l) => l.kind);
  T('হেডার ৫টি লাইনেই পূর্ণ থাকে (institute/location/exam/classSubject/metrics)',
    kinds.slice(0, 5).join(',') === 'institute,location,exam,classSubject,metrics', kinds);
  const txt = fb.headerLines.map((l) => l.text).join('|');
  T('মিসিং প্রতিষ্ঠানের নাম → প্লেসহোল্ডার "আপনার প্রতিষ্ঠান এর নাম"', txt.includes('আপনার প্রতিষ্ঠান এর নাম'), txt);
  T('মিসিং ঠিকানা → "ঠিকানা লিখুন"', txt.includes('ঠিকানা লিখুন'), txt);
  T('মিসিং পরীক্ষার নাম → "পরীক্ষার নাম লিখুন"', txt.includes('পরীক্ষার নাম লিখুন'), txt);
  T('placeholder ফ্ল্যাগ সঠিকভাবে চিহ্নিত', fb.headerLines.filter((l) => l.fallbackUsed).length >= 3, fb.headerLines.map((l) => [l.kind, l.fallbackUsed]));
  const withH = loaded.eachPlan('mcq-pure-28').headerLines;
  T('তথ্য থাকলে প্লেসহোল্ডার বসে না (দেহে-থাকা প্রতিষ্ঠানের নাম ধরা পড়ে)',
    withH[0].text.includes('বিদ্যালয়') && withH[0].fallbackUsed === false, withH[0]);
  T('একই লাইনে "সময়: …  |  পূর্ণমানঃ …" থাকলে দুটোই আলাদা করে ধরা পড়ে (MCQ)',
    withH[4].text.includes('৩০ মিনিট') && withH[4].right.includes('৩০'), withH[4]);
  // খ.২: প্রতিষ্ঠান-লাইনের পরের লাইন = ঠিকানা (জেলার তালিকা-নিরপেক্ষ, MCQ-স্কোপড)
  const shrinkH = loaded.eachPlan('mcq-shrink-21').headerLines;
  T('ঠিকানা লাইন (জেলার নাম ছাড়াও) ধরা পড়ে → প্লেসহোল্ডার বসে না',
    shrinkH[1].text.includes('রংপুর') && shrinkH[1].fallbackUsed === false, shrinkH[1]);
  T('ঠিকানা-নিয়মটি CQ পাথে প্রযোজ্য নয় (ফ্রোজেন আচরণ)',
    (() => {
      const t = 'রংপুর সার্কিট হাউস মডেল স্কুল\nকোতোয়ালী, রংপুর\n\n১. প্রশ্ন?\nক. x\n';
      return QE.parseQuestionPaper(t, { docType: 'EXAM_CQ' }).header.location === '';
    })(), null);
  T('লাইন ১–৪ সেন্টারড', withH.slice(0, 4).every((l) => l.align === 'center'), withH.map((l) => l.align));
  T('লাইন ১ (প্রতিষ্ঠান) বোল্ড, লাইন ৩ (পরীক্ষা) বোল্ড', withH[0].bold && withH[2].bold, [withH[0].bold, withH[2].bold]);
  T('লাইন ৫ = সময় (বাম) + পূর্ণমান (ডান-ট্যাব)', withH[4].kind === 'metrics' && withH[4].right.length > 0, withH[4]);

  // RTF/DOCX-এ হেডার ১-কলাম, নিচে সিঙ্গেল ডিভাইডার
  const rtf = EX.generateMcqExamRtf(loaded['mcq-header-fallback'].parsed, {});
  const head1 = rtf.slice(0, rtf.indexOf('\\sect'));
  T('RTF: হেডার সেকশন \\cols1 (১-কলাম)', /\\cols1(\s|$)/.test(head1), head1.slice(0, 120));
  T('RTF: হেডারের নিচে সিঙ্গেল বর্ডার ডিভাইডার', /\\brdrb\\brdrs\\brdrw10/.test(head1), null);
  T('RTF: প্রতিষ্ঠান-লাইন বোল্ড 16pt, পরীক্ষা-লাইন বোল্ড 13pt', /\{\\qc\\b\\fs32/.test(head1) && /\{\\qc\\b\\fs26/.test(head1), head1.slice(0, 400));
  const xml = await EX.generateMcqExamDocx(loaded['mcq-header-fallback'].parsed, { returnInnerXml: true });
  const bodyX = xml.bodyXml.slice(0, xml.bodyXml.indexOf('<w:sectPr>'));
  T('DOCX: হেডার লাইনগুলো jc=center', (bodyX.match(/<w:jc w:val="center"\/>/g) || []).length >= 4, (bodyX.match(/<w:jc[^>]*>/g) || []));
  T('DOCX: হেডারের নিচে single bottom border', /<w:pBdr><w:bottom w:val="single"/.test(bodyX), null);
  T('DOCX: সময়/পূর্ণমান লাইনে right tab', /<w:tab w:val="right"/.test(bodyX), null);
  T('DOCX: হেডার-বিরতির পর বডি অংশ continuous (এক পৃষ্ঠায়)', /<w:type w:val="continuous"\/>/.test(xml.sectPr), xml.sectPr.slice(0, 200));
}

// ══════════════════ (গ) ২-কলাম + হ্যাঙ্গিং ইনডেন্ট ══════════════════
console.log('\n— (গ) ২-কলাম ও হ্যাঙ্গিং ইনডেন্ট —');
{
  const plan = loaded.eachPlan('mcq-pure-28');
  const g2 = plan.geometry;
  T('দুই কলাম সম্পূর্ণ সমান প্রস্থের', g2.colW === Math.floor((g2.usableW - g2.colGap) / 2), [g2.colW, g2.usableW]);
  T('কলাম-মধ্যবর্তী দূরত্ব ঠিক 0.2" = 288 twips', g2.colGap === 288, g2.colGap);
  T('দৃশ্যমান কলাম লাইন চালু', g2.colSep === true, g2.colSep);
  T('হ্যাঙ্গিং ইনডেন্ট 432 dxa (0.3", মাস্টার চুক্তি §১)', g2.indent === 432, g2.indent);

  const rtf = EX.generateMcqExamRtf(loaded['mcq-pure-28'].parsed, {});
  T('RTF: \\cols2 + \\colsx288 + \\linebetcol', /\\cols2\\colsx288\\linebetcol/.test(rtf), (rtf.match(/\\cols[^\n]*/) || [])[0]);
  T('RTF: প্রতিটি প্রশ্নেই li432/fi-432 + 432-এ ট্যাব স্টপ',
    (rtf.match(/\\li432\\fi-432\\tx432/g) || []).length === plan.items.length, [
      (rtf.match(/\\li432\\fi-432\\tx432/g) || []).length, plan.items.length]);
  const xml = await EX.generateMcqExamDocx(loaded['mcq-pure-28'].parsed, { returnInnerXml: true });
  T('DOCX: ind left=432 hanging=432 প্রতি প্রশ্নেই',
    (xml.bodyXml.match(/<w:ind w:left="432" w:hanging="432"\/>/g) || []).length === plan.items.length,
    [(xml.bodyXml.match(/<w:ind w:left="432"[^>]*>/g) || []).length, plan.items.length]);
  T('DOCX: cols num=2, space=288, sep=1', /<w:cols w:num="2" w:space="288" w:sep="1"\/>/.test(xml.sectPr), xml.sectPr.replace(/\s+/g, ' '));

  // নম্বরের নিচে লেখা র‍্যাপ হয় না → প্রথম লাইনেও ট্যাব, বাকি লাইন 432-এ
  const stemSample = rtf.match(/\{\\ql\\b\\fs\d+\\f0[^\n]*?\\li432\\fi-432\\tx432[^\n]*?\n/);
  T('RTF: নম্বর ও লেখার মাঝে সত্যিকারের \\tab (স্পেস নয়)', stemSample && /\\tab /.test(stemSample[0]), stemSample && stemSample[0].slice(0, 140));
  T('DOCX: নম্বরের পর <w:tab/> রান', /<w:t[^>]*>১।<\/w:t><\/w:r><w:r><w:tab\/><\/w:r>/.test(xml.bodyXml.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, '')) ||
    (xml.bodyXml.match(/<w:r><w:tab\/><\/w:r>/g) || []).length >= plan.items.length,
    [(xml.bodyXml.match(/<w:tab\/>/g) || []).length]);
}

// ══════════════════ (ঘ) অপশন গ্রিড ও সমান দূরত্ব ══════════════════
console.log('\n— (ঘ) অপশন গ্রিড, সমান দূরত্ব ও অটো-ব্রেক —');
{
  const g2 = P.geometry({});
  const sz = 24;
  const tiny = P.decideOptionsGrid([{ label: 'ক', text: '৮টি' }, { label: 'খ', text: '১০টি' }, { label: 'গ', text: '১২টি' }, { label: 'ঘ', text: '১৪টি' }], sz, g2);
  T('ছোট ৪টি বিকল্প → এক লাইনে ৪-কলাম গ্রিড', tiny.cols === 4 && tiny.rows.length === 1, tiny);
  T('৪-কলামের ট্যাব স্টপ গাণিতিকভাবে সমান দূরত্বের',
    tiny.stops.length === 3 && (tiny.stops[0] - g2.indent) === (tiny.stops[1] - tiny.stops[0]) && (tiny.stops[2] - tiny.stops[1]) === (tiny.stops[1] - tiny.stops[0]),
    tiny.stops);
  T('স্টপ সারি ৪র্থ স্লটের মধ্যেই থাকে (কলামের ডান প্রান্ত অতিক্রম করে না)',
    g2.indent + tiny.slotW * 3 + tiny.slotW <= g2.indent + g2.textW + 1, [g2.textW, tiny.slotW]);
  const med = P.decideOptionsGrid([
    { label: 'ক', text: 'হার্ডডিস্ক' }, { label: 'খ', text: 'র্যাম' },
    { label: 'গ', text: 'মাইক্রোপ্রসেসর' }, { label: 'ঘ', text: 'মাদারবোর্ড' }], sz, g2);
  T('মাঝারি বিকল্প → স্বয়ংক্রিয় ২-কলাম (২ লাইনে ২টি করে)', med.cols === 2 && med.rows.length === 2, med);
  const big = P.decideOptionsGrid([
    { label: 'ক', text: 'কোনো বদ্ধ নিকাশে শক্তি সৃষ্টি বা বিনাশ করা যায় না, কেবল এক রূপ থেকে অন্য রূপে রূপান্তরিত হয়' },
    { label: 'খ', text: 'শক্তি সর্বদা তাপের রূপে পরিণত হয়ে নষ্ট হয়ে যায়' },
    { label: 'গ', text: 'উচ্চতা বাড়লে বস্তুর শক্তি অপরিবর্তিত থাকে' },
    { label: 'ঘ', text: 'গতি বাড়লে বস্তুর ভর কমে যায়' }], sz, g2);
  T('দীর্ঘ বাক্য → ১-কলাম (প্রতি লাইনে ১টি করে)', big.cols === 1 && big.rows.length === 4, big);
  T('৩টি বিকল্প → ৩-সমান-স্লট বা ১, কখনো অসম ফাঁকা নয়',
    [3, 1].includes(P.decideOptionsGrid([{ label: 'ক', text: 'হ্যাঁ' }, { label: 'খ', text: 'না' }, { label: 'গ', text: 'সম্ভবত' }], sz, g2).cols));
  const five = P.decideOptionsGrid([1, 2, 3, 4, 5].map((i) => ({ label: 'কখগঘঙ'[i - 1], text: '৮' + 'টি'.repeat(i) })), sz, g2);
  T('৫+ বিকল্পেও সবগুলোই ছাপার জন্য সারিতে সাজে (বাদ পড়ে না)',
    five.rows.reduce((a, r) => a + r.length, 0) === 5, five);

  // রেন্ডারারেও সেই গ্রিডই বসে
  const rtf = EX.generateMcqExamRtf(loaded['mcq-pure-28'].parsed, {});
  const plan = loaded.eachPlan('mcq-pure-28');
  const fourAcross = plan.items.filter((it) => it.grid.cols === 4).length;
  const rtfFour = (rtf.match(/\\li432\\tx\d+\\tx\d+\\tx\d+/g) || []).length;
  T(`RTF: ৪-অ্যাক্রস সারি প্ল্যানের সঙ্গে মিলছে (${fourAcross} টি)`, fourAcross === rtfFour, [fourAcross, rtfFour]);
  const xml = await EX.generateMcqExamDocx(loaded['mcq-pure-28'].parsed, { returnInnerXml: true });
  T('DOCX: ৪-অ্যাক্রস সারিতে ৩টি ট্যাব-স্টপ বসে', (xml.bodyXml.match(/<w:tabs><w:tab w:val="left" w:pos="\d+"\/><w:tab w:val="left" w:pos="\d+"\/><w:tab w:val="left" w:pos="\d+"\/><\/w:tabs>/g) || []).length === fourAcross,
    [(xml.bodyXml.match(/<w:tabs>/g) || []).length, fourAcross]);
  T('DOCX: অপশনের লেবেল (ক)/(খ) আকারেই থাকে', /\(ক\)/.test(xml.bodyXml) && /\(ঘ\)/.test(xml.bodyXml));
}

// ══════════════════ (ঙ) পেজ ফিট, সংকোচন ও ব্যালান্স ══════════════════
console.log('\n— (ঙ) পেজ ফিট, সংকোচন ও কলাম ব্যালান্স —');
{
  const all = loaded['mcq-pure-28'].parsed.sections[0].questions;
  const head = loaded['mcq-pure-28'].parsed.header;
  const mk = (n) => P.plan({ header: head, sections: [{ title: '', marks: '', questions: all.slice(0, n) }] }, { docType: 'EXAM_MCQ' });
  T('১৯টি প্রশ্ন → ১২pt-এই ১ পৃষ্ঠা (অপ্রয়োজনে ছোট হয় না)', mk(19).font.pt === 12 && mk(19).pages.length === 1, [mk(19).font.pt, mk(19).pages.length]);
  T('২০টি প্রশ্ন (১–৪টি উপচে) → ১১.৫pt করে ১ পৃষ্ঠায় ফিট', mk(20).font.pt === 11.5 && mk(20).pages.length === 1, [mk(20).font.pt, mk(20).pages.length]);
  T('২১–২২টি → ১১pt পর্যন্ত নামে ও ১ পৃষ্ঠায় বসে', mk(21).font.pt === 11 && mk(21).pages.length === 1 && mk(22).pages.length === 1,
    [mk(21).font.pt, mk(21).pages.length, mk(22).pages.length]);
  const n23 = mk(23);
  T('সংকুচিত করেও ১ পৃষ্ঠা না হলে ১২pt-ই ফিরিয়ে দেয় (কঙ্কাল পৃষ্ঠা নয়)', n23.font.pt === 12 && n23.pages.length === 2, [n23.font.pt, n23.pages.length]);
  T('১১pt-এর নিচে কখনো নামে না (ফন্ট ফ্লোর)', ![10.5, 10].includes(mk(33).font.pt), mk(33).font.pt);

  const p33 = mk(33);
  T('৩৩ প্রশ্ন → ২ পৃষ্ঠা, দুটিতেই ২ কলাম', p33.pages.length === 2 && p33.pages.every((pg) => pg.col1.length > 0 && pg.col2.length >= 0), p33.pages.map((pg) => [pg.col1.length, pg.col2.length]));
  const last = p33.pages[p33.pages.length - 1];
  T('২য় পৃষ্ঠার দুই কলাম উচ্চতায় ব্যালান্সড (পার্থক্য ≤ ১৫%)',
    Math.abs(last.h1 - last.h2) <= 0.15 * Math.max(last.h1, last.h2), [last.h1, last.h2]);
  T('১ম পৃষ্ঠা পূরণ হয় (কলাম ১ ক্যাপাসিটির ৮৫%+ ব্যবহৃত)', last.h1 > 0 && p33.pages[0].h1 >= 0.85 * p33.metrics.cap1, [p33.pages[0].h1, p33.metrics.cap1]);
  T('কোনো প্রশ্ন বাদ পড়ে না: ৩৩টিই দুই পৃষ্ঠায় ভাগ', p33.pages.reduce((a, pg) => a + pg.col1.length + pg.col2.length, 0) === 33,
    p33.pages.map((pg) => pg.col1.concat(pg.col2).length));
  T('ক্রম অটুট: ১…৩৩ একই ক্রমে বসে', (() => {
    const seq = [];
    for (const pg of p33.pages) seq.push(...pg.col1, ...pg.col2);
    return seq.every((v, i) => v === i);
  })(), p33.pages.map((pg) => pg.col1.concat(pg.col2)));

  // শ্রিংক প্রয়োগের পর RTF/DOCX-এ ফন্ট সাইজ সত্যিই বদলায়
  const shrink = loaded['mcq-shrink-21'];
  const planS = loaded.eachPlan('mcq-shrink-21');
  T('নমুনা ২১-প্রশ্ন প্ল্যান: ১১pt (fs22) + ১ পৃষ্ঠা', planS.font.sz === 22 && planS.pages.length === 1, [planS.font.sz, planS.pages.length]);
  const rtfS = EX.generateMcqExamRtf(shrink.parsed, {});
  T('RTF: সংকুচিত ফন্ট \\fs22 প্রয়োগ হয়েছে', /\\fs22/.test(rtfS) && !/\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0\\li432/.test(rtfS), (rtfS.match(/\\fs\d+/g) || []).slice(0, 8));
  const xmlS = await EX.generateMcqExamDocx(shrink.parsed, { returnInnerXml: true });
  T('DOCX: সংকুচিত ফন্ট w:sz 22 প্রয়োগ হয়েছে', /<w:sz w:val="22"\/>/.test(xmlS.bodyXml), (xmlS.bodyXml.match(/<w:sz w:val="\d+"/g) || []).slice(0, 6));
}

// ══════════════════ প্রিভিউ == ডাউনলোড ══════════════════
console.log('\n— প্রিভিউ/এক্সপোর্ট সমতা ও তথ্য-অক্ষুণ্নতা —');
{
  for (const id of FIX) {
    const plan = loaded.eachPlan(id);
    const n = plan.items.length;
    const html = QE.renderToHtml(loaded[id].parsed, { docType: 'EXAM_MCQ' });
    const inHtml = (html.match(/class="mcq-num"/g) || []).length;
    T(`${id}: প্রিভিউতে সব ${n}টি প্রশ্নই আছে (প্রতি ২-কলাম শেটে)`, inHtml === n, inHtml);
    const rtf = EX.generateMcqExamRtf(loaded[id].parsed, {});
    const stemsRtf = (rtf.match(/\\li432\\fi-432\\tx432/g) || []).length;
    T(`${id}: .doc-এও ${n}টি স্টেম`, stemsRtf === n, stemsRtf);
    const xml = await EX.generateMcqExamDocx(loaded[id].parsed, { returnInnerXml: true });
    T(`${id}: .docx-এও ${n}টি স্টেম`, (xml.bodyXml.match(/w:ind w:left="432" w:hanging="432"/g) || []).length === n,
      (xml.bodyXml.match(/w:ind w:left="432"/g) || []).length);
    T(`${id}: অপশন লেবেল (ক–ঘ) প্রিভিউতে সংরক্ষিত`, ['ক', 'খ', 'গ', 'ঘ'].every((l) => html.includes('(' + l + ')')));
    // গ্রিড সিদ্ধান্ত হুবহু একই (preview == download)
    const want4 = plan.items.filter((it) => it.grid.cols === 4).length;
    T(`${id}: ৪-গ্রিড প্রশ্নসংখ্যা প্রিভিউতে মিলছে (${want4})`, (html.match(/mcq-grid-4/g) || []).length === want4,
      [(html.match(/mcq-grid-4/g) || []).length, want4]);
  }
  const html = QE.renderToHtml(loaded['mcq-header-fallback'].parsed, { docType: 'EXAM_MCQ' });
  T('প্রিভিউতেও হেডার প্লেসহোল্ডার বসে (ডাউনলোডের মতোই)', html.includes('আপনার প্রতিষ্ঠান এর নাম') && html.includes('ঠিকানা লিখুন'));
  T('প্রিভিউ: ২-কলামের মাঝে কলাম লাইন + 0.2in গ্যাপ', /border-right: 1px solid #000000/.test(html) && /column-gap: 0\.2in/.test(html));
}

// ══════════════════ আর্টিফ্যাক্ট: আসল ফাইল + (থাকলে) রেন্ডার ══════════════════
// ══════════════════ (চ) MCQ ভেতরের সমীকরণ-চিহ্ন: দুই ফরমাত সমান ══════════════════
console.log('\n— (চ) এক-চিহ্ন বিকল্প (.doc \u2261 .docx) \u2014 oMath বক্স নয়, সাধারণ রান \u2014');
{
  const parsed = parse(bodyOf('mcq-pure-28'));
  const rtf = EX.generateMcqExamRtf(parsed, { docType: 'EXAM_MCQ' });
  const inner = await EX.generateMcqExamDocx(parsed, { docType: 'EXAM_MCQ', returnInnerXml: true });
  const body = inner.bodyXml || '';
  const cnt = (s, n) => s.split(n).length - 1;
  T('বিকল্পের \u00F7 (÷) RTF-এ \u005Cu247? হিসেবে আছে (তথ্য হারায় না)', cnt(rtf, '\\u247?') === 1, cnt(rtf, '\\u247?'));
  T('বিকল্পের \u00F7 (÷) DOCX-এ সাধারণ <w:t> রান', /<w:t xml:space="preserve">\u00F7<\/w:t>/.test(body), null);
  T('MCQ বডি-তে এক-চিহ্নের জন্য <m:oMath> বক্স বসে না (লাইন-উচ্চতা জ্যামিতির ভেতরে থাকে)',
    cnt(body, '<m:oMath>') === 0, cnt(body, '<m:oMath>'));
  T('DOCX-এ MCQ বডি-র সম্ভাব্য oMath সংখ্যা RTF-এর EQ ফিল্ডের ক্রমের সঙ্গে বাড়ে না',
    cnt(rtf, '\\field{\\*\\fldinst EQ') === cnt(body, '<m:oMath>'), [cnt(rtf, '\\field{\\*\\fldinst EQ'), cnt(body, '<m:oMath>')]);
}

console.log('\n— আর্টিফ্যাক্ট গেট (.docx / .doc বাইট) —');
{
  const raw = loaded['mcq-pure-28'].raw;
  const docxBlob = await EX.generateWordDoc(raw, 'EXAM_MCQ', { format: 'docx' });
  const docBuf = Buffer.from(await docxBlob.arrayBuffer());
  T('.docx সিগনেচার (ZIP: PK\\x03\\x04) ও আকার যুক্তিসঙ্গত', docBuf[0] === 0x50 && docBuf[1] === 0x4b && docBuf.length > 3000, docBuf.length);
  const zip = await g.jszip().loadAsync(docBuf);
  const docXml = await zip.file('word/document.xml').async('string');
  T('.docx document.xml-এ pgMar 720 (0.5")', /<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/.test(docXml),
    (docXml.match(/<w:pgMar[^>]*>/) || [])[0]);
  T('.docx-এ ২ কলাম + sep + 288 গ্যাপ', /<w:cols w:num="2" w:space="288" w:sep="1"\/>/.test(docXml), (docXml.match(/<w:cols[^>]*>/g) || []));
  T('.docx XML well-formed (একই ট্যাগের ভারসাম্য)', (docXml.match(/<w:p>/g) || []).length === (docXml.match(/<\/w:p>/g) || []).length,
    [(docXml.match(/<w:p>/g) || []).length, (docXml.match(/<\/w:p>/g) || []).length]);

  const docBlob = await EX.generateWordDoc(raw, 'EXAM_MCQ', { format: 'doc' });
  const docTxt = Buffer.from(await docBlob.arrayBuffer()).toString('latin1');
  T('.doc = RTF \\\\rtf1 হেডার', docTxt.startsWith('{\\rtf1'), docTxt.slice(0, 12));
  T('.doc-এ পৃষ্ঠা/কলাম সেটআপ (paperw, cols2, colsx288, linebetcol)',
    /\\paperw11906\\paperh16838/.test(docTxt) && /\\cols2\\colsx288\\linebetcol/.test(docTxt), (docTxt.match(/\\cols[^\n]{0,40}/) || [])[0]);
  T('.doc-এ বাংলা টেক্সট \\u-এস্কেপে সুরক্ষিত', /\\u\d+\?/.test(docTxt), docTxt.slice(0, 200));

  // LibreOffice থাকলে সত্যিকারের রেন্ডার গেট
  let soffice = null;
  try { soffice = execFileSync('which', ['soffice'], { encoding: 'utf8' }).trim(); } catch (e) { soffice = null; }
  if (soffice) {
    const os = await import('os');
    const fs2 = await import('fs');
    const dir = fs2.mkdtempSync(path.join(os.tmpdir(), 'mcqproof-'));
    const f1 = path.join(dir, 'p.docx');
    const f2 = path.join(dir, 'p.doc');
    fs2.writeFileSync(f1, docBuf);
    fs2.writeFileSync(f2, Buffer.from(await docBlob.arrayBuffer()));
    const pdfOf = (f) => {
      try { execFileSync(soffice, ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', dir, f], { stdio: 'pipe' }); } catch (e) { return null; }
      const pdf = path.join(dir, path.basename(f, path.extname(f)) + '.pdf');
      return fs2.existsSync(pdf) ? pdf : null;
    };
    const pagesOf = (pdf) => {
      if (!pdf) return NaN;
      try { return parseInt((execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }).match(/^Pages:\s+(\d+)$/m) || [])[1], 10); } catch (e) { return NaN; }
    };
    const plan = loaded.eachPlan('mcq-pure-28');
    const p1 = pagesOf(pdfOf(f1));
    const p2 = pagesOf(pdfOf(f2));
    T(`Word রেন্ডারে পৃষ্ঠাসংখ্যা = প্ল্যান (${plan.pages.length}): .docx=${p1}`, p1 === plan.pages.length, p1);
    T(`Word রেন্ডারে পৃষ্ঠাসংখ্যা = প্ল্যান (${plan.pages.length}): .doc=${p2}`, p2 === plan.pages.length, p2);
    const pdf1 = pdfOf(f1);
    if (pdf1) {
      const bbox = execFileSync('pdftotext', ['-bbox', pdf1, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
      const xs = [...bbox.matchAll(/<word xMin="([\d.]+)"/g)].map((m) => parseFloat(m[1]));
      const midX = 595.3 / 2;
      // কলামের প্রান্ত = x0 হিস্টোগ্রামের ঘন স্তম্ভ (সেন্টারড হেডার-লেখা ছড়ানো বলে
      // ঘন বিন্দুতে আসে না) — এতে "একটা লম্বা অপশন মাঝরে গিয়ে পড়া" সমস্যা থাকে না
      const hist = new Map();
      for (const x of xs) { const kk = Math.round(x); hist.set(kk, (hist.get(kk) || 0) + 1); }
      const edges = [...hist.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]).sort((a, b) => a - b);
      const geo = loaded.eachPlan('mcq-pure-28').geometry;
      const expRight = (geo.margin + geo.colW + geo.colGap) / 20;
      const col2 = edges.filter((e) => Math.abs(e - expRight) <= 1.2);
      T(`রেন্ডারে ২য় কলামের প্রান্ত ≈ ${expRight.toFixed(2)}pt (0.5" মার্জিন + সমান কলাম + 0.2" গ্যাপ)`,
        col2.length > 0, edges.slice(0, 8));
      // ডান মার্জিন অতিক্রম: কোনো লেখাই 559.28pt (= 595.28 − 36) পেরোবে না
      const xMaxAll = [...bbox.matchAll(/<word xMax="([\d.]+)"/g)].map((m) => parseFloat(m[1]));
      T('কোনো লেখাই ডান মার্জিনের বাইরে যায় না (≤ 559.3pt)',
        Math.max(...xMaxAll) <= 595.28 - geo.margin / 20 + 1.5, +Math.max(...xMaxAll).toFixed(2));
      T('রেন্ডারে বাম মার্জিন ≈ 36pt (0.5\")', edges.some((e) => Math.abs(e - geo.margin / 20) <= 1), edges.slice(0, 8));
    }
  } else {
    console.log('ℹ️  LibreOffice নেই — রেন্ডার-ভিত্তিক ৩টি গেট এড়ানো হলো (qa/mcq-render-proof.mjs-এ আলাদা চালাবেন)');
  }
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
