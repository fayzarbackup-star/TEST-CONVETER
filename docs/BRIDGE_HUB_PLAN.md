# Bridge Hub — ৩-পিসি Gemini ব্রিজ (Firebase বাদ, Cloudflare Worker) — সিদ্ধান্ত ২০২৬-১০-২২

## সিদ্ধান্ত
- Firebase পুরো বাদ; নতুন আলাদা Worker `fayzar-bridge-hub` (fayzar-ocr-proxy-তে হাত নয়)।
- স্টোর: একটি Durable Object (SQLite) — কাজের সারি, পিসি-অবস্থা, জিপ/স্ক্রিনশট টুকরো (≤১MB/টুকরো)। KV নয় (ফ্রি-তে দিনে ১০০০ লেখা)।
- অথ: `Authorization: Bearer <HUB_TOKEN>` (wrangler secret); পিসিতে config.json-এ।
- ব্রাউজার সবসময় লুকানো (headless); আটকালে off-screen জানালা। লগইন শুধু প্রথমবার দৃশ্যমান।
- পরীক্ষা আগে এই পিসিতে, তারপর দোকানের ২ পিসি। ওয়েবসাইট OCR পরে হাবে (ai-ocr-engine বদল = অনুমতি লাগবে; Firebase পথ বিকল্প থাকবে)।

## হাব API (সব JSON, বাইনারি base64 টুকরো)
- `POST /task` {kind:'gemini_task'|'ocr', prompt, target?:pcId, fileName, chunks:n} → {id}; `PUT /task/:id/file/:i`
- `POST /pc/heartbeat` {pc, accounts:[{id,status}], busy:[taskId], free} — প্রতি ১০s
- `POST /claim` {pc, account} → সবচেয়ে পুরোনো pending (target মিললে) কাজ, অ্যাটমিক
- `POST /task/:id/state` {stage, elapsed, tail, chatUrl, account, warn?} ; `PUT /task/:id/shot` (JPEG ≤২০০KB, প্রতি ২–৩ মিনিট)
- `PUT /task/:id/result/:i` + `POST /task/:id/done` {status:'zip'|'nozip'|'error', chunks, error?}
- `GET /status` (সব পিসি+কাজ), `GET /task/:id`, `GET /task/:id/result/:i`, `GET /task/:id/shot`
- কমান্ড: `POST /task/:id/cmd` {cmd:'shot'|'read'|'reopen'|'ask_zip'|'cancel'|'move', to?}; পিসি heartbeat-এর উত্তরে কমান্ড পায়
- পিসি ৬০s heartbeat না দিলে তার claimed-কিন্তু-না-পাঠানো কাজ আবার pending; পাঠানো-হয়ে-যাওয়া কাজ 'orphan' (আবার পাঠানো নয়, আমি ঠিক করব)

## Pro Bridge (worker.js) বদল
- firebase-admin বাদ → hub-client (fetch)। config.json: {pcId, hubUrl, hubToken, activeAccounts, maxParallel:2}
- gemini_task: নতুন চ্যাট → Task চিপ + Argon → জিপ setInputFiles → প্রম্পট → Send; chatUrl সংরক্ষণ
- নিজে নজর: উত্তর শেষ → download ধরা (acceptDownloads) → result টুকরো; জিপ নেই → 'nozip' + tail (নিজে বার্তা পাঠাবে না); পাতা হারালে chatUrl দিয়ে reopen; ক্যাপচা/কোটা/আপলোড-ব্যর্থ → অ্যাকাউন্ট 'bad', কাজ পাঠানোর আগে হলে অন্য অ্যাকাউন্ট/সারি; ৬০ মিনিটে warn, বাতিল নয়
- পুরোনো OCR কাজ একই claim-পথে (kind:'ocr')

## আমাদের দিক
- `tools/bridge_task.mjs`: send <zip> --prompt <md> [--pc], status, shot <id>, cmd <id> <cmd>, fetch <id> → Downloads\gemini-inbox\<TASK>.zip, watch (অবস্থা বদলালেই প্রিন্ট)
