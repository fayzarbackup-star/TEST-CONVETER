# PROJECT_MAP — কাজ → ফাইল → ফাংশন (এডিট-পয়েন্ট সূচি)

> **কীভাবে খুঁজবে (পুরো প্রজেক্ট কখনো পড়বে না):**
> 1. নিচের টেবিলে কাজটা খোঁজো → ফাইল + ফাংশন/গ্লোবাল নাম পাবে।
> 2. লাইন নম্বর: `docs/CODE_INDEX.md`-এ Grep (যেমন `estimateHeight@`) → `ফাইল` আর `নাম@লাইন`। পুরো সূচি পড়বে না।
> 3. শুধু ওই অংশ Read (offset/limit)। না মিললে নির্দিষ্ট ফোল্ডারে Grep।
> - সূচি হালনাগাদ: ফাইল যোগ/নাম-বদল/মোছার পরে `node tools/gen-map.mjs` (স্বয়ংক্রিয়, হাতে লেখা নয়)। এই টেবিল হাতে, শুধু নতুন কাজ/মডিউল এলে এক লাইন।
> - ইতিহাস: `docs/AI_MEMORY.md`। পুরোনো বড় ম্যাপ: `docs/archive/PROJECT_MAP_OLD_2026-10-09.md` (পড়ার দরকার নেই)।
> - অনুমতির স্তর (CLAUDE.md): 🔒 মূল ইঞ্জিন = যেকোনো বদলে আগে অনুমতি · ⚙️ চালু বড় ইঞ্জিন = ছোট যোগ ঠিক, আচরণ বদলালে অনুমতি।

## ১. মূল প্রবাহ (এক নজরে)
ছবি/PDF → `ai-ocr-engine` (Gemini প্রম্পট, Worker প্রক্সি) → ইউনিকোড Markdown (+ফ্রন্টম্যাটার doc_type/grade/sections) →
`DocClassifier` (লেআউট বাছাই) → `ExportDualEngine` / `FayzarPipeline` (doc_type অনুযায়ী লেআউট মডিউল) →
ইউনিকোড মাস্টার .docx → `DocxHandler` (বিজয় .docx) → `DocxToDocConverter` (Word 2003 .doc, MHTML ছবি)।
হুবহু-লেআউট মোড আলাদা পথ: `js/layout-engine/faithful/` → `FayzarExport.produce`।

## ২. কাজ → ফাইল → ফাংশন

### OCR ও শ্রেণিবিভাগ
| কাজ | ফাইল | ফাংশন / নাম |
|---|---|---|
| Gemini OCR প্রম্পট (doc_type নিয়ম, ফ্রন্টম্যাটার) | ⚙️ `js/ai-ocr-engine.js` | `GEMINI_PROMPT`, `GEMINI_VERIFY_PROMPT` |
| OCR চালানো, ফাইল নেওয়া | ⚙️ `js/ai-ocr-engine.js` | `handleFiles`, `startUnifiedOcr` |
| সাইটের ডাউনলোড (.doc/বিজয়/ইউনিকোড) | ⚙️ `js/ai-ocr-engine.js` | `downloadWordDocument`, `prepareSourceFigures` |
| প্রক্সি ব্যর্থতা-নীতি | `js/proxy-failure-policy.js` | `FayzarProxyPolicy.decideProxyFallback` |
| Cloudflare Worker (কি-রোটেশন, লগ) | `fayzar-ocr-proxy/index.js`, `ledger.js` | — (ডিপ্লয় নিয়ম: স্মৃতি `ocr-proxy-ops`) |
| doc_type → লেআউট বাছাই | ⚙️ `js/engines/doc-classifier.js` | `classify`, `layoutFromFacts`, `structureStats`, `promoteCombined`, `NON_EXAM` |
| ফ্রন্টম্যাটার → প্রশ্নপত্র-হেডার | `js/layout-engine/frontmatter-header.js` | `FayzarFrontmatter` |

### রপ্তানি ও রাউটিং (নতুন doc_type এখানে জোড়ে)
| কাজ | ফাইল | ফাংশন / নাম |
|---|---|---|
| .doc (RTF) রাউটিং | ⚙️ `js/engines/export-dual-engine.js` | `generateLegacyDoc` |
| .docx রাউটিং | ⚙️ `js/engines/export-dual-engine.js` | `generateModernDocx`, `generateCombinedExamDocx`, `_splitCombined` |
| লেআউট-মডিউল লোডার | ⚙️ `export-dual-engine.js` | `_getCvLayout`, `_getLetterLayout`, `_getApplicationLayout` (নতুনটা এই ধাঁচে) |
| টেক্সট-রান (বিজয় ফন্ট, ইংরেজি/চিহ্ন আলাদা) | ⚙️ `export-dual-engine.js` / `js/layout-engine/text-run-processor.js` | `renderDocxRuns`, `isBijoyFont`, `TextRunProcessor` |
| পাইপলাইন (পার্স → HTML প্রিভিউ → .doc) | ⚙️ `js/layout-engine/fayzar-pipeline.js` | `_parseByDocType`, `_renderHtml`, `exportDoc` |
| একক রপ্তানি-পথ (মাস্টার → বিজয় → .doc) | `js/layout-engine/fayzar-export.js` | `FayzarExport.produce` |
| .doc-এ ছবি (MHTML) | `js/layout-engine/doc-mhtml-packager.js` | `FayzarDocMhtml`, `sizeImgTags` |
| HTML script ট্যাগ | `index.html`, `ocr-classic.html`, `studio.html` | CODE_INDEX-এর "HTML পাতা" অংশ |

### প্রশ্নপত্র লেআউট
| কাজ | ফাইল | ফাংশন / নাম |
|---|---|---|
| প্রশ্ন পার্স (CQ/MCQ/সাধারণ) | ⚙️ `js/engines/question-engine.js` | `parseQuestionPaper`, `_metaLine` |
| স্তরযুক্ত সাধারণ প্রশ্নপত্র (প্রাথমিক/বৃত্তি) | `js/layout-engine/general-paper-parser.js` | `FayzarGeneralParser`, `isNested` |
| CQ বুকলেট/কলাম/প্রোফাইল (EXAM_PRIMARY, EXAM_ONECOL) | ⚙️ `js/layout-engine/cq-booklet-planner.js` | `LAYOUT_PROFILES`, `CqBookletPlanner` |
| MCQ গ্রিড/ট্যাব/পাতা-ভাগ | ⚙️ `js/layout-engine/mcq-layout-planner.js` | `McqLayoutPlanner`, `balancePageHeader` |
| ক্রমিক-দূরত্ব (০.২"/০.৩") | `js/layout-engine/layout-units.js` | `FayzarLayoutUnits.questionIndent` |
| প্রশ্ন-নম্বর পুনর্বিন্যাস | `js/layout-engine/exam-renumber.js` | `FayzarExamRenumber` |
| সমীকরণ (EQ-ফিল্ড/OMML) — Word-যাচাই ছাড়া হাত নয় | 🔒 `js/equation-converter.js`, `js/layout-engine/eq-field-rtf.js` | `latexToEqField`, `splitRuns`, `italicVars` |

### অফিস/ব্যক্তিগত ডকুমেন্ট (প্রতিটা আলাদা মডিউল; মাপ ফাইলের মাথার মন্তব্যে)
| কাজ | ফাইল | ফাংশন / নাম |
|---|---|---|
| আবেদনপত্র (GOVT_APP) | `js/layout-engine/application-layout.js` | `FayzarApplicationLayout` (`estimateHeight`, `_docxTable`, `_rtfTable`) |
| প্যাড/অফিস চিঠি, প্রত্যয়নপত্র | `js/layout-engine/letter-layout.js` | `FayzarLetterLayout` |
| সাজানো ল্যান্ডস্কেপ সনদ/প্রশংসাপত্র (single + মুড়িসহ stub; `wants` = page_orientation বা মুড়ি) | `js/layout-engine/certificate-layout.js` | `FayzarCertificateLayout` (`wants`, `_split`, `_parsePart`, `_paras`, `_docxSide`, `renderDocx/Rtf/Html`) |
| বাংলা সিভি (ফন্ট-ধাপ `STEPS`, সর্বনিম্ন ১২pt) | `js/layout-engine/cv-layout.js` | `parse`, `_takeFooter`, `geometry`, `estimateHeight`, `renderDocx/Rtf/Html` |
| ইংরেজি সিভি, সনদ, দলিল, রুটিন, বেতন, প্রবেশপত্র (পুরোনো) | `js/engines/*-engine.js` | `CVEngine`, `CertificateEngine`, `StampEngine`, `RoutineEngine`, `SalarySlipEngine`, `AdmitCardEngine` |

### বিজয়/রূপান্তর
| কাজ | ফাইল | ফাংশন / নাম |
|---|---|---|
| ইউনিকোড ⇄ বিজয় | 🔒 `js/bangla-converter-engine.js` | `unicodeToBijoy`, `bijoyToUnicode` |
| .docx-এর ভেতরে বিজয় রূপান্তর | ⚙️ `js/docx-handler.js` | `DocxHandler`, `fixLoneKars` |
| .docx → Word 2003 .doc | 🔒 `js/docx-to-doc-engine.js` | `DocxToDocConverter`, `sanitizeFontFamily`, `_toTargetScript` |
| পুরোনো .doc বাইনারি পড়া | 🔒 `js/doc-binary-engine.js` | `DocBinaryEngine` |

### চিত্র ও হুবহু-লেআউট
| কাজ | ফাইল | ফাংশন / নাম |
|---|---|---|
| সোর্স থেকে চিত্র কাটা | `js/layout-engine/figure-extractor.js` | `parseTagBody`, `normalizePlacement`, `refineRect`, `estimateSkew`, `stripTags` |
| চিত্র রিভিউ / স্টুডিওতে পাঠানো | `js/figure-review-ui.js`, `js/engines/figure-transfer-store.js` | `FayzarFigureReview`, `FayzarFigureTransfer.put/take` |
| হুবহু-লেআউট (ক্যাপচার → IR → docx) | `js/layout-engine/faithful/*` | `FayzarFaithful` (`splitFromNeighbor`), `FayzarLayoutIR`, `FayzarPageGeometry` (`detectFrame`), `FayzarFaithfulDocx` |

### সাইট/UI
| কাজ | ফাইল | ফাংশন / নাম |
|---|---|---|
| হোম/ওয়ার্কস্পেস/ফলাফল পাতা | `index.html` + `js/home-app.js` | — |
| সার্ভিস ও টুলস পাতা | `services.html` + `js/tools-app.js` | — |
| হেডার/ফুটার (এক উৎস) | `scripts/fz-shell.mjs`, `js/fayzar-nav.js`, `css/fayzar-theme.css` | FZ-NAV/FZ-FOOT মার্কার |
| সেশন-ক্যাশ, ইতিহাস | `js/session-store.js` | `FayzarSession` |
| ডায়াগনস্টিক / "সমস্যা জানান" | `js/diag-log.js` | `FayzarDiag` |
| হুবহু-মোড UI | `js/faithful-mode-ui.js` | `FayzarFaithfulUI` |
| স্টুডিও (এডিটর) | `studio.html` + `js/studio-controller.js` | `StudioEditBridge`, `StudioFigurePipeline` |
| পুরোনো OCR পাতা (লিংকহীন) | `ocr-classic.html` + `js/main.js` | — |

## ৩. টেস্ট ও যাচাই
| কাজ | কোথায় |
|---|---|
| পুরো সেট (শুধু শেষে) | `node tests/run-all.mjs` (রিগ্রেশন snapshot: `node tests/run-regression.js [--update]`, ফিক্সচার `tests/fixtures/*.input.md`) |
| একটি টেস্ট | `node --test --test-reporter=tap tests/<নাম>` |
| সাইটের আসল ডাউনলোড-শিকল | `$env:FMTS='bijoy_docx,doc,unicode_docx'; node qa/site-chain-download.mjs <outDir> <fixture.md>[;cols]` |
| Word COM মাপ | `tools/dump-doc.ps1`, `tools/cv-tabs.ps1`, `tools/pdf-pages.ps1` |
| প্রক্সি অবস্থা/লগ | `qa/proxy-status.mjs`, `qa/proxy-log.mjs` |
| ব্রাউজার E2E-র playwright | `scratch/test_env` (মুছবে না) |
| গিটহাবে পুশ (অনুমতিতে) | `node scratch/github_sync.js --dry` / `--push "<msg>"` |

## ৪. ফোল্ডার
`js/` কোড · `js/layout-engine/` লেআউট মডিউল (নতুন যুক্তি এখানে) · `js/engines/` পুরোনো/চালু ইঞ্জিন · `js/vendor/` বাইরের লাইব্রেরি (পড়বে না) · `tests/` টেস্ট+ফিক্সচার+baseline · `qa/` যাচাই-স্ক্রিপ্ট · `tools/` Word COM + `gen-map.mjs` · `fayzar-ocr-proxy/` Worker · `docs/` নথি (HANDOFF, AI_MEMORY, MASTER_PLAN, LAYOUT_SPECIFICATION, CODE_INDEX) · `fonts/`, `webfonts/`, `css/`, `assets/` স্থানীয় সম্পদ · `proof/` টেস্টের নমুনা-আউটপুট।
