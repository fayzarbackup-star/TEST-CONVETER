/* ফয়জার এআই কম্পোজ — পাতা-প্রস্তুতি পুরো স্বয়ংক্রিয় (AUTOPREP)
 * খাঁটি JS; ১০০% অফলাইন, কোনো বাহ্যিক লাইব্রেরি বা OpenCV নেই।
 * ব্রাউজার ও Node.js দুই পরিবেশেই কার্যকর (UMD)।
 */
(function (root) {
  'use strict';

  /**
   * Otsu থ্রেশহোল্ড নির্ণয়
   */
  function otsuThreshold(grayArr) {
    const hist = new Int32Array(256);
    const len = grayArr.length;
    for (let i = 0; i < len; i++) hist[grayArr[i]]++;

    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];

    let sumB = 0;
    let wB = 0;
    let maxVar = 0;
    let threshold = 128;

    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = len - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const betweenVar = wB * wF * (mB - mF) * (mB - mF);
      if (betweenVar > maxVar) {
        maxVar = betweenVar;
        threshold = t;
      }
    }
    return threshold;
  }

  /**
   * ImageData / ক্যানভাস / অ্যারে থেকে ছোট ধূসর ও বাইনারি কালি মাস্ক
   * img: { data: Uint8Array|Uint8ClampedArray, width, height } বা HTMLImageElement/HTMLCanvasElement
   * maxSide: ছবির সর্বোচ্চ বাহুর দৈর্ঘ্য (ডিফল্ট ১০০০)
   */
  function toGray(img, maxSide) {
    const limit = maxSide || 1000;
    let W = 0, H = 0, data = null;

    if (img && img.width && img.height && img.data) {
      W = img.width;
      H = img.height;
      data = img.data;
    } else if (typeof document !== 'undefined' && (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement)) {
      W = img.naturalWidth || img.width;
      H = img.naturalHeight || img.height;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      data = ctx.getImageData(0, 0, W, H).data;
    } else if (img && img.gray && img.width && img.height) {
      return img;
    } else {
      throw new Error('অকার্যকর ছবি অবজেক্ট');
    }

    const maxDim = Math.max(W, H);
    const scale = maxDim > limit ? limit / maxDim : 1;
    const sW = Math.max(1, Math.round(W * scale));
    const sH = Math.max(1, Math.round(H * scale));

    const gray = new Uint8Array(sW * sH);
    let sumLum = 0;

    for (let y = 0; y < sH; y++) {
      const srcY = Math.min(H - 1, Math.floor(y / scale));
      for (let x = 0; x < sW; x++) {
        const srcX = Math.min(W - 1, Math.floor(x / scale));
        const idx = (srcY * W + srcX) * 4;
        const lum = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        gray[y * sW + x] = lum;
        sumLum += lum;
      }
    }

    const meanLum = sumLum / Math.max(1, gray.length);
    const threshold = otsuThreshold(gray);

    const bin = new Uint8Array(sW * sH);
    // সাদা কাগজের গাঢ় কালি (pixel <= threshold) বা কালো ব্যাকগ্রাউন্ডের সাদা লেখা (pixel > threshold)
    const isBrightBg = meanLum >= 128;
    for (let i = 0; i < gray.length; i++) {
      bin[i] = (isBrightBg ? (gray[i] <= threshold) : (gray[i] > threshold)) ? 1 : 0;
    }

    return {
      gray: gray,
      bin: bin,
      width: sW,
      height: sH,
      threshold: threshold,
      isBrightBg: isBrightBg
    };
  }

  /**
   * খাঁটি ধূসর অ্যারে থেকে কালি মাস্ক (Uint8Array, 1=কালি, 0=ব্যাকগ্রাউন্ড)
   */
  function getInkMask(gray, w, h) {
    if (gray && gray.bin && gray.width && gray.height) {
      return gray.bin;
    }
    const len = w * h;
    let minVal = 255, maxVal = 0, sum = 0;
    for (let i = 0; i < len; i++) {
      const v = gray[i];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
      sum += v;
    }
    const mask = new Uint8Array(len);
    if (minVal === maxVal) return mask; // পুরোপুরি এক রঙের (ফাঁকা)

    if (maxVal <= 1) {
      // ইতোমধ্যে বাইনারি (0 ও 1)
      const count1 = sum;
      if (count1 < len / 2) {
        mask.set(gray);
      } else {
        for (let i = 0; i < len; i++) mask[i] = gray[i] === 0 ? 1 : 0;
      }
      return mask;
    }

    const mean = sum / len;
    const thresh = otsuThreshold(gray);
    const isBright = mean >= 128;
    for (let i = 0; i < len; i++) {
      mask[i] = (isBright ? (gray[i] <= thresh) : (gray[i] > thresh)) ? 1 : 0;
    }
    return mask;
  }

  /**
   * পাতা ঘোরানো শনাক্তকরণ: 0 | 90 | 270
   * ১. কাগজ-সীমানা নির্ণয় (বাইরের অন্ধকার টেবিল/স্ক্যানার বেড বাদ)
   * ২. ক্লিন-মাস্ক: ছক বা টেবিলের দীর্ঘ রেখা বাদ দিয়ে পাঠ্য লাইনের ভ্যারিয়েন্স হিসাব
   * ৩. আড়াআড়ি ২ পাতার বই (T-14) শনাক্তকরণ -> ২৭০°
   * ৪. খাড়া লেখা (অনুপাত ≥ ২.০) হলে বাঁ-মার্জিনের বিচ্যুতি তুলনা করে ৯০ বা ২৭০
   */
  function detectOrientation(grayOrObj, w, h) {
    const gray = (grayOrObj && grayOrObj.gray) ? grayOrObj.gray : grayOrObj;
    const mask = (grayOrObj && grayOrObj.bin) ? grayOrObj.bin : getInkMask(gray, w, h);

    let totalInk = 0;
    for (let i = 0; i < mask.length; i++) totalInk += mask[i];
    if (totalInk < 20) return 0; // ফাঁকা পাতা

    // ১. কাগজের ভেতরের বাউন্ডিং বক্স
    let pMinX = w, pMaxX = 0, pMinY = h, pMaxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (gray[y * w + x] > 155) {
          if (x < pMinX) pMinX = x;
          if (x > pMaxX) pMaxX = x;
          if (y < pMinY) pMinY = y;
          if (y > pMaxY) pMaxY = y;
        }
      }
    }
    if (pMaxX <= pMinX || pMaxY <= pMinY) {
      pMinX = Math.floor(w * 0.05); pMaxX = Math.floor(w * 0.95);
      pMinY = Math.floor(h * 0.05); pMaxY = Math.floor(h * 0.95);
    }

    // ২. ছকের দীর্ঘ অবিচ্ছিন্ন রেখা বাদ দেওয়া (ক্লিন মাস্ক)
    const cleanMask = new Uint8Array(w * h);
    cleanMask.set(mask);
    for (let x = 0; x < w; x++) {
      let run = 0;
      for (let y = 0; y < h; y++) {
        if (mask[y * w + x]) run++;
        else {
          if (run >= 45) { for (let yy = y - run; yy < y; yy++) cleanMask[yy * w + x] = 0; }
          run = 0;
        }
      }
      if (run >= 45) { for (let yy = h - run; yy < h; yy++) cleanMask[yy * w + x] = 0; }
    }
    for (let y = 0; y < h; y++) {
      let run = 0;
      for (let x = 0; x < w; x++) {
        if (mask[y * w + x]) run++;
        else {
          if (run >= 55) { for (let xx = x - run; xx < x; xx++) cleanMask[y * w + xx] = 0; }
          run = 0;
        }
      }
      if (run >= 55) { for (let xx = w - run; xx < w; xx++) cleanMask[y * w + xx] = 0; }
    }

    let cleanInk = 0;
    for (let i = 0; i < cleanMask.length; i++) cleanInk += cleanMask[i];
    const activeMask = (cleanInk < 20) ? mask : cleanMask;

    // ৩. কাগজের সীমানায় সারি ও কলাম ভ্যারিয়েন্স
    const pw = pMaxX - pMinX + 1, ph = pMaxY - pMinY + 1;
    const y0 = pMinY + Math.floor(ph * 0.1), y1 = pMaxY - Math.floor(ph * 0.1);
    const x0 = pMinX + Math.floor(pw * 0.1), x1 = pMaxX - Math.floor(pw * 0.1);

    const R = new Float64Array(Math.max(1, y1 - y0));
    const C = new Float64Array(Math.max(1, x1 - x0));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (activeMask[y * w + x]) { R[y - y0]++; C[x - x0]++; }
      }
    }

    let meanR = 0, meanC = 0;
    for (let i = 0; i < R.length; i++) meanR += R[i]; meanR /= R.length;
    for (let i = 0; i < C.length; i++) meanC += C[i]; meanC /= C.length;

    let varR = 0, varC = 0;
    for (let i = 0; i < R.length; i++) varR += (R[i] - meanR) ** 2; varR /= R.length;
    for (let i = 0; i < C.length; i++) varC += (C[i] - meanC) ** 2; varC /= C.length;

    const normVarR = varR / Math.max(1, meanR * meanR);
    const normVarC = varC / Math.max(1, meanC * meanC);
    const ratio = normVarC / Math.max(1e-4, normVarR);

    // ৪. আড়াআড়ি ২ পাতার বই পরীক্ষা (যেমন T-14):
    let hasHorizSpine = false;
    if (h > w * 1.15) {
      let minRowEdges = Infinity, bestY = -1;
      for (let y = Math.floor(h * 0.42); y <= Math.floor(h * 0.58); y++) {
        let edges = 0;
        for (let x = Math.floor(w * 0.2); x < Math.floor(w * 0.8); x++) if (mask[y * w + x]) edges++;
        if (edges < minRowEdges) { minRowEdges = edges; bestY = y; }
      }
      let topInk = 0, botInk = 0;
      for (let y = Math.floor(h * 0.1); y < bestY - 15; y++) {
        for (let x = Math.floor(w * 0.2); x < Math.floor(w * 0.8); x++) if (mask[y * w + x]) topInk++;
      }
      for (let y = bestY + 15; y < Math.floor(h * 0.9); y++) {
        for (let x = Math.floor(w * 0.2); x < Math.floor(w * 0.8); x++) if (mask[y * w + x]) botInk++;
      }
      if (minRowEdges <= 5 && topInk > 2500 && botInk > 2500 && ratio >= 1.4 && Math.abs(bestY - h * 0.5) <= h * 0.035) {
        hasHorizSpine = true;
      }
    }

    if (hasHorizSpine) return 270;
    if (ratio < 2.0) return 0;

    // ৯০ না ২৭০ নির্ণয়:
    // ১. বাংলা মাত্রা (শিরোরেখা) বা ইংরেজি হেভি-লাইনের শিখর পরীক্ষা
    // উলম্ব লাইনের কলাম প্রোফাইল বিশ্লেষণ: লাইনের ভেতরে কালির ঘন শিখর কোন দিকে
    const C_line = new Float64Array(w);
    for (let x = 0; x < w; x++) {
      for (let y = Math.floor(h * 0.15); y < Math.floor(h * 0.85); y++) {
        if (activeMask[y * w + x]) C_line[x]++;
      }
    }
    const smoothC_line = new Float64Array(w);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - 1), x1 = Math.min(w - 1, x + 1);
      let s = 0; for (let xx = x0; xx <= x1; xx++) s += C_line[xx];
      smoothC_line[x] = s / (x1 - x0 + 1);
    }
    let sumCl = 0; for (let x = 0; x < w; x++) sumCl += smoothC_line[x];
    const meanCl = sumCl / Math.max(1, w);
    const threshCl = meanCl * 0.35;

    const detectedLines = [];
    let inLine = false, lStart = 0;
    for (let x = 0; x < w; x++) {
      if (smoothC_line[x] > threshCl) {
        if (!inLine) { inLine = true; lStart = x; }
      } else {
        if (inLine) {
          inLine = false;
          if (x - lStart >= 6 && x - lStart <= 80) {
            detectedLines.push({ start: lStart, end: x - 1, len: x - lStart });
          }
        }
      }
    }

    let score90 = 0, score270 = 0;
    for (const ln of detectedLines) {
      let maxV = -1, maxP = ln.start;
      for (let x = ln.start; x <= ln.end; x++) {
        if (smoothC_line[x] > maxV) { maxV = smoothC_line[x]; maxP = x; }
      }
      const peakRel = (maxP - ln.start) / Math.max(1, ln.len - 1);
      // ৯০° ঘড়ির কাঁটায় ঘুরালে ছোট x ওপরের দিক হয় (মাত্রা ওপরে থাকলে peakRel <= ০.৪২)
      // ২৭০° ঘড়ির কাঁটায় ঘুরালে বড় x ওপরের দিক হয় (মাত্রা ওপরে থাকলে peakRel >= ০.৫৮)
      if (peakRel <= 0.42) score90++;
      if (peakRel >= 0.58) score270++;
    }

    if (score270 >= score90 + 2) return 270;
    if (score90 >= score270 + 2) return 90;

    // ২. ফলব্যাক: বাঁ-মার্জিনের বিচ্যুতি তুলনা
    const lefts90 = [];
    const lefts270 = [];
    const minInkPerCol = Math.max(3, Math.round(h * 0.02));

    for (let x = 0; x < w; x++) {
      let minY = -1, maxY = -1, colInk = 0;
      for (let y = 0; y < h; y++) {
        if (activeMask[y * w + x]) {
          colInk++;
          if (minY < 0) minY = y;
          maxY = y;
        }
      }
      if (colInk >= minInkPerCol) {
        lefts90.push(h - 1 - maxY);
        lefts270.push(minY);
      }
    }

    if (lefts90.length < 3) return 0;

    function calcVariance(arr) {
      let sum = 0;
      for (let i = 0; i < arr.length; i++) sum += arr[i];
      const mean = sum / arr.length;
      let v = 0;
      for (let i = 0; i < arr.length; i++) {
        const diff = arr[i] - mean;
        v += diff * diff;
      }
      return v / arr.length;
    }

    const var90 = calcVariance(lefts90);
    const var270 = calcVariance(lefts270);

    if (var90 < var270 * 0.80) return 90;
    if (var270 < var90 * 0.80) return 270;
    return 0; // আস্থা কম হলে ঘোরানো চলবে না
  }

  /**
   * দুই পাতার স্প্রেড শনাক্তকরণ: { split: boolean, x: number }
   * শর্ত: w/h >= ১.১৫, প্রতিটি অর্ধেক খাড়া (h/(w/2) >= ১.১)
   * ১. অক্ষরের এজ-ডেনসিটি গহ্বর অনুসন্ধান (বইয়ের ভাঁজে অক্ষরের প্রান্ত থাকে না)
   * ২. পরিষ্কার স্ক্যান বা সিন্থেটিক টেস্টের জন্য কলাম কালির মসৃণ প্রোফাইল পরীক্ষা
   */
  function detectSpread(grayOrObj, w, h) {
    if (w / h < 1.15) return { split: false, x: 0 };
    if (h / (w / 2) < 1.1) return { split: false, x: 0 };

    const gray = (grayOrObj && grayOrObj.gray) ? grayOrObj.gray : grayOrObj;
    const mask = (grayOrObj && grayOrObj.bin) ? grayOrObj.bin : getInkMask(gray, w, h);

    let totalInk = 0;
    for (let i = 0; i < mask.length; i++) totalInk += mask[i];
    if (totalInk < 50) return { split: false, x: 0 };

    // ১. অক্ষরের এজ-ডেনসিটি গহ্বর (বইয়ের ভাঁজ শনাক্তকরণ)
    const edgeDensity = new Float64Array(w);
    for (let y = Math.floor(h * 0.15); y < Math.floor(h * 0.85); y++) {
      for (let x = 1; x < w - 1; x++) {
        const gx = Math.abs(gray[y * w + x + 1] - gray[y * w + x - 1]);
        if (gx > 25) edgeDensity[x]++;
      }
    }
    let minEdges = Infinity, splitX_edges = -1;
    for (let x = Math.floor(w * 0.42); x <= Math.floor(w * 0.58); x++) {
      let s = 0;
      for (let dx = -2; dx <= 2; dx++) s += edgeDensity[x + dx];
      s /= 5;
      if (s < minEdges) { minEdges = s; splitX_edges = x; }
    }
    let leftEdges = 0, rightEdges = 0;
    for (let x = Math.floor(w * 0.15); x < splitX_edges - 15; x++) leftEdges += edgeDensity[x];
    for (let x = splitX_edges + 15; x < Math.floor(w * 0.85); x++) rightEdges += edgeDensity[x];

    if (minEdges <= 5 && leftEdges > 1500 && rightEdges > 1500) {
      return { split: true, x: splitX_edges };
    }

    // ২. কলাম-প্রোফাইল মসৃণকরণ (সিন্থেটিক টেস্ট ও সাদা গহ্বরের জন্য)
    const C = new Float64Array(w);
    for (let y = 0; y < h; y++) {
      const rowOff = y * w;
      for (let x = 0; x < w; x++) if (mask[rowOff + x]) C[x]++;
    }

    const smoothRadius = Math.max(2, Math.round(w * 0.008));
    const smoothC = new Float64Array(w);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - smoothRadius);
      const x1 = Math.min(w - 1, x + smoothRadius);
      let sum = 0;
      for (let xx = x0; xx <= x1; xx++) sum += C[xx];
      smoothC[x] = sum / (x1 - x0 + 1);
    }

    const l0 = Math.floor(w * 0.10), l1 = Math.floor(w * 0.35);
    const r0 = Math.floor(w * 0.65), r1 = Math.floor(w * 0.90);
    let sumLeft = 0, countLeft = 0;
    for (let x = l0; x <= l1; x++) { sumLeft += smoothC[x]; countLeft++; }
    let sumRight = 0, countRight = 0;
    for (let x = r0; x <= r1; x++) { sumRight += smoothC[x]; countRight++; }

    const avgLeft = sumLeft / Math.max(1, countLeft);
    const avgRight = sumRight / Math.max(1, countRight);
    const avgSides = (avgLeft + avgRight) / 2;

    if (avgSides > 0 && avgLeft > 0 && avgRight > 0) {
      const m0 = Math.floor(w * 0.35), m1 = Math.ceil(w * 0.65);
      const threshold = avgSides * 0.15;
      const minWidth = Math.max(2, Math.round(w * 0.01));

      let bestRunStart = -1, bestRunEnd = -1, bestRunLen = 0;
      let curRunStart = -1;

      for (let x = m0; x <= m1; x++) {
        if (smoothC[x] <= threshold) {
          if (curRunStart < 0) curRunStart = x;
        } else {
          if (curRunStart >= 0) {
            const runLen = x - curRunStart;
            if (runLen > bestRunLen) {
              bestRunLen = runLen;
              bestRunStart = curRunStart;
              bestRunEnd = x - 1;
            }
            curRunStart = -1;
          }
        }
      }
      if (curRunStart >= 0) {
        const runLen = m1 - curRunStart + 1;
        if (runLen > bestRunLen) {
          bestRunLen = runLen;
          bestRunStart = curRunStart;
          bestRunEnd = m1;
        }
      }

      if (bestRunLen >= minWidth) {
        const splitX = Math.round((bestRunStart + bestRunEnd) / 2);
        let leftInk = 0, rightInk = 0;
        for (let x = 0; x < splitX; x++) leftInk += C[x];
        for (let x = splitX; x < w; x++) rightInk += C[x];

        if (leftInk >= totalInk * 0.15 && rightInk >= totalInk * 0.15) {
          return { split: true, x: splitX };
        }
      }
    }

    return { split: false, x: 0 };
  }

  /**
   * বাঁকা পাতার কোণ (Skew) নির্ণয় (−৮° … +৮°, ধাপ ০.২৫°)
   * প্রোফাইল ভ্যারিয়েন্স সর্বোচ্চ হওয়া কোণ ফেরত দেয়। |কোণ| < ০.৪ হলে ০।
   */
  function detectSkew(gray, w, h) {
    const mask = getInkMask(gray, w, h);
    let totalInk = 0;
    for (let i = 0; i < mask.length; i++) totalInk += mask[i];
    if (totalInk < 20) return 0;

    // দ্রুত গণনার জন্য কালি পিক্সেলগুলোর অবস্থান সংগ্রহ
    const ptsX = [];
    const ptsY = [];
    const step = Math.max(1, Math.round(Math.min(w, h) / 300));
    for (let y = 0; y < h; y += step) {
      const off = y * w;
      for (let x = 0; x < w; x += step) {
        if (mask[off + x]) {
          ptsX.push(x - w / 2);
          ptsY.push(y);
        }
      }
    }

    if (ptsX.length < 20) return 0;

    const maxShift = Math.ceil((w / 2) * Math.tan((8 * Math.PI) / 180));
    const binCount = h + 2 * maxShift;
    const bins = new Int32Array(binCount);

    function varianceForAngle(deg) {
      bins.fill(0);
      const rad = (deg * Math.PI) / 180;
      const tanA = Math.tan(rad);
      const count = ptsX.length;

      for (let i = 0; i < count; i++) {
        const yProj = Math.round(ptsY[i] - ptsX[i] * tanA) + maxShift;
        if (yProj >= 0 && yProj < binCount) bins[yProj]++;
      }

      let sum = 0;
      for (let i = 0; i < binCount; i++) sum += bins[i];
      const mean = sum / binCount;
      let v = 0;
      for (let i = 0; i < binCount; i++) {
        const d = bins[i] - mean;
        v += d * d;
      }
      return v;
    }

    // ১. মোটা অনুসন্ধান (−৮ থেকে +৮, ধাপ ১.০°)
    let bestDeg = 0;
    let maxV = -1;
    for (let deg = -8; deg <= 8; deg += 1) {
      const v = varianceForAngle(deg);
      if (v > maxV) {
        maxV = v;
        bestDeg = deg;
      }
    }

    // ২. সূক্ষ্ম অনুসন্ধান (bestDeg ± ১°, ধাপ ০.২৫°)
    let fineDeg = bestDeg;
    for (let d = -1.0; d <= 1.0; d += 0.25) {
      const deg = bestDeg + d;
      if (deg < -8 || deg > 8) continue;
      const v = varianceForAngle(deg);
      if (v > maxV) {
        maxV = v;
        fineDeg = deg;
      }
    }

    if (Math.abs(fineDeg) < 0.4) return 0;
    return Number(fineDeg.toFixed(2));
  }

  /**
   * কালির চারপাশে মার্জিনসহ (ছোট পাশের ~৩%) ক্রপ বাক্স
   * স্ক্যানের কালো কিনারা/ছায়া বাদ দেয়
   */
  function contentBox(gray, w, h) {
    const mask = getInkMask(gray, w, h);
    let totalInk = 0;
    for (let i = 0; i < mask.length; i++) totalInk += mask[i];
    if (totalInk < 10) return { x: 0, y: 0, w: w, h: h };

    const R = new Int32Array(h);
    const C = new Int32Array(w);

    // প্রান্তীয় স্ক্যানার বর্ডার বাদ দেওয়ার প্রস্তুতি:
    // একদম সীমানার ১-২% পিক্সেল যদি প্রায় সম্পূর্ণ কালো হয় তবে সেগুলো বাদ
    const edgeMarginX = Math.max(1, Math.floor(w * 0.015));
    const edgeMarginY = Math.max(1, Math.floor(h * 0.015));

    for (let y = 0; y < h; y++) {
      const rowOff = y * w;
      for (let x = 0; x < w; x++) {
        if (mask[rowOff + x]) {
          R[y]++;
          C[x]++;
        }
      }
    }

    // অতি সূক্ষ্ম নয়েজ বাদ (সর্বোচ্চ ১-২ পিক্সেল)
    const cut = Math.min(2, Math.max(1, Math.round(totalInk * 0.0002)));
    let y0 = 0, y1 = h - 1, x0 = 0, x1 = w - 1;

    let acc = 0;
    for (let y = 0; y < h; y++) {
      acc += R[y];
      if (acc >= cut) { y0 = y; break; }
    }
    acc = 0;
    for (let y = h - 1; y >= 0; y--) {
      acc += R[y];
      if (acc >= cut) { y1 = y; break; }
    }

    acc = 0;
    for (let x = 0; x < w; x++) {
      acc += C[x];
      if (acc >= cut) { x0 = x; break; }
    }
    acc = 0;
    for (let x = w - 1; x >= 0; x--) {
      acc += C[x];
      if (acc >= cut) { x1 = x; break; }
    }

    if (y1 <= y0 || x1 <= x0) return { x: 0, y: 0, w: w, h: h };

    // মার্জিন (কমপক্ষে ১২ পিক্সেল বা ২% মার্জিন)
    const margin = Math.max(12, Math.round(Math.min(w, h) * 0.02));
    const bx = Math.max(0, x0 - margin);
    const by = Math.max(0, y0 - margin);
    const bx2 = Math.min(w, x1 + margin);
    const by2 = Math.min(h, y1 + margin);

    return {
      x: bx,
      y: by,
      w: Math.max(1, bx2 - bx),
      h: Math.max(1, by2 - by)
    };
  }

  /**
   * ৪ কোণা ভরসাযোগ্য চতুর্ভুজ কিনা পরীক্ষা
   * (উত্তল, ক্ষেত্রফল ছবির ৪০–৯৫%, পুরো ফ্রেমের সমান নয়)
   */
  function isReliableQuad(corners, w, h) {
    if (!Array.isArray(corners) || corners.length !== 4) return false;
    for (const p of corners) {
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return false;
    }

    // Shoelace সূত্র দিয়ে ক্ষেত্রফল
    let area2 = 0;
    for (let i = 0; i < 4; i++) {
      const p1 = corners[i];
      const p2 = corners[(i + 1) % 4];
      area2 += (p1.x * p2.y) - (p1.y * p2.x);
    }
    const area = Math.abs(area2) / 2;
    const imgArea = w * h;
    const ratio = area / imgArea;

    if (ratio < 0.40 || ratio > 0.95) return false;

    // উত্তলতা (Convexity) পরীক্ষা — ক্রস প্রোডাক্টের চিহ্ন একমুখী
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const p0 = corners[i];
      const p1 = corners[(i + 1) % 4];
      const p2 = corners[(i + 2) % 4];
      const dx1 = p1.x - p0.x, dy1 = p1.y - p0.y;
      const dx2 = p2.x - p1.x, dy2 = p2.y - p1.y;
      const cp = dx1 * dy2 - dy1 * dx2;
      if (Math.abs(cp) > 1e-4) {
        const curSign = cp > 0 ? 1 : -1;
        if (sign === 0) sign = curSign;
        else if (sign !== curSign) return false; // অবতল চতুর্ভুজ
      }
    }

    // পুরো ফ্রেমের সমান নয় তা নিশ্চিত করা (সবগুলো কোণা সীমানার ২%-এর ভেতরে থাকলে পুরো ফ্রেম)
    const mX = w * 0.02, mY = h * 0.02;
    const isFrame = (
      corners[0].x <= mX && corners[0].y <= mY &&
      corners[1].x >= w - mX && corners[1].y <= mY &&
      corners[2].x >= w - mX && corners[2].y >= h - mY &&
      corners[3].x <= mX && corners[3].y >= h - mY
    );
    if (isFrame) return false;

    return true;
  }

  /**
   * ব্রাউজারে ক্যানভাসকে আইটেম অবজেক্টে রূপান্তর (যদি ImageTools না থাকে তার জন্য ফলব্যাক)
   */
  function defaultCanvasToItem(canvas, name, suffix) {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const dotIdx = (name || 'image').lastIndexOf('.');
    const baseName = dotIdx > 0 ? name.slice(0, dotIdx) : (name || 'image');
    const outName = baseName + suffix + '.jpg';

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const file = blob ? new File([blob], outName, { type: 'image/jpeg' }) : null;
        resolve({
          file: file,
          name: outName,
          size: blob ? blob.size : dataUrl.length,
          isPdf: false,
          mimeType: 'image/jpeg',
          base64: dataUrl,
          w: canvas.width,
          h: canvas.height
        });
      }, 'image/jpeg', 0.92);
    });
  }

  /**
   * ব্রাউজার ফাংশন: autoPrep(item) -> Promise<item[]>
   * ক্রম: ঘোরানো → স্প্রেড-ভাগ → প্রতি অংশে: detectCorners/warpCanvas বা detectSkew/contentBox → detectBlur
   */
  async function autoPrep(item) {
    if (!item) return [];
    if (item.isPdf && !item.base64) return [item];

    // কিল-সুইচ পরীক্ষা
    const off = !!(
      (typeof root !== 'undefined' && (root.__FZ_OFF_AUTOPREP || root.__FZ_OFF_IMAGEPREP)) ||
      (typeof localStorage !== 'undefined' && (localStorage.getItem('FZ_OFF_AUTOPREP') === '1' || localStorage.getItem('FZ_OFF_IMAGEPREP') === '1'))
    );
    if (off) return [item];

    const tStart = Date.now();
    const rawOriginal = item.rawOriginal || item;

    try {
      const imgTools = root.FayzarImageTools;
      const homography = root.FayzarHomography;
      const cornersMod = root.FayzarCorners;
      const lightBlur = root.FayzarLightBlur;

      // ছবি লোড করা
      let imgEl;
      if (imgTools && imgTools.loadImg) {
        imgEl = await imgTools.loadImg(item);
      } else {
        imgEl = await new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = item.base64 || (item.file ? URL.createObjectURL(item.file) : '');
        });
      }

      let workW = imgEl.naturalWidth || imgEl.width;
      let workH = imgEl.naturalHeight || imgEl.height;

      let workCanvas = document.createElement('canvas');
      workCanvas.width = workW;
      workCanvas.height = workH;
      let workCtx = workCanvas.getContext('2d');
      workCtx.drawImage(imgEl, 0, 0);

      // ১. ঘোরানো (Orientation)
      let grayObj = toGray(workCtx.getImageData(0, 0, workW, workH), 1000);
      const rot = detectOrientation(grayObj.gray, grayObj.width, grayObj.height);

      if (rot === 90 || rot === 270) {
        const rotCanvas = document.createElement('canvas');
        rotCanvas.width = workH;
        rotCanvas.height = workW;
        const rotCtx = rotCanvas.getContext('2d');
        rotCtx.fillStyle = '#fff';
        rotCtx.fillRect(0, 0, rotCanvas.width, rotCanvas.height);
        if (rot === 90) {
          rotCtx.translate(rotCanvas.width, 0);
          rotCtx.rotate(Math.PI / 2);
        } else {
          rotCtx.translate(0, rotCanvas.height);
          rotCtx.rotate(-Math.PI / 2);
        }
        rotCtx.drawImage(workCanvas, 0, 0);
        workCanvas = rotCanvas;
        workCtx = workCanvas.getContext('2d');
        workW = workCanvas.width;
        workH = workCanvas.height;
      }

      // ২. স্প্রেড-ভাগ (Spread split)
      grayObj = toGray(workCtx.getImageData(0, 0, workW, workH), 1000);
      const spread = detectSpread(grayObj.gray, grayObj.width, grayObj.height);

      const parts = [];
      if (spread.split && spread.x > 0) {
        const scaleX = workW / grayObj.width;
        const splitX = Math.round(spread.x * scaleX);

        // বাম পাতা
        const cL = document.createElement('canvas');
        cL.width = splitX;
        cL.height = workH;
        cL.getContext('2d').drawImage(workCanvas, 0, 0, splitX, workH, 0, 0, splitX, workH);
        parts.push({ canvas: cL, suffix: '_L' });

        // ডান পাতা
        const cR = document.createElement('canvas');
        cR.width = workW - splitX;
        cR.height = workH;
        cR.getContext('2d').drawImage(workCanvas, splitX, 0, workW - splitX, workH, 0, 0, workW - splitX, workH);
        parts.push({ canvas: cR, suffix: '_R' });
      } else {
        parts.push({ canvas: workCanvas, suffix: '' });
      }

      // ৩. প্রতি অংশে: detectCorners/warpCanvas বা skew/contentBox
      const outItems = [];
      for (const part of parts) {
        let pCanvas = part.canvas;
        let pCtx = pCanvas.getContext('2d');
        let pW = pCanvas.width;
        let pH = pCanvas.height;

        let cropType = 'none';
        let skewDeg = 0;

        // ১. ফ্ল্যাট স্ক্যান শনাক্তকরণ (চারপাশে কাগজ ছাড়া অন্য পটভূমি না থাকলে ওয়ার্প বাদ)
        let isFlatScan = false;
        try {
          const checkGray = toGray(pCtx.getImageData(0, 0, pW, pH), 240);
          const cgW = checkGray.width, cgH = checkGray.height, cgArr = checkGray.gray;
          let borderLum = 0, bCount = 0;
          for (let x = 0; x < cgW; x++) {
            borderLum += cgArr[x] + cgArr[(cgH - 1) * cgW + x];
            bCount += 2;
          }
          for (let y = 0; y < cgH; y++) {
            borderLum += cgArr[y * cgW] + cgArr[y * cgW + cgW - 1];
            bCount += 2;
          }
          borderLum /= Math.max(1, bCount);

          let centerLum = 0, cCount = 0;
          for (let y = Math.floor(cgH * 0.25); y < Math.floor(cgH * 0.75); y++) {
            for (let x = Math.floor(cgW * 0.25); x < Math.floor(cgW * 0.75); x++) {
              centerLum += cgArr[y * cgW + x];
              cCount++;
            }
          }
          centerLum /= Math.max(1, cCount);
          isFlatScan = (borderLum > 180) || ((centerLum - borderLum) < 25);
        } catch (_) {}

        // ২. ক্যামেরা ছবির জন্য কর্নার ডিটেকশন ও ওয়ার্প (রক্ষাকবচসহ)
        let warpedOk = false;
        if (!isFlatScan && cornersMod && cornersMod.detectCorners && homography && homography.warpCanvas) {
          try {
            const corners = cornersMod.detectCorners(pCanvas);
            if (isReliableQuad(corners, pW, pH)) {
              // চতুর্ভুজের কোনো বাহু লেখার ব্লকের ভেতর দিয়ে গেলে (বাহু বরাবর কালি থাকলে) বাতিল
              const gFull = toGray(pCtx.getImageData(0, 0, pW, pH), 800);
              const maskFull = gFull.bin, gw = gFull.width, gh = gFull.height;
              const scX = gw / pW, scY = gh / pH;

              function edgeHasInk(p0, p1) {
                const x0 = p0.x * scX, y0 = p0.y * scY;
                const x1 = p1.x * scX, y1 = p1.y * scY;
                const dist = Math.hypot(x1 - x0, y1 - y0);
                const steps = Math.floor(dist);
                let hits = 0;
                for (let i = 0; i <= steps; i++) {
                  const t = i / steps;
                  const x = Math.round(x0 + t * (x1 - x0));
                  const y = Math.round(y0 + t * (y1 - y0));
                  if (x >= 0 && x < gw && y >= 0 && y < gh && maskFull[y * gw + x]) hits++;
                }
                return (hits / Math.max(1, steps)) > 0.02; // ২%-এর বেশি কালির হিট থাকলে লেখা কাটা
              }

              const cutsText = edgeHasInk(corners[0], corners[1]) ||
                               edgeHasInk(corners[1], corners[2]) ||
                               edgeHasInk(corners[2], corners[3]) ||
                               edgeHasInk(corners[3], corners[0]);

              if (!cutsText) {
                let origInk = 0;
                for (let i = 0; i < maskFull.length; i++) origInk += maskFull[i];

                const warped = homography.warpCanvas(pCanvas, corners);
                if (warped && warped.canvas) {
                  // কালির ≥ ৯৯.৫% সংরক্ষিত হয়েছে কিনা যাচাই
                  const wctx = warped.canvas.getContext('2d');
                  const wGray = toGray(wctx.getImageData(0, 0, warped.canvas.width, warped.canvas.height), 800);
                  let warpedInk = 0;
                  for (let i = 0; i < wGray.bin.length; i++) warpedInk += wGray.bin[i];

                  if (warpedInk >= 0.995 * origInk) {
                    pCanvas = warped.canvas;
                    pCtx = pCanvas.getContext('2d');
                    pW = pCanvas.width;
                    pH = pCanvas.height;
                    warpedOk = true;
                    cropType = 'warp';
                  }
                }
              }
            }
          } catch (_) {}
        }

        // ৩. ফ্ল্যাট স্ক্যান বা ওয়ার্প না-হওয়া ছবি: সোজা করা (skew) ও কন্টেন্ট-বক্স ক্রপ
        if (!warpedOk) {
          try {
            const pGray = toGray(pCtx.getImageData(0, 0, pW, pH), 1000);
            skewDeg = detectSkew(pGray.gray, pGray.width, pGray.height);
            if (Math.abs(skewDeg) >= 0.4) {
              const dCanvas = document.createElement('canvas');
              dCanvas.width = pW;
              dCanvas.height = pH;
              const dCtx = dCanvas.getContext('2d');
              dCtx.fillStyle = '#fff';
              dCtx.fillRect(0, 0, pW, pH);
              dCtx.translate(pW / 2, pH / 2);
              dCtx.rotate((-skewDeg * Math.PI) / 180);
              dCtx.drawImage(pCanvas, -pW / 2, -pH / 2);
              pCanvas = dCanvas;
              pCtx = pCanvas.getContext('2d');
            }

            const cropGray = toGray(pCtx.getImageData(0, 0, pCanvas.width, pCanvas.height), 1000);
            let beforeInk = 0;
            for (let i = 0; i < cropGray.bin.length; i++) beforeInk += cropGray.bin[i];

            const box = contentBox(cropGray.gray, cropGray.width, cropGray.height);
            const sx = pCanvas.width / cropGray.width;
            const sy = pCanvas.height / cropGray.height;
            const rx = Math.round(box.x * sx);
            const ry = Math.round(box.y * sy);
            const rw = Math.round(box.w * sx);
            const rh = Math.round(box.h * sy);

            if (rw > 20 && rh > 20 && (rw < pCanvas.width * 0.98 || rh < pCanvas.height * 0.98)) {
              const cCanvas = document.createElement('canvas');
              cCanvas.width = rw;
              cCanvas.height = rh;
              cCanvas.getContext('2d').drawImage(pCanvas, rx, ry, rw, rh, 0, 0, rw, rh);

              // কালির ≥ ৯৯.৫% সংরক্ষিত হয়েছে কিনা নিশ্চিত করা
              const afterGray = toGray(cCanvas.getContext('2d').getImageData(0, 0, rw, rh), 1000);
              let afterInk = 0;
              for (let i = 0; i < afterGray.bin.length; i++) afterInk += afterGray.bin[i];

              if (afterInk >= 0.995 * beforeInk) {
                pCanvas = cCanvas;
                pCtx = pCanvas.getContext('2d');
                cropType = 'box';
              }
            }
          } catch (_) {}
        }

        // ঝাপসা-চেনা (Laplacian variance)
        let isBlurry = false;
        if (lightBlur && lightBlur.detectBlur) {
          try {
            const bData = pCtx.getImageData(0, 0, pCanvas.width, pCanvas.height);
            const bRes = lightBlur.detectBlur(bData);
            if (bRes && bRes.isBlurry) isBlurry = true;
          } catch (_) {}
        }

        // আইটেম তৈরি
        const suffix = part.suffix || '_prep';
        let newItem;
        if (imgTools && imgTools.canvasToItem) {
          newItem = await imgTools.canvasToItem(pCanvas, item.name, suffix);
        } else {
          newItem = await defaultCanvasToItem(pCanvas, item.name, suffix);
        }

        newItem.rawOriginal = rawOriginal;
        newItem.isBlurry = isBlurry;
        newItem.autoPrepMeta = {
          rotate: rot,
          split: spread.split,
          skew: skewDeg,
          crop: cropType,
          timeMs: Date.now() - tStart
        };

        outItems.push(newItem);
      }

      return outItems.length ? outItems : [item];
    } catch (err) {
      console.warn('autoPrep fallback on error:', err);
      return [item];
    }
  }

  const api = {
    toGray: toGray,
    detectOrientation: detectOrientation,
    detectSpread: detectSpread,
    detectSkew: detectSkew,
    contentBox: contentBox,
    isReliableQuad: isReliableQuad,
    autoPrep: autoPrep
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FayzarAutoPrep = api;
})(typeof window !== 'undefined' ? window : globalThis);
