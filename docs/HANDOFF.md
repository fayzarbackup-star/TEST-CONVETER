# হ্যান্ডঅফ — ২০২৬-১০-১৮ (গভীর রাত)
- **আগে পড়ো:** docs/GEMINI_TAB_WORKFLOW.md শুরুর "ট্যাব-নিয়ম" (অ্যাকাউন্ট-ভিত্তিক `--acct`, background, অনুমতি নয়, থামা নয়, পুরোনো-ভিত্তি বিপদ)। কোড Gemini লেখে; Claude বান্ডেল/যাচাই/বসানো/push। F1–F3/H-এর অনুমতি আছে।
- শুরু: bridge (পোর্ট 18765; EADDRINUSE = আগেই চালু) → `node tools/gemini-tabs-state.mjs` → `node tools/gemini-round.mjs list` → `watch --every 240 --stop-on-file` (bg)।
- বসানো-ধাপ: inbox → scratchpad → cmp → সুইচ-চিহ্ন grep → ব্যাকআপ scratch/backups/ → বসাও → টেস্ট → `run-all` → push।
- **builder-ক্রম:** u/7 B_TABLE_REBASE_v9 চলছে (১৬:৩৫Z পাঠানো) → এলে বসাও → F3 rebase (in/A1_F3_REBASE_v8, u/1) → A1_F1_PAGEFIT_FIX_v6 (u/1) → F2_WIRE FIX (stage_f2w8; u/0)। শেষ দুটো studio-controller ছোঁয়, একটার পর একটা।
- ফাঁকা u/5, u/6: পরের প্রস্তাব u/6-এ D1–D4 puppeteer E2E টেস্ট (builder ছোঁয় না; ফাইল: index.html, js/result-relayout.js, tests/result-relayout.test.mjs, নমুনা tests/studio-edit-e2e.test.mjs) — বান্ডেল এখনো বানানো হয়নি।
- WORK_PLAN-এর ☐/◐ ১০-১৮ রাতে কোড দেখে হালনাগাদ করা।
- **হুবহু স্কোর:** চালাতে `node serve.js` (bg, 3008) + `$env:ASIS_DIR="$env:USERPROFILE\Downloads"` → `node qa/golden/asis-score.mjs --ids f1`। ১০-১৮: f1 ৬৯.০→**৮০.৭** (লেআউট ৭৪, পাতা ৩/৩)। ২১টির শেষ-মাপা গড় ৭৭.১ (১০-১৪…১৬)। মূল PDF শুধু f1-এর আছে; "AS it IS" ফোল্ডার নেই ⇒ বাকি ২০টির নতুন মাপ সম্ভব নয়।
- বাকি সিদ্ধান্ত (ব্যবহারকারী): "AS it IS" নমুনা-ফোল্ডার ফেরত দেওয়া; H — ক্যাশমেমো ৯/১০pt, পুরোনো ফোল্ডার মোছা; OCR-প্রক্সি deploy কবে; সুইচ ডিফল্ট-চালু।
