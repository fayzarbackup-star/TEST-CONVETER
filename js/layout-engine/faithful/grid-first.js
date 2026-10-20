/**
 * Fayzar — গ্রিড-প্রথম ছক ইঞ্জিন (FayzarGridFirst)
 * =================================================
 * কাজ ৬ (ধাপ ৪, ২০২৬-১০-১৫): সীমানাওয়ালা ছকে (m.hasGrid === true) প্রথমে পাতার মাপা আড়াআড়ি ও খাড়া দাগ
 * (hRulesPt × vRulesPt / boxes) থেকে গ্রিড (R ব্যান্ড × C কলাম) তৈরি এবং পরে Gemini-র লেখা সেই গ্রিডের ঘরে
 * আসল ঘর-জোড়া (gridSpan ও vMerge) ব্যবহার করে বসানো।
 *
 * - ডিফল্টে বন্ধ; চালু হবে শুধু FZ_ON=GRIDFIRST (globalThis.__FZ_ON_GRIDFIRST) দিয়ে।
 * - চলে শুধু m.hasGrid আর পূর্ণ দাগওয়ালা ছকে। দাগ ভাঙা/অসম্পূর্ণ হলে বা Gemini-র ঘর-সংখ্যা না মিললে null ফেরত দেয়
 *   (তখন layout-ir.js পুরোনো পথে ফিরে যায়)।
 * - কভার করে:
 *   ১) a18 (ছুটির ফরম): আংশিক খাড়া দাগ (cov=0.32) ও cellBoxV থেকে gridSpan + হেডার ও ফাঁকা কলাম-ব্যান্ডে vMerge।
 *   ২) a16 (চেকলিস্ট, পাতা ৩–৯): বাইরের হালকা খাড়া দাগ (lOuter/rOuter) থেকে সঠিক প্রস্থ উদ্ধার ("মন্তব্য" ৩৯.৫pt) এবং
 *      উপ-ক্রমিক (ক, খ, গ...) সারিতে ক্রমিক নং কলামে (কলাম ০) আসল vMerge।
 *   ৩) a03 (পেনশন ফরম, পাতা ১ ও ২ জন্ম-তারিখ ছক): পূর্ণ (cov=1) ও অর্ধ-উচ্চতার (cov=0.51) খাড়া দাগ থেকে শিরোনাম-সারিতে
 *      দিন (gridSpan=2) | মাস (gridSpan=2) | বছর (gridSpan=4) আসল ঘর-জোড়া।
 *   ৪) a02 (পরিবার-ছক): ধূসর শিরোনামে pageInfo.boxes থেকে ৫ কলামের আসল প্রস্থ ও পূর্ণ খাড়া দাগ রক্ষা।
 */
(function (global) {
  'use strict';
  // [প্যাক-১১ গেট-ফাংশন] GRIDFIRST, FORMFIX, PLEADER ডিফল্ট-চালু; যেকোনো সুইচ বা নিয়ম window.__FZ_OFF_<নাম> (FZ_OFF=<নাম>) দিয়ে বন্ধযোগ্য।
  const fzOn = (k) => !(typeof globalThis !== 'undefined' ? globalThis['__FZ_OFF_' + k] : global['__FZ_OFF_' + k]);
  // TABLE_MERGE_v1 সুইচ: শুধু __FZ_ON_TBLMERGE বা FZ_ON=TBLMERGE সত্য হলে সক্রিয় (বন্ধ: __FZ_OFF_TBLMERGE)
  const tblMergeOn = () => !(
    (typeof globalThis !== "undefined" && (globalThis.__FZ_OFF_TBLMERGE || (globalThis.window && globalThis.window.__FZ_OFF_TBLMERGE))) ||
    (typeof window !== "undefined" && window.__FZ_OFF_TBLMERGE) ||
    (typeof global !== "undefined" && global && (global.__FZ_OFF_TBLMERGE || (global.window && global.window.__FZ_OFF_TBLMERGE))) ||
    (typeof process !== "undefined" && process && process.env && (
      process.env.__FZ_OFF_TBLMERGE === "1" ||
      process.env.__FZ_OFF_TBLMERGE === "true" ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(",").map((s) => s.trim()).includes("TBLMERGE"))
    ))
  ) && !!(
    (typeof globalThis !== "undefined" && (globalThis.__FZ_ON_TBLMERGE || (globalThis.window && globalThis.window.__FZ_ON_TBLMERGE))) ||
    (typeof window !== "undefined" && window.__FZ_ON_TBLMERGE) ||
    (typeof global !== "undefined" && global && (global.__FZ_ON_TBLMERGE || (global.window && global.window.__FZ_ON_TBLMERGE))) ||
    (typeof process !== "undefined" && process && process.env && (
      process.env.__FZ_ON_TBLMERGE === "1" ||
      process.env.__FZ_ON_TBLMERGE === "true" ||
      (process.env.FZ_ON && process.env.FZ_ON.split(",").map((s) => s.trim()).includes("TBLMERGE"))
    ))
  );
  const rotTextOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_ROTTEXT) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_ROTTEXT || (globalThis.window && globalThis.window.__FZ_ON_ROTTEXT))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_ROTTEXT) ||
    (global && (global.__FZ_ON_ROTTEXT || (global.window && global.window.__FZ_ON_ROTTEXT))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_ROTTEXT === '1' ||
      process.env.__FZ_ON_ROTTEXT === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('ROTTEXT'))
    ))
  );

  const SERIAL = /^\s*\(?[০-৯0-9]{1,2}\s*[।.)]?\s*$/;
  const BOX_MARK = '\u0001box:';
  const FILL_RE = /([._\-…·─])\1{5,}/g;

  /** বাংলা কার/চিহ্ন বাদে মূল অক্ষরের সংখ্যা */
  function baseLen(s) {
    return String(s || '').replace(/\*\*|\^\{|\}|<\/?u>/gi, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
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
  function extractGrid(rows, nCols0, m, pageInfo) {
    let nCols = nCols0;
    if (!m || m.empty || !m.hasGrid || !m.rectPt) return null;
    if (!Array.isArray(m.hRulesPt) || m.hRulesPt.length < 2 || rows.length < 2 || nCols < 2) return null;
    // সংখ্যা-বাক্সের ভাঁজ-করা ছক (f1) গ্রিড-প্রথম পথের বাইরে
    if (rows.some((r) => r.some((c) => typeof c === 'string' && c.startsWith(BOX_MARK)))) return null;

    const R = m.rectPt;
    const H = [];
    m.hRulesPt.slice().sort((a, b) => a - b).forEach((y) => {
      if (!H.length || y - H[H.length - 1] > 3) H.push(y);
    });
    if (H.length < 2) return null;

    // [Rule GF1: FZ_OFF=GRIDFIRST / FZ_OFF=GF1] ৩+ সারির ছকে শিরোনামের পরের সব সারি ফাঁকা হলে (যেমন a10) অথবা ধূসর শিরোনামের ছোট ছকে (যেমন a02 পরিবার-ছক) গ্রিড-প্রথম পুনর্গঠন বাদ।
    if (!globalThis.__FZ_OFF_GF1 && rows.length >= 3 && rows.slice(1).every((r) => !r.some((c) => c && String(c).trim()))) return null;
    if (!globalThis.__FZ_OFF_GF1 && !tblMergeOn() && m.headShade && rows.length <= 4) return null;
    // হালকা রেখার ফরম (যেমন f1: ২৮ সারি অথচ রেখা-ভাগ ৪টি, খাড়া দাগ ০টি) ⇒ অসম্পূর্ণ জাল, পুরোনো পথে ফেরা
    const nonEmptyRows = rows.filter((r) => r.some((c) => c && String(c).trim())).length;
    if (rows.length >= 6 && H.length - 1 < nonEmptyRows * 0.18) return null;

    // পূরণের কলাম (হ্যাঁ/না/মন্তব্য — a16 চেকলিস্ট) শনাক্তকরণ
    const isFillCol = (j) => rows.length >= 4 && rows.slice(0, 2).some((r) => r[j] && String(r[j]).trim())
      && rows.slice(2).every((r) => !(r[j] && String(r[j]).trim()));
    const hasBodyCol = rows.length >= 4 && Array.from({ length: Math.max(0, nCols - 1) }, (_, k) => k + 1)
      .some((j) => rows.slice(2).filter((r) => r[j] && String(r[j]).trim()).length >= Math.ceil((rows.length - 2) * 0.5));
    const hasFillCols = nCols >= 4 && hasBodyCol && Array.from({ length: nCols }, (_, j) => isFillCol(j)).filter(Boolean).length >= 2;

    const vRules = Array.isArray(m.vRulesPt) ? m.vRulesPt : [];
    // a16 p6/p8/p9: হালকা মাস্কে মাপা বাইরের বাম ও ডান খাড়া দাগ থাকলে ছকের বাম/ডান সীমানা সেখানে স্ন্যাপ করা (মন্তব্য ঘর ৩৯.৫pt)
    const lOuter = hasFillCols ? vRules.filter((v) => v.cov >= 0.4 && Math.abs(v.x - R.x) <= 6).sort((a, b) => b.cov - a.cov)[0] : null;
    const rOuter = hasFillCols ? vRules.filter((v) => v.cov >= 0.4 && Math.abs(v.x - (R.x + R.w)) <= 10).sort((a, b) => b.cov - a.cov)[0] : null;
    const lx0 = lOuter ? lOuter.x : R.x;
    const rx1 = rOuter ? rOuter.x : R.x + R.w;
    const in0 = vRules.filter((v) => v.x > lx0 + 6 && v.x < rx1 - 6);

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
    else if (rows.length === 2 && full.length >= 1 && half.length > full.length && rows.slice(1).every((r) => r.every((c) => !String(c || "").trim()))) {
      const r0n = rows[0].filter((c) => String(c || "").trim()).length;
      if (full.length === r0n - 1 && Math.abs(half.length - (nCols - 1)) <= 2) {
        innerRules = half;
        nCols = half.length + 1;
      }
    }

    let edges = null;
    let covs = null;

    if (innerRules && innerRules.length === nCols - 1) {
      const sorted = innerRules.slice().sort((a, b) => a.x - b.x);
      edges = [lx0, ...sorted.map((v) => v.x), rx1];
      covs = sorted.map((v) => v.cov);
    } else if (hasFillCols && Array.isArray(m.colGuttersPt) && m.colGuttersPt.length === nCols - 1) {
      const guts = m.colGuttersPt.slice();
      const vr = in0.filter((v) => v.cov >= 0.4);
      for (let k = 0; k < guts.length; k++) {
        if (!isFillCol(k + 1) && !isFillCol(k)) continue;
        const hit = vr.find((v) => Math.abs(v.x - guts[k]) <= 12);
        if (hit) guts[k] = hit.x;
      }
      edges = [lx0, ...guts, rx1];
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
    const colFractions = edges.slice(1).map((e, k) => (e - edges[k]) / totalW);
    if (colFractions.some((f) => f < 0.02)) return null;

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

    return { H, edges, lx0, rx1, totalW, colFractions, covs, vRuleBands, hasFillCols, nBands };
  }

  /**
   * a03 (পাতা ১ ও পাতা ২ "দিন | মাস | বছর" ছক): যেখানে শিরোনাম-সারিতে কম ঘর (যেমন ৩টি: দিন, মাস, বছর) এবং নিচের সারিতে
   * বেশি ফাঁকা ঘর (যেমন ৮টি অঙ্ক-ঘর), এবং পূর্ণ খাড়া দাগগুলো (cov >= 0.85) শিরোনামের ঘরগুলোকে ভাগ করে আর অর্ধ-উচ্চতার দাগগুলো
   * (cov ~ 0.51) শুধু নিচের সারির অঙ্ক-ঘরগুলোকে ভাগ করে — সেখানে শিরোনাম-সারিতে আসল gridSpan ([2,0,2,0,4,0,0,0]) নির্ধারণ।
   */
  function refineHeaderSplitTable(rows, grid) {
    const { covs } = grid;
    const nCols = covs.length + 1;
    if (rows.length < 2 || nCols < 4) return null;
    const r0 = rows[0].map((c) => String(c || '').trim()).filter(Boolean);
    const bodyEmpty = rows.slice(1).every((r) => r.every((c) => !String(c || '').trim()));
    if (!bodyEmpty || r0.length < 2 || r0.length >= nCols) return null;

    // পূর্ণ-উচ্চতার খাড়া দাগ (cov >= 0.85) থেকে শিরোনামের গ্রুপ-সীমা
    const fullSplits = [-1];
    covs.forEach((c, idx) => { if (c >= 0.85) fullSplits.push(idx); });
    fullSplits.push(nCols - 1);
    const nGroups = fullSplits.length - 1;
    if (nGroups !== r0.length || !covs.some((c) => c < 0.75)) return null;

    const newRows = rows.map((r) => {
      const cp = r.slice(0, nCols);
      while (cp.length < nCols) cp.push('');
      return cp;
    });
    const sp0 = new Array(nCols).fill(0);
    newRows[0] = new Array(nCols).fill('');
    // [Rule GF2: FZ_OFF=FORMFIX / FZ_OFF=GF2] শিরোনাম-ভাগ করা অঙ্ক-বাক্সের ছকে (যেমন a03 দিন|মাস|বছর) gridSpan না দিয়ে vRuleBands দিয়ে ভেতরের খাড়া দাগ লুকানো (এডিট-যোগ্য ঘর ৬১ বজায় রাখতে) এবং ৪-ঘরের গ্রুপে শিরোনাম ("বছর") মাঝের ঘরে বসানো।
    const keepCells = !!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_GF2);
    for (let g = 0; g < nGroups; g++) {
      const startCol = fullSplits[g] + 1;
      const endCol = fullSplits[g + 1];
      const span = endCol - startCol + 1;
      const targetCol = keepCells && span >= 4 ? startCol + Math.floor((span - 1) / 2) : startCol;
      newRows[0][targetCol] = r0[g];
      sp0[startCol] = span;
    }
    const gridSpans = keepCells ? null : newRows.map((_, ri) => (ri === 0 ? sp0 : null));
    const vRuleBands = newRows.map((_, ri) => (ri === 0 ? covs.map((c) => c >= 0.85) : covs.map(() => true)));
    return { rows: newRows, gridSpans, vRuleBands };
  }

  /**
   * আংশিক খাড়া দাগওয়ালা বহু-ব্যান্ড ছকে (যেমন a18: ওপরে ৪ কলামের দাগ, নিচে বাম ৩ কলাম খোলা)
   * মাপা cellBoxV ও গ্রিড-দেয়াল অনুযায়ী প্রতিটি সারির ঘর-বণ্টন, আড়াআড়ি ঘর-জোড়া (gridSpans) এবং
   * উল্লম্ব ঘর-জোড়া (vMerges) নির্ধারণ।
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
        // [Rule GF3: FZ_OFF=FORMFIX / FZ_OFF=GF3] খোলা অঞ্চলে লেখা না থাকলে vRuleBands নিজেই মাঝখানের খাড়া বর্ডার nil করে দেয়; তাই ফাঁকা ঘরগুলোকে gridSpan দিয়ে মার্জ না করে আলাদা রাখা (a18-এ ৬৯টি এডিট-যোগ্য ঘর রক্ষা)।
        if (!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_GF3)) {
          sp[0] = gEnd + 1;
          for (let c = 1; c <= gEnd; c++) sp[c] = 0;
          gridSpans[ri] = sp;
        }
        continue;
      }

      if (openCells.length === 1) {
        const { c: origC, txt } = openCells[0];
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
        FILL_RE.lastIndex = 0;
        if (second.c === 1 && FILL_RE.test(second.txt)) {
          // a18 সারি ১৫ ("নম্বর ----" কলাম ০-এ, "তারিখ----" কলাম ১ ও ২ জুড়ে)
          const col0W = colFractions[0] * totalW - 10.8;
          const span12W = (colFractions[1] + colFractions[2]) * totalW - 10.8;
          r[0] = trimFillToWidth(first.txt, fs, col0W);
          r[1] = trimFillToWidth(second.txt, fs, span12W);
          r[2] = "";
          sp[0] = 1;
          sp[1] = 2;
          sp[2] = 0;
        } else {
          r[0] = first.txt;
          r[1] = "";
          r[2] = second.txt;
          sp[0] = 2;
          sp[1] = 0;
          sp[2] = 1;
          const span01W = (colFractions[0] + colFractions[1]) * totalW - 10.8;
          const col2W = colFractions[2] * totalW - 10.8;
          r[0] = trimFillToWidth(r[0], fs, span01W);
          r[2] = trimFillToWidth(r[2], fs, col2W);
        }
        gridSpans[ri] = sp;
      }
    }

    // আসল উল্লম্ব ঘর-জোড়া (vMerges): একই ব্যান্ডের ভেতরে যে কলামগুলোতে একটানা একাধিক সারিতে ফাঁকা ঘর রয়েছে
    // (যেমন a18 ব্যান্ড ০-এর শিরোনাম কলাম ০ ও ৩, ব্যান্ড ৩-এর মন্তব্য কলাম ৩, এবং ব্যান্ড ৪-এর ফাঁকা অংশ) সেগুলোকে vMerge দিয়ে জোড়া
    const vMerges = newRows.map(() => new Array(nCols).fill(null));
    let hasVMerge = false;
    const effSpan = (ri, c) => (gridSpans[ri] ? gridSpans[ri][c] : 1);

    for (let b = 0; b < nBands; b++) {
      const bIdxs = [];
      rowBand.forEach((rb, ri) => { if (rb === b) bIdxs.push(ri); });
      if (bIdxs.length < 2) continue;
      const rStart = bIdxs[0], rEnd = bIdxs[bIdxs.length - 1];

      if (b === 0) {
        // শিরোনাম-ব্যান্ড (যেমন a18 সারি ০–১): ১ম সারিতে লেখা আর পরের সারিগুলোতে ফাঁকা থাকলে পুরো শিরোনাম-ব্যান্ড জুড়ে vMerge
        for (let c = 0; c < nCols; c++) {
          const sp0 = effSpan(rStart, c);
          if (!sp0 || !String(newRows[rStart][c] || '').trim()) continue;
          const restBlank = bIdxs.slice(1).every((ri) => effSpan(ri, c) === sp0 && !String(newRows[ri][c] || '').trim());
          if (restBlank) {
            vMerges[rStart][c] = 'restart';
            bIdxs.slice(1).forEach((ri) => { vMerges[ri][c] = 'continue'; });
            hasVMerge = true;
          }
        }
      } else {
        // বডি-ব্যান্ড (যেমন a18 ব্যান্ড ৩ ও ৪): একপাশে লেখা থাকার কারণে অন্যপাশে তৈরি হওয়া ধারাবাহিক ফাঁকা সারিগুলোকে এক ঘরে vMerge
        for (let c = 0; c < nCols; c++) {
          let q0 = rStart;
          while (q0 <= rEnd) {
            const sp0 = effSpan(q0, c);
            if (!sp0 || String(newRows[q0][c] || '').trim()) { q0++; continue; }
            let q1 = q0;
            while (q1 + 1 <= rEnd && effSpan(q1 + 1, c) === sp0 && !String(newRows[q1 + 1][c] || '').trim()) q1++;
            // অন্তত ২টি সারি এবং তার মধ্যে অন্তত ১টি সারিতে অন্য কলামে লেখা আছে
            const anyOtherText = Array.from({ length: q1 - q0 + 1 }, (_, k) => q0 + k)
              .some((ri) => newRows[ri].some((cell, cj) => cj !== c && String(cell || '').trim()));
            if (q1 > q0 && anyOtherText) {
              vMerges[q0][c] = 'restart';
              for (let ri = q0 + 1; ri <= q1; ri++) vMerges[ri][c] = 'continue';
              hasVMerge = true;
            }
            q0 = q1 + 1;
          }
        }
      }
    }

    return { rows: newRows, gridSpans, cellAlignOverrides, vMerges: hasVMerge ? vMerges : null };
  }

  /**
   * চেকলিস্ট বা ক্রমিক-ভিত্তিক ছকে (যেমন a16 পাতা ৩–৯): কলাম ০-এ ক্রমিক নং ("৩।", "৪।"...) এবং পরের উপ-ক্রমিক সারিগুলোতে
   * ("খ) ...", "গ) ...") কলাম ০ ফাঁকা থাকলে সেগুলোকে মূলের মতো উল্লম্বভাবে জোড়া (vMerge)।
   */
  function computeSerialColumnVMerges(rows, nCols) {
    if (rows.length < 3 || nCols < 4) return null;
    const vMerges = rows.map(() => new Array(nCols).fill(null));
    let found = false;
    let i = 1;
    while (i < rows.length) {
      const c0 = String(rows[i][0] || '').trim();
      if (SERIAL.test(c0)) {
        let j = i;
        while (j + 1 < rows.length && !String(rows[j + 1][0] || '').trim() && String(rows[j + 1][1] || '').trim()) {
          j++;
        }
        if (j > i) {
          vMerges[i][0] = 'restart';
          for (let k = i + 1; k <= j; k++) vMerges[k][0] = 'continue';
          found = true;
        }
        i = j + 1;
      } else {
        i++;
      }
    }
    return found ? vMerges : null;
  }

  /**
   * গ্রিড-প্রথম ছকের প্রধান এন্ট্রি-পয়েন্ট (layout-ir.js toItem থেকে ডাকা হয়)।
   * সফল হলে গ্রিড-মাপ ও সংশোধিত ঘর-বণ্টন ফেরত দেয়; শর্ত না মিললে null ফেরত দেয়।
   */
  function applyGridFirst(tbl, m, pageInfo) {
    if (!fzOn('GRIDFIRST')) return null;
    if (!tbl || tbl.kind !== 'table' || !Array.isArray(tbl.rows) || !tbl.rows.length) return null;
    const rows = tbl.rows;
    const nCols = Math.max(...rows.map((r) => r.length));
    const grid = extractGrid(rows, nCols, m, pageInfo);
    if (!grid) return null;

    const { colFractions, vRuleBands, hasFillCols, nBands, lx0, rx1 } = grid;
    const fullVRule = grid.covs.map((cov) => cov >= (hasFillCols ? 0.4 : 0.75));

    tbl.colFractions = colFractions;
    tbl.fullVRule = fullVRule.some(Boolean) ? fullVRule : null;
    if (hasFillCols) {
      tbl.fillW2 = true;
      if (tbl.rect && lx0 != null && rx1 != null && rx1 > lx0 + 20) {
        tbl.rect = Object.assign({}, tbl.rect, { x: lx0, w: rx1 - lx0 });
      }
      // a16 p3/p4/p7: ছকের নিচের স্বাক্ষর/অনুস্বাক্ষর শেষ আড়া দাগের (H[last]) সাথে ছুঁয়ে গেলে rect.h +২২..২৫pt বেড়ে যেত ও স্বাক্ষর ছকে ঢুকে পড়ত
      if (tbl.rect && Array.isArray(grid.H) && grid.H.length >= 2) {
        const hLast = grid.H[grid.H.length - 1];
        const hasTextBelow = Array.isArray(m.textLinesPt) && m.textLinesPt.some((y) => y > hLast + 3 && y < tbl.rect.y + tbl.rect.h);
        if (tbl.rect.y + tbl.rect.h > hLast + 6 && !hasTextBelow && hLast > tbl.rect.y + 20) {
          tbl.rect = Object.assign({}, tbl.rect, { h: hLast - tbl.rect.y });
        }
        // [Rule GF4: FZ_OFF=GRIDFIRST / FZ_OFF=GF4] পূরণ-কলামযুক্ত ছকে (hasFillCols) মাপা আড়া দাগের সংখ্যা সারির সমান বা ১-লাইনের শিরোনাম-ব্যান্ডসহ ২টি ব্যান্ড হলে ১ম সারিতে শিরোনাম-ব্যান্ড রেখে বাকি উচ্চতা বডি-সারিগুলোর লেখার অনুপাতে ভাগ।
        const bhs = grid.H.slice(1).map((y, k) => y - grid.H[k]);
        if (grid.H.length - 1 === rows.length) {
          if (bhs.every((bh) => bh >= 8)) tbl.rowHeightsPt = bhs;
        } else if (grid.H.length === rows.length && rows.length >= 3) {
          const maxIdx = bhs.indexOf(Math.max(...bhs));
          if (maxIdx >= 0 && bhs[maxIdx] >= 40) {
            const w0 = Math.max(1, baseLen(rows[maxIdx][1] || ""));
            const w1 = Math.max(1, baseLen(rows[maxIdx + 1][1] || ""));
            const h0 = bhs[maxIdx] * (w0 / (w0 + w1));
            const h1 = bhs[maxIdx] - h0;
            const outH = bhs.slice();
            outH.splice(maxIdx, 1, h0, h1);
            tbl.rowHeightsPt = outH;
          }
        } else if (!globalThis.__FZ_OFF_GF4 && grid.H.length === 3 && rows.length >= 3 && bhs[0] >= 8 && bhs[0] <= (tbl.cellFontSrc || 12) * 1.8) {
          const bodyRows = rows.slice(1);
          const wts = bodyRows.map((r) => Math.max(1, Math.ceil(baseLen(r[1] || r.join(" ")) / 42)));
          const sw = wts.reduce((a, b) => a + b, 0) || 1;
          tbl.rowHeightsPt = [bhs[0]].concat(wts.map((w) => bhs[1] * (w / sw)));
        }
      }
      if (rows[0] && Array.isArray(grid.H) && grid.H.length >= 2) {
        const b0H = grid.H[1] - grid.H[0];
        const fs0 = tbl.headFontPt || tbl.cellFontSrc || 11;
        if (b0H >= 10 && b0H < fs0 * 1.65) {
          const capByH = Math.max(9.5, Math.floor((b0H - 1.2) / 1.22 * 2) / 2);
          if (capByH < fs0) tbl.headFontPt = Math.min(fs0, capByH);
        }
      }
    }
    if (tbl.headShade && rows[0]) {
      tbl.headVAlign = new Array(nCols).fill("c");
      const totW = (tbl.rect && tbl.rect.w) || 500;
      const fs0 = tbl.headFontPt || tbl.cellFontSrc || 10;
      const headOver = rows[0].some((c, k) => {
        if (rotTextOn() && ((c && typeof c === 'object' && c.rot) || (tbl.cellRots && tbl.cellRots[0] && tbl.cellRots[0][k]))) return false;
        const cw = totW * (colFractions[k] || 1 / nCols) - (totW * (colFractions[k] || 1 / nCols) < 55 ? 2.8 : 10.8);
        return baseLen(c) >= 18 && baseLen(c) * fs0 * 0.52 > cw;
      });
      if (headOver) tbl.headFontPt = Math.min(fs0, 9);
    }
    tbl.gridFirst = true;

    // ১) আংশিক খাড়া দাগের বহু-ব্যান্ড ছক (যেমন a18)
    if (vRuleBands.some((b) => b < nBands - 1) && Array.isArray(tbl.rowBand) && tbl.rowBand.length === rows.length) {
      const ref = refinePartialGridRows(rows, tbl.rowBand, grid, m, tbl.cellFontSrc || 11.5);
      if (ref) {
        tbl.rows = ref.rows;
        tbl.gridSpans = ref.gridSpans;
        tbl.vMerges = ref.vMerges;
        tbl.vRuleBands = tbl.rowBand.map((b) => vRuleBands.map((lastB) => b <= lastB));
        if (ref.cellAlignOverrides && ref.cellAlignOverrides.some(Boolean)) {
          if (!tbl.cellAligns) tbl.cellAligns = tbl.rows.map(() => null);
          ref.cellAlignOverrides.forEach((ov, ri) => {
            if (!ov) return;
            tbl.cellAligns[ri] = (tbl.cellAligns[ri] || new Array(nCols).fill(null)).map((cur, c) => ov[c] || cur);
          });
        }
      }
    } else {
      // ২) শিরোনাম-ভাগ করা অঙ্ক-বাক্সের ছক (যেমন a03 পাতা ১ ও ২-এর "দিন | মাস | বছর" ছক)
      const hSplit = refineHeaderSplitTable(rows, grid);
      if (hSplit) {
        tbl.rows = hSplit.rows;
        tbl.gridSpans = hSplit.gridSpans;
        tbl.vRuleBands = hSplit.vRuleBands;
      }
      // ৩) চেকলিস্ট ছকে উপ-ক্রমিক সারির ক্রমিক নং কলামে vMerge (যেমন a16 পাতা ৩–৯)
      if (hasFillCols) {
        const vm = computeSerialColumnVMerges(tbl.rows, nCols);
        if (vm) tbl.vMerges = vm;
      }
    }
    return grid;
  }

  const FayzarGridFirst = { applyGridFirst, extractGrid, refinePartialGridRows, refineHeaderSplitTable, computeSerialColumnVMerges, trimFillToWidth, tblMergeOn };
  global.FayzarGridFirst = FayzarGridFirst;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarGridFirst;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
