# হ্যান্ডঅফ — পরের সেশন এখান থেকে (হালনাগাদ ২০২৬-১০-০৯)

**শেষ কাজ:** Part-19.3 — `js/docx-to-doc-engine.js` (অনুমতিতে): .doc-এ লাইন-দূরত্ব এখন `line-height:NN%` (আগে এককহীন ⇒ Word ১.০ করত) + `keepNext` → `page-break-after:avoid`। Word COM-এ ১০টি ফিক্সচার আগে/পরে: পাতা-সংখ্যা সব একই; সনদ ২০.৪pt (১.৭); প্রশ্নপত্রের অনুচ্ছেদ অপরিবর্তিত। পুরো সেট ১৬৪৮ পাস / ০ ব্যর্থ। গিটহাবে পুশ হয়েছে (`arena/01a0f18b-test-conveter`)।

**ব্যবহারকারীর বাকি:**
- Word-এ চোখে দেখা: `Downloads\Fayzar-লেআউট-প্রিভিউ\Part-19.3-লাইন-দূরত্ব` (সনদ ×২, সিভি, নোটিশ — bijoy/unicode docx + .doc), আর আগের Part-18.9…19.2।
- আসল OCR যাচাই: সনদের একটি ছবি দিলে `qa/real-ocr-probe.mjs` (localhost:3008 সার্ভার দরকার — ব্যবহারকারী চালু করবেন) দিয়ে দেখা Gemini `page_orientation`/মুড়ির `***` দেয় কি না; ফল `tests/fixtures/real-ocr`-এ।
- পরিষ্কারের প্রশ্ন: temp-test-converter (184MB), supabase/, ui-revamp/, fayzar_light_polished_*.jpg রাখবে কি না (পুশে এগুলো যায়নি)।

**এডিট-পয়েন্ট খোঁজা:** `docs/PROJECT_MAP.md` → `docs/CODE_INDEX.md`-এ Grep (`নাম@লাইন`) → শুধু ওই অংশ Read।

**পরের কাজ:** কালপুরুষ ফন্টে প্রশ্নপত্র-প্ল্যানারের মাপ (৪র্থ শ্রেণি ইউনিকোড .docx ২ পাতা হয় — Word COM-এ মেপে `cq-booklet-planner`/general-এর উচ্চতা-গুণক; ⚙️ প্ল্যানার তাই আচরণ-বদলের আগে অনুমতি)। এরপর ক্যাশমেমো (২-আপ/৩-আপ)। রোডম্যাপ: `docs/MASTER_PLAN.md` §৬।
