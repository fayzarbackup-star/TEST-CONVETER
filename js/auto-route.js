/**
 * js/auto-route.js — Fayzar OCR অটো-রাউটার
 *
 * ব্যবহারকারীর থেকে ম্যানুয়াল মোড-বাছাই সরিয়ে স্বয়ংক্রিয়ভাবে সর্বোত্তম পথ
 * (template বনাম faithful) নির্ধারণ করে।
 * বর্তমানে ডিফল্ট: 'template' (সাজানো ফরম্যাট)।
 * লুকানো ওভাররাইড: URL ?mode=faithful অথবা localStorage FZ_ON_FAITHFUL === '1'।
 *
 * UMD: window.FayzarAutoRoute (ব্রাউজার) ও module.exports (Node)।
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FayzarAutoRoute = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * ওভাররাইড সক্রিয় কিনা তা নিরাপদভাবে পরীক্ষা করে।
   * (১) URL query parameter: ?mode=faithful বা &mode=faithful
   * (২) localStorage কী: FZ_ON_FAITHFUL === '1'
   *
   * @param {Object} [signals={}]
   * @returns {boolean}
   */
  function checkOverride(signals) {
    signals = signals || {};

    // ১. URL প্যারামিটার যাচাই
    try {
      const search = signals.search ||
        (signals.location && signals.location.search) ||
        (typeof location !== 'undefined' && location && location.search) ||
        (typeof window !== 'undefined' && window.location && window.location.search) || '';
      if (search && /[?&]mode=faithful\b/.test(search)) {
        return true;
      }
    } catch (_) {}

    // ২. localStorage যাচাই (try/catch এ সুরক্ষিত)
    try {
      const storage = signals.localStorage ||
        (typeof localStorage !== 'undefined' && localStorage) ||
        (typeof window !== 'undefined' && window.localStorage) || null;
      if (storage && typeof storage.getItem === 'function') {
        if (storage.getItem('FZ_ON_FAITHFUL') === '1') {
          return true;
        }
      }
    } catch (_) {}

    return false;
  }

  /**
   * সংকেত (signals) বিশ্লেষণ করে OCR মোড নির্ধারণ করে।
   *
   * @param {Object} [signals={}]
   *   - doc_type: string (ভবিষ্যতে প্রথম OCR কলের পর নথি-ধরন বিশ্লেষণ করে সিদ্ধান্ত নিতে ব্যবহৃত হবে)
   *   - files: Array (ব্যবহারকারীর দেওয়া ফাইলের তালিকা)
   *   - pages: number (মোট পাতা সংখ্যা)
   * @returns {{ mode: 'template' | 'faithful', reason: 'override' | 'default' }}
   */
  function decide(signals) {
    signals = signals || {};

    // নিয়ম (ক): ওভাররাইড সুইচ চালু থাকলে হুবহু (faithful) মোড
    if (checkOverride(signals)) {
      return { mode: 'faithful', reason: 'override' };
    }

    // নিয়ম (খ): ভবিষ্যতে এখানে signals.doc_type ও অন্যান্য প্রাক-বিশ্লেষণের
    // সংকেত অনুযায়ী স্বয়ংক্রিয় বাছাই নিয়ম যোগ হবে।
    // (এখন কোনো নতুন নিয়ম নেই)

    // অন্য সব ক্ষেত্রে ডিফল্ট: সাজানো ফরম্যাট (template)
    return { mode: 'template', reason: 'default' };
  }

  return {
    decide,
    checkOverride
  };
});
