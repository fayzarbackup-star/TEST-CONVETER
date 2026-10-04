/**
 * Fayzar Bangla Converter — MCQ Master Layout Planner (Part-10)
 * =============================================================
 * খালি চোখে ধরা পড়ে না এমন জ্যামিতি এখানেই ঠিক হয় — এটি একটি **নির্ভুল,
 * পার্শ্ব-প্রভাবহীন (pure) জ্যামিতি মডেল**: কোনো DOCX/RTF/HTML লেখে না, কোনো
 * ইঞ্জিন ডিপেন্ডেন্সি নেই, শুধুই ইনপুট (parse করা প্রশ্নপত্র + পেজ জ্যামিতি)
 * থেকে আউটপুট (Geometry Plan) গণনা করে।
 *
 * তিন রেন্ডারারই (Word 2003 RTF, Modern DOCX, HTML Preview) একই প্ল্যান
 * কনজিউম করে — ফলে "preview == download" অনড় থাকে।
 *
 * Part-10 চুক্তি (বহুনির্বাচনী মাস্টার লেআউট):
 *  (ক) স্কপ   : বিশুদ্ধ MCQ প্রশ্নপত্র (১০–৩০+ প্রশ্ন) → এই ফুল ফরম্যাট
 *  (খ) পেজ    : A4 পোর্ট্রেট, চারদিকে 0.5" মার্জিন, হেডার ১-কলাম সেন্টারড,
 *              নিচে সিঙ্গেল বর্ডার ডিভাইডার; মিসিং তথ্যে অটো-প্লেসহোল্ডার
 *  (গ) কলাম   : হেডারের পর থেকে সমান ২ কলাম, মাঝে দৃশ্যমান কলাম লাইন,
 *              কলামের মাঝে 0.2" গ্যাপ, হ্যাঙ্গিং ইনডেন্ট (নম্বরের পর ট্যাব,
 *              নম্বরের নিচে কোনো লেখা র‍্যাপ হবে না, অপশনও একই উল্লম্ব রেখায়)
 *  (ঘ) অপশন  : সমান দূরত্বের ৪-কলাম গ্রিড; বড় হলে অটো ২, আরও বড় হলে ১
 *  (ঙ) ফিট    : ১–৪টি প্রশ্ন উপচে ২য় পৃষ্ঠায় গেলে ফন্ট ১১.৫/১১pt করে
 *              ১ পৃষ্ঠায় ফিট; না পারলে ২য় পৃষ্ঠায়ও ২-কলাম উচ্চতা-ব্যালান্স
 *
 * মাপের একক: সবকিছু **twips** (1pt = 20 twips, 1" = 1440 twips)।
 */

(function (global) {
  'use strict';

  const TWP_PER_PT = 20;

  /**
   * Part-10 ক্যালিব্রেশন (রেন্ডার-বিবৃত্তি দিয়ে মাপা — proof/render/):
   *  - প্রকৃত শব্দ-প্রস্থ / মডেল-প্রস্থ ≈ ১.১০ → মডেল হালকা আন্ডার-এস্টিমেট করত,
   *    ফলে র‍্যাপ কম গণনা হতো ও এক কলামে অতিরিক্ত প্রশ্ন ঢুকত।
   *  - লাইন-পিচ: ১২pt-এ রেন্ডারে ১৬.৫pt (≈ ১.৩৭৫×) — নিচের lineFactor-এ সেট করা।
   * মডেল ইচ্ছাকৃতভাবে রক্ষণশীল: একটু ফাঁকা কলাম, অবাঞ্ছিত ২য় পৃষ্ঠার চেয়ে শ্রেয়।
   */
  const WIDTH_SCALE = 1.12;

  /** প্রতি ক্যারেক্টার-ক্লাসের প্রস্থ (em এককে) — অর্ধ-পয়েন্ট সাইজে রূপান্তরযোগ্য */
  const EM = {
    bangla: 0.52,      // \u0980–\u09FF (স্বরবর্ণ/ব্যঞ্জনবর্ণ/যুক্তাক্ষর — গড়)
    banglaMark: 0.30,  // মাত্রা/ি-কার জাতীয় combining-ish
    latinLower: 0.47,
    latinUpper: 0.66,
    digit: 0.50,
    space: 0.26,
    punct: 0.28,       // . , : ; ' " ( ) [ ]
    dash: 0.36,        // - – —
    wide: 0.60,        // বাকি সব
    math: 0.55         // + = × ÷ √ %
  };

  function classOf(ch) {
    const c = ch.codePointAt(0);
    if (ch === ' ' || ch === '\t' || ch === '\u00A0') return 'space';
    if (c >= 0x09E6 && c <= 0x09EF) return 'digit';      // বাংলা সংখ্যা
    if (c >= 0x0980 && c <= 0x09FF) {
      // মাত্রা/ই-কার/ি-কার জাতীয় বর্ণমালা-বহির্ভূত চিহ্ন সাড়ে-আড়াই
      if ((c >= 0x09BE && c <= 0x09CD) || (c >= 0x09E3 && c <= 0x09E4)) return 'banglaMark';
      return 'bangla';
    }
    if (c >= 0x30 && c <= 0x39) return 'digit';
    if (c >= 0x61 && c <= 0x7A) return 'latinLower';
    if (c >= 0x41 && c <= 0x5A) return 'latinUpper';
    if ('.,:;\'"()[]{}/|!?' .indexOf(ch) !== -1) return 'punct';
    if ('-–—_'.indexOf(ch) !== -1) return 'dash';
    if ('+=×÷√%<>≤≥≠≈'.indexOf(ch) !== -1) return 'math';
    return 'wide';
  }

  /** টেক্সটের প্রস্থ (twips) — sz হলো অর্ধ-পয়েন্ট (24 = 12pt) */
  function measure(str, sz) {
    const s = String(str == null ? '' : str);
    if (!s) return 0;
    const emTwips = (sz / 2) * TWP_PER_PT;
    let em = 0;
    for (const ch of s) em += EM[classOf(ch)] || EM.wide;
    return Math.round(em * emTwips * WIDTH_SCALE);
  }

  /** কতগুলো ভিজ্যুয়াল লাইন নেবে (ওয়ার্ড-রিদ্র্যাপ মডেল) */
  function lineCount(str, sz, availW) {
    const s = String(str == null ? '' : str).replace(/\s+/g, ' ').trim();
    if (!s) return 1;
    if (availW <= 100) return 1;
    const words = s.split(' ');
    let lines = 1;
    let cur = 0;
    const spaceW = measure(' ', sz);
    for (const w of words) {
      const ww = measure(w, sz);
      if (cur === 0) {
        cur = ww;
      } else if (cur + spaceW + ww <= availW) {
        cur += spaceW + ww;
      } else {
        lines++;
        cur = ww;
      }
      // অত্যন্ত লম্বা একক টোকেন (URL/সূত্র) — আনুমানিক চর
      while (cur > availW && ww > availW) {
        lines++;
        cur -= availW;
      }
    }
    return lines;
  }

  /**
   * TeX/LaTeX-কে প্রস্থ মাপার জন্য কাছাকাছি দৃশ্যমান গ্লিফে নামায়।
   * গ্রিডের সিদ্ধান্তে `$`, `\frac`, `{}` বা `\pi`-র source-characters-কে
   * আলাদা glyph ধরে গুনলে একই ছোট সমীকরণ অযথা ১-কলামে নেমে যায়।
   */
  function optionVisualText(value) {
    let s = String(value == null ? '' : value);
    const readGroup = (src, start, open, close) => {
      if (src[start] !== open) return null;
      let depth = 0;
      for (let i = start; i < src.length; i++) {
        if (src[i] === open) depth++;
        else if (src[i] === close && --depth === 0) return { text: src.slice(start + 1, i), end: i + 1 };
      }
      return null;
    };
    const skipSpace = (src, at) => { while (at < src.length && /\s/.test(src[at])) at++; return at; };
    const symbols = {
      alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ϵ', zeta: 'ζ', eta: 'η',
      theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π',
      varpi: 'ϖ', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'ϕ', chi: 'χ', psi: 'ψ', omega: 'ω',
      Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
      times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠', ne: '≠',
      approx: '≈', equiv: '≡', propto: '∝', infty: '∞', sum: '∑', prod: '∏', int: '∫', partial: '∂', nabla: '∇',
      forall: '∀', exists: '∃', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃', supseteq: '⊇',
      cap: '∩', cup: '∪', rightarrow: '→', leftarrow: '←', to: '→', mapsto: '↦', longrightarrow: '⟶',
      ldots: '…', cdots: '⋯', degree: '°', perp: '⊥', parallel: '∥'
    };
    const transparent = new Set([
      'left', 'right', 'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle', 'limits', 'nolimits',
      'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr', 'biggl', 'biggr', 'Biggl', 'Biggr'
    ]);
    const textCommands = new Set(['text', 'textrm', 'textnormal', 'textbf', 'textit', 'mathrm', 'mathbf', 'mathit', 'operatorname', 'mbox']);
    const functionCommands = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'ln', 'log', 'lim', 'max', 'min', 'det', 'exp', 'sinh', 'cosh', 'tanh']);

    function render(src, depth) {
      if (depth > 8) return String(src).replace(/[{}$]/g, '').replace(/\\[A-Za-z]+/g, '');
      let out = '';
      for (let i = 0; i < src.length;) {
        if (src[i] === '$' || src[i] === '`') { i++; continue; }
        if (src.startsWith('\\(', i) || src.startsWith('\\)', i) || src.startsWith('\\[', i) || src.startsWith('\\]', i)) { i += 2; continue; }
        if (src[i] === '\\') {
          let j = i + 1;
          if (j < src.length && /[A-Za-z]/.test(src[j])) {
            while (j < src.length && /[A-Za-z]/.test(src[j])) j++;
            const cmd = src.slice(i + 1, j);
            let at = skipSpace(src, j);
            if (/^(?:d?frac|tfrac|cfrac)$/.test(cmd)) {
              const num = readGroup(src, at, '{', '}');
              const denAt = num ? skipSpace(src, num.end) : at;
              const den = num && readGroup(src, denAt, '{', '}');
              if (num && den) { out += render(num.text, depth + 1) + '/' + render(den.text, depth + 1); i = den.end; continue; }
            }
            if (cmd === 'sqrt') {
              let degree = '';
              if (src[at] === '[') {
                const d = readGroup(src, at, '[', ']');
                if (d) { degree = render(d.text, depth + 1); at = skipSpace(src, d.end); }
              }
              const rad = readGroup(src, at, '{', '}');
              if (rad) { out += (degree ? degree : '') + '√' + render(rad.text, depth + 1); i = rad.end; continue; }
            }
            if (textCommands.has(cmd)) {
              const group = readGroup(src, at, '{', '}');
              if (group) { out += render(group.text, depth + 1); i = group.end; continue; }
            }
            if (transparent.has(cmd)) { i = j; continue; }
            if (/^(?:[,;:!])$/.test(cmd)) { out += ' '; i = j; continue; }
            if (/^(?:quad|qquad|enspace|thinspace|medspace|thickspace)$/.test(cmd)) { out += ' '; i = j; continue; }
            if (Object.prototype.hasOwnProperty.call(symbols, cmd)) { out += symbols[cmd]; i = j; continue; }
            if (functionCommands.has(cmd)) { out += cmd; i = j; continue; }
            // Unknown formatting/operator names are not printed as a backslash macro.
            out += cmd;
            i = j;
            continue;
          }
          if (j < src.length) { out += src[j]; i = j + 1; }
          else i++;
          continue;
        }
        if (src[i] === '{' || src[i] === '}' || src[i] === '^' || src[i] === '_') { i++; continue; }
        out += src[i++];
      }
      return out;
    }
    return render(s, 0).replace(/\s+/g, ' ').trim();
  }

  /** অপশন লেবেল + TeX syntax বাদ-দেওয়া দৃশ্যমান টেক্সটের সম্পূর্ণ প্রস্থ */
  function optionWidth(o, sz) {
    const opt = o || {};
    const label = opt.label ? '(' + opt.label + ')' : '';
    const text = optionVisualText(opt.text);
    return measure(label === '()' ? '' : label, sz) + (label ? measure(' ', sz) : 0) + measure(text, sz);
  }

  /**
   * Part-12: দৈর্ঘ্য-ইউনিট রিজলভার — js/layout-engine/layout-units.js লোড থাকলে
   * সেই একমাত্র অ্যালগরিদম, না থাকলে এখানেই সমতুল্য সংস্করণ (গেটে মিল যাচাই করা হয়)।
   * উদ্দেশ্য একটাই: জ্যামিতিতে কখনোই NaN/Infinity ঢুকবে না — কারণ UI থেকে আসা
   * 'normal'/'narrow'/'moderate'/'wide' স্ট্রিং parseFloat-এ NaN ⇒ OpenXML-এ
   * <w:pgMar w:top=\"NaN\"/> ⇒ Word ফাইল করাপ্ট বলে প্রত্যাখ্যান করে।
   */
  function layoutUnits() {
    if (typeof global !== 'undefined' && global.FayzarLayoutUnits) return global.FayzarLayoutUnits;
    const MARGIN = { none: 0, narrow: 576, normal: 720, moderate: 1080, wide: 1440 };
    const GAP = { none: 0, tight: 144, narrow: 216, normal: 288, wide: 576, booklet: 1008 };
    const fin = (v, fb) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };
    const bnDigits = (v) => (typeof v !== 'string' ? v : v.replace(/[\u09e6-\u09ef]/g, (c) => String('\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef'.indexOf(c))));
    const cl = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
    const tw = (v, fb, map, hi) => {
      hi = hi || 22000;   // raw-twips ইনপুট (যেমন rightTab ৭০৫০) যেন কেটে না যায়
      const f = cl(Math.round(fin(fb, 720)), 0, hi);
      if (v === null || v === undefined || v === false || v === '') return f;
      if (typeof v === 'number') return Number.isFinite(v) ? cl(Math.round(Math.abs(v) > 6 ? v : v * 1440), 0, hi) : f;
      const key = String(v).trim().toLowerCase();
      if (map && Object.prototype.hasOwnProperty.call(map, key)) return cl(map[key], 0, hi);
      if (Object.prototype.hasOwnProperty.call(MARGIN, key)) return cl(MARGIN[key], 0, hi);
      const n = parseFloat(key);
      if (!Number.isFinite(n)) return f;
      return cl(Math.round(Math.abs(n) > 6 ? n : n * 1440), 0, hi);
    };
    return {
      margin: (v, fb) => tw(v, fb === undefined ? 720 : fb, MARGIN, 2880),
      gap: (v, fb) => tw(v, fb === undefined ? 288 : fb, GAP, 2880),
      indent: (v, fb) => tw(v, fb === undefined ? 432 : fb, null, 4320),
      twips: (v, fb) => tw(v, fb, null, 20000),
      count: (v, fb, lo, hi) => cl(Math.round(fin(parseFloat(bnDigits(v)), fb)), lo, hi),
      linePitchTwips: (sz, factor) => cl(Math.round((cl(Math.round(fin(sz, 24)), 8, 96) / 2) * 20 * cl(fin(factor, 1.5), 0.8, 3)), 40, 2000),
      docxLineRule: (factor) => Math.round(240 * cl(fin(factor, 1.5), 0.8, 3))
    };
  }

  const McqLayoutPlanner = {
    version: '10.0.0',

    /** Part-10 ভিত্তি জ্যামিতি (টুইপসে) — সব কনস্ট্যান্ট এক জায়গায়, টেস্ট এখান থেকেই পড়ে */
    GEOMETRY: {
      pageW: 11906,          // A4 পোর্ট্রেট প্রস্থ (8.27")
      pageH: 16838,          // A4 পোর্ট্রেট উচ্চতা (11.69")
      margin: 720,           // ০.৫" — চারদিকে (খ.১)
      cols: 2,               // হেডারের নিচে ২-কলাম (গ.১)
      colGap: 288,           // ০.২" কলাম বিচ্ছেদ (গ.৩)
      colSep: true,          // দৃশ্যমান কলাম লাইন (গ.২)
      indent: 432,           // হ্যাঙ্গিং ইনডেন্ট ০.৩" (মাস্টার চুক্তি §১)
      lineFactor: 1.50,
      // Part-12 (ট্রায়াজ ১): রেন্ডার-রেশিও — RTF/DOCX সব প্যারাগ্রাফে 'single'-এর গুণক
      // (1 = নিজ ফন্টের প্রাকৃতিক লাইন); ১.৫ শুধু ক্যাপাসিটি মডেলের নিরাপত্তা-ধারনা,
      // প্রিভিউর CSS line-height কিন্তু রেন্ডারের সঙ্গে মিলে (1.34 ≈ বাংলা ফন্ট single)।
      lineRenderFactor: 1,
      lineRenderCssRatio: 1.34,      // single-spacing ≈ ১.৩৪ × ফন্ট সাইজ (বাংলা ফন্টের বৃহৎ
                           // ascent/descent — Word 2003-এর \\sl240\slmult1 এর বাস্তব মান
                           // LibreOffice রেন্ডারে ক্যালিব্রেটেড)
      headerLineFactor: 1.28,
      baseSz: 24,            // ১২pt
      shrinkLadder: [24, 23, 22],  // ১২ → ১১.৫ → ১১ (ঙ.১)
      maxShrinkOverflow: 4,  // ১–৪টি প্রশ্ন উপচে ২য় পেজে গেলে শ্রিংক প্রয়োগ
      minGap: 40             // দুই অপশন স্লটের মাঝে ন্যূনতম শ্বাস (টুইপস = ২pt)
    },

    /** স্মার্ট ফলব্যাক প্লেসহোল্ডার (খ.৩) — হেডার কখনো ভাঙবে না */
    FALLBACK: {
      institute: 'আপনার প্রতিষ্ঠান এর নাম',
      location: 'ঠিকানা লিখুন',
      exam: 'পরীক্ষার নাম লিখুন',
      classSubject: 'শ্রেণিঃ ................  |  বিষয়ঃ ................',
      time: 'সময়: ................',
      marks: 'পূর্ণমানঃ ................'
    },

    // ---------------------------------------------------------------------
    // মাপ জাদুকর (প্রকাশ্য — টেস্ট থেকে সরাসরি যাচাই করা যায়)
    // ---------------------------------------------------------------------
    measure(str, sz) { return measure(str, sz); },
    lineCount(str, sz, availW) { return lineCount(str, sz, availW); },
    optionWidth(o, sz) { return optionWidth(o, sz); },

    /**
     * জ্যামিতি নির্ণয়: পেজ + মার্জিন + কলাম + ইনডেন্ট + ট্যাব স্টপ।
     * sz দিলে সেই ফন্ট সাইজের জন্য লাইন-উচ্চতাও সহ।
     */
    geometry(options = {}) {
      const g = Object.assign({}, this.GEOMETRY);
      // Part-12: দৈর্ঘ্য নরমালাইজেশন — UI থেকে 'normal'/'narrow'… স্ট্রিং এলেও NaN হবে না
      const U = layoutUnits();
      g.margin = U.margin(options.margin, g.margin);
      g.colGap = U.gap(options.columnGap, g.colGap);
      g.indent = U.indent(options.indent, g.indent);
      if (options.cols) g.cols = U.count(options.cols, 2, 1, 6);
      if (options.pageWidth) g.pageW = U.count(options.pageWidth, g.pageW, 3000, 40000);
      if (options.pageHeight) g.pageH = U.count(options.pageHeight, g.pageH, 3000, 40000);
      if (options.baseSz) g.baseSz = U.count(options.baseSz, g.baseSz, 12, 96);
      if (options.fillRatio) g.fillRatio = Number.isFinite(parseFloat(options.fillRatio)) ? Math.min(1, Math.max(0.5, parseFloat(options.fillRatio))) : g.fillRatio;
      if (options.colSep !== undefined) g.colSep = !!options.colSep;

      g.usableW = g.pageW - 2 * g.margin;                       // ১০৪৬৬
      g.usableH = g.pageH - 2 * g.margin;                       // ১৫৩৯৮
      g.colW = Math.floor((g.usableW - g.colGap * (g.cols - 1)) / g.cols); // ৫০৮৯
      g.textW = g.colW - g.indent;                              // ৪৬৫৭ (ইনডেন্টের পরে)
      // সমান দূরত্বের ট্যাব স্টপ (মার্কিন "grid" — ৪টি স্লট একদম সমান)
      g.slot4 = Math.floor(g.textW / 4);
      g.slot2 = Math.floor(g.textW / 2);
      g.stops4 = [g.indent, g.indent + g.slot4, g.indent + g.slot4 * 2, g.indent + g.slot4 * 3];
      g.stops2 = [g.indent, g.indent + g.slot2];
      g.stops3 = [g.indent, g.indent + Math.floor(g.textW / 3), g.indent + Math.floor(g.textW / 3) * 2];
      // চারটি সমান ২৫% কলাম: শেষ stop-টি ডান প্রান্তে, যাতে Word-এ Tab দিয়েও
      // grid-টি একই জ্যামিতিতে পুনর্বিন্যাস করা যায়।
      g.optionTabStops4 = [1, 2, 3, 4].map((i) => g.indent + (i === 4 ? g.textW : Math.floor(g.textW * i / 4)));
      // শেষ ডিফেন্স: NaN/Infinity জ্যামিতি থেকে বের হতে পারবে না (OpenXML ক্র্যাশ রোধ)
      ['margin', 'colGap', 'indent', 'colW', 'textW', 'usableW', 'usableH', 'pageW', 'pageH', 'baseSz', 'slot4', 'slot2']
        .forEach((k) => { const n = Number(g[k]); if (!Number.isFinite(n) || n <= 0) g[k] = Math.round(Number.isFinite(this.GEOMETRY[k]) ? this.GEOMETRY[k] : 720); });
      if (g.cols < 1) g.cols = 2;
      return g;
    },

    lineH(sz, g) {
      return Math.round((sz / 2) * TWP_PER_PT * (g ? g.lineFactor : this.GEOMETRY.lineFactor));
    },

    /** ৪/৩/২/১ কলাম গ্রিড সিদ্ধান্ত — পরিমাপভিত্তিক, দৈর্ঘ্য-হিউরিস্টিক নয় (ঘ.১–২) */
    decideOptionsGrid(options, sz, g) {
      const opts = Array.isArray(options) ? options : [];
      const count = opts.length;
      if (count === 0) return { cols: 0, rows: [], stops: [], tabStops4: [], slotW: 0, widest: 0 };

      const widths = opts.map((o) => optionWidth(o, sz));
      const widest = Math.max.apply(null, widths);

      // সমীকরণের source-notation নয়, optionWidth-এর visual estimate অনুযায়ী ৪/৩/২/১।
      const cand = count >= 4 ? [4, 2, 1] : count === 3 ? [3, 1] : [1];
      let cols = 1;
      for (const c of cand) {
        const slot = Math.floor(g.textW / c);
        const fitsAll = widths.every((w, i) => {
          // একই লাইনে পাশাপাশি বসার জন্য: slot-এর ভেতর থাকতে হবে (শ্বাস বাদে)
          if (c === 1) return true;
          // যে সারিতে ওই অপশনটি বসবে সেই সারির সর্বোচ্চ প্রস্থ দেখা হয়
          const rowIdx = Math.floor(i / c);
          let rowMax = 0;
          for (let k = rowIdx * c; k < Math.min(rowIdx * c + c, count); k++) rowMax = Math.max(rowMax, widths[k]);
          return rowMax <= slot - g.minGap;
        });
        if (fitsAll) { cols = c; break; }
      }

      const slotW = Math.floor(g.textW / cols);
      const stops = [];
      for (let k = 1; k < cols; k++) stops.push(g.indent + slotW * k);

      const rows = [];
      for (let i = 0; i < count; i += cols) rows.push(opts.slice(i, i + cols).map((_, j) => i + j));
      // stops[] প্রতিটি কলাম-সীমায় একটি বাম-ট্যাব দেয়; ২-কলামেও ৫০% স্টপে এক Tab যথেষ্ট।
      const tabJumps = rows.map(() => (cols > 1 ? 1 : 0));

      return { cols, rows, stops, tabStops4: g.optionTabStops4.slice(), tabJumps, slotW, widest };
    },

    /** হেডার ব্লক (খ.২–৪): ৫টি লাইন সর্বদাই থাকবে — অটো-প্লেসহোল্ডার সহ */
    buildHeader(header, docType) {
      const h = header || {};
      const fb = this.FALLBACK;
      const lines = [];

      lines.push({
        kind: 'institute',
        text: h.institute || (docType === 'EXAM_MCQ' ? fb.institute : (h.institute || '')),
        fallbackUsed: !h.institute,
        align: 'center', bold: true, sizeDelta: 8   // ১৬pt হেডার-টাইটেল
      });
      lines.push({
        kind: 'location',
        text: h.location || (docType === 'EXAM_MCQ' ? fb.location : ''),
        fallbackUsed: !h.location,
        align: 'center', bold: false, sizeDelta: 0
      });
      lines.push({
        kind: 'exam',
        text: h.exam || (docType === 'EXAM_MCQ' ? fb.exam : ''),
        fallbackUsed: !h.exam,
        align: 'center', bold: true, sizeDelta: 2
      });
      lines.push({
        kind: 'classSubject',
        text: h.classAndSubject || (docType === 'EXAM_MCQ' ? fb.classSubject : ''),
        fallbackUsed: !h.classAndSubject,
        align: 'center', bold: false, sizeDelta: 0
      });

      const timeTxt = h.time ? 'সময়: ' + h.time : (docType === 'EXAM_MCQ' ? fb.time : '');
      const marksTxt = h.marks ? 'পূর্ণমানঃ ' + h.marks : (docType === 'EXAM_MCQ' ? fb.marks : '');
      lines.push({
        kind: 'metrics',
        text: timeTxt, right: marksTxt, center: h.examType || '',
        fallbackUsed: !h.time || !h.marks,
        align: 'left', bold: true, sizeDelta: 0
      });

      if (h.instructions) {
        lines.push({ kind: 'instructions', text: h.instructions, fallbackUsed: false, align: 'center', bold: false, italic: true, sizeDelta: -2 });
      }
      return lines.filter((l) => l.text || l.right || l.center);
    },

    /** হেডার উচ্চতা (টুইপসে) — পৃষ্ঠা ১-এর কলাম ক্যাপাসিটি থেকে বিয়োগ হয় */
    headerHeight(headerLines, sz, g) {
      let h = 0;
      for (const l of headerLines) {
        const lsz = sz + (l.sizeDelta || 0);
        const per = Math.round((lsz / 2) * TWP_PER_PT * g.headerLineFactor);
        const avail = l.kind === 'metrics' ? g.usableW : g.usableW;
        const n = Math.max(1, lineCount(l.text || '', lsz, avail - 200));
        h += per * n;
        if (l.kind === 'metrics' && l.center) h += 0; // ইনলাইন সেন্টার ট্যাবেই বসে
      }
      h += 60; // ডিভাইডার + তার নিচের ফাঁকা (খ.৪)
      return Math.round(h);
    },

    /**
     * একটি প্রশ্নের উচ্চতা ও লাইন-গণনা (ঐ ফন্ট সাইজে, ঐ কলাম প্রস্থে)।
     * রিটার্ন: { stemLines, optionRows, lines, height, grid }
     */
    measureQuestion(q, sz, g) {
      const stem = String(q.num || '') + '। ' + String(q.text || '');
      let lines = lineCount(stem, sz, g.textW);
      const parts = { stemLines: lines, statementLines: 0, preLines: 0, stimLines: 0, optionRows: 0 };

      if (q.preContext) {
        for (const cl of String(q.preContext).split('\n').map((x) => x.trim()).filter(Boolean)) {
          parts.preLines += lineCount(cl, sz, g.colW);
        }
      }
      if (q.statements && q.statements.length > 0) {
        for (const s of q.statements) parts.statementLines += lineCount(s, sz, g.textW);
      } else if (q.stimulus) {
        for (const sl of String(q.stimulus).split('\n').map((x) => x.trim()).filter(Boolean)) {
          parts.stimLines += lineCount(sl, sz, g.colW);
        }
      }

      let grid = { cols: 0, rows: [], stops: [], tabStops4: [], slotW: 0, widest: 0 };
      if (q.options && q.options.length > 0) {
        grid = this.decideOptionsGrid(q.options, sz, g);
        parts.optionRows = grid.rows.length;
      } else if (q.subQuestions && q.subQuestions.length > 0 && (!q.options || q.options.length === 0)) {
        for (const sq of q.subQuestions) {
          if (sq && sq.text) parts.optionRows += lineCount('(' + (sq.label || '') + ') ' + sq.text, sz, g.textW);
        }
      }

      const total = parts.preLines + lines + parts.statementLines + parts.stimLines + parts.optionRows;
      return {
        stemLines: lines,
        grid,
        parts,
        lines: Math.max(2, total),
        height: Math.max(2, total) * this.lineH(sz, g) + 20 // প্রশ্ন-মধ্যবর্তী শ্বাস (\sa20 / after=20)
      };
    },

    /**
     * উচ্চতা-ভিত্তিক কলাম ব্যালান্স (ঙ.২) — দুই কলামের উচ্চতার পার্থক্য ন্যূনতম,
     * কোনো কলামই ক্যাপাসিটি অতিক্রম করবে না।
     * রিটার্ন: { count, split, h1, h2 } — count = যে-সংখ্যক আইটেম এই পৃষ্ঠায় ধরে
     */
    balancePage(items, capH, from) {
      const start = from || 0;
      const n = items.length - start;
      if (n <= 0) return { count: 0, split: 0, h1: 0, h2: 0, empty: true };

      // প্রিফিক্স সাম
      const P = new Array(n + 1).fill(0);
      for (let i = 0; i < n; i++) P[i + 1] = P[i] + items[start + i].height;

      const best = { count: 0, split: 1, h1: 0, h2: 0 };
      for (let K = n; K >= 1; K--) {
        if (P[K] > capH * 2) continue;             // দুই কলামেই ধরবে না
        let found = null;
        for (let k1 = 1; k1 < K; k1++) {
          const h1 = P[k1];
          const h2 = P[K] - P[k1];
          if (h1 <= capH && h2 <= capH) {
            const diff = Math.abs(h1 - h2);
            if (!found || diff < found.diff) found = { k1, h1, h2, diff };
          }
        }
        if (K === 1) {
          if (P[1] <= capH) found = { k1: 1, h1: P[1], h2: 0, diff: P[1] };
        }
        if (found) {
          best.count = K;
          best.split = found.k1;
          best.h1 = found.h1;
          best.h2 = found.h2;
          break;
        }
      }
      return best;
    },

    /**
     * Part-13.3 (রিপোর্ট-২.১ রুট-কজ): পৃষ্ঠা-১-এর কলাম-২-এ হেডার খায় না —
     * কলাম-১ = cap1 (হেডার-করা), কলাম-২ = cap2 (পূর্ণ কলাম-উচ্চতা)। আগে
     * দুটোতেই cap1 ধরা হতো ⇒ কলাম-২ অর্ধ-খালি রেখেই পরের পৃষ্ঠায় ঝাঁপ।
     */
    balancePageHeader(items, cap1, cap2, from) {
      const start = from || 0;
      const n = items.length - start;
      if (n <= 0) return { count: 0, split: 0, h1: 0, h2: 0, empty: true };
      const P = new Array(n + 1).fill(0);
      for (let i = 0; i < n; i++) P[i + 1] = P[i] + items[start + i].height;
      const best = { count: 0, split: 1, h1: 0, h2: 0 };
      for (let K = n; K >= 1; K--) {
        if (P[K] > cap1 + cap2) continue;
        let found = null;
        for (let k1 = 1; k1 <= K; k1++) {
          const h1 = P[k1];
          const h2 = P[K] - P[k1];
          if (h1 <= cap1 && h2 <= cap2) {
            const diff = Math.abs(h1 - h2);
            if (!found || diff < found.diff) found = { k1, h1, h2, diff };
          }
        }
        if (found) { best.count = K; best.split = found.k1; best.h1 = found.h1; best.h2 = found.h2; break; }
      }
      return best;
    },

    /**
     * মাস্টার এন্ট্রি — সম্পূর্ণ Geometry Plan।
     * options: { docType, margin, colSep, forceSz, layoutMode:'AUTO'|'A'|'B'|'C',
     *            lineFactor, baseSz, maxShrinkOverflow }
     */
    plan(parsedData, options = {}) {
      const docType = options.docType || 'EXAM_MCQ';
      // Part-10 (খ.১): MCQ আর্কিটাইপে মার্জিন সর্বদা 0.5" — UI থেকে অন্য মান এলেও
      // এই চুক্তি প্রযোজ্য (অ-MCQ আর্কিটাইপ স্পর্শ করা হয় না)।
      const o2 = (docType === 'EXAM_MCQ' && !options.forceMargin)
        ? Object.assign({}, options, { margin: 0.5, columnGap: 0.2 })
        : options;
      const g = this.geometry(o2);

      const allQuestions = [];
      if (parsedData && Array.isArray(parsedData.sections)) {
        for (const sec of parsedData.sections) {
          for (const q of (sec.questions || [])) allQuestions.push(q);
        }
      }
      const N = allQuestions.length;

      const headerLines = this.buildHeader((parsedData && parsedData.header) || {}, docType);

      const ladder = Array.isArray(options.shrinkLadder) ? options.shrinkLadder : g.shrinkLadder;
      const attempts = options.forceSz ? [options.forceSz] : ladder;

      let chosen = null;
      let baseCand = null;
      // Part-10 পৃষ্ঠা-বিন্যাস মডেল (ঙ.১–ঙ.২):
      //  - পৃষ্ঠা ১ "পূর্ণ" হয়: কলাম ১ পূরণ → কলাম ২ পূরণ (fill)
      //  - শেষ পৃষ্ঠা উচ্চতা-ব্যালান্সড (balance) — ওয়ার্ড/লিব্রঅফিস ক্রমাগত
      //    বহু-কলাম সেকশনের শেষ পৃষ্ঠা স্বয়ংক্রিয়ভাবে ব্যালান্স করে, তাই এখানে
      //    জোরি কলাম-ব্রেক দেওয়া হয় না (দিলে কলাম ১ ঠিকমতো না ধরলে পরের কলাম
      //    ফাঁকা থেকে যায় — রেন্ডারে ধরা পড়েছে)।
      for (let ai = 0; ai < attempts.length; ai++) {
        const sz = attempts[ai];
        const lineH = this.lineH(sz, g);
        // হেডার ব্লক সংকুচিত হয় না — পরিচয়মূলক লেখা ভিত্তি সাইজেই থাকে
        const headH = this.headerHeight(headerLines, g.baseSz, g);
        // ১ লাইন রিজার্ভ: DOCX-এ হেডার→বডি সেকশন-ব্রেকের প্যারাগ্রাফটিও এক লাইন
        // জায়গা নেয় (রেন্ডারে মাপা: DOCX বডি ৬pt নিচ থেকে শুরু হয়)। রিজার্ভ না
        // রাখলে .doc ঠিক ১ পৃষ্ঠায় বসে কিন্তু .docx ২য় পৃষ্ঠায় উঠে যায়।
        const capPage1 = Math.max(lineH * 4, g.usableH - headH - lineH);
        const capFull = Math.max(lineH * 4, g.usableH);

        const items = allQuestions.map((q, i) => {
          const m = this.measureQuestion(q, sz, g);
          return { index: i, q, height: m.height, lines: m.lines, grid: m.grid, stemLines: m.stemLines, parts: m.parts };
        });

        // ---- fill: কলাম ধরে ধরে ভরাট ----
        const pages = [];
        let i = 0;
        let guard = 0;
        while (i < items.length && guard++ < 40) {
          const isFirst = pages.length === 0;
          const cap = isFirst ? capPage1 : capFull;
          const before = i;
          let c1 = [];
          let h1 = 0;
          while (i < items.length && h1 + items[i].height <= cap) { h1 += items[i].height; c1.push(items[i].index); i++; }
          if (c1.length === 0 && i < items.length) { c1.push(items[i].index); h1 += items[i].height; i++; } // এড়িয়ে চলি: শূন্য পৃষ্ঠা
          let c2 = [];
          let h2 = 0;
          while (i < items.length && h2 + items[i].height <= cap) { h2 += items[i].height; c2.push(items[i].index); i++; }
          pages.push({ page: pages.length + 1, col1: c1, col2: c2, h1, h2, mode: 'fill' });
          if (i === before) break;
        }

        const firstPageTotal = pages.length ? pages[0].col1.length + pages[0].col2.length : 0;
        const overflow = Math.max(0, items.length - firstPageTotal);
        const singlePage = items.length > 0 && pages.length === 1;
        const setBreak = (pg, cap) => {
          // জোরি কলাম-ব্রেক তখনি নিরাপদ যখন পরিকল্পিত কলাম ১-এর উচ্চতার সঙ্গে
          // পৃষ্ঠার প্রকৃত ধারণক্ষমতার ফাঁকা থাকে (≈১০%)। ফাঁকা না থাকলে
          // কলাম ২ পুরো ফাঁকা থেকে যেতে পারে (রেন্ডারে দেখা) — তখন প্রবাহেই
          // রাখি, Word/LO শেষ পৃষ্ঠা নিজেই ভাগ করে নেয়।
          pg.forceBreak = pg.mode === 'balance' && Math.max(pg.h1, pg.h2) <= cap * 0.9;
          return pg;
        };

        if (pages.length && singlePage) {
          // এক পৃষ্ঠা: ব্যালান্স করি (ওয়ার্ডও তা-ই করে)
          const b = this.balancePageHeader(items, capPage1, capFull, 0);
          if (b.count > 0) {
            pages[0] = {
              page: 1,
              col1: items.slice(0, b.split).map((it) => it.index),
              col2: items.slice(b.split).map((it) => it.index),
              h1: b.h1, h2: b.h2, mode: 'balance',
              forceBreak: false
            };
            setBreak(pages[0], capPage1);
          }
        } else if (pages.length > 1) {
          // শেষ পৃষ্ঠা ব্যালান্স
          const last = pages[pages.length - 1];
          const all = last.col1.concat(last.col2);
          const startIdx = all[0];
          const b = this.balancePage(items, capFull, startIdx);
          const sp = Math.min(Math.max(b.split || Math.ceil(all.length / 2), 1), Math.max(1, all.length - 1)) + startIdx;
          last.col1 = all.filter((x) => x < sp);
          last.col2 = all.filter((x) => x >= sp);
          last.h1 = last.col1.reduce((a, x) => a + items[x].height, 0);
          last.h2 = last.col2.reduce((a, x) => a + items[x].height, 0);
          last.mode = 'balance';
          setBreak(last, capFull);
        }

        const cand = {
          sz, lineH, headerHeight: headH, cap1: capPage1, capFull,
          items, pages,
          page1: { count: firstPageTotal, split: pages.length ? pages[0].col1.length : 0, h1: pages.length ? pages[0].h1 : 0, h2: pages.length ? pages[0].h2 : 0 },
          overflowCount: overflow,
          singlePage,
          shrinkAttempted: ai,
          page2: pages.length > 1 ? { count: pages[1].col1.length + pages[1].col2.length, split: pages[1].col1.length, h1: pages[1].h1, h2: pages[1].h2 } : null
        };
        if (ai === 0) baseCand = cand;
        // Part-10 (ঙ.১) — সংকোচন শুধু তখনই গ্রহণযোগ্য যখন তা সত্যিই
        // **এক পৃষ্ঠা** সাধন করে। নাহলে বড় ফন্টই (১২pt) রাখা হয়, যাতে
        // ২য় পৃষ্ঠায় ১–২টি প্রশ্নের মতো কঙ্কাল-পৃষ্ঠা না বনে।
        if (singlePage) { chosen = cand; break; }
        const mayShrink = overflow > 0 && overflow <= (options.maxShrinkOverflow || g.maxShrinkOverflow) && ai < attempts.length - 1;
        if (!mayShrink) {
          // ল্যাডার শেষ কিন্তু ১ পৃষ্ঠা হয়নি → ভিত্তি সাইজেই ফিরে যাই: বড়
          // ফন্ট + পূর্ণ ২য় পৃষ্ঠা, কঙ্কাল-পৃষ্ঠার (১টি প্রশ্ন) চেয়ে শ্রেয়।
          chosen = (ai > 0 && baseCand && !baseCand.singlePage) ? baseCand : cand;
          break;
        }
      }
      if (!chosen) chosen = baseCand;

      if (!chosen) {
        const sz = attempts[attempts.length - 1];
        chosen = {
          sz, lineH: this.lineH(sz, g), headerHeight: 0, cap1: g.usableH, capFull: g.usableH,
          items: [], pages: [{ page: 1, col1: [], col2: [], h1: 0, h2: 0, mode: 'balance' }],
          page1: { count: 0, split: 0, h1: 0, h2: 0 }, overflowCount: 0, singlePage: true, shrinkAttempted: 0, page2: null
        };
      }

      // layoutMode override (পুরনো UI অপশন: A=এক লাইন অপশন, B/C=দুই লাইন অপশন/দুই পৃষ্ঠা)
      const forced = options.layoutMode && options.layoutMode !== 'AUTO' ? options.layoutMode : null;
      if (forced === 'A') chosen.forceOneLineOptions = true;
      if (forced === 'B' || forced === 'C') chosen.forceTwoLineOptions = true;

      const pages = chosen.pages;
      return {
        version: this.version,
        docType,
        geometry: g,
        headerLines,
        divider: true,
        font: { sz: chosen.sz, pt: chosen.sz / 2, shrunk: chosen.shrinkAttempted > 0, shrinkAttempted: chosen.shrinkAttempted },
        metrics: {
          lineH: chosen.lineH,
          headerHeight: chosen.headerHeight,
          cap1: chosen.cap1,
          capFull: chosen.capFull,
          totalQuestions: chosen.items.length,
          overflowCount: chosen.overflowCount,
          singlePage: !!chosen.singlePage,
          pages: pages.length
        },
        items: chosen.items,
        pages,
        // Part-10: কলাম-ব্রেক প্রতি-পৃষ্ঠায় স্বেচ্ছাধীন (pg.forceBreak) —
        // 'balance' পেজে ফাঁকা থাকলেই বসে, ঠাসি থাকলে প্রবাহেই রাখা হয়।
        forceColumnBreaks: false,
        forceOneLineOptions: !!chosen.forceOneLineOptions,
        forceTwoLineOptions: !!chosen.forceTwoLineOptions
      };
    },

    /** রেন্ডারারদের জন্য ট্যাব-স্টপ প্রিফিক্স (DOCX) */
    docxTabs(stops) {
      if (!stops || !stops.length) return '';
      return '<w:tabs>' + stops.map((p) => `<w:tab w:val="left" w:pos="${p}"/>`).join('') + '</w:tabs>';
    },

    /** রেন্ডারারদের জন্য ট্যাব-স্টপ প্রিফিক্স (RTF) */
    rtfTabs(stops) {
      if (!stops || !stops.length) return '';
      return stops.map((p) => '\\tx' + p).join('');
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = McqLayoutPlanner;
  if (typeof window !== 'undefined') window.McqLayoutPlanner = McqLayoutPlanner;
  if (typeof globalThis !== 'undefined') globalThis.McqLayoutPlanner = McqLayoutPlanner;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
