# হ্যান্ডঅফ — পরের সেশন এখান থেকে (হালনাগাদ ২০২৬-১০-০৯)

**শেষ কাজ (Part-19.3):** আসল Gemini OCR (localhost:3008) দিয়ে সনদ ও প্যাড-আবেদন যাচাই করে ঠিক করা। Gemini সত্যিই `page_orientation: landscape` দেয় (Dreamland, রাঙামাটি); প্যাড-আবেদনকে বলে GOVT_APP ⇒ আগে প্যাড আঁকা হতো না, এখন fayzar-pipeline-এ `LetterLayout.hasLetterhead` (কাঁচা লেখায়, কারণ stripOcrArtifacts "#" মোছে) ⇒ OFFICE_PAD। certificate-layout: আগে-আসা গ্রেড-ছক, দুই পাতার দুই সনদ (একা "*"), নমুনার মতো ছক ডান-উপরে/মার্জিন ০.৪"/তারিখ-স্বাক্ষর এক উচ্চতায় বোল্ড/ফুটার নিচে, কালপুরুষে মাথা-ছোট-করা ধাপ; ai-ocr-engine-এ সাজানো সনদের .doc-এ `honorCellMargins`। .doc লাইন-দূরত্ব (`line-height:%`) ও keepNext আগেই (docx-to-doc-engine, অনুমতিতে)। পুরো সেট ১৬৫৩ পাস / ০ ব্যর্থ।

**ব্যবহারকারীর বাকি:**
- Word-এ চোখে দেখা: `Downloads\Fayzar-লেআউট-প্রিভিউ\Part-19.3-সনদ-প্যাড` (আসল OCR থেকে Dreamland ২ পাতা, রাঙামাটি, প্যাড-আবেদন — bijoy/unicode docx + .doc)।
- প্রশ্ন: রাঙামাটির মূল অংশে নমুনায় প্রতিষ্ঠান-নাম বড় WordArt; আমরা ২০pt বোল্ড লেখা — বড় করতে হবে কি না।
- পরিষ্কারের প্রশ্ন: temp-test-converter (184MB), supabase/, ui-revamp/, fayzar_light_polished_*.jpg।

**মাপার হাতিয়ার:** Word COM অবস্থান-ডাম্প (অনুচ্ছেদ y/x/মাপ/বোল্ড + টেক্সট-বক্স) নমুনা বনাম আমাদের — scratchpad-এর cdump.ps1-এর মতো; `QA_CONSOLE=1` দিলে site-chain ব্রাউজার-সতর্কতা দেখায়।

**এডিট-পয়েন্ট খোঁজা:** `docs/PROJECT_MAP.md` → `docs/CODE_INDEX.md`-এ Grep (`নাম@লাইন`) → শুধু ওই অংশ Read।

**পরের কাজ:** কালপুরুষ ফন্টে প্রশ্নপত্র-প্ল্যানারের মাপ (৪র্থ শ্রেণি ইউনিকোড .docx ২ পাতা — ⚙️ প্ল্যানার, আচরণ-বদলের আগে অনুমতি)। এরপর ক্যাশমেমো (২-আপ/৩-আপ)। রোডম্যাপ: `docs/MASTER_PLAN.md` §৬।
