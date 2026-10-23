/* ফয়জার এআই কম্পোজ — ছবি-প্রস্তুতি (পর্ব ৫): homography ও bilinear warp।
 * খাঁটি JS; কোনো বাহ্যিক লাইব্রেরি বা OpenCV নেই।
 * ব্রাউজার ও Node.js দুই পরিবেশেই কার্যকর।
 */
(function (root) {
  'use strict';

  /**
   * ৮x৮ সমীকরণ সমাধান (Gaussian elimination with partial pivoting)
   * A: ৮x৮ অ্যারে, B: ৮ উপাদানের ভেক্টর
   */
  function solve8x8(A, B) {
    const n = 8;
    const M = new Array(n);
    for (let i = 0; i < n; i++) {
      M[i] = new Float64Array(n + 1);
      for (let j = 0; j < n; j++) M[i][j] = A[i][j];
      M[i][n] = B[i];
    }

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      let maxVal = Math.abs(M[i][i]);
      for (let r = i + 1; r < n; r++) {
        const v = Math.abs(M[r][i]);
        if (v > maxVal) {
          maxVal = v;
          maxRow = r;
        }
      }
      if (maxVal < 1e-12) return null; // singular

      if (maxRow !== i) {
        const tmp = M[i];
        M[i] = M[maxRow];
        M[maxRow] = tmp;
      }

      const pivot = M[i][i];
      for (let c = i; c <= n; c++) {
        M[i][c] /= pivot;
      }

      for (let r = 0; r < n; r++) {
        if (r !== i) {
          const factor = M[r][i];
          if (Math.abs(factor) > 1e-12) {
            for (let c = i; c <= n; c++) {
              M[r][c] -= factor * M[i][c];
            }
          }
        }
      }
    }

    const res = new Float64Array(8);
    for (let i = 0; i < n; i++) res[i] = M[i][n];
    return res;
  }

  /**
   * ৪টি উৎস বিন্দু থেকে ৪টি গন্তব্য বিন্দুর homography ম্যাট্রিক্স (৩x৩, h33 = 1)
   * srcPts, dstPts: [ {x, y}, ... ] (TL, TR, BR, BL ক্রমানুসারে)
   */
  function findHomography(srcPts, dstPts) {
    if (!srcPts || !dstPts || srcPts.length !== 4 || dstPts.length !== 4) {
      throw new Error('ঠিক ৪টি উৎস ও গন্তব্য বিন্দু আবশ্যক');
    }

    const A = [];
    const B = [];

    for (let i = 0; i < 4; i++) {
      const sx = srcPts[i].x, sy = srcPts[i].y;
      const dx = dstPts[i].x, dy = dstPts[i].y;

      // Row 2i: sx*h0 + sy*h1 + h2 - dx*sx*h6 - dx*sy*h7 = dx
      A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
      B.push(dx);

      // Row 2i+1: sx*h3 + sy*h4 + h5 - dy*sx*h6 - dy*sy*h7 = dy
      A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
      B.push(dy);
    }

    const h = solve8x8(A, B);
    if (!h) throw new Error('Homography সমাধান করা যায়নি (সমরেখ বিন্দু)');

    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0];
  }

  /**
   * বিন্দুর উপর Homography প্রয়োগ
   */
  function applyHomography(H, x, y) {
    const denom = H[6] * x + H[7] * y + H[8];
    if (Math.abs(denom) < 1e-12) return { x: 0, y: 0 };
    return {
      x: (H[0] * x + H[1] * y + H[2]) / denom,
      y: (H[3] * x + H[4] * y + H[5]) / denom
    };
  }

  /**
   * ৪ কোণার অনুপাত মেপে কাগজের মাপ ও টার্গেট রেজোলিউশন নির্ধারণ (§৫)
   * Legal ≈ ১.৬৫, Letter ≈ ১.২৯, বাকি সব A4 (≈ ১.৪১৪)
   */
  function pickPaperSize(corners) {
    const [c0, c1, c2, c3] = corners; // TL, TR, BR, BL
    const wTop = Math.hypot(c1.x - c0.x, c1.y - c0.y);
    const wBot = Math.hypot(c2.x - c3.x, c2.y - c3.y);
    const wAvg = (wTop + wBot) / 2;

    const hLeft = Math.hypot(c3.x - c0.x, c3.y - c0.y);
    const hRight = Math.hypot(c2.x - c1.x, c2.y - c1.y);
    const hAvg = (hLeft + hRight) / 2;

    const isLandscape = wAvg > hAvg;
    const ratio = isLandscape ? (wAvg / Math.max(1, hAvg)) : (hAvg / Math.max(1, wAvg));

    let paperName = 'A4';
    let stdRatio = 297 / 210; // ≈ 1.414

    if (ratio >= 1.53) {
      paperName = 'Legal';
      stdRatio = 14 / 8.5; // ≈ 1.647
    } else if (ratio <= 1.35) {
      paperName = 'Letter';
      stdRatio = 11 / 8.5; // ≈ 1.294
    }

    let targetW, targetH;
    if (isLandscape) {
      targetH = Math.max(600, Math.round(hAvg));
      targetW = Math.round(targetH * stdRatio);
    } else {
      targetW = Math.max(600, Math.round(wAvg));
      targetH = Math.round(targetW * stdRatio);
    }

    return {
      name: paperName,
      ratio: Number(ratio.toFixed(3)),
      stdRatio: Number(stdRatio.toFixed(3)),
      isLandscape: isLandscape,
      width: targetW,
      height: targetH
    };
  }

  /**
   * Bilinear ইন্টারপোলেশন দিয়ে পিক্সেল ম্যাপিং ও ওয়ার্প
   * srcImg: { data: Uint8Array|Uint8ClampedArray, width, height }
   * dstW, dstH: গন্তব্য মাপ
   * srcCorners: ৪টি উৎস বিন্দু [TL, TR, BR, BL]
   */
  function warpBilinearPixels(srcImg, dstW, dstH, srcCorners) {
    const sw = srcImg.width, sh = srcImg.height;
    const sdata = srcImg.data;

    const dstCorners = [
      { x: 0, y: 0 },
      { x: dstW, y: 0 },
      { x: dstW, y: dstH },
      { x: 0, y: dstH }
    ];

    // গন্তব্য থেকে উৎসে ম্যাপিং (inverse homography)
    const invH = findHomography(dstCorners, srcCorners);

    const outData = new Uint8ClampedArray(dstW * dstH * 4);

    for (let v = 0; v < dstH; v++) {
      for (let u = 0; u < dstW; u++) {
        const denom = invH[6] * u + invH[7] * v + invH[8];
        if (Math.abs(denom) < 1e-12) continue;

        const sx = (invH[0] * u + invH[1] * v + invH[2]) / denom;
        const sy = (invH[3] * u + invH[4] * v + invH[5]) / denom;

        if (sx < 0 || sx >= sw - 1 || sy < 0 || sy >= sh - 1) {
          // সীমানার বাইরে থাকলে নিকটস্থ মান বা ক্ল্যাম্প
          const cx = Math.max(0, Math.min(sw - 1, Math.round(sx)));
          const cy = Math.max(0, Math.min(sh - 1, Math.round(sy)));
          const sidx = (cy * sw + cx) * 4;
          const didx = (v * dstW + u) * 4;
          outData[didx] = sdata[sidx];
          outData[didx + 1] = sdata[sidx + 1];
          outData[didx + 2] = sdata[sidx + 2];
          outData[didx + 3] = sdata[sidx + 3];
          continue;
        }

        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        const x1 = x0 + 1, y1 = y0 + 1;
        const dx = sx - x0, dy = sy - y0;

        const w00 = (1 - dx) * (1 - dy);
        const w10 = dx * (1 - dy);
        const w01 = (1 - dx) * dy;
        const w11 = dx * dy;

        const idx00 = (y0 * sw + x0) * 4;
        const idx10 = (y0 * sw + x1) * 4;
        const idx01 = (y1 * sw + x0) * 4;
        const idx11 = (y1 * sw + x1) * 4;

        const didx = (v * dstW + u) * 4;
        for (let c = 0; c < 4; c++) {
          outData[didx + c] = Math.round(
            w00 * sdata[idx00 + c] +
            w10 * sdata[idx10 + c] +
            w01 * sdata[idx01 + c] +
            w11 * sdata[idx11 + c]
          );
        }
      }
    }

    return {
      width: dstW,
      height: dstH,
      data: outData
    };
  }

  /**
   * ব্রাউজারে ক্যানভাস থেকে ওয়ার্প করে নতুন ক্যানভাস ফেরত দেওয়া
   */
  function warpCanvas(srcCanvas, srcCorners, targetPaper) {
    if (typeof document === 'undefined') {
      throw new Error('warpCanvas শুধু ব্রাউজার পরিবেশে প্রযোজ্য');
    }
    const paper = targetPaper || pickPaperSize(srcCorners);
    const ctx = srcCanvas.getContext('2d');
    const srcImgData = ctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const warped = warpBilinearPixels(srcImgData, paper.width, paper.height, srcCorners);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = paper.width;
    outCanvas.height = paper.height;
    const outCtx = outCanvas.getContext('2d');
    const outImgData = outCtx.createImageData(paper.width, paper.height);
    outImgData.data.set(warped.data);
    outCtx.putImageData(outImgData, 0, 0);

    return { canvas: outCanvas, paper: paper };
  }

  const api = {
    findHomography: findHomography,
    applyHomography: applyHomography,
    pickPaperSize: pickPaperSize,
    warpBilinearPixels: warpBilinearPixels,
    warpCanvas: warpCanvas
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FayzarHomography = api;
})(typeof window !== 'undefined' ? window : globalThis);
