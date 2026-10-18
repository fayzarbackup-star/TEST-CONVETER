import { createRequire } from 'module';
import assert from 'assert';
import { performance } from 'perf_hooks';

const require = createRequire(import.meta.url);
const LineRebreak = require('../js/layout-engine/faithful/line-rebreak.js');
const { rebreak, needsRebreak, lineWidthPt, tokenize, stripMarks } = LineRebreak;

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}: ${err && err.message ? err.message : err}`);
  }
}

// অক্ষর-সংখ্যাভিত্তিক নকল মাপক (১০০px ফন্টে প্রতি অক্ষর = ৫০px ⇒ ১০pt ফন্টে প্রতি অক্ষর = ৫pt)
const mockMeasure = (text) => String(text || '').length * 50;
const defaultItem = { fontPt: 10, bold: false }; // ১০pt ফন্টে প্রতি অক্ষর = ৫pt

console.log('=== A1_REBREAK_v4: লাইন-পুনর্বিভাজন (FayzarLineRebreak) টেস্ট ===');

// ১. মডিউল এক্সপোর্ট ও গঠন যাচাই
check('FayzarLineRebreak: UMD এক্সপোর্ট ও ফাংশনগুলোর উপস্থিতি', () => {
  assert.strictEqual(typeof rebreak, 'function');
  assert.strictEqual(typeof needsRebreak, 'function');
  assert.strictEqual(typeof lineWidthPt, 'function');
  assert.strictEqual(typeof tokenize, 'function');
  assert.strictEqual(globalThis.FayzarLineRebreak, LineRebreak);
});

// ২. needsRebreak সহায়ক ফাংশন যাচাই
check('needsRebreak: ২→৩ এবং ৩→২ লাইনের অমিলে true ফেরত দেয়', () => {
  assert.strictEqual(needsRebreak(['প্রথম লাইন', 'দ্বিতীয় লাইন'], 3), true);
  assert.strictEqual(needsRebreak(['এক', 'দুই', 'তিন'], 2), true);
  assert.strictEqual(needsRebreak(2, 3), true);
  assert.strictEqual(needsRebreak('প্রথম লাইন\nদ্বিতীয় লাইন', [1, 2, 3]), true);
});

check('needsRebreak: লাইন-সংখ্যা সমান হলে মিথ্যা (false) ফেরত দেয়', () => {
  assert.strictEqual(needsRebreak(['এক', 'দুই'], 2), false);
  assert.strictEqual(needsRebreak(['এক', 'দুই', 'তিন'], [10, 20, 30]), false);
  assert.strictEqual(needsRebreak(3, 3), false);
});

check('needsRebreak: ফাঁকা, অবৈধ বা শুধুই বিন্দু/ড্যাশ রেখা-লাইনে false ফেরত দেয়', () => {
  assert.strictEqual(needsRebreak([], 2), false);
  assert.strictEqual(needsRebreak(['   '], 2), false);
  assert.strictEqual(needsRebreak(['এক', 'দুই'], 0), false);
  assert.strictEqual(needsRebreak(['এক', 'দুই'], null), false);
  assert.strictEqual(needsRebreak(['....................', '--------------------'], 3), false);
});

check('needsRebreak: ব্লক/আইটেম অবজেক্ট ({ lines, m: { lines } }) থেকেও লাইন-সংখ্যা চিনতে পারে', () => {
  assert.strictEqual(needsRebreak({ lines: ['ক', 'খ'], m: { lines: [1, 2, 3] } }), true);
  assert.strictEqual(needsRebreak({ lines: ['ক', 'খ'], m: { lines: [1, 2] } }), false);
});

// ৩. ২ → ৩ লাইন পুনর্বিভাজন
check('rebreak (২ → ৩ লাইন): ২ লাইনের লেখাকে ঠিক ৩ লাইনে availPt-এর ভেতরে ভাগ করে', () => {
  const geminiLines = [
    'গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের শিক্ষা মন্ত্রণালয়',
    'মাধ্যমিক ও উচ্চ শিক্ষা বিভাগ ঢাকা'
  ];
  const availPt = 155;
  const out = rebreak(geminiLines, 3, defaultItem, availPt, mockMeasure);
  assert.ok(Array.isArray(out));
  assert.strictEqual(out.length, 3);
  out.forEach((ln) => {
    assert.ok(lineWidthPt(ln, defaultItem, mockMeasure) <= availPt + 1e-6);
  });
  assert.strictEqual(out.join(' '), geminiLines.join(' '));
});

check('rebreak (২ → ৩ লাইন, স্ট্রিং ইনপুট): স্ট্রিং থেকে ৩ লাইনে সুষম বিভাজন', () => {
  const text = 'বাংলাদেশ নির্বাচন কমিশন সচিবালয় আগারগাঁও শেরেবাংলা নগর ঢাকা ১২০৭';
  const availPt = 135;
  const out = rebreak(text, 3, defaultItem, availPt, mockMeasure);
  assert.ok(Array.isArray(out));
  assert.strictEqual(out.length, 3);
  out.forEach((ln) => {
    assert.ok(lineWidthPt(ln, defaultItem, mockMeasure) <= availPt + 1e-6);
  });
  assert.strictEqual(out.join(' '), text);
});

// ৪. ৩ → ২ লাইন পুনর্বিভাজন
check('rebreak (৩ → ২ লাইন): ৩ লাইনের লেখাকে ঠিক ২ লাইনে availPt-এর ভেতরে একত্র করে', () => {
  const geminiLines = [
    'আবেদনকারীর স্থায়ী ঠিকানা',
    'গ্রাম ও ডাকঘর ফুলবাড়ী',
    'জেলা দিনাজপুর বাংলাদেশ'
  ];
  const availPt = 190;
  const out = rebreak(geminiLines, 2, defaultItem, availPt, mockMeasure);
  assert.ok(Array.isArray(out));
  assert.strictEqual(out.length, 2);
  out.forEach((ln) => {
    assert.ok(lineWidthPt(ln, defaultItem, mockMeasure) <= availPt + 1e-6);
  });
  assert.strictEqual(out.join(' '), geminiLines.join(' '));
});

check('rebreak (৪ → ৩ এবং ১ → ২ লাইন): অন্যান্য লাইন-সংখ্যার রূপান্তরও নির্ভুল', () => {
  const lines4 = ['ক খ', 'গ ঘ', 'ঙ চ', 'ছ জ ঝ'];
  const out3 = rebreak(lines4, 3, defaultItem, 40, mockMeasure);
  assert.ok(Array.isArray(out3) && out3.length === 3);
  assert.strictEqual(out3.join(' '), lines4.join(' '));

  const line1 = ['ক খ গ ঘ ঙ চ'];
  const out2 = rebreak(line1, 2, defaultItem, 35, mockMeasure);
  assert.ok(Array.isArray(out2) && out2.length === 2);
  assert.strictEqual(out2.join(' '), line1[0]);
});

// ৫. ন্যূনতম-ব্যাডনেস DP (শেষ লাইন ছাড়া সমান-প্রবাহ)
check('rebreak (ন্যূনতম-ব্যাডনেস DP): শেষ লাইন ছাড়া বাকি লাইনগুলোর প্রস্থ সমান-প্রবাহ বজায় রাখে', () => {
  // ৭টি সমান দৈর্ঘ্যের শব্দ ('শব্দ১' = ২৫pt, স্পেস = ৫pt); availPt = 90 (সর্বোচ্চ ৩টি শব্দ = ৮৫pt)
  // ৩ লাইনে সেরা বিভাজন: [৩ শব্দ (৮৫pt), ৩ শব্দ (৮৫pt), ১ শব্দ (২৫pt)]
  const text = 'শব্দ১ শব্দ২ শব্দ৩ শব্দ৪ শব্দ৫ শব্দ৬ শব্দ৭';
  const out = rebreak(text, 3, defaultItem, 90, mockMeasure);
  assert.ok(Array.isArray(out));
  assert.strictEqual(out.length, 3);
  assert.strictEqual(lineWidthPt(out[0], defaultItem, mockMeasure), 85);
  assert.strictEqual(lineWidthPt(out[1], defaultItem, mockMeasure), 85);
  assert.strictEqual(lineWidthPt(out[2], defaultItem, mockMeasure), 25);
});

check('rebreak (ন্যূনতম-ব্যাডনেস DP, ৫ শব্দ → ৩ লাইন): অসম [৩, ১, ১]-এর বদলে সুষম [২, ২, ১] বেছে নেয়', () => {
  // ৫টি সমান শব্দ ('শব্দ১' = ২৫pt, স্পেস = ৫pt), availPt = 90:
  // [৩, ১, ১] হলে ১ম লাইন ৮৫pt (ফাঁক ৫), ২য় লাইন ২৫pt (ফাঁক ৬৫) ⇒ ব্যাডনেস ৫² + ৬৫² = ৪২৫০
  // [২, ২, ১] হলে ১ম লাইন ৫৫pt (ফাঁক ৩৫), ২য় লাইন ৫৫pt (ফাঁক ৩৫) ⇒ ব্যাডনেস ৩৫² + ৩৫² = ২৪৫০ (জয়ী!)
  const text = 'শব্দ১ শব্দ২ শব্দ৩ শব্দ৪ শব্দ৫';
  const out = rebreak(text, 3, defaultItem, 90, mockMeasure);
  assert.ok(Array.isArray(out));
  assert.deepStrictEqual(out.map((l) => l.split(' ').length), [2, 2, 1]);
});

// ৬. বাংলা যুক্তাক্ষর ও হসন্ত কখনো মাঝখানে ভাঙবে না
check('rebreak: বাংলা যুক্তাক্ষর (ক্ষ, জ্ঞ, ত্র, ন্ত্র, স্থ্য, দ্ধ, ্র, ্য) কখনো মাঝখানে ভাঙে না', () => {
  const conjunctWords = [
    'রাষ্ট্রবিজ্ঞান',
    'স্বাস্থ্যসেবা',
    'কক্সবাজারের',
    'ব্রহ্মপুত্র',
    'সত্যেন্দ্রনাথ',
    'অর্ধ্বেন্দু',
    'মুক্তিযোদ্ধা'
  ];
  const text = conjunctWords.join(' ');
  const out = rebreak(text, 3, defaultItem, 190, mockMeasure);
  assert.ok(Array.isArray(out));
  assert.strictEqual(out.length, 3);
  assert.deepStrictEqual(out.join(' ').split(' '), conjunctWords);
});

check('rebreak: হসন্ত (্) ও ZWNJ/ZWJ (\u200C, \u200D) যুক্ত শব্দ অখণ্ড থাকে', () => {
  const words = ['ভবিষ্যৎকাল', 'হঠাৎ\u200Cকরে', 'ক্\u200Dষতিপূরণ', 'সৎ\u09CDজন', 'বিদ্যুৎ'];
  const text = words.join(' ');
  const out = rebreak(text, 2, defaultItem, 160, mockMeasure);
  assert.ok(Array.isArray(out));
  assert.strictEqual(out.length, 2);
  assert.deepStrictEqual(out.join(' ').split(' '), words);
  out.forEach((ln) => {
    assert.ok(!/^\u09CD/.test(ln), 'কোনো লাইন হসন্ত দিয়ে শুরু হয়নি');
  });
});

// ৭. চিহ্নযুক্ত লেখা (**মোটা**, *বাঁকা*, ^{উপরে})
check('lineWidthPt ও stripMarks: **মোটা**, *বাঁকা*, ^{উপরে} চিহ্ন মাপে ধরা হয় না (line-fit.js-এর সমান)', () => {
  const marked = '**গণপ্রজাতন্ত্রী** *বাংলাদেশ* সরকার ২^{য়} খণ্ড O^{+(ve)}';
  const plain = 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার ২য় খণ্ড O+(ve)';
  assert.strictEqual(stripMarks(marked), plain);
  assert.strictEqual(lineWidthPt(marked, defaultItem, mockMeasure), lineWidthPt(plain, defaultItem, mockMeasure));

  // মোটা (bold: true) আইটেমে ১.০২ গুণক প্রয়োগ যাচাই
  const boldItem = { fontPt: 10, bold: true };
  assert.ok(Math.abs(lineWidthPt(plain, boldItem, mockMeasure) - lineWidthPt(plain, defaultItem, mockMeasure) * 1.02) < 1e-6);
});

check('rebreak: চিহ্নযুক্ত লেখায় **মোটা**, *বাঁকা*, ^{উপরে} চিহ্ন অক্ষত থাকে এবং প্রস্থ-মাপে চিহ্ন বাদ যায়', () => {
  const markedText = '**নাম** *জনাব* **করিম** রক্তের গ্রুপ O^{+(ve)} *পদবি* **সচিব**';
  const availPt = 120;
  const out = rebreak(markedText, 2, defaultItem, availPt, mockMeasure);
  assert.ok(Array.isArray(out));
  assert.strictEqual(out.length, 2);
  assert.ok(out[0].includes('**নাম**'));
  assert.ok(out.join(' ').includes('O^{+(ve)}'));
  assert.strictEqual(out.join(' '), markedText);
});

check('rebreak: ^{...}-এর ভেতরে স্পেস থাকলেও (যেমন O^{(ve -)}) টোকেন মাঝখানে ভাঙে না', () => {
  const text = 'রক্তের গ্রুপ O^{(ve -)} এবং Rh ফ্যাক্টর পজিটিভ';
  const tokens = tokenize(text);
  assert.ok(tokens.includes('O^{(ve -)}'), '^{...}-এর ভেতরের স্পেস অক্ষত থাকতে হবে');
  const out = rebreak(text, 2, defaultItem, 130, mockMeasure);
  assert.ok(Array.isArray(out) && out.length === 2);
  assert.strictEqual(out.join(' '), text);
});

// ৮. অসম্ভব ক্ষেত্রে null ফেরত
check('rebreak (অসম্ভব ক্ষেত্র ১): কোনো একক শব্দ availPt-এর চেয়ে চওড়া হলে null ফেরত দেয়', () => {
  const text = 'ছোট অতিকায়দীর্ঘশব্দযারপ্রস্থঅনেকবেশি ছোট';
  assert.strictEqual(rebreak(text, 2, defaultItem, 60, mockMeasure), null);
});

check('rebreak (অসম্ভব ক্ষেত্র ২): মোট লেখা targetLines × availPt-এ কোনোভাবেই না আঁটলে null ফেরত দেয়', () => {
  const text = 'একটি মাঝারি দৈর্ঘ্যের বাংলা অনুচ্ছেদ যা খুব ছোট প্রস্থে দুই লাইনে আঁটানো অসম্ভব';
  assert.strictEqual(rebreak(text, 2, defaultItem, 120, mockMeasure), null);
  assert.strictEqual(rebreak(text, 1, defaultItem, 200, mockMeasure), null);
});

check('rebreak (অসম্ভব ক্ষেত্র ৩): শব্দ-সংখ্যা targetLines-এর চেয়ে কম হলে null ফেরত দেয়', () => {
  assert.strictEqual(rebreak('মাত্র দুইটি', 3, defaultItem, 300, mockMeasure), null);
  assert.strictEqual(rebreak('একটিমাত্রশব্দ', 2, defaultItem, 300, mockMeasure), null);
});

check('rebreak (অসম্ভব ক্ষেত্র ৪): ফাঁকা লেখা বা অবৈধ প্যারামিটারে null ফেরত দেয়', () => {
  assert.strictEqual(rebreak('', 2, defaultItem, 200, mockMeasure), null);
  assert.strictEqual(rebreak('   ', 1, defaultItem, 200, mockMeasure), null);
  assert.strictEqual(rebreak('এক দুই', 0, defaultItem, 200, mockMeasure), null);
  assert.strictEqual(rebreak('এক দুই', -2, defaultItem, 200, mockMeasure), null);
  assert.strictEqual(rebreak('এক দুই', 2, defaultItem, 0, mockMeasure), null);
  assert.strictEqual(rebreak('এক দুই', 2, defaultItem, -50, mockMeasure), null);
  assert.strictEqual(rebreak('এক দুই', 2, defaultItem, 200, null), null);
});

// ৯. অক্ষর-সংরক্ষণ (জোড়া দিলে মূল লেখার শব্দ হুবহু একই)
check('rebreak (অক্ষর-সংরক্ষণ ১): বাংলা ফরম ও দাপ্তরিক অনুচ্ছেদে শব্দ ও বিরামচিহ্ন ১০০% অক্ষত', () => {
  const text = '১। পরীক্ষার নাম : মাধ্যমিক স্কুল সার্টিফিকেট (এসএসসি) পরীক্ষা ২০২৬ খ্রিস্টাব্দ';
  const out = rebreak(text, 3, defaultItem, 160, mockMeasure);
  assert.ok(Array.isArray(out) && out.length === 3);
  assert.strictEqual(out.join(' '), text);
});

check('rebreak (অক্ষর-সংরক্ষণ ২): ফরম্যাটিং চিহ্ন ও গাণিতিক সূচকযুক্ত অনুচ্ছেদে ১০০% অক্ষর-সংরক্ষণ', () => {
  const text = '**বিশেষ** *দ্রষ্টব্য*: আবেদনপত্রের সাথে সদ্য তোলা ২^{২} কপি পাসপোর্ট সাইজের সত্যায়িত ছবি সংযুক্ত করতে হবে।';
  const out = rebreak(text, 4, defaultItem, 150, mockMeasure);
  assert.ok(Array.isArray(out) && out.length === 4);
  assert.strictEqual(out.join(' '), text);
});

check('rebreak (অক্ষর-সংরক্ষণ ৩): শব্দ-সংখ্যা = targetLines হলে প্রতি লাইনে ১টি করে শব্দ বসে', () => {
  const text = 'প্রথমশব্দ দ্বিতীয়শব্দ তৃতীয়শব্দ';
  const out = rebreak(text, 3, defaultItem, 100, mockMeasure);
  assert.deepStrictEqual(out, ['প্রথমশব্দ', 'দ্বিতীয়শব্দ', 'তৃতীয়শব্দ']);
  assert.strictEqual(out.join(' '), text);
});

// ১০. ঐচ্ছিক বিকল্প (opts: firstIndentPt ও safeRatio)
check('rebreak (opts): firstIndentPt ও safeRatio সঠিকভাবে প্রথম ও সব লাইনের সীমায় কাজ করে', () => {
  const text = 'শব্দ১ শব্দ২ শব্দ৩ শব্দ৪ শব্দ৫';
  // availPt = 90, কিন্তু firstIndentPt = 30 হলে ১ম লাইনের প্রাপ্য প্রস্থ ৬০pt (সর্বোচ্চ ২ শব্দ = ৫৫pt)
  const out = rebreak(text, 2, defaultItem, 90, mockMeasure, { firstIndentPt: 30 });
  assert.ok(Array.isArray(out) && out.length === 2);
  assert.strictEqual(out[0].split(' ').length, 2);
  assert.strictEqual(out[1].split(' ').length, 3);
});

// ১১. গতি পরীক্ষা (< ৫ms / অনুচ্ছেদ)
check('rebreak (গতি): ৫০ শব্দের অনুচ্ছেদে পুনর্বিভাজন গড় < ৫ms-এ সম্পন্ন হয়', () => {
  const words = [];
  for (let i = 1; i <= 50; i++) {
    words.push(i % 5 === 0 ? `**যুক্তাক্ষরশব্দ${i}**` : `বাংলাশব্দ${i}`);
  }
  const paraText = words.join(' ');
  const availPt = 600;
  const targetLines = 6;

  // ওয়ার্ম-আপ
  rebreak(paraText, targetLines, defaultItem, availPt, mockMeasure);

  const runs = 100;
  const t0 = performance.now();
  let lastOut = null;
  for (let r = 0; r < runs; r++) {
    lastOut = rebreak(paraText, targetLines, defaultItem, availPt, mockMeasure);
  }
  const elapsedMs = (performance.now() - t0) / runs;

  assert.ok(Array.isArray(lastOut) && lastOut.length === targetLines);
  assert.strictEqual(lastOut.join(' '), paraText);
  assert.ok(elapsedMs < 5, `গড় সময় ৫ms-এর কম হতে হবে, লেগেছে ${elapsedMs.toFixed(3)}ms`);
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
