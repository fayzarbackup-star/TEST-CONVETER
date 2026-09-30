/**
 * ============================================================================
 * Fayzar Computer Web — Proxy Failure Policy (pure logic, no I/O)
 * ============================================================================
 * প্রক্সি (Cloudflare Worker) ব্যর্থ হলে ক্লায়েন্ট কী করবে — সেই সিদ্ধান্ত *শুধু*
 * এখানে। DOM/fetch/লোকালস্টোরেজের সাথে কোনো সম্পর্ক নেই, তাই Node-এ অফলাইনে
 * টেস্ট করা যায়:  tests/proxy-failure-policy.test.js
 *
 * প্রকৃত Worker রেসপন্স (৩০/০৯/২০২৬-এ লাইভ ধরা):
 *   ৪২৯ (সব কি কুলডাউনে): { error, retryInSec, status: { keys: [...] } }
 *   ৫০২ (সব প্রচেষ্টা ব্যর্থ): { error, lastError: {status, detail}, attempts: [{key, model, class, reopenInSec}], status }
 *   ৪০১/৪০৩ (টোকেন ভুল):  { error }
 * ============================================================================
 */
(function (global) {
  'use strict';

  /** `status` ব্লক থেকে সবচেয়ে আগে খুলবে এমন কি/মডেলের কাউন্টডাউন (সেকেন্ড) */
  function soonestReopenSec(status) {
    if (!status || !Array.isArray(status.keys)) return 0;
    let best = 0;
    for (const k of status.keys) {
      const keySec = Number(k.reopenInSec) || 0;
      if (keySec > 0 && (best === 0 || keySec < best)) best = keySec;
      const models = k.models || {};
      for (const m of Object.keys(models)) {
        const sec = Number(models[m].reopenInSec) || 0;
        if (sec > 0 && (best === 0 || sec < best)) best = sec;
      }
    }
    return best;
  }

  const BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function bn(n) { return String(n).replace(/\d/g, d => BN[+d]); }
  function humanWait(sec) {
    if (!sec || sec <= 0) return '';
    if (sec < 60) return bn(Math.ceil(sec)) + ' সেকেন্ড';
    if (sec < 3600) return bn(Math.ceil(sec / 60)) + ' মিনিট';
    const h = Math.floor(sec / 3600), m = Math.ceil((sec % 3600) / 60);
    return bn(h) + ' ঘণ্টা' + (m ? ' ' + bn(m) + ' মিনিট' : '');
  }

  /**
   * প্রক্সি রেসপন্স বিশ্লেষণ (নেটওয়ার্ক-এরর হলে status=0, body=null দিন)।
   * @returns {{kind:string, waitSec:number, detail:string, attempts:Array}}
   *   kind: 'all_cooling' | 'fatal_input' | 'server_error' | 'unauthorized' | 'unknown'
   */
  function parseProxyFailure(status, body) {
    const b = body || {};
    const attempts = Array.isArray(b.attempts) ? b.attempts : [];
    const lastDetail = (b.lastError && b.lastError.detail) || '';
    const lastStatus = (b.lastError && b.lastError.status) || 0;

    if (status === 401 || status === 403) {
      return { kind: 'unauthorized', waitSec: 0, detail: String(b.error || 'unauthorized'), attempts };
    }

    if (status === 429) {
      const wait = Number(b.retryInSec) || soonestReopenSec(b.status);
      return { kind: 'all_cooling', waitSec: wait, detail: String(b.error || 'all keys cooling'), attempts };
    }

    // ৪০০-শ্রেণির পেলোড-ত্রুটি: Worker তখনই ৫০২ দেয় যখন প্রতিটি প্রচেষ্টা FATAL_INPUT
    // (যেমন: "Unable to process input image") — কি বদলে বা বারবার চেষ্টা করে লাভ নেই।
    const allFatal = attempts.length > 0 && attempts.every(a => a.class === 'FATAL_INPUT');
    const looksFatalInput = (lastStatus === 400 && !/API key not valid|API_KEY_INVALID/i.test(lastDetail));
    if (allFatal || looksFatalInput) {
      return { kind: 'fatal_input', waitSec: 0, detail: lastDetail || 'invalid payload', attempts };
    }

    if (status === 0 || status >= 500) {
      return {
        kind: 'server_error',
        waitSec: soonestReopenSec(b.status) || 60,
        detail: lastDetail || `HTTP ${status}`,
        attempts
      };
    }

    return { kind: 'unknown', waitSec: 60, detail: lastDetail || `HTTP ${status}`, attempts };
  }

  /**
   * ব্যর্থতার পরে কী করব?
   * @param {number} status প্রক্সির HTTP স্ট্যাটাস (0 = নেটওয়ার্ক)
   * @param {object|null} body প্রক্সির JSON বডি
   * @param {boolean} hasOwnKey ব্যবহারকারী নিজের (BYOK) কি দিয়েছে কি না
   * @returns {{action:'abort'|'direct', kind:string, waitSec:number, tone:string, message:string}}
   */
  function decideProxyFallback(status, body, hasOwnKey) {
    const info = parseProxyFailure(status, body);
    const waitTxt = info.waitSec > 30 ? ` — প্রায় ${humanWait(info.waitSec)} পর আবার চেষ্টা করুন` : '';

    switch (info.kind) {
      case 'fatal_input':
        return {
          action: 'abort', kind: info.kind, waitSec: 0, tone: 'error',
          message: '⚠️ প্রক্সি ফাইলটি প্রসেস করতে পারেনি (পেলোড/ছবি সমস্যা)। কি বদলে বা বারবার চেষ্টা করে লাভ নেই — ' +
                   'ছবি/PDF-এর মান যাচাই করে আবার দিন।' + (info.detail ? ` (${String(info.detail).slice(0, 120)})` : '')
        };

      case 'all_cooling':
        if (hasOwnKey) {
          return {
            action: 'direct', kind: info.kind, waitSec: info.waitSec, tone: 'info',
            message: '⚡ সার্ভারের সব কি কুলডাউনে — আপনার নিজের API Key দিয়ে সরাসরি চেষ্টা করা হচ্ছে...'
          };
        }
        return {
          action: 'abort', kind: info.kind, waitSec: info.waitSec, tone: 'warning',
          message: `⏳ সার্ভারের সবগুলো কি এই মুহূর্তে কুলডাউনে${waitTxt}। বারবার চেষ্টা করলে কোটা আরও নষ্ট হবে।`
        };

      case 'unauthorized':
        return {
          action: 'abort', kind: info.kind, waitSec: 0, tone: 'error',
          message: '🔒 প্রক্সি টোকেন মেলেনি (৪০১)। অ্যাডমিনকে জানান — সাইটের PROXY_TOKEN ও Worker-এর PROXY_TOKEN এক রাখতে হবে।'
        };

      case 'server_error':
        if (hasOwnKey) {
          return {
            action: 'direct', kind: info.kind, waitSec: info.waitSec, tone: 'warning',
            message: '⚡ প্রক্সি সার্ভার এখন সাড়া দিচ্ছে না — আপনার নিজের API Key দিয়ে সরাসরি চেষ্টা করা হচ্ছে...'
          };
        }
        return {
          action: 'abort', kind: info.kind, waitSec: info.waitSec, tone: 'warning',
          message: `⚡ প্রক্সি সার্ভার সাময়িক ব্যস্ত${waitTxt}।`
        };

      default:
        if (hasOwnKey) {
          return {
            action: 'direct', kind: info.kind, waitSec: info.waitSec, tone: 'warning',
            message: '⚡ প্রক্সি ব্যর্থ — আপনার নিজের API Key দিয়ে সরাসরি চেষ্টা করা হচ্ছে...'
          };
        }
        return {
          action: 'abort', kind: info.kind, waitSec: info.waitSec, tone: 'warning',
          message: `⚡ প্রক্সি সার্ভার ব্যর্থ${waitTxt}।`
        };
    }
  }

  const api = { parseProxyFailure, decideProxyFallback, soonestReopenSec, humanWait };
  global.FayzarProxyPolicy = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
