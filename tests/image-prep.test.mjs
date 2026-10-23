// পর্ব ৫: ছবি প্রস্তুতি — Homography, Blur/Illumination, Corner Detection
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const H = require('../js/image-prep/homography.js');
const LB = require('../js/image-prep/light-blur.js');
const C = require('../js/image-prep/corners.js');

let pass = 0, fail = 0;
function test(name, fn) {
  try {
    fn();
    pass++;
  } catch (err) {
    fail++;
    console.error('FAIL:', name, err.message);
  }
}

// ----------------------------------------------------
// ১. Homography একক টেস্ট (জানা বিন্দু -> জানা ফল)
// ----------------------------------------------------
test('Homography: Identity mapping', () => {
  const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
  const mat = H.findHomography(pts, pts);
  // Check diagonal is ~1, non-diagonal is ~0
  assert.ok(Math.abs(mat[0] - 1) < 1e-6);
  assert.ok(Math.abs(mat[4] - 1) < 1e-6);
  assert.ok(Math.abs(mat[8] - 1) < 1e-6);
  assert.ok(Math.abs(mat[1]) < 1e-6);
  assert.ok(Math.abs(mat[3]) < 1e-6);

  const p = H.applyHomography(mat, 42, 73);
  assert.ok(Math.abs(p.x - 42) < 1e-6 && Math.abs(p.y - 73) < 1e-6);
});

test('Homography: Translation', () => {
  const src = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 80 }, { x: 0, y: 80 }];
  const dst = [{ x: 10, y: 25 }, { x: 60, y: 25 }, { x: 60, y: 105 }, { x: 10, y: 105 }];
  const mat = H.findHomography(src, dst);

  const p = H.applyHomography(mat, 20, 30);
  assert.ok(Math.abs(p.x - 30) < 1e-5, `Expected x=30, got ${p.x}`);
  assert.ok(Math.abs(p.y - 55) < 1e-5, `Expected y=55, got ${p.y}`);
});

test('Homography: Scale & Perspective mapping', () => {
  const src = [{ x: 20, y: 30 }, { x: 180, y: 25 }, { x: 195, y: 220 }, { x: 10, y: 210 }];
  const dst = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 300 }, { x: 0, y: 300 }];
  const mat = H.findHomography(src, dst);

  for (let i = 0; i < 4; i++) {
    const pt = H.applyHomography(mat, src[i].x, src[i].y);
    assert.ok(Math.abs(pt.x - dst[i].x) < 1e-4, `Corner ${i} x mismatch: ${pt.x} vs ${dst[i].x}`);
    assert.ok(Math.abs(pt.y - dst[i].y) < 1e-4, `Corner ${i} y mismatch: ${pt.y} vs ${dst[i].y}`);
  }
});

test('Homography: Paper Size Selection (§৫)', () => {
  // Legal ratio ≈ 1.647
  const legalCorners = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 165 }, { x: 0, y: 165 }];
  assert.equal(H.pickPaperSize(legalCorners).name, 'Legal');

  // Letter ratio ≈ 1.294
  const letterCorners = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 129 }, { x: 0, y: 129 }];
  assert.equal(H.pickPaperSize(letterCorners).name, 'Letter');

  // A4 ratio ≈ 1.414
  const a4Corners = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 142 }, { x: 0, y: 142 }];
  assert.equal(H.pickPaperSize(a4Corners).name, 'A4');
});

test('Homography: Bilinear warp reproduction', () => {
  const W = 10, H_dim = 10;
  const data = new Uint8ClampedArray(W * H_dim * 4);
  for (let y = 0; y < H_dim; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      data[idx] = x * 20;
      data[idx + 1] = y * 20;
      data[idx + 2] = 128;
      data[idx + 3] = 255;
    }
  }
  const srcCorners = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H_dim }, { x: 0, y: H_dim }];
  const warped = H.warpBilinearPixels({ data, width: W, height: H_dim }, W, H_dim, srcCorners);

  assert.equal(warped.width, W);
  assert.equal(warped.height, H_dim);
  // Interior pixel check
  const idx = (5 * W + 5) * 4;
  assert.ok(Math.abs(warped.data[idx] - data[idx]) <= 2);
  assert.ok(Math.abs(warped.data[idx + 1] - data[idx + 1]) <= 2);
});

// ----------------------------------------------------
// ২. ঝাপসা-চেনার টেস্ট (তীক্ষ্ণ বনাম কৃত্রিমভাবে ঝাপসা ছবি)
// ----------------------------------------------------
test('LightBlur: Sharp vs Artificially Blurred detection', () => {
  const W = 60, H_dim = 60;
  const sharpData = new Uint8ClampedArray(W * H_dim * 4);

  // তীক্ষ্ণ লেখা সদৃশ প্যাটার্ন তৈরি (গাঢ় কালি ও সাদা ব্যাকগ্রাউন্ড)
  for (let y = 0; y < H_dim; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const isInk = (x % 6 < 2) && (y % 6 < 4);
      const val = isInk ? 30 : 230;
      sharpData[idx] = val;
      sharpData[idx + 1] = val;
      sharpData[idx + 2] = val;
      sharpData[idx + 3] = 255;
    }
  }

  const sharpRes = LB.detectBlur({ data: sharpData, width: W, height: H_dim });
  assert.equal(sharpRes.isBlurry, false);
  assert.equal(sharpRes.status, '✔');
  assert.ok(sharpRes.laplacianVar > 100, `Expected high lapVar for sharp image, got ${sharpRes.laplacianVar}`);

  // কৃত্রিমভাবে ঝাপসা করা (সব পিক্সেল সহ ৫ বার ৩x৩ বক্স ফিল্টার)
  let blurData = new Uint8ClampedArray(sharpData);
  for (let pass = 0; pass < 6; pass++) {
    const nextData = new Uint8ClampedArray(blurData);
    for (let y = 0; y < H_dim; y++) {
      const y0 = Math.max(0, y - 1), y1 = Math.min(H_dim - 1, y + 1);
      for (let x = 0; x < W; x++) {
        const x0 = Math.max(0, x - 1), x1 = Math.min(W - 1, x + 1);
        let sum = 0, count = 0;
        for (let dy = y0; dy <= y1; dy++) {
          for (let dx = x0; dx <= x1; dx++) {
            sum += blurData[(dy * W + dx) * 4];
            count++;
          }
        }
        const avg = Math.round(sum / count);
        const idx = (y * W + x) * 4;
        nextData[idx] = avg;
        nextData[idx + 1] = avg;
        nextData[idx + 2] = avg;
      }
    }
    blurData = nextData;
  }

  const blurRes = LB.detectBlur({ data: blurData, width: W, height: H_dim });
  assert.equal(blurRes.isBlurry, true);
  assert.equal(blurRes.status, '✘');
  assert.equal(blurRes.message, 'ছবি ঝাপসা — আবার ছবি তুলুন');
  assert.ok(blurRes.laplacianVar < 40, `Expected low lapVar for blurred image, got ${blurRes.laplacianVar}`);
});

test('LightBlur: Illumination equalization', () => {
  const W = 40, H_dim = 40;
  const shadowData = new Uint8ClampedArray(W * H_dim * 4);
  for (let y = 0; y < H_dim; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      // বাঁয়ে অন্ধকার (৬০), ডানে উজ্জ্বল (২২০)
      const grad = Math.round(60 + (x / W) * 160);
      shadowData[idx] = grad;
      shadowData[idx + 1] = grad;
      shadowData[idx + 2] = grad;
      shadowData[idx + 3] = 255;
    }
  }

  const eq = LB.equalizeIllumination({ data: shadowData, width: W, height: H_dim }, 220);
  assert.equal(eq.width, W);
  assert.equal(eq.height, H_dim);
  // বাঁদিকের অন্ধকার উজ্জ্বলতার উন্নতি যাচাই
  const leftIdx = (20 * W + 4) * 4;
  assert.ok(eq.data[leftIdx] > shadowData[leftIdx] + 50, 'Illumination equalization should brighten shadowed side');
});

// ----------------------------------------------------
// ৩. T10, T12, T19, T01 ছবিতে কোণা-খোঁজা ও স্থানাঙ্ক লগিং
// ----------------------------------------------------
test('Corner Detection: T10, T12, T19, T01', () => {
  const playwrightUtils = path.resolve('scratch/test_env/node_modules/playwright-core/lib/utilsBundle.js');
  let decoder;
  if (fs.existsSync(playwrightUtils)) {
    const u = require(playwrightUtils);
    if (u.jpegjs && u.jpegjs.decode) decoder = u.jpegjs.decode;
  }

  const samples = [
    { id: 'T01', file: 'scratch/samples/new/2026-10-22/T- (1).jpeg' },
    { id: 'T10', file: 'scratch/samples/new/2026-10-22/T- (10).jpeg' },
    { id: 'T12', file: 'scratch/samples/new/2026-10-22/T- (12).jpeg' },
    { id: 'T19', file: 'scratch/samples/new/2026-10-22/T- (19).jpeg' }
  ];

  const results = {};

  for (const s of samples) {
    if (!fs.existsSync(s.file) || !decoder) {
      console.log(`[SKIP sample ${s.id}] file or decoder not found`);
      continue;
    }
    const buf = fs.readFileSync(s.file);
    const img = decoder(buf);
    const corners = C.detectCorners(img);

    assert.equal(corners.length, 4, `${s.id} should have 4 corners`);
    for (let i = 0; i < 4; i++) {
      assert.ok(corners[i].x >= 0 && corners[i].x <= img.width, `${s.id} corner ${i} x within bounds`);
      assert.ok(corners[i].y >= 0 && corners[i].y <= img.height, `${s.id} corner ${i} y within bounds`);
    }

    results[s.id] = {
      size: `${img.width}x${img.height}`,
      corners: corners
    };
  }

  // স্থানাঙ্ক লগিং
  console.log('CORNER DETECTION RESULTS:');
  for (const [id, r] of Object.entries(results)) {
    console.log(`  ${id} (${r.size}): [ TL: (${r.corners[0].x}, ${r.corners[0].y}), TR: (${r.corners[1].x}, ${r.corners[1].y}), BR: (${r.corners[2].x}, ${r.corners[2].y}), BL: (${r.corners[3].x}, ${r.corners[3].y}) ]`);
  }
});

console.log(`image-prep: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
