/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Fayzar Exam Renumber — অংশভিত্তিক ধারাবাহিক নম্বরায়ন (Part-13.2)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * কেন কোড-লেভেল (প্রম্পট-লেভেল নয়):
 *   প্রম্পটে "MANDATORY SEQUENTIAL RENUMBERING" চাপালে মডেল কনটেন্ট ফেলে
 *   প্লেসহোল্ডার ("১। সৃজনশীল প্রশ্ন") বানিয়ে দেয় — বাস্তবে ঘটেছে। তাই:
 *     • পার্সার/OCR থেকে ট্রান্সক্রিপ্ট **হুবহু (fidelity)** আসে — মডেল নম্বর বদলায় না;
 *     • চূড়ান্ত প্রশ্নপত্রের ধারাবাহিক নম্বরায়ন এখানে, **coding-ভাবে, নির্ধারক**।
 *
 * নিয়ম:
 *   • প্রতিটি সেকশনে প্রশ্ন-নম্বর ১, ২, ৩, … (সেকশন বদলালে আবার ১ থেকে — CQ/MCQ/Short
 *     প্রতিটি বিভাগ স্বাধীন, such as combined papers).
 *   • ডিজিট-স্টাইল সেকশনের বিদ্যমান নম্বর থেকে অনুমান: বাংলা নম্বর থাকলে বাংলা
 *     (১।, ২। …), নইলে ASCII (1., 2. …) — ইংরেজি প্রশ্নপত্র নষ্ট হয় না।
 *   • উপ-প্রশ্নের লেবেল (ক., খ. …), রোমান স্টেটমেন্ট (i., ii. …), মার্ক, উদ্দীপক,
 *     সেকশন-শিরোনাম — সবই অক্ষত। শুধু `q.num` বদলায়।
 *   • ফাংশনটি **idempotent** — আবার চালালে একই ফল (১..N-এ ১..N)।
 *
 * ব্যবহার: FayzarExamRenumber.renumberExamSections(parsedData)
 *         FayzarExamRenumber.isExamType('EXAM_CQ') === true
 */
(function (global) {
  'use strict';

  const BN_DIGITS = '\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef';
  const BN_SET = BN_DIGITS;

  /** 'EXAM_CQ' / 'exam_mcq' / 'EXAM_COMBINED' … → true; STAMP_DEED/GOVT_APP → false */
  function isExamType(t) {
    return /^EXAM[_\s-]?/i.test(String(t == null ? '' : t).trim());
  }

  /** 3 → '৩' (ASCII সংখ্যা → বাংলা ডিজিট) */
  function toBengaliDigits(n) {
    return String(n).replace(/[0-9]/g, (d) => BN_DIGITS[+d]);
  }

  /**
   * সেকশনের বিদ্যমান নম্বর দেখে ডিজিট-স্টাইল ঠিক করে: বাংলা না ASCII?
   * দুটোই থাকলে / কিছু না থাকলে → বাংলা (এঞ্জিনের প্রধান ভাষা-প্রোফাইল)।
   */
  function detectBengaliStyle(questions, fallback) {
    let bn = 0, en = 0;
    for (const q of questions) {
      const s = String((q && q.num) || '');
      for (const ch of s) {
        if (BN_SET.indexOf(ch) >= 0) bn++;
        else if (/[0-9]/.test(ch)) en++;
      }
    }
    if (bn === 0 && en === 0) return fallback !== false;   // নম্বর নেই → ডিফল্ট বাংলা
    return bn >= en;
  }

  /**
   * parsedData.sections[].questions[].num → প্রতি সেকশনে ১..N।
   * @param {object} parsedData  question-engine-এর পার্স-ফল (in-place আপডেট, ফেরতও দেয়)
   * @param {object} [opts]      { style: 'bn'|'ascii' } — জোর করে ডিজিট-স্টাইল চাপাতে চাইলে
   */
  function renumberExamSections(parsedData, opts) {
    const sections = parsedData && parsedData.sections;
    if (!Array.isArray(sections)) return parsedData;
    const force = (opts && (opts.style === 'bn' || opts.style === 'ascii')) ? opts.style : null;

    for (const sec of sections) {
      const qs = (sec && Array.isArray(sec.questions)) ? sec.questions : [];
      if (!qs.length) continue;
      const useBn = force ? (force === 'bn') : detectBengaliStyle(qs, true);
      qs.forEach((q, i) => {
        if (!q) return;
        q.num = useBn ? toBengaliDigits(i + 1) : String(i + 1);
      });
    }
    return parsedData;
  }

  const api = {
    isExamType: isExamType,
    toBengaliDigits: toBengaliDigits,
    detectBengaliStyle: detectBengaliStyle,
    renumberExamSections: renumberExamSections
  };

  global.FayzarExamRenumber = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
