/**
 * part-8a: OCR-আর্টিফ্যাক্ট (পৃষ্ঠা-মার্কার + MANIFEST) পরিষ্কার — স্থায়ী টেস্ট।
 *   node tests/page-marker-strip.test.mjs
 * নিয়ম: আউটপুটের কোন স্তরে (ক্লায়েন্ট / HTML / DOCX / RTF-.doc) মার্কার বা MANIFEST থাকতে পারবে না;
 *       অডিট নোট ও [অসম্পূর্ণ: …] সতর্কতা অটুট থাকবে।
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const H = require('./lib/harness.js');

import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

// ---- ১) ক্লায়েন্ট সোর্স-চেক ----
const clientSrc = fs.readFileSync(path.join(ROOT, 'js/ai-ocr-engine.js'), 'utf8');
T('ক্লায়েন্টে stripOcrArtifacts আছে', clientSrc.includes('function stripOcrArtifacts(text)'));
T('ক্রম ঠিক: কভারেজ-গার্ড আগে, স্ট্রিপ পরে',
  clientSrc.indexOf('applyPageCoverageGuard(text, mediaParts.length)') < clientSrc.indexOf('return stripOcrArtifacts(guarded);'));

// ---- ২) ক্লায়েন্ট-ফাংশনের ফাংশনাল টেস্ট ----
const m = clientSrc.match(/function stripOcrArtifacts\(text\) \{[\s\S]*?\r?\n  \}/);
const strip = m ? eval('(' + m[0] + ')') : null;
T('stripOcrArtifacts সোর্স থেকে নেওয়া গেছে', !!strip);
const cases = [
  ['ইনলাইন মার্কার বাদ', 'কারণ বিশ্লেষণ করো। ===== পৃষ্ঠা ২/৪৬ =====', 'বিশ্লেষণ করো', true],
  ['স্ট্যান্ডঅ্যালোন মার্কার বাদ', '===== পৃষ্ঠা ১/৪৬ =====\n\n১। প্রশ্ন এক', 'প্রশ্ন এক', true],
  ['আংশিক মার্কার বাদ', 'লেখো।\n===== পৃষ্ঠা ৩\nপরের লাইন', 'পরের লাইন', true],
  ['MANIFEST লাইন বাদ', 'MANIFEST: ১, ২, ৩, ৪\nশেষ লাইন', 'শেষ লাইন', true],
  ['অডিট নোট অটুট', '- প্রশ্ন ৪(খ), মূল পৃষ্ঠা ২: ঝাপসা ছিল।', 'মূল পৃষ্ঠা ২', false],
  ['অসম্পূর্ণ-সতর্কতা অটুট', '[অসম্পূর্ণ: ৪৬ পৃষ্ঠার মধ্যে ৩০ পৃষ্ঠার আউটপুট]', '[অসম্পূর্ণ:', false],
];
for (const [name, input, mustKeep, dropMarkers] of cases) {
  const out = strip ? strip(input) : input;
  const ok = out.includes(mustKeep) && (!dropMarkers || (!out.includes('=====') && !out.includes('MANIFEST')));
  T('ক্লায়েন্ট-স্ট্রিপ: ' + name, ok, out);
}

// ---- ৩) পাইপলাইন আউটপুট (HTML / DOCX / RTF) ----
const SAMPLE = [
  '===== পৃষ্ঠা ১/৪৬ =====', '', '[ পরীক্ষার নাম: বার্ষিক পরীক্ষা ]', '',
  '১। কাগজের টুকরার আগেই পাথরটি মাটিতে পড়ার কারণ বিশ্লেষণ করো। ===== পৃষ্ঠা ২/৪৬ =====', '',
  '২। মৌল দুটির ইলেকট্রন বিন্যাস প্রদর্শনপূর্বক যৌগ গঠনের সমীকরণ দাও।', '', 'MANIFEST: ১, ২',
].join('\n');

const engines = H.loadEngines();
(async () => {
  try {
    const res = await engines.Pipeline.process(SAMPLE, { docType: 'EXAM_CQ', outputFormat: 'html' });
    const html = String(res.content || '');
    T('HTML-এ মার্কার/MANIFEST নেই', !html.includes('=====') && !html.includes('MANIFEST'), html.slice(0, 100));
    T('HTML-এ প্রশ্ন-টেক্সট অটুট', html.includes('পাথরটি'));
  } catch (e) { T('HTML রেন্ডার', false, e.message); }

  try {
    const parsed = engines.Pipeline._parseByDocType('EXAM_CQ', SAMPLE, {});
    const res = await engines.Export.generateCqExamDocx(parsed, { returnInnerXml: true });
    const xml = ((res && res.bodyXml) || '') + ((res && res.sectPr) || '');
    T('DOCX-এ মার্কার/MANIFEST নেই', !xml.includes('=====') && !xml.includes('/৪৬') && !xml.includes('MANIFEST'), xml.slice(0, 100));
  } catch (e) { T('DOCX রেন্ডার', false, e.message); }

  try {
    let rtf = engines.Export.generateLegacyDoc(SAMPLE, 'EXAM_CQ', {});
    if (rtf && typeof rtf.then === 'function') rtf = await rtf;
    if (rtf && typeof rtf.text === 'function') rtf = await rtf.text();
    const s = String(rtf || '');
    T('RTF (.doc)-এ মার্কার/MANIFEST নেই', !s.includes('=====') && !s.includes('MANIFEST'), s.slice(0, 100));
  } catch (e) { T('RTF রেন্ডার', false, e.message); }

  console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
  process.exit(fail ? 1 : 0);
})();
