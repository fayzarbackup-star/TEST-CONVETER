# 🗺️ PROJECT_MAP — সূচিপত্র ও উপাদান নির্দেশিকা

এই ডকুমেন্টটি প্রোজেক্টের সমস্ত পৃষ্ঠা, সেকশন, দৃশ্যমান উপাদান এবং সংশ্লিষ্ট ফাইল সমূহের একটি সার্বিক ইনডেক্স বা ম্যাপ। যেকোনো ফিচার বা সেকশন দ্রুত খুঁজে পাওয়া ও পরিবর্তনের সুবিধার জন্য এই টেবিলটি প্রস্তুত করা হয়েছে।

---

## 📌 মূল ওয়েব পেজ ও সেকশন নির্দেশিকা

| সেকশন / ফিচারের নাম | প্রদর্শিত মূল টেক্সট ও উপাদান (চেনার জন্য) | সংশ্লিষ্ট ফাইলের সঠিক পাথ (File Path) | ফাইলটির মূল কাজ (সংক্ষেপে) |
| :--- | :--- | :--- | :--- |
| **লাইভ স্ট্যাটাস ও জরুরি নোটিশ বার** | `দোকান খোলা/বন্ধ স্ট্যাটাস`, `ফুলবাড়ী সরকারি কলেজ গেট`, `হেল্পলাইন: 01717-101919`, `১-ক্লিক অটো-ফিল (.EXE)` | `index.html`<br>`js/main.js` | সময় অনুযায়ী দোকান খোলা/বন্ধ প্রদর্শন ও জরুরি নোটিশ স্ক্রলিং |
| **মূল হেডার ও স্টিকি নেভিগেশন** | `ফয়জার কম্পিউটার`, `ডিজিটাল, অনলাইন ও ভূমিসেবা কেন্দ্র`, হোম/সার্ভিস/জব/কনভার্টার/টুলস/রেজাল্ট মেনু, ডার্ক মোড টগল | `index.html`<br>`css/style.css` | ব্র্যান্ড লোগো, প্রধান নেভিগেশন মেনু, কল বাটন ও থিম সুইচিং |
| **আল্ট্রা-মডার্ন হিরো সেকশন ও সার্চ** | `এক ক্লিকেই সব ডিজিটাল ও ভূমিসেবা`, ইনস্ট্যান্ট সার্ভিস সার্চ ইনপুট বক্স, জরুরি অ্যাকশন ব্যাজ | `index.html`<br>`js/main.js` | প্রধান দৃষ্টি আকর্ষণকারী ব্যানার ও লাইভ সার্ভিস সার্চ লজিক |
| **হিরো লাইভ নোটিশ বুলেটিন** | `চলমান সরকারি চাকরি ও স্কুল-কলেজ সংক্রান্ত নোটিশ`, সাম্প্রতিক সার্কুলার হাইলাইট | `index.html`<br>`data/notices.json` | সাম্প্রতিক নোটিশ ও জরুরি সার্কুলারের সংক্ষিপ্ত প্রিভিউ |
| **ভূমির সেবামূল্য ও চেকলিস্ট ক্যালকুলেটর** | `ই-নামজারি ও রেকর্ড খারিজ`, `খতিয়ান ও পর্চা`, প্রয়োজনীয় কাগজপত্রের চেকলিস্ট, আনুমানিক সরকারি ফি | `index.html`<br>`js/main.js` | জমিজমার সেবার জন্য প্রয়োজনীয় ডকুমেন্ট ও খরচের হিসাব প্রদান |
| **শীর্ষ জনপ্রিয় সেবাসমূহ (সার্ভিস শোকেস)** | `কম্পিউটার কম্পোজ`, `অনলাইন চাকরির আবেদন`, `টেলিটক ছবি রিসাইজ`, `রঙিন প্রিন্ট ও ফটোকপি` কার্ড | `index.html`<br>`data/services.json` | ক্যাটাগরিভিত্তিক সেবাসমূহের তালিকা, বিবরণ ও সার্ভিস চার্জ প্রদর্শন |
| **স্মার্ট অনলাইন টুলস শোকেস** | `ছবি ও স্বাক্ষর রিসাইজার`, `চাকরির বয়স ক্যালকুলেটর`, `বিজয়-ইউনিকোড কনভার্টার` কার্ড | `index.html` | প্রয়োজনীয় অনলাইন সেলফ-সার্ভিস টুলসমূহের সরাসরি লিঙ্ক কার্ড |
| **গ্রাহক মতামত ও রিভিউ সেকশন** | `গ্রাহকদের সন্তুষ্টি ও অভিজ্ঞতা`, রেটিং স্টার, রিভিউ ফিডব্যাক ফর্ম ও তালিকা | `index.html`<br>`data/feedbacks.json` | গ্রাহকের রিভিউ প্রদর্শন এবং নতুন মন্তব্য ইনপুট নেওয়ার ব্যবস্থা |
| **স্থায়ী ফুটার ও মোবাইল ডক** | যোগাযোগের পূর্ণ ঠিকানা, কাজের সময়সূচী, কপিরাইট নোটিশ, মোবাইলের জন্য ফিক্সড বটম নেভিগেশন বার | `index.html`<br>`css/style.css` | সাইটের ফুটার তথ্য ও মোবাইল স্ক্রিনে ভাসমান নেভিগেশন ডক |
| **দোকানের স্বচ্ছ কাজের রেট চার্ট** | `দোকানের কাজের স্বচ্ছ মূল্য তালিকা`, কম্পোজ রেট, প্রিন্ট রেট, ফটোকপি রেট, স্ক্যানিং ফি | `services.html`<br>`data/services.json` | সমস্ত অফলাইন ও অনলাইন সেবার স্পষ্ট ও স্বচ্ছ মূল্যতালিকা |
| **পাবলিশিং স্টুডিও ও লেআউট ড্যাশবোর্ড** | `পাবলিশিং স্টুডিও`, প্রশ্নপত্র ও দলিল লেআউট মোড, বুকলেট প্রিভিউ, ১-ক্লিক ডক জেনারেশন | `studio.html`<br>`js/studio-main.js`<br>`js/engines/doc-classifier.js` | পেশাদার প্রকাশনা ও প্রিন্ট লেআউট আর্কিটেকচার কনভার্টার ও প্রিভিউয়ার |
| **সার্বজনীন বাংলা ও গণিত কনভার্টার** | `ইউনিকোড ⇄ বিজয়`, `SutonnyMJ ফন্ট কনভার্টার`, ম্যাথ ও LaTeX সমীকরণ রূপান্তর, ডক এক্সপোর্ট | `converter.html`<br>`js/bangla-converter-engine.js`<br>`js/equation-converter.js`<br>`js/docx-handler.js` | বাংলা ফন্ট ও জটিল গাণিতিক ফর্মুলা নির্ভুল কনভার্সন ওয়ার্কস্পেস (স্বতন্ত্র রিপোজিটরি: `../fayzar-bangla-converter/`) |
| **স্মার্ট অটো-লেআউট ইঞ্জিন** | `২-কলাম সৃজনশীল প্রশ্নপত্র` (বক্সহীন উদ্দীপক, ১২pt সাইজ, বামে ক্রমিক ও ঝুলন্ত ইন্ডেন্ট, ডানপাশে প্রশ্নের মান, সেন্টারে হেডার ও দুই পাশে সময়-পূর্ণমান), নোটিশ ও দলিলের ওয়ার্ড ২০০৩ (.doc) ও আপডেট ওয়ার্ড (.docx) জেনারেটর | `js/layout-engine/`<br>`index.html`<br>`js/ai-ocr-engine.js` | জেমিনি ও টেক্সট কনভার্টার থেকে ফাইলের ধরন অনুযায়ী ১-ক্লিকে সরাসরি লেআউটসহ প্রিন্ট-রেডি ফাইল ডাউনলোড |
| **ডকুমেন্ট কনভার্টার টুলস** | `Word to PDF`, `DOCX to DOC`, অফলাইন ডকুমেন্ট ফাইল রূপান্তর ও প্রসেসর | `doc-converter.html`<br>`docx-to-doc.html`<br>`js/docx-to-doc-engine.js`<br>`js/doc-binary-engine.js` | পুরনো এবং নতুন অফিস ডকুমেন্ট ফাইলের মধ্যে দ্রুত ফরম্যাট রূপান্তর |
| **সেলফ-সার্ভিস টুলবক্স পেজ** | `টেলিটক ছবি ও স্বাক্ষর রিসাইজার`, `সরকারি চাকরির বয়স ক্যালকুলেটর`, `দলিল রেজিস্ট্রি ফি` | `tools.html`<br>`js/main.js` | সরকারি আবেদনের মাপমতো ছবি ক্রপ, বয়স হিসাব ও দলিলের সরকারি ফি গণনা |
| **নোটিশ বোর্ড ও সার্কুলার আর্কাইভ** | `চলমান ও পূর্ববর্তী সকল নোটিশ`, নোটিশ ক্যাটাগরি ফিল্টার, পিডিএফ ডাউনলোড | `notices.html`<br>`data/notices.json` | প্রতিষ্ঠানের যাবতীয় নোটিশ ও সার্কুলারের পূর্ণাঙ্গ আর্কাইভ |
| **যোগাযোগ ও লোকেশন ম্যাপ** | `ফুলবাড়ী সরকারি কলেজ গেট`, গুগল ম্যাপ এমবেড, সরাসরি কল ও হোয়াটসঅ্যাপ চ্যাট বাটন | `contact.html` | সেবা গ্রহীতাদের সরাসরি দোকানে পৌঁছানোর ঠিকানা ও ডিজিটাল সংযোগ |

---

## ⚙️ ব্যাকএন্ড, ডেটা সোর্স ও ইঞ্জিন স্ক্রিপ্টস

| উপাদানের নাম / ফাইল | সংশ্লিষ্ট ফাইলের সঠিক পাথ (File Path) | মূল ভূমিকা ও কার্যকারিতা |
| :--- | :--- | :--- |
| **অফলাইন ডাটা স্টোর** | `js/offline-data.js`<br>`data/site_config.json` | ইন্টারনেট সংযোগ ছাড়াও সাইট ও কনফিগ সক্রিয় রাখার স্থানীয় ডাটাবেজ |
| **ফলাফল ডাটাবেজ** | `data/results_data.json`<br>`data/results_config.json`<br>`js/results-data.js` | স্কুল ও মাদরাসার শিক্ষার্থীদের পূর্ণাঙ্গ পরীক্ষার নম্বর ও গ্রেডিং রুলস |
| **নোটিশ ও সার্ভিস ডাটা** | `data/notices.json`<br>`data/services.json` | ওয়েবসাইটে প্রদর্শিত নোটিশ ও সার্ভিস তালিকার JSON ডাটা সোর্স |
| **ইউনিকোড-বিজয় কনভার্টার ইঞ্জিন** | `js/bangla-converter-engine.js`<br>`js/docx-to-doc-engine.js` | 🔒 **FROZEN CORE:** শতভাগ নির্ভুল রূপান্তরকারী মূল কোড ও হাই-ফিডেলিটি মাল্টি-সেকশন (১-কলাম হেডার + ২-কলাম প্রশ্ন) Word 2003 (.doc) ইঞ্জিন |
| **ডকুমেন্ট ক্লাসিফায়ার ও আর্কিটাইপ** | `js/engines/doc-classifier.js`<br>`js/layout-engine/archetype-map.js` | CQ+MCQ সম্মিলিত পরীক্ষা (`EXAM_COMBINED`), নোটিশ, বায়োডাটা (`CV_RESUME`) শ্রেণিবিন্যাস ও আর্কিটাইপ-টু-ডকটাইপ ব্রিজ ম্যাপিং |
| **কেন্দ্রীয় টেক্সট-রান প্রসেসর** | `js/layout-engine/text-run-processor.js` | সমীকরণ (LaTeX/OMML) ও বাংলা/ইংরেজি মিশ্রিত ফন্ট রান সমন্বয়কারী কেন্দ্রীয় ইঞ্জিন |
| **আর্কাইভড লেআউট বিল্ডার্স (Legacy)** | `js/layout-engine/archive/`<br>`(md-layout-parser.js, docx-layout-builder.js, builders/)` | 📦 **ARCHIVED:** সেন্ট্রাল পাইপলাইন (`fayzar-pipeline.js`) ও `export-dual-engine.js`-এ স্থলাভিষিক্ত হওয়া পূর্ববর্তী বিল্ডার্স কোড আর্কাইভ |
| **ডুয়েল এক্সপোর্ট ইঞ্জিন (Word 2003 RTF ও Docx)** | `js/engines/export-dual-engine.js` | CQ, MCQ, কম্বাইন্ড পরীক্ষা, প্রত্যয়নপত্র, ৩০০ টাকার স্ট্যাম্প দলিল, সরকারি আবেদন, প্রবেশপত্র ও বেতন স্লিপের পূর্ণাঙ্গ RTF ও .docx প্যাকেজার (TextRunProcessor সমন্বিত ইনলাইন ফন্ট ও OMML ম্যাথ সাপোর্ট) |
| **ইউনিফাইড সেন্ট্রাল গেটওয়ে (Pipeline Master)** | `js/layout-engine/fayzar-pipeline.js` | 🚀 **CENTRAL GATEWAY:** ক্লাসফাই, পার্স এবং রেন্ডার (HTML ও Word) সমন্বিত সিঙ্গেল-এন্ট্রি মাস্টার গেটওয়ে (`FayzarPipeline.process`) ও গ্রেসফুল ফলব্যাক ম্যানেজার |
| **এমসিকিউ মাস্টার লেআউট প্ল্যানার** | `js/layout-engine/mcq-layout-planner.js` | 📐 **PART-10:** বহুনির্বাচনী প্রশ্নের ২-কলাম, ০.২" গ্যাপ, ডিভাইডার লাইন, ১-কলাম হেডার প্লেসহোল্ডার, ৪/২/১ অপশন গ্রিড ও স্মার্ট পেজ-ফিট প্ল্যানার |
| **সৃজনশীল বুকলেট মাস্টার লেআউট প্ল্যানার** | `js/layout-engine/cq-booklet-planner.js` | 📐 **PART-11:** সৃজনশীল প্রশ্নপত্র (CQ) বুকলেটের A4 ল্যান্ডস্কেপ ২-কলাম, ০.৭" গ্যাপ, ইম্পোজিশন (slot০ সংরক্ষিত ব্যাক কভার + slot১ ফ্রন্ট কভার), ১/২/৩/৪ শীট ভাঁজ ও .doc ≡ .docx ≡ প্রিভিউ সমতা প্ল্যানার |
| **শেয়ার্ড লেআউট ইউনিট ও নর্মালাইজার** | `js/layout-engine/layout-units.js` | 📏 **PART-12 / 12.2:** ইঞ্চি/পয়েন্ট/টুইপস রূপান্তর, UI মার্জিন ম্যাপ (`margin-narrow`, `margin-standard`, `margin-normal`, `margin-wide`, `margin-stamp`), কলাম গ্যাপ, ইনডেন্ট ও পিচ ইউটিলিটি সহ পূর্ণাঙ্গ NaN-রোধী একক সুরক্ষক (`FayzarLayoutUnits`) |
| **স্টুডিও এডিট-ব্রিজ (Studio Edit Bridge)** | `js/engines/studio-edit-bridge.js` | 🌉 **PART-13.1:** Studio প্রিভিউতে সরাসরি এডিট (contenteditable) সংগ্রহ ও parsedData-তে DP-সিঙ্ক ব্রিজ (`collectFromDom`, `applyEdits`) — পুনঃপার্স ছাড়া গণিত/EQ অক্ষত রেখে Word .doc ও .docx এক্সপোর্ট |
| **ধারাবাহিক পরীক্ষা নম্বরায়ন ইঞ্জিন** | `js/layout-engine/exam-renumber.js` | 🔢 **PART-13.2:** পরীক্ষা আর্কিটাইপে প্রতি সেকশনের প্রশ্ন ১ থেকে ধারাবাহিক নম্বরে (`১।, ২।, ৩। ...`) রূপান্তরের কোড-লেভেল মাস্টার ইঞ্জিন (`FayzarExamRenumber`), পার্সার ফিডেলিটি অক্ষুণ্ণ রেখে রেন্ডার ও ডাউনলোডে অটো-নম্বরায়ন |
| **রুটিন ও সময়সূচি ইঞ্জিন** | `js/engines/routine-engine.js` | ক্লাস ও পরীক্ষার সময়সূচি, পিরিয়ড ছক এবং ল্যান্ডস্কেপ টেবিল লেআউট পার্সার ও জেনারেটর |
| **জীবনবৃত্তান্ত ও সিভি ইঞ্জিন** | `js/engines/cv-engine.js` | পেশাদার জীবনবৃত্তান্ত (Bio-data), শিক্ষাগত যোগ্যতা টেবিল, অভিজ্ঞতা ও ব্যক্তিগত তথ্য পার্সার |
| **এআই ওসিআর ইঞ্জিন** | `js/ai-ocr-engine.js` | জেমিনি ৩ ফ্ল্যাশ প্রিভিউ (`gemini-3-flash-preview`) ও ৩.৮ ফ্ল্যাশ স্ট্যান্ডবাই OCR, 0ms সরাসরি স্ট্রিমিং, ৬০ সে. আইডল কিপ-অ্যালাইভ, কাস্টম ইউজার স্কোপ নির্দেশনা (`ai-custom-directive-input`), ১৮০ সে. মাল্টি-পেজ উইন্ডো, স্বয়ংক্রিয় লেআউট ট্যাগস (`[LAYOUT: ...]`) ও শতভাগ নির্ভুল ভেরবাটিম সুরক্ষা |
| **লোকাল এইচটিটিপি সার্ভার** | `serve_offline.py`<br>`serve-v2.js` | অফলাইনে লোকাল ব্রাউজারে সাইট ও পোর্টাল চালানোর হালকা সার্ভার |
| **গিটহ্যাব সিঙ্ক ও ব্যাকআপ টুলস** | `UPDATE_TO_GITHUB.bat`<br>`UPLOAD_CONVERTER_NEW_REPO.bat`<br>`scripts/upload_to_github_new_repo.py`<br>`scripts/sync_to_github.py`<br>`PULL_FROM_GITHUB.bat`<br>`scripts/pull_from_github.py`<br>`version.json` | ডাবল ক্লিকে সম্পূর্ণ অফলাইন কোড কিংবা নতুন ১০০+ ফাইলের কনভার্টার সরাসরি গিটহাবে পুশ ও আপডেট করার ব্যবস্থা |
| **থিম ও বহুভাষিক ইঞ্জিন** | `js/theme-lang.js` | ডার্ক/লাইট থিম পারসিস্টেন্স ও ইন্টারফেস ভাষা নিয়ন্ত্রণ |
| **কি ভল্ট ও স্ট্যান্ডবাই পুল কনফিগ** | `js/fayzar-ocr-config.js` | ১৯টি এনক্রিপ্টেড কী ভল্ট, জিরো-টোকেন ব্যাকগ্রাউন্ড হেলথ প্রব (`probeKeyZeroToken`), Pre-Warmed Standby Pool (৩টি ভেরিফায়েড সচল কি + ২টি মডেল ক্যাশ), কোটা রোটেশন ও অটো-ফেইলওভার |
| **ডিজাইন ও গ্লোবাল স্টাইল** | `css/style.css`<br>`css/google-fonts.css` | গ্লাস মরফিজম, অ্যানিমেশন, আধুনিক ফ্রেমওয়ার্ক এবং বাংলা টাইপোগ্রাফি |
| **সিস্টেম রুলস ও গাইডলাইন** | `GEMINI.md`<br>`.antigravity/rules.md` | দ্রুত রেসপন্স, টোকেন সাশ্রয়, ডিআইএফএফ এডিট ও সেলফ-মেইনটেন্যান্স নিয়মাবলী |
| **কনটেক্সট ইগনোর কনফিগ** | `.antigravityignore` | ভারী ডাম্প, জিপ ও অপ্রয়োজনীয় ফাইল স্ক্যানিং বন্ধ রাখার তালিকা |
| **লেআউট স্পেসিফিকেশন** | `LAYOUT_SPECIFICATION.md` | অটো-লেআউট ইঞ্জিনের অপরিবর্তনীয় স্পেসিফিকেশন, মার্জিন, কলাম ও টেস্ট কেস তালিকা |
| **মাস্টার লেআউট সেক্টর ও মেটাডাটা স্পেক** | `LAYOUT_METADATA_SPEC.md` | ৯টি মাস্টার সেক্টর (`EXAM_CQ`, `EXAM_GENERAL`, `OFFICE_PAD`, `PROTTOYON_CERT`, `GOVT_APP` ইত্যাদি), স্বয়ংক্রিয় ফ্রন্টম্যাটার স্কিমা ও কোড লোকেশন রেজিস্ট্রি |

---

## 📄 পিডিএফ টুলস মডিউল (`pdf-tools/`)

| সেকশন / ফিচারের নাম | ফাইলের পাথ | মূল কাজ |
| :--- | :--- | :--- |
| **PDF টুলস হোম ড্যাশবোর্ড** | `pdf-tools/index.html` | ১৬টি টুলসের গ্রিড কার্ড UI |
| **পেশাদার PDF এডিটর** | `pdf-tools/editor.html` | OCR + ডিরেক্ট এডিট + ড্র + ফন্ট + সেভ |
| **কম্প্রেস পিডিএফ** | `pdf-tools/tools/compress.html` | মান ঠিক রেখে ফাইল ছোট করা |
| **মার্জ পিডিএফ** | `pdf-tools/tools/merge.html` | ড্র্যাগ-রি-অর্ডার সহ একাধিক PDF মার্জ |
| **স্প্লিট পিডিএফ** | `pdf-tools/tools/split.html` | পেজ রেঞ্জ/প্রতিটি পেজ আলাদা |
| **PDF → ইমেজ** | `pdf-tools/tools/to-image.html` | প্রতিটি পেজ PNG/JPEG ডাউনলোড |
| **লক / আনলক** | `pdf-tools/tools/lock-unlock.html` | পাসওয়ার্ড যোগ বা সরানো |
| **রোটেট পিডিএফ** | `pdf-tools/tools/rotate.html` | পেজ বা সব পেজ রোটেশন |
| **পেজ রিমুভ** | `pdf-tools/tools/remove-pages.html` | থাম্বনেইল গ্রিড থেকে পেজ ডিলিট |
| **ওয়াটারমার্ক** | `pdf-tools/tools/watermark.html` | টেক্সট ওয়াটারমার্ক + ওপাসিটি |
| **ইমেজ এক্সট্রাক্ট** | `pdf-tools/tools/extract-images.html` | পেজ রেন্ডার → ইমেজ ডাউনলোড |
| **পারমিশন কন্ট্রোল** | `pdf-tools/tools/permissions.html` | প্রিন্ট/কপি/এডিট পারমিশন বিট |
| **রিসাইজ পিডিএফ** | `pdf-tools/tools/resize.html` | A4/A3/Letter/Legal পেজ সাইজ |
| **পিডিএফ রিপেয়ার** | `pdf-tools/tools/repair.html` | করাপ্ট PDF পুনর্গঠন চেষ্টা |
| **ক্রপ পিডিএফ** | `pdf-tools/tools/crop.html` | CropBox মার্জিন কাটা |
| **PDF তৈরি করুন** | `pdf-tools/tools/create.html` | টেক্সট + ছবি থেকে নতুন PDF |
| **PDF → CSV/Excel** | `pdf-tools/tools/to-excel.html` | টেক্সট লেআউট → CSV ফাইল |
| **PDF Core Renderer** | `pdf-tools/js/pdf-core.js` | PDF.js wrapper (view/thumbnail/OCR canvas) |
| **OCR ইঞ্জিন** | `pdf-tools/js/pdf-ocr-engine.js` | Tesseract.js বাংলা+ইংরেজি OCR |
| **ফন্ট ম্যানেজার** | `pdf-tools/js/pdf-font-manager.js` | TTF ফন্ট লোড ও pdf-lib এ এম্বেড |
| **বাংলা কনভার্টার** | `pdf-tools/js/bangla-converter-engine.js` | ইউনিকোড ⇄ বিজয় দ্বি-মুখী রূপান্তর ইঞ্জিন |
| **শেয়ার্ড ইউটিলিটি** | `pdf-tools/js/pdf-utils.js` | Toast, progress, upload zone, download helper |
| **PDF Tools CSS** | `pdf-tools/css/pdf-tools.css` | Glassmorphism ডিজাইন সিস্টেম |
| **অফলাইন লাইব্রেরি** | `pdf-tools/libs/` | pdf.js, pdf-lib, fontkit, tesseract.js, worker.min.js, tesseract-core-lstm.wasm.js, jspdf, tessdata |
| **বাংলা ফন্ট** | `pdf-tools/fonts/bangla/` | NotoSansBengali, NotoSerifBengali, Kalpurush, Nikosh, SiyamRupali, SutonnyMJ, SutonnyOMJ |

---

## 🤖 এআই কনভার্টার ও কি-মডেল আর্কিটেকচার নির্দেশিকা (Pre-Warmed Standby Pool)

| উপাদান / লজিক | কোড লোকেশন | মেকানিজম ও কাজের বিবরণ |
| :--- | :--- | :--- |
| **Pre-Warmed Standby Pool** | `js/fayzar-ocr-config.js`<br>(`_standbyPool`, `prewarmStandbyPool`) | পেজ লোড ও ফাইল ড্রপের সাথে ব্যাকগ্রাউন্ডে জিরো-টোকেন চেক চালিয়ে **৩টি সম্পূর্ণ সচল কি** এবং **২টি মডেল** রেডি রাখে। |
| **0ms সরাসরি স্ট্রিমিং** | `js/ai-ocr-engine.js`<br>(`executeGeminiRequest`) | রূপান্তর বাটনে ক্লিক করামাত্র কোনো ইনলাইন প্রোব বা অপেক্ষা ছাড়া সরাসরি স্ট্যান্ডবাই কী[০] ও `gemini-3-flash-preview` দিয়ে স্ট্রিমিং শুরু হয়। |
| **মডেল প্রায়োরিটি সিকোয়েন্স** | `js/ai-ocr-engine.js`<br>(`candidateModels`) | ১. `gemini-3-flash-preview` (ডিপ রিজনিং ফ্ল্যাগশিপ)<br>২. `gemini-3.6-flash` (প্রমাণিত উচ্চগতির ব্যাকআপ) |
| **জিরো-টোকেন কী হেলথ চেক** | `js/fayzar-ocr-config.js`<br>(`probeKeyZeroToken`) | `GET /v1beta/models?key=...` রিকোয়েস্টে কোনো টোকেন খরচ না করে কী-এর ভ্যালিডিটি ও রেট লিমিট যাচাই করে। |
| **অ্যাক্টিভিটি / আইডল টাইমার** | `js/ai-ocr-engine.js`<br>(`STREAM_IDLE_TIMEOUT_MS = 60000`) | জটিল গণিত বা LaTeX সমীকরণ বিশ্লেষণের সময় মডেল বিরতি নিলেও ৬০ সেকেন্ড পর্যন্ত কানেকশন অক্ষুণ্ণ রাখে। |
| **সর্বোচ্চ রূপান্তর উইন্ডো** | `js/ai-ocr-engine.js`<br>(`REQUEST_TIMEOUT_MS = 180000`) | বহু-পৃষ্ঠা বা ভারী ডকুমেন্টের জন্য ৩ মিনিট (১৮০ সেকেন্ড) পর্যাপ্ত রূপান্তর সময় নিশ্চিত করে। |
| **কোটা ও কি+মডেল ট্র্যাকিং** | `js/fayzar-ocr-config.js` (`keyModelStatusMap`)<br>`js/ai-ocr-engine.js` | কোনো কি নির্দিষ্ট মডেলে ৪২৯ পেলে শুধু সেই মডেলের জন্য কুলডাউনে যায় (অন্য মডেলে সচল থাকে); ১০০-২৫০ মিলি-সেকেন্ডে পরবর্তী সচল কি-তে তাৎক্ষণিক হ্যান্ডওভার। |


---

## 🔄 কনভার্টার ইনপুট-আউটপুট ফ্লো আর্কিটেকচার

> **সর্বশেষ আপডেট: ২০২৬-০৯-২৮** | এই সেকশনটি প্রতিটি ফাইল টাইপের engine call chain বর্ণনা করে।

### ইনপুট গেটওয়ে

```
index.html → [main.js] initiateFileScan(files)
    ↓
isImageOrPdf? → PATH A (OCR)
ext = md/txt? → PATH D (MD Direct)
ext = docx?   → PATH B (DOCX)
ext = doc?    → PATH C (DOC Binary)
ext = xlsx?   → PATH E (Excel)
ext = pptx?   → PATH F (PPTX)
```

---

### PATH A — ছবি / PDF → Gemini OCR → Word

```
FayzarAiOcrEngine.handleFiles()  [js/ai-ocr-engine.js]
    → fayzar-ocr-config.js: API key rotation
    → Gemini API streaming: image → Markdown text
    → DocClassifier.classify()   [js/engines/doc-classifier.js]
    → ExportDualEngine.generateWordDoc()  [js/engines/export-dual-engine.js]
        → formatRtfText() → TextRunProcessor.processTextRuns()
        → EquationConverter.latexToEqField()  [js/equation-converter.js]
    → triggerAutoDownload()
```

### PATH B — Word DOCX → Bijoy/Unicode → Word

```
preScanDocumentFile() → JSZip → document.xml (hasMath/isBijoy detect)
    → DocxHandler.convertDocx()  [js/docx-handler.js]
        → Bijoy↔Unicode convert, OMML preserve
    → DocxToDocConverter (যদি .doc চাই)  [js/docx-to-doc-engine.js]  🔒FROZEN
    → triggerAutoDownload()
```

### PATH C — Word DOC Binary

```
DocBinaryEngine.convertDoc()  [js/doc-binary-engine.js]  🔒FROZEN
    → triggerAutoDownload()
```

### PATH D — Gemini MD ফাইল → সরাসরি Word

```
firstFile.text() → scan.mdText
    → DocClassifier.classify(mdText)  [js/engines/doc-classifier.js]
    → ExportDualEngine.generateWordDoc(mdText, docType, options)
        → generateLegacyDoc() [RTF .doc] OR generateModernDocx() [.docx]
        → formatRtfText() → TextRunProcessor → EquationConverter
    → triggerAutoDownload()
```

### ExportDualEngine এর ভেতরের docType Routing

```
generateWordDoc(text, docType, options)
  ├── EXAM_CQ / EXAM_MATH / EXAM_GENERAL → generateCqExamRtf/Docx()
  ├── EXAM_MCQ                           → generateMcqExamRtf/Docx()
  ├── EXAM_COMBINED                      → generateCombinedExamRtf/Docx()
  ├── STAMP_DEED                         → generateStampDeedRtf/Docx()
  ├── GOVT_APP                           → generateGovtAppRtf/Docx()
  ├── ADMIT_CARD                         → generateAdmitCardRtf/Docx()
  ├── SALARY_SLIP                        → generateSalarySlipRtf/Docx()
  ├── ROUTINE                            → generateRoutineRtf_v2/Docx()
  ├── CV_RESUME                          → generateCVRtf/Docx()
  └── (default)                          → generateGenericRtf()

formatRtfText(text)
  → TextRunProcessor.processTextRuns()     [js/layout-engine/text-run-processor.js]
      run.type === 'math'  → EquationConverter.latexToEqField()  (.doc RTF)
      run.type === 'math'  → EquationConverter.latexToOmml()     (.docx OMML)
      run.type === 'text'  → escapeUnicodeRtf() / toBijoy()
```

---

## 🎨 Studio ভূমিকা (Secondary — Optional Editor)

```
studio.html
  ↓
[js/studio-controller.js]
  → textarea: text paste / .md file load / sessionStorage handoff
  → updatePreview() → FayzarPipeline.previewHtml()   [js/layout-engine/fayzar-pipeline.js]
      → DocClassifier → QuestionEngine / StampEngine / etc.
      → HTML preview (same output as Word download)
  → Layout Controls: margin, font, column, orientation, fontSize
  → Download → ExportDualEngine (SAME as Converter) ✅
  → "← কনভার্টার" → index.html
```

**গুরুত্বপূর্ণ:** Studio নিজে কোনো আলাদা conversion করে না।
Converter → direct Word output (Primary)
Studio → edit/adjust → same ExportDualEngine output

---

## 🔒 Frozen Core Files

| ফাইল | কারণ |
| :--- | :--- |
| `js/bangla-converter-engine.js` | বিজয়↔ইউনিকোড core |
| `js/equation-converter.js` | LaTeX → EQ field / OMML |
| `js/docx-to-doc-engine.js` | DOCX → DOC RTF |
| `js/doc-binary-engine.js` | DOC binary parse |

Layout সংক্রান্ত সব কাজ → শুধুমাত্র `js/layout-engine/` ফোল্ডারে

---

## 🧪 Layout Regression Suite (`tests/`)

| ফাইল | কাজ |
| :--- | :--- |
| `tests/run-regression.js` | স্ন্যাপশট রানার — `npm run test:layout` (verify) / `npm run test:layout:update` (baseline লেখা) / `--only=<id>` ফিল্টার |
| `tests/lib/harness.js` | Node-এ active engine লোড + fixture → CLASSIFIER / PARSED / STRUCTURE / HTML / DOCX_XML / RTF স্ন্যাপশট তৈরি |
| `tests/baseline/*.snap.txt` | ফ্রিজ করা "before" আউটপুট (৩০/০৯/২০২৬ অবস্থা, জ্ঞাত বাগসহ) |
| `tests/baseline/*.actual.txt` | ফেইল হলে লেখা স্ক্র্যাচ আউটপুট (git-ignored) |
| `tests/fixtures/cq-marks-edge.input.md` | CQ মার্ক edge-case: `১০`, `[১]`, `(৩)`, মার্কবিহীন |
| `tests/fixtures/cq-inline-numbering.input.md` | CQ `১. ক.` inline numbering + LaTeX |
| `tests/README.md` | suite-এর ব্যবহার ও জ্ঞাত ত্রুটির তালিকা |

উদ্দেশ্য: EXAM_CQ পরিবর্তনের পর MCQ / MATH / COMBINED স্ন্যাপশট অপরিবর্তিত আছে — তা প্রমাণ করা।

---

## 🔑 OCR Key Ledger (`fayzar-ocr-proxy/`)

| ফাইল | কাজ |
| :--- | :--- |
| `fayzar-ocr-proxy/index.js` | Cloudflare Worker — `POST /` (কি×মডেল ফেইলওভার, এক আপলোডে) ও `GET /status` (মাস্কড মনিটরিং) |
| `fayzar-ocr-proxy/ledger.js` | খতিয়ানের পিওর লজিক: ত্রুটি শ্রেণিবিন্যাস, কুলডাউন হিসাব, স্কোরিং, attempt plan |
| `fayzar-ocr-proxy/wrangler.toml` | ডিপ্লয় কনফিগ (KV binding `FAYZAR_OCR_KEYS`) |
| `fayzar-ocr-proxy/README.md` | ডিপ্লয় ধাপ, এন্ডপয়েন্ট ও কুলডাউন নীতি |
| `tests/key-ledger.test.js` | ৩৩টি অফলাইন ইউনিট টেস্ট (নকল ঘড়ি) — `npm run test:keys` |
| `tests/proxy-worker.test.mjs` | ১৬টি Worker ইন্টিগ্রেশন টেস্ট (নকল KV + নকল Gemini) — `npm run test:proxy` |
| `tests/part12-hardening.test.mjs` | ৫৬টি হার্ডেনিং টেস্ট (NaN-ফ্রি এক্সপোর্ট, ইউনিট ম্যাপিং, সিঙ্গেল স্পেসিং, প্রম্পট রুলস) |
| `tests/source-fidelity.test.mjs` | ২৪টি সোর্স-ফিডেলিটি টেস্ট (উদ্দীপক রক্ষা, হেডার সুরক্ষা, ক্রম সংরক্ষণ) |
| `tests/run-all.mjs` | মাস্টার টেস্ট রানার (১৬টি স্যুইট, ৬৫৩টি গেট ১০০% অফলাইন ও অটোমেটেড) — `npm test` |
| index.html → সেটিংস → "কি মনিটর" | `/status` থেকে লাইভ টেবিল: অবস্থা, আজকের ব্যবহার, সফল/ব্যর্থ, কাউন্টডাউন, CSV এক্সপোর্ট |

কুলডাউন নীতি: `RPM` = Google-এর `RetryInfo.retryDelay`, `RPD` = Pacific মধ্যরাত,
`MODEL_NA` = ওই মডেল ৬ ঘণ্টা, `INVALID` = স্থায়ী, `SERVER` = ৩০/৬০/১২০/৩০০s ব্যাকঅফ।
কি শুধুমাত্র KV-তে থাকে — রিপোতে কোনো কি রাখা হবে না।

---

## ⚠️ Fix Log & Part Releases

### Part-12 Release (২০২৬-১০-০৩)
| # | সমস্যা / ফিচার | ফাইল | Status |
| - | -------------- | ---- | ------ |
| 1 | Modern Word ওপেনিং ক্র্যাশ (NaN মার্জিন ও কলাম পজিশন) | js/layout-engine/layout-units.js, cq-booklet-planner.js, mcq-layout-planner.js, export-dual-engine.js | ✅ Fixed (0 Errors in Word COM) |
| 2 | Word 2003 (.doc RTF) অস্বাভাবিক লাইন স্পেসিং ও বড় কার্সার (\sl অমিল) | js/engines/export-dual-engine.js (\sl240\slmult1, w:line="240" auto) | ✅ Fixed |
| 3 | সৃজনশীল প্রশ্নের গায়ে নম্বর ও মার্কের ভুল অনুমান (ক→১, খ→২) | js/engines/question-engine.js (_cqMarkTail(), [১], (৩), মান: ৫) | ✅ Fixed |
| 4 | উদ্দীপক হারানো রোধ ও সোর্স ক্রম রক্ষা ([উদ্দীপক N] হ্যান্ডলিং) | js/engines/question-engine.js, tests/source-fidelity.test.mjs | ✅ Fixed |
| 5 | ম্যাথ ও পাই (\pi) স্পেসিং ও OMML ট্রেইলিং স্পেস | js/engines/export-dual-engine.js | ✅ Fixed |
| 6 | OCR প্রম্পটে উত্তর/সমাধান আসা বন্ধ ও সেকশন অনুযায়ী নম্বর রিসেট | js/ai-ocr-engine.js (STRICT QUESTION-ONLY) | ✅ Fixed |
| 7 | টেস্ট রানার সমন্বয় (১৬টি টেস্ট স্যুইট, ৬৫৩টি গেট) | tests/run-all.mjs, tests/part12-hardening.test.mjs | ✅ 653/653 PASS |

### Part-12.1 Release (২০২৬-১০-০৩)
| # | সমস্যা / ফিচার | ফাইল | Status |
| - | -------------- | ---- | ------ |
| 1 | Word-2003 আর্টিফ্যাক্ট ফিক্সচার সমাধান (ENOENT রোধ) | tests/fixtures/word2003-math.docx, qa/mk-math-fixture.mjs | ✅ Fixed |
| 2 | Word-2003 Chromium টেস্ট ক্রস-প্ল্যাটফর্ম রান | tests/word2003-doc-artifact.test.mjs (JSZip ও লোকাল Playwright) | ✅ 30/30 PASS |
| 3 | মাস্টার টেস্ট রানার আপডেট (৬৮৩টি গেট) | tests/run-all.mjs | ✅ 683/683 PASS |

### পূর্ববর্তী ফিক্স (২০২৬-০৯-২৮)

| # | সমস্যা | ফাইল | Status |
| - | ------ | ---- | ------ |
| 1 | Equation RTF এ আসছিল না | export-dual-engine.js formatRtfText() | ✅ Fixed |
| 2 | studio.html তে equation-converter.js লোড ছিল না | studio.html | ✅ Fixed |
| 3 | MD file download Studio তে redirect করত | main.js MD route | ✅ Fixed |
| 4 | MD docType EXAM_CQ hardcode | main.js executeWizardConversion | ✅ Fixed (auto-detect) |

---

## ⚙️ এক্সপোর্ট ডুয়েল ইঞ্জিন (ExportDualEngine) - ডিপ ওয়ার্কিং মেকানিজম

> **উদ্দেশ্য:** এই সেকশনটি এআই বা ডেভেলপারদের জন্য, যেন কোনো লেআউট বা ইকুয়েশন এডিট করতে গেলে পুরো প্রজেক্ট না খুঁজে সরাসরি নির্দিষ্ট ফাইলে ও লাইনে কাজ করা যায়।

### ১. সাব-ইঞ্জিনসমূহ (Sub-Engines)
ExportDualEngine নিজে লেআউট কোড লেখে, কিন্তু পার্সিংয়ের জন্য নিচের সাব-ইঞ্জিনগুলো ব্যবহার করে:
- **পার্সিং ইঞ্জিনসমূহ:**
  - `QuestionEngine` (`js/engines/question-engine.js`): সৃজনশীল (CQ) ও বহুনির্বাচনি (MCQ) পার্স করে JSON বানায়।
  - `StampEngine` (`js/engines/stamp-engine.js`): স্ট্যাম্প দলিল পার্স করে।
  - `ApplicationEngine` (`js/engines/application-engine.js`): সরকারি আবেদন পার্স করে।
- **টেক্সট ও ম্যাথ প্রসেসর:**
  - `TextRunProcessor` (`js/layout-engine/text-run-processor.js`): সাধারণ লাইন থেকে ম্যাথ এবং টেক্সট আলাদা করে (ফাংশন: `processTextRuns`)।
  - `EquationConverter` (`js/equation-converter.js`): ম্যাথ রানগুলোকে RTF EQ Field (`latexToEqField`) বা DOCX OMML (`latexToOmml`)-এ রূপান্তর করে।

### ২. লেআউট তৈরির ৫টি ধাপ (ExportDualEngine এর ভেতরে)
`js/engines/export-dual-engine.js` ফাইলে `generateWordDoc` কল হওয়ার পর নিচের ধাপগুলো ঘটে:

1. **Routing:** `docType` চেক করে নির্দিষ্ট ফাংশনে পাঠায়। (যেমন: `EXAM_CQ` হলে `generateCqExamRtf` / `generateCqExamDocx` ফাংশনে যায়)।
2. **Parsing:** সাব-ইঞ্জিনকে কল করে মার্কডাউন টেক্সটকে অবজেক্টে (JSON) রূপান্তর করে।
3. **Page Setup:** ফাংশনের শুরুতেই হার্ডকোড করা লেআউট নির্দেশিকা থাকে। 
   - RTF উদাহরণ: `\landscape \cols2 \margl720`
   - DOCX উদাহরণ: `<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:cols w:num="2" w:space="1008"/></w:sectPr>`
4. **Placement:** লুপ চালিয়ে JSON অবজেক্ট থেকে প্রশ্নগুলো জায়গামতো বসায়।
5. **Rendering:** প্রতিটি টেক্সট বসানোর আগে `TextRunProcessor` ও `EquationConverter` দিয়ে পার করে।

### ৩. মাস্টার ওয়ার্ড ফাইল (Blob) তৈরি ও ডাউনলোড
- **RTF (.doc):** পুরো ডকুমেন্টের লেআউট ও টেক্সট মিলিয়ে একটি স্ট্রিং (String) তৈরি করা হয়।
- **DOCX (.docx):** `JSZip` ব্যবহার করে `_packageDocx` ফাংশনের মাধ্যমে প্রয়োজনীয় XML ফাইলগুলো একত্রে Zip করা হয়।
- **ডাউনলোড:** 
  - `ExportDualEngine` ফাইলটিকে `Blob` আকারে রিটার্ন করে: `new Blob([rtf], { type: 'application/msword' })`।
  - `js/main.js`-এর `triggerAutoDownload()` ফাংশন সেই Blob-এর একটি লোকাল URL (`URL.createObjectURL`) তৈরি করে অটোমেটিক ডাউনলোড ট্রিগার করে।

> **⚠️ এডিট গাইডলাইন (এজেন্টদের জন্য):** 
> - **মার্জিন/কলাম পরিবর্তন করতে হলে:** `js/engines/export-dual-engine.js` এর নির্দিষ্ট `generate...Rtf` বা `generate...Docx` ফাংশনের শুরুতে কাজ করুন।
> - **ইকুয়েশন ভাঙলে:** `js/layout-engine/text-run-processor.js` অথবা `js/equation-converter.js` চেক করুন।
> - **পার্সিং ভুল হলে (যেমন উদ্দীপক ঠিকমতো না আসলে):** `js/engines/question-engine.js` চেক করুন।

---

### 📍 লেআউট ও রেন্ডারিং ফাংশনের এক্স্যাক্ট লাইন নম্বর (ExportDualEngine)
`js/engines/export-dual-engine.js` ফাইলে দ্রুত নেভিগেট করার জন্য মূল ফাংশনগুলোর বর্তমান লাইন নম্বর নিচে দেওয়া হলো:

| ফাংশনের নাম | লাইন নম্বর | কাজ |
| :--- | :--- | :--- |
| `formatRtfText(text, options)` | লাইন 114 | RTF টেক্সট ও ম্যাথ প্রসেসিং |
| `formatDocxText(text, options)` | লাইন 183 | DOCX প্লেইন টেক্সট প্রসেসিং |
| `generateWordDoc(rawText, docType)` | লাইন 256 | মূল রাউটার ও এন্ট্রি পয়েন্ট |
| `generateCqExamRtf(parsedData)` | লাইন 580 | সৃজনশীল প্রশ্ন (RTF) লেআউট |
| `generateCqExamDocx(parsedData)` | লাইন 789 | সৃজনশীল প্রশ্ন (DOCX) লেআউট |
| `generateMcqExamRtf(parsedData)` | লাইন 927 | বহুনির্বাচনি প্রশ্ন (RTF) লেআউট |
| `generateMcqExamDocx(parsedData)` | লাইন 1109 | বহুনির্বাচনি প্রশ্ন (DOCX) লেআউট |

*(নোট: নতুন কোড যোগ করা হলে লাইন নম্বর কিছুটা উপরে-নিচে হতে পারে, তবে ফাংশনের নাম ধরে সার্চ করলেই দ্রুত পাওয়া যাবে।)*
