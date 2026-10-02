# Part-10 MCQ লেআউট — রেন্ডার প্রুফ

উৎপাদন এক্সপোর্ট পাথ (`ExportDualEngine.generateWordDoc`) থেকেই ফাইল বানানো হয়েছে — অর্থাৎ
যা ইউজার ডাউনলোড করে, ঠিক সেটি LibreOffice-headless দিয়ে PDF/ PNG করে মাপা হয়েছে।
স্ক্রিপ্ট: `node qa/mcq-render-proof.mjs` (নমুনা = tests/fixtures/mcq-*.input.md, অটো-ডিসকভার)।

| নমুনা | প্রশ্ন | ফন্ট | প্ল্যান পৃষ্ঠা | `.doc` পৃষ্ঠা | `.docx` পৃষ্ঠা | লাইন কলাম১/কলাম২ (.doc) | লাইন কলাম১/কলাম২ (.docx) | ২য় কলামের প্রান্ত |
|---|---|---|---|---|---|---|---|---|
| mcq-header-fallback | 14 | 12pt | 1 | 1 | 1 | 22/24 | 22/24 | 304.95/304.85pt |
| mcq-long-options | 14 | 12pt | 1 | 1 | 1 | 39/35 | 38/36 | 304.95/304.85pt |
| mcq-mixed-options | 6 | 12pt | 1 | 1 | 1 | 17/13 | 15/13 | 304.95/304.85pt |
| mcq-pure-28 | 33 | 12pt | 2 | 2 | 2 | 38/32 | 37/33 | 304.95/304.85pt |
| mcq-shrink-21 | 21 | 11pt | 1 | 1 | 1 | 41/36 | 40/34 | 304.95/304.85pt |

## পৃষ্ঠা-ভাগের ভবিষ্যদ্বাণী (প্ল্যান) বনাম আসল রেন্ডার

- **mcq-header-fallback** — plan.pages=1, .doc=1, .docx=1 | split=p1:7/7
- **mcq-long-options** — plan.pages=1, .doc=1, .docx=1 | split=p1:6/8
- **mcq-mixed-options** — plan.pages=1, .doc=1, .docx=1 | split=p1:3/3
- **mcq-pure-28** — plan.pages=2, .doc=2, .docx=2 | split=p1:11/8 p2:7/7
- **mcq-shrink-21** — plan.pages=1, .doc=1, .docx=1 | split=p1:12/9

## ফাইল

- `proof/<id>.doc` / `proof/<id>.docx` — আসল ডাউনলোড-আর্টিফ্যাক্ট (Word 2003 RTF / OOXML)
- `proof/<id>.doc.pdf` / `proof/<id>.docx.pdf` — সেগুলোর LibreOffice রেন্ডার
- `proof/<id>.<fmt>.page1.png` — ১ম পৃষ্ঠার ছবি (চোখে মেলানোর জন্য)
- `proof/render/<id>.<fmt>/` — রেন্ডারের কাজের ডির (PDF + page-1 PNG)
- `proof/render-measure.json` — সব মেপে-পাওয়া সংখ্যা (y-pitch, কলাম-লাইন সংখ্যা, মার্জিন, প্রান্ত)
- `proof/samples/*.md` — ইনপুট নমুনা (OCR/মার্কডাউনের আসল চেহারা)

> দ্রষ্টব্য: এই স্যান্ডবক্সে Kalpurush ফন্ট নেই — LibreOffice বিকল্প ফন্ট বসায়, তাই বাংলা
> অক্ষরের গণনা (pdftotext) আংশিক; জ্যামিতি (অবস্থান/পৃষ্ঠাসংখ্যা) তাতে ব্যাহত হয় না।
