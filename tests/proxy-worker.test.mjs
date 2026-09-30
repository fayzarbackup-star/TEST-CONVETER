/**
 * Worker ইন্টিগ্রেশন টেস্ট — নকল KV ও নকল Gemini দিয়ে আসল fetch হ্যান্ডলার চালানো।
 *   node tests/proxy-worker.test.mjs
 * সম্পূর্ণ অফলাইন; কোনো নেটওয়ার্ক বা ডিপ্লয় লাগে না।
 */
import worker from '../fayzar-ocr-proxy/index.js';

const KEYS = ['AIzaSyAAAA1111AAAA1111AAAA1111AAAA1111', 'AIzaSyBBBB2222BBBB2222BBBB2222BBBB2222', 'AIzaSyCCCC3333CCCC3333CCCC3333CCCC3333'];
const store = new Map([['API_KEYS', JSON.stringify(KEYS)]]);
const env = { FAYZAR_OCR_KEYS: {
  get: async k => store.get(k) ?? null,
  put: async (k, v) => { store.set(k, v); }
}};
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

const post = (body) => worker.fetch(new Request('https://w.dev/', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
}), env, ctx);
const status = () => worker.fetch(new Request('https://w.dev/status'), env, ctx);

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

const err429min = { status: 429, body: { error: { code: 429, message: 'quota', details: [
  { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerMinutePerProjectPerModel' }] },
  { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '25s' }] } } };
const err404 = { status: 404, body: { error: { code: 404, message: 'models/x is not found for API version v1beta' } } };
const err400key = { status: 400, body: { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } } };
const err400bad = { status: 400, body: { error: { code: 400, message: 'Invalid JSON payload received' } } };

// ── ১. প্রথম কি-তেই সফল
script = [{ ok: true }]; calls = [];
let res = await post({ payload: { contents: [] }, models: ['gemini-3-flash-preview'] });
T('প্রথম কি-তে সফল → ২০০ ও SSE', res.status === 200 && res.headers.get('Content-Type').includes('event-stream'));
const hKey = res.headers.get('X-Fayzar-Key') || '';
T('হেডারে মাস্কড কি ও মডেল আছে', hKey.includes('...') && res.headers.get('X-Fayzar-Model') === 'gemini-3-flash-preview', hKey);
T('হেডারের মাস্ক ASCII-only (ByteString নিরাপদ)', /^[\x20-\x7E]+$/.test(hKey), hKey);
T('পূর্ণ কি হেডারে ফাঁস হয় না', !KEYS.some(k => (res.headers.get('X-Fayzar-Key') || '').includes(k)));
T('মাত্র ১টি Gemini কল হয়েছে', calls.length === 1, calls);

// ── ২. ২টি কি 429 → ৩য় কি-তে সফল (একই আপলোড, ক্লায়েন্ট কিছু জানে না)
script = [err429min, err429min, { ok: true }]; calls = [];
res = await post({ payload: { contents: [] }, models: ['gemini-3-flash-preview'] });
T('২টি 429-এর পর ৩য় কি-তে সফল', res.status === 200 && res.headers.get('X-Fayzar-Attempts') === '3', calls);
T('ফেইলওভারে ক্লায়েন্টের পুনঃআপলোড লাগেনি (১ রিকোয়েস্ট)', calls.length === 3);

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
T('404-এর পর পরের মডেলে চলে যায়', res.status === 200 && calls[3].model === 'gemini-3.6-flash', calls);

// ── ৫. 400 API_KEY_INVALID → ওই কি স্থায়ী বাদ
store.set('KEY_LEDGER', JSON.stringify({ keys: {} }));
script = [err400key, { ok: true }]; calls = [];
res = await post({ payload: {}, models: ['gemini-3-flash-preview'] });
st = await (await status()).json();
T('অবৈধ কি INVALID হিসেবে চিহ্নিত', st.keys.some(k => k.state === 'INVALID'), st.keys.map(k => k.state));

// ── ৬. 400 পেলোড ত্রুটি → বাকি কি-তে বৃথা চেষ্টা নয়
store.set('KEY_LEDGER', JSON.stringify({ keys: {} }));
script = [err400bad, { ok: true }, { ok: true }]; calls = [];
res = await post({ payload: {}, models: ['gemini-3-flash-preview'] });
T('পেলোড ত্রুটিতে সঙ্গে সঙ্গে থামে (১ কল)', res.status === 502 && calls.length === 1, calls);

// ── ৭. নেটওয়ার্ক ব্যর্থতা → পরের কি
store.set('KEY_LEDGER', JSON.stringify({ keys: {} }));
script = [{ throw: true }, { ok: true }]; calls = [];
res = await post({ payload: {}, models: ['gemini-3-flash-preview'] });
T('নেটওয়ার্ক ব্যর্থতায় পরের কি-তে সফল', res.status === 200 && calls.length === 2);

// ── ৮. সব কি কুলিং → 429 + retryInSec
store.set('KEY_LEDGER', JSON.stringify({ keys: {} }));
script = [err429min, err429min, err429min]; calls = [];
res = await post({ payload: {}, models: ['gemini-3-flash-preview'] });
const body = await res.json();
T('সব ব্যর্থ হলে ৫০২ ও বিস্তারিত attempts', res.status === 502 && body.attempts.length === 3, body.attempts);
script = []; calls = [];
res = await post({ payload: {}, models: ['gemini-3-flash-preview'] });
const b2 = await res.json();
T('সব কুলিং থাকলে আপলোড ছাড়াই ৪২৯ + retryInSec', res.status === 429 && b2.retryInSec > 0 && calls.length === 0, { s: res.status, r: b2.retryInSec, calls: calls.length });

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
