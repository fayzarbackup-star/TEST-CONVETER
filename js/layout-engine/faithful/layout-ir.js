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
  // [প্যাক-১১ গেট-ফাংশন] GRIDFIRST, FORMFIX, PLEADER ডিফল্ট-চালু; যেকোনো সুইচ বা নিয়ম window.__FZ_OFF_<নাম> (FZ_OFF=<নাম>) দিয়ে বন্ধযোগ্য।
  const fzOn = (k) => !(typeof globalThis !== 'undefined' ? globalThis['__FZ_OFF_' + k] : global['__FZ_OFF_' + k]);

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
      // CV (২০২৬-১০-১২): লেবেল : মান — অক্ষর-অনুপাতে ভাগ কোলনের এক-দুই শব্দ পরে পড়ত ("Father’s Name : Md. | Golap Hossin")।
      // দুই অংশে, ভাগ কোলনের ±২ শব্দে হলে ভাগ কোলনে: একা ':' অনুপাত যেদিকে বলে সেদিকে, "Name:" ⇒ পরে, ":Md" ⇒ আগে
      if (segs.length === 2) {
        const k = parts[0].split(' ').length;   // প্রথম অংশের শব্দ-সংখ্যা
        const ci = toks.findIndex((t) => t === ':' || /^[^:]+:$/.test(t) || /^:[^:]+$/.test(t));
        if (ci >= 0 && Math.abs(k - (ci + 0.5)) <= 2.5) {
          const cut = toks[ci] === ':' ? (k <= ci ? ci : ci + 1) : (/:$/.test(toks[ci]) ? ci + 1 : ci);
          if (cut > 0 && cut < toks.length) { parts[0] = toks.slice(0, cut).join(' '); parts[1] = toks.slice(cut).join(' '); }
        }
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
      rows: g, rect: { x: R.x, y: edges[2 * k], w: R.w, h: Math.max(1, edges[2 * k + 1] - edges[2 * k]) }, splitPart: k, rowHeightsPt: null, rowBand: null, headShade: k ? null : tbl.headShade,
      cellAligns: tbl.cellAligns ? g.map((r) => tbl.cellAligns[rows.indexOf(r)] || null) : null
    }));
  }

  /**
   * a18: সারির মাপা উচ্চতা — পুরো-প্রস্থ আড়া-রেখার ভাগ (hRulesPt) + টেবিলের লেখা-লাইন (textLinesPt)।
   * Gemini-সারি ক্রমে লেখা-লাইনে (অনুমিত মোড়ানো-লাইন, মোট মাপা লাইনে মাপমতো) ⇒ কোন ভাগে; লেখাহীন ভাগ ফাঁকা সারি পায়
   * (মূলে লেখার জায়গা সবচেয়ে উঁচু — আগে ফাঁকা সারি সাধারণের ০.৪ ভাগ ধরা হতো)। ভাগের উচ্চতা তার সারিগুলোতে লাইন-অনুপাতে।
   * অসংগত (ক্রম উল্টো, সারি বাদ) ⇒ null (আগের নিয়ম)
   */
  function rowBandHeights(rows, m, fr, fs, opts) {
    if (!m || m.empty || !m.hasGrid || !m.rectPt || !Array.isArray(m.hRulesPt) || rows.length < 2) return null;   // ২০২৬-১০-১৩: ২ সারিও (a12: শিরোনাম-সারি ২৯, পরেরটি ১৪pt)
    const H = [];
    m.hRulesPt.slice().sort((a, c) => a - c).forEach((y) => { if (!H.length || y - H[H.length - 1] > 3) H.push(y); });
    // ২০২৬-১০-১৪ (a19): ছকের ওপরে/নিচে দাগহীন সারি (মূলে "১। পরীক্ষার নাম" বাক্সের বাইরে; শেষ দাগের নিচে "৯।"-এর লাইন) — সেই
    // লেখা-লাইন কোনো ভাগে পড়ত না ⇒ সব সারি এক ভাগ সরে যেত। মাপা আয়তের কিনারা তখন ভাগ-সীমা
    if (!globalThis.__FZ_OFF_RECTEDGE && H.length >= 2 && Array.isArray(m.textLinesPt)) {
      const top = m.rectPt.y, bot = m.rectPt.y + m.rectPt.h, H2 = H.slice();
      if (H2[0] - top > 6 && m.textLinesPt.some((y) => y > top && y < H2[0] - 2)) H2.unshift(top);
      if (bot - H2[H2.length - 1] > 6 && m.textLinesPt.some((y) => y > H2[H2.length - 1] + 2 && y < bot)) H2.push(bot);
      // শুধু যখন কিনারা যোগে ভাগ ≈ সারি (±১) হয় (a19: ৭⇒৯ ভাগ, ৯ সারি); f1-এ (২৪ সারি, হালকা রেখা মাপা যায় না) ভাগ ভুল জায়গায় ⇒ ৫৯→৫৫
      const nb = (A) => A.length - 1;
      const hasVGrid = Array.isArray(m.vRulesPt) && m.vRulesPt.length >= 2;
      if ((Math.abs(nb(H2) - rows.length) <= 1 || (hasVGrid && nb(H2) <= rows.length)) && Math.abs(nb(H2) - rows.length) < Math.abs(nb(H) - rows.length)) H.splice(0, H.length, ...H2);
    }
    const bands = [];
    for (let k = 1; k < H.length; k++) if (H[k] - H[k - 1] >= 4) bands.push({ y0: H[k - 1], y1: H[k], rows: [], text: 0 });
    if (bands.length < 2) return null;
    // a07 পাতা ৪ (কাত স্ক্যান: লেখা-লাইন ১টিই মাপা): ভাগ-সংখ্যা = সারি-সংখ্যা, ফাঁকা সারি নেই ⇒ সারি i = ভাগ i (অনুমান লাগে না)
    if (!globalThis.__FZ_OFF_BAND && bands.length === rows.length && rows.every((r) => r.some((c) => c && String(c).trim()))) return bands.map((b) => b.y1 - b.y0);
    const nC = Math.max(...rows.map((r) => r.length)), W = m.rectPt.w;
    const wrap = (t, cw) => String(t || '').split('\n').reduce((a, ln) => a + (Math.ceil(ln.replace(/[ঁ-ঃ়া-্ৗ]/g, '').replace(/([._\-…·─])\1{5,}/g, (s) => s.slice(0, 6)).length * fs * 0.45 / Math.max(20, cw)) || 1), 0);
    const empty = rows.map((r) => !r.some((c) => c && String(c).trim()));
    let est = rows.map((r, i) => (empty[i] ? 0 : Math.max(1, ...r.map((c, k) => (c ? wrap(c, W * (fr ? fr[k] : 1 / nC) - 10.8) : 1)))));
    // ২০২৬-১০-১৪ (a18): ঘরের পরের ঘরগুলো ফাঁকা ⇒ লেখা সেগুলো জুড়ে (জোড়া-ঘর, "বিঃদ্রঃ" পুরো-প্রস্থ) — কলাম-প্রস্থে মোড়ানো-অনুমান
    // প্রতি লাইনে ৪ লাইন ধরত ⇒ 'prop'-এ ওপরের সারিগুলো ভুল ভাগে। মাপা লাইন-সংখ্যার কাছের অনুমানটি নেওয়া হয় (নিচে)
    const estSpan = rows.map((r, i) => (empty[i] ? 0 : Math.max(1, ...r.map((c, k) => {
      if (!c) return 1;
      let e = k + 1; while (e < r.length && !(r[e] && String(r[e]).trim())) e++;
      const f = fr ? fr.slice(k, e).reduce((a, x) => a + x, 0) : (e - k) / nC;
      return wrap(c, W * f - 10.8);
    }))));
    // [Rule IR1: FZ_OFF=FORMFIX / FZ_OFF=IR1] আদর্শ মাপের পাতায় (W <= 650pt) বডি-সারিযুক্ত ছকের প্রথম ব্যান্ডের মাপা উচ্চতা <= 18pt হলে এবং শিরোনামে কোনো '\n' না থাকলে est[0] = 1 ধরা হবে।
    if (fzOn('FORMFIX') && !globalThis.__FZ_OFF_IR1 && W <= 650 && bands.length >= 2 && (bands[0].y1 - bands[0].y0) <= 18 && rows[0] && rows[0].every((c) => !String(c || '').includes('\n')) && rows.slice(1).some((r) => r.some((c) => c && String(c).trim()))) {
      est[0] = 1; estSpan[0] = 1;
    }
    // ভাগের ভেতরের ভাগ-উচ্চতা: সারিগুলোতে লাইন-অনুপাতে; সারি না পাওয়া ভাগ পাশের ভাগে জোড়া
    const heightsOf = (band) => {
      band.forEach((b, i) => bands[b].rows.push(i));
      for (let b = 0; b < bands.length; b++) {
        if (bands[b].rows.length) continue;
        const t = bands.slice(0, b).reverse().find((x) => x.rows.length) || bands.slice(b + 1).find((x) => x.rows.length);
        if (!t) return null;
        t.extra = (t.extra || 0) + bands[b].y1 - bands[b].y0;
      }
      const h = rows.map(() => 0);
      bands.forEach((b) => {
        if (!b.rows.length) return;
        const hasText = b.rows.some((i) => !empty[i]);
        const w = b.rows.map((i) => (empty[i] ? (hasText ? 0.4 : 1) : est[i]));
        const sw = w.reduce((a, x) => a + x, 0);
        b.rows.forEach((i, k) => { h[i] = (b.y1 - b.y0 + (b.extra || 0)) * w[k] / sw; });
      });
      return h;
    };
    // ২০২৬-১০-১৩ (row-ink.js): ভাগে মাপা কালি-উচ্চতা ⇒ লাইন; সারি ক্রমে DP-তে (লেখা-লাইন গোনা লাগে না — কাত স্ক্যানেও চলে)
    const RI = global.FayzarRowInk || (typeof require === 'function' ? (() => { try { return require('./row-ink.js'); } catch (e) { return null; } })() : null);
    // ভাগ ≈ সারি (±১, a05 বেতন-বিল) ⇒ প্রায় এক-ভাগে-এক, নিচের নিয়মই ভালো (DP-তে a05 ছবি ৫৬.৬→৫২.৯)
    const oneToOne = rows.length >= 5 && Math.abs(bands.length - rows.length) <= 1;
    // মাপা ফল (a05 −৩.৭, a14 −০.৩, a16 +০.৭ ছবি) নেতিবাচক ⇒ ডিফল্টে বন্ধ; পরীক্ষায় FZ_ON=INK
    if (RI && globalThis.__FZ_ON_INK && !oneToOne && !(opts && opts.bandsOnly) && Array.isArray(m.textInkPt) && m.textInkPt.length) {
      const bi = RI.assign(est, RI.bandLines(bands, m.textInkPt, fs * 1.25));
      const h = bi && heightsOf(bi);
      if (h) return h;
      bands.forEach((b) => { b.rows = []; b.extra = 0; });
    }
    if (!Array.isArray(m.textLinesPt)) return null;
    const bandOf = (y) => bands.findIndex((b) => y >= b.y0 && y < b.y1);
    const L = m.textLinesPt.filter((y) => bandOf(y) >= 0).sort((a, c) => a - c);
    // a05 (কাত স্ক্যান): ভাগ ≈ সারি (৩০ রেখা, ৩০ সারি) অথচ মাপা লেখা-লাইন ৩টি ⇒ লাইন-ধরে বণ্টন আবোলতাবোল (৪৫/৯/৩pt);
    // মূলে সারি প্রায় সমান ⇒ মাপা রেখা-পরিসর সমান ভাগে
    if (!globalThis.__FZ_OFF_EVEN && !(opts && opts.bandsOnly) && rows.length >= 5 && Math.abs(bands.length - rows.length) <= 1 &&
        L.length < rows.filter((r) => r.some((c) => c && String(c).trim())).length * 0.8) {
      const span = bands[bands.length - 1].y1 - bands[0].y0;
      return rows.map(() => span / rows.length);
    }
    if (!L.length) return null;
    L.forEach((y) => { bands[bandOf(y)].text++; });
    // ≤৬ কলাম (a04: ১৭ কলামের প্রায়-ফাঁকা রেজিস্টারে "ফাঁকা পাশের ঘর জুড়ে" অনুমান অবাস্তব ⇒ ৭→৯ পাতা)
    if (!globalThis.__FZ_OFF_SPANEST && nC <= 6) {
      const E1 = est.reduce((a, b) => a + b, 0), E2 = estSpan.reduce((a, b) => a + b, 0);
      if (Math.abs(E2 - L.length) < Math.abs(E1 - L.length)) est = estSpan;
    }
    const E = est.reduce((a, b) => a + b, 0);
    if (!E) return null;
    // ২০২৬-১০-১৪ (f1): রেখা-ভাগ কম (হালকা ধূসর সারি-রেখা মাপা যায় না) অথচ মাপা লাইন ≈ লেখা-সারি ⇒ সারির উচ্চতা সরাসরি লাইন-অবস্থান থেকে
    // (সংখ্যা-বাক্সের সারি মূলে উঁচু — অনুমান-অনুপাতে সমান ধরা হতো ⇒ নিচের সারিগুলো ২৬pt ওপরে)। বন্ধ: FZ_OFF=LINEH
    {
      const nT = est.filter((e) => e > 0).length;
      const isFoldedTbl = !!(opts && opts.folded) || rows.some((r) => r.some((c) => c === "0"));
      const Lall = m.rectPt ? m.textLinesPt.filter((y) => y >= m.rectPt.y - 2 && y <= m.rectPt.y + m.rectPt.h + 2).sort((a, c) => a - c) : L;
      if ((globalThis.__FZ_ON_LINEH || isFoldedTbl) && !globalThis.__FZ_OFF_LINEH && !(opts && opts.bandsOnly) && !(L.length === nT && nT >= 4 && bands.length >= 4) && bands.length < nT * 0.6 && Lall.length >= nT && Lall.length <= E + 2 && m.rectPt) {
        const lh = lineRowHeights(Lall, m.rectPt.y, m.rectPt.y + m.rectPt.h);
        if (lh) return lh;
      }
    }
    function lineRowHeights(Ls, top, bot) {
      const T = rows.map((r, i) => i).filter((i) => !empty[i]);
      let extra = Ls.length - T.length;
      const want = T.map(() => 1);
      const multi = T.map((i, k) => k).filter((k) => est[T[k]] > 1);
      const sw = multi.reduce((a, k) => a + est[T[k]] - 1, 0);
      if (extra > 0 && sw > 0) {
        // প্রথমে ঘরের ভেতরের ঘন লাইন-গুচ্ছ (ফাঁক ≤ ২৪pt) দেখে বহু-লাইনের সারিতে লাইন বণ্টন
        const maxGap = Math.max(22, (fs || 11) * 2.1);
        let c0 = 0, ok = true;
        const wCluster = T.map((ri, k) => {
          if (c0 >= Ls.length) { ok = false; return 1; }
          let n = 1, cap = est[ri];
          while (n < cap && c0 + n < Ls.length && Ls[c0 + n] - Ls[c0 + n - 1] <= maxGap && (Ls.length - (c0 + n)) >= (T.length - 1 - k)) n++;
          c0 += n;
          return n;
        });
        if (ok && c0 === Ls.length) {
          wCluster.forEach((v, k) => { want[k] = v; });
        } else {
          multi.forEach((k) => { const add = Math.min(est[T[k]] - 1, Math.round(extra * (est[T[k]] - 1) / sw)); want[k] += add; });
          let s = want.reduce((a, b) => a + b, 0);
          while (s < Ls.length) { const k = multi.find((q) => want[q] < est[T[q]]); if (k == null) break; want[k]++; s++; }
          while (s > Ls.length) { const k = multi.slice().reverse().find((q) => want[q] > 1); if (k == null) break; want[k]--; s--; }
        }
      }
      if (want.reduce((a, b) => a + b, 0) !== Ls.length) return null;
      const span = []; let c = 0;
      T.forEach((i, k) => { span.push([Ls[c], Ls[c + want[k] - 1]]); c += want[k]; });
      const h = rows.map(() => 0), shift = rows.map(() => 0);
      let prevBot = top;
      T.forEach((i, k) => {
        const b = k < T.length - 1 ? (span[k][1] + span[k + 1][0]) / 2 : bot;
        h[i] = Math.max(1, b - prevBot);
        shift[i] = Math.round(((span[k][0] + span[k][1]) / 2 - (prevBot + b) / 2) * 10) / 10;
        prevBot = b;
      });
      // ফাঁকা সারি: আগের লেখা-সারি থেকে ≤৬pt
      rows.forEach((r, i) => { if (!empty[i]) return; const o = T.filter((t) => t < i).pop(); const own = o != null ? o : T[0]; if (own == null) return; const e = Math.min(6, h[own] * 0.2); h[i] = e; h[own] -= e; });
      h.shift = shift;
      return h;
    }
    // সারি ⇒ মাপা লেখা-লাইন ⇒ ভাগ। ধরন ক্রমে চেষ্টা, প্রথম বৈধটি:
    //  'seq'  — মাপা লাইন ≥ অনুমিত লাইন ⇒ ক্রমে (a10: বাড়তি "লাইন" = নিচের ফাঁকা লেখার-ঘরের হাতের দাগ/ছিটে; অনুপাতে ধরলে
    //           শিরোনামের ২য় লাইন শেষ ভাগে সরত)
    //  'one'  — মাপা লাইন ≥ লেখা-সারি ⇒ প্রতি সারি এক লাইন (সরু কলামে মোড়ানো-অনুমান বেশি: a10 শিরোনাম)
    //  'prop' — আগের মতো অনুপাতে (লাইন জুড়ে গেছে)
    // বৈধতা: ক্রম উল্টো নয়; পরের প্রতিটি ফাঁকা সারির নিজস্ব ভাগ লাগে ⇒ সারি সেই সীমার ওপরে ('prop'-এ সীমায় টানা)
    const nTxt = est.filter((e) => e > 0).length;
    const assign = (mode, free) => {
      const bd = rows.map(() => -1);
      let cum = 0, lst = -1;
      for (let i = 0; i < rows.length; i++) {
        if (empty[i]) continue;
        const idx = mode === 'seq' ? Math.floor(cum + (est[i] - 1) / 2) : mode === 'one' ? cum : Math.floor((cum + est[i] / 2) * L.length / E);
        let b = bandOf(L[Math.min(L.length - 1, idx)]);
        const after = empty.slice(i + 1).filter(Boolean).length, lim = bands.length - 1 - after;
        // a18 (২০২৬-১০-১৫): আগের লেখা-সারি আর এর মাঝে k-টি ফাঁকা সারি ⇒ এটি অন্তত k ভাগ নিচে (ফাঁকা সারির নিজস্ব ভাগ — মূলের
        // ১৭৯pt লেখার-ঘর); নইলে 'prop'-এ "বিঃদ্রঃ" সারি ঐ ফাঁকা ভাগে উঠে যেত, ফাঁকা সারি ৩pt
        const gapE = i - 1 - Math.max(-1, ...bd.map((x, j) => (x >= 0 ? j : -1)));
        // free (হুবহু এক-লাইন-এক-সারি): মাপা লাইনই অবস্থান ⇒ ফাঁকা-সারির নিজস্ব-ভাগ শর্ত লাগে না
        if (!free && !globalThis.__FZ_OFF_EGAP && b >= 0 && gapE > 0 && lst + 1 + gapE > b && lst + 1 + gapE <= lim) b = lst + 1 + gapE;
        if (!free && after && b > lim && mode !== 'prop') return null;   // 'prop' = আগের আচরণ, অপরিবর্তিত
        if (b < 0 || b < lst) return null;   // লাইন কোনো ভাগে পড়েনি ⇒ b=-1 ⇒ পরে bands[-1] ক্র্যাশ (a07-এ দেখা)
        bd[i] = lst = b; cum += mode === 'one' ? 1 : est[i];
      }
      return bd;
    };
    // নতুন ধরন শুধু যখন সারি প্রায় এক-ভাগে-এক (ভাগ ≥ লেখা-সারির ৬০%: a10); বহু-সারি/ভাগ (f1: ২৮ সারি, ৮ ভাগ) ঘরে বহু লাইন ⇒ অনুপাতই ঠিক
    const noNew = globalThis.__FZ_OFF_BAND || bands.length < nTxt * 0.6;
    // ২০২৬-১০-১৪ (a18): মাপা লাইন = লেখা-সারি হুবহু ⇒ প্রতি সারি এক লাইন সবচেয়ে বিশ্বস্ত (মোড়ানো-অনুমান লাগে না), ভাগ কম হলেও
    // রেখা-ভাগ ≥৪ (ছক সত্যিই রেখায় ভাগ করা) — a14 (২ ভাগ, ১৪ সারি) সংখ্যা-মিল কাকতালীয়, হুবহু-উচ্চতায় −৩
    // মাপা: SPANEST-এর পরে a18-এ হুবহু ধরন (৪৮–৫২) সাধারণ পথের (৫৩.৬) চেয়ে খারাপ ⇒ ডিফল্টে বন্ধ (FZ_ON=EXACT1)
    const exact = (globalThis.__FZ_ON_EXACT1 || (rows.length >= 24 && bands.length <= 6)) && !globalThis.__FZ_OFF_EXACT1 && L.length === nTxt && nTxt >= 4 && bands.length >= 4;
    if (globalThis.__FZ_DBG) console.log('rowBand', JSON.stringify({ rows: rows.length, bands: bands.length, L: L.length, nTxt, E, est }));
    const bx = exact ? assign('one', true) : null, exactUsed = !!bx;
    const oneOk = L.length >= nTxt && (L.length <= nTxt * 1.35 || Math.abs(L.length - nTxt) <= Math.abs(L.length - E));
    const band = bx || (!noNew && L.length >= E && assign('seq')) || (!noNew && oneOk && assign('one')) || assign('prop');
    if (!band) return null;
    // ২০২৬-১০-১৪ (a18): ভাগে মাপা লেখা-লাইনের চেয়ে বেশি লেখা-সারি ⇒ শেষের সারিগুলো পরের ভাগে ("প্রধান হিসাব রক্ষণ…" ৭ লাইনের ভাগে
    // ৮ম সারি হয়ে দাগের ওপরে বসত)। ক্রম অটুট থাকে (শেষের সারি নিচে নামে)। FZ_OFF=BANDCAP
    if (!globalThis.__FZ_OFF_BANDCAP) {
      for (let b = 0; b < bands.length - 1; b++) {
        const rs = band.map((x, i) => (x === b && !empty[i] ? i : -1)).filter((i) => i >= 0);
        const cap = bands[b].text;
        if (cap > 0 && rs.length > cap) rs.slice(cap).forEach((i) => { band[i] = b + 1; });
      }
    }
    // ফাঁকা সারি: আগের ও পরের লেখা-সারির ভাগের মাঝের লেখাহীন ভাগ (ক্রমে), না থাকলে আগের সারির ভাগ
    const used = new Set(band.filter((b) => b >= 0));
    for (let i = 0; i < rows.length; i++) {
      if (!empty[i]) continue;
      const p = Math.max(-1, ...band.slice(0, i));
      const nx = band.slice(i + 1).find((b) => b >= 0);
      const q = nx == null ? bands.length : nx;
      let pick = -1;
      // শেষ লেখা-সারির ভাগের নিচে মাপা "লেখা" = হাতের দাগ/ছিটে (a10) ⇒ লেখাহীন ধরা
      const lastTB = Math.max(-1, ...band);
      for (let b = p + 1; b < q; b++) if ((!bands[b].text || (b > lastTB && !globalThis.__FZ_OFF_BAND)) && !used.has(b)) { pick = b; break; }
      if (pick < 0) pick = p >= 0 ? p : (q < bands.length ? q : -1);
      if (pick < 0) return null;
      band[i] = pick; used.add(pick);
    }
    if (opts && opts.bandsOnly) return { band, n: bands.length, text: bands.map((b) => b.text), nLines: L.length, nTxt };
    if (exactUsed && !globalThis.__FZ_OFF_EXACTH) { const hx = exactHeights(band); if (hx) return hx; bands.forEach((b) => { b.rows = []; b.extra = 0; }); }
    return heightsOf(band);
    // হুবহু ধরনে সারি-উচ্চতা মাপা লাইন থেকে: লেখা-সারির সীমা = পাশের লাইনের মাঝ-বিন্দু; ফাঁকা সারি ≤৬pt (আগের লেখা-সারি থেকে কাটা)
    function exactHeights(bd) {
      const yOf = {}; let k = 0;
      rows.forEach((r, i) => { if (!empty[i]) yOf[i] = L[k++]; });
      bd.forEach((b, i) => bands[b].rows.push(i));
      const h = rows.map(() => 0), lh = Math.max(14, Math.min(16.5, (fs || 11.5) * 1.35));
      for (const b of bands) {
        if (!b.rows.length) return null;
        const R = b.rows, T = R.filter((i) => !empty[i]);
        if (!T.length) { R.forEach((i) => { h[i] = (b.y1 - b.y0) / R.length; }); continue; }
        const tTop = {}, tBot = {};
        T.forEach((i, j) => {
          const empBefore = j === 0 ? R[0] < i : T[j - 1] + 1 < i;
          const empAfter  = j === T.length - 1 ? R[R.length - 1] > i : i + 1 < T[j + 1];
          tTop[i] = empBefore ? Math.max(b.y0 + (R[0] < i ? 2 : 0), yOf[i] - lh / 2) : (j === 0 ? b.y0 : (yOf[T[j - 1]] + yOf[i]) / 2);
          tBot[i] = empAfter  ? Math.min(b.y1 - (R[R.length - 1] > i ? 2 : 0), yOf[i] + lh / 2) : (j === T.length - 1 ? b.y1 : (yOf[i] + yOf[T[j + 1]]) / 2);
          h[i] = Math.max(12, tBot[i] - tTop[i]);
        });
        let idx = 0;
        while (idx < R.length) {
          if (!empty[R[idx]]) { idx++; continue; }
          const e0 = idx;
          while (idx < R.length && empty[R[idx]]) idx++;
          const prevT = e0 > 0 ? R[e0 - 1] : null, nextT = idx < R.length ? R[idx] : null;
          const yA = prevT != null ? tBot[prevT] : b.y0, yB = nextT != null ? tTop[nextT] : b.y1;
          const each = Math.max(2, (yB - yA) / (idx - e0));
          for (let q = e0; q < idx; q++) h[R[q]] = each;
        }
        const sumB = R.reduce((a, i) => a + h[i], 0), targetB = b.y1 - b.y0;
        if (sumB > 0 && Math.abs(sumB - targetB) > 0.1) R.forEach((i) => { h[i] *= targetB / sumB; });
      }
      const shift = rows.map(() => 0);
      for (const b of bands) {
        let top = b.y0;
        b.rows.forEach((i) => { if (!empty[i]) shift[i] = Math.round((yOf[i] - (top + h[i] / 2)) * 10) / 10; top += h[i]; });
      }
      h.exact = true; h.shift = shift;
      return h;
    }
  }

  /** একটি ব্লক → item (মাপ m থাকলে মাপ অগ্রাধিকার, না থাকলে Gemini-র ইঙ্গিত) */
  /** অর্থহীন লেখা: একই অক্ষরের পুনরাবৃত্তি ("cccccccccc", "~~~~") বা স্বরবর্ণহীন লম্বা লাতিন অক্ষরমালা ("xjkwrtz") */
  function isScribble(t) {
    const s = String(t || '').replace(/\s+/g, '');
    if (s.length < 4 || /^[_.\-─━═=…·*]+$/.test(s)) return false;   // সই-রেখা/বিন্দু-সারি লেখাই থাকে (builder-এর leader-ট্যাব)
    if (/^(.)\1{3,}$/u.test(s)) return true;
    return /^[A-Za-z]{6,}$/.test(s) && !/[aeiouy]/i.test(s);
  }

  /**
   * g41: সীমানাওয়ালা ছকের Gemini-সারি (প্রতি মুদ্রিত লাইনে একটি) ⇒ রেখা-ব্যান্ডের সারি (ঘরে '\n'-যুক্ত বহু লাইন)।
   * শুধু তখন, যখন জাল আছে, আড়াআড়ি রেখা ≥২ আর ব্যান্ড < সারি; ব্যান্ড ১-এর বেশি হলে লাইন-কেন্দ্র (textLinesPt) সারির সমান সংখ্যায় থাকা চাই।
   * @returns নতুন সারি বা null (বদল নয়)
   */
  function mergeLineRows(rows, m) {
    if (!m || m.empty || !m.hasGrid || !Array.isArray(m.hRulesPt) || m.hRulesPt.length < 2 || rows.length < 2) return null;
    const R = m.hRulesPt.slice().sort((a, b) => a - b), bands = R.length - 1;
    if (bands >= rows.length) return null;
    const L = Array.isArray(m.textLinesPt) ? m.textLinesPt : [];
    let bandOf;
    // ২০২৬-১০-১৪ (a17 p10): শেষ পূর্ণ রেখার নিচের লেখা-লাইন ("সর্বমোট =", নিচের দাগ শুধু ডানের কলামে) শেষ ভাগে টেনে ২০-নং সারিতে জুড়ত ⇒
    // নিজস্ব অতিরিক্ত ভাগ। বন্ধ: FZ_OFF=BELOWLAST
    const xb = !globalThis.__FZ_OFF_BELOWLAST && L.length === rows.length && L.some((y) => y > R[R.length - 1] + 2) ? 1 : 0;
    if (bands === 1 && !xb) bandOf = () => 0;
    else if (L.length === rows.length) bandOf = (i) => Math.max(0, Math.min(bands - 1 + xb, R.slice(1).filter((y) => y < L[i]).length));
    else {
      // a07 (কাত স্ক্যানে লেখা-লাইন গোনা অবিশ্বস্ত): প্রথম ঘর ফাঁকা সারি = আগের সারির ধারাবাহিক অংশ (ক্রমিক-কলামের ফরম)।
      // দল-সংখ্যা = ব্যান্ড-সংখ্যা হলে দল ধরে
      if (!rows[0][0]) return null;
      const grp = []; let g = -1;
      rows.forEach((r) => { if (r[0]) g++; grp.push(g); });
      if (g + 1 !== bands) return null;
      bandOf = (i) => grp[i];
    }
    const nCols = Math.max(...rows.map((r) => r.length));
    // g41: এক-ব্যান্ড ২-কলামে Gemini কখনো কলাম ধরে পড়ে — [a1..ak-1], [ak | b1], [b2..bm]
    // (শুধু মাঝের একটি লাইনে '|') ⇒ কলাম ১ = a1..ak, কলাম ২ = b1..bm
    if (bands === 1 && nCols === 2) {
      const multi = rows.map((r, i) => (r.length > 1 ? i : -1)).filter((i) => i >= 0);
      const k = multi[0];
      if (multi.length === 1 && rows[k].length === 2 && k > 0 && k < rows.length - 1 && rows.every((r, i) => i === k || r.length === 1)) {
        const a = rows.slice(0, k).map((r) => r[0]).concat(rows[k][0]), bb = [rows[k][1]].concat(rows.slice(k + 1).map((r) => r[0]));
        return [[a.filter(Boolean).join('\n'), bb.filter(Boolean).join('\n')]];
      }
    }
    // f1 (অনলাইন-ফরম): সারির কলাম-সংখ্যা ভিন্ন (লেবেল|মান, সংখ্যা-বাক্স, রেডিও-লাইন) ⇒ এটা বহু-লাইনের ঘর নয়;
    // হালকা সারি-রেখা কালিতে না ধরায় ব্যান্ড কম দেখায় — জোড়া নয়
    if (rows.some((r) => r.length !== nCols)) return null;
    // a18: পুরো-ফাঁকা সারি (Gemini আলাদা মুদ্রিত সারি হিসেবেই লেখে) থাকলে সারিগুলো আসল — রেখা কম ধরা মাপের ভুল, জোড়া নয়
    if (nCols > 1 && rows.some((r) => r.every((c) => !c))) return null;
    const out = Array.from({ length: bands + xb }, () => Array.from({ length: nCols }, () => []));
    rows.forEach((r, i) => r.forEach((c, j) => { if (c) out[bandOf(i)][j].push(c); }));
    const res = out.filter((r) => r.some((c) => c.length)).map((r) => r.map((c) => c.join('\n')));
    return res.length && res.length < rows.length ? res : null;
  }

  /**
   * a19 (মালিকের টেস্ট, ২০২৬-১০-১৩): ক্রমিক-কলামের ফরম-ছক ("২। | বিবরণ | মান")-এ Gemini প্রতিটি মুদ্রিত লাইন আলাদা সারি দেয়,
   * আর ধারাবাহিক লাইনে ফাঁকা ক্রমিক-ঘর বাদ দেয় ("তার বিবরণ। যিনি…", "দিতে হবে। | নাম : ……") ⇒ সারির ঘর-সংখ্যা ভিন্ন,
   * mergeLineRows জোড়ে না; প্রতিটি লাইন আলাদা সারি হয়ে ছক ৩০ সারি, কলাম ভুল। ক্রমিকহীন সারি = আগের ক্রমিক-সারির ধারাবাহিক:
   * ঘর এক কলাম ডানে; এক-ঘরের "লেবেল : ……" ⇒ শেষ কলাম, অন্য লেখা ⇒ বিবরণ-কলাম। ফেরত: নতুন সারি বা null
   */
  const SERIAL = /^\(?[০-৯0-9]{1,2}\s*[।.)]?$/;
  function foldSerialRows(rows) {
    if (rows.length < 3 || !SERIAL.test(rows[0][0] || '') || rows[0].length < 2) return null;
    const isSer = (r) => SERIAL.test(r[0] || '') && r.length >= 2;
    const cont = rows.filter((r) => !isSer(r));
    // পুরো-ফাঁকা সারি = আলাদা ছোট টেবিলের মাঝের ফাঁক (splitTableAtGaps-এর কাজ) ⇒ বদল নয়
    if (cont.some((r) => r.every((c) => !c))) return null;
    // ধারাবাহিক নেই, বা ধারাবাহিক সারির ভেতরে ক্রমিক (পাশাপাশি দুই অংশের ছক) ⇒ বদল নয়
    if (!cont.length || cont.some((r) => r.some((c) => SERIAL.test(c || '')))) return null;
    const nCols = Math.max(...rows.filter(isSer).map((r) => r.length));
    if (nCols < 2 || cont.some((r) => r.length > nCols)) return null;
    const LABEL = /[:ঃ]\s*([.…_\-]{3,}.*)?$/;
    const groups = [];
    for (const r of rows) {
      if (isSer(r)) { groups.push(Array.from({ length: nCols }, (_, j) => (r[j] ? [r[j]] : []))); continue; }
      const g = groups[groups.length - 1];
      let cols;
      if (r[0] === '' && r.length > 1) cols = r.map((_, j) => j);                         // Gemini ফাঁকা ক্রমিক-ঘর রেখেছে
      else if (r.length === 1) cols = [nCols >= 3 && LABEL.test(r[0]) ? nCols - 1 : 1];
      else cols = r.map((_, j) => Math.min(nCols - 1, j + 1));
      r.forEach((c, j) => { if (c) g[cols[j]].push(c); });
    }
    return groups.length < rows.length ? groups.map((g) => g.map((c) => c.join('\n'))) : null;
  }

  /** ঘরের ভেতরের সংখ্যা-বাক্সের চিহ্ন: BOX_MARK + ঘরগুলো BOX_SEP দিয়ে (builder ছোট ভেতরের টেবিল আঁকে) */
  const BOX_MARK = '\u0001box:', BOX_SEP = '\u0002';

  /**
   * f1/B9: লেবেল|মান ফরম-ছক (অর্ধেকের বেশি সারি ২-ঘরের)। কয়েকটি সারিতে লেবেলের পরে অনেক ছোট ঘর (≤২ অক্ষর: মোবাইল/NID-এর
   * সংখ্যা-বাক্স) ⇒ ২ কলামই, বাক্সগুলো মান-ঘরে চিহ্ন হয়ে; আলাদা লাইনের রেডিও-বিকল্প (○ …) ⇒ আগের সারির মান-ঘরে নতুন লাইন।
   * (≥৩০% সারি ২-ঘরের হতে হবে; ২-এর বেশি ঘরের প্রতিটি সারি বাক্স-সারি না হলে বদল নয়)
   * নইলে পুরো ছক ১৮ সমান কলামে ভাঙত, লেবেল অক্ষরে-অক্ষরে মোড়াত (৩ পাতা ⇒ ৭)।
   * @returns নতুন সারি বা null (বদল নয়)
   */
  function foldBoxRows(rows) {
    // ≥৩০% সারি ২-ঘরের (f1 পাতা-২: অনেক রেডিও-লাইন এক-ঘরের); বাকিগুলো ১-ঘরের বা বাক্স-সারি
    if (rows.length < 4 || rows.filter((r) => r.length === 2).length < rows.length * 0.3) return null;
    const isBox = (r) => r.length >= 6 && r.slice(1).every((c) => c.length <= 2);
    const isOpt = (r) => r.length === 1 && /^[○●◯◉□☐☑■✓✔•◦]/.test(r[0]);
    if (rows.some((r) => r.length > 2 && !isBox(r))) return null;
    if (!rows.some(isBox) && !rows.some(isOpt)) return null;
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const last = out[out.length - 1];
      const nx = rows[i + 1];
      if (r.length === 1 && !isOpt(r) && nx && (nx.length === 2 || isBox(nx)) &&
          (/^[(\[]/.test(String(nx[0] || '').trim()) || /সংখ্যার হতে হবে/.test(String(nx[0] || '')) ||
           (!/[:*]$/.test(String(r[0] || '').trim()) && /[:*]$/.test(String(nx[0] || '').trim()) && String(nx[0] || '').trim().length <= 28))) {
        rows[i + 1] = [String(r[0]).trim() + '\n' + String(nx[0] || '').trim(), ...nx.slice(1)];
        continue;
      }
      if (isBox(r)) out.push([r[0], BOX_MARK + r.slice(1).join(BOX_SEP)]);
      else if (isOpt(r) && last && last.length === 2 && last[1] && !last[1].startsWith(BOX_MARK)) last[1] += '\n' + r[0];
      else out.push(r.slice());
    }
    return out;
  }

  /**
   * a03 (২০২৬-১০-১২): Gemini লেবেল ("পোষ্ট কোড :") আর তার ঠিক ডানের সংখ্যা-বাক্স (এক সারির ফাঁকা/≤২-অক্ষরের ছোট টেবিল)
   * আলাদা দিলে একই কলামে পড়ে একটির নিচে আরেকটি বসত (ঘর ৩৬pt-এর জায়গায় ৫৪pt, পরের সব নামত)।
   * ⇒ এক সারির সীমানাহীন ২-ঘরের টেবিল [লেবেল | বাক্স] (foldBoxRows-এর মতো BOX_MARK)। items (একটি কলামের) জায়গায় বদলায়।
   */
  function attachBoxLabels(items) {
    const isBoxTbl = (t) => t.kind === 'table' && t.rect && t.rows && t.rows.length === 1 && t.rows[0].length >= 2
      && t.rows[0].every((c) => String(c || '').trim().length <= 2);
    for (const t of items.filter(isBoxTbl)) {
      const tr = t.rect;
      const lab = items.find((p) => p.kind === 'para' && p.rect && !(p.tabLines && p.tabLines.length > 1) && (p.lines || []).length <= 1
        && String(p.text || '').length <= 40 && p.rect.x + p.rect.w <= tr.x + 4 && tr.x - (p.rect.x + p.rect.w) <= 24
        && Math.abs((p.rect.y + p.rect.h / 2) - (tr.y + tr.h / 2)) <= Math.max(6, tr.h / 2));
      if (!lab) continue;
      const x0 = lab.rect.x, x1 = tr.x + tr.w, y0 = Math.min(lab.rect.y, tr.y), y1 = Math.max(lab.rect.y + lab.rect.h, tr.y + tr.h);
      const fl = Math.min(0.9, Math.max(0.1, (tr.x - 2 - x0) / (x1 - x0)));
      Object.assign(t, {
        rows: [[String(lab.text || '').trim(), BOX_MARK + t.rows[0].map((c) => String(c || '').trim()).join(BOX_SEP)]],
        rect: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, widthPt: x1 - x0, heightPt: y1 - y0, borderless: true,
        colFractions: [fl, 1 - fl], colAligns: ['l', 'l'], cellAligns: null, rowHeightsPt: null, rowWeights: null,
        fontPt: lab.fontPt || t.fontPt, bold: lab.bold, boxLabel: true
      });
      items.splice(items.indexOf(lab), 1);
    }
  }

  /**
   * ২০২৬-১০-১৪ (2.pdf সিলেবাস): দাগহীন ছকে মাপা কলাম Gemini-র চেয়ে ঠিক একটি বেশি, আর মাঝের একটি মাপা কলাম প্রায় সব সারিতে
   * (≥৮০%) ফাঁকা — শিরোনাম-সারির "বিবরণ" ঘরের মাঝে বসায় লেখার ফাঁক দুই ভাগ। ⇒ ঐ কলাম বাঁয়ের কলামে জোড়া, যাতে মাপা
   * কলাম-প্রস্থ ও বাঁ/ডান সাজ কাজে লাগে (নইলে সংখ্যা না মেলায় সব বাদ ⇒ বিবরণ-কলাম মাঝে)। বন্ধ: FZ_OFF=EMPTYCOL
   */
  function dropEmptyMeasuredCol(m, nCols) {
    if (globalThis.__FZ_OFF_EMPTYCOL || !m || m.empty || m.hasGrid !== false || !Array.isArray(m.colAligns) || !Array.isArray(m.cellBox)) return m;
    const n = m.colAligns.length;
    if (n !== nCols + 1 || !Array.isArray(m.colEdgesPt) || m.colEdgesPt.length !== n + 1 || m.cellBox.length < 3) return m;
    let j = -1;
    for (let k = 1; k < n - 1; k++) if (m.cellBox.filter((r) => !r[k]).length >= m.cellBox.length * 0.8) { j = k; break; }
    if (j < 0) return m;
    const join = (a, c) => (a && c ? [Math.min(a[0], c[0]), Math.max(a[1], c[1])] : a || c);
    const cellBox = m.cellBox.map((r) => r.slice(0, j - 1).concat([join(r[j - 1], r[j])], r.slice(j + 1)));
    const colEdgesPt = m.colEdgesPt.filter((_, k) => k !== j);
    return Object.assign({}, m, { cellBox, colEdgesPt, cellInk: cellBox.map((r) => r.map((x) => (x ? x[1] - x[0] : 0))),
      colAligns: m.colAligns.filter((_, k) => k !== j), colGuttersPt: Array.isArray(m.colGuttersPt) ? m.colGuttersPt.filter((_, k) => k !== j - 1) : m.colGuttersPt });
  }

  /**
   * ২০২৬-১০-১৪ (a16, মালিকের Word-যাচাই): মূলে ব্লকের কিছু লাইনে/লাইনের শুরুর অংশে নিচে-দাগ ("সওব্য-২ শাখা", "বিষয়"-এর ২য় লাইন,
   * "বিতরণ"), আমরা পুরো ব্লকে দিতাম। মাপা প্রতি-লাইন দাগ (page-geometry underlineLines) Gemini-র লাইন-সংখ্যায় মিললে আর মিশ্র
   * (সব লাইন পূর্ণ নয়, অন্তত একটিতে আছে) ⇒ শুধু ঐ লাইন/অংশ <u>…</u>; ফেরত নতুন লাইন-তালিকা, নইলে null (আগের মতো)। বন্ধ: FZ_OFF=ULINE
   */
  function perLineUnderline(lines, m) {
    if (globalThis.__FZ_OFF_ULINE || !m || m.empty || !Array.isArray(m.underlineLines) || !Array.isArray(lines)) return null;
    const ls = lines.filter((l) => String(l).trim());
    const u = m.underlineLines;
    const on = (x) => (Array.isArray(x) ? x[1] > x[0] : x > 0);
    if (!ls.length || ls.length !== lines.length || u.length !== ls.length || !u.some(on) || u.every((x) => x === 1)) return null;
    const plain = (s) => String(s).replace(/<\/?u>/gi, '');
    return ls.map((l, i) => {
      const s = plain(l);
      if (!on(u[i]) || /^\s*([─━═=_\-.…·])\1{5,}\s*$/.test(s)) return s;
      if (u[i] === 1) {
        if (!globalThis.__FZ_OFF_ULINE2) {
          const mFull = /^(.*?)([:ঃ।])(\s*\*{0,2}\s*)$/.exec(s);
          if (mFull && mFull[1].trim()) {
            const h = mFull[1], punc = mFull[2], tr = mFull[3];
            if (/^\*\*[^*]+$/.test(h.trim()) && /^\s*\*\*\s*$/.test(tr)) return '**<u>' + h.trim().slice(2) + '</u>**' + punc;
            return '<u>' + h + '</u>' + punc + tr;
          }
        }
        return '<u>' + s + '</u>';
      }
      const bm = /^\*\*([^*]+)\*\*$/.exec(s.trim()), t = bm ? bm[1] : s;
      if (!bm && /\*/.test(s)) return s;   // ভেতরে আংশিক মোটা-চিহ্ন ⇒ ভাঙার ঝুঁকি, দাগ নয়
      const ws = globalThis.__FZ_OFF_ULINE2 ? t.split(/(\s+)/) : t.split(/(\s+|[:ঃ।])/);
      const len = (w) => w.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length, tot = Math.max(1, len(t));
      const isP = (w) => !globalThis.__FZ_OFF_ULINE2 && /^[:ঃ।]$/.test(w);
      // ২০২৬-১০-১৪ (a16 "সংযুক্তি : ০৮ (আট) ফর্দ"): মাঝের দাগ [শুরু, শেষ] ⇒ যে শব্দগুলোর মাঝবিন্দু পরিসরে
      if (Array.isArray(u[i])) {
        let acc = 0;
        const hit = ws.map((w) => { const c = (acc + len(w) / 2) / tot; acc += len(w); return /\S/.test(w) && !isP(w) && c >= u[i][0] && c <= u[i][1]; });
        const k0 = hit.indexOf(true), k1 = hit.lastIndexOf(true);
        if (k0 < 0) return s;
        const pre = ws.slice(0, k0).join(''), mid = ws.slice(k0, k1 + 1).join(''), post = ws.slice(k1 + 1).join('');
        return bm ? (pre ? '**' + pre + '**' : '') + '**<u>' + mid + '</u>**' + (post ? '**' + post + '**' : '') : pre + '<u>' + mid + '</u>' + post;
      }
      // আংশিক: শুরু থেকে অক্ষর-অংশে (কার/চিহ্ন বাদে) যত শব্দ দাগের নিচে — শেষ শব্দের অর্ধেকের বেশি ঢাকলে সেটিও
      let acc = 0, k = 0;
      for (; k < ws.length; k++) { const w = len(ws[k]); if (/\S/.test(ws[k]) && (acc + w / 2) / tot > u[i]) break; acc += w; }
      while (k > 0 && (!ws[k - 1] || /^\s+$/.test(ws[k - 1]) || isP(ws[k - 1]))) k--;
      const head = ws.slice(0, k).join('').trimEnd(), rest = t.slice(head.length);
      if (!head) return s;
      return bm ? '**<u>' + head + '</u>**' + (rest.trim() ? rest.replace(/^(\s*)(.*?)(\s*)$/, '$1**$2**$3') : '') : '<u>' + head + '</u>' + rest;
    });
  }

  function toItem(b, m, pageInfo) {
    const rect = m && !m.empty ? Object.assign({}, m.rectPt) : (m ? Object.assign({}, m.geminiPt) : null);
    const base = { type: b.type, rect, m: m && !m.empty ? m : null, box: b.box };
    // g41: পটির রং (অনুচ্ছেদ-ছায়া); গাঢ় পটিতে লেখা সাদা
    if (m && m.shade && m.shade.fill) {
      base.shade = m.shade.fill;
      if (m.shade.dark) base.color = 'FFFFFF';
      // মাঝে-বসানো ছোট লেখা আর Gemini-বক্সও লেখার কাছাকাছি (g01 "ক্যাশ মেমো" কালো বাক্স) ⇒ শুধু লেখার পেছনে;
      // বক্স লেখার চেয়ে অনেক চওড়া (g41 পূর্ণ-প্রস্থ অংশ-পটি) বা বাঁয়ে ⇒ পুরো অনুচ্ছেদ
      const gw = m.geminiPt ? m.geminiPt.w : 0, rw = m.rectPt ? m.rectPt.w : 0;
      const isFullWidthBar = globalThis.__FZ_ON_SHADEBAR && !globalThis.__FZ_OFF_SHADEBAR && !m.shade.dark && rw >= 420 && (!gw || rw >= gw * 0.9);
      if (!m.shade.wide && !isFullWidthBar && (m.align || b.align) === 'c' && rw > 0 && gw < rw * 1.8) base.shadeRun = true;
    }
    if (b.type === 'figure') return Object.assign(base, { kind: 'figure' });
    // g41: হাতের সই/সিলকে Gemini অর্থহীন লেখা করলে ("cccccccccc") ⇒ ছবি (চেহারা অক্ষত)
    if ((b.type === 'signature' || b.type === 'stamp') && b.box && isScribble(b.lines && b.lines.length ? b.lines.join(' ') : b.text)) return Object.assign(base, { kind: 'figure', scribble: true });
    // খাড়া (ঘোরানো) লেখা: লম্বা-সরু, ১–২ লাইন ⇒ ছবি
    // a12: "১।"-এর মাপে শুধু দাঁড়ি পড়লে (১×৬pt) খাড়া মনে হতো ⇒ ছবি, প্রায় অদৃশ্য — আসল খাড়া লেখা লম্বা (≥১৮pt)
    if (rect && rect.h > rect.w * 2.5 && rect.h >= 18 && (!b.lines || b.lines.length <= 2) && b.box) return Object.assign(base, { kind: 'figure', rotatedText: true });
    if (b.type === 'table') {
      let rows = (b.lines || []).filter((l) => l.trim()).map((l) => l.split(/\s*\|\s*/).map((c) => c.trim()));
      const folded = foldBoxRows(rows);
      if (folded) rows = folded;
      // g41: সীমানাওয়ালা ছকে রেখা-ব্যান্ড Gemini-সারির চেয়ে কম ⇒ লাইনগুলো আসলে বহু-লাইনের ঘর — ব্যান্ড ধরে জোড়া
      // a07: খাড়া দাগে k কলাম, বেশিরভাগ (≥৬০%) সারিও ≤k ঘরের, কিছু সারিতে Gemini শেষ কলামের লেখা ভেঙে বাড়তি ঘর দেয়
      // ("(ক) AML … | হ্যাঁ/না") ⇒ বাড়তি ঘর শেষ ঘরে জোড়া (নইলে কলাম-সংখ্যা ভুল, মাপা প্রস্থ বসে না)
      // a19: ক্রমিক-কলামের ধারাবাহিক লাইন আগে জোড়া (নিচের নিয়ম আগে চললে মাপা ১ খাড়া দাগ দেখে বিবরণ+মান এক ঘরে জুড়ত)
      const serialFolded = !folded && foldSerialRows(rows);
      if (serialFolded) rows = serialFolded;
      if (!folded && !serialFolded && m && !m.empty && m.hasGrid !== false && Array.isArray(m.vRulesPt) && rows.length >= 3) {
        const R = m.rectPt, k = m.vRulesPt.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6 && v.cov >= 0.25).length + 1;
        const mx = Math.max(...rows.map((r) => r.length));
        if (k >= 2 && mx > k && rows.filter((r) => r.length <= k).length >= rows.length * 0.6)
          rows = rows.map((r) => (r.length > k ? r.slice(0, k - 1).concat(r.slice(k - 1).filter(Boolean).join('   ')) : r));
      }
      // অনুরোধ ঘ (a07 পাতা ১-এর ছক, FZ_OFF=HEADMERGE): প্রথম কয়েকটি সারির মাঝে আড়াআড়ি দাগ না থাকলে এবং শুধু ছোট টুকরো লেখা থাকলে একটি হেডার-সারিতে সংযোজন
      if (!folded && !serialFolded && !globalThis.__FZ_OFF_HEADMERGE) {
        let HM = global.FayzarHeaderMerge;
        if (!HM && typeof require === 'function') { try { HM = global.FayzarHeaderMerge = require('./header-merge.js'); } catch (e) { HM = null; } }
        if (!HM && typeof XMLHttpRequest !== 'undefined') {
          try { const x = new XMLHttpRequest(); x.open('GET', 'js/layout-engine/faithful/header-merge.js', false); x.send(null); if (x.status >= 200 && x.status < 300 && x.responseText) { (0, eval)(x.responseText); HM = global.FayzarHeaderMerge; } } catch (e) { HM = null; }
        }
        if (HM && typeof HM.applyHeaderMerge === 'function') rows = HM.applyHeaderMerge(rows, m);
      }
      const merged = mergeLineRows(rows, m);
      if (merged) rows = merged;
      // কাজ ৪ (a02 "সম্পর্ক" কলাম, FZ_ON=BOXPOS): ডিফল্টে বন্ধ যাতে a02 ও a03-এ gridSpan বা অবস্থান না ভাঙে
      if (!globalThis.__FZ_OFF_BOXPOS && globalThis.__FZ_ON_BOXPOS) {
        rows = rows.map((r) => r.map((c) => {
          if (!c || !/[☐☑□]|\[\s*\]|⟦\s*⟧/.test(c)) return c;
          return String(c).split('\n').map((ln) => {
            const mBox = /^\s*([^☐☑□\[⟦\n]+?:)\s*([☐☑□]|\[\s*\]|⟦\s*⟧)\s*$/.exec(ln);
            return mBox ? '□ ' + mBox[1].trim() : ln;
          }).join('\n');
        }));
      }
      // সীমানা: কালিতে রেখা-জাল না থাকলে সীমানাহীন (মাপ না থাকলে আগের মতো সীমানাসহ)
      // Part-17.9: ঘরের ফন্ট — সারি-লাইনের কালি-উচ্চতা ÷ টেবিলের লেখার অক্ষর-শ্রেণির অনুপাত (ক্যালিব্রেটেড)
      let cellFontSrc = 0;
      const tblText = (b.lines || []).join(' ');
      if (m && !m.empty && m.cellInkPt) cellFontSrc = m.cellInkPt / inkRatioFor(tblText);
      // প্রস্থ-ভিত্তিক (থাকলে, ১.৫ গুণের ভেতরে) অগ্রাধিকার
      if (m && !m.empty && m.cellWidthFontPt && (!cellFontSrc || (m.cellWidthFontPt / cellFontSrc < 1.5 && cellFontSrc / m.cellWidthFontPt < 1.5))) cellFontSrc = m.cellWidthFontPt;
      // কাজ ২ (a17 p6, FZ_OFF=DOTFONT): অনুচ্ছেদ-ভরা (≥৮০ অক্ষর) বিন্দু-সারিওয়ালা ফরম-ছকে সারি-ব্যান্ডের বিন্দুহীন লেখার কালি-উচ্চতা থেকে ঘরের আসল ফন্ট উদ্ধার
      const hasLongDotCell = /([._…·])\1{4,}/.test(tblText) && rows.some((r) => r.some((c) => String(c || '').replace(/\s+/g, '').length >= 80));
      if (!globalThis.__FZ_OFF_DOTFONT && m && !m.empty && m.hasGrid && hasLongDotCell) {
        let dotlessFont = m.dotlessCellInkPt ? m.dotlessCellInkPt / inkRatioFor(tblText) : 0;
        if (!dotlessFont && Array.isArray(m.textInkXPt) && Array.isArray(m.textLinesPt) && m.textLinesPt.length >= 3) {
          const lhs = m.textLinesPt.map((ly) => {
            const cs = m.textInkXPt.filter((c) => c[2] - c[1] >= 4 && ly >= c[1] - 2 && ly <= c[2] + 2);
            if (cs.length < 3) return 0;
            const hs = cs.map((c) => c[2] - c[1]).sort((a, b) => a - b);
            const med = hs[hs.length >> 1], p75 = hs[Math.floor(hs.length * 0.75)];
            return med >= 5 ? p75 : 0;
          }).filter((h) => h >= 10).sort((a, b) => a - b);
          if (lhs.length >= 2) dotlessFont = lhs[Math.floor(lhs.length * 0.75)] * 0.56;
        }
        if (dotlessFont > cellFontSrc) cellFontSrc = dotlessFont;
      }
      // a16: সীমানাওয়ালা ছকে এক-লাইনের সারির মাপা উচ্চতা (রেখা-ব্যবধানের ২০তম শতাংশ) ফন্টের ঊর্ধ্বসীমা:
      // সারি ÷ ১.২ (g18 সত্য: ১০pt ফন্ট ১২pt সারিতে; ১.২৫+১.৫ ধরলে ৮.৪-এ নামত)। a16: ১৩.৫pt ফন্ট ১৫.৩pt সারিতে আঁটত না
      if (cellFontSrc && m && !m.empty && m.hasGrid && Array.isArray(m.hRulesPt) && m.hRulesPt.length >= 5) {
        const H = m.hRulesPt.slice().sort((a, c) => a - c), d = H.slice(1).map((y, k) => y - H[k]).filter((v) => v >= 8).sort((a, c) => a - c);
        if (d.length >= 4) { const cap = d[Math.floor(d.length * 0.2)] / 1.28; if (cap >= 6 && cellFontSrc > cap) { cellFontSrc = cap; base.rowFontCap = cap; } }
        // a07 পাতা ৪ (কাত স্ক্যান): লেখা-লাইন সারির অর্ধেকেরও কম মাপা ⇒ কালি-মাপ অবিশ্বস্ত (৮.৬ ⇒ আসল ~১১); এক-লাইন সারির
        // উচ্চতা থেকে নিম্নসীমা: (সারি − ১pt) ÷ ১.২৫ (Word-এ Sutonny-র আসল লাইন-দূরত্ব; a07: ২-লাইনের সারি ৩৩.৬ ⇒ দূরত্ব ~১৬)
        const tlN = Array.isArray(m.textLinesPt) ? m.textLinesPt.length : 0;
        if (!globalThis.__FZ_OFF_FONT && d.length >= 4 && tlN < rows.length / 2) { const floor = (d[Math.floor(d.length * 0.2)] - 1) / 1.25; if (floor > cellFontSrc) cellFontSrc = floor; }
      }
      // Part-17.8: মাপা কলাম-প্রস্থের অনুপাত (কলাম-ফাঁকের সংখ্যা = কলাম − ১ হলে)
      let colFractions = null, fillW2 = false;
      const nCols = rows.length ? Math.max(...rows.map((r) => r.length)) : 0;
      const isFillCol = (j) => !globalThis.__FZ_OFF_FILLCOL && rows.length >= 4 && rows.slice(0, 2).some((r) => r[j] && String(r[j]).trim())
        && rows.slice(2).every((r) => !(r[j] && String(r[j]).trim()));
      const hasBodyCol = rows.length >= 4 && Array.from({ length: Math.max(0, nCols - 1) }, (_, idx) => idx + 1)
        .some((j) => rows.slice(2).filter((r) => r[j] && String(r[j]).trim()).length >= Math.ceil((rows.length - 2) * 0.5));
      const fillColCount = Array.from({ length: nCols }, (_, j) => isFillCol(j)).filter(Boolean).length;
      const hasFillCols = !globalThis.__FZ_OFF_FILLW2 && nCols >= 4 && hasBodyCol && fillColCount >= 2;
      m = dropEmptyMeasuredCol(m, nCols);
      // ২০২৬-১০-১৩: সীমানাওয়ালা ছকে আগে খাড়া দাগ (দৃশ্যমান কলাম-রেখাই সত্য; লেখার ফাঁকের মাঝ ধরলে a02-এ কলাম-রেখা ১০–৫০pt সরে যেত)
      if (m && !m.empty && m.hasGrid && Array.isArray(m.vRulesPt) && nCols > 1) {
        const R = m.rectPt, in0 = m.vRulesPt.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6);
        const rOuter = hasFillCols ? m.vRulesPt.filter((v) => v.cov >= 0.4 && Math.abs(v.x - (R.x + R.w)) <= 6).sort((a, b) => b.cov - a.cov)[0] : null;
        const rx1 = rOuter ? rOuter.x : R.x + R.w, rw = rx1 - R.x;
        // চেকবক্সের ছোট খাড়া দাগ বাদ দিতে: প্রথমে প্রায় পুরো-উচ্চতার (≥৯০%) দাগ, না মিললে ≥৫০%, আর পূরণের কলাম থাকলে ≥৪০% (FZ_OFF=FILLW2)
        const full = in0.filter((v) => v.cov >= 0.9), half = in0.filter((v) => v.cov >= 0.5), f40 = hasFillCols ? in0.filter((v) => v.cov >= 0.4) : [];
        const inner = full.length === nCols - 1 ? full : (half.length === nCols - 1 ? half : (f40.length === nCols - 1 ? f40 : half));
        if (inner.length === nCols - 1) {
          const edges = [R.x, ...inner.map((v) => v.x).sort((a, c) => a - c), rx1];
          const fr = edges.slice(1).map((e, k) => (e - edges[k]) / rw);
          if (fr.every((f) => f >= 0.02)) { colFractions = fr; if (hasFillCols) fillW2 = true; }
        } else if (!globalThis.__FZ_OFF_FRAC && inner.length === nCols - 2 && nCols >= 3 && inner.length && Math.min(...inner.map((v) => v.x)) - R.x <= R.w * 0.15
          && rows.filter((r) => r[nCols - 1] && String(r[nCols - 1]).trim()).length <= rows.length * 0.5) {
          // a07 পাতা ৩: ক্রমিক-কলামের দাগ আছে, শেষ মাপা কলামের ভেতরে দাগহীন ডান-অংশ ("হ্যাঁ/না (সম্ভাব্য প্রমাণক)", কিছু সারিতেই) —
          // Gemini সেটিকে আলাদা কলাম দেয়। লেখার দৈর্ঘ্য-অনুপাতে ভাগ করলে ঐ কলাম ৫৬pt, পুরো ছকের ফন্ট ১০ ⇒ ৮.৫।
          // ⇒ মাপা দাগের কলাম; শেষ কলাম শেষ মাপা কলামের ডান থেকে তার লেখার মাপে (≤৪৫%)
          const fs0 = cellFontSrc || 11, xs = inner.map((v) => v.x).sort((a, c) => a - c);
          const lastLen = Math.max(...rows.map((r) => String(r[nCols - 1] || '').split('\n').reduce((a, l) => Math.max(a, l.replace(/[ঁ-ঃ়া-্ৗ]/g, '').trim().length), 0)));
          const lastW = Math.min((R.x + R.w - xs[xs.length - 1]) * 0.45, lastLen * fs0 * 0.5 + 2 * 5.4 + 4);
          const edges = [R.x, ...xs, R.x + R.w - lastW, R.x + R.w];
          const fr = edges.slice(1).map((e, k) => (e - edges[k]) / R.w);
          if (fr.every((f) => f >= 0.02)) colFractions = fr;
        } else if (inner.length === nCols - 2 && nCols >= 3 && rows.every((r) => !r[0] || SERIAL.test(r[0]))) {
          // a19: ক্রমিক-কলাম আর বিবরণের মাঝে খাড়া দাগ নেই (মূলে শুধু বিবরণ|মান দাগ) ⇒ ক্রমিক-কলাম লেখার মাপে সরু
          // (নইলে কলাম-সংখ্যা না মেলায় সব কলাম সমান — ক্রমিক-কলাম বিবরণের সমান চওড়া হতো)
          const fs0 = cellFontSrc || 11, sw = Math.max(...rows.map((r) => String(r[0] || '').length)) * fs0 * 0.6 + 2 * 5.4 + 4;
          const edges = [R.x, R.x + Math.min(sw, R.w * 0.15), ...inner.map((v) => v.x).sort((a, c) => a - c), R.x + R.w];
          const fr = edges.slice(1).map((e, k) => (e - edges[k]) / R.w);
          if (fr.every((f) => f >= 0.02)) colFractions = fr;
        }
      }
      if (!colFractions && m && !m.empty && m.colGuttersPt && nCols > 1 && m.colGuttersPt.length === nCols - 1) {
        const R = m.rectPt, rOuter = hasFillCols && Array.isArray(m.vRulesPt) ? m.vRulesPt.filter((v) => v.cov >= 0.4 && Math.abs(v.x - (R.x + R.w)) <= 6).sort((a, b) => b.cov - a.cov)[0] : null;
        const rx1 = rOuter ? rOuter.x : R.x + R.w, rw = rx1 - R.x;
        const guts = m.colGuttersPt.slice();
        if (hasFillCols && Array.isArray(m.vRulesPt)) {
          const vr = m.vRulesPt.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6 && v.cov >= 0.4);
          for (let k = 0; k < guts.length; k++) {
            if (!isFillCol(k + 1) && !isFillCol(k)) continue;
            const hit = vr.find((v) => Math.abs(v.x - guts[k]) <= 12);
            if (hit) { guts[k] = hit.x; fillW2 = true; }
          }
        }
        const edges = [R.x, ...guts, rx1];
        colFractions = edges.slice(1).map((e, k) => (e - edges[k]) / rw);
        if (colFractions.some((f) => f < 0.03)) colFractions = null;
      }
      // ফরম-টেবিল: লেখার ফাঁকে কলাম না মিললে খাড়া দাগ থেকে (ভেতরের দাগ = কলাম − ১ হলে; সবচেয়ে লম্বা দাগগুলো)
      if (!colFractions && m && !m.empty && m.hasGrid !== false && Array.isArray(m.vRulesPt) && nCols > 1) {
        const R = m.rectPt, inner = m.vRulesPt.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6 && v.cov >= 0.25);
        if (inner.length === nCols - 1) {
          const edges = [R.x, ...inner.map((v) => v.x).sort((a, c) => a - c), R.x + R.w];
          const fr = edges.slice(1).map((e, k) => (e - edges[k]) / R.w);
          if (fr.every((f) => f >= 0.02)) colFractions = fr;
        }
      }
      // a03 (২০২৬-১০-১২): মাপা কলাম নেই ⇒ সমান ভাগ নয়, লেখার দৈর্ঘ্যের অনুপাতে (লম্বা বিবরণ | "নাম:" — সমান ভাগে বিবরণ
      // দুই লাইনে ভাঙত, সারি +১০pt)। ফাঁকা কলাম (লেখার জায়গা) = গড়; প্রতিটি ≥৮%। সংখ্যা-বাক্স/চিত্র-ঘরের টেবিল বাদ
      if (!colFractions && nCols > 1 && !rows.some((r) => r.some((c) => c && String(c).startsWith(BOX_MARK)))) {
        const vis = (c) => String(c || '').replace(/\*\*|\^\{|\}/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').split('\n').reduce((a, l) => Math.max(a, l.trim().length), 0);
        const len = Array.from({ length: nCols }, (_, j) => Math.max(0, ...rows.map((r) => vis(r[j]))));
        const filled = len.filter((l) => l > 0);
        if (filled.length && Math.max(...filled) >= 2 * Math.min(...len.map((l) => l || Infinity))) {
          const avg = filled.reduce((a, b) => a + b, 0) / filled.length;
          const w = len.map((l) => Math.max(4, l || avg));
          let fr = w.map((x) => x / w.reduce((a, b) => a + b, 0)).map((f) => Math.max(0.08, f));
          const s = fr.reduce((a, b) => a + b, 0);
          colFractions = fr.map((f) => f / s);
        }
      }
      // Part-17.9: কলামের মাপা অবস্থান (কলাম-সংখ্যা মিললে)
      // f1: ভাঁজ-করা ফরম-ছক (লেবেল|মান) — মাপা অবস্থান না মিললে দুই কলামই বাঁয়ে (মাঝে বসালে রেডিও-তালিকা ছড়াত)
      let colAligns = m && !m.empty && m.colAligns && m.colAligns.length === nCols ? m.colAligns : (folded ? rows[0].map(() => 'l').concat(nCols > rows[0].length ? Array(nCols - rows[0].length).fill('l') : []) : null);
      // ২০২৬-১০-১৪ (a17 p6, মালিকের Word-যাচাই): মাপা কলাম-সীমা [৭৯,১১৩,১২৭,১০১৪] — ২য় কলামের ভেতরে ৫৮৩-এ পূর্ণ খাড়া দাগ (cov ০.৮১)
      // ⇒ দুই কলামের লেখা এক ভাগে, সাজ "মাঝে" মাপা, বিবরণ-কলাম মাঝে বসত (মূলে বাঁয়ে)। ভেতরে পূর্ণ দাগ পড়া কলামের মাপা 'c' ⇒ 'l'। বন্ধ: FZ_OFF=SPLITCOL
      let edgesBad = false;
      // মাপা ভেতরের সীমা আমাদের কলাম-ভাগ থেকে >৬% প্রস্থ দূরে ⇒ মাপা সাজ অন্য কলামের (১১৩|১২৭ = ক্রমিক-ফাঁক) ⇒ বাদ, নিচের অনুমান
      if (!globalThis.__FZ_OFF_SPLITCOL && colAligns && m && m.rectPt && Array.isArray(m.colEdgesPt) && m.colEdgesPt.length === nCols + 1 && Array.isArray(colFractions) && colFractions.length === nCols) {
        let acc = 0;
        const ours = colFractions.slice(0, -1).map((f) => { acc += f; return m.rectPt.x + acc * m.rectPt.w; });
        if (ours.some((x, k) => Math.abs(x - m.colEdgesPt[k + 1]) > m.rectPt.w * 0.06)) { colAligns = null; edgesBad = true; }
      }
      // a07: মাপা অবস্থান নেই ⇒ লম্বা লেখার কলাম (ঘরের গড় >২০ অক্ষর, ফরমের বিবরণ-কলাম) বাঁয়ে; বাকিগুলো আগের মতো মাঝে
      if (!colAligns && nCols > 1 && (rows.length >= 3 || (rows.length >= 2 && rows[0] && SERIAL.test(String(rows[0][0] || '').trim())))) {
        const dataRows = rows[0] && SERIAL.test(String(rows[0][0] || '').trim()) ? rows : rows.slice(1);
        const avg = Array.from({ length: nCols }, (_, j) => { const cs = dataRows.map((r) => r[j]).filter(Boolean); return cs.length ? cs.reduce((a, c) => a + c.length, 0) / cs.length : 0; });
        if (avg.some((a) => a > 20)) colAligns = avg.map((a) => (a > 20 ? 'l' : 'c'));
      }
      // ঘর-ভিত্তিক ব্যতিক্রম: বাঁয়ে-সাজানো কলামে যে ঘরের লেখা স্পষ্টতই মাঝে (শিরোনাম-সারি "Question") ⇒ মাঝে
      let cellAligns = null;
      // a18 (২০২৬-১০-১৪): পূর্ণ-দাগের কলাম-সীমা না মিললে আংশিক-দাগসহ সীমা (page-geometry cellBoxV)
      const CBX = m && !edgesBad && m.cellBox && m.colEdgesPt && m.colEdgesPt.length === nCols + 1 ? { cb: m.cellBox, ed: m.colEdgesPt }
        : (!globalThis.__FZ_OFF_CBV && m && m.cellBoxV && m.cellBoxV.edgesPt.length === nCols + 1 ? { cb: m.cellBoxV.rows, ed: m.cellBoxV.edgesPt } : null);
      if (!merged && colAligns && CBX) {
        const ne = rows.map((r, i) => i).filter((i) => rows[i].some((c) => c));
        if (ne.length === CBX.cb.length) {
          cellAligns = rows.map(() => null);
          const insets = CBX.ed.slice(0, -1).map((e0, j) => median(CBX.cb.map((r) => r[j]).filter(Boolean).map((bx) => bx[0] - e0)));
          ne.forEach((ri, k) => {
            cellAligns[ri] = CBX.cb[k].map((bx, j) => {
              if (!bx || colAligns[j] !== 'l') return null;
              const e0 = CBX.ed[j], e1 = CBX.ed[j + 1], L = bx[0] - e0, R = e1 - bx[1];
              // a18: ঘর-ভরা শিরোনাম ("অফিসারের নাম ও পদবী" — দুই পাশে ~১২pt) ⇒ ছোট সরণেও দুই পাশ প্রায় সমান হলে মাঝে
              return (L > insets[j] + 8 && Math.abs(L - R) < (e1 - e0) * 0.25) || (!globalThis.__FZ_OFF_CFULL && L > insets[j] + 4 && Math.abs(L - R) < (e1 - e0) * 0.08) ? 'c' : null;
            });
          });
        }
      }
      // ২০২৬-১০-১৩: ভাঁজ-করা ছকেও আগে রেখা-ভাগের মাপা উচ্চতা (সংখ্যা-বাক্সের ঘর = এক লাইন) — f1-এ লাইন-অনুপাতে সারিগুলো মূলের
      // রেখা থেকে ±১৫pt সরে যেত; না মিললে আগের মতো লাইন-অনুপাত
      // a10: Gemini-র মুদ্রিত-লাইন সারিগুলো মাপা অবস্থানে একই রেখা-ভাগে পড়লে (২-লাইনের শিরোনাম-ঘর, "৩। পিতার … ও / জাতীয়তা")
      // এক সারি, ঘরে '\n' — আলাদা সারি হলে মাঝে মূলে-নেই এমন দাগ আঁকা হতো আর পরের সারিগুলো ভুল ভাগে সরত
      // (mergeLineRows-এর মতোই: সারির ঘর-সংখ্যা ভিন্ন = জোড়া-ঘরের ছক (a18/f1) ⇒ বহু-লাইনের ঘর নয়, বদল নয়)
      // ২০২৬-১০-১৪ (a05): সারি ⇒ মাপা রেখা-ভাগে পুনর্গঠন (row-ink realign) — কপি-সারি বাদ, মূলের ফাঁকা সারি ফেরত; তারপর ভাগের মাপা উচ্চতা
      let realignBands = null;
      const RIx = global.FayzarRowInk || (typeof require === 'function' ? (() => { try { return require('./row-ink.js'); } catch (e) { return null; } })() : null);
      if (!globalThis.__FZ_OFF_REALIGN && RIx && RIx.realign && !folded && !merged && m && !m.empty && m.hasGrid && Array.isArray(m.hRulesPt) && Array.isArray(m.textInkPt)) {
        const H = [];
        m.hRulesPt.slice().sort((a, c) => a - c).forEach((y) => { if (!H.length || y - H[H.length - 1] > 3) H.push(y); });
        const bnds = [];
        for (let k = 1; k < H.length; k++) if (H[k] - H[k - 1] >= 4) bnds.push({ y0: H[k - 1], y1: H[k] });
        if (bnds.length >= 8 && bnds.length >= rows.length - 3 && bnds.length <= rows.length + 6) {
          const cnt = bnds.map((b) => m.textInkPt.filter((c) => { const y = (c[0] + c[1]) / 2; return y >= b.y0 && y < b.y1; }).length);
          const pos = cnt.filter((c) => c > 0).sort((a, c) => a - c);
          const thr = Math.max(6, (pos.length ? pos[pos.length >> 1] : 0) * 0.25);
          const inked = cnt.map((c) => c >= thr);
          const r = RIx.realign(rows, inked);
          if (globalThis.__FZ_DBG) console.log('realign', JSON.stringify({ n: rows.length, m: bnds.length, thr, cnt, inked: inked.map(Number).join(''), cost: r && r.cost, rows: rows.map((x) => x.slice(0, 2).join('|').slice(0, 14)) }));
          const txt = (row) => row.some((c) => c && String(c).trim());
          const idCost = rows.length === bnds.length ? rows.reduce((a, row, i) => a + (txt(row) ? (inked[i] ? 0 : 1) : (inked[i] ? 1 : 0)), 0) : Infinity;
          if (r && r.rows.length === bnds.length && r.cost + 0.5 < idCost && JSON.stringify(r.rows) !== JSON.stringify(rows)) {
            rows = r.rows; cellAligns = null; realignBands = bnds;
          }
        }
      }
      // [Rule IR2: FZ_OFF=FORMFIX / FZ_OFF=IR2] চেকলিস্ট ছকের উপ-ক্রমিক সারিগুলোকে ((ক), (খ), (গ)) আড়া দাগ হালকা হলেও একীভূত করা হবে না (কমপক্ষে ২টি লেখাসহ বডি-সারি থাকতে হবে যাতে a10-এর ফাঁকা সারির ছক প্রভাবিত না হয়)।
      const SUBSER0 = /^[(\s]*([ক-হ]|[a-z]|[ivx]+)[)।.)]\s/i;
      const nonEmptyBody0 = rows.slice(1).filter((r) => r.some((c) => c && String(c).trim()));
      const isChecklist0 = !!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_IR2 && nCols >= 4 && rows.length >= 4 && nonEmptyBody0.length >= 2 && nonEmptyBody0.every((r) => SERIAL.test(String(r[0] || '').trim()) || SUBSER0.test(String(r[1] || '').trim()) || /<table/i.test(String(r[1] || ''))));
      if (!realignBands && !isChecklist0 && !globalThis.__FZ_OFF_MERGE && !folded && !merged && m && !m.empty && m.hasGrid && rows.length >= 2 && rows.every((r) => r.length === rows[0].length)) {
        const BI = rowBandHeights(rows, m, colFractions, cellFontSrc || 11, { bandsOnly: true });
        // শুধু মাপা লেখা-লাইন নির্ভরযোগ্য হলে (≥ লেখা-সারির ৮০%) — a05: কাত স্ক্যানে ৩০ সারিতে ৩ লাইন ⇒ সব এক ভাগে জুড়ে যেত
        const bnd = BI && BI.nLines >= BI.nTxt * 0.8 ? BI.band : null;
        if (Array.isArray(bnd) && bnd.length === rows.length) {
          const out = [], ob = [];
          rows.forEach((r, i) => {
            const k = out.length - 1, isEmpty = !r.some((c) => c && String(c).trim());
            // ধারাবাহিক লাইন = আগের সারির ঘরগুলোর ভেতরেই (লেখা শুধু আগের সারির লেখাওয়ালা কলামে); অন্য কলামে লেখা থাকলে আলাদা সারি (a18)
            const sub = k >= 0 && r.every((c, j) => !(c && String(c).trim()) || (out[k][j] && String(out[k][j]).trim()));
            if (k >= 0 && !isEmpty && sub && ob[k] === bnd[i] && out[k].some((c) => c && String(c).trim())) {
              for (let j = 0; j < Math.max(r.length, out[k].length); j++) if (r[j]) out[k][j] = out[k][j] ? out[k][j] + '\n' + r[j] : r[j];
            } else { out.push(r.slice()); ob.push(bnd[i]); }
          });
          // a10: Gemini ফাঁকা লেখার-সারি কম দিলে (মূলে ৪টি, Gemini ৩টি) কোনো সারি না পাওয়া লেখাহীন ভাগ ⇒ ফাঁকা সারি
          // (নইলে শেষ সারি দুই ভাগ জুড়ে, মাঝের দাগ হারাত)। নিচের দিকে যোগ — Gemini ফাঁকা সারি ক্রমেই দেয়
          // শুধু যখন সব ফাঁকা সারি লেখা-সারিগুলোর পরে: শেষ লেখা-ভাগের নিচের প্রতিটি ভাগে একটি ফাঁকা সারি
          // (নিচের ভাগে মাপা "লেখা" = হাতের দাগ/ছিটে, a10)
          const nC = Math.max(...out.map((r) => r.length)), has = (r) => r.some((c) => c && String(c).trim());
          const lastK = out.map(has).lastIndexOf(true);
          const trailing = lastK >= 0 && out.slice(lastK + 1).length > 0 && out.slice(0, lastK + 1).every(has);
          const need = BI.n - 1 - ob[lastK];
          if (trailing && need > 0 && need !== out.length - 1 - lastK && Math.abs(need - (out.length - 1 - lastK)) <= 3) {
            out.splice(lastK + 1); ob.splice(lastK + 1);
            for (let b = ob[lastK] + 1; b < BI.n; b++) { out.push(Array(nC).fill('')); ob.push(b); }
          }
          // জোড়ার পর সারি-সংখ্যা = রেখা-ভাগের সংখ্যা হলেই গ্রহণ (পুরো ছক ব্যাখ্যা হলো); নইলে আগের মতো (a18: মেলে না ⇒ বদল নয়)
          if (out.length === BI.n && JSON.stringify(out) !== JSON.stringify(rows)) { rows = out; cellAligns = null; }
        }
      }
      const rbRows = folded ? rows.map((r) => r.map((c) => (c && c.startsWith(BOX_MARK) ? '0' : c))) : rows;
      const rbh = realignBands ? realignBands.map((b) => b.y1 - b.y0) : rowBandHeights(rbRows, m, colFractions, cellFontSrc || 11);
      // a18: মূলে ৬টি আড়া রেখা, আমাদের ১৭ (প্রতি Gemini-সারিতে দাগ) ⇒ একই রেখা-ভাগের সারিগুলোর মাঝে দাগ নয় (builder: tcBorders nil)
      let rowBand = null;
      const SUBSER = /^[(\s]*([ক-হ]|[a-z]|[ivx]+)[)।.)]\s/i;
      const isChecklist = nCols >= 4 && rows.length >= 4 && rows.slice(1).filter((r) => r.some(Boolean)).every((r) => SERIAL.test(String(r[0] || '').trim()) || SUBSER.test(String(r[1] || '').trim()) || /<table/i.test(String(r[1] || '')));
      if (rbh && !isChecklist && !globalThis.__FZ_OFF_ROWBAND) {
        const BI = rowBandHeights(rbRows, m, colFractions, cellFontSrc || 11, { bandsOnly: true });
        // a05 (কাত স্ক্যান, প্রতি সারিতে দাগ অথচ মাপা রেখা ৪টি): মাপা লেখা-লাইন < লেখা-সারির ৮০% ⇒ ভাগ অবিশ্বস্ত, দাগ মুছব না
        if (BI && Array.isArray(BI.band) && BI.band.length === rows.length && BI.n < rows.length && BI.nLines >= BI.nTxt * 0.8) rowBand = BI.band;
      }
      // f1: জাল আছে (আড়া রেখা/নীল ব্যান্ড) কিন্তু কোনো খাড়া দাগ মাপা নেই ⇒ মূলে খাড়া দাগ নেই (আমরা ৩টি আঁকতাম)
      const noVRules = !globalThis.__FZ_OFF_NOV && !!(m && !m.empty && m.hasGrid && Array.isArray(m.vRulesPt) && !m.vRulesPt.length);
      // ২০২৬-১০-১৪ (a17 p6): কলাম-সীমায় মাপা পূর্ণ-উচ্চতার খাড়া দাগ (cov ≥০.৯) ⇒ builder সেই সীমা পেরিয়ে ঘর জোড়ে না
      // (লম্বা লেখা মূলে নিজের কলামে মুড়ে থাকে; a18-এর আংশিক দাগ cov ০.৩২ ⇒ জোড়া আগের মতো)
      let fullVRule = null;
      if (!globalThis.__FZ_OFF_FULLV && m && !m.empty && Array.isArray(m.vRulesPt) && m.rectPt && Array.isArray(colFractions) && colFractions.length >= 2) {
        let acc = 0;
        // ২০২৬-১০-১৪ (a16 চেকলিস্ট, মালিকের Word-যাচাই): পূরণের কলাম (হ্যাঁ/না/সংলাগ/মন্তব্য — শিরোনামে লেখা, বাকি সব সারি ফাঁকা)
        // ফিকে স্ক্যানে দাগ cov ০.৪৩–০.৭২ ⇒ ০.৭৫-এ পূর্ণ না ধরায় "বিষয়" ঘর "হ্যাঁ" জুড়ে নিত। এমন কলামের বাঁ-সীমায় cov ≥০.৪ যথেষ্ট
        // (a18-এর আংশিক দাগ ০.৩২ ⇒ আগের মতো জোড়া)। বন্ধ: FZ_OFF=FILLCOL
        const isFill = (j) => !globalThis.__FZ_OFF_FILLCOL && rows.length >= 4 && rows.slice(0, 2).some((r) => r[j] && String(r[j]).trim())
          && rows.slice(2).every((r) => !(r[j] && String(r[j]).trim()));
        const rOuter = hasFillCols ? m.vRulesPt.filter((v) => v.cov >= 0.4 && Math.abs(v.x - (m.rectPt.x + m.rectPt.w)) <= 6).sort((a, b) => b.cov - a.cov)[0] : null;
        const rw = (rOuter ? rOuter.x : m.rectPt.x + m.rectPt.w) - m.rectPt.x;
        fullVRule = colFractions.slice(0, -1).map((f, k) => { acc += f; const x = m.rectPt.x + acc * rw; const thr = isFill(k + 1) || (!globalThis.__FZ_OFF_FILLW2 && hasFillCols && isFill(k)) ? 0.4 : 0.75; return m.vRulesPt.some((v) => v.cov >= thr && Math.abs(v.x - x) <= 8); });   // a17 p6: ০.৮১ (নিচের ১০।-অংশে দাগ নেই)
        if (!fullVRule.some(Boolean)) fullVRule = null;
      }
      // ২০২৬-১০-১৪ (a17 p10, মালিকের Word-যাচাই): শিরোনাম-সারিতে ৩-লাইনের ঘরের পাশে ১-লাইনের ঘর মূলে মাঝে, builder-এর VTOP ওপরে
      // বসাত (a18/a19-এ ওপরেই ঠিক)। মাপা কালির খাড়া কেন্দ্র সারি-ভাগের মাঝ-তৃতীয়াংশে ⇒ 'c', ওপরে ⇒ 't'। বন্ধ: FZ_OFF=HEADV
      let headVAlign = null;
      if (!globalThis.__FZ_OFF_HEADV && m && !m.empty && Array.isArray(m.textInkXPt) && Array.isArray(m.hRulesPt) && m.hRulesPt.length >= 2
        && m.rectPt && Math.abs(m.hRulesPt[0] - m.rectPt.y) <= 6 && Array.isArray(colFractions) && rows.length >= 2) {
        const y0 = m.hRulesPt[0], y1 = m.hRulesPt[1], bh = y1 - y0;
        let acc = 0;
        const edges = [m.rectPt.x].concat(colFractions.map((f) => { acc += f; return m.rectPt.x + acc * m.rectPt.w; }));
        headVAlign = colFractions.map((_, k) => {
          const ink = m.textInkXPt.filter(([x, a, b]) => x > edges[k] + 1 && x < edges[k + 1] - 1 && a >= y0 + 1 && b <= y1 - 1);
          if (!ink.length || bh < 12) return null;
          const off = ((Math.min(...ink.map((c) => c[1])) + Math.max(...ink.map((c) => c[2]))) / 2 - (y0 + y1) / 2) / bh;
          return Math.abs(off) <= 0.15 ? 'c' : off < 0 ? 't' : null;
        });
        if (!headVAlign.some(Boolean)) headVAlign = null;
      }
      let lastRowSpan = 0;
      if (rows.length >= 4 && nCols >= 4 && m && !m.empty && Array.isArray(m.textInkXPt) && Array.isArray(m.hRulesPt) && m.hRulesPt.length >= 3 && m.rectPt && Array.isArray(colFractions)) {
        const lastR = rows[rows.length - 1], neIdx = lastR.map((c, j) => (c && String(c).trim() ? j : -1)).filter((j) => j >= 0);
        if (neIdx.length === 1 && /সর্বমোট|মোট|Total/i.test(lastR[neIdx[0]])) {
          const H = m.hRulesPt.slice().sort((a, c) => a - c), yL = H[H.length - 2];
          const ink = m.textInkXPt.filter(([x, a, b]) => a >= yL - 3 && x > m.rectPt.x + 60);
          if (ink.length) {
            const ix = (Math.min(...ink.map((c) => c[0])) + Math.max(...ink.map((c) => c[0]))) / 2;
            let acc = 0, trueCol = -1;
            colFractions.forEach((f, j) => { const x0 = m.rectPt.x + acc * m.rectPt.w; acc += f; const x1 = m.rectPt.x + acc * m.rectPt.w; if (ix >= x0 && ix <= x1) trueCol = j; });
            if (trueCol > 0) {
              const txt = lastR[neIdx[0]];
              lastR[neIdx[0]] = "";
              lastR[0] = txt;
              lastRowSpan = trueCol + 1;
            }
          }
        }
      }
      const tbl = Object.assign(base, { lastRowSpan, rowBand, noVRules, fullVRule, fillW2: !globalThis.__FZ_OFF_FILLW2 && fillW2, headVAlign, headShade: m && !m.empty && /^[0-9A-F]{6}$/i.test(m.headShade || '') ? m.headShade : null, kind: 'table', rows, borderless: !!(m && !m.empty && m.hasGrid === false), cellFontSrc, colFractions, colAligns, cellAligns,
        colGapPt: m && !m.empty && m.colGapMinPt ? m.colGapMinPt : 0,
        // f1: ভাঁজ-করা ফরম-ছকে সারির উচ্চতা লাইন-সংখ্যার অনুপাতে (রেডিও-সারি ৫ লাইন, বাকিরা ১)
        rowWeights: folded && !rbh ? rows.map((r) => Math.max(1, ...r.map((c) => (c && !c.startsWith(BOX_MARK) ? c.split('\n').length : 1)))) : null,
        // rbh.shift — নিজস্ব সরণ-তালিকা হলেই; নইলে Array.prototype.shift (ফাংশন) ir-এ ঢুকে ইতিহাসে রাখা আটকাত (DataCloneError)
        rowHeightsPt: rbh, rowHeightsExact: !!(rbh && rbh.exact), rowShiftPt: rbh && Array.isArray(rbh.shift) && !globalThis.__FZ_OFF_RSHIFT ? rbh.shift : null, rowHeightsLine: !!(rbh && Array.isArray(rbh.shift) && !rbh.exact) });
      if (fzOn('FORMFIX') && m && !m.empty && m.rectPt && Array.isArray(m.lines)) {
        if (!globalThis.__FZ_OFF_IR3 && tbl.noVRules && rows.length >= 4 && nCols >= 2) {
          // [Rule IR3: FZ_OFF=FORMFIX / FZ_OFF=IR3] উল্লম্ব-রেখাবিহীন ফরম-ছকে (noVRules) ক্রমিক ও কোলনহীন একক-ঘরের সারি মাপা লাইনের কেন্দ্রে থাকলে মাঝখানে বসানো অংশ-শিরোনাম ও রেডিও-বোতামের বাঁ-ইনডেন্ট।
          const cxTbl = m.rectPt.x + m.rectPt.w / 2;
          const rbhArr = Array.isArray(tbl.rowHeightsPt) && tbl.rowHeightsPt.length === rows.length ? tbl.rowHeightsPt : null;
          const rowLineCounts = rows.map((r) => Math.max(1, ...r.map((c) => (c && !String(c).startsWith(BOX_MARK) ? String(c).split('\n').length : 1))));
          const totLogLines = rowLineCounts.reduce((a, b) => a + b, 0);
          rows.forEach((r, ri) => {
            const c0 = String(r[0] || "").replace(/\*+/g, "").trim();
            if (!c0 || /^\s*[০-৯\d]+[।.)]/.test(c0) || /[:ঃ*]\s*$/.test(c0) || r.slice(1).some((c) => String(c || "").trim())) return;
            const cumLn = rowLineCounts.slice(0, ri).reduce((a, b) => a + b, 0);
            const estY = rbhArr ? m.rectPt.y + rbhArr.slice(0, ri).reduce((a, b) => a + b, 0) : null;
            const isCenteredLn = (l) => l && l.x > m.rectPt.x + m.rectPt.w * 0.25 && Math.abs((l.x + l.w / 2) - cxTbl) < m.rectPt.w * 0.12 && l.w < m.rectPt.w * 0.5;
            const hit = (Math.abs(m.lines.length - totLogLines) <= 1 && m.lines[cumLn])
              ? (isCenteredLn(m.lines[cumLn]) ? m.lines[cumLn] : null)
              : m.lines.find((l) => isCenteredLn(l) && (estY == null || Math.abs(l.y - estY) <= 18));
            if (!hit) return;
            if (!tbl.gridSpans) tbl.gridSpans = rows.map(() => null);
            tbl.gridSpans[ri] = [nCols].concat(new Array(nCols - 1).fill(0));
            if (!tbl.cellAligns) tbl.cellAligns = rows.map(() => null);
            tbl.cellAligns[ri] = new Array(nCols).fill("c");
          });
          const col0W = m.rectPt.w * (colFractions && colFractions[0] ? colFractions[0] : 0.36);
          const col1X = m.rectPt.x + col0W;
          const radLines = m.lines.filter((l) => l.x > col1X + 8 && l.x < col1X + 60 && l.w < m.rectPt.w * 0.4);
          if (radLines.length >= 3) {
            const medX = median(radLines.map((l) => l.x));
            tbl.radioIndentPt = Math.max(0, Math.round(medX - col1X - 10));
          }
        } else if (!globalThis.__FZ_OFF_IR4 && tbl.borderless && rows.length >= 3 && m.lines.length === rows.length && /^[○●◯◉]/.test(String(rows[1][0] || "").trim())) {
          // [Rule IR4: FZ_OFF=FORMFIX / FZ_OFF=IR4] বর্ডারলেস বুলেট-তালিকা ছকে মাপা লাইনের সংখ্যা ও সারির সংখ্যা সমান হলে মাপা লাইনের অবস্থান থেকে সারির উচ্চতা ও ফন্ট পুনরুদ্ধার।
          const dx = m.lines[1].x - m.lines[0].x;
          if (dx >= 15) {
            tbl.bulletIndentPt = Math.round(dx - 8);
            if ((tbl.cellFontSrc || 10) < 12 && m.lines[1].h >= 10) tbl.cellFontSrc = 12;
          }
          const topY = m.rectPt.y, botY = m.rectPt.y + m.rectPt.h;
          const ys = m.lines.map((l) => l.y + l.h / 2);
          tbl.rowHeightsPt = rows.map((_, i) => {
            const y0 = i === 0 ? topY : (ys[i - 1] + ys[i]) / 2;
            const y1 = i === rows.length - 1 ? botY : (ys[i] + ys[i + 1]) / 2;
            return Math.max(12, Math.round((y1 - y0) * 10) / 10);
          });
        }
      }
      if (fzOn('GRIDFIRST') && !folded) {
        let GF = global.FayzarGridFirst;
        if (!GF && typeof require === 'function') { try { GF = global.FayzarGridFirst = require('./grid-first.js'); } catch (e) { GF = null; } }
        if (!GF && typeof XMLHttpRequest !== 'undefined') {
          try { const x = new XMLHttpRequest(); x.open('GET', 'js/layout-engine/faithful/grid-first.js', false); x.send(null); if (x.status >= 200 && x.status < 300 && x.responseText) { (0, eval)(x.responseText); GF = global.FayzarGridFirst; } } catch (e) { GF = null; }
        }
        if (GF && typeof GF.applyGridFirst === 'function') GF.applyGridFirst(tbl, m, pageInfo);
      }
      return splitTableAtGaps(tbl, m);
    }
    let align = (m && !m.empty && m.align) || b.align || 'l';
    let keepLines = !!(KEEP_TYPES[b.type] || (m && m.ragged && b.type !== 'paragraph') || (b.lines && b.lines.length > 1 && align === 'c'));
    // সিভি (মালিকের স্ক্রিনশট): লেবেল-কলাম আর ": মান"-কলাম আলাদা 'paragraph' ব্লকে এলে লাইন জুড়ে যেত
    // ("Discipline Result" এক লাইনে, মান মুড়ে) ⇒ প্রতিটি লাইন ':' দিয়ে শুরু, বা ≥৩টি ছোট লাইন (≤৪০ অক্ষর) আর মাপা লাইন-সংখ্যা ±১-এ মেলে ⇒ লাইন অক্ষত
    const bl = (b.lines || []).map((l) => l.trim()).filter(Boolean);
    if (!keepLines && bl.length >= 2 && (bl.every((l) => /^[:：]/.test(l)) ||
      (bl.length >= 3 && align !== 'j' && m && !m.empty && m.lines && Math.abs(m.lines.length - bl.length) <= 1 && bl.every((l) => l.replace(/\*+/g, '').length <= 40)) ||
      // a15 (মালিকের টেস্ট, ২০২৬-১০-১৩): দুই ছোট লাইন ("Web : …" / "E-mail : …"), মাপা লাইনও ঠিক দুই ⇒ Word-এ জুড়ে যেত
      // (মাপে প্রায়-সমান দুই লাইন "দুপাশে-সমান" দেখায়; Gemini মাঝে বললে মাঝে)
      (bl.length === 2 && m && !m.empty && m.lines && m.lines.length === 2 && bl.every((l) => l.replace(/\*+/g, '').length <= 60) &&
        (align !== 'j' || (b.align === 'c' && (align = 'c')))))) keepLines = true;
    // a11 (plan-jumps.mjs, ২০২৬-১০-১৪): ৪ লাইনের ঠিকানা-ব্লক ("বরাবর, / পরীক্ষা নিয়ন্ত্রক… / মাধ্যমিক… / দিনাজপুর।") প্রবাহে ⇒ Word পুরো প্রস্থে
    // এক লাইনে জুড়ে নিচের সব ৪২pt ওপরে। মাপা ছাপা-লাইন = Gemini-র লাইন (≥২) আর দুপাশে-সমান নয় ⇒ লাইন-ভাঙা আসল, রাখা
    // (আগের নিয়ম শুধু ≤৪০ অক্ষরের লাইনে)
    if (!keepLines && !globalThis.__FZ_OFF_KEEPN && bl.length >= 2 && align !== 'j' && m && !m.empty && m.lines && m.lines.length === bl.length) keepLines = true;
    // Part-17.8: লাইনের ভেতরের চওড়া ফাঁক ⇒ ট্যাব (মাপা x-অবস্থানে)
    const tabs = align !== 'c' && m && !m.empty ? tabify(b.lines || [], m.lineSegs) : null;
    if (tabs && (b.lines || []).length > 1) keepLines = true;
    // ২০২৬-১০-১৩: দুপাশে-সমান অনুচ্ছেদে মাপা লাইন-সংখ্যা = Gemini-র লাইন (≥৩) ⇒ লাইন-ভাঙা মূলের মতো রাখা, দুপাশে সমান থাকে
    // (keepJust — builder "both"; Word নিজে মোড়ালে a13-এ ৫ লাইন ৪ হয়ে শেষ লাইন ভুল জায়গায়)
    let keepJust = false;
    if (!keepLines && !tabs && align === 'j' && bl.length >= 3 && m && !m.empty && m.lines && m.lines.length === bl.length) keepLines = keepJust = true;
    // a11 (প্রস্থ-নির্ণয় width-ratio.mjs): অন্য কারণে লাইন-অক্ষত দুপাশে-সমান অনুচ্ছেদ builder-এ "বাঁয়ে" ⇒ মূলে কিনারা-ছোঁয়া লাইন
    // আমাদের ৫–১৫% ছোট। মাপা লাইন = Gemini-র লাইন আর শেষটি বাদে সব লাইন প্রায় পূর্ণ-প্রস্থ (≥৯২%) ⇒ "both" (Word br-এ শেষ হওয়া লাইনও ছড়ায়)
    if (!keepJust && !globalThis.__FZ_OFF_KJ && keepLines && !tabs && align === 'j' && bl.length >= 2 && m && !m.empty && m.lines && m.lines.length === bl.length) {
      const ws = m.lines.map((l) => l.w || 0), mx = Math.max(...ws);
      if (mx > 0 && ws.slice(0, -1).every((w) => w >= mx * 0.92)) keepJust = true;
    }
    // Part-17.9: ট্যাবওয়ালা লাইন বাঁয়ে (ডানে-বসানো + ট্যাব Word-এ ভেঙে কয়েক লাইন হতো — "সর্বমোট=  ১০০"); অবস্থান ট্যাব-স্টপই দেয়
    if (tabs) align = 'l';
    const ul = !tabs && perLineUnderline(b.lines, m);
    if (ul && !globalThis.__FZ_OFF_ULINE2 && bl.length >= 2) { keepLines = true; if (align === 'j') keepJust = true; }
    // ২০২৬-১০-১৪ (a17 p4 "কর্মকর্তাদের নাম ⟦ ⟧ পদবি ⟦ ⟧ স্বাক্ষর"): নিচে-দাগের শিরোনাম-সারিতে Gemini ⟦ ⟧ দেয় কলামের ফাঁক বোঝাতে,
    // builder তা □ বানাত। দাগওয়ালা লেখায় চেকবক্স হয় না (a03-এর আসল বাক্সগুলো দাগহীন সারিতে) ⇒ বাদ। বন্ধ: FZ_OFF=ULBOX
    const noBox = (l) => (b.underline && !globalThis.__FZ_OFF_ULBOX ? String(l).replace(/ ?[[⟦]\s?[\]⟧]/g, '') : l);
    return Object.assign(base, {
      kind: 'para', text: noBox(b.text || ''), lines: (ul ? ul : b.lines || []).map(noBox), keepLines, keepJust, fs: b.fs,
      tabLines: tabs ? tabs.lines.map(noBox) : null, tabStopsSrc: tabs ? tabs.stops : null,
      italic: !!b.italic, underline: ul ? false : !!b.underline || !!(m && m.underline),
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
      // B6: ফন্ট মাপা লাইন-দূরত্বের চেয়ে বড় হতে পারে না (g33: উচ্চতা ৯.৯, প্রস্থ ১৩.২, দূরত্ব ≈১১.৩ — Gemini-র লাইন ছাপার চেয়ে ছোট;
      // ১৬ লাইন Word-এ ২২ হয়ে পাতা উপচাত)। শুধু অনুপাত কমালে g22/g38-এর সঠিক প্রস্থ-অনুমানও বাদ পড়ত।
      const pitch = (it.m.lines || []).length >= 3 ? it.m.pitchPt : 0;
      // a03 (২০২৬-১০-১২): Gemini পূরণ-সারি ("নাম : ........") জুড়ে দিলে, অথচ মূলে ফাঁকা ঘর ⇒ প্রস্থ-অনুমান ৩–৫pt (ফন্ট ৯.৫-এ আটকে
      // লাইনগুলো খুদে)। পূরণ-সারির লেখায় প্রস্থ উচ্চতার ৬০%-এর কম হলে উচ্চতা-অনুমান
      if (wEst && wEst < hEst * 0.6 && /([._\-…·─])\1{5,}/.test(it.text || (it.lines || []).join(' '))) return hEst;
      // ২০২৬-১০-১৪ (a17 p9/p10, মালিকের Word-যাচাই): পূরণ-সারির প্রস্থ Gemini-র আন্দাজি বিন্দু-সংখ্যায় (⟦.×60⟧) বাঁধা ⇒ এক ফরমে
      // "পরীক্ষার নাম" ১৭.৫, "কেন্দ্রের নাম" ৯.৫ (মূলে সমান)। উচ্চতা থেকে >২০% দূরে ⇒ উচ্চতা-অনুমান। বন্ধ: FZ_OFF=FILLW
      if (!globalThis.__FZ_OFF_FILLW && wEst && Math.abs(wEst - hEst) > hEst * 0.2 && /([._\-…·─])\1{5,}/.test(it.text || (it.lines || []).join(' '))) return hEst;
      // a15 (মালিকের টেস্ট): মূলত ইংরেজি লেখা (ওয়েব/ই-মেইল) মূলে চওড়া লাতিন ফন্টে ⇒ আমাদের ফন্টে প্রস্থ-অনুমান ফোলে (১২.৫ ⇒ ১৭) ⇒ উচ্চতা
      const tx = String(it.text || (it.lines || []).join(' ')), lat = (tx.match(/[A-Za-z]/g) || []).length;
      if (wEst && wEst > hEst * 1.15 && lat >= 10 && lat >= tx.replace(/\s/g, '').length * 0.6) return hEst;
      return wEst && wEst <= hEst * 1.6 && !(pitch && wEst > pitch * 1.05) ? wEst : hEst;
    };
    const ests = []; paras.forEach((it) => { const e = estOf(it); for (let k = 0; k < Math.max(1, it.m.lines.length); k++) ests.push(e); });
    const bodyInk = median(ests);          // (নাম পুরোনো — এখন ফন্ট-অনুমান pt)
    const eFont = bodyInk || 12;
    // Part-17.9: আসল কাগজ-মাপের পাতা (PDF: A4/লেটার/লিগ্যাল…) ⇒ সবসময় আসল মাপ (প্রচ্ছদে মূল-লেখা ১৪–১৬pt স্বাভাবিক);
    // কাগজ-মাপ নয় (ক্যামেরা-ছবি, পিক্সেল-মাপ) ⇒ মূল-লেখা ১২pt ধরে A4-এ স্বাভাবিককরণ
    const paperOk = src.widthPt >= 400 && src.widthPt <= 1300 && src.heightPt >= 400 && src.heightPt <= 1800;
    let scale = paperOk && eFont >= 6 && eFont <= 24 ? 1 : 12 / eFont;
    // a17/a19 (মালিকের টেস্ট, ২০২৬-১০-১৩): CamScanner-এর পিক্সেল-পাতা (১০৯৩×১৮০০) "কাগজ" ধরা হতো ⇒ মূল-লেখা ২২.৫pt, সব বিশাল।
    // মাপ কোনো আদর্শ কাগজ নয় অথচ অনুপাত আদর্শ কাগজের (লিগ্যাল ১.৬৪৭) ⇒ সেই কাগজের প্রস্থে, মার্জিন অনুপাতে
    const STD = [[595, 842], [612, 792], [612, 1008], [842, 1191]];
    const isStd = STD.some(([w, h]) => (Math.abs(src.widthPt - w) <= w * 0.03 && Math.abs(src.heightPt - h) <= h * 0.03) ||
      (Math.abs(src.widthPt - h) <= h * 0.03 && Math.abs(src.heightPt - w) <= w * 0.03));
    const fitCand = !isStd && src.widthPt > 700 && src.heightPt > src.widthPt
      ? STD.find(([w, h]) => Math.abs(src.heightPt / src.widthPt - h / w) <= (h / w) * 0.015) : null;
    // a17 (২০২৬-১০-১৩): বড় লেখার কার্ড-শিট — মাপা মূল-লেখা >২৪ ⇒ ১২pt-স্বাভাবিককরণে পুরো পাতা ২৩% (কার্ড ওপরের অর্ধেকে, খুদে লেখা);
    // অনুপাত আদর্শ কাগজের হলে সেই কাগজের মাপেই, যদি তাতে মূল-লেখা ≤৩০pt হয়
    const fitPaper = fitCand && (scale === 1 || (!globalThis.__FZ_OFF_FITBIG && paperOk && eFont * fitCand[0] / src.widthPt <= 30)) ? fitCand : null;
    if (fitPaper) scale = fitPaper[0] / src.widthPt;
    // a10 (১৮৬৯×২৪৮৭, অনুপাত ১.৩৩ — কোনো আদর্শ কাগজ নয়, পিক্সেলও বিশাল): আগে A4-এ "বিষয়বস্তু মাপে, মাঝে" বসত ⇒ অনুপাত বদলে
    // সব লাইন ২০–৬০pt সরত, বাঁ মার্জিন ৭৫ ⇒ ৫০। Word-এ যেকোনো পাতা-মাপ চলে ⇒ মূলের অনুপাতে কাগজ (প্রস্থ ৫৯৫), একই স্কেল, মূল মার্জিন
    const ratio0 = src.heightPt / src.widthPt;
    const customFit = !globalThis.__FZ_OFF_CUSTOM && !fitPaper && !paperOk && !isStd && src.widthPt > 1300 && ratio0 >= 1.25 && ratio0 <= 1.75 ? [595, Math.round(595 * ratio0)] : null;
    if (customFit) scale = customFit[0] / src.widthPt;
    const bodyFont = scale === 1 || fitPaper || customFit ? Math.round(eFont * scale * 2) / 2 : 12;
    // বিষয়বস্তুর সীমা (ব্লক-সমষ্টি — পাতার কিনারার ছায়া/দাগ নয়)
    const C = withRect.length ? {
      x0: Math.min(...withRect.map((it) => it.rect.x)), y0: Math.min(...withRect.map((it) => it.rect.y)),
      x1: Math.max(...withRect.map((it) => it.rect.x + it.rect.w)), y1: Math.max(...withRect.map((it) => it.rect.y + it.rect.h))
    } : { x0: 54, y0: 54, x1: src.widthPt - 54, y1: 120 };
    let paperW = src.widthPt, paperH = src.heightPt, left, top;
    const standardSize = src.widthPt >= 400 && src.heightPt >= 400;
    if (scale === 1 && standardSize) {
      left = C.x0; top = C.y0;                                          // আসল মাপ: মূল মার্জিন
    } else if (fitPaper || customFit) {
      [paperW, paperH] = fitPaper || customFit; left = C.x0 * scale; top = C.y0 * scale;   // পিক্সেল-পাতা ⇒ আদর্শ/মূল-অনুপাতের কাগজ, মার্জিন অনুপাতে
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
      // নির্ণয় (qa/golden/table-rows.mjs): ছকের মাপা আড়া-রেখা আউটপুট-স্থানাঙ্কে — Word-এর সারি বনাম মূলের রেখা
      if (it.kind === 'table' && it.m && Array.isArray(it.m.hRulesPt)) it.srcRulesPt = it.m.hRulesPt.map((y) => r1(top + (y - C.y0) * scale));
      // ২০২৬-১০-১৪ (2.pdf): দাগহীন ছকের ভেতরের আড়া-রেখা (মোটের ওপরের দাগ) — বিস্তারসহ; builder ঘরের ওপর/নিচ-বর্ডার বসায়। বন্ধ: FZ_OFF=TRULE
      // (ছকের আয়তের অনুপাতে — পরে আয়ত সরলেও ঠিক থাকে)
      if (!globalThis.__FZ_OFF_TRULE && it.kind === 'table' && it.borderless && it.rect && it.rect.w > 0 && it.rect.h > 0 && it.m && Array.isArray(it.m.hRuleSpansPt)
        && it.m.hRuleSpansPt.length === it.m.hRulesPt.length && it.m.hRulesPt.length <= 3) {
        const R = it.rect, fx = (x) => Math.round(((left + (x - C.x0) * scale) - R.x) / R.w * 1000) / 1000;
        it.ruleSpans = it.m.hRulesPt.map((y, k) => ({ fy: Math.round(((top + (y - C.y0) * scale) - R.y) / R.h * 1000) / 1000, fx0: fx(it.m.hRuleSpansPt[k][0]), fx1: fx(it.m.hRuleSpansPt[k][1]) }));
      }
      if (it.tabStopsSrc) it.tabStopsAbs = it.tabStopsSrc.map((x) => left + (x - C.x0) * scale);
      if (it.kind === 'para') {
        // মাপা লাইন Gemini-র লাইনের তুলনায় অনেক কম ⇒ লাইন আলাদা হয়নি (কাত/ঘন ছাপা) ⇒ মাপ অবিশ্বাস্য, মূল-লেখার আকার
        const textLines = (it.lines && it.lines.length) || 1;
        const reliable = it.m && it.m.lineInkPt && bodyInk && !(textLines >= 2 && it.m.lines.length < textLines * 0.6);
        let ratio = reliable ? estOf(it) / bodyInk : (FS_CLASS[it.fs] || 12) / 12;
        // শিরোনাম-জাতীয় ছাড়া সাধারণ লেখা মূল-লেখার কাছাকাছি (মাপের গোলমাল সীমিত)
        if (!/^(title|heading|header)$/.test(it.type)) ratio = clamp(ratio, 0.7, 1.3);
        // a03 (২০২৬-১০-১২): আঁকা চেকবক্স (≈১৬pt উঁচু, Gemini লেখে "⟦ ⟧") কালি-উচ্চতা/প্রস্থ ফোলায় ⇒ "ধর্ম : ইসলাম ⟦ ⟧ …" ১৭.৫pt
        // (মূলে ≈১১)। চেকবক্সের লাইন মূল-লেখার চেয়ে বড় নয়
        if (ratio > 1 && /[[⟦]\s?[\]⟧]|[□☐]/.test(it.text || '')) ratio = 1;
        // [Rule IR5: FZ_OFF=FORMFIX / FZ_OFF=IR5] বন্ধনীযুক্ত এক-লাইনের ফুটনোট অনুচ্ছেদে (যেমন a16 পাতা ৫ "(বি.দ্র. ...)") প্রস্থ-ভিত্তিক ফন্ট ছোট হলে সেটিই গ্রহণ।
        if (fzOn('FORMFIX') && !globalThis.__FZ_OFF_IR5 && textLines === 1 && /^\s*[(\[（]/.test(it.text || '') && (it.text || '').length > 35 && it.m && it.m.widthFontPt && it.m.widthFontPt < bodyInk * 0.92) {
          ratio = clamp(it.m.widthFontPt / bodyInk, 0.72, 0.92);
        }
        // অতি-ছোট লেখা ("১।", "র") — অক্ষর-শ্রেণির অনুমানও অনিশ্চিত ⇒ ছোট করা নয়
        const avgLen = (it.text || '').replace(/\s+/g, ' ').length / textLines;
        if (ratio < 1 && avgLen < 5 && it.type !== 'page_number') ratio = 1;
        // অনুপাত এখন ক্যালিব্রেটেড ⇒ মূল-লেখার ±১০%-এ হলে ঠিক মূল-লেখার আকার
        // a09: ±১০% সহনশীলতায় ১০.৮ ⇒ ১২ হতো (প্রস্থ +১০%, লাইন মুড়ে পাতা উপচাত) ⇒ ±৫%
        it.fontPt = Math.abs(ratio - 1) <= 0.1 ? bodyFont : clamp(Math.round(bodyFont * ratio * 2) / 2, 6, 60);
        // Part-17.9: মোটা/হেলানো — কালির রেখা-পুরুত্ব (ফন্ট-অনুপাতে) পুরো ফাইলের সাধারণ লেখার সাথে তুলনা; Gemini-র কথা শুধু মাপ না থাকলে
        if (it.m && it.m.lineInkPt > 0) it.diag = { inkPt: r1(it.m.lineInkPt), estPt: r1(estOf(it)), wPt: it.m.widthFontPt ? r1(it.m.widthFontPt) : null, ratio: inkRatioFor(it.text), lines: it.m.lines.length,
          sl: it.m.slant || 0, slQ: it.m.slantGain ? Math.round(it.m.slantGain * 1000) / 1000 : null, sH: Math.round((it.m.strokeHPt || 0) * 100) / 100, sV: Math.round((it.m.strokeVPt || 0) * 100) / 100, dens: Math.round((it.m.inkDensity || 0) * 1000) / 1000 };
        // মোটা কিনা পরে পুরো ফাইল মিলিয়ে (build-এর শেষে) — চূড়ান্ত ফন্টের অনুপাতে রেখা-পুরুত্ব
        if (it.m && it.m.strokePt > 0 && it.m.lineInkPt > 0) it._stroke = it.m.strokePt * scale;
        if (it.m && it.m.slant >= 0.1) it.italic = true;
        if (!reliable) it.lineSpacingPt = 0;
        // লাইন-দূরত্ব ফন্টের ১.৬ গুণের বেশি ⇒ মাপ অবিশ্বাস্য (দুই লাইন জোড়া পড়েছে) — Word-এর স্বাভাবিক দূরত্ব
        // ২০২৬-১০-১৩: মাপা লাইন-সংখ্যা = Gemini-র লাইন-সংখ্যা (≥২) হলে জোড়া পড়েনি ⇒ ২.২ গুণ পর্যন্ত বিশ্বাস্য
        // (a13: ১১pt লেখা ১৯pt দূরত্বে ৫ লাইন — ফেলে দিলে অনুচ্ছেদ ২৫pt খাটো, নিচের সব ওপরে)
        const sameN = it.m && it.m.lines && it.lines && it.lines.length >= 2 && it.m.lines.length === it.lines.length;
        if (it.lineSpacingPt > it.fontPt * (sameN ? 2.2 : 1.6)) it.lineSpacingPt = 0;
        it.lineSpacingPt = r1((it.lineSpacingPt || 0) * scale);
        it.firstIndentPt = r1((it.firstIndentPt || 0) * scale);
      } else if (it.kind === 'table') {
        // Part-17.8: মাপা ঘরের ফন্ট (মূল-লেখার ±১৫%-এ হলে মূল-লেখার আকার); মাপ না থাকলে আগের মতো
        const est = it.cellFontSrc ? it.cellFontSrc * scale : 0;
        // a16: ছোট মাপকে মূল-লেখায় ঠেলে তোলা (১২.৫ ⇒ ১৩.৫) ছক চওড়া/লম্বা করে পাতা উপচাত ⇒ ওপরে তোলা শুধু ≤৫%
        const maxTblFont = it.rowFontCap ? Math.min(bodyFont, Math.round(it.rowFontCap * scale * 2) / 2) : (it.rows && it.rows.length >= 6 ? bodyFont : 18);
        it.fontPt = est ? ((est <= bodyFont ? bodyFont - est <= bodyFont * 0.05 : est - bodyFont <= bodyFont * 0.1) ? Math.min(bodyFont, maxTblFont) : clamp(Math.round(est * 2) / 2, 7, maxTblFont)) : Math.min(bodyFont, 12);
        // ২০২৬-১০-১৪ (a17 p6, মালিকের Word-যাচাই): অনুচ্ছেদ-ভরা ফরম-ছক (ঘরে ≥৮০ অক্ষর) — বিন্দু-সারির ঘর-কালিতে মাপ ১২% কম ⇒ ছক মূল
        // লেখার চেয়ে স্পষ্ট ছোট (মূলে সমান)। ≤১৫% ছোট হলে মূল-লেখার আকার (তবে সারি-উচ্চতার ঊর্ধ্বসীমা অতিক্রম নয়)। বন্ধ: FZ_OFF=TXTTF
        if (!globalThis.__FZ_OFF_TXTTF && !it.rowFontCap && est && est < bodyFont && est >= bodyFont * 0.85 && it.rows
          && it.rows.some((r) => r.some((c) => String(c || '').replace(/\s+/g, '').length >= 80))
          && it.rows.some((r) => r.some((c) => /([._…·])\1{4,}/.test(String(c || ''))))) {
          const lifted = Math.min(bodyFont, maxTblFont);
          if (lifted > it.fontPt) { it._fontBase = it.fontPt; it.fontPt = lifted; }
        }
        // ২০২৬-১০-১৪ (a19): ছোট ছক (১০।-এর ৩টি ১×২) ঘর-কালি শুধু বিন্দু-সারিতে মাপা ⇒ ৫.৮ ⇒ ৭pt ক্ষুদে লেখা। অবিশ্বাস্য ছোট
        // (< মূল-লেখার ৫৫%) ⇒ সারির মাপা উচ্চতা যতটা দেয় (লেখা-কালি ≈ ফন্টের ৮৭%), মূল-লেখা পর্যন্ত
        // ২০২৬-১০-১৪ (a17 p10): প্রায়-ফাঁকা ছক (≥৭০% ঘর ফাঁকা; লেখা শুধু ক্রমিক অঙ্ক) — অঙ্কের কালি ছোট ⇒ ঘর-ফন্ট ৮ (মূলে ~১১)।
        // সারি যথেষ্ট উঁচু হলে মূল-লেখার ৮৫% পর্যন্ত তোলা (সারি-উচ্চতার ৬০%-এর বেশি নয়)। FZ_OFF=SPARSETF
        if (!globalThis.__FZ_OFF_SPARSETF && it.rows && it.rows.length >= 4 && it.rect) {
          const cells = it.rows.reduce((a, r) => a.concat(r), []), filledN = cells.filter((c) => c && String(c).trim()).length;
          const rowH = it.rect.h / it.rows.length;
          if (cells.length && filledN / cells.length <= 0.3 && rowH >= bodyFont * 1.4) {
            const floor = Math.round(Math.min(bodyFont * 0.85, rowH * 0.6) * 2) / 2;
            if (floor > it.fontPt) it.fontPt = floor;
            if (it.rowHeightsPt && it.rowHeightsPt[0] >= bodyFont * 2.2) it.headFontPt = bodyFont;
          }
        }
        // শুধু ১–২ সারির ক্ষুদে ছকে (f1-এর বহু-সারির ছকে বড় ফন্ট ⇒ পাতা উপচাল, ৫৯→২২)
        if (est && est < bodyFont * 0.55 && it.rect && it.rows && it.rows.length && it.rows.length <= 2 && !globalThis.__FZ_OFF_TINYTF) {
          const byH = Math.round(it.rect.h / it.rows.length * 1.15 * 2) / 2;   // rect এখানে আগেই পাতার মাপে
          if (byH > it.fontPt) it.fontPt = Math.min(bodyFont, byH);
          // বড় ফন্টে সরু ক্রমিক-কলাম ("১০।") ভেঙে খাড়া হতো ⇒ ছোট লেখার কলাম অন্তত লেখার প্রস্থ, বাকিটা পাশের কলাম থেকে
          const fr = it.colFractions, W = it.rect.w;
          if (Array.isArray(fr) && fr.length >= 2 && W > 0) {
            const need = fr.map((f, k) => { const mx = Math.max(0, ...it.rows.map((r) => String(r[k] || '').length)); return mx && mx <= 6 ? (mx * it.fontPt * 0.6 + 2 * 5.4 + 4) / W : 0; });
            const add = need.reduce((a, n, k) => a + Math.max(0, n - fr[k]), 0);
            const big = fr.indexOf(Math.max(...fr));
            if (add > 0 && fr[big] - add > 0.3) it.colFractions = fr.map((f, k) => (k === big ? f - add : Math.max(f, need[k])));
          }
        }
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

  /**
   * ২০২৬-১০-১৪ (a16 p1, মালিকের Word-যাচাই): হাতের সইয়ের পাশে হাতে লেখা তারিখ ("১৯/১০/২০২০") সই-ছবিতেই আছে, অথচ Gemini
   * আলাদা লেখাও দেয় ⇒ ছবির পাশে সরু ঘরে খাড়া হয়ে দ্বিতীয়বার ছাপা হতো। ছবির ওপর (≥৩০% ঢাকা, বা কেন্দ্র ছবির ভেতরে) পড়া
   * শুধু-তারিখ লাইন বাদ (একমাত্র লাইন হলে পুরো ব্লক)। বন্ধ: FZ_OFF=SIGDATE
   */
  function dropSigDates(items) {
    const figs = items.filter((it) => it.kind === 'figure' && it.rect && !it.rotatedText);
    if (globalThis.__FZ_OFF_SIGDATE || !figs.length) return items;
    const DATE = /^[\s*]*[০-৯0-9]{1,2}\s*[/.\-]\s*[০-৯0-9]{1,2}\s*[/.\-]\s*[০-৯0-9]{2,4}[\s*]*$/;
    const onFig = (r) => figs.some((f) => {
      const ix = Math.max(0, Math.min(r.x + r.w, f.rect.x + f.rect.w) - Math.max(r.x, f.rect.x));
      const iy = Math.max(0, Math.min(r.y + r.h, f.rect.y + f.rect.h) - Math.max(r.y, f.rect.y));
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      return ix * iy >= 0.3 * Math.max(1, r.w * r.h) || (cx >= f.rect.x - 6 && cx <= f.rect.x + f.rect.w + 6 && cy >= f.rect.y - 6 && cy <= f.rect.y + f.rect.h + 6);
    });
    const out = [];
    for (const it of items) {
      if (it.kind !== 'para' || !it.rect || it.tabLines) { out.push(it); continue; }
      const ls = (it.lines && it.lines.length ? it.lines : String(it.text || '').split('\n')).filter((l) => String(l).trim());
      if (!ls.length) { out.push(it); continue; }
      if (!DATE.test(ls[0])) {
        const pitch = it.lineSpacingPt || (it.fontPt || 12) * 1.2;
        const expH = ls.length * pitch;
        const hitF = figs.find((f) => Math.abs(it.rect.y - f.rect.y) <= 8 && it.rect.h > expH + 14 &&
          Math.min(it.rect.x + it.rect.w, f.rect.x + f.rect.w) - Math.max(it.rect.x, f.rect.x) >= 0.3 * Math.min(it.rect.w, f.rect.w));
        if (hitF) {
          const ny = it.rect.y + it.rect.h - expH;
          if (hitF.rect.y + hitF.rect.h > ny - 1) { hitF.rect = Object.assign({}, hitF.rect, { h: r1(Math.max(12, ny - hitF.rect.y - 2)) }); hitF.heightPt = hitF.rect.h; }
          out.push(Object.assign({}, it, { rect: Object.assign({}, it.rect, { y: r1(ny), h: r1(expH) }) }));
          continue;
        }
        out.push(it);
        continue;
      }
      if (ls.length === 1) { if (!onFig(it.rect)) out.push(it); continue; }
      // প্রথম লাইন তারিখ, বাকিগুলো নাম/পদবি: প্রথম লাইনের আন্দাজি জায়গা ছবির ওপর হলে শুধু সেটি বাদ
      const lh = it.rect.h / ls.length;
      if (onFig({ x: it.rect.x, y: it.rect.y, w: it.rect.w, h: lh })) {
        const rest = ls.slice(1);
        out.push(Object.assign({}, it, { lines: rest, text: rest.join('\n'), keepLines: true, rect: Object.assign({}, it.rect, { y: it.rect.y + lh, h: it.rect.h - lh }) }));
      } else out.push(it);
    }
    return out;
  }

  /** একটি পাতার item-তালিকা (rect স্বাভাবিককৃত) → সারি ও কলাম */
  function bandsOf(items, page) {
    items = dropSigDates(items);
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
      // শুধু একই কলামে পড়া লেবেল+বাক্স জোড়া (আলাদা কলামে থাকলে এমনিতেই পাশাপাশি — জোড়ায় নেস্টেড টেবিল উচ্চতা বাড়াত, a02)
      cols.forEach((c) => { if (c.items.length > 1) attachBoxLabels(c.items); });
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
    // মালিকের চিঠি (২০২৬-১০-১৩): মূলে এক আকারের অনুচ্ছেদগুলো আমাদের ১১/১৩/১৬pt — কালি-মাপের গোলমাল ±৮%-এর অনেক বেশি।
    // একই Gemini-আকার-শ্রেণির (fs) সাধারণ লেখা (অনুচ্ছেদ/তালিকা/প্রশ্ন) পাতায় ≥২টি ⇒ লাইন-ভারিত প্রধান আকার; ±৩০%-এর ভেতরের সবাই সেটিতে।
    // আসল আকার-পার্থক্য হলে Gemini আলাদা শ্রেণি দেয় (s/m/l) ⇒ থাকে
    if (!globalThis.__FZ_OFF_BODYSNAP) {
      const byFs = {};
      page.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
        if (it.kind === 'para' && it.fontPt && it.fs && /^(paragraph|list_item|question)$/.test(it.type)) (byFs[it.fs] = byFs[it.fs] || []).push(it);
      })));
      for (const arr of Object.values(byFs)) {
        if (arr.length < 2) continue;
        // ভোট = আসল অক্ষর-সংখ্যা (পূরণ-রেখা বাদ); ≥১৫ অক্ষরের লেখাই ভোট দেয় — a01: দশটি "১।" (আকার অনুমানহীন, পাতার ডিফল্ট)
        // লাইন-গোনায় জিতে ১১.৫pt অনুচ্ছেদগুলো ১০-এ নামাত
        // শুধু-রেখা/ছোট লেখা (a09: "-----" ৮.৫⇒১২ হলে প্রস্থ ফুলে লাইন ভাঙত) বদলায় না — ভোটারই বদলায়
        const w = {}, realN = (x) => String(x.text || '').replace(/([._\-…·─])\1{2,}/g, '').replace(/\s+/g, '').length;
        // পূরণ-রেখাওয়ালা লাইনও নয় (a02: "০২। বর্তমান ঠিকানা : ……" ১৩⇒১১ — বিন্দুর প্রস্থ বদলে ছবি −১.৬)
        const voters = arr.filter((x) => realN(x) >= 15 && !/([._\-…·─])\1{5,}/.test(String(x.text || '')));
        voters.forEach((x) => { w[x.fontPt] = (w[x.fontPt] || 0) + realN(x); });
        // ২০২৬-১০-১৪ (a17 p2 "বিষয়ের নাম : ……" ১৫.৫ / "বান্ডেলের অভ্যন্তরের … : ……" ১১.৫, মূলে সমান): ভোটার <২ হলেও শ্রেণির
        // মধ্যমায় পূরণ-সারি এক (নিচে FILLSNAP); সাধারণ লেখা আগের মতো শুধু ভোটার থাকলে
        if (voters.length < 2) {
          if (!globalThis.__FZ_OFF_FILLSNAP) {
            const fill = arr.filter((x) => /([._\-…·─])\1{5,}/.test(String(x.text || '')));
            const md = median(arr.map((x) => x.fontPt));
            if (fill.length >= 2 || (fill.length && voters.length)) fill.forEach((x) => { const d = Math.abs(x.fontPt - md); if (d > md * 0.08 && d <= md * 0.35) { x.fontOutlier = x.fontOutlier || x.fontPt; x.fontPt = md; } });
          }
          continue;
        }
        const dom = +Object.keys(w).sort((a, b) => w[b] - w[a])[0];
        voters.forEach((x) => { if (x.fontPt !== dom && Math.abs(x.fontPt - dom) <= dom * 0.3) { x.fontOutlier = x.fontOutlier || x.fontPt; x.fontPt = dom; } });
        // ২০২৬-১০-১৪ (a17 p9/p10, মালিকের Word-যাচাই): পূরণ-সারি ভোটার নয়, বদলায়ও না ⇒ "কেন্দ্রের নাম : ……" ৯.৫ (মূলে পাশের লাইনের সমান)।
        // >৮% (≤৩৫%) গোলমালে পূরণ-সারিও প্রধান আকারে — মালিক: "একই ফরমের লেখা একই ফন্টে" (বিন্দু এখন লিডার-ট্যাবে মাপা প্রস্থে,
        // তাই a02-এর পুরোনো "বিন্দুর প্রস্থ বদলে ছবি −১.৬" ঝুঁকি কম)। বন্ধ: FZ_OFF=FILLSNAP
        if (!globalThis.__FZ_OFF_FILLSNAP) arr.filter((x) => !voters.includes(x) && /([._\-…·─])\1{5,}/.test(String(x.text || '')))
          .forEach((x) => { const d = Math.abs(x.fontPt - dom); if (d > dom * 0.08 && d <= dom * 0.35) { x.fontOutlier = x.fontOutlier || x.fontPt; x.fontPt = dom; } });
      }
    }
    // CV (মালিকের রান, ২০২৬-১০-১২): একই ধরন (list_item/label_value) ও একই Gemini-আকার-শ্রেণির (fs) সারিতে মাপা আকার লাফায়
    // (Sex/Marital ১৫.৫, Blood Group/Religion ৯.৫ — ভুল লাইনে বসা মাপ)। ≥৩টির দলে মধ্যমা থেকে >২০% দূরে ⇒ মাপের ভুল ⇒ মধ্যমা।
    // আসল আকার-পার্থক্য হলে Gemini-ও আলাদা শ্রেণি দেয় (s/m/l) ⇒ সেটা থাকে
    const byClass = {};
    page.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
      // শুধু তালিকা/লেবেল-মান (মাঠের সারি সমান হয়); শিরোনাম-অনুচ্ছেদে আকার আসলেই ভিন্ন হয় (g01 মেমো-মাথা ১৪/২০)
      if (it.kind === 'para' && it.fontPt && it.fs && /^(list_item|label_value)$/.test(it.type)) (byClass[it.type + '|' + it.fs] = byClass[it.type + '|' + it.fs] || []).push(it);
    })));
    for (const arr of Object.values(byClass)) {
      if (arr.length < 3) continue;
      const m = median(arr.map((x) => x.fontPt));
      arr.forEach((x) => { if (Math.abs(x.fontPt - m) > m * 0.2) { x.fontOutlier = x.fontPt; x.fontPt = m; } });
      // a15 (মালিকের টেস্ট, ২০২৬-১০-১৩): ফরমের সারি (০১–১৩) মূলে এক ফন্ট, মাপে ১১.৫–১৫ লাফায় (±২০%-এর ভেতরে ⇒ ওপরের নিয়মে থাকত)।
      // দলের অর্ধেক বা বেশি এক আকারে (±৩%) ⇒ সেটাই আসল; ±২০%-এর ভেতরের বাকিগুলোও সেই আকারে
      if (arr.length >= 5) {
        const cnt = {};
        arr.forEach((x) => { cnt[x.fontPt] = (cnt[x.fontPt] || 0) + 1; });
        const mode = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
        const near = arr.filter((x) => Math.abs(x.fontPt - mode) <= mode * 0.03).length;
        if (near >= arr.length * 0.5) arr.forEach((x) => { if (x.fontPt !== mode && Math.abs(x.fontPt - mode) <= mode * 0.2) { x.fontOutlier = x.fontOutlier || x.fontPt; x.fontPt = mode; } });
      }
    }
  }

  /**
   * CV (মালিকের রান, ২০২৬-১০-১২): লেবেল-মানের পরপর লাইনে কোলন এক খাড়া সারিতে থাকে — মাপা ট্যাব-স্টপ লাইন-ভেদে কয়েক pt
   * আলাদা আর কোলন কোথাও লেবেলের শেষে ("Result :\tCGPA"), কোথাও মানের শুরুতে ("Discipline\t: Philosophy")।
   * একই ঘরে পরপর এক-ট্যাবের item-দলে: (১) সবসময় "লেবেল\t:\tমান" (কোলন ও মান দুই স্টপে), (২) স্টপগুলো ≤২৪pt-এর মধ্যে হলে সবচেয়ে বড়টিতে এক।
   */
  /**
   * ২০২৬-১০-১৪ (a02 NOC, মালিকের Word-যাচাই): "০২।\tবর্তমান ঠিকানা", "০৬।\tআবেদনকারী…" — মাপা ফাঁকে ট্যাব, অথচ "০৫। আবেদনকারীর…",
   * "০৭। অনাপত্তি…" ট্যাবহীন (ফাঁক মাপা যায়নি) ⇒ লেখা নম্বরের গায়ে, ক্রমিক-সারি অসমান। পাতায় ট্যাবওয়ালা ক্রমিক-লাইনের নম্বর-স্টপ
   * (একই বাঁ-প্রান্ত ±৬pt) ট্যাবহীন এক-লাইনের ক্রমিক-অনুচ্ছেদেও। বন্ধ: FZ_OFF=NUMTAB
   */
  function alignNumberTabs(page) {
    if (globalThis.__FZ_OFF_NUMTAB) return;
    const NUM = /^\s*(\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2})\s*\t/, NUMS = /^\s*(\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2})\s+(\S.*)$/;
    const refs = [], cands = [];
    page.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
      if (it.kind !== 'para') return;
      const left = (c.x0 || 0) + (it.indentPt || 0);
      if (it.tabLines && it.tabStops && it.tabStops.length && NUM.test(it.tabLines[0])) refs.push({ left, stop: (c.x0 || 0) + it.tabStops[0] });
      else if (!it.tabLines && it.lines && it.lines.length === 1 && NUMS.test(String(it.lines[0]))) cands.push({ it, left, x0: c.x0 || 0 });
    })));
    if (!refs.length) return;
    for (const { it, left, x0 } of cands) {
      const ref = refs.find((r) => Math.abs(r.left - left) <= 6);
      if (!ref) continue;
      const m = NUMS.exec(String(it.lines[0]));
      // নম্বরের মাপা প্রস্থ স্টপের আগে শেষ হতেই হবে (নইলে ট্যাব পরের স্টপে লাফাত)
      if (it.rect && left + it.rect.w * m[1].replace(/\*/g, '').length / String(it.lines[0]).trim().length > ref.stop - 2) continue;
      Object.assign(it, { tabLines: [m[1] + '\t' + m[2]], tabStops: [r1(ref.stop - x0)], firstIndentPt: 0 });
    }
  }

  function alignTabStops(page) {
    const nTab = (l) => (l.match(/\t/g) || []).length;
    // এক ট্যাবের item: প্রথম লাইনে ঠিক একটি ট্যাব, বাকি লাইনে ≤১ (ঠিকানার পরের লাইন ট্যাবহীন হতে পারে)
    const oneTab = (it) => it.kind === 'para' && it.tabLines && it.tabStops && it.tabStops.length === 1 && nTab(it.tabLines[0]) === 1 && it.tabLines.every((l) => nTab(l) <= 1);
    // ≥৩ লাইনের item-এ অর্ধেক বা বেশি লাইনে ট্যাব ⇒ ট্যাবহীন "লেবেল : মান" লাইনেও কোলনে ট্যাব (শিক্ষাগত যোগ্যতার তালিকা)
    const fillTabs = (it) => {
      const L = it.tabLines;
      if (!L || L.length < 3 || L.filter((l) => nTab(l) === 1).length < L.length / 2) return;
      it.tabLines = L.map((l) => (nTab(l) ? l : l.replace(/\s+:\s+/, '\t: ')));
    };
    // দল: এক-ঘরের পরপর ব্যান্ড জুড়ে (প্রতিটি লাইন সাধারণত আলাদা ব্যান্ড), আর বহু-ঘরের ব্যান্ডে প্রতিটি ঘর আলাদা
    const runs = [];
    let cur = [], pend = [];
    const flush = () => { if (cur.length) runs.push(cur); cur = []; pend = []; };
    // সিভি (মালিকের স্ক্রিনশট ২): "Name of University : National University" — মাপা ফাঁক নেই বলে ট্যাবহীন, দলের পাশে বেমানান।
    // দলের ঠিক আগে/পরে একই ইনডেন্টের এক-লাইন "লেবেল : মান", লেবেল (মাপা প্রস্থ × অক্ষর-অনুপাত) কোলন-কলামের আগে শেষ ⇒ দলে
    const kvOf = (it) => it.kind === 'para' && !it.tabLines && it.rect && it.lines && it.lines.length === 1
      && /^([^:\t]{2,60}?)\s*:\s+(\S.*)$/.exec(String(it.lines[0]).trim());
    const attach = (r, ref) => {
      const stop = ref.x0 + ref.it.tabStops[0] - r.x0, ind = r.it.indentPt || 0;
      if (Math.abs(r.x0 + ind - (ref.x0 + (ref.it.indentPt || 0))) > 6) return false;
      if (ind + r.it.rect.w * r.m[1].trim().length / String(r.it.lines[0]).trim().length > stop - 2) return false;
      Object.assign(r.it, { tabLines: [r.m[1].trim() + '\t: ' + r.m[2]], tabStops: [r1(stop)] });
      return true;
    };
    // ট্যাব-স্টপ ঘরের বাঁ থেকে ⇒ ব্যান্ড-ভেদে ঘরের বাঁ আলাদা হতে পারে, তাই তুলনা পরম অবস্থানে (x0 + স্টপ)
    // সিভি fresh2 (২০২৬-১০-১২): ঠিকানার পরের লাইন ("P.S : Sadar") Gemini আলাদা ট্যাবহীন item দেয় — শুরু আগের লাইনের কোলন/মানের
    // কাছে (কোলন-স্টপ −৪ … +২em) ⇒ "\t\t" + আগের লেবেলের ইনডেন্টে (দুই ট্যাবে মানের কলামে), দল ভাঙে না
    const contOf = (it, x0) => {
      const last = cur.length && cur[cur.length - 1];
      if (!last || it.kind !== 'para' || it.tabLines || !it.lines || !it.lines.length || it.lines.length > 2) return false;
      const stop = last.x0 + last.it.tabStops[0], x = x0 + (it.indentPt || 0), em = it.fontPt || 12;
      if (x < stop - 4 || x > stop + 2 * em) return false;
      Object.assign(it, { tabLines: it.lines.map((l) => '\t\t' + String(l).trim()), tabStops: [r1(stop - x0)], indentPt: last.it.indentPt || 0, firstIndentPt: 0 });
      cur.push({ it, x0 });
      return true;
    };
    const feed = (items, x0) => items.forEach((it) => {
      fillTabs(it);
      if (oneTab(it)) {
        // দলের আগের টানা kv-লাইন (পেছন থেকে, যতক্ষণ খাপ খায়)
        if (!cur.length && pend.length) {
          const ref = { it, x0 }, ok = [];
          for (let k = pend.length - 1; k >= 0 && attach(pend[k], ref); k--) ok.unshift(pend[k]);
          cur.push(...ok);
        }
        pend = [];
        cur.push({ it, x0 });
        return;
      }
      if (contOf(it, x0)) return;
      const m = kvOf(it);
      if (!m) { flush(); return; }
      const r = { it, x0, m };
      if (!cur.length) { pend.push(r); return; }
      if (attach(r, cur[cur.length - 1])) cur.push(r);
      else { flush(); pend = [r]; }
    });
    page.bands.forEach((b) => {
      if (b.cells.length === 1) feed(b.cells[0].items, b.cells[0].x0 || 0);
      else { flush(); b.cells.forEach((c) => { feed(c.items, c.x0 || 0); flush(); }); }
    });
    flush();
    for (const run of runs) {
      const lines = run.flatMap((r) => r.it.tabLines);
      if (lines.length < 2) continue;
      run.forEach(({ it }) => {
        // সবসময় "লেবেল\t: মান" (কোলন এক খাড়া সারিতে)। সিভি fresh2: আগে সংখ্যাগরিষ্ঠ "লেবেল :\t" রূপ রাখা হতো ⇒ কোলন লেবেলের
        // গায়ে, এলোমেলো। tabify ভাগ কোলনেই রাখে, তাই মাপা স্টপ কোলনের অবস্থান
        it.tabLines = it.tabLines.map((l) => l.replace(/\s*:\s*\t\s*(?!:)/, '\t: '));
        // ট্যাবহীন পরের লাইন (ঠিকানার "P.S : Sadar…") মূলে মানের নিচে শুরু ⇒ ট্যাবে (কোলনের পরের ফাঁক পেরিয়ে)
        it.tabLines = it.tabLines.map((l, k) => (k && !nTab(l) ? '\t  ' + l : l));
      });
      const abs = run.map((r) => r.x0 + r.it.tabStops[0]);
      if (run.length > 1 && Math.max(...abs) - Math.min(...abs) <= 24) {
        const mx = Math.max(...abs);
        run.forEach((r) => { r.it.tabStops = [r1(mx - r.x0)]; });
      }
      // দুই-স্টপ (মালিক, ২০২৬-১০-১২): "লেবেল\t: মান" ⇒ "লেবেল\t:\tমান"; মান-স্টপ = কোলন-স্টপ + ০.৭em (": "-এর প্রস্থের চেয়ে বেশি,
      // নইলে Word পরের ডিফল্ট স্টপে লাফ দেয়) ⇒ মানের কলামও রুলারে লক, মান বদলালেও সোজা
      run.forEach(({ it }) => {
        it.tabLines = it.tabLines.map((l) => l.replace(/\t: (?=\S)/, '\t:\t').replace(/^\t {2}(?=\S)/, '\t\t'));
        it.tabStops = [it.tabStops[0], r1(it.tabStops[0] + 0.7 * (it.fontPt || 12))];
      });
    }
  }

  /**
   * Part-17.8: পাশাপাশি কলামের মাঝের খাড়া দাগ (উৎস-মাপ) ⇒ গ্রিড-ঘরের ডান সীমানা; কলাম-সীমা দাগের অবস্থানে।
   * শর্ত: দাগ দুই কলামের লেখার ফাঁকে, আর সারির উচ্চতার ≥৫০% জুড়ে।
   */
  function applyVerticalRules(page, vrules, rawBoxes) {
    if (!vrules || !vrules.length || !page.xform) return;
    const X = page.xform;
    const rules = vrules.map((v) => ({ x: X.left + (v.x - X.x0) * X.scale, y0: X.top + (v.y - X.y0) * X.scale, y1: X.top + (v.y + v.h - X.y0) * X.scale }));
    for (const band of page.bands) {
      if (band.kind !== 'grid') continue;
      for (let i = 0; i < band.cells.length - 1; i++) {
        const A = band.cells[i], B = band.cells[i + 1];
        const aR = Math.max(...A.items.map((it) => (it.rect ? it.rect.x + it.rect.w : A.x0)));
        const bL = Math.min(...B.items.map((it) => (it.rect ? it.rect.x : B.x1)));
        // [Rule IR6: FZ_OFF=FORMFIX / FZ_OFF=IR6] নিরেট বহু-বক্সের ফরম পাতায় (যেমন a03) ২-কলাম গ্রিডের মাঝখানের খাড়া বিভাজক রেখা শনাক্তকরণে সহনশীলতা ১৮pt রাখা।
        const solidBoxes = !!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_IR6 && Array.isArray(rawBoxes) && rawBoxes.length >= 2 && !rawBoxes.some((bx) => bx.dashed));
        const tol = solidBoxes ? 18 : 2;
        const r = rules.find((v) => v.x >= aR - tol && v.x <= bL + tol && v.x > A.x0 + 20 && v.x < B.x1 - 20 && (Math.min(v.y1, band.y1) - Math.max(v.y0, band.y0)) >= (band.y1 - band.y0) * (solidBoxes ? 0.45 : 0.5));
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
   * ২০২৬-১০-১২: পাতার বাক্স (উৎস-মাপ, page-geometry boxFrames) ⇒ ভেতরের অংশে boxIds (বাইরের আগে), page.boxes।
   * builder ভেতরের অংশ এক-ঘরের টেবিলে মোড়ে (a03 মূল-অংশ, f2 ড্যাশ-ফ্রেম, "ফরম-৮"/"তফসিল")।
   * নেওয়া হয় শুধু যদি: কোনো অংশ কিনারা পেরোয় না, ভেতরে অন্তত একটি অনুচ্ছেদ, পাতা-স্তরের সদস্যরা পরপর, আর বাক্সটা কোনো
   * টেবিল/চিত্রের নিজের সীমানা নয়। পাতা-স্তরে না মিললে একটি গ্রিড-ঘরের ভেতরে (ঘরের অংশে)।
   */
  function applyBoxFrames(page, boxes) {
    if (!boxes || !boxes.length || !page.xform) return;
    const X = page.xform, tol = 4;
    const bx = boxes.map((b) => ({ x0: X.left + (b.x0 - X.x0) * X.scale, x1: X.left + (b.x1 - X.x0) * X.scale,
      y0: X.top + (b.y0 - X.y0) * X.scale, y1: X.top + (b.y1 - X.y0) * X.scale, t: (b.t || 0.75) * X.scale, dashed: !!b.dashed }))
      .sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0));
    const inside = (r, b) => r.x >= b.x0 - tol && r.x + r.w <= b.x1 + tol && r.y >= b.y0 - tol && r.y + r.h <= b.y1 + tol;
    const touches = (r, b) => Math.min(r.x + r.w, b.x1) - Math.max(r.x, b.x0) > 0 && Math.min(r.y + r.h, b.y1) - Math.max(r.y, b.y0) > 0;
    const own = (r, b) => Math.abs(r.x - b.x0) <= 8 && Math.abs(r.x + r.w - b.x1) <= 8 && Math.abs(r.y - b.y0) <= 8 && Math.abs(r.y + r.h - b.y1) <= 8;
    const rectOf = (its) => {
      const rs = its.filter((it) => it.rect).map((it) => it.rect);
      if (!rs.length) return null;
      const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
      return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
    };
    // পাতা-স্তরের অংশ: প্রবাহের প্রতিটি অংশ, গ্রিড-ব্যান্ড পুরোটা
    const top = [];
    page.bands.forEach((b) => (b.kind === 'grid' ? top.push({ obj: b, items: b.cells.flatMap((c) => c.items), band: b })
      : b.cells[0].items.forEach((it) => top.push({ obj: it, items: [it] }))));
    top.forEach((t) => { t.rect = rectOf(t.items); });
    // ভেতরের বাক্স অন্য বাক্সের পুরো ভেতরে না হলে নেওয়া যায় না
    const fits = (obj, b) => (obj.boxIds || []).every((id) => { const o = page.boxes.find((x) => x.id === id); return o && b.x0 >= o.x0 - tol && b.x1 <= o.x1 + tol && b.y0 >= o.y0 - tol && b.y1 <= o.y1 + tol; });
    const hasPara = (its) => its.some((it) => it.kind === 'para');
    page.boxes = [];
    let nid = 0;
    // ২০২৬-১০-১৪: পাতা-জোড়া বাক্স (≥৭০% প্রস্থ ও উচ্চতা) = পাতা-ফ্রেমেরই দাগ (2.pdf সিলেবাস: দ্বৈত ফ্রেম ⇒ pgBorders + ২টি
    // বাক্স-টেবিল, দুবার আঁকা; বাক্স-টেবিল ডানে উপচে পাতা ১-কে ২ পাতা করত) ⇒ ফ্রেম থাকলে বাক্স নয়। বন্ধ: FZ_OFF=FRAMEBOX
    const pageSized = (b) => b.x1 - b.x0 >= page.widthPt * 0.7 && b.y1 - b.y0 >= page.heightPt * 0.7;
    for (const b of bx) {
      if (!globalThis.__FZ_OFF_FRAMEBOX && page.frame && pageSized(b)) continue;
      const memb = top.filter((t) => t.rect && inside(t.rect, b));
      const cross = top.filter((t) => t.rect && touches(t.rect, b) && !inside(t.rect, b));
      let objs = null;
      if (!cross.length && memb.length) {
        const idx = memb.map((t) => top.indexOf(t));
        const its = memb.flatMap((t) => t.items);
        const contiguous = idx.every((v, k) => !k || v === idx[k - 1] + 1);
        const onlyOwn = memb.length === 1 && !memb[0].band && memb[0].obj.kind !== 'para' && own(memb[0].rect, b);
        if (contiguous && hasPara(its) && !onlyOwn) objs = memb.map((t) => t.obj);
      } else if (cross.length === 1 && cross[0].band) {
        // গ্রিড-ঘরের ভেতরের বাক্স (f2: লোগোর পাশে "ফরম-৮")
        const cell = cross[0].band.cells.find((c) => b.x0 >= c.x0 - tol && b.x1 <= c.x1 + tol);
        const allIts = cross[0].items;
        if (cell) {
          const m = cell.items.filter((it) => it.rect && inside(it.rect, b));
          const bad = allIts.some((it) => it.rect && touches(it.rect, b) && !inside(it.rect, b)) || memb.length;
          const idx = m.map((it) => cell.items.indexOf(it));
          if (!bad && m.length && hasPara(m) && idx.every((v, k) => !k || v === idx[k - 1] + 1)
            && !(m.length === 1 && m[0].kind !== 'para' && own(m[0].rect, b))) objs = m;
        }
      }
      if (!objs || !objs.every((o) => fits(o, b))) continue;
      const id = ++nid;
      page.boxes.push({ id, x0: r1(b.x0), x1: r1(b.x1), y0: r1(b.y0), y1: r1(b.y1),         // ড্যাশের পুরুত্ব-মাপ ফোলানো (f2: ১.৪pt ⇒ sz ১১, মূলে চুলের মতো) ⇒ ড্যাশে সবসময় ৪
        sz: b.dashed ? 4 : clamp(Math.round(b.t * 8), 4, 12), dashed: b.dashed });   // sz ২-৩ Word-PDF-এ এত হালকা যে দাগই থাকে না
      objs.forEach((o) => { o.boxIds = (o.boxIds || []).concat(id); });
      // এক-লাইনের অনুচ্ছেদের আয়ত = বাক্সটাই (Gemini বাক্সের দাগসহ দেয়) ⇒ উচ্চতা-মাপা ফন্ট বড় হতো (f2 "ফরম-৮" ~১৯pt)।
      // ফন্ট ≤ (বাক্স − ৮pt) ÷ ১.২৫
      objs.forEach((o) => {
        if (o.kind !== 'para' || !o.rect || !own(o.rect, b) || (o.lines && o.lines.length > 1)) return;
        const cap = r1((b.y1 - b.y0 - 8) / 1.25);
        if (o.fontPt && cap >= 6 && o.fontPt > cap && globalThis.__BOX_FONTCAP) o.fontPt = cap;
      });
    }
    // উল্টো বিকল্প (মেপে খারাপ: বাক্স-টেবিল থাকে, ২ পাতা) — শুধু তুলনার জন্য: FZ_ON=NOPGB,  FZ_OFF=FRAMEBOX একসাথে
    if (globalThis.__FZ_ON_NOPGB && page.frame && page.boxes.some(pageSized)) delete page.frame;
    if (!page.boxes.length) delete page.boxes;
  }

  /**
   * a03 (২০২৬-১০-১২): পাতার আনুভূমিক রেখা (উৎস-মাপ, page-geometry horizontalRules) ⇒ ঠিক ওপরের প্রবাহ-অনুচ্ছেদের নিচের বর্ডার
   * (it.ruleBelow = { gapPt, sz }) — Gemini বাক্সের সারি-দাগ লেখা হিসেবে দিলে দাগ হারাত। শুধু চওড়া (লেখা-প্রস্থের ≥৭০%) রেখা
   * (Word-এর অনুচ্ছেদ-বর্ডার পুরো লাইনজুড়ে); টেবিলের ভেতরের, নিচে-দাগের (underline), চিত্রের, পাতা-ফ্রেমের রেখা বাদ।
   */
  function applyHorizontalRules(page, hrules) {
    if (!hrules || !hrules.length || !page.xform) return;
    const X = page.xform, textW = page.widthPt - page.margins.left - page.margins.right;
    const mapped = hrules.map((r) => ({ x: X.left + (r.x - X.x0) * X.scale, y: X.top + (r.y - X.y0) * X.scale, w: r.w * X.scale, t: r.t * X.scale }));
    const rules = mapped.filter((r) => r.w >= textW * 0.7);
    const all = [];
    page.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => { if (it.rect) all.push({ it, flow: b.kind === 'flow' }); })));
    if (!all.length) return;
    const top = Math.min(...all.map((a) => a.it.rect.y)), bot = Math.max(...all.map((a) => a.it.rect.y + a.it.rect.h));
    const xov = (r, R) => Math.min(r.x + r.w, R.x + R.w) - Math.max(r.x, R.x);
    // ২০২৬-১০-১৩: ছোট রেখা (স্বাক্ষর-দাগ, a15) ঠিক নিচের মাঝে-বসানো অনুচ্ছেদের ওপর-বর্ডার — অনুচ্ছেদের ইনডেন্ট রেখার দুই প্রান্তে
    // (লেখা রেখার মাঝেই থাকে)। শর্ত: নিচের লেখা ≤১২pt দূরে ও রেখার ভেতরে, ওপরে ≤৪pt-এ কোনো লেখা নেই (নিচে-দাগ/পূরণ-রেখা নয়)
    for (const r of mapped.filter((q) => q.w < textW * 0.7 && q.w >= 60)) {
      if (r.y > page.heightPt - page.margins.bottom) continue;
      // নিচের অনুচ্ছেদ: শুরু রেখার নিচে ≤১২pt, অথবা রেখাটাই তার আয়তের মাথায় (Gemini বক্সে রেখাসহ দেয় — a15)
      const below = all.filter((a) => a.flow && a.it.kind === 'para' && a.it.rect.y >= r.y - 3 && a.it.rect.y - r.y <= 12)
        .sort((a, b) => a.it.rect.y - b.it.rect.y)[0];
      if (all.some(({ it }) => it !== (below && below.it) && r.y >= it.rect.y - 1 && r.y <= it.rect.y + it.rect.h + 4 && xov(r, it.rect) > 0)) continue;
      if (!below || below.it.ruleAbove || below.it.rect.x < r.x - 6 || below.it.rect.x + below.it.rect.w > r.x + r.w + 6) continue;
      const it = below.it;
      // লেখা রেখার মাঝে বসানো না হলে নয় (বাঁয়ে-শুরু লেখার ইনডেন্ট বদলে যেত)
      if (it.align !== 'c' && Math.abs(it.rect.x + it.rect.w / 2 - (r.x + r.w / 2)) > 10) continue;
      if (it.rect.y <= r.y + r.t + 1) { const ny = r.y + r.t + 3; it.rect = Object.assign({}, it.rect, { y: ny, h: Math.max(4, it.rect.h - (ny - it.rect.y)) }); }
      it.align = 'c'; it.centerShiftPt = null;
      it.ruleAbove = { srcY: r1(r.y), sz: clamp(Math.round(r.t * 8), 4, 12),
        indL: r1(Math.max(0, r.x - page.margins.left)), indR: r1(Math.max(0, page.widthPt - page.margins.right - (r.x + r.w))) };
    }
    if (!rules.length) return;
    // ২০২৬-১০-১৪ (2.pdf p2): দ্বৈত ফ্রেমের ভেতরের নিচের দাগ শেষ অনুচ্ছেদের নিচে-বর্ডার হতো — পাতা-নম্বরের (Gemini-বক্স, নিচে)
    // কারণে দাগটা "লেখার ভেতরে" মনে হতো। ফ্রেম-দাগ যাচাইয়ে পাতা-নম্বর বাদ। বন্ধ: FZ_OFF=FRAMERULE
    const body = globalThis.__FZ_OFF_FRAMERULE ? all : all.filter((a) => a.it.type !== 'page_number');
    const fTop = body.length ? Math.min(...body.map((a) => a.it.rect.y)) : top, fBot = body.length ? Math.max(...body.map((a) => a.it.rect.y + a.it.rect.h)) : bot;
    for (const r of rules) {
      if (page.frame && (r.y < fTop - 2 || r.y > fBot + 2)) continue;   // ফ্রেমের ওপর/নিচের দাগ
      // বাক্সের ওপর/নিচের কিনারা (applyBoxFrames ঘরের বর্ডারে আঁকে)
      if ((page.boxes || []).some((b) => (Math.abs(r.y - b.y0) <= 3 || Math.abs(r.y - b.y1) <= 3) && Math.min(r.x + r.w, b.x1) - Math.max(r.x, b.x0) >= 0.8 * (b.x1 - b.x0))) continue;
      if (r.y > page.heightPt - page.margins.bottom) continue;          // নিচের মার্জিনে (a02: বিঃদ্রঃ-পটির কিনারা — পরের পাতায় ঠেলত)
      // [Rule IR7: FZ_OFF=FORMFIX / FZ_OFF=IR7] বক্স-ফ্রেমযুক্ত ফরম পাতায় (page.boxes, যেমন a03) বর্ডারলেস ছক ও গ্রিড-ব্যান্ডের নিচেও আনুভূমিক সারি-বিভাজক রেখা (ruleBelow) যুক্ত করা।
      const ffRule = !!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_IR7 && page.boxes && page.boxes.length);
      if (all.some(({ it }) => ((it.kind === 'table' && !(ffRule && it.borderless)) || it.kind === 'figure') && r.y >= it.rect.y - (ffRule ? 1.5 : 3) && r.y <= it.rect.y + it.rect.h + (ffRule ? 1.5 : 3) && xov(r, it.rect) > 0)) continue;
      // ওপরের সবচেয়ে কাছের অংশ (নিচ ≤ রেখা+২)
      let above = null;
      for (const a of all) { const b = a.it.rect.y + a.it.rect.h; if (b <= r.y + (ffRule ? 3.5 : 2) && (!above || b > above.it.rect.y + above.it.rect.h)) above = a; }
      if (!above) continue;
      if (ffRule && (!above.flow || (above.it.kind === 'table' && above.it.borderless))) {
        const hitBand = page.bands.find((b) => b.cells.some((c) => c.items.includes(above.it)));
        if (hitBand && hitBand.kind === 'grid') {
          hitBand.ruleBelow = { srcY: r1(r.y), sz: clamp(Math.round(r.t * 8), 4, 12) };
        } else if (above.it.kind === 'table' && above.it.borderless && !above.it.ruleBelow) {
          above.it.ruleBelow = { srcY: r1(r.y), sz: clamp(Math.round(r.t * 8), 4, 12) };
        }
        continue;
      }
      // পটিওয়ালা অনুচ্ছেদের নিচের "দাগ" = পটির কিনারা (পটি আলাদা আঁকা হয়)
      if (!above.flow || above.it.kind !== 'para' || above.it.ruleBelow || above.it.shade) continue;
      const it = above.it, gap = r.y - (it.rect.y + it.rect.h);
      if (it.underline && gap <= 4 && xov(r, it.rect) >= it.rect.w * 0.5) continue;   // লেখার নিচে-দাগ
      // ২০২৬-১০-১৪ (a17 p9): চওড়া শিরোনামের নিচে-দাগ (রেখা শিরোনামের আয়তের ভেতরে, নিচ থেকে ০.৪pt ওপরে) "ওপরের" খোঁজায় শিরোনাম
      // বাদ পড়ায় ৬০pt ওপরের মাথা-লাইনের নিচে দ্বিতীয় দাগ বসত। রেখা অন্য লেখার উচ্চতার ভেতরে ⇒ সেটিরই দাগ। বন্ধ: FZ_OFF=RULEIN
      const ruleInTop = ffRule ? 1.5 : -1;
      if (!globalThis.__FZ_OFF_RULEIN && all.some(({ it: o }) => o !== it && o.kind === 'para' && r.y >= o.rect.y + ruleInTop && r.y <= o.rect.y + o.rect.h + 4 && xov(r, o.rect) > 0)) continue;
      it.ruleBelow = { srcY: r1(r.y), sz: clamp(Math.round(r.t * 8), 4, 12) };
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

  // Word-এর প্রচলিত মার্জিন (pt): ০.২৫–১.২৫ ইঞ্চি (০.০৫" ধাপের সাধারণগুলো) আর সেমি-মান
  const STD_MARGINS = [18, 21.6, 28.35, 28.8, 36, 42.5, 43.2, 50.4, 54, 56.7, 57.6, 64.8, 70.9, 72, 85, 90];
  // up = সর্বোচ্চ কত বাড়ানো চলে (বাঁ/ডানে ০ — লেখার প্রস্থ কমলে লাইন ভাঙে; g01 ডান ২০→২১.৬-এ নামা)
  const snapMargin = (v, up) => {
    const U = up == null ? 2 : up;
    let best = v, bd = 3.01;
    for (const s of STD_MARGINS) { const d = Math.abs(s - v); if (d < bd && s - v <= U) { best = s; bd = d; } }
    return best;
  };

  /**
   * পাতা-সেটআপ পুরো ফাইলে এক (Word-এ সাধারণত তাই) — কালির সীমা পাতা-ভেদে আলাদা দেখায় (ফাঁকা বাঁ-কলাম g33 ২১০pt,
   * ভাসমান ছবি g41, ওপরের ফাঁকা লাইন g14)। সোনালি সেটের আসল মার্জিন থেকে নিয়ম (২০২৬-১০-১২):
   *  - বাঁ/ওপর/ডান = একই মাপের পাতাগুলোর সবচেয়ে ছোট (item-অবস্থান মার্জিনের তুলনায় ⇒ লেখা সরে না)
   *  - ডান > বাঁ কখনো আসলে নয় (ডানে এবড়োখেবড়ো লেখা মার্জিনে পৌঁছায় না) ⇒ ডান = বাঁ
   *  - নিচ = ওপর (সাধারণত সমান), তবে সবচেয়ে কম নিচের কালি-ফাঁকের বেশি নয় (লেখা উপচাবে না); আগে সবসময় ৩৬ ছিল
   *  - প্রচলিত মানে ±৩pt হলে সেই মানে (বাড়ানো ≤২pt)
   * ফ্রেমওয়ালা পাতা পরে নিজের ওপর/নিচ ঠিক করে।
   */
  function unifyMargins(staged) {
    const groups = {};
    staged.forEach((s) => { const k = Math.round(s.page.widthPt) + 'x' + Math.round(s.page.heightPt); (groups[k] = groups[k] || []).push(s); });
    Object.values(groups).forEach((g) => {
      const ms = g.map((s) => s.page.margins);
      const left = snapMargin(Math.min(...ms.map((m) => m.left)), 0.5);
      let right = snapMargin(Math.min(...ms.map((m) => m.right)), 0.5);
      if (right > left) right = left;
      const top = snapMargin(Math.min(...ms.map((m) => m.top)));
      const gaps = g.map((s) => {
        const ys = s.items.filter((it) => it.rect).map((it) => it.rect.y + it.rect.h);
        return ys.length ? s.page.heightPt - Math.max(...ys) : Infinity;
      });
      // আমাদের আউটপুট মূলের চেয়ে সামান্য লম্বা হয় ⇒ নিচ = ওপর শুধু তখন, যখন মূলের শেষ কালি তার অন্তত এক লাইন (১৪pt) ওপরে;
      // নইলে আগের নিরাপদ মান (≤৩৬, কালি-ফাঁকের নিচে) — g38 ওপর ৪৩ = নিচ ৪৩ দিলে ২ পাতা হতো
      // নিচ ৩৬-এর কম শুধু কালি-ফাঁক বাধ্য করলে (g22 ওপর ২৬ কিন্তু আসল নিচ ৪৩ — ওপর নকল করলে ২৫ হয়ে খারাপ)
      const gap = Math.min(...gaps), safe = Math.min(36, gap - 2);
      const bottom = r1(clamp(top > 36 ? (gap >= top + 14 ? top : Math.max(safe, Math.min(top, gap - 14))) : safe, 18, 90));
      g.forEach((s) => { s.page.margins = { top: r1(top), left: r1(left), right: r1(right), bottom }; });
    });
  }

  /**
   * @param capture  FayzarFaithfulCapture.run ফল ({ blocks, pages })
   * @param measures { [blockIndex]: blockMetrics ফল }, pageInfo { [page]: { widthPt, heightPt } }
   */
  function build(capture, measures, pageInfo) {
    const warnings = [];
    const pages = [];
    const pageNos = [...new Set(capture.blocks.map((b) => b.page))].sort((a, b) => a - b);
    const staged = [];   // ১ম ধাপ: প্রতিটি পাতা স্বাভাবিককরণ; তারপর পুরো ফাইলের মার্জিন; ২য় ধাপ: ফ্রেম, সারি-কলাম
    for (const pn of pageNos) {
      const info = (pageInfo && pageInfo[pn]) || {};
      const cp = (capture.pages || []).find((p) => p.page === pn) || {};
      const src = { widthPt: info.widthPt || cp.widthPt || 595.3, heightPt: info.heightPt || cp.heightPt || 841.9 };
      // (Part-17.9: একটি টেবিল-ব্লক ফাঁকে ভাগ হয়ে একাধিক item হতে পারে)
      const items = capture.blocks.filter((b) => b.page === pn).flatMap((b) => [].concat(toItem(b, measures && measures[b.i], info)));
      if (globalThis.__FZ_ON_SHADECOL && !globalThis.__FZ_OFF_SHADECOL && Array.isArray(info.boxes) && info.boxes.length >= 3) {
        for (const it of items) {
          if (it.kind !== 'table' || it.gridFirst || !it.rect || !it.headShade || !it.rows || it.rows.length < 2) continue;
          const nC = Math.max(...it.rows.map((r) => r.length));
          if (nC < 3) continue;
          const R = it.rect, cbs = info.boxes.filter((bx) => !bx.dashed && bx.x0 >= R.x - 4 && bx.x1 <= R.x + R.w + 4 && bx.y0 >= R.y - 4 && bx.y1 <= R.y + R.h + 4 && (bx.y1 - bx.y0) >= R.h * 0.8 && (bx.x1 - bx.x0) < R.w * 0.9);
          const xs = [R.x, ...cbs.map((bx) => bx.x0), ...cbs.map((bx) => bx.x1), R.x + R.w].sort((a, b) => a - b);
          const u = []; xs.forEach((x) => { if (!u.length || x - u[u.length - 1] > 8) u.push(x); });
          if (u.length === nC + 1) {
            const totW = u[u.length - 1] - u[0];
            const fr = u.slice(1).map((x, k) => (x - u[k]) / totW);
            if (fr.every((f) => f * totW >= 25)) { it.colFractions = fr; it.fullVRule = fr.slice(0, -1).map(() => true); }
          }
        }
      }
      items.filter((it) => !it.rect).forEach(() => warnings.push({ page: pn, kind: 'block_without_box' }));
      const norm = normalizePage(items, src);
      nestFiguresInTables(items);
      const page = Object.assign({ page: pn }, norm);
      if (info.drift) page.drift = { a: Math.round(info.drift.a * 10000) / 10000, b: Math.round(info.drift.b * 100) / 100, n: info.drift.n };   // নির্ণয়ের জন্য
      staged.push({ pn, info, items, page });
    }
    unifyMargins(staged);
    for (const { info, items, page } of staged) {
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
          // ২০২৬-১০-১৩: তলা ২৪→১৪pt (a02: ফ্রেম পাতার নিচ থেকে ~৬pt, মূলের শেষ পটি ৭৬০-এ ⇒ ২৪pt-এ নিচের অংশ ১০pt ওপরে চাপা)
          page.margins.bottom = r1(Math.max(14, page.heightPt - (f.y + f.h) + 4));
        }
      }
      page.bands = bandsOf(items, page);
      snapIndents(page);
      snapFonts(page);
      syncFillLabels(page);
      alignTabStops(page);
      alignNumberTabs(page);
      syncGridPitch(page);
      applyVerticalRules(page, info.vrules, info.boxes);
      applyBoxFrames(page, info.boxes);
      applyHorizontalRules(page, info.hrules);
      delete page.xform;
      pages.push(page);
    }
    decideBold(pages);
    syncLabelColumns(pages);
    syncTableFonts(pages);
    return { pages, warnings };
  }

  /**
   * সিভি (মালিকের স্ক্রিনশট): একই পাতায় বারবার আসা লেবেল-কলাম (একই x, একই লাইন-সংখ্যা, লাইন-অক্ষত, একই হেলানো/শ্রেণি) —
   * মূলে সব এক রকম, কিন্তু প্রস্থ-মাপে একটি ৯.৫ (বাকি ১০.৫) আর ছোট ফন্টে রেখা-অনুপাত বেড়ে "মোটা" হয়ে যেত।
   * ≥২-এর দলে মধ্যমা থেকে ≤১৫% দূরের ফন্ট ⇒ মধ্যমা; মোটা ⇒ দলের সংখ্যাগরিষ্ঠ (সমতায় সাধারণ)।
   */
  /**
   * a16: বহু-পাতার একই ছক (একই কলাম-সংখ্যা, কলাম-প্রস্থ ±০.১০) পাতা-ভেদে ১১ থেকে ১৩.৫ মাপা হতো — বড়গুলো পাতা উপচাত।
   * ≥৩টির দলে মধ্যমা থেকে ≤৩০% দূরের ফন্ট ⇒ মধ্যমা।
   */
  function syncTableFonts(pages) {
    const all = [];
    pages.forEach((p) => p.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => { if (it.kind === 'table' && it.fontPt && it.colFractions) all.push(it); }))));
    const used = new Set();
    all.forEach((t) => {
      if (used.has(t)) return;
      const grp = all.filter((o) => !used.has(o) && o.colFractions.length === t.colFractions.length && o.colFractions.every((f, k) => Math.abs(f - t.colFractions[k]) <= 0.1));
      grp.forEach((o) => used.add(o));
      if (grp.length < 3) return;
      const m = median(grp.map((o) => o.fontPt));
      grp.forEach((o) => { if (Math.abs(o.fontPt - m) <= m * 0.3) o.fontPt = m; });
    });
    if (fzOn('FORMFIX') && !globalThis.__FZ_OFF_IR8) {
      globalThis.__FZ_ON_FORMFIX = true;
    }
  }

  function syncLabelColumns(pages) {
    for (const page of pages) {
      const groups = {};
      page.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
        if (it.kind !== 'para' || !it.keepLines || !it.fontPt || !it.rect || (it.lines || []).length < 2) return;
        const k = [it.type, it.fs, !!it.italic, Math.round(it.rect.x / 4), it.lines.length].join('|');
        (groups[k] = groups[k] || []).push(it);
      })));
      for (const arr of Object.values(groups)) {
        if (arr.length < 2) continue;
        const m = median(arr.map((x) => x.fontPt));
        arr.forEach((x) => { if (Math.abs(x.fontPt - m) <= m * 0.15) x.fontPt = m; });
        const nb = arr.filter((x) => x.bold).length, bold = nb * 2 > arr.length;
        arr.forEach((x) => { x.bold = bold; });
      }
    }
  }

  /**
   * f2 (২০২৬-১০-১২): পরপর "লেবেল : ......" লাইন (সইয়ের অংশ) — অক্ষর কম, কালি বেশিরভাগ বিন্দু ⇒ মাপ অবিশ্বাস্য
   * ("তারিখ : ..." কালি ১.৯pt ⇒ ৮.৫, পাশের "আবেদনকারীর স্বাক্ষর : ..." ১০.৫)। একই কলামের পাশাপাশি (ফাঁক < ২.৫ লাইন)
   * এমন লাইনের দলে প্রস্থ-অনুমানহীন ছোট লাইনগুলো দলের নির্ভরযোগ্য (প্রস্থ-অনুমানওয়ালা) লাইনের ফন্ট পায়।
   */
  function syncFillLabels(page) {
    const FILLX = /([._\-…·─])\1{2,}/g;
    const isFL = (it) => it.kind === 'para' && it.rect && /[:ঃ]/.test(it.text || '') && /([._\-…·─])\1{2,}/.test(it.text || '')
      && String(it.text || '').replace(FILLX, '').replace(/[\s:ঃ\t*]/g, '').length <= 25;
    // ক্রম: পরপর প্রবাহ-ব্যান্ডের অংশ এক তালিকায় (প্রবাহের প্রতিটি অংশ সাধারণত আলাদা ব্যান্ডে); গ্রিডের প্রতিটি ঘর আলাদা
    const seqs = []; let flow = null;
    for (const b of page.bands) {
      if (b.kind === 'flow') { if (!flow) seqs.push(flow = []); flow.push(...b.cells[0].items); }
      else { flow = null; b.cells.forEach((c) => seqs.push(c.items)); }
    }
    for (const its of seqs) {
      for (let i = 0; i < its.length;) {
        if (!isFL(its[i])) { i++; continue; }
        let j = i + 1;
        while (j < its.length && isFL(its[j]) && its[j].rect.y - (its[j - 1].rect.y + its[j - 1].rect.h) < 2.5 * (its[j - 1].fontPt || 12)) j++;
        const grp = its.slice(i, j), good = grp.filter((x) => x.diag && x.diag.wPt);
        if (grp.length >= 2 && good.length) {
          const f = median(good.map((x) => x.fontPt));
          grp.forEach((x) => { if (!(x.diag && x.diag.wPt) && x.fontPt < f) x.fontPt = f; });
        }
        i = j;
      }
    }
  }

  /**
   * সিভি (মালিকের স্ক্রিনশট): পাশাপাশি লেবেল-কলাম আর মান-কলাম (grid-ব্যান্ডের আলাদা ঘর) একই সারিতে চলে — লাইন-সংখ্যা সমান,
   * উচ্চতা প্রায় সমান (≤১০%) হলে আসল লাইন-দূরত্বও এক। মোটা কালিতে একটির মাপ বেশি আসে (১৫.১ বনাম ১৩.৯) ⇒ নিচে সারি সরে যেত।
   * দুটোতেই ছোটটি।
   */
  function syncGridPitch(page) {
    for (const band of page.bands) {
      if (band.kind !== 'grid') continue;
      const ps = band.cells.flatMap((c) => c.items).filter((it) => it.kind === 'para' && it.keepLines && it.lineSpacingPt > 0 && it.rect && (it.lines || []).length >= 2);
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        if (a.lines.length !== b.lines.length || Math.abs(a.rect.y - b.rect.y) > 6 || Math.abs(a.rect.h - b.rect.h) > 0.1 * Math.max(a.rect.h, b.rect.h)) continue;
        a.lineSpacingPt = b.lineSpacingPt = Math.min(a.lineSpacingPt, b.lineSpacingPt);
      }
    }
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
      // ২০২৬-১০-১৪ (a17 p4 "১)" মোটা, মূলে নয়): ≤৩ মূল অক্ষরের লেখায় রেখা-পুরুত্ব অবিশ্বস্ত ⇒ Gemini-র সিদ্ধান্তই। বন্ধ: FZ_OFF=SHORTB
      // a17 p9 "(ক) মূল উত্তরপত্র ……", "কেন্দ্রের নাম : ……" মোটা: গোল বিন্দুর কালি "মোটা রেখা" মাপে ⇒ পূরণ-চিহ্ন লেখার ≥৪০% হলে একই নিয়ম
      const tx = String(it.text || '').replace(/[\s*]/g, ''), fillN = (tx.match(/([._\-…·─])\1{5,}/g) || []).join('').length;
      const short = !globalThis.__FZ_OFF_SHORTB && (tx.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length <= 3 || fillN >= tx.length * 0.4);
      if (ref && !short && !/\*\*/.test(it.text || '')) it.bold = v >= ref * 1.13;
      delete it._stroke;
    });
  }

  const FayzarLayoutIR = { FS_CLASS, INK_RATIO, inkRatioFor, toItem, tabify, normalizePage, bandsOf, snapIndents, snapFonts, applyVerticalRules, applyBoxFrames, build, mergeLineRows, rowBandHeights, isScribble, foldBoxRows, BOX_MARK, BOX_SEP, unifyMargins, alignTabStops, snapMargin };
  global.FayzarLayoutIR = FayzarLayoutIR;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarLayoutIR;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));