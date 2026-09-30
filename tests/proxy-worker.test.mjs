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
  calls.push({ key: key.slice(-4), model });
  const r = script.shift() || { ok: true };
  if (r.throw) throw new Error('network down');
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

// ── ২ক. 503 → আগে একই কি-তে ছোট বিরতিতে ১ বার, তারপর (দুই কি ব্যর্থ হলে) মডেল বদল
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
T('৫০৩-এ আগে একই কি-তে একবার পুনঃচেষ্টা', e3.names.includes('retry_same_key'), e3.names);
T('দুই কি ৫০৩ খেলে মডেল বদল হয় (সব কি শেষ করার আগেই)', e3.names.includes('switch_model') && calls[calls.length-1].model === 'gemini-3.6-flash', { names: e3.names, calls });
T('এই পথে একই মডেলে সব কি নষ্ট হয় না (≤৩ Gemini কল)', calls.filter(c => c.model === 'gemini-3-flash-preview').length <= 3, calls);
T('শেষ পর্যন্ত সফল ও আউটপুট এসেছে', res3.status === 200 && e3.texts.includes('ঠিক আছে'));

// ── ২খ. Sticky: মডেল-ক্রম (গুণমান-অগ্রাধিকার) অটুট; শুধু ওই মডেলের ভেতরে ধরা-পড়া কি আগে
const store4 = new Map([['API_KEYS', JSON.stringify(KEYS)],
  ['LAST_GOOD', JSON.stringify({ mask: KEYS[2].slice(0,6) + '...' + KEYS[2].slice(-4), model: 'gemini-3.6-flash', at: Date.now() })]]);
const env4 = { PROXY_TOKEN: TOKEN, SERVER_RETRY_MS: '1', FAYZAR_OCR_KEYS: {
  get: async k => store4.get(k) ?? null, put: async (k, v) => { store4.set(k, v); } } };
script = [err429min, err429min, err429min, { ok: true }]; calls = [];
const res4 = await worker.fetch(new Request('https://w.dev/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
  body: JSON.stringify({ payload: { contents: [] }, models: ['gemini-3-flash-preview', 'gemini-3.6-flash'] })
}), env4, ctx);
const e4 = await sse(res4);
const t4 = tries(e4);
T('Sticky: আগের সফল মডেল পিছনের হলেও গুণমান-অগ্রাধিকার অটুট (প্রথম চেষ্টা ১ নম্বর মডেলই)',
  t4.length >= 1 && calls[0].model === 'gemini-3-flash-preview' && t4[0].model === 'gemini-3-flash-preview',
  { tries: t4.map(x => x.model), calls });
T('Sticky: ওই মডেলের ভেতরে ধরা-পড়া কি-টিই সবার আগে (মডেল বদল হয় না)',
  !!calls[3] && calls[3].model === 'gemini-3.6-flash' && calls[3].key === KEYS[2].slice(-4),
  calls);

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

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
