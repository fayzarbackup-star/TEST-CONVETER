# হ্যান্ডঅফ — ২০২৬-১০-২২ — কাজ একটানা চলবে
- **লাইভ:** ডিফল্ট ২৬ (…F1FIX, A18FIX, **A08FIX**) — A08 push চলছে/হয়েছে (run-all আগে 3546/0)। স্কোর: a01 98.7, a02 95.3, a03 96.5, a06 96.1, a07 84.5, a12 99.6, a13 96.7, a14 95.6, a16 94.6, a08 **98.9** (ছবি 92), a18 99.5, f1 94.3। A08 ট্যাগ S26_3b93d252 (ভিত্তি S25 যাচাই হয়েছে: 99.5/94.3/84.5 মিলেছে)।
- **A08 বসানো:** apply_reply-এ ১৮ হুক হারিয়েছিল ⇒ scratchpad-এর port-lost.mjs (টোকেন-ডিফ base→theirs, `name()` এক টোকেন) দিয়ে ১২ লাইন + layout-ir export হাতে। এটি tools/-এ তুলে রাখা ভালো। বাকি খুঁত: a08 "১.  অফিসের নামঃ"-এ ক্রমিকের পরে এখনো বড় ফাঁক (SERIALHANG) — পরের A08 কাজে।
- **পরের কাজ:** A16_SCORE_v6.zip এসেছে (Downloads 23:24, এখনো বসানো হয়নি; সুইচ A16FIX6, টেস্ট a16fix6) → `apply_reply.ps1 A16_SCORE_v6` → port-lost দিয়ে হারানো হুক → টেস্ট → run-all → asis-ab --on A16FIX6 --base <২৬ তালিকা> --ids a16,a14,a13 + পার্শ্ব a08,a18 → ছবি/টেবিল চোখে।
- **Gemini ট্যাব:** 0 u/0 **F1_SCORE_v2 চলছে** (একবার পাঠানো; নজর `watchn.ps1 "0=F1_SCORE_v2"`) · 1 u/7, 2 u/3, 3 u/2 খালি।
- **⚠ ব্যবহারকারী (১০-২২):** "ফাইলের কাজ চলছে, আবার পাঠাচ্ছেন কেন?" ⇒ ব্যবহারকারী না বলা পর্যন্ত কোনো ট্যাবে নতুন কিছু পাঠানো স্থগিত। ২২:৪৫-এর পুরোনো F1v2 চেষ্টা (অন্য ট্যাব) আসলে চলছিল কিনা অনিশ্চিত।
- **বসানোর চক্র:** `apply_reply.ps1 <ID>` → `node tools/merge-switch-check.mjs scratch\stage_<ID>` → হারানো হুক → টেস্ট → run-all → asis-ab → ছবি/টেবিল চোখে → switch-defaults → run-all → `node scratch/github_sync.js --push "<msg>"`।
- **OCR proxy:** US Durable Object `UsEgress` deploy f5967cb3 (rollback 45575dec); লগে `viaUs`; `node qa/proxy-log.mjs`। মাল্টি-পিসি ব্রিজ — ব্যবহারকারীর কাছে ব্রিজ-অ্যাপের কোড/Drive পথ বাকি।
- **নতুন সেশন:** ~১০০K টোকেন হলে HANDOFF → পটভূমি বন্ধ → `tools\new-session.bat`।
