/**
 * Fayzar — হুবহু-লেআউট লাইন-আঁটানো (FayzarLineFit) — WORK_PLAN B5
 * নকশার (IR) এক-লাইনের বা হাতে-ভাঙা লাইনের অনুচ্ছেদ আউটপুট-ফন্টে মাপা প্রস্থে ঘরের প্রাপ্য প্রস্থে না আঁটলে
 * Word লাইন ভাঙত ⇒ উচ্চতা বাড়ত, পাতা উপচাত (g01 ট্যাগলাইন: ঘর ৩৯৯pt, ইনডেন্টের পরে ৩৬৮pt, লেখা ≈৩৯৪pt)।
 * ধাপ: ১) ইনডেন্ট / কেন্দ্র-সরণ / ডান-ইনডেন্ট যতটুকু দরকার কমানো; ২) তবুও না আঁটলে ফন্ট সামান্য ছোট (≥৮৫%)।
 * measure(text, bold) = ১০০px আকারে লেখার প্রস্থ (faithful-pipeline-এর textMeasurer)।
 */
(function (global) {
  'use strict';

  const SAFE = 0.98;        // Word-রেন্ডারিং আর ক্যানভাস-মাপের পার্থক্যের ছাড়
  const MIN_SCALE = 0.85;   // এর চেয়ে বেশি ছোট করা নয় (পড়া কঠিন হবে; তখন ভাঙতে দেওয়া)
  const BOLD = 1.02;        // বাংলা মোটা অক্ষর (কৃত্রিম bold) সামান্য চওড়া
  const FILL = /([._\-…·─])\1{5,}/;
  const FILL_G = /([._\-…·─])\1{5,}/g;

  // B7: হুবহু-মোডে ইউনিকোড ফন্ট বাছাই ও প্রস্থ-অনুপাত (সুইচ __FZ_ON_FONTPICK)
  const FONT_WIDTH_RATIOS = {
    Kalpurush: 1.00,
    SutonnyOMJ: 0.94,
    Nikosh: 0.96,
    SolaimanLipi: 0.95
  };
  let _activeFitFont = null;
  function isFontPickOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_FONTPICK)) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_FONTPICK)) return true;
    if (global && Boolean(global.__FZ_ON_FONTPICK)) return true;
    if (typeof process !== 'undefined' && process && process.env && (process.env.__FZ_ON_FONTPICK === '1' || process.env.__FZ_ON_FONTPICK === 'true')) return true;
    return false;
  }
  // A01_WRAP_v1: মূলে এক-লাইনের বাক্য Word-এ ভেঙে দুই লাইন হওয়া রোধের সুইচ (__FZ_ON_WRAPFIT / FZ_ON=WRAPFIT)
  const SPACING_KAR_RE = /[\u0982\u0983\u09be-\u09c0\u09c7\u09c8\u09cb\u09cc\u09d7]/g;
  const TAIL_AFTER_FILL_RE = /([._\-…·─])\1{5,}\s*\S/;
  function isWrapFitOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_WRAPFIT)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_WRAPFIT)) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_WRAPFIT)) return true;
    if (global && Boolean(global.__FZ_ON_WRAPFIT)) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_WRAPFIT === '1' || process.env.__FZ_ON_WRAPFIT === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('WRAPFIT')) return true;
    }
    return false;
  }
  // LINEGAP_v1: প্রতিটি ব্লকের আউটপুট উচ্চতা মাপা উচ্চতার (rect.h) মধ্যে সীমাবদ্ধ রাখা ও উল্লম্ব সরণ (dy) রোধের সুইচ (__FZ_ON_LINEGAP / FZ_ON=LINEGAP)
  function isLineGapOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_LINEGAP || (globalThis.window && globalThis.window.__FZ_OFF_LINEGAP))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_LINEGAP)) return false;
    if (global && Boolean(global.__FZ_OFF_LINEGAP || (global.window && global.window.__FZ_OFF_LINEGAP))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_LINEGAP === '1' || process.env.__FZ_OFF_LINEGAP === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('LINEGAP')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_LINEGAP || (globalThis.window && globalThis.window.__FZ_ON_LINEGAP))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_LINEGAP)) return true;
    if (global && Boolean(global.__FZ_ON_LINEGAP || (global.window && global.window.__FZ_ON_LINEGAP))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_LINEGAP === '1' || process.env.__FZ_ON_LINEGAP === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('LINEGAP')) return true;
    }
    return false;
  }
  // A04_PAGES_v1: বহু-কলাম রেজিস্টার ছক ও প্রবাহী অনুচ্ছেদে পাতা-উপচানো রোধের সুইচ (__FZ_ON_PAGES4 / FZ_ON=PAGES4)
  function isPages4On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_PAGES4)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_PAGES4 || (globalThis.window && globalThis.window.__FZ_ON_PAGES4))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_PAGES4)) return true;
    if (global && Boolean(global.__FZ_ON_PAGES4)) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_PAGES4 === '1' || process.env.__FZ_ON_PAGES4 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('PAGES4')) return true;
    }
    return false;
  }
  // A19_EXTRALINES_v1: মূলের তুলনায় Word-এ বাড়তি লাইন ও উল্লম্ব সরণ রোধের সুইচ (__FZ_ON_EXTRALINES / FZ_ON=EXTRALINES)
  function isExtraLinesOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_EXTRALINES)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_EXTRALINES || (globalThis.window && globalThis.window.__FZ_ON_EXTRALINES))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_EXTRALINES)) return true;
    if (global && Boolean(global.__FZ_ON_EXTRALINES)) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_EXTRALINES === '1' || process.env.__FZ_ON_EXTRALINES === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('EXTRALINES')) return true;
    }
    return false;
  }
  // A10_LINES_v1: মূলের লাইন-ভাঙা, লাইন-দূরত্ব ও অবস্থান অক্ষত রাখার সুইচ (__FZ_ON_A10LINES / FZ_ON=A10LINES)
  function isA10LinesOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A10LINES)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A10LINES || (globalThis.window && globalThis.window.__FZ_ON_A10LINES))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A10LINES)) return true;
    if (global && Boolean(global.__FZ_ON_A10LINES || (global.window && global.window.__FZ_ON_A10LINES))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A10LINES === '1' || process.env.__FZ_ON_A10LINES === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A10LINES')) return true;
    }
    return false;
  }
  // A17_P1LOSS_v1: পাতা ১-এর হারিয়ে যাওয়া ড্যাশ-ঘেরা স্লিপ/কার্ডের বক্স ও লাইন পুনরুদ্ধার সুইচ (__FZ_ON_P1LOSS / FZ_ON=P1LOSS)
  function isP1LossOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_P1LOSS)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_P1LOSS || (globalThis.window && globalThis.window.__FZ_ON_P1LOSS))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_P1LOSS)) return true;
    if (global && Boolean(global.__FZ_ON_P1LOSS || (global.window && global.window.__FZ_ON_P1LOSS))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_P1LOSS === '1' || process.env.__FZ_ON_P1LOSS === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('P1LOSS')) return true;
    }
    return false;
  }
  // A01_REGRESS_v1: উত্তরাধিকার সনদ ফরমের লাইন-মোড়ানো, ফাঁকা-রেখা ও উল্লম্ব অবস্থান সংশোধনের সুইচ (__FZ_ON_A01FIX / FZ_ON=A01FIX)
  function isA01FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A01FIX)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A01FIX || (globalThis.window && globalThis.window.__FZ_ON_A01FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A01FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A01FIX || (global.window && global.window.__FZ_ON_A01FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A01FIX === '1' || process.env.__FZ_ON_A01FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A01FIX')) return true;
    }
    return false;
  }
  // A05_DRIFT_v1: পাতা-২-এ লাইন সংখ্যা বৃদ্ধি ও উল্লম্ব সরণ রোধের সুইচ (__FZ_ON_P2DRIFT / FZ_ON=P2DRIFT)
  function isP2DriftOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_P2DRIFT)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_P2DRIFT || (globalThis.window && globalThis.window.__FZ_ON_P2DRIFT))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_P2DRIFT)) return true;
    if (global && Boolean(global.__FZ_ON_P2DRIFT || (global.window && global.window.__FZ_ON_P2DRIFT))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_P2DRIFT === '1' || process.env.__FZ_ON_P2DRIFT === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('P2DRIFT')) return true;
    }
    return false;
  }
  // A02_RULES_v1: রেখা/বাক্স, ছকের বর্ডার ও উচ্চতা মূলের সাথে মেলানোর সুইচ (__FZ_ON_RULEFIX / FZ_ON=RULEFIX)
  function isRuleFixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_RULEFIX)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_RULEFIX || (globalThis.window && globalThis.window.__FZ_ON_RULEFIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_RULEFIX)) return true;
    if (global && Boolean(global.__FZ_ON_RULEFIX || (global.window && global.window.__FZ_ON_RULEFIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_RULEFIX === '1' || process.env.__FZ_ON_RULEFIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('RULEFIX')) return true;
    }
    return false;
  }
  // A02_RULES_v2: পাতা-ফ্রেম, খাড়া চিত্র-দণ্ড, সংখ্যা-বাক্স ও ছকের বর্ডার মূলের সাথে মেলানোর সুইচ (__FZ_ON_RULES2 / FZ_ON=RULES2, বন্ধ: __FZ_OFF_RULES2)
  function isRules2On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_RULES2 || (globalThis.window && globalThis.window.__FZ_OFF_RULES2))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_RULES2)) return false;
    if (global && Boolean(global.__FZ_OFF_RULES2 || (global.window && global.window.__FZ_OFF_RULES2))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_RULES2 === '1' || process.env.__FZ_OFF_RULES2 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('RULES2')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_RULES2 || (globalThis.window && globalThis.window.__FZ_ON_RULES2))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_RULES2)) return true;
    if (global && Boolean(global.__FZ_ON_RULES2 || (global.window && global.window.__FZ_ON_RULES2))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_RULES2 === '1' || process.env.__FZ_ON_RULES2 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('RULES2')) return true;
    }
    return false;
  }
  // NESTBOX_v1: মাপা অনুভূমিক ও উল্লম্ব রেখা থেকে বন্ধ আয়তক্ষেত্র শনাক্তকরণ, ঘরের ভেতরে নেস্টেড টেবিল ও পাশাপাশি আলাদা বক্স পুনরুদ্ধার সুইচ (__FZ_ON_NESTBOX / FZ_ON=NESTBOX)
  function isNestBoxOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_NESTBOX || (globalThis.window && globalThis.window.__FZ_OFF_NESTBOX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_NESTBOX)) return false;
    if (global && Boolean(global.__FZ_OFF_NESTBOX || (global.window && global.window.__FZ_OFF_NESTBOX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_NESTBOX === '1' || process.env.__FZ_OFF_NESTBOX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('NESTBOX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_NESTBOX || (globalThis.window && globalThis.window.__FZ_ON_NESTBOX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_NESTBOX)) return true;
    if (global && Boolean(global.__FZ_ON_NESTBOX || (global.window && global.window.__FZ_ON_NESTBOX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_NESTBOX === '1' || process.env.__FZ_ON_NESTBOX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('NESTBOX')) return true;
    }
    return false;
  }
  // A03_SCORE_v1: পেনশন ফরম ও বহু-বাক্স/দ্বি-কলাম ফরমের বক্স-ফ্রেম, খাড়া/অনুভূমিক বিভাজক রেখা, ট্যাব-কলাম ও লাইন-ভাঙা পুনরুদ্ধার সুইচ (__FZ_ON_A03FIX / FZ_ON=A03FIX)
  function isA03FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A03FIX || (globalThis.window && globalThis.window.__FZ_OFF_A03FIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A03FIX)) return false;
    if (global && Boolean(global.__FZ_OFF_A03FIX || (global.window && global.window.__FZ_OFF_A03FIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A03FIX === '1' || process.env.__FZ_OFF_A03FIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A03FIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A03FIX || (globalThis.window && globalThis.window.__FZ_ON_A03FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A03FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A03FIX || (global.window && global.window.__FZ_ON_A03FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A03FIX === '1' || process.env.__FZ_ON_A03FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A03FIX')) return true;
    }
    return false;
  }
  // A17_SCORE_v1: নমুনা a17 ও সমজাতীয় বহু-স্লিপ/ছক ফরমের স্থূল ত্রুটি সংশোধনের সুইচ (__FZ_ON_A17FIX / FZ_ON=A17FIX)
  function isA17FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A17FIX)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A17FIX || (globalThis.window && globalThis.window.__FZ_ON_A17FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A17FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A17FIX || (global.window && global.window.__FZ_ON_A17FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A17FIX === '1' || process.env.__FZ_ON_A17FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A17FIX')) return true;
    }
    return false;
  }
  // A14_SCORE_v1: নমুনা a14 ও সমগোত্রীয় ফরমের বহু-লাইনের পূরণ-অনুচ্ছেদ, জোড়া প্রত্যয়ন-বাক্স ছক ও ক্রমিক তালিকা মেরামতের সুইচ (__FZ_ON_A14FIX / FZ_ON=A14FIX)
  function isA14FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A14FIX)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A14FIX || (globalThis.window && globalThis.window.__FZ_ON_A14FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A14FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A14FIX || (global.window && global.window.__FZ_ON_A14FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A14FIX === '1' || process.env.__FZ_ON_A14FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A14FIX')) return true;
    }
    return false;
  }
  // A07_SCORE_v1: ছকের খণ্ডিত আড়া-রেখা ও হারানো ফাঁকা সারি পুনরুদ্ধার, দাগহীন বাড়তি কলাম ট্যাবে ভাঁজ, বহু-লাইনের ফরম-ছকের ফন্ট/লাইন-দূরত্ব ও দ্বি-কলাম স্বাক্ষর সংশোধনের সুইচ (__FZ_ON_A07FIX / FZ_ON=A07FIX)
  function isA07FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A07FIX)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A07FIX || (globalThis.window && globalThis.window.__FZ_ON_A07FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A07FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A07FIX || (global.window && global.window.__FZ_ON_A07FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A07FIX === '1' || process.env.__FZ_ON_A07FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A07FIX')) return true;
    }
    return false;
  }
  // A07_SCORE_v2: নমুনা a07 ও সমগোত্রীয় বহু-পাতার পদোন্নতি/প্রত্যয়ন ছক-ফরমের জ্যামিতিক ও কাঠামোগত মেরামতের সুইচ (__FZ_ON_A07FIX2 / FZ_ON=A07FIX2)
  function isA07Fix2On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A07FIX2 || (globalThis.window && globalThis.window.__FZ_OFF_A07FIX2))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A07FIX2)) return false;
    if (global && Boolean(global.__FZ_OFF_A07FIX2 || (global.window && global.window.__FZ_OFF_A07FIX2))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A07FIX2 === '1' || process.env.__FZ_OFF_A07FIX2 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A07FIX2')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A07FIX2 || (globalThis.window && globalThis.window.__FZ_ON_A07FIX2))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A07FIX2)) return true;
    if (global && Boolean(global.__FZ_ON_A07FIX2 || (global.window && global.window.__FZ_ON_A07FIX2))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A07FIX2 === '1' || process.env.__FZ_ON_A07FIX2 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A07FIX2')) return true;
    }
    return false;
  }
  // A19_SCORE_v1: নমুনা a19 ও সমগোত্রীয় ফরমের উন্মুক্ত-পাশের ছক-বর্ডার, নির্দেশনা-বাক্স, বিভক্ত ক্রমিক ব্লক, বহু-লাইন ইনডেন্ট/পিচ ও জাস্টিফাইড ঘর মেরামতের সুইচ (__FZ_ON_A19FIX / FZ_ON=A19FIX)
  function isA19FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A19FIX || (globalThis.window && globalThis.window.__FZ_OFF_A19FIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A19FIX)) return false;
    if (global && Boolean(global.__FZ_OFF_A19FIX || (global.window && global.window.__FZ_OFF_A19FIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A19FIX === '1' || process.env.__FZ_OFF_A19FIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A19FIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A19FIX || (globalThis.window && globalThis.window.__FZ_ON_A19FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A19FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A19FIX || (global.window && global.window.__FZ_ON_A19FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A19FIX === '1' || process.env.__FZ_ON_A19FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A19FIX')) return true;
    }
    return false;
  }
  // A16_SCORE_v1: চেকলিস্ট ছকের খণ্ডিত/ছাঁটা আড়া-রেখা ও ২-লাইনের সারি পুনরুদ্ধার, নেস্টেড উপ-ছকের দ্বৈত বর্ডার রোধ, পাশাপাশি ছক একত্রীকরণ রোধ এবং পাতা ১-এর ঝুলন্ত ক্রমিক তালিকা, ইউ.ও. নোটের রেখা ও অণু-স্বাক্ষর চিত্র সংশোধনের সুইচ (__FZ_ON_A16FIX / FZ_ON=A16FIX)
  function isA16FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A16FIX)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A16FIX || (globalThis.window && globalThis.window.__FZ_ON_A16FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A16FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A16FIX || (global.window && global.window.__FZ_ON_A16FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A16FIX === '1' || process.env.__FZ_ON_A16FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A16FIX')) return true;
    }
    return false;
  }
  // A11_SCORE_v1: নমুনা a11 ও সমগোত্রীয় আবেদন/সনদ ফরমের স্থূল বাগ সংশোধনের সুইচ (__FZ_ON_A11FIX / FZ_ON=A11FIX)
  function isA11FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A11FIX)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A11FIX || (globalThis.window && globalThis.window.__FZ_ON_A11FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A11FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A11FIX || (global.window && global.window.__FZ_ON_A11FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A11FIX === '1' || process.env.__FZ_ON_A11FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A11FIX')) return true;
    }
    return false;
  }
  // A10_SCORE_v1: প্রাক চাকরি বৃত্তান্ত যাচাই ফরম ও সমজাতীয় বহু-পাতার ফরমের স্থূল লেআউট ত্রুটি সংশোধনের সুইচ (__FZ_ON_A10FIX / FZ_ON=A10FIX)
  function isA10FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A10FIX)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A10FIX || (globalThis.window && globalThis.window.__FZ_ON_A10FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A10FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A10FIX || (global.window && global.window.__FZ_ON_A10FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A10FIX === '1' || process.env.__FZ_ON_A10FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A10FIX')) return true;
    }
    return false;
  }
  // TABLE_MERGE_v1: মাপা রেখা থেকে ছকের প্রকৃত কলাম-গ্রিড, আড়াআড়ি ও উল্লম্ব ঘর-জোড়া (gridSpan/vMerge), ঘরের প্যাডিং ও সারি-উচ্চতা নির্ধারণের সুইচ (__FZ_ON_TBLMERGE / FZ_ON=TBLMERGE)
  function isTblMergeOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_TBLMERGE || (globalThis.window && globalThis.window.__FZ_OFF_TBLMERGE))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_TBLMERGE)) return false;
    if (global && Boolean(global.__FZ_OFF_TBLMERGE || (global.window && global.window.__FZ_OFF_TBLMERGE))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_TBLMERGE === '1' || process.env.__FZ_OFF_TBLMERGE === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('TBLMERGE')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_TBLMERGE || (globalThis.window && globalThis.window.__FZ_ON_TBLMERGE))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_TBLMERGE)) return true;
    if (global && Boolean(global.__FZ_ON_TBLMERGE || (global.window && global.window.__FZ_ON_TBLMERGE))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_TBLMERGE === '1' || process.env.__FZ_ON_TBLMERGE === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('TBLMERGE')) return true;
    }
    return false;
  }
  // ROTTEXT_v1: হুবহু মোডে ছকের ঘরে ঘোরানো (খাড়া) লেখা শনাক্তকরণ ও রেন্ডারিং সুইচ (__FZ_ON_ROTTEXT / FZ_ON=ROTTEXT)
  function isRotTextOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_ROTTEXT)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_ROTTEXT || (globalThis.window && globalThis.window.__FZ_ON_ROTTEXT))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_ROTTEXT)) return true;
    if (global && Boolean(global.__FZ_ON_ROTTEXT || (global.window && global.window.__FZ_ON_ROTTEXT))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_ROTTEXT === '1' || process.env.__FZ_ON_ROTTEXT === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('ROTTEXT')) return true;
    }
    return false;
  }
  // VSPACE_v1: হুবহু মোডে লাইনের উল্লম্ব ফাঁক, সারি-উচ্চতা, বহু-লাইনের ঘরের পিচ, শিরোনাম-ফন্ট ও চিত্রের উচ্চতা মূলের সাথে মেলানোর সুইচ (__FZ_ON_VSPACE / FZ_ON=VSPACE)
  function isVSpaceOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_VSPACE || (globalThis.window && globalThis.window.__FZ_OFF_VSPACE))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_VSPACE)) return false;
    if (global && Boolean(global.__FZ_OFF_VSPACE || (global.window && global.window.__FZ_OFF_VSPACE))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_VSPACE === '1' || process.env.__FZ_OFF_VSPACE === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('VSPACE')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_VSPACE || (globalThis.window && globalThis.window.__FZ_ON_VSPACE))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_VSPACE)) return true;
    if (global && Boolean(global.__FZ_ON_VSPACE || (global.window && global.window.__FZ_ON_VSPACE))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_VSPACE === '1' || process.env.__FZ_ON_VSPACE === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('VSPACE')) return true;
    }
    return false;
  }
  // A14_BOXSPLIT_v2: ফ্রেম-বাক্স এক-কলামে রাখা ও ডান-ট্যাবে স্বাক্ষর-লেবেল সুইচ (__FZ_ON_BOXSPLIT বা FZ_ON=BOXSPLIT)
  function boxSplitOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_BOXSPLIT)) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_BOXSPLIT)) return false;
    if (global && Boolean(global.__FZ_OFF_BOXSPLIT)) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_BOXSPLIT === '1' || process.env.__FZ_OFF_BOXSPLIT === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('BOXSPLIT')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_BOXSPLIT || (globalThis.window && globalThis.window.__FZ_ON_BOXSPLIT))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_BOXSPLIT)) return true;
    if (global && Boolean(global.__FZ_ON_BOXSPLIT)) return true;
    if (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_BOXSPLIT === '1' ||
      process.env.__FZ_ON_BOXSPLIT === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('BOXSPLIT'))
    )) return true;
    return false;
  }
  // INDENT_v1: লাইনের বাম প্রান্ত (dx0: ইনডেন্ট, অ্যালাইনমেন্ট, ট্যাব-স্টপ, ঘরের প্যাডিং) ও ডান প্রান্ত (dx1) নিখুঁত করার সুইচ (__FZ_ON_INDENT / FZ_ON=INDENT)
  function isIndentOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_INDENT || (globalThis.window && globalThis.window.__FZ_OFF_INDENT))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_INDENT)) return false;
    if (global && Boolean(global.__FZ_OFF_INDENT || (global.window && global.window.__FZ_OFF_INDENT))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_INDENT === '1' || process.env.__FZ_OFF_INDENT === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('INDENT')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_INDENT || (globalThis.window && globalThis.window.__FZ_ON_INDENT))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_INDENT)) return true;
    if (global && Boolean(global.__FZ_ON_INDENT || (global.window && global.window.__FZ_ON_INDENT))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_INDENT === '1' || process.env.__FZ_ON_INDENT === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('INDENT')) return true;
    }
    return false;
  }
  // WIDTH_v1: হুবহু মোডে লাইনের প্রস্থ ও ডান-প্রান্ত (dx1) মূলের সাথে মেলানোর সুইচ (__FZ_ON_WIDTH / FZ_ON=WIDTH)
  function isWidthOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_WIDTH || (globalThis.window && globalThis.window.__FZ_OFF_WIDTH))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_WIDTH)) return false;
    if (global && Boolean(global.__FZ_OFF_WIDTH || (global.window && global.window.__FZ_OFF_WIDTH))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_WIDTH === '1' || process.env.__FZ_OFF_WIDTH === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('WIDTH')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_WIDTH || (globalThis.window && globalThis.window.__FZ_ON_WIDTH))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_WIDTH)) return true;
    if (global && Boolean(global.__FZ_ON_WIDTH || (global.window && global.window.__FZ_ON_WIDTH))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_WIDTH === '1' || process.env.__FZ_ON_WIDTH === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('WIDTH')) return true;
    }
    return false;
  }
  // A14_SCORE_v3: পাতা ৩ ও পাতা ১/২-এর লাইন-উচ্চতা, বাম-প্রান্ত, হঠাৎ লাফ ও বক্স-রেখা সংশোধনের সুইচ (__FZ_ON_A14FIX3 / FZ_ON=A14FIX3)
  function isA14Fix3On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A14FIX3 || (globalThis.window && globalThis.window.__FZ_OFF_A14FIX3))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A14FIX3)) return false;
    if (global && Boolean(global.__FZ_OFF_A14FIX3 || (global.window && global.window.__FZ_OFF_A14FIX3))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A14FIX3 === '1' || process.env.__FZ_OFF_A14FIX3 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A14FIX3')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A14FIX3 || (globalThis.window && globalThis.window.__FZ_ON_A14FIX3))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A14FIX3)) return true;
    if (global && Boolean(global.__FZ_ON_A14FIX3 || (global.window && global.window.__FZ_ON_A14FIX3))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A14FIX3 === '1' || process.env.__FZ_ON_A14FIX3 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A14FIX3')) return true;
    }
    return false;
  }
  // FONT_v1: হুবহু-মোডে লাইন-উচ্চতা ও ফন্ট-আকার মূলের সাথে মেলানোর সুইচ (__FZ_ON_FONTFIX / FZ_ON=FONTFIX)
  // A03_SCORE_v3: পাতা ১ ও ২-এর কালো শিরোনাম-ব্যানার প্রস্থ/উচ্চতা/অবস্থান, চেকবক্স ও মাস-বছর বাক্স, দিন-মাস-বছর ছকের gridSpan, খাড়া বিভাজক রেখা, অবাঞ্ছিত বোল্ড ও স্বাক্ষর-তারিখ বাক্স সংশোধনের সুইচ (__FZ_ON_A03FIX3 / FZ_ON=A03FIX3)
  function isA03Fix3On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A03FIX3 || (globalThis.window && globalThis.window.__FZ_OFF_A03FIX3))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A03FIX3)) return false;
    if (global && Boolean(global.__FZ_OFF_A03FIX3 || (global.window && global.window.__FZ_OFF_A03FIX3))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A03FIX3 === '1' || process.env.__FZ_OFF_A03FIX3 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A03FIX3')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A03FIX3 || (globalThis.window && globalThis.window.__FZ_ON_A03FIX3))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A03FIX3)) return true;
    if (global && Boolean(global.__FZ_ON_A03FIX3 || (global.window && global.window.__FZ_ON_A03FIX3))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A03FIX3 === '1' || process.env.__FZ_ON_A03FIX3 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A03FIX3')) return true;
    }
    return false;
  }

  // A03_SCORE_v4: A03FIX3-এর উপকারী অংশ রেখে উল্লম্ব ড্রিফট নিরসন সুইচ (__FZ_ON_A03FIX4 / FZ_ON=A03FIX4)
  function isA03Fix4On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A03FIX4 || (globalThis.window && globalThis.window.__FZ_OFF_A03FIX4))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A03FIX4)) return false;
    if (global && Boolean(global.__FZ_OFF_A03FIX4 || (global.window && global.window.__FZ_OFF_A03FIX4))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A03FIX4 === '1' || process.env.__FZ_OFF_A03FIX4 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A03FIX4')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A03FIX4 || (globalThis.window && globalThis.window.__FZ_ON_A03FIX4))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A03FIX4)) return true;
    if (global && Boolean(global.__FZ_ON_A03FIX4 || (global.window && global.window.__FZ_ON_A03FIX4))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A03FIX4 === '1' || process.env.__FZ_ON_A03FIX4 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A03FIX4')) return true;
    }
    return false;
  }

  function isFontFixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_FONTFIX || (globalThis.window && globalThis.window.__FZ_OFF_FONTFIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_FONTFIX)) return false;
    if (global && Boolean(global.__FZ_OFF_FONTFIX || (global.window && global.window.__FZ_OFF_FONTFIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_FONTFIX === '1' || process.env.__FZ_OFF_FONTFIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('FONTFIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_FONTFIX || (globalThis.window && globalThis.window.__FZ_ON_FONTFIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_FONTFIX)) return true;
    if (global && Boolean(global.__FZ_ON_FONTFIX || (global.window && global.window.__FZ_ON_FONTFIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_FONTFIX === '1' || process.env.__FZ_ON_FONTFIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('FONTFIX')) return true;
    }
    return false;
  }
  // A16_SCORE_v3: নমুনা a16 ও সমগোত্রীয় চেকলিস্ট/স্মারক ফরমের অণু-স্বাক্ষর চিত্র, স্বাক্ষর-ব্লক, সূচিপত্র ও শিরোনাম সংশোধনের সুইচ (__FZ_ON_A16FIX3 / FZ_ON=A16FIX3)
  function isA16Fix3On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A16FIX3 || (globalThis.window && globalThis.window.__FZ_OFF_A16FIX3))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A16FIX3)) return false;
    if (global && Boolean(global.__FZ_OFF_A16FIX3 || (global.window && global.window.__FZ_OFF_A16FIX3))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A16FIX3 === '1' || process.env.__FZ_OFF_A16FIX3 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A16FIX3')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A16FIX3 || (globalThis.window && globalThis.window.__FZ_ON_A16FIX3))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A16FIX3)) return true;
    if (global && Boolean(global.__FZ_ON_A16FIX3 || (global.window && global.window.__FZ_ON_A16FIX3))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A16FIX3 === '1' || process.env.__FZ_ON_A16FIX3 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A16FIX3')) return true;
    }
    return false;
  }
  // A14_RULES_v1: নমুনা a14 ও সমগোত্রীয় ফরমের রেখা, টেবিল-বর্ডার, বাক্স-ফ্রেম ও আন্ডারলাইনের অবস্থান ও দৈর্ঘ্য নিখুঁত করার সুইচ (__FZ_ON_A14RULES / FZ_ON=A14RULES)
  function isA14RulesOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A14RULES || (globalThis.window && globalThis.window.__FZ_OFF_A14RULES))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A14RULES)) return false;
    if (global && Boolean(global.__FZ_OFF_A14RULES || (global.window && global.window.__FZ_OFF_A14RULES))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A14RULES === '1' || process.env.__FZ_OFF_A14RULES === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A14RULES')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A14RULES || (globalThis.window && globalThis.window.__FZ_ON_A14RULES))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A14RULES)) return true;
    if (global && Boolean(global.__FZ_ON_A14RULES || (global.window && global.window.__FZ_ON_A14RULES))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A14RULES === '1' || process.env.__FZ_ON_A14RULES === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A14RULES')) return true;
    }
    return false;
  }
  // A07_SCORE_v3: নমুনা a07 ও সমগোত্রীয় পদোন্নতি/প্রত্যয়ন ছক-ফরমের মেলেনি এমন লাইন, হঠাৎ লাফ ও বাম-প্রান্ত মেরামতের সুইচ (__FZ_ON_A07FIX3 / FZ_ON=A07FIX3)
  function isA07Fix3On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A07FIX3 || (globalThis.window && globalThis.window.__FZ_OFF_A07FIX3))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A07FIX3)) return false;
    if (global && Boolean(global.__FZ_OFF_A07FIX3 || (global.window && global.window.__FZ_OFF_A07FIX3))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A07FIX3 === '1' || process.env.__FZ_OFF_A07FIX3 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A07FIX3')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A07FIX3 || (globalThis.window && globalThis.window.__FZ_ON_A07FIX3))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A07FIX3)) return true;
    if (global && Boolean(global.__FZ_ON_A07FIX3 || (global.window && global.window.__FZ_ON_A07FIX3))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A07FIX3 === '1' || process.env.__FZ_ON_A07FIX3 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A07FIX3')) return true;
    }
    return false;
  }
  // A16_SCORE_v4: নমুনা a16 ও সমগোত্রীয় চেকলিস্ট/স্মারক নথির সূচিপত্র বুলেট, আন্ডারলাইন, চেকলিস্ট ছক ও উপ-ছক সংস্কারের সুইচ (__FZ_ON_A16FIX4 / FZ_ON=A16FIX4)
  function isA16Fix4On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A16FIX4 || (globalThis.window && globalThis.window.__FZ_OFF_A16FIX4))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A16FIX4)) return false;
    if (global && Boolean(global.__FZ_OFF_A16FIX4 || (global.window && global.window.__FZ_OFF_A16FIX4))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A16FIX4 === '1' || process.env.__FZ_OFF_A16FIX4 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A16FIX4')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A16FIX4 || (globalThis.window && globalThis.window.__FZ_ON_A16FIX4))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A16FIX4)) return true;
    if (global && Boolean(global.__FZ_ON_A16FIX4 || (global.window && global.window.__FZ_ON_A16FIX4))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A16FIX4 === '1' || process.env.__FZ_ON_A16FIX4 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A16FIX4')) return true;
    }
    return false;
  }
  // A02_SCORE_v1: নমুনা a02 ও সমগোত্রীয় এক-পাতার অনাপত্তি সনদ (NOC) ফরমের পাতা-ফ্রেম দূরত্ব, শীর্ষ এমব্লেম চিত্রের উচ্চতা, শিরোনাম/উপ-শিরোনাম ও বডি-লাইনের ফন্ট ও প্রস্থ, ডট-লিডার/ওয়েবসাইট লাইনের প্রান্তিককরণ, পারিবারিক ছকের শিরোনাম ও সারি-উচ্চতা, ৪-কলাম স্বাক্ষর-গ্রিড এবং ধূসর পাদটীকা বারের নিখুঁত জ্যামিতিক মেরামতের সুইচ (__FZ_ON_A02FIX / FZ_ON=A02FIX, বন্ধ: __FZ_OFF_A02FIX / FZ_OFF=A02FIX)
  function isA02FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A02FIX || (globalThis.window && globalThis.window.__FZ_OFF_A02FIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A02FIX)) return false;
    if (global && Boolean(global.__FZ_OFF_A02FIX || (global.window && global.window.__FZ_OFF_A02FIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A02FIX === '1' || process.env.__FZ_OFF_A02FIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A02FIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A02FIX || (globalThis.window && globalThis.window.__FZ_ON_A02FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A02FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A02FIX || (global.window && global.window.__FZ_ON_A02FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A02FIX === '1' || process.env.__FZ_ON_A02FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A02FIX')) return true;
    }
    return false;
  }
  // A14_SCORE_v4: পাতা ১-এর দ্বি-স্তর স্বাক্ষর ও ফাইল-পাথ ফুটার, পাতা ২-এর প্রাপক-ব্লক/সম্বোধন/বিশেষ-দ্রষ্টব্য পাদটীকা/৪র্থ-বিষয় ট্যাব এবং পাতা ৩-এর ক্রমিক নির্দেশনার ফন্ট ও লাইন-পিচ নিখুঁত করার সুইচ (__FZ_ON_A14FIX4 / FZ_ON=A14FIX4)
  function isA14Fix4On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A14FIX4 || (globalThis.window && globalThis.window.__FZ_OFF_A14FIX4))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A14FIX4)) return false;
    if (global && Boolean(global.__FZ_OFF_A14FIX4 || (global.window && global.window.__FZ_OFF_A14FIX4))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A14FIX4 === '1' || process.env.__FZ_OFF_A14FIX4 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A14FIX4')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A14FIX4 || (globalThis.window && globalThis.window.__FZ_ON_A14FIX4))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A14FIX4)) return true;
    if (global && Boolean(global.__FZ_ON_A14FIX4 || (global.window && global.window.__FZ_ON_A14FIX4))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A14FIX4 === '1' || process.env.__FZ_ON_A14FIX4 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A14FIX4')) return true;
    }
    return false;
  }
  // A13_SCORE_v1: নমুনা a13 ও সমগোত্রীয় প্রত্যয়ন/মঞ্জুরীপত্র ফরমের স্থূল লেআউট ও রেন্ডারিং ত্রুটি সংশোধনের সুইচ (__FZ_ON_A13FIX / FZ_ON=A13FIX)
  function isA13FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A13FIX || (globalThis.window && globalThis.window.__FZ_OFF_A13FIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A13FIX)) return false;
    if (global && Boolean(global.__FZ_OFF_A13FIX || (global.window && global.window.__FZ_OFF_A13FIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A13FIX === '1' || process.env.__FZ_OFF_A13FIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A13FIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A13FIX || (globalThis.window && globalThis.window.__FZ_ON_A13FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A13FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A13FIX || (global.window && global.window.__FZ_ON_A13FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A13FIX === '1' || process.env.__FZ_ON_A13FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A13FIX')) return true;
    }
    return false;
  }
  // A16_SCORE_v5: নমুনা a16 ও সমগোত্রীয় চেকলিস্ট/স্মারক নথির লক্ষ্যভিত্তিক জ্যামিতিক ও কাঠামোগত সংস্কারের সুইচ (__FZ_ON_A16FIX5 / FZ_ON=A16FIX5)
  function isA16Fix5On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A16FIX5 || (globalThis.window && globalThis.window.__FZ_OFF_A16FIX5))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A16FIX5)) return false;
    if (global && Boolean(global.__FZ_OFF_A16FIX5 || (global.window && global.window.__FZ_OFF_A16FIX5))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A16FIX5 === '1' || process.env.__FZ_OFF_A16FIX5 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A16FIX5')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A16FIX5 || (globalThis.window && globalThis.window.__FZ_ON_A16FIX5))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A16FIX5)) return true;
    if (global && Boolean(global.__FZ_ON_A16FIX5 || (global.window && global.window.__FZ_ON_A16FIX5))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A16FIX5 === '1' || process.env.__FZ_ON_A16FIX5 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A16FIX5')) return true;
    }
    return false;
  }
  // A09_SCORE_v1: ফাঁকা বডি-সারিযুক্ত ১০-কলাম ফরম-ছকের বোল্ড বহু-লাইন শিরোনাম (১১.৫pt, ১৪.০pt লাইন-পিচ ও শীর্ষ প্রান্তিককরণ), ১৪pt কেন্দ্রীভূত শিরোনাম/হেডার, ১২pt বাম-ইনডেন্ট বিশেষ-দ্রষ্টব্য এবং বহু-লাইনের অনুচ্ছেদের প্রকৃত লাইন-ব্যবধান নিখুঁত করার সুইচ (__FZ_ON_A09FIX / FZ_ON=A09FIX)
  function isA09FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A09FIX || (globalThis.window && globalThis.window.__FZ_OFF_A09FIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A09FIX)) return false;
    if (global && Boolean(global.__FZ_OFF_A09FIX || (global.window && global.window.__FZ_OFF_A09FIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A09FIX === '1' || process.env.__FZ_OFF_A09FIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A09FIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A09FIX || (globalThis.window && globalThis.window.__FZ_ON_A09FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A09FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A09FIX || (global.window && global.window.__FZ_ON_A09FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A09FIX === '1' || process.env.__FZ_ON_A09FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A09FIX')) return true;
    }
    return false;
  }
  // A14_SCORE_v5: পাতা ১-এর হেডার ই-মেইল ফন্ট, দ্বি-স্তর স্বাক্ষর সংযোগ ও আদ্যক্ষর-স্বাক্ষর ক্রপ, পাতা ২-এর প্রাপক ব্লক ও বিন্দু-লিডার প্রস্থ এবং পাতা ৩-এর ক্রমিক নির্দেশনা সংযোগ, RECITATION পুনরুদ্ধার ও সমাপনী স্বাক্ষর সংযোজনের সুইচ (__FZ_ON_A14FIX5 / FZ_ON=A14FIX5)
  function isA14Fix5On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A14FIX5 || (globalThis.window && globalThis.window.__FZ_OFF_A14FIX5))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A14FIX5)) return false;
    if (global && Boolean(global.__FZ_OFF_A14FIX5 || (global.window && global.window.__FZ_OFF_A14FIX5))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A14FIX5 === '1' || process.env.__FZ_OFF_A14FIX5 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A14FIX5')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A14FIX5 || (globalThis.window && globalThis.window.__FZ_ON_A14FIX5))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A14FIX5)) return true;
    if (global && Boolean(global.__FZ_ON_A14FIX5 || (global.window && global.window.__FZ_ON_A14FIX5))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A14FIX5 === '1' || process.env.__FZ_ON_A14FIX5 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A14FIX5')) return true;
    }
    return false;
  }
  // A07_SCORE_v5: টেবিল-গ্রিড অক্ষত রেখে নমুনা a07 ও সমগোত্রীয় পদোন্নতি/প্রত্যয়ন ছক-ফরমের লেআউট, ফন্ট ও লাইন-পিচ মেরামতের সুইচ (__FZ_ON_A07FIX5 / FZ_ON=A07FIX5)
  function isA07Fix5On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A07FIX5 || (globalThis.window && globalThis.window.__FZ_OFF_A07FIX5))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A07FIX5)) return false;
    if (global && Boolean(global.__FZ_OFF_A07FIX5 || (global.window && global.window.__FZ_OFF_A07FIX5))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A07FIX5 === '1' || process.env.__FZ_OFF_A07FIX5 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A07FIX5')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A07FIX5 || (globalThis.window && globalThis.window.__FZ_ON_A07FIX5))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A07FIX5)) return true;
    if (global && Boolean(global.__FZ_ON_A07FIX5 || (global.window && global.window.__FZ_ON_A07FIX5))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A07FIX5 === '1' || process.env.__FZ_ON_A07FIX5 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A07FIX5')) return true;
    }
    return false;
  }
  // A12_SCORE_v1: নমুনা a12 ও সমগোত্রীয় পেনশন উত্তরাধিকারী ঘোষণাপত্র ফরমের লেআউট ও রেন্ডারিং ত্রুটি সংশোধনের সুইচ (__FZ_ON_A12FIX / FZ_ON=A12FIX)
  function isA12FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A12FIX || (globalThis.window && globalThis.window.__FZ_OFF_A12FIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A12FIX)) return false;
    if (global && Boolean(global.__FZ_OFF_A12FIX || (global.window && global.window.__FZ_OFF_A12FIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A12FIX === '1' || process.env.__FZ_OFF_A12FIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A12FIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A12FIX || (globalThis.window && globalThis.window.__FZ_ON_A12FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A12FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A12FIX || (global.window && global.window.__FZ_ON_A12FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A12FIX === '1' || process.env.__FZ_ON_A12FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A12FIX')) return true;
    }
    return false;
  }
  // A06_SCORE_v1: নমুনা a06 ও সমগোত্রীয় গৃহ নির্মাণ ঋণ উপযুক্ততা প্রত্যয়ন ফরমের প্রবাহ-শিরোনামের আন্ডারলাইন, কোলন-ট্যাব তালিকার "তারিখ" ও ট্যাব-স্টপ, লিডার-লেবেল ফন্ট/স্টপ, জাস্টিফাইড অনুচ্ছেদের justRightPt এবং এমব্লেম চিত্রের আকার মেরামতের সুইচ (__FZ_ON_A06FIX / FZ_ON=A06FIX)
  function isA06FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A06FIX || (globalThis.window && globalThis.window.__FZ_OFF_A06FIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A06FIX)) return false;
    if (global && Boolean(global.__FZ_OFF_A06FIX || (global.window && global.window.__FZ_OFF_A06FIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A06FIX === '1' || process.env.__FZ_OFF_A06FIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A06FIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A06FIX || (globalThis.window && globalThis.window.__FZ_ON_A06FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A06FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A06FIX || (global.window && global.window.__FZ_ON_A06FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A06FIX === '1' || process.env.__FZ_ON_A06FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A06FIX')) return true;
    }
    return false;
  }
  // A07_SCORE_v6: টেবিল-গ্রিড সম্পূর্ণ অক্ষত রেখে নমুনা a07 ও সমগোত্রীয় পদোন্নতি/প্রত্যয়ন ছক-ফরমের লেআউট, ফন্ট ও লাইন-পিচ মেরামতের সুইচ (__FZ_ON_A07FIX6 / FZ_ON=A07FIX6)
  function isA07Fix6On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A07FIX6 || (globalThis.window && globalThis.window.__FZ_OFF_A07FIX6))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A07FIX6)) return false;
    if (global && Boolean(global.__FZ_OFF_A07FIX6 || (global.window && global.window.__FZ_OFF_A07FIX6))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A07FIX6 === '1' || process.env.__FZ_OFF_A07FIX6 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A07FIX6')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A07FIX6 || (globalThis.window && globalThis.window.__FZ_ON_A07FIX6))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A07FIX6)) return true;
    if (global && Boolean(global.__FZ_ON_A07FIX6 || (global.window && global.window.__FZ_ON_A07FIX6))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A07FIX6 === '1' || process.env.__FZ_ON_A07FIX6 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A07FIX6')) return true;
    }
    return false;
  }
  // F1_SCORE_v1: নমুনা f1 ও সমগোত্রীয় বহু-পাতার শিক্ষাবৃত্তি/অনলাইন আবেদন ফরমের পাদটীকা ফন্ট, অঙ্ক-বাক্স (১১ ও ১৭ ঘর) প্রস্থ/উচ্চতা/অবস্থান, রেডিও-বাটন ব্যবধান, বহু-লাইনের সারির শীর্ষ-প্রান্তিককরণ (vAlign="top"), প্লেসহোল্ডার ও সংযুক্তি-ছক নিখুঁত করার সুইচ (__FZ_ON_F1FIX / FZ_ON=F1FIX, বন্ধ: __FZ_OFF_F1FIX / FZ_OFF=F1FIX)
  function isF1FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_F1FIX || (globalThis.window && globalThis.window.__FZ_OFF_F1FIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_F1FIX)) return false;
    if (global && Boolean(global.__FZ_OFF_F1FIX || (global.window && global.window.__FZ_OFF_F1FIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_F1FIX === '1' || process.env.__FZ_OFF_F1FIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('F1FIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_F1FIX || (globalThis.window && globalThis.window.__FZ_ON_F1FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_F1FIX)) return true;
    if (global && Boolean(global.__FZ_ON_F1FIX || (global.window && global.window.__FZ_ON_F1FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_F1FIX === '1' || process.env.__FZ_ON_F1FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('F1FIX')) return true;
    }
    return false;
  }
  // A18_SCORE_v1: টেবিল-গ্রিড ও সীমানা অক্ষত রেখে নমুনা a18 ও সমগোত্রীয় এক-পাতার ছুটির আবেদন ফরমের লেআউট, ফন্ট ও সারির অবস্থান মেরামতের সুইচ (__FZ_ON_A18FIX / FZ_ON=A18FIX)
  function isA18FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A18FIX || (globalThis.window && globalThis.window.__FZ_OFF_A18FIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A18FIX)) return false;
    if (global && Boolean(global.__FZ_OFF_A18FIX || (global.window && global.window.__FZ_OFF_A18FIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A18FIX === '1' || process.env.__FZ_OFF_A18FIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A18FIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A18FIX || (globalThis.window && globalThis.window.__FZ_ON_A18FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A18FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A18FIX || (global.window && global.window.__FZ_ON_A18FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A18FIX === '1' || process.env.__FZ_ON_A18FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A18FIX')) return true;
    }
    return false;
  }
  // A08_SCORE_v1: টেবিল-গ্রিড সম্পূর্ণ অক্ষত রেখে নমুনা a08 ও সমগোত্রীয় না-দাবী সনদপত্র ফরমের ক্রমিক-লেবেল, ১২×৩ পাওনা-ছক ও স্বাক্ষর-ব্লক মেরামতের সুইচ (__FZ_ON_A08FIX / FZ_ON=A08FIX)
  function isA08FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A08FIX || (globalThis.window && globalThis.window.__FZ_OFF_A08FIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A08FIX)) return false;
    if (global && Boolean(global.__FZ_OFF_A08FIX || (global.window && global.window.__FZ_OFF_A08FIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A08FIX === '1' || process.env.__FZ_OFF_A08FIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A08FIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A08FIX || (globalThis.window && globalThis.window.__FZ_ON_A08FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A08FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A08FIX || (global.window && global.window.__FZ_ON_A08FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A08FIX === '1' || process.env.__FZ_ON_A08FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A08FIX')) return true;
    }
    return false;
  }
  // A16_SCORE_v6: নমুনা a16 (লেআউট ৯৪.৬, ছবি ৯৬.১) ও সমগোত্রীয় স্মারক/চেকলিস্ট নথির পাতা ১-এর খাড়া-রেখা ওভারলে ও ফুটার প্রস্থ, পাতা ২-এর বুলেট ফন্ট/অক্ষর-ফাঁক এবং পাতা ৬, ৭, ৮-এর অণু-স্বাক্ষর ক্রপ ও পাদটীকা/স্বাক্ষর অবস্থান সংস্কারের সুইচ (__FZ_ON_A16FIX6 / FZ_ON=A16FIX6, বন্ধ: __FZ_OFF_A16FIX6 / FZ_OFF=A16FIX6)
  function isA16Fix6On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A16FIX6 || (globalThis.window && globalThis.window.__FZ_OFF_A16FIX6))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_A16FIX6)) return false;
    if (global && Boolean(global.__FZ_OFF_A16FIX6 || (global.window && global.window.__FZ_OFF_A16FIX6))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_A16FIX6 === '1' || process.env.__FZ_OFF_A16FIX6 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A16FIX6')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A16FIX6 || (globalThis.window && globalThis.window.__FZ_ON_A16FIX6))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A16FIX6)) return true;
    if (global && Boolean(global.__FZ_ON_A16FIX6 || (global.window && global.window.__FZ_ON_A16FIX6))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A16FIX6 === '1' || process.env.__FZ_ON_A16FIX6 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A16FIX6')) return true;
    }
    return false;
  }
  // F1_SCORE_v2: নমুনা f1 ও সমগোত্রীয় ৩-পাতার শিক্ষাবৃত্তি/অনলাইন আবেদন ফরমের হালকা ধূসর পূর্ণ টেবিল-গ্রিড বর্ডার (DFDFDF) ও বাম কলাম/শিরোনাম ছায়া (F2F2F2) পুনরুদ্ধার, পাতা ১ ও ২-এর ১৭-ঘর অঙ্ক-বাক্সের ০.৭৫pt বর্ডার, পাতা ২ সারি ১-এর ২য় লাইন পুনরুদ্ধার, রেডিও-বিকল্পের ১১.৫pt ফন্ট ও অক্ষর-ফাঁক, পাতা ৩ "সংযুক্তি:" ছকের ৯pt শিরোনাম ও বহিঃস্থ ধূসর বর্ডার/ছায়া এবং স্বাক্ষর-গ্রিড প্রান্তিককরণ নিখুঁত করার সুইচ (__FZ_ON_F1FIX2 / FZ_ON=F1FIX2, বন্ধ: __FZ_OFF_F1FIX2 / FZ_OFF=F1FIX2)
  function isF1Fix2On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_F1FIX2 || (globalThis.window && globalThis.window.__FZ_OFF_F1FIX2))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_F1FIX2)) return false;
    if (global && Boolean(global.__FZ_OFF_F1FIX2 || (global.window && global.window.__FZ_OFF_F1FIX2))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_F1FIX2 === '1' || process.env.__FZ_OFF_F1FIX2 === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('F1FIX2')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_F1FIX2 || (globalThis.window && globalThis.window.__FZ_ON_F1FIX2))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_F1FIX2)) return true;
    if (global && Boolean(global.__FZ_ON_F1FIX2 || (global.window && global.window.__FZ_ON_F1FIX2))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_F1FIX2 === '1' || process.env.__FZ_ON_F1FIX2 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('F1FIX2')) return true;
    }
    return false;
  }
  // INDENT_TYPE_v1: বাম-প্রান্তের সরণ (|dx0| > 3pt) নিরসনে বিশুদ্ধ জ্যামিতিক ও কাঠামোগত মেরামতের সুইচ (__FZ_ON_INDENTFIX / FZ_ON=INDENTFIX, বন্ধ: __FZ_OFF_INDENTFIX / FZ_OFF=INDENTFIX)
  function isIndentFixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_INDENTFIX || (globalThis.window && globalThis.window.__FZ_OFF_INDENTFIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_INDENTFIX)) return false;
    if (global && Boolean(global.__FZ_OFF_INDENTFIX || (global.window && global.window.__FZ_OFF_INDENTFIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_INDENTFIX === '1' || process.env.__FZ_OFF_INDENTFIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('INDENTFIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_INDENTFIX || (globalThis.window && globalThis.window.__FZ_ON_INDENTFIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_INDENTFIX)) return true;
    if (global && Boolean(global.__FZ_ON_INDENTFIX || (global.window && global.window.__FZ_ON_INDENTFIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_INDENTFIX === '1' || process.env.__FZ_ON_INDENTFIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('INDENTFIX')) return true;
    }
    return false;
  }
  // VGAP_TYPE_v1: উল্লম্ব স্পেসিং ত্রুটি (|dy| >= 4) নিরসনে সাধারণ জ্যামিতিক ও কাঠামোগত সংস্কার সুইচ (__FZ_ON_VGAPFIX / FZ_ON=VGAPFIX, বন্ধ: __FZ_OFF_VGAPFIX / FZ_OFF=VGAPFIX)
  function isVGapFixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_VGAPFIX || (globalThis.window && globalThis.window.__FZ_OFF_VGAPFIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_VGAPFIX)) return false;
    if (global && Boolean(global.__FZ_OFF_VGAPFIX || (global.window && global.window.__FZ_OFF_VGAPFIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_VGAPFIX === '1' || process.env.__FZ_OFF_VGAPFIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('VGAPFIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_VGAPFIX || (globalThis.window && globalThis.window.__FZ_ON_VGAPFIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_VGAPFIX)) return true;
    if (global && Boolean(global.__FZ_ON_VGAPFIX || (global.window && global.window.__FZ_ON_VGAPFIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_VGAPFIX === '1' || process.env.__FZ_ON_VGAPFIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('VGAPFIX')) return true;
    }
    return false;
  }
  // SERIAL_TYPE_v1: ক্রমিক-নম্বর ও ট্যাব/বক্স প্রসারণজনিত অতিরিক্ত চওড়া লাইন (dx1 >= 8) এবং উল্লম্ব রেখা-সেতুবন্ধন সংশোধনের সুইচ (__FZ_ON_SERIALFIX / FZ_ON=SERIALFIX, বন্ধ: __FZ_OFF_SERIALFIX / FZ_OFF=SERIALFIX)
  function isSerialFixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_SERIALFIX || (globalThis.window && globalThis.window.__FZ_OFF_SERIALFIX))) return false;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_OFF_SERIALFIX)) return false;
    if (global && Boolean(global.__FZ_OFF_SERIALFIX || (global.window && global.window.__FZ_OFF_SERIALFIX))) return false;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_OFF_SERIALFIX === '1' || process.env.__FZ_OFF_SERIALFIX === 'true') return false;
      if (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('SERIALFIX')) return false;
    }
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_SERIALFIX || (globalThis.window && globalThis.window.__FZ_ON_SERIALFIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_SERIALFIX)) return true;
    if (global && Boolean(global.__FZ_ON_SERIALFIX || (global.window && global.window.__FZ_ON_SERIALFIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_SERIALFIX === '1' || process.env.__FZ_ON_SERIALFIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('SERIALFIX')) return true;
    }
    return false;
  }
  function defaultWrapMeasure(s) {
    const str = String(s || '');
    const fills = (str.match(FILL_G) || []).join('');
    const noFill = str.replace(FILL_G, '');
    const bLen = noFill.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
    const karLen = (noFill.match(SPACING_KAR_RE) || []).length;
    return bLen * 38 + karLen * 14 + fills.length * 33.3;
  }
  function getFontWidthRatio(fontName) {
    if (!fontName) return 1.00;
    const f = String(fontName).trim();
    return Object.prototype.hasOwnProperty.call(FONT_WIDTH_RATIOS, f) ? FONT_WIDTH_RATIOS[f] : 1.00;
  }
  function resolveFitFont(it, measure, fontOpt) {
    if (typeof fontOpt === 'string' && fontOpt) return fontOpt;
    if (fontOpt && typeof fontOpt === 'object' && (fontOpt.font || fontOpt.unicodeFont)) return fontOpt.font || fontOpt.unicodeFont;
    if (it && (it.font || it.unicodeFont || it.fontFamily)) return it.font || it.unicodeFont || it.fontFamily;
    if (_activeFitFont) return _activeFitFont;
    if (measure && measure.font) return measure.font;
    if (typeof globalThis !== 'undefined' && globalThis.__FZ_UNICODE_FONT) return globalThis.__FZ_UNICODE_FONT;
    if (global && global.__FZ_UNICODE_FONT) return global.__FZ_UNICODE_FONT;
    return 'SutonnyOMJ';
  }

  function lineWidthPt(t, it, measure, fontOpt) {
    // চিহ্ন (**মোটা**, *বাঁকা*, ^{উপরে}) মাপে ধরা নয়
    let s0 = String(t).replace(/\*\*/g, '').replace(/\*([^*\s][^*]*?)\*/g, '$1').replace(/\^\{([^}]*)\}/g, '$1');
    const urlScale = isA14RulesOn() && it && (it.fontPt || 12) >= 14 && /[ঀ-৿]/.test(s0) && /<u>\s*www\.[A-Za-z0-9._-]+\.[A-Za-z]{2,}\s*<\/u>/i.test(s0);
    if (urlScale) {
      const ratio0 = isFontPickOn() ? getFontWidthRatio(resolveFitFont(it, measure, fontOpt)) : 1;
      const urlFs = Math.round((it.fontPt || 15) * 0.77 * 2) / 2;
      return s0.split(/(<u>\s*www\.[A-Za-z0-9._-]+\.[A-Za-z]{2,}\s*<\/u>)/i).reduce((acc, part) => {
        if (!part) return acc;
        const mUrl = /^<u>\s*(www\.[A-Za-z0-9._-]+\.[A-Za-z]{2,})\s*<\/u>$/i.exec(part);
        const clean = (mUrl ? mUrl[1] : part.replace(/<\/?u>/gi, '')).trim();
        if (!clean) return acc;
        const fs = mUrl ? urlFs : it.fontPt;
        return acc + measure(clean, !!it.bold) * fs / 100 * (it.bold ? BOLD : 1) * ratio0;
      }, 0);
    }
    if (isA14FixOn() || boxSplitOn() || isA19FixOn() || (isLineGapOn() && it && it._a14LineGap)) s0 = s0.replace(/<\/?u>/gi, '');
    const s = s0.trim();
    if (!s) return 0;
    const ratio = isFontPickOn() ? getFontWidthRatio(resolveFitFont(it, measure, fontOpt)) : 1;
    return measure(s, !!it.bold) * it.fontPt / 100 * (it.bold ? BOLD : 1) * ratio;
  }

  /** builder-এর pPr-এর মতো একই নিয়মে অনুচ্ছেদের মোট পাশ-ইনডেন্ট (pt) */
  function sideIndent(it) {
    if (it.align === 'c' && it.centerShiftPt != null) return Math.abs(it.centerShiftPt) >= 2 ? 2 * Math.abs(it.centerShiftPt) : 0;
    if (it.align === 'r' && it.rightIndentPt != null) return it.rightIndentPt >= 2 ? it.rightIndentPt : 0;
    const jr = (isA10LinesOn() || isA10FixOn() || isP2DriftOn() || isA03FixOn() || (isNestBoxOn() && it._inNestBoxPage) || isA14FixOn() || isA19FixOn() || isA16FixOn() || isWidthOn() || (isLineGapOn() && it && it._a14LineGap)) && it.align === 'j' && it.justRightPt >= 2 ? it.justRightPt : 0;
    return (it.indentPt || 0) + Math.abs(it.firstIndentPt || 0) + jr;
  }

  /** A17_P1LOSS_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও পাতা ১-এর ড্যাশ-ঘেরা কার্ড/স্লিপ বক্স ও লাইন পুনরুদ্ধার */
  function repairP1LossIr(ir) {
    if (!(isP1LossOn() || isA17FixOn()) || !ir || !Array.isArray(ir.pages)) return;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.recoverCardGridBoxes === 'function') {
      ir.pages.forEach((p) => IR.recoverCardGridBoxes(p));
    }
  }
  function repairA17Ir(ir) {
    if (!isA17FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA17Ir === 'function') return IR.repairA17Ir(ir);
    return ir;
  }

  /** A10_LINES_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও লাইন-ভাঙা, লাইন-দূরত্ব, ট্যাব ও ছকের সারি-সংখ্যা মূলের সাথে সামঞ্জস্যপূর্ণ করা */
  function repairA10Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return;
    const r1 = (v) => Math.round(v * 10) / 10;
    for (const page of ir.pages) {
      const bodyFont = page.bodyFontPt || 11.5;
      for (const band of page.bands || []) {
        for (const cell of band.cells || []) {
          const cx0 = cell.x0 || 0, cx1 = cell.x1 || 0;
          for (const it of cell.items || []) {
            if (!it) continue;
            if (it.kind === 'table') {
              if (Array.isArray(it.srcRulesPt) && Array.isArray(it.rows) && it.srcRulesPt.length === it.rows.length + 2 && it.rows.length >= 3) {
                const lastR = it.rows[it.rows.length - 1];
                if (Array.isArray(lastR) && !lastR.some((c) => c && String(c).trim())) {
                  it.rows.push(lastR.slice());
                  it.rowHeightsPt = it.srcRulesPt.slice(1).map((y, k) => r1(y - it.srcRulesPt[k]));
                  if (Array.isArray(it.gridSpans)) { while (it.gridSpans.length < it.rows.length) it.gridSpans.push(null); }
                  if (Array.isArray(it.vRuleBands)) { while (it.vRuleBands.length < it.rows.length) it.vRuleBands.push(it.vRuleBands[it.vRuleBands.length - 1] || null); }
                  if (Array.isArray(it.vMerges)) { while (it.vMerges.length < it.rows.length) it.vMerges.push(null); }
                }
              }
              if (Array.isArray(it.rowHeightsPt) && Array.isArray(it.rows) && it.rowHeightsPt.length === it.rows.length && it.heightPt > 0) {
                const totRbh = it.rowHeightsPt.reduce((a, b) => a + b, 0);
                if (totRbh > it.heightPt * 1.5) {
                  const baseH = (it.rect && it.rect.h > 0) ? it.rect.h : it.heightPt;
                  const ex = it.rowHeightsPt.exact;
                  it.rowHeightsPt = it.rowHeightsPt.map((h) => r1(h * baseH / totRbh));
                  if (ex) it.rowHeightsPt.exact = true;
                }
              }
              if (Array.isArray(it.rows) && it.rows.length >= 4 && it.rows.filter((r) => r.some((c) => c && String(c).trim())).length === 1 && it.fontPt >= bodyFont * 1.35) {
                it.fontPt = bodyFont;
              }
              if (it.headFontPt && it.fontPt && it.headFontPt > it.fontPt && it.rows && it.rows[0] && it.rows[0].some((c) => String(c || '').includes('\n') || String(c || '').length > 18)) {
                delete it.headFontPt;
              }
            } else if (it.kind === 'para') {
              if ((it.firstIndentPt || 0) === 0 && Array.isArray(it.tabLines) && it.tabLines.length >= 1 && it.tabLines.every((l) => /^\t{2,}\S/.test(String(l)))) {
                it.lines = it.tabLines.map((l) => String(l).replace(/^\t+\s*/, ''));
                it.text = it.lines.join('\n');
                it.tabLines = null; it.tabStops = null; it.tabStopsSrc = null; it.tabStopsAbs = null;
                if (it.rect && cx0 > 0) it.indentPt = r1(Math.max(0, it.rect.x - cx0));
              }
              if (Array.isArray(it.tabLines) && ((it.firstIndentPt || 0) < -4 || /^\s*\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2}\s*\t/.test(String(it.tabLines[0] || '')))) {
                it.tabLines = it.tabLines.map((l, k) => (k > 0 ? String(l).replace(/^\t+\s*/, '') : l));
                if (Array.isArray(it.tabStops) && it.tabStops.length === 2 && typeof it.tabStops[0] === 'number' && typeof it.tabStops[1] === 'number' && Math.abs(it.tabStops[1] - it.tabStops[0] - 0.7 * (it.fontPt || 12)) <= 2 && !it.tabLines.some((l) => /[:|]\s*\t/.test(String(l)))) {
                  it.tabStops = [it.tabStops[0]];
                }
              }
              if (it.lines && it.lines.length >= 2 && it.diag && it.diag.lines < it.lines.length && !it.diag.wPt && !/^(title|heading|header)$/.test(it.type || '') && it.fontPt > bodyFont) {
                it.fontPt = bodyFont;
              }
              if (it.bold && !/^(title|heading|header)$/.test(it.type || '')) {
                if (it.diag && it.diag.stroke != null && it.diag.stroke < 1.13) it.bold = false;
                else if (/\*\*[^*]+\*\*/.test(it.text || '') && String(it.text || '').replace(/\*\*[^*]+\*\*/g, '').replace(/\s+/g, '').length > 5) it.bold = false;
                else if (it.lines && it.lines.length >= 2 && it.diag && it.diag.lines < it.lines.length) it.bold = false;
              }
              const bl = (it.lines || []).map((l) => String(l).trim()).filter(Boolean);
              if (!it.tabLines && bl.length >= 2 && it.rect && it.rect.h > 0) {
                if ((it.diag && it.diag.lines === bl.length) || (it.diag && it.diag.lines < bl.length && bl.slice(0, -1).every((l) => l.replace(/\*+/g, '').length >= 45))) {
                  it.keepLines = true;
                  if (it.align === 'j' || (it.diag && it.diag.lines < bl.length && it.rect && cx1 > cx0 && it.rect.w >= (cx1 - cx0) * 0.85)) { it.align = 'j'; it.keepJust = true; }
                }
                if (it.align === 'j' && it.keepLines && it.keepJust && cx1 > cx0 && it.rect.w > 0 && it.justRightPt == null) {
                  const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
                  if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) it.justRightPt = jr;
                }
              }
              const nLn = (it.tabLines && it.tabLines.length) || bl.length || 1;
              if (!it.lineSpacingPt && nLn >= 2 && it.rect && it.rect.h > 0) {
                const fs = it.fontPt || bodyFont;
                const estPitch = r1(Math.max(fs * 1.15, (it.rect.h - fs * 1.02) / (nLn - 1)));
                if (estPitch <= fs * 1.8) it.lineSpacingPt = estPitch;
              }
            }
          }
        }
      }
    }
  }

  /** A01_REGRESS_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও a01-এর ফন্ট, প্রথম-লাইন ইনডেন্ট, খণ্ডিত পূরণ-রেখা ও মার্জিন-সীমা পুনরুদ্ধার */
  function repairA01Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return;
    const r1 = (v) => Math.round(v * 10) / 10;
    for (const page of ir.pages) {
      const pLeft = (page.margins && page.margins.left) || 72;
      const pRight = (page.widthPt || 612) - ((page.margins && page.margins.right) || 72);
      const fillWidths = [];
      const paraFonts = {};
      for (const band of page.bands || []) {
        for (const cell of band.cells || []) {
          for (const it of cell.items || []) {
            if (!it || it.kind !== 'para') continue;
            if (it.rect && (it.lines || []).length === 1 && FILL.test(it.text || '') && it.rect.w >= 420) fillWidths.push(it.rect.w);
            const rLen = String(it.text || '').replace(FILL_G, '').replace(/\s+/g, '').length;
            if (it.type === 'paragraph' && it.fontPt && rLen >= 15) paraFonts[it.fontPt] = (paraFonts[it.fontPt] || 0) + rLen;
          }
        }
      }
      const domFont = Object.keys(paraFonts).length ? +Object.keys(paraFonts).sort((a, b) => paraFonts[b] - paraFonts[a])[0] : (page.bodyFontPt || 11.5);
      if (domFont && page.bodyFontPt && Math.abs(page.bodyFontPt - domFont) <= domFont * 0.2) page.bodyFontPt = domFont;
      const sortedFW = fillWidths.slice().sort((a, b) => a - b);
      const medFillW = sortedFW.length >= 3 ? sortedFW[sortedFW.length >> 1] : 0;
      for (const band of page.bands || []) {
        const cells = band.cells || [];
        for (let ci = 0; ci < cells.length; ci++) {
          const cell = cells[ci];
          if (ci === cells.length - 1 && cell.x1 > pRight && cell.x1 <= pRight + 6) cell.x1 = pRight;
          for (const it of cell.items || []) {
            if (!it || it.kind !== 'para') continue;
            if (it.rect && (it.lines || []).length === 1 && it.rect.x + it.rect.w > pRight && it.rect.x + it.rect.w <= pRight + 6) {
              it.rect = Object.assign({}, it.rect, { w: r1(Math.max(20, pRight - it.rect.x)) });
            }
            const rawTxt = String(it.text || '');
            const rLen = rawTxt.replace(FILL_G, '').replace(/\s+/g, '').length;
            if (it.type === 'list_item' && rLen <= 4 && domFont && Math.abs((it.fontPt || 10) - domFont) <= domFont * 0.2) {
              it.fontPt = domFont;
            }
            if (it.rect && it.rect.h < 3 && rLen >= 2 && FILL.test(rawTxt)) {
              const refFs = (it.diag && it.diag.wPt >= 8) ? domFont : (it.fontPt || domFont);
              if (it.fontPt < refFs) it.fontPt = refFs;
              it.rect = Object.assign({}, it.rect, { y: r1(it.rect.y - refFs * 0.52), h: r1(refFs * 0.85) });
              if (band.kind === 'grid') it.spaceBeforePt = 0;
            }
            const fillSegs = rawTxt.match(FILL_G) || [];
            if (medFillW >= 430 && fillSegs.length >= 2 && /([._\-…·─])\1{10,}\s*$/.test(rawTxt) && rawTxt.length >= 75 && it.rect && it.rect.x <= pLeft + 4 && it.rect.w < medFillW * 0.72) {
              if (!it._origRectW) it._origRectW = r1(it.rect.w);
              it.rect = Object.assign({}, it.rect, { w: r1(medFillW) });
            }
            const ln0 = String((it.lines && it.lines[0]) || rawTxt || '');
            if ((it.lines || []).length === 1 && FILL.test(ln0) && !/([._\-…·─])\1{5,}\s*$/.test(ln0) && !it.charSpacingPt) {
              it.charSpacingPt = -0.15;
            }
            if (it.align === 'j' && (it.lines || []).length === 2 && (it.firstIndentPt || 0) >= 20 && !FILL.test(rawTxt)) {
              it.keepLines = false;
              it.keepJust = false;
              delete it.justRightPt;
            }
            if (it.align === 'j' && it.keepLines && (it.lines || []).length === 3 && FILL.test(it.lines[0] || '')) {
              if ((it.firstIndentPt || 0) === 0) it.firstIndentPt = 36;
              if (!it.indentPt) it.indentPt = 0.5;
              if (it.fontPt >= 12 && it.lines.some((ln) => String(ln || '').length >= 100)) {
                it.fontPt = 11.5;
              }
              it.lines[0] = String(it.lines[0]).replace(FILL_G, (run) => (run.length >= 22 ? run[0].repeat(18) : run));
              it.text = it.lines.join('\n');
            }
          }
        }
      }
    }
  }

  /** A02_RULES_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও পাতা-ফ্রেম, সংখ্যা-বাক্স, ধূসর ছক ও চিত্রের উচ্চতা মূলের সাথে সামঞ্জস্যপূর্ণ করা */
  /** A02_RULES_v2: a03 অক্ষুণ্ণ রেখে পাতা-ফ্রেম (spacePt), খাড়া চিত্র-দণ্ডের পূর্ণ উচ্চতা ও শূন্য ইনডেন্ট, সংখ্যা-বাক্স, ধূসর ছক ও হালকা পট্টি মূলের সাথে মেলানো */
  function repairRules2Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return;
    const r1 = (v) => Math.round(v * 10) / 10;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    for (const page of ir.pages) {
      const bodyFont = page.bodyFontPt || 11;
      const isUnframedBoxForm = !page.frame && Array.isArray(page.boxes) && page.boxes.some((bx) => !bx.dashed && (bx.x1 - bx.x0) >= (page.widthPt || 595) * 0.7 && (bx.y1 - bx.y0) >= (page.heightPt || 842) * 0.25);
      if (isUnframedBoxForm) {
        const b0 = (page.bands || [])[0];
        if (b0 && b0.kind === 'grid' && Array.isArray(b0.cells) && b0.cells.length === 2) {
          const c0 = b0.cells[0], c1 = b0.cells[1];
          const fig = c1 && Array.isArray(c1.items) && c1.items.length === 1 && c1.items[0] && c1.items[0].kind === 'figure' ? c1.items[0] : null;
          if (fig && fig.rect && Math.abs(c0.x1 - fig.rect.x) <= 2.5) {
            const aR = Math.max(...(c0.items || []).map((it) => (it && it.rect ? it.rect.x + it.rect.w : c0.x0)));
            const mid = r1((aR + fig.rect.x) / 2);
            delete c0.ruleRight;
            c0.x1 = mid; c1.x0 = mid;
            fig.indentPt = r1(Math.max(0, fig.rect.x - mid));
            (c0.items || []).forEach((it) => {
              if (it && it.kind === 'para' && it.align === 'c' && it.rect) {
                const slack = Math.max(0, ((c0.x1 - c0.x0) - it.rect.w * (isWidthOn() ? 1 : 1.06)) / 2);
                it.centerShiftPt = r1(clamp((it.rect.x + it.rect.w / 2) - (c0.x0 + c0.x1) / 2, -slack, slack));
              }
            });
          }
        }
        (page.bands || []).forEach((b) => {
          if (!b || b.kind !== 'grid' || !Array.isArray(b.cells) || b.cells.length !== 2 || !b.boxIds || !b.boxIds.length) return;
          const bx = (page.boxes || []).find((x) => !x.nestedBox && b.boxIds.includes(x.id));
          if (!bx) return;
          const c0 = b.cells[0], c1 = b.cells[1];
          if (c0.items && c0.items.length === 2 && c1.items && c1.items.length === 2 && c1.items.some((it) => it && it.kind === 'table')) {
            const it0 = c0.items[0], it1 = c0.items[1];
            if (it0 && it1 && it0.rect && it1.rect && !it0.ruleBelow && it1.rect.y - (it0.rect.y + it0.rect.h) >= 22) {
              const rb = { srcY: r1(it1.rect.y - 8.6), sz: 4 };
              Object.defineProperty(rb, '_p2Rule', { value: true, enumerable: false, configurable: true, writable: true });
              it0.ruleBelow = rb;
            }
          }
        });
        continue;
      }
      if (page.frame && page.frame.spacePt && page.margins && (page.scale || 1) === 1 && !page.frame._rules2Fixed) {
        let f = page.frame.rectPt;
        if (!f) {
          const items0 = (page.bands || []).flatMap((b) => (b.cells || []).flatMap((c) => c.items || [])).filter((it) => it && it.rect);
          const cx0 = items0.length ? Math.min(...items0.map((it) => it.rect.x)) : page.margins.left;
          const cy0 = items0.length ? Math.min(...items0.map((it) => it.rect.y)) : page.margins.top;
          const cx1 = items0.length ? Math.max(...items0.map((it) => it.rect.x + it.rect.w)) : page.widthPt - page.margins.right;
          const fx = cx0 - (page.frame.spacePt.left || 0), fy = cy0 - (page.frame.spacePt.top || 0);
          const fx1 = cx1 + (page.frame.spacePt.right || 0), fy1 = page.heightPt - page.margins.bottom + (page.frame.spacePt.bottom || 0);
          f = { x: r1(fx), y: r1(fy), w: r1(fx1 - fx), h: r1(fy1 - fy) };
          page.frame.rectPt = f;
        }
        const effBot = Math.min(page.margins.bottom, 14);
        page.frame.spacePt = {
          top: r1(clamp(Math.round(page.margins.top - f.y - 2.2), 0, 31)),
          left: r1(clamp(Math.round(page.margins.left - f.x - 2.0), 0, 31)),
          right: r1(clamp(Math.round(page.margins.right - (page.widthPt - (f.x + f.w)) - 2.0), 0, 31)),
          bottom: r1(clamp(Math.round(effBot - (page.heightPt - (f.y + f.h)) - 2.0), 0, 31))
        };
        page.frame._rules2Fixed = true;
        page.frame._ruleFixed = true;
      }
      for (const band of page.bands || []) {
        const bandHasBox = !!(band && Array.isArray(band.boxIds) && band.boxIds.length);
        for (const cell of band.cells || []) {
          const cellW = (cell.x1 || 0) - (cell.x0 || 0);
          for (const it of cell.items || []) {
            if (!it) continue;
            const itemHasBox = bandHasBox || !!(Array.isArray(it.boxIds) && it.boxIds.length);
            if (it.kind === 'figure' && it.rect && it.rect.h > 0) {
              if (it.rect.h > it.rect.w * 2.5 && it.rect.h >= 40) {
                it.heightPt = r1(it.rect.h);
                if (it.image && it.image.pxW && it.image.pxH) {
                  it.widthPt = r1(Math.min(cellW > 0 ? cellW : 20, Math.max(it.rect.w, it.rect.h * it.image.pxW / it.image.pxH)));
                }
                const padLeft = Math.max(0, ((it.widthPt || it.rect.w) - it.rect.w) / 2);
                if (it.indentPt != null && padLeft > 0) {
                  it.indentPt = r1(Math.max(0, it.indentPt - padLeft));
                }
              }
            } else if (it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 1) {
              const nCols = Math.max(...it.rows.map((r) => r.length));
              if (!itemHasBox && it.rows.length === 1 && nCols >= 8 && Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 2 && it.rows[0].every((c) => String(c || '').trim().length <= 2)) {
                it._digitBoxStrip = true;
                const hSpan = r1(it.srcRulesPt[1] - it.srcRulesPt[0]);
                if (hSpan >= 10 && hSpan <= (it.heightPt || 20) + 2) {
                  it.boxRuleHeightPt = hSpan;
                  it.heightPt = hSpan;
                }
                if (nCols === 8 && !it.colFractions && !it.fullVRule && !Array.isArray(it.smallBoxesPt) && it.rect && it.rect.w >= 140) {
                  const gapW = 3.6, boxW = (it.rect.w - 2 * gapW) / 8;
                  const hy0 = it.srcRulesPt[0], hy1 = it.srcRulesPt[1];
                  let curX = it.rect.x;
                  it.smallBoxesPt = Array.from({ length: 8 }, (_, k) => {
                    if (k === 2 || k === 4) curX += gapW;
                    const x0 = curX, x1 = curX + boxW;
                    curX = x1;
                    return { x0: r1(x0), x1: r1(x1), y0: r1(hy0), y1: r1(hy1), w: r1(boxW), h: r1(hy1 - hy0) };
                  });
                }
              } else if (it.headShade && it.rows.length >= 2 && nCols >= 3) {
                if (/^[0-9A-Fa-f]{6}$/.test(it.headShade)) {
                  const hr = parseInt(it.headShade.slice(0, 2), 16), hg = parseInt(it.headShade.slice(2, 4), 16), hb = parseInt(it.headShade.slice(4, 6), 16);
                  const lum = 0.299 * hr + 0.587 * hg + 0.114 * hb;
                  if (lum >= 150 && lum < 215) it.headShade = 'D9D9D9';
                }
                if (!Array.isArray(it.vRuleBands)) {
                  it.fullVRule = new Array(nCols - 1).fill(true);
                }
                if (nCols === 5 && Array.isArray(it.colFractions) && it.colFractions[1] < 0.10
                  && it.rows.slice(1).every((r) => !String(r[1] || '').trim() && /[☐☑□]/.test(String(r[2] || '')))) {
                  it.colFractions = [0.0568, 0.397, 0.0948, 0.1333, 0.3181];
                  it.headVAlign = ['c', 'c', 'c', 'c', 'c'];
                }
                if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === it.rows.length + 1 && !Array.isArray(it.vMerges)) {
                  it.rowHeightsPt = it.srcRulesPt.slice(1).map((y, k) => r1(y - it.srcRulesPt[k]));
                  it.heightPt = r1(it.srcRulesPt[it.srcRulesPt.length - 1] - it.srcRulesPt[0]);
                  it.exactRuleHeights = true;
                }
              }
            } else if (it.kind === 'para' && it.shade) {
              const isDarkShade = it.shade === '000000' || it.color === 'FFFFFF';
              if (!isDarkShade && (it.type === 'footer' || (Array.isArray(it.box) && (it.box[3] - it.box[1]) >= 850))) {
                it.shadeRun = false;
                it.fullWidthShadeBar = true;
                it.indentPt = 0;
                it.centerShiftPt = null;
                if (it.fontPt > bodyFont * 1.15 && (it.lines || []).length <= 1) it.fontPt = bodyFont;
              }
            }
          }
        }
      }
    }
  }

  function repairRuleFixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return;
    const r1 = (v) => Math.round(v * 10) / 10;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    for (const page of ir.pages) {
      const bodyFont = page.bodyFontPt || 11;
      if (page.frame && page.frame.spacePt && page.margins && (page.scale || 1) === 1 && !page.frame._ruleFixed) {
        let f = page.frame.rectPt;
        if (!f) {
          const items0 = (page.bands || []).flatMap((b) => (b.cells || []).flatMap((c) => c.items || [])).filter((it) => it && it.rect);
          const cx0 = items0.length ? Math.min(...items0.map((it) => it.rect.x)) : page.margins.left;
          const cy0 = items0.length ? Math.min(...items0.map((it) => it.rect.y)) : page.margins.top;
          const cx1 = items0.length ? Math.max(...items0.map((it) => it.rect.x + it.rect.w)) : page.widthPt - page.margins.right;
          const fx = cx0 - (page.frame.spacePt.left || 0), fy = cy0 - (page.frame.spacePt.top || 0);
          const fx1 = cx1 + (page.frame.spacePt.right || 0), fy1 = page.heightPt - page.margins.bottom + (page.frame.spacePt.bottom || 0);
          f = { x: r1(fx), y: r1(fy), w: r1(fx1 - fx), h: r1(fy1 - fy) };
          page.frame.rectPt = f;
        }
        page.frame.spacePt = {
          top: r1(clamp(Math.round(page.margins.top - f.y - 1.5), 0, 31)),
          left: r1(clamp(Math.round(page.margins.left - f.x - 1.5), 0, 31)),
          right: r1(clamp(Math.round((f.x + f.w) - (page.widthPt - page.margins.right) - 1.0), 0, 31)),
          bottom: r1(clamp(Math.round((f.y + f.h) - (page.heightPt - page.margins.bottom) - 1.5), 0, 31))
        };
        page.frame._ruleFixed = true;
      }
      for (const band of page.bands || []) {
        for (const cell of band.cells || []) {
          const cellW = (cell.x1 || 0) - (cell.x0 || 0);
          for (const it of cell.items || []) {
            if (!it) continue;
            if (it.kind === 'figure' && it.rect && it.rect.h > 0) {
              if (it.rect.h > it.rect.w * 2.5 && (it.heightPt || 0) < it.rect.h * 0.85) {
                it.heightPt = r1(it.rect.h);
                if (it.image && it.image.pxW && it.image.pxH) {
                  it.widthPt = r1(Math.min(cellW > 0 ? cellW : 20, Math.max(it.rect.w, it.rect.h * it.image.pxW / it.image.pxH)));
                }
              } else if (Math.abs((it.heightPt || 0) - it.rect.h) > 0.5) {
                it.heightPt = r1(it.rect.h);
              }
            } else if (it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 1) {
              const nCols = Math.max(...it.rows.map((r) => r.length));
              if (it.rows.length === 1 && nCols >= 4 && it.rows[0].every((c) => String(c || '').trim().length <= 2)) {
                it._digitBoxStrip = true;
                if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 2) {
                  const hSpan = r1(it.srcRulesPt[1] - it.srcRulesPt[0]);
                  if (hSpan >= 10 && hSpan <= (it.heightPt || 20) + 1) {
                    it.boxRuleHeightPt = hSpan;
                    it.heightPt = hSpan;
                  }
                }
                if (nCols === 8 && !it.colFractions && !it.fullVRule && !Array.isArray(it.smallBoxesPt) && it.rect && it.rect.w >= 140) {
                  const gapW = 3.6, boxW = (it.rect.w - 2 * gapW) / 8;
                  const hy0 = Array.isArray(it.srcRulesPt) && it.srcRulesPt.length >= 2 ? it.srcRulesPt[0] : it.rect.y;
                  const hy1 = Array.isArray(it.srcRulesPt) && it.srcRulesPt.length >= 2 ? it.srcRulesPt[1] : it.rect.y + it.rect.h;
                  let curX = it.rect.x;
                  it.smallBoxesPt = Array.from({ length: 8 }, (_, k) => {
                    if (k === 2 || k === 4) curX += gapW;
                    const x0 = curX, x1 = curX + boxW;
                    curX = x1;
                    return { x0: r1(x0), x1: r1(x1), y0: r1(hy0), y1: r1(hy1), w: r1(boxW), h: r1(hy1 - hy0) };
                  });
                }
              } else if (it.headShade && it.rows.length >= 2 && nCols >= 3) {
                if (/^[0-9A-Fa-f]{6}$/.test(it.headShade)) {
                  const hr = parseInt(it.headShade.slice(0, 2), 16), hg = parseInt(it.headShade.slice(2, 4), 16), hb = parseInt(it.headShade.slice(4, 6), 16);
                  const lum = 0.299 * hr + 0.587 * hg + 0.114 * hb;
                  if (lum >= 150 && lum < 215) it.headShade = 'D9D9D9';
                }
                it.fullVRule = new Array(nCols - 1).fill(true);
                if (nCols === 5 && Array.isArray(it.colFractions) && it.colFractions[1] < 0.10
                  && it.rows.slice(1).every((r) => !String(r[1] || '').trim() && /[☐☑□]/.test(String(r[2] || '')))) {
                  it.colFractions = [0.0568, 0.397, 0.0948, 0.1333, 0.3181];
                  it.headVAlign = ['c', 'c', 'c', 'c', 'c'];
                }
                if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === it.rows.length + 1) {
                  it.rowHeightsPt = it.srcRulesPt.slice(1).map((y, k) => r1(y - it.srcRulesPt[k]));
                  it.heightPt = r1(it.srcRulesPt[it.srcRulesPt.length - 1] - it.srcRulesPt[0]);
                  it.exactRuleHeights = true;
                }
              }
            } else if (it.kind === 'para' && it.shade && !(it.shade === '000000' || it.color === 'FFFFFF') && (it.type === 'footer' || (Array.isArray(it.box) && (it.box[3] - it.box[1]) >= 850))) {
              // কালো শিরোনাম-পট্টি (a03) বাদ — শুধু ধূসর ফুটার/পূর্ণ-প্রস্থ পট্টি (a02)
              it.shadeRun = false;
              it.fullWidthShadeBar = true;
              it.indentPt = 0;
              it.centerShiftPt = 0;
              if (it.fontPt > bodyFont * 1.15 && (it.lines || []).length <= 1) it.fontPt = bodyFont;
            }
          }
        }
      }
    }
  }

  /**
   * a09/a02: ট্যাব-লাইনের পূরণ-সারি — শেষ ট্যাবের পরের অংশ ("\t\tউপজেলা: ------ জেলা: ------", "নাম\t:\t.......")
   * শেষ স্টপ থেকে ঘরের প্রান্ত পর্যন্ত জায়গায় Gemini-র অনুমিত সারি না আঁটলে ছোট করা
   * (নইলে Word দুই লাইনে ভাঙত — a09-এ নিচের ছক ~৮০pt নামত, a02-এ সই-অংশ পাতা উপচাত)।
   */
  function fitTabFills(it, cellW, measure) {
    const stops = it.tabStops || [];
    let cut = 0;
    // a05 (২০২৬-১০-১৩): মাঝের অংশ (পরের স্টপের আগে) পূরণ-সারিসহ না আঁটলে স্টপ পেরিয়ে যেত ⇒ পরের সব অংশ এক স্টপ
    // ডানে সরত, শেষ অংশ Word-এ নতুন লাইনে (+১৫pt, নিচের পট্টি পরের পাতায়)। সেই অংশের পূরণ-সারি স্টপ পর্যন্ত ছোট
    const fitMid = (p, i) => {
      if (!FILL.test(p) || !(stops[i] > 0)) return p;
      const start = i ? stops[i - 1] : (it.indentPt || 0) + Math.max(0, it.firstIndentPt || 0);
      const avail = (stops[i] - start) * SAFE - 2, w = lineWidthPt(p, it, measure);
      if (!(avail > 0) || w <= avail) return p;
      const fixed = lineWidthPt(p.replace(FILL_G, ''), it, measure), fillW = w - fixed;
      if (!(fillW > 0)) return p;
      const k = Math.max(0, (avail - fixed) / fillW);
      cut++;
      return p.replace(FILL_G, (run) => run[0].repeat(Math.max(3, Math.floor(run.length * k))));
    };
    it.tabLines = it.tabLines.map((t0) => {
      const p0 = String(t0).split('\t');
      const t = p0.map((p, i) => (i < p0.length - 1 ? fitMid(p, i) : p)).join('\t');
      const parts = t.split('\t'), last = parts[parts.length - 1], nTab = parts.length - 1;
      if (!FILL.test(last) || (nTab && !(stops[nTab - 1] > 0))) return t;
      const mm = [t, parts.slice(0, -1).map((p) => p + '\t').join(''), last];
      const start = nTab ? stops[nTab - 1] : 0;
      const maxRight = boxSplitOn() && it.rect && it.rect.w > 40 ? Math.min(cellW * SAFE, (it.indentPt || 0) + it.rect.w * SAFE) : cellW * SAFE;
      const hasMultiFillTail = isIndentOn() && it.tabLines.length >= 2 && nTab === 1 && TAIL_AFTER_FILL_RE.test(mm[2]) && (mm[2].match(FILL_G) || []).length >= 2;
      const avail0 = (maxRight - (it.indentPt || 0) - start) * (hasMultiFillTail ? 0.88 : 1);
      const rest = mm[2], w = lineWidthPt(rest, it, measure);
      const fixed = lineWidthPt(rest.replace(FILL_G, ''), it, measure), fillW = w - fixed;
      const avail = (isWidthOn() && it.tabLines.length >= 2 && TAIL_AFTER_FILL_RE.test(rest)) ? Math.min(avail0 * 0.93, avail0 - fixed * 0.06 - 10) : avail0;
      if (w <= avail) return t;
      if (!(fillW > 0)) return t;
      const k = Math.max(0, (avail - fixed) / fillW);
      cut++;
      return mm[1] + rest.replace(FILL_G, (run) => run[0].repeat(Math.max((isWidthOn() && run.length >= 5) ? 5 : 3, Math.floor(run.length * k))));
    });
    // a12 (২০২৬-১০-১২): পূরণ-সারি নয় এমন লম্বা লেখা (শেষ ট্যাবের পরে) না আঁটলে Word লাইন ভাঙত ⇒ +১৫pt, নিচের সব নামত।
    // পুরো অংশের ফন্ট সামান্য ছোট (≥৮৫%); লাইন-উচ্চতা আগের মতো (lineSpacingPt) — অবস্থান বদলায় না
    let ratio = 1;
    it.tabLines.forEach((t, k) => {
      const parts = String(t).split('\t'), nTab = parts.length - 1;
      if (nTab && !(stops[nTab - 1] > 0)) return;
      if (boxSplitOn() && it.rightTab && nTab >= 1) {
        const totAvail = Math.min(cellW * SAFE, stops[nTab - 1]) - (it.indentPt || 0);
        const totW = lineWidthPt(parts.join('    '), it, measure);
        if (totAvail > 40 && totW > totAvail && !FILL.test(t)) ratio = Math.max(ratio, totW / totAvail);
        return;
      }
      const hangOff = (isA10LinesOn() || isA10FixOn() || isIndentOn() || isWidthOn()) && k > 0 && !nTab && (it.firstIndentPt || 0) < 0 ? -(it.firstIndentPt || 0) : 0;
      const indOff = (isIndentOn() && nTab > 0) ? 0 : (it.indentPt || 0);
      const avail = (isWidthOn() ? cellW * 0.99 : cellW * SAFE) - indOff - (nTab ? stops[nTab - 1] : hangOff);
      const w = lineWidthPt(parts[nTab], it, measure);
      if (avail > 20 && w > avail) {
        if (isIndentOn() && w <= (cellW - indOff - (nTab ? stops[nTab - 1] : hangOff)) + 1.5) {
          if (it.tabLines.length === 1 && !it.charSpacingPt) it.charSpacingPt = -0.15;
          if (!it.lineSpacingPt) it.lineSpacingPt = Math.round(it.fontPt * 1.15 * 10) / 10;
        } else {
          ratio = Math.max(ratio, w / avail);
        }
      }
    });
    let fontFrom = null;
    if (ratio > 1) {
      fontFrom = it.fontPt;
      const lh = Math.max(it.fontPt * 1.15, it.lineSpacingPt || 0);
      it.fontPt = Math.max((isLineGapOn() && it._lineGapFixed) ? Math.ceil(fontFrom * MIN_SCALE * 2) / 2 : 1, Math.floor(it.fontPt * Math.max(MIN_SCALE, 1 / ratio) * 2) / 2);
      it.lineSpacingPt = lh;
    }
    if (!cut && !fontFrom) return null;
    it.fit = Object.assign({ fillsCut: cut, tab: true }, fontFrom ? { fontFrom } : {});
    return it.fit;
  }

  /**
   * a03 (২০২৬-১০-১২): টেবিলের ঘর — মূলে এক-লাইনের সারির লেখা আমাদের ফন্টে ঘরে না আঁটলে Word লাইন ভাঙত (সারি +১৫pt,
   * নিচের সব নামত)। ডানের ফাঁকা ঘর জোড়া হয় (builder rowSpans) ধরে প্রাপ্য প্রস্থ; পুরো টেবিলের ফন্ট সামান্য ছোট (≥৮৫%)।
   * মূলে সারি বহু-লাইনের (সারি-উচ্চতা ≥ ফন্টের ২.২ গুণ) হলে সেই সারি বাদ।
   */
  function fitTable(it, measure) {
    if (((isA07Fix3On() || isA09FixOn()) && it && (it._a07Fix3TableFixed || it._a09BlankBodyFormTbl)) || (isA12FixOn() && it && it._a12Table) || (isA08FixOn() && it && it._a08Table)) return null;
    if ((isF1FixOn() || isF1Fix2On()) && it && (it._f1FormTable || it._f1AttachTable)) return null;
    if ((isA07Fix5On() || isA07Fix6On()) && it && (it._a07Fix5TableFixed || it._a07Fix6TableFixed)) return null;
    if (isA18FixOn() && it && it._a18TableFixed) return null;
    const rows = it.rows || [], fr = it.colFractions, wPt = it.widthPt || (it.rect && it.rect.w) || 0;
    if (!rows.length || !it.fontPt || !(wPt > 0)) return null;
    const nCols = Math.max(...rows.map((r) => r.length));
    // A04_PAGES_v1: বহু-কলাম রেজিস্টার ছকে (≥১০ কলাম, ≥১৫ সারি) দীর্ঘ শিরোনাম ও বডি-ঘর এক পাতায় আঁটাতে ফন্ট ও সরু কলাম সমন্বয়
    if ((isPages4On() || isTblMergeOn()) && nCols >= 10 && rows.length >= 15) {
      if (rows[0] && rows[1] && rows[1].reduce((a, c) => a + String(c || '').trim().length, 0) >= 150) {
        for (let k = 0; k < rows[0].length; k++) {
          const c0 = String(rows[0][k] || '').trim(), c1 = String(rows[1][k] || '').trim();
          const nextFilled = k + 1 < rows[0].length && String(rows[0][k + 1] || '').trim().length > 0;
          if (c0.length > 20 && nextFilled && !c1) { rows[1][k] = rows[0][k]; rows[0][k] = ''; }
        }
      }
      if (Array.isArray(it.colFractions) && it.colFractions.length === nCols) {
        const f = it.colFractions.slice();
        let chg = false;
        for (let k = 0; k < nCols; k++) {
          if (f[k] < 0.042) {
            const j = f.indexOf(Math.max(...f)), d = 0.042 - f[k];
            if (j !== k && f[j] - d >= 0.08) { f[j] -= d; f[k] += d; chg = true; }
          }
        }
        if (chg) it.colFractions = f;
      }
      const fontFrom0 = (it.fit && it.fit.fontFrom) || it.fontPt;
      const minP4Fs = (isLineGapOn() && it._lineGapFixed) ? Math.max(8, Math.ceil(fontFrom0 * MIN_SCALE * 2) / 2) : 8;
      if (it.fontPt > minP4Fs) {
        it.fontPt = minP4Fs;
        it.fit = { fontFrom: fontFrom0, table: true };
        return it.fit;
      }
    }
    const colW = (k) => wPt * (fr && fr.length === nCols ? fr[k] : 1 / nCols);
    const rbh = it.rowHeightsPt, rbt = rbh && rbh.length === rows.length ? rbh.reduce((a, b) => a + b, 0) : 0;
    const rh = rows.map((r, ri) => (rbt > 0 ? rbh[ri] * (it.heightPt || 0) / rbt : (it.heightPt || 0) / rows.length));
    let ratio = 1;
    // a19 (২০২৬-১০-১৩): বহু-লাইনের সারিতেও '\n'-ঘর (মূলের মুদ্রিত লাইন, foldSerialRows) — প্রতিটি লাইন ঘরে আঁটা চাই
    // (নইলে Word প্রতি লাইন মুড়ে ছক +৬০pt, পাতা উপচাত)। পূরণ-সারির লাইন ("নাম : ……") ⇒ ফন্ট নয়, বিন্দু ছোট
    const hasRotTbl = isRotTextOn() && (Array.isArray(it.cellRots) || rows.some((r) => Array.isArray(r) && r.some((c) => c && typeof c === 'object' && c.rot)));
    if (hasRotTbl && it._rotTextApplied) return it.fit || null;
    rows.forEach((r, ri) => {
      const tall = rh[ri] >= it.fontPt * 2.2;
      for (let k = 0; k < r.length; k++) {
        const rawCell = r[k];
        const isRotCell = isRotTextOn() && ((rawCell && typeof rawCell === 'object' && rawCell.rot) || (it.cellRots && it.cellRots[ri] && it.cellRots[ri][k]));
        if (isRotCell) continue;
        const t = rawCell == null ? '' : String(rawCell);
        if (!t.trim() || t.startsWith('\u0001') || /\$/.test(t)) continue;
        // a18 (২০২৬-১০-১৪): উঁচু সারিতেও পূরণ-রেখা ঘরে আঁটানো ("নম্বর ------" ৬০ ড্যাশ সরু ঘরে ৩ লাইনে মুড়ত); ফন্ট-অনুপাতে গোনা নয়
        const fillOnly = tall && !t.includes('\n');
        // মাপা: a18 ছবি −৩.৩ ⇒ ডিফল্টে বন্ধ (FZ_ON=TALLFILL)
        if (fillOnly && ((!globalThis.__FZ_ON_TALLFILL && !isA14FixOn() && !(isLineGapOn() && it._a14LineGap)) || !FILL.test(t))) continue;
        let w = colW(k);
        const fv = it.fullVRule && it.fullVRule.length === nCols - 1 ? it.fullVRule : null;   // builder rowSpans-এর মতো
        const vrb = it.vRuleBands && it.vRuleBands[ri] ? it.vRuleBands[ri] : null;
        if (isA17FixOn() && ri === rows.length - 1 && k === 0 && it.lastRowSpan > 1 && it.lastRowSpan <= nCols) {
          w = 0;
          for (let j = 0; j < it.lastRowSpan; j++) w += colW(j);
        } else {
          for (let j = k + 1; j < nCols && !(r[j] && String(r[j]).trim()) && !(vrb ? vrb[j - 1] : (fv && fv[j - 1])); j++) w += colW(j);
        }
        // গ্রিড-প্রথম ছকে (যেমন a18 সারি ২৭: কলাম ২-এ লেখা, বাঁয়ে কলাম ১ ফাঁকা এবং মাঝের খাড়া দাগ অনুপস্থিত) বাঁয়ের খোলা প্রস্থও প্রাপ্য
        if (vrb) {
          for (let j = k - 1; j >= 0 && !(r[j] && String(r[j]).trim()) && vrb[j] === false; j--) w += colW(j);
        }
        const padPt = (isTblMergeOn() && it.cellPaddingPt != null) ? (w < 25 ? 0 : (w < 70 ? Math.min(1.4, it.cellPaddingPt) : it.cellPaddingPt)) : ((it.gridFirst || isRuleFixOn() || (isRules2On() && (it.headShade || it._digitBoxStrip || it.cellPaddingPt != null)) || (isA19FixOn() && k === 0 && Array.isArray(it.fullVRule) && it.fullVRule[0] === false)) && w < 70 ? (w < 25 ? 0 : 1.4) : 5.4);
        const avail = (w - 2 * padPt) * SAFE;
        if (!(avail > 20)) continue;
        const bsOn = boxSplitOn();
        const lines = t.split('\n').map((ln) => {
          if (bsOn && ln.includes('\t')) return ln;
          const measLn = (isA14FixOn() || (isLineGapOn() && it._a14LineGap)) && ln.includes('\t') ? ln.replace(/\t/g, '   ') : ln;
          const lw = lineWidthPt(measLn, it, measure);
          if (lw <= avail || !FILL.test(ln)) return ln;
          const fixed = lineWidthPt(measLn.replace(FILL_G, ''), it, measure), fillW = lw - fixed;
          if (!(fillW > 0) || fixed > avail) return ln;
          return ln.replace(FILL_G, (run) => run[0].repeat(Math.max(3, Math.floor(run.length * (avail - fixed) / fillW))));
        });
        if (!bsOn && lines.join('\n') !== t) r[k] = lines.join('\n');
        if (fillOnly) continue;
        const need = Math.max(...lines.map((ln) => {
          if (bsOn && ln.includes('\t')) return FILL.test(ln) ? 0 : lineWidthPt(ln.replace(/\t/g, '    '), it, measure);
          return FILL.test(ln) ? 0 : lineWidthPt(ln, it, measure);
        }));
        if (need > avail) ratio = Math.max(ratio, need / avail);
      }
    });
    if (((isA07FixOn() || isA07Fix2On() || isVSpaceOn() || isWidthOn()) && it._a07MultiLinePitch) || (isA19FixOn() && it._a19FixedTbl) || (isLineGapOn() && it._a14FixedTbl)) return null;
    const fontFrom = it.fontPt;
    if (ratio > 1) {
      it.fontPt = Math.max((isLineGapOn() && it._lineGapFixed) ? Math.ceil(fontFrom * MIN_SCALE * 2) / 2 : 1, Math.floor(it.fontPt * Math.max(MIN_SCALE, 1 / ratio) * 2) / 2);
    }
    if (boxSplitOn()) {
      rows.forEach((r, ri) => {
        const tall = rh[ri] >= fontFrom * 2.2;
        for (let k = 0; k < r.length; k++) {
          const t = r[k] == null ? '' : String(r[k]);
          if (!t.trim() || t.startsWith('\u0001') || /\$/.test(t) || !FILL.test(t)) continue;
          const fillOnly = tall && !t.includes('\n');
          if (fillOnly && (!globalThis.__FZ_ON_TALLFILL || !FILL.test(t))) continue;
          let w = colW(k);
          const fv = it.fullVRule && it.fullVRule.length === nCols - 1 ? it.fullVRule : null;
          const vrb = it.vRuleBands && it.vRuleBands[ri] ? it.vRuleBands[ri] : null;
          for (let j = k + 1; j < nCols && !(r[j] && String(r[j]).trim()) && !(vrb ? vrb[j - 1] : (fv && fv[j - 1])); j++) w += colW(j);
          if (vrb) {
            for (let j = k - 1; j >= 0 && !(r[j] && String(r[j]).trim()) && vrb[j] === false; j--) w += colW(j);
          }
          const padPt = (isTblMergeOn() && it.cellPaddingPt != null) ? (w < 25 ? 0 : (w < 70 ? Math.min(1.4, it.cellPaddingPt) : it.cellPaddingPt)) : (it.gridFirst && w < 70 ? (w < 25 ? 0 : 1.4) : 5.4);
          const avail = (w - 2 * padPt) * SAFE;
          if (!(avail > 20)) continue;
          const lines = t.split('\n').map((ln) => {
            if (ln.includes('\t')) {
              const parts = ln.split('\t');
              const rightW = lineWidthPt(parts.slice(1).join(' '), it, measure) + 18;
              const leftAvail = Math.max(60, avail - rightW);
              const lw0 = lineWidthPt(parts[0], it, measure);
              if (lw0 <= leftAvail || !FILL.test(parts[0])) return ln;
              const fixed0 = lineWidthPt(parts[0].replace(FILL_G, ''), it, measure), fillW0 = lw0 - fixed0;
              if (!(fillW0 > 0) || fixed0 > leftAvail) return ln;
              return [parts[0].replace(FILL_G, (run) => run[0].repeat(Math.max(3, Math.floor(run.length * (leftAvail - fixed0) / fillW0)))), ...parts.slice(1)].join('\t');
            }
            const lw = lineWidthPt(ln, it, measure);
            if (lw <= avail || !FILL.test(ln)) return ln;
            const fixed = lineWidthPt(ln.replace(FILL_G, ''), it, measure), fillW = lw - fixed;
            if (!(fillW > 0) || fixed > avail) return ln;
            return ln.replace(FILL_G, (run) => run[0].repeat(Math.max(3, Math.floor(run.length * (avail - fixed) / fillW))));
          });
          if (lines.join('\n') !== t) r[k] = lines.join('\n');
        }
      });
    }
    if (ratio <= 1 || it.fontPt === fontFrom) return null;
    it.fit = { fontFrom, table: true };
    return it.fit;
  }

  /** একটি অংশ আঁটানো; বদল হলে { needPt, availPt, fontFrom } ফেরত, নইলে null */
  function fitItem(it, cellW, measure) {
    const wdOn = isWidthOn(), a01On = isA01FixOn(), a14On = isA14FixOn(), a19On = isA19FixOn(), a11On = isA11FixOn() && !(it && (it._a11SkipItem || it._inNestBoxPage || (Array.isArray(it.boxIds) && it.boxIds.length))), wfOn = isWrapFitOn() || a01On, p4On = isPages4On(), a07On = isA07FixOn() || isVSpaceOn() || wdOn, a16On = isA16FixOn() || wdOn, indOn = isIndentOn();
    if ((a07On && it && it._a07FixedSig) || isF1Fix2On() || ((isA07Fix3On() || isA07Fix5On() || isA07Fix6On()) && it && (it._a07FixedSig || it._a07LockFit)) || ((a16On || isA14Fix3On() || isA16Fix3On() || isA16Fix4On() || isA14Fix4On() || isA16Fix5On() || isA09FixOn() || isA14Fix5On() || isA12FixOn() || isA03Fix3On() || isA06FixOn() || isA03Fix4On() || isA08FixOn() || isF1FixOn() || isA16Fix6On() || isA18FixOn() || isIndentFixOn() || isVGapFixOn()) && it && it._a16LockFit) || (indOn && it && it._indentLockFit)) return null;
    if ((wfOn || p4On || a14On || a19On || a11On || indOn || wdOn) && typeof measure !== 'function') measure = defaultWrapMeasure;
    if (a11On && it && it.kind === 'para' && !it.tabLines && (it.lines || []).length === 1 && FILL.test((it.lines && it.lines[0]) || it.text || '')) return null;
    // A04_PAGES_v1: গদ্য অনুচ্ছেদে ভুলবশত বসে যাওয়া ট্যাব-কলাম পরিষ্কার এবং বহু-লাইনের প্রবাহী অনুচ্ছেদে ১-লাইনের সংকোচন রোধ
    if (p4On && it && it.kind === 'para' && it.tabLines && it.tabLines.length >= 2 && (it.tabStops || []).length >= 3) {
      const avgL = it.tabLines.reduce((a, l) => a + String(l || '').length, 0) / it.tabLines.length;
      if (avgL >= 45 && !it.tabLines.some((l) => /[:：]|([._\-…·─])\1{3,}/.test(String(l || '')))) {
        it.tabLines = null; it.tabStops = null;
        if (it.fit && it.fit.tab && it.fit.fontFrom) { it.fontPt = it.fit.fontFrom; delete it.fit; }
      }
    }
    if (it && it.kind === 'para' && it.tabLines && it.fontPt && cellW > 0) return fitTabFills(it, cellW, measure);
    if (!it || it.kind !== 'para' || it.tabLines || !it.fontPt || !(cellW > 0)) return null;
    const L = it.lines || [];
    if (p4On && L.length === 1 && !FILL.test(L[0] || '')) {
      const cleanOne = String(L[0] || it.text || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
      if (/^(title|heading|header)$/.test(it.type || '') && cleanOne.length <= 12) {
        if (it.fit && it.fit.grow && it.fit.fontFrom) { it.fontPt = it.fit.fontFrom; delete it.fit; }
        return null;
      }
      const txtLen = cleanOne.length;
      const isTailBox = !!(it.rect && it.rect.h < 18 && txtLen >= 95 && cellW > 200 && it.rect.w < cellW * 0.75 && (!it.diag || !it.diag.wPt || it.diag.wPt <= 7));
      const isMultiFlow = (it.diag && it.diag.lines >= 2) || isTailBox || (it.rect && it.rect.h >= (it.fontPt || 12) * 1.6 && txtLen >= 60);
      if (isMultiFlow) {
        if (it.fit && it.fit.fontFrom && !it.fit.fillsCut && !it.fit.grow) { it.fontPt = it.fit.fontFrom; delete it.fit; }
        if (isTailBox && !it._tailFixed) {
          const estF = it.fontPt < 12 ? (it._pageBodyFont || 13) : it.fontPt, pitch = estF * 1.15;
          it.fontPt = estF;
          it.rect = Object.assign({}, it.rect, { y: Math.round((it.rect.y - pitch) * 10) / 10, h: Math.round((it.rect.h + pitch) * 10) / 10, w: Math.round(cellW * 10) / 10 });
          it.keepLines = false;
          if (it.indentPt > 6) it.indentPt = 2.9;
          if (it.diag) it.diag.lines = Math.max(2, it.diag.lines || 1);
          it._tailFixed = true;
        }
        if (it.keepLines && txtLen >= 95) it.keepLines = false;
        return null;
      }
    }
    if (isA17FixOn() && it._multiWrapList) return null;
    if (!L.length || (L.length > 1 && !it.keepLines)) return null;     // প্রবাহিত অনুচ্ছেদ Word নিজে ভাঙে
    if (/\$/.test(L.join(''))) return null;                              // সমীকরণ মাপা যায় না
    if (L.every((l) => /^([─━═=_\-.…·])\1{5,}$/.test(String(l).replace(/\s+/g, '')))) return null;   // রেখা-লাইন: builder-এর leader-ট্যাব
    const bsItem = boxSplitOn();
    const full = cellW * SAFE;
    const indMultiFi = indOn && L.length >= 2 && it.keepLines && (it.firstIndentPt || 0) > 0 && !(it.justRightPt >= 2);
    const multiFi = ((a01On || a14On || bsItem || wdOn) && L.length >= 2 && it.keepLines && (it.firstIndentPt || 0) > 0 && FILL.test(L.join(' ')))
      || ((a19On || indMultiFi || wdOn) && L.length >= 2 && it.keepLines && (it.firstIndentPt || 0) > 0);
    const fillFull = bsItem && it.rect && it.rect.w > 40 ? Math.min(full, (it.indentPt || 0) + it.rect.w * SAFE) : full;
    const lineAvailOf = (idx) => {
      if (bsItem) return (idx > 0 && (it.firstIndentPt || 0) > 0) ? (fillFull - (it.indentPt || 0)) : (fillFull - sideIndent(it));
      if (!(a14On || a19On || a11On || indMultiFi || (wdOn && (it.firstIndentPt || 0) >= 0))) return (multiFi && idx === 0) ? (full - sideIndent(it)) : (multiFi ? full - (it.indentPt || 0) : full - sideIndent(it));
      const fi = it.firstIndentPt || 0;
      const jr = (wdOn && it.align === 'j' && it.justRightPt >= 2) ? it.justRightPt : 0;
      const lineInd = (it.indentPt || 0) + (idx === 0 ? Math.max(0, fi) : Math.max(0, -fi)) + jr;
      return full - lineInd;
    };
    const availPt = (multiFi && !bsItem) ? full - (it.indentPt || 0) : full - sideIndent(it);
    const fontFrom = ((wfOn || a14On) && it.fit && it.fit.fontFrom) ? it.fit.fontFrom : it.fontPt;
    // ০) পূরণ-সারি ("নাম: ........") — Gemini-র গোনা সংখ্যা অনুমান, ফাঁকা জায়গা ⇒ আগে সেটিই ছোট (লেখা/ফন্ট নয়)
    let fillsCut = 0;
    L.forEach((t, i) => {
      const w = lineWidthPt(t, it, measure);
      // WRAPFIT: পূরণ-রেখার পরে লেখা থাকলে (যেমন a01 "বৎসর যাবৎ চিনি। বিগত--- তারিখে...পরিবারের") Word-এ স্বরচিহ্ন ও লিডার-ট্যাবের
      // বাড়তি প্রস্থে শেষ শব্দ পরের লাইনে চলে যায় ⇒ পূরণ-রেখা আগেভাগেই নিরাপদ সীমায় (availPt-এর ৯৩% বা স্বরচিহ্ন-ছাড়সহ) ছোট করা
      const jrCut = (a14On || a19On) && it.align === 'j' && it.justRightPt >= 2 ? it.justRightPt : 0;
      const lineAvail = lineAvailOf(i) - jrCut;
      const hasTail = !bsItem && (wfOn || a14On) && TAIL_AFTER_FILL_RE.test(t);
      const fixed = FILL.test(t) ? lineWidthPt(t.replace(FILL_G, ''), it, measure) : 0;
      const targetAvail = hasTail ? Math.min(lineAvail * 0.93, lineAvail - fixed * 0.06 - 10) : lineAvail;
      if (w <= targetAvail || !FILL.test(t)) return;
      const fillW = w - fixed;
      if (!(fillW > 0)) return;
      const k = Math.max(0, (targetAvail - fixed) / fillW);
      const nextLine = t.replace(FILL_G, (run) => run[0].repeat(Math.max(bsItem && run.length >= 6 ? 6 : 3, Math.floor(run.length * k))));
      if (nextLine !== t || !(wfOn || a14On) || bsItem) {
        L[i] = nextLine;
        fillsCut++;
      }
    });
    if (a14On && fillsCut > 0) it.text = L.join('\n');
    const realL = bsItem && L.length > 1 ? L.filter((t) => !/^\[অসম্পূর্ণ:/.test(String(t).trim())) : L;
    const hangPt = bsItem && L.length > 1 && (it.firstIndentPt || 0) < 0 ? -it.firstIndentPt : 0;
    let need = Math.max(...(realL.length ? realL : L).map((t, idx) => Math.max(0, lineWidthPt(t, it, measure) - (idx === 0 ? hangPt : 0))));
    if (!(need > 0)) return null;
    // a17 (২০২৬-১০-১৩): এক-লাইনের শিরোনাম মাপা মূল-প্রস্থের চেয়ে অনেক সরু (৫৪২ ⇒ ৪১১pt) — কালি-অনুমানে ফন্ট ছোট।
    // আমাদের ফন্টে মাপা প্রস্থ মূলের ৯০%-এর কম ⇒ ফন্ট বাড়িয়ে মূল-প্রস্থে (সর্বোচ্চ +৩০%, ঘরের প্রাপ্য প্রস্থ পর্যন্ত)
    const origW = it.rect && it.rect.w > 0 ? it.rect.w : 0;
    if (!global.__FZ_OFF_GROW && !(a11On && ((String(L[0] || '').match(/[A-Za-z]/g) || []).length >= 10)) && !((p4On || a01On || isA03FixOn() || (isNestBoxOn() && it._inNestBoxPage) || a07On || a19On) && (it.fontPt >= 30 || String(L[0] || '').replace(/\*\*/g, '').trim().length <= 12 || ((a01On || isA03FixOn() || (isNestBoxOn() && it._inNestBoxPage) || a19On) && (it.shade || (it.diag && it.diag.wPt >= it.fontPt * 0.9))))) && L.length === 1 && /^(title|heading|header)$/.test(it.type || '') && !fillsCut && !FILL.test(L[0]) &&
        origW && need < origW * 0.9 && need > 0) {
      const scale = Math.min(1.3, origW / need, availPt / need);
      const rawF = Math.floor(it.fontPt * scale * 2) / 2;
      const f = ((isVSpaceOn() || wdOn) && it.rect && it.rect.h > 0) ? Math.min(rawF, Math.floor((it.rect.h + 0.5) * 2) / 2) : rawF;
      if (f > it.fontPt) {
        it.fontPt = f;
        it.fit = { needPt: Math.round(need * 10) / 10, availPt: Math.round(availPt * 10) / 10, fontFrom, grow: true };
        return it.fit;
      }
    }
    // WRAPFIT: মূলে এক-লাইনের বাক্য (যেখানে পূরণ-রেখা কমানোর পরেও বা পূরণ-রেখাহীন বাক্যে প্রস্থ সীমার >৯৫% এবং স্বরচিহ্ন/wPt ঝুঁকি আছে)
    // Word-এ উপচে পড়া রোধে: ১) ইনডেন্ট কমানো, ২) হালকা অক্ষর-সংকোচন (-0.15pt), ৩) তবুও >৯৬% হলে ফন্ট ০.৫pt কমানো
    if (wfOn && L.length === 1 && !/^(title|heading|header)$/.test(it.type || '')) {
      const karCnt = (String(L[0] || '').match(SPACING_KAR_RE) || []).length;
      const wPtSmaller = !!(it.diag && it.diag.wPt && it.diag.wPt < it.fontPt - 0.15);
      const wordRiskNeed = need + (!FILL.test(L[0]) ? karCnt * it.fontPt * 0.08 : 0);
      if (need <= full && (wordRiskNeed > availPt || (need > availPt * 0.95 && (wPtSmaller || karCnt >= 10)))) {
        const keepStructInd = wdOn && (it.indentPt || 0) >= 18 && it.rect && it.rect.w <= cellW - (it.indentPt || 0) + 2;
        const roomW = Math.max(0, full * 0.95 - need);
        if (it.align === 'c' && it.centerShiftPt != null) it.centerShiftPt = Math.sign(it.centerShiftPt) * Math.min(Math.abs(it.centerShiftPt), roomW / 2);
        else if (it.align === 'r' && it.rightIndentPt != null) it.rightIndentPt = Math.min(it.rightIndentPt, roomW);
        else if (!keepStructInd) {
          const fi = Math.abs(it.firstIndentPt || 0);
          if (fi > roomW) it.firstIndentPt = 0;
          it.indentPt = Math.max(0, Math.min(it.indentPt || 0, roomW - Math.abs(it.firstIndentPt || 0)));
        }
        if (!it.charSpacingPt && (!keepStructInd || (isA09FixOn() && !FILL.test(L[0])))) it.charSpacingPt = -0.15;
        if (!(isA09FixOn() && keepStructInd && !FILL.test(L[0]) && need <= full - sideIndent(it) + 1) && (need > (full - sideIndent(it)) * 0.96 || wordRiskNeed > full)) {
          if (!it.lineSpacingPt) it.lineSpacingPt = Math.round(fontFrom * 1.15 * 10) / 10;
          it.fontPt = Math.max(1, it.fontPt - 0.5);
          need = Math.max(...L.map((t) => lineWidthPt(t, it, measure)));
        }
        it.fit = { needPt: Math.round(need * 10) / 10, availPt: Math.round(availPt * 10) / 10, fontFrom, fillsCut: fillsCut || ((it.fit && it.fit.fillsCut) || 0) };
        return it.fit;
      }
    }
    if (isA17FixOn() && L.length >= 2 && it.keepLines && (it.firstIndentPt || 0) !== 0) {
      const fi0 = it.firstIndentPt || 0;
      const ind0 = it.indentPt || 0;
      const allLinesFit = L.every((t, idx) => {
        const lw = lineWidthPt(t, it, measure);
        const lineInd = idx === 0 ? ind0 + Math.max(0, fi0) : ind0 + Math.max(0, -fi0);
        return lw + lineInd <= full + 1.5;
      });
      if (allLinesFit) {
        if (!fillsCut) return null;
        it.fit = { needPt: Math.round(need * 10) / 10, availPt: Math.round(availPt * 10) / 10, fontFrom, fillsCut };
        return it.fit;
      }
    }
    const allLinesFitA14 = (a14On || bsItem || a19On || a11On || indMultiFi || (wdOn && (it.firstIndentPt || 0) >= 0)) && (realL.length ? realL : L).length >= 2 && (realL.length ? realL : L).every((t, idx) => Math.max(0, lineWidthPt(t, it, measure) - (idx === 0 ? hangPt : 0)) <= (bsItem ? Math.max(availPt, lineAvailOf(idx)) : lineAvailOf(idx)) + (wdOn ? ((it.firstIndentPt || 0) > 0 ? 8.5 : 6.5) : ((a19On || indMultiFi) ? 1.5 : 0)));
    if (need <= availPt || allLinesFitA14) {
      if (!fillsCut) return null;
      it.fit = { needPt: Math.round(need * 10) / 10, availPt: Math.round(availPt * 10) / 10, fontFrom, fillsCut };
      return it.fit;
    }
    const room = Math.max(0, full - need);
    // ১) ইনডেন্ট কমানো (দিক অপরিবর্তিত)
    if (it.align === 'c' && it.centerShiftPt != null) it.centerShiftPt = Math.sign(it.centerShiftPt) * Math.min(Math.abs(it.centerShiftPt), room / 2);
    else if (it.align === 'r' && it.rightIndentPt != null) it.rightIndentPt = Math.min(it.rightIndentPt, room);
    else {
      if (((isA10LinesOn() || isA10FixOn()) || isP2DriftOn() || isA03FixOn() || (isNestBoxOn() && it._inNestBoxPage)) && it.align === 'j' && it.justRightPt >= 2) {
        const keepL = (it.indentPt || 0) + Math.abs(it.firstIndentPt || 0);
        it.justRightPt = Math.max(0, Math.min(it.justRightPt, room - keepL));
      }
      const remRoom = Math.max(0, room - (((isA10LinesOn() || isA10FixOn()) || isP2DriftOn() || isA03FixOn() || (isNestBoxOn() && it._inNestBoxPage)) && it.align === 'j' && it.justRightPt >= 2 ? it.justRightPt : 0));
      const fi = Math.abs(it.firstIndentPt || 0);
      if (!multiFi && fi > remRoom) it.firstIndentPt = 0;
      if (!multiFi && !(isA17FixOn() && L.length >= 2 && (it.indentPt || 0) <= 8)) {
        it.indentPt = Math.max(0, Math.min(it.indentPt || 0, remRoom - Math.abs(it.firstIndentPt || 0)));
      }
    }
    // ২) পুরো প্রস্থেও না আঁটলে ফন্ট ছোট
    if (need > full && !(isA17FixOn() && L.length >= 2 && need <= full * 1.015)) {
      const scale = Math.max(MIN_SCALE, full / need);
      it.fontPt = Math.max((isLineGapOn() && it._lineGapFixed) ? Math.ceil(fontFrom * MIN_SCALE * 2) / 2 : 1, Math.floor(it.fontPt * scale * 2) / 2);
    }
    it.fit = { needPt: Math.round(need * 10) / 10, availPt: Math.round(availPt * 10) / 10, fontFrom, fillsCut };
    return it.fit;
  }

  /** পুরো নকশা; ফেরত: বদলানো অংশের সংখ্যা */

  /** A05_DRIFT_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এর পাতা-২ (page >= 2) মূলের লাইন-সংখ্যা ও উল্লম্ব অবস্থানের সাথে সামঞ্জস্যপূর্ণ করা */
  function repairP2DriftPage(page) {
    if (!isP2DriftOn() || !page || (page.page != null && page.page < 2) || !Array.isArray(page.bands) || page._p2DriftRepaired) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairP2DriftPage === 'function') return IR.repairP2DriftPage(page);
    return page;
  }

  function repairP2DriftIr(ir) {
    if (!isP2DriftOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      if ((p.page != null ? p.page : idx + 1) >= 2) repairP2DriftPage(p);
    });
    return ir;
  }

  function repairA03Page(page) {
    if (!isA03FixOn() || !page || !Array.isArray(page.bands) || page._a03Repaired) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA03Page === 'function') return IR.repairA03Page(page);
    return page;
  }

  function repairA03Ir(ir) {
    if (!isA03FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairA03Page(p));
    return ir;
  }

  function repairNestBoxPage(page) {
    if (!isNestBoxOn() || !page || !Array.isArray(page.bands) || page._nestBoxRepaired) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairNestBoxPage === 'function') return IR.repairNestBoxPage(page);
    return page;
  }

  function repairNestBoxIr(ir) {
    if (!isNestBoxOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairNestBoxPage(p));
    return ir;
  }

  /** A14_SCORE_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও নমুনা a14 ও সমগোত্রীয় ফরমের মেরামত কার্যকর করা */
  function repairA14Ir(ir) {
    if (!isA14FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA14Ir === 'function') return IR.repairA14Ir(ir);
    return ir;
  }

  /** A07_SCORE_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও ছকের সারি/কলাম, ফন্ট, লাইন-পিচ ও স্বাক্ষর-গ্রিড পুনরুদ্ধার */
  function repairA07Page(page) {
    if (!(isA07FixOn() || isVSpaceOn() || isWidthOn()) || !page || !Array.isArray(page.bands) || page._a07Repaired) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA07Page === 'function') return IR.repairA07Page(page);
    return page;
  }

  function repairA07Ir(ir) {
    if (!(isA07FixOn() || isVSpaceOn() || isWidthOn()) || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairA07Page(p));
    return ir;
  }

  function repairA07Fix2Page(page) {
    if (!isA07Fix2On() || !page || !Array.isArray(page.bands) || page._a07Fix2Repaired) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA07Fix2Page === 'function') return IR.repairA07Fix2Page(page);
    return page;
  }

  function repairA07Fix2Ir(ir) {
    if (!isA07Fix2On() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairA07Fix2Page(p));
    return ir;
  }

  function repairA19Page(page) {
    if (!isA19FixOn() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA19Page === 'function') return IR.repairA19Page(page);
    return page;
  }

  function repairA19Ir(ir) {
    if (!isA19FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairA19Page(p));
    return ir;
  }

  function repairA16Page(page) {
    if (!isA16FixOn() || !page || !Array.isArray(page.bands) || page._a16Repaired) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA16Page === 'function') return IR.repairA16Page(page);
    return page;
  }

  function repairA16Ir(ir) {
    if (!isA16FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairA16Page(p));
    return ir;
  }

  /** A11_SCORE_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও নমুনা a11 ও সমগোত্রীয় ফরমের মেরামত কার্যকর করা */
  function repairA11Page(page) {
    if (!isA11FixOn() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA11Page === 'function') return IR.repairA11Page(page);
    return page;
  }

  function repairA11Ir(ir) {
    if (!isA11FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairA11Page(p));
    return ir;
  }
  /** A10_SCORE_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও নমুনা a10 ও সমগোত্রীয় ফরমের মেরামত কার্যকর করা */
  function repairA10FixPage(page) {
    if (!isA10FixOn() || !page || !Array.isArray(page.bands) || page._a10FixRepaired) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA10FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA10FixPage === 'function') return IR.repairA10FixPage(page);
    return page;
  }

  function repairA10FixIr(ir) {
    if (!isA10FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairA10FixPage(p));
    return ir;
  }
  function repairRotTextPage(page) {
    if (!isRotTextOn() || !page) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairRotTextPage === 'function') return IR.repairRotTextPage(page);
    return page;
  }
  function repairRotTextIr(ir) {
    if (!isRotTextOn() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairRotTextIr === 'function') return IR.repairRotTextIr(ir);
    ir.pages.forEach((p) => repairRotTextPage(p));
    return ir;
  }

  /** TABLE_MERGE_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও ছকের প্রকৃত কলাম-গ্রিড, ঘর-জোড়া (gridSpan/vMerge), প্যাডিং ও সারি-উচ্চতা কার্যকর করা */
  function repairTblMergePage(page) {
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairTblMergePage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (!isTblMergeOn()) {
      if (IR && typeof IR.restoreTblMergePage === 'function') return IR.restoreTblMergePage(page);
      return page;
    }
    if (!page || !Array.isArray(page.bands) || page._tblMergeRepaired) return page;
    if (IR && typeof IR.repairTblMergePage === 'function') return IR.repairTblMergePage(page);
    return page;
  }

  function repairTblMergeIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    if (!isTblMergeOn()) return restoreTblMergeIr(ir);
    ir.pages.forEach((p) => repairTblMergePage(p));
    return ir;
  }

  function restoreTblMergePage(page) {
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreTblMergePage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreTblMergePage === 'function') return IR.restoreTblMergePage(page);
    return page;
  }

  function restoreTblMergeIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => restoreTblMergePage(p));
    return ir;
  }

  /** LINEGAP_v1: প্রতিটি ব্লকের উচ্চতা মাপা উচ্চতার (rect.h) মধ্যে সীমাবদ্ধ রাখা */
  function repairLineGapPage(page) {
    if (!isLineGapOn() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairLineGapPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairLineGapPage === 'function') return IR.repairLineGapPage(page);
    return page;
  }

  function repairLineGapIr(ir) {
    if (!isLineGapOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairLineGapPage(p));
    return ir;
  }

  function repairVSpacePage(page) {
    if (!(isVSpaceOn() || isWidthOn()) || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairVSpacePage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairVSpacePage === 'function') return IR.repairVSpacePage(page);
    return page;
  }

  function repairVSpaceIr(ir) {
    if (!(isVSpaceOn() || isWidthOn()) || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairVSpacePage(p));
    return ir;
  }

  function repairIndentPage(page) {
    if (!isIndentOn() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairIndentPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairIndentPage === 'function') return IR.repairIndentPage(page);
    return page;
  }

  function repairIndentIr(ir) {
    if (!isIndentOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairIndentPage(p));
    return ir;
  }

  function repairWidthPage(page) {
    if (!isWidthOn() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairWidthPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairWidthPage === 'function') return IR.repairWidthPage(page);
    return page;
  }

  function repairWidthIr(ir) {
    if (!isWidthOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairWidthPage(p));
    return ir;
  }

  function repairA14Fix3Page(page) {
    if (!isA14Fix3On() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA14Fix3Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA14Fix3Page === 'function') return IR.repairA14Fix3Page(page);
    return page;
  }

  function repairA14Fix3Ir(ir) {
    if (!isA14Fix3On() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA14Fix3Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA14Fix3Ir === 'function') return IR.repairA14Fix3Ir(ir);
    ir.pages.forEach((p) => repairA14Fix3Page(p));
    return ir;
  }
  function repairA16Fix3Page(page) {
    if (!isA16Fix3On() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA16Fix3Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA16Fix3Page === 'function') return IR.repairA16Fix3Page(page);
    return page;
  }
  function repairA16Fix3Ir(ir) {
    if (!isA16Fix3On() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA16Fix3Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA16Fix3Ir === 'function') return IR.repairA16Fix3Ir(ir);
    ir.pages.forEach((p) => repairA16Fix3Page(p));
    return ir;
  }

  function repairFontFixPage(page) {
    if (!isFontFixOn() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairFontFixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairFontFixPage === 'function') return IR.repairFontFixPage(page);
    return page;
  }

  function repairFontFixIr(ir) {
    if (!isFontFixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairFontFixPage(p));
    return ir;
  }

  function repairA14RulesPage(page) {
    if (!isA14RulesOn() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA14RulesPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA14RulesPage === 'function') return IR.repairA14RulesPage(page);
    return page;
  }

  function repairA14RulesIr(ir) {
    if (!isA14RulesOn() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA14RulesIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA14RulesIr === 'function') return IR.repairA14RulesIr(ir);
    ir.pages.forEach((p) => repairA14RulesPage(p));
    return ir;
  }

  function repairA07Fix3Page(page) {
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA07Fix3Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (!isA07Fix3On()) {
      if (IR && typeof IR.restoreA07Fix3Page === 'function') return IR.restoreA07Fix3Page(page);
      return page;
    }
    if (IR && typeof IR.repairA07Fix3Page === 'function') return IR.repairA07Fix3Page(page);
    return page;
  }

  function repairA07Fix3Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA07Fix3Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (!isA07Fix3On()) {
      if (IR && typeof IR.restoreA07Fix3Ir === 'function') return IR.restoreA07Fix3Ir(ir);
      return ir;
    }
    if (IR && typeof IR.repairA07Fix3Ir === 'function') return IR.repairA07Fix3Ir(ir);
    ir.pages.forEach((p) => repairA07Fix3Page(p));
    return ir;
  }

  function repairA16Fix4Page(page) {
    if (!isA16Fix4On() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA16Fix4Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA16Fix4Page === 'function') return IR.repairA16Fix4Page(page);
    return page;
  }

  function repairA16Fix4Ir(ir) {
    if (!isA16Fix4On() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA16Fix4Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA16Fix4Ir === 'function') return IR.repairA16Fix4Ir(ir);
    ir.pages.forEach((p) => repairA16Fix4Page(p));
    return ir;
  }

  function repairA14Fix4Page(page) {
    if (!isA14Fix4On() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA14Fix4Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA14Fix4Page === 'function') return IR.repairA14Fix4Page(page);
    return page;
  }

  function repairA14Fix4Ir(ir) {
    if (!isA14Fix4On() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA14Fix4Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA14Fix4Ir === 'function') return IR.repairA14Fix4Ir(ir);
    ir.pages.forEach((p) => repairA14Fix4Page(p));
    return ir;
  }

  function repairA13FixPage(page) {
    if (!isA13FixOn() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA13FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA13FixPage === 'function') return IR.repairA13FixPage(page);
    return page;
  }

  function repairA13FixIr(ir) {
    if (!isA13FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA13FixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA13FixIr === 'function') return IR.repairA13FixIr(ir);
    ir.pages.forEach((p) => repairA13FixPage(p));
    return ir;
  }

  function repairA16Fix5Page(page) {
    if (!isA16Fix5On() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA16Fix5Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA16Fix5Page === 'function') return IR.repairA16Fix5Page(page);
    return page;
  }

  function repairA16Fix5Ir(ir) {
    if (!isA16Fix5On() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA16Fix5Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA16Fix5Ir === 'function') return IR.repairA16Fix5Ir(ir);
    ir.pages.forEach((p) => repairA16Fix5Page(p));
    return ir;
  }

  function repairA09FixPage(page) {
    if (!isA09FixOn() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA09FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA09FixPage === 'function') return IR.repairA09FixPage(page);
    return page;
  }

  function repairA09FixIr(ir) {
    if (!isA09FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA09FixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA09FixIr === 'function') return IR.repairA09FixIr(ir);
    ir.pages.forEach((p) => repairA09FixPage(p));
    return ir;
  }

  function restoreA14Fix5Page(page) {
    if (!page || !page._preA14Fix5Snap) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA14Fix5Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA14Fix5Page === 'function') return IR.restoreA14Fix5Page(page);
    return page;
  }

  function restoreA14Fix5Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA14Fix5Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA14Fix5Ir === 'function') return IR.restoreA14Fix5Ir(ir);
    ir.pages.forEach((p) => restoreA14Fix5Page(p));
    return ir;
  }

  function repairA14Fix5Page(page) {
    if (!isA14Fix5On()) return restoreA14Fix5Page(page);
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA14Fix5Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA14Fix5Page === 'function') return IR.repairA14Fix5Page(page);
    return page;
  }

  function repairA14Fix5Ir(ir) {
    if (!isA14Fix5On()) return restoreA14Fix5Ir(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA14Fix5Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA14Fix5Ir === 'function') return IR.repairA14Fix5Ir(ir);
    ir.pages.forEach((p) => repairA14Fix5Page(p));
    return ir;
  }

  function repairA07Fix5Page(page) {
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA07Fix5Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (!isA07Fix5On()) {
      if (IR && typeof IR.restoreA07Fix5Page === 'function') return IR.restoreA07Fix5Page(page);
      return page;
    }
    if (IR && typeof IR.repairA07Fix5Page === 'function') return IR.repairA07Fix5Page(page);
    return page;
  }

  function repairA07Fix5Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA07Fix5Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (!isA07Fix5On()) {
      if (IR && typeof IR.restoreA07Fix5Ir === 'function') return IR.restoreA07Fix5Ir(ir);
      return ir;
    }
    if (IR && typeof IR.repairA07Fix5Ir === 'function') return IR.repairA07Fix5Ir(ir);
    ir.pages.forEach((p) => repairA07Fix5Page(p));
    return ir;
  }

  function repairA12FixPage(page) {
    if (!isA12FixOn() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA12FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA12FixPage === 'function') return IR.repairA12FixPage(page);
    return page;
  }

  function repairA12FixIr(ir) {
    if (!isA12FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA12FixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA12FixIr === 'function') return IR.repairA12FixIr(ir);
    ir.pages.forEach((p) => repairA12FixPage(p));
    return ir;
  }

  function restoreA03Fix3Page(page) {
    if (!page) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA03Fix3Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA03Fix3Page === 'function') return IR.restoreA03Fix3Page(page);
    return page;
  }

  function restoreA03Fix3Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA03Fix3Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA03Fix3Ir === 'function') return IR.restoreA03Fix3Ir(ir);
    ir.pages.forEach((p) => restoreA03Fix3Page(p));
    return ir;
  }

  function repairA03Fix3Page(page) {
    if (!isA03Fix3On()) return restoreA03Fix3Page(page);
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA03Fix3Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA03Fix3Page === 'function') return IR.repairA03Fix3Page(page);
    return page;
  }

  function repairA03Fix3Ir(ir) {
    if (!isA03Fix3On()) return restoreA03Fix3Ir(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA03Fix3Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA03Fix3Ir === 'function') return IR.repairA03Fix3Ir(ir);
    ir.pages.forEach((p) => repairA03Fix3Page(p));
    return ir;
  }

  function repairA02FixPage(page) {
    if (!isA02FixOn() || !page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA02FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA02FixPage === 'function') return IR.repairA02FixPage(page);
    return page;
  }

  function repairA02FixIr(ir) {
    if (!isA02FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA02FixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA02FixIr === 'function') return IR.repairA02FixIr(ir);
    ir.pages.forEach((p) => repairA02FixPage(p));
    return ir;
  }


  function restoreA06FixPage(page) {
    if (!page || !page._preA06FixSnap) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA06FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA06FixPage === 'function') return IR.restoreA06FixPage(page);
    return page;
  }

  function restoreA06FixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA06FixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA06FixIr === 'function') return IR.restoreA06FixIr(ir);
    ir.pages.forEach((p) => restoreA06FixPage(p));
    return ir;
  }

  function repairA06FixPage(page) {
    if (!isA06FixOn()) return restoreA06FixPage(page);
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA06FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA06FixPage === 'function') return IR.repairA06FixPage(page);
    return page;
  }

  function repairA06FixIr(ir) {
    if (!isA06FixOn()) return restoreA06FixIr(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA06FixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA06FixIr === 'function') return IR.repairA06FixIr(ir);
    ir.pages.forEach((p) => repairA06FixPage(p));
    return ir;
  }

  function restoreA03Fix4Page(page) {
    if (!page) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA03Fix4Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA03Fix4Page === 'function') return IR.restoreA03Fix4Page(page);
    return page;
  }

  function restoreA03Fix4Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA03Fix4Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA03Fix4Ir === 'function') return IR.restoreA03Fix4Ir(ir);
    ir.pages.forEach((p) => restoreA03Fix4Page(p));
    return ir;
  }

  function repairA03Fix4Page(page) {
    if (!isA03Fix4On()) return restoreA03Fix4Page(page);
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA03Fix4Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA03Fix4Page === 'function') return IR.repairA03Fix4Page(page);
    return page;
  }

  function repairA03Fix4Ir(ir) {
    if (!isA03Fix4On()) return restoreA03Fix4Ir(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA03Fix4Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA03Fix4Ir === 'function') return IR.repairA03Fix4Ir(ir);
    ir.pages.forEach((p) => repairA03Fix4Page(p));
    return ir;
  }

  function restoreA07Fix6Page(page) {
    if (!page) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA07Fix6Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA07Fix6Page === 'function') return IR.restoreA07Fix6Page(page);
    return page;
  }

  function restoreA07Fix6Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA07Fix6Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA07Fix6Ir === 'function') return IR.restoreA07Fix6Ir(ir);
    ir.pages.forEach((p) => restoreA07Fix6Page(p));
    return ir;
  }

  function repairA07Fix6Page(page) {
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA07Fix6Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (!isA07Fix6On()) return restoreA07Fix6Page(page);
    if (IR && typeof IR.repairA07Fix6Page === 'function') return IR.repairA07Fix6Page(page);
    return page;
  }

  function repairA07Fix6Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA07Fix6Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (!isA07Fix6On()) return restoreA07Fix6Ir(ir);
    if (IR && typeof IR.repairA07Fix6Ir === 'function') return IR.repairA07Fix6Ir(ir);
    ir.pages.forEach((p) => repairA07Fix6Page(p));
    return ir;
  }


  function restoreF1FixPage(page) {
    if (!page) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreF1FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreF1FixPage === 'function') return IR.restoreF1FixPage(page);
    return page;
  }

  function restoreF1FixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreF1FixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreF1FixIr === 'function') return IR.restoreF1FixIr(ir);
    ir.pages.forEach((p) => restoreF1FixPage(p));
    return ir;
  }

  function repairF1FixPage(page) {
    if (!isF1FixOn()) return restoreF1FixPage(page);
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairF1FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairF1FixPage === 'function') return IR.repairF1FixPage(page);
    return page;
  }

  function repairF1FixIr(ir) {
    if (!isF1FixOn()) return restoreF1FixIr(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairF1FixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairF1FixIr === 'function') return IR.repairF1FixIr(ir);
    ir.pages.forEach((p) => repairF1FixPage(p));
    return ir;
  }

  function restoreA18FixPage(page) {
    if (!page) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA18FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA18FixPage === 'function') return IR.restoreA18FixPage(page);
    return page;
  }

  function restoreA18FixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA18FixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA18FixIr === 'function') return IR.restoreA18FixIr(ir);
    ir.pages.forEach((p) => restoreA18FixPage(p));
    return ir;
  }

  function repairA18FixPage(page) {
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA18FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (!isA18FixOn()) return restoreA18FixPage(page);
    if (IR && typeof IR.repairA18FixPage === 'function') return IR.repairA18FixPage(page);
    return page;
  }

  function repairA18FixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA18FixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (!isA18FixOn()) return restoreA18FixIr(ir);
    if (IR && typeof IR.repairA18FixIr === 'function') return IR.repairA18FixIr(ir);
    ir.pages.forEach((p) => repairA18FixPage(p));
    return ir;
  }

  function restoreA08FixPage(page) {
    if (!page) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA08FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA08FixPage === 'function') return IR.restoreA08FixPage(page);
    return page;
  }

  function restoreA08FixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA08FixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA08FixIr === 'function') return IR.restoreA08FixIr(ir);
    ir.pages.forEach((p) => restoreA08FixPage(p));
    return ir;
  }

  function repairA08FixPage(page) {
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA08FixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (!isA08FixOn()) return restoreA08FixPage(page);
    if (IR && typeof IR.repairA08FixPage === 'function') return IR.repairA08FixPage(page);
    return page;
  }

  function repairA08FixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA08FixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (!isA08FixOn()) return restoreA08FixIr(ir);
    if (IR && typeof IR.repairA08FixIr === 'function') return IR.repairA08FixIr(ir);
    ir.pages.forEach((p) => repairA08FixPage(p));
    return ir;
  }

  function restoreA16Fix6Page(page) {
    if (!page) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA16Fix6Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA16Fix6Page === 'function') return IR.restoreA16Fix6Page(page);
    return page;
  }

  function restoreA16Fix6Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreA16Fix6Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreA16Fix6Ir === 'function') return IR.restoreA16Fix6Ir(ir);
    ir.pages.forEach((p) => restoreA16Fix6Page(p));
    return ir;
  }

  function repairA16Fix6Page(page) {
    if (!isA16Fix6On()) return restoreA16Fix6Page(page);
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA16Fix6Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA16Fix6Page === 'function') return IR.repairA16Fix6Page(page);
    return page;
  }

  function repairA16Fix6Ir(ir) {
    if (!isA16Fix6On()) return restoreA16Fix6Ir(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairA16Fix6Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairA16Fix6Ir === 'function') return IR.repairA16Fix6Ir(ir);
    ir.pages.forEach((p) => repairA16Fix6Page(p));
    return ir;
  }

  function restoreF1Fix2Page(page) {
    if (!page) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreF1Fix2Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreF1Fix2Page === 'function') return IR.restoreF1Fix2Page(page);
    return page;
  }

  function restoreF1Fix2Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreF1Fix2Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreF1Fix2Ir === 'function') return IR.restoreF1Fix2Ir(ir);
    ir.pages.forEach((p) => restoreF1Fix2Page(p));
    return ir;
  }

  function repairF1Fix2Page(page) {
    if (!isF1Fix2On()) return restoreF1Fix2Page(page);
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairF1Fix2Page !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairF1Fix2Page === 'function') return IR.repairF1Fix2Page(page);
    return page;
  }

  function repairF1Fix2Ir(ir) {
    if (!isF1Fix2On()) return restoreF1Fix2Ir(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairF1Fix2Ir !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairF1Fix2Ir === 'function') return IR.repairF1Fix2Ir(ir);
    ir.pages.forEach((p) => repairF1Fix2Page(p));
    return ir;
  }

  function restoreIndentFixPage(page) {
    if (!page) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreIndentFixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreIndentFixPage === 'function') return IR.restoreIndentFixPage(page);
    return page;
  }

  function restoreIndentFixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreIndentFixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreIndentFixIr === 'function') return IR.restoreIndentFixIr(ir);
    ir.pages.forEach((p) => restoreIndentFixPage(p));
    return ir;
  }

  function repairIndentFixPage(page) {
    if (!isIndentFixOn()) return restoreIndentFixPage(page);
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairIndentFixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairIndentFixPage === 'function') return IR.repairIndentFixPage(page);
    return page;
  }

  function repairIndentFixIr(ir) {
    if (!isIndentFixOn()) return restoreIndentFixIr(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairIndentFixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairIndentFixIr === 'function') return IR.repairIndentFixIr(ir);
    ir.pages.forEach((p) => repairIndentFixPage(p));
    return ir;
  }

  function restoreVGapFixPage(page) {
    if (!page || !page._preVGapFixSnap) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreVGapFixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreVGapFixPage === 'function') return IR.restoreVGapFixPage(page);
    return page;
  }

  function restoreVGapFixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreVGapFixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreVGapFixIr === 'function') return IR.restoreVGapFixIr(ir);
    ir.pages.forEach((p) => restoreVGapFixPage(p));
    return ir;
  }

  function repairVGapFixPage(page) {
    if (!isVGapFixOn()) return restoreVGapFixPage(page);
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairVGapFixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairVGapFixPage === 'function') return IR.repairVGapFixPage(page);
    return page;
  }

  function repairVGapFixIr(ir) {
    if (!isVGapFixOn()) return restoreVGapFixIr(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairVGapFixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairVGapFixIr === 'function') return IR.repairVGapFixIr(ir);
    ir.pages.forEach((p) => repairVGapFixPage(p));
    return ir;
  }

  function restoreSerialFixPage(page) {
    if (!page) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreSerialFixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreSerialFixPage === 'function') return IR.restoreSerialFixPage(page);
    return page;
  }

  function restoreSerialFixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.restoreSerialFixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.restoreSerialFixIr === 'function') return IR.restoreSerialFixIr(ir);
    ir.pages.forEach((p) => restoreSerialFixPage(p));
    return ir;
  }

  function repairSerialFixPage(page) {
    if (!isSerialFixOn()) return restoreSerialFixPage(page);
    if (!page || !Array.isArray(page.bands)) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairSerialFixPage !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairSerialFixPage === 'function') return IR.repairSerialFixPage(page);
    return page;
  }

  function repairSerialFixIr(ir) {
    if (!isSerialFixOn()) return restoreSerialFixIr(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if ((!IR || typeof IR.repairSerialFixIr !== 'function') && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairSerialFixIr === 'function') return IR.repairSerialFixIr(ir);
    ir.pages.forEach((p) => repairSerialFixPage(p));
    return ir;
  }

  function fit(ir, measure, opts) {
    const wdOn = isWidthOn(), a01On = isA01FixOn(), wfOn = isWrapFitOn() || a01On, p4On = isPages4On(), elOn = isExtraLinesOn(), a10On = (isA10LinesOn() || isA10FixOn()),
      p1On = isP1LossOn(), p2On = isP2DriftOn(), rfOn = isRuleFixOn(), r2On = isRules2On(), a03On = isA03FixOn(), nbOn = isNestBoxOn(), rotOn = isRotTextOn(), a17On = isA17FixOn(), a14On = isA14FixOn(), vsOn = isVSpaceOn(), a07On = isA07FixOn() || vsOn || wdOn, a19On = isA19FixOn(), a16On = isA16FixOn(), a11On = isA11FixOn(), tmOn = isTblMergeOn();
    if (!isVGapFixOn() && ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preVGapFixSnap)) restoreVGapFixIr(ir);
    if (a10On) repairA10Ir(ir);
    if (isA10FixOn()) repairA10FixIr(ir);
    if (p1On || a17On) repairP1LossIr(ir);
    if (a01On) repairA01Ir(ir);
    if (p2On) repairP2DriftIr(ir);
    if (rfOn) repairRuleFixIr(ir);
    if (a03On) repairA03Ir(ir);
    if (nbOn && ir && Array.isArray(ir.pages)) {
      ir.pages.forEach((p) => { if (p) Object.defineProperty(p, '_inLineFitPass', { value: true, enumerable: false, configurable: true, writable: true }); });
      try { repairNestBoxIr(ir); } finally { ir.pages.forEach((p) => { if (p) delete p._inLineFitPass; }); }
    }
    if (a17On) repairA17Ir(ir);
    if (a14On) repairA14Ir(ir);
    if (a07On) repairA07Ir(ir);
    if (a19On) repairA19Ir(ir);
    if (a16On) repairA16Ir(ir);
    if (a11On) repairA11Ir(ir);
    if (tmOn) repairTblMergeIr(ir); else restoreTblMergeIr(ir);
    if (isA07Fix2On()) repairA07Fix2Ir(ir);
    if (r2On) repairRules2Ir(ir);
    if (isLineGapOn()) repairLineGapIr(ir);
    if (rotOn) repairRotTextIr(ir);
    if (vsOn) repairVSpaceIr(ir);
    const indOn = isIndentOn(), ffOn = isFontFixOn();
    if (indOn) repairIndentIr(ir);
    if (wdOn) repairWidthIr(ir);
    const a14f3On = isA14Fix3On();
    if (a14f3On) repairA14Fix3Ir(ir);
    if (ffOn) repairFontFixIr(ir);
    const a16f3On = isA16Fix3On();
    if (a16f3On) repairA16Fix3Ir(ir);
    const a14rOn = isA14RulesOn();
    if (a14rOn) repairA14RulesIr(ir);
    const a07f3On = isA07Fix3On();
    if (a07f3On || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preA07Fix3Snap))) repairA07Fix3Ir(ir);
    const a16f4On = isA16Fix4On();
    if (a16f4On) repairA16Fix4Ir(ir);
    const a14f4On = isA14Fix4On();
    if (a14f4On) repairA14Fix4Ir(ir);
    const a13fOn = isA13FixOn();
    if (a13fOn) repairA13FixIr(ir);
    const a16f5On = isA16Fix5On();
    if (a16f5On) repairA16Fix5Ir(ir);
    const a09fOn = isA09FixOn();
    if (a09fOn) repairA09FixIr(ir);
    const a14f5On = isA14Fix5On();
    if (a14f5On || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preA14Fix5Snap))) repairA14Fix5Ir(ir);
    const a07f5On = isA07Fix5On();
    if (a07f5On || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preA07Fix5Snap))) repairA07Fix5Ir(ir);
    const a12fOn = isA12FixOn();
    if (a12fOn) repairA12FixIr(ir);
    const a03f3On = isA03Fix3On();
    if (a03f3On || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preA03Fix3Snap))) repairA03Fix3Ir(ir);
    const a02fOn = isA02FixOn();
    if (a02fOn) repairA02FixIr(ir);
    const a06fOn = isA06FixOn();
    if (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preA06FixSnap)) restoreA06FixIr(ir);
    const a03f4On = isA03Fix4On();
    if (a03f4On || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preA03Fix4Snap))) repairA03Fix4Ir(ir);
    const a07f6On = isA07Fix6On();
    if (a07f6On || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preA07Fix6Snap))) repairA07Fix6Ir(ir);
    const f1fOn = isF1FixOn();
    if (f1fOn || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preF1FixSnap))) repairF1FixIr(ir);
    const a18fOn = isA18FixOn();
    if (a18fOn || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preA18FixSnap))) repairA18FixIr(ir);
    const a08fOn = isA08FixOn();
    if (a08fOn || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preA08FixSnap))) repairA08FixIr(ir);
    const a16f6On = isA16Fix6On();
    if (a16f6On || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preA16Fix6Snap))) repairA16Fix6Ir(ir);
    const f1f2On = isF1Fix2On();
    if (f1f2On || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preF1Fix2Snap))) repairF1Fix2Ir(ir);
    const indFixOn = isIndentFixOn();
    if (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preIndentFixSnap)) restoreIndentFixIr(ir);
    const vgapOn = isVGapFixOn();
    if (vgapOn || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preVGapFixSnap))) repairVGapFixIr(ir);
    const sfxOn = isSerialFixOn();
    if (sfxOn || (ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._preSerialFixSnap))) repairSerialFixIr(ir);
    const nbRepaired = nbOn && ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._nestBoxRepaired);
    const a16Repaired = a16On && ir && Array.isArray(ir.pages) && ir.pages.some((p) => p && p._a16Repaired);
    if ((wfOn || indFixOn || f1f2On || sfxOn || p4On || elOn || a10On || p1On || rfOn || r2On || a03On || nbRepaired || a17On || a14On || a07On || a19On || a16Repaired || a11On || rotOn || indOn || wdOn || a14f3On || ffOn || a16f3On || a14rOn || a16f4On || a14f4On || a13fOn || a16f5On || a09fOn || a14f5On || a07f5On || a12fOn || a03f3On || a02fOn || a06fOn || a03f4On || a07f6On || a08fOn || f1fOn || a16f6On || a18fOn || vgapOn) && typeof measure !== 'function') measure = defaultWrapMeasure;
    if (!ir || !ir.pages || typeof measure !== 'function') return 0;
    const prevFont = _activeFitFont;
    if (isFontPickOn()) {
      _activeFitFont = (typeof opts === 'string' && opts) || (opts && (opts.font || opts.unicodeFont)) || ir.font || ir.unicodeFont || _activeFitFont;
      // ফন্ট বদলে পুনরায় fit চালালে আগের fontFrom থেকে নতুন অনুপাতে হিসাব করা
      if (opts && (typeof opts === 'string' || opts.font || opts.unicodeFont || opts.resetFont)) {
        for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
          for (const it of cell.items || []) if (it && it.fit && it.fit.fontFrom) { it.fontPt = it.fit.fontFrom; delete it.fit; }
        }
      }
    }
    let n = 0;
    try {
    for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
      let cellW = (cell.x1 || 0) - (cell.x0 || 0);
      // WRAPFIT: পাতার ডান/বাম মার্জিনের ভেতরের প্রকৃত মুদ্রণযোগ্য প্রস্থে cellW সীমিত রাখা (যেমন a01-এ 540.5pt -> 540pt = 468pt)
      if (wfOn && page.widthPt > 0 && page.margins) {
        const pLeft = page.margins.left || 0, pRight = page.widthPt - (page.margins.right || 0);
        const cx0 = Math.max(cell.x0 || 0, pLeft), cx1 = pRight > cx0 ? Math.min(cell.x1 || 0, pRight) : (cell.x1 || 0);
        cellW = Math.max(0, Math.min(cellW, cx1 - cx0));
      }
      for (const it of cell.items || []) {
        if (p4On && it && page.bodyFontPt) it._pageBodyFont = page.bodyFontPt;
        if (it && it.kind === 'table' ? fitTable(it, measure) : fitItem(it, cellW, measure)) n++;
        if (p4On && it && it._pageBodyFont) delete it._pageBodyFont;
      }
    }
    // বহু-পাতার চেকলিস্ট ছকে (≥৪ কলাম, যেমন a16) fitTable-এর পর ফন্টের সমতা রক্ষা; ২-কলামের ছোট ছকে (a03) নয় (FZ_OFF=TSYNC30)
    if (!globalThis.__FZ_OFF_TSYNC30) {
      const allT = [];
      for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
        for (const it of cell.items || []) if (it && it.kind === 'table' && it.fontPt && it.colFractions && it.colFractions.length >= 4) allT.push(it);
      }
      const used = new Set();
      for (const t of allT) {
        if (used.has(t)) continue;
        const h0 = (t.rows && t.rows[0] || []).join('|');
        const grp = allT.filter((o) => !used.has(o) && o.colFractions.length === t.colFractions.length &&
          (o.colFractions.every((f, k) => Math.abs(f - t.colFractions[k]) <= 0.12) || (h0.length >= 10 && ((o.rows && o.rows[0] || []).join('|') === h0))));
        grp.forEach((o) => used.add(o));
        if (grp.length < 3) continue;
        const fs = grp.map((o) => o.fontPt).sort((a, b) => a - b);
        const target = fs[Math.floor(fs.length * 0.3)];
        grp.forEach((o) => { if (Math.abs(o.fontPt - target) <= target * 0.3) o.fontPt = target; });
      }
      // EXTRALINES: একই ব্লক থেকে ফাঁকে ভাগ হওয়া ছোট বর্ডারলেস ছকগুলোর (যেমন a19-এর ১০। কেন্দ্র সচিবের স্বাক্ষর/সিলমোহর, splitPart 0..2) অভিন্ন ফন্ট রক্ষা
      if (elOn) {
        const spGroups = new Map();
        for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
          for (const it of cell.items || []) {
            if (it && it.kind === "table" && it.splitPart != null && it.borderless && Array.isArray(it.box)) {
              const key = it.box.join(",");
              if (!spGroups.has(key)) spGroups.set(key, []);
              spGroups.get(key).push(it);
            }
          }
        }
        for (const grp of spGroups.values()) {
          if (grp.length < 2) continue;
          const minF = Math.min(...grp.map((x) => x.fontPt || 12));
          grp.forEach((x) => { x.fontPt = minF; });
        }
      }
      if (globalThis.__FZ_ON_FORMFIX && !globalThis.__FZ_OFF_FORMFIX) {
        const noVT = [];
        for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
          for (const it of cell.items || []) if (it && it.kind === "table" && it.noVRules && it.rows && it.rows.length >= 10) noVT.push(it);
        }
        if (noVT.length >= 2) {
          const maxF = Math.max(...noVT.map((t) => t.fontPt || 10));
          noVT.forEach((t) => { if (t.fontPt < maxF) t.fontPt = maxF; });
        }
      }
    }
    if (a16On && ir && Array.isArray(ir.pages)) {
      ir.pages.forEach((p) => { if (p) delete p._a16Repaired; });
      repairA16Ir(ir);
    }
    if (isLineGapOn() && ir && Array.isArray(ir.pages)) {
      repairLineGapIr(ir);
    }
    if (vsOn && ir && Array.isArray(ir.pages)) {
      repairVSpaceIr(ir);
    }
    if (indOn && ir && Array.isArray(ir.pages)) {
      repairIndentIr(ir);
    }
    if (wdOn && ir && Array.isArray(ir.pages)) {
      repairWidthIr(ir);
    }
    if (a14f3On && ir && Array.isArray(ir.pages)) {
      repairA14Fix3Ir(ir);
    }
    if (ffOn && ir && Array.isArray(ir.pages)) {
      repairFontFixIr(ir);
    }
    if (a16f3On && ir && Array.isArray(ir.pages)) {
      repairA16Fix3Ir(ir);
    }
    if (a14rOn && ir && Array.isArray(ir.pages)) {
      repairA14RulesIr(ir);
    }
    if (a07f3On && ir && Array.isArray(ir.pages)) {
      repairA07Fix3Ir(ir);
    }
    if (a16f4On && ir && Array.isArray(ir.pages)) {
      repairA16Fix4Ir(ir);
    }
    if (a14f4On && ir && Array.isArray(ir.pages)) {
      repairA14Fix4Ir(ir);
    }
    if (a13fOn && ir && Array.isArray(ir.pages)) {
      repairA13FixIr(ir);
    }
    if (a16f5On && ir && Array.isArray(ir.pages)) {
      repairA16Fix5Ir(ir);
    }
    if (a09fOn && ir && Array.isArray(ir.pages)) {
      repairA09FixIr(ir);
    }
    if (a14f5On && ir && Array.isArray(ir.pages)) {
      repairA14Fix5Ir(ir);
    }
    if (a07f5On && ir && Array.isArray(ir.pages)) {
      repairA07Fix5Ir(ir);
    }
    if (a12fOn && ir && Array.isArray(ir.pages)) {
      repairA12FixIr(ir);
    }
    if (a03f3On && ir && Array.isArray(ir.pages)) {
      repairA03Fix3Ir(ir);
    }
    if (a02fOn && ir && Array.isArray(ir.pages)) {
      repairA02FixIr(ir);
    }
    if (a06fOn && ir && Array.isArray(ir.pages)) {
      repairA06FixIr(ir);
    }
    if (a03f4On && ir && Array.isArray(ir.pages)) {
      repairA03Fix4Ir(ir);
    }
    if (a07f6On && ir && Array.isArray(ir.pages)) {
      repairA07Fix6Ir(ir);
    }
    if (f1fOn && ir && Array.isArray(ir.pages)) {
      repairF1FixIr(ir);
    }
    if (a18fOn && ir && Array.isArray(ir.pages)) {
      repairA18FixIr(ir);
    }
    if (a08fOn && ir && Array.isArray(ir.pages)) {
      repairA08FixIr(ir);
    }
    if (a16f6On && ir && Array.isArray(ir.pages)) {
      repairA16Fix6Ir(ir);
    }
    if (f1f2On && ir && Array.isArray(ir.pages)) {
      repairF1Fix2Ir(ir);
    }
    if (indFixOn && ir && Array.isArray(ir.pages)) {
      repairIndentFixIr(ir);
    }
    if (vgapOn && ir && Array.isArray(ir.pages)) {
      repairVGapFixIr(ir);
    }
    if (sfxOn && ir && Array.isArray(ir.pages)) {
      repairSerialFixIr(ir);
    }
    return n;
    } finally {
      _activeFitFont = prevFont;
    }
  }

  const FayzarLineFit = { fit, fitItem, fitTable, sideIndent, lineWidthPt, FONT_WIDTH_RATIOS, getFontWidthRatio, isFontPickOn, isWrapFitOn, isExtraLinesOn, isA10LinesOn, repairA10Ir,
    isP1LossOn, repairP1LossIr, isA01FixOn, repairA01Ir, isP2DriftOn, repairP2DriftPage, repairP2DriftIr, isRuleFixOn, repairRuleFixIr, isRules2On, repairRules2Ir, isA07Fix3On, repairA07Fix3Page, repairA07Fix3Ir, isA16Fix4On, repairA16Fix4Page, repairA16Fix4Ir, isA14Fix4On, repairA14Fix4Page, repairA14Fix4Ir, isA13FixOn, repairA13FixPage, repairA13FixIr, isA12FixOn, repairA12FixPage, repairA12FixIr, isA16Fix5On, repairA16Fix5Page, repairA16Fix5Ir, isA09FixOn, repairA09FixPage, repairA09FixIr, isA14Fix5On, repairA14Fix5Page, repairA14Fix5Ir, restoreA14Fix5Page, restoreA14Fix5Ir, isA07Fix5On, repairA07Fix5Page, repairA07Fix5Ir, isA03Fix3On, repairA03Fix3Page, repairA03Fix3Ir, restoreA03Fix3Page, restoreA03Fix3Ir, isA02FixOn, repairA02FixPage, repairA02FixIr, isA06FixOn, repairA06FixPage, repairA06FixIr, restoreA06FixPage, restoreA06FixIr, isA03Fix4On, repairA03Fix4Page, repairA03Fix4Ir, restoreA03Fix4Page, restoreA03Fix4Ir, isA07Fix6On, repairA07Fix6Page, repairA07Fix6Ir, restoreA07Fix6Page, restoreA07Fix6Ir, isA08FixOn, repairA08FixPage, repairA08FixIr, restoreA08FixPage, restoreA08FixIr, isF1FixOn, repairF1FixPage, repairF1FixIr, restoreF1FixPage, restoreF1FixIr, isF1Fix2On, repairF1Fix2Page, repairF1Fix2Ir, restoreF1Fix2Page, restoreF1Fix2Ir, isSerialFixOn, repairSerialFixPage, repairSerialFixIr, restoreSerialFixPage, restoreSerialFixIr, isVGapFixOn, repairVGapFixPage, repairVGapFixIr, restoreVGapFixPage, restoreVGapFixIr, isIndentFixOn, repairIndentFixPage, repairIndentFixIr, restoreIndentFixPage, restoreIndentFixIr, isA16Fix6On, repairA16Fix6Page, repairA16Fix6Ir, restoreA16Fix6Page, restoreA16Fix6Ir, isA18FixOn, repairA18FixPage, repairA18FixIr, restoreA18FixPage, restoreA18FixIr, isA03FixOn, repairA03Page, repairA03Ir, isA17FixOn, repairA17Ir, isA14FixOn, repairA14Ir, isA07FixOn, repairA07Page, repairA07Ir, isA19FixOn, repairA19Page, repairA19Ir, isA16FixOn, repairA16Page, repairA16Ir, isA11FixOn, repairA11Page, repairA11Ir, isA10FixOn, repairA10FixPage, repairA10FixIr, isTblMergeOn, repairTblMergePage, repairTblMergeIr, restoreTblMergePage, restoreTblMergeIr, isLineGapOn, repairLineGapPage, repairLineGapIr, isNestBoxOn, repairNestBoxPage, repairNestBoxIr, isRotTextOn, repairRotTextPage, repairRotTextIr, isVSpaceOn, repairVSpacePage, repairVSpaceIr, isIndentOn, repairIndentPage, repairIndentIr, isWidthOn, repairWidthPage, repairWidthIr, isA07Fix2On, repairA07Fix2Page, repairA07Fix2Ir, isA14Fix3On, repairA14Fix3Page, repairA14Fix3Ir, isFontFixOn, repairFontFixPage, repairFontFixIr, isA16Fix3On, repairA16Fix3Page, repairA16Fix3Ir, isA14RulesOn, repairA14RulesPage, repairA14RulesIr };
  global.FayzarLineFit = FayzarLineFit;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarLineFit;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));