# হ্যান্ডঅফ — ২০২৬-১০-২১ (দুপুর ~১২:৩০) — কাজ একটানা চলবে, থামবে না
- **লাইভ (push 2e9a774):** ডিফল্ট ১৬: WRAPFIT NESTBOX TBLMERGE A03FIX A16FIX VSPACE BOXSPLIT SERIALHANG A07FIX2 A14FIX3 WIDTH A16FIX3 A14RULES A14FIX4 RULES2 A13FIX। **A07FIX3 বাদ** — a07-এর টেবিল ভাঙত (স্কোর ধরেনি)। নতুন ডিফল্টের a07 রান = ট্যাগ `DEF16b` (টেবিল অক্ষত, লেআউট ৮২.৭)।
- **টেবিল-নিয়ম (ব্যবহারকারী):** আগে পূর্ণ গ্রিড → তারপর gridSpan/vMerge → তারপর লেখা; টেবিল কাটা/দাগ মোছা/অকারণ ধূসর নিষেধ (_RULES_TAIL-এ যোগ)। টেবিল ছোঁয়া সুইচ গ্রহণের আগে টেবিল-পাতার compare PNG চোখে দেখো। **বাকি:** qa-স্কোরে টেবিল-গ্রিড অখণ্ডতা পরীক্ষা যোগ (scratchpad tblsplit.mjs-এর ধারণা থেকে)।
- **বসানো কিন্তু বন্ধ:** FONTFIX, INDENT v2, A16FIX4, A07FIX3।
- **Downloads-এ, বসানো বাকি (একটি একটি; টেবিল চোখে দেখে):** A16_SCORE_v5 (দুটি কপি, "(1)" নতুন), A03_SCORE_v2, A09_SCORE_v1।
- **Gemini ট্যাব (tabIndex = /tabs অবস্থান):** 0 u/1 A07_SCORE_v5 (A07FIX5, ভিত্তি DEF16b, নোটে টেবিল-নিষেধ) · 1 u/2 A14_SCORE_v5 · 2 u/7 A07_SCORE_v4 (পুরোনো ভিত্তি A07FIX3-সহ — উত্তর এলে সাবধানে, টেবিল দেখো) · 3 u/3 A02_SCORE_v1। নজর `watchn.ps1 "0=A07_SCORE_v5,1=A14_SCORE_v5,2=A07_SCORE_v4,3=A02_SCORE_v1"` (শুধু fetch; চলমান চ্যাটে কখনো স্বয়ংক্রিয় বার্তা নয়)।
- **পাঠানো আটকালে:** পুরোনো ট্যাব about:blank → `Start-Process chrome https://gemini.google.com/u/N/app` → সঙ্গে সঙ্গে `agent_manager send --tab <অবস্থান> --task T --prompt "<ইংরেজি>" --file <bundle> --force`।
- **বসানোর চক্র:** `apply_reply.ps1 <ID>` → `merge-switch-check` → হারানো লাইন হাতে → টেস্ট পিন → run-all (otsu গতি-টেস্ট Word চলাকালীন মাঝে মাঝে ব্যর্থ — আলাদা চালিয়ে দেখো) → asis-ab → টেবিল-পাতা চোখে → কেউ না কমলে switch-defaults → run-all → push।
- **Desktop:** `Fayzar-তুলনা-2026-10-21\` (compare PNG ২৪টি, Word-ডিফল্ট১৬\*.docx, a07-টেবিল-ঠিক.docx)।
