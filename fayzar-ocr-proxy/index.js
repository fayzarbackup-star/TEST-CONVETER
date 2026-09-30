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

const MAX_ATTEMPTS = 8;          // Cloudflare subrequest সীমার নিরাপদ ভেতরে
const DEFAULT_MODELS = ['gemini-3-flash-preview', 'gemini-3.6-flash'];

function cors(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Access-Control-Expose-Headers': 'X-Fayzar-Key, X-Fayzar-Model, X-Fayzar-Attempts',
    ...extra
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: cors({ 'Content-Type': 'application/json' })
  });
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
      return new Response(null, { headers: cors() });
    }

    const url = new URL(request.url);

    // ---------------------------------------------------------------- STATUS
    if (request.method === 'GET') {
      if (url.pathname !== '/status') {
        return json({ ok: true, service: 'fayzar-ocr-proxy', endpoints: ['POST /', 'GET /status'] });
      }
      const apiKeys = await loadJson(env, 'API_KEYS', []);
      const ledger = await loadJson(env, 'KEY_LEDGER', { keys: {} });
      return json(buildStatus(ledger, apiKeys, Date.now()));
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: cors() });
    }

    // ------------------------------------------------------------------ OCR
    try {
      const body = await request.json();
      const payload = body.payload;
      if (!payload) return json({ error: 'payload অনুপস্থিত' }, 400);

      // ক্লায়েন্ট একটি মডেল বা অগ্রাধিকার-তালিকা পাঠাতে পারে
      let models = Array.isArray(body.models) && body.models.length
        ? body.models.slice(0, 6)
        : (body.model ? [body.model] : DEFAULT_MODELS);

      const apiKeys = await loadJson(env, 'API_KEYS', []);
      if (!apiKeys.length) return json({ error: 'KV-তে কোনো API key কনফিগার করা নেই' }, 500);

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
        }, 429);
      }

      const attempts = [];
      let lastError = null;

      for (let i = 0; i < plan.length; i++) {
        const { key, model } = plan[i];
        const started = Date.now();
        const geminiUrl =
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
          `:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;

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

        if (res && res.ok) {
          // সফল — স্ট্রিম সরাসরি ক্লায়েন্টকে পাঠানো হচ্ছে
          recordSuccess(ledger, key, model, Date.now() - started, Date.now());
          ctx.waitUntil(env.FAYZAR_OCR_KEYS.put('KEY_LEDGER', JSON.stringify(ledger)));
          return new Response(res.body, {
            headers: cors({
              'Content-Type': res.headers.get('Content-Type') || 'text/event-stream',
              'Cache-Control': 'no-cache',
              'X-Fayzar-Key': maskKey(key),
              'X-Fayzar-Model': model,
              'X-Fayzar-Attempts': String(i + 1)
            })
          });
        }

        if (res && !verdict) {
          const errText = await res.text().catch(() => '');
          const entry = ensureEntry(ledger, key, Date.now());
          verdict = classifyGeminiError(res.status, errText, {
            now: Date.now(), consecutiveServerFails: entry.consecutiveServerFails
          });
          lastError = { status: res.status, detail: verdict.detail };
        } else if (verdict) {
          lastError = { status: 0, detail: verdict.detail };
        }

        recordFailure(ledger, key, model, verdict, Date.now());
        attempts.push({ key: maskKey(key), model, class: verdict.class, reopenInSec: Math.ceil((verdict.reopenAfterMs || 0) / 1000) });

        // পেলোড নিজেই অবৈধ — অন্য কি-তে চেষ্টা করে লাভ নেই
        if (verdict.class === 'FATAL_INPUT') break;
      }

      // সব চেষ্টা ব্যর্থ — খতিয়ান সংরক্ষণ করে বিস্তারিত জানানো
      await env.FAYZAR_OCR_KEYS.put('KEY_LEDGER', JSON.stringify(ledger));
      return json({
        error: 'সবগুলো কি/মডেল ব্যর্থ হয়েছে।',
        lastError,
        attempts,
        status: buildStatus(ledger, apiKeys, Date.now())
      }, 502);

    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }
};
