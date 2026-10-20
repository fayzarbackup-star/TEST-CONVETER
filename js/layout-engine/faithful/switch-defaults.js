/**
 * Fayzar — হুবহু-মোডের গৃহীত FIX সুইচ ডিফল্ট-চালু (২০২৬-১০-২০)
 * A/B-তে উন্নতি, কোনো ফাইল কমেনি: WRAPFIT, NESTBOX, TBLMERGE, A03FIX, A16FIX (ভিত্তি-গড় ৮৮.৬)।
 * ইঞ্জিন-ফাইল অপরিবর্তিত; শুধু window.__FZ_ON_* বসানো হয়। বন্ধ করতে: window.__FZ_OFF_<নাম> = true (বা qa-তে FZ_OFF=<নাম>)।
 * এই ফাইল শুধু HTML-এ লোড হয়; node টেস্ট আগের মতো ডিফল্ট-বন্ধ অবস্থায় চলে।
 */
(function (global) {
  'use strict';
  // ১০-২১: VSPACE যোগ (a07 +৪.২, a16 +৪.২), BOXSPLIT যোগ (a14 ছবি +৬.৪) — কেউ কমেনি
  // ১০-২১: SERIALHANG (v3) যোগ — ক্রমিক-অনুচ্ছেদে ট্যাব+ঝুলন্ত ইনডেন্ট; স্কোর নিরপেক্ষ (৬ ফাইল), a16 চোখে যাচাই ✓
  // ১০-২১: A07FIX2 যোগ (a07 +২.৩, a14 +২, কেউ কমেনি)
  // ১০-২১: A14FIX3 যোগ (a14 +৯.৩, a09 +১.১, কেউ কমেনি)
  // ১০-২১: WIDTH (v2) যোগ (a13 +৩.৬, a09 +২.৩, a01 +১.৭, কেউ কমেনি)
  // ১০-২১: A16FIX3 যোগ (a16 +১.৫, বাকিরা অপরিবর্তিত)
  // ১০-২১: A14RULES যোগ (a14 ৮১.১→৯২.৪, কেউ কমেনি)
  const DEFAULT_ON = ['WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3', 'WIDTH', 'A16FIX3', 'A14RULES'];
  DEFAULT_ON.forEach((k) => {
    if (!global['__FZ_OFF_' + k]) global['__FZ_ON_' + k] = true;
  });
  global.__FZ_DEFAULT_ON = DEFAULT_ON.slice();
})(typeof window !== 'undefined' ? window : globalThis);
