/**
 * js/layout-engine/column-bands.js — মেশানো কলাম ব্যান্ড বিশ্লেষক (MIXCOL / MIXCOL_FIX)
 *
 * গাইড-বই বা নোটের পাতায় পূর্ণ-প্রস্থ (1-কলাম) আর 2-কলাম অংশের রূপান্তর:
 * - জ্যামিতি (bounding box) ও টেক্সট যোগ্যতা অনুযায়ী পাতাকে উল্লম্ব ব্যান্ডের ক্রমে ভাগ করে।
 * - একটি ব্লক পূর্ণ-প্রস্থ (cols: 1) যদি তার প্রস্থ >= 600, অথবা মাঝরেখা (x = 500) পেরিয়ে দুই দিকে যায়,
 *   বা এটি side_by_side / table ব্লক হয়।
 * - বাকি ব্লক সরু: বাঁ (x1 <= 560) বা ডান (x0 >= 440)।
 * - পরপর সরু ব্লক নিয়ে 2-কলাম ব্যান্ড (cols: 2)। ব্যান্ডের ভেতর পড়ার ক্রম: আগে বাঁ কলামের সব (y ক্রমে), তারপর ডান কলামের সব।
 * - নিরাপত্তা ও ভুয়া-কলাম প্রতিরোধ (MIXCOL_FIX):
 *   * শুধু লেখার ব্লক গোনে (paragraph, question, list, option_row)। figure, signature, header, footer ইত্যাদি কলাম তৈরি করে না।
 *   * প্রস্থ < 200 সরু ব্লক এবং ডট/ড্যাশ-লিডার (".....") ফরমের ঘর কলামে গোনা হয় না।
 *   * প্রতিটি দিকে অন্তত ৩টি যোগ্য ব্লক এবং অন্তত ২০০ অক্ষর (ডট/স্পেস বাদে) আবশ্যক।
 *   * বাঁ দিকের ব্লক শুরু x0 <= 200, ডানের ব্লক x0 ৪৪০-৬৫০ এর মধ্যে।
 *   * দুই দিকের উল্লম্ব বিস্তার অনুপাত >= ৫০% হতে হবে।
 * - কোনো বৈধ 2-কলাম ব্যান্ড না থাকলে পুরো পাতায় একটাই 1-কলাম ব্যান্ড।
 *
 * UMD: window.FayzarColumnBands ও module.exports।
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FayzarColumnBands = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function isEligibleColumnBlock(b) {
    if (!b || !b.box || !Array.isArray(b.box) || b.box.length < 4) return false;

    // ১. শুধু লেখার ব্লক গুনবে: paragraph, question, list, list_item, option_row
    const role = String(b.role || b.type || '').toLowerCase();
    const allowed = ['paragraph', 'question', 'list', 'list_item', 'option_row'];
    if (!allowed.includes(role)) return false;

    // ২. figure, signature, footer, header, label_value, page_number, stamp কখনো কলাম তৈরি করবে না
    const forbidden = ['figure', 'signature', 'footer', 'header', 'label_value', 'page_number', 'stamp', 'marginal_note', 'metadata'];
    if (forbidden.includes(role)) return false;

    // ৩. খুব সরু ব্লক (প্রস্থ < ২০০, যেমন তালিকা-নম্বর) কলাম গোনায় ধরবে না
    const x0 = b.box[1], x1 = b.box[3];
    const w = x1 - x0;
    if (w < 200) return false;

    // ৪. ডট বা ড্যাশ-লিডারের ঘর ("....." বা "-----", ৫টির বেশি) মানে ফরমের ঘর। এগুলো কলাম গোনায় নয়
    const rawText = String(b.text || (Array.isArray(b.lines) ? b.lines.join(' ') : ''));
    if (/\.{5,}|-{5,}|_{5,}/.test(rawText)) return false;
    const dotDashes = (rawText.match(/[.\-_–—]/g) || []).length;
    if (dotDashes >= 10 && dotDashes > rawText.length * 0.3) return false;

    return true;
  }

  function cleanCharCount(b) {
    const rawText = String(b.text || (Array.isArray(b.lines) ? b.lines.join(' ') : ''));
    return rawText.replace(/[\s.\-_–—]/g, '').length;
  }

  function isWideBlock(b) {
    if (b.role === 'side_by_side') return true;
    if (b.role === 'table' || b.type === 'table') return true;
    if (!b.box || !Array.isArray(b.box) || b.box.length < 4) return false;
    const x0 = b.box[1], x1 = b.box[3];
    const w = x1 - x0;
    if (w >= 600) return true;
    // মাঝরেখা (x = 500) পেরিয়ে দুই দিকে যায় এবং বাঁ/ডান কোনো এক কলামে আবদ্ধ নয়
    if (x0 < 440 && x1 > 560) return true;
    if (x0 < 500 && x1 > 500 && w >= 350) return true;
    return false;
  }

  function classifyBlock(b) {
    if (isWideBlock(b)) return 'wide';
    if (!b.box || !Array.isArray(b.box) || b.box.length < 4) return null; // no box
    const x0 = b.box[1], x1 = b.box[3];
    const leftOk = x1 <= 560;
    const rightOk = x0 >= 440;
    if (leftOk && rightOk) {
      // মাঝের সরু ব্লক: কেন্দ্র যেদিকে বেশি
      return ((x0 + x1) / 2 < 500) ? 'left' : 'right';
    }
    if (leftOk) return 'left';
    if (rightOk) return 'right';
    return 'wide';
  }

  /**
   * একটি পাতার ব্লকগুলোর ব্যান্ড বিভাজন ও ক্রম তৈরি করে।
   *
   * @param {Array<Object>} pageBlocks — পাতার ব্লক তালিকা
   * @returns {Array<{ cols: 1 | 2, blocks: Array<Object> }>}
   */
  function bands(pageBlocks) {
    if (!Array.isArray(pageBlocks) || !pageBlocks.length) return [];

    // ১. প্রতিটি ব্লকের টাইপ এবং y0 নির্ধারণ (box না থাকা ব্লক পূর্ববর্তী ব্লকের টাইপ ও y গ্রহণ করে)
    let lastType = 'wide';
    let lastY0 = 0;
    const items = [];

    for (let i = 0; i < pageBlocks.length; i++) {
      const b = pageBlocks[i];
      let t = classifyBlock(b);
      let y0 = b.box && Array.isArray(b.box) ? b.box[0] : null;

      if (t == null) {
        // box না থাকা ব্লক পূর্ববর্তী ব্লকের ব্যান্ডে থাকবে
        t = lastType;
        y0 = lastY0 + 0.0001 * (i + 1);
      } else {
        lastType = t;
        lastY0 = y0;
      }
      items.push({ block: b, type: t, y0: y0, origIdx: i });
    }

    // ২. y অনুযায়ী সাজাও (স্থিতিশীল ক্রম রক্ষায় টাই হলে origIdx)
    const sorted = items.slice().sort((p, q) => (p.y0 - q.y0 || p.origIdx - q.origIdx));

    // ৩. পরপর ব্লকের প্রাথমিক ব্যান্ড গঠন (wide -> cols 1, narrow -> cols 2)
    const rawBands = [];
    let curBand = null;

    for (const it of sorted) {
      const targetCols = (it.type === 'wide') ? 1 : 2;
      if (!curBand || curBand.cols !== targetCols) {
        curBand = { cols: targetCols, items: [it] };
        rawBands.push(curBand);
      } else {
        curBand.items.push(it);
      }
    }

    // ৪. ২-কলাম ব্যান্ডের কঠোর যোগ্যতা ও নিরাপত্তা পরীক্ষা (MIXCOL_FIX)
    for (const bnd of rawBands) {
      if (bnd.cols === 2) {
        const left = bnd.items.filter((it) => it.type === 'left');
        const right = bnd.items.filter((it) => it.type === 'right');

        const lElig = left.map((it) => it.block).filter(isEligibleColumnBlock);
        const rElig = right.map((it) => it.block).filter(isEligibleColumnBlock);
        const lChars = lElig.reduce((s, b) => s + cleanCharCount(b), 0);
        const rChars = rElig.reduce((s, b) => s + cleanCharCount(b), 0);
        const lMinX0 = lElig.length ? Math.min(...lElig.map((b) => b.box[1])) : 999;
        const rMinX0 = rElig.length ? Math.min(...rElig.map((b) => b.box[1])) : -1;
        const lMinY0 = lElig.length ? Math.min(...lElig.map((b) => b.box[0])) : 0;
        const lMaxY1 = lElig.length ? Math.max(...lElig.map((b) => b.box[2])) : 0;
        const rMinY0 = rElig.length ? Math.min(...rElig.map((b) => b.box[0])) : 0;
        const rMaxY1 = rElig.length ? Math.max(...rElig.map((b) => b.box[2])) : 0;
        const lSpan = lMaxY1 - lMinY0;
        const rSpan = rMaxY1 - rMinY0;
        const spanRatio = (lSpan > 0 && rSpan > 0) ? Math.min(lSpan, rSpan) / Math.max(lSpan, rSpan) : 0;

        // কঠোর শর্তাবলী:
        // - প্রতিটি দিকে অন্তত ৩টি যোগ্য ব্লক
        // - প্রতি দিকে অন্তত ২০০ অক্ষর (ডট ও স্পেস বাদে)
        // - বাঁ দিকের ব্লক শুরু x0 <= 200, ডানের ব্লক x0 ৪৪০-৬৫০ এর মধ্যে
        // - উল্লম্ব বিস্তার অনুপাত >= ৫০%
        const isValid2Col = (lElig.length >= 3 && rElig.length >= 3) &&
          (lChars >= 200 && rChars >= 200) &&
          (lMinX0 <= 200 && rMinX0 >= 440 && rMinX0 <= 650) &&
          (spanRatio >= 0.50);

        if (!isValid2Col) {
          bnd.cols = 1;
          // ১-কলামে ফিরলে স্বাভাবিক y-ক্রম
          bnd.items.sort((p, q) => p.y0 - q.y0 || p.origIdx - q.origIdx);
        } else {
          // ২-কলামে পড়ার ক্রম: আগে বাঁ কলামের সব (y ক্রমে), তারপর ডান কলামের সব (y ক্রমে)
          left.sort((p, q) => p.y0 - q.y0 || p.origIdx - q.origIdx);
          right.sort((p, q) => p.y0 - q.y0 || p.origIdx - q.origIdx);
          const others = bnd.items.filter((it) => it.type !== 'left' && it.type !== 'right');
          bnd.items = left.concat(right).concat(others);
        }
      }
    }

    // ৫. পাশাপাশি একই cols-এর ব্যান্ড সংযুক্ত (merge) করো
    const merged = [];
    for (const bnd of rawBands) {
      const prev = merged[merged.length - 1];
      if (prev && prev.cols === bnd.cols) {
        prev.items = prev.items.concat(bnd.items);
      } else {
        merged.push({ cols: bnd.cols, items: bnd.items.slice() });
      }
    }

    // ৬. পুরো পাতায় কোনো বৈধ ২-কলাম ব্যান্ড না থাকলে একটাই ১-কলাম ব্যান্ড
    const has2Col = merged.some((m) => m.cols === 2);
    if (!has2Col) {
      const all = items.slice().sort((p, q) => p.y0 - q.y0 || p.origIdx - q.origIdx);
      return [{ cols: 1, blocks: all.map((it) => it.block) }];
    }

    return merged.map((m) => ({
      cols: m.cols,
      blocks: m.items.map((it) => it.block)
    }));
  }

  return {
    bands,
    isWideBlock,
    classifyBlock,
    isEligibleColumnBlock,
    cleanCharCount
  };
});
