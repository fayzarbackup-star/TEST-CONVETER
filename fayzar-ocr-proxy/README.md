# Fayzar OCR Proxy — KeyLedger Worker

ক্লায়েন্ট **একবারই** ফাইল আপলোড করে; কি ব্যর্থ হলে Worker নিজে পরের কি দিয়ে একই
পেলোড Gemini-তে পাঠায়। প্রতিটি কি-এর ব্যবহার ও "কখন আবার খুলবে" KV-তে খতিয়ান
(`KEY_LEDGER`) আকারে থাকে।

## ফাইল

| ফাইল | কাজ |
| :--- | :--- |
| `index.js` | Worker entry — রাউটিং, কি×মডেল ফেইলওভার, স্ট্রিম রিলে |
| `ledger.js` | খতিয়ানের পিওর লজিক (I/O নেই) — `tests/key-ledger.test.js` দিয়ে অফলাইনে টেস্ট করা হয় |
| `wrangler.toml` | ডিপ্লয় কনফিগ (KV binding) |

## এন্ডপয়েন্ট

| মেথড | পাথ | কাজ |
| :--- | :--- | :--- |
| `POST` | `/` | `{ payload, models?: string[], model?: string }` → SSE স্ট্রিম |
| `GET` | `/status` | মাস্কড কি-তালিকা, আজকের ব্যবহার, সফল/ব্যর্থ, কাউন্টডাউন |

সফল রেসপন্সের হেডার: `X-Fayzar-Key` (মাস্কড), `X-Fayzar-Model`, `X-Fayzar-Attempts`।

## ব্যর্থতা অনুযায়ী কুলডাউন

| ত্রুটি | শ্রেণি | কি বন্ধ থাকবে |
| :--- | :--- | :--- |
| 429 + `RetryInfo.retryDelay` | `RPM` | ঠিক ততটুকু সময় (না থাকলে ৬০s) |
| 429 + `quotaId: …PerDay…` | `RPD` | Pacific মধ্যরাত পর্যন্ত (শুধু ওই মডেল) |
| 404 / model not found | `MODEL_NA` | ওই মডেল ৬ ঘণ্টা; কি সুস্থ থাকে |
| 400 `API_KEY_INVALID` / 403 | `INVALID` | স্থায়ী (ম্যানুয়াল রিসেট) |
| 500/503/নেটওয়ার্ক | `SERVER` | ৩০s → ৬০s → ১২০s → ৩০০s |
| 400 (অন্য) | `FATAL_INPUT` | কি বন্ধ হয় না; ফেইলওভারও হয় না (পেলোড দোষী) |

## ডিপ্লয়

```bash
npm i -g wrangler          # একবার
wrangler login

# ১. KV namespace তৈরি (একবার)
wrangler kv namespace create FAYZAR_OCR_KEYS
#   → আউটপুটের id টি wrangler.toml-এ REPLACE_WITH_YOUR_KV_NAMESPACE_ID-এর জায়গায় বসান

# ২. কি-গুলো KV-তে রাখুন (রিপোতে কোনো কি থাকবে না)
wrangler kv key put --binding=FAYZAR_OCR_KEYS API_KEYS '["AIzaSy...1","AIzaSy...2"]' --remote

# ৩. ডিপ্লয়
cd fayzar-ocr-proxy
wrangler deploy
```

যাচাই:

```bash
curl https://<your-worker>.workers.dev/status | jq
```

## গুরুত্বপূর্ণ সীমা

ক্লায়েন্টকে স্ট্রিম পাঠানো **শুরু হয়ে গেলে** মাঝপথে কি বদলানো যায় না। তাই সব
ফেইলওভার হয় প্রথম বাইট যাওয়ার আগেই। মাঝপথে স্ট্রিম ভাঙলে ব্রাউজার-সাইড লজিক
(`js/ai-ocr-engine.js`) সেটিকে **অসম্পূর্ণ** ধরে পরের কি দিয়ে পুনরায় চেষ্টা করে এবং
অসম্পূর্ণ আউটপুট কখনোই অটো-ডাউনলোড হতে দেয় না।

## খতিয়ান রিসেট

```bash
wrangler kv key delete --binding=FAYZAR_OCR_KEYS KEY_LEDGER --remote
```
