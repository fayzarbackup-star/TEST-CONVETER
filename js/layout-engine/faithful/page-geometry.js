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

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const median = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

  function inkMask(img, thr) {
    const T = thr || 160, W = img.width, H = img.height, d = img.data;
    const mask = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) if ((d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000 < T) mask[i] = 1;
    return { W, H, mask };
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
    const mine = all.filter((c) => {
      const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2;
      if (!(cx >= bx0 && cx <= bx1 && cy >= by0 && cy <= by1)) return false;
      if (!o.isTable && isVRule(c)) return false;
      // Part-17.8: বক্সের বাইরে অনেকটা ছড়ানো খণ্ড (ভাঙা পাতার ফ্রেমের পাশ-রেখা ইত্যাদি) ব্লকের নয়
      const sx = W * 0.03, sy = H * 0.03;
      if (c.y0 < by0 - sy || c.y1 > by1 + sy || c.x0 < bx0 - sx || c.x1 > bx1 + sx) return false;
      return (c.x1 - c.x0 + 1) <= bw * 1.3 + 8 && (c.y1 - c.y0 + 1) <= bh * 1.3 + 8;
    });
    const res = { geminiPt: { x: bx0 / ppt, y: by0 / ppt, w: (bx1 - bx0) / ppt, h: (by1 - by0) / ppt }, empty: !mine.length };
    if (!mine.length) { res.rectPt = res.geminiPt; res.lines = []; return res; }
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
        // Part-17.9: কলামের লেখার অবস্থান (বাঁয়ে/ডানে/মাঝে) — প্রতিটি সারি-লাইনে কলামের লেখার বাম/ডান কিনারা কতটা এক
        const edges = [tx0, ...gut.map((g) => g * ppt), tx1];
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
    }
    // (শুধু টেবিল-ব্লকে — বাংলা মাত্রার টানা রেখা সাধারণ লেখায় "রেখা" মনে হতে পারে)
    if (!res.hasGrid && o.isTable) res.hasGrid = countHLines(o.gridMask || m, { x0: Math.max(0, Math.floor(bx0)), y0: Math.max(0, Math.floor(by0)), x1: Math.min(W, Math.ceil(bx1)), y1: Math.min(H, Math.ceil(by1)) }) >= 2;
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
        if (s && c.x0 - s.x1 <= gapThr) s.x1 = Math.max(s.x1, c.x1);
        else segs.push({ x0: c.x0, x1: c.x1 });
      }
      return segs.map((s) => ({ x: s.x0 / ppt, w: (s.x1 - s.x0 + 1) / ppt }));
    });
    // Part-17.8: নিচে-দাগ (underline) — লেখার ঠিক নিচে চ্যাপ্টা লম্বা খণ্ড (লেখার প্রস্থের ≥৬০%)
    if (lines.length) {
      const last = lines[lines.length - 1], lw = last.x1 - last.x0;
      res.underline = all.some((c) => (c.y1 - c.y0 + 1) <= Math.max(3, inkHpx * 0.2) && (c.x1 - c.x0) >= lw * 0.6 &&
        c.y0 >= last.y1 - inkHpx * 0.35 && c.y0 <= last.y1 + inkHpx * 0.6 &&
        Math.min(c.x1, last.x1) - Math.max(c.x0, last.x0) >= lw * 0.6);
      // Part-17.9: দাগ নিচের কার/অক্ষরে লেগে থাকলে আলাদা খণ্ড নয় ⇒ শেষ লাইনের নিচের অংশে লম্বা টানা কালি-সারি খোঁজা
      if (!res.underline && lw > inkHpx * 3) {
        // লেগে-থাকা দাগ লাইনের খণ্ডেরই অংশ ⇒ লাইনের নিচের অংশেই খোঁজা (নিচের টেবিল-সীমানা ভুল করে "নিচে-দাগ" নয়)
        const yA = Math.max(0, Math.round(last.y1 - inkHpx * 0.3)), yB = Math.min(H - 1, last.y1);
        for (let y = yA; y <= yB && !res.underline; y++) {
          let run = 0, best = 0, miss = 0;
          for (let x = Math.max(0, last.x0 - 2); x <= Math.min(W - 1, last.x1 + 2); x++) {
            if (m.mask[y * W + x]) { run += miss + 1; miss = 0; if (run > best) best = run; } else if (run && ++miss > 1) { run = 0; miss = 0; }
          }
          // মাত্রা (বাংলার মাথার রেখা) লাইনের ওপরের দিকে — এখানে শুধু নিচের অংশ দেখা হচ্ছে
          if (best >= lw * 0.7) res.underline = true;
        }
      }
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
  function snapBoxesToLines(m, comps, blocks) {
    const W = m.W, H = m.H;
    const txt = comps.filter((c) => !isFrameComp(m, c) && (c.y1 - c.y0 + 1) < H * 0.08 && (c.x1 - c.x0 + 1) < W * 0.6);
    let info = blocks.filter((b) => b.box && !/^(figure|table)$/.test(b.type) && (b.lines || []).length).map((b) => {
      const bx0 = b.box[1] / 1000 * W, bx1 = b.box[3] / 1000 * W, by0 = b.box[0] / 1000 * H, by1 = b.box[2] / 1000 * H;
      const k = b.lines.length, pad = Math.max((by1 - by0) / k, 10);
      const cs = txt.filter((c) => { const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2; return cx >= bx0 - W * 0.01 && cx <= bx1 + W * 0.01 && cy >= by0 - pad && cy <= by1 + pad; });
      const lines = linesOf(cs, H);
      const bc = (by0 + by1) / 2, runs = [];
      for (let s = 0; s + k <= lines.length; s++) { const y0 = lines[s].y0, y1 = lines[s + k - 1].y1; runs.push({ y0, y1, off: (y0 + y1) / 2 - bc }); }
      if (!runs.length && lines.length) { const y0 = lines[0].y0, y1 = lines[lines.length - 1].y1; runs.push({ y0, y1, off: (y0 + y1) / 2 - bc }); }
      const lim = (by1 - by0) * 1.2 + 10;
      const keep = runs.filter((r) => Math.abs(r.off) <= lim).sort((a, c) => Math.abs(a.off) - Math.abs(c.off)).slice(0, 6);
      return { b, bx0, bx1, by0, by1, bc, runs: keep };
    }).filter((x) => x.runs.length).sort((a, c) => a.bc - c.bc);
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
        if (xOv(x, p) && r.y0 < q.y1 - Math.min(r.y1 - r.y0, q.y1 - q.y0) * 0.5) return;
        const c = dp[i - 1][j] + Math.abs(r.off - q.off) + unary;
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
      if (claimed.some((c) => ovY(r, c) > Math.min(r.y1 - r.y0, c.y1 - c.y0) * 0.5 && xOv(x, c))) return;
      claimed.push({ y0: r.y0, y1: r.y1, bx0: x.bx0, bx1: x.bx1 });
      out[x.b.i] = [clamp((r.y0 - 1) / H * 1000, 0, 1000), x.b.box[1], clamp((r.y1 + 2) / H * 1000, 0, 1000), x.b.box[3]];
    });
    return out;
  }

  const applyDrift = (box, f) => (f && box ? [f.a * box[0] + f.b, box[1], f.a * box[2] + f.b, box[3]].map((v, i) => (i % 2 === 0 ? clamp(v, 0, 1000) : v)) : box);

  /** Part-17.8: পাতার খাড়া বিভাজক-রেখা (পাশাপাশি কলামের মাঝের দাগ) — সরু ও ≥২৫pt লম্বা; পাতার ফ্রেম বাদ */
  function verticalRules(m, opts) {
    const o = opts || {}, ppt = o.pxPerPt || 1;
    return (o.comps || components(m, null, 6))
      .filter((c) => !isFrameComp(m, c) && (c.x1 - c.x0 + 1) <= Math.max(4, ppt * 2.5) && (c.y1 - c.y0 + 1) >= 25 * ppt)
      .map((c) => ({ x: (c.x0 + c.x1) / 2 / ppt, y: c.y0 / ppt, h: (c.y1 - c.y0 + 1) / ppt }));
  }

  /** আয়তে আলাদা অনুভূমিক রেখার সংখ্যা: যে সারিতে একটানা কালি আয়ত-প্রস্থের ≥৮০% (পাশের সারি একই রেখা) */
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
    const big = (o.comps || components(m, null, 6)).filter((c) => isFrameComp(m, c));
    if (!big.length) return null;
    const outer = big.reduce((a, c) => ((c.x1 - c.x0) * (c.y1 - c.y0) > (a.x1 - a.x0) * (a.y1 - a.y0) ? c : a));
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

  const FayzarPageGeometry = { RATIO, inkMask, components, linesOf, estimateFontPt, blockMetrics, pageMargins, detectFrame, countHLines, verticalRules, fitBoxDrift, applyDrift, snapBoxesToLines, median };
  global.FayzarPageGeometry = FayzarPageGeometry;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarPageGeometry;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
