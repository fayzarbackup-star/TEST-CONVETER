/**
 * Fayzar — হুবহু-লেআউট লাইন-আঁটানো (FayzarLineFit) — WORK_PLAN B5
 * নকশার (IR) এক-লাইনের বা হাতে-ভাঙা লাইনের অনুচ্ছেদ আউটপুট-ফন্টে মাপা প্রস্থে ঘরের প্রাপ্য প্রস্থে না আঁটলে
 * Word লাইন ভাঙত ⇒ উচ্চতা বাড়ত, পাতা উপচাত (g01 ট্যাগলাইন: ঘর ৩৯৯pt, ইনডেন্টের পরে ৩৬৮pt, লেখা ≈৩৯৪pt)।
 * ধাপ: ১) ইনডেন্ট / কেন্দ্র-সরণ / ডান-ইনডেন্ট যতটুকু দরকার কমানো; ২) তবুও না আঁটলে ফন্ট সামান্য ছোট (≥৮৫%)।
 * measure(text, bold) = ১০০px আকারে লেখার প্রস্থ (faithful-pipeline-এর textMeasurer)।
 */
(function (global) {
  'use strict';

  const SAFE = 0.98;        // Word-রেন্ডারিং আর ক্যানভাস-মাপের পার্থক্যের ছাড়
  const MIN_SCALE = 0.85;   // এর চেয়ে বেশি ছোট করা নয় (পড়া কঠিন হবে; তখন ভাঙতে দেওয়া)
  const BOLD = 1.02;        // বাংলা মোটা অক্ষর (কৃত্রিম bold) সামান্য চওড়া
  const FILL = /([._\-…·─])\1{5,}/;
  const FILL_G = /([._\-…·─])\1{5,}/g;

  // B7: হুবহু-মোডে ইউনিকোড ফন্ট বাছাই ও প্রস্থ-অনুপাত (সুইচ __FZ_ON_FONTPICK)
  const FONT_WIDTH_RATIOS = {
    Kalpurush: 1.00,
    SutonnyOMJ: 0.94,
    Nikosh: 0.96,
    SolaimanLipi: 0.95
  };
  let _activeFitFont = null;
  function isFontPickOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_FONTPICK)) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_FONTPICK)) return true;
    if (global && Boolean(global.__FZ_ON_FONTPICK)) return true;
    if (typeof process !== 'undefined' && process && process.env && (process.env.__FZ_ON_FONTPICK === '1' || process.env.__FZ_ON_FONTPICK === 'true')) return true;
    return false;
  }
  function getFontWidthRatio(fontName) {
    if (!fontName) return 1.00;
    const f = String(fontName).trim();
    return Object.prototype.hasOwnProperty.call(FONT_WIDTH_RATIOS, f) ? FONT_WIDTH_RATIOS[f] : 1.00;
  }
  function resolveFitFont(it, measure, fontOpt) {
    if (typeof fontOpt === 'string' && fontOpt) return fontOpt;
    if (fontOpt && typeof fontOpt === 'object' && (fontOpt.font || fontOpt.unicodeFont)) return fontOpt.font || fontOpt.unicodeFont;
    if (it && (it.font || it.unicodeFont || it.fontFamily)) return it.font || it.unicodeFont || it.fontFamily;
    if (_activeFitFont) return _activeFitFont;
    if (measure && measure.font) return measure.font;
    if (typeof globalThis !== 'undefined' && globalThis.__FZ_UNICODE_FONT) return globalThis.__FZ_UNICODE_FONT;
    if (global && global.__FZ_UNICODE_FONT) return global.__FZ_UNICODE_FONT;
    return 'SutonnyOMJ';
  }

  function lineWidthPt(t, it, measure, fontOpt) {
    // চিহ্ন (**মোটা**, *বাঁকা*, ^{উপরে}) মাপে ধরা নয়
    const s = String(t).replace(/\*\*/g, '').replace(/\*([^*\s][^*]*?)\*/g, '$1').replace(/\^\{([^}]*)\}/g, '$1').trim();
    if (!s) return 0;
    const ratio = isFontPickOn() ? getFontWidthRatio(resolveFitFont(it, measure, fontOpt)) : 1;
    return measure(s, !!it.bold) * it.fontPt / 100 * (it.bold ? BOLD : 1) * ratio;
  }

  /** builder-এর pPr-এর মতো একই নিয়মে অনুচ্ছেদের মোট পাশ-ইনডেন্ট (pt) */
  function sideIndent(it) {
    if (it.align === 'c' && it.centerShiftPt != null) return Math.abs(it.centerShiftPt) >= 2 ? 2 * Math.abs(it.centerShiftPt) : 0;
    if (it.align === 'r' && it.rightIndentPt != null) return it.rightIndentPt >= 2 ? it.rightIndentPt : 0;
    return (it.indentPt || 0) + Math.abs(it.firstIndentPt || 0);
  }

  /**
   * a09/a02: ট্যাব-লাইনের পূরণ-সারি — শেষ ট্যাবের পরের অংশ ("\t\tউপজেলা: ------ জেলা: ------", "নাম\t:\t.......")
   * শেষ স্টপ থেকে ঘরের প্রান্ত পর্যন্ত জায়গায় Gemini-র অনুমিত সারি না আঁটলে ছোট করা
   * (নইলে Word দুই লাইনে ভাঙত — a09-এ নিচের ছক ~৮০pt নামত, a02-এ সই-অংশ পাতা উপচাত)।
   */
  function fitTabFills(it, cellW, measure) {
    const stops = it.tabStops || [];
    let cut = 0;
    // a05 (২০২৬-১০-১৩): মাঝের অংশ (পরের স্টপের আগে) পূরণ-সারিসহ না আঁটলে স্টপ পেরিয়ে যেত ⇒ পরের সব অংশ এক স্টপ
    // ডানে সরত, শেষ অংশ Word-এ নতুন লাইনে (+১৫pt, নিচের পট্টি পরের পাতায়)। সেই অংশের পূরণ-সারি স্টপ পর্যন্ত ছোট
    const fitMid = (p, i) => {
      if (!FILL.test(p) || !(stops[i] > 0)) return p;
      const start = i ? stops[i - 1] : (it.indentPt || 0) + Math.max(0, it.firstIndentPt || 0);
      const avail = (stops[i] - start) * SAFE - 2, w = lineWidthPt(p, it, measure);
      if (!(avail > 0) || w <= avail) return p;
      const fixed = lineWidthPt(p.replace(FILL_G, ''), it, measure), fillW = w - fixed;
      if (!(fillW > 0)) return p;
      const k = Math.max(0, (avail - fixed) / fillW);
      cut++;
      return p.replace(FILL_G, (run) => run[0].repeat(Math.max(3, Math.floor(run.length * k))));
    };
    it.tabLines = it.tabLines.map((t0) => {
      const p0 = String(t0).split('\t');
      const t = p0.map((p, i) => (i < p0.length - 1 ? fitMid(p, i) : p)).join('\t');
      const parts = t.split('\t'), last = parts[parts.length - 1], nTab = parts.length - 1;
      if (!FILL.test(last) || (nTab && !(stops[nTab - 1] > 0))) return t;
      const mm = [t, parts.slice(0, -1).map((p) => p + '\t').join(''), last];
      const start = nTab ? stops[nTab - 1] : 0;
      const avail = cellW * SAFE - (it.indentPt || 0) - start;
      const rest = mm[2], w = lineWidthPt(rest, it, measure);
      if (w <= avail) return t;
      const fixed = lineWidthPt(rest.replace(FILL_G, ''), it, measure), fillW = w - fixed;
      if (!(fillW > 0)) return t;
      const k = Math.max(0, (avail - fixed) / fillW);
      cut++;
      return mm[1] + rest.replace(FILL_G, (run) => run[0].repeat(Math.max(3, Math.floor(run.length * k))));
    });
    // a12 (২০২৬-১০-১২): পূরণ-সারি নয় এমন লম্বা লেখা (শেষ ট্যাবের পরে) না আঁটলে Word লাইন ভাঙত ⇒ +১৫pt, নিচের সব নামত।
    // পুরো অংশের ফন্ট সামান্য ছোট (≥৮৫%); লাইন-উচ্চতা আগের মতো (lineSpacingPt) — অবস্থান বদলায় না
    let ratio = 1;
    it.tabLines.forEach((t) => {
      const parts = String(t).split('\t'), nTab = parts.length - 1;
      if (nTab && !(stops[nTab - 1] > 0)) return;
      const avail = cellW * SAFE - (it.indentPt || 0) - (nTab ? stops[nTab - 1] : 0);
      const w = lineWidthPt(parts[nTab], it, measure);
      if (avail > 20 && w > avail) ratio = Math.max(ratio, w / avail);
    });
    let fontFrom = null;
    if (ratio > 1) {
      fontFrom = it.fontPt;
      const lh = Math.max(it.fontPt * 1.15, it.lineSpacingPt || 0);
      it.fontPt = Math.max(1, Math.floor(it.fontPt * Math.max(MIN_SCALE, 1 / ratio) * 2) / 2);
      it.lineSpacingPt = lh;
    }
    if (!cut && !fontFrom) return null;
    it.fit = Object.assign({ fillsCut: cut, tab: true }, fontFrom ? { fontFrom } : {});
    return it.fit;
  }

  /**
   * a03 (২০২৬-১০-১২): টেবিলের ঘর — মূলে এক-লাইনের সারির লেখা আমাদের ফন্টে ঘরে না আঁটলে Word লাইন ভাঙত (সারি +১৫pt,
   * নিচের সব নামত)। ডানের ফাঁকা ঘর জোড়া হয় (builder rowSpans) ধরে প্রাপ্য প্রস্থ; পুরো টেবিলের ফন্ট সামান্য ছোট (≥৮৫%)।
   * মূলে সারি বহু-লাইনের (সারি-উচ্চতা ≥ ফন্টের ২.২ গুণ) হলে সেই সারি বাদ।
   */
  function fitTable(it, measure) {
    const rows = it.rows || [], fr = it.colFractions, wPt = it.widthPt || (it.rect && it.rect.w) || 0;
    if (!rows.length || !it.fontPt || !(wPt > 0)) return null;
    const nCols = Math.max(...rows.map((r) => r.length));
    const colW = (k) => wPt * (fr && fr.length === nCols ? fr[k] : 1 / nCols);
    const rbh = it.rowHeightsPt, rbt = rbh && rbh.length === rows.length ? rbh.reduce((a, b) => a + b, 0) : 0;
    const rh = rows.map((r, ri) => (rbt > 0 ? rbh[ri] * (it.heightPt || 0) / rbt : (it.heightPt || 0) / rows.length));
    let ratio = 1;
    // a19 (২০২৬-১০-১৩): বহু-লাইনের সারিতেও '\n'-ঘর (মূলের মুদ্রিত লাইন, foldSerialRows) — প্রতিটি লাইন ঘরে আঁটা চাই
    // (নইলে Word প্রতি লাইন মুড়ে ছক +৬০pt, পাতা উপচাত)। পূরণ-সারির লাইন ("নাম : ……") ⇒ ফন্ট নয়, বিন্দু ছোট
    rows.forEach((r, ri) => {
      const tall = rh[ri] >= it.fontPt * 2.2;
      for (let k = 0; k < r.length; k++) {
        const t = r[k] == null ? '' : String(r[k]);
        if (!t.trim() || t.startsWith('\u0001') || /\$/.test(t)) continue;
        // a18 (২০২৬-১০-১৪): উঁচু সারিতেও পূরণ-রেখা ঘরে আঁটানো ("নম্বর ------" ৬০ ড্যাশ সরু ঘরে ৩ লাইনে মুড়ত); ফন্ট-অনুপাতে গোনা নয়
        const fillOnly = tall && !t.includes('\n');
        // মাপা: a18 ছবি −৩.৩ ⇒ ডিফল্টে বন্ধ (FZ_ON=TALLFILL)
        if (fillOnly && (!globalThis.__FZ_ON_TALLFILL || !FILL.test(t))) continue;
        let w = colW(k);
        const fv = it.fullVRule && it.fullVRule.length === nCols - 1 ? it.fullVRule : null;   // builder rowSpans-এর মতো
        const vrb = it.vRuleBands && it.vRuleBands[ri] ? it.vRuleBands[ri] : null;
        for (let j = k + 1; j < nCols && !(r[j] && String(r[j]).trim()) && !(vrb ? vrb[j - 1] : (fv && fv[j - 1])); j++) w += colW(j);
        // গ্রিড-প্রথম ছকে (যেমন a18 সারি ২৭: কলাম ২-এ লেখা, বাঁয়ে কলাম ১ ফাঁকা এবং মাঝের খাড়া দাগ অনুপস্থিত) বাঁয়ের খোলা প্রস্থও প্রাপ্য
        if (vrb) {
          for (let j = k - 1; j >= 0 && !(r[j] && String(r[j]).trim()) && vrb[j] === false; j--) w += colW(j);
        }
        const padPt = it.gridFirst && w < 70 ? (w < 25 ? 0 : 1.4) : 5.4;
        const avail = (w - 2 * padPt) * SAFE;
        if (!(avail > 20)) continue;
        const lines = t.split('\n').map((ln) => {
          const lw = lineWidthPt(ln, it, measure);
          if (lw <= avail || !FILL.test(ln)) return ln;
          const fixed = lineWidthPt(ln.replace(FILL_G, ''), it, measure), fillW = lw - fixed;
          if (!(fillW > 0) || fixed > avail) return ln;
          return ln.replace(FILL_G, (run) => run[0].repeat(Math.max(3, Math.floor(run.length * (avail - fixed) / fillW))));
        });
        if (lines.join('\n') !== t) r[k] = lines.join('\n');
        if (fillOnly) continue;
        const need = Math.max(...lines.map((ln) => (FILL.test(ln) ? 0 : lineWidthPt(ln, it, measure))));
        if (need > avail) ratio = Math.max(ratio, need / avail);
      }
    });
    if (ratio <= 1) return null;
    const fontFrom = it.fontPt;
    it.fontPt = Math.max(1, Math.floor(it.fontPt * Math.max(MIN_SCALE, 1 / ratio) * 2) / 2);
    if (it.fontPt === fontFrom) return null;
    it.fit = { fontFrom, table: true };
    return it.fit;
  }

  /** একটি অংশ আঁটানো; বদল হলে { needPt, availPt, fontFrom } ফেরত, নইলে null */
  function fitItem(it, cellW, measure) {
    if (it && it.kind === 'para' && it.tabLines && it.fontPt && cellW > 0) return fitTabFills(it, cellW, measure);
    if (!it || it.kind !== 'para' || it.tabLines || !it.fontPt || !(cellW > 0)) return null;
    const L = it.lines || [];
    if (!L.length || (L.length > 1 && !it.keepLines)) return null;     // প্রবাহিত অনুচ্ছেদ Word নিজে ভাঙে
    if (/\$/.test(L.join(''))) return null;                              // সমীকরণ মাপা যায় না
    if (L.every((l) => /^([─━═=_\-.…·])\1{5,}$/.test(String(l).replace(/\s+/g, '')))) return null;   // রেখা-লাইন: builder-এর leader-ট্যাব
    const full = cellW * SAFE;
    const availPt = full - sideIndent(it);
    const fontFrom = it.fontPt;
    // ০) পূরণ-সারি ("নাম: ........") — Gemini-র গোনা সংখ্যা অনুমান, ফাঁকা জায়গা ⇒ আগে সেটিই ছোট (লেখা/ফন্ট নয়)
    let fillsCut = 0;
    L.forEach((t, i) => {
      const w = lineWidthPt(t, it, measure);
      if (w <= availPt || !FILL.test(t)) return;
      const fixed = lineWidthPt(t.replace(FILL_G, ''), it, measure);
      const fillW = w - fixed;
      if (!(fillW > 0)) return;
      const k = Math.max(0, (availPt - fixed) / fillW);
      L[i] = t.replace(FILL_G, (run) => run[0].repeat(Math.max(3, Math.floor(run.length * k))));
      fillsCut++;
    });
    const need = Math.max(...L.map((t) => lineWidthPt(t, it, measure)));
    if (!(need > 0)) return null;
    // a17 (২০২৬-১০-১৩): এক-লাইনের শিরোনাম মাপা মূল-প্রস্থের চেয়ে অনেক সরু (৫৪২ ⇒ ৪১১pt) — কালি-অনুমানে ফন্ট ছোট।
    // আমাদের ফন্টে মাপা প্রস্থ মূলের ৯০%-এর কম ⇒ ফন্ট বাড়িয়ে মূল-প্রস্থে (সর্বোচ্চ +৩০%, ঘরের প্রাপ্য প্রস্থ পর্যন্ত)
    const origW = it.rect && it.rect.w > 0 ? it.rect.w : 0;
    if (!global.__FZ_OFF_GROW && L.length === 1 && /^(title|heading|header)$/.test(it.type || '') && !fillsCut && !FILL.test(L[0]) &&
        origW && need < origW * 0.9 && need > 0) {
      const scale = Math.min(1.3, origW / need, availPt / need);
      const f = Math.floor(it.fontPt * scale * 2) / 2;
      if (f > it.fontPt) {
        it.fontPt = f;
        it.fit = { needPt: Math.round(need * 10) / 10, availPt: Math.round(availPt * 10) / 10, fontFrom, grow: true };
        return it.fit;
      }
    }
    if (need <= availPt) {
      if (!fillsCut) return null;
      it.fit = { needPt: Math.round(need * 10) / 10, availPt: Math.round(availPt * 10) / 10, fontFrom, fillsCut };
      return it.fit;
    }
    const room = Math.max(0, full - need);
    // ১) ইনডেন্ট কমানো (দিক অপরিবর্তিত)
    if (it.align === 'c' && it.centerShiftPt != null) it.centerShiftPt = Math.sign(it.centerShiftPt) * Math.min(Math.abs(it.centerShiftPt), room / 2);
    else if (it.align === 'r' && it.rightIndentPt != null) it.rightIndentPt = Math.min(it.rightIndentPt, room);
    else {
      const fi = Math.abs(it.firstIndentPt || 0);
      if (fi > room) it.firstIndentPt = 0;
      it.indentPt = Math.max(0, Math.min(it.indentPt || 0, room - Math.abs(it.firstIndentPt || 0)));
    }
    // ২) পুরো প্রস্থেও না আঁটলে ফন্ট ছোট
    if (need > full) {
      const scale = Math.max(MIN_SCALE, full / need);
      it.fontPt = Math.max(1, Math.floor(it.fontPt * scale * 2) / 2);
    }
    it.fit = { needPt: Math.round(need * 10) / 10, availPt: Math.round(availPt * 10) / 10, fontFrom, fillsCut };
    return it.fit;
  }

  /** পুরো নকশা; ফেরত: বদলানো অংশের সংখ্যা */
  function fit(ir, measure, opts) {
    if (!ir || !ir.pages || typeof measure !== 'function') return 0;
    const prevFont = _activeFitFont;
    if (isFontPickOn()) {
      _activeFitFont = (typeof opts === 'string' && opts) || (opts && (opts.font || opts.unicodeFont)) || ir.font || ir.unicodeFont || _activeFitFont;
      // ফন্ট বদলে পুনরায় fit চালালে আগের fontFrom থেকে নতুন অনুপাতে হিসাব করা
      if (opts && (typeof opts === 'string' || opts.font || opts.unicodeFont || opts.resetFont)) {
        for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
          for (const it of cell.items || []) if (it && it.fit && it.fit.fontFrom) { it.fontPt = it.fit.fontFrom; delete it.fit; }
        }
      }
    }
    let n = 0;
    try {
    for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
      const cellW = (cell.x1 || 0) - (cell.x0 || 0);
      for (const it of cell.items || []) {
        if (it && it.kind === 'table' ? fitTable(it, measure) : fitItem(it, cellW, measure)) n++;
      }
    }
    // বহু-পাতার চেকলিস্ট ছকে (≥৪ কলাম, যেমন a16) fitTable-এর পর ফন্টের সমতা রক্ষা; ২-কলামের ছোট ছকে (a03) নয় (FZ_OFF=TSYNC30)
    if (!globalThis.__FZ_OFF_TSYNC30) {
      const allT = [];
      for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
        for (const it of cell.items || []) if (it && it.kind === 'table' && it.fontPt && it.colFractions && it.colFractions.length >= 4) allT.push(it);
      }
      const used = new Set();
      for (const t of allT) {
        if (used.has(t)) continue;
        const h0 = (t.rows && t.rows[0] || []).join('|');
        const grp = allT.filter((o) => !used.has(o) && o.colFractions.length === t.colFractions.length &&
          (o.colFractions.every((f, k) => Math.abs(f - t.colFractions[k]) <= 0.12) || (h0.length >= 10 && ((o.rows && o.rows[0] || []).join('|') === h0))));
        grp.forEach((o) => used.add(o));
        if (grp.length < 3) continue;
        const fs = grp.map((o) => o.fontPt).sort((a, b) => a - b);
        const target = fs[Math.floor(fs.length * 0.3)];
        grp.forEach((o) => { if (Math.abs(o.fontPt - target) <= target * 0.3) o.fontPt = target; });
      }
      if (globalThis.__FZ_ON_FORMFIX && !globalThis.__FZ_OFF_FORMFIX) {
        const noVT = [];
        for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
          for (const it of cell.items || []) if (it && it.kind === "table" && it.noVRules && it.rows && it.rows.length >= 10) noVT.push(it);
        }
        if (noVT.length >= 2) {
          const maxF = Math.max(...noVT.map((t) => t.fontPt || 10));
          noVT.forEach((t) => { if (t.fontPt < maxF) t.fontPt = maxF; });
        }
      }
    }
    return n;
    } finally {
      _activeFitFont = prevFont;
    }
  }

  const FayzarLineFit = { fit, fitItem, fitTable, sideIndent, lineWidthPt, FONT_WIDTH_RATIOS, getFontWidthRatio, isFontPickOn };
  global.FayzarLineFit = FayzarLineFit;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarLineFit;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));