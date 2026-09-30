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

  console.log(results.join('\n'));
  console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error('টেস্ট ক্র্যাশ:', err); process.exit(1); });
