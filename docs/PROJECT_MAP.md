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
| নকশা-পত্র v1 (পর্ব ৪): ক্যাপচার-প্রম্পট `designSheet:true` + ট্যাগ-পার্সার (ফ্রন্টম্যাটার/ভূমিকা/g/hdr/cw/mg/[?]) + অঙ্ক-লিপি মেলানো → `fromDesignSheet`/`fromCapture` | `js/layout-engine/faithful/faithful-prompt.js`, `layout-tags.js`, `digit-script.js`, `doc-model-adapters.js`, `doc-model.js`, `general-clean-layout.js` (tableXml); QA `qa/design-sheet-capture.mjs`, `qa/design-sheet-gate.mjs`, `tests/design-sheet.test.js` |
| স্ব-যাচাই c1–c9 (পর্ব ৩; scorer-ও একই কোড) + অচেনা ধরন → GENERAL_CLEAN রাউটিং | `js/layout-engine/self-check.js` (selfCheck/computeChecks/showNotice), `export-dual-engine.js` (`generateModernDocx` → `_selfCheckGate`, `_generalCleanGeneric`), `qa/usability-score.mjs`, `qa/route-2b-compare.mjs`, `tests/self-check.test.js` |
| GENERAL_CLEAN (পর্ব ২ক; ২খ থেকে অচেনা ধরনের ডিফল্ট পথ): doc-model → লেআউট | `js/layout-engine/doc-model.js`, `doc-model-adapters.js` (fromCaptureBlocks/fromOcrMarkdown), `general-clean-layout.js`; QA `qa/general-clean-batch.mjs`, `tests/general-clean.test.js` |
| ক্লিন ওয়ার্ড (১-কলাম, টেবিল/সমীকরণ অক্ষত) + কপি/.txt/.md লেখা — T1 | `js/layout-engine/clean-composer.js` (+ `home-app.js` `cleanDownload`, `setStyle`) | `FayzarCleanComposer` (`parse`, `renderDocx`, `plainText`, `markdown`); QA `qa/clean-e2e.mjs` |
| ছাঁচ-গ্যালারি (ব্যবহারকারী ছাঁচ বাছেন → ফ্রন্টম্যাটার তালা `layout_lock`/`layout_profile`) — T2 | `js/layout-engine/template-composer.js` (+ `home-app.js` `renderGallery`, `setTpl`; ⚙️ classifier `classify` তালা-লাইন, ⚙️ cq-booklet-planner `layoutKey`, ⚙️ ai-ocr-engine `state.templateHint`) | `FayzarTemplateComposer` (`REGISTRY`, `enforce`, `promptHint`, `check`); QA `qa/template-e2e.mjs` |
| নিজের নমুনা থেকে ছাঁচ (হুবহু-নকশা → স্লট → খসড়া বসানো) — T3b, `docs/T3_PLAN.md` | `js/layout-engine/sample-template.js` | `FayzarSampleTemplate` (`fromIR`, `splitContent`, `matchLocal`, `fill`, `fillTable`, `toTemplate`, `compose`, `slimIR`; T3c Gemini-ম্যাপ `needsRemote`, `buildMapPrompt`, `parseMap`, `mapWithGemini`, `composeAsync`) |
| .doc-এ ছবি (MHTML) | `js/layout-engine/doc-mhtml-packager.js` | `FayzarDocMhtml`, `sizeImgTags` |
| HTML script ট্যাগ | `index.html`, `ocr-classic.html`, `studio.html` | CODE_INDEX-এর "HTML পাতা" অংশ |

### প্রশ্নপত্র লেআউট
| কাজ | ফাইল | ফাংশন / নাম |
|---|---|---|
| প্রশ্ন পার্স (CQ/MCQ/সাধারণ) | ⚙️ `js/engines/question-engine.js` | `parseQuestionPaper`, `_metaLine` |
| স্তরযুক্ত সাধারণ প্রশ্নপত্র (প্রাথমিক/বৃত্তি) | `js/layout-engine/general-paper-parser.js` | `FayzarGeneralParser`, `isNested` |
| CQ বুকলেট/কলাম/প্রোফাইল (EXAM_PRIMARY, EXAM_ONECOL) | ⚙️ `js/layout-engine/cq-booklet-planner.js` | `LAYOUT_PROFILES`, `CqBookletPlanner` |
| MCQ গ্রিড/ট্যাব/পাতা-ভাগ | ⚙️ `js/layout-engine/mcq-layout-planner.js` | `McqLayoutPlanner`, `balancePageHeader` |
| লেআউট-রেজিস্ট্রি (id/alias → লেআউট, ফ্রন্টম্যাটার-লুকআপ; A2, সুইচ-গেটেড) | `js/layout-engine/layout-registry.js` | `FayzarLayoutRegistry` (`normalizeLookupKey`, `extractFrontmatterFromText`) |
| ক্রমিক-দূরত্ব (০.২"/০.৩") | `js/layout-engine/layout-units.js` | `FayzarLayoutUnits.questionIndent` |
| কালপুরুষে প্রশ্নপত্রের লাইন-গুণক (targetFont 'unicode' ⇒ ০.৭২) | `layout-units.js` + ⚙️ `export-dual-engine.js` | `examLineFactor`, `_examLineFactor`, `_fixDocxSpacing` |
| প্রশ্ন-নম্বর পুনর্বিন্যাস | `js/layout-engine/exam-renumber.js` | `FayzarExamRenumber` |
| সমীকরণ (EQ-ফিল্ড/OMML) — Word-যাচাই ছাড়া হাত নয় | 🔒 `js/equation-converter.js`, `js/layout-engine/eq-field-rtf.js` | `latexToEqField`, `splitRuns`, `italicVars` |

### অফিস/ব্যক্তিগত ডকুমেন্ট (প্রতিটা আলাদা মডিউল; মাপ ফাইলের মাথার মন্তব্যে)
| কাজ | ফাইল | ফাংশন / নাম |
|---|---|---|
| আবেদনপত্র (GOVT_APP) | `js/layout-engine/application-layout.js` | `FayzarApplicationLayout` (`estimateHeight`, `_docxTable`, `_rtfTable`) |
| প্যাড/অফিস চিঠি, প্রত্যয়নপত্র | `js/layout-engine/letter-layout.js` | `FayzarLetterLayout` |
| OCR হালকা ভূমিকা-চিহ্ন `<!--r:sig,sideR-->` (stamp/sig/note/side/align; 1B-ii) | `js/layout-engine/role-marks.js` (gate ⚙️ `ai-ocr-engine.cleanOcrResponse`) | `FayzarRoleMarks` (`extract`, `strip`, `gate`); ব্যবহার letter `_takeSignature(lines, marks)`, certificate `parse` |
| সাজানো ল্যান্ডস্কেপ সনদ/প্রশংসাপত্র (single + মুড়িসহ stub; `wants` = page_orientation বা মুড়ি) | `js/layout-engine/certificate-layout.js` | `FayzarCertificateLayout` (`wants`, `_split`, `_parsePart`, `_paras`, `_docxSide`, `renderDocx/Rtf/Html`) |
| ক্যাশমেমো ১-আপ (A5)/২-আপ/৩-আপ (CASH_MEMO; `copies` ফ্রন্টম্যাটার; ইউনিকোডে লাইন ×০.৭২) | `js/layout-engine/cash-memo-layout.js` | `FayzarCashMemoLayout` (`parse`, `geometry`, `_fill`, `_hsz`, `renderDocx/Rtf/Html`) |
| টাকা প্রাপ্তির রসিদ / খরচের ভাউচার (CASH_MEMO + ছাঁচের `memo_kind`; নমুনা ছাড়া নকশা) | `js/layout-engine/receipt-layout.js` | `FayzarReceiptLayout` (`wants`, `parse`, `_segments`, `_signParts`, `_table`, `renderDocx/Rtf/Html`); রাউটিং export-dual-engine `_receiptDocx/_receiptRtf`, pipeline `CASH_MEMO` case |
| বাংলা সিভি (ফন্ট-ধাপ `STEPS`, সর্বনিম্ন ১২pt) | `js/layout-engine/cv-layout.js` | `parse`, `_takeFooter`, `geometry`, `estimateHeight`, `renderDocx/Rtf/Html` |
| ইংরেজি সিভি-ছাঁচ (দোকানের ফরম্যাট; তালা `cv-english` বা তালা ছাড়া ইংরেজি-প্রধান সিভি) | `js/layout-engine/en-cv-layout.js` | `wants`, `parse`, `_head`, `_takeFooter`, `renderDocx/Rtf/Html` |
| ইংরেজি সিভি (তালা ছাড়া), সনদ, দলিল, রুটিন, বেতন, প্রবেশপত্র (পুরোনো) | `js/engines/*-engine.js` | `CVEngine`, `CertificateEngine`, `StampEngine`, `RoutineEngine`, `SalarySlipEngine`, `AdmitCardEngine` |

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
| হুবহু-লেআউট (ক্যাপচার → IR → docx) | `js/layout-engine/faithful/*` | `FayzarFaithful` (`splitFromNeighbor`), `FayzarLayoutIR`, `FayzarPageGeometry` (`detectFrame`), `FayzarFaithfulDocx`; লাইন-আঁটানো (পূরণ-সারি → ইনডেন্ট → ফন্ট) `line-fit.js` `FayzarLineFit` |
| হুবহু: ফরম-ছক/সংখ্যা-বাক্স, পাতা-সেটআপ, কোলন-সারি, কালো ব্যান্ড | `layout-ir.js` `foldBoxRows`, `unifyMargins`, `alignTabStops`, `snapFonts`; `page-geometry.js` `darkBandMask`; builder `boxRowXml` | স্কোর: `qa/golden/asis-score.mjs` (২০ ফরম), `faithful-score.mjs` (১৫ সোনালি) |
| হুবহু দ্রুত-চক্র: ভুলের-ধরন রিপোর্ট / সুইচ A/B / আলাদা-ফোল্ডার রান | `qa/golden/asis-report.mjs [--tag X]`, `asis-ab.mjs --on SW [--base SW] [--ids]`, `asis-score.mjs --tag X [--force] [--measure]` (runs/X; docx-ছাপ এক হলে Word বাদ, `docxFingerprint`; এক Word: `word-pdf-batch.ps1`; এক ব্রাউজার: `faithful-e2e.mjs --jobs`) | fixture বদলায় না |

### সাইট/UI
| কাজ | ফাইল | ফাংশন / নাম |
|---|---|---|
| হোম/ওয়ার্কস্পেস/ফলাফল পাতা | `index.html` + `js/home-app.js` | — |
| সার্ভিস ও টুলস পাতা | `services.html` + `js/tools-app.js` | — |
| হেডার/ফুটার (এক উৎস) | `scripts/fz-shell.mjs`, `js/fayzar-nav.js`, `css/fayzar-theme.css` | FZ-NAV/FZ-FOOT মার্কার |
| সেশন-ক্যাশ, ইতিহাস | `js/session-store.js` | `FayzarSession` |
| "আমার টেমপ্লেট" UI (নমুনা → ছাঁচ মডাল, স্থির/বদলাবে প্রিভিউ, কার্ড, রপ্তানি/আমদানি, কনভার্টে ব্যবহার) — T3d | `js/my-template-ui.js` (+ `home-app.js` `MT()` রাউটিং: mount, convert-এ `composeFromText`, persist/restore; `index.html` `#myTplBox`; css `mt-*`) | `FayzarMyTemplateUI` (`mount`, `createFromQueue`, `preview`, `composeFromText`, `warnings`); QA `qa/t3-ui-e2e.mjs [--live]` |
| T3 গ্রহণযোগ্যতা-স্কোর (৫টি নমুনা+খসড়া জোড়া: পাতা/লেবেল/রিকল/ফাঁস) — T3e | `qa/t3-score.mjs [--live]` (+ `qa/t3-pages.ps1` Word COM পাতা-গোনা; খসড়া `tests/fixtures/t3/`; আউটপুট `qa/golden-data/t3/`) | `capToMd`, `PAIRS` |
| "আমার টেমপ্লেট" ভান্ডার (IndexedDB `fayzar-templates`, রপ্তানি/আমদানি `.fayzar-template`) — T3a | `js/template-store.js` | `FayzarTemplateStore` (`list/get/save/rename/remove/exportFile/exportBlob/importFile`, `create(backend)`) |
| ডায়াগনস্টিক / "সমস্যা জানান" | `js/diag-log.js` | `FayzarDiag` |
| হুবহু-মোড UI | `js/faithful-mode-ui.js` | `FayzarFaithfulUI` |
| স্টুডিও (এডিটর) | `studio.html` + `js/studio-controller.js` | `StudioEditBridge`, `StudioFigurePipeline` |
| ছবি প্রস্তুতি (পর্ব ১গ, ৫ ও AUTOPREP: স্বয়ংক্রিয় ঘোরানো, ভাগ, ৪ কোণা টানা/স্বয়ংক্রিয়, Homography, আলো সমান, ঝাপসা-চেনা) | `js/image-tools.js`, `js/image-prep/homography.js`, `js/image-prep/light-blur.js`, `js/image-prep/corners.js`, `js/image-prep/auto-prep.js` (+ `home-app.js` UI) | `FayzarImageTools`, `FayzarHomography`, `FayzarLightBlur`, `FayzarCorners`, `FayzarAutoPrep`; টেস্ট `tests/image-prep.test.mjs`, `tests/image-tools.test.mjs`, `tests/auto-prep.test.mjs`; QA `qa/auto-prep-real.mjs`, `qa/image-tools-e2e.mjs` |
| পুরোনো OCR পাতা (লিংকহীন) | `ocr-classic.html` + `js/main.js` | — |

## ৩. টেস্ট ও যাচাই
| কাজ | কোথায় |
|---|---|
| পুরো সেট (শুধু শেষে) | `node tests/run-all.mjs` (রিগ্রেশন snapshot: `node tests/run-regression.js [--update]`, ফিক্সচার `tests/fixtures/*.input.md`) |
| শ্রেণিবিভাগ-স্কোর (C2/C3; doc_type মিল %, baseline-এর নিচে নামলে ব্যর্থ; FZ_ON=CLSFIX পরীক্ষামূলক নিয়ম) | `node tests/classify-score.test.mjs` (প্রত্যাশা `tests/fixtures/classify-expected.json`); লেআউট-রেজিস্ট্রি নকশা `docs/LAYOUT_REGISTRY.md` |
| একটি টেস্ট | `node --test --test-reporter=tap tests/<নাম>` |
| সাইটের আসল ডাউনলোড-শিকল | `$env:FMTS='bijoy_docx,doc,unicode_docx'; node qa/site-chain-download.mjs <outDir> <fixture.md>[;cols]` |
| Word COM মাপ | `tools/dump-doc.ps1`, `tools/cv-tabs.ps1`, `tools/pdf-pages.ps1` |
| কর্মপরিকল্পনা (একমাত্র সক্রিয়, ২০২৬-১০-২৩) | `docs/FINAL_WORK_PLAN.md` (পুরোনো `WORK_PLAN.md` বাতিল) |
| স্বয়ংক্রিয় মোডের ব্যাচ (ছবি/PDF → আসল Gemini OCR → .docx/.doc) | `node qa/auto-batch-e2e.mjs <inDir> <outDir> [formats]` (২–৪টি ফাইল; রেন্ডার `qa/golden/word-pdf-batch.ps1` → `qa/render-pdf-page.mjs`) |
| ব্যবহারকারীর স্থায়ী অপারেশনাল নির্দেশনা ও ব্রিফিং | `docs/USER_OPERATIONAL_DIRECTIVES.md` |
| ৩-পিসি Gemini ব্রিজ হাব (কাজের সারি, Firebase-এর বদলে) | `fayzar-bridge-hub/index.js` (Worker+DO), `tools/bridge_task.mjs`, `docs/BRIDGE_HUB_PLAN.md`; চুক্তি `scratch/bundles/BRIDGE_APP_v1_PROMPT.md` §4 |
| মাল্টি-এজেন্ট ম্যানেজমেন্ট ও অ্যাসিস্ট্যান্ট ট্র্যাকার | `docs/MULTI_AGENT_MANAGEMENT.md`, `gemini-bridge-extension/`, `tools/agent_manager.mjs` |
| হুবহু-মোডের সোনালি সেট ও স্কোর (WORK_PLAN A) | `qa/golden/` — `build-golden.ps1` → `finalize-golden.mjs` → `faithful-score.mjs [--ids] [--capture] [--save-baseline]`; PDF-মাত্র নমুনা: `image-score.mjs` (একটি), `asis-score.mjs [--ids] [--capture] [--save-baseline]` (ব্যাচ, তালিকা `qa/golden-data/asis/manifest.json`); **লেআউট-স্কোর (মূল লক্ষ্য)** `layout-score.mjs` (পরিষ্কার স্ক্যান, লাইন-অবস্থান/বিস্তার/উচ্চতা/দাগ/কালি), Word ছাড়া পুনর্মাপ `asis-layout.mjs [--ids] [--save-baseline]`, লাইন-সরণ নির্ণয় `line-drift.mjs <id>`; ডেটা লোকাল `qa/golden-data/` (ব্যক্তিগত, পুশ নয়) |
| প্রক্সি অবস্থা/লগ | `qa/proxy-status.mjs`, `qa/proxy-log.mjs` |
| ব্রাউজার E2E-র playwright | `scratch/test_env` (মুছবে না) |
| গিটহাবে পুশ (অনুমতিতে) | `node scratch/github_sync.js --dry` / `--push "<msg>"` |

## ৪. ফোল্ডার
`js/` কোড · `js/layout-engine/` লেআউট মডিউল (নতুন যুক্তি এখানে) · `js/engines/` পুরোনো/চালু ইঞ্জিন · `js/vendor/` বাইরের লাইব্রেরি (পড়বে না) · `tests/` টেস্ট+ফিক্সচার+baseline · `qa/` যাচাই-স্ক্রিপ্ট · `tools/` Word COM + `gen-map.mjs` · `fayzar-ocr-proxy/` Worker · `docs/` নথি (HANDOFF, AI_MEMORY, MASTER_PLAN, LAYOUT_SPECIFICATION, CODE_INDEX) · `fonts/`, `webfonts/`, `css/`, `assets/` স্থানীয় সম্পদ · `proof/` টেস্টের নমুনা-আউটপুট।
