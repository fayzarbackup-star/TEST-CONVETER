/**
 * Fayzar — গ্রিড-প্রথম ছক ইঞ্জিন (FayzarGridFirst)
 * =================================================
 * কাজ ৬ (ধাপ খ, ২০২৬-১০-১৫): সীমানাওয়ালা ছকে (m.hasGrid === true) প্রথমে পাতার মাপা আড়াআড়ি ও খাড়া দাগ
 * (hRulesPt × vRulesPt / boxes) থেকে গ্রিড (R ব্যান্ড × C কলাম) তৈরি এবং পরে Gemini-র লেখা সেই গ্রিডের ঘরে বসানো।
 *
 * - ডিফল্টে বন্ধ; চালু হবে শুধু FZ_ON=GRIDFIRST (globalThis.__FZ_ON_GRIDFIRST) দিয়ে।
 * - চলে শুধু m.hasGrid আর পূর্ণ দাগওয়ালা ছকে। দাগ ভাঙা/অসম্পূর্ণ হলে বা Gemini-র ঘর-সংখ্যা না মিললে null ফেরত দেয়
 *   (তখন layout-ir.js পুরোনো পথে ফিরে যায়)।
 * - প্রথম পাইলট: a18 (ছুটির ফরম — আংশিক খাড়া দাগ cov=0.32 ও cellBoxV থেকে সঠিক কলাম/জোড়া-ঘর নির্ধারণ),
 *   এরপর a16 (চেকলিস্ট), a17 (ফরম-ছক) ও a02 (পরিবার-ছক)।
 */
(function (global) {
  'use strict';

  const SERIAL = /^\(?[০-৯0-9]{1,2}\s*[।.)]?$/;
  const SUBSER = /^[(\s]*([ক-হ]|[a-z]|[ivx]+)[)।.)]\s/i;
  const BOX_MARK = '\u0001box:';
  const FILL_RE = /([._\-…·─])\1{5,}/g;

  const median = (a) => {
    if (!a.length) return 0;
    const s = a.slice().sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  };

  /** বাংলা কার/চিহ্ন বাদে মূল অক্ষরের সংখ্যা */
  function baseLen(s) {
    return String(s || '').replace(/\*\*|\^\{|\}|<\/?u>/gi, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
  }

  /** আনুমানিক মোড়ানো লাইন-সংখ্যা */
  function estLines(txt, fs, cwPt) {
    const w = Math.max(20, cwPt);
    return String(txt || '').split('\n').reduce((a, ln) => {
      const clean = ln.replace(/[ঁ-ঃ়া-্ৗ]/g, '').replace(FILL_RE, (s) => s.slice(0, 6));
      return a + (Math.ceil(clean.length * (fs || 11) * 0.45 / w) || 1);
    }, 0);
  }

  /** প্রাপ্য প্রস্থে (availPt) পূরণ-রেখা (------ বা ......) এক লাইনে আঁটাতে ছাঁটা */
  function trimFillToWidth(txt, fs, availPt) {
    const s = String(txt || '');
    if (!FILL_RE.test(s)) return s;
    FILL_RE.lastIndex = 0;
    const charW = (fs || 11.5) * 0.48;
    const fixedLen = baseLen(s.replace(FILL_RE, ''));
    const fixedW = fixedLen * charW;
    const remW = Math.max(18, availPt - fixedW - 8);
    const maxFillChars = Math.max(6, Math.floor(remW / (charW * 0.85)));
    return s.replace(FILL_RE, (run) => run[0].repeat(Math.min(run.length, maxFillChars)));
  }

  /**
   * মাপা আড়াআড়ি ও খাড়া দাগ থেকে গ্রিড (H × V) উদ্ধার।
   * দাগ অসম্পূর্ণ হলে বা কলাম-সংখ্যা nCols-এর সাথে না মিললে null ফেরত দেয়।
   */
  function extractGrid(rows, nCols, m, pageInfo) {
    if (!m || m.empty || !m.hasGrid || !m.rectPt) return null;
    if (!Array.isArray(m.hRulesPt) || m.hRulesPt.length < 2 || nCols < 2) return null;
    // সংখ্যা-বাক্সের ভাঁজ-করা ছক (f1) গ্রিড-প্রথম পথের বাইরে
    if (rows.some((r) => r.some((c) => typeof c === 'string' && c.startsWith(BOX_MARK)))) return null;

    const R = m.rectPt;
    const H = [];
    m.hRulesPt.slice().sort((a, b) => a - b).forEach((y) => {
      if (!H.length || y - H[H.length - 1] > 3) H.push(y);
    });
    if (H.length < 2) return null;

    // হালকা রেখার ফরম (যেমন f1: ২৮ সারি অথচ রেখা-ভাগ ৪টি, খাড়া দাগ ০টি) ⇒ অসম্পূর্ণ জাল, পুরোনো পথে ফেরা
    const nonEmptyRows = rows.filter((r) => r.some((c) => c && String(c).trim())).length;
    if (rows.length >= 6 && H.length - 1 < nonEmptyRows * 0.18) return null;

    // পূরণের কলাম (হ্যাঁ/না/মন্তব্য — a16 চেকলিস্ট) শনাক্তকরণ
    const isFillCol = (j) => rows.length >= 4 && rows.slice(0, 2).some((r) => r[j] && String(r[j]).trim())
      && rows.slice(2).every((r) => !(r[j] && String(r[j]).trim()));
    const hasBodyCol = rows.length >= 4 && Array.from({ length: Math.max(0, nCols - 1) }, (_, k) => k + 1)
      .some((j) => rows.slice(2).filter((r) => r[j] && String(r[j]).trim()).length >= (rows.length - 2) * 0.5);
    const hasFillCols = nCols >= 4 && hasBodyCol && Array.from({ length: nCols }, (_, j) => isFillCol(j)).filter(Boolean).length >= 2;

    const vRules = Array.isArray(m.vRulesPt) ? m.vRulesPt : [];
    const in0 = vRules.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6);
    const rOuter = hasFillCols ? vRules.filter((v) => v.cov >= 0.4 && Math.abs(v.x - (R.x + R.w)) <= 6).sort((a, b) => b.cov - a.cov)[0] : null;
    const rx1 = rOuter ? rOuter.x : R.x + R.w;

    // ১) খাড়া দাগ থেকে কলাম-সীমা: পূর্ণ (≥০.৯), অর্ধেক (≥০.৫), পূরণের কলাম (≥০.৪), বা আংশিক-উচ্চতার ছক (≥০.২৮, যেমন a18 cov=0.32)
    const full = in0.filter((v) => v.cov >= 0.9);
    const half = in0.filter((v) => v.cov >= 0.5);
    const f40 = hasFillCols ? in0.filter((v) => v.cov >= 0.4) : [];
    const part = in0.filter((v) => v.cov >= 0.28);

    let innerRules = null;
    if (full.length === nCols - 1) innerRules = full;
    else if (half.length === nCols - 1) innerRules = half;
    else if (f40.length === nCols - 1) innerRules = f40;
    else if (part.length === nCols - 1) innerRules = part;

    let edges = null;
    let covs = null;

    if (innerRules && innerRules.length === nCols - 1) {
      const sorted = innerRules.slice().sort((a, b) => a.x - b.x);
      edges = [R.x, ...sorted.map((v) => v.x), rx1];
      covs = sorted.map((v) => v.cov);
    } else if (hasFillCols && Array.isArray(m.colGuttersPt) && m.colGuttersPt.length === nCols - 1) {
      // a16 p6/p8/p9: একটি খাড়া দাগ হালকা হলে colGuttersPt-কে মাপা খাড়া দাগে স্ন্যাপ করা
      const guts = m.colGuttersPt.slice();
      const vr = in0.filter((v) => v.cov >= 0.4);
      for (let k = 0; k < guts.length; k++) {
        if (!isFillCol(k + 1) && !isFillCol(k)) continue;
        const hit = vr.find((v) => Math.abs(v.x - guts[k]) <= 12);
        if (hit) guts[k] = hit.x;
      }
      edges = [R.x, ...guts, rx1];
      covs = guts.map((gx) => {
        const hit = vr.find((v) => Math.abs(v.x - gx) <= 8);
        return hit ? hit.cov : 0.85;
      });
    } else if (m.headShade && pageInfo && Array.isArray(pageInfo.boxes) && pageInfo.boxes.length >= 3) {
      // a02 পরিবার-ছক: ধূসর শিরোনাম-সারিতে vRulesPt গলে গেলে পাতার মাপা ঘর-বাক্স (pageInfo.boxes) থেকে কলাম-সীমা উদ্ধার
      const cbs = pageInfo.boxes.filter((bx) => !bx.dashed && bx.x0 >= R.x - 4 && bx.x1 <= R.x + R.w + 4 && bx.y0 >= R.y - 4 && bx.y1 <= R.y + R.h + 4 && (bx.y1 - bx.y0) >= R.h * 0.8 && (bx.x1 - bx.x0) < R.w * 0.9);
      const xs = [R.x, ...cbs.map((bx) => bx.x0), ...cbs.map((bx) => bx.x1), R.x + R.w].sort((a, b) => a - b);
      const u = [];
      xs.forEach((x) => { if (!u.length || x - u[u.length - 1] > 8) u.push(x); });
      if (u.length === nCols + 1) {
        edges = u;
        covs = u.slice(1, -1).map(() => 0.99);
      }
    }

    if (!edges || edges.length !== nCols + 1) return null;
    const totalW = edges[edges.length - 1] - edges[0];
    if (!(totalW > 20)) return null;
    let colFractions = edges.slice(1).map((e, k) => (e - edges[k]) / totalW);
    if (colFractions.some((f) => f < 0.02)) return null;

    // a02 পরিবার-ছক: শিরোনামের এক-শব্দের/ছোট কলাম ("ক্রমিক নং", "সম্পর্ক (টিক দিন)") যাতে ২৮pt/৪৭pt ঘরে ৩ লাইনে না ভাঙে সেজন্য চওড়া কলাম থেকে সামান্য প্রস্থ ধার নেওয়া
    if (m.headShade && rows.length >= 2 && rows[0].length === nCols) {
      const fs0 = m.cellInkPt || 10;
      const minW = rows[0].map((c, k) => {
        const words = String(c || '').replace(/\*\*/g, '').trim().split(/\s+/).filter(Boolean);
        const maxWord = words.length ? Math.max(...words.map((w) => baseLen(w))) : 0;
        const maxBodyLine = rows.slice(1).reduce((mx, r) => {
          const lns = String(r[k] || '').trim().split('\n');
          return Math.max(mx, ...lns.map((ln) => baseLen(ln)));
        }, 0);
        return Math.max(maxWord * fs0 * 0.72 + 15, maxBodyLine > 0 && maxBodyLine <= 10 ? maxBodyLine * fs0 * 0.65 + 15 : 0);
      });
      const widest = colFractions.indexOf(Math.max(...colFractions));
      minW.forEach((mw, k) => {
        const curW = colFractions[k] * totalW;
        if (k !== widest && mw > curW && mw <= 65 && (colFractions[widest] * totalW - (mw - curW)) >= totalW * 0.25) {
          const addF = (mw - curW) / totalW;
          colFractions[k] += addF;
          colFractions[widest] -= addF;
        }
      });
    }

    // প্রতিটি অভ্যন্তরীণ খাড়া দাগ কোন ব্যান্ড পর্যন্ত বিস্তৃত (vRuleBands):
    // cov >= 0.70 হলে পুরো ছক জুড়ে (nBands - 1); আর আংশিক হলে (যেমন a18-এ cov=0.32, যা ঠিক ৩য় ব্যান্ড H[3]=278.9 পর্যন্ত বিস্তৃত) সেই ব্যান্ড পর্যন্ত
    const nBands = H.length - 1;
    const hSpan = Math.max(1, H[nBands] - H[0]);
    const vRuleBands = covs.map((cov) => {
      if (cov >= 0.70 || hasFillCols) return nBands - 1;
      let lastB = 0;
      for (let b = 0; b < nBands; b++) {
        const cum = (H[b + 1] - H[0]) / hSpan;
        if (cum <= cov + 0.08) lastB = b;
      }
      return lastB;
    });

    return { H, edges, totalW, colFractions, covs, vRuleBands, hasFillCols, nBands };
  }

  /**
   * আংশিক খাড়া দাগওয়ালা বহু-ব্যান্ড ছকে (যেমন a18: ওপরে ৪ কলামের দাগ, নিচে বাম ৩ কলাম খোলা)
   * মাপা cellBoxV ও গ্রিড-দেয়াল অনুযায়ী প্রতিটি সারির ঘর-বণ্টন ও জোড়া-ঘর (gridSpans) নির্ধারণ।
   */
  function refinePartialGridRows(rows, rowBand, grid, m, fs) {
    const { nBands, vRuleBands, colFractions, totalW } = grid;
    const nCols = colFractions.length;
    if (!rowBand || rowBand.length !== rows.length) return null;
    if (!vRuleBands.some((b) => b < nBands - 1)) return null;

    const cbRows = m && m.cellBoxV && Array.isArray(m.cellBoxV.rows) && m.cellBoxV.edgesPt && m.cellBoxV.edgesPt.length === nCols + 1
      ? m.cellBoxV.rows : null;
    const nonEmptyIndices = rows.map((r, i) => (r.some((c) => c && String(c).trim()) ? i : -1)).filter((i) => i >= 0);
    const lineMatch = cbRows && cbRows.length === nonEmptyIndices.length;

    const newRows = rows.map((r) => r.slice());
    const gridSpans = rows.map(() => null);
    const cellAlignOverrides = rows.map(() => null);

    // কোনো ব্যান্ড b-তে কলাম c থেকে ডানে কতদূর পর্যন্ত খাড়া দাগ নেই
    const openGroupEnd = (b, c0) => {
      let c = c0;
      while (c < nCols - 1 && b > vRuleBands[c]) c++;
      return c;
    };

    let neCursor = 0;
    for (let ri = 0; ri < newRows.length; ri++) {
      const r = newRows[ri];
      const b = rowBand[ri];
      const isEmpty = !r.some((c) => c && String(c).trim());
      const cb = !isEmpty && lineMatch ? cbRows[neCursor++] : null;

      // এই সারির ব্যান্ডে সব খাড়া দাগ উপস্থিত থাকলে পরিবর্তন নেই
      if (vRuleBands.every((vb) => b <= vb)) continue;

      const sp = new Array(nCols).fill(1);
      // খোলা অঞ্চল [0 .. gEnd] (a18-এ ব্যান্ড ৩ ও ৪-এ কলাম ০, ১, ২-এর মাঝের দাগ নেই ⇒ gEnd = 2)
      const gEnd = openGroupEnd(b, 0);
      if (gEnd === 0) continue;

      const openCells = [];
      for (let c = 0; c <= gEnd; c++) {
        if (r[c] && String(r[c]).trim()) openCells.push({ c, txt: String(r[c]).trim() });
      }

      if (openCells.length === 0) {
        // খোলা অঞ্চলে কোনো লেখা নেই ⇒ পুরো খোলা অঞ্চলটি একটি জোড়া-ঘর (যাতে মাঝখানে ভুয়া খাড়া দাগ না পড়ে)
        sp[0] = gEnd + 1;
        for (let c = 1; c <= gEnd; c++) sp[c] = 0;
        gridSpans[ri] = sp;
        continue;
      }

      if (openCells.length === 1) {
        const { c: origC, txt } = openCells[0];
        // মাপা কালি-বাক্স (cb) থেকে দেখা লেখাটি আসলে কোন কোন কলামে আছে
        const inkedCols = cb ? cb.slice(0, gEnd + 1).map((bx, idx) => (bx ? idx : -1)).filter((idx) => idx >= 0) : [];

        if (inkedCols.length === 1 && inkedCols[0] !== origC) {
          // উদাহরণ: a18 সারি ২৭ ("প্রধান হিসাবরক্ষণ কর্মকর্তা") — Gemini কলাম ১-এ দিয়েছে, কিন্তু মাপা কালি পুরোপুরি কলাম ২-এ!
          const targetC = inkedCols[0];
          r[origC] = '';
          r[targetC] = txt;
          cellAlignOverrides[ri] = new Array(nCols).fill(null);
          cellAlignOverrides[ri][targetC] = 'c';
        } else if (inkedCols.length === 2 && inkedCols[0] > 0 && inkedCols[1] === inkedCols[0] + 1) {
          // উদাহরণ: a18 সারি ২৪ ("সমীপে দাখিল করা হইল।") — কালি কলাম ১ ও ২ জুড়ে (x=261.6..359.5)
          const c0 = inkedCols[0];
          if (origC !== c0) { r[origC] = ''; r[c0] = txt; }
          sp[c0] = 2;
          sp[c0 + 1] = 0;
          cellAlignOverrides[ri] = new Array(nCols).fill(null);
          cellAlignOverrides[ri][c0] = 'c';
        } else if (origC === 0) {
          // বাম প্রান্ত থেকে শুরু হওয়া একক ঘর (যেমন "বিঃদ্রঃ...", "হইবে।", "প্রধান হিসাব রক্ষণ...", "তারিখঃ---") ⇒ পুরো খোলা অঞ্চল জুড়ে (gridSpan = gEnd + 1)
          const spanW = colFractions.slice(0, gEnd + 1).reduce((a, f) => a + f, 0) * totalW - 10.8;
          r[0] = trimFillToWidth(txt, fs, spanW);
          sp[0] = gEnd + 1;
          for (let c = 1; c <= gEnd; c++) sp[c] = 0;
        }
        gridSpans[ri] = sp;
        continue;
      }

      if (openCells.length === 2 && gEnd === 2) {
        // খোলা ৩ কলামে ২টি লেখা-ঘর (যেমন a18 সারি ১১: "তারিখঃ ---" | "" | "আবেদন কারীর স্বাক্ষর", এবং সারি ১৫: "নম্বর ----" | "তারিখ----" | "")
        const first = openCells[0], second = openCells[1];
        // ডানের ঘরটিকে কলাম ২-এ রেখে বামের ঘরটিকে কলাম ০+১ জুড়ে (gridSpan=2) দেওয়া যাতে লম্বা পূরণ-রেখা ৪ লাইনে না ভাঙে
        r[0] = first.txt;
        r[1] = '';
        r[2] = second.txt;
        sp[0] = 2;
        sp[1] = 0;
        sp[2] = 1;
        const span01W = (colFractions[0] + colFractions[1]) * totalW - 10.8;
        const col2W = colFractions[2] * totalW - 10.8;
        r[0] = trimFillToWidth(r[0], fs, span01W);
        r[2] = trimFillToWidth(r[2], fs, col2W);
        gridSpans[ri] = sp;
      }
    }

    return { rows: newRows, gridSpans, cellAlignOverrides };
  }

  /**
   * গ্রিড-প্রথম ছকের প্রধান এন্ট্রি-পয়েন্ট (layout-ir.js toItem থেকে ডাকা হয়)।
   * সফল হলে গ্রিড-মাপ ও সংশোধিত ঘর-বণ্টন ফেরত দেয়; শর্ত না মিললে null ফেরত দেয়।
   */
  function applyGridFirst(tbl, m, pageInfo) {
    if (!globalThis.__FZ_ON_GRIDFIRST || globalThis.__FZ_OFF_GRIDFIRST) return null;
    if (!tbl || tbl.kind !== 'table' || !Array.isArray(tbl.rows) || !tbl.rows.length) return null;
    const rows = tbl.rows;
    const nCols = Math.max(...rows.map((r) => r.length));
    const grid = extractGrid(rows, nCols, m, pageInfo);
    if (!grid) return null;

    const { colFractions, vRuleBands, hasFillCols, nBands, totalW } = grid;
    const fullVRule = grid.covs.map((cov) => cov >= (hasFillCols ? 0.4 : 0.75));

    tbl.colFractions = colFractions;
    tbl.fullVRule = fullVRule.some(Boolean) ? fullVRule : null;
    if (hasFillCols) tbl.fillW2 = true;
    tbl.gridFirst = true;

    if (vRuleBands.some((b) => b < nBands - 1) && Array.isArray(tbl.rowBand) && tbl.rowBand.length === rows.length) {
      const ref = refinePartialGridRows(rows, tbl.rowBand, grid, m, tbl.cellFontSrc || 11.5);
      if (ref) {
        tbl.rows = ref.rows;
        tbl.gridSpans = ref.gridSpans;
        tbl.vRuleBands = tbl.rowBand.map((b) => vRuleBands.map((lastB) => b <= lastB));
        if (ref.cellAlignOverrides && ref.cellAlignOverrides.some(Boolean)) {
          if (!tbl.cellAligns) tbl.cellAligns = tbl.rows.map(() => null);
          ref.cellAlignOverrides.forEach((ov, ri) => {
            if (!ov) return;
            tbl.cellAligns[ri] = (tbl.cellAligns[ri] || new Array(nCols).fill(null)).map((cur, c) => ov[c] || cur);
          });
        }
      }
    }
    return grid;
  }

  const FayzarGridFirst = { applyGridFirst, extractGrid, refinePartialGridRows, trimFillToWidth };
  global.FayzarGridFirst = FayzarGridFirst;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarGridFirst;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
