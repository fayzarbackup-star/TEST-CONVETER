/**
 * ফয়জার এআই কম্পোজ — ফলাফল-পাতায় লেআউট/সেটিং বদল ও "ঠিক হয়নি?" (D_RELAYOUT_v5: D1–D4)
 * =========================================================================================
 * OCR-এর পরে ফলাফল-পাতায় আবার OCR না করেই সেশনের Markdown থেকে:
 *   D1: "শনাক্ত: <লেআউটের বাংলা নাম> [বদলান]" — ড্রপডাউনে সব লেআউট (ArchetypeMap থেকে);
 *       বাছলে ফ্রন্টম্যাটারে layout_lock/doc_type বসিয়ে সেশনের Markdown থেকে আবার রপ্তানি।
 *   D2: সেটিং প্যানেল — কলাম ১/২, পাতা A4/Legal/Letter, লম্বালম্বি/আড়াআড়ি, বুকলেট হ্যাঁ/না,
 *       ফন্ট-সাইজ → FayzarExport.produce-এর অপশনে।
 *   D3: "ঠিক হয়নি?" বোতাম — ① সাজানো ভুল → D1/D2 খোলে; ② লেখা বাদ/ভুল → কারণ লিখে
 *       ব্যবহারকারী নিশ্চিত করলে তবেই বিশেষ প্রম্পটে আবার OCR (requestReOcr হুক)।
 *   D4: খতিয়ান — প্রতিটি বদল localStorage 'fz_relayout_log'-এ ("শনাক্ত X → বাছাই Y",
 *       সময়, ফাইল-হ্যাশ নয়, শুধু মেটা) — try/catch-এ।
 *
 * সুইচ: window.__FZ_ON_RELAYOUT চালু থাকলেই কেবল সক্রিয় হয়।
 */
(function (global) {
  'use strict';

  const LOG_KEY = 'fz_relayout_log';
  const MAX_LOGS = 100;

  // ArchetypeMap লোড না থাকলে ফলব্যাক তালিকা (js/layout-engine/archetype-map.js-এর হুবহু)
  const DEFAULT_ARCHETYPE_TO_DOCTYPE = {
    'bengali_combined_exam_paper': 'EXAM_COMBINED',
    'bengali_cq_paper': 'EXAM_CQ',
    'bengali_mcq_paper': 'EXAM_MCQ',
    'bengali_standard_question_paper': 'EXAM_GENERAL',
    'english_question_paper': 'EXAM_GENERAL',
    'math_science_paper': 'EXAM_MATH',
    'govt_application': 'GOVT_APP',
    'legal_deed_contract': 'STAMP_DEED',
    'testimonial_cert': 'PROTTOYON',
    'office_pad': 'OFFICE_PAD',
    'official_notice_memo': 'OFFICIAL_NOTICE',
    'salary_slip': 'SALARY_SLIP',
    'admit_card': 'ADMIT_CARD',
    'class_routine': 'ROUTINE',
    'bengali_general_doc': 'GENERAL',
    'single_column_standard_document': 'GENERAL'
  };

  // প্রতিটি আর্কেটাইপের বাংলা নাম
  const ARCHETYPE_LABELS = {
    'bengali_combined_exam_paper': 'সৃজনশীল + বহুনির্বাচনি প্রশ্নপত্র',
    'bengali_cq_paper': 'সৃজনশীল প্রশ্নপত্র',
    'bengali_mcq_paper': 'বহুনির্বাচনি (MCQ) প্রশ্নপত্র',
    'bengali_standard_question_paper': 'সাধারণ প্রশ্নপত্র (বাংলা)',
    'english_question_paper': 'ইংরেজি প্রশ্নপত্র',
    'math_science_paper': 'গণিত ও বিজ্ঞান প্রশ্নপত্র',
    'govt_application': 'সরকারি/সাধারণ আবেদনপত্র',
    'legal_deed_contract': 'দলিল ও চুক্তিপত্র',
    'testimonial_cert': 'প্রত্যয়নপত্র / সনদ',
    'office_pad': 'অফিস প্যাড / চিঠি',
    'official_notice_memo': 'বিজ্ঞপ্তি / নোটিশ / স্মারক',
    'salary_slip': 'বেতন রসিদ (স্যালারি স্লিপ)',
    'admit_card': 'প্রবেশপত্র (অ্যাডমিট কার্ড)',
    'class_routine': 'ক্লাস রুটিন',
    'bengali_general_doc': 'সাধারণ বাংলা নথি',
    'single_column_standard_document': 'এক কলামের সাধারণ নথি'
  };

  // প্রতিটি DOC_TYPE-এর বাংলা নাম
  const DOCTYPE_LABELS = {
    'EXAM_COMBINED': 'সৃজনশীল + বহুনির্বাচনি প্রশ্নপত্র',
    'EXAM_CQ': 'সৃজনশীল প্রশ্নপত্র',
    'EXAM_MCQ': 'বহুনির্বাচনি (MCQ) প্রশ্নপত্র',
    'EXAM_GENERAL': 'সাধারণ প্রশ্নপত্র',
    'EXAM_MATH': 'গণিত ও বিজ্ঞান প্রশ্নপত্র',
    'GOVT_APP': 'সরকারি/সাধারণ আবেদনপত্র',
    'STAMP_DEED': 'দলিল ও চুক্তিপত্র',
    'PROTTOYON': 'প্রত্যয়নপত্র / সনদ',
    'OFFICE_PAD': 'অফিস প্যাড / চিঠি',
    'OFFICIAL_NOTICE': 'বিজ্ঞপ্তি / নোটিশ / স্মারক',
    'SALARY_SLIP': 'বেতন রসিদ (স্যালারি স্লিপ)',
    'ADMIT_CARD': 'প্রবেশপত্র (অ্যাডমিট কার্ড)',
    'ROUTINE': 'ক্লাস রুটিন',
    'GENERAL': 'সাধারণ বাংলা নথি',
    'CASH_MEMO': 'ক্যাশমেমো / রসিদ',
    'CV_RESUME': 'জীবনবৃত্তান্ত (CV)'
  };

  // ডিফল্ট সেটিংস (D2)
  const DEFAULT_SETTINGS = {
    columns: 1,
    pageSize: 'a4',
    orientation: 'portrait',
    booklet: false,
    fontSize: 11
  };

  // মেমরি ফলব্যাক (যদি ব্রাউজারে localStorage না থাকে বা বন্ধ থাকে)
  let memoryLogs = [];

  // বর্তমান সেশনের অবস্থা
  let state = {
    detectedLayout: 'GENERAL',
    selectedLayout: '',
    settings: Object.assign({}, DEFAULT_SETTINGS),
    customized: false,
    lastBlob: null,
    lastFormat: 'doc',
    hooks: null,
    reOcrHandler: null
  };

  /** __FZ_ON_RELAYOUT সুইচ চালু আছে কি না যাচাই */
  function isEnabled() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_RELAYOUT)) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_RELAYOUT)) return true;
    if (global && Boolean(global.__FZ_ON_RELAYOUT)) return true;
    if (
      typeof process !== 'undefined' &&
      process &&
      process.env &&
      (process.env.__FZ_ON_RELAYOUT === '1' || process.env.__FZ_ON_RELAYOUT === 'true')
    ) {
      return true;
    }
    return false;
  }

  /** বাংলা সংখ্যাকে ইংরেজি সংখ্যায় রূপান্তর */
  function fromBnDigits(s) {
    return String(s == null ? '' : s).replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
  }

  /** ইংরেজি সংখ্যাকে বাংলা সংখ্যায় রূপান্তর */
  function toBnDigits(n) {
    return String(n == null ? '' : n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
  }

  /** গ্লোবাল ArchetypeMap খুঁজে বের করা */
  function getArchetypeMapObj(customMap) {
    if (customMap && typeof customMap === 'object') {
      return customMap.ARCHETYPE_TO_DOCTYPE || customMap;
    }
    const am =
      (typeof globalThis !== 'undefined' && globalThis.ArchetypeMap) ||
      (typeof window !== 'undefined' && window.ArchetypeMap) ||
      (global && global.ArchetypeMap);
    if (am && am.ARCHETYPE_TO_DOCTYPE) return am.ARCHETYPE_TO_DOCTYPE;
    return DEFAULT_ARCHETYPE_TO_DOCTYPE;
  }

  /** আর্কেটাইপ বা doc_type থেকে চূড়ান্ত DOC_TYPE নির্ণয় */
  function resolveDocType(idOrDocType, customMap) {
    if (!idOrDocType) return 'GENERAL';
    const key = String(idOrDocType).trim();
    const map = getArchetypeMapObj(customMap);
    const am =
      (typeof globalThis !== 'undefined' && globalThis.ArchetypeMap) ||
      (typeof window !== 'undefined' && window.ArchetypeMap) ||
      (global && global.ArchetypeMap);
    if (am && typeof am.toDocType === 'function' && Object.prototype.hasOwnProperty.call(map, key)) {
      return am.toDocType(key);
    }
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key];
    }
    const upper = key.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(DOCTYPE_LABELS, upper)) {
      return upper;
    }
    const values = Object.values(map);
    if (values.indexOf(upper) !== -1) return upper;
    return 'GENERAL';
  }

  /** যেকোনো আর্কেটাইপ বা DOC_TYPE-এর বাংলা নাম */
  function getBanglaLabel(idOrDocType) {
    if (!idOrDocType) return DOCTYPE_LABELS.GENERAL;
    const key = String(idOrDocType).trim();
    if (Object.prototype.hasOwnProperty.call(ARCHETYPE_LABELS, key)) {
      return ARCHETYPE_LABELS[key];
    }
    const upper = key.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(DOCTYPE_LABELS, upper)) {
      return DOCTYPE_LABELS[upper];
    }
    const dt = resolveDocType(key);
    return DOCTYPE_LABELS[dt] || key;
  }

  /**
   * D1: ড্রপডাউনের জন্য সব লেআউট অপশন তৈরি (js/layout-engine/archetype-map.js থেকে)
   * @param {object} [customMap] ঐচ্ছিক আর্কেটাইপ ম্যাপ
   * @returns {Array<{ id: string, archetype: string, docType: string, label: string }>}
   */
  function getLayoutOptions(customMap) {
    const map = getArchetypeMapObj(customMap);
    return Object.keys(map).map((archetype) => {
      const docType = map[archetype];
      return {
        id: archetype,
        archetype,
        docType,
        label: ARCHETYPE_LABELS[archetype] || DOCTYPE_LABELS[docType] || archetype
      };
    });
  }

  /**
   * মার্কডাউনের ফ্রন্টম্যাটার ও বডি আলাদা করা
   * @param {string} md
   */
  function parseFrontmatter(md) {
    const src = String(md == null ? '' : md).replace(/\r\n?/g, '\n');
    const m = src.match(/^\uFEFF?---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
    if (!m) {
      return { hasFrontmatter: false, rawFrontmatter: '', fields: {}, lines: [], body: src };
    }
    const rawFrontmatter = m[1];
    const body = src.slice(m[0].length);
    const lines = rawFrontmatter.split('\n');
    const fields = {};
    lines.forEach((line) => {
      const kv = line.match(/^\s*([A-Za-z0-9_.-]+)\s*:\s*(.*?)\s*$/);
      if (kv) fields[kv[1].toLowerCase()] = kv[2];
    });
    return { hasFrontmatter: true, rawFrontmatter, fields, lines, body };
  }

  /**
   * বর্তমান মার্কডাউন থেকে শনাক্তকৃত লেআউট বের করা
   * @param {string} md
   * @param {object} [classifier] ঐচ্ছিক DocClassifier
   */
  function detectLayout(md, classifier) {
    const parsed = parseFrontmatter(md);
    const f = parsed.fields;
    const rawArch = f.archetype || '';
    const rawDocType = f.doc_type || f.type || f.layout || '';
    const map = getArchetypeMapObj();

    if (rawArch && Object.prototype.hasOwnProperty.call(map, rawArch)) {
      const dt = resolveDocType(rawArch, map);
      return { archetype: rawArch, docType: dt, label: getBanglaLabel(rawArch) };
    }
    if (rawDocType) {
      if (Object.prototype.hasOwnProperty.call(map, rawDocType)) {
        const dt = resolveDocType(rawDocType, map);
        return { archetype: rawDocType, docType: dt, label: getBanglaLabel(rawDocType) };
      }
      const dt = resolveDocType(rawDocType, map);
      const matchedArch = Object.keys(map).find((k) => map[k] === dt) || 'bengali_general_doc';
      return { archetype: matchedArch, docType: dt, label: getBanglaLabel(dt) };
    }

    const dc =
      classifier ||
      (typeof globalThis !== 'undefined' && globalThis.DocClassifier) ||
      (typeof window !== 'undefined' && window.DocClassifier) ||
      (global && global.DocClassifier);
    if (dc && typeof dc.classify === 'function') {
      try {
        const cls = dc.classify(String(md || ''));
        if (cls && cls.type) {
          const dt = resolveDocType(cls.type, map);
          const matchedArch = Object.keys(map).find((k) => map[k] === dt) || 'bengali_general_doc';
          return { archetype: matchedArch, docType: dt, label: getBanglaLabel(dt) };
        }
      } catch (e) { /* নীরব */ }
    }

    return {
      archetype: 'bengali_general_doc',
      docType: 'GENERAL',
      label: getBanglaLabel('GENERAL')
    };
  }

  /**
   * D2 সেটিংস স্বাভাবিকীকরণ (কলাম ১/২, পাতা A4/Legal/Letter, লম্বালম্বি/আড়াআড়ি, বুকলেট হ্যাঁ/না, ফন্ট-সাইজ)
   * @param {object} [raw]
   */
  function normalizeSettings(raw) {
    const s = Object.assign({}, DEFAULT_SETTINGS, raw || {});

    // কলাম: ১ বা ২
    const colStr = fromBnDigits(s.columns).trim();
    const columns = colStr === '2' ? 2 : 1;

    // পাতা: A4 / Legal / Letter
    const psRaw = String(s.pageSize || 'a4').trim().toLowerCase();
    const pageSize = psRaw === 'legal' ? 'legal' : (psRaw === 'letter' ? 'letter' : 'a4');
    const pageSizeLabel = pageSize === 'legal' ? 'Legal' : (pageSize === 'letter' ? 'Letter' : 'A4');

    // লম্বালম্বি (portrait) / আড়াআড়ি (landscape)
    const orRaw = String(s.orientation || s.pageOrientation || 'portrait').trim().toLowerCase();
    const isLandscape =
      orRaw === 'landscape' ||
      orRaw === 'আড়াআড়ি' ||
      orRaw === 'আরারি' ||
      orRaw === 'horizontal' ||
      s.landscape === true;
    const orientation = isLandscape ? 'landscape' : 'portrait';
    const orientationLabel = isLandscape ? 'আড়াআড়ি' : 'লম্বালম্বি';

    // বুকলেট: হ্যাঁ (true) / না (false)
    let booklet = false;
    if (typeof s.booklet === 'boolean') {
      booklet = s.booklet;
    } else if (s.booklet != null) {
      const bkRaw = String(s.booklet).trim().toLowerCase();
      booklet = bkRaw === 'true' || bkRaw === '1' || bkRaw === 'yes' || bkRaw === 'হ্যাঁ';
    }
    const bookletLabel = booklet ? 'হ্যাঁ' : 'না';

    // ফন্ট-সাইজ
    const fsNum = parseFloat(fromBnDigits(s.fontSize));
    const fontSize = !isNaN(fsNum) && fsNum >= 6 && fsNum <= 36 ? fsNum : DEFAULT_SETTINGS.fontSize;

    return {
      columns,
      pageSize,
      pageSizeLabel,
      orientation,
      orientationLabel,
      booklet,
      bookletLabel,
      fontSize
    };
  }

  /**
   * D2: সেটিংস থেকে FayzarExport.produce-এর অপশন তৈরি
   * @param {object} [settings]
   * @param {object} [extra] { format, docType, layout, figures, margin, ... }
   */
  function buildExportOptions(settings, extra) {
    const norm = normalizeSettings(settings);
    const ex = Object.assign({}, extra || {});
    const chosenLayout = ex.layout || ex.archetype || ex.docType || (settings && (settings.layout || settings.docType)) || state.selectedLayout || state.detectedLayout || 'GENERAL';
    const docType = resolveDocType(chosenLayout);
    const format = ex.format || 'doc';

    const fm = {
      doc_type: docType,
      layout_lock: true,
      columns: norm.columns,
      page_size: norm.pageSize,
      page_orientation: norm.orientation,
      booklet: norm.booklet,
      font_size: norm.fontSize
    };
    if (Object.prototype.hasOwnProperty.call(getArchetypeMapObj(), String(chosenLayout))) {
      fm.archetype = String(chosenLayout);
    }

    const out = {
      format,
      docType,
      columns: norm.columns,
      pageSize: norm.pageSize,
      pageSizeLabel: norm.pageSizeLabel,
      orientation: norm.orientation,
      pageOrientation: norm.orientation,
      landscape: norm.orientation === 'landscape',
      booklet: norm.booklet,
      isBooklet: norm.booklet,
      fontSize: norm.fontSize,
      margin: ex.margin || (settings && settings.margin) || 'normal',
      __frontmatter: fm
    };
    if (ex.figures) out.figures = ex.figures;
    if (ex.masterDocx) out.masterDocx = ex.masterDocx;
    return out;
  }

  /**
   * D1: মার্কডাউনের ফ্রন্টম্যাটারে layout_lock ও doc_type (এবং ঐচ্ছিক সেটিংস) বসানো
   * @param {string} md মূল মার্কডাউন
   * @param {string} layoutIdOrDocType বাছাইকৃত আর্কেটাইপ বা doc_type
   * @param {object} [settings] ঐচ্ছিক D2 সেটিংস
   * @returns {string} ফ্রন্টম্যাটারসহ আপডেটকৃত মার্কডাউন
   */
  function applyFrontmatter(md, layoutIdOrDocType, settings) {
    const parsed = parseFrontmatter(md);
    const map = getArchetypeMapObj();
    const key = String(layoutIdOrDocType || 'GENERAL').trim();
    const docType = resolveDocType(key, map);
    const isArchetype = Object.prototype.hasOwnProperty.call(map, key);

    const lockedKeys = [
      'doc_type',
      'type',
      'layout',
      'layout_lock',
      'archetype'
    ];
    const head = [
      `doc_type: ${docType}`,
      'layout_lock: true'
    ];
    if (isArchetype) {
      head.push(`archetype: ${key}`);
    }

    if (settings && typeof settings === 'object') {
      const norm = normalizeSettings(settings);
      lockedKeys.push('columns', 'page_size', 'page_orientation', 'orientation', 'booklet', 'font_size');
      head.push(`columns: ${norm.columns}`);
      head.push(`page_size: ${norm.pageSize}`);
      head.push(`page_orientation: ${norm.orientation}`);
      head.push(`booklet: ${norm.booklet}`);
      head.push(`font_size: ${norm.fontSize}`);
    }

    const lockRegex = new RegExp('^\\s*(' + lockedKeys.join('|') + ')\\s*:', 'i');
    const keptLines = parsed.lines.filter((line) => line.trim() && !lockRegex.test(line));
    const cleanBody = parsed.body.replace(/^\n+/, '');
    return '---\n' + head.concat(keptLines).join('\n') + '\n---\n' + cleanBody;
  }

  /**
   * D4: মেটাডেটা থেকে ফাইল-হ্যাশ বা সংবেদনশীল/বড় ফাইল-তথ্য বাদ দেওয়া (শুধু মেটা রাখা)
   * @param {object} [meta]
   */
  function sanitizeMeta(meta) {
    if (!meta || typeof meta !== 'object') return {};
    const FORBIDDEN = /^(file_?hash|hash|sha1|sha256|md5|checksum|file|files|blob|base64|text|markdown|content|raw|buffer|filename|file_name)$/i;
    const clean = {};
    Object.keys(meta).forEach((k) => {
      if (FORBIDDEN.test(k)) return;
      const val = meta[k];
      if (val == null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        clean[k] = val;
      } else if (typeof val === 'object' && !Array.isArray(val)) {
        clean[k] = sanitizeMeta(val);
      }
    });
    return clean;
  }

  /** localStorage থেকে নিরাপদে লগ পড়া (try/catch-এ) */
  function getLogs() {
    try {
      const ls = (typeof globalThis !== 'undefined' && globalThis.localStorage) ||
                 (typeof window !== 'undefined' && window.localStorage) ||
                 (global && global.localStorage);
      if (ls && typeof ls.getItem === 'function') {
        const raw = ls.getItem(LOG_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) { /* নীরব */ }
    return memoryLogs.slice();
  }

  /**
   * D4: প্রতিটি বদল localStorage 'fz_relayout_log'-এ সংরক্ষণ ("শনাক্ত X → বাছাই Y", সময়, শুধু মেটা)
   * @param {string|object} fromLayout শনাক্তকৃত লেআউট বা অপশন অবজেক্ট
   * @param {string} [toLayout] বাছাইকৃত লেআউট
   * @param {object} [meta] অতিরিক্ত মেটা (ফাইল-হ্যাশ ছাড়া)
   */
  function recordLog(fromLayout, toLayout, meta) {
    let fromVal = fromLayout;
    let toVal = toLayout;
    let metaObj = meta;

    if (fromLayout && typeof fromLayout === 'object' && !Array.isArray(fromLayout)) {
      fromVal = fromLayout.from || fromLayout.detected || 'GENERAL';
      toVal = fromLayout.to || fromLayout.selected || 'GENERAL';
      metaObj = fromLayout.meta || fromLayout.settings || fromLayout;
    }

    const fromKey = String(fromVal || 'GENERAL').trim();
    const toKey = String(toVal || 'GENERAL').trim();
    const fromLabel = getBanglaLabel(fromKey);
    const toLabel = getBanglaLabel(toKey);
    const now = Date.now();

    const entry = {
      transition: `শনাক্ত ${fromLabel} → বাছাই ${toLabel}`,
      codeTransition: `শনাক্ত ${fromKey} → বাছাই ${toKey}`,
      from: fromKey,
      to: toKey,
      fromLabel,
      toLabel,
      at: now,
      time: new Date(now).toISOString(),
      meta: sanitizeMeta(metaObj)
    };

    try {
      const list = getLogs();
      list.push(entry);
      const trimmed = list.length > MAX_LOGS ? list.slice(list.length - MAX_LOGS) : list;
      memoryLogs = trimmed;
      const ls = (typeof globalThis !== 'undefined' && globalThis.localStorage) ||
                 (typeof window !== 'undefined' && window.localStorage) ||
                 (global && global.localStorage);
      if (ls && typeof ls.setItem === 'function') {
        ls.setItem(LOG_KEY, JSON.stringify(trimmed));
      }
    } catch (e) {
      // localStorage বন্ধ বা কোটা পূর্ণ হলেও অ্যাপ থামবে না
      try { memoryLogs.push(entry); } catch (e2) { /* নীরব */ }
    }
    return entry;
  }

  /** খতিয়ান মুছে ফেলা (টেস্ট ও রিসেটের জন্য) */
  function clearLogs() {
    memoryLogs = [];
    try {
      const ls = (typeof globalThis !== 'undefined' && globalThis.localStorage) ||
                 (typeof window !== 'undefined' && window.localStorage) ||
                 (global && global.localStorage);
      if (ls && typeof ls.removeItem === 'function') {
        ls.removeItem(LOG_KEY);
      }
    } catch (e) { /* নীরব */ }
  }

  /**
   * সেশন থেকে বর্তমান মার্কডাউন আনা (OCR ছাড়াই)
   */
  async function getSessionMarkdown() {
    if (state.hooks && typeof state.hooks.getText === 'function') {
      const txt = state.hooks.getText();
      if (txt && String(txt).trim()) return String(txt);
    }
    if (typeof document !== 'undefined') {
      const el = document.getElementById('wizardPreviewContent');
      if (el && el.value && el.value.trim()) return el.value;
    }
    const eng = (typeof window !== 'undefined' && window.FayzarAiOcrEngine) || (global && global.FayzarAiOcrEngine);
    if (eng && eng.state && eng.state.unicodeText && String(eng.state.unicodeText).trim()) {
      return String(eng.state.unicodeText);
    }
    const sess = (typeof window !== 'undefined' && window.FayzarSession) || (global && global.FayzarSession);
    if (sess && typeof sess.load === 'function') {
      try {
        const rec = await sess.load();
        if (rec && rec.text && String(rec.text).trim()) return String(rec.text);
      } catch (e) { /* নীরব */ }
    }
    return '';
  }

  /**
   * D1 ও D2: সেশনের Markdown থেকে নতুন লেআউট/সেটিংসে আবার রপ্তানি (OCR নয়, <৫ সেকেন্ড)
   * @param {object} [opts] { layout, settings, format, markdown, exporter, autoDownload }
   */
  async function reExport(opts) {
    const o = Object.assign({}, opts || {});
    const t0 = Date.now();
    const prevLayout = state.selectedLayout || state.detectedLayout || 'GENERAL';
    const nextLayout = o.layout || state.selectedLayout || state.detectedLayout || 'GENERAL';
    const nextSettings = normalizeSettings(o.settings || state.settings);

    state.selectedLayout = nextLayout;
    state.settings = nextSettings;
    state.customized = true;

    const rawMd = o.markdown != null ? String(o.markdown) : await getSessionMarkdown();
    if (!rawMd.trim()) {
      throw new Error('সেশনে কোনো মার্কডাউন লেখা পাওয়া যায়নি');
    }

    // ফ্রন্টম্যাটারে layout_lock ও doc_type বসানো
    const updatedMd = applyFrontmatter(rawMd, nextLayout, nextSettings);

    // সেশন ও প্রিভিউ আপডেট (OCR ছাড়াই)
    if (state.hooks && typeof state.hooks.setText === 'function') {
      state.hooks.setText(updatedMd);
    } else if (typeof document !== 'undefined') {
      const el = document.getElementById('wizardPreviewContent');
      if (el) el.value = updatedMd;
    }
    const eng = (typeof window !== 'undefined' && window.FayzarAiOcrEngine) || (global && global.FayzarAiOcrEngine);
    if (eng && eng.state) {
      eng.state.unicodeText = updatedMd;
      eng.state.layoutColumns = nextSettings.columns;
    }

    // রপ্তানি অপশন তৈরি
    const format = o.format || state.lastFormat || 'doc';
    const exportOpts = buildExportOptions(nextSettings, {
      format,
      layout: nextLayout
    });

    // চিত্র থাকলে প্রস্তুত করা
    let bodyToExport = updatedMd;
    if (eng && typeof eng.prepareSourceFigures === 'function' && !o.skipFigures) {
      try {
        const prep = await eng.prepareSourceFigures(updatedMd, exportOpts.docType);
        if (prep && !prep.cancelled) {
          bodyToExport = prep.text || updatedMd;
          if (prep.figures) exportOpts.figures = prep.figures;
        }
      } catch (e) { /* নীরব */ }
    }

    const exporter =
      o.exporter ||
      (typeof globalThis !== 'undefined' && globalThis.FayzarExport) ||
      (typeof window !== 'undefined' && window.FayzarExport) ||
      (global && global.FayzarExport);

    let result = null;
    if (exporter && typeof exporter.produce === 'function') {
      result = await exporter.produce(bodyToExport, exportOpts);
      state.lastBlob = result && result.blob;
      state.lastFormat = format;
    }

    const elapsedMs = Date.now() - t0;

    // D4: খতিয়ানে রেকর্ড করা
    const logEntry = recordLog(prevLayout, nextLayout, {
      columns: nextSettings.columns,
      pageSize: nextSettings.pageSize,
      orientation: nextSettings.orientation,
      booklet: nextSettings.booklet,
      fontSize: nextSettings.fontSize,
      format,
      durationMs: elapsedMs
    });

    if (o.autoDownload && result && result.blob && state.hooks && typeof state.hooks.saveBlob === 'function') {
      const base = (state.hooks.baseName && state.hooks.baseName()) || 'Document';
      const ext = format === 'doc' ? '_Word2003.doc' : (format === 'docx-bijoy' ? '_Bijoy.docx' : '_Unicode.docx');
      state.hooks.saveBlob(result.blob, base + ext);
    }

    return {
      ok: true,
      markdown: updatedMd,
      options: exportOpts,
      result,
      log: logEntry,
      durationMs: elapsedMs
    };
  }

  /**
   * ডাউনলোড বোতাম থেকে কাস্টম লেআউট/সেটিংসে ফাইল নামানো
   * @param {string} format 'doc' | 'docx-bijoy' | 'docx-unicode'
   */
  async function download(format) {
    const fmt = format || 'doc';
    if (state.hooks && typeof state.hooks.toast === 'function') {
      state.hooks.toast('নতুন লেআউট ও সেটিংসে ফাইল প্রস্তুত হচ্ছে…', 'info');
    }
    return reExport({ format: fmt, autoDownload: true });
  }

  /** D3: আবার OCR-এর জন্য বিশেষ প্রম্পট তৈরি */
  function buildReOcrPrompt(reason) {
    const cleanReason = String(reason == null ? '' : reason).trim();
    if (!cleanReason) return '';
    return `বিশেষ সংশোধন নির্দেশনা (আগের OCR-এ সমস্যা: ${cleanReason}) — কোনো লেখা বাদ দেবেন না এবং উল্লিখিত অংশ নিখুঁতভাবে পড়ুন।`;
  }

  /** D3: বাইরে থেকে re-OCR হ্যান্ডলার নিবন্ধন */
  function setReOcrHandler(fn) {
    state.reOcrHandler = typeof fn === 'function' ? fn : null;
  }

  /**
   * D3: "ঠিক হয়নি?" → ② লেখা বাদ/ভুল → কারণসহ নিশ্চিত করলে বিশেষ প্রম্পটে আবার OCR
   * @param {string} reason ব্যবহারকারীর লেখা কারণ
   * @param {object} [opts] { confirmed: boolean }
   */
  async function requestReOcr(reason, opts) {
    const cleanReason = String(reason == null ? '' : reason).trim();
    if (!cleanReason) {
      return { ok: false, error: 'অনুগ্রহ করে সমস্যার কারণ লিখুন' };
    }
    if (opts && opts.confirmed === false) {
      return { ok: false, cancelled: true, error: 'ব্যবহারকারী নিশ্চিত করেননি' };
    }

    const prompt = buildReOcrPrompt(cleanReason);
    recordLog(state.detectedLayout || 'GENERAL', 'RE_OCR', {
      action: 're_ocr',
      reasonLength: cleanReason.length
    });

    const handler =
      state.reOcrHandler ||
      (state.hooks && state.hooks.reOcr);

    if (typeof handler === 'function') {
      await handler(prompt, cleanReason);
      return { ok: true, reason: cleanReason, prompt };
    }

    // ফলব্যাক: DOM-এ directive ইনপুট ও retry বোতাম থাকলে ব্যবহার করা
    if (typeof document !== 'undefined') {
      const dirInput = document.getElementById('ai-custom-directive-input');
      if (dirInput) dirInput.value = prompt;
      const retryBtn = document.getElementById('btnRetry') || document.getElementById('btnConvert');
      if (retryBtn && typeof retryBtn.click === 'function') {
        retryBtn.click();
        return { ok: true, reason: cleanReason, prompt };
      }
    }

    return { ok: true, reason: cleanReason, prompt, deferred: true };
  }

  /** কাস্টম লেআউট বা সেটিংস বাছাই করা হয়েছে কি না */
  function hasCustomExport() {
    return Boolean(state.customized);
  }

  // =========================================================================
  // ব্রাউজার UI: ফলাফল-পাতায় (wsResult) D1, D2, D3 প্যানেল সংযোজন
  // =========================================================================
  function mountResult(hooks) {
    if (!isEnabled()) return;
    state.hooks = Object.assign({}, hooks || {});
    state.customized = false;

    if (typeof document === 'undefined') return;
    const wsResult = document.getElementById('wsResult');
    if (!wsResult) return;

    // হুবহু-মোডে সাধারণ মার্কডাউন লেআউট প্রযোজ্য নয়
    let root = document.getElementById('fzRelayoutBox');
    if (hooks && hooks.faithful) {
      if (root) root.hidden = true;
      return;
    }

    const md = (hooks && typeof hooks.getText === 'function' ? hooks.getText() : '') || '';
    const detected = detectLayout(md);
    state.detectedLayout = detected.archetype || detected.docType || 'bengali_general_doc';
    state.selectedLayout = state.detectedLayout;

    // ডিফল্ট কলাম নির্ধারণ (প্রশ্নপত্র হলে ২ কলাম, অন্যথায় ১ কলাম)
    const isTwoColExam = /^EXAM_(CQ|MATH|COMBINED|GENERAL)$/.test(detected.docType);
    const isLandscapeExam = /^EXAM_(CQ|MATH|COMBINED)$/.test(detected.docType);
    state.settings = normalizeSettings({
      columns: isTwoColExam ? 2 : 1,
      pageSize: 'a4',
      orientation: isLandscapeExam ? 'landscape' : 'portrait',
      booklet: isLandscapeExam,
      fontSize: 11
    });

    if (!root) {
      root = document.createElement('div');
      root.id = 'fzRelayoutBox';
      root.className = 'fz-relayout-box';
      const anchor = document.getElementById('stylePick') || document.getElementById('colPick') || document.getElementById('doneMeta');
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(root, anchor.nextSibling);
      } else {
        wsResult.appendChild(root);
      }
    }
    root.hidden = false;

    const optionsHtml = getLayoutOptions()
      .map((opt) => `<option value="${opt.id}"${opt.id === state.selectedLayout ? ' selected' : ''}>${opt.label} (${opt.docType})</option>`)
      .join('');

    root.innerHTML =
      `<div class="fz-relayout-bar" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 0;">` +
        `<span id="fzDetectedLabel">শনাক্ত: <b>${detected.label}</b></span>` +
        `<button type="button" id="fzBtnChangeLayout" class="btn-o">[বদলান]</button>` +
        `<button type="button" id="fzBtnToggleSettings" class="btn-o">পাতা ও ফন্ট সেটিংস</button>` +
        `<button type="button" id="fzBtnNotRight" class="btn-o">ঠিক হয়নি?</button>` +
      `</div>` +
      `<div id="fzLayoutPickerWrap" hidden style="margin:8px 0;">` +
        `<label for="fzLayoutSelect">লেআউট বাছুন: </label>` +
        `<select id="fzLayoutSelect" class="inp" style="max-width:280px;">${optionsHtml}</select>` +
      `</div>` +
      `<div id="fzSettingsPanel" hidden style="margin:8px 0;padding:10px;border:1px solid rgba(128,128,128,0.3);border-radius:8px;">` +
        `<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">` +
          `<label>কলাম: <select id="fzSetCols" class="inp">` +
            `<option value="1"${state.settings.columns === 1 ? ' selected' : ''}>১ কলাম</option>` +
            `<option value="2"${state.settings.columns === 2 ? ' selected' : ''}>২ কলাম</option>` +
          `</select></label>` +
          `<label>পাতা: <select id="fzSetPage" class="inp">` +
            `<option value="a4"${state.settings.pageSize === 'a4' ? ' selected' : ''}>A4</option>` +
            `<option value="legal"${state.settings.pageSize === 'legal' ? ' selected' : ''}>Legal</option>` +
            `<option value="letter"${state.settings.pageSize === 'letter' ? ' selected' : ''}>Letter</option>` +
          `</select></label>` +
          `<label>দিক: <select id="fzSetOrient" class="inp">` +
            `<option value="portrait"${state.settings.orientation === 'portrait' ? ' selected' : ''}>লম্বালম্বি</option>` +
            `<option value="landscape"${state.settings.orientation === 'landscape' ? ' selected' : ''}>আড়াআড়ি</option>` +
          `</select></label>` +
          `<label>বুকলেট: <select id="fzSetBooklet" class="inp">` +
            `<option value="false"${!state.settings.booklet ? ' selected' : ''}>না</option>` +
            `<option value="true"${state.settings.booklet ? ' selected' : ''}>হ্যাঁ</option>` +
          `</select></label>` +
          `<label>ফন্ট-সাইজ: <select id="fzSetFont" class="inp">` +
            [10, 11, 12, 13, 14, 16].map((sz) => `<option value="${sz}"${state.settings.fontSize === sz ? ' selected' : ''}>${toBnDigits(sz)} pt</option>`).join('') +
          `</select></label>` +
          `<button type="button" id="fzBtnApplySettings" class="btn">লেআউট প্রয়োগ ও রপ্তানি</button>` +
        `</div>` +
      `</div>` +
      `<div id="fzNotRightPanel" hidden style="margin:8px 0;padding:10px;border:1px solid rgba(128,128,128,0.3);border-radius:8px;">` +
        `<p style="margin:0 0 8px 0;font-weight:600;">কী সমস্যা হয়েছে?</p>` +
        `<div style="display:flex;flex-wrap:wrap;gap:8px;">` +
          `<button type="button" id="fzOptWrongLayout" class="btn-o">① সাজানো ভুল (লেআউট/সেটিংস বদলান)</button>` +
          `<button type="button" id="fzOptWrongText" class="btn-o">② লেখা বাদ/ভুল (আবার OCR করুন)</button>` +
        `</div>` +
        `<div id="fzReOcrBox" hidden style="margin-top:8px;">` +
          `<textarea id="fzReOcrReason" class="inp" rows="2" style="width:100%;margin-bottom:6px;" placeholder="কী বাদ পড়েছে বা ভুল হয়েছে লিখুন (যেমন: ডান কলামের লেখা আসেনি, সমীকরণ ভাঙ্গা)..."></textarea>` +
          `<button type="button" id="fzBtnConfirmReOcr" class="btn">নিশ্চিত করুন ও আবার OCR করুন</button>` +
        `</div>` +
      `</div>`;

    const $id = (id) => document.getElementById(id);
    const pickerWrap = $id('fzLayoutPickerWrap');
    const settingsPanel = $id('fzSettingsPanel');
    const notRightPanel = $id('fzNotRightPanel');
    const reOcrBox = $id('fzReOcrBox');

    function readUiSettings() {
      return normalizeSettings({
        columns: $id('fzSetCols') ? $id('fzSetCols').value : state.settings.columns,
        pageSize: $id('fzSetPage') ? $id('fzSetPage').value : state.settings.pageSize,
        orientation: $id('fzSetOrient') ? $id('fzSetOrient').value : state.settings.orientation,
        booklet: $id('fzSetBooklet') ? $id('fzSetBooklet').value === 'true' : state.settings.booklet,
        fontSize: $id('fzSetFont') ? $id('fzSetFont').value : state.settings.fontSize
      });
    }

    async function applyFromUi(autoDownload) {
      const sel = $id('fzLayoutSelect') ? $id('fzLayoutSelect').value : state.selectedLayout;
      const uiSettings = readUiSettings();
      const newLabel = getBanglaLabel(sel);
      if ($id('fzDetectedLabel')) {
        $id('fzDetectedLabel').innerHTML = `শনাক্ত: <b>${newLabel}</b>`;
      }
      try {
        await reExport({
          layout: sel,
          settings: uiSettings,
          autoDownload: Boolean(autoDownload)
        });
        if (state.hooks && typeof state.hooks.toast === 'function') {
          state.hooks.toast(`লেআউট "${newLabel}" প্রয়োগ হয়েছে — আবার OCR লাগেনি`, 'success');
        }
      } catch (e) {
        if (state.hooks && typeof state.hooks.toast === 'function') {
          state.hooks.toast('লেআউট বদলানো যায়নি: ' + ((e && e.message) || e), 'error');
        }
      }
    }

    // D1: [বদলান] বোতাম ও ড্রপডাউন
    $id('fzBtnChangeLayout').addEventListener('click', () => {
      pickerWrap.hidden = !pickerWrap.hidden;
    });
    $id('fzLayoutSelect').addEventListener('change', () => {
      applyFromUi(false);
    });

    // D2: সেটিংস প্যানেল খোলা ও প্রয়োগ
    $id('fzBtnToggleSettings').addEventListener('click', () => {
      settingsPanel.hidden = !settingsPanel.hidden;
    });
    ['fzSetCols', 'fzSetPage', 'fzSetOrient', 'fzSetBooklet', 'fzSetFont'].forEach((id) => {
      const el = $id(id);
      if (el) el.addEventListener('change', () => { state.settings = readUiSettings(); state.customized = true; });
    });
    $id('fzBtnApplySettings').addEventListener('click', () => {
      applyFromUi(true);
    });

    // D3: "ঠিক হয়নি?" বোতাম
    $id('fzBtnNotRight').addEventListener('click', () => {
      notRightPanel.hidden = !notRightPanel.hidden;
    });
    // ① সাজানো ভুল → D1/D2 খোলে
    $id('fzOptWrongLayout').addEventListener('click', () => {
      pickerWrap.hidden = false;
      settingsPanel.hidden = false;
      reOcrBox.hidden = true;
      if ($id('fzLayoutSelect')) $id('fzLayoutSelect').focus();
    });
    // ② লেখা বাদ/ভুল → কারণ লিখতে বলে
    $id('fzOptWrongText').addEventListener('click', () => {
      reOcrBox.hidden = false;
      if ($id('fzReOcrReason')) $id('fzReOcrReason').focus();
    });
    $id('fzBtnConfirmReOcr').addEventListener('click', async () => {
      const reason = ($id('fzReOcrReason') && $id('fzReOcrReason').value.trim()) || '';
      if (!reason) {
        if (state.hooks && typeof state.hooks.toast === 'function') {
          state.hooks.toast('আবার OCR করার আগে কী সমস্যা হয়েছে সংক্ষেপে লিখুন', 'warning');
        }
        return;
      }
      const ok = (typeof window !== 'undefined' && typeof window.confirm === 'function')
        ? window.confirm('আপনার দেওয়া কারণের ভিত্তিতে বিশেষ প্রম্পটে আবার OCR শুরু হবে। নিশ্চিত করছেন?')
        : true;
      if (!ok) return;
      await requestReOcr(reason, { confirmed: true });
    });
  }

  const FayzarRelayout = {
    LOG_KEY,
    ARCHETYPE_LABELS,
    DOCTYPE_LABELS,
    DEFAULT_SETTINGS,
    isEnabled,
    getLayoutOptions,
    resolveDocType,
    getBanglaLabel,
    parseFrontmatter,
    detectLayout,
    normalizeSettings,
    buildExportOptions,
    applyFrontmatter,
    sanitizeMeta,
    recordLog,
    logRelayout: recordLog,
    getLogs,
    clearLogs,
    getSessionMarkdown,
    reExport,
    download,
    buildReOcrPrompt,
    setReOcrHandler,
    requestReOcr,
    hasCustomExport,
    mountResult
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarRelayout;
  if (typeof window !== 'undefined') window.FayzarRelayout = FayzarRelayout;
  if (typeof globalThis !== 'undefined') globalThis.FayzarRelayout = FayzarRelayout;
  global.FayzarRelayout = FayzarRelayout;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
