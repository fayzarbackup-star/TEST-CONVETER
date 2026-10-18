/**
 * Fayzar — ছকের সারি-ব্যান্ড ও Gemini সারি-মেলানো পরীক্ষা (A3_ROWCHECK_v4)
 * =========================================================================
 * ৮টি পরীক্ষা:
 *  ১. সুইচ বন্ধে null ও বিদ্যমান ফাংশনের বাইট-সমতা (__FZ_ON_ROWCHECK বন্ধ)
 *  ২. সাধারণ ছক (নিরেট আনুভূমিক ও খাড়া রেখা, সঠিক সারি-ব্যান্ড ও 'ok' পরামর্শ)
 *  ৩. ডাবল-লাইন (খুব কাছের দ্বৈত/মোটা বর্ডার রেখা একীভূত হয়ে সঠিক সারি গণনা)
 *  ৪. ভাঙা রেখা (স্ক্যানে ছেঁড়া/ভাঙা সারি-রেখা উদ্ধার)
 *  ৫. underline-যুক্ত ঘর (ঘরের ভেতরের লেখার নিচের ছোট দাগ সারি-রেখা হিসেবে না ধরা)
 *  ৬. ফিকে রেখা (Otsu চালু অবস্থায় হালকা ধূসর ছক-রেখা উদ্ধার)
 *  ৭. ৩০ রেখা বনাম ২৬ Gemini-সারি → 'split' (এবং বিপরীত ক্ষেত্রে 'merge' ও সন্দেহজনক ব্যান্ড শনাক্তকরণ)
 *  ৮. গতি পরীক্ষা (পূর্ণ A4 ১৫০ DPI ১২৪০×১৭৫৪ পাতায় ওয়ার্ম-আপ ও বহু-রানসহ স্থিতিশীল সময়-গেট)
 */
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PG = require('../js/layout-engine/faithful/page-geometry.js');

/** সিন্থেটিক RGBA ছবি তৈরির সহায়ক */
function makeImg(W, H, bgVal = 248) {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H * 4; i += 4) {
    data[i] = bgVal;
    data[i + 1] = bgVal;
    data[i + 2] = bgVal;
    data[i + 3] = 255;
  }
  return { width: W, height: H, data };
}

/** আনুভূমিক রেখা আঁকা (ঐচ্ছিক ভাঙা/ড্যাশ ধাঁচসহ) */
function drawHLine(img, y, x0, x1, lum = 25, thickness = 1, dashPeriod = 0, dashGap = 0) {
  const { width: W, height: H, data } = img;
  for (let dy = 0; dy < thickness; dy++) {
    const yy = y + dy;
    if (yy < 0 || yy >= H) continue;
    for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
      if (dashPeriod > 0 && ((x - x0) % dashPeriod) >= (dashPeriod - dashGap)) continue;
      const i = (yy * W + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = lum;
    }
  }
}

/** খাড়া রেখা আঁকা */
function drawVLine(img, x, y0, y1, lum = 25, thickness = 1) {
  const { width: W, height: H, data } = img;
  for (let dx = 0; dx < thickness; dx++) {
    const xx = x + dx;
    if (xx < 0 || xx >= W) continue;
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) {
      const i = (y * W + xx) * 4;
      data[i] = data[i + 1] = data[i + 2] = lum;
    }
  }
}

/** ঘরের ভেতরে লেখার ব্লক আঁকা */
function drawCellText(img, x0, y0, w, h, lum = 30) {
  const { width: W, height: H, data } = img;
  for (let x = x0; x + 6 <= x0 + w; x += 16) {
    const segW = Math.min(11, x0 + w - x);
    for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) {
      for (let xx = Math.max(0, x); xx < Math.min(W, x + segW); xx++) {
        const i = (y * W + xx) * 4;
        data[i] = data[i + 1] = data[i + 2] = lum;
      }
    }
  }
}

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  const prevRow = globalThis.__FZ_ON_ROWCHECK;
  const prevOtsu = globalThis.__FZ_ON_OTSU;
  try {
    fn();
    passed++;
    console.log(`  [পাস] ${name}`);
  } catch (err) {
    failed++;
    console.error(`  [ব্যর্থ] ${name}: ${err.message}`);
  } finally {
    if (prevRow === undefined) delete globalThis.__FZ_ON_ROWCHECK;
    else globalThis.__FZ_ON_ROWCHECK = prevRow;
    if (prevOtsu === undefined) delete globalThis.__FZ_ON_OTSU;
    else globalThis.__FZ_ON_OTSU = prevOtsu;
  }
}

// ১. সুইচ বন্ধে null
runTest('১. সুইচ বন্ধে null ও বিদ্যমান আচরণের অপরিবর্তনীয়তা', () => {
  delete globalThis.__FZ_ON_ROWCHECK;
  const img = makeImg(400, 300, 248);
  for (const y of [40, 80, 120, 160]) drawHLine(img, y, 40, 360, 20);
  drawVLine(img, 40, 40, 160, 20);
  drawVLine(img, 360, 40, 160, 20);

  const m = PG.inkMask(img);
  assert.equal(PG.tableRowBands(m, [0, 0, 1000, 1000]), null, 'সুইচ বন্ধে tableRowBands অবশ্যই null ফেরত দেবে');
  assert.equal(PG.checkTableRows(m, [0, 0, 1000, 1000], 3), null, 'সুইচ বন্ধে checkTableRows অবশ্যই null ফেরত দেবে');
  assert.equal(PG.countHLines(m, { x0: 40, y0: 35, x1: 361, y1: 165 }), 4, 'বিদ্যমান countHLines অপরিবর্তিত থাকবে');
});

// ২. সাধারণ ছক
runTest('২. সাধারণ ছক (নিরেট রেখা থেকে সঠিক সারি-ব্যান্ড ও match)', () => {
  globalThis.__FZ_ON_ROWCHECK = true;
  const W = 500, H = 400;
  const img = makeImg(W, H, 248);
  const ys = [50, 90, 130, 170, 210, 250, 290]; // ৭টি রেখা ⇒ ৬টি সারি
  for (const y of ys) drawHLine(img, y, 50, 450, 25);
  for (const x of [50, 180, 320, 450]) drawVLine(img, x, 50, 290, 25);
  for (let i = 0; i < ys.length - 1; i++) {
    drawCellText(img, 60, ys[i] + 12, 100, 12, 30);
    drawCellText(img, 190, ys[i] + 12, 110, 12, 30);
  }

  const m = PG.inkMask(img);
  const box = [40 / H * 1000, 40 / W * 1000, 310 / H * 1000, 460 / W * 1000];
  const bands = PG.tableRowBands(m, box);
  assert.equal(bands.length, 6, '৭টি রেখা থেকে ৬টি সারি-ব্যান্ড পাওয়া যাবে');
  for (let i = 0; i < 6; i++) {
    assert.equal(bands[i].y0, ys[i]);
    assert.equal(bands[i].y1, ys[i + 1]);
  }

  const chk = PG.checkTableRows(m, box, 6);
  assert.equal(chk.measured, 6);
  assert.equal(chk.gemini, 6);
  assert.equal(chk.match, true);
  assert.equal(chk.suggestion, 'ok');
});

// ৩. ডাবল-লাইন
runTest('৩. ডাবল-লাইন (খুব কাছের দ্বৈত/মোটা রেখা এক হিসেবে গণনা)', () => {
  globalThis.__FZ_ON_ROWCHECK = true;
  const W = 500, H = 360;
  const img = makeImg(W, H, 248);
  // উপরের বর্ডার (৬০, ৬৪), শিরোনামের নিচে ডাবল-লাইন (১০৪, ১০৮), মাঝের রেখা (১৫০, ১৯৫), নিচের ডাবল-লাইন (২৪০, ২৪৪)
  const rawLines = [60, 64, 104, 108, 150, 195, 240, 244];
  for (const y of rawLines) drawHLine(img, y, 50, 450, 20, 2);
  for (const x of [50, 250, 450]) drawVLine(img, x, 60, 245, 20, 2);

  const m = PG.inkMask(img);
  const box = [40 / H * 1000, 40 / W * 1000, 270 / H * 1000, 460 / W * 1000];
  const bands = PG.tableRowBands(m, box);
  assert.equal(bands.length, 4, 'ডাবল-লাইন একীভূত হয়ে ৫টি বিভাজক থেকে ৪টি সারি-ব্যান্ড হবে');

  const chk = PG.checkTableRows(m, box, 4);
  assert.equal(chk.measured, 4);
  assert.equal(chk.match, true);
  assert.equal(chk.suggestion, 'ok');
});

// ৪. ভাঙা রেখা
runTest('৪. ভাঙা রেখা (স্ক্যানে ছেঁড়া/ভাঙা আনুভূমিক সারি-রেখা উদ্ধার)', () => {
  globalThis.__FZ_ON_ROWCHECK = true;
  const W = 520, H = 380;
  const img = makeImg(W, H, 248);
  const ys = [50, 95, 140, 185, 230, 275]; // ৬টি রেখা ⇒ ৫টি সারি
  drawHLine(img, ys[0], 50, 470, 25); // উপরের নিরেট রেখা
  drawHLine(img, ys[1], 50, 470, 35, 1, 18, 5); // ভাঙা রেখা (৫px ফাঁক)
  drawHLine(img, ys[2], 50, 470, 35, 1, 15, 4); // ভাঙা রেখা (৪px ফাঁক)
  drawHLine(img, ys[3], 50, 470, 25); // নিরেট রেখা
  drawHLine(img, ys[4], 50, 470, 35, 1, 20, 6); // ভাঙা রেখা (৬px ফাঁক)
  drawHLine(img, ys[5], 50, 470, 25); // নিচের নিরেট রেখা
  for (const x of [50, 260, 470]) drawVLine(img, x, 50, 275, 25);

  const m = PG.inkMask(img);
  const box = [35 / H * 1000, 35 / W * 1000, 300 / H * 1000, 485 / W * 1000];
  const bands = PG.tableRowBands(m, box);
  assert.equal(bands.length, 5, 'নিরেট ও ভাঙা রেখা মিলিয়ে সব ৫টি সারি-ব্যান্ড উদ্ধার হতে হবে');

  const chk = PG.checkTableRows(m, box, 5);
  assert.equal(chk.measured, 5);
  assert.equal(chk.match, true);
  assert.equal(chk.suggestion, 'ok');
});

// ৫. underline-যুক্ত ঘর
runTest('৫. underline-যুক্ত ঘর (লেখার নিচের ছোট দাগ সারি-রেখা হিসেবে না ধরা)', () => {
  globalThis.__FZ_ON_ROWCHECK = true;
  const W = 520, H = 360;
  const img = makeImg(W, H, 248);
  const ys = [50, 105, 160, 215, 270]; // ৫টি রেখা ⇒ ৪টি সারি
  for (const y of ys) drawHLine(img, y, 50, 470, 25);
  for (const x of [50, 200, 350, 470]) drawVLine(img, x, 50, 270, 25);

  // প্রতিটি সারির ঘরের ভেতরে লেখা এবং লেখার ঠিক নিচে আন্ডারলাইন (ছোট দৈর্ঘ্য)
  for (let i = 0; i < ys.length - 1; i++) {
    const ty = ys[i] + 16;
    drawCellText(img, 62, ty, 120, 12, 25);
    drawHLine(img, ty + 14, 62, 182, 25, 2); // ১ম কলামে আন্ডারলাইন
    drawCellText(img, 212, ty, 120, 12, 25);
    drawHLine(img, ty + 14, 212, 332, 25, 2); // ২য় কলামে আন্ডারলাইন
  }

  const m = PG.inkMask(img);
  const box = [35 / H * 1000, 35 / W * 1000, 290 / H * 1000, 485 / W * 1000];
  const bands = PG.tableRowBands(m, box);
  assert.equal(bands.length, 4, 'ঘরের ভেতরের আন্ডারলাইন বাদ দিয়ে ঠিক ৪টি সারি-ব্যান্ড পাওয়া যাবে');

  const chk = PG.checkTableRows(m, box, 4);
  assert.equal(chk.measured, 4);
  assert.equal(chk.match, true);
  assert.equal(chk.suggestion, 'ok');
});

// ৬. ফিকে রেখা (Otsu চালু)
runTest('৬. ফিকে রেখা (Otsu চালু অবস্থায় হালকা ধূসর ছক-রেখা উদ্ধার)', () => {
  globalThis.__FZ_ON_OTSU = true;
  globalThis.__FZ_ON_ROWCHECK = true;
  const W = 500, H = 380;
  const img = makeImg(W, H, 246);
  const ys = [45, 90, 135, 180, 225, 270]; // ৬টি রেখা ⇒ ৫টি সারি
  // শিরোনাম গাঢ় (৩০), কিন্তু ছকের রেখা ও বাকি লেখা ফিকে ধূসর (১৭৬ — স্থির ১৬০-এ অদৃশ্য)
  drawCellText(img, 60, 58, 160, 14, 30);
  for (const y of ys) drawHLine(img, y, 50, 450, 176, 2);
  for (const x of [50, 250, 450]) drawVLine(img, x, 45, 270, 176, 2);
  for (let i = 1; i < ys.length - 1; i++) drawCellText(img, 60, ys[i] + 14, 150, 12, 176);

  const m = PG.inkMask(img);
  assert.ok(m.thr > 176, `Otsu থ্রেশহোল্ড ১৭৬-এর বেশি হতে হবে (পাওয়া গেছে: ${m.thr})`);

  const box = [30 / H * 1000, 35 / W * 1000, 290 / H * 1000, 465 / W * 1000];
  const chk = PG.checkTableRows(m, box, 5);
  assert.equal(chk.measured, 5, 'ফিকে রেখার ছকে ৫টি সারি-ব্যান্ডই ধরা পড়বে');
  assert.equal(chk.match, true);
  assert.equal(chk.suggestion, 'ok');
});

// ৭. ৩০ রেখা বনাম ২৬ Gemini-সারি → 'split' (এবং বেশি হলে 'merge')
runTest('৭. ৩০ রেখা বনাম ২৬ Gemini-সারি → split ও সন্দেহজনক ব্যান্ড শনাক্তকরণ', () => {
  globalThis.__FZ_ON_ROWCHECK = true;
  const W = 600, H = 900;
  const img = makeImg(W, H, 248);
  // ৩০টি আনুভূমিক রেখা (২৯টি সারি-ব্যান্ড); এর মধ্যে ২টি ব্যান্ড অস্বাভাবিক উঁচু (৪২px) ও ১টি খুব নিচু (১২px), বাকিগুলো ২৪px
  const ys = [40];
  for (let i = 0; i < 29; i++) {
    const step = (i === 5 || i === 18) ? 42 : (i === 12 ? 12 : 24);
    ys.push(ys[ys.length - 1] + step);
  }
  assert.equal(ys.length, 30, 'ছবিতে মোট ৩০টি আনুভূমিক রেখা থাকবে');
  for (const y of ys) drawHLine(img, y, 40, 560, 25);
  for (const x of [40, 200, 400, 560]) drawVLine(img, x, ys[0], ys[ys.length - 1], 25);

  const m = PG.inkMask(img);
  const box = [20 / H * 1000, 20 / W * 1000, 860 / H * 1000, 580 / W * 1000];
  const chkSplit = PG.checkTableRows(m, box, 26);

  assert.equal(chkSplit.measured, 29, '৩০টি রেখা থেকে ২৯টি সারি-ব্যান্ড মাপা হবে');
  assert.equal(chkSplit.gemini, 26);
  assert.equal(chkSplit.match, false);
  assert.equal(chkSplit.suggestion, 'split', 'Gemini সারি কম হলে suggestion হবে split');
  assert.equal(chkSplit.tallest.h, 42, 'সবচেয়ে উঁচু ব্যান্ড (৪২px) শনাক্ত হবে');
  assert.equal(chkSplit.shortest.h, 12, 'সবচেয়ে নিচু ব্যান্ড (১২px) শনাক্ত হবে');
  assert.ok(chkSplit.suspects.length >= 3, 'অন্তত ৩টি সন্দেহজনক ব্যান্ড তালিকায় থাকবে');
  const suspectIdx = chkSplit.suspects.map((s) => s.index);
  assert.ok(suspectIdx.includes(5) && suspectIdx.includes(18) && suspectIdx.includes(12), 'উঁচু (৫, ১৮) ও নিচু (১২) ব্যান্ডগুলো সন্দেহজনক তালিকায় থাকবে');

  // বিপরীত পরীক্ষা: Gemini সারি বেশি (৩২) হলে suggestion = 'merge'
  const chkMerge = PG.checkTableRows(m, box, 32);
  assert.equal(chkMerge.match, false);
  assert.equal(chkMerge.suggestion, 'merge', 'Gemini সারি বেশি হলে suggestion হবে merge');
});

// ৮. গতি পরীক্ষা (A4 ১৫০DPI — ওয়ার্ম-আপ ও বহু-রান স্থিতিশীল মাপ)
runTest('৮. গতি <২০০ms (পূর্ণ A4 ১৫০ DPI পাতা: ১২৪০×১৭৫৪ পিক্সেল)', () => {
  globalThis.__FZ_ON_ROWCHECK = true;
  const W = 1240, H = 1754;
  const img = makeImg(W, H, 248);
  const ys = [];
  for (let i = 0; i < 30; i++) ys.push(100 + i * 50);
  for (const y of ys) drawHLine(img, y, 80, 1160, 25, 2);
  for (const x of [80, 350, 650, 920, 1160]) drawVLine(img, x, ys[0], ys[ys.length - 1], 25, 2);
  for (let i = 0; i < ys.length - 1; i++) {
    drawCellText(img, 95, ys[i] + 16, 220, 14, 30);
    drawCellText(img, 365, ys[i] + 16, 250, 14, 30);
  }

  const m = PG.inkMask(img);
  const box = [50, 50, 950, 950];

  // V8 JIT (TurboFan) ও ক্যাশ ওয়ার্ম-আপ: বড় পাতায় প্রথম ২টি রানে কম্পাইলেশন ওভারহেড (~১১০ms → ~৫০ms) কাটিয়ে ওঠা
  const WARMUP_RUNS = 2;
  for (let w = 0; w < WARMUP_RUNS; w++) {
    PG.checkTableRows(m, box, 26);
  }

  // ৫ বার চালিয়ে সর্বনিম্ন ও মধ্যমা সময় নেওয়া — যেন সাময়িক OS/GC/run-all লোড-স্পাইকে টেস্ট না ভাঙে, কিন্তু আসল ধীরতা (যেমন ১০× ধীর ≈ ৫০০ms+) ধরা পড়ে
  const MEASURED_RUNS = 5;
  const times = [];
  let chk = null;
  for (let r = 0; r < MEASURED_RUNS; r++) {
    const t0 = performance.now();
    chk = PG.checkTableRows(m, box, 26);
    times.push(performance.now() - t0);
  }
  const sorted = times.slice().sort((a, b) => a - b);
  const minMs = sorted[0];
  const medianMs = sorted[Math.floor(sorted.length / 2)];
  const MIN_LIMIT_MS = 350;
  const MEDIAN_LIMIT_MS = 400;

  assert.equal(chk.measured, 29);
  assert.equal(chk.suggestion, 'split');
  assert.ok(
    minMs < MIN_LIMIT_MS && medianMs < MEDIAN_LIMIT_MS,
    `গতি সীমার কম হতে হবে (সর্বনিম্ন: ${minMs.toFixed(2)}ms < ${MIN_LIMIT_MS}ms, মধ্যমা: ${medianMs.toFixed(2)}ms < ${MEDIAN_LIMIT_MS}ms; সব রান: [${times.map((t) => t.toFixed(1)).join(', ')}]ms)`
  );
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exitCode = 1;
