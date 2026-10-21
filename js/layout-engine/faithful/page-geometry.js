/**
 * Fayzar — পাতা-মাপার ইঞ্জিন (FayzarPageGeometry)
 * ===============================================
 * Part-17.4 (হুবহু-লেআউট ধাপ ৩): পাতার ছবির আসল কালি থেকে প্রতিটি Gemini-ব্লকের নিখুঁত জ্যামিতি।
 * "Gemini বলবে কী, আমাদের ইঞ্জিন বলবে ঠিক কোথায় ও কত বড়।"
 *
 *  inkMask(img)                       RGBA → কালি-মানচিত্র (লুমিন্যান্স < thr)
 *  components(mask, rect)             সংযুক্ত কালি-খণ্ড (bbox + পিক্সেল-সংখ্যা)
 *  blockMetrics(mask, box, opts)      ব্লক-বক্সের খণ্ড (কেন্দ্র ভেতরে) → নিখুঁত সীমা, লাইন, লাইনের উচ্চতা/দূরত্ব,
 *                                     প্রথম-লাইন ইনডেন্ট, অবস্থান (বাম/মাঝে/ডানে/দুপাশে)
 *  pageMargins(mask, opts)            পুরো পাতার কালি-সীমা → মার্জিন
 *  estimateFontPt(lineInkPt, pitchPt) লাইনের উচ্চতা/দূরত্ব → ফন্ট-আকার (pt) — অনুপাত ক্যালিব্রেশনযোগ্য
 *
 * সব একক: পিক্সেল ইনপুট, pt আউটপুট (pxPerPt দেওয়া থাকলে)। বিশুদ্ধ — DOM নেই, Node-এ টেস্টযোগ্য।
 */
(function (global) {
  'use strict';
  // [প্যাক-১১ গেট-ফাংশন] GRIDFIRST, FORMFIX, PLEADER ডিফল্ট-চালু; যেকোনো সুইচ বা নিয়ম window.__FZ_OFF_<নাম> (FZ_OFF=<নাম>) দিয়ে বন্ধযোগ্য।
  const fzOn = (k) => !(typeof globalThis !== 'undefined' ? globalThis['__FZ_OFF_' + k] : global['__FZ_OFF_' + k]);
  const SPECK_OFF = !!global.__FZ_OFF_SPECK;   // নির্ণয়-সুইচ (ছিটে-বাদ বন্ধ করতে)
  // B2 টেবিল রেখা-জাল সুইচ: শুধু globalThis.__FZ_ON_TABLEGRID সত্য হলে সক্রিয়
  const tableGridOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_TABLEGRID : global.__FZ_ON_TABLEGRID);
  // A02_RULES_v2: রেখা/টেবিল-দাগ, ফ্রেম ও ছোট বাক্স শনাক্তকরণ সুইচ (__FZ_ON_RULES2 / FZ_ON=RULES2, বন্ধ: __FZ_OFF_RULES2)
  const rules2On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_RULES2 || (globalThis.window && globalThis.window.__FZ_OFF_RULES2))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_RULES2) ||
    (global && (global.__FZ_OFF_RULES2 || (global.window && global.window.__FZ_OFF_RULES2))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_RULES2 === '1' ||
      process.env.__FZ_OFF_RULES2 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((x) => x.trim()).includes('RULES2'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_RULES2 || (globalThis.window && globalThis.window.__FZ_ON_RULES2))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_RULES2) ||
    (global && (global.__FZ_ON_RULES2 || (global.window && global.window.__FZ_ON_RULES2))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_RULES2 === '1' ||
      process.env.__FZ_ON_RULES2 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((x) => x.trim()).includes('RULES2'))
    ))
  );

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const median = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

  function inkMask(img, thr) {
    const T = thr || 160, W = img.width, H = img.height, d = img.data, N = W * H;
    const mask = new Uint8Array(N);
    if (!global.__FZ_ON_OTSU) {
      for (let i = 0; i < N; i++) if ((d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000 < T) mask[i] = 1;
      const out = { W, H, mask };
      Object.defineProperty(out, 'thr', { value: T, enumerable: false });
      return out;
    }
    if (thr) {
      for (let i = 0; i < N; i++) if ((d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000 < T) mask[i] = 1;
      return { W, H, mask, thr: T };
    }
    // FZ_ON=OTSU: এক পাসে লুমিন্যান্স ও টাইল-হিস্টোগ্রাম; হালকা কালি ও অসম আলো/ছায়ায় লোকাল Otsu + পটভূমি-নরমালাইজেশন (সীমা ১১০–২০০)
    const lum = new Uint8Array(N), gHist = new Int32Array(256);
    const GX = W >= 64 && H >= 64 ? clamp(Math.round(W / 160), 4, 12) : 1;
    const GY = W >= 64 && H >= 64 ? clamp(Math.round(H / 160), 4, 16) : 1;
    const nTiles = GX * GY, tHist = new Int32Array(nTiles * 256), tTot = new Int32Array(nTiles);
    for (let y = 0, i = 0, j = 0; y < H; y++) {
      const tyOff = (((y * GY) / H) | 0) * GX;
      for (let tx = 0; tx < GX; tx++) {
        const xEnd = (((tx + 1) * W) / GX) | 0, tid = tyOff + tx, hOff = tid << 8;
        let cnt = 0;
        for (let x = ((tx * W) / GX) | 0; x < xEnd; x++, i++, j += 4, cnt++) {
          const v = ((d[j] * 299 + d[j + 1] * 587 + d[j + 2] * 114 + 500) / 1000) | 0;
          lum[i] = v; tHist[hOff + v]++;
        }
        tTot[tid] += cnt;
      }
    }
    const pct = (h, off, tot, q) => { const tg = tot * q; let a = 0; for (let v = 0; v < 256; v++) { a += h[off + v]; if (a >= tg) return v; } return 255; };
    const otsu = (h, off, tot, bg, allowFaded) => {
      const maxT = Math.min(205, Math.max(95, Math.round(bg - 12))), minW = Math.max(4, tot * 0.0005);
      let sum = 0; for (let v = 0; v < 256; v++) sum += v * h[off + v];
      let wB = 0, sB = 0, best = -1, bmB = 0, bmF = bg;
      for (let t = 0; t <= maxT; t++) {
        const c = h[off + t]; wB += c; sB += t * c; if (wB < minW) continue;
        const wF = tot - wB; if (wF < minW) break;
        const mB = sB / wB, mF = (sum - sB) / wF, df = mF - mB;
        if (df >= 16 && wB * wF * df * df > best) { best = wB * wF * df * df; bmB = mB; bmF = mF; }
      }
      if (best <= 0) return null;
      let bt = Math.round((bmB + bmF) * 0.5);
      // উজ্জ্বল পাতায় কালো লেখার পাশাপাশি ফিকে ধূসর কালি (১৪০..bg−২২) থাকলে ওপরের পরিসরে দ্বিতীয় Otsu
      if (allowFaded && bg >= 220 && bt < 175) {
        const loG = 140, hiG = Math.min(200, Math.round(bg - 22));
        let gCnt = 0; for (let v = loG; v <= hiG; v++) gCnt += h[off + v];
        if (gCnt >= Math.max(6, tot * 0.004)) {
          let tot2 = 0, sum2 = 0; for (let v = loG; v < 256; v++) { const c = h[off + v]; tot2 += c; sum2 += v * c; }
          let w2 = 0, s2 = 0, b2 = -1, mB2 = loG, mF2 = bg;
          for (let t = loG; t <= maxT; t++) {
            const c = h[off + t]; w2 += c; s2 += t * c; if (w2 < Math.max(4, tot * 0.003)) continue;
            const wF2 = tot2 - w2; if (wF2 < minW) break;
            const m0 = s2 / w2, m1 = (sum2 - s2) / wF2, df = m1 - m0;
            if (df >= 18 && w2 * wF2 * df * df > b2) { b2 = w2 * wF2 * df * df; mB2 = m0; mF2 = m1; }
          }
          if (b2 > 0 && mB2 <= bg - 22) bt = Math.max(bt, Math.round((mB2 + mF2) * 0.5));
        }
      }
      if (bg >= 235 && bt < 160 && bmB < 100) bt = Math.round(160 - (160 - bt) * 0.1);
      return clamp(bt, 110, Math.min(200, maxT));
    };
    if (nTiles === 1) {
      const bg = pct(tHist, 0, N, 0.85), gT = otsu(tHist, 0, N, bg, bg >= 220) || clamp(Math.round(bg - 22), 110, 160);
      for (let i = 0; i < N; i++) if (lum[i] < gT) mask[i] = 1;
      return { W, H, mask, thr: gT };
    }
    const rawBg = new Float64Array(nTiles), validBgs = [];
    for (let k = 0; k < nTiles; k++) { const b = pct(tHist, k << 8, tTot[k], 0.85); rawBg[k] = b; if (b >= 90) validBgs.push(b); }
    const medBg = validBgs.length ? median(validBgs) : 240;
    for (let k = 0; k < nTiles; k++) if (rawBg[k] < 90) rawBg[k] = medBg;
    const smBg = new Float64Array(nTiles);
    let minBg = 255, maxBg = 0;
    for (let ty = 0; ty < GY; ty++) for (let tx = 0; tx < GX; tx++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const ny = ty + dy, nx = tx + dx;
        if (ny >= 0 && ny < GY && nx >= 0 && nx < GX) { const w = (dx === 0 && dy === 0) ? 4 : 1; s += rawBg[ny * GX + nx] * w; c += w; }
      }
      const b = s / c; smBg[ty * GX + tx] = b; if (b < minBg) minBg = b; if (b > maxBg) maxBg = b;
    }
    const hasShadow = (maxBg - minBg) >= 18, refBg = Math.max(160, maxBg);
    for (let k = 0; k < nTiles; k++) {
      const hOff = k << 8, sc = hasShadow ? (refBg / Math.max(90, smBg[k])) : 1;
      for (let v = 0; v < 256; v++) { const c = tHist[hOff + v]; if (c) gHist[hasShadow ? clamp(Math.round(v * sc), 0, 255) : v] += c; }
    }
    const gBg = hasShadow ? refBg : pct(gHist, 0, N, 0.85), gT = otsu(gHist, 0, N, gBg, !hasShadow && gBg >= 220) || clamp(Math.round(gBg - 22), 110, 160);
    const normT = new Float64Array(nTiles), nh = new Int32Array(256);
    for (let k = 0; k < nTiles; k++) {
      const bg = smBg[k], sc = hasShadow ? (refBg / Math.max(90, bg)) : 1;
      let lt = null;
      if (hasShadow) {
        nh.fill(0); const hOff = k << 8;
        for (let v = 0; v < 256; v++) { const c = tHist[hOff + v]; if (c) nh[clamp(Math.round(v * sc), 0, 255)] += c; }
        lt = otsu(nh, 0, tTot[k], refBg, bg >= 220);
      } else lt = otsu(tHist, k << 8, tTot[k], bg, bg >= 220);
      normT[k] = lt != null ? Math.max(gT, Math.round(lt * 0.85 + gT * 0.15)) : gT;
    }
    // টাইল-সীমানায় ফিকে কালি বা ছায়া যেন ধাপ না ফেলে সেজন্য ৩×৩ প্রতিবেশী মসৃণকরণ ও দ্বিরৈখিক প্রক্ষেপণ
    const tileT = new Float64Array(nTiles);
    let minT = 255, maxT = 0;
    for (let ty = 0; ty < GY; ty++) for (let tx = 0; tx < GX; tx++) {
      const k = ty * GX + tx, bg = hasShadow ? Math.min(rawBg[k], smBg[k]) : smBg[k], sc = hasShadow ? (refBg / Math.max(90, bg)) : 1;
      let s = 0, c = 0, hiN = normT[k];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const ny = ty + dy, nx = tx + dx;
        if (ny >= 0 && ny < GY && nx >= 0 && nx < GX) {
          const nk = ny * GX + nx, w = (dx === 0 && dy === 0) ? 4 : 1;
          s += normT[nk] * w; c += w;
          if (normT[nk] > hiN) hiN = normT[nk];
        }
      }
      const boost = hiN > gT ? (hiN * 0.96 + gT * 0.04) / sc : 0;
      const lo = hasShadow ? clamp(Math.round(110 * bg / refBg), 70, 110) : 110;
      const hi = Math.min(200, Math.max(lo, Math.round(bg - (hasShadow ? 18 : 12))));
      const t = clamp(Math.round(Math.max((s / c) / sc, boost)), lo, hi);
      tileT[k] = t; if (t < minT) minT = t; if (t > maxT) maxT = t;
    }
    if (maxT - minT <= 2) {
      const uT = clamp(Math.round((minT + maxT) * 0.5), 110, 200);
      for (let i = 0; i < N; i++) if (lum[i] < uT) mask[i] = 1;
      return { W, H, mask, thr: uT };
    }
    const rowT = new Int32Array(GX), xC = new Int32Array(GX);
    for (let tx = 0; tx < GX; tx++) xC[tx] = Math.floor((tx + 0.5) * W / GX);
    for (let y = 0; y < H; y++) {
      const fy = ((y + 0.5) * GY) / H - 0.5, ty0 = clamp(Math.floor(fy), 0, GY - 1), ty1 = clamp(ty0 + 1, 0, GY - 1), wy = clamp(fy - ty0, 0, 1);
      for (let tx = 0; tx < GX; tx++) rowT[tx] = Math.round(((1 - wy) * tileT[ty0 * GX + tx] + wy * tileT[ty1 * GX + tx]) * 256);
      let i = y * W;
      for (let x = 0, t0 = rowT[0], xE = xC[0]; x < xE; x++, i++) if ((lum[i] << 8) < t0) mask[i] = 1;
      for (let tx = 0; tx < GX - 1; tx++) {
        const xA = xC[tx], xB = xC[tx + 1], dt = ((rowT[tx + 1] - rowT[tx]) / Math.max(1, xB - xA)) | 0;
        for (let x = xA, tCur = rowT[tx]; x < xB; x++, i++, tCur += dt) if ((lum[i] << 8) < tCur) mask[i] = 1;
      }
      for (let x = xC[GX - 1], tL = rowT[GX - 1]; x < W; x++, i++) if ((lum[i] << 8) < tL) mask[i] = 1;
    }
    const mT = clamp(Math.round(!hasShadow && maxT > gT ? maxT : tileT.reduce((a, b) => a + b, 0) / nTiles), 110, 200);
    return { W, H, mask, thr: mT };
  }

  /**
   * ২০২৬-১০-১৪: ফিকে স্ক্যান (a05: ধূসর লেখা ~১৭০–১৯০) — ১৬০-সীমায় লেখা কালি হয় না ⇒ লাইন/সারি-মাপ অন্ধ।
   * Otsu-সীমা, ১৬০–২০৫-এ সীমিত (ঝকঝকে পাতায় Otsu ≈১২৮ ⇒ ১৬০ অপরিবর্তিত); FZ_ON=OTSU-তে ১১০–২০০ পরিসরে ডায়নামিক Otsu।
   */
  function otsuThreshold(img) {
    if (global.__FZ_ON_OTSU) {
      if (img && img.width > 0 && img.height > 0) return inkMask(img).thr;
      const d0 = (img && img.data) || [], n0 = d0.length >> 2;
      return n0 ? inkMask({ width: n0, height: 1, data: d0 }).thr : 160;
    }
    const d = img.data, hist = new Float64Array(256);
    for (let i = 0; i < d.length; i += 4) hist[Math.round((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000)]++;
    let tot = 0, sum = 0; for (let v = 0; v < 256; v++) { tot += hist[v]; sum += v * hist[v]; }
    let wB = 0, sB = 0, best = -1, bt = 160;
    for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; bt = t; } }
    return Math.max(160, Math.min(205, bt));
  }

  /** সংযুক্ত খণ্ড (8-connected) — ঐচ্ছিক rect-এ সীমিত; পুরো পাতায় একবার চালিয়ে পুনর্ব্যবহারযোগ্য */
  function components(m, rect, minPix) {
    const { W, H, mask } = m;
    const x0 = rect ? clamp(Math.floor(rect.x0), 0, W) : 0, y0 = rect ? clamp(Math.floor(rect.y0), 0, H) : 0;
    const x1 = rect ? clamp(Math.ceil(rect.x1), 0, W) : W, y1 = rect ? clamp(Math.ceil(rect.y1), 0, H) : H;
    const seen = new Uint8Array(W * H), st = new Int32Array(Math.max(16, (x1 - x0) * (y1 - y0)));
    const out = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const s0 = y * W + x;
      if (!mask[s0] || seen[s0]) continue;
      let sp = 0; st[sp++] = s0; seen[s0] = 1;
      let cx0 = x, cy0 = y, cx1 = x, cy1 = y, n = 0;
      while (sp) {
        const p = st[--sp]; const py = (p / W) | 0, px = p - py * W; n++;
        if (px < cx0) cx0 = px; if (px > cx1) cx1 = px; if (py < cy0) cy0 = py; if (py > cy1) cy1 = py;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = py + dy; if (ny < y0 || ny >= y1) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx; if (nx < x0 || nx >= x1) continue;
            const q = ny * W + nx; if (mask[q] && !seen[q]) { seen[q] = 1; if (sp < st.length) st[sp++] = q; }
          }
        }
      }
      if (n >= (minPix || 4)) out.push({ x0: cx0, y0: cy0, x1: cx1, y1: cy1, n });
    }
    return out;
  }

  /**
   * খণ্ডগুলো থেকে মুদ্রিত লাইন: অনুভূমিক প্রক্ষেপণে ফাঁকা সারির ফাঁক দিয়ে ভাগ; বাংলা মাত্রা/নিচের কার-এর ছোট ফাঁক জোড়া।
   * @returns [{ y0, y1, x0, x1 }]
   */
  function linesOf(comps, H) {
    if (!comps.length) return [];
    const ys0 = Math.min(...comps.map((c) => c.y0)), ys1 = Math.max(...comps.map((c) => c.y1));
    const prof = new Float64Array(ys1 - ys0 + 2);
    for (const c of comps) for (let y = c.y0; y <= c.y1; y++) prof[y - ys0] += 1;
    const bands = []; let inB = false, b0 = 0;
    for (let i = 0; i < prof.length; i++) {
      if (prof[i] > 0 && !inB) { inB = true; b0 = i; }
      else if (prof[i] === 0 && inB) { inB = false; bands.push([b0 + ys0, i - 1 + ys0]); }
    }
    if (inB) bands.push([b0 + ys0, prof.length - 1 + ys0]);
    // ২০২৬-১০-১৪ (a14 p3): ঘন স্ক্যানে দুই লাইনের কার/ফলা ছুঁয়ে এক ব্যান্ড (২ লাইন ⇒ "৩২pt ফন্টের ১ লাইন")। ব্যান্ডের খণ্ড-প্রোফাইলে
    // মাঝখানে গভীর খাদ (দুই পাশের চূড়ার ≤২৫%, প্রতিটি পাশ ব্যান্ডের ≥৩৫%) ⇒ সেখানে ভাগ। এক লাইনে খণ্ডগুলো পুরো উচ্চতা জুড়ে ⇒ খাদ নেই
    // (ওপরের কার-টুকরো পাশ-শর্তে বাদ)। FZ_ON=VSPLIT
    if (global.__FZ_ON_VSPLIT) {
      const split = (b0y, b1y, depth) => {
        const h = b1y - b0y + 1;
        if (depth > 4 || h < 12) return [[b0y, b1y]];
        const lo = Math.ceil(h * 0.35), hi = Math.floor(h * 0.65);
        let best = -1, bv = Infinity;
        for (let k = lo; k <= hi; k++) { const v = prof[b0y - ys0 + k]; if (v < bv) { bv = v; best = k; } }
        if (best < 0) return [[b0y, b1y]];
        let pa = 0, pb = 0;
        for (let k = 0; k < best; k++) pa = Math.max(pa, prof[b0y - ys0 + k]);
        for (let k = best + 1; k < h; k++) pb = Math.max(pb, prof[b0y - ys0 + k]);
        if (!(bv <= 0.25 * Math.min(pa, pb) && Math.min(pa, pb) >= 3)) return [[b0y, b1y]];
        return split(b0y, b0y + best - 1, depth + 1).concat(split(b0y + best + 1, b1y, depth + 1));
      };
      const out = [];
      for (const b of bands) out.push(...split(b[0], b[1], 0));
      bands.splice(0, bands.length, ...out);
    }
    // ছোট ব্যান্ড (কার/মাত্রার টুকরো) পাশের ব্যান্ডে জোড়া — উচ্চতার মধ্যমার ৪০%-এর কম আর ফাঁক ছোট হলে
    const hMed = median(bands.map((b) => b[1] - b[0] + 1));
    const merged = [];
    for (const b of bands) {
      const last = merged[merged.length - 1];
      const h = b[1] - b[0] + 1;
      // Part-17.9: ফাঁকও ছোট অংশটির নিজের উচ্চতার তুলনায় ছোট হতে হবে (কার-টুকরো লেগে থাকে; বড় শিরোনামের নিচের ছোট-ফন্টের আলাদা লাইন নয়)
      const smallH = last ? Math.min(h, last[1] - last[0] + 1) : h;
      if (last && (h < hMed * 0.4 || (last[1] - last[0] + 1) < hMed * 0.4) && b[0] - last[1] <= Math.max(2, Math.min(hMed * 0.35, smallH * 0.5))) { last[1] = b[1]; continue; }
      merged.push(b.slice());
    }
    return merged.map(([y0, y1]) => {
      const cs = comps.filter((c) => c.y1 >= y0 && c.y0 <= y1 && (Math.min(c.y1, y1) - Math.max(c.y0, y0)) >= (c.y1 - c.y0) * 0.5);
      return { y0, y1, x0: cs.length ? Math.min(...cs.map((c) => c.x0)) : 0, x1: cs.length ? Math.max(...cs.map((c) => c.x1)) : 0 };
    }).filter((l) => l.x1 > l.x0);
  }

  /** ফন্ট-আকার (pt): বহু-লাইনে লাইন-দূরত্ব ÷ pitchRatio, এক-লাইনে কালির উচ্চতা ÷ inkRatio (বাংলা মাত্রা+কার ধরে) */
  // Part-17.9: Word-এ মাপা (qa/calibrate-ink.mjs) — single spacing ≈ ১.১৫×ফন্ট, পূর্ণ বাংলা লাইনের কালি ≈ ০.৯৮×ফন্ট
  const RATIO = { pitch: 1.15, ink: 0.98 };
  function estimateFontPt(lineInkPt, pitchPt) {
    const v = pitchPt > 0 ? pitchPt / RATIO.pitch : lineInkPt / RATIO.ink;
    return clamp(Math.round(v * 2) / 2, 6, 48);
  }

  /**
   * ব্লকের জ্যামিতি।
   * @param m      inkMask() ফল
   * @param box    [ymin,xmin,ymax,xmax] (০–১০০০, Gemini)
   * @param opts   { pxPerPt, comps (পুরো পাতার খণ্ড, ঐচ্ছিক), align (Gemini-র) }
   */
  function blockMetrics(m, box, opts) {
    const o = opts || {}, W = m.W, H = m.H, ppt = o.pxPerPt || 1;
    const bx0 = box[1] / 1000 * W, by0 = box[0] / 1000 * H, bx1 = box[3] / 1000 * W, by1 = box[2] / 1000 * H;
    const all = o.comps || components(m, { x0: bx0 - 3, y0: by0 - 3, x1: bx1 + 3, y1: by1 + 3 }, 4);
    // Part-17.7: বক্সের চেয়ে অনেক বড় খণ্ড (পাতার ফ্রেম/বর্ডার, লম্বা রেখা) ব্লকের নয় — কেন্দ্র ভেতরে পড়লেও বাদ
    const bw = bx1 - bx0, bh = by1 - by0;
    // Part-17.8: খাড়া বিভাজক-রেখা (সরু, লম্বা) লেখার লাইন নয় — রাখলে সব লাইন এক হয়ে যেত
    const isVRule = (c) => (c.x1 - c.x0 + 1) <= Math.max(4, ppt * 2.5) && (c.y1 - c.y0 + 1) >= Math.max(30, bh * 0.5);
    const dash = o.comps && !o.isTable && !global.__FZ_OFF_DASH ? vDashComps(o.comps, W) : null;
    const mine = all.filter((c) => {
      const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2;
      if (!(cx >= bx0 && cx <= bx1 && cy >= by0 && cy <= by1)) return false;
      if (dash && dash.has(c)) return false;   // খাড়া ড্যাশ-সীমানা লেখা নয় (vDashComps)
      if (!o.isTable && isVRule(c)) return false;
      // Part-17.8: বক্সের বাইরে অনেকটা ছড়ানো খণ্ড (ভাঙা পাতার ফ্রেমের পাশ-রেখা ইত্যাদি) ব্লকের নয়
      const sx = W * 0.03, sy = H * 0.03;
      if (c.y0 < by0 - sy || c.y1 > by1 + sy || c.x0 < bx0 - sx || c.x1 > bx1 + sx) return false;
      return (c.x1 - c.x0 + 1) <= bw * 1.3 + 8 && (c.y1 - c.y0 + 1) <= bh * 1.3 + 8;
    });
    const res = { geminiPt: { x: bx0 / ppt, y: by0 / ppt, w: (bx1 - bx0) / ppt, h: (by1 - by0) / ppt }, empty: !mine.length };
    if (!mine.length) { res.rectPt = res.geminiPt; res.lines = []; return res; }
    // ২০২৬-১০-১৩: Gemini-বক্স একটু ডানে/বাঁয়ে সরা হলে কিনারার অক্ষর (f2: লাইনের শুরুর "১।") কেন্দ্র-নিয়মে বাদ পড়ত ⇒ মাপা বাঁ-প্রান্ত
    // ৬pt ভেতরে। বক্সের সারির ভেতরের পাশের খণ্ড, ≤৩pt ফাঁকে শিকল ধরে (প্রতি পাশে ≤২০pt) যোগ — পাশের কলামের লেখা ফাঁকে আলাদা থাকে
    if (!o.isTable && !o.noEdgeGrow) {
      const gap = 3 * ppt, maxGrow = 20 * ppt, mset = new Set(mine);
      const y0s = Math.min(...mine.map((c) => c.y0)), y1s = Math.max(...mine.map((c) => c.y1));
      const cand = all.filter((c) => !mset.has(c) && (c.y0 + c.y1) / 2 >= y0s && (c.y0 + c.y1) / 2 <= y1s &&
        (c.y1 - c.y0 + 1) <= Math.min(bh * 1.3 + 8, 40 * ppt) && (c.x1 - c.x0 + 1) <= 30 * ppt && !isVRule(c));
      let lx = Math.min(...mine.map((c) => c.x0)), rx = Math.max(...mine.map((c) => c.x1));
      const lx0 = lx, rx0 = rx;
      for (let grew = true; grew;) {
        grew = false;
        for (const c of cand) {
          if (mset.has(c)) continue;
          if (c.x1 < lx && lx - c.x1 <= gap && lx0 - c.x0 <= maxGrow) { mset.add(c); mine.push(c); lx = c.x0; grew = true; }
          else if (c.x0 > rx && c.x0 - rx <= gap && c.x1 - rx0 <= maxGrow) { mset.add(c); mine.push(c); rx = c.x1; grew = true; }
        }
      }
    }
    const tx0 = Math.min(...mine.map((c) => c.x0)), ty0 = Math.min(...mine.map((c) => c.y0));
    const tx1 = Math.max(...mine.map((c) => c.x1)) + 1, ty1 = Math.max(...mine.map((c) => c.y1)) + 1;
    res.rectPt = { x: tx0 / ppt, y: ty0 / ppt, w: (tx1 - tx0) / ppt, h: (ty1 - ty0) / ppt };
    // Part-17.7: রেখা-জাল আছে কি (টেবিলের সীমানা দৃশ্যমান?) — একটি খণ্ডই ব্লকের ≥৮০% চওড়া ও ≥৫০% উঁচু
    // (একাধিক ছোট সীমানাওয়ালা টেবিল ওপর-নিচে — প্রতিটি চওড়া খণ্ড; মোট উচ্চতা ≥৫০% হলেও জাল)
    const wide = mine.filter((c) => (c.x1 - c.x0 + 1) >= (tx1 - tx0) * 0.8 && (c.y1 - c.y0 + 1) >= Math.max(3, (ty1 - ty0) * 0.05));
    res.hasGrid = wide.some((c) => (c.y1 - c.y0 + 1) >= (ty1 - ty0) * 0.5) || wide.reduce((a, c) => a + (c.y1 - c.y0 + 1), 0) >= (ty1 - ty0) * 0.5;
    // সরু/ধূসর রেখা (১৫০ DPI-তে ভাঙা খণ্ড) — হালকা সীমার মাস্কে অনুভূমিক রেখা গোনা (≥২টি পূর্ণ-প্রস্থ রেখা ⇒ জাল)
    // Part-17.8: টেবিলের ঘরের লেখার কালি-উচ্চতা (রেখা-জাল ও বিন্দু বাদ; ৭৫তম শতাংশ) — ঘরের ফন্ট অনুমানে
    if (o.isTable) {
      const tw0 = tx1 - tx0, th0 = ty1 - ty0;
      const txt = mine.filter((c) => (c.x1 - c.x0) < tw0 * 0.5 && (c.y1 - c.y0) < th0 * 0.5 && !isVRule(c) &&
        !((c.y1 - c.y0 + 1) <= 3 && (c.x1 - c.x0) > 12)).map((c) => c.y1 - c.y0 + 1);
      // Part-17.8: কলাম-ফাঁক — লেখা-খণ্ডের x-প্রক্ষেপণে খালি অংশ (≥১০pt); কেন্দ্র pt-এ
      const tc = mine.filter((c) => (c.x1 - c.x0) < tw0 * 0.5 && (c.y1 - c.y0) < th0 * 0.5 && !isVRule(c));
      const occ = new Uint8Array(tx1 - tx0 + 1);
      tc.forEach((c) => { for (let x = c.x0; x <= c.x1; x++) occ[x - tx0] = 1; });
      const gut = [], gutW = []; let g0 = -1;
      for (let x = 0; x < occ.length; x++) {
        if (!occ[x]) { if (g0 < 0) g0 = x; continue; }
        // ভেতরের খালি অংশ (দুই পাশে লেখা) শেষ হলো
        // (≥৫pt: শব্দের ফাঁক সব সারিতে এক জায়গায় পড়ে না, কলাম-ফাঁক পড়ে — "১।  কবিতা লিখন"-এর সরু ফাঁকও ধরা)
        if (g0 > 0 && x - g0 >= 5 * ppt) { gut.push((tx0 + (g0 + x) / 2) / ppt); gutW.push((x - g0) / ppt); }
        g0 = -1;
      }
      res.colGuttersPt = gut;
      res.colGapMinPt = gutW.length ? Math.min(...gutW) : 0;   // সবচেয়ে সরু কলাম-ফাঁক — ঘরের ভেতরের ফাঁক এর অর্ধেক
      // Part-17.9: ঘরের লেখা-লাইনের কালি-উচ্চতা (সারি-লাইনের মধ্যমা) — অনুচ্ছেদের মতো একই ক্যালিব্রেটেড অনুপাতে ফন্ট
      if (txt.length >= 3) {
        const tcText = tc.filter((c) => !((c.y1 - c.y0 + 1) <= 3 && (c.x1 - c.x0) > 12));
        const rowLines = linesOf(tcText, H);
        const tl = rowLines.map((l) => l.y1 - l.y0 + 1);
        if (tl.length) res.cellInkPt = median(tl) / ppt;
        // ২০২৬-১০-১৫ (a17 p6): বিন্দু-সারির ক্ষুদ্র খণ্ডে ঘরের কালি-উচ্চতা ~১২% কমে যায় ⇒ অন্তত ২টি বিন্দু-লাইন থাকলে বিন্দুহীন লাইনের ৭৫তম শতাংশ আলাদা dotlessCellInkPt-এ সংরক্ষণ (যাতে f1/a03-এর সাধারণ ছকে cellInkPt না বাড়ে)। বন্ধ: FZ_OFF=DOTFONT
        if (!global.__FZ_OFF_DOTFONT && rowLines.length >= 4) {
          const medH = median(tl), dotH = Math.max(2.2 * ppt, medH * 0.28);
          const dotless = rowLines.filter((l) => {
            const cs = tcText.filter((c) => c.y1 >= l.y0 && c.y0 <= l.y1);
            const dots = cs.filter((c) => (c.y1 - c.y0 + 1) <= dotH && (c.x1 - c.x0 + 1) <= dotH * 1.5).length;
            return dots < 5 && dots <= cs.length * 0.35 && (cs.length - dots) >= 4;
          }).map((l) => l.y1 - l.y0 + 1);
          if (dotless.length >= 2 && rowLines.length - dotless.length >= 2) {
            const dlSort = dotless.slice().sort((a, b) => a - b);
            res.dotlessCellInkPt = dlSort[Math.round(0.75 * (dlSort.length - 1))] / ppt;
          }
        }
        // Part-17.9: কলামের লেখার অবস্থান (বাঁয়ে/ডানে/মাঝে) — প্রতিটি সারি-লাইনে কলামের লেখার বাম/ডান কিনারা কতটা এক
        const edges = [tx0, ...gut.map((g) => g * ppt), tx1];
        // B1 (#৩০): পুরো-টেবিলের সারি-লাইনে কোনো ঘরে ২–৩ লাইন থাকলে সারিটা এক লম্বা "লাইন" হয়ে ফন্ট ফুলত (g20: ১৩ ⇒ ১৮)।
        // প্রতিটি কলামে আলাদা লাইন-ভাগ ⇒ ঘরের ভেতরের লাইন আলাদা। প্রতি কলামের মধ্যমা, তারপর ওপরের চতুর্থাংশ —
        // শুধু-অঙ্কের কলাম ("১", "২": কালি ছোট) নামিয়ে দিত না (g18: ১০ ⇒ ৭)।
        // শুধু তখনই, যখন কোনো কলামে সারি-লাইনের চেয়ে বেশি লাইন (ঘরে বহু-লাইন ⇒ সারি জুড়ে গিয়েছিল);
        // নইলে সারি-লাইনই ভালো (এক-অক্ষরের ঘর "ক খ গ" — কলামে আলাদা মাপলে কালি ছোট, g36: ৯.৫ ⇒ ৮)
        if (gut.length) {
          const meds = [];
          let nl = 0, maxCol = 0;
          edges.slice(1).forEach((e1, j) => {
            const cs = tcText.filter((c) => (c.x0 + c.x1) / 2 >= edges[j] && (c.x0 + c.x1) / 2 < e1);
            const hs = linesOf(cs, H).map((l) => l.y1 - l.y0 + 1);
            if (hs.length) { meds.push(median(hs)); nl += hs.length; maxCol = Math.max(maxCol, hs.length); }
          });
          if (nl >= 3 && meds.length && maxCol > rowLines.length) {
            meds.sort((a, b) => a - b);
            res.cellInkPt = meds[Math.round(0.75 * (meds.length - 1))] / ppt;
          }
        }
        // a07 (কাত/বাঁকা স্ক্যান): পুরো প্রস্থে লাইন খুঁজলে বাঁ-কলামের লাইন ডান-কলামের পাশের লাইনের সাথে জুড়ে "লম্বা লাইন"
        // (৪০ ছাপা লাইন ⇒ ৯, কালি ৩০.৭pt ⇒ ফন্ট ১৮, এক পাতা ⇒ ৫)। সরু খাড়া ফালিতে (~৬০pt) আলাদা লাইন — কাতের প্রভাব নগণ্য।
        // ফালির মধ্যমা ১.৫ গুণের বেশি ছোট হলে সেটিই
        if (res.cellInkPt) {
          const sw = 60 * ppt, hs = [];
          for (let x0 = tx0; x0 < tx1; x0 += sw) {
            const cs = tcText.filter((c) => (c.x0 + c.x1) / 2 >= x0 && (c.x0 + c.x1) / 2 < x0 + sw);
            linesOf(cs, H).forEach((l) => hs.push(l.y1 - l.y0 + 1));
          }
          if (hs.length >= 6) {
            const sm = median(hs) / ppt;
            if (sm * 1.5 < res.cellInkPt) { res.cellInkPtRow = res.cellInkPt; res.cellInkPt = sm; }
          }
        }
        const tol = Math.max(3, 3 * ppt);
        // Part-17.9: প্রতিটি সারি-লাইন × কলামের লেখার কালি-প্রস্থ (pt) — প্রস্থ-ভিত্তিক ঘরের ফন্ট-অনুমানের জন্য
        res.cellBox = rowLines.map((l) => edges.slice(1).map((e1, j) => {
          const cs = tcText.filter((c) => c.y1 >= l.y0 && c.y0 <= l.y1 && (c.x0 + c.x1) / 2 >= edges[j] && (c.x0 + c.x1) / 2 < e1);
          return cs.length ? [Math.min(...cs.map((c) => c.x0)) / ppt, (Math.max(...cs.map((c) => c.x1)) + 1) / ppt] : null;
        }));
        res.cellInk = res.cellBox.map((r) => r.map((b) => (b ? b[1] - b[0] : 0)));
        res.colEdgesPt = edges.map((e) => e / ppt);
        res.colAligns = edges.slice(1).map((e1, j) => {
          const e0 = edges[j], L = [], Rr = [];
          rowLines.forEach((l) => {
            const cs = tcText.filter((c) => c.y1 >= l.y0 && c.y0 <= l.y1 && (c.x0 + c.x1) / 2 >= e0 && (c.x0 + c.x1) / 2 < e1);
            if (!cs.length) return;
            L.push(Math.min(...cs.map((c) => c.x0))); Rr.push(Math.max(...cs.map((c) => c.x1)));
          });
          if (L.length < 2) return 'c';
          const share = (arr) => { const md = median(arr); return arr.filter((v) => Math.abs(v - md) <= tol).length / arr.length; };
          const sl = share(L), sr = share(Rr);
          return sl >= 0.7 && sl >= sr ? 'l' : (sr >= 0.7 ? 'r' : 'c');
        });
      }
    }
    // Part-17.9: টেবিল-আয়তের ভেতরে পুরো-প্রস্থ সাদা আড়াআড়ি ফাঁক (≥৩pt) — একাধিক আলাদা টেবিল এক করে দেওয়া হয়েছে কি না
    if (o.isTable) {
      const gm = o.gridMask || m, gaps = [];
      let g0 = -1;
      for (let y = ty0 + 1; y < ty1 - 1; y++) {
        let blank = true;
        for (let x = tx0; x < tx1; x++) if (gm.mask[y * W + x]) { blank = false; break; }
        if (blank) { if (g0 < 0) g0 = y; }
        else { if (g0 >= 0 && y - g0 >= 3 * ppt) gaps.push([g0 / ppt, y / ppt]); g0 = -1; }
      }
      res.tableGapsPt = gaps;
      // ফরম-টেবিল: খাড়া দাগ (কলাম-সীমা) — প্রতি x-কলামে ≥১৫pt টানা কালির মোট দৈর্ঘ্য; লেখার অক্ষর এত লম্বা টানা হয় না।
      // পাশের x-গুলো (দাগের পুরুত্ব/সামান্য কাত) এক দাগ; cov = টেবিল-উচ্চতার কত ভাগ জুড়ে
      {
        const minRun = 15 * ppt, th = ty1 - ty0, xs = [];
        for (let x = Math.max(0, tx0 - 2); x < Math.min(W, tx1 + 2); x++) {
          let run = 0, long = 0;
          for (let y = ty0; y < ty1; y++) { if (gm.mask[y * W + x]) run++; else { if (run >= minRun) long += run; run = 0; } }
          if (run >= minRun) long += run;
          if (long >= th * 0.12) xs.push({ x, long });
        }
        const rules = [];
        xs.forEach((p) => { const r = rules[rules.length - 1]; if (r && p.x - r.x1 <= Math.max(2, ppt * 1.5)) { r.x1 = p.x; if (p.long > r.long) { r.long = p.long; r.xm = p.x; } } else rules.push({ x0: p.x, x1: p.x, xm: p.x, long: p.long }); });
        // ২০২৬-১০-১৫ (a02 পরিবার-ছক): ধূসর শিরোনাম-সারি হালকা মাস্কে (২২৫) পুরো প্রস্থ জুড়ে টানা কালো পটি হয়ে খাড়া দাগ গিলে ফেলে ⇒
        // চওড়া পটি (>৪pt) দেখা দিলে মূল মাস্কে (১৬০) খাড়া দাগ মাপা। বন্ধ: FZ_OFF=SHADECOL
        let finalRules = rules;
        // [Rule PG1: FZ_OFF=GRIDFIRST / FZ_OFF=PG1] আদর্শ রেজোলিউশনের পাতায় (W <= 1300) হালকা মাস্কে (gm) ছকের বাইরের হালকা খাড়া বর্ডার উদ্ধার (a16 চেকলিস্ট ছক; বড় স্ক্যান পাতা a10 অক্ষুণ্ণ)।
        if (fzOn('GRIDFIRST') && !global.__FZ_OFF_PG1 && W <= 1300 && gm !== m && rules.length >= 4) {
          const sx0 = Math.max(0, Math.floor(Math.max(tx0 - 10 * ppt, bx0 - 4 * ppt))), sx1 = Math.min(W, Math.ceil(Math.min(tx1 + 10 * ppt, bx1 + 4 * ppt)));
          const xsW = [];
          for (let x = sx0; x < sx1; x++) {
            let run = 0, long = 0;
            for (let y = ty0; y < ty1; y++) { if (gm.mask[y * W + x]) run++; else { if (run >= minRun) long += run; run = 0; } }
            if (run >= minRun) long += run;
            if (long >= th * 0.12) xsW.push({ x, long });
          }
          const rW = [];
          xsW.forEach((p) => { const r = rW[rW.length - 1]; if (r && p.x - r.x1 <= Math.max(2, ppt * 1.5)) { r.x1 = p.x; if (p.long > r.long) { r.long = p.long; r.xm = p.x; } } else rW.push({ x0: p.x, x1: p.x, xm: p.x, long: p.long }); });
          if (rW.length >= rules.length) finalRules = rW;
        }
        if (!global.__FZ_OFF_SHADECOL && global.__FZ_ON_SHADECOL && gm !== m && rules.length <= 2 && rules.some((r) => r.x1 - r.x0 > (tx1 - tx0) * 0.5)) {
          const xsM = [];
          for (let x = Math.max(0, tx0 - 2); x < Math.min(W, tx1 + 2); x++) {
            let run = 0, long = 0;
            for (let y = ty0; y < ty1; y++) { if (m.mask[y * W + x]) run++; else { if (run >= minRun) long += run; run = 0; } }
            if (run >= minRun) long += run;
            if (long >= th * 0.12) xsM.push({ x, long });
          }
          const rM = [];
          xsM.forEach((p) => { const r = rM[rM.length - 1]; if (r && p.x - r.x1 <= Math.max(2, ppt * 1.5) && p.x - r.x0 <= Math.max(6, ppt * 4)) { r.x1 = p.x; if (p.long > r.long) { r.long = p.long; r.xm = p.x; } } else rM.push({ x0: p.x, x1: p.x, xm: p.x, long: p.long }); });
          if (rM.length >= 2) finalRules = rM;
        }
        res.vRulesPt = finalRules.map((r) => {
          const outR = { x: (r.x0 + r.x1) / 2 / ppt, cov: Math.round(r.long / th * 100) / 100 };
          if (tableGridOn()) {
            let ry0 = ty1, ry1 = ty0, runStart = -1, runLen = 0;
            const xm = Math.round((r.x0 + r.x1) / 2);
            for (let y = ty0; y <= ty1; y++) {
              const on = y < ty1 && (gm.mask[y * W + xm] || (xm > 0 && gm.mask[y * W + xm - 1]) || (xm + 1 < W && gm.mask[y * W + xm + 1]));
              if (on) {
                if (runStart < 0) runStart = y;
                runLen++;
              } else if (runStart >= 0) {
                if (runLen >= minRun) {
                  if (runStart < ry0) ry0 = runStart;
                  if (y - 1 > ry1) ry1 = y - 1;
                }
                runStart = -1;
                runLen = 0;
              }
            }
            outR.y0 = Math.round((ry0 <= ry1 ? ry0 : ty0) / ppt * 10) / 10;
            outR.y1 = Math.round((ry0 <= ry1 ? ry1 + 1 : ty1) / ppt * 10) / 10;
          }
          return outR;
        });
      }
      // g41: পূর্ণ-প্রস্থ আড়াআড়ি রেখার অবস্থান (pt) — শুধু ওপর-নিচের সীমানা থাকলে Gemini-র "লাইন-সারি" আসলে
      // এক সারির বহু-লাইনের ঘর (রেফারেন্স-ছক)। লেখার লাইনের কেন্দ্রও (সারি-বণ্টনের জন্য)।
      const hr = { x0: Math.max(0, Math.floor(tx0)), y0: Math.max(0, Math.floor(ty0) - 6), x1: Math.min(W, Math.ceil(tx1)), y1: Math.min(H, Math.ceil(ty1) + 6) };
      let hys = hLinePositions(gm, hr);
      if (tableGridOn() && res.vRulesPt && res.vRulesPt.length >= 3) {
        const candYs = hLinePositions(gm, Object.assign({}, hr, { minFrac: 0.55 }));
        if (candYs.length > hys.length) {
          const vXs = res.vRulesPt.map((v) => v.x * ppt);
          const validPartial = candYs.filter((y) => {
            if (hys.some((hy) => Math.abs(hy - y) <= 3 * ppt)) return true;
            const sp = hLineSpan(gm, hr, y);
            const touchesOuter = sp.x0 <= tx0 + 6 * ppt || sp.x1 >= tx1 - 6 * ppt;
            const alignsV = vXs.some((vx) => Math.abs(sp.x0 - vx) <= 6 * ppt || Math.abs(sp.x1 - vx) <= 6 * ppt);
            return touchesOuter && alignsV;
          });
          if (validPartial.length > hys.length) hys = validPartial;
        }
      }
      if (hys.length < 2 && !global.__FZ_OFF_BROKEN) { const bys = brokenHLinePositions(gm, hr, ppt); if (bys.length >= 3) { hys = bys; res.brokenRules = true; } }
      // ২০২৬-১০-১৪ (a02 পরিবার-ছক, মালিকের Word-যাচাই): ধূসর-ছায়ার শিরোনাম-সারির হাফটোন-রেখা ১৬টি "দাগ" (৩০pt-এ) ⇒ রেখা-ভাগ
      // মেলে না, Gemini-র ধারাবাহিক লাইন ("স্ত্রী: ☐") আলাদা সারি থেকে যায়। ≤৪.৫pt ফাঁকে ≥৪ দাগের গুচ্ছ = ছায়া-পটি ⇒ শুধু ওপর-নিচের দাগ
      // (জোড়া-দাগ ২টি ⇒ অক্ষত)। বন্ধ: FZ_OFF=SHADEHR
      if (!global.__FZ_OFF_SHADEHR && !res.brokenRules && hys.length >= 4) {
        const keep = [];
        for (let i = 0; i < hys.length;) {
          let j = i;
          while (j + 1 < hys.length && hys[j + 1] - hys[j] <= 4.5 * ppt) j++;
          if (j - i + 1 >= 4) keep.push(hys[i], hys[j]); else for (let q = i; q <= j; q++) keep.push(hys[q]);
          i = j + 1;
        }
        hys = keep;
      }
      // ২০২৬-১০-১৪ (a02 "অবসর গ্রহণের তারিখ", মালিকের Word-যাচাই): দিন|মাস|বছর বাক্স-দলের মাঝে ফাঁক ⇒ আড়া দাগ পূর্ণ-প্রস্থ নয়,
      // hRules ফাঁকা ⇒ hasGrid=false ⇒ বর্ডারহীন বাক্স। খাড়া দাগ ≥৩টি সবই পূর্ণ-উচ্চতা (cov ≥০.৯) আর আড়া দাগ নেই ⇒ বাক্স-সারি:
      // ছকের ওপর-নিচের কিনারা = দাগ, জাল আছে। বন্ধ: FZ_OFF=BOXROW
      if (!global.__FZ_OFF_BOXROW && hys.length < 2 && res.vRulesPt.length >= 3 && res.vRulesPt.every((v) => v.cov >= 0.9) && ty1 - ty0 <= 40 * ppt) {
        hys = [ty0, ty1]; res.boxRow = true;
      }
      res.hRulesPt = hys.map((y) => y / ppt);
      if (!res.brokenRules) res.hRuleSpansPt = hys.map((y) => { const s = hLineSpan(gm, hr, y); return [s.x0 / ppt, s.x1 / ppt]; });
      const tcAll = mine.filter((c) => (c.x1 - c.x0) < (tx1 - tx0) * 0.5 && (c.y1 - c.y0) < (ty1 - ty0) * 0.5 && !isVRule(c) && !((c.y1 - c.y0 + 1) <= 3 && (c.x1 - c.x0) > 12));
      res.textLinesPt = linesOf(tcAll, H).map((l) => (l.y0 + l.y1) / 2 / ppt);
      // row-ink.js: প্রতি কালি-টুকরোর খাড়া পরিসর (pt) — রেখা-ভাগে লেখার উচ্চতা মাপতে (কাতেও টুকরো নিজের ভাগে থাকে); ছিটে (<২px) বাদ
      res.textInkPt = tcAll.filter((c) => c.y1 - c.y0 >= 2).map((c) => [Math.round(c.y0 / ppt * 10) / 10, Math.round((c.y1 + 1) / ppt * 10) / 10]);
      // ২০২৬-১০-১৪ (a17 p10): শিরোনাম-সারির ঘরে লেখা মাঝে না ওপরে — প্রতি ঘরের কালির খাড়া অবস্থান (layout-ir headVAlign) — x-সহ
      res.textInkXPt = tcAll.filter((c) => c.y1 - c.y0 >= 2).map((c) => [Math.round((c.x0 + c.x1) / 2 / ppt * 10) / 10, Math.round(c.y0 / ppt * 10) / 10, Math.round((c.y1 + 1) / ppt * 10) / 10]);
      // ২০২৬-১০-১৪ (a18): আংশিক খাড়া দাগসহ সব কলাম-সীমায় প্রতি লেখা-লাইনের ঘর-কালি (colEdgesPt শুধু পূর্ণ-দাগে ২ কলাম পেত,
      // ছকে ৪ কলাম ⇒ ঘর-ভিত্তিক মাঝ-বসানো ধরা পড়ত না)
      if (res.vRulesPt.length >= 3) {
        const ex = res.vRulesPt.map((r) => r.x * ppt);
        res.cellBoxV = { edgesPt: res.vRulesPt.map((r) => r.x), rows: linesOf(tcAll, H).map((l) => ex.slice(1).map((e1, j) => {
          const cs = tcAll.filter((c) => c.y1 >= l.y0 && c.y0 <= l.y1 && (c.x0 + c.x1) / 2 >= ex[j] && (c.x0 + c.x1) / 2 < e1);
          return cs.length ? [Math.min(...cs.map((c) => c.x0)) / ppt, (Math.max(...cs.map((c) => c.x1)) + 1) / ppt] : null;
        })) };
      }
      if (tableGridOn()) {
        // ১) অনুভূমিক ও খাড়া রেখা আলাদা শনাক্তকরণ (insideH বনাম insideV)
        const inH = res.hRulesPt.filter((y) => y > ty0 / ppt + 4 && y < ty1 / ppt - 4);
        const inV = res.vRulesPt.filter((v) => v.x > tx0 / ppt + 4 && v.x < tx1 / ppt - 4 && v.cov >= 0.25);
        res.hasInsideH = inH.length >= 1;
        res.hasInsideV = inV.length >= 1;
        if (inV.length >= 1 && res.hRulesPt.length <= 2) res.hasGrid = true;
        // ২) পাশাপাশি ছোট বাক্স শনাক্তকরণ (পূর্ণ-প্রস্থ রেখা না থাকলেও প্রতিটি বাক্সের নিজস্ব চার পাশের রেখা)
        const sBoxes = detectSmallBoxes(gm, { x0: tx0, y0: ty0, x1: tx1, y1: ty1 }, { pxPerPt: ppt, comps: mine });
        if (sBoxes.length >= 2) {
          res.smallBoxesPt = sBoxes;
          res.hasGrid = true;
          res.isSmallBoxRow = true;
          if (res.hRulesPt.length < 2) {
            res.hRulesPt = [Math.min(...sBoxes.map((b) => b.y0)), Math.max(...sBoxes.map((b) => b.y1))];
          }
        }
        // ৩) শিরোনাম-ঘরের (প্রথম সারি) মোটা লেখা ও নিচে-দাগ শনাক্তকরণ
        const yBand0 = res.hRulesPt.length >= 2 ? [res.hRulesPt[0] * ppt, res.hRulesPt[1] * ppt]
          : (linesOf(tcAll, H).length ? [linesOf(tcAll, H)[0].y0 - 2, linesOf(tcAll, H)[0].y1 + 4] : null);
        if (yBand0) {
          const hdrComps = tcAll.filter((c) => (c.y0 + c.y1) / 2 >= yBand0[0] && (c.y0 + c.y1) / 2 <= yBand0[1]);
          const bodyComps = tcAll.filter((c) => (c.y0 + c.y1) / 2 > yBand0[1]);
          const strokeOf = (cs) => {
            if (!cs.length) return 0;
            const runs = [];
            for (const c of cs) {
              const my = Math.round((c.y0 + c.y1) / 2);
              let r = 0;
              for (let x = c.x0; x <= c.x1 + 1; x++) {
                if (x <= c.x1 && gm.mask[my * W + x]) r++;
                else if (r) { if (r <= (c.y1 - c.y0 + 1) * 0.6) runs.push(r); r = 0; }
              }
            }
            return runs.length ? runs.reduce((a, b) => a + b, 0) / runs.length : 0;
          };
          const hStroke = strokeOf(hdrComps), bStroke = strokeOf(bodyComps);
          if (hStroke > 0 && ((bStroke > 0 && hStroke >= bStroke * 1.12) || (bStroke === 0 && hStroke >= 2.4 * ppt))) {
            res.headBold = true;
          }
          // শিরোনাম-ঘরের নিচে-দাগ: সারি-রেখার (yBand0[1]) অন্তত ২px ওপরে লেখার প্রস্থের ≥৫৫% টানা অনুভূমিক রেখা বা চ্যাপ্টা খণ্ড
          const hdrLines = linesOf(hdrComps, H);
          if (hdrLines.length) {
            const hl = hdrLines[hdrLines.length - 1], lw = hl.x1 - hl.x0 + 1;
            const flatUl = mine.some((c) => (c.y1 - c.y0 + 1) <= Math.max(3, 2.5 * ppt) && (c.x1 - c.x0 + 1) >= lw * 0.5 && (c.x1 - c.x0 + 1) < (tx1 - tx0) * 0.9
              && c.y0 >= hl.y1 - 2 && c.y1 < yBand0[1] - 1.5 * ppt && Math.min(c.x1, hl.x1) - Math.max(c.x0, hl.x0) >= lw * 0.5);
            let runUl = false;
            for (let y = Math.max(hl.y1 - 1, Math.floor(hl.y0 + (hl.y1 - hl.y0) * 0.75)); y < Math.min(H, Math.floor(yBand0[1] - 2)); y++) {
              let run = 0, best = 0;
              for (let x = hl.x0; x <= hl.x1; x++) { if (gm.mask[y * W + x]) { if (++run > best) best = run; } else run = 0; }
              if (best >= lw * 0.65 && best < (tx1 - tx0) * 0.9) { runUl = true; break; }
            }
            if (flatUl || runUl) res.headUnderline = true;
          }
        }
      }
    }
    // (শুধু টেবিল-ব্লকে — বাংলা মাত্রার টানা রেখা সাধারণ লেখায় "রেখা" মনে হতে পারে)
    if (!res.hasGrid && o.isTable) res.hasGrid = countHLines(o.gridMask || m, { x0: Math.max(0, Math.floor(bx0)), y0: Math.max(0, Math.floor(by0)), x1: Math.min(W, Math.ceil(bx1)), y1: Math.min(H, Math.ceil(by1)) }) >= 2;
    if (!res.hasGrid && o.isTable && res.brokenRules) res.hasGrid = true;
    if (!res.hasGrid && o.isTable && res.boxRow) res.hasGrid = true;
    const lines = linesOf(mine, H);
    res.lines = lines.map((l) => ({ x: l.x0 / ppt, y: l.y0 / ppt, w: (l.x1 - l.x0 + 1) / ppt, h: (l.y1 - l.y0 + 1) / ppt }));
    const inkH = median(res.lines.map((l) => l.h));
    // Part-17.8: লাইনের ভেতরের চওড়া ফাঁক (ট্যাব-ধাঁচ: "র        আষাঢ়।", "ক. … প্রশ্ন        ১") — প্রতিটি লাইনের কালি-অংশ
    const inkHpx = inkH * ppt, gapThr = Math.max(6, inkHpx * 1.6);
    res.lineSegs = lines.map((l) => {
      const cs = mine.filter((c) => c.y1 >= l.y0 && c.y0 <= l.y1 && (Math.min(c.y1, l.y1) - Math.max(c.y0, l.y0)) >= (c.y1 - c.y0) * 0.5)
        .filter((c) => !((c.y1 - c.y0 + 1) <= Math.max(3, inkHpx * 0.2) && (c.x1 - c.x0) > inkHpx * 3))   // নিচে-দাগ/রেখা বাদ
        .sort((a, b) => a.x0 - b.x0);
      const segs = [];
      for (const c of cs) {
        const s = segs[segs.length - 1];
        if (s && c.x0 - s.x1 <= gapThr) { s.x1 = Math.max(s.x1, c.x1); s.ya = Math.min(s.ya, c.y0); s.yb = Math.max(s.yb, c.y1); }
        else segs.push({ x0: c.x0, x1: c.x1, ya: c.y0, yb: c.y1 });
      }
      segs.forEach((s) => { s.h = s.yb - s.ya + 1; });   // কোলন (দুই বিন্দু) = উচ্চতা সব খণ্ড মিলিয়ে, একটি বিন্দু নয়
      // a10 পাতা ২: স্ক্যানের ছিটে (বিন্দু-আকার, লেখার ৩০%-এর কম দুই মাপেই) ডান মার্জিনে আলাদা "অংশ" হয়ে শেষ শব্দ ("হবে।") ট্যাবে
      // ডানে সরাত ⇒ Word-এ নতুন লাইন, নিচের সব নামত। একক ক্ষুদ্র অংশ লেখা নয় — বাদ (অন্য অংশ থাকলেই)
      const real = segs.filter((s) => (s.x1 - s.x0 + 1) >= inkHpx * 0.3 || s.h >= inkHpx * 0.3);
      const trimmed = !SPECK_OFF && real.length && real.length < segs.length;
      const use = trimmed ? real : segs;
      const out = use.map((s) => ({ x: s.x0 / ppt, w: (s.x1 - s.x0 + 1) / ppt }));
      out.trimmed = trimmed;
      return out;
    });
    // ছিটে বাদ গেলে লাইনের মাপা প্রস্থও শুধু আসল অংশ জুড়ে (নইলে প্রস্থ-ভিত্তিক ফন্ট-অনুমান ফোলে: a10 পাতা ২ শেষ লাইন ৫২.৬ ⇒ ১১.৫)
    res.lineSegs.forEach((sg, i) => {
      if (!sg.trimmed || !sg.length || !res.lines[i]) return;
      const x0 = sg[0].x, x1 = sg[sg.length - 1].x + sg[sg.length - 1].w;
      res.lines[i] = Object.assign({}, res.lines[i], { x: x0, w: x1 - x0 });
    });
    // Part-17.8: নিচে-দাগ (underline) — লেখার ঠিক নিচে চ্যাপ্টা লম্বা খণ্ড (লেখার প্রস্থের ≥৬০%)
    if (lines.length) {
      const ulOf = (ln) => {
        const lw = ln.x1 - ln.x0;
        if (all.some((c) => (c.y1 - c.y0 + 1) <= Math.max(3, inkHpx * 0.2) && (c.x1 - c.x0) >= lw * 0.6 &&
          c.y0 >= ln.y1 - inkHpx * 0.35 && c.y0 <= ln.y1 + inkHpx * 0.6 &&
          Math.min(c.x1, ln.x1) - Math.max(c.x0, ln.x0) >= lw * 0.6)) return 1;
        // Part-17.9: দাগ নিচের কার/অক্ষরে লেগে থাকলে আলাদা খণ্ড নয় ⇒ লাইনের নিচের অংশে লম্বা টানা কালি-সারি খোঁজা
        if (lw > inkHpx * 3) {
          // লেগে-থাকা দাগ লাইনের খণ্ডেরই অংশ ⇒ লাইনের নিচের অংশেই খোঁজা (নিচের টেবিল-সীমানা ভুল করে "নিচে-দাগ" নয়)
          const yA = Math.max(0, Math.round(ln.y1 - inkHpx * 0.3)), yB = Math.min(H - 1, ln.y1);
          for (let y = yA; y <= yB; y++) {
            let run = 0, best = 0, miss = 0;
            for (let x = Math.max(0, ln.x0 - 2); x <= Math.min(W - 1, ln.x1 + 2); x++) {
              if (m.mask[y * W + x]) { run += miss + 1; miss = 0; if (run > best) best = run; } else if (run && ++miss > 1) { run = 0; miss = 0; }
            }
            // মাত্রা (বাংলার মাথার রেখা) লাইনের ওপরের দিকে — এখানে শুধু নিচের অংশ দেখা হচ্ছে
            if (best >= lw * 0.7) return 1;
          }
        }
        // ২০২৬-১০-১৪ (a16 "বিতরণ : (…)"): লাইনের শুরু থেকে আংশিক দাগ (≥৩ অক্ষর-উচ্চতা, <৬০%) ⇒ দাগের অংশ (০–১)
        const pc = all.find((c) => (c.y1 - c.y0 + 1) <= Math.max(3, inkHpx * 0.2) && (c.x1 - c.x0) >= inkHpx * 3 &&
          c.y0 >= ln.y1 - inkHpx * 0.35 && c.y0 <= ln.y1 + inkHpx * 0.6 && Math.abs(c.x0 - ln.x0) <= inkHpx);
        if (pc) return Math.min(1, (pc.x1 - ln.x0) / Math.max(1, lw));
        // ২০২৬-১০-১৪ (a16 "বিতরণ"/"সংযুক্তি ০৮ (আট) ফর্দ", মালিকের Word-যাচাই): আংশিক দাগ লাইনের মাঝেও, আর অক্ষরে লেগে থাকলে আলাদা
        // খণ্ড নয় ⇒ (১) মাঝের আলাদা চ্যাপ্টা খণ্ড (≥৩ অক্ষর-উচ্চতা), (২) লাইনের নিচের অংশে ফাঁকহীন টানা কালি-সারি ≥২.২ অক্ষর-উচ্চতা
        // ("বিতরণ" ছোট শব্দ) — দুটোই <৭০%।
        // ফল [শুরু, শেষ] (লাইন-প্রস্থের অংশ)। বন্ধ: FZ_OFF=ULTOUCH
        if (!global.__FZ_OFF_ULTOUCH && lw > inkHpx * 4) {
          const spans = all.filter((c) => (c.y1 - c.y0 + 1) <= Math.max(3, inkHpx * 0.2) && (c.x1 - c.x0) >= inkHpx * 3 && (c.x1 - c.x0) < lw * 0.7 &&
            c.y0 >= ln.y1 - inkHpx * 0.35 && c.y0 <= ln.y1 + inkHpx * 0.6 && c.x0 >= ln.x0 - 2 && c.x1 <= ln.x1 + 2).map((c) => [c.x0, c.x1]);
          const yA = Math.max(0, Math.round(ln.y1 - inkHpx * 0.25)), yB = Math.min(H - 1, ln.y1);
          for (let y = yA; y <= yB; y++) {
            let s = -1;
            for (let x = Math.max(0, ln.x0 - 2); x <= Math.min(W - 1, ln.x1 + 2) + 1; x++) {
              const on = x <= ln.x1 + 2 && m.mask[y * W + x];
              if (on && s < 0) s = x;
              else if (!on && s >= 0) { if (x - s >= inkHpx * 2.2 && x - s < lw * 0.7) spans.push([s, x - 1]); s = -1; }
            }
          }
          if (spans.length) {
            const best = spans.reduce((a, c) => (c[1] - c[0] > a[1] - a[0] ? c : a));
            const a = Math.max(0, (best[0] - ln.x0) / lw), b = Math.min(0.95, (best[1] - ln.x0) / lw);
            return a <= 0.03 ? Math.round(b * 1000) / 1000 : [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000];
          }
        }
        return 0;
      };
      // ২০২৬-১০-১৪ (a16): প্রতি লাইনের নিচে-দাগ আলাদা (১ = পূর্ণ, ০–১ = শুরু থেকে আংশিক) — আগে শুধু শেষ লাইন দেখে পুরো ব্লকে দাগ
      // ("…সরকার / …মন্ত্রণালয় / সওব্য-২ শাখা"-য় শুধু শেষটিতে দাগ, আমরা তিনটিতেই দিতাম)। ব্যবহার: layout-ir paraItem
      res.underlineLines = lines.map(ulOf);
      res.underline = res.underlineLines[lines.length - 1] === 1;
      // Part-17.9: রেখার পুরুত্ব (মোটা/সাধারণ) ও হেলানো (ইটালিক) — কালি থেকে
      const runs = [];
      const shearPix = [];
      for (const l of lines) {
        const step = Math.max(1, Math.floor((l.y1 - l.y0 + 1) / 12));
        for (let y = l.y0; y <= l.y1; y += step) {
          let run = 0;
          for (let x = l.x0; x <= l.x1 + 1; x++) {
            const on = x <= l.x1 && m.mask[y * W + x];
            if (on) run++;
            else if (run) { if (run <= inkHpx * 0.4) runs.push(run); run = 0; }
          }
        }
        // হেলানো মাপার নমুনা: শুধু খাড়া রেখার কিনারা (ওপরে-নিচে কালি, এক পাশে ফাঁকা) — মাত্রা/নিচে-দাগ/মোটা আড়াআড়ি রেখা বাদ
        const yc = (l.y0 + l.y1) / 2;
        for (let y = Math.max(1, l.y0); y <= Math.min(H - 2, l.y1); y++) for (let x = Math.max(1, l.x0); x <= Math.min(W - 2, l.x1); x++) {
          const i = y * W + x;
          if (m.mask[i] && m.mask[i - W] && m.mask[i + W] && (!m.mask[i - 1] || !m.mask[i + 1])) shearPix.push(x, y - yc);
        }
      }
      // খাড়া দিকের রান (আড়াআড়ি রেখার পুরুত্ব) — দুই দিকের গড়ে নমুনা বেশি, গোলমাল কম
      const vruns = [];
      for (const l of lines) {
        const stepX = Math.max(1, Math.floor((l.x1 - l.x0 + 1) / 120));
        for (let x = l.x0; x <= l.x1; x += stepX) {
          let run = 0;
          for (let y = l.y0; y <= l.y1 + 1; y++) {
            const on = y <= l.y1 && m.mask[y * W + x];
            if (on) run++;
            else if (run) { if (run <= inkHpx * 0.4) vruns.push(run); run = 0; }
          }
        }
      }
      // গড় (মধ্যমা নয়): ১৫০ DPI-তে সাধারণ ≈২px, মোটা ≈৩px — মধ্যমা পূর্ণসংখ্যায় আটকে মোটা লেখাও "সাধারণ" দেখাত
      const all2 = runs.concat(vruns);
      res.strokePt = all2.length >= 30 ? all2.reduce((a, v) => a + v, 0) / all2.length / ppt : 0;
      res.strokeHPt = runs.length ? runs.reduce((a, v) => a + v, 0) / runs.length / ppt : 0;
      res.strokeVPt = vruns.length ? vruns.reduce((a, v) => a + v, 0) / vruns.length / ppt : 0;
      // কালি-ঘনত্ব: লাইনের আয়তে কালির ভাগ
      let inkN = 0, areaN = 0;
      for (const l of lines) { areaN += (l.x1 - l.x0 + 1) * (l.y1 - l.y0 + 1); for (let y = l.y0; y <= l.y1; y++) for (let x = l.x0; x <= l.x1; x++) inkN += m.mask[y * W + x]; }
      res.inkDensity = areaN ? inkN / areaN : 0;
      res.slant = 0;
      if (shearPix.length >= 200) {
        const score = (s) => { const hist = new Map(); for (let i = 0; i < shearPix.length; i += 2) { const xx = Math.round(shearPix[i] + s * shearPix[i + 1]); hist.set(xx, (hist.get(xx) || 0) + 1); } let q = 0; hist.forEach((v) => { q += v * v; }); return q; };
        const s0 = score(0); let best = 0, bestQ = s0;
        for (const s of [-0.1, 0.1, 0.15, 0.2, 0.25, 0.3]) { const q = score(s); if (q > bestQ) { bestQ = q; best = s; } }
        // (y নিচে বাড়ে: ডানে-হেলানো লেখায় ওপরের অংশ ডানে ⇒ x + s·(y−yc) সোজা করে)
        res.slant = best >= 0.1 && bestQ > s0 * 1.08 ? best : 0;
        res.slantGain = bestQ / s0;   // নির্ণয়ের জন্য
      }
    }
    const centers = res.lines.map((l) => l.y + l.h / 2);
    const pitches = centers.slice(1).map((c, i) => c - centers[i]).filter((p) => p > inkH * 0.6);
    const pitch = pitches.length ? median(pitches) : 0;
    res.lineInkPt = inkH; res.pitchPt = pitch;
    res.fontPt = estimateFontPt(inkH, pitch);
    // অবস্থান ও ইনডেন্ট: লাইনের বাম/ডান প্রান্ত।
    // Part-17.5: ঝুলন্ত ইনডেন্ট ("খ. …" প্রথম লাইন বাঁয়ে, বাকি লাইন ভেতরে) আগে "ডানে বসানো" ভুল হতো।
    if (res.lines.length) {
      const L = res.lines.map((l) => l.x - res.rectPt.x), R = res.lines.map((l) => res.rectPt.x + res.rectPt.w - (l.x + l.w));
      const tol = Math.max(3, inkH * 0.5);
      if (res.lines.length >= 2) {
        const rest = L.slice(1), restMed = median(rest);
        const restAligned = rest.every((v) => Math.abs(v - restMed) <= tol);
        res.firstIndentPt = restAligned && Math.abs(L[0] - restMed) > tol ? Math.round(L[0] - restMed) : 0;   // + ইনডেন্ট, − ঝুলন্ত
        const bodyN = res.lines.length > 2 ? res.lines.length - 1 : 1;                                       // শেষ লাইন সাধারণত ছোট
        const rightFlush = R.slice(0, bodyN).every((v) => v <= tol);
        const centered = res.lines.every((l, i) => Math.abs(L[i] - R[i]) <= tol * 1.5) && L.some((v) => v > tol * 2);
        res.align = centered && !restAligned ? 'c'
          : (restAligned && rightFlush ? 'j'
            : (!restAligned && R.every((v) => v <= tol) ? 'r' : (centered ? 'c' : 'l')));
      } else {
        res.firstIndentPt = 0;
        res.align = o.align || 'l';                                      // এক-লাইনে নিজের মাপে বোঝা কঠিন — Gemini-র কথা
      }
      // ডান প্রান্ত অসমান ও লাইন ছোট ⇒ মুদ্রিত লাইন-ভাঙন রাখা (ঠিকানা/কবিতা/ফর্ম)
      const fill = res.lines.map((l) => l.w / res.rectPt.w);
      res.ragged = res.lines.length >= 2 && median(fill.slice(0, -1).length ? fill.slice(0, -1) : fill) < 0.8;
    }
    return res;
  }

  /**
   * Part-17.9: Gemini-বক্সের ক্রমবর্ধমান উল্লম্ব সরণ সংশোধন। ঘন পাতায় Gemini লাইনগুলো সমান ধাপে ধরে (যেমন ১৮ একক),
   * আসল ধাপ একটু আলাদা (১৮.৭) ⇒ নিচের দিকে বক্স অর্ধেক-এক লাইন সরে গিয়ে পাশের লাইন ধরত।
   * নির্ভরযোগ্য জোড়া (মাপা লাইন-সংখ্যা = লেখার লাইন-সংখ্যা) থেকে রৈখিক সম্পর্ক  আসল-y = a·Gemini-y + b  (০–১০০০ একক),
   * বহিরাগত বাদ দিয়ে (পুনরাবৃত্ত ন্যূনতম-বর্গ)। প্রভাব নগণ্য বা অস্থির হলে null।
   * @param blocks  [{ box, lines, type }]   @param metrics  একই ক্রমে blockMetrics ফল   @param H  পাতার উচ্চতা (pt)
   */
  function fitBoxDrift(blocks, metrics, Hpt) {
    const pts = [];
    blocks.forEach((b, k) => {
      const me = metrics[k];
      if (!b.box || !me || me.empty || /^(figure|table)$/.test(b.type)) return;
      const nl = (b.lines || []).length;
      if (!nl || !me.lines || me.lines.length !== nl) return;
      const gy = (b.box[0] + b.box[2]) / 2, gh = b.box[2] - b.box[0];
      const my = (me.rectPt.y + me.rectPt.h / 2) / Hpt * 1000, mh = me.rectPt.h / Hpt * 1000;
      if (mh > gh * 1.6 + 4) return;
      pts.push([gy, my]);
    });
    if (pts.length < 6) return null;
    let use = pts, a = 1, b = 0;
    for (let it = 0; it < 4; it++) {
      const n = use.length; if (n < 5) return null;
      const sx = use.reduce((s, p) => s + p[0], 0), sy = use.reduce((s, p) => s + p[1], 0);
      const sxx = use.reduce((s, p) => s + p[0] * p[0], 0), sxy = use.reduce((s, p) => s + p[0] * p[1], 0);
      const den = n * sxx - sx * sx; if (Math.abs(den) < 1e-6) return null;
      a = (n * sxy - sx * sy) / den; b = (sy - a * sx) / n;
      const res = pts.map((p) => Math.abs(p[1] - (a * p[0] + b)));
      const thr = Math.max(2, 2.5 * median(res));
      use = pts.filter((p, i) => res[i] <= thr);
    }
    if (a < 0.9 || a > 1.1) return null;
    // প্রভাব: পাতার ওপর-নিচে সর্বোচ্চ সংশোধন ≥১.৫ একক (≈১.২pt) হলে তবেই
    const maxCorr = Math.max(...[0, 500, 1000].map((y) => Math.abs(a * y + b - y)));
    if (maxCorr < 1.5) return null;
    return { a, b, n: use.length };
  }
  /**
   * Part-17.9: লেখা-ব্লকের বক্স আসল মুদ্রিত লাইনে বসানো। Gemini-বক্স অর্ধেক লাইন সরে থাকলে "কেন্দ্র বক্সে" নিয়মে
   * লাইনের অর্ধেক অক্ষর বাদ পড়ত (ভুয়া ট্যাব, ভুল ইনডেন্ট)। প্রতিটি ব্লকের x-সীমায় আশপাশের খণ্ড থেকে লাইন বানিয়ে,
   * ব্লকের লাইন-সংখ্যার সমান পরপর লাইনের যে দলটির কেন্দ্র বক্স-কেন্দ্রের সবচেয়ে কাছে সেটি; কাছের-আগে ক্রমে,
   * একটি মুদ্রিত লাইন একটিই ব্লক পায় (একই x-অংশে)। খুব দূরে হলে Gemini-বক্সই থাকে।
   * @returns { [blockIndex]: সংশোধিত বক্স }
   */
  /**
   * ২০২৬-১০-১৩ (a17 রোল-কার্ড): খাড়া ড্যাশ-সীমানা (- - - বাক্সের পাশ) — প্রতিটি ড্যাশ আলাদা খণ্ড, একে একে "লাইন" হয়ে
   * ১৮০pt-এর বাক্স ৩ ড্যাশে (২৯pt) বসত, ফন্ট ৯, ভুয়া ট্যাব। সরু-লম্বাটে (h ≥ ১.৮w) খণ্ড একই x-এ (±২px) পরপর ≥৫টি,
   * ফাঁক ≤ ৩ × ড্যাশ-দৈর্ঘ্য ⇒ ড্যাশ-সারি। (আড়া ড্যাশ/বিন্দু-রেখা লেখা হিসেবেই থাকে)
   * @returns Set<comp>
   */
  const dashCache = new WeakMap();
  function vDashComps(comps, W) {
    if (dashCache.has(comps)) return dashCache.get(comps);
    const out = new Set();
    // মোটা ড্যাশ (a17: ১৪৪dpi-তে ~১০–১৫px চওড়া) ⇒ সীমা পাতা-প্রস্থের অনুপাতে
    const maxW = Math.max(8, (W || 1000) * 0.008), maxH = maxW * 5;
    const shape = comps.filter((c) => { const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1; return h >= 0.6 * w && w <= maxW && h <= maxH; });   // প্রায়-বর্গ ড্যাশও (একই x-এ ≥৫টি পরপর না হলে বাদ নয়)
    // পাশে প্রায় একা: একই উচ্চতায় ২×maxW-এর মধ্যে অন্য খণ্ড নেই, বা শুধু একটি — দ্বৈত ড্যাশ-সীমানার জোড়া (একই আকার, একই y-পরিসর ±২px)।
    // লেখার টুকরোর দুপাশে অক্ষর/শব্দ থাকে ⇒ বাদ পড়ে না
    const shapeSet = new Set(shape);
    const cand = shape.filter((c) => {
      const nb = comps.filter((o) => o !== c && o.y1 >= c.y0 && o.y0 <= c.y1 && (o.x0 > c.x1 ? o.x0 - c.x1 : c.x0 - o.x1) < 2 * maxW);
      return !nb.length || (nb.length === 1 && shapeSet.has(nb[0]) && Math.abs(nb[0].y0 - c.y0) <= 2 && Math.abs(nb[0].y1 - c.y1) <= 2);
    });
    const bk = Math.max(2, Math.round(maxW / 2));
    const byX = {};
    cand.forEach((c) => { const k = Math.round((c.x0 + c.x1) / 2 / bk); (byX[k] = byX[k] || []).push(c); });
    const keys = Object.keys(byX).map(Number);
    const seen = new Set();
    keys.forEach((k) => {
      if (seen.has(k)) return;
      const grp = [];
      for (let d = -1; d <= 1; d++) if (byX[k + d] && !seen.has(k + d)) { grp.push(...byX[k + d]); seen.add(k + d); }
      grp.sort((a, c) => a.y0 - c.y0);
      let run = [grp[0]];
      const flush = () => { if (run.length >= 8) run.forEach((c) => out.add(c)); };
      for (let i = 1; i < grp.length; i++) {
        const p = run[run.length - 1], c = grp[i];
        if (c.y0 - p.y1 <= 3 * (p.y1 - p.y0 + 1)) run.push(c); else { flush(); run = [c]; }
      }
      flush();
    });
    dashCache.set(comps, out);
    return out;
  }

  function snapBoxesToLines(m, comps, blocks) {
    const W = m.W, H = m.H;
    const dash = global.__FZ_OFF_DASH ? new Set() : vDashComps(comps, W);
    const txt = comps.filter((c) => !isFrameComp(m, c) && !dash.has(c) && (c.y1 - c.y0 + 1) < H * 0.08 && (c.x1 - c.x0 + 1) < W * 0.6);
    // WORK_PLAN B6: Gemini-বক্স একই কলামের পরের ব্লকের ওপর পড়লে (g33: ২৫৮→৯৫৮, ভেতরে আরও দুই ব্লক) পরেরটির শুরুতে কাটা —
    // নইলে বক্স-কেন্দ্র অনেক নিচে সরে ভুল লাইন-দল বাছা হতো
    const clipY1 = (b) => {
      let y1 = b.box[2];
      blocks.forEach((o) => {
        if (o === b || !o.box || o.type === 'figure' || o.box[0] <= b.box[0] + 2 || o.box[0] >= y1) return;
        const ov = Math.min(o.box[3], b.box[3]) - Math.max(o.box[1], b.box[1]);
        if (ov > 0.5 * Math.min(o.box[3] - o.box[1], b.box[3] - b.box[1])) y1 = o.box[0];
      });
      return y1;
    };
    // g41: দুই ধাপ — ১ম ধাপের বসানো থেকে "স্থানীয় সরণ" (একই কলামের আগের ৩টি ব্লকের সরণের মধ্যমা) বের করে
    // ২য় ধাপে প্রার্থী-জানালা সেখানে সরিয়ে আবার; পাতার নিচে Gemini-র জমা ভুল (≈১.৫ লাইন) জানালার বাইরে পড়লে
    // পুরো শিকল এক লাইন নিচে সরে যেত (Blood Group → Marital Status-এর লাইন, National ID → References-এর নিচে)
    // a04: Gemini লাইন-বিরতি না দিলে (১৪১০ অক্ষর "১ লাইন") ১ মুদ্রিত লাইনে বসত ⇒ ১২ লাইনের অনুচ্ছেদ ১১pt বক্সে, ফন্ট-উচ্চতা ভুল।
    // ৮pt ফন্টেও (≈পাতা-উচ্চতা÷১০৫; মূল অক্ষর ≥০.৪ em) ওই লাইন-সংখ্যায় না আঁটলে বসানো হয় না — Gemini-বক্সই থাকে
    // ২০২৬-১০-১৪ (a17 p5 নোট, মালিকের Word-যাচাই): Gemini দুই তালিকা-বিষয়কে ২ "লাইন" দিল (মূলে ৫ ছাপা লাইন) ⇒ ২ লাইনে বসে প্রতিটি
    // পাতা-চওড়া, ফন্ট ৯.৫। ৮pt-অনুমানে ধরা পড়ে না ⇒ দ্বিতীয় পরীক্ষা: Gemini-বক্সের উচ্চতা পাতার এক-লাইন বক্সের মধ্যমার তুলনায়
    // লাইন-সংখ্যার ≥১.৫ গুণ আর লাইনপ্রতি ≥৬০ অক্ষর ⇒ বসানো নয়। বন্ধ: FZ_OFF=FEWLN
    const h1 = median(blocks.filter((b) => b.box && /^(paragraph|list_item|label_value|question)$/.test(b.type) && (b.lines || []).filter((l) => String(l).trim()).length === 1).map((b) => b.box[2] - b.box[0]));
    const tooFewLines = (b) => {
      const n = String(b.text || '').replace(/[ঁ-ঃ়া-্ৗ\s]/g, '').length, k = Math.max(1, b.lines.filter((l) => String(l).trim()).length);
      if (n * (H / 105) * 0.4 / b.lines.length > (b.box[3] - b.box[1]) / 1000 * W) return true;
      return !global.__FZ_OFF_FEWLN && h1 > 0 && n / k >= 60 && (b.box[2] - b.box[0]) / h1 >= k * 1.5;
    };
    const cands = blocks.filter((b) => b.box && !/^(figure|table)$/.test(b.type) && (b.lines || []).length && !tooFewLines(b))
      .map((b) => ({ b, bc: (b.box[0] + b.box[2]) / 2 / 1000 * H, bx0: b.box[1], bx1: b.box[3] })).sort((a, c) => a.bc - c.bc);
    const shiftFrom = (res) => {
      const shift = {}, hist = [];
      for (const x of cands) {
        // একই কলাম = x-ছেদ সরু ব্লকের ≥৫০% (দুই-কলামের পাতায় অন্য কলাম বা দুই-কলাম-জোড়া ব্লকের সরণ পূর্বাভাস নষ্ট করত — g33)
        const prev = hist.filter((h) => Math.min(h.bx1, x.bx1) - Math.max(h.bx0, x.bx0) >= 0.5 * Math.min(h.bx1 - h.bx0, x.bx1 - x.bx0)).slice(-3).map((h) => h.off);
        if (prev.length) shift[x.b.i] = median(prev);
        const s = res[x.b.i];
        if (s) hist.push({ bx0: x.bx0, bx1: x.bx1, off: (s[0] + s[2]) / 2 / 1000 * H - x.bc });
      }
      return shift;
    };
    // প্রতিটি ধাপ আগের ধাপের (শোধরানো) বসানো থেকে পূর্বাভাস নেয় — সর্বোচ্চ ৩ বার। সব ধাপের মধ্যে সেরা:
    // বেশি ব্লক বসেছে যেটিতে; সমান হলে Gemini-বক্সের কাছাকাছি (মোট সরণ কম)। g33 (দুই কলাম): ১ম ধাপই ঠিক,
    // পুনরাবৃত্তি ডান কলামকে এক লাইন সরাত (সমান সংখ্যা) ⇒ সমতায় কম-সরণেরটি; g41: ৩য় ধাপে বেশি বসে ⇒ সেটি
    const absOff = (res) => cands.reduce((a, x) => a + (res[x.b.i] ? Math.abs((res[x.b.i][0] + res[x.b.i][2]) / 2 / 1000 * H - x.bc) : 0), 0);
    const tried = [solve({})];
    for (let it = 0; it < 3; it++) {
      const prev = tried[tried.length - 1];
      const shift = shiftFrom(prev);
      if (!Object.values(shift).some((v) => Math.abs(v) > 3)) break;
      const next = solve(shift);
      const same = Object.keys(next).length === Object.keys(prev).length && Object.keys(next).every((k) => prev[k] && Math.abs(prev[k][0] - next[k][0]) < 0.5);
      if (same) break;
      tried.push(next);
    }
    // বেশি বসা তখনই জেতে, যখন প্রতি বাড়তি ব্লকে মোট সরণ ≤ ৬ লাইন-ধাপ বাড়ে (ধাপ = একই কলামের পরপর ব্লকের কেন্দ্র-দূরত্ব ÷ লাইন)
    // (g41 পুরোনো ক্যাপচার ≈২–৩ ধাপ/ব্লক, সিন্থেটিক টেস্ট ≈৪ ⇒ নেয়; g33 পাতা-২ ৩য় ধাপ +২ ব্লকে সরণ দ্বিগুণ ≈৮ ⇒ নয়)
    const gaps = [];
    cands.forEach((x, k) => {
      for (let j = k - 1; j >= 0; j--) {
        const h = cands[j];
        if (Math.min(h.bx1, x.bx1) - Math.max(h.bx0, x.bx0) >= 0.5 * Math.min(h.bx1 - h.bx0, x.bx1 - x.bx0)) {
          const g = (x.bc - h.bc) / ((x.b.lines.length + h.b.lines.length) / 2);
          if (g > 0) gaps.push(g);
          break;
        }
      }
    });
    const pitch = median(gaps) || 20;
    // ২০২৬-১০-১৪ (2.pdf p2): Gemini-বক্স মাঝপথ থেকে এক লাইন নিচে (শেষে ≈২.৫ লাইন) ⇒ ১ম ধাপে শিকল এক লাইন সরে বসে, একটি আসল
    // লাইন কেউ পায় না (প্রশ্নের মোটা হরফ/ইনডেন্ট উত্তরে যায়)। ২য় ধাপ ঠিক বসায়, কিন্তু Gemini থেকে মোট সরণ বেশি বলে বাদ পড়ত।
    // তাই: বেশি ব্লক বসে আর কারো-না-পাওয়া পূর্ণ লেখা-লাইন কমে ⇒ সরণ যত বেশিই হোক সেটি নেওয়া। বন্ধ: FZ_OFF=ORPHAN
    const pageLines = global.__FZ_OFF_ORPHAN ? [] : linesOf(txt, H);
    const lhMed = median(pageLines.map((l) => l.y1 - l.y0 + 1));
    const unclaimed = (res) => {
      const bs = Object.values(res).map((b) => ({ y0: b[0] / 1000 * H, y1: b[2] / 1000 * H, x0: b[1] / 1000 * W, x1: b[3] / 1000 * W }));
      if (!bs.length) return 0;
      // পুরো পাতার লেখা-লাইন (প্রথম ব্লকের ওপরের লাইনও — ১ম ধাপ পুরো শিকল এক লাইন নিচে বসালে সেটিই বাদ পড়ে; সব ধাপে সমান গোনা হয়)
      return pageLines.filter((l) => {
        const h = l.y1 - l.y0 + 1;
        if (h < lhMed * 0.6 || h > lhMed * 1.6 || l.x1 - l.x0 < W * 0.1) return false;
        return !bs.some((b) => Math.min(b.y1, l.y1) - Math.max(b.y0, l.y0) > 0.5 * h && Math.min(b.x1, l.x1) - Math.max(b.x0, l.x0) > 0);
      }).length;
    };
    let best = tried[0], bn = Object.keys(best).length, bo = absOff(best), bu = pageLines.length ? unclaimed(best) : 0;
    for (const r of tried.slice(1)) {
      const n = Object.keys(r).length, o = absOff(r), u = pageLines.length ? unclaimed(r) : 0;
      // সমান বসায়ও কম কারো-না-পাওয়া লাইন আগে (সরণ পরে) — জানালা চওড়া হওয়ায় ১ম ধাপও সব বসায়, তখন শুধু সরণে ভুলটি জিতত
      if ((n >= bn && u < bu) || (u <= bu && ((n > bn && o - bo <= (n - bn) * 6 * pitch) || (n === bn && u === bu && o < bo - 1)))) { best = r; bn = n; bo = o; bu = u; }
    }
    // ডায়াগনস্টিক (গণনায় আসে না): প্রতিটি ধাপের বসা-সংখ্যা ও মোট সরণ, কোনটি বাছা হলো
    Object.defineProperty(best, '_passes', { value: { n: tried.map((r) => Object.keys(r).length), off: tried.map((r) => Math.round(absOff(r))), chosen: tried.indexOf(best), unclaimed: pageLines.length ? tried.map(unclaimed) : null }, enumerable: false });
    if (!global.__FZ_OFF_ORPHFILL) fillOrphans(best);
    return best;

    /**
     * ২০২৬-১০-১৪ (a17 p4, মালিকের Word-যাচাই): "১) ২) ৩)" — Gemini-বক্স ধাপে ধাপে নিচে (২৯৩/৩৪৭/৪০০, আসল ২৯৩/৩২৯/৩৬৭);
     * ১), ২) বসল, ৩)-এর জানালায় কালি নেই ⇒ Gemini-বক্সেই থাকল ⇒ ফাঁক অসমান। ⇒ না-বসা এক-লাইনের ব্লক: আশপাশের একই-কলামের
     * সরণ ধরে পূর্বাভাসের ±২.৫ লাইনে কারো-না-পাওয়া কালি-লাইন, আগের ও পরের বসা ব্লকের মাঝে (ক্রম অক্ষত)। বন্ধ: FZ_OFF=ORPHFILL
     */
    function fillOrphans(res) {
      const sh = shiftFrom(res), toPx = (b) => ({ y0: b[0] / 1000 * H, y1: b[2] / 1000 * H, x0: b[1] / 1000 * W, x1: b[3] / 1000 * W });
      const xo = (a, c) => Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0) > 0;
      for (const x of cands) {
        const k = (x.b.lines || []).filter((l) => String(l).trim()).length;
        if (res[x.b.i] || k !== 1 || sh[x.b.i] == null) continue;
        const me = { x0: x.bx0 / 1000 * W, x1: x.bx1 / 1000 * W }, pred = x.bc + sh[x.b.i];
        const placed = Object.entries(res).map(([i, b]) => toPx(b)).filter((p) => xo(p, me));
        const above = Math.max(-Infinity, ...placed.filter((p) => (p.y0 + p.y1) / 2 < pred).map((p) => p.y1));
        const below = Math.min(Infinity, ...placed.filter((p) => (p.y0 + p.y1) / 2 >= pred).map((p) => p.y0));
        const win = 2.5 * pitch;
        const cs = txt.filter((c) => { const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2; return cx >= me.x0 - W * 0.01 && cx <= me.x1 + W * 0.01 && Math.abs(cy - pred) <= win; });
        const ls = linesOf(cs, H).filter((l) => l.y0 >= above - 1 && l.y1 <= below + 1 && (!lhMed || (l.y1 - l.y0 + 1) >= lhMed * 0.5)
          && !Object.values(res).some((b) => { const p = toPx(b); return xo(p, me) && Math.min(p.y1, l.y1) - Math.max(p.y0, l.y0) > 0.5 * (l.y1 - l.y0 + 1); }));
        if (!ls.length) continue;
        const l = ls.sort((a, c) => Math.abs((a.y0 + a.y1) / 2 - pred) - Math.abs((c.y0 + c.y1) / 2 - pred))[0];
        res[x.b.i] = [clamp((l.y0 - 1) / H * 1000, 0, 1000), x.b.box[1], clamp((l.y1 + 2) / H * 1000, 0, 1000), x.b.box[3]];
      }
    }

    function solve(sh) {
    let info = blocks.filter((b) => b.box && !/^(figure|table)$/.test(b.type) && (b.lines || []).length && !tooFewLines(b)).map((b) => {
      const d = sh[b.i] || 0;
      const bx0 = b.box[1] / 1000 * W, bx1 = b.box[3] / 1000 * W, by0 = b.box[0] / 1000 * H + d, by1 = clipY1(b) / 1000 * H + d;
      // ফাঁকা লাইন ("") ছাপা লাইন নয় (a17: ৩ লাইন ধরলে ২ লেখা-লাইনের বাক্স ভুল দলে বসত)
      // ২০২৬-১০-১৪: বহু-লাইনের ব্লকে জানালা ১ ⇒ ১.৬ লাইন (2.pdf p2: প্রশ্ন+উত্তর ২-লাইনের ব্লকে Gemini ঠিক ১ লাইন ওপরে ⇒ সঠিক জোড়া
      // জানালার কিনারায় কাটা পড়ত)। এক-লাইনের ব্লকে আগের মতো (g41 কৃত্রিম টেস্ট: চওড়া জানালায় ১ম ধাপ ভুল শিকল বসায়)
      const k = global.__FZ_OFF_DASH ? b.lines.length : Math.max(1, b.lines.filter((l) => String(l).trim()).length), pad = Math.max((by1 - by0) / k * (k >= 2 && !global.__FZ_OFF_LINEOV ? 1.6 : 1), 10);
      const cs = txt.filter((c) => { const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2; return cx >= bx0 - W * 0.01 && cx <= bx1 + W * 0.01 && cy >= by0 - pad && cy <= by1 + pad; });
      let lines = linesOf(cs, H);
      // ২০২৬-১০-১৪ (2.pdf p2): ২pt-এর বিন্দু/দাগ "লাইন" হয়ে ২-লাইনের ব্লকের এক লাইন খেত (শিকল ১ লাইন ওপরে)। লাইন-মধ্যমার ৪০%-এর
      // কম উচ্চতা বাদ (FZ_OFF=LINEOV-এ পুরোনো)
      if (!global.__FZ_OFF_LINEOV && lines.length > 2) { const hm = median(lines.map((l) => l.y1 - l.y0)); lines = lines.filter((l) => l.y1 - l.y0 >= hm * 0.4); }
      const bc = (by0 + by1) / 2, runs = [];
      for (let s = 0; s + k <= lines.length; s++) { const y0 = lines[s].y0, y1 = lines[s + k - 1].y1; runs.push({ y0, y1, off: (y0 + y1) / 2 - bc }); }
      if (!runs.length && lines.length) { const y0 = lines[0].y0, y1 = lines[lines.length - 1].y1; runs.push({ y0, y1, off: (y0 + y1) / 2 - bc }); }
      const lim = (by1 - by0) * 1.2 + 10;
      const keep = runs.filter((r) => Math.abs(r.off) <= lim).sort((a, c) => Math.abs(a.off) - Math.abs(c.off)).slice(0, 6);
      return { b, bx0, bx1, by0, by1, bc, runs: keep, k };
    }).filter((x) => x.runs.length).sort((a, c) => a.bc - c.bc);
    // ২০২৬-১০-১৪ (2.pdf p2, প্রশ্ন+উত্তর এক ব্লকে ২ লাইন): ছেদ-সীমা ছিল "বক্স-উচ্চতার অর্ধেক" = ২-লাইনের ব্লকে পুরো ১ লাইন ⇒
    // পরের ব্লক আগেরটির শেষ লাইন (উত্তর) নিয়ে নিত (প্রথম লাইনে ইনডেন্ট, দুপাশে-সাজ, টানা লাইন)। এখন সীমা = এক লাইনের অর্ধেক।
    // বন্ধ: FZ_OFF=LINEOV
    const ovLim = (x, r, p, q) => (global.__FZ_OFF_LINEOV ? Math.min(r.y1 - r.y0, q.y1 - q.y0) : Math.min((r.y1 - r.y0) / x.k, (q.y1 - q.y0) / p.k)) * 0.5;
    // ক্রম-ধরে মিল (DP): পরপর ব্লকের সরণ প্রায় সমান থাকুক (Gemini-র সরণ ধীরে বাড়ে-কমে), একই কলামে লাইন উল্টো/একই হবে না
    const xOv = (a, c) => Math.min(a.bx1, c.bx1) - Math.max(a.bx0, c.bx0) > 0;
    const n = info.length, INF = 1e18;
    const dp = info.map((x) => x.runs.map(() => INF)), from = info.map((x) => x.runs.map(() => -1));
    info.forEach((x, i) => x.runs.forEach((r, k) => {
      const unary = Math.abs(r.off) * 0.15;
      if (i === 0) { dp[0][k] = unary; return; }
      const p = info[i - 1];
      p.runs.forEach((q, j) => {
        if (dp[i - 1][j] >= INF) return;
        // একই কলামে (x ছেদ): এই ব্লকের লাইন আগেরটির নিচে হতেই হবে
        if (xOv(x, p) && r.y0 < q.y1 - ovLim(x, r, p, q)) return;
        // ২০২৬-১০-১৪: অন্য কলামের ব্লকে (পাতা-নম্বর ডানে) সরণ-ধারাবাহিকতা দুর্বল (×০.৩) — 2.pdf p2-এ ঠিক-বসা পাতা-নম্বর
        // পুরো কলামের (১ লাইন সরা Gemini) শিকলকে ভুল দিকে টানত। FZ_OFF=LINEOV-এ পুরোনো
        const c = dp[i - 1][j] + Math.abs(r.off - q.off) * (xOv(x, p) || global.__FZ_OFF_LINEOV ? 1 : 0.3) + unary;
        if (c < dp[i][k]) { dp[i][k] = c; from[i][k] = j; }
      });
      if (dp[i][k] >= INF) {
        // কোনো বৈধ পূর্বসূরি নেই ⇒ এখান থেকে নতুন শিকল (বড় শাস্তিসহ)
        const best = Math.min(...dp[i - 1]);
        dp[i][k] = (best < INF ? best : 0) + 50 + unary; from[i][k] = -2;
      }
    }));
    const pick = new Array(n).fill(-1);
    if (n) {
      let k = dp[n - 1].indexOf(Math.min(...dp[n - 1]));
      for (let i = n - 1; i >= 0; i--) {
        pick[i] = k;
        const f = from[i][k];
        if (i > 0) k = f >= 0 ? f : dp[i - 1].indexOf(Math.min(...dp[i - 1]));
      }
    }
    // শেষ পাহারা: একই x-অংশে দুই ব্লক একই লাইন পেলে পরেরটির Gemini-বক্সই থাকে
    const claimed = [], out = {};
    const ovY = (a, c) => Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
    info.forEach((x, i) => {
      const r = x.runs[pick[i]];
      if (!r) return;
      if (claimed.some((c) => ovY(r, c) > ovLim(x, r, c, c) && xOv(x, c))) return;
      claimed.push({ y0: r.y0, y1: r.y1, bx0: x.bx0, bx1: x.bx1, k: x.k });
      out[x.b.i] = [clamp((r.y0 - 1) / H * 1000, 0, 1000), x.b.box[1], clamp((r.y1 + 2) / H * 1000, 0, 1000), x.b.box[3]];
    });
    return out;
    }
  }

  /**
   * a18: ব্লক কম (fitBoxDrift-এর ≥৬ জোড়া নেই) অথচ Gemini-বক্স পাতার ওপরে অনেক সরে (≈৬০ একক) ⇒ বিকল্প:
   * সব বক্সের উল্লম্ব বিস্তার ↔ পাতার কালির বিস্তার (ক্ষুদ্র দাগ বাদে) থেকে রৈখিক সম্পর্ক।
   * নেওয়া হয় কেবল তখন, যখন সংশোধিত বক্সগুলোতে খণ্ড-কেন্দ্র আগের চেয়ে ≥২০% বেশি পড়ে (নিজেই যাচাই)।
   */
  function fitExtentDrift(blocks, m, comps) {
    const bs = blocks.filter((b) => b.box);
    const cs = comps.filter((c) => c.n >= 12);
    if (bs.length < 2 || !cs.length) return null;
    const H = m.H, W = m.W;
    const gTop = Math.min(...bs.map((b) => b.box[0])), gBot = Math.max(...bs.map((b) => b.box[2]));
    const iTop = Math.min(...cs.map((c) => c.y0)) / H * 1000, iBot = Math.max(...cs.map((c) => c.y1)) / H * 1000;
    if (gBot - gTop < 100) return null;
    const a = (iBot - iTop) / (gBot - gTop), b = iTop - a * gTop;
    if (a < 0.85 || a > 1.2) return null;
    if (Math.max(Math.abs(a * gTop + b - gTop), Math.abs(a * gBot + b - gBot)) < 15) return null;
    const txt = cs.filter((c) => !isFrameComp(m, c));
    const hits = (f) => bs.filter((x) => x.type !== 'figure').reduce((s, x) => {
      const bx = f ? applyDrift(x.box, f) : x.box;
      const y0 = bx[0] / 1000 * H, y1 = bx[2] / 1000 * H, x0 = bx[1] / 1000 * W, x1 = bx[3] / 1000 * W;
      return s + txt.filter((c) => { const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2; return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1; }).length;
    }, 0);
    const f = { a, b, extent: true }, h0 = hits(null), h1 = hits(f);
    // [Rule PG2: FZ_OFF=FORMFIX / FZ_OFF=PG2] অল্প ব্লকের পাতায় (<=5, যেমন a18) রেন্ডারার ভেদে বিস্তার-সরণ (fitExtentDrift) সহনশীলতা ১.১৮।
    return h1 >= h0 * (fzOn('FORMFIX') && !global.__FZ_OFF_PG2 && blocks.length <= 5 ? 1.18 : 1.2) + 3 ? f : null;
  }

  const applyDrift = (box, f) => (f && box ? [f.a * box[0] + f.b, box[1], f.a * box[2] + f.b, box[3]].map((v, i) => (i % 2 === 0 ? clamp(v, 0, 1000) : v)) : box);

  /** Part-17.8 + B2: পাতার বা ছকের খাড়া বিভাজক-রেখা — কলাম-স্ক্যান (আড়াআড়ি দাগে জোড়া থাকলেও শনাক্ত) ও সরু খণ্ড */
  function verticalRules(m, opts) {
    const o = opts || {}, ppt = o.pxPerPt || 1;
    if (!tableGridOn() && !rules2On()) {
      return (o.comps || components(m, null, 6))
        .filter((c) => !isFrameComp(m, c) && (c.x1 - c.x0 + 1) <= Math.max(4, ppt * 2.5) && (c.y1 - c.y0 + 1) >= 25 * ppt)
        .map((c) => ({ x: (c.x0 + c.x1) / 2 / ppt, y: c.y0 / ppt, h: (c.y1 - c.y0 + 1) / ppt }));
    }
    const gm = o.gridMask || (m && m.mask ? m : (m && m.data ? inkMask(m) : null));
    if (!gm || !gm.mask) return [];
    const { W, H, mask } = gm;
    let x0 = 0, y0 = 0, x1 = W, y1 = H;
    if (Array.isArray(o.box) && o.box.length >= 4) {
      y0 = clamp(Math.floor(o.box[0] / 1000 * H), 0, H);
      x0 = clamp(Math.floor(o.box[1] / 1000 * W), 0, W);
      y1 = clamp(Math.ceil(o.box[2] / 1000 * H), 0, H);
      x1 = clamp(Math.ceil(o.box[3] / 1000 * W), 0, W);
    } else if (o.rect) {
      x0 = clamp(Math.floor(o.rect.x0 != null ? o.rect.x0 : (o.rect.x || 0) * ppt), 0, W);
      y0 = clamp(Math.floor(o.rect.y0 != null ? o.rect.y0 : (o.rect.y || 0) * ppt), 0, H);
      x1 = clamp(Math.ceil(o.rect.x1 != null ? o.rect.x1 : ((o.rect.x || 0) + (o.rect.w || W)) * ppt), 0, W);
      y1 = clamp(Math.ceil(o.rect.y1 != null ? o.rect.y1 : ((o.rect.y || 0) + (o.rect.h || H)) * ppt), 0, H);
    }
    const minLen = Math.max(10, Math.round((o.minLenPt || (o.box || o.rect ? 15 : 25)) * ppt));
    const maxT = Math.max(4, Math.round(ppt * 3));
    const colRuns = [];
    for (let x = x0; x < x1; x++) {
      const runs = [];
      let s = -1, miss = 0, last = -1;
      for (let y = y0; y <= y1; y++) {
        const on = y < y1 && mask[y * W + x];
        if (on) { if (s < 0) s = y; last = y; miss = 0; continue; }
        if (s >= 0 && (++miss > 2 || y === y1)) {
          if (last - s + 1 >= minLen) runs.push([s, last]);
          s = -1; miss = 0;
        }
      }
      colRuns.push(runs);
    }
    const raw = [], open = [];
    for (let xi = 0; xi <= x1 - x0; xi++) {
      const x = x0 + xi, runs = xi < colRuns.length ? colRuns[xi] : [];
      const still = [];
      for (const g of open) {
        const r = runs.find((q) => !q.used && Math.min(q[1], g.y1) - Math.max(q[0], g.y0) >= 0.75 * Math.min(q[1] - q[0] + 1, g.y1 - g.y0 + 1));
        if (r) { r.used = true; g.x1 = x; g.y0 = Math.min(g.y0, r[0]); g.y1 = Math.max(g.y1, r[1]); still.push(g); }
        else if (g.x1 - g.x0 + 1 <= maxT) raw.push(g);
      }
      open.length = 0; open.push(...still);
      for (const r of runs) if (!r.used) open.push({ x0: x, x1: x, y0: r[0], y1: r[1] });
    }
    const hasBox = !!(o.box || o.rect || o.includeFrame);
    return raw
      .filter((g) => hasBox || !((g.y1 - g.y0 + 1) >= H * 0.7 && (g.x0 <= W * 0.15 || g.x1 >= W * 0.85)))
      .map((g) => {
        const xp = Math.round(((g.x0 + g.x1) / 2 / ppt) * 10) / 10;
        const yp = Math.round((g.y0 / ppt) * 10) / 10;
        const hp = Math.round(((g.y1 - g.y0 + 1) / ppt) * 10) / 10;
        return { x: xp, y: yp, h: hp, y0: yp, y1: Math.round((yp + hp) * 10) / 10, t: Math.round(((g.x1 - g.x0 + 1) / ppt) * 10) / 10 };
      })
      .sort((a, b) => a.x - b.x || a.y - b.y);
  }

  /** B2: পাশাপাশি ছোট ছোট বাক্স শনাক্তকরণ (যেমন "বড় সংখ্যা গোল কর" — পূর্ণ-প্রস্থ রেখা নয়, প্রতিটি ছোট বাক্সের নিজস্ব সীমা) */
  function detectSmallBoxes(m, rect, opts) {
    if (!tableGridOn() && !rules2On()) return [];
    const o = opts || {}, ppt = o.pxPerPt || 1;
    const gm = o.gridMask || (m && m.mask ? m : (m && m.data ? inkMask(m) : null));
    if (!gm || !gm.mask) return [];
    const { W, H, mask } = gm;
    const x0 = rect ? clamp(Math.floor(rect.x0 != null ? rect.x0 : 0), 0, W) : 0;
    const y0 = rect ? clamp(Math.floor(rect.y0 != null ? rect.y0 : 0), 0, H) : 0;
    const x1 = rect ? clamp(Math.ceil(rect.x1 != null ? rect.x1 : W), 0, W) : W;
    const y1 = rect ? clamp(Math.ceil(rect.y1 != null ? rect.y1 : H), 0, H) : H;
    const comps = o.comps || components(gm, { x0, y0, x1, y1 }, 8);
    const hasBoxPerimeter = (c) => {
      const cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1;
      if (cw < 10 * ppt || cw > 160 * ppt || ch < 10 * ppt || ch > 90 * ppt) return false;
      let topH = 0, botH = 0, leftV = 0, rightV = 0;
      const band = Math.max(2, Math.round(2 * ppt));
      for (let x = c.x0; x <= c.x1; x++) {
        for (let d = 0; d < band && c.y0 + d <= c.y1; d++) if (mask[(c.y0 + d) * W + x]) { topH++; break; }
        for (let d = 0; d < band && c.y1 - d >= c.y0; d++) if (mask[(c.y1 - d) * W + x]) { botH++; break; }
      }
      for (let y = c.y0; y <= c.y1; y++) {
        for (let d = 0; d < band && c.x0 + d <= c.x1; d++) if (mask[y * W + c.x0 + d]) { leftV++; break; }
        for (let d = 0; d < band && c.x1 - d >= c.x0; d++) if (mask[y * W + c.x1 - d]) { rightV++; break; }
      }
      return topH >= cw * 0.65 && botH >= cw * 0.65 && leftV >= ch * 0.65 && rightV >= ch * 0.65;
    };
    const cands = comps.filter(hasBoxPerimeter).sort((a, b) => a.x0 - b.x0);
    if (cands.length < 2) return [];
    const medY0 = median(cands.map((c) => c.y0)), medY1 = median(cands.map((c) => c.y1));
    const rowBoxes = cands.filter((c) => Math.abs(c.y0 - medY0) <= 8 * ppt && Math.abs(c.y1 - medY1) <= 8 * ppt);
    const distinct = [];
    for (const b of rowBoxes) {
      const prev = distinct[distinct.length - 1];
      if (!prev || b.x0 >= prev.x1 - 2) distinct.push(b);
    }
    if (distinct.length < 2) return [];
    return distinct.map((b) => ({
      x0: r1g(b.x0 / ppt), y0: r1g(b.y0 / ppt),
      x1: r1g((b.x1 + 1) / ppt), y1: r1g((b.y1 + 1) / ppt),
      w: r1g((b.x1 - b.x0 + 1) / ppt), h: r1g((b.y1 - b.y0 + 1) / ppt)
    }));
  }

  /**
   * a03 (২০২৬-১০-১২): পাতার আনুভূমিক রেখা (বাক্সের সারি-বিভাজক, অংশের নিচের দাগ) — সারি ধরে টানা কালি ≥ max(৮০pt, প্রস্থের ১৫%),
   * পাশের সারির দল ≤২.৫pt মোটা (কালো পটি/লেখা নয়)। বাক্সের খাড়া দাগে জোড়া থাকায় components দিয়ে আলাদা হয় না, তাই সারি-স্ক্যান।
   * @returns [{ x, y, w, t }] (pt; y = রেখার মাঝ, t = পুরুত্ব)
   */
  function horizontalRules(m, opts) {
    const o = opts || {}, ppt = o.pxPerPt || 1, { W, H, mask } = m;
    const minLen = Math.max(80 * ppt, W * 0.15), maxT = Math.max(2, Math.round(2.5 * ppt));
    const rowRuns = [];
    for (let y = 0; y < H; y++) {
      const runs = []; let s = -1;
      for (let x = 0; x <= W; x++) {
        const on = x < W && mask[y * W + x];
        if (on && s < 0) s = x;
        if (!on && s >= 0) { if (x - s >= minLen) runs.push([s, x - 1]); s = -1; }
      }
      rowRuns.push(runs);
    }
    // পাশের সারির একই (≥৮০% মেলা) রান = এক রেখা
    const out = [], open = [];
    for (let y = 0; y <= H; y++) {
      const runs = y < H ? rowRuns[y] : [];
      const still = [];
      for (const g of open) {
        const r = runs.find((q) => Math.min(q[1], g.x1) - Math.max(q[0], g.x0) >= 0.8 * Math.min(q[1] - q[0], g.x1 - g.x0));
        if (r) { g.y1 = y; g.x0 = Math.min(g.x0, r[0]); g.x1 = Math.max(g.x1, r[1]); r.used = true; still.push(g); }
        else if (g.y1 - g.y0 + 1 <= maxT) out.push({ x: g.x0 / ppt, y: (g.y0 + g.y1) / 2 / ppt, w: (g.x1 - g.x0 + 1) / ppt, t: (g.y1 - g.y0 + 1) / ppt });
      }
      open.length = 0; open.push(...still);
      for (const r of runs) if (!r.used) open.push({ x0: r[0], x1: r[1], y0: y, y1: y });
    }
    return out.map((r) => ({ x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10, w: Math.round(r.w * 10) / 10, t: Math.round(r.t * 10) / 10 }));
  }

  /**
   * ২০২৬-১০-১২: পাতার আয়তাকার বাক্স (a03 মূল-অংশের দুই পাশ, f2 ড্যাশ-ফ্রেম, "ফরম-৮"/"তফসিল")। বাক্সের খাড়া দাগ অনুভূমিক দাগে
   * জোড়া থাকায় components-এ সরু খণ্ড হয় না ⇒ কলাম-স্ক্যান (≤৩pt ফাঁক সহনীয় = ড্যাশ), ≥২০pt লম্বা, ঘনত্ব ≥৪৫%।
   * বাঁ-ডান জোড়া (ওপর/নিচ ±৪pt) + ওপর/নিচের সারিতে কালি ≥৬০% ⇒ বাক্স। পাতা-ফ্রেম (≥৯০% পাতা) বাদ।
   * @returns [{ x0, y0, x1, y1, dashed }] (pt)
   */
  function boxFrames(m, opts) {
    const o = opts || {}, ppt = o.pxPerPt || 1, { W, H, mask } = m;
    const gap = Math.max(2, Math.round(4.5 * ppt)), minLen = 20 * ppt, maxT = Math.max(3, Math.round(2.5 * ppt)), tol = 7 * ppt;   // ছায়াওয়ালা বাক্সের এক পাশ ~৬pt লম্বা (f2 তফসিল)
    const cols = [];
    for (let x = 0; x < W; x++) {
      const runs = []; let s = -1, last = -1, on = 0;
      for (let y = 0; y <= H; y++) {
        const v = y < H && mask[y * W + x];
        if (v) { if (s < 0 || y - last > gap) { if (s >= 0 && last - s + 1 >= minLen && on / (last - s + 1) >= 0.45) runs.push([s, last, on]); s = y; on = 0; } last = y; on++; }
      }
      if (s >= 0 && last - s + 1 >= minLen && on / (last - s + 1) >= 0.45) runs.push([s, last, on]);
      cols.push(runs);
    }
    // সরু দাগ: অন্তত এক পাশের কলাম (২px দূরে) বেশিরভাগ ফাঁকা — কালো পটির ভেতরের সাদা-লেখার ফাঁক "দাগ" নয়
    const sideFree = (g) => [g.x0 - 2, g.x1 + 2].some((x) => {
      if (x < 0 || x >= W) return true;
      let on = 0;
      for (let y = g.y0; y <= g.y1; y++) on += mask[y * W + x];
      return on / (g.y1 - g.y0 + 1) < 0.5;
    });
    // পাশের কলামের মেলা রান = এক দাগ (≤maxT মোটা)
    const segs = [], open = [];
    for (let x = 0; x <= W; x++) {
      const runs = x < W ? cols[x] : [], still = [];
      for (const g of open) {
        // দৈর্ঘ্যও মিলতে হবে (বড়টির ≥৮০%) — নইলে কিনারার দাগ পাশের কালো পটির কলামের সাথে মিশে "মোটা" হয়ে বাদ পড়ত (a03)
        const r = runs.find((q) => !q.used && Math.min(q[1], g.y1) - Math.max(q[0], g.y0) >= 0.8 * Math.max(q[1] - q[0], g.y1 - g.y0));
        if (r) { r.used = true; g.x1 = x; g.y0 = Math.min(g.y0, r[0]); g.y1 = Math.max(g.y1, r[1]); g.on = Math.max(g.on, r[2]); still.push(g); }
        else if (g.x1 - g.x0 + 1 <= maxT && sideFree(g)) segs.push(g);
      }
      open.length = 0; open.push(...still);
      for (const r of runs) if (!r.used) open.push({ x0: x, x1: x, y0: r[0], y1: r[1], on: r[2] });
    }
    const rowCover = (y, xa, xb) => {
      let hit = 0;
      for (let x = xa; x <= xb; x++) {
        let f = false;
        for (let yy = Math.max(0, Math.round(y - 2 * ppt)); yy <= Math.min(H - 1, Math.round(y + 2 * ppt)) && !f; yy++) f = !!mask[yy * W + x];
        if (f) hit++;
      }
      return hit / Math.max(1, xb - xa + 1);
    };
    const out = [];
    segs.sort((a, b) => a.x0 - b.x0);
    if (o.debugSegs) o.debugSegs.push(...segs.map((g) => ({ x: r1g(g.x0 / ppt), y0: r1g(g.y0 / ppt), y1: r1g(g.y1 / ppt), d: r1g(g.on / (g.y1 - g.y0 + 1)) })));
    for (let i = 0; i < segs.length; i++) {
      const L = segs[i];
      for (let j = i + 1; j < segs.length; j++) {
        const R = segs[j];
        if (R.x0 - L.x1 < 30 * ppt || Math.abs(R.y0 - L.y0) > tol || Math.abs(R.y1 - L.y1) > tol) continue;
        // দুই পাশের মিলিত অংশ (ছায়া/জোড়ের বাড়তি টুকরো বাদ — f2 তফসিল)
        const y0 = Math.max(L.y0, R.y0), y1 = Math.min(L.y1, R.y1);
        // ড্যাশ-ফ্রেমের ওপর/নিচ ~৫০% কালি (f2)
        const need = Math.min(L.on / (L.y1 - L.y0 + 1), R.on / (R.y1 - R.y0 + 1)) < 0.85 ? 0.4 : 0.6;
        if (rowCover(y0, L.x1 + 1, R.x0 - 1) < need || rowCover(y1, L.x1 + 1, R.x0 - 1) < need) continue;
        if (R.x1 - L.x0 >= W * 0.9 && y1 - y0 >= H * 0.9) continue;
        const isDashedBox = Math.max(L.on / (L.y1 - L.y0 + 1), R.on / (R.y1 - R.y0 + 1)) < 0.85;
        if (rules2On() && isDashedBox && (y1 - y0) / ppt <= 26 && (R.x1 - L.x0) / ppt < 120) continue;
        out.push({ x0: L.x0 / ppt, y0: y0 / ppt, x1: (R.x1 + 1) / ppt, y1: (y1 + 1) / ppt, t: (L.x1 - L.x0 + R.x1 - R.x0 + 2) / 2 / ppt, dashed: isDashedBox });   // দুই পাশই ভাঙা হলে তবে ড্যাশ
        break;   // সবচেয়ে কাছের ডান জোড়া
      }
    }
    return out.map((b) => ({ x0: r1g(b.x0), y0: r1g(b.y0), x1: r1g(b.x1), y1: r1g(b.y1), t: r1g(b.t), dashed: b.dashed }));
  }
  const r1g = (v) => Math.round(v * 10) / 10;

  /** আয়তে আলাদা অনুভূমিক রেখার সংখ্যা: যে সারিতে একটানা কালি আয়ত-প্রস্থের ≥৮০% (পাশের সারি একই রেখা) */
  // ---------------------------------------------------------------- g41: রঙিন/ধূসর পটি (অনুচ্ছেদ-ছায়া)
  const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0').toUpperCase();
  /** পাতার নিজের পটভূমির উজ্জ্বলতা (নমুনা-বিন্দুর হালকা অংশের মধ্যমা) — স্ক্যানের ধূসর কাগজকে "ছায়া" না ভাবতে */
  function pageBackground(img) {
    const { width: W, height: H, data: d } = img, step = Math.max(1, Math.floor(Math.sqrt(W * H / 40000))), L = [];
    const minL = global.__FZ_ON_OTSU ? otsuThreshold(img) : 150;
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) { const v = lum(d, (y * W + x) * 4); if (v >= minL) L.push(v); }
    if (!L.length && global.__FZ_ON_OTSU) {
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) { const v = lum(d, (y * W + x) * 4); if (v >= 110) L.push(v); }
    }
    return L.length ? median(L) : 255;
  }
  /**
   * ব্লকের লেখার পেছনের রং। লেখা-কালি বাদে পটভূমি পাতার পটভূমির চেয়ে স্পষ্ট গাঢ় ⇒ { fill:'RRGGBB', dark }।
   * গাঢ় পটি (কালো/নীল ব্যান্ডে সাদা লেখা) ⇒ dark=true (লেখা সাদা হবে)। নইলে null।
   * @param box  [y0,x0,y1,x1] (০–১০০০) — লাইনে-বসানো বক্স ভালো (পটির ভেতরেই থাকে)
   */
  function blockShade(img, box, opts) {
    const o = opts || {}, { width: W, height: H, data: d } = img;
    const x0 = Math.max(0, Math.floor(box[1] / 1000 * W) + 1), x1 = Math.min(W - 1, Math.ceil(box[3] / 1000 * W) - 1);
    const y0 = Math.max(0, Math.floor(box[0] / 1000 * H) + 1), y1 = Math.min(H - 1, Math.ceil(box[2] / 1000 * H) - 1);
    if (x1 - x0 < 12 || y1 - y0 < 4) return null;
    const sx = Math.max(1, Math.floor((x1 - x0) / 400)), sy = Math.max(1, Math.floor((y1 - y0) / 30));
    const all = [];
    for (let y = y0; y <= y1; y += sy) for (let x = x0; x <= x1; x += sx) { const i = (y * W + x) * 4; all.push([lum(d, i), d[i], d[i + 1], d[i + 2]]); }
    if (all.length < 40) return null;
    const pageL = o.pageL || (global.__FZ_ON_OTSU ? pageBackground(img) : 255);
    const med = (a, k) => median(a.map((p) => p[k]));
    const darkP = all.filter((p) => p[0] < 110);
    if (darkP.length / all.length > 0.6) {   // গাঢ় পটি, হালকা লেখা
      return { fill: hex2(med(darkP, 1)) + hex2(med(darkP, 2)) + hex2(med(darkP, 3)), dark: true };
    }
    // পটভূমি = প্রায়-কালো লেখা (<১০০) বাদে বাকি — গ্রেডিয়েন্ট পটির গাঢ় বাঁ অংশও (১০০–১৫০) ধরা পড়ে (g41 আঁটসাঁট বক্স)
    const bg = all.filter((p) => p[0] >= 100);
    const tint = bg.filter((p) => p[0] < pageL - 12);
    if (o.debug) return { n: all.length, dark: darkP.length, bg: bg.length, tint: tint.length, mL: tint.length ? med(tint, 0) : null, px: [x0, y0, x1, y1], wide: wideBar(img, y0, y1, pageL) };
    const mL = tint.length ? med(tint, 0) : 255;
    // ২০২৬-১০-১৪ (2.pdf p2): ধূসর জলছাপের ওপরের লাইনকে ছায়া ভাবা হতো। আসল পটি লাইনের দুই প্রান্তেও থাকে, জলছাপ সাধারণত
    // এক প্রান্ত ছাড়িয়ে যায় না ⇒ বাঁ ও ডান ১০% অংশের পটভূমির ≥৫০% রঙিন হতে হবে। বন্ধ করতে FZ_OFF=SHADEEDGE
    const edgeTint = (lo, hi) => {
      let n = 0, t = 0;
      for (let y = y0; y <= y1; y += sy) for (let x = lo; x <= hi; x += sx) { const v = lum(d, (y * W + x) * 4); if (v >= 100) { n++; if (v < pageL - 12) t++; } }
      return n < 4 || t / n >= 0.5;
    };
    const ew = Math.max(3, Math.round((x1 - x0) * 0.1));
    const edgesOk = global.__FZ_OFF_SHADEEDGE || (edgeTint(x0, x0 + ew) && edgeTint(x1 - ew, x1));
    if (edgesOk && bg.length >= all.length * 0.4 && tint.length / bg.length >= 0.6 && mL < pageL - 12 && mL >= 100) {   // বক্সের ভেতরেই পটি
      return { fill: hex2(med(tint, 1)) + hex2(med(tint, 2)) + hex2(med(tint, 3)), dark: false };
    }
    // বক্সে পটি দেখা গেল না — পাতা-জোড়া পটি কি? (g41: গ্রেডিয়েন্ট বাঁয়ে প্রায়-সাদা, লেখা বাঁয়ে, Gemini-বক্স আঁটসাঁট)
    return wideBar(img, y0, y1, pageL);
  }

  /**
   * লেখার লাইনের উচ্চতায় পাতার প্রস্থ জুড়ে "ভরা" কলাম: সারির ≥৮৫% রঙিন (১০০ ≤ L < পাতা−১২)।
   * লেখার ভেতর দিয়ে যাওয়া কলামে সাদা সারি অনেক ⇒ ভরা নয় (দুই-কলামের পাতায় পাশের লেখা পটি মনে হয় না)।
   * টানা ভরা অংশ প্রস্থের ≥৩৫% ⇒ { fill, dark:false, wide:true }, নইলে null।
   */
  function wideBar(img, y0, y1, pageL) {
    const { width: W, data: d } = img;
    const ya = y0 + 2, yb = y1 - 2;
    if (yb - ya < 3) return null;
    const xa = Math.floor(W * 0.03), xb = Math.ceil(W * 0.97), step = Math.max(1, Math.floor((xb - xa) / 500));
    const cols = [];
    for (let x = xa; x < xb; x += step) {
      let n = 0, t = 0, r = 0, g = 0, b = 0;
      for (let y = ya; y <= yb; y++) {
        const i = (y * W + x) * 4, v = lum(d, i);
        n++;
        if (v >= 100 && v < pageL - 12) { t++; r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      }
      cols.push(t / n >= 0.85 ? [r / t, g / t, b / t] : null);
    }
    let best = 0, cur = 0, gaps = 0, run = [], bestRun = [];
    for (const c of cols) {   // ছোট ফাঁক (≤২ কলাম) সহ টানা অংশ
      if (c) { cur++; run.push(c); gaps = 0; if (cur > best) { best = cur; bestRun = run.slice(); } }
      else if (cur && ++gaps <= 2) { cur++; }
      else { cur = 0; gaps = 0; run = []; }
    }
    if (best < cols.length * 0.35 || bestRun.length < 10) return null;
    const mid = (k) => median(bestRun.map((c) => c[k]));
    return { fill: hex2(mid(0)) + hex2(mid(1)) + hex2(mid(2)), dark: false, wide: true };
  }

  /**
   * a03/B9: গাঢ় ব্যান্ডের (কালো পটি, সাদা লেখা) উল্টো মাস্ক — সাধারণ মাস্কে পুরো ব্যান্ডই "কালি", লেখা মাপা যায় না
   * (উচ্চতা ২–৯pt, ফন্ট ৬)। বক্সের ±অর্ধেক-উচ্চতায় যে সারিগুলোর বক্স-প্রস্থের ≥৫০% গাঢ় (<১১০), সেখানে
   * বাঁ-ডানের গাঢ় সীমার ভেতরের হালকা (>১৫০) পিক্সেল = কালি। ব্যান্ড না মিললে null।
   */
  function darkBandMask(img, box) {
    const { width: W, height: H, data: d } = img;
    const bx0 = Math.floor(box[1] / 1000 * W), bx1 = Math.ceil(box[3] / 1000 * W);
    const bh = (box[2] - box[0]) / 1000 * H;
    const ya = clamp(Math.floor(box[0] / 1000 * H - bh / 2), 0, H), yb = clamp(Math.ceil(box[2] / 1000 * H + bh / 2), 0, H);
    const mask = new Uint8Array(W * H);
    // ব্যান্ড-সারি: ≥১৫% গাঢ় সারির টানা অংশ, যার ভেতরে অন্তত একটি ≥৫০% সারি (মোটা সাদা লেখার মাত্রা-সারিতে গাঢ় অংশ কম —
    // শুধু ≥৫০% ধরলে প্রতিটি লাইন দুই টুকরো হতো, f1 শিরোনাম ৪ "লাইন", ফন্ট ৯.৫)
    const frac = [];
    for (let y = ya; y < yb; y++) {
      let dark = 0;
      for (let x = bx0; x < bx1; x++) if (lum(d, (y * W + x) * 4) < 110) dark++;
      frac.push(dark / Math.max(1, bx1 - bx0));
    }
    const inBand = new Uint8Array(frac.length);
    for (let s = 0; s < frac.length;) {
      if (frac[s] < 0.15) { s++; continue; }
      let e = s, strong = false;
      while (e < frac.length && frac[e] >= 0.15) { if (frac[e] >= 0.5) strong = true; e++; }
      if (strong) inBand.fill(1, s, e);
      s = e;
    }
    let fgThr = 150;
    if (global.__FZ_ON_OTSU) {
      const bHist = new Int32Array(256); let bTot = 0, bSum = 0;
      for (let y = ya; y < yb; y++) {
        if (!inBand[y - ya]) continue;
        let xl = -1, xr = -1;
        for (let x = 0; x < W; x++) if (lum(d, (y * W + x) * 4) < 110) { if (xl < 0) xl = x; xr = x; }
        for (let x = xl + 1; x < xr; x++) { const v = clamp(Math.round(lum(d, (y * W + x) * 4)), 0, 255); bHist[v]++; bTot++; bSum += v; }
      }
      if (bTot >= 16) {
        let wB = 0, sB = 0, best = -1, bmB = 40, bmF = 200;
        for (let t = 0; t < 256; t++) {
          const c = bHist[t]; wB += c; sB += t * c; if (wB < 4) continue;
          const wF = bTot - wB; if (wF < 4) break;
          const mB = sB / wB, mF = (bSum - sB) / wF, df = mF - mB;
          if (df >= 20 && wB * wF * df * df > best) { best = wB * wF * df * df; bmB = mB; bmF = mF; }
        }
        if (best > 0) fgThr = clamp(Math.round((bmB + bmF) * 0.5), 110, 200);
      }
    }
    let rows = 0;
    for (let y = ya; y < yb; y++) {
      let xl = -1, xr = -1;
      if (!inBand[y - ya]) continue;
      for (let x = 0; x < W; x++) if (lum(d, (y * W + x) * 4) < 110) { if (xl < 0) xl = x; xr = x; }
      rows++;
      let run = 0, best = 0;
      for (let x = xl + 1; x < xr; x++) {
        if (lum(d, (y * W + x) * 4) > fgThr) { mask[y * W + x] = 1; if (++run > best) best = run; } else run = 0;
      }
      // f1: ব্যান্ডের ভেতরের সরু হালকা আড়াআড়ি রেখা (দুই লাইনের মাঝে) লেখা নয় ⇒ সারি বাদ।
      // টানা এক দৌড় ব্যান্ডের ≥৬০% হলেই রেখা — শব্দের ফাঁকে ভাঙা মাত্রা-সারি থাকে
      if (best > (xr - xl) * 0.6) mask.fill(0, y * W, (y + 1) * W);
    }
    return rows >= 3 ? (global.__FZ_ON_OTSU ? { W, H, mask, thr: fgThr } : { W, H, mask }) : null;
  }

  /** পূর্ণ-প্রস্থ (≥৮০%) আড়াআড়ি রেখার শুরু-y (px) — countHLines-এর একই নিয়ম */
  function hLinePositions(m, r) {
    const { W, mask } = m, need = (r.x1 - r.x0) * ((tableGridOn() && r.minFrac) ? r.minFrac : 0.8), ys = [];
    let prev = false;
    for (let y = r.y0; y < r.y1; y++) {
      let run = 0, best = 0, miss = 0;
      for (let x = r.x0; x < r.x1; x++) {
        if (mask[y * W + x]) { run += miss + 1; miss = 0; if (run > best) best = run; }
        else if (run && ++miss > 2) { run = 0; miss = 0; }
      }
      const isLine = best >= need;
      if (isLine && !prev) ys.push(y);
      prev = isLine;
    }
    return ys;
  }

  /** ২০২৬-১০-১৪ (2.pdf): রেখার আনুভূমিক বিস্তার (px) — hLinePositions-এর শুরু-y থেকে ৩ সারিতে সবচেয়ে লম্বা টানা অংশ (≤২px ফাঁক সহনীয়) */
  function hLineSpan(m, r, y0) {
    const { W, H, mask } = m;
    let best = null;
    for (let y = y0; y < Math.min(H, y0 + 3); y++) {
      let s = -1, miss = 0, last = -1;
      for (let x = r.x0; x <= r.x1; x++) {
        const on = x < r.x1 && mask[y * W + x];
        if (on) { if (s < 0) s = x; last = x; miss = 0; continue; }
        if (s >= 0 && (++miss > 2 || x === r.x1)) { if (!best || last - s > best.x1 - best.x0) best = { x0: s, x1: last + 1 }; s = -1; miss = 0; }
      }
    }
    return best || { x0: r.x0, x1: r.x1 };
  }

  /** ২০২৬-১০-১৩ (a07 পাতা ৪): স্ক্যানে ধূসর সরু রেখা ছিটে-ছিটে ভাঙা (টানা অংশ প্রস্থের ~৩৩%) ⇒ ওপরের নিয়মে রেখা শূন্য,
   *  টেবিল "সীমানাহীন"। বিকল্প: ৩-সারির ফালিতে "সরু" কালি (২pt ওপরে-নিচে কালি নেই — লেখার মাত্রার নিচে খাড়া টান থাকে, তাই
   *  লেখা বাদ পড়ে), ≤১২pt ফাঁক সহনীয় (a07: টানা অংশগুলো মিলে প্রস্থের ৬৪–৭৬%); প্রস্থের ≥৮৫% বিস্তার আর ≥৬৫% ভরাট ⇒ রেখা। শুরু-y (px) */
  function brokenHLinePositions(m, r, ppt) {
    // a07: রেখা বাঁকা/কাত — বাঁ প্রান্ত ডানের চেয়ে ~১pt নিচে; ৩-সারিতে এক অংশ বাদ পড়ত ⇒ ৫-সারির ফালি (±২px)
    const { W, H, mask } = m, need = (r.x1 - r.x0) * 0.85, off = Math.max(5, Math.round(2.5 * ppt)), maxMiss = Math.round(12 * ppt), ys = [];
    const at = (x, y) => y >= 0 && y < H && mask[y * W + x];
    let prev = -1e9;
    for (let y = r.y0; y < r.y1; y++) {
      let s0 = -1, last = -1, fill = 0, bestSpan = 0, bestFill = 0;
      for (let x = r.x0; x < r.x1; x++) {
        const band = at(x, y - 2) || at(x, y - 1) || at(x, y) || at(x, y + 1) || at(x, y + 2);
        const thin = band && !at(x, y + off) && !at(x, y + off + 1);
        if (!thin) continue;
        if (s0 < 0 || x - last > maxMiss) { s0 = x; fill = 0; }
        last = x; fill++;
        if (x - s0 + 1 > bestSpan) { bestSpan = x - s0 + 1; bestFill = fill; }
      }
      if (bestSpan >= need && bestFill >= bestSpan * 0.65) { if (y - prev > off) ys.push(y); prev = y; }
    }
    return ys;
  }

  function countHLines(m, r) {
    const { W, mask } = m, need = (r.x1 - r.x0) * 0.8;
    let lines = 0, prev = false;
    for (let y = r.y0; y < r.y1; y++) {
      let run = 0, best = 0, miss = 0;                 // ≤২px ফাঁক সহনীয় (ভাঙা সরু রেখা)
      for (let x = r.x0; x < r.x1; x++) {
        if (mask[y * W + x]) { run += miss + 1; miss = 0; if (run > best) best = run; }
        else if (run && ++miss > 2) { run = 0; miss = 0; }
      }
      const isLine = best >= need;
      if (isLine && !prev) lines++;
      prev = isLine;
    }
    return lines;
  }

  /** পাতা-জোড়া খণ্ড (চওড়া ও উঁচু দুটোই ≥৭০%) = পাতার ফ্রেম/বর্ডার */
  const isFrameComp = (m, c) => (c.x1 - c.x0 + 1) >= m.W * 0.7 && (c.y1 - c.y0 + 1) >= m.H * 0.7;

  /**
   * Part-17.7: পাতার চারপাশের বর্ডার-ফ্রেম। একটি পাতা-জোড়া খণ্ড ⇒ 'single', দুই বা বেশি (একটির ভেতরে আরেকটি) ⇒ 'double'।
   * @returns null | { style, rectPt:{x,y,w,h} (বাইরেরটি) }
   */
  function detectFrame(m, opts) {
    const o = opts || {}, ppt = o.pxPerPt || 1;
    const all = o.comps || components(m, null, 6);
    const big = all.filter((c) => isFrameComp(m, c));
    if (!big.length) return null;
    const outer = big.reduce((a, c) => ((c.x1 - c.x0) * (c.y1 - c.y0) > (a.x1 - a.x0) * (a.y1 - a.y0) ? c : a));
    // a18/a16: পাতা-জোড়া টেবিলের বাইরে শিরোনাম/পাদটীকা থাকে — বাইরে উল্লেখযোগ্য লেখা থাকলে এটা টেবিল, ফ্রেম নয়
    const out = all.filter((c) => c.n >= 12 && !isFrameComp(m, c) && ((c.y0 + c.y1) / 2 < outer.y0 || (c.y0 + c.y1) / 2 > outer.y1 || (c.x0 + c.x1) / 2 < outer.x0 || (c.x0 + c.x1) / 2 > outer.x1));
    if (out.length >= 8) return null;
    return { style: big.length >= 2 ? 'double' : 'single', rectPt: { x: outer.x0 / ppt, y: outer.y0 / ppt, w: (outer.x1 - outer.x0 + 1) / ppt, h: (outer.y1 - outer.y0 + 1) / ppt } };
  }

  /** পাতার মার্জিন (pt) — ক্ষুদ্র দাগ ও পাতার ফ্রেম বাদে পুরো কালির সীমা */
  function pageMargins(m, opts) {
    const o = opts || {}, ppt = o.pxPerPt || 1;
    const comps = (o.comps || components(m, null, 6)).filter((c) => c.n >= 12 && !isFrameComp(m, c));
    if (!comps.length) return { top: 54, right: 54, bottom: 54, left: 54 };
    const x0 = Math.min(...comps.map((c) => c.x0)), y0 = Math.min(...comps.map((c) => c.y0));
    const x1 = Math.max(...comps.map((c) => c.x1)), y1 = Math.max(...comps.map((c) => c.y1));
    return { top: y0 / ppt, left: x0 / ppt, right: (m.W - 1 - x1) / ppt, bottom: (m.H - 1 - y1) / ppt };
  }

  /**
   * ২০২৬-১০-১৮ (A3_ROWCHECK_v4): ছকের বাক্সের ভেতরের আনুভূমিক রেখা (ভাঙা ও ডাবল-লাইনসহ) থেকে সারি-ব্যান্ড [{ y0, y1 }] (px)।
   * কাছাকাছি দ্বৈত/মোটা রেখা এক দাগে মিলিত হয়; ঘরের লেখার নিচের ছোট দাগ (underline) সারি-রেখা হিসেবে ধরা হয় না।
   * সুইচ: global.__FZ_ON_ROWCHECK (বন্ধ থাকলে null)।
   */
  function tableRowBands(m, box, opts) {
    if (!global.__FZ_ON_ROWCHECK && !tableGridOn()) return null;
    const o = opts || {}, ppt = o.pxPerPt || 1;
    const gm = o.gridMask || (m && m.mask ? m : (m && m.data ? inkMask(m) : null));
    if (!gm || !gm.mask) return [];
    const { W, H, mask } = gm;
    let bx0 = 0, by0 = 0, bx1 = W, by1 = H;
    if (Array.isArray(box) && box.length >= 4) {
      by0 = clamp(Math.floor(box[0] / 1000 * H), 0, H);
      bx0 = clamp(Math.floor(box[1] / 1000 * W), 0, W);
      by1 = clamp(Math.ceil(box[2] / 1000 * H), 0, H);
      bx1 = clamp(Math.ceil(box[3] / 1000 * W), 0, W);
    } else if (box && typeof box === 'object') {
      bx0 = clamp(Math.floor(box.x0 != null ? box.x0 : 0), 0, W);
      by0 = clamp(Math.floor(box.y0 != null ? box.y0 : 0), 0, H);
      bx1 = clamp(Math.ceil(box.x1 != null ? box.x1 : W), 0, W);
      by1 = clamp(Math.ceil(box.y1 != null ? box.y1 : H), 0, H);
    }
    if (bx1 - bx0 < 20 || by1 - by0 < 6) return [];
    const colCnt = new Int32Array(bx1 - bx0), rowCnt = new Int32Array(by1 - by0);
    for (let y = by0; y < by1; y++) {
      const yOff = y * W; let rc = 0;
      for (let x = bx0; x < bx1; x++) if (mask[yOff + x]) { rc++; colCnt[x - bx0]++; }
      rowCnt[y - by0] = rc;
    }
    let tx0 = -1, tx1 = -1, ty0 = -1, ty1 = -1;
    for (let x = bx0; x < bx1; x++) if (colCnt[x - bx0] >= 2) { if (tx0 < 0) tx0 = x; tx1 = x; }
    for (let y = by0; y < by1; y++) if (rowCnt[y - by0] >= 2) { if (ty0 < 0) ty0 = y; ty1 = y; }
    const tw = tx1 - tx0 + 1, th = ty1 - ty0 + 1;
    if (tx0 < 0 || ty0 < 0 || tw < 20 || th < 6) return [];
    const hr = { x0: Math.max(0, tx0), y0: Math.max(0, ty0 - 4), x1: Math.min(W, tx1 + 1), y1: Math.min(H, ty1 + 5) };
    const rawYs = hLinePositions(gm, hr).slice();
    if (!global.__FZ_OFF_BROKEN) {
      const bys = brokenHLinePositions(gm, hr, ppt);
      for (const by of bys) {
        let bestY = by, bestC = -1;
        for (let yy = Math.max(hr.y0, by - 1); yy <= Math.min(hr.y1 - 1, by + 4); yy++) {
          const c = yy >= by0 && yy < by1 ? rowCnt[yy - by0] : 0;
          if (c > bestC) { bestC = c; bestY = yy; }
        }
        rawYs.push(bestY);
      }
    }
    if (rawYs.length < 2) return [];
    rawYs.sort((a, b) => a - b);
    const off = Math.max(5, Math.round(2.5 * ppt)), edgeTol = Math.max(8, Math.round(tw * 0.08));
    const validYs = rawYs.filter((y) => {
      const sp = hLineSpan(gm, hr, y);
      if (sp.x1 - sp.x0 >= tw * 0.8 && sp.x0 <= hr.x0 + edgeTol && sp.x1 >= hr.x1 - edgeTol) return true;
      let xMin = W, xMax = -1, fill = 0, aboveInk = 0;
      for (let x = hr.x0; x < hr.x1; x++) {
        let on = false;
        for (let d = -2; d <= 2; d++) { const yy = y + d; if (yy >= 0 && yy < H && mask[yy * W + x]) { on = true; break; } }
        if (!on) continue;
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
        fill++;
        const ya = y - off;
        if (ya >= 0 && ya < H && mask[ya * W + x]) aboveInk++;
      }
      const span = xMax - xMin + 1;
      return span >= tw * 0.82 && xMin <= hr.x0 + edgeTol && xMax >= hr.x1 - edgeTol && fill >= span * 0.55 && aboveInk <= fill * 0.35;
    });
    if (validYs.length < 2) return [];
    const doubleGap = Math.max(7, Math.round(6.5 * ppt));
    const groups = [[validYs[0]]];
    for (let i = 1; i < validYs.length; i++) {
      const y = validYs[i], g = groups[groups.length - 1];
      if (y - g[g.length - 1] <= doubleGap) g.push(y);
      else groups.push([y]);
    }
    const rules = groups.map((g) => Math.round((g[0] + g[g.length - 1]) / 2));
    const bands = [];
    for (let i = 0; i + 1 < rules.length; i++) {
      if (rules[i + 1] > rules[i]) bands.push({ y0: rules[i], y1: rules[i + 1] });
    }
    return bands;
  }

  /**
   * ২০২৬-১০-১৮ (A3_ROWCHECK_v4): ছবির মাপা সারি-ব্যান্ডের সাথে Gemini-র সারি-সংখ্যার তুলনা ও সংশোধন-পরামর্শ।
   * @returns null (সুইচ বন্ধে) | { measured, gemini, match, bands, suggestion, suspects, tallest, shortest, medianHeight }
   */
  function checkTableRows(m, box, geminiRowCount, opts) {
    if (!global.__FZ_ON_ROWCHECK && !tableGridOn()) return null;
    const bands = tableRowBands(m, box, opts) || [];
    const measured = bands.length;
    const gemini = Math.max(0, Math.round(Number(geminiRowCount) || 0));
    const match = measured > 0 && measured === gemini;
    const suggestion = (!measured || measured === gemini) ? 'ok' : (measured > gemini ? 'split' : 'merge');
    if (!measured) {
      return { measured, gemini, match, bands, suggestion, suspects: [], tallest: null, shortest: null, medianHeight: 0 };
    }
    const heights = bands.map((b) => b.y1 - b.y0);
    const medH = median(heights) || 1;
    const items = bands.map((b, i) => {
      const h = b.y1 - b.y0, ratio = Math.round((h / medH) * 100) / 100;
      return { index: i, y0: b.y0, y1: b.y1, h, ratio, kind: h >= medH ? 'tall' : 'short' };
    });
    const byHeightAsc = items.slice().sort((a, b) => a.h - b.h || a.index - b.index);
    const shortest = byHeightAsc[0];
    const tallest = byHeightAsc[byHeightAsc.length - 1];
    const diff = Math.abs(measured - gemini);
    const byDev = items.slice().sort((a, b) => Math.abs(b.h - medH) - Math.abs(a.h - medH) || a.index - b.index);
    const outliers = byDev.filter((x) => x.h >= medH * 1.35 || x.h <= medH * 0.65);
    const needCount = diff > 0 ? Math.min(items.length, Math.max(diff, outliers.length, 1)) : outliers.length;
    const suspects = byDev.slice(0, needCount);
    return { measured, gemini, match, bands, suggestion, suspects, tallest, shortest, medianHeight: medH };
  }

  const FayzarPageGeometry = { RATIO, inkMask, otsuThreshold, components, linesOf, estimateFontPt, blockMetrics, pageMargins, detectFrame, countHLines, verticalRules, horizontalRules, boxFrames, fitBoxDrift, fitExtentDrift, applyDrift, snapBoxesToLines, vDashComps, median, pageBackground, blockShade, hLinePositions, darkBandMask, tableRowBands, checkTableRows };
  Object.defineProperty(FayzarPageGeometry, 'detectSmallBoxes', { value: detectSmallBoxes, enumerable: false });
  Object.defineProperty(FayzarPageGeometry, 'rules2On', { value: rules2On, enumerable: false });
  global.FayzarPageGeometry = FayzarPageGeometry;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarPageGeometry;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
