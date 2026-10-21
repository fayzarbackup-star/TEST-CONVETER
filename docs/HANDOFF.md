# হ্যান্ডঅফ — ২০২৬-১০-২১ রাত — কাজ একটানা চলবে, থামবে না
- **লাইভ:** ডিফল্ট ২০ (…A07FIX5, A12FIX), রান-ট্যাগ S20_0c8d9f40 (a01 98.7, a02 94.9, a03 96.5, a06 69, a07 84.1, a12 99.6, a13 96.7, a14 95.6)। A03FIX3 কোডে, **বন্ধ**।
- **A02FIX (A02_SCORE_v1) কোডে বসানো** (হারানো লাইন হাতে: safeNoWrapTail, isA02OptCell tcMar, exports, line-fit measure-শর্ত) — a02fix টেস্ট 40/0, run-all 3368/0। এখন asis-ab চলছে (`--on A02FIX --base <২০> --ids a02,a01,a12,a13,a03`); ভালো হলে switch-defaults-এ যোগ → run-all → push।
- **A07_SCORE_v4 বাতিল** (A07FIX3-পথ চালু করে, টেবিল ভাঙে; A07FIX5 ইতিমধ্যে ডিফল্ট) — বসানো হয়নি।
- **Gemini ট্যাব:** 0 u/4 **A03_SCORE_v4** চলছে · 1 u/7 **A07_SCORE_v6** চলছে (S20 ভিত্তি, সুইচ A07FIX6) · 2 u/3 খালি · 3 u/2 **A06_SCORE_v1** চলছে।
- **ট্যাব 2-এর পরের কাজ:** আগে f1,a16,a08,a18 S20(+A02FIX হলে নতুন ভিত্তি)-এ স্কোর করো (asis-ab --ids দিয়ে ভিত্তি-রান হয়), তারপর সবচেয়ে দুর্বলটি পাঠাও।
- **নজর:** `powershell -File scratch\watchn.ps1 "3=A06_SCORE_v1,0=A03_SCORE_v4,1=A07_SCORE_v6"` (শুধু fetch)।
- **বসানোর চক্র:** `apply_reply.ps1 <ID>` → `node tools/merge-switch-check.mjs scratch/stage_<ID>` → হারানো লাইন হাতে → টেস্ট → run-all → `node qa/golden/asis-ab.mjs --on X --base <২০ কমা-তালিকা> --ids <লক্ষ্য>,a01,a12,a13,a03` → খারাপ হলে compare PNG → টেবিল চোখে → switch-defaults → run-all → `node scratch/github_sync.js --push "<msg>"`।
- **পাঠানো:** `sendtask.ps1 <TASK> <id> <runTag> <SW> <idx> <tabId> <acct> [note.md]`; tabId: 0=342327911, 1=342327931, 2=342327946, 3=342327925। ফাইল আগেই সংযুক্ত থাকলে `agent_manager send` **--file ছাড়া**।
- **নতুন সেশন:** ~১০০K টোকেন হলে HANDOFF → পটভূমি বন্ধ → `tools\new-session.bat`।
