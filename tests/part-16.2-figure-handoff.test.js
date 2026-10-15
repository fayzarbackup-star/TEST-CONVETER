'use strict';

// Part-16.2 gates — চিত্র-ট্যাগ কখনো লেখা হিসেবে ফাইলে যাবে না + OCR→স্টুডিও চিত্র-হস্তান্তর।
// ব্যবহারকারীর রিপোর্ট (২০২৬-১০-০৫): স্টুডিও থেকে নামানো ফাইলে "[[FIG: p=23; box=…]]" লেখা হিসেবে এসেছিল —
// স্টুডিও আলাদা ট্যাবে, সেখানে মূল PDF নেই, ট্যাগ কাটার ব্যবস্থাও ছিল না।
// চালানো: node tests/part-16.2-figure-handoff.test.js

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const X = require(path.join(ROOT, 'js/layout-engine/figure-extractor.js'));
// Node-এর BroadcastChannel খোলা থাকলে প্রসেস শেষ হয় না (টেস্ট-রানার আটকে যায়) — ব্রিজ এটি ছাড়াই চলে
delete globalThis.BroadcastChannel;
const Bridge = require(path.join(ROOT, 'js/engines/converter-studio-bridge.js'));
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let gates = 0;
const check = (cond, msg) => { assert.ok(cond, msg); gates++; };

// ---- ১) ট্যাগ-মোছা (নিরাপত্তা-জাল) ----
const shot = '১৬। ৬ সে.মি. ব্যাসবিশিষ্ট বাগানের পরিধি কত? [[FIG: p=23; box=15,290,90,410]]\n(ক) 36π সে.মি.';
check(X.hasTags(shot), 'screenshot-style inline tag (spaces after ; and :) is recognised');
check(X.stripTags(shot) === '১৬। ৬ সে.মি. ব্যাসবিশিষ্ট বাগানের পরিধি কত?\n(ক) 36π সে.মি.', 'inline tag stripped cleanly, line kept');
check(X.stripTags('ক\n[[FIG:p=2;box=1,2,3,4]]\nখ') === 'ক\n\nখ', 'own-line tag stripped');
check(X.hasLooseTags('[[FIG: p=?; box=a,b]]') && X.stripTags('x [[FIG: p=?; box=a,b]] y') === 'x y', 'malformed tag also stripped');
check(X.hasLooseTags('\\[\\[FIG:p=1;box=1,2,3,4\\]\\]') && X.stripTags('\\[\\[FIG:p=1;box=1,2,3,4\\]\\]') === '', 'escaped-bracket tag stripped');
check(!X.hasLooseTags('[[অন্য লেখা]] ও $[a,b]$'), 'non-figure brackets untouched');
check(X.stripTags('a [[FIG:p=1;box=1,2,3,4]] b [[FIG:p=2;box=5,6,7,8]]') === 'a b', 'multiple tags stripped');

// ---- ১খ) Part-16.3: সহনশীল ট্যাগ-পড়া + নম্বর-একা লাইন জোড়া ----
const variants = {
  '[[FIG:p=23;box=[255,280,350,435]]]': [23, '255,280,350,435'],
  '[[FIG: page=৫; box=(১০,২০,৩০০,৪০০)]]': [5, '10,20,300,400'],
  '[[FIG: p=2; box=10,20,300,400; label=AB]]': [2, '10,20,300,400'],
  '[[FIG 3, 10, 20, 300, 400]]': [3, '10,20,300,400'],
  '\\[\\[FIG:p=1;box=1,2,300,400\\]\\]': [1, '1,2,300,400'],
};
for (const [tag, [pg, box]] of Object.entries(variants)) {
  const t = X.parseTags('x ' + tag + ' y');
  check(t.length === 1 && t[0].page === pg && t[0].box.join() === box, 'tolerant parse: ' + tag);
  check(X.stripTags('x ' + tag + ' y') === 'x y', 'tolerant strip: ' + tag);
}
const split1 = '১৭। [[FIG:p=23;box=255,280,350,435]]\nচিত্রে, OA = 4 সে.মি. হলে AB কত?\n(ক) 7 (খ) 5';
check(X.stripTags(split1) === '১৭। চিত্রে, OA = 4 সে.মি. হলে AB কত?\n(ক) 7 (খ) 5', 'number+tag line joined with stem after strip');
const split2 = '১৮।\n[[FIG:p=23;box=445,270,540,410]]\nচিত্রে O কেন্দ্র হলে CD কত?\n(ক) 4';
const rep2 = X.replaceTagsWithMarkers(split2);
check(rep2.text === '১৮। চিত্রে O কেন্দ্র হলে CD কত? QZFIG1QZ\n(ক) 4' && rep2.ids.join() === '1', 'number / tag / stem → one line, marker after stem');
check(X.stripTags('১৯।\nলেখা') === '১৯।\nলেখা', 'no tag → text untouched');
const multi = 'ক\n[[FIG:p=1;box=1,1,100,100]]\n২০। [[FIG:p=1;box=200,1,300,100]]\nস্টেম';
check(X.replaceTagsWithMarkers(multi).text === 'ক\nQZFIG1QZ\n২০। স্টেম QZFIG2QZ', 'marker order preserved');
check(X.parseTags(multi).map((t) => t.box[0]).join() === '1,200', 'parse order matches marker order');

// ---- ১গ) Part-16.3: কিনারা-ছোঁয়া পাশের লেখার টুকরো মোছা, চিত্র অক্ষত ----
{
  const W = 100, H = 100, data = new Uint8ClampedArray(W * H * 4).fill(255);
  const dot = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = (y * W + x) * 4; data[k] = data[k + 1] = data[k + 2] = 20; } };
  dot(20, 20, 80, 24); dot(20, 76, 80, 80); dot(20, 20, 24, 80); dot(76, 20, 80, 80);   // চিত্র-ফ্রেম (কিনারা ছোঁয় না)
  dot(0, 0, 10, 4);                                                                      // কিনারায় টুকরো
  const im = { width: W, height: H, data };
  const n = X.clearBorderFragments(im);
  check(n === 40 && data[0] === 255 && data[(22 * W + 50) * 4] === 20, 'border fragment cleared, figure kept');
}

// ---- ১ঘ) Part-16.4: পাতার কাত মাপা ----
{
  const mk = (deg) => {
    const W = 800, H = 1000, data = new Uint8ClampedArray(W * H * 4).fill(255);
    const t = Math.tan(deg * Math.PI / 180);
    for (let line = 0; line < 30; line++) {
      const y0 = 60 + line * 30;
      for (let x = 60; x < 740; x++) {
        if ((x % 40) > 30) continue;                         // শব্দের ফাঁক
        for (let k = 0; k < 6; k++) {
          const y = Math.round(y0 + x * t) + k;
          if (y >= 0 && y < H) { const p = (y * W + x) * 4; data[p] = data[p + 1] = data[p + 2] = 10; }
        }
      }
    }
    return { width: W, height: H, data };
  };
  check(Math.abs(X.estimateSkew(mk(0))) <= 0.05, 'skew: straight page ≈ 0°');
  check(Math.abs(X.estimateSkew(mk(2)) - 2) <= 0.1, 'skew: lines falling right 2° detected as +2°');
  check(Math.abs(X.estimateSkew(mk(-1.3)) + 1.3) <= 0.1, 'skew: −1.3° detected');
}

// ---- ১ঙ) Part-16.4: .doc-এ ছবির মাপ — Word CSS-মাপ উপেক্ষা করে, তাই width/height অ্যাট্রিবিউট ----
{
  const M = require(path.join(ROOT, 'js/layout-engine/doc-mhtml-packager.js'));
  const tag = '<img src="data:image/png;base64,AAAA" style="width:69.0pt;height:69.7pt;max-width:100%;height:auto;display:inline-block;margin:3pt 0;" alt="Image" />';
  const out = M.sizeImgTags(tag);
  check(/^<img width="92" height="93"/.test(out), 'img gets width/height attributes (pt × 96/72)');
  check(!/height:auto/.test(out) && !/max-width/.test(out) && /width:69\.0pt;height:69\.7pt/.test(out), 'size-breaking CSS removed, pt size kept');
  const packed = M.pack('<html><body>' + tag + '</body></html>');
  check(packed.images.length === 1 && /width=3D"92"/.test(packed.mhtml), 'pack() applies sizing in MHTML');
  check(M.sizeImgTags('<img src="x.png">') === '<img src="x.png">', 'img without pt style untouched');
}

// ---- ২) ব্রিজ-পেলোডে চিত্র-চাবি ----
const mem = {};
const storage = { setItem: (k, v) => { mem[k] = v; }, getItem: (k) => mem[k] || null, removeItem: (k) => { delete mem[k]; } };
globalThis.localStorage = storage; globalThis.sessionStorage = storage;
const pl = Bridge.sendToStudio({ text: 'abc QZFIG1QZ', figuresKey: 'fig_1_x' });
check(pl.figuresKey === 'fig_1_x', 'bridge payload carries figuresKey');
check(JSON.parse(mem[Bridge.TRANSFER_KEY]).figuresKey === 'fig_1_x', 'figuresKey stored in transfer');
check(Bridge.sendToStudio({ text: 'abc' }).figuresKey === null, 'no figures → null key');

// ---- ৩) ওয়্যারিং (স্ট্যাটিক) ----
const ocr = read('js/ai-ocr-engine.js');
check(/async function prepareSourceFigures\(/.test(ocr), 'shared prepareSourceFigures helper exists');
check((ocr.match(/await prepareSourceFigures\(/g) || []).length === 2, 'used by both download and studio handoff');
check(/FayzarFigureTransfer\.put\(/.test(ocr) && /figuresKey: figuresKey/.test(ocr), 'studio handoff stores figures in IndexedDB and sends key');
check(/return \{ text: FX\.stripTags\(text\), figures: null \}/.test(ocr), 'extraction failure → tags stripped, file still produced');

const studio = read('js/studio-controller.js');
check(/const raw = withoutFigTags\(inputText\.value\.trim\(\)\);/.test(studio), 'studio preview strips raw tags');
check(/const raw = withoutFigTags\(rawWithTags\);/.test(studio), 'studio download strips raw tags');
check(/studioState\.figures = \{\};\s*\n\s*if \(payload\.figuresKey/.test(studio), 'transfer resets old session figures before loading new ones');
check(/FayzarFigureTransfer\.take\(payload\.figuresKey\)/.test(studio), 'studio takes figures from IndexedDB');

const md = read('js/main.js');
check(/FayzarFigureExtractor\.stripTags\(mdText\)/.test(md), '.md upload path strips tags');

for (const f of ['index.html', 'studio.html']) {  // converter.html এখন হোম-পাতা (২০২৬-১০-০৬)
  const h = read(f);
  check(h.includes('js/engines/figure-transfer-store.js') && h.includes('js/layout-engine/figure-extractor.js'), f + ' loads extractor + transfer store');
}
const st = read('studio.html');
check(st.indexOf('figure-transfer-store.js') < st.indexOf('studio-controller.js'), 'studio loads transfer store before controller');

// ---- ৪) Part-16.3: প্রতি প্রশ্নে একই শিরোনাম → এক সেকশন ----
globalThis.Blob = globalThis.Blob || require('node:buffer').Blob;
require(path.join(ROOT, 'tests/lib/harness.js')).loadEngines();
const secs = globalThis.QuestionEngine.parseQuestionPaper([
  'সৃজনশীল প্রশ্ন', '১। প্রথম।', 'ক. লেখো। ২', 'সৃজনশীল প্রশ্ন', '২। দ্বিতীয়।', 'ক. লেখো। ২',
  '### সৃজনশীল প্রশ্ন', '৩। তৃতীয়।', 'সংক্ষিপ্ত প্রশ্ন', '১। ক?', 'সংক্ষিপ্ত প্রশ্ন', '২। খ?'
].join('\n')).sections;
check(secs.length === 2 && secs[0].questions.length === 3 && secs[1].questions.length === 2, 'repeated identical headings merge into one section each');
const secs2 = globalThis.QuestionEngine.parseQuestionPaper(['সৃজনশীল প্রশ্ন', '১। ক।', 'সংক্ষিপ্ত প্রশ্ন', '১। খ?', 'সৃজনশীল প্রশ্ন', '২। গ।'].join('\n')).sections;
check(secs2.length === 3, 'non-adjacent repeat of a heading stays a separate section');

console.log(`Part-16.2 figure-handoff: ${gates} passed`);
