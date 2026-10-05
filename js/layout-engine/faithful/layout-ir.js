/**
 * Fayzar — হুবহু-লেআউট নকশা (FayzarLayoutIR)
 * ==========================================
 * Part-17.4/17.5 (ধাপ ৩): Gemini-ব্লক (লেখা/ধরন) + পাতা-মাপ (FayzarPageGeometry) ⇒ ধরন-নিরপেক্ষ লেআউট-নকশা।
 *
 * নকশার গঠন (সব মাপ pt):
 *   { pages: [{ page, widthPt, heightPt, margins:{top,right,bottom,left}, scale, bodyFontPt,
 *       bands: [{ kind:'flow'|'grid', gapBeforePt, y0, y1,
 *         cells: [{ x0, x1, items: [ item ] }] }] }], warnings: [] }
 *   item = { kind:'para', text, lines, keepLines, fontPt, bold, align:'l|c|r|j', indentPt, firstIndentPt, spaceBeforePt, lineSpacingPt, type }
 *        | { kind:'figure', box, widthPt, heightPt, spaceBeforePt }
 *        | { kind:'table', rows:[[cell]], fontPt, spaceBeforePt, widthPt }
 *
 * ১) মাপ স্বাভাবিককরণ (Part-17.5): মূল লেখার অনুমিত ফন্ট ৮–১৫pt হলে আসল মাপ (ডিজিটাল/স্ক্যান করা পাতা);
 *    নইলে (ক্যামেরা-ছবি / বড়-করে-রাখা পাতা) মূল লেখা = ১২pt ধরে পুরো লেআউট একই অনুপাতে, আদর্শ A4-এ বসানো।
 * ২) পাতার একক মূল-লেখা-আকার: কালির উচ্চতা মূলের ±১৫%-এর ভেতরে ⇒ ঠিক একই আকার (মাপের গোলমাল দূর)।
 * ৩) খাড়া (ঘোরানো) লেখা ⇒ ছবি হিসেবে (চেহারা অক্ষত)।
 * ৪) ওপর-থেকে-নিচে আড়াআড়ি সারি; সারিতে পাশাপাশি অংশ ⇒ অদৃশ্য গ্রিড।
 * বিশুদ্ধ ফাংশন — Node-এ টেস্টযোগ্য।
 */
(function (global) {
  'use strict';

  const FS_CLASS = { s: 10, m: 12, l: 14, xl: 18 };
  // Part-17.7: list_item — প্রতিটি মুদ্রিত লাইন আলাদা ভুক্তি (অ = …, ১। শাপলা …); জোড়া দিলে তালিকা এক লাইনে গলে যেত
  const KEEP_TYPES = { label_value: 1, signature: 1, stamp: 1, header: 1, footer: 1, page_number: 1, option_row: 1, caption: 1, list_item: 1 };
  const INK_RATIO = 0.98;                       // Part-17.9 ক্যালিব্রেশন (qa/calibrate-ink.mjs): পূর্ণ বাংলা লাইন ≈ ০.৯৮ × ফন্ট (আগের ১.২৫ ভুল ছিল ⇒ ফন্ট ২২% ছোট)

  /**
   * Part-17.9: লাইনের অক্ষর-শ্রেণি অনুযায়ী কালি-উচ্চতা ÷ ফন্ট-আকার (SutonnyMJ/Times, Word-এ মাপা):
   * বাংলা — কার নেই ০.৮০, ওপরে-কার ০.৮৩, নিচে-কার ০.৮৫, দুটোই ১.০০; ইংরেজি — x-উচ্চতা ০.৪৭, বড়হাতের/অঙ্ক ০.৭১, নিচে-ঝোলা +০.২১।
   * মিশ্র লাইনে যেটি বেশি উঁচু।
   */
  function inkRatioFor(text) {
    const t = String(text || '');
    let r = 0;
    if (/[ঀ-৿]/.test(t)) {
      const up = /[িীেৈোৌঁ]|র্/.test(t);      // ি ী ে ৈ ো ৌ ঁ রেফ
      const lo = /[ুূৃ]|্র/.test(t);                               // ু ূ ৃ ্র (র-ফলা)
      r = Math.max(r, up && lo ? 1.0 : (lo ? 0.85 : (up ? 0.83 : 0.8)));
    }
    if (/[A-Za-z0-9]/.test(t)) {
      const top = /[A-Z0-9bdfhklt(){}[\]'"!?/|ij]/.test(t) ? 0.71 : 0.47;
      const bot = /[gjpqyQJ(){}[\],;]/.test(t) ? 0.21 : 0;          // (Times-এর Q/J-র লেজও নিচে নামে)
      r = Math.max(r, top + bot);
    }
    return r || INK_RATIO;
  }
  const PAPER = { a4p: [595.3, 841.9], a4l: [841.9, 595.3] };
  const median = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const r1 = (v) => Math.round(v * 10) / 10;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /**
   * Part-17.8: Gemini-র লাইন-লেখা + মাপা কালি-অংশ (lineSegs) ⇒ ট্যাব-লাইন।
   * শর্ত: মাপা লাইন-সংখ্যা = লেখার লাইন-সংখ্যা, এবং অন্তত একটি লাইনে ≥২ অংশ। শব্দগুলো অংশে ভাগ হয় অক্ষর-দৈর্ঘ্য ∝ অংশের প্রস্থ ধরে।
   * @returns null | { lines: ['র\tআষাঢ়।', …], stops: [উৎস-x pt, …] (সব লাইনের মিলিত ট্যাব-অবস্থান) }
   */
  function tabify(lines, lineSegs) {
    if (!lineSegs || !lines.length || lineSegs.length !== lines.length) return null;
    if (!lineSegs.some((s) => s.length >= 2)) return null;
    const out = [], stops = [];
    for (let i = 0; i < lines.length; i++) {
      const segs = lineSegs[i] || [];
      const toks = String(lines[i]).trim().split(/\s+/).filter(Boolean);
      if (segs.length < 2 || toks.length < segs.length) { out.push(lines[i]); continue; }
      const totalW = segs.reduce((a, s) => a + s.w, 0);
      const lens = toks.map((t) => t.length + 1);
      const totalC = lens.reduce((a, b) => a + b, 0);
      const parts = []; let ti = 0, cum = 0, wCum = 0;
      for (let j = 0; j < segs.length; j++) {
        wCum += segs[j].w;
        const target = j === segs.length - 1 ? totalC : totalC * wCum / totalW;
        const part = [];
        if (j === segs.length - 1) {
          while (ti < toks.length) part.push(toks[ti++]);
        } else {
          // অন্তত একটি শব্দ; পরের অংশগুলোর প্রতিটির জন্য অন্তত একটি শব্দ রেখে লক্ষ্য-দৈর্ঘ্য পর্যন্ত
          part.push(toks[ti]); cum += lens[ti]; ti++;
          while (ti < toks.length && toks.length - ti > segs.length - 1 - j && cum + lens[ti] / 2 <= target) { part.push(toks[ti]); cum += lens[ti]; ti++; }
        }
        parts.push(part.join(' '));
      }
      out.push(parts.join('\t'));
      segs.slice(1).forEach((s) => stops.push(s.x));
    }
    // কাছাকাছি (≤৬pt) অবস্থান এক
    stops.sort((a, b) => a - b);
    const merged = [];
    for (const s of stops) { if (!merged.length || s - merged[merged.length - 1] > 6) merged.push(s); }
    return { lines: out, stops: merged };
  }

  /**
   * Part-17.9: Gemini আলাদা ছোট টেবিলগুলো (A/B/C…) ফাঁকা সারি দিয়ে এক টেবিলে দেয়; কালিতে সেখানে পুরো-প্রস্থ সাদা ফাঁক।
   * ফাঁকা-সারির দলের সংখ্যা = সাদা ফাঁকের সংখ্যা হলে ফাঁকা সারিতে ভাগ করে আলাদা টেবিল (প্রতিটির নিজের মাপা আয়ত)।
   * মিল না হলে (যেমন উত্তর লেখার ফাঁকা ঘর) অপরিবর্তিত।
   * @returns item বা [item, item, …]
   */
  function splitTableAtGaps(tbl, m) {
    const rows = tbl.rows || [];
    const gaps = m && !m.empty && m.tableGapsPt ? m.tableGapsPt : [];
    if (!gaps.length || !tbl.rect) return tbl;
    const empty = (r) => !r.some((c) => c && String(c).trim());
    // ফাঁকা সারিতে ভাগ (পরপর ফাঁকা সারি একটি ভাগ-বিন্দু)
    const groups = []; let cur = [];
    rows.forEach((r) => { if (empty(r)) { if (cur.length) { groups.push(cur); cur = []; } } else cur.push(r); });
    if (cur.length) groups.push(cur);
    if (groups.length < 2 || groups.length - 1 !== gaps.length) return tbl;
    const R = tbl.rect;
    const edges = [R.y, ...gaps.flatMap((g) => g), R.y + R.h];   // [ওপর, ফাঁক১-শুরু, ফাঁক১-শেষ, …, নিচ]
    // (টেবিলের ভেতরের চিত্র পরে nestFiguresInTables-এ নিজ নিজ ভাগের আয়ত দেখে বসে)
    return groups.map((g, k) => Object.assign({}, tbl, {
      rows: g, rect: { x: R.x, y: edges[2 * k], w: R.w, h: Math.max(1, edges[2 * k + 1] - edges[2 * k]) }, splitPart: k,
      cellAligns: tbl.cellAligns ? g.map((r) => tbl.cellAligns[rows.indexOf(r)] || null) : null
    }));
  }

  /** একটি ব্লক → item (মাপ m থাকলে মাপ অগ্রাধিকার, না থাকলে Gemini-র ইঙ্গিত) */
  function toItem(b, m) {
    const rect = m && !m.empty ? Object.assign({}, m.rectPt) : (m ? Object.assign({}, m.geminiPt) : null);
    const base = { type: b.type, rect, m: m && !m.empty ? m : null, box: b.box };
    if (b.type === 'figure') return Object.assign(base, { kind: 'figure' });
    // খাড়া (ঘোরানো) লেখা: লম্বা-সরু, ১–২ লাইন ⇒ ছবি
    if (rect && rect.h > rect.w * 2.5 && (!b.lines || b.lines.length <= 2) && b.box) return Object.assign(base, { kind: 'figure', rotatedText: true });
    if (b.type === 'table') {
      const rows = (b.lines || []).filter((l) => l.trim()).map((l) => l.split(/\s*\|\s*/).map((c) => c.trim()));
      // সীমানা: কালিতে রেখা-জাল না থাকলে সীমানাহীন (মাপ না থাকলে আগের মতো সীমানাসহ)
      // Part-17.9: ঘরের ফন্ট — সারি-লাইনের কালি-উচ্চতা ÷ টেবিলের লেখার অক্ষর-শ্রেণির অনুপাত (ক্যালিব্রেটেড)
      let cellFontSrc = 0;
      if (m && !m.empty && m.cellInkPt) cellFontSrc = m.cellInkPt / inkRatioFor((b.lines || []).join(' '));
      // প্রস্থ-ভিত্তিক (থাকলে, ১.৫ গুণের ভেতরে) অগ্রাধিকার
      if (m && !m.empty && m.cellWidthFontPt && (!cellFontSrc || (m.cellWidthFontPt / cellFontSrc < 1.5 && cellFontSrc / m.cellWidthFontPt < 1.5))) cellFontSrc = m.cellWidthFontPt;
      // Part-17.8: মাপা কলাম-প্রস্থের অনুপাত (কলাম-ফাঁকের সংখ্যা = কলাম − ১ হলে)
      let colFractions = null;
      const nCols = rows.length ? Math.max(...rows.map((r) => r.length)) : 0;
      if (m && !m.empty && m.colGuttersPt && nCols > 1 && m.colGuttersPt.length === nCols - 1) {
        const R = m.rectPt, edges = [R.x, ...m.colGuttersPt, R.x + R.w];
        colFractions = edges.slice(1).map((e, k) => (e - edges[k]) / R.w);
        if (colFractions.some((f) => f < 0.03)) colFractions = null;
      }
      // Part-17.9: কলামের মাপা অবস্থান (কলাম-সংখ্যা মিললে)
      const colAligns = m && !m.empty && m.colAligns && m.colAligns.length === nCols ? m.colAligns : null;
      // ঘর-ভিত্তিক ব্যতিক্রম: বাঁয়ে-সাজানো কলামে যে ঘরের লেখা স্পষ্টতই মাঝে (শিরোনাম-সারি "Question") ⇒ মাঝে
      let cellAligns = null;
      if (colAligns && m.cellBox && m.colEdgesPt && m.colEdgesPt.length === nCols + 1) {
        const ne = rows.map((r, i) => i).filter((i) => rows[i].some((c) => c));
        if (ne.length === m.cellBox.length) {
          cellAligns = rows.map(() => null);
          const insets = m.colEdgesPt.slice(0, -1).map((e0, j) => median(m.cellBox.map((r) => r[j]).filter(Boolean).map((bx) => bx[0] - e0)));
          ne.forEach((ri, k) => {
            cellAligns[ri] = m.cellBox[k].map((bx, j) => {
              if (!bx || colAligns[j] !== 'l') return null;
              const e0 = m.colEdgesPt[j], e1 = m.colEdgesPt[j + 1], L = bx[0] - e0, R = e1 - bx[1];
              return L > insets[j] + 8 && Math.abs(L - R) < (e1 - e0) * 0.25 ? 'c' : null;
            });
          });
        }
      }
      const tbl = Object.assign(base, { kind: 'table', rows, borderless: !!(m && !m.empty && m.hasGrid === false), cellFontSrc, colFractions, colAligns, cellAligns,
        colGapPt: m && !m.empty && m.colGapMinPt ? m.colGapMinPt : 0 });
      return splitTableAtGaps(tbl, m);
    }
    let align = (m && !m.empty && m.align) || b.align || 'l';
    let keepLines = !!(KEEP_TYPES[b.type] || (m && m.ragged && b.type !== 'paragraph') || (b.lines && b.lines.length > 1 && align === 'c'));
    // Part-17.8: লাইনের ভেতরের চওড়া ফাঁক ⇒ ট্যাব (মাপা x-অবস্থানে)
    const tabs = align !== 'c' && m && !m.empty ? tabify(b.lines || [], m.lineSegs) : null;
    if (tabs && (b.lines || []).length > 1) keepLines = true;
    // Part-17.9: ট্যাবওয়ালা লাইন বাঁয়ে (ডানে-বসানো + ট্যাব Word-এ ভেঙে কয়েক লাইন হতো — "সর্বমোট=  ১০০"); অবস্থান ট্যাব-স্টপই দেয়
    if (tabs) align = 'l';
    return Object.assign(base, {
      kind: 'para', text: b.text || '', lines: b.lines || [], keepLines, fs: b.fs,
      tabLines: tabs ? tabs.lines : null, tabStopsSrc: tabs ? tabs.stops : null,
      italic: !!b.italic, underline: !!b.underline || !!(m && m.underline),
      bold: !!b.bold || b.type === 'title' || b.type === 'heading', align,
      firstIndentPt: m && m.firstIndentPt && Math.abs(m.firstIndentPt) >= 4 ? m.firstIndentPt : 0,
      lineSpacingPt: m && m.pitchPt ? m.pitchPt : 0
    });
  }

  /** পাতার স্বাভাবিককরণ: স্কেল, কাগজ, মার্জিন, মূল-লেখা-আকার; item-এর rect/ফন্ট রূপান্তর */
  function normalizePage(items, src) {
    const withRect = items.filter((it) => it.rect && it.rect.w > 0);
    // মূল-লেখা অনুমানে শুধু নির্ভরযোগ্য মাপ (মাপা লাইন ≈ Gemini-র লাইন) — না হলে কাত পাতায় অনুচ্ছেদ-উচ্চতাই "লাইন" হয়ে যেত
    const paras = items.filter((it) => it.kind === 'para' && it.m && it.m.lineInkPt > 0 &&
      !((it.lines || []).length >= 2 && it.m.lines.length < it.lines.length * 0.6));
    // Part-17.9: প্রতিটি অনুচ্ছেদের ফন্ট = কালি-উচ্চতা ÷ তার নিজের অক্ষর-শ্রেণির অনুপাত; মূল লেখা = লাইন-সংখ্যায় ভারিত মধ্যমা
    // Part-17.9: প্রস্থ-ভিত্তিক অনুমান (আমাদের ফন্টে এই লেখা মাপা প্রস্থে আঁটে যে আকারে) থাকলে সেটিই — উচ্চতা-অনুমানের ±১০% গোলমাল নেই,
    // লাইন-ভাঙনও মূলের মতো হয়। দুটির পার্থক্য ১.৫ গুণের বেশি হলে (লেখা ভুল/অসম্পূর্ণ) উচ্চতা-অনুমান।
    const estOf = (it) => {
      const hEst = it.m.lineInkPt / inkRatioFor(it.text || (it.lines || []).join(' '));
      const wEst = it.m.widthFontPt;
      // উচ্চতা ভুল হয় পাশের লাইন জুড়ে গেলে (বেশি দেখায়) ⇒ প্রস্থ ছোট হলে প্রস্থই ঠিক; প্রস্থ অনেক বড় হলে (Gemini-র লেখা ছাপার চেয়ে ছোট) উচ্চতা
      return wEst && wEst <= hEst * 1.6 ? wEst : hEst;
    };
    const ests = []; paras.forEach((it) => { const e = estOf(it); for (let k = 0; k < Math.max(1, it.m.lines.length); k++) ests.push(e); });
    const bodyInk = median(ests);          // (নাম পুরোনো — এখন ফন্ট-অনুমান pt)
    const eFont = bodyInk || 12;
    // Part-17.9: আসল কাগজ-মাপের পাতা (PDF: A4/লেটার/লিগ্যাল…) ⇒ সবসময় আসল মাপ (প্রচ্ছদে মূল-লেখা ১৪–১৬pt স্বাভাবিক);
    // কাগজ-মাপ নয় (ক্যামেরা-ছবি, পিক্সেল-মাপ) ⇒ মূল-লেখা ১২pt ধরে A4-এ স্বাভাবিককরণ
    const paperOk = src.widthPt >= 400 && src.widthPt <= 1300 && src.heightPt >= 400 && src.heightPt <= 1800;
    let scale = paperOk && eFont >= 6 && eFont <= 24 ? 1 : 12 / eFont;
    const bodyFont = scale === 1 ? Math.round(eFont * 2) / 2 : 12;
    // বিষয়বস্তুর সীমা (ব্লক-সমষ্টি — পাতার কিনারার ছায়া/দাগ নয়)
    const C = withRect.length ? {
      x0: Math.min(...withRect.map((it) => it.rect.x)), y0: Math.min(...withRect.map((it) => it.rect.y)),
      x1: Math.max(...withRect.map((it) => it.rect.x + it.rect.w)), y1: Math.max(...withRect.map((it) => it.rect.y + it.rect.h))
    } : { x0: 54, y0: 54, x1: src.widthPt - 54, y1: 120 };
    let paperW = src.widthPt, paperH = src.heightPt, left, top;
    const standardSize = src.widthPt >= 400 && src.heightPt >= 400;
    if (scale === 1 && standardSize) {
      left = C.x0; top = C.y0;                                          // আসল মাপ: মূল মার্জিন
    } else {
      let W = (C.x1 - C.x0) * scale;
      const portrait = (C.y1 - C.y0) * scale >= W * 0.6 || W <= PAPER.a4p[0] - 72;
      [paperW, paperH] = portrait ? PAPER.a4p : PAPER.a4l;
      const maxW = paperW - 72;
      if (W > maxW) { scale *= maxW / W; W = maxW; }                      // কাগজে না আঁটলে আরও ছোট
      left = Math.max(36, Math.min(72, (paperW - W) / 2));
      top = 54;
    }
    const map = (r) => ({ x: left + (r.x - C.x0) * scale, y: top + (r.y - C.y0) * scale, w: r.w * scale, h: r.h * scale });
    for (const it of items) {
      if (it.rect) it.rect = map(it.rect);
      if (it.tabStopsSrc) it.tabStopsAbs = it.tabStopsSrc.map((x) => left + (x - C.x0) * scale);
      if (it.kind === 'para') {
        // মাপা লাইন Gemini-র লাইনের তুলনায় অনেক কম ⇒ লাইন আলাদা হয়নি (কাত/ঘন ছাপা) ⇒ মাপ অবিশ্বাস্য, মূল-লেখার আকার
        const textLines = (it.lines && it.lines.length) || 1;
        const reliable = it.m && it.m.lineInkPt && bodyInk && !(textLines >= 2 && it.m.lines.length < textLines * 0.6);
        let ratio = reliable ? estOf(it) / bodyInk : (FS_CLASS[it.fs] || 12) / 12;
        // শিরোনাম-জাতীয় ছাড়া সাধারণ লেখা মূল-লেখার কাছাকাছি (মাপের গোলমাল সীমিত)
        if (!/^(title|heading|header)$/.test(it.type)) ratio = clamp(ratio, 0.7, 1.3);
        // অতি-ছোট লেখা ("১।", "র") — অক্ষর-শ্রেণির অনুমানও অনিশ্চিত ⇒ ছোট করা নয়
        const avgLen = (it.text || '').replace(/\s+/g, ' ').length / textLines;
        if (ratio < 1 && avgLen < 5 && it.type !== 'page_number') ratio = 1;
        // অনুপাত এখন ক্যালিব্রেটেড ⇒ মূল-লেখার ±১০%-এ হলে ঠিক মূল-লেখার আকার
        it.fontPt = Math.abs(ratio - 1) <= 0.1 ? bodyFont : clamp(Math.round(bodyFont * ratio * 2) / 2, 6, 60);
        // Part-17.9: মোটা/হেলানো — কালির রেখা-পুরুত্ব (ফন্ট-অনুপাতে) পুরো ফাইলের সাধারণ লেখার সাথে তুলনা; Gemini-র কথা শুধু মাপ না থাকলে
        if (it.m && it.m.lineInkPt > 0) it.diag = { inkPt: r1(it.m.lineInkPt), estPt: r1(estOf(it)), wPt: it.m.widthFontPt ? r1(it.m.widthFontPt) : null, ratio: inkRatioFor(it.text), lines: it.m.lines.length,
          sl: it.m.slant || 0, slQ: it.m.slantGain ? Math.round(it.m.slantGain * 1000) / 1000 : null, sH: Math.round((it.m.strokeHPt || 0) * 100) / 100, sV: Math.round((it.m.strokeVPt || 0) * 100) / 100, dens: Math.round((it.m.inkDensity || 0) * 1000) / 1000 };
        // মোটা কিনা পরে পুরো ফাইল মিলিয়ে (build-এর শেষে) — চূড়ান্ত ফন্টের অনুপাতে রেখা-পুরুত্ব
        if (it.m && it.m.strokePt > 0 && it.m.lineInkPt > 0) it._stroke = it.m.strokePt * scale;
        if (it.m && it.m.slant >= 0.1) it.italic = true;
        if (!reliable) it.lineSpacingPt = 0;
        // লাইন-দূরত্ব ফন্টের ১.৬ গুণের বেশি ⇒ মাপ অবিশ্বাস্য (দুই লাইন জোড়া পড়েছে) — Word-এর স্বাভাবিক দূরত্ব
        if (it.lineSpacingPt > it.fontPt * 1.6) it.lineSpacingPt = 0;
        it.lineSpacingPt = r1((it.lineSpacingPt || 0) * scale);
        it.firstIndentPt = r1((it.firstIndentPt || 0) * scale);
      } else if (it.kind === 'table') {
        // Part-17.8: মাপা ঘরের ফন্ট (মূল-লেখার ±১৫%-এ হলে মূল-লেখার আকার); মাপ না থাকলে আগের মতো
        const est = it.cellFontSrc ? it.cellFontSrc * scale : 0;
        it.fontPt = est ? (Math.abs(est - bodyFont) <= bodyFont * 0.1 ? bodyFont : clamp(Math.round(est * 2) / 2, 7, 18)) : Math.min(bodyFont, 12);
      }
      if (it.kind === 'figure' || it.kind === 'table') { it.widthPt = it.rect ? r1(it.rect.w) : 0; it.heightPt = it.rect ? r1(it.rect.h) : 0; }
      delete it.m;
    }
    const contentRight = left + (C.x1 - C.x0) * scale;
    const margins = {
      top: r1(clamp(top, 18, paperH * 0.25)), left: r1(clamp(left, 18, paperW * 0.25)),
      right: r1(clamp(paperW - contentRight, 18, paperW * 0.4)), bottom: 36
    };
    return { widthPt: r1(paperW), heightPt: r1(paperH), margins, scale: Math.round(scale * 1000) / 1000, bodyFontPt: bodyFont,
      xform: { left, top, x0: C.x0, y0: C.y0, scale } };
  }

  /** একটি পাতার item-তালিকা (rect স্বাভাবিককৃত) → সারি ও কলাম */
  function bandsOf(items, page) {
    const withRect = items.filter((it) => it.rect);
    const noRect = items.filter((it) => !it.rect);
    withRect.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
    const bands = [];
    for (const it of withRect) {
      const r = it.rect;
      const band = bands[bands.length - 1];
      if (band && r.y < band.y1 - Math.min(r.h, band.minH) * 0.3) {
        band.items.push(it); band.y1 = Math.max(band.y1, r.y + r.h); band.minH = Math.min(band.minH, r.h);
      } else bands.push({ y0: r.y, y1: r.y + r.h, minH: Math.max(1, r.h), items: [it] });
    }
    if (noRect.length) {
      if (!bands.length) bands.push({ y0: page.margins.top, y1: page.margins.top, minH: 12, items: [] });
      const lb = bands[bands.length - 1];
      lb.items.push(...noRect.map((it) => Object.assign(it, { rect: { x: page.margins.left, y: lb.y1, w: page.widthPt - page.margins.left - page.margins.right, h: 0 } })));
    }
    const left = page.margins.left, right = page.widthPt - page.margins.right;
    let prevY1 = page.margins.top;
    return bands.map((band) => {
      const byX = band.items.slice().sort((a, b) => a.rect.x - b.rect.x);
      const cols = [];
      for (const it of byX) {
        const c = cols[cols.length - 1];
        if (c && it.rect.x < c.x1 - 2) { c.items.push(it); c.x1 = Math.max(c.x1, it.rect.x + it.rect.w); }
        else cols.push({ x0: it.rect.x, x1: it.rect.x + it.rect.w, items: [it] });
      }
      const gapBeforePt = r1(Math.max(0, band.y0 - prevY1));
      prevY1 = Math.max(prevY1, band.y1);
      const cells = cols.map((c, i) => {
        const cx0 = i === 0 ? left : r1((cols[i - 1].x1 + c.x0) / 2);
        const cx1 = i === cols.length - 1 ? Math.max(right, c.x1) : r1((c.x1 + cols[i + 1].x0) / 2);
        c.items.sort((a, b) => a.rect.y - b.rect.y);
        let yPrev = band.y0;
        const items = c.items.map((it, k) => {
          const out = Object.assign({}, it);
          out.indentPt = r1(Math.max(0, it.rect.x - cx0));
          // Part-17.7: মাঝে/ডানে বসানো লেখায় বাম-ইনডেন্ট নয় — কেন্দ্রের সরণ / ডান-কিনারার দূরত্ব (নইলে দুবার সরে ডানে চলে যেত)
          if (it.kind === 'para' && it.align === 'c') {
            // এক পাশে দ্বিগুণ ইনডেন্ট লাইনের জায়গা কমায় ⇒ লেখার পাশে যতটুকু ফাঁকা আছে তার মধ্যেই সরণ (নইলে শিরোনাম দুই লাইনে ভাঙত)
            const slack = Math.max(0, ((cx1 - cx0) - it.rect.w * 1.06) / 2);
            out.centerShiftPt = r1(clamp((it.rect.x + it.rect.w / 2) - (cx0 + cx1) / 2, -slack, slack));
          }
          if (it.kind === 'para' && it.align === 'r') out.rightIndentPt = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
          // Part-17.8: ট্যাব-অবস্থান ঘর/স্তম্ভের বাম কিনারা থেকে (Word-নিয়ম; ইনডেন্ট থেকে নয়)
          if (it.tabStopsAbs) out.tabStops = it.tabStopsAbs.map((x) => r1(x - cx0)).filter((x) => x > out.indentPt + 2);
          out.spaceBeforePt = r1(Math.max(0, it.rect.y - (k === 0 ? band.y0 : yPrev)));
          yPrev = it.rect.y + it.rect.h;
          return out;
        });
        return { x0: r1(cx0), x1: r1(cx1), items };
      });
      return { kind: cells.length > 1 ? 'grid' : 'flow', gapBeforePt, y0: r1(band.y0), y1: r1(band.y1), cells };
    });
  }

  /** একই পাতার একই ধরনের প্রবাহ-অনুচ্ছেদের ইনডেন্ট কাছাকাছি (≤৬pt) হলে এক (মাপের ছোট গোলমাল দূর — ক/খ/গ/ঘ এক সারিতে) */
  function snapIndents(page) {
    const groups = {};
    page.bands.filter((b) => b.kind === 'flow').forEach((b) => b.cells[0].items.forEach((it) => {
      if (it.kind === 'para') (groups[it.type] = groups[it.type] || []).push(it);
    }));
    for (const arr of Object.values(groups)) {
      const sorted = arr.slice().sort((a, b) => a.indentPt - b.indentPt);
      let cluster = [];
      const flush = () => { if (cluster.length > 1) { const m = median(cluster.map((x) => x.indentPt)); cluster.forEach((x) => { x.indentPt = r1(m); }); } cluster = []; };
      for (const it of sorted) {
        if (cluster.length && it.indentPt - cluster[0].indentPt > 6) flush();
        cluster.push(it);
      }
      flush();
      // Part-17.6: হালকা ছাপা ("গ." ধূসর) কালি-মাপে বাদ পড়লে ইনডেন্ট ভুল বড় হয় — Gemini-বক্সের বাম প্রান্ত (≤০.৮% পাতা)
      // অন্তত দুটি একই-ধরনের অনুচ্ছেদের সাথে মিললে তাদের ইনডেন্ট (দুই স্বাধীন সংকেত একমত হলে তবেই)
      const boxed = arr.filter((x) => Array.isArray(x.box) && isFinite(x.box[1]));
      const fixes = [];
      for (const it of boxed) {
        const peers = boxed.filter((p) => p !== it && Math.abs(p.box[1] - it.box[1]) <= 8);
        if (peers.length < 2) continue;
        const m = median(peers.map((p) => p.indentPt));
        if (Math.abs(it.indentPt - m) > 6 && peers.every((p) => Math.abs(p.indentPt - m) <= 6)) fixes.push([it, m]);
      }
      fixes.forEach(([it, m]) => { it.indentPt = r1(m); });
    }
  }

  /**
   * Part-17.6: একই পাতার একই ধরনের অনুচ্ছেদ (শিরোনাম-জাতীয় বাদে) — ফন্ট গোষ্ঠীর মধ্যমার ±২৫%-এর ভেতরে হলে মধ্যমা।
   * (আসল ছবিতে দেখা: চার অপশনের একটি ("গ.") উঁচু কার/উদ্ধৃতি-চিহ্নে বড় মাপা হয়ে বড় ফন্টে আসত।)
   */
  function snapFonts(page) {
    const groups = {};
    page.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
      if (it.kind === 'para' && it.fontPt && !/^(title|heading|header)$/.test(it.type)) (groups[it.type] = groups[it.type] || []).push(it);
    })));
    for (const arr of Object.values(groups)) {
      if (arr.length < 2) continue;
      const m = median(arr.map((x) => x.fontPt));
      // Part-17.9: প্রস্থ-ভিত্তিক অনুমান নির্ভুল ⇒ শুধু মাপের গোলমাল (±৮%) এক করা; আসল আকার-পার্থক্য রাখা
      arr.forEach((x) => { if (Math.abs(x.fontPt - m) <= m * 0.08) x.fontPt = m; });
    }
  }

  /**
   * Part-17.8: পাশাপাশি কলামের মাঝের খাড়া দাগ (উৎস-মাপ) ⇒ গ্রিড-ঘরের ডান সীমানা; কলাম-সীমা দাগের অবস্থানে।
   * শর্ত: দাগ দুই কলামের লেখার ফাঁকে, আর সারির উচ্চতার ≥৫০% জুড়ে।
   */
  function applyVerticalRules(page, vrules) {
    if (!vrules || !vrules.length || !page.xform) return;
    const X = page.xform;
    const rules = vrules.map((v) => ({ x: X.left + (v.x - X.x0) * X.scale, y0: X.top + (v.y - X.y0) * X.scale, y1: X.top + (v.y + v.h - X.y0) * X.scale }));
    for (const band of page.bands) {
      if (band.kind !== 'grid') continue;
      for (let i = 0; i < band.cells.length - 1; i++) {
        const A = band.cells[i], B = band.cells[i + 1];
        const aR = Math.max(...A.items.map((it) => (it.rect ? it.rect.x + it.rect.w : A.x0)));
        const bL = Math.min(...B.items.map((it) => (it.rect ? it.rect.x : B.x1)));
        const r = rules.find((v) => v.x >= aR - 2 && v.x <= bL + 2 && (Math.min(v.y1, band.y1) - Math.max(v.y0, band.y0)) >= (band.y1 - band.y0) * 0.5);
        if (!r) continue;
        A.ruleRight = true;
        const dx = r1(r.x) - B.x0;
        A.x1 = r1(r.x); B.x0 = r1(r.x);
        // B-র ভেতরের ইনডেন্ট/ট্যাব নতুন কলাম-শুরু থেকে
        B.items.forEach((it) => { if (it.indentPt != null) it.indentPt = r1(Math.max(0, it.indentPt - dx)); if (it.tabStops) it.tabStops = it.tabStops.map((t) => r1(t - dx)); });
      }
    }
  }

  /**
   * Part-17.7: টেবিলের ভেতরে থাকা চিত্র (কেন্দ্র টেবিল-আয়তের ভেতরে) ⇒ সেই সারি/কলামের ঘরে (সমান ভাগ ধরে)।
   * আগে চিত্রগুলো টেবিলের নিচে আলাদা নামত ("ছবির সাথে মিলাও" প্রশ্ন)। items থেকে সরিয়ে table.cellFigures-এ রাখে।
   */
  function nestFiguresInTables(items) {
    const tables = items.filter((it) => it.kind === 'table' && it.rect && it.rows && it.rows.length);
    if (!tables.length) return;
    for (let k = items.length - 1; k >= 0; k--) {
      const f = items[k];
      if (f.kind !== 'figure' || !f.rect) continue;
      const cx = f.rect.x + f.rect.w / 2, cy = f.rect.y + f.rect.h / 2;
      const t = tables.find((tb) => cx > tb.rect.x && cx < tb.rect.x + tb.rect.w && cy > tb.rect.y && cy < tb.rect.y + tb.rect.h);
      if (!t) continue;
      const nCols = Math.max(...t.rows.map((r) => r.length));
      const r = clamp(Math.floor((cy - t.rect.y) / t.rect.h * t.rows.length), 0, t.rows.length - 1);
      const c = clamp(Math.floor((cx - t.rect.x) / t.rect.w * nCols), 0, nCols - 1);
      (t.cellFigures = t.cellFigures || []).push(Object.assign(f, { cell: [r, c] }));
      items.splice(k, 1);
    }
  }

  /**
   * @param capture  FayzarFaithfulCapture.run ফল ({ blocks, pages })
   * @param measures { [blockIndex]: blockMetrics ফল }, pageInfo { [page]: { widthPt, heightPt } }
   */
  function build(capture, measures, pageInfo) {
    const warnings = [];
    const pages = [];
    const pageNos = [...new Set(capture.blocks.map((b) => b.page))].sort((a, b) => a - b);
    for (const pn of pageNos) {
      const info = (pageInfo && pageInfo[pn]) || {};
      const cp = (capture.pages || []).find((p) => p.page === pn) || {};
      const src = { widthPt: info.widthPt || cp.widthPt || 595.3, heightPt: info.heightPt || cp.heightPt || 841.9 };
      // (Part-17.9: একটি টেবিল-ব্লক ফাঁকে ভাগ হয়ে একাধিক item হতে পারে)
      const items = capture.blocks.filter((b) => b.page === pn).flatMap((b) => [].concat(toItem(b, measures && measures[b.i])));
      items.filter((it) => !it.rect).forEach(() => warnings.push({ page: pn, kind: 'block_without_box' }));
      const norm = normalizePage(items, src);
      nestFiguresInTables(items);
      const page = Object.assign({ page: pn }, norm);
      if (info.drift) page.drift = { a: Math.round(info.drift.a * 10000) / 10000, b: Math.round(info.drift.b * 100) / 100, n: info.drift.n };   // নির্ণয়ের জন্য
      // Part-17.7: পাতার বর্ডার-ফ্রেম (একক/দ্বৈত) — লেখা থেকে ফ্রেমের দূরত্বসহ (আসল মাপে; স্বাভাবিককৃত পাতায় স্কেল করা)
      if (info.frame && info.frame.rectPt) {
        const f = info.frame.rectPt, s = page.scale || 1;
        const C = { x: page.margins.left, y: page.margins.top };
        const items0 = items.filter((it) => it.rect);
        const cx0 = items0.length ? Math.min(...items0.map((it) => it.rect.x)) : C.x;
        const cy0 = items0.length ? Math.min(...items0.map((it) => it.rect.y)) : C.y;
        const cx1 = items0.length ? Math.max(...items0.map((it) => it.rect.x + it.rect.w)) : page.widthPt - page.margins.right;
        const cy1 = items0.length ? Math.max(...items0.map((it) => it.rect.y + it.rect.h)) : page.heightPt - page.margins.bottom;
        // উৎস-স্থানাঙ্কে ফ্রেম-থেকে-লেখা দূরত্ব (scale=1 হলে item.rect উৎস-স্থানাঙ্কেই)
        const gap = s === 1 ? { top: cy0 - f.y, left: cx0 - f.x, right: f.x + f.w - cx1, bottom: f.y + f.h - cy1 } : { top: 12, left: 12, right: 12, bottom: 12 };
        page.frame = { style: info.frame.style, spacePt: { top: r1(clamp(gap.top, 0, 31)), left: r1(clamp(gap.left, 0, 31)), right: r1(clamp(gap.right, 0, 31)), bottom: r1(clamp(gap.bottom, 0, 31)) } };
        // নিচের মার্জিন = ফ্রেমের ভেতরের নিচ পর্যন্ত (নইলে নিচের বর্ডার পাতার কিনারায় নামত)।
        // লেখা ফ্রেমের ৪pt আগ পর্যন্ত যেতে পারে — মূলের শেষ লাইনে ঠিক থামালে Word-এর সামান্য বেশি উচ্চতায় শেষ লাইন (পাতা-নম্বর) পরের পাতায় যেত
        if (s === 1) {
          // Part-17.8: ওপরের মার্জিন = ফ্রেমের ঠিক ভেতরে (প্রথম লেখা পর্যন্ত ফাঁক প্রথম সারির আগের ফাঁক হিসেবে) — নইলে ফ্রেম নিচে নামত
          if (gap.top > 31) { page.frame.spacePt.top = 4; page.margins.top = r1(Math.max(18, f.y + 4)); }
          page.frame.spacePt.bottom = 4;
          page.margins.bottom = r1(Math.max(24, page.heightPt - (f.y + f.h) + 4));
        }
      }
      page.bands = bandsOf(items, page);
      snapIndents(page);
      snapFonts(page);
      applyVerticalRules(page, info.vrules);
      delete page.xform;
      pages.push(page);
    }
    decideBold(pages);
    return { pages, warnings };
  }

  /**
   * Part-17.9: মোটা লেখা — রেখা-পুরুত্ব ÷ চূড়ান্ত ফন্ট (একই ফন্টে সাধারণ ≈০.০৮, মোটা ≈০.১১+)। পুরো ফাইলের লেখা-লাইনের
   * ৩০তম শতাংশ = সাধারণ লেখার মান; তার ১.২২ গুণ বা বেশি ⇒ মোটা। মাপ না থাকলে Gemini-র কথা।
   * "**…**" অংশ-মোটা চিহ্ন থাকলে পুরো ব্লক মোটা নয়।
   */
  function decideBold(pages) {
    const all = [];
    pages.forEach((p) => p.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => { if (it.kind === 'para' && it._stroke && it.fontPt) all.push(it); }))));
    // লিপি আলাদা (Times-এর সাধারণ রেখা বাংলার চেয়ে পুরু) ⇒ বাংলা-প্রধান ও ইংরেজি-প্রধান লাইনের আলাদা মানদণ্ড
    const script = (it) => ((it.text || '').match(/[ঀ-৿]/g) || []).length >= ((it.text || '').match(/[A-Za-z0-9]/g) || []).length ? 'bn' : 'en';
    // আকার-প্রভাব: ছোট লেখায় পুরুত্ব÷ফন্ট বেশি, বড় লেখায় কম (মাপা: ১১pt ১.১১, ১৮pt ০.৯২, ২৭pt ০.৮৫ — সাধারণ লেখা)
    // ⇒ মূল-আকারের সাথে চতুর্থ-মূল অনুপাতে সমান করা
    const fs = all.map((it) => it.fontPt).sort((a, b) => a - b);
    const fMed = fs.length ? fs[Math.floor(fs.length / 2)] : 12;
    const norm = (it) => (it._stroke / it.fontPt) / Math.pow(fMed / it.fontPt, 0.25);
    const refs = {};
    ['bn', 'en'].forEach((sc) => {
      const vals = [];
      all.filter((it) => script(it) === sc).forEach((it) => { const v = norm(it); for (let k = 0; k < Math.max(1, (it.diag && it.diag.lines) || 1); k++) vals.push(v); });
      vals.sort((a, b) => a - b);
      refs[sc] = vals.length >= 4 ? vals[Math.floor(vals.length * 0.3)] : 0;
    });
    all.forEach((it) => {
      const v = norm(it), ref = refs[script(it)];
      if (it.diag) it.diag.stroke = ref ? Math.round(v / ref * 100) / 100 : null;
      // (২.pdf-এ আকার-সমন্বয়ের পরে মাপা: সাধারণ ≤১.১২, মোটা ≥১.১৩–১.৫৭ ⇒ সীমা ১.১৩)
      if (ref && !/\*\*/.test(it.text || '')) it.bold = v >= ref * 1.13;
      delete it._stroke;
    });
  }

  const FayzarLayoutIR = { FS_CLASS, INK_RATIO, inkRatioFor, toItem, tabify, normalizePage, bandsOf, snapIndents, snapFonts, applyVerticalRules, build };
  global.FayzarLayoutIR = FayzarLayoutIR;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarLayoutIR;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
