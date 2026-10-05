/**
 * লেআউট-ইউনিট নরমালাইজার (Part-12)
 * ---------------------------------------------------------------------------
 * সমস্যা: UI-র মার্জিন সিলেক্ট থেকে আসে **স্ট্রিং** ('normal' | 'narrow' |
 * 'moderate' | 'wide'), কিন্তু প্ল্যানারগুলো `parseFloat(o.margin) * 1440` করত ⇒
 * NaN ⇒ OpenXML-এ `<w:pgMar w:top="NaN"/>`, `<w:tab w:pos="NaN"/>` ⇒ Word
 * "Word experienced an error trying to open the file" (ফাইল করাপ্ট ঘোষণা)।
 * RTF-তেও `\marglNaN` বসত।
 *
 * নিয়ম (একমাত্র উৎস): সব দৈর্ঘ্য এখানেই টুইপে রূপান্তরিত হয় এবং ফলাফল সবসময়
 * সসীম (finite) পূর্ণসংখ্যা; কখনো NaN/Infinity জ্যামিতিতে ঢুকবে না।
 *
 * স্বীকৃত ইনপুট:
 *   • সংখ্যা (ইঞ্চি)        : 0.5, 0.6, 1        → ×1440
 *   • সংখ্যা (টুইপ বলে বোঝা): 720, 1008 (> 6 হলে টুইপ ধরা হয়)
 *   • স্ট্রিং সংখ্যা        : '0.5', '0.6"', '1in', '1.5cm', '12pt', '720tw'
 *   • UI-নাম               : normal/narrow/moderate/wide/none (মার্জিন),
 *                            tight/narrow/normal/wide/booklet (গ্যাপ)
 *   • খালি/অবৈধ            : undefined/null/''/'abc' → ফলব্যাক
 *
 * @module layout-units
 */
(function (global) {
  'use strict';

  const TWIPS_PER_INCH = 1440;

  /** UI-সিলেক্টের নাম → টুইপ (Word-এর নিজস্ব সেটিংসের সঙ্গে মেলানো) */
  const MARGIN_MAP = { none: 0, narrow: 576, normal: 720, moderate: 1080, wide: 1440 };
  const GAP_MAP = { none: 0, tight: 144, narrow: 216, normal: 288, wide: 576, booklet: 1008 };

  /** Part-12.2: Studio-UI-র মার্জিন-ক্লাস ('margin-*') → টুইপ — প্রিভিউ ও এক্সপোর্টের একক সূত্র */
  const MARGIN_CLASS_MAP = {
    'margin-narrow': 576,     // ০.৪"
    'margin-standard': 720,   // ০.৫"
    'margin-normal': 1080,    // ০.৭৫"
    'margin-wide': 1440,      // ১.০"
    'margin-stamp': 1440      // স্ট্যাম্প/লিগ্যাল ডিফল্ট
  };

  /** একক → টুইপ গুণক */
  const UNIT = { in: 1440, inch: 1440, inches: 1440, '"': 1440, cm: 566.929, mm: 56.6929, pt: 20, pc: 240, tw: 1, twips: 1, dxa: 1 };

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  /** বাংলা ডিজিট → ইংরেজি ('১২' → '12'); অন্য কিছু অক্ষুণ্ন */
  const BN_DIGITS = '\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef';
  function bnDigits(value) {
    if (typeof value !== 'string') return value;
    let out = '';
    for (const ch of value) {
      const i = BN_DIGITS.indexOf(ch);
      out += i >= 0 ? String(i) : ch;
    }
    return out;
  }

  function finiteOr(v, fb) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  }

  /**
   * যেকোনো দৈর্ঘ্য-বর্ণনা → টুইপ (সর্বদা সসীম পূর্ণসংখ্যা)।
   * @param {*} value      ইনপুট (সংখ্যা/স্ট্রিং/নাম)
   * @param {number} fb    ফলব্যাক টুইপ (ইনপুট অবৈধ হলে)
   * @param {object} [map] নাম→টুইপ মানচিত্র (MARGIN_MAP / GAP_MAP)
   * @param {number} [hi]  ঊর্ধ্বসীমা টুইপ (ডিফল্ট 2880 = 2")
   */
  function toTwips(value, fb, map, hi) {
    // ফলব্যাকও নিজ hi মেনে চলে (নইলে rightTab-এর মতো বড় কলাম-প্রস্থ ২৮৮০-এ কেটে যায়)
    const fallback = clamp(Math.round(finiteOr(fb, 720)), 0, hi || 22000);
    if (value === null || value === undefined || value === false || value === '') return fallback;

    // ১) নাম (case/space-নিরপেক্ষ)
    if (typeof value === 'string') {
      const key = value.trim().toLowerCase().replace(/\s+/g, '');
      if (map && Object.prototype.hasOwnProperty.call(map, key)) return clamp(map[key], 0, hi || 22000);
      if (Object.prototype.hasOwnProperty.call(MARGIN_MAP, key) && map === GAP_MAP) {
        // গ্যাপে মার্জিন-নাম দিলেও যেন NaN না হয়
        return clamp(MARGIN_MAP[key], 0, hi || 22000);
      }
      // ২) একক-সহ স্ট্রিং: '0.5in', '1.5cm', '12pt', '720tw', '0.5"'
      const m = key.match(/^(-?\d+(?:\.\d+)?)\s*("”|in|inch|inches|cm|mm|pt|pc|tw|twips|dxa)?$/);
      if (m) {
        const num = parseFloat(m[1]);
        const unit = m[2] || '';
        if (Number.isFinite(num)) {
          const tw = unit ? num * (UNIT[unit] || TWIPS_PER_INCH) : num;
          return clamp(Math.round(unit ? tw : (num > 6 ? num : num * TWIPS_PER_INCH)), 0, hi || 22000);
        }
      }
      const loose = parseFloat(key);
      if (!Number.isFinite(loose)) return fallback;
      return clamp(Math.round(Math.abs(loose) > 6 ? loose : loose * TWIPS_PER_INCH), 0, hi || 22000);
    }

    // ৩) সংখ্যা: ৬-এর বেশি হলে টুইপ, নইলে ইঞ্চি বলা ধরা হয়
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return fallback;
      return clamp(Math.round(Math.abs(value) > 6 ? value : value * TWIPS_PER_INCH), 0, hi || 22000);
    }
    return fallback;
  }

  /** প্যারাগ্রাফের লাইন-পিচ: RTF/DOCX উভয়ের জন্য ভিত্তি (অর্ধ-পয়েন্ট + গুণক) */
  function linePitchTwips(szHalfPt, factor) {
    const sz = clamp(Math.round(finiteOr(szHalfPt, 24)), 8, 96);        // 4pt … 48pt
    const f = clamp(finiteOr(factor, 1.5), 0.8, 3);
    return Math.round((sz / 2) * 20 * f);                                // ১২pt × 1.5 → ৩৬০
  }

  global.FayzarLayoutUnits = {
    TWIPS_PER_INCH,
    MARGIN_MAP,
    MARGIN_CLASS_MAP,
    GAP_MAP,
    clamp,
    finiteOr,
    toTwips,
    margin: (v, fb) => {
      // UI-ক্লাস-নাম ('margin-wide' …) এখানেও স্বীকৃত — এক্সপোর্ট-পাথে কখনো যেন ফলব্যাকে না পড়ে
      const key = String(v === undefined || v === null ? '' : v).trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(MARGIN_CLASS_MAP, key)) return clamp(MARGIN_CLASS_MAP[key], 0, 2880);
      return toTwips(v, fb === undefined ? 720 : fb, MARGIN_MAP, 2880);
    },
    /** UI-ক্লাস-সচেতন মার্জিন-রেজলভার (Studio-কন্ট্রোলার এটাই ডাকে) */
    marginClass: (v, fb) => {
      const key = String(v === undefined || v === null ? '' : v).trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(MARGIN_CLASS_MAP, key)) return clamp(MARGIN_CLASS_MAP[key], 0, 2880);
      return toTwips(v, fb === undefined ? 720 : fb, MARGIN_MAP, 2880);
    },
    gap: (v, fb) => toTwips(v, fb === undefined ? 288 : fb, GAP_MAP, 2880),
    // hi = ৪৩২০ (৩") — হ্যাঙ্গিং/সাব-ইনডেন্ট এতেই সীমাবদ্ধ; raw-twips (যেমন ৮৬৪) অক্ষুণ্ন
    indent: (v, fb) => toTwips(v, fb === undefined ? 432 : fb, null, 4320),
    twips: (v, fb) => toTwips(v, fb, null, 20000),
    // বাংলা ডিজিট ('২') বা '২ কলাম' জাতীয় মানও গণনায় চলে (UI/OCR দুই পাথের জন্যই)
    count: (v, fb, lo, hi) => clamp(Math.round(finiteOr(parseFloat(bnDigits(v)), fb)), lo, hi),
    linePitchTwips,
    /** এক-অঙ্কের ক্রমিকের (১।–৯।) হ্যাঙ্গিং ইনডেন্ট — ০.২" (Part-15.4, সব প্রশ্নপত্র-পথে একই নিয়ম) */
    COMPACT_NUMBER_INDENT: 288,
    /**
     * প্রশ্ন-নম্বর অনুযায়ী হ্যাঙ্গিং ইনডেন্ট: ১–৯ → ০.২" (নম্বরের পরে স্বাভাবিক এক-ফাঁক),
     * ১০ বা বেশি / নম্বরহীন → base (০.৩")। বাংলা/ইংরেজি দুই অঙ্কই চেনে।
     */
    questionIndent: (num, base, compact) => {
      const b = Number.isFinite(+base) && +base > 0 ? +base : 432;
      const c = Number.isFinite(+compact) && +compact > 0 ? +compact : 288;
      const n = parseInt(bnDigits(String(num == null ? '' : num)).replace(/[^\d]/g, ''), 10);
      return Number.isFinite(n) && n >= 1 && n <= 9 ? Math.min(b, c) : b;
    },
    /** DOCX-এর "মাল্টিপল" স্পেসিং (= ২৪০ = single) — ফন্ট-সাইজ-আপেক্ষিক, তাই NaN-মুক্ত */
    docxLineRule: (factor) => Math.round(240 * clamp(finiteOr(factor, 1.5), 0.8, 3))
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.FayzarLayoutUnits;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
