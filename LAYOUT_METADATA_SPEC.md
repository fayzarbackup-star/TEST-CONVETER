# 📋 LAYOUT_METADATA_SPEC — মাস্টার লেআউট সেক্টর ও মেটাডাটা নির্দেশিকা

> **উদ্দেশ্য:** এই ডকুমেন্টটি ফয়জার পাবলিশিং ও কনভার্টারের সকল ডকুমেন্টের সেক্টর আইডি, ফ্রন্টম্যাটার স্কিমা এবং সংশ্লিষ্ট কোড ফাইলের সুনির্দিষ্ট লোকেশন রেজিস্ট্রি। ভবিষ্যতে যেকোনো লেআউট সংশোধন বা নতুন লেআউট যুক্ত করার সময় এই রেজিস্ট্রি দেখে সরাসরি পরিবর্তন করা হবে।

---

## 🧭 মাস্টার সেক্টর রেজিস্ট্রি ও কোড লোকেশন ইনডেক্স

যেকোনো লেআউট সংক্রান্ত কাজ করার সময় নিচের নির্দিষ্ট **Sector ID** উল্লেখ করে সরাসরি সংশ্লিষ্ট কোড লোকেশনে কাজ করা হবে:

| সেক্টর আইডি (Sector ID) | বাংলা নাম ও পরিচিতি | ফ্রন্টম্যাটার ট্যাগ (`doc_type`) | সংশ্লিষ্ট কোড ফাইল ও নির্দিষ্ট লোকেশন |
| :--- | :--- | :--- | :--- |
| **`EXAM_CQ`** | সৃজনশীল প্রশ্নপত্র (৬ষ্ঠ-১০ম শ্রেণি, সিকিউ ৭০) | `doc_type: EXAM_CQ` | `js/layout-engine/docx-layout-builder.js` (`case 'question'` -> CQ branch)<br>`js/layout-engine/md-layout-parser.js` (`bengali_cq_paper`) |
| **`EXAM_GENERAL`** | সাধারণ প্রশ্নপত্র (১ম-৫ম শ্রেণি, সংক্ষিপ্ত, ব্যাকরণ) | `doc_type: EXAM_GENERAL` | `js/layout-engine/docx-layout-builder.js` (`isStandardQuestionPaper`)<br>`js/layout-engine/md-layout-parser.js` (`bengali_standard_question_paper`) |
| **`EXAM_MCQ`** | বহুনির্বাচনী প্রশ্নপত্র (২০-৩০টি MCQ) | `doc_type: EXAM_MCQ` | `js/layout-engine/docx-layout-builder.js` (`formatMcqOptionsXml`)<br>`js/engines/question-engine.js` (`renderMcqOptions`) |
| **`EXAM_COMBINED`** | সম্মিলিত সিকিউ + এমসিকিউ পরীক্ষা | `doc_type: EXAM_COMBINED` | `js/layout-engine/docx-layout-builder.js` (`hasCombinedSections`)<br>`js/layout-engine/md-layout-parser.js` (`---SECTION_BREAK:MCQ---`) |
| **`OFFICE_PAD`** | প্রাতিষ্ঠানিক প্যাড ও অফিসিয়াল চিঠি | `doc_type: OFFICE_PAD` | `js/layout-engine/docx-layout-builder.js` (`case 'office_pad'`)<br>`js/layout-engine/layout-templates.js` (`'office-pad'`) |
| **`PROTTOYON_CERT`** | চারিত্রিক প্রত্যয়নপত্র ও প্রশংসাপত্র | `doc_type: PROTTOYON_CERT` | `js/layout-engine/docx-layout-builder.js` (`case 'testimonial_cert'`)<br>`js/layout-engine/layout-templates.js` (`'testimonial-cert'`) |
| **`GOVT_APP`** | সরকারি ও চাকরির আবেদনপত্র | `doc_type: GOVT_APP` | `js/layout-engine/docx-layout-builder.js` (`case 'govt_application'`)<br>`js/layout-engine/md-layout-parser.js` (`archetypeId: 'govt_application'`) |
| **`OFFICIAL_NOTICE`** | অফিসিয়াল নোটিশ ও স্মারক পত্র | `doc_type: OFFICIAL_NOTICE` | `js/layout-engine/docx-layout-builder.js` (`case 'official_notice'`)<br>`js/layout-engine/layout-templates.js` (`'official-notice'`) |
| **`LEGAL_DEED`** | ৩০০ টাকার স্ট্যাম্প চুক্তিপত্র দলিল | `doc_type: LEGAL_DEED` | `js/layout-engine/docx-layout-builder.js` (`stampMarginInches: 3.5-4.0`)<br>`js/layout-engine/layout-templates.js` (`'legal-deed'`) |

---

## 📑 প্রতিটি সেক্টরের স্বয়ংক্রিয় ফ্রন্টম্যাটার স্কিমা (`---`)

জেমিনি এআই ওসিআর করার সময় ইমেজ দেখে ফাইলের শুরুতে স্বয়ংক্রিয়ভাবে নিচের ফ্রন্টম্যাটার ব্লক তৈরি করবে:

### ১. সেক্টর: `EXAM_CQ` (সৃজনশীল প্রশ্নপত্র)
```yaml
---
doc_type: EXAM_CQ
institute: ফুলবাড়ী সরকারি পাইলট উচ্চ বিদ্যালয়, দিনাজপুর
exam: বার্ষিক পরীক্ষা - ২০২৬
grade: দশম শ্রেণি
subject: বাংলা (প্রথম পত্র)
time: ২ ঘণ্টা ৩০ মিনিট
full_marks: ৭০
columns: 2
orientation: landscape       # বুকলেট প্রিন্ট
---
```
* **লেআউট নিয়ম:** ঝুলন্ত ইন্ডেন্ট (৪৩২ dxa), উদ্দীপকের প্রথম লাইন ক্রমিকের সাথে সমান্তরাল, উপ-প্রশ্ন (ক, খ, গ, ঘ) এবং ডান মার্জিনে প্রশ্নের মান `[১]`, `[২]`, `[৩]`, `[৪]`।

---

### ২. সেক্টর: `EXAM_GENERAL` (সাধারণ / প্রাথমিক প্রশ্নপত্র)
```yaml
---
doc_type: EXAM_GENERAL
institute: ফুলবাড়ী আইডিয়াল সরকারি প্রাথমিক বিদ্যালয়
exam: ২য় সাময়িক পরীক্ষা - ২০২৬
grade: চতুর্থ শ্রেণি
subject: প্রাথমিক গণিত
time: ২ ঘণ্টা
full_marks: ১০০
columns: 2
orientation: portrait
---
```
* **লেআউট নিয়ম:** কোনো উদ্দীপক বা জোরপূর্বক ক,খ,গ,ঘ চাপানো হবে না। সাধারণ ১, ২, ৩ ক্রমিক, শূন্যস্থান, মিলকরণ ও প্রশ্নাবলী স্বাভাবিক মার্জিনে ২-কলামে সাজবে।

---

### ৩. সেক্টর: `EXAM_MCQ` (বহুনির্বাচনী প্রশ্ন)
```yaml
---
doc_type: EXAM_MCQ
institute: ফুলবাড়ী সরকারি কলেজ, দিনাজপুর
exam: নির্বাচনী পরীক্ষা - ২০২৬
grade: একাদশ শ্রেণি
subject: তথ্য ও যোগাযোগ প্রযুক্তি (ICT)
time: ২৫ মিনিট
full_marks: ২৫
columns: 2
total_mcq: 25
---
```
* **লেআউট নিয়ম:** প্রতিটি প্রশ্নে (ক) (খ) (গ) (ঘ) চার-অপশন গ্রিড বা দুই-অপশন গ্রিড।

---

### ৪. সেক্টর: `EXAM_COMBINED` (সম্মিলিত সিকিউ + এমসিকিউ)
```yaml
---
doc_type: EXAM_COMBINED
institute: ফুলবাড়ী সরকারি পাইলট উচ্চ বিদ্যালয়
exam: এসএসসি নির্বাচনী পরীক্ষা - ২০২৬
grade: দশম শ্রেণি
subject: বাংলা (প্রথম পত্র)
columns: 2
---
# ক-বিভাগ (সৃজনশীল প্রশ্ন - ৭০ নম্বর)
[সৃজনশীল প্রশ্নসমূহ...]

---SECTION_BREAK:MCQ---

# খ-বিভাগ (বহুনির্বাচনী অভীক্ষা - ৩০ নম্বর)
[বহুনির্বাচনী প্রশ্নসমূহ...]
```

---

### ৫. সেক্টর: `OFFICE_PAD` (প্রাতিষ্ঠানিক প্যাড)
```yaml
---
doc_type: OFFICE_PAD
institute: ফয়জার কম্পিউটার অ্যান্ড ডিজিটাল সেন্টার
tagline: ডিজিটাল, অনলাইন ও ভূমিসেবা কেন্দ্র
ref_no: এফসি/২০২৬/১১৮
date: ২৪ সেপ্টেম্বর ২০২৬
mobile: ০১৭১৭-১০১৯১৯
address: ফুলবাড়ী সরকারি কলেজ গেট, দিনাজপুর
top_margin_inches: 1.5       # তৈরি প্যাডের জন্য টপ মার্জিন (কম্পিউটার প্রিন্ট হলে 0.8)
columns: 1
---
[এখানে প্যাডের মূল চিঠি বা বার্তা...]
```

---

### ৬. সেক্টর: `PROTTOYON_CERT` (প্রত্যয়নপত্র ও প্রশংসাপত্র)
```yaml
---
doc_type: PROTTOYON_CERT
institute: ফুলবাড়ী সরকারি পাইলট উচ্চ বিদ্যালয়
serial_no: ফসপাউবি/প্রত্যয়ন/২০২৬/৮৯
date: ২৪ সেপ্টেম্বর ২০২৬
candidate_name: মোঃ নাঈম ইসলাম
father_name: মোঃ রফিকুল ইসলাম
mother_name: মোছাঃ নাছিমা বেগম
village: সুজাপুর, ডাকঘর: ফুলবাড়ী, দিনাজপুর
has_border_frame: true
columns: 1
---
[এখানে প্রত্যয়নের মূল ভাষা ও চারিত্রিক প্রশংসাপত্র...]
```

---

### ৭. সেক্টর: `GOVT_APP` (সরকারি ও চাকরির আবেদন)
```yaml
---
doc_type: GOVT_APP
recipient: উপজেলা নির্বাহী অফিসার, ফুলবাড়ী, দিনাজপুর
subject: ফুলবাড়ী পৌর এলাকায় রাস্তা সংস্কারের জন্য আবেদন
salutation: জনাব / মহোদয়
applicant_type: এলাকাবাসীর পক্ষে
date: ২৪ সেপ্টেম্বর ২০২৬
columns: 1
---
[আবেদনের মূল বডি...]
```

---

### ৮. সেক্টর: `OFFICIAL_NOTICE` (নোটিশ ও স্মারক)
```yaml
---
doc_type: OFFICIAL_NOTICE
institute: উপজেলা নির্বাহী অফিসারের কার্যালয়, ফুলবাড়ী
memo_no: ০৫.৪৬.২৭৩৮.০০১.০২.০১৫.২৬-১৪২
date: ২৪ সেপ্টেম্বর ২০২৬
subject: স্মার্ট নাগরিক সেবা সপ্তাহ সংক্রান্ত জরুরি বিজ্ঞপ্তি
columns: 1
---
[নোটিশের বডি ও স্বাক্ষর তালিকা...]
```

---

### ৯. সেক্টর: `LEGAL_DEED` (৩০০ টাকার স্ট্যাম্প চুক্তিপত্র দলিল)
```yaml
---
doc_type: LEGAL_DEED
title: দোকান ঘর ভাড়ার দ্বিপাক্ষিক চুক্তিপত্র দলিল
stamp_value: ৩০০ টাকার নন-জুডিশিয়াল স্ট্যাম্প
stamp_margin_inches: 3.5      # স্ট্যাম্প অংশের জন্য প্রথম পৃষ্ঠায় ৩.৫ ইঞ্চি ফাঁকা
columns: 1
---
[দলিলের পক্ষগণ ও শর্তাবলী...]
```

---

## 🛠️ নতুন সেক্টর সংযোজন নির্দেশিকা (How to Add a New Sector)

ভবিষ্যতে যেকোনো নতুন লেআউট সেক্টর যুক্ত করার সময়:
1. এই ফাইলে নতুন সেক্টরের **Sector ID**, **ফ্রন্টম্যাটার ফিল্ডসমূহ** এবং **মার্জিন/কলাম নিয়মাবলী** লিখুন।
2. `layout-templates.js`-এ টেমপ্লেটের ডেফিনিশন যুক্ত করুন।
3. `docx-layout-builder.js`-এ সংশ্লিষ্ট সেক্টরের জন্য `case` বা বিল্ডার মেথড লিখুন।
4. `PROJECT_MAP.md` টেবিলে নতুন সেক্টরটি ইনডেক্স করুন।
