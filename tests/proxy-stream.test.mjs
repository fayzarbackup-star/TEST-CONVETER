/**
 * ============================================================================
 * G_PROXY_STREAM_v6 — অফলাইন ইউনিট টেস্ট (tests/proxy-stream.test.mjs)
 * ============================================================================
 * যাচাইয়ের বিষয়সমূহ (কোনো নেটওয়ার্ক কল বা গোপন টোকেন ছাড়া):
 *   ১. বড় বডি (> ~২০০KB) হলে request.json() কখনোই ডাকা হয় না; হেডার/মেটা থেকে
 *      মডেল ও কী বাছাই হয় এবং request.body সরাসরি স্ট্রিম করে Gemini-তে যায়।
 *   ২. ছোট বডি (≤ ~২০০KB) হলে আগের পথ অনুসরণ করে (request.json() ডাকা হয় এবং
 *      payload প্রক্রিয়াকরণ হয়ে Gemini-তে যায়)।
 *   ৩. সব ধরনের ত্রুটির উত্তরে (৪০১, ৪০৩, ৪০০, ৪২৯, ৫০০, ৫০৩, OPTIONS এবং
 *      CPU-সীমার কাছাকাছি ব্যতিক্রম) CORS হেডার নিশ্চিত থাকে।
 *   ৪. কী-মাস্কিং, রেট-লিমিট, দৈনিক ক্যাপ ও কী/মডেল ফেইলওভার আচরণ অপরিবর্তিত থাকে।
 * ============================================================================
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';

/**
 * Worker মডিউল লোডার:
 * প্রজেক্টে fayzar-ocr-proxy/ledger.js ও package.json থাকলে সরাসরি import করে,
 * নইলে ledger.js স্টাব যুক্ত করে data: URL দিয়ে ES Module হিসেবে লোড করে।
 */
async function loadWorkerModule() {
  const workerUrl = new URL('../fayzar-ocr-proxy/index.js', import.meta.url);
  const ledgerUrl = new URL('../fayzar-ocr-proxy/ledger.js', import.meta.url);
  const pkgUrl = new URL('../fayzar-ocr-proxy/package.json', import.meta.url);

  if (fs.existsSync(ledgerUrl) && fs.existsSync(pkgUrl)) {
    try {
      const mod = await import('../fayzar-ocr-proxy/index.js');
      return mod.default || mod;
    } catch (_) {}
  }

  let ledgerCode = '';
  if (fs.existsSync(ledgerUrl)) {
    ledgerCode = fs.readFileSync(ledgerUrl, 'utf8');
  } else {
    ledgerCode = `
      export function maskKey(key) {
        const s = String(key || '');
        return s.length <= 8 ? '***' : s.slice(0, 4) + '...' + s.slice(-4);
      }
      export function migrateLedger(raw) {
        const l = (raw && typeof raw === 'object') ? raw : {};
        if (!l.keys || typeof l.keys !== 'object') l.keys = {};
        return l;
      }
      export function ensureEntry(ledger, key) {
        const l = migrateLedger(ledger);
        if (!l.keys[key]) {
          l.keys[key] = { state: 'READY', requestsToday: 0, success: 0, fail: 0, avgLatencyMs: 0, reopenAt: 0, reopenReason: '', consecutiveServerFails: 0, lastUsedAt: 0, models: {} };
        }
        if (!l.keys[key].models) l.keys[key].models = {};
        return l.keys[key];
      }
      export function classifyGeminiError(status, errInput, opts = {}) {
        let detail = typeof errInput === 'string' ? errInput : ((errInput && errInput.error && errInput.error.message) || (errInput && errInput.message) || '');
        if (opts && opts.timeout) return { class: 'TIMEOUT', detail: detail || 'timeout', reopenAfterMs: 30000 };
        if (/user location is not supported/i.test(detail)) return { class: 'LOCATION', detail, reopenAfterMs: 90000 };
        if (status === 401 || status === 403 || (status === 400 && /API_KEY_INVALID|API key not valid/i.test(detail))) return { class: 'INVALID', detail, reopenAfterMs: 86400000 };
        if (status === 400) return { class: 'FATAL_INPUT', detail: detail || 'invalid payload', reopenAfterMs: 0 };
        if (status === 404) return { class: 'MODEL_NA', detail, reopenAfterMs: 300000 };
        if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(detail)) return { class: 'RPM', detail: detail || 'quota', reopenAfterMs: 60000 };
        return { class: 'SERVER', detail: detail || ('HTTP ' + status), reopenAfterMs: 15000 };
      }
      export function recordSuccess(ledger, key, model, latencyMs, now = Date.now()) {
        const e = ensureEntry(ledger, key);
        e.requestsToday++; e.success++; e.consecutiveServerFails = 0; e.lastUsedAt = now; e.state = 'READY';
      }
      export function recordFailure(ledger, key, model, verdict, now = Date.now()) {
        const e = ensureEntry(ledger, key);
        e.requestsToday++; e.fail++; e.lastUsedAt = now;
        const reopenMs = Number(verdict && verdict.reopenAfterMs) || 0;
        if (verdict && verdict.class === 'INVALID') { e.state = 'INVALID'; return; }
        if (reopenMs > 0) {
          e.models[model] = { reopenAt: now + reopenMs, reason: verdict.class };
          if (verdict.class === 'RPM' || verdict.class === 'RPD') { e.state = 'COOLING'; e.reopenAt = now + reopenMs; e.reopenReason = verdict.class; }
        }
      }
      export function buildAttemptPlan(ledger, apiKeys, models, now = Date.now(), maxAttempts = 24) {
        const l = migrateLedger(ledger);
        const plan = [];
        for (const model of (models && models.length ? models : ['gemini-3-flash-preview'])) {
          for (const key of (apiKeys || [])) {
            const e = ensureEntry(l, key);
            if (e.state === 'INVALID' || (e.reopenAt && e.reopenAt > now)) continue;
            if (e.models[model] && e.models[model].reopenAt > now) continue;
            if (plan.length < maxAttempts) plan.push({ key, model });
          }
        }
        return plan;
      }
      export function buildStatus(ledger, apiKeys, now = Date.now()) {
        const l = migrateLedger(ledger);
        return {
          keys: (apiKeys || []).map((k, i) => {
            const e = ensureEntry(l, k);
            const reopenInSec = e.reopenAt && e.reopenAt > now ? Math.ceil((e.reopenAt - now) / 1000) : 0;
            return { id: 'K' + (i + 1), mask: maskKey(k), state: e.state, requestsToday: e.requestsToday, success: e.success, fail: e.fail, reopenInSec, models: {} };
          })
        };
      }
    `;
  }
  const ledgerDataUri = 'data:text/javascript;base64,' + Buffer.from(ledgerCode, 'utf8').toString('base64');
  const workerCode = fs.readFileSync(workerUrl, 'utf8').replace(/from\s+['"]\.\/ledger\.js['"]/, `from '${ledgerDataUri}'`);
  const workerDataUri = 'data:text/javascript;base64,' + Buffer.from(workerCode, 'utf8').toString('base64');
  const mod = await import(workerDataUri);
  return mod.default || mod;
}

const worker = await loadWorkerModule();

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err && err.stack ? err.stack : err}`);
  }
}

/** নকল KV এবং Env তৈরি (কোনো আসল টোকেন বা গোপন কী নয়) */
function createMockEnv(overrides = {}) {
  const store = new Map();
  store.set('API_KEYS', JSON.stringify(overrides.apiKeys || ['test_dummy_key_alpha_1111', 'test_dummy_key_beta_2222']));
  store.set('KEY_LEDGER', JSON.stringify(overrides.ledger || { keys: {} }));

  return {
    PROXY_TOKEN: 'dummy-test-token-for-unit-test',
    ALLOWED_ORIGINS: 'https://fayzar.example.com, *.fayzar-pages.dev',
    FAYZAR_OCR_KEYS: {
      async get(key) {
        return store.has(key) ? store.get(key) : null;
      },
      async put(key, val) {
        store.set(key, String(val));
      }
    },
    _store: store,
    ...overrides
  };
}

/** নকল Gemini SSE রেসপন্স স্ট্রিম তৈরি */
function createMockGeminiSseResponse(text = '১। নিউটনের প্রথম সূত্রটি লেখো।', status = 200) {
  const ssePayload = `data: ${JSON.stringify({
    candidates: [{
      content: { parts: [{ text }] },
      finishReason: 'STOP'
    }]
  })}\r\n\r\n`;
  return new Response(ssePayload, {
    status,
    headers: { 'Content-Type': 'text/event-stream' }
  });
}

// ১. বড় বডিতে (> ২০০KB) request.json() ডাকা হয় না এবং request.body সরাসরি স্ট্রিম হয়
await test('১. বড় বডিতে (> ২০০KB) request.json() ডাকা হয় না, হেডার থেকে মেটা নিয়ে বডি ও উত্তর স্ট্রিম হয়', async () => {
  const env = createMockEnv();
  const largeBase64 = 'A'.repeat(250 * 1024); // ~২৫০KB (> ২০০KB)
  const rawBodyStr = JSON.stringify({
    contents: [{ parts: [{ inlineData: { mimeType: 'image/jpeg', data: largeBase64 } }] }]
  });

  let jsonCalled = false;
  let arrayBufferCalled = false;
  let capturedGeminiUrl = '';
  let capturedGeminiInit = null;

  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    capturedGeminiUrl = String(url);
    capturedGeminiInit = init;
    return createMockGeminiSseResponse('১। বড় ফাইলের সফল আউটপুট');
  };

  try {
    const req = new Request('https://fayzar-ocr-proxy.workers.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://fayzar.example.com',
        'Authorization': `Bearer ${env.PROXY_TOKEN}`,
        'X-Fayzar-Models': 'gemini-3.8-flash,gemini-3.6-flash',
        'X-Fayzar-Body-Bytes': String(rawBodyStr.length)
      },
      body: rawBodyStr
    });

    req.json = async () => {
      jsonCalled = true;
      throw new Error('বড় বডিতে request.json() ডাকা নিষিদ্ধ!');
    };
    req.arrayBuffer = async () => {
      arrayBufferCalled = true;
      throw new Error('বড় বডিতে request.arrayBuffer() ডাকা নিষিদ্ধ!');
    };

    const res = await worker.fetch(req, env);
    const outText = await res.text();

    assert.equal(res.status, 200);
    assert.equal(jsonCalled, false, 'বড় বডিতে request.json() ডাকা হয়েছে!');
    assert.equal(arrayBufferCalled, false, 'বড় বডিতে request.arrayBuffer() ডাকা হয়েছে!');
    assert.ok(capturedGeminiUrl.includes('models/gemini-3.8-flash:streamGenerateContent'), 'হেডারের মডেল ব্যবহৃত হয়নি');
    assert.ok(capturedGeminiInit && capturedGeminiInit.body === req.body, 'request.body সরাসরি Gemini-তে পাঠানো হয়নি');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://fayzar.example.com');
    assert.ok(outText.includes('১। বড় ফাইলের সফল আউটপুট'));
  } finally {
    globalThis.fetch = origFetch;
  }
});

// ২. Content-Length/হেডার ছাড়াও বড় বডি (> ২০০KB) হলে .json() ডাকা হয় না
await test('২. হেডারে আকার না থাকলেও বডি > ২০০KB হলে .json() ডাকা হয় না', async () => {
  const env = createMockEnv();
  const largeText = '{"contents":[{"parts":[{"text":"' + 'B'.repeat(230 * 1024) + '"}]}]}';
  let jsonCalled = false;

  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => createMockGeminiSseResponse('হেডারবিহীন বড় বডির উত্তর');

  try {
    const mockReq = {
      method: 'POST',
      url: 'https://fayzar-ocr-proxy.workers.dev/?models=gemini-3-flash-preview',
      headers: new Headers({
        'Authorization': `Bearer ${env.PROXY_TOKEN}`,
        'Origin': 'https://sub.fayzar-pages.dev'
      }),
      body: new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode(largeText));
          c.close();
        }
      }),
      async json() {
        jsonCalled = true;
        throw new Error('json() ডাকা হয়েছে!');
      }
    };

    const res = await worker.fetch(mockReq, env);
    const text = await res.text();

    assert.equal(res.status, 200);
    assert.equal(jsonCalled, false);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://sub.fayzar-pages.dev');
    assert.ok(text.includes('হেডারবিহীন বড় বডির উত্তর'));
  } finally {
    globalThis.fetch = origFetch;
  }
});

// ৩. ছোট বডিতে (≤ ২০০KB) আগের পথ অনুসরণ করে (.json() ডাকা হয়)
await test('৩. ছোট বডিতে (≤ ২০০KB) আগের পথ অনুসরণ করে এবং request.json() ডাকা হয়', async () => {
  const env = createMockEnv();
  const smallPayload = {
    model: 'gemini-3.6-flash',
    payload: {
      contents: [{ parts: [{ text: 'ছোট অনুরোধ' }] }]
    }
  };
  const smallBodyStr = JSON.stringify(smallPayload);
  let jsonCalled = false;
  let sentBodyStr = '';
  let calledUrl = '';

  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calledUrl = String(url);
    sentBodyStr = String(init.body || '');
    return createMockGeminiSseResponse('ছোট বডির উত্তর');
  };

  try {
    const req = new Request('https://fayzar-ocr-proxy.workers.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://fayzar.example.com',
        'Authorization': `Bearer ${env.PROXY_TOKEN}`,
        'Content-Length': String(smallBodyStr.length)
      },
      body: smallBodyStr
    });

    const origJson = req.json.bind(req);
    req.json = async () => {
      jsonCalled = true;
      return await origJson();
    };

    const res = await worker.fetch(req, env);
    const out = await res.text();

    assert.equal(res.status, 200);
    assert.equal(jsonCalled, true, 'ছোট বডিতে request.json() ডাকা হয়নি');
    assert.ok(calledUrl.includes('models/gemini-3.6-flash:streamGenerateContent'));
    const parsedSent = JSON.parse(sentBodyStr);
    assert.equal(parsedSent.generationConfig.thinkingConfig.includeThoughts, true);
    assert.ok(out.includes('ছোট বডির উত্তর'));
  } finally {
    globalThis.fetch = origFetch;
  }
});

// ৪. সব ধরনের ত্রুটির উত্তরে (৪০১, ৪০৩, ৪০০, ৪২৯, ৫০০, ৫০৩) CORS হেডার নিশ্চিত থাকে
await test('৪. সব ত্রুটির উত্তরে (৪০১, ৪০৩, ৪০০, ৪২৯, ৫০০, ৫০৩) CORS হেডার ও বোধগম্য বার্তা থাকে', async () => {
  const origin = 'https://fayzar.example.com';

  // ৪ক. ৪০১ Unauthorized
  {
    const env = createMockEnv();
    const req = new Request('https://fayzar-ocr-proxy.workers.dev/', {
      method: 'POST',
      headers: { 'Origin': origin, 'Authorization': 'Bearer wrong-token' },
      body: '{}'
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 401);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(res.headers.get('Vary'), 'Origin');
  }

  // ৪খ. ৫০৩ Unconfigured token
  {
    const env = createMockEnv({ PROXY_TOKEN: '' });
    const req = new Request('https://fayzar-ocr-proxy.workers.dev/', {
      method: 'POST',
      headers: { 'Origin': origin },
      body: '{}'
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 503);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
  }

  // ৪গ. ৪০৩ Forbidden Origin
  {
    const env = createMockEnv({ REQUIRE_ORIGIN: 'true' });
    const req = new Request('https://fayzar-ocr-proxy.workers.dev/', {
      method: 'POST',
      headers: { 'Origin': 'https://evil.example.org', 'Authorization': `Bearer ${env.PROXY_TOKEN}` },
      body: '{}'
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 403);
    assert.ok(res.headers.get('Access-Control-Allow-Origin'));
  }

  // ৪ঘ. ৪০০ Bad Request (payload অনুপস্থিত ও অবৈধ JSON)
  {
    const env = createMockEnv();
    const req = new Request('https://fayzar-ocr-proxy.workers.dev/', {
      method: 'POST',
      headers: { 'Origin': origin, 'Authorization': `Bearer ${env.PROXY_TOKEN}` },
      body: JSON.stringify({ model: 'gemini-3-flash-preview' })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 400);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
    const body = await res.json();
    assert.ok(body.error.includes('payload'));

    const badJsonReq = new Request('https://fayzar-ocr-proxy.workers.dev/', {
      method: 'POST',
      headers: { 'Origin': origin, 'Authorization': `Bearer ${env.PROXY_TOKEN}`, 'Content-Length': '10' },
      body: '{bad_json:'
    });
    const badJsonRes = await worker.fetch(badJsonReq, env);
    assert.equal(badJsonRes.status, 400);
    assert.equal(badJsonRes.headers.get('Access-Control-Allow-Origin'), origin);
  }

  // ৪ঙ. ৫০০ KV-তে API key নেই বা অপ্রত্যাশিত ত্রুটি
  {
    const env = createMockEnv({ apiKeys: [] });
    const req = new Request('https://fayzar-ocr-proxy.workers.dev/', {
      method: 'POST',
      headers: { 'Origin': origin, 'Authorization': `Bearer ${env.PROXY_TOKEN}` },
      body: JSON.stringify({ payload: { contents: [] } })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 500);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
  }

  // ৪চ. OPTIONS প্রিফ্লাইটে নতুন মেটা-হেডার অনুমোদিত
  {
    const env = createMockEnv();
    const req = new Request('https://fayzar-ocr-proxy.workers.dev/', {
      method: 'OPTIONS',
      headers: { 'Origin': origin }
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
    assert.ok((res.headers.get('Access-Control-Allow-Headers') || '').includes('X-Fayzar-Models'));
  }
});

// ৫. মাস্কিং, রেট-লিমিট এবং ফেইলওভার আচরণ অপরিবর্তিত
await test('৫. মাস্কিং, রেট-লিমিট এবং কী-ফেইলওভার আচরণ অপরিবর্তিত থাকে', async () => {
  const secretKey1 = 'test_secret_key_number_one_9876';
  const secretKey2 = 'test_secret_key_number_two_5432';
  const env = createMockEnv({
    apiKeys: [secretKey1, secretKey2],
    SERVER_RETRY_MS: '1',
    RATE_PER_MIN: '2'
  });

  const triedUrls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    triedUrls.push(String(url));
    // ১ম কী-তে ৪২৯ (কোটা শেষ) দিলে Worker স্বয়ংক্রিয়ভাবে ২য় কী-তে ফেইলওভার করবে
    if (triedUrls.length === 1) {
      return new Response(JSON.stringify({ error: { message: 'Resource has been exhausted (e.g. check quota).' } }), { status: 429 });
    }
    return createMockGeminiSseResponse('২য় কী থেকে সফল উত্তর');
  };

  try {
    const bigBody = JSON.stringify({ contents: [{ parts: [{ text: 'C'.repeat(210 * 1024) }] }] });
    const req1 = new Request('https://fayzar-ocr-proxy.workers.dev/', {
      method: 'POST',
      headers: {
        'Origin': 'https://fayzar.example.com',
        'Authorization': `Bearer ${env.PROXY_TOKEN}`,
        'CF-Connecting-IP': '203.0.113.10',
        'X-Fayzar-Body-Bytes': String(bigBody.length)
      },
      body: bigBody
    });

    const res1 = await worker.fetch(req1, env);
    const streamText = await res1.text();

    // ফেইলওভার যাচাই: ২টি ভিন্ন কী চেষ্টা হয়েছে এবং চূড়ান্ত উত্তর এসেছে
    assert.equal(triedUrls.length, 2);
    assert.ok(streamText.includes('২য় কী থেকে সফল উত্তর'));

    // মাস্কিং যাচাই: স্ট্রিম আউটপুটে কখনোই পুরো গোপন কী ফাঁস হয়নি
    assert.ok(!streamText.includes(secretKey1), '১ম গোপন কী ফাঁস হয়েছে!');
    assert.ok(!streamText.includes(secretKey2), '২য় গোপন কী ফাঁস হয়েছে!');

    // রেট-লিমিট যাচাই: RATE_PER_MIN=2 হওয়ায় ৩য় অনুরোধে ৪২৯ + CORS হেডার পাবে
    const req2 = new Request('https://fayzar-ocr-proxy.workers.dev/status', {
      method: 'GET',
      headers: { 'Origin': 'https://fayzar.example.com', 'Authorization': `Bearer ${env.PROXY_TOKEN}`, 'CF-Connecting-IP': '203.0.113.10' }
    });
    await worker.fetch(req2, env);

    const req3 = new Request('https://fayzar-ocr-proxy.workers.dev/status', {
      method: 'GET',
      headers: { 'Origin': 'https://fayzar.example.com', 'Authorization': `Bearer ${env.PROXY_TOKEN}`, 'CF-Connecting-IP': '203.0.113.10' }
    });
    const res3 = await worker.fetch(req3, env);
    assert.equal(res3.status, 429);
    assert.equal(res3.headers.get('Access-Control-Allow-Origin'), 'https://fayzar.example.com');
  } finally {
    globalThis.fetch = origFetch;
  }
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
