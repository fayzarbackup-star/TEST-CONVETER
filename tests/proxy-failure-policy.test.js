#!/usr/bin/env node
/**
 * প্রক্সি-ব্যর্থতার নীতিমালার ইউনিট টেস্ট — সম্পূর্ণ অফলাইন।
 *   node tests/proxy-failure-policy.test.js
 *
 * ফিক্সচারগুলো ৩০/০৯/২০২৬-এ লাইভ Worker থেকে ধরা আসল রেসপন্স (কি মাস্কড)।
 */
'use strict';

const path = require('path');
const policy = require(path.join(__dirname, '..', 'js', 'proxy-failure-policy.js'));

let pass = 0, fail = 0;
const results = [];
const T = (name, cond, extra) => {
  if (cond) { pass++; results.push('✅ ' + name); }
  else { fail++; results.push('❌ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};

// ── আসল ফিক্সচার ১: ৪২৯ — সব কি কুলডাউনে (retryInSec + status ব্লক) ──────────
const FIXTURE_429 = {
  error: 'সবগুলো কি এই মুহূর্তে কুলডাউনে আছে।',
  retryInSec: 65062,
  status: {
    version: 1, dayPT: '2026-09-30', totalKeys: 19,
    keys: [
      { id: 'K01', state: 'COOLING', reopenInSec: 0, models: { 'gemini-3.1-pro-preview': { reopenInSec: 65062, reason: 'RPD' } } },
      { id: 'K11', state: 'READY', reopenInSec: 0, models: { 'gemini-3.6-flash': { reopenInSec: 0, reason: null } } }
    ]
  }
};

// ── আসল ফিক্সচার ২: ৫০২ — সব প্রচেষ্টা FATAL_INPUT (আসল ৫ MB 'A' পরীক্ষার উত্তর) ──
const FIXTURE_502_FATAL = {
  error: 'সবগুলো কি/মডেল ব্যর্থ হয়েছে।',
  lastError: { status: 400, detail: 'Unable to process input image. Please retry or report in https://developers.generativeai.google/guide/troubleshooting' },
  attempts: [{ key: 'AQ.Ab8...SsLw', model: 'gemini-3.6-flash', class: 'FATAL_INPUT', reopenInSec: 0 }],
  status: { version: 1, keys: [] }
};

// ── ফিক্সচার ৩: ৫০২ — সার্ভার-ব্যর্থতা (503), পরের সুযোগ ৪৫s ───────────────────
const FIXTURE_502_SERVER = {
  error: 'সবগুলো কি/মডেল ব্যর্থ হয়েছে।',
  lastError: { status: 503, detail: 'HTTP 503' },
  attempts: [{ key: 'AQ.Ab8...1111', model: 'gemini-3.6-flash', class: 'SERVER', reopenInSec: 45 }],
  status: { keys: [{ id: 'K02', reopenInSec: 0, models: { 'gemini-3.6-flash': { reopenInSec: 45, reason: 'SERVER' } } }] }
};

// ── ১. শ্রেণিবিন্যাস ───────────────────────────────────────────────────────────
let p = policy.parseProxyFailure(429, FIXTURE_429);
T('৪২৯ → all_cooling', p.kind === 'all_cooling', p);
T('৪২৯ → retryInSec পড়া হয় (৬৫০৬২s)', p.waitSec === 65062, p.waitSec);

p = policy.parseProxyFailure(502, FIXTURE_502_FATAL);
T('৫০২ (সব FATAL_INPUT) → fatal_input', p.kind === 'fatal_input', p);
T('fatal_input-এ অপেক্ষার সময় নেই', p.waitSec === 0, p.waitSec);

p = policy.parseProxyFailure(502, FIXTURE_502_SERVER);
T('৫০২ (SERVER) → server_error', p.kind === 'server_error', p);
T('server_error → status খতিয়ান থেকে অপেক্ষা (৪৫s)', p.waitSec === 45, p.waitSec);

p = policy.parseProxyFailure(401, { error: 'Unauthorized' });
T('৪০১ → unauthorized', p.kind === 'unauthorized', p);
p = policy.parseProxyFailure(0, null);
T('নেটওয়ার্ক ব্যর্থতা (status 0) → server_error', p.kind === 'server_error', p);
p = policy.parseProxyFailure(502, { lastError: { status: 400, detail: 'API key not valid' }, attempts: [{ class: 'INVALID' }] });
T('কি-অবৈধ ৪০০ কে fatal_input ভাবা হয় না', p.kind === 'server_error', p);

// ── ২. সিদ্ধান্ত: কখন লোকাল পুলে যাওয়া যাবে, কখন নয় ───────────────────────────
let d = policy.decideProxyFallback(429, FIXTURE_429, false);
T('৪২৯ + নিজের কি নেই → abort (লোকাল পুলে যায় না)', d.action === 'abort', d);
T('৪২৯ abort-বার্তায় কাউন্টডাউন লেখা আছে', /ঘণ্টা|মিনিট/.test(d.message), d.message);
d = policy.decideProxyFallback(429, FIXTURE_429, true);
T('৪২৯ + নিজের কি আছে → নিজের কি দিয়ে সরাসরি', d.action === 'direct', d);

d = policy.decideProxyFallback(502, FIXTURE_502_FATAL, false);
T('অবৈধ পেলোড (FATAL_INPUT) → abort', d.action === 'abort', d);
d = policy.decideProxyFallback(502, FIXTURE_502_FATAL, true);
T('অবৈধ পেলোডে নিজের কি থাকলেও abort (বারবার চেষ্টা বৃথা)', d.action === 'abort', d);

d = policy.decideProxyFallback(502, FIXTURE_502_SERVER, false);
T('সার্ভার-ব্যর্থতা + নিজের কি নেই → abort', d.action === 'abort', d);
d = policy.decideProxyFallback(502, FIXTURE_502_SERVER, true);
T('সার্ভার-ব্যর্থতা + নিজের কি আছে → direct', d.action === 'direct', d);

d = policy.decideProxyFallback(401, { error: 'Unauthorized' }, true);
T('ভুল টোকেন → abort (কি বদলে লাভ নেই)', d.action === 'abort', d);
d = policy.decideProxyFallback(0, null, true);
T('নেটওয়ার্ক-ডাউন + নিজের কি আছে → direct', d.action === 'direct', d);

// ── ৩. কাউন্টডাউন হেল্পার ─────────────────────────────────────────────────────
T('soonestReopenSec — সবচেয়ে আগে খুলবে এমনটি বাছাই',
  policy.soonestReopenSec(FIXTURE_429.status) === 65062, policy.soonestReopenSec(FIXTURE_429.status));
T('soonestReopenSec — খালি স্ট্যাটাসে ০', policy.soonestReopenSec({}) === 0);
T('humanWait — বাংলা সংখ্যায় ঘণ্টা/মিনিট', /ঘণ্টা/.test(policy.humanWait(65062)) && /[০-৯]/.test(policy.humanWait(65062)), policy.humanWait(65062));

// ── part-4: দৈনিক per-IP ক্যাপ (কি-কুলডাউন নয় → অপেক্ষা নয়, থামা)
const dailyBody = { error: 'আপনার দৈনিক ব্যবহারের সীমা শেষ (একই ইন্টারনেট সংযোগ থেকে অনেক অনুরোধ)।',
                    limit: 'ip_daily', usedToday: 100, retryInSec: 7200 };
const dailyInfo = FayzarProxyPolicy.parseProxyFailure(429, dailyBody);
T('৪২৯ + limit:ip_daily → kind === daily_cap', dailyInfo.kind === 'daily_cap', dailyInfo);
const daily = FayzarProxyPolicy.decideProxyFallback(429, dailyBody, false);
T('দৈনিক ক্যাপে → abort (ব্রাউজার নিজে থামে)', daily.action === 'abort', daily);
T('দৈনিক ক্যাপে বার্তাটি বাংলায় "দৈনিক সীমা" বলে', /দৈনিক সীমা/.test(daily.message), daily.message);
T('দৈনিক ক্যাপে waitSec লুকানো তথ্য নয়, বরং বার্তায় সময় আছে', /[০-৯]/.test(daily.message), daily.message);
const withByokDaily = FayzarProxyPolicy.decideProxyFallback(429, dailyBody, true);
T('BYOK থাকলেও দৈনিক ক্যাপে abort (কোটা বাঁচাতে)', withByokDaily.action === 'abort', withByokDaily);

console.log(results.join('\n'));
console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
