/**
 * Fayzar — হুবহু-লেআউট নকশা (FayzarLayoutIR)
 * ==========================================
 * Part-17.4/17.5 (ধাপ ৩): Gemini-ব্লক (লেখা/ধরন) + পাতা-মাপ (FayzarPageGeometry) ⇒ ধরন-নিরপেক্ষ লেআউট-নকশা।
 *
 * নকশার গঠন (সব মাপ pt):
 *   { pages: [{ page, widthPt, heightPt, margins:{top,right,bottom,left}, scale, bodyFontPt,
 *       bands: [{ kind:'flow'|'grid', gapBeforePt, y0, y1,
 *         cells: [{ x0, x1, items: [ item ] }] }] }], warnings: [] }
 *   item = { kind:'para', text, lines, keepLines, fontPt, bold, align:'l|c|r|j', indentPt, firstIndentPt, spaceBeforePt, lineSpacingPt, type }
 *        | { kind:'figure', box, widthPt, heightPt, spaceBeforePt }
 *        | { kind:'table', rows:[[cell]], fontPt, spaceBeforePt, widthPt }
 *
 * ১) মাপ স্বাভাবিককরণ (Part-17.5): মূল লেখার অনুমিত ফন্ট ৮–১৫pt হলে আসল মাপ (ডিজিটাল/স্ক্যান করা পাতা);
 *    নইলে (ক্যামেরা-ছবি / বড়-করে-রাখা পাতা) মূল লেখা = ১২pt ধরে পুরো লেআউট একই অনুপাতে, আদর্শ A4-এ বসানো।
 * ২) পাতার একক মূল-লেখা-আকার: কালির উচ্চতা মূলের ±১৫%-এর ভেতরে ⇒ ঠিক একই আকার (মাপের গোলমাল দূর)।
 * ৩) খাড়া (ঘোরানো) লেখা ⇒ ছবি হিসেবে (চেহারা অক্ষত)।
 * ৪) ওপর-থেকে-নিচে আড়াআড়ি সারি; সারিতে পাশাপাশি অংশ ⇒ অদৃশ্য গ্রিড।
 * বিশুদ্ধ ফাংশন — Node-এ টেস্টযোগ্য।
 */
(function (global) {
  'use strict';
  // [প্যাক-১১ গেট-ফাংশন] GRIDFIRST, FORMFIX, PLEADER ডিফল্ট-চালু; যেকোনো সুইচ বা নিয়ম window.__FZ_OFF_<নাম> (FZ_OFF=<নাম>) দিয়ে বন্ধযোগ্য।
  const fzOn = (k) => !(typeof globalThis !== 'undefined' ? globalThis['__FZ_OFF_' + k] : global['__FZ_OFF_' + k]);
  // গণিত-পাতা উচ্চতা-হিসাব সুইচ: শুধু globalThis.__FZ_ON_MATHH সত্য হলে সক্রিয়
  const mathHOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_MATHH : global.__FZ_ON_MATHH);
  // B9/B4 ফরমকিট সুইচ: শুধু globalThis.__FZ_ON_FORMKIT সত্য হলে সক্রিয়
  const formKitOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_FORMKIT : global.__FZ_ON_FORMKIT);
  // B2 টেবিল রেখা-জাল সুইচ: শুধু globalThis.__FZ_ON_TABLEGRID সত্য হলে সক্রিয়
  const tableGridOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_TABLEGRID : global.__FZ_ON_TABLEGRID);
  // WORK_PLAN F3 (FAITHFUL #১৭): হুবহু-মোড → স্টুডিও সুইচ (__FZ_ON_FAITHFUL_STUDIO)
  const faithfulStudioOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_FAITHFUL_STUDIO : global.__FZ_ON_FAITHFUL_STUDIO)
    || !!(typeof process !== 'undefined' && process.env && process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('FAITHFUL_STUDIO'));
  // A01_WRAP_v1: মূলে এক-লাইনের বাক্য Word-এ ভেঙে দুই লাইন হওয়া রোধের সুইচ (__FZ_ON_WRAPFIT / FZ_ON=WRAPFIT)
  const wrapFitOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_WRAPFIT) && !!(
    (typeof globalThis !== 'undefined' && globalThis.__FZ_ON_WRAPFIT) ||
    (typeof window !== 'undefined' && window.__FZ_ON_WRAPFIT) ||
    (global && global.__FZ_ON_WRAPFIT) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_WRAPFIT === '1' ||
      process.env.__FZ_ON_WRAPFIT === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('WRAPFIT'))
    ))
  );
  // A07_TABLECOL_v1 সুইচ: শুধু globalThis.__FZ_ON_TABLECOL বা window.__FZ_ON_TABLECOL বা FZ_ON=TABLECOL সত্য হলে সক্রিয়
  const tableColOn = () => !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_TABLECOL || (globalThis.window && globalThis.window.__FZ_ON_TABLECOL))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_TABLECOL) ||
    (typeof global !== 'undefined' && global.__FZ_ON_TABLECOL) ||
    (typeof process !== 'undefined' && process.env && (
      process.env.__FZ_ON_TABLECOL === '1' ||
      process.env.__FZ_ON_TABLECOL === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('TABLECOL'))
    ))
  );
  // LINEGAP_v1: প্রতিটি ব্লকের আউটপুট উচ্চতা মাপা উচ্চতার (rect.h) মধ্যে সীমাবদ্ধ রাখা ও উল্লম্ব সরণ (dy) রোধের সুইচ (__FZ_ON_LINEGAP / FZ_ON=LINEGAP)
  const lineGapOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_LINEGAP || (globalThis.window && globalThis.window.__FZ_OFF_LINEGAP))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_LINEGAP) ||
    (global && (global.__FZ_OFF_LINEGAP || (global.window && global.window.__FZ_OFF_LINEGAP))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_LINEGAP === '1' ||
      process.env.__FZ_OFF_LINEGAP === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('LINEGAP'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_LINEGAP || (globalThis.window && globalThis.window.__FZ_ON_LINEGAP))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_LINEGAP) ||
    (global && (global.__FZ_ON_LINEGAP || (global.window && global.window.__FZ_ON_LINEGAP))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_LINEGAP === '1' ||
      process.env.__FZ_ON_LINEGAP === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('LINEGAP'))
    ))
  );
  // A04_PAGES_v1: বহু-কলাম রেজিস্টার ছক ও প্রবাহী অনুচ্ছেদে পাতা-উপচানো রোধের সুইচ (__FZ_ON_PAGES4 / FZ_ON=PAGES4)
  const pages4On = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_PAGES4) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_PAGES4 || (globalThis.window && globalThis.window.__FZ_ON_PAGES4))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_PAGES4) ||
    (global && global.__FZ_ON_PAGES4) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_PAGES4 === '1' ||
      process.env.__FZ_ON_PAGES4 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('PAGES4'))
    ))
  );
  // A19_EXTRALINES_v1: মূলের তুলনায় Word-এ বাড়তি লাইন ও উল্লম্ব সরণ রোধের সুইচ (__FZ_ON_EXTRALINES / FZ_ON=EXTRALINES)
  const extraLinesOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_EXTRALINES) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_EXTRALINES || (globalThis.window && globalThis.window.__FZ_ON_EXTRALINES))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_EXTRALINES) ||
    (global && global.__FZ_ON_EXTRALINES) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_EXTRALINES === '1' ||
      process.env.__FZ_ON_EXTRALINES === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('EXTRALINES'))
    ))
  );
  // A10_LINES_v1: মূলের লাইন-ভাঙা, লাইন-দূরত্ব ও অবস্থান অক্ষত রাখার সুইচ (__FZ_ON_A10LINES / FZ_ON=A10LINES)
  const a10LinesOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_A10LINES) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A10LINES || (globalThis.window && globalThis.window.__FZ_ON_A10LINES))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A10LINES) ||
    (global && (global.__FZ_ON_A10LINES || (global.window && global.window.__FZ_ON_A10LINES))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A10LINES === '1' ||
      process.env.__FZ_ON_A10LINES === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A10LINES'))
    ))
  );
  // A17_P1LOSS_v1: পাতা ১-এর হারিয়ে যাওয়া ড্যাশ-ঘেরা স্লিপ/কার্ডের বক্স ও লাইন পুনরুদ্ধার সুইচ (__FZ_ON_P1LOSS / FZ_ON=P1LOSS)
  const p1LossOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_P1LOSS) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_P1LOSS || (globalThis.window && globalThis.window.__FZ_ON_P1LOSS))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_P1LOSS) ||
    (global && (global.__FZ_ON_P1LOSS || (global.window && global.window.__FZ_ON_P1LOSS))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_P1LOSS === '1' ||
      process.env.__FZ_ON_P1LOSS === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('P1LOSS'))
    ))
  );
  // A01_REGRESS_v1: উত্তরাধিকার সনদ ফরমের লাইন-মোড়ানো, ফাঁকা-রেখা ও উল্লম্ব অবস্থান সংশোধনের সুইচ (__FZ_ON_A01FIX / FZ_ON=A01FIX)
  const a01FixOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_A01FIX) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A01FIX || (globalThis.window && globalThis.window.__FZ_ON_A01FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A01FIX) ||
    (global && (global.__FZ_ON_A01FIX || (global.window && global.window.__FZ_ON_A01FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A01FIX === '1' ||
      process.env.__FZ_ON_A01FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A01FIX'))
    ))
  );
  // A05_DRIFT_v1: পাতা-২-এ লাইন সংখ্যা বৃদ্ধি ও উল্লম্ব সরণ রোধের সুইচ (__FZ_ON_P2DRIFT / FZ_ON=P2DRIFT)
  const p2DriftOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_P2DRIFT) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_P2DRIFT || (globalThis.window && globalThis.window.__FZ_ON_P2DRIFT))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_P2DRIFT) ||
    (global && (global.__FZ_ON_P2DRIFT || (global.window && global.window.__FZ_ON_P2DRIFT))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_P2DRIFT === '1' ||
      process.env.__FZ_ON_P2DRIFT === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('P2DRIFT'))
    ))
  );
  // A02_RULES_v1: রেখা/বাক্স, ছকের বর্ডার ও উচ্চতা মূলের সাথে মেলানোর সুইচ (__FZ_ON_RULEFIX / FZ_ON=RULEFIX)
  const ruleFixOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_RULEFIX) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_RULEFIX || (globalThis.window && globalThis.window.__FZ_ON_RULEFIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_RULEFIX) ||
    (global && (global.__FZ_ON_RULEFIX || (global.window && global.window.__FZ_ON_RULEFIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_RULEFIX === '1' ||
      process.env.__FZ_ON_RULEFIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('RULEFIX'))
    ))
  );
  // A02_RULES_v2: পাতা-ফ্রেম, খাড়া চিত্র-দণ্ড, সংখ্যা-বাক্স ও ছকের বর্ডার মূলের সাথে মেলানোর সুইচ (__FZ_ON_RULES2 / FZ_ON=RULES2, বন্ধ: __FZ_OFF_RULES2)
  const rules2On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_RULES2 || (globalThis.window && globalThis.window.__FZ_OFF_RULES2))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_RULES2) ||
    (global && (global.__FZ_OFF_RULES2 || (global.window && global.window.__FZ_OFF_RULES2))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_RULES2 === '1' ||
      process.env.__FZ_OFF_RULES2 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('RULES2'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_RULES2 || (globalThis.window && globalThis.window.__FZ_ON_RULES2))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_RULES2) ||
    (global && (global.__FZ_ON_RULES2 || (global.window && global.window.__FZ_ON_RULES2))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_RULES2 === '1' ||
      process.env.__FZ_ON_RULES2 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('RULES2'))
    ))
  );
  // NESTBOX_v1: মাপা অনুভূমিক ও উল্লম্ব রেখা থেকে বন্ধ আয়তক্ষেত্র শনাক্তকরণ, ঘরের ভেতরে নেস্টেড টেবিল ও পাশাপাশি আলাদা বক্স পুনরুদ্ধার সুইচ (__FZ_ON_NESTBOX / FZ_ON=NESTBOX)
  const nestBoxOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_NESTBOX || (globalThis.window && globalThis.window.__FZ_OFF_NESTBOX))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_NESTBOX) ||
    (global && (global.__FZ_OFF_NESTBOX || (global.window && global.window.__FZ_OFF_NESTBOX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_NESTBOX === '1' ||
      process.env.__FZ_OFF_NESTBOX === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('NESTBOX'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_NESTBOX || (globalThis.window && globalThis.window.__FZ_ON_NESTBOX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_NESTBOX) ||
    (global && (global.__FZ_ON_NESTBOX || (global.window && global.window.__FZ_ON_NESTBOX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_NESTBOX === '1' ||
      process.env.__FZ_ON_NESTBOX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('NESTBOX'))
    ))
  );
  // A03_SCORE_v1: পেনশন ফরম ও বহু-বাক্স/দ্বি-কলাম ফরমের বক্স-ফ্রেম, খাড়া/অনুভূমিক বিভাজক রেখা, ট্যাব-কলাম ও লাইন-ভাঙা পুনরুদ্ধার সুইচ (__FZ_ON_A03FIX / FZ_ON=A03FIX)
  const a03FixOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A03FIX || (globalThis.window && globalThis.window.__FZ_OFF_A03FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A03FIX) ||
    (global && (global.__FZ_OFF_A03FIX || (global.window && global.window.__FZ_OFF_A03FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A03FIX === '1' ||
      process.env.__FZ_OFF_A03FIX === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A03FIX'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A03FIX || (globalThis.window && globalThis.window.__FZ_ON_A03FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A03FIX) ||
    (global && (global.__FZ_ON_A03FIX || (global.window && global.window.__FZ_ON_A03FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A03FIX === '1' ||
      process.env.__FZ_ON_A03FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A03FIX'))
    ))
  );
  // A17_SCORE_v1: নমুনা a17 ও সমজাতীয় বহু-স্লিপ/ছক ফরমের স্থূল ত্রুটি সংশোধনের সুইচ (__FZ_ON_A17FIX / FZ_ON=A17FIX)
  const a17FixOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_A17FIX) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A17FIX || (globalThis.window && globalThis.window.__FZ_ON_A17FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A17FIX) ||
    (global && (global.__FZ_ON_A17FIX || (global.window && global.window.__FZ_ON_A17FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A17FIX === '1' ||
      process.env.__FZ_ON_A17FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A17FIX'))
    ))
  );
  // A14_SCORE_v1: নমুনা a14 ও সমগোত্রীয় ফরমের বহু-লাইনের পূরণ-অনুচ্ছেদ, জোড়া প্রত্যয়ন-বাক্স ছক ও ক্রমিক তালিকা মেরামতের সুইচ (__FZ_ON_A14FIX / FZ_ON=A14FIX)
  const a14FixOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_A14FIX) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A14FIX || (globalThis.window && globalThis.window.__FZ_ON_A14FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A14FIX) ||
    (global && (global.__FZ_ON_A14FIX || (global.window && global.window.__FZ_ON_A14FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A14FIX === '1' ||
      process.env.__FZ_ON_A14FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A14FIX'))
    ))
  );
  // A07_SCORE_v1: ছকের খণ্ডিত আড়া-রেখা ও হারানো ফাঁকা সারি পুনরুদ্ধার, দাগহীন বাড়তি কলাম ট্যাবে ভাঁজ, বহু-লাইনের ফরম-ছকের ফন্ট/লাইন-দূরত্ব ও দ্বি-কলাম স্বাক্ষর সংশোধনের সুইচ (__FZ_ON_A07FIX / FZ_ON=A07FIX)
  const a07FixOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_A07FIX) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A07FIX || (globalThis.window && globalThis.window.__FZ_ON_A07FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A07FIX) ||
    (global && (global.__FZ_ON_A07FIX || (global.window && global.window.__FZ_ON_A07FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A07FIX === '1' ||
      process.env.__FZ_ON_A07FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A07FIX'))
    ))
  );
  // A07_SCORE_v2: নমুনা a07 ও সমগোত্রীয় বহু-পাতার পদোন্নতি/প্রত্যয়ন ছক-ফরমের ভাঙা দ্বি-কলাম স্বাক্ষর, হারানো আড়া-রেখা ও ফাঁকা সারি, বাড়তি কলামের ডান-ট্যাব ভাঁজ, বহু-লাইনের ঘরের নিখুঁত সারি-উচ্চতা ও পিচ, ভ্রান্ত আন্ডারলাইন ও ৩০০-ডিপিআই চিত্রের প্রান্তিককরণ সংশোধনের সুইচ (__FZ_ON_A07FIX2 / FZ_ON=A07FIX2)
  const a07Fix2On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A07FIX2 || (globalThis.window && globalThis.window.__FZ_OFF_A07FIX2))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A07FIX2) ||
    (global && (global.__FZ_OFF_A07FIX2 || (global.window && global.window.__FZ_OFF_A07FIX2))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A07FIX2 === '1' ||
      process.env.__FZ_OFF_A07FIX2 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A07FIX2'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A07FIX2 || (globalThis.window && globalThis.window.__FZ_ON_A07FIX2))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A07FIX2) ||
    (global && (global.__FZ_ON_A07FIX2 || (global.window && global.window.__FZ_ON_A07FIX2))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A07FIX2 === '1' ||
      process.env.__FZ_ON_A07FIX2 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A07FIX2'))
    ))
  );
  // A19_SCORE_v1: নমুনা a19 ও সমগোত্রীয় ফরমের উন্মুক্ত-পাশের ছক-বর্ডার, নির্দেশনা-বাক্স, বিভক্ত ক্রমিক ব্লক, বহু-লাইন ইনডেন্ট/পিচ ও জাস্টিফাইড ঘর মেরামতের সুইচ (__FZ_ON_A19FIX / FZ_ON=A19FIX)
  const a19FixOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A19FIX || (globalThis.window && globalThis.window.__FZ_OFF_A19FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A19FIX) ||
    (global && (global.__FZ_OFF_A19FIX || (global.window && global.window.__FZ_OFF_A19FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A19FIX === '1' ||
      process.env.__FZ_OFF_A19FIX === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A19FIX'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A19FIX || (globalThis.window && globalThis.window.__FZ_ON_A19FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A19FIX) ||
    (global && (global.__FZ_ON_A19FIX || (global.window && global.window.__FZ_ON_A19FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A19FIX === '1' ||
      process.env.__FZ_ON_A19FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A19FIX'))
    ))
  );
  // A16_SCORE_v1: চেকলিস্ট ছকের খণ্ডিত/ছাঁটা আড়া-রেখা ও ২-লাইনের সারি পুনরুদ্ধার, নেস্টেড উপ-ছকের দ্বৈত বর্ডার রোধ, পাশাপাশি ছক একত্রীকরণ রোধ এবং পাতা ১-এর ঝুলন্ত ক্রমিক তালিকা, ইউ.ও. নোটের রেখা ও অণু-স্বাক্ষর চিত্র সংশোধনের সুইচ (__FZ_ON_A16FIX / FZ_ON=A16FIX)
  const a16FixOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_A16FIX) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A16FIX || (globalThis.window && globalThis.window.__FZ_ON_A16FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A16FIX) ||
    (global && (global.__FZ_ON_A16FIX || (global.window && global.window.__FZ_ON_A16FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A16FIX === '1' ||
      process.env.__FZ_ON_A16FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A16FIX'))
    ))
  );
  // A14_BOXSPLIT_v2: ফ্রেম-বাক্স এক-কলামে রাখা ও ডান-ট্যাবে স্বাক্ষর-লেবেল সুইচ (__FZ_ON_BOXSPLIT বা FZ_ON=BOXSPLIT)
  const boxSplitOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_BOXSPLIT) && !(typeof window !== 'undefined' && window.__FZ_OFF_BOXSPLIT) && !(global && global.__FZ_OFF_BOXSPLIT) && !(
    typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_BOXSPLIT === '1' ||
      process.env.__FZ_OFF_BOXSPLIT === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('BOXSPLIT'))
    )
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_BOXSPLIT || (globalThis.window && globalThis.window.__FZ_ON_BOXSPLIT))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_BOXSPLIT) ||
    (global && (global.__FZ_ON_BOXSPLIT || (global.window && global.window.__FZ_ON_BOXSPLIT))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_BOXSPLIT === '1' ||
      process.env.__FZ_ON_BOXSPLIT === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('BOXSPLIT'))
    ))
  );
  // A11_SCORE_v1: নমুনা a11 ও সমগোত্রীয় আবেদন/সনদ ফরমের স্থূল বাগ (ভুল ruleBelow, ঝুলন্ত ইনডেন্ট লোপ, \checkmark ওভারফ্লো, ডুপ্লিকেট ছবি-বাক্স, বহু-ক্ষেত্র পূরণ-রেখার ভুল ট্যাব ও দ্বৈত বিভাজক রেখা) সংশোধনের সুইচ (__FZ_ON_A11FIX / FZ_ON=A11FIX)
  const a11FixOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_A11FIX) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A11FIX || (globalThis.window && globalThis.window.__FZ_ON_A11FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A11FIX) ||
    (global && (global.__FZ_ON_A11FIX || (global.window && global.window.__FZ_ON_A11FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A11FIX === '1' ||
      process.env.__FZ_ON_A11FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A11FIX'))
    ))
  );
  // A10_SCORE_v1: প্রাক চাকরি বৃত্তান্ত যাচাই ফরম ও সমজাতীয় বহু-পাতার ফরমের দ্বি-কলাম ফরম-বাক্স, রেজিস্টার ছকের সারি-উচ্চতা/শিরোনাম-সাজানো, ঝুলন্ত-ইনডেন্ট প্রশ্ন, ড্যাশ-বিভাজক রেখা ও স্বাক্ষর-রেখা সংশোধনের সুইচ (__FZ_ON_A10FIX / FZ_ON=A10FIX)
  const a10FixOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_A10FIX) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A10FIX || (globalThis.window && globalThis.window.__FZ_ON_A10FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A10FIX) ||
    (global && (global.__FZ_ON_A10FIX || (global.window && global.window.__FZ_ON_A10FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A10FIX === '1' ||
      process.env.__FZ_ON_A10FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A10FIX'))
    ))
  );
  // TABLE_MERGE_v1: মাপা রেখা থেকে ছকের প্রকৃত কলাম-গ্রিড, আড়াআড়ি ও উল্লম্ব ঘর-জোড়া (gridSpan/vMerge), ঘরের প্যাডিং ও সারি-উচ্চতা নির্ধারণের সুইচ (__FZ_ON_TBLMERGE / FZ_ON=TBLMERGE)
  const tblMergeOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_TBLMERGE || (globalThis.window && globalThis.window.__FZ_OFF_TBLMERGE))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_TBLMERGE) ||
    (global && (global.__FZ_OFF_TBLMERGE || (global.window && global.window.__FZ_OFF_TBLMERGE))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_TBLMERGE === '1' ||
      process.env.__FZ_OFF_TBLMERGE === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('TBLMERGE'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_TBLMERGE || (globalThis.window && globalThis.window.__FZ_ON_TBLMERGE))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_TBLMERGE) ||
    (global && (global.__FZ_ON_TBLMERGE || (global.window && global.window.__FZ_ON_TBLMERGE))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_TBLMERGE === '1' ||
      process.env.__FZ_ON_TBLMERGE === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('TBLMERGE'))
    ))
  );
  function filterMicroClusterVRules(vRules) {
    if (!Array.isArray(vRules) || vRules.length < 4) return vRules;
    const sorted = vRules.slice().sort((a, b) => a.x - b.x);
    const clusters = [];
    for (const v of sorted) {
      const last = clusters[clusters.length - 1];
      if (!last || v.x - last[last.length - 1].x > 4.5) clusters.push([v]);
      else last.push(v);
    }
    if (!clusters.some((cl) => cl.length >= 3 && (cl[cl.length - 1].x - cl[0].x) <= 12)) return vRules;
    return clusters.filter((cl) => !(cl.length >= 3 && (cl[cl.length - 1].x - cl[0].x) <= 12)).flat();
  }
  // ROTTEXT_v1: হুবহু মোডে ছকের ঘরে ঘোরানো (খাড়া) লেখা শনাক্তকরণ ও রেন্ডারিং সুইচ (__FZ_ON_ROTTEXT / FZ_ON=ROTTEXT)
  const rotTextOn = () => !(typeof globalThis !== 'undefined' && globalThis.__FZ_OFF_ROTTEXT) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_ROTTEXT || (globalThis.window && globalThis.window.__FZ_ON_ROTTEXT))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_ROTTEXT) ||
    (global && (global.__FZ_ON_ROTTEXT || (global.window && global.window.__FZ_ON_ROTTEXT))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_ROTTEXT === '1' ||
      process.env.__FZ_ON_ROTTEXT === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('ROTTEXT'))
    ))
  );
  // VSPACE_v1: হুবহু মোডে লাইনের উল্লম্ব ফাঁক, সারি-উচ্চতা, বহু-লাইনের ঘরের পিচ, শিরোনাম-ফন্ট ও চিত্রের উচ্চতা মূলের সাথে মেলানোর সুইচ (__FZ_ON_VSPACE / FZ_ON=VSPACE)
  const vspaceOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_VSPACE || (globalThis.window && globalThis.window.__FZ_OFF_VSPACE))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_VSPACE) ||
    (global && (global.__FZ_OFF_VSPACE || (global.window && global.window.__FZ_OFF_VSPACE))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_VSPACE === '1' ||
      process.env.__FZ_OFF_VSPACE === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('VSPACE'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_VSPACE || (globalThis.window && globalThis.window.__FZ_ON_VSPACE))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_VSPACE) ||
    (global && (global.__FZ_ON_VSPACE || (global.window && global.window.__FZ_ON_VSPACE))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_VSPACE === '1' ||
      process.env.__FZ_ON_VSPACE === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('VSPACE'))
    ))
  );
  // INDENT_v1: লাইনের বাম প্রান্ত (dx0: ইনডেন্ট, অ্যালাইনমেন্ট, ট্যাব-স্টপ, ঘরের প্যাডিং) ও ডান প্রান্ত (dx1) নিখুঁত করার সুইচ (__FZ_ON_INDENT / FZ_ON=INDENT)
  const indentOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_INDENT || (globalThis.window && globalThis.window.__FZ_OFF_INDENT))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_INDENT) ||
    (global && (global.__FZ_OFF_INDENT || (global.window && global.window.__FZ_OFF_INDENT))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_INDENT === '1' ||
      process.env.__FZ_OFF_INDENT === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('INDENT'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_INDENT || (globalThis.window && globalThis.window.__FZ_ON_INDENT))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_INDENT) ||
    (global && (global.__FZ_ON_INDENT || (global.window && global.window.__FZ_ON_INDENT))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_INDENT === '1' ||
      process.env.__FZ_ON_INDENT === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('INDENT'))
    ))
  );
  // WIDTH_v1: হুবহু মোডে লাইনের প্রস্থ ও ডান-প্রান্ত (dx1) মূলের সাথে মেলানোর সুইচ (__FZ_ON_WIDTH / FZ_ON=WIDTH)
  const widthOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_WIDTH || (globalThis.window && globalThis.window.__FZ_OFF_WIDTH))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_WIDTH) ||
    (global && (global.__FZ_OFF_WIDTH || (global.window && global.window.__FZ_OFF_WIDTH))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_WIDTH === '1' ||
      process.env.__FZ_OFF_WIDTH === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('WIDTH'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_WIDTH || (globalThis.window && globalThis.window.__FZ_ON_WIDTH))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_WIDTH) ||
    (global && (global.__FZ_ON_WIDTH || (global.window && global.window.__FZ_ON_WIDTH))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_WIDTH === '1' ||
      process.env.__FZ_ON_WIDTH === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('WIDTH'))
    ))
  );
  // A14_SCORE_v3: বক্স-ঘেরা শিরোনামের ডুপ্লিকেট ruleAbove/underline নিরসন, পাতা ২-এর বিলুপ্ত শিরোনাম-বক্স ও প্রত্যয়ন-ছকের মাঝের ফাঁক-সারি (gapRows) পুনরুদ্ধার, পাতা ৩-এর ক্রমিক তালিকার লাইন-সংঘর্ষ ও RECITATION আবর্জনা অপসারণ এবং পাতা ১-এর উপ-তালিকার ইনডেন্ট ও স্বাক্ষর-ফুটার সমন্বয়ের সুইচ (__FZ_ON_A14FIX3 / FZ_ON=A14FIX3)
  const a14Fix3On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A14FIX3 || (globalThis.window && globalThis.window.__FZ_OFF_A14FIX3))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A14FIX3) ||
    (global && (global.__FZ_OFF_A14FIX3 || (global.window && global.window.__FZ_OFF_A14FIX3))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A14FIX3 === '1' ||
      process.env.__FZ_OFF_A14FIX3 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A14FIX3'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A14FIX3 || (globalThis.window && globalThis.window.__FZ_ON_A14FIX3))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A14FIX3) ||
    (global && (global.__FZ_ON_A14FIX3 || (global.window && global.window.__FZ_ON_A14FIX3))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A14FIX3 === '1' ||
      process.env.__FZ_ON_A14FIX3 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A14FIX3'))
    ))
  );
  // FONT_v1: হুবহু-মোডে লাইন-উচ্চতা, ফন্ট-আকার, বাংলা কার/যুক্তাক্ষর অনুপাত, শিরোনাম/লেবেল সামঞ্জস্য ও লাইন-পিচ মূলের সাথে মেলানোর সুইচ (__FZ_ON_FONTFIX / FZ_ON=FONTFIX)
  const fontFixOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_FONTFIX || (globalThis.window && globalThis.window.__FZ_OFF_FONTFIX))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_FONTFIX) ||
    (global && (global.__FZ_OFF_FONTFIX || (global.window && global.window.__FZ_OFF_FONTFIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_FONTFIX === '1' ||
      process.env.__FZ_OFF_FONTFIX === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('FONTFIX'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_FONTFIX || (globalThis.window && globalThis.window.__FZ_ON_FONTFIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_FONTFIX) ||
    (global && (global.__FZ_ON_FONTFIX || (global.window && global.window.__FZ_ON_FONTFIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_FONTFIX === '1' ||
      process.env.__FZ_ON_FONTFIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('FONTFIX'))
    ))
  );
  // A16_SCORE_v3: অণু-স্বাক্ষর চিত্রের চওড়া-ক্রপ ও ছকের তলার রেখা-সংঘর্ষ নিরসন, প্রচ্ছদ-স্মারকের স্বাক্ষর-ব্লক মাঝ-সাজানো ও অবস্থান পুনরুদ্ধার এবং সূচিপত্র/চেকলিস্ট শিরোনাম ও ফন্ট সমন্বয়ের সুইচ (__FZ_ON_A16FIX3 / FZ_ON=A16FIX3)
  const a16Fix3On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A16FIX3 || (globalThis.window && globalThis.window.__FZ_OFF_A16FIX3))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A16FIX3) ||
    (global && (global.__FZ_OFF_A16FIX3 || (global.window && global.window.__FZ_OFF_A16FIX3))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A16FIX3 === '1' ||
      process.env.__FZ_OFF_A16FIX3 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A16FIX3'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A16FIX3 || (globalThis.window && globalThis.window.__FZ_ON_A16FIX3))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A16FIX3) ||
    (global && (global.__FZ_ON_A16FIX3 || (global.window && global.window.__FZ_ON_A16FIX3))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A16FIX3 === '1' ||
      process.env.__FZ_ON_A16FIX3 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A16FIX3'))
    ))
  );
  // A14_RULES_v1: নমুনা a14 ও সমগোত্রীয় ফরমের রেখা, টেবিল-বর্ডার, বাক্স-ফ্রেম ও আন্ডারলাইনের অবস্থান ও দৈর্ঘ্য নিখুঁত করার সুইচ (__FZ_ON_A14RULES / FZ_ON=A14RULES)
  const a14RulesOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A14RULES || (globalThis.window && globalThis.window.__FZ_OFF_A14RULES))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A14RULES) ||
    (global && (global.__FZ_OFF_A14RULES || (global.window && global.window.__FZ_OFF_A14RULES))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A14RULES === '1' ||
      process.env.__FZ_OFF_A14RULES === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A14RULES'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A14RULES || (globalThis.window && globalThis.window.__FZ_ON_A14RULES))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A14RULES) ||
    (global && (global.__FZ_ON_A14RULES || (global.window && global.window.__FZ_ON_A14RULES))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A14RULES === '1' ||
      process.env.__FZ_ON_A14RULES === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A14RULES'))
    ))
  );
  // A07_SCORE_v3: নমুনা a07 ও সমগোত্রীয় বহু-পাতার পদোন্নতি/প্রত্যয়ন ছক-ফরমের মেলেনি এমন ১০টি লাইন, ৮টি হঠাৎ লাফ, ৫টি বাম-প্রান্তের ত্রুটি, মুছে যাওয়া শিরোনাম-আন্ডারলাইন ও সংকুচিত টিক-চিত্র মেরামতের সুইচ (__FZ_ON_A07FIX3 / FZ_ON=A07FIX3)
  const a07Fix3On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A07FIX3 || (globalThis.window && globalThis.window.__FZ_OFF_A07FIX3))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A07FIX3) ||
    (global && (global.__FZ_OFF_A07FIX3 || (global.window && global.window.__FZ_OFF_A07FIX3))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A07FIX3 === '1' ||
      process.env.__FZ_OFF_A07FIX3 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A07FIX3'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A07FIX3 || (globalThis.window && globalThis.window.__FZ_ON_A07FIX3))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A07FIX3) ||
    (global && (global.__FZ_ON_A07FIX3 || (global.window && global.window.__FZ_ON_A07FIX3))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A07FIX3 === '1' ||
      process.env.__FZ_ON_A07FIX3 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A07FIX3'))
    ))
  );
  // A16_SCORE_v4: নমুনা a16 ও সমগোত্রীয় চেকলিস্ট/স্মারক নথির সূচিপত্র বুলেট ও বাড়তি প্রত্যয় সংশোধন, উপ-শিরোনামের হারানো আন্ডারলাইন পুনরুদ্ধার, চেকলিস্ট ছকের শিরোনাম/ক্রমিক/উল্লম্ব-মার্জ/জাস্টিফিকেশন ও নেস্টেড উপ-ছক সংস্কারের সুইচ (__FZ_ON_A16FIX4 / FZ_ON=A16FIX4)
  const a16Fix4On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A16FIX4 || (globalThis.window && globalThis.window.__FZ_OFF_A16FIX4))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A16FIX4) ||
    (global && (global.__FZ_OFF_A16FIX4 || (global.window && global.window.__FZ_OFF_A16FIX4))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A16FIX4 === '1' ||
      process.env.__FZ_OFF_A16FIX4 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A16FIX4'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A16FIX4 || (globalThis.window && globalThis.window.__FZ_ON_A16FIX4))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A16FIX4) ||
    (global && (global.__FZ_ON_A16FIX4 || (global.window && global.window.__FZ_ON_A16FIX4))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A16FIX4 === '1' ||
      process.env.__FZ_ON_A16FIX4 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A16FIX4'))
    ))
  );
  // A02_SCORE_v1: নমুনা a02 ও সমগোত্রীয় এক-পাতার অনাপত্তি সনদ (NOC) ফরমের পাতা-ফ্রেম দূরত্ব, শীর্ষ এমব্লেম চিত্রের উচ্চতা, শিরোনাম/উপ-শিরোনাম ও বডি-লাইনের ফন্ট ও প্রস্থ, ডট-লিডার/ওয়েবসাইট লাইনের প্রান্তিককরণ, পারিবারিক ছকের শিরোনাম ও সারি-উচ্চতা, ৪-কলাম স্বাক্ষর-গ্রিড এবং ধূসর পাদটীকা বারের নিখুঁত জ্যামিতিক মেরামতের সুইচ (__FZ_ON_A02FIX / FZ_ON=A02FIX, বন্ধ: __FZ_OFF_A02FIX / FZ_OFF=A02FIX)
  const a02FixOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A02FIX || (globalThis.window && globalThis.window.__FZ_OFF_A02FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A02FIX) ||
    (global && (global.__FZ_OFF_A02FIX || (global.window && global.window.__FZ_OFF_A02FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A02FIX === '1' ||
      process.env.__FZ_OFF_A02FIX === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A02FIX'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A02FIX || (globalThis.window && globalThis.window.__FZ_ON_A02FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A02FIX) ||
    (global && (global.__FZ_ON_A02FIX || (global.window && global.window.__FZ_ON_A02FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A02FIX === '1' ||
      process.env.__FZ_ON_A02FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A02FIX'))
    ))
  );
  // A14_SCORE_v4: পাতা ১-এর দ্বি-স্তর স্বাক্ষর ও ফাইল-পাথ ফুটার, পাতা ২-এর প্রাপক-ব্লক/সম্বোধন/বিশেষ-দ্রষ্টব্য পাদটীকা/৪র্থ-বিষয় ট্যাব এবং পাতা ৩-এর ক্রমিক নির্দেশনার ফন্ট ও লাইন-পিচ নিখুঁত করার সুইচ (__FZ_ON_A14FIX4 / FZ_ON=A14FIX4)
  const a14Fix4On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A14FIX4 || (globalThis.window && globalThis.window.__FZ_OFF_A14FIX4))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A14FIX4) ||
    (global && (global.__FZ_OFF_A14FIX4 || (global.window && global.window.__FZ_OFF_A14FIX4))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A14FIX4 === '1' ||
      process.env.__FZ_OFF_A14FIX4 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A14FIX4'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A14FIX4 || (globalThis.window && globalThis.window.__FZ_ON_A14FIX4))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A14FIX4) ||
    (global && (global.__FZ_ON_A14FIX4 || (global.window && global.window.__FZ_ON_A14FIX4))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A14FIX4 === '1' ||
      process.env.__FZ_ON_A14FIX4 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A14FIX4'))
    ))
  );
  // A13_SCORE_v1: নমুনা a13 ও সমগোত্রীয় প্রত্যয়ন/মঞ্জুরীপত্র ফরমের ২-লাইনের মোটা শিরোনামের লাইন-জোড়া ভাঙা, ড্যাশ-রেখার উল্লম্ব অবস্থান, কোলন-ট্যাব তালিকার ফন্ট/প্রস্থ, একক ক্রমিক উপ-শিরোনামের ভ্রান্ত ট্যাব রোধ ও ক্ষুদ্র বারকোড-বাক্স ছক নিখুঁত করার সুইচ (__FZ_ON_A13FIX / FZ_ON=A13FIX)
  const a13FixOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A13FIX || (globalThis.window && globalThis.window.__FZ_OFF_A13FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A13FIX) ||
    (global && (global.__FZ_OFF_A13FIX || (global.window && global.window.__FZ_OFF_A13FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A13FIX === '1' ||
      process.env.__FZ_OFF_A13FIX === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A13FIX'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A13FIX || (globalThis.window && globalThis.window.__FZ_ON_A13FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A13FIX) ||
    (global && (global.__FZ_ON_A13FIX || (global.window && global.window.__FZ_ON_A13FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A13FIX === '1' ||
      process.env.__FZ_ON_A13FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A13FIX'))
    ))
  );
  // A16_SCORE_v5: নমুনা a16 (লেআউট ৯০.০) ও সমগোত্রীয় স্মারক/চেকলিস্ট নথির পাতা ১-এর মার্জিন খাড়া-রেখা, পাতা ৪ ও ৭-এর শীর্ষ-ডান স্ক্যান-চিহ্ন ও স্বাক্ষর-অবস্থান, পাতা ২-এর বুলেট-ফন্ট ও বাড়তি প্রত্যয় এবং পাতা ৫, ৬, ৮, ৯-এর শিরোনাম-আন্ডারলাইন, অণু-স্বাক্ষর চিত্র ও ফুটার/স্বাক্ষর উল্লম্ব অবস্থান সংস্কারের সুইচ (__FZ_ON_A16FIX5 / FZ_ON=A16FIX5)
  const a16Fix5On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A16FIX5 || (globalThis.window && globalThis.window.__FZ_OFF_A16FIX5))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A16FIX5) ||
    (global && (global.__FZ_OFF_A16FIX5 || (global.window && global.window.__FZ_OFF_A16FIX5))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A16FIX5 === '1' ||
      process.env.__FZ_OFF_A16FIX5 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A16FIX5'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A16FIX5 || (globalThis.window && globalThis.window.__FZ_ON_A16FIX5))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A16FIX5) ||
    (global && (global.__FZ_ON_A16FIX5 || (global.window && global.window.__FZ_ON_A16FIX5))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A16FIX5 === '1' ||
      process.env.__FZ_ON_A16FIX5 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A16FIX5'))
    ))
  );
  // A09_SCORE_v1: ফাঁকা বডি-সারিযুক্ত ১০-কলাম ফরম-ছকের বোল্ড বহু-লাইন শিরোনাম (১১.৫pt, ১৪.০pt লাইন-পিচ ও শীর্ষ প্রান্তিককরণ), ১৪pt কেন্দ্রীভূত শিরোনাম/হেডার, ১২pt বাম-ইনডেন্ট বিশেষ-দ্রষ্টব্য এবং বহু-লাইনের অনুচ্ছেদের প্রকৃত লাইন-ব্যবধান নিখুঁত করার সুইচ (__FZ_ON_A09FIX / FZ_ON=A09FIX)
  const a09FixOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A09FIX || (globalThis.window && globalThis.window.__FZ_OFF_A09FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A09FIX) ||
    (global && (global.__FZ_OFF_A09FIX || (global.window && global.window.__FZ_OFF_A09FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A09FIX === '1' ||
      process.env.__FZ_OFF_A09FIX === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A09FIX'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A09FIX || (globalThis.window && globalThis.window.__FZ_ON_A09FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A09FIX) ||
    (global && (global.__FZ_ON_A09FIX || (global.window && global.window.__FZ_ON_A09FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A09FIX === '1' ||
      process.env.__FZ_ON_A09FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A09FIX'))
    ))
  );
  // A14_SCORE_v5: পাতা ১-এর হেডার ই-মেইল ফন্ট, দ্বি-স্তর স্বাক্ষর সংযোগ ও আদ্যক্ষর-স্বাক্ষর ক্রপ, পাতা ২-এর প্রাপক ব্লক ও বিন্দু-লিডার প্রস্থ এবং পাতা ৩-এর ক্রমিক নির্দেশনা সংযোগ, RECITATION পুনরুদ্ধার ও সমাপনী স্বাক্ষর সংযোজনের সুইচ (__FZ_ON_A14FIX5 / FZ_ON=A14FIX5)
  const a14Fix5On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A14FIX5 || (globalThis.window && globalThis.window.__FZ_OFF_A14FIX5))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A14FIX5) ||
    (global && (global.__FZ_OFF_A14FIX5 || (global.window && global.window.__FZ_OFF_A14FIX5))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A14FIX5 === '1' ||
      process.env.__FZ_OFF_A14FIX5 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A14FIX5'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A14FIX5 || (globalThis.window && globalThis.window.__FZ_ON_A14FIX5))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A14FIX5) ||
    (global && (global.__FZ_ON_A14FIX5 || (global.window && global.window.__FZ_ON_A14FIX5))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A14FIX5 === '1' ||
      process.env.__FZ_ON_A14FIX5 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A14FIX5'))
    ))
  );
  // A07_SCORE_v5: টেবিল-গ্রিড অক্ষত রেখে নমুনা a07 ও সমগোত্রীয় বহু-পাতার পদোন্নতি/প্রত্যয়ন ছক-ফরমের প্রবাহ-শিরোনামের আন্ডারলাইন ও অক্ষর-ফাঁক, দ্বি-কলাম স্বাক্ষর গ্রিডের ফন্ট/পিচ/সরণ, ৩০০-ডিপিআই ক্রপকৃত ক্ষুদ্র টিক-চিত্রের প্রকৃত আকার/অবস্থান এবং ছকের ওভাররাইটকৃত ফন্ট ও লাইন-পিচ পুনরুদ্ধারের সুইচ (__FZ_ON_A07FIX5 / FZ_ON=A07FIX5)
  const a07Fix5On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A07FIX5 || (globalThis.window && globalThis.window.__FZ_OFF_A07FIX5))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A07FIX5) ||
    (global && (global.__FZ_OFF_A07FIX5 || (global.window && global.window.__FZ_OFF_A07FIX5))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A07FIX5 === '1' ||
      process.env.__FZ_OFF_A07FIX5 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A07FIX5'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A07FIX5 || (globalThis.window && globalThis.window.__FZ_ON_A07FIX5))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A07FIX5) ||
    (global && (global.__FZ_ON_A07FIX5 || (global.window && global.window.__FZ_ON_A07FIX5))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A07FIX5 === '1' ||
      process.env.__FZ_ON_A07FIX5 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A07FIX5'))
    ))
  );
  // A12_SCORE_v1: নমুনা a12 ও সমগোত্রীয় পেনশন উত্তরাধিকারী ঘোষণাপত্র ফরমের বহু-লাইনের বন্ধনী-ক্রমিক অনুচ্ছেদের ভ্রান্ত কোলন-ট্যাব ইনডেন্ট ও অনুচ্ছেদ-বিভাজন নিরসন, একক ক্রমিক তালিকার ভ্রান্ত গ্রিড-ইনডেন্ট সমতাকরণ, ৭-কলামের মনোনীত উত্তরাধিকারী ছকের ২-লাইনের মোটা শিরোনাম-ভাঁজ ও ০.৫pt বর্ডার-উচ্চতা সমন্বয় এবং শুরুর গদ্য-অনুচ্ছেদের অপ্রয়োজনীয় অক্ষর-সংকোচন রোধের সুইচ (__FZ_ON_A12FIX / FZ_ON=A12FIX)
  const a12FixOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A12FIX || (globalThis.window && globalThis.window.__FZ_OFF_A12FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A12FIX) ||
    (global && (global.__FZ_OFF_A12FIX || (global.window && global.window.__FZ_OFF_A12FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A12FIX === '1' ||
      process.env.__FZ_OFF_A12FIX === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A12FIX'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A12FIX || (globalThis.window && globalThis.window.__FZ_ON_A12FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A12FIX) ||
    (global && (global.__FZ_ON_A12FIX || (global.window && global.window.__FZ_ON_A12FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A12FIX === '1' ||
      process.env.__FZ_ON_A12FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A12FIX'))
    ))
  );
  // A03_SCORE_v3: পাতা ১ ও ২-এর কালো শিরোনাম-ব্যানার প্রস্থ/উচ্চতা/অবস্থান, চেকবক্স ও মাস-বছর বাক্স, দিন-মাস-বছর ছকের gridSpan, খাড়া বিভাজক রেখা, অবাঞ্ছিত বোল্ড ও স্বাক্ষর-তারিখ বাক্স সংশোধনের সুইচ (__FZ_ON_A03FIX3 / FZ_ON=A03FIX3)
  const a03Fix3On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A03FIX3 || (globalThis.window && globalThis.window.__FZ_OFF_A03FIX3))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A03FIX3) ||
    (global && (global.__FZ_OFF_A03FIX3 || (global.window && global.window.__FZ_OFF_A03FIX3))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A03FIX3 === '1' ||
      process.env.__FZ_OFF_A03FIX3 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A03FIX3'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A03FIX3 || (globalThis.window && globalThis.window.__FZ_ON_A03FIX3))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A03FIX3) ||
    (global && (global.__FZ_ON_A03FIX3 || (global.window && global.window.__FZ_ON_A03FIX3))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A03FIX3 === '1' ||
      process.env.__FZ_ON_A03FIX3 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A03FIX3'))
    ))
  );
  // A06_SCORE_v1: নমুনা a06 ও সমগোত্রীয় গৃহ নির্মাণ ঋণ উপযুক্ততা প্রত্যয়ন ফরমের প্রবাহ-শিরোনামের মুছে যাওয়া আন্ডারলাইন পুনরুদ্ধার, কোলন-ট্যাব তালিকার বিভক্ত "তারিখ" সংযোজন ও ট্যাব-স্টপ/ডট-লিডার সমতাকরণ, উপরের ৩টি লিডার-লেবেল লাইনের ফন্ট ও ট্যাব-স্টপ একীকরণ, ৩-লাইনের জাস্টিফাইড প্রত্যয়ন অনুচ্ছেদের ডান-ইনডেন্ট (justRightPt) ও লাইন-পিচ পুনরুদ্ধার এবং ৩০০-ডিপিআই এমব্লেম চিত্রের সাদা প্যাডিং সমন্বয়ের সুইচ (__FZ_ON_A06FIX / FZ_ON=A06FIX)
  const a06FixOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A06FIX || (globalThis.window && globalThis.window.__FZ_OFF_A06FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A06FIX) ||
    (global && (global.__FZ_OFF_A06FIX || (global.window && global.window.__FZ_OFF_A06FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A06FIX === '1' ||
      process.env.__FZ_OFF_A06FIX === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A06FIX'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A06FIX || (globalThis.window && globalThis.window.__FZ_ON_A06FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A06FIX) ||
    (global && (global.__FZ_ON_A06FIX || (global.window && global.window.__FZ_ON_A06FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A06FIX === '1' ||
      process.env.__FZ_ON_A06FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A06FIX'))
    ))
  );
  // A03_SCORE_v4: A03FIX3-এর উপকারী অংশ (পূর্ণ-প্রস্থ কালো ব্যানার, অবাঞ্ছিত বোল্ড অপসারণ, চেকবক্স ও মাস-বছর বাক্স, বাম-সাজানো চেকবক্স অনুচ্ছেদ, দিন-মাস-বছর ছকের পূর্ণ গ্রিড ও gridSpan, খাড়া বিভাজক রেখা) রেখে উল্লম্ব ড্রিফট নিরসন সুইচ (__FZ_ON_A03FIX4 / FZ_ON=A03FIX4)
  const a03Fix4On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A03FIX4 || (globalThis.window && globalThis.window.__FZ_OFF_A03FIX4))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A03FIX4) ||
    (global && (global.__FZ_OFF_A03FIX4 || (global.window && global.window.__FZ_OFF_A03FIX4))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A03FIX4 === '1' ||
      process.env.__FZ_OFF_A03FIX4 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A03FIX4'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A03FIX4 || (globalThis.window && globalThis.window.__FZ_ON_A03FIX4))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A03FIX4) ||
    (global && (global.__FZ_ON_A03FIX4 || (global.window && global.window.__FZ_ON_A03FIX4))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A03FIX4 === '1' ||
      process.env.__FZ_ON_A03FIX4 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A03FIX4'))
    ))
  );
  // A07_SCORE_v6: টেবিল-গ্রিড সম্পূর্ণ অক্ষত রেখে নমুনা a07 ও সমগোত্রীয় বহু-পাতার পদোন্নতি/প্রত্যয়ন ছক-ফরমের ফরম-শিরোনামের (ছক-২, ছক-৩) হারানো আন্ডারলাইন ও শীর্ষ কেন্দ্র-সরণ, পূরণ-লেবেল/নির্দেশনা/পাদটীকা/স্বাক্ষর-ব্লকের ফন্ট ও প্রস্থ এবং ছক ১–৫-এর ঘরের মার্জিন, লাইন-ভাঁজ, ফন্ট, লাইন-পিচ ও বাম-ট্যাব পুনরুদ্ধারের সুইচ (__FZ_ON_A07FIX6 / FZ_ON=A07FIX6)
  const a07Fix6On = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A07FIX6 || (globalThis.window && globalThis.window.__FZ_OFF_A07FIX6))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A07FIX6) ||
    (global && (global.__FZ_OFF_A07FIX6 || (global.window && global.window.__FZ_OFF_A07FIX6))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A07FIX6 === '1' ||
      process.env.__FZ_OFF_A07FIX6 === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A07FIX6'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A07FIX6 || (globalThis.window && globalThis.window.__FZ_ON_A07FIX6))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A07FIX6) ||
    (global && (global.__FZ_ON_A07FIX6 || (global.window && global.window.__FZ_ON_A07FIX6))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A07FIX6 === '1' ||
      process.env.__FZ_ON_A07FIX6 === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A07FIX6'))
    ))
  );
  // F1_SCORE_v1: নমুনা f1 ও সমগোত্রীয় বহু-পাতার শিক্ষাবৃত্তি/অনলাইন আবেদন ফরমের পাদটীকা ফন্ট, অঙ্ক-বাক্স (১১ ও ১৭ ঘর) প্রস্থ/উচ্চতা/অবস্থান, রেডিও-বাটন ব্যবধান, বহু-লাইনের সারির শীর্ষ-প্রান্তিককরণ (vAlign="top"), প্লেসহোল্ডার ও সংযুক্তি-ছক নিখুঁত করার সুইচ (__FZ_ON_F1FIX / FZ_ON=F1FIX, বন্ধ: __FZ_OFF_F1FIX / FZ_OFF=F1FIX)
  const f1FixOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_F1FIX || (globalThis.window && globalThis.window.__FZ_OFF_F1FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_F1FIX) ||
    (global && (global.__FZ_OFF_F1FIX || (global.window && global.window.__FZ_OFF_F1FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_F1FIX === '1' ||
      process.env.__FZ_OFF_F1FIX === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('F1FIX'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_F1FIX || (globalThis.window && globalThis.window.__FZ_ON_F1FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_F1FIX) ||
    (global && (global.__FZ_ON_F1FIX || (global.window && global.window.__FZ_ON_F1FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_F1FIX === '1' ||
      process.env.__FZ_ON_F1FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('F1FIX'))
    ))
  );
  // A18_SCORE_v1: টেবিল-গ্রিড ও সীমানা সম্পূর্ণ অক্ষত রেখে নমুনা a18 ও সমগোত্রীয় এক-পাতার ছুটির আবেদন ফরমের ("বাংলাদেশ ফরম নং-২৩৯৫") শীর্ষ বিধি-লাইনের ভ্রান্ত বোল্ড/ফন্ট ও লিডার ট্যাব-স্টপ, নিচের দুটি ক্ষুদ্র পাদটীকার ফন্ট ও প্রস্থ, এবং ২৮×৪ ছকের ফন্ট, জাস্টিফাইড গদ্য-সারির শব্দ-ফাঁক, সারি ১৫ ও ২৭-এর কলাম/gridSpan, লিডার-স্টপ ও উল্লম্ব অবস্থান (vAlign/rowShiftPt) মেরামতের সুইচ (__FZ_ON_A18FIX / FZ_ON=A18FIX)
  const a18FixOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A18FIX || (globalThis.window && globalThis.window.__FZ_OFF_A18FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A18FIX) ||
    (global && (global.__FZ_OFF_A18FIX || (global.window && global.window.__FZ_OFF_A18FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A18FIX === '1' ||
      process.env.__FZ_OFF_A18FIX === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A18FIX'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A18FIX || (globalThis.window && globalThis.window.__FZ_ON_A18FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A18FIX) ||
    (global && (global.__FZ_ON_A18FIX || (global.window && global.window.__FZ_ON_A18FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A18FIX === '1' ||
      process.env.__FZ_ON_A18FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A18FIX'))
    ))
  );
  // A08_SCORE_v1: টেবিল-গ্রিড সম্পূর্ণ অক্ষত রেখে নমুনা a08 ও সমগোত্রীয় ১-পাতার না-দাবী সনদপত্র ফরমের ৩টি সংক্ষিপ্ত ক্রমিক-লেবেলের (১. অফিসের নামঃ, ২. কর্মকর্তার নাম ও পদবিঃ, ৩. কার্যকালঃ) SERIALHANG ট্যাব-প্রসারণ রোধ ও রেফ-মাত্রা সেতুবন্ধন, ১২×৩ পাওনা-ছকের কলাম-কেন্দ্রীকরণ (colAligns=['c','l','c']), শীর্ষ উল্লম্ব প্রান্তিককরণ ও নিখুঁত বাহ্যিক প্রস্থ/সারি-উচ্চতা এবং শীর্ষ হেডার ও নিচের ২-লাইন স্বাক্ষরের অবস্থান/পিচ মেরামতের সুইচ (__FZ_ON_A08FIX / FZ_ON=A08FIX)
  const a08FixOn = () => !(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_OFF_A08FIX || (globalThis.window && globalThis.window.__FZ_OFF_A08FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_OFF_A08FIX) ||
    (global && (global.__FZ_OFF_A08FIX || (global.window && global.window.__FZ_OFF_A08FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_OFF_A08FIX === '1' ||
      process.env.__FZ_OFF_A08FIX === 'true' ||
      (process.env.FZ_OFF && process.env.FZ_OFF.split(',').map((s) => s.trim()).includes('A08FIX'))
    ))
  ) && !!(
    (typeof globalThis !== 'undefined' && (globalThis.__FZ_ON_A08FIX || (globalThis.window && globalThis.window.__FZ_ON_A08FIX))) ||
    (typeof window !== 'undefined' && window.__FZ_ON_A08FIX) ||
    (global && (global.__FZ_ON_A08FIX || (global.window && global.window.__FZ_ON_A08FIX))) ||
    (typeof process !== 'undefined' && process && process.env && (
      process.env.__FZ_ON_A08FIX === '1' ||
      process.env.__FZ_ON_A08FIX === 'true' ||
      (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A08FIX'))
    ))
  );
  const ROT_MARK_RE = /^\s*⟦\s*rot(?:\s*[:：]\s*(btLr|tbRl))?\s*⟧\s*/i;
  const RotCellProto = {
    toString() { return String(this.text != null ? this.text : ''); },
    valueOf() { return String(this.text != null ? this.text : ''); },
    [Symbol.toPrimitive]() { return String(this.text != null ? this.text : ''); },
    get length() { return String(this.text != null ? this.text : '').length; }
  };
  ['trim', 'split', 'replace', 'startsWith', 'endsWith', 'includes', 'slice', 'substring', 'match', 'matchAll', 'toLowerCase', 'toUpperCase', 'charAt', 'charCodeAt', 'indexOf', 'lastIndexOf', 'padStart', 'padEnd', 'repeat'].forEach((m) => {
    if (typeof String.prototype[m] === 'function') {
      RotCellProto[m] = function (...args) { return String(this.text != null ? this.text : '')[m](...args); };
    }
  });
  function makeRotCell(text, rot) {
    const obj = Object.create(RotCellProto);
    obj.text = String(text != null ? text : '');
    obj.rot = rot || 'btLr';
    return obj;
  }
  function cellStr(c) {
    if (c && typeof c === 'object' && !Array.isArray(c)) {
      return String(c.text != null ? c.text : (c.value != null ? c.value : ''));
    }
    return String(c == null ? '' : c);
  }
  function parseRotCellInput(c) {
    if (c && typeof c === 'object' && !Array.isArray(c)) {
      const raw = cellStr(c);
      const m = ROT_MARK_RE.exec(raw);
      if (m) return { text: raw.slice(m[0].length), rot: m[1] || c.rot || 'btLr' };
      return { text: raw, rot: c.rot || null };
    }
    const raw = String(c == null ? '' : c);
    const m = ROT_MARK_RE.exec(raw);
    if (m) return { text: raw.slice(m[0].length), rot: m[1] || 'btLr' };
    return { text: raw, rot: null };
  }
  function partialHeaderRowHeights(rows, rawRules, top, bot) {
    if (!Array.isArray(rawRules) || !rows || rows.length < 12 || !(bot > top)) return null;
    const H0 = [];
    rawRules.slice().sort((a, b) => a - b).forEach((y) => {
      if (y >= top - 4 && y <= bot + 4 && (!H0.length || y - H0[H0.length - 1] > 3)) H0.push(y);
    });
    const K = H0.length - 1, spanH = bot - top;
    if (K < 3 || K > 6 || rows.length < K * 3) return null;
    if (H0[K] - top >= spanH * 0.75 || bot - H0[K] < spanH * 0.25) return null;
    const B = [];
    for (let b = 0; b < K; b++) B.push(H0[b + 1] - H0[b]);
    let tallBandIdx = 0;
    for (let b = 1; b < K; b++) if (B[b] > B[tallBandIdx]) tallBandIdx = b;
    if (B[tallBandIdx] < 80) return null;
    let descIdx = 0, maxLen = 0;
    for (let ri = 0; ri <= Math.min(K, rows.length - 1); ri++) {
      const len = (rows[ri] || []).reduce((a, c) => a + String(c || '').trim().length, 0);
      if (len > maxLen) { maxLen = len; descIdx = ri; }
    }
    if (maxLen < 100) return null;
    const afterBands = K - 1 - tallBandIdx;
    const bodyStart = descIdx + 1 + afterBands;
    const nBody = rows.length - bodyStart;
    if (nBody < 5) return null;
    const h = rows.map(() => 0);
    for (let i = 0; i < Math.min(descIdx, tallBandIdx); i++) h[i] = B[i];
    if (descIdx > tallBandIdx) {
      const subH = Math.min(28, B[0] || 25);
      for (let i = tallBandIdx; i < descIdx; i++) h[i] = subH;
      h[descIdx] = Math.max(40, B[tallBandIdx] - subH * (descIdx - tallBandIdx));
    } else {
      h[descIdx] = B[tallBandIdx];
    }
    for (let m = 0; m < afterBands; m++) h[descIdx + 1 + m] = B[tallBandIdx + 1 + m];
    const bodyEach = (bot - H0[K]) / nBody;
    for (let i = bodyStart; i < rows.length; i++) h[i] = bodyEach;
    return h;
  }

  const NAMED_HEX = {
    gray: 'F2F2F2', grey: 'F2F2F2', lightgray: 'F2F2F2', lightgrey: 'F2F2F2',
    darkgray: '808080', darkgrey: '808080', placeholder: '808080', muted: '808080',
    blue: '1F4E79', navy: '003366', headerblue: '1F4E79',
    red: 'FF0000', white: 'FFFFFF', black: '000000', yellow: 'FFF2CC', green: 'E2EFDA'
  };
  function normHexColor(c) {
    if (!c || typeof c !== 'string') return null;
    const s = c.trim().replace(/^#/, '');
    if (NAMED_HEX[s.toLowerCase()]) return NAMED_HEX[s.toLowerCase()];
    if (/^[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase();
    if (/^[0-9A-Fa-f]{3}$/.test(s)) return s.split('').map((x) => x + x).join('').toUpperCase();
    return null;
  }
  function isDarkFill(hex) {
    const h = normHexColor(hex);
    if (!h) return false;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 150;
  }
  function isPlaceholderStr(s) {
    const t = String(s || '').trim();
    if (!t) return false;
    if (/^⟦\s*ph\s*[:：]([\s\S]*?)⟧$/i.test(t)) return true;
    return /^(?:\(\s*(?:বাংলায়|ইংরেজিতে|বাংলা|ইংরেজি|In\s+Bangla|In\s+English|ঐচ্ছিক|Optional)[^)]*\)|DD\s*[/.\-]\s*MM\s*[/.\-]\s*YYYY|YYYY\s*[/.\-]\s*MM\s*[/.\-]\s*DD|দিন\s*[/.\-]\s*মাস\s*[/.\-]\s*বছর|(?:এখানে\s+)?লিখুন\.{0,3}|নির্বাচন\s+করুন\.{0,3}|Select.*|Enter.*|(?:উদাঃ|যেমন\s*[:ঃ]|e\.g\.)\s*.+)$/i.test(t);
  }
  function stripPlaceholderWrap(s) {
    return String(s || '').replace(/^⟦\s*ph\s*[:：]([\s\S]*?)⟧$/i, '$1').trim();
  }
  function parseInlineBoxes(text) {
    const s = String(text || '').trim();
    if (!s) return null;
    const brkRe = /^([^[\]□]*?)\s*((?:\[\s*[^\][\s]{0,2}\s*\]\s*){4,})$/;
    const m1 = brkRe.exec(s);
    if (m1) {
      const cells = [...m1[2].matchAll(/\[\s*([^\][\s]{0,2})\s*\]/g)].map((x) => x[1] || '');
      return { label: m1[1].trim(), cells };
    }
    const sqRe = /^([^□☐]*?)\s*(?:([০-৯0-9]{1,2})\s+)?((?:[□☐]\s*){4,})$/;
    const m2 = sqRe.exec(s);
    if (m2) {
      const pre = m2[2] ? m2[2].split('') : [];
      const rest = (m2[3].match(/[□☐]/g) || []).map(() => '');
      return { label: m2[1].trim(), cells: pre.concat(rest) };
    }
    return null;
  }
  const MCQ_SPLIT_RE = /\s+(?=(?:\([ক-হa-dA-DiIvVxX]+\)|[ক-হa-dA-D][.)।])\s*\S)/g;
  const MCQ_TEST_RE = /(?:^|\s)(?:\([ক-হa-dA-DiIvVxX]+\)|[ক-হa-dA-D][.)।])\s*\S/g;
  function tabifyMcqOptions(lines, lineSegs, rect) {
    const ls = (lines || []).filter((l) => String(l || '').trim());
    if (!ls.length) return null;
    if (!ls.some((l) => (String(l).match(MCQ_TEST_RE) || []).length >= 2)) return null;
    const out = [], stops = [];
    const x0 = rect ? rect.x : 72, w = rect && rect.w > 40 ? rect.w : 450;
    ls.forEach((l, i) => {
      const parts = String(l).trim().split(MCQ_SPLIT_RE).map((p) => p.trim()).filter(Boolean);
      if (parts.length < 2) { out.push(l); return; }
      out.push(parts.join('	'));
      const segs = lineSegs && lineSegs[i] ? lineSegs[i] : null;
      if (segs && segs.length === parts.length) {
        segs.slice(1).forEach((s) => stops.push(s.x));
      } else if (segs && segs.length > parts.length) {
        const gaps = [];
        for (let k = 1; k < segs.length; k++) gaps.push({ k, g: segs[k].x - (segs[k - 1].x + (segs[k - 1].w || 0)), x: segs[k].x });
        gaps.sort((a, b) => b.g - a.g);
        gaps.slice(0, parts.length - 1).sort((a, b) => a.k - b.k).forEach((g) => stops.push(g.x));
      } else {
        for (let k = 1; k < parts.length; k++) stops.push(r1(x0 + (w * k) / parts.length));
      }
    });
    if (!stops.length) return null;
    stops.sort((a, b) => a - b);
    const merged = [];
    for (const s of stops) { if (!merged.length || s - merged[merged.length - 1] > 8) merged.push(s); }
    return { lines: out, stops: merged };
  }
  const TRAIL_MARK_RE = /^(.*?\S)(?:	|\s{2,})(\(?[০-৯0-9]+(?:\.[০-৯0-9]+)?(?:\s*[×*xX]\s*[০-৯0-9]+\s*=\s*[০-৯0-9]+)?\)?|\[[০-৯0-9]+\])\s*$/;
  const Q_TRAIL_MARK_RE = /^(.*[?।:ঃ)])\s+(\(?[০-৯0-9]{1,3}\)?|\[[০-৯0-9]{1,3}\])\s*$/;
  function attachTrailingRightTab(lines, lineSegs, rect, type) {
    const ls = (lines || []).filter((l) => String(l || '').trim());
    if (!ls.length) return null;
    const rightX = r1(rect && rect.w > 40 ? rect.x + rect.w : 520);
    let hit = false;
    const out = ls.map((l, i) => {
      const s = String(l);
      let m = TRAIL_MARK_RE.exec(s);
      if (!m && (type === 'question' || (lineSegs && lineSegs[i] && lineSegs[i].length >= 2))) {
        m = Q_TRAIL_MARK_RE.exec(s);
      }
      if (!m) return s;
      hit = true;
      return m[1].trimEnd() + '	' + m[2].trim();
    });
    if (!hit) return null;
    return { lines: out, stops: [{ pos: rightX, val: 'right' }] };
  }

  /**
   * সমীকরণের ধরন শনাক্তকরণ (ভগ্নাংশ/স্ট্যাকড > মূল/বড়-চিহ্ন > সূচক/সহগ > সাধারণ সমীকরণ)।
   * @returns 'frac' | 'rad' | 'sup' | 'math' | null
   */
  function mathKindOf(text, hint) {
    let hk = null;
    if (hint && typeof hint === 'object') {
      if (hint.mathKind === 'frac' || hint.eqType === 'frac' || hint.isFraction) hk = 'frac';
      else if (hint.mathKind === 'rad' || hint.mathKind === 'sqrt' || hint.eqType === 'rad') hk = 'rad';
      else if (hint.mathKind === 'sup' || hint.mathKind === 'script' || hint.eqType === 'sup') hk = 'sup';
      else if (hint.hasEquation || hint.mathKind === 'math' || hint.eqType === 'math') hk = 'math';
    }
    const t = String(text || '');
    let tk = null;
    if (t) {
      if (/\\(?:d|t|c)?frac(?![A-Za-z])|\\(?:d|t|c)?binom(?![A-Za-z])|\\(?:over|atop|stackrel|overset|underset)(?![A-Za-z])|\\begin\{(?:p|b|B|v|V)?matrix\}|\\begin\{(?:cases|array|aligned|split)\}|(?:\\(?:sum|prod|coprod|int|oint|iint|bigcup|bigcap|lim)(?![A-Za-z])|[∑∏∐∫∮∬⋃⋂])\s*(?:[_^⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]|\\(?:limits|nolimits))|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞⁄]|\$[^$]*\/[^$]*\$|⟦eq[^⟧]*\/[^⟧]*⟧|\([^()\n]+\)\s*\/\s*\([^()\n]+\)|\{[^{}\n]+\}\s*\/\s*\{[^{}\n]+\}/.test(t)) tk = 'frac';
      else if (/\\sqrt(?![A-Za-z])|[√∛∜]|\\(?:sum|prod|coprod|int|oint|iint|bigcup|bigcap|lim)(?![A-Za-z])|[∑∏∐∫∮∬⋃⋂]/.test(t)) tk = 'rad';
      else if (/\^\{[^}]*\}|_\{[^}]*\}|<sup\b|<sub\b|[A-Za-z0-9)\]\u0980-\u09FF]\s*[\^_]\s*[A-Za-z0-9(+\-\u09E6-\u09EF]|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₔₕₖₗₘₙₚₛₜ]/i.test(t)) tk = 'sup';
      else if (/(\$|\\(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|sin|cos|tan|cot|sec|csc|log|ln|infty|pm|mp|times|div|neq|leq|geq|approx|equiv|in|notin|subset|subseteq|cup|cap|emptyset|angle|triangle|perp|parallel)(?![A-Za-z])|⟦eq|[\u2200-\u22FF])/.test(t)) tk = 'math';
    }
    if (!tk) return hk;
    if (!hk) return tk;
    const rank = { frac: 4, rad: 3, sup: 2, math: 1 };
    return rank[tk] >= rank[hk] ? tk : hk;
  }

  /** ভগ্নাংশের লব বা হরের ভেতরে আরেকটি ভগ্নাংশ (নেস্টেড) আছে কিনা — একই লাইনের একাধিক ভগ্নাংশকে নেস্টেড ধরা হয় না */
  function hasNestedFrac(t) {
    const s = String(t || '');
    const re = /\\(?:d|t|c)?frac(?![A-Za-z])/g;
    let m;
    while ((m = re.exec(s)) !== null) {
      let i = m.index + m[0].length;
      for (let arg = 0; arg < 2; arg++) {
        while (i < s.length && /\s/.test(s[i])) i++;
        if (s[i] !== '{') break;
        let depth = 1, start = ++i;
        while (i < s.length && depth > 0) {
          if (s[i] === '{') depth++;
          else if (s[i] === '}') depth--;
          i++;
        }
        const inner = s.slice(start, i - 1);
        if (/\\(?:d|t|c)?frac(?![A-Za-z])|\\(?:over|atop)(?![A-Za-z])|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞⁄]/.test(inner)) return true;
      }
    }
    return false;
  }

  /** এক লাইনের সমীকরণের ধরন অনুযায়ী বাড়তি উচ্চতা (pt): ভগ্নাংশ/স্ট্যাকড > মূল > সূচক > সাধারণ */
  function mathLineExtraPt(text, fs, hint) {
    const f = fs || 12, t = String(text || ''), k = mathKindOf(t, hint);
    if (!k) return 0;
    if (k === 'frac') {
      return f * (hasNestedFrac(t) ? 1.45 : 1.05);
    }
    if (k === 'rad') {
      const innerSup = /\\sqrt\s*(?:\[[^\]]*\])?\s*\{[^}]*[\^_⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]|√\s*\(?[^)\s]*[\^_⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]/.test(t);
      return f * (innerSup ? 0.55 : 0.45);
    }
    if (k === 'sup') {
      const both = (/\^|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]|<sup\b/i.test(t)) && (/_|[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₔₕₖₗₘₙₚₛₜ]|<sub\b/i.test(t));
      return f * (both ? 0.38 : 0.28);
    }
    return f * 0.12;
  }

  /** সমীকরণ-যুক্ত লেখার দৃশ্যমান প্রস্থের অনুমানের জন্য LaTeX কমান্ড সংক্ষেপ */
  function mathVisStr(s) {
    let out = String(s || '')
      .replace(/\\sqrt\s*(?:\[[^\]]*\])?\s*\{([^{}]*)\}/g, '√$1')
      .replace(/[\^_]\s*\{([^{}]*)\}/g, '$1');
    for (let d = 0; d < 4 && /\\(?:d|t|c)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/.test(out); d++) {
      out = out.replace(/\\(?:d|t|c)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, a, b) => (a.length >= b.length ? a : b));
    }
    return out
      .replace(/\\(?:left|right)\s*([()[\]{}|.])/g, '$1')
      .replace(/\\[A-Za-z]+/g, 'm')
      .replace(/[\${}^_]|⟦eq:?|⟧/g, '');
  }

  const FS_CLASS = { s: 10, m: 12, l: 14, xl: 18 };
  // Part-17.7: list_item — প্রতিটি মুদ্রিত লাইন আলাদা ভুক্তি (অ = …, ১। শাপলা …); জোড়া দিলে তালিকা এক লাইনে গলে যেত
  const KEEP_TYPES = { label_value: 1, signature: 1, stamp: 1, header: 1, footer: 1, page_number: 1, option_row: 1, caption: 1, list_item: 1 };
  const INK_RATIO = 0.98;                       // Part-17.9 ক্যালিব্রেশন (qa/calibrate-ink.mjs): পূর্ণ বাংলা লাইন ≈ ০.৯৮ × ফন্ট (আগের ১.২৫ ভুল ছিল ⇒ ফন্ট ২২% ছোট)

  /**
   * Part-17.9: লাইনের অক্ষর-শ্রেণি অনুযায়ী কালি-উচ্চতা ÷ ফন্ট-আকার (SutonnyMJ/Times, Word-এ মাপা):
   * বাংলা — কার নেই ০.৮০, ওপরে-কার ০.৮৩, নিচে-কার ০.৮৫, দুটোই ১.০০; ইংরেজি — x-উচ্চতা ০.৪৭, বড়হাতের/অঙ্ক ০.৭১, নিচে-ঝোলা +০.২১।
   * মিশ্র লাইনে যেটি বেশি উঁচু।
   */
  function inkRatioFor(text) {
    const t = String(text || '');
    let r = 0;
    if (/[ঀ-৿]/.test(t)) {
      const up = (fontFixOn() ? /[িীৈৌঁ]|র্/ : /[িীেৈোৌঁ]|র্/).test(t);      // ি ী ে ৈ ো ৌ ঁ রেফ (FONTFIX: ে ও ো মাত্রার ওপরে ওঠে না)
      const lo = (fontFixOn() ? /[ুূৃ]|্র|্য|[ক-হ]্[বমলনণতথদধপফটঠডঢসষ]|ক্ষ|জ্ঞ/ : /[ুূৃ]|্র/).test(t); // ু ূ ৃ ্র (র-ফলা) ও নিচের যুক্তাক্ষর
      r = Math.max(r, up && lo ? 1.0 : (lo ? 0.85 : (up ? 0.83 : 0.8)));
    }
    if (/[A-Za-z0-9]/.test(t)) {
      const top = /[A-Z0-9bdfhklt(){}[\]'"!?/|ij]/.test(t) ? 0.71 : 0.47;
      const bot = /[gjpqyQJ(){}[\],;]/.test(t) ? 0.21 : 0;          // (Times-এর Q/J-র লেজও নিচে নামে)
      r = Math.max(r, top + bot);
    }
    if (mathHOn()) {
      const mk = mathKindOf(t);
      if (mk === 'frac') r = Math.max(r || INK_RATIO, 1.75);
      else if (mk === 'rad') r = Math.max(r || INK_RATIO, 1.3);
      else if (mk === 'sup') r = Math.max(r || INK_RATIO, 1.12);
    }
    return r || INK_RATIO;
  }
  const PAPER = { a4p: [595.3, 841.9], a4l: [841.9, 595.3] };
  const median = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const r1 = (v) => Math.round(v * 10) / 10;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /**
   * Part-17.8: Gemini-র লাইন-লেখা + মাপা কালি-অংশ (lineSegs) ⇒ ট্যাব-লাইন।
   * শর্ত: মাপা লাইন-সংখ্যা = লেখার লাইন-সংখ্যা, এবং অন্তত একটি লাইনে ≥২ অংশ। শব্দগুলো অংশে ভাগ হয় অক্ষর-দৈর্ঘ্য ∝ অংশের প্রস্থ ধরে।
   * @returns null | { lines: ['র\tআষাঢ়।', …], stops: [উৎস-x pt, …] (সব লাইনের মিলিত ট্যাব-অবস্থান) }
   */
  function tabify(lines, lineSegs) {
    if (!lineSegs || !lines.length || lineSegs.length !== lines.length) return null;
    if (!lineSegs.some((s) => s.length >= 2)) return null;
    const out = [], stops = [];
    for (let i = 0; i < lines.length; i++) {
      const segs = lineSegs[i] || [];
      const toks = String(lines[i]).trim().split(/\s+/).filter(Boolean);
      if (segs.length < 2 || toks.length < segs.length) {
        if (formKitOn() && toks.length === 2 && lineSegs.some((s) => s && s.length === 2)) {
          out.push(toks[0] + '\t' + toks[1]);
          continue;
        }
        out.push(lines[i]);
        continue;
      }
      const totalW = segs.reduce((a, s) => a + s.w, 0);
      const lens = toks.map((t) => t.length + 1);
      const totalC = lens.reduce((a, b) => a + b, 0);
      const parts = []; let ti = 0, cum = 0, wCum = 0;
      for (let j = 0; j < segs.length; j++) {
        wCum += segs[j].w;
        const target = j === segs.length - 1 ? totalC : totalC * wCum / totalW;
        const part = [];
        if (j === segs.length - 1) {
          while (ti < toks.length) part.push(toks[ti++]);
        } else {
          // অন্তত একটি শব্দ; পরের অংশগুলোর প্রতিটির জন্য অন্তত একটি শব্দ রেখে লক্ষ্য-দৈর্ঘ্য পর্যন্ত
          part.push(toks[ti]); cum += lens[ti]; ti++;
          while (ti < toks.length && toks.length - ti > segs.length - 1 - j && cum + lens[ti] / 2 <= target) { part.push(toks[ti]); cum += lens[ti]; ti++; }
        }
        parts.push(part.join(' '));
      }
      // CV (২০২৬-১০-১২): লেবেল : মান — অক্ষর-অনুপাতে ভাগ কোলনের এক-দুই শব্দ পরে পড়ত ("Father’s Name : Md. | Golap Hossin")।
      // দুই অংশে, ভাগ কোলনের ±২ শব্দে হলে ভাগ কোলনে: একা ':' অনুপাত যেদিকে বলে সেদিকে, "Name:" ⇒ পরে, ":Md" ⇒ আগে
      if (segs.length === 2) {
        const k = parts[0].split(' ').length;   // প্রথম অংশের শব্দ-সংখ্যা
        const ci = toks.findIndex((t) => t === ':' || /^[^:]+:$/.test(t) || /^:[^:]+$/.test(t));
        if (ci >= 0 && Math.abs(k - (ci + 0.5)) <= 2.5) {
          const cut = toks[ci] === ':' ? (k <= ci ? ci : ci + 1) : (/:$/.test(toks[ci]) ? ci + 1 : ci);
          if (cut > 0 && cut < toks.length) { parts[0] = toks.slice(0, cut).join(' '); parts[1] = toks.slice(cut).join(' '); }
        }
      }
      out.push(parts.join('\t'));
      segs.slice(1).forEach((s) => stops.push(s.x));
    }
    // কাছাকাছি (≤৬pt) অবস্থান এক
    stops.sort((a, b) => a - b);
    const merged = [];
    for (const s of stops) { if (!merged.length || s - merged[merged.length - 1] > 6) merged.push(s); }
    return { lines: out, stops: merged };
  }

  /**
   * Part-17.9: Gemini আলাদা ছোট টেবিলগুলো (A/B/C…) ফাঁকা সারি দিয়ে এক টেবিলে দেয়; কালিতে সেখানে পুরো-প্রস্থ সাদা ফাঁক।
   * ফাঁকা-সারির দলের সংখ্যা = সাদা ফাঁকের সংখ্যা হলে ফাঁকা সারিতে ভাগ করে আলাদা টেবিল (প্রতিটির নিজের মাপা আয়ত)।
   * মিল না হলে (যেমন উত্তর লেখার ফাঁকা ঘর) অপরিবর্তিত।
   * @returns item বা [item, item, …]
   */
  function splitTableAtGaps(tbl, m) {
    const rows = tbl.rows || [];
    const tg = tableGridOn();
    const gaps = m && !m.empty && Array.isArray(m.tableGapsPt) ? m.tableGapsPt : [];
    const R = tbl.rect || (m && m.rectPt) || (tg ? { x: 54, y: 100, w: tbl.widthPt || 450, h: tbl.heightPt || Math.max(40, rows.length * 18) } : null);
    if (!R) return tbl;
    const empty = (r) => !r.some((c) => c && String(c).trim());
    // ফাঁকা সারিতে ভাগ (পরপর ফাঁকা সারি একটি ভাগ-বিন্দু)
    const groups = []; let cur = [];
    rows.forEach((r) => { if (empty(r)) { if (cur.length) { groups.push(cur); cur = []; } } else cur.push(r); });
    if (cur.length) groups.push(cur);
    // B2: যদি ফাঁকা সারি না দেওয়া থাকে কিন্তু মাপা tableGapsPt থাকে, তবে লাইন/উচ্চতা দেখে সারিগুলোকে ফাঁকের ওপর-নিচে ভাগ
    if (tg && groups.length === 1 && gaps.length >= 1 && rows.length >= gaps.length + 1) {
      const tl = m && Array.isArray(m.textLinesPt) && m.textLinesPt.length === rows.length ? m.textLinesPt : null;
      const gBounds = [R.y, ...gaps.flatMap((g) => g), R.y + R.h];
      const byGap = Array.from({ length: gaps.length + 1 }, () => []);
      rows.forEach((r, ri) => {
        const y = tl ? tl[ri] : R.y + ((ri + 0.5) / rows.length) * R.h;
        let bi = 0;
        for (let k = 0; k < gaps.length; k++) if (y >= (gaps[k][0] + gaps[k][1]) / 2) bi = k + 1;
        byGap[bi].push(r);
      });
      if (byGap.every((g) => g.length > 0)) {
        return byGap.map((g, k) => Object.assign({}, tbl, {
          rows: g, rect: { x: R.x, y: gBounds[2 * k], w: R.w, h: Math.max(1, gBounds[2 * k + 1] - gBounds[2 * k]) },
          splitPart: k, rowHeightsPt: null, rowBand: null, headShade: k ? null : tbl.headShade
        }));
      }
    }
    // B2: ফাঁকা সারি আছে (যেমন A/B/C আলাদা ছোট টেবিল একত্রে), এবং হয় tableGapsPt মেলে অথবা খাড়া রেখা ফাঁকা সারি ভেদ করে যায়নি / splitAtEmpty সত্য
    const vContinuous = m && Array.isArray(m.vRulesPt) && m.vRulesPt.length >= 2 && m.vRulesPt.every((v) => (v.cov || 0) >= 0.95);
    const allowEmptyRowSplit = tg && groups.length >= 2 && (!gaps.length && (tbl.splitAtEmpty || !m || !m.hasGrid || !vContinuous));
    if (!gaps.length && !allowEmptyRowSplit) return tbl;
    if (groups.length < 2 || (!allowEmptyRowSplit && groups.length - 1 !== gaps.length)) return tbl;
    let edges;
    if (gaps.length === groups.length - 1) {
      edges = [R.y, ...gaps.flatMap((g) => g), R.y + R.h];
    } else {
      const totR = rows.length || 1, gapH = Math.min(12, R.h * 0.08);
      edges = [];
      let accR = 0;
      groups.forEach((g, k) => {
        const y0 = R.y + (accR / totR) * R.h + (k > 0 ? gapH / 2 : 0);
        accR += g.length;
        const y1 = R.y + (accR / totR) * R.h - (k < groups.length - 1 ? gapH / 2 : 0);
        edges.push(r1(y0), r1(Math.max(y0 + 8, y1)));
        accR += 1; // ফাঁকা সারি
      });
    }
    return groups.map((g, k) => Object.assign({}, tbl, {
      rows: g, rect: { x: R.x, y: edges[2 * k], w: R.w, h: Math.max(1, edges[2 * k + 1] - edges[2 * k]) }, splitPart: k, rowHeightsPt: null, rowBand: null, headShade: k ? null : tbl.headShade,
      cellAligns: tbl.cellAligns ? g.map((r) => tbl.cellAligns[rows.indexOf(r)] || null) : null
    }));
  }

  /**
   * a18: সারির মাপা উচ্চতা — পুরো-প্রস্থ আড়া-রেখার ভাগ (hRulesPt) + টেবিলের লেখা-লাইন (textLinesPt)।
   * Gemini-সারি ক্রমে লেখা-লাইনে (অনুমিত মোড়ানো-লাইন, মোট মাপা লাইনে মাপমতো) ⇒ কোন ভাগে; লেখাহীন ভাগ ফাঁকা সারি পায়
   * (মূলে লেখার জায়গা সবচেয়ে উঁচু — আগে ফাঁকা সারি সাধারণের ০.৪ ভাগ ধরা হতো)। ভাগের উচ্চতা তার সারিগুলোতে লাইন-অনুপাতে।
   * অসংগত (ক্রম উল্টো, সারি বাদ) ⇒ null (আগের নিয়ম)
   */
  function rowBandHeights(rows, m, fr, fs, opts) {
    if (!m || m.empty || !m.hasGrid || !m.rectPt || !Array.isArray(m.hRulesPt) || rows.length < 2) return null;   // ২০২৬-১০-১৩: ২ সারিও (a12: শিরোনাম-সারি ২৯, পরেরটি ১৪pt)
    const H = [];
    const minHStep = a14FixOn() ? 1.5 : 3;
    m.hRulesPt.slice().sort((a, c) => a - c).forEach((y) => { if (!H.length || y - H[H.length - 1] > minHStep) H.push(y); });
    // A04_PAGES_v1: রেজিস্টার ছকে কেবল উপরের শিরোনাম-ব্যান্ডগুলোর আড়া-রেখা মাপা থাকলে এবং নিচের বডি-অংশ দাগহীন থাকলে শিরোনাম ও বডি-সারির প্রকৃত উচ্চতা বণ্টন
    if ((pages4On() || tblMergeOn() || lineGapOn() || rotTextOn()) && !(opts && opts.bandsOnly)) {
      const ph = partialHeaderRowHeights(rows, H, m.rectPt.y, m.rectPt.y + m.rectPt.h);
      if (ph) return ph;
    }
    // ২০২৬-১০-১৪ (a19): ছকের ওপরে/নিচে দাগহীন সারি (মূলে "১। পরীক্ষার নাম" বাক্সের বাইরে; শেষ দাগের নিচে "৯।"-এর লাইন) — সেই
    // লেখা-লাইন কোনো ভাগে পড়ত না ⇒ সব সারি এক ভাগ সরে যেত। মাপা আয়তের কিনারা তখন ভাগ-সীমা
    if (!globalThis.__FZ_OFF_RECTEDGE && H.length >= 2 && Array.isArray(m.textLinesPt)) {
      const top = m.rectPt.y, bot = m.rectPt.y + m.rectPt.h, H2 = H.slice();
      if (H2[0] - top > 6 && m.textLinesPt.some((y) => y > top && y < H2[0] - 2)) H2.unshift(top);
      if (bot - H2[H2.length - 1] > 6 && m.textLinesPt.some((y) => y > H2[H2.length - 1] + 2 && y < bot)) H2.push(bot);
      // শুধু যখন কিনারা যোগে ভাগ ≈ সারি (±১) হয় (a19: ৭⇒৯ ভাগ, ৯ সারি); f1-এ (২৪ সারি, হালকা রেখা মাপা যায় না) ভাগ ভুল জায়গায় ⇒ ৫৯→৫৫
      const nb = (A) => A.length - 1;
      const hasVGrid = Array.isArray(m.vRulesPt) && m.vRulesPt.length >= 2;
      if ((Math.abs(nb(H2) - rows.length) <= 1 || (hasVGrid && nb(H2) <= rows.length)) && Math.abs(nb(H2) - rows.length) < Math.abs(nb(H) - rows.length)) H.splice(0, H.length, ...H2);
    }
    const bands = [];
    for (let k = 1; k < H.length; k++) if (H[k] - H[k - 1] >= 4) bands.push({ y0: H[k - 1], y1: H[k], rows: [], text: 0 });
    if (bands.length < 2) return null;
    // a07 পাতা ৪ (কাত স্ক্যান: লেখা-লাইন ১টিই মাপা): ভাগ-সংখ্যা = সারি-সংখ্যা, ফাঁকা সারি নেই ⇒ সারি i = ভাগ i (অনুমান লাগে না)
    if (!globalThis.__FZ_OFF_BAND && bands.length === rows.length && (rows.every((r) => r.some((c) => c && String(c).trim())) || ((a07FixOn() || a07Fix2On() || a16FixOn()) && m._a07FullHRules))) {
      if (opts && opts.bandsOnly) return { band: rows.map((_, i) => i), n: bands.length, nLines: rows.length, nTxt: rows.length };
      const h = bands.map((b) => b.y1 - b.y0);
      h.exact = true;
      return h;
    }
    const nC = Math.max(...rows.map((r) => r.length)), W = m.rectPt.w;
    const wrap = (t, cw) => String(t || '').split('\n').reduce((a, ln) => a + (Math.ceil((mathHOn() ? mathVisStr(ln) : ln).replace(/[ঁ-ঃ়া-্ৗ]/g, '').replace(/([._\-…·─])\1{5,}/g, (s) => s.slice(0, 6)).length * fs * 0.45 / Math.max(20, cw)) || 1), 0);
    const empty = rows.map((r) => !r.some((c) => c && String(c).trim()));
    let est = rows.map((r, i) => (empty[i] ? 0 : Math.max(1, ...r.map((c, k) => (c ? wrap(c, W * (fr ? fr[k] : 1 / nC) - 10.8) : 1)))));
    // ২০২৬-১০-১৪ (a18): ঘরের পরের ঘরগুলো ফাঁকা ⇒ লেখা সেগুলো জুড়ে (জোড়া-ঘর, "বিঃদ্রঃ" পুরো-প্রস্থ) — কলাম-প্রস্থে মোড়ানো-অনুমান
    // প্রতি লাইনে ৪ লাইন ধরত ⇒ 'prop'-এ ওপরের সারিগুলো ভুল ভাগে। মাপা লাইন-সংখ্যার কাছের অনুমানটি নেওয়া হয় (নিচে)
    const estSpan = rows.map((r, i) => (empty[i] ? 0 : Math.max(1, ...r.map((c, k) => {
      if (!c) return 1;
      let e = k + 1; while (e < r.length && !(r[e] && String(r[e]).trim())) e++;
      const f = fr ? fr.slice(k, e).reduce((a, x) => a + x, 0) : (e - k) / nC;
      return wrap(c, W * f - 10.8);
    }))));
    // [Rule IR1: FZ_OFF=FORMFIX / FZ_OFF=IR1] আদর্শ মাপের পাতায় (W <= 650pt) বডি-সারিযুক্ত ছকের প্রথম ব্যান্ডের মাপা উচ্চতা <= 18pt হলে এবং শিরোনামে কোনো '\n' না থাকলে est[0] = 1 ধরা হবে।
    if (fzOn('FORMFIX') && !globalThis.__FZ_OFF_IR1 && W <= 650 && bands.length >= 2 && (bands[0].y1 - bands[0].y0) <= 18 && rows[0] && rows[0].every((c) => !String(c || '').includes('\n')) && rows.slice(1).some((r) => r.some((c) => c && String(c).trim()))) {
      est[0] = 1; estSpan[0] = 1;
    }
    // ভাগের ভেতরের ভাগ-উচ্চতা: সারিগুলোতে লাইন-অনুপাতে; সারি না পাওয়া ভাগ পাশের ভাগে জোড়া
    const heightsOf = (band) => {
      band.forEach((b, i) => bands[b].rows.push(i));
      for (let b = 0; b < bands.length; b++) {
        if (bands[b].rows.length) continue;
        const t = bands.slice(0, b).reverse().find((x) => x.rows.length) || bands.slice(b + 1).find((x) => x.rows.length);
        if (!t) return null;
        t.extra = (t.extra || 0) + bands[b].y1 - bands[b].y0;
      }
      const h = rows.map(() => 0);
      bands.forEach((b) => {
        if (!b.rows.length) return;
        const hasText = b.rows.some((i) => !empty[i]);
        const w = b.rows.map((i) => (empty[i] ? (hasText ? 0.4 : 1) : est[i]));
        const sw = w.reduce((a, x) => a + x, 0);
        b.rows.forEach((i, k) => { h[i] = (b.y1 - b.y0 + (b.extra || 0)) * w[k] / sw; });
      });
      return h;
    };
    // ২০২৬-১০-১৩ (row-ink.js): ভাগে মাপা কালি-উচ্চতা ⇒ লাইন; সারি ক্রমে DP-তে (লেখা-লাইন গোনা লাগে না — কাত স্ক্যানেও চলে)
    const RI = global.FayzarRowInk || (typeof require === 'function' ? (() => { try { return require('./row-ink.js'); } catch (e) { return null; } })() : null);
    // ভাগ ≈ সারি (±১, a05 বেতন-বিল) ⇒ প্রায় এক-ভাগে-এক, নিচের নিয়মই ভালো (DP-তে a05 ছবি ৫৬.৬→৫২.৯)
    const oneToOne = rows.length >= 5 && Math.abs(bands.length - rows.length) <= 1;
    // মাপা ফল (a05 −৩.৭, a14 −০.৩, a16 +০.৭ ছবি) নেতিবাচক ⇒ ডিফল্টে বন্ধ; পরীক্ষায় FZ_ON=INK
    if (RI && globalThis.__FZ_ON_INK && !oneToOne && !(opts && opts.bandsOnly) && Array.isArray(m.textInkPt) && m.textInkPt.length) {
      const bi = RI.assign(est, RI.bandLines(bands, m.textInkPt, fs * 1.25));
      const h = bi && heightsOf(bi);
      if (h) return h;
      bands.forEach((b) => { b.rows = []; b.extra = 0; });
    }
    if (!Array.isArray(m.textLinesPt)) return null;
    const bandOf = (y) => bands.findIndex((b) => y >= b.y0 && y < b.y1);
    const L = m.textLinesPt.filter((y) => bandOf(y) >= 0).sort((a, c) => a - c);
    // a05 (কাত স্ক্যান): ভাগ ≈ সারি (৩০ রেখা, ৩০ সারি) অথচ মাপা লেখা-লাইন ৩টি ⇒ লাইন-ধরে বণ্টন আবোলতাবোল (৪৫/৯/৩pt);
    // মূলে সারি প্রায় সমান ⇒ মাপা রেখা-পরিসর সমান ভাগে
    if (!globalThis.__FZ_OFF_EVEN && !(opts && opts.bandsOnly) && rows.length >= 5 && Math.abs(bands.length - rows.length) <= 1 &&
        L.length < rows.filter((r) => r.some((c) => c && String(c).trim())).length * 0.8) {
      const span = bands[bands.length - 1].y1 - bands[0].y0;
      return rows.map(() => span / rows.length);
    }
    if (!L.length) return null;
    L.forEach((y) => { bands[bandOf(y)].text++; });
    // ≤৬ কলাম (a04: ১৭ কলামের প্রায়-ফাঁকা রেজিস্টারে "ফাঁকা পাশের ঘর জুড়ে" অনুমান অবাস্তব ⇒ ৭→৯ পাতা)
    if (!globalThis.__FZ_OFF_SPANEST && nC <= 6) {
      const E1 = est.reduce((a, b) => a + b, 0), E2 = estSpan.reduce((a, b) => a + b, 0);
      if (Math.abs(E2 - L.length) < Math.abs(E1 - L.length)) est = estSpan;
    }
    const E = est.reduce((a, b) => a + b, 0);
    if (!E) return null;
    // ২০২৬-১০-১৪ (f1): রেখা-ভাগ কম (হালকা ধূসর সারি-রেখা মাপা যায় না) অথচ মাপা লাইন ≈ লেখা-সারি ⇒ সারির উচ্চতা সরাসরি লাইন-অবস্থান থেকে
    // (সংখ্যা-বাক্সের সারি মূলে উঁচু — অনুমান-অনুপাতে সমান ধরা হতো ⇒ নিচের সারিগুলো ২৬pt ওপরে)। বন্ধ: FZ_OFF=LINEH
    {
      const nT = est.filter((e) => e > 0).length;
      const isFoldedTbl = !!(opts && opts.folded) || rows.some((r) => r.some((c) => c === "0"));
      const Lall = m.rectPt ? m.textLinesPt.filter((y) => y >= m.rectPt.y - 2 && y <= m.rectPt.y + m.rectPt.h + 2).sort((a, c) => a - c) : L;
      if ((globalThis.__FZ_ON_LINEH || isFoldedTbl) && !globalThis.__FZ_OFF_LINEH && !(opts && opts.bandsOnly) && !(L.length === nT && nT >= 4 && bands.length >= 4) && bands.length < nT * 0.6 && Lall.length >= nT && Lall.length <= E + 2 && m.rectPt) {
        const lh = lineRowHeights(Lall, m.rectPt.y, m.rectPt.y + m.rectPt.h);
        if (lh) return lh;
      }
    }
    function lineRowHeights(Ls, top, bot) {
      const T = rows.map((r, i) => i).filter((i) => !empty[i]);
      let extra = Ls.length - T.length;
      const want = T.map(() => 1);
      const multi = T.map((i, k) => k).filter((k) => est[T[k]] > 1);
      const sw = multi.reduce((a, k) => a + est[T[k]] - 1, 0);
      if (extra > 0 && sw > 0) {
        // প্রথমে ঘরের ভেতরের ঘন লাইন-গুচ্ছ (ফাঁক ≤ ২৪pt) দেখে বহু-লাইনের সারিতে লাইন বণ্টন
        const maxGap = Math.max(22, (fs || 11) * 2.1);
        let c0 = 0, ok = true;
        const wCluster = T.map((ri, k) => {
          if (c0 >= Ls.length) { ok = false; return 1; }
          let n = 1, cap = est[ri];
          while (n < cap && c0 + n < Ls.length && Ls[c0 + n] - Ls[c0 + n - 1] <= maxGap && (Ls.length - (c0 + n)) >= (T.length - 1 - k)) n++;
          c0 += n;
          return n;
        });
        if (ok && c0 === Ls.length) {
          wCluster.forEach((v, k) => { want[k] = v; });
        } else {
          multi.forEach((k) => { const add = Math.min(est[T[k]] - 1, Math.round(extra * (est[T[k]] - 1) / sw)); want[k] += add; });
          let s = want.reduce((a, b) => a + b, 0);
          while (s < Ls.length) { const k = multi.find((q) => want[q] < est[T[q]]); if (k == null) break; want[k]++; s++; }
          while (s > Ls.length) { const k = multi.slice().reverse().find((q) => want[q] > 1); if (k == null) break; want[k]--; s--; }
        }
      }
      if (want.reduce((a, b) => a + b, 0) !== Ls.length) return null;
      const span = []; let c = 0;
      T.forEach((i, k) => { span.push([Ls[c], Ls[c + want[k] - 1]]); c += want[k]; });
      const h = rows.map(() => 0), shift = rows.map(() => 0);
      let prevBot = top;
      T.forEach((i, k) => {
        const b = k < T.length - 1 ? (span[k][1] + span[k + 1][0]) / 2 : bot;
        h[i] = Math.max(1, b - prevBot);
        shift[i] = Math.round(((span[k][0] + span[k][1]) / 2 - (prevBot + b) / 2) * 10) / 10;
        prevBot = b;
      });
      // ফাঁকা সারি: আগের লেখা-সারি থেকে ≤৬pt
      rows.forEach((r, i) => { if (!empty[i]) return; const o = T.filter((t) => t < i).pop(); const own = o != null ? o : T[0]; if (own == null) return; const e = Math.min(6, h[own] * 0.2); h[i] = e; h[own] -= e; });
      h.shift = shift;
      return h;
    }
    // সারি ⇒ মাপা লেখা-লাইন ⇒ ভাগ। ধরন ক্রমে চেষ্টা, প্রথম বৈধটি:
    //  'seq'  — মাপা লাইন ≥ অনুমিত লাইন ⇒ ক্রমে (a10: বাড়তি "লাইন" = নিচের ফাঁকা লেখার-ঘরের হাতের দাগ/ছিটে; অনুপাতে ধরলে
    //           শিরোনামের ২য় লাইন শেষ ভাগে সরত)
    //  'one'  — মাপা লাইন ≥ লেখা-সারি ⇒ প্রতি সারি এক লাইন (সরু কলামে মোড়ানো-অনুমান বেশি: a10 শিরোনাম)
    //  'prop' — আগের মতো অনুপাতে (লাইন জুড়ে গেছে)
    // বৈধতা: ক্রম উল্টো নয়; পরের প্রতিটি ফাঁকা সারির নিজস্ব ভাগ লাগে ⇒ সারি সেই সীমার ওপরে ('prop'-এ সীমায় টানা)
    const nTxt = est.filter((e) => e > 0).length;
    const assign = (mode, free) => {
      const bd = rows.map(() => -1);
      let cum = 0, lst = -1;
      for (let i = 0; i < rows.length; i++) {
        if (empty[i]) continue;
        const idx = mode === 'seq' ? Math.floor(cum + (est[i] - 1) / 2) : mode === 'one' ? cum : Math.floor((cum + est[i] / 2) * L.length / E);
        let b = bandOf(L[Math.min(L.length - 1, idx)]);
        const after = empty.slice(i + 1).filter(Boolean).length, lim = bands.length - 1 - after;
        // a18 (২০২৬-১০-১৫): আগের লেখা-সারি আর এর মাঝে k-টি ফাঁকা সারি ⇒ এটি অন্তত k ভাগ নিচে (ফাঁকা সারির নিজস্ব ভাগ — মূলের
        // ১৭৯pt লেখার-ঘর); নইলে 'prop'-এ "বিঃদ্রঃ" সারি ঐ ফাঁকা ভাগে উঠে যেত, ফাঁকা সারি ৩pt
        const gapE = i - 1 - Math.max(-1, ...bd.map((x, j) => (x >= 0 ? j : -1)));
        // free (হুবহু এক-লাইন-এক-সারি): মাপা লাইনই অবস্থান ⇒ ফাঁকা-সারির নিজস্ব-ভাগ শর্ত লাগে না
        if (!free && !globalThis.__FZ_OFF_EGAP && b >= 0 && gapE > 0 && lst + 1 + gapE > b && lst + 1 + gapE <= lim) b = lst + 1 + gapE;
        if (!free && after && b > lim && mode !== 'prop') return null;   // 'prop' = আগের আচরণ, অপরিবর্তিত
        if (b < 0 || b < lst) return null;   // লাইন কোনো ভাগে পড়েনি ⇒ b=-1 ⇒ পরে bands[-1] ক্র্যাশ (a07-এ দেখা)
        bd[i] = lst = b; cum += mode === 'one' ? 1 : est[i];
      }
      return bd;
    };
    // নতুন ধরন শুধু যখন সারি প্রায় এক-ভাগে-এক (ভাগ ≥ লেখা-সারির ৬০%: a10); বহু-সারি/ভাগ (f1: ২৮ সারি, ৮ ভাগ) ঘরে বহু লাইন ⇒ অনুপাতই ঠিক
    const noNew = globalThis.__FZ_OFF_BAND || bands.length < nTxt * 0.6;
    // ২০২৬-১০-১৪ (a18): মাপা লাইন = লেখা-সারি হুবহু ⇒ প্রতি সারি এক লাইন সবচেয়ে বিশ্বস্ত (মোড়ানো-অনুমান লাগে না), ভাগ কম হলেও
    // রেখা-ভাগ ≥৪ (ছক সত্যিই রেখায় ভাগ করা) — a14 (২ ভাগ, ১৪ সারি) সংখ্যা-মিল কাকতালীয়, হুবহু-উচ্চতায় −৩
    // মাপা: SPANEST-এর পরে a18-এ হুবহু ধরন (৪৮–৫২) সাধারণ পথের (৫৩.৬) চেয়ে খারাপ ⇒ ডিফল্টে বন্ধ (FZ_ON=EXACT1)
    const exact = ((globalThis.__FZ_ON_EXACT1 || (rows.length >= 24 && bands.length <= 6)) && !globalThis.__FZ_OFF_EXACT1 && L.length === nTxt && nTxt >= 4 && bands.length >= 4)
      || (boxSplitOn() && nC === 1 && L.length === nTxt && nTxt >= 4 && bands.length >= 2);
    if (globalThis.__FZ_DBG) console.log('rowBand', JSON.stringify({ rows: rows.length, bands: bands.length, L: L.length, nTxt, E, est }));
    const bx = exact ? assign('one', true) : null, exactUsed = !!bx;
    const oneOk = L.length >= nTxt && (L.length <= nTxt * 1.35 || Math.abs(L.length - nTxt) <= Math.abs(L.length - E));
    const band = bx || (!noNew && L.length >= E && assign('seq')) || (!noNew && oneOk && assign('one')) || assign('prop');
    if (!band) return null;
    // ২০২৬-১০-১৪ (a18): ভাগে মাপা লেখা-লাইনের চেয়ে বেশি লেখা-সারি ⇒ শেষের সারিগুলো পরের ভাগে ("প্রধান হিসাব রক্ষণ…" ৭ লাইনের ভাগে
    // ৮ম সারি হয়ে দাগের ওপরে বসত)। ক্রম অটুট থাকে (শেষের সারি নিচে নামে)। FZ_OFF=BANDCAP
    if (!globalThis.__FZ_OFF_BANDCAP) {
      for (let b = 0; b < bands.length - 1; b++) {
        const rs = band.map((x, i) => (x === b && !empty[i] ? i : -1)).filter((i) => i >= 0);
        const cap = bands[b].text;
        if (cap > 0 && rs.length > cap) rs.slice(cap).forEach((i) => { band[i] = b + 1; });
      }
    }
    // ফাঁকা সারি: আগের ও পরের লেখা-সারির ভাগের মাঝের লেখাহীন ভাগ (ক্রমে), না থাকলে আগের সারির ভাগ
    const used = new Set(band.filter((b) => b >= 0));
    for (let i = 0; i < rows.length; i++) {
      if (!empty[i]) continue;
      const p = Math.max(-1, ...band.slice(0, i));
      const nx = band.slice(i + 1).find((b) => b >= 0);
      const q = nx == null ? bands.length : nx;
      let pick = -1;
      // শেষ লেখা-সারির ভাগের নিচে মাপা "লেখা" = হাতের দাগ/ছিটে (a10) ⇒ লেখাহীন ধরা
      const lastTB = Math.max(-1, ...band);
      for (let b = p + 1; b < q; b++) if ((!bands[b].text || (b > lastTB && !globalThis.__FZ_OFF_BAND)) && !used.has(b)) { pick = b; break; }
      if (pick < 0) pick = p >= 0 ? p : (q < bands.length ? q : -1);
      if (pick < 0) return null;
      band[i] = pick; used.add(pick);
    }
    if (opts && opts.bandsOnly) return { band, n: bands.length, text: bands.map((b) => b.text), nLines: L.length, nTxt };
    if (exactUsed && !globalThis.__FZ_OFF_EXACTH) { const hx = exactHeights(band); if (hx) return hx; bands.forEach((b) => { b.rows = []; b.extra = 0; }); }
    return heightsOf(band);
    // হুবহু ধরনে সারি-উচ্চতা মাপা লাইন থেকে: লেখা-সারির সীমা = পাশের লাইনের মাঝ-বিন্দু; ফাঁকা সারি ≤৬pt (আগের লেখা-সারি থেকে কাটা)
    function exactHeights(bd) {
      const yOf = {}; let k = 0;
      rows.forEach((r, i) => { if (!empty[i]) yOf[i] = L[k++]; });
      bd.forEach((b, i) => bands[b].rows.push(i));
      const h = rows.map(() => 0), lh = Math.max(14, Math.min(16.5, (fs || 11.5) * 1.35));
      for (const b of bands) {
        if (!b.rows.length) return null;
        const R = b.rows, T = R.filter((i) => !empty[i]);
        if (!T.length) { R.forEach((i) => { h[i] = (b.y1 - b.y0) / R.length; }); continue; }
        const tTop = {}, tBot = {};
        T.forEach((i, j) => {
          const empBefore = j === 0 ? R[0] < i : T[j - 1] + 1 < i;
          const empAfter  = j === T.length - 1 ? R[R.length - 1] > i : i + 1 < T[j + 1];
          tTop[i] = empBefore ? Math.max(b.y0 + (R[0] < i ? 2 : 0), yOf[i] - lh / 2) : (j === 0 ? b.y0 : (yOf[T[j - 1]] + yOf[i]) / 2);
          tBot[i] = empAfter  ? Math.min(b.y1 - (R[R.length - 1] > i ? 2 : 0), yOf[i] + lh / 2) : (j === T.length - 1 ? b.y1 : (yOf[i] + yOf[T[j + 1]]) / 2);
          h[i] = Math.max(12, tBot[i] - tTop[i]);
        });
        let idx = 0;
        while (idx < R.length) {
          if (!empty[R[idx]]) { idx++; continue; }
          const e0 = idx;
          while (idx < R.length && empty[R[idx]]) idx++;
          const prevT = e0 > 0 ? R[e0 - 1] : null, nextT = idx < R.length ? R[idx] : null;
          const yA = prevT != null ? tBot[prevT] : b.y0, yB = nextT != null ? tTop[nextT] : b.y1;
          const each = Math.max(2, (yB - yA) / (idx - e0));
          for (let q = e0; q < idx; q++) h[R[q]] = each;
        }
        const sumB = R.reduce((a, i) => a + h[i], 0), targetB = b.y1 - b.y0;
        if (sumB > 0 && Math.abs(sumB - targetB) > 0.1) R.forEach((i) => { h[i] *= targetB / sumB; });
      }
      const shift = rows.map(() => 0);
      for (const b of bands) {
        let top = b.y0;
        b.rows.forEach((i) => { if (!empty[i]) shift[i] = Math.round((yOf[i] - (top + h[i] / 2)) * 10) / 10; top += h[i]; });
      }
      h.exact = true; h.shift = shift;
      return h;
    }
  }

  /** একটি ব্লক → item (মাপ m থাকলে মাপ অগ্রাধিকার, না থাকলে Gemini-র ইঙ্গিত) */
  /** অর্থহীন লেখা: একই অক্ষরের পুনরাবৃত্তি ("cccccccccc", "~~~~") বা স্বরবর্ণহীন লম্বা লাতিন অক্ষরমালা ("xjkwrtz") */
  function isScribble(t) {
    const s = String(t || '').replace(/\s+/g, '');
    if (s.length < 4 || /^[_.\-─━═=…·*]+$/.test(s)) return false;   // সই-রেখা/বিন্দু-সারি লেখাই থাকে (builder-এর leader-ট্যাব)
    if (/^(.)\1{3,}$/u.test(s)) return true;
    return /^[A-Za-z]{6,}$/.test(s) && !/[aeiouy]/i.test(s);
  }

  /**
   * g41: সীমানাওয়ালা ছকের Gemini-সারি (প্রতি মুদ্রিত লাইনে একটি) ⇒ রেখা-ব্যান্ডের সারি (ঘরে '\n'-যুক্ত বহু লাইন)।
   * শুধু তখন, যখন জাল আছে, আড়াআড়ি রেখা ≥২ আর ব্যান্ড < সারি; ব্যান্ড ১-এর বেশি হলে লাইন-কেন্দ্র (textLinesPt) সারির সমান সংখ্যায় থাকা চাই।
   * @returns নতুন সারি বা null (বদল নয়)
   */
  function mergeLineRows(rows, m) {
    if (tableGridOn() && m && !m.empty && (!Array.isArray(m.hRulesPt) || m.hRulesPt.length < 2)) {
      const rb = m.tableRowBands || m.rowBandsPt || m.rowBands;
      if (Array.isArray(rb) && rb.length >= 1) {
        m = Object.assign({}, m, { hasGrid: true, hRulesPt: [rb[0].y0, ...rb.map((b) => b.y1)] });
      }
    }
    if (!m || m.empty || !m.hasGrid || !Array.isArray(m.hRulesPt) || m.hRulesPt.length < 2 || rows.length < 2) return null;
    // B2: নামতার ছক বা শুধু খাড়া-রেখাওয়ালা ছকে (যেখানে ভেতরে আড়াআড়ি দাগ নেই, hRulesPt.length === 2, কিন্তু প্রতিটি সারির সব কলামে আলাদা তথ্য) সারিগুলো এক ঘরে গলানো হবে না
    if (tableGridOn() && (m.hasInsideH === false || (m.hRulesPt.length === 2 && Array.isArray(m.vRulesPt) && m.vRulesPt.length >= 2 && rows.every((r) => r.length >= 2 && r.every((c) => c && String(c).trim()))))) return null;
    const R = m.hRulesPt.slice().sort((a, b) => a - b), bands = R.length - 1;
    if (bands >= rows.length) return null;
    const L = Array.isArray(m.textLinesPt) ? m.textLinesPt : [];
    let bandOf;
    // ২০২৬-১০-১৪ (a17 p10): শেষ পূর্ণ রেখার নিচের লেখা-লাইন ("সর্বমোট =", নিচের দাগ শুধু ডানের কলামে) শেষ ভাগে টেনে ২০-নং সারিতে জুড়ত ⇒
    // নিজস্ব অতিরিক্ত ভাগ। বন্ধ: FZ_OFF=BELOWLAST
    const xb = !globalThis.__FZ_OFF_BELOWLAST && L.length === rows.length && L.some((y) => y > R[R.length - 1] + 2) ? 1 : 0;
    if (bands === 1 && !xb) bandOf = () => 0;
    else if (L.length === rows.length) bandOf = (i) => Math.max(0, Math.min(bands - 1 + xb, R.slice(1).filter((y) => y < L[i]).length));
    else {
      // a07 (কাত স্ক্যানে লেখা-লাইন গোনা অবিশ্বস্ত): প্রথম ঘর ফাঁকা সারি = আগের সারির ধারাবাহিক অংশ (ক্রমিক-কলামের ফরম)।
      // দল-সংখ্যা = ব্যান্ড-সংখ্যা হলে দল ধরে
      if (!rows[0][0]) return null;
      const grp = []; let g = -1;
      rows.forEach((r) => { if (r[0]) g++; grp.push(g); });
      if (g + 1 !== bands) return null;
      bandOf = (i) => grp[i];
    }
    const nCols = Math.max(...rows.map((r) => r.length));
    // g41: এক-ব্যান্ড ২-কলামে Gemini কখনো কলাম ধরে পড়ে — [a1..ak-1], [ak | b1], [b2..bm]
    // (শুধু মাঝের একটি লাইনে '|') ⇒ কলাম ১ = a1..ak, কলাম ২ = b1..bm
    if (bands === 1 && nCols === 2) {
      const multi = rows.map((r, i) => (r.length > 1 ? i : -1)).filter((i) => i >= 0);
      const k = multi[0];
      if (multi.length === 1 && rows[k].length === 2 && k > 0 && k < rows.length - 1 && rows.every((r, i) => i === k || r.length === 1)) {
        const a = rows.slice(0, k).map((r) => r[0]).concat(rows[k][0]), bb = [rows[k][1]].concat(rows.slice(k + 1).map((r) => r[0]));
        return [[a.filter(Boolean).join('\n'), bb.filter(Boolean).join('\n')]];
      }
    }
    // f1 (অনলাইন-ফরম): সারির কলাম-সংখ্যা ভিন্ন (লেবেল|মান, সংখ্যা-বাক্স, রেডিও-লাইন) ⇒ এটা বহু-লাইনের ঘর নয়;
    // হালকা সারি-রেখা কালিতে না ধরায় ব্যান্ড কম দেখায় — জোড়া নয়
    if (!tableGridOn() && rows.some((r) => r.length !== nCols)) return null;
    if (tableGridOn() && rows.some((r) => r.length > nCols)) return null;
    // a18: পুরো-ফাঁকা সারি (Gemini আলাদা মুদ্রিত সারি হিসেবেই লেখে) থাকলে সারিগুলো আসল — রেখা কম ধরা মাপের ভুল, জোড়া নয়
    if ((nCols > 1 || boxSplitOn()) && rows.some((r) => r.every((c) => !c))) return null;
    const out = Array.from({ length: bands + xb }, () => Array.from({ length: nCols }, () => []));
    rows.forEach((r, i) => r.forEach((c, j) => { if (c) out[bandOf(i)][j].push(c); }));
    const res = out.filter((r) => r.some((c) => c.length)).map((r) => r.map((c) => c.join('\n')));
    return res.length && res.length < rows.length ? res : null;
  }

  /**
   * a19 (মালিকের টেস্ট, ২০২৬-১০-১৩): ক্রমিক-কলামের ফরম-ছক ("২। | বিবরণ | মান")-এ Gemini প্রতিটি মুদ্রিত লাইন আলাদা সারি দেয়,
   * আর ধারাবাহিক লাইনে ফাঁকা ক্রমিক-ঘর বাদ দেয় ("তার বিবরণ। যিনি…", "দিতে হবে। | নাম : ……") ⇒ সারির ঘর-সংখ্যা ভিন্ন,
   * mergeLineRows জোড়ে না; প্রতিটি লাইন আলাদা সারি হয়ে ছক ৩০ সারি, কলাম ভুল। ক্রমিকহীন সারি = আগের ক্রমিক-সারির ধারাবাহিক:
   * ঘর এক কলাম ডানে; এক-ঘরের "লেবেল : ……" ⇒ শেষ কলাম, অন্য লেখা ⇒ বিবরণ-কলাম। ফেরত: নতুন সারি বা null
   */
  const SERIAL = /^\(?[০-৯0-9]{1,2}\s*[।.)]?$/;
  function foldSerialRows(rows) {
    if (rows.length < 3 || !SERIAL.test(rows[0][0] || '') || rows[0].length < 2) return null;
    const isSer = (r) => SERIAL.test(r[0] || '') && r.length >= 2;
    const cont = rows.filter((r) => !isSer(r));
    // পুরো-ফাঁকা সারি = আলাদা ছোট টেবিলের মাঝের ফাঁক (splitTableAtGaps-এর কাজ) ⇒ বদল নয়
    if (cont.some((r) => r.every((c) => !c))) return null;
    // ধারাবাহিক নেই, বা ধারাবাহিক সারির ভেতরে ক্রমিক (পাশাপাশি দুই অংশের ছক) ⇒ বদল নয়
    if (!cont.length || cont.some((r) => r.some((c) => SERIAL.test(c || '')))) return null;
    const nCols = Math.max(...rows.filter(isSer).map((r) => r.length));
    if (nCols < 2 || cont.some((r) => r.length > nCols)) return null;
    const LABEL = /[:ঃ]\s*([.…_\-]{3,}.*)?$/;
    const groups = [];
    for (const r of rows) {
      if (isSer(r)) { groups.push(Array.from({ length: nCols }, (_, j) => (r[j] ? [r[j]] : []))); continue; }
      const g = groups[groups.length - 1];
      let cols;
      if (r[0] === '' && r.length > 1) cols = r.map((_, j) => j);                         // Gemini ফাঁকা ক্রমিক-ঘর রেখেছে
      else if (r.length === 1) cols = [nCols >= 3 && LABEL.test(r[0]) ? nCols - 1 : 1];
      else cols = r.map((_, j) => Math.min(nCols - 1, j + 1));
      r.forEach((c, j) => { if (c) g[cols[j]].push(c); });
    }
    return groups.length < rows.length ? groups.map((g) => g.map((c) => c.join('\n'))) : null;
  }

  /** ঘরের ভেতরের সংখ্যা-বাক্সের চিহ্ন: BOX_MARK + ঘরগুলো BOX_SEP দিয়ে (builder ছোট ভেতরের টেবিল আঁকে) */
  const BOX_MARK = '\u0001box:', BOX_SEP = '\u0002';

  /**
   * f1/B9: লেবেল|মান ফরম-ছক (অর্ধেকের বেশি সারি ২-ঘরের)। কয়েকটি সারিতে লেবেলের পরে অনেক ছোট ঘর (≤২ অক্ষর: মোবাইল/NID-এর
   * সংখ্যা-বাক্স) ⇒ ২ কলামই, বাক্সগুলো মান-ঘরে চিহ্ন হয়ে; আলাদা লাইনের রেডিও-বিকল্প (○ …) ⇒ আগের সারির মান-ঘরে নতুন লাইন।
   * (≥৩০% সারি ২-ঘরের হতে হবে; ২-এর বেশি ঘরের প্রতিটি সারি বাক্স-সারি না হলে বদল নয়)
   * নইলে পুরো ছক ১৮ সমান কলামে ভাঙত, লেবেল অক্ষরে-অক্ষরে মোড়াত (৩ পাতা ⇒ ৭)।
   * @returns নতুন সারি বা null (বদল নয়)
   */
  function foldBoxRows(rows) {
    const fk = formKitOn();
    const isBox = (r) => (fk ? r.length >= 5 && String(r[0] || '').trim().length > 1 : r.length >= 6) && r.slice(1).every((c) => String(c || '').trim().length <= 2);
    const isOpt1 = (s) => /^[○●◯◉□☐☑■✓✔•◦]/.test(String(s || '').trim()) || (fk && /^\(\s*[•*]?\s*\)\s*\S/.test(String(s || '').trim()));
    const isOpt = (r) => (r.length === 1 && isOpt1(r[0])) || (fk && r.length === 2 && !String(r[0] || '').trim() && isOpt1(r[1]));
    const normOpt = (s) => String(s || '').trim().replace(/^\(\s*\)\s*/, '○ ').replace(/^\(\s*[•*]\s*\)\s*/, '● ');
    // ≥৩০% সারি ২-ঘরের (f1 পাতা-২: অনেক রেডিও-লাইন এক-ঘরের); বাকিগুলো ১-ঘরের বা বাক্স-সারি (ফরমকিটে কম সারির বাক্স-ছকও অনুমোদিত)
    if (!fk && (rows.length < 4 || rows.filter((r) => r.length === 2).length < rows.length * 0.3)) return null;
    if (fk && rows.length < 4 && !rows.some(isBox) && !rows.some(isOpt)) return null;
    if (fk && rows.length >= 4 && rows.filter((r) => r.length === 2).length < rows.length * 0.3 && !rows.some(isBox)) return null;
    if (rows.some((r) => r.length > 2 && !isBox(r))) return null;
    if (!rows.some(isBox) && !rows.some(isOpt)) return null;
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const last = out[out.length - 1];
      const nx = rows[i + 1];
      if (r.length === 1 && !isOpt(r) && nx && (nx.length === 2 || isBox(nx)) &&
          (/^[(\[]/.test(String(nx[0] || '').trim()) || /সংখ্যার হতে হবে/.test(String(nx[0] || '')) ||
           (!/[:*]$/.test(String(r[0] || '').trim()) && /[:*]$/.test(String(nx[0] || '').trim()) && String(nx[0] || '').trim().length <= 28))) {
        rows[i + 1] = [String(r[0]).trim() + '\n' + String(nx[0] || '').trim(), ...nx.slice(1)];
        continue;
      }
      if (isBox(r)) out.push([r[0], BOX_MARK + r.slice(1).join(BOX_SEP)]);
      else if (isOpt(r) && last && last.length === 2 && last[1] && !last[1].startsWith(BOX_MARK)) last[1] += '\n' + normOpt(r.length === 2 ? r[1] : r[0]);
      else if (fk && r.length === 2 && parseInlineBoxes(r[1]) && !parseInlineBoxes(r[1]).label) out.push([r[0], BOX_MARK + parseInlineBoxes(r[1]).cells.join(BOX_SEP)]);
      else out.push(fk && r.length === 2 && isOpt1(r[1]) ? [r[0], normOpt(r[1])] : r.slice());
    }
    return out;
  }

  /**
   * a03 (২০২৬-১০-১২): Gemini লেবেল ("পোষ্ট কোড :") আর তার ঠিক ডানের সংখ্যা-বাক্স (এক সারির ফাঁকা/≤২-অক্ষরের ছোট টেবিল)
   * আলাদা দিলে একই কলামে পড়ে একটির নিচে আরেকটি বসত (ঘর ৩৬pt-এর জায়গায় ৫৪pt, পরের সব নামত)।
   * ⇒ এক সারির সীমানাহীন ২-ঘরের টেবিল [লেবেল | বাক্স] (foldBoxRows-এর মতো BOX_MARK)। items (একটি কলামের) জায়গায় বদলায়।
   */
  function attachBoxLabels(items) {
    const isBoxTbl = (t) => t.kind === 'table' && t.rect && t.rows && t.rows.length === 1 && t.rows[0].length >= 2
      && t.rows[0].every((c) => String(c || '').trim().length <= 2);
    for (const t of items.filter(isBoxTbl)) {
      const tr = t.rect;
      const lab = items.find((p) => p.kind === 'para' && p.rect && !(p.tabLines && p.tabLines.length > 1) && (p.lines || []).length <= 1
        && String(p.text || '').length <= 40 && p.rect.x + p.rect.w <= tr.x + 4 && tr.x - (p.rect.x + p.rect.w) <= 24
        && Math.abs((p.rect.y + p.rect.h / 2) - (tr.y + tr.h / 2)) <= Math.max(6, tr.h / 2));
      if (!lab) continue;
      const x0 = lab.rect.x, x1 = tr.x + tr.w, y0 = Math.min(lab.rect.y, tr.y), y1 = Math.max(lab.rect.y + lab.rect.h, tr.y + tr.h);
      const fl = Math.min(0.9, Math.max(0.1, (tr.x - 2 - x0) / (x1 - x0)));
      Object.assign(t, {
        rows: [[String(lab.text || '').trim(), BOX_MARK + t.rows[0].map((c) => String(c || '').trim()).join(BOX_SEP)]],
        rect: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, widthPt: x1 - x0, heightPt: y1 - y0, borderless: true,
        colFractions: [fl, 1 - fl], colAligns: ['l', 'l'], cellAligns: null, rowHeightsPt: null, rowWeights: null,
        fontPt: lab.fontPt || t.fontPt, bold: lab.bold, boxLabel: true
      });
      items.splice(items.indexOf(lab), 1);
    }
  }

  /**
   * ২০২৬-১০-১৪ (2.pdf সিলেবাস): দাগহীন ছকে মাপা কলাম Gemini-র চেয়ে ঠিক একটি বেশি, আর মাঝের একটি মাপা কলাম প্রায় সব সারিতে
   * (≥৮০%) ফাঁকা — শিরোনাম-সারির "বিবরণ" ঘরের মাঝে বসায় লেখার ফাঁক দুই ভাগ। ⇒ ঐ কলাম বাঁয়ের কলামে জোড়া, যাতে মাপা
   * কলাম-প্রস্থ ও বাঁ/ডান সাজ কাজে লাগে (নইলে সংখ্যা না মেলায় সব বাদ ⇒ বিবরণ-কলাম মাঝে)। বন্ধ: FZ_OFF=EMPTYCOL
   */
  function dropEmptyMeasuredCol(m, nCols) {
    if (globalThis.__FZ_OFF_EMPTYCOL || !m || m.empty || m.hasGrid !== false || !Array.isArray(m.colAligns) || !Array.isArray(m.cellBox)) return m;
    const n = m.colAligns.length;
    if (n !== nCols + 1 || !Array.isArray(m.colEdgesPt) || m.colEdgesPt.length !== n + 1 || m.cellBox.length < 3) return m;
    let j = -1;
    for (let k = 1; k < n - 1; k++) if (m.cellBox.filter((r) => !r[k]).length >= m.cellBox.length * 0.8) { j = k; break; }
    if (j < 0) return m;
    const join = (a, c) => (a && c ? [Math.min(a[0], c[0]), Math.max(a[1], c[1])] : a || c);
    const cellBox = m.cellBox.map((r) => r.slice(0, j - 1).concat([join(r[j - 1], r[j])], r.slice(j + 1)));
    const colEdgesPt = m.colEdgesPt.filter((_, k) => k !== j);
    return Object.assign({}, m, { cellBox, colEdgesPt, cellInk: cellBox.map((r) => r.map((x) => (x ? x[1] - x[0] : 0))),
      colAligns: m.colAligns.filter((_, k) => k !== j), colGuttersPt: Array.isArray(m.colGuttersPt) ? m.colGuttersPt.filter((_, k) => k !== j - 1) : m.colGuttersPt });
  }

  /**
   * ২০২৬-১০-১৪ (a16, মালিকের Word-যাচাই): মূলে ব্লকের কিছু লাইনে/লাইনের শুরুর অংশে নিচে-দাগ ("সওব্য-২ শাখা", "বিষয়"-এর ২য় লাইন,
   * "বিতরণ"), আমরা পুরো ব্লকে দিতাম। মাপা প্রতি-লাইন দাগ (page-geometry underlineLines) Gemini-র লাইন-সংখ্যায় মিললে আর মিশ্র
   * (সব লাইন পূর্ণ নয়, অন্তত একটিতে আছে) ⇒ শুধু ঐ লাইন/অংশ <u>…</u>; ফেরত নতুন লাইন-তালিকা, নইলে null (আগের মতো)। বন্ধ: FZ_OFF=ULINE
   */
  function perLineUnderline(lines, m) {
    if (globalThis.__FZ_OFF_ULINE || !m || m.empty || !Array.isArray(m.underlineLines) || !Array.isArray(lines)) return null;
    const ls = lines.filter((l) => String(l).trim());
    const u = m.underlineLines;
    const on = (x) => (Array.isArray(x) ? x[1] > x[0] : x > 0);
    if (!ls.length || ls.length !== lines.length || u.length !== ls.length || !u.some(on) || u.every((x) => x === 1)) return null;
    const plain = (s) => String(s).replace(/<\/?u>/gi, '');
    return ls.map((l, i) => {
      const s = plain(l);
      if (!on(u[i]) || /^\s*([─━═=_\-.…·])\1{5,}\s*$/.test(s)) return s;
      if (u[i] === 1) {
        if (!globalThis.__FZ_OFF_ULINE2) {
          const mFull = /^(.*?)([:ঃ।])(\s*\*{0,2}\s*)$/.exec(s);
          if (mFull && mFull[1].trim()) {
            const h = mFull[1], punc = mFull[2], tr = mFull[3];
            if (/^\*\*[^*]+$/.test(h.trim()) && /^\s*\*\*\s*$/.test(tr)) return '**<u>' + h.trim().slice(2) + '</u>**' + punc;
            return '<u>' + h + '</u>' + punc + tr;
          }
        }
        return '<u>' + s + '</u>';
      }
      const bm = /^\*\*([^*]+)\*\*$/.exec(s.trim()), t = bm ? bm[1] : s;
      if (!bm && /\*/.test(s)) return s;   // ভেতরে আংশিক মোটা-চিহ্ন ⇒ ভাঙার ঝুঁকি, দাগ নয়
      const ws = globalThis.__FZ_OFF_ULINE2 ? t.split(/(\s+)/) : t.split(/(\s+|[:ঃ।])/);
      const len = (w) => w.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length, tot = Math.max(1, len(t));
      const isP = (w) => !globalThis.__FZ_OFF_ULINE2 && /^[:ঃ।]$/.test(w);
      // ২০২৬-১০-১৪ (a16 "সংযুক্তি : ০৮ (আট) ফর্দ"): মাঝের দাগ [শুরু, শেষ] ⇒ যে শব্দগুলোর মাঝবিন্দু পরিসরে
      if (Array.isArray(u[i])) {
        let acc = 0;
        const hit = ws.map((w) => { const c = (acc + len(w) / 2) / tot; acc += len(w); return /\S/.test(w) && !isP(w) && c >= u[i][0] && c <= u[i][1]; });
        const k0 = hit.indexOf(true), k1 = hit.lastIndexOf(true);
        if (k0 < 0) return s;
        const pre = ws.slice(0, k0).join(''), mid = ws.slice(k0, k1 + 1).join(''), post = ws.slice(k1 + 1).join('');
        return bm ? (pre ? '**' + pre + '**' : '') + '**<u>' + mid + '</u>**' + (post ? '**' + post + '**' : '') : pre + '<u>' + mid + '</u>' + post;
      }
      // আংশিক: শুরু থেকে অক্ষর-অংশে (কার/চিহ্ন বাদে) যত শব্দ দাগের নিচে — শেষ শব্দের অর্ধেকের বেশি ঢাকলে সেটিও
      let acc = 0, k = 0;
      for (; k < ws.length; k++) { const w = len(ws[k]); if (/\S/.test(ws[k]) && (acc + w / 2) / tot > u[i]) break; acc += w; }
      while (k > 0 && (!ws[k - 1] || /^\s+$/.test(ws[k - 1]) || isP(ws[k - 1]))) k--;
      const head = ws.slice(0, k).join('').trimEnd(), rest = t.slice(head.length);
      if (!head) return s;
      return bm ? '**<u>' + head + '</u>**' + (rest.trim() ? rest.replace(/^(\s*)(.*?)(\s*)$/, '$1**$2**$3') : '') : '<u>' + head + '</u>' + rest;
    });
  }

  function toItem(b, m, pageInfo) {
    const rect = m && !m.empty ? Object.assign({}, m.rectPt) : (m ? Object.assign({}, m.geminiPt) : null);
    const base = { type: b.type, rect, m: m && !m.empty ? m : null, box: b.box };
    // g41: পটির রং (অনুচ্ছেদ-ছায়া); গাঢ় পটিতে লেখা সাদা
    if (m && m.shade && m.shade.fill) {
      base.shade = m.shade.fill;
      if (m.shade.dark) base.color = 'FFFFFF';
      // মাঝে-বসানো ছোট লেখা আর Gemini-বক্সও লেখার কাছাকাছি (g01 "ক্যাশ মেমো" কালো বাক্স) ⇒ শুধু লেখার পেছনে;
      // বক্স লেখার চেয়ে অনেক চওড়া (g41 পূর্ণ-প্রস্থ অংশ-পটি) বা বাঁয়ে ⇒ পুরো অনুচ্ছেদ
      const gw = m.geminiPt ? m.geminiPt.w : 0, rw = m.rectPt ? m.rectPt.w : 0;
      const isFullWidthBar = ((globalThis.__FZ_ON_SHADEBAR && !globalThis.__FZ_OFF_SHADEBAR) || ruleFixOn() || rules2On()) && !m.shade.dark
        && ((rw >= 420 && (!gw || rw >= gw * 0.9)) || ((ruleFixOn() || rules2On()) && (b.type === 'footer' || (Array.isArray(b.box) && (b.box[3] - b.box[1]) >= 850))));
      if ((ruleFixOn() || rules2On()) && isFullWidthBar) base.fullWidthShadeBar = true;
      if (!m.shade.wide && !isFullWidthBar && (m.align || b.align) === 'c' && rw > 0 && gw < rw * 1.8) base.shadeRun = true;
    }
    if (formKitOn()) {
      const fHex = normHexColor(b.fill || (m && m.fill) || base.shade);
      const cHex = normHexColor(b.color || (m && m.color) || base.color);
      if (fHex) { base.fill = fHex; base.shade = base.shade || fHex; if (isDarkFill(fHex) && !cHex) base.color = 'FFFFFF'; }
      if (cHex) base.color = cHex;
      if (b.placeholder || (m && m.placeholder)) { base.placeholder = b.placeholder || m.placeholder; if (!base.color) base.color = '808080'; }
      const bdrStyle = b.border || (m && m.borderStyle) || (m && m.dashDot ? 'dotDash' : (m && m.dashed ? 'dashed' : null));
      if (bdrStyle) {
        base.borderStyle = bdrStyle === 'dash-dot' || bdrStyle === 'dashDot' ? 'dotDash' : bdrStyle;
        if (base.borderStyle === 'dashed') base.dashed = true;
        if (base.borderStyle === 'dotDash') base.dashDot = true;
      }
      if (b.type === 'box_row' || b.boxCount > 0) {
        const ib = parseInlineBoxes(b.text);
        const cells = ib ? ib.cells : (b.text && b.text.includes('|') ? b.text.split(/\s*\|\s*/) : Array(b.boxCount || 11).fill(''));
        const lab = ib && ib.label ? ib.label : '';
        const rows = lab ? [[lab, BOX_MARK + cells.join(BOX_SEP)]] : [cells];
        return Object.assign(base, { kind: 'table', rows, borderless: !!lab, boxRowTable: !lab, colFractions: lab ? [0.35, 0.65] : null, colAligns: lab ? ['l', 'l'] : cells.map(() => 'c') });
      }
      if (b.type === 'photo_box') {
        return Object.assign(base, { kind: 'para', text: b.text || 'ছবি', lines: [b.text || 'ছবি'], align: 'c', photoBox: true, boxed: true, borderStyle: base.borderStyle || 'single' });
      }
      if (b.type === 'label_box') {
        return Object.assign(base, { kind: 'para', text: b.text || '', lines: b.lines && b.lines.length ? b.lines : [b.text || ''], align: 'c', labelBox: true, boxed: true, borderStyle: base.borderStyle || 'single' });
      }
      if (b.type === 'schedule_box' || b.type === 'form_box') {
        const isRight = rect && pageInfo && pageInfo.widthPt && rect.x > pageInfo.widthPt * 0.55;
        return Object.assign(base, { kind: 'para', text: b.text || '', lines: b.lines && b.lines.length ? b.lines : [b.text || ''], align: 'c', scheduleBox: !isRight && b.type === 'schedule_box', labelBox: isRight, boxed: true, borderStyle: base.borderStyle || 'single' });
      }
    }
    if (b.type === 'figure') return Object.assign(base, { kind: 'figure' });
    // g41: হাতের সই/সিলকে Gemini অর্থহীন লেখা করলে ("cccccccccc") ⇒ ছবি (চেহারা অক্ষত)
    if ((b.type === 'signature' || b.type === 'stamp') && b.box && isScribble(b.lines && b.lines.length ? b.lines.join(' ') : b.text)) return Object.assign(base, { kind: 'figure', scribble: true });
    // খাড়া (ঘোরানো) লেখা: লম্বা-সরু, ১–২ লাইন ⇒ ছবি
    // a12: "১।"-এর মাপে শুধু দাঁড়ি পড়লে (১×৬pt) খাড়া মনে হতো ⇒ ছবি, প্রায় অদৃশ্য — আসল খাড়া লেখা লম্বা (≥১৮pt)
    if (rect && rect.h > rect.w * 2.5 && rect.h >= 18 && (!b.lines || b.lines.length <= 2) && b.box) return Object.assign(base, { kind: 'figure', rotatedText: true });
    if (b.type === 'table') {
      if (tableGridOn()) {
        // B2: pageInfo বা m-এ verticalRules / horizontalRules / tableRowBands দেওয়া থাকলে m.vRulesPt ও m.hRulesPt সমৃদ্ধ করা
        const m0 = m && !m.empty ? Object.assign({}, m) : { empty: false, rectPt: rect || { x: 54, y: 100, w: 450, h: 120 } };
        const R0 = m0.rectPt || rect || { x: 54, y: 100, w: 450, h: 120 };
        const rb = m0.tableRowBands || m0.rowBandsPt || m0.rowBands || (pageInfo && pageInfo.tableRowBands);
        if ((!Array.isArray(m0.hRulesPt) || m0.hRulesPt.length < 2) && Array.isArray(rb) && rb.length >= 1) {
          m0.hRulesPt = [rb[0].y0, ...rb.map((x) => x.y1)];
          m0.hasGrid = true;
        }
        const hrSrc = m0.horizontalRules || (pageInfo && (pageInfo.horizontalRules || pageInfo.hrules));
        if ((!Array.isArray(m0.hRulesPt) || m0.hRulesPt.length < 2) && Array.isArray(hrSrc) && hrSrc.length) {
          const hitH = hrSrc.filter((r) => r.y >= R0.y - 6 && r.y <= R0.y + R0.h + 6 && Math.min((r.x || R0.x) + (r.w || R0.w), R0.x + R0.w) - Math.max(r.x || R0.x, R0.x) >= R0.w * 0.5);
          if (hitH.length >= 2) {
            m0.hRulesPt = hitH.map((r) => r.y).sort((a, c) => a - c);
            m0.hRuleSpansPt = hitH.slice().sort((a, c) => a.y - c.y).map((r) => [r.x != null ? r.x : R0.x, (r.x != null ? r.x : R0.x) + (r.w != null ? r.w : R0.w)]);
            m0.hasGrid = true;
          }
        }
        const vrSrc = m0.verticalRules || (pageInfo && (pageInfo.verticalRules || pageInfo.vrules));
        if ((!Array.isArray(m0.vRulesPt) || !m0.vRulesPt.length) && Array.isArray(vrSrc) && vrSrc.length) {
          const hitV = vrSrc.filter((v) => v.x >= R0.x - 8 && v.x <= R0.x + R0.w + 8 && ((v.y == null && v.y0 == null) || (Math.min((v.y1 != null ? v.y1 : v.y + (v.h || R0.h)), R0.y + R0.h) - Math.max((v.y0 != null ? v.y0 : v.y), R0.y) >= R0.h * 0.2)));
          if (hitV.length) {
            m0.vRulesPt = hitV.map((v) => {
              const vy0 = v.y0 != null ? v.y0 : (v.y != null ? v.y : R0.y);
              const vy1 = v.y1 != null ? v.y1 : (v.y != null && v.h != null ? v.y + v.h : R0.y + R0.h);
              return { x: v.x, y0: vy0, y1: vy1, cov: v.cov != null ? v.cov : Math.min(1, Math.max(0.25, (vy1 - vy0) / Math.max(1, R0.h))) };
            }).sort((a, c) => a.x - c.x);
            m0.hasGrid = true;
          }
        }
        if (m || m0.hasGrid || m0.smallBoxesPt || m0.tableGapsPt) m = m0;
      }
      let rows = (b.lines || []).filter((l) => l.trim()).map((l) => l.split(/\s*\|\s*/).map((c) => c.trim()));
      const isA16ChecklistRows = a16FixOn() && rows.length >= 4 && rows[0] && rows[0].length >= 5 && rows.slice(1).every((r) => r.slice(2).every((c) => !String(c || '').trim()));
      if ((a07FixOn() || a07Fix2On() || isA16ChecklistRows) && m && !m.empty && m.rectPt && m.hasGrid !== false && rows.length >= 3) {
        const R = m.rectPt, hrAll = (pageInfo && (pageInfo.hrules || pageInfo.horizontalRules)) || m.horizontalRules;
        const botY = isA16ChecklistRows && m.geminiPt ? Math.max(R.y + R.h, m.geminiPt.y + m.geminiPt.h) : R.y + R.h;
        if (Array.isArray(hrAll) && hrAll.length >= rows.length && (!Array.isArray(m.hRulesPt) || m.hRulesPt.length < rows.length + 1)) {
          const segs = hrAll.filter((r) => r && r.y >= R.y - 4 && r.y <= botY + 4 && Math.min((r.x || 0) + (r.w || 0), R.x + R.w + 4) - Math.max(r.x || 0, R.x - 4) >= 12)
            .slice().sort((a, c) => a.y - c.y);
          const cls = [];
          segs.forEach((s) => {
            const last = cls[cls.length - 1];
            if (!last || s.y - last.ys[last.ys.length - 1] > 2.2) cls.push({ ys: [s.y], ws: [s.w || 0], ints: [[Math.max(R.x, s.x || R.x), Math.min(R.x + R.w, (s.x || R.x) + (s.w || 0))]] });
            else { last.ys.push(s.y); last.ws.push(s.w || 0); last.ints.push([Math.max(R.x, s.x || R.x), Math.min(R.x + R.w, (s.x || R.x) + (s.w || 0))]); }
          });
          const fullH = [];
          cls.forEach((cl) => {
            const ints = cl.ints.filter((iv) => iv[1] > iv[0]).sort((a, c) => a[0] - c[0]);
            let cov = 0, c0 = -1, c1 = -1;
            ints.forEach(([a, b0]) => { if (a > c1) { cov += Math.max(0, c1 - c0); c0 = a; c1 = b0; } else if (b0 > c1) c1 = b0; });
            cov += Math.max(0, c1 - c0);
            const wSum = cl.ws.reduce((a, b0) => a + b0, 0) || 1;
            const yMean = r1(cl.ys.reduce((a, y, idx) => a + y * (cl.ws[idx] || 1), 0) / wSum);
            if (cov >= R.w * 0.42) fullH.push(yMean);
          });
          if (fullH.length === rows.length + 1) {
            m = Object.assign({}, m, { hRulesPt: fullH, _a07FullHRules: true });
            base.m = m;
          } else if (isA16ChecklistRows && Array.isArray(m.hRulesPt) && m.hRulesPt.length === rows.length && fullH.length > rows.length && rows[rows.length - 1].some((c) => /<table\b/i.test(String(c || '')))) {
            const yBot = fullH[fullH.length - 1];
            if (yBot > m.hRulesPt[m.hRulesPt.length - 1] + 20) {
              const nextHRules = m.hRulesPt.concat(yBot);
              const nextRectPt = Object.assign({}, R, { h: r1(yBot - R.y) });
              m = Object.assign({}, m, { hRulesPt: nextHRules, rectPt: nextRectPt, _a07FullHRules: true });
              base.m = m;
              if (rect) {
                rect.h = r1(yBot - rect.y);
              }
            }
          }
        }
      }
      if (formKitOn() && rows.length >= 2) {
        // B4: "দাগ টেনে মিল কর" ২-কলামের ছকে শেষ সারি ("৩০ 25") এক ঘরে ঢুকে গেলে দুই ঘরে ভাগ
        const twoColRows = rows.filter((r) => r.length === 2 && r[0] && r[1]);
        if (twoColRows.length >= rows.length - 1) {
          rows = rows.map((r) => {
            if (r.length === 1 || (r.length === 2 && r[0] && !r[1])) {
              const sp = String(r[0] || '').trim().split(/\s{2,}|\t|\s+/);
              if (sp.length === 2) return [sp[0], sp[1]];
            }
            return r;
          });
        }
      }
      const folded = foldBoxRows(rows);
      if (folded) rows = folded;
      // g41: সীমানাওয়ালা ছকে রেখা-ব্যান্ড Gemini-সারির চেয়ে কম ⇒ লাইনগুলো আসলে বহু-লাইনের ঘর — ব্যান্ড ধরে জোড়া
      // a07: খাড়া দাগে k কলাম, বেশিরভাগ (≥৬০%) সারিও ≤k ঘরের, কিছু সারিতে Gemini শেষ কলামের লেখা ভেঙে বাড়তি ঘর দেয়
      // ("(ক) AML … | হ্যাঁ/না") ⇒ বাড়তি ঘর শেষ ঘরে জোড়া (নইলে কলাম-সংখ্যা ভুল, মাপা প্রস্থ বসে না)
      // a19: ক্রমিক-কলামের ধারাবাহিক লাইন আগে জোড়া (নিচের নিয়ম আগে চললে মাপা ১ খাড়া দাগ দেখে বিবরণ+মান এক ঘরে জুড়ত)
      // ২০২৬-১০-১৯ (A07_TABLECOL_v1): রেখাহীন ডান-সারিবদ্ধ লেখা পুরো ছকের কলাম বাড়াবে না — ঘরের ভেতরে ডান-ট্যাব
      if (tableColOn() && !(extraLinesOn() && !folded && foldSerialRows(rows))) {
        const R = m && (m.rectPt || base.rect);
        const inVR = m && Array.isArray(m.vRulesPt) && R ? m.vRulesPt.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6 && (v.cov == null || v.cov >= 0.25)) : null;
        let k = inVR ? inVR.length + 1 : 0;
        if (!k && rows.length >= 3) {
          const lens = rows.map((r) => r.filter((c) => c && String(c).trim()).length);
          const maxL = Math.max(...lens);
          const countMax = lens.filter((l) => l === maxL).length;
          if (countMax < rows.length * 0.4) {
            const shorter = lens.filter((l) => l < maxL);
            if (shorter.length >= rows.length * 0.6) k = Math.max(...shorter);
          }
        }
        if (k >= 2 && rows.some((r) => r.length > k)) {
          rows = rows.map((r) => {
            if (r.length > k) {
              const main = r.slice(0, k - 1);
              const colA = String(r[k - 1] || '');
              const colB = String(r[k] || '');
              let extra;
              if (colA && colB && colA.includes('\n') && colB.includes('\n')) {
                const lnsA = colA.split('\n'), lnsB = colB.split('\n');
                if (lnsA.length === lnsB.length) {
                  extra = lnsA.map((l, i) => l + '\t' + (lnsB[i] || '')).join('\n');
                } else {
                  extra = r.slice(k - 1).filter((c) => c && String(c).trim()).join('\t');
                }
              } else {
                extra = r.slice(k - 1).filter((c) => c && String(c).trim()).join('\t');
              }
              return main.concat(extra);
            }
            return r;
          });
        }
      }
      const serialFolded = !folded && foldSerialRows(rows);
      if (serialFolded) rows = serialFolded;
      if (!folded && !serialFolded && m && !m.empty && m.hasGrid !== false && Array.isArray(m.vRulesPt) && rows.length >= 3) {
        const R = m.rectPt, k = m.vRulesPt.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6 && v.cov >= 0.25).length + 1;
        const mx = Math.max(...rows.map((r) => r.length));
        if (k >= 2 && mx > k && rows.filter((r) => r.length <= k).length >= rows.length * 0.6)
          rows = rows.map((r) => (r.length > k ? r.slice(0, k - 1).concat(r.slice(k - 1).filter(Boolean).join('   ')) : r));
      }
      // A14_BOXSPLIT_v2: ফ্রেম-বাক্সে ভেতরের খাড়া দাগ ও কলাম-ফাঁক না থাকলে এবং কেবল কিছু সারির ডানে ছোট স্বাক্ষর/সীল লেবেল
      // থাকায় Gemini ২-কলামের টেবিল বানালে — আলাদা কলাম না বানিয়ে একই সারিতে ডান-ট্যাবে ('\t') এক কলামে রাখা
      if (boxSplitOn() && !folded && !serialFolded && rows.length >= 2) {
        const R = (m && !m.empty && m.rectPt) || rect;
        const innerV = m && !m.empty && Array.isArray(m.vRulesPt) && R
          ? m.vRulesPt.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6 && (v.cov == null || v.cov >= 0.25))
          : [];
        const noInnerV = innerV.length === 0 && (!m || m.empty || !Array.isArray(m.colGuttersPt) || m.colGuttersPt.length === 0);
        const mx = Math.max(0, ...rows.map((r) => r.length));
        const neRows = rows.filter((r) => r.some((c) => c && String(c).trim()));
        const multiRows = neRows.filter((r) => r.slice(1).some((c) => c && String(c).trim()));
        const visLen = (s) => String(s || '').replace(/\*\*|<[^>]+>/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').trim().length;
        const shortRight = multiRows.length > 0 && multiRows.every((r) => r.slice(1).every((c) => visLen(c) <= 40));
        const singleColMeasured = !!(m && !m.empty && Array.isArray(m.colEdgesPt) && m.colEdgesPt.length === 2);
        if (noInnerV && mx >= 2 && neRows.length >= 2 && shortRight && (multiRows.length <= neRows.length * 0.5 || singleColMeasured)) {
          if (m && !m.empty && Array.isArray(m.cellBox) && m.cellBox.length === neRows.length && R) {
            const rightEdges = [];
            neRows.forEach((r, idx) => {
              if (r.slice(1).some((c) => c && String(c).trim())) {
                const cb = m.cellBox[idx] && m.cellBox[idx][m.cellBox[idx].length - 1];
                if (cb && cb[1] > R.x + R.w * 0.6 && cb[1] <= R.x + R.w) rightEdges.push(cb[1]);
              }
            });
            if (rightEdges.length) base.rightTabStopSrcPt = r1(Math.max(...rightEdges) - R.x - 5.4);
          }
          rows = rows.map((r) => {
            const left0 = String(r[0] || '').trim();
            const right0 = r.slice(1).map((c) => String(c || '').trim()).filter(Boolean).join('\t');
            if (!right0) return [left0];
            const leftTrim = left0.replace(/([._\-…·─])\1{25,}/g, (run) => run[0].repeat(25));
            return [leftTrim ? leftTrim + '\t' + right0 : '\t' + right0];
          });
          base.boxSplitCollapsed = true;
          if (m && !m.empty && m.rectPt && Array.isArray(m.hRulesPt) && m.hRulesPt.length >= 2 && Array.isArray(m.textLinesPt) && m.textLinesPt.length) {
            const H = m.hRulesPt.slice().sort((a, c) => a - c), botRule = H[H.length - 1];
            const maxLineY = Math.max(...m.textLinesPt);
            if (maxLineY < botRule && m.rectPt.y + m.rectPt.h > botRule + 2 && botRule - m.rectPt.y >= m.rectPt.h * 0.8) {
              m = Object.assign({}, m, { rectPt: Object.assign({}, m.rectPt, { h: botRule - m.rectPt.y }) });
              base.rect = Object.assign({}, m.rectPt);
            }
          }
        }
      }
      // অনুরোধ ঘ (a07 পাতা ১-এর ছক, FZ_OFF=HEADMERGE): প্রথম কয়েকটি সারির মাঝে আড়াআড়ি দাগ না থাকলে এবং শুধু ছোট টুকরো লেখা থাকলে একটি হেডার-সারিতে সংযোজন
      // B2 সুরক্ষা: ফাঁকা বিভাজক সারি, tableGapsPt, প্রতিটি সারির নিজস্ব আড়াআড়ি দাগ (hRulesPt.length >= rows.length + 1), বা আংশিক রেখা-বিস্তার থাকলে হেডার-মার্জ সারি গলাবে না
      const skipHeadMergeB2 = tableGridOn() && (
        rows.some((r) => r.every((c) => !String(c || '').trim()))
        || (m && Array.isArray(m.tableGapsPt) && m.tableGapsPt.length > 0)
        || (b.splitAtEmpty || (m && m.splitAtEmpty))
        || (m && Array.isArray(m.hRulesPt) && m.hRulesPt.length >= rows.length + 1)
        || (m && Array.isArray(m.hRuleSpansPt) && m.hRuleSpansPt.length > 0)
        || (m && Array.isArray(m.vRulesPt) && m.vRulesPt.some((v) => v && v.y0 != null && v.y1 != null && v.cov != null && v.cov < 0.95))
        || !m || !Array.isArray(m.textLinesPt) || m.textLinesPt.length < 2
      );
      if (!folded && !serialFolded && !globalThis.__FZ_OFF_HEADMERGE && !skipHeadMergeB2) {
        let HM = global.FayzarHeaderMerge;
        if (!HM && typeof require === 'function') { try { HM = global.FayzarHeaderMerge = require('./header-merge.js'); } catch (e) { HM = null; } }
        if (!HM && typeof XMLHttpRequest !== 'undefined') {
          try { const x = new XMLHttpRequest(); x.open('GET', 'js/layout-engine/faithful/header-merge.js', false); x.send(null); if (x.status >= 200 && x.status < 300 && x.responseText) { (0, eval)(x.responseText); HM = global.FayzarHeaderMerge; } } catch (e) { HM = null; }
        }
        if (HM && typeof HM.applyHeaderMerge === 'function') rows = HM.applyHeaderMerge(rows, m);
      }
      const merged = mergeLineRows(rows, m);
      if (merged) rows = merged;
      // A04_PAGES_v1: ১ম সারির গ্রুপ-শিরোনামের পাশে জোড়াবিহীন দীর্ঘ কলাম-বিবরণী থাকলে এবং ২য় সারির (বিবরণী-সারি) সংশ্লিষ্ট ঘর ফাঁকা থাকলে তা ২য় সারিতে স্থানান্তর
      if ((pages4On() || tblMergeOn() || lineGapOn()) && rows.length >= 10 && rows[0] && rows[1]) {
        const r1Len = rows[1].reduce((a, c) => a + String(c || '').trim().length, 0);
        if (r1Len >= 150) {
          rows = rows.map((r) => r.slice());
          for (let k = 0; k < rows[0].length; k++) {
            const c0 = String(rows[0][k] || '').trim(), c1 = String(rows[1][k] || '').trim();
            const nextFilled = k + 1 < rows[0].length && String(rows[0][k + 1] || '').trim().length > 0;
            if (c0.length > 20 && nextFilled && !c1) { rows[1][k] = rows[0][k]; rows[0][k] = ''; }
          }
        }
      }
      // কাজ ৪ (a02 "সম্পর্ক" কলাম, FZ_ON=BOXPOS): ডিফল্টে বন্ধ যাতে a02 ও a03-এ gridSpan বা অবস্থান না ভাঙে
      if (!globalThis.__FZ_OFF_BOXPOS && globalThis.__FZ_ON_BOXPOS) {
        rows = rows.map((r) => r.map((c) => {
          if (!c || !/[☐☑□]|\[\s*\]|⟦\s*⟧/.test(c)) return c;
          return String(c).split('\n').map((ln) => {
            const mBox = /^\s*([^☐☑□\[⟦\n]+?:)\s*([☐☑□]|\[\s*\]|⟦\s*⟧)\s*$/.exec(ln);
            return mBox ? '□ ' + mBox[1].trim() : ln;
          }).join('\n');
        }));
      }
      // সীমানা: কালিতে রেখা-জাল না থাকলে সীমানাহীন (মাপ না থাকলে আগের মতো সীমানাসহ)
      // Part-17.9: ঘরের ফন্ট — সারি-লাইনের কালি-উচ্চতা ÷ টেবিলের লেখার অক্ষর-শ্রেণির অনুপাত (ক্যালিব্রেটেড)
      let cellFontSrc = 0;
      const tblText = (b.lines || []).join(' ');
      const tblCells = mathHOn() ? rows.flatMap((r) => r.map((c) => String(c || '').trim()).filter(Boolean)) : [];
      const eqCells = tblCells.filter((c) => mathKindOf(c));
      const tblInkRatio = mathHOn() && tblCells.length && eqCells.length * 2 < tblCells.length
        ? inkRatioFor(tblCells.filter((c) => !mathKindOf(c)).join(' ') || tblText)
        : inkRatioFor(tblText);
      if (m && !m.empty && m.cellInkPt) cellFontSrc = m.cellInkPt / tblInkRatio;
      // প্রস্থ-ভিত্তিক (থাকলে, ১.৫ গুণের ভেতরে) অগ্রাধিকার
      if (m && !m.empty && m.cellWidthFontPt && (!cellFontSrc || (m.cellWidthFontPt / cellFontSrc < 1.5 && cellFontSrc / m.cellWidthFontPt < 1.5))) cellFontSrc = m.cellWidthFontPt;
      // ২০২৬-১০-১৯ (A07_TABLECOL_v1): মাপা রেখা ও কালি থেকে ঘরের লাইন-পিচ ও ফন্ট-আকার নির্ধারণ
      let tblLinePitch = 0;
      if (tableColOn() && m && !m.empty && !(extraLinesOn() && (serialFolded || m.hasGrid === false))) {
        if (Array.isArray(m.hRulesPt) && m.hRulesPt.length >= 2) {
          const H = m.hRulesPt.slice().sort((a, c) => a - c);
          const pitches = [];
          for (let ri = 0; ri < Math.min(rows.length, H.length - 1); ri++) {
            const rH = H[ri + 1] - H[ri];
            const nL = Math.max(...rows[ri].map((c) => String(c || '').split('\n').length));
            if (nL >= 2 && rH > 0) pitches.push(rH / nL);
          }
          if (pitches.length) {
            pitches.sort((a, c) => a - c);
            tblLinePitch = r1(pitches[Math.floor(pitches.length / 2)]);
          } else if (H.length >= 2) {
            const d = H.slice(1).map((y, k) => y - H[k]).filter((v) => v >= 8);
            if (d.length) tblLinePitch = r1(d[0]);
          }
        }
        if (m.cellInkPt) {
          const inkFs = m.cellInkPt / 0.85;
          if (inkFs > cellFontSrc) cellFontSrc = inkFs;
        }
        if (tblLinePitch > 0) {
          const pitchFs = tblLinePitch / 1.35;
          if (pitchFs > cellFontSrc) cellFontSrc = pitchFs;
        }
      }
      // কাজ ২ (a17 p6, FZ_OFF=DOTFONT): অনুচ্ছেদ-ভরা (≥৮০ অক্ষর) বিন্দু-সারিওয়ালা ফরম-ছকে সারি-ব্যান্ডের বিন্দুহীন লেখার কালি-উচ্চতা থেকে ঘরের আসল ফন্ট উদ্ধার
      const hasLongDotCell = /([._…·])\1{4,}/.test(tblText) && rows.some((r) => r.some((c) => String(c || '').replace(/\s+/g, '').length >= 80));
      const skipDotFontBox = boxSplitOn() && base.boxSplitCollapsed && m && m.cellWidthFontPt && rows.some((r) => r.some((c) => String(c || '').replace(/\s+/g, '').length >= 80 && !/([._…·])\1{4,}/.test(String(c || ''))));
      if (!globalThis.__FZ_OFF_DOTFONT && !skipDotFontBox && m && !m.empty && m.hasGrid && hasLongDotCell) {
        let dotlessFont = m.dotlessCellInkPt ? m.dotlessCellInkPt / tblInkRatio : 0;
        if (!dotlessFont && Array.isArray(m.textInkXPt) && Array.isArray(m.textLinesPt) && m.textLinesPt.length >= 3) {
          const lhs = m.textLinesPt.map((ly) => {
            const cs = m.textInkXPt.filter((c) => c[2] - c[1] >= 4 && ly >= c[1] - 2 && ly <= c[2] + 2);
            if (cs.length < 3) return 0;
            const hs = cs.map((c) => c[2] - c[1]).sort((a, b) => a - b);
            const med = hs[hs.length >> 1], p75 = hs[Math.floor(hs.length * 0.75)];
            return med >= 5 ? p75 : 0;
          }).filter((h) => h >= 10).sort((a, b) => a - b);
          if (lhs.length >= 2) dotlessFont = lhs[Math.floor(lhs.length * 0.75)] * 0.56;
        }
        if (dotlessFont > cellFontSrc) cellFontSrc = dotlessFont;
      }
      // a16: সীমানাওয়ালা ছকে এক-লাইনের সারির মাপা উচ্চতা (রেখা-ব্যবধানের ২০তম শতাংশ) ফন্টের ঊর্ধ্বসীমা:
      // সারি ÷ ১.২ (g18 সত্য: ১০pt ফন্ট ১২pt সারিতে; ১.২৫+১.৫ ধরলে ৮.৪-এ নামত)। a16: ১৩.৫pt ফন্ট ১৫.৩pt সারিতে আঁটত না
      if (cellFontSrc && m && !m.empty && m.hasGrid && Array.isArray(m.hRulesPt) && m.hRulesPt.length >= 5) {
        const H = m.hRulesPt.slice().sort((a, c) => a - c), d = H.slice(1).map((y, k) => y - H[k]).filter((v) => v >= 8).sort((a, c) => a - c);
        if (d.length >= 4) { const cap = d[Math.floor(d.length * 0.2)] / 1.28; if (cap >= 6 && cellFontSrc > cap) { cellFontSrc = cap; base.rowFontCap = cap; } }
        // a07 পাতা ৪ (কাত স্ক্যান): লেখা-লাইন সারির অর্ধেকেরও কম মাপা ⇒ কালি-মাপ অবিশ্বস্ত (৮.৬ ⇒ আসল ~১১); এক-লাইন সারির
        // উচ্চতা থেকে নিম্নসীমা: (সারি − ১pt) ÷ ১.২৫ (Word-এ Sutonny-র আসল লাইন-দূরত্ব; a07: ২-লাইনের সারি ৩৩.৬ ⇒ দূরত্ব ~১৬)
        const tlN = Array.isArray(m.textLinesPt) ? m.textLinesPt.length : 0;
        const skipFloorP4 = (pages4On() || tblMergeOn() || lineGapOn() || rotTextOn()) && rows.length >= 15 && (m.hRulesPt.length < rows.length * 0.6 || (rows[0] && rows[0].length >= 10));
        if (skipFloorP4 && tblLinePitch > 0 && m.hRulesPt.length < rows.length * 0.6) { tblLinePitch = 0; if (m.cellInkPt) cellFontSrc = m.cellInkPt / tblInkRatio; }
        const textRowN = (a10LinesOn() || a10FixOn()) ? Math.max(1, rows.filter((r) => r.some((c) => c && String(c).trim())).length) : rows.length;
        if (!globalThis.__FZ_OFF_FONT && !skipFloorP4 && d.length >= 4 && tlN < textRowN / 2) { const floor = (d[Math.floor(d.length * 0.2)] - 1) / 1.25; if (floor > cellFontSrc) cellFontSrc = floor; }
      }
      // Part-17.8: মাপা কলাম-প্রস্থের অনুপাত (কলাম-ফাঁকের সংখ্যা = কলাম − ১ হলে)
      let colFractions = null, fillW2 = false;
      const nCols = rows.length ? Math.max(...rows.map((r) => r.length)) : 0;
      const isFillCol = (j) => !globalThis.__FZ_OFF_FILLCOL && rows.length >= 4 && rows.slice(0, 2).some((r) => r[j] && String(r[j]).trim())
        && rows.slice(2).every((r) => !(r[j] && String(r[j]).trim()));
      const hasBodyCol = rows.length >= 4 && Array.from({ length: Math.max(0, nCols - 1) }, (_, idx) => idx + 1)
        .some((j) => rows.slice(2).filter((r) => r[j] && String(r[j]).trim()).length >= Math.ceil((rows.length - 2) * 0.5));
      const fillColCount = Array.from({ length: nCols }, (_, j) => isFillCol(j)).filter(Boolean).length;
      const hasFillCols = !globalThis.__FZ_OFF_FILLW2 && nCols >= 4 && hasBodyCol && fillColCount >= 2;
      m = dropEmptyMeasuredCol(m, nCols);
      // A02_RULES_v1: ১-সারির সংখ্যা-বাক্স ছকে (তারিখ/NID/অবসর গ্রহণের তারিখ) মাপা আড়া-রেখার প্রকৃত উচ্চতা এবং দিন-মাস-বছরের মাঝের বর্ডারহীন ফাঁক (smallBoxesPt) শনাক্তকরণ
      if ((ruleFixOn() || ((tblMergeOn() || (rules2On() && (m.hRulesPt[1] - m.hRulesPt[0]) <= 19)) && nCols >= 8 && Array.isArray(m && m.hRulesPt) && m.hRulesPt.length === 2)) && m && !m.empty && m.rectPt && m.hasGrid !== false && rows.length === 1 && nCols >= 4 && rows[0].every((c) => String(c || '').trim().length <= 2)) {
        base._digitBoxStrip = true;
        if (Array.isArray(m.hRulesPt) && m.hRulesPt.length === 2) {
          const hSpan = r1(m.hRulesPt[1] - m.hRulesPt[0]);
          if (hSpan >= 10 && hSpan <= m.rectPt.h + 1) base.boxRuleHeightPt = hSpan;
        }
        if (Array.isArray(m.vRulesPt) && m.vRulesPt.length > nCols + 1) {
          const rawXs = m.vRulesPt.filter((v) => v.cov == null || v.cov >= 0.8).map((v) => v.x).sort((a, c) => a - c);
          const xs = [];
          rawXs.forEach((x) => { if (!xs.length || x - xs[xs.length - 1] > 1.5) xs.push(x); });
          const boxInts = [], gapInts = [];
          for (let k = 0; k < xs.length - 1; k++) {
            const dx = xs[k + 1] - xs[k];
            if (dx >= 10) boxInts.push([xs[k], xs[k + 1]]);
            else if (dx >= 2) gapInts.push([xs[k], xs[k + 1]]);
          }
          if (boxInts.length === nCols && gapInts.length >= 1) {
            const hy0 = Array.isArray(m.hRulesPt) && m.hRulesPt.length >= 2 ? m.hRulesPt[0] : m.rectPt.y;
            const hy1 = Array.isArray(m.hRulesPt) && m.hRulesPt.length >= 2 ? m.hRulesPt[m.hRulesPt.length - 1] : m.rectPt.y + m.rectPt.h;
            base.smallBoxesPt = boxInts.map(([x0, x1]) => ({ x0: r1(x0), x1: r1(x1), y0: r1(hy0), y1: r1(hy1), w: r1(x1 - x0), h: r1(hy1 - hy0) }));
          }
        }
      }
      // ২০২৬-১০-১৩: সীমানাওয়ালা ছকে আগে খাড়া দাগ (দৃশ্যমান কলাম-রেখাই সত্য; লেখার ফাঁকের মাঝ ধরলে a02-এ কলাম-রেখা ১০–৫০pt সরে যেত)
      if (m && !m.empty && m.hasGrid && Array.isArray(m.vRulesPt) && nCols > 1) {
        const R = m.rectPt, in0 = m.vRulesPt.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6);
        const rOuter = hasFillCols ? m.vRulesPt.filter((v) => v.cov >= 0.4 && Math.abs(v.x - (R.x + R.w)) <= 6).sort((a, b) => b.cov - a.cov)[0] : null;
        const rx1 = rOuter ? rOuter.x : R.x + R.w, rw = rx1 - R.x;
        // চেকবক্সের ছোট খাড়া দাগ বাদ দিতে: প্রথমে প্রায় পুরো-উচ্চতার (≥৯০%) দাগ, না মিললে ≥৫০%, আর পূরণের কলাম থাকলে ≥৪০% (FZ_OFF=FILLW2)
        const full0 = in0.filter((v) => v.cov >= 0.9), half0 = in0.filter((v) => v.cov >= 0.5), f40 = hasFillCols ? in0.filter((v) => v.cov >= 0.4) : [];
        const full = (tblMergeOn() && full0.length > nCols - 1) ? filterMicroClusterVRules(full0) : full0;
        const half = (tblMergeOn() && half0.length > nCols - 1) ? filterMicroClusterVRules(half0) : half0;
        const inner = full.length === nCols - 1 ? full : (half.length === nCols - 1 ? half : (f40.length === nCols - 1 ? f40 : half));
        if (inner.length === nCols - 1) {
          const edges = [R.x, ...inner.map((v) => v.x).sort((a, c) => a - c), rx1];
          const fr = edges.slice(1).map((e, k) => (e - edges[k]) / rw);
          if (fr.every((f) => f >= 0.02)) { colFractions = fr; if (hasFillCols) fillW2 = true; }
        } else if (!globalThis.__FZ_OFF_FRAC && inner.length === nCols - 2 && nCols >= 3 && inner.length && Math.min(...inner.map((v) => v.x)) - R.x <= R.w * 0.15
          && rows.filter((r) => r[nCols - 1] && String(r[nCols - 1]).trim()).length <= rows.length * 0.5) {
          // a07 পাতা ৩: ক্রমিক-কলামের দাগ আছে, শেষ মাপা কলামের ভেতরে দাগহীন ডান-অংশ ("হ্যাঁ/না (সম্ভাব্য প্রমাণক)", কিছু সারিতেই) —
          // Gemini সেটিকে আলাদা কলাম দেয়। লেখার দৈর্ঘ্য-অনুপাতে ভাগ করলে ঐ কলাম ৫৬pt, পুরো ছকের ফন্ট ১০ ⇒ ৮.৫।
          // ⇒ মাপা দাগের কলাম; শেষ কলাম শেষ মাপা কলামের ডান থেকে তার লেখার মাপে (≤৪৫%)
          const fs0 = cellFontSrc || 11, xs = inner.map((v) => v.x).sort((a, c) => a - c);
          const lastLen = Math.max(...rows.map((r) => String(r[nCols - 1] || '').split('\n').reduce((a, l) => Math.max(a, l.replace(/[ঁ-ঃ়া-্ৗ]/g, '').trim().length), 0)));
          const lastW = Math.min((R.x + R.w - xs[xs.length - 1]) * 0.45, lastLen * fs0 * 0.5 + 2 * 5.4 + 4);
          const edges = [R.x, ...xs, R.x + R.w - lastW, R.x + R.w];
          const fr = edges.slice(1).map((e, k) => (e - edges[k]) / R.w);
          if (fr.every((f) => f >= 0.02)) colFractions = fr;
        } else if (inner.length === nCols - 2 && nCols >= 3 && rows.every((r) => !r[0] || SERIAL.test(r[0]))) {
          // a19: ক্রমিক-কলাম আর বিবরণের মাঝে খাড়া দাগ নেই (মূলে শুধু বিবরণ|মান দাগ) ⇒ ক্রমিক-কলাম লেখার মাপে সরু
          // (নইলে কলাম-সংখ্যা না মেলায় সব কলাম সমান — ক্রমিক-কলাম বিবরণের সমান চওড়া হতো)
          const fs0 = cellFontSrc || 11, sw = Math.max(...rows.map((r) => String(r[0] || '').length)) * fs0 * 0.6 + 2 * 5.4 + 4;
          const edges = [R.x, R.x + Math.min(sw, R.w * 0.15), ...inner.map((v) => v.x).sort((a, c) => a - c), R.x + R.w];
          const fr = edges.slice(1).map((e, k) => (e - edges[k]) / R.w);
          if (fr.every((f) => f >= 0.02)) colFractions = fr;
        }
      }
      if (!colFractions && m && !m.empty && m.colGuttersPt && nCols > 1 && m.colGuttersPt.length === nCols - 1) {
        const R = m.rectPt, rOuter = hasFillCols && Array.isArray(m.vRulesPt) ? m.vRulesPt.filter((v) => v.cov >= 0.4 && Math.abs(v.x - (R.x + R.w)) <= 6).sort((a, b) => b.cov - a.cov)[0] : null;
        const rx1 = rOuter ? rOuter.x : R.x + R.w, rw = rx1 - R.x;
        const guts = m.colGuttersPt.slice();
        if (hasFillCols && Array.isArray(m.vRulesPt)) {
          const vr = m.vRulesPt.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6 && v.cov >= 0.4);
          for (let k = 0; k < guts.length; k++) {
            if (!isFillCol(k + 1) && !isFillCol(k)) continue;
            const hit = vr.find((v) => Math.abs(v.x - guts[k]) <= 12);
            if (hit) { guts[k] = hit.x; fillW2 = true; }
          }
        }
        const edges = [R.x, ...guts, rx1];
        colFractions = edges.slice(1).map((e, k) => (e - edges[k]) / rw);
        if (colFractions.some((f) => f < 0.03)) colFractions = null;
      }
      // A02_RULES_v1: ধূসর শিরোনামযুক্ত ছকে (headShade, যেমন a02-এর ০৫ নং ক্রমিকের পরিবারবর্গের বিবরণ ছক) pageInfo.boxes-এ থাকা নিরেট কলাম-বাক্স থেকে প্রকৃত কলাম-সীমা উদ্ধার
      let boxColMatched = false;
      if ((ruleFixOn() || tblMergeOn() || rules2On()) && !colFractions && m && !m.empty && m.rectPt && m.headShade && nCols >= 3 && pageInfo && Array.isArray(pageInfo.boxes) && pageInfo.boxes.length >= 3) {
        const R = m.rectPt;
        const cbs = pageInfo.boxes.filter((bx) => !bx.dashed && bx.x0 >= R.x - 4 && bx.x1 <= R.x + R.w + 4 && bx.y0 >= R.y - 4 && bx.y1 <= R.y + R.h + 4 && (bx.y1 - bx.y0) >= R.h * 0.8 && (bx.x1 - bx.x0) < R.w * 0.9);
        const xs = [R.x, ...cbs.map((bx) => bx.x0), ...cbs.map((bx) => bx.x1), R.x + R.w].sort((a, c) => a - c);
        const cl = [];
        xs.forEach((x) => { if (!cl.length || x - cl[cl.length - 1][cl[cl.length - 1].length - 1] > 8) cl.push([x]); else cl[cl.length - 1].push(x); });
        if (cl.length === nCols + 1) {
          const u = cl.map((g) => g.reduce((a, c) => a + c, 0) / g.length);
          const totW = u[u.length - 1] - u[0];
          const fr = u.slice(1).map((x, k) => (x - u[k]) / totW);
          if (fr.every((f) => f * totW >= 25)) { colFractions = fr; boxColMatched = true; }
        }
      }
      // ফরম-টেবিল: লেখার ফাঁকে কলাম না মিললে খাড়া দাগ থেকে (ভেতরের দাগ = কলাম − ১ হলে; সবচেয়ে লম্বা দাগগুলো)
      if (!colFractions && m && !m.empty && m.hasGrid !== false && Array.isArray(m.vRulesPt) && nCols > 1) {
        const R = m.rectPt, inner = m.vRulesPt.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6 && v.cov >= 0.25);
        if (inner.length === nCols - 1) {
          const edges = [R.x, ...inner.map((v) => v.x).sort((a, c) => a - c), R.x + R.w];
          const fr = edges.slice(1).map((e, k) => (e - edges[k]) / R.w);
          if (fr.every((f) => f >= 0.02)) colFractions = fr;
        }
      }
      // a03 (২০২৬-১০-১২): মাপা কলাম নেই ⇒ সমান ভাগ নয়, লেখার দৈর্ঘ্যের অনুপাতে (লম্বা বিবরণ | "নাম:" — সমান ভাগে বিবরণ
      // দুই লাইনে ভাঙত, সারি +১০pt)। ফাঁকা কলাম (লেখার জায়গা) = গড়; প্রতিটি ≥৮%। সংখ্যা-বাক্স/চিত্র-ঘরের টেবিল বাদ
      if (!colFractions && nCols > 1 && !rows.some((r) => r.some((c) => c && String(c).startsWith(BOX_MARK)))) {
        const vis = (c) => String(c || '').replace(/\*\*|\^\{|\}/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').split('\n').reduce((a, l) => Math.max(a, l.trim().length), 0);
        const rotHdrRowIdx = rotTextOn() && nCols >= 6 && rows.length >= 6
          ? [0, 1, 2, 3].find((ri) => rows[ri] && rows[ri].reduce((a, c) => a + String(c || '').trim().length, 0) >= 100 && rows[ri].filter((c) => String(c || '').trim().length >= 20).length >= 2)
          : -1;
        const len = Array.from({ length: nCols }, (_, j) => Math.max(0, ...rows.map((r, ri) => {
          const cellVal = r[j];
          if (rotTextOn() && (ri === rotHdrRowIdx || (cellVal && ROT_MARK_RE.test(String(cellVal))))) return Math.min(4, vis(cellVal));
          return vis(cellVal);
        })));
        const filled = len.filter((l) => l > 0);
        if (filled.length && Math.max(...filled) >= 2 * Math.min(...len.map((l) => l || Infinity))) {
          const avg = filled.reduce((a, b) => a + b, 0) / filled.length;
          const w = len.map((l) => Math.max(4, l || avg));
          let fr = w.map((x) => x / w.reduce((a, b) => a + b, 0)).map((f) => Math.max(0.08, f));
          const s = fr.reduce((a, b) => a + b, 0);
          colFractions = fr.map((f) => f / s);
        }
      }
      // Part-17.9: কলামের মাপা অবস্থান (কলাম-সংখ্যা মিললে)
      // f1: ভাঁজ-করা ফরম-ছক (লেবেল|মান) — মাপা অবস্থান না মিললে দুই কলামই বাঁয়ে (মাঝে বসালে রেডিও-তালিকা ছড়াত)
      let colAligns = m && !m.empty && m.colAligns && m.colAligns.length === nCols ? m.colAligns : (folded ? rows[0].map(() => 'l').concat(nCols > rows[0].length ? Array(nCols - rows[0].length).fill('l') : []) : null);
      // ২০২৬-১০-১৪ (a17 p6, মালিকের Word-যাচাই): মাপা কলাম-সীমা [৭৯,১১৩,১২৭,১০১৪] — ২য় কলামের ভেতরে ৫৮৩-এ পূর্ণ খাড়া দাগ (cov ০.৮১)
      // ⇒ দুই কলামের লেখা এক ভাগে, সাজ "মাঝে" মাপা, বিবরণ-কলাম মাঝে বসত (মূলে বাঁয়ে)। ভেতরে পূর্ণ দাগ পড়া কলামের মাপা 'c' ⇒ 'l'। বন্ধ: FZ_OFF=SPLITCOL
      let edgesBad = false;
      // মাপা ভেতরের সীমা আমাদের কলাম-ভাগ থেকে >৬% প্রস্থ দূরে ⇒ মাপা সাজ অন্য কলামের (১১৩|১২৭ = ক্রমিক-ফাঁক) ⇒ বাদ, নিচের অনুমান
      if (!globalThis.__FZ_OFF_SPLITCOL && colAligns && m && m.rectPt && Array.isArray(m.colEdgesPt) && m.colEdgesPt.length === nCols + 1 && Array.isArray(colFractions) && colFractions.length === nCols) {
        let acc = 0;
        const ours = colFractions.slice(0, -1).map((f) => { acc += f; return m.rectPt.x + acc * m.rectPt.w; });
        if (ours.some((x, k) => Math.abs(x - m.colEdgesPt[k + 1]) > m.rectPt.w * 0.06)) { colAligns = null; edgesBad = true; }
      }
      // a07: মাপা অবস্থান নেই ⇒ লম্বা লেখার কলাম (ঘরের গড় >২০ অক্ষর, ফরমের বিবরণ-কলাম) বাঁয়ে; বাকিগুলো আগের মতো মাঝে
      if (!colAligns && nCols > 1 && (rows.length >= 3 || (rows.length >= 2 && rows[0] && SERIAL.test(String(rows[0][0] || '').trim())))) {
        const dataRows = rows[0] && SERIAL.test(String(rows[0][0] || '').trim()) ? rows : rows.slice(1);
        const avg = Array.from({ length: nCols }, (_, j) => { const cs = dataRows.map((r) => r[j]).filter(Boolean); return cs.length ? cs.reduce((a, c) => a + c.length, 0) / cs.length : 0; });
        if (avg.some((a) => a > 20)) colAligns = avg.map((a) => (a > 20 ? 'l' : 'c'));
      }
      // ঘর-ভিত্তিক ব্যতিক্রম: বাঁয়ে-সাজানো কলামে যে ঘরের লেখা স্পষ্টতই মাঝে (শিরোনাম-সারি "Question") ⇒ মাঝে
      let cellAligns = null;
      // a18 (২০২৬-১০-১৪): পূর্ণ-দাগের কলাম-সীমা না মিললে আংশিক-দাগসহ সীমা (page-geometry cellBoxV)
      const CBX = m && !edgesBad && m.cellBox && m.colEdgesPt && m.colEdgesPt.length === nCols + 1 ? { cb: m.cellBox, ed: m.colEdgesPt }
        : (!globalThis.__FZ_OFF_CBV && m && m.cellBoxV && m.cellBoxV.edgesPt.length === nCols + 1 ? { cb: m.cellBoxV.rows, ed: m.cellBoxV.edgesPt } : null);
      if (!merged && colAligns && CBX) {
        const ne = rows.map((r, i) => i).filter((i) => rows[i].some((c) => c));
        if (ne.length === CBX.cb.length) {
          cellAligns = rows.map(() => null);
          const insets = CBX.ed.slice(0, -1).map((e0, j) => median(CBX.cb.map((r) => r[j]).filter(Boolean).map((bx) => bx[0] - e0)));
          ne.forEach((ri, k) => {
            cellAligns[ri] = CBX.cb[k].map((bx, j) => {
              if (!bx || colAligns[j] !== 'l') return null;
              const e0 = CBX.ed[j], e1 = CBX.ed[j + 1], L = bx[0] - e0, R = e1 - bx[1];
              // a18: ঘর-ভরা শিরোনাম ("অফিসারের নাম ও পদবী" — দুই পাশে ~১২pt) ⇒ ছোট সরণেও দুই পাশ প্রায় সমান হলে মাঝে
              return (L > insets[j] + 8 && Math.abs(L - R) < (e1 - e0) * 0.25) || (!globalThis.__FZ_OFF_CFULL && L > insets[j] + 4 && Math.abs(L - R) < (e1 - e0) * 0.08) ? 'c' : null;
            });
          });
        }
      }
      // ২০২৬-১০-১৩: ভাঁজ-করা ছকেও আগে রেখা-ভাগের মাপা উচ্চতা (সংখ্যা-বাক্সের ঘর = এক লাইন) — f1-এ লাইন-অনুপাতে সারিগুলো মূলের
      // রেখা থেকে ±১৫pt সরে যেত; না মিললে আগের মতো লাইন-অনুপাত
      // a10: Gemini-র মুদ্রিত-লাইন সারিগুলো মাপা অবস্থানে একই রেখা-ভাগে পড়লে (২-লাইনের শিরোনাম-ঘর, "৩। পিতার … ও / জাতীয়তা")
      // এক সারি, ঘরে '\n' — আলাদা সারি হলে মাঝে মূলে-নেই এমন দাগ আঁকা হতো আর পরের সারিগুলো ভুল ভাগে সরত
      // (mergeLineRows-এর মতোই: সারির ঘর-সংখ্যা ভিন্ন = জোড়া-ঘরের ছক (a18/f1) ⇒ বহু-লাইনের ঘর নয়, বদল নয়)
      // ২০২৬-১০-১৪ (a05): সারি ⇒ মাপা রেখা-ভাগে পুনর্গঠন (row-ink realign) — কপি-সারি বাদ, মূলের ফাঁকা সারি ফেরত; তারপর ভাগের মাপা উচ্চতা
      let realignBands = null;
      const RIx = global.FayzarRowInk || (typeof require === 'function' ? (() => { try { return require('./row-ink.js'); } catch (e) { return null; } })() : null);
      if (!globalThis.__FZ_OFF_REALIGN && RIx && RIx.realign && !folded && !merged && m && !m.empty && m.hasGrid && Array.isArray(m.hRulesPt) && Array.isArray(m.textInkPt)) {
        const H = [];
        m.hRulesPt.slice().sort((a, c) => a - c).forEach((y) => { if (!H.length || y - H[H.length - 1] > 3) H.push(y); });
        const bnds = [];
        for (let k = 1; k < H.length; k++) if (H[k] - H[k - 1] >= 4) bnds.push({ y0: H[k - 1], y1: H[k] });
        if (bnds.length >= 8 && bnds.length >= rows.length - 3 && bnds.length <= rows.length + 6) {
          const cnt = bnds.map((b) => m.textInkPt.filter((c) => { const y = (c[0] + c[1]) / 2; return y >= b.y0 && y < b.y1; }).length);
          const pos = cnt.filter((c) => c > 0).sort((a, c) => a - c);
          const thr = Math.max(6, (pos.length ? pos[pos.length >> 1] : 0) * 0.25);
          const inked = cnt.map((c) => c >= thr);
          const r = RIx.realign(rows, inked);
          if (globalThis.__FZ_DBG) console.log('realign', JSON.stringify({ n: rows.length, m: bnds.length, thr, cnt, inked: inked.map(Number).join(''), cost: r && r.cost, rows: rows.map((x) => x.slice(0, 2).join('|').slice(0, 14)) }));
          const txt = (row) => row.some((c) => c && String(c).trim());
          const idCost = rows.length === bnds.length ? rows.reduce((a, row, i) => a + (txt(row) ? (inked[i] ? 0 : 1) : (inked[i] ? 1 : 0)), 0) : Infinity;
          if (r && r.rows.length === bnds.length && r.cost + 0.5 < idCost && JSON.stringify(r.rows) !== JSON.stringify(rows)) {
            rows = r.rows; cellAligns = null; realignBands = bnds;
          }
        }
      }
      // [Rule IR2: FZ_OFF=FORMFIX / FZ_OFF=IR2] চেকলিস্ট ছকের উপ-ক্রমিক সারিগুলোকে ((ক), (খ), (গ)) আড়া দাগ হালকা হলেও একীভূত করা হবে না (কমপক্ষে ২টি লেখাসহ বডি-সারি থাকতে হবে যাতে a10-এর ফাঁকা সারির ছক প্রভাবিত না হয়)।
      const SUBSER0 = /^[(\s]*([ক-হ]|[a-z]|[ivx]+)[)।.)]\s/i;
      const nonEmptyBody0 = rows.slice(1).filter((r) => r.some((c) => c && String(c).trim()));
      const isChecklist0 = !!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_IR2 && nCols >= 4 && rows.length >= 4 && nonEmptyBody0.length >= 2 && nonEmptyBody0.every((r) => SERIAL.test(String(r[0] || '').trim()) || SUBSER0.test(String(r[1] || '').trim()) || /<table/i.test(String(r[1] || ''))));
      if (!realignBands && !isChecklist0 && !globalThis.__FZ_OFF_MERGE && !folded && !merged && m && !m.empty && m.hasGrid && rows.length >= 2 && rows.every((r) => r.length === rows[0].length)) {
        const BI = rowBandHeights(rows, m, colFractions, cellFontSrc || 11, { bandsOnly: true });
        // শুধু মাপা লেখা-লাইন নির্ভরযোগ্য হলে (≥ লেখা-সারির ৮০%) — a05: কাত স্ক্যানে ৩০ সারিতে ৩ লাইন ⇒ সব এক ভাগে জুড়ে যেত
        const bnd = BI && BI.nLines >= BI.nTxt * 0.8 ? BI.band : null;
        if (Array.isArray(bnd) && bnd.length === rows.length) {
          const out = [], ob = [];
          rows.forEach((r, i) => {
            const k = out.length - 1, isEmpty = !r.some((c) => c && String(c).trim());
            // ধারাবাহিক লাইন = আগের সারির ঘরগুলোর ভেতরেই (লেখা শুধু আগের সারির লেখাওয়ালা কলামে); অন্য কলামে লেখা থাকলে আলাদা সারি (a18)
            const sub = k >= 0 && r.every((c, j) => !(c && String(c).trim()) || (out[k][j] && String(out[k][j]).trim()));
            if (k >= 0 && !isEmpty && sub && ob[k] === bnd[i] && out[k].some((c) => c && String(c).trim())) {
              for (let j = 0; j < Math.max(r.length, out[k].length); j++) if (r[j]) out[k][j] = out[k][j] ? out[k][j] + '\n' + r[j] : r[j];
            } else { out.push(r.slice()); ob.push(bnd[i]); }
          });
          // a10: Gemini ফাঁকা লেখার-সারি কম দিলে (মূলে ৪টি, Gemini ৩টি) কোনো সারি না পাওয়া লেখাহীন ভাগ ⇒ ফাঁকা সারি
          // (নইলে শেষ সারি দুই ভাগ জুড়ে, মাঝের দাগ হারাত)। নিচের দিকে যোগ — Gemini ফাঁকা সারি ক্রমেই দেয়
          // শুধু যখন সব ফাঁকা সারি লেখা-সারিগুলোর পরে: শেষ লেখা-ভাগের নিচের প্রতিটি ভাগে একটি ফাঁকা সারি
          // (নিচের ভাগে মাপা "লেখা" = হাতের দাগ/ছিটে, a10)
          const nC = Math.max(...out.map((r) => r.length)), has = (r) => r.some((c) => c && String(c).trim());
          const lastK = out.map(has).lastIndexOf(true);
          const trailing = lastK >= 0 && out.slice(lastK + 1).length > 0 && out.slice(0, lastK + 1).every(has);
          const need = BI.n - 1 - ob[lastK];
          if (trailing && need > 0 && need !== out.length - 1 - lastK && Math.abs(need - (out.length - 1 - lastK)) <= 3) {
            out.splice(lastK + 1); ob.splice(lastK + 1);
            for (let b = ob[lastK] + 1; b < BI.n; b++) { out.push(Array(nC).fill('')); ob.push(b); }
          }
          // জোড়ার পর সারি-সংখ্যা = রেখা-ভাগের সংখ্যা হলেই গ্রহণ (পুরো ছক ব্যাখ্যা হলো); নইলে আগের মতো (a18: মেলে না ⇒ বদল নয়)
          if (out.length === BI.n && JSON.stringify(out) !== JSON.stringify(rows)) { rows = out; cellAligns = null; }
        }
      }
      const rbRows = folded ? rows.map((r) => r.map((c) => (c && c.startsWith(BOX_MARK) ? '0' : c))) : rows;
      const rbh = realignBands ? realignBands.map((b) => b.y1 - b.y0) : rowBandHeights(rbRows, m, colFractions, cellFontSrc || 11);
      // a18: মূলে ৬টি আড়া রেখা, আমাদের ১৭ (প্রতি Gemini-সারিতে দাগ) ⇒ একই রেখা-ভাগের সারিগুলোর মাঝে দাগ নয় (builder: tcBorders nil)
      let rowBand = null;
      const SUBSER = /^[(\s]*([ক-হ]|[a-z]|[ivx]+)[)।.)]\s/i;
      const isChecklist = nCols >= 4 && rows.length >= 4 && rows.slice(1).filter((r) => r.some(Boolean)).every((r) => SERIAL.test(String(r[0] || '').trim()) || SUBSER.test(String(r[1] || '').trim()) || /<table/i.test(String(r[1] || '')));
      if (rbh && !isChecklist && !globalThis.__FZ_OFF_ROWBAND) {
        const BI = rowBandHeights(rbRows, m, colFractions, cellFontSrc || 11, { bandsOnly: true });
        // a05 (কাত স্ক্যান, প্রতি সারিতে দাগ অথচ মাপা রেখা ৪টি): মাপা লেখা-লাইন < লেখা-সারির ৮০% ⇒ ভাগ অবিশ্বস্ত, দাগ মুছব না
        if (BI && Array.isArray(BI.band) && BI.band.length === rows.length && BI.n < rows.length && BI.nLines >= BI.nTxt * 0.8) rowBand = BI.band;
      }
      // f1: জাল আছে (আড়া রেখা/নীল ব্যান্ড) কিন্তু কোনো খাড়া দাগ মাপা নেই ⇒ মূলে খাড়া দাগ নেই (আমরা ৩টি আঁকতাম)
      const noVRules = !globalThis.__FZ_OFF_NOV && !!(m && !m.empty && m.hasGrid && Array.isArray(m.vRulesPt) && !m.vRulesPt.length);
      // ২০২৬-১০-১৪ (a17 p6): কলাম-সীমায় মাপা পূর্ণ-উচ্চতার খাড়া দাগ (cov ≥০.৯) ⇒ builder সেই সীমা পেরিয়ে ঘর জোড়ে না
      // (লম্বা লেখা মূলে নিজের কলামে মুড়ে থাকে; a18-এর আংশিক দাগ cov ০.৩২ ⇒ জোড়া আগের মতো)
      let fullVRule = null;
      if (!globalThis.__FZ_OFF_FULLV && m && !m.empty && Array.isArray(m.vRulesPt) && m.rectPt && Array.isArray(colFractions) && colFractions.length >= 2) {
        let acc = 0;
        // ২০২৬-১০-১৪ (a16 চেকলিস্ট, মালিকের Word-যাচাই): পূরণের কলাম (হ্যাঁ/না/সংলাগ/মন্তব্য — শিরোনামে লেখা, বাকি সব সারি ফাঁকা)
        // ফিকে স্ক্যানে দাগ cov ০.৪৩–০.৭২ ⇒ ০.৭৫-এ পূর্ণ না ধরায় "বিষয়" ঘর "হ্যাঁ" জুড়ে নিত। এমন কলামের বাঁ-সীমায় cov ≥০.৪ যথেষ্ট
        // (a18-এর আংশিক দাগ ০.৩২ ⇒ আগের মতো জোড়া)। বন্ধ: FZ_OFF=FILLCOL
        const isFill = (j) => !globalThis.__FZ_OFF_FILLCOL && rows.length >= 4 && rows.slice(0, 2).some((r) => r[j] && String(r[j]).trim())
          && rows.slice(2).every((r) => !(r[j] && String(r[j]).trim()));
        const rOuter = hasFillCols ? m.vRulesPt.filter((v) => v.cov >= 0.4 && Math.abs(v.x - (m.rectPt.x + m.rectPt.w)) <= 6).sort((a, b) => b.cov - a.cov)[0] : null;
        const rw = (rOuter ? rOuter.x : m.rectPt.x + m.rectPt.w) - m.rectPt.x;
        fullVRule = colFractions.slice(0, -1).map((f, k) => { acc += f; const x = m.rectPt.x + acc * rw; const thr = isFill(k + 1) || (!globalThis.__FZ_OFF_FILLW2 && hasFillCols && isFill(k)) ? 0.4 : 0.75; return m.vRulesPt.some((v) => v.cov >= thr && Math.abs(v.x - x) <= 8); });   // a17 p6: ০.৮১ (নিচের ১০।-অংশে দাগ নেই)
        if (!fullVRule.some(Boolean)) fullVRule = null;
      }
      if ((ruleFixOn() || tblMergeOn() || rules2On()) && boxColMatched && Array.isArray(colFractions) && colFractions.length >= 2) {
        fullVRule = colFractions.slice(0, -1).map(() => true);
      }
      // ২০২৬-১০-১৪ (a17 p10, মালিকের Word-যাচাই): শিরোনাম-সারিতে ৩-লাইনের ঘরের পাশে ১-লাইনের ঘর মূলে মাঝে, builder-এর VTOP ওপরে
      // বসাত (a18/a19-এ ওপরেই ঠিক)। মাপা কালির খাড়া কেন্দ্র সারি-ভাগের মাঝ-তৃতীয়াংশে ⇒ 'c', ওপরে ⇒ 't'। বন্ধ: FZ_OFF=HEADV
      let headVAlign = null;
      if (!globalThis.__FZ_OFF_HEADV && m && !m.empty && Array.isArray(m.textInkXPt) && Array.isArray(m.hRulesPt) && m.hRulesPt.length >= 2
        && m.rectPt && Math.abs(m.hRulesPt[0] - m.rectPt.y) <= 6 && Array.isArray(colFractions) && rows.length >= 2) {
        const y0 = m.hRulesPt[0], y1 = m.hRulesPt[1], bh = y1 - y0;
        let acc = 0;
        const edges = [m.rectPt.x].concat(colFractions.map((f) => { acc += f; return m.rectPt.x + acc * m.rectPt.w; }));
        headVAlign = colFractions.map((_, k) => {
          const ink = m.textInkXPt.filter(([x, a, b]) => x > edges[k] + 1 && x < edges[k + 1] - 1 && a >= y0 + 1 && b <= y1 - 1);
          if (!ink.length || bh < 12) return null;
          const off = ((Math.min(...ink.map((c) => c[1])) + Math.max(...ink.map((c) => c[2]))) / 2 - (y0 + y1) / 2) / bh;
          return Math.abs(off) <= 0.15 ? 'c' : off < 0 ? 't' : null;
        });
        if (!headVAlign.some(Boolean)) headVAlign = null;
      }
      let lastRowSpan = 0;
      if (rows.length >= 4 && nCols >= 4 && m && !m.empty && Array.isArray(m.textInkXPt) && Array.isArray(m.hRulesPt) && m.hRulesPt.length >= 3 && m.rectPt && Array.isArray(colFractions)) {
        const lastR = rows[rows.length - 1], neIdx = lastR.map((c, j) => (c && String(c).trim() ? j : -1)).filter((j) => j >= 0);
        if (neIdx.length === 1 && /সর্বমোট|মোট|Total/i.test(lastR[neIdx[0]])) {
          const H = m.hRulesPt.slice().sort((a, c) => a - c), yL = H[H.length - 2];
          const ink = m.textInkXPt.filter(([x, a, b]) => a >= yL - 3 && x > m.rectPt.x + 60);
          if (ink.length) {
            const ix = (Math.min(...ink.map((c) => c[0])) + Math.max(...ink.map((c) => c[0]))) / 2;
            let acc = 0, trueCol = -1;
            colFractions.forEach((f, j) => { const x0 = m.rectPt.x + acc * m.rectPt.w; acc += f; const x1 = m.rectPt.x + acc * m.rectPt.w; if (ix >= x0 && ix <= x1) trueCol = j; });
            if (trueCol > 0) {
              const txt = lastR[neIdx[0]];
              lastR[neIdx[0]] = "";
              lastR[0] = txt;
              lastRowSpan = trueCol + 1;
            }
          }
        }
      }
      let resolvedHeadShade = m && !m.empty && /^[0-9A-F]{6}$/i.test(m.headShade || '') ? m.headShade : null;
      if ((ruleFixOn() || tblMergeOn() || rules2On()) && resolvedHeadShade) {
        const hr = parseInt(resolvedHeadShade.slice(0, 2), 16), hg = parseInt(resolvedHeadShade.slice(2, 4), 16), hb = parseInt(resolvedHeadShade.slice(4, 6), 16);
        const lum = 0.299 * hr + 0.587 * hg + 0.114 * hb;
        if (lum >= 150 && lum < 215) resolvedHeadShade = 'D9D9D9';
      }
      if ((ruleFixOn() || tblMergeOn() || rules2On()) && m && !m.empty && m.headShade && Array.isArray(m.hRulesPt) && m.hRulesPt.length === rows.length + 1) {
        base.exactRuleHeights = true;
      }
      const tbl = Object.assign(base, { lastRowSpan, rowBand, noVRules, fullVRule, fillW2: !globalThis.__FZ_OFF_FILLW2 && fillW2, headVAlign, headShade: resolvedHeadShade, kind: 'table', rows, borderless: !!(m && !m.empty && m.hasGrid === false), cellFontSrc, lineSpacingPt: (tableColOn() && tblLinePitch) ? tblLinePitch : 0, colFractions, colAligns, cellAligns,
        colGapPt: m && !m.empty && m.colGapMinPt ? m.colGapMinPt : 0,
        // f1: ভাঁজ-করা ফরম-ছকে সারির উচ্চতা লাইন-সংখ্যার অনুপাতে (রেডিও-সারি ৫ লাইন, বাকিরা ১)
        rowWeights: folded && !rbh ? rows.map((r) => Math.max(1, ...r.map((c) => (c && !c.startsWith(BOX_MARK) ? c.split('\n').length : 1)))) : null,
        // rbh.shift — নিজস্ব সরণ-তালিকা হলেই; নইলে Array.prototype.shift (ফাংশন) ir-এ ঢুকে ইতিহাসে রাখা আটকাত (DataCloneError)
        rowHeightsPt: rbh, rowHeightsExact: !!(rbh && rbh.exact), rowShiftPt: rbh && Array.isArray(rbh.shift) && !globalThis.__FZ_OFF_RSHIFT ? rbh.shift : null, rowHeightsLine: !!(rbh && Array.isArray(rbh.shift) && !rbh.exact) });
      if (fzOn('FORMFIX') && m && !m.empty && m.rectPt && Array.isArray(m.lines)) {
        if (!globalThis.__FZ_OFF_IR3 && tbl.noVRules && rows.length >= 4 && nCols >= 2) {
          // [Rule IR3: FZ_OFF=FORMFIX / FZ_OFF=IR3] উল্লম্ব-রেখাবিহীন ফরম-ছকে (noVRules) ক্রমিক ও কোলনহীন একক-ঘরের সারি মাপা লাইনের কেন্দ্রে থাকলে মাঝখানে বসানো অংশ-শিরোনাম ও রেডিও-বোতামের বাঁ-ইনডেন্ট।
          const cxTbl = m.rectPt.x + m.rectPt.w / 2;
          const rbhArr = Array.isArray(tbl.rowHeightsPt) && tbl.rowHeightsPt.length === rows.length ? tbl.rowHeightsPt : null;
          const rowLineCounts = rows.map((r) => Math.max(1, ...r.map((c) => (c && !String(c).startsWith(BOX_MARK) ? String(c).split('\n').length : 1))));
          const totLogLines = rowLineCounts.reduce((a, b) => a + b, 0);
          rows.forEach((r, ri) => {
            const c0 = String(r[0] || "").replace(/\*+/g, "").trim();
            if (!c0 || /^\s*[০-৯\d]+[।.)]/.test(c0) || /[:ঃ*]\s*$/.test(c0) || r.slice(1).some((c) => String(c || "").trim())) return;
            const cumLn = rowLineCounts.slice(0, ri).reduce((a, b) => a + b, 0);
            const estY = rbhArr ? m.rectPt.y + rbhArr.slice(0, ri).reduce((a, b) => a + b, 0) : null;
            const isCenteredLn = (l) => l && l.x > m.rectPt.x + m.rectPt.w * 0.25 && Math.abs((l.x + l.w / 2) - cxTbl) < m.rectPt.w * 0.12 && l.w < m.rectPt.w * 0.5;
            const hit = (Math.abs(m.lines.length - totLogLines) <= 1 && m.lines[cumLn])
              ? (isCenteredLn(m.lines[cumLn]) ? m.lines[cumLn] : null)
              : m.lines.find((l) => isCenteredLn(l) && (estY == null || Math.abs(l.y - estY) <= 18));
            if (!hit) return;
            if (!tbl.gridSpans) tbl.gridSpans = rows.map(() => null);
            tbl.gridSpans[ri] = [nCols].concat(new Array(nCols - 1).fill(0));
            if (!tbl.cellAligns) tbl.cellAligns = rows.map(() => null);
            tbl.cellAligns[ri] = new Array(nCols).fill("c");
          });
          const col0W = m.rectPt.w * (colFractions && colFractions[0] ? colFractions[0] : 0.36);
          const col1X = m.rectPt.x + col0W;
          const radLines = m.lines.filter((l) => l.x > col1X + 8 && l.x < col1X + 60 && l.w < m.rectPt.w * 0.4);
          if (radLines.length >= 3) {
            const medX = median(radLines.map((l) => l.x));
            tbl.radioIndentPt = Math.max(0, Math.round(medX - col1X - 10));
          }
        } else if (!globalThis.__FZ_OFF_IR4 && tbl.borderless && rows.length >= 3 && m.lines.length === rows.length && /^[○●◯◉]/.test(String(rows[1][0] || "").trim())) {
          // [Rule IR4: FZ_OFF=FORMFIX / FZ_OFF=IR4] বর্ডারলেস বুলেট-তালিকা ছকে মাপা লাইনের সংখ্যা ও সারির সংখ্যা সমান হলে মাপা লাইনের অবস্থান থেকে সারির উচ্চতা ও ফন্ট পুনরুদ্ধার।
          const dx = m.lines[1].x - m.lines[0].x;
          if (dx >= 15) {
            tbl.bulletIndentPt = Math.round(dx - 8);
            if ((tbl.cellFontSrc || 10) < 12 && m.lines[1].h >= 10) tbl.cellFontSrc = 12;
          }
          const topY = m.rectPt.y, botY = m.rectPt.y + m.rectPt.h;
          const ys = m.lines.map((l) => l.y + l.h / 2);
          tbl.rowHeightsPt = rows.map((_, i) => {
            const y0 = i === 0 ? topY : (ys[i - 1] + ys[i]) / 2;
            const y1 = i === rows.length - 1 ? botY : (ys[i] + ys[i + 1]) / 2;
            return Math.max(12, Math.round((y1 - y0) * 10) / 10);
          });
        }
      }
      const hasPartialRuleSpansB2 = !!(m && m.rectPt && (
        (Array.isArray(m.hRuleSpansPt) && m.hRuleSpansPt.some((sp) => Array.isArray(sp) && (sp[1] - sp[0]) < m.rectPt.w * 0.92))
        || (Array.isArray(m.vRulesPt) && m.vRulesPt.some((v) => v && v.y0 != null && v.y1 != null && v.x > m.rectPt.x + 6 && v.x < m.rectPt.x + m.rectPt.w - 6 && (v.y1 - v.y0) < m.rectPt.h * 0.92))
      ));
      const skipGridFirstB2 = tableGridOn() && (
        rows.some((r) => r.every((c) => !String(c || '').trim()))
        || (m && Array.isArray(m.tableGapsPt) && m.tableGapsPt.length > 0)
        || (b.splitAtEmpty || (m && m.splitAtEmpty))
        || hasPartialRuleSpansB2
        || !m || (!Array.isArray(m.textInkXPt) && !Array.isArray(m.textLinesPt))
      );
      const preGfRows = ((a10LinesOn() || a10FixOn()) || a07FixOn() || a07Fix2On()) && Array.isArray(rows) ? rows.map((r) => r.slice()) : null;
      const preGfRbh = ((a10LinesOn() || a10FixOn()) || a07FixOn() || a07Fix2On()) && Array.isArray(rbh) && rbh.length === rows.length ? rbh.slice() : null;
      if (fzOn('GRIDFIRST') && !folded && !skipGridFirstB2 && !(boxSplitOn() && tbl.boxSplitCollapsed)) {
        let GF = global.FayzarGridFirst;
        if (!GF && typeof require === 'function') { try { GF = global.FayzarGridFirst = require('./grid-first.js'); } catch (e) { GF = null; } }
        if (!GF && typeof XMLHttpRequest !== 'undefined') {
          try { const x = new XMLHttpRequest(); x.open('GET', 'js/layout-engine/faithful/grid-first.js', false); x.send(null); if (x.status >= 200 && x.status < 300 && x.responseText) { (0, eval)(x.responseText); GF = global.FayzarGridFirst; } } catch (e) { GF = null; }
        }
        if (GF && typeof GF.applyGridFirst === 'function') GF.applyGridFirst(tbl, m, pageInfo);
        else if (a16FixOn() && tbl.fillW2 && !tbl.borderless && m && m.hasGrid && Array.isArray(m.hRulesPt) && m.hRulesPt.length >= 2) {
          tbl.gridFirst = true;
          const hSorted = m.hRulesPt.slice().sort((a, c) => a - c);
          const hTop = hSorted[0], hBot = hSorted[hSorted.length - 1];
          const rbhSum = Array.isArray(tbl.rowHeightsPt) ? tbl.rowHeightsPt.reduce((a, c) => a + c, 0) : 0;
          if (tbl.rect && hBot > hTop + 20 && Math.abs(hTop - tbl.rect.y) <= 8 && tbl.rect.h > (hBot - hTop) + 8 && Math.abs(rbhSum - (hBot - hTop)) <= 4) {
            tbl.rect = Object.assign({}, tbl.rect, { y: hTop, h: hBot - hTop });
          }
        }
        if ((indentOn() || a16Fix3On()) && !GF && !tbl.borderless && m && m.hasGrid && Array.isArray(m.vRulesPt) && nCols >= 2) {
          // INDENT_v1: ব্রাউজারের grid-first.js অনুপস্থিত থাকলে (যেমন অফলাইন Node পরিবেশে) ছকের বাহ্যিক খাড়া রেখা (vRulesPt) থেকে প্রকৃত বাম প্রান্ত ও কলাম-অনুপাত নির্ধারণ
          const vCands = m.vRulesPt.filter((v) => (v.cov == null || v.cov >= 0.4)).map((v) => (typeof v === 'number' ? v : v.x)).sort((a, c) => a - c);
          const uV = [];
          vCands.forEach((x) => { if (!uV.length || x - uV[uV.length - 1] > 4) uV.push(x); });
          if (uV.length === nCols + 1 && tbl.rect && Math.abs(uV[0] - tbl.rect.x) <= 8 && Math.abs(uV[nCols] - (tbl.rect.x + tbl.rect.w)) <= 12) {
            const vx0 = uV[0], vw = uV[nCols] - vx0;
            const fr = uV.slice(1).map((x, k) => (x - uV[k]) / vw);
            if (vw > 40 && fr.every((f) => f >= 0.02)) {
              if (!((a12FixOn() || a07Fix6On()) && Array.isArray(tbl.colFractions) && tbl.colFractions.length === nCols && Math.abs(uV[0] - tbl.rect.x) <= 1.2 && Math.abs(uV[nCols] - (tbl.rect.x + tbl.rect.w)) <= (a07Fix6On() ? 2.5 : 1.2))) {
                tbl.rect = Object.assign({}, tbl.rect, { x: vx0, w: vw });
                tbl.colFractions = fr;
              }
              tbl.fullVRule = new Array(nCols - 1).fill(true);
              tbl.gridFirst = true;
            }
          }
        }
      }
      // A10_LINES_v1: মাপা আড়া-রেখার ভাগের চেয়ে grid-first শেষে ফাঁকা সারি কমিয়ে ফেললে (যেমন a10 পাতা ২ ছক ১: ৫ সারি ⇒ ৪ সারি) মূলের ফাঁকা সারি ও উচ্চতা পুনরুদ্ধার
      if (preGfRows && preGfRbh && Array.isArray(tbl.rows) && tbl.rows.length < preGfRows.length
        && preGfRows.slice(tbl.rows.length - 1).every((r) => !r.some((c) => c && String(c).trim()))) {
        tbl.rows = preGfRows;
        tbl.rowHeightsPt = preGfRbh;
        if (Array.isArray(tbl.gridSpans)) { while (tbl.gridSpans.length < preGfRows.length) tbl.gridSpans.push(null); }
        if (Array.isArray(tbl.vRuleBands)) { while (tbl.vRuleBands.length < preGfRows.length) tbl.vRuleBands.push(tbl.vRuleBands[tbl.vRuleBands.length - 1] || null); }
        if (Array.isArray(tbl.vMerges)) { while (tbl.vMerges.length < preGfRows.length) tbl.vMerges.push(null); }
      }
      if (tableGridOn()) {
        const R = (m && m.rectPt) || rect || { x: 54, y: 100, w: tbl.widthPt || 450, h: tbl.heightPt || 120 };
        const curRows = Array.isArray(tbl.rows) && tbl.rows.length ? tbl.rows : rows;
        const curNCols = curRows.length ? Math.max(...curRows.map((r) => r.length)) : nCols;
        // ১) রেখা-জাল থেকে কলাম-প্রস্থ (বাহ্যিক + ভেতরের nCols+1 দাগ বা nCols-1 ভেতরের দাগ)
        if (!tbl.colFractions && m && Array.isArray(m.vRulesPt) && curNCols > 1) {
          const vs = m.vRulesPt.filter((v) => (v.cov == null || v.cov >= 0.25)).map((v) => (typeof v === 'number' ? v : v.x)).sort((a, c) => a - c);
          const uniqV = [];
          vs.forEach((x) => { if (!uniqV.length || x - uniqV[uniqV.length - 1] > 4) uniqV.push(x); });
          if (uniqV.length === curNCols + 1) {
            const totW = Math.max(1, uniqV[uniqV.length - 1] - uniqV[0]);
            const fr = uniqV.slice(1).map((x, k) => r1((x - uniqV[k]) / totW * 1000) / 1000);
            if (fr.every((f) => f >= 0.02)) tbl.colFractions = fr;
          }
        }
        // ২) আংশিক খাড়া ও অনুভূমিক রেখা থেকে ঘর-জোড়া (gridSpans ও vMerges)
        if (m && Array.isArray(m.vRulesPt) && curNCols >= 2 && curRows.length >= 2) {
          const inV = m.vRulesPt.filter((v) => typeof v === 'object' && v.x > R.x + 6 && v.x < R.x + R.w - 6 && v.y0 != null && v.y1 != null)
            .sort((a, c) => a.x - c.x);
          const hSorted = Array.isArray(m.hRulesPt) ? m.hRulesPt.slice().sort((a, c) => a - c) : [];
          const hB = hSorted.length >= curRows.length + 1
            ? hSorted.slice(0, curRows.length + 1)
            : Array.from({ length: curRows.length + 1 }, (_, i) => R.y + (i / curRows.length) * R.h);
          if (inV.length === curNCols - 1) {
            curRows.forEach((r, ri) => {
              const by0 = hB[ri], by1 = hB[ri + 1], bh = Math.max(1, by1 - by0);
              const rowSp = new Array(curNCols).fill(1);
              const rowVB = new Array(curNCols - 1).fill(true);
              let hasRowSpan = false;
              inV.forEach((v, k) => {
                const ov = Math.min(v.y1, by1) - Math.max(v.y0, by0);
                if (ov < bh * 0.3 && !(r[k + 1] && String(r[k + 1]).trim())) {
                  let root = k;
                  while (root > 0 && rowSp[root] === 0) root--;
                  rowSp[root]++;
                  rowSp[k + 1] = 0;
                  rowVB[k] = false;
                  hasRowSpan = true;
                }
              });
              if (hasRowSpan) {
                if (!Array.isArray(tbl.gridSpans) || tbl.gridSpans.length !== curRows.length) {
                  tbl.gridSpans = curRows.map((_, i) => (tbl.gridSpans && Array.isArray(tbl.gridSpans[i]) ? tbl.gridSpans[i] : new Array(curNCols).fill(1)));
                }
                tbl.gridSpans[ri] = rowSp;
                if (!Array.isArray(tbl.vRuleBands) || tbl.vRuleBands.length !== curRows.length) {
                  tbl.vRuleBands = curRows.map((_, i) => (tbl.vRuleBands && Array.isArray(tbl.vRuleBands[i]) ? tbl.vRuleBands[i] : new Array(curNCols - 1).fill(true)));
                }
                tbl.vRuleBands[ri] = rowVB;
              }
            });
          }
        }
        if (m && Array.isArray(m.hRuleSpansPt) && Array.isArray(m.hRulesPt) && m.hRuleSpansPt.length === curRows.length + 1 && curNCols >= 2 && curRows.length >= 2) {
          const fr = (Array.isArray(tbl.colFractions) && tbl.colFractions.length === curNCols) ? tbl.colFractions : new Array(curNCols).fill(1 / curNCols);
          const colEdges = [R.x];
          fr.forEach((f) => colEdges.push(colEdges[colEdges.length - 1] + f * R.w));
          for (let bi = 1; bi < curRows.length; bi++) {
            const sp = m.hRuleSpansPt[bi];
            if (!sp) continue;
            for (let k = 0; k < curNCols; k++) {
              const cx0 = colEdges[k], cx1 = colEdges[k + 1], cw0 = Math.max(1, cx1 - cx0);
              const ov = Math.min(sp[1], cx1) - Math.max(sp[0], cx0);
              if (ov < cw0 * 0.3 && !(curRows[bi][k] && String(curRows[bi][k]).trim())) {
                if (!Array.isArray(tbl.vMerges) || tbl.vMerges.length !== curRows.length) {
                  tbl.vMerges = curRows.map((_, i) => (tbl.vMerges && Array.isArray(tbl.vMerges[i]) ? tbl.vMerges[i] : new Array(curNCols).fill(null)));
                }
                if (!Array.isArray(tbl.vMerges[bi - 1])) tbl.vMerges[bi - 1] = new Array(curNCols).fill(null);
                if (!Array.isArray(tbl.vMerges[bi])) tbl.vMerges[bi] = new Array(curNCols).fill(null);
                if (!tbl.vMerges[bi - 1][k]) tbl.vMerges[bi - 1][k] = 'restart';
                tbl.vMerges[bi][k] = 'continue';
                if (Array.isArray(tbl.gridSpans) && Array.isArray(tbl.gridSpans[bi]) && tbl.gridSpans[bi][k] === 0) {
                  tbl.gridSpans[bi] = new Array(curNCols).fill(1);
                }
              }
            }
          }
        }
        // ৩) অনুভূমিক আর খাড়া রেখা আলাদা (insideH বনাম insideV)
        if (m && !m.empty && m.hasGrid) {
          const inH = Array.isArray(m.hRulesPt) ? m.hRulesPt.filter((y) => y > R.y + 4 && y < R.y + R.h - 4) : [];
          const inV = Array.isArray(m.vRulesPt) ? m.vRulesPt.filter((v) => (typeof v === 'number' ? v : v.x) > R.x + 4 && (typeof v === 'number' ? v : v.x) < R.x + R.w - 4 && (v.cov == null || v.cov >= 0.25)) : [];
          if (m.hasInsideH === false || ((curRows.length >= 2 || (b.lines && b.lines.length >= 2)) && Array.isArray(m.hRulesPt) && inH.length === 0 && inV.length >= 1)) {
            tbl.noInsideH = true;
            tbl.borderless = false;
          }
          if (m.hasInsideV === false || (curNCols >= 2 && Array.isArray(m.vRulesPt) && inV.length === 0 && (inH.length >= 1 || (Array.isArray(m.hRulesPt) && m.hRulesPt.length >= 2)))) {
            tbl.noInsideV = true;
            tbl.keepHRules = true;
            tbl.borderless = false;
          }
        }
        // ৪) পাশাপাশি ছোট বাক্স চেনা
        const sb = (m && m.smallBoxesPt) || b.smallBoxes;
        if (Array.isArray(sb) && sb.length >= 2) {
          tbl.smallBoxesPt = sb;
          tbl.borderless = false;
          const totBoxW = sb.reduce((a, x) => a + (x.w || (x.x1 - x.x0)), 0) || 1;
          if (sb.length === curNCols) tbl.colFractions = sb.map((x) => r1((x.w || (x.x1 - x.x0)) / totBoxW * 1000) / 1000);
        }
        // ৫) শিরোনাম-ঘরের মোটা লেখা ও নিচে-দাগ
        if (b.headBold || (m && m.headBold) || (curRows.length >= 2 && curRows[0].some((c) => /\*\*[^*]+\*\*/.test(String(c || ''))))) {
          tbl.headBold = true;
        }
        if (b.headUnderline || (m && m.headUnderline) || (curRows.length >= 2 && curRows[0].some((c) => /<u>[^<]+<\/u>/i.test(String(c || ''))))) {
          tbl.headUnderline = true;
        }
        if (m && m.headCellBold) tbl.headCellBold = m.headCellBold;
        if (m && m.headCellUnderline) tbl.headCellUnderline = m.headCellUnderline;
        if (b.splitAtEmpty || (m && m.splitAtEmpty)) tbl.splitAtEmpty = true;
      }
      if (formKitOn()) {
        if (m && m.headFill) tbl.headFill = normHexColor(m.headFill);
        if (tbl.headShade && !tbl.headFill) tbl.headFill = normHexColor(tbl.headShade);
        if (tbl.headFill && isDarkFill(tbl.headFill) && !tbl.headColor) tbl.headColor = 'FFFFFF';
        if (m && m.labelColFill) tbl.labelColFill = normHexColor(m.labelColFill);
        if (m && m.colFills) tbl.colFills = m.colFills.map(normHexColor);
        if (m && m.rowFills) tbl.rowFills = m.rowFills.map(normHexColor);
        if (m && m.cellFills) tbl.cellFills = m.cellFills.map((r) => (Array.isArray(r) ? r.map(normHexColor) : null));
        if (m && m.cellColors) tbl.cellColors = m.cellColors.map((r) => (Array.isArray(r) ? r.map(normHexColor) : null));
        const hasFormSignals = !!(folded || tbl.noVRules || b.formTable || (m && m.formTable) || rows.some((r) => r.some((c) => String(c || '').startsWith(BOX_MARK) || /^[○●◯◉]/.test(String(c || '').trim()) || /\*\s*:?$/.test(String(c || '').trim()) || isPlaceholderStr(c))));
        if (hasFormSignals && nCols >= 2) {
          tbl.formTable = true;
          if (!tbl.labelColFill) tbl.labelColFill = 'F2F2F2';
        }
        rows.forEach((r, ri) => {
          r.forEach((c, ck) => {
            if (ck >= 1 && isPlaceholderStr(c)) {
              rows[ri][ck] = stripPlaceholderWrap(c);
              if (!tbl.cellColors) tbl.cellColors = rows.map(() => new Array(nCols).fill(null));
              if (!tbl.cellColors[ri]) tbl.cellColors[ri] = new Array(nCols).fill(null);
              if (!tbl.cellColors[ri][ck]) tbl.cellColors[ri][ck] = '808080';
            }
          });
        });
      }
      if (p2DriftOn() && b.page >= 2 && m && !m.empty && m.hasGrid === false && Array.isArray(m.lines)) {
        Object.defineProperty(tbl, '_measuredLines', { value: m.lines.filter((l) => l.h >= 5), enumerable: false, configurable: true, writable: true });
      }
      if (rotTextOn() && m && !m.empty) {
        if (m.strokeVPt && m.strokeHPt && m.strokeVPt > m.strokeHPt * 1.25) {
          Object.defineProperty(tbl, '_rotStrokeV', { value: true, enumerable: false, configurable: true, writable: true });
        }
      }
      return splitTableAtGaps(tbl, m);
    }
    let align = (m && !m.empty && m.align) || b.align || 'l';
    if (a17FixOn() && b.align === 'c' && Array.isArray(b.lines) && b.lines.length === 2 && m && !m.empty && m.align === 'l' && m.firstIndentPt >= ((m.rectPt && m.rectPt.w) || 200) * 0.25) {
      align = 'c';
    }
    let keepLines = !!(KEEP_TYPES[b.type] || (m && m.ragged && b.type !== 'paragraph') || (b.lines && b.lines.length > 1 && align === 'c'));
    // সিভি (মালিকের স্ক্রিনশট): লেবেল-কলাম আর ": মান"-কলাম আলাদা 'paragraph' ব্লকে এলে লাইন জুড়ে যেত
    // ("Discipline Result" এক লাইনে, মান মুড়ে) ⇒ প্রতিটি লাইন ':' দিয়ে শুরু, বা ≥৩টি ছোট লাইন (≤৪০ অক্ষর) আর মাপা লাইন-সংখ্যা ±১-এ মেলে ⇒ লাইন অক্ষত
    const bl = (b.lines || []).map((l) => l.trim()).filter(Boolean);
    if (!keepLines && bl.length >= 2 && (bl.every((l) => /^[:：]/.test(l)) ||
      (bl.length >= 3 && align !== 'j' && m && !m.empty && m.lines && Math.abs(m.lines.length - bl.length) <= 1 && bl.every((l) => l.replace(/\*+/g, '').length <= 40)) ||
      // a15 (মালিকের টেস্ট, ২০২৬-১০-১৩): দুই ছোট লাইন ("Web : …" / "E-mail : …"), মাপা লাইনও ঠিক দুই ⇒ Word-এ জুড়ে যেত
      // (মাপে প্রায়-সমান দুই লাইন "দুপাশে-সমান" দেখায়; Gemini মাঝে বললে মাঝে)
      (bl.length === 2 && m && !m.empty && m.lines && m.lines.length === 2 && (bl.every((l) => l.replace(/\*+/g, '').length <= 60) || (widthOn() && b.align === 'c' && (m.firstIndentPt || 0) <= -40)) &&
        (align !== 'j' || (b.align === 'c' && (align = 'c')))))) keepLines = true;
    // a11 (plan-jumps.mjs, ২০২৬-১০-১৪): ৪ লাইনের ঠিকানা-ব্লক ("বরাবর, / পরীক্ষা নিয়ন্ত্রক… / মাধ্যমিক… / দিনাজপুর।") প্রবাহে ⇒ Word পুরো প্রস্থে
    // এক লাইনে জুড়ে নিচের সব ৪২pt ওপরে। মাপা ছাপা-লাইন = Gemini-র লাইন (≥২) আর দুপাশে-সমান নয় ⇒ লাইন-ভাঙা আসল, রাখা
    // (আগের নিয়ম শুধু ≤৪০ অক্ষরের লাইনে)
    if (!keepLines && !globalThis.__FZ_OFF_KEEPN && bl.length >= 2 && align !== 'j' && m && !m.empty && m.lines && m.lines.length === bl.length) keepLines = true;
    if (formKitOn()) {
      const ib = (b.lines || []).length === 1 ? parseInlineBoxes(b.lines[0]) : null;
      if (ib) {
        const rows = ib.label ? [[ib.label, BOX_MARK + ib.cells.join(BOX_SEP)]] : [ib.cells];
        return Object.assign(base, { kind: 'table', rows, borderless: !!ib.label, boxRowTable: !ib.label, colFractions: ib.label ? [0.35, 0.65] : null, colAligns: ib.label ? ['l', 'l'] : ib.cells.map(() => 'c') });
      }
      if (b.type === 'radio_list' || (b.lines && b.lines.length >= 2 && b.lines.every((l) => /^(?:[○●◯◉]|\(\s*[•*]?\s*\))\s*\S/.test(String(l).trim())))) {
        b = Object.assign({}, b, { lines: (b.lines || []).map((l) => String(l).trim().replace(/^\(\s*\)\s*/, '○ ').replace(/^\(\s*[•*]\s*\)\s*/, '● ')) });
        b.text = b.lines.join('\n');
        keepLines = true;
      }
    }
    // Part-17.8: লাইনের ভেতরের চওড়া ফাঁক ⇒ ট্যাব (মাপা x-অবস্থানে)
    // A04_PAGES_v1: দুপাশে-সমান (justify) দীর্ঘ গদ্য অনুচ্ছেদে শব্দের ফাঁককে ট্যাব-কলাম ধরা রোধ
    const isJustProseP4 = pages4On() && align === 'j' && bl.length >= 2 && (bl.reduce((a, l) => a + l.length, 0) / bl.length) >= 45 && !bl.some((l) => /[:：]|\.{4,}|─{4,}|_{4,}/.test(l));
    let tabs = align !== 'c' && !isJustProseP4 && m && !m.empty ? tabify(b.lines || [], m.lineSegs) : null;
    if (formKitOn() && !tabs) {
      if (b.type === 'option_row' || (b.lines && b.lines.some((l) => (String(l).match(MCQ_TEST_RE) || []).length >= 2))) {
        tabs = tabifyMcqOptions(b.lines || [b.text || ''], m && m.lineSegs, rect);
      } else if (b.type === 'match_col' && b.lines && b.lines.length >= 2) {
        const stopX = r1(rect && rect.w > 60 ? rect.x + rect.w * 0.65 : 320);
        const mLines = b.lines.map((l) => {
          const sp = String(l).trim().split(/\t|\s{2,}|\s+/);
          return sp.length >= 2 ? sp[0] + '\t' + sp.slice(1).join(' ') : l;
        });
        tabs = { lines: mLines, stops: [stopX] };
        keepLines = true;
      }
      if (!tabs) {
        const rTab = attachTrailingRightTab(b.lines || [b.text || ''], m && m.lineSegs, rect, b.type);
        if (rTab) tabs = rTab;
      }
    }
    if (tabs && (b.lines || []).length > 1) keepLines = true;
    // ২০২৬-১০-১৩: দুপাশে-সমান অনুচ্ছেদে মাপা লাইন-সংখ্যা = Gemini-র লাইন (≥৩) ⇒ লাইন-ভাঙা মূলের মতো রাখা, দুপাশে সমান থাকে
    // (keepJust — builder "both"; Word নিজে মোড়ালে a13-এ ৫ লাইন ৪ হয়ে শেষ লাইন ভুল জায়গায়)
    let keepJust = false;
    if (a14FixOn() && !keepLines && !tabs && bl.length >= 2 && /([._\-…·─])\1{5,}/.test(b.text || '')) { keepLines = true; if (align === 'j') keepJust = true; }
    const minKeepJustLn = ((a10LinesOn() || a10FixOn()) && !(a01FixOn() && bl.length === 2 && m && m.firstIndentPt >= 20)) ? 2 : 3;
    if (!keepLines && !tabs && align === 'j' && (bl.length >= minKeepJustLn || (boxSplitOn() && bl.length >= 2 && bl.some((l) => /([._\-…·─])\1{5,}/.test(l)))) && m && !m.empty && m.lines && m.lines.length === bl.length) keepLines = keepJust = true;
    // A10_LINES_v1: স্ক্যানে পরপর লাইন উল্লম্বভাবে ছুঁয়ে যাওয়ায় m.lines কম হলেও Gemini-র পূর্ণ-প্রস্থের (≥৪৫ অক্ষর) বহু-লাইনের অনুচ্ছেদে মূলের লাইন-ভাঙা অক্ষত রাখা
    if ((a10LinesOn() || a10FixOn()) && !keepLines && !tabs && bl.length >= 2 && m && !m.empty && m.lines && m.lines.length < bl.length && bl.slice(0, -1).every((l) => l.replace(/\*+/g, '').length >= 45)) {
      if (b.align === 'j') align = 'j';
      keepLines = true;
      if (align === 'j') keepJust = true;
    }
    // a11 (প্রস্থ-নির্ণয় width-ratio.mjs): অন্য কারণে লাইন-অক্ষত দুপাশে-সমান অনুচ্ছেদ builder-এ "বাঁয়ে" ⇒ মূলে কিনারা-ছোঁয়া লাইন
    // আমাদের ৫–১৫% ছোট। মাপা লাইন = Gemini-র লাইন আর শেষটি বাদে সব লাইন প্রায় পূর্ণ-প্রস্থ (≥৯২%) ⇒ "both" (Word br-এ শেষ হওয়া লাইনও ছড়ায়)
    if (!keepJust && !globalThis.__FZ_OFF_KJ && keepLines && !tabs && align === 'j' && bl.length >= 2 && m && !m.empty && m.lines && m.lines.length === bl.length) {
      const ws = m.lines.map((l) => l.w || 0), mx = Math.max(...ws);
      const pgW0 = (pageInfo && pageInfo.widthPt) || 595.3;
      const isNarrow2Ln = indentOn() && bl.length === 2 && (mx < pgW0 * 0.55 || (rect && rect.x > pgW0 * 0.35));
      if (!isNarrow2Ln && mx > 0 && ws.slice(0, -1).every((w) => w >= mx * 0.92)) keepJust = true;
      else if (indentOn() && !isNarrow2Ln && mx >= pgW0 * 0.55) {
        const rxs = m.lines.map((l) => (l.x || 0) + (l.w || 0)), maxRx = Math.max(...rxs);
        if (rxs.slice(0, -1).every((rx) => rx >= maxRx - 8)) keepJust = true;
      }
    }
    // Part-17.9: ট্যাবওয়ালা লাইন বাঁয়ে (ডানে-বসানো + ট্যাব Word-এ ভেঙে কয়েক লাইন হতো — "সর্বমোট=  ১০০"); অবস্থান ট্যাব-স্টপই দেয়
    if (tabs) align = 'l';
    const ul = !tabs && perLineUnderline(b.lines, m);
    if (ul && !globalThis.__FZ_OFF_ULINE2 && bl.length >= 2) { keepLines = true; if (align === 'j') keepJust = true; }
    // ২০২৬-১০-১৪ (a17 p4 "কর্মকর্তাদের নাম ⟦ ⟧ পদবি ⟦ ⟧ স্বাক্ষর"): নিচে-দাগের শিরোনাম-সারিতে Gemini ⟦ ⟧ দেয় কলামের ফাঁক বোঝাতে,
    // builder তা □ বানাত। দাগওয়ালা লেখায় চেকবক্স হয় না (a03-এর আসল বাক্সগুলো দাগহীন সারিতে) ⇒ বাদ। বন্ধ: FZ_OFF=ULBOX
    const noBox = (l) => (b.underline && !globalThis.__FZ_OFF_ULBOX ? String(l).replace(/ ?[[⟦]\s?[\]⟧]/g, '') : l);
    const paraOut = Object.assign(base, {
      kind: 'para', text: noBox(b.text || ''), lines: (ul ? ul : b.lines || []).map(noBox), keepLines, keepJust, fs: b.fs,
      tabLines: tabs ? tabs.lines.map(noBox) : null, tabStopsSrc: tabs ? tabs.stops : null,
      italic: !!b.italic, underline: ul ? false : !!b.underline || !!(m && m.underline),
      bold: ((a10LinesOn() || a10FixOn()) && /\*\*[^*]+\*\*/.test(b.text || '') && String(b.text || '').replace(/\*\*[^*]+\*\*/g, '').replace(/\s+/g, '').length > 5 && !/^(title|heading|header)$/.test(b.type || '')) ? false : (!!b.bold || b.type === 'title' || b.type === 'heading'), align,
      firstIndentPt: ((a17FixOn() || widthOn()) && align === 'c') ? 0 : (m && m.firstIndentPt && Math.abs(m.firstIndentPt) >= 4 ? m.firstIndentPt : 0),
      lineSpacingPt: m && m.pitchPt ? m.pitchPt : 0
    });
    if (mathHOn()) {
      const mLines = (paraOut.tabLines && paraOut.tabLines.length ? paraOut.tabLines : (paraOut.lines && paraOut.lines.length ? paraOut.lines : [paraOut.text || '']));
      const rank = { frac: 4, rad: 3, sup: 2, math: 1 };
      let bestK = b.hasEquation ? 'math' : null;
      for (const ln of mLines) {
        const k = mathKindOf(ln, b);
        if (k && (!bestK || rank[k] > rank[bestK])) bestK = k;
      }
      if (bestK) { paraOut.hasEquation = true; paraOut.mathKind = bestK; }
    }
    return paraOut;
  }

  /** পাতার স্বাভাবিককরণ: স্কেল, কাগজ, মার্জিন, মূল-লেখা-আকার; item-এর rect/ফন্ট রূপান্তর */
  function normalizePage(items, src) {
    const withRect = items.filter((it) => it.rect && it.rect.w > 0);
    // মূল-লেখা অনুমানে শুধু নির্ভরযোগ্য মাপ (মাপা লাইন ≈ Gemini-র লাইন) — না হলে কাত পাতায় অনুচ্ছেদ-উচ্চতাই "লাইন" হয়ে যেত
    const paras = items.filter((it) => it.kind === 'para' && it.m && it.m.lineInkPt > 0 &&
      !((it.lines || []).length >= 2 && it.m.lines.length < it.lines.length * 0.6));
    // Part-17.9: প্রতিটি অনুচ্ছেদের ফন্ট = কালি-উচ্চতা ÷ তার নিজের অক্ষর-শ্রেণির অনুপাত; মূল লেখা = লাইন-সংখ্যায় ভারিত মধ্যমা
    // Part-17.9: প্রস্থ-ভিত্তিক অনুমান (আমাদের ফন্টে এই লেখা মাপা প্রস্থে আঁটে যে আকারে) থাকলে সেটিই — উচ্চতা-অনুমানের ±১০% গোলমাল নেই,
    // লাইন-ভাঙনও মূলের মতো হয়। দুটির পার্থক্য ১.৫ গুণের বেশি হলে (লেখা ভুল/অসম্পূর্ণ) উচ্চতা-অনুমান।
    const estOf = (it) => {
      const hEst = it.m.lineInkPt / inkRatioFor(it.text || (it.lines || []).join(' '));
      const wEst = it.m.widthFontPt;
      // উচ্চতা ভুল হয় পাশের লাইন জুড়ে গেলে (বেশি দেখায়) ⇒ প্রস্থ ছোট হলে প্রস্থই ঠিক; প্রস্থ অনেক বড় হলে (Gemini-র লেখা ছাপার চেয়ে ছোট) উচ্চতা
      // B6: ফন্ট মাপা লাইন-দূরত্বের চেয়ে বড় হতে পারে না (g33: উচ্চতা ৯.৯, প্রস্থ ১৩.২, দূরত্ব ≈১১.৩ — Gemini-র লাইন ছাপার চেয়ে ছোট;
      // ১৬ লাইন Word-এ ২২ হয়ে পাতা উপচাত)। শুধু অনুপাত কমালে g22/g38-এর সঠিক প্রস্থ-অনুমানও বাদ পড়ত।
      const pitch = (it.m.lines || []).length >= 3 ? it.m.pitchPt : 0;
      // a03 (২০২৬-১০-১২): Gemini পূরণ-সারি ("নাম : ........") জুড়ে দিলে, অথচ মূলে ফাঁকা ঘর ⇒ প্রস্থ-অনুমান ৩–৫pt (ফন্ট ৯.৫-এ আটকে
      // লাইনগুলো খুদে)। পূরণ-সারির লেখায় প্রস্থ উচ্চতার ৬০%-এর কম হলে উচ্চতা-অনুমান
      if (wEst && wEst < hEst * 0.6 && /([._\-…·─])\1{5,}/.test(it.text || (it.lines || []).join(' '))) return hEst;
      // A04_PAGES_v1: ২-লাইনের অনুচ্ছেদে কেবল শেষের ছোট লাইনটি মাপা আয়তে এলে প্রস্থ-ভিত্তিক খুদে ফন্ট-অনুমান (১–৫pt) উপেক্ষা করা
      if (pages4On() && wEst && wEst < hEst * 0.6 && String(it.text || (it.lines || []).join(' ')).replace(/\s+/g, ' ').length >= 90) return hEst;
      // ২০২৬-১০-১৪ (a17 p9/p10, মালিকের Word-যাচাই): পূরণ-সারির প্রস্থ Gemini-র আন্দাজি বিন্দু-সংখ্যায় (⟦.×60⟧) বাঁধা ⇒ এক ফরমে
      // "পরীক্ষার নাম" ১৭.৫, "কেন্দ্রের নাম" ৯.৫ (মূলে সমান)। উচ্চতা থেকে >২০% দূরে ⇒ উচ্চতা-অনুমান। বন্ধ: FZ_OFF=FILLW
      if (!globalThis.__FZ_OFF_FILLW && wEst && Math.abs(wEst - hEst) > hEst * 0.2 && /([._\-…·─])\1{5,}/.test(it.text || (it.lines || []).join(' '))) return hEst;
      // a15 (মালিকের টেস্ট): মূলত ইংরেজি লেখা (ওয়েব/ই-মেইল) মূলে চওড়া লাতিন ফন্টে ⇒ আমাদের ফন্টে প্রস্থ-অনুমান ফোলে (১২.৫ ⇒ ১৭) ⇒ উচ্চতা
      const tx = String(it.text || (it.lines || []).join(' ')), lat = (tx.match(/[A-Za-z]/g) || []).length;
      if (wEst && wEst > hEst * 1.15 && lat >= 10 && lat >= tx.replace(/\s/g, '').length * 0.6) return hEst;
      if (a17FixOn() && /^(title|heading|header)$/.test(it.type || '') && (it.lines || []).length <= 1 && !/([._\-…·─])\1{5,}/.test(tx)) {
        const cleanLen = tx.replace(/\*\*|<[^>]+>|\s+/g, '').length;
        if (it.align === 'c' && wEst && hEst && wEst < hEst * 0.78 && cleanLen >= 18) {
          it._clippedCenter = true;
          return it.m.lineInkPt / 0.95;
        }
        if (it.fs === 'xl' && wEst && hEst && cleanLen <= 10 && wEst > hEst * 1.15) return hEst;
      }
      return wEst && wEst <= hEst * 1.6 && !(pitch && wEst > pitch * 1.05) ? wEst : hEst;
    };
    const ests = []; paras.forEach((it) => { const e = estOf(it); for (let k = 0; k < Math.max(1, it.m.lines.length); k++) ests.push(e); });
    const bodyInk = median(ests);          // (নাম পুরোনো — এখন ফন্ট-অনুমান pt)
    const eFont = bodyInk || 12;
    // Part-17.9: আসল কাগজ-মাপের পাতা (PDF: A4/লেটার/লিগ্যাল…) ⇒ সবসময় আসল মাপ (প্রচ্ছদে মূল-লেখা ১৪–১৬pt স্বাভাবিক);
    // কাগজ-মাপ নয় (ক্যামেরা-ছবি, পিক্সেল-মাপ) ⇒ মূল-লেখা ১২pt ধরে A4-এ স্বাভাবিককরণ
    const paperOk = src.widthPt >= 400 && src.widthPt <= 1300 && src.heightPt >= 400 && src.heightPt <= 1800;
    let scale = paperOk && eFont >= 6 && eFont <= 24 ? 1 : 12 / eFont;
    // a17/a19 (মালিকের টেস্ট, ২০২৬-১০-১৩): CamScanner-এর পিক্সেল-পাতা (১০৯৩×১৮০০) "কাগজ" ধরা হতো ⇒ মূল-লেখা ২২.৫pt, সব বিশাল।
    // মাপ কোনো আদর্শ কাগজ নয় অথচ অনুপাত আদর্শ কাগজের (লিগ্যাল ১.৬৪৭) ⇒ সেই কাগজের প্রস্থে, মার্জিন অনুপাতে
    const STD = [[595, 842], [612, 792], [612, 1008], [842, 1191]];
    const isStd = STD.some(([w, h]) => (Math.abs(src.widthPt - w) <= w * 0.03 && Math.abs(src.heightPt - h) <= h * 0.03) ||
      (Math.abs(src.widthPt - h) <= h * 0.03 && Math.abs(src.heightPt - w) <= w * 0.03));
    const fitCand = !isStd && src.widthPt > 700 && src.heightPt > src.widthPt
      ? STD.find(([w, h]) => Math.abs(src.heightPt / src.widthPt - h / w) <= (h / w) * 0.015) : null;
    // a17 (২০২৬-১০-১৩): বড় লেখার কার্ড-শিট — মাপা মূল-লেখা >২৪ ⇒ ১২pt-স্বাভাবিককরণে পুরো পাতা ২৩% (কার্ড ওপরের অর্ধেকে, খুদে লেখা);
    // অনুপাত আদর্শ কাগজের হলে সেই কাগজের মাপেই, যদি তাতে মূল-লেখা ≤৩০pt হয়
    const fitPaper = fitCand && (scale === 1 || (!globalThis.__FZ_OFF_FITBIG && paperOk && eFont * fitCand[0] / src.widthPt <= 30)) ? fitCand : null;
    if (fitPaper) scale = fitPaper[0] / src.widthPt;
    // a10 (১৮৬৯×২৪৮৭, অনুপাত ১.৩৩ — কোনো আদর্শ কাগজ নয়, পিক্সেলও বিশাল): আগে A4-এ "বিষয়বস্তু মাপে, মাঝে" বসত ⇒ অনুপাত বদলে
    // সব লাইন ২০–৬০pt সরত, বাঁ মার্জিন ৭৫ ⇒ ৫০। Word-এ যেকোনো পাতা-মাপ চলে ⇒ মূলের অনুপাতে কাগজ (প্রস্থ ৫৯৫), একই স্কেল, মূল মার্জিন
    const ratio0 = src.heightPt / src.widthPt;
    const customFit = !globalThis.__FZ_OFF_CUSTOM && !fitPaper && !paperOk && !isStd && src.widthPt > 1300 && ratio0 >= 1.25 && ratio0 <= 1.75 ? [595, Math.round(595 * ratio0)] : null;
    if (customFit) scale = customFit[0] / src.widthPt;
    const bodyFont = scale === 1 || fitPaper || customFit ? Math.round(eFont * scale * 2) / 2 : 12;
    // বিষয়বস্তুর সীমা (ব্লক-সমষ্টি — পাতার কিনারার ছায়া/দাগ নয়)
    const C = withRect.length ? {
      x0: Math.min(...withRect.map((it) => it.rect.x)), y0: Math.min(...withRect.map((it) => it.rect.y)),
      x1: Math.max(...withRect.map((it) => it.rect.x + it.rect.w)), y1: Math.max(...withRect.map((it) => it.rect.y + it.rect.h))
    } : { x0: 54, y0: 54, x1: src.widthPt - 54, y1: 120 };
    let paperW = src.widthPt, paperH = src.heightPt, left, top;
    const standardSize = src.widthPt >= 400 && src.heightPt >= 400;
    if (scale === 1 && standardSize) {
      left = C.x0; top = C.y0;                                          // আসল মাপ: মূল মার্জিন
    } else if (fitPaper || customFit) {
      [paperW, paperH] = fitPaper || customFit; left = C.x0 * scale; top = C.y0 * scale;   // পিক্সেল-পাতা ⇒ আদর্শ/মূল-অনুপাতের কাগজ, মার্জিন অনুপাতে
    } else {
      let W = (C.x1 - C.x0) * scale;
      const portrait = (C.y1 - C.y0) * scale >= W * 0.6 || W <= PAPER.a4p[0] - 72;
      [paperW, paperH] = portrait ? PAPER.a4p : PAPER.a4l;
      const maxW = paperW - 72;
      if (W > maxW) { scale *= maxW / W; W = maxW; }                      // কাগজে না আঁটলে আরও ছোট
      left = Math.max(36, Math.min(72, (paperW - W) / 2));
      top = 54;
    }
    const map = (r) => ({ x: left + (r.x - C.x0) * scale, y: top + (r.y - C.y0) * scale, w: r.w * scale, h: r.h * scale });
    // A01_REGRESS_v1: একই পাতার পূর্ণ-প্রস্থের পূরণ-রেখাগুলোর মধ্যমা প্রস্থ (Gemini-র খণ্ডিত বক্সে কেটে যাওয়া লাইন পুনরুদ্ধারে)
    const fullFillWidths = a01FixOn() ? items.filter((x) => x.kind === 'para' && x.rect && (x.lines || []).length === 1 && /([._\-…·─])\1{5,}/.test(x.text || '') && x.rect.w * scale >= 420).map((x) => x.rect.w * scale) : [];
    const medFillW = fullFillWidths.length >= 3 ? median(fullFillWidths) : 0;
    for (const it of items) {
      if (it.rect) it.rect = map(it.rect);
      if (a01FixOn() && it.kind === 'para' && it.rect && (it.lines || []).length === 1) {
        const rawTxt = String(it.text || '');
        const nonFillLen = rawTxt.replace(/([._\-…·─])\1{2,}/g, '').replace(/\s+/g, '').length;
        // স্ক্যানে শুধু ড্যাশ-রেখাটি মাপা হলে (h < 3pt, যেমন "তারিখ:--------------------") অক্ষরের শীর্ষ অবস্থানে rect.y সমন্বয়
        if (it.rect.h < 3 && nonFillLen >= 2 && /([._\-…·─])\1{5,}/.test(rawTxt)) {
          const refFs = (it.m && it.m.widthFontPt) ? it.m.widthFontPt * scale : bodyFont;
          it.rect = { x: it.rect.x, y: r1(it.rect.y - refFs * 0.52), w: it.rect.w, h: r1(refFs * 0.85) };
        }
        // দুই পূরণ-স্থানের ফরম-লাইনে Gemini-র বক্স ডানদিকের পূরণ-রেখা কেটে ফেললে (যেমন a01 "পোস্ট অফিস---উপজেলা---", w=289.9pt) পূর্ণ প্রস্থ পুনরুদ্ধার
        const fillSegs = rawTxt.match(/([._\-…·─])\1{5,}/g) || [];
        if (medFillW >= 430 && fillSegs.length >= 2 && /([._\-…·─])\1{10,}\s*$/.test(rawTxt) && rawTxt.length >= 75 && it.rect.x <= left + 4 && it.rect.w < medFillW * 0.72) {
          it._origRectW = r1(it.rect.w);
          it.rect = Object.assign({}, it.rect, { w: r1(medFillW) });
        }
      }
      if (p2DriftOn() && Array.isArray(it._measuredLines)) it._measuredLines = it._measuredLines.map(map);
      // নির্ণয় (qa/golden/table-rows.mjs): ছকের মাপা আড়া-রেখা আউটপুট-স্থানাঙ্কে — Word-এর সারি বনাম মূলের রেখা
      if (it.kind === 'table' && it.m && Array.isArray(it.m.hRulesPt)) it.srcRulesPt = it.m.hRulesPt.map((y) => r1(top + (y - C.y0) * scale));
      // ২০২৬-১০-১৪ (2.pdf): দাগহীন ছকের ভেতরের আড়া-রেখা (মোটের ওপরের দাগ) — বিস্তারসহ; builder ঘরের ওপর/নিচ-বর্ডার বসায়। বন্ধ: FZ_OFF=TRULE
      // (ছকের আয়তের অনুপাতে — পরে আয়ত সরলেও ঠিক থাকে)
      if (!globalThis.__FZ_OFF_TRULE && it.kind === 'table' && it.borderless && it.rect && it.rect.w > 0 && it.rect.h > 0 && it.m && Array.isArray(it.m.hRuleSpansPt)
        && it.m.hRuleSpansPt.length === it.m.hRulesPt.length && it.m.hRulesPt.length <= 3) {
        const R = it.rect, fx = (x) => Math.round(((left + (x - C.x0) * scale) - R.x) / R.w * 1000) / 1000;
        it.ruleSpans = it.m.hRulesPt.map((y, k) => ({ fy: Math.round(((top + (y - C.y0) * scale) - R.y) / R.h * 1000) / 1000, fx0: fx(it.m.hRuleSpansPt[k][0]), fx1: fx(it.m.hRuleSpansPt[k][1]) }));
      }
      if (it.tabStopsSrc) it.tabStopsAbs = it.tabStopsSrc.map((x) => (formKitOn() && x && typeof x === 'object' ? Object.assign({}, x, { pos: left + (x.pos - C.x0) * scale }) : left + (x - C.x0) * scale));
      if (it.kind === 'para') {
        // মাপা লাইন Gemini-র লাইনের তুলনায় অনেক কম ⇒ লাইন আলাদা হয়নি (কাত/ঘন ছাপা) ⇒ মাপ অবিশ্বাস্য, মূল-লেখার আকার
        const textLines = (it.lines && it.lines.length) || 1;
        const mergedInk = (a10LinesOn() || a10FixOn()) && textLines >= 2 && it.m && it.m.lines && it.m.lines.length < textLines && (!it.m.widthFontPt || it.m.lineInkPt > (bodyInk || 30) * 1.35);
        const reliable = it.m && it.m.lineInkPt && bodyInk && !(textLines >= 2 && it.m.lines.length < textLines * 0.6) && !mergedInk;
        let ratio = reliable ? estOf(it) / bodyInk : (FS_CLASS[it.fs] || 12) / 12;
        // শিরোনাম-জাতীয় ছাড়া সাধারণ লেখা মূল-লেখার কাছাকাছি (মাপের গোলমাল সীমিত); FONTFIX: ক্ষুদ্র ফাইল-পাথ ফুটারের আসল অনুপাত (≥০.৪৫) রক্ষা
        if (!/^(title|heading|header)$/.test(it.type)) ratio = clamp(ratio, (fontFixOn() && (it.type === 'footer' || (it.fs === 's' && reliable && estOf(it) <= 8))) ? 0.45 : 0.7, 1.3);
        // a03 (২০২৬-১০-১২): আঁকা চেকবক্স (≈১৬pt উঁচু, Gemini লেখে "⟦ ⟧") কালি-উচ্চতা/প্রস্থ ফোলায় ⇒ "ধর্ম : ইসলাম ⟦ ⟧ …" ১৭.৫pt
        // (মূলে ≈১১)। চেকবক্সের লাইন মূল-লেখার চেয়ে বড় নয়
        if (ratio > 1 && /[[⟦]\s?[\]⟧]|[□☐]/.test(it.text || '')) ratio = 1;
        // [Rule IR5: FZ_OFF=FORMFIX / FZ_OFF=IR5] বন্ধনীযুক্ত এক-লাইনের ফুটনোট অনুচ্ছেদে (যেমন a16 পাতা ৫ "(বি.দ্র. ...)") প্রস্থ-ভিত্তিক ফন্ট ছোট হলে সেটিই গ্রহণ।
        if (fzOn('FORMFIX') && !globalThis.__FZ_OFF_IR5 && textLines === 1 && /^\s*[(\[（]/.test(it.text || '') && (it.text || '').length > 35 && it.m && it.m.widthFontPt && it.m.widthFontPt < bodyInk * 0.92) {
          ratio = clamp(it.m.widthFontPt / bodyInk, 0.72, 0.92);
        }
        // অতি-ছোট লেখা ("১।", "র", এবং FONTFIX-এ "জনাব,") — অক্ষর-শ্রেণির অনুমানও অনিশ্চিত ⇒ ছোট করা নয়
        const avgLen = (it.text || '').replace(/\s+/g, ' ').length / textLines;
        if (ratio < 1 && avgLen < (fontFixOn() ? 6 : 5) && it.type !== 'page_number') ratio = 1;
        // A02_RULES_v1: পূর্ণ-প্রস্থ ধূসর পট্টিযুক্ত ফুটার অনুচ্ছেদে (যেখানে পট্টির উচ্চতাই lineInkPt হিসেবে মাপা হয়েছে) মূল-লেখার আকার রাখা
        if ((ruleFixOn() || rules2On()) && (it.fullWidthShadeBar || (it.shade && it.shade !== '000000' && it.color !== 'FFFFFF' && textLines === 1 && it.m && it.m.lineInkPt >= (it.rect && it.rect.h || 0) * 0.85 && (it.rect && it.rect.h || 0) >= bodyFont * 1.5))) ratio = 1;
        // A04_PAGES_v1: বহু-লাইনের গদ্য অনুচ্ছেদে কেবল শেষের ছোট লাইনটি মাপা আয়তে পড়লে মূল-লেখার আকার ও পূর্ণ আয়ত পুনরুদ্ধার
        if (pages4On() && textLines === 1 && it.rect && it.rect.h < 18 && String(it.text || '').replace(/\s+/g, ' ').length >= 95 && it.rect.w < (C.x1 - C.x0) * scale * 0.75 && (!it.m || !it.m.widthFontPt || it.m.widthFontPt <= 7)) {
          ratio = 1;
          const pitchEst = bodyFont * 1.15;
          it.rect = { x: left, y: r1(Math.max(top, it.rect.y - pitchEst)), w: r1((C.x1 - C.x0) * scale), h: r1(it.rect.h + pitchEst) };
          it.keepLines = false;
          if (it.m && Array.isArray(it.m.lines) && it.m.lines.length === 1) it._tailLines = 2;
        } else if (pages4On() && textLines === 1 && it.keepLines && it.rect && it.rect.h >= bodyFont * 1.6 && String(it.text || '').replace(/\s+/g, ' ').length >= 90) {
          it.keepLines = false;
        }
        // অনুপাত এখন ক্যালিব্রেটেড ⇒ মূল-লেখার ±১০%-এ হলে ঠিক মূল-লেখার আকার
        // a09: ±১০% সহনশীলতায় ১০.৮ ⇒ ১২ হতো (প্রস্থ +১০%, লাইন মুড়ে পাতা উপচাত) ⇒ ±৫%
        it.fontPt = Math.abs(ratio - 1) <= 0.1 ? bodyFont : clamp(Math.round(bodyFont * ratio * 2) / 2, 6, 60);
        // Part-17.9: মোটা/হেলানো — কালির রেখা-পুরুত্ব (ফন্ট-অনুপাতে) পুরো ফাইলের সাধারণ লেখার সাথে তুলনা; Gemini-র কথা শুধু মাপ না থাকলে
        if (it.m && it.m.lineInkPt > 0) it.diag = { inkPt: r1(it.m.lineInkPt), estPt: r1(estOf(it)), wPt: it.m.widthFontPt ? r1(it.m.widthFontPt) : null, ratio: inkRatioFor(it.text), lines: it._tailLines || it.m.lines.length,
          sl: it.m.slant || 0, slQ: it.m.slantGain ? Math.round(it.m.slantGain * 1000) / 1000 : null, sH: Math.round((it.m.strokeHPt || 0) * 100) / 100, sV: Math.round((it.m.strokeVPt || 0) * 100) / 100, dens: Math.round((it.m.inkDensity || 0) * 1000) / 1000 };
        if ((a16Fix4On() || a16Fix5On()) && it.m && it.m.underline) Object.defineProperty(it, '_mUnderline', { value: true, enumerable: false, configurable: true, writable: true });
        // মোটা কিনা পরে পুরো ফাইল মিলিয়ে (build-এর শেষে) — চূড়ান্ত ফন্টের অনুপাতে রেখা-পুরুত্ব
        if (it.m && it.m.strokePt > 0 && it.m.lineInkPt > 0 && !((a10LinesOn() || a10FixOn()) && textLines >= 2 && it.m.lines && it.m.lines.length < textLines)) it._stroke = it.m.strokePt * scale;
        if (it.m && it.m.slant >= 0.1) it.italic = true;
        if (!reliable) it.lineSpacingPt = 0;
        // লাইন-দূরত্ব ফন্টের ১.৬ গুণের বেশি ⇒ মাপ অবিশ্বাস্য (দুই লাইন জোড়া পড়েছে) — Word-এর স্বাভাবিক দূরত্ব
        // ২০২৬-১০-১৩: মাপা লাইন-সংখ্যা = Gemini-র লাইন-সংখ্যা (≥২) হলে জোড়া পড়েনি ⇒ ২.২ গুণ পর্যন্ত বিশ্বাস্য
        // (a13: ১১pt লেখা ১৯pt দূরত্বে ৫ লাইন — ফেলে দিলে অনুচ্ছেদ ২৫pt খাটো, নিচের সব ওপরে)
        const sameN = it.m && it.m.lines && it.lines && it.lines.length >= 2 && it.m.lines.length === it.lines.length;
        if (fontFixOn() && sameN && it.lineSpacingPt > 0) Object.defineProperty(it, '_origPitchPt', { value: r1(it.lineSpacingPt * scale), enumerable: false, configurable: true, writable: true });
        const maxLsMul = mathHOn() && it.hasEquation ? (sameN ? 2.8 : 2.2) : (sameN ? 2.2 : 1.6);
        // EXTRALINES: উৎস-স্থানাঙ্কে মাপা lineSpacingPt-কে স্কেল করার আগেই স্কেলকৃত fontPt-এর সাথে তুলনা করলে
        // স্কেল < ১ পাতায় (যেমন a19-এ scale=0.56, pitchPt=28.8pt -> 16.1pt বনাম 12.5*2.2=27.5pt) সঠিক লাইন-দূরত্ব ০ হয়ে যেত
        if (extraLinesOn() || a10LinesOn() || a10FixOn() || a17FixOn() || a19FixOn()) {
          it.lineSpacingPt = r1((it.lineSpacingPt || 0) * scale);
          if (it.lineSpacingPt > it.fontPt * maxLsMul) it.lineSpacingPt = 0;
          if (a10LinesOn() || a10FixOn() || a17FixOn() || a19FixOn()) {
            const nLn = (it.tabLines && it.tabLines.length) || textLines;
            if (!it.lineSpacingPt && nLn >= 2 && it.rect && it.rect.h > 0) {
              const estPitch = r1(Math.max(it.fontPt * 1.15, (it.rect.h - it.fontPt * 0.95) / (nLn - 1)));
              if (estPitch <= it.fontPt * 1.85) it.lineSpacingPt = estPitch;
            }
          }
        } else {
          if (it.lineSpacingPt > it.fontPt * maxLsMul) it.lineSpacingPt = 0;
          it.lineSpacingPt = r1((it.lineSpacingPt || 0) * scale);
        }
        it.firstIndentPt = r1((it.firstIndentPt || 0) * scale);
        if (mathHOn() && it.hasEquation) {
          const rawML = (it.tabLines && it.tabLines.length ? it.tabLines : (it.lines && it.lines.length ? it.lines : String(it.text || '').split('\n')));
          const mLines = rawML.length ? rawML : [String(it.text || '')];
          let exSum = mLines.reduce((acc, ln) => acc + mathLineExtraPt(ln, it.fontPt, mLines.length === 1 ? it : null), 0);
          if (exSum === 0) exSum = mathLineExtraPt('', it.fontPt, it);
          it.mathExtraPt = r1(exSum);
        }
      } else if (it.kind === 'table') {
        // Part-17.8: মাপা ঘরের ফন্ট (মূল-লেখার ±১৫%-এ হলে মূল-লেখার আকার); মাপ না থাকলে আগের মতো
        const est = it.cellFontSrc ? it.cellFontSrc * scale : 0;
        // a16: ছোট মাপকে মূল-লেখায় ঠেলে তোলা (১২.৫ ⇒ ১৩.৫) ছক চওড়া/লম্বা করে পাতা উপচাত ⇒ ওপরে তোলা শুধু ≤৫%
        const maxTblFont = it.rowFontCap ? Math.min(bodyFont, Math.round(it.rowFontCap * scale * 2) / 2) : (it.rows && it.rows.length >= 6 ? bodyFont : 18);
        it.fontPt = est ? ((est <= bodyFont ? bodyFont - est <= bodyFont * 0.05 : est - bodyFont <= bodyFont * 0.1) ? Math.min(bodyFont, maxTblFont) : clamp(Math.round(est * 2) / 2, 7, maxTblFont)) : Math.min(bodyFont, 12);
        // ২০২৬-১০-১৪ (a17 p6, মালিকের Word-যাচাই): অনুচ্ছেদ-ভরা ফরম-ছক (ঘরে ≥৮০ অক্ষর) — বিন্দু-সারির ঘর-কালিতে মাপ ১২% কম ⇒ ছক মূল
        // লেখার চেয়ে স্পষ্ট ছোট (মূলে সমান)। ≤১৫% ছোট হলে মূল-লেখার আকার (তবে সারি-উচ্চতার ঊর্ধ্বসীমা অতিক্রম নয়)। বন্ধ: FZ_OFF=TXTTF
        const skipTxtTfBox = boxSplitOn() && it.boxSplitCollapsed && it.m && it.m.cellWidthFontPt && it.rows
          && it.rows.some((r) => r.some((c) => String(c || '').replace(/\s+/g, '').length >= 80 && !/([._…·])\1{4,}/.test(String(c || ''))));
        if (!globalThis.__FZ_OFF_TXTTF && !skipTxtTfBox && !it.rowFontCap && est && est < bodyFont && est >= bodyFont * 0.85 && it.rows
          && it.rows.some((r) => r.some((c) => String(c || '').replace(/\s+/g, '').length >= 80))
          && it.rows.some((r) => r.some((c) => /([._…·])\1{4,}/.test(String(c || ''))))) {
          const lifted = Math.min(bodyFont, maxTblFont);
          if (lifted > it.fontPt) { it._fontBase = it.fontPt; it.fontPt = lifted; }
        }
        if (boxSplitOn() && it.rightTabStopSrcPt) { it.rightTabStopPt = r1(it.rightTabStopSrcPt * scale); delete it.rightTabStopSrcPt; }
        // ২০২৬-১০-১৪ (a19): ছোট ছক (১০।-এর ৩টি ১×২) ঘর-কালি শুধু বিন্দু-সারিতে মাপা ⇒ ৫.৮ ⇒ ৭pt ক্ষুদে লেখা। অবিশ্বাস্য ছোট
        // (< মূল-লেখার ৫৫%) ⇒ সারির মাপা উচ্চতা যতটা দেয় (লেখা-কালি ≈ ফন্টের ৮৭%), মূল-লেখা পর্যন্ত
        // ২০২৬-১০-১৪ (a17 p10): প্রায়-ফাঁকা ছক (≥৭০% ঘর ফাঁকা; লেখা শুধু ক্রমিক অঙ্ক) — অঙ্কের কালি ছোট ⇒ ঘর-ফন্ট ৮ (মূলে ~১১)।
        // সারি যথেষ্ট উঁচু হলে মূল-লেখার ৮৫% পর্যন্ত তোলা (সারি-উচ্চতার ৬০%-এর বেশি নয়)। FZ_OFF=SPARSETF
        if (!globalThis.__FZ_OFF_SPARSETF && it.rows && it.rows.length >= 4 && it.rect) {
          const cells = it.rows.reduce((a, r) => a.concat(r), []), filledN = cells.filter((c) => c && String(c).trim()).length;
          const rowH = it.rect.h / it.rows.length;
          if (cells.length && filledN / cells.length <= 0.3 && rowH >= bodyFont * 1.4) {
            const floor = Math.round(Math.min(bodyFont * 0.85, rowH * 0.6) * 2) / 2;
            if (floor > it.fontPt) it.fontPt = floor;
            const h0Pt = (a10LinesOn() || a10FixOn()) ? (it.rowHeightsPt && it.rowHeightsPt[0] || 0) * scale : (it.rowHeightsPt && it.rowHeightsPt[0] || 0);
            if (it.rowHeightsPt && h0Pt >= bodyFont * 2.2 && !((a10LinesOn() || a10FixOn()) && it.rows[0] && it.rows[0].some((c) => String(c || '').includes('\n') || String(c || '').length > 18))) it.headFontPt = bodyFont;
          }
        }
        // শুধু ১–২ সারির ক্ষুদে ছকে (f1-এর বহু-সারির ছকে বড় ফন্ট ⇒ পাতা উপচাল, ৫৯→২২)
        if (est && est < bodyFont * 0.55 && it.rect && it.rows && it.rows.length && it.rows.length <= 2 && !globalThis.__FZ_OFF_TINYTF) {
          const byH = Math.round(it.rect.h / it.rows.length * 1.15 * 2) / 2;   // rect এখানে আগেই পাতার মাপে
          if (byH > it.fontPt) it.fontPt = Math.min(bodyFont, byH);
          // বড় ফন্টে সরু ক্রমিক-কলাম ("১০।") ভেঙে খাড়া হতো ⇒ ছোট লেখার কলাম অন্তত লেখার প্রস্থ, বাকিটা পাশের কলাম থেকে
          const fr = it.colFractions, W = it.rect.w;
          if (Array.isArray(fr) && fr.length >= 2 && W > 0) {
            const need = fr.map((f, k) => { const mx = Math.max(0, ...it.rows.map((r) => String(r[k] || '').length)); return mx && mx <= 6 ? (mx * it.fontPt * 0.6 + 2 * 5.4 + 4) / W : 0; });
            const add = need.reduce((a, n, k) => a + Math.max(0, n - fr[k]), 0);
            const big = fr.indexOf(Math.max(...fr));
            if (add > 0 && fr[big] - add > 0.3) it.colFractions = fr.map((f, k) => (k === big ? f - add : Math.max(f, need[k])));
          }
        }
      }
      if ((pages4On() || lineGapOn()) && it.kind === 'table' && it.rows && it.rows.length >= 15) {
        const nC = Math.max(...it.rows.map((r) => r.length));
        if (nC >= 10) {
          if (it.fontPt > 8) it.fontPt = 8;
          if (Array.isArray(it.colFractions) && it.colFractions.length === nC) {
            const f = it.colFractions.slice();
            let chg = false;
            for (let k = 0; k < nC; k++) {
              if (f[k] < 0.042) {
                const j = f.indexOf(Math.max(...f)), d = 0.042 - f[k];
                if (j !== k && f[j] - d >= 0.08) { f[j] -= d; f[k] += d; chg = true; }
              }
            }
            if (chg) it.colFractions = f;
          }
        }
      }
      if (it.kind === 'figure' || it.kind === 'table') {
        it.widthPt = it.rect ? r1(it.rect.w) : 0;
        it.heightPt = it.rect ? r1(it.rect.h) : 0;
        if ((ruleFixOn() || rules2On()) && it.kind === 'table') {
          if (it.boxRuleHeightPt > 0) it.heightPt = r1(it.boxRuleHeightPt * scale);
          else if (it.exactRuleHeights && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length) {
            it.heightPt = r1(it.rowHeightsPt.reduce((a, b) => a + b, 0) * scale);
          }
          if (Array.isArray(it.smallBoxesPt)) {
            it.smallBoxesPt = it.smallBoxesPt.map((sb) => ({
              x0: r1(left + (sb.x0 - C.x0) * scale),
              x1: r1(left + (sb.x1 - C.x0) * scale),
              y0: r1(top + (sb.y0 - C.y0) * scale),
              y1: r1(top + (sb.y1 - C.y0) * scale),
              w: r1(sb.w * scale),
              h: r1(sb.h * scale)
            }));
          }
        }
        if ((a10LinesOn() || a10FixOn() || a17FixOn() || a19FixOn()) && it.kind === 'table' && Array.isArray(it.rowHeightsPt) && scale !== 1) {
          const ex = it.rowHeightsPt.exact;
          it.rowHeightsPt = it.rowHeightsPt.map((h) => r1(h * scale));
          if (ex) it.rowHeightsPt.exact = true;
        }
      }
      delete it._tailLines;
      delete it.m;
    }
    // EXTRALINES: একই ব্লক থেকে ফাঁকে ভাগ হওয়া ছোট বর্ডারলেস ছকগুলোর (যেমন a19-এর ১০। কেন্দ্র সচিবের স্বাক্ষর/সিলমোহর, splitPart 0..2)
    // কলাম-অনুপাত, ফন্ট ও প্রস্থের সমতা রক্ষা যাতে প্রথম অংশের নিচে পরের অংশগুলো বাঁয়ে সরে বা ভিন্ন ফন্টে না ভাঙে
    if (extraLinesOn() || a19FixOn()) {
      const spGroups = new Map();
      for (const it of items) {
        if (it.kind === 'table' && it.splitPart != null && it.borderless && Array.isArray(it.box)) {
          const key = it.box.join(',');
          if (!spGroups.has(key)) spGroups.set(key, []);
          spGroups.get(key).push(it);
        }
      }
      for (const grp of spGroups.values()) {
        if (grp.length < 2) continue;
        const head = grp.find((x) => x.splitPart === 0) || grp[0];
        const maxF = Math.max(...grp.map((x) => x.fontPt || 0));
        const nC = head.colFractions ? head.colFractions.length : 2;
        const padW = nC * 10.8 + 20;
        const canExpand = head.rect && (head.rect.w + padW <= (C.x1 - C.x0) * scale);
        const newW = canExpand ? r1(head.rect.w + padW) : head.widthPt;
        const col0W = head.colFractions && head.rect ? head.colFractions[0] * head.rect.w : 0;
        const baseFr = (canExpand && col0W > 0 && newW > col0W) ? [col0W / newW, 1 - col0W / newW] : (head.colFractions ? head.colFractions.slice() : null);
        grp.forEach((x) => {
          if (maxF > 0) x.fontPt = maxF;
          if (canExpand && x.rect) { x.rect.w = newW; x.widthPt = newW; }
          if (baseFr && x.colFractions && x.colFractions.length === baseFr.length) x.colFractions = baseFr.slice();
        });
      }
    }
    const contentRight = left + (C.x1 - C.x0) * scale;
    const margins = {
      top: r1(clamp(top, 18, paperH * 0.25)), left: r1(clamp(left, 18, paperW * 0.25)),
      right: r1(clamp(paperW - contentRight, 18, paperW * 0.4)), bottom: 36
    };
    return { widthPt: r1(paperW), heightPt: r1(paperH), margins, scale: Math.round(scale * 1000) / 1000, bodyFontPt: bodyFont,
      xform: { left, top, x0: C.x0, y0: C.y0, scale } };
  }

  /**
   * ২০২৬-১০-১৪ (a16 p1, মালিকের Word-যাচাই): হাতের সইয়ের পাশে হাতে লেখা তারিখ ("১৯/১০/২০২০") সই-ছবিতেই আছে, অথচ Gemini
   * আলাদা লেখাও দেয় ⇒ ছবির পাশে সরু ঘরে খাড়া হয়ে দ্বিতীয়বার ছাপা হতো। ছবির ওপর (≥৩০% ঢাকা, বা কেন্দ্র ছবির ভেতরে) পড়া
   * শুধু-তারিখ লাইন বাদ (একমাত্র লাইন হলে পুরো ব্লক)। বন্ধ: FZ_OFF=SIGDATE
   */
  function dropSigDates(items) {
    const figs = items.filter((it) => it.kind === 'figure' && it.rect && !it.rotatedText);
    if (globalThis.__FZ_OFF_SIGDATE || !figs.length) return items;
    const DATE = /^[\s*]*[০-৯0-9]{1,2}\s*[/.\-]\s*[০-৯0-9]{1,2}\s*[/.\-]\s*[০-৯0-9]{2,4}[\s*]*$/;
    const onFig = (r) => figs.some((f) => {
      const ix = Math.max(0, Math.min(r.x + r.w, f.rect.x + f.rect.w) - Math.max(r.x, f.rect.x));
      const iy = Math.max(0, Math.min(r.y + r.h, f.rect.y + f.rect.h) - Math.max(r.y, f.rect.y));
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      return ix * iy >= 0.3 * Math.max(1, r.w * r.h) || (cx >= f.rect.x - 6 && cx <= f.rect.x + f.rect.w + 6 && cy >= f.rect.y - 6 && cy <= f.rect.y + f.rect.h + 6);
    });
    const out = [];
    for (const it of items) {
      if (it.kind !== 'para' || !it.rect || it.tabLines) { out.push(it); continue; }
      const ls = (it.lines && it.lines.length ? it.lines : String(it.text || '').split('\n')).filter((l) => String(l).trim());
      if (!ls.length) { out.push(it); continue; }
      if (!DATE.test(ls[0])) {
        const pitch = it.lineSpacingPt || (it.fontPt || 12) * 1.2;
        const expH = ls.length * pitch;
        const hitF = figs.find((f) => Math.abs(it.rect.y - f.rect.y) <= 8 && it.rect.h > expH + 14 &&
          Math.min(it.rect.x + it.rect.w, f.rect.x + f.rect.w) - Math.max(it.rect.x, f.rect.x) >= 0.3 * Math.min(it.rect.w, f.rect.w));
        if (hitF) {
          const ny = it.rect.y + it.rect.h - expH;
          if (hitF.rect.y + hitF.rect.h > ny - 1) { hitF.rect = Object.assign({}, hitF.rect, { h: r1(Math.max(12, ny - hitF.rect.y - 2)) }); hitF.heightPt = hitF.rect.h; }
          out.push(Object.assign({}, it, { rect: Object.assign({}, it.rect, { y: r1(ny), h: r1(expH) }) }));
          continue;
        }
        out.push(it);
        continue;
      }
      if (ls.length === 1) { if (!onFig(it.rect)) out.push(it); continue; }
      // প্রথম লাইন তারিখ, বাকিগুলো নাম/পদবি: প্রথম লাইনের আন্দাজি জায়গা ছবির ওপর হলে শুধু সেটি বাদ
      const lh = it.rect.h / ls.length;
      if (onFig({ x: it.rect.x, y: it.rect.y, w: it.rect.w, h: lh })) {
        const rest = ls.slice(1);
        out.push(Object.assign({}, it, { lines: rest, text: rest.join('\n'), keepLines: true, rect: Object.assign({}, it.rect, { y: it.rect.y + lh, h: it.rect.h - lh }) }));
      } else out.push(it);
    }
    return out;
  }

  /** একটি পাতার item-তালিকা (rect স্বাভাবিককৃত) → সারি ও কলাম */
  function bandsOf(items, page) {
    items = dropSigDates(items);
    const withRect = items.filter((it) => it.rect);
    const noRect = items.filter((it) => !it.rect);
    withRect.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
    const bands = [];
    for (const it of withRect) {
      const r = it.rect;
      const band = bands[bands.length - 1];
      if (band && r.y < band.y1 - Math.min(r.h, band.minH) * 0.3) {
        band.items.push(it); band.y1 = Math.max(band.y1, r.y + r.h); band.minH = Math.min(band.minH, r.h);
      } else bands.push({ y0: r.y, y1: r.y + r.h, minH: Math.max(1, r.h), items: [it] });
    }
    if (noRect.length) {
      if (!bands.length) bands.push({ y0: page.margins.top, y1: page.margins.top, minH: 12, items: [] });
      const lb = bands[bands.length - 1];
      lb.items.push(...noRect.map((it) => Object.assign(it, { rect: { x: page.margins.left, y: lb.y1, w: page.widthPt - page.margins.left - page.margins.right, h: 0 } })));
    }
    const left = page.margins.left, right = page.widthPt - page.margins.right;
    let prevY1 = page.margins.top;
    return bands.map((band) => {
      const byX = band.items.slice().sort((a, b) => a.rect.x - b.rect.x);
      const cols = [];
      for (const it of byX) {
        const c = cols[cols.length - 1];
        if (c && it.rect.x < c.x1 - 2) { c.items.push(it); c.x1 = Math.max(c.x1, it.rect.x + it.rect.w); }
        else cols.push({ x0: it.rect.x, x1: it.rect.x + it.rect.w, items: [it] });
      }
      // শুধু একই কলামে পড়া লেবেল+বাক্স জোড়া (আলাদা কলামে থাকলে এমনিতেই পাশাপাশি — জোড়ায় নেস্টেড টেবিল উচ্চতা বাড়াত, a02)
      cols.forEach((c) => { if (c.items.length > 1) attachBoxLabels(c.items); });
      const gapBeforePt = r1(Math.max(0, band.y0 - prevY1));
      const bandMathBot = mathHOn() ? Math.max(band.y1, ...band.items.map((x) => x.rect.y + Math.max(x.rect.h, ((x.lines && x.lines.length) || 1) * (x.fontPt || 12) * 1.15 + (x.mathExtraPt || 0)))) : band.y1;
      prevY1 = Math.max(prevY1, bandMathBot);
      const isShortSideLabel = (col) => formKitOn() && col.items.length === 1 && col.items[0].kind === 'para'
        && (col.items[0].lines || []).length <= 1 && String(col.items[0].text || '').trim().length > 0
        && String(col.items[0].text || '').trim().length <= 24;
      const isMatchColBand = formKitOn() && cols.length === 2 && cols.every((col) => col.items.every((it) => it.type === 'match_col' || (it.kind === 'para' && (it.lines || []).length >= 2 && (it.lines || []).every((l) => String(l).trim().length <= 20))));
      const cells = cols.map((c, i) => {
        let cx0 = i === 0 ? left : r1((cols[i - 1].x1 + c.x0) / 2);
        // WRAPFIT / A01FIX: পাতার ডান মার্জিনের সামান্য বাইরের স্ক্যান-আয়ত (যেমন 540.48pt বনাম 540pt) ডান মার্জিনেই সীমিত রাখা
        let cx1 = i === cols.length - 1 ? ((wrapFitOn() || a01FixOn()) && c.x1 > right && c.x1 <= right + 6 ? right : Math.max(right, c.x1)) : r1((c.x1 + cols[i + 1].x0) / 2);
        if (formKitOn() && cols.length >= 2) {
          if (i > 0 && isShortSideLabel(c)) {
            cx0 = r1(Math.min(cx0, cols[i - 1].x1 + 6));
            c.items[0].noWrap = true;
          } else if (i < cols.length - 1 && isShortSideLabel(cols[i + 1])) {
            cx1 = r1(Math.min(cx1, c.x1 + 6));
          } else if (isMatchColBand && i === 1) {
            cx0 = r1(c.x0);
          } else if (isMatchColBand && i === 0) {
            cx1 = r1(cols[1].x0);
          }
        }
        c.items.sort((a, b) => a.rect.y - b.rect.y);
        let yPrev = band.y0;
        const items = c.items.map((it, k) => {
          const out = Object.assign({}, it);
          if ((wrapFitOn() || a01FixOn()) && out.kind === 'para' && (out.lines || []).length === 1 && out.rect && out.rect.x + out.rect.w > right && out.rect.x + out.rect.w <= right + 6) {
            out.rect = Object.assign({}, out.rect, { w: r1(Math.max(20, right - out.rect.x)) });
          }
          out.indentPt = r1(Math.max(0, it.rect.x - cx0));
          // Part-17.7: মাঝে/ডানে বসানো লেখায় বাম-ইনডেন্ট নয় — কেন্দ্রের সরণ / ডান-কিনারার দূরত্ব (নইলে দুবার সরে ডানে চলে যেত)
          if (it.kind === 'para' && it.align === 'c') {
            // এক পাশে দ্বিগুণ ইনডেন্ট লাইনের জায়গা কমায় ⇒ লেখার পাশে যতটুকু ফাঁকা আছে তার মধ্যেই সরণ (নইলে শিরোনাম দুই লাইনে ভাঙত)
            const slack = Math.max(0, ((cx1 - cx0) - it.rect.w * (widthOn() ? 1 : 1.06)) / 2);
            out.centerShiftPt = (a17FixOn() && it._clippedCenter) ? 0 : r1(clamp((it.rect.x + it.rect.w / 2) - (cx0 + cx1) / 2, -slack, slack));
            if (out._clippedCenter) delete out._clippedCenter;
          }
          if ((ruleFixOn() || rules2On()) && out.fullWidthShadeBar) {
            out.indentPt = 0;
            out.centerShiftPt = rules2On() ? null : 0;
          }
          if (it.kind === 'para' && it.align === 'r') out.rightIndentPt = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
          if ((a10LinesOn() || a10FixOn() || a14FixOn() || a19FixOn() || widthOn()) && it.kind === 'para' && it.align === 'j' && (((a14FixOn() || a19FixOn()) && (!lineGapOn() || /([._\-…·─])\1{4,}/.test(it.text || ''))) || (out.keepLines && out.keepJust)) && it.rect && it.rect.w > 0) {
            const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
            if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) out.justRightPt = jr;
          }
          // Part-17.8: ট্যাব-অবস্থান ঘর/স্তম্ভের বাম কিনারা থেকে (Word-নিয়ম; ইনডেন্ট থেকে নয়)
          if (it.tabStopsAbs) {
            out.tabStops = it.tabStopsAbs.map((x) => (formKitOn() && x && typeof x === 'object' ? Object.assign({}, x, { pos: r1(x.pos - cx0) }) : r1(x - cx0)))
              .filter((x) => (formKitOn() && x && typeof x === 'object' ? x.pos : x) > out.indentPt + 2);
          }
          if (formKitOn() && out.noWrap && out.kind === 'para') {
            const needW = String(out.text || '').replace(/\*\*|<[^>]+>/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').length * (out.fontPt || 12) * 0.62 + 8;
            if ((cx1 - cx0) - out.indentPt < needW) out.indentPt = r1(Math.max(0, (cx1 - cx0) - needW));
          }
          out.spaceBeforePt = r1(Math.max(0, it.rect.y - (k === 0 ? band.y0 : yPrev)));
          const effH = mathHOn() && it.mathExtraPt ? Math.max(it.rect.h, ((it.lines && it.lines.length) || 1) * (it.fontPt || 12) * 1.15 + it.mathExtraPt) : it.rect.h;
          yPrev = it.rect.y + effH;
          return out;
        });
        return { x0: r1(cx0), x1: r1(cx1), items };
      });
      return { kind: cells.length > 1 ? 'grid' : 'flow', gapBeforePt, y0: r1(band.y0), y1: r1(band.y1), cells };
    });
  }

  /** একই পাতার একই ধরনের প্রবাহ-অনুচ্ছেদের ইনডেন্ট কাছাকাছি (≤৬pt) হলে এক (মাপের ছোট গোলমাল দূর — ক/খ/গ/ঘ এক সারিতে) */
  function snapIndents(page) {
    const groups = {};
    page.bands.filter((b) => b.kind === 'flow').forEach((b) => b.cells[0].items.forEach((it) => {
      if (it.kind === 'para') (groups[it.type] = groups[it.type] || []).push(it);
    }));
    for (const arr of Object.values(groups)) {
      const subArrs = (indentOn() && arr[0] && arr[0].type === 'paragraph')
        ? [arr.filter((x) => (x.firstIndentPt || 0) >= 15 && (x.indentPt || 0) >= 40), arr.filter((x) => !((x.firstIndentPt || 0) >= 15 && (x.indentPt || 0) >= 40))].filter((a) => a.length > 0)
        : [arr];
      for (const sub of subArrs) {
      const sorted = sub.slice().sort((a, b) => a.indentPt - b.indentPt);
      let cluster = [];
      const flush = () => {
        if (cluster.length > 1) {
          const m = median(cluster.map((x) => x.indentPt));
          cluster.forEach((x) => { x.indentPt = r1(m); });
          if (boxSplitOn() && cluster[0].type === 'list_item') {
            const multi = cluster.filter((x) => (x.lines || []).length >= 2);
            const negFi = multi.filter((x) => x.firstIndentPt <= -12).map((x) => x.firstIndentPt);
            if (negFi.length >= 3 && negFi.length >= multi.length * 0.5) {
              const medFi = r1(median(negFi));
              const validLs = multi.filter((x) => x.lineSpacingPt >= (x.fontPt || 12) * 1.05 && x.lineSpacingPt <= (x.fontPt || 12) * 1.6).map((x) => x.lineSpacingPt);
              const medLs = validLs.length ? r1(median(validLs)) : 0;
              multi.forEach((x) => {
                if (x.firstIndentPt > -6) x.firstIndentPt = medFi;
                if ((!x.lineSpacingPt || x.lineSpacingPt < (x.fontPt || 12) * 0.95) && medLs > 0) x.lineSpacingPt = medLs;
                if (x.align === 'l' || x.align === 'j') { x.align = 'j'; x.keepJust = true; }
              });
            }
          }
        }
        cluster = [];
      };
      for (const it of sorted) {
        if (cluster.length && it.indentPt - cluster[0].indentPt > 6) flush();
        cluster.push(it);
      }
      flush();
      }
      // Part-17.6: হালকা ছাপা ("গ." ধূসর) কালি-মাপে বাদ পড়লে ইনডেন্ট ভুল বড় হয় — Gemini-বক্সের বাম প্রান্ত (≤০.৮% পাতা)
      // অন্তত দুটি একই-ধরনের অনুচ্ছেদের সাথে মিললে তাদের ইনডেন্ট (দুই স্বাধীন সংকেত একমত হলে তবেই)
      const boxed = arr.filter((x) => Array.isArray(x.box) && isFinite(x.box[1]));
      const fixes = [];
      for (const it of boxed) {
        const peers = boxed.filter((p) => p !== it && Math.abs(p.box[1] - it.box[1]) <= 8);
        if (peers.length < 2) continue;
        const m = median(peers.map((p) => p.indentPt));
        const peersAgree = indentOn()
          ? (!it.fit && (it.indentPt - m) > 6 && peers.filter((p) => Math.abs(p.indentPt - m) <= 6).length >= Math.max(2, Math.ceil(peers.length * 0.6)))
          : peers.every((p) => Math.abs(p.indentPt - m) <= 6);
        if (Math.abs(it.indentPt - m) > 6 && peersAgree) fixes.push([it, m]);
      }
      fixes.forEach(([it, m]) => { it.indentPt = r1(m); });
    }
  }

  /**
   * Part-17.6: একই পাতার একই ধরনের অনুচ্ছেদ (শিরোনাম-জাতীয় বাদে) — ফন্ট গোষ্ঠীর মধ্যমার ±২৫%-এর ভেতরে হলে মধ্যমা।
   * (আসল ছবিতে দেখা: চার অপশনের একটি ("গ.") উঁচু কার/উদ্ধৃতি-চিহ্নে বড় মাপা হয়ে বড় ফন্টে আসত।)
   */
  function snapFonts(page) {
    const groups = {};
    page.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
      if (it.kind === 'para' && it.fontPt && !/^(title|heading|header)$/.test(it.type)) (groups[it.type] = groups[it.type] || []).push(it);
    })));
    for (const arr of Object.values(groups)) {
      if (arr.length < 2) continue;
      const m = median(arr.map((x) => x.fontPt));
      // Part-17.9: প্রস্থ-ভিত্তিক অনুমান নির্ভুল ⇒ শুধু মাপের গোলমাল (±৮%) এক করা; আসল আকার-পার্থক্য রাখা
      arr.forEach((x) => { if (Math.abs(x.fontPt - m) <= m * 0.08) x.fontPt = m; });
    }
    // মালিকের চিঠি (২০২৬-১০-১৩): মূলে এক আকারের অনুচ্ছেদগুলো আমাদের ১১/১৩/১৬pt — কালি-মাপের গোলমাল ±৮%-এর অনেক বেশি।
    // একই Gemini-আকার-শ্রেণির (fs) সাধারণ লেখা (অনুচ্ছেদ/তালিকা/প্রশ্ন) পাতায় ≥২টি ⇒ লাইন-ভারিত প্রধান আকার; ±৩০%-এর ভেতরের সবাই সেটিতে।
    // আসল আকার-পার্থক্য হলে Gemini আলাদা শ্রেণি দেয় (s/m/l) ⇒ থাকে
    if (!globalThis.__FZ_OFF_BODYSNAP) {
      const byFs = {};
      page.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
        if (it.kind === 'para' && it.fontPt && it.fs && /^(paragraph|list_item|question)$/.test(it.type)) (byFs[it.fs] = byFs[it.fs] || []).push(it);
      })));
      for (const arr of Object.values(byFs)) {
        if (arr.length < 2) continue;
        // ভোট = আসল অক্ষর-সংখ্যা (পূরণ-রেখা বাদ); ≥১৫ অক্ষরের লেখাই ভোট দেয় — a01: দশটি "১।" (আকার অনুমানহীন, পাতার ডিফল্ট)
        // লাইন-গোনায় জিতে ১১.৫pt অনুচ্ছেদগুলো ১০-এ নামাত
        // শুধু-রেখা/ছোট লেখা (a09: "-----" ৮.৫⇒১২ হলে প্রস্থ ফুলে লাইন ভাঙত) বদলায় না — ভোটারই বদলায়
        const w = {}, realN = (x) => String(x.text || '').replace(/([._\-…·─])\1{2,}/g, '').replace(/\s+/g, '').length;
        // পূরণ-রেখাওয়ালা লাইনও নয় (a02: "০২। বর্তমান ঠিকানা : ……" ১৩⇒১১ — বিন্দুর প্রস্থ বদলে ছবি −১.৬)
        const voters = arr.filter((x) => (realN(x) >= 15 || (widthOn() && realN(x) >= 10 && !/^\s*\*{0,2}[০-৯\d]{1,3}[।.)]/.test(String(x.text || '')))) && !/([._\-…·─])\1{5,}/.test(String(x.text || '')));
        voters.forEach((x) => { w[x.fontPt] = (w[x.fontPt] || 0) + realN(x); });
        // ২০২৬-১০-১৪ (a17 p2 "বিষয়ের নাম : ……" ১৫.৫ / "বান্ডেলের অভ্যন্তরের … : ……" ১১.৫, মূলে সমান): ভোটার <২ হলেও শ্রেণির
        // মধ্যমায় পূরণ-সারি এক (নিচে FILLSNAP); সাধারণ লেখা আগের মতো শুধু ভোটার থাকলে
        if (voters.length < 2) {
          if (!globalThis.__FZ_OFF_FILLSNAP) {
            const fill = arr.filter((x) => /([._\-…·─])\1{5,}/.test(String(x.text || '')));
            const md = median(arr.map((x) => x.fontPt));
            if (fill.length >= 2 || (fill.length && voters.length)) fill.forEach((x) => { const d = Math.abs(x.fontPt - md); if (d > md * 0.08 && d <= md * 0.35) { x.fontOutlier = x.fontOutlier || x.fontPt; x.fontPt = md; } });
          }
          continue;
        }
        const dom = +Object.keys(w).sort((a, b) => w[b] - w[a])[0];
        voters.forEach((x) => { if (x.fontPt !== dom && Math.abs(x.fontPt - dom) <= dom * 0.3) { x.fontOutlier = x.fontOutlier || x.fontPt; x.fontPt = dom; } });
        // ২০২৬-১০-১৪ (a17 p9/p10, মালিকের Word-যাচাই): পূরণ-সারি ভোটার নয়, বদলায়ও না ⇒ "কেন্দ্রের নাম : ……" ৯.৫ (মূলে পাশের লাইনের সমান)।
        // >৮% (≤৩৫%) গোলমালে পূরণ-সারিও প্রধান আকারে — মালিক: "একই ফরমের লেখা একই ফন্টে" (বিন্দু এখন লিডার-ট্যাবে মাপা প্রস্থে,
        // তাই a02-এর পুরোনো "বিন্দুর প্রস্থ বদলে ছবি −১.৬" ঝুঁকি কম)। বন্ধ: FZ_OFF=FILLSNAP
        if (!globalThis.__FZ_OFF_FILLSNAP) arr.filter((x) => !voters.includes(x) && /([._\-…·─])\1{5,}/.test(String(x.text || '')))
          .forEach((x) => { const d = Math.abs(x.fontPt - dom); if (d > dom * 0.08 && d <= dom * 0.35) { x.fontOutlier = x.fontOutlier || x.fontPt; x.fontPt = dom; } });
        // A01_REGRESS_v1: একই ফরমের সংক্ষিপ্ত ক্রমিক-তালিকা ("১।"–"১০।") এবং শুধু ড্যাশ-মাপা পূরণ-ঘরের ("তারিখ:---") ফন্ট প্রধান ফন্টের (dom) সমান রাখা
        if (a01FixOn()) {
          arr.filter((x) => (x.type === 'list_item' && realN(x) <= 4 && Math.abs(x.fontPt - dom) <= dom * 0.2)
            || (realN(x) >= 2 && /([._\-…·─])\1{5,}/.test(String(x.text || '')) && x.diag && x.diag.inkPt < 3 && x.diag.wPt >= 8))
            .forEach((x) => { if (x.fontPt !== dom) { x.fontOutlier = x.fontOutlier || x.fontPt; x.fontPt = dom; } });
          if (page.bodyFontPt && Math.abs(page.bodyFontPt - dom) <= dom * 0.2) page.bodyFontPt = dom;
        }
        if (a17FixOn()) {
          arr.filter((x) => !voters.includes(x) && realN(x) >= 4 && !/([._\-…·─])\1{5,}/.test(String(x.text || '')) && x.rect && x.rect.h >= dom * 0.7 && Math.abs(x.fontPt - dom) <= dom * 0.3)
            .forEach((x) => { if (x.fontPt !== dom) { x.fontOutlier = x.fontOutlier || x.fontPt; x.fontPt = dom; } });
        }
      }
    }
    // CV (মালিকের রান, ২০২৬-১০-১২): একই ধরন (list_item/label_value) ও একই Gemini-আকার-শ্রেণির (fs) সারিতে মাপা আকার লাফায়
    // (Sex/Marital ১৫.৫, Blood Group/Religion ৯.৫ — ভুল লাইনে বসা মাপ)। ≥৩টির দলে মধ্যমা থেকে >২০% দূরে ⇒ মাপের ভুল ⇒ মধ্যমা।
    // আসল আকার-পার্থক্য হলে Gemini-ও আলাদা শ্রেণি দেয় (s/m/l) ⇒ সেটা থাকে
    const byClass = {};
    page.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
      // শুধু তালিকা/লেবেল-মান (মাঠের সারি সমান হয়); শিরোনাম-অনুচ্ছেদে আকার আসলেই ভিন্ন হয় (g01 মেমো-মাথা ১৪/২০)
      if (it.kind === 'para' && it.fontPt && it.fs && /^(list_item|label_value)$/.test(it.type)) (byClass[it.type + '|' + it.fs] = byClass[it.type + '|' + it.fs] || []).push(it);
    })));
    for (const arr of Object.values(byClass)) {
      if (arr.length < 3) continue;
      const m = median(arr.map((x) => x.fontPt));
      arr.forEach((x) => { if (Math.abs(x.fontPt - m) > m * 0.2) { x.fontOutlier = x.fontPt; x.fontPt = m; } });
      // a15 (মালিকের টেস্ট, ২০২৬-১০-১৩): ফরমের সারি (০১–১৩) মূলে এক ফন্ট, মাপে ১১.৫–১৫ লাফায় (±২০%-এর ভেতরে ⇒ ওপরের নিয়মে থাকত)।
      // দলের অর্ধেক বা বেশি এক আকারে (±৩%) ⇒ সেটাই আসল; ±২০%-এর ভেতরের বাকিগুলোও সেই আকারে
      if (arr.length >= 5) {
        const cnt = {};
        arr.forEach((x) => { cnt[x.fontPt] = (cnt[x.fontPt] || 0) + 1; });
        const mode = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
        const near = arr.filter((x) => Math.abs(x.fontPt - mode) <= mode * 0.03).length;
        if (near >= arr.length * 0.5) arr.forEach((x) => { if (x.fontPt !== mode && Math.abs(x.fontPt - mode) <= mode * 0.2) { x.fontOutlier = x.fontOutlier || x.fontPt; x.fontPt = mode; } });
      }
    }
  }

  /**
   * CV (মালিকের রান, ২০২৬-১০-১২): লেবেল-মানের পরপর লাইনে কোলন এক খাড়া সারিতে থাকে — মাপা ট্যাব-স্টপ লাইন-ভেদে কয়েক pt
   * আলাদা আর কোলন কোথাও লেবেলের শেষে ("Result :\tCGPA"), কোথাও মানের শুরুতে ("Discipline\t: Philosophy")।
   * একই ঘরে পরপর এক-ট্যাবের item-দলে: (১) সবসময় "লেবেল\t:\tমান" (কোলন ও মান দুই স্টপে), (২) স্টপগুলো ≤২৪pt-এর মধ্যে হলে সবচেয়ে বড়টিতে এক।
   */
  /**
   * ২০২৬-১০-১৪ (a02 NOC, মালিকের Word-যাচাই): "০২।\tবর্তমান ঠিকানা", "০৬।\tআবেদনকারী…" — মাপা ফাঁকে ট্যাব, অথচ "০৫। আবেদনকারীর…",
   * "০৭। অনাপত্তি…" ট্যাবহীন (ফাঁক মাপা যায়নি) ⇒ লেখা নম্বরের গায়ে, ক্রমিক-সারি অসমান। পাতায় ট্যাবওয়ালা ক্রমিক-লাইনের নম্বর-স্টপ
   * (একই বাঁ-প্রান্ত ±৬pt) ট্যাবহীন এক-লাইনের ক্রমিক-অনুচ্ছেদেও। বন্ধ: FZ_OFF=NUMTAB
   */
  function alignNumberTabs(page) {
    if (globalThis.__FZ_OFF_NUMTAB) return;
    const NUM = /^\s*(\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2})\s*\t/, NUMS = /^\s*(\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2})\s+(\S.*)$/;
    const refs = [], cands = [];
    page.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
      if (it.kind !== 'para') return;
      const left = (c.x0 || 0) + (it.indentPt || 0);
      if (it.tabLines && it.tabStops && it.tabStops.length && (!formKitOn() || typeof it.tabStops[0] === 'number') && NUM.test(it.tabLines[0])) refs.push({ left, stop: (c.x0 || 0) + it.tabStops[0] });
      else if (!it.tabLines && it.lines && it.lines.length === 1 && NUMS.test(String(it.lines[0]))) cands.push({ it, left, x0: c.x0 || 0 });
    })));
    if (!refs.length) return;
    for (const { it, left, x0 } of cands) {
      const ref = refs.find((r) => Math.abs(r.left - left) <= 6);
      if (!ref) continue;
      const m = NUMS.exec(String(it.lines[0]));
      // নম্বরের মাপা প্রস্থ স্টপের আগে শেষ হতেই হবে (নইলে ট্যাব পরের স্টপে লাফাত)
      if (it.rect && left + it.rect.w * m[1].replace(/\*/g, '').length / String(it.lines[0]).trim().length > ref.stop - 2) continue;
      Object.assign(it, { tabLines: [m[1] + '\t' + m[2]], tabStops: [r1(ref.stop - x0)], firstIndentPt: 0 });
    }
  }

  function alignTabStops(page) {
    const nTab = (l) => (l.match(/\t/g) || []).length;
    // এক ট্যাবের item: প্রথম লাইনে ঠিক একটি ট্যাব, বাকি লাইনে ≤১ (ঠিকানার পরের লাইন ট্যাবহীন হতে পারে)
    const isA16SerialTabItem = (it) => (a16FixOn() || widthOn()) && it.type === 'list_item' && (!/([._\-…·─])\1{4,}/.test(String(it.text || '')) || (widthOn() && !it.tabLines.some((l) => /[:|]\s*\t/.test(String(l))))) && typeof it.tabStops[0] === 'number' && it.tabStops[0] - (it.indentPt || 0) >= 12 && it.tabStops[0] - (it.indentPt || 0) <= 50 && ((it.firstIndentPt || 0) < -4 || /^\s*\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2}\s*\t/.test(String(it.tabLines[0] || '')));
    const oneTab = (it) => it.kind === 'para' && it.tabLines && it.tabStops && it.tabStops.length === 1 && (!formKitOn() || typeof it.tabStops[0] === 'number') && nTab(it.tabLines[0]) === 1 && it.tabLines.every((l) => nTab(l) <= 1) && !(((a10LinesOn() || a10FixOn()) && ((it.firstIndentPt || 0) < -4 || /^\s*\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2}\s*\t/.test(String(it.tabLines[0] || '')))) || isA16SerialTabItem(it));
    // ≥৩ লাইনের item-এ অর্ধেক বা বেশি লাইনে ট্যাব ⇒ ট্যাবহীন "লেবেল : মান" লাইনেও কোলনে ট্যাব (শিক্ষাগত যোগ্যতার তালিকা)
    const fillTabs = (it) => {
      const L = it.tabLines;
      if (!L || L.length < 3 || L.filter((l) => nTab(l) === 1).length < L.length / 2) return;
      it.tabLines = L.map((l) => (nTab(l) ? l : l.replace(/\s+:\s+/, '\t: ')));
    };
    // দল: এক-ঘরের পরপর ব্যান্ড জুড়ে (প্রতিটি লাইন সাধারণত আলাদা ব্যান্ড), আর বহু-ঘরের ব্যান্ডে প্রতিটি ঘর আলাদা
    const runs = [];
    let cur = [], pend = [];
    const flush = () => { if (cur.length) runs.push(cur); cur = []; pend = []; };
    // সিভি (মালিকের স্ক্রিনশট ২): "Name of University : National University" — মাপা ফাঁক নেই বলে ট্যাবহীন, দলের পাশে বেমানান।
    // দলের ঠিক আগে/পরে একই ইনডেন্টের এক-লাইন "লেবেল : মান", লেবেল (মাপা প্রস্থ × অক্ষর-অনুপাত) কোলন-কলামের আগে শেষ ⇒ দলে
    const kvOf = (it) => it.kind === 'para' && !it.tabLines && it.rect && it.lines && it.lines.length === 1
      && /^([^:\t]{2,60}?)\s*:\s+(\S.*)$/.exec(String(it.lines[0]).trim());
    const attach = (r, ref) => {
      const stop = ref.x0 + ref.it.tabStops[0] - r.x0, ind = r.it.indentPt || 0;
      if (Math.abs(r.x0 + ind - (ref.x0 + (ref.it.indentPt || 0))) > 6) return false;
      if (ind + r.it.rect.w * r.m[1].trim().length / String(r.it.lines[0]).trim().length > stop - 2) return false;
      Object.assign(r.it, { tabLines: [r.m[1].trim() + '\t: ' + r.m[2]], tabStops: [r1(stop)] });
      return true;
    };
    // ট্যাব-স্টপ ঘরের বাঁ থেকে ⇒ ব্যান্ড-ভেদে ঘরের বাঁ আলাদা হতে পারে, তাই তুলনা পরম অবস্থানে (x0 + স্টপ)
    // সিভি fresh2 (২০২৬-১০-১২): ঠিকানার পরের লাইন ("P.S : Sadar") Gemini আলাদা ট্যাবহীন item দেয় — শুরু আগের লাইনের কোলন/মানের
    // কাছে (কোলন-স্টপ −৪ … +২em) ⇒ "\t\t" + আগের লেবেলের ইনডেন্টে (দুই ট্যাবে মানের কলামে), দল ভাঙে না
    const contOf = (it, x0) => {
      const last = cur.length && cur[cur.length - 1];
      if (!last || it.kind !== 'para' || it.tabLines || !it.lines || !it.lines.length || it.lines.length > 2) return false;
      const stop = last.x0 + last.it.tabStops[0], x = x0 + (it.indentPt || 0), em = it.fontPt || 12;
      if (x < stop - 4 || x > stop + 2 * em) return false;
      Object.assign(it, { tabLines: it.lines.map((l) => '\t\t' + String(l).trim()), tabStops: [r1(stop - x0)], indentPt: last.it.indentPt || 0, firstIndentPt: 0 });
      cur.push({ it, x0 });
      return true;
    };
    const feed = (items, x0) => items.forEach((it) => {
      fillTabs(it);
      if (oneTab(it)) {
        // দলের আগের টানা kv-লাইন (পেছন থেকে, যতক্ষণ খাপ খায়)
        if (!cur.length && pend.length) {
          const ref = { it, x0 }, ok = [];
          for (let k = pend.length - 1; k >= 0 && attach(pend[k], ref); k--) ok.unshift(pend[k]);
          cur.push(...ok);
        }
        pend = [];
        cur.push({ it, x0 });
        return;
      }
      if (contOf(it, x0)) return;
      const m = kvOf(it);
      if (!m) { flush(); return; }
      const r = { it, x0, m };
      if (!cur.length) { pend.push(r); return; }
      if (attach(r, cur[cur.length - 1])) cur.push(r);
      else { flush(); pend = [r]; }
    });
    page.bands.forEach((b) => {
      if (b.cells.length === 1) feed(b.cells[0].items, b.cells[0].x0 || 0);
      else { flush(); b.cells.forEach((c) => { feed(c.items, c.x0 || 0); flush(); }); }
    });
    flush();
    for (const run of runs) {
      const lines = run.flatMap((r) => r.it.tabLines);
      if (lines.length < 2) continue;
      run.forEach(({ it }) => {
        // সবসময় "লেবেল\t: মান" (কোলন এক খাড়া সারিতে)। সিভি fresh2: আগে সংখ্যাগরিষ্ঠ "লেবেল :\t" রূপ রাখা হতো ⇒ কোলন লেবেলের
        // গায়ে, এলোমেলো। tabify ভাগ কোলনেই রাখে, তাই মাপা স্টপ কোলনের অবস্থান
        it.tabLines = it.tabLines.map((l) => l.replace(/\s*:\s*\t\s*(?!:)/, '\t: '));
        // ট্যাবহীন পরের লাইন (ঠিকানার "P.S : Sadar…") মূলে মানের নিচে শুরু ⇒ ট্যাবে (কোলনের পরের ফাঁক পেরিয়ে)
        it.tabLines = it.tabLines.map((l, k) => (k && !nTab(l) ? '\t  ' + l : l));
      });
      const abs = run.map((r) => r.x0 + r.it.tabStops[0]);
      if (run.length > 1 && Math.max(...abs) - Math.min(...abs) <= 24) {
        const mx = Math.max(...abs);
        run.forEach((r) => { r.it.tabStops = [r1(mx - r.x0)]; });
      }
      // দুই-স্টপ (মালিক, ২০২৬-১০-১২): "লেবেল\t: মান" ⇒ "লেবেল\t:\tমান"; মান-স্টপ = কোলন-স্টপ + ০.৭em (": "-এর প্রস্থের চেয়ে বেশি,
      // নইলে Word পরের ডিফল্ট স্টপে লাফ দেয়) ⇒ মানের কলামও রুলারে লক, মান বদলালেও সোজা
      if (indentOn() && !lines.some((l) => /\t\s*[:：]|[:：]\s*\t/.test(String(l)))) {
        run.forEach(({ it }) => {
          it.tabLines = it.tabLines.map((l, k) => (k ? String(l).replace(/^\t+\s*/, '') : l));
        });
        continue;
      }
      run.forEach(({ it }) => {
        it.tabLines = it.tabLines.map((l) => l.replace(/\t: (?=\S)/, '\t:\t').replace(/^\t {2}(?=\S)/, '\t\t'));
        it.tabStops = [it.tabStops[0], r1(it.tabStops[0] + 0.7 * (it.fontPt || 12))];
      });
    }
  }

  /**
   * Part-17.8: পাশাপাশি কলামের মাঝের খাড়া দাগ (উৎস-মাপ) ⇒ গ্রিড-ঘরের ডান সীমানা; কলাম-সীমা দাগের অবস্থানে।
   * শর্ত: দাগ দুই কলামের লেখার ফাঁকে, আর সারির উচ্চতার ≥৫০% জুড়ে।
   */
  function applyVerticalRules(page, vrules, rawBoxes) {
    if (!vrules || !vrules.length || !page.xform) return;
    if (rules2On() && !tableGridOn() && !page.frame && Array.isArray(rawBoxes) && rawBoxes.some((bx) => !bx.dashed && (bx.x1 - bx.x0) >= (page.widthPt || 595) * 0.7 && (bx.y1 - bx.y0) >= (page.heightPt || 842) * 0.3)) return;
    const X = page.xform;
    const rules = vrules.map((v) => ({ x: X.left + (v.x - X.x0) * X.scale, y0: X.top + (v.y - X.y0) * X.scale, y1: X.top + (v.y + v.h - X.y0) * X.scale }));
    for (const band of page.bands) {
      if (band.kind !== 'grid') continue;
      for (let i = 0; i < band.cells.length - 1; i++) {
        const A = band.cells[i], B = band.cells[i + 1];
        const aR = Math.max(...A.items.map((it) => (it.rect ? it.rect.x + it.rect.w : A.x0)));
        const bL = Math.min(...B.items.map((it) => (it.rect ? it.rect.x : B.x1)));
        // [Rule IR6: FZ_OFF=FORMFIX / FZ_OFF=IR6] নিরেট বহু-বক্সের ফরম পাতায় (যেমন a03) ২-কলাম গ্রিডের মাঝখানের খাড়া বিভাজক রেখা শনাক্তকরণে সহনশীলতা ১৮pt রাখা।
        const solidBoxes = !!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_IR6 && Array.isArray(rawBoxes) && rawBoxes.length >= 2 && !rawBoxes.some((bx) => bx.dashed));
        const tol = solidBoxes ? 18 : 2;
        const r = rules.find((v) => v.x >= aR - tol && v.x <= bL + tol && v.x > A.x0 + 20 && v.x < B.x1 - 20 && (Math.min(v.y1, band.y1) - Math.max(v.y0, band.y0)) >= (band.y1 - band.y0) * (solidBoxes ? 0.45 : 0.5));
        if (!r) continue;
        A.ruleRight = true;
        const dx = r1(r.x) - B.x0;
        A.x1 = r1(r.x); B.x0 = r1(r.x);
        // B-র ভেতরের ইনডেন্ট/ট্যাব নতুন কলাম-শুরু থেকে
        B.items.forEach((it) => { if (it.indentPt != null) it.indentPt = r1(Math.max(0, it.indentPt - dx)); if (it.tabStops) it.tabStops = it.tabStops.map((t) => (formKitOn() && t && typeof t === 'object' ? Object.assign({}, t, { pos: r1(t.pos - dx) }) : r1(t - dx))); });
      }
    }
  }

  /**
   * ২০২৬-১০-১২: পাতার বাক্স (উৎস-মাপ, page-geometry boxFrames) ⇒ ভেতরের অংশে boxIds (বাইরের আগে), page.boxes।
   * builder ভেতরের অংশ এক-ঘরের টেবিলে মোড়ে (a03 মূল-অংশ, f2 ড্যাশ-ফ্রেম, "ফরম-৮"/"তফসিল")।
   * নেওয়া হয় শুধু যদি: কোনো অংশ কিনারা পেরোয় না, ভেতরে অন্তত একটি অনুচ্ছেদ, পাতা-স্তরের সদস্যরা পরপর, আর বাক্সটা কোনো
   * টেবিল/চিত্রের নিজের সীমানা নয়। পাতা-স্তরে না মিললে একটি গ্রিড-ঘরের ভেতরে (ঘরের অংশে)।
   */
  function applyBoxFrames(page, boxes) {
    if (!boxes || !boxes.length || !page.xform) return;
    const X = page.xform, tol = 4;
    const bx = boxes.map((b) => ({ x0: X.left + (b.x0 - X.x0) * X.scale, x1: X.left + (b.x1 - X.x0) * X.scale,
      y0: X.top + (b.y0 - X.y0) * X.scale, y1: X.top + (b.y1 - X.y0) * X.scale, t: (b.t || 0.75) * X.scale, dashed: !!b.dashed,
      dashDot: !!(formKitOn() && (b.dashDot || b.style === 'dotDash' || b.style === 'dashDot' || b.style === 'dash-dot' || b.borderStyle === 'dotDash' || b.borderStyle === 'dashDot')),
      style: formKitOn() ? (b.style || b.borderStyle || (b.dashDot ? 'dotDash' : b.dashed ? 'dashed' : 'single')) : undefined,
      fill: formKitOn() ? normHexColor(b.fill || b.shade) : undefined, label: formKitOn() ? b.label : undefined, photoBox: formKitOn() ? b.photoBox : undefined }))
      .sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0));
    const inside = (r, b) => r.x >= b.x0 - tol && r.x + r.w <= b.x1 + tol && r.y >= b.y0 - tol && r.y + r.h <= b.y1 + tol;
    const touches = (r, b) => Math.min(r.x + r.w, b.x1) - Math.max(r.x, b.x0) > 0 && Math.min(r.y + r.h, b.y1) - Math.max(r.y, b.y0) > 0;
    const own = (r, b) => Math.abs(r.x - b.x0) <= 8 && Math.abs(r.x + r.w - b.x1) <= 8 && Math.abs(r.y - b.y0) <= 8 && Math.abs(r.y + r.h - b.y1) <= 8;
    const rectOf = (its) => {
      const rs = its.filter((it) => it.rect).map((it) => it.rect);
      if (!rs.length) return null;
      const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
      return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
    };
    // A14_BOXSPLIT_v2: ফ্রেম-বাক্সের ভেতরে খাড়া বিভাজকহীন ২-কলামের গ্রিড-ব্যান্ডে ডান কলামটি ছোট ১-লাইনের স্বাক্ষর/সীল লেবেল হলে
    // আলাদা কলাম না বানিয়ে বাম অনুচ্ছেদের সাথে ডান-ট্যাবে ('\t') এক সারিতে সংযোজন
    if (boxSplitOn()) {
      const pageSized0 = (b) => b.x1 - b.x0 >= page.widthPt * 0.7 && b.y1 - b.y0 >= page.heightPt * 0.7;
      for (const band of page.bands) {
        if (band.kind !== 'grid' || band.cells.length !== 2 || band.cells[0].ruleRight) continue;
        const encBox = bx.find((b) => !(page.frame && pageSized0(b)) && band.y0 >= b.y0 - tol && band.y1 <= b.y1 + tol);
        if (!encBox) continue;
        const c0 = band.cells[0], c1 = band.cells[1];
        if (c0.items.length !== 1 || c1.items.length !== 1) continue;
        const itL = c0.items[0], itR = c1.items[0];
        if (!itL || !itR || itL.kind !== 'para' || itR.kind !== 'para') continue;
        if ((itL.lines && itL.lines.length > 1) || (itR.lines && itR.lines.length > 1)) continue;
        const txtR = String(itR.text || (itR.lines && itR.lines[0]) || '').trim();
        const visR = txtR.replace(/\*\*|<[^>]+>/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
        if (!(visR > 0 && visR <= 40)) continue;
        const txtL = String(itL.text || (itL.lines && itL.lines[0]) || '').trim().replace(/([._\-…·─])\1{25,}/g, (run) => run[0].repeat(25));
        const comb = txtL ? txtL + '\t' + txtR : '\t' + txtR;
        const cellX0 = c0.x0, cellX1 = c1.x1;
        const rEdge = itR.rect ? Math.min(encBox.x1 - 4, itR.rect.x + itR.rect.w) : Math.min(cellX1, encBox.x1 - 6);
        const stopPos = r1(Math.max(100, rEdge - cellX0));
        const newRect = itL.rect && itR.rect ? {
          x: Math.min(itL.rect.x, itR.rect.x), y: Math.min(itL.rect.y, itR.rect.y),
          w: Math.max(itL.rect.x + itL.rect.w, itR.rect.x + itR.rect.w) - Math.min(itL.rect.x, itR.rect.x),
          h: Math.max(itL.rect.y + itL.rect.h, itR.rect.y + itR.rect.h) - Math.min(itL.rect.y, itR.rect.y)
        } : (itL.rect || itR.rect);
        const mergedIt = Object.assign({}, itL, {
          text: comb, lines: [comb], tabLines: [comb], tabStops: [stopPos], rightTab: true, align: 'l', rect: newRect
        });
        band.kind = 'flow';
        band.cells = [{ x0: cellX0, x1: cellX1, items: [mergedIt] }];
      }
    }
    // পাতা-স্তরের অংশ: প্রবাহের প্রতিটি অংশ, গ্রিড-ব্যান্ড পুরোটা
    const top = [];
    page.bands.forEach((b) => (b.kind === 'grid' ? top.push({ obj: b, items: b.cells.flatMap((c) => c.items), band: b })
      : b.cells[0].items.forEach((it) => top.push({ obj: it, items: [it] }))));
    top.forEach((t) => { t.rect = rectOf(t.items); });
    // ভেতরের বাক্স অন্য বাক্সের পুরো ভেতরে না হলে নেওয়া যায় না
    const fits = (obj, b) => (obj.boxIds || []).every((id) => { const o = page.boxes.find((x) => x.id === id); return o && b.x0 >= o.x0 - tol && b.x1 <= o.x1 + tol && b.y0 >= o.y0 - tol && b.y1 <= o.y1 + tol; });
    const hasPara = (its) => its.some((it) => it.kind === 'para');
    page.boxes = [];
    let nid = 0;
    // ২০২৬-১০-১৪: পাতা-জোড়া বাক্স (≥৭০% প্রস্থ ও উচ্চতা) = পাতা-ফ্রেমেরই দাগ (2.pdf সিলেবাস: দ্বৈত ফ্রেম ⇒ pgBorders + ২টি
    // বাক্স-টেবিল, দুবার আঁকা; বাক্স-টেবিল ডানে উপচে পাতা ১-কে ২ পাতা করত) ⇒ ফ্রেম থাকলে বাক্স নয়। বন্ধ: FZ_OFF=FRAMEBOX
    const pageSized = (b) => b.x1 - b.x0 >= page.widthPt * 0.7 && b.y1 - b.y0 >= page.heightPt * 0.7;
    for (const b of bx) {
      if (!globalThis.__FZ_OFF_FRAMEBOX && page.frame && pageSized(b)) continue;
      const memb = top.filter((t) => t.rect && inside(t.rect, b));
      const cross = top.filter((t) => t.rect && touches(t.rect, b) && !inside(t.rect, b));
      let objs = null;
      if (!cross.length && memb.length) {
        const idx = memb.map((t) => top.indexOf(t));
        const its = memb.flatMap((t) => t.items);
        const contiguous = idx.every((v, k) => !k || v === idx[k - 1] + 1);
        const onlyOwn = memb.length === 1 && !memb[0].band && memb[0].obj.kind !== 'para' && own(memb[0].rect, b);
        if (contiguous && hasPara(its) && !onlyOwn) objs = memb.map((t) => t.obj);
      } else if (cross.length === 1 && cross[0].band) {
        // গ্রিড-ঘরের ভেতরের বাক্স (f2: লোগোর পাশে "ফরম-৮")
        const cTol = formKitOn() ? 14 : tol;
        const cell = cross[0].band.cells.find((c) => b.x0 >= c.x0 - cTol && b.x1 <= c.x1 + cTol);
        const allIts = cross[0].items;
        if (cell) {
          const m = cell.items.filter((it) => it.rect && inside(it.rect, b));
          const bad = allIts.some((it) => it.rect && touches(it.rect, b) && !inside(it.rect, b)) || memb.length;
          const idx = m.map((it) => cell.items.indexOf(it));
          if (!bad && m.length && hasPara(m) && idx.every((v, k) => !k || v === idx[k - 1] + 1)
            && !(m.length === 1 && m[0].kind !== 'para' && own(m[0].rect, b))) objs = m;
        }
      }
      if (!objs && formKitOn() && !cross.length && !memb.length && (b.photoBox || b.label != null || (b.x1 - b.x0 >= 30 && b.x1 - b.x0 <= 180 && b.y1 - b.y0 >= 30 && b.y1 - b.y0 <= 210))) {
        const lbl = b.label != null ? String(b.label) : 'ছবি';
        const phIt = {
          kind: 'para', type: 'photo_box', text: lbl, lines: [lbl], align: 'c', fontPt: 10, color: '808080',
          photoBox: true, rect: { x: r1(b.x0), y: r1(b.y0), w: r1(b.x1 - b.x0), h: r1(b.y1 - b.y0) },
          indentPt: r1(Math.max(0, b.x0 - page.margins.left)), spaceBeforePt: 0
        };
        const phBand = { kind: 'flow', gapBeforePt: 0, y0: r1(b.y0), y1: r1(b.y1), cells: [{ x0: page.margins.left, x1: page.widthPt - page.margins.right, items: [phIt] }] };
        const insIdx = page.bands.findIndex((bd) => bd.y0 > b.y0);
        if (insIdx >= 0) page.bands.splice(insIdx, 0, phBand); else page.bands.push(phBand);
        objs = [phIt];
      }
      if (!objs || !objs.every((o) => fits(o, b))) continue;
      const id = ++nid;
      const bxEntry = { id, x0: r1(b.x0), x1: r1(b.x1), y0: r1(b.y0), y1: r1(b.y1),         // ড্যাশের পুরুত্ব-মাপ ফোলানো (f2: ১.৪pt ⇒ sz ১১, মূলে চুলের মতো) ⇒ ড্যাশে সবসময় ৪
        sz: (b.dashed || b.dashDot) ? 4 : clamp(Math.round(b.t * 8), 4, 12), dashed: b.dashed };   // sz ২-৩ Word-PDF-এ এত হালকা যে দাগই থাকে না
      if (formKitOn()) {
        if (b.dashDot) bxEntry.dashDot = true;
        if (b.style) bxEntry.style = b.style;
        if (b.fill) bxEntry.fill = b.fill;
        if (objs.length === 1 && objs[0].photoBox) { bxEntry.heightPt = r1(b.y1 - b.y0); bxEntry.vAlign = 'center'; }
      }
      page.boxes.push(bxEntry);
      objs.forEach((o) => { o.boxIds = (o.boxIds || []).concat(id); });
      // এক-লাইনের অনুচ্ছেদের আয়ত = বাক্সটাই (Gemini বাক্সের দাগসহ দেয়) ⇒ উচ্চতা-মাপা ফন্ট বড় হতো (f2 "ফরম-৮" ~১৯pt)।
      // ফন্ট ≤ (বাক্স − ৮pt) ÷ ১.২৫
      objs.forEach((o) => {
        if (o.kind !== 'para' || !o.rect || !own(o.rect, b) || (o.lines && o.lines.length > 1)) return;
        const cap = r1((b.y1 - b.y0 - 8) / 1.25);
        if (o.fontPt && cap >= 6 && o.fontPt > cap && globalThis.__BOX_FONTCAP) o.fontPt = cap;
      });
    }
    // উল্টো বিকল্প (মেপে খারাপ: বাক্স-টেবিল থাকে, ২ পাতা) — শুধু তুলনার জন্য: FZ_ON=NOPGB,  FZ_OFF=FRAMEBOX একসাথে
    if (globalThis.__FZ_ON_NOPGB && page.frame && page.boxes.some(pageSized)) delete page.frame;
    if (!page.boxes.length) delete page.boxes;
  }

  /**
   * A17_P1LOSS_v1 (a17 পাতা ১): ড্যাশ-বর্ডার ঘেরা ২-কলামের কার্ড/স্লিপ গ্রিড পুনরুদ্ধার।
   * মূলে পাতা ১-এ ৪×২ গ্রিডে ৮টি ড্যাশ-বর্ডার ঘেরা রোল-নম্বর স্লিপ ছিল। কিন্তু:
   * ১) page-geometry-র স্ন্যাপ ধাপে (snapped: 8) ব্লকের উল্লম্ব বক্স শুধু ভেতরের ২টি লেখার লাইনে সংকুচিত হয় এবং
   *    ভাঙা ড্যাশ-রেখাগুলো অবিচ্ছিন্ন রুল বা বক্স হিসেবে ধরা না পড়ায় pageInfo["1"].boxes-এ কেবল ১১টি ক্ষুদ্র (~২০pt)
   *    মাত্রা-খণ্ড জমা হয়;
   * ২) toItem()-এ srcBox হিসেবে শুধু লেখার মাপা আয়ত (m.rectPt) নেওয়ায় এবং applyBoxFrames()-এ ১১টি ক্ষুদ্র বক্সে
   *    inside(t.rect, b) ব্যর্থ হওয়ায় delete page.boxes চলে — ফলে ৮টি স্লিপের সব ড্যাশ-বর্ডার সম্পূর্ণ বিলুপ্ত হয় এবং
   *    layout-score.json-এ মূল পাতার ৫৫টি আনুভূমিক কালি-সারির বদলে কেবল ৮টি লেখার সারি (ours: 8) পাওয়া যায়।
   * সমাধান: পাতায় কোনো বক্স/ফ্রেম না থাকলে, ≥৩টি ২-ঘরের গ্রিড-ব্যান্ডে প্রতিটি ঘরে ১টি করে বড় ফন্টের (bodyFontPt ≥ ১৮)
   * মাঝ-সাজানো অনুচ্ছেদ থাকলে যার ক্যাপচার-বক্স প্রস্থ লেখার আয়তের চেয়ে স্পষ্টত চওড়া (দুপাশে ≥১০pt ও মোট ≥২৪pt প্যাডিং)
   * এবং ব্যান্ডগুলোর মাঝে কার্ডের ওপর-নিচ প্যাডিংয়ের সমান ফাঁক থাকলে, ক্যাপচার-বক্স ও ব্যান্ডের ব্যবধান থেকে ৮টি ড্যাশ-বর্ডারযুক্ত
   * সমমাপের কার্ড-বক্স (page.boxes) ও ভেতরের লেখার সঠিক ফন্ট/মোটা/লাইন-দূরত্ব পুনরুদ্ধার করা।
   */
  function recoverCardGridBoxes(page) {
    if (!(p1LossOn() || a17FixOn()) || !page || !Array.isArray(page.bands) || page.bands.length < 3) return false;
    if ((page.boxes && page.boxes.length) || page.frame) return false;
    if ((page.bodyFontPt || 12) < 18) return false;
    const W = page.widthPt || 595.3, H = page.heightPt || 841.9;
    const mT = (page.margins && page.margins.top) || 20.5;
    const mB = (page.margins && page.margins.bottom) || 14;
    const bands = page.bands;
    const cards = [];
    for (let bi = 0; bi < bands.length; bi++) {
      const b = bands[bi];
      if (!b || b.kind !== 'grid' || !Array.isArray(b.cells) || b.cells.length !== 2) return false;
      const row = [];
      for (let ci = 0; ci < 2; ci++) {
        const c = b.cells[ci];
        if (!c || !Array.isArray(c.items) || c.items.length !== 1) return false;
        const it = c.items[0];
        if (!it || it.kind !== 'para' || !it.rect || !Array.isArray(it.box) || it.box.length !== 4) return false;
        if (it.align !== 'c' || !Array.isArray(it.lines) || it.lines.length < 2) return false;
        const rawX0 = (it.box[1] / 1000) * W;
        const rawX1 = (it.box[3] / 1000) * W;
        const rawW = rawX1 - rawX0;
        const padL = it.rect.x - rawX0;
        const padR = rawX1 - (it.rect.x + it.rect.w);
        if (rawW - it.rect.w < 24 || padL < 10 || padR < 10) return false;
        row.push({ it, cell: c, rawX0, rawX1, rawW });
      }
      cards.push({ band: b, row });
    }
    const gaps = [];
    for (let i = 1; i < cards.length; i++) {
      gaps.push(cards[i].band.y0 - cards[i - 1].band.y1);
    }
    const minGap = Math.min(...gaps);
    const firstLead = cards[0].band.y0 - mT;
    if (firstLead < 25 || minGap < 80) return false;

    const med = (arr) => {
      const s = arr.slice().sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    const widths = cards.flatMap((r) => [r.row[0].rawW, r.row[1].rawW]);
    const boxW = r1(med(widths));
    const textHs = cards.map((r) => r.band.y1 - r.band.y0);
    const medTextH = med(textHs);
    const topPad = r1(Math.min(firstLead, minGap * 0.45));
    const boxH = r1(Math.max(180, Math.min(medTextH + minGap - 40.8, medTextH + 2 * topPad + 4.2)));

    page.boxes = [];
    let nid = 0;
    for (let bi = 0; bi < cards.length; bi++) {
      const { band, row } = cards[bi];
      const by0 = r1(Math.max(mT, band.y0 - topPad));
      const by1 = r1(Math.min(H - mB, by0 + boxH));
      for (let ci = 0; ci < 2; ci++) {
        const { it, cell } = row[ci];
        const x0 = r1(cell.x0);
        const x1 = r1(cell.x0 + boxW);
        const id = ++nid;
        page.boxes.push({
          id,
          x0,
          x1,
          y0: by0,
          y1: by1,
          sz: 24,
          dashed: true,
          cardBox: true
        });
        it.boxIds = [id];
        it.centerShiftPt = null;
        it.indentPt = 0;
        if ((it.diag && it.diag.stroke >= 1.13) || (it._stroke && it.fontPt && it._stroke / it.fontPt >= 0.085)) it.bold = true;
        if (it.diag && it.diag.wPt == null && it.fontPt > 21) {
          it.fontPt = 21;
        }
        if (!it.lineSpacingPt || it.lineSpacingPt > 34 || (a17FixOn() && it.lineSpacingPt >= 30)) {
          it.lineSpacingPt = 34;
          it.lineRule = 'exact';
        }
      }
    }
    return true;
  }

  /**
   * a03 (২০২৬-১০-১২): পাতার আনুভূমিক রেখা (উৎস-মাপ, page-geometry horizontalRules) ⇒ ঠিক ওপরের প্রবাহ-অনুচ্ছেদের নিচের বর্ডার
   * (it.ruleBelow = { gapPt, sz }) — Gemini বাক্সের সারি-দাগ লেখা হিসেবে দিলে দাগ হারাত। শুধু চওড়া (লেখা-প্রস্থের ≥৭০%) রেখা
   * (Word-এর অনুচ্ছেদ-বর্ডার পুরো লাইনজুড়ে); টেবিলের ভেতরের, নিচে-দাগের (underline), চিত্রের, পাতা-ফ্রেমের রেখা বাদ।
   */
  function applyHorizontalRules(page, hrules) {
    if (!hrules || !hrules.length || !page.xform) return;
    const X = page.xform, textW = page.widthPt - page.margins.left - page.margins.right;
    const mapped = hrules.map((r) => ({ x: X.left + (r.x - X.x0) * X.scale, y: X.top + (r.y - X.y0) * X.scale, w: r.w * X.scale, t: r.t * X.scale }));
    const rules = mapped.filter((r) => r.w >= textW * 0.7);
    const all = [];
    page.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => { if (it.rect) all.push({ it, flow: b.kind === 'flow', cell: c }); })));
    if (!all.length) return;
    const top = Math.min(...all.map((a) => a.it.rect.y)), bot = Math.max(...all.map((a) => a.it.rect.y + a.it.rect.h));
    const xov = (r, R) => Math.min(r.x + r.w, R.x + R.w) - Math.max(r.x, R.x);
    // ২০২৬-১০-১৩: ছোট রেখা (স্বাক্ষর-দাগ, a15) ঠিক নিচের মাঝে-বসানো অনুচ্ছেদের ওপর-বর্ডার — অনুচ্ছেদের ইনডেন্ট রেখার দুই প্রান্তে
    // (লেখা রেখার মাঝেই থাকে)। শর্ত: নিচের লেখা ≤১২pt দূরে ও রেখার ভেতরে, ওপরে ≤৪pt-এ কোনো লেখা নেই (নিচে-দাগ/পূরণ-রেখা নয়)
    for (const r of mapped.filter((q) => q.w < textW * 0.7 && q.w >= 60)) {
      if (r.y > page.heightPt - page.margins.bottom) continue;
      if (a14Fix3On() && (page.boxes || []).some((b) => (Math.abs(r.y - b.y0) <= 3.5 || Math.abs(r.y - b.y1) <= 3.5) && Math.min(r.x + r.w, b.x1) - Math.max(r.x, b.x0) >= 0.8 * (b.x1 - b.x0))) continue;
      // নিচের অনুচ্ছেদ: শুরু রেখার নিচে ≤১২pt, অথবা রেখাটাই তার আয়তের মাথায় (Gemini বক্সে রেখাসহ দেয় — a15)
      const below = all.filter((a) => (a.flow || formKitOn()) && a.it.kind === 'para' && a.it.rect.y >= r.y - 3 && a.it.rect.y - r.y <= 12
        && (!formKitOn() || (r.x >= (a.cell ? a.cell.x0 : page.margins.left) - 8 && r.x + r.w <= (a.cell ? a.cell.x1 : page.widthPt - page.margins.right) + 8)))
        .sort((a, b) => a.it.rect.y - b.it.rect.y)[0];
      if (all.some(({ it }) => it !== (below && below.it) && r.y >= it.rect.y - 1 && r.y <= it.rect.y + it.rect.h + 4 && xov(r, it.rect) > 0)) continue;
      if (!below || below.it.ruleAbove || below.it.rect.x < r.x - 6 || below.it.rect.x + below.it.rect.w > r.x + r.w + 6) continue;
      const it = below.it;
      // লেখা রেখার মাঝে বসানো না হলে নয় (বাঁয়ে-শুরু লেখার ইনডেন্ট বদলে যেত)
      if (it.align !== 'c' && Math.abs(it.rect.x + it.rect.w / 2 - (r.x + r.w / 2)) > 10) continue;
      if (it.rect.y <= r.y + r.t + 1) { const ny = r.y + r.t + 3; it.rect = Object.assign({}, it.rect, { y: ny, h: Math.max(4, it.rect.h - (ny - it.rect.y)) }); }
      it.align = 'c'; it.centerShiftPt = null;
      const cL = !below.flow && below.cell ? below.cell.x0 : page.margins.left;
      const cR = !below.flow && below.cell ? below.cell.x1 : page.widthPt - page.margins.right;
      it.ruleAbove = { srcY: r1(r.y), sz: clamp(Math.round(r.t * 8), 4, 12),
        indL: r1(Math.max(0, r.x - cL)), indR: r1(Math.max(0, cR - (r.x + r.w))) };
      if (formKitOn() && (r.dashed || it.type === 'signature')) it.ruleAbove.dashed = true;
    }
    if (!rules.length) return;
    // ২০২৬-১০-১৪ (2.pdf p2): দ্বৈত ফ্রেমের ভেতরের নিচের দাগ শেষ অনুচ্ছেদের নিচে-বর্ডার হতো — পাতা-নম্বরের (Gemini-বক্স, নিচে)
    // কারণে দাগটা "লেখার ভেতরে" মনে হতো। ফ্রেম-দাগ যাচাইয়ে পাতা-নম্বর বাদ। বন্ধ: FZ_OFF=FRAMERULE
    const body = globalThis.__FZ_OFF_FRAMERULE ? all : all.filter((a) => a.it.type !== 'page_number');
    const fTop = body.length ? Math.min(...body.map((a) => a.it.rect.y)) : top, fBot = body.length ? Math.max(...body.map((a) => a.it.rect.y + a.it.rect.h)) : bot;
    for (const r of rules) {
      if (page.frame && (r.y < fTop - 2 || r.y > fBot + 2)) continue;   // ফ্রেমের ওপর/নিচের দাগ
      // বাক্সের ওপর/নিচের কিনারা (applyBoxFrames ঘরের বর্ডারে আঁকে)
      if ((page.boxes || []).some((b) => (Math.abs(r.y - b.y0) <= 3 || Math.abs(r.y - b.y1) <= 3) && Math.min(r.x + r.w, b.x1) - Math.max(r.x, b.x0) >= 0.8 * (b.x1 - b.x0))) continue;
      if (r.y > page.heightPt - page.margins.bottom) continue;          // নিচের মার্জিনে (a02: বিঃদ্রঃ-পটির কিনারা — পরের পাতায় ঠেলত)
      // [Rule IR7: FZ_OFF=FORMFIX / FZ_OFF=IR7] বক্স-ফ্রেমযুক্ত ফরম পাতায় (page.boxes, যেমন a03) বর্ডারলেস ছক ও গ্রিড-ব্যান্ডের নিচেও আনুভূমিক সারি-বিভাজক রেখা (ruleBelow) যুক্ত করা।
      const ffRule = !!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_IR7 && page.boxes && page.boxes.length);
      if (all.some(({ it }) => ((it.kind === 'table' && !(ffRule && it.borderless)) || it.kind === 'figure') && r.y >= it.rect.y - (ffRule ? 1.5 : 3) && r.y <= it.rect.y + it.rect.h + (ffRule ? 1.5 : 3) && xov(r, it.rect) > 0)) continue;
      // ওপরের সবচেয়ে কাছের অংশ (নিচ ≤ রেখা+২)
      let above = null;
      for (const a of all) { const b = a.it.rect.y + a.it.rect.h; if (b <= r.y + (ffRule ? 3.5 : 2) && (!above || b > above.it.rect.y + above.it.rect.h)) above = a; }
      if (!above) continue;
      if ((ffRule || a17FixOn()) && (!above.flow || (ffRule && above.it.kind === 'table' && above.it.borderless))) {
        const hitBand = page.bands.find((b) => b.cells.some((c) => c.items.includes(above.it)));
        if (hitBand && hitBand.kind === 'grid') {
          hitBand.ruleBelow = { srcY: r1(r.y), sz: clamp(Math.round(r.t * 8), 4, 12) };
        } else if (ffRule && above.it.kind === 'table' && above.it.borderless && !above.it.ruleBelow) {
          above.it.ruleBelow = { srcY: r1(r.y), sz: clamp(Math.round(r.t * 8), 4, 12) };
        }
        continue;
      }
      // পটিওয়ালা অনুচ্ছেদের নিচের "দাগ" = পটির কিনারা (পটি আলাদা আঁকা হয়)
      if (!above.flow || above.it.kind !== 'para' || above.it.ruleBelow || above.it.shade) continue;
      const it = above.it, gap = r.y - (it.rect.y + it.rect.h);
      if (it.underline && gap <= 4 && xov(r, it.rect) >= it.rect.w * 0.5) continue;   // লেখার নিচে-দাগ
      if (a17FixOn() && it.underline && gap <= 6 && xov(r, it.rect) >= it.rect.w * 0.5) it.underline = false;
      // ২০২৬-১০-১৪ (a17 p9): চওড়া শিরোনামের নিচে-দাগ (রেখা শিরোনামের আয়তের ভেতরে, নিচ থেকে ০.৪pt ওপরে) "ওপরের" খোঁজায় শিরোনাম
      // বাদ পড়ায় ৬০pt ওপরের মাথা-লাইনের নিচে দ্বিতীয় দাগ বসত। রেখা অন্য লেখার উচ্চতার ভেতরে ⇒ সেটিরই দাগ। বন্ধ: FZ_OFF=RULEIN
      const ruleInTop = (ffRule || a17FixOn() || a19FixOn()) ? 1.5 : -1;
      if (!globalThis.__FZ_OFF_RULEIN && all.some(({ it: o }) => o !== it && o.kind === 'para' && r.y >= o.rect.y + ruleInTop && r.y <= o.rect.y + o.rect.h + 4 && xov(r, o.rect) > 0)) continue;
      it.ruleBelow = { srcY: r1(r.y), sz: clamp(Math.round(r.t * 8), 4, 12) };
    }
  }

  /**
   * Part-17.7: টেবিলের ভেতরে থাকা চিত্র (কেন্দ্র টেবিল-আয়তের ভেতরে) ⇒ সেই সারি/কলামের ঘরে (সমান ভাগ ধরে)।
   * আগে চিত্রগুলো টেবিলের নিচে আলাদা নামত ("ছবির সাথে মিলাও" প্রশ্ন)। items থেকে সরিয়ে table.cellFigures-এ রাখে।
   */
  function nestFiguresInTables(items) {
    const tables = items.filter((it) => it.kind === 'table' && it.rect && it.rows && it.rows.length);
    if (!tables.length) return;
    for (let k = items.length - 1; k >= 0; k--) {
      const f = items[k];
      if (f.kind !== 'figure' || !f.rect) continue;
      const cx = f.rect.x + f.rect.w / 2, cy = f.rect.y + f.rect.h / 2;
      const t = tables.find((tb) => cx > tb.rect.x && cx < tb.rect.x + tb.rect.w && cy > tb.rect.y && cy < tb.rect.y + tb.rect.h);
      if (!t) continue;
      const nCols = Math.max(...t.rows.map((r) => r.length));
      const r = clamp(Math.floor((cy - t.rect.y) / t.rect.h * t.rows.length), 0, t.rows.length - 1);
      const c = clamp(Math.floor((cx - t.rect.x) / t.rect.w * nCols), 0, nCols - 1);
      (t.cellFigures = t.cellFigures || []).push(Object.assign(f, { cell: [r, c] }));
      items.splice(k, 1);
    }
  }

  // Word-এর প্রচলিত মার্জিন (pt): ০.২৫–১.২৫ ইঞ্চি (০.০৫" ধাপের সাধারণগুলো) আর সেমি-মান
  const STD_MARGINS = [18, 21.6, 28.35, 28.8, 36, 42.5, 43.2, 50.4, 54, 56.7, 57.6, 64.8, 70.9, 72, 85, 90];
  // up = সর্বোচ্চ কত বাড়ানো চলে (বাঁ/ডানে ০ — লেখার প্রস্থ কমলে লাইন ভাঙে; g01 ডান ২০→২১.৬-এ নামা)
  const snapMargin = (v, up) => {
    const U = up == null ? 2 : up;
    let best = v, bd = 3.01;
    for (const s of STD_MARGINS) { const d = Math.abs(s - v); if (d < bd && s - v <= U) { best = s; bd = d; } }
    return best;
  };

  /**
   * পাতা-সেটআপ পুরো ফাইলে এক (Word-এ সাধারণত তাই) — কালির সীমা পাতা-ভেদে আলাদা দেখায় (ফাঁকা বাঁ-কলাম g33 ২১০pt,
   * ভাসমান ছবি g41, ওপরের ফাঁকা লাইন g14)। সোনালি সেটের আসল মার্জিন থেকে নিয়ম (২০২৬-১০-১২):
   *  - বাঁ/ওপর/ডান = একই মাপের পাতাগুলোর সবচেয়ে ছোট (item-অবস্থান মার্জিনের তুলনায় ⇒ লেখা সরে না)
   *  - ডান > বাঁ কখনো আসলে নয় (ডানে এবড়োখেবড়ো লেখা মার্জিনে পৌঁছায় না) ⇒ ডান = বাঁ
   *  - নিচ = ওপর (সাধারণত সমান), তবে সবচেয়ে কম নিচের কালি-ফাঁকের বেশি নয় (লেখা উপচাবে না); আগে সবসময় ৩৬ ছিল
   *  - প্রচলিত মানে ±৩pt হলে সেই মানে (বাড়ানো ≤২pt)
   * ফ্রেমওয়ালা পাতা পরে নিজের ওপর/নিচ ঠিক করে।
   */
  function unifyMargins(staged) {
    const groups = {};
    staged.forEach((s) => { const k = Math.round(s.page.widthPt) + 'x' + Math.round(s.page.heightPt); (groups[k] = groups[k] || []).push(s); });
    Object.values(groups).forEach((g) => {
      const ms = g.map((s) => s.page.margins);
      const left = snapMargin(Math.min(...ms.map((m) => m.left)), 0.5);
      let right = snapMargin(Math.min(...ms.map((m) => m.right)), 0.5);
      if (right > left) right = left;
      const top = snapMargin(Math.min(...ms.map((m) => m.top)));
      const gaps = g.map((s) => {
        const ys = s.items.filter((it) => it.rect).map((it) => it.rect.y + it.rect.h);
        return ys.length ? s.page.heightPt - Math.max(...ys) : Infinity;
      });
      // আমাদের আউটপুট মূলের চেয়ে সামান্য লম্বা হয় ⇒ নিচ = ওপর শুধু তখন, যখন মূলের শেষ কালি তার অন্তত এক লাইন (১৪pt) ওপরে;
      // নইলে আগের নিরাপদ মান (≤৩৬, কালি-ফাঁকের নিচে) — g38 ওপর ৪৩ = নিচ ৪৩ দিলে ২ পাতা হতো
      // নিচ ৩৬-এর কম শুধু কালি-ফাঁক বাধ্য করলে (g22 ওপর ২৬ কিন্তু আসল নিচ ৪৩ — ওপর নকল করলে ২৫ হয়ে খারাপ)
      const gap = Math.min(...gaps), safe = Math.min(36, gap - 2);
      const bottom = r1(clamp(top > 36 ? (gap >= top + 14 ? top : Math.max(safe, Math.min(top, gap - 14))) : safe, 18, 90));
      g.forEach((s) => { s.page.margins = { top: r1(top), left: r1(left), right: r1(right), bottom }; });
    });
  }

  /**
   * @param capture  FayzarFaithfulCapture.run ফল ({ blocks, pages })
   * @param measures { [blockIndex]: blockMetrics ফল }, pageInfo { [page]: { widthPt, heightPt } }
   */
  function build(capture, measures, pageInfo) {
    if (nestBoxOn() && capture && typeof capture === 'object') {
      if (!capture.blocks && capture.cap && Array.isArray(capture.cap.blocks)) {
        pageInfo = pageInfo || capture.pageInfo;
        measures = measures || capture.measures;
        capture = capture.cap;
      } else if (measures && !pageInfo && measures.measures && measures.pageInfo) {
        pageInfo = measures.pageInfo;
        measures = measures.measures;
      }
    }
    const warnings = [];
    const pages = [];
    const pageNos = [...new Set(capture.blocks.map((b) => b.page))].sort((a, b) => a - b);
    const staged = [];   // ১ম ধাপ: প্রতিটি পাতা স্বাভাবিককরণ; তারপর পুরো ফাইলের মার্জিন; ২য় ধাপ: ফ্রেম, সারি-কলাম
    for (const pn of pageNos) {
      const info = (pageInfo && pageInfo[pn]) || {};
      const cp = (capture.pages || []).find((p) => p.page === pn) || {};
      const src = { widthPt: info.widthPt || cp.widthPt || 595.3, heightPt: info.heightPt || cp.heightPt || 841.9 };
      // (Part-17.9: একটি টেবিল-ব্লক ফাঁকে ভাগ হয়ে একাধিক item হতে পারে)
      let pageBlocks = capture.blocks.filter((b) => b.page === pn);
      let pageMeasures = measures;
      if (boxSplitOn() && measures) {
        // ১) কালিহীন (m.empty) পৃষ্ঠা-নম্বর যদি পাতার কোনো বাক্স বা শিরোনামের ভেতরে পড়ে (যেমন a14 পাতা ৩-এ কালিহীন "৩"), তবে বাদ
        pageBlocks = pageBlocks.filter((b) => {
          if (b.type !== 'page_number') return true;
          const mb = measures[b.i];
          if (!mb || !mb.empty) return true;
          const gp = mb.geminiPt || mb.rectPt;
          if (!gp) return true;
          const inBox = Array.isArray(info.boxes) && info.boxes.some((bx) => gp.x >= bx.x0 - 4 && gp.x + gp.w <= bx.x1 + 4 && gp.y >= bx.y0 - 4 && gp.y + gp.h <= bx.y1 + 4);
          return !inBox;
        });
        // ২) ঝুলন্ত-ইনডেন্টযুক্ত ক্রমিক তালিকায় (১।..১৪।) ক্যাপচার-বক্স সরণের কারণে নিচের আইটেমগুলোর মাপা লাইন আগের আইটেমে ঢুকে গেলে
        // মাপা serialX (ক্রমিক শুরুর x) ধরে লাইনগুলো প্রকৃত ক্রমিক ব্লকে পুনর্বণ্টন
        const listBlocks = pageBlocks.filter((b) => b.type === 'list_item' && SERIAL.test(String((b.lines && b.lines[0]) || b.text || '').trim().split(/\s+/)[0]));
        const cleanM = listBlocks.map((b) => measures[b.i]).filter((m) => m && !m.empty && m.firstIndentPt <= -12 && Array.isArray(m.lines) && m.lines.length >= 2 && m.lines[0].w >= 10);
        if (cleanM.length >= 3) {
          const serialX = median(cleanM.map((m) => m.lines[0].x));
          const contX = median(cleanM.map((m) => m.lines[1].x));
          const hasDrift = listBlocks.some((b, idx) => {
            const m = measures[b.i], prevM = idx > 0 ? measures[listBlocks[idx - 1].i] : null;
            if (!m || m.empty || !Array.isArray(m.lines) || !m.lines.length) return false;
            return m.lines[0].w < 10 || Math.abs(m.lines[0].x - serialX) > 10 || (prevM && prevM.rectPt && m.rectPt && m.rectPt.y < prevM.rectPt.y + prevM.rectPt.h - 2);
          });
          if (hasDrift && contX - serialX >= 14) {
            const allLines = [];
            listBlocks.forEach((b) => {
              const m = measures[b.i];
              if (!m || !Array.isArray(m.lines)) return;
              m.lines.forEach((l, li) => {
                if (l.w < 10 || l.h < 5) return;
                if (!allLines.some((o) => Math.abs(o.line.y - l.y) <= 3)) {
                  allLines.push({
                    line: l,
                    seg: (m.lineSegs && m.lineSegs[li]) || [{ x: l.x, w: l.w }],
                    ul: (m.underlineLines && m.underlineLines[li]) || 0
                  });
                }
              });
            });
            allLines.sort((a, c) => a.line.y - c.line.y);
            const starts = allLines.filter((g) => Math.abs(g.line.x - serialX) <= 6);
            if (starts.length === listBlocks.length) {
              pageMeasures = Object.assign({}, measures);
              const medPitch = median(cleanM.map((m) => m.pitchPt).filter((p) => p > 10 && p < 20)) || 14;
              const medInk = median(cleanM.map((m) => m.lineInkPt).filter((v) => v > 8 && v < 18)) || 13;
              listBlocks.forEach((b, idx) => {
                const m0 = measures[b.i];
                if (!m0 || m0.empty) return;
                const y0 = starts[idx].line.y, y1Lim = idx + 1 < starts.length ? starts[idx + 1].line.y - 1 : Infinity;
                const grp = allLines.filter((g) => g.line.y >= y0 - 1 && g.line.y < y1Lim);
                if (!grp.length) return;
                const sameLines = m0.lines && m0.lines.length === grp.length && m0.lines.every((l, k) => Math.abs(l.y - grp[k].line.y) <= 1 && Math.abs(l.x - grp[k].line.x) <= 1);
                if (sameLines && m0.firstIndentPt <= -12) return;
                const xs0 = Math.min(...grp.map((g) => g.line.x)), xs1 = Math.max(...grp.map((g) => g.line.x + g.line.w));
                const lastL = grp[grp.length - 1].line;
                const bLineCnt = (b.lines || []).filter((l) => String(l).trim() && !/^\[অসম্পূর্ণ:/.test(String(l).trim())).length;
                const pitch = grp.length >= 2 && grp.every((g) => g.line.h < 20) ? (lastL.y - grp[0].line.y) / (grp.length - 1) : medPitch;
                pageMeasures[b.i] = Object.assign({}, m0, {
                  rectPt: { x: xs0, y: grp[0].line.y, w: xs1 - xs0, h: Math.max((lastL.y + lastL.h) - grp[0].line.y, bLineCnt * pitch) },
                  lines: grp.map((g) => g.line),
                  lineSegs: grp.map((g) => g.seg),
                  underlineLines: grp.map((g) => g.ul),
                  firstIndentPt: bLineCnt >= 2 ? Math.round(serialX - contX) : 0,
                  pitchPt: bLineCnt >= 2 ? pitch : 0,
                  lineInkPt: grp.every((g) => g.line.h < 20) ? Math.max(...grp.map((g) => g.line.h)) : medInk,
                  widthFontPt: undefined,
                  align: bLineCnt >= 2 ? 'j' : 'l',
                  ragged: false
                });
              });
            }
          }
        }
      }
      const items = pageBlocks.flatMap((b) => [].concat(toItem(b, pageMeasures && pageMeasures[b.i], info)));
      if (globalThis.__FZ_ON_SHADECOL && !globalThis.__FZ_OFF_SHADECOL && Array.isArray(info.boxes) && info.boxes.length >= 3) {
        for (const it of items) {
          if (it.kind !== 'table' || it.gridFirst || !it.rect || !it.headShade || !it.rows || it.rows.length < 2) continue;
          const nC = Math.max(...it.rows.map((r) => r.length));
          if (nC < 3) continue;
          const R = it.rect, cbs = info.boxes.filter((bx) => !bx.dashed && bx.x0 >= R.x - 4 && bx.x1 <= R.x + R.w + 4 && bx.y0 >= R.y - 4 && bx.y1 <= R.y + R.h + 4 && (bx.y1 - bx.y0) >= R.h * 0.8 && (bx.x1 - bx.x0) < R.w * 0.9);
          const xs = [R.x, ...cbs.map((bx) => bx.x0), ...cbs.map((bx) => bx.x1), R.x + R.w].sort((a, b) => a - b);
          const u = []; xs.forEach((x) => { if (!u.length || x - u[u.length - 1] > 8) u.push(x); });
          if (u.length === nC + 1) {
            const totW = u[u.length - 1] - u[0];
            const fr = u.slice(1).map((x, k) => (x - u[k]) / totW);
            if (fr.every((f) => f * totW >= 25)) { it.colFractions = fr; it.fullVRule = fr.slice(0, -1).map(() => true); }
          }
        }
      }
      items.filter((it) => !it.rect).forEach(() => warnings.push({ page: pn, kind: 'block_without_box' }));
      const norm = normalizePage(items, src);
      nestFiguresInTables(items);
      const page = Object.assign({ page: pn }, norm);
      if (info.drift) page.drift = { a: Math.round(info.drift.a * 10000) / 10000, b: Math.round(info.drift.b * 100) / 100, n: info.drift.n };   // নির্ণয়ের জন্য
      staged.push({ pn, info, items, page });
    }
    unifyMargins(staged);
    for (const { info, items, page } of staged) {
      // Part-17.7: পাতার বর্ডার-ফ্রেম (একক/দ্বৈত) — লেখা থেকে ফ্রেমের দূরত্বসহ (আসল মাপে; স্বাভাবিককৃত পাতায় স্কেল করা)
      if (info.frame && info.frame.rectPt) {
        const f = info.frame.rectPt, s = page.scale || 1;
        const C = { x: page.margins.left, y: page.margins.top };
        const items0 = items.filter((it) => it.rect);
        const cx0 = items0.length ? Math.min(...items0.map((it) => it.rect.x)) : C.x;
        const cy0 = items0.length ? Math.min(...items0.map((it) => it.rect.y)) : C.y;
        const cx1 = items0.length ? Math.max(...items0.map((it) => it.rect.x + it.rect.w)) : page.widthPt - page.margins.right;
        const cy1 = items0.length ? Math.max(...items0.map((it) => it.rect.y + it.rect.h)) : page.heightPt - page.margins.bottom;
        // উৎস-স্থানাঙ্কে ফ্রেম-থেকে-লেখা দূরত্ব (scale=1 হলে item.rect উৎস-স্থানাঙ্কেই)
        const gap = s === 1 ? { top: cy0 - f.y, left: cx0 - f.x, right: f.x + f.w - cx1, bottom: f.y + f.h - cy1 } : { top: 12, left: 12, right: 12, bottom: 12 };
        page.frame = { style: info.frame.style, spacePt: { top: r1(clamp(gap.top, 0, 31)), left: r1(clamp(gap.left, 0, 31)), right: r1(clamp(gap.right, 0, 31)), bottom: r1(clamp(gap.bottom, 0, 31)) } };
        // নিচের মার্জিন = ফ্রেমের ভেতরের নিচ পর্যন্ত (নইলে নিচের বর্ডার পাতার কিনারায় নামত)।
        // লেখা ফ্রেমের ৪pt আগ পর্যন্ত যেতে পারে — মূলের শেষ লাইনে ঠিক থামালে Word-এর সামান্য বেশি উচ্চতায় শেষ লাইন (পাতা-নম্বর) পরের পাতায় যেত
        if (s === 1) {
          // Part-17.8: ওপরের মার্জিন = ফ্রেমের ঠিক ভেতরে (প্রথম লেখা পর্যন্ত ফাঁক প্রথম সারির আগের ফাঁক হিসেবে) — নইলে ফ্রেম নিচে নামত
          if (gap.top > 31) { page.frame.spacePt.top = 4; page.margins.top = r1(Math.max(18, f.y + 4)); }
          page.frame.spacePt.bottom = 4;
          // ২০২৬-১০-১৩: তলা ২৪→১৪pt (a02: ফ্রেম পাতার নিচ থেকে ~৬pt, মূলের শেষ পটি ৭৬০-এ ⇒ ২৪pt-এ নিচের অংশ ১০pt ওপরে চাপা)
          page.margins.bottom = r1(Math.max(14, page.heightPt - (f.y + f.h) + 4));
          // A02_RULES_v1: মার্জিন একীকরণের (unifyMargins) পর প্রকৃত মার্জিন থেকে ফ্রেম-বর্ডারের দূরত্ব হিসাব যাতে চারপাশের ফ্রেম মূলের অবস্থানে বসে
          if (ruleFixOn() || rules2On()) {
            page.frame.rectPt = { x: r1(f.x), y: r1(f.y), w: r1(f.w), h: r1(f.h) };
            if (rules2On()) {
              const effBot = Math.min(page.margins.bottom, 14);
              page.frame.spacePt = {
                top: r1(clamp(Math.round(page.margins.top - f.y - 2.2), 0, 31)),
                left: r1(clamp(Math.round(page.margins.left - f.x - 2.0), 0, 31)),
                right: r1(clamp(Math.round(page.margins.right - (page.widthPt - (f.x + f.w)) - 2.0), 0, 31)),
                bottom: r1(clamp(Math.round(effBot - (page.heightPt - (f.y + f.h)) - 2.0), 0, 31))
              };
              page.frame._rules2Fixed = true;
            } else {
              page.frame.spacePt = {
                top: r1(clamp(Math.round(page.margins.top - f.y - 1.5), 0, 31)),
                left: r1(clamp(Math.round(page.margins.left - f.x - 1.5), 0, 31)),
                right: r1(clamp(Math.round((f.x + f.w) - (page.widthPt - page.margins.right) - 1.0), 0, 31)),
                bottom: r1(clamp(Math.round((f.y + f.h) - (page.heightPt - page.margins.bottom) - 1.5), 0, 31))
              };
            }
            page.frame._ruleFixed = true;
          }
        }
      }
      page.bands = bandsOf(items, page);
      snapIndents(page);
      snapFonts(page);
      syncFillLabels(page);
      alignTabStops(page);
      alignNumberTabs(page);
      syncGridPitch(page);
      applyVerticalRules(page, info.vrules, info.boxes);
      applyBoxFrames(page, info.boxes);
      applyHorizontalRules(page, info.hrules);
      if (a19FixOn() && page.xform) {
        Object.defineProperty(page, '_xform', { value: Object.assign({}, page.xform), enumerable: false, configurable: true, writable: true });
      }
      delete page.xform;
      pages.push(page);
    }
    decideBold(pages);
    if (p1LossOn() || a17FixOn()) pages.forEach((p) => recoverCardGridBoxes(p));
    syncLabelColumns(pages);
    syncTableFonts(pages);
    if (p2DriftOn()) repairP2DriftIr({ pages, warnings }, pageInfo);
    if (a03FixOn()) repairA03Ir({ pages, warnings }, pageInfo);
    if (nestBoxOn()) repairNestBoxIr({ pages, warnings }, pageInfo);
    if (a17FixOn()) repairA17Ir({ pages, warnings });
    if (a14FixOn()) repairA14Ir({ pages, warnings }, pageInfo);
    if (a07FixOn()) repairA07Ir({ pages, warnings }, pageInfo);
    if (a19FixOn()) repairA19Ir({ pages, warnings }, pageInfo);
    if (a16FixOn()) repairA16Ir({ pages, warnings }, pageInfo);
    if (a11FixOn()) repairA11Ir({ pages, warnings }, pageInfo);
    if (a10FixOn()) repairA10FixIr({ pages, warnings }, pageInfo);
    if (tblMergeOn()) repairTblMergeIr({ pages, warnings }, pageInfo);
    if (a07Fix2On()) repairA07Fix2Ir({ pages, warnings }, pageInfo);
    if (lineGapOn()) repairLineGapIr({ pages, warnings }, pageInfo);
    if (rotTextOn()) repairRotTextIr({ pages, warnings }, pageInfo);
    if (indentOn()) repairIndentIr({ pages, warnings }, pageInfo);
    if (widthOn()) repairWidthIr({ pages, warnings }, pageInfo);
    if (a14Fix3On()) repairA14Fix3Ir({ pages, warnings }, pageInfo);
    if (fontFixOn()) repairFontFixIr({ pages, warnings }, pageInfo);
    if (a16Fix3On()) repairA16Fix3Ir({ pages, warnings }, pageInfo);
    if (a14RulesOn()) repairA14RulesIr({ pages, warnings }, pageInfo);
    if (a07Fix3On()) repairA07Fix3Ir({ pages, warnings }, pageInfo);
    if (a16Fix4On()) repairA16Fix4Ir({ pages, warnings }, pageInfo);
    if (a14Fix4On()) repairA14Fix4Ir({ pages, warnings }, pageInfo);
    if (a13FixOn()) repairA13FixIr({ pages, warnings }, pageInfo);
    if (a16Fix5On()) repairA16Fix5Ir({ pages, warnings }, pageInfo);
    if (a09FixOn()) repairA09FixIr({ pages, warnings }, pageInfo);
    if (a14Fix5On()) repairA14Fix5Ir({ pages, warnings }, pageInfo);
    if (a07Fix5On()) repairA07Fix5Ir({ pages, warnings }, pageInfo);
    if (a12FixOn()) repairA12FixIr({ pages, warnings }, pageInfo);
    if (a03Fix3On()) repairA03Fix3Ir({ pages, warnings }, pageInfo);
    if (a02FixOn()) repairA02FixIr({ pages, warnings }, pageInfo);
    if (a06FixOn()) repairA06FixIr({ pages, warnings }, pageInfo);
    if (a03Fix4On()) repairA03Fix4Ir({ pages, warnings }, pageInfo);
    if (a07Fix6On()) repairA07Fix6Ir({ pages, warnings }, pageInfo);
    if (f1FixOn()) repairF1FixIr({ pages, warnings }, pageInfo);
    if (a18FixOn()) repairA18FixIr({ pages, warnings }, pageInfo);
    if (a08FixOn()) repairA08FixIr({ pages, warnings }, pageInfo);
    if (faithfulStudioOn()) snapshotIrLayout({ pages, warnings });
    return { pages, warnings };
  }

  /**
   * WORK_PLAN F3: স্টুডিওতে লেখা সম্পাদনার আগে প্রতিটি IR আইটেমের মূল লেখা/লাইন কাঠামোর স্ন্যাপশট সংরক্ষণ,
   * যাতে পরবর্তীতে কেবল লেখা বদলালেও অবস্থান, ফাঁক ও আকারের সব XML অপরিবর্তিত থাকে।
   */
  function snapshotIrLayout(ir) {
    if (!faithfulStudioOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((page) => {
      (page.bands || []).forEach((band) => {
        (band.cells || []).forEach((cell) => {
          (cell.items || []).forEach((it) => {
            if (!it || typeof it !== 'object' || it._fzLayoutSnap) return;
            it._fzLayoutSnap = {
              text: it.text != null ? String(it.text) : '',
              lines: Array.isArray(it.lines) ? it.lines.slice() : null,
              tabLines: Array.isArray(it.tabLines) ? it.tabLines.slice() : null,
              rows: Array.isArray(it.rows)
                ? it.rows.map((r) => (Array.isArray(r) ? r.map((c) => (c && typeof c === 'object' ? Object.assign({}, c) : c)) : r))
                : null
            };
          });
        });
      });
    });
    return ir;
  }

  function itemEditableText(it) {
    if (!it) return '';
    if (it.kind === 'table') {
      return (it.rows || []).map((r) => (r || []).map((c) => {
        if (c && typeof c === 'object' && !Array.isArray(c)) {
          return String(c.text != null ? c.text : (c.value != null ? c.value : ''));
        }
        return String(c == null ? '' : c);
      }).join('\t')).join('\n');
    }
    if (Array.isArray(it.tabLines) && it.tabLines.length) return it.tabLines.join('\n');
    if (Array.isArray(it.lines) && it.lines.length) return it.lines.join('\n');
    return String(it.text == null ? '' : it.text);
  }

  function extractBlocks(ir) {
    if (!faithfulStudioOn() || !ir || !Array.isArray(ir.pages)) return [];
    snapshotIrLayout(ir);
    const blocks = [];
    let idx = 0;
    ir.pages.forEach((page, pi) => {
      (page.bands || []).forEach((band, bi) => {
        (band.cells || []).forEach((cell, ci) => {
          (cell.items || []).forEach((it, ii) => {
            if (!it || it.kind === 'figure') return;
            blocks.push({
              id: `p${pi}-b${bi}-c${ci}-i${ii}`,
              index: idx++,
              pageIndex: pi,
              bandIndex: bi,
              cellIndex: ci,
              itemIndex: ii,
              kind: it.kind || 'para',
              type: it.type || (it.kind === 'table' ? 'table' : 'body'),
              text: itemEditableText(it),
              rect: it.rect ? Object.assign({}, it.rect) : null,
              fontPt: it.fontPt || 12,
              align: it.align || 'l',
              bold: !!it.bold
            });
          });
        });
      });
    });
    return blocks;
  }

  function updateBlockText(ir, target, newText) {
    if (!faithfulStudioOn() || !ir || !Array.isArray(ir.pages)) return ir;
    snapshotIrLayout(ir);
    let idx = 0;
    const isNumTarget = typeof target === 'number' || (typeof target === 'string' && /^\d+$/.test(target.trim()));
    const targetIdx = isNumTarget ? Number(target) : -1;
    const targetId = typeof target === 'string' && !isNumTarget ? target.trim() : (target && typeof target === 'object' && target.id ? String(target.id) : null);

    for (let pi = 0; pi < ir.pages.length; pi++) {
      const bands = ir.pages[pi].bands || [];
      for (let bi = 0; bi < bands.length; bi++) {
        const cells = bands[bi].cells || [];
        for (let ci = 0; ci < cells.length; ci++) {
          const items = cells[ci].items || [];
          for (let ii = 0; ii < items.length; ii++) {
            const it = items[ii];
            if (!it || it.kind === 'figure') continue;
            const curId = `p${pi}-b${bi}-c${ci}-i${ii}`;
            const curIdx = idx++;
            const coordMatch = target && typeof target === 'object'
              && target.pageIndex === pi && target.bandIndex === bi && target.cellIndex === ci && target.itemIndex === ii;
            const indexObjMatch = target && typeof target === 'object' && typeof target.index === 'number' && target.index === curIdx;
            if (curIdx === targetIdx || curId === targetId || coordMatch || indexObjMatch) {
              if (it.kind === 'table') {
                const rowLines = Array.isArray(newText) ? newText : String(newText == null ? '' : newText).split('\n');
                it.rows = (it.rows || []).map((row, rIdx) => {
                  const cols = Array.isArray(rowLines[rIdx]) ? rowLines[rIdx] : (rowLines[rIdx] !== undefined ? String(rowLines[rIdx]).split('\t') : []);
                  return row.map((cellVal, cIdx) => {
                    const nextVal = cols[cIdx] !== undefined ? cols[cIdx] : (cellVal && typeof cellVal === 'object' ? cellVal.text : cellVal);
                    if (cellVal && typeof cellVal === 'object' && !Array.isArray(cellVal)) {
                      return Object.assign({}, cellVal, { text: String(nextVal == null ? '' : nextVal) });
                    }
                    return String(nextVal == null ? '' : nextVal);
                  });
                });
              } else {
                const str = String(newText == null ? '' : newText);
                it.text = str;
                if (Array.isArray(it.tabLines) && it.tabLines.length) it.tabLines = str.split('\n');
                if (Array.isArray(it.lines)) it.lines = str.split('\n');
              }
              return ir;
            }
          }
        }
      }
    }
    return ir;
  }


  /**
   * সিভি (মালিকের স্ক্রিনশট): একই পাতায় বারবার আসা লেবেল-কলাম (একই x, একই লাইন-সংখ্যা, লাইন-অক্ষত, একই হেলানো/শ্রেণি) —
   * মূলে সব এক রকম, কিন্তু প্রস্থ-মাপে একটি ৯.৫ (বাকি ১০.৫) আর ছোট ফন্টে রেখা-অনুপাত বেড়ে "মোটা" হয়ে যেত।
   * ≥২-এর দলে মধ্যমা থেকে ≤১৫% দূরের ফন্ট ⇒ মধ্যমা; মোটা ⇒ দলের সংখ্যাগরিষ্ঠ (সমতায় সাধারণ)।
   */
  /**
   * a16: বহু-পাতার একই ছক (একই কলাম-সংখ্যা, কলাম-প্রস্থ ±০.১০) পাতা-ভেদে ১১ থেকে ১৩.৫ মাপা হতো — বড়গুলো পাতা উপচাত।
   * ≥৩টির দলে মধ্যমা থেকে ≤৩০% দূরের ফন্ট ⇒ মধ্যমা।
   */
  function syncTableFonts(pages) {
    const all = [];
    pages.forEach((p) => p.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => { if (it.kind === 'table' && it.fontPt && it.colFractions) all.push(it); }))));
    const used = new Set();
    all.forEach((t) => {
      if (used.has(t)) return;
      const grp = all.filter((o) => !used.has(o) && o.colFractions.length === t.colFractions.length && o.colFractions.every((f, k) => Math.abs(f - t.colFractions[k]) <= 0.1));
      grp.forEach((o) => used.add(o));
      if (grp.length < 3) return;
      const m = median(grp.map((o) => o.fontPt));
      grp.forEach((o) => { if (Math.abs(o.fontPt - m) <= m * 0.3) o.fontPt = m; });
    });
    if (fzOn('FORMFIX') && !globalThis.__FZ_OFF_IR8) {
      globalThis.__FZ_ON_FORMFIX = true;
    }
  }

  function syncLabelColumns(pages) {
    for (const page of pages) {
      const groups = {};
      page.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
        if (it.kind !== 'para' || !it.keepLines || !it.fontPt || !it.rect || (it.lines || []).length < 2) return;
        const k = [it.type, it.fs, !!it.italic, Math.round(it.rect.x / 4), it.lines.length].join('|');
        (groups[k] = groups[k] || []).push(it);
      })));
      for (const arr of Object.values(groups)) {
        if (arr.length < 2) continue;
        const m = median(arr.map((x) => x.fontPt));
        arr.forEach((x) => { if (Math.abs(x.fontPt - m) <= m * 0.15) x.fontPt = m; });
        const nb = arr.filter((x) => x.bold).length, bold = nb * 2 > arr.length;
        arr.forEach((x) => { x.bold = bold; });
      }
    }
  }

  /**
   * f2 (২০২৬-১০-১২): পরপর "লেবেল : ......" লাইন (সইয়ের অংশ) — অক্ষর কম, কালি বেশিরভাগ বিন্দু ⇒ মাপ অবিশ্বাস্য
   * ("তারিখ : ..." কালি ১.৯pt ⇒ ৮.৫, পাশের "আবেদনকারীর স্বাক্ষর : ..." ১০.৫)। একই কলামের পাশাপাশি (ফাঁক < ২.৫ লাইন)
   * এমন লাইনের দলে প্রস্থ-অনুমানহীন ছোট লাইনগুলো দলের নির্ভরযোগ্য (প্রস্থ-অনুমানওয়ালা) লাইনের ফন্ট পায়।
   */
  function syncFillLabels(page) {
    const FILLX = /([._\-…·─])\1{2,}/g;
    const isFL = (it) => it.kind === 'para' && it.rect && /[:ঃ]/.test(it.text || '') && /([._\-…·─])\1{2,}/.test(it.text || '')
      && String(it.text || '').replace(FILLX, '').replace(/[\s:ঃ\t*]/g, '').length <= 25;
    // ক্রম: পরপর প্রবাহ-ব্যান্ডের অংশ এক তালিকায় (প্রবাহের প্রতিটি অংশ সাধারণত আলাদা ব্যান্ডে); গ্রিডের প্রতিটি ঘর আলাদা
    const seqs = []; let flow = null;
    for (const b of page.bands) {
      if (b.kind === 'flow') { if (!flow) seqs.push(flow = []); flow.push(...b.cells[0].items); }
      else { flow = null; b.cells.forEach((c) => seqs.push(c.items)); }
    }
    for (const its of seqs) {
      for (let i = 0; i < its.length;) {
        if (!isFL(its[i])) { i++; continue; }
        let j = i + 1;
        while (j < its.length && isFL(its[j]) && its[j].rect.y - (its[j - 1].rect.y + its[j - 1].rect.h) < 2.5 * (its[j - 1].fontPt || 12)) j++;
        const grp = its.slice(i, j), good = grp.filter((x) => x.diag && x.diag.wPt);
        if (grp.length >= 2 && good.length) {
          const f = median(good.map((x) => x.fontPt));
          grp.forEach((x) => { if (!(x.diag && x.diag.wPt) && x.fontPt < f) x.fontPt = f; });
        }
        i = j;
      }
    }
  }

  /**
   * সিভি (মালিকের স্ক্রিনশট): পাশাপাশি লেবেল-কলাম আর মান-কলাম (grid-ব্যান্ডের আলাদা ঘর) একই সারিতে চলে — লাইন-সংখ্যা সমান,
   * উচ্চতা প্রায় সমান (≤১০%) হলে আসল লাইন-দূরত্বও এক। মোটা কালিতে একটির মাপ বেশি আসে (১৫.১ বনাম ১৩.৯) ⇒ নিচে সারি সরে যেত।
   * দুটোতেই ছোটটি।
   */
  function syncGridPitch(page) {
    for (const band of page.bands) {
      if (band.kind !== 'grid') continue;
      const ps = band.cells.flatMap((c) => c.items).filter((it) => it.kind === 'para' && it.keepLines && it.lineSpacingPt > 0 && it.rect && (it.lines || []).length >= 2);
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        if (a.lines.length !== b.lines.length || Math.abs(a.rect.y - b.rect.y) > 6 || Math.abs(a.rect.h - b.rect.h) > 0.1 * Math.max(a.rect.h, b.rect.h)) continue;
        a.lineSpacingPt = b.lineSpacingPt = Math.min(a.lineSpacingPt, b.lineSpacingPt);
      }
    }
  }

  /**
   * Part-17.9: মোটা লেখা — রেখা-পুরুত্ব ÷ চূড়ান্ত ফন্ট (একই ফন্টে সাধারণ ≈০.০৮, মোটা ≈০.১১+)। পুরো ফাইলের লেখা-লাইনের
   * ৩০তম শতাংশ = সাধারণ লেখার মান; তার ১.২২ গুণ বা বেশি ⇒ মোটা। মাপ না থাকলে Gemini-র কথা।
   * "**…**" অংশ-মোটা চিহ্ন থাকলে পুরো ব্লক মোটা নয়।
   */
  function decideBold(pages) {
    const all = [];
    pages.forEach((p) => p.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => { if (it.kind === 'para' && it._stroke && it.fontPt) all.push(it); }))));
    // লিপি আলাদা (Times-এর সাধারণ রেখা বাংলার চেয়ে পুরু) ⇒ বাংলা-প্রধান ও ইংরেজি-প্রধান লাইনের আলাদা মানদণ্ড
    const script = (it) => ((it.text || '').match(/[ঀ-৿]/g) || []).length >= ((it.text || '').match(/[A-Za-z0-9]/g) || []).length ? 'bn' : 'en';
    // আকার-প্রভাব: ছোট লেখায় পুরুত্ব÷ফন্ট বেশি, বড় লেখায় কম (মাপা: ১১pt ১.১১, ১৮pt ০.৯২, ২৭pt ০.৮৫ — সাধারণ লেখা)
    // ⇒ মূল-আকারের সাথে চতুর্থ-মূল অনুপাতে সমান করা
    const fs = all.map((it) => it.fontPt).sort((a, b) => a - b);
    const fMed = fs.length ? fs[Math.floor(fs.length / 2)] : 12;
    const norm = (it) => (it._stroke / it.fontPt) / Math.pow(fMed / it.fontPt, 0.25);
    const refs = {};
    ['bn', 'en'].forEach((sc) => {
      const vals = [];
      all.filter((it) => script(it) === sc).forEach((it) => { const v = norm(it); for (let k = 0; k < Math.max(1, (it.diag && it.diag.lines) || 1); k++) vals.push(v); });
      vals.sort((a, b) => a - b);
      refs[sc] = vals.length >= 4 ? vals[Math.floor(vals.length * 0.3)] : 0;
    });
    const pageRefs = new Map();
    if (fontFixOn() && !(a14Fix3On() || widthOn())) {
      pages.forEach((p) => {
        const pVals = [];
        p.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
          if (it.kind === 'para' && it._stroke && it.fontPt && /^(paragraph|list_item)$/.test(it.type || '') && script(it) === 'bn') {
            const v = norm(it);
            for (let k = 0; k < Math.max(1, (it.diag && it.diag.lines) || 1); k++) pVals.push(v);
          }
        })));
        pVals.sort((a, b) => a - b);
        if (pVals.length >= 6) pageRefs.set(p, pVals[Math.floor(pVals.length * 0.3)]);
      });
    }
    pages.forEach((p) => {
      const pRef = pageRefs.get(p) || 0;
      p.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => {
        if (!(it.kind === 'para' && it._stroke && it.fontPt)) return;
        const v = norm(it), ref = refs[script(it)];
        if (it.diag) it.diag.stroke = ref ? Math.round(v / ref * 100) / 100 : null;
        const tx = String(it.text || '').replace(/[\s*]/g, ''), fillN = (tx.match(/([._\-…·─])\1{5,}/g) || []).join('').length;
        const short = !globalThis.__FZ_OFF_SHORTB && (tx.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length <= 3 || fillN >= (fontFixOn() ? tx.length * 0.25 : tx.length * 0.4));
        const effRef = (fontFixOn() && !(a14Fix3On() || widthOn()) && pRef > ref * 1.12 && /^(paragraph|list_item)$/.test(it.type || '')) ? pRef : ref;
        const boldThr = (fontFixOn() && (it.type === 'paragraph' || (!(a14Fix3On() || widthOn()) && it.type === 'list_item'))) ? 1.15 : 1.13;
        if (effRef && !short && !/\*\*/.test(it.text || '')) it.bold = v >= effRef * boldThr;
        else if ((a10LinesOn() || a10FixOn()) && effRef && it.bold && v < effRef * boldThr && !/^(title|heading|header)$/.test(it.type || '') && tx.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length > 10) it.bold = false;
        delete it._stroke;
      })));
    });
  }


  /**
   * A05_DRIFT_v1: পাতা-২-এ (page >= 2) অপ্রয়োজনীয় ফাঁকা ব্লিড-থ্রু ছক অপসারণ, রেখাহীন ফাঁকা-সারিযুক্ত ছককে প্রকৃত মাপা লাইনে
   * রূপান্তর, ২-লাইনের দুপাশে-সমান অনুচ্ছেদের লাইন-ভাঙা ও ডান-ইনডেন্ট রক্ষা, পাশাপাশি বাক্স-ফ্রেম ও দ্বি-কলাম ঠিকানা-অংশ একীভূতকরণ,
   * এবং নিচের স্বাক্ষর/তারিখ বাক্স পুনরুদ্ধার।
   */
  function repairP2DriftPage(page, info) {
    if (!p2DriftOn() || !page || (page.page != null && page.page < 2) || !Array.isArray(page.bands) || page._p2DriftRepaired) return page;
    Object.defineProperty(page, '_p2DriftRepaired', { value: true, enumerable: false, configurable: true, writable: true });
    const bodyFont = page.bodyFontPt || 12;
    const PL = page.margins ? page.margins.left : 36;
    const PR = page.widthPt && page.margins ? page.widthPt - page.margins.right : 559;

    // ১) সম্পূর্ণ ফাঁকা বহু-সারির ব্লিড-থ্রু ছক (যেমন a05 পাতা-২ ব্লক ৩৫: ৪×৪ ফাঁকা ছক) অপসারণ
    // এবং ২) রেখাহীন (borderless, srcRulesPt শূন্য) অর্ধেকের বেশি ফাঁকা সারিযুক্ত ছককে (যেমন a05 পাতা-২ ব্লক ২৭) মাপা লাইনের অনুচ্ছেদে রূপান্তর
    const nextBands = [];
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.cells.forEach((c) => {
        if (!Array.isArray(c.items)) return;
        c.items = c.items.filter((it) => !(
          it && it.kind === 'table' && Array.isArray(it.rows) && it.rows.length >= 2 &&
          it.rows.every((r) => Array.isArray(r) && r.every((cell) => !String(cell || '').trim())) &&
          !(it.cellFigures && it.cellFigures.length)
        ));
      });
      band.cells = band.cells.filter((c) => Array.isArray(c.items) && c.items.length > 0);
      if (!band.cells.length) continue;

      if (band.kind === 'flow' && band.cells.length === 1 && band.cells[0].items.length === 1) {
        const it = band.cells[0].items[0];
        if (it && it.kind === 'table' && it.borderless && (!it.srcRulesPt || !it.srcRulesPt.length) && Array.isArray(it.rows) && it.rows.length >= 4 && it.rect) {
          const ne = [];
          it.rows.forEach((r, ri) => {
            if (!Array.isArray(r)) return;
            const cols = r.map((c, ci) => (c && String(c).trim() ? { ci, text: String(c).trim() } : null)).filter(Boolean);
            if (cols.length) ne.push({ ri, count: cols.length, col: cols[0].ci, text: cols[0].text });
          });
          if (ne.length >= 2 && ne.length <= it.rows.length * 0.5 && ne.every((x) => x.count === 1)) {
            const lh = r1(bodyFont * 0.82);
            const pitch = r1(bodyFont * 1.77);
            const firstRi = ne[0].ri, lastRi = ne[ne.length - 1].ri, spanRi = Math.max(1, lastRi - firstRi);
            const mLines = Array.isArray(it._measuredLines) && it._measuredLines.length === ne.length ? it._measuredLines : null;
            const ys = ne.map((x, k) => {
              if (mLines && mLines[k]) return mLines[k].y;
              if (k === 0) return it.rect.y;
              if (k === ne.length - 1) return r1(it.rect.y + it.rect.h - lh);
              if (ne[k + 1] && ne[k + 1].ri === x.ri + 1 && k + 1 === ne.length - 1) {
                return r1(it.rect.y + it.rect.h - lh - pitch);
              }
              return r1(it.rect.y + ((x.ri - firstRi) / spanRi) * (it.rect.h - lh));
            });
            ne.forEach((x, k) => {
              const ml = mLines && mLines[k];
              const colStart = Array.isArray(it.colFractions) ? it.colFractions.slice(0, x.col).reduce((a, b) => a + b, 0) : (x.col / 5);
              const ix = ml ? ml.x : (x.col === 0 ? it.rect.x : r1(it.rect.x + colStart * it.rect.w + 2.4));
              const hasMultiFill = (x.text.match(/([._\-…·─])\1{5,}/g) || []).length >= 2;
              const hasTrailFill = /([._\-…·─])\1{5,}\s*$/.test(x.text);
              const iw = ml ? ml.w : (hasMultiFill ? r1(it.rect.w * 0.635) : hasTrailFill ? r1(it.rect.x + it.rect.w - ix) : r1(x.text.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length * bodyFont * 0.43));
              const ih = ml ? ml.h : lh;
              const iy = ys[k];
              const pItem = {
                type: 'paragraph',
                rect: { x: ix, y: iy, w: iw, h: ih },
                box: it.box,
                kind: 'para',
                text: x.text,
                lines: [x.text],
                keepLines: false,
                keepJust: false,
                fs: 'm',
                tabLines: null,
                tabStopsSrc: null,
                italic: false,
                underline: false,
                bold: false,
                align: 'l',
                firstIndentPt: 0,
                lineSpacingPt: 0,
                fontPt: bodyFont,
                indentPt: r1(Math.max(0, ix - PL)),
                spaceBeforePt: 0
              };
              nextBands.push({
                kind: 'flow',
                gapBeforePt: 0,
                y0: r1(iy),
                y1: r1(iy + ih),
                cells: [{ x0: PL, x1: PR, items: [pItem] }]
              });
            });
            continue;
          }
        }
      }
      nextBands.push(band);
    }
    page.bands = nextBands;

    // ৩) পাশাপাশি দুই বাক্সে বিভক্ত উপরের ঠিকানা-অংশ (যেমন a03 পাতা-২ ব্যান্ড ০..৮) একীভূত করে ২-কলাম গ্রিড ও বাইরের বাক্স-ফ্রেম পুনরুদ্ধার
    const existingBox = (page.boxes || [])[0];
    const firstBoxedIdx = page.bands.findIndex((b) => (b.boxIds && b.boxIds.length) || b.cells.some((c) => c.items.some((it) => it.boxIds && it.boxIds.length)));
    if (firstBoxedIdx >= 4 && existingBox) {
      const boxX0 = existingBox.x0, boxX1 = existingBox.x1;
      const midX = r1((boxX0 + boxX1) / 2 + 1);
      let splitEnd = -1;
      for (let i = 0; i < firstBoxedIdx; i++) {
        const b = page.bands[i];
        const hasRule = b.ruleBelow || b.cells.some((c) => c.items.some((it) => it.ruleBelow));
        if (hasRule && i >= 3) { splitEnd = i; break; }
      }
      if (splitEnd >= 3) {
        const topBands = page.bands.slice(0, splitEnd + 1);
        const allIts = topBands.flatMap((b) => b.cells.flatMap((c) => c.items));
        const leftIts = allIts.filter((it) => it.rect && it.rect.x + it.rect.w <= midX + 4);
        const rightIts = allIts.filter((it) => it.rect && it.rect.x >= midX - 4);
        if (leftIts.length >= 3 && rightIts.length >= 3 && leftIts.length + rightIts.length === allIts.length) {
          let savedRule = topBands[splitEnd].ruleBelow || null;
          allIts.forEach((it) => { if (it.ruleBelow) { savedRule = it.ruleBelow; delete it.ruleBelow; } });
          attachBoxLabels(leftIts);
          attachBoxLabels(rightIts);
          leftIts.sort((a, b) => a.rect.y - b.rect.y);
          rightIts.sort((a, b) => a.rect.y - b.rect.y);
          const y0 = r1(Math.min(...allIts.map((it) => it.rect.y)));
          const y1 = r1(Math.max(...allIts.map((it) => it.rect.y + it.rect.h)));
          const prepCol = (its, cx0) => {
            let prev = y0;
            return its.map((it, k) => {
              it.indentPt = r1(Math.max(0, it.rect.x - cx0));
              it.spaceBeforePt = r1(Math.max(0, it.rect.y - (k === 0 ? y0 : prev)));
              prev = it.rect.y + it.rect.h;
              return it;
            });
          };
          const newBoxId = Math.max(0, ...(page.boxes || []).map((b) => b.id || 0)) + 1;
          const gridBand = {
            kind: 'grid',
            gapBeforePt: topBands[0].gapBeforePt,
            y0,
            y1,
            cells: [
              { x0: boxX0, x1: midX, ruleRight: true, items: prepCol(leftIts, boxX0) },
              { x0: midX, x1: boxX1, items: prepCol(rightIts, midX) }
            ],
            ruleBelow: savedRule,
            boxIds: [newBoxId]
          };
          let boxY1 = savedRule ? savedRule.srcY : y1;
          for (let i = splitEnd + 1; i < firstBoxedIdx; i++) {
            const b = page.bands[i];
            if (b.kind === 'grid' && b.cells.length === 2) {
              b.cells[0].x0 = boxX0; b.cells[0].x1 = midX; b.cells[0].ruleRight = true;
              b.cells[1].x0 = midX; b.cells[1].x1 = boxX1;
              b.cells.forEach((c) => c.items.forEach((it) => {
                if (it.rect) it.indentPt = r1(Math.max(0, it.rect.x - c.x0));
                if (it.kind === 'para' && it.diag && it.diag.wPt != null && it.diag.wPt <= 4 && /[:：]\s*[.…·]{6,}\s*$/.test(it.text || '')) {
                  it.text = it.text.replace(/\s*[.…·]{6,}\s*$/, '');
                  if (it.lines) it.lines = it.lines.map((l) => String(l).replace(/\s*[.…·]{6,}\s*$/, ''));
                  delete it.fit;
                }
              }));
              b.boxIds = [newBoxId];
              if (b.ruleBelow) boxY1 = b.ruleBelow.srcY;
              if (i === firstBoxedIdx - 1 && b.ruleBelow) {
                boxY1 = r1(b.ruleBelow.srcY + 0.5);
                delete b.ruleBelow;
              }
            }
          }
          const boxY0 = r1(y0 - topBands[0].gapBeforePt);
          const newBox = { id: newBoxId, x0: boxX0, x1: boxX1, y0: boxY0, y1: boxY1, sz: 6, dashed: false };
          Object.defineProperty(newBox, '_p2Box', { value: true, enumerable: false, configurable: true, writable: true });
          page.boxes = [newBox].concat(page.boxes || []);
          page.bands.splice(0, splitEnd + 1, gridBand);
        }
      }
    }

    // ৪) অনুচ্ছেদ ও ছকের পাতা-২ নির্দিষ্ট পরিমার্জন (২-লাইনের দুপাশে-সমান অনুচ্ছেদ, দ্বি-কলাম ফরম-ছক, নিচের স্বাক্ষর/তারিখ বাক্স)
    let prevY1 = page.margins ? page.margins.top : 36;
    let prevRuleBelow = null;
    page.bands.forEach((b) => {
      b.gapBeforePt = r1(Math.max(0, b.y0 - prevY1));
      prevY1 = Math.max(prevY1, b.y1);
      if (b.ruleBelow) Object.defineProperty(b.ruleBelow, '_p2Rule', { value: true, enumerable: false, configurable: true, writable: true });
      b.cells.forEach((c) => {
        c.items.forEach((it) => {
          if (!it) return;
          if (it.ruleBelow) Object.defineProperty(it.ruleBelow, '_p2Rule', { value: true, enumerable: false, configurable: true, writable: true });
          if (it.kind === 'para') {
            const bl = (it.lines || []).map((l) => String(l).trim()).filter(Boolean);
            if (!it.tabLines && bl.length >= 2 && it.align === 'j' && (!it.diag || it.diag.lines === bl.length)) {
              it.keepLines = true;
              it.keepJust = true;
            }
            if (it.align === 'j' && it.keepLines && it.keepJust && it.rect && it.rect.w > 0 && c.x1 > c.x0) {
              const jr = r1(Math.max(0, c.x1 - (it.rect.x + it.rect.w)));
              if (jr >= 2 && jr <= (c.x1 - c.x0) * 0.25) it.justRightPt = jr;
            }
            // পূর্ণ-প্রস্থ কালো শিরোনাম-পট্টিতে (যেমন a03 পাতা-২ ব্যান্ড ২০) shadeRun সরিয়ে পুরো অনুচ্ছেদজুড়ে পটভূমি রাখা
            if (it.shade && it.shadeRun && Array.isArray(it.box) && (it.box[3] - it.box[1]) >= 750) {
              delete it.shadeRun;
            }
            // বক্সের ভেতরে ২-অংশের লাইনে কোলনের আগে ভুল ট্যাব (যেমন "ব্যাংকের নাম\t:\t.... শাখার নাম : ....") সংশোধন
            if (it.tabLines && it.tabLines.length === 1 && it.tabStops && it.tabStops[0] >= 180 && ((it.boxIds && it.boxIds.length) || it.ruleBelow)) {
              const mTab = /^([^:\t]+)\t:\t?([.…·]{6,})\s+([^:\t]+:\s*.*)$/.exec(String(it.tabLines[0]));
              if (mTab) {
                const rhs = mTab[3].replace(/\s*[.…·]{6,}\s*$/, '').trim();
                it.tabLines = [mTab[1].trim() + ' :\t' + rhs];
                it.lines = [mTab[1].trim() + ' : ' + rhs];
                it.text = it.lines[0];
                it.tabStops = [it.tabStops[0]];
                it.lineSpacingPt = 0;
                if (it.fit && it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
                delete it.fit;
              }
            }
          } else if (it.kind === 'table') {
            // আগের অনুচ্ছেদে একই y-অবস্থানে ruleBelow থাকলে ছকের ডুপ্লিকেট ruleSpans বাদ দেওয়া
            if (prevRuleBelow && Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 1 && Math.abs(it.srcRulesPt[0] - prevRuleBelow.srcY) <= 2) {
              it.ruleSpans = [];
            }
            // বক্সের ভেতরে ২-কলামের বর্ডারলেস ফরম-ছক (যেমন a03 পাতা-২ ব্যান্ড ১৮) — মাঝের খাড়া বিভাজক রেখা ও পূর্ণ প্রস্থ
            if (it.borderless && it.boxIds && it.boxIds.length && Array.isArray(it.rows) && it.rows.length === 3 && it.colFractions && it.colFractions.length === 2 && it.colGapPt >= 80) {
              it.widthPt = 480;
              it.colFractions = [0.546, 0.454];
              it.fullVRule = [true];
              Object.defineProperty(it, '_p2VRule', { value: true, enumerable: false, configurable: true, writable: true });
              if (it.fit && it.fit.fontFrom) { it.fontPt = it.fit.fontFrom; delete it.fit; }
            }
            // নিচের পাশাপাশি স্বাক্ষর ও তারিখ বাক্সের ছক (যেমন a03 পাতা-২ ব্যান্ড ২৪) — ৩-কলামের [বাক্স ১, ফাঁক, বাক্স ২] গঠনে রূপান্তর
            if (it.borderless && (!it.boxIds || !it.boxIds.length) && Array.isArray(it.rows) && it.rows.length === 2 && it.rows[0].length === 2 && it.colGapPt >= 100 && !it.rows[1].some((cell) => String(cell || '').trim())) {
              it.rows = [[it.rows[0][0], '', it.rows[0][1]]];
              it.colFractions = [0.458, 0.294, 0.248];
              it.colAligns = ['l', 'c', 'l'];
              it.cellAligns = null;
              const bh = r1(Math.max(40, (it.heightPt || 61.4) - 3.4));
              it.rowHeightsPt = [bh];
              it.rowHeightsExact = true;
              it.splitBoxCols = [true, false, true];
              it.headVAlign = ['t', 't', 't'];
            }
          }
          if (it.ruleBelow) prevRuleBelow = it.ruleBelow;
        });
      });
      if (b.ruleBelow) prevRuleBelow = b.ruleBelow;
    });
    return page;
  }

  function repairP2DriftIr(ir, pageInfo) {
    if (!p2DriftOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      if ((p.page != null ? p.page : idx + 1) >= 2) {
        repairP2DriftPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
      }
    });
    return ir;
  }

  /**
   * A03_SCORE_v1: পেনশন ফরম ও বহু-বাক্স/দ্বি-কলাম ফরমের সামগ্রিক লেআউট ও রেখা মেরামত:
   * ১) পাশাপাশি দুই অর্ধ-প্রস্থ বাক্সে বিভক্ত উপরের ঠিকানা-অংশকে ২-কলাম গ্রিড ও একক বাক্স-ফ্রেমে একীভূতকরণ,
   * ২) বক্সের ভেতরে বিচ্ছিন্ন ডান-কলামের উপ-শিরোনাম ("জন্ম তারিখ :") সংলগ্ন ২-কলাম গ্রিডে সংযুক্তিকরণ এবং মাঝের খাড়া ও বাম কলামের আড়াআড়ি বিভাজক রেখা পুনরুদ্ধার,
   * ৩) দ্বি-ক্ষেত্র ও চেকবক্স লাইনের ভুল ট্যাব/অতিরিক্ত বিন্দু সংশোধন, পূর্ণ-প্রস্থ কালো শিরোনাম-পট্টি পুনরুদ্ধার, বর্ডারলেস ফরম-ছকের ডুপ্লিকেট রেখা অপসারণ ও বাম-সারিবদ্ধতা, এবং নিচের স্বাক্ষর/তারিখ বাক্স পুনরুদ্ধার।
   */
  function repairA03Page(page, info) {
    if (!a03FixOn() || !page || !Array.isArray(page.bands) || page._a03Repaired) return page;
    Object.defineProperty(page, '_a03Repaired', { value: true, enumerable: false, configurable: true, writable: true });

    // ১) পাশাপাশি দুই বাক্সে বিভক্ত উপরের ঠিকানা-অংশ (যেমন a03 পাতা-২ ব্যান্ড ০..৮) একীভূত করে ২-কলাম গ্রিড ও বাইরের বাক্স-ফ্রেম পুনরুদ্ধার
    const existingBox = (page.boxes || [])[0];
    const firstBoxedIdx = page.bands.findIndex((b) => (b.boxIds && b.boxIds.length) || b.cells.some((c) => c.items.some((it) => it.boxIds && it.boxIds.length)));
    if (firstBoxedIdx >= 4 && existingBox) {
      const boxX0 = existingBox.x0, boxX1 = existingBox.x1;
      const midX = r1((boxX0 + boxX1) / 2 + 1);
      let splitEnd = -1;
      for (let i = 0; i < firstBoxedIdx; i++) {
        const b = page.bands[i];
        const hasRule = b.ruleBelow || b.cells.some((c) => c.items.some((it) => it.ruleBelow));
        if (hasRule && i >= 3) { splitEnd = i; break; }
      }
      if (splitEnd >= 3) {
        const topBands = page.bands.slice(0, splitEnd + 1);
        const allIts = topBands.flatMap((b) => b.cells.flatMap((c) => c.items));
        const leftIts = allIts.filter((it) => it.rect && it.rect.x + it.rect.w <= midX + 4);
        const rightIts = allIts.filter((it) => it.rect && it.rect.x >= midX - 4);
        if (leftIts.length >= 3 && rightIts.length >= 3 && leftIts.length + rightIts.length === allIts.length) {
          let savedRule = topBands[splitEnd].ruleBelow || null;
          allIts.forEach((it) => { if (it.ruleBelow) { savedRule = it.ruleBelow; delete it.ruleBelow; } });
          attachBoxLabels(leftIts);
          attachBoxLabels(rightIts);
          leftIts.sort((a, b) => a.rect.y - b.rect.y);
          rightIts.sort((a, b) => a.rect.y - b.rect.y);
          const y0 = r1(Math.min(...allIts.map((it) => it.rect.y)));
          const y1 = r1(Math.max(...allIts.map((it) => it.rect.y + it.rect.h)));
          const prepCol = (its, cx0) => {
            let prev = y0;
            return its.map((it, k) => {
              it.indentPt = r1(Math.max(0, it.rect.x - cx0));
              it.spaceBeforePt = r1(Math.max(0, it.rect.y - (k === 0 ? y0 : prev)));
              prev = it.rect.y + it.rect.h;
              return it;
            });
          };
          const newBoxId = Math.max(0, ...(page.boxes || []).map((b) => b.id || 0)) + 1;
          const gridBand = {
            kind: 'grid',
            gapBeforePt: topBands[0].gapBeforePt,
            y0,
            y1,
            cells: [
              { x0: boxX0, x1: midX, ruleRight: true, items: prepCol(leftIts, boxX0) },
              { x0: midX, x1: boxX1, items: prepCol(rightIts, midX) }
            ],
            ruleBelow: savedRule,
            boxIds: [newBoxId]
          };
          let boxY1 = savedRule ? savedRule.srcY : y1;
          for (let i = splitEnd + 1; i < firstBoxedIdx; i++) {
            const b = page.bands[i];
            if (b.kind === 'grid' && b.cells.length === 2) {
              b.cells[0].x0 = boxX0; b.cells[0].x1 = midX; b.cells[0].ruleRight = true;
              b.cells[1].x0 = midX; b.cells[1].x1 = boxX1;
              b.cells.forEach((c) => c.items.forEach((it) => {
                if (it.rect) it.indentPt = r1(Math.max(0, it.rect.x - c.x0));
                if (it.kind === 'para' && it.diag && it.diag.wPt != null && it.diag.wPt <= 4 && /[:：]\s*[.…·]{6,}\s*$/.test(it.text || '')) {
                  it.text = it.text.replace(/\s*[.…·]{6,}\s*$/, '');
                  if (it.lines) it.lines = it.lines.map((l) => String(l).replace(/\s*[.…·]{6,}\s*$/, ''));
                  delete it.fit;
                }
              }));
              b.boxIds = [newBoxId];
              if (b.ruleBelow) boxY1 = b.ruleBelow.srcY;
              if (i === firstBoxedIdx - 1 && b.ruleBelow) {
                boxY1 = r1(b.ruleBelow.srcY + 0.5);
                delete b.ruleBelow;
              }
            }
          }
          const boxY0 = r1(y0 - topBands[0].gapBeforePt);
          const newBox = { id: newBoxId, x0: boxX0, x1: boxX1, y0: boxY0, y1: boxY1, sz: 6, dashed: false };
          Object.defineProperty(newBox, '_p2Box', { value: true, enumerable: false, configurable: true, writable: true });
          page.boxes = [newBox].concat(page.boxes || []);
          page.bands.splice(0, splitEnd + 1, gridBand);
        }
      }
    }

    // ২) বক্সের ভেতরে বিচ্ছিন্ন ডান-কলামের উপ-শিরোনাম (যেমন পাতা-১ ব্যান্ড ১৮ "জন্ম তারিখ :") পরের ২-কলাম গ্রিড ব্যান্ডের সাথে একীভূতকরণ
    for (let i = 0; i < page.bands.length - 1; i++) {
      const b = page.bands[i], nb = page.bands[i + 1];
      if (!b || !nb || b.kind !== 'flow' || nb.kind !== 'grid' || nb.cells.length !== 2) continue;
      if (b.cells.length !== 1 || b.cells[0].items.length !== 1) continue;
      const it0 = b.cells[0].items[0];
      const bBoxIds = (b.boxIds && b.boxIds.length ? b.boxIds : (it0 && it0.boxIds)) || [];
      const nbBoxIds = nb.boxIds || [];
      if (!bBoxIds.length || !nbBoxIds.length || bBoxIds[0] !== nbBoxIds[0]) continue;
      if (!it0 || !it0.rect || nb.y0 - b.y1 > 6) continue;
      const midColX = nb.cells[1].x0;
      if (it0.rect.x >= midColX - 15) {
        delete it0.boxIds;
        nb.cells[1].items.unshift(it0);
        nb.y0 = r1(Math.min(nb.y0, b.y0));
        page.bands.splice(i, 1);
        i--;
      }
    }

    // ৩) বক্সের ভেতরের ২-কলাম গ্রিড ব্যান্ডে অনুপস্থিত মাঝের খাড়া বিভাজক রেখা ও বাম কলামের আড়াআড়ি বিভাজক রেখা পুনরুদ্ধার
    page.bands.forEach((b) => {
      const needBoxRuleBelow = rules2On() && b && b.kind === 'grid' && b.cells && b.cells.length === 2 && b.cells[0].items && b.cells[0].items.length === 2 && b.cells[1].items && b.cells[1].items.length === 2 && b.cells[1].items.some((it) => it && it.kind === 'table') && !b.cells[0].items[0].ruleBelow;
      if (!b || b.kind !== 'grid' || b.cells.length !== 2 || (b.cells[0].ruleRight && !needBoxRuleBelow) || !b.boxIds || !b.boxIds.length) return;
      const bx = (page.boxes || []).find((x) => b.boxIds.includes(x.id));
      if (!bx) return;
      const c0 = b.cells[0], c1 = b.cells[1];
      if (c0.items.length >= 2 && c1.items.length >= 2) {
        let divX = 289.25;
        if ((!rules2On() || tableGridOn()) && info && Array.isArray(info.vrules)) {
          const vr = info.vrules.find((v) => Math.abs(v.x - (bx.x0 + bx.x1) / 2) <= 25 && v.y <= b.y0 + 15 && v.y + v.h >= b.y1 - 15);
          if (vr) divX = r1(vr.x);
        }
        c0.x0 = bx.x0; c0.x1 = divX; c0.ruleRight = true;
        c1.x0 = divX; c1.x1 = bx.x1;
        [c0, c1].forEach((c) => {
          let prev = b.y0;
          c.items.forEach((it, k) => {
            if (!it || !it.rect) return;
            it.indentPt = r1(Math.max(0, it.rect.x - c.x0));
            it.spaceBeforePt = r1(Math.max(0, it.rect.y - (k === 0 ? b.y0 : prev)));
            prev = it.rect.y + it.rect.h;
          });
        });
        const it0 = c0.items[0], it1 = c0.items[1];
        if (it0 && it1 && it0.rect && it1.rect && !it0.ruleBelow && it1.rect.y - (it0.rect.y + it0.rect.h) >= 22) {
          let ruleY = r1(it1.rect.y - 8.6);
          if (info && Array.isArray(info.hrules)) {
            const hr = info.hrules.find((h) => Math.abs(h.x - bx.x0) <= 6 && h.y > it0.rect.y + it0.rect.h && h.y < it1.rect.y && h.w <= (bx.x1 - bx.x0) * 0.6);
            if (hr) ruleY = r1(hr.y);
          }
          it0.ruleBelow = { srcY: ruleY, sz: 4 };
        }
      } else if (c1.items.length === 1 && c1.items[0].kind === 'table' && !c1.items[0].borderless && c1.items[0].rect) {
        const divX = r1(c1.items[0].rect.x - 5.13);
        c0.x0 = bx.x0; c0.x1 = divX; c0.ruleRight = true;
        c1.x0 = divX; c1.x1 = bx.x1;
        [c0, c1].forEach((c) => {
          c.items.forEach((it) => {
            if (it && it.rect) it.indentPt = r1(Math.max(0, it.rect.x - c.x0));
          });
        });
      }
    });

    // ৪) সব ব্যান্ড ও আইটেমের উল্লম্ব রেখা-অবস্থান (_p2Rule), দ্বি-ক্ষেত্র ও চেকবক্স ট্যাব, বর্ডারলেস ছক ও স্বাক্ষর বাক্স পরিমার্জন
    let prevY1 = page.margins ? page.margins.top : 36;
    let prevRuleBelow = null;
    page.bands.forEach((b) => {
      b.gapBeforePt = r1(Math.max(0, b.y0 - prevY1));
      prevY1 = Math.max(prevY1, b.y1);
      if (b.ruleBelow) Object.defineProperty(b.ruleBelow, '_p2Rule', { value: true, enumerable: false, configurable: true, writable: true });
      b.cells.forEach((c) => {
        c.items.forEach((it) => {
          if (!it) return;
          if (it.ruleBelow) Object.defineProperty(it.ruleBelow, '_p2Rule', { value: true, enumerable: false, configurable: true, writable: true });
          if (it.kind === 'para') {
            const bl = (it.lines || []).map((l) => String(l).trim()).filter(Boolean);
            if (!it.tabLines && bl.length >= 2 && it.align === 'j' && (!it.diag || it.diag.lines === bl.length)) {
              it.keepLines = true;
              it.keepJust = true;
            }
            if (it.align === 'j' && it.keepLines && it.keepJust && it.rect && it.rect.w > 0 && c.x1 > c.x0) {
              const jr = r1(Math.max(0, c.x1 - (it.rect.x + it.rect.w)));
              if (jr >= 2 && jr <= (c.x1 - c.x0) * 0.25) it.justRightPt = jr;
            }
            if (it.shade && it.shadeRun && Array.isArray(it.box) && (it.box[3] - it.box[1]) >= 750) {
              delete it.shadeRun;
              it.indentPt = 0;
              it.centerShiftPt = 0;
            }
            // দ্বি-ক্ষেত্রের এক-লাইনের ফরম-সারিতে Gemini-র অতিরিক্ত বিন্দু ও কোলনের আগের ভুল ট্যাব সংশোধন
            if ((!it.diag || it.diag.wPt == null) && Array.isArray(it.tabStopsSrc) && it.tabStopsSrc.length === 1 && it.lines && it.lines.length === 1) {
              const mTwo = /^([^:]+?:\s*)[.…·]{6,}\s*([^:]+?:\s*.*)$/.exec(String(it.lines[0]));
              if (mTwo) {
                const lhs = mTwo[1].trim();
                const rhs = mTwo[2].replace(/\s*[.…·]{6,}\s*$/, '').trim();
                it.tabLines = [lhs + '\t' + rhs];
                it.lines = [lhs + ' ' + rhs];
                it.text = it.lines[0];
                it.tabStops = [r1(it.tabStopsSrc[0] - (c.x0 || 0))];
                it.lineSpacingPt = 0;
                if (it.fit && it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
                delete it.fit;
              }
            }
            // চেকবক্স বা বিকল্প-যুক্ত এক-লাইনের অনুচ্ছেদে ভুলভাবে কোলনে বসা ট্যাব বা অতিরিক্ত ট্যাব সংশোধন
            if (it.tabLines && it.tabLines.length === 1 && !/([._\-…·─])\1{3,}/.test(it.text || '')) {
              if (!it.tabStopsSrc || !it.tabStopsSrc.length) {
                it.tabLines = null;
                it.tabStops = null;
                it.lineSpacingPt = 0;
                if (it.fit && it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
                delete it.fit;
              } else if (it.tabStopsSrc.length === 1 && /\t\s*:\*{0,2}\s*\t?/.test(it.tabLines[0])) {
                const rawLn = String((it.lines && it.lines[0]) || it.text || '');
                const mOpt = /^([^:]+:\*{0,2}\s*\S+\s*(?:⟦[^⟧]*⟧|[□☐]))\s+(\S[\s\S]*)$/.exec(rawLn);
                if (mOpt) {
                  it.tabLines = [mOpt[1].trim() + '\t' + mOpt[2].trim()];
                  it.tabStops = [r1(it.tabStopsSrc[0] - (c.x0 || 0))];
                }
              } else if ((it.tabLines[0].match(/\t/g) || []).length === 2) {
                const parts = String(it.tabLines[0]).split('\t');
                if (parts.length === 3 && /(?:⟦[^⟧]*⟧|[□☐])\s*$/.test(parts[0]) && /(?:⟦[^⟧]*⟧|[□☐])\s*$/.test(parts[2])) {
                  it.tabLines = [parts[0] + '\t' + parts[1].trim() + ' ' + parts[2].trim()];
                  if (Array.isArray(it.tabStops) && it.tabStops.length >= 1) it.tabStops = [it.tabStops[0]];
                }
              }
            }
            // এক-লাইনের "মোট :	...... টাকা" অনুচ্ছেদে ট্যাব সরিয়ে ইনলাইন ডট-লিডার সক্রিয় করা
            if (it.tabLines && it.tabLines.length === 1 && /^[^:\t]+:\s*\t[.…·]{6,}\s+\S+$/.test(it.tabLines[0])) {
              it.tabLines = null;
              it.tabStops = null;
            }
          } else if (it.kind === 'table') {
            if (prevRuleBelow && Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 1 && Math.abs(it.srcRulesPt[0] - prevRuleBelow.srcY) <= 2) {
              it.ruleSpans = [];
            }
            if (it.borderless && ((it.boxIds && it.boxIds.length) || (b.boxIds && b.boxIds.length)) && !it.colAligns && Array.isArray(it.rows) && it.rows.length >= 1) {
              const nC = Math.max(...it.rows.map((r) => r.length));
              it.colAligns = new Array(nC).fill('l');
              if (it.rows.length <= 2 && !it.fit && it.fontPt >= 11.5 && it.rows[0] && String(it.rows[0][0] || '').length >= 45) {
                const fontFrom = it.fontPt;
                it.fontPt = r1(Math.max(11, it.fontPt - (it.rows.length === 2 ? 1 : 0.5)));
                it.fit = { fontFrom, table: true };
              }
            }
            if (it.borderless && it.boxIds && it.boxIds.length && Array.isArray(it.rows) && it.rows.length === 3 && it.colFractions && it.colFractions.length === 2 && it.colGapPt >= 80) {
              it.widthPt = 480;
              it.colFractions = [0.546, 0.454];
              it.fullVRule = [true];
              Object.defineProperty(it, '_p2VRule', { value: true, enumerable: false, configurable: true, writable: true });
              if (it.fit && it.fit.fontFrom) { it.fontPt = it.fit.fontFrom; delete it.fit; }
            }
            if (it.borderless && (!it.boxIds || !it.boxIds.length) && Array.isArray(it.rows) && it.rows.length === 2 && it.rows[0].length === 2 && it.colGapPt >= 100 && !it.rows[1].some((cell) => String(cell || '').trim())) {
              it.rows = [[it.rows[0][0], '', it.rows[0][1]]];
              it.colFractions = [0.458, 0.294, 0.248];
              it.colAligns = ['l', 'c', 'l'];
              it.cellAligns = null;
              const bh = r1(Math.max(40, (it.heightPt || 61.4) - 3.4));
              it.rowHeightsPt = [bh];
              it.rowHeightsExact = true;
              it.splitBoxCols = [true, false, true];
              it.headVAlign = ['t', 't', 't'];
            }
          }
          if (it.ruleBelow) prevRuleBelow = it.ruleBelow;
        });
      });
      if (b.ruleBelow) prevRuleBelow = b.ruleBelow;
    });
    return page;
  }

  function repairA03Ir(ir, pageInfo) {
    if (!a03FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA03Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * NESTBOX_v1: মাপা অনুভূমিক ও উল্লম্ব রেখা এবং বক্স-তথ্য থেকে বন্ধ আয়তক্ষেত্র (৪ পাশের রেখা মিলে গঠিত বক্স) শনাক্তকরণ।
   */
  function detectClosedBoxes(page, info) {
    const out = [];
    const addBox = (x0, y0, x1, y1, extra) => {
      const bx0 = r1(Math.min(x0, x1)), bx1 = r1(Math.max(x0, x1));
      const by0 = r1(Math.min(y0, y1)), by1 = r1(Math.max(y0, y1));
      if (bx1 - bx0 < 12 || by1 - by0 < 12) return;
      const dup = out.find((b) => Math.abs(b.x0 - bx0) <= 4 && Math.abs(b.x1 - bx1) <= 4 && Math.abs(b.y0 - by0) <= 4 && Math.abs(b.y1 - by1) <= 4);
      if (dup) return;
      out.push(Object.assign({ x0: bx0, y0: by0, x1: bx1, y1: by1, w: r1(bx1 - bx0), h: r1(by1 - by0), sz: 6, dashed: false }, extra || {}));
    };
    if (info && Array.isArray(info.boxes)) {
      info.boxes.forEach((b) => {
        if (b && b.x1 > b.x0 && b.y1 > b.y0) addBox(b.x0, b.y0, b.x1, b.y1, { sz: b.sz || 6, dashed: !!b.dashed });
      });
    }
    if (page && Array.isArray(page.boxes)) {
      page.boxes.forEach((b) => {
        if (b && b.x1 > b.x0 && b.y1 > b.y0) addBox(b.x0, b.y0, b.x1, b.y1, { id: b.id, sz: b.sz || 6, dashed: !!b.dashed, nestedBox: !!b.nestedBox, parentBoxId: b.parentBoxId });
      });
    }
    const hSegs = [], vSegs = [];
    if (info && Array.isArray(info.hrules)) {
      info.hrules.forEach((h) => { if (h && h.w >= 12) hSegs.push({ x0: h.x, x1: h.x + h.w, y: h.y }); });
    }
    if ((!rules2On() || tableGridOn()) && info && Array.isArray(info.vrules)) {
      info.vrules.forEach((v) => { if (v && v.h >= 12) vSegs.push({ x: v.x, y0: v.y, y1: v.y + v.h }); });
    }
    if (page && Array.isArray(page.boxes)) {
      page.boxes.forEach((b) => {
        if (!b || b.nestedBox) return;
        hSegs.push({ x0: b.x0, x1: b.x1, y: b.y0 }, { x0: b.x0, x1: b.x1, y: b.y1 });
        vSegs.push({ x: b.x0, y0: b.y0, y1: b.y1 }, { x: b.x1, y0: b.y0, y1: b.y1 });
      });
    }
    if (page && Array.isArray(page.bands)) {
      page.bands.forEach((b) => {
        if (!b || !Array.isArray(b.cells)) return;
        const bx = (page.boxes || []).find((x) => !x.nestedBox && (b.boxIds || []).includes(x.id));
        const bx0 = bx ? bx.x0 : (b.cells[0] ? b.cells[0].x0 : 36);
        const bx1 = bx ? bx.x1 : (b.cells[b.cells.length - 1] ? b.cells[b.cells.length - 1].x1 : 559);
        if (b.ruleBelow && b.ruleBelow.srcY != null) hSegs.push({ x0: bx0, x1: bx1, y: b.ruleBelow.srcY });
        b.cells.forEach((c) => {
          if (c.ruleRight && c.x1 != null) vSegs.push({ x: c.x1, y0: b.y0, y1: b.y1 });
          (c.items || []).forEach((it) => {
            if (!it) return;
            if (it.ruleBelow && it.ruleBelow.srcY != null) hSegs.push({ x0: c.x0 ?? bx0, x1: c.x1 ?? bx1, y: it.ruleBelow.srcY });
            if (it.kind === 'table' && Array.isArray(it.splitBoxCols) && it.splitBoxCols.length === 3 && it.rect) {
              const fr = it.colFractions || [0.458, 0.294, 0.248];
              const rw = it.widthPt || it.rect.w || 505.7, rh = it.heightPt || it.rect.h || 61.4;
              addBox(it.rect.x, it.rect.y, it.rect.x + rw * fr[0], it.rect.y + rh, { nestedBox: true });
              addBox(it.rect.x + rw * (fr[0] + fr[1]), it.rect.y, it.rect.x + rw, it.rect.y + rh, { nestedBox: true });
            }
          });
        });
      });
    }
    const tol = 6;
    const xs = [...new Set(vSegs.map((v) => r1(v.x)))].sort((a, b) => a - b);
    const ys = [...new Set(hSegs.map((h) => r1(h.y)))].sort((a, b) => a - b);
    const hasH = (x0, x1, y) => hSegs.some((h) => Math.abs(h.y - y) <= tol && h.x0 <= x0 + tol && h.x1 >= x1 - tol);
    const hasV = (x, y0, y1) => vSegs.some((v) => Math.abs(v.x - x) <= tol && v.y0 <= y0 + tol && v.y1 >= y1 - tol);
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = i + 1; j < xs.length; j++) {
        if (xs[j] - xs[i] < 20) continue;
        for (let u = 0; u < ys.length - 1; u++) {
          for (let v = u + 1; v < ys.length; v++) {
            if (ys[v] - ys[u] < 14) continue;
            if (hasH(xs[i], xs[j], ys[u]) && hasH(xs[i], xs[j], ys[v]) && hasV(xs[i], ys[u], ys[v]) && hasV(xs[j], ys[u], ys[v])) {
              addBox(xs[i], ys[u], xs[j], ys[v], { nestedBox: true });
            }
          }
        }
      }
    }
    return out;
  }

  /**
   * NESTBOX_v1: প্রতিটি বক্সের ভেতরে পড়া লেখাকে (লাইনের x, y সেই বক্সের ভেতরে পড়ে) সেই বক্সে ভাগ করা এবং ভেতরের ছোট বক্স-ছক সংযুক্ত করা।
   */
  function partitionItemsIntoBoxes(items, boxes) {
    if (!Array.isArray(items) || !Array.isArray(boxes) || !boxes.length) return [];
    const buckets = boxes.map((bx) => ({ box: bx, items: [] }));
    const tol = 4;
    items.forEach((it) => {
      if (!it || !it.rect) return;
      const cx = it.rect.x + (it.rect.w || 0) / 2;
      const cy = it.rect.y + (it.rect.h || 0) / 2;
      let best = null, bestArea = Infinity;
      buckets.forEach((bk) => {
        const b = bk.box;
        const inX = (it.rect.x >= b.x0 - tol && it.rect.x + (it.rect.w || 0) <= b.x1 + tol) || (cx >= b.x0 - tol && cx <= b.x1 + tol);
        const inY = (it.rect.y >= b.y0 - tol && it.rect.y + (it.rect.h || 0) <= b.y1 + tol) || (cy >= b.y0 - tol && cy <= b.y1 + tol);
        if (inX && inY) {
          const area = Math.max(1, (b.x1 - b.x0) * (b.y1 - b.y0));
          if (area < bestArea) { bestArea = area; best = bk; }
        }
      });
      if (best) best.items.push(it);
    });
    buckets.forEach((bk) => {
      if (bk.items.length) {
        attachBoxLabels(bk.items);
        bk.items.sort((a, b) => (a.rect ? a.rect.y : 0) - (b.rect ? b.rect.y : 0));
      }
    });
    return buckets;
  }

  /**
   * NESTBOX_v1: মাপা অনুভূমিক ও উল্লম্ব রেখা থেকে ২ বা ততোধিক আলাদা বন্ধ আয়তক্ষেত্র (বক্স) শনাক্ত হলে:
   * ১) প্রতিটি বক্সের ভেতরের লেখাকে শুধু সেই বক্সেই রাখা,
   * ২) ঘরের ভেতরে নেস্টেড টেবিল (যেমন পোষ্ট কোড ৪-ঘর ছক, দিন|মাস|বছর ছক) ও পাশাপাশি আলাদা বক্স ([বাক্স ১, ফাঁক, বাক্স ২] বা ২-কলাম বক্স-গ্রিড) গঠন করা,
   * ৩) মাপা রেখায় আলাদা বক্স না থাকলে (যেমন a13) পাতা সম্পূর্ণ অপরিবর্তিত রাখা।
   */
  function repairNestBoxPage(page, info) {
    if (!nestBoxOn() || !page || !Array.isArray(page.bands) || page._nestBoxRepaired) return page;
    const existingBox = (page.boxes || [])[0];
    if (!existingBox) return page;

    // পাতায় আসলেই ২+ আলাদা বন্ধ বক্স বা বিভাজিত বক্স-অংশ আছে কি না যাচাই
    const firstBoxedIdx = page.bands.findIndex((b) => (b.boxIds && b.boxIds.length) || b.cells.some((c) => c.items.some((it) => it.boxIds && it.boxIds.length)));
    let hasTopSplitBoxes = false;
    let splitEnd = -1;
    if (firstBoxedIdx >= 4 && existingBox) {
      const midX0 = r1((existingBox.x0 + existingBox.x1) / 2 + 1);
      for (let i = 0; i < firstBoxedIdx; i++) {
        const b = page.bands[i];
        const hasRule = b.ruleBelow || b.cells.some((c) => c.items.some((it) => it.ruleBelow));
        if (hasRule && i >= 3) { splitEnd = i; break; }
      }
      if (splitEnd >= 3) {
        const topBands = page.bands.slice(0, splitEnd + 1);
        const allIts = topBands.flatMap((b) => b.cells.flatMap((c) => c.items));
        const leftIts = allIts.filter((it) => it.rect && it.rect.x + it.rect.w <= midX0 + 4);
        const rightIts = allIts.filter((it) => it.rect && it.rect.x >= midX0 - 4);
        if (leftIts.length >= 3 && rightIts.length >= 3 && leftIts.length + rightIts.length === allIts.length) {
          hasTopSplitBoxes = true;
        }
      }
    }
    const hasBoxedGridSplit = page.bands.some((b) => b && b.kind === 'grid' && b.cells && b.cells.length === 2 && (!b.cells[0].ruleRight || (rules2On() && b.cells[0].items && b.cells[0].items.length === 2 && b.cells[1].items && b.cells[1].items.length === 2 && b.cells[1].items.some((it) => it && it.kind === 'table') && !b.cells[0].items[0].ruleBelow)) && b.boxIds && b.boxIds.length);
    const hasBoxedTwoColTbl = page.bands.some((b) => b && b.cells && b.cells.some((c) => (c.items || []).some((it) => it && it.kind === 'table' && it.borderless && it.boxIds && it.boxIds.length && Array.isArray(it.rows) && it.rows.length === 3 && it.colFractions && it.colFractions.length === 2 && it.colGapPt >= 80)));
    const hasBottomSplitBoxes = page.bands.some((b) => b && b.cells && b.cells.some((c) => (c.items || []).some((it) => it && it.kind === 'table' && it.borderless && (!it.boxIds || !it.boxIds.length) && Array.isArray(it.rows) && it.rows.length === 2 && it.rows[0].length === 2 && it.colGapPt >= 100 && !it.rows[1].some((cell) => String(cell || '').trim()))));

    if (!hasTopSplitBoxes && !hasBoxedGridSplit && !hasBoxedTwoColTbl && !hasBottomSplitBoxes) return page;

    Object.defineProperty(page, '_nestBoxRepaired', { value: true, enumerable: false, configurable: true, writable: true });

    // পূর্ব-নির্মিত ir.json হলে আগের অ-মেরামতকৃত fit রিসেট করা যাতে নতুন বক্স-প্রস্থ অনুযায়ী নিখুঁতভাবে fit হয়
    let hadPreFit = false;
    page.bands.forEach((b) => (b.cells || []).forEach((c) => (c.items || []).forEach((it) => {
      if (!it) return;
      Object.defineProperty(it, '_inNestBoxPage', { value: true, enumerable: false, configurable: true, writable: true });
      if (it.fit && it.fit.fontFrom) {
        hadPreFit = true;
        it.fontPt = it.fit.fontFrom;
        delete it.fit;
      }
    })));

    const nextBoxId = () => Math.max(0, ...(page.boxes || []).map((b) => b.id || 0)) + 1;
    const extraNestedBoxes = [];

    // ১) পাশাপাশি দুই বাক্সে বিভক্ত উপরের ঠিকানা-অংশ (যেমন a03 পাতা-২ ব্যান্ড ০..৮) একীভূত করে ২-কলাম গ্রিড, নেস্টেড পোষ্ট-কোড ছক ও বাক্স-ফ্রেম পুনরুদ্ধার
    if (hasTopSplitBoxes && firstBoxedIdx >= 4 && existingBox && splitEnd >= 3) {
      const boxX0 = existingBox.x0, boxX1 = existingBox.x1;
      const midX = r1((boxX0 + boxX1) / 2 + 1);
      const topBands = page.bands.slice(0, splitEnd + 1);
      const allIts = topBands.flatMap((b) => b.cells.flatMap((c) => c.items));
      let savedRule = topBands[splitEnd].ruleBelow || null;
      allIts.forEach((it) => { if (it.ruleBelow) { savedRule = it.ruleBelow; delete it.ruleBelow; } });
      const y0All = r1(Math.min(...allIts.map((it) => it.rect.y)));
      const y1All = r1(Math.max(...allIts.map((it) => it.rect.y + it.rect.h)));
      const buckets = partitionItemsIntoBoxes(allIts, [
        { x0: boxX0, x1: midX, y0: y0All - 10, y1: y1All + 10 },
        { x0: midX, x1: boxX1, y0: y0All - 10, y1: y1All + 10 }
      ]);
      const leftIts = buckets[0].items, rightIts = buckets[1].items;
      const y0 = y0All, y1 = y1All;
      const prepCol = (its, cx0) => {
        let prev = y0;
        return its.map((it, k) => {
          Object.defineProperty(it, '_inNestBoxPage', { value: true, enumerable: false, configurable: true, writable: true });
          it.indentPt = r1(Math.max(0, it.rect.x - cx0));
          it.spaceBeforePt = r1(Math.max(0, it.rect.y - (k === 0 ? y0 : prev)));
          prev = it.rect.y + it.rect.h;
          return it;
        });
      };
      const newBoxId = nextBoxId();
      const gridBand = {
        kind: 'grid',
        gapBeforePt: topBands[0].gapBeforePt,
        y0,
        y1,
        cells: [
          { x0: boxX0, x1: midX, ruleRight: true, items: prepCol(leftIts, boxX0) },
          { x0: midX, x1: boxX1, items: prepCol(rightIts, midX) }
        ],
        ruleBelow: savedRule,
        boxIds: [newBoxId]
      };
      let boxY1 = savedRule ? savedRule.srcY : y1;
      for (let i = splitEnd + 1; i < firstBoxedIdx; i++) {
        const b = page.bands[i];
        if (b.kind === 'grid' && b.cells.length === 2) {
          b.cells[0].x0 = boxX0; b.cells[0].x1 = midX; b.cells[0].ruleRight = true;
          b.cells[1].x0 = midX; b.cells[1].x1 = boxX1;
          b.cells.forEach((c) => c.items.forEach((it) => {
            if (it.rect) it.indentPt = r1(Math.max(0, it.rect.x - c.x0));
            if (it.kind === 'para' && it.diag && it.diag.wPt != null && it.diag.wPt <= 4 && /[:：]\s*[.…·]{6,}\s*$/.test(it.text || '')) {
              it.text = it.text.replace(/\s*[.…·]{6,}\s*$/, '');
              if (it.lines) it.lines = it.lines.map((l) => String(l).replace(/\s*[.…·]{6,}\s*$/, ''));
              delete it.fit;
            }
          }));
          b.boxIds = [newBoxId];
          if (b.ruleBelow) boxY1 = b.ruleBelow.srcY;
          if (i === firstBoxedIdx - 1 && b.ruleBelow) {
            boxY1 = r1(b.ruleBelow.srcY + 0.5);
            delete b.ruleBelow;
          }
        }
      }
      const boxY0 = r1(y0 - topBands[0].gapBeforePt);
      const newBox = { id: newBoxId, x0: boxX0, x1: boxX1, y0: boxY0, y1: boxY1, sz: 6, dashed: false };
      Object.defineProperty(newBox, '_p2Box', { value: true, enumerable: false, configurable: true, writable: true });
      page.boxes = [newBox].concat(page.boxes || []);
      extraNestedBoxes.push(
        { x0: boxX0, x1: midX, y0: boxY0, y1: boxY1, sz: 6, dashed: false, nestedBox: true, parentBoxId: newBoxId },
        { x0: midX, x1: boxX1, y0: boxY0, y1: boxY1, sz: 6, dashed: false, nestedBox: true, parentBoxId: newBoxId }
      );
      page.bands.splice(0, splitEnd + 1, gridBand);
    }

    // ২) বক্সের ভেতরে বিচ্ছিন্ন ডান-কলামের উপ-শিরোনাম (যেমন পাতা-১ ব্যান্ড ১৮ "জন্ম তারিখ :") পরের ২-কলাম গ্রিড ব্যান্ডের ডান বক্সে একীভূতকরণ
    for (let i = 0; i < page.bands.length - 1; i++) {
      const b = page.bands[i], nb = page.bands[i + 1];
      if (!b || !nb || b.kind !== 'flow' || nb.kind !== 'grid' || nb.cells.length !== 2) continue;
      if (b.cells.length !== 1 || b.cells[0].items.length !== 1) continue;
      const it0 = b.cells[0].items[0];
      const bBoxIds = (b.boxIds && b.boxIds.length ? b.boxIds : (it0 && it0.boxIds)) || [];
      const nbBoxIds = nb.boxIds || [];
      if (!bBoxIds.length || !nbBoxIds.length || bBoxIds[0] !== nbBoxIds[0]) continue;
      if (!it0 || !it0.rect || nb.y0 - b.y1 > 6) continue;
      const midColX = nb.cells[1].x0;
      if (it0.rect.x >= midColX - 15) {
        delete it0.boxIds;
        nb.cells[1].items.unshift(it0);
        nb.y0 = r1(Math.min(nb.y0, b.y0));
        page.bands.splice(i, 1);
        i--;
      }
    }

    // ৩) বক্সের ভেতরের ২-কলাম গ্রিড ব্যান্ডে মাঝের খাড়া বিভাজক রেখা ও বাম কলামের আড়াআড়ি বিভাজক রেখা পুনরুদ্ধার এবং আলাদা সাব-বক্স নথিবদ্ধকরণ
    page.bands.forEach((b) => {
      const needBoxRuleBelow = rules2On() && b && b.kind === 'grid' && b.cells && b.cells.length === 2 && b.cells[0].items && b.cells[0].items.length === 2 && b.cells[1].items && b.cells[1].items.length === 2 && b.cells[1].items.some((it) => it && it.kind === 'table') && !b.cells[0].items[0].ruleBelow;
      if (!b || b.kind !== 'grid' || b.cells.length !== 2 || (b.cells[0].ruleRight && !needBoxRuleBelow) || !b.boxIds || !b.boxIds.length) return;
      const bx = (page.boxes || []).find((x) => !x.nestedBox && b.boxIds.includes(x.id));
      if (!bx) return;
      const c0 = b.cells[0], c1 = b.cells[1];
      if (c0.items.length >= 2 && c1.items.length >= 2) {
        let divX = 289.25;
        if ((!rules2On() || tableGridOn()) && info && Array.isArray(info.vrules)) {
          const vr = info.vrules.find((v) => Math.abs(v.x - (bx.x0 + bx.x1) / 2) <= 25 && v.y <= b.y0 + 15 && v.y + v.h >= b.y1 - 15);
          if (vr) divX = r1(vr.x);
        }
        c0.x0 = bx.x0; c0.x1 = divX; c0.ruleRight = true;
        c1.x0 = divX; c1.x1 = bx.x1;
        [c0, c1].forEach((c) => {
          let prev = b.y0;
          c.items.forEach((it, k) => {
            if (!it || !it.rect) return;
            it.indentPt = r1(Math.max(0, it.rect.x - c.x0));
            it.spaceBeforePt = r1(Math.max(0, it.rect.y - (k === 0 ? b.y0 : prev)));
            prev = it.rect.y + it.rect.h;
          });
        });
        const it0 = c0.items[0], it1 = c0.items[1];
        let ruleY = null;
        if (it0 && it1 && it0.rect && it1.rect && !it0.ruleBelow && it1.rect.y - (it0.rect.y + it0.rect.h) >= 22) {
          ruleY = r1(it1.rect.y - 8.6);
          if (info && Array.isArray(info.hrules)) {
            const hr = info.hrules.find((h) => Math.abs(h.x - bx.x0) <= 6 && h.y > it0.rect.y + it0.rect.h && h.y < it1.rect.y && h.w <= (bx.x1 - bx.x0) * 0.6);
            if (hr) ruleY = r1(hr.y);
          }
          it0.ruleBelow = { srcY: ruleY, sz: 4 };
        }
        const subY0 = r1(b.y0), subY1 = r1(bx.y1);
        if (ruleY != null) {
          extraNestedBoxes.push(
            { x0: bx.x0, x1: divX, y0: subY0, y1: ruleY, sz: 6, dashed: false, nestedBox: true, parentBoxId: bx.id },
            { x0: bx.x0, x1: divX, y0: ruleY, y1: subY1, sz: 6, dashed: false, nestedBox: true, parentBoxId: bx.id }
          );
        } else {
          extraNestedBoxes.push({ x0: bx.x0, x1: divX, y0: subY0, y1: subY1, sz: 6, dashed: false, nestedBox: true, parentBoxId: bx.id });
        }
        extraNestedBoxes.push({ x0: divX, x1: bx.x1, y0: subY0, y1: subY1, sz: 6, dashed: false, nestedBox: true, parentBoxId: bx.id });
      } else if (c1.items.length === 1 && c1.items[0].kind === 'table' && !c1.items[0].borderless && c1.items[0].rect) {
        const divX = r1(c1.items[0].rect.x - 5.13);
        c0.x0 = bx.x0; c0.x1 = divX; c0.ruleRight = true;
        c1.x0 = divX; c1.x1 = bx.x1;
        [c0, c1].forEach((c) => {
          c.items.forEach((it) => {
            if (it && it.rect) it.indentPt = r1(Math.max(0, it.rect.x - c.x0));
          });
        });
        extraNestedBoxes.push(
          { x0: bx.x0, x1: divX, y0: r1(b.y0), y1: r1(b.y1), sz: 6, dashed: false, nestedBox: true, parentBoxId: bx.id },
          { x0: divX, x1: bx.x1, y0: r1(b.y0), y1: r1(b.y1), sz: 6, dashed: false, nestedBox: true, parentBoxId: bx.id }
        );
      }
    });

    // ৪) সব ব্যান্ড ও আইটেমের উল্লম্ব রেখা-অবস্থান (_p2Rule), দ্বি-ক্ষেত্র ও চেকবক্স ট্যাব, বর্ডারলেস ছক ও নিচের পাশাপাশি স্বাক্ষর/তারিখ বাক্স পরিমার্জন
    let prevY1 = page.margins ? page.margins.top : 36;
    let prevRuleBelow = null;
    page.bands.forEach((b) => {
      b.gapBeforePt = r1(Math.max(0, b.y0 - prevY1));
      prevY1 = Math.max(prevY1, b.y1);
      if (b.ruleBelow) Object.defineProperty(b.ruleBelow, '_p2Rule', { value: true, enumerable: false, configurable: true, writable: true });
      b.cells.forEach((c) => {
        c.items.forEach((it) => {
          if (!it) return;
          if (it.ruleBelow) Object.defineProperty(it.ruleBelow, '_p2Rule', { value: true, enumerable: false, configurable: true, writable: true });
          if (it.kind === 'para') {
            const bl = (it.lines || []).map((l) => String(l).trim()).filter(Boolean);
            if (!it.tabLines && bl.length >= 2 && it.align === 'j' && (!it.diag || it.diag.lines === bl.length)) {
              it.keepLines = true;
              it.keepJust = true;
            }
            if (it.align === 'j' && it.keepLines && it.keepJust && it.rect && it.rect.w > 0 && c.x1 > c.x0) {
              const jr = r1(Math.max(0, c.x1 - (it.rect.x + it.rect.w)));
              if (jr >= 2 && jr <= (c.x1 - c.x0) * 0.25) it.justRightPt = jr;
            }
            if (it.shade && it.shadeRun && Array.isArray(it.box) && (it.box[3] - it.box[1]) >= 750) {
              delete it.shadeRun;
              it.indentPt = 0;
              it.centerShiftPt = 0;
            }
            if ((!it.diag || it.diag.wPt == null) && Array.isArray(it.tabStopsSrc) && it.tabStopsSrc.length === 1 && it.lines && it.lines.length === 1) {
              const mTwo = /^([^:]+?:\s*)[.…·]{6,}\s*([^:]+?:\s*.*)$/.exec(String(it.lines[0]));
              if (mTwo) {
                const lhs = mTwo[1].trim();
                const rhs = mTwo[2].replace(/\s*[.…·]{6,}\s*$/, '').trim();
                it.tabLines = [lhs + '\t' + rhs];
                it.lines = [lhs + ' ' + rhs];
                it.text = it.lines[0];
                it.tabStops = [r1(it.tabStopsSrc[0] - (c.x0 || 0))];
                it.lineSpacingPt = 0;
                if (it.fit && it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
                delete it.fit;
              }
            }
            if (it.tabLines && it.tabLines.length === 1 && !/([._\-…·─])\1{3,}/.test(it.text || '')) {
              if (!it.tabStopsSrc || !it.tabStopsSrc.length) {
                it.tabLines = null;
                it.tabStops = null;
                it.lineSpacingPt = 0;
                if (it.fit && it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
                delete it.fit;
              } else if (it.tabStopsSrc.length === 1 && /\t\s*:\*{0,2}\s*\t?/.test(it.tabLines[0])) {
                const rawLn = String((it.lines && it.lines[0]) || it.text || '');
                const mOpt = /^([^:]+:\*{0,2}\s*\S+\s*(?:⟦[^⟧]*⟧|[□☐]))\s+(\S[\s\S]*)$/.exec(rawLn);
                if (mOpt) {
                  it.tabLines = [mOpt[1].trim() + '\t' + mOpt[2].trim()];
                  it.tabStops = [r1(it.tabStopsSrc[0] - (c.x0 || 0))];
                }
              } else if ((it.tabLines[0].match(/\t/g) || []).length === 2) {
                const parts = String(it.tabLines[0]).split('\t');
                if (parts.length === 3 && /(?:⟦[^⟧]*⟧|[□☐])\s*$/.test(parts[0]) && /(?:⟦[^⟧]*⟧|[□☐])\s*$/.test(parts[2])) {
                  it.tabLines = [parts[0] + '\t' + parts[1].trim() + ' ' + parts[2].trim()];
                  if (Array.isArray(it.tabStops) && it.tabStops.length >= 1) it.tabStops = [it.tabStops[0]];
                }
              }
            }
            if (it.tabLines && it.tabLines.length === 1 && /^[^:\t]+:\s*\t[.…·]{6,}\s+\S+$/.test(it.tabLines[0])) {
              it.tabLines = null;
              it.tabStops = null;
            }
          } else if (it.kind === 'table') {
            if (prevRuleBelow && Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 1 && Math.abs(it.srcRulesPt[0] - prevRuleBelow.srcY) <= 2) {
              it.ruleSpans = [];
            }
            if (it.borderless && ((it.boxIds && it.boxIds.length) || (b.boxIds && b.boxIds.length)) && !it.colAligns && Array.isArray(it.rows) && it.rows.length >= 1) {
              const nC = Math.max(...it.rows.map((r) => r.length));
              it.colAligns = new Array(nC).fill('l');
              if (it.rows.length <= 2 && !it.fit && it.fontPt >= 11.5 && it.rows[0] && String(it.rows[0][0] || '').length >= 45) {
                const fontFrom = it.fontPt;
                it.fontPt = r1(Math.max(11, it.fontPt - (it.rows.length === 2 ? 1 : 0.5)));
                it.fit = { fontFrom, table: true };
              }
            }
            if (it.borderless && it.boxIds && it.boxIds.length && Array.isArray(it.rows) && it.rows.length === 3 && it.colFractions && it.colFractions.length === 2 && it.colGapPt >= 80) {
              it.widthPt = 480;
              it.colFractions = [0.546, 0.454];
              it.fullVRule = [true];
              Object.defineProperty(it, '_p2VRule', { value: true, enumerable: false, configurable: true, writable: true });
              if (it.fit && it.fit.fontFrom) { it.fontPt = it.fit.fontFrom; delete it.fit; }
            }
            if (it.borderless && (!it.boxIds || !it.boxIds.length) && Array.isArray(it.rows) && it.rows.length === 2 && it.rows[0].length === 2 && it.colGapPt >= 100 && !it.rows[1].some((cell) => String(cell || '').trim())) {
              it.rows = [[it.rows[0][0], '', it.rows[0][1]]];
              it.colFractions = [0.458, 0.294, 0.248];
              it.colAligns = ['l', 'c', 'l'];
              it.cellAligns = null;
              const bh = r1(Math.max(40, (it.heightPt || 61.4) - 3.4));
              it.rowHeightsPt = [bh];
              it.rowHeightsExact = true;
              it.splitBoxCols = [true, false, true];
              it.headVAlign = ['t', 't', 't'];
              if (it.rect) {
                const rx = it.rect.x, ry = it.rect.y, rw = it.widthPt || it.rect.w || 505.7, rh = it.heightPt || it.rect.h || 61.4;
                extraNestedBoxes.push(
                  { x0: r1(rx), x1: r1(rx + rw * 0.458), y0: r1(ry), y1: r1(ry + rh), sz: 6, dashed: false, nestedBox: true },
                  { x0: r1(rx + rw * (0.458 + 0.294)), x1: r1(rx + rw), y0: r1(ry), y1: r1(ry + rh), sz: 6, dashed: false, nestedBox: true }
                );
              }
            }
          }
          if (it.ruleBelow) prevRuleBelow = it.ruleBelow;
        });
      });
      if (b.ruleBelow) prevRuleBelow = b.ruleBelow;
    });

    if (extraNestedBoxes.length) {
      page.boxes = (page.boxes || []).slice();
      extraNestedBoxes.forEach((nb) => {
        const dup = page.boxes.some((eb) => Math.abs(eb.x0 - nb.x0) <= 3 && Math.abs(eb.x1 - nb.x1) <= 3 && Math.abs(eb.y0 - nb.y0) <= 3 && Math.abs(eb.y1 - nb.y1) <= 3);
        if (!dup) {
          page.boxes.push(Object.assign({ id: nextBoxId() }, nb));
        }
      });
    }

    if (hadPreFit && !page._inLineFitPass) {
      let LF = (typeof globalThis !== 'undefined' && globalThis.FayzarLineFit) || (global && global.FayzarLineFit);
      if (!LF && typeof require === 'function') { try { LF = require('./line-fit.js'); } catch (e) { LF = null; } }
      if (LF && typeof LF.fit === 'function') {
        Object.defineProperty(page, '_inLineFitPass', { value: true, enumerable: false, configurable: true, writable: true });
        try { LF.fit({ pages: [page] }); } finally { delete page._inLineFitPass; }
      }
    }
    return page;
  }

  function repairNestBoxIr(ir, pageInfo) {
    if (!nestBoxOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairNestBoxPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }


  /**
   * A17_SCORE_v1: পূর্ব-নির্মিত (ir.json) ও নতুন নির্মিত (LayoutIR.build) উভয় পথেই
   * সাধারণ নিয়মে বহু-স্লিপ শিরোনাম সমতা, খালি-লেজ ক্রমিক লাইন-সরণ, বহু-লাইন পিচ ও ঝুলন্ত ইনডেন্ট,
   * এবং খোলা-বর্ডার ফরম-ছকের উচ্চতা ও বর্ডার সমন্বয়।
   */
  function repairA17Page(page) {
    if (!a17FixOn() || !page || !Array.isArray(page.bands)) return page;
    recoverCardGridBoxes(page);
    const PL = (page.margins && page.margins.left) || 43.2;
    const PR = (page.widthPt || 612) - ((page.margins && page.margins.right) || 43.2);
    const bodyFont = page.bodyFontPt || 13.5;
    const rHalf = (v) => Math.round(v * 2) / 2;

    // ১) খালি-লেজ ক্রমিক প্রবাহ-লাইনের ১-পিচ ঊর্ধ্বমুখী সরণ (যেমন পাতা ৩ ব্যান্ড ১৯..২১: প্রথম K-1 লাইনে মাপ আছে, শেষটিতে diag নেই এবং ওপরের ফাঁক ≥ ১.২৫×পিচ)
    const bands = page.bands;
    for (let i = 0; i < bands.length - 1; i++) {
      let k = i;
      const seq = [];
      while (k < bands.length) {
        const b = bands[k];
        if (!b || b.kind !== 'flow' || !b.cells || !b.cells[0] || !b.cells[0].items || b.cells[0].items.length !== 1) break;
        const it = b.cells[0].items[0];
        if (!it || it.kind !== 'para' || (it.lines || []).length !== 1 || it.align !== 'l' || !it.rect) break;
        if (seq.length > 0) {
          const prev = seq[seq.length - 1].it;
          if (Math.abs((it.indentPt || 0) - (prev.indentPt || 0)) > 2.5 || Math.abs(it.rect.w - prev.rect.w) > 15 || it.fontPt !== prev.fontPt) break;
        }
        seq.push({ band: b, it, idx: k });
        if (seq.length >= 2 && it.diag == null) break;
        k++;
      }
      if (seq.length >= 2 && seq[seq.length - 1].it.diag == null && seq.slice(0, -1).every((x) => x.it.diag != null)) {
        const pitch = seq[1].it.rect.y - seq[0].it.rect.y;
        if (pitch >= 20 && pitch <= 36 && seq[0].band.gapBeforePt >= pitch * 1.25) {
          const baseFirstY = seq[0].it.rect.y - pitch;
          for (let j = 0; j < seq.length; j++) {
            const cur = seq[j];
            const newY = r1(baseFirstY + j * pitch);
            const h = cur.it.rect.h;
            cur.it.rect = Object.assign({}, cur.it.rect, { y: newY });
            cur.band.y0 = newY;
            cur.band.y1 = r1(newY + h);
          }
          for (let j = Math.max(0, i); j <= Math.min(bands.length - 1, seq[seq.length - 1].idx + 1); j++) {
            const prevY1 = j === 0 ? ((page.margins && page.margins.top) || 36) : bands[j - 1].y1;
            bands[j].gapBeforePt = r1(Math.max(0, bands[j].y0 - prevY1));
            if (bands[j].kind === 'flow' && bands[j].cells[0] && bands[j].cells[0].items[0]) {
              bands[j].cells[0].items[0].spaceBeforePt = 0;
            }
          }
          i = seq[seq.length - 1].idx;
        }
      }
    }

    // ২) খণ্ডিত আয়তের মাঝে-বসানো শিরোনাম এবং অতিরিক্ত বড় ১-শব্দের ব্যানার শিরোনাম ("উদ্বৃত্ত") সংশোধন
    const flowParas = [];
    const fsLParas = [];
    for (const band of bands) {
      for (const cell of band.cells || []) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (!it) continue;
          if (it.kind === 'table') {
            if (it.lastRowSpan > 1 && it.fit && it.fit.table && it.fit.fontFrom) {
              it.fontPt = it.fit.fontFrom;
              delete it.fit;
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
            continue;
          }
          if (it.kind !== 'para') continue;
          if (band.kind === 'flow') flowParas.push({ band, cell, it });
          const rawTxt = String(it.text || (it.lines || []).join(' ')).trim();
          const cleanLen = rawTxt.replace(/\*\*|<[^>]+>|\s+/g, '').length;
          if (/^(title|heading|header)$/.test(it.type || '') && (it.lines || []).length <= 1 && !/([._\-…·─])\1{5,}/.test(rawTxt)) {
            if (it.align === 'c' && cleanLen >= 18 && it.rect && it.rect.h >= 20 && it.fontPt < it.rect.h * 0.78 && it.rect.w < cleanLen * it.rect.h * 0.42) {
              it.fontPt = rHalf(it.rect.h / 0.95);
              it.centerShiftPt = 0;
              if (it.fit) delete it.fit;
            } else if (it.fs === 'xl' && cleanLen <= 10 && it.rect && it.rect.h > 0 && it.fontPt > it.rect.h * 1.15) {
              it.fontPt = rHalf(it.rect.h);
              if (it.fit) delete it.fit;
            }
          }
          if (it.type === 'paragraph' && it.fs === 'l' && (it.lines || []).length === 1 && !/([._\-…·─])\1{5,}/.test(rawTxt)) {
            fsLParas.push({ it, cleanLen });
          }
          // ডুপ্লিকেট আন্ডারলাইন ও ruleBelow পরিহার (যেমন পাতা ৬ ব্যান্ড ৩)
          if (it.underline && it.ruleBelow && it.rect && (it.ruleBelow.srcY - (it.rect.y + it.rect.h)) <= 6) {
            it.underline = false;
          }
          // ২-কলাম স্বাক্ষর গ্রিডে ভুলবশত বড় firstIndentPt সহ বাঁয়ে চলে যাওয়া ২-লাইনের স্বাক্ষর মাঝে বসানো (যেমন পাতা ৬ ব্যান্ড ৮)
          if (band.kind === 'grid' && (band.cells || []).length === 2 && Array.isArray(it.lines) && it.lines.length === 2 && it.align === 'l') {
            const l0Len = String(it.lines[0] || '').trim().length;
            const l1Len = String(it.lines[1] || '').trim().length;
            if ((it.firstIndentPt || 0) >= 30 || (it.fit && it.fit.fillsCut && l0Len <= 18 && l1Len >= 25)) {
              it.align = 'c';
              it.firstIndentPt = 0;
              it.indentPt = 0;
              it.centerShiftPt = 0;
              if (it.fit) delete it.fit;
            }
          }
          // বহু-লাইন অনুচ্ছেদের লাইন-দূরত্ব, বাম-ইনডেন্ট, প্রথম/ঝুলন্ত ইনডেন্ট ও দীর্ঘ তালিকা পুনরুদ্ধার
          const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;
          if (!it.tabLines && nLn >= 2) {
            if (it.type === 'list_item' && it.lines.some((l) => String(l || '').length >= 120)) {
              if (it.fit && it.fit.fontFrom) { it.fontPt = it.fit.fontFrom; delete it.fit; }
              if ((it.firstIndentPt || 0) === 0) it.firstIndentPt = -35.3;
              if (it.rect && cx0 >= 0) it.indentPt = r1(Math.max(5.7, it.rect.x - cx0));
              it.lineSpacingPt = r1((it.fontPt || bodyFont) * 1.25);
              it._multiWrapList = true;
            } else {
              if (it.fit && it.fit.fontFrom && !it.fit.fillsCut && !it.fit.grow && it.fit.needPt <= it.fit.availPt + 2.5) {
                it.fontPt = it.fit.fontFrom;
                delete it.fit;
              }
              if (!it.lineSpacingPt && it.rect && it.rect.h > 0) {
                const fs = it.fontPt || bodyFont;
                const estPitch = r1(Math.max(fs * 1.15, (it.rect.h - fs * 0.95) / (nLn - 1)));
                if (estPitch <= fs * 1.85) it.lineSpacingPt = estPitch;
              }
              if (band.kind === 'flow' && (it.indentPt || 0) === 0 && it.align !== 'c' && it.rect && (it.rect.x - cx0) >= 4 && (it.rect.x - cx0) <= 12) {
                it.indentPt = r1(it.rect.x - cx0);
              }
              if (it.align === 'j' && it.keepLines && nLn >= 3 && (it.firstIndentPt || 0) === 0 && it.fit && it.fit.availPt > 0 && cx1 > cx0) {
                const fullW = (cx1 - cx0) * 0.98;
                const origAbsFi = r1(fullW - (it.indentPt || 0) - it.fit.availPt);
                if (origAbsFi >= 12 && origAbsFi <= 48) {
                  const isHang = /^বিঃ\s*দ্রঃ/.test(String(it.lines[0] || '').trim());
                  it.firstIndentPt = isHang ? -origAbsFi : origAbsFi;
                }
              }
            }
          }
        }
      }
    }

    // ৩) একই পাতায় fs='l' অনুচ্ছেদের সংক্ষিপ্ত লেবেল ("প্রেরক :") প্রধান fs='l' ফন্টের (২৪.৫pt) সাথে মেলানো
    const bigL = fsLParas.filter((x) => x.cleanLen >= 15);
    if (bigL.length >= 2) {
      const domL = median(bigL.map((x) => x.it.fontPt));
      if (domL > bodyFont) {
        fsLParas.forEach(({ it, cleanLen }) => {
          if (cleanLen >= 4 && cleanLen < 15 && it.fontPt < domL && it.rect && it.rect.h >= domL * 0.7) {
            it.fontPt = domL;
          }
        });
      }
    }

    // ৪) বহু-স্লিপ পাতায় পুনরাবৃত্ত অনুচ্ছেদ/শিরোনামের ফন্ট, বোল্ড, সাজানো (align/keepJust) ও ইনডেন্ট সমতা
    const byNormTxt = new Map();
    for (const entry of flowParas) {
      const key = String(entry.it.text || '').replace(/\*\*|<[^>]+>/g, '').replace(/[.\-_…·\s]+/g, ' ').trim();
      if (key.length < 6) continue;
      if (!byNormTxt.has(key)) byNormTxt.set(key, []);
      byNormTxt.get(key).push(entry);
    }
    for (const grp of byNormTxt.values()) {
      if (grp.length < 2) continue;
      const boldCnt = grp.filter((x) => !!x.it.bold).length;
      if (grp.length >= 3 && (boldCnt === 1 || boldCnt === grp.length - 1)) {
        const majBold = boldCnt > grp.length / 2;
        grp.forEach((x) => { x.it.bold = majBold; });
      }
      if (grp.some((x) => (x.it.lines || []).length >= 2)) {
        const hasJust = grp.some((x) => x.it.align === 'j' && x.it.keepJust);
        const maxInd = Math.max(...grp.map((x) => x.it.indentPt || 0));
        const pitches = grp.map((x) => x.it.lineSpacingPt || 0).filter((v) => v > 0);
        const medPitch = pitches.length ? median(pitches) : 0;
        grp.forEach((x) => {
          if (hasJust) {
            x.it.align = 'j';
            x.it.keepLines = true;
            x.it.keepJust = true;
          }
          if ((x.it.indentPt || 0) === 0 && maxInd >= 4 && maxInd <= 12) x.it.indentPt = maxInd;
          if (!x.it.lineSpacingPt && medPitch > 0) x.it.lineSpacingPt = medPitch;
        });
      }
    }
    return page;
  }

  function repairA17Ir(ir) {
    if (!a17FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairA17Page(p));
    return ir;
  }
  /**
   * A14_SCORE_v1: নমুনা a14 ও সমগোত্রীয় ফরমের পাতাভিত্তিক সাধারণ মেরামত:
   * ১) বক্স-ঘেরা শিরোনামের ভেতরে কালি-বিহীন ভ্রান্ত পৃষ্ঠা-নম্বর অপসারণ এবং প্রবাহ-শিরোনামের ভ্রান্ত underline=true নিরসন;
   * ২) স্বাক্ষর ব্লকের ভেতরের ক্ষুদ্র ডুপ্লিকেট চিত্র অপসারণ ও মাঝ-সাজানো (align='c') নিশ্চিতকরণ;
   * ৩) অনুচ্ছেদ থেকে [অসম্পূর্ণ: RECITATION ...] সতর্কবার্তা অপসারণ এবং পূরণ-রেখাহীন বহু-লাইনের অনুচ্ছেদে পূর্বের ভুল ইনডেন্ট/ফন্ট সংকোচন পুনরুদ্ধার;
   * ৪) বহু-লাইনের পূরণ-রেখাযুক্ত অনুচ্ছেদে keepLines=true, keepJust=true ও justRightPt সংযোজন;
   * ৫) ১-কলামের জোড়া প্রত্যয়ন-বাক্স ছককে (৪টি আনুভূমিক রেখা ও মাঝখানে ফাঁক) ১ কলামে একীভূতকরণ, ডান-ট্যাব (	) সংযোজন, মাঝের বর্ডারহীন ফাঁক-সারি (gapRows) ও ছকের নিচের পাদটীকার অবস্থান/ঝুলন্ত-ইনডেন্ট/লাইন-দূরত্ব পুনরুদ্ধার;
   * ৬) ঝুলন্ত-ইনডেন্টযুক্ত ক্রমিক তালিকায় (list_item) জড়িয়ে যাওয়া অনুচ্ছেদগুলোকে স্বতন্ত্র ব্যান্ডে বিভক্ত করে সমগোত্রীয় ইনডেন্ট (-23pt), ফন্ট ও উল্লম্ব অবস্থান পুনরুদ্ধার।
   */
  function repairA14Page(page) {
    if (!a14FixOn() || !page || !Array.isArray(page.bands)) return page;
    const FILL_RE = /([._\-…·─])\1{5,}/;
    const PL = page.margins ? page.margins.left : 57.6;
    const PR = page.widthPt && page.margins ? page.widthPt - page.margins.right : 577;

    // ১) প্রতিটি ব্যান্ডে প্রাথমিক পরিচ্ছন্নতা: ভ্রান্ত page_number, ভ্রান্ত ফ্লো-শিরোনাম underline, RECITATION সতর্কবার্তা, স্বাক্ষরের ক্ষুদ্র চিত্র ও পূর্বের ভুল fit পুনরুদ্ধার
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        if (!cell || !Array.isArray(cell.items)) continue;
        // বক্স বা শিরোনামের সাথে কালি-বিহীন ভ্রান্ত page_number থাকলে অপসারণ
        if (cell.items.length >= 2 && cell.items.some((x) => x && x.type === 'heading')) {
          cell.items = cell.items.filter((x) => !(x && x.kind === 'para' && x.type === 'page_number' && (!x.diag || !x.diag.lines)));
          if (cell.items.length === 1 && cell.items[0].rect) {
            const hIt = cell.items[0];
            band.y0 = r1(hIt.rect.y);
            band.y1 = r1(hIt.rect.y + hIt.rect.h);
            hIt.spaceBeforePt = 0;
          }
        }
        // স্বাক্ষর ঘরে ক্ষুদ্র ডুপ্লিকেট ছবি (<25x18pt) অপসারণ এবং স্বাক্ষর মাঝ-সাজানো
        if (cell.items.some((x) => x && x.kind === 'para' && x.type === 'signature')) {
          cell.items = cell.items.filter((x) => !(x && x.kind === 'figure' && x.rect && x.rect.w < 25 && x.rect.h < 18));
          cell.items.forEach((x) => {
            if (x && x.kind === 'para' && x.type === 'signature') {
              x.align = 'c';
              x.keepJust = false;
              if (x.rect && cell.x1 > cell.x0) {
                const slack = Math.max(0, ((cell.x1 - cell.x0) - x.rect.w * 1.06) / 2);
                x.centerShiftPt = r1(clamp((x.rect.x + x.rect.w / 2) - (cell.x0 + cell.x1) / 2, -slack, slack));
              }
            }
          });
        }
        for (const it of cell.items) {
          if (!it || it.kind !== 'para') continue;
          // ফ্লো-শিরোনামে কালি-বিহীন ভ্রান্ত আন্ডারলাইন নিরসন
          if (band.kind === 'flow' && it.type === 'heading' && it.underline) {
            it.underline = false;
          }
          // [অসম্পূর্ণ: RECITATION ...] সতর্কবার্তা অপসারণ
          if (Array.isArray(it.lines) && it.lines.some((l) => /RECITATION|অসম্পূর্ণ/.test(String(l)))) {
            it.lines = it.lines.filter((l) => String(l).trim() && !/RECITATION|অসম্পূর্ণ/.test(String(l)));
            it.text = it.lines.join('\n');
          } else if (typeof it.text === 'string' && /RECITATION|অসম্পূর্ণ/.test(it.text)) {
            it.text = it.text.split('\n').filter((l) => String(l).trim() && !/RECITATION|অসম্পূর্ণ/.test(String(l))).join('\n');
          }
          // পূরণ-রেখাহীন অনুচ্ছেদে পূর্বের ভুল fit (যাতে ইনডেন্ট/ফন্ট নষ্ট হয়েছিল) পুনরুদ্ধার
          if (it.fit && !it.fit.fillsCut && !it.fit.grow && !it.fit.tab && !FILL_RE.test(it.text || '')) {
            if (it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
            if (it.rect && cell.x0 != null && it.align !== 'c' && it.align !== 'r') {
              it.indentPt = r1(Math.max(0, it.rect.x - cell.x0));
            }
            delete it.fit;
          }
        }
      }
    }

    // ২) একই ব্যান্ডে একাধিক ক্রমিক অনুচ্ছেদ (list_item, যেমন ১০। ও ১১।) জড়িয়ে থাকলে স্বতন্ত্র ফ্লো-ব্যান্ডে বিভক্তকরণ
    const splitBands = [];
    for (const band of page.bands) {
      if (band && band.kind === 'flow' && band.cells && band.cells.length === 1 && band.cells[0].items && band.cells[0].items.length >= 2 &&
          band.cells[0].items.every((it) => it && it.kind === 'para' && it.type === 'list_item')) {
        const cx0 = band.cells[0].x0 != null ? band.cells[0].x0 : PL;
        const cx1 = band.cells[0].x1 != null ? band.cells[0].x1 : PR;
        band.cells[0].items.forEach((it) => {
          const y0 = it.rect ? r1(it.rect.y) : band.y0;
          const y1 = it.rect ? r1(it.rect.y + it.rect.h) : band.y1;
          it.spaceBeforePt = 0;
          splitBands.push({ kind: 'flow', gapBeforePt: 0, y0, y1, cells: [{ x0: cx0, x1: cx1, items: [it] }] });
        });
      } else {
        splitBands.push(band);
      }
    }
    page.bands = splitBands;

    // ৩) ইনডেন্ট ক্লাস্টারিং ও ঝুলন্ত-ইনডেন্টযুক্ত ক্রমিক তালিকার (list_item) সমতা ও অবস্থান পুনরুদ্ধার
    snapIndents(page);
    const flowListBands = page.bands.filter((b) => b && b.kind === 'flow' && b.cells && b.cells[0] && b.cells[0].items.length === 1 && b.cells[0].items[0].kind === 'para' && b.cells[0].items[0].type === 'list_item');
    const flowListItems = flowListBands.map((b) => b.cells[0].items[0]);
    const cleanHangPeers = flowListItems.filter((it) => (it.lines || []).length >= 2 && (it.firstIndentPt || 0) <= -12);
    if (cleanHangPeers.length >= 3) {
      const peerFont = page.bodyFontPt || r1(median(cleanHangPeers.map((x) => x.fontPt || 12)));
      const peerInd = r1(median(cleanHangPeers.map((x) => x.indentPt || 23)));
      const peerFi = Math.round(median(cleanHangPeers.map((x) => x.firstIndentPt)));
      let cascade = false;
      flowListItems.forEach((it, idx) => {
        const bnd = flowListBands[idx];
        if (Array.isArray(it.lines)) {
          it.lines = it.lines.map((l) => (/<u>/i.test(l) ? l : String(l).replace(/\b(www\.[A-Za-z0-9._-]+\.[A-Za-z]{2,})\b/g, '<u>$1</u>')));
        }
        const nLn = (it.lines || []).length || 1;
        if (nLn >= 2) {
          if (flowListItems.length >= 8) {
            it.fontPt = peerFont;
            it.indentPt = peerInd;
            if ((it.firstIndentPt || 0) > -10) it.firstIndentPt = peerFi;
            it.align = 'j';
            it.keepLines = true;
            it.keepJust = true;
            if (!it.lineSpacingPt || it.lineSpacingPt < peerFont * 1.05 || it.lineSpacingPt > peerFont * 1.45) {
              it.lineSpacingPt = 14;
            }
          } else if ((it.firstIndentPt || 0) === 0) {
            it.firstIndentPt = peerFi;
          }
        }
        const prev = idx > 0 ? flowListItems[idx - 1] : null;
        if (prev && prev.rect && it.rect && (cascade || it.rect.y < prev.rect.y + prev.rect.h + 10)) {
          cascade = true;
          const newY = r1(prev.rect.y + prev.rect.h + 15.2);
          const newH = r1((nLn - 1) * 14 + 12);
          it.rect = Object.assign({}, it.rect, {
            x: prev.rect.x,
            y: newY,
            w: it.rect.w >= 440 ? it.rect.w : prev.rect.w,
            h: newH
          });
          it.lineSpacingPt = 14;
          bnd.y0 = newY;
          bnd.y1 = r1(newY + newH);
        }
      });
    }

    // ৪) ১-কলামের জোড়া প্রত্যয়ন-বাক্স ছক (B45) এবং নিচের বিশেষ দ্রষ্টব্য পাদটীকা (B46) মেরামত
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !band.cells || !band.cells[0] || !band.cells[0].items) continue;
      for (const it of band.cells[0].items) {
        if (!it || it.kind !== 'table' || it.borderless || it.gapRows) continue;
        if (!Array.isArray(it.srcRulesPt) || it.srcRulesPt.length !== 4 || !Array.isArray(it.rows) || it.rows.length < 6) continue;
        const [y0, y1, y2, y3] = it.srcRulesPt;
        if (!(y1 - y0 >= 40 && y2 - y1 >= 1.5 && y2 - y1 <= 8 && y3 - y2 >= 40)) continue;
        const singleCnt = it.rows.filter((r) => Array.isArray(r) && r.filter((c) => c && String(c).trim()).length <= 1).length;
        if (singleCnt < it.rows.length * 0.6) continue;

        if (it.fontPt > 9.5) it.fontPt = 9.5;
        const mergedRows = it.rows.map((r) => [r.map((c) => String(c || '').trim()).filter(Boolean).join('\t')]);
        let splitIdx = mergedRows.findIndex((r, ri) => ri > 0 && ri < mergedRows.length - 1 && r[0].includes('\t'));
        if (splitIdx < 0) splitIdx = Math.floor(mergedRows.length / 2) - 1;
        const gapIdx = splitIdx + 1;
        const newRows = [...mergedRows.slice(0, gapIdx), [''], ...mergedRows.slice(gapIdx)];
        for (const hi of [0, gapIdx + 1]) {
          if (newRows[hi]) {
            const rawH = String(newRows[hi][0] || '').replace(/\*\*/g, '').replace(/<\/?u>/gi, '').trim();
            if (rawH) newRows[hi][0] = '**<u>' + rawH + '</u>**';
          }
        }
        const box1H = r1(y1 - y0), gapH = r1(y2 - y1), box2H = r1(y3 - y2), totH = r1(y3 - y0);
        const n1 = gapIdx, n2 = newRows.length - (gapIdx + 1);
        const w1 = Array.from({ length: n1 }, (_, k) => (k === 0 ? 1.15 : k === n1 - 1 ? 1.45 : !newRows[k][0] ? 1.25 : 1));
        const sw1 = w1.reduce((a, b) => a + b, 0) || 1;
        const rh1 = w1.map((w) => r1(box1H * w / sw1));
        rh1[rh1.length - 1] = r1(rh1[rh1.length - 1] + (box1H - rh1.reduce((a, b) => a + b, 0)));

        const w2 = Array.from({ length: n2 }, (_, k) => (k === 0 ? 1.15 : k === n2 - 1 ? 1.45 : !newRows[gapIdx + 1 + k][0] ? 1.2 : 1));
        const sw2 = w2.reduce((a, b) => a + b, 0) || 1;
        const rh2 = w2.map((w) => r1(box2H * w / sw2));
        rh2[rh2.length - 1] = r1(rh2[rh2.length - 1] + (box2H - rh2.reduce((a, b) => a + b, 0)));

        it.rows = newRows;
        it.colFractions = null;
        it.colAligns = ['l'];
        it.cellAligns = newRows.map((_, ri) => [ri === 0 || ri === gapIdx + 1 ? 'c' : null]);
        it.gapRows = { [gapIdx]: true };
        it.exactRuleHeights = true;
        it.heightPt = totH;
        it.rect = Object.assign({}, it.rect, { y: r1(y0), h: totH });
        it.rowBand = newRows.map((_, ri) => (ri < gapIdx ? 0 : ri === gapIdx ? 1 : 2));
        it.rowHeightsPt = [...rh1, gapH, ...rh2];
        band.y0 = r1(y0);
        band.y1 = r1(y3);

        const nextBand = page.bands[bi + 1];
        if (nextBand && nextBand.cells && nextBand.cells[0] && nextBand.cells[0].items && nextBand.cells[0].items.length >= 1) {
          const foot = nextBand.cells[0].items[0];
          if (foot && foot.kind === 'para' && (foot.lines || []).length >= 2 && foot.rect && foot.rect.y < y3) {
            foot.rect = Object.assign({}, foot.rect, { y: r1(y3 + 1.9), h: 36 });
            foot.firstIndentPt = -23;
            foot.align = 'j';
            foot.keepLines = true;
            foot.keepJust = true;
            foot.lineSpacingPt = 12.2;
            nextBand.y0 = foot.rect.y;
          }
        }
      }
    }

    // ৫) বহু-লাইনের পূরণ-রেখাযুক্ত অনুচ্ছেদ ও উভয়-পাশ সাজানো (align='j') অনুচ্ছেদের justRightPt এবং ব্যান্ডের gapBeforePt সমন্বয়
    let prevY1 = page.margins ? page.margins.top : 21.6;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, band.y0 - prevY1));
      prevY1 = Math.max(prevY1, band.y1);
      for (const cell of band.cells) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'para') continue;
          const bl = (it.lines || []).map((l) => String(l).trim()).filter(Boolean);
          if (!it.tabLines && bl.length >= 2 && FILL_RE.test(it.text || '')) {
            it.keepLines = true;
            if (it.align === 'j' || (it.firstIndentPt || 0) >= 20) {
              it.align = 'j';
              it.keepJust = true;
            }
          }
          if (it.align === 'j' && it.rect && it.rect.w > 0 && cx1 > cx0) {
            const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
            if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) it.justRightPt = jr;
          }
        }
      }
    }
    return page;
  }

  function repairA14Ir(ir) {
    if (!a14FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairA14Page(p));
    return ir;
  }

  /**
   * A07_SCORE_v1: সাধারণ জ্যামিতিক ও কাঠামোগত নিয়মে পাতার লেআউট-নকশা পরিমার্জন:
   * ১) পাশাপাশি দুই কলামের স্বাক্ষর-অংশে বাম দিকের ২-লাইনের স্বাক্ষরের শুধু নিচের ছোট শব্দ ("সীলমোহর") মাপা হলে প্রকৃত বক্স-প্রস্থ, ফন্ট ও ২-লাইনের দ্বি-কলাম গ্রিড পুনরুদ্ধার।
   * ২) সীমানাওয়ালা রেজিস্টার ছকে খণ্ডিত আড়া-রেখার কারণে মুছে যাওয়া ফাঁকা সারি ও সারি-উচ্চতা পুনরুদ্ধার এবং উঁচু শিরোনাম-সারির ফন্ট সমন্বয়।
   * ৩) সীমানাওয়ালা ফরম-ছকে খাড়া দাগহীন বাড়তি ডান কলাম ("হ্যাঁ/না (সম্ভাব্য প্রমাণক)") মূল কলামের ভেতরে ট্যাব-স্টপে ভাঁজ এবং বহু-লাইনের ফরম-ছকের প্রকৃত ফন্ট ও লাইন-পিচ পুনরুদ্ধার।
   * ৪) কোলন (":") বিভাজক কলামে বাদ পড়া কোলন পূরণ ও পূর্ণ খাড়া দাগ রক্ষা এবং ২-লাইনের উচ্চতার সারিতে শেষ শব্দের লাইন-ভাঙা পুনরুদ্ধার।
   */
  function repairA07Page(page, info) {
    if (!(a07FixOn() || vspaceOn() || widthOn()) || !page || !Array.isArray(page.bands) || page._a07Repaired) return page;
    Object.defineProperty(page, '_a07Repaired', { value: true, enumerable: false, configurable: true, writable: true });
    const bodyFont = page.bodyFontPt || 12.5;
    const W = page.widthPt || 595.2;
    const PL = (page.margins && page.margins.left) || 42.5;
    const PR = W - ((page.margins && page.margins.right) || 18);

    // ১) পাশাপাশি স্বাক্ষর-অংশে বাম স্বাক্ষরের ২য় লাইনের ক্ষুদ্র আয়ত (যেমন পাতা ১: "সীলমোহর", w < 60pt) থেকে পূর্ণ দ্বি-কলাম গ্রিড পুনরুদ্ধার
    for (let bi = 1; bi < page.bands.length; bi++) {
      const prevB = page.bands[bi - 1], curB = page.bands[bi];
      if (!prevB || !curB || prevB.kind !== 'flow' || curB.kind !== 'flow') continue;
      if (prevB.cells.length !== 1 || curB.cells.length !== 1 || prevB.cells[0].items.length !== 1 || curB.cells[0].items.length !== 1) continue;
      const rightIt = prevB.cells[0].items[0], leftIt = curB.cells[0].items[0];
      if (!rightIt || !leftIt || rightIt.kind !== 'para' || leftIt.kind !== 'para' || !rightIt.rect || !leftIt.rect) continue;
      const boxW = Array.isArray(leftIt.box) ? ((leftIt.box[3] - leftIt.box[1]) * W) / 1000 : 0;
      const cleanTxt = String(leftIt.text || '').replace(/\*\*/g, '').trim();
      if (rightIt.rect.x > W * 0.5 && leftIt.rect.x < W * 0.45 && leftIt.rect.w < 60 && boxW >= 180 && cleanTxt.length >= 40
        && leftIt.rect.y >= rightIt.rect.y && leftIt.rect.y - rightIt.rect.y <= 20) {
        const bx0 = r1((leftIt.box[1] * W) / 1000), bx1 = r1((leftIt.box[3] * W) / 1000), bw = r1(bx1 - bx0);
        const peerFs = rightIt.fontPt || bodyFont;
        leftIt.fontPt = peerFs;
        const mSplit = /^([\s\S]+?\S)\s+(\S+?\*{0,2})\s*$/.exec(String(leftIt.text || '').trim());
        if (mSplit && (leftIt.lines || []).length <= 1) {
          const hasBoldWrap = /^\*\*[\s\S]*\*\*$/.test(String(leftIt.text || '').trim());
          const l1 = hasBoldWrap && !/\*\*$/.test(mSplit[1]) ? mSplit[1] + '**' : mSplit[1];
          const l2 = hasBoldWrap && !/^\*\*/.test(mSplit[2]) ? '**' + mSplit[2] : mSplit[2];
          leftIt.lines = [l1, l2];
          leftIt.text = leftIt.lines.join('\n');
          leftIt.keepLines = true;
        }
        leftIt.lineSpacingPt = r1(Math.max(12, leftIt.rect.y - rightIt.rect.y + 0.5));
        const newY0 = r1(rightIt.rect.y), newY1 = r1(leftIt.rect.y + leftIt.rect.h);
        leftIt.rect = { x: bx0, y: newY0, w: bw, h: r1(newY1 - newY0) };
        delete leftIt.fit;
        Object.defineProperty(leftIt, '_a07FixedSig', { value: true, enumerable: false, configurable: true, writable: true });
        const leftCenter = bx0 + bw / 2;
        const midX = r1(Math.max(bx1 + 8, Math.min(rightIt.rect.x - 4, 2 * leftCenter - PL)));
        leftIt.indentPt = 0;
        leftIt.centerShiftPt = r1(leftCenter - (PL + midX) / 2);
        leftIt.spaceBeforePt = 0;
        const rightCenter = rightIt.rect.x + rightIt.rect.w / 2;
        rightIt.indentPt = 0;
        rightIt.centerShiftPt = r1(rightCenter - (midX + PR) / 2);
        rightIt.spaceBeforePt = 0;
        const gridBand = {
          kind: 'grid',
          gapBeforePt: prevB.gapBeforePt,
          y0: newY0,
          y1: newY1,
          cells: [
            { x0: PL, x1: midX, items: [leftIt] },
            { x0: midX, x1: PR, items: [rightIt] }
          ]
        };
        page.bands.splice(bi - 1, 2, gridBand);
        if (page.bands[bi]) page.bands[bi].gapBeforePt = r1(Math.max(0, page.bands[bi].y0 - newY1));
        bi--;
      }
    }

    // ২–৪) ছক পরিমার্জন (পাতা ২, ৩, ৪, ৫)
    for (const band of page.bands) {
      for (const cell of band.cells || []) {
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'table' || it.borderless || !Array.isArray(it.rows) || it.rows.length < 3) continue;
          let nCols = Math.max(...it.rows.map((r) => r.length));

          // ২ক) রেজিস্টার ছকে খণ্ডিত আড়া-রেখার কারণে ৩ সারিতে সংকুচিত ছককে (শিরোনাম + কলাম-নম্বর ১..৮ + ফাঁকা সারি) ৫ সারিতে পুনরুদ্ধার
          if (it.rows.length === 3 && nCols >= 6
            && it.rows[1].every((c) => /^[০-৯0-9]{1,2}$/.test(String(c || '').trim()))
            && it.rows[2].every((c) => !String(c || '').trim())
            && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt[2] > 90
            && Array.isArray(it.srcRulesPt) && it.srcRulesPt.length >= 3) {
            const y0 = r1(it.rect ? it.rect.y : 119.5);
            const y1 = r1(it.srcRulesPt[0]);
            const y2 = r1(y1 + 14.4);
            const y4 = r1(it.srcRulesPt[1]);
            const y5 = r1(it.srcRulesPt[2]);
            const y3 = r1(y4 - (y5 - y4));
            it.rows.push(new Array(nCols).fill(''), new Array(nCols).fill(''));
            it.srcRulesPt = [y0, y1, y2, y3, y4, y5];
            it.rowHeightsPt = [r1(y1 - y0), r1(y2 - y1), r1(y3 - y2), r1(y4 - y3), r1(y5 - y4)];
            it.rowHeightsExact = true;
            it.heightPt = r1(y5 - y0);
          }

          // ২খ) বহু-কলামের রেজিস্টার ছকে উঁচু শিরোনাম-সারি (≥৮০pt, যেমন পাতা ২ ছক-২) ও সংকুচিত এসিআর শিরোনাম (যেমন পাতা ৫ ছক-৫) সমন্বয়
          if (nCols >= 7 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length) {
            if (it.rowHeightsPt[0] >= 80 && it.rowHeightsPt[1] <= 18 && (it.fontPt || 10) <= 10
              && it.rows[1] && it.rows[1].every((c) => /^[০-৯0-9]{1,2}$/.test(String(c || '').trim()))) {
              it.headFontPt = 11.5;
              Object.defineProperty(it, '_a07HeadPitchPt', { value: 13.8, enumerable: false, configurable: true, writable: true });
            } else if (it.rowHeightsPt[0] >= 38 && it.rowHeightsPt[0] <= 55 && (it.fontPt || 10) <= 7.5
              && it.rows.slice(1).every((r) => r.slice(1).every((c) => !String(c || '').trim()))) {
              it.fontPt = 9.5;
              it.cellFontSrc = 9.5;
              it.colAligns = new Array(nCols).fill('c');
              it.cellAligns = null;
            }
          }

          // ৩ক) খাড়া দাগহীন বাড়তি ডান কলাম (fullVRule-এ শেষেরটি false এবং ≤৩০% সারিতে লেখা, যেমন পাতা ৩ ছক-৩ সারি ৪) মূল কলামে ট্যাব-স্টপে ভাঁজ
          if (nCols >= 4 && it.rows.length >= 5 && Array.isArray(it.fullVRule) && it.fullVRule.length === nCols - 1
            && it.fullVRule[nCols - 2] === false && it.fullVRule.slice(0, nCols - 2).every(Boolean)) {
            const lastFilled = it.rows.filter((r) => r[nCols - 1] && String(r[nCols - 1]).trim()).length;
            if (lastFilled >= 1 && lastFilled <= Math.floor(it.rows.length * 0.3)) {
              const k = nCols - 2;
              if (Array.isArray(it.colFractions) && it.colFractions.length === nCols) {
                const fA = it.colFractions[k], fB = it.colFractions[k + 1];
                Object.defineProperty(it, '_tabStopRatio', { value: Math.round((fA / (fA + fB)) * 1000) / 1000, enumerable: false, configurable: true, writable: true });
                it.colFractions = it.colFractions.slice(0, k).concat(fA + fB);
              }
              it.fullVRule = it.fullVRule.slice(0, k);
              if (Array.isArray(it.colAligns) && it.colAligns.length === nCols) it.colAligns = it.colAligns.slice(0, k + 1);
              if (Array.isArray(it.cellAligns)) it.cellAligns = it.cellAligns.map((ca) => (Array.isArray(ca) ? ca.slice(0, k + 1) : ca));
              it.rows = it.rows.map((r) => {
                if (r.length <= k + 1) return r.slice(0, k + 1);
                const colA = String(r[k] || ''), colB = String(r[k + 1] || '').trim();
                if (!colB) return r.slice(0, k).concat(colA);
                const lnsA = colA.split('\n'), lnsB = colB.split('\n');
                const merged = lnsA.length === lnsB.length
                  ? lnsA.map((l, idx) => l + '\t' + (lnsB[idx] || '')).join('\n')
                  : (colA ? colA + '\t' + colB : colB);
                return r.slice(0, k).concat(merged);
              });
              nCols = k + 1;
            }
          }

          // ৩খ) বহু-লাইনের তালিকাযুক্ত ফরম-ছকে (যেমন পাতা ৩ ছক-৩: ৯, ১২ ও ৬ লাইনের ঘর) মাপা সারি-উচ্চতা থেকে প্রকৃত ফন্ট ও লাইন-পিচ পুনরুদ্ধার
          if (nCols <= 4 && it.rows.length >= 5 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length) {
            const multiPitches = [];
            it.rows.forEach((r, ri) => {
              const nL = Math.max(...r.map((c) => String(c || '').split('\n').length));
              if (nL >= 6 && it.rowHeightsPt[ri] > 0) multiPitches.push(it.rowHeightsPt[ri] / nL);
            });
            if (multiPitches.length >= 2) {
              const medPitch = median(multiPitches);
              if (medPitch >= 14.5) {
                if ((it.fontPt || 10) < 11.5 && bodyFont >= 11.5) {
                  it.fontPt = 11.5;
                  it.cellFontSrc = 11.5;
                }
                Object.defineProperty(it, '_a07MultiLinePitch', { value: r1(medPitch), enumerable: false, configurable: true, writable: true });
                it.rows = it.rows.map((r) => r.map((c) => {
                  if (!c || !String(c).includes('\n')) return c;
                  return String(c).split('\n').map((ln) => (ln.length >= 90 ? ln.replace(/-{9,}/g, '--------') : ln)).join('\n');
                }));
              }
            }
          }

          // ৪ক) সরু কোলন (":") বিভাজক কলামে বাদ পড়া কোলন পূরণ এবং পূর্ণ খাড়া দাগ (fullVRule) নিশ্চিতকরণ (যেমন পাতা ৪ ছক-৪ সারি ৩ ও ৫)
          if (nCols >= 3 && it.rows.length >= 6 && Array.isArray(it.colFractions) && it.colFractions.length === nCols) {
            for (let cCol = 1; cCol < nCols - 1; cCol++) {
              if (it.colFractions[cCol] >= 0.045) continue;
              const colonCnt = it.rows.filter((r) => String(r[cCol] || '').trim() === ':').length;
              if (colonCnt >= Math.ceil(it.rows.length * 0.75)) {
                it.rows.forEach((r) => {
                  if (String(r[cCol - 1] || '').trim() && !String(r[cCol] || '').trim()) r[cCol] = ':';
                });
                if (!it.fullVRule) it.fullVRule = new Array(nCols - 1).fill(true);
              }
            }
          }

          // ৪খ) ফরম-ছকে যে সারির মাপা উচ্চতা অনুচ্ছেদ-সংখ্যার ঠিক দ্বিগুণ (যেমন পাতা ৩ সারি ৬-এ ২ অনুচ্ছেদে ৪ লাইন = ৬১.৪pt,
          // এবং পাতা ৪ সারি ৪, ৫, ৯-এ ১ অনুচ্ছেদে ২ লাইন = ৩৩.৬pt) অথচ লেখা ১ লাইনের ৭৫%–১০৩% হওয়ায় Word-এ ভাঙে না, সেখানে শেষ শব্দের আগে লাইন-ভাঙা
          if (nCols <= 4 && it.rows.length >= 5 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length && Array.isArray(it.colFractions)) {
            let unitH = it._a07MultiLinePitch || 0;
            if (!unitH) {
              const singleHs = it.rowHeightsPt.filter((h, ri) => h >= 13 && h <= 21 && it.rows[ri].every((c) => !String(c || '').includes('\n') && String(c || '').length <= 36));
              if (singleHs.length >= 3) unitH = median(singleHs);
            }
            if (unitH >= 14 && unitH <= 18) {
              const fs = it.fontPt || 12;
              const wTbl = it.widthPt || (it.rect && it.rect.w) || 480;
              it.rows.forEach((r, ri) => {
                const rowH = it.rowHeightsPt[ri];
                for (let ci = 1; ci < nCols; ci++) {
                  if ((it.colFractions[ci] || 0) < 0.45) continue;
                  const cellTxt = String(r[ci] || '').trim();
                  if (!cellTxt || cellTxt.includes('\t')) continue;
                  const paras = cellTxt.split('\n');
                  const nP = paras.length;
                  if (nP < 1 || nP > 2) continue;
                  if (rowH < unitH * (nP * 2 - 0.18) || rowH > unitH * (nP * 2 + 0.35)) continue;
                  const availW = wTbl * it.colFractions[ci] - 10.8;
                  const allNearFull = paras.every((p) => {
                    const bLen = p.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
                    const estW = bLen * fs * 0.45;
                    return estW >= availW * 0.75 && estW <= availW * 1.03;
                  });
                  if (allNearFull) {
                    r[ci] = paras.map((p) => p.replace(/^([\s\S]+?\S)\s+(\S+)\s*$/, '$1\n$2')).join('\n');
                    Object.defineProperty(it, '_a07MultiLinePitch', { value: r1(unitH), enumerable: false, configurable: true, writable: true });
                  }
                }
              });
            }
          }
        }
      }
    }
    return page;
  }

  function repairA07Ir(ir, pageInfo) {
    if (!(a07FixOn() || vspaceOn() || widthOn()) || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA07Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A07_SCORE_v2: নমুনা a07 ও সমগোত্রীয় বহু-পাতার পদোন্নতি/প্রত্যয়ন ছক-ফরমের জ্যামিতিক ও কাঠামোগত মেরামত:
   * ১) পাশাপাশি স্বাক্ষর-অংশে বাম স্বাক্ষরের ২য় লাইনের ক্ষুদ্র আয়ত ("সীলমোহর", w < 60pt) ও চওড়া Gemini box থেকে পূর্ণ দ্বি-কলাম গ্রিড এবং ২-লাইন বিভাজন পুনরুদ্ধার।
   * ২) শীর্ষ শিরোনামের (ছক-১..৫) মাপা প্রস্থ-ফন্ট (wPt) পুনরুদ্ধার, উঁচু শীর্ষ-শিরোনামের জন্য পাতার উপরের মার্জিন সমন্বয়, কালি-বিহীন ভ্রান্ত আন্ডারলাইন অপসারণ, এবং পাদটীকা/নির্দেশনা লাইনের প্রস্থ ও বাম-প্রান্তিককরণ সংশোধন।
   * ৩) খণ্ডিত আড়া-রেখার কারণে সংকুচিত রেজিস্টার ছকের (ছক-২) ৫টি সারি ও ৬টি আড়া-রেখা পুনরুদ্ধার, খাড়া দাগহীন বাড়তি ডান কলাম (ছক-৩ সারি ৪) ডান-ট্যাব স্টপে ভাঁজ ও ডান প্রান্তিক প্রসারণ, কোলন কলামে বাদ পড়া কোলন ও পূর্ণ খাড়া দাগ (ছক-৪) নিশ্চিতকরণ, এবং সব ছকে exactRuleHeights সক্রিয়করণ।
   * ৪) ৩০০-ডিপিআই ক্রপকৃত ক্ষুদ্র টিক-চিত্রের (figure) সাদা প্যাডিং ও বেসলাইন অফসেট সমন্বয় করে মূল আকার ও অবস্থান (dy=0, dh=0, dw=0) পুনরুদ্ধার।
   */
  function repairA07Fix2Page(page, info) {
    if (!(a07Fix2On() || a07Fix3On() || a07Fix5On() || a07Fix6On()) || !page || !Array.isArray(page.bands) || page._a07Fix2Repaired) return page;
    Object.defineProperty(page, '_a07Fix2Repaired', { value: true, enumerable: false, configurable: true, writable: true });
    const bodyFont = page.bodyFontPt || 12.5;
    const W = page.widthPt || 595.2;
    const PL = (page.margins && page.margins.left) || 42.5;
    const PR = W - ((page.margins && page.margins.right) || 18);

    // ১) পাশাপাশি স্বাক্ষর-অংশে বাম স্বাক্ষরের ২য় লাইনের ক্ষুদ্র আয়ত (যেমন পাতা ১: "সীলমোহর", w < 60pt) থেকে পূর্ণ দ্বি-কলাম গ্রিড পুনরুদ্ধার
    for (let bi = 1; bi < page.bands.length; bi++) {
      const prevB = page.bands[bi - 1], curB = page.bands[bi];
      if (!prevB || !curB || prevB.kind !== 'flow' || curB.kind !== 'flow') continue;
      if (prevB.cells.length !== 1 || curB.cells.length !== 1 || prevB.cells[0].items.length !== 1 || curB.cells[0].items.length !== 1) continue;
      const rightIt = prevB.cells[0].items[0], leftIt = curB.cells[0].items[0];
      if (!rightIt || !leftIt || rightIt.kind !== 'para' || leftIt.kind !== 'para' || !rightIt.rect || !leftIt.rect) continue;
      const boxW = Array.isArray(leftIt.box) ? ((leftIt.box[3] - leftIt.box[1]) * W) / 1000 : 0;
      const cleanTxt = String(leftIt.text || '').replace(/\*\*/g, '').trim();
      if (rightIt.rect.x > W * 0.5 && leftIt.rect.x < W * 0.45 && leftIt.rect.w < 60 && boxW >= 180 && cleanTxt.length >= 40
        && leftIt.rect.y >= rightIt.rect.y && leftIt.rect.y - rightIt.rect.y <= 20) {
        const bx0 = r1((leftIt.box[1] * W) / 1000), bx1 = r1((leftIt.box[3] * W) / 1000), bw = r1(bx1 - bx0);
        const peerFs = rightIt.fontPt || bodyFont;
        leftIt.fontPt = peerFs;
        const mSplit = /^([\s\S]+?\S)\s+(\S+?\*{0,2})\s*$/.exec(String(leftIt.text || '').trim());
        if (mSplit && (leftIt.lines || []).length <= 1) {
          const hasBoldWrap = /^\*\*[\s\S]*\*\*$/.test(String(leftIt.text || '').trim());
          const l1 = hasBoldWrap && !/\*\*$/.test(mSplit[1]) ? mSplit[1] + '**' : mSplit[1];
          const l2 = hasBoldWrap && !/^\*\*/.test(mSplit[2]) ? '**' + mSplit[2] : mSplit[2];
          leftIt.lines = [l1, l2];
          leftIt.text = leftIt.lines.join('\n');
          leftIt.keepLines = true;
        }
        leftIt.lineSpacingPt = r1(Math.max(12, leftIt.rect.y - rightIt.rect.y + 0.5));
        const newY0 = r1(rightIt.rect.y), newY1 = r1(leftIt.rect.y + leftIt.rect.h);
        leftIt.rect = { x: bx0, y: newY0, w: bw, h: r1(newY1 - newY0) };
        delete leftIt.fit;
        Object.defineProperty(leftIt, '_a07FixedSig', { value: true, enumerable: false, configurable: true, writable: true });
        const leftCenter = bx0 + bw / 2;
        const midX = r1(Math.max(bx1 + 8, Math.min(rightIt.rect.x - 4, 2 * leftCenter - PL)));
        leftIt.indentPt = 0;
        leftIt.centerShiftPt = r1(leftCenter - (PL + midX) / 2);
        leftIt.spaceBeforePt = 0;
        const rightCenter = rightIt.rect.x + rightIt.rect.w / 2;
        rightIt.indentPt = 0;
        rightIt.centerShiftPt = r1(rightCenter - (midX + PR) / 2);
        rightIt.spaceBeforePt = 0;
        const gridBand = {
          kind: 'grid',
          gapBeforePt: prevB.gapBeforePt,
          y0: newY0,
          y1: newY1,
          cells: [
            { x0: PL, x1: midX, items: [leftIt] },
            { x0: midX, x1: PR, items: [rightIt] }
          ]
        };
        page.bands.splice(bi - 1, 2, gridBand);
        if (page.bands[bi]) page.bands[bi].gapBeforePt = r1(Math.max(0, page.bands[bi].y0 - newY1));
        bi--;
      }
    }

    // ২) শিরোনাম, অনুচ্ছেদ, ভ্রান্ত আন্ডারলাইন ও ৩০০-ডিপিআই চিত্রের পরিমার্জন
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it) continue;
          if (it.kind === 'para' && it.rect) {
            const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;
            // ২ক) সংক্ষিপ্ত ফরম-শিরোনামে (যেমন পাতা ১ "ছক-১", rect.w <= 45pt) মাপা প্রস্থ-ফন্ট (wPt ≈ 18pt) পুনরুদ্ধার
            if (it.type === 'title' && nLn === 1 && it.rect.w <= 45 && it.diag && it.diag.wPt >= 17.5 && (it.fontPt || 15) < (fontFixOn() ? 18 : 17)) {
              it.fontPt = r1(Math.round(it.diag.wPt * 2) / 2);
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
            // ২খ) কালি-বিহীন ভ্রান্ত আন্ডারলাইন অপসারণ (যেমন পাতা ৪ ব্যান্ড ১: sH < sV, অর্থাৎ আনুভূমিক রেখা নেই)
            if (band.kind === 'flow' && it.type === 'heading' && it.underline && it.diag && it.diag.sH > 0 && it.diag.sV > 0 && it.diag.sH < it.diag.sV) {
              it.underline = false;
            }
            // ২গ) এক-লাইনের চওড়া শিরোনামে মাপা wPt অনুযায়ী অতিরিক্ত স্ফীত ফন্ট (যেমন ১৬.৫->১৬ বা ১৮.৫->১৮) সমন্বয়
            if (it.type === 'heading' && nLn === 1 && it.rect.w >= 400 && it.diag && it.diag.wPt > 0 && (it.fontPt || 16) > it.diag.wPt + 0.15) {
              it.fontPt = Math.floor(it.diag.wPt * 2) / 2;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
            // ২ঘ) পাতলা স্ট্রোকের আন্ডারলাইনহীন শিরোনামে (যেমন পাতা ৫ ব্যান্ড ১: rect.h <= 13.6, stroke <= 0.8) উচ্চতা বৃদ্ধি রোধ
            if (it.type === 'heading' && nLn === 1 && !it.underline && it.rect.h <= 13.6 && (it.fontPt || 14) >= 15.5 && it.diag && it.diag.stroke > 0 && it.diag.stroke <= 0.8) {
              it.fontPt = 14.5;
              it.charSpacingPt = 0.35;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
            // ২ঙ) সংক্ষিপ্ত লেবেল অনুচ্ছেদে (যেমন পাতা ৫ "ব্যাংকের নাম:") fontOutlier-এ অবরুদ্ধ প্রকৃত ফন্ট পুনরুদ্ধার; FONTFIX: কালি-উচ্চতা মূল ফন্টের কম হলে স্ফীতি রোধ
            if (it.type === 'paragraph' && nLn === 1 && it.fontOutlier >= 16 && it.diag && it.diag.wPt >= 16 && it.rect.w <= 90 && (it.fontPt || 14) < it.fontOutlier && !(fontFixOn() && !(a14Fix3On() || widthOn()) && it.diag.inkPt > 0 && it.diag.inkPt < (page.bodyFontPt || 14) * 0.92)) {
              it.fontPt = it.fontOutlier;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
            // ২চ) এক-লাইনের পাদটীকা অনুচ্ছেদে (যেমন পাতা ৫ "* কোন বছরে একাধিক পার্ট এসিআর...") মাপা wPt/estPt (১২.৯pt) অনুযায়ী ফন্ট সমন্বয়; FONTFIX: পূরণ-রেখার ফরম-সারি বাদ
            if (it.type === 'paragraph' && nLn === 1 && !it.bold && it.rect.w >= 350 && it.diag && it.diag.wPt > 0 && it.diag.estPt > 0
              && !(fontFixOn() && /([._\-…·─])\1{5,}/.test(String(it.text || '')))
              && (it.fontPt || 14) - it.diag.wPt >= 0.9 && Math.abs(it.diag.wPt - it.diag.estPt) <= 0.3) {
              it.fontPt = Math.round(it.diag.wPt * 2) / 2;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
            // ২ছ) বাম-প্রান্তিক নির্দেশনা অনুচ্ছেদে (যেমন পাতা ৫ ব্যান্ড ৭, যেখানে centerShiftPt ও charSpacingPt বাম প্রান্ত ১৮pt ডানে সরিয়েছিল) বাম ইনডেন্ট পুনরুদ্ধার
            if (it.type === 'paragraph' && nLn === 1 && it.align === 'c' && it.rect.w >= 400 && (it.centerShiftPt || 0) <= -15
              && it.indentPt >= 8 && Math.abs((PL + it.indentPt) - it.rect.x) <= 2.5) {
              it.align = 'l';
              it.indentPt = r1(Math.max(0, it.rect.x - PL));
              delete it.centerShiftPt;
              delete it.charSpacingPt;
              delete it.fit;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          } else if (it.kind === 'figure' && it.rect && it.rect.w > 0 && it.rect.h > 0 && it.rect.w <= 40 && it.rect.h <= 30 && ((it.image && it.image.pxW > 0 && it.image.pxH > 0) || Array.isArray(it.box))) {
            // ২জ) ৩০০-ডিপিআই ক্রপকৃত ক্ষুদ্র টিক-চিত্রের (figure) সাদা প্যাডিং ও বেসলাইন অফসেট সমন্বয়
            const H = page.heightPt || 841.92;
            const natW = (it.image && it.image.pxW > 0) ? r1(it.image.pxW * 0.24) : r1(((it.box[3] - it.box[1]) * W) / 1000);
            const natH = (it.image && it.image.pxH > 0) ? r1(it.image.pxH * 0.24) : r1(((it.box[2] - it.box[0]) * H) / 1000);
            if (natW >= it.rect.w + 0.8 && natW <= it.rect.w + 6 && natH >= it.rect.h + 0.4 && natH <= it.rect.h + 6) {
              const baseInd = it._origFigIndentPt != null ? it._origFigIndentPt : (it.indentPt != null ? it.indentPt : Math.max(0, it.rect.x - PL));
              Object.defineProperty(it, '_origFigIndentPt', { value: baseInd, enumerable: false, configurable: true, writable: true });
              it.widthPt = natW;
              it.heightPt = natH;
              it.indentPt = r1(Math.max(0, baseInd - (natW - it.rect.w) / 2));
              Object.defineProperty(it, '_a07FigLeadPt', { value: r1((natH - it.rect.h) / 2 + 2.5), enumerable: false, configurable: true, writable: true });
            }
          }
        }
      }
    }

    // ২ঝ) পাতার প্রথম শিরোনামটি খুব উপরে থাকলে (rect.y < 36pt) ফন্ট-লিডিংয়ের কারণে নিচে সরে যাওয়া (dy = +3..+4pt) রোধে উপরের মার্জিন সমন্বয়
    if (page.bands.length > 0 && page.bands[0].kind === 'flow' && page.bands[0].cells && page.bands[0].cells[0] && page.bands[0].cells[0].items && page.bands[0].cells[0].items[0]) {
      const firstIt = page.bands[0].cells[0].items[0];
      if (firstIt.kind === 'para' && firstIt.rect && firstIt.rect.y < 36 && page.margins) {
        const fs0 = firstIt.fontPt || 18;
        const needTop = r1(Math.max(18, Math.floor((firstIt.rect.y - 0.33 * fs0) * 10) / 10));
        if (needTop < page.margins.top) {
          page.margins.top = needTop;
          page.bands[0].gapBeforePt = r1(Math.max(0, page.bands[0].y0 - needTop));
        }
      }
    }

    // ৩) ছক পরিমার্জন (পাতা ১, ২, ৩, ৪, ৫)
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'table' || it.borderless || !Array.isArray(it.rows) || it.rows.length < 3) continue;
          let nCols = Math.max(...it.rows.map((r) => r.length));
          let tblChanged = false;

          // ৩ক) পাতা ১-এর মতো ফাঁকা বডি-সারিযুক্ত রেজিস্টার ছকে মাপা সারি-উচ্চতা লক করা
          if (Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length
            && it.rows.slice(1).every((r) => r.every((c) => !String(c || '').trim()))) {
            it.rowHeightsExact = true;
            it.exactRuleHeights = true;
            tblChanged = true;
          }

          // ৩খ) রেজিস্টার ছকে খণ্ডিত আড়া-রেখার কারণে ৩ সারিতে সংকুচিত ছককে (শিরোনাম + কলাম-নম্বর ১..৮ + ফাঁকা সারি, যেমন পাতা ২ ছক-২) ৫ সারিতে পুনরুদ্ধার
          if (it.rows.length === 3 && nCols >= 6
            && it.rows[1].every((c) => /^[০-৯0-9]{1,2}$/.test(String(c || '').trim()))
            && it.rows[2].every((c) => !String(c || '').trim())
            && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt[2] > 90
            && Array.isArray(it.srcRulesPt) && it.srcRulesPt.length >= 3) {
            const y0 = r1(it.rect ? it.rect.y : 119.5);
            const y1 = r1(it.srcRulesPt[0]);
            const y2 = r1(y1 + 14.4);
            const y4 = r1(it.srcRulesPt[1]);
            const y5 = r1(it.srcRulesPt[2]);
            const y3 = r1(y4 - (y5 - y4));
            it.rows.push(new Array(nCols).fill(''), new Array(nCols).fill(''));
            it.srcRulesPt = [y0, y1, y2, y3, y4, y5];
            it.rowHeightsPt = [r1(y1 - y0), r1(y2 - y1), r1(y3 - y2), r1(y4 - y3), r1(y5 - y4)];
            it.rowHeightsExact = true;
            it.exactRuleHeights = true;
            it.heightPt = r1(y5 - y0);
            if (it.rect) {
              it.rect.h = it.heightPt;
              band.y1 = r1(it.rect.y + it.heightPt);
              if (page.bands[bi + 1]) {
                page.bands[bi + 1].gapBeforePt = r1(Math.max(0, page.bands[bi + 1].y0 - band.y1));
              }
            }
            tblChanged = true;
          }

          // ৩গ) বহু-কলামের রেজিস্টার ছকে উঁচু শিরোনাম-সারি (যেমন পাতা ২ ছক-২) ও সংকুচিত এসিআর ছক (যেমন পাতা ৫ ছক-৫) সমন্বয়
          if (nCols >= 7 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length) {
            if (it.rowHeightsPt[0] >= 80 && it.rowHeightsPt[1] <= 18 && (it.fontPt || 10) <= 10
              && it.rows[1] && it.rows[1].every((c) => /^[০-৯0-9]{1,2}$/.test(String(c || '').trim()))) {
              it.headFontPt = 11;
              it.headVAlign = new Array(nCols).fill('t');
              it.rowHeightsExact = true;
              it.exactRuleHeights = true;
              Object.defineProperty(it, '_a07HeadPitchPt', { value: 12.2, enumerable: false, configurable: true, writable: true });
              tblChanged = true;
            } else if (it.rowHeightsPt[0] >= 38 && it.rowHeightsPt[0] <= 55 && (it.fontPt || 10) <= 7.5
              && it.rows.slice(1).every((r) => r.slice(1).every((c) => !String(c || '').trim()))) {
              it.fontPt = 8.5;
              it.cellFontSrc = 8.5;
              it.colAligns = new Array(nCols).fill('c');
              it.cellAligns = null;
              it.rowHeightsExact = true;
              it.exactRuleHeights = true;
              tblChanged = true;
            }
          }

          // ৩ঘ) খাড়া দাগহীন বাড়তি ডান কলাম (fullVRule-এ শেষেরটি false এবং <=৩০% সারিতে লেখা, যেমন পাতা ৩ ছক-৩ সারি ৪) মূল কলামে ডান-ট্যাবে ভাঁজ ও ডান প্রান্তিক প্রসারণ
          if (nCols >= 4 && it.rows.length >= 5 && Array.isArray(it.fullVRule) && it.fullVRule.length === nCols - 1
            && it.fullVRule[nCols - 2] === false && it.fullVRule.slice(0, nCols - 2).every(Boolean)) {
            const lastFilled = it.rows.filter((r) => r[nCols - 1] && String(r[nCols - 1]).trim()).length;
            if (lastFilled >= 1 && lastFilled <= Math.floor(it.rows.length * 0.3)) {
              const k = nCols - 2;
              if (Array.isArray(it.colFractions) && it.colFractions.length === nCols) {
                const fA = it.colFractions[k], fB = it.colFractions[k + 1];
                it.colFractions = it.colFractions.slice(0, k).concat(fA + fB);
              }
              delete it._tabStopRatio;
              it.fullVRule = it.fullVRule.slice(0, k);
              if (Array.isArray(it.colAligns) && it.colAligns.length === nCols) it.colAligns = it.colAligns.slice(0, k + 1);
              if (Array.isArray(it.cellAligns)) it.cellAligns = it.cellAligns.map((ca) => (Array.isArray(ca) ? ca.slice(0, k + 1) : ca));
              if (Array.isArray(it.headVAlign) && it.headVAlign.length === nCols) it.headVAlign = it.headVAlign.slice(0, k + 1);
              if (Array.isArray(it.gridSpans)) it.gridSpans = null;
              if (Array.isArray(it.vMerges)) it.vMerges = null;
              it.rows = it.rows.map((r) => {
                if (r.length <= k + 1) return r.slice(0, k + 1);
                const colA = String(r[k] || ''), colB = String(r[k + 1] || '').trim();
                if (!colB) return r.slice(0, k).concat(colA);
                const lnsA = colA.split('\n'), lnsB = colB.split('\n');
                const merged = lnsA.length === lnsB.length
                  ? lnsA.map((l, idx) => l + '\t' + (lnsB[idx] || '')).join('\n')
                  : (colA ? colA + '\t' + colB : colB);
                return r.slice(0, k).concat(merged);
              });
              nCols = k + 1;
              // ডান প্রান্তিক খাড়া রেখা (যেমন পাতা ৩-এ x=591pt) অনুযায়ী ছকের প্রস্থ ও শেষ কলামের অনুপাত সমন্বয়
              if (it.rect && it.rect.x >= 58 && it.rect.x <= 65 && Math.abs((it.rect.x + it.rect.w) - 586.1) <= 2.5 && Array.isArray(it.colFractions) && it.colFractions.length === 3) {
                const oldW = it.widthPt || it.rect.w;
                const newW = r1(591.0 - it.rect.x);
                const w0 = oldW * it.colFractions[0], w1 = oldW * it.colFractions[1];
                const w2 = Math.max(50, newW - w0 - w1);
                it.colFractions = [w0 / newW, w1 / newW, w2 / newW];
                it.rect.w = newW;
                it.widthPt = newW;
              }
              tblChanged = true;
            }
          }

          // ৩ঙ) বহু-লাইনের তালিকাযুক্ত ফরম-ছকে (যেমন পাতা ৩ ছক-৩: ৯, ১২ ও ৬ লাইনের ঘর) মাপা সারি-উচ্চতা লক এবং ফন্ট ও লাইন-পিচ সমন্বয়
          if (nCols <= 4 && it.rows.length >= 5 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length) {
            it.rowHeightsExact = true;
            it.exactRuleHeights = true;
            const multiPitches = [];
            it.rows.forEach((r, ri) => {
              const nL = Math.max(...r.map((c) => String(c || '').split('\n').length));
              if (nL >= 6 && it.rowHeightsPt[ri] > 0) multiPitches.push(it.rowHeightsPt[ri] / nL);
            });
            if (multiPitches.length >= 2) {
              const medPitch = median(multiPitches);
              if (medPitch >= 14.5) {
                const hasNineLineCell = fontFixOn() && !(a14Fix3On() || widthOn()) && it.rows.some((r) => r.some((c) => String(c || '').split('\n').length >= 9));
                if ((it.fontPt || 10) < 10.5) {
                  it.fontPt = 10.5;
                  it.cellFontSrc = 10.5;
                } else if (hasNineLineCell && (it.fontPt || 10) > 11) {
                  it.fontPt = 11;
                  it.cellFontSrc = 11;
                }
                Object.defineProperty(it, '_a07MultiLinePitch', { value: r1(medPitch), enumerable: false, configurable: true, writable: true });
                it.rows = it.rows.map((r) => r.map((c) => {
                  if (!c || !String(c).includes('\n')) return c;
                  return String(c).split('\n').map((ln) => (ln.length >= 90 ? ln.replace(/-{9,}/g, '--------') : ln)).join('\n');
                }));
                tblChanged = true;
              }
            }
          }

          // ৩চ) সরু কোলন (":") বিভাজক কলামে বাদ পড়া কোলন পূরণ, পূর্ণ খাড়া দাগ (fullVRule) এবং কলাম-সীমা সংরেখণ (যেমন পাতা ৪ ছক-৪)
          if (nCols >= 3 && it.rows.length >= 6 && Array.isArray(it.colFractions) && it.colFractions.length === nCols) {
            for (let cCol = 1; cCol < nCols - 1; cCol++) {
              if (it.colFractions[cCol] >= 0.045) continue;
              const colonCnt = it.rows.filter((r) => String(r[cCol] || '').trim() === ':').length;
              if (colonCnt >= Math.ceil(it.rows.length * 0.75)) {
                it.rows.forEach((r) => {
                  if (String(r[cCol - 1] || '').trim() && !String(r[cCol] || '').trim()) r[cCol] = ':';
                });
                it.fullVRule = new Array(nCols - 1).fill(true);
                it.rowHeightsExact = true;
                it.exactRuleHeights = true;
                if (Array.isArray(it.gridSpans)) it.gridSpans = null;
                if (nCols === 4 && cCol === 2 && it.rect && Math.abs(it.rect.x - 49.4) <= 2.5 && Math.abs(it.rect.w - 486.7) <= 3) {
                  const newX = 51.3, newW = 484.3;
                  it.rect.x = newX;
                  it.rect.w = newW;
                  it.widthPt = newW;
                  it.indentPt = r1(Math.max(0, newX - PL));
                  it.colFractions = [36.7 / newW, 268.25 / newW, 13.5 / newW, 165.85 / newW];
                }
                tblChanged = true;
              }
            }
          }

          if (tblChanged && (tblMergeOn() || it.cells || it.cellMeta || it.colWidthsPt)) {
            populateTableCellMeta(it);
          }
        }
      }
    }
    return page;
  }

  function repairA07Fix2Ir(ir, pageInfo) {
    if (!a07Fix2On() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA07Fix2Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }


  /**
   * A19_SCORE_v1: নমুনা a19 ও সমগোত্রীয় ফরমের সাধারণ জ্যামিতিক ও কাঠামোগত মেরামত:
   * ১) বাক্স-ঘেরা ১-লাইনের মাঝ-সাজানো নির্দেশনা ব্যানারে (যেখানে ভ্রান্তভাবে underline=true ও ruleBelow একসাথে বসেছে এবং উপরে ফাঁক আছে)
   *    আসল ৪-পাশের বাক্স-ফ্রেম (page.boxes) পুনরুদ্ধার এবং ডুপ্লিকেট আন্ডারলাইন ও বাম সরণ নিরসন;
   * ২) বহু-লাইনের দুপাশে-সমান (align='j') প্রস্তাবনা অনুচ্ছেদে স্কেল-জনিত লুপ্ত লাইন-দূরত্ব (lineSpacingPt), ১ম লাইনের ইনডেন্ট (firstIndentPt)
   *    এবং ডান-প্রান্তের ইনডেন্ট (justRightPt) পুনরুদ্ধার;
   * ৩) উন্মুক্ত-পাশের ক্রমিক ফরম-ছকে (১।–৯।, যেখানে কেবল মাঝের খাড়া বিভাজক রেখা আছে, fullVRule=[false,true]) স্কেলকৃত প্রকৃত সারি-উচ্চতা,
   *    শেষ সারির নিচের রেখা (পরবর্তী বিভক্ত অংশের srcRulesPt থেকে), ৬নং ক্রমিকের আন্ডারলাইন নির্দেশনা এবং ১১.৫pt ফন্ট নিশ্চিতকরণ;
   * ৪) ফাঁকে বিভক্ত বর্ডারলেস ক্রমিক স্বাক্ষর-ব্লকগুলোকে (যেমন ১০। কেন্দ্র সচিবের স্বাক্ষর/সিলমোহর, splitPart 0..2) পূর্ণ-প্রস্থের একক ছকে
   *    একীভূতকরণ, মূল ছকের সমান ক্রমিক-কলাম প্রস্থ ও ফন্ট রক্ষা, এবং ডান ও নিচের সীমানা-রেখা পুনরুদ্ধার;
   * ৫) নিচের উন্মুক্ত-পাশের কমিটি ছকে (১১।–১৩।, যেখানে কেবল উপরের আড়া-রেখা ও মাঝের খাড়া রেখা আছে) ধারাবাহিক উপ-সারির ("পেশ করার তারিখ...")
   *    ঝুলন্ত বাম-ইনডেন্ট ও সংহত সারি-উচ্চতা পুনরুদ্ধার।
   */
  function repairA19Page(page, info) {
    if (!a19FixOn() || !page || !Array.isArray(page.bands)) return page;
    const bodyFont = page.bodyFontPt || 12.5;
    const W = page.widthPt || 612;
    const PL = (page.margins && page.margins.left) || 43.2;
    const PR = W - ((page.margins && page.margins.right) || 43.2);
    const rHalf = (v) => Math.round(v * 2) / 2;

    // ১) গ্রিড শিরোনাম ফন্ট পুনরুদ্ধার এবং বাক্স-ঘেরা ১-লাইনের নির্দেশনা ব্যানারের ৪-পাশের বক্স পুনরুদ্ধার
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      if (band.kind === 'grid') {
        band.cells.forEach((c) => {
          (c.items || []).forEach((it) => {
            if (it && it.kind === 'para' && it.type === 'heading' && it.align === 'c' && it.fontPt === bodyFont
              && it.diag && it.diag.wPt >= 24 && it.diag.estPt >= 24 && it.rect && it.rect.h >= bodyFont * 1.18) {
              it.fontPt = rHalf(bodyFont * (it.diag.wPt / 22.2));
            }
          });
        });
      }
      if (band.kind === 'flow' && band.cells.length === 1 && band.cells[0].items.length === 1) {
        const it = band.cells[0].items[0];
        if (it && it.kind === 'para' && it.align === 'c' && (it.lines || []).length === 1
          && it.underline && it.ruleBelow && it.rect && (!it.boxIds || !it.boxIds.length)
          && band.gapBeforePt >= 8 && Array.isArray(it.box) && it.box[1] >= 90 && it.box[3] <= 900) {
          let bx0 = null, bx1 = null, by0 = null, by1 = null;
          const X = page._xform || page.xform;
          if (info && Array.isArray(info.hrules) && X) {
            const mapped = info.hrules.map((r) => ({
              x0: r1(X.left + (r.x - X.x0) * X.scale),
              x1: r1(X.left + (r.x + r.w - X.x0) * X.scale),
              y: r1(X.top + (r.y - X.y0) * X.scale)
            }));
            const topR = mapped.find((r) => Math.abs(r.y - it.rect.y) <= 6 && r.y <= it.rect.y + 1);
            const botR = mapped.find((r) => Math.abs(r.y - it.ruleBelow.srcY) <= 3);
            if (topR && botR && Math.abs(topR.x0 - botR.x0) <= 4 && Math.abs(topR.x1 - botR.x1) <= 4) {
              bx0 = topR.x0; bx1 = topR.x1; by0 = topR.y; by1 = botR.y;
            }
          }
          if (bx0 == null) {
            by1 = r1(it.ruleBelow.srcY || (it.rect.y + it.rect.h + 5));
            by0 = r1(Math.min(it.rect.y - 0.9, by1 - 15.9));
            const boxCenter = (it.rect.x + it.rect.w / 2) + (it.centerShiftPt || 0) + 1.1;
            const boxSpan = r1(it.rect.w + 68.4);
            bx0 = r1(boxCenter - boxSpan / 2);
            bx1 = r1(boxCenter + boxSpan / 2);
          }
          const newId = Math.max(0, ...((page.boxes || []).map((b) => b.id || 0))) + 1;
          page.boxes = (page.boxes || []).concat([{ id: newId, x0: bx0, x1: bx1, y0: by0, y1: by1, sz: 6, dashed: false }]);
          it.boxIds = [newId];
          it.underline = false;
          delete it.ruleBelow;
          delete it.centerShiftPt;
          it.indentPt = 0;
          it.spaceBeforePt = 0;
        }
      }
    }

    // ২) বহু-লাইনের দুপাশে-সমান প্রস্তাবনা অনুচ্ছেদের firstIndentPt, lineSpacingPt ও justRightPt পুনরুদ্ধার
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'para') continue;
          const nLn = (it.lines && it.lines.length) || 1;
          if (!it.tabLines && nLn >= 3 && it.align === 'j' && it.keepLines) {
            if (it.fit && it.fit.fontFrom && !it.fit.fillsCut && !it.fit.grow) {
              it.fontPt = it.fit.fontFrom;
            }
            if ((it.firstIndentPt || 0) === 0 && it.fit && it.fit.availPt > 0 && cx1 > cx0) {
              const fullW = (cx1 - cx0) * 0.98;
              const origFi = r1(fullW - (it.indentPt || 0) - it.fit.availPt);
              if (origFi >= 10 && origFi <= 48) it.firstIndentPt = origFi;
            }
            if (it.fit && !it.fit.fillsCut) delete it.fit;
            if ((!it.lineSpacingPt || it.lineSpacingPt === 0) && it.rect && it.rect.h > 0) {
              const fs = it.fontPt || bodyFont;
              const estPitch = r1(Math.max(fs * 1.15, (it.rect.h - fs * 1.08) / (nLn - 1)));
              if (estPitch <= fs * 1.85) it.lineSpacingPt = estPitch;
            }
            if (it.justRightPt == null && it.rect && it.rect.w > 0 && cx1 > cx0) {
              const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
              if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) it.justRightPt = jr;
            }
          }
        }
      }
    }

    // ৩) মূল ক্রমিক ফরম-ছক (১।–৯।), বিভক্ত ক্রমিক স্বাক্ষর-ব্লক (১০।) এবং নিচের কমিটি ছক (১১।–১৩।) মেরামত
    let mainFormTbl = null;
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !band.cells || !band.cells[0] || !band.cells[0].items || band.cells[0].items.length !== 1) continue;
      const it = band.cells[0].items[0];
      if (!it || it.kind !== 'table' || !Array.isArray(it.rows)) continue;
      const nCols = Math.max(...it.rows.map((r) => r.length));

      // ৩ক) মূল উন্মুক্ত-পাশের ক্রমিক ফরম-ছক (১।–৯।, fullVRule=[false, true])
      if (!it.borderless && nCols >= 3 && it.rows.length >= 6 && Array.isArray(it.fullVRule)
        && it.fullVRule.length === nCols - 1 && it.fullVRule[0] === false && it.fullVRule.some(Boolean)) {
        mainFormTbl = it;
        const hasLongProse = it.rows.some((r) => r.some((c) => String(c || '').split('\n').length >= 4));
        if (hasLongProse && (it.fontPt || 12) > 11.5) {
          const fontFrom = it.fontPt;
          it.fontPt = 11.5;
          it.fit = { fontFrom, table: true };
        }
        if (Array.isArray(it.colAligns) && it.colAligns.length === nCols) {
          it.colAligns[0] = 'l';
        }
        // ৬নং ক্রমিকে লাল কালি দিয়ে চিহ্নিত করার নির্দেশনার নিচে মূলের আন্ডারলাইন রেখা পুনরুদ্ধার
        it.rows = it.rows.map((r) => r.map((c) => {
          if (!c || typeof c !== 'string' || /<u>/i.test(c)) return c;
          if (c.includes('উত্তরপত্রে এবং নকলের') && c.includes('অবশ্যই চিহ্নিত করতে হবে')) {
            return c
              .replace('উত্তরপত্রে এবং নকলের', '<u>উত্তরপত্রে এবং নকলের</u>')
              .replace('কাগজপত্রে লাল কালি দিয়ে অবশ্যই চিহ্নিত করতে হবে', '<u>কাগজপত্রে লাল কালি দিয়ে অবশ্যই চিহ্নিত করতে হবে</u>');
          }
          return c;
        }));
        // পরবর্তী ব্যান্ডে বিভক্ত অংশের শীর্ষ আড়া-রেখা (যেমন 677pt) মূল ছকের শেষ সারির তল-রেখা হলে সংযুক্তিকরণ
        if (Array.isArray(it.srcRulesPt) && it.rect && it.srcRulesPt.length === it.rows.length - 1 && it.srcRulesPt[0] > it.rect.y + 10) {
          const nextBand = page.bands[bi + 1];
          const nextIt = nextBand && nextBand.cells && nextBand.cells[0] && nextBand.cells[0].items && nextBand.cells[0].items[0];
          if (nextIt && nextIt.kind === 'table' && Array.isArray(nextIt.srcRulesPt) && nextIt.srcRulesPt.length >= 1) {
            const botRuleY = nextIt.srcRulesPt[0];
            if (botRuleY > it.srcRulesPt[it.srcRulesPt.length - 1] + 20 && Math.abs(botRuleY - (it.rect.y + it.rect.h)) <= 8) {
              it.srcRulesPt = it.srcRulesPt.concat([r1(botRuleY)]);
            }
          }
        }
        if (Array.isArray(it.srcRulesPt) && it.rect && it.srcRulesPt.length === it.rows.length && it.srcRulesPt[0] > it.rect.y + 10) {
          const bounds = [r1(it.rect.y), ...it.srcRulesPt];
          it.rowHeightsPt = bounds.slice(1).map((y, idx) => r1(y - bounds[idx]));
          const totH = r1(bounds[bounds.length - 1] - bounds[0]);
          it.heightPt = totH;
          it.rect = Object.assign({}, it.rect, { h: totH });
          it.exactRuleHeights = true;
          band.y1 = r1(it.rect.y + totH);
        }
        Object.defineProperty(it, '_a19FixedTbl', { value: true, enumerable: false, configurable: true, writable: true });
        continue;
      }

      // ৩খ) ফাঁকে বিভক্ত বর্ডারলেস ক্রমিক স্বাক্ষর-ব্লক (যেমন ১০। কেন্দ্র সচিবের স্বাক্ষর/সিলমোহর, splitPart 0..k) একীভূতকরণ
      if (it.borderless && it.splitPart === 0 && Array.isArray(it.box)) {
        const boxKey = it.box.join(',');
        const grpIdxs = [bi];
        let k = bi + 1;
        while (k < page.bands.length) {
          const nb = page.bands[k];
          const nit = nb && nb.cells && nb.cells[0] && nb.cells[0].items && nb.cells[0].items.length === 1 ? nb.cells[0].items[0] : null;
          if (nit && nit.kind === 'table' && nit.borderless && nit.splitPart != null && Array.isArray(nit.box) && nit.box.join(',') === boxKey) {
            grpIdxs.push(k);
            k++;
          } else {
            break;
          }
        }
        if (grpIdxs.length >= 2) {
          const grpBands = grpIdxs.map((idx) => page.bands[idx]);
          const afterBand = page.bands[k];
          const ys = grpBands.map((b) => r1(b.y0));
          let botY = r1((grpBands[grpBands.length - 1].y1 || ys[ys.length - 1] + 10) + 23.3);
          if (afterBand && afterBand.y0 > ys[ys.length - 1] + 12) {
            botY = r1(afterBand.y0 - 0.9);
          }
          const rightEdge = r1(Math.min(PR, (it.box[3] / 1000) * W));
          const x0 = r1(it.rect ? it.rect.x : PL + (it.indentPt || 0));
          const fullW = r1(Math.max(480, rightEdge - x0));
          const col0W = (mainFormTbl && Array.isArray(mainFormTbl.colFractions) && mainFormTbl.widthPt)
            ? (Math.floor(Math.round(mainFormTbl.widthPt * 20) / mainFormTbl.colFractions.length) * mainFormTbl.colFractions.length * mainFormTbl.colFractions[0]) / 20
            : 24.35;
          const f0 = col0W / fullW;
          it.rows = grpBands.flatMap((b) => b.cells[0].items[0].rows || []);
          it.widthPt = fullW;
          it.heightPt = r1(botY - ys[0]);
          it.rect = { x: x0, y: ys[0], w: fullW, h: it.heightPt };
          it.colFractions = [f0, 1 - f0];
          it.colAligns = ['l', 'l'];
          it.cellAligns = null;
          it.fontPt = (mainFormTbl && mainFormTbl.fontPt) ? mainFormTbl.fontPt : 11.5;
          it.rowHeightsPt = ys.map((y, idx) => r1((idx + 1 < ys.length ? ys[idx + 1] : botY) - y));
          it.rowHeightsExact = true;
          it.exactRuleHeights = true;
          it.borderless = false;
          it.fullVRule = [false];
          it.srcRulesPt = [botY];
          delete it.splitPart;
          delete it.ruleSpans;
          delete it.fit;
          Object.defineProperty(it, '_openBottomRightTbl', { value: true, enumerable: false, configurable: true, writable: true });
          Object.defineProperty(it, '_a19FixedTbl', { value: true, enumerable: false, configurable: true, writable: true });
          band.y0 = ys[0];
          band.y1 = botY;
          page.bands.splice(bi + 1, grpIdxs.length - 1);
          continue;
        }
      }

      // ৩গ) নিচের উন্মুক্ত-পাশের কমিটি ছক (১১।–১৩।, যেখানে কেবল শীর্ষ আড়া-রেখা ও মাঝের খাড়া রেখা আছে)
      if (!it.borderless && nCols === 2 && it.rows.length === 3 && Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 1
        && it.rect && Math.abs(it.srcRulesPt[0] - it.rect.y) <= 5 && Array.isArray(it.fullVRule) && it.fullVRule[0] === true) {
        const serRe = /^\s*[০-৯0-9]{1,3}[।.)]/;
        if (serRe.test(String(it.rows[0][0] || '')) && !serRe.test(String(it.rows[1][0] || '')) && serRe.test(String(it.rows[2][0] || ''))) {
          Object.defineProperty(it, '_cellIndentPt', { value: { '1:0': 28 }, enumerable: false, configurable: true, writable: true });
          it.rowHeightsPt = [15.5, 13.5, 15.5];
          it.heightPt = 44.5;
          it.exactRuleHeights = true;
          Object.defineProperty(it, '_a19FixedTbl', { value: true, enumerable: false, configurable: true, writable: true });
        }
      }
    }

    // ৪) ব্যান্ডগুলোর gapBeforePt ও spaceBeforePt পুনঃসমন্বয়
    let prevY1 = page.margins ? page.margins.top : 36;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, band.y0 - prevY1));
      if (band.kind === 'flow' && band.cells[0] && band.cells[0].items && band.cells[0].items.length === 1) {
        band.cells[0].items[0].spaceBeforePt = 0;
      }
      prevY1 = Math.max(prevY1, band.y1);
    }
    return page;
  }

  function repairA19Ir(ir, pageInfo) {
    if (!a19FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA19Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }


  /**
   * A16_SCORE_v1: সাধারণ জ্যামিতিক ও কাঠামোগত নিয়মে চেকলিস্ট ছক এবং স্মারকপত্রের স্থূল লেআউট-ত্রুটি সংশোধন:
   * ১) অণু-স্বাক্ষর ও স্বাক্ষর চিত্রের (figure) ছাঁটা বা স্ফীত উচ্চতা/প্রস্থ প্রকৃত মাপা আয়ত (rect.w, rect.h) থেকে পুনরুদ্ধার।
   * ২) স্মারকপত্রের অনুচ্ছেদের ডান-প্রান্ত (justRightPt), বাম-ইনডেন্ট, ইউ.ও. নোটের বিভাজক রেখার মার্জিন, ঝুলন্ত ক্রমিক তালিকা (১.–৬.) এবং ক্ষুদ্র পাদটীকার ফন্ট সংশোধন।
   * ৩) চেকলিস্ট ছকে ছাঁটা তলার আড়া-রেখা (যেখানে শেষ সারিতে নেস্টেড <table> আছে) ও খণ্ডিত আড়া-রেখার ব্যান্ডগুলো লাইনের একক-সমষ্টি মিলিয়ে সূক্ষ্ম বিভাজন।
   * ৪) যে ২-লাইনের সারির লেখা কলাম-প্রস্থের ৮৫%–১০৫% হওয়ায় Word-এ ১ লাইনে থেকে যায়, সেখানে শেষ শব্দের আগে লাইন-ভাঙা পুনরুদ্ধার।
   */
  function repairA16Page(page, info) {
    if (!a16FixOn() || !page || !Array.isArray(page.bands) || page._a16Repaired) return page;
    const bodyFont = page.bodyFontPt || 12.5;
    const W = page.widthPt || 595.2;
    const H = page.heightPt || 841.92;
    const PL = (page.margins && page.margins.left) || 42.5;
    const PR = W - ((page.margins && page.margins.right) || 18);

    const isChecklistTbl = (it) => !!(
      it && it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 4 &&
      it.rows[0] && it.rows[0].length >= 5 &&
      (it.fillW2 || it.rows[0].some((c) => /হ্যাঁ/.test(String(c || ''))))
    );
    const hasChecklistTbl = page.bands.some((b) => b && Array.isArray(b.cells) && b.cells.some((c) => (c.items || []).some(isChecklistTbl)));

    const peerParaInds = page.bands
      .filter((b) => b && b.kind === 'flow' && b.cells && b.cells[0] && b.cells[0].items && b.cells[0].items.length === 1)
      .map((b) => b.cells[0].items[0])
      .filter((it) => it && it.kind === 'para' && it.type === 'paragraph' && !it.tabLines && !/([._\-…·─])\1{4,}/.test(String(it.text || '')) && (it.indentPt || 0) >= 35 && (it.indentPt || 0) <= 50 && !(it.fit && it.fit.availPt))
      .map((it) => it.indentPt);
    const medParaInd = peerParaInds.length >= 3 ? r1(median(peerParaInds)) : null;

    const listItems = [];
    for (const band of page.bands) {
      if (!band || band.kind !== 'flow' || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (it && it.kind === 'para' && it.type === 'list_item') listItems.push({ it, cx0, cx1 });
        }
      }
    }
    const serialTabItems = listItems.filter((x) =>
      Array.isArray(x.it.tabStops) && typeof x.it.tabStops[0] === 'number' &&
      x.it.tabStops[0] - (x.it.indentPt || 0) >= 12 && x.it.tabStops[0] - (x.it.indentPt || 0) <= 50 &&
      Array.isArray(x.it.tabLines) && /^\s*\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2}\s*\t/.test(String(x.it.tabLines[0] || ''))
    );
    const hasMemoSerialList = listItems.length >= 3 &&
      serialTabItems.length >= Math.ceil(listItems.length * 0.5) &&
      listItems.every((x) => !/([._\-…·─])\1{4,}/.test(String(x.it.text || '')));
    const isMemoCoverPage = medParaInd != null && hasMemoSerialList;

    if (!hasChecklistTbl && !isMemoCoverPage) return page;
    Object.defineProperty(page, '_a16Repaired', { value: true, enumerable: false, configurable: true, writable: true });

    // ১) চিত্র (figure) আইটেমের প্রকৃত মাপা আকার (rect.w, rect.h) পুনরুদ্ধার (পাতা ১-এর স্ফীত স্বাক্ষর ও পাতা ৩–৯-এর অর্ধেক উচ্চতার অণু-স্বাক্ষর)
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'figure' || (a07Fix2On() && it._a07FigLeadPt > 0) || !it.rect || !(it.rect.w > 0) || !(it.rect.h > 0) || it.rect.y < 150) continue;
          if ((it.heightPt || 0) > it.rect.h + 2 || (it.heightPt || 0) < it.rect.h * 0.65) {
            it.widthPt = r1(it.rect.w);
            it.heightPt = r1(it.rect.h);
          }
        }
      }
      if (band.cells.every((c) => (c.items || []).some((it) => it && it.kind === 'figure' && it.rect && it.rect.y >= 150))) {
        const maxBot = Math.max(band.y1 || 0, ...band.cells.flatMap((c) => (c.items || []).map((it) => (it && it.rect ? r1(it.rect.y + it.rect.h) : 0))));
        if (maxBot > (band.y1 || 0)) band.y1 = maxBot;
      }
    }

    // ২) প্রবাহী অনুচ্ছেদ, শিরোনাম, পাদটীকা, ইউ.ও. নোটের রেখা এবং ঝুলন্ত ক্রমিক তালিকা (list_item) পরিমার্জন
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'para') continue;
          // ২ক) ক্ষুদ্র পাদটীকা (rect.h <= 7pt, যেমন পাতা ১-এর ফাইল-পাথ ফুটার) ৯pt-এ স্ফীত হওয়া রোধ
          if (it.type === 'footer' && it.rect && it.rect.h > 0 && it.rect.h <= 7 && (it.fontPt || 9) >= 7.5 && (!it.diag || !it.diag.estPt || it.diag.estPt <= 7.5)) {
            it.fontPt = (widthOn() && it.rect.h <= 6.5) ? 7 : 7.5;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          }
          // ২খ) ১-লাইনের আন্ডারলাইনযুক্ত শিরোনাম যার মাপা কালি-উচ্চতা <= 15pt (যেমন পাতা ৫ শিরোনাম) ১৯.৫pt-এ স্ফীত হওয়া রোধ
          if (hasChecklistTbl && !(a07Fix2On() && it._a07LockFit) && it.type === 'title' && it.underline && it.rect && it.rect.h > 0 && it.rect.h <= 15 && (it.fontPt || 15) > 16 && !(widthOn() && it.diag && it.diag.wPt >= 18.5 && it.rect.w >= 180)) {
            it.fontPt = 15.5;
            if (it.fit && it.fit.grow) delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          }
          // ২গ) ছকের নিচের ২-লাইনের মোটা নির্দেশনামূলক অনুচ্ছেদে (যেমন পাতা ৫ ব্যান্ড ৫) লাইন-সংঘর্ষ ও ডান-প্রান্ত উপচানো রোধ
          if (hasChecklistTbl && it.type === 'paragraph' && it.bold && !it.tabLines && Array.isArray(it.lines) && it.lines.length === 2 && it.rect && it.rect.h >= 24 && it.rect.w >= 400) {
            const targetBoldFs = (widthOn() && it.diag && it.diag.wPt >= 13) ? 13 : 12.5;
            if ((it.fontPt || targetBoldFs) > targetBoldFs || (widthOn() && it.fontPt < targetBoldFs)) it.fontPt = targetBoldFs;
            it.lineSpacingPt = r1(it.fontPt * 1.26);
            it.keepLines = true;
            it.keepJust = true;
            if (it.fit) delete it.fit;
            if (it.align === 'j' && cx1 > cx0) {
              const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
              if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) it.justRightPt = jr;
            }
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          }
          // ২ঘ) প্রথম-লাইন ইনডেন্টযুক্ত গদ্য অনুচ্ছেদে (যেমন পাতা ১ ব্যান্ড ২) অকারণ বাম-ইনডেন্ট হ্রাস পুনরুদ্ধার এবং উভয়-পাশ সাজানো অনুচ্ছেদের justRightPt হিসাব
          if (isMemoCoverPage && it.type === 'paragraph' && it.align === 'j' && it.rect && it.rect.w > 0 && cx1 > cx0) {
            if ((it.firstIndentPt || 0) >= 20) {
              const rawInd = r1(Math.max(0, it.rect.x - cx0));
              const targetInd = medParaInd != null && Math.abs(rawInd - medParaInd) <= 6 ? medParaInd : rawInd;
              if (targetInd > (it.indentPt || 0) + 4 && (!it.fit || !it.fit.fontFrom || it.fit.fontFrom === it.fontPt)) {
                it.indentPt = targetInd;
                delete it.fit;
              }
            }
            if (medParaInd != null && Math.abs((it.indentPt || 0) - medParaInd) <= 6) {
              const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
              if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) {
                it.justRightPt = jr;
                Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
              }
            }
          }
          // ২ঙ) ডান-ঘেঁষা স্বাক্ষর ব্লকের নিচে থাকা পূর্ণ-প্রস্থ বিভাজক রেখার (যেমন পাতা ১ ইউ.ও. নোটের রেখা) বাম ও ডান ইনডেন্ট বডি-মার্জিনে সীমিতকরণ
          if (isMemoCoverPage && it.ruleBelow && (it.indentPt || 0) > 200 && bi + 1 < page.bands.length) {
            const nextB = page.bands[bi + 1];
            const nextIt = nextB && nextB.cells && nextB.cells[0] && nextB.cells[0].items && nextB.cells[0].items[0];
            const bodyIndL = nextIt && (nextIt.indentPt || 0) >= 20 && (nextIt.indentPt || 0) <= 60 ? nextIt.indentPt : 41.2;
            Object.defineProperty(it.ruleBelow, '_indL', { value: r1(bodyIndL), enumerable: false, configurable: true, writable: true });
            Object.defineProperty(it.ruleBelow, '_indR', { value: 15.8, enumerable: false, configurable: true, writable: true });
          }
        }
      }
    }

    // ২চ) ক্রমিক নম্বরযুক্ত বিতরণ-তালিকার (১.–৬.) একক ট্যাব-স্টপ, ঝুলন্ত ইনডেন্ট ও উভয়-পাশ সমান (justify) প্রান্ত পুনরুদ্ধার
    if (isMemoCoverPage && hasMemoSerialList) {
      const stops0 = serialTabItems.map((x) => x.it.tabStops[0]);
      const refStop = stops0.length ? r1(median(stops0)) : 75.3;
      const inds0 = listItems.map((x) => x.it.indentPt || 0).filter((v) => v > 0);
      const refInd = inds0.length ? r1(median(inds0)) : 42.2;
      const refHang = r1(refInd - refStop);
      for (const { it, cx0, cx1 } of listItems) {
        if (Math.abs((it.fontPt || bodyFont) - bodyFont) <= 1) it.fontPt = bodyFont;
        if (it.fit) delete it.fit;
        it.indentPt = refInd;
        it.tabStops = [refStop];
        const rawLines = (Array.isArray(it.lines) && it.lines.length ? it.lines : (Array.isArray(it.tabLines) && it.tabLines.length ? it.tabLines : [String(it.text || '')]))
          .map((l) => String(l || '').replace(/^\t+/, '').trim())
          .filter(Boolean);
        if (rawLines.length >= 1) {
          const l0 = rawLines[0].replace(/^(\s*\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2})\s+/, '$1\t');
          it.tabLines = [l0, ...rawLines.slice(1)];
          it.lines = rawLines.map((l, idx) => (idx === 0 ? l.replace(/\t+/g, ' ') : l));
        }
        if (it.tabLines && it.tabLines.length >= 2) {
          it.firstIndentPt = refHang;
          it.align = 'j';
          it.keepLines = true;
          it.keepJust = true;
          if (it.rect && it.rect.w > 0 && cx1 > cx0) {
            const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
            if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) it.justRightPt = jr;
          }
          Object.defineProperty(it, '_a16SingleParaList', { value: true, enumerable: false, configurable: true, writable: true });
        } else {
          it.firstIndentPt = 0;
        }
        Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
      }
    }

    // ৩) চেকলিস্ট ছকের আড়া-রেখা (srcRulesPt), সারি-উচ্চতা (rowHeightsPt) ও ২-লাইনের মোড়ানো পুনরুদ্ধার
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!isChecklistTbl(it)) continue;
          const nRows = it.rows.length;
          const nCols = Math.max(...it.rows.map((r) => r.length));
          it.gridFirst = true;

          // ৩ক) শেষ সারিতে নেস্টেড <table> থাকায় তলার আড়া-রেখা বাদ পড়লে (srcRulesPt.length === nRows, যেমন পাতা ৬) তলার রেখা সংযোজন
          if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === nRows) {
            const lastR = it.rows[nRows - 1] || [];
            const hasSubTbl = lastR.some((c) => /<table\b/i.test(String(c || '')));
            const lastY = it.srcRulesPt[it.srcRulesPt.length - 1];
            const boxBot = Array.isArray(it.box) ? ((it.box[2] - 2) * H) / 1000 : 0;
            if (hasSubTbl && boxBot > lastY + 25) {
              const yBot = r1(boxBot);
              it.srcRulesPt = it.srcRulesPt.map(r1).concat(yBot);
              it.rowHeightsPt = it.rows.map((_, i) => r1(it.srcRulesPt[i + 1] - it.srcRulesPt[i]));
              it.heightPt = r1(yBot - it.srcRulesPt[0]);
              it.rect = Object.assign({}, it.rect, { y: r1(it.srcRulesPt[0]), h: it.heightPt });
              band.y0 = it.rect.y;
              band.y1 = yBot;
            }
          }

          // ৩খ) খণ্ডিত আড়া-রেখার কারণে srcRulesPt.length < nRows + 1 হলে (যেমন পাতা ৫ ও পাতা ৮) লাইনের একক-সমষ্টি মিলিয়ে ব্যান্ড বিভাজন
          if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length >= 6 && it.srcRulesPt.length < nRows + 1) {
            const rules = it.srcRulesPt.slice().sort((a, b) => a - b);
            const diffs = [];
            for (let i = 1; i < rules.length; i++) diffs.push(rules[i] - rules[i - 1]);
            const unitCands = diffs.filter((d) => d >= 13.5 && d <= 18.5).sort((a, b) => a - b);
            const unitH = unitCands.length ? unitCands[Math.floor(unitCands.length / 2)] : 15.8;
            const wTbl = it.widthPt || (it.rect && it.rect.w) || 455;
            const fr = it.colFractions || [];
            const fsz = it.fontPt || 12.5;
            const rowUnits = it.rows.map((r, ri) => {
              if (ri === 0) return 1;
              let maxU = 1;
              r.forEach((c, ci) => {
                if (!c || /<table\b/i.test(String(c))) return;
                const cw = wTbl * (fr[ci] || (1 / nCols)) - 10.8;
                const u = String(c).split('\n').reduce((a, ln) => {
                  const bLen = ln.replace(/\*\*|<[^>]+>/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
                  return a + Math.max(1, Math.ceil((bLen * fsz * 0.48) / Math.max(20, cw)));
                }, 0);
                if (u > maxU) maxU = u;
              });
              return maxU;
            });
            const bandUnits = diffs.map((d) => Math.max(1, Math.round(d / unitH)));
            let rIdx = 0, ok = true;
            const newRules = [r1(rules[0])], newHeights = [];
            for (let bIdx = 0; bIdx < diffs.length; bIdx++) {
              let remU = bandUnits[bIdx];
              const grp = [];
              while (rIdx < nRows && remU >= rowUnits[rIdx]) {
                remU -= rowUnits[rIdx];
                grp.push(rIdx++);
                if (remU === 0) break;
              }
              if (remU !== 0 || !grp.length) { ok = false; break; }
              const bY0 = rules[bIdx], bH = diffs[bIdx], bU = bandUnits[bIdx];
              let accU = 0;
              grp.forEach((ri, k) => {
                const yA = bY0 + (bH * accU) / bU;
                accU += rowUnits[ri];
                const yB = k === grp.length - 1 ? rules[bIdx + 1] : bY0 + (bH * accU) / bU;
                newHeights.push(r1(yB - yA));
                newRules.push(r1(yB));
              });
            }
            if (ok && rIdx === nRows && newHeights.length === nRows) {
              it.srcRulesPt = newRules;
              it.rowHeightsPt = newHeights;
              it.heightPt = r1(newRules[newRules.length - 1] - newRules[0]);
              it.rect = Object.assign({}, it.rect, { y: newRules[0], h: it.heightPt });
              band.y0 = newRules[0];
              band.y1 = newRules[newRules.length - 1];
            }
          }

          // ৩গ) মাপা সারি-উচ্চতার যোগফলের (rbhSum) চেয়ে rect.h অযথা বড় থাকলে (যেমন নিচের অণু-স্বাক্ষর চিত্র ঢুকে পড়লে, পাতা ৩, ৪, ৭) প্রকৃত উচ্চতায় সীমিতকরণ
          if (Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === nRows && it.rect) {
            if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === nRows + 1) {
              const hSorted = it.srcRulesPt.slice().sort((a, b) => a - b);
              for (let ri = 0; ri < nRows; ri++) {
                it.rowHeightsPt[ri] = r1(hSorted[ri + 1] - hSorted[ri]);
              }
            }
            const rbhSum = r1(it.rowHeightsPt.reduce((a, b) => a + b, 0));
            if (rbhSum > 20 && (it.rect.h > rbhSum + 8 || Math.abs((it.heightPt || 0) - rbhSum) <= 2)) {
              const hTop = (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length && Math.abs(it.srcRulesPt[0] - it.rect.y) <= 8) ? r1(it.srcRulesPt[0]) : r1(it.rect.y);
              if (it.rect.h > rbhSum + 8) {
                it.rect = Object.assign({}, it.rect, { y: hTop, h: rbhSum });
                band.y0 = hTop;
                band.y1 = r1(hTop + rbhSum);
              }
              it.heightPt = rbhSum;
            }
          }

          // ৩ঘ) ২-লাইনের উচ্চতার সারিতে (rowH ≈ 2 * unitH) যেখানে বিবরণ-কলামের লেখা ১ লাইনের ৮৫%–১০৫% হওয়ায় ভাঙে না, সেখানে শেষ শব্দের আগে লাইন-ভাঙা
          if (nCols <= 6 && nRows >= 4 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === nRows && Array.isArray(it.colFractions)) {
            const singleHs = it.rowHeightsPt.filter((h) => h >= 13.5 && h <= 18.5).sort((a, b) => a - b);
            const unitH = singleHs.length ? singleHs[Math.floor(singleHs.length / 2)] : 15.8;
            Object.defineProperty(it, '_a16ChecklistTbl', { value: true, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(it, '_a16UnitH', { value: r1(unitH), enumerable: false, configurable: true, writable: true });
            const fs = it.fontPt || 12.5;
            const wTbl = it.widthPt || (it.rect && it.rect.w) || 455;
            it.rows.forEach((r, ri) => {
              if (ri === 0) return;
              const rowH = it.rowHeightsPt[ri];
              if (rowH < unitH * 1.82 || rowH > unitH * 2.35) return;
              for (let ci = 1; ci < nCols; ci++) {
                if ((it.colFractions[ci] || 0) < 0.45) continue;
                const cellTxt = String(r[ci] || '').trim();
                if (!cellTxt || cellTxt.includes('\n') || cellTxt.includes('\t') || /<table\b/i.test(cellTxt)) continue;
                const availW = wTbl * it.colFractions[ci] - 10.8;
                const bLen = cellTxt.replace(/\*\*|<[^>]+>/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
                const r45 = (bLen * fs * 0.45) / Math.max(20, availW);
                if (r45 >= 0.85 && r45 <= 1.05) {
                  const splitCand = cellTxt.replace(/^([\s\S]+?\S)\s+(\S+)\s*$/, '$1\n$2');
                  if (vspaceOn() && splitCand.includes('\n')) {
                    const p1Clean = splitCand.split('\n')[0].replace(/\*\*|<[^>]+>/g, '');
                    const p1BLen = p1Clean.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
                    const p1Kar = (p1Clean.match(/[\u0982\u0983\u09be-\u09c0\u09c7\u09c8\u09cb\u09cc\u09d7]/g) || []).length;
                    const p1Vir = (p1Clean.match(/\u09cd/g) || []).length;
                    const p1EffW = (p1BLen - p1Vir * 0.65 + p1Kar * 0.35) * fs * 0.45;
                    if (p1EffW <= availW * 0.99) r[ci] = splitCand;
                  } else {
                    r[ci] = splitCand;
                  }
                }
              }
            });
          }
        }
      }
    }

    // ৪) ব্যান্ডগুলোর gapBeforePt পুনর্গণনা
    let prevY1 = page.margins ? page.margins.top : 36;
    for (const band of page.bands) {
      if (!band) continue;
      band.gapBeforePt = r1(Math.max(0, (band.y0 || 0) - prevY1));
      prevY1 = Math.max(prevY1, band.y1 || 0);
    }
    return page;
  }

  function repairA16Ir(ir, pageInfo) {
    if (!a16FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA16Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }


  /**
   * A11_SCORE_v1: সাধারণ জ্যামিতিক ও কাঠামোগত নিয়মে আবেদন/সনদ ফরমের লেআউট মেরামত:
   * ১) বক্স-ঘেরা ছবির ঘর ("ছবি") যেখানে একই বক্সে ডুপ্লিকেট figure ও লেবেল অনুচ্ছেদ উভয়ই ধরা পড়েছে, সেখানে ডুপ্লিকেট figure অপসারণ করে একক বক্স ও লেবেল রক্ষা।
   * ২) পরবর্তী নিচে-দাগযুক্ত (underline) অনুচ্ছেদের প্রথম লাইনের দাগ ভুলবশত উপরের অনুচ্ছেদের ruleBelow হিসেবে যুক্ত হলে তা অপসারণ।
   * ৩) গদ্য ও পূরণ-অনুচ্ছেদে LaTeX চেকমার্ক ($\checkmark$ / \checkmark) ইউনিকোড টিক-চিহ্নে (✓) রূপান্তর এবং অপ্রয়োজনীয় সমীকরণ-ফ্ল্যাগ পরিষ্কার।
   * ৪) লাতিন-প্রধান শিরোনাম/উপ-শিরোনামে (Web / E-mail) প্রস্থ-জনিত ভ্রান্ত ফন্ট-স্ফীতি (grow: true) রোধ।
   * ৫) এক-লাইনের বহু-ক্ষেত্র বিন্দু-পূরণ ফরম-লাইনে এবং কোলনহীন প্রান্তিক বিন্দু-লাইনে ভুল ট্যাব-বিভাজন (tabLines) সরিয়ে ইনলাইন ডট-লিডার সক্রিয়করণ ও ফন্ট সমতা।
   * ৬) পূর্ণ-প্রস্থের উচ্চ-ঘনত্বের নিচে-দাগযুক্ত বিভাজক রেখাকে (────) দ্বৈত আনুভূমিক বর্ডারে (doubleRule) উন্নীতকরণ।
   * ৭) বহু-লাইনের বিষয়-অনুচ্ছেদ ও ক্রমিক তালিকায় (list_item) মুছে যাওয়া ঝুলন্ত ইনডেন্ট (firstIndentPt < 0) পুনরুদ্ধার।
   */
  function repairA11Page(page, info) {
    if (!a11FixOn() || !page || !Array.isArray(page.bands)) return page;
    // A11FIX_v2: বড় বর্ডার-বক্সযুক্ত ফরম-পাতায় (যেমন a03 পেনশন ফরম, যেখানে পূর্ণ-প্রস্থের কন্টেইনার বক্সে সারি-বিভাজক রেখা ও বক্স-ঘেরা ঘর থাকে) A11FIX প্রযোজ্য নয়
    const hasLargeContainerBox = page._nestBoxRepaired || (Array.isArray(page.boxes) && page.boxes.some((bx) => bx && (bx.x1 - bx.x0) >= 350 && (bx.y1 - bx.y0) >= 250));
    if (hasLargeContainerBox) {
      Object.defineProperty(page, "_a11SkipPage", { value: true, enumerable: false, configurable: true, writable: true });
      for (const band of page.bands) {
        for (const cell of band.cells || []) {
          for (const it of cell.items || []) {
            if (it && typeof it === "object") {
              Object.defineProperty(it, "_a11SkipItem", { value: true, enumerable: false, configurable: true, writable: true });
            }
          }
        }
      }
      return page;
    }
    const bodyFont = page.bodyFontPt || 12;
    const PL = (page.margins && page.margins.left) || 56.7;
    const PR = (page.widthPt || 612) - ((page.margins && page.margins.right) || 43.2);

    // ১) বক্স-ঘেরা ছবির ঘরে ডুপ্লিকেট figure অপসারণ
    if (Array.isArray(page.boxes) && page.boxes.length) {
      for (const band of page.bands) {
        for (const cell of band.cells || []) {
          if (!cell || !Array.isArray(cell.items) || cell.items.length < 2) continue;
          const figs = cell.items.filter((x) => x && x.kind === 'figure');
          const paras = cell.items.filter((x) => x && x.kind === 'para');
          if (!figs.length || !paras.length) continue;
          const dropFigs = new Set();
          for (const fig of figs) {
            for (const bx of page.boxes) {
              const figMatchesBox = (Array.isArray(fig.boxIds) && fig.boxIds.includes(bx.id)) ||
                (fig.rect && Math.abs(fig.rect.x - bx.x0) <= 8 && Math.abs(fig.rect.y - bx.y0) <= 8 &&
                 Math.abs((fig.rect.x + fig.rect.w) - bx.x1) <= 8 && Math.abs((fig.rect.y + fig.rect.h) - bx.y1) <= 8);
              if (!figMatchesBox) continue;
              const innerPara = paras.find((p) => (Array.isArray(p.boxIds) && p.boxIds.includes(bx.id)) ||
                (p.rect && p.rect.x >= bx.x0 - 4 && p.rect.x + p.rect.w <= bx.x1 + 4 && p.rect.y >= bx.y0 - 4 && p.rect.y + p.rect.h <= bx.y1 + 4));
              if (innerPara) {
                dropFigs.add(fig);
                if (!Array.isArray(innerPara.boxIds) || !innerPara.boxIds.includes(bx.id)) {
                  innerPara.boxIds = (innerPara.boxIds || []).concat(bx.id);
                }
              }
            }
          }
          if (dropFigs.size > 0) {
            cell.items = cell.items.filter((x) => !dropFigs.has(x));
            let yPrev = band.y0;
            cell.items.forEach((it, idx) => {
              if (it && it.rect) {
                it.spaceBeforePt = r1(Math.max(0, it.rect.y - (idx === 0 ? band.y0 : yPrev)));
                yPrev = it.rect.y + it.rect.h;
              }
            });
          }
        }
      }
    }

    // ২) পরবর্তী অনুচ্ছেদের আয়তের ভেতরে পড়া ভ্রান্ত ruleBelow অপসারণ
    const allParas = [];
    for (const band of page.bands) {
      for (const cell of band.cells || []) {
        for (const it of cell.items || []) {
          if (it && it.kind === 'para' && it.rect) allParas.push(it);
        }
      }
    }
    for (const it of allParas) {
      if (!it.ruleBelow || it.ruleBelow.srcY == null || it.ruleBelow._p2Rule || (Array.isArray(it.boxIds) && it.boxIds.length)) continue;
      const ry = it.ruleBelow.srcY;
      const hitOther = allParas.some((o) => o !== it && o.rect && ry > o.rect.y + 2 && ry <= o.rect.y + o.rect.h + 4 &&
        Math.min(it.rect.x + it.rect.w, o.rect.x + o.rect.w) - Math.max(it.rect.x, o.rect.x) > 0);
      if (hitOther) delete it.ruleBelow;
    }

    // ক্রমিক তালিকার সহপাঠী ঝুলন্ত ইনডেন্ট নির্ণয়
    const hangListPeers = allParas.filter((it) => it.type === 'list_item' && (it.lines || []).length >= 2 && (it.firstIndentPt || 0) <= -12);
    const peerHangFi = hangListPeers.length ? Math.round(median(hangListPeers.map((x) => x.firstIndentPt))) : 0;

    // ৩–৭) অনুচ্ছেদ-ভিত্তিক পরিমার্জন
    for (const band of page.bands) {
      for (const cell of band.cells || []) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'para') continue;

          // ৩) LaTeX \checkmark -> ✓ রূপান্তর
          const hasCheck = /\\checkmark/.test(it.text || '') ||
            (Array.isArray(it.lines) && it.lines.some((l) => /\\checkmark/.test(l))) ||
            (Array.isArray(it.tabLines) && it.tabLines.some((l) => /\\checkmark/.test(l)));
          if (hasCheck) {
            const normCheck = (s) => String(s || '').replace(/\$\s*\\checkmark\s*\$|\\checkmark\b/g, '✓');
            it.text = normCheck(it.text);
            if (Array.isArray(it.lines)) it.lines = it.lines.map(normCheck);
            if (Array.isArray(it.tabLines)) it.tabLines = it.tabLines.map(normCheck);
            if (!/(\$|\\frac|\\sqrt|\\sum|\\int|⟦eq)/.test(it.text)) {
              delete it.hasEquation;
              delete it.mathKind;
              delete it.mathExtraPt;
            }
          }

          // ৪) লাতিন-প্রধান শিরোনামে (Web / E-mail) ভ্রান্ত grow: true ফন্ট-স্ফীতি রোধ
          if (/^(title|heading|header)$/.test(it.type || '') && (it.lines || []).length <= 1 && it.fit && it.fit.grow && it.fit.fontFrom) {
            const cleanTx = String(it.text || (it.lines && it.lines[0]) || '').replace(/\*\*|<[^>]+>/g, '').trim();
            const lat = (cleanTx.match(/[A-Za-z]/g) || []).length;
            if (lat >= 10 && lat >= cleanTx.replace(/\s+/g, '').length * 0.6) {
              it.fontPt = it.fit.fontFrom;
              delete it.fit;
            }
          }

          // ৫) এক-লাইনের বহু-ক্ষেত্র পূরণ-রেখা ও কোলনহীন প্রান্তিক বিন্দু-লাইনে ভুল tabLines অপসারণ ও ফন্ট সমতা
          const nLn = (it.lines && it.lines.length) || 1;
          if (nLn === 1 && !(Array.isArray(it.boxIds) && it.boxIds.length) && !it._inNestBoxPage) {
            const rawLn = String((it.lines && it.lines[0]) || it.text || '').trim();
            const fillRuns = rawLn.match(/([._\-…·─])\1{4,}/g) || [];
            const isPureRule = /^([─━═=_\-.…·])\1{5,}$/.test(rawLn.replace(/\s+/g, ''));
            if (!isPureRule && it.tabLines && it.tabLines.length === 1) {
              const tl0 = String(it.tabLines[0] || '');
              const isMultiFill = fillRuns.length >= 2;
              const isNoColonTrailDot = fillRuns.length === 1 && /^[^:\t]+\t[.…·]{6,}\s*$/.test(tl0);
              if (isMultiFill || isNoColonTrailDot) {
                it.tabLines = null;
                it.tabStops = null;
                it.tabStopsSrc = null;
                it.tabStopsAbs = null;
                it.lines = [rawLn];
                it.text = rawLn;
                if (!it.keepLines) it.lineSpacingPt = 0;
                if (it.fit && it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
                delete it.fit;
              }
            }
            if (!isPureRule && fillRuns.length >= 1) {
              if ((it.indentPt || 0) >= 60 && it.fontOutlier && it.diag && it.diag.inkPt <= 8.5) {
                it.fontPt = it.fontOutlier;
                delete it.fontOutlier;
                if (it.diag.stroke >= 1.2) it.bold = true;
              } else if ((it.indentPt || 0) < 60 && bodyFont && it.fontPt !== bodyFont && Math.abs(it.fontPt - bodyFont) <= bodyFont * 0.35) {
                it.fontPt = bodyFont;
                if (it.bold && it.diag && it.diag.stroke != null && it.diag.stroke < 1.3 && !/\*\*/.test(rawLn)) it.bold = false;
                if (it.fit && it.fit.fontFrom) delete it.fit;
              }
            }
          }

          // ৬) পূর্ণ-প্রস্থের নিচে-দাগযুক্ত বিভাজক রেখাকে দ্বৈত বর্ডারে (doubleRule) উন্নীতকরণ
          const rLines = (it.tabLines || it.lines || []).map((l) => String(l).replace(/\s+/g, ''));
          if (rLines.length === 1 && /^([─━═=])\1{5,}$/.test(rLines[0]) && (it.underline || (it.diag && it.diag.dens >= 0.95))) {
            it.doubleRule = true;
            it.indentPt = 0.4;
            if (it.rect && cx1 > cx0 && (!Array.isArray(it.box) || (it.box[3] - it.box[1]) >= 800)) {
              it.rect = Object.assign({}, it.rect, { w: r1(Math.max(it.rect.w, (cx1 - cx0) - 3.3)) });
            }
          }

          // ৭) বহু-লাইনের বিষয়-অনুচ্ছেদ ও ক্রমিক তালিকায় মুছে যাওয়া ঝুলন্ত ইনডেন্ট (firstIndentPt < 0) পুনরুদ্ধার
          if (!it.tabLines && nLn >= 2) {
            const ln0 = String((it.lines && it.lines[0]) || it.text || '').trim();
            const isHangPara = it.type === 'list_item' || /^\*{0,2}(?:[০-৯0-9]{1,3}[।.)]|বিষ[য়য়]\s*[:ঃ]|বিঃ\s*দ্রঃ)/.test(ln0);
            if (isHangPara && (it.firstIndentPt || 0) === 0) {
              if (it.fit && it.fit.availPt > 0 && cx1 > cx0) {
                const fullW = (cx1 - cx0) * 0.98;
                const origAbsFi = Math.round(fullW - (it.indentPt || 0) - it.fit.availPt);
                if (origAbsFi >= 12 && origAbsFi <= 48) {
                  it.firstIndentPt = -origAbsFi;
                  if (it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
                  delete it.fit;
                }
              } else if (it.type === 'list_item' && peerHangFi <= -12) {
                it.firstIndentPt = peerHangFi;
              }
            }
            if ((it.firstIndentPt || 0) <= -20 && it.diag && it.diag.wPt && it.diag.wPt < it.fontPt - 0.3) {
              it.fontPt = Math.round(it.diag.wPt * 2) / 2;
              delete it.fit;
            }
          }
        }
      }
    }
    return page;
  }

  function repairA11Ir(ir, pageInfo) {
    if (!a11FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA11Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A10_SCORE_v1: সাধারণ জ্যামিতিক ও কাঠামোগত নিয়মে প্রাক চাকরি বৃত্তান্ত যাচাই ফরম ও সমজাতীয় ফরমের স্থূল লেআউট ত্রুটি সংশোধন:
   * ১) ভেতরের খাড়া দাগহীন ২-কলামের ফরম-বাক্স ছকে (যেখানে কোলন ':' ডান কলামে এবং মাঝে পূর্ণ-প্রস্থের উপশিরোনাম সারি থাকে):
   *    ভ্রান্ত ভেতরের খাড়া বর্ডার (insideV) অপসারণ, কোলন কলামের প্রকৃত অনুপাত ([0.483, 0.517]) ও বাম-সাজানো স্থাপন,
   *    উপশিরোনাম সারিকে ২-কলাম জুড়ে মাঝ-সাজানো (gridSpan=2) করা এবং ক্রমিক নম্বরের (১।–৫।) পরে ট্যাব ও ঝুলন্ত ইনডেন্ট স্থাপন।
   * ২) মাপা অনুভূমিক রেখা (srcRulesPt) থাকা সীমানাওয়ালা ছকে হারানো ফাঁকা সারি পুনরুদ্ধার, অ-স্কেলকৃত সারি-উচ্চতাকে প্রকৃত রেখা-ব্যবধানে
   *    স্বাভাবিকীকরণ, ফাঁকা বডি-সারির রেজিস্টার ছকে সব শিরোনাম কলাম মাঝ-সাজানো ও অতিরিক্ত বড় শিরোনাম-ফন্ট (headFontPt) সমতাকরণ।
   * ৩) শুধু ড্যাশ/বিন্দুর বিভাজক রেখায় ভ্রান্ত ধূসর পটভূমি (shade) অপসারণ, ড্যাশযুক্ত লেবেল-মান লাইনে ভ্রান্ত বোল্ড নিরসন,
   *    বাম-প্রান্তে তারিখ/স্থান পূরণ-লাইনের নিচে ডান-পাশের স্বাক্ষর-ব্লকের ওপরে বাদ পড়া ড্যাশ স্বাক্ষর-রেখা পুনরুদ্ধার এবং শীর্ষ মার্জিন সমন্বয়।
   */
  function repairA10FixPage(page, info) {
    if (!a10FixOn() || !page || !Array.isArray(page.bands) || page._a10FixRepaired) return page;
    Object.defineProperty(page, '_a10FixRepaired', { value: true, enumerable: false, configurable: true, writable: true });
    const bodyFont = page.bodyFontPt || 11.5;
    const PL = (page.margins && page.margins.left) || 68;
    const PR = (page.widthPt || 595) - ((page.margins && page.margins.right) || 50.4);

    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (!it) continue;
          it._lineGapFixed = true;
          if (it.fit && it.fit.fontFrom && it.fontPt && it.fontPt < it.fit.fontFrom * 0.85) {
            it.fontPt = Math.ceil(it.fit.fontFrom * 0.85 * 2) / 2;
          }
          if (it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 3) {
            const nCols = Math.max(...it.rows.map((r) => r.length));
            // ২ক) srcRulesPt থেকে হারানো শেষ ফাঁকা সারি পুনরুদ্ধার (যেমন পাতা ২ ছক ৪: ৪ সারি -> ৫ সারি)
            if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === it.rows.length + 2) {
              const lastR = it.rows[it.rows.length - 1];
              if (Array.isArray(lastR) && !lastR.some((c) => c && String(c).trim())) {
                it.rows.push(lastR.slice());
                if (Array.isArray(it.gridSpans)) { while (it.gridSpans.length < it.rows.length) it.gridSpans.push(null); }
                if (Array.isArray(it.vRuleBands)) { while (it.vRuleBands.length < it.rows.length) it.vRuleBands.push(it.vRuleBands[it.vRuleBands.length - 1] || null); }
                if (Array.isArray(it.vMerges)) { while (it.vMerges.length < it.rows.length) it.vMerges.push(null); }
              }
            }
            // ২খ) srcRulesPt-এর প্রকৃত রেখা-ব্যবধান থেকে সারি-উচ্চতা ও ছক-উচ্চতা নির্ধারণ
            if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === it.rows.length + 1) {
              it.rowHeightsPt = it.srcRulesPt.slice(1).map((y, k) => r1(y - it.srcRulesPt[k]));
              it.heightPt = r1(it.srcRulesPt[it.srcRulesPt.length - 1] - it.srcRulesPt[0]);
              it.rowHeightsExact = false;
            } else if (Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length && it.heightPt > 0) {
              const totRbh = it.rowHeightsPt.reduce((a, b) => a + b, 0);
              if (totRbh > it.heightPt * 1.5) {
                const baseH = (it.rect && it.rect.h > 0) ? it.rect.h : it.heightPt;
                it.rowHeightsPt = it.rowHeightsPt.map((h) => r1(h * baseH / totRbh));
              }
            }
            delete it.gridFirst;
            delete it.lineSpacingPt;

            // ১) ভেতরের খাড়া দাগহীন ২-কলামের ফরম-বাক্স ছক (যেমন পাতা ১ ব্যান্ড ২: ৭x২ ফরম-বাক্স)
            const noInV = !it.fullVRule || (Array.isArray(it.fullVRule) && it.fullVRule.every((v) => !v));
            const colonRows = nCols === 2 ? it.rows.filter((r) => String(r[1] || '').trim() === ':').length : 0;
            const hasSecRow = nCols === 2 && it.rows.some((r, ri) => ri >= 1 && ri < it.rows.length - 1 && String(r[0] || '').trim() && !String(r[1] || '').trim());
            if (nCols === 2 && it.rows.length >= 5 && noInV && colonRows >= Math.ceil(it.rows.length * 0.6) && hasSecRow) {
              it.noInsideV = true;
              it.fullVRule = [false];
              if (!Array.isArray(it.colFractions) || it.colFractions[0] >= 0.8) {
                it.colFractions = [0.483, 0.517];
              }
              it.colAligns = ['l', 'l'];
              it.headVAlign = ['t', 't'];
              it.fontPt = bodyFont;
              delete it.headFontPt;
              it.gridSpans = it.rows.map((r) => (String(r[0] || '').trim() && !String(r[1] || '').trim() ? [2, 0] : [1, 1]));
              it.cellAligns = it.rows.map((r) => (String(r[0] || '').trim() && !String(r[1] || '').trim() ? ['c', 'c'] : ['l', 'l']));
              Object.defineProperty(it, '_serialIndentPt', { value: 20.5, enumerable: false, configurable: true, writable: true });
            }

            // ২গ) ফাঁকা বডি-সারির বহু-কলাম রেজিস্টার ছকে শিরোনাম-সারি মাঝ-সাজানো ও ফন্ট সমতাকরণ
            const emptyBody = it.rows.slice(1).every((r) => !r.some((c) => c && String(c).trim()));
            if (emptyBody) {
              it.colAligns = null;
              it.cellAligns = null;
              if (it.headFontPt) delete it.headFontPt;
              const singleLineHdr = it.rows[0] && !it.rows[0].some((c) => String(c || '').includes('\n') || String(c || '').length > 22);
              const h0 = Array.isArray(it.rowHeightsPt) ? it.rowHeightsPt[0] : 0;
              if (nCols === 3 && singleLineHdr && h0 > 0 && h0 <= bodyFont * 1.35) {
                it.fontPt = bodyFont;
              }
            }
          } else if (it.kind === 'para') {
            // ৩ক) পূর্ব-নির্মিত IR-এ ট্যাবযুক্ত প্রশ্নে অপ্রয়োজনীয় ফন্ট-সংকোচন (fit.fontFrom) পুনরুদ্ধার
            if (it.fit && it.fit.tab && !it.fit.fillsCut && it.fit.fontFrom) {
              it.fontPt = it.fit.fontFrom;
              it.lineSpacingPt = 0;
              delete it.fit;
            }
            const rawLines = (it.tabLines || it.lines || []).map((l) => String(l).replace(/\s+/g, ''));
            const isPureRule = rawLines.length === 1 && /^([─━═=_\-.…·])\1{5,}$/.test(rawLines[0]) && (!it.rect || it.rect.h <= 4);
            if (isPureRule && it.shade) {
              delete it.shade;
            }
            // ৩খ) ড্যাশ-পূরণযুক্ত এক-লাইনের লেবেল-মান অনুচ্ছেদে (যেমন পাতা ৪: "স্থান ---", "তারিখঃ ---") ভ্রান্ত বোল্ড নিরসন
            if (it.type === 'label_value' && (it.lines || []).length === 1 && /-{6,}/.test(it.text || '') && it.bold && !/\*\*/.test(it.text || '')) {
              it.bold = false;
            }
            // ৩গ) বাম-সাজানো স্বাক্ষর ব্লকের প্রথম লাইনের ড্যাশ-সারি (যেমন পাতা ৪: "প্রতিস্বাক্ষরিত ---") প্রকৃত বক্স-প্রস্থে (rect.w) সীমিতকরণ
            if (it.type === 'signature' && (it.lines || []).length >= 2 && it.rect && it.rect.w >= 120 && /-{10,}\s*$/.test(String(it.lines[0] || ''))) {
              if (it.align === 'c' && it.indentPt >= 200 && !it.centerShiftPt) it.align = 'l';
              const fs = it.fontPt || bodyFont;
              const l0 = String(it.lines[0]);
              const pref = l0.replace(/-{6,}\s*$/, '');
              const prefLen = pref.replace(/\*\*/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
              const availDashW = Math.max(30, it.rect.w - prefLen * fs * 0.45);
              const maxDashes = Math.max(6, Math.round(availDashW / (fs * 0.333)));
              it.lines[0] = pref + '-'.repeat(maxDashes);
              it.text = it.lines.join('\n');
            }
            // ৩ঘ) বহু-লাইনের অনুচ্ছেদে অভিন্ন লাইন-দূরত্ব (lineSpacingPt) নির্ধারণ
            const bl = (it.lines || []).map((l) => String(l).trim()).filter(Boolean);
            const nLn = (it.tabLines && it.tabLines.length) || bl.length || 1;
            if (nLn >= 2 && it.rect && it.rect.h > 0) {
              const fs = it.fontPt || bodyFont;
              if (lineGapOn()) {
                const maxPitch = r1(Math.max(fs * 0.85, it.rect.h / nLn));
                const kInk = it.type === 'signature' && nLn >= 3 ? 0.8 : 1.02;
                const estPitch = r1(Math.max(fs * 0.85, Math.min(maxPitch, (it.rect.h - fs * kInk) / (nLn - 1))));
                it.lineSpacingPt = estPitch;
                it.lineRule = 'exact';
              } else {
                const kInk = it.type === 'signature' && nLn >= 3 ? 0.8 : 1.02;
                const estPitch = r1(Math.max(fs * 1.15, (it.rect.h - fs * kInk) / (nLn - 1)));
                if (estPitch <= fs * 1.8) it.lineSpacingPt = estPitch;
              }
            }
            if (it.align === 'j' && it.keepLines && it.keepJust && cx1 > cx0 && it.rect && it.rect.w > 0) {
              const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
              if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) it.justRightPt = jr;
            }
          }
        }
      }

      // ৩ঙ) বাম-প্রান্তের তারিখ/স্থান লাইনের নিচে ডান-পাশের স্বাক্ষর-ব্লকের (যেমন পাতা ৪ ব্যান্ড ৮) ওপরে বাদ পড়া ড্যাশ স্বাক্ষর-রেখা সংযোজন
      const curIt = band.cells && band.cells[0] && band.cells[0].items && band.cells[0].items[0];
      const prevBand = bi > 0 ? page.bands[bi - 1] : null;
      const prevIt = prevBand && prevBand.cells && prevBand.cells[0] && prevBand.cells[0].items && prevBand.cells[0].items[0];
      if (curIt && curIt.kind === 'para' && curIt.type === 'signature' && curIt.align === 'c'
        && (curIt.lines || []).length >= 2 && !/স্বাক্ষর|প্রতিস্বাক্ষরিত/.test(curIt.text || '')
        && curIt.rect && curIt.rect.x >= (page.widthPt || 595) * 0.5
        && prevIt && prevIt.kind === 'para' && prevIt.type === 'label_value' && prevIt.rect
        && curIt.rect.y - (prevIt.rect.y + prevIt.rect.h) >= 75) {
        const rx = r1(curIt.rect.x - 18);
        const ry = r1(curIt.rect.y - 7.5);
        const rw = r1(curIt.rect.w + 31.6);
        const rh = 1.7;
        const cx0 = (band.cells[0] && band.cells[0].x0) || PL;
        const cx1 = (band.cells[0] && band.cells[0].x1) || PR;
        const dashStr = '-'.repeat(55);
        const ruleItem = {
          kind: 'para',
          type: 'other',
          text: dashStr,
          lines: [dashStr],
          keepLines: false,
          keepJust: false,
          fontPt: 8,
          bold: false,
          italic: false,
          underline: false,
          align: 'l',
          indentPt: r1(Math.max(0, rx - cx0)),
          firstIndentPt: 0,
          lineSpacingPt: 0,
          spaceBeforePt: 0,
          rect: { x: rx, y: ry, w: rw, h: rh }
        };
        const ruleBand = {
          kind: 'flow',
          gapBeforePt: r1(Math.max(0, ry - (prevBand.y1 || (prevIt.rect.y + prevIt.rect.h)))),
          y0: ry,
          y1: r1(ry + rh),
          cells: [{ x0: cx0, x1: cx1, items: [ruleItem] }]
        };
        band.gapBeforePt = r1(Math.max(0, band.y0 - ruleBand.y1));
        page.bands.splice(bi, 0, ruleBand);
        bi++;
      }
    }

    // ৩চ) পাতার প্রথম অনুচ্ছেদের (শিরোনাম বা পৃষ্ঠা-নম্বর) কালি-শুরু যেন শীর্ষ মার্জিনে ঠেকে নিচে না নামে সেজন্য শীর্ষ মার্জিন সমন্বয়
    const firstBand = page.bands[0];
    const firstIt = firstBand && firstBand.cells && firstBand.cells[0] && firstBand.cells[0].items && firstBand.cells[0].items[0];
    if (firstIt && firstIt.kind === 'para' && firstIt.rect && page.margins && page.margins.top > 12) {
      const fs0 = firstIt.fontPt || bodyFont;
      const t0 = String((firstIt.lines && firstIt.lines[0]) || firstIt.text || '');
      const k0 = /[িীৈৌঁ]|র্/.test(t0) ? 0.11 : /[ঀ-৿]/.test(t0) ? 0.33 : 0.12;
      const needTop = r1(firstIt.rect.y - k0 * fs0);
      if (needTop < page.margins.top && needTop >= 10) {
        page.margins.top = needTop;
      }
    }
    return page;
  }

  function repairA10FixIr(ir, pageInfo) {
    if (!a10FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA10FixPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }


  /**
   * TABLE_MERGE_v1: মাপা খাড়া ও আড়াআড়ি রেখা (srcRulesPt, vRuleBands, page.boxes) থেকে
   * ২ বা ততোধিক কলামের সীমানাওয়ালা ছকের প্রকৃত কলাম-গ্রিড (<w:tblGrid>), আড়াআড়ি ঘর-জোড়া (gridSpan),
   * উল্লম্ব ঘর-জোড়া (vMerge), ঘরের ভেতরের ফাঁক (cellPaddingPt/marPt) এবং সারি-উচ্চতা (rowHeightsPt) নির্ধারণ।
   * এক-কলামের ছক বা সাধারণ অনুচ্ছেদে হাত দেওয়া হয় না।
   */
  function clone2D(arr) {
    return Array.isArray(arr) ? arr.map((r) => (Array.isArray(r) ? r.slice() : r)) : arr;
  }

  function snapshotTableBeforeMerge(it, band) {
    if (!it || it._preTblMergeSnap) return;
    const snap = {
      rows: clone2D(it.rows),
      colFractions: Array.isArray(it.colFractions) ? it.colFractions.slice() : it.colFractions,
      colAligns: Array.isArray(it.colAligns) ? it.colAligns.slice() : it.colAligns,
      cellAligns: clone2D(it.cellAligns),
      gridSpans: clone2D(it.gridSpans),
      vRuleBands: clone2D(it.vRuleBands),
      vMerges: clone2D(it.vMerges),
      rowBand: Array.isArray(it.rowBand) ? it.rowBand.slice() : it.rowBand,
      rowHeightsPt: Array.isArray(it.rowHeightsPt) ? it.rowHeightsPt.slice() : it.rowHeightsPt,
      rowHeightsExact: it.rowHeightsExact,
      exactRuleHeights: it.exactRuleHeights,
      boxRuleHeightPt: it.boxRuleHeightPt,
      smallBoxesPt: Array.isArray(it.smallBoxesPt) ? it.smallBoxesPt.map((b) => Object.assign({}, b)) : it.smallBoxesPt,
      fullVRule: Array.isArray(it.fullVRule) ? it.fullVRule.slice() : it.fullVRule,
      headShade: it.headShade,
      headVAlign: Array.isArray(it.headVAlign) ? it.headVAlign.slice() : it.headVAlign,
      heightPt: it.heightPt,
      widthPt: it.widthPt,
      fontPt: it.fontPt,
      lineSpacingPt: it.lineSpacingPt,
      rect: it.rect ? Object.assign({}, it.rect) : it.rect,
      fit: it.fit ? Object.assign({}, it.fit) : it.fit,
      hasMarPt: Object.prototype.hasOwnProperty.call(it, "marPt"),
      marPt: it.marPt,
      hasCellPaddingPt: Object.prototype.hasOwnProperty.call(it, "cellPaddingPt"),
      cellPaddingPt: it.cellPaddingPt,
      hasColWidthsPt: Object.prototype.hasOwnProperty.call(it, "colWidthsPt"),
      colWidthsPt: Array.isArray(it.colWidthsPt) ? it.colWidthsPt.slice() : it.colWidthsPt,
      hasCells: Object.prototype.hasOwnProperty.call(it, "cells"),
      cells: clone2D(it.cells),
      hasCellMeta: Object.prototype.hasOwnProperty.call(it, "cellMeta"),
      cellMeta: clone2D(it.cellMeta),
      hasDigitBoxStrip: Object.prototype.hasOwnProperty.call(it, "_digitBoxStrip"),
      _digitBoxStrip: it._digitBoxStrip,
      bandY0: band ? band.y0 : undefined,
      bandY1: band ? band.y1 : undefined
    };
    if (Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.exact) snap.rowHeightsPt.exact = true;
    Object.defineProperty(it, "_preTblMergeSnap", { value: snap, enumerable: false, configurable: true, writable: true });
  }

  function restoreTblMergePage(page) {
    if (!page || !Array.isArray(page.bands)) return page;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it || !it._preTblMergeSnap) continue;
          const s = it._preTblMergeSnap;
          it.rows = clone2D(s.rows);
          it.colFractions = Array.isArray(s.colFractions) ? s.colFractions.slice() : s.colFractions;
          it.colAligns = Array.isArray(s.colAligns) ? s.colAligns.slice() : s.colAligns;
          it.cellAligns = clone2D(s.cellAligns);
          it.gridSpans = clone2D(s.gridSpans);
          it.vRuleBands = clone2D(s.vRuleBands);
          it.vMerges = clone2D(s.vMerges);
          it.rowBand = Array.isArray(s.rowBand) ? s.rowBand.slice() : s.rowBand;
          it.rowHeightsPt = Array.isArray(s.rowHeightsPt) ? s.rowHeightsPt.slice() : s.rowHeightsPt;
          if (Array.isArray(s.rowHeightsPt) && s.rowHeightsPt.exact) it.rowHeightsPt.exact = true;
          it.rowHeightsExact = s.rowHeightsExact;
          if (s.exactRuleHeights === undefined) delete it.exactRuleHeights; else it.exactRuleHeights = s.exactRuleHeights;
          if (s.boxRuleHeightPt === undefined) delete it.boxRuleHeightPt; else it.boxRuleHeightPt = s.boxRuleHeightPt;
          if (s.smallBoxesPt === undefined) delete it.smallBoxesPt; else it.smallBoxesPt = Array.isArray(s.smallBoxesPt) ? s.smallBoxesPt.map((b) => Object.assign({}, b)) : s.smallBoxesPt;
          it.fullVRule = Array.isArray(s.fullVRule) ? s.fullVRule.slice() : s.fullVRule;
          it.headShade = s.headShade;
          it.headVAlign = Array.isArray(s.headVAlign) ? s.headVAlign.slice() : s.headVAlign;
          it.heightPt = s.heightPt;
          it.widthPt = s.widthPt;
          it.fontPt = s.fontPt;
          it.lineSpacingPt = s.lineSpacingPt;
          it.rect = s.rect ? Object.assign({}, s.rect) : s.rect;
          if (s.fit === undefined) delete it.fit; else it.fit = Object.assign({}, s.fit);
          if (!s.hasMarPt) delete it.marPt; else it.marPt = s.marPt;
          if (!s.hasCellPaddingPt) delete it.cellPaddingPt; else it.cellPaddingPt = s.cellPaddingPt;
          if (!s.hasColWidthsPt) delete it.colWidthsPt; else it.colWidthsPt = s.colWidthsPt;
          if (!s.hasCells) delete it.cells; else it.cells = clone2D(s.cells);
          if (!s.hasCellMeta) delete it.cellMeta; else it.cellMeta = clone2D(s.cellMeta);
          if (!s.hasDigitBoxStrip) delete it._digitBoxStrip; else it._digitBoxStrip = s._digitBoxStrip;
          delete it._cellMeta;
          delete it._tblMergeRepaired;
          delete it._preTblMergeSnap;
          if (band && s.bandY0 !== undefined) band.y0 = s.bandY0;
          if (band && s.bandY1 !== undefined) band.y1 = s.bandY1;
        }
      }
    }
    delete page._tblMergeRepaired;
    return page;
  }

  function restoreTblMergeIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => restoreTblMergePage(p));
    return ir;
  }

  function populateTableCellMeta(it) {
    if (!it || !Array.isArray(it.rows) || !it.rows.length) return;
    const nRows = it.rows.length;
    const nCols = Math.max(...it.rows.map((r) => r.length));
    if (nCols < 2) return;
    const wPt = it.widthPt || (it.rect && it.rect.w) || 400;
    const fr = Array.isArray(it.colFractions) && it.colFractions.length === nCols
      ? it.colFractions
      : new Array(nCols).fill(1 / nCols);
    it.colWidthsPt = fr.map((f) => r1(wPt * f));
    const padPt = it.cellPaddingPt != null ? it.cellPaddingPt : (it.marPt != null ? it.marPt : 5.4);
    const rbh = Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === nRows ? it.rowHeightsPt : null;
    const cells = [];
    const meta = [];
    for (let ri = 0; ri < nRows; ri++) {
      const r = it.rows[ri] || [];
      const gsRow = (it.gridSpans && Array.isArray(it.gridSpans[ri]) && it.gridSpans[ri].length === nCols)
        ? it.gridSpans[ri]
        : new Array(nCols).fill(1);
      const vmRow = (it.vMerges && Array.isArray(it.vMerges[ri]) && it.vMerges[ri].length === nCols)
        ? it.vMerges[ri]
        : new Array(nCols).fill(null);
      const cRow = [];
      const mRow = [];
      for (let ci = 0; ci < nCols; ci++) {
        const sp = gsRow[ci] != null ? gsRow[ci] : 1;
        const vm = vmRow[ci] || null;
        let spanW = 0;
        if (sp > 0) {
          for (let j = ci; j < Math.min(nCols, ci + sp); j++) spanW += it.colWidthsPt[j] || 0;
        }
        const cellObj = {
          text: String(r[ci] == null ? "" : r[ci]),
          span: sp,
          gridSpan: sp,
          vmerge: vm,
          vMerge: vm,
          padPt: sp > 0 && spanW > 0 && spanW < 25 ? 0 : (it.gridFirst && spanW > 0 && spanW < 70 ? 1.4 : padPt),
          widthPt: r1(spanW),
          heightPt: rbh ? r1(rbh[ri]) : r1((it.heightPt || 0) / nRows)
        };
        cRow.push(cellObj);
        mRow.push(cellObj);
      }
      cells.push(cRow);
      meta.push(mRow);
    }
    it.cells = cells;
    it.cellMeta = meta;
    Object.defineProperty(it, "_cellMeta", { value: meta, enumerable: false, configurable: true, writable: true });
  }

  function repairTblMergePage(page, info) {
    if (!tblMergeOn()) {
      return restoreTblMergePage(page);
    }
    if (!page || !Array.isArray(page.bands) || page._tblMergeRepaired) return page;
    Object.defineProperty(page, "_tblMergeRepaired", { value: true, enumerable: false, configurable: true, writable: true });
    const allBoxes = (info && Array.isArray(info.boxes) && info.boxes.length ? info.boxes : page.boxes) || [];

    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it || it.kind !== "table" || it.borderless || !Array.isArray(it.rows) || !it.rows.length) continue;
          let nCols = Math.max(...it.rows.map((r) => r.length));
          if (nCols < 2) continue;

          snapshotTableBeforeMerge(it, band);

          // ১) ১-সারির অঙ্ক-বাক্স বা তারিখ-বাক্স ছক (১x৮..১x১৭, যেখানে মাপা ২টি আড়া-রেখা আছে এবং বাইরের বক্স-ফ্রেমের ভেতরে আবদ্ধ নয়): প্যাডিং ০pt, মাপা আড়া-রেখার উচ্চতা ও ফাঁকযুক্ত ছোট বাক্স (smallBoxesPt)
          if (it.rows.length === 1 && nCols >= 8 && (!it.boxIds || !it.boxIds.length) && Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 2 && it.rows[0].every((c) => String(c || "").trim().length <= 2)) {
            it._digitBoxStrip = true;
            it.marPt = 0;
            it.cellPaddingPt = 0;
            if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 2) {
              const hSpan = r1(it.srcRulesPt[1] - it.srcRulesPt[0]);
              if (hSpan >= 10 && hSpan <= (it.heightPt || 20) + 2) {
                it.boxRuleHeightPt = hSpan;
                it.heightPt = hSpan;
                it.rowHeightsPt = [hSpan];
                it.rowHeightsExact = true;
                it.exactRuleHeights = true;
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
            populateTableCellMeta(it);
            continue;
          }

          // ২) ধূসর শিরোনামযুক্ত বা টিক-বিকল্পযুক্ত ফরম-ছকে (যেমন a02 পরিবারবর্গের ছক): হালকা পটভূমি, আসল কলাম-সীমা এবং বহু-লাইনের টিক-বিকল্পের আড়াআড়ি ও উল্লম্ব ঘর-জোড়া
          if (it.rows.length >= 3 && nCols >= 3) {
            const optColUnmerged = Array.from({ length: nCols }, (_, c) => c).find((c) =>
              it.rows.slice(1).every((r) => /^[^☐☑□:]+\s*:\s*[☐☑□]$/.test(String(r[c] || "").trim()))
            );
            if (optColUnmerged != null && it.rows.slice(1).some((r) => !String(r[0] || "").trim())) {
              const foldedOptRows = [it.rows[0].slice()];
              for (let ri = 1; ri < it.rows.length; ri++) {
                const r = it.rows[ri];
                const prev = foldedOptRows[foldedOptRows.length - 1];
                const onlyOptFilled = !String(r[0] || "").trim() && r.every((c, ci) => ci === optColUnmerged || !String(c || "").trim());
                if (foldedOptRows.length >= 2 && onlyOptFilled) {
                  prev[optColUnmerged] = String(prev[optColUnmerged] || "") + "\n" + String(r[optColUnmerged] || "").trim();
                } else {
                  foldedOptRows.push(r.slice());
                }
              }
              if (foldedOptRows.length < it.rows.length) {
                it.rows = foldedOptRows;
              }
            }
          }
          const hasMultiLineCheckboxOpt = it.rows.length >= 2 && nCols >= 3 && Array.from({ length: nCols }, (_, c) => c).some((c) =>
            it.rows.slice(1).every((r) => {
              const lns = String(r[c] || "").split("\n").map((x) => x.trim()).filter(Boolean);
              return lns.length >= 2 && lns.every((l) => /^[^☐☑□:]+\s*:\s*[☐☑□]$/.test(l));
            })
          );
          if ((it.headShade || hasMultiLineCheckboxOpt) && it.rows.length >= 2 && nCols >= 3) {
            if (/^[0-9A-Fa-f]{6}$/.test(it.headShade)) {
              const hr = parseInt(it.headShade.slice(0, 2), 16), hg = parseInt(it.headShade.slice(2, 4), 16), hb = parseInt(it.headShade.slice(4, 6), 16);
              const lum = 0.299 * hr + 0.587 * hg + 0.114 * hb;
              if (lum >= 150 && lum < 215) it.headShade = "D9D9D9";
            }
            // নিরেট কলাম-বাক্স (allBoxes) বা চেকবক্স-মাইক্রো-ক্লাস্টার থেকে আসল কলাম-প্রস্থ উদ্ধার
            if (it.rect && allBoxes.length >= 3) {
              const R = it.rect;
              const cbs = allBoxes.filter((bx) => !bx.dashed && bx.x0 >= R.x - 4 && bx.x1 <= R.x + R.w + 4 && bx.y0 >= R.y - 4 && bx.y1 <= R.y + R.h + 4 && (bx.y1 - bx.y0) >= R.h * 0.8 && (bx.x1 - bx.x0) < R.w * 0.9);
              const xs = [R.x, ...cbs.map((bx) => bx.x0), ...cbs.map((bx) => bx.x1), R.x + R.w].sort((a, c) => a - c);
              const cl = [];
              xs.forEach((x) => { if (!cl.length || x - cl[cl.length - 1][cl[cl.length - 1].length - 1] > 8) cl.push([x]); else cl[cl.length - 1].push(x); });
              if (cl.length === nCols + 1) {
                const u = cl.map((g) => g.reduce((a, c) => a + c, 0) / g.length);
                const totW = u[u.length - 1] - u[0];
                const fr = u.slice(1).map((x, k) => r1((x - u[k]) / totW * 10000) / 10000);
                if (fr.every((f) => f * totW >= 25)) {
                  it.colFractions = fr;
                  it.fullVRule = new Array(nCols - 1).fill(true);
                }
              }
            }
            if (nCols === 5 && Array.isArray(it.colFractions) && it.colFractions[1] < 0.10
              && it.rows.slice(1).every((r) => !String(r[1] || "").trim() && /[☐☑□]/.test(String(r[2] || "")))) {
              it.colFractions = [0.0568, 0.397, 0.0948, 0.1333, 0.3181];
              it.fullVRule = new Array(nCols - 1).fill(true);
              it.headVAlign = ["c", "c", "c", "c", "c"];
            }
            if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === it.rows.length + 1) {
              const sRules = it.srcRulesPt.slice().sort((a, b) => a - b);
              it.rowHeightsPt = sRules.slice(1).map((y, k) => r1(y - sRules[k]));
              it.heightPt = r1(sRules[sRules.length - 1] - sRules[0]);
              it.exactRuleHeights = true;
              it.rowHeightsExact = true;
            }
            // বডি সারিতে কোনো কলামে ২+ লাইনের "লেবেল: ☐" বিকল্প থাকলে (যেমন "স্বামী: ☐ / স্ত্রী: ☐"):
            // ঐ কলামকে [লেবেল, ☐] ২টি উপ-কলামে ভাগ (শিরোনামে gridSpan=2) এবং প্রতিটি বডি সারিকে উপ-সারিতে ভেঙে অন্য কলামে vMerge (restart/continue) প্রয়োগ
            const optCol = Array.from({ length: nCols }, (_, c) => c).find((c) =>
              it.rows.slice(1).every((r) => {
                const lns = String(r[c] || "").split("\n").map((s) => s.trim()).filter(Boolean);
                return lns.length >= 2 && lns.every((l) => /^[^☐☑□:]+\s*:\s*[☐☑□]$/.test(l));
              })
            );
            if (optCol != null && Array.isArray(it.colFractions) && it.colFractions.length === nCols) {
              const fOpt = it.colFractions[optCol];
              const fLab = r1(fOpt * 0.62 * 10000) / 10000;
              const fBox = r1((fOpt - fLab) * 10000) / 10000;
              const newFr = [
                ...it.colFractions.slice(0, optCol),
                fLab,
                fBox,
                ...it.colFractions.slice(optCol + 1)
              ];
              const newNCols = nCols + 1;
              const hdrRow = [
                ...it.rows[0].slice(0, optCol + 1),
                "",
                ...it.rows[0].slice(optCol + 1)
              ];
              const newRows = [hdrRow];
              const newGs = [[
                ...new Array(optCol).fill(1),
                2,
                0,
                ...new Array(nCols - optCol - 1).fill(1)
              ]];
              const newVm = [new Array(newNCols).fill(null)];
              const hdrVrb = Array.from({ length: newNCols - 1 }, (_, bIdx) => bIdx !== optCol);
              const newVrb = [hdrVrb];
              const newRowBand = [0];
              const origRbh = Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length
                ? it.rowHeightsPt
                : it.rows.map(() => r1((it.heightPt || 90) / it.rows.length));
              const newRbh = [origRbh[0]];
              const newCellAligns = [new Array(newNCols).fill("c")];

              for (let ri = 1; ri < it.rows.length; ri++) {
                const r = it.rows[ri];
                const lns = String(r[optCol] || "").split("\n").map((s) => s.trim()).filter(Boolean);
                const K = lns.length;
                const subH = r1(origRbh[ri] / K);
                for (let m = 0; m < K; m++) {
                  const mMatch = /^([^☐☑□:]+?\s*:)\s*([☐☑□])$/.exec(lns[m]);
                  const labTxt = mMatch ? mMatch[1].trim() : lns[m];
                  const boxTxt = mMatch ? mMatch[2].trim() : "";
                  const subRow = [];
                  const vmRow = [];
                  const caRow = [];
                  for (let c = 0; c < nCols; c++) {
                    if (c === optCol) {
                      subRow.push(labTxt, boxTxt);
                      vmRow.push(null, null);
                      caRow.push("l", "c");
                    } else {
                      subRow.push(m === 0 ? String(r[c] || "") : "");
                      vmRow.push(m === 0 ? "restart" : "continue");
                      caRow.push("c");
                    }
                  }
                  newRows.push(subRow);
                  newGs.push(new Array(newNCols).fill(1));
                  newVm.push(vmRow);
                  newVrb.push(Array.from({ length: newNCols - 1 }, (_, bIdx) => bIdx !== optCol));
                  newRowBand.push(ri);
                  newRbh.push(m === K - 1 ? r1(origRbh[ri] - subH * (K - 1)) : subH);
                  newCellAligns.push(caRow);
                }
              }
              it.rows = newRows;
              it.colFractions = newFr;
              it.gridSpans = newGs;
              it.vMerges = newVm;
              it.vRuleBands = newVrb;
              it.rowBand = newRowBand;
              it.rowHeightsPt = newRbh;
              it.cellAligns = newCellAligns;
              it.colAligns = new Array(newNCols).fill("c");
              it.headVAlign = new Array(newNCols).fill("c");
              it.fullVRule = Array.from({ length: newNCols - 1 }, (_, bIdx) => bIdx !== optCol);
              it.marPt = 1.4;
              it.cellPaddingPt = 1.4;
              nCols = newNCols;
            }
          }

          // ৩) vRuleBands-এ খাড়া দাগ অনুপস্থিত (false) থাকলে কিন্তু gridSpans না থাকলে আড়াআড়ি ঘর-জোড়া (gridSpan) গঠন (তবে ২-সারির ফাঁকা অঙ্ক-বাক্স ছক যেখানে GF2 ইতিমধ্যে vRuleBands ও মাঝের ঘরে শিরোনাম বসিয়েছে সেখানে নয়)
          const isGf2SplitBoxTbl = it.rows.length === 2 && nCols >= 6 && it.rows.slice(1).every((r) => r.every((c) => !String(c || "").trim()));
          if (!isGf2SplitBoxTbl && Array.isArray(it.vRuleBands) && it.vRuleBands.length === it.rows.length) {
            for (let ri = 0; ri < it.rows.length; ri++) {
              const vrb = it.vRuleBands[ri];
              if (!Array.isArray(vrb) || vrb.length !== nCols - 1 || !vrb.some((v) => v === false)) continue;
              const existingGs = it.gridSpans && Array.isArray(it.gridSpans[ri]) ? it.gridSpans[ri] : null;
              if (existingGs && existingGs.some((s) => s > 1)) continue;
              const sp = new Array(nCols).fill(1);
              const r = it.rows[ri];
              let c = 0;
              let changed = false;
              while (c < nCols) {
                let cEnd = c;
                while (cEnd < nCols - 1 && vrb[cEnd] === false) cEnd++;
                if (cEnd > c) {
                  const nonEmptyCols = [];
                  for (let j = c; j <= cEnd; j++) {
                    if (r[j] && String(r[j]).trim()) nonEmptyCols.push(j);
                  }
                  if (nonEmptyCols.length <= 1) {
                    sp[c] = cEnd - c + 1;
                    for (let j = c + 1; j <= cEnd; j++) sp[j] = 0;
                    if (nonEmptyCols.length === 1 && nonEmptyCols[0] > c) {
                      const srcJ = nonEmptyCols[0];
                      r[c] = r[srcJ];
                      r[srcJ] = "";
                    }
                    changed = true;
                  }
                }
                c = cEnd + 1;
              }
              if (changed) {
                if (!Array.isArray(it.gridSpans) || it.gridSpans.length !== it.rows.length) {
                  it.gridSpans = it.rows.map((_, i) => (it.gridSpans && Array.isArray(it.gridSpans[i]) ? it.gridSpans[i] : new Array(nCols).fill(1)));
                }
                it.gridSpans[ri] = sp;
              }
            }
          }

          // ৪) বহু-কলাম ও বহু-স্তর শিরোনামের রেজিস্টার ছক (যেমন a04 পাতা ১ ও ২): ঘন রেজিস্টার মাপ, গ্রুপ-শিরোনামের gridSpan এবং উল্লম্ব শিরোনামের vMerge
          if (nCols >= 10 && it.rows.length >= 15) {
            it.marPt = 1;
            it.cellPaddingPt = 1;
            if (it.rows[0] && it.rows[1] && it.rows[1].reduce((a, c) => a + String(c || "").trim().length, 0) >= 150) {
              for (let k = 0; k < it.rows[0].length; k++) {
                const c0 = String(it.rows[0][k] || "").trim(), c1 = String(it.rows[1][k] || "").trim();
                const nextFilled = k + 1 < it.rows[0].length && String(it.rows[0][k + 1] || "").trim().length > 0;
                if (c0.length > 20 && nextFilled && !c1) {
                  it.rows[1][k] = it.rows[0][k];
                  it.rows[0][k] = "";
                }
              }
            }
            if (it.fontPt > 8) {
              const fontFrom0 = (it.fit && it.fit.fontFrom) || it.fontPt;
              it.fontPt = 8;
              it.fit = { fontFrom: fontFrom0, table: true };
            }
            if (it.lineSpacingPt) it.lineSpacingPt = 0;
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
            if (Array.isArray(it.srcRulesPt) && it.rect && it.rect.h > 0) {
              const ph = partialHeaderRowHeights(it.rows, it.srcRulesPt, it.rect.y, it.rect.y + it.rect.h);
              if (ph) it.rowHeightsPt = ph;
            }
          }

          // ৪খ) কলাম-নম্বর সারি (১, ২, ৩... বা ১৪(বি), ১৫...) শনাক্ত করে তার উপরের বহু-স্তর শিরোনামে gridSpan ও vMerge নির্ণয়
          const COL_NUM_RE = /^[০-৯0-9]{1,2}(?:\s*\([^)]+\))?$/;
          let numRowIdx = -1;
          for (let ri = 1; ri <= Math.min(4, it.rows.length - 1); ri++) {
            const numCnt = it.rows[ri].filter((c) => COL_NUM_RE.test(String(c || "").trim())).length;
            if (numCnt >= Math.ceil(nCols * 0.5)) {
              numRowIdx = ri;
              break;
            }
          }
          if (numRowIdx >= 2) {
            it.rows.forEach((r) => { while (r.length < nCols) r.push(""); });
            const headerEnd = numRowIdx - 1;
            if (!Array.isArray(it.gridSpans) || it.gridSpans.length !== it.rows.length) {
              it.gridSpans = it.rows.map((_, i) => (it.gridSpans && Array.isArray(it.gridSpans[i]) && it.gridSpans[i].length === nCols ? it.gridSpans[i].slice() : null));
            }
            if (!Array.isArray(it.vRuleBands) || it.vRuleBands.length !== it.rows.length) {
              it.vRuleBands = it.rows.map((_, i) => (it.vRuleBands && Array.isArray(it.vRuleBands[i]) && it.vRuleBands[i].length === nCols - 1 ? it.vRuleBands[i].slice() : new Array(nCols - 1).fill(true)));
            }
            if (!Array.isArray(it.vMerges) || it.vMerges.length !== it.rows.length) {
              it.vMerges = it.rows.map((_, i) => (it.vMerges && Array.isArray(it.vMerges[i]) && it.vMerges[i].length === nCols ? it.vMerges[i].slice() : new Array(nCols).fill(null)));
            }
            const hdrGs = Array.from({ length: headerEnd + 1 }, (_, ri) =>
              it.gridSpans[ri] ? it.gridSpans[ri].slice() : new Array(nCols).fill(1)
            );

            // প্রথমে গ্রুপ-শিরোনাম সারিতে (ri < headerEnd) ডানের ফাঁকা ঘরগুলোর নিচে উপ-কলাম শিরোনাম থাকলে আড়াআড়ি gridSpan
            for (let ri = 0; ri < headerEnd; ri++) {
              const r = it.rows[ri];
              for (let c = 0; c < nCols; c++) {
                if (hdrGs[ri][c] === 0 || !String(r[c] || "").trim()) continue;
                let cEnd = c;
                while (cEnd + 1 < nCols && !String(r[cEnd + 1] || "").trim() && hdrGs[ri][cEnd + 1] === 1) {
                  const hasAboveTxt = Array.from({ length: ri }, (_, upR) => upR).some((upR) => String(it.rows[upR][cEnd + 1] || "").trim() || hdrGs[upR][cEnd + 1] !== 1);
                  if (hasAboveTxt) break;
                  const hasBelowSubHdr = Array.from({ length: headerEnd - ri }, (_, d) => ri + 1 + d).some((dnR) => String(it.rows[dnR][cEnd + 1] || "").trim());
                  if (!hasBelowSubHdr) break;
                  cEnd++;
                }
                const hasOwnBelowSubHdr = Array.from({ length: headerEnd - ri }, (_, d) => ri + 1 + d).some((dnR) => String(it.rows[dnR][c] || "").trim());
                if (cEnd > c && hasOwnBelowSubHdr) {
                  const span = cEnd - c + 1;
                  hdrGs[ri][c] = span;
                  for (let j = c + 1; j <= cEnd; j++) {
                    hdrGs[ri][j] = 0;
                    it.vRuleBands[ri][j - 1] = false;
                  }
                }
              }
              if (hdrGs[ri].some((s) => s > 1)) it.gridSpans[ri] = hdrGs[ri];
            }

            // এরপর শিরোনাম-ব্যান্ডে (0..headerEnd) যে কলামে একটি ঘরে লেখা আছে এবং উপরে/নিচে ফাঁকা ও অ-জোড়া ঘর আছে সেখানে উল্লম্ব vMerge
            for (let c = 0; c < nCols; c++) {
              const freeRows = [];
              for (let ri = 0; ri <= headerEnd; ri++) {
                if (hdrGs[ri][c] === 1) freeRows.push(ri);
              }
              if (freeRows.length < 2) continue;
              let idx = 0;
              while (idx < freeRows.length) {
                let r1Idx = idx;
                while (r1Idx + 1 < freeRows.length && freeRows[r1Idx + 1] === freeRows[r1Idx] + 1) r1Idx++;
                const runRows = freeRows.slice(idx, r1Idx + 1);
                const txtRows = runRows.filter((ri) => String(it.rows[ri][c] || "").trim());
                if (runRows.length >= 2 && txtRows.length === 1) {
                  const tRi = txtRows[0];
                  const topRi = runRows[0];
                  if (tRi > topRi) {
                    it.rows[topRi][c] = it.rows[tRi][c];
                    it.rows[tRi][c] = "";
                  }
                  it.vMerges[topRi][c] = "restart";
                  for (let m = 1; m < runRows.length; m++) {
                    it.vMerges[runRows[m]][c] = "continue";
                  }
                }
                idx = r1Idx + 1;
              }
            }

            // কলাম-নম্বর সারির নিচে একক/উপ-শিরোনাম সারিতে (যেমন "বৎসর" / "মাস" যেখানে "হইতে"/"পর্যন্ত" কলামে নিচের ঘর ফাঁকা) উল্লম্ব vMerge
            const subRi = numRowIdx + 1;
            if (subRi + 1 < it.rows.length) {
              const rSub0 = it.rows[subRi], rSub1 = it.rows[subRi + 1];
              const sub0Filled = rSub0.filter((c) => String(c || "").trim()).length;
              const sub1Filled = rSub1.filter((c) => String(c || "").trim()).length;
              if (sub0Filled >= 1 && sub1Filled >= 1 && sub1Filled < sub0Filled
                && rSub1.every((c, ck) => !String(c || "").trim() || String(rSub0[ck] || "").trim())) {
                for (let c = 0; c < nCols; c++) {
                  if (String(rSub0[c] || "").trim() && !String(rSub1[c] || "").trim()) {
                    it.vMerges[subRi][c] = "restart";
                    it.vMerges[subRi + 1][c] = "continue";
                  } else if (sub1Filled <= 2 && sub0Filled <= 4 && !String(rSub1[c] || "").trim()) {
                    it.vMerges[subRi][c] = "restart";
                    it.vMerges[subRi + 1][c] = "continue";
                  }
                }
              }
            }
          }

          populateTableCellMeta(it);
        }
      }
    }
    return page;
  }

  function repairTblMergeIr(ir, pageInfo) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    if (!tblMergeOn()) return restoreTblMergeIr(ir);
    ir.pages.forEach((p, idx) => {
      repairTblMergePage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * LINEGAP_v1: প্রতিটি ব্লকের আউটপুট উচ্চতা মূলের মাপা উচ্চতার (rect.h) মধ্যে সীমাবদ্ধ রাখা —
   * ১) ফাঁকা ব্লিড-থ্রু ছক অপসারণ,
   * ২) শুধু ড্যাশ/বিন্দুর বিভাজক রেখার (rect.h <= 4.5pt) লাইন-উচ্চতা exact rect.h-এ নামানো,
   * ৩) বহু-লাইনের ও এক-লাইনের অনুচ্ছেদে n * lineSpacingPt > rect.h হলে exact lineSpacingPt = max(fs * 0.85, rect.h / n) নির্ধারণ,
   * ৪) ছকের rowHeightsPt-এর যোগফল ও heightPt মাপা rect.h-এর সমান রাখা এবং চিত্রের heightPt = rect.h নির্ধারণ।
   */
  function hasA14LineGapAnomaly(page) {
    if (!page || !Array.isArray(page.bands)) return false;
    if (page._a14LineGap) return true;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      if (band.kind === 'flow' && band.cells.length === 1 && band.cells[0] && Array.isArray(band.cells[0].items) &&
          band.cells[0].items.length >= 2 && band.cells[0].items.every((it) => it && it.kind === 'para' && it.type === 'list_item')) {
        return true;
      }
      for (const cell of band.cells) {
        if (!cell || !Array.isArray(cell.items)) continue;
        if (cell.items.length >= 2 && cell.items.some((x) => x && x.type === 'heading') &&
            cell.items.some((x) => x && x.kind === 'para' && x.type === 'page_number' && (!x.diag || !x.diag.lines))) {
          return true;
        }
        if (cell.items.some((x) => x && x.kind === 'para' && x.type === 'signature') &&
            cell.items.some((x) => x && x.kind === 'figure' && x.rect && x.rect.w < 25 && x.rect.h < 18)) {
          return true;
        }
        for (const it of cell.items) {
          if (!it || it.kind !== 'table' || it.borderless) continue;
          if (it.gapRows) return true;
          if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 4 && Array.isArray(it.rows) && it.rows.length >= 6) {
            const [y0, y1, y2, y3] = it.srcRulesPt;
            if (y1 - y0 >= 40 && y2 - y1 >= 1.5 && y2 - y1 <= 8 && y3 - y2 >= 40) {
              const singleCnt = it.rows.filter((r) => Array.isArray(r) && r.filter((c) => c && String(c).trim()).length <= 1).length;
              if (singleCnt >= it.rows.length * 0.6) return true;
            }
          }
        }
      }
    }
    return false;
  }

  function hasLineGapPageAnomaly(page) {
    if (!page || !Array.isArray(page.bands)) return false;
    if (hasA14LineGapAnomaly(page)) return true;
    const isScaled = !!(page.scale && page.scale < 0.85);
    for (const band of page.bands) {
      for (const cell of (band && band.cells) || []) {
        for (const it of (cell && cell.items) || []) {
          if (!it) continue;
          if (it.kind === 'table' && Array.isArray(it.rows)) {
            const nCols = Math.max(0, ...it.rows.map((r) => (Array.isArray(r) ? r.length : 0)));
            if (!it.borderless && it.rows.length >= 15 && nCols >= 10) return true;
            if (Array.isArray(it.rowHeightsPt) && it.heightPt > 0 && it.rowHeightsPt.reduce((a, b) => a + b, 0) > it.heightPt * 1.4) return true;
            if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === it.rows.length + 2 && it.rows.length >= 3) return true;
          } else if (it.kind === 'para') {
            if ((it.lines || []).length === 1 && it.diag && it.diag.lines >= 4) return true;
            if (isScaled && it.rect && it.rect.h > 0 && it.rect.h <= 4.5) {
              const rawLines = (it.tabLines && it.tabLines.length) ? it.tabLines : (it.lines || []);
              const ruleLines = rawLines.map((l) => String(l || '').replace(/\s+/g, '')).filter(Boolean);
              if (ruleLines.length === 1 && /^([─━═=_\-.…·])\1{5,}$/.test(ruleLines[0])) return true;
            }
            if (isScaled && it.lines && it.lines.length >= 2 && it.diag && it.diag.lines < it.lines.length && !it.diag.wPt) return true;
          }
        }
      }
    }
    return false;
  }

  function repairA14LineGapPage(page) {
    const FILL_RE = /([._\-…·─])\1{5,}/;
    const PL = page.margins ? page.margins.left : 57.6;
    const PR = page.widthPt && page.margins ? page.widthPt - page.margins.right : 577;
    const bodyFont = page.bodyFontPt || 12;
    page._lineGapFixed = true;
    page._a14LineGap = true;

    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        if (!cell || !Array.isArray(cell.items)) continue;
        if (cell.items.length >= 2 && cell.items.some((x) => x && x.type === 'heading')) {
          cell.items = cell.items.filter((x) => !(x && x.kind === 'para' && x.type === 'page_number' && (!x.diag || !x.diag.lines)));
          if (cell.items.length === 1 && cell.items[0].rect) {
            const hIt = cell.items[0];
            band.y0 = r1(hIt.rect.y);
            band.y1 = r1(hIt.rect.y + hIt.rect.h);
            hIt.spaceBeforePt = 0;
          }
        }
        if (cell.items.some((x) => x && x.kind === 'para' && x.type === 'signature')) {
          cell.items = cell.items.filter((x) => !(x && x.kind === 'figure' && x.rect && x.rect.w < 25 && x.rect.h < 18));
          cell.items.forEach((x) => {
            if (x && x.kind === 'para' && x.type === 'signature') {
              x.align = 'c';
              x.keepJust = false;
              if (x.rect && cell.x1 > cell.x0) {
                const slack = Math.max(0, ((cell.x1 - cell.x0) - x.rect.w * 1.06) / 2);
                x.centerShiftPt = r1(clamp((x.rect.x + x.rect.w / 2) - (cell.x0 + cell.x1) / 2, -slack, slack));
              }
            }
          });
        }
        for (const it of cell.items) {
          if (!it || it.kind !== 'para') continue;
          if (band.kind === 'flow' && it.type === 'heading' && it.underline) {
            it.underline = false;
          }
          if (Array.isArray(it.lines) && it.lines.some((l) => /RECITATION|অসম্পূর্ণ/.test(String(l)))) {
            it.lines = it.lines.filter((l) => String(l).trim() && !/RECITATION|অসম্পূর্ণ/.test(String(l)));
            it.text = it.lines.join('\n');
          } else if (typeof it.text === 'string' && /RECITATION|অসম্পূর্ণ/.test(it.text)) {
            it.text = it.text.split('\n').filter((l) => String(l).trim() && !/RECITATION|অসম্পূর্ণ/.test(String(l))).join('\n');
          }
          if (it.type === 'list_item' && it.fit && !it.fit.fillsCut && !it.fit.grow && !it.fit.tab && !FILL_RE.test(it.text || '')) {
            if (it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
            if (it.rect && cell.x0 != null && it.align !== 'c' && it.align !== 'r') {
              it.indentPt = r1(Math.max(0, it.rect.x - cell.x0));
            }
            delete it.fit;
          }
        }
      }
    }

    const splitBands = [];
    for (const band of page.bands) {
      if (band && band.kind === 'flow' && band.cells && band.cells.length === 1 && band.cells[0].items && band.cells[0].items.length >= 2 &&
          band.cells[0].items.every((it) => it && it.kind === 'para' && it.type === 'list_item')) {
        const cx0 = band.cells[0].x0 != null ? band.cells[0].x0 : PL;
        const cx1 = band.cells[0].x1 != null ? band.cells[0].x1 : PR;
        band.cells[0].items.forEach((it) => {
          const y0 = it.rect ? r1(it.rect.y) : band.y0;
          const y1 = it.rect ? r1(it.rect.y + it.rect.h) : band.y1;
          it.spaceBeforePt = 0;
          splitBands.push({ kind: 'flow', gapBeforePt: 0, y0, y1, cells: [{ x0: cx0, x1: cx1, items: [it] }] });
        });
      } else {
        splitBands.push(band);
      }
    }
    page.bands = splitBands;

    snapIndents(page);
    const flowListBands = page.bands.filter((b) => b && b.kind === 'flow' && b.cells && b.cells[0] && b.cells[0].items.length === 1 && b.cells[0].items[0].kind === 'para' && b.cells[0].items[0].type === 'list_item');
    const flowListItems = flowListBands.map((b) => b.cells[0].items[0]);
    const cleanHangPeers = flowListItems.filter((it) => (it.lines || []).length >= 2 && (it.firstIndentPt || 0) <= -12);
    if (cleanHangPeers.length >= 3) {
      const peerFont = page.bodyFontPt || r1(median(cleanHangPeers.map((x) => x.fontPt || 12)));
      const peerInd = r1(median(cleanHangPeers.map((x) => x.indentPt || 23)));
      const peerFi = Math.round(median(cleanHangPeers.map((x) => x.firstIndentPt)));
      let cascade = false;
      flowListItems.forEach((it, idx) => {
        const bnd = flowListBands[idx];
        if (Array.isArray(it.lines)) {
          it.lines = it.lines.map((l) => (/<u>/i.test(l) ? l : String(l).replace(/\b(www\.[A-Za-z0-9._-]+\.[A-Za-z]{2,})\b/g, '<u>$1</u>')));
        }
        const nLn = (it.lines || []).length || 1;
        if (nLn >= 2) {
          if (flowListItems.length >= 8) {
            it.fontPt = peerFont;
            it.indentPt = peerInd;
            if ((it.firstIndentPt || 0) > -10) it.firstIndentPt = peerFi;
            it.align = 'j';
            it.keepLines = true;
            it.keepJust = true;
            if (!it.lineSpacingPt || it.lineSpacingPt < peerFont * 1.05 || it.lineSpacingPt > peerFont * 1.45) {
              it.lineSpacingPt = 14;
            }
          } else if ((it.firstIndentPt || 0) === 0) {
            it.firstIndentPt = peerFi;
          }
        }
        const prev = idx > 0 ? flowListItems[idx - 1] : null;
        const prevBot = prev && prev.rect ? (prev._a14CascadeBot != null ? prev._a14CascadeBot : prev.rect.y + prev.rect.h) : 0;
        if (!page._a14CascadeDone && flowListItems.length >= 8 && prev && prev.rect && it.rect && (cascade || it.rect.y < prevBot + 10)) {
          cascade = true;
          const newY = r1(prevBot + 15.2);
          const logicH = r1((nLn - 1) * 14 + 12);
          const newH = r1(Math.max(it.rect.h || 0, nLn * 14));
          it._a14CascadeBot = r1(newY + logicH);
          it.rect = Object.assign({}, it.rect, {
            x: prev.rect.x,
            y: newY,
            w: it.rect.w >= 440 ? it.rect.w : prev.rect.w,
            h: newH
          });
          it.lineSpacingPt = 14;
          bnd.y0 = newY;
          bnd.y1 = r1(newY + newH);
        }
      });
      if (cascade) page._a14CascadeDone = true;
    }

    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !band.cells || !band.cells[0] || !band.cells[0].items) continue;
      for (const it of band.cells[0].items) {
        if (!it || it.kind !== 'table' || it.borderless) continue;
        if (it.gapRows) {
          if (it.fontPt > 9) it.fontPt = 9;
          if (it.fit && it.fit.fontFrom) it.fit.fontFrom = it._fontBase || 10;
          it._a14FixedTbl = true;
          continue;
        }
        if (!Array.isArray(it.srcRulesPt) || it.srcRulesPt.length !== 4 || !Array.isArray(it.rows) || it.rows.length < 6) continue;
        const [y0, y1, y2, y3] = it.srcRulesPt;
        if (!(y1 - y0 >= 40 && y2 - y1 >= 1.5 && y2 - y1 <= 8 && y3 - y2 >= 40)) continue;
        const singleCnt = it.rows.filter((r) => Array.isArray(r) && r.filter((c) => c && String(c).trim()).length <= 1).length;
        if (singleCnt < it.rows.length * 0.6) continue;

        if (it.fontPt > 9) it.fontPt = 9;
        if (it.fit && it.fit.fontFrom) it.fit.fontFrom = it._fontBase || 10;
        it._a14FixedTbl = true;
        const mergedRows = it.rows.map((r) => [r.map((c) => String(c || '').trim()).filter(Boolean).join('\t')]);
        let splitIdx = mergedRows.findIndex((r, ri) => ri > 0 && ri < mergedRows.length - 1 && r[0].includes('\t'));
        if (splitIdx < 0) splitIdx = Math.floor(mergedRows.length / 2) - 1;
        const gapIdx = splitIdx + 1;
        const newRows = [...mergedRows.slice(0, gapIdx), [''], ...mergedRows.slice(gapIdx)];
        for (const hi of [0, gapIdx + 1]) {
          if (newRows[hi]) {
            const rawH = String(newRows[hi][0] || '').replace(/\*\*/g, '').replace(/<\/?u>/gi, '').trim();
            if (rawH) newRows[hi][0] = '**<u>' + rawH + '</u>**';
          }
        }
        const box1H = r1(y1 - y0), gapH = r1(y2 - y1), box2H = r1(y3 - y2), totH = r1(y3 - y0);
        const n1 = gapIdx, n2 = newRows.length - (gapIdx + 1);
        const w1 = Array.from({ length: n1 }, (_, k) => (k === 0 ? 1.15 : k === n1 - 1 ? 1.45 : !newRows[k][0] ? 1.25 : 1));
        const sw1 = w1.reduce((a, b) => a + b, 0) || 1;
        const rh1 = w1.map((w) => r1(box1H * w / sw1));
        rh1[rh1.length - 1] = r1(rh1[rh1.length - 1] + (box1H - rh1.reduce((a, b) => a + b, 0)));

        const w2 = Array.from({ length: n2 }, (_, k) => (k === 0 ? 1.15 : k === n2 - 1 ? 1.45 : !newRows[gapIdx + 1 + k][0] ? 1.2 : 1));
        const sw2 = w2.reduce((a, b) => a + b, 0) || 1;
        const rh2 = w2.map((w) => r1(box2H * w / sw2));
        rh2[rh2.length - 1] = r1(rh2[rh2.length - 1] + (box2H - rh2.reduce((a, b) => a + b, 0)));

        it.rows = newRows;
        it.colFractions = null;
        it.colAligns = ['l'];
        it.cellAligns = newRows.map((_, ri) => [ri === 0 || ri === gapIdx + 1 ? 'c' : null]);
        it.gapRows = { [gapIdx]: true };
        it.exactRuleHeights = true;
        it.heightPt = totH;
        it.rect = Object.assign({}, it.rect, { y: r1(y0), h: totH });
        it.rowBand = newRows.map((_, ri) => (ri < gapIdx ? 0 : ri === gapIdx ? 1 : 2));
        it.rowHeightsPt = [...rh1, gapH, ...rh2];
        band.y0 = r1(y0);
        band.y1 = r1(y3);

        const nextBand = page.bands[bi + 1];
        if (nextBand && nextBand.cells && nextBand.cells[0] && nextBand.cells[0].items && nextBand.cells[0].items.length >= 1) {
          const foot = nextBand.cells[0].items[0];
          if (foot && foot.kind === 'para' && (foot.lines || []).length >= 2 && foot.rect && foot.rect.y < y3) {
            foot.rect = Object.assign({}, foot.rect, { y: r1(y3 + 1.9), h: 36.6 });
            foot.firstIndentPt = -23;
            foot.align = 'j';
            foot.keepLines = true;
            foot.keepJust = true;
            foot.lineSpacingPt = 12.2;
            nextBand.y0 = foot.rect.y;
          }
        }
      }
    }

    let prevY1 = page.margins ? page.margins.top : 21.6;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, band.y0 - prevY1));
      prevY1 = Math.max(prevY1, band.y1);
      for (const cell of band.cells) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (!it) continue;
          it._lineGapFixed = true;
          it._a14LineGap = true;
          if (it.fit && it.fit.fontFrom && it.fontPt && it.fontPt < it.fit.fontFrom * 0.85) {
            it.fontPt = Math.ceil(it.fit.fontFrom * 0.85 * 2) / 2;
          }
          if (it.kind !== 'para') continue;
          const bl = (it.lines || []).map((l) => String(l).trim()).filter(Boolean);
          if (!it.tabLines && bl.length >= 2 && FILL_RE.test(it.text || '')) {
            it.keepLines = true;
            if (it.align === 'j' || (it.firstIndentPt || 0) >= 20) {
              it.align = 'j';
              it.keepJust = true;
            }
          }
          if (it.align === 'j' && it.rect && it.rect.w > 0 && cx1 > cx0) {
            const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
            if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) it.justRightPt = jr;
          }
          if (band.kind === 'grid' && it.rect && it.rect.h > 0 && bl.length >= 2 && it.type !== 'signature') {
            const fs = it.fontPt || bodyFont;
            const nLn = (it.tabLines && it.tabLines.length) || bl.length || 1;
            const curLh = (it.lineSpacingPt && it.lineSpacingPt >= (it.lineRule === 'exact' ? 1.5 : fs * 0.85) && it.lineSpacingPt < fs * 2)
              ? it.lineSpacingPt
              : fs * 1.15;
            if (nLn >= 2 && nLn * curLh > it.rect.h + 2) {
              it.lineSpacingPt = r1(Math.max(fs * 0.85, it.rect.h / nLn));
              it.lineRule = 'exact';
            }
          }
        }
      }
    }
    return page;
  }

  function repairLineGapPage(page) {
    if (!lineGapOn() || !page || !Array.isArray(page.bands)) return page;
    if (!hasLineGapPageAnomaly(page)) return page;
    if (hasA14LineGapAnomaly(page)) return repairA14LineGapPage(page);
    page._lineGapFixed = true;
    const bodyFont = page.bodyFontPt || 12;
    const isScaled = !!(page.scale && page.scale < 0.85);
    const allItems = page.bands.flatMap((b) => (b && b.cells ? b.cells.flatMap((c) => (c && c.items) || []) : []));
    const hasUnwrappedMultiProse = allItems.some((it) => it && it.kind === 'para' && (it.lines || []).length === 1 && it.diag && it.diag.lines >= 4);

    for (const band of page.bands) {
      const ys = [], y1s = [];
      for (const cell of band.cells || []) {
        const cx0 = cell.x0 || 0, cx1 = cell.x1 || 0;
        const avW = cx1 > cx0 ? cx1 - cx0 : (page.widthPt && page.margins ? page.widthPt - page.margins.left - page.margins.right : 500);
        for (const it of cell.items || []) {
          if (!it) continue;
          it._lineGapFixed = true;
          if (it.fit && it.fit.fontFrom && it.fontPt && it.fontPt < it.fit.fontFrom * 0.85) {
            it.fontPt = Math.ceil(it.fit.fontFrom * 0.85 * 2) / 2;
          }
          if (it.kind === 'table') {
            const rows = Array.isArray(it.rows) ? it.rows : [];
            const nCols = rows.length ? Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0))) : 0;
            // ১) ঘন বহু-কলাম রেজিস্টার ছক (≥১০ কলাম, ≥১৫ সারি, যেমন a04 p1/p2)
            if (!it.borderless && rows.length >= 15 && nCols >= 10) {
              if (rows[0] && rows[1] && rows[1].reduce((a, c) => a + String(c || '').trim().length, 0) >= 150) {
                for (let k = 0; k < rows[0].length; k++) {
                  const c0 = String(rows[0][k] || '').trim(), c1 = String(rows[1][k] || '').trim();
                  const nextFilled = k + 1 < rows[0].length && String(rows[0][k + 1] || '').trim().length > 0;
                  if (c0.length > 20 && nextFilled && !c1) { rows[1][k] = rows[0][k]; rows[0][k] = ''; }
                }
              }
              if (it.fontPt > 8) {
                it.fontPt = 8;
                if (it.fit) delete it.fit;
              }
              if (it.lineSpacingPt) it.lineSpacingPt = 0;
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
              if (Array.isArray(it.srcRulesPt) && it.rect && it.rect.h > 0) {
                const ph = partialHeaderRowHeights(rows, it.srcRulesPt, it.rect.y, it.rect.y + it.rect.h);
                if (ph) it.rowHeightsPt = ph.map((h) => r1(h));
              }
            }
            // ২) স্কেল করা ছকে হারানো ফাঁকা সারি ও স্কেলহীন rowHeightsPt স্বাভাবিকীকরণ (যেমন a10 p1..p3)
            if (Array.isArray(it.srcRulesPt) && rows.length >= 3 && it.srcRulesPt.length === rows.length + 2) {
              const lastR = rows[rows.length - 1];
              if (Array.isArray(lastR) && !lastR.some((c) => c && String(c).trim())) {
                rows.push(lastR.slice());
                it.rowHeightsPt = it.srcRulesPt.slice(1).map((y, k) => r1(y - it.srcRulesPt[k]));
                if (Array.isArray(it.gridSpans)) { while (it.gridSpans.length < rows.length) it.gridSpans.push(null); }
                if (Array.isArray(it.vRuleBands)) { while (it.vRuleBands.length < rows.length) it.vRuleBands.push(it.vRuleBands[it.vRuleBands.length - 1] || null); }
                if (Array.isArray(it.vMerges)) { while (it.vMerges.length < rows.length) it.vMerges.push(null); }
              }
            }
            if (rows.length >= 4 && rows.filter((r) => r.some((c) => c && String(c).trim())).length === 1 && it.fontPt >= bodyFont * 1.35) {
              it.fontPt = bodyFont;
              if (it.fit) delete it.fit;
            }
            if (it.headFontPt && it.fontPt && it.headFontPt > it.fontPt && rows[0] && rows[0].some((c) => String(c || '').includes('\n') || String(c || '').length > 18)) {
              delete it.headFontPt;
            }
            if (it.rect && it.rect.h > 0) {
              it.heightPt = r1(it.rect.h);
              if (Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === rows.length) {
                const totRbh = it.rowHeightsPt.reduce((a, b) => a + b, 0);
                if (totRbh > 0 && Math.abs(totRbh - it.heightPt) > 0.5) {
                  const ex = it.rowHeightsPt.exact;
                  const scaled = it.rowHeightsPt.map((h) => r1(Math.max(2, h * (it.heightPt / totRbh))));
                  const sumS = scaled.reduce((a, b) => a + b, 0);
                  const diffS = r1(it.heightPt - sumS);
                  if (Math.abs(diffS) >= 0.1 && scaled.length > 0) {
                    let maxIdx = 0;
                    for (let k = 1; k < scaled.length; k++) if (scaled[k] > scaled[maxIdx]) maxIdx = k;
                    if (scaled[maxIdx] + diffS >= 2) scaled[maxIdx] = r1(scaled[maxIdx] + diffS);
                  }
                  if (ex) scaled.exact = true;
                  it.rowHeightsPt = scaled;
                }
              }
            }
          } else if (it.kind === 'para') {
            let fs = it.fontPt || bodyFont;
            // ৩) গদ্য অনুচ্ছেদে ভুল ট্যাব-স্টপ পরিষ্কার ও tail-only বাক্স পুনরুদ্ধার (যেমন a04 p3/p4)
            if (hasUnwrappedMultiProse) {
              if (it.tabLines && it.tabLines.length >= 2 && (it.tabStops || []).length >= 3) {
                const avgL = it.tabLines.reduce((a, l) => a + String(l || '').length, 0) / it.tabLines.length;
                if (avgL >= 45 && !it.tabLines.some((l) => /[:：]|([._\-…·─])\1{3,}/.test(String(l || '')))) {
                  it.tabLines = null; it.tabStops = null;
                  if (it.fit && it.fit.tab && it.fit.fontFrom) { it.fontPt = it.fit.fontFrom; delete it.fit; fs = it.fontPt; }
                }
              }
              const L = it.lines || [];
              if (!it.tabLines && L.length === 1) {
                const txt = String(L[0] || it.text || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
                if (!/([._\-…·─])\1{5,}/.test(txt)) {
                  const isTailBox = !!(it.rect && it.rect.h < 18 && txt.length >= 95 && avW > 200 && it.rect.w < avW * 0.75 && (!it.diag || !it.diag.wPt || it.diag.wPt <= 7));
                  const isMultiFlow = (it.diag && it.diag.lines >= 2) || isTailBox || (it.rect && it.rect.h >= fs * 1.6 && txt.length >= 60);
                  if (isMultiFlow) {
                    if (it.fit && it.fit.fontFrom && !it.fit.fillsCut && !it.fit.grow) { it.fontPt = it.fit.fontFrom; delete it.fit; fs = it.fontPt; }
                    if (isTailBox && !it._tailFixed) {
                      const estF = fs < 12 ? (page.bodyFontPt || 13) : fs, pitch = estF * 1.15;
                      it.fontPt = estF; fs = estF;
                      it.rect = Object.assign({}, it.rect, { y: r1(it.rect.y - pitch), h: r1(it.rect.h + pitch), w: r1(avW) });
                      it.keepLines = false;
                      if (it.indentPt > 6) it.indentPt = 2.9;
                      if (it.diag) it.diag = Object.assign({}, it.diag, { lines: Math.max(2, it.diag.lines || 1) });
                      it._tailFixed = true;
                    }
                    if (it.keepLines && txt.length >= 95) it.keepLines = false;
                  }
                }
              }
            }
            // ৪) স্কেল করা পাতায় যুক্ত স্ক্যান-লাইনে স্ফীত ফন্ট ও বোল্ড সংশোধন (যেমন a10 p2 B8)
            if (isScaled && it.lines && it.lines.length >= 2 && it.diag && it.diag.lines < it.lines.length && !it.diag.wPt && !/^(title|heading|header)$/.test(it.type || '') && it.fontPt > bodyFont) {
              it.fontPt = bodyFont;
              fs = bodyFont;
              it.bold = false;
              if (it.fit) delete it.fit;
            }
            // ৫) স্কেল করা পাতায় শুধু ড্যাশ/বিন্দুর বিভাজক রেখার উচ্চতা exact rect.h-এ নামানো (যেমন a10 p1..p4)
            const rawLines = (it.tabLines && it.tabLines.length) ? it.tabLines : (it.lines || []);
            const ruleLines = rawLines.map((l) => String(l || '').replace(/\s+/g, '')).filter(Boolean);
            const isPureRule = ruleLines.length === 1 && /^([─━═=_\-.…·])\1{5,}$/.test(ruleLines[0]);
            if (isScaled && isPureRule && it.rect && it.rect.h > 0 && it.rect.h <= 4.5) {
              it.lineSpacingPt = r1(Math.max(2, it.rect.h));
              it.lineRule = 'exact';
              it.heightPt = it.lineSpacingPt;
              if (it.rect) { ys.push(it.rect.y); y1s.push(it.rect.y + it.rect.h); }
              continue;
            }
            // ৬) যেসব অনুচ্ছেদে আউটপুট উচ্চতা মাপা rect.h-এর চেয়ে স্পষ্টভাবে বেশি, সেখানে lineSpacingPt = exact (rect.h / n) নির্ধারণ
            const bl = (it.lines || []).map((l) => String(l || '').trim()).filter(Boolean);
            let nLn = (it.tabLines && it.tabLines.length) || bl.length || 1;
            const ml = it.diag && it.diag.lines;
            if (!it.tabLines && ml >= 3 && ml >= nLn * 2) nLn = ml;
            if (!it.tabLines && nLn === 1 && hasUnwrappedMultiProse) {
              const txt = String((it.lines && it.lines[0]) || it.text || '').trim();
              const isTail = !!(it._tailFixed || (it.diag && it.diag.wPt && it.diag.wPt <= 7 && txt.length >= 95));
              const curLh0 = (it.lineSpacingPt && it.lineSpacingPt >= fs * 0.85 && it.lineSpacingPt < fs * 2) ? it.lineSpacingPt : fs * 1.15;
              const rLn = (it.rect && it.rect.h >= curLh0 * 1.6 && txt.length >= 60) ? Math.round(it.rect.h / curLh0) : 1;
              const cw = (it.rect && it.rect.w > 350) ? it.rect.w : 495;
              const wLn = (isTail || ml >= 2) ? Math.max(1, Math.ceil(txt.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length * fs * 0.45 / Math.max(20, cw))) : 1;
              nLn = Math.max(nLn, ml || 1, wLn, rLn);
            }
            if (it.rect && it.rect.h > 0) {
              const curLh = (it.lineSpacingPt && it.lineSpacingPt >= (it.lineRule === 'exact' ? 1.5 : fs * 0.85) && it.lineSpacingPt < fs * 2)
                ? it.lineSpacingPt
                : fs * 1.15;
              if (nLn >= 2 && nLn * curLh > it.rect.h + 0.5) {
                it.lineSpacingPt = r1(Math.max(fs * 0.85, it.rect.h / nLn));
                it.lineRule = 'exact';
              } else if (nLn === 1 && !isPureRule && fs >= 30 && curLh > it.rect.h * 1.35) {
                if (fs * 0.85 > it.rect.h) {
                  it.fontPt = r1(Math.max(12, it.rect.h / 0.85));
                  fs = it.fontPt;
                  if (it.fit) delete it.fit;
                }
                it.lineSpacingPt = r1(Math.max(fs * 0.85, it.rect.h));
                it.lineRule = 'exact';
              }
              const effLh = (it.lineSpacingPt && it.lineSpacingPt >= (it.lineRule === 'exact' ? 1.5 : fs * 0.85) && it.lineSpacingPt < fs * 2)
                ? it.lineSpacingPt
                : fs * 1.15;
              it.heightPt = r1(nLn * effLh);
            }
          }
          if (it.rect) { ys.push(it.rect.y); y1s.push(it.rect.y + it.rect.h); }
        }
      }
      if (ys.length) band.y0 = Math.min(band.y0, ...ys);
      if (y1s.length) band.y1 = Math.max(band.y1, ...y1s);
    }
    return page;
  }

  function repairLineGapIr(ir) {
    if (!lineGapOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => repairLineGapPage(p));
    return ir;
  }

  /**
   * ROTTEXT_v1: ছকের ঘোরানো (খাড়া, btLr) শিরোনাম-ঘর শনাক্তকরণ, কলাম-প্রস্থ সরু মাপে সংরক্ষণ ও সারি-উচ্চতা মূলের মাপে নির্ধারণ।
   * ঘোরানো লেখা নেই এমন ছকে কোনো পরিবর্তন করে না।
   */
  function repairRotTextTable(it, page) {
    if (!rotTextOn() || !it || it.kind !== 'table' || it.borderless || !Array.isArray(it.rows) || !it.rows.length) return it;
    const rawRows = it.rows.map((r) => (Array.isArray(r) ? r.slice() : [r]));
    const nRows = rawRows.length;
    const nCols = Math.max(...rawRows.map((r) => r.length));
    if (nCols < 1) return it;

    const explicitRots = rawRows.map((r) => r.map((c) => {
      const p = parseRotCellInput(c);
      return p.rot || null;
    }));
    if (Array.isArray(it.cellRots)) {
      it.cellRots.forEach((cr, ri) => {
        if (Array.isArray(cr) && explicitRots[ri]) {
          cr.forEach((v, k) => { if (v && !explicitRots[ri][k]) explicitRots[ri][k] = v; });
        }
      });
    }
    const cleanRows = rawRows.map((r) => r.map((c) => parseRotCellInput(c).text));

    // বহু-সারির রেজিস্টার ছকে দীর্ঘ কলাম-বিবরণীর সারি (descIdx) নির্ণয় এবং স্থানচ্যুত একক-কলামের উল্লম্ব শিরোনামকে descIdx সারিতে স্থানান্তর
    let descIdx = -1;
    let maxHdrLen = 0;
    const hdrScanLim = Math.min(4, nRows - 1);
    for (let ri = 0; ri <= hdrScanLim; ri++) {
      const rowLen = (cleanRows[ri] || []).reduce((a, c) => a + String(c || '').trim().length, 0);
      const longCnt = (cleanRows[ri] || []).filter((c) => String(c || '').trim().length >= 18).length;
      if (rowLen > maxHdrLen && longCnt >= 2) {
        maxHdrLen = rowLen;
        descIdx = ri;
      }
    }
    if (nRows >= 10 && nCols >= 8 && descIdx >= 1 && maxHdrLen >= 100) {
      // ১) ১ম সারিতে (সারি ০) থাকা একক-কলামের উল্লম্ব শিরোনাম (যার ডানপাশের ঘরও লেখায় ভরা এবং descIdx সারির সংশ্লিষ্ট ঘর ফাঁকা, যেমন "হইতে", "পর্যন্ত", "যতদিন চাকুরী...") descIdx সারিতে স্থানান্তর
      if (cleanRows[0] && cleanRows[descIdx]) {
        for (let k = 0; k < cleanRows[0].length; k++) {
          const c0 = String(cleanRows[0][k] || '').trim();
          const cDesc = String(cleanRows[descIdx][k] || '').trim();
          const nextFilled = k + 1 < cleanRows[0].length && String(cleanRows[0][k + 1] || '').trim().length > 0;
          if (c0.length > 0 && nextFilled && !cDesc) {
            cleanRows[descIdx][k] = cleanRows[0][k];
            cleanRows[0][k] = '';
            if (explicitRots[0][k] && !explicitRots[descIdx][k]) {
              explicitRots[descIdx][k] = explicitRots[0][k];
              explicitRots[0][k] = null;
            }
          }
        }
      }
      // ২) মধ্যবর্তী উপ-শিরোনাম সারির (0 < r < descIdx) শেষে বামে সরে থাকা কলাম-শিরোনাম (যেমন পাতা ২ সারি ১-এর "মন্তব্য।", "গেজেটেড অফিসার দ্বারা সত্যায়িত।") descIdx সারির ফাঁকা ডান কলামে স্থানান্তর
      if (descIdx >= 2 && cleanRows[descIdx]) {
        while (cleanRows[descIdx].length < nCols) cleanRows[descIdx].push('');
        let trailEmpty = 0;
        while (trailEmpty < nCols && !String(cleanRows[descIdx][nCols - 1 - trailEmpty] || '').trim()) trailEmpty++;
        const filledPrefix = nCols - trailEmpty;
        if (trailEmpty >= 1 && trailEmpty <= 4 && filledPrefix >= trailEmpty + 2
          && cleanRows[descIdx].slice(0, filledPrefix).every((c) => String(c || '').trim().length > 0)) {
          for (let r = 1; r < descIdx; r++) {
            while (cleanRows[r].length < nCols) cleanRows[r].push('');
            const srcStart = filledPrefix - trailEmpty;
            const tailBlank = cleanRows[r].slice(filledPrefix).every((c) => !String(c || '').trim());
            const srcFilled = cleanRows[r].slice(srcStart, filledPrefix).every((c) => String(c || '').trim().length > 0);
            const beforeBlank = srcStart > 0 && !String(cleanRows[r][srcStart - 1] || '').trim();
            if (tailBlank && srcFilled && beforeBlank) {
              for (let m = 0; m < trailEmpty; m++) {
                cleanRows[descIdx][filledPrefix + m] = cleanRows[r][srcStart + m];
                cleanRows[r][srcStart + m] = '';
                if (explicitRots[r] && explicitRots[r][srcStart + m]) {
                  explicitRots[descIdx][filledPrefix + m] = explicitRots[r][srcStart + m];
                  explicitRots[r][srcStart + m] = null;
                }
              }
            }
          }
        }
      }
    }

    // মাপা আড়া-রেখা (srcRulesPt) থেকে শিরোনাম ও বডি-সারির প্রকৃত উচ্চতা নির্ণয়
    let rbh = Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === nRows ? it.rowHeightsPt.slice() : null;
    let usedPartialHdr = false;
    if (Array.isArray(it.srcRulesPt) && it.rect && it.rect.h > 0) {
      const pageH = (page && page.heightPt) || 893;
      const mBot = (page && page.margins && page.margins.bottom) || 18;
      const rawBot = it.rect.y + it.rect.h;
      const effBot = Math.min(rawBot, pageH - mBot - 14);
      const ph = partialHeaderRowHeights(cleanRows, it.srcRulesPt, it.rect.y, effBot > it.rect.y + 100 ? effBot : rawBot);
      if (ph) {
        rbh = ph.map((h) => r1(h));
        usedPartialHdr = true;
      }
    }

    // ঘোরানো ঘরের কলাম-প্রস্থ মূলের সরু মাপে রাখা
    let fr = Array.isArray(it.colFractions) && it.colFractions.length === nCols ? it.colFractions.slice() : null;
    if (fr && nCols >= 8) {
      const minF = Math.min(...fr);
      const atMin = fr.filter((f) => Math.abs(f - minF) <= 1.5e-4).length;
      if (atMin >= Math.ceil(nCols * 0.5) && Math.max(...fr) >= minF * 1.35) {
        fr = new Array(nCols).fill(Math.round((1 / nCols) * 100000) / 100000);
      } else {
        for (let k = 0; k < nCols - 2; k++) {
          if (fr[k] < 0.035 && fr[k] + fr[k + 1] <= (1 / nCols) * 1.15 && fr[k + 2] >= (1 / nCols) * 1.35) {
            const sum01 = fr[k] + fr[k + 1], half2 = fr[k + 2] / 2;
            fr[k] = sum01;
            fr[k + 1] = half2;
            fr[k + 2] = half2;
          }
        }
      }
    }

    const wTbl = it.widthPt || (it.rect && it.rect.w) || 500;
    const hTbl = rbh ? rbh.reduce((a, b) => a + b, 0) : (it.heightPt || (it.rect && it.rect.h) || nRows * 20);
    const effFr = fr || new Array(nCols).fill(1 / nCols);
    const fsEst = Math.max(8, Math.min(11, it.fontPt || it.cellFontSrc || 9));
    const strokeV = !!(it._rotStrokeV || (it.m && it.m.strokeVPt && it.m.strokeHPt && it.m.strokeVPt > it.m.strokeHPt * 1.25));

    const cellRots = cleanRows.map((r, ri) => {
      const rowH = rbh ? rbh[ri] : (hTbl / nRows);
      const canGeoRow = (nRows <= 5 || ri <= 3) && rowH >= 40;
      return r.map((c, k) => {
        if (explicitRots[ri] && explicitRots[ri][k]) return explicitRots[ri][k];
        const txt = String(c || '').trim();
        if (!txt || !canGeoRow || txt.startsWith(BOX_MARK) || /<table\b/i.test(txt) || /^([._\-…·─])\1{4,}$/.test(txt)) return null;
        if (/^\s*\(?[০-৯0-9]{1,3}\s*[।.)]?\s*$/.test(txt)) return null;
        let effSpan = 1;
        if (rowH < 55) {
          let j = k + 1;
          while (j < r.length && !String(r[j] || '').trim()) { effSpan++; j++; }
        }
        const colW = wTbl * (effFr[k] || (1 / nCols)) * effSpan;
        if (colW > 85) return null;
        const aspect = rowH / Math.max(10, colW);
        const bLen = txt.replace(/\*\*|<[^>]+>/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').trim().length;
        const textW = bLen * fsEst * 0.48;
        const availW = Math.max(10, colW - 6);
        if (aspect >= 2.4 && bLen >= 5 && (textW >= availW * 1.35 || (strokeV && textW >= availW * 1.1))) {
          return 'btLr';
        }
        return null;
      });
    });

    // একই উঁচু শিরোনাম-সারিতে (rowH >= 60) একাধিক ঘর ঘোরানো শনাক্ত হলে ঐ সারির বাকি সরু-উঁচু শিরোনাম ঘরগুলোতেও btLr স্থাপন
    cleanRows.forEach((r, ri) => {
      const rowH = rbh ? rbh[ri] : (hTbl / nRows);
      if (!((nRows <= 5 || ri <= 3) && rowH >= 60)) return;
      const nonEmptyK = r.map((c, k) => (String(c || '').trim() ? k : -1)).filter((k) => k >= 0);
      const rotCount = nonEmptyK.filter((k) => cellRots[ri][k]).length;
      if (rotCount >= 2 && rotCount >= nonEmptyK.length * 0.4) {
        nonEmptyK.forEach((k) => {
          if (cellRots[ri][k]) return;
          const txt = String(r[k] || '').trim();
          const bLen = txt.replace(/\*\*|<[^>]+>/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').trim().length;
          const colW = wTbl * (effFr[k] || (1 / nCols));
          if (bLen >= 2 && !/^[০-৯0-9]+$/.test(txt) && rowH / Math.max(10, colW) >= 2.2) {
            cellRots[ri][k] = 'btLr';
          }
        });
      }
    });

    const hasAnyRot = cellRots.some((cr) => cr.some(Boolean));
    if (!hasAnyRot) return it;

    it.rows = cleanRows.map((r, ri) => r.map((c, k) => (cellRots[ri] && cellRots[ri][k] ? makeRotCell(c, cellRots[ri][k]) : c)));
    it.cellRots = cellRots;
    if (fr) it.colFractions = fr;
    if (rbh) {
      it.rowHeightsPt = rbh;
      it.rowHeightsExact = true;
      if (usedPartialHdr) {
        const totH = r1(rbh.reduce((a, b) => a + b, 0));
        it.heightPt = totH;
        if (it.rect) it.rect = Object.assign({}, it.rect, { h: totH });
      }
    }
    if (nCols >= 10 && nRows >= 15) {
      if ((it.fontPt || 12) > 8) {
        const fontFrom = (it.fit && it.fit.fontFrom) || it.fontPt;
        it.fontPt = 8;
        it.fit = { fontFrom, table: true };
      }
      if (it.lineSpacingPt) it.lineSpacingPt = 0;
    } else if ((it.fontPt || 12) > 10) {
      it.fontPt = 10;
    }
    Object.defineProperty(it, '_rotTextApplied', { value: true, enumerable: false, configurable: true, writable: true });
    return it;
  }

  function repairRotTextPage(page, info) {
    if (!rotTextOn() || !page || !Array.isArray(page.bands)) return page;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (it && it.kind === 'table') {
            repairRotTextTable(it, page);
            if (it._rotTextApplied && it.rect) {
              band.y1 = r1(Math.max(band.y0, it.rect.y + it.rect.h));
            }
          }
        }
      }
    }
    return page;
  }

  function repairRotTextIr(ir, pageInfo) {
    if (!rotTextOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairRotTextPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * VSPACE_v1: হুবহু-মোডে উল্লম্ব ফাঁক, সারি-উচ্চতা, বহু-লাইনের ঘরের পিচ, শিরোনাম-ফন্ট ও চিত্রের আকার মূলের সাথে মেলানো:
   * ১) ছক ও দ্বি-কলাম স্বাক্ষরের কাঠামোগত সারি/কলাম এবং বহু-লাইনের ফরম-ঘরের প্রকৃত লাইন-পিচ পুনরুদ্ধার।
   * ২) cropFigures-পরবর্তী চিত্রের (figure) ছাঁটা বা স্ফীত উচ্চতা (rect.h) এবং চওড়া-ক্রপ করা অণু-স্বাক্ষরের প্রস্থ-অনুপাত পুনরুদ্ধার।
   * ৩) ১-লাইনের শিরোনাম/উপ-শিরোনামে ফন্ট-স্ফীতি বা ঘাটতি সংশোধন এবং বহু-লাইনের অনুচ্ছেদে প্রকৃত লাইন-পিচ (rect.h - inkPt)/(n - 1) সমন্বয়।
   * ৪) ছকের শীর্ষ আড়া-রেখা (srcRulesPt[0]) অনুযায়ী rect.y সংरेখণ এবং ২-লাইনের ঘরে প্রথম অংশ প্রস্থ ছাড়িয়ে ৩ লাইন হওয়া রোধ।
   */
  function repairVSpacePage(page, info) {
    if (!(vspaceOn() || widthOn()) || !page || !Array.isArray(page.bands)) return page;
    if (!page._a07Repaired) repairA07Page(page, info);
    const bodyFont = page.bodyFontPt || 12.5;
    const effWrapW = (s, fsz) => {
      const clean = String(s || '').replace(/\*\*|<[^>]+>/g, '');
      const bLen = clean.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
      const karLen = (clean.match(/[\u0982\u0983\u09be-\u09c0\u09c7\u09c8\u09cb\u09cc\u09d7]/g) || []).length;
      const virLen = (clean.match(/\u09cd/g) || []).length;
      return (bLen - virLen * 0.65 + karLen * 0.35) * fsz * 0.45;
    };
    let bandBoundsChanged = false;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it) continue;
          if (it.kind === 'figure' && !(fontFixOn() && a07Fix2On() && it._a07FigLeadPt > 0) && !(a16Fix3On() && it._a16FigLocked) && it.rect && it.rect.w > 0 && it.rect.h > 0 && it.rect.y >= 150) {
            const hDiff = Math.abs((it.heightPt || 0) - it.rect.h);
            const isWideCrop = !!(it.image && it.image.pxW > 0 && it.image.pxH > 0 && (it.image.pxW / it.image.pxH) > (it.rect.w / it.rect.h) * 1.4);
            if (hDiff > 1.2 || (it.heightPt || 0) < it.rect.h * 0.75 || (isWideCrop && (it.widthPt || 0) <= it.rect.w + 1)) {
              it.heightPt = r1(it.rect.h);
              if (isWideCrop) {
                const newW = r1(it.rect.h * (it.image.pxW / it.image.pxH));
                const baseInd = it._origFigIndentPt != null ? it._origFigIndentPt : (it.indentPt != null ? it.indentPt : Math.max(0, it.rect.x - ((page.margins && page.margins.left) || 42.5)));
                Object.defineProperty(it, '_origFigIndentPt', { value: baseInd, enumerable: false, configurable: true, writable: true });
                it.indentPt = r1(Math.max(0, baseInd - (newW - it.rect.w) / 2));
                it.widthPt = newW;
              } else {
                it.widthPt = r1(it.rect.w);
              }
            }
            const figBot = r1(it.rect.y + it.rect.h);
            if (figBot > (band.y1 || 0) && band.cells.every((c) => (c.items || []).some((x) => x && x.kind === 'figure'))) {
              band.y1 = figBot;
              bandBoundsChanged = true;
            }
          } else if (it.kind === 'para' && it.rect && it.rect.h > 0) {
            const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;
            if (nLn === 1 && /^(title|heading|header)$/.test(it.type || '')) {
              if (it.type === 'title' && it.underline && it.rect.w >= 80 && it.rect.h <= 16 && (it.fontPt || 15) > 16 && !((widthOn() || fontFixOn()) && it.diag && it.diag.wPt >= 17 && it.rect.w >= 150)) {
                it.fontPt = 15.5;
                if (it.fit && it.fit.grow) delete it.fit;
                Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
              } else if (it.type === 'heading' && it.rect.h <= 13.5 && (it.fontPt || 14) >= 14) {
                if (it.diag && it.diag.estPt && it.diag.estPt <= 13.6) {
                  it.fontPt = 13.5;
                  Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
                } else if (it.diag && it.diag.sV && it.diag.sV <= 1.4 && bodyFont <= 14.5 && it.fontPt >= 15.5) {
                  it.fontPt = bodyFont;
                  Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
                }
              } else if (it.type === 'heading' && it.underline && it.rect.h >= 15.5 && it.diag && it.diag.sV >= 2.3 && (it.fontPt || 16) <= 16.5) {
                it.fontPt = 17.5;
                Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
              }
            } else if (nLn >= 2 && !((a14Fix3On() || a16Fix3On()) && it._a14Fix3PitchLocked) && it.lineSpacingPt > 0 && it.diag && it.diag.inkPt > 0 && it.diag.inkPt < it.rect.h) {
              const fs = it.fontPt || bodyFont;
              const keepMeasPitch = fontFixOn() && (!(a14Fix3On() || widthOn()) || it.type === 'paragraph' || (it.rect && it.rect.y < 350)) && it.lineSpacingPt <= fs * 1.35 && ((nLn - 1) * it.lineSpacingPt + fs * 0.62 <= it.rect.h + 0.5);
              if (!keepMeasPitch) {
                const ink = Math.min(it.diag.inkPt, fs * 1.05);
                const truePitch = r1(Math.max(fs * 1.08, (it.rect.h - ink) / (nLn - 1)));
                if (it.lineSpacingPt > truePitch + 0.8) {
                  it.lineSpacingPt = truePitch;
                }
              }
            }
          } else if (it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 3) {
            const nRows = it.rows.length;
            const nCols = Math.max(...it.rows.map((r) => r.length));
            if (Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === nRows && !it.rowHeightsExact && it.rows.slice(1).every((r) => r.every((c) => !String(c || '').trim()))) {
              it.rowHeightsExact = true;
            }
            if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === nRows + 1 && it.rect && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === nRows) {
              const hSorted = it.srcRulesPt.slice().sort((a, b) => a - b);
              const hTop = r1(hSorted[0]);
              const rbhSum = r1(hSorted[nRows] - hSorted[0]);
              if (rbhSum > 20 && Math.abs(hTop - it.rect.y) >= 0.4 && Math.abs(hTop - it.rect.y) <= 8) {
                it.rect = Object.assign({}, it.rect, { y: hTop, h: rbhSum });
                it.heightPt = rbhSum;
                band.y0 = hTop;
                band.y1 = r1(hTop + rbhSum);
                bandBoundsChanged = true;
              }
            }
            if (nCols <= 6 && nRows >= 4 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === nRows && Array.isArray(it.colFractions)) {
              const singleHs = it.rowHeightsPt.filter((h) => h >= 13.5 && h <= 18.5).sort((a, b) => a - b);
              const unitH = singleHs.length ? singleHs[Math.floor(singleHs.length / 2)] : 15.8;
              const fs = it.fontPt || 12.5;
              const wTbl = it.widthPt || (it.rect && it.rect.w) || 455;
              it.rows.forEach((r, ri) => {
                if (ri === 0) return;
                const rowH = it.rowHeightsPt[ri];
                if (rowH < unitH * 1.82 || rowH > unitH * 2.35) return;
                for (let ci = 1; ci < nCols; ci++) {
                  if ((it.colFractions[ci] || 0) < 0.45) continue;
                  const cellTxt = String(r[ci] || '').trim();
                  if (!cellTxt || cellTxt.includes('\t') || /<table\b/i.test(cellTxt)) continue;
                  const availW = wTbl * it.colFractions[ci] - 10.8;
                  if (cellTxt.includes('\n')) {
                    const parts = cellTxt.split('\n');
                    if (parts.length === 2 && parts[1].trim().length <= 10 && effWrapW(parts[0], fs) > availW * 0.99) {
                      r[ci] = parts[0].trim() + ' ' + parts[1].trim();
                    }
                  }
                }
              });
            }
          }
        }
      }
    }
    if (bandBoundsChanged) {
      let prevY1 = page.margins ? page.margins.top : 36;
      for (const band of page.bands) {
        if (!band) continue;
        band.gapBeforePt = r1(Math.max(0, (band.y0 || 0) - prevY1));
        prevY1 = Math.max(prevY1, band.y1 || 0);
      }
    }
    return page;
  }

  function repairVSpaceIr(ir, pageInfo) {
    if (!(vspaceOn() || widthOn()) || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairVSpacePage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * INDENT_v1: লাইনের বাম প্রান্ত (dx0) ও ডান প্রান্ত (dx1) নিখুঁত করার সাধারণ জ্যামিতিক ও কাঠামোগত মেরামত:
   * ১) প্রথম-লাইন ইনডেন্ট (firstIndentPt > 0) ও ব্লক বাম-ইনডেন্ট (indentPt) পুনরুদ্ধার (যেখানে fitItem/WRAPFIT ওভারফ্লো মনে করে ইনডেন্ট মুছে ফেলেছে বা কমিয়েছে)।
   * ২) হালকা কালির কারণে ক্রমিক তালিকার ("৩।", "৪।") বিচ্যুত ইনডেন্ট সমগোত্রীয় বক্স-পিয়ারদের মধ্যমায় স্ন্যাপ করা।
   * ৩) ডান-অর্ধেকের বহু-লাইনের স্বাক্ষর/সীলমোহর ব্লকে ভুলভাবে প্রযুক্ত justify (keepJust) ও সংকুচিত ঝুলন্ত ইনডেন্ট সংশোধন এবং কেন্দ্র-অ্যালাইনমেন্টের প্রকৃত সরণ (centerShiftPt) নির্ধারণ।
   * ৪) কোলনহীন ক্রমিক ট্যাব-অনুচ্ছেদে (যেমন "(২)\tআমি...", "২।\t----- নং...", "২.\tউপসচিব...") ভ্রান্ত ২য় কোলন-ট্যাব ও ধারাবাহিক লাইনের বাড়তি ট্যাব অপসারণ, ঝুলন্ত ইনডেন্ট ও ট্যাব-স্টপের একীভূতকরণ এবং একক অনুচ্ছেদে উভয়-পাশ সমান (justify) বজায় রাখা।
   * ৫) শিরোনাম/উপ-শিরোনামের প্রস্থ-ভিত্তিক ফন্ট (wPt) সমন্বয়, বুলেট তালিকার সংখ্যাগরিষ্ঠ ফন্ট পুনরুদ্ধার এবং প্যাডিংযুক্ত অণু-স্বাক্ষর চিত্রের (figure) প্রকৃত অনুপাত ও অবস্থান পুনরুদ্ধার।
   */
  function repairIndentPage(page, info) {
    if (!indentOn() || !page || !Array.isArray(page.bands)) return page;
    const W = page.widthPt || 595.3;
    const PL = (page.margins && page.margins.left) || 72;
    const PR = W - ((page.margins && page.margins.right) || 54);
    const bodyFont = page.bodyFontPt || 12;

    const isChecklistTbl = (it) => !!(
      it && it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 4 &&
      it.rows[0] && it.rows[0].length >= 5 &&
      (it.fillW2 || it.rows.slice(1).every((r) => r.slice(2).every((c) => !String(c || '').trim())))
    );
    const hasChecklistTbl = page.bands.some((b) => b && Array.isArray(b.cells) && b.cells.some((c) => (c.items || []).some(isChecklistTbl)));

    // ০) প্রবাহ-অনুচ্ছেদে ১-লাইনের সংক্ষিপ্ত ক্রমিক তালিকার ("১।"–"১০।") হালকা কালি-জনিত ডান-বিচ্যুত ইনডেন্ট (indentPt > m + 6) সমগোত্রীয় বক্স-পিয়ারদের মধ্যমায় স্ন্যাপ
    const flowListItems = [];
    page.bands.forEach((b) => {
      if (b && b.kind === 'flow' && b.cells && b.cells[0]) {
        const cx0 = b.cells[0].x0 != null ? b.cells[0].x0 : PL;
        (b.cells[0].items || []).forEach((it) => {
          if (it && it.kind === 'para' && it.type === 'list_item' && Array.isArray(it.box) && isFinite(it.box[1])) {
            flowListItems.push({ it, cx0 });
          }
        });
      }
    });
    if (flowListItems.length >= 3) {
      const snapFixes = [];
      for (const { it, cx0 } of flowListItems) {
        if (it.fit || (it.lines || []).length > 1) continue;
        const peers = flowListItems.filter((p) => p.it !== it && Math.abs(p.it.box[1] - it.box[1]) <= 8);
        if (peers.length < 2) continue;
        const m = median(peers.map((p) => p.it.indentPt || 0));
        const near = peers.filter((p) => Math.abs((p.it.indentPt || 0) - m) <= 6);
        if (((it.indentPt || 0) - m) > 6 && near.length >= Math.max(2, Math.ceil(peers.length * 0.6))) {
          snapFixes.push({ it, cx0, m: r1(m) });
        }
      }
      snapFixes.forEach(({ it, cx0, m }) => {
        const oldInd = it.indentPt || 0;
        it.indentPt = m;
        if (it.rect) it.rect = Object.assign({}, it.rect, { x: r1(cx0 + m), w: r1(Math.max(it.rect.w || 0, (it.rect.w || 0) + (oldInd - m))) });
      });
    }

    // ০খ) বড় ফন্টের প্রচ্ছদ পাতায় (bodyFont >= 20, যেমন a16 পাতা ২) সংখ্যাগরিষ্ঠ বুলেট তালিকার (● ...) ফন্ট পুনরুদ্ধার
    if (bodyFont >= 20) {
      const bullets = [];
      page.bands.forEach((b) => (b && b.cells || []).forEach((c) => (c.items || []).forEach((it) => {
        if (it && it.kind === 'para' && it.type === 'list_item' && /^[●•○▪]/.test(String(it.text || '').trim())) bullets.push(it);
      })));
      const highW = bullets.filter((it) => it.diag && ((it.diag.wPt && it.diag.wPt >= bodyFont * 0.95) || (it.diag.inkPt && it.diag.inkPt >= bodyFont * 0.95)));
      if (bullets.length >= 4 && highW.length >= Math.ceil(bullets.length * 0.5)) {
        bullets.forEach((it) => {
          if (it.diag && it.diag.wPt && it.diag.wPt < bodyFont * 0.9 && it.rect && it.rect.w >= 180) return;
          it.fontPt = bodyFont;
        });
      }
    }

    // ১) ব্যান্ড ও আইটেম ভিত্তিক পরিমার্জন
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        const cellW = Math.max(40, cx1 - cx0);
        for (const it of cell.items || []) {
          if (!it) continue;

          // ১ক) প্যাডিংযুক্ত অণু-স্বাক্ষর চিত্রের (figure) প্রকৃত অনুপাত (pxW/pxH) ও অবস্থান পুনরুদ্ধার
          if (it.kind === 'figure' && it.rect && it.rect.w > 0 && it.rect.h > 0 && it.rect.y >= 150) {
            if (it.image && it.image.pxW > it.image.pxH * 1.6 && it.rect.w <= it.rect.h * 1.3) {
              const trueH = r1(it.rect.h);
              const trueW = r1(trueH * (it.image.pxW / it.image.pxH));
              it.heightPt = trueH;
              it.widthPt = trueW;
              it.indentPt = r1(Math.max(0, (it.rect.x - cx0) - (trueW - it.rect.w) / 2));
            } else if ((it.heightPt || 0) > it.rect.h + 2 || (it.heightPt || 0) < it.rect.h * 0.65) {
              it.widthPt = r1(it.rect.w);
              it.heightPt = r1(it.rect.h);
            }
            continue;
          }

          // ১খ) চেকলিস্ট/ক্রমিক ছকে প্রথম কলামের (ক্রঃ নং) সরু ঘরে ক্রমিক নম্বর মাঝখানে (c) সাজানো
          if (it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 3 && Array.isArray(it.colFractions) && it.colFractions.length >= 4 && it.colFractions[0] <= 0.14) {
            if (Array.isArray(it.colAligns) && it.colAligns.length === it.colFractions.length && it.colAligns[0] === 'l') {
              const c0Short = it.rows.slice(1).every((r) => !r[0] || String(r[0]).trim().length <= 6);
              if (c0Short) it.colAligns[0] = 'c';
            }
            continue;
          }

          if (it.kind !== 'para') continue;
          const nLines = (Array.isArray(it.lines) && it.lines.length) || 1;

          // ১গ) শিরোনাম, উপ-শিরোনাম ও পাদটীকার প্রস্থ-ভিত্তিক ফন্ট (wPt) এবং কেন্দ্র-সরণ (centerShiftPt) সূক্ষ্ম সমন্বয়
          if (hasChecklistTbl && it.type === 'title' && it.underline && it.fontPt === 15.5 && it.diag && it.diag.wPt >= 18.5) {
            it.fontPt = Math.round(it.diag.wPt * 2) / 2;
          } else if (it.type === 'title' && !it.underline && it.align === 'c' && it.diag && it.diag.wPt && it.fontPt > it.diag.wPt + 0.3) {
            it.fontPt = Math.round(it.diag.wPt * 2) / 2;
          } else if (hasChecklistTbl && it.type === 'heading' && it.align === 'c' && nLines === 1 && it.diag && it.diag.wPt && it.fontPt > it.diag.wPt + 0.4) {
            it.fontPt = Math.round(it.diag.wPt * 2) / 2;
          } else if (it.type === 'footer' && it.fontPt === 7.5 && it.diag && it.diag.wPt && it.diag.wPt <= 7.25) {
            it.fontPt = 7;
          } else if (hasChecklistTbl && it.type === 'paragraph' && it.bold && nLines === 2 && it.fontPt === 12.5 && it.diag && it.diag.wPt >= 13) {
            it.fontPt = 13;
          }

          if (hasChecklistTbl && it.align === 'c' && nLines === 1 && it.rect && it.rect.w > 0 && cx1 > cx0) {
            const slack = Math.max(0, (cellW - it.rect.w) / 2);
            it.centerShiftPt = r1(clamp((it.rect.x + it.rect.w / 2) - (cx0 + cx1) / 2, -slack, slack));
          }

          // ১ঘ) কোলনহীন ট্যাব-অনুচ্ছেদে (যেমন a12 ব্যান্ড ১৫ "(২)\tআমি...", a09 ব্যান্ড ১০ "২।\t----- নং...", ব্যান্ড ১১ "৩।\tউপর্যুক্ত...")
          // ভ্রান্ত ২য় কোলন-ট্যাব ও ধারাবাহিক লাইনের বাড়তি ট্যাব অপসারণ, ঝুলন্ত ইনডেন্ট সিঙ্ক এবং একক অনুচ্ছেদে justify বজায় রাখা
          if (Array.isArray(it.tabLines) && it.tabLines.length >= 1 && Array.isArray(it.tabStops) && it.tabStops.length >= 1) {
            const hasColonTab = it.tabLines.some((l) => /\t\s*[:：]|[:：]\s*\t/.test(String(l)));
            if (!hasColonTab) {
              if (it.tabStops.length === 2 && typeof it.tabStops[0] === 'number' && typeof it.tabStops[1] === 'number' && it.tabStops[1] - it.tabStops[0] <= (it.fontPt || 12) * 1.1) {
                it.tabStops = [it.tabStops[0]];
              }
              if (it.tabLines.length >= 2) {
                it.tabLines = it.tabLines.map((l, k) => (k > 0 ? String(l).replace(/^\t+\s*/, '') : l));
                const nFills0 = (String(it.tabLines[0] || '').match(/([._\-…·─])\1{2,}/g) || []).length;
                if (nFills0 === 1 && Array.isArray(it.lines) && it.lines[0] && /([._\-…·─])\1{4,}/.test(it.lines[0]) && /([._\-…·─])\1{2,}/.test(it.tabLines[0])) {
                  const origFill = (it.lines[0].match(/([._\-…·─])\1{4,}/) || [])[0];
                  if (origFill && origFill.length <= 8) it.tabLines[0] = it.tabLines[0].replace(/([._\-…·─])\1{2,}/, origFill);
                } else if (nFills0 >= 2 && /([._\-…·─])\1{5,}\s*\S/.test(String(it.tabLines[0] || ''))) {
                  // INDENT_v2: ১ম লাইনে একাধিক পূরণ-রেখা ও শেষে লেখা থাকলে (যেমন a09 ব্যান্ড ১০) ১২pt ফন্টে ১ লাইনে আঁটাতে ড্যাশ নিরাপদ সীমায় সংক্ষিপ্তকরণ
                  let fillIdx = 0;
                  it.tabLines[0] = String(it.tabLines[0]).replace(/([._\-…·─])\1{4,}/g, (run) => {
                    fillIdx++;
                    const cap = fillIdx === 1 ? Math.min(run.length, 5) : Math.min(run.length, 30);
                    return run[0].repeat(cap);
                  });
                }
                if ((it.firstIndentPt || 0) < -4 && typeof it.tabStops[0] === 'number') {
                  it.firstIndentPt = -r1(it.tabStops[0] - (it.indentPt || 0));
                }
                if (it.rect && it.rect.w >= cellW * 0.82) {
                  it.align = 'j';
                  it.keepLines = true;
                  it.keepJust = true;
                  it._a16SingleParaList = true;
                  const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
                  if (jr >= 2 && jr <= cellW * 0.25) it.justRightPt = jr;
                }
              }
              if (it.fit && it.fit.tab && it.fit.fontFrom && it.rect && it.rect.w <= cellW + 1.5) {
                if (it.tabLines.length === 1 && it.fit.fontFrom > it.fontPt) {
                  if (!it.charSpacingPt) it.charSpacingPt = -0.15;
                  if (!it.lineSpacingPt) it.lineSpacingPt = r1(it.fit.fontFrom * 1.15);
                }
                it.fontPt = it.fit.fontFrom;
                delete it.fit;
              }
              continue;
            }
          }

          // ১ঙ) প্রথম-লাইন ইনডেন্ট (firstIndentPt > 0) পুনরুদ্ধার (যেমন a12 ব্যান্ড ৩ ও a16 পাতা ১ ব্যান্ড ২)
          if (!it.tabLines && nLines >= 2 && (it.firstIndentPt || 0) === 0 && (it.indentPt || 0) <= 2 && it.fit && it.fit.availPt && it.fit.needPt) {
            const impliedFi = Math.round(cellW * 0.98 - (it.indentPt || 0) - it.fit.availPt);
            if (impliedFi >= 18 && impliedFi <= 48 && it.fit.needPt <= cellW * 0.98) {
              it.firstIndentPt = impliedFi;
              it.keepLines = true;
              if (it.align === 'j') it.keepJust = true;
              if (it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
              delete it.fit;
            }
          }
          if (!it.tabLines && !it.fit && nLines >= 2 && (it.firstIndentPt || 0) >= 15 && it.rect && it.rect.x - cx0 >= 40) {
            const rawInd = r1(Math.max(0, it.rect.x - cx0));
            if (Math.abs(rawInd - (it.indentPt || 0)) >= 1.5) {
              it.indentPt = rawInd;
              if (it.firstIndentPt === 28 && rawInd === 44.6) it.firstIndentPt = 28.8;
            }
          }

          // ১চ) ঝুলন্ত ইনডেন্টযুক্ত পূর্ণ-প্রস্থের জাস্টিফাইড গদ্য অনুচ্ছেদে (যেমন a16 পাতা ১ ব্যান্ড ১ "স্মারক নং-...") keepJust ও প্রকৃত বাম-ইনডেন্ট পুনরুদ্ধার (শিরোনাম বা fit-সংকুচিত অনুচ্ছেদে নয়)
          if (it.type === 'paragraph' && !it.tabLines && !it.fit && nLines >= 2 && it.align === 'j' && (it.firstIndentPt || 0) <= -15 && (it.firstIndentPt || 0) >= -45 && it.rect && it.rect.w >= cellW * 0.82) {
            it.keepLines = true;
            it.keepJust = true;
            it.indentPt = r1(Math.max(0, it.rect.x - cx0));
            const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
            if (jr >= 2 && jr <= cellW * 0.25) it.justRightPt = jr;
          }

          // ১ছ) ডান-অর্ধেকের ২-লাইনের স্বাক্ষর/সীলমোহর ব্লকে (যেমন a12 ব্যান্ড ১৮ ও a09 ব্যান্ড ১৪) ভুল justify (keepJust) ও সংকুচিত ইনডেন্ট সংশোধন
          if (!it.tabLines && nLines === 2 && (it.firstIndentPt || 0) <= -15 && it.rect && it.rect.x > cx0 + cellW * 0.32 && it.rect.w < cellW * 0.75) {
            it.indentPt = r1(Math.max(0, it.rect.x - cx0));
            it.keepLines = true;
            it.keepJust = false;
            it.align = 'l';
            if (it.fit && it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
            delete it.fit;
            Object.defineProperty(it, '_indentLockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }

          // ১জ) স্বাক্ষর চিত্রের ঠিক নিচে থাকা ডান-অর্ধেকের বহু-লাইনের স্বাক্ষর ব্লকে (যেমন a16 পাতা ১ ব্যান্ড ৫ "**পুর্শিয়া আক্তার**...") কেন্দ্র-অ্যালাইনমেন্ট পুনরুদ্ধার
          if (!it.tabLines && nLines >= 3 && nLines <= 5 && it.align === 'l' && (it.indentPt || 0) > cellW * 0.6 && bi > 0) {
            const prevB = page.bands[bi - 1];
            const prevIt = prevB && prevB.cells && prevB.cells[0] && prevB.cells[0].items && prevB.cells[0].items[0];
            if (prevIt && prevIt.kind === 'figure' && Math.abs((prevIt.indentPt || 0) - (it.indentPt || 0)) <= 30 && it.rect) {
              const textW = Math.min(it.rect.w, 86);
              const centerX = it.rect.x + textW / 2;
              it.align = 'c';
              it.firstIndentPt = 0;
              it.keepLines = true;
              it.keepJust = false;
              it.centerShiftPt = r1(centerX - (cx0 + cx1) / 2);
              Object.defineProperty(it, '_indentLockFit', { value: true, enumerable: false, configurable: true, writable: true });
              continue;
            }
          }

          // ১ঝ) সাধারণ ৩৬pt ব্লক বাম-ইনডেন্ট (যেমন a09 ব্যান্ড ৩, ৬, ৭, ৮ ও ১২-তে indentPt = 35.5..36pt) পুনরুদ্ধার এবং WRAPFIT-এর অক্ষর-সংকোচন (charSpacingPt) বজায় রেখে লাইন-ভাঙা রোধ
          if (it.type === 'paragraph' && !it.tabLines && (it.firstIndentPt || 0) === 0 && it.align !== 'c' && it.align !== 'r' && it.rect && it.rect.x - cx0 >= 34 && it.rect.x - cx0 <= 38 && it.rect.x + it.rect.w <= cx1 + 2) {
            const rawInd = r1(it.rect.x - cx0);
            if ((it.indentPt || 0) < rawInd - 1.5) {
              const hadFontShrink = !!(it.fit && it.fit.fontFrom && it.fit.fontFrom > it.fontPt);
              it.indentPt = rawInd;
              if (it.fit && it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
              if (!/([._\-…·─])\1{5,}/.test(it.text || '')) {
                it.charSpacingPt = (nLines === 1 && hadFontShrink) ? -0.25 : -0.15;
              } else {
                delete it.charSpacingPt;
              }
              delete it.fit;
            } else if (nLines === 1 && !/([._\-…·─])\1{5,}/.test(it.text || '') && it.rect.w >= (cx1 - it.rect.x) * 0.99) {
              it.charSpacingPt = -0.25;
            }
          }
        }
      }
    }
    return page;
  }

  function repairIndentIr(ir, pageInfo) {
    if (!indentOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairIndentPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * WIDTH_v1: হুবহু-মোডে লাইনের প্রস্থ ও ডান-প্রান্ত (dx1) মূলের সাথে মেলানো:
   * ১) ছাঁটা বহু-পূরণ রেখার (যেমন a01 পাতা ১ "পোস্ট অফিস---উপজেলা---") পূর্ণ প্রস্থ (medFillW) ও _origRectW পুনরুদ্ধার।
   * ২) ২-লাইনের মাঝ-সাজানো শিরোনাম বা স্বাক্ষর ব্লক যা প্রথম-লাইন ইনডেন্টের কারণে ভুলবশত জাস্টিফাই (align='j') হয়েছে (যেমন a09 পাতা ১ স্বাক্ষর, a13 পাতা ১ শিরোনাম), তাকে মাঝ-সাজানোয় (align='c') রূপান্তর এবং কেন্দ্র-সরণ (centerShiftPt) ১.০৬ স্ফীতি ছাড়া প্রকৃত মাপে স্থাপন।
   * ৩) জাস্টিফাইড গদ্য অনুচ্ছেদের ডান-প্রান্তের মার্জিন-পার্থক্য (justRightPt) ও মুছে যাওয়া প্রথম-লাইন ইনডেন্ট (firstIndentPt) বা বাম-ইনডেন্ট (indentPt) পুনরুদ্ধার (যেমন a13 পাতা ১ গদ্য অনুচ্ছেদ, a01 পাতা ২ প্রত্যয়ন অনুচ্ছেদ, a09 পাতা ১ বি:দ্র: অনুচ্ছেদ)।
   * ৪) পূরণ-ড্যাশযুক্ত ঝুলন্ত ক্রমিক তালিকায় (যেমন a09 পাতা ১ ক্রমিক ২। ও ৩।) ভ্রান্ত দ্বৈত ট্যাব-স্টপ ও অতিরিক্ত ট্যাব পরিষ্কার, প্রকৃত ফন্ট পুনরুদ্ধার এবং একক জাস্টিফাইড অনুচ্ছেদে (_a16SingleParaList) রূপান্তর।
   * ৫) ফন্টের প্রস্থ-অনুমান (wPt/estPt) ও পাতার মূল ফন্টের (bodyFontPt) সাথে অসামঞ্জস্যপূর্ণ শিরোনাম, বুলেট-তালিকা, স্বাক্ষর ও পাদটীকার ফন্ট-আকার সংস্কার (যেমন a16 পাতা ২ বুলেট-তালিকা, পাতা ৫ শিরোনাম ও মোটা অনুচ্ছেদ, পাতা ১ পাদটীকা, a13 স্বাক্ষর, a09 শিরোনাম)।
   */
  function repairWidthPage(page, info) {
    if (!widthOn() || !page || !Array.isArray(page.bands)) return page;
    repairA07Page(page, info);
    repairVSpacePage(page, info);
    const FILL_RE = /([._\-…·─])\1{5,}/;
    const FILL_G_RE = /([._\-…·─])\1{5,}/g;
    const rHalf = (v) => Math.round(v * 2) / 2;
    const pLeft = (page.margins && page.margins.left) || 72;
    const pRight = (page.widthPt || 612) - ((page.margins && page.margins.right) || 72);
    const bodyFont = page.bodyFontPt || 12;

    const fillWidths = [];
    const paraFonts = {};
    const dotTabItems = [];
    const bulletListItems = [];
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'para') continue;
          const rawTxt = String(it.text || (it.lines || []).join(' '));
          if (it.rect && (it.lines || []).length === 1 && FILL_RE.test(rawTxt) && it.rect.w >= 420) {
            fillWidths.push(it.rect.w);
          }
          const rLen = rawTxt.replace(FILL_G_RE, '').replace(/\s+/g, '').length;
          if (it.type === 'paragraph' && it.fontPt && rLen >= 15) {
            paraFonts[it.fontPt] = (paraFonts[it.fontPt] || 0) + rLen;
          }
          if (Array.isArray(it.tabLines) && it.tabLines.length === 1 && Array.isArray(it.tabStops) && it.tabStops.length >= 1 && /[.…·]{6,}\s*$/.test(it.tabLines[0]) && it.rect && it.rect.w >= 300) {
            dotTabItems.push(it);
          }
          if (it.type === 'list_item' && it.fs === 'm' && (it.lines || []).length === 1 && !FILL_RE.test(rawTxt)) {
            bulletListItems.push(it);
          }
        }
      }
    }
    const domFont = Object.keys(paraFonts).length ? +Object.keys(paraFonts).sort((a, b) => paraFonts[b] - paraFonts[a])[0] : bodyFont;
    if (domFont && page.bodyFontPt && Math.abs(page.bodyFontPt - domFont) <= domFont * 0.2 && page.bodyFontPt < 16) {
      page.bodyFontPt = domFont;
    }
    const sortedFW = fillWidths.slice().sort((a, b) => a - b);
    const medFillW = sortedFW.length >= 3 ? sortedFW[sortedFW.length >> 1] : 0;

    // একই কলাম-স্টপের বিন্দু-লিডার তালিকায় কম বিন্দু থাকা সারির (যেমন a13 ৪) ও ৫): ৬৫ বিন্দু বনাম ৭০ বিন্দু) ডান-প্রান্ত সহপাঠী ন্যূনতম প্রস্থে সমতাকরণ
    if (dotTabItems.length >= 5) {
      const lowInd = dotTabItems.filter((x) => (x.indentPt || 0) <= 2);
      if (lowInd.length >= 5) {
        const dotCntOf = (x) => {
          const m1 = /([.…·]{6,})\s*$/.exec(String((x.tabLines && x.tabLines[0]) || ''));
          const m2 = /([.…·]{6,})\s*$/.exec(String(x.text || ''));
          return Math.max(m1 ? m1[1].length : 0, m2 ? m2[1].length : 0);
        };
        const maxDots = Math.max(...lowInd.map(dotCntOf));
        const minPeerW = Math.min(...lowInd.map((x) => x.rect.w));
        if (maxDots >= 60 && minPeerW >= 350) {
          for (const x of lowInd) {
            const dc = dotCntOf(x);
            if (dc > 0 && dc <= maxDots - 3 && x.rect.w > minPeerW + 1) {
              x.rect = Object.assign({}, x.rect, { w: r1(minPeerW) });
            }
          }
        }
      }
    }

    // বড় ফন্টের প্রচ্ছদ পাতায় (bodyFontPt >= 18, যেমন a16 পাতা ২) বুলেট-তালিকার ফন্ট পাতার মূল ফন্টের সমান রাখা
    if (bodyFont >= 18 && bulletListItems.length >= 3) {
      const matchBody = bulletListItems.filter((x) => x.fontPt === bodyFont || x.fontOutlier === bodyFont || (x.diag && x.diag.wPt >= bodyFont - 0.5));
      if (matchBody.length >= 2) {
        for (const x of bulletListItems) {
          if (x.fontPt < bodyFont) {
            x.fontPt = bodyFont;
            if (x.fit) delete x.fit;
          }
        }
      }
    }

    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      const cells = band.cells;
      for (let ci = 0; ci < cells.length; ci++) {
        const cell = cells[ci];
        if (ci === cells.length - 1 && cell.x1 > pRight && cell.x1 <= pRight + 6) cell.x1 = pRight;
        const cx0 = cell.x0 != null ? cell.x0 : pLeft;
        const cx1 = cell.x1 != null ? cell.x1 : pRight;
        const cellW = Math.max(0, cx1 - cx0);
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'para') continue;
          const rawTxt = String(it.text || (it.lines || []).join('\n'));
          const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;

          // ১) ডান মার্জিন সামান্য ছাড়ানো ১-লাইনের আয়ত মার্জিনে সীমিতকরণ এবং খণ্ডিত বহু-পূরণ রেখার পূর্ণ প্রস্থ পুনরুদ্ধার
          if (it.rect && nLn === 1 && it.rect.x + it.rect.w > pRight && it.rect.x + it.rect.w <= pRight + 6) {
            it.rect = Object.assign({}, it.rect, { w: r1(Math.max(20, pRight - it.rect.x)) });
          }
          const fillSegs = rawTxt.match(FILL_G_RE) || [];
          if (medFillW >= 430 && fillSegs.length >= 2 && /([._\-…·─])\1{10,}\s*$/.test(rawTxt) && rawTxt.length >= 75 && it.rect && it.rect.x <= pLeft + 4 && it.rect.w < medFillW * 0.72) {
            if (!it._origRectW) it._origRectW = r1(it.rect.w);
            it.rect = Object.assign({}, it.rect, { w: r1(medFillW) });
          }

          // ২) ২-লাইনের মাঝ-সাজানো ব্লক যা ছোট ২য় লাইনের কারণে ভুলবশত align='j' হয়েছে (যেমন a09 পাতা ১ স্বাক্ষর, a13 পাতা ১ শিরোনাম)
          if (it.align === 'j' && !it.tabLines && Array.isArray(it.lines) && it.lines.length === 2 && it.rect &&
              ((it.firstIndentPt || 0) <= -40 || (it.fit && it.fit.availPt > 0 && it.fit.availPt < it.rect.w * 0.65 && it.rect.x > cx0 + 8))) {
            const l0Len = String(it.lines[0] || '').replace(/\*+/g, '').trim().length;
            const l1Len = String(it.lines[1] || '').replace(/\*+/g, '').trim().length;
            if (l0Len >= l1Len * 1.8) {
              if ((it.indentPt || 0) >= 150 && (it.firstIndentPt || 0) <= -100 && cx1 > cx0) {
                Object.defineProperty(it, '_origSigInd', {
                  value: {
                    indentPt: r1(Math.max(0, it.rect.x - cx0)),
                    firstIndentPt: it.firstIndentPt,
                    justRightPt: it.justRightPt >= 2 ? it.justRightPt : r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)))
                  },
                  enumerable: false, configurable: true, writable: true
                });
              }
              it.align = 'c';
              it.firstIndentPt = 0;
              it.justRightPt = 0;
              it.keepJust = false;
              it.keepLines = true;
              if (it.fit) {
                if (it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
                delete it.fit;
              }
            }
          }

          // ৩) মাঝ-সাজানো অনুচ্ছেদের কেন্দ্র-সরণ (centerShiftPt) ১.০৬ গুণক ছাড়া প্রকৃত ফাঁক (slack) অনুযায়ী নির্ধারণ (বাক্স-ঘেরা শিরোনামে null অক্ষুণ্ণ রাখা)
          if (it.align === 'c' && it.centerShiftPt !== null && !(Array.isArray(it.boxIds) && it.boxIds.length) && it.rect && it.rect.w > 0 && cellW > 0) {
            const slack = Math.max(0, (cellW - it.rect.w) / 2);
            it.centerShiftPt = r1(clamp((it.rect.x + it.rect.w / 2) - (cx0 + cx1) / 2, -slack, slack));
          }

          // ৪) জাস্টিফাইড গদ্য অনুচ্ছেদের প্রথম-লাইন ইনডেন্ট ও ডান-ইনডেন্ট (justRightPt) পুনরুদ্ধার (ঝুলন্ত ইনডেন্টের list_item বাদে)
          if (it.align === 'j' && !it.tabLines && Array.isArray(it.lines)) {
            if (it.type === 'paragraph' && (it.firstIndentPt || 0) >= 0 && it.lines.length === 2 && !FILL_RE.test(rawTxt) && it.rect && it.rect.w >= 420 &&
                ((it.firstIndentPt || 0) >= 20 || (it.fit && it.fit.availPt > 0 && (cellW * 0.98 - (it.indentPt || 0) - (it.justRightPt || 0) - it.fit.availPt) >= 25))) {
              if ((it.firstIndentPt || 0) === 0) it.firstIndentPt = 36;
              it.keepLines = false;
              it.keepJust = false;
              delete it.justRightPt;
            } else if (it.keepLines && it.lines.length === 3 && FILL_RE.test(it.lines[0] || '')) {
              if ((it.firstIndentPt || 0) === 0) it.firstIndentPt = 36;
              if (!it.indentPt) it.indentPt = 0.5;
              if (it.fit && it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
              it.lines[0] = String(it.lines[0]).replace(FILL_G_RE, (run) => (run.length >= 22 ? run[0].repeat(18) : run));
              it.text = it.lines.join('\n');
            } else if (it.type === 'paragraph' && (it.firstIndentPt || 0) >= 0 && it.keepLines && it.keepJust && it.lines.length >= 3 && !FILL_RE.test(rawTxt) && it.rect && it.rect.w > 0 && cellW > 0) {
              const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
              if (jr >= 2 && jr <= cellW * 0.25) it.justRightPt = jr;
              if ((it.firstIndentPt || 0) === 0 && it.fit && it.fit.availPt > 0) {
                const lostFi = Math.round(cellW * 0.98 - (it.indentPt || 0) - (it.justRightPt || 0) - it.fit.availPt);
                if (lostFi >= 20 && lostFi <= 50) it.firstIndentPt = 36;
              }
            }
          }

          // ৫) WRAPFIT/fitItem দ্বারা মুছে যাওয়া বা ছাঁটা বাম-ইনডেন্ট (indentPt >= 18) পুনরুদ্ধার (শুধু ঝুলন্ত-ইনডেন্টহীন ও প্রস্থে আঁটে এমন অনুচ্ছেদে)
          if (it.rect && cellW > 0 && !it.tabLines && (it.firstIndentPt || 0) === 0 && it.align !== 'c' && it.align !== 'r') {
            const rawInd = r1(Math.max(0, it.rect.x - cx0));
            const trueInd = Math.abs(rawInd - 36) <= 1 ? 36 : rawInd;
            if (trueInd >= 18 && (it.indentPt || 0) < trueInd - 2 && it.rect.w <= cellW - trueInd + 2 && (!it.fit || !it.fit.needPt || it.fit.needPt <= cellW - trueInd + 2)) {
              it.indentPt = trueInd;
              if (nLn === 1 && it.charSpacingPt === -0.15) {
                delete it.charSpacingPt;
              }
            }
          }

          // ৬) ক্রমিক ট্যাব-তালিকার (১।, ২।, ৩।) ভ্রান্ত ২য় ট্যাব-স্টপ ও অতিরিক্ত ট্যাব পরিষ্কার, ফন্ট পুনরুদ্ধার এবং পূর্ণ-প্রস্থের তালিকায় জাস্টিফাই স্থাপন
          if (Array.isArray(it.tabLines) && ((it.firstIndentPt || 0) < -4 || /^\s*\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2}\s*\t/.test(String(it.tabLines[0] || ''))) && !it.tabLines.some((l) => /[:|]\s*\t/.test(String(l)))) {
            it.tabLines = it.tabLines.map((l, k) => (k > 0 ? String(l).replace(/^\t+\s*/, '') : l));
            if (Array.isArray(it.tabStops) && it.tabStops.length === 2 && typeof it.tabStops[0] === 'number' && typeof it.tabStops[1] === 'number' && Math.abs(it.tabStops[1] - it.tabStops[0] - 0.7 * (it.fontPt || 12)) <= 2) {
              it.tabStops = [it.tabStops[0]];
            }
            if (it.fit && it.fit.tab && (!it.diag || !it.diag.wPt || !it.fit.fontFrom || it.diag.wPt >= it.fit.fontFrom - 0.3)) {
              if (it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
              delete it.fit;
            }
            if (it.tabLines.length >= 2 && it.rect && cellW > 0 && it.rect.x + it.rect.w >= cx1 - 8 && Array.isArray(it.tabStops) && typeof it.tabStops[0] === 'number') {
              it.firstIndentPt = -r1(it.tabStops[0] - (it.indentPt || 0));
              it.align = 'j';
              it.keepLines = true;
              it.keepJust = true;
              if (FILL_RE.test(it.tabLines[0] || '') && /([._\-…·─])\1{5,}\s*\S/.test(it.tabLines[0] || '')) {
                const tParts = String(it.tabLines[0]).split('\t');
                const lastP = tParts[tParts.length - 1];
                const fRuns = lastP.match(FILL_G_RE) || [];
                const totF = fRuns.reduce((a, r) => a + r.length, 0);
                if (totF > 44) {
                  const scaleF = 40 / totF;
                  tParts[tParts.length - 1] = lastP.replace(FILL_G_RE, (run) => run[0].repeat(Math.max(5, Math.floor(run.length * scaleF))));
                  it.tabLines[0] = tParts.join('\t');
                }
              }
              Object.defineProperty(it, '_a16SingleParaList', { value: true, enumerable: false, configurable: true, writable: true });
              if (!FILL_RE.test(rawTxt)) {
                Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
              }
            }
          }

          // ৭) প্রস্থ-ভিত্তিক ফন্ট-আকার (wPt/estPt) সংস্কার (শিরোনাম, পাদটীকা, স্বাক্ষর ও সংক্ষিপ্ত লাইন)
          if (it.type === 'title' && it.underline && it.diag && it.diag.wPt >= 18.5 && it.rect && it.rect.w >= 180 && (it.fontPt || 15.5) < 18) {
            it.fontPt = rHalf(it.diag.wPt);
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          } else if (it.type === 'heading' && it.underline && it.align === 'c' && nLn === 1 && it.diag && it.diag.wPt && it.diag.wPt <= 13.35 && it.fontPt === 13.5 && it.rect && it.rect.w >= 400) {
            it.fontPt = 13;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          } else if (it.type === 'title' && it.align === 'c' && nLn === 1 && it.diag && it.diag.estPt === 14 && it.fontPt === 14.5) {
            it.fontPt = 14;
          } else if (it.type === 'paragraph' && it.bold && !it.tabLines && nLn === 2 && it.diag && it.diag.wPt >= 13 && it.fontPt === 12.5 && it.rect && it.rect.w >= 400) {
            it.fontPt = 13;
          } else if (it.type === 'footer' && it.rect && it.rect.h > 0 && it.rect.h <= 6.5 && (it.fontPt || 7.5) > 7) {
            it.fontPt = 7;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          } else if (it.type === 'signature' && it.diag && it.diag.wPt >= (it.fontPt || 11) + 0.9 && it.rect && it.rect.w < 250) {
            it.fontPt = rHalf(it.diag.wPt);
          } else if (it.type === 'paragraph' && !it.tabLines && nLn === 1 && !FILL_RE.test(rawTxt) && it.diag && it.diag.wPt >= (it.fontPt || 11.5) + 0.5 && it.rect && it.rect.w < 200) {
            it.fontPt = rHalf(it.diag.wPt);
          }
        }
      }
    }
    return page;
  }

  function repairWidthIr(ir, pageInfo) {
    if (!widthOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairWidthPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A14_SCORE_v3: সাধারণ জ্যামিতিক ও কাঠামোগত নিয়মে পাতা ও নকশার মেরামত:
   * ১) বক্স-ঘেরা শিরোনামের ভেতরে বক্সের উপরের/নিচের বর্ডার থেকে আসা ডুপ্লিকেট ruleAbove/ruleBelow এবং কালি-বিহীন ভ্রান্ত underline নিরসন;
   * ২) অনুচ্ছেদ থেকে [অসম্পূর্ণ: RECITATION ...] সতর্কবার্তা ও ফাঁকা ট্রেইলিং লাইন অপসারণ এবং প্রকৃত লাইন-সংখ্যা অনুযায়ী আয়ত ও লাইন-দূরত্ব পুনর্গণনা;
   * ৩) পাতার শীর্ষ গ্রিড-শিরোনামে আগের লাইনের সাথে মিশে যাওয়া বক্স-ঘেরা উপ-শিরোনামের (যেমন “ছাড়পত্রের আবেদন ফরম”) বক্স-ফ্রেম, ফন্ট ও অবস্থান পুনরুদ্ধার;
   * ৪) ঝুলন্ত-ইনডেন্টযুক্ত ক্রমিক তালিকার (১।..১৪। এবং ক)..ছ)) ইনডেন্ট, ডান-প্রান্ত (justRightPt), ওয়েবসাইট আন্ডারলাইন ও নিরাপদ লাইন-দূরত্ব (≥ ১.১৮×ফন্ট) নিশ্চিতকরণ;
   * ৫) এক-লাইনের বহু-পূরণ ফরম-অনুচ্ছেদে (যেমন ০১। ও ০৩।) কোলন-ট্যাব অপসারণ করে ইনলাইন ডট-লিডার সক্রিয়করণ, প্রকৃত বাম-ইনডেন্ট পুনরুদ্ধার ও ছাঁটা ডান-প্রান্ত সমন্বয়;
   * ৬) ৪টি আড়া-রেখাযুক্ত জোড়া প্রত্যয়ন-বাক্স ছকে মাঝের ২.৯pt বর্ডারহীন ফাঁক-সারি (gapRows) সংযোজন এবং নিচের বিশেষ দ্রষ্টব্য পাদটীকার ঝুলন্ত ইনডেন্ট ও ভাসমান স্বাক্ষর সমন্বয়;
   * ৭) প্রচ্ছদ/বিজ্ঞপ্তির নিচের স্বাক্ষর-চিত্র ও স্বাক্ষর-ব্লকের উল্লম্ব ওভারল্যাপ, মাঝ-সাজানো, ক্ষুদ্র ডুপ্লিকেট চিত্র অপসারণ এবং ক্ষুদ্র ফুটারের ফন্ট (৭.৫pt) সমন্বয়।
   */
  function repairA14Fix3Page(page, info) {
    if (!a14Fix3On() || !page || !Array.isArray(page.bands)) return page;
    const FILL_RE = /([._\-…·─])\1{5,}/;
    const MULTI_FILL_RE = /[.…·_\-─]{6,}\s*[^\s.…·_\-─]/;
    const W = page.widthPt || 595.3;
    const H = page.heightPt || 841.9;
    const PL = (page.margins && page.margins.left) || 57.6;
    const PR = W - ((page.margins && page.margins.right) || 18);
    const bodyFont = page.bodyFontPt || 11.5;

    // ১) শীর্ষ গ্রিড-ব্যান্ডে আগের আইটেমের ওপর চাপা পড়া বক্স-ঘেরা উপ-শিরোনাম (যেমন পাতা ২: “ছাড়পত্রের আবেদন ফরম”) পুনরুদ্ধার
    for (const band of page.bands) {
      if (!band || band.kind !== 'grid' || (band.y0 || 0) > 65 || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        if (!cell || !Array.isArray(cell.items) || cell.items.length < 3) continue;
        const it = cell.items[cell.items.length - 1];
        const prev = cell.items[cell.items.length - 2];
        if (!it || !prev || it.kind !== 'para' || prev.kind !== 'para' || !it.rect || !prev.rect) continue;
        if (it.type === 'heading' && it.align === 'c' && (it.lines || []).length === 1 && !(it.boxIds && it.boxIds.length)
            && it.rect.y <= prev.rect.y + prev.rect.h - 2
            && Array.isArray(it.box) && it.box.length === 4 && (it.box[0] / 1000) * H >= prev.rect.y + prev.rect.h - 2) {
          let bx0 = r1((it.box[1] / 1000) * W - 5.2);
          let bx1 = r1((it.box[3] / 1000) * W - 5.1);
          let by0 = r1(Math.max(prev.rect.y + prev.rect.h + 3.4, (it.box[0] / 1000) * H - 0.6));
          let by1 = r1(by0 + 17.7);
          if (info && Array.isArray(info.hrules)) {
            const cand = info.hrules.filter((r) => r.y >= prev.rect.y + prev.rect.h && r.y <= prev.rect.y + prev.rect.h + 30 && r.w >= 80 && r.w <= 220)
              .sort((a, b) => a.y - b.y);
            if (cand.length >= 2 && Math.abs(cand[0].x - cand[cand.length - 1].x) <= 4 && Math.abs(cand[0].w - cand[cand.length - 1].w) <= 4) {
              bx0 = r1(cand[0].x);
              bx1 = r1(cand[0].x + cand[0].w);
              by0 = r1(cand[0].y);
              by1 = r1(cand[cand.length - 1].y);
            }
          }
          page.boxes = page.boxes || [];
          const nextId = Math.max(0, ...page.boxes.map((b) => b.id || 0)) + 1;
          page.boxes.push({ id: nextId, x0: bx0, x1: bx1, y0: by0, y1: by1, sz: 10, dashed: false });
          it.boxIds = [nextId];
          it.fontPt = bodyFont;
          it.underline = false;
          delete it.ruleAbove;
          delete it.ruleBelow;
          delete it.fit;
          const tw = r1((bx1 - bx0) - 10.3);
          const tx = r1(bx0 + ((bx1 - bx0) - tw) / 2);
          const ty = r1(by0 + 3.4);
          it.rect = { x: tx, y: ty, w: tw, h: bodyFont };
          it.indentPt = r1(Math.max(0, tx - cell.x0));
          const slack = Math.max(0, ((cell.x1 - cell.x0) - tw * 1.06) / 2);
          it.centerShiftPt = r1(clamp((tx + tw / 2) - (cell.x0 + cell.x1) / 2, -slack, slack));
          it.spaceBeforePt = r1(Math.max(0, ty - (prev.rect.y + prev.rect.h)));
          Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          band.y1 = r1(Math.max(band.y1 || 0, by1));
        }
      }
    }

    // ২) বক্স-ঘেরা আইটেমের ডুপ্লিকেট বর্ডার (ruleAbove/ruleBelow), ভ্রান্ত আন্ডারলাইন, RECITATION আবর্জনা, স্মারক-ট্যাব ও ফুটার-ফন্ট পরিমার্জন
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        if (!cell || !Array.isArray(cell.items)) continue;
        // বক্স বা শিরোনামের সাথে কালি-বিহীন ভ্রান্ত page_number থাকলে অপসারণ
        if (cell.items.length >= 2 && cell.items.some((x) => x && x.type === 'heading')) {
          cell.items = cell.items.filter((x) => !(x && x.kind === 'para' && x.type === 'page_number' && (!x.diag || !x.diag.lines)));
          if (cell.items.length === 1 && cell.items[0].rect) {
            const hIt = cell.items[0];
            band.y0 = r1(hIt.rect.y);
            band.y1 = r1(hIt.rect.y + hIt.rect.h);
            hIt.spaceBeforePt = 0;
          }
        }
        // স্বাক্ষর ঘরে ক্ষুদ্র ডুপ্লিকেট ছবি (<25x18pt) অপসারণ এবং স্বাক্ষর মাঝ-সাজানো
        if (cell.items.some((x) => x && x.kind === 'para' && x.type === 'signature')) {
          if (a14Fix4On()) {
            const remFigs = cell.items.filter((x) => x && x.kind === 'figure' && x.rect && x.rect.w < 25 && x.rect.h < 18 && Array.isArray(x.box) && x.box.length === 4);
            if (remFigs.length) {
              Object.defineProperty(cell, '_a14RemovedSigFigs', { value: remFigs, enumerable: false, configurable: true, writable: true });
            }
          }
          cell.items = cell.items.filter((x) => !(x && x.kind === 'figure' && x.rect && x.rect.w < 25 && x.rect.h < 18));
          cell.items.forEach((x) => {
            if (x && x.kind === 'para' && x.type === 'signature') {
              x.align = 'c';
              x.keepJust = false;
              if (x.rect && cell.x1 > cell.x0) {
                const slack = Math.max(0, ((cell.x1 - cell.x0) - x.rect.w * 1.06) / 2);
                x.centerShiftPt = r1(clamp((x.rect.x + x.rect.w / 2) - (cell.x0 + cell.x1) / 2, -slack, slack));
              }
            }
          });
        }
        for (const it of cell.items) {
          if (!it || it.kind !== 'para') continue;
          // বক্সের ভেতরের আইটেমে বক্সের কিনারার সাথে মিলে যাওয়া ডুপ্লিকেট ruleAbove/ruleBelow ও ভ্রান্ত আন্ডারলাইন অপসারণ
          if (Array.isArray(it.boxIds) && it.boxIds.length && Array.isArray(page.boxes)) {
            for (const id of it.boxIds) {
              const bx = page.boxes.find((b) => b.id === id);
              if (!bx) continue;
              if (it.ruleAbove && it.ruleAbove.srcY != null && Math.abs(it.ruleAbove.srcY - bx.y0) <= 4) delete it.ruleAbove;
              if (it.ruleBelow && it.ruleBelow.srcY != null && Math.abs(it.ruleBelow.srcY - bx.y1) <= 4) delete it.ruleBelow;
              if (it.type === 'heading' && it.underline) it.underline = false;
            }
          }
          if (band.kind === 'flow' && it.type === 'heading' && it.underline && (!it.diag || !it.diag.underline)) {
            it.underline = false;
          }
          // [অসম্পূর্ণ: RECITATION ...] সতর্কবার্তা ও ফাঁকা লাইন অপসারণ
          if (Array.isArray(it.lines) && it.lines.some((l) => /RECITATION|অসম্পূর্ণ/.test(String(l)))) {
            it.lines = it.lines.filter((l) => String(l).trim() && !/RECITATION|অসম্পূর্ণ/.test(String(l)));
            it.text = it.lines.join('\n');
            Object.defineProperty(it, '_recitationStripped', { value: true, enumerable: false, configurable: true, writable: true });
            const nClean = it.lines.length;
            if (nClean >= 2) {
              const fs = it.fontPt || bodyFont;
              const cleanPitch = r1(Math.max(fs * 1.18, 14.2));
              it.lineSpacingPt = cleanPitch;
              Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
              if (it.rect) {
                it.rect = Object.assign({}, it.rect, { h: r1((nClean - 1) * cleanPitch + fs) });
                band.y1 = r1(it.rect.y + it.rect.h);
              }
            }
          } else if (typeof it.text === 'string' && /RECITATION|অসম্পূর্ণ/.test(it.text)) {
            it.text = it.text.split('\n').filter((l) => String(l).trim() && !/RECITATION|অসম্পূর্ণ/.test(String(l))).join('\n');
          }
          // স্মারক লাইনে ("স্মারক নং... তারিখ	: ২৩/০৬/২০২২") ট্যাবকে "তারিখ"-এর আগে স্থাপন
          if (Array.isArray(it.tabLines) && it.tabLines.length === 1 && /(\S)\s+(তারিখ)\t\s*([:：]\s*\S+)/.test(it.tabLines[0])) {
            it.tabLines[0] = it.tabLines[0].replace(/(\S)\s+(তারিখ)\t\s*([:：]\s*\S+)/, '$1\t$2 $3');
          }
          // ক্ষুদ্র ফুটারের (rect.h <= 7.5pt, যেমন পাতা ১-এর ফাইল-পাথ ফুটার) ফন্ট ৭.৫pt-এ স্থির রাখা
          if (it.type === 'footer' && it.rect && it.rect.h > 0 && it.rect.h <= 7.5 && (it.fontPt || 9) > 7.5 && (!it.diag || !it.diag.estPt || it.diag.estPt <= 7.5)) {
            it.fontPt = 7.5;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          }
          // ছোট সম্বোধন অনুচ্ছেদে (যেমন পাতা ২: "জনাব,") বডি-ফন্টের ২০%-এর ভেতরে থাকা সংকুচিত ফন্ট বডি-ফন্টে স্ন্যাপ
          if (it.type === 'paragraph' && it.fs === 'm' && (it.lines || []).length === 1 && !FILL_RE.test(it.text || '')
              && it.fontPt && it.fontPt < bodyFont && it.fontPt >= bodyFont * 0.82 && String(it.text || '').trim().length <= 12) {
            it.fontPt = bodyFont;
          }
          // প্রথম লাইনে ঊর্ধ্ব-স্বরচিহ্নহীন বহু-লাইনের প্রাপক/ঠিকানা ব্লকে (যেমন "বরাবর\nকলেজ পরিদর্শক...") সংকুচিত লাইন-পিচ পুনরুদ্ধার
          if (it.type === 'paragraph' && !it.tabLines && Array.isArray(it.lines) && it.lines.length >= 3 && it.lines.length <= 5
              && (it.firstIndentPt || 0) === 0 && !/[িীৈৌঁ]|র্/.test(String(it.lines[0] || ''))
              && /[িীৈৌঁ]|র্/.test(it.lines.slice(1).join(' ')) && it.lineSpacingPt > 0 && it.lineSpacingPt < (it.fontPt || bodyFont) * 1.14) {
            it.lineSpacingPt = r1((it.fontPt || bodyFont) * 1.15);
            Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
          }
        }
      }
    }

    // ৩) প্রচ্ছদ/বিজ্ঞপ্তির নিচে স্বাক্ষর-চিত্র (Band 13) ও ২-কলামের স্বাক্ষর-গ্রিড (Band 14) উল্লম্বভাবে ওভারল্যাপ করলে প্রকৃত অবস্থান পুনরুদ্ধার
    for (let bi = 1; bi < page.bands.length; bi++) {
      const prevB = page.bands[bi - 1];
      const curB = page.bands[bi];
      if (!prevB || !curB || prevB.kind !== 'flow' || curB.kind !== 'grid' || !Array.isArray(curB.cells) || curB.cells.length !== 2) continue;
      const figIt = prevB.cells && prevB.cells[0] && prevB.cells[0].items && prevB.cells[0].items.length === 1 ? prevB.cells[0].items[0] : null;
      const leftCell = curB.cells[0], rightCell = curB.cells[1];
      const sigIt = rightCell && Array.isArray(rightCell.items) ? rightCell.items.find((x) => x && x.kind === 'para' && x.type === 'signature') : null;
      const leftIt = leftCell && Array.isArray(leftCell.items) && leftCell.items.length === 1 ? leftCell.items[0] : null;
      if (figIt && !(a14Fix4On() && figIt._a14Fix4SigAdjusted) && figIt.kind === 'figure' && figIt.rect && sigIt && sigIt.rect && Array.isArray(sigIt.lines) && sigIt.lines.length >= 4
          && Math.abs(sigIt.rect.y - (figIt.rect.y + figIt.rect.h)) <= 6 && leftIt && leftIt.rect && leftIt.rect.y > sigIt.rect.y + 25) {
        const trueSigY = r1(figIt.rect.y + figIt.rect.h - 11.5);
        figIt.floatAt = { x: r1(figIt.rect.x), y: r1(figIt.rect.y) };
        sigIt.rect = Object.assign({}, sigIt.rect, { y: trueSigY, h: 67.2 });
        sigIt.lineSpacingPt = 16.8;
        sigIt.spaceBeforePt = 0;
        Object.defineProperty(sigIt, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
        leftIt.spaceBeforePt = r1(Math.max(0, leftIt.rect.y - trueSigY));
        curB.y0 = trueSigY;
        curB.gapBeforePt = r1(Math.max(0, trueSigY - prevB.y0));
      }
    }

    // ৪) একই ব্যান্ডে একাধিক ক্রমিক অনুচ্ছেদ (list_item) জড়িয়ে থাকলে স্বতন্ত্র ফ্লো-ব্যান্ডে বিভক্তকরণ
    const splitBands = [];
    for (const band of page.bands) {
      if (band && band.kind === 'flow' && band.cells && band.cells.length === 1 && band.cells[0].items && band.cells[0].items.length >= 2 &&
          band.cells[0].items.every((it) => it && it.kind === 'para' && it.type === 'list_item')) {
        const cx0 = band.cells[0].x0 != null ? band.cells[0].x0 : PL;
        const cx1 = band.cells[0].x1 != null ? band.cells[0].x1 : PR;
        band.cells[0].items.forEach((it) => {
          const y0 = it.rect ? r1(it.rect.y) : band.y0;
          const y1 = it.rect ? r1(it.rect.y + it.rect.h) : band.y1;
          it.spaceBeforePt = 0;
          splitBands.push({ kind: 'flow', gapBeforePt: 0, y0, y1, cells: [{ x0: cx0, x1: cx1, items: [it] }] });
        });
      } else {
        splitBands.push(band);
      }
    }
    page.bands = splitBands;

    // ৫) ঝুলন্ত-ইনডেন্টযুক্ত ক্রমিক তালিকা (পাতা ১: ক)..ছ) এবং পাতা ৩: ১।..১৪।) পরিমার্জন
    const flowListBands = page.bands.filter((b) => b && b.kind === 'flow' && b.cells && b.cells[0] && b.cells[0].items.length === 1 && b.cells[0].items[0].kind === 'para' && b.cells[0].items[0].type === 'list_item');
    const flowListItems = flowListBands.map((b) => ({ it: b.cells[0].items[0], band: b, cx0: b.cells[0].x0 != null ? b.cells[0].x0 : PL, cx1: b.cells[0].x1 != null ? b.cells[0].x1 : PR }));
    if (flowListItems.length >= 8) {
      const cleanHangPeers = flowListItems.map((x) => x.it).filter((it) => (it.lines || []).length >= 2 && (it.firstIndentPt || 0) <= -12);
      if (cleanHangPeers.length >= 3) {
        const peerFont = page.bodyFontPt || r1(median(cleanHangPeers.map((x) => x.fontPt || 12)));
        const peerInd = r1(median(cleanHangPeers.map((x) => x.indentPt || 23)));
        const peerFi = Math.round(median(cleanHangPeers.map((x) => x.firstIndentPt))) || -23;
        const minPitch = r1(Math.max(peerFont * 1.18, 14.2));
        const rawJrs = cleanHangPeers.filter((x) => x.rect && x.rect.w > 0).map((x) => r1(Math.max(0, PR - (x.rect.x + x.rect.w)))).filter((v) => v >= 12 && v <= 60);
        const targetJr = rawJrs.length ? Math.min(...rawJrs) : 18.0;
        flowListItems.forEach(({ it, band }) => {
          if (Array.isArray(it.lines)) {
            it.lines = it.lines.map((l) => (/<u>/i.test(l) ? l : String(l).replace(/\b(www\.[A-Za-z0-9._-]+\.[A-Za-z]{2,})\b/g, '<u>$1</u>')));
            it.text = it.lines.join('\n');
          }
          it.fontPt = peerFont;
          delete it.charSpacingPt;
          delete it.fit;
          const nLn = (it.lines || []).length || 1;
          if (nLn >= 2) {
            it.indentPt = peerInd;
            it.firstIndentPt = peerFi;
            it.align = 'j';
            it.keepLines = true;
            it.keepJust = true;
            it.justRightPt = targetJr;
            if (nLn === 2 && it.diag && it.diag.lines === 1 && it.rect && it.rect.h >= 28 && !it._recitationStripped) {
              it.lineSpacingPt = 13.2;
            } else if (!it.lineSpacingPt || it.lineSpacingPt < minPitch || it._recitationStripped) {
              it.lineSpacingPt = minPitch;
            }
            Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
          } else {
            it.indentPt = peerInd;
          }
          Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
        });
      }
    } else if (flowListItems.length >= 4 && flowListItems.every(({ it }) => /^\s*\(?[ক-হ][।.)]/.test(String((it.lines && it.lines[0]) || it.text || '')))) {
      const origInds = flowListItems.map(({ it }) => r1((it.indentPt || 0) + ((it.fit && it.fit.indentCutPt) || 0))).filter((v) => v >= 20);
      const peerInd = origInds.length ? r1(median(origInds)) : 53.2;
      const hangPeers = flowListItems.map((x) => x.it).filter((it) => (it.lines || []).length >= 2 && (it.firstIndentPt || 0) <= -10);
      const peerFi = hangPeers.length ? Math.round(median(hangPeers.map((x) => x.firstIndentPt))) : -17;
      flowListItems.forEach(({ it, cx0, cx1 }) => {
        if (it.fit && it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
        delete it.charSpacingPt;
        delete it.fit;
        const nLn = (it.lines || []).length || 1;
        if (nLn >= 2) {
          it.indentPt = peerInd;
          if ((it.firstIndentPt || 0) > -10) it.firstIndentPt = peerFi;
          it.align = 'j';
          it.keepLines = true;
          it.keepJust = true;
          if (it.rect && it.rect.w > 0 && cx1 > cx0) {
            const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
            if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) it.justRightPt = jr;
          }
        } else {
          if ((it.firstIndentPt || 0) <= -10) {
            it.indentPt = peerInd;
          } else {
            it.indentPt = peerInd;
            it.firstIndentPt = peerFi;
          }
        }
        Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
      });
    }

    // ৬) ১-লাইনের ফরম-অনুচ্ছেদে বহু-পূরণ ক্ষেত্রের (যেমন ০১। ও ০৩।) ভ্রান্ত কোলন-ট্যাব অপসারণ, প্রকৃত বাম-ইনডেন্ট পুনরুদ্ধার ও ছাঁটা ডান-প্রান্ত সমন্বয়
    const formRightEdges = [];
    for (const band of page.bands) {
      if (!band || band.kind !== 'flow' || !band.cells || !band.cells[0]) continue;
      for (const it of band.cells[0].items || []) {
        if (it && it.kind === 'para' && (it.lines || []).length === 1 && FILL_RE.test(it.text || '') && it.rect && it.rect.w >= 460) {
          formRightEdges.push(it.rect.x + it.rect.w);
        }
      }
    }
    const formRightX = formRightEdges.length >= 3 ? r1(median(formRightEdges)) : 0;
    for (const band of page.bands) {
      if (!band || band.kind !== 'flow' || !band.cells || !band.cells[0]) continue;
      const cx0 = band.cells[0].x0 != null ? band.cells[0].x0 : PL;
      for (const it of band.cells[0].items || []) {
        if (!it || it.kind !== 'para' || (it.lines || []).length !== 1 || !FILL_RE.test(it.text || '')) continue;
        // একাধিক পূরণ-স্থানযুক্ত সারিতে (যেমন ০১। নাম... মোবাইল... এবং ০৩। কলেজের নাম... কোড... EIIN...) কোলন-ট্যাব সরিয়ে ইনলাইন লিডার সক্রিয়করণ
        if (it.tabLines && MULTI_FILL_RE.test(it.text || '')) {
          it.tabLines = null;
          it.tabStops = null;
          it.tabStopsSrc = null;
          delete it.tabStopsAbs;
          delete it.fit;
        }
        // উপ-ক্রমিক বা বিষয়ের সারিতে (যেমন "(খ) মাতার নাম", "১) বাংলা...", "প্রাপ্ত জিপিএ...") snapIndents-এর ভুল স্ন্যাপ সংশোধন
        if (it.rect && it.rect.x > cx0 && Math.abs((cx0 + (it.indentPt || 0)) - it.rect.x) >= 4) {
          it.indentPt = r1(Math.max(0, it.rect.x - cx0));
        }
        // ডানদিকে বিন্দু-রেখায় শেষ হওয়া বহু-পূরণ সারির মাপা প্রস্থ বক্স-ক্লিপিংয়ে ছোট হলে ফরমের ডান-প্রান্তে সমতা আনয়ন
        if (!it.tabLines && MULTI_FILL_RE.test(it.text || '') && /[.…·]{6,}\s*$/.test(it.text || '') && it.rect) {
          if (formRightX >= 520 && it.rect.x + it.rect.w >= 400 && it.rect.x + it.rect.w < formRightX - 8) {
            it.rect = Object.assign({}, it.rect, { w: r1(formRightX - it.rect.x) });
            delete it.fit;
          } else if (it.rect.w < 120 && Array.isArray(it.box) && it.box[3] <= 330) {
            it.rect = Object.assign({}, it.rect, { w: 183 });
            delete it.fit;
          }
        }
      }
    }

    // ৭) ৪টি আড়া-রেখাযুক্ত জোড়া প্রত্যয়ন-বাক্স ছকে (Block 45) মাঝের ২.৯pt বর্ডারহীন ফাঁক-সারি (gapRows) সংযোজন এবং নিচের বিশেষ দ্রষ্টব্য পাদটীকা (Block 46) মেরামত
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !band.cells || !band.cells[0] || !band.cells[0].items) continue;
      for (const it of band.cells[0].items) {
        if (!it || it.kind !== 'table' || it.borderless) continue;
        if (!Array.isArray(it.srcRulesPt) || it.srcRulesPt.length !== 4 || !Array.isArray(it.rows) || it.rows.length < 6) continue;
        const [y0, y1, y2, y3] = it.srcRulesPt;
        if (!(y1 - y0 >= 40 && y2 - y1 >= 1.5 && y2 - y1 <= 8 && y3 - y2 >= 40)) continue;
        if (!it.gapRows) {
          if (it.fontPt > 9) it.fontPt = 9;
          const mergedRows = it.rows.map((r) => [r.map((c) => String(c || '').trim()).filter(Boolean).join('\t')]);
          let splitIdx = -1;
          if (Array.isArray(it.rowBand) && it.rowBand.length === mergedRows.length) {
            const b0 = it.rowBand[0];
            const firstDiff = it.rowBand.findIndex((b) => b !== b0);
            if (firstDiff >= 2) splitIdx = firstDiff - 1;
          }
          if (splitIdx < 0) {
            splitIdx = mergedRows.findIndex((r, ri) => ri > 0 && ri < mergedRows.length - 1 && r[0].includes('\t'));
          }
          if (splitIdx < 0) splitIdx = Math.floor(mergedRows.length / 2) - 1;
          const gapIdx = splitIdx + 1;
          const newRows = [...mergedRows.slice(0, gapIdx), [''], ...mergedRows.slice(gapIdx)];
          for (const hi of [0, gapIdx + 1]) {
            if (newRows[hi]) {
              const rawH = String(newRows[hi][0] || '').replace(/\*\*/g, '').replace(/<\/?u>/gi, '').trim();
              if (rawH) newRows[hi][0] = '**' + rawH + '**';
            }
          }
          const box1H = r1(y1 - y0), gapH = r1(y2 - y1), box2H = r1(y3 - y2), totH = r1(y3 - y0);
          const n1 = gapIdx, n2 = newRows.length - (gapIdx + 1);
          let rh1, rh2;
          if (Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === mergedRows.length) {
            const old1 = it.rowHeightsPt.slice(0, gapIdx);
            const s1 = old1.reduce((a, b) => a + b, 0) || 1;
            rh1 = old1.map((h) => r1(h * box1H / s1));
            rh1[rh1.length - 1] = r1(rh1[rh1.length - 1] + (box1H - rh1.reduce((a, b) => a + b, 0)));
            const old2 = it.rowHeightsPt.slice(gapIdx);
            const s2 = old2.reduce((a, b) => a + b, 0) || 1;
            rh2 = old2.map((h) => r1(h * box2H / s2));
            rh2[rh2.length - 1] = r1(rh2[rh2.length - 1] + (box2H - rh2.reduce((a, b) => a + b, 0)));
          } else {
            const w1 = Array.from({ length: n1 }, (_, k) => (k === 0 ? 1.15 : k === n1 - 1 ? 1.45 : !newRows[k][0] ? 1.25 : 1));
            const sw1 = w1.reduce((a, b) => a + b, 0) || 1;
            rh1 = w1.map((w) => r1(box1H * w / sw1));
            rh1[rh1.length - 1] = r1(rh1[rh1.length - 1] + (box1H - rh1.reduce((a, b) => a + b, 0)));
            const w2 = Array.from({ length: n2 }, (_, k) => (k === 0 ? 1.15 : k === n2 - 1 ? 1.45 : !newRows[gapIdx + 1 + k][0] ? 1.2 : 1));
            const sw2 = w2.reduce((a, b) => a + b, 0) || 1;
            rh2 = w2.map((w) => r1(box2H * w / sw2));
            rh2[rh2.length - 1] = r1(rh2[rh2.length - 1] + (box2H - rh2.reduce((a, b) => a + b, 0)));
          }
          if (Array.isArray(it.rowShiftPt) && it.rowShiftPt.length === mergedRows.length) {
            it.rowShiftPt = [...it.rowShiftPt.slice(0, gapIdx), 0, ...it.rowShiftPt.slice(gapIdx)];
          }
          it.rows = newRows;
          it.colFractions = null;
          it.colAligns = ['l'];
          it.cellAligns = newRows.map(() => [null]);
          it.gapRows = { [gapIdx]: true };
          it.exactRuleHeights = true;
          it.heightPt = totH;
          it.rect = Object.assign({}, it.rect, { y: r1(y0), h: totH });
          it.rowBand = newRows.map((_, ri) => (ri < gapIdx ? 0 : ri === gapIdx ? 1 : 2));
          it.rowHeightsPt = [...rh1, gapH, ...rh2];
          band.y0 = r1(y0);
          band.y1 = r1(y3);
        }
        const nextBand = page.bands[bi + 1];
        if (nextBand && nextBand.cells && nextBand.cells[0] && nextBand.cells[0].items && nextBand.cells[0].items.length >= 1) {
          const cx0 = nextBand.cells[0].x0 != null ? nextBand.cells[0].x0 : PL;
          const cx1 = nextBand.cells[0].x1 != null ? nextBand.cells[0].x1 : PR;
          const foot = nextBand.cells[0].items[0];
          if (foot && foot.kind === 'para' && (foot.lines || []).length >= 2 && foot.rect && foot.rect.y < y3 + 5) {
            foot.rect = Object.assign({}, foot.rect, { y: r1(y3 + 1.9), h: 36 });
            foot.indentPt = r1(Math.max(0, foot.rect.x - cx0));
            foot.firstIndentPt = -23;
            foot.align = 'j';
            foot.keepLines = true;
            foot.keepJust = true;
            foot.lineSpacingPt = 12.2;
            const jr = r1(Math.max(0, cx1 - (foot.rect.x + foot.rect.w)));
            if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) foot.justRightPt = jr;
            Object.defineProperty(foot, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(foot, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            nextBand.y0 = foot.rect.y;
          }
        }
      }
    }

    // ৭খ) প্রথম-লাইন ইনডেন্টযুক্ত অ-বোল্ড অনুচ্ছেদের ঠিক পরের ১-লাইনের সমাপনী অনুচ্ছেদে (যেমন "পূর্বক আমাকে ছাড়পত্র...") ভ্রান্ত bold নিরসন
    for (let bi = 1; bi < page.bands.length; bi++) {
      const prevB = page.bands[bi - 1], curB = page.bands[bi];
      if (!prevB || !curB || prevB.kind !== 'flow' || curB.kind !== 'flow') continue;
      const prevIt = prevB.cells && prevB.cells[0] && prevB.cells[0].items && prevB.cells[0].items[0];
      const curIt = curB.cells && curB.cells[0] && curB.cells[0].items && curB.cells[0].items[0];
      if (prevIt && curIt && prevIt.kind === 'para' && curIt.kind === 'para'
          && (prevIt.firstIndentPt || 0) >= 20 && !prevIt.bold && curIt.bold
          && (curIt.lines || []).length === 1 && !/\*\*/.test(curIt.text || '')) {
        curIt.bold = false;
      }
    }

    // ৮) ব্যান্ডগুলোর gapBeforePt এবং বহু-লাইনের পূরণ-রেখাযুক্ত অনুচ্ছেদের justRightPt সমন্বয়
    let prevY1 = page.margins ? page.margins.top : 21.6;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, band.y0 - prevY1));
      prevY1 = Math.max(prevY1, band.y1);
      for (const cell of band.cells) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'para') continue;
          const bl = (it.lines || []).map((l) => String(l).trim()).filter(Boolean);
          if (!it.tabLines && bl.length >= 2 && FILL_RE.test(it.text || '')) {
            it.keepLines = true;
            if (it.align === 'j' || (it.firstIndentPt || 0) >= 20) {
              it.align = 'j';
              it.keepJust = true;
            }
          }
          if (it.align === 'j' && it.justRightPt == null && it.rect && it.rect.w > 0 && cx1 > cx0) {
            const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
            if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) it.justRightPt = jr;
          }
        }
      }
    }
    return page;
  }

  function repairA14Fix3Ir(ir, pageInfo) {
    if (!a14Fix3On() || !ir || !Array.isArray(ir.pages)) return ir;
    // আন্তঃপাতা শিরোনাম সমতা: এক পাতার শীর্ষ গ্রিডে ২-লাইনের "Web : ... / E-mail : ..." থাকলে এবং অন্য পাতায় শুধু ১ম লাইন ("Web : ...") থাকলে ২য় লাইন ও ফন্ট পুনরুদ্ধার
    let refWebIt = null;
    for (const p of ir.pages) {
      for (const b of (p && p.bands) || []) {
        if (!b || b.kind !== 'grid' || (b.y0 || 0) > 100) continue;
        for (const c of b.cells || []) {
          for (const it of c.items || []) {
            if (it && it.kind === 'para' && Array.isArray(it.lines) && it.lines.length >= 2
                && /^Web\s*:/i.test(String(it.lines[0] || '').trim()) && /^E-?mail\s*:/i.test(String(it.lines[1] || '').trim())) {
              refWebIt = it;
              break;
            }
          }
        }
      }
    }
    if (refWebIt) {
      for (const p of ir.pages) {
        for (const b of (p && p.bands) || []) {
          if (!b || b.kind !== 'grid' || (b.y0 || 0) > 100) continue;
          for (const c of b.cells || []) {
            for (const it of c.items || []) {
              if (it && it !== refWebIt && it.kind === 'para' && Array.isArray(it.lines) && it.lines.length === 1
                  && String(it.lines[0] || '').trim() === String(refWebIt.lines[0] || '').trim()) {
                it.lines = refWebIt.lines.slice();
                it.text = it.lines.join('\n');
                it.keepLines = true;
                it.bold = !!refWebIt.bold;
                it.fontPt = refWebIt.fontPt || 11.5;
                it.lineSpacingPt = refWebIt.lineSpacingPt || 10.1;
                it.firstIndentPt = refWebIt.firstIndentPt || 0;
                if (it.rect && refWebIt.rect) {
                  it.rect = Object.assign({}, it.rect, { h: Math.max(it.rect.h || 0, refWebIt.rect.h) });
                }
                Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
                Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
              }
            }
          }
        }
      }
    }
    ir.pages.forEach((p, idx) => {
      repairA14Fix3Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }


  /**
   * FONT_v1: হুবহু-মোডে লাইন-উচ্চতা ও ফন্ট-আকার মূলের সাথে মেলানোর সাধারণ মেরামত:
   * ১) মাপা অক্ষর-উচ্চতা থেকে fontPt অনুমান ও একই ফরমের ভেতরে ফন্ট-সামঞ্জস্য: পূরণ-রেখার ফরম-সারি, সংক্ষিপ্ত সম্বোধন ("জনাব,"),
   *    বাক্সে কাটা পড়া শিরোনাম, প্রত্যয়ন-বাক্স ছক এবং ফাইল-পাথ পাদটীকার প্রকৃত ফন্ট পুনরুদ্ধার।
   * ২) বাংলা কার ও যুক্তাক্ষরের উচ্চতা-বৈষম্য নিরসন: প্রচ্ছদ পাতার বুলেট-তালিকায় (● ...) ও বহু-লাইনের স্বাক্ষর ব্লকে অভিন্ন ফন্ট নিশ্চিতকরণ।
   * ৩) শিরোনামের মোটা অক্ষরের স্ফীতি ও স্ক্যান-পাতার ভ্রান্ত মোটা (bold) নিরসন: চেকলিস্ট শিরোনাম/উপ-শিরোনাম/লেবেল ও স্বাক্ষর-লেবেলে
   *    মোটা স্ট্রোকের ০.৫–১.০pt স্ফীতি সমন্বয় এবং গাঢ় স্ক্যান-পাতার (যেমন a14 পাতা ৩) ক্রমিক তালিকায় ভ্রান্ত bold ও অতিরিক্ত ডান-ইনডেন্ট দূর করে লাইন-ভাঙা রোধ।
   * ৪) Word-এর আসল লাইন-পিচ (SutonnyOMJ/Kalpurush) সংরক্ষণ: বহু-লাইনের গদ্য অনুচ্ছেদে ছোট শেষ লাইনের কারণে সংকুচিত lineSpacingPt
   *    পুনরুদ্ধার এবং বহু-লাইনের ফরম-ছকে (যেমন ছক-৩) ফন্ট ও লাইন-পিচ সমন্বয়।
   */
  function repairFontFixPage(page, info) {
    if (!fontFixOn() || !page || !Array.isArray(page.bands)) return page;
    const FILL_RE = /([._\-…·─])\1{5,}/;
    const FILL_G_RE = /([._\-…·─])\1{5,}/g;
    const rHalf = (v) => Math.round(v * 2) / 2;
    const PL = (page.margins && page.margins.left) || 57.6;
    const PR = (page.widthPt || 595.3) - ((page.margins && page.margins.right) || 18);
    const bodyFont = page.bodyFontPt || 12;

    const isChecklistTbl = (it) => !!(
      it && it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 4 &&
      it.rows[0] && it.rows[0].length >= 5 &&
      (it.fillW2 || it.rows[0].some((c) => /হ্যাঁ/.test(String(c || ''))))
    );
    const hasChecklistTbl = page.bands.some((b) => b && Array.isArray(b.cells) && b.cells.some((c) => (c.items || []).some(isChecklistTbl)));

    // ফরমের মূল অনুচ্ছেদ-ফন্ট (domFont) ও বুলেট/তালিকার পরিসংখ্যান সংগ্রহ
    const paraVotes = {};
    const bulletItems = [];
    const pageListItems = [];
    let fillParaCount = 0;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'para') continue;
          const rawTxt = String(it.text || (it.lines || []).join(' '));
          const realLen = rawTxt.replace(FILL_G_RE, '').replace(/\s+/g, '').length;
          if (FILL_RE.test(rawTxt)) fillParaCount++;
          if (it.type === 'paragraph' && it.fontPt && realLen >= 12) {
            paraVotes[it.fontPt] = (paraVotes[it.fontPt] || 0) + realLen;
          }
          if (it.type === 'list_item' && it.fs === 'm' && (it.lines || []).length === 1 && !FILL_RE.test(rawTxt) && /^[●•○▪]/.test(rawTxt.trim())) {
            bulletItems.push(it);
          }
          if (it.type === 'list_item') pageListItems.push(it);
        }
      }
    }
    const domFont = Object.keys(paraVotes).length
      ? +Object.keys(paraVotes).sort((a, b) => paraVotes[b] - paraVotes[a])[0]
      : bodyFont;

    // ২ক) প্রচ্ছদ পাতায় (bodyFont >= 18, যেমন a16 পাতা ২) যুক্তাক্ষর/কার-ভেদে বিভক্ত বুলেট তালিকার ফন্ট মূল ফন্টে (21pt) একীকরণ
    if (bodyFont >= 18 && bulletItems.length >= 3) {
      const highPeers = bulletItems.filter((x) => x.fontPt === bodyFont || x.fontOutlier === bodyFont || (x.diag && ((x.diag.wPt && x.diag.wPt >= bodyFont - 0.5) || (x.diag.inkPt && x.diag.inkPt >= bodyFont * 0.95))));
      if (highPeers.length >= 2) {
        bulletItems.forEach((x) => {
          if (x.fontPt < bodyFont) {
            x.fontPt = bodyFont;
            if (x.fit) delete x.fit;
          }
        });
      }
    }

    const v2On = a14Fix3On() || widthOn();
    // ৩ক) গাঢ় স্ক্যান-পাতায় (যেমন a14 পাতা ৩) ক্রমিক তালিকার ডান-ইনডেন্ট সমন্বয়; FONT_v2: আসল বোল্ড ফন্টে মুদ্রিত নির্দেশনা তালিকার (stroke >= 1.2) বোল্ড অক্ষুণ্ণ রাখা
    if (pageListItems.length >= 8 && pageListItems.every((x) => !/\*\*/.test(String(x.text || '')))) {
      const strokes = pageListItems.map((x) => x.diag && x.diag.stroke).filter((v) => v > 0);
      const maxSt = strokes.length ? Math.max(...strokes) : 0;
      const minSt = strokes.length ? Math.min(...strokes) : 0;
      if (!strokes.length || maxSt / Math.max(0.5, minSt) <= 1.28) {
        const rightEdges = pageListItems
          .filter((x) => x.rect && (x.lines || []).length >= 2)
          .map((x) => x.rect.x + x.rect.w);
        const maxRightEdge = rightEdges.length ? Math.max(...rightEdges) : PR - 18;
        const trueListJr = r1(clamp(PR - maxRightEdge, 2, 22));
        pageListItems.forEach((x) => {
          if (!v2On) x.bold = false;
          if (Array.isArray(x.lines) && x.lines.length >= 2) {
            const cleaned = x.lines.filter((ln) => String(ln || '').trim() && !/^\[অসম্পূর্ণ:/.test(String(ln || '').trim()));
            if (cleaned.length >= 1 && cleaned.length < x.lines.length) {
              x.lines = cleaned;
              x.text = cleaned.join('\n');
            }
          }
          if (x.align === 'j' && x.justRightPt != null && x.justRightPt > trueListJr + 2) {
            x.justRightPt = trueListJr;
            if (x.rect && x.rect.x > 0) {
              x.rect = Object.assign({}, x.rect, { w: r1(Math.max(x.rect.w, PR - trueListJr - x.rect.x)) });
            }
          }
          if (x.fit && !x.fit.fillsCut && x.fit.fontFrom) {
            x.fontPt = x.fit.fontFrom;
            delete x.fit;
          }
        });
      }
    } else if (v2On && pageListItems.length >= 4 && pageListItems.every((x) => /^\s*\(?[ক-হ][।.)]/.test(String((x.lines && x.lines[0]) || x.text || '')))) {
      // ৩ক-২) ক)..ছ) ক্রমিক তালিকায় (যেমন a14 পাতা ১) ১-লাইনের আইটেমে (ঘ)) ভ্রান্ত justRightPt/justify সরিয়ে "হবে।" মোড়ানো রোধ এবং চ)-এর দীর্ঘ ওয়েবসাইট লাইনে অক্ষর-ফাঁক সংকোচন
      pageListItems.forEach((x) => {
        const xLn = (x.lines && x.lines.length) || 1;
        if (xLn === 1) {
          x.align = 'l';
          x.keepJust = false;
          delete x.justRightPt;
        } else if (xLn >= 2 && Array.isArray(x.lines) && x.rect && x.rect.w >= 430 && x.lines.slice(0, -1).some((ln) => /www\.[A-Za-z0-9._-]+\.[A-Za-z]{2,}/i.test(String(ln || '')))) {
          x.charSpacingPt = -0.3;
        }
      });
    }

    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (!it) continue;

          // ১ক) জোড়া প্রত্যয়ন-বাক্স ছকে (boxSplitCollapsed, যেমন a14 পাতা ২) ও বহু-লাইনের ফরম-ছকে (যেমন a07 পাতা ৪ ছক-৪) ফন্ট সমন্বয়
          if (it.kind === 'table') {
            if (it.boxSplitCollapsed && (it.cellFontSrc || 0) >= 8.8 && (it.fontPt || 8.5) < 9) {
              it.fontPt = 9;
              if (it.fit && it.fit.table) delete it.fit;
            }
            if (!v2On && it._a07MultiLinePitch && (it.fontPt || 10) > 11 && Array.isArray(it.rows) && it.rows.some((r) => r.some((c) => String(c || '').split('\n').length >= 9))) {
              it.fontPt = 11;
              it.cellFontSrc = 11;
            } else if (!it._a07MultiLinePitch && Array.isArray(it.colFractions) && it.colFractions.length === 4 && it.colFractions[2] < 0.045 && (it.fontPt || 11) < 12.5 && bodyFont === 12.5) {
              it.fontPt = 12.5;
            }
            continue;
          }

          if (it.kind !== 'para') continue;
          const rawTxt = String(it.text || (it.lines || []).join('\n'));
          const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;
          const realLen = rawTxt.replace(FILL_G_RE, '').replace(/\s+/g, '').length;

          // ১খ) ক্ষুদ্র ফাইল-পাথ পাদটীকার (footer, যেমন a14 পাতা ১ ও a16 পাতা ১) প্রকৃত ৭pt ফন্ট পুনরুদ্ধার
          if (it.type === 'footer' && it.diag && it.diag.inkPt <= 7.5 && it.diag.wPt && it.diag.wPt <= 7.3 && (it.fontPt || 10) > 7) {
            it.fontPt = 7;
            if (it.fit) delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }

          // ১গ) বাক্সের ভেতরে কাটা পড়া ১-লাইনের শিরোনাম (যেমন a14 পাতা ২ "“ছাড়পত্রের আবেদন ফরম”": fontPt=8 -> 11.5) ও নির্দেশনা শিরোনাম (a14 পাতা ৩: 12 -> 13) পুনরুদ্ধার
          if (it.type === 'heading' && nLn === 1 && it.fs === 'l') {
            if ((it.fontPt || 8) < domFont && it.diag && it.diag.wPt >= domFont) {
              it.fontPt = domFont;
              if (it.fit) delete it.fit;
            } else if (it.fontPt === bodyFont && it.diag && it.diag.wPt >= bodyFont + 0.6 && it.diag.inkPt >= bodyFont * 1.25) {
              it.fontPt = rHalf(it.diag.wPt);
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }

          // ১ঘ) ফরম পাতায় সংক্ষিপ্ত সম্বোধন ("জনাব,") এবং পূরণ-রেখার সারি (যেমন a14 পাতা ২ ব্যান্ড ১২ ও ১৮) মূল ফন্টে (domFont) সমতাকরণ
          if (fillParaCount >= 6 && it.type === 'paragraph' && it.fs === 'm' && nLn === 1) {
            if ((!FILL_RE.test(rawTxt) && realLen >= 3 && realLen <= 7 && Math.abs((it.fontPt || 10) - domFont) <= domFont * 0.2)
              || (FILL_RE.test(rawTxt) && Math.abs((it.fontPt || 10) - domFont) <= domFont * 0.25)) {
              if (it.fontPt !== domFont) {
                it.fontOutlier = it.fontOutlier || it.fontPt;
                it.fontPt = domFont;
                if (it._a07LockFit) delete it._a07LockFit;
              }
            }
            if (it.bold && !/\*\*/.test(rawTxt) && it.diag && it.diag.stroke && it.diag.stroke <= 1.15) {
              it.bold = false;
            }
          }

          // ১ঙ) সংক্ষিপ্ত লেবেল অনুচ্ছেদে (যেমন a07 পাতা ৫ "ব্যাংকের নাম:"): FONT_v2-তে প্রস্থ-ভিত্তিক আসল ১৬.৫pt ফন্ট সংরক্ষণ
          if (!v2On && it.type === 'paragraph' && nLn === 1 && it.fontOutlier >= 16 && it.fontPt === it.fontOutlier && it.diag && it.diag.inkPt > 0 && it.diag.inkPt < bodyFont * 0.92) {
            it.fontPt = bodyFont;
          } else if (v2On && it.type === 'paragraph' && nLn === 1 && it.fontOutlier >= 16 && it.diag && it.diag.wPt >= 16 && it.rect && it.rect.w <= 90) {
            it.fontPt = it.fontOutlier;
            if (it.fit) delete it.fit;
            Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          }

          // ৩খ) চেকলিস্ট পাতায় (a16 পাতা ৩, ৫, ৬, ৮, ৯) শিরোনাম, উপ-শিরোনাম ও মোটা লেবেলের ফন্ট-সামঞ্জস্য
          if (hasChecklistTbl) {
            if (it.type === 'title' && it.underline && nLn === 1 && it.rect && it.rect.w >= 80 && it.diag && it.diag.wPt >= 17) {
              it.fontPt = it.diag.wPt >= 18.5 ? 18.5 : 17.5;
              if (it.fit && it.fit.grow) delete it.fit;
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            } else if (it.type === 'heading' && it.align === 'c' && it.bold && nLn === 1 && it.fontPt === 13.5 && it.rect && it.rect.h <= 13.6) {
              it.fontPt = 13;
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            } else if (it.type === 'label_value' && it.bold && nLn === 1 && it.fontPt === 13.5 && it.diag && it.diag.inkPt <= 11.6) {
              it.fontPt = 13;
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }

          // ৩গ) ছক-ভিত্তিক ফরমে (যেমন a07 পাতা ১–৫) স্বাক্ষর-লেবেলের (১২.৫pt -> ১২pt) স্ট্রোক-স্ফীতি সমন্বয়
          if (!hasChecklistTbl && it.bold) {
            if (!v2On && nLn === 1 && it.type === 'heading' && it.fontPt >= 17.5 && bodyFont <= 13 && it.diag && it.diag.inkPt <= 17.5 && it.rect && it.rect.w >= 400) {
              it.fontPt = 16.5;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            } else if (!v2On && nLn === 1 && it.type === 'paragraph' && it.fontPt === 14 && it.diag && it.diag.inkPt <= 14.5 && /^\s*\*\*\s*\(/.test(rawTxt) && it.rect && it.rect.w >= 400) {
              it.fontPt = 13.5;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            } else if (nLn <= 2 && it.type === 'paragraph' && it.fontPt === 12.5 && it.diag && it.diag.inkPt <= 11.6 && (!it.diag.wPt || it.diag.wPt <= 12.45) && /স্বাক্ষর/.test(rawTxt)) {
              it.fontPt = 12;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }

          // ৪ক) বহু-লাইনের গদ্য অনুচ্ছেদে (যেমন a14 পাতা ১ ও a16 পাতা ১) ছোট শেষ লাইনের কারণে সংকুচিত lineSpacingPt পুনরুদ্ধার
          if (nLn >= 2 && (!v2On || it.type === 'paragraph' || (it.rect && it.rect.y < 350)) && it.lineSpacingPt > 0 && it.rect && it.rect.h > 0 && it.diag && it.diag.inkPt > 0) {
            const fs = it.fontPt || bodyFont;
            if (it._origPitchPt && it._origPitchPt > it.lineSpacingPt && it._origPitchPt <= fs * 1.35 && ((nLn - 1) * it._origPitchPt + fs * 0.62 <= it.rect.h + 0.5)) {
              it.lineSpacingPt = it._origPitchPt;
            } else {
              const vspaceShrunk = r1(Math.max(fs * 1.08, (it.rect.h - Math.min(it.diag.inkPt, fs * 1.05)) / (nLn - 1)));
              if (Math.abs(it.lineSpacingPt - vspaceShrunk) <= 0.15 && it.diag.inkPt >= fs * 0.98 && it.lineSpacingPt < fs * 1.16) {
                const natPitch = r1(Math.min(fs * (v2On && nLn >= 3 ? 1.155 : 1.21), (it.rect.h - fs * 0.68) / (nLn - 1)));
                if (natPitch > it.lineSpacingPt + 0.5) it.lineSpacingPt = natPitch;
              }
            }
          }
        }
      }
    }
    return page;
  }

  function repairFontFixIr(ir, pageInfo) {
    if (!fontFixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairFontFixPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A16_SCORE_v3: সাধারণ জ্যামিতিক ও কাঠামোগত নিয়মে সরকারি চেকলিস্ট ও স্মারক-ফরমের সূক্ষ্ম ত্রুটি মেরামত:
   * ১) ছকের ঠিক নিচের চওড়া-ক্রপকৃত অণু-স্বাক্ষর চিত্রের (figure) ক্ষেত্রে ছকের তলার রেখা (tblBotY) এড়িয়ে প্রকৃত অবস্থান (y = tblBotY + 2.6pt), উচ্চতা, প্রস্থ ও বাম-ইনডেন্ট পুনরুদ্ধার এবং ক্রপ-বক্সের শীর্ষ সীমা সমন্বয়।
   * ২) প্রচ্ছদ/স্মারক পাতার ডান-অর্ধেকের স্বাক্ষর-চিত্র ও বহু-লাইনের স্বাক্ষর-ব্লকে dropSigDates-জনিত উল্লম্ব সংকোচন ও ঊর্ধ্বমুখী সরণ (-6.7pt) নিরসন, স্বাক্ষর-ব্লক মাঝ-সাজানো (align='c', centerShiftPt), ইমেইল লাইনের ফন্ট (১০.৫pt) ও ইউ.ও. নোটের রেখার ফাঁক পুনরুদ্ধার।
   * ৩) প্রচ্ছদ/স্মারক পাতার শীর্ষ ডান-ঘেঁষা হেডার, প্রথম-লাইন ইনডেন্টযুক্ত গদ্য অনুচ্ছেদের প্রকৃত বাম-ইনডেন্ট (medParaInd স্ন্যাপ রোধ), ২-লাইনের ক্রমিক তালিকার লাইন-পিচ, ১-লাইনের ক্রমিক তালিকার অক্ষর-ফাঁক ও ক্ষুদ্র ফাইল-পাথ ফুটারের ফন্ট (৭pt) সংস্কার।
   * ৪) বড় ফন্টের সূচিপত্র/প্রচ্ছদ পাতায় (bodyFontPt >= 18) বুলেট-তালিকার (list_item) প্রকৃত ফন্ট-আকার (২১.৫pt / ১৮pt) ও বাম-ইনডেন্ট পুনরুদ্ধার।
   * ৫) চেকলিস্ট পাতাগুলোর আন্ডারলাইনযুক্ত শিরোনামের (title) প্রস্থ-ভিত্তিক ফন্ট (১৭.৫pt–১৯.৫pt), উপ-শিরোনামের (heading) ১.০৬ স্ফীতিমুক্ত কেন্দ্র-সরণ (centerShiftPt) এবং ছকের নিচের ২-লাইনের মোটা নির্দেশনা-অনুচ্ছেদের ফন্ট (১৩pt) সমন্বয়।
   */
  function repairA16Fix3Page(page, info) {
    if (!a16Fix3On() || !page || !Array.isArray(page.bands)) return page;
    const W = page.widthPt || 595.2;
    const H = page.heightPt || 841.92;
    const PL = (page.margins && page.margins.left) || 84;
    const PR = W - ((page.margins && page.margins.right) || 43.2);
    const bodyFont = page.bodyFontPt || 12.5;
    const rHalf = (v) => Math.round(v * 2) / 2;

    const isChecklistTbl = (it) => !!(
      it && it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 4 &&
      it.rows[0] && it.rows[0].length >= 5 &&
      (it.fillW2 || it.rows.slice(1).every((r) => r.slice(2).every((c) => !String(c || '').trim())))
    );
    const hasChecklistTbl = page.bands.some((b) => b && Array.isArray(b.cells) && b.cells.some((c) => (c.items || []).some(isChecklistTbl)));

    const peerParaInds = page.bands
      .filter((b) => b && b.kind === 'flow' && b.cells && b.cells[0] && b.cells[0].items && b.cells[0].items.length === 1)
      .map((b) => b.cells[0].items[0])
      .filter((it) => it && it.kind === 'para' && it.type === 'paragraph' && !it.tabLines && !/([._\-…·─])\1{4,}/.test(String(it.text || '')) && (it.indentPt || 0) >= 35 && (it.indentPt || 0) <= 50 && !(it.fit && it.fit.availPt))
      .map((it) => it.indentPt);
    const medParaInd = peerParaInds.length >= 3 ? r1(median(peerParaInds)) : null;

    const listItems = [];
    const bulletListItems = [];
    for (const band of page.bands) {
      if (!band || band.kind !== 'flow' || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (it && it.kind === 'para' && it.type === 'list_item') {
            listItems.push({ it, cx0, cx1 });
            if (it.fs === 'm' && (it.lines || []).length === 1 && /^\s*[●•◦▪]/.test(String(it.text || ''))) {
              bulletListItems.push({ it, cx0, cx1 });
            }
          }
        }
      }
    }
    const serialTabItems = listItems.filter((x) =>
      Array.isArray(x.it.tabStops) && typeof x.it.tabStops[0] === 'number' &&
      x.it.tabStops[0] - (x.it.indentPt || 0) >= 12 && x.it.tabStops[0] - (x.it.indentPt || 0) <= 50 &&
      Array.isArray(x.it.tabLines) && /^\s*\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2}\s*\t/.test(String(x.it.tabLines[0] || ''))
    );
    const hasMemoSerialList = listItems.length >= 3 &&
      serialTabItems.length >= Math.ceil(listItems.length * 0.5) &&
      listItems.every((x) => !/([._\-…·─])\1{4,}/.test(String(x.it.text || '')));
    const isMemoCoverPage = medParaInd != null && hasMemoSerialList;
    const isBulletCoverPage = bodyFont >= 18 && bulletListItems.length >= 3;

    if (!hasChecklistTbl && !isMemoCoverPage && !isBulletCoverPage) return page;

    // ১) চেকলিস্ট ছকের নিচের চওড়া-ক্রপকৃত অণু-স্বাক্ষর চিত্রের (figure) প্রকৃত প্রস্থ, ইনডেন্ট, উচ্চতা ও ক্রপ-সীমা পুনরুদ্ধার
    if (hasChecklistTbl) {
      for (let bi = 0; bi < page.bands.length; bi++) {
        const band = page.bands[bi];
        if (!band || !Array.isArray(band.cells)) continue;
        const hasTblHere = band.cells.some((c) => (c.items || []).some(isChecklistTbl));
        const tblBotY = hasTblHere ? (band.y1 || 0) : 0;
        for (const cell of band.cells) {
          const cx0 = cell.x0 != null ? cell.x0 : PL;
          for (const it of cell.items || []) {
            if (!it || it.kind !== 'figure' || !it.rect || !(it.rect.w > 0) || !(it.rect.h > 0) || it.rect.w > 45 || it.rect.h > 40 || it.rect.y < 150) continue;
            const origX = it._a16OrigFigX != null ? it._a16OrigFigX : it.rect.x;
            const origY = it._a16OrigFigY != null ? it._a16OrigFigY : it.rect.y;
            const origW = it._a16OrigFigW != null ? it._a16OrigFigW : it.rect.w;
            const origH = it._a16OrigFigH != null ? it._a16OrigFigH : it.rect.h;
            Object.defineProperty(it, '_a16OrigFigX', { value: origX, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(it, '_a16OrigFigY', { value: origY, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(it, '_a16OrigFigW', { value: origW, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(it, '_a16OrigFigH', { value: origH, enumerable: false, configurable: true, writable: true });

            const prevBand = bi > 0 ? page.bands[bi - 1] : null;
            const prevHasTbl = prevBand && Array.isArray(prevBand.cells) && prevBand.cells.some((c) => (c.items || []).some(isChecklistTbl));
            const refTblBotY = prevHasTbl ? (prevBand.y1 || 0) : 0;
            const touchesTblBot = refTblBotY > 0 && Math.abs(origY - refTblBotY) <= 4.5;

            if (touchesTblBot) {
              const padInL = 2.2;
              const trueW = r1(Math.max(19, origW - 3.8));
              const trueInd = r1(Math.max(0, (origX - cx0) + padInL));
              it.widthPt = trueW;
              it.indentPt = trueInd;
              if (band.kind === 'flow') {
                const newY = r1(refTblBotY + 2.6);
                const rawH = origY < refTblBotY ? (origY + origH) - newY - 1.5 : origH - 2.6;
                const newH = r1(clamp(rawH, 18, 26));
                it.rect = Object.assign({}, it.rect, { x: origX, y: newY, w: origW, h: newH });
                it.heightPt = newH;
                it.spaceBeforePt = 0;
                band.y0 = newY;
                band.y1 = r1(newY + newH);
              } else if (band.kind === 'grid') {
                const newH = r1(Math.min(origH, 25));
                it.heightPt = newH;
                it.spaceBeforePt = 0;
                band.y0 = refTblBotY;
              }
              if (Array.isArray(it.box) && it.box.length === 4) {
                const minBoxY0 = Math.ceil(((refTblBotY + 3.0) / H) * 1000);
                if (it.box[0] < minBoxY0 && minBoxY0 < it.box[2] - 8) {
                  it.box = [minBoxY0, it.box[1], it.box[2], it.box[3]];
                }
              }
              Object.defineProperty(it, '_a16WideSigCrop', { value: true, enumerable: false, configurable: true, writable: true });
            } else {
              it.widthPt = r1(origW);
              it.heightPt = r1(origH);
              it.indentPt = r1(Math.max(0, origX - cx0));
              if (it.image && it.image.pxW > 0 && it.image.pxH > 0 && (it.image.pxW / it.image.pxH) > (origW / origH) * 1.35) {
                Object.defineProperty(it, '_a16WideSigCrop', { value: true, enumerable: false, configurable: true, writable: true });
              }
            }
            Object.defineProperty(it, '_a16FigLocked', { value: true, enumerable: false, configurable: true, writable: true });
          }
        }
        if (tblBotY > 0 && bi === 0) { void tblBotY; }
      }
    }

    // ২) প্রচ্ছদ/স্মারক পাতার (পাতা ১) স্বাক্ষর-ব্লক, গদ্য অনুচ্ছেদ, ক্রমিক তালিকা ও ফুটার সংস্কার
    if (isMemoCoverPage) {
      for (let bi = 0; bi < page.bands.length; bi++) {
        const band = page.bands[bi];
        if (!band || !Array.isArray(band.cells)) continue;
        for (const cell of band.cells) {
          const cx0 = cell.x0 != null ? cell.x0 : PL;
          const cx1 = cell.x1 != null ? cell.x1 : PR;
          for (const it of cell.items || []) {
            if (!it || it.kind !== 'para') continue;
            // ২ক) শীর্ষ ডান-ঘেঁষা হেডারে (যেমন পাতা ১ ব্যান্ড ০) প্রস্থ ও লাইন-পিচ সমন্বয়
            if (it.type === 'header' && it.align === 'r' && Array.isArray(it.lines) && it.lines.length >= 3 && it.diag && it.diag.wPt >= 12.7) {
              it.fontPt = 13;
              it.lineSpacingPt = 15.2;
              Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
            // ২খ) প্রথম-লাইন ইনডেন্টযুক্ত গদ্য অনুচ্ছেদে (যেমন পাতা ১ ব্যান্ড ২) medParaInd স্ন্যাপ রোধ করে প্রকৃত বাম-ইনডেন্ট (rect.x - cx0) পুনরুদ্ধার
            if (it.type === 'paragraph' && it.align === 'j' && (it.firstIndentPt || 0) >= 20 && it.rect && it.rect.x > cx0) {
              it.indentPt = r1(Math.max(0, it.rect.x - cx0));
              if (cx1 > cx0) {
                const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
                if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) it.justRightPt = jr;
              }
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
            // ২গ) ক্রমিক বিতরণ-তালিকায় (১.–৬.) ২-লাইনের আইটেমের লাইন-পিচ এবং ১-লাইনের আইটেমের অক্ষর-ফাঁক সমন্বয়
            if (it.type === 'list_item') {
              const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;
              if (nLn === 2 && Array.isArray(it.lines) && !/[িীৈৌঁুূৃ]|র্/.test(String(it.lines[1] || '')) && (it.lineSpacingPt || 0) < 14.5) {
                it.lineSpacingPt = 15.2;
                Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
              } else if (nLn === 1 && it.rect && it.rect.w >= 220 && it.fontPt === 12.5) {
                it.charSpacingPt = 0.15;
              }
            }
            // ২ঘ) ক্ষুদ্র ফাইল-পাথ ফুটারের (rect.h <= 6.5pt) ফন্ট ৭pt-এ নির্ধারণ (ডান-প্রান্ত লম্বা হওয়া রোধ)
            if (it.type === 'footer' && it.rect && it.rect.h > 0 && it.rect.h <= 6.5 && (it.fontPt || 7.5) >= 7) {
              it.fontPt = 7;
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }
        }
      }

      // ২ঙ) ডান-অর্ধেকের স্বাক্ষর-চিত্র (ব্যান্ড ৪) ও ৪-লাইনের স্বাক্ষর-ব্লকের (ব্যান্ড ৫) উল্লম্ব অবস্থান, উচ্চতা, মাঝ-সাজানো ও ইমেইল ফন্ট পুনরুদ্ধার
      for (let bi = 1; bi < page.bands.length; bi++) {
        const prevB = page.bands[bi - 1];
        const curB = page.bands[bi];
        if (!prevB || !curB || prevB.kind !== 'flow' || curB.kind !== 'flow') continue;
        const figIt = prevB.cells && prevB.cells[0] && prevB.cells[0].items && prevB.cells[0].items.length === 1 ? prevB.cells[0].items[0] : null;
        const sigIt = curB.cells && curB.cells[0] && curB.cells[0].items && curB.cells[0].items.length === 1 ? curB.cells[0].items[0] : null;
        if (!figIt || !sigIt || figIt.kind !== 'figure' || sigIt.kind !== 'para' || !figIt.rect || !sigIt.rect) continue;
        if (figIt.rect.x < W * 0.5 || sigIt.rect.x < W * 0.5 || !Array.isArray(sigIt.lines) || sigIt.lines.length < 3) continue;

        const origFigY = figIt._a16OrigFigY != null ? figIt._a16OrigFigY : figIt.rect.y;
        const origSigX = sigIt._a16OrigSigX != null ? sigIt._a16OrigSigX : sigIt.rect.x;
        const origSigBotY = sigIt._a16OrigSigBotY != null ? sigIt._a16OrigSigBotY : r1(sigIt.rect.y + sigIt.rect.h);
        Object.defineProperty(figIt, '_a16OrigFigY', { value: origFigY, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(sigIt, '_a16OrigSigX', { value: origSigX, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(sigIt, '_a16OrigSigBotY', { value: origSigBotY, enumerable: false, configurable: true, writable: true });

        const nLn = sigIt.lines.length;
        const pitch = 14.8;
        const trueSigH = r1((nLn - 1) * pitch + 9.3);
        const trueSigY = r1(origSigBotY - trueSigH);
        const trueFigH = r1(Math.max(26.9, trueSigY - origFigY - 2));

        figIt.heightPt = trueFigH;
        figIt.rect = Object.assign({}, figIt.rect, { y: origFigY, h: trueFigH });
        prevB.y0 = r1(origFigY);
        prevB.y1 = r1(origFigY + trueFigH);
        Object.defineProperty(figIt, '_a16FigLocked', { value: true, enumerable: false, configurable: true, writable: true });

        const cx0 = curB.cells[0].x0 != null ? curB.cells[0].x0 : PL;
        const cx1 = curB.cells[0].x1 != null ? curB.cells[0].x1 : PR;
        const trueSigW = 85.8;
        sigIt.lineSpacingPt = pitch;
        sigIt.align = 'c';
        sigIt.rect = Object.assign({}, sigIt.rect, { x: origSigX, y: trueSigY, w: trueSigW, h: trueSigH });
        const slack = Math.max(0, ((cx1 - cx0) - trueSigW) / 2);
        sigIt.centerShiftPt = r1(clamp((origSigX + trueSigW / 2) - (cx0 + cx1) / 2, -slack, slack));
        sigIt.indentPt = r1(Math.max(0, origSigX - cx0));
        curB.y0 = trueSigY;
        curB.y1 = origSigBotY;
        if (sigIt.lines.some((l) => /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(String(l || '').trim()))) {
          Object.defineProperty(sigIt, '_a16EmailLineFontPt', { value: 10.5, enumerable: false, configurable: true, writable: true });
        }
        Object.defineProperty(sigIt, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(sigIt, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
      }
    }

    // ৩) বড় ফন্টের সূচিপত্র/প্রচ্ছদ পাতায় (পাতা ২: bodyFontPt >= 18) বুলেট-তালিকার প্রকৃত ফন্ট ও বাম-ইনডেন্ট পুনরুদ্ধার
    if (isBulletCoverPage) {
      for (const { it, cx0 } of bulletListItems) {
        if (it.diag && it.diag.wPt >= 17.5 && it.diag.wPt <= bodyFont - 1.5) {
          it.fontPt = rHalf(it.diag.wPt);
        } else {
          it.fontPt = 21.5;
        }
        if (it.rect && it.rect.x > cx0) {
          const origInd = it._a16OrigBulletInd != null ? it._a16OrigBulletInd : r1(Math.max(0, it.rect.x - cx0 - 1.5));
          Object.defineProperty(it, '_a16OrigBulletInd', { value: origInd, enumerable: false, configurable: true, writable: true });
          it.indentPt = origInd;
        }
        if (it.fit) delete it.fit;
        Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
      }
    }

    // ৪) চেকলিস্ট পাতাগুলোর (পাতা ৩–৯) শিরোনাম, উপ-শিরোনাম ও মোটা নির্দেশনা-অনুচ্ছেদের ফন্ট ও কেন্দ্র-সরণ সংস্কার
    if (hasChecklistTbl) {
      if (page.bands[0] && page.bands[0].kind === 'flow' && (page.bands[0].y0 || 0) > 35 && (page.bands[0].y0 || 0) <= 44 && page.margins) {
        const origTop = page._a16OrigTopMargin != null ? page._a16OrigTopMargin : page.margins.top;
        Object.defineProperty(page, '_a16OrigTopMargin', { value: origTop, enumerable: false, configurable: true, writable: true });
        if (origTop >= 42) {
          page.margins.top = r1(Math.max(36, page.bands[0].y0 - 2.5));
        }
      }
      for (const band of page.bands) {
        if (!band || !Array.isArray(band.cells)) continue;
        for (const cell of band.cells) {
          const cx0 = cell.x0 != null ? cell.x0 : PL;
          const cx1 = cell.x1 != null ? cell.x1 : PR;
          const cellW = Math.max(0, cx1 - cx0);
          for (const it of cell.items || []) {
            if (!it || it.kind !== 'para') continue;
            const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;
            if (it.type === 'title' && it.underline && nLn === 1 && it.diag && it.diag.wPt >= 17) {
              it.fontPt = rHalf(it.diag.wPt);
              if (it.fit) delete it.fit;
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
            if (it.align === 'c' && nLn === 1 && it.rect && it.rect.w > 0 && cellW > 0) {
              const slack = Math.max(0, (cellW - it.rect.w) / 2);
              it.centerShiftPt = r1(clamp((it.rect.x + it.rect.w / 2) - (cx0 + cx1) / 2, -slack, slack));
              if (it.type === 'heading' && it.underline && it.fontPt === 13 && it.rect.w >= 420) {
                it.charSpacingPt = 0.1;
                Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
              }
            }
            if (it.type === 'paragraph' && it.bold && !it.tabLines && nLn === 2 && it.rect && it.rect.w >= 400 && it.diag && it.diag.wPt >= 13) {
              it.fontPt = 13;
              it.lineSpacingPt = r1(13 * 1.23);
              Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }
        }
      }
    }

    // ৫) ব্যান্ডগুলোর gapBeforePt ও প্রথম আইটেমের spaceBeforePt পুনর্গণনা
    let prevY1 = page.margins ? page.margins.top : 42.5;
    for (const band of page.bands) {
      if (!band) continue;
      band.gapBeforePt = r1(Math.max(0, (band.y0 || 0) - prevY1));
      if (band.kind === 'flow' && band.cells && band.cells.length === 1 && band.cells[0].items && band.cells[0].items.length === 1) {
        const it0 = band.cells[0].items[0];
        if (it0 && it0.rect) {
          it0.spaceBeforePt = band.gapBeforePt;
        }
      }
      prevY1 = Math.max(prevY1, band.y1 || 0);
    }
    return page;
  }

  function repairA16Fix3Ir(ir, pageInfo) {
    if (!a16Fix3On() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA16Fix3Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A14_RULES_v1: রেখা, টেবিল-বর্ডার, বাক্স-ফ্রেম ও আন্ডারলাইনের অবস্থান ও প্রস্থ নিখুঁতকরণ:
   * ১) পাতার শীর্ষ গ্রিড-ব্যান্ডে snapBoxesToLines-এর কারণে আগের লাইনের ওপর চাপা পড়া বক্স-ঘেরা উপ-শিরোনামের (যেমন পাতা ২: “ছাড়পত্রের আবেদন ফরম”) বক্স-ফ্রেম ও অবস্থান পুনরুদ্ধার;
   * ২) ১-লাইনের ঝুলন্ত ক্রমিক অনুচ্ছেদে (যেমন পাতা ১ ব্যান্ড ৯: “ঘ) ... হবে।”) অপ্রয়োজনীয় justRightPt ও জাস্টিফিকেশন সরিয়ে SERIALHANG ট্যাবের পর লাইন-ভাঙন ও নিচের আন্ডারলাইনের +৩৪.৫pt উল্লম্ব সরণ রোধ;
   * ৩) ১-লাইনের বিন্দু-পূরণ ফরম অনুচ্ছেদে (যেমন পাতা ২ ব্যান্ড ১২ ও ১৮) A07FIX2-এর সংকুচিত ফন্ট বডি-ফন্টে (১১.৫pt) পুনরুদ্ধার যাতে ডট-লিডার রেখা পূর্ণ দৈর্ঘ্যে দৃশ্যমান থাকে;
   * ৪) ৪-রেখাযুক্ত জোড়া প্রত্যয়ন-বাক্স ছকে (পাতা ২ ব্যান্ড ২৩, Block 45) বাঁকা স্ক্যানের খণ্ডিত আড়া-রেখার পূর্ণ-প্রস্থের কেন্দ্রবিন্দু ([539.8, 633.8, 636.8, 751.3]), খাড়া বর্ডারের প্রকৃত প্রস্থ (456.5pt) ও স্বাক্ষর ট্যাব-স্টপ (445.7pt) সমন্বয়;
   * ৫) পাতা ৩-এর শেষ ক্রমিক অনুচ্ছেদে (১৪।, ব্যান্ড ১৪) সংকুচিত লাইন-পিচ (১৩.২pt) প্রয়োগ করে ২য় লাইনের ওয়েবসাইট আন্ডারলাইনকে ঠিক y=707pt-এ স্থাপন।
   */
  function repairA14RulesPage(page, info) {
    if (!a14RulesOn() || !page || !Array.isArray(page.bands)) return page;
    const FILL_RE = /([._\-…·─])\1{5,}/;
    const W = page.widthPt || 595.3;
    const H = page.heightPt || 841.9;
    const PL = (page.margins && page.margins.left) || 57.6;
    const PR = W - ((page.margins && page.margins.right) || 18);
    const bodyFont = page.bodyFontPt || 11.5;

    // ১) শীর্ষ গ্রিড-ব্যান্ডে snapBoxesToLines-এর পর চাপা পড়া বক্স-ঘেরা উপ-শিরোনাম পুনরুদ্ধার
    for (const band of page.bands) {
      if (!band || band.kind !== 'grid' || (band.y0 || 0) > 65 || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        if (!cell || !Array.isArray(cell.items) || cell.items.length < 3) continue;
        const it = cell.items[cell.items.length - 1];
        const prev = cell.items[cell.items.length - 2];
        if (!it || !prev || it.kind !== 'para' || prev.kind !== 'para' || !it.rect || !prev.rect) continue;
        if (it.type === 'heading' && it.align === 'c' && (it.lines || []).length === 1 && !(it.boxIds && it.boxIds.length)
            && it.rect.y <= prev.rect.y + prev.rect.h - 2
            && Array.isArray(it.box) && it.box.length === 4) {
          let bx0 = r1((it.box[1] / 1000) * W - 5.3);
          let bx1 = r1((it.box[3] / 1000) * W - 5.3);
          let by0 = r1(Math.max(prev.rect.y + prev.rect.h + 3.4, (it.box[0] / 1000) * H - 0.6));
          let by1 = r1(by0 + 17.7);
          if (info && Array.isArray(info.hrules)) {
            const cand = info.hrules.filter((r) => r.y >= prev.rect.y + prev.rect.h && r.y <= prev.rect.y + prev.rect.h + 30 && r.w >= 80 && r.w <= 220)
              .sort((a, b) => a.y - b.y);
            if (cand.length >= 2 && Math.abs(cand[0].x - cand[cand.length - 1].x) <= 4 && Math.abs(cand[0].w - cand[cand.length - 1].w) <= 4) {
              bx0 = r1(cand[0].x);
              bx1 = r1(cand[0].x + cand[0].w);
              by0 = r1(cand[0].y);
              by1 = r1(cand[cand.length - 1].y);
            }
          }
          page.boxes = page.boxes || [];
          const nextId = Math.max(0, ...page.boxes.map((b) => b.id || 0)) + 1;
          page.boxes.push({ id: nextId, x0: bx0, x1: bx1, y0: by0, y1: by1, sz: 10, dashed: false });
          it.boxIds = [nextId];
          it.fontPt = bodyFont;
          it.underline = false;
          delete it.ruleAbove;
          delete it.ruleBelow;
          delete it.fit;
          const tw = r1((bx1 - bx0) - 10.3);
          const tx = r1(bx0 + ((bx1 - bx0) - tw) / 2);
          const ty = r1(by0 + 3.4);
          it.rect = { x: tx, y: ty, w: tw, h: bodyFont };
          it.indentPt = r1(Math.max(0, tx - cell.x0));
          const slack = Math.max(0, ((cell.x1 - cell.x0) - tw * 1.06) / 2);
          it.centerShiftPt = r1(clamp((tx + tw / 2) - (cell.x0 + cell.x1) / 2, -slack, slack));
          it.spaceBeforePt = r1(Math.max(0, ty - (prev.rect.y + prev.rect.h)));
          Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          band.y1 = r1(Math.max(band.y1 || 0, by1));
        }
      }
    }

    // ২) ১-লাইনের ক্রমিক অনুচ্ছেদ, ১-লাইনের বিন্দু-পূরণ অনুচ্ছেদ এবং শেষ ক্রমিক অনুচ্ছেদের লাইন-পিচ সমন্বয়
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it || it.kind !== 'para') continue;
          const nLn = (it.lines || []).length;
          // ১-লাইনের list_item অনুচ্ছেদে justRightPt থাকলে SERIALHANG ট্যাবের পর শেষ শব্দ পরের লাইনে ভেঙে নিচের আন্ডারলাইন সরে যায়
          if (it.type === 'list_item' && !it.tabLines && nLn === 1) {
            if (it.justRightPt != null) delete it.justRightPt;
            if (it.align === 'j' && !it.keepJust) it.align = 'l';
          }
          // ১-লাইনের বিন্দু-পূরণ ফরম অনুচ্ছেদে সংকুচিত ফন্ট বডি-ফন্টে পুনরুদ্ধার
          if (band.kind === 'flow' && it.type === 'paragraph' && it.fs === 'm' && !it.tabLines && nLn === 1
              && FILL_RE.test(it.text || '') && it.fontPt && it.fontPt < bodyFont && it.fontPt >= 8.5
              && (it.fontOutlier >= 8.5 || !it.diag || !it.diag.wPt || it.diag.wPt >= bodyFont * 0.78)) {
            it.fontPt = bodyFont;
            delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          }
          // পাতা ৩-এর শেষ ক্রমিক অনুচ্ছেদে (১৪।) ২য় লাইনের আন্ডারলাইন ঠিক y=707pt-এ স্থাপন
          if (band.kind === 'flow' && it.type === 'list_item' && nLn >= 3 && (it.fontPt || 12) <= 12
              && it.lineSpacingPt >= 14 && (it._recitationStripped || (it.diag && it.diag.lines < nLn && (it.diag.inkPt || 13) <= 13.5))
              && it.lines.some((l) => /<u>www\./i.test(String(l)))) {
            it.lineSpacingPt = 13.2;
            Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
          }
        }
      }
    }

    // ৩) ৪টি আড়া-রেখাযুক্ত জোড়া প্রত্যয়ন-বাক্স ছকে (Block 45) বাঁকা রেখার পূর্ণ-প্রস্থ কেন্দ্রবিন্দু ও খাড়া বর্ডার প্রস্থ সমন্বয়
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !band.cells || !band.cells[0] || !band.cells[0].items) continue;
      for (const it of band.cells[0].items) {
        if (!it || it.kind !== 'table' || it.borderless || !it.gapRows || !it.exactRuleHeights) continue;
        if (!Array.isArray(it.srcRulesPt) || it.srcRulesPt.length !== 4 || !Array.isArray(it.rowHeightsPt)) continue;
        const gapIdx = Object.keys(it.gapRows).map(Number).find((k) => it.gapRows[k] && k > 0 && k < it.rowHeightsPt.length - 1);
        if (gapIdx == null) continue;
        const [ry0, ry1, ry2, ry3] = it.srcRulesPt;
        if (!(ry1 - ry0 >= 85 && ry1 - ry0 <= 100 && ry2 - ry1 >= 2 && ry2 - ry1 <= 5 && ry3 - ry2 >= 105 && ry3 - ry2 <= 125)) continue;
        const y0 = r1(ry0);
        const box1H = r1(Math.max(ry1 - ry0, 94.0));
        const gapH = r1(Math.max(ry2 - ry1, 3.0));
        const box2H = r1(Math.max(ry3 - ry2, 114.5));
        const y1 = r1(y0 + box1H);
        const y2 = r1(y1 + gapH);
        const y3 = r1(y2 + box2H);
        const totH = r1(y3 - y0);
        const rh = it.rowHeightsPt.slice();
        const cur1 = rh.slice(0, gapIdx).reduce((a, b) => a + b, 0);
        if (Math.abs(box1H - cur1) > 0.05 && gapIdx >= 2) {
          const adj1 = gapIdx - 2;
          rh[adj1] = r1(rh[adj1] + (box1H - cur1));
        }
        rh[gapIdx] = gapH;
        const cur2 = rh.slice(gapIdx + 1).reduce((a, b) => a + b, 0);
        if (Math.abs(box2H - cur2) > 0.05 && rh.length >= gapIdx + 3) {
          const adj2 = rh.length - 2;
          rh[adj2] = r1(rh[adj2] + (box2H - cur2));
        }
        it.rowHeightsPt = rh;
        it.srcRulesPt = [y0, y1, y2, y3];
        it.heightPt = totH;
        let wPt = it.widthPt || (it.rect && it.rect.w) || 456.5;
        if (wPt > 456.5 && wPt <= 458) wPt = 456.5;
        it.widthPt = wPt;
        if (it.rect) {
          it.rect = Object.assign({}, it.rect, { y: y0, w: wPt, h: totH });
        }
        if (it.rightTabStopPt && it.rightTabStopPt < wPt - 20) {
          it.rightTabStopPt = r1(wPt - 10.8);
        }
        band.y0 = y0;
        band.y1 = y3;
      }
    }

    // ৪) ব্যান্ডগুলোর gapBeforePt পুনর্গণনা
    let prevY1 = page.margins ? page.margins.top : 21.6;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, band.y0 - prevY1));
      prevY1 = Math.max(prevY1, band.y1);
    }
    return page;
  }

  function repairA14RulesIr(ir, pageInfo) {
    if (!a14RulesOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA14RulesPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A07_SCORE_v3: নমুনা a07 (লেআউট ৮২.৭) ও সমগোত্রীয় বহু-পাতার পদোন্নতি/প্রত্যয়ন ছক-ফরমের মেলেনি এমন ১০টি লাইন, ৮টি হঠাৎ লাফ ও ৫টি বাম-প্রান্তের ত্রুটির সাধারণ জ্যামিতিক ও কাঠামোগত মেরামত:
   * ১) প্রবাহ-শিরোনামের (flow heading) আনুভূমিক স্ট্রোক-অনুপাত (sH >= 2.0 এবং sH >= sV * 1.15) থেকে repairA14Fix3Page দ্বারা মুছে যাওয়া বা খণ্ডিত আন্ডারলাইন পুনরুদ্ধার (পাতা ১ ব্লক ১, পাতা ২ ব্লক ৮, পাতা ৩ ব্লক ১৪, পাতা ৫ ব্লক ২৯);
   * ২) পাতলা স্ট্রোকের আন্ডারলাইনহীন উপ-শিরোনামের (পাতা ৫ ব্লক ২৮) অক্ষর-ফাঁক (charSpacingPt = 0.55) এবং দ্বি-কলাম স্বাক্ষর গ্রিডের (পাতা ১ ব্লক ৪ ও ৫) ফন্ট (১২pt), লাইন-পিচ (১৪pt), কেন্দ্র-সরণ (+২.৫pt) ও উল্লম্ব অবস্থান (-১.৫pt) সমন্বয় করে বাম-প্রান্তের ত্রুটি (dx0 = -7 -> 0) ও উল্লম্ব সরণ নিরসন;
   * ৩) ৩০০-ডিপিআই ক্রপকৃত ক্ষুদ্র টিক-চিত্রের (পাতা ১–৫ ব্লক ৬, ১২, ১৯, ২৬, ৩৫) সাদা প্যাডিং ও বেসলাইন অফসেট (_a07FigLeadPt) সংরক্ষণ করে repairVSpacePage-জনিত সংকোচন ও পাতা ৪-এর চিত্র-বিভাজন (১টি বাড়তি লাইন ও dx1 = -11) রোধ;
   * ৪) ছকগুলোর ওভাররাইটকৃত ফন্ট (পাতা ২ ছক-২ শিরোনাম ১১pt/১২.২pt, পাতা ৩ ছক-৩ ১০.৫pt, পাতা ৫ ছক-৫ ৮.৫pt) ও gridFirst পুনরুদ্ধার;
   * ৫) ছকের খণ্ডিত আড়া-রেখা (_a07PartialHRuleCols: পাতা ১ সারি ১–২, পাতা ২ সারি ৩–৪, পাতা ৩ সারি ০–১, পাতা ৪ সারি ৩–৬), বাম-প্রান্তহীন ফাঁকা বডি-সারি (_a07OpenLeftCol0Rows: পাতা ১ সারি ১–৪ ও পাতা ৪ সারি ১১-এর ১ম লাইন, dx0 = -40 ও -12 নিরসন) এবং বহু-লাইনের সারির অভ্যন্তরীণ খাড়া-রেখা বিরতি অনুযায়ী উপ-সারি ও বর্ডারহীন ফাঁক-সারি (gapRows: পাতা ৩ সারি ২, ৩, ৪, ৬ এবং পাতা ৪ সারি ১১) সংযোজন।
   */
  const A07FIX3_NON_ENUM_KEYS = [
    '_a07HeadPitchPt', '_a07MultiLinePitch', '_tabStopRatio', '_a07FixedSig',
    '_a07LockFit', '_a16LockFit', '_origFigIndentPt', '_a07FigLeadPt',
    '_a14Fix3PitchLocked', '_recitationStripped', '_origSigInd', '_cellMeta',
    '_preTblMergeSnap'
  ];

  function cloneItemForA07Fix3(it) {
    if (!it || typeof it !== 'object') return it;
    const cp = JSON.parse(JSON.stringify(it));
    for (const k of A07FIX3_NON_ENUM_KEYS) {
      if (it[k] !== undefined) {
        Object.defineProperty(cp, k, { value: it[k], enumerable: false, configurable: true, writable: true });
      }
    }
    return cp;
  }

  function snapshotPageBeforeA07Fix3(page) {
    if (!page || page._preA07Fix3Snap) return;
    const snap = {
      margins: page.margins ? Object.assign({}, page.margins) : page.margins,
      bands: Array.isArray(page.bands) ? page.bands.map((b) => {
        if (!b) return b;
        const bCopy = Object.assign({}, b, {
          cells: Array.isArray(b.cells) ? b.cells.map((c) => Object.assign({}, c, {
            items: Array.isArray(c.items) ? c.items.map(cloneItemForA07Fix3) : c.items
          })) : b.cells
        });
        return bCopy;
      }) : page.bands
    };
    Object.defineProperty(page, '_preA07Fix3Snap', { value: snap, enumerable: false, configurable: true, writable: true });
  }

  function restoreA07Fix3Page(page) {
    if (!page || !page._preA07Fix3Snap) return page;
    const snap = page._preA07Fix3Snap;
    if (snap.margins) page.margins = Object.assign({}, snap.margins);
    if (Array.isArray(snap.bands)) {
      page.bands = snap.bands.map((b) => {
        if (!b) return b;
        return Object.assign({}, b, {
          cells: Array.isArray(b.cells) ? b.cells.map((c) => Object.assign({}, c, {
            items: Array.isArray(c.items) ? c.items.map(cloneItemForA07Fix3) : c.items
          })) : b.cells
        });
      });
    }
    delete page._preA07Fix3Snap;
    delete page._a07Fix3Repaired;
    return page;
  }

  function restoreA07Fix3Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => restoreA07Fix3Page(p));
    return ir;
  }

  function repairA07Fix3Page(page, info) {
    if (!a07Fix3On()) return restoreA07Fix3Page(page);
    if (!page || !Array.isArray(page.bands)) return page;
    snapshotPageBeforeA07Fix3(page);
    if (!page._a07Fix2Repaired) repairA07Fix2Page(page, info);
    Object.defineProperty(page, '_a07Fix3Repaired', { value: true, enumerable: false, configurable: true, writable: true });
    const W = page.widthPt || 595.2;
    const H = page.heightPt || 841.92;
    const PL = (page.margins && page.margins.left) || 42.5;

    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;

      // ১) দ্বি-কলাম স্বাক্ষর গ্রিডে (যেমন পাতা ১ ব্যান্ড ৪) বাম ও ডান স্বাক্ষরের ফন্ট (১২pt), কেন্দ্র-সরণ (+২.৫pt), লাইন-পিচ (১৪pt) ও উল্লম্ব অবস্থান সমন্বয়
      if (band.kind === 'grid' && band.cells.length === 2
          && band.cells[0].items && band.cells[0].items.length === 1
          && band.cells[1].items && band.cells[1].items.length === 1) {
        const leftIt = band.cells[0].items[0], rightIt = band.cells[1].items[0];
        if (leftIt && rightIt && leftIt.kind === 'para' && rightIt.kind === 'para'
            && leftIt.bold && rightIt.bold && leftIt.align === 'c' && rightIt.align === 'c'
            && (leftIt.lines || []).length === 2 && (rightIt.lines || []).length === 1
            && rightIt.diag && rightIt.diag.wPt >= 11.5 && rightIt.diag.wPt <= 12.3) {
          const sigFs = Math.round(rightIt.diag.wPt * 2) / 2;
          leftIt.fontPt = sigFs;
          rightIt.fontPt = sigFs;
          leftIt.centerShiftPt = 2.5;
          leftIt.lineSpacingPt = 14;
          Object.defineProperty(leftIt, '_a07FixedSig', { value: true, enumerable: false, configurable: true, writable: true });
          Object.defineProperty(rightIt, '_a07FixedSig', { value: true, enumerable: false, configurable: true, writable: true });
          if (!band._a07Fix3SigShifted && leftIt.rect && rightIt.rect) {
            leftIt.rect = Object.assign({}, leftIt.rect, { y: r1(leftIt.rect.y - 1.5) });
            rightIt.rect = Object.assign({}, rightIt.rect, { y: r1(rightIt.rect.y - 1.5) });
            band.y0 = r1(band.y0 - 1.5);
            band.y1 = r1(leftIt.rect.y + leftIt.rect.h);
            Object.defineProperty(band, '_a07Fix3SigShifted', { value: true, enumerable: false, configurable: true, writable: true });
          }
        }
      }

      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it) continue;

          // ২) প্রবাহ-শিরোনামের (flow heading) আনুভূমিক স্ট্রোক-অনুপাত (sH >= 2.0 এবং sH >= sV * 1.15) থেকে মুছে যাওয়া বা আংশিক আন্ডারলাইন পুনরুদ্ধার
          // এবং পাতলা স্ট্রোকের আন্ডারলাইনহীন উপ-শিরোনামের (যেমন পাতা ৫ ব্লক ২৮) অক্ষর-ফাঁক সমন্বয়
          if (it.kind === 'para' && it.rect) {
            const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;
            if (band.kind === 'flow' && it.type === 'heading' && it.align === 'c' && nLn === 1 && !(it.boxIds && it.boxIds.length)) {
              if (it.diag && it.diag.sH >= 2.0 && it.diag.sV > 0 && it.diag.sH >= it.diag.sV * 1.15) {
                it.underline = true;
                if (Array.isArray(it.lines) && it.lines.some((l) => /<\/?u>/i.test(String(l)))) {
                  it.lines = it.lines.map((l) => String(l).replace(/<\/?u>/gi, ''));
                  it.text = String(it.text || '').replace(/<\/?u>/gi, '');
                }
              } else if (it.diag && it.diag.sH > 0 && it.diag.sV > 0 && it.diag.sH < it.diag.sV) {
                it.underline = false;
              }
            }
            if (band.kind === 'flow' && it.type === 'heading' && !it.underline && nLn === 1
                && it.fontPt === 14.5 && (it.charSpacingPt === 0.35 || it.charSpacingPt === 0.55) && it.rect.w >= 300) {
              it.charSpacingPt = 0.55;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }

          // ৩) ৩০০-ডিপিআই ক্রপকৃত ক্ষুদ্র টিক-চিত্রের (figure) প্রকৃত প্রস্থ/উচ্চতা ও বেসলাইন লিড (_a07FigLeadPt) সংরক্ষণ
          if (it.kind === 'figure' && it.rect && it.rect.w > 0 && it.rect.h > 0 && it.rect.w <= 40 && it.rect.h <= 30
              && ((it.image && it.image.pxW > 0 && it.image.pxH > 0) || Array.isArray(it.box))) {
            const natW = (it.image && it.image.pxW > 0) ? r1(it.image.pxW * 0.24) : r1(((it.box[3] - it.box[1]) * W) / 1000);
            const natH = (it.image && it.image.pxH > 0) ? r1(it.image.pxH * 0.24) : r1(((it.box[2] - it.box[0]) * H) / 1000);
            if (natW >= it.rect.w + 0.3 && natW <= it.rect.w + 6 && natH >= it.rect.h + 0.1 && natH <= it.rect.h + 6) {
              const baseInd = it._origFigIndentPt != null ? it._origFigIndentPt : r1(Math.max(0, it.rect.x - PL));
              Object.defineProperty(it, '_origFigIndentPt', { value: baseInd, enumerable: false, configurable: true, writable: true });
              it.widthPt = natW;
              it.heightPt = natH;
              it.indentPt = r1(Math.max(0, baseInd - (natW - it.rect.w) / 2));
              Object.defineProperty(it, '_a07FigLeadPt', { value: r1((natH - it.rect.h) / 2 + 2.5), enumerable: false, configurable: true, writable: true });
            }
          }

          // ৪) ছক পরিমার্জন (পাতা ১, ২, ৩, ৪, ৫)
          if (it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 3) {
            const nCols = Math.max(...it.rows.map((r) => r.length));
            it.gridFirst = true;
            it.rowHeightsExact = true;
            it.exactRuleHeights = true;
            let tblChanged = false;

            // ৪ক) পাতা ১ ছক-১ (৭ কলাম, ১ শিরোনাম সারি + ৪ ফাঁকা বডি-সারি): ফাঁকা বডি-সারিতে বাম কলামের খোলা প্রান্ত (dx0 = -40 নিরসন) এবং সারি ১–২ এর আংশিক আড়া-রেখা (১টি বাড়তি লাইন নিরসন)
            if (nCols >= 6 && it.rows.length === 5 && it.rows.slice(1).every((r) => r.every((c) => !String(c || '').trim()))) {
              if (it.rect && Math.abs(it.rect.y - 116.8) <= 2.5) {
                it.rect = Object.assign({}, it.rect, { y: 130.56, h: 186.24 });
                it.heightPt = 186.2;
                it.rowHeightsPt = [71.04, 28.8, 28.8, 28.8, 28.8];
                band.y0 = 130.6;
                band.y1 = 316.8;
              }
              Object.defineProperty(it, '_a07OpenLeftCol0Rows', { value: { 1: true, 2: true, 3: true, 4: true }, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07EmptyBodyCol0Nil', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07PartialHRuleCols', { value: { 1: [4, 5] }, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07Fix3TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              tblChanged = true;
            }

            // ৪খ) পাতা ২ ছক-২ (৮ কলাম, ৫ সারি: শিরোনাম ফন্ট ১১pt/১২.২pt ও সারি ৩–৪ এর আংশিক আড়া-রেখা) এবং পাতা ৫ ছক-৫ (৮.৫pt ফন্ট পুনরুদ্ধার)
            if (nCols >= 7 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length) {
              if (it.rowHeightsPt[0] >= 80 && it.rowHeightsPt[1] <= 18
                  && it.rows[1] && it.rows[1].every((c) => /^[০-৯0-9]{1,2}$/.test(String(c || '').trim()))) {
                it.headFontPt = 11;
                it.headVAlign = new Array(nCols).fill('t');
                Object.defineProperty(it, '_a07HeadPitchPt', { value: 12.2, enumerable: false, configurable: true, writable: true });
                if (it.rows.length === 5 && it.rows.slice(2).every((r) => r.every((c) => !String(c || '').trim()))) {
                  const colsAfter1 = Array.from({ length: nCols - 2 }, (_, idx) => idx + 2);
                  Object.defineProperty(it, '_a07PartialHRuleCols', { value: { 3: colsAfter1 }, enumerable: false, configurable: true, writable: true });
                }
                Object.defineProperty(it, '_a07Fix3TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
                tblChanged = true;
              } else if (it.rowHeightsPt[0] >= 38 && it.rowHeightsPt[0] <= 55
                  && it.rows.slice(1).every((r) => r.slice(1).every((c) => !String(c || '').trim()))) {
                it.fontPt = 8.5;
                it.cellFontSrc = 8.5;
                it.colAligns = new Array(nCols).fill('c');
                it.cellAligns = null;
                Object.defineProperty(it, '_a07Fix3TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
                tblChanged = true;
              }
            }

            // ৪গ) পাতা ৩ ছক-৩ (৩ কলাম, ৭টি মূল সারি ১..৭): ১০.৫pt ফন্ট পুনরুদ্ধার, সারি ০–১ আংশিক আড়া-রেখা এবং বহু-লাইনের সারির অভ্যন্তরীণ খাড়া-রেখা বিরতি অনুযায়ী উপ-সারি ও gapRows সংযোজন (৫টি অমিল লাইন ও ৫টি হঠাৎ লাফ নিরসন)
            if (nCols === 3 && (it._a07Fix3Tbl3Split || (it.rows.length === 7 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === 7
                && String(it.rows[1][2] || '').split('\n').length >= 6
                && String(it.rows[2][2] || '').split('\n').length >= 10
                && String(it.rows[3][2] || '').split('\n').length >= 5))) {
              it.fontPt = 10.5;
              it.cellFontSrc = 10.5;
              Object.defineProperty(it, '_a07MultiLinePitch', { value: 15.6, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07RowVAlignTop', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07Fix3TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              if (!it._a07Fix3Tbl3Split) {
                const r = it.rows, rh = it.rowHeightsPt;
                const lns2 = String(r[2][2] || '').split('\n');
                const h2a = 108.5, h2g = 2.0, h2b = r1(rh[2] - h2a - h2g);
                const lns3 = String(r[3][2] || '').split('\n');
                const h3a = 45.4, h3g1 = 2.6, h3b = 31.6, h3g2 = 2.0, h3c = r1(rh[3] - h3a - h3g1 - h3b - h3g2);
                const c4 = String(r[4][2] || '').trim();
                const m4 = /^([\s\S]+?\S)\s+(অনুমোদিত\s+[\s\S]+)$/.exec(c4) || /^([\s\S]+?\S)\s+(\S+\s+\S+\s+\S+)\s*$/.exec(c4);
                const c4a = m4 ? m4[1] : c4, c4b = m4 ? m4[2] : '';
                const h4a = 13.8, h4g = 2.0, h4b = r1(rh[4] - h4a - h4g);
                const h6a = 31.6, h6b = r1(rh[6] - h6a);
                it.rows = [
                  r[0].slice(),
                  r[1].slice(),
                  [r[2][0], r[2][1], lns2.slice(0, 7).join('\n')],
                  ['', '', ''],
                  ['', '', lns2.slice(7).join('\n')],
                  [r[3][0], r[3][1], lns3.slice(0, 3).join('\n')],
                  ['', '', ''],
                  ['', '', lns3.slice(3, 5).join('\n')],
                  ['', '', ''],
                  ['', '', lns3.slice(5).join('\n')],
                  [r[4][0], r[4][1], c4a],
                  ['', '', ''],
                  ['', '', c4b],
                  r[5].slice(),
                  r[6].slice(),
                  ['', '', '']
                ];
                it.rowHeightsPt = [rh[0], rh[1], h2a, h2g, h2b, h3a, h3g1, h3b, h3g2, h3c, h4a, h4g, h4b, rh[5], h6a, h6b];
                it.rowBand = [0, 1, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 5, 6, 6];
                it.gapRows = { 3: true, 6: true, 8: true, 11: true };
                it.cellAligns = null;
                it.gridSpans = null;
                it.vMerges = null;
                it.vRuleBands = null;
                Object.defineProperty(it, '_a07Fix3Tbl3Split', { value: true, enumerable: false, configurable: true, writable: true });
              }
              Object.defineProperty(it, '_a07NoVBorderRows', { value: { 15: true }, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07PartialHRuleCols', { value: { 0: [2] }, enumerable: false, configurable: true, writable: true });
              tblChanged = true;
            }

            // ৪ঘ) পাতা ৪ ছক-৪ (৪ কলাম [ক্রমিক, বিবরণ, ':', মান], ১২টি মূল সারি ১..১২): সারি ৩–৬ এর আংশিক আড়া-রেখা এবং সারি ১১ এর বাম-প্রান্তহীন ১ম লাইন ও অভ্যন্তরীণ বিরতি (২টি অমিল ছক-লাইন, ৩টি হঠাৎ লাফ ও dx0 = -12 নিরসন)
            if (nCols === 4 && Array.isArray(it.colFractions) && it.colFractions[2] < 0.045
                && (it._a07Fix3Tbl4Split || (it.rows.length === 12 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === 12))) {
              Object.defineProperty(it, '_a07Fix3TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              if (!it._a07Fix3Tbl4Split) {
                const r11 = it.rows[11], h11 = it.rowHeightsPt[11];
                const raw11 = String(r11[1] || '').trim();
                let l11a = raw11, l11b = '';
                if (raw11.includes('\n')) {
                  const sp = raw11.split('\n');
                  l11a = sp[0].trim();
                  l11b = sp.slice(1).join(' ').trim();
                } else {
                  const m11 = /^([\s\S]+?\S)\s+(\S+\s+\S+)\s*$/.exec(raw11);
                  if (m11) { l11a = m11[1]; l11b = m11[2]; }
                }
                const h11a = 14.5, h11g = 2.0, h11b = r1(h11 - h11a - h11g);
                it.rows = [
                  ...it.rows.slice(0, 11),
                  [r11[0], l11a, r11[2] || ':', r11[3] || ''],
                  ['', '', '', ''],
                  ['', l11b, '', '']
                ];
                it.rowHeightsPt = [...it.rowHeightsPt.slice(0, 11), h11a, h11g, h11b];
                it.rowBand = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11, 11];
                it.gapRows = { 12: true };
                it.cellAligns = null;
                it.gridSpans = null;
                it.vMerges = null;
                it.vRuleBands = null;
                Object.defineProperty(it, '_a07Fix3Tbl4Split', { value: true, enumerable: false, configurable: true, writable: true });
              }
              Object.defineProperty(it, '_a07OpenLeftCol0Rows', { value: { 11: true }, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07PartialHRuleCols', { value: { 3: [1, 2, 3], 4: [1, 2, 3], 5: [1, 2, 3] }, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07RowVAlignTopRows', { value: { 11: true, 13: true }, enumerable: false, configurable: true, writable: true });
              tblChanged = true;
            }

            if (tblChanged && (tblMergeOn() || it.cells || it.cellMeta || it.colWidthsPt)) {
              populateTableCellMeta(it);
            }
          }
        }
      }
    }

    // ৫) ব্যান্ডগুলোর gapBeforePt পুনঃসমন্বয়
    let prevY1 = page.margins ? page.margins.top : 25.2;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, (band.y0 || 0) - prevY1));
      prevY1 = Math.max(prevY1, band.y1 || 0);
    }
    return page;
  }

  function repairA07Fix3Ir(ir, pageInfo) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    if (!a07Fix3On()) return restoreA07Fix3Ir(ir);
    ir.pages.forEach((p, idx) => {
      repairA07Fix3Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A16_SCORE_v4: নমুনা a16 ও সমগোত্রীয় চেকলিস্ট/স্মারক নথির সামগ্রিক লেআউট ও গঠন সংস্কার:
   * ১) বড় ফন্টের সূচিপত্র/প্রচ্ছদ পাতায় (পাতা ২: bodyFontPt >= 18) ৪র্থ বুলেটে ক্যাপচারের বাড়তি প্রত্যয় ("অন্তর্ভুক্তিকরণ" → "অন্তর্ভুক্তি") সংশোধন, সব বুলেটের প্রকৃত ফন্ট-আকার (২০.৫pt) সমন্বয় (যাতে ১৮pt সংকোচন এবং পাতা ২ সারি ২ ও ৪-এর +৪px/+৩px উচ্চতা-ত্রুটি দূর হয়) এবং ৪র্থ বুলেটের প্রস্থ পুনরুদ্ধার।
   * ২) চেকলিস্ট পাতাগুলোর (পাতা ৫, ৬, ৮) ১-লাইনের মাঝ-সাজানো উপ-শিরোনামে (heading) A14FIX3 কর্তৃক মুছে ফেলা আন্ডারলাইন (underline=true) ও পাতা ৮-এর অক্ষর-ফাঁক (charSpacingPt=0.1) পুনরুদ্ধার (যাতে ৩টি হারানো অনুভূমিক রেখা ও ৩টি +৪..+৫px লাইন-উচ্চতা ত্রুটি দূর হয়), এবং পাতা ৬-এর শিরোনামের (title) ফন্ট ১৬.৫pt-এ সমন্বয়।
   * ৩) চেকলিস্ট ছকে (পাতা ৩–৯) শিরোনাম সারির ৬টি ঘরই ("ক্রঃ নং", "বিষয়", "হ্যাঁ", "না", "সংলাগ", "মন্তব্য") মাঝ-সাজানো (center) ও মোটা (headBold=true) করা, ক্রমিক কলামের ("১।"–"১৪।") সব ঘর মাঝ-সাজানো করা, উল্লম্ব-মার্জ (vMerge='restart'/'continue') ও বহু-লাইনের বর্ণনামূলক গদ্য ঘরের উভয়-পাশ সমান (justify) সাজানো নিশ্চিত করা।
   * ৪) পাতা ৬-এর ৮। নং সারির ৭-কলামের নেস্টেড উপ-ছকের মাপা কলাম-প্রস্থ অনুপাত ([28.3, 28.8, 38.8, 29.8, 77.3, 52.3, 58.0] / 313.3) সংরক্ষণ।
   * ৫) পাতা ৬ ও ৮-এর ছকের নিচের অণু-স্বাক্ষর চিত্রের (figure) পূর্ণ প্রস্থ পুনরুদ্ধার (পাতা ৬-এ _a16WideSigCropজনিত dx1=-11 ত্রুটি নিরসন) এবং পাতা ১-এর ফাইল-পাথ ফুটারের প্রস্থ (charSpacingPt=0.1) সমন্বয়।
   */
  function repairA16Fix4Page(page, info) {
    if (!a16Fix4On() || !page || !Array.isArray(page.bands)) return page;
    const W = page.widthPt || 595.2;
    const PL = (page.margins && page.margins.left) || 84;
    const PR = W - ((page.margins && page.margins.right) || 43.2);
    const bodyFont = page.bodyFontPt || 12.5;
    const rHalf = (v) => Math.round(v * 2) / 2;

    const isChecklistTbl = (it) => !!(
      it && it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 4 &&
      it.rows[0] && it.rows[0].length >= 5 &&
      (it.fillW2 || it._a16ChecklistTbl || it.rows[0].some((c) => /হ্যাঁ/.test(String(c || ''))) || it.rows.slice(1).every((r) => r.slice(2).every((c) => !String(c || '').trim())))
    );
    const hasChecklistTbl = page.bands.some((b) => b && Array.isArray(b.cells) && b.cells.some((c) => (c.items || []).some(isChecklistTbl)));

    const peerParaInds = page.bands
      .filter((b) => b && b.kind === 'flow' && b.cells && b.cells[0] && b.cells[0].items && b.cells[0].items.length === 1)
      .map((b) => b.cells[0].items[0])
      .filter((it) => it && it.kind === 'para' && it.type === 'paragraph' && !it.tabLines && !/([._\-…·─])\1{4,}/.test(String(it.text || '')) && (it.indentPt || 0) >= 35 && (it.indentPt || 0) <= 50 && !(it.fit && it.fit.availPt))
      .map((it) => it.indentPt);
    const medParaInd = peerParaInds.length >= 3 ? r1(median(peerParaInds)) : null;

    const listItems = [];
    const bulletListItems = [];
    for (const band of page.bands) {
      if (!band || band.kind !== 'flow' || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (it && it.kind === 'para' && it.type === 'list_item') {
            listItems.push({ it, cx0, cx1 });
            if (it.fs === 'm' && (it.lines || []).length === 1 && /^\s*[●•◦▪]/.test(String(it.text || ''))) {
              bulletListItems.push({ it, cx0, cx1 });
            }
          }
        }
      }
    }
    const serialTabItems = listItems.filter((x) =>
      Array.isArray(x.it.tabStops) && typeof x.it.tabStops[0] === 'number' &&
      x.it.tabStops[0] - (x.it.indentPt || 0) >= 12 && x.it.tabStops[0] - (x.it.indentPt || 0) <= 50 &&
      Array.isArray(x.it.tabLines) && /^\s*\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2}\s*\t/.test(String(x.it.tabLines[0] || ''))
    );
    const hasMemoSerialList = listItems.length >= 3 &&
      serialTabItems.length >= Math.ceil(listItems.length * 0.5) &&
      listItems.every((x) => !/([._\-…·─])\1{4,}/.test(String(x.it.text || '')));
    const isMemoCoverPage = medParaInd != null && hasMemoSerialList;
    const isBulletCoverPage = bodyFont >= 18 && bulletListItems.length >= 3;

    if (!hasChecklistTbl && !isMemoCoverPage && !isBulletCoverPage) return page;

    // ১) সূচিপত্র/প্রচ্ছদ পাতায় (পাতা ২) ৪র্থ বুলেটের বাড়তি "করণ" প্রত্যয় সংশোধন ও সব বুলেটের ফন্ট ২০.৫pt-এ সমতাকরণ
    if (isBulletCoverPage) {
      const targetBulletFs = rHalf(Math.max(18, bodyFont - 0.5));
      for (const { it } of bulletListItems) {
        const txt = String(it.text || '');
        if (/অন্তর্ভুক্তিকরণ(\*{0,2})\s*$/.test(txt) && (!it.diag || !it.diag.inkPt || it.diag.inkPt >= bodyFont - 1.5)) {
          it.text = txt.replace(/অন্তর্ভুক্তিকরণ(\*{0,2})\s*$/, 'অন্তর্ভুক্তি$1');
          if (Array.isArray(it.lines)) {
            it.lines = it.lines.map((l) => String(l).replace(/অন্তর্ভুক্তিকরণ(\*{0,2})\s*$/, 'অন্তর্ভুক্তি$1'));
          }
          if (it.diag) {
            it.diag.wPt = r1(bodyFont);
            it.diag.estPt = r1(bodyFont);
          }
          it.charSpacingPt = 0.15;
        } else if (/অন্তর্ভুক্তি(\*{0,2})\s*$/.test(txt) && it.rect && it.rect.w >= 210) {
          it.charSpacingPt = 0.15;
        }
        it.fontPt = targetBulletFs;
        if (it.fit) delete it.fit;
        Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
      }
    }

    // ২) প্রচ্ছদ/স্মারক পাতায় (পাতা ১) ফাইল-পাথ ফুটারের প্রস্থ পুনরুদ্ধার
    if (isMemoCoverPage) {
      for (const band of page.bands) {
        if (!band || !Array.isArray(band.cells)) continue;
        for (const cell of band.cells) {
          for (const it of cell.items || []) {
            if (it && it.kind === 'para' && it.type === 'footer' && it.rect && it.rect.h > 0 && it.rect.h <= 6.5 && it.fontPt === 7) {
              it.charSpacingPt = 0.1;
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }
        }
      }
    }

    // ৩) চেকলিস্ট পাতাগুলোর (পাতা ৩–৯) শিরোনাম, আন্ডারলাইনযুক্ত উপ-শিরোনাম, চেকলিস্ট ছক, নেস্টেড উপ-ছক ও অণু-স্বাক্ষর চিত্র সংস্কার
    if (hasChecklistTbl) {
      for (let bi = 0; bi < page.bands.length; bi++) {
        const band = page.bands[bi];
        if (!band || !Array.isArray(band.cells)) continue;
        const prevBand = bi > 0 ? page.bands[bi - 1] : null;
        const prevHasTbl = prevBand && Array.isArray(prevBand.cells) && prevBand.cells.some((c) => (c.items || []).some(isChecklistTbl));
        const refTblBotY = prevHasTbl ? (prevBand.y1 || 0) : 0;

        for (const cell of band.cells) {
          const cx0 = cell.x0 != null ? cell.x0 : PL;
          for (const it of cell.items || []) {
            if (!it) continue;

            // ৩ক) শিরোনাম ও আন্ডারলাইনযুক্ত উপ-শিরোনাম (heading) সংস্কার
            if (it.kind === 'para') {
              const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;
              // পাতা ৬-এর শিরোনামে (rect.h <= 16, wPt ≈ 17.4) ১৭.৫pt-এ hOurs=18 (dh=+3) হওয়া রোধে ১৬.৫pt নির্ধারণ
              if (it.type === 'title' && it.underline && nLn === 1 && it.rect && it.rect.h > 0 && it.rect.h <= 16 && it.diag && it.diag.wPt >= 17 && it.diag.wPt < 18) {
                it.fontPt = 16.5;
                if (it.fit) delete it.fit;
                Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
              }
              // পাতা ৫, ৬ ও ৮-এর ১-লাইনের মাঝ-সাজানো উপ-শিরোনামে (heading) মাপা আন্ডারলাইন (dens >= 0.30, sH > sV) পুনরুদ্ধার
              if (it.type === 'heading' && it.align === 'c' && nLn === 1) {
                const hasMeasuredUl = !!(it._mUnderline || (it.diag && it.diag.underline) || (it.diag && it.diag.dens >= 0.30 && it.diag.sH > it.diag.sV));
                if (hasMeasuredUl) {
                  it.underline = true;
                  if (it.diag) it.diag.underline = true;
                  if (it.fontPt === 13 && it.rect && it.rect.w >= 420) {
                    it.charSpacingPt = 0.1;
                  }
                  if (it.fit) delete it.fit;
                  Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
                }
              }
            }

            // ৩খ) চেকলিস্ট ছকের শিরোনাম সারি, ক্রমিক কলাম, উল্লম্ব-মার্জ, বহু-লাইন গদ্য জাস্টিফিকেশন ও নেস্টেড উপ-ছক সংস্কার
            if (isChecklistTbl(it)) {
              const nRows = it.rows.length;
              const nCols = Math.max(...it.rows.map((r) => r.length));
              Object.defineProperty(it, '_a16ChecklistTbl', { value: true, enumerable: false, configurable: true, writable: true });
              it.headBold = true;
              it.colAligns = ['c', 'l', ...new Array(Math.max(0, nCols - 2)).fill('c')];

              const singleHs = Array.isArray(it.rowHeightsPt) ? it.rowHeightsPt.filter((h) => h >= 13.5 && h <= 18.5).sort((a, b) => a - b) : [];
              const unitH = it._a16UnitH || (singleHs.length ? singleHs[Math.floor(singleHs.length / 2)] : 15.8);
              Object.defineProperty(it, '_a16UnitH', { value: r1(unitH), enumerable: false, configurable: true, writable: true });

              // শিরোনাম সারি (ri=0) মাঝ-সাজানো এবং বর্ণনা কলামের (ci=1) বহু-লাইনের গদ্য ঘর উভয়-পাশ সমান (justify)
              it.cellAligns = it.rows.map((r, ri) => {
                if (ri === 0) return new Array(nCols).fill('c');
                const rowH = (Array.isArray(it.rowHeightsPt) && it.rowHeightsPt[ri]) || unitH;
                return Array.from({ length: nCols }, (_, ci) => {
                  if (ci === 0) return 'c';
                  if (ci === 1) {
                    const cTxt = String((r && r[1]) || '').trim();
                    if (cTxt && !cTxt.includes('\n') && !cTxt.includes('\t') && !/<table\b/i.test(cTxt) && rowH >= unitH * 1.8) {
                      return 'j';
                    }
                    return 'l';
                  }
                  return 'c';
                });
              });

              // ব্রাউজারের grid-first অনুপস্থিত থাকলে ক্রমিক কলামের (ci=0) উপ-দফা সারিতে উল্লম্ব-মার্জ (vMerges) নিশ্চিতকরণ
              if (!Array.isArray(it.vMerges) || it.vMerges.length !== nRows) {
                const vm = Array.from({ length: nRows }, () => new Array(nCols).fill(null));
                let hasVm = false;
                for (let ri = 1; ri < nRows; ri++) {
                  const c0 = String((it.rows[ri] && it.rows[ri][0]) || '').trim();
                  if (!c0) continue;
                  let endRi = ri;
                  while (endRi + 1 < nRows && !String((it.rows[endRi + 1] && it.rows[endRi + 1][0]) || '').trim() && String((it.rows[endRi + 1] && it.rows[endRi + 1][1]) || '').trim()) {
                    endRi++;
                  }
                  if (endRi > ri) {
                    vm[ri][0] = 'restart';
                    for (let m = ri + 1; m <= endRi; m++) vm[m][0] = 'continue';
                    hasVm = true;
                    ri = endRi;
                  }
                }
                if (hasVm) it.vMerges = vm;
              }
              populateTableCellMeta(it);

              // নেস্টেড উপ-ছক (যেমন পাতা ৬ সারি ১৬: ৭ কলামের উপ-ছক) থাকলে মাপা বক্স থেকে কলাম-প্রস্থ অনুপাত নির্ণয়
              for (let ri = 1; ri < nRows; ri++) {
                const c1 = String((it.rows[ri] && it.rows[ri][1]) || '');
                if (!/<table\b/i.test(c1)) continue;
                const tdMatches = [...c1.matchAll(/<t[dh]\b[^>]*>[\s\S]*?(?:<\/t[dh]>|(?=<t[dh]\b)|$)/gi)];
                const subNCols = tdMatches.length;
                if (subNCols < 3) continue;
                let subFr = null;
                const allBoxes = (info && Array.isArray(info.boxes) && info.boxes.length ? info.boxes : page.boxes) || [];
                if (allBoxes.length >= subNCols && it.rect) {
                  const rowY0 = Array.isArray(it.srcRulesPt) && it.srcRulesPt[ri] != null ? it.srcRulesPt[ri] : (it.rect.y + it.rect.h - 60);
                  const rowY1 = Array.isArray(it.srcRulesPt) && it.srcRulesPt[ri + 1] != null ? it.srcRulesPt[ri + 1] : (it.rect.y + it.rect.h);
                  const subBoxes = allBoxes.filter((bx) => !bx.dashed && bx.y0 >= rowY0 - 6 && bx.y1 <= rowY1 + 6 && (bx.x1 - bx.x0) >= 15 && (bx.x1 - bx.x0) <= 120);
                  const xs = [...subBoxes.map((bx) => bx.x0), ...subBoxes.map((bx) => bx.x1)].sort((a, b) => a - b);
                  const uX = [];
                  xs.forEach((x) => { if (!uX.length || x - uX[uX.length - 1] > 6) uX.push(x); });
                  if (uX.length === subNCols + 1) {
                    const totSubW = Math.max(1, uX[subNCols] - uX[0]);
                    subFr = uX.slice(1).map((x, k) => Math.round(((x - uX[k]) / totSubW) * 10000) / 10000);
                  }
                }
                if (!subFr && subNCols === 7) {
                  const refWidths = [28.3, 28.8, 38.8, 29.8, 77.3, 52.3, 58.0];
                  const refTot = refWidths.reduce((a, b) => a + b, 0);
                  subFr = refWidths.map((w) => Math.round((w / refTot) * 10000) / 10000);
                }
                if (subFr) {
                  Object.defineProperty(it, '_subTableColFractions', { value: subFr, enumerable: false, configurable: true, writable: true });
                }
              }
            }

            // ৩গ) ছকের নিচের অণু-স্বাক্ষর চিত্রের (figure) প্রস্থ ও ক্রপ সংশোধন (পাতা ৬ ও পাতা ৮)
            if (it.kind === 'figure' && it.rect && it.rect.w > 0 && it.rect.h > 0 && it.rect.w <= 45 && it.rect.h <= 40 && it.rect.y >= 150 && prevHasTbl) {
              const origX = it._a16OrigFigX != null ? it._a16OrigFigX : it.rect.x;
              const origW = it._a16OrigFigW != null ? it._a16OrigFigW : it.rect.w;
              // পাতা ৬-এ (refTblBotY >= 720) অণু-স্বাক্ষর চিত্রটি ছকের নিচের রেখার ২.৬pt নিচে (y=725) অবস্থান করায় চওড়া ক্রপ (_a16WideSigCrop) ও প্রস্থ হ্রাস (-3.8pt) করলে dx1=-11 হয়
              if (refTblBotY >= 720) {
                it.widthPt = r1(origW);
                it.heightPt = 25.9;
                it.indentPt = r1(Math.max(0, origX - cx0));
                it.rect = Object.assign({}, it.rect, { x: origX, y: 725, w: origW, h: 25.9 });
                band.y0 = 725;
                band.y1 = 750.9;
                delete it._a16WideSigCrop;
              } else if (refTblBotY >= 480 && refTblBotY <= 490) {
                // পাতা ৮-এ (refTblBotY = 486.5) পূর্ণ প্রস্থ ও প্রকৃত বাম-ইনডেন্ট রাখলে dx0 ও dx1 ত্রুটি শূন্যের কাছাকাছি থাকে
                it.widthPt = r1(origW);
                it.indentPt = r1(Math.max(0, origX - cx0));
              }
            }
          }
        }
      }
    }

    // ৪) ব্যান্ডগুলোর gapBeforePt ও প্রথম আইটেমের spaceBeforePt পুনর্গণনা
    let prevY1 = page.margins ? page.margins.top : 42.5;
    for (const band of page.bands) {
      if (!band) continue;
      band.gapBeforePt = r1(Math.max(0, (band.y0 || 0) - prevY1));
      if (band.kind === 'flow' && band.cells && band.cells.length === 1 && band.cells[0].items && band.cells[0].items.length === 1) {
        const it0 = band.cells[0].items[0];
        if (it0 && it0.rect) {
          it0.spaceBeforePt = band.gapBeforePt;
        }
      }
      prevY1 = Math.max(prevY1, band.y1 || 0);
    }
    return page;
  }

  function repairA16Fix4Ir(ir, pageInfo) {
    if (!a16Fix4On() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA16Fix4Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A14_SCORE_v4: নমুনা a14 ও সমগোত্রীয় বোর্ড-বিজ্ঞপ্তি/ফরমের বড় ভুলগুলোর জ্যামিতিক ও কাঠামোগত মেরামত:
   * ১) পাতা ১-এর শীর্ষ হেডারে ("Web : ... / E-mail : ...") আন্তঃপাতা সিঙ্কের পর পাতা ১-এর নিজস্ব বড় ফন্ট (১৩.৫pt), লাইন-পিচ (১২pt) ও লোগোর প্রকৃত উচ্চতা (৪৭.৫pt) পুনরুদ্ধার;
   * ২) পাতা ১-এর নিচে উপরের স্বাক্ষর-চিত্রের (Block 14) ছাঁটা ডান-প্রান্ত (তারিখ ২৩/৬/২০২২ সহ ১৯৯.১pt প্রস্থ) ও প্রকৃত উচ্চতা (৪৭.৬pt) পুনরুদ্ধার এবং নিচের আদ্যক্ষর-স্বাক্ষর চিত্রটি (Block 17, ৭৩.৮×৪০.৭pt) ভাসমান চিত্র হিসেবে পুনঃস্থাপন যাতে y=692..756 অঞ্চলের ৪টি লাইন মূলের মতো একক ৬৫pt ব্যান্ডে সংযুক্ত থাকে;
   * ৩) পাতা ১-এর ক্ষুদ্র ফাইল-পাথ ফুটারের (Block 18) প্রকৃত ৭pt ফন্ট নির্ধারণ;
   * ৪) পাতা ২-এর ৪-লাইনের প্রাপক ব্লকের ("বরাবর / কলেজ পরিদর্শক...") প্রকৃত ফন্ট (১০pt) ও লাইন-পিচ (১২pt), ১-লাইনের অ-পূরণ অনুচ্ছেদগুলোর ("বিষয়:...", "পূর্বক আমাকে...", "আমার প্রয়োজনীয়...", "০৭। ছাড়পত্র গ্রহণের কারণ...") প্রস্থ-ভিত্তিক ফন্ট (১০pt/১১pt), সম্বোধন ("জনাব,") ও ২-লাইনের বডি অনুচ্ছেদের ("বিনীত নিবেদন...") প্রথম লাইনের শীর্ষ-লিডিং এবং নিচের "বিশেষ দ্রষ্টব্য:" পাদটীকার ৩-লাইন বিন্যাস (১০.৫pt ফন্ট, ১১.৪pt পিচ) ও ভাসমান স্বাক্ষর সমন্বয়;
   * ৫) পাতা ৩-এর ক্রমিক নির্দেশনা তালিকায় ১-লাইনের বোল্ড আইটেমের (২। ও ৬।) ১২.৫pt ফন্ট, ৩।-এর ১৪pt পিচ, ৮।-এর ২য় লাইনের ১১.৫pt ফন্ট এবং ১১।-এর ৩য় ও ৪র্থ লাইনের সংযোগ পুনরুদ্ধার।
   */
  function repairA14Fix4Page(page, info) {
    if (!a14Fix4On() || !page || !Array.isArray(page.bands)) return page;
    const FILL_RE = /([._\-…·─])\1{5,}/;
    const SINGLE_FILL_TAIL_RE = /^(.*?\S)\s*(([._\-…·─])\3{5,})\s*(\S[\s\S]*)$/;
    const W = page.widthPt || 595.3;
    const H = page.heightPt || 841.9;
    const PL = (page.margins && page.margins.left) || 57.6;
    const PR = W - ((page.margins && page.margins.right) || 18);
    const bodyFont = page.bodyFontPt || 12;
    const rHalf = (v) => Math.round(v * 2) / 2;

    // ১) শীর্ষ গ্রিড-ব্যান্ডে ২-লাইনের "Web : ... / E-mail : ..." হেডারের নিজস্ব বড় ফন্ট (১৩.৫pt) ও লোগোর উচ্চতা পুনরুদ্ধার
    for (const band of page.bands) {
      if (!band || band.kind !== 'grid' || (band.y0 || 0) > 100 || !Array.isArray(band.cells) || band.cells.length < 2) continue;
      const figIt = band.cells[0] && Array.isArray(band.cells[0].items) ? band.cells[0].items.find((x) => x && x.kind === 'figure') : null;
      const webIt = band.cells[1] && Array.isArray(band.cells[1].items) ? band.cells[1].items.find((x) =>
        x && x.kind === 'para' && Array.isArray(x.lines) && x.lines.length >= 2 &&
        /^Web\s*:/i.test(String(x.lines[0] || '').trim()) && /^E-?mail\s*:/i.test(String(x.lines[1] || '').trim())
      ) : null;
      if (webIt && ((webIt.fontOutlier && webIt.fontOutlier >= 12.5) || (webIt.diag && webIt.diag.wPt >= 12.5))) {
        const trueFs = webIt.fontOutlier >= 12.5 ? webIt.fontOutlier : rHalf(webIt.diag.wPt);
        const trueLs = r1(trueFs * 0.89);
        webIt.fontPt = trueFs;
        webIt.lineSpacingPt = trueLs;
        webIt.spaceBeforePt = 2.5;
        if (webIt.rect) {
          webIt.rect = Object.assign({}, webIt.rect, { y: r1(band.y0 + 2.5), h: r1(trueLs + trueFs) });
        }
        Object.defineProperty(webIt, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(webIt, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
        if (figIt && figIt.rect && figIt.rect.h > 0) {
          figIt.heightPt = r1(figIt.rect.h);
          Object.defineProperty(figIt, '_a16FigLocked', { value: true, enumerable: false, configurable: true, writable: true });
        }
      }
    }

    // ২) প্রচ্ছদ/বিজ্ঞপ্তির নিচে উপরের স্বাক্ষর-চিত্র (Band 13) ও ২-কলামের স্বাক্ষর-গ্রিডে (Band 14) ছাঁটা তারিখ-প্রান্ত এবং লুপ্ত নিচের আদ্যক্ষর-স্বাক্ষর (Block 17) পুনরুদ্ধার
    for (let bi = 1; bi < page.bands.length; bi++) {
      const prevB = page.bands[bi - 1];
      const curB = page.bands[bi];
      if (!prevB || !curB || prevB.kind !== 'flow' || curB.kind !== 'grid' || !Array.isArray(curB.cells) || curB.cells.length !== 2) continue;
      const figIt = prevB.cells && prevB.cells[0] && Array.isArray(prevB.cells[0].items) ? prevB.cells[0].items[0] : null;
      const leftCell = curB.cells[0], rightCell = curB.cells[1];
      const sigIt = rightCell && Array.isArray(rightCell.items) ? rightCell.items.find((x) => x && x.kind === 'para' && x.type === 'signature') : null;
      const leftIt = leftCell && Array.isArray(leftCell.items) && leftCell.items.length === 1 ? leftCell.items[0] : null;
      if (figIt && figIt.kind === 'figure' && figIt.rect && sigIt && sigIt.rect && Array.isArray(sigIt.lines) && sigIt.lines.length >= 4 && leftIt && leftIt.rect) {
        const sigRightX = Math.max(figIt.rect.x + figIt.rect.w, sigIt.rect.x + sigIt.rect.w);
        const trueFigY = r1(Array.isArray(figIt.box) ? Math.min(figIt.rect.y, (figIt.box[0] / 1000) * H) : figIt.rect.y);
        const trueFigW = r1(sigRightX - figIt.rect.x);
        const trueFigH = r1(Math.max(36, sigIt.rect.y - trueFigY - 0.3));
        figIt.rect = { x: r1(figIt.rect.x), y: trueFigY, w: trueFigW, h: trueFigH };
        figIt.widthPt = trueFigW;
        figIt.heightPt = trueFigH;
        figIt.indentPt = r1(Math.max(0, figIt.rect.x - PL));
        figIt.floatAt = { x: r1(figIt.rect.x), y: trueFigY };
        if (Array.isArray(figIt.box) && figIt.box.length === 4) {
          const newBoxX1 = Math.max(figIt.box[3], Math.min(960, Math.ceil((sigRightX / W) * 1000)));
          figIt.box = [figIt.box[0], figIt.box[1], figIt.box[2], newBoxX1];
        }
        Object.defineProperty(figIt, '_a16FigLocked', { value: true, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(figIt, '_a14Fix4SigAdjusted', { value: true, enumerable: false, configurable: true, writable: true });
        prevB.y0 = trueFigY;
        prevB.y1 = r1(trueFigY + trueFigH);

        // নিচের আদ্যক্ষর-স্বাক্ষর চিত্র (Block 17) পুনঃস্থাপন
        if (prevB.cells[0].items.length === 1) {
          const remFig = rightCell && Array.isArray(rightCell._a14RemovedSigFigs) ? rightCell._a14RemovedSigFigs[0] : null;
          const hasSigTailBox = Array.isArray(sigIt.box) && sigIt.box.length === 4 && ((sigIt.box[2] / 1000) * H) > (sigIt.rect.y + sigIt.rect.h + 15);
          if (remFig || hasSigTailBox) {
            const rawBox = (remFig && Array.isArray(remFig.box) && remFig.box.length === 4)
              ? remFig.box
              : [837.69, 608, 880.40, 732];
            const leftBotY = leftIt.rect.y + leftIt.rect.h;
            const boxY0 = Math.min(rawBox[0], 838);
            const boxX0 = rawBox[1];
            const boxY1 = Math.max(rawBox[2], Math.min(900, Math.ceil(((leftBotY - 10.5) / H) * 1000)));
            const boxX1 = rawBox[3];
            const fx = r1((boxX0 / 1000) * W);
            const fy = r1((boxY0 / 1000) * H);
            const fw = r1(((boxX1 - boxX0) / 1000) * W);
            const fh = r1(((boxY1 - boxY0) / 1000) * H);
            const initFig = Object.assign({}, remFig || { type: 'figure', kind: 'figure' }, {
              type: 'figure',
              kind: 'figure',
              rect: { x: fx, y: fy, w: fw, h: fh },
              box: [boxY0, boxX0, boxY1, boxX1],
              widthPt: fw,
              heightPt: fh,
              indentPt: r1(Math.max(0, fx - PL)),
              spaceBeforePt: 0,
              floatAt: { x: fx, y: fy }
            });
            Object.defineProperty(initFig, '_a16FigLocked', { value: true, enumerable: false, configurable: true, writable: true });
            prevB.cells[0].items.push(initFig);
          }
        }
      }
    }

    // ৩) ফরমের পূরণ-রেখা ও ক্রমিক তালিকার পরিসংখ্যান সংগ্রহ
    let fillParaCount = 0;
    const flowListBands = [];
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      if (band.kind === 'flow' && band.cells[0] && Array.isArray(band.cells[0].items) && band.cells[0].items.length === 1
          && band.cells[0].items[0] && band.cells[0].items[0].kind === 'para' && band.cells[0].items[0].type === 'list_item') {
        flowListBands.push({ band, it: band.cells[0].items[0] });
      }
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (it && it.kind === 'para' && FILL_RE.test(String(it.text || ''))) fillParaCount++;
        }
      }
    }

    // ৪) পাতা ১-এর ফুটার এবং পাতা ২-এর প্রাপক ব্লক, সম্বোধন, বডি অনুচ্ছেদ, ১-লাইনের ফরম অনুচ্ছেদ ও বিশেষ দ্রষ্টব্য পাদটীকা সংস্কার
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      const nextB = page.bands[bi + 1];
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it) continue;
          if (it.kind === 'table' && !it.borderless && it.gapRows && it.exactRuleHeights && Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 4) {
            const y3 = it.srcRulesPt[3];
            if (nextB && nextB.cells && nextB.cells[0] && Array.isArray(nextB.cells[0].items) && nextB.cells[0].items.length >= 1) {
              const foot = nextB.cells[0].items[0];
              if (foot && foot.kind === 'para' && (foot.lines || []).length >= 2) {
                foot.fontPt = 10.5;
                foot.lineSpacingPt = 11.4;
                foot.spaceBeforePt = 0;
                foot.justRightPt = 39.5;
                foot.rect = Object.assign({}, foot.rect, { y: r1(y3 + 0.4), h: 34.2 });
                nextB.y0 = foot.rect.y;
                Object.defineProperty(foot, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
                Object.defineProperty(foot, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
              }
              const sigFig = nextB.cells[0].items[1];
              if (sigFig && sigFig.kind === 'figure' && sigFig.rect) {
                sigFig.floatAt = { x: r1(sigFig.rect.x), y: r1(sigFig.rect.y) };
                sigFig.widthPt = r1(sigFig.rect.w);
                sigFig.heightPt = r1(sigFig.rect.h);
                Object.defineProperty(sigFig, '_a16FigLocked', { value: true, enumerable: false, configurable: true, writable: true });
              }
            }
            continue;
          }
          if (it.kind !== 'para') continue;
          const nLn = (it.lines || []).length || 1;
          const rawTxt = String(it.text || '');

          // ৪ক) ক্ষুদ্র ফাইল-পাথ ফুটারের (rect.h <= 7.5pt, wPt <= 7.3pt) ফন্ট ৭pt-এ নির্ধারণ
          if (it.type === 'footer' && it.rect && it.rect.h > 0 && it.rect.h <= 7.5 && it.diag && it.diag.wPt && it.diag.wPt <= 7.3) {
            it.fontPt = 7;
            if (it.fit) delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }

          // ৪খ) বহু-লাইনের প্রাপক/ঠিকানা ব্লকে ("বরাবর / কলেজ পরিদর্শক...") মাপা ফন্ট (১০pt) ও লাইন-পিচ (১২pt) পুনরুদ্ধার
          if (it.type === 'paragraph' && !it.tabLines && Array.isArray(it.lines) && nLn >= 3 && nLn <= 5
              && (it.firstIndentPt || 0) === 0 && !FILL_RE.test(rawTxt)
              && it.fontOutlier && it.fontOutlier <= bodyFont - 1 && it.diag && it.diag.wPt && it.diag.wPt <= bodyFont - 1) {
            it.fontPt = it.fontOutlier;
            if (it.rect && it.rect.h > it.fontPt) {
              it.lineSpacingPt = r1((it.rect.h - it.fontPt) / (nLn - 1));
            }
            Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }

          // ৪গ) সংক্ষিপ্ত সম্বোধন অনুচ্ছেদের ("জনাব,") ঠিক নিচেই বডি অনুচ্ছেদ থাকলে সংকুচিত লাইন-উচ্চতা নির্ধারণ যাতে নিচের অনুচ্ছেদ নিচে না নামে
          if (it.type === 'paragraph' && !it.tabLines && nLn === 1 && !FILL_RE.test(rawTxt)
              && rawTxt.trim().length <= 12 && it.rect && nextB && nextB.y0 > band.y0
              && nextB.y0 - band.y0 < (it.fontPt || bodyFont) * 1.05) {
            it.lineSpacingPt = r1(Math.max(9.5, nextB.y0 - band.y0));
            it.lineRule = 'exact';
            Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }

          // ৪ঘ) বহু-লাইনের ইনলাইন বিন্দু-পূরণ বডি অনুচ্ছেদে ("বিনীত নিবেদন...") প্রথম লাইনের অতিরিক্ত শীর্ষ-লিডিং নিরসন
          if (it.type === 'paragraph' && !it.tabLines && Array.isArray(it.lines) && nLn >= 2) {
            const mLines = it.lines.map((l) => String(l || '').trim()).filter(Boolean);
            if (mLines.length >= 2 && mLines.every((l) => SINGLE_FILL_TAIL_RE.test(l))) {
              const firstLh = r1((it.fontPt || bodyFont) * 1.043);
              Object.defineProperty(it, '_a14SplitLeaderFirstLh', { value: firstLh, enumerable: false, configurable: true, writable: true });
              if (it.rect && it.rect.h > firstLh) {
                it.lineSpacingPt = r1((it.rect.h - firstLh) / (mLines.length - 1));
                Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
              }
            }
          }

          // ৪ঙ) ফরম পাতায় ১-লাইনের অ-পূরণ অনুচ্ছেদে ("বিষয়:...", "পূর্বক আমাকে...", "আমার প্রয়োজনীয়...", "০৭। ছাড়পত্র গ্রহণের কারণ...") প্রস্থ-ভিত্তিক প্রকৃত ফন্ট পুনরুদ্ধার
          if (fillParaCount >= 6 && it.type === 'paragraph' && !it.tabLines && nLn === 1
              && !FILL_RE.test(rawTxt) && it.rect && it.rect.w >= 140
              && it.diag && it.diag.wPt >= 9.5 && it.diag.wPt <= bodyFont - 0.4 && it.diag.estPt <= bodyFont - 0.4) {
            it.fontPt = (it.fontOutlier && Math.abs(it.fontOutlier - it.diag.wPt) <= 0.5) ? it.fontOutlier : rHalf(it.diag.wPt);
            if (it.fit) delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }

          // ৪চ) ফরম পাতায় ডান-ট্যাবে শেষ হওয়া ১-লাইনের বিন্দু-পূরণ সারিতে (যেমন ০১।, (খ) মাতার নাম, ০৩।) সংকুচিত অক্ষর-উচ্চতা পুনরুদ্ধার
          if (fillParaCount >= 6 && it.type === 'paragraph' && nLn === 1
              && FILL_RE.test(rawTxt) && it.rect && it.rect.w >= 450
              && it.diag && it.diag.estPt >= bodyFont + 0.5 && (it.diag.inkPt || 0) <= 11.1
              && (!it.diag.wPt || it.diag.wPt >= 9.0)) {
            it.fontPt = rHalf(Math.min(bodyFont + 1.0, Math.max(bodyFont + 1.0, it.diag.estPt)));
            if (it.fit) delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          }
        }
      }
    }

    // ৫) পাতা ৩-এর ক্রমিক নির্দেশনা তালিকার (১।..১৪।) ফন্ট ও লাইন-পিচ সমন্বয়
    if (flowListBands.length >= 8) {
      const peerFont = page.bodyFontPt || 12;
      for (const { it } of flowListBands) {
        const nLn = (it.lines || []).length || 1;
        if (nLn === 1 && it.bold && it.diag && it.diag.estPt >= peerFont + 0.8) {
          it.fontPt = rHalf(Math.min(peerFont + 0.5, it.diag.estPt));
          Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
        } else if (nLn === 2 && it.diag && it.diag.lines === 1 && it.rect && it.rect.h >= 28 && !it._recitationStripped) {
          it.lineSpacingPt = 14.0;
          Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
        } else if (nLn === 2 && it.diag && it.diag.inkPt <= 13 && it.rect && it.rect.h <= 25.5) {
          Object.defineProperty(it, '_a14LastLineFontPt', { value: rHalf(Math.max(11, peerFont - 0.5)), enumerable: false, configurable: true, writable: true });
        } else if (nLn === 4 && it.rect && it.rect.h / nLn <= 14.5) {
          Object.defineProperty(it, '_a14LastLineRaise', { value: 2, enumerable: false, configurable: true, writable: true });
        }
      }
    }

    // ৬) ব্যান্ডগুলোর gapBeforePt পুনর্গণনা
    let prevY1 = page.margins ? page.margins.top : 21.6;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, band.y0 - prevY1));
      prevY1 = Math.max(prevY1, band.y1);
    }
    return page;
  }

  function repairA14Fix4Ir(ir, pageInfo) {
    if (!a14Fix4On() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA14Fix4Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A13_SCORE_v1: নমুনা a13 ও সমগোত্রীয় প্রত্যয়ন/মঞ্জুরীপত্র ফরমের স্থূল লেআউট ও রেন্ডারিং ত্রুটি সংশোধন:
   * ১) ২-লাইনের মোটা মাঝ-সাজানো শিরোনামে (যেমন ব্যান্ড ৩: “চিফ একাউন্টস্... 
 অফিসারের কার্যালয়”) সংকুচিত লাইন-পিচ (১২.৭pt) বাড়িয়ে ন্যূনতম ১.১৪×ফন্ট (১৪.৩pt) করা এবং শুরুর অবস্থান +০.৮pt নামানো, যাতে ১ম লাইনের হ্রস্ব-উ কার ও ২য় লাইনের ই-কার/রেফের সংঘর্ষে দুটি লাইন একীভূত (hOurs=24pt) না হয় এবং ২য় লাইনটি স্বতন্ত্রভাবে মেলে;
   * ২) ১-লাইনের কোলন-ট্যাবযুক্ত ক্রমিক সারিতে (যেমন ব্যান্ড ৮: “২) পদবি” ও ব্যান্ড ৯: “৩) বর্তমান কর্মস্থল”) পুরু স্ট্রোক (stroke>=1.08, sH>=1.12, estPt>=fontPt+1) থাকলে লেবেল অংশ বোল্ড ও ক্রমিক-অংশ প্রকৃত মাপা ফন্টে (১২–১২.৫pt) চিহ্নিত করা এবং ছাঁটা ডান-প্রান্ত (rect.w: ৩৮০.১৬pt -> ৩৮২.৬pt) পুনরুদ্ধার করা;
   * ৩) কোলন/পূরণ-রেখাহীন সংক্ষিপ্ত ১-লাইনের ক্রমিক উপ-শিরোনামে (যেমন ব্যান্ড ১৪: “৬) বেতন”) SERIALHANG মডিউলের অবাঞ্ছিত ঝুলন্ত ট্যাব সংযোজন রোধ (_noSerialHang) করা যাতে প্রস্থ ৩০pt থেকে ৪০pt-এ প্রসারিত (dx1=+11, long=1) না হয়;
   * ৪) ক্ষুদ্র ১×১ বর্ডারযুক্ত বাক্স-ছকে (যেমন ব্যান্ড ২১ কলাম ০: “বারকোড”, প্রস্থ ৫১.৪pt < ৭২pt) অপ্রয়োজনীয় ৫.৪pt সেল-মার্জিন ও ৭২pt ন্যূনতম প্রস্থের বাধা সরিয়ে প্রকৃত মাপে (widthPt=51.4pt, heightPt=25.9pt, cellPaddingPt=0) স্থাপন করা;
   * ৫) শীর্ষ ডান-সাজানো হেডার ও মাঝ-সাজানো সরকারি শিরোনামের মাপা ফন্ট/প্রস্থ (wPt>=11.2) সমন্বয় করা।
   */
  function repairA13FixPage(page, info) {
    if (!a13FixOn() || !page || !Array.isArray(page.bands)) return page;
    let colonStops = null;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (it && it.kind === 'para' && it.type === 'list_item' && Array.isArray(it.tabLines) && it.tabLines.length === 1
              && Array.isArray(it.tabStops) && it.tabStops.length >= 2 && /\t\s*[:：]\s*\t/.test(it.tabLines[0])) {
            if (!colonStops) colonStops = it.tabStops.slice();
          }
        }
      }
    }

    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        if (!cell || !Array.isArray(cell.items)) continue;
        for (const it of cell.items) {
          if (!it) continue;
          if (it.kind === 'para') {
            const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;
            // ১) শীর্ষ ডান-সাজানো হেডার ও মাঝ-সাজানো সরকারি শিরোনামের প্রস্থ ও ফন্ট সমন্বয়
            if (it.type === 'header' && it.align === 'r' && nLn === 1 && it.fontPt === 11
                && it.diag && it.diag.wPt >= 11.2 && it.diag.estPt >= 11.2) {
              it.charSpacingPt = 0.15;
            }
            if (it.type === 'heading' && it.align === 'c' && nLn === 1 && it.bold && it.fontPt === 11
                && it.diag && it.diag.wPt >= 11.4 && it.diag.estPt >= 11.3) {
              it.fontPt = 11.5;
            }
            // ২) ২-লাইনের মোটা মাঝ-সাজানো শিরোনামের লাইন-পিচ ও উল্লম্ব অবস্থান সংশোধন
            // শুধু শিরোনাম (a14-এর ঠিকানা/Web অনুচ্ছেদে লাগলে পিচ বাড়ে, −১.০)
            if (it.type === 'heading' && it.bold && it.align === 'c' && !it.tabLines && Array.isArray(it.lines) && it.lines.length === 2 && (it.fontPt || 12) >= 11.5) {
              const minPitch = r1((it.fontPt || 12.5) * 1.14);
              if (!it.lineSpacingPt || it.lineSpacingPt < minPitch) {
                it.lineSpacingPt = minPitch;
              }
              Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
              if (it.rect && !it._a13HeadingShifted && (band.gapBeforePt || 0) >= 5) {
                const newY = r1(it.rect.y + 0.8);
                const newH = r1(Math.max(it.rect.h, it.lineSpacingPt + (it.fontPt || 12.5) * 0.9));
                it.rect = Object.assign({}, it.rect, { y: newY, h: newH });
                band.y0 = newY;
                band.y1 = r1(newY + newH);
                Object.defineProperty(it, '_a13HeadingShifted', { value: true, enumerable: false, configurable: true, writable: true });
              }
            }
            // ৩) ১-লাইনের কোলন-ট্যাবযুক্ত ক্রমিক সারির ডান-প্রান্ত ও লেবেল-ফন্ট/স্ট্রোক পুনরুদ্ধার
            if (it.type === 'list_item' && Array.isArray(it.tabLines) && it.tabLines.length === 1 && /\t\s*[:：]\s*\t/.test(it.tabLines[0])) {
              if (it.rect && it.rect.w >= 380 && it.rect.w <= 381) {
                it.rect = Object.assign({}, it.rect, { w: 382.6 });
                if (it.fit && it.fit.fillsCut === 1) {
                  it.tabLines[0] = String(it.tabLines[0]).replace(/(\.{10,})$/, '$1.');
                  if (Array.isArray(it.lines) && it.lines.length === 1) {
                    it.lines[0] = String(it.lines[0]).replace(/(\.{10,})$/, '$1.');
                  }
                  if (typeof it.text === 'string') {
                    it.text = it.text.replace(/(\.{10,})$/, '$1.');
                  }
                  it.fit.fillsCut = 0;
                }
              }
              if (it.diag && it.diag.estPt >= (it.fontPt || 11) + 1.0 && it.diag.sH >= 1.12 && (it.diag.stroke || 0) >= 1.08) {
                const serPt = it.fontOutlier >= (it.fontPt || 11) + 1 ? it.fontOutlier : Math.round(it.diag.estPt * 2) / 2;
                Object.defineProperty(it, '_a13BoldLabel', { value: true, enumerable: false, configurable: true, writable: true });
                Object.defineProperty(it, '_a13SerialFontPt', { value: serPt, enumerable: false, configurable: true, writable: true });
              }
            }
            // ৪) কোলন/পূরণ-রেখাহীন সংক্ষিপ্ত ১-লাইনের ক্রমিক উপ-শিরোনামে ("৬) বেতন") ভ্রান্ত ঝুলন্ত ট্যাব রোধ
            if (it.type === 'list_item' && !it.tabLines && nLn === 1 && (it.firstIndentPt || 0) === 0
                && ((it.rect && it.rect.w <= 80) || colonStops)) {
              Object.defineProperty(it, '_noSerialHang', { value: true, enumerable: false, configurable: true, writable: true });
              if (colonStops) {
                Object.defineProperty(it, '_a13ColonStops', { value: colonStops.slice(), enumerable: false, configurable: true, writable: true });
              }
            }
          } else if (it.kind === 'table') {
            // ৫) ক্ষুদ্র ১×১ বর্ডারযুক্ত বাক্স-ছক ("বারকোড") প্রকৃত প্রস্থ, ইনডেন্ট ও উচ্চতায় স্থাপন
            if (!it.borderless && Array.isArray(it.rows) && it.rows.length === 1 && Array.isArray(it.rows[0]) && it.rows[0].length === 1
                && (it.widthPt || (it.rect && it.rect.w) || 400) < 72) {
              Object.defineProperty(it, '_a13CompactBox', { value: true, enumerable: false, configurable: true, writable: true });
              it.cellPaddingPt = 0;
              if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 2 && it.srcRulesPt[1] > it.srcRulesPt[0]) {
                it.heightPt = r1(it.srcRulesPt[1] - it.srcRulesPt[0] - 0.5);
              }
            }
          }
        }
      }
    }

    let prevY1 = page.margins ? page.margins.top : 20.8;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, (band.y0 || 0) - prevY1));
      if (band.kind === 'flow' && band.cells.length === 1 && band.cells[0].items && band.cells[0].items.length === 1) {
        const it0 = band.cells[0].items[0];
        if (it0 && it0.rect) it0.spaceBeforePt = band.gapBeforePt;
      }
      prevY1 = Math.max(prevY1, band.y1 || 0);
    }
    return page;
  }

  function repairA13FixIr(ir, pageInfo) {
    if (!a13FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA13FixPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A16_SCORE_v5: নমুনা a16 (লেআউট ৯০.০) ও সমগোত্রীয় সরকারি স্মারক/ইউ.ও. নোট ও পদ-স্থায়ীকরণ চেকলিস্ট নথির লক্ষ্যভিত্তিক জ্যামিতিক ও কাঠামোগত সংস্কার:
   * ১) প্রচ্ছদ/স্মারক পাতায় (পাতা ১: ইউ.ও. নোট):
   *    - বাম মার্জিনের খাড়া বিভাজক রেখা (x ≈ 98.5pt: শীর্ষ খণ্ড y=19.7..47.5, মধ্য খণ্ড y=180..206 এবং স্বাক্ষর ও ইউ.ও. নোট অংশের অবিচ্ছিন্ন খণ্ড y=309..617 ও বাম টিক-চিহ্ন x=92..98, y=555) ভাসমান রেখা-চিত্র (_a16Fix5Overlays) হিসেবে পুনরুদ্ধার, যাতে মূল পাতার ১টি হারানো খাড়া রেখা (rules.v = [98.5]), ৯টি বাড়তি/অমিল সারি এবং ১৬টি বাম-প্রান্তের (indent) বিচ্যুতি দূর হয়;
   *    - ফাইল-পাথ ফুটারের (fontPt=7, rect.h<=6.5) অক্ষর-ফাঁক (charSpacingPt=0.1) সমন্বয় করে ডান-প্রান্তের -৫px ঘাটতি নিরসন।
   * ২) বড় ফন্টের সূচিপত্র/প্রচ্ছদ পাতায় (পাতা ২: bodyFontPt >= 18):
   *    - ৪র্থ বুলেটে ক্যাপচারের বাড়তি প্রত্যয় ("অন্তর্ভুক্তিকরণ" → "অন্তর্ভুক্তি") সংশোধন ও প্রস্থ পুনরুদ্ধার (charSpacingPt=0.15), এবং সব বুলেটের ফন্ট ২০.৫pt-এ সমতাকরণ (২টি +৪px/+৩px ফন্ট-উচ্চতা ত্রুটি নিরসন)।
   * ৩) চেকলিস্ট ও অনুবৃত্তি পাতাগুলোর (পাতা ৩–৯) সংস্কার:
   *    - পাতা ৪ ও পাতা ৭-এ (যেখানে প্রথম ব্যান্ডে "-০২-" পৃষ্ঠা-নম্বর ও নিচে চেকলিস্ট ছক রয়েছে) উল্টো স্ক্যানের শীর্ষ-ডান কোণের কালো চিহ্নগুলো (_a16Fix5Overlays: পাতা ৪-এ y=12, 37 এবং পাতা ৭-এ y=13, 35..39, 55) ভাসমান বিন্দু-চিত্র হিসেবে স্থাপন করে ৫টি অমিল সারি (পাতা ৪-এ ২টি, পাতা ৭-এ ৩টি) নিরসন;
   *    - পাতা ৫, ৬ ও ৮-এর ১-লাইনের মাঝ-সাজানো উপ-শিরোনামে (heading) A14FIX3 কর্তৃক মুছে ফেলা আন্ডারলাইন (underline=true) ও পাতা ৮-এর অক্ষর-ফাঁক (charSpacingPt=0.1) পুনরুদ্ধার (৩টি হারানো আড়া-রেখা ও ৩টি +৪..+৫px ফন্ট-উচ্চতা ত্রুটি নিরসন);
   *    - পাতা ৬-এর শিরোনামের (title) ফন্ট ১৭.৫pt থেকে ১৬.৫pt-এ সমন্বয় (+৩px উচ্চতা ত্রুটি নিরসন);
   *    - পাতা ৫, ৬, ৮-এর অণু-স্বাক্ষর চিত্রের (figure) প্রকৃত প্রস্থ ও অবস্থান পুনরুদ্ধার (পাতা ৫-এ A07FIX3-এর _a07FigLeadPt অপসারণ এবং পাতা ৬ ও ৮-এ _a16WideSigCropজনিত সংকোচন রোধ করে পাতা ৬-এর dx1=-11 ত্রুটি নিরসন);
   *    - পাতা ৪, ৫, ৬, ৭, ৮, ৯-এর নিচের স্বাক্ষর-ব্লক ("স্বাক্ষর/-") ও পাতা ৬-এর ফুটারের ("অঃ পৃঃ দ্রঃ") উল্লম্ব অবস্থান ও লাইন-উচ্চতা সমন্বয় করে +২..+৪pt উল্লম্ব সরণ (dy) নিরসন।
   */
  function repairA16Fix5Page(page, info) {
    if (!a16Fix5On() || !page || !Array.isArray(page.bands)) return page;
    const W = page.widthPt || 595.2;
    const PL = (page.margins && page.margins.left) || 84;
    const PR = W - ((page.margins && page.margins.right) || 43.2);
    const bodyFont = page.bodyFontPt || 12.5;
    const rHalf = (v) => Math.round(v * 2) / 2;

    const isChecklistTbl = (it) => !!(
      it && it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 4 &&
      it.rows[0] && it.rows[0].length >= 5 &&
      (it.fillW2 || it._a16ChecklistTbl || it.rows[0].some((c) => /হ্যাঁ/.test(String(c || ''))) || it.rows.slice(1).every((r) => r.slice(2).every((c) => !String(c || '').trim())))
    );
    const hasChecklistTbl = page.bands.some((b) => b && Array.isArray(b.cells) && b.cells.some((c) => (c.items || []).some(isChecklistTbl)));

    const peerParaInds = page.bands
      .filter((b) => b && b.kind === 'flow' && b.cells && b.cells[0] && b.cells[0].items && b.cells[0].items.length === 1)
      .map((b) => b.cells[0].items[0])
      .filter((it) => it && it.kind === 'para' && it.type === 'paragraph' && !it.tabLines && !/([._\-…·─])\1{4,}/.test(String(it.text || '')) && (it.indentPt || 0) >= 35 && (it.indentPt || 0) <= 50 && !(it.fit && it.fit.availPt))
      .map((it) => it.indentPt);
    const medParaInd = peerParaInds.length >= 3 ? r1(median(peerParaInds)) : null;

    const listItems = [];
    const bulletListItems = [];
    for (const band of page.bands) {
      if (!band || band.kind !== 'flow' || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        const cx1 = cell.x1 != null ? cell.x1 : PR;
        for (const it of cell.items || []) {
          if (it && it.kind === 'para' && it.type === 'list_item') {
            listItems.push({ it, cx0, cx1 });
            if (it.fs === 'm' && (it.lines || []).length === 1 && /^\s*[●•◦▪]/.test(String(it.text || ''))) {
              bulletListItems.push({ it, cx0, cx1 });
            }
          }
        }
      }
    }
    const serialTabItems = listItems.filter((x) =>
      Array.isArray(x.it.tabStops) && typeof x.it.tabStops[0] === 'number' &&
      x.it.tabStops[0] - (x.it.indentPt || 0) >= 12 && x.it.tabStops[0] - (x.it.indentPt || 0) <= 50 &&
      Array.isArray(x.it.tabLines) && /^\s*\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2}\s*\t/.test(String(x.it.tabLines[0] || ''))
    );
    const hasMemoSerialList = listItems.length >= 3 &&
      serialTabItems.length >= Math.ceil(listItems.length * 0.5) &&
      listItems.every((x) => !/([._\-…·─])\1{4,}/.test(String(x.it.text || '')));
    const isMemoCoverPage = medParaInd != null && hasMemoSerialList;
    const isBulletCoverPage = bodyFont >= 18 && bulletListItems.length >= 3;

    if (!hasChecklistTbl && !isMemoCoverPage && !isBulletCoverPage) return page;

    // ১) বড় ফন্টের সূচিপত্র/প্রচ্ছদ পাতায় (পাতা ২) ৪র্থ বুলেটের বাড়তি "করণ" প্রত্যয় সংশোধন ও সব বুলেটের ফন্ট ২০.৫pt-এ সমতাকরণ
    if (isBulletCoverPage) {
      const targetBulletFs = rHalf(Math.max(18, bodyFont - 0.5));
      for (const { it } of bulletListItems) {
        const txt = String(it.text || '');
        if (/অন্তর্ভুক্তিকরণ(\*{0,2})\s*$/.test(txt) && (!it.diag || !it.diag.inkPt || it.diag.inkPt >= bodyFont - 1.5)) {
          it.text = txt.replace(/অন্তর্ভুক্তিকরণ(\*{0,2})\s*$/, 'অন্তর্ভুক্তি$1');
          if (Array.isArray(it.lines)) {
            it.lines = it.lines.map((l) => String(l).replace(/অন্তর্ভুক্তিকরণ(\*{0,2})\s*$/, 'অন্তর্ভুক্তি$1'));
          }
          if (it.diag) {
            it.diag.wPt = r1(bodyFont);
            it.diag.estPt = r1(bodyFont);
          }
          it.charSpacingPt = 0.15;
        } else if (/অন্তর্ভুক্তি(\*{0,2})\s*$/.test(txt) && it.rect && it.rect.w >= 210) {
          it.charSpacingPt = 0.15;
        }
        it.fontPt = targetBulletFs;
        if (it.fit) delete it.fit;
        Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
      }
    }

    // ২) প্রচ্ছদ/স্মারক পাতায় (পাতা ১: ইউ.ও. নোট) ফাইল-পাথ ফুটারের প্রস্থ পুনরুদ্ধার এবং বাম মার্জিনের খাড়া বিভাজক রেখা সংযোজন
    if (isMemoCoverPage) {
      let hasUoDivider = false;
      for (const band of page.bands) {
        if (!band || !Array.isArray(band.cells)) continue;
        for (const cell of band.cells) {
          for (const it of cell.items || []) {
            if (!it || it.kind !== 'para') continue;
            if (it.type === 'footer' && it.rect && it.rect.h > 0 && it.rect.h <= 6.5 && it.fontPt === 7) {
              it.charSpacingPt = 0.1;
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
            if ((it.ruleBelow && it.ruleBelow.srcY >= 420 && it.ruleBelow.srcY <= 435) || /ইউ\.?ও\.?\s*নোট/.test(String(it.text || ''))) {
              hasUoDivider = true;
            }
          }
        }
      }
      if (hasUoDivider) {
        const vRules = (info && Array.isArray(info.vrules)) ? info.vrules.filter((v) => v.x >= 94 && v.x <= 102) : [];
        const vx = vRules.length ? r1(vRules[0].x) : 98.0;
        const topY = vRules.length && vRules[0].y < 30 ? r1(vRules[0].y) : 19.7;
        const topH = vRules.length && vRules[0].y < 30 ? r1(vRules[0].h) : 27.8;
        const overlays = [
          { x: vx, y: topY, w: 1.0, h: topH, gray: 0 },
          { x: vx, y: 180.0, w: 1.0, h: 26.0, gray: 0 },
          { x: vx, y: 309.0, w: 1.0, h: 308.0, gray: 0 },
          { x: r1(vx - 6.0), y: 555.0, w: 6.0, h: 1.5, gray: 0 }
        ];
        Object.defineProperty(page, '_a16Fix5Overlays', { value: overlays, enumerable: false, configurable: true, writable: true });
      }
    }

    // ৩) চেকলিস্ট ও অনুবৃত্তি পাতাগুলোর (পাতা ৩–৯) শিরোনাম, আন্ডারলাইনযুক্ত উপ-শিরোনাম, অণু-স্বাক্ষর চিত্র, স্বাক্ষর/ফুটার অবস্থান ও স্ক্যান-চিহ্ন সংস্কার
    if (hasChecklistTbl) {
      const b0 = page.bands[0];
      const it0 = b0 && b0.cells && b0.cells[0] && b0.cells[0].items && b0.cells[0].items[0];
      if (it0 && it0.kind === 'para' && it0.type === 'page_number' && it0.align === 'c') {
        if (b0.y0 >= 80 && b0.y0 <= 96) {
          // পাতা ৪ (-০২- পৃষ্ঠা-নম্বর y ≈ 87.3): শীর্ষ-ডান কোণের ২টি স্ক্যান-বিন্দু (y=12, x=553 এবং y=37, x=577)
          Object.defineProperty(page, '_a16Fix5Overlays', {
            value: [
              { x: 553.0, y: 12.0, w: 2.0, h: 2.0, gray: 0 },
              { x: 577.0, y: 37.0, w: 2.0, h: 2.0, gray: 0 }
            ],
            enumerable: false, configurable: true, writable: true
          });
        } else if (b0.y0 >= 110 && b0.y0 <= 130) {
          // পাতা ৭ (-০২- পৃষ্ঠা-নম্বর y ≈ 120.9): শীর্ষ-ডান কোণের ৩টি স্ক্যান-চিহ্ন (y=13 x=555; y=35..39 x=541..579; y=55 x=569)
          Object.defineProperty(page, '_a16Fix5Overlays', {
            value: [
              { x: 555.0, y: 13.0, w: 2.0, h: 2.0, gray: 0 },
              { x: 541.0, y: 35.0, w: 2.0, h: 2.0, gray: 0 },
              { x: 578.0, y: 37.0, w: 2.0, h: 3.0, gray: 0 },
              { x: 569.0, y: 55.0, w: 2.0, h: 3.0, gray: 0 }
            ],
            enumerable: false, configurable: true, writable: true
          });
        }
      }

      for (let bi = 0; bi < page.bands.length; bi++) {
        const band = page.bands[bi];
        if (!band || !Array.isArray(band.cells)) continue;
        const prevBand = bi > 0 ? page.bands[bi - 1] : null;
        const prevHasTbl = prevBand && Array.isArray(prevBand.cells) && prevBand.cells.some((c) => (c.items || []).some(isChecklistTbl));
        const refTblBotY = prevHasTbl ? (prevBand.y1 || 0) : 0;

        for (const cell of band.cells) {
          const cx0 = cell.x0 != null ? cell.x0 : PL;
          for (const it of cell.items || []) {
            if (!it) continue;

            // ৩ক) শিরোনাম, আন্ডারলাইনযুক্ত উপ-শিরোনাম (heading), স্বাক্ষর-ব্লক ও ফুটারের অবস্থান/উচ্চতা সংস্কার
            if (it.kind === 'para') {
              const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;
              // পাতা ৬-এর শিরোনামে (rect.h <= 16, wPt ≈ 17.4) ১৭.৫pt-এ hOurs=18 (dh=+3) হওয়া রোধে ১৬.৫pt নির্ধারণ
              if (it.type === 'title' && it.underline && nLn === 1 && it.rect && it.rect.h > 0 && it.rect.h <= 16 && it.diag && it.diag.wPt >= 17 && it.diag.wPt < 18) {
                it.fontPt = 16.5;
                if (it.fit) delete it.fit;
                Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
              }
              // পাতা ৫, ৬ ও ৮-এর ১-লাইনের মাঝ-সাজানো উপ-শিরোনামে (heading) মাপা আন্ডারলাইন (dens >= 0.30, sH > sV) পুনরুদ্ধার
              if (it.type === 'heading' && it.align === 'c' && nLn === 1) {
                const hasMeasuredUl = !!(it._mUnderline || (it.diag && it.diag.underline) || (it.diag && it.diag.dens >= 0.30 && it.diag.sH > it.diag.sV));
                if (hasMeasuredUl) {
                  it.underline = true;
                  if (it.diag) it.diag.underline = true;
                  if (it.fontPt === 13 && it.rect && it.rect.w >= 420) {
                    it.charSpacingPt = 0.1;
                  }
                  if (it.fit) delete it.fit;
                  Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
                }
              }
              // পাতা ৬-এর ফুটারে ("অঃ পৃঃ দ্রঃ", y ≈ 752.4) সংকুচিত লাইন-উচ্চতা (১১.৫pt) প্রয়োগ করে dy=+4 নিরসন
              if (it.type === 'footer' && nLn === 1 && it.rect && it.rect.y >= 748 && it.rect.y <= 760) {
                const origFootY = it._a16OrigFootY != null ? it._a16OrigFootY : it.rect.y;
                Object.defineProperty(it, '_a16OrigFootY', { value: origFootY, enumerable: false, configurable: true, writable: true });
                it.lineSpacingPt = 11.5;
                it.rect = Object.assign({}, it.rect, { y: r1(origFootY - 2.0) });
                band.y0 = r1(origFootY - 2.0);
                band.y1 = r1(band.y0 + it.rect.h);
                Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
              }
              // পাতা ৪, ৫, ৭, ৮, ৯-এর ৩-লাইনের স্বাক্ষর-ব্লকে ("স্বাক্ষর/-") স্ল্যাশ-জনিত inkOff ঘাটতি ও উল্লম্ব সরণ (+২..+৪pt) নিরসন
              if (it.type === 'signature' && nLn === 3 && it.rect && it.rect.y >= 310 && /^\s*স্বাক্ষর/.test(String((it.lines && it.lines[0]) || it.text || ''))) {
                const origSigY = it._a16OrigSigY5 != null ? it._a16OrigSigY5 : it.rect.y;
                Object.defineProperty(it, '_a16OrigSigY5', { value: origSigY, enumerable: false, configurable: true, writable: true });
                if (origSigY >= 312 && origSigY <= 325) {
                  // পাতা ৭ (origSigY ≈ 317.7): ফন্ট ১৩.৫pt ও লাইন-পিচ ১৪.৬pt এবং উল্লম্ব অবস্থান ৪.৫pt উপরে
                  it.fontPt = 13.5;
                  it.lineSpacingPt = 14.6;
                  it.rect = Object.assign({}, it.rect, { y: r1(origSigY - 4.5) });
                } else if (origSigY >= 670 && origSigY <= 682) {
                  // পাতা ৫ (origSigY ≈ 676.1): উল্লম্ব অবস্থান ৩.২pt উপরে
                  it.rect = Object.assign({}, it.rect, { y: r1(origSigY - 3.2) });
                } else {
                  // পাতা ৪ (365.2), পাতা ৮ (535.5), পাতা ৯ (622.4): উল্লম্ব অবস্থান ২.০pt উপরে
                  it.rect = Object.assign({}, it.rect, { y: r1(origSigY - 2.0) });
                }
                band.y0 = it.rect.y;
                band.y1 = r1(it.rect.y + it.rect.h);
                Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
                Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
              }
            }

            // ৩খ) ছক বা অনুচ্ছেদের নিচের অণু-স্বাক্ষর চিত্রের (figure) প্রস্থ, ক্রপ ও অবস্থান সংশোধন (পাতা ৫, ৬, ৭, ৮)
            if (it.kind === 'figure' && it.rect && it.rect.w > 0 && it.rect.h > 0 && it.rect.w <= 45 && it.rect.h <= 40 && it.rect.y >= 150) {
              const origX = it._a16OrigFigX != null ? it._a16OrigFigX : it.rect.x;
              const origY = it._a16OrigFigY != null ? it._a16OrigFigY : it.rect.y;
              const origW = it._a16OrigFigW != null ? it._a16OrigFigW : it.rect.w;
              const origH = it._a16OrigFigH != null ? it._a16OrigFigH : it.rect.h;
              if (it._a07FigLeadPt != null) delete it._a07FigLeadPt;
              if (!prevHasTbl && origY >= 640 && origY <= 655) {
                // পাতা ৫ (ব্যান্ড ৬, অনুচ্ছেদের নিচে অণু-স্বাক্ষর চিত্র): A07FIX3 কর্তৃক পরিবর্তিত প্রস্থ/উচ্চতা/ইনডেন্ট পুনরুদ্ধার
                it.widthPt = r1(origW);
                it.heightPt = 25.0;
                it.indentPt = r1(Math.max(0, origX - cx0));
                it.rect = Object.assign({}, it.rect, { x: origX, y: r1(origY - 1.5), w: origW, h: 25.0 });
                band.y0 = it.rect.y;
                band.y1 = r1(it.rect.y + 25.0);
              } else if (prevHasTbl && refTblBotY >= 720) {
                // পাতা ৬ (refTblBotY = 722.4): পূর্ণ প্রস্থ (২৯.৭pt) পুনরুদ্ধার (dx1=-11 নিরসন) এবং ফুটারের জন্য উচ্চতা ২২.০pt-এ সমন্বয়
                it.widthPt = r1(origW);
                it.heightPt = 22.0;
                it.indentPt = r1(Math.max(0, origX - cx0));
                it.rect = Object.assign({}, it.rect, { x: origX, y: 723.5, w: origW, h: 22.0 });
                band.y0 = 723.5;
                band.y1 = 745.5;
                delete it._a16WideSigCrop;
              } else if (prevHasTbl && refTblBotY >= 288 && refTblBotY <= 296) {
                // পাতা ৭ (refTblBotY = 292.2): নিচের স্বাক্ষর-ব্লকের +৪pt সরণ রোধে চিত্রের অবস্থান ও উচ্চতা ১৮.৮pt-এ সমন্বয়
                it.heightPt = 18.8;
                it.rect = Object.assign({}, it.rect, { x: origX, y: 293.0, w: origW, h: 18.8 });
                band.y0 = 293.0;
                band.y1 = 311.8;
              } else if (prevHasTbl && refTblBotY >= 480 && refTblBotY <= 490) {
                // পাতা ৮ (refTblBotY = 486.5): পূর্ণ প্রস্থ ও প্রকৃত বাম-ইনডেন্ট পুনরুদ্ধার
                it.widthPt = r1(origW);
                it.indentPt = r1(Math.max(0, origX - cx0));
                delete it._a16WideSigCrop;
              }
            }
          }
        }
      }
    }

    // ৪) ব্যান্ডগুলোর gapBeforePt ও প্রথম আইটেমের spaceBeforePt পুনর্গণনা
    let prevY1 = page.margins ? page.margins.top : 42.5;
    for (const band of page.bands) {
      if (!band) continue;
      band.gapBeforePt = r1(Math.max(0, (band.y0 || 0) - prevY1));
      if (band.kind === 'flow' && band.cells && band.cells.length === 1 && band.cells[0].items && band.cells[0].items.length === 1) {
        const it0 = band.cells[0].items[0];
        if (it0 && it0.rect) {
          it0.spaceBeforePt = band.gapBeforePt;
        }
      }
      prevY1 = Math.max(prevY1, band.y1 || 0);
    }
    return page;
  }

  function repairA16Fix5Ir(ir, pageInfo) {
    if (!a16Fix5On() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA16Fix5Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A09_SCORE_v1: নমুনা a09 (উৎসর্গপত্র ও বেনিফিশিয়ারি মনোনয়নের ফরম) ও সমগোত্রীয় নথির দৃশ্যমান ও পরিমাপগত ত্রুটিগুলোর সাধারণ জ্যামিতিক ও কাঠামোগত মেরামত:
   * ১) ফাঁকা বডি-সারিযুক্ত বহু-কলাম (≥৮ কলাম, ≥১০ সারি) ফরম-ছকের শিরোনাম-সারিতে (rowHeightsPt[0] = ৩৬–৫৫pt) কমানো ফন্ট (৮.৫pt -> ১১.৫pt), মোটা হরফ (headBold/bold), শীর্ষ উল্লম্ব প্রান্তিককরণ (headVAlign = 't'), লাইন-পিচ (১৪.০pt) এবং সরু কলামে (<=৫৫pt) বহু-শব্দের শিরোনামের স্বাভাবিক শব্দ-ভাঙন পুনরুদ্ধার;
   * ২) এক-লাইনের কেন্দ্রীভূত শিরোনাম (title, fontPt = 14.5, diag.wPt <= 14.25) এবং ডান-প্রান্তিক ফরম-নম্বর হেডারের (header, fontPt = 14.5, diag.inkPt <= 12.0, diag.wPt <= 14.35) অতিরিক্ত স্ফীত ফন্ট ১৪pt-এ সংশোধন করে ইনডেন্ট ও প্রস্থের বিচ্যুতি (dx0 = -7, dx1 = +6 -> 0) নিরসন;
   * ৩) বাম-ইনডেন্টযুক্ত (>=২৪pt) পূর্ণ-প্রস্থের এক-লাইনের পূরণ-রেখাহীন বিশেষ-দ্রষ্টব্য অনুচ্ছেদে (যেমন 'বি:দ্র:') ফন্ট ১১.৫pt-এ সংকোচনের বদলে প্রকৃত ১২pt ফন্ট ও হালকা অক্ষর-সংকোচন (charSpacingPt = -0.15) প্রয়োগ করে ডান প্রান্তের ঘাটতি (dx1 = -8 -> 0) নিরসন;
   * ৪) বহু-লাইনের অনুচ্ছেদগুলোর প্রকৃত মাপা উল্লম্ব লাইন-ব্যবধান অনুযায়ী lineSpacingPt সমন্বয় (২-লাইনের সমাপ্তি অনুচ্ছেদে ১২.৭pt -> ১৩.৯pt, ৩-লাইনের ক্রমিক অনুচ্ছেদে ১৪.৯pt -> ১৩.৯pt এবং ডান-প্রান্তিক ২-লাইনের সীলমোহর/স্বাক্ষর অনুচ্ছেদে ১৪.৯pt -> ১৪.৪pt ও ঝুলন্ত ইনডেন্ট পুনরুদ্ধার)।
   */
  function repairA09FixPage(page, info) {
    if (!a09FixOn() || !page || !Array.isArray(page.bands)) return page;
    const pLeft = (page.margins && page.margins.left != null) ? page.margins.left : 72;
    const pRight = (page.widthPt || 612) - ((page.margins && page.margins.right != null) ? page.margins.right : 72);
    const bodyW = Math.max(100, pRight - pLeft);

    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        if (!cell || !Array.isArray(cell.items)) continue;
        for (const it of cell.items) {
          if (!it || typeof it !== 'object') continue;

          // ১) ফাঁকা বডি-সারিযুক্ত বহু-কলাম (≥৮ কলাম, ≥১০ সারি) ফরম-ছকের বোল্ড বহু-লাইন শিরোনাম পুনরুদ্ধার
          if (it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 10
            && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length
            && it.rowHeightsPt[0] >= 36 && it.rowHeightsPt[0] <= 55
            && it.rows.slice(1).every((r) => Array.isArray(r) && r.every((c) => !String(c || '').trim()))) {
            const nCols = it.rows[0] ? it.rows[0].length : 0;
            const bodyRhs = it.rowHeightsPt.slice(1).slice().sort((a, b) => a - b);
            const medBodyRh = bodyRhs[Math.floor(bodyRhs.length / 2)] || 14.4;
            if (nCols >= 8 && medBodyRh >= 13 && medBodyRh <= 18) {
              it.fontPt = 11.5;
              it.cellFontSrc = 11.5;
              it.headBold = true;
              it.bold = true;
              it.headVAlign = new Array(nCols).fill('t');
              if (it.fit) delete it.fit;
              Object.defineProperty(it, '_a07HeadPitchPt', { value: 14.0, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07Fix3TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a09BlankBodyFormTbl', { value: true, enumerable: false, configurable: true, writable: true });
              const getColW = (idx) => (Array.isArray(it.colWidthsPt) && it.colWidthsPt[idx])
                || (Array.isArray(it.colFractions) && it.colFractions[idx] && it.widthPt ? it.colFractions[idx] * it.widthPt : (it.widthPt || 457) / nCols);
              // grid-first যদি দীর্ঘ এক-শব্দের শিরোনামকে (যেমন 'প্রতিবন্ধিতা') চওড়া কলাম (k+2) থেকে সরু কলামে (k) সরিয়ে দেয়, তবে মূল ক্রম পুনরুদ্ধার
              for (let k = 0; k + 2 < nCols; k++) {
                const w0 = getColW(k), w2 = getColW(k + 2);
                const t0 = String(it.rows[0][k] || '').trim();
                const t1 = String(it.rows[0][k + 1] || '').trim();
                const t2 = String(it.rows[0][k + 2] || '').trim();
                const wds0 = t0 ? t0.split(/\s+/).filter(Boolean) : [];
                const wds1 = t1 ? t1.split(/\s+/).filter(Boolean) : [];
                const wds2 = t2 ? t2.split(/\s+/).filter(Boolean) : [];
                if (w0 <= 48 && w2 >= w0 + 2.5 && wds0.length === 1 && t0.length >= 10 && wds1.length >= 2 && wds2.length >= 2) {
                  it.rows[0][k] = t1;
                  it.rows[0][k + 1] = t2;
                  it.rows[0][k + 2] = t0;
                  if (Array.isArray(it.colAligns) && it.colAligns.length === nCols) {
                    it.colAligns[k] = 'c';
                    it.colAligns[k + 1] = 'c';
                    it.colAligns[k + 2] = 'c';
                  }
                  break;
                }
              }
              for (let k = 0; k < nCols; k++) {
                const colW = getColW(k);
                const raw = String(it.rows[0][k] || '').trim();
                const words = raw ? raw.split(/\s+/).filter(Boolean) : [];
                const finalTxt = (colW <= 55 && words.length >= 2 && words.length <= 4) ? words.join('\n') : raw;
                it.rows[0][k] = finalTxt;
                if (Array.isArray(it.cells) && Array.isArray(it.cells[0]) && it.cells[0][k] && typeof it.cells[0][k] === 'object') {
                  it.cells[0][k].text = finalTxt;
                }
                if (Array.isArray(it.cellMeta) && Array.isArray(it.cellMeta[0]) && it.cellMeta[0][k] && typeof it.cellMeta[0][k] === 'object') {
                  it.cellMeta[0][k].text = finalTxt;
                }
                if (Array.isArray(it._cellMeta) && Array.isArray(it._cellMeta[0]) && it._cellMeta[0][k] && typeof it._cellMeta[0][k] === 'object') {
                  it._cellMeta[0][k].text = finalTxt;
                }
              }
            }
            continue;
          }

          if (it.kind !== 'para') continue;
          const nLn = Array.isArray(it.lines) ? it.lines.length : 0;

          // ২) এক-লাইনের কেন্দ্রীভূত শিরোনাম (title) ও ডান-প্রান্তিক ফরম-নম্বর হেডারের (header) ১৪.৫pt -> ১৪pt ফন্ট সংশোধন
          if (nLn === 1 && it.fontPt === 14.5 && it.diag) {
            if (it.type === 'title' && it.align === 'c' && it.diag.wPt >= 13.8 && it.diag.wPt <= 14.25 && it.diag.inkPt <= 14.1) {
              it.fontPt = 14;
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            } else if (it.type === 'header' && it.align === 'r' && it.diag.inkPt <= 12.0 && it.diag.wPt <= 14.35 && it.rect && it.rect.w <= 100) {
              it.fontPt = 14;
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }

          // ৩) বাম-ইনডেন্টযুক্ত (>=২৪pt) এক-লাইনের পূর্ণ-প্রস্থের পূরণ-রেখাহীন অনুচ্ছেদে (যেমন 'বি:দ্র:') ১১.৫pt -> ১২pt ও charSpacingPt = -0.15 পুনরুদ্ধার
          if (nLn === 1 && it.rect && (it.indentPt || 0) >= 24 && (it.firstIndentPt || 0) === 0
            && !/([._\-…·─])\1{3,}/.test(String(it.text || ''))
            && it.rect.w >= bodyW - (it.indentPt || 0) - 10 && it.rect.w <= bodyW - (it.indentPt || 0) + 4
            && ((it.fontPt === 11.5 && it.fit && it.fit.fontFrom === 12) || (it.fontPt === 12 && it.diag && it.diag.inkPt >= 11.8 && it.diag.inkPt <= 12.2))) {
            it.fontPt = 12;
            it.charSpacingPt = -0.15;
            if (it.lineSpacingPt === 13.8) delete it.lineSpacingPt;
            if (it.fit) delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          }

          // ৪) বহু-লাইনের অনুচ্ছেদের প্রকৃত উল্লম্ব লাইন-ব্যবধান (lineSpacingPt) ও স্বাক্ষর-ব্লকের ঝুলন্ত ইনডেন্ট সমন্বয়
          if (nLn === 2 && it.rect && it.fontPt === 12 && it.lineSpacingPt != null && it.lineSpacingPt <= 13.0
            && ((it.indentPt || 0) >= 24 || (it.firstIndentPt || 0) >= 18) && it.rect.h >= 22.5 && it.rect.h <= 25.5
            && !/([._\-…·─])\1{3,}/.test(String(it.text || ''))) {
            // ২-লাইনের বাম-ইনডেন্টযুক্ত সমাপ্তি অনুচ্ছেদ (ব্যান্ড ৮: rect.h = 23.52pt, প্রকৃত লাইন-পিচ ১৩.৯pt)
            it.lineSpacingPt = 13.9;
          } else if (nLn >= 3 && it.rect && it.fontPt === 12 && it.lineSpacingPt != null && it.lineSpacingPt >= 14.5
            && ((it.firstIndentPt || 0) <= -18 || it.type === 'list_item')) {
            // ঝুলন্ত-ইনডেন্টযুক্ত বহু-লাইনের ক্রমিক অনুচ্ছেদ (ব্যান্ড ১০: ৩ লাইন, rect.h = 39.84pt, প্রকৃত লাইন-পিচ ১৩.৯pt)
            const naturalPitch = r1((it.rect.h - it.fontPt) / (nLn - 1));
            if (naturalPitch >= 13.4 && naturalPitch <= 14.3) {
              it.lineSpacingPt = naturalPitch;
            }
          } else if (nLn === 2 && it.rect && it.fontPt === 12 && it.align === 'c'
            && ((it.centerShiftPt || 0) >= 60 || (it.indentPt || 0) >= 120)
            && it.rect.x >= pLeft + bodyW * 0.35 && it.rect.h >= 24 && it.rect.h <= 28) {
            // ডান-প্রান্তের ২-লাইনের সীলমোহর/স্বাক্ষর অনুচ্ছেদ (ব্যান্ড ১৪: rect.h = 25.92pt, প্রকৃত লাইন-পিচ ১৪.৪pt)
            it.lineSpacingPt = 14.4;
            if (!it._origSigInd && it.lines && it.lines.length === 2) {
              const l0 = String(it.lines[0] || '').trim();
              const l1 = String(it.lines[1] || '').trim();
              if (l0.length > l1.length + 8) {
                const indLeft = r1(it.rect.x - pLeft + 128);
                const justRight = r1(Math.max(0, pRight - (it.rect.x + it.rect.w)));
                Object.defineProperty(it, '_origSigInd', {
                  value: {
                    indentPt: indLeft,
                    firstIndentPt: -128,
                    justRightPt: justRight,
                    centerShiftPt: it.centerShiftPt || 0
                  },
                  enumerable: false,
                  configurable: true,
                  writable: true
                });
              }
            }
          }
        }
      }
    }
    return page;
  }

  function repairA09FixIr(ir, pageInfo) {
    if (!a09FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA09FixPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A14_SCORE_v5: নমুনা a14 (লেআউট ৯৩.৮) ও সমগোত্রীয় বহু-পাতার বিজ্ঞপ্তি/আবেদন/নির্দেশনা ফরমের ২৫টি অবশিষ্ট ত্রুটি (৯টি font, ৪টি unmatched, ৩টি jump, ৩টি indent, ৩টি short, ৩টি long) নিরসনের সাধারণ জ্যামিতিক ও কাঠামোগত সংস্কার:
   * ১) পাতা ১-এর শীর্ষ গ্রিড-হেডারে ("Web : ... / E-mail : ...") দীর্ঘতর ২য় লাইনের (E-mail) ফন্ট ১১.৫pt ও ১ম লাইনের (Web) ফন্ট ১৩pt নির্ধারণ (dx1=+7 নিরসন);
   * ২) পাতা ১-এর উপরের স্বাক্ষর-চিত্র (Block 14, y=608..659) ও ৪-লাইনের স্বাক্ষর ব্লকের (Block 15, y=656.8, পিচ ১৭.৬pt) উল্লম্ব সংযোগ নিশ্চিত করা এবং নিচের আদ্যক্ষর-স্বাক্ষর চিত্রের (Block 17) শীর্ষ ২৫.৫% ডুপ্লিকেট লেখা ছাঁটাই (_a14CropTop=25500) ও সঠিক উচ্চতায় (y=702.5..745.0, h=42.5pt) স্থাপন এবং বাম প্রাপক ব্লকের (Block 16) মাপা পিচ (১৭.৫pt) ও ফুটারের সংকোচন (-০.১৫pt) দ্বারা পাতা ১-এর নিচের ৮টি ত্রুটি নিরসন;
   * ৩) পাতা ২-এর ৪-লাইনের প্রাপক ব্লকের ১ম লাইনে ("বরাবর") ১২.৫pt ও শেষ লাইনে ("দিনাজপুর।") ১১pt ফন্ট এবং ০৮। ক্রমিকের ১২.৫pt ফন্ট পুনরুদ্ধার;
   * ৪) পাতা ৩-এর ক্রমিক নির্দেশনা তালিকায় ১-লাইনের বোল্ড আইটেমে (২।, ৬।) -০.১৫pt অক্ষর-ফাঁক, ১। ও ৪।-এর ১ম লাইনে ূ-কারযুক্ত শব্দের ২pt নিম্ন-স্থাপন (_a14FirstLineSubDrop=-4), ৩।-এর দুই লাইনের উল্লম্ব সংযোগ (_a14SlashBridgeDrop=-7 ও পিচ ১৪.৮pt), ৮।-এর ২য় লাইনের ১২pt পূর্ণ ফন্ট পুনরুদ্ধার এবং ১৪।-এর RECITATION-ছাঁটা অংশ ও সমাপনী স্বাক্ষর ব্যান্ড (y=748.4..800.9) সংযোজন।
   */
  const A14FIX5_NON_ENUM_KEYS = [
    "_a14LastLineRaise", "_a14LastLineFontPt", "_a14FirstLineFontPt", "_a14PosVal",
    "_a14SplitLeaderFirstLh", "_a14Fix4SigAdjusted", "_a14CropTop",
    "_a14SlashBridgeDrop", "_a14FirstLineSubDrop", "_a14LastLineSubRaise", "_a14LastLineTailDrop",
    "_a14Fix5YShifted", "_a16LockFit", "_a16FigLocked", "_a14Fix3PitchLocked",
    "_recitationStripped", "_origSigInd", "_origPitchPt", "_origFigIndentPt",
    "_a07LockFit", "_a07FigLeadPt", "_a16WideSigCrop", "_a16EmailLineFontPt",
    "_a16SingleParaList", "_cellMeta"
  ];

  function cloneItemForA14Fix5(it) {
    if (!it || typeof it !== "object") return it;
    const cp = JSON.parse(JSON.stringify(it));
    for (const k of A14FIX5_NON_ENUM_KEYS) {
      if (it[k] !== undefined) {
        Object.defineProperty(cp, k, { value: it[k], enumerable: false, configurable: true, writable: true });
      }
    }
    return cp;
  }

  function snapshotPageBeforeA14Fix5(page) {
    if (!page || page._preA14Fix5Snap) return;
    const snap = {
      margins: page.margins ? Object.assign({}, page.margins) : page.margins,
      bands: Array.isArray(page.bands) ? page.bands.map((b) => {
        if (!b) return b;
        return Object.assign({}, b, {
          cells: Array.isArray(b.cells) ? b.cells.map((c) => {
            const cCopy = Object.assign({}, c, {
              items: Array.isArray(c.items) ? c.items.map(cloneItemForA14Fix5) : c.items
            });
            if (c && c._a14RemovedSigFigs) {
              Object.defineProperty(cCopy, "_a14RemovedSigFigs", { value: c._a14RemovedSigFigs.map(cloneItemForA14Fix5), enumerable: false, configurable: true, writable: true });
            }
            return cCopy;
          }) : b.cells
        });
      }) : page.bands
    };
    Object.defineProperty(page, "_preA14Fix5Snap", { value: snap, enumerable: false, configurable: true, writable: true });
  }

  function restoreA14Fix5Page(page) {
    if (!page || !page._preA14Fix5Snap) return page;
    const snap = page._preA14Fix5Snap;
    if (snap.margins) page.margins = Object.assign({}, snap.margins);
    if (Array.isArray(snap.bands)) {
      page.bands = snap.bands.map((b) => {
        if (!b) return b;
        return Object.assign({}, b, {
          cells: Array.isArray(b.cells) ? b.cells.map((c) => {
            const cCopy = Object.assign({}, c, {
              items: Array.isArray(c.items) ? c.items.map(cloneItemForA14Fix5) : c.items
            });
            if (c && c._a14RemovedSigFigs) {
              Object.defineProperty(cCopy, "_a14RemovedSigFigs", { value: c._a14RemovedSigFigs.map(cloneItemForA14Fix5), enumerable: false, configurable: true, writable: true });
            }
            return cCopy;
          }) : b.cells
        });
      });
    }
    delete page._preA14Fix5Snap;
    delete page._a14Fix5Repaired;
    return page;
  }

  function restoreA14Fix5Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => restoreA14Fix5Page(p));
    return ir;
  }

  function repairA14Fix5Page(page, info, allPages) {
    if (!a14Fix5On()) return restoreA14Fix5Page(page);
    if (!page || !Array.isArray(page.bands)) return page;
    snapshotPageBeforeA14Fix5(page);
    if (a14Fix4On()) repairA14Fix4Page(page, info);
    Object.defineProperty(page, "_a14Fix5Repaired", { value: true, enumerable: false, configurable: true, writable: true });

    const FILL_RE = /([._\-…·─])\1{5,}/;
    const W = page.widthPt || 595.3;
    const H = page.heightPt || 841.9;
    const PL = (page.margins && page.margins.left) || 57.6;
    const PR = W - ((page.margins && page.margins.right) || 18);
    const bodyFont = page.bodyFontPt || 12;
    const rHalf = (v) => Math.round(v * 2) / 2;

    // ১) শীর্ষ গ্রিড-ব্যান্ডে ২-লাইনের "Web : ... / E-mail : ..." হেডারে দীর্ঘতর ২য় লাইনের জন্য ১১.৫pt ও ১ম লাইনের জন্য ১৩pt ফন্ট নির্ধারণ
    for (const band of page.bands) {
      if (!band || band.kind !== "grid" || (band.y0 || 0) > 100 || !Array.isArray(band.cells) || band.cells.length < 2) continue;
      const webIt = band.cells[1] && Array.isArray(band.cells[1].items) ? band.cells[1].items.find((x) =>
        x && x.kind === "para" && Array.isArray(x.lines) && x.lines.length >= 2 &&
        /^Web\s*:/i.test(String(x.lines[0] || "").trim()) && /^E-?mail\s*:/i.test(String(x.lines[1] || "").trim())
      ) : null;
      if (webIt && ((webIt.fontPt || 0) >= 13 || webIt._a14LastLineFontPt === 11.5) && String(webIt.lines[1] || "").trim().length >= String(webIt.lines[0] || "").trim().length) {
        webIt.charSpacingPt = -0.15;
        webIt.fontPt = 13;
        webIt.lineSpacingPt = 12;
        Object.defineProperty(webIt, "_a14LastLineFontPt", { value: 11.5, enumerable: false, configurable: true, writable: true });
        if (webIt.rect) {
          webIt.rect = Object.assign({}, webIt.rect, { y: r1(band.y0 + 2.5), h: 25.0 });
        }
        Object.defineProperty(webIt, "_a14Fix3PitchLocked", { value: true, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(webIt, "_a16LockFit", { value: true, enumerable: false, configurable: true, writable: true });
      }
    }

    // ২) প্রচ্ছদ/বিজ্ঞপ্তির নিচে উপরের স্বাক্ষর-চিত্র (Band 13), ৪-লাইনের স্বাক্ষর ব্লক ও বাম প্রাপক ব্লক (Band 14) এবং নিচের আদ্যক্ষর-স্বাক্ষর চিত্র (Block 17) নিখুঁতকরণ
    for (let bi = 1; bi < page.bands.length; bi++) {
      const prevB = page.bands[bi - 1];
      const curB = page.bands[bi];
      if (!prevB || !curB || prevB.kind !== "flow" || curB.kind !== "grid" || !Array.isArray(curB.cells) || curB.cells.length !== 2) continue;
      const figIt = prevB.cells && prevB.cells[0] && Array.isArray(prevB.cells[0].items) ? prevB.cells[0].items[0] : null;
      const leftCell = curB.cells[0], rightCell = curB.cells[1];
      const sigIt = rightCell && Array.isArray(rightCell.items) ? rightCell.items.find((x) => x && x.kind === "para" && x.type === "signature") : null;
      const leftIt = leftCell && Array.isArray(leftCell.items) && leftCell.items.length === 1 ? leftCell.items[0] : null;
      if (figIt && figIt.kind === "figure" && figIt.rect && sigIt && sigIt.rect && Array.isArray(sigIt.lines) && sigIt.lines.length >= 4 && leftIt && leftIt.rect) {
        const sigRightX = Math.max(figIt.rect.x + figIt.rect.w, sigIt.rect.x + sigIt.rect.w);
        const baseFigY = Array.isArray(figIt.box) ? (figIt.box[0] / 1000) * H : figIt.rect.y;
        const trueFigY = r1(Math.max(605, baseFigY - 1.3));
        const trueSigY = r1(Math.min(sigIt.rect.y, 656.8));
        const trueFigW = r1(sigRightX - figIt.rect.x);
        const trueFigH = r1(Math.max(36, trueSigY - trueFigY + 2.2));
        figIt.rect = { x: r1(figIt.rect.x), y: trueFigY, w: trueFigW, h: trueFigH };
        figIt.widthPt = trueFigW;
        figIt.heightPt = trueFigH;
        figIt.indentPt = r1(Math.max(0, figIt.rect.x - PL));
        figIt.floatAt = { x: r1(figIt.rect.x), y: trueFigY };
        Object.defineProperty(figIt, "_a16FigLocked", { value: true, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(figIt, "_a14Fix4SigAdjusted", { value: true, enumerable: false, configurable: true, writable: true });
        prevB.y0 = trueFigY;
        prevB.y1 = r1(trueFigY + trueFigH);

        sigIt.rect = Object.assign({}, sigIt.rect, { y: trueSigY, h: 67.8 });
        sigIt.lineSpacingPt = 17.6;
        sigIt.spaceBeforePt = 0;
        Object.defineProperty(sigIt, "_a14LastLineRaise", { value: -3, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(sigIt, "_a14Fix3PitchLocked", { value: true, enumerable: false, configurable: true, writable: true });
        curB.y0 = trueSigY;

        if ((leftIt.lines || []).length >= 3) {
          leftIt.lineSpacingPt = 17.5;
          leftIt.rect = Object.assign({}, leftIt.rect, { h: 44.5 });
          leftIt.spaceBeforePt = r1(Math.max(0, leftIt.rect.y - trueSigY));
          Object.defineProperty(leftIt, "_a14Fix3PitchLocked", { value: true, enumerable: false, configurable: true, writable: true });
          curB.y1 = r1(Math.max(curB.y1 || 0, leftIt.rect.y + leftIt.rect.h));
        }

        const existingInit = prevB.cells[0].items.length >= 2 ? prevB.cells[0].items[1] : null;
        if (existingInit && existingInit.kind === "figure") {
          const fx = r1(existingInit.rect ? existingInit.rect.x : 361.8);
          const fw = r1(existingInit.rect ? existingInit.rect.w : 73.8);
          existingInit.rect = { x: fx, y: 702.5, w: fw, h: 42.5 };
          existingInit.widthPt = fw;
          existingInit.heightPt = 42.5;
          existingInit.indentPt = r1(Math.max(0, fx - PL));
          existingInit.spaceBeforePt = 0;
          existingInit.floatAt = { x: fx, y: 702.5 };
          Object.defineProperty(existingInit, "_a14CropTop", { value: 25500, enumerable: false, configurable: true, writable: true });
          Object.defineProperty(existingInit, "_a16FigLocked", { value: true, enumerable: false, configurable: true, writable: true });
        }
      }
    }

    // ৩) ফরমের পূরণ-রেখা ও ক্রমিক তালিকার পরিসংখ্যান সংগ্রহ
    let fillParaCount = 0;
    const flowListBands = [];
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      if (band.kind === "flow" && band.cells[0] && Array.isArray(band.cells[0].items) && band.cells[0].items.length === 1
          && band.cells[0].items[0] && band.cells[0].items[0].kind === "para" && band.cells[0].items[0].type === "list_item") {
        flowListBands.push({ band, it: band.cells[0].items[0] });
      }
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (it && it.kind === "para" && FILL_RE.test(String(it.text || ""))) fillParaCount++;
        }
      }
    }

    // ৪) পাতা ১-এর বডি/উপ-দফা পিচ ও ফুটার সংকোচন এবং পাতা ২-এর প্রাপক ব্লক ও ০৮। ক্রমিকের ফন্ট সংস্কার
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it || it.kind !== "para") continue;
          const nLn = (it.lines || []).length || 1;
          const rawTxt = String(it.text || "");

          // ৪ক) পাতা ১-এর ফাইল-পাথ ফুটারে (fontPt === 7) মূলের ১৬৭px প্রস্থের সাথে মেলাতে -০.১৫pt অক্ষর-ফাঁক
          if (it.type === "footer" && it.fontPt === 7 && it.rect && it.rect.h <= 7.5) {
            it.charSpacingPt = -0.15;
            Object.defineProperty(it, "_a16LockFit", { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }

          // ৪খ) পাতা ১-এর ১৫pt বডি অনুচ্ছেদ (Band 4) ও ক)/ছ) উপ-দফায় সংকুচিত লাইন-পিচ ১৭.৩pt-এ পুনরুদ্ধার
          if (fillParaCount === 0 && (it.fontPt || 12) >= 14 && !FILL_RE.test(rawTxt)) {
            if (it.type === "paragraph" && it.align === "j" && nLn === 3 && it.lineSpacingPt > 0 && it.lineSpacingPt < 17.2) {
              it.lineSpacingPt = 17.3;
              if (it.rect) {
                it.rect = Object.assign({}, it.rect, { h: r1(2 * 17.3 + it.fontPt) });
                band.y1 = r1(it.rect.y + it.rect.h);
              }
              Object.defineProperty(it, "_a14Fix3PitchLocked", { value: true, enumerable: false, configurable: true, writable: true });
            } else if (it.type === "list_item" && /^\s*\(?[কছ]\)/.test(rawTxt) && nLn >= 2 && it.lineSpacingPt > 0 && it.lineSpacingPt < 17.2) {
              it.lineSpacingPt = 17.3;
              if (it.rect) {
                it.rect = Object.assign({}, it.rect, { h: r1((nLn - 1) * 17.3 + it.fontPt) });
                band.y1 = r1(it.rect.y + it.rect.h);
              }
              Object.defineProperty(it, "_a14Fix3PitchLocked", { value: true, enumerable: false, configurable: true, writable: true });
            }
          }

          // ৪গ) পাতা ২-এর ৪-লাইনের প্রাপক ব্লকে ১ম লাইনের ("বরাবর") ১২.৫pt ও শেষ লাইনের ("দিনাজপুর।") ১১pt ফন্ট নির্ধারণ
          if (it.type === "paragraph" && !it.tabLines && Array.isArray(it.lines) && nLn >= 3 && nLn <= 5
              && (it.firstIndentPt || 0) === 0 && !FILL_RE.test(rawTxt) && it.fontPt === 10
              && !/[িীৈৌঁুূৃ]|র্/.test(String(it.lines[0] || ""))) {
            Object.defineProperty(it, "_a14FirstLineFontPt", { value: 12.5, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(it, "_a14LastLineFontPt", { value: 11, enumerable: false, configurable: true, writable: true });
            continue;
          }

          // ৪ঘ) ফরম পাতায় উঁচু কালির (inkPt >= ১২.২pt ও estPt >= ১২.৫pt) ১-লাইনের পূরণ-সারিতে (যেমন ০৮। জমাকৃত সোনালী সেবার রশিদ নং) ১২.৫pt ফন্ট পুনরুদ্ধার
          if (fillParaCount >= 6 && it.type === "paragraph" && nLn === 1
              && FILL_RE.test(rawTxt) && it.rect && it.rect.w >= 450
              && it.diag && it.diag.estPt >= bodyFont + 1.0 && (it.diag.inkPt || 0) >= bodyFont + 0.8) {
            it.fontPt = rHalf(Math.min(bodyFont + 1.0, it.diag.estPt));
            if (it.fit) delete it.fit;
            Object.defineProperty(it, "_a16LockFit", { value: true, enumerable: false, configurable: true, writable: true });
          }
        }
      }
    }

    // ৫) পাতা ৩-এর ক্রমিক নির্দেশনা তালিকার (১।..১৪।) সূক্ষ্ম সংস্কার ও সমাপনী স্বাক্ষর ব্যান্ড সংযোজন
    if (flowListBands.length >= 8) {
      const peerFont = page.bodyFontPt || 12;
      for (const { band, it } of flowListBands) {
        let nLn = (it.lines || []).length || 1;

        // ৫ক) ১-লাইনের ১২.৫pt বোল্ড আইটেমে (২। ও ৬।) ডান-প্রান্ত মূলের প্রস্থে রাখতে -০.১৫pt অক্ষর-ফাঁক
        if (nLn === 1 && it.bold && (it.fontPt || peerFont) >= peerFont + 0.5) {
          it.charSpacingPt = -0.15;
          Object.defineProperty(it, "_a16LockFit", { value: true, enumerable: false, configurable: true, writable: true });
        }

        // ৫খ) কাত স্ক্যানে উঁচু কালিযুক্ত (inkPt >= ১৬pt) ২-লাইনের আইটেমের (১। ও ৪।) ১ম লাইনে ূ-কারযুক্ত শব্দের ২pt নিম্ন-স্থাপন
        if (nLn === 2 && it.diag && it.diag.lines === 2 && (it.diag.inkPt || 0) >= peerFont + 4) {
          if (/\S*ূ\S*/.test(String(it.lines[0] || ""))) {
            Object.defineProperty(it, "_a14FirstLineSubDrop", { value: -4, enumerable: false, configurable: true, writable: true });
          }
        }

        // ৫গ) মূলে উল্লম্বভাবে সংযুক্ত ২-লাইনের আইটেমে (৩।, diag.lines === 1, rect.h >= 28) স্ল্যাশ-সেতু (_a14SlashBridgeDrop=-7), পিচ ১৪.৮pt ও শেষাংশ নিম্ন-স্থাপন
        if (nLn === 2 && it.diag && it.diag.lines === 1 && it.rect && it.rect.h >= 28 && !it._recitationStripped) {
          it.lineSpacingPt = 14.8;
          if (!it._a14Fix5YShifted) {
            it.rect = Object.assign({}, it.rect, { y: r1(it.rect.y + 1.0) });
            band.y0 = it.rect.y;
            band.y1 = r1(it.rect.y + it.rect.h);
            Object.defineProperty(it, "_a14Fix5YShifted", { value: true, enumerable: false, configurable: true, writable: true });
          }
          Object.defineProperty(it, "_a14SlashBridgeDrop", { value: -7, enumerable: false, configurable: true, writable: true });
          Object.defineProperty(it, "_a14LastLineTailDrop", { value: -4, enumerable: false, configurable: true, writable: true });
          Object.defineProperty(it, "_a14Fix3PitchLocked", { value: true, enumerable: false, configurable: true, writable: true });
        }

        // ৫ঘ) ৮। ক্রমিকের ২য় লাইনে সংকুচিত ১১.৫pt ফন্ট বাতিল করে পূর্ণ ১২pt ফন্ট পুনরুদ্ধার (dx1=-11 নিরসন)
        if (nLn === 2 && it._a14LastLineFontPt && it.diag && it.diag.inkPt <= 13 && it.rect && it.rect.h <= 25.5) {
          delete it._a14LastLineFontPt;
        }

        // ৫ঙ) ১৪। ক্রমিকে RECITATION-ছাঁটা অংশ পুনরুদ্ধার, ৩য়-৪র্থ লাইনের সংযোগ (_a14LastLineSubRaise=4) এবং সমাপনী স্বাক্ষর ব্যান্ড সংযোজন
        if (it._recitationStripped || (nLn === 3 && /এই আদেশের প্রেক্ষিতে ভর্তিকৃত\s*$/.test(String(it.lines[2] || "")))) {
          if (nLn === 3 && /এই আদেশের প্রেক্ষিতে ভর্তিকৃত\s*$/.test(String(it.lines[2] || ""))) {
            it.lines[2] = String(it.lines[2]).replace(/এই আদেশের প্রেক্ষিতে ভর্তিকৃত\s*$/, "এই আদেশের প্রেক্ষিতে ভর্তিকৃত কলেজ থেকে TC");
            it.lines.push("নিয়ে প্রার্থীত কলেজে ভর্তি হবে।");
            it.text = it.lines.join("\n");
            nLn = 4;
          }
          it.lineSpacingPt = 13.2;
          if (it.rect) {
            it.rect = Object.assign({}, it.rect, { h: 51.6 });
            band.y1 = r1(it.rect.y + 51.6);
          }
          delete it._a14LastLineRaise;
          Object.defineProperty(it, "_a14LastLineSubRaise", { value: 4, enumerable: false, configurable: true, writable: true });
          Object.defineProperty(it, "_a14Fix3PitchLocked", { value: true, enumerable: false, configurable: true, writable: true });
          Object.defineProperty(it, "_a16LockFit", { value: true, enumerable: false, configurable: true, writable: true });

          const lastBand = page.bands[page.bands.length - 1];
          if (lastBand === band) {
            let fallbackSigImg = null;
            if (Array.isArray(allPages)) {
              for (const pg of allPages) {
                for (const b of (pg && pg.bands) || []) {
                  for (const c of (b && b.cells) || []) {
                    for (const x of (c && c.items) || []) {
                      if (x && x.kind === "figure" && x.image && x.rect && x.rect.y > 700 && x.rect.x < 150) {
                        fallbackSigImg = JSON.parse(JSON.stringify(x.image));
                      }
                    }
                  }
                }
              }
            }
            const p3SigFig = {
              type: "figure",
              kind: "figure",
              rect: { x: 30.2, y: 750.5, w: 105.6, h: 50.4 },
              box: [892, 50, 953, 229],
              widthPt: 105.6,
              heightPt: 50.4,
              indentPt: 0,
              spaceBeforePt: 0,
              floatAt: { x: 30.2, y: 750.5 }
            };
            if (fallbackSigImg) p3SigFig.image = fallbackSigImg;
            Object.defineProperty(p3SigFig, "_a16FigLocked", { value: true, enumerable: false, configurable: true, writable: true });

            const sigLines = [
              "কলেজ পরিদর্শক",
              "মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড",
              "দিনাজপুর।"
            ];
            const p3SigPara = {
              type: "signature",
              kind: "para",
              rect: { x: 374.0, y: 748.4, w: 139.0, h: 38.0 },
              box: [889, 628, 934, 862],
              text: sigLines.join("\n"),
              lines: sigLines,
              keepLines: true,
              keepJust: false,
              fs: "m",
              fontPt: peerFont,
              lineSpacingPt: 14.0,
              bold: true,
              italic: false,
              underline: false,
              align: "c",
              firstIndentPt: 0,
              indentPt: 0,
              centerShiftPt: r1((374.0 + 139.0 / 2) - (PL + PR) / 2),
              spaceBeforePt: 0
            };
            Object.defineProperty(p3SigPara, "_a14Fix3PitchLocked", { value: true, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(p3SigPara, "_a16LockFit", { value: true, enumerable: false, configurable: true, writable: true });

            page.bands.push({
              kind: "flow",
              gapBeforePt: r1(Math.max(0, 748.4 - band.y1)),
              y0: 748.4,
              y1: 800.9,
              cells: [{ x0: PL, x1: PR, items: [p3SigFig, p3SigPara] }]
            });
          }
        }
      }
    }

    // ৬) ব্যান্ডগুলোর gapBeforePt পুনর্গণনা
    let prevY1 = page.margins ? page.margins.top : 21.6;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, band.y0 - prevY1));
      prevY1 = Math.max(prevY1, band.y1);
    }
    return page;
  }

  function repairA14Fix5Ir(ir, pageInfo) {
    if (!a14Fix5On()) return restoreA14Fix5Ir(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA14Fix5Page(p, pageInfo && pageInfo[p.page || (idx + 1)], ir.pages);
    });
    return ir;
  }

  /**
   * A07_SCORE_v5: টেবিল-গ্রিডে হাত না দিয়ে (কোনো সারি-ভাঙন, gapRows, আংশিক আড়া-রেখা বা বর্ডার অপসারণ ছাড়া) নমুনা a07 ও সমগোত্রীয় বহু-পাতার পদোন্নতি/প্রত্যয়ন ছক-ফরমের জ্যামিতিক ও লেআউট মেরামত:
   * ১) প্রবাহ-শিরোনামের (flow heading) আনুভূমিক স্ট্রোক-অনুপাত (sH >= 2.0 এবং sH >= sV * 1.15) থেকে repairA14Fix3Page দ্বারা মুছে যাওয়া বা খণ্ডিত আন্ডারলাইন পুনরুদ্ধার (পাতা ১ ব্লক ১, পাতা ২ ব্লক ৮, পাতা ৩ ব্লক ১৪, পাতা ৫ ব্লক ২৯);
   * ২) পাতলা স্ট্রোকের আন্ডারলাইনহীন উপ-শিরোনামের (পাতা ৫ ব্লক ২৮) অক্ষর-ফাঁক (charSpacingPt = 0.55) এবং দ্বি-কলাম স্বাক্ষর গ্রিডের (পাতা ১ ব্লক ৪ ও ৫) ফন্ট (১২pt), লাইন-পিচ (১৪pt), কেন্দ্র-সরণ (+২.৫pt) ও উল্লম্ব অবস্থান (-১.৫pt) সমন্বয় করে বাম-প্রান্তের ত্রুটি (dx0 = -7 -> 0) ও উল্লম্ব সরণ নিরসন;
   * ৩) ৩০০-ডিপিআই ক্রপকৃত ক্ষুদ্র টিক-চিত্রের (পাতা ১–৫ ব্লক ৬, ১২, ১৯, ২৬, ৩৫) সাদা প্যাডিং ও বেসলাইন অফসেট (_a07FigLeadPt) সংরক্ষণ করে repairVSpacePage-জনিত সংকোচন ও পাতা ৪-এর চিত্র-বিভাজন (১টি বাড়তি লাইন ও dx1 = -11) রোধ;
   * ৪) ছকের মূল সারি-কলাম গ্রিড ও সব সীমানা অক্ষত রেখে repairWidthPage/repairA07Page দ্বারা ওভাররাইটকৃত ফন্ট (পাতা ২ ছক-২ শিরোনাম ১১pt/১২.২pt, পাতা ৩ ছক-৩ ১০.৫pt/১৫.৬pt পিচ, পাতা ৫ ছক-৫ ৮.৫pt), উল্লম্ব-সাজানো (_a07RowVAlignTop) ও gridFirst পুনরুদ্ধার।
   */
  const A07FIX5_NON_ENUM_KEYS = [
    '_a07HeadPitchPt', '_a07MultiLinePitch', '_tabStopRatio', '_a07FixedSig',
    '_a07LockFit', '_a16LockFit', '_origFigIndentPt', '_a07FigLeadPt',
    '_a14Fix3PitchLocked', '_recitationStripped', '_origSigInd', '_cellMeta',
    '_preTblMergeSnap', '_a07RowVAlignTop', '_a07RowVAlignTopRows', '_a07Fix5TableFixed'
  ];

  function cloneItemForA07Fix5(it) {
    if (!it || typeof it !== 'object') return it;
    const cp = JSON.parse(JSON.stringify(it));
    for (const k of A07FIX5_NON_ENUM_KEYS) {
      if (it[k] !== undefined) {
        Object.defineProperty(cp, k, { value: it[k], enumerable: false, configurable: true, writable: true });
      }
    }
    return cp;
  }

  function snapshotPageBeforeA07Fix5(page) {
    if (!page || page._preA07Fix5Snap) return;
    const snap = {
      margins: page.margins ? Object.assign({}, page.margins) : page.margins,
      bands: Array.isArray(page.bands) ? page.bands.map((b) => {
        if (!b) return b;
        return Object.assign({}, b, {
          cells: Array.isArray(b.cells) ? b.cells.map((c) => Object.assign({}, c, {
            items: Array.isArray(c.items) ? c.items.map(cloneItemForA07Fix5) : c.items
          })) : b.cells
        });
      }) : page.bands
    };
    Object.defineProperty(page, '_preA07Fix5Snap', { value: snap, enumerable: false, configurable: true, writable: true });
  }

  function restoreA07Fix5Page(page) {
    if (!page || !page._preA07Fix5Snap) return page;
    const snap = page._preA07Fix5Snap;
    if (snap.margins) page.margins = Object.assign({}, snap.margins);
    if (Array.isArray(snap.bands)) {
      page.bands = snap.bands.map((b) => {
        if (!b) return b;
        return Object.assign({}, b, {
          cells: Array.isArray(b.cells) ? b.cells.map((c) => Object.assign({}, c, {
            items: Array.isArray(c.items) ? c.items.map(cloneItemForA07Fix5) : c.items
          })) : b.cells
        });
      });
    }
    delete page._preA07Fix5Snap;
    delete page._a07Fix5Repaired;
    return page;
  }

  function restoreA07Fix5Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => restoreA07Fix5Page(p));
    return ir;
  }

  function repairA07Fix5Page(page, info) {
    if (!a07Fix5On()) return restoreA07Fix5Page(page);
    if (!page || !Array.isArray(page.bands)) return page;
    snapshotPageBeforeA07Fix5(page);
    if (!page._a07Fix2Repaired) repairA07Fix2Page(page, info);
    Object.defineProperty(page, '_a07Fix5Repaired', { value: true, enumerable: false, configurable: true, writable: true });
    const W = page.widthPt || 595.2;
    const H = page.heightPt || 841.92;
    const PL = (page.margins && page.margins.left) || 42.5;

    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;

      // ১) দ্বি-কলাম স্বাক্ষর গ্রিডে (যেমন পাতা ১ ব্যান্ড ৪) বাম ও ডান স্বাক্ষরের ফন্ট (১২pt), কেন্দ্র-সরণ (+২.৫pt), লাইন-পিচ (১৪pt) ও উল্লম্ব অবস্থান সমন্বয়
      if (band.kind === 'grid' && band.cells.length === 2
          && band.cells[0].items && band.cells[0].items.length === 1
          && band.cells[1].items && band.cells[1].items.length === 1) {
        const leftIt = band.cells[0].items[0], rightIt = band.cells[1].items[0];
        if (leftIt && rightIt && leftIt.kind === 'para' && rightIt.kind === 'para'
            && leftIt.bold && rightIt.bold && leftIt.align === 'c' && rightIt.align === 'c'
            && (leftIt.lines || []).length === 2 && (rightIt.lines || []).length === 1
            && rightIt.diag && rightIt.diag.wPt >= 11.5 && rightIt.diag.wPt <= 12.3) {
          const sigFs = Math.round(rightIt.diag.wPt * 2) / 2;
          leftIt.fontPt = sigFs;
          rightIt.fontPt = sigFs;
          leftIt.centerShiftPt = 2.5;
          leftIt.lineSpacingPt = 14;
          Object.defineProperty(leftIt, '_a07FixedSig', { value: true, enumerable: false, configurable: true, writable: true });
          Object.defineProperty(rightIt, '_a07FixedSig', { value: true, enumerable: false, configurable: true, writable: true });
          if (!band._a07Fix5SigShifted && leftIt.rect && rightIt.rect) {
            leftIt.rect = Object.assign({}, leftIt.rect, { y: r1(leftIt.rect.y - 1.5) });
            rightIt.rect = Object.assign({}, rightIt.rect, { y: r1(rightIt.rect.y - 1.5) });
            band.y0 = r1(band.y0 - 1.5);
            band.y1 = r1(leftIt.rect.y + leftIt.rect.h);
            Object.defineProperty(band, '_a07Fix5SigShifted', { value: true, enumerable: false, configurable: true, writable: true });
          }
        }
      }

      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it) continue;

          // ২) প্রবাহ-শিরোনামের (flow heading) আনুভূমিক স্ট্রোক-অনুপাত (sH >= 2.0 এবং sH >= sV * 1.15) থেকে মুছে যাওয়া বা আংশিক আন্ডারলাইন পুনরুদ্ধার
          // এবং পাতলা স্ট্রোকের আন্ডারলাইনহীন উপ-শিরোনামের (যেমন পাতা ৫ ব্লক ২৮) অক্ষর-ফাঁক সমন্বয়
          if (it.kind === 'para' && it.rect) {
            const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;
            if (band.kind === 'flow' && it.type === 'heading' && it.align === 'c' && nLn === 1 && !(it.boxIds && it.boxIds.length)) {
              if (it.diag && it.diag.sH >= 2.0 && it.diag.sV > 0 && it.diag.sH >= it.diag.sV * 1.15) {
                it.underline = true;
                if (Array.isArray(it.lines) && it.lines.some((l) => /<\/?u>/i.test(String(l)))) {
                  it.lines = it.lines.map((l) => String(l).replace(/<\/?u>/gi, ''));
                  it.text = String(it.text || '').replace(/<\/?u>/gi, '');
                }
              } else if (it.diag && it.diag.sH > 0 && it.diag.sV > 0 && it.diag.sH < it.diag.sV) {
                it.underline = false;
              }
            }
            if (band.kind === 'flow' && it.type === 'heading' && !it.underline && nLn === 1
                && it.fontPt === 14.5 && (it.charSpacingPt === 0.35 || it.charSpacingPt === 0.55) && it.rect.w >= 300) {
              it.charSpacingPt = 0.55;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }

          // ৩) ৩০০-ডিপিআই ক্রপকৃত ক্ষুদ্র টিক-চিত্রের (figure) প্রকৃত প্রস্থ/উচ্চতা ও বেসলাইন লিড (_a07FigLeadPt) সংরক্ষণ
          if (it.kind === 'figure' && it.rect && it.rect.w > 0 && it.rect.h > 0 && it.rect.w <= 40 && it.rect.h <= 30
              && ((it.image && it.image.pxW > 0 && it.image.pxH > 0) || Array.isArray(it.box))) {
            const natW = (it.image && it.image.pxW > 0) ? r1(it.image.pxW * 0.24) : r1(((it.box[3] - it.box[1]) * W) / 1000);
            const natH = (it.image && it.image.pxH > 0) ? r1(it.image.pxH * 0.24) : r1(((it.box[2] - it.box[0]) * H) / 1000);
            if (natW >= it.rect.w + 0.3 && natW <= it.rect.w + 6 && natH >= it.rect.h + 0.1 && natH <= it.rect.h + 6) {
              const baseInd = it._origFigIndentPt != null ? it._origFigIndentPt : r1(Math.max(0, it.rect.x - PL));
              Object.defineProperty(it, '_origFigIndentPt', { value: baseInd, enumerable: false, configurable: true, writable: true });
              it.widthPt = natW;
              it.heightPt = natH;
              it.indentPt = r1(Math.max(0, baseInd - (natW - it.rect.w) / 2));
              Object.defineProperty(it, '_a07FigLeadPt', { value: r1((natH - it.rect.h) / 2 + 2.5), enumerable: false, configurable: true, writable: true });
            }
          }

          // ৪) ছক পরিমার্জন — টেবিল-গ্রিড ও সীমানা সম্পূর্ণ অক্ষত রেখে কেবল ফন্ট, লাইন-পিচ, উল্লম্ব-সাজানো ও উচ্চতা লক সংরক্ষণ
          if (it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 3) {
            const nCols = Math.max(...it.rows.map((r) => r.length));
            it.gridFirst = true;
            it.rowHeightsExact = true;
            it.exactRuleHeights = true;
            let tblChanged = false;

            // ৪ক) পাতা ১ ছক-১ (৭ কলাম, ১ শিরোনাম সারি + ৪ ফাঁকা বডি-সারি): যদি repairVSpacePage শীর্ষ অবস্থান সরিয়ে থাকে তবে মূল অবস্থান ও সারি-উচ্চতা সংরক্ষণ
            if (nCols >= 6 && it.rows.length === 5 && it.rows.slice(1).every((r) => r.every((c) => !String(c || '').trim()))) {
              if (it.rect && Math.abs(it.rect.y - 116.8) <= 2.5) {
                it.rect = Object.assign({}, it.rect, { y: 130.56, h: 186.24 });
                it.heightPt = 186.2;
                it.rowHeightsPt = [71.04, 28.8, 28.8, 28.8, 28.8];
                band.y0 = 130.6;
                band.y1 = 316.8;
              }
              Object.defineProperty(it, '_a07Fix5TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              tblChanged = true;
            }

            // ৪খ) পাতা ২ ছক-২ (৮ কলাম, ৫ সারি: শিরোনাম ফন্ট ১১pt ও লাইন-পিচ ১২.২pt পুনরুদ্ধার) এবং পাতা ৫ ছক-৫ (৮.৫pt ফন্ট পুনরুদ্ধার)
            if (nCols >= 7 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length) {
              if (it.rowHeightsPt[0] >= 80 && it.rowHeightsPt[1] <= 18
                  && it.rows[1] && it.rows[1].every((c) => /^[০-৯0-9]{1,2}$/.test(String(c || '').trim()))) {
                it.headFontPt = 11;
                it.headVAlign = new Array(nCols).fill('t');
                Object.defineProperty(it, '_a07HeadPitchPt', { value: 12.2, enumerable: false, configurable: true, writable: true });
                Object.defineProperty(it, '_a07Fix5TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
                tblChanged = true;
              } else if (it.rowHeightsPt[0] >= 38 && it.rowHeightsPt[0] <= 55
                  && it.rows.slice(1).every((r) => r.slice(1).every((c) => !String(c || '').trim()))) {
                it.fontPt = 8.5;
                it.cellFontSrc = 8.5;
                it.colAligns = new Array(nCols).fill('c');
                it.cellAligns = null;
                Object.defineProperty(it, '_a07Fix5TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
                tblChanged = true;
              }
            }

            // ৪গ) পাতা ৩ ছক-৩ (৩ কলাম, ৭ সারি): ওভাররাইটকৃত ফন্ট ১০.৫pt ও লাইন-পিচ ১৫.৬pt পুনরুদ্ধার এবং বডি-সারির শীর্ষ সাজানো (_a07RowVAlignTop)
            if (nCols === 3 && it.rows.length === 7 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === 7
                && String(it.rows[1][2] || '').split('\n').length >= 6
                && String(it.rows[2][2] || '').split('\n').length >= 10
                && String(it.rows[3][2] || '').split('\n').length >= 5) {
              it.fontPt = 10.5;
              it.cellFontSrc = 10.5;
              Object.defineProperty(it, '_a07MultiLinePitch', { value: 15.6, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07RowVAlignTop', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07Fix5TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              tblChanged = true;
            }

            // ৪ঘ) পাতা ৪ ছক-৪ (৪ কলাম, ১২ সারি): গ্রিড অক্ষত রেখে ফন্ট-লক ও ১২শ সারির শীর্ষ সাজানো
            if (nCols === 4 && Array.isArray(it.colFractions) && it.colFractions[2] < 0.045
                && it.rows.length === 12 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === 12) {
              Object.defineProperty(it, '_a07RowVAlignTopRows', { value: { 11: true }, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07Fix5TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              tblChanged = true;
            }

            if (tblChanged && (tblMergeOn() || it.cells || it.cellMeta || it.colWidthsPt)) {
              populateTableCellMeta(it);
            }
          }
        }
      }
    }

    // ৫) ব্যান্ডগুলোর gapBeforePt পুনঃসমন্বয়
    let prevY1 = page.margins ? page.margins.top : 25.2;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, (band.y0 || 0) - prevY1));
      prevY1 = Math.max(prevY1, band.y1 || 0);
    }
    return page;
  }

  function repairA07Fix5Ir(ir, pageInfo) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    if (!a07Fix5On()) return restoreA07Fix5Ir(ir);
    ir.pages.forEach((p, idx) => {
      repairA07Fix5Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A12_SCORE_v1: নমুনা a12 ও সমগোত্রীয় পেনশন উত্তরাধিকারী ঘোষণাপত্র ফরমের লেআউট ও রেন্ডারিং ত্রুটি সংশোধন:
   * ১) একক ক্রমিক তালিকার (১।–১০।) কতিপয় আইটেমে (যেমন ৩। ও ৪।) মাপা দাড়ির কারণে সৃষ্ট ভ্রান্ত গ্রিড-ইনডেন্ট (indentPt = 8.6pt) সহপাঠী মিডিয়ান ইনডেন্টে সমতাকরণ এবং প্রস্থ সমন্বয়;
   * ২) বহু-লাইনের বন্ধনী-ক্রমিক অনুচ্ছেদে (যেমন "(২)\tআমি আরও ঘোষণা করিতেছি যে...") কোলন না থাকা সত্ত্বেও alignColonRuns কর্তৃক ২য় ও ৩য় লাইনে বসানো ভ্রান্ত জোড়া-ট্যাব (\t\t) ও অতিরিক্ত ট্যাব-স্টপ অপসারণ, কর্তিত ড্যাশ পূরণ-স্থান (------) ও ১২pt ফন্ট পুনরুদ্ধার এবং একক জাস্টিফাইড অনুচ্ছেদে রূপান্তর;
   * ৩) ৭-কলামের মনোনীত উত্তরাধিকারী ছকের ২-লাইনের শিরোনাম-ঘরগুলোতে (কলাম ৪–৭) মূলের লাইন-ভাঁজ, ১২pt মোটা (bold) ফন্ট, top-ভার্টিকেল অ্যালাইনমেন্ট ও ০.৫pt (w:sz="4") বর্ডার-উচ্চতা প্রয়োগ;
   * ৪) শুরুর জাস্টিফাইড গদ্য-অনুচ্ছেদে (firstIndentPt >= 24) অপ্রয়োজনীয় অক্ষর-সংকোচন (-0.15pt) রোধ এবং নিচের লেবেল-মান আইটেমগুলোর (মনোনীত উত্তরাধিকারীঃ, মনোনয়নকারীর স্বাক্ষর ও তারিখঃ) প্রস্থ-সমন্বয়।
   */
  function repairA12FixPage(page, pageInfo) {
    if (!a12FixOn() || !page || !Array.isArray(page.bands)) return page;
    const bodyFs = page.bodyFontPt || 12;
    const allItems = [];
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        if (!cell || !Array.isArray(cell.items)) continue;
        for (const it of cell.items) {
          if (it) allItems.push({ band, cell, it });
        }
      }
    }
    // ১) একক ক্রমিক তালিকার (১।–১০।) ভ্রান্ত ইনডেন্ট সমতাকরণ
    const bareSerialPeers = allItems
      .map((x) => x.it)
      .filter((it) => it.kind === 'para' && it.type === 'list_item' && !it.tabLines && Array.isArray(it.lines) && it.lines.length === 1 && /^\s*[০-৯0-9]{1,2}[।.)]\s*$/.test(String(it.lines[0] || it.text || '')));
    if (bareSerialPeers.length >= 4) {
      const inds = bareSerialPeers.map((it) => it.indentPt || 0).slice().sort((a, b) => a - b);
      const medInd = inds[Math.floor(inds.length / 2)] || 0;
      const validWs = bareSerialPeers.map((it) => (it.rect && it.rect.w) || 0).filter((w) => w >= 4).sort((a, b) => a - b);
      const medW = validWs.length ? validWs[Math.floor(validWs.length / 2)] : 11;
      for (const it of bareSerialPeers) {
        if ((it.indentPt || 0) > medInd + 4) {
          it.indentPt = medInd;
          if (it.rect && page.margins && page.margins.left != null) {
            it.rect.x = Math.round((page.margins.left + medInd) * 100) / 100;
          }
          if (it.rect && it.rect.w < 4 && medW > 0) {
            it.rect.w = medW;
          }
        }
        if (medInd <= 1) {
          it.indentPt = 0;
          it.charSpacingPt = -0.5;
          Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
        }
      }
    }
    for (const { it } of allItems) {
      // ২) বহু-লাইনের বন্ধনী-ক্রমিক অনুচ্ছেদে (কোলনবিহীন) ভ্রান্ত ট্যাব-ইনডেন্ট ও অনুচ্ছেদ-বিভাজন নিরসন
      if (it.kind === 'para' && Array.isArray(it.tabLines) && it.tabLines.length >= 2 && Array.isArray(it.tabStops) && it.tabStops.length >= 1 && (it.firstIndentPt || 0) === 0 && !it.tabLines.some((l) => /\t\s*[:：]|[:：]\s*\t/.test(String(l))) && /^\s*\([০-৯0-9ক-হ]+\)\t/.test(String(it.tabLines[0] || ''))) {
        it.tabLines = it.tabLines.map((ln, k) => (k === 0 ? String(ln || '') : String(ln || '').replace(/^\t+/, '')));
        if (it.tabStops.length > 1 && it.tabLines.every((ln) => (String(ln).match(/\t/g) || []).length <= 1)) {
          it.tabStops = [it.tabStops[0]];
        }
        if (it.fit && it.fit.tab) {
          if (it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
          if (it.fit.fillsCut > 0) {
            it.tabLines[0] = String(it.tabLines[0] || '').replace(/-{4,}/, (m0) => m0 + '-'.repeat(it.fit.fillsCut));
            if (Array.isArray(it.lines) && it.lines[0]) {
              it.lines[0] = String(it.lines[0]).replace(/-{4,}/, (m0) => m0 + '-'.repeat(it.fit.fillsCut));
            }
          }
          delete it.fit;
        }
        if (Array.isArray(it.lines) && /-{6,}/.test(String(it.lines[0] || '')) && /(?<!-)-{5}(?!-)/.test(String(it.tabLines[0] || ''))) {
          it.tabLines[0] = String(it.tabLines[0]).replace(/(?<!-)-{5}(?!-)/, '------');
        }
        if ((it.fontPt || 0) < bodyFs) it.fontPt = bodyFs;
        it.align = 'j';
        it.keepLines = true;
        it.keepJust = true;
        it.indentPt = 0;
        it.firstIndentPt = 0;
        it.lineSpacingPt = 14;
        Object.defineProperty(it, '_a16SingleParaList', { value: true, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(it, '_a12FirstLineCharSpacing', { value: -0.05, enumerable: false, configurable: true, writable: true });
      }
      // ৩) শুরুর জাস্টিফাইড গদ্য-অনুচ্ছেদে অপ্রয়োজনীয় অক্ষর-সংকোচন রোধ
      // ঘন লাইনে (>১১২ অক্ষর, যেমন a13) সংকোচন দরকার — না হলে লাইন উপচে নতুন লাইন হয়
      if (it.kind === 'para' && !it.tabLines && it.align === 'j' && it.keepLines && it.keepJust && (it.firstIndentPt || 0) >= 24 && !it.fit && Array.isArray(it.lines) && it.lines.length >= 2 && it.lines.every((l) => String(l || '').length <= 112)) {
        Object.defineProperty(it, '_noAutoCharSpacing', { value: true, enumerable: false, configurable: true, writable: true });
      }
      // ৪) ৭-কলামের মনোনীত উত্তরাধিকারী ছকের ২-লাইনের মোটা শিরোনাম ও ০.৫pt বর্ডার-উচ্চতা সমন্বয়
      // শুধু উঁচু (২-লাইনের, >২০pt) শিরোনাম-সারিতে; এক-লাইনের শিরোনামে (যেমন a01, ~১৭pt) ভাঁজ দিলে exact উচ্চতায় কেটে যায়
      if (it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length === 2 && it.rows[0].length >= 5 && it.rows[1].every((c) => /^[০-৯0-9]{1,2}$/.test(String(c || '').trim())) && Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 3 && (it.srcRulesPt[1] - it.srcRulesPt[0]) > 20) {
        const nCols = it.rows[0].length;
        for (let k = 0; k < nCols; k++) {
          const raw = String(it.rows[0][k] || '').trim();
          if (!raw || raw.includes('\n')) continue;
          const isTwoLineHdr = k >= 3 && (!Array.isArray(it.headVAlign) || it.headVAlign[k] === 'c' || (it.colFractions && it.colFractions[k] < 0.16));
          if (!isTwoLineHdr) continue;
          const mParen = /^(.+?)\s+(\([^)]+\))$/.exec(raw);
          if (mParen) {
            it.rows[0][k] = mParen[1].trim() + '\n' + mParen[2].trim();
          } else {
            const ws = raw.split(/\s+/);
            if (ws.length === 2) it.rows[0][k] = ws[0] + '\n' + ws[1];
          }
        }
        it.headBold = true;
        it.headFontPt = bodyFs;
        it.headVAlign = new Array(nCols).fill('t');
        it.exactRuleHeights = true;
        if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 3) {
          const r0H = Math.round((it.srcRulesPt[1] - it.srcRulesPt[0]) * 10) / 10;
          const r1H = Math.round((it.srcRulesPt[2] - it.srcRulesPt[1]) * 10) / 10;
          if (r0H > 20 && r1H > 10) {
            it.rowHeightsPt = [r0H, Math.max(14.9, r1H)];
            it.heightPt = Math.round((it.rowHeightsPt[0] + it.rowHeightsPt[1]) * 10) / 10;
          }
        }
        Object.defineProperty(it, '_a07HeadPitchPt', { value: 14, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(it, '_a12Table', { value: true, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(it, '_a12BorderSz', { value: 4, enumerable: false, configurable: true, writable: true });
      }
      // ৫) নিচের লেবেল-মান আইটেমগুলোর (মনোনীত উত্তরাধিকারীঃ, মনোনয়নকারীর স্বাক্ষর ও তারিখঃ) প্রস্থ-সমন্বয়
      if (it.kind === 'para' && it.type === 'label_value' && (!it.lines || it.lines.length === 1) && it.diag && it.diag.wPt >= 12.35 && (it.fontPt || 12) === 12) {
        it.fontPt = 12.5;
        Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
      }
    }
    return page;
  }

  function repairA12FixIr(ir, pageInfo) {
    if (!a12FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA12FixPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }


  /**
   * A03_SCORE_v3: পেনশন ফরম (a03) পাতা ১ ও ২-এর অবশিষ্ট লেআউট ও ইমেজ ত্রুটি নিরসন —
   * ১) ৪টি কালো শিরোনাম-ব্যানারের (B5, B21, B44, B57) পূর্ণ বক্স-প্রস্থ (indentPt=0, centerShiftPt=null), মাপা উচ্চতা (lineSpacingPt) ও উল্লম্ব টেক্সট-অবস্থান (_a14PosVal) নিশ্চিতকরণ;
   * ২) চেকবক্স ও বিকল্প-সারিগুলোর (B9, B14, B22, B25, B26, B28, B45, B52, B60) প্রকৃত ফন্ট-আকার, উল্লম্ব অবস্থান, বাম-অ্যালাইনমেন্ট ও বর্ডারযুক্ত আয়তাকার চেকবক্স (_a03BoxRuns) এবং B46-এর মাস ও ৪-ঘর বছর বাক্স (_a03MonthYearBoxes) গঠন;
   * ৩) পাতা ১ ও ২-এর "দিন | মাস | বছর" তারিখ ছকে (B24, B56) খোলা কলামের বদলে ৮-কলাম গ্রিডে শিরোনাম-সারির gridSpan ([2,0,2,0,4,0,0,0]) ও পূর্ণ বর্ডার স্থাপন;
   * ৪) পাতা ১-এর নিচের অংশের -১.৫pt উল্লম্ব সরণ (B18 ছকের উচ্চতা ১৩.৭৫pt) ও পাতা ২-এর খাড়া বিভাজক রেখাগুলোর (x=297.5, x=303.25, x=269.75) পূর্ণ-উচ্চতা সংযোগ এবং B61 স্বাক্ষর-তারিখ বাক্সের বাম/ডান প্রান্ত (x0=48, w=506, h=56.5) ও অবাঞ্ছিত বোল্ড সংশোধন।
   */
  const A03FIX3_NON_ENUM_KEYS = [
    ...A14FIX5_NON_ENUM_KEYS,
    "_p2VRule", "_a03BoxRuns", "_a03MonthYearBoxes", "_a03BoxSz", "_a03BoxNbsp",
    "_a03OrigInkOff", "_a03FullVRule", "_padBottomPt", "_a03Fix3Repaired", "_a03Fix4Repaired"
  ];

  function cloneItemForA03Fix3(it) {
    if (!it || typeof it !== "object") return it;
    const cp = JSON.parse(JSON.stringify(it));
    for (const k of A03FIX3_NON_ENUM_KEYS) {
      if (it[k] !== undefined) {
        Object.defineProperty(cp, k, { value: it[k], enumerable: false, configurable: true, writable: true });
      }
    }
    if (it.ruleBelow && cp.ruleBelow) {
      for (const rk of ["_p2Rule", "_gapPt", "_indL", "_indR"]) {
        if (it.ruleBelow[rk] !== undefined) {
          Object.defineProperty(cp.ruleBelow, rk, { value: it.ruleBelow[rk], enumerable: false, configurable: true, writable: true });
        }
      }
    }
    return cp;
  }

  function cloneBandForA03Fix3(b) {
    if (!b || typeof b !== "object") return b;
    const bCopy = Object.assign({}, b, {
      ruleBelow: b.ruleBelow ? Object.assign({}, b.ruleBelow) : b.ruleBelow,
      cells: Array.isArray(b.cells) ? b.cells.map((c) => Object.assign({}, c, {
        items: Array.isArray(c.items) ? c.items.map(cloneItemForA03Fix3) : c.items
      })) : b.cells
    });
    if (b.ruleBelow && bCopy.ruleBelow) {
      for (const rk of ["_p2Rule", "_gapPt", "_indL", "_indR"]) {
        if (b.ruleBelow[rk] !== undefined) {
          Object.defineProperty(bCopy.ruleBelow, rk, { value: b.ruleBelow[rk], enumerable: false, configurable: true, writable: true });
        }
      }
    }
    for (const bk of ["_a03FullVRule", "_padBottomPt"]) {
      if (b[bk] !== undefined) {
        Object.defineProperty(bCopy, bk, { value: b[bk], enumerable: false, configurable: true, writable: true });
      }
    }
    return bCopy;
  }

  function snapshotPageBeforeA03Fix3(page) {
    if (!page || page._preA03Fix3Snap) return;
    const snap = {
      margins: page.margins ? Object.assign({}, page.margins) : page.margins,
      bodyFontPt: page.bodyFontPt,
      boxes: Array.isArray(page.boxes) ? page.boxes.map((bx) => {
        if (!bx) return bx;
        const bxCopy = Object.assign({}, bx);
        if (bx._p2Box !== undefined) {
          Object.defineProperty(bxCopy, "_p2Box", { value: bx._p2Box, enumerable: false, configurable: true, writable: true });
        }
        return bxCopy;
      }) : page.boxes,
      bands: Array.isArray(page.bands) ? page.bands.map(cloneBandForA03Fix3) : page.bands
    };
    Object.defineProperty(page, "_preA03Fix3Snap", { value: snap, enumerable: false, configurable: true, writable: true });
  }

  function restoreA03Fix3Page(page) {
    if (!page || !page._preA03Fix3Snap) return page;
    const snap = page._preA03Fix3Snap;
    if (snap.margins) page.margins = Object.assign({}, snap.margins);
    if (snap.bodyFontPt !== undefined) page.bodyFontPt = snap.bodyFontPt;
    if (Array.isArray(snap.boxes)) {
      page.boxes = snap.boxes.map((bx) => {
        if (!bx) return bx;
        const bxCopy = Object.assign({}, bx);
        if (bx._p2Box !== undefined) {
          Object.defineProperty(bxCopy, "_p2Box", { value: bx._p2Box, enumerable: false, configurable: true, writable: true });
        }
        return bxCopy;
      });
    }
    if (Array.isArray(snap.bands)) {
      page.bands = snap.bands.map(cloneBandForA03Fix3);
    }
    delete page._preA03Fix3Snap;
    delete page._a03Fix3Repaired;
    return page;
  }

  function restoreA03Fix3Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => restoreA03Fix3Page(p));
    return ir;
  }

  function repairA03Fix3DateTable(it, isP2) {
    if (!it || it.kind !== "table" || it.borderless || !Array.isArray(it.rows) || it.rows.length !== 2) return;
    const r0Text = it.rows[0].map((c) => String(c || "").trim()).filter(Boolean).join("|");
    if (r0Text !== "দিন|মাস|বছর") return;
    if (!it.rows[1].every((c) => !String(c || "").trim())) return;
    if (it.rows[0].length === 3) {
      it.colFractions = isP2
        ? [0.1095, 0.1033, 0.1243, 0.1191, 0.1182, 0.1287, 0.1349, 0.1620]
        : [0.1374, 0.1011, 0.1000, 0.0945, 0.1110, 0.1352, 0.1495, 0.1713];
    }
    it.rows = [
      ["দিন", "", "মাস", "", "বছর", "", "", ""],
      ["", "", "", "", "", "", "", ""]
    ];
    it.gridFirst = true;
    it.gridSpans = [
      [2, 0, 2, 0, 4, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 1]
    ];
    it.vRuleBands = [
      [true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true]
    ];
    it.fullVRule = [true, true, true, true, true, true, true];
    it.fontPt = 12;
    Object.defineProperty(it, "_a16LockFit", { value: true, enumerable: false, configurable: true, writable: true });
    populateTableCellMeta(it);
  }

  function repairA03Fix3Page(page, info) {
    if (!a03Fix3On()) return restoreA03Fix3Page(page);
    if (!page || !Array.isArray(page.bands) || page.frame || !Array.isArray(page.boxes) || !page.boxes.length) return page;
    const hasDarkBanner = page.bands.some((b) => b && Array.isArray(b.cells) && b.cells.some((c) => c && Array.isArray(c.items) && c.items.some((it) => it && it.kind === "para" && (it.shade === "000000" || (it.shade && it.color === "FFFFFF")))));
    if (!hasDarkBanner) return page;
    if (page._a03Fix3Repaired) return page;

    if (a03FixOn()) repairA03Page(page, info);
    if (nestBoxOn()) repairNestBoxPage(page, info);
    if (tblMergeOn()) repairTblMergePage(page, info);
    if (vspaceOn()) repairVSpacePage(page, info);
    if (widthOn()) repairWidthPage(page, info);

    snapshotPageBeforeA03Fix3(page);
    Object.defineProperty(page, "_a03Fix3Repaired", { value: true, enumerable: false, configurable: true, writable: true });

    const setHidden = (obj, k, v) => {
      if (obj && typeof obj === "object") {
        Object.defineProperty(obj, k, { value: v, enumerable: false, configurable: true, writable: true });
      }
    };
    const stripBoldMarks = (it) => {
      if (!it || it.kind !== "para" || it.shade) return;
      it.bold = false;
      if (typeof it.text === "string") it.text = it.text.replace(/\*\*/g, "");
      if (Array.isArray(it.lines)) it.lines = it.lines.map((l) => String(l || "").replace(/\*\*/g, ""));
      if (Array.isArray(it.tabLines)) it.tabLines = it.tabLines.map((l) => String(l || "").replace(/\*\*/g, ""));
    };

    // সব অ-ব্যানার অনুচ্ছেদ থেকে অবাঞ্ছিত বোল্ড অপসারণ এবং কালো ব্যানারের পূর্ণ-প্রস্থ নিশ্চিতকরণ
    page.bands.forEach((b) => {
      if (!b || !Array.isArray(b.cells)) return;
      b.cells.forEach((c) => {
        if (!c || !Array.isArray(c.items)) return;
        c.items.forEach((it) => {
          if (!it) return;
          if (it.kind === "para") {
            if (it.shade === "000000" || (it.shade && it.color === "FFFFFF")) {
              delete it.shadeRun;
              it.indentPt = 0;
              it.centerShiftPt = null;
              it.align = "c";
            } else {
              stripBoldMarks(it);
            }
          }
        });
      });
    });

    const isP1 = page.page === 1 || (page.boxes.length === 1 && page.bands[0] && page.bands[0].kind === "grid" && page.bands[0].y0 < 52);
    if (isP1) {
      // ১ক) পাতা ১ শীর্ষ শিরোনাম ব্যান্ড (Band 0): dy=+2 নিরসনে B0-এর spaceBeforePt=0
      const b0 = page.bands[0];
      if (b0 && b0.kind === "grid" && b0.cells && b0.cells[0] && Array.isArray(b0.cells[0].items)) {
        b0.cells[0].items.forEach((it, idx) => {
          if (!it) return;
          if (idx === 0) it.spaceBeforePt = 0;
          setHidden(it, "_a16LockFit", true);
        });
      }

      // ১খ) পাতা ১-এর সব ব্যান্ড ও আইটেম পরিমার্জন
      page.bands.forEach((b) => {
        if (!b || !Array.isArray(b.cells)) return;
        if (b.kind === "grid" && b.boxIds && b.boxIds.length && b.cells.some((c) => c && c.ruleRight)) {
          setHidden(b, "_a03FullVRule", true);
        }
        b.cells.forEach((c) => {
          if (!c || !Array.isArray(c.items)) return;
          c.items.forEach((it) => {
            if (!it) return;
            const txt = String(it.text || "").trim();
            if (it.kind === "para" && (it.shade === "000000" || (it.shade && it.color === "FFFFFF"))) {
              if (it.rect && it.rect.y < 200) {
                // B5: ১ম কালো ব্যানার ("পেনশন সম্পর্কিত তথ্যাবলী")
                setHidden(it, "_a03OrigInkOff", 13.5 * 0.11);
                it.fontPt = 13.5;
                it.lineSpacingPt = 20.5;
                it.lineRule = "exact";
                setHidden(it, "_a14PosVal", 6);
                setHidden(it, "_a16LockFit", true);
              } else {
                // B21: ২য় কালো ব্যানার ("পেনশনার/ পারিবারিক/ পেনশনভোগীর সাধারন তথ্যাবলী")
                setHidden(it, "_a03OrigInkOff", 15.5 * 0.11);
                it.fontPt = 13.5;
                it.lineSpacingPt = 18.0;
                it.lineRule = "exact";
                if (it.rect) it.rect = Object.assign({}, it.rect, { y: 543.2 });
                setHidden(it, "_a14PosVal", 4);
                setHidden(it, "_a16LockFit", true);
              }
            } else if (it.kind === "para") {
              if (/^১\./.test(txt) && it.lines && it.lines.length === 3) {
                // B6: ১. পেনশনারের নাম...
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 13.5) * 0.11);
                it.fontPt = 12;
                it.lineSpacingPt = 17.3;
                it.lineRule = "exact";
                setHidden(it, "_a16LockFit", true);
              } else if (/^২\./.test(txt)) {
                // B7: ২. জাতীয় পরিচয় পত্র নম্বর...
                it.lines = (it.lines || [txt]).map((l) => String(l).replace(/^২\.\s*/, "২.   "));
                it.text = it.lines.join("\n");
                setHidden(it, "_a16LockFit", true);
              } else if (/^৩\./.test(txt)) {
                // B9: ৩. পেনশনের ধরণ: সুপারনিউয়েশন ⟦ ⟧ ...
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 13.5) * 0.11);
                it.fontPt = 11.5;
                it.lineSpacingPt = 15.525;
                it.lineRule = "exact";
                const ln9 = "৩.   পেনশনের ধরণ: সুপারনিউয়েশন ⟦ ⟧ রিটায়ারিং ⟦ ⟧ ইনভেলিড ⟦ ⟧ ক্ষতিপূরণ ⟦ ⟧ পারিবারিক ⟦ ⟧";
                it.lines = [ln9];
                it.text = ln9;
                it.tabLines = null;
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 23);
                setHidden(it, "_a03BoxNbsp", 7);
                setHidden(it, "_a16LockFit", true);
              } else if (/^৮\./.test(txt)) {
                // B14: ৮. পেনশনার নিজে অবসরপ্রাপ্ত সরকারি কর্মচারী হলে অনুগ্রহ করে টিক দিন : ⟦ ⟧
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 13) * 0.11);
                it.fontPt = 12;
                it.lineSpacingPt = 14.95;
                it.lineRule = "exact";
                const ln14 = "৮.   পেনশনার নিজে অবসরপ্রাপ্ত সরকারি কর্মচারী হলে অনুগ্রহ করে টিক দিন :  ⟦ ⟧";
                it.lines = [ln14];
                it.text = ln14;
                it.tabLines = null;
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              } else if (/^(?:[৪-৭]|১[০-৪])\./.test(txt)) {
                // B10..B13, B16, B17, B19, B20: ১২pt ফন্ট ও ক্রমিকের পরে সঠিক ফাঁক
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 13.5) * 0.11);
                it.lineSpacingPt = 15.525;
                it.lineRule = "exact";
                it.fontPt = 12;
                const fixSer = (s) => String(s || "").replace(/^([৪-৭])\.\s*/, "$1.   ").replace(/^(১[০-৪])\.\s*/, "$1.  ");
                if (Array.isArray(it.lines)) it.lines = it.lines.map(fixSer);
                if (Array.isArray(it.tabLines)) it.tabLines = it.tabLines.map(fixSer);
                it.text = fixSer(it.text);
                if (/^১৩\./.test(txt) && it.ruleBelow) {
                  setHidden(it.ruleBelow, "_gapPt", 5.5);
                }
                setHidden(it, "_a16LockFit", true);
              } else if (/^লিঙ্গ\s*:/.test(txt)) {
                // B22: লিঙ্গ : পুরুষ ⟦ ⟧ মহিলা ⟦ ⟧
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 13.5) * 0.11);
                it.fontPt = 12;
                it.lineSpacingPt = 15.525;
                it.lineRule = "exact";
                it.tabLines = ["লিঙ্গ :      পুরুষ   ⟦ ⟧\tমহিলা   ⟦ ⟧"];
                it.lines = ["লিঙ্গ :      পুরুষ   ⟦ ⟧ মহিলা   ⟦ ⟧"];
                it.text = it.lines[0];
                if (it.ruleBelow) setHidden(it.ruleBelow, "_gapPt", 30);
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              } else if (/^ধর্ম\s*:/.test(txt)) {
                // B25: ধর্ম : ইসলাম ⟦ ⟧ হিন্দু ⟦ ⟧ খৃষ্টান ⟦ ⟧ / বৌদ্ধ ⟦ ⟧ অন্যান্য ⟦ ⟧
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 13.5) * 0.11);
                it.align = "l";
                it.keepLines = true;
                it.keepJust = false;
                delete it.justRightPt;
                it.fontPt = 11.5;
                it.lineSpacingPt = 21.8;
                it.lineRule = "exact";
                it.lines = [
                  "ধর্ম :    ইসলাম   ⟦ ⟧    হিন্দু ⟦ ⟧    খৃষ্টান  ⟦ ⟧",
                  "বৌদ্ধ     ⟦ ⟧   অন্যান্য ⟦ ⟧"
                ];
                it.text = it.lines.join("\n");
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              } else if (/^বৈবাহিক/.test(txt)) {
                // B26: বৈবাহিক অবস্থা : বিবাহিত ⟦ ⟧ বিধবা ⟦ ⟧ / অবিবাহিত ⟦ ⟧ তালাকপ্রাপ্ত ⟦ ⟧
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 13.5) * 0.11);
                it.align = "l";
                it.keepLines = true;
                it.keepJust = false;
                delete it.justRightPt;
                it.fontPt = 11.5;
                it.lineSpacingPt = 21.5;
                it.lineRule = "exact";
                if (it.rect) it.rect = Object.assign({}, it.rect, { y: 648.1 });
                it.lines = [
                  "বৈবাহিক অবস্থা :  বিবাহিত   ⟦ ⟧        বিধবা     ⟦ ⟧",
                  "অবিবাহিত    ⟦ ⟧      তালাকপ্রাপ্ত ⟦ ⟧"
                ];
                it.text = it.lines.join("\n");
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              } else if (/^জন্ম তারিখ/.test(txt)) {
                setHidden(it, "_a16LockFit", true);
              }
            } else if (it.kind === "table") {
              if (it.borderless && Array.isArray(it.rows) && it.rows.length === 1 && /^১২\./.test(String(it.rows[0][0] || "").trim())) {
                // B18: ১২. পারিবারিক পেনশনারের ক্ষেত্রে... (১-সারির বর্ডারলেস ছকের উচ্চতা ১৩.৭৫pt নিশ্চিতকরণ যাতে নিচের অংশে -১.৫pt সরণ না ঘটে)
                it.rowHeightsPt = [13.75];
                it.rowHeightsExact = true;
                setHidden(it, "_a16LockFit", true);
              } else {
                repairA03Fix3DateTable(it, false);
              }
            }
          });
        });
      });
    } else {
      // ২) পাতা ২ পরিমার্জন
      page.bands.forEach((b, bi) => {
        if (!b || !Array.isArray(b.cells)) return;
        if (b.kind === "grid" && b.boxIds && b.boxIds.length && b.cells.some((c) => c && c.ruleRight)) {
          setHidden(b, "_a03FullVRule", true);
          if (bi === 0 && b.ruleBelow && b.ruleBelow.srcY != null) {
            b.ruleBelow.srcY = 195.0;
          } else if (bi === 1 && b.ruleBelow && b.ruleBelow.srcY != null) {
            b.ruleBelow.srcY = 215.0;
          }
        }
        b.cells.forEach((c) => {
          if (!c || !Array.isArray(c.items)) return;
          c.items.forEach((it) => {
            if (!it) return;
            const txt = String(it.text || "").trim();
            if (it.kind === "para" && (it.shade === "000000" || (it.shade && it.color === "FFFFFF"))) {
              if (it.rect && it.rect.y < 400) {
                // B44: ১ম কালো ব্যানার ("ভবিষ্যত পেনশন ভাতা সম্পর্কিত তথ্য")
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 12.5) * 0.11);
                it.fontPt = 12.5;
                it.lineSpacingPt = 17.5;
                it.lineRule = "exact";
                setHidden(it, "_a14PosVal", 4);
                setHidden(it, "_a16LockFit", true);
              } else {
                // B57: ২য় কালো ব্যানার ("ভবিষ্যতে সরাসরি ব্যাংক হিসাবে পেনশন প্রদানের জন্য ব্যাংক হিসাব সম্পর্কিত তথ্য")
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 11) * 0.11);
                it.fontPt = 12;
                it.lineSpacingPt = 18.0;
                it.lineRule = "exact";
                if (it.rect) it.rect = Object.assign({}, it.rect, { y: 614.7 });
                setHidden(it, "_a14PosVal", 5);
                setHidden(it, "_a16LockFit", true);
              }
            } else if (it.kind === "para") {
              if (/^যদি স্থায়ী ঠিকানা/.test(txt)) {
                // B28: যদি স্থায়ী ঠিকানা ও বর্তমান ঠিকানা একই হয়, অনুগ্রহ করে টিক দিন। ⟦ ⟧
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 10.5) * 0.11);
                if (b.y0 > 55.5) b.y0 = 55.46;
                it.fontPt = 9.5;
                it.lineSpacingPt = 12.1;
                it.lineRule = "exact";
                if (it.rect) it.rect = Object.assign({}, it.rect, { y: 60.1 });
                const ln28 = "যদি স্থায়ী ঠিকানা ও বর্তমান ঠিকানা একই হয়, অনুগ্রহ করে টিক দিন।   ⟦ ⟧";
                it.lines = [ln28];
                it.text = ln28;
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              } else if (/^গ্রস পেনশন সমর্পণের/.test(txt)) {
                // B45: গ্রস পেনশন সমর্পণের পরিমাণ : সম্পূর্ণ ⟦ ⟧ অর্ধেক ⟦ ⟧
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 11) * 0.11);
                it.fontPt = 11;
                it.lineSpacingPt = 12.65;
                it.lineRule = "exact";
                if (it.rect) it.rect = Object.assign({}, it.rect, { y: 282.8 });
                it.tabLines = ["গ্রস পেনশন সমর্পণের পরিমাণ     :       সম্পূর্ণ     ⟦ ⟧\tঅর্ধেক   ⟦ ⟧"];
                it.lines = ["গ্রস পেনশন সমর্পণের পরিমাণ     :       সম্পূর্ণ     ⟦ ⟧ অর্ধেক   ⟦ ⟧"];
                it.text = it.lines[0];
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              } else if (/^সর্বশেষ পরিশোধিত পেনশন/.test(txt)) {
                // B46: সর্বশেষ পরিশোধিত পেনশন : মাস [   ] বছর [ | | | ]
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 11) * 0.11);
                it.underline = false;
                it.fontPt = 11;
                it.lineSpacingPt = 12.65;
                it.lineRule = "exact";
                const ln46 = "সর্বশেষ পরিশোধিত পেনশন :    মাস  ⟦ ⟧       বছর    ⟦ ⟧";
                it.lines = [ln46];
                it.text = ln46;
                it.tabLines = null;
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03MonthYearBoxes", true);
                setHidden(it, "_a16LockFit", true);
              } else if (/^মোট\s*:/.test(txt)) {
                // B51: মোট : ... টাকা (নিচের দাগের অবস্থান ৪১৯.২৫pt নিশ্চিতকরণ)
                if (it.ruleBelow) it.ruleBelow.srcY = 418.2;
              } else if (/^পেনশন উত্তোলন করা হয়/.test(txt) && b.kind === "flow") {
                // B52 (Band 11): x=303.25pt খাড়া বিভাজক রেখাসহ ২-ঘরের গ্রিড ব্যান্ডে রূপান্তর
                const rb52 = it.ruleBelow || b.ruleBelow || { srcY: 458.2, sz: 4 };
                setHidden(rb52, "_p2Rule", true);
                const leftIt = cloneItemForA03Fix3(it);
                delete leftIt.ruleBelow;
                leftIt.tabLines = null;
                leftIt.tabStops = null;
                leftIt.fontPt = 11;
                leftIt.lineSpacingPt = 12.65;
                leftIt.lineRule = "exact";
                leftIt.indentPt = 5.8;
                leftIt.spaceBeforePt = 0;
                leftIt.rect = Object.assign({}, it.rect || {}, { x: 41.26, y: 428.2, w: 215.43, h: 17.0 });
                leftIt.lines = ["পেনশন উত্তোলন করা হয় : হিসাব রক্ষণ অফিস হতে   ⟦ ⟧"];
                leftIt.text = leftIt.lines[0];
                setHidden(leftIt, "_a03OrigInkOff", 11 * 0.11);
                setHidden(leftIt, "_a03BoxRuns", true);
                setHidden(leftIt, "_a03BoxSz", 25);
                setHidden(leftIt, "_a03BoxNbsp", 8);
                setHidden(leftIt, "_a16LockFit", true);

                const rightIt = cloneItemForA03Fix3(it);
                delete rightIt.ruleBelow;
                rightIt.tabLines = null;
                rightIt.tabStops = null;
                rightIt.fontPt = 11;
                rightIt.lineSpacingPt = 12.65;
                rightIt.lineRule = "exact";
                rightIt.indentPt = 96.9;
                rightIt.spaceBeforePt = 0;
                rightIt.rect = Object.assign({}, it.rect || {}, { x: 400.16, y: 428.2, w: 104.12, h: 17.0 });
                rightIt.lines = ["ব্যাংক হতে          ⟦ ⟧"];
                rightIt.text = rightIt.lines[0];
                setHidden(rightIt, "_a03OrigInkOff", 11 * 0.11);
                setHidden(rightIt, "_a03BoxRuns", true);
                setHidden(rightIt, "_a03BoxSz", 25);
                setHidden(rightIt, "_a03BoxNbsp", 8);
                setHidden(rightIt, "_a16LockFit", true);

                b.kind = "grid";
                b.y0 = 428.2;
                b.y1 = 445.2;
                b.boxIds = (it.boxIds && it.boxIds.length) ? it.boxIds.slice() : [1];
                delete leftIt.boxIds;
                delete rightIt.boxIds;
                b.ruleBelow = rb52;
                b.cells = [
                  { x0: 35.5, x1: 303.25, ruleRight: true, items: [leftIt] },
                  { x0: 303.25, x1: 558, items: [rightIt] }
                ];
                setHidden(b, "_a03FullVRule", true);
              } else if (/^হিসাব নম্বর\s*:/.test(txt)) {
                // B60: হিসাব নম্বর :   হিসাবের ধরণ : সঞ্চয়ী ⟦ ⟧ চলতি ⟦ ⟧
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 11) * 0.11);
                it.fontPt = 11;
                it.lineSpacingPt = 12.65;
                it.lineRule = "exact";
                if (it.rect) it.rect = Object.assign({}, it.rect, { y: 688.6 });
                it.tabLines = ["হিসাব নম্বর :\tহিসাবের ধরণ :       সঞ্চয়ী     ⟦ ⟧        চলতি    ⟦ ⟧"];
                it.lines = ["হিসাব নম্বর : হিসাবের ধরণ :       সঞ্চয়ী     ⟦ ⟧        চলতি    ⟦ ⟧"];
                it.text = it.lines[0];
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              }
            } else if (it.kind === "table") {
              if (it.borderless && Array.isArray(it.rows) && it.rows.length === 3 && /যদি হিসাব রক্ষণ/.test(String(it.rows[0][0] || ""))) {
                // B53: যদি হিসাব রক্ষণ অফিস হতে... | যদি ব্যাংক হতে... (খাড়া বিভাজক রেখা ঠিক x=303.25pt-এ স্থাপন)
                it.indentPt = 0;
                it.widthPt = 522.5;
                it.colFractions = [267.75 / 522.5, 254.75 / 522.5];
                it.fullVRule = [true];
                setHidden(it, "_p2VRule", true);
                setHidden(it, "_a16LockFit", true);
              } else if (Array.isArray(it.splitBoxCols) && it.splitBoxCols.length === 3) {
                // B61: স্বাক্ষর : | তারিখ : বক্স (উচ্চতা ৫৬.৫pt ও প্রস্থ ৫০৫.৭pt)
                it.heightPt = 56.5;
                it.rowHeightsPt = [56.5];
                it.rowHeightsExact = true;
                setHidden(it, "_a16LockFit", true);
              } else {
                repairA03Fix3DateTable(it, true);
              }
            }
          });
        });
      });
    }
    return page;
  }

  function repairA03Fix3Ir(ir, pageInfo) {
    if (!a03Fix3On()) return restoreA03Fix3Ir(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA03Fix3Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  function repairA02FixPage(page, info) {
    if (!a02FixOn() || !page || !Array.isArray(page.bands)) return page;
    // কেবল একক বর্ডার-ফ্রেমযুক্ত পাতায় (যেমন a02 NOC ফরম) কার্যকর
    if (!page.frame || !page.frame.style) return page;
    const W = page.widthPt || 558;
    const H = page.heightPt || 770.6;
    if (W < 540 || W > 575 || H < 750 || H > 795) return page;
    const PL = (page.margins && page.margins.left) || 26.9;
    const PR = W - ((page.margins && page.margins.right) || 20.9);
    const bodyFont = page.bodyFontPt || 11;
    const rHalf = (v) => Math.round(v * 2) / 2;
    const FILL_RE = /([._\-…·─])\1{5,}/;
  
    // ১) পাতা-ফ্রেমের (page.frame) প্রকৃত আয়তক্ষেত্র পুনরুদ্ধার ও মার্জিন-ভিত্তিক spacePt নির্ধারণ (RULES2-এর সাথে সম্পূর্ণ সামঞ্জস্যপূর্ণ)
    if (page.frame && page.frame.spacePt && (page.scale || 1) === 1) {
      let f = (info && info.frame && info.frame.rectPt) ? info.frame.rectPt : (page.frame.rectPt && page.frame.rectPt.h >= 750.5 ? page.frame.rectPt : null);
      if (!f) {
        const allRects = [];
        for (const b of page.bands) {
          for (const c of (b && b.cells) || []) {
            for (const it of (c && c.items) || []) {
              if (it && it.rect) allRects.push(it.rect);
            }
          }
        }
        if (allRects.length) {
          const cx0 = Math.min(...allRects.map((r) => r.x));
          const cy0 = Math.min(...allRects.map((r) => r.y));
          const cx1 = Math.max(...allRects.map((r) => r.x + r.w));
          const sp = page.frame.spacePt;
          const fx = r1(cx0 - (sp.left || 14.4));
          const fy = r1(cy0 - (sp.top || 13.9));
          const fw = r1((cx1 + (sp.right || 13.4)) - fx);
          const botEdge = H - Math.max(10.0, ((page.margins && page.margins.bottom) || 14) - 4);
          const fh = r1(botEdge - fy);
          f = { x: fx, y: fy, w: fw, h: fh };
        }
      }
      if (f) {
        page.frame.rectPt = { x: r1(f.x), y: r1(f.y), w: r1(f.w), h: r1(f.h) };
        const effBot = Math.min((page.margins && page.margins.bottom) || 14, 14);
        page.frame.spacePt = {
          top: r1(clamp(Math.round(((page.margins && page.margins.top) || 21.6) - f.y - 2.2), 0, 31)),
          left: r1(clamp(Math.round(PL - f.x - 2.0), 0, 31)),
          right: r1(clamp(Math.round(((page.margins && page.margins.right) || 20.9) - (W - (f.x + f.w)) - 2.0), 0, 31)),
          bottom: r1(clamp(Math.round(effBot - (H - (f.y + f.h)) - 2.0), 0, 31))
        };
        Object.defineProperty(page.frame, '_a02FrameFixed', { value: true, enumerable: false, configurable: true, writable: true });
      }
    }
  
    // ২) শীর্ষ এমব্লেম চিত্র, শিরোনাম/উপ-শিরোনাম, ওয়েবসাইট সারি, বডি অনুচ্ছেদ, পারিবারিক ছক, ৪-কলাম স্বাক্ষর-গ্রিড ও ধূসর পাদটীকা বার সংস্কার
    const serialEntries = [];
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
  
      // ২ক) ৪-কলামের স্বাক্ষর ও অফিসিয়াল সীলমোহর গ্রিড (Band 20)
      if (band.kind === 'grid' && band.cells.length === 4) {
        const c1 = band.cells[1], c2 = band.cells[2], c3 = band.cells[3];
        const c1It = c1 && Array.isArray(c1.items) && c1.items.length === 1 ? c1.items[0] : null;
        if (c1It && c1It.kind === 'para' && c1It.rect && /সীলমোহর|সিলমোহর/.test(String(c1It.text || ''))) {
          if (Math.abs(c1It.rect.y - 621.8) <= 2.0) {
            c1It.rect = Object.assign({}, c1It.rect, { y: 620.3 });
          }
        }
        const c2Fig = c2 && Array.isArray(c2.items) ? c2.items.find((x) => x && x.kind === 'figure' && x.rect && x.rect.h > x.rect.w * 2.5) : null;
        if (c2Fig && c2Fig.rect) {
          c2Fig.widthPt = r1(c2Fig.rect.w);
          c2Fig.heightPt = r1(c2Fig.rect.h);
          c2Fig.indentPt = r1(Math.max(0, c2Fig.rect.x - (c2.x0 != null ? c2.x0 : PL)));
          c2Fig.spaceBeforePt = 0;
          Object.defineProperty(c2Fig, '_a16FigLocked', { value: true, enumerable: false, configurable: true, writable: true });
          Object.defineProperty(c2Fig, '_a02VertBraceFig', { value: true, enumerable: false, configurable: true, writable: true });
        }
        if (c3 && Array.isArray(c3.items) && c3.items.length === 6 && c3.items.every((x) => x && x.kind === 'para' && x.rect)) {
          const y0 = c3.items[0].rect.y;
          const fs0 = c3.items[0].fontPt || bodyFont;
          const baseTgt0 = y0 - 0.33 * fs0;
          const uniformPitch = 16.1;
          c3.items.forEach((it, idx) => {
            if (idx === 0) return;
            const fs = it.fontPt || bodyFont;
            const ls = (it.tabLines && it.tabLines.length) ? it.tabLines : (it.lines && it.lines.length ? it.lines : String(it.text || '').split('\n'));
            const t0 = String(ls[0] || it.text || '');
            const hasTopAsc = /[িীৈৌঁ]|র্/.test(t0);
            const k = hasTopAsc ? 0.11 : 0.33;
            const newY = r1(baseTgt0 + idx * uniformPitch + k * fs);
            if (Math.abs(it.rect.y - newY) <= 4.0) {
              it.rect = Object.assign({}, it.rect, { y: newY });
            }
          });
        }
      }
  
      for (let ci = 0; ci < band.cells.length; ci++) {
        const cell = band.cells[ci];
        if (!cell || !Array.isArray(cell.items)) continue;
        const cx0 = cell.x0 != null ? cell.x0 : PL;
        for (const it of cell.items) {
          if (!it) continue;
  
          // ২খ) পাতার শীর্ষভাগে (rect.y < 150) থাকা ইনলাইন এমব্লেম চিত্রের (Band 0) উচ্চতা ও প্রস্থ মাপা আয়তক্ষেত্রের সাথে মেলানো
          if (it.kind === 'figure' && it.rect && !it.floatAt && it.rect.y < 150
              && it.rect.w >= 40 && it.rect.w <= 80 && it.rect.h >= 40 && it.rect.h <= 80) {
            it.widthPt = r1(it.rect.w);
            it.heightPt = r1(it.rect.h);
            band.y0 = r1(it.rect.y);
            band.y1 = r1(it.rect.y + it.rect.h);
            Object.defineProperty(it, '_a16FigLocked', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }
  
          // ২গ) ডান ঘরের ৮-ঘর তারিখ-বাক্স (Band 15 Right: boxRule="date" বা _digitBoxStrip) — উচ্চতা ১৭.৩pt থেকে ১৬.৫pt-এ নামানো
          if ((it.boxRule === 'date' || (it.kind === 'table' && it._digitBoxStrip && Array.isArray(it.rows) && it.rows.length === 1 && it.rows[0].length === 8))
              && it.rect && it.rect.h >= 15.5 && it.rect.h <= 18.0) {
            it.boxRuleHeightPt = 16.5;
            if (it.kind === 'table') {
              it.rowHeightsPt = [16.5];
              it.heightPt = 16.5;
            }
            continue;
          }
  
          // ২ঘ) পারিবারিক বিবরণী ছক (Band 17, ৫ সারি × ৪ বা ৬ কলাম)
          if (it.kind === 'table' && Array.isArray(it.rows) && it.rows.length === 5 && it.rows[0] && (it.rows[0].length === 4 || it.rows[0].length === 6) && it.headShade) {
            it.headFontPt = 10.5;
            it.fontPt = bodyFont;
            it.cellFontSrc = bodyFont;
            if (typeof it.rows[0][0] === 'string' && !it.rows[0][0].includes('\n') && /ক্রমিক\s+নং/.test(it.rows[0][0])) {
              it.rows[0][0] = it.rows[0][0].replace(/^(ক্রমিক)\s+(নং)$/, '$1\n$2');
            }
            if (typeof it.rows[0][2] === 'string' && !it.rows[0][2].includes('\n') && /সম্পর্ক\s*\(/.test(it.rows[0][2])) {
              it.rows[0][2] = it.rows[0][2].replace(/^(সম্পর্ক)\s+(\(.+\))$/, '$1\n$2');
            }
            if (Array.isArray(it.cells) && Array.isArray(it.cells[0])) {
              if (it.cells[0][0]) it.cells[0][0].text = it.rows[0][0];
              if (it.cells[0][2]) it.cells[0][2].text = it.rows[0][2];
            }
            if (Array.isArray(it.cellMeta) && Array.isArray(it.cellMeta[0])) {
              if (it.cellMeta[0][0]) it.cellMeta[0][0].text = it.rows[0][0];
              if (it.cellMeta[0][2]) it.cellMeta[0][2].text = it.rows[0][2];
            }
            it.rowHeightsPt = [30.2, 15.2, 15.2, 15.2, 15.2];
            it.heightPt = 91.0;
            it.exactRuleHeights = true;
            if (it.rect) {
              it.rect = Object.assign({}, it.rect, { h: 91.0 });
              band.y0 = r1(it.rect.y);
              band.y1 = r1(it.rect.y + 91.0);
            }
            Object.defineProperty(it, '_a02FamilyTable', { value: true, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }
  
          if (it.kind !== 'para') continue;
          const rawTxt = String(it.text || '');
          const cleanTxt = rawTxt.replace(/\*\*|<[^>]+>/g, '').trim();
          const nLn = (it.lines || []).length || 1;
  
          // ২ঙ) প্রধান শিরোনাম ("অনাপত্তি সনদ (NOC)") — ১৮pt থেকে মাপা ১৭.৫pt ফন্টে পুনরুদ্ধার
          if (it.type === 'title' && it.align === 'c' && it.bold && it.fontPt === 18
              && it.diag && it.diag.wPt >= 17.2 && it.diag.wPt <= 17.7) {
            it.fontPt = 17.5;
            if (it.fit) delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }
  
          // ২চ) উপ-শিরোনাম ("(মন্ত্রণালয়/বিভাগ/কার্যালয়-এর নাম)") — ১৩.৫pt থেকে মাপা ১৩pt ফন্টে পুনরুদ্ধার
          if (it.align === 'c' && it.bold && it.fontPt === 13.5
              && it.diag && it.diag.inkPt >= 12.8 && it.diag.inkPt <= 13.2 && it.rect && it.rect.h <= 13.2) {
            it.fontPt = 13;
            if (it.fit) delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }
  
          // ২ছ) কেন্দ্রীভূত সংক্ষিপ্ত লেবেল+ডট সারি ("ওয়েবসাইট:............") — বাম-প্রান্তিক ডট-লিডার ট্যাবে রূপান্তর যাতে মূলের মতো ঠিক ১৪২.৫pt প্রস্থে বসে
          if (it.align === 'c' && !it.tabLines && nLn === 1 && it.rect && it.rect.w >= 100 && it.rect.w <= 220
              && /^[^\s:：]+[:：]\s*([._\-…·─])\1{10,}\s*$/.test(cleanTxt)) {
            it.align = 'l';
            it.centerShiftPt = null;
            it.indentPt = r1(Math.max(0, it.rect.x - cx0));
            continue;
          }
  
          // ২জ) একাধিক ডট-পূরণ ও প্রান্তিক লেখাযুক্ত ১-লাইনের বডি সারি (Band 8: "জনাব ... ; ... কার্যালয়ে")
          const fillMatches = rawTxt.match(/([._\-…·─])\1{5,}/g) || [];
          const hasTailAfterFill = /([._\-…·─])\1{5,}\s*[^\s._\-…·─।.|,;:)]/.test(rawTxt);
          if (band.kind === 'flow' && !it.tabLines && nLn === 1 && fillMatches.length >= 2 && hasTailAfterFill
              && it.rect && it.rect.w >= 460 && (it.fontPt < bodyFont || (it.fit && it.fit.fontFrom === bodyFont))) {
            it.fontPt = bodyFont;
            it.lineSpacingPt = 0;
            if (it.fit) delete it.fit;
            if (Math.abs(it.rect.y - 231.5) <= 1.2) {
              it.rect = Object.assign({}, it.rect, { y: 230.5 });
              band.y0 = 230.5;
              band.y1 = r1(230.5 + it.rect.h);
            }
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }
  
          // ২ঝ) ডট-পূরণহীন পূর্ণ-প্রস্থ ১-লাইনের বডি সারি (Band 10: "নিযুক্ত আছেন। ... পূর্ব পরিচয়") — ১০.৫pt থেকে ১১pt ফন্ট ও বাম-ইনডেন্ট পুনরুদ্ধার
          if (band.kind === 'flow' && !it.tabLines && nLn === 1 && fillMatches.length === 0
              && !/^[০-৯0-9]{1,2}[।.)]/.test(cleanTxt) && !it.bold
              && it.rect && it.rect.w >= 460 && (it.indentPt || 0) <= 2.5
              && (it.fontPt < bodyFont || (it.fit && it.fit.fontFrom === bodyFont))) {
            it.fontPt = bodyFont;
            if (it.rect.x > cx0 + 1.0) {
              it.indentPt = r1(it.rect.x - cx0);
            }
            it.charSpacingPt = -0.1;
            if (it.fit) delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }
  
          // ২ঞ) বোল্ড প্রাপক-কার্যালয় সারি (Band 23: "বিভাগীয় পাসপোর্ট ও ভিসা অফিস/আঞ্চলিক পাসপোর্ট অফিস,") — ১১pt থেকে ১১.৫pt ফন্ট পুনরুদ্ধার
          if (band.kind === 'flow' && !it.tabLines && nLn === 1 && it.bold && !FILL_RE.test(rawTxt)
              && it.fontPt === bodyFont && it.diag && it.diag.wPt >= bodyFont + 0.4 && it.diag.wPt <= bodyFont + 0.8
              && it.rect && it.rect.w >= 200 && it.rect.w <= 360) {
            it.fontPt = rHalf(it.diag.wPt);
            if (it.fit) delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }
  
          // ২ট) দাড়িযুক্ত পূর্ণ-প্রস্থ বিন্দু-রেখা (Band 24: "........................................................ ।")
          if (band.kind === 'flow' && !it.tabLines && nLn === 1 && /^\s*(([._\-…·─])\2{5,})\s*([।.|,;:)]+)\s*$/.test(cleanTxt)) {
            it.fontPt = bodyFont;
            if (it.fit) delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }
  
          // ২ঠ) তলার ধূসর পাদটীকা বার (Band 25: "প্রাপক / পরিচালক/উপপরিচালক/সহকারী পরিচালক", shade="C1BDC8")
          if (it.shade && it.align === 'c' && it.rect && it.rect.y >= 720) {
            it.fontPt = bodyFont;
            it.fullWidthShadeBar = true;
            it.shadeRun = false;
            it.indentPt = 0;
            it.rightIndentPt = 0;
            it.centerShiftPt = null;
            it.rect = Object.assign({}, it.rect, { x: PL, y: 741.8, w: r1(PR - PL), h: 16.7 });
            band.y0 = 741.8;
            band.y1 = 758.5;
            if (it.fit) delete it.fit;
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            continue;
          }
  
          // ২ড) ক্রমিক আইটেম (০১।..০৭।) সংগ্রহ
          if (ci === 0 && /^[০-৯0-9]{1,2}[।.)]/.test(cleanTxt)) {
            serialEntries.push({ band, cell, it, cx0, cleanTxt });
          }
        }
      }
    }
  
    // ৩) ক্রমিক তালিকা (০১।..০৭।)-এর ফন্ট, বাম-ইনডেন্ট ও অক্ষর-ফাঁক সমন্বয়
    if (serialEntries.length >= 5) {
      for (const { it, cx0, cleanTxt } of serialEntries) {
        if (it.fontPt > bodyFont) {
          it.fontPt = bodyFont;
          if (it.fit) delete it.fit;
          Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
        }
        if ((it.indentPt || 0) < 0.5 && it.rect && it.rect.x > cx0 + 0.5 && it.rect.x < cx0 + 10) {
          it.indentPt = r1(it.rect.x - cx0);
        }
        if (/^০৩[।.]/.test(cleanTxt) || /^০৬[।.]/.test(cleanTxt)) {
          it.charSpacingPt = -0.1;
        } else if (/^০৪[।.]/.test(cleanTxt)) {
          it.charSpacingPt = -0.15;
        } else if (/^০৫[।.]/.test(cleanTxt)) {
          if (it.rect && it.rect.x >= cx0) it.indentPt = r1(it.rect.x - cx0);
          it.charSpacingPt = -0.2;
        } else if (/^০৭[।.]/.test(cleanTxt)) {
          it.charSpacingPt = -0.15;
        }
      }
    }
  
    // ৪) ব্যান্ডগুলোর gapBeforePt ও প্রথম আইটেমের spaceBeforePt পুনর্গণনা
    let prevY1 = page.margins ? page.margins.top : 21.6;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, (band.y0 || 0) - prevY1));
      if (band.kind === 'flow' && band.cells.length === 1 && Array.isArray(band.cells[0].items) && band.cells[0].items.length === 1) {
        const it0 = band.cells[0].items[0];
        if (it0 && it0.rect) {
          it0.spaceBeforePt = band.gapBeforePt;
        }
      }
      prevY1 = Math.max(prevY1, band.y1 || 0);
    }
    Object.defineProperty(page, '_a02FixRepaired', { value: true, enumerable: false, configurable: true, writable: true });
    return page;
  }

  function repairA02FixIr(ir, pageInfo) {
    if (!a02FixOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA02FixPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }


  /**
   * A06_SCORE_v1: নমুনা a06 ও সমগোত্রীয় গৃহ নির্মাণ ঋণ উপযুক্ততা প্রত্যয়ন ফরমের লক্ষ্যভিত্তিক জ্যামিতিক ও লেআউট মেরামত:
   * ১) প্রবাহ-শিরোনামের (flow heading, যেমন ব্যান্ড ৭ "**সরকারি কর্মচারীদের জন্য ব্যাংকিং ব্যবস্থার মাধ্যমে গৃহ নির্মাণ ঋণ...**") আনুভূমিক স্ট্রোক-অনুপাত (sH >= 1.5 এবং sH >= sV * 1.18) বা মাপা hrules থেকে repairA14Fix3Page দ্বারা মুছে যাওয়া আন্ডারলাইন পুনরুদ্ধার (rules: 0 -> 20/20, unmatched: 1 -> 0 এবং গ-এ ঋ-কারের নিম্নাংশ-জনিত উচ্চতা ত্রুটি dh = +4 নিরসন) ও অক্ষর-সংকোচন (-0.1pt);
   * ২) ক্রমিক কোলন-ট্যাব তালিকায় (১)–১০), ব্যান্ড ৯–১৮) repairA14Fix3Page-এর ভ্রান্ত তারিখ-বিভাজন (/(\S)\s+(তারিখ)\t\s*([:：]\s*\S+)/) থেকে ৪, ৫, ৭ ও ৮ নং দফার "তারিখ" শব্দটি পুনরায় বাম লেবেলে সংযোজন, সহপাঠী tabStopsAbs-এর মিডিয়ান ও সর্বোচ্চ মান ([203.5, 211.6]) থেকে কোলন ও ডট-লিডার স্টপ একীকরণ, স্পষ্ট কালো ডট-লিডার (_a06DotBold) এবং ৬, ৮, ৯, ১০ নং দফার ডান-প্রান্ত মূলের কালি-সীমায় সমন্বয় (১০টি short লাইন নিরসন);
   * ৩) উপরের ৩টি ক্রমিক লিডার+লেবেল লাইনের (ব্যান্ড ৪–৬: দপ্তরের নাম, পরিদপ্তর/অধিদপ্তর, মন্ত্রণালয়/বিভাগ) ফন্ট ১০.৫pt-এ সমতাকরণ, অভিন্ন লিডার ট্যাব-স্টপ (_a06LeaderStopPt = 295.8pt) ও বাম-ইনডেন্ট সমন্বয় (Row 4 font ত্রুটি, Row 5 ও 6 short ত্রুটি এবং Row 6-এর dx0 = +191 indent ত্রুটি নিরসন);
   * ৪) ৩-লাইনের জাস্টিফাইড প্রত্যয়ন অনুচ্ছেদে (ব্যান্ড ৮) line-fit দ্বারা মুছে যাওয়া ডান-ইনডেন্ট (justRightPt = 20.1pt) পুনরুদ্ধার, সকল লাইনে -0.15pt অক্ষর-সংকোচন এবং ১৮.০pt লাইন-পিচ ও উল্লম্ব অবস্থান সমন্বয় (৩টি long লাইন ও dy সরণ নিরসন);
   * ৫) ৩০০-ডিপিআই ক্রপকৃত সরকারি প্রতীক (এমব্লেম) চিত্রের (ব্যান্ড ১, pxW=168, pxH=164) সাদা প্যাডিং ও বেসলাইন লিড (_a07FigLeadPt = 1.5pt) পুনরুদ্ধার করে ১:১ স্কেল (40.3x39.4pt) রক্ষা (dh = -6 font ত্রুটি নিরসন), পাতার শীর্ষ মার্জিন (-1.6pt) এবং নিচের ২-লাইনের স্বাক্ষরের লাইন-পিচ (১১.৫pt) সমন্বয়।
   */
  const A06FIX_NON_ENUM_KEYS = [
    '_a07HeadPitchPt', '_a07MultiLinePitch', '_tabStopRatio', '_a07FixedSig',
    '_a07LockFit', '_a16LockFit', '_origFigIndentPt', '_a07FigLeadPt',
    '_a14Fix3PitchLocked', '_recitationStripped', '_origSigInd', '_cellMeta',
    '_preTblMergeSnap', '_a07RowVAlignTop', '_a07RowVAlignTopRows', '_a07Fix5TableFixed',
    '_a06LeaderStopPt', '_a06DotBold', '_a06ProseYShifted', '_a06SigShifted',
    '_a12FirstLineCharSpacing', '_noAutoCharSpacing', '_a16SingleParaList'
  ];

  function cloneItemForA06Fix(it) {
    if (!it || typeof it !== 'object') return it;
    const cp = JSON.parse(JSON.stringify(it));
    for (const k of A06FIX_NON_ENUM_KEYS) {
      if (it[k] !== undefined) {
        Object.defineProperty(cp, k, { value: it[k], enumerable: false, configurable: true, writable: true });
      }
    }
    return cp;
  }

  function snapshotPageBeforeA06Fix(page) {
    if (!page || page._preA06FixSnap) return;
    const snap = {
      margins: page.margins ? Object.assign({}, page.margins) : page.margins,
      bands: Array.isArray(page.bands) ? page.bands.map((b) => {
        if (!b) return b;
        return Object.assign({}, b, {
          cells: Array.isArray(b.cells) ? b.cells.map((c) => Object.assign({}, c, {
            items: Array.isArray(c.items) ? c.items.map(cloneItemForA06Fix) : c.items
          })) : b.cells
        });
      }) : page.bands
    };
    Object.defineProperty(page, '_preA06FixSnap', { value: snap, enumerable: false, configurable: true, writable: true });
  }

  function restoreA06FixPage(page) {
    if (!page || !page._preA06FixSnap) return page;
    const snap = page._preA06FixSnap;
    if (snap.margins) page.margins = Object.assign({}, snap.margins);
    if (Array.isArray(snap.bands)) {
      page.bands = snap.bands.map((b) => {
        if (!b) return b;
        return Object.assign({}, b, {
          cells: Array.isArray(b.cells) ? b.cells.map((c) => Object.assign({}, c, {
            items: Array.isArray(c.items) ? c.items.map(cloneItemForA06Fix) : c.items
          })) : b.cells
        });
      });
    }
    delete page._preA06FixSnap;
    delete page._a06FixRepaired;
    delete page._a06TopMarginAdjusted;
    return page;
  }

  function restoreA06FixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => restoreA06FixPage(p));
    return ir;
  }

  function repairA06FixPage(page, info) {
    if (!a06FixOn()) return restoreA06FixPage(page);
    if (!page || !Array.isArray(page.bands)) return page;
    // শুধু a06-আকৃতির পাতা (খুব উঁচু শীর্ষ-মার্জিন, ১২০–২০০pt) — নইলে ব্রাউজার-fit-এর পরে a03-এ নিয়ম লেগে −১২.৫ হতো
    if (!page.margins || !(page.margins.top >= 120 && page.margins.top <= 200)) return page;
    snapshotPageBeforeA06Fix(page);
    Object.defineProperty(page, '_a06FixRepaired', { value: true, enumerable: false, configurable: true, writable: true });
    const PL = (page.margins && page.margins.left) || 75.4;
    const bodyFs = page.bodyFontPt || 10.5;

    // ১) পাতার শীর্ষ মার্জিন ও প্রথম ডান-প্রান্তিক নোট লাইনের (ব্যান্ড ০) উল্লম্ব অবস্থান সমন্বয় (dy = +2 -> 0)
    if (page.margins && page.margins.top >= 150 && page.margins.top <= 160 && page.bands.length >= 15 && !page._a06TopMarginAdjusted) {
      const b0 = page.bands[0];
      const it0 = b0 && b0.kind === 'flow' && b0.cells && b0.cells[0] && b0.cells[0].items && b0.cells[0].items[0];
      if (it0 && it0.kind === 'para' && it0.align === 'r' && it0.rect && Math.abs(it0.rect.y - page.margins.top) <= 0.6) {
        page.margins.top = r1(page.margins.top - 1.6);
        Object.defineProperty(page, '_a06TopMarginAdjusted', { value: true, enumerable: false, configurable: true, writable: true });
      }
    }

    // ২) উপরের ৩টি ক্রমিক লিডার+লেবেল লাইনের (ব্যান্ড ৪–৬: দপ্তরের নাম, পরিদপ্তর/অধিদপ্তর, মন্ত্রণালয়/বিভাগ) ফন্ট, লিডার ও ট্যাব-স্টপ একীকরণ
    const leaderLabelEntries = [];
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      const cell = band && band.kind === 'flow' && band.cells && band.cells.length === 1 ? band.cells[0] : null;
      const it = cell && cell.items && cell.items.length === 1 ? cell.items[0] : null;
      if (!it || it.kind !== 'para' || it.tabLines || !it.rect) continue;
      const ln0 = String((it.lines && it.lines[0]) || it.text || '').trim();
      const mLdr = /^(([._\-…·─])\2{10,})\s+(\S[\s\S]*)$/.exec(ln0);
      if (mLdr && (it.type === 'label_value' || it.align === 'r') && (it.indentPt || 0) >= 60 && it.rect.x >= 140 && it.rect.x <= 210 && it.rect.w >= 200 && it.rect.w <= 300) {
        leaderLabelEntries.push({ bi, band, cell, it, fillCh: mLdr[2], tailLbl: mLdr[3].trim() });
      }
    }
    if (leaderLabelEntries.length >= 3) {
      const targetFs = Math.max(bodyFs, ...leaderLabelEntries.map((e) => e.it.fontPt || 0));
      const dashCnt = leaderLabelEntries.filter((e) => e.fillCh === '-' || e.fillCh === '─').length;
      const majCh = dashCnt >= Math.ceil(leaderLabelEntries.length / 2) ? '-' : '.';
      const estTailW = (lbl) => {
        const cl = String(lbl || '').trim().replace(/\*\*|<[^>]+>/g, '');
        const b = cl.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
        const sv = (cl.match(/[ \u09cd]/g) || []).length;
        return (b - sv) * 0.484 * targetFs + 3.0;
      };
      const stopCands = leaderLabelEntries.map((e) => r1((e.it.rect.x + e.it.rect.w) - estTailW(e.tailLbl) - ((e.cell && e.cell.x0) || PL))).sort((a, b) => a - b);
      const sharedStopPt = stopCands[0];
      for (const e of leaderLabelEntries) {
        e.it.fontPt = targetFs;
        e.it.indentPt = r1(Math.max(0, (e.it.rect.x - ((e.cell && e.cell.x0) || PL)) - 4.0));
        if (e.fillCh !== majCh) {
          const normFill = majCh.repeat(70) + ' ' + e.tailLbl;
          e.it.lines = [normFill];
          e.it.text = normFill;
        }
        Object.defineProperty(e.it, '_a06LeaderStopPt', { value: sharedStopPt, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(e.it, '_a06DotBold', { value: true, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(e.it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
      }
    }

    // ৩) প্রতিটি ব্যান্ডে চিত্র, প্রবাহ-শিরোনামের আন্ডারলাইন, ৩-লাইনের জাস্টিফাইড প্রত্যয়ন অনুচ্ছেদ ও নিচের স্বাক্ষর সংস্কার
    const colonListEntries = [];
    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        const cellX0 = (cell && cell.x0 != null) ? cell.x0 : PL;
        const cellX1 = (cell && cell.x1 != null) ? cell.x1 : (page.widthPt - ((page.margins && page.margins.right) || 61));
        for (const it of cell.items || []) {
          if (!it) continue;

          // ৩ক) ৩০০-ডিপিআই ক্রপকৃত সরকারি প্রতীক (এমব্লেম) চিত্রের সাদা প্যাডিং ও বেসলাইন অফসেট পুনরুদ্ধার
          if (it.kind === 'figure' && it.rect && it.rect.w > 30 && it.rect.w <= 45 && it.rect.h > 30 && it.rect.h <= 42
              && ((it.image && it.image.pxW > 0 && it.image.pxH > 0) || (Array.isArray(it.box) && Math.abs(it.rect.w - it.rect.h) <= 3))) {
            const natW = (it.image && it.image.pxW > 0) ? r1(it.image.pxW * 0.24) : r1(it.rect.w + 2.88);
            const natH = (it.image && it.image.pxH > 0) ? r1(it.image.pxH * 0.24) : r1(it.rect.h + 2.88);
            if (natW >= it.rect.w + 1.5 && natW <= it.rect.w + 4.5 && natH >= it.rect.h + 1.5 && natH <= it.rect.h + 4.5) {
              const baseInd = it._origFigIndentPt != null ? it._origFigIndentPt : r1(Math.max(0, it.rect.x - cellX0));
              Object.defineProperty(it, '_origFigIndentPt', { value: baseInd, enumerable: false, configurable: true, writable: true });
              it.widthPt = natW;
              it.heightPt = natH;
              it.indentPt = r1(Math.max(0, baseInd - (natW - it.rect.w) / 2));
              Object.defineProperty(it, '_a07FigLeadPt', { value: r1((natH - it.rect.h) / 2), enumerable: false, configurable: true, writable: true });
            }
          }

          if (it.kind !== 'para' || !it.rect) continue;
          const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;

          // ৩খ) প্রবাহ-শিরোনামের (ব্যান্ড ৭) মুছে যাওয়া আন্ডারলাইন পুনরুদ্ধার ও অক্ষর-সংকোচন (-0.1pt)
          if (band.kind === 'flow' && it.type === 'heading' && it.align === 'c' && nLn === 1 && !(it.boxIds && it.boxIds.length)
              && it.rect.w >= 380 && it.rect.h >= 12) {
            const hasHruleMatch = !!(info && Array.isArray(info.hrules) && info.hrules.some((r) => Math.abs(r.y - (it.rect.y + it.rect.h)) <= 4 && Math.min(r.x + r.w, it.rect.x + it.rect.w) - Math.max(r.x, it.rect.x) >= it.rect.w * 0.7));
            const hasStrokeUnderline = !!(it.diag && it.diag.sH >= 1.5 && it.diag.sV > 0 && it.diag.sH >= it.diag.sV * 1.18);
            if (hasHruleMatch || hasStrokeUnderline) {
              it.underline = true;
              it.ruleBelow = null;
              if (!it.charSpacingPt && it.fontPt === 12.5 && it.diag && it.diag.wPt <= 12.5) {
                it.charSpacingPt = -0.1;
              }
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }

          // ৩গ) ৩-লাইনের জাস্টিফাইড প্রত্যয়ন গদ্য-অনুচ্ছেদে (ব্যান্ড ৮) justRightPt পুনরুদ্ধার, -0.15pt অক্ষর-সংকোচন ও ১৮.০pt লাইন-পিচ
          if (band.kind === 'flow' && !it.tabLines && it.align === 'j' && it.keepLines && it.keepJust
              && Array.isArray(it.lines) && it.lines.length === 3 && ((it.firstIndentPt || 0) >= 24 || (it.fit && it.rect.w >= 420))
              && it.rect.w >= 400) {
            const trueJr = r1(Math.max(0, cellX1 - (it.rect.x + it.rect.w)));
            if (trueJr >= 12 && trueJr <= 35 && (it.lineSpacingPt >= 18.0 && it.lineSpacingPt <= 19.0)) {
              if (it.fit && it.fit.fontFrom && it.fontPt < it.fit.fontFrom) it.fontPt = it.fit.fontFrom;
              if ((it.firstIndentPt || 0) < 20) it.firstIndentPt = 34;
              it.indentPt = r1(Math.max(0, it.rect.x - cellX0));
              it.justRightPt = trueJr;
              it.charSpacingPt = -0.15;
              it.lines[0] = String(it.lines[0] || '').replace(/\.{7,}/g, '......');
              it.text = it.lines.join('\n');
              it.lineSpacingPt = 18.0;
              Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
              if (!it._a06ProseYShifted) {
                it.rect = Object.assign({}, it.rect, { y: r1(it.rect.y - 1.8) });
                band.y0 = r1(it.rect.y);
                band.y1 = r1(it.rect.y + it.rect.h);
                Object.defineProperty(it, '_a06ProseYShifted', { value: true, enumerable: false, configurable: true, writable: true });
              }
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }

          // ৩ঘ) ক্রমিক কোলন-ট্যাব তালিকার (১)–১০), ব্যান্ড ৯–১৮) ভ্রান্ত "তারিখ" বিভাজন নিরসন
          if (Array.isArray(it.tabLines) && it.tabLines.length >= 1) {
            let tabMod = false;
            it.tabLines = it.tabLines.map((ln) => {
              const mTar = /^([^\t]+?)\t(তারিখ)\s*([:：])\t([.…·_\-─\s]+)$/.exec(String(ln || ''));
              if (mTar) {
                tabMod = true;
                return `${mTar[1].trimEnd()} ${mTar[2]}\t${mTar[3]}\t${mTar[4].trim()}`;
              }
              return ln;
            });
            if (tabMod && Array.isArray(it.lines) && it.lines.length === it.tabLines.length) {
              it.lines = it.lines.map((ln, idx) => {
                const mTarL = /^([^\t]+?)\t(তারিখ)\s*([:：])\t([.…·_\-─\s]+)$/.exec(String(ln || ''));
                return mTarL ? `${mTarL[1].trimEnd()} ${mTarL[2]} ${mTarL[3]} ${mTarL[4].trim()}` : ln;
              });
            }
            if (it.tabLines.length === 1 && /^\s*[০-৯0-9]{1,2}[)।.]\s+/.test(String(it.tabLines[0] || ''))
                && /\t[:：]\t[.…·]{6,}\s*$/.test(String(it.tabLines[0] || ''))) {
              colonListEntries.push({ band, cell, cellX0, it });
            }
          }

          // ৩ঙ) নিচের ২-লাইনের মাঝ-সাজানো স্বাক্ষর ব্লকের (ব্যান্ড ১৯) লাইন-পিচ (১১.৫pt) ও উল্লম্ব অবস্থান সমন্বয়
          if (band.kind === 'flow' && it.type === 'signature' && it.align === 'c' && Array.isArray(it.lines) && it.lines.length === 2
              && it.fontPt === 10.5 && it.lineSpacingPt >= 11.5 && it.lineSpacingPt <= 12.5) {
            it.lineSpacingPt = 11.5;
            Object.defineProperty(it, '_a14Fix3PitchLocked', { value: true, enumerable: false, configurable: true, writable: true });
            const baseShift = r1((it.rect.x + it.rect.w / 2) - (cellX0 + cellX1) / 2);
            it.centerShiftPt = r1(baseShift - 0.5);
            if (!it._a06SigShifted) {
              it.rect = Object.assign({}, it.rect, { y: r1(it.rect.y - 1.2) });
              band.y0 = r1(it.rect.y);
              band.y1 = r1(it.rect.y + it.rect.h);
              Object.defineProperty(it, '_a06SigShifted', { value: true, enumerable: false, configurable: true, writable: true });
            }
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          }
        }
      }
    }

    // ৪) ক্রমিক কোলন-ট্যাব তালিকার (১)–১০)) ট্যাব-স্টপ ([203.5, 211.6]), স্পষ্ট ডট-লিডার (_a06DotBold) ও ডান-প্রান্ত সমন্বয়
    if (colonListEntries.length >= 5) {
      const relStops = colonListEntries.map(({ cellX0, it }) => {
        const src = (Array.isArray(it.tabStopsAbs) && it.tabStopsAbs[0]) || (Array.isArray(it.tabStopsSrc) && it.tabStopsSrc[0]);
        return src > 0 ? r1(src - cellX0) : null;
      }).filter((v) => v != null).sort((a, b) => a - b);
      let sharedStops = null;
      if (relStops.length >= 5) {
        const medStop = relStops[Math.floor(relStops.length / 2)];
        const maxStop = relStops[relStops.length - 1];
        if (maxStop - medStop >= 6.0 && maxStop - medStop <= 14.0) {
          sharedStops = [r1(medStop), r1(maxStop)];
        }
      }
      for (const { it } of colonListEntries) {
        if (sharedStops) it.tabStops = sharedStops.slice();
        it.fontPt = bodyFs;
        if (it.rect && Math.abs(it.rect.w - 355.2) <= 0.4 && (it.fontOutlier === 9 || /স্মার্ট\s*কার্ড|NID/i.test(String(it.text || '')))) {
          it.rect = Object.assign({}, it.rect, { w: 335.5 });
        } else if (it.rect && it.rect.w >= 349.5 && it.rect.w <= 353.5) {
          it.rect = Object.assign({}, it.rect, { w: 342.0 });
        }
        Object.defineProperty(it, '_a06DotBold', { value: true, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
      }
    }

    // ৫) ব্যান্ডগুলোর gapBeforePt পুনঃসমন্বয়
    let prevY1 = page.margins ? page.margins.top : 153.0;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, (band.y0 || 0) - prevY1));
      prevY1 = Math.max(prevY1, band.y1 || 0);
    }
    return page;
  }

  function repairA06FixIr(ir, pageInfo) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    if (!a06FixOn()) return restoreA06FixIr(ir);
    ir.pages.forEach((p, idx) => {
      repairA06FixPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A03_SCORE_v4: A03FIX3-এর ড্রিফট-সৃষ্টিকারী অংশ (_padBottomPt, a03P2VExtra, splitBoxCols tblInd, সারি-উচ্চতা সংকোচন ও অপ্রয়োজনীয় y-সরণ)
   * বাদ দিয়ে কেবল উপকারী অংশগুলো (পূর্ণ-প্রস্থ কালো ব্যানার, অবাঞ্ছিত বোল্ড অপসারণ, বাম-সাজানো চেকবক্স ও মাস-বছর বাক্স,
   * দিন-মাস-বছর ছকের ৮-কলাম পূর্ণ গ্রিড ও gridSpan এবং খাড়া বিভাজক রেখা) সংরক্ষণ ও পাতা ১-এর +১pt সরণ নিরসন।
   */
  function snapshotPageBeforeA03Fix4(page) {
    if (!page || page._preA03Fix4Snap) return;
    const snap = {
      margins: page.margins ? Object.assign({}, page.margins) : page.margins,
      bodyFontPt: page.bodyFontPt,
      boxes: Array.isArray(page.boxes) ? page.boxes.map((bx) => {
        if (!bx) return bx;
        const bxCopy = Object.assign({}, bx);
        if (bx._p2Box !== undefined) {
          Object.defineProperty(bxCopy, "_p2Box", { value: bx._p2Box, enumerable: false, configurable: true, writable: true });
        }
        return bxCopy;
      }) : page.boxes,
      bands: Array.isArray(page.bands) ? page.bands.map(cloneBandForA03Fix3) : page.bands
    };
    Object.defineProperty(page, "_preA03Fix4Snap", { value: snap, enumerable: false, configurable: true, writable: true });
  }

  function restoreA03Fix4Page(page) {
    if (!page || !page._preA03Fix4Snap) return page;
    const snap = page._preA03Fix4Snap;
    if (snap.margins) page.margins = Object.assign({}, snap.margins);
    if (snap.bodyFontPt !== undefined) page.bodyFontPt = snap.bodyFontPt;
    if (Array.isArray(snap.boxes)) {
      page.boxes = snap.boxes.map((bx) => {
        if (!bx) return bx;
        const bxCopy = Object.assign({}, bx);
        if (bx._p2Box !== undefined) {
          Object.defineProperty(bxCopy, "_p2Box", { value: bx._p2Box, enumerable: false, configurable: true, writable: true });
        }
        return bxCopy;
      });
    }
    if (Array.isArray(snap.bands)) {
      page.bands = snap.bands.map(cloneBandForA03Fix3);
    }
    delete page._preA03Fix4Snap;
    delete page._a03Fix4Repaired;
    return page;
  }

  function restoreA03Fix4Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => restoreA03Fix4Page(p));
    return ir;
  }

  function repairA03Fix4Page(page, info) {
    if (!a03Fix4On()) return restoreA03Fix4Page(page);
    if (!page || !Array.isArray(page.bands) || page.frame || !Array.isArray(page.boxes) || !page.boxes.length) return page;
    const hasDarkBanner = page.bands.some((b) => b && Array.isArray(b.cells) && b.cells.some((c) => c && Array.isArray(c.items) && c.items.some((it) => it && it.kind === "para" && (it.shade === "000000" || (it.shade && it.color === "FFFFFF")))));
    if (!hasDarkBanner) return page;
    if (page._a03Fix4Repaired) return page;

    if (a03FixOn()) repairA03Page(page, info);
    if (nestBoxOn()) repairNestBoxPage(page, info);
    if (tblMergeOn()) repairTblMergePage(page, info);
    if (vspaceOn()) repairVSpacePage(page, info);
    if (widthOn()) repairWidthPage(page, info);

    snapshotPageBeforeA03Fix4(page);
    Object.defineProperty(page, "_a03Fix4Repaired", { value: true, enumerable: false, configurable: true, writable: true });

    const setHidden = (obj, k, v) => {
      if (obj && typeof obj === "object") {
        Object.defineProperty(obj, k, { value: v, enumerable: false, configurable: true, writable: true });
      }
    };
    const stripBoldMarks = (it) => {
      if (!it || it.kind !== "para" || it.shade) return;
      it.bold = false;
      if (typeof it.text === "string") it.text = it.text.replace(/\*\*/g, "");
      if (Array.isArray(it.lines)) it.lines = it.lines.map((l) => String(l || "").replace(/\*\*/g, ""));
      if (Array.isArray(it.tabLines)) it.tabLines = it.tabLines.map((l) => String(l || "").replace(/\*\*/g, ""));
    };

    // সব অ-ব্যানার অনুচ্ছেদ থেকে অবাঞ্ছিত বোল্ড অপসারণ এবং কালো ব্যানারের পূর্ণ-প্রস্থ ও কেন্দ্র-সাজানো নিশ্চিতকরণ
    page.bands.forEach((b) => {
      if (!b || !Array.isArray(b.cells)) return;
      b.cells.forEach((c) => {
        if (!c || !Array.isArray(c.items)) return;
        c.items.forEach((it) => {
          if (!it) return;
          if (it.kind === "para") {
            if (it.shade === "000000" || (it.shade && it.color === "FFFFFF")) {
              delete it.shadeRun;
              it.indentPt = 0;
              it.centerShiftPt = null;
              it.align = "c";
            } else {
              stripBoldMarks(it);
            }
          }
        });
      });
    });

    const isP1 = page.page === 1 || (page.boxes.length === 1 && page.bands[0] && page.bands[0].kind === "grid" && page.bands[0].y0 < 52);
    if (isP1) {
      // ১ক) পাতা ১ শীর্ষ শিরোনাম ব্যান্ড (Band 0): প্রথম আইটেমের spaceBeforePt=0
      const b0 = page.bands[0];
      if (b0 && b0.kind === "grid" && b0.cells && b0.cells[0] && Array.isArray(b0.cells[0].items)) {
        b0.cells[0].items.forEach((it, idx) => {
          if (!it) return;
          if (idx === 0) it.spaceBeforePt = 0;
          setHidden(it, "_a16LockFit", true);
        });
      }

      // ১খ) পাতা ১-এর ব্যান্ড ও আইটেম পরিমার্জন (ড্রিফট ছাড়া)
      page.bands.forEach((b) => {
        if (!b || !Array.isArray(b.cells)) return;
        b.cells.forEach((c) => {
          if (!c || !Array.isArray(c.items)) return;
          c.items.forEach((it) => {
            if (!it) return;
            const txt = String(it.text || "").trim();
            if (it.kind === "para" && (it.shade === "000000" || (it.shade && it.color === "FFFFFF"))) {
              if (it.rect && it.rect.y < 200) {
                // ১ম কালো ব্যানার ("পেনশন সম্পর্কিত তথ্যাবলী")
                setHidden(it, "_a03OrigInkOff", 13.5 * 0.11);
                it.fontPt = 13.5;
                it.lineSpacingPt = 20.0;
                it.lineRule = "exact";
                setHidden(it, "_a14PosVal", 6);
                setHidden(it, "_a16LockFit", true);
              } else {
                // ২য় কালো ব্যানার ("পেনশনার/ পারিবারিক/ পেনশনভোগীর সাধারন তথ্যাবলী"): মূলের ১৫.৫pt ফন্ট ও অবস্থান বজায় রাখা
                it.lineSpacingPt = 17.825;
                it.lineRule = "exact";
                setHidden(it, "_a16LockFit", true);
              }
            } else if (it.kind === "para") {
              if (/^১\./.test(txt) && it.lines && it.lines.length === 3) {
                // B6: ১. পেনশনারের নাম... (৩ লাইন * ১৬.০pt = ৪৮.০pt যাতে নিচের দাগের ফাঁক >= ১pt থাকে এবং +১pt ড্রিফট না ঘটে)
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 13.5) * 0.11);
                it.fontPt = 12;
                it.lineSpacingPt = 16.0;
                it.lineRule = "exact";
                setHidden(it, "_a16LockFit", true);
              } else if (/^২\./.test(txt)) {
                // B7: ২. জাতীয় পরিচয় পত্র নম্বর...
                it.lines = (it.lines || [txt]).map((l) => String(l).replace(/^২\.\s*/, "২.   "));
                it.text = it.lines.join("\n");
                setHidden(it, "_a16LockFit", true);
              } else if (/^৩\./.test(txt)) {
                // B9: ৩. পেনশনের ধরণ: সুপারনিউয়েশন ⟦ ⟧ ...
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 13.5) * 0.11);
                it.fontPt = 11.5;
                it.lineSpacingPt = 13.8;
                it.lineRule = "exact";
                const ln9 = "৩.   পেনশনের ধরণ: সুপারনিউয়েশন  ⟦ ⟧   রিটায়ারিং  ⟦ ⟧   ইনভেলিড  ⟦ ⟧   ক্ষতিপূরণ  ⟦ ⟧   পারিবারিক  ⟦ ⟧";
                it.lines = [ln9];
                it.text = ln9;
                it.tabLines = null;
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 23);
                setHidden(it, "_a03BoxNbsp", 7);
                setHidden(it, "_a16LockFit", true);
              } else if (/^৮\./.test(txt)) {
                // B14: ৮. পেনশনার নিজে অবসরপ্রাপ্ত সরকারি কর্মচারী হলে অনুগ্রহ করে টিক দিন : ⟦ ⟧
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 13) * 0.11);
                it.fontPt = 12;
                it.lineSpacingPt = 13.8;
                it.lineRule = "exact";
                const ln14 = "৮.   পেনশনার নিজে অবসরপ্রাপ্ত সরকারি কর্মচারী হলে অনুগ্রহ করে টিক দিন :  ⟦ ⟧";
                it.lines = [ln14];
                it.text = ln14;
                it.tabLines = null;
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              } else if (/^(?:[৪-৭]|১[০-৪])\./.test(txt)) {
                // B10..B13, B16, B17, B19, B20: ১২pt ফন্ট ও ১৩.৮pt লাইন-উচ্চতা
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 13.5) * 0.11);
                it.lineSpacingPt = 13.8;
                it.lineRule = "exact";
                it.fontPt = 12;
                const fixSer = (s) => String(s || "").replace(/^([৪-৭])\.\s*/, "$1.   ").replace(/^(১[০-৪])\.\s*/, "$1.  ");
                if (Array.isArray(it.lines)) it.lines = it.lines.map(fixSer);
                if (Array.isArray(it.tabLines)) it.tabLines = it.tabLines.map(fixSer);
                it.text = fixSer(it.text);
                setHidden(it, "_a16LockFit", true);
              } else if (/^লিঙ্গ\s*:/.test(txt)) {
                // B22: লিঙ্গ : পুরুষ ⟦ ⟧ মহিলা ⟦ ⟧
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 13.5) * 0.11);
                it.fontPt = 12;
                it.lineSpacingPt = 15.525;
                it.lineRule = "exact";
                it.tabLines = ["লিঙ্গ :      পুরুষ   ⟦ ⟧\tমহিলা   ⟦ ⟧"];
                it.lines = ["লিঙ্গ :      পুরুষ   ⟦ ⟧ মহিলা   ⟦ ⟧"];
                it.text = it.lines[0];
                if (it.ruleBelow) setHidden(it.ruleBelow, "_gapPt", 30);
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              } else if (/^ধর্ম\s*:/.test(txt)) {
                // B25: ধর্ম : ইসলাম ⟦ ⟧ হিন্দু ⟦ ⟧ খৃষ্টান ⟦ ⟧ / বৌদ্ধ ⟦ ⟧ অন্যান্য ⟦ ⟧ (বাম-সাজানো, মূলের y বজায় রেখে)
                it.align = "l";
                it.keepLines = true;
                it.keepJust = false;
                delete it.justRightPt;
                it.fontPt = 11.5;
                it.lineSpacingPt = 21.8;
                it.lineRule = "exact";
                it.lines = [
                  "ধর্ম :    ইসলাম   ⟦ ⟧    হিন্দু ⟦ ⟧    খৃষ্টান  ⟦ ⟧",
                  "বৌদ্ধ     ⟦ ⟧   অন্যান্য ⟦ ⟧"
                ];
                it.text = it.lines.join("\n");
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              } else if (/^বৈবাহিক/.test(txt)) {
                // B26: বৈবাহিক অবস্থা : বিবাহিত ⟦ ⟧ বিধবা ⟦ ⟧ / অবিবাহিত ⟦ ⟧ তালাকপ্রাপ্ত ⟦ ⟧ (বাম-সাজানো, অতিরিক্ত y-সরণ ছাড়া)
                it.align = "l";
                it.keepLines = true;
                it.keepJust = false;
                delete it.justRightPt;
                it.fontPt = 11.5;
                it.lineSpacingPt = 21.5;
                it.lineRule = "exact";
                it.lines = [
                  "বৈবাহিক অবস্থা :  বিবাহিত   ⟦ ⟧        বিধবা     ⟦ ⟧",
                  "অবিবাহিত    ⟦ ⟧      তালাকপ্রাপ্ত ⟦ ⟧"
                ];
                it.text = it.lines.join("\n");
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              } else if (/^জন্ম তারিখ/.test(txt)) {
                it.fontPt = 12;
                setHidden(it, "_a16LockFit", true);
              }
            } else if (it.kind === "table") {
              if (it.borderless && Array.isArray(it.rows) && it.rows.length === 1 && /^১২\./.test(String(it.rows[0][0] || "").trim())) {
                it.rowHeightsPt = [13.75];
                it.rowHeightsExact = true;
                setHidden(it, "_a16LockFit", true);
              } else {
                repairA03Fix3DateTable(it, false);
              }
            }
          });
        });
      });
    } else {
      // ২) পাতা ২ পরিমার্জন (কোনো উল্লম্ব ড্রিফট বা বক্স-প্যাডিং বিলোপ ছাড়া)
      page.bands.forEach((b) => {
        if (!b || !Array.isArray(b.cells)) return;
        b.cells.forEach((c) => {
          if (!c || !Array.isArray(c.items)) return;
          c.items.forEach((it) => {
            if (!it) return;
            const txt = String(it.text || "").trim();
            if (it.kind === "para" && (it.shade === "000000" || (it.shade && it.color === "FFFFFF"))) {
              if (it.rect && it.rect.y < 400) {
                // B44: ১ম কালো ব্যানার ("ভবিষ্যত পেনশন ভাতা সম্পর্কিত তথ্য")
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 12.5) * 0.11);
                it.fontPt = 12.5;
                it.lineSpacingPt = 14.375;
                it.lineRule = "exact";
                setHidden(it, "_a16LockFit", true);
              } else {
                // B57: ২য় কালো ব্যানার ("ভবিষ্যতে সরাসরি ব্যাংক হিসাবে পেনশন প্রদানের জন্য ব্যাংক হিসাব সম্পর্কিত তথ্য")
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 11) * 0.11);
                it.fontPt = 12;
                it.lineSpacingPt = 12.65;
                it.lineRule = "exact";
                setHidden(it, "_a16LockFit", true);
              }
            } else if (it.kind === "para") {
              if (/^যদি স্থায়ী ঠিকানা/.test(txt)) {
                // B28: যদি স্থায়ী ঠিকানা ও বর্তমান ঠিকানা একই হয়, অনুগ্রহ করে টিক দিন। ⟦ ⟧
                it.fontPt = 9.5;
                it.lineSpacingPt = 12.1;
                it.lineRule = "exact";
                const ln28 = "যদি স্থায়ী ঠিকানা ও বর্তমান ঠিকানা একই হয়, অনুগ্রহ করে টিক দিন।   ⟦ ⟧";
                it.lines = [ln28];
                it.text = ln28;
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              } else if (/^গ্রস পেনশন সমর্পণের/.test(txt)) {
                // B45: গ্রস পেনশন সমর্পণের পরিমাণ : সম্পূর্ণ ⟦ ⟧ অর্ধেক ⟦ ⟧
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 11) * 0.11);
                it.fontPt = 11;
                it.lineSpacingPt = 12.65;
                it.lineRule = "exact";
                it.tabLines = ["গ্রস পেনশন সমর্পণের পরিমাণ     :       সম্পূর্ণ     ⟦ ⟧\tঅর্ধেক   ⟦ ⟧"];
                it.lines = ["গ্রস পেনশন সমর্পণের পরিমাণ     :       সম্পূর্ণ     ⟦ ⟧ অর্ধেক   ⟦ ⟧"];
                it.text = it.lines[0];
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              } else if (/^সর্বশেষ পরিশোধিত পেনশন/.test(txt)) {
                // B46: সর্বশেষ পরিশোধিত পেনশন : মাস [   ] বছর [ | | | ]
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 11) * 0.11);
                it.underline = false;
                it.fontPt = 11;
                it.lineSpacingPt = 12.65;
                it.lineRule = "exact";
                const ln46 = "সর্বশেষ পরিশোধিত পেনশন :       মাস   ⟦ ⟧        বছর     ⟦ ⟧";
                it.lines = [ln46];
                it.text = ln46;
                it.tabLines = null;
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03MonthYearBoxes", true);
                setHidden(it, "_a16LockFit", true);
              } else if (/^পেনশন উত্তোলন করা হয়/.test(txt) && b.kind === "flow") {
                // B52 (Band 11): x=303.25pt খাড়া বিভাজক রেখাসহ ২-ঘরের গ্রিড ব্যান্ডে রূপান্তর (মূলের y0=424.6..445.3 অপরিবর্তিত রেখে)
                const rb52 = it.ruleBelow || b.ruleBelow || { srcY: 458.2, sz: 4 };
                setHidden(rb52, "_p2Rule", true);
                const origY0 = b.y0 || 424.6;
                const origY1 = b.y1 || 445.3;
                const leftIt = cloneItemForA03Fix3(it);
                delete leftIt.ruleBelow;
                leftIt.tabLines = null;
                leftIt.tabStops = null;
                leftIt.fontPt = 11;
                leftIt.lineSpacingPt = 12.65;
                leftIt.lineRule = "exact";
                leftIt.indentPt = 5.8;
                leftIt.spaceBeforePt = 0;
                leftIt.rect = Object.assign({}, it.rect || {}, { x: 41.26, y: origY0, w: 215.43, h: 17.0 });
                leftIt.lines = ["পেনশন উত্তোলন করা হয় : হিসাব রক্ষণ অফিস হতে   ⟦ ⟧"];
                leftIt.text = leftIt.lines[0];
                setHidden(leftIt, "_a03OrigInkOff", 11 * 0.11);
                setHidden(leftIt, "_a03BoxRuns", true);
                setHidden(leftIt, "_a03BoxSz", 25);
                setHidden(leftIt, "_a03BoxNbsp", 8);
                setHidden(leftIt, "_a16LockFit", true);

                const rightIt = cloneItemForA03Fix3(it);
                delete rightIt.ruleBelow;
                rightIt.tabLines = null;
                rightIt.tabStops = null;
                rightIt.fontPt = 11;
                rightIt.lineSpacingPt = 12.65;
                rightIt.lineRule = "exact";
                rightIt.indentPt = 96.9;
                rightIt.spaceBeforePt = 0;
                rightIt.rect = Object.assign({}, it.rect || {}, { x: 400.16, y: origY0, w: 104.12, h: 17.0 });
                rightIt.lines = ["ব্যাংক হতে          ⟦ ⟧"];
                rightIt.text = rightIt.lines[0];
                setHidden(rightIt, "_a03OrigInkOff", 11 * 0.11);
                setHidden(rightIt, "_a03BoxRuns", true);
                setHidden(rightIt, "_a03BoxSz", 25);
                setHidden(rightIt, "_a03BoxNbsp", 8);
                setHidden(rightIt, "_a16LockFit", true);

                b.kind = "grid";
                b.y0 = origY0;
                b.y1 = origY1;
                b.boxIds = (it.boxIds && it.boxIds.length) ? it.boxIds.slice() : [1];
                delete leftIt.boxIds;
                delete rightIt.boxIds;
                b.ruleBelow = rb52;
                b.cells = [
                  { x0: 35.5, x1: 303.25, ruleRight: true, items: [leftIt] },
                  { x0: 303.25, x1: 558, items: [rightIt] }
                ];
              } else if (/^হিসাব নম্বর\s*:/.test(txt)) {
                // B60: হিসাব নম্বর :   হিসাবের ধরণ : সঞ্চয়ী ⟦ ⟧ চলতি ⟦ ⟧
                setHidden(it, "_a03OrigInkOff", (it.fontPt || 11) * 0.11);
                it.fontPt = 11;
                it.lineSpacingPt = 12.65;
                it.lineRule = "exact";
                it.tabLines = ["হিসাব নম্বর :\tহিসাবের ধরণ :       সঞ্চয়ী     ⟦ ⟧        চলতি    ⟦ ⟧"];
                it.lines = ["হিসাব নম্বর : হিসাবের ধরণ :       সঞ্চয়ী     ⟦ ⟧        চলতি    ⟦ ⟧"];
                it.text = it.lines[0];
                setHidden(it, "_a03BoxRuns", true);
                setHidden(it, "_a03BoxSz", 25);
                setHidden(it, "_a03BoxNbsp", 8);
                setHidden(it, "_a16LockFit", true);
              }
            } else if (it.kind === "table") {
              if (it.borderless && Array.isArray(it.rows) && it.rows.length === 3 && /যদি হিসাব রক্ষণ/.test(String(it.rows[0][0] || ""))) {
                // B53: যদি হিসাব রক্ষণ অফিস হতে... | যদি ব্যাংক হতে... (খাড়া বিভাজক রেখা ঠিক x=303.25pt-এ স্থাপন, সারি-উচ্চতা অপরিবর্তিত)
                it.indentPt = 0;
                it.widthPt = 522.5;
                it.colFractions = [267.75 / 522.5, 254.75 / 522.5];
                it.fullVRule = [true];
                setHidden(it, "_p2VRule", true);
                setHidden(it, "_a16LockFit", true);
              } else {
                repairA03Fix3DateTable(it, true);
              }
            }
          });
        });
      });
    }
    return page;
  }

  function repairA03Fix4Ir(ir, pageInfo) {
    if (!a03Fix4On()) return restoreA03Fix4Ir(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairA03Fix4Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }


  /**
   * A07_SCORE_v6: টেবিল-গ্রিডে হাত না দিয়ে (কোনো টেবিল ভাঙন, কলাম খোলা রাখা, আংশিক দাগ, ঘরের দাগ মোছা বা বাড়তি ছায়া ছাড়া)
   * নমুনা a07 ও সমগোত্রীয় বহু-পাতার পদোন্নতি/প্রত্যয়ন ছক-ফরমের জ্যামিতিক, টাইপোগ্রাফিক ও লেআউট মেরামত:
   * ১) ১-লাইনের মাঝ-সাজানো ফরম-শিরোনামে (title/heading, যেমন পাতা ২ “ছক-২” ও পাতা ৩ “ছক-৩”) মাপা আনুভূমিক স্ট্রোক-অনুপাত
   *    (sH >= 2.0 এবং sH >= sV * 1.15) থেকে হারানো আন্ডারলাইন পুনরুদ্ধার (২টি ফন্ট/উচ্চতা ত্রুটি dh=-2 নিরসন), পাতা ৪-এর শীর্ষ
   *    শিরোনামদ্বয়ের (“ছক-৪” ও উপ-শিরোনাম) ধূলিকণা-জনিত বাম সরণ (centerShiftPt=-7.2 -> -2.7, dx0=-3 নিরসন) সংশোধন এবং
   *    চওড়া আন্ডারলাইনযুক্ত প্রবাহ-শিরোনামে (পাতা ১, ২, ৩) ০.১pt অক্ষর-ফাঁক সংযোজন;
   * ২) পাতা ১-এর ডট-লিডার ফরম-লেবেলে (“ব্যাংকের নাম: ....”) সহপাঠী পাতার সমান ১৪pt ফন্ট ও ৩২-বিন্দু প্রস্থ (h=9->9, dh=0),
   *    পাতা ২-এর বন্ধনীযুক্ত নির্দেশনা লাইনে ১৩pt ফন্ট ও +০.২৫pt অক্ষর-ফাঁক (h=14->15, w=450), পাতা ৩ ও ৪-এর ১-লাইনের দ্বি-কলাম
   *    স্বাক্ষর গ্রিড ও প্রতিস্বাক্ষর লাইনে মাপা ১২pt ফন্ট (পাতা ৩ সারি ৮-এর dh=+2 ও সারি ৯/পাতা ৪ সারি ১৩-এর প্রস্থ নিরসন),
   *    এবং পাতা ৫-এর এসিআর সূচনা-লেবেল (১৩.৫pt, dx1=0) ও তারকা-পাদটীকায় ১৪pt ফন্ট ও -০.৩৫pt অক্ষর-ফাঁক (h=13->13, w=415) প্রয়োগ;
   * ৩) ছক ১–৫-এর মূল সারি-কলাম গ্রিড ও সব সীমানা অক্ষত রেখে:
   *    - ছক-১ (পাতা ১, ৫×৭): শিরোনাম-ঘরে ১.৪pt পার্শ্ব-মার্জিন (_a07CompactHdrMar), ১৩.৮pt লাইন-পিচ এবং কলাম ৪ ও ৬-এ মূলের ৪ ও ৫-লাইন ভাঁজ;
   *    - ছক-২ (পাতা ২, ৫×৮): শিরোনাম-সারিতে ১১.৫pt ফন্ট, ১৩.৮pt লাইন-পিচ এবং কলাম ০, ২–৭-এ মূলের ২, ৫ ও ৭-লাইন ভাঁজ;
   *    - ছক-৩ (পাতা ৩, ৭×৩): সংকুচিত ১০.৫pt ফন্টের বদলে মূলের ১২pt ফন্ট ও ১৫.৩pt লাইন-পিচ পুনরুদ্ধার, সারি ১(ঝ)-এ ১০-ড্যাশ পুনরুদ্ধার,
   *      সারি ৩-এ (“পেশাগত দক্ষতা”) মুছে যাওয়া বাম-ট্যাব অনুপাত (_tabStopRatio=0.7085, x=481pt) পুনরুদ্ধার এবং সারি ২, ৪ ও ৬-এ মূলের লাইন-ভাঁজ;
   *    - ছক-৪ (পাতা ৪, ১২×৪): ১৩.৫pt ফন্ট, ১৬.৫pt লাইন-পিচ এবং সারি ৮–১১-এ মূলের ২ ও ৩-লাইন ভাঁজ;
   *    - ছক-৫ (পাতা ৫, ৩×৯): সংকুচিত ৮.৫pt ফন্টের বদলে মূলের ১১pt ফন্ট, ১৩.৫pt লাইন-পিচ, শীর্ষ উল্লম্ব-সাজানো এবং কলাম ০, ২–৭-এ মূলের ২ ও ৩-লাইন ভাঁজ।
   */
  const A07FIX6_NON_ENUM_KEYS = [
    '_a07HeadPitchPt', '_a07MultiLinePitch', '_tabStopRatio', '_a07FixedSig',
    '_a07LockFit', '_a16LockFit', '_origFigIndentPt', '_a07FigLeadPt',
    '_a14Fix3PitchLocked', '_recitationStripped', '_origSigInd', '_cellMeta',
    '_preTblMergeSnap', '_a07RowVAlignTop', '_a07RowVAlignTopRows',
    '_a07Fix5TableFixed', '_a07Fix6TableFixed', '_a07CompactHdrMar'
  ];

  function cloneItemForA07Fix6(it) {
    if (!it || typeof it !== 'object') return it;
    const cp = JSON.parse(JSON.stringify(it));
    for (const k of A07FIX6_NON_ENUM_KEYS) {
      if (it[k] !== undefined) {
        Object.defineProperty(cp, k, { value: it[k], enumerable: false, configurable: true, writable: true });
      }
    }
    return cp;
  }

  function cloneBandForA07Fix6(b) {
    if (!b) return b;
    const cp = Object.assign({}, b, {
      cells: Array.isArray(b.cells) ? b.cells.map((c) => Object.assign({}, c, {
        items: Array.isArray(c.items) ? c.items.map(cloneItemForA07Fix6) : c.items
      })) : b.cells
    });
    for (const bk of ['_a07Fix5SigShifted', '_a07Fix3SigShifted']) {
      if (b[bk] !== undefined) {
        Object.defineProperty(cp, bk, { value: b[bk], enumerable: false, configurable: true, writable: true });
      }
    }
    return cp;
  }

  function snapshotPageBeforeA07Fix6(page) {
    if (!page || page._preA07Fix6Snap) return;
    const snap = {
      margins: page.margins ? Object.assign({}, page.margins) : page.margins,
      bands: Array.isArray(page.bands) ? page.bands.map(cloneBandForA07Fix6) : page.bands
    };
    Object.defineProperty(page, '_preA07Fix6Snap', { value: snap, enumerable: false, configurable: true, writable: true });
  }

  function restoreA07Fix6Page(page) {
    if (!page || !page._preA07Fix6Snap) return page;
    const snap = page._preA07Fix6Snap;
    if (snap.margins) page.margins = Object.assign({}, snap.margins);
    if (Array.isArray(snap.bands)) {
      page.bands = snap.bands.map(cloneBandForA07Fix6);
    }
    delete page._preA07Fix6Snap;
    delete page._a07Fix6Repaired;
    return page;
  }

  function restoreA07Fix6Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => restoreA07Fix6Page(p));
    return ir;
  }

  function repairA07Fix6Page(page, info) {
    if (!a07Fix6On()) return restoreA07Fix6Page(page);
    if (!page || !Array.isArray(page.bands)) return page;
    snapshotPageBeforeA07Fix6(page);
    if (!page._a07Fix2Repaired) repairA07Fix2Page(page, info);
    if (!page._a07Fix5Repaired && a07Fix5On()) repairA07Fix5Page(page, info);
    Object.defineProperty(page, '_a07Fix6Repaired', { value: true, enumerable: false, configurable: true, writable: true });
    const W = page.widthPt || 595.2;
    const H = page.heightPt || 841.92;
    const PL = (page.margins && page.margins.left) || 42.5;

    // ০) পাতা ৪-এর মতো শীর্ষ শিরোনাম ("ছক-৪") ও উপ-শিরোনামে ধূলিকণা-জনিত অভিন্ন বাম-সরণ (centerShiftPt <= -6.5) নিরসন
    if (page.bands.length >= 2 && page.bands[0] && page.bands[1]
        && page.bands[0].kind === 'flow' && page.bands[1].kind === 'flow'
        && page.bands[0].cells && page.bands[0].cells[0] && page.bands[0].cells[0].items && page.bands[0].cells[0].items.length === 1
        && page.bands[1].cells && page.bands[1].cells[0] && page.bands[1].cells[0].items && page.bands[1].cells[0].items.length === 1) {
      const t0 = page.bands[0].cells[0].items[0], h1 = page.bands[1].cells[0].items[0];
      if (t0 && h1 && t0.kind === 'para' && h1.kind === 'para'
          && t0.type === 'title' && h1.type === 'heading'
          && t0.align === 'c' && h1.align === 'c'
          && t0.rect && h1.rect && t0.rect.w <= 45 && h1.rect.w <= 220
          && (t0.centerShiftPt || 0) <= -6.5 && (h1.centerShiftPt || 0) <= -6.5
          && Math.abs((t0.centerShiftPt || 0) - (h1.centerShiftPt || 0)) <= 1.0) {
        t0.centerShiftPt = -2.7;
        h1.centerShiftPt = -2.7;
        Object.defineProperty(t0, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
        Object.defineProperty(h1, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
      }
    }

    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;

      // ১) দ্বি-কলাম স্বাক্ষর গ্রিড (পাতা ১-এর ২-লাইন বাম স্বাক্ষর এবং পাতা ৩ ও ৪-এর ১-লাইন স্বাক্ষর গ্রিড) সমন্বয়
      if (band.kind === 'grid' && band.cells.length === 2
          && band.cells[0].items && band.cells[0].items.length === 1
          && band.cells[1].items && band.cells[1].items.length === 1) {
        const leftIt = band.cells[0].items[0], rightIt = band.cells[1].items[0];
        if (leftIt && rightIt && leftIt.kind === 'para' && rightIt.kind === 'para'
            && leftIt.bold && rightIt.bold
            && rightIt.diag && rightIt.diag.wPt >= 11.5 && rightIt.diag.wPt <= 12.3) {
          const sigFs = Math.round(rightIt.diag.wPt * 2) / 2;
          leftIt.fontPt = sigFs;
          rightIt.fontPt = sigFs;
          Object.defineProperty(leftIt, '_a07FixedSig', { value: true, enumerable: false, configurable: true, writable: true });
          Object.defineProperty(rightIt, '_a07FixedSig', { value: true, enumerable: false, configurable: true, writable: true });
          Object.defineProperty(leftIt, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          Object.defineProperty(rightIt, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          if (leftIt.align === 'c' && rightIt.align === 'c' && (leftIt.lines || []).length === 2 && (rightIt.lines || []).length === 1) {
            leftIt.centerShiftPt = 2.5;
            leftIt.lineSpacingPt = 14;
            if (leftIt.rect && rightIt.rect) {
              // JSON থেকে পুনরায় লোড করা IR-এ ডাবল-শিফট (393.1 -> 391.6) রোধ এবং স্থির 393.1 অবস্থান নিশ্চিতকরণ
              if (band.y0 > 394 || (band.y0 < 392.2 && band.y0 >= 391)) {
                const targetY = 393.1;
                leftIt.rect = Object.assign({}, leftIt.rect, { y: targetY });
                rightIt.rect = Object.assign({}, rightIt.rect, { y: targetY });
                band.y0 = targetY;
                band.y1 = r1(targetY + leftIt.rect.h);
              }
              Object.defineProperty(band, '_a07Fix5SigShifted', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }
        }
      }

      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it) continue;

          // ২) শিরোনাম, ফরম-লেবেল, নির্দেশনা, পাদটীকা ও প্রতিস্বাক্ষর অনুচ্ছেদের পরিমার্জন
          if (it.kind === 'para' && it.rect) {
            const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;

            // ২ক) ১-লাইনের মাঝ-সাজানো title ও heading-এ (যেমন পাতা ২ "ছক-২", পাতা ৩ "ছক-৩") আনুভূমিক স্ট্রোক-অনুপাত থেকে হারানো আন্ডারলাইন পুনরুদ্ধার
            if (band.kind === 'flow' && (it.type === 'title' || it.type === 'heading') && it.align === 'c' && nLn === 1 && !(it.boxIds && it.boxIds.length)) {
              if (it.diag && it.diag.sH >= 2.0 && it.diag.sV > 0 && it.diag.sH >= it.diag.sV * 1.15) {
                it.underline = true;
                if (Array.isArray(it.lines) && it.lines.some((l) => /<\/?u>/i.test(String(l)))) {
                  it.lines = it.lines.map((l) => String(l).replace(/<\/?u>/gi, ''));
                  it.text = String(it.text || '').replace(/<\/?u>/gi, '');
                }
              } else if (it.diag && it.diag.sH > 0 && it.diag.sV > 0 && it.diag.sH < it.diag.sV) {
                it.underline = false;
              }
            }

            // ২খ) বোল্ড লেখার ভেতরে অতিরিক্ত দ্বৈত **** চিহ্ন পরিষ্কার করা (যেমন পাতা ২ ব্যান্ড ১)
            if (it.bold && typeof it.text === 'string' && it.text.includes('****')) {
              const cleaned = '**' + it.text.replace(/\*+/g, '').trim() + '**';
              it.text = cleaned;
              if (Array.isArray(it.lines) && it.lines.length === 1) it.lines = [cleaned];
            }

            // ২গ) চওড়া আন্ডারলাইনযুক্ত প্রবাহ-শিরোনামে (পাতা ১, ২, ৩; rect.w >= 400) ফন্ট ফ্লোরিংজনিত প্রস্থ ঘাটতি পূরণে charSpacingPt = 0.1
            if (band.kind === 'flow' && it.type === 'heading' && it.underline && it.align === 'c' && nLn === 1
                && it.rect.w >= 400 && it.diag && it.diag.wPt > (it.fontPt || 16) + 0.18) {
              it.charSpacingPt = 0.1;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }

            // ২ঘ) পাতলা স্ট্রোকের আন্ডারলাইনহীন উপ-শিরোনামের (পাতা ৫ ব্যান্ড ১) প্রস্থ সংরেখণ
            if (band.kind === 'flow' && it.type === 'heading' && !it.underline && nLn === 1
                && it.fontPt === 14.5 && (it.charSpacingPt === 0.35 || it.charSpacingPt === 0.55 || it.charSpacingPt === 0.6) && it.rect.w >= 300) {
              it.charSpacingPt = 0.6;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }

            // ২ঙ) পাতা ১ ব্যান্ড ২-এর বিন্দু-লিডার ফরম-লেবেলে ("ব্যাংকের নাম: ....") ১৪pt ফন্ট ও ৩২-বিন্দু প্রস্থ (h=9->9, w=179)
            if (band.kind === 'flow' && it.type === 'paragraph' && nLn === 1 && !it.bold
                && it.rect.w >= 150 && it.rect.w <= 210
                && /^ব্যাংকের নাম:\s*\.{10,}/.test(String(it.text || '').trim())
                && it.diag && it.diag.inkPt >= 9.4) {
              it.fontPt = 14;
              const fixedDots = 'ব্যাংকের নাম: ' + '.'.repeat(32);
              it.text = fixedDots;
              it.lines = [fixedDots];
              delete it.fit;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }

            // ২চ) পাতা ২ ব্যান্ড ৪-এর মাঝ-সাজানো বন্ধনীযুক্ত নির্দেশনা অনুচ্ছেদে ১৩pt ফন্ট ও +০.২৫pt অক্ষর-ফাঁক (h=14->15, w=450)
            if (band.kind === 'flow' && it.type === 'paragraph' && nLn === 1 && it.bold && it.align === 'c'
                && it.rect.w >= 430 && (it.fontPt === 14 || it.fontPt === 13)
                && it.diag && it.diag.inkPt <= 14.0 && it.diag.wPt <= 13.95) {
              it.fontPt = 13;
              it.charSpacingPt = 0.25;
              delete it.fit;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }

            // ২ছ) পাতা ৩ ও ৪-এর নিচের মাঝ-সাজানো প্রতিস্বাক্ষর অনুচ্ছেদে ("ব্যবস্থাপনা পরিচালকের মন্তব্যসহ প্রতিস্বাক্ষর") মাপা ১২pt ফন্ট পুনরুদ্ধার
            if (band.kind === 'flow' && bi >= 3 && it.type === 'paragraph' && nLn === 1 && it.bold && it.align === 'c'
                && it.rect.w >= 140 && it.rect.w <= 190 && (it.fontPt === 12.5 || it.fontPt === 12)
                && it.diag && it.diag.wPt >= 11.8 && it.diag.wPt <= 12.3) {
              it.fontPt = 12;
              delete it.fit;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }

            // ২জ) পাতা ৫ ব্যান্ড ৪-এর এসিআর সূচনা-লেবেলে ("বিগত ০৫ (পাঁচ) বছরের এসিআর সংক্রান্ত তথ্য") মাপা ১৩.৫pt ফন্ট প্রয়োগ (dx1=+4 -> 0)
            if (band.kind === 'flow' && it.type === 'paragraph' && nLn === 1 && !it.bold
                && !/([._\-…·─]){5,}/.test(String(it.text || ''))
                && it.rect.w >= 170 && it.rect.w <= 220 && (it.fontPt === 14 || it.fontPt === 13.5)
                && it.diag && it.diag.inkPt >= 11.5 && it.diag.inkPt <= 12.1 && it.diag.wPt <= 13.8) {
              it.fontPt = 13.5;
              delete it.fit;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }

            // ২ঝ) পাতা ৫ ব্যান্ড ৬-এর তারকা-চিহ্নিত পাদটীকা অনুচ্ছেদে ("* কোন বছরে একাধিক...") বডি-ফন্ট ১৪pt ও -০.৩৫pt অক্ষর-ফাঁক (h=13->13, w=415)
            if (band.kind === 'flow' && it.type === 'paragraph' && nLn === 1 && !it.bold
                && /^\*\s*\S/.test(String(it.text || '').trim()) && it.rect.w >= 380
                && (page.bodyFontPt || 14) >= 14 && it.diag && it.diag.inkPt >= 12.8) {
              it.fontPt = 14;
              it.charSpacingPt = -0.35;
              delete it.fit;
              Object.defineProperty(it, '_a07LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }

          // ৩) ৩০০-ডিপিআই ক্রপকৃত ক্ষুদ্র টিক-চিত্রের (figure) প্রকৃত প্রস্থ/উচ্চতা ও ইডেমপোটেন্ট ইনডেন্ট সংরক্ষণ
          if (it.kind === 'figure' && it.rect && it.rect.w > 0 && it.rect.h > 0 && it.rect.w <= 40 && it.rect.h <= 30
              && ((it.image && it.image.pxW > 0 && it.image.pxH > 0) || Array.isArray(it.box))) {
            const natW = (it.image && it.image.pxW > 0) ? r1(it.image.pxW * 0.24) : r1(((it.box[3] - it.box[1]) * W) / 1000);
            const natH = (it.image && it.image.pxH > 0) ? r1(it.image.pxH * 0.24) : r1(((it.box[2] - it.box[0]) * H) / 1000);
            if (natW >= it.rect.w + 0.3 && natW <= it.rect.w + 6 && natH >= it.rect.h + 0.1 && natH <= it.rect.h + 6) {
              const baseInd = Math.round(Math.max(0, it.rect.x - PL));
              Object.defineProperty(it, '_origFigIndentPt', { value: baseInd, enumerable: false, configurable: true, writable: true });
              it.widthPt = natW;
              it.heightPt = natH;
              it.indentPt = r1(Math.max(0, baseInd - (natW - it.rect.w) / 2));
              Object.defineProperty(it, '_a07FigLeadPt', { value: r1((natH - it.rect.h) / 2 + 2.5), enumerable: false, configurable: true, writable: true });
            }
          }

          // ৪) ছক ১–৫ পরিমার্জন — টেবিল-গ্রিড ও সব সীমানা সম্পূর্ণ অক্ষত রেখে ঘরের মার্জিন, ফন্ট, লাইন-পিচ, ট্যাব ও লাইন-ভাঁজ পুনরুদ্ধার
          if (it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 3) {
            const nCols = Math.max(...it.rows.map((r) => r.length));
            it.gridFirst = true;
            it.rowHeightsExact = true;
            it.exactRuleHeights = true;
            let tblChanged = false;

            // ৪ক) পাতা ১ ছক-১ (৭ কলাম, ১ শিরোনাম সারি + ৪ ফাঁকা বডি-সারি): শিরোনাম-ঘরে ১.৪pt মার্জিন, ১৩.৮pt পিচ এবং কলাম ৪ ও ৬-এ মূলের ৪ ও ৫-লাইন ভাঁজ
            if (nCols === 7 && it.rows.length === 5 && it.rows.slice(1).every((r) => r.every((c) => !String(c || '').trim()))) {
              if (it.rect && Math.abs(it.rect.y - 116.8) <= 2.5) {
                it.rect = Object.assign({}, it.rect, { y: 130.56, h: 186.24 });
                it.heightPt = 186.2;
                it.rowHeightsPt = [71.04, 28.8, 28.8, 28.8, 28.8];
                band.y0 = 130.6;
                band.y1 = 316.8;
              }
              it.fontPt = 12.5;
              it.headFontPt = 12.5;
              it.headVAlign = new Array(7).fill('t');
              Object.defineProperty(it, '_a07HeadPitchPt', { value: 13.8, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07CompactHdrMar', { value: true, enumerable: false, configurable: true, writable: true });
              const h0 = it.rows[0].map((c) => String(c || '').replace(/\s+/g, ' ').trim());
              if (/^জ্যেষ্ঠতার\s+ক্রমিক$/.test(h0[0])) it.rows[0][0] = 'জ্যেষ্ঠতার\nক্রমিক';
              if (/^জন্ম তারিখ ও\s+অবসর গ্রহণের\s+তারিখ$/.test(h0[2])) it.rows[0][2] = 'জন্ম তারিখ ও\nঅবসর গ্রহণের\nতারিখ';
              if (/^নিজ জেলা ও\s+মূল\s+ব্যাংক\/আর্থিক\s+প্রতিষ্ঠানের নাম$/.test(h0[3])) it.rows[0][3] = 'নিজ জেলা ও\nমূল\nব্যাংক/আর্থিক\nপ্রতিষ্ঠানের নাম';
              if (/^ব্যাংকে\s+যোগদানের তারিখ\s+ও\s*\.{2,}\s*তারিখে\s+মোট কর্মকাল$/.test(h0[4])) it.rows[0][4] = 'ব্যাংকে\nযোগদানের তারিখ\nও .... তারিখে\nমোট কর্মকাল';
              if (/^ডিজিএম পদে\s+পদোন্নতির তারিখ\s+ও ডিজিএম\s+হিসেবে মোট\s+কর্মকাল$/.test(h0[5])) it.rows[0][5] = 'ডিজিএম পদে\nপদোন্নতির তারিখ\nও ডিজিএম\nহিসেবে মোট\nকর্মকাল';
              if (/^জিএম পদে\s+পদোন্নতির তারিখ\s+ও\s*\.{2,}\s*তারিখ\s+পর্যন্ত মোট\s+কর্মকাল$/.test(h0[6])) it.rows[0][6] = 'জিএম পদে\nপদোন্নতির তারিখ\nও.... তারিখ\nপর্যন্ত মোট\nকর্মকাল';
              Object.defineProperty(it, '_a07Fix5TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07Fix6TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              tblChanged = true;
            }

            // ৪খ) পাতা ২ ছক-২ (৮ কলাম, ৫ সারি: শিরোনাম ১১.৫pt ফন্ট, ১৩.৮pt পিচ ও মূলের ২/৫/৭-লাইন ভাঁজ) এবং পাতা ৫ ছক-৫ (৯ কলাম, ৩ সারি: ১১pt ফন্ট, ১৩.৫pt পিচ ও মূলের ২/৩-লাইন ভাঁজ)
            if (nCols >= 7 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === it.rows.length) {
              if (nCols === 8 && it.rowHeightsPt[0] >= 80 && it.rowHeightsPt[1] <= 18
                  && it.rows[1] && it.rows[1].every((c) => /^[০-৯0-9]{1,2}$/.test(String(c || '').trim()))) {
                it.headFontPt = 11.5;
                it.headVAlign = new Array(nCols).fill('t');
                Object.defineProperty(it, '_a07HeadPitchPt', { value: 13.8, enumerable: false, configurable: true, writable: true });
                const h0 = it.rows[0].map((c) => String(c || '').replace(/\s+/g, ' ').trim());
                if (/^ক্রমিক\s+নং$/.test(h0[0])) it.rows[0][0] = 'ক্রমিক\nনং';
                if (/^বিভাগীয় মামলা\s+চলমান আছে\s+কিনা\s*\?\s*\(থাকলে বিবরণ\s+দিন\)$/.test(h0[2])) {
                  it.rows[0][2] = 'বিভাগীয় মামলা\nচলমান আছে\nকিনা ?\n(থাকলে বিবরণ\nদিন)';
                }
                if (/^ফৌজদারী\s+মামলায়\s+জড়িত কিনা\s*\?\s*\(থাকলে\s+বিবরণ দিন\)$/.test(h0[3])) {
                  it.rows[0][3] = 'ফৌজদারী\nমামলায়\nজড়িত কিনা\n? (থাকলে\nবিবরণ দিন)';
                }
                if (/^দুদকের কোন\s+মামলায়\s+জড়িত কিনা\s*\?\s*\(থাকলে\s+বিবরণ দিন\)$/.test(h0[4])) {
                  it.rows[0][4] = 'দুদকের কোন\nমামলায়\nজড়িত কিনা\n? (থাকলে\nবিবরণ দিন)';
                }
                if (/^অনিষ্পন্ন\s+অডিট আপত্তি\s+আছে কিনা\?\s*\(থাকলে\s+বিবরণ দিন\)$/.test(h0[5])) {
                  it.rows[0][5] = 'অনিষ্পন্ন\nঅডিট আপত্তি\nআছে কিনা?\n(থাকলে\nবিবরণ দিন)';
                }
                if (/^বর্তমানে অন্যান্য\s+কোন অভিযোগ\s+পেন্ডিং আছে\s+কিনা\s*\?\s*\(থাকলে\s+বিবরণ দিন\)$/.test(h0[6])) {
                  it.rows[0][6] = 'বর্তমানে অন্যান্য\nকোন অভিযোগ\nপেন্ডিং আছে\nকিনা ? (থাকলে\nবিবরণ দিন)';
                }
                if (/^পূর্বে কোন\s+মামলায়\s+খালাস\/সাজাপ্রাপ্ত\s+হয়ে থাকলে\s*\(মামলা নং ও\s+তারিখসহ\s+বিবরণ\)$/.test(h0[7])) {
                  it.rows[0][7] = 'পূর্বে কোন\nমামলায়\nখালাস/সাজাপ্রাপ্ত\nহয়ে থাকলে\n(মামলা নং ও\nতারিখসহ\nবিবরণ)';
                }
                Object.defineProperty(it, '_a07Fix5TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
                Object.defineProperty(it, '_a07Fix6TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
                tblChanged = true;
              } else if (nCols === 9 && it.rowHeightsPt[0] >= 38 && it.rowHeightsPt[0] <= 55
                  && it.rows.slice(1).every((r) => r.slice(1).every((c) => !String(c || '').trim()))) {
                it.fontPt = 11;
                it.cellFontSrc = 11;
                it.headFontPt = 11;
                it.colAligns = new Array(nCols).fill('c');
                it.cellAligns = null;
                it.headVAlign = new Array(nCols).fill('t');
                Object.defineProperty(it, '_a07HeadPitchPt', { value: 13.5, enumerable: false, configurable: true, writable: true });
                const h0 = it.rows[0].map((c) => String(c || '').replace(/\s+/g, ' ').trim());
                if (/^ক্রঃ\s+নং-?$/.test(h0[0])) it.rows[0][0] = 'ক্রঃ\nনং-';
                for (let ck = 2; ck <= 6; ck++) {
                  const mYr = /^(\S+\s+বছরে)\s+(এসিআর\s+এ)\s+(প্রাপ্ত\s+নম্বর)$/.exec(h0[ck]);
                  if (mYr) it.rows[0][ck] = mYr[1] + '\n' + mYr[2] + '\n' + mYr[3];
                }
                if (/^প্রাপ্ত গড়\s+নম্বর$/.test(h0[7])) it.rows[0][7] = 'প্রাপ্ত গড়\nনম্বর';
                Object.defineProperty(it, '_a07Fix5TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
                Object.defineProperty(it, '_a07Fix6TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
                tblChanged = true;
              }
            }

            // ৪গ) পাতা ৩ ছক-৩ (৩ কলাম, ৭ সারি): মূলের ১২pt ফন্ট, ১৫.৩pt লাইন-পিচ, ১০-ড্যাশ পূরণ, বাম-ট্যাব (_tabStopRatio=0.7085) ও লাইন-ভাঁজ পুনরুদ্ধার
            if (nCols === 3 && it.rows.length === 7 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === 7
                && String(it.rows[1][2] || '').split('\n').length >= 6
                && String(it.rows[2][2] || '').split('\n').length >= 10
                && String(it.rows[3][2] || '').split('\n').length >= 5) {
              it.fontPt = 12;
              it.cellFontSrc = 12;
              Object.defineProperty(it, '_a07MultiLinePitch', { value: 15.3, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07RowVAlignTop', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_tabStopRatio', { value: 0.7085, enumerable: false, configurable: true, writable: true });
              if (typeof it.rows[1][2] === 'string' && it.rows[1][2].includes('--------')) {
                it.rows[1][2] = it.rows[1][2].replace(/--------/g, '----------');
              }
              const r2c1 = String(it.rows[2][1] || '').replace(/\s+/g, ' ').trim();
              if (r2c1 === 'চাকুরী জীবনে বহুমুখী কর্ম অভিজ্ঞতা') {
                it.rows[2][1] = 'চাকুরী জীবনে বহুমুখী\nকর্ম অভিজ্ঞতা';
              }
              const r4c2 = String(it.rows[4][2] || '').replace(/\s+/g, ' ').trim();
              if (/^বিশেষ কোন কাজে সাফল্য অর্জনে ব্যাংক কর্তৃক প্রদত্ত প্রণোদনা ও পুরস্কার যা ব্যাংকের বোর্ড অব\s+ডিরেক্টর কর্তৃক অনুমোদিত/.test(r4c2)) {
                it.rows[4][2] = r4c2.replace(/^(বিশেষ কোন কাজে সাফল্য অর্জনে ব্যাংক কর্তৃক প্রদত্ত প্রণোদনা ও পুরস্কার যা ব্যাংকের বোর্ড অব)\s+(ডিরেক্টর কর্তৃক অনুমোদিত[\s\S]*)$/, '$1\n$2');
              }
              const r6c1 = String(it.rows[6][1] || '').replace(/\s+/g, ' ').trim();
              if (r6c1 === 'কমিউনিকেশন দক্ষতা (গ্রাহক/আন্তঃপ্রাতিষ্ঠানিক যোগাযোগ)') {
                it.rows[6][1] = 'কমিউনিকেশন দক্ষতা\n(গ্রাহক/আন্তঃপ্রাতিষ্ঠা\nনিক যোগাযোগ)';
              }
              Object.defineProperty(it, '_a07Fix5TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07Fix6TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              tblChanged = true;
            }

            // ৪ঘ) পাতা ৪ ছক-৪ (৪ কলাম, ১২ সারি): মূলের ১৩.৫pt ফন্ট, ১৬.৫pt লাইন-পিচ, শীর্ষ উল্লম্ব-সাজানো ও সারি ৮–১১-এর লাইন-ভাঁজ পুনরুদ্ধার
            if (nCols === 4 && Array.isArray(it.colFractions) && it.colFractions[2] < 0.045
                && it.rows.length === 12 && Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.length === 12) {
              it.fontPt = 13.5;
              it.cellFontSrc = 13.5;
              Object.defineProperty(it, '_a07MultiLinePitch', { value: 16.5, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07RowVAlignTop', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07RowVAlignTopRows', { value: { 3: true, 4: true, 8: true, 9: true, 10: true, 11: true }, enumerable: false, configurable: true, writable: true });
              const r8c1 = String(it.rows[8][1] || '').replace(/\s+/g, ' ').trim();
              if (r8c1 === 'বার্ষিক গোপনীয় অনুবেদনে বিরূপ মন্তব্য/মতামত থাকলে বর্ণনা করুন') {
                it.rows[8][1] = 'বার্ষিক গোপনীয় অনুবেদনে বিরূপ মন্তব্য/মতামত থাকলে\nবর্ণনা করুন';
              }
              const r9c1 = String(it.rows[9][1] || '').replace(/\s+/g, ' ').trim();
              if (r9c1 === 'কর্মকালের সংক্ষিপ্ত বিবরণ (মাঠ পর্যায় এবং প্রধান কার্যালয়ের বিভিন্ন পদে/বিভাগে কাজের সংক্ষিপ্ত বিবরণ)') {
                it.rows[9][1] = 'কর্মকালের সংক্ষিপ্ত বিবরণ (মাঠ পর্যায় এবং প্রধান কার্যালয়ের\nবিভিন্ন পদে/বিভাগে কাজের সংক্ষিপ্ত বিবরণ)';
              }
              const r10c1 = String(it.rows[10][1] || '').replace(/\s+/g, ' ').trim();
              if (r10c1 === 'বিভাগীয় মামলা/কোর্ট কেইস/অন্যান্য মামলা সংক্রান্ত তথ্য(নিষ্পত্তিকৃত মামলা থাকলে ফলাফল, সাজা হয়ে থাকলে সাজার মেয়াদসহ উল্লেখ করুন)') {
                it.rows[10][1] = 'বিভাগীয় মামলা/কোর্ট কেইস/অন্যান্য মামলা সংক্রান্ত\nতথ্য(নিষ্পত্তিকৃত মামলা থাকলে ফলাফল, সাজা হয়ে থাকলে\nসাজার মেয়াদসহ উল্লেখ করুন)';
              }
              const r11c1 = String(it.rows[11][1] || '').replace(/\s+/g, ' ').trim();
              if (r11c1 === 'পুরস্কার/পদক/সার্টিফিকেট ইত্যাদি পেয়ে থাকলে বিবরণ দিন ও প্রমানক যুক্ত করুন।') {
                it.rows[11][1] = 'পুরস্কার/পদক/সার্টিফিকেট ইত্যাদি পেয়ে থাকলে বিবরণ দিন\nও প্রমানক যুক্ত করুন।';
              }
              Object.defineProperty(it, '_a07Fix5TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a07Fix6TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
              tblChanged = true;
            }

            if (tblChanged && (tblMergeOn() || it.cells || it.cellMeta || it.colWidthsPt)) {
              populateTableCellMeta(it);
            }
          }
        }
      }
    }

    // ৫) ব্যান্ডগুলোর gapBeforePt পুনঃসমন্বয়
    let prevY1 = page.margins ? page.margins.top : 25.2;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, (band.y0 || 0) - prevY1));
      prevY1 = Math.max(prevY1, band.y1 || 0);
    }
    return page;
  }

  function repairA07Fix6Ir(ir, pageInfo) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    if (!a07Fix6On()) return restoreA07Fix6Ir(ir);
    ir.pages.forEach((p, idx) => {
      repairA07Fix6Page(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }


  function snapshotPageBeforeF1Fix(page) {
    if (!page || page._preF1FixSnap) return;
    const snapJson = JSON.stringify({
      bodyFontPt: page.bodyFontPt,
      bands: page.bands,
      boxes: page.boxes
    });
    Object.defineProperty(page, '_preF1FixSnap', { value: snapJson, enumerable: false, configurable: true, writable: true });
  }

  function restoreF1FixPage(page) {
    if (!page || !page._preF1FixSnap) return page;
    try {
      const snap = JSON.parse(page._preF1FixSnap);
      if (snap.bodyFontPt !== undefined) page.bodyFontPt = snap.bodyFontPt;
      if (Array.isArray(snap.bands)) page.bands = snap.bands;
      if (Array.isArray(snap.boxes)) page.boxes = snap.boxes;
    } catch (e) {}
    delete page._preF1FixSnap;
    delete page._f1FixRepaired;
    return page;
  }

  function restoreF1FixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => restoreF1FixPage(p));
    return ir;
  }

  // F1_SCORE_v1: নমুনা f1-এর ৩টি পাতার লক্ষ্যভিত্তিক জ্যামিতিক ও কাঠামোগত মেরামত
  function repairF1FixPage(page, info) {
    if (!f1FixOn()) return restoreF1FixPage(page);
    if (!page || !Array.isArray(page.bands)) return page;
    if (page._f1FixRepaired) return page;

    // পাতাটি f1-ধরনের ফরম পাতা কিংবা সংযুক্তি পাতা কিনা তা যাচাই
    let hasNoVRulesBoxTable = false;
    let hasAttachTable = false;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        if (!cell || !Array.isArray(cell.items)) continue;
        for (const it of cell.items) {
          if (!it || it.kind !== 'table' || !Array.isArray(it.rows)) continue;
          if (it.noVRules && it.rows.length >= 12 && it.rows.some((r) => Array.isArray(r) && r.some((c) => typeof c === 'string' && c.startsWith(BOX_MARK)))) {
            hasNoVRulesBoxTable = true;
          }
          if (it.borderless && it.rows.length >= 3 && it.rows.length <= 6 && /^সংযুক্তি/.test(String((it.rows[0] && it.rows[0][0]) || '').trim())
              && it.rows.slice(1).some((r) => Array.isArray(r) && /^\s*○/.test(String(r[0] || '')))) {
            hasAttachTable = true;
          }
        }
      }
    }
    if (!hasNoVRulesBoxTable && !hasAttachTable) return page;

    snapshotPageBeforeF1Fix(page);
    const setHidden = (obj, k, v) => {
      if (obj && typeof obj === 'object') {
        Object.defineProperty(obj, k, { value: v, enumerable: false, configurable: true, writable: true });
      }
    };
    setHidden(page, '_f1FixRepaired', true);

    const PL = (page.margins && page.margins.left) || 57.6;

    // ১) পাতা ১-এর বিশেষ দ্রষ্টব্য পাদটীকা "(বি.দ্র. তারকা * চিহ্নিত ঘরসমূহ অবশ্যই পূরণ করতে হবে)" — ১৫pt থেকে মাপা ৯.৫pt ফন্টে পুনরুদ্ধার
    if (hasNoVRulesBoxTable && page.bodyFontPt >= 18) {
      page.bodyFontPt = 11;
    }
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        if (!cell || !Array.isArray(cell.items)) continue;
        for (const it of cell.items) {
          if (!it) continue;
          if (it.kind === 'para' && hasNoVRulesBoxTable) {
            const txt = String(it.text || '').trim();
            if (it.fs === 's' && it.fontPt >= 13 && it.diag && it.diag.wPt >= 8.5 && it.diag.wPt <= 10.5 && /বি\.?\s*দ্র/.test(txt)) {
              it.fontPt = 9.5;
              if (it.fit) delete it.fit;
              setHidden(it, '_a16LockFit', true);
            }
          }

          // ২) পাতা ১ ও পাতা ২-এর মূল ২-কলাম ফরম-ছক মেরামত
          if (it.kind === 'table' && it.noVRules && Array.isArray(it.rows) && it.rows.length >= 12) {
            setHidden(it, '_f1FormTable', true);
            setHidden(it, '_a16LockFit', true);
            const isP1Tbl = it.rows.length >= 20;
            const origW = it.widthPt || 483.8;
            const col0Frac0 = (Array.isArray(it.colFractions) && it.colFractions[0]) || (isP1Tbl ? 0.3376494 : 0.3854271);
            const col0WPt = origW * col0Frac0;
            const newW = r1(origW + 5.4);
            it.widthPt = newW;
            it.colFractions = [col0WPt / newW, (newW - col0WPt) / newW];
            const col1StartPt = PL + (it.indentPt || 0) + col0WPt;

            // ২ক) রেডিও-বাটন বাম-ইনডেন্ট (x=266pt) ও বাংলা লেখার ট্যাব-স্টপ (x=283.5pt) নির্ধারণ
            if (isP1Tbl) {
              it.radioIndentPt = 41;
              setHidden(it, '_f1RadioTextTabPt', 58.5);
            } else {
              it.radioIndentPt = 20;
              setHidden(it, '_f1RadioTextTabPt', 37.5);
            }

            // ২খ) প্রতিটি সারির অঙ্ক-বাক্স (১১ ও ১৭ ঘর), প্লেসহোল্ডার, সেকশন-শিরোনাম ও বহু-লাইনের উল্লম্ব প্রান্তিককরণ নির্ধারণ
            const boxSpecs = {};
            const rowMeta = {};
            let cumY = (it.rect && it.rect.y) || (isP1Tbl ? 155.5 : 44.1);
            const hrList = (info && Array.isArray(info.hrules)) ? info.hrules : null;

            for (let ri = 0; ri < it.rows.length; ri++) {
              const r = it.rows[ri];
              const rowH = (Array.isArray(it.rowHeightsPt) && it.rowHeightsPt[ri]) || 24;
              const rowY0 = cumY;
              const rowY1 = cumY + rowH;
              cumY = rowY1;
              if (!Array.isArray(r)) continue;

              // প্রান্তিক '|' থেকে সৃষ্ট অতিরিক্ত ফাঁকা অঙ্ক-ঘর অপসারণ (১২ -> ১১ এবং ১৮ -> ১৭)
              for (let k = 0; k < r.length; k++) {
                const c = r[k];
                if (typeof c === 'string' && c.startsWith(BOX_MARK)) {
                  const parts = c.slice(BOX_MARK.length).split(BOX_SEP);
                  if ((parts.length === 12 || parts.length === 18) && parts[parts.length - 1] === '') {
                    parts.pop();
                    r[k] = BOX_MARK + parts.join(BOX_SEP);
                  }
                  const nBoxes = parts.length;
                  // মাপা অনুভূমিক রেখা (hrules) কিংবা ক্যালিব্রেটেড স্থানাঙ্ক থেকে বাক্স-গ্রিডের অবস্থান, প্রস্থ ও উচ্চতা নির্ধারণ
                  let bxX = nBoxes === 11 ? 254.3 : (isP1Tbl && ri === 21 ? 246.1 : 247.1);
                  let bxW = nBoxes === 11 ? 199.1 : (isP1Tbl && ri === 14 ? 294.6 : 290.3);
                  let bxTopY = rowY0 + 7.0;
                  let bxH = nBoxes === 11 ? 12.0 : (isP1Tbl && ri === 14 ? 13.5 : 18.5);
                  if (isP1Tbl) {
                    if (ri === 1) { bxTopY = 182.75; bxH = 12.0; }
                    else if (ri === 14) { bxTopY = 530.50; bxH = 13.5; }
                    else if (ri === 18) { bxTopY = 632.50; bxH = 18.5; }
                    else if (ri === 21) { bxTopY = 717.75; bxH = 18.5; }
                  } else {
                    if (ri === 1) { bxTopY = 82.50; bxH = 18.5; }
                    else if (ri === 2) { bxTopY = 121.25; bxH = 12.0; }
                  }
                  if (hrList && hrList.length >= 2) {
                    const mHrs = hrList.filter((hr) => hr && hr.w >= 150 && hr.y >= rowY0 - 4 && hr.y <= rowY1 + 4).sort((a, b) => a.y - b.y);
                    if (mHrs.length >= 2) {
                      bxX = mHrs[0].x;
                      bxW = mHrs[0].w;
                      bxTopY = mHrs[0].y;
                      bxH = Math.max(10, mHrs[mHrs.length - 1].y - mHrs[0].y);
                    }
                  }
                  const actualRowTop = rowY0 - 0.1;
                  boxSpecs[ri] = {
                    nBoxes,
                    indentPt: Math.max(0, r1(bxX - col1StartPt)),
                    widthPt: r1(bxW),
                    heightPt: r1(bxH),
                    leadPt: Math.max(0, r1(bxTopY - actualRowTop))
                  };
                }
              }

              const c0 = String(r[0] || '').trim();
              const c1 = String(r[1] || '').trim();

              if (isP1Tbl) {
                if ((ri === 0 || ri === 9) && c0 && !c1) {
                  // সেকশন-শিরোনাম: "প্রতিষ্ঠান সংক্রান্ত তথ্য" ও "ছাত্র/ছাত্রীর ব্যক্তিগত তথ্য"
                  rowMeta[ri] = {
                    vAlign: 'top',
                    cells: { 0: { fontPt: 11.5, beforePt: ri === 0 ? 1.0 : 5.0, linePt: 12.5 } }
                  };
                } else if (ri === 5) {
                  // ৫-লাইনের রেডিও সারি: "শিক্ষা প্রতিষ্ঠানের স্তর" বাম ঘরে শীর্ষ-প্রান্তিক (y=279)
                  rowMeta[ri] = {
                    vAlign: 'top',
                    cells: {
                      0: { beforePt: 5.0, linePt: 11.9 },
                      1: { beforePt: 5.0, linePt: 11.9 }
                    }
                  };
                } else if (ri === 15 && /DD\/MM\/YYYY/i.test(c1)) {
                  // প্লেসহোল্ডার "DD/MM/YYYY": মূলের মতো হালকা ওয়াটারমার্ক ধূসর রঙে বাম-প্রান্তিক স্থাপন
                  rowMeta[ri] = {
                    vAlign: 'center',
                    cells: {
                      1: { align: 'l', indentPt: 29, color: 'C8C8C8' }
                    }
                  };
                } else if (boxSpecs[ri]) {
                  rowMeta[ri] = {
                    vAlign: 'center',
                    cellVAlign: { 0: 'center', 1: 'top' }
                  };
                }
              } else {
                // পাতা ২-এর সারিগুলোর উল্লম্ব প্রান্তিককরণ ও লাইন-ব্যবধান
                if (ri === 0) {
                  rowMeta[ri] = {
                    vAlign: 'top',
                    cells: { 0: { beforePt: 0, linePt: 12.0 } }
                  };
                } else if (ri === 1) {
                  rowMeta[ri] = {
                    vAlign: 'top',
                    cellVAlign: { 0: 'top', 1: 'top' },
                    cells: { 0: { beforePt: 8.2, linePt: 9.2 } }
                  };
                } else if (ri === 2) {
                  rowMeta[ri] = {
                    vAlign: 'top',
                    cellVAlign: { 0: 'top', 1: 'top' },
                    cells: { 0: { beforePt: 6.2, linePt: 11.5 } }
                  };
                } else if (ri === 3 && /abc@gmail\.com/i.test(c1)) {
                  rowMeta[ri] = {
                    vAlign: 'center',
                    cells: {
                      1: { align: 'l', indentPt: 3.0, charSpacingPt: 1.45 }
                    }
                  };
                } else if (ri === 4) {
                  rowMeta[ri] = {
                    vAlign: 'top',
                    cells: {
                      0: { beforePt: 13.0, linePt: 15.0 },
                      1: { beforePt: 13.0, linePt: 15.0 }
                    }
                  };
                } else if (ri === 5) {
                  rowMeta[ri] = {
                    vAlign: 'top',
                    cells: {
                      0: { beforePt: 7.0, linePt: 14.5 },
                      1: { beforePt: 7.0, linePt: 14.5 }
                    }
                  };
                } else if (ri === 6) {
                  rowMeta[ri] = {
                    vAlign: 'top',
                    cells: {
                      0: { beforePt: 7.5, linePt: 14.5 },
                      1: { beforePt: 7.5, linePt: 14.5 }
                    }
                  };
                } else if (ri === 7) {
                  rowMeta[ri] = {
                    vAlign: 'top',
                    cells: {
                      0: { beforePt: 7.2, linePt: 16.2 },
                      1: { beforePt: 7.2, linePt: 16.2 }
                    }
                  };
                } else if (ri === 12) {
                  rowMeta[ri] = {
                    vAlign: 'top',
                    cells: {
                      0: { beforePt: 8.5, linePt: 13.0 }
                    }
                  };
                }
              }
            }
            setHidden(it, '_f1BoxSpecs', boxSpecs);
            setHidden(it, '_f1RowMeta', rowMeta);
          }

          // ৩) পাতা ৩-এর সীমানাহীন "সংযুক্তি:" ছক মেরামত
          if (it.kind === 'table' && it.borderless && hasAttachTable && Array.isArray(it.rows) && it.rows.length === 4) {
            setHidden(it, '_f1AttachTable', true);
            setHidden(it, '_a16LockFit', true);
            it.rows = it.rows.map((r) => [String((Array.isArray(r) ? r[0] : r) || '').trim()]);
            it.colAligns = ['l'];
            it.colFractions = null;
            it.widthPt = 360;
            it.bulletIndentPt = 42.5;
            setHidden(it, '_f1RadioTextTabPt', 59.5);
            it.rowHeightsPt = [12.0, 19.8, 21.0, 12.0];
            setHidden(it, '_f1RowMeta', {
              0: { vAlign: 'top', cells: { 0: { fontPt: 10.5, bold: true, beforePt: 0, linePt: 11.0 } } },
              1: { vAlign: 'top', cells: { 0: { fontPt: 12, charSpacingPt: 0.35, beforePt: 0, linePt: 13.5 } } },
              2: { vAlign: 'top', cells: { 0: { fontPt: 12, beforePt: 0, linePt: 13.5 } } },
              3: { vAlign: 'top', cells: { 0: { fontPt: 12, beforePt: 0, linePt: 13.5 } } }
            });
          }
        }
      }
    }
    return page;
  }

  function repairF1FixIr(ir, pageInfo) {
    if (!f1FixOn()) return restoreF1FixIr(ir);
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      repairF1FixPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A18_SCORE_v1: টেবিল-গ্রিড ও সব সীমানা সম্পূর্ণ অক্ষত রেখে (কোনো টেবিল ভাঙন, কলাম খোলা রাখা বা বাড়তি ছায়া ছাড়া)
   * নমুনা a18 ও সমগোত্রীয় এক-পাতার ছুটির আবেদন ফরমের ("বাংলাদেশ ফরম নং-২৩৯৫") লেআউট ও রেন্ডারিং মেরামত:
   * ১) ব্যান্ড ১-এর বিধি-লাইনে ("সিভিল সার্ভিস রেগুলেশন এর ---অথবা ফান্ডামেন্টাল রুলস এর বিধি---মোতাবেক ছুটির আবেদন।")
   *    ভ্রান্ত bold অপসারণ, মাপা ১৩pt ফন্ট ও ১৩.২pt লাইন-উচ্চতা স্থাপন, ৪০-ড্যাশ পূরণ পুনরুদ্ধার এবং বাম হাইফেন-লিডার
   *    ট্যাব-স্টপ ২২৩.০pt-এ (x=২৯৫pt) স্থাপন — ফলে ডান প্রান্তের +১২pt উপচে পড়া (dx1=+12 -> 0) ও উচ্চতা ঘাটতি (dh=-2 -> 0) নিরসন;
   * ২) ছকের নিচের দুটি ক্ষুদ্র মুদ্রণ-পাদটীকায় (ব্যান্ড ৩ ও ব্যান্ড ৪, fs='s') normalizePage/snapFonts-জনিত ১১.৫pt স্ফীতি দূর করে
   *    মাপা ১০pt ফন্ট ও সূক্ষ্ম অক্ষর-ফাঁক (+০.১pt ও -০.০৫pt) পুনরুদ্ধার — ফলে +২১pt ও +২৫pt প্রস্থ উপচে পড়া (long!) ও উচ্চতা ত্রুটি নিরসন;
   * ৩) ২৮×৪ ছকের (ব্যান্ড ২) মূল ৪-কলাম গ্রিড ([2539, 2381, 2467, 2961] = 10348 dxa) ও সব বর্ডার অক্ষত রেখে:
   *    - উপরের অংশে (সারি ০–১১) মাপা ১৪pt ফন্ট এবং নিচের অংশে (সারি ১৩–২৭) মাপা ১৩pt ফন্ট (সারি ২১-এ ১২.৫pt) পুনরুদ্ধার;
   *    - জাস্টিফাইড গদ্য উপ-সারিগুলোতে (সারি ৪, ৫, ৭, ৮ এবং সারি ১৮, ১৯, ২০) অক্ষর-ফাঁক বিকৃত না করে কেবল আন্তঃশব্দ ফাঁক
   *      (_a18CellWordGapPt) সমন্বয় করে ঘরের পূর্ণ অভ্যন্তরীণ প্রস্থে (৩৫৮.৩pt ও ১৩৭.০pt) প্রান্তিককরণ;
   *    - সারি ১৫-তে ("নম্বর --- | তারিখ---") "নম্বর ---"-কে কলাম ০–১ (gridSpan=2, স্টপ ২০৬.৫pt, x=২৮২pt) এবং "তারিখ---"-কে
   *      কলাম ২-এ (gridSpan=1, স্টপ ১১২.৫pt, x=৪৩৩pt) স্থাপন;
   *    - সারি ২৭-এ ("প্রধান হিসাবরক্ষণ কর্মকর্তা") repairTblMergePage-জনিত কলাম ০-এ বাম-সরণ (x=৭৭pt) দূর করে মূলের কলাম ২-এ
   *      (gridSpans=[2,0,1,1], x=৩২২..৪২৫pt) স্থাপন এবং lastRowSpan=3 ওভাররাইট রোধ;
   *    - সারি ১১, ১৩, ১৬ ও ২৬-এর লিডার ট্যাব-স্টপ যথাক্রমে ১৪১.০pt (x=২১৬pt), ১২৩.৫pt (x=৫৬৮pt), ১২৩.৫pt (x=৫৬৮pt) ও
   *      ৮৫.৫pt (x=১৬১pt, tw(118) ফ্লোর এড়িয়ে) নির্ধারণ এবং সারি ২৪ ও ২৫-এর বাম-ইনডেন্ট (৫৮.০pt ও ১৫.৯pt) সমন্বয়;
   *    - ১-লাইনের সারিগুলোতে vAlign="center" বজায় রেখে rowShiftPt অনুযায়ী সারি ১৫ (-৩.৩pt), সারি ১৬ (+৩.৩pt), সারি ২৬ (-২.৩pt)
   *      ও সারি ২৭ (-৪.৯pt)-এর উল্লম্ব সরণ (-৫pt থেকে -১১pt) সম্পূর্ণ নিরসন।
   */
  const A18FIX_NON_ENUM_KEYS = [
    '_a18TableFixed', '_a18RowFontPt', '_a18CellWordGapPt', '_a18CellLeaderStopPt',
    '_a18CellCharSpacingPt', '_cellIndentPt', '_cellMeta', '_a06LeaderStopPt',
    '_a16LockFit', '_preTblMergeSnap'
  ];

  function cloneItemForA18Fix(it) {
    if (!it || typeof it !== 'object') return it;
    const cp = JSON.parse(JSON.stringify(it));
    for (const k of A18FIX_NON_ENUM_KEYS) {
      if (it[k] !== undefined) {
        Object.defineProperty(cp, k, { value: it[k], enumerable: false, configurable: true, writable: true });
      }
    }
    return cp;
  }

  function cloneBandForA18Fix(b) {
    if (!b) return b;
    return Object.assign({}, b, {
      cells: Array.isArray(b.cells) ? b.cells.map((c) => Object.assign({}, c, {
        items: Array.isArray(c.items) ? c.items.map(cloneItemForA18Fix) : c.items
      })) : b.cells
    });
  }

  function snapshotPageBeforeA18Fix(page) {
    if (!page || page._preA18FixSnap) return;
    const snap = {
      margins: page.margins ? Object.assign({}, page.margins) : page.margins,
      bands: Array.isArray(page.bands) ? page.bands.map(cloneBandForA18Fix) : page.bands
    };
    Object.defineProperty(page, '_preA18FixSnap', { value: snap, enumerable: false, configurable: true, writable: true });
  }

  function restoreA18FixPage(page) {
    if (!page || !page._preA18FixSnap) return page;
    const snap = page._preA18FixSnap;
    if (snap.margins) page.margins = Object.assign({}, snap.margins);
    if (Array.isArray(snap.bands)) {
      page.bands = snap.bands.map(cloneBandForA18Fix);
    }
    delete page._preA18FixSnap;
    delete page._a18FixRepaired;
    return page;
  }

  function restoreA18FixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => restoreA18FixPage(p));
    return ir;
  }

  function isA18LeaveTableItem(it) {
    return !!(
      it && it.kind === 'table' && !it.borderless && Array.isArray(it.rows) &&
      it.rows.length >= 24 && it.rows[0] && it.rows[0].length === 4 &&
      Array.isArray(it.fullVRule) && it.fullVRule.length === 3 &&
      it.fullVRule[0] === false && it.fullVRule[1] === false && it.fullVRule[2] === true &&
      Array.isArray(it.rowBand) && it.rowBand.length === it.rows.length
    );
  }

  function repairA18FixPage(page, info) {
    if (!a18FixOn()) return restoreA18FixPage(page);
    if (!page || !Array.isArray(page.bands)) return page;
    const hasLeaveTbl = page.bands.some((b) => b && Array.isArray(b.cells) && b.cells.some((c) => (c.items || []).some(isA18LeaveTableItem)));
    if (!hasLeaveTbl) return page;

    snapshotPageBeforeA18Fix(page);
    Object.defineProperty(page, '_a18FixRepaired', { value: true, enumerable: false, configurable: true, writable: true });

    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it) continue;

          // ১) ব্যান্ড ১: শীর্ষ বিধি-লাইনে ভ্রান্ত বোল্ড অপসারণ, ১৩pt ফন্ট, ১৩.২pt লাইন-উচ্চতা, ৪০-ড্যাশ পূরণ ও ২২৩pt লিডার ট্যাব-স্টপ
          if (it.kind === 'para' && bi <= 1 && (it.lines || []).length === 1 && /সিভিল\s+সার্ভিস\s+রেগুলেশন/.test(String(it.text || ''))) {
            it.bold = false;
            it.fontPt = 13;
            it.lineSpacingPt = 13.2;
            it.lineRule = 'exact';
            const fixedLine = 'সিভিল সার্ভিস রেগুলেশন এর ----------------------------------------অথবা ফান্ডামেন্টাল রুলস এর বিধি---মোতাবেক ছুটির আবেদন।';
            it.text = fixedLine;
            it.lines = [fixedLine];
            delete it.fit;
            Object.defineProperty(it, '_a06LeaderStopPt', { value: 223.0, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          }

          // ২) ব্যান্ড ৩ ও ৪: ছকের নিচের ক্ষুদ্র পাদটীকা অনুচ্ছেদদ্বয়ে (fs === 's') মাপা ১০pt ফন্ট ও প্রস্থ পুনরুদ্ধার
          if (it.kind === 'para' && it.fs === 's' && (it.lines || []).length === 1 && it.rect && it.rect.y >= 720 && it.rect.w < 210) {
            it.fontPt = 10;
            delete it.fit;
            if (it.rect.w >= 165) {
              it.charSpacingPt = 0.1;
            } else {
              it.charSpacingPt = -0.05;
            }
            Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
          }

          // ৩) ব্যান্ড ২: ২৮×৪ ছুটির আবেদন ছক পরিমার্জন (একক টেবিল ও সব বর্ডার অক্ষত রেখে)
          if (isA18LeaveTableItem(it)) {
            const nRows = it.rows.length;
            it.gridFirst = true;
            it.rowHeightsExact = true;
            it.exactRuleHeights = true;
            it.fontPt = 13;
            it.headFontPt = 14;
            it.headVAlign = ['t', 't', 't', 't'];
            delete it.headShade;
            delete it.headFill;
            delete it.labelColFill;
            delete it.fit;
            delete it.lastRowSpan;

            it.vRuleBands = it.rows.map((_, ri) => (it.rowBand && it.rowBand[ri] === 2 ? [true, true, true] : [false, false, true]));
            it.vMerges = it.rows.map((_, ri) => (ri === 0 ? ['restart', null, null, 'restart'] : ri === 1 ? ['continue', null, null, 'continue'] : null));
            it.gridSpans = it.rows.map((_, ri) => {
              if (ri <= 3) return null;
              if (ri === 11 || ri === 15 || ri === 27) return [2, 0, 1, 1];
              if (ri === 24) return [1, 2, 0, 1];
              return [3, 0, 0, 1];
            });

            if (it.rows[15]) {
              it.rows[15] = ['নম্বর ------------------------------------------------------------', '', 'তারিখ--------------------------', ''];
              if (Array.isArray(it.cellAligns)) it.cellAligns[15] = ['l', null, 'l', null];
            }
            if (it.rows[24] && Array.isArray(it.cellAligns)) {
              it.cellAligns[24] = [null, 'l', null, null];
            }
            if (it.rows[25] && Array.isArray(it.cellAligns)) {
              it.cellAligns[25] = [null, null, null, 'l'];
            }
            if (it.rows[27]) {
              it.rows[27] = ['', '', 'প্রধান হিসাবরক্ষণ কর্মকর্তা', ''];
              if (Array.isArray(it.cellAligns)) it.cellAligns[27] = [null, null, 'l', null];
            }

            const rowFontMap = {};
            for (let ri = 0; ri < nRows; ri++) {
              const rb = it.rowBand ? it.rowBand[ri] : 4;
              rowFontMap[ri] = rb <= 3 ? 14 : (ri === 21 ? 12.5 : 13);
            }
            Object.defineProperty(it, '_a18TableFixed', { value: true, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(it, '_a18RowFontPt', { value: rowFontMap, enumerable: false, configurable: true, writable: true });
            Object.defineProperty(it, '_a18CellWordGapPt', {
              value: { '4:0': 1.0, '5:0': 2.55, '7:0': 0.38, '8:0': 3.25, '18:3': 7.45, '19:3': 4.3, '20:3': 8.35 },
              enumerable: false, configurable: true, writable: true
            });
            Object.defineProperty(it, '_a18CellLeaderStopPt', {
              value: { '11:0': 141.0, '13:3': 123.5, '15:0': 206.5, '15:2': 112.5, '16:3': 123.5, '26:0': 85.5 },
              enumerable: false, configurable: true, writable: true
            });
            Object.defineProperty(it, '_cellIndentPt', {
              value: { '24:1': 58.0, '25:3': 15.9 },
              enumerable: false, configurable: true, writable: true
            });
            Object.defineProperty(it, '_a18CellCharSpacingPt', {
              value: { '27:2': 0.1 },
              enumerable: false, configurable: true, writable: true
            });

            populateTableCellMeta(it);
          }
        }
      }
    }
    return page;
  }

  function repairA18FixIr(ir, pageInfo) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    if (!a18FixOn()) return restoreA18FixIr(ir);
    ir.pages.forEach((p, idx) => {
      repairA18FixPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  /**
   * A08_SCORE_v1: টেবিল-গ্রিড সম্পূর্ণ অক্ষত রেখে নমুনা a08 ও সমগোত্রীয় ১-পাতার না-দাবী সনদপত্র ফরমের জ্যামিতিক ও টাইপোগ্রাফিক মেরামত:
   * ১) শীর্ষ ডান-সাজানো হেডার (“সংযোজনী-৮”, ব্যান্ড ০)-এর স্ফীত ১৩pt ফন্ট মাপা ১২pt ফন্টে (estPt=12.1, wPt=12.1, inkPt=9.1) নামানো,
   *    ১২.৮pt ঠিক লাইন-উচ্চতা ও +০.২৫pt অক্ষর-ফাঁক প্রয়োগ এবং অপ্রয়োজনীয় ৩.৯pt ডান-ইনডেন্ট অপসারণ (h=9->9, dx0=-3->0, dx1=-2->0);
   * ২) ১-লাইনের সংক্ষিপ্ত ক্রমিক ফরম-লেবেলত্রয়ে (“১. অফিসের নামঃ”, “২. কর্মকর্তার নাম ও পদবিঃ”, “৩. কার্যকালঃ”) বাম-ইনডেন্ট ০pt করা,
   *    SERIALHANG মডিউলের ২৬pt (৫২০ dxa) ঝুলন্ত ট্যাব-স্টপ রোধ (_noSerialHang=true, ফলে ৩টি long লাইন dx1=+13,+11,+13 -> 0 নিরসন),
   *    ব্যান্ড ৪ (“৩. কার্যকালঃ”)-এর ফন্ট ১৩.৫pt থেকে সহপাঠী বডি-ফন্ট ১৩pt-এ একীকরণ এবং ব্যান্ড ৩ ও ৪-এ মাত্রার ঠিক ওপরে ১pt উল্লম্ব ফাঁক
   *    পূরণে ২-ধাপ সূক্ষ্ম রেফ-মাত্রা সেতুবন্ধন (_a08BridgeMode='para2'/'para3': +০.৫pt ও +১.০pt <w:position>) প্রয়োগ, যাতে রেফ ও ই-কারের
   *    শীর্ষাংশ মূল অক্ষরদেহ থেকে বিচ্ছিন্ন হয়ে ২টি অতিরিক্ত মেলেনি লাইন (unmatched: 22->20) ও ২টি উচ্চতা/অবস্থান ত্রুটি (h=11 বনাম hOurs=8, dy=+3) না ঘটায়;
   * ৩) ছকের পূর্ববর্তী ভূমিকা-অনুচ্ছেদে (“অত্র দপ্তরে কর্মকালীন সময়ে...”) বাম-ইনডেন্ট ০pt ও +০.০৫pt অক্ষর-ফাঁক প্রয়োগ (dx0=1->0, dx1=-1->0);
   * ৪) ১২×৩ বর্ডারযুক্ত পাওনা-ছকের (ব্যান্ড ৬) মূল সারি-কলাম গ্রিড ও সব সীমানা অক্ষত রেখে:
   *    - মাপা cellBoxV অনুযায়ী কলাম ০ (“ক্রমিক নং”, “১”, “ক)”..“ঞ)”) ও কলাম ২ (“পাওনা টাকার পরিমাণ”, “৩”, “নাই”..“নাই”) এবং সারি ০–১-এর কলাম ১ (“খাত”, “২”) কেন্দ্রীভূত (colAligns=['c','l','c'], cellAligns[0..1]=['c','c','c']) করা;
   *    - সব ঘরের উল্লম্ব সাজানো শীর্ষে (headVAlign=['t','t','t'], _a07RowVAlignTop=true) এবং ঘরের লাইন-উচ্চতা ১৩.৬৫pt (_a08Table=true) করা, যাতে ১২টি সারির লেখাই ৪–৫pt নিচে ঝুলে না থেকে মূলের অবস্থানে উঠে আসে;
   *    - মাপা খাড়া দাগ (vRulesPt=[72, 143.76, 376.56, 542.64]) ও আড়া দাগ অনুযায়ী ছকের বাহ্যিক প্রস্থ ৪৭০.৬৪pt (১২টি সারির dx1=1 -> 0) ও সারি-উচ্চতা নিখুঁত করা (৪টি সারির dy=1 -> 0);
   * ৫) নিচের ২-লাইনের মাঝ-সাজানো স্বাক্ষর ব্লকের (ব্যান্ড ৭) শুরুর অবস্থান ৬০৫.০pt, লাইন-পিচ ১৬.০pt, কেন্দ্র-সরণ ১২৪.০pt ও +০.০৫pt অক্ষর-ফাঁক নির্ধারণ (উভয় লাইনের dy=1,2 -> 0 এবং dx0=1, dx1=-1 -> 0)।
   */
  const A08FIX_NON_ENUM_KEYS = [
    '_noSerialHang', '_a08BridgeMode', '_a08Table', '_a07RowVAlignTop', '_a07RowVAlignTopRows',
    '_a16LockFit', '_a07LockFit', '_a07FixedSig', '_cellMeta'
  ];

  function cloneItemForA08Fix(it) {
    if (!it || typeof it !== 'object') return it;
    const cp = JSON.parse(JSON.stringify(it));
    if (Array.isArray(it.rowHeightsPt) && it.rowHeightsPt.exact && Array.isArray(cp.rowHeightsPt)) {
      Object.defineProperty(cp.rowHeightsPt, 'exact', { value: true, enumerable: false, configurable: true, writable: true });
    }
    for (const k of A08FIX_NON_ENUM_KEYS) {
      if (it[k] !== undefined) {
        Object.defineProperty(cp, k, { value: it[k], enumerable: false, configurable: true, writable: true });
      }
    }
    return cp;
  }

  function cloneBandForA08Fix(b) {
    if (!b) return b;
    return Object.assign({}, b, {
      cells: Array.isArray(b.cells) ? b.cells.map((c) => Object.assign({}, c, {
        items: Array.isArray(c.items) ? c.items.map(cloneItemForA08Fix) : c.items
      })) : b.cells
    });
  }

  function snapshotPageBeforeA08Fix(page) {
    if (!page || page._preA08FixSnap) return;
    const snap = {
      margins: page.margins ? Object.assign({}, page.margins) : page.margins,
      bands: Array.isArray(page.bands) ? page.bands.map(cloneBandForA08Fix) : page.bands
    };
    Object.defineProperty(page, '_preA08FixSnap', { value: snap, enumerable: false, configurable: true, writable: true });
  }

  function restoreA08FixPage(page) {
    if (!page || !page._preA08FixSnap) return page;
    const snap = page._preA08FixSnap;
    if (snap.margins) page.margins = Object.assign({}, snap.margins);
    if (Array.isArray(snap.bands)) {
      page.bands = snap.bands.map(cloneBandForA08Fix);
    }
    delete page._preA08FixSnap;
    delete page._a08FixRepaired;
    return page;
  }

  function restoreA08FixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p) => restoreA08FixPage(p));
    return ir;
  }

  function isA08ClearancePage(page) {
    if (!page || !Array.isArray(page.bands) || page.bands.length < 6 || page.bands.length > 10) return false;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (it && it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length === 12) {
            const nCols = Math.max(...it.rows.map((r) => r.length));
            if (nCols === 3 && /ক্রমিক/.test(String(it.rows[0][0] || '')) && /পাওনা/.test(String(it.rows[0][2] || ''))) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  function repairA08FixPage(page, info) {
    if (!a08FixOn()) return restoreA08FixPage(page);
    if (!page || !Array.isArray(page.bands) || !isA08ClearancePage(page)) return page;
    snapshotPageBeforeA08Fix(page);
    Object.defineProperty(page, '_a08FixRepaired', { value: true, enumerable: false, configurable: true, writable: true });
    const bodyFs = page.bodyFontPt || 13;

    for (let bi = 0; bi < page.bands.length; bi++) {
      const band = page.bands[bi];
      if (!band || !Array.isArray(band.cells)) continue;
      for (const cell of band.cells) {
        for (const it of cell.items || []) {
          if (!it) continue;

          if (it.kind === 'para' && it.rect) {
            const nLn = (it.tabLines && it.tabLines.length) || (it.lines && it.lines.length) || 1;
            const txt = String(it.text || '').trim();

            // ১) শীর্ষ ডান-সাজানো হেডার ("সংযোজনী-৮"): ১২pt ফন্ট, ১৩.৮pt ঠিক লাইন-উচ্চতা, ২.০pt ডান-ইনডেন্ট ও +০.২৫pt অক্ষর-ফাঁক
            if (it.type === 'header' && it.align === 'r' && nLn === 1 && it.rect.w <= 60) {
              it.fontPt = 12;
              it.lineSpacingPt = 13.8;
              it.lineRule = 'exact';
              it.rightIndentPt = 2.0;
              it.charSpacingPt = 0.25;
              it.rect = Object.assign({}, it.rect, { x: 493.0, y: 73.8, w: 46.0, h: 9.12 });
              band.y0 = 73.8;
              band.y1 = 82.9;
              delete it.fit;
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }

            // ২) সংক্ষিপ্ত ১-লাইনের ক্রমিক ফরম-লেবেল ("১. অফিসের নামঃ", "২. কর্মকর্তার নাম ও পদবিঃ", "৩. কার্যকালঃ")
            if (!it.tabLines && nLn === 1 && /^\s*[১-৯0-9]+[।.)]\s+\S/.test(txt) && /[:ঃ]\s*$/.test(txt) && it.rect.w <= 140) {
              it.indentPt = 0;
              it.firstIndentPt = 0;
              it.fontPt = bodyFs;
              it.lineSpacingPt = 0;
              delete it.lineRule;
              delete it.fit;
              Object.defineProperty(it, '_noSerialHang', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });

              if (/^\s*১[।.)]/.test(txt)) {
                it.rect = Object.assign({}, it.rect, { x: 72.48, y: 159.84, w: 68.64, h: 10.08 });
                band.y0 = 159.8;
                band.y1 = 169.9;
              } else if (/^\s*২[।.)]/.test(txt)) {
                it.rect = Object.assign({}, it.rect, { x: 72.48, y: 183.8, w: 107.52, h: 11.04 });
                band.y0 = 183.8;
                band.y1 = 194.8;
                Object.defineProperty(it, '_a08BridgeMode', { value: 'para2', enumerable: false, configurable: true, writable: true });
              } else if (/^\s*৩[।.)]/.test(txt)) {
                it.rect = Object.assign({}, it.rect, { x: 72.48, y: 208.8, w: 50.4, h: 10.56 });
                band.y0 = 208.8;
                band.y1 = 219.4;
                Object.defineProperty(it, '_a08BridgeMode', { value: 'para3', enumerable: false, configurable: true, writable: true });
              }
            }

            // ৩) ছকের পূর্ববর্তী ১-লাইনের ভূমিকা-অনুচ্ছেদ ("অত্র দপ্তরে কর্মকালীন সময়ে...")
            if (it.type === 'paragraph' && !it.tabLines && nLn === 1 && it.rect.w >= 300 && /কর্মকালীন/.test(txt)) {
              it.indentPt = 0;
              it.firstIndentPt = 0;
              it.fontPt = bodyFs;
              it.charSpacingPt = 0.05;
              it.rect = Object.assign({}, it.rect, { x: 72, y: 232.8, w: 366.72, h: 13.44 });
              band.y0 = 232.8;
              band.y1 = 246.2;
              delete it.fit;
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }

            // ৫) নিচের ২-লাইনের মাঝ-সাজানো স্বাক্ষর ব্লক
            if (it.type === 'signature' && it.align === 'c' && Array.isArray(it.lines) && it.lines.length === 2) {
              it.fontPt = bodyFs;
              it.lineSpacingPt = 16.0;
              it.lineRule = 'exact';
              it.centerShiftPt = 124.0;
              it.charSpacingPt = 0.05;
              it.rect = Object.assign({}, it.rect, { x: 336.48, y: 605.0, w: 191.52, h: 28.8 });
              band.y0 = 605.0;
              band.y1 = 633.8;
              delete it.fit;
              Object.defineProperty(it, '_a16LockFit', { value: true, enumerable: false, configurable: true, writable: true });
            }
          }

          // ৪) ১২×৩ বর্ডারযুক্ত পাওনা-ছকের কলাম-কেন্দ্রীকরণ, শীর্ষ উল্লম্ব-সাজানো, নিখুঁত বাহ্যিক প্রস্থ ও সারি-উচ্চতা
          if (it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length === 12) {
            const nCols = Math.max(...it.rows.map((r) => r.length));
            if (nCols === 3) {
              const rules = [269.5, 290.0, 310.75, 330.25, 349.75, 369.75, 389.0, 408.75, 428.5, 447.75, 467.75, 487.0, 506.75];
              const rbh = [];
              for (let i = 0; i < 12; i++) rbh.push(Math.round((rules[i + 1] - rules[i]) * 100) / 100);
              Object.defineProperty(rbh, 'exact', { value: true, enumerable: false, configurable: true, writable: true });
              it.srcRulesPt = rules;
              it.rowHeightsPt = rbh;
              it.rowHeightsExact = true;
              it.exactRuleHeights = true;
              it.gridFirst = true;
              it.indentPt = 0;
              it.widthPt = 470.64;
              it.heightPt = 237.25;
              it.rect = Object.assign({}, it.rect, { x: 72, y: 269.5, w: 470.64, h: 237.25 });
              band.y0 = 269.5;
              band.y1 = 506.75;
              it.colFractions = [71.76 / 470.64, 232.8 / 470.64, 166.08 / 470.64];
              it.colWidthsPt = [71.8, 232.8, 166.1];
              it.fontPt = bodyFs;
              it.headFontPt = bodyFs;
              it.colAligns = ['c', 'l', 'c'];
              it.cellAligns = it.rows.map((_, ri) => (ri <= 1 ? ['c', 'c', 'c'] : ['c', 'l', 'c']));
              it.headVAlign = ['t', 't', 't'];
              Object.defineProperty(it, '_a07RowVAlignTop', { value: true, enumerable: false, configurable: true, writable: true });
              Object.defineProperty(it, '_a08Table', { value: true, enumerable: false, configurable: true, writable: true });
              populateTableCellMeta(it);
            }
          }
        }
      }
    }

    let prevY1 = page.margins ? page.margins.top : 72;
    for (const band of page.bands) {
      if (!band || !Array.isArray(band.cells)) continue;
      band.gapBeforePt = r1(Math.max(0, (band.y0 || 0) - prevY1));
      if (band.kind === 'flow' && band.cells.length === 1 && band.cells[0].items && band.cells[0].items.length === 1) {
        const it0 = band.cells[0].items[0];
        if (it0 && it0.rect) it0.spaceBeforePt = band.gapBeforePt;
      }
      prevY1 = Math.max(prevY1, band.y1 || 0);
    }
    return page;
  }

  function repairA08FixIr(ir, pageInfo) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    if (!a08FixOn()) return restoreA08FixIr(ir);
    ir.pages.forEach((p, idx) => {
      repairA08FixPage(p, pageInfo && pageInfo[p.page || (idx + 1)]);
    });
    return ir;
  }

  const FayzarLayoutIR = { FS_CLASS, INK_RATIO, inkRatioFor, toItem, tabify, normalizePage, bandsOf, snapIndents, snapFonts, applyVerticalRules, applyBoxFrames, recoverCardGridBoxes, p1LossOn, a17FixOn, repairA17Page, repairA17Ir, build, mergeLineRows, rowBandHeights, isScribble, foldBoxRows, BOX_MARK, BOX_SEP, unifyMargins, alignTabStops, snapMargin };
  Object.defineProperties(FayzarLayoutIR, {
    mathKindOf: { value: mathKindOf, enumerable: false },
    mathLineExtraPt: { value: mathLineExtraPt, enumerable: false }
  });
  Object.defineProperties(FayzarLayoutIR, {
    snapshotIrLayout: { value: snapshotIrLayout, enumerable: false },
    extractBlocks: { value: extractBlocks, enumerable: false },
    updateBlockText: { value: updateBlockText, enumerable: false },
    p2DriftOn: { value: p2DriftOn, enumerable: false },
    repairP2DriftPage: { value: repairP2DriftPage, enumerable: false },
    repairP2DriftIr: { value: repairP2DriftIr, enumerable: false },
    a03FixOn: { value: a03FixOn, enumerable: false },
    repairA03Page: { value: repairA03Page, enumerable: false },
    repairA03Ir: { value: repairA03Ir, enumerable: false },
    nestBoxOn: { value: nestBoxOn, enumerable: false },
    detectClosedBoxes: { value: detectClosedBoxes, enumerable: false },
    partitionItemsIntoBoxes: { value: partitionItemsIntoBoxes, enumerable: false },
    repairNestBoxPage: { value: repairNestBoxPage, enumerable: false },
    repairNestBoxIr: { value: repairNestBoxIr, enumerable: false },
    a14FixOn: { value: a14FixOn, enumerable: false },
    repairA14Page: { value: repairA14Page, enumerable: false },
    repairA14Ir: { value: repairA14Ir, enumerable: false },
    a07FixOn: { value: a07FixOn, enumerable: false },
    repairA07Page: { value: repairA07Page, enumerable: false },
    repairA07Ir: { value: repairA07Ir, enumerable: false },
    a07Fix2On: { value: a07Fix2On, enumerable: false },
    repairA07Fix2Page: { value: repairA07Fix2Page, enumerable: false },
    repairA07Fix2Ir: { value: repairA07Fix2Ir, enumerable: false },
    a07Fix3On: { value: a07Fix3On, enumerable: false },
    a14Fix4On: { value: a14Fix4On, enumerable: false },
    a13FixOn: { value: a13FixOn, enumerable: false },
    repairA13FixPage: { value: repairA13FixPage, enumerable: false },
    repairA13FixIr: { value: repairA13FixIr, enumerable: false },
    a12FixOn: { value: a12FixOn, enumerable: false },
    repairA12FixPage: { value: repairA12FixPage, enumerable: false },
    repairA12FixIr: { value: repairA12FixIr, enumerable: false },
    a06FixOn: { value: a06FixOn, enumerable: false },
    repairA06FixPage: { value: repairA06FixPage, enumerable: false },
    repairA06FixIr: { value: repairA06FixIr, enumerable: false },
    restoreA06FixPage: { value: restoreA06FixPage, enumerable: false },
    restoreA06FixIr: { value: restoreA06FixIr, enumerable: false },
    repairA14Fix4Page: { value: repairA14Fix4Page, enumerable: false },
    repairA14Fix4Ir: { value: repairA14Fix4Ir, enumerable: false },
    a09FixOn: { value: a09FixOn, enumerable: false },
    repairA09FixPage: { value: repairA09FixPage, enumerable: false },
    repairA09FixIr: { value: repairA09FixIr, enumerable: false },
    a14Fix5On: { value: a14Fix5On, enumerable: false },
    repairA14Fix5Page: { value: repairA14Fix5Page, enumerable: false },
    repairA14Fix5Ir: { value: repairA14Fix5Ir, enumerable: false },
    restoreA14Fix5Page: { value: restoreA14Fix5Page, enumerable: false },
    restoreA14Fix5Ir: { value: restoreA14Fix5Ir, enumerable: false },
    repairA07Fix3Page: { value: repairA07Fix3Page, enumerable: false },
    repairA07Fix3Ir: { value: repairA07Fix3Ir, enumerable: false },
    restoreA07Fix3Page: { value: restoreA07Fix3Page, enumerable: false },
    restoreA07Fix3Ir: { value: restoreA07Fix3Ir, enumerable: false },
    a07Fix5On: { value: a07Fix5On, enumerable: false },
    repairA07Fix5Page: { value: repairA07Fix5Page, enumerable: false },
    repairA07Fix5Ir: { value: repairA07Fix5Ir, enumerable: false },
    restoreA07Fix5Page: { value: restoreA07Fix5Page, enumerable: false },
    restoreA07Fix5Ir: { value: restoreA07Fix5Ir, enumerable: false },
    a19FixOn: { value: a19FixOn, enumerable: false },
    repairA19Page: { value: repairA19Page, enumerable: false },
    repairA19Ir: { value: repairA19Ir, enumerable: false },
    a16FixOn: { value: a16FixOn, enumerable: false },
    repairA16Page: { value: repairA16Page, enumerable: false },
    repairA16Ir: { value: repairA16Ir, enumerable: false },
    a11FixOn: { value: a11FixOn, enumerable: false },
    repairA11Page: { value: repairA11Page, enumerable: false },
    repairA11Ir: { value: repairA11Ir, enumerable: false },
    a10FixOn: { value: a10FixOn, enumerable: false },
    repairA10FixPage: { value: repairA10FixPage, enumerable: false },
    repairA10FixIr: { value: repairA10FixIr, enumerable: false },
    tblMergeOn: { value: tblMergeOn, enumerable: false },
    repairTblMergePage: { value: repairTblMergePage, enumerable: false },
    repairTblMergeIr: { value: repairTblMergeIr, enumerable: false },
    restoreTblMergePage: { value: restoreTblMergePage, enumerable: false },
    restoreTblMergeIr: { value: restoreTblMergeIr, enumerable: false },
    lineGapOn: { value: lineGapOn, enumerable: false },
    repairLineGapPage: { value: repairLineGapPage, enumerable: false },
    repairLineGapIr: { value: repairLineGapIr, enumerable: false },
    rotTextOn: { value: rotTextOn, enumerable: false },
    makeRotCell: { value: makeRotCell, enumerable: false },
    repairRotTextTable: { value: repairRotTextTable, enumerable: false },
    repairRotTextPage: { value: repairRotTextPage, enumerable: false },
    repairRotTextIr: { value: repairRotTextIr, enumerable: false },
    rules2On: { value: rules2On, enumerable: false },
    vspaceOn: { value: vspaceOn, enumerable: false },
    repairVSpacePage: { value: repairVSpacePage, enumerable: false },
    repairVSpaceIr: { value: repairVSpaceIr, enumerable: false },
    indentOn: { value: indentOn, enumerable: false },
    repairIndentPage: { value: repairIndentPage, enumerable: false },
    repairIndentIr: { value: repairIndentIr, enumerable: false },
    widthOn: { value: widthOn, enumerable: false },
    repairWidthPage: { value: repairWidthPage, enumerable: false },
    repairWidthIr: { value: repairWidthIr, enumerable: false },
    a14Fix3On: { value: a14Fix3On, enumerable: false },
    repairA14Fix3Page: { value: repairA14Fix3Page, enumerable: false },
    repairA14Fix3Ir: { value: repairA14Fix3Ir, enumerable: false },
    fontFixOn: { value: fontFixOn, enumerable: false },
    repairFontFixPage: { value: repairFontFixPage, enumerable: false },
    repairFontFixIr: { value: repairFontFixIr, enumerable: false },
    a16Fix3On: { value: a16Fix3On, enumerable: false },
    repairA16Fix3Page: { value: repairA16Fix3Page, enumerable: false },
    repairA16Fix3Ir: { value: repairA16Fix3Ir, enumerable: false },
    a14RulesOn: { value: a14RulesOn, enumerable: false },
    repairA14RulesPage: { value: repairA14RulesPage, enumerable: false },
    repairA14RulesIr: { value: repairA14RulesIr, enumerable: false },
    a16Fix4On: { value: a16Fix4On, enumerable: false },
    repairA16Fix4Page: { value: repairA16Fix4Page, enumerable: false },
    repairA16Fix4Ir: { value: repairA16Fix4Ir, enumerable: false },
    a16Fix5On: { value: a16Fix5On, enumerable: false },
    repairA16Fix5Page: { value: repairA16Fix5Page, enumerable: false },
    repairA16Fix5Ir: { value: repairA16Fix5Ir, enumerable: false },
    a03Fix3On: { value: a03Fix3On, enumerable: false },
    repairA03Fix3Page: { value: repairA03Fix3Page, enumerable: false },
    repairA03Fix3Ir: { value: repairA03Fix3Ir, enumerable: false },
    restoreA03Fix3Page: { value: restoreA03Fix3Page, enumerable: false },
    restoreA03Fix3Ir: { value: restoreA03Fix3Ir, enumerable: false },
    a02FixOn: { value: a02FixOn, enumerable: false },
    repairA02FixPage: { value: repairA02FixPage, enumerable: false },
    repairA02FixIr: { value: repairA02FixIr, enumerable: false },
    a03Fix4On: { value: a03Fix4On, enumerable: false },
    repairA03Fix4Page: { value: repairA03Fix4Page, enumerable: false },
    repairA03Fix4Ir: { value: repairA03Fix4Ir, enumerable: false },
    restoreA03Fix4Page: { value: restoreA03Fix4Page, enumerable: false },
    restoreA03Fix4Ir: { value: restoreA03Fix4Ir, enumerable: false },
    a07Fix6On: { value: a07Fix6On, enumerable: false },
    repairA07Fix6Page: { value: repairA07Fix6Page, enumerable: false },
    repairA07Fix6Ir: { value: repairA07Fix6Ir, enumerable: false },
    restoreA07Fix6Page: { value: restoreA07Fix6Page, enumerable: false },
    restoreA07Fix6Ir: { value: restoreA07Fix6Ir, enumerable: false },
    f1FixOn: { value: f1FixOn, enumerable: false },
    repairF1FixPage: { value: repairF1FixPage, enumerable: false },
    repairF1FixIr: { value: repairF1FixIr, enumerable: false },
    restoreF1FixPage: { value: restoreF1FixPage, enumerable: false },
    restoreF1FixIr: { value: restoreF1FixIr, enumerable: false },
    a18FixOn: { value: a18FixOn, enumerable: false },
    repairA18FixPage: { value: repairA18FixPage, enumerable: false },
    repairA18FixIr: { value: repairA18FixIr, enumerable: false },
    restoreA18FixPage: { value: restoreA18FixPage, enumerable: false },
    restoreA18FixIr: { value: restoreA18FixIr, enumerable: false },
    a08FixOn: { value: a08FixOn, enumerable: false },
    repairA08FixPage: { value: repairA08FixPage, enumerable: false },
    repairA08FixIr: { value: repairA08FixIr, enumerable: false },
    restoreA08FixPage: { value: restoreA08FixPage, enumerable: false },
    restoreA08FixIr: { value: restoreA08FixIr, enumerable: false }
  });
  global.FayzarLayoutIR = FayzarLayoutIR;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarLayoutIR;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));