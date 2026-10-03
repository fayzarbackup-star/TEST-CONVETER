/**
 * Part-12 — হার্ডেনিং স্যুট (ট্রায়াজ ১–৫ + অডিট-রিপোর্টের যাচাই-করা বাগ)
 *   node tests/part12-hardening.test.mjs
 *
 * ঢাকে:
 *   (অ) layout-units: একক→টুইপ রূপান্তরের একমাত্র উৎস, কখনোই NaN/Infinity দেয় না
 *   (আ) উভয় প্ল্যানার: UI-নাম ('normal'/'narrow'/…), ইঞ্চি, raw-twips — মডিউল ও
 *       inline-fallback দুইভাবেই হুবহু একই জ্যামিতি (কোনো NaN জ্যামিতিতে ঢোকে না)
 *   (ই) এক্সপোর্ট: .doc (RTF) ও .docx — NaN-মুক্ত, লাইন-বক্স = \fs × lineFactor,
 *       \sb/\sa ≤ ১৮০, ম্যাথ-সীমান্তে ডাবল-স্পেস নেই
 *   (ঈ) মার্ক: উৎসে না থাকলে কিছুই বানানো হয় না; থাকলে [৩]/(মান: ৩)/৩ নম্বর সব রূপ ধরা পড়ে
 *   (উ) গ্রুপিং: `১. নিচের উদ্দীপক…` ও `[উদ্দীপক N]` → সাব-প্রশ্নসহ সঠিক সংযুক্তি
 *   (ঊ) প্রিভিউ ⇄ ডাউনলোড: line-height প্ল্যান থেকে আসে
 *   (ঋ) OCR প্রম্পট: প্রশ্ন-মাত্র (উত্তর/সমাধান নয়) + নম্বর-সংরক্ষণের সুযোগ-সীমাবদ্ধতা
 */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const H = createRequire(import.meta.url)('./lib/harness.js');

let pass = 0, fail = 0;
const T = (name, cond, extra) => {
  if (cond) { pass++; console.log('✅ ' + name); }
  else { fail++; console.log('❌ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};
const B = String.fromCharCode(92);
const fin = (n) => Number.isFinite(Number(n));

if (!globalThis.jszip) globalThis.jszip = createRequire(import.meta.url)(path.join(ROOT, 'js', 'jszip.min.js'));   // DOCX প্যাকেজিং

const engines = H.loadEngines();
const { Question: QE, Export: EX } = engines;
const g = globalThis;
const U = g.FayzarLayoutUnits;
const CQP = g.CqBookletPlanner, MQP = g.McqLayoutPlanner;

console.log('\n— (অ) layout-units: এককের একমাত্র উৎস —');
T('মডিউলটি লোড হয়েছে (index.html-এ প্ল্যানারের আগে ট্যাগ)', U && typeof U.toTwips === 'function' && typeof U.margin === 'function');
T('ইঞ্চি → টুইপ', U.toTwips(0.5, 720) === 720 && U.toTwips(0.6, 720) === 864 && U.toTwips(1, 720) === 1440, [U.toTwips(0.5), U.toTwips(0.6)]);
T('স্ট্রিং একক: "0.6" / 1in / 12pt / 2.54cm / 720tw',
  U.toTwips('0.6', 720) === 864 && U.toTwips('1in', 720) === 1440 && U.toTwips('12pt', 720) === 240 &&
  Math.abs(U.toTwips('2.54cm', 720) - 1440) <= 2 && U.toTwips('720tw', 720) === 720,
  [U.toTwips('0.6'), U.toTwips('1in'), U.toTwips('12pt'), U.toTwips('2.54cm'), U.toTwips('720tw')]);
T('বড় সংখ্যা = raw টুইপ বলে স্বীকৃত (৭০৫০ → ৭০৫০)', U.toTwips(7050, 720) === 7050, U.toTwips(7050, 720));
T('UI-নাম → Word মার্জিন (none/narrow/normal/moderate/wide)',
  U.margin('none') === 0 && U.margin('narrow') === 576 && U.margin('normal') === 720 &&
  U.margin('moderate') === 1080 && U.margin('wide') === 1440);
T('UI-নাম → কলাম-গ্যাপ (booklet = ১০০৮)', U.gap('booklet') === 1008 && U.gap('wide') === 576 && U.gap('normal') === 288);
T('গ্যাপে মার্জিন-নাম দিলেও ভাঙে না', fin(U.gap('narrow', 288)) && U.gap('narrow', 288) > 0, U.gap('narrow', 288));
T('ইনডেন্ট: 0.3" → ৪৩২, raw ৮৬৪ → ৮৬৪', U.indent(0.3) === 432 && U.indent(864, 432) === 864);
T('কলম সংখ্যা ক্ল্যাম্প (১..৬) + বাংলা ডিজিট', U.count('৩', 2, 1, 6) === 3 && U.count(99, 2, 1, 6) === 6 && U.count(-4, 2, 1, 6) === 1 && U.count('দুই', 2, 1, 6) === 2);
T('পিচ ইউটিলিটি: sz/২ × ২০ × রেশিও (২৪→৩৬০ @১.৫, ৩২→৩২০ @১.০) + docxLineRule', U.linePitchTwips(24, 1.5) === 360 && U.linePitchTwips(32, 1) === 320 && U.docxLineRule(1) === 240,
  [U.linePitchTwips(24, 1.5), U.linePitchTwips(32, 1), U.docxLineRule(1)]);
const junk = [NaN, Infinity, -Infinity, null, undefined, '', {}, [], 'অ', true, false, -1, 'abc123def'];
T('বর্জ্য ইনপুটেও সব ফাংশন সসীম পূর্ণসংখ্যা দেয়', junk.every((v) =>
  [U.margin(v), U.gap(v), U.indent(v), U.count(v, 2, 1, 6), U.toTwips(v, 720)].every((n) => fin(n) && Number.isInteger(n))),
  junk.map((v) => [String(v), U.margin(v), U.gap(v)]));

console.log('\n— (আ) প্ল্যানার ⇄ মডিউল ঐকমত্য —');
const marginInputs = ['normal', 'narrow', 'moderate', 'wide', 0.6, '0.6', 720, 576, undefined, 'অ', NaN];
for (const [tag, P] of [['CQ', CQP], ['MCQ', MQP]]) {
  const bad = [];
  for (const mi of marginInputs) {
    const geo = P.geometry({ margin: mi });
    const want = U.margin(mi, P.GEOMETRY.margin);
    for (const [k, v] of Object.entries(geo)) if (typeof v === 'number' && !fin(v)) bad.push(tag + ':' + mi + ' → ' + k + '=' + v);
    if (geo.margin !== want) bad.push(tag + ':' + mi + ' margin ' + geo.margin + '≠' + want);
    if (geo.cols >= 1 && Math.abs(geo.colW - Math.floor((geo.pageW - 2 * geo.margin - geo.colGap * (geo.cols - 1)) / geo.cols)) > 1) bad.push(tag + ':' + mi + ' colW ' + geo.colW);
  }
  T(tag + ': কোনো মার্জিন-ইনপুটেই NaN নেই ও মান মডিউলের সঙ্গে মিলে', bad.length === 0, bad.slice(0, 4));
  T(tag + ': কলাম-প্রস্থ মার্জিন বদলালে বদলায় (narrow > normal)',
    P.geometry({ margin: 'narrow' }).colW > P.geometry({ margin: 'normal' }).colW,
    [P.geometry({ margin: 'narrow' }).colW, P.geometry({ margin: 'normal' }).colW]);
}
T('CQ: rightTab ডিফল্টে কলাম-প্রস্থ, ওভাররাইডে টুইপ', CQP.geometry({}).rightTab === CQP.geometry({}).colW && CQP.geometry({ rightTab: 7050 }).rightTab === 7050);
{
  // মডিউল লোড না হলেও (HTML-এ ট্যাগ বাদ গেলে) প্ল্যানারের নিজের ফলব্যাক যেন হুবহু একই
  // জ্যামিতি দেয় — সেটাই index.html-এর স্ক্রিপ্ট-ক্রমের ওপর নির্ভরতা কমানোর প্রমাণ।
  const child = `
    const path=require('path');const U=require(path.join(process.cwd(),'js/layout-engine/layout-units.js'));
    const P=require(path.join(process.cwd(),'js/layout-engine/cq-booklet-planner.js'));
    const withMod=P.geometry({margin:'narrow',cols:2,indent:0.3});
    delete globalThis.FayzarLayoutUnits;delete require.cache[require.resolve(path.join(process.cwd(),'js/layout-engine/cq-booklet-planner.js'))];
    const P2=require(path.join(process.cwd(),'js/layout-engine/cq-booklet-planner.js'));
    const noMod=P2.geometry({margin:'narrow',cols:2,indent:0.3});
    process.stdout.write(JSON.stringify([withMod.margin,withMod.colW,withMod.indent,noMod.margin,noMod.colW,noMod.indent]));
  `;
  const out = execFileSync('node', ['-e', child], { cwd: ROOT, encoding: 'utf8' });
  const [a1, a2, a3, b1, b2, b3] = JSON.parse(out);
  T('মডিউল-সহ বনাম ফলব্যাক-একই জ্যামিতি (margin/colW/indent)', a1 === b1 && a2 === b2 && a3 === b3, [a1, a2, a3, b1, b2, b3]);
}

console.log('\n— (ই) এক্সপোর্ট: NaN-মুক্ত ও লাইন-স্পেসিং লক —');
const bodyOf = (id) => fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', id + '.input.md'), 'utf8').replace(/^---[\s\S]*?---\s*/, '');
const parsed6 = QE.parseQuestionPaper(bodyOf('cq-booklet-6'), { docType: 'EXAM_CQ' });
const geo6 = CQP.geometry({});
const lf = geo6.lineRenderFactor || 1;
const wantLine = Math.round(240 * lf);
const cssRatio = geo6.lineRenderCssRatio || 1.34;
const rtf6 = EX.generateCqExamRtf(parsed6, {});
{
  const flat = String(rtf6).split(B + B).join(B);
  const pairs = [...flat.matchAll(new RegExp(B + B + 'fs([0-9]+)(?:' + B + B + 'f[0-9]+)?' + B + B + 'sl([0-9]+)' + B + B + 'slmult([0-9])', 'g'))];
  T('CQ .doc: সব প্যারাগ্রাফেই \\sl' + wantLine + '\\slmult1 (হেয়ারলাইন বাদে)', pairs.length > 6 && pairs.every((m) => (+m[2] === wantLine && +m[3] === 1) || +m[2] < 120),
    [...new Set(pairs.map((m) => 'fs' + m[1] + ':sl' + m[2]))].join(' '));
  T('CQ .doc: NaN/undefined নেই', !/NaN|undefined/.test(rtf6), (rtf6.match(/NaN|undefined/g) || []).length);
  const sb = [...flat.matchAll(new RegExp(B + B + 's([ba])([0-9]+)', 'g'))];
  T('CQ .doc: \sb/\sa ≤ ১৮০', sb.length > 0 && sb.every((m) => +m[2] <= 180), sb.length);
}
(async () => {
  for (const mi of ['normal', 'narrow', 'moderate', 'wide', 0.6, undefined]) {
    const docx = await EX.generateCqExamDocx(parsed6, { margin: mi });
    const z = await g.jszip.loadAsync(Buffer.from(await docx.arrayBuffer()));
    const xml = await z.file('word/document.xml').async('string');
    const wantTop = U.margin(mi, 720);
    const top = (xml.match(/<w:pgMar w:top="([0-9]+)"/) || [])[1];
    T('CQ .docx মার্জিন ' + JSON.stringify(mi) + ' → pgMar ' + wantTop + ', NaN নেই', !/NaN/.test(xml) && +top === wantTop, top);
    const auto = [...new Set((xml.match(/w:line="([0-9]+)" w:lineRule="auto"/g) || []).map((v) => v.match(/"([0-9]+)"/)[1]))];
    T('CQ .docx মার্জিন ' + JSON.stringify(mi) + ': auto-লাইন = ' + wantLine, auto.filter((v) => +v >= 120).every((v) => +v === wantLine), auto.join(','));
  }
  const mcq = {
    header: { institute: 'আদর্শ বিদ্যালয়', exam: 'অর্ধবার্ষিক', time: '৩ ঘণ্টা', marks: '১০০' },
    sections: [{ title: 'বহুনির্বাচনি', marks: '', questions: Array.from({ length: 30 }, (_, i) => ({
      num: i + 1, text: 'নিচের কোনটি সঠিক? বিষয় ' + (i + 1),
      options: [{ label: 'ক', text: 'আয়তন ৩' }, { label: 'খ', text: 'ভর' }, { label: 'গ', text: 'ঘনত্ব' }, { label: 'ঘ', text: 'বেগ' }],
      correct: 'ক', subQuestions: [], statements: [],
    })) }],
  };
  const rtfM = EX.generateMcqExamRtf(mcq, {});
  {
    const flat = String(rtfM).split(B + B).join(B);
    const pairs = [...flat.matchAll(new RegExp(B + B + 'fs([0-9]+)(?:' + B + B + 'f[0-9]+)?' + B + B + 'sl([0-9]+)' + B + B + 'slmult([0-9])', 'g'))];
    T('MCQ .doc: \sl = \fs × ' + lf + ' (সংকুচিত ফন্টেও)', pairs.length > 6 && pairs.every((m) => +m[2] === wantLine || +m[2] < 120),
      [...new Set(pairs.map((m) => 'fs' + m[1] + ':sl' + m[2]))].join(' '));
    T('MCQ .doc: NaN নেই', !/NaN/.test(rtfM));
  }
  const docxM = await EX.generateMcqExamDocx(mcq, { margin: 'narrow' });
  const zm = await g.jszip.loadAsync(Buffer.from(await docxM.arrayBuffer()));
  const xmlM = await zm.file('word/document.xml').async('string');
  // Part-10 চুক্তি: MCQ আর্কিটাইপে মার্জিন সর্বদা ০.৫" (UI মান এলেও) — forceMargin দিলে
  // তবেই UI/ট্রায়াজ-নির্ধারিত মার্জিন বসে; দুই পাথেই NaN থাকবে না (অডিট ৮-এর মূল অভিযোগ)।
  T('MCQ .docx: ডিফল্টে ০.৫" পিন অক্ষুণ্ণ + NaN নেই', !/NaN/.test(xmlM) && /<w:pgMar w:top="720"/.test(xmlM), (xmlM.match(/<w:pgMar w:top="([0-9]+)"/) || [])[1]);
  const docxM2 = await EX.generateMcqExamDocx(mcq, { margin: 'narrow', forceMargin: true });
  const zm2 = await g.jszip.loadAsync(Buffer.from(await docxM2.arrayBuffer()));
  const xmlM2 = await zm2.file('word/document.xml').async('string');
  T('MCQ .docx forceMargin: narrow → ৫৭৬ (NaN নয়)', !/NaN/.test(xmlM2) && /<w:pgMar w:top="576"/.test(xmlM2), (xmlM2.match(/<w:pgMar w:top="([0-9]+)"/) || [])[1]);
  T('MCQ .docx: auto-লাইন ' + wantLine + ' (ডিভাইডার বাদে)', (xmlM.match(/w:line="(?!240|100)[0-9]+"/g) || []).length === 0, [...new Set(xmlM.match(/w:line="[0-9]+"/g) || [])].join(','));

  console.log('\n— (ঈ) মার্ক: যা লেখা নেই তা বানানো হয় না —');
  const noMarks = ['১. নিচের উদ্দীপকটি পড়ে প্রশ্নগুলোর উত্তর দাও।', 'ক. কোষ কী?', 'খ. পার্থক্য লেখো।'].join('\n');
  const pNo = QE.parseQuestionPaper(noMarks, { docType: 'EXAM_CQ' });
  const qNo = pNo.sections.flatMap((s) => s.questions)[0];
  T('উৎসে নম্বর নেই → সাব-প্রশ্নের mark খালি (ক→১, খ→২ বানানো হয় না)',
    qNo && qNo.subQuestions.length === 2 && qNo.subQuestions.every((x) => (x.mark || '') === ''), qNo && qNo.subQuestions.map((x) => x.label + ':' + x.mark));
  for (const [line, want] of [['ক. লেখা এক ৩', '৩'], ['খ. লেখা দুই [৪]', '৪'], ['গ. লেখা তিন (মান: ২)', '২'], ['ঘ. লেখা চার ৫ নম্বর', '৫']]) {
    const one = QE.parseQuestionPaper('১. প্রশ্ন।\n' + line, { docType: 'EXAM_CQ' }).sections[0].questions[0];
    const sub = (one.subQuestions || [])[0] || {};
    T('মার্ক রূপ উদ্ধার: ' + JSON.stringify(line.slice(4)), sub.mark === want, sub);
  }
  T('শেষ শব্দটি নম্বর ভেবে কাটা যায় না (যেমন "২০২৪ সাল")', (() => {
    const one = QE.parseQuestionPaper('১. প্রশ্ন।\nক. ১৯৭১ সালের কথা ২', { docType: 'EXAM_CQ' }).sections[0].questions[0];
    const s0 = (one.subQuestions || [])[0] || {};
    return s0.mark === '২' && /১৯৭১ সালের কথা/.test(s0.text);
  })());

  console.log('\n— (উ) গ্রুপিং ও উদ্দীপক —');
  const grouped = QE.parseQuestionPaper(bodyOf('cq-short'), { docType: 'EXAM_CQ' }).sections.flatMap((s) => s.questions);
  T('cq-short: ৮টি চ্যাপ্টা প্রশ্ন নয় — ২ গ্রুপ × ৪ সাব-প্রশ্ন', grouped.length === 2 && grouped.every((q) => q.subQuestions.length === 4),
    [grouped.length, grouped.map((q) => q.subQuestions.length).join('/')]);
  T('cq-short: উদ্দীপক-লেখা স্টেম নয়, stimulus-এ (প্রশ্নের গায়ে মারে না)',
    grouped.every((q) => /উদ্দীপক|গ্রামের|শফিকের/.test(q.stimulus || '')), grouped.map((q) => (q.stimulus || '').slice(0, 12)));
  T('cq-short: [উদ্দীপক N] লেবেল প্রিন্টে-উপযোগীভাবে থাকে', /উদ্দীপক\s*১/.test(grouped[0].stimulus || ''), (grouped[0].stimulus || '').slice(0, 24));
  const triage = ['১. নিচের উদ্দীপকটি পড়ে প্রশ্নগুলোর উত্তর দাও।',
    'ক. ১৬ ভুট্টা ৪ টাকায় বিক্রি করলে ২০% লস হয়। মূল দাম নির্ণয় করো। ৩',
    'খ. ৪০ মিটার লম্বা রাস্তার দুই পাশে ৭ মিটার চওড়া ফুটপাথ। ক্ষেত্রফল বের করো। ৪',
    '২. নিচের উদ্দীপকটি পড়ে প্রশ্নগুলোর উত্তর দাও।',
    'ক. ৩০ জনের গড় বয়স ১৪। ৫ জন এলে ১৫ হয়। নতুনদের গড়? ২',
    'খ. দৈর্ঘ্য:প্রস্থ ৫:৩, পরিসীমা ৬৪ সেমি। ক্ষেত্রফল। ৩'].join('\n');
  const tg = QE.parseQuestionPaper(triage, { docType: 'EXAM_CQ' }).sections.flatMap((s) => s.questions);
  T('ট্রায়াজ-নমুনা: ২ প্রশ্ন, মার্ক যথাক্রমে ৩,৪ ও ২,৩', tg.length === 2 &&
    tg[0].subQuestions.map((x) => x.mark).join(',') === '৩,৪' && tg[1].subQuestions.map((x) => x.mark).join(',') === '২,৩',
    tg.map((q) => q.subQuestions.map((x) => x.mark).join('/')));
  const secMark = QE.parseQuestionPaper('বিভাগ: গণিত মান: ২০\n১. উৎপাদকে বিশ্লেষণ করো। ৪', { docType: 'EXAM_CQ' });
  T('বিভাগ-শিরোনাম থেকে পূর্ণমান আলাদা ফিল্ডে', secMark.sections.some((s) => s.marks === '২০' && !/মান/.test(s.title)), secMark.sections.map((s) => [s.title, s.marks]));

  console.log('\n— (ঋ) সমীকরণ-সীমান্ত ও প্রিভিউ-সাম্য —');
  const mathRtf = EX.formatRtfText('ক্ষেত্রফল নির্ণয় করো:   \\pi r^2   নির্ণয় করো', {});
  T('RTF: বাংলা↔ম্যাথ সীমানায় ডাবল-স্পেস বসে না', !/ {2,}/.test(String(mathRtf).replace(new RegExp(B + 'u[0-9]+\\?', 'g'), 'x')), mathRtf.slice(0, 90));
  const mathDocx = EX.renderDocxRuns('ক্ষেত্রফল πr² নির্ণয় করো', {}, {});
  T('DOCX: সমীকরণ-রানের পরে অতিরিক্ত ফাঁকা জোড়া লাগে না', !/<\/m:t>[ \t]*<w:t xml:space="preserve">[ \t]/.test(mathDocx), mathDocx.slice(0, 160));
  const html = QE.renderQuestionItem(grouped[0], { cqGeom: geo6 });
  T('প্রিভিউ: প্রশ্ন-আইটেমের line-height = প্ল্যানের রেন্ডার-রেশিও (' + cssRatio + ')', html.includes('line-height: ' + cssRatio + ';'), (html.match(/line-height: [^;]+/g) || []).join(' '));
  const hdr = QE.renderHeaderBlock({ institute: 'আদর্শ বিদ্যালয়', exam: 'অর্ধবার্ষিক', classAndSubject: 'শ্রেণি: ১০ম', time: '৩ ঘণ্টা', marks: '৭০' }, { cqGeom: geo6 });
  T('প্রিভিউ: হেডারের line-height-ও একই রেশিও (প্রিভিউ ≡ ডাউনলোড)', hdr.includes('line-height: ' + cssRatio + ';'), (hdr.match(/line-height: [^;]+/g) || []).join(' '));

  console.log('\n— (ঋ+) OCR প্রম্পট: প্রশ্ন-মাত্র —');
  const ocr = fs.readFileSync(path.join(ROOT, 'js', 'ai-ocr-engine.js'), 'utf8');
  T('প্রম্পটে STRICT QUESTION-ONLY ব্লক (তৈরি + যাচাই দুটোতেই)', (ocr.match(/STRICT QUESTION-ONLY/g) || []).length === 2, (ocr.match(/STRICT QUESTION-ONLY/g) || []).length);
  T('কোভারেজ-ম্যান্ডেট থেকে answers/solutions বাদ', !/answers\/solutions/.test(ocr));
  T('নম্বর-পুনঃসংখ্যায়নের নিয়মটি সীমাবদ্ধ (প্রশ্ন-নম্বর অক্ষুণ্ন থাকে)', /প্রশ্ন ১, ২, ৩|১ থেকে আবার শুরু/.test(ocr) && /QUESTION NUMBER PRESERVATION/.test(ocr));
  T('প্রক্সি-টোকেন override-যোগ্য (localStorage → global → ফলব্যাক)', /globalThis\.FAYZAR_PROXY_TOKEN/.test(ocr));

  console.log('\nফল: ' + pass + ' পাস, ' + fail + ' ব্যর্থ');
  process.exit(fail ? 1 : 0);
})();
