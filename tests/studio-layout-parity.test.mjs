/**
 * Part-12.2: Studio লেআউট-অপশন ⇄ প্রিভিউ ⇄ এক্সপোর্ট — সমতা (parity) রিগ্রেশন
 *   node tests/studio-layout-parity.test.mjs
 *
 * যে বাগ ধরেছিল (ব্যবহারকারী-রিপোর্ট-পরবর্তী স্বাধীন অডিট):
 *   ১) `studio-controller.js`-এর ডাউনলোড-পাথ মার্জিন-সিলেক্টের ৪টি মানকে ২টিতে সংকুচিত করত
 *      ⇒ "০.৭৫\"" ও "১.০\"" নির্বাচন করেও Word-ফাইলে বসত ০.৫" — অর্থাৎ প্রিভিউ ≠ ডাউনলোড।
 *   ২) প্রিভিউ-CSS-এর মার্জিন ছিল mm-ভিত্তিক ও অসমmetric (8×10, 10×12, 15, 20mm), যা
 *      এক্সপোর্টের টুইপের সঙ্গে মিলত না।
 *   ৩) `layout-units`-এর MARGIN_MAP, UI-ক্লাস-নাম ('margin-*') চিনত না ⇒ যেকোনো পাথে
 *      ক্লাস-নাম গেলে ফলব্যাক ৭২০ টুইপ (০.৫")।
 *   ৪) `.margin-stamp` ক্লাসের কোনো CSS-নিয়মই ছিল না (STAMP_DEED প্রিভিউ-ডিফল্ট)।
 *   ৫) index.html-এর লেবেল মিথ্যা ছিল ("Normal ১.০\"" অথচ মান ০.৫") এবং `main.js`-এর
 *      MD→Word পাথে হার্ডকোড মার্জিন ছিল ⇒ UI-র মার্জিন-সিলেক্ট উপেক্ষিত হত।
 *
 * নিয়ম (এখন থেকে অটুট রাখতে হবে):
 *   ক) চারটি UI-মার্জিন → ৫৭৬/৭২০/১০৮০/১৪৪০ টুইপ — চারটিই স্বতন্ত্র।
 *   খ) এক্সপোর্ট (.doc RTF ও .docx) চারটি মানের জন্যই আলাদা মান দেয়।
 *   গ) প্রিভিউ-CSS ক্লাসের মান টুইপ-মানচিত্রের সঙ্গে হুবহু (০.৪/০.৫/০.৭৫/১ ইঞ্চি)।
 *   ঘ) `studio-controller.js`-এ মার্জিন/পেপার এক জায়গা থেকেই (layoutOptions) যায়।
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };
const cnt = (s, re) => (String(s).match(re) || []).length;

global.JSZip = require(path.join(ROOT, 'js', 'jszip.min.js'));
const U = require(path.join(ROOT, 'js', 'layout-engine', 'layout-units.js'));
const Pipeline = require(path.join(ROOT, 'js', 'layout-engine', 'fayzar-pipeline.js'));

const CLS = ['margin-narrow', 'margin-standard', 'margin-normal', 'margin-wide'];
const EXPECT = { 'margin-narrow': 576, 'margin-standard': 720, 'margin-normal': 1080, 'margin-wide': 1440 };

// ───────────────────────── ১) একক-সূত্র: ক্লাস → টুইপ ─────────────────────────
{
  const got = CLS.map((c) => U.marginClass(c));
  T('চারটি UI-মার্জিন-ক্লাস হুবহু ৫৭৬/৭২০/১০৮০/১৪৪০ টুইপ', got.join(',') === '576,720,1080,1440', got);
  T('চারটি মান স্বতন্ত্র (৪-এর সেট)', new Set(got).size === 4, got);
  T('margin()ও ক্লাস-নাম চেনে (একই মান)', CLS.every((c) => U.margin(c) === EXPECT[c]));
  T('margin-stamp → ১৪৪০', U.marginClass('margin-stamp') === 1440, U.marginClass('margin-stamp'));
  T('অচেনা/খালি → ফলব্যাক ৭২০ (NaN নয়)', U.marginClass('margin-xyz') === 720 && U.marginClass(undefined) === 720 && U.marginClass('') === 720);
  T('ক্যানোনিক্যাল নামও অটুট (narrow/normal)', U.margin('narrow') === 576 && U.margin('normal') === 720);
}

// ───────────────────────── ২) এক্সপোর্ট-সমতা: .doc (RTF) ─────────────────────────
const MD = '---\ndoc_type: EXAM_CQ\n---\n\n১. নিচের উদ্দীপকটি পড়ে উত্তর দাও:\nক. প্রশ্ন এক? ২\nখ. প্রশ্ন দুই? ৪\n';
{
  const margl = {};
  for (const c of CLS) {
    const r = await Pipeline.process(MD, { docType: 'EXAM_CQ', outputFormat: 'doc', marginClass: c, margin: EXPECT[c] / 1440 });
    let t = r.content; if (t && typeof t.text === 'function') t = await t.text();
    margl[c] = Number((String(t).match(/\\margl(\d+)/) || [])[1] || NaN);
  }
  T('.doc-এ প্রতি ক্লাসে সঠিক \\margl (৫৭৬/৭২০/১০৮০/১৪৪০)',
    CLS.every((c) => margl[c] === EXPECT[c]), margl);
  T('.doc-এ "normal" ও "wide" আর একই নয় (পুরোনো বাগের মূল লক্ষণ)',
    margl['margin-normal'] !== margl['margin-wide'] && margl['margin-normal'] === 1080, margl);
}

// ───────────────────────── ৩) এক্সপোর্ট-সমতা: .docx ─────────────────────────
{
  const left = {};
  for (const c of ['margin-narrow', 'margin-wide']) {
    const r = await Pipeline.process(MD, { docType: 'EXAM_CQ', outputFormat: 'docx', marginClass: c, margin: EXPECT[c] / 1440 });
    const blob = r.content;
    const buf = Buffer.from(await blob.arrayBuffer());
    const zip = await global.JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml').async('string');
    left[c] = Number((xml.match(/<w:pgMar[^>]*w:left="(\d+)"/) || [])[1] || NaN);
  }
  T('.docx-এ প্রতি ক্লাসে সঠিক w:pgMar left (৫৭৬ / ১৪৪০)',
    left['margin-narrow'] === 576 && left['margin-wide'] === 1440, left);
  T('.docx-এ NaN নেই', !/NaN/.test(JSON.stringify(left)));
}

// ───────────────────────── ৪) প্রিভিউ-ক্লাস ─────────────────────────
{
  for (const c of ['margin-narrow', 'margin-wide', 'margin-stamp']) {
    const r = await Pipeline.process(MD, { docType: 'EXAM_CQ', outputFormat: 'html', marginClass: c });
    T(`প্রিভিউ-সীটে ক্লাস "${c}" বসে`, String(r.content).includes(c), String(r.content).slice(0, 90));
  }
}

// ───────────────────────── ৫) CSS ⇄ টুইপ সমতা ─────────────────────────
{
  const css = fs.readFileSync(path.join(ROOT, 'css', 'studio.css'), 'utf8');
  const pad = (cls) => {
    const i = css.indexOf('.paper-sheet.' + cls);
    const seg = i >= 0 ? css.slice(i, i + 140) : '';
    return (seg.match(/padding:\s*([^;!]+)/) || [])[1]?.trim() || '';
  };
  T('CSS: margin-narrow = 0.4in', pad('margin-narrow') === '0.4in', pad('margin-narrow'));
  T('CSS: margin-standard = 0.5in', pad('margin-standard') === '0.5in', pad('margin-standard'));
  T('CSS: margin-normal = 0.75in', pad('margin-normal') === '0.75in', pad('margin-normal'));
  T('CSS: margin-wide = 1in', pad('margin-wide') === '1in', pad('margin-wide'));
  T('CSS: margin-stamp নিয়ম আছে (আগে ছিল না)', /\.paper-sheet\.margin-stamp\s*\{/.test(css));
  T('CSS: mm-ভিত্তিক পুরোনো অসমmetric padding আর নেই',
    !/padding:\s*8mm 10mm/.test(css) && !/padding:\s*10mm 12mm/.test(css));
}

// ───────────────────────── ৬) কন্ট্রোলার-সোর্স গেট (পুনরাবৃত্তি ঠেকাতে) ─────────────────────────
{
  const sc = fs.readFileSync(path.join(ROOT, 'js', 'studio-controller.js'), 'utf8');
  T('কন্ট্রোলারে layoutOptions() একক-উৎস আছে', /function layoutOptions\s*\(/.test(sc));
  T('পুরোনো ৪→২ সংকোচন (`? 0.4 : 0.5`) আর নেই', !/\?\s*0\.4\s*:\s*0\.5/.test(sc));
  T('ডাউনলোড ও প্রিভিউ দুটোই layoutOptions() ব্যবহার করে', cnt(sc, /Object\.assign\(layoutOptions\(\)/g) >= 2, cnt(sc, /Object\.assign\(layoutOptions\(\)/g));
  T('layoutOptions-এ paperSize যায় (আগে ডাউনলোডে ছিল না)', /paperSize:\s*paper/.test(sc));
  T('layoutOptions-এ margin = twips/1440 সূত্র', /margin:\s*tw\s*\/\s*1440/.test(sc));
}

// ───────────────────────── ৭) OCR/হোম-পেজের মার্জিন-সিলেক্ট (একই বাগ-পরিবার) ─────────────────────────
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  T('index.html: Normal-লেবেল এখন সত্য (০.৫")', /Normal \(চারপাশে ০\.৫"\)/.test(html));
  T('index.html: পুরোনো মিথ্যা লেবেল ("Normal ১.০\\"") গেছে', !/Normal \(চারপাশে ১\.০"\)/.test(html));
  T('index.html: Narrow/Moderate/Wide লেবেল সত্য মানের সাথে (০.৪/০.৭৫/১.০)',
    /Narrow \(০\.৪/.test(html) && /Moderate \(০\.৭৫/.test(html) && /Wide \(১\.০"\)/.test(html));

  const mj = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  const blk = (mj.match(/const mdOptions = \{[\s\S]{0,700}?\};/) || [''])[0];
  T('main.js: mdOptions-এ আর হার্ডকোড margin: 0.5 নেই', blk.length > 0 && !/margin:\s*0\.5\s*[,}]/.test(blk), blk.slice(-90));
  T('main.js: mdOptions মার্জিন এখন সিলেক্ট থেকে আসে', /ai-target-page-margin/.test(blk));
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
