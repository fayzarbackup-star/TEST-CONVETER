/**
 * ============================================================================
 * Fayzar OCR Proxy — KeyLedger (pure logic, no I/O)
 * ============================================================================
 * কি-খতিয়ান: কোন কি কতবার/কখন ব্যবহার হলো, কেন ব্যর্থ হলো এবং ঠিক কখন আবার
 * ব্যবহারযোগ্য হবে — সব হিসাব এখানে। কোনো fetch/KV কল নেই, তাই পুরোটা
 * অফলাইনে ইউনিট-টেস্ট করা যায় (tests/key-ledger.test.js)।
 *
 * মূল নীতি: ব্যর্থতার কারণ ≠ একই শাস্তি।
 *   RPM (প্রতি-মিনিট)  → Google-এর দেওয়া RetryInfo.retryDelay, না থাকলে ৬০s
 *   RPD (প্রতি-দিন)    → Pacific সময় অনুযায়ী পরবর্তী মধ্যরাত
 *   SERVER (5xx)       → ৩০s → ৬০s → ১২০s → ৩০০s (ক্রমবর্ধমান)
 *   MODEL_NA (404)     → শুধু ওই মডেল ৬ ঘণ্টা বন্ধ, কি সুস্থ থাকে
 *   INVALID (400/403)  → কি স্থায়ীভাবে বাতিল
 * ============================================================================
 */

const LEDGER_VERSION = 1;
const SERVER_BACKOFF_MS = [30000, 60000, 120000, 300000];
const MODEL_UNSUPPORTED_MS = 6 * 60 * 60 * 1000; // ৬ ঘণ্টা
const DEFAULT_RPM_COOLDOWN_MS = 60000;

/** কি মাস্ক করা — লগ/স্ট্যাটাসে কখনোই পূর্ণ কি যাবে না */
function maskKey(key) {
  // শুধুমাত্র ASCII — এই মাস্ক HTTP হেডারে (X-Fayzar-Key) যায়, আর হেডারে
  // non-Latin1 অক্ষর দিলে Response তৈরিই ব্যর্থ হয় (ByteString ত্রুটি)।
  const k = String(key || '');
  if (k.length <= 12) return k.slice(0, 4) + '...';
  return k.slice(0, 6) + '...' + k.slice(-4);
}

/** "34s" / "1.5s" / "500ms" → মিলিসেকেন্ড */
function parseRetryDelay(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return Math.max(0, Math.round(value * 1000));
  const s = String(value).trim();
  let m = s.match(/^([\d.]+)\s*ms$/i);
  if (m) return Math.max(0, Math.round(parseFloat(m[1])));
  m = s.match(/^([\d.]+)\s*s?$/i);
  if (m) return Math.max(0, Math.round(parseFloat(m[1]) * 1000));
  return 0;
}

/** Pacific সময় অনুযায়ী পরবর্তী মধ্যরাত (Google-এর দৈনিক কোটা সেখানেই রিসেট হয়) */
function nextMidnightPT(now = Date.now()) {
  let offsetMs;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const p = {};
    for (const part of fmt.formatToParts(new Date(now))) p[part.type] = part.value;
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    offsetMs = asUtc - (Math.floor(now / 1000) * 1000);
  } catch (e) {
    offsetMs = -8 * 3600 * 1000; // ICU না থাকলে PST ধরে নেওয়া
  }
  const ptNow = now + offsetMs;
  const dayMs = 24 * 3600 * 1000;
  const ptMidnight = Math.floor(ptNow / dayMs) * dayMs + dayMs;
  return ptMidnight - offsetMs;
}

/** আজকের তারিখ (PT) — দৈনিক কাউন্টার রিসেটের জন্য */
function todayPT(now = Date.now()) {
  return new Date(nextMidnightPT(now) - 24 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Gemini-র ত্রুটি শ্রেণিবিন্যাস।
 * @param {number} status HTTP স্ট্যাটাস (0 = নেটওয়ার্ক ব্যর্থতা)
 * @param {object|string} body ত্রুটির বডি
 * @returns {{class:string, reopenAfterMs:number|null, scope:'key'|'model', detail:string}}
 */
function classifyGeminiError(status, body, opts = {}) {
  const now = opts.now || Date.now();
  const consecutiveServerFails = opts.consecutiveServerFails || 0;

  let obj = body;
  if (typeof body === 'string') {
    try { obj = JSON.parse(body); } catch (e) { obj = { error: { message: body } }; }
  }
  const err = (obj && obj.error) || {};
  const message = String(err.message || '');
  const details = Array.isArray(err.details) ? err.details : [];

  const retryInfo = details.find(d => String(d['@type'] || '').includes('RetryInfo'));
  const quotaFailure = details.find(d => String(d['@type'] || '').includes('QuotaFailure'));
  const violation = quotaFailure && Array.isArray(quotaFailure.violations) ? quotaFailure.violations[0] : null;
  const quotaId = String((violation && violation.quotaId) || '');
  const retryMs = parseRetryDelay(retryInfo && retryInfo.retryDelay);

  if (status === 429) {
    const perDay = /PerDay/i.test(quotaId) || /per day|daily/i.test(message);
    if (perDay) {
      return {
        class: 'RPD',
        reopenAfterMs: nextMidnightPT(now) - now,
        scope: 'model',
        detail: quotaId || 'daily quota exhausted'
      };
    }
    return {
      class: 'RPM',
      reopenAfterMs: retryMs > 0 ? retryMs : DEFAULT_RPM_COOLDOWN_MS,
      scope: 'model',
      detail: quotaId || 'per-minute rate limit'
    };
  }

  if (status === 404 || /is not found|not supported for|no longer available/i.test(message)) {
    return { class: 'MODEL_NA', reopenAfterMs: MODEL_UNSUPPORTED_MS, scope: 'model', detail: 'model unavailable for this key' };
  }

  if (status === 403 || /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(message)) {
    return { class: 'INVALID', reopenAfterMs: null, scope: 'key', detail: 'key invalid or forbidden' };
  }

  if (status === 400) {
    if (/API_KEY_INVALID|API key not valid/i.test(message)) {
      return { class: 'INVALID', reopenAfterMs: null, scope: 'key', detail: 'key invalid' };
    }
    // পেলোড দোষী — কি বদলে লাভ নেই
    return { class: 'FATAL_INPUT', reopenAfterMs: 0, scope: 'model', detail: message.slice(0, 200) };
  }

  if (status === 0 || status >= 500) {
    const idx = Math.min(consecutiveServerFails, SERVER_BACKOFF_MS.length - 1);
    return { class: 'SERVER', reopenAfterMs: SERVER_BACKOFF_MS[idx], scope: 'model', detail: `HTTP ${status}` };
  }

  return { class: 'UNKNOWN', reopenAfterMs: DEFAULT_RPM_COOLDOWN_MS, scope: 'model', detail: `HTTP ${status}` };
}

/** নতুন খতিয়ান-এন্ট্রি */
function createEntry(key, now = Date.now()) {
  return {
    mask: maskKey(key),
    state: 'READY',
    day: todayPT(now),
    requests: 0, success: 0, fail: 0,
    byReason: {},
    consecutiveServerFails: 0,
    lastUsedAt: 0, lastSuccessAt: 0,
    avgLatencyMs: 0,
    reopenAt: 0, reopenReason: null,
    models: {}
  };
}

function ensureEntry(ledger, key, now = Date.now()) {
  if (!ledger.keys) ledger.keys = {};
  const id = maskKey(key);
  if (!ledger.keys[id]) ledger.keys[id] = createEntry(key, now);
  const e = ledger.keys[id];
  const today = todayPT(now);
  if (e.day !== today) { // দৈনিক রিসেট
    e.day = today;
    e.requests = 0; e.success = 0; e.fail = 0; e.byReason = {};
    for (const m of Object.keys(e.models || {})) {
      if (e.models[m].reason === 'RPD') e.models[m].reopenAt = 0;
    }
    if (e.reopenReason === 'RPD') { e.reopenAt = 0; e.reopenReason = null; }
  }
  return e;
}

function ensureModel(entry, model) {
  if (!entry.models[model]) entry.models[model] = { reopenAt: 0, reason: null, success: 0, fail: 0 };
  return entry.models[model];
}

/** এই কি+মডেল এখন ব্যবহারযোগ্য? */
function isAvailable(ledger, key, model, now = Date.now()) {
  const e = ledger.keys && ledger.keys[maskKey(key)];
  if (!e) return true;                       // অজানা কি = নতুন, ব্যবহারযোগ্য
  if (e.state === 'INVALID') return false;
  if (e.reopenAt && now < e.reopenAt) return false;
  const m = e.models && e.models[model];
  if (m && m.reopenAt && now < m.reopenAt) return false;
  return true;
}

/** সফল রিকোয়েস্ট লেখা */
function recordSuccess(ledger, key, model, latencyMs, now = Date.now()) {
  const e = ensureEntry(ledger, key, now);
  const m = ensureModel(e, model);
  e.requests += 1; e.success += 1; m.success += 1;
  e.consecutiveServerFails = 0;
  e.lastUsedAt = now; e.lastSuccessAt = now;
  e.state = 'READY'; e.reopenAt = 0; e.reopenReason = null;
  m.reopenAt = 0; m.reason = null;
  e.avgLatencyMs = e.success === 1
    ? latencyMs
    : Math.round((e.avgLatencyMs * (e.success - 1) + latencyMs) / e.success);
  return e;
}

/** ব্যর্থ রিকোয়েস্ট লেখা — শাস্তির মেয়াদ কারণ অনুযায়ী */
function recordFailure(ledger, key, model, verdict, now = Date.now()) {
  const e = ensureEntry(ledger, key, now);
  const m = ensureModel(e, model);
  e.requests += 1; e.fail += 1; m.fail += 1;
  e.lastUsedAt = now;
  e.byReason[verdict.class] = (e.byReason[verdict.class] || 0) + 1;
  e.consecutiveServerFails = verdict.class === 'SERVER' ? e.consecutiveServerFails + 1 : 0;

  if (verdict.class === 'INVALID') {
    e.state = 'INVALID';
    e.reopenAt = Number.MAX_SAFE_INTEGER;
    e.reopenReason = 'INVALID';
  } else if (verdict.scope === 'key' && verdict.reopenAfterMs) {
    e.reopenAt = now + verdict.reopenAfterMs;
    e.reopenReason = verdict.class;
  } else if (verdict.reopenAfterMs) {
    m.reopenAt = now + verdict.reopenAfterMs;
    m.reason = verdict.class;
    if (verdict.class === 'RPD') { e.reopenReason = 'RPD'; }
  }
  return e;
}

/**
 * কি-গুলোর অগ্রাধিকার নির্ধারণ (বেশি স্কোর = আগে ব্যবহৃত হবে)।
 * সফলতার হার > গতি > আজ কম ব্যবহৃত > অনেকক্ষণ অব্যবহৃত
 */
function scoreKey(entry, now = Date.now()) {
  if (!entry) return 0.75;                                   // অজানা কি — মাঝারি অগ্রাধিকার
  const total = entry.success + entry.fail;
  const successRate = total === 0 ? 0.8 : entry.success / total;
  const speed = entry.avgLatencyMs > 0 ? Math.min(1, 60000 / entry.avgLatencyMs) : 0.6;
  const usage = 1 / (1 + entry.requests / 10);               // আজ কম ব্যবহৃত হলে বেশি
  const idleMin = (now - (entry.lastUsedAt || 0)) / 60000;
  const idle = Math.min(1, idleMin / 10);
  return 0.40 * successRate + 0.25 * speed + 0.20 * usage + 0.15 * idle;
}

/** এই মডেলের জন্য ব্যবহারযোগ্য কি-গুলো সেরা ক্রমে */
function rankKeys(ledger, keys, model, now = Date.now()) {
  return keys
    .filter(k => isAvailable(ledger, k, model, now))
    .map(k => ({ key: k, score: scoreKey(ledger.keys && ledger.keys[maskKey(k)], now) }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.key);
}

/**
 * চেষ্টার পূর্ণ ক্রম: মডেলের অগ্রাধিকার বাইরে, কি-এর স্কোর ভেতরে।
 * ফলে ব্যবহারকারীর পছন্দের মডেল আগে, আর সেই মডেলে সবচেয়ে সুস্থ কি আগে।
 */
function buildAttemptPlan(ledger, keys, models, now = Date.now(), maxAttempts = 8) {
  // প্রতি মডেলের জন্য সীমা: আগে প্রথম মডেলই ৮টি চেষ্টা খেয়ে ফেলত, তাই মডেল-১ এর
  // দৈনিক কোটা শেষ হলে (RPD) দ্বিতীয়/তৃতীয় মডেল কখনোই চেষ্টা হতো না — ব্যবহারকারী
  // "সব কিছুর ব্যর্থ" দেখত। এখন প্রতিটি মডেল ন্যায্য ভাগ পায়।
  const list = Array.isArray(models) && models.length ? models : [];
  if (!list.length) return [];
  const perModel = Math.max(1, Math.ceil(maxAttempts / list.length));

  const plan = [];
  for (const model of list) {
    const ranked = rankKeys(ledger, keys, model, now);
    for (let i = 0; i < ranked.length && i < perModel; i++) {
      plan.push({ key: ranked[i], model });
      if (plan.length >= maxAttempts) return plan;
    }
  }
  return plan;
}

/** /status endpoint-এর জন্য মানব-পাঠ্য সারাংশ (কি কখনোই যায় না) */
function buildStatus(ledger, keys, now = Date.now()) {
  return {
    version: LEDGER_VERSION,
    now,
    dayPT: todayPT(now),
    totalKeys: keys.length,
    keys: keys.map((k, i) => {
      const e = (ledger.keys && ledger.keys[maskKey(k)]) || createEntry(k, now);
      const modelList = Object.keys(e.models || {});
      const allModelsCooling = modelList.length > 0 &&
        modelList.every(m => e.models[m].reopenAt > now);
      const available = isAvailable(ledger, k, '', now) && !allModelsCooling;
      return {
        id: 'K' + String(i + 1).padStart(2, '0'),
        mask: e.mask,
        state: e.state === 'INVALID' ? 'INVALID' : (available ? 'READY' : 'COOLING'),
        requestsToday: e.requests,
        success: e.success,
        fail: e.fail,
        byReason: e.byReason,
        avgLatencyMs: e.avgLatencyMs,
        lastUsedAt: e.lastUsedAt,
        reopenAt: e.reopenAt && e.reopenAt !== Number.MAX_SAFE_INTEGER ? e.reopenAt : null,
        reopenInSec: e.reopenAt && e.reopenAt !== Number.MAX_SAFE_INTEGER && e.reopenAt > now
          ? Math.ceil((e.reopenAt - now) / 1000) : 0,
        reopenReason: e.reopenReason,
        models: Object.keys(e.models || {}).reduce((acc, m) => {
          const mm = e.models[m];
          acc[m] = {
            reopenInSec: mm.reopenAt > now ? Math.ceil((mm.reopenAt - now) / 1000) : 0,
            reason: mm.reason,
            success: mm.success,
            fail: mm.fail
          };
          return acc;
        }, {})
      };
    })
  };
}

const Ledger = {
  LEDGER_VERSION,
  maskKey,
  parseRetryDelay,
  nextMidnightPT,
  todayPT,
  classifyGeminiError,
  createEntry,
  ensureEntry,
  isAvailable,
  recordSuccess,
  recordFailure,
  scoreKey,
  rankKeys,
  buildAttemptPlan,
  buildStatus
};

export default Ledger;
export {
  LEDGER_VERSION, maskKey, parseRetryDelay, nextMidnightPT, todayPT,
  classifyGeminiError, createEntry, ensureEntry, isAvailable,
  recordSuccess, recordFailure, scoreKey, rankKeys, buildAttemptPlan, buildStatus
};
