# হ্যান্ডঅফ — ২০২৬-১০-১৮ (রাত শেষ)
- **আগে পড়ো:** docs/GEMINI_TAB_WORKFLOW.md-এর "ট্যাব-নিয়ম" (৭ ট্যাব, অ্যাকাউন্ট→কাজের ধরন, `--acct`, background, অনুমতি নয়, থামা নয়)। কোড Gemini লেখে; Claude বান্ডেল/যাচাই/বসানো/push (memory delegate-coding-to-gemini)। F1–F3/H-এর অনুমতি দেওয়া।
- শুরু: `node gemini-bridge-extension/bridge_server.mjs` (bg) → `node tools/gemini-round.mjs list` → অসমাপ্ত থাকলে `watch` (bg)। উত্তর: Downloads\gemini-inbox → scratchpad-এ খোলো → চলতি ফাইলের সাথে cmp → ব্যাকআপ scratch/backups/ → বসাও → সংশ্লিষ্ট টেস্ট → `node tests/run-all.mjs` → `node scratch/github_sync.js --push "..."`।
- push হয়েছে: v3 (db6108e), E2 (c64378f), v4 ROWCHECK+REBREAK (e26a994)।
- বসানো, push বাকি (পুরো সেট চলছে): E3 রেজিস্ট্রি (app/pad/সনদ/সিভি, টেস্ট ১৮/১৮), F2 `docx-preview-render.js` (৭/৭, এখনো স্টুডিওতে বসানো নয় — `__FZ_ON_DOCX_PREVIEW`), F1 স্টুডিও-অংশ (studio-controller `studioMasterOn` + studio.html ৫ script; সুইচ বন্ধ)।
- চলমান (rounds.json): u/1 A1_F1_PAGEFIT_v5 (মাস্টার-পথে app-job/cash-memo ১→২ পাতা), u/5 C_CLS_PAD_v5, u/6 D_RELAYOUT_v5, u/7 B_FORM_v5, u/0 G_CHUNK_v5 (শেষ তিনটি পাঠানো চলছে)।
- v6: u/2 A2_REGISTRY_EXAM_v6 চলছে; u/4 A3_F2_WIRE_v6 ইনপুটে বসানো কিন্তু Send কাজ করছে না (ক্লিক+Enter দুটোই; সম্ভবত লিমিট/অ্যাকাউন্ট-অবস্থা) — ব্যবহারকারী Send চাপলে চলবে; না হলে কুলডাউনের পর আবার।
- পরের ধাপ: PAGEFIT এলে `qa/studio-master-compare.mjs` + Word-তুলনা (scratchpad wordcmp.ps1 ধাঁচ) → ঠিক হলে `__FZ_ON_STUDIO_MASTER` ডিফল্ট চালু (F1 ☑); F2 স্টুডিওতে জোড়ার কাজ u/4-কে; F3 (হুবহু-নকশা স্টুডিওতে) u/1-কে; E3-এর পর প্রশ্নপত্র রেজিস্ট্রিতে u/2-কে।
- বাকি সিদ্ধান্ত (ব্যবহারকারী): H — ক্যাশমেমো ৯/১০pt, কোন পুরোনো ফোল্ডার মোছা। নমুনা PDF ("Downloads\AS it IS") নেই ⇒ asis-score বন্ধ।
