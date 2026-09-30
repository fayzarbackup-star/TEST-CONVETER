/**
 * ============================================================================
 * Fayzar OCR Proxy — Cloudflare Worker (KeyLedger সংস্করণ)
 * ============================================================================
 * দায়িত্ব:
 *   1. ক্লায়েন্ট একবারই ফাইল আপলোড করে; কি ব্যর্থ হলে Worker নিজে পরের কি
 *      দিয়ে একই পেলোড Gemini-তে পাঠায় (ক্লায়েন্টের কোনো পুনঃআপলোড লাগে না)।
 *   2. প্রতিটি কি-এর ব্যবহার, সফলতা, ব্যর্থতার কারণ ও "কখন আবার খুলবে"
 *      KV-তে খতিয়ান (KeyLedger) আকারে রাখে।
 *   3. GET /status দিয়ে মাস্কড মনিটরিং তথ্য দেয় (কি কখনোই ফেরত যায় না)।
 *
 * KV binding : FAYZAR_OCR_KEYS
 *   API_KEYS   → JSON array of Gemini API keys
 *   KEY_LEDGER → JSON object (Worker নিজেই তৈরি/হালনাগাদ করে)
 *
 * গুরুত্বপূর্ণ সীমা: ক্লায়েন্টকে স্ট্রিম পাঠানো শুরু হলে মাঝপথে কি বদলানো যায় না।
 * তাই সব ফেইলওভার হয় প্রথম বাইট যাওয়ার আগেই; মাঝপথে ভাঙলে ক্লায়েন্ট পুনরায় চেষ্টা করে।
 * ============================================================================
 */

import {
  classifyGeminiError, recordSuccess, recordFailure,
  buildAttemptPlan, buildStatus, maskKey, ensureEntry
} from './ledger.js';

const MAX_ATTEMPTS = 24;         // সময়-বাজেটের সাথে সমন্বিত (subrequest সীমার নিরাপদ ভেতরে)
const MAX_TOTAL_MS = 200000;     // মোট চেষ্টার সময়সীমা (~৩ মিনিট ২০s) — ৮-চেষ্টার হার্ড ক্যাপের বদলে
const SERVER_RETRY_DELAY_MS = 2500; // 503 transient হলে একবার ছোট বিরতি দিয়ে আবার
// নির্ভুলতা আগে: 3-flash-preview (বাংলা/টেবিল) → 3.8-flash (গণিত) → 3.6-flash (দ্রুত)
const DEFAULT_MODELS = ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.6-flash'];

/** একই মডেলের বাকি এন্ট্রি এড়িয়ে যাওয়ার জন্য পরের মডেলের সূচক বের করা */
function skipRestOfModel(plan, from, model) {
  let j = from;
  while (j + 1 < plan.length && plan[j + 1].model === model) j++;
  return j;
}

/**
 * Origin-ম্যাচিং — exact + wildcard (`*.example.com`) সাপোর্ট করে।
 * কারণ: Cloudflare Pages প্রতিটি ডিপ্লয়ের জন্য আলাদা সাবডোমেইন দেয়
 *   (যেমন ab12cd.fayzar-conveter.pages.dev) — ওগুলোও অনুমোদিত থাকা দরকার।
 * `*.example.com` → example.com এবং যেকোনো সাবডোমেইন, দুই-ই।
 */
function originAllowed(origin, allowedList) {
  if (!origin) return false;
  let host = '';
  try { host = new URL(origin).hostname.toLowerCase(); } catch (e) { return false; }
  for (const raw of allowedList) {
    const a = String(raw || '').trim().toLowerCase();
    if (!a) continue;
    if (a === '*') return true;
    if (a === origin.toLowerCase()) return true;
    // নিয়ম: স্কিম (https://) থাকলে বাদ যাবে, তারপর হয় `*.host` প্যাটার্ন, নয় `host`
    let pattern = a;
    const scheme = pattern.match(/^[a-z][a-z0-9+.-]*:\/\//);
    if (scheme) pattern = pattern.slice(scheme[0].length);
    pattern = pattern.replace(/\/.*$/, '');
    if (pattern.startsWith('*.')) {
      const base = pattern.slice(2);
      if (host === base || host.endsWith('.' + base)) return true;
    } else if (pattern && pattern === host && (scheme ? origin.toLowerCase().startsWith(scheme[0]) : true)) {
      return true;
    }
  }
  return false;
}

function cors(extra = {}, env = {}, request = null) {
  // একাধিক origin সাপোর্ট: তালিকায় থাকলে অনুরোধের Origin-টাই ফিরিয়ে দেওয়া হয়
  // (তাই প্রোডাকশন + www + localhost ডেভ সবই চালানো যায়)।
  // ⚠️ `Vary: Origin` না থাকলে CDN/browser আগের এক origin-এর CORS উত্তর ক্যাশ করে
  // অন্য origin-কে ভুল উত্তর দিতে পারে — তাই হেডারটি সবসময় পাঠানো হয়।
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const reqOrigin = request ? (request.headers.get('Origin') || '') : '';
  let allowOrigin = '*';
  if (allowed.length && !allowed.includes('*')) {
    // প্রতিফলনের সময় exact + wildcard — নইলে সাবডোমেইন-ডিপ্লয়ে CORS ফেল করবে
    allowOrigin = (reqOrigin && originAllowed(reqOrigin, allowed)) ? reqOrigin : allowed[0];
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Access-Control-Expose-Headers': 'X-Fayzar-Key, X-Fayzar-Model, X-Fayzar-Attempts',
    ...extra
  };
}

function json(data, status = 200, env = {}, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: cors({ 'Content-Type': 'application/json' }, env, request)
  });
}

/** শেয়ারড সিক্রেট যাচাই — PROXY_TOKEN না থাকলে সার্ভিস খুলে দিই না (fail-closed) */
function isAuthorized(request, env) {
  const token = env.PROXY_TOKEN;
  if (!token) return 'unconfigured';
  const header = request.headers.get('Authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const alt = request.headers.get('apikey') || '';
  if (bearer === token || alt === token) return 'ok';
  // ট্রানজিশন উইন্ডো: পুরোনো ডিপ্লয়ের ক্লায়েন্টকে ভাঙতে না চাইলে LEGACY_TOKEN দিন,
  // সব ক্লায়েন্ট আপডেট হলে সেটি মুছে ফেলুন।
  if (env.LEGACY_TOKEN && (bearer === env.LEGACY_TOKEN || alt === env.LEGACY_TOKEN)) return 'ok';
  return 'denied';
}

/**
 * Origin গেট (part-4) — ব্রাউজার সবসময় Origin পাঠায়, স্ক্রিপ্ট/বট পাঠায় না।
 * REQUIRE_ORIGIN=true হলে অনুমোদিত Origin ছাড়া POST সরাসরি 403।
 * মনে রাখা জরুরি: এটি নিরাপত্তার *বাধা*, গোপনীয়তা নয় — Origin হেডার নকল করা যায়।
 * তাই মূল সুরক্ষা = রেট-লিমিট + দৈনিক ক্যাপ + অথেনটিকেশন।
 */
function originAllows(request, env) {
  const requireOrigin = String(env.REQUIRE_ORIGIN || '').toLowerCase() === 'true';
  if (!requireOrigin) return { ok: true };
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  if (!allowed.length || allowed.includes('*')) return { ok: true };   // allowlist নেই → পুরোনো আচরণ
  if (!origin) return { ok: false, reason: 'no_origin' };
  if (!originAllowed(origin, allowed)) return { ok: false, reason: 'bad_origin' };
  return { ok: true };
}

/** দৈনিক per-IP ক্যাপ (part-4) — এক IP এক দিনে কতবার OCR করতে পারবে */
async function dailyCapped(env, request, limitPerDay) {
  if (!limitPerDay) return { blocked: false };
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);          // UTC দিন
  const bucket = `IPD:${ip}:${day}`;
  try {
    const cur = parseInt(await env.FAYZAR_OCR_KEYS.get(bucket) || '0', 10) || 0;
    if (cur >= limitPerDay) {
      const midnight = new Date(`${day}T24:00:00Z`).getTime() || (Date.now() + 3600000);
      return { blocked: true, used: cur, retryInSec: Math.max(60, Math.ceil((midnight - Date.now()) / 1000)) };
    }
    await env.FAYZAR_OCR_KEYS.put(bucket, String(cur + 1), { expirationTtl: 90000 });
  } catch (e) { /* KV সমস্যা হলে ব্লক করি না */ }
  return { blocked: false };
}

/** প্রতি-মিনিট রেট লিমিট (best-effort; KV eventual-consistent, তাই কঠোর গ্যারান্টি নয়) */
async function rateLimited(env, request, limitPerMin) {
  if (!limitPerMin) return false;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const bucket = `RL:${ip}:${Math.floor(Date.now() / 60000)}`;
  try {
    const cur = parseInt(await env.FAYZAR_OCR_KEYS.get(bucket) || '0', 10) || 0;
    if (cur >= limitPerMin) return true;
    await env.FAYZAR_OCR_KEYS.put(bucket, String(cur + 1), { expirationTtl: 120 });
  } catch (e) { /* KV সমস্যা হলে ব্লক করি না */ }
  return false;
}

async function loadJson(env, name, fallback) {
  try {
    const raw = await env.FAYZAR_OCR_KEYS.get(name);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed || fallback;
  } catch (e) {
    return fallback;
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors({}, env, request) });
    }

    const url = new URL(request.url);

    // ---------------------------------------------------------------- AUTH
    const auth = isAuthorized(request, env);
    if (auth === 'unconfigured') {
      return json({
        error: 'PROXY_TOKEN কনফিগার করা নেই — নিরাপত্তার জন্য সার্ভিস বন্ধ।',
        fix: 'wrangler secret put PROXY_TOKEN  (এবং ক্লায়েন্টের SUPABASE_CONFIG.PROXY_TOKEN একই রাখুন)'
      }, 503, env, request);
    }
    if (auth !== 'ok') {
      return json({ error: 'Unauthorized' }, 401, env, request);
    }
    if (request.method === 'POST') {
      const gate = originAllows(request, env);
      if (!gate.ok) {
        return json({
          error: 'এই উৎস থেকে অনুরোধ নেওয়া হয় না।',
          fix: gate.reason === 'no_origin'
            ? 'ব্রাউজার ছাড়া (curl/স্ক্রিপ্ট) সরাসরি কল বন্ধ। সঠিক সাইট থেকে ব্যবহার করুন।'
            : 'ALLOWED_ORIGINS-এ এই ডোমেইনটি নেই — Worker-এর ভেরিয়েবলে যোগ করুন।'
        }, 403, env, request);
      }
    }

    if (await rateLimited(env, request, parseInt(env.RATE_PER_MIN || '0', 10))) {
      return json({ error: 'অনুরোধের হার বেশি — এক মিনিট পর চেষ্টা করুন।' }, 429, env, request);
    }

    if (request.method === 'POST') {
      const cap = await dailyCapped(env, request, parseInt(env.DAILY_PER_IP || '0', 10));
      if (cap.blocked) {
        return json({
          error: 'আপনার দৈনিক ব্যবহারের সীমা শেষ (একই ইন্টারনেট সংযোগ থেকে অনেক অনুরোধ)।',
          limit: 'ip_daily',
          usedToday: cap.used,
          retryInSec: cap.retryInSec
        }, 429, env, request);
      }
    }

    // ---------------------------------------------------------------- STATUS
    if (request.method === 'GET') {
      if (url.pathname !== '/status') {
        return json({ ok: true, service: 'fayzar-ocr-proxy', endpoints: ['POST /', 'GET /status'] }, 200, env, request);
      }
      const apiKeys = await loadJson(env, 'API_KEYS', []);
      const ledger = await loadJson(env, 'KEY_LEDGER', { keys: {} });
      return json(buildStatus(ledger, apiKeys, Date.now()), 200, env, request);
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: cors({}, env, request) });
    }

    // ------------------------------------------------------------------ OCR
    try {
      const body = await request.json();
      const payload = body.payload;
      if (!payload) return json({ error: 'payload অনুপস্থিত' }, 400, env, request);

      // ক্লায়েন্ট একটি মডেল বা অগ্রাধিকার-তালিকা পাঠাতে পারে
      let models = Array.isArray(body.models) && body.models.length
        ? body.models.slice(0, 6)
        : (body.model ? [body.model] : DEFAULT_MODELS);

      const apiKeys = await loadJson(env, 'API_KEYS', []);
      if (!apiKeys.length) return json({ error: 'KV-তে কোনো API key কনফিগার করা নেই' }, 500, env, request);

      const ledger = await loadJson(env, 'KEY_LEDGER', { keys: {} });
      const now = Date.now();

      let plan = buildAttemptPlan(ledger, apiKeys, models, now, MAX_ATTEMPTS);
      if (!plan.length) {
        // সব কি কুলিং-এ — সবচেয়ে আগে খুলবে এমনটি জানিয়ে দেওয়া
        const status = buildStatus(ledger, apiKeys, now);
        const soonest = status.keys
          .filter(k => k.reopenInSec > 0)
          .sort((a, b) => a.reopenInSec - b.reopenInSec)[0];
        return json({
          error: 'সবগুলো কি এই মুহূর্তে কুলডাউনে আছে।',
          retryInSec: soonest ? soonest.reopenInSec : 60,
          status
        }, 429, env, request);
      }

      const attempts = [];
      let lastError = null;
      const startedAll = Date.now();
      const encoder = new TextEncoder();
      const retryMs = Math.max(0, parseInt(env.SERVER_RETRY_MS || String(SERVER_RETRY_DELAY_MS), 10));
      const serverRetry = { used: false };
      const serverFailKeys = Object.create(null);   // model → Set(key) — কয়টি কি ৫০৩ খেয়েছে

      // খতিয়ান থেকে "ধরা-পড়া" কি আনা (sticky) — কিন্তু মডেলের ক্রম কখনো বদলায় না।
      // গুণমান-অগ্রাধিকার: ১ নম্বর মডেলই আগে; sticky শুধু ওই মডেলের ভেতরে সেই কি-টিকে সবার আগে আনে।
      try {
        const lastGood = await loadJson(env, 'LAST_GOOD', null);
        if (lastGood && lastGood.mask) {
          const idx = plan.findIndex(p => maskKey(p.key) === lastGood.mask && p.model === lastGood.model);
          if (idx > 0) {
            const item = plan[idx];
            const firstSame = plan.findIndex(p => p.model === item.model);
            if (firstSame !== -1 && firstSame !== idx) {
              const rest = plan.filter((_, j) => j !== idx);
              rest.splice(firstSame, 0, item);
              plan = rest;
            }
          }
        }
      } catch (e) { /* sticky ব্যর্থ হলেও চলবে */ }

      // ---- লাইভ স্ট্রিম: সফল হওয়ার আগেই ক্লায়েন্ট অবস্থা দেখতে পাবে (হার্টবিট) ----
      const stream = new ReadableStream({
        async start(controller) {
          const note = (s) => {
            try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ fayzar_status: s })}\n\n`)); } catch (e) {}
          };
          const elapsed = () => Math.round((Date.now() - startedAll) / 1000);
          try {
            for (let i = 0; i < plan.length; i++) {
              if (Date.now() - startedAll > MAX_TOTAL_MS) {
                lastError = lastError || { status: 0, detail: `time budget ${MAX_TOTAL_MS}ms` };
                break;
              }
              const { key, model } = plan[i];
              const started = Date.now();
              const geminiUrl =
                `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
                `:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;

              note({ event: 'trying', attempt: i + 1, total: plan.length, key: maskKey(key), model, elapsedSec: elapsed() });

              let res = null;
              let verdict = null;
              try {
                res = await fetch(geminiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
              } catch (netErr) {
                const entry = ensureEntry(ledger, key, Date.now());
                verdict = classifyGeminiError(0, { error: { message: netErr.message } }, {
                  now: Date.now(), consecutiveServerFails: entry.consecutiveServerFails
                });
              }

              if (!res || !res.ok) {
                if (!verdict) {
                  const errText = await res.text().catch(() => '');
                  const entry = ensureEntry(ledger, key, Date.now());
                  verdict = classifyGeminiError(res.status, errText, {
                    now: Date.now(), consecutiveServerFails: entry.consecutiveServerFails
                  });
                  lastError = { status: res.status, detail: verdict.detail };
                } else {
                  lastError = { status: 0, detail: verdict.detail };
                }

                recordFailure(ledger, key, model, verdict, Date.now());
                attempts.push({ key: maskKey(key), model, class: verdict.class, reopenInSec: Math.ceil((verdict.reopenAfterMs || 0) / 1000) });

                // পেলোড নিজেই অবৈধ — অন্য কি/মডেলে চেষ্টা করে লাভ নেই
                if (verdict.class === 'FATAL_INPUT') {
                  note({ event: 'fatal', class: verdict.class, detail: verdict.detail });
                  break;
                }

                // 503: মডেলই অসুস্থ — প্রথমে ছোট বিরতিতে একবার, তারপর কি, শেষে মডেল বদল
                if (verdict.class === 'SERVER') {
                  const set = (serverFailKeys[model] = serverFailKeys[model] || new Set());
                  if (!serverRetry.used) {
                    serverRetry.used = true;
                    note({ event: 'retry_same_key', status: lastError.status, waitSec: Math.round(retryMs / 1000), key: maskKey(key), model, elapsedSec: elapsed() });
                    if (retryMs) await new Promise(r => setTimeout(r, retryMs));
                    i--;                     // একই এন্ট্রি আবার চেষ্টা
                    continue;
                  }
                  set.add(key);
                  if (set.size >= 2) {       // একই মডেলে দুই কি ব্যর্থ → মডেল বদল
                    note({ event: 'switch_model', from: model, reason: 'server', elapsedSec: elapsed() });
                    i = skipRestOfModel(plan, i, model);
                    continue;
                  }
                  note({ event: 'switch_key', key: maskKey(key), model, reason: 'server', elapsedSec: elapsed() });
                  continue;
                }

                note({ event: 'switch_key', key: maskKey(key), model, reason: verdict.class, elapsedSec: elapsed() });
                continue;
              }

              // ---------- সফল ----------
              recordSuccess(ledger, key, model, Date.now() - started, Date.now());
              ctx.waitUntil(env.FAYZAR_OCR_KEYS.put('KEY_LEDGER', JSON.stringify(ledger)));
              ctx.waitUntil(env.FAYZAR_OCR_KEYS.put('LAST_GOOD', JSON.stringify({ mask: maskKey(key), model, at: Date.now() })));
              note({ event: 'streaming', attempt: i + 1, key: maskKey(key), model, elapsedSec: elapsed() });

              const reader = res.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
              try { controller.close(); } catch (e) {}
              return;
            }

            // সব চেষ্টা শেষ/সময় শেষ — খতিয়ান সংরক্ষণ করে ক্লায়েন্টকে জানানো
            await env.FAYZAR_OCR_KEYS.put('KEY_LEDGER', JSON.stringify(ledger));
            note({
              event: 'failed', status: 502, elapsedSec: elapsed(),
              body: {
                error: lastError && lastError.status === 503
                  ? 'Google-এর সার্ভার এখন ব্যস্ত (৫০৩) — কিছুক্ষণ পরে আবার চেষ্টা করুন।'
                  : 'সবগুলো কি/মডেল ব্যর্থ হয়েছে।',
                lastError, attempts,
                status: buildStatus(ledger, apiKeys, Date.now())
              }
            });
            try { controller.close(); } catch (e) {}
          } catch (error) {
            try {
              note({ event: 'failed', status: 500, body: { error: error.message } });
              controller.close();
            } catch (e) {}
          }
        }
      });

      return new Response(stream, {
        headers: cors({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no'
        }, env, request)
      });

    } catch (error) {
      return json({ error: error.message }, 500, env, request);
    }
  }
};
