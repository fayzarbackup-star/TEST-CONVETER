/**
 * Fayzar Bangla Converter — CQ Booklet Master Layout Planner (Part-11)
 * =====================================================================
 * সৃজনশীল (EXAM_CQ) ও কম্বাইন্ড (EXAM_COMBINED) পত্রের **বুকলেট জ্যামিতি** এখানেই
 * ঠিক হয়। এটি নির্ভুল, পাশ্ব-প্রভাবমুক্ত (pure) জ্যামিতি মডেল — কোনো RTF/DOCX/HTML
 * লেখে না, কোনো ইঞ্জিন ডিপেন্ডেন্সি নেই। ইনপুট: parse করা প্রশ্নপত্র + পেজ সেটিংস;
 * আউটপুট: কলাম-ভিত্তিক ছাপার-প্ল্যান (columns[])।
 *
 * তিন রেন্ডারারই (Word 2003 RTF, Modern DOCX, HTML প্রিভিউ) একই প্ল্যান কনজিউম করে
 * → "preview == download" চুক্তি (Part-10) অটুট থাকে।
 *
 * Part-11 চুক্তি (সৃজনশীল মাস্টার লেআউট):
 *  (১) পেজ   : A4 ল্যান্ডস্কেপ (paperw16838 paperh11906), চারদিকে 0.5" মার্জিন
 *  (২) কলাম  : ২ কলাম, মাঝের গ্যাপ 0.7" (1008 twips)। বুকলেট ইম্পোজিশন —
 *             শীট ১-এর ১ম কলাম = ব্যাক কভার (ফাঁকা; উপচে যাওয়া অংশ দিয়ে পূর্ণ),
 *             ২য় কলাম = ফ্রন্ট কভার (হেডার + প্রশ্নের সূচনা); শীট ২ = পৃষ্ঠা ২ ও ৩
 *  (৩) হেডার : ২য় কলামের শীর্ষে একক-কলাম ব্লক — প্রতিষ্ঠান ১৬pt বোল্ড / ঠিকানা ১২pt /
 *             পরীক্ষা ১৩pt বোল্ড / শ্রেণি-বিষয় ১২pt / সময় ↔ (সৃজনশীল অভীক্ষা) ↔ পূর্ণমান
 *             নেটিভ রাইট-ট্যাবে, নিচে একটি বর্ডার ডিভাইডার
 *  (৪) প্রশ্ন : ক্রমিক নম্বর কলামের বাম প্রান্তে, পরে ট্যাব, হ্যাঙ্গিং ইনডেন্ট 432 dxa;
 *             নম্বরের নিচে লেখা র‍্যাপ করে না
 *  (৫) উদ্দীপক: বক্সহীন; ছক থাকলে সাদামাটা অটো-উইডথ টেবিল (শেডিং/হেডার-সারি নেই)
 *  (৬) উপ-প্রশ্ন: 864 dxa ইনডেন্ট, ডান প্রান্তে খাঁটি নম্বর (রাইট ট্যাব), বিকল্প প্রশ্নের
 *             মাঝে সেন্টারে বোল্ড `অথবা` ডিভাইডার
 *
 * মাপের একক: সবকিছু twips (1pt = 20 twips, 1" = 1440 twips)।
 */

(function (global) {
  'use strict';

  const TWP_PER_PT = 20;

  /**
   * ক্যালিব্রেশন Part-10-এর রেন্ডার-বিবৃত্তি থেকে ধার করা (proof/render-measure.json):
   * শব্দ-প্রস্থ মডেল ১.১২× (WIDTH_SCALE), লাইন-পিচ ১.৫০ × ফন্টসাইজ।
   * মডেল ইচ্ছাকৃত রক্ষণশীল — একটু ফাঁকা কলাম, ভাঁজ-ভাঙা/সরকে যাওয়া পৃষ্ঠার চেয়ে শ্রেয়।
   */
  const WIDTH_SCALE = 1.12;

  const EM = {
    bangla: 0.52,
    banglaMark: 0.30,
    latinLower: 0.47,
    latinUpper: 0.66,
    digit: 0.50,
    space: 0.26,
    punct: 0.28,
    dash: 0.36,
    wide: 0.60,
    math: 0.55
  };

  function classOf(ch) {
    const c = ch.codePointAt(0);
    if (ch === ' ' || ch === '\t' || ch === '\u00A0') return 'space';
    if (c >= 0x0980 && c <= 0x09FF) {
      if ((c >= 0x09BE && c <= 0x09CD) || (c >= 0x09E3 && c <= 0x09E4)) return 'banglaMark';
      return 'bangla';
    }
    if (c >= 0x09E6 && c <= 0x09EF) return 'digit';
    if (c >= 0x30 && c <= 0x39) return 'digit';
    if (c >= 0x61 && c <= 0x7A) return 'latinLower';
    if (c >= 0x41 && c <= 0x5A) return 'latinUpper';
    if ('.,:;\'"()[]{}/|!?'.indexOf(ch) !== -1) return 'punct';
    if ('-–—_'.indexOf(ch) !== -1) return 'dash';
    if ('+=×÷√%<>≤≥≠≈'.indexOf(ch) !== -1) return 'math';
    return 'wide';
  }

  /** টেক্সটের প্রস্থ (twips); sz = অর্ধ-পয়েন্ট (24 = 12pt) */
  function measure(str, sz) {
    const s = String(str == null ? '' : str);
    if (!s) return 0;
    const emTwips = (sz / 2) * TWP_PER_PT;
    let em = 0;
    for (const ch of s) em += EM[classOf(ch)] || EM.wide;
    return Math.round(em * emTwips * WIDTH_SCALE);
  }

  /** কতগুলো লাইন দখল করবে — greedy word-wrap মডেল */
  function lineCount(str, sz, availW) {
    const s = String(str == null ? '' : str).replace(/\s+/g, ' ').trim();
    if (!s) return 1;
    const maxW = Math.max(600, availW);
    const words = s.split(' ');
    const spaceW = measure(' ', sz);
    let lines = 1;
    let cur = 0;
    for (const word of words) {
      const w = measure(word, sz);
      const next = cur === 0 ? w : cur + spaceW + w;
      if (cur > 0 && next > maxW) { lines++; cur = w; }
      else { cur = next; }
      // অত্যন্ত লম্বা একক টোকেন (URL/সূত্র) — শুধু বাস্তব অতিরিক্ত লাইন গুনি;
      // শব্দের শেষে কল্পিত space যোগ করে wrap/overflow বাড়ানো হয় না।
      while (cur > maxW && w > maxW) { lines++; cur -= maxW; }
    }
    return lines;
  }

  function toLines(txt) {
    return String(txt == null ? '' : txt).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  }

  /**
   * Part-12: দৈর্ঘ্য-ইউনিট রিজলভার — js/layout-engine/layout-units.js লোড থাকলে
   * সেই একমাত্র অ্যালগরিদম, না থাকলে এখানেই সমতুল্য সংস্করণ (গেটে মিল যাচাই করা হয়)।
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
      hi = hi || 22000;   // raw-twips ইনপুট (যেমন rightTab ৭০৫০) যেন কেটে না যায়
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

  global.CqBookletPlanner = {
    // ------------------------------------------------------------- ধ্রুবক/জ্যামিতি
    GEOMETRY: {
      pageW: 16838,          // A4 ল্যান্ডস্কেপ প্রস্থ
      pageH: 11906,          // A4 ল্যান্ডস্কেপ উচ্চতা
      margin: 720,           // ০.৫" চারদিকে (১)
      cols: 2,
      colGap: 1008,          // ০.৭" ()
      colSep: false,         // বুকলেটে মাঝখানে দৃশ্যমান লাইন নয় (ভাঁজই বিভাজক)
      indent: 432,           // প্রশ্নের হ্যাঙ্গিং ইনডেন্ট ০.৩" (৪)
      // এক-অঙ্কের নম্বর (১।–৯।): ০.২" — নম্বরের পরে একটি স্বাভাবিক ফাঁকের মতো দেখায়; ১০+ প্রশ্নে ০.৩"
      compactIndent: 288,
      subIndent: 864,        // উপ-প্রশ্নের ইনডেন্ট (৬)
      subHanging: 432,
      lineFactor: 1.50,
      headerLineFactor: 1.28,
      // Part-12 (ট্রায়াজ ১): রেন্ডার-রেশিও — RTF/DOCX সব প্যারাগ্রাফে 'single'-এর গুণক
      // (1 = নিজ ফন্টের প্রাকৃতিক লাইন); ১.৫ শুধু ক্যাপাসিটি মডেলের নিরাপত্তা-ধারনা,
      // প্রিভিউর CSS line-height কিন্তু রেন্ডারের সঙ্গে মিলে (1.34 ≈ বাংলা ফন্ট single)।
      lineRenderFactor: 1,
      lineRenderCssRatio: 1.34,
      baseSz: 24,            // ১২pt
      fillRatio: 0.98,       // প্রতি কলামে নিরাপত্তা মার্জিন
      balanceSlack: 0.90     // শেষ পৃষ্ঠার দুই কলাম ব্যালান্সের শর্ত (Part-10 ঙ.৩ থেকে)
    },

    /** হেডার লাইনের সাইজ — ৩ নম্বর ধারা (অর্ধ-পয়েন্ট) */
    HEADER_SIZES: { institute: 32, location: 24, exam: 26, classSubject: 24, metrics: 24 },

    /** EXAM_CQ/EXAM_MATH/EXAM_GENERAL/EXAM_COMBINED-এর CQ পথে অনুপস্থিত হেডার-ফিল্ডের দৃশ্যমান, ক্লিক-এডিটযোগ্য ফলব্যাক */
    CQ_HEADER_FALLBACK: {
      institute: 'আপনার প্রতিষ্ঠানের নাম',
      location: 'ঠিকানা লিখুন',
      exam: 'পরীক্ষার নাম লিখুন',
      classAndSubject: 'শ্রেণি ও বিষয়',
      time: '২ ঘণ্টা ৩০ মিনিট',
      examType: 'সৃজনশীল অভীক্ষা',
      marks: '৭০'
    },

    /**
     * EXAM_GENERAL (প্রাথমিক/সাধারণ) হেডার-ফলব্যাক — কাল্পনিক সময়/নম্বর নয়, ফাঁকা ডট-প্লেসহোল্ডার;
     * "সৃজনশীল অভীক্ষা" লেবেলও নেই।
     */
    GENERAL_HEADER_FALLBACK: {
      institute: 'আপনার প্রতিষ্ঠানের নাম',
      location: 'ঠিকানা লিখুন',
      exam: 'পরীক্ষার নাম লিখুন',
      classAndSubject: 'শ্রেণি: ................  |  বিষয়: ................',
      time: '................',
      examType: '',
      marks: '................'
    },

    /**
     * ডকটাইপ-ভিত্তিক লেআউট প্রোফাইল — নতুন প্রশ্নপত্র-লেআউট যোগ করতে শুধু এখানে একটি এন্ট্রি দিন।
     *  landscape  : পৃষ্ঠার দিক          colGap/colSep : কলাম-গ্যাপ (twips) ও মাঝের লাইন
     *  booklet    : ব্যাক-কভার সংরক্ষিত ভাঁজ-বুকলেট কি না
     *  headerSpan : 'column' = হেডার প্রথম কলামের শীর্ষে; 'page' = পুরো প্রস্থে ১-কলাম হেডার,
     *               তারপর কন্টিনিউয়াস সেকশনে ২-কলাম বডি
     *  examTypeLabel / fallback : হেডারের মাঝের লেবেল ও ফলব্যাক-সেট
     */
    LAYOUT_PROFILES: {
      EXAM_CQ: { landscape: true, colGap: 1008, colSep: false, booklet: true, headerSpan: 'column', examTypeLabel: 'সৃজনশীল অভীক্ষা', fallback: 'CQ_HEADER_FALLBACK' },
      EXAM_MATH: { landscape: true, colGap: 1008, colSep: false, booklet: true, headerSpan: 'column', examTypeLabel: 'সৃজনশীল অভীক্ষা', fallback: 'CQ_HEADER_FALLBACK' },
      EXAM_COMBINED: { landscape: true, colGap: 1008, colSep: false, booklet: true, headerSpan: 'column', examTypeLabel: 'সৃজনশীল অভীক্ষা', fallback: 'CQ_HEADER_FALLBACK' },
      // স্পেক: A4 পোর্ট্রেট, ১-কলাম হেডার + ২-কলাম বডি (০.২৫" = ৩৬০ গ্যাপ, সলিড ডিভাইডার), কলাম ১ থেকে শুরু
      EXAM_GENERAL: { landscape: false, colGap: 360, colSep: true, booklet: false, headerSpan: 'page', examTypeLabel: '', fallback: 'GENERAL_HEADER_FALLBACK' },
      // Part-18.9 (ব্যবহারকারীর সিদ্ধান্ত ২০২৬-১০-০৯, দোকানের আসল ২য়–৫ম শ্রেণির পত্র থেকে মাপা):
      // EXAM_GENERAL-এর ২য়–৫ম শ্রেণি → A4 ল্যান্ডস্কেপ, ২ কলাম, ০.৭" গ্যাপ, কলাম-লাইন নেই, হেডার কলামের শীর্ষে।
      // booklet 'auto': লেখা ২ কলামে ধরলে এক পাতা (কলাম ১ থেকে); বেশি হলে বুকলেট (শীট-১-এর ১ম কলাম ব্যাক কভার)।
      EXAM_PRIMARY: { landscape: true, colGap: 1008, colSep: false, booklet: 'auto', headerSpan: 'column', examTypeLabel: '', fallback: 'GENERAL_HEADER_FALLBACK' },
      // Part-18.9 (ব্যবহারকারীর সিদ্ধান্ত ২০২৬-১০-০৯): এক কলামের পত্র (ইংরেজি/সৃজনশীল/সাধারণ) — A4 লম্বালম্বি, ১ কলাম,
      // হেডার উপরে; দোকানের এক-কলামের বাংলা ২য় পত্রের মতো। উৎস এক কলামের হলে বা ব্যবহারকারী "১ কলাম" বাছলে।
      EXAM_ONECOL: { landscape: false, cols: 1, colGap: 0, colSep: false, booklet: false, headerSpan: 'column', examTypeLabel: '', fallback: 'CQ_HEADER_FALLBACK' }
    },

    profile(docType) {
      const key = String(docType || 'EXAM_CQ').toUpperCase();
      return Object.assign({}, this.LAYOUT_PROFILES[key] || this.LAYOUT_PROFILES.EXAM_CQ);
    },

    /** EXAM_PRIMARY যে শ্রেণিগুলোতে প্রযোজ্য (ব্যবহারকারীর নিয়ম: ২য় থেকে ৫ম) */
    PRIMARY_GRADES: { min: 2, max: 5 },

    GRADE_WORDS: { 'প্রথম': 1, 'দ্বিতীয়': 2, 'তৃতীয়': 3, 'চতুর্থ': 4, 'পঞ্চম': 5, 'ষষ্ঠ': 6, 'সপ্তম': 7, 'অষ্টম': 8, 'নবম': 9, 'দশম': 10, 'একাদশ': 11, 'দ্বাদশ': 12,
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 },

    /** শ্রেণি-লেখা → সংখ্যা (৪ / 4 / ৪র্থ / চতুর্থ / Four); না পেলে 0 */
    parseGrade(v) {
      const s = String(v == null ? '' : v).trim().replace(/য়/g, 'য়')
        .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d))).replace(/^["']|["']$/g, '');
      if (!s) return 0;
      const n = s.match(/\d{1,2}/);
      if (n) { const g = parseInt(n[0], 10); return g >= 1 && g <= 12 ? g : 0; }
      for (const w of Object.keys(this.GRADE_WORDS)) {
        const wn = w.replace(/য়/g, 'য়');   // নুকতা-রূপ এক (s-ও একই রূপে)
        if (/^[a-z]+$/.test(w) ? new RegExp('\\b' + w + '\\b', 'i').test(s) : s.indexOf(wn) === 0) return this.GRADE_WORDS[w];
      }
      return 0;
    },

    /** শ্রেণি: আগে স্পষ্ট অপশন / Gemini-র ফ্রন্টম্যাটার, না পেলে হেডারের "শ্রেণি: চতুর্থ" লেখা */
    gradeOf(parsedData, o) {
      const opt = o || {};
      const fm = opt.__frontmatter || {};
      const direct = this.parseGrade(opt.grade) || this.parseGrade(fm.grade || fm.class);
      if (direct) return direct;
      const h = (parsedData && parsedData.header) || {};
      const s = [h.classAndSubject, h.exam, h.location, h.institute].filter(Boolean).join(' ; ');
      const m = s.match(/(?:শ্রেণি|শ্রেণী|শ্রেনি|শ্রেনী|class|grade)\s*[:ঃ\-–]?\s*([^\s,;|।:ঃ]+)/i);
      return m ? this.parseGrade(m[1]) : 0;
    },

    /**
     * Part-18.9: ডকটাইপ + শ্রেণি → লেআউট-প্রোফাইলের চাবি। ডকটাইপ বদলায় না (পার্সার/হেডার-ফলব্যাক
     * আগের মতো EXAM_GENERAL) — শুধু পাতার জ্যামিতি বাছাই। স্পষ্ট o.profileKey থাকলে সেটিই।
     */
    layoutKey(docType, parsedData, o) {
      const opt = o || {};
      if (opt.profileKey && this.LAYOUT_PROFILES[String(opt.profileKey).toUpperCase()]) return String(opt.profileKey).toUpperCase();
      const key = String(docType || 'EXAM_CQ').toUpperCase();
      const ONECOL_TYPES = ['EXAM_CQ', 'EXAM_MATH', 'EXAM_GENERAL', 'EXAM_COMBINED'];
      const choice = this.columnsChoice(opt);   // 'one' | 'two' | 'auto'
      // ব্যবহারকারী "১ কলাম" বাছলে সবকিছুর আগে
      if (choice === 'one' && ONECOL_TYPES.includes(key)) return 'EXAM_ONECOL';
      if (key === 'EXAM_GENERAL') {
        const g = this.gradeOf(parsedData, opt);
        if (g >= this.PRIMARY_GRADES.min && g <= this.PRIMARY_GRADES.max) return 'EXAM_PRIMARY';   // ২য়–৫ম: নিয়ম অগ্রাধিকার
      }
      // স্বয়ংক্রিয়: ছাপা উৎস এক কলামের হলে (Gemini-র source_columns তথ্য; হাতে-লেখায় দেওয়া হয় না)
      if (choice === 'auto' && ONECOL_TYPES.includes(key) && this.sourceColumns(opt) === 1) return 'EXAM_ONECOL';
      return key;
    },

    /** ব্যবহারকারীর কলাম-পছন্দ: o.layoutColumns = 1 | 2 | 'auto' (ফলাফল-পাতার বোতাম) */
    columnsChoice(o) {
      const v = String((o && o.layoutColumns) == null ? 'auto' : o.layoutColumns).trim().toLowerCase();
      if (v === '1' || v === 'one') return 'one';
      if (v === '2' || v === 'two') return 'two';
      return 'auto';
    },

    /** উৎস-পাতার কলাম-সংখ্যা (Gemini ফ্রন্টম্যাটার `source_columns`); অজানা/হাতে-লেখা → 0 */
    sourceColumns(o) {
      const fm = (o && o.__frontmatter) || {};
      const n = parseInt(String(fm.source_columns == null ? '' : fm.source_columns).replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d))), 10);
      return n === 1 || n === 2 ? n : 0;
    },

    /** ইংরেজি প্রশ্নপত্রের ফলব্যাক (বাংলা প্লেসহোল্ডার বা কাল্পনিক মান নয়) */
    ENGLISH_HEADER_FALLBACK: {
      institute: 'Name of Institution',
      location: 'Address',
      exam: 'Name of Examination',
      classAndSubject: 'Class: ................  |  Subject: ................',
      time: '................',
      examType: '',
      marks: '................'
    },

    /** হেডারের মেট্রিক্স-লেবেল ভাষাভেদে */
    HEADER_LABELS: {
      bn: { time: 'সময়: ', marks: 'পূর্ণমান: ' },
      en: { time: 'Time: ', marks: 'Full Marks: ' }
    },

    headerFallback(docType, lang) {
      if (lang === 'en') return this.ENGLISH_HEADER_FALLBACK;
      return this[this.profile(docType).fallback] || this.CQ_HEADER_FALLBACK;
    },

    /** পত্রের ভাষা: ল্যাটিন অক্ষর বাংলার ৩ গুণের বেশি হলে 'en' (স্পেক §৮: খাঁটি ইংরেজি পত্র) */
    paperLang(parsedData) {
      const p = parsedData || {};
      let s = Object.values(p.header || {}).join(' ');
      for (const sec of (p.sections || [])) {
        s += ' ' + (sec.title || '');
        for (const q of (sec.questions || [])) {
          s += ' ' + (q.text || '') + ' ' + (q.stimulus || '') + ' ' + (q.subQuestions || []).map((x) => x && x.text).join(' ');
        }
      }
      const bn = (s.match(/[অ-হড়-য়]/g) || []).length;
      const en = (s.match(/[A-Za-z]/g) || []).length;
      return en >= 20 && en > bn * 3 ? 'en' : 'bn';
    },

    /** প্রশ্ন-নম্বরের পরের চিহ্ন: ইংরেজি প্রশ্ন (ASCII নম্বর, বাংলা অক্ষর নেই) → `.`, অন্যথায় দাঁড়ি `।` */
    numDelimiter(q) {
      const num = String((q && q.num) || '');
      const txt = String((q && (q.text || q.stimulus)) || '');
      return /^[0-9]+$/.test(num) && /[A-Za-z]/.test(txt) && !/[ঀ-৿]/.test(txt) ? '.' : '।';
    },

    /** উপ-প্রশ্ন লেবেল: ইংরেজি `a` → `(a)`, বাংলা `ক` → `ক.` */
    subLabelText(label) {
      const l = String(label || '');
      if (!l) return '';
      return /^[a-z]$/i.test(l) ? '(' + l + ')' : l + '.';
    },

    /**
     * স্টেমের শেষে লেখা নম্বর আলাদা করা (রাইট-ট্যাবে বসানোর জন্য, স্পেক §৩):
     * `[0.5×10=5]`, `[১০]`, `১×৫=৫`, `… কর: ৫` — উৎসে যা আছে শুধু তা-ই, কিছু বানানো হয় না।
     */
    splitStemMark(text) {
      const s = String(text == null ? '' : text).trim();
      const m = s.match(/\s*(\[[^\[\]]*[\d০-৯][^\[\]]*\]|[\d০-৯.]+\s*[×xX]\s*[\d০-৯.]+\s*=\s*[\d০-৯.]+)\s*$/);
      if (m && m.index > 0) return { text: s.slice(0, m.index).trim(), mark: m[1].trim() };
      const c = s.match(/[:ঃ]\s*([\d০-৯]{1,3})\s*$/);
      if (c && c.index > 0) return { text: s.slice(0, c.index + 1).trim(), mark: c[1] };
      return { text: s, mark: '' };
    },

    // ------------------------------------------------------------- প্রকাশ্য মাপক
    measure(str, sz) { return measure(str, sz); },
    lineCount(str, sz, availW) { return lineCount(str, sz, availW); },

    geometry(options) {
      const o = options || {};
      const g = Object.assign({}, this.GEOMETRY);
      const prof = this.profile(o.profileKey || o.docType);
      g.colGap = prof.colGap;
      g.colSep = prof.colSep;
      if (!prof.landscape) { const w = g.pageW; g.pageW = g.pageH; g.pageH = w; }
      // Part-12: সব দৈর্ঘ্য U দিয়েই আসে — স্ট্রিং ('normal'), ইঞ্চি, টুইপ, একক-সহ
      // যা-ই আসুক আউটপুট সর্বদা সসীম টুইপ (NaN জ্যামিতিতে ঢোকে না)।
      const U = layoutUnits();
      g.margin = U.margin(o.margin, g.margin);
      g.colGap = U.gap(o.columnGap, g.colGap);
      g.indent = U.indent(o.indent, g.indent);
      g.subIndent = U.indent(o.subIndent, g.subIndent);
      if (o.cols) g.cols = U.count(o.cols, 2, 1, 6);
      if (prof.cols) g.cols = prof.cols;   // Part-18.9: এক-কলাম প্রোফাইল — রপ্তানির `columns: 2` ডিফল্ট উপেক্ষা
      if (o.pageWidth) g.pageW = U.count(o.pageWidth, g.pageW, 3000, 40000);
      if (o.pageHeight) g.pageH = U.count(o.pageHeight, g.pageH, 3000, 40000);
      if (o.baseSz) g.baseSz = U.count(o.baseSz, g.baseSz, 12, 96);
      if (o.lineFactor) g.lineFactor = Number.isFinite(parseFloat(o.lineFactor)) ? Math.min(3, Math.max(0.8, parseFloat(o.lineFactor))) : g.lineFactor;
      if (o.headerLineFactor) g.headerLineFactor = Number.isFinite(parseFloat(o.headerLineFactor)) ? Math.min(3, Math.max(0.8, parseFloat(o.headerLineFactor))) : g.headerLineFactor;
      if (o.fillRatio) g.fillRatio = Number.isFinite(parseFloat(o.fillRatio)) ? Math.min(1, Math.max(0.5, parseFloat(o.fillRatio))) : g.fillRatio;
      if (o.colSep !== undefined) g.colSep = !!o.colSep;
      if (o.landscape === false && g.pageW > g.pageH) { const w = g.pageW; g.pageW = g.pageH; g.pageH = w; }

      g.landscape = g.pageW > g.pageH;
      g.usableW = g.pageW - 2 * g.margin;
      g.usableH = g.pageH - 2 * g.margin;
      g.colW = Math.floor((g.usableW - g.colGap * (g.cols - 1)) / g.cols);   // ৭১৯৫
      g.textW = g.colW - g.indent;                                            // ৬৭৬৩
      g.subTextW = g.colW - g.subIndent;                                      // ৬৩৩১
      // rightTab = পুরো কলাম-প্রস্থ (৭১৯০+) পর্যন্ত — তাই indent-এর ৩" ক্যাপ নয়, twips()
      g.rightTab = o.rightTab ? Math.round(U.twips(o.rightTab, g.colW)) : g.colW;   // কলামের ডান প্রান্ত
      g.capacity = Math.round(g.usableH * g.fillRatio);
      // শেষ ডিফেন্স: কোনোভাবেই NaN/Infinity জ্যামিতি থেকে বের হওয়া যাবে না
      ['margin', 'colGap', 'indent', 'subIndent', 'colW', 'textW', 'subTextW', 'rightTab', 'capacity', 'usableW', 'usableH', 'pageW', 'pageH', 'baseSz']
        .forEach((k) => { const n = Number(g[k]); if (!Number.isFinite(n) || n <= 0) g[k] = Math.round(Number.isFinite(this.GEOMETRY[k]) ? this.GEOMETRY[k] : 720); });
      if (g.cols < 1) g.cols = 2;
      return g;
    },

    /**
     * প্রশ্নের হ্যাঙ্গিং ইনডেন্ট (Part-15.4, ব্যবহারকারীর নিয়ম): নম্বর ১–৯ → compactIndent (০.২"),
     * ১০+ → indent (০.৩")। প্রতিটি প্রশ্ন আলাদা — হাতে-টাইপ করা প্রশ্নপত্রের মতো।
     * নিয়মের একমাত্র উৎস FayzarLayoutUnits.questionIndent (MCQ-পথও একই নিয়ম নেয়)।
     */
    questionIndent(q, g) {
      const geo = g || this.GEOMETRY;
      if (!geo.compactIndent) return geo.indent;
      const U = layoutUnits();
      if (typeof U.questionIndent === 'function') return U.questionIndent(q && q.num, geo.indent, geo.compactIndent);
      const n = parseInt(String((q && q.num) || '').replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6)), 10);
      return Number.isFinite(n) && n >= 1 && n <= 9 ? Math.min(geo.indent, geo.compactIndent) : geo.indent;
    },

    /** প্রশ্ন-আইটেমের জ্যামিতি — সেকশন-ইনডেন্ট আলাদা হলে indent/subIndent সেই অনুযায়ী (উপ-প্রশ্নের লেবেল স্টেম-লেখার সঙ্গে সোজা) */
    itemGeometry(g, item) {
      if (!item || !item.indent || item.indent === g.indent) return g;
      return Object.assign({}, g, { indent: item.indent, subIndent: item.indent + g.subHanging, textW: g.colW - item.indent, subTextW: g.colW - item.indent - g.subHanging });
    },

    lineH(sz, g) {
      return Math.round((sz / 2) * TWP_PER_PT * (g ? g.lineFactor : this.GEOMETRY.lineFactor));
    },

    // --------------------------------------------------------------- হেডার (৩)
    /**
     * CQ হেডার-ব্লক — যে তথ্য আছে শুধু সেটিই ছাপা হয়। (MCQ-র স্মার্ট প্লেসহোল্ডার
     * নীতি এখানে প্রযোজ্য নয়: Part-11 §৩ সেটি চায়নি, ফলে বিদ্যমান CQ আচরণ অটুট থাকে।)
     */
    buildHeader(header, options) {
      const h = header || {};
      const useFallback = !!(options && options.fallback);
      let prof = this.profile(options && (options.profileKey || options.docType));
      // এক-কলাম প্রোফাইলে হেডারের মাঝের লেবেল মূল ডকটাইপের (সৃজনশীল পত্রে "সৃজনশীল অভীক্ষা" থাকে)
      if (options && options.profileKey === 'EXAM_ONECOL') prof = Object.assign({}, prof, { examTypeLabel: this.profile(options.docType).examTypeLabel });
      const lang = (options && options.lang) || 'bn';
      const FB = this.headerFallback(options && options.docType, lang);
      const LBL = this.HEADER_LABELS[lang] || this.HEADER_LABELS.bn;
      const S = this.HEADER_SIZES;
      const lines = [];
      const value = (key, fallbackKey) => {
        const raw = h[key];
        if (raw !== null && raw !== undefined && String(raw).trim()) {
          return { text: String(raw).trim(), fallbackUsed: false };
        }
        return { text: useFallback ? FB[fallbackKey || key] : '', fallbackUsed: useFallback };
      };
      const add = (kind, field, extra) => {
        if (!field.text) return;
        lines.push(Object.assign({ kind, text: field.text, fallbackUsed: field.fallbackUsed, align: 'center' }, extra || {}));
      };
      const institute = value('institute');
      const location = value('location');
      const exam = value('exam');
      const classSubject = value('classAndSubject');
      const time = value('time');
      const examType = value('examType');
      const marks = value('marks');
      add('institute', institute, { bold: true, sz: S.institute });
      add('location', location, { bold: false, sz: S.location });
      add('exam', exam, { bold: true, sz: S.exam });
      add('classSubject', classSubject, { bold: false, sz: S.classSubject });
      if (useFallback || h.time || h.marks || h.examType || h.institute || h.exam || h.location || h.classAndSubject) {
        // বাস্তব মান থাকলে পুরনো লেবেল/আচরণ অটুট; fallback-এ নির্দিষ্ট CQ লেবেলসহ পূর্ণ লাইন।
        const timeLabel = lang === 'en' ? LBL.time : time.fallbackUsed ?'সময়: ' : 'সময়: ';
        lines.push({
          kind: 'metrics',
          text: time.text ? timeLabel + time.text : '',
          center: examType.text || (!useFallback && lang !== 'en' ? prof.examTypeLabel : ''),
          right: marks.text ? LBL.marks + marks.text : '',
          fallbackUsed: time.fallbackUsed || examType.fallbackUsed || marks.fallbackUsed,
          fallbackFields: { time: time.fallbackUsed, examType: examType.fallbackUsed, marks: marks.fallbackUsed },
          align: 'left', bold: true, sz: S.metrics
        });
      }
      if (h.instructions) {
        const instructions = { text: String(h.instructions).trim(), fallbackUsed: false };
        add('instructions', instructions, { italic: true, sz: S.location });
      }
      return lines;
    },

    /**
     * প্রিভিউ-মডেল: ছাপা হেডার-লাইনগুলো থেকেই ফিল্ডমান — অর্থাৎ প্রিভিউ আর
     * ডাউনলোড একই উৎস থেকে হেডার দেখে (default লেবেলসহ)।
     */
    headerPreviewModel(plan) {
      const m = { institute: '', location: '', exam: '', classAndSubject: '', examType: '', time: '', marks: '', instructions: '' };
      for (const l of ((plan && plan.headerLines) || [])) {
        if (l.kind === 'institute') m.institute = l.text || '';
        else if (l.kind === 'location') m.location = l.text || '';
        else if (l.kind === 'exam') m.exam = l.text || '';
        else if (l.kind === 'classSubject') m.classAndSubject = l.text || '';
        else if (l.kind === 'instructions') m.instructions = l.text || '';
        else if (l.kind === 'metrics') {
          m.examType = l.center || '';
          m.time = String(l.text || '').replace(/^(?:সময়|সময়):\s*/, '');
          m.marks = String(l.right || '').replace(/^(?:পূর্ণমান|Full Marks):\s*/, '');
          m.time = m.time.replace(/^Time:\s*/, '');
        }
      }
      return m;
    },

    headerHeight(headerLines, g, width) {
      if (!headerLines || !headerLines.length) return 0;
      const w = width || g.colW;
      let h = 0;
      for (const l of headerLines) {
        const sz = l.sz || g.baseSz;
        const per = Math.round((sz / 2) * TWP_PER_PT * g.headerLineFactor);
        const n = Math.max(1, lineCount(l.text || l.center || '', sz, w - 240));
        h += per * n;
      }
      return Math.round(h + 120);   // + বর্ডার ডিভাইডার ও তার নিচের ফাঁকা
    },

    // ------------------------------------------------------ প্রশ্নের উচ্চতা (৪–৬)
    measureQuestion(q, sz, g) {
      // প্রশ্নের উচ্চতা রেন্ডারের CSS ratio (১.৩৪) দিয়ে মাপি; lineFactor=১.৫০
      // ছিল অপ্রয়োজনীয় safety inflation, যার ফলে page 2/3-এ আগেভাগে overflow হতো।
      const renderRatio = Number.isFinite(+g.lineRenderCssRatio) ? +g.lineRenderCssRatio : g.lineFactor;
      const lineH = Math.round((sz / 2) * TWP_PER_PT * renderRatio);
      const p = { pre: 0, stem: 0, stimulus: 0, table: 0, subCount: 0, subLines: 0, options: 0, orDivider: 0, total: 0 };

      for (const ln of toLines(q.preContext)) p.pre += lineCount(ln, sz, g.colW);

      const stem = (q.num ? q.num + '। ' : '') + String(q.text || '');
      if (stem.trim()) p.stem = lineCount(stem, sz, g.textW);

      for (const ln of toLines(q.stimulus)) {
        const t = ln.trim();
        if (t.startsWith('|') && t.endsWith('|')) { if (!t.includes('---')) p.table += 1; continue; }
        p.stimulus += lineCount(t, sz, g.colW);
      }

      const stmts = Array.isArray(q.statements) ? q.statements : [];
      for (const s of stmts) p.stimulus += lineCount(s, sz, g.textW);

      const subs = Array.isArray(q.subQuestions) ? q.subQuestions : [];
      for (const sub of subs) {
        if (sub && sub.isAlternative) { p.orDivider += 1; continue; }
        const txt = (sub.label ? sub.label + '. ' : '') + String(sub.text || '');
        // রেন্ডারার এক লাইনে গুঁজে- দেওয়া (খ)/(গ) আলাদা লাইন করে — গণনায়ও তাই
        const extra = (txt.match(/\s*\((?:খ|গ)\)\s*/g) || []).length;
        p.subCount += 1;
        p.subLines += Math.max(1, lineCount(txt, sz, g.subTextW) + extra);
      }

      const opts = Array.isArray(q.options) ? q.options : [];
      if (opts.length) p.options = Math.ceil(opts.length / 2);          // ২-২ করে সারি (Part-9b)
      if (q.alternate || q.orDivider) p.orDivider += 1;

      p.total = p.pre + p.stem + p.stimulus + p.table + p.subLines + p.options + p.orDivider;
      const spacing = (p.stem ? 4 : 0) + p.subCount * 2 + (p.stimulus + p.pre ? 3 : 0) + (p.orDivider ? 4 : 0);
      return { lines: p.total, height: Math.round(p.total * lineH + spacing * 10), parts: p };
    },

    // ------------------------------------------------------------- মূল পরিকল্পনা
    /**
     * @returns plan = {
     *   geometry, font:{sz,pt}, headerLines, headerHeight,
     *   skipFirstColumn:boolean,                 // ব্যাক-কভার কলাম ফাঁকা → কেবল একটি লিডিং ব্রেক
     *   columns:[ { role:'backcover'|'page1'|'page', slot, page, colInPage,
     *               items:[], headerFirst, breakBefore, height, cap } ],
     *   items:[], metrics:{…}
     * }
     * columns[] **ফ্লো-অর্ডারে** (যে ক্রমে RTF/DOCX-তে বসবে)।
     */
    plan(parsedData, options) {
      const o = options || {};
      const docType = o.docType || 'EXAM_CQ';
      // Part-18.9: প্রোফাইল-চাবি (যেমন EXAM_GENERAL + ২য়–৫ম শ্রেণি → EXAM_PRIMARY); ডকটাইপ অপরিবর্তিত
      const profileKey = this.layoutKey(docType, parsedData, o);
      const g = this.geometry(Object.assign({}, o, { profileKey }));
      const lineH = this.lineH(g.baseSz, g);
      // বুকলেট সংযোজন (২): শীট-১-এর ১ম কলাম ব্যাক কভার হিসেবে সংরক্ষিত।
      // o.skipFirstColumn === false → বুকলেট নয়, কলামে ক্রমাগত ফ্লো;
      // o.skipFirstColumn === true  → সংরক্ষিত কলাম অবশ্যই ফাঁকা (টেল-ভরতি বন্ধ)।
      const prof = this.profile(profileKey);
      // বুকলেট নয় এমন প্রোফাইল (EXAM_GENERAL) — কলাম ১ থেকে ক্রমাগত ফ্লো, স্পষ্ট true ছাড়া সংরক্ষণ নেই
      // booklet 'auto' (EXAM_PRIMARY): কলাম গোনার পরে ঠিক হয় — ২ কলামের বেশি হলে তবেই বুকলেট
      let reserve = prof.booklet === true ? o.skipFirstColumn !== false : o.skipFirstColumn === true;
      let backFill = reserve && o.skipFirstColumn !== true;
      const cap = g.capacity;
      // 'page' হেডার পুরো প্রস্থে — প্রথম পৃষ্ঠার সব কলাম থেকেই হেডারের উচ্চতা বাদ যায়
      const fullHeader = prof.headerSpan === 'page';

      const items = [];
      for (const sec of ((parsedData && parsedData.sections) || [])) {
        if (sec && sec.title) items.push({ kind: 'sectionTitle', text: sec.title, height: lineH + 40, lines: 1 });
        for (const q of ((sec && sec.questions) || [])) {
          const m = this.measureQuestion(q, g.baseSz, g);
          const it = { kind: 'question', q, lines: m.lines, height: m.height, parts: m.parts };
          const qIndent = this.questionIndent(q, g);
          if (qIndent !== g.indent) it.indent = qIndent;
          items.push(it);
        }
      }

      const lang = this.paperLang(parsedData);
      const headerLines = this.buildHeader(parsedData && parsedData.header, {
        docType,
        profileKey,
        lang,
        fallback: docType === 'EXAM_CQ' || docType === 'EXAM_MATH' || docType === 'EXAM_GENERAL' || docType === 'EXAM_COMBINED' || o.cqHeaderFallback === true
      });
      const headH = this.headerHeight(headerLines, g, fullHeader ? g.usableW : g.colW);
      const firstPageCap = (idx) => (idx === 0 || (fullHeader && idx < g.cols)) ? Math.max(lineH * 3, cap - headH) : cap;
      const empty = {
        geometry: g, font: { sz: g.baseSz, pt: g.baseSz / 2 }, headerLines, headerHeight: headH, headerSpan: prof.headerSpan, profileKey,
        skipFirstColumn: false, columns: [], items: [],
        metrics: { count: 0, capacity: cap, columnsTotal: 0, docPages: 0, sheets: 0, printedPages: 0, reservedUsed: false, tailMoved: 0, headHeight: headH }
      };
      if (!items.length) return empty;

      // (ক) মূল সিকোয়েন্স: পৃষ্ঠা ১ (হেডারসহ) → পৃষ্ঠা ২ → পৃষ্ঠা ৩ …
      const bins = [{ items: [], left: Math.max(lineH * 3, cap - headH) }];
      let bi = 0;
      for (const it of items) {
        if (bins[bi].left - it.height < 0) {
          // একটি আইটেমও বাকি না থাকলে নতুন কলাম; অনেক বড় আইটেম হলেও নতুন কলামেই বসবে
          bi += 1;
          if (!bins[bi]) bins[bi] = { items: [], left: firstPageCap(bi) };
        }
        bins[bi].items.push(it);
        bins[bi].left -= it.height;
      }
      let used = bins.filter((b) => b.items.length).length;
      const lastNonEmpty = () => { for (let i = bins.length - 1; i >= 0; i--) if (bins[i].items.length) return i; return -1; };
      used = lastNonEmpty() + 1;
      // Part-18.9: 'auto' বুকলেট — এক পাতায় (২ কলাম) ধরলে সাধারণ পাতা; বেশি হলে ভাঁজ-বুকলেট
      if (prof.booklet === 'auto' && o.skipFirstColumn !== false && used > 2) {
        reserve = true;
        backFill = o.skipFirstColumn !== true;
      }

      // (খ) উপচে যাওয়া অংশ ব্যাক-কভারে (শীট-১ কলাম-১) টেনে আনা — যাতে অতিরিক্ত শীট না লাগে
      const back = [];
      let tailMoved = 0;
      // ব্যাক-কভার কেবল চতুর্থ flow-bin (পৃষ্ঠা ৪+) থেকে ভরে; পৃষ্ঠা ১–৩ কখনো সরানো হয় না।
      if (backFill && used >= 4) {
        const last = bins[used - 1];
        let h = 0;
        const movable = [];
        for (const it of last.items) { if (h + it.height > cap) break; movable.push(it); h += it.height; }
        if (movable.length === last.items.length && movable.length > 0) {
          for (const it of movable) back.push(it);
          last.items = [];
          last.left = cap;
          used -= 1;
          tailMoved = movable.length;
        }
      }

      const skipFirstColumn = reserve && !back.length;
      // A reserved blank left cover is a real physical slot: page 1 then starts in column 2.
      const columns = [];
      if (back.length) {
        columns.push({
          role: 'backcover', slot: 0, page: used + 1, colInPage: 1,
          items: back, headerFirst: false, breakBefore: false,
          height: 0, cap
        });
        columns[0].height = back.reduce((a, it) => a + it.height, 0);
        columns[0].cap = cap;
      }
      for (let i = 0; i < used; i++) {
        const flowIdx = columns.length;
        const colCap = firstPageCap(i);
        columns.push({
          role: i === 0 ? 'page1' : 'page',
          slot: i + 1,
          page: i + 1,                       // ছাপা পৃষ্ঠার ক্রম (১ = ফ্রন্ট কভার)
          colInPage: ((flowIdx + (skipFirstColumn ? 1 : 0)) % 2) + 1,
          items: bins[i].items,
          headerFirst: i === 0 && bins[i].items.length > 0,
          breakBefore: false,                // Part-13.4: নিচে ঠিক হবে (প্রাকৃতিক প্রবাহ)
          height: colCap - bins[i].left,
          cap: colCap
        });
      }

      // Part-13.4 (রিপোর্ট-১): MCQ-র মতো প্রাকৃতিক প্রবাহ — mid-flow কৃত্রিম কলাম-ব্রেক বন্ধ।
      // ব্রেক কেবল: (ক) ব্যাক-কভারের পরে flow শুরুর আগে, (খ) skipFirstColumn হলে লিডিং ব্রেক।
      for (const c of columns) c.breakBefore = false;
      const firstFlow = columns.find((c) => c.role === 'page1');
      if (firstFlow) firstFlow.breakBefore = !!(back.length) || skipFirstColumn;
      if (!reserve) for (const c of columns) c.breakBefore = false;   // ক্রমাগত ফ্লো
      const flowColumns = columns.length + (skipFirstColumn ? 1 : 0);
      return {
        geometry: g,
        font: { sz: g.baseSz, pt: g.baseSz / 2 },
        headerLines, headerHeight: headH, headerSpan: prof.headerSpan, profileKey, lang,
        skipFirstColumn,
        columns, items,
        metrics: {
          count: items.length,
          capacity: cap,
          columnsTotal: columns.length,
          printedPages: columns.length + (skipFirstColumn ? 1 : 0),
          docPages: Math.max(1, Math.ceil(flowColumns / 2)),
          sheets: Math.max(1, Math.ceil(flowColumns / 2)),
          reservedUsed: back.length > 0,
          tailMoved,
          headHeight: headH
        }
      };
    },

    // ----------------------------------------------------------- রেন্ডারার-সহায়ক
    /** RTF: কলাম ব্রেক (একটি ছাপা পৃষ্ঠা থেকে পরেরটিতে) */
    rtfColumnBreak() { return '{\\column}\n'; },
    /** DOCX: কলাম ব্রেক */
    docxColumnBreak() { return '<w:p><w:r><w:br w:type="column"/></w:r></w:p>'; },

    rtfTabs(g, opts) {
      const o = opts || {};
      let s = '';
      if (o.afterNum) s += '\\tx' + g.indent;
      if (o.afterSubNum) s += '\\tx' + g.subIndent;
      if (o.rightMark) s += '\\tqr\\tx' + g.rightTab;
      return s;
    },
    docxTabs(g, opts) {
      const o = opts || {};
      const t = [];
      if (o.afterNum) t.push('<w:tab w:val="left" w:pos="' + g.indent + '"/>');
      if (o.afterSubNum) t.push('<w:tab w:val="left" w:pos="' + g.subIndent + '"/>');
      if (o.centerMid) t.push('<w:tab w:val="center" w:pos="' + Math.round(g.rightTab / 2) + '"/>');
      if (o.rightMark) t.push('<w:tab w:val="right" w:pos="' + g.rightTab + '"/>');
      return t.length ? '<w:tabs>' + t.join('') + '</w:tabs>' : '';
    },

    /** RTF পেজ-সেটআপ লাইন (ল্যান্ডস্কেপ ২-কলাম বুকলেট) */
    rtfPageSetup(g) {
      return (g.landscape ? '\\landscape' : '') + '\\paperw' + g.pageW + '\\paperh' + g.pageH +
        '\\margl' + g.margin + '\\margr' + g.margin + '\\margt' + g.margin + '\\margb' + g.margin +
        '\\cols' + g.cols + '\\colsx' + g.colGap + (g.colSep ? '\\linebetcol' : '');
    },
    /** DOCX sectPr (ল্যান্ডস্কেপ ২-কলাম বুকলেট) */
    docxSectPr(g) {
      return '<w:sectPr><w:pgSz w:w="' + g.pageW + '" w:h="' + g.pageH + '"' +
        (g.landscape ? ' w:orient="landscape"' : '') + '/>' +
        '<w:pgMar w:top="' + g.margin + '" w:right="' + g.margin + '" w:bottom="' + g.margin +
        '" w:left="' + g.margin + '" w:header="' + g.margin + '" w:footer="' + g.margin + '" w:gutter="0"/>' +
        '<w:cols w:num="' + g.cols + '" w:space="' + g.colGap + '"' + (g.colSep ? ' w:sep="1"' : '') + '/>' +
        '</w:sectPr>';
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.CqBookletPlanner;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
