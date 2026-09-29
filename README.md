# 🇧🇩 ফয়জার বাংলা ও গণিত কনভার্টার (Fayzar Bangla & Math Converter)

**১০০% অফলাইন সমর্থিত সার্বজনীন বাংলা ফন্ট, গণিত প্রশ্নপত্র ও অফিস ডকুমেন্ট কনভার্সন স্যুট**

---

## 🌟 পরিচিতি (Overview)
এই রিপোজিটরিটি একটি স্বয়ংসম্পূর্ণ, ক্লায়েন্ট-সাইড (Client-Side) এবং অফলাইন চালনাযোগ্য বাংলা ফন্ট ও ডকুমেন্ট প্রসেসিং সিস্টেম। কোনো ইন্টারনেট সংযোগ বা দূরবর্তী সার্ভার নির্ভরতা ছাড়াই সরাসরি যেকোনো আধুনিক ব্রাউজারে এটি দ্রুত ও শতভাগ নির্ভুলভাবে কাজ করে।

## 🚀 প্রধান সুবিধাসমূহ (Key Features)

1. **ইউনিকোড ⇄ বিজয় দ্বি-মুখী রূপান্তর (Bi-directional Converter):**
   - ইউনিকোড (Avro / Unicode) থেকে বিজয় (SutonnyMJ) ফন্টে রূপান্তর।
   - বিজয় থেকে ইউনিকোডে রূপান্তর।
   - যুক্তাক্ষর, ঋ-কার, রেফ, হসন্ত ও জটিল বাংলা বানানের শতভাগ নির্ভুল হ্যান্ডলিং।

2. **ম্যাথ ও ল্যাটেক্স সমীকরণ সুরক্ষা (Math & LaTeX Equation Preservation):**
   - প্রশ্নপত্র কম্পোজের সময় গণিত সমীকরণ, ভগ্নাংশ (LaTeX / OMML) এবং রোমান সংখ্যা সনাক্ত করে অক্ষত রাখা।

3. **অফিস ডকুমেন্ট রূপান্তর (MS Office Font Conversion):**
   - **Word (.docx):** সরাসরি ওয়ার্ড ফাইলের ভেতর বাংলা ফন্ট রূপান্তর।
   - **Word 2003 (.doc):** আধুনিক DOCX থেকে সরাসরি আদি ও অকৃত্রিম Word 2003 DOC বাইনারি ফাইল তৈরি।
   - **Excel (.xlsx):** স্প্রেডশীটের প্রতিটি সেলের বাংলা ফন্ট কনভার্সন।
   - **PowerPoint (.pptx):** প্রেজেন্টেশনের টেক্সটবক্স ও শেপের বাংলা ফন্ট পরিবর্তন।

4. **AI ও লোকাল ওসিআর ইঞ্জিন (OCR & Question Paper Digitization):**
   - স্ক্যান করা প্রশ্নপত্র ও ছবি থেকে সরাসরি সুতন্নিএমজে ওয়ার্ড ফাইল তৈরি করার কাঠামো।

5. **১০০% অফলাইন (Zero External Dependency):**
   - কোনো সিডিএন (CDN) নেই; Tailwind, FontAwesome, PDF.js, Google Webfonts ও বাংলা ফন্টসমূহ লোকাল ফোল্ডারে সংরক্ষিত।

---

## 📂 ফাইল ও ফোল্ডার ডিরেক্টরি কাঠামো (Project Structure)

```text
fayzar-bangla-converter/
│
├── index.html                  # মূল কনভার্টার হোমপেজ (সার্বজনীন বাংলা ও গণিত কনভার্টার)
├── converter.html              # কনভার্টার ব্যাকআপ / সরাসরি লিঙ্ক
├── doc-converter.html          # ডকুমেন্ট কনভার্টার পেজ (Word, Excel, PPTX)
├── docx-to-doc.html            # ওয়ার্ড ২০০৩ DOC এক্সপোর্টার
├── OPEN_OFFLINE.bat            # ডাবল ক্লিকে অফলাইনে কনভার্টার চালু করার স্ক্রিপ্ট
├── README.md                   # পূর্ণাঙ্গ ডকুমেন্টেশন
├── .gitignore                  # গিট ট্র্যাকিং কনফিগ
│
├── js/                         # জাভাস্ক্রিপ্ট কোর ও ইঞ্জিন মডিউল
│   ├── bangla-converter-engine.js   # ইউনিকোড ⇄ বিজয় কনভার্সন কোর ইঞ্জিন
│   ├── equation-converter.js        # গণিত সমীকরণ ও LaTeX প্রসেসর
│   ├── docx-to-doc-engine.js        # DOCX থেকে Word 2003 DOC রূপান্তর ইঞ্জিন
│   ├── doc-binary-engine.js         # বাইনারি ডক ফরম্যাট হ্যান্ডলার
│   ├── docx-handler.js              # Word .docx জিপ ও টেক্সট পার্সার
│   ├── xlsx-handler.js              # Excel .xlsx স্প্রেডশীট প্রসেসর
│   ├── pptx-handler.js              # PowerPoint .pptx পার্সার
│   ├── ai-ocr-engine.js             # এআই ওসিআর প্রম্পট ও প্রসেসর
│   ├── fayzar-ocr-config.js         # ওসিআর কনফিগারেশন
│   ├── theme-lang.js                # ডার্ক/লাইট থিম ও ভাষা কন্ট্রোলার
│   ├── jszip.min.js                 # ক্লায়েন্ট-সাইড আনজিপ ও রিপ্যাকিং লাইব্রেরি
│   └── vendor/                      # অফলাইন ভেন্ডর লাইব্রেরি
│       ├── tailwindcss.js           # স্ট্যান্ডঅ্যালন টেলউইন্ড সিএসএস ইঞ্জিন
│       ├── pdf.min.js               # অফলাইন পিডিএফ রেন্ডারার
│       └── pdf.worker.min.js        # পিডিএফ ওয়ার্কার থ্রেড
│
├── css/                        # স্টাইলশীট
│   ├── style.css                    # গ্লাস মরফিজম, অ্যানিমেশন ও ইউআই স্টাইল
│   ├── google-fonts.css             # লোকাল ফন্ট লোডার
│   └── font-awesome/                # ফন্টঅসাম আইকন সিএসএস
│
├── fonts/                      # লোকাল বাংলা ও ইংরেজি ফন্ট
│   ├── SutonnyMJ.ttf
│   ├── Kalpurush.ttf
│   └── ...
│
├── webfonts/                   # ফন্টঅসাম ভেক্টর আইকন ফন্ট
│
└── assets/                     # লোগো, ফেভিকন ও ইমেজ রিসোর্স
```

---

## 💻 কীভাবে ব্যবহার করবেন (How to Run Offline)

1. এই ফোল্ডারের `OPEN_OFFLINE.bat` ফাইলে ডাবল ক্লিক করুন।
2. অথবা যেকোনো ব্রাউজারে (Chrome, Edge, Firefox) সরাসরি `index.html` ফাইলটি ওপেন করুন।
3. কোনো লোকাল সার্ভার বা ইন্টারনেট সংযোগের প্রয়োজন নেই।

---

## 🔧 গিট রিপোজিটরিতে যুক্ত করার নিয়ম (Git Initialization)

এই ফোল্ডারে নতুন গিট রিপোজিটরি শুরু করার জন্য টার্মিনালে রান করুন:
```bash
cd fayzar-bangla-converter
git init
git add .
git commit -m "feat: initial commit for Fayzar Bangla & Math Converter suite"
git branch -M main
# আপনার রিমোট রিপোজিটরির সাথে লিংক করতে:
# git remote add origin <your-repo-url>
# git push -u origin main
```

---
© ২০২৬ ফয়জার কম্পিউটার এন্ড ফটোস্ট্যাট (Fayzar Computer & Photostat). All Rights Reserved.
