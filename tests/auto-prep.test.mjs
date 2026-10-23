// tests/auto-prep.test.mjs — পাতা-প্রস্তুতি স্বয়ংক্রিয় মডিউল টেস্ট (Uint8Array, canvas ছাড়া)
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AP = require('../js/image-prep/auto-prep.js');

let pass = 0, fail = 0;
function test(name, fn) {
  try {
    fn();
    pass++;
    console.log('PASS:', name);
  } catch (err) {
    fail++;
    console.error('FAIL:', name, err.message);
  }
}

// -------------------------------------------------------------------
// ১. ফাঁকা সাদা ছবি -> সব 0 / false
// -------------------------------------------------------------------
test('ফাঁকা সাদা ছবি -> সব 0/false', () => {
  const w = 300, h = 400;
  const blank = new Uint8Array(w * h).fill(255);

  const rot = AP.detectOrientation(blank, w, h);
  assert.equal(rot, 0, 'Orientation should be 0');

  const spread = AP.detectSpread(blank, w, h);
  assert.equal(spread.split, false, 'Spread split should be false');

  const skew = AP.detectSkew(blank, w, h);
  assert.equal(skew, 0, 'Skew should be 0');

  const box = AP.contentBox(blank, w, h);
  assert.equal(box.x, 0);
  assert.equal(box.y, 0);
  assert.equal(box.w, w);
  assert.equal(box.h, h);
});

// -------------------------------------------------------------------
// ২. আড়াআড়ি লাইন -> detectOrientation = 0
// -------------------------------------------------------------------
function makeHorizontalLines(w, h) {
  const img = new Uint8Array(w * h).fill(255);
  // বিভিন্ন দৈর্ঘ্যের আড়াআড়ি লাইন, কিন্তু সবগুলো বাম মার্জিন x=40 থেকে শুরু
  const lines = [50, 80, 110, 140, 170, 200, 230, 260];
  const lengths = [200, 250, 180, 270, 220, 240, 190, 260];

  lines.forEach((y, idx) => {
    const len = lengths[idx % lengths.length];
    for (let dy = 0; dy <= 2; dy++) {
      for (let x = 40; x < 40 + len && x < w - 20; x++) {
        img[(y + dy) * w + x] = 0;
      }
    }
  });
  return img;
}

test('আড়াআড়ি লাইন -> 0', () => {
  const w = 400, h = 300;
  const img = makeHorizontalLines(w, h);
  const rot = AP.detectOrientation(img, w, h);
  assert.equal(rot, 0, `Expected orientation 0, got ${rot}`);
});

// -------------------------------------------------------------------
// ৩. একই ছবি ট্রান্সপোজ (ডানে/বাঁয়ে) -> ঠিক 90 / 270
// -------------------------------------------------------------------
test('একই ছবি ট্রান্সপোজ (ডানে/বাঁয়ে) -> ঠিক 90/270', () => {
  const origW = 400, origH = 300;
  const orig = makeHorizontalLines(origW, origH);

  // ডানে ৯০° ঘোরানো (ঘড়ির কাঁটার দিকে):
  // newX = origH - 1 - origY, newY = origX
  const rW = origH, rH = origW;
  const rotRight = new Uint8Array(rW * rH).fill(255);
  for (let y = 0; y < origH; y++) {
    for (let x = 0; x < origW; x++) {
      if (orig[y * origW + x] === 0) {
        const nx = origH - 1 - y;
        const ny = x;
        rotRight[ny * rW + nx] = 0;
      }
    }
  }

  // বাঁয়ে ৯০° ঘোরানো (ঘড়ির কাঁটার উল্টো, অর্থাৎ ২৭০° ঘড়ির কাঁটার দিকে):
  // newX = origY, newY = origW - 1 - origX
  const rotLeft = new Uint8Array(rW * rH).fill(255);
  for (let y = 0; y < origH; y++) {
    for (let x = 0; x < origW; x++) {
      if (orig[y * origW + x] === 0) {
        const nx = y;
        const ny = origW - 1 - x;
        rotLeft[ny * rW + nx] = 0;
      }
    }
  }

  const rotR = AP.detectOrientation(rotRight, rW, rH);
  const rotL = AP.detectOrientation(rotLeft, rW, rH);

  assert.equal(rotR, 270, `Transposed right should detect 270 to restore, got ${rotR}`);
  assert.equal(rotL, 90, `Transposed left should detect 90 to restore, got ${rotL}`);
});

// -------------------------------------------------------------------
// ৩.১ মাত্রা-সহ লাইন: ৯০ বনাম ২৭০ দিক নির্ণয়
// -------------------------------------------------------------------
test('মাত্রা-সহ লাইন: ৯০ বনাম ২৭০ দিক নির্ণয়', () => {
  const origW = 400, origH = 300;
  const orig = new Uint8Array(origW * origH).fill(255);
  const lineYs = [40, 80, 120, 160, 200, 240];
  lineYs.forEach((y0, idx) => {
    const offset = idx * 7;
    for (let x = 40; x <= 360; x++) {
      if (((x + offset) % 35) >= 28) continue; // শব্দ-ব্যবধান (ওয়ার্ড স্পেস)
      // ওপরে মাত্রা (dy = 0..2)
      for (let dy = 0; dy <= 2; dy++) orig[(y0 + dy) * origW + x] = 0;
      // নিচে বর্ণদেহ (dy = 3..14)
      for (let dy = 3; dy <= 14; dy++) {
        if (((x + offset) % 9) !== 0) orig[(y0 + dy) * origW + x] = 0;
      }
    }
  });

  // ডানে ৯০° ঘোরানো (restoration needs 270)
  const rW = origH, rH = origW;
  const rotRight = new Uint8Array(rW * rH).fill(255);
  for (let y = 0; y < origH; y++) {
    for (let x = 0; x < origW; x++) {
      if (orig[y * origW + x] === 0) rotRight[x * rW + (origH - 1 - y)] = 0;
    }
  }

  // বাঁয়ে ৯০° ঘোরানো (restoration needs 90)
  const rotLeft = new Uint8Array(rW * rH).fill(255);
  for (let y = 0; y < origH; y++) {
    for (let x = 0; x < origW; x++) {
      if (orig[y * origW + x] === 0) rotLeft[(origW - 1 - x) * rW + y] = 0;
    }
  }

  const rotR = AP.detectOrientation(rotRight, rW, rH);
  const rotL = AP.detectOrientation(rotLeft, rW, rH);

  assert.equal(rotR, 270, `Matra lines transposed right should detect 270, got ${rotR}`);
  assert.equal(rotL, 90, `Matra lines transposed left should detect 90, got ${rotL}`);
});

// -------------------------------------------------------------------
// ৪. দুই পাতা + মাঝে ফাঁক -> split, x ফাঁকের ±২%
// -------------------------------------------------------------------
test('দুই পাতা + মাঝে ফাঁক -> split, x ফাঁকের ±২%', () => {
  const w = 600, h = 400; // w/h = 1.5 >= 1.15; h/(w/2) = 400/300 = 1.33 >= 1.1
  const img = new Uint8Array(w * h).fill(255);

  // বাম পাতা: x = 40 .. 260
  for (let y = 50; y <= 350; y += 20) {
    for (let x = 40; x <= 260; x++) {
      img[y * w + x] = 0;
      img[(y + 1) * w + x] = 0;
    }
  }

  // মাঝের ফাঁক: x = 261 .. 339 (মাঝামাঝি ৩০০)

  // ডান পাতা: x = 340 .. 560
  for (let y = 50; y <= 350; y += 20) {
    for (let x = 340; x <= 560; x++) {
      img[y * w + x] = 0;
      img[(y + 1) * w + x] = 0;
    }
  }

  const res = AP.detectSpread(img, w, h);
  assert.equal(res.split, true, 'Spread should be detected');

  const expectedMid = 300;
  const tolerance = w * 0.02; // ±১২ পিক্সেল
  assert.ok(
    Math.abs(res.x - expectedMid) <= tolerance,
    `Expected split x near ${expectedMid} ±${tolerance}, got ${res.x}`
  );
});

// -------------------------------------------------------------------
// ৫. এক পাতা ২-কলাম লেখা (খাড়া ছবি) -> split নয়
// -------------------------------------------------------------------
test('এক পাতা ২-কলাম লেখা (খাড়া ছবি) -> split নয়', () => {
  const w = 400, h = 600; // খাড়া ছবি: w/h = 0.67 < 1.15
  const img = new Uint8Array(w * h).fill(255);

  // কলাম ১
  for (let y = 50; y <= 550; y += 20) {
    for (let x = 30; x <= 180; x++) {
      img[y * w + x] = 0;
    }
  }
  // কলাম ২
  for (let y = 50; y <= 550; y += 20) {
    for (let x = 220; x <= 370; x++) {
      img[y * w + x] = 0;
    }
  }

  const res = AP.detectSpread(img, w, h);
  assert.equal(res.split, false, 'Single-page 2-column portrait must NOT split');
});

// -------------------------------------------------------------------
// ৬. ৩° বাঁকা লাইন -> detectSkew ≈ ৩ (±০.৫)
// -------------------------------------------------------------------
test('৩° বাঁকা লাইন -> detectSkew ≈ ৩ (±০.৫)', () => {
  const w = 500, h = 400;
  const img = new Uint8Array(w * h).fill(255);
  const angleRad = (3.0 * Math.PI) / 180;
  const tanA = Math.tan(angleRad);

  const lineYs = [80, 130, 180, 230, 280, 330];
  lineYs.forEach((y0) => {
    for (let x = 50; x <= 450; x++) {
      const y = Math.round(y0 + (x - 250) * tanA);
      if (y >= 0 && y < h - 1) {
        img[y * w + x] = 0;
        img[(y + 1) * w + x] = 0;
      }
    }
  });

  const skew = AP.detectSkew(img, w, h);
  assert.ok(
    Math.abs(skew - 3.0) <= 0.5,
    `Expected skew ≈ 3.0 (±0.5), got ${skew}`
  );
});

// -------------------------------------------------------------------
// ৭. contentBox টেস্ট
// -------------------------------------------------------------------
test('contentBox: কালির চারপাশে মার্জিনসহ বাক্স', () => {
  const w = 400, h = 300;
  const img = new Uint8Array(w * h).fill(255);

  // কালি এলাকা: x = 100 .. 300, y = 80 .. 220
  for (let y = 80; y <= 220; y++) {
    for (let x = 100; x <= 300; x++) {
      img[y * w + x] = 0;
    }
  }

  const box = AP.contentBox(img, w, h);
  assert.ok(box.x <= 100, `box.x should be <= 100, got ${box.x}`);
  assert.ok(box.y <= 80, `box.y should be <= 80, got ${box.y}`);
  assert.ok(box.x + box.w >= 300, `box right should be >= 300, got ${box.x + box.w}`);
  assert.ok(box.y + box.h >= 220, `box bottom should be >= 220, got ${box.y + box.h}`);
});

// -------------------------------------------------------------------
// ৮. toGray ও Otsu টেস্ট (RGBA ইনপুট)
// -------------------------------------------------------------------
test('toGray: ছোট করা ও Otsu থ্রেশহোল্ড', () => {
  const W = 2000, H = 1000;
  const rgba = new Uint8ClampedArray(W * H * 4);
  // সাদা ব্যাকগ্রাউন্ড (255, 255, 255, 255)
  rgba.fill(255);
  // মাঝে কালো টেক্সট (0, 0, 0, 255)
  for (let y = 300; y < 700; y++) {
    for (let x = 600; x < 1400; x++) {
      const idx = (y * W + x) * 4;
      rgba[idx] = 0; rgba[idx + 1] = 0; rgba[idx + 2] = 0;
    }
  }

  const g = AP.toGray({ data: rgba, width: W, height: H }, 1000);
  assert.equal(g.width, 1000, 'Width should be scaled down to 1000');
  assert.equal(g.height, 500, 'Height should be scaled down to 500');
  assert.ok(g.gray instanceof Uint8Array);
  assert.ok(g.bin instanceof Uint8Array);
  assert.ok(g.threshold >= 0 && g.threshold <= 255);
});

// -------------------------------------------------------------------
// ৯. isReliableQuad টেস্ট
// -------------------------------------------------------------------
test('isReliableQuad: চতুর্ভুজ যাচাই', () => {
  const W = 1000, H = 800;
  // স্বাভাবিক উত্তল চতুর্ভুজ (৭০% ক্ষেত্রফল)
  const good = [
    { x: 100, y: 100 },
    { x: 900, y: 120 },
    { x: 880, y: 720 },
    { x: 120, y: 700 }
  ];
  assert.equal(AP.isReliableQuad(good, W, H), true, 'Good quad should be reliable');

  // পুরো ফ্রেম (ফ্রেম নয় হতে হবে)
  const fullFrame = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: H },
    { x: 0, y: H }
  ];
  assert.equal(AP.isReliableQuad(fullFrame, W, H), false, 'Full frame quad should be rejected');

  // অতিরিক্ত ছোট (ক্ষেত্রফল < ৪০%)
  const tiny = [
    { x: 400, y: 300 },
    { x: 600, y: 300 },
    { x: 600, y: 500 },
    { x: 400, y: 500 }
  ];
  assert.equal(AP.isReliableQuad(tiny, W, H), false, 'Tiny quad should be rejected');
});

console.log(`\nauto-prep: ${pass} passed, ${fail} failed (${pass} পাস, ${fail} ব্যর্থ)`);
if (fail > 0) process.exit(1);
