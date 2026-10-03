/**
 * Fayzar Bangla Converter — CQ Booklet Master Layout Planner (Part-11)
 * =====================================================================
 * সৃজনশীল (EXAM_CQ) ও কম্বাইন্ড (EXAM_COMBINED) পত্রের **বুকলেট জ্যামিতি** এখানেই
 * ঠিক হয়। এটি নির্ভুল, পাশ্ব-প্রভাবমুক্ত (pure) জ্যামিতি মডেল — কোনো RTF/DOCX/HTML
 * লেখে না, কোনো ইঞ্জিন ডিপেন্ডেন্সি নেই। ইনপুট: parse করা প্রশ্নপত্র + পেজ সেটিংস;
 * আউটপুট: কলাম-ভিত্তিক ছাপার-প্ল্যান (columns[])।
 *
 * তিন রেন্ডারারই (Word 2003 RTF, Modern DOCX, HTML প্রিভিউ) একই প্ল্যান কনজিউম করে
 * → "preview == download" চুক্তি (Part-10) অটুট থাকে।
 *
 * Part-11 চুক্তি (সৃজনশীল মাস্টার লেআউট):
 *  (১) পেজ   : A4 ল্যান্ডস্কেপ (paperw16838 paperh11906), চারদিকে 0.5" মার্জিন
 *  (২) কলাম  : ২ কলাম, মাঝের গ্যাপ 0.7" (1008 twips)। বুকলেট ইম্পোজিশন —
 *             শীট ১-এর ১ম কলাম = ব্যাক কভার (ফাঁকা; উপচে যাওয়া অংশ দিয়ে পূর্ণ),
 *             ২য় কলাম = ফ্রন্ট কভার (হেডার + প্রশ্নের সূচনা); শীট ২ = পৃষ্ঠা ২ ও ৩
 *  (৩) হেডার : ২য় কলামের শীর্ষে একক-কলাম ব্লক — প্রতিষ্ঠান ১৬pt বোল্ড / ঠিকানা ১২pt /
 *             পরীক্ষা ১৩pt বোল্ড / শ্রেণি-বিষয় ১২pt / সময় ↔ (সৃজনশীল অভীক্ষা) ↔ পূর্ণমান
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
   * মডেল ইচ্ছাকৃত রক্ষণশীল — একটু ফাঁকা কলাম, ভাঁজ-ভাঙা/সরকে যাওয়া পৃষ্ঠার চেয়ে শ্রেয়।
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

  /** টেক্সটের প্রস্থ (twips); sz = অর্ধ-পয়েন্ট (24 = 12pt) */
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
    let lines = 1;
    let cur = 0;
    for (const word of s.split(' ')) {
      const w = measure(word + ' ', sz);
      if (cur + w > maxW && cur > 0) { lines++; cur = w; } else { cur += w; }
    }
    return lines;
  }

  function toLines(txt) {
    return String(txt == null ? '' : txt).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
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

  global.CqBookletPlanner = {
    // ------------------------------------------------------------- ধ্রুবক/জ্যামিতি
    GEOMETRY: {
      pageW: 16838,          // A4 ল্যান্ডস্কেপ প্রস্থ
      pageH: 11906,          // A4 ল্যান্ডস্কেপ উচ্চতা
      margin: 720,           // ০.৫" চারদিকে (১)
      cols: 2,
      colGap: 1008,          // ০.৭" ()
      colSep: false,         // বুকলেটে মাঝখানে দৃশ্যমান লাইন নয় (ভাঁজই বিভাজক)
      indent: 432,           // প্রশ্নের হ্যাঙ্গিং ইনডেন্ট ০.৩" (৪)
      subIndent: 864,        // উপ-প্রশ্নের ইনডেন্ট (৬)
      subHanging: 432,
      lineFactor: 1.50,
      headerLineFactor: 1.28,
      // Part-12 (ট্রায়াজ ১): রেন্ডার-রেশিও — RTF/DOCX সব প্যারাগ্রাফে 'single'-এর গুণক
      // (1 = নিজ ফন্টের প্রাকৃতিক লাইন); ১.৫ শুধু ক্যাপাসিটি মডেলের নিরাপত্তা-ধারনা,
      // প্রিভিউর CSS line-height কিন্তু রেন্ডারের সঙ্গে মিলে (1.34 ≈ বাংলা ফন্ট single)।
      lineRenderFactor: 1,
      lineRenderCssRatio: 1.34,
      baseSz: 24,            // ১২pt
      fillRatio: 0.98,       // প্রতি কলামে নিরাপত্তা মার্জিন
      balanceSlack: 0.90     // শেষ পৃষ্ঠার দুই কলাম ব্যালান্সের শর্ত (Part-10 ঙ.৩ থেকে)
    },

    /** হেডার লাইনের সাইজ — ৩ নম্বর ধারা (অর্ধ-পয়েন্ট) */
    HEADER_SIZES: { institute: 32, location: 24, exam: 26, classSubject: 24, metrics: 24 },

    // ------------------------------------------------------------- প্রকাশ্য মাপক
    measure(str, sz) { return measure(str, sz); },
    lineCount(str, sz, availW) { return lineCount(str, sz, availW); },

    geometry(options) {
      const o = options || {};
      const g = Object.assign({}, this.GEOMETRY);
      // Part-12: সব দৈর্ঘ্য U দিয়েই আসে — স্ট্রিং ('normal'), ইঞ্চি, টুইপ, একক-সহ
      // যা-ই আসুক আউটপুট সর্বদা সসীম টুইপ (NaN জ্যামিতিতে ঢোকে না)।
      const U = layoutUnits();
      g.margin = U.margin(o.margin, g.margin);
      g.colGap = U.gap(o.columnGap, g.colGap);
      g.indent = U.indent(o.indent, g.indent);
      g.subIndent = U.indent(o.subIndent, g.subIndent);
      if (o.cols) g.cols = U.count(o.cols, 2, 1, 6);
      if (o.pageWidth) g.pageW = U.count(o.pageWidth, g.pageW, 3000, 40000);
      if (o.pageHeight) g.pageH = U.count(o.pageHeight, g.pageH, 3000, 40000);
      if (o.baseSz) g.baseSz = U.count(o.baseSz, g.baseSz, 12, 96);
      if (o.lineFactor) g.lineFactor = Number.isFinite(parseFloat(o.lineFactor)) ? Math.min(3, Math.max(0.8, parseFloat(o.lineFactor))) : g.lineFactor;
      if (o.headerLineFactor) g.headerLineFactor = Number.isFinite(parseFloat(o.headerLineFactor)) ? Math.min(3, Math.max(0.8, parseFloat(o.headerLineFactor))) : g.headerLineFactor;
      if (o.fillRatio) g.fillRatio = Number.isFinite(parseFloat(o.fillRatio)) ? Math.min(1, Math.max(0.5, parseFloat(o.fillRatio))) : g.fillRatio;
      if (o.colSep !== undefined) g.colSep = !!o.colSep;
      if (o.landscape === false) { const w = g.pageW; g.pageW = g.pageH; g.pageH = w; }

      g.landscape = g.pageW > g.pageH;
      g.usableW = g.pageW - 2 * g.margin;
      g.usableH = g.pageH - 2 * g.margin;
      g.colW = Math.floor((g.usableW - g.colGap * (g.cols - 1)) / g.cols);   // ৭১৯৫
      g.textW = g.colW - g.indent;                                            // ৬৭৬৩
      g.subTextW = g.colW - g.subIndent;                                      // ৬৩৩১
      // rightTab = পুরো কলাম-প্রস্থ (৭১৯০+) পর্যন্ত — তাই indent-এর ৩" ক্যাপ নয়, twips()
      g.rightTab = o.rightTab ? Math.round(U.twips(o.rightTab, g.colW)) : g.colW;   // কলামের ডান প্রান্ত
      g.capacity = Math.round(g.usableH * g.fillRatio);
      // শেষ ডিফেন্স: কোনোভাবেই NaN/Infinity জ্যামিতি থেকে বের হওয়া যাবে না
      ['margin', 'colGap', 'indent', 'subIndent', 'colW', 'textW', 'subTextW', 'rightTab', 'capacity', 'usableW', 'usableH', 'pageW', 'pageH', 'baseSz']
        .forEach((k) => { const n = Number(g[k]); if (!Number.isFinite(n) || n <= 0) g[k] = Math.round(Number.isFinite(this.GEOMETRY[k]) ? this.GEOMETRY[k] : 720); });
      if (g.cols < 1) g.cols = 2;
      return g;
    },

    lineH(sz, g) {
      return Math.round((sz / 2) * TWP_PER_PT * (g ? g.lineFactor : this.GEOMETRY.lineFactor));
    },

    // --------------------------------------------------------------- হেডার (৩)
    /**
     * CQ হেডার-ব্লক — যে তথ্য আছে শুধু সেটিই ছাপা হয়। (MCQ-র স্মার্ট প্লেসহোল্ডার
     * নীতি এখানে প্রযোজ্য নয়: Part-11 §৩ সেটি চায়নি, ফলে বিদ্যমান CQ আচরণ অটুট থাকে।)
     */
    buildHeader(header) {
      const h = header || {};
      const S = this.HEADER_SIZES;
      const lines = [];
      const add = (kind, text, extra) => {
        if (!String(text || '').trim()) return;
        lines.push(Object.assign({ kind, text: String(text).trim(), fallbackUsed: false, align: 'center' }, extra || {}));
      };
      add('institute', h.institute, { bold: true, sz: S.institute });
      add('location', h.location, { bold: false, sz: S.location });
      add('exam', h.exam, { bold: true, sz: S.exam });
      add('classSubject', h.classAndSubject, { bold: false, sz: S.classSubject });
      if (h.time || h.marks || h.examType || h.institute || h.exam) {
        // মাঝের লেবেল: ব্যবহারকারী দিলে সেটি, না দিলে নথি-ধরনের শিরোনাম (৩ নম্বর ধারা)
        lines.push({
          kind: 'metrics',
          text: h.time ? 'সময়: ' + h.time : '',
          center: h.examType || 'সৃজনশীল অভীক্ষা',
          right: h.marks ? 'পূর্ণমান: ' + h.marks : '',
          fallbackUsed: false, align: 'left', bold: true, sz: S.metrics
        });
      }
      if (h.instructions) add('instructions', h.instructions, { italic: true, sz: S.location });
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
          m.time = String(l.text || '').replace(/^সময়:\s*/, '');
          m.marks = String(l.right || '').replace(/^পূর্ণমান:\s*/, '');
        }
      }
      return m;
    },

    headerHeight(headerLines, g) {
      if (!headerLines || !headerLines.length) return 0;
      let h = 0;
      for (const l of headerLines) {
        const sz = l.sz || g.baseSz;
        const per = Math.round((sz / 2) * TWP_PER_PT * g.headerLineFactor);
        const n = Math.max(1, lineCount(l.text || l.center || '', sz, g.colW - 240));
        h += per * n;
      }
      return Math.round(h + 120);   // + বর্ডার ডিভাইডার ও তার নিচের ফাঁকা
    },

    // ------------------------------------------------------ প্রশ্নের উচ্চতা (৪–৬)
    measureQuestion(q, sz, g) {
      const lineH = this.lineH(sz, g);
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
        // রেন্ডারার এক লাইনে গুঁজে- দেওয়া (খ)/(গ) আলাদা লাইন করে — গণনায়ও তাই
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
      const g = this.geometry(o);
      const lineH = this.lineH(g.baseSz, g);
      // বুকলেট সংযোজন (২): শীট-১-এর ১ম কলাম ব্যাক কভার হিসেবে সংরক্ষিত।
      // o.skipFirstColumn === false → বুকলেট নয়, কলামে ক্রমাগত ফ্লো;
      // o.skipFirstColumn === true  → সংরক্ষিত কলাম অবশ্যই ফাঁকা (টেল-ভরতি বন্ধ)।
      const reserve = o.skipFirstColumn !== false;
      const backFill = reserve && o.skipFirstColumn !== true;
      const cap = g.capacity;

      const items = [];
      for (const sec of ((parsedData && parsedData.sections) || [])) {
        if (sec && sec.title) items.push({ kind: 'sectionTitle', text: sec.title, height: lineH + 40, lines: 1 });
        for (const q of ((sec && sec.questions) || [])) {
          const m = this.measureQuestion(q, g.baseSz, g);
          items.push({ kind: 'question', q, lines: m.lines, height: m.height, parts: m.parts });
        }
      }

      const headerLines = this.buildHeader(parsedData && parsedData.header);
      const headH = this.headerHeight(headerLines, g);
      const empty = {
        geometry: g, font: { sz: g.baseSz, pt: g.baseSz / 2 }, headerLines, headerHeight: headH,
        skipFirstColumn: false, columns: [], items: [],
        metrics: { count: 0, capacity: cap, columnsTotal: 0, docPages: 0, sheets: 0, printedPages: 0, reservedUsed: false, tailMoved: 0, headHeight: headH }
      };
      if (!items.length) return empty;

      // (ক) মূল সিকোয়েন্স: পৃষ্ঠা ১ (হেডারসহ) → পৃষ্ঠা ২ → পৃষ্ঠা ৩ …
      const bins = [{ items: [], left: Math.max(lineH * 3, cap - headH) }];
      let bi = 0;
      for (const it of items) {
        if (bins[bi].left - it.height < 0) {
          // একটি আইটেমও বাকি না থাকলে নতুন কলাম; অনেক বড় আইটেম হলেও নতুন কলামেই বসবে
          bi += 1;
          if (!bins[bi]) bins[bi] = { items: [], left: cap };
        }
        bins[bi].items.push(it);
        bins[bi].left -= it.height;
      }
      let used = bins.filter((b) => b.items.length).length;
      const lastNonEmpty = () => { for (let i = bins.length - 1; i >= 0; i--) if (bins[i].items.length) return i; return -1; };
      used = lastNonEmpty() + 1;

      // (খ) উপচে যাওয়া অংশ ব্যাক-কভারে (শীট-১ কলাম-১) টেনে আনা — যাতে অতিরিক্ত শীট না লাগে
      const back = [];
      let tailMoved = 0;
      if (backFill && used >= 3) {
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
        const colCap = i === 0 ? Math.max(lineH * 3, cap - headH) : cap;
        columns.push({
          role: i === 0 ? 'page1' : 'page',
          slot: i + 1,
          page: i + 1,                       // ছাপা পৃষ্ঠার ক্রম (১ = ফ্রন্ট কভার)
          colInPage: (flowIdx % 2) + 1,
          items: bins[i].items,
          headerFirst: i === 0,
          breakBefore: flowIdx > 0,          // প্রতিটি কলামই একটি ছাপা পৃষ্ঠা → নির্দিষ্ট ব্রেক
          height: colCap - bins[i].left,
          cap: colCap
        });
      }

      const skipFirstColumn = reserve && !back.length;
      if (!reserve) for (const c of columns) c.breakBefore = false;   // ক্রমাগত ফ্লো — জোরি কলাম-ব্রেক বসবে না
      const flowColumns = columns.length + (skipFirstColumn ? 1 : 0);
      return {
        geometry: g,
        font: { sz: g.baseSz, pt: g.baseSz / 2 },
        headerLines, headerHeight: headH,
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

    // ----------------------------------------------------------- রেন্ডারার-সহায়ক
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
      return '\\landscape\\paperw' + g.pageW + '\\paperh' + g.pageH +
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
