'use strict';

// Part-16.1 gates — সোর্স-চিত্র কাটার ইঞ্জিন (js/layout-engine/figure-extractor.js)-এর বিশুদ্ধ হিসাব:
// ট্যাগ পার্স, বক্স→পিক্সেল, কালি-সীমায় নিখুঁতকরণ (লেবেল ভেতরে, পাশের লেখা বাইরে), পটভূমি সাদা,
// দাগ মোছা, ছাঁটা, প্রকৃত মাপ ও কলাম-সীমা, এবং ট্যাগ→মার্কার→মাস্টার .docx-এ ছবি।
// ব্রাউজার-অংশ (pdf.js পাতা আঁকা, ক্যানভাসে কাটা, রিভিউ স্ক্রিন) ব্যবহারকারীর হাতে-পরীক্ষায় যাচাই।
// চালানো: node tests/part-16.1-figure-extractor.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
globalThis.Blob = globalThis.Blob || require('node:buffer').Blob;
require(path.join(ROOT, 'tests/lib/harness.js')).loadEngines();
const X = require(path.join(ROOT, 'js/layout-engine/figure-extractor.js'));
const Ex = require(path.join(ROOT, 'js/layout-engine/fayzar-export.js'));
globalThis.StudioFigurePipeline = require(path.join(ROOT, 'js/engines/studio-figure-pipeline.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));

let gates = 0;
const check = (cond, msg) => { assert.ok(cond, msg); gates++; };

// কৃত্রিম RGBA "স্ক্যান-পাতা"
function page(W, H, bg) {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { data[i * 4] = bg[0]; data[i * 4 + 1] = bg[1]; data[i * 4 + 2] = bg[2]; data[i * 4 + 3] = 255; }
  return { width: W, height: H, data };
}
function fill(img, x0, y0, x1, y1, c) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = (y * img.width + x) * 4; img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; }
}
function frame(img, x0, y0, x1, y1, t, c) { fill(img, x0, y0, x1, y0 + t, c); fill(img, x0, y1 - t, x1, y1, c); fill(img, x0, y0, x0 + t, y1, c); fill(img, x1 - t, y0, x1, y1, c); }

// ---- ১) ট্যাগ ----
const txt = 'প্রশ্ন\n[[FIG:p=2;box=412,96,640,488]]\nক. লেখো\n[[FIG:p=১;box=১০,২০,৩০০,৪০০]]\n[[FIG:p=1;box=500,500,501,501]]\n[[FIG:p=0;box=1,2,3,4]]';
const tags = X.parseTags(txt);
check(tags.length === 2, 'valid tags parsed, degenerate/zero-page tags rejected');
check(tags[0].page === 2 && tags[0].box.join() === '412,96,640,488', 'ASCII tag values');
check(tags[1].page === 1 && tags[1].box.join() === '10,20,300,400', 'Bangla-digit tag values');
check(X.parseTags('[[FIG:p=1;box=600,700,100,200]]')[0].box.join() === '100,200,600,700', 'swapped min/max normalized');
const rep = X.replaceTagsWithMarkers(txt);
check(rep.ids.join() === '1,2' && /QZFIG1QZ/.test(rep.text) && /QZFIG2QZ/.test(rep.text) && !/\[\[FIG/.test(rep.text), 'tags → QZFIGnQZ markers; invalid tags removed');
check(X.hasTags(txt) && !X.hasTags('[ছবি আছে-পৃ:০১]'), 'hasTags');

// ---- ২) বক্স ↔ পিক্সেল ----
const r0 = X.boxToRect([100, 200, 500, 800], 1000, 2000, 0);
check(r0.x === 200 && r0.y === 200 && r0.w === 600 && r0.h === 800, 'boxToRect (x from xmin, y from ymin, page W/H)');
check(X.rectToBox(r0, 1000, 2000).join() === '100,200,500,800', 'rectToBox round-trip');

// ---- ৩) কালি-সীমায় নিখুঁতকরণ ----
// Part-16.3 (আসল PDF-এ যাচাইয়ের পর নতুন চুক্তি): হলদে স্ক্যান-পটভূমি; চিত্র = ফ্রেম (200..400, 200..360);
// লেবেল (370..386, 362..378) ফ্রেম থেকে বিচ্ছিন্ন, Gemini-বক্সে আধা-কাটা; পাশের প্রশ্ন-লেখা (392..700, 371..383)
// বক্সের কিনারা সামান্য ছোঁয়; দূরের লেখা (150..600, 420..432)।
const img = page(800, 600, [238, 232, 200]);
frame(img, 200, 200, 400, 360, 4, [20, 20, 20]);
fill(img, 370, 362, 386, 378, [30, 30, 30]);
fill(img, 392, 371, 700, 383, [25, 25, 25]);
fill(img, 150, 420, 600, 432, [25, 25, 25]);
// Gemini-বক্স খানিকটা ছোট: ফ্রেমের ডান রেখা ও লেবেলের নিচের অর্ধেক কেটে গেছে
const gem = { x: 195, y: 195, w: 199, h: 179 };
const ref = X.refineRect(img, gem, { margin: 0 });
check(ref.x === 200 && ref.y === 200, 'refine: shrinks to figure ink (left/top)');
check(ref.x + ref.w === 400, 'refine: completes the figure line cut by the box, but not the edge-touching text line');
check(ref.y + ref.h === 378, 'refine: half-cut label recovered fully; distant text excluded');
const empty = X.refineRect(page(100, 100, [255, 255, 255]), { x: 10, y: 10, w: 50, h: 50 });
check(empty.empty === true, 'refine: blank area flagged empty, rect kept');

// ---- ৪) পরিষ্কার ও ছাঁটা ----
const crop = page(120, 80, [238, 232, 200]);
fill(crop, 30, 20, 90, 24, [20, 20, 20]);     // রেখা
fill(crop, 5, 70, 6, 71, [10, 10, 10]);        // বিচ্ছিন্ন দাগ
X.cleanImage(crop);
const px = (x, y) => Array.from(crop.data.slice((y * 120 + x) * 4, (y * 120 + x) * 4 + 3));
check(px(100, 60).join() === '255,255,255', 'clean: yellowish scan background → pure white');
check(px(50, 22)[0] < 60, 'clean: line ink stays dark');
check(px(5, 70).join() === '255,255,255', 'clean: isolated speck removed');
const t = X.trimRect(crop, 2);
check(t.x === 28 && t.y === 18 && t.w === 64 && t.h === 8, 'trim: tight box around ink + margin');

// ---- ৫) মাপ ----
const s1 = X.physicalSize(600, 2480, 8.27, 4.7);   // A4 প্রস্থের ~২৪%
check(Math.abs(s1.widthIn - 2.001) < 0.01 && s1.cssW === 192 && !s1.clamped, 'physical size: 600/2480 × 8.27in ≈ 2.0in → 192 css px');
const s2 = X.physicalSize(2000, 2480, 8.27, 4.7);
check(s2.clamped && s2.widthIn === 4.7, 'physical size clamped to column text width');
const cqMax = X.maxWidthIn('EXAM_CQ');
check(Math.abs(cqMax - (7195 - 432) / 1440) < 0.01, 'max width from CQ booklet geometry (colW − indent)');
check(X.maxWidthIn('EXAM_GENERAL') < cqMax, 'general portrait column narrower than CQ booklet');

// ---- ৬) ট্যাগ → মার্কার → মাস্টার .docx-এ ছবি (একক রপ্তানি-পথ) ----
(async () => {
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  const md = '১। নিচের চিত্রে O কেন্দ্র।\n[[FIG:p=1;box=100,100,400,500]]\nক. প্রশ্ন ১ ২';
  const { text, ids } = X.replaceTagsWithMarkers(md);
  const figures = { [ids[0]]: { dataUrl: 'data:image/png;base64,' + PNG, pxW: 600, pxH: 400, cssW: 192, align: 'center', source: 'ocr', page: 1 } };
  const res = await Ex.produce(text, { format: 'docx-unicode', docType: 'EXAM_CQ', figures });
  const z = await JSZip.loadAsync(Buffer.from(await res.blob.arrayBuffer()));
  const xml = await z.file('word/document.xml').async('string');
  check(!!z.file('word/media/figure1.png') && /<w:drawing>/.test(xml), 'source figure embedded in master .docx');
  check(/cx="1828800"/.test(xml), 'figure width 192 css px = 2.0in (1828800 EMU) in Word');
  check(!/QZFIG|\[\[FIG/.test(xml), 'no marker/tag text left in the document');
  console.log(`Part-16.1 figure-extractor gates: ${gates} passed, 0 failed`);
})().catch((e) => { console.error(e); process.exit(1); });
