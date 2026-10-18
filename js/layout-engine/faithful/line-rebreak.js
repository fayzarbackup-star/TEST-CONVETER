/**
 * Fayzar — হুবহু-লেআউট লাইন-পুনর্বিভাজন (FayzarLineRebreak) — FAITHFUL_PLAN ধাপ ২
 * ================================================================================
 * ছবি থেকে মাপা লাইন-সংখ্যা (measuredCount) আর Gemini-র লেখা লাইন-ভাঙা (geminiLines) না মিললে
 * শব্দ-প্রস্থ মেপে ন্যূনতম-ব্যাডনেস DP (Knuth-Plass ধাঁচের সরল রূপ) দিয়ে ঠিক targetLines লাইনে পুনর্বিভাজন।
 *
 * নিয়ম:
 *  • প্রতিটি লাইনের প্রস্থ ≤ availPt
 *  • শেষ লাইন ছাড়া বাকি লাইনগুলোর প্রস্থ যতটা সম্ভব সমান-প্রবাহ (ন্যূনতম বর্গ-ফাঁক ∑(availPt − w)²)
 *  • শব্দ ভাঙা শুধু স্পেসে; বাংলা যুক্তাক্ষর/হসন্ত (্, ‍, ‌) কখনো মাঝখানে ভাঙবে না
 *  • **মোটা**, *বাঁকা*, ^{উপরে} চিহ্ন লেখায় অক্ষত থাকবে, কিন্তু প্রস্থ-মাপে ধরা হবে না (lineWidthPt-এর মতো)
 *  • কোনো শব্দ একাই availPt-এর চেয়ে চওড়া হলে বা targetLines-এ আঁটানো অসম্ভব হলে null ফেরত
 */
(function (global) {
  'use strict';

  const BOLD = 1.02;   // বাংলা মোটা অক্ষর (কৃত্রিম bold) সামান্য চওড়া (line-fit.js-এর সমান)
  const EPS = 1e-7;

  /**
   * প্রস্থ-মাপের জন্য ফরম্যাটিং চিহ্ন (**মোটা**, *বাঁকা*, ^{উপরে}) সরানো — মূল লেখায় চিহ্ন অক্ষত থাকে।
   */
  function stripMarks(t) {
    return String(t == null ? '' : t)
      .replace(/\*\*/g, '')
      .replace(/\*([^*\s][^*]*?)\*/g, '$1')
      .replace(/(^|\s)\*(?=\S)|(?<=\S)\*(?=\s|$|[।.,;:!?)\]])/g, '$1')
      .replace(/\^\{([^}]*)\}/g, '$1')
      .trim();
  }

  /**
   * ১০০px মাপক (measure) দিয়ে অনুচ্ছেদের ফন্টে লেখার প্রস্থ (pt) — line-fit.js-এর lineWidthPt-এর অনুরূপ।
   */
  function lineWidthPt(t, it, measure) {
    const s = stripMarks(t);
    if (!s) return 0;
    const fs = (it && it.fontPt) || 12;
    const bold = !!(it && it.bold);
    return measure(s, bold) * fs / 100 * (bold ? BOLD : 1);
  }

  /**
   * লেখাকে স্পেসে শব্দ-তালিকায় ভাগ করা।
   *  • বাংলা যুক্তাক্ষর/হসন্ত (্) ও zero-width joiner/non-joiner (\u200C, \u200D) অক্ষত থাকে
   *  • ^{...}-এর ভেতরে স্পেস থাকলে সেটিও একই টোকেনে অক্ষত থাকে
   */
  function tokenize(text) {
    const raw = Array.isArray(text) ? text.join(' ') : String(text == null ? '' : text);
    if (!raw.trim()) return [];
    const tokens = [];
    let cur = '';
    let braceDepth = 0;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '^' && raw[i + 1] === '{') {
        cur += '^{';
        braceDepth++;
        i++;
        continue;
      }
      if (braceDepth > 0) {
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
        cur += ch;
        continue;
      }
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v') {
        // হসন্তের ঠিক পরের দুর্ঘটনাবশত স্পেস ছাড়া সাধারণ সব স্পেসে শব্দ আলাদা
        if (cur) {
          tokens.push(cur);
          cur = '';
        }
      } else {
        cur += ch;
      }
    }
    if (cur) tokens.push(cur);
    return tokens;
  }

  /**
   * Gemini-র লাইন ও ছবি থেকে মাপা লাইন-সংখ্যার তুলনা করে পুনর্বিভাজন দরকার কিনা।
   * @param {string[]|string|number|object} geminiLines
   * @param {number|Array|object} measuredCount
   * @returns {boolean}
   */
  function needsRebreak(geminiLines, measuredCount) {
    let mCount = measuredCount;
    if (mCount == null && geminiLines && typeof geminiLines === 'object' && !Array.isArray(geminiLines)) {
      if (geminiLines.m && Array.isArray(geminiLines.m.lines)) mCount = geminiLines.m.lines.length;
      else if (geminiLines.diag && typeof geminiLines.diag.lines === 'number') mCount = geminiLines.diag.lines;
    }
    if (Array.isArray(mCount)) mCount = mCount.length;
    else if (mCount && typeof mCount === 'object' && Array.isArray(mCount.lines)) mCount = mCount.lines.length;

    let gLines = geminiLines;
    if (gLines && typeof gLines === 'object' && !Array.isArray(gLines)) {
      gLines = gLines.lines || (typeof gLines.text === 'string' ? gLines.text : []);
    }

    let gCount = 0;
    if (typeof gLines === 'number') {
      gCount = gLines;
    } else if (Array.isArray(gLines)) {
      const nonEmpty = gLines.map((l) => String(l == null ? '' : l).trim()).filter(Boolean);
      if (nonEmpty.length && nonEmpty.every((l) => /^([─━═=_\-.…·])\1{5,}$/.test(l.replace(/\s+/g, '')))) return false;
      gCount = nonEmpty.length;
    } else if (typeof gLines === 'string') {
      const trimmed = gLines.trim();
      gCount = trimmed ? trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).length : 0;
    }

    if (!Number.isInteger(gCount) || !Number.isInteger(mCount)) return false;
    if (gCount < 1 || mCount < 1) return false;
    return gCount !== mCount;
  }

  /**
   * ন্যূনতম-ব্যাডনেস DP (Knuth-Plass ধাঁচের সরল রূপ) দিয়ে লেখাকে ঠিক targetLines লাইনে পুনর্বিভাজন।
   * @param {string|string[]} text        মূল লেখা বা লাইনের তালিকা
   * @param {number}          targetLines লক্ষ্য লাইন-সংখ্যা (≥ ১)
   * @param {object}          it          আইটেম ({ fontPt, bold, ... })
   * @param {number}          availPt     প্রতি লাইনের সর্বোচ্চ প্রাপ্য প্রস্থ (pt)
   * @param {function}        measure     measure(text, bold) ⇒ ১০০px ফন্টে প্রস্থ
   * @param {object}          [opts]      ঐচ্ছিক বিকল্প ({ safeRatio, firstIndentPt })
   * @returns {string[]|null} নতুন লাইন-তালিকা অথবা অসম্ভব হলে null
   */
  function rebreak(text, targetLines, it, availPt, measure, opts) {
    if (!Number.isInteger(targetLines) || targetLines < 1) return null;
    if (typeof availPt !== 'number' || !(availPt > 0) || typeof measure !== 'function') return null;

    const item = it || { fontPt: 12, bold: false };
    const o = opts || {};
    const maxW = availPt * (o.safeRatio > 0 ? o.safeRatio : 1);
    const firstMaxW = o.firstIndentPt ? maxW - o.firstIndentPt : maxW;
    if (!(maxW > 0) || !(firstMaxW > 0)) return null;

    const words = tokenize(text);
    const n = words.length;
    if (n === 0 || n < targetLines) return null;

    // প্রতিটি শব্দের প্রস্থ ও স্পেসের প্রস্থ প্রাক-গণনা (O(N))
    const wordW = new Float64Array(n);
    const prefW = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) {
      const w = lineWidthPt(words[i], item, measure);
      if (w > maxW + EPS) return null;   // একক শব্দই প্রাপ্য প্রস্থের চেয়ে চওড়া
      wordW[i] = w;
      prefW[i + 1] = prefW[i] + w;
    }
    if (wordW[0] > firstMaxW + EPS) return null;

    const probeBn = lineWidthPt('ক ক', item, measure) - 2 * lineWidthPt('ক', item, measure);
    const spaceW = probeBn > 0
      ? probeBn
      : Math.max(0, lineWidthPt('a a', item, measure) - 2 * lineWidthPt('a', item, measure));

    const spanWidth = (i, j) => prefW[j] - prefW[i] + (j - 1 - i) * spaceW;

    // ১ লাইনের বিশেষ ক্ষেত্র
    if (targetLines === 1) {
      const totalW = spanWidth(0, n);
      if (totalW > firstMaxW + EPS) return null;
      const joined = words.join(' ');
      if (lineWidthPt(joined, item, measure) > firstMaxW + EPS) return null;
      return [joined];
    }

    // মোট শব্দ যদি targetLines-এর সমান হয়, তবে প্রতি লাইনে ১টি করে শব্দই একমাত্র বিভাজন
    if (n === targetLines) {
      return words.slice();
    }

    // DP টেবিল: dp[l * (n + 1) + i] = প্রথম i-টি শব্দকে l-টি লাইনে ভাঙার সর্বনিম্ন ব্যাডনেস
    const K = targetLines;
    const stride = n + 1;
    const dp = new Float64Array((K + 1) * stride);
    const parent = new Int32Array((K + 1) * stride);
    dp.fill(Infinity);
    parent.fill(-1);
    dp[0] = 0;

    // ১ম লাইন (l = 1)
    const maxI1 = n - (K - 1);
    for (let i = 1; i <= maxI1; i++) {
      const w = spanWidth(0, i);
      if (w > firstMaxW + EPS) break;   // শব্দ যোগে প্রস্থ কেবল বাড়ে
      const slack = Math.max(0, firstMaxW - w);
      dp[stride + i] = slack * slack * (1 - 1e-6);
      parent[stride + i] = 0;
    }

    // মাঝের লাইনগুলো (l = 2 .. K - 1)
    for (let l = 2; l < K; l++) {
      const prevRow = (l - 1) * stride;
      const curRow = l * stride;
      const maxI = n - (K - l);
      const weight = 1 - l * 1e-6;
      for (let p = l - 1; p < maxI; p++) {
        const prevCost = dp[prevRow + p];
        if (prevCost === Infinity) continue;
        for (let i = p + 1; i <= maxI; i++) {
          const w = spanWidth(p, i);
          if (w > maxW + EPS) break;
          const slack = Math.max(0, maxW - w);
          const cost = prevCost + slack * slack * weight;
          if (cost < dp[curRow + i]) {
            dp[curRow + i] = cost;
            parent[curRow + i] = p;
          }
        }
      }
    }

    // শেষ লাইন (l = K): প্রস্থ ≤ maxW হলেই বৈধ, ব্যাডনেস ০ (শেষ লাইন ছাড়া সমান-প্রবাহ)
    const lastPrevRow = (K - 1) * stride;
    const lastRow = K * stride;
    for (let p = K - 1; p < n; p++) {
      const prevCost = dp[lastPrevRow + p];
      if (prevCost === Infinity) continue;
      const w = spanWidth(p, n);
      if (w > maxW + EPS) continue;
      if (prevCost < dp[lastRow + n]) {
        dp[lastRow + n] = prevCost;
        parent[lastRow + n] = p;
      }
    }

    if (dp[lastRow + n] === Infinity) return null;

    // ব্যাকট্র্যাক করে লাইনগুলো উদ্ধার
    const out = new Array(K);
    let curIdx = n;
    for (let l = K; l >= 1; l--) {
      const startIdx = parent[l * stride + curIdx];
      if (startIdx < 0) return null;
      const lineStr = words.slice(startIdx, curIdx).join(' ');
      const lim = l === 1 ? firstMaxW : maxW;
      if (lineWidthPt(lineStr, item, measure) > lim + EPS) return null;
      out[l - 1] = lineStr;
      curIdx = startIdx;
    }

    return out;
  }

  const FayzarLineRebreak = { rebreak, needsRebreak, lineWidthPt, tokenize, stripMarks };
  global.FayzarLineRebreak = FayzarLineRebreak;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarLineRebreak;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
