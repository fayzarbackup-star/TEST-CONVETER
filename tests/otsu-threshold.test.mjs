/**
 * Fayzar — Otsu ডায়নামিক থ্রেশহোল্ড পরীক্ষা (A3_OTSU_v3)
 * ========================================================
 * ৭টি পরীক্ষা:
 *  ১. সুইচ বন্ধে বাইট-সমতা (__FZ_ON_OTSU বন্ধে ১৬০ স্থির থ্রেশহোল্ডের সাথে হুবহু মিল)
 *  ২. স্পষ্ট thr (সুইচ চালু থাকলেও প্রদত্ত thr অগ্রাধিকার পায় ও mask.thr-এ সংরক্ষিত হয়)
 *  ৩. পরিষ্কার স্ক্যান (উজ্জ্বল পটভূমি + গাঢ় কালিতে সঠিক লাইন ও mask.thr নির্ণয়)
 *  ৪. ফিকে কালি (হালকা ধূসর লেখা ~১৭০–১৮৫ উদ্ধার ও mask.thr > ১৭৫)
 *  ৫. অসম আলো (এক পাশে উজ্জ্বল, অন্য পাশে ছায়া — ছায়াকে কালি না ভেবে দুই পাশের লেখাই উদ্ধার)
 *  ৬. কম আলো (ম্লান পটভূমি ~১৪০–১৪৫ — পুরো পাতা কালো না হয়ে লেখা ও পটভূমি আলাদা করা)
 *  ৭. গতি <৫০০ms (পূর্ণ A4 ১৫০ DPI পাতায় ৫০০ মিলিসেকেন্ডের অনেক কম সময়ে সম্পন্ন)
 */
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PG = require('../js/layout-engine/faithful/page-geometry.js');

/** সিন্থেটিক RGBA ছবি তৈরির সহায়ক */
function makeImg(W, H, bgFn) {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = typeof bgFn === 'function' ? bgFn(x, y, W, H) : bgFn;
      const i = (y * W + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { width: W, height: H, data };
}

/** ছবিতে লেখার লাইনের মতো শব্দ-খণ্ড আঁকা */
function drawTextLine(img, y0, h, xStart, xEnd, inkVal, wordW = 18, gapW = 8) {
  const { width: W, height: H, data } = img;
  let pixels = 0;
  for (let x = xStart; x + 4 <= xEnd; x += wordW + gapW) {
    const w = Math.min(wordW, xEnd - x);
    for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) {
      for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) {
        const v = typeof inkVal === 'function' ? inkVal(xx, y) : inkVal;
        const i = (y * W + xx) * 4;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        pixels++;
      }
    }
  }
  return pixels;
}

/** রেফারেন্স স্থির থ্রেশহোল্ড মাস্ক (পুরোনো আচরণ) */
function legacyMask(img, thr) {
  const T = thr || 160, W = img.width, H = img.height, d = img.data, N = W * H;
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if ((d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000 < T) mask[i] = 1;
  }
  return { W, H, mask };
}

/** নির্দিষ্ট আয়তে কালির পিক্সেল গণনা */
function countInkInRect(m, x0, y0, x1, y1) {
  let c = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (m.mask[y * m.W + x]) c++;
    }
  }
  return c;
}

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  const prev = globalThis.__FZ_ON_OTSU;
  try {
    fn();
    passed++;
    console.log(`  [পাস] ${name}`);
  } catch (err) {
    failed++;
    console.error(`  [ব্যর্থ] ${name}: ${err.message}`);
  } finally {
    if (prev === undefined) delete globalThis.__FZ_ON_OTSU;
    else globalThis.__FZ_ON_OTSU = prev;
  }
}

// ১. সুইচ বন্ধে বাইট-সমতা
runTest('১. সুইচ বন্ধে বাইট-সমতা (__FZ_ON_OTSU বন্ধ)', () => {
  delete globalThis.__FZ_ON_OTSU;
  const samples = [
    makeImg(320, 240, 248),
    makeImg(320, 240, (x) => Math.round(245 - (x / 320) * 110)),
    makeImg(320, 240, 142)
  ];
  drawTextLine(samples[0], 40, 14, 30, 290, 25);
  drawTextLine(samples[0], 90, 14, 30, 290, 175);
  drawTextLine(samples[1], 60, 14, 30, 290, 35);
  drawTextLine(samples[2], 80, 14, 30, 290, 30);

  for (const img of samples) {
    const actual = PG.inkMask(img);
    const expected = legacyMask(img);
    assert.equal(actual.W, expected.W);
    assert.equal(actual.H, expected.H);
    assert.deepEqual(Object.keys(actual), ['W', 'H', 'mask'], 'সুইচ বন্ধে অতিরিক্ত enumerable কী থাকবে না');
    assert.equal(Buffer.compare(Buffer.from(actual.mask), Buffer.from(expected.mask)), 0, 'বাইট-বাই-বাইট মাস্ক সমান হতে হবে');
    assert.equal(actual.thr, 160, 'ডিবাগের জন্য অ-গণনযোগ্য thr ১৬০ থাকবে');
  }
  assert.equal(PG.otsuThreshold(samples[2]), 160, 'সুইচ বন্ধে otsuThreshold কমপক্ষে ১৬০ ফেরত দেবে');
  assert.equal(PG.pageBackground(samples[2]), 255, 'সুইচ বন্ধে pageBackground ১৫০-সীমার পুরোনো আচরণ বজায় রাখবে');
});

// ২. স্পষ্ট thr
runTest('২. স্পষ্ট thr (সুইচ চালু থাকলেও প্রদত্ত thr কার্যকর)', () => {
  const img = makeImg(320, 240, 245);
  drawTextLine(img, 50, 14, 30, 280, 30);
  drawTextLine(img, 110, 14, 30, 280, 172);

  for (const customThr of [130, 160, 185]) {
    delete globalThis.__FZ_ON_OTSU;
    const offRes = PG.inkMask(img, customThr);
    globalThis.__FZ_ON_OTSU = true;
    const onRes = PG.inkMask(img, customThr);
    const refRes = legacyMask(img, customThr);

    assert.equal(onRes.thr, customThr, `mask.thr স্পষ্ট থ্রেশহোল্ড (${customThr}) হতে হবে`);
    assert.equal(Buffer.compare(Buffer.from(onRes.mask), Buffer.from(offRes.mask)), 0, 'সুইচ চালু ও বন্ধে স্পষ্ট thr-এর মাস্ক অভিন্ন হবে');
    assert.equal(Buffer.compare(Buffer.from(onRes.mask), Buffer.from(refRes.mask)), 0);
  }
});

// ৩. পরিষ্কার স্ক্যান
runTest('৩. পরিষ্কার স্ক্যান (উজ্জ্বল পাতা ও গাঢ় কালি)', () => {
  const W = 480, H = 360;
  const img = makeImg(W, H, 248);
  drawTextLine(img, 60, 14, 40, 440, 22);
  drawTextLine(img, 100, 14, 40, 440, 25);
  drawTextLine(img, 140, 14, 40, 360, 20);

  globalThis.__FZ_ON_OTSU = true;
  const m = PG.inkMask(img);
  assert.equal(typeof m.thr, 'number', 'mask.thr সংখ্যা হতে হবে');
  assert.ok(m.thr >= 110 && m.thr <= 200, `mask.thr ১১০–২০০ সীমায় থাকতে হবে (পাওয়া গেছে: ${m.thr})`);
  assert.ok(m.thr >= 140 && m.thr <= 170, `পরিষ্কার স্ক্যানে mask.thr মাঝারি (~১৪০–১৭০) হবে (পাওয়া গেছে: ${m.thr})`);
  assert.equal(PG.otsuThreshold(img), m.thr, 'otsuThreshold(img) ও mask.thr অভিন্ন হবে');

  const comps = PG.components(m);
  const lines = PG.linesOf(comps, H);
  assert.equal(lines.length, 3, '৩টি মুদ্রিত লাইন সঠিকভাবে শনাক্ত হতে হবে');
  assert.equal(countInkInRect(m, 0, 200, W, H), 0, 'ফাঁকা পটভূমিতে কোনো ভুয়া কালি থাকবে না');
});

// ৪. ফিকে কালি
runTest('৪. ফিকে কালি (হালকা ধূসর লেখা ~১৭০–১৮৫ উদ্ধার)', () => {
  const W = 480, H = 360;
  const img = makeImg(W, H, 246);
  // ১টি গাঢ় শিরোনাম ও ৩টি ফিকে ধূসর লাইন (লুমিন্যান্স ১৭৬ — স্থির ১৬০-এ সম্পূর্ণ অদৃশ্য)
  drawTextLine(img, 50, 16, 40, 420, 30);
  drawTextLine(img, 110, 14, 40, 420, 176);
  drawTextLine(img, 150, 14, 40, 420, 176);
  drawTextLine(img, 190, 14, 40, 380, 176);

  delete globalThis.__FZ_ON_OTSU;
  const mOff = PG.inkMask(img);
  const linesOff = PG.linesOf(PG.components(mOff), H);
  assert.equal(linesOff.length, 1, 'সুইচ বন্ধে (১৬০) ফিকে লাইনগুলো ধরা পড়ে না');

  globalThis.__FZ_ON_OTSU = true;
  const mOn = PG.inkMask(img);
  assert.ok(mOn.thr > 176 && mOn.thr <= 200, `ফিকে কালির পাতায় mask.thr > ১৭৬ হতে হবে (পাওয়া গেছে: ${mOn.thr})`);
  assert.equal(PG.otsuThreshold(img), mOn.thr);

  const linesOn = PG.linesOf(PG.components(mOn), H);
  assert.equal(linesOn.length, 4, 'সুইচ চালুতে গাঢ় শিরোনামসহ সব ৪টি লাইনই উদ্ধার হতে হবে');
  assert.equal(PG.pageBackground(img), 246, 'ফিকে কালি বাদ দিয়ে পাতার আসল পটভূমি (২৪৬) নির্ণীত হবে');
});

// ৫. অসম আলো
runTest('৫. অসম আলো / ছায়া (বাঁয়ে উজ্জ্বল ২৪৫, ডানে ছায়া ১৩০)', () => {
  const W = 640, H = 400;
  // বাঁ প্রান্ত ২৪৫ থেকে ডান প্রান্তে ১৩০ লুমিন্যান্সের ছায়া-ঢাল (x >= ৪৮০ অংশে পটভূমি <= ১৫৮ < ১৬০)
  const img = makeImg(W, H, (x) => Math.round(245 - (x / (W - 1)) * 115));
  for (const y of [70, 130, 190]) {
    drawTextLine(img, y, 14, 40, 600, (x) => (x < W / 2 ? 40 : 35));
  }

  delete globalThis.__FZ_ON_OTSU;
  const mOff = PG.inkMask(img);
  const shadowBgOff = countInkInRect(mOff, 500, 260, 620, 380);
  assert.equal(shadowBgOff, (620 - 500) * (380 - 260), 'স্থির ১৬০-এ ছায়াযুক্ত ফাঁকা অংশ পুরোটাই কালো কালি হয়ে যায়');

  globalThis.__FZ_ON_OTSU = true;
  const mOn = PG.inkMask(img);
  assert.ok(mOn.thr >= 110 && mOn.thr <= 200, `mask.thr ১১০–২০০ সীমায় থাকবে (পাওয়া গেছে: ${mOn.thr})`);

  const shadowBgOn = countInkInRect(mOn, 500, 260, 620, 380);
  assert.equal(shadowBgOn, 0, 'Otsu চালুতে ছায়াযুক্ত ফাঁকা পটভূমিতে কোনো ভুয়া কালি থাকবে না');

  const leftInk = countInkInRect(mOn, 40, 65, 300, 215);
  const rightInk = countInkInRect(mOn, 340, 65, 600, 215);
  assert.ok(leftInk > 1500, 'উজ্জ্বল বাঁ পাশের লেখা পূর্ণ উদ্ধার হবে');
  assert.ok(rightInk > 1500, 'ছায়াযুক্ত ডান পাশের লেখাও পূর্ণ উদ্ধার হবে');

  const linesOn = PG.linesOf(PG.components(mOn), H);
  assert.equal(linesOn.length, 3, 'অসম আলো সত্ত্বেও ৩টি লাইন অক্ষুণ্ণ থাকবে');
});

// ৬. কম আলো
runTest('৬. কম আলো (ম্লান স্ক্যান: পটভূমি ১৪২, কালি ৩৫)', () => {
  const W = 480, H = 360;
  const img = makeImg(W, H, 142);
  drawTextLine(img, 60, 14, 40, 440, 35);
  drawTextLine(img, 110, 14, 40, 440, 35);
  drawTextLine(img, 160, 14, 40, 380, 35);

  // নিচে একটি গাঢ় ব্যান্ড (পটভূমি ২৮, ভেতরে হালকা লেখা ১৪২)
  for (let y = 250; y < 290; y++) {
    for (let x = 40; x < 440; x++) {
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 28;
    }
  }
  drawTextLine(img, 262, 14, 60, 420, 142);

  delete globalThis.__FZ_ON_OTSU;
  const mOff = PG.inkMask(img);
  assert.equal(countInkInRect(mOff, 0, 0, W, 220), W * 220, 'স্থির ১৬০-এ ১৪২ পটভূমির পুরো পাতাই কালো হয়ে যায়');

  globalThis.__FZ_ON_OTSU = true;
  const mOn = PG.inkMask(img);
  assert.ok(mOn.thr >= 110 && mOn.thr < 140, `কম আলোতে mask.thr < ১৪০ (১১০–১৩৯) হতে হবে (পাওয়া গেছে: ${mOn.thr})`);
  assert.equal(PG.otsuThreshold(img), mOn.thr);
  assert.equal(countInkInRect(mOn, 0, 0, W, 45), 0, 'কম আলোর পটভূমি কালি হিসেবে গণ্য হবে না');

  const topComps = PG.components(mOn, { x0: 0, y0: 0, x1: W, y1: 220 });
  const linesOn = PG.linesOf(topComps, H);
  assert.equal(linesOn.length, 3, 'কম আলোর পাতায় ৩টি লেখার লাইন স্পষ্ট আলাদা হবে');
  assert.equal(PG.pageBackground(img), 142, 'কম আলোর পাতায় pageBackground সঠিক পটভূমি (১৪২) দেবে');

  const dm = PG.darkBandMask(img, [250 / H * 1000, 40 / W * 1000, 290 / H * 1000, 440 / W * 1000]);
  assert.ok(dm && dm.thr >= 110 && dm.thr < 140, 'গাঢ় ব্যান্ডেও Otsu থ্রেশহোল্ড (dm.thr) নির্ণীত হবে');
  assert.ok(countInkInRect(dm, 60, 260, 420, 280) > 400, 'কম আলোতেও গাঢ় ব্যান্ডের ভেতরের হালকা লেখা উদ্ধার হবে');
});

// ৭. গতি <৫০০ms
runTest('৭. গতি <৫০০ms (পূর্ণ A4 ১৫০ DPI পাতা: ১২৪০×১৭৫৪ পিক্সেল)', () => {
  const W = 1240, H = 1754;
  const img = makeImg(W, H, (x, y) => Math.round(245 - (x / W) * 40 - (y / H) * 20));
  for (let y = 100; y < 1600; y += 36) {
    drawTextLine(img, y, 16, 90, 1150, y % 72 === 0 ? 172 : 30, 24, 10);
  }

  globalThis.__FZ_ON_OTSU = true;
  const t0 = performance.now();
  const m = PG.inkMask(img);
  const elapsedMs = performance.now() - t0;

  assert.equal(m.mask.length, W * H);
  assert.ok(m.thr >= 110 && m.thr <= 200, `mask.thr বৈধ সীমায় থাকতে হবে (পাওয়া গেছে: ${m.thr})`);
  assert.ok(elapsedMs < 500, `গতি ৫০০ms-এর কম হতে হবে (লেগেছে: ${elapsedMs.toFixed(1)}ms)`);
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exitCode = 1;
