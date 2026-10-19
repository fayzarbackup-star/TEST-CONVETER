# হ্যান্ডঅফ — ২০২৬-১০-১৯ (সন্ধ্যা) — একসাথে ২টির বেশি ট্যাব নয় (পিসি হ্যাং)
- **আগে পড়ো:** docs/GEMINI_TAB_WORKFLOW.md। bridge পোর্ট 18765। নতুন চ্যাট: `/navigate-tab?tabId=<id>&url=https://gemini.google.com/u/N/app` → `/switch-mode?tabId=<id>&mode=Argon` → `node tools/agent_manager.mjs send --tab T --task <ID> --prompt "সংযুক্ত জিপের PROMPT.md অনুযায়ী কাজ করুন।" --file <zip>` (`--acct` নেই!)। u/2-তে Task বোতাম নেই।
- **লক্ষ্য:** গঠন নির্ভুল + সম্পাদনায় ফরম্যাট না ভাঙা, তারপর স্কোর ১০০-র কাছে।
- **বসানো (সব সুইচ বন্ধ):** P1LOSS(a17), A01FIX(a01), P2DRIFT(a05), RULEFIX(a02) — tools/merge3.mjs দিয়ে মেলানো; run-all 2529/0। ব্যাকআপ: scratch\backup-a17 (চারটির আগের মূল), scratch\backup-pre-merge (A17-পরের)।
- **স্কোর:** a01 72.6→**96.7** (A01FIX), a02 84→**90.4** (RULEFIX)। a17 (db122fdf….pdf), a05 (278_TR-13.pdf), a04 (261_ATC_8.pdf) মূল PDF নেই → ব্যবহারকারীর কাছে চাও, তারপর `FZ_ON=<SW> --ids <id>`।
- **সিদ্ধান্ত বাকি (ব্যবহারকারী):** A01FIX ও RULEFIX ডিফল্ট-চালু? (আগে ২–৩টি ভালো ফাইলে রিগ্রেশন নেই যাচাই: a09, a14)। আগের সুইচ TABLECOL/PAGES4/EXTRALINES/A10LINES/WRAPFIT মাপা বাকি।
- **Arena:** arena-bridge-extension (Chrome-এ লোড করা, পোর্ট 18766, সার্ভার `node arena-bridge-extension/bridge_server.mjs`) + `node tools/arena_send.mjs status|probe|send|read`। auto-mode classifier আপলোড/পাঠানো আটকায় → bypass মোড বা হাতে পাঠানো। Arena-তে A05 কাজ চলছে (ব্যবহারকারী পাঠিয়েছেন) — উত্তর এলে Gemini-র P2DRIFT-এর সাথে তুলনা।
- **বাকি জিপ:** A14_BOXSPLIT_v1.zip (Downloads), inbox\A1_F1_PAGEFIT_FIX_v6.zip — merge3 দিয়ে বসাও → টেস্ট → push।
- **নমুনা:** scratch\samples\asis; `$env:ASIS_DIR=(Resolve-Path scratch\samples\asis).Path`। Gemini টেস্টে `samples/` পথ → `qa/golden-data/asis/` করতে হয়।
- asis-score চালানোর আগে লুকানো WINWORD বন্ধ করো (EBUSY)। পুরোনো সিদ্ধান্ত: ক্যাশমেমো ৯/১০pt; পুরোনো ফোল্ডার মোছা; OCR-প্রক্সি deploy।
