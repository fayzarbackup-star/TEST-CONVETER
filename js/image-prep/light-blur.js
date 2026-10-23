/* ফয়জার এআই কম্পোজ — ছবি-প্রস্তুতি (পর্ব ৫): আলো সমান করা ও ঝাপসা-চেনা।
 * খাঁটি JS; কোনো বাহ্যিক লাইব্রেরি বা OpenCV নেই।
 * ব্রাউজার ও Node.js দুই পরিবেশেই কার্যকর।
 */
(function (root) {
  'use strict';

  /**
   * উজ্জ্বলতা (Luminance) নির্ণয়: Y = 0.299 R + 0.587 G + 0.114 B
   */
  function rgbToY(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  /**
   * আলো সমান করা: বড় ব্লার দিয়ে ভাগ করে অসম ছায়া বা আলোর ঘাটতি দূর করা।
   * img: { data: Uint8Array|Uint8ClampedArray, width, height }
   * targetBrightness: পরিষ্কার সাদা পাতার আদর্শ উজ্জ্বলতা (ডিফল্ট ২৩০)
   */
  function equalizeIllumination(img, targetBrightness) {
    const W = img.width, H = img.height;
    const sdata = img.data;
    const target = targetBrightness || 230;

    // গতি ও মেমরির জন্য ৮ গুণ ছোট গ্রিডে ব্যাকগ্রাউন্ড ইলুমিনেশন অনুমান
    const scale = 8;
    const sW = Math.max(1, Math.ceil(W / scale));
    const sH = Math.max(1, Math.ceil(H / scale));
    const smallGrid = new Float32Array(sW * sH);
    const counts = new Uint16Array(sW * sH);

    // ছোট গ্রিডে গড় উজ্জ্বলতা সঞ্চয়
    for (let y = 0; y < H; y++) {
      const sy = Math.min(sH - 1, Math.floor(y / scale));
      for (let x = 0; x < W; x++) {
        const sx = Math.min(sW - 1, Math.floor(x / scale));
        const idx = (y * W + x) * 4;
        const lum = rgbToY(sdata[idx], sdata[idx + 1], sdata[idx + 2]);
        const sidx = sy * sW + sx;
        smallGrid[sidx] += lum;
        counts[sidx]++;
      }
    }

    for (let i = 0; i < smallGrid.length; i++) {
      if (counts[i] > 0) smallGrid[i] /= counts[i];
      else smallGrid[i] = 200;
    }

    // ছোট গ্রিডে ২ বার ৩x৩ বক্স ব্লার প্রয়োগ (মসৃণ ব্যাকগ্রাউন্ড আলো)
    function boxBlurGrid(grid, gw, gh) {
      const out = new Float32Array(gw * gh);
      for (let y = 0; y < gh; y++) {
        const y0 = Math.max(0, y - 1), y1 = Math.min(gh - 1, y + 1);
        for (let x = 0; x < gw; x++) {
          const x0 = Math.max(0, x - 1), x1 = Math.min(gw - 1, x + 1);
          let sum = 0, n = 0;
          for (let yy = y0; yy <= y1; yy++) {
            for (let xx = x0; xx <= x1; xx++) {
              sum += grid[yy * gw + xx];
              n++;
            }
          }
          out[y * gw + x] = sum / Math.max(1, n);
        }
      }
      return out;
    }

    const blurredGrid = boxBlurGrid(boxBlurGrid(smallGrid, sW, sH), sW, sH);

    // মূল ছবিতে বাইলিনিয়ার ব্যাকগ্রাউন্ড ম্যাপিং ও ভাগ
    const outData = new Uint8ClampedArray(W * H * 4);

    for (let y = 0; y < H; y++) {
      const gy = (y / scale);
      const gy0 = Math.floor(gy);
      const gy1 = Math.min(sH - 1, gy0 + 1);
      const dy = gy - gy0;

      for (let x = 0; x < W; x++) {
        const gx = (x / scale);
        const gx0 = Math.floor(gx);
        const gx1 = Math.min(sW - 1, gx0 + 1);
        const dx = gx - gx0;

        const b00 = blurredGrid[gy0 * sW + gx0];
        const b10 = blurredGrid[gy0 * sW + gx1];
        const b01 = blurredGrid[gy1 * sW + gx0];
        const b11 = blurredGrid[gy1 * sW + gx1];

        const bg = (1 - dx) * (1 - dy) * b00 +
                   dx * (1 - dy) * b10 +
                   (1 - dx) * dy * b01 +
                   dx * dy * b11;

        // ভাগ ও স্কেলিং
        const norm = target / Math.max(25, bg);
        const idx = (y * W + x) * 4;

        outData[idx] = Math.min(255, Math.round(sdata[idx] * norm));
        outData[idx + 1] = Math.min(255, Math.round(sdata[idx + 1] * norm));
        outData[idx + 2] = Math.min(255, Math.round(sdata[idx + 2] * norm));
        outData[idx + 3] = sdata[idx + 3];
      }
    }

    return {
      width: W,
      height: H,
      data: outData
    };
  }

  /**
   * ঝাপসা-চেনা (Blur & Brightness Detection)
   * Laplacian variance ও সামগ্রিক উজ্জ্বলতা নির্ণয় করে
   * মান কম হলে '✘' স্তরের সতর্কতা দেখায় ("ছবি ঝাপসা — আবার ছবি তুলুন")
   */
  function detectBlur(img, opts) {
    const options = opts || {};
    const varThreshold = options.varThreshold || 60; // ল্যাপলাস ভ্যারিয়েন্স সীমা
    const minBrightness = options.minBrightness || 45; // অতি অন্ধকার সীমা
    const maxBrightness = options.maxBrightness || 250; // অতি সাদা/ধোয়া সীমা

    const W = img.width, H = img.height;
    const data = img.data;

    let sumLum = 0;
    const totalPixels = W * H;

    // গ্রেস্কেল ডেটা
    const gray = new Float32Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const lum = rgbToY(data[idx], data[idx + 1], data[idx + 2]);
      gray[i] = lum;
      sumLum += lum;
    }

    const meanBrightness = sumLum / totalPixels;

    // ৩x৩ ল্যাপলাস ফিল্টার: [0, 1, 0; 1, -4, 1; 0, 1, 0]
    let sumL = 0;
    let sumL2 = 0;
    let lapCount = 0;

    // অভ্যন্তরীণ পিক্সেলগুলোতে ল্যাপলাস
    for (let y = 1; y < H - 1; y += 2) { // গতি ও নির্ভরযোগ্যতার জন্য স্ট্রাইড ২
      for (let x = 1; x < W - 1; x += 2) {
        const c = gray[y * W + x];
        const up = gray[(y - 1) * W + x];
        const down = gray[(y + 1) * W + x];
        const left = gray[y * W + (x - 1)];
        const right = gray[y * W + (x + 1)];

        const lap = (up + down + left + right) - 4 * c;
        sumL += lap;
        sumL2 += lap * lap;
        lapCount++;
      }
    }

    const meanL = sumL / Math.max(1, lapCount);
    const lapVar = (sumL2 / Math.max(1, lapCount)) - (meanL * meanL);

    const isBlurry = lapVar < varThreshold || meanBrightness < minBrightness || meanBrightness > maxBrightness;

    return {
      isBlurry: isBlurry,
      laplacianVar: Number(lapVar.toFixed(2)),
      brightness: Number(meanBrightness.toFixed(2)),
      status: isBlurry ? '✘' : '✔',
      message: isBlurry ? 'ছবি ঝাপসা — আবার ছবি তুলুন' : 'ছবি পরিষ্কার'
    };
  }

  const api = {
    rgbToY: rgbToY,
    equalizeIllumination: equalizeIllumination,
    detectBlur: detectBlur
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FayzarLightBlur = api;
})(typeof window !== 'undefined' ? window : globalThis);
