/**
 * Worker ইন্টিগ্রেশন টেস্ট — নকল KV ও নকল Gemini দিয়ে আসল fetch হ্যান্ডলার চালানো।
 *   node tests/proxy-worker.test.mjs
 * সম্পূর্ণ অফলাইন; কোনো নেটওয়ার্ক বা ডিপ্লয় লাগে না।
 */
import worker from '../fayzar-ocr-proxy/index.js';

const KEYS = ['AIzaSyAAAA1111AAAA1111AAAA1111AAAA1111', 'AIzaSyBBBB2222BBBB2222BBBB2222BBBB2222', 'AIzaSyCCCC3333CCCC3333CCCC3333CCCC3333'];
const store = new Map([['API_KEYS', JSON.stringify(KEYS)]]);
const TOKEN = 'unit-test-token';
const env = { PROXY_TOKEN: TOKEN, SERVER_RETRY_MS: '1', FAYZAR_OCR_KEYS: {
  get: async k => store.get(k) ?? null,
  put: async (k, v) => { store.set(k, v); }
}};

/** SSE রেসপন্স থেকে ইভেন্ট/টেক্সট/চূড়ান্ত-ব্যর্থতা বের করা */
async function sse(res) {
  const text = await res.text();
  const events = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('data:')) continue;
    const j = t.slice(5).trim();
    if (!j || j === '[DONE]') continue;
    try { events.push(JSON.parse(j)); } catch (e) { /* আংশিক লাইন */ }
  }
  const statuses = events.filter(e => e.fayzar_status).map(e => e.fayzar_status);
  const texts = events.filter(e => e.candidates)
    .map(e => (e.candidates[0].content.parts || []).map(p => p.text || '').join('')).join('');
  return { statuses, texts, finalFailure: statuses.find(x => x.event === 'failed') || null, events, names: statuses.map(x => x.event) };
}
const tries = (e) => e.statuses.filter(s => s.event === 'trying');
const ctx = { waitUntil: p => p };

let script = [];            // প্রতিটি Gemini কলের নকল উত্তর
let calls = [];
globalThis.fetch = async (url, opts) => {
  const key = new URL(url).searchParams.get('key');
  const model = url.match(/models\/([^:]+):/)[1];
  calls.push({ key: key.slice(-4), model, body: opts && opts.body });
  const r = script.shift() || { ok: true };
  if (r.sse) {                            // Part-17.0: টুকরো-টুকরো SSE (চিন্তা/লেখা/ত্রুটি), ঐচ্ছিক বিরতিসহ
    const enc = new TextEncoder();
    const chunks = r.sse.slice();
    const body = new ReadableStream({
      async pull(c) {
        // সংখ্যা = বিরতি; বিরতির পর পরের টুকরো পাঠাতেই হবে (কিছু না পাঠিয়ে ফিরলে স্ট্রিম আর pull করে না)
        while (chunks.length && typeof chunks[0] === 'number') await new Promise(res => setTimeout(res, chunks.shift()));
        if (!chunks.length) { c.close(); return; }
        c.enqueue(enc.encode(chunks.shift()));
      }
    });
    return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  }
  if (r.throw) throw new Error('network down');
  if (r.delay) await new Promise(res => setTimeout(res, r.delay));
  if (r.stall) {                          // ঝুলে-থাকা অনুরোধ — শুধু abort এ কাটে
    await new Promise((_, rej) => {
      const sig = opts && opts.signal;
      const kill = () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      if (sig) { if (sig.aborted) return kill(); sig.addEventListener('abort', kill); }
      setTimeout(() => rej(new Error('stall safeguard (test)')), 5000);
    });
  }
  if (r.ok) return new Response('data: {"candidates":[{"content":{"parts":[{"text":"ঠিক আছে"}]}}]}\n\n',
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } });
};

const post = (body, headers = {}) => worker.fetch(new Request('https://w.dev/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN, ...headers },
  body: JSON.stringify(body)
}), env, ctx);
const status = () => worker.fetch(new Request('https://w.dev/status', {
  headers: { 'Authorization': 'Bearer ' + TOKEN }
}), env, ctx);

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

const err429min = { status: 429, body: { error: { code: 429, message: 'quota', details: [
  { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerMinutePerProjectPerModel' }] },
  { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '25s' }] } } };
const err404 = { status: 404, body: { error: { code: 404, message: 'models/x is not found for API version v1beta' } } };
const err400key = { status: 400, body: { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } } };
const err400bad = { status: 400, body: { error: { code: 400, message: 'Invalid JSON payload received' } } };

// ── ০. অথেনটিকেশন (টোকেন ছাড়া কিছুই নয়)
let r401 = await worker.fetch(new Request('https://w.dev/', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: { contents: [] } })
}), env, ctx);
T('টোকেন ছাড়া POST → ৪০১', r401.status === 401);
r401 = await worker.fetch(new Request('https://w.dev/status'), env, ctx);
T('টোকেন ছাড়া /status → ৪০১', r401.status === 401);
const wrong = await worker.fetch(new Request('https://w.dev/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer nope' },
  body: JSON.stringify({ payload: { contents: [] } })
}), env, ctx);
T('ভুল টোকেন → ৪০১', wrong.status === 401);
const noTokenEnv = await worker.fetch(new Request('https://w.dev/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer x' },
  body: JSON.stringify({ payload: { contents: [] } })
}), { FAYZAR_OCR_KEYS: env.FAYZAR_OCR_KEYS }, ctx);
T('PROXY_TOKEN সেট না থাকলে সার্ভিস বন্ধ (fail-closed)', noTokenEnv.status === 503);

// ── ০বি. প্রথম মডেলের কোটা শেষ → দ্বিতীয় মডেলও চেষ্টা হয় (fallback আর অদৃশ্য নয়)
//    আলাদা KV-তে চালানো হয়, যাতে পরের টেস্টগুলোর খতিয়ান/কুলডাউন নষ্ট না হয়।
const err429day = { status: 429, body: { error: { code: 429, message: 'quota exceeded', details: [
  { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel' }] },
  { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '3600s' }] } } };
const store2 = new Map([['API_KEYS', JSON.stringify(KEYS)]]);
const env2 = { PROXY_TOKEN: TOKEN, SERVER_RETRY_MS: '1', FAYZAR_OCR_KEYS: {
  get: async k => store2.get(k) ?? null,
  put: async (k, v) => { store2.set(k, v); }
}};
script = [err429day, err429day, err429day, err429day, { ok: true }]; calls = [];
const resFb = await worker.fetch(new Request('https://w.dev/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
  body: JSON.stringify({ payload: { contents: [] }, models: ['gemini-3-flash-preview', 'gemini-3.6-flash'] })
}), env2, ctx);
const eFb = await sse(resFb);   // স্ট্রিম ড্রেন করলেই সব Gemini কল গণনা সম্পূর্ণ হয়
T('প্রথম মডেল দৈনিক-কোটা-শেষ হলেও দ্বিতীয় মডেলে সফল হয়',
  resFb.status === 200 && calls[calls.length - 1].model === 'gemini-3.6-flash' && eFb.texts.includes('ঠিক আছে'), calls);
T('প্রথম মডেলে ৪টি চেষ্টার বেশি খরচ হয় না',
  calls.filter(c => c.model === 'gemini-3-flash-preview').length <= 4, calls);

// ── ০সি. CORS: একাধিক origin সাপোর্ট (প্রোডাকশন + localhost ডেভ একসাথে)
const envOrigins = { PROXY_TOKEN: TOKEN, ALLOWED_ORIGINS: 'https://fayzarcomputer.com.bd, http://localhost:3008',
  FAYZAR_OCR_KEYS: { get: async () => null, put: async () => {} } };
const pre = (origin, e = envOrigins) => worker.fetch(new Request('https://w.dev/', {
  method: 'OPTIONS', headers: origin ? { 'Origin': origin, 'Access-Control-Request-Method': 'POST' } : {}
}), e, ctx);
let corsRes = await pre('https://fayzarcomputer.com.bd');
T('প্রোডাকশন origin → নিজের origin-ই ফেরত আসে',
  corsRes.headers.get('Access-Control-Allow-Origin') === 'https://fayzarcomputer.com.bd', [...corsRes.headers]);
corsRes = await pre('http://localhost:3008');
T('localhost ডেভ origin-ও অনুমোদিত (মাল্টি-অরিজিন)',
  corsRes.headers.get('Access-Control-Allow-Origin') === 'http://localhost:3008', corsRes.headers.get('Access-Control-Allow-Origin'));
corsRes = await pre('https://evil.example.com');
T('অননুমোদিত origin-কে তার origin ফেরত দেওয়া হয় না',
  corsRes.headers.get('Access-Control-Allow-Origin') !== 'https://evil.example.com', corsRes.headers.get('Access-Control-Allow-Origin'));
corsRes = await pre('https://fayzarcomputer.com.bd');
T('Vary: Origin পাঠানো হয় (CORS ক্যাশ-বিষ poisoning ঠেকাতে)', /origin/i.test(corsRes.headers.get('Vary') || ''), corsRes.headers.get('Vary'));
corsRes = await worker.fetch(new Request('https://w.dev/', { method: 'OPTIONS' }), { PROXY_TOKEN: TOKEN, FAYZAR_OCR_KEYS: env.FAYZAR_OCR_KEYS }, ctx);
T('ALLOWED_ORIGINS না থাকলে আগের মতো * (ব্যাকওয়ার্ড কম্প্যাটিবল)',
  corsRes.headers.get('Access-Control-Allow-Origin') === '*', corsRes.headers.get('Access-Control-Allow-Origin'));

// ── ০গ. Origin গেট (part-4, REQUIRE_ORIGIN=true)
const envGate = { PROXY_TOKEN: TOKEN, ALLOWED_ORIGINS: 'https://fayzarcomputer.com.bd', REQUIRE_ORIGIN: 'true',
  FAYZAR_OCR_KEYS: { get: async () => null, put: async () => {} } };
const postJson = (origin) => worker.fetch(new Request('https://w.dev/', {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'apikey': TOKEN },
                         origin ? { 'Origin': origin } : {}),
  body: JSON.stringify({ payload: { contents: [] } })
}), envGate, ctx);

let gRes = await postJson(null);
T('Origin ছাড়া POST → ৪০৩ (স্ক্রিপ্ট-অপব্যবহার বন্ধ)', gRes.status === 403, gRes.status);
gRes = await postJson('https://evil.example.com');
T('অননুমোদিত Origin থেকে POST → ৪০৩', gRes.status === 403, gRes.status);
gRes = await postJson('https://fayzarcomputer.com.bd');
T('অনুমোদিত Origin থেকে POST → গেট পার হয় (৪০৩ নয়)', gRes.status !== 403, gRes.status);

const envNoGate = { PROXY_TOKEN: TOKEN, ALLOWED_ORIGINS: 'https://fayzarcomputer.com.bd',
  FAYZAR_OCR_KEYS: { get: async () => null, put: async () => {} } };
gRes = await worker.fetch(new Request('https://w.dev/', { method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'apikey': TOKEN },
  body: JSON.stringify({ payload: { contents: [] } }) }), envNoGate, ctx);
T('REQUIRE_ORIGIN না থাকলে আগের আচরণ (ব্যাকওয়ার্ড কম্প্যাটিবল)', gRes.status !== 403, gRes.status);

const statusRes = await worker.fetch(new Request('https://w.dev/status',
  { headers: { 'Authorization': `Bearer ${TOKEN}`, 'apikey': TOKEN } }), envGate, ctx);
T('/status গেটের বাইরে (মনিটরিং curl অটুট)', statusRes.status === 200, statusRes.status);

// ── ০ঘ. দৈনিক per-IP ক্যাপ (part-4)
const today = new Date().toISOString().slice(0, 10);
const usedStore = new Map();
usedStore.set(`IPD:1.2.3.4:${today}`, '3');            // ইতিমধ্যে ৩ বার ব্যবহার
const envCap = { PROXY_TOKEN: TOKEN, DAILY_PER_IP: '3',
  FAYZAR_OCR_KEYS: { get: async (k) => usedStore.get(k) ?? null, put: async (k, v) => { usedStore.set(k, v); } } };
let cRes = await worker.fetch(new Request('https://w.dev/', { method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'apikey': TOKEN, 'CF-Connecting-IP': '1.2.3.4' },
  body: JSON.stringify({ payload: { contents: [] } }) }), envCap, ctx);
const cBody = await cRes.json();
T('দৈনিক সীমা শেষ হলে → ৪২৯ + limit:ip_daily', cRes.status === 429 && cBody.limit === 'ip_daily', cBody);

cRes = await worker.fetch(new Request('https://w.dev/', { method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'apikey': TOKEN, 'CF-Connecting-IP': '5.6.7.8' },
  body: JSON.stringify({ payload: { contents: [] } }) }), envCap, ctx);
T('অন্য IP প্রভাবিত হয় না (ক্যাপ per-IP)', cRes.status !== 429, cRes.status);

// ── ০ঙ. Origin ওয়াইল্ডকার্ড (part-5: Cloudflare Pages সাবডোমেইন)
const envWild = { PROXY_TOKEN: TOKEN, ALLOWED_ORIGINS: 'https://fayzar-conveter.pages.dev, https://*.fayzar-conveter.pages.dev, http://localhost:3008',
  REQUIRE_ORIGIN: 'true', FAYZAR_OCR_KEYS: { get: async () => null, put: async () => {} } };
const preWild = (origin) => worker.fetch(new Request('https://w.dev/', {
  method: 'OPTIONS', headers: { 'Origin': origin, 'Access-Control-Request-Method': 'POST' } }), envWild, ctx);
const postWild = (origin) => worker.fetch(new Request('https://w.dev/', {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'apikey': TOKEN },
                         origin ? { 'Origin': origin } : {}),
  body: JSON.stringify({}) }), envWild, ctx);

let wRes = await preWild('https://ab12cd.fayzar-conveter.pages.dev');
T('ওয়াইল্ডকার্ড: প্রিভিউ সাবডোমেইন প্রতিফলিত হয় (CORS)',
  wRes.headers.get('Access-Control-Allow-Origin') === 'https://ab12cd.fayzar-conveter.pages.dev',
  wRes.headers.get('Access-Control-Allow-Origin'));
wRes = await postWild('https://ab12cd.fayzar-conveter.pages.dev');
T('ওয়াইল্ডকার্ড: পেজ-প্রিভিউ origin গেট পার হয় (৪০৩ নয়)', wRes.status !== 403, wRes.status);
wRes = await postWild('https://fayzar-conveter.pages.dev');
T('মূল pages.dev origin-ও চলে (৪০৩ নয়)', wRes.status !== 403, wRes.status);
wRes = await postWild('https://evil-fayzar-conveter.pages.dev.evil.com');
T('প্রতারণামূলক origin (suffix-ট্রিক) আটকায় → ৪০৩', wRes.status === 403, wRes.status);
wRes = await postWild('https://notfayzar-conveter.pages.dev.attacker.net');
T('অন্য ডোমেইনের সাবডোমেইন-নকলও আটকায় → ৪০৩', wRes.status === 403, wRes.status);
wRes = await postWild('http://localhost:3008');
T('localhost ডেভ এখনো চলে (৪০৩ নয়)', wRes.status !== 403, wRes.status);

// ── ১. প্রথম কি-তেই সফল (এখন স্ট্রিমেই অবস্থা আসে)
script = [{ ok: true }]; calls = [];
let res = await post({ payload: { contents: [] }, models: ['gemini-3-flash-preview'] });
let e = await sse(res);
T('প্রথম কি-তে সফল → ২০০ ও SSE', res.status === 200 && res.headers.get('Content-Type').includes('event-stream'));
const streaming = e.statuses.find(s => s.event === 'streaming');
T('স্ট্রিম ইভেন্টে মাস্কড কি ও মডেল আসে', !!streaming && streaming.key.includes('...') && streaming.model === 'gemini-3-flash-preview', streaming);
T('মাস্ক ASCII-only (ByteString নিরাপদ)', /^[\x20-\x7E]+$/.test(streaming ? streaming.key : ''), streaming && streaming.key);
T('পূর্ণ কি কোথাও ফাঁস হয় না', !KEYS.some(k => JSON.stringify(e.events).includes(k)));
T('আসল আউটপুট ক্লায়েন্ট পর্যন্ত পৌঁছেছে', e.texts.includes('ঠিক আছে'), e.texts);
T('মাত্র ১টি Gemini কল হয়েছে', calls.length === 1, calls);

// ── ১ক. হার্টবিট: সফল হওয়ার আগেই "trying" ইভেন্ট (আর জমে থাকবে না)
T('স্ট্রিমে trying → streaming ক্রম আছে', e.names.indexOf('trying') >= 0 && e.names.indexOf('trying') < e.names.indexOf('streaming'), e.names);

// ── ২. ২টি কি 429 → ৩য় কি-তে সফল
script = [err429min, err429min, { ok: true }]; calls = [];
res = await post({ payload: { contents: [] }, models: ['gemini-3-flash-preview'] });
e = await sse(res);
T('২টি 429-এর পর ৩য় কি-তে সফল', res.status === 200 && tries(e).length === 3 && e.texts.includes('ঠিক আছে'), tries(e).length);
T('ফেইলওভারে ক্লায়েন্টের পুনঃআপলোড লাগেনি (নতুন Gemini কল ৩টি)', calls.length === 3);

// ── ২ক. Part-16.5: 503 → ছোট বিরতিতে একই মডেলে *অন্য* কি; ৩টি ভিন্ন কি ব্যর্থ হলে মডেল বদল
const err503 = { status: 503, body: { error: { code: 503, message: 'This model is currently experiencing high demand.' } } };
const store3 = new Map([['API_KEYS', JSON.stringify(KEYS)]]);
const env3 = { PROXY_TOKEN: TOKEN, SERVER_RETRY_MS: '1', FAYZAR_OCR_KEYS: {
  get: async k => store3.get(k) ?? null,
  put: async (k, v) => { store3.set(k, v); } } };
script = [err503, err503, err503, { ok: true }]; calls = [];
let res3 = await worker.fetch(new Request('https://w.dev/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
  body: JSON.stringify({ payload: { contents: [] }, models: ['gemini-3-flash-preview', 'gemini-3.6-flash'] })
}), env3, ctx);
const e3 = await sse(res3);
T('৫০৩-এ একই কি-তে আবার নয় — প্রথম ৩টি চেষ্টা ৩টি ভিন্ন কি', !e3.names.includes('retry_same_key') && new Set(calls.slice(0, 3).map(c => c.key)).size === 3, { names: e3.names, calls });
T('৩টি কি ৫০৩ খেলে মডেল বদল হয়', e3.names.includes('switch_model') && calls[calls.length-1].model === 'gemini-3.6-flash', { names: e3.names, calls });
T('এই পথে একই মডেলে সব কি নষ্ট হয় না (≤৩ Gemini কল)', calls.filter(c => c.model === 'gemini-3-flash-preview').length <= 3, calls);
T('শেষ পর্যন্ত সফল ও আউটপুট এসেছে', res3.status === 200 && e3.texts.includes('ঠিক আছে'));

// ── ২খ. Part-16.5: লোড-ভাগ (LRU) — সদ্য-ব্যবহৃত কি পেছনে, বিশ্রামে থাকা কি আগে; মডেল-ক্রম অটুট।
// (আগের "শেষ সফল কি সবার আগে" নিয়মে প্রায় সব কাজ এক কি-তে জমে তার প্রতি-মিনিট সীমা ভরত)
const _now4 = Date.now();
const store4 = new Map([['API_KEYS', JSON.stringify(KEYS)],
  ['LAST_GOOD', JSON.stringify({ mask: KEYS[0].slice(0,6) + '...' + KEYS[0].slice(-4), model: 'gemini-3-flash-preview', at: _now4 })],
  ['KEY_LEDGER', JSON.stringify({ version: 2, keys: { [KEYS[0].slice(0,6) + '...' + KEYS[0].slice(-4)]: { mask: KEYS[0].slice(0,6) + '...' + KEYS[0].slice(-4), state: 'READY', day: '', requests: 5, success: 5, fail: 0, byReason: {}, consecutiveServerFails: 0, lastUsedAt: _now4 - 1000, lastSuccessAt: _now4 - 1000, avgLatencyMs: 20000, reopenAt: 0, reopenReason: null, models: {} } } })]]);
const env4 = { PROXY_TOKEN: TOKEN, SERVER_RETRY_MS: '1', FAYZAR_OCR_KEYS: {
  get: async k => store4.get(k) ?? null, put: async (k, v) => { store4.set(k, v); } } };
script = [err429min, err429min, err429min, { ok: true }]; calls = [];
const res4 = await worker.fetch(new Request('https://w.dev/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
  body: JSON.stringify({ payload: { contents: [] }, models: ['gemini-3-flash-preview', 'gemini-3.6-flash'] })
}), env4, ctx);
const e4 = await sse(res4);
const t4 = tries(e4);
T('LRU: গুণমান-অগ্রাধিকার অটুট (প্রথম চেষ্টা ১ নম্বর মডেলই)',
  t4.length >= 1 && calls[0].model === 'gemini-3-flash-preview' && t4[0].model === 'gemini-3-flash-preview',
  { tries: t4.map(x => x.model), calls });
T('LRU: সদ্য-ব্যবহৃত (শেষ সফল) কি প্রথমে নয় — বিশ্রামে থাকা কি আগে',
  calls[0].key !== KEYS[0].slice(-4) && calls.slice(0, 2).every(c => c.key !== KEYS[0].slice(-4)),
  calls);

// ── ২গ. লম্বা চেষ্টায় "অপেক্ষা" হার্টবিট — HTML: UI কখনো নীরব হয় না
const store5 = new Map([['API_KEYS', JSON.stringify(KEYS)]]);
const env5 = { PROXY_TOKEN: TOKEN, SERVER_RETRY_MS: '1', WAIT_TICK_MS: '5', FAYZAR_OCR_KEYS: {
  get: async k => store5.get(k) ?? null, put: async (k, v) => { store5.set(k, v); } } };
script = [{ delay: 60, ok: true }]; calls = [];
const res5 = await worker.fetch(new Request('https://w.dev/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
  body: JSON.stringify({ payload: { contents: [] }, models: ['gemini-3-flash-preview'] })
}), env5, ctx);
const e5 = await sse(res5);
const waitCount = e5.names.filter(n => n === 'waiting').length;
T('লম্বা চেষ্টার সময় "অপেক্ষা" হার্টবিট আসে (নীরব নয়)', waitCount >= 1 && e5.texts.includes('ঠিক আছে'), { waitCount, names: e5.names });

// ── ২ঘ. ঝুলে-থাকা চেষ্টা টাইমআউটে কাটা পড়ে → দ্রুত পরের ধাপে এগোয়
const store6 = new Map([['API_KEYS', JSON.stringify(KEYS)]]);
const env6 = { PROXY_TOKEN: TOKEN, SERVER_RETRY_MS: '1', ATTEMPT_TIMEOUT_MS: '40', WAIT_TICK_MS: '100000', FAYZAR_OCR_KEYS: {
  get: async k => store6.get(k) ?? null, put: async (k, v) => { store6.set(k, v); } } };
script = [{ stall: true }, { stall: true }, { stall: true }, { stall: true }, { ok: true }]; calls = [];
const res6 = await worker.fetch(new Request('https://w.dev/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
  body: JSON.stringify({ payload: { contents: [] }, models: ['gemini-3-flash-preview', 'gemini-3.6-flash'] })
}), env6, ctx);
const e6 = await sse(res6);
T('ঝুলে-থাকা চেষ্টা টাইমআউটে কেটে পরের চেষ্টায় যায়', calls.length >= 4 && e6.texts.includes('ঠিক আছে'), { calls: calls.length, names: e6.names });
T('টাইমআউটে পরের কি-তে যায়', e6.names.includes('switch_key'), e6.names);
{
  const l6 = JSON.parse(store6.get('KEY_LEDGER'));
  const ms = Object.values(l6.keys).flatMap(e => Object.values(e.models));
  T('Part-16.5: টাইমআউট কি-কে শাস্তি দেয় না (কুলডাউন নেই, TIMEOUT শ্রেণি)',
    ms.some(m => m.lastError && m.lastError.class === 'TIMEOUT') && ms.every(m => !(m.reopenAt > Date.now())), ms);
  const log6 = JSON.parse(store6.get('OCR_LOG') || '[]');
  T('Part-16.5: OCR_LOG-এ চেষ্টাগুলো (TIMEOUT … OK) ও ফল লেখা হয়',
    log6.length === 1 && log6[0].outcome === 'success' && log6[0].attempts.some(a => a.class === 'TIMEOUT') && log6[0].attempts.some(a => a.class === 'OK') && log6[0].finish,
    log6);
  T('Part-16.5: লগে পূর্ণ কি নেই', !KEYS.some(k => JSON.stringify(log6).includes(k)));
}

// ── ২ঙ. Part-16.5: অঞ্চল-সীমা ("User location is not supported") সাময়িক — থামে না, পরের কি-তে সফল
{
  const errLoc = { status: 400, body: { error: { code: 400, message: 'User location is not supported for the API use.', status: 'FAILED_PRECONDITION' } } };
  const storeL = new Map([['API_KEYS', JSON.stringify(KEYS)]]);
  const envL = { PROXY_TOKEN: TOKEN, SERVER_RETRY_MS: '1', FAYZAR_OCR_KEYS: {
    get: async k => storeL.get(k) ?? null, put: async (k, v) => { storeL.set(k, v); } } };
  script = [errLoc, errLoc, { ok: true }]; calls = [];
  const resL = await worker.fetch(new Request('https://w.dev/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
    body: JSON.stringify({ payload: { contents: [] }, models: ['gemini-3-flash-preview'] })
  }), envL, ctx);
  const eL = await sse(resL);
  T('16.5: অঞ্চল-সীমায় fatal নয় — পরের কি-তে গিয়ে সফল', !eL.names.includes('fatal') && calls.length === 3 && eL.texts.includes('ঠিক আছে'), { names: eL.names, calls: calls.length });

  script = Array.from({ length: 20 }, () => errLoc); calls = [];
  const resL2 = await worker.fetch(new Request('https://w.dev/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
    body: JSON.stringify({ payload: { contents: [] }, models: ['gemini-3-flash-preview', 'gemini-3.6-flash'] })
  }), envL, ctx);
  const eL2 = await sse(resL2);
  T('16.5: পরপর ৬টি অঞ্চল-সীমায় থামে (২৪ বার বৃথা চেষ্টা নয়) + স্পষ্ট বার্তা',
    calls.length === 6 && !!eL2.finalFailure && /অঞ্চল/.test(eL2.finalFailure.body.error), { calls: calls.length, f: eL2.finalFailure });
}

// ── ৩. খতিয়ান: 429-প্রাপ্ত কি এখন কুলিং, সঠিক সময়সহ
let st = await (await status()).json();
const cooling = st.keys.filter(k => k.state === 'COOLING');
T('/status-এ কুলিং কি চিহ্নিত', cooling.length === 2, st.keys.map(k => k.state));
const anyModelCd = st.keys.some(k => Object.values(k.models || {}).some(m => m.reopenInSec > 20 && m.reopenInSec <= 25));
T('কুলডাউন Google-এর retryDelay (২৫s) মেনেছে', anyModelCd, st.keys.map(k => k.models));
T('/status-এ পূর্ণ কি নেই', !KEYS.some(k => JSON.stringify(st).includes(k)));

// ── ৪. 404 → ওই মডেল বাদ, পরের মডেলে একই কি ব্যবহার
store.set('KEY_LEDGER', JSON.stringify({ keys: {} }));
script = [err404, err404, err404, { ok: true }]; calls = [];
res = await post({ payload: {}, models: ['gemini-3.8-flash', 'gemini-3.6-flash'] });
e = await sse(res);
T('404-এর পর পরের মডেলে চলে যায়', res.status === 200 && calls[3].model === 'gemini-3.6-flash', calls);

// ── ৫. 400 API_KEY_INVALID → ওই কি স্থায়ী বাদ
store.set('KEY_LEDGER', JSON.stringify({ keys: {} }));
script = [err400key, { ok: true }]; calls = [];
res = await post({ payload: {}, models: ['gemini-3-flash-preview'] });
await sse(res);
st = await (await status()).json();
T('অবৈধ কি INVALID হিসেবে চিহ্নিত', st.keys.some(k => k.state === 'INVALID'), st.keys.map(k => k.state));

// ── ৬. 400 পেলোড ত্রুটি → বাকি কি-তে বৃথা চেষ্টা নয় (স্ট্রিমে চূড়ান্ত বার্তা)
store.set('KEY_LEDGER', JSON.stringify({ keys: {} }));
script = [err400bad, { ok: true }, { ok: true }]; calls = [];
res = await post({ payload: {}, models: ['gemini-3-flash-preview'] });
e = await sse(res);
T('পেলোড ত্রুটিতে সঙ্গে সঙ্গে থামে (১ কল)', calls.length === 1, calls);
T('চূড়ান্ত ব্যর্থতা স্ট্রিমেই জানানো হয় (fatal)', !!e.finalFailure && e.statuses.some(s => s.event === 'fatal'), e.names);

// ── ৭. নেটওয়ার্ক ব্যর্থতা → একই কি-তে একবার, তাতেও না হলে পরের কি
store.set('KEY_LEDGER', JSON.stringify({ keys: {} }));
script = [{ throw: true }, { throw: true }, { ok: true }]; calls = [];
res = await post({ payload: {}, models: ['gemini-3-flash-preview'] });
e = await sse(res);
T('নেটওয়ার্ক ব্যর্থতায় পুনঃচেষ্টা/কি-বদল হয়ে সফল', res.status === 200 && e.texts.includes('ঠিক আছে'), { calls, names: e.names });

// ── ৮. সব কি/মডেল ব্যর্থ → স্ট্রিমে চূড়ান্ত ৫০২-বার্তা (আর নীরব ৫০২ নয়)
store.set('KEY_LEDGER', JSON.stringify({ keys: {} }));
script = [err429min, err429min, err429min]; calls = [];
res = await post({ payload: {}, models: ['gemini-3-flash-preview'] });
e = await sse(res);
T('সব ব্যর্থ হলে স্ট্রিমে ৫০২ + বিস্তারিত attempts', !!e.finalFailure && e.finalFailure.status === 502 && e.finalFailure.body.attempts.length >= 1, e.finalFailure);
T('আগে থেকে "trying" ইভেন্ট দিয়ে অগ্রগতি জানানো হয়েছে', tries(e).length >= 1);
script = []; calls = [];
res = await post({ payload: {}, models: ['gemini-3-flash-preview'] });
const b2 = await res.json();
T('সব কুলিং থাকলে আপলোড ছাড়াই ৪২৯ + retryInSec', res.status === 429 && b2.retryInSec > 0 && calls.length === 0, { s: res.status, r: b2.retryInSec, calls: calls.length });

// ── ৯. part-7: MAX_TOTAL_MS env মানা হয় — ছোট বাজেটে দ্রুত থামে (বড় ফাইলের সময়-বাজেট নিয়ন্ত্রণ)
const store7 = new Map([['API_KEYS', JSON.stringify(KEYS)]]);
const env7 = { PROXY_TOKEN: TOKEN, SERVER_RETRY_MS: '25', MAX_TOTAL_MS: '60', FAYZAR_OCR_KEYS: {
  get: async k => store7.get(k) ?? null, put: async (k, v) => { store7.set(k, v); } } };
script = [err503, err503, err503, err503, err503, err503, err503, err503, err503, { ok: true }]; calls = [];
const _t7 = Date.now();
const res7 = await worker.fetch(new Request('https://w.dev/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
  body: JSON.stringify({ payload: { contents: [] }, models: ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.6-flash'] })
}), env7, ctx);
const e7 = await sse(res7);
T('part-7: MAX_TOTAL_MS env মানা হয় — ছোট বাজেটে দ্রুত failed', e7.names.includes('failed') && (Date.now() - _t7) < 10000 && calls.length <= 9, { names: e7.names, calls: calls.length, ms: Date.now() - _t7 });

// ── ১০. part-7: তিন-মডেল তালিকার কঠোর ক্রম (এলোমেলো নয়) — ৩-flash → ৩.৮ → ৩.৬
const store8 = new Map([['API_KEYS', JSON.stringify(KEYS)]]);
const env8 = { PROXY_TOKEN: TOKEN, SERVER_RETRY_MS: '1', FAYZAR_OCR_KEYS: {
  get: async k => store8.get(k) ?? null, put: async (k, v) => { store8.set(k, v); } } };
script = []; for (let i = 0; i < 24; i++) script.push(err503);
calls = [];
const res8 = await worker.fetch(new Request('https://w.dev/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
  body: JSON.stringify({ payload: { contents: [] }, models: ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.6-flash'] })
}), env8, ctx);
const e8 = await sse(res8);
const mi = (m) => calls.map((c, i) => c.model === m ? i : -1).filter(i => i >= 0);
const m1 = mi('gemini-3-flash-preview'), m2 = mi('gemini-3.8-flash'), m3 = mi('gemini-3.6-flash');
T('part-7: মডেল-ক্রম কঠোর — ৩-flash → ৩.৮ → ৩.৬ (এলোমেলো নয়)',
  calls.length > 0 && calls[0].model === 'gemini-3-flash-preview'
  && (!m2.length || (m1.length && Math.max(...m1) < Math.min(...m2)))
  && (!m3.length || !m2.length || Math.max(...m2) < Math.min(...m3)),
  calls.map(c => c.model));

// (সময়-নির্ভর পুরনো টেস্টগুলোর পরে রাখা — এর বিরতি আগের কুলডাউন-গণনা বদলে দিত)
// ── ২চ. Part-17.0: চিন্তা-গেট (includeThoughts) — ৫২৪-রোধ + চিন্তার মাঝে ব্যর্থতায় ফেইলওভার
{
  const TH = (t) => 'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: t, thought: true }] } }] }) + '\r\n\r\n';
  const TX = (t, fin) => 'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] }, ...(fin ? { finishReason: fin } : {}) }] }) + '\r\n\r\n';
  const ERR = '{\n  "error": {\n    "code": 503,\n    "message": "This model is currently experiencing high demand.",\n    "status": "UNAVAILABLE"\n  }\n}\n';
  const mk = () => { const st = new Map([['API_KEYS', JSON.stringify(KEYS)]]); return { st, env: { PROXY_TOKEN: TOKEN, SERVER_RETRY_MS: '1', WAIT_TICK_MS: '5', FAYZAR_OCR_KEYS: { get: async k => st.get(k) ?? null, put: async (k, v) => { st.set(k, v); } } } }; };
  const go = (envX, models = ['gemini-3-flash-preview']) => worker.fetch(new Request('https://w.dev/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
    body: JSON.stringify({ payload: { contents: [], generationConfig: { temperature: 0.2 } }, models })
  }), envX, ctx);

  let m = mk(); script = [{ sse: [TH('ভাবছি ১'), 10, TH('ভাবছি ২'), 10, TX('উত্তর '), TX('শেষ', 'STOP')] }]; calls = [];
  let e = await sse(await go(m.env));
  T('17.0: চিন্তার পর আসল লেখা → সফল, ক্লায়েন্ট শুধু লেখা পায় (চিন্তা নয়)', e.texts === 'উত্তর শেষ' && !/ভাবছি/.test(JSON.stringify(e.events)), { texts: e.texts });
  T('17.0: Gemini-কে includeThoughts পাঠানো হয় (অন্য generationConfig অটুট)', /"includeThoughts":true/.test(calls[0].body) && /"temperature":0.2/.test(calls[0].body), calls[0].body);
  T('17.1: ডিফল্ট চিন্তার মাত্রা low বসে', /"thinkingLevel":"low"/.test(calls[0].body), calls[0].body);
  {
    const m2 = mk(); script = [{ sse: [TX('ঠিক', 'STOP')] }]; calls = [];
    await sse(await worker.fetch(new Request('https://w.dev/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ payload: { contents: [], generationConfig: { thinkingConfig: { thinkingLevel: 'high' } } }, models: ['gemini-3-flash-preview'] }) }), m2.env, ctx));
    T('17.1: ক্লায়েন্টের নিজের মাত্রা (high) অটুট থাকে', /"thinkingLevel":"high"/.test(calls[0].body) && !/"low"/.test(calls[0].body), calls[0].body);
    script = [{ sse: [TX('ঠিক', 'STOP')] }]; calls = [];
    await sse(await worker.fetch(new Request('https://w.dev/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ payload: { contents: [], generationConfig: { thinkingConfig: { thinkingBudget: 1024 } } }, models: ['gemini-3-flash-preview'] }) }), m2.env, ctx));
    T('17.1: thinkingBudget থাকলে thinkingLevel বসে না (সংঘাত নয়)', !/thinkingLevel/.test(calls[0].body) && /"thinkingBudget":1024/.test(calls[0].body), calls[0].body);
  }
  T('17.0: চিন্তার সময় "thinking" হার্টবিট আসে', e.names.includes('thinking'), e.names);
  const log1 = JSON.parse(m.st.get('OCR_LOG'))[0];
  T('17.0: লগে চিন্তা-টুকরো গোনা হয়', log1.thoughtChunks === 2 && log1.outcome === 'success', log1);

  m = mk(); script = [{ sse: [TH('ভাবছি'), 5, ERR] }, { sse: [TH('আবার ভাবছি'), TX('দ্বিতীয় কি-তে উত্তর', 'STOP')] }]; calls = [];
  e = await sse(await go(m.env));
  T('17.0: চিন্তার মাঝে ৫০৩ → অন্য কি-তে নতুন চেষ্টা, সফল', calls.length === 2 && calls[0].key !== calls[1].key && e.texts === 'দ্বিতীয় কি-তে উত্তর', { calls: calls.map(c => c.key), texts: e.texts, names: e.names });
  T('17.0: ব্যর্থ চেষ্টার কোনো অংশ ক্লায়েন্টে যায়নি', !/ভাবছি|high demand/.test(e.texts));
  const log2 = JSON.parse(m.st.get('OCR_LOG'))[0];
  T('17.0: লগে মাঝপথের ৫০৩ SERVER হিসেবে', log2.attempts[0].class === 'SERVER' && /mid-stream/.test(log2.attempts[0].detail), log2.attempts);

  m = mk(); script = [{ sse: [TH('ভাবছি')] }, { sse: [TX('ঠিক', 'STOP')] }]; calls = [];
  e = await sse(await go(m.env));
  T('17.0: লেখা ছাড়া প্রবাহ শেষ → ফেইলওভার', calls.length === 2 && e.texts === 'ঠিক', { calls: calls.length, texts: e.texts });

  m = mk(); script = [{ sse: [TH('ভাবছি'), 'data: ' + JSON.stringify({ candidates: [{ content: { parts: [] }, finishReason: 'MAX_TOKENS' }] }) + '\r\n\r\n'] }, { sse: [TX('ঠিক', 'STOP')] }]; calls = [];
  e = await sse(await go(m.env));
  T('17.0: লেখা ছাড়াই finishReason (চিন্তায় সীমা শেষ) → ফেইলওভার', calls.length === 2 && e.texts === 'ঠিক', { calls: calls.length });

  m = mk(); m.env.ATTEMPT_TIMEOUT_MS = '60';
  script = [{ sse: [TH('১'), 400, TH('২'), 400, TH('৩'), 400, TH('৪'), 400, TX('দেরিতে')] }, { sse: [TX('দ্রুত', 'STOP')] }]; calls = [];  // সীমা সর্বনিম্ন ১০০০ms (Worker)
  e = await sse(await go(m.env));
  const log5 = JSON.parse(m.st.get('OCR_LOG'))[0];
  T('17.0: চিন্তা সময়সীমা পেরোলে TIMEOUT → পরের কি, কি-কে শাস্তি নেই', calls.length === 2 && e.texts === 'দ্রুত' && log5.attempts[0].class === 'TIMEOUT', log5.attempts);

  m = mk(); m.env.INCLUDE_THOUGHTS = 'false'; script = [{ ok: true }]; calls = [];
  await sse(await go(m.env));
  T('17.0: INCLUDE_THOUGHTS=false দিলে আগের আচরণ (includeThoughts যায় না)', !/includeThoughts/.test(calls[0].body), calls[0].body);
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
