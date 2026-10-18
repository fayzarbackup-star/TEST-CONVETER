# হ্যান্ডঅফ — ২০২৬-১০-১৮ (রাত)
- পদ্ধতি: docs/GEMINI_TAB_WORKFLOW.md। কখনো জিজ্ঞেস নয়: নিজেই Chrome-এ অবতার → অ্যাকাউন্ট বদল (৮টি লগইন) → জিপ পাঠাও → ৩–৫ মিনিটে একটি করে ট্যাব রিফ্রেশ → fetch।
- উত্তর আনা: bridge (`node gemini-bridge-extension/bridge_server.mjs` background) → `agent_manager.mjs status` / `reload --tab N` / `fetch --tab N`। **`--name` = ফাইলনামের ফিল্টার** (আউটপুট-নাম নয়; ভুল নাম দিলে "No files")। Claude in Chrome-এর ট্যাব-গ্রুপ প্রায়ই ভাঙে; উত্তর আনায় bridge-ই নির্ভরযোগ্য।
- v3 রাউন্ড শেষ ও বসানো (সব সুইচ-গেটেড, ডিফল্ট অপরিবর্তিত): A2_REGISTRY (১৬ আর্কিটাইপ এন্ট্রি, `__FZ_ON_REGISTRY`, টেস্ট ৪৬/৪৬), A3_OTSU (inkMask/pageBackground/blockShade/darkBandMask, `mask.thr`, টেস্ট ৭/৭), A1_MATHH (faithful-docx-builder + layout-ir, টেস্ট ২৯/২৯)। পুরো সেট ১৯৫৪/০। push হয়নি।
- ব্যাকআপ: scratch/backups/v3_apply_20261018/। উত্তর-জিপ: Downloads\gemini-inbox\A*_v3*.zip।
- bridge বদল: background.js FETCH_FILES-এ `[role=button]` কার্ড + খালি হলে `debug`; bridge_server `/fetch-files` debug পাস করে (এক্সটেনশন `/reload` করা হয়েছে)।
- বাকি: (১) otsu-threshold ও math-height টেস্ট run-all-এ যুক্ত কি না যাচাই/যোগ; (২) A2-এর README অনুযায়ী HTML-এ layout-registry script ট্যাগ (সুইচ বন্ধ থাকায় ঐচ্ছিক); (৩) MATHH/OTSU চালু করে asis-score ২–৩টি ফাইল (গণিত-পাতা, স্ক্যান) → ভালো হলে ডিফল্ট চালুর সিদ্ধান্ত ব্যবহারকারীর; (৪) push (main)।
- পরের রাউন্ড: নতুন কাজ ঠিক করে v4 বান্ডেল → অব্যবহৃত অ্যাকাউন্ট (3, 6, 7, 8)।
