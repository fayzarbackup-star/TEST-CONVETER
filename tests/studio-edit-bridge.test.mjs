/**
 * Part-13.1: Studio Edit Bridge — এডিট ⇄ parsedData ⇄ এক্সপোর্ট সমতা
 *   node tests/studio-edit-bridge.test.mjs
 *
 * যে সমস্যা ধরা পড়েছিল (প্রমাণসহ): Studio-র প্রিভিউ `contenteditable` হলেও
 * `downloadDocument` আবার `inputText` (মূল markdown) থেকে পার্স করত ⇒ প্রিভিউতে
 * হাতে-করা **সব এডিট লোপ পেত** (RTF-এ পুরোনো টেক্সটই থাকত)।
 *
 * এই স্যুট পাহারা দেয়:
 *   ১) ব্রিজের path-ইউটিলিটি (setByPath/applyEdits) — immutable ও NaN-ফ্রি
 *   ২) পাইপলাইন `options.parsedData` (ট্যাগ-মিলে) হলে পুনঃপার্স করে না
 *   ৩) এডিট করা parsedData → এক্সপোর্টে হুবহু (RTF + DOCX), অটুট ক্ষেত্র অটুটই
 *   ৪) docType-অমিলে নিরাপদ ফলব্যাক (ভুল data ব্যবহার নয়)
 *   ৫) সোর্স-গেট: কন্ট্রোলার ব্রিজ ডাকে, studio.html ব্রিজ লোড করে
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
const Bridge = require(path.join(ROOT, 'js', 'engines', 'studio-edit-bridge.js'));
const Pipeline = require(path.join(ROOT, 'js', 'layout-engine', 'fayzar-pipeline.js'));

const rtfDecode = (s) => String(s)
  .replace(/\\u(-?\d+)\s?\??/g, (_, d) => String.fromCharCode(((Number(d) % 65536) + 65536) % 65536))
  .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

// ───────────────────────── ১) path-ইউটিলিটি ─────────────────────────
{
  const o = { a: { b: [{ c: 1 }, { c: 2 }] } };
  T('getByPath ডট-পথ বোঝে', Bridge.getByPath(o, 'a.b.1.c') === 2);
  Bridge.setByPath(o, 'a.b.0.c', 9);
  T('setByPath মাঝপথে বসায়', o.a.b[0].c === 9);
  Bridge.setByPath(o, 'a.new.0.x', 5);
  T('setByPath মাঝপথে অ্যারে বানায়', Array.isArray(o.a.new) && o.a.new[0].x === 5);
  T('normNum বাংলা/যুক্তচিহ্ন ছাঁটে', Bridge.normNum('১।') === '1' && Bridge.normNum(' ২৪ ') === '24');
}

// ───────────────────────── ২) applyEdits — অমিউটেবল ─────────────────────────
{
  const pd = { __fzDocType: 'EXAM_CQ', sections: [{ questions: [{ num: '১', text: 'পুরোনো', subQuestions: [{ label: 'ক', text: 'আগে', mark: '২' }] }] }] };
  const before = JSON.stringify(pd);
  const out = Bridge.applyEdits(pd, [
    { path: 'sections.0.questions.0.text', value: 'নতুন' },
    { path: 'sections.0.questions.0.subQuestions.0.mark', value: '৪' }
  ]);
  T('applyEdits মূল parsedData অটুট রাখে', JSON.stringify(pd) === before);
  T('applyEdits মান বসায় (text)', out.sections[0].questions[0].text === 'নতুন');
  T('applyEdits মান বসায় (mark)', out.sections[0].questions[0].subQuestions[0].mark === '৪');
  T('applyEdits __edited ফ্ল্যাগ দেয়', out.__edited === true);
  T('খালি এডিট-তালিকায় same অবজেক্ট', Bridge.applyEdits(pd, []) === pd);
}

// ───────────────────────── ৩) পাইপলাইন: parsedData-পথ ─────────────────────────
const MD = '১. নিচের উদ্দীপকটি পড়ে উত্তর দাও:\nক. "মূল কথা" ব্যাখ্যা করো? ২\nখ. দ্বিতীয় প্রশ্ন? ৪\n';
{
  const prev = await Pipeline.process(MD, { docType: 'EXAM_CQ', outputFormat: 'html' });
  const pd = prev.parsedData;
  T('রেন্ডারে parsedData ফেরত আসে ও ট্যাগ বসে', !!pd && pd.__fzDocType === 'EXAM_CQ', pd && pd.__fzDocType);

  const edited = Bridge.applyEdits(pd, [
    { path: 'sections.0.questions.0.subQuestions.0.text', value: 'সম্পাদিত কথা ব্যাখ্যা করো?' }
  ]);

  // ক) এডিট-সহ → .doc
  const r1 = await Pipeline.process(MD, { docType: 'EXAM_CQ', outputFormat: 'doc', parsedData: edited });
  let t1 = r1.content; if (t1 && typeof t1.text === 'function') t1 = await t1.text();
  const d1 = rtfDecode(t1);
  T('.doc: এডিট করা টেক্সট ছাপা হয়', d1.includes('সম্পাদিত কথা'), d1.slice(0, 80));
  T('.doc: পুরোনো টেক্সট আর নেই', !d1.includes('"মূল কথা"'), '');

  // খ) এডিট-সহ → .docx
  const r2 = await Pipeline.process(MD, { docType: 'EXAM_CQ', outputFormat: 'docx', parsedData: edited });
  const zip = await global.JSZip.loadAsync(Buffer.from(await r2.content.arrayBuffer()));
  const xml = await zip.file('word/document.xml').async('string');
  T('.docx: এডিট করা টেক্সট ছাপা হয়', xml.includes('সম্পাদিত কথা'));
  T('.docx: পুরোনো টেক্সট আর নেই', !xml.includes('&quot;মূল কথা&quot;') && !xml.includes('"মূল কথা"'));

  // গ) দ্বিতীয় উপ-প্রশ্ন (অটুট) এখনো অটুটই
  T('.doc: অ-সম্পাদিত উপ-প্রশ্ন অটুট', d1.includes('দ্বিতীয় প্রশ্ন'));
  T('.doc: অ-সম্পাদিত মার্ক অটুট', rtfDecode(t1).includes('৪'));

  // ঘ) নিয়ন্ত্রণ: parsedData ছাড়া মূল markdown-এর ফল (পুরোনো আচরণ)
  const r3 = await Pipeline.process(MD, { docType: 'EXAM_CQ', outputFormat: 'doc' });
  let t3 = r3.content; if (t3 && typeof t3.text === 'function') t3 = await t3.text();
  T('নিয়ন্ত্রণ: parsedData ছাড়া মূল টেক্সটই থাকে', rtfDecode(t3).includes('মূল কথা') && !rtfDecode(t3).includes('সম্পাদিত কথা'));

  // ঙ) docType-অমিল ⇒ নিরাপদে পুনঃপার্স (ভুল data ব্যবহৃত নয়)
  const r4 = await Pipeline.process(MD, { docType: 'EXAM_MCQ', outputFormat: 'doc', parsedData: edited });
  let t4 = r4.content; if (t4 && typeof t4.text === 'function') t4 = await t4.text();
  T('docType-অমিলে parsedData উপেক্ষিত (reparse)', !rtfDecode(t4).includes('সম্পাদিত কথা'));
}

// ───────────────────────── ৪) MCQ এডিট → এক্সপোর্ট ─────────────────────────
{
  // repo-র নিজস্ব ফরম্যাট: প্রতি অপশন আলাদা লাইনে (ক. / খ. / গ. / ঘ.)
  const md = '১. কম্পিউটারের মস্তিষ্ক বলা হয় কোনটিকে?\nক. হার্ডডিস্ক\nখ. র‍্যাম\nগ. মাইক্রোপ্রসেসর\nঘ. মাদারবোর্ড\n';
  const prev = await Pipeline.process(md, { docType: 'EXAM_MCQ', outputFormat: 'html' });
  const pd = prev.parsedData;
  const q0 = pd.sections[0].questions[0];
  T('MCQ parsedData-তে options আছে (>=3)', !!(q0.options && q0.options.length >= 3), q0.options && q0.options.length);
  const edited = Bridge.applyEdits(pd, [{ path: 'sections.0.questions.0.options.1.text', value: 'সম্পাদিত অপশন' }]);
  const r = await Pipeline.process(md, { docType: 'EXAM_MCQ', outputFormat: 'doc', parsedData: edited });
  let t = r.content; if (t && typeof t.text === 'function') t = await t.text();
  T('MCQ .doc: এডিট করা অপশন ছাপা হয়', rtfDecode(t).includes('সম্পাদিত অপশন'));
  T('MCQ .doc: বাকি অপশন অটুট', rtfDecode(t).includes('মাইক্রোপ্রসেসর') || rtfDecode(t).includes('মাদারবোর্ড'));
}

// ───────────────────────── ৫) সোর্স-গেট (পুনরাবৃত্তি ঠেকাতে) ─────────────────────────
{
  const pl = fs.readFileSync(path.join(ROOT, 'js', 'layout-engine', 'fayzar-pipeline.js'), 'utf8');
  T('pipeline: options.parsedData + __fzDocType গার্ড আছে', /options\.parsedData && options\.parsedData\.__fzDocType === docType/.test(pl));
  T('pipeline: পার্স-ফল ট্যাগ হয়', /__fzDocType = docType/.test(pl));

  const ede = fs.readFileSync(path.join(ROOT, 'js', 'engines', 'export-dual-engine.js'), 'utf8');
  T('export-engine: _resolveParsed হেল্পার আছে', /_resolveParsed\(rawText, docType, options, qEngine\)\s*\{/.test(ede));
  T('export-engine: ৪টি কল-সাইটেই ব্রিজ-পথ', (ede.match(/this\._resolveParsed\(rawText/g) || []).length === 4, (ede.match(/this\._resolveParsed\(rawText/g) || []).length);

  const sc = fs.readFileSync(path.join(ROOT, 'js', 'studio-controller.js'), 'utf8');
  T('controller: downloadDocument-এ collectFromDom ডাকা হয়', /StudioEditBridge\.collectFromDom\(previewContainer/.test(sc));
  T('controller: applyEdits → options.parsedData', /options\.parsedData = editedData/.test(sc));
  T('controller: প্রিভিউ-রেন্ডারে __fzDocType ট্যাগ', /result\.parsedData\.__fzDocType = docType/.test(sc));

  const html = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');
  T('studio.html: studio-edit-bridge.js লোড হয়', /js\/engines\/studio-edit-bridge\.js/.test(html));
  T('studio.html: কন্ট্রোলারের আগে ব্রিজ', html.indexOf('studio-edit-bridge.js') < html.indexOf('js/studio-controller.js'));
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
