/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Fayzar Exam Renumber — অংশভিত্তিক ধারাবাহিক নম্বরায়ন (Part-13.2)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * কেন কোড-লেভেল (প্রম্পট-লেভেল নয়):
 *   প্রম্পটে "MANDATORY SEQUENTIAL RENUMBERING" চাপালে মডেল কনটেন্ট ফেলে
 *   প্লেসহোল্ডার ("১। সৃজনশীল প্রশ্ন") বানিয়ে দেয় — বাস্তবে ঘটেছে। তাই:
 *     • পার্সার/OCR থেকে ট্রান্সক্রিপ্ট **হুবহু (fidelity)** আসে — মডেল নম্বর বদলায় না;
 *     • চূড়ান্ত প্রশ্নপত্রের ধারাবাহিক নম্বরায়ন এখানে, **coding-ভাবে, নির্ধারক**।
 *
 * নিয়ম:
 *   • প্রতিটি সেকশনে প্রশ্ন-নম্বর ১, ২, ৩, … (সেকশন বদলালে আবার ১ থেকে — CQ/MCQ/Short
 *     প্রতিটি বিভাগ স্বাধীন, such as combined papers).
 *   • ডিজিট-স্টাইল সেকশনের বিদ্যমান নম্বর থেকে অনুমান: বাংলা নম্বর থাকলে বাংলা
 *     (১।, ২। …), নইলে ASCII (1., 2. …) — ইংরেজি প্রশ্নপত্র নষ্ট হয় না।
 *   • উপ-প্রশ্নের লেবেল (ক., খ. …), রোমান স্টেটমেন্ট (i., ii. …), মার্ক, উদ্দীপক,
 *     সেকশন-শিরোনাম — সবই অক্ষত। শুধু `q.num` বদলায়।
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
    if (bn === 0 && en === 0) {
      // Part-18.0: নম্বর নেই ⇒ প্রশ্নের লেখার ভাষা দেখে (ইংরেজি প্রশ্নপত্রে "১." নয়, "1.")
      let bnL = 0, enL = 0;
      for (const q of questions) {
        const t = String((q && (q.text || q.stem)) || '');
        bnL += (t.match(/[ঀ-৿]/g) || []).length;
        enL += (t.match(/[A-Za-z]/g) || []).length;
      }
      if (enL > bnL * 2 && enL > 10) return false;
      return fallback !== false;                           // নইলে ডিফল্ট বাংলা
    }
    return bn >= en;
  }

  /**
   * parsedData.sections[].questions[].num → প্রতি সেকশনে ১..N।
   * @param {object} parsedData  question-engine-এর পার্স-ফল (in-place আপডেট, ফেরতও দেয়)
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

  /**
   * Part-13.3 (রিপোর্ট-১.১): গাইড-বইয়ের পেডাগজিক্যাল লেবেল বাদ — "(সহজমান)",
   * "(মধ্যমান)", "(কঠিনমান)", "(সহজ মান)" … প্রশ্ন ও উপ-প্রশ্নের টেক্সট থেকে।
   * সুরক্ষিত: "[অঙ্কনের চিহ্ন ও বিবরণ আবশ্যক]" — কখনো ছোঁয়া হয় না (এই বাক্যে 'মান' শব্দই নেই)।
   */
  function stripDifficultyTags(text) {
    var s = String(text == null ? '' : text);
    if (!s) return s;
    // সঠিক বানান-সেট: "মধ্যমান" = মধ্যম+ান (ম শেয়ারড) — তাই পূর্ণ-শব্দ অল্টারনেশন
    // বন্ধনীসহ: (সহজমান) (মধ্যমান) [কঠিনমান] (সহজ মান) — literal regex, string-escape নয়
    var RE_BRACKETED = /[\(\[]\s*(?:সহজমান|মধ্যমান|কঠিনমান|সহজ\s+মান|মধ্যম\s+মান|কঠিন\s+মান)\s*[\)\]]/g;
    // বন্ধনীহীন: "লেখো। সহজমান ২" — সীমা-চেকসহ
    var RE_BARE = /(^|[\s।,;:])(?:সহজমান|মধ্যমান|কঠিনমান|সহজ\s+মান|মধ্যম\s+মান|কঠিন\s+মান)(?=$|[\s।,;:\)\]])/g;
    s = s.replace(RE_BRACKETED, '');
    s = s.replace(RE_BARE, '$1');
    // পরিষ্কার: দ্বৈত শ্বাস ও বিরামচিহ্নের আগে ঝুলে-থাকা স্পেস
    return s.replace(/[ \t]{2,}/g, ' ').replace(/\s+(?=[।,;:])/g, '').trim();
  }

  /** parsedData-র প্রশ্ন-টেক্সট-ক্ষেত্রগুলোতে লেবেল-স্ট্রিপ (in-place) */
  function stripDifficultyTagsFromData(parsedData) {
    if (!parsedData || !Array.isArray(parsedData.sections)) return parsedData;
    var fix = stripDifficultyTags;
    for (var si = 0; si < parsedData.sections.length; si++) {
      var sec = parsedData.sections[si];
      if (!sec) continue;
      if (typeof sec.title === 'string') sec.title = fix(sec.title);
      var qs = Array.isArray(sec.questions) ? sec.questions : [];
      for (var qi = 0; qi < qs.length; qi++) {
        var q = qs[qi];
        if (!q) continue;
        if (typeof q.text === 'string') q.text = fix(q.text);
        if (typeof q.preContext === 'string') q.preContext = fix(q.preContext);
        if (typeof q.stimulus === 'string') q.stimulus = fix(q.stimulus);
        if (Array.isArray(q.statements)) q.statements = q.statements.map(fix);
        var subs = Array.isArray(q.subQuestions) ? q.subQuestions : [];
        for (var bi = 0; bi < subs.length; bi++) {
          if (subs[bi] && typeof subs[bi].text === 'string') subs[bi].text = fix(subs[bi].text);
        }
        var opts = Array.isArray(q.options) ? q.options : [];
        for (var oi = 0; oi < opts.length; oi++) {
          if (opts[oi] && typeof opts[oi].text === 'string') opts[oi].text = fix(opts[oi].text);
        }
      }
    }
    return parsedData;
  }

  const api = {
    isExamType: isExamType,
    toBengaliDigits: toBengaliDigits,
    detectBengaliStyle: detectBengaliStyle,
    renumberExamSections: renumberExamSections,
    stripDifficultyTags: stripDifficultyTags,
    stripDifficultyTagsFromData: stripDifficultyTagsFromData
  };

  global.FayzarExamRenumber = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
