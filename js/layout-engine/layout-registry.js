/**
 * Fayzar Publishing Studio — লেআউট রেজিস্ট্রি (Layout Registry)
 * নকশা-নথি: docs/LAYOUT_REGISTRY.md (অনুচ্ছেদ ২.১, ২.২, ৪.১)
 * একক সত্যের উৎস হিসেবে ডকুমেন্ট লেআউট নিবন্ধন, আলিয়াস সমাধান, উপ-লেআউট নির্বাচন এবং পার্স/রেন্ডার রাউটিং।
 * UMD: Node (module.exports) এবং ব্রাউজার (global.FayzarLayoutRegistry) উভয় পরিবেশে কার্যকর।
 */
(function (global) {
  'use strict';

  // অভ্যন্তরীণ রেজিস্ট্রি ভাণ্ডার (মূল id -> entry এবং normalized key -> মূল id)
  const _entries = new Map();
  const _aliasToId = new Map();

  // ইউনিকোড বাংলা ও স্ট্রিং নরমালাইজেশন (য়, ড়, ঢ় সমরূপীকরণ)
  function normText(text) {
    return String(text == null ? '' : text)
      .replace(/\u09AF\u09BC/g, '\u09DF')
      .replace(/\u09A1\u09BC/g, '\u09DC')
      .replace(/\u09A2\u09BC/g, '\u09DD')
      .replace(/\r\n?/g, '\n');
  }

  // বাংলা সংখ্যাকে ইংরেজি সংখ্যায় রূপান্তর
  const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
  function toNumber(val) {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (val == null || val === '') return NaN;
    const ascii = String(val)
      .trim()
      .replace(/[০-৯]/g, function (d) { return String(BN_DIGITS.indexOf(d)); });
    const parsed = Number(ascii);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  // আইডি বা আলিয়াস কী নরমালাইজেশন (বড় হাতের অক্ষর এবং হাইফেন/স্পেস -> আন্ডারস্কোর)
  function normalizeLookupKey(raw) {
    if (raw == null || typeof raw !== 'string') return '';
    return raw.trim().toUpperCase().replace(/[\s\-]+/g, '_');
  }

  // মার্কডাউন টেক্সটের শুরুতে YAML ফ্রন্টম্যাটার থাকলে তা পার্স করে অবজেক্টে রূপান্তর
  function extractFrontmatterFromText(rawText) {
    const t = normText(rawText);
    const m = t.match(/^\uFEFF?---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
    if (!m) return {};
    const fm = {};
    const lines = m[1].split('\n');
    for (let i = 0; i < lines.length; i++) {
      const kv = lines[i].match(/^\s*([A-Za-z0-9_\-]+)\s*:\s*(.*)$/);
      if (kv) {
        const key = kv[1].trim();
        const val = kv[2].trim().replace(/^['"]|['"]$/g, '');
        fm[key] = val;
        fm[key.toLowerCase()] = val;
      }
    }
    return fm;
  }

  // ফ্রন্টম্যাটার অবজেক্ট বা স্ট্রিংকে অভিন্ন অবজেক্টে রূপান্তর
  function normalizeFrontmatter(frontmatter, text) {
    const fromText = typeof text === 'string' ? extractFrontmatterFromText(text) : {};
    if (!frontmatter) return fromText;
    if (typeof frontmatter === 'string') {
      const parsed = extractFrontmatterFromText(
        frontmatter.trim().startsWith('---') ? frontmatter : '---\n' + frontmatter + '\n---'
      );
      return Object.assign({}, fromText, parsed);
    }
    if (typeof frontmatter === 'object') {
      const merged = Object.assign({}, fromText);
      const keys = Object.keys(frontmatter);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        merged[k] = frontmatter[k];
        merged[k.toLowerCase()] = frontmatter[k];
      }
      return merged;
    }
    return fromText;
  }

  // গ্লোবাল রুট অবজেক্ট নির্ণয় (ব্রাউজার window / Node globalThis / global)
  function getGlobalRoot() {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof window !== 'undefined') return window;
    if (typeof global !== 'undefined') return global;
    return {};
  }

  // ডিফল্ট সেটিংসের গভীর অনুলিপি (Deep Copy) তৈরি ও ফ্রন্টম্যাটার ওভাররাইড প্রয়োগ
  function buildEffectiveSettings(defaultSettings, frontmatter) {
    const base = defaultSettings || {};
    const settings = {
      paper: base.paper !== undefined ? base.paper : 'A4',
      orientation: base.orientation !== undefined ? base.orientation : 'landscape',
      columns: base.columns !== undefined ? base.columns : 1,
      booklet: base.booklet !== undefined ? base.booklet : false,
      copies: base.copies !== undefined ? base.copies : 2,
      fontSizePt: base.fontSizePt !== undefined ? base.fontSizePt : 10,
      lineSpacing: base.lineSpacing !== undefined ? base.lineSpacing : 1.15,
      marginsTwips: Object.assign(
        { top: 720, bottom: 720, left: 720, right: 720 },
        base.marginsTwips || {}
      )
    };

    if (!frontmatter || typeof frontmatter !== 'object') return settings;

    // পাতার মাপ (paper)
    const paperVal = frontmatter.paper ?? frontmatter.page_size ?? frontmatter.paper_size;
    if (typeof paperVal === 'string' && paperVal.trim()) {
      settings.paper = paperVal.trim();
    }

    // পাতার দিক (orientation)
    const orientVal = frontmatter.orientation ?? frontmatter.page_orientation;
    if (typeof orientVal === 'string' && orientVal.trim()) {
      const o = orientVal.trim().toLowerCase();
      if (o === 'portrait' || o === 'landscape') {
        settings.orientation = o;
      }
    }

    // কলাম সংখ্যা (columns)
    const colVal = frontmatter.columns ?? frontmatter.cols;
    if (colVal !== undefined && colVal !== null && colVal !== '') {
      const n = toNumber(colVal);
      if (Number.isFinite(n) && n >= 1) settings.columns = Math.round(n);
    }

    // বুকলেট ফ্ল্যাগ (booklet)
    const bookletVal = frontmatter.booklet;
    if (typeof bookletVal === 'boolean') {
      settings.booklet = bookletVal;
    } else if (typeof bookletVal === 'string') {
      const b = bookletVal.trim().toLowerCase();
      if (b === 'true' || b === '1' || b === 'yes') settings.booklet = true;
      else if (b === 'false' || b === '0' || b === 'no') settings.booklet = false;
    }

    // কপি সংখ্যা (copies)
    const copiesVal = frontmatter.copies ?? frontmatter.memoCopies ?? frontmatter.memo_copies;
    if (copiesVal !== undefined && copiesVal !== null && copiesVal !== '') {
      const n = toNumber(copiesVal);
      if (Number.isFinite(n) && n >= 1) settings.copies = Math.round(n);
    }

    // ফন্ট সাইজ (fontSizePt)
    const fontVal = frontmatter.fontSizePt ?? frontmatter.font_size_pt ?? frontmatter.font_size;
    if (fontVal !== undefined && fontVal !== null && fontVal !== '') {
      const n = toNumber(fontVal);
      if (Number.isFinite(n) && n > 0) settings.fontSizePt = n;
    }

    // লাইন স্পেসিং (lineSpacing)
    const lsVal = frontmatter.lineSpacing ?? frontmatter.line_spacing;
    if (lsVal !== undefined && lsVal !== null && lsVal !== '') {
      const n = toNumber(lsVal);
      if (Number.isFinite(n) && n > 0) settings.lineSpacing = n;
    }

    // মার্জিন (marginsTwips)
    const marginsVal = frontmatter.marginsTwips ?? frontmatter.margins_twips;
    if (marginsVal && typeof marginsVal === 'object') {
      ['top', 'bottom', 'left', 'right'].forEach(function (side) {
        if (marginsVal[side] !== undefined) {
          const n = toNumber(marginsVal[side]);
          if (Number.isFinite(n) && n >= 0) settings.marginsTwips[side] = Math.round(n);
        }
      });
    }

    return settings;
  }

  // স্পষ্ট sub_layout মানকে বৈধ উপ-লেআউট নামে রূপান্তর
  function normalizeExplicitSubLayout(val) {
    if (val == null || typeof val !== 'string') return '';
    const raw = normText(val).trim();
    if (!raw) return '';
    const lower = raw.toLowerCase().replace(/[\s_]+/g, '-');
    if (
      lower === 'receipt' ||
      lower === 'money-receipt' ||
      /টাকা\s*প্রাপ্তির\s*রসিদ|মানি\s*রিসিট|মানি\s*রিসিপ্ট|প্রাপ্তি\s*রসিদ|^রসিদ$/i.test(raw)
    ) {
      return 'receipt';
    }
    if (
      lower === 'voucher' ||
      lower === 'expense-voucher' ||
      lower === 'debit-voucher' ||
      lower === 'credit-voucher' ||
      lower === 'cash-voucher' ||
      /খরচের\s*ভাউচার|ভাউচার/i.test(raw)
    ) {
      return 'voucher';
    }
    if (
      lower === 'cash-memo' ||
      lower === 'cashmemo' ||
      lower === 'memo' ||
      /ক্যাশ\s*মেমো|ক্যাশমেমো|^মেমো$/i.test(raw)
    ) {
      return 'cash-memo';
    }
    return '';
  }

  /**
   * CASH_MEMO-এর উপ-লেআউট নির্বাচন:
   * - ফ্রন্টম্যাটারে স্পষ্ট `sub_layout` (বা `subLayout` / `memo_kind`) থাকলে সেটি অগ্রাধিকার পাবে।
   * - লেখায় 'টাকা প্রাপ্তির রসিদ' / 'মানি রিসিট' থাকলে → 'receipt'
   * - লেখায় 'ভাউচার' / 'খরচের ভাউচার' থাকলে → 'voucher'
   * - অন্যথায় → 'cash-memo'
   * নমনীয় আর্গুমেন্ট সমর্থন: (frontmatter, text), (meta, frontmatter, text), অথবা (text)।
   */
  function selectCashMemoSubLayout(arg1, arg2, arg3) {
    let fmInput = null;
    let textInput = '';

    if (arguments.length >= 3) {
      // (meta, frontmatter, text)
      fmInput = Object.assign({}, typeof arg1 === 'object' && arg1 ? arg1 : {}, typeof arg2 === 'object' && arg2 ? arg2 : {});
      textInput = typeof arg3 === 'string' ? arg3 : '';
    } else if (arguments.length === 2) {
      if (typeof arg1 === 'string' && typeof arg2 === 'object') {
        textInput = arg1;
        fmInput = arg2;
      } else if (typeof arg1 === 'object' && typeof arg2 === 'object' && arg1 && arg2) {
        fmInput = Object.assign({}, arg1, arg2);
        textInput = '';
      } else {
        // (frontmatter, text)
        fmInput = arg1;
        textInput = typeof arg2 === 'string' ? arg2 : '';
      }
    } else if (arguments.length === 1) {
      if (typeof arg1 === 'string') {
        textInput = arg1;
      } else if (typeof arg1 === 'object' && arg1 !== null) {
        fmInput = arg1;
        textInput = String(arg1.text ?? arg1.rawMarkdown ?? arg1.bodyMarkdown ?? '');
      }
    }

    const fm = normalizeFrontmatter(fmInput, textInput);

    // ১. ফ্রন্টম্যাটারে স্পষ্ট sub_layout থাকলে সেটি সবার আগে প্রযোজ্য
    const explicitCandidates = [
      fm.sub_layout,
      fm.sublayout,
      fm.subLayout,
      fm['sub-layout'],
      fm.memo_kind,
      fm.memokind,
      fm.memoKind
    ];
    for (let i = 0; i < explicitCandidates.length; i++) {
      const normalized = normalizeExplicitSubLayout(explicitCandidates[i]);
      if (normalized) return normalized;
    }

    // ২. মূল লেখার কীওয়ার্ড অনুযায়ী উপ-লেআউট নির্ধারণ
    const t = normText(textInput);
    if (/টাকা\s*প্রাপ্তির\s*রসিদ|মানি\s*রিসিট|মানি\s*রিসিপ্ট|প্রাপ্তি\s*রসিদ|প্রাপ্তি\s*স্বীকার\s*পত্র|money\s*receipt/i.test(t)) {
      return 'receipt';
    }
    if (/খরচের\s*ভাউচার|ভাউচার|voucher/i.test(t)) {
      return 'voucher';
    }
    return 'cash-memo';
  }

  // EXAM_GENERAL-এর উপ-লেআউট নির্বাচন ('bengali-standard-question-paper' বনাম 'english-question-paper')
  function selectExamGeneralSubLayout(frontmatter, text) {
    const fm = normalizeFrontmatter(frontmatter, text);
    const candidates = [
      fm.sub_layout,
      fm.sublayout,
      fm.subLayout,
      fm['sub-layout'],
      fm.archetype,
      fm.__requestedDocType
    ];
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (typeof c === 'string' && c.trim()) {
        const key = normalizeLookupKey(c);
        if (key === 'ENGLISH_QUESTION_PAPER' || key === 'ENGLISH') {
          return 'english-question-paper';
        }
        if (key === 'BENGALI_STANDARD_QUESTION_PAPER' || key === 'BENGALI') {
          return 'bengali-standard-question-paper';
        }
      }
    }
    const t = normText(text || '');
    if (/\b(?:Full\s+Marks|Time\s*:\s*\d+|Answer\s+any)\b/i.test(t) && !/পূর্ণমান|সময়|সময়/.test(t)) {
      return 'english-question-paper';
    }
    return 'bengali-standard-question-paper';
  }

  // GENERAL-এর উপ-লেআউট নির্বাচন ('bengali-general-doc' বনাম 'single-column-standard-document')
  function selectGeneralSubLayout(frontmatter, text) {
    const fm = normalizeFrontmatter(frontmatter, text);
    const candidates = [
      fm.sub_layout,
      fm.sublayout,
      fm.subLayout,
      fm['sub-layout'],
      fm.archetype,
      fm.__requestedDocType
    ];
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (typeof c === 'string' && c.trim()) {
        const key = normalizeLookupKey(c);
        if (key === 'SINGLE_COLUMN_STANDARD_DOCUMENT') {
          return 'single-column-standard-document';
        }
        if (key === 'BENGALI_GENERAL_DOC') {
          return 'bengali-general-doc';
        }
      }
    }
    return 'bengali-general-doc';
  }

  // subLayout অনুযায়ী গ্লোবাল লেআউট মডিউল (FayzarCashMemoLayout বা FayzarReceiptLayout) খুঁজে বের করা
  function getTargetModuleForSubLayout(subLayout, methodName) {
    const root = getGlobalRoot();
    const isReceiptOrVoucher = subLayout === 'receipt' || subLayout === 'voucher';
    const moduleName = isReceiptOrVoucher ? 'FayzarReceiptLayout' : 'FayzarCashMemoLayout';
    const mod = root[moduleName];

    if (!mod) {
      throw new Error(
        'লেআউট মডিউল পাওয়া যায়নি: global.' +
          moduleName +
          ' (subLayout: ' +
          subLayout +
          ', method: ' +
          methodName +
          ')'
      );
    }
    if (methodName && typeof mod[methodName] !== 'function') {
      throw new Error(
        'লেআউট মডিউল global.' +
          moduleName +
          '-এ "' +
          methodName +
          '" ফাংশনটি পাওয়া যায়নি (subLayout: ' +
          subLayout +
          ')'
      );
    }
    return mod;
  }

  // পার্স বা রেন্ডার কলের আর্গুমেন্ট ও মডেল থেকে কার্যকর subLayout নির্ণয়
  function resolveSubLayoutFromArgs(modelOrInput, optionsOrHelper, thirdArg) {
    // সরাসরি স্ট্রিং আর্গুমেন্ট হিসেবে subLayout দেওয়া হলে
    if (typeof optionsOrHelper === 'string') {
      const direct = normalizeExplicitSubLayout(optionsOrHelper);
      if (direct) return direct;
    }
    if (typeof thirdArg === 'string') {
      const direct3 = normalizeExplicitSubLayout(thirdArg);
      if (direct3) return direct3;
    }

    // options বা helper অবজেক্টে subLayout থাকলে
    if (optionsOrHelper && typeof optionsOrHelper === 'object') {
      const optSub = normalizeExplicitSubLayout(
        optionsOrHelper.subLayout ??
          optionsOrHelper.sub_layout ??
          optionsOrHelper.memoKind ??
          optionsOrHelper.memo_kind ??
          (optionsOrHelper.frontmatter && (optionsOrHelper.frontmatter.sub_layout || optionsOrHelper.frontmatter.subLayout)) ??
          (optionsOrHelper.__frontmatter && (optionsOrHelper.__frontmatter.sub_layout || optionsOrHelper.__frontmatter.subLayout))
      );
      if (optSub) return optSub;
    }

    // পার্স করা মডেল বা ইনপুট অবজেক্ট থেকে নির্ণয়
    if (modelOrInput && typeof modelOrInput === 'object') {
      const modelSub = normalizeExplicitSubLayout(
        modelOrInput.subLayout ?? modelOrInput.sub_layout ?? modelOrInput.variant
      );
      if (modelSub) return modelSub;
      if (modelOrInput.kind === 'RECEIPT_LAYOUT') {
        return modelOrInput.variant === 'voucher' ? 'voucher' : 'receipt';
      }
      if (modelOrInput.kind === 'CASH_MEMO_LAYOUT') {
        return 'cash-memo';
      }
      // পাইপলাইন ইনপুট অবজেক্ট { rawMarkdown, bodyMarkdown, frontmatter, settings, subLayout }
      const rawText = modelOrInput.rawMarkdown ?? modelOrInput.rawText ?? modelOrInput.text ?? modelOrInput.bodyMarkdown;
      if (typeof rawText === 'string' || modelOrInput.frontmatter) {
        return selectCashMemoSubLayout(modelOrInput.frontmatter || modelOrInput.__frontmatter, rawText || '');
      }
    }

    // ইনপুট যদি মার্কডাউন স্ট্রিং হয়
    if (typeof modelOrInput === 'string') {
      const fm =
        optionsOrHelper && typeof optionsOrHelper === 'object'
          ? optionsOrHelper.frontmatter || optionsOrHelper.__frontmatter || optionsOrHelper
          : null;
      return selectCashMemoSubLayout(fm, modelOrInput);
    }

    return 'cash-memo';
  }

  // DOCX রেন্ডারের জন্য ডিফল্ট হেল্পার (যদি কলার h.runs না দেয়)
  function ensureDocxHelper(h) {
    if (h && typeof h.runs === 'function') return h;
    const escXml = function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };
    return Object.assign({}, h || {}, {
      runs: function (text, style) {
        const st = style || {};
        const sz = st.sz || 20;
        const bXml = st.b ? '<w:b/><w:bCs/>' : '';
        return (
          '<w:r><w:rPr><w:sz w:val="' +
          sz +
          '"/><w:szCs w:val="' +
          sz +
          '"/>' +
          bXml +
          '</w:rPr><w:t xml:space="preserve">' +
          escXml(text) +
          '</w:t></w:r>'
        );
      }
    });
  }

  // RTF রেন্ডারের জন্য ডিফল্ট হেল্পার (যদি কলার h.rtf না দেয়)
  function ensureRtfHelper(h) {
    if (h && typeof h.rtf === 'function') return h;
    return Object.assign({}, h || {}, {
      rtf: function (text) {
        const str = String(text == null ? '' : text);
        let out = '';
        for (let i = 0; i < str.length; i++) {
          const code = str.charCodeAt(i);
          const ch = str[i];
          if (ch === '\\' || ch === '{' || ch === '}') {
            out += '\\' + ch;
          } else if (code > 127) {
            out += '\\u' + code + '?';
          } else {
            out += ch;
          }
        }
        return out;
      }
    });
  }

  const ALLOWED_OVERRIDES = [
    'paper',
    'orientation',
    'columns',
    'booklet',
    'copies',
    'fontSizePt',
    'lineSpacing',
    'marginsTwips'
  ];

  // CASH_MEMO রেজিস্ট্রি এন্ট্রি (অনুচ্ছেদ ২.১ ও ৪.১ অনুযায়ী)
  const CASH_MEMO_ENTRY = {
    id: 'CASH_MEMO',
    aliases: ['CASHMEMO', 'MEMO', 'RECEIPT', 'MONEY_RECEIPT', 'VOUCHER'],
    subLayouts: ['cash-memo', 'receipt', 'voucher'],
    labelBn: 'ক্যাশ মেমো / রসিদ / ভাউচার',
    labelEn: 'Cash Memo / Receipt / Voucher',
    category: 'commerce',
    isNonExam: true,
    defaultSettings: {
      paper: 'A4',
      orientation: 'landscape',
      columns: 1,
      booklet: false,
      copies: 2,
      fontSizePt: 10,
      lineSpacing: 1.15,
      marginsTwips: { top: 720, bottom: 720, left: 720, right: 720 }
    },
    allowedOverrides: ALLOWED_OVERRIDES.slice(),
    whenApplicable: {
      frontmatterTypes: ['CASH_MEMO', 'CASHMEMO', 'MEMO', 'RECEIPT', 'MONEY_RECEIPT', 'VOUCHER'],
      factsRule: null,
      heuristics: [],
      selectSubLayout: selectCashMemoSubLayout
    },
    promptFragment: {
      sectorHint: 'CASH_MEMO',
      frontmatterFields: ['doc_type', 'columns', 'copies', 'sub_layout'],
      instructionsBn:
        'দোকান/প্রতিষ্ঠানের নাম `#` শিরোনামে, ক্রেতার নাম/তারিখ/ঠিকানা লাইনে, পণ্যের তালিকা Markdown টেবিলে (`| ক্রমিক | বিবরণ | পরিমাণ | দর | টাকা |`) এবং নিচে স্বাক্ষর লাইন রাখুন।'
    },
    fixtures: [
      'cash-memo-blank.input.md',
      'cash-memo-items.input.md',
      'receipt.input.md',
      'voucher.input.md'
    ],
    sampleTemplateId: 'CASH_MEMO_DEFAULT',

    // উপ-লেআউট নির্বাচন হুক
    selectSubLayout: selectCashMemoSubLayout,

    // পার্স হুক: ঠিক আগের মতো RECEIPT_LAYOUT (wants বা স্পষ্ট subLayout) আগে, তারপর CASH_MEMO_LAYOUT
    parse(input, options, thirdArg) {
      let rawText = '';
      let callOpts = typeof options === 'object' && options !== null ? Object.assign({}, options) : {};
      if (typeof options === 'string' && typeof thirdArg === 'object' && thirdArg !== null) {
        callOpts = Object.assign({}, thirdArg);
      }

      if (typeof input === 'object' && input !== null) {
        rawText = String(input.rawMarkdown ?? input.rawText ?? input.text ?? input.bodyMarkdown ?? '');
        callOpts = Object.assign(
          {},
          input.settings || {},
          input.options || {},
          input.frontmatter ? { __frontmatter: input.frontmatter } : {},
          callOpts
        );
      } else {
        rawText = String(input == null ? '' : input);
      }

      // ১. কলার যদি স্পষ্টভাবে subLayout ('receipt' | 'voucher' | 'cash-memo') পাঠায়
      const explicitSub =
        (typeof options === 'string' ? normalizeExplicitSubLayout(options) : '') ||
        (typeof thirdArg === 'string' ? normalizeExplicitSubLayout(thirdArg) : '') ||
        (options && typeof options === 'object'
          ? normalizeExplicitSubLayout(
              options.subLayout ??
                options.sub_layout ??
                (options.frontmatter && (options.frontmatter.sub_layout || options.frontmatter.subLayout)) ??
                (options.__frontmatter && (options.__frontmatter.sub_layout || options.__frontmatter.subLayout))
            )
          : '');

      if (explicitSub === 'receipt' || explicitSub === 'voucher') {
        const rlMod = getTargetModuleForSubLayout(explicitSub, 'parse');
        if (!callOpts.memoKind) {
          callOpts = Object.assign({}, callOpts, { memoKind: explicitSub });
        }
        return rlMod.parse(rawText, callOpts);
      }

      if (explicitSub === 'cash-memo') {
        const cmMod = getTargetModuleForSubLayout('cash-memo', 'parse');
        return cmMod.parse(rawText, callOpts);
      }

      // ২. পাইপলাইনের বিদ্যমান ক্রম: আগে FayzarReceiptLayout.wants(rawText, callOpts), তারপর FayzarCashMemoLayout
      const root = getGlobalRoot();
      const rl = root.FayzarReceiptLayout;
      if (rl && typeof rl.wants === 'function' && rl.wants(rawText, callOpts)) {
        return rl.parse(rawText, callOpts);
      }
      const cm = getTargetModuleForSubLayout('cash-memo', 'parse');
      return cm.parse(rawText, callOpts);
    },

    // HTML প্রিভিউ রেন্ডার হুক: ঠিক আগের মতো RECEIPT_LAYOUT আগে, তারপর CASH_MEMO_LAYOUT (একই আর্গুমেন্ট, একই esc)
    renderHtml(model, options, h) {
      const passOpts = typeof options === 'string' ? (typeof h === 'object' ? h : undefined) : options;
      const passH = typeof options === 'string' ? undefined : h;
      if (model && model.kind === 'RECEIPT_LAYOUT') {
        const rlMod = getTargetModuleForSubLayout(model.variant === 'voucher' ? 'voucher' : 'receipt', 'renderHtml');
        return rlMod.renderHtml(model, passOpts, passH);
      }
      if (model && model.kind === 'CASH_MEMO_LAYOUT') {
        const cmMod = getTargetModuleForSubLayout('cash-memo', 'renderHtml');
        return cmMod.renderHtml(model, passOpts, passH);
      }
      const subLayout = resolveSubLayoutFromArgs(model, options, h);
      const mod = getTargetModuleForSubLayout(subLayout, 'renderHtml');
      return mod.renderHtml(model, passOpts, passH);
    },

    // DOCX রেন্ডার হুক
    renderDocx(model, h, thirdArg) {
      const subLayout = resolveSubLayoutFromArgs(model, h, thirdArg);
      const mod = getTargetModuleForSubLayout(subLayout, 'renderDocx');
      const rawH = typeof h === 'string' ? thirdArg : h;
      return mod.renderDocx(model, ensureDocxHelper(rawH));
    },

    // RTF (.doc) রেন্ডার হুক
    renderRtf(model, h, thirdArg) {
      const subLayout = resolveSubLayoutFromArgs(model, h, thirdArg);
      const mod = getTargetModuleForSubLayout(subLayout, 'renderRtf');
      const rawH = typeof h === 'string' ? thirdArg : h;
      return mod.renderRtf(model, ensureRtfHelper(rawH));
    }
  };

  // archetype-map.js-এর ARCHETYPE_TO_DOCTYPE-এর সকল আর্কিটাইপের জন্য রেজিস্ট্রি এন্ট্রিসমূহ
  const ARCHETYPE_REGISTRY_ENTRIES = [
    {
      id: 'EXAM_COMBINED',
      archetypes: ['bengali_combined_exam_paper'],
      aliases: ['bengali_combined_exam_paper', 'BENGALI_COMBINED_EXAM_PAPER', 'COMBINED_EXAM', 'CQ_MCQ_COMBINED'],
      subLayouts: ['bengali-combined-exam-paper'],
      labelBn: 'সমন্বিত প্রশ্নপত্র (সৃজনশীল ও বহুনির্বাচনি)',
      labelEn: 'Combined Exam Paper (CQ + MCQ)',
      category: 'exam',
      isNonExam: false,
      defaultSettings: {
        paper: 'A4',
        orientation: 'portrait',
        columns: 2,
        booklet: false,
        copies: 1,
        fontSizePt: 10,
        lineSpacing: 1.15,
        marginsTwips: { top: 720, bottom: 720, left: 720, right: 720 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['EXAM_COMBINED', 'bengali_combined_exam_paper'],
        factsRule: null,
        heuristics: []
      },
      promptFragment: {
        sectorHint: 'EXAM_COMBINED',
        frontmatterFields: ['doc_type', 'columns', 'paper', 'orientation'],
        instructionsBn: 'সৃজনশীল (ক/খ/গ/ঘ) এবং বহুনির্বাচনি (ক/খ/গ/ঘ অপশন) উভয় অংশসহ সমন্বিত প্রশ্নপত্র।'
      },
      fixtures: [],
      sampleTemplateId: 'EXAM_COMBINED_DEFAULT'
    },
    {
      id: 'EXAM_CQ',
      archetypes: ['bengali_cq_paper'],
      aliases: ['bengali_cq_paper', 'BENGALI_CQ_PAPER', 'CQ_PAPER', 'CREATIVE_QUESTION'],
      subLayouts: ['bengali-cq-paper'],
      labelBn: 'সৃজনশীল প্রশ্নপত্র (CQ)',
      labelEn: 'Creative Question Paper (CQ)',
      category: 'exam',
      isNonExam: false,
      defaultSettings: {
        paper: 'A4',
        orientation: 'portrait',
        columns: 2,
        booklet: false,
        copies: 1,
        fontSizePt: 10,
        lineSpacing: 1.15,
        marginsTwips: { top: 720, bottom: 720, left: 720, right: 720 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['EXAM_CQ', 'bengali_cq_paper'],
        factsRule: null,
        heuristics: []
      },
      promptFragment: {
        sectorHint: 'EXAM_CQ',
        frontmatterFields: ['doc_type', 'columns', 'paper', 'orientation'],
        instructionsBn: 'উদ্দীপক এবং ক, খ, গ, ঘ উপ-প্রশ্নসহ সৃজনশীল প্রশ্নপত্র।'
      },
      fixtures: [],
      sampleTemplateId: 'EXAM_CQ_DEFAULT'
    },
    {
      id: 'EXAM_MCQ',
      archetypes: ['bengali_mcq_paper'],
      aliases: ['bengali_mcq_paper', 'BENGALI_MCQ_PAPER', 'MCQ_PAPER', 'MULTIPLE_CHOICE'],
      subLayouts: ['bengali-mcq-paper'],
      labelBn: 'বহুনির্বাচনি প্রশ্নপত্র (MCQ)',
      labelEn: 'Multiple Choice Question Paper (MCQ)',
      category: 'exam',
      isNonExam: false,
      defaultSettings: {
        paper: 'A4',
        orientation: 'portrait',
        columns: 2,
        booklet: false,
        copies: 1,
        fontSizePt: 10,
        lineSpacing: 1.1,
        marginsTwips: { top: 720, bottom: 720, left: 720, right: 720 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['EXAM_MCQ', 'bengali_mcq_paper'],
        factsRule: null,
        heuristics: []
      },
      promptFragment: {
        sectorHint: 'EXAM_MCQ',
        frontmatterFields: ['doc_type', 'columns', 'paper', 'orientation'],
        instructionsBn: 'চারটি বিকল্প (ক, খ, গ, ঘ) বিশিষ্ট বহুনির্বাচনি প্রশ্নপত্র।'
      },
      fixtures: [],
      sampleTemplateId: 'EXAM_MCQ_DEFAULT'
    },
    {
      id: 'EXAM_GENERAL',
      archetypes: ['bengali_standard_question_paper', 'english_question_paper'],
      aliases: [
        'bengali_standard_question_paper',
        'english_question_paper',
        'BENGALI_STANDARD_QUESTION_PAPER',
        'ENGLISH_QUESTION_PAPER',
        'STANDARD_QUESTION_PAPER',
        'QUESTION_PAPER'
      ],
      subLayouts: ['bengali-standard-question-paper', 'english-question-paper'],
      labelBn: 'সাধারণ প্রশ্নপত্র (বাংলা / ইংরেজি)',
      labelEn: 'Standard Question Paper (Bengali / English)',
      category: 'exam',
      isNonExam: false,
      defaultSettings: {
        paper: 'A4',
        orientation: 'portrait',
        columns: 1,
        booklet: false,
        copies: 1,
        fontSizePt: 11,
        lineSpacing: 1.15,
        marginsTwips: { top: 720, bottom: 720, left: 720, right: 720 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['EXAM_GENERAL', 'bengali_standard_question_paper', 'english_question_paper'],
        factsRule: null,
        heuristics: [],
        selectSubLayout: selectExamGeneralSubLayout
      },
      promptFragment: {
        sectorHint: 'EXAM_GENERAL',
        frontmatterFields: ['doc_type', 'columns', 'sub_layout'],
        instructionsBn: 'সাধারণ বাংলা বা ইংরেজি লিখিত পরীক্ষার প্রশ্নপত্র।'
      },
      fixtures: [],
      sampleTemplateId: 'EXAM_GENERAL_DEFAULT',
      selectSubLayout: selectExamGeneralSubLayout
    },
    {
      id: 'EXAM_MATH',
      archetypes: ['math_science_paper'],
      aliases: ['math_science_paper', 'MATH_SCIENCE_PAPER', 'MATH_PAPER', 'SCIENCE_PAPER'],
      subLayouts: ['math-science-paper'],
      labelBn: 'গণিত ও বিজ্ঞান প্রশ্নপত্র',
      labelEn: 'Math & Science Question Paper',
      category: 'exam',
      isNonExam: false,
      defaultSettings: {
        paper: 'A4',
        orientation: 'portrait',
        columns: 2,
        booklet: false,
        copies: 1,
        fontSizePt: 10,
        lineSpacing: 1.2,
        marginsTwips: { top: 720, bottom: 720, left: 720, right: 720 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['EXAM_MATH', 'math_science_paper'],
        factsRule: null,
        heuristics: []
      },
      promptFragment: {
        sectorHint: 'EXAM_MATH',
        frontmatterFields: ['doc_type', 'columns', 'paper'],
        instructionsBn: 'সমীকরণ ও গাণিতিক প্রতীকসংবলিত গণিত বা বিজ্ঞান প্রশ্নপত্র।'
      },
      fixtures: [],
      sampleTemplateId: 'EXAM_MATH_DEFAULT'
    },
    {
      id: 'GOVT_APP',
      archetypes: ['govt_application'],
      aliases: ['govt_application', 'GOVT_APPLICATION', 'APPLICATION', 'OFFICIAL_APPLICATION'],
      subLayouts: ['govt-application'],
      labelBn: 'সরকারি আবেদনপত্র',
      labelEn: 'Government / Official Application',
      category: 'official',
      isNonExam: true,
      defaultSettings: {
        paper: 'A4',
        orientation: 'portrait',
        columns: 1,
        booklet: false,
        copies: 1,
        fontSizePt: 12,
        lineSpacing: 1.25,
        marginsTwips: { top: 1080, bottom: 1080, left: 1080, right: 900 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['GOVT_APP', 'govt_application'],
        factsRule: null,
        heuristics: []
      },
      promptFragment: {
        sectorHint: 'GOVT_APP',
        frontmatterFields: ['doc_type', 'paper', 'fontSizePt'],
        instructionsBn: 'বরাবর, বিষয়, মহোদয় ও নিবেদক কাঠামোতে দাপ্তরিক বা সরকারি আবেদনপত্র।'
      },
      fixtures: [],
      sampleTemplateId: 'GOVT_APP_DEFAULT'
    },
    {
      id: 'STAMP_DEED',
      archetypes: ['legal_deed_contract'],
      aliases: ['legal_deed_contract', 'LEGAL_DEED_CONTRACT', 'DEED', 'CONTRACT', 'AGREEMENT'],
      subLayouts: ['legal-deed-contract'],
      labelBn: 'দলিল ও চুক্তিপত্র (স্ট্যাম্প ডিড)',
      labelEn: 'Legal Deed & Contract (Stamp Deed)',
      category: 'legal',
      isNonExam: true,
      defaultSettings: {
        paper: 'Legal',
        orientation: 'portrait',
        columns: 1,
        booklet: false,
        copies: 1,
        fontSizePt: 12,
        lineSpacing: 1.3,
        marginsTwips: { top: 2160, bottom: 1080, left: 1080, right: 1080 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['STAMP_DEED', 'legal_deed_contract'],
        factsRule: null,
        heuristics: []
      },
      promptFragment: {
        sectorHint: 'STAMP_DEED',
        frontmatterFields: ['doc_type', 'paper', 'marginsTwips'],
        instructionsBn: 'প্রথম পক্ষ, দ্বিতীয় পক্ষ, শর্তাবলি ও সাক্ষীগণের স্বাক্ষরসহ আইনি দলিল বা চুক্তিপত্র।'
      },
      fixtures: [],
      sampleTemplateId: 'STAMP_DEED_DEFAULT'
    },
    {
      id: 'PROTTOYON',
      archetypes: ['testimonial_cert'],
      aliases: ['testimonial_cert', 'TESTIMONIAL_CERT', 'TESTIMONIAL', 'CERTIFICATE', 'PROTTAYAN'],
      subLayouts: ['testimonial-cert'],
      labelBn: 'প্রত্যয়নপত্র / প্রশংসাপত্র',
      labelEn: 'Testimonial / Certificate',
      category: 'certificate',
      isNonExam: true,
      defaultSettings: {
        paper: 'A4',
        orientation: 'portrait',
        columns: 1,
        booklet: false,
        copies: 1,
        fontSizePt: 12,
        lineSpacing: 1.3,
        marginsTwips: { top: 1080, bottom: 1080, left: 1080, right: 1080 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['PROTTOYON', 'testimonial_cert'],
        factsRule: null,
        heuristics: []
      },
      promptFragment: {
        sectorHint: 'PROTTOYON',
        frontmatterFields: ['doc_type', 'paper', 'orientation'],
        instructionsBn: 'প্রতিষ্ঠানের শিরোনাম, প্রত্যয়ন বয়ান এবং প্রদানকারীর স্বাক্ষরসহ প্রত্যয়নপত্র বা প্রশংসাপত্র।'
      },
      fixtures: [],
      sampleTemplateId: 'PROTTOYON_DEFAULT'
    },
    {
      id: 'OFFICE_PAD',
      archetypes: ['office_pad'],
      aliases: ['office_pad', 'LETTERHEAD', 'PAD'],
      subLayouts: ['office-pad'],
      labelBn: 'অফিস প্যাড / লেটারহেড',
      labelEn: 'Office Pad / Letterhead',
      category: 'official',
      isNonExam: true,
      defaultSettings: {
        paper: 'A4',
        orientation: 'portrait',
        columns: 1,
        booklet: false,
        copies: 1,
        fontSizePt: 11,
        lineSpacing: 1.2,
        marginsTwips: { top: 900, bottom: 900, left: 900, right: 900 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['OFFICE_PAD', 'office_pad'],
        factsRule: null,
        heuristics: []
      },
      promptFragment: {
        sectorHint: 'OFFICE_PAD',
        frontmatterFields: ['doc_type', 'paper', 'fontSizePt'],
        instructionsBn: 'প্রতিষ্ঠানের হেডার ব্যানার, সূত্র/স্মারক নং, তারিখ ও মূল বার্তাসহ অফিস প্যাড।'
      },
      fixtures: [],
      sampleTemplateId: 'OFFICE_PAD_DEFAULT'
    },
    {
      id: 'OFFICIAL_NOTICE',
      archetypes: ['official_notice_memo'],
      aliases: ['official_notice_memo', 'OFFICIAL_NOTICE_MEMO', 'NOTICE', 'OFFICE_MEMO', 'CIRCULAR'],
      subLayouts: ['official-notice-memo'],
      labelBn: 'নোটিশ / স্মারকলিপি / বিজ্ঞপ্তি',
      labelEn: 'Official Notice / Memo / Circular',
      category: 'official',
      isNonExam: true,
      defaultSettings: {
        paper: 'A4',
        orientation: 'portrait',
        columns: 1,
        booklet: false,
        copies: 1,
        fontSizePt: 12,
        lineSpacing: 1.25,
        marginsTwips: { top: 1080, bottom: 1080, left: 1080, right: 1080 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['OFFICIAL_NOTICE', 'official_notice_memo'],
        factsRule: null,
        heuristics: []
      },
      promptFragment: {
        sectorHint: 'OFFICIAL_NOTICE',
        frontmatterFields: ['doc_type', 'paper', 'fontSizePt'],
        instructionsBn: 'স্মারক নং, তারিখ, নোটিশ/বিজ্ঞপ্তি শিরোনাম, মূল বক্তব্য এবং স্বাক্ষর ব্লক।'
      },
      fixtures: [],
      sampleTemplateId: 'OFFICIAL_NOTICE_DEFAULT'
    },
    {
      id: 'SALARY_SLIP',
      archetypes: ['salary_slip'],
      aliases: ['salary_slip', 'PAY_SLIP', 'PAYSLIP', 'SALARY_SHEET'],
      subLayouts: ['salary-slip'],
      labelBn: 'বেতন স্লিপ / পে-স্লিপ',
      labelEn: 'Salary Slip / Pay Slip',
      category: 'commerce',
      isNonExam: true,
      defaultSettings: {
        paper: 'A4',
        orientation: 'portrait',
        columns: 1,
        booklet: false,
        copies: 1,
        fontSizePt: 10,
        lineSpacing: 1.15,
        marginsTwips: { top: 720, bottom: 720, left: 720, right: 720 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['SALARY_SLIP', 'salary_slip'],
        factsRule: null,
        heuristics: []
      },
      promptFragment: {
        sectorHint: 'SALARY_SLIP',
        frontmatterFields: ['doc_type', 'copies', 'orientation'],
        instructionsBn: 'কর্মচারীর তথ্য, মূল বেতন, ভাতা, কর্তন ও নিট প্রদেয় টাকার ছকসহ বেতন স্লিপ।'
      },
      fixtures: [],
      sampleTemplateId: 'SALARY_SLIP_DEFAULT'
    },
    {
      id: 'ADMIT_CARD',
      archetypes: ['admit_card'],
      aliases: ['admit_card', 'ADMIT', 'EXAM_PASS'],
      subLayouts: ['admit-card'],
      labelBn: 'প্রবেশপত্র (Admit Card)',
      labelEn: 'Admit Card',
      category: 'institutional',
      isNonExam: true,
      defaultSettings: {
        paper: 'A4',
        orientation: 'portrait',
        columns: 1,
        booklet: false,
        copies: 2,
        fontSizePt: 10,
        lineSpacing: 1.15,
        marginsTwips: { top: 720, bottom: 720, left: 720, right: 720 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['ADMIT_CARD', 'admit_card'],
        factsRule: null,
        heuristics: []
      },
      promptFragment: {
        sectorHint: 'ADMIT_CARD',
        frontmatterFields: ['doc_type', 'copies', 'orientation'],
        instructionsBn: 'পরীক্ষার্থীর নাম, রোল, শ্রেণি, পরীক্ষার নাম ও নির্দেশাবলিসহ প্রবেশপত্র।'
      },
      fixtures: [],
      sampleTemplateId: 'ADMIT_CARD_DEFAULT'
    },
    {
      id: 'ROUTINE',
      archetypes: ['class_routine'],
      aliases: ['class_routine', 'CLASS_ROUTINE', 'EXAM_ROUTINE', 'TIMETABLE', 'SCHEDULE'],
      subLayouts: ['class-routine'],
      labelBn: 'ক্লাস / পরীক্ষার রুটিন',
      labelEn: 'Class / Exam Routine',
      category: 'institutional',
      isNonExam: true,
      defaultSettings: {
        paper: 'A4',
        orientation: 'landscape',
        columns: 1,
        booklet: false,
        copies: 1,
        fontSizePt: 10,
        lineSpacing: 1.1,
        marginsTwips: { top: 720, bottom: 720, left: 720, right: 720 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['ROUTINE', 'class_routine'],
        factsRule: null,
        heuristics: []
      },
      promptFragment: {
        sectorHint: 'ROUTINE',
        frontmatterFields: ['doc_type', 'orientation', 'paper'],
        instructionsBn: 'বার/তারিখ, সময় ও বিষয়/শ্রেণির ছকসহ ক্লাস বা পরীক্ষার রুটিন।'
      },
      fixtures: [],
      sampleTemplateId: 'ROUTINE_DEFAULT'
    },
    {
      id: 'GENERAL',
      archetypes: ['bengali_general_doc', 'single_column_standard_document'],
      aliases: [
        'bengali_general_doc',
        'single_column_standard_document',
        'BENGALI_GENERAL_DOC',
        'SINGLE_COLUMN_STANDARD_DOCUMENT',
        'STANDARD_DOC',
        'DEFAULT'
      ],
      subLayouts: ['bengali-general-doc', 'single-column-standard-document'],
      labelBn: 'সাধারণ ডকুমেন্ট (এক কলাম)',
      labelEn: 'General Document (Single Column)',
      category: 'general',
      isNonExam: true,
      defaultSettings: {
        paper: 'A4',
        orientation: 'portrait',
        columns: 1,
        booklet: false,
        copies: 1,
        fontSizePt: 11,
        lineSpacing: 1.2,
        marginsTwips: { top: 1080, bottom: 1080, left: 1080, right: 1080 }
      },
      allowedOverrides: ALLOWED_OVERRIDES.slice(),
      whenApplicable: {
        frontmatterTypes: ['GENERAL', 'bengali_general_doc', 'single_column_standard_document'],
        factsRule: null,
        heuristics: [],
        selectSubLayout: selectGeneralSubLayout
      },
      promptFragment: {
        sectorHint: 'GENERAL',
        frontmatterFields: ['doc_type', 'paper', 'orientation', 'fontSizePt'],
        instructionsBn: 'এক কলামের সাধারণ বাংলা বা ইংরেজি ডকুমেন্ট।'
      },
      fixtures: [],
      sampleTemplateId: 'GENERAL_DEFAULT',
      selectSubLayout: selectGeneralSubLayout
    }
  ];

  // মূল রেজিস্ট্রি অবজেক্ট
  const FayzarLayoutRegistry = {
    /**
     * নতুন বা হালনাগাদ লেআউট এন্ট্রি রেজিস্ট্রিতে নিবন্ধন করে।
     * @param {Object} entry - লেআউট এন্ট্রি অবজেক্ট (ন্যূনতম `id` থাকতে হবে)
     * @returns {Object} নিবন্ধিত এন্ট্রি
     */
    register(entry) {
      if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !entry.id.trim()) {
        throw new Error('FayzarLayoutRegistry.register: বৈধ লেআউট এন্ট্রি ও id আবশ্যক।');
      }
      const canonicalId = entry.id.trim();
      const normId = normalizeLookupKey(canonicalId);

      _entries.set(canonicalId, entry);
      _aliasToId.set(normId, canonicalId);
      _aliasToId.set(canonicalId.toUpperCase(), canonicalId);

      // আর্কিটাইপসমূহ নিবন্ধন
      if (Array.isArray(entry.archetypes)) {
        for (let i = 0; i < entry.archetypes.length; i++) {
          const arch = entry.archetypes[i];
          if (typeof arch === 'string' && arch.trim()) {
            _aliasToId.set(normalizeLookupKey(arch), canonicalId);
            _aliasToId.set(arch.trim().toUpperCase(), canonicalId);
          }
        }
      }

      // আলিয়াসসমূহ নিবন্ধন
      if (Array.isArray(entry.aliases)) {
        for (let i = 0; i < entry.aliases.length; i++) {
          const alias = entry.aliases[i];
          if (typeof alias === 'string' && alias.trim()) {
            _aliasToId.set(normalizeLookupKey(alias), canonicalId);
            _aliasToId.set(alias.trim().toUpperCase(), canonicalId);
          }
        }
      }

      // subLayouts-ও যাতে লুকআপে ম্যাপ করা যায় (যেমন 'cash-memo' -> 'CASH_MEMO')
      if (Array.isArray(entry.subLayouts)) {
        for (let i = 0; i < entry.subLayouts.length; i++) {
          const sub = entry.subLayouts[i];
          if (typeof sub === 'string' && sub.trim()) {
            const subKey = normalizeLookupKey(sub);
            if (!_aliasToId.has(subKey)) {
              _aliasToId.set(subKey, canonicalId);
            }
          }
        }
      }

      return entry;
    },

    /**
     * আইডি বা আলিয়াস দিয়ে রেজিস্ট্রি থেকে এন্ট্রি খুঁজে বের করে।
     * @param {string} id - লেআউট আইডি বা আলিয়াস (যেমন 'CASH_MEMO', 'RECEIPT', 'VOUCHER')
     * @returns {Object|null} লেআউট এন্ট্রি অথবা না পাওয়া গেলে null
     */
    get(id) {
      if (!id || typeof id !== 'string') return null;
      const trimmed = id.trim();
      if (!trimmed) return null;

      if (_entries.has(trimmed)) return _entries.get(trimmed);

      const upper = trimmed.toUpperCase();
      if (_aliasToId.has(upper)) {
        return _entries.get(_aliasToId.get(upper)) || null;
      }

      const norm = normalizeLookupKey(trimmed);
      if (_aliasToId.has(norm)) {
        return _entries.get(_aliasToId.get(norm)) || null;
      }

      return null;
    },

    /**
     * প্রদত্ত আইডি বা আলিয়াস রেজিস্ট্রিতে আছে কি না তা যাচাই করে।
     * @param {string} id
     * @returns {boolean}
     */
    has(id) {
      return this.get(id) !== null;
    },

    /**
     * নিবন্ধিত সকল লেআউট এন্ট্রির তালিকা প্রদান করে।
     * @returns {Array<Object>}
     */
    list() {
      return Array.from(_entries.values());
    },

    /**
     * docType, frontmatter এবং text থেকে { entry, subLayout, settings } সমাধান করে।
     * অজানা docType হলে null রিটার্ন করে।
     * @param {string} docType
     * @param {Object|string|null} frontmatter
     * @param {string} [text]
     * @returns {{ entry: Object, subLayout: string, settings: Object } | null}
     */
    resolve(docType, frontmatter, text) {
      const entry = this.get(docType);
      if (!entry) return null;

      const fm = normalizeFrontmatter(frontmatter, text);
      if (fm && typeof fm === 'object' && !fm.__requestedDocType) {
        fm.__requestedDocType = docType;
      }
      let subLayout = null;

      if (typeof entry.selectSubLayout === 'function') {
        subLayout = entry.selectSubLayout(fm, text || '');
      } else if (entry.whenApplicable && typeof entry.whenApplicable.selectSubLayout === 'function') {
        subLayout = entry.whenApplicable.selectSubLayout(null, fm, text || '');
      } else if (Array.isArray(entry.subLayouts) && entry.subLayouts.length > 0) {
        subLayout = entry.subLayouts[0];
      }

      const settings = buildEffectiveSettings(entry.defaultSettings, fm);

      return {
        entry,
        subLayout,
        settings
      };
    },

    // সরাসরি রেজিস্ট্রি থেকেও সুবিধাজনক কলের জন্য ডেলিগেট মেথড
    selectSubLayout: selectCashMemoSubLayout,
    parse(input, options, thirdArg) {
      return CASH_MEMO_ENTRY.parse(input, options, thirdArg);
    },
    renderHtml(model, options, h) {
      return CASH_MEMO_ENTRY.renderHtml(model, options, h);
    },
    renderDocx(model, h, thirdArg) {
      return CASH_MEMO_ENTRY.renderDocx(model, h, thirdArg);
    },
    renderRtf(model, h, thirdArg) {
      return CASH_MEMO_ENTRY.renderRtf(model, h, thirdArg);
    }
  };

  // ডিফল্ট CASH_MEMO এন্ট্রি এবং ARCHETYPE_TO_DOCTYPE-এর সকল এন্ট্রি নিবন্ধন
  FayzarLayoutRegistry.register(CASH_MEMO_ENTRY);
  for (let i = 0; i < ARCHETYPE_REGISTRY_ENTRIES.length; i++) {
    FayzarLayoutRegistry.register(ARCHETYPE_REGISTRY_ENTRIES[i]);
  }

  // UMD এক্সপোর্ট (Node module.exports + ব্রাউজার global.FayzarLayoutRegistry)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FayzarLayoutRegistry;
  }
  if (typeof window !== 'undefined') {
    window.FayzarLayoutRegistry = FayzarLayoutRegistry;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.FayzarLayoutRegistry = FayzarLayoutRegistry;
  }
  if (global) {
    global.FayzarLayoutRegistry = FayzarLayoutRegistry;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this)));
