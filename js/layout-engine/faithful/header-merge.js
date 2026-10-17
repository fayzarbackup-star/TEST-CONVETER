/**
 * Fayzar — ছকের ভাঙা হেডার-সারি সংযোজন মডিউল (FayzarHeaderMerge)
 * ===============================================================
 * অনুরোধ ঘ (২০২৬-১০-১৫, a07 পাতা ১-এর ছক):
 * নতুন OCR রানে Gemini কখনো ছক-হেডারের একটি ঘরের দৃশ্যমান প্রতিটি লাইনকে আলাদা সারি হিসেবে দেয়
 * (যেমন "জ্যেষ্ঠতার" r1-এ, "ক্রমিক" r2-তে, "নং" r3-তে)।
 *
 * নিয়ম:
 * - সুইচ: FZ_OFF=HEADMERGE (globalThis.__FZ_OFF_HEADMERGE থাকলে বন্ধ)।
 * - প্রথম কয়েকটি সারির (২ থেকে সর্বোচ্চ ৫টি) মাঝে যদি মাপা আড়াআড়ি দাগ (hRulesPt) না থাকে,
 *   কোনো সারিতেই ক্রমিক নম্বর বা পূরণ-চিহ্ন না থাকে, এবং ঘরগুলোতে শুধু ছোট টুকরো লেখা থাকে,
 *   তাহলে সেই সারিগুলোকে কলাম ধরে '\n' দিয়ে একটিমাত্র হেডার-সারিতে জুড়ে দেওয়া হয়।
 * - মূল ইঞ্জিন (docx-to-doc ইত্যাদি) অপরিবর্তিত থাকে।
 */
(function (global) {
  'use strict';

  const SERIAL = /^\(?[০-৯0-9]{1,3}\s*[।.)]?$/;
  const SUBSER = /^[(\s]*([ক-হ]|[a-z]|[ivx]+)[)।.)]\s/i;
  const BOX_MARK = '\u0001box:';
  const FILL_RE = /([._\-…·─])\1{3,}/;
  const CHECKBOX_RE = /[☐☑□]|\[\s*\]|⟦\s*⟧/;

  /** বাংলা কার/চিহ্ন ও ফরম্যাট ট্যাগ বাদে মূল অক্ষরের সংখ্যা */
  function baseLen(s) {
    return String(s || '')
      .replace(/\*\*|\^\{|\}|<\/?u>|<[^>]+>/gi, '')
      .replace(/[ঁ-ঃ়া-্ৗ]/g, '')
      .trim().length;
  }

  /** কলাম-নম্বর সারি কি না (যেমন: ১ | ২ | ৩ | ৪ বা (১) | (২) | (৩)) */
  function isColNumberRow(row) {
    const nonEmpty = row.map((c) => String(c || '').trim()).filter(Boolean);
    if (nonEmpty.length < 2) return false;
    return nonEmpty.every((c) => /^\(?[০-৯0-9]{1,2}\)?$/.test(c));
  }

  /** একটি সারি হেডারের ছোট টুকরো-লেখার সারি হতে পারে কি না */
  function isHeaderFragmentRow(row, isFirstRow) {
    const cells = row.map((c) => String(c || '').trim());
    const nonEmpty = cells.filter(Boolean);
    if (!nonEmpty.length) return false;
    // প্রথম ঘরে ক্রমিক নম্বর (১।, ০১., 1.) বা দ্বিতীয় ঘরে উপ-ক্রমিক ((ক), a)) থাকলে এটি মূল তথ্য-সারি
    if (SERIAL.test(cells[0])) return false;
    if (cells.length > 1 && SUBSER.test(cells[1])) return false;
    // কলাম-নম্বরের সারি (১ | ২ | ৩ | ৪) আলাদা দাগের ব্যান্ডে থাকে, হেডারে জোড়া হবে না
    if (!isFirstRow && isColNumberRow(cells)) return false;
    // পূরণ-রেখা (.... / ----), চেকবক্স বা ভেতরের টেবিল থাকলে হেডার-টুকরো নয়
    if (nonEmpty.some((c) => FILL_RE.test(c) || CHECKBOX_RE.test(c) || /<table/i.test(c))) return false;
    // প্রতিটি ঘরের লেখা ছোট টুকরো হতে হবে (মূল অক্ষর ≤ ২৮, শব্দ ≤ ৫)
    const lens = nonEmpty.map((c) => baseLen(c));
    if (lens.some((l) => l > 28)) return false;
    if (nonEmpty.some((c) => c.split(/\s+/).length > 5)) return false;
    // ধারাবাহিক টুকরো সারিতে (r >= 1) গড় দৈর্ঘ্য আরও ছোট (≤ ১৮ মূল অক্ষর) এবং পূর্ণবাক্যের দাঁড়ি ('।') থাকবে না
    if (!isFirstRow) {
      const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
      if (avg > 18) return false;
      if (nonEmpty.some((c) => /।\s*$/.test(c))) return false;
    }
    return true;
  }

  /**
   * প্রথম কয়টি সারি (K >= 2) একটি একক হেডার-সারির ভাঙা লাইন তা নির্ণয় করে।
   * শর্ত না মিললে 1 ফেরত দেয় (কোনো পরিবর্তন নেই)।
   */
  function detectHeaderSpan(rows, m) {
    if (globalThis.__FZ_OFF_HEADMERGE) return 1;
    if (!Array.isArray(rows) || rows.length < 3) return 1;
    const nCols = Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0)));
    if (nCols < 2) return 1;
    if (rows.some((r) => Array.isArray(r) && r.some((c) => typeof c === 'string' && c.startsWith(BOX_MARK)))) return 1;

    // যদি ছকে ফাঁকা সারি থাকে এবং মাপা লাইন-সংখ্যা হুবহু অ-ফাঁকা সারির সমান হয় (যেমন a18: EXACT1 + rowBand), তবে ছোঁয়া হবে না
    const hasEmptyRow = rows.some((r) => !r.some((c) => c && String(c).trim()));
    const nNonEmpty = rows.filter((r) => r.some((c) => c && String(c).trim())).length;
    if (hasEmptyRow && m && Array.isArray(m.textLinesPt) && m.textLinesPt.length === nNonEmpty) return 1;

    if (!isHeaderFragmentRow(rows[0], true)) return 1;

    // মাপা আড়াআড়ি দাগ (H) ও লেখা-লাইন (L) প্রস্তুতকরণ
    const H = [];
    if (m && !m.empty && Array.isArray(m.hRulesPt)) {
      m.hRulesPt.slice().sort((a, b) => a - b).forEach((y) => {
        if (!H.length || y - H[H.length - 1] > 3) H.push(y);
      });
    }
    const L = (m && !m.empty && Array.isArray(m.textLinesPt) && m.rectPt)
      ? m.textLinesPt.filter((y) => y >= m.rectPt.y - 2 && y <= m.rectPt.y + m.rectPt.h + 2).sort((a, b) => a - b)
      : [];
    const linesReliable = L.length >= nNonEmpty * 0.75;

    const maxK = Math.min(5, rows.length - 1);
    let K = 1;
    for (let r = 1; r < maxK; r++) {
      if (!isHeaderFragmentRow(rows[r], false)) break;

      // এই সারির অন্তত একটি ঘর যেন ওপরের কোনো ঘরের (0 .. r-1) কলামের ধারাবাহিকতা হয়
      const continuesPrevCol = rows[r].some((c, j) => {
        if (!c || !String(c).trim()) return false;
        for (let p = 0; p < r; p++) {
          if (rows[p][j] && String(rows[p][j]).trim()) return true;
        }
        return false;
      });
      if (!continuesPrevCol) break;

      // মাপা আড়াআড়ি দাগ (hRulesPt) পরীক্ষা: প্রথম সারি ও সারি r-এর মাঝে কোনো আড়াআড়ি দাগ আছে কি না
      if (H.length >= 2) {
        if (linesReliable && L.length > r) {
          // নির্ভরযোগ্য লাইন-কেন্দ্র থাকলে: L[0] ও L[r]-এর মাঝখানে কোনো আড়াআড়ি দাগ থাকলে এখানেই থামা
          const ruleBetween = H.some((hy) => hy > L[0] + 2 && hy < L[r] - 2);
          if (ruleBetween) break;
        } else {
          // কাত স্ক্যানে লাইন-গোনা অবিশ্বস্ত হলে (যেমন a07):
          // যদি রেখা-ভাগের সংখ্যা (H.length - 1) সারি-সংখ্যার সমান/বেশি হয় এবং প্রথম ব্যান্ডটি এক-লাইনের মতো নিচু (< ১৮pt) হয়, তবে মাঝখানে দাগ আছে
          const nBands = H.length - 1;
          const firstBandH = H[1] - H[0];
          const fs0 = (m && m.cellInkPt) || 10;
          if (nBands >= rows.length - r + 1 && firstBandH < fs0 * 1.8) break;
        }
      }
      K = r + 1;
    }

    if (K < 2) return 1;

    // অতিরিক্ত নিরাপত্তা যাচাই:
    // ১) প্রথম কলামেই (যেমন "জ্যেষ্ঠতার" / "ক্রমিক" / "নং") অন্তত ২টি সারিতে ভাঙা টুকরো আছে, অথবা
    // ২) কোনো কলামে ১-২ শব্দের ভাঙা টুকরো আছে এবং তার ঠিক পরের সারিটি (rows[K]) ক্রমিক নম্বর বা কলাম-নম্বর দিয়ে শুরু হয়েছে
    const col0Split = rows.slice(0, K).filter((r) => r[0] && String(r[0]).trim()).length >= 2;
    const nextRowIsDataOrIdx = rows[K] && (SERIAL.test(String(rows[K][0] || '').trim()) || isColNumberRow(rows[K]));
    const hasShortWordSplit = Array.from({ length: nCols }, (_, j) => {
      const parts = rows.slice(0, K).map((r) => String(r[j] || '').trim()).filter(Boolean);
      return parts.length >= 2 && parts.slice(1).every((p) => p.split(/\s+/).length <= 2);
    }).some(Boolean);

    if (!col0Split && !(hasShortWordSplit && (nextRowIsDataOrIdx || H.length >= 2))) return 1;

    return K;
  }

  /**
   * ছকের প্রথম K-টি ভাঙা হেডার-সারিকে একটি হেডার-সারিতে ('\n' দিয়ে) সংযুক্ত করে।
   */
  function applyHeaderMerge(rows, m) {
    if (globalThis.__FZ_OFF_HEADMERGE) return rows;
    const K = detectHeaderSpan(rows, m);
    if (K < 2) return rows;

    const nCols = Math.max(...rows.map((r) => r.length));
    const mergedHeader = Array.from({ length: nCols }, (_, j) => {
      const parts = [];
      for (let r = 0; r < K; r++) {
        const cell = rows[r][j] != null ? String(rows[r][j]).trim() : '';
        if (cell) parts.push(cell);
      }
      return parts.join('\n');
    });

    return [mergedHeader, ...rows.slice(K)];
  }

  const FayzarHeaderMerge = { applyHeaderMerge, detectHeaderSpan, isHeaderFragmentRow };
  global.FayzarHeaderMerge = FayzarHeaderMerge;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarHeaderMerge;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
