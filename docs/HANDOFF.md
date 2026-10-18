# হ্যান্ডঅফ — ২০২৬-১০-১৮ (গভীর রাত)
- পদ্ধতি: docs/GEMINI_TAB_WORKFLOW.md-এর শুরুর "সহজ পথ" (bridge + `tools/gemini-round.mjs send|watch|list`)। কখনো ব্যবহারকারীকে জিজ্ঞেস নয়।
- v3 (REGISTRY/OTSU/MATHH) বসানো ও GitHub main-এ push (commit db6108e); টেস্ট ১৯৫৪/০।
- ✅ A2_REGISTRY_E2_v4 বসানো + push (c64378f), টেস্ট ১৯৬০/০ (ট্যাব0-এ ভুলে দুবার পাঠানো হয়েছিল — দ্বিতীয় উত্তর উপেক্ষা; gemini-round send-এ এখন দ্বৈত-পাঠানো পাহারা)।
- **v4 চলমান** (scratch/bundles/rounds.json): ট্যাব1 fayzarbackup4 ← A3_ROWCHECK_v4 (ছবি থেকে ছক-সারি যাচাই); ট্যাব2 fayzarbackup1 ← A1_REBREAK_v4 (লাইন-মেলানো DP মডিউল)। প্রম্পট: scratch/bundles/prompts/*_v4.md।
- `gemini-round.mjs watch` background-এ চলছে; বন্ধ হলে আবার চালাও। উত্তর এলে: Downloads\gemini-inbox → scratchpad-এ খোলা → cmp (চলতি ফাইলের সাথে) → ব্যাকআপ (scratch/backups/) → বসানো → সংশ্লিষ্ট টেস্ট → পুরো সেট → push।
- পরের নতুন অ্যাকাউন্টের কাজ তৈরি আছে: scratch/bundles/prompts/A3_CLS_PAD_v4.md (প্যাড-নোটিশ/আবেদন → OFFICE_PAD; বান্ডেল এখনো বানানো হয়নি)।
- bridge বদল (১০-১৮): background.js `sendPromptTrusted` + `attachViaDebugger` (debugger permission), FETCH_FILES `[role=button]` + debug; bridge_server `/send` ফাইল-পথ পাঠায়, `/fetch-files` debug দেয়। `--name` = ফাইলনাম-ফিল্টার।
- বাকি সিদ্ধান্ত: নমুনা PDF ("Downloads\AS it IS") এই পিসিতে নেই ⇒ asis-score মাপা যায়নি; MATHH/OTSU ডিফল্ট চালু করার আগে স্কোর লাগবে (ফোল্ডার ফিরিয়ে দিলে মাপা হবে)।
