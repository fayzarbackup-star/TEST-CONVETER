#!/usr/bin/env node
/**
 * KeyLedger ইউনিট টেস্ট — সম্পূর্ণ অফলাইন, নকল ঘড়ি (fake clock) দিয়ে।
 *   node tests/key-ledger.test.js
 *
 * উদ্দেশ্য: কি-নির্বাচন, ব্যর্থতার শ্রেণিবিন্যাস ও "কখন আবার খুলবে" — এই
 * হিসাবগুলো ডিপ্লয় করার আগেই প্রমাণ করা।
 */

'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

let pass = 0, fail = 0;
const results = [];
function T(name, cond, extra) {
  if (cond) { pass++; results.push('✅ ' + name); }
  else { fail++; results.push('❌ ' + name + (extra ? '  → ' + JSON.stringify(extra) : '')); }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;

(async function main() {
  const L = await import(pathToFileURL(path.join(__dirname, '..', 'fayzar-ocr-proxy', 'ledger.js')).href);

  const NOW = Date.UTC(2026, 8, 30, 12, 0, 0);  // ৩০ সেপ্টে ২০২৬, ১২:০০ UTC
  const KEYS = ['AIzaSyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1', 'AIzaSyBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB2', 'AIzaSyCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC3'];
  const MODELS = ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.6-flash'];

  // ── ১. মাস্কিং: পূর্ণ কি কখনো বের হবে না ────────────────────────────────
  const masked = L.maskKey(KEYS[0]);
  T('কি মাস্ক হয়, পূর্ণ কি ফাঁস হয় না', !masked.includes(KEYS[0]) && masked.startsWith('AIzaSy') && masked.endsWith('AAA1'));
  // মাস্কটি HTTP হেডারে (X-Fayzar-Key) পাঠানো হয় — তাই ১০০% ASCII হতে হবে,
  // নইলে Response তৈরির সময়ই ByteString ত্রুটিতে প্রতিটি সফল রিকোয়েস্ট ভেঙে পড়ে।
  T('মাস্ক ASCII-only (HTTP হেডারে বৈধ)', /^[\x20-\x7E]+$/.test(masked), masked);

  // ── ২. retryDelay পার্সিং ───────────────────────────────────────────────
  T('retryDelay "34s" → ৩৪০০০ms', L.parseRetryDelay('34s') === 34000);
  T('retryDelay "1.5s" → ১৫০০ms', L.parseRetryDelay('1.5s') === 1500);
  T('retryDelay "500ms" → ৫০০ms', L.parseRetryDelay('500ms') === 500);
  T('retryDelay অনুপস্থিত → ০', L.parseRetryDelay(undefined) === 0);

  // ── ৩. ত্রুটির শ্রেণিবিন্যাস (আসল Gemini বডি) ──────────────────────────
  const body429min = {
    error: {
      code: 429, status: 'RESOURCE_EXHAUSTED', message: 'You exceeded your current quota',
      details: [
        { '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
          violations: [{ quotaId: 'GenerateRequestsPerMinutePerProjectPerModel', quotaValue: '10' }] },
        { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '31s' }
      ]
    }
  };
  let v = L.classifyGeminiError(429, body429min, { now: NOW });
  T('429 প্রতি-মিনিট → RPM, ঠিক ৩১ সেকেন্ড', v.class === 'RPM' && v.reopenAfterMs === 31000, v);

  const body429day = {
    error: {
      code: 429, status: 'RESOURCE_EXHAUSTED', message: 'quota exceeded',
      details: [
        { '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
          violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: '250' }] },
        { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '1s' }
      ]
    }
  };
  v = L.classifyGeminiError(429, body429day, { now: NOW });
  const hoursToMidnight = v.reopenAfterMs / 3600000;
  T('429 প্রতি-দিন → RPD, মধ্যরাত পর্যন্ত (১s নয়)', v.class === 'RPD' && hoursToMidnight > 1 && hoursToMidnight < 25, { hoursToMidnight });

  v = L.classifyGeminiError(404, { error: { message: 'models/x is not found for API version v1beta' } }, { now: NOW });
  T('404 → শুধু মডেল বন্ধ, কি সুস্থ', v.class === 'MODEL_NA' && v.scope === 'model');

  v = L.classifyGeminiError(400, { error: { message: 'API key not valid. Please pass a valid API key.' } }, { now: NOW });
  T('400 API_KEY_INVALID → কি স্থায়ীভাবে বাতিল', v.class === 'INVALID' && v.scope === 'key');

  v = L.classifyGeminiError(400, { error: { message: 'Invalid JSON payload received' } }, { now: NOW });
  T('400 অন্য → FATAL_INPUT (কি বদলে লাভ নেই)', v.class === 'FATAL_INPUT');

  v = L.classifyGeminiError(503, { error: { message: 'UNAVAILABLE' } }, { now: NOW, consecutiveServerFails: 0 });
  const v2 = L.classifyGeminiError(503, { error: { message: 'UNAVAILABLE' } }, { now: NOW, consecutiveServerFails: 2 });
  T('503 → ক্রমবর্ধমান ব্যাকঅফ (৩০s → ১২০s)', v.reopenAfterMs === 30000 && v2.reopenAfterMs === 120000, { a: v.reopenAfterMs, b: v2.reopenAfterMs });

  v = L.classifyGeminiError(0, { error: { message: 'network failure' } }, { now: NOW });
  T('নেটওয়ার্ক ব্যর্থতা → SERVER ব্যাকঅফ', v.class === 'SERVER');

  // ── ৪. প্রকৃত খতিয়ান আচরণ ───────────────────────────────────────────────
  const ledger = { keys: {} };

  L.recordSuccess(ledger, KEYS[0], MODELS[0], 42000, NOW);
  const e0 = ledger.keys[L.maskKey(KEYS[0])];
  T('সফল রিকোয়েস্ট গণনা ও গড় সময় লেখা হয়', e0.success === 1 && e0.requests === 1 && e0.avgLatencyMs === 42000);

  L.recordFailure(ledger, KEYS[1], MODELS[0], L.classifyGeminiError(429, body429min, { now: NOW }), NOW);
  T('RPM ব্যর্থতায় ওই মডেল ৩১s বন্ধ', !L.isAvailable(ledger, KEYS[1], MODELS[0], NOW + 30000));
  T('RPM-এ কি-এর অন্য মডেল খোলা থাকে', L.isAvailable(ledger, KEYS[1], MODELS[1], NOW + 1000));
  T('৩১s পর আবার খুলে যায়', L.isAvailable(ledger, KEYS[1], MODELS[0], NOW + 32000));

  L.recordFailure(ledger, KEYS[2], MODELS[0], L.classifyGeminiError(400, { error: { message: 'API key not valid' } }, { now: NOW }), NOW);
  T('INVALID কি সব মডেলে বন্ধ', !L.isAvailable(ledger, KEYS[2], MODELS[0], NOW) && !L.isAvailable(ledger, KEYS[2], MODELS[1], NOW));

  // ── ৫. চেষ্টার পরিকল্পনা (attempt plan) ─────────────────────────────────
  let plan = L.buildAttemptPlan(ledger, KEYS, MODELS, NOW + 1000, 8);
  T('অবৈধ কি পরিকল্পনায় আসে না', plan.every(p => p.key !== KEYS[2]));
  T('কুলিং কি ওই মডেলে আসে না', !plan.some(p => p.key === KEYS[1] && p.model === MODELS[0]));
  T('প্রথম মডেলই আগে (অগ্রাধিকার অক্ষত)', plan[0].model === MODELS[0]);
  T('সফল কি সবার আগে', plan[0].key === KEYS[0]);

  // সব কি কুলিং হলে পরিকল্পনা খালি
  const allCooling = { keys: {} };
  for (const k of KEYS) {
    for (const m of MODELS) {
      L.recordFailure(allCooling, k, m, L.classifyGeminiError(429, body429min, { now: NOW }), NOW);
    }
  }
  T('সব কুলিং হলে পরিকল্পনা খালি', L.buildAttemptPlan(allCooling, KEYS, MODELS, NOW + 1000, 8).length === 0);
  T('কুলডাউন শেষে আবার পূর্ণ পরিকল্পনা', L.buildAttemptPlan(allCooling, KEYS, MODELS, NOW + 32000, 8).length > 0);

  // ── ৬. দৈনিক রিসেট ──────────────────────────────────────────────────────
  const dayLedger = { keys: {} };
  L.recordFailure(dayLedger, KEYS[0], MODELS[0], L.classifyGeminiError(429, body429day, { now: NOW }), NOW);
  T('RPD-তে আজ আর ব্যবহার হবে না', !L.isAvailable(dayLedger, KEYS[0], MODELS[0], NOW + 3600000));
  const afterMidnight = L.nextMidnightPT(NOW) + 60000;
  T('Pacific মধ্যরাতের পর স্বয়ংক্রিয়ভাবে খুলে যায়', L.isAvailable(dayLedger, KEYS[0], MODELS[0], afterMidnight));
  L.ensureEntry(dayLedger, KEYS[0], afterMidnight);
  T('নতুন দিনে কাউন্টার রিসেট হয়', dayLedger.keys[L.maskKey(KEYS[0])].requests === 0);

  // ── ৭. স্কোরিং: বেশি সফল ও কম ব্যবহৃত কি আগে ───────────────────────────
  const sc = { keys: {} };
  for (let i = 0; i < 5; i++) L.recordSuccess(sc, KEYS[0], MODELS[0], 30000, NOW);      // দ্রুত, সফল
  for (let i = 0; i < 5; i++) L.recordFailure(sc, KEYS[1], MODELS[1], L.classifyGeminiError(503, {}, { now: NOW }), NOW); // ব্যর্থ
  const ranked = L.rankKeys(sc, KEYS, MODELS[0], NOW + 400000);
  T('সফল কি ব্যর্থ কি-এর আগে থাকে', ranked.indexOf(KEYS[0]) < ranked.indexOf(KEYS[1]), ranked.map(L.maskKey));

  // ── ৮. /status: কি ফাঁস হয় না, কাউন্টডাউন থাকে ─────────────────────────
  const status = L.buildStatus(ledger, KEYS, NOW + 1000);
  const dump = JSON.stringify(status);
  T('status-এ কোনো পূর্ণ কি নেই', KEYS.every(k => !dump.includes(k)));
  T('status-এ প্রতিটি কি-এর অবস্থা আছে', status.keys.length === 3 && status.keys.every(k => k.state));
  T('INVALID কি status-এ চিহ্নিত', status.keys.some(k => k.state === 'INVALID'));
  const coolingKey = status.keys.find(k => k.mask === L.maskKey(KEYS[1]));
  T('কুলিং কি-এর মডেল কাউন্টডাউন দেখা যায়',
    coolingKey && coolingKey.models[MODELS[0]] && coolingKey.models[MODELS[0]].reopenInSec > 0, coolingKey && coolingKey.models);

  // ── ৯. সীমা: সর্বোচ্চ অ্যাটেম্পট ────────────────────────────────────────
  const many = Array.from({ length: 20 }, (_, i) => 'AIzaSy' + String(i).padStart(30, 'X'));
  T('অ্যাটেম্পট সংখ্যা সীমার মধ্যে থাকে (subrequest সুরক্ষা)',
    L.buildAttemptPlan({ keys: {} }, many, MODELS, NOW, 8).length === 8);

  // ── ১০. প্রতি মডেলের ন্যায্য অ্যাটেম্পট বাজেট ─────────────────────────────
  const fairPlan = L.buildAttemptPlan({ keys: {} }, many, ['m-a', 'm-b'], NOW, 8);
  const aCount = fairPlan.filter(p => p.model === 'm-a').length;
  const bCount = fairPlan.filter(p => p.model === 'm-b').length;
  T('দুই মডেলই অ্যাটেম্পট পায় (প্রথম মডেল সব খেয়ে ফেলে না)', aCount > 0 && bCount > 0, { aCount, bCount });
  T('প্রতি মডেল সর্বোচ্চ ceil(8/2)=4 চেষ্টা', aCount <= 4 && bCount <= 4, { aCount, bCount });
  const fairPlan3 = L.buildAttemptPlan({ keys: {} }, many, ['m-a', 'm-b', 'm-c'], NOW, 8);
  T('তিন মডেলেও সবাই সুযোগ পায়', ['m-a', 'm-b', 'm-c'].every(m => fairPlan3.some(p => p.model === m)));

  // ── ১১. Part-16.5: শ্রেণিবিভাগ সংশোধন, টাইমআউট, মাইগ্রেশন, লোড-ভাগ ─────────
  let c = L.classifyGeminiError(404, { error: { message: 'Requested entity was not found.' } }, { now: NOW });
  T('16.5: মডেল-বার্তা ছাড়া ৪০৪ → MODEL_NA নয় (১ মিনিট)', c.class === 'UNKNOWN' && c.reopenAfterMs === 60000, c);
  c = L.classifyGeminiError(404, { error: { message: 'models/gemini-x is not found for API version v1beta, or is not supported for generateContent.' } }, { now: NOW });
  T('16.5: আসল মডেল-নেই বার্তা → MODEL_NA', c.class === 'MODEL_NA', c);
  c = L.classifyGeminiError(400, { error: { message: 'Unsupported MIME type: image/heic is not supported for this model' } }, { now: NOW });
  T('16.5: ৪০০ "not supported for" → পেলোড-ত্রুটি, মডেল বন্ধ নয়', c.class === 'FATAL_INPUT', c);
  c = L.classifyGeminiError(0, { error: { message: 'attempt timeout (240s)' } }, { now: NOW, timeout: true });
  T('16.5: টাইমআউট → TIMEOUT, কোনো কুলডাউন নেই', c.class === 'TIMEOUT' && !c.reopenAfterMs, c);
  c = L.classifyGeminiError(503, { error: { message: 'This model is currently experiencing high demand.' } }, { now: NOW });
  T('16.5: ৫০৩-এর আসল বার্তা detail-এ থাকে', c.class === 'SERVER' && /high demand/.test(c.detail), c);

  c = L.classifyGeminiError(400, { error: { code: 400, message: 'User location is not supported for the API use.', status: 'FAILED_PRECONDITION' } }, { now: NOW });
  T('16.5: "User location is not supported" → LOCATION (সাময়িক, শাস্তি নেই) — FATAL নয়', c.class === 'LOCATION' && !c.reopenAfterMs, c);

  const tl = { keys: {} };
  L.recordFailure(tl, KEYS[0], MODELS[0], L.classifyGeminiError(0, {}, { now: NOW, timeout: true }), NOW);
  T('16.5: টাইমআউটের পর কি+মডেল সঙ্গে সঙ্গে ব্যবহারযোগ্য', L.isAvailable(tl, KEYS[0], MODELS[0], NOW + 1));
  T('16.5: শেষ ত্রুটি (lastError) খতিয়ানে থাকে', tl.keys[L.maskKey(KEYS[0])].models[MODELS[0]].lastError.class === 'TIMEOUT');

  const old = { keys: {} };
  L.recordFailure(old, KEYS[1], MODELS[0], { class: 'MODEL_NA', reopenAfterMs: 6 * 3600000, scope: 'model', detail: 'x' }, NOW);
  L.recordFailure(old, KEYS[2], MODELS[0], L.classifyGeminiError(429, body429day, { now: NOW }), NOW);
  T('16.5: (পূর্বশর্ত) v1-এ ভুল MODEL_NA কি বন্ধ', !L.isAvailable(old, KEYS[1], MODELS[0], NOW + 1000));
  L.migrateLedger(old);
  T('16.5: মাইগ্রেশনে ভুল MODEL_NA বন্ধ খুলে যায়', L.isAvailable(old, KEYS[1], MODELS[0], NOW + 1000));
  T('16.5: মাইগ্রেশনে দৈনিক-কোটা (RPD) বন্ধ অটুট', !L.isAvailable(old, KEYS[2], MODELS[0], NOW + 1000));
  T('16.5: মাইগ্রেশন একবারই (version=2)', old.version === 2);

  const lru = { keys: {} };
  L.recordSuccess(lru, KEYS[0], MODELS[0], 20000, NOW - 1000);        // সদ্য সফল
  L.recordSuccess(lru, KEYS[1], MODELS[0], 20000, NOW - 600000);      // ১০ মিনিট আগে সফল
  const order = L.rankKeys(lru, KEYS, MODELS[0], NOW);
  T('16.5: LRU — অব্যবহৃত কি আগে, সদ্য-ব্যবহৃত কি শেষে', order[0] === KEYS[2] && order[2] === KEYS[0], order.map(L.maskKey));
  L.recordFailure(lru, KEYS[2], MODELS[1], L.classifyGeminiError(503, {}, { now: NOW - 5000, consecutiveServerFails: 0 }), NOW - 400000);
  L.recordFailure(lru, KEYS[2], MODELS[1], L.classifyGeminiError(503, {}, { now: NOW - 5000, consecutiveServerFails: 1 }), NOW - 400000);
  const order2 = L.rankKeys(lru, KEYS, MODELS[0], NOW);
  T('16.5: পরপর ২+ সার্ভার-ব্যর্থ কি পেছনে যায়', order2[order2.length - 1] === KEYS[2], order2.map(L.maskKey));

  console.log(results.join('\n'));
  console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error('টেস্ট ক্র্যাশ:', err); process.exit(1); });
