# হ্যান্ডঅফ — পরের সেশন এখান থেকে (হালনাগাদ ২০২৬-১০-০৯)

**শেষ কাজ (Part-19.4):** (১) কালপুরুষে প্রশ্নপত্র: Word-এ কালপুরুষের লাইন ১.৫৭৫em, সুতন্নী ১.১৬৯em ⇒ `targetFont: 'unicode'` হলে CQ/MCQ/যৌথ .docx-এ লাইন-গুণক ০.৭২ (`FayzarLayoutUnits.examLineFactor` → `ExportDualEngine._examLineFactor`); ৪র্থ শ্রেণির ইউনিকোড এখন ১ পাতা, বিজয়/.doc অপরিবর্তিত। (২) ক্যাশমেমো ২-আপ/৩-আপ: নতুন `js/layout-engine/cash-memo-layout.js` (CASH_MEMO; classifier, Gemini প্রম্পট `copies`, পাইপলাইন, রপ্তানি, .doc-এ `honorCellMargins`, ৪ HTML)। Word-এ ৯ ফাইল (২ মেমো + ৪র্থ শ্রেণি × ৩ ফরম্যাট) সব ১ পাতা, কপি ঠিক কলামে। পুরো সেট ১৬৬৮ পাস / ০ ব্যর্থ।

**ব্যবহারকারীর বাকি:**
- Word-এ চোখে দেখা: `Downloads\Fayzar-লেআউট-প্রিভিউ\Part-19.4-ক্যাশমেমো-কালপুরুষ` (আর আগের Part-19.3-সনদ-প্যাড)।
- সিদ্ধান্ত: ৩-আপ পণ্য-তালিকা নমুনায় ১০pt, আমাদের রক্ষণশীল মাপে ৯pt-এ ধরে — ১০pt চাইলে নিরাপত্তা-ফাঁক (SLACK) কমাতে হবে।
- আসল ক্যাশমেমো ছবি দিয়ে Gemini OCR যাচাই (copies ঠিক আসে কি না, এক কপি লেখে কি না) — নমুনা-PDF আমি পড়িনি।
- পরিষ্কারের প্রশ্ন (আগের): temp-test-converter, supabase/, ui-revamp/, fayzar_light_polished_*.jpg। গিটহাবে পুশ অনুমতিতে।

**মাপার হাতিয়ার:** Word COM — পাতা/টেবিল-অবস্থান, সারি-উচ্চতা, EMF→PNG ছবি (scratchpad-এর `cmmeasure.ps1`, `rowh.ps1`, `pagepng.ps1`-এর মতো)।

**এডিট-পয়েন্ট খোঁজা:** `docs/PROJECT_MAP.md` → `docs/CODE_INDEX.md`-এ Grep (`নাম@লাইন`) → শুধু ওই অংশ Read।

**পরের কাজ:** `docs/MASTER_PLAN.md` §৬ — নতুন নমুনা এলে পরের ধরন (নোটিশ/রুটিন/প্রবেশপত্র ইত্যাদি); আগে ব্যবহারকারীর Word-যাচাইয়ের ফল দেখে ঠিক করা।
