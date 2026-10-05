/**
 * Fayzar — Word 2003 EQ-ফিল্ড RTF বিল্ডার (FayzarEqFieldRtf)
 * ==========================================================
 * EquationConverter.latexToEqField()-এর আউটপুট (যেমন `\F(৩,৫) + \R(,x\S\up4(2))`) থেকে
 * RTF `{\field{\*\fldinst EQ …}{\fldrslt }}` তৈরি করে।
 *
 * Part-15.5 (ব্যবহারকারীর রিপোর্ট: .doc-এ সমীকরণ "(৩,৫)", "(1,P)" হয়ে আসছিল):
 *  - RTF-এ লিটারাল ব্যাকস্ল্যাশ = `\\`। আগে EQ-সুইচ একক `\F` হিসেবে লেখা হতো ⇒ RTF-পার্সার
 *    সেটিকে অজানা কন্ট্রোল-ওয়ার্ড ধরে ফেলে দিত ⇒ Word শুধু "EQ (3,5)" পেত (ভগ্নাংশ/মূল/ঘাত হারাত)।
 *    এখন সুইচ `\\F(`, `\\R(`, `\\S\\up4(` — Word নিজে যেভাবে লেখে।
 *  - চলক-অক্ষর (x, P, Q) ইটালিক, সংখ্যা/চিহ্ন/সুইচ/ফাংশন-নাম (sin, log…) খাড়া —
 *    পুরনো docx→doc পথের `_styleEqCodeLetters` নিয়মের RTF-সমতুল্য।
 *
 * Part-15.1: বিজয় (SutonnyMJ) মোডে ফিল্ড-কোড ফন্ট-রানে ভাগ — ল্যাটিন/চিহ্ন → \f1 (TNR),
 * বাংলা অঙ্ক/অক্ষর → বিজয়-রূপান্তর করে \f0 (SutonnyMJ)। ইউনিকোড মোডে একক রান।
 */
(function (global) {
  'use strict';

  const BN_RE = /[ঀ-৿]+/g;
  const FUNC_RE = /^(?:sin|cos|tan|cot|sec|csc|cosec|log|ln|lg|lim|max|min|exp|det|mod|gcd|lcm)$/i;

  // export-dual-engine-এর escapeUnicodeRtf-এর সমতুল্য (ব্যাকস্ল্যাশ/ব্রেস + নন-ASCII → \uN?)
  function escapeUnicodeRtf(s) {
    let out = '';
    for (const ch of String(s == null ? '' : s)) {
      const c = ch.codePointAt(0);
      if (ch === '\\' || ch === '{' || ch === '}') out += '\\' + ch;
      else if (c > 127) {
        if (c > 0xFFFF) {
          const hi = Math.floor((c - 0x10000) / 0x400) + 0xD800, lo = ((c - 0x10000) % 0x400) + 0xDC00;
          out += '\\u' + (hi > 32767 ? hi - 65536 : hi) + '?\\u' + (lo > 32767 ? lo - 65536 : lo) + '?';
        } else out += '\\u' + (c > 32767 ? c - 65536 : c) + '?';
      } else out += ch;
    }
    return out;
  }

  /**
   * RTF-escaped লেখায় চলক-অক্ষরকে `{\i …}`-এ মোড়ানো। বাদ যায়:
   *  `\\F`, `\\S\\up4` (escaped EQ-সুইচ), `\super`, `\fs16`, `\u960?` (RTF কন্ট্রোল-ওয়ার্ড),
   *  ফাংশন-নাম (sin, log…), সংখ্যা ও চিহ্ন।
   */
  function italicVars(escaped) {
    return String(escaped == null ? '' : escaped).replace(
      /(\\\\[A-Za-z]+\d*)|(\\[A-Za-z]+-?\d*\??)|([A-Za-z]+)/g,
      (m, eqSwitch, ctrl, word) => {
        if (eqSwitch || ctrl) return m;
        return FUNC_RE.test(word) ? word : '{\\i ' + word + '}';
      }
    );
  }

  /**
   * ফিল্ড-কোডকে রানে ভাগ: { t, bn (বাংলা), small (`\S\up(…)`/`\S\do(…)`-এর আর্গুমেন্ট) }।
   * Part-15.6: EQ-ফিল্ডের ঘাত/পদ আগে পূর্ণ ১২pt-এ উঠে বসত — এখন কেবল আর্গুমেন্টটুকু scriptSz (৮pt)।
   */
  function splitRuns(src) {
    const s = String(src == null ? '' : src);
    const flags = [];
    const stack = [];   // প্রতিটি খোলা script-আর্গুমেন্টের বন্ধনী-গভীরতা
    for (let i = 0; i < s.length; i++) {
      const m = /^\\S\\(?:up|do)\d*\(/.exec(s.slice(i, i + 12));
      if (m) {
        for (let k = 0; k < m[0].length; k++) flags.push({ ch: s[i + k], small: stack.length > 0 });
        stack.push(1);
        i += m[0].length - 1;
        continue;
      }
      const ch = s[i];
      if (stack.length) {
        if (ch === '(') stack[stack.length - 1]++;
        else if (ch === ')') {
          stack[stack.length - 1]--;
          if (stack[stack.length - 1] === 0) { stack.pop(); flags.push({ ch, small: stack.length > 0 }); continue; }
        }
      }
      flags.push({ ch, small: stack.length > 0 });
    }
    const runs = [];
    for (const f of flags) {
      const bn = /[ঀ-৿]/.test(f.ch);
      const last = runs[runs.length - 1];
      if (last && last.bn === bn && last.small === f.small) last.t += f.ch;
      else runs.push({ t: f.ch, bn, small: f.small });
    }
    return runs;
  }

  const FayzarEqFieldRtf = {
    italicVars,
    splitRuns,

    /**
     * @param {string} eq   latexToEqField()-এর কাঁচা আউটপুট
     * @param {object} opt  { isBijoy, toBijoy(text)→ANSI, escapeRtf(text), bnFont:'\\f0', latinFont:'\\f1' }
     * @returns {string}    সম্পূর্ণ RTF ফিল্ড-গ্রুপ
     */
    build(eq, opt) {
      const o = opt || {};
      const src = String(eq == null ? '' : eq);
      const latinFont = o.latinFont || '\\f1';
      const bnFont = o.bnFont || '\\f0';
      const small = '\\fs' + (Number.isFinite(+o.scriptSz) && +o.scriptSz >= 8 ? Math.round(+o.scriptSz) : 16);
      const toBijoy = typeof o.toBijoy === 'function' ? o.toBijoy : (t) => t;
      const escAnsi = typeof o.escapeRtf === 'function' ? o.escapeRtf : escapeUnicodeRtf;
      let runs = splitRuns(src);
      // ইউনিকোড মোডে ফন্ট-ভাগের দরকার নেই — শুধু ঘাত-আর্গুমেন্টের (small) সীমায় রান ভাঙে
      if (!o.isBijoy) {
        runs = runs.reduce((acc, r) => {
          const l = acc[acc.length - 1];
          if (l && l.small === r.small) l.t += r.t; else acc.push({ t: r.t, bn: false, small: r.small });
          return acc;
        }, []);
      }
      let inst = '';
      for (const r of runs) {
        const sz = r.small ? small : '';
        if (r.bn && o.isBijoy) inst += '{' + bnFont + sz + ' ' + escAnsi(toBijoy(r.t)) + '}';
        else inst += '{' + latinFont + sz + ' ' + italicVars(escapeUnicodeRtf(r.t)) + '}';
      }
      return '{\\field{\\*\\fldinst EQ ' + inst + '}{\\fldrslt }}';
    }
  };

  global.FayzarEqFieldRtf = FayzarEqFieldRtf;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarEqFieldRtf;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
