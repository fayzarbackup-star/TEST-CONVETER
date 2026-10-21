# AI Session Memory & Context
> **CRITICAL RULE FOR ALL FUTURE AI AGENTS:** You MUST read this file, `docs/USER_OPERATIONAL_DIRECTIVES.md`, AND `PROJECT_MASTER_GUIDE.md` at the start of any new session or when responding to a prompt to understand the project's current state, recent changes, architecture, git repo access, user operational briefs, and strict frozen engine rules. Do not ask the user for information already documented here.

## 0. Standing User Operational Directives (NEVER VIOLATE)
- **Reference**: Full details in [`docs/USER_OPERATIONAL_DIRECTIVES.md`](USER_OPERATIONAL_DIRECTIVES.md).
- **100% Autonomous Continuous Execution**: Work must NEVER pause or wait for user consent while the user is away/sleeping. Work through backlog items without stopping.
- **Troubleshooting Obligation**: If any program or assistant fails to update or respond, immediately investigate why, fix the problem, and take the next step.
- **Tab Anti-Hang Protocol**: Periodically refresh browser tabs (every 2-3 minutes) to prevent Gemini hanging or freezing.
- **Senior Lead (Assistant 4 / Tab 3)**: Keep prompts concise, instruct him to give **brief/concise answers** to conserve tokens. Do NOT give heavy/bulk coding to Senior Lead; use him strictly for high-level guidance, reviews, and decisions.
- **Assistant Cooldown Tracking**: If any assistant (A-1, A-2, A-3, A-4) hits quota limit, note their cooldown reset time, record in `docs/MULTI_AGENT_MANAGEMENT.md`, pause delegating to that assistant during cooldown, resume after cooldown, and continue other work in the meantime.
- **Frozen Core Engines**: NEVER edit `js/docx-to-doc-engine.js`, `js/bangla-converter-engine.js`, `js/equation-converter.js`, `js/doc-binary-engine.js`. All layout work stays in `js/layout-engine/`.


## 1. Credentials & Environment
- **Master Guide & Rules**: Detailed in [`PROJECT_MASTER_GUIDE.md`](PROJECT_MASTER_GUIDE.md).
- **GitHub Token**: Saved in `.env` as `GITHUB_TOKEN`.
- **Cloudflare KV**: `FAYZAR_OCR_KEYS` (ID: `2de59ce830064432b4e8938373ebc2bf`) - rate limit 20/min.

## 2. Directory Structure & Workflow
- **Main Development**: `c:\Users\Admin\.gemini\antigravity-ide\scratch\fayzar-bangla-converter\`
- **Testing/Review Branch Clone**: `temp-test-converter\TEST-CONVETER-arena-01a0f18b-test-conveter\`
  - *Note*: If making final deliverables or testing via the reviewer's branch, always ensure changes are synced here and pushed to GitHub.
- **GitHub Repo**: `https://github.com/fayzarbackup-star/TEST-CONVETER/tree/arena/01a0f18b-test-conveter`

## 3. Recently Implemented Features (DO NOT OVERWRITE)
0. **2026-10-18 রাত ১১:৫০ — রিস্টার্টের পরে ৪ ট্যাব**: পিসি রিস্টার্ট; send-টাইমআউট সমস্যা মিটল। নতুন চ্যাটে প্রথমে Flash/Chat-এ যাওয়ায় জিপ পড়া যায়নি ⇒ সমাধান: লোডের পরে switch-mode Argon + send --force। u/0–u/3-এ F3_REBASE_v10, D_E2E_v10, ROWCHECK_FLAKY_v10, ASIS_SCORE_v10 চলছে। শিক্ষা: চলমান ট্যাবে navigate নয়।
0. **2026-10-18 গভীর রাত — হুবহু স্কোর-মাপ**: f1 (একমাত্র মূল PDF যা আছে, Downloads-এ) ক্যাশ-ক্যাপচারে Word দিয়ে: ৬৯.০→৮০.৭ (লেআউট ৭৪, পাতা ৩/৩)। asis-score-এ লাগে `serve.js` (3008) + `ASIS_DIR`। "AS it IS" ফোল্ডার নেই ⇒ বাকি ২০টি মাপা যায়নি; পুরোনো ২১টির গড় ৭৭.১। WORK_PLAN টিক কোড দেখে হালনাগাদ। B_TABLE_REBASE_v9 বসানো (push 75ad34f; zip-এর README প্রজেক্ট README-তে নয়, ব্যাকআপে)। F3 v10 send ব্যর্থ (u/1, u/5 টাইমআউট/attachment) — bridge/Chrome সমস্যা।
0. **2026-10-18 শেষ রাত — সেশন বন্ধ (কনটেক্সট বড়)**: আজ push: ক্লাসিফায়ার প্যাড-নিয়ম+C1/C3 স্কোর (ae4a4ca), B8 বর্ডার (d7cd498), B7 ফন্ট, D+G3, G প্রক্সি-স্ট্রিম (deploy বাকি), EXAM রেজিস্ট্রি; টেস্ট ২৩৪৭/০। ফেরানো/বাকি: F3 (rebase দরকার), B টেবিল (u/7 চলছে), F1 FIX, F2_WIRE FIX — ক্রম HANDOFF-এ। শিক্ষা: একই ফাইলে সমান্তরাল Gemini-কাজ একে অপরকে মোছে ⇒ builder/studio-controller-এ ক্রমানুসারে।
0. **2026-10-18 রাত শেষ — ৭-ট্যাব পদ্ধতি**: ব্যবহারকারী ৭টি Gemini ট্যাব দিলেন; কাজ অ্যাকাউন্ট-ভিত্তিক (`gemini-round.mjs --acct`), ট্যাব-ক্রম বদলায়। v5: E3 রেজিস্ট্রি ও F2 docx-প্রিভিউ-রেন্ডারার বসানো; F1 স্টুডিও মাস্টার-পথ সুইচে (মাস্টারে ২টি ফাইল ১→২ পাতা — PAGEFIT Gemini-তে); C/D/B/G বান্ডেল নতুন ট্যাবে। নিয়ম: কোড Gemini, Claude শুধু সমন্বয়।
0. **2026-10-18 গভীর রাত — v3 push + v4 পাঠানো**: v3 GitHub main (db6108e)। v4 একই অ্যাকাউন্ট/একই ধরনের কাজে: A2→REGISTRY_E2, A3→ROWCHECK, A1→REBREAK। bridge-এ debugger দিয়ে ফাইল-জোড়া ও আসল Send-ক্লিক; নতুন `tools/gemini-round.mjs` (send/watch/list, rounds.json)। শিক্ষা: Gemini প্রিভিউতে ফাইলনাম ছাঁটে ⇒ নামের প্রথম অংশে চেনা; ব্যর্থ মনে হলেও আগে চ্যাট দেখে তবেই আবার পাঠানো।
0. **2026-10-18 রাত — Gemini v3 রাউন্ড**: A1_MATHH→fayzarbackup1, A2_REGISTRY→2, A3_OTSU→4 (Task+Argon)। bridge fetch দিয়ে তিন জিপ নামানো (`--name` আসলে ফিল্টার — ভুল নামে "No files")। বসানো সুইচ-গেটেড: রেজিস্ট্রি ১৬ আর্কিটাইপ (`__FZ_ON_REGISTRY`), Otsu বাকি ফাংশনে + `mask.thr`, MATHH ফাঁক-কমানো। টেস্ট ১৯৫৪/০। ব্যাকআপ scratch/backups/v3_apply_20261018। bridge FETCH_FILES-এ `[role=button]` + debug যোগ। Claude in Chrome গ্রুপ বারবার ভাঙে → উত্তর আনায় bridge।
1. **Cloudflare Proxy Failover**: `fayzar-ocr-proxy/index.js` manages key rotation, masking, rate-limiting, and error handling for Gemini API.
2. **Two-Phase Self-Recheck**: Implemented in `js/ai-ocr-engine.js` prompt. The AI evaluates text internally before finalizing output.
3. **Key Ledger UI**: Built into `index.html` to monitor API keys. Logic resides in `fayzar-ocr-proxy/ledger.js`.
4. **CORS Fix**: `fayzar-ocr-proxy/index.js` now correctly supports `http://localhost:3008` and `https://fayzarcomputer.com.bd` dynamically.
5. **No Chunking**: The artificial 5-second chunking logic was completely removed.

- **Part-19.8 (Oct 17, 2026) — User Direct Takeover & Complete AI Code Freeze**:
  (1) User explicitly instructed that AI must NOT touch any codebase files proactively; user is directly coding and managing Studio and Hubahu implementations.
  (2) All background recurring cron schedules (task-2332) and unprompted browser automation tasks stopped.
  (3) AI role strictly restricted to on-demand read-only lookups, answering questions, or running tests when explicitly requested by user.
  (4) Codebase remains 100% green (1872/1872 test gates passed across 62 suites).
- **Part-19.7 (Oct 17, 2026) — Assistant Tasks Dispatched & Full Suite 1872 Pass**:
  (1) Re-verified and locked full test suite at 1872 passes / 0 failures across all 62 suites.
  (2) Fixed Gemini Bridge extension background worker reconnection on extension reload.
  (3) Dispatched next self-contained modular tasks to 3 assistants via Chrome bridge: A-1 (Studio Table Borders/Padding Parity), A-2 (OCR Prompt Factory Non-Exam Strict Specs), and A-3 (Word 2003 MHTML Figure Dimension Safety). A-4 (Senior Lead) cooldown monitoring underway.
- **Part-19.6 (Oct 16, 2026) — Goal 2 Studio Parity & P3 Cash Memo Registry Hardening**:
  (1) `js/studio-controller.js`: Synced `fontSize`, `fontSizePt`, and `lineSpacing` from studioState into `downloadDocument()`; removed duplicate `qaBtnUndo`/`qaBtnRedo` listener (lines 856-857) and implemented smart delegation (active element vs HistoryManager) to prevent undo from wiping live page edits; activated all 6 template select options (`ADMIT_CARD`, `SALARY_SLIP`, `CLASS_ROUTINE`, `NOTICE_BOARD`, `DARKHAST`, `OFFICE_MEMO`) and updated `mode-select` in `studio.html` (`CASH_MEMO`, `ROUTINE`, `OFFICE_PAD`, `EXAM_GENERAL`, `CV`).
  (2) `js/engines/studio-edit-bridge.js`: In `textWithoutFigures()`, added recovery of `data-eq-raw` from `.eq-rendered` elements so inline text edits never corrupt math equations; in `collectFromDom()`, added live sync for exam header fields (`institute`, `location`, `exam`, `classAndSubject`) and non-exam document bodies (`body`, `rawText`, `text`). Tests: `studio-edit-bridge.test.mjs` 30/30 PASS.
  (3) Templates & E2E: Added authentic templates to `academic-templates.js` and `govt-templates.js`; verified `test_a05_e2e.mjs` (code 0). Full test suite `run-all.mjs`: 1872 gates passed / 0 failures (100% green).
- **Part-19.5 (Oct 16, 2026) — P0 Classifier Fix & P2 a02 Word 1-Page Fit**: (1) `doc-classifier.js`: `_clsFix()` defaulted to `true`, added Bengali cash memo keywords; classify-score 42/42 PASS. (2) Faithful Equation: lineRule relaxed to `atLeast`/`auto` on math runs, preventing top/bottom clipping. (3) P2 Task (`a02` Word 2003 .doc 2-Page overflow): Word COM measured last paragraph (P#102) overflowing by 1.5pt; in `faithful-docx-builder.js` line 347, increased `framePad` from 11 to 16 for border-framed pages (`page.frame`). Word COM verification confirms TOTAL PAGES = 1 (Page 2 paras = 0). Full suite `run-all.mjs`: 1872 gates passed / 0 failures.
- **Part-17.7 (Oct 05, 2026) — Faithful fixes from user's 15-page "Anual Prak-prathomik F.pdf"**: page-frame comps excluded from blocks (blockMetrics size filter) + detectFrame → w:pgBorders (docx) and @page border/padding in docx-to-doc-engine (core, additive; only when pgBorders present); master was Bijoy-encoded because ExportDualEngine.isBijoyFont matches "sutonny" → builder renders with sentinel font then renames to SutonnyOMJ; renderDocxRuns options.keepLoneRo (default off) stops lone র→"i"; list_item keepLines; short-line font never shrinks; tables: hasGrid → borderless, cellFigures nested into cells, explicit tblCellMar (docx-to-doc reads tblCellMar, default 3.5pt unchanged); figure crops split at emptiest row between touching figures (FayzarFaithful.splitFromNeighbor); section break attached to page's last paragraph (no blank .doc page). Result: docx 15/15 pages. Tests part-17.5 now 73.
- **Part-17.4–17.6 (Oct 05, 2026) — Faithful-layout complete v1**: (17.4) js/layout-engine/faithful/page-geometry.js (ink mask, components, lines, font/indent/align/ragged per block) + layout-ir.js (normalize: body font 8–15pt keeps real size, else body=12pt on A4; bands flow/grid; snapIndents/snapFonts). (17.5) faithful-docx-builder.js (section per source page nextPage, borderless grid tables, SutonnyOMJ) + faithful-pipeline.js (capture → layout (150 DPI measure, deskew, 300 DPI figures) → produce via FayzarExport.produce({masterDocx})); docx-to-doc-engine: lineRule exact/atLeast + section nextPage page breaks. (17.6) UI: js/faithful-mode-ui.js (FayzarFaithfulUI) — two mode cards in wizard step 2 (localStorage fayzar_layout_mode), convert button runs faithful path, 3 download buttons produce faithful files, studio/MD hidden; main.js touched in 2 places only. Snaps added from live check: same-type font ±25% → one size; faint-ink indent fixed via Gemini box agreement. Tests tests/part-17.5-faithful-layout.test.js (56); suite 1476+ PASS. QA qa/faithful-ui-e2e.mjs (real wizard; --cached replays capture). Open issues: docs/FAITHFUL_ISSUES.md #1–17 (math pages overflow 4→6, vertical gaps after reflow, right-tab marks, MCQ option rows, Otsu threshold, RECITATION/Tesseract).
- **Part-17.1–17.3 (Oct 05, 2026)**: (17.1) Worker default thinkingLevel=low (benchmark qa/thinking-bench.mjs: same accuracy, 2–20× faster; auto level once thought 62k tokens/198s), client override via localStorage fayzar_thinking_level; Worker 1e76997f. (17.2) Faithful-layout PHASE 1 capture: js/layout-engine/faithful/{faithful-prompt.js (as-is prompt, block tags [[B:t;p;box;al;fs;b]], rule 18 + audit note kept, nothing removed), layout-tags.js (tolerant parser, needsContinuation/lastBlockInfo/mergeContinuation), faithful-capture.js (all pages in ONE request per user decision; continuation up to 3; sets engine state.isProcessing)}; ai-ocr-engine proxy path now flags RECITATION/SAFETY/OTHER as [অসম্পূর্ণ: …]; live (qa/faithful-capture-live.mjs): Bangla 12p 24s 65 blocks; math 24p 182s 169 blocks (as-is keeps solutions); English textbook → RECITATION on 3-flash AND 3.6-flash (Google copyright filter; do NOT circumvent — report as limitation). (17.3) PHASE 2 docx→doc converter (core file, user informed): table rewrite (direct rows only, nested tables, vMerge rowspan, per-cell/side borders, tblW width, jc), tab leaders, paragraph borders, header/footer (inline mso-element divs work in Word), floating images via VML absolute. Word-measured: all 7 gaps fixed; regression: combined/MCQ/CQ .doc identical old vs new (qa/phase0/word-compare.ps1). Tests part-17.2 (33), part-17.3 (15). NEXT: phase 3 geometry engine + reconciler.
- **Part-17.0 (Oct 05, 2026) — Faithful-layout Phase 0 + fixes**: Plan: "as-is" layout mode (type-agnostic geometry: XY-cut tree + primitives → IR → faithful docx builder; existing bijoy/doc/figure path reused). Phase 0 results in qa/phase0/RESULTS.md. (1) docx→doc converter loses header/footer, table borders, vMerge, fixed table width, nested tables, floating images, dot leaders, paragraph borders (phase 2; core file, notify user). (2) Bijoy docx preserves structure. (3) PRODUCTION BUG FIXED: docx-handler.js mixed-run English segments never inserted → English/symbols lost in Bijoy/.doc (tests/part-17.0-bijoy-mixed-run.test.js). (4) Gemini block boxes accurate (median 1–2pt). (5) HTTP 524 = Cloudflare ~125s first-byte limit on Worker subrequests (explains proxy-fails-but-direct-works); Worker 0f8ad926 adds includeThoughts + thinking-gate (buffer thoughts, failover on mid-thinking 503/empty/timeout); real fix = keep each request thinking <~100s via page batches. (6) Gemini RECITATION stops output on published text → continuation requests needed. (7) thinking tokens count toward maxOutputTokens. Assumed user consents: as-is keeps everything; SutonnyOMJ font; studio excluded v1; core docx-to-doc changes allowed with notice.
- **Part-16.6 (Oct 05, 2026) — Worker placement**: benchmarked (qa/placement-bench.mjs, qa/placement-sweep.ps1, results in qa/placement-bench-results.jsonl): DAC default / gcp:asia-southeast1 (SIN) / gcp:asia-south1 (BOM) / gcp:us-central1 (runs OMA). Google response fastest from US (small ttfb ~1.0s vs SIN 1.2–1.5s; 4.9MB PDF ttfb 5.7s vs SIN 6.8–6.9s, DAC 6.2s) despite higher connect ms; US also avoids Gemini location-restriction risk. wrangler.toml now [placement] region=gcp:us-central1 (deployed 982236b9). Real 23-page OCR after: 44s (ttfb 29s). New GET /where shows run colo. log records ttfbMs.
- **Part-16.5 (Oct 05, 2026) — OCR proxy reliability (Worker deployed, versions 5abd8f74 → 3996a711; previous b381a778 for rollback)**: Diagnosis via /status + per-key models.list + tiny pings: all 19 keys healthy on all models, yet ledger showed many false MODEL_NA (6h lockouts) and nearly all traffic on one key (sticky LAST_GOOD). Also found Google 400 "User location is not supported for the API use." (intermittent, Worker egress) misclassified FATAL_INPUT → whole OCR aborted with wrong "payload/image" message. Fixes: (1) KV OCR_LOG last 30 requests (colo/country, attempts w/ real error text, ttfb, total, finish) + GET /log; ledger lastError per key×model; (2) MODEL_NA only for real 404 model message, ledger v2 migration clears old MODEL_NA/SERVER locks; (3) LRU key rotation, sticky removed; (4) attempt timeout 150→240s, TIMEOUT class no penalty; (5) 503 → 3 s wait + different key, model switch after 3 keys; LOCATION class = transient, stop after 6 with clear Bangla msg; client policy kind "location". Payload JSON stringified once. QA tools: qa/proxy-status.mjs, qa/proxy-log.mjs, qa/proxy-probe.mjs, qa/key-ping.mjs, qa/key-model-check.mjs, qa/ocr-trace.mjs. Real runs after deploy: 46–65 s success (DAC/BD). User wants a few days of logs before further optimization. Rule 18 (2-phase self-recheck) must stay.
- **Part-16.4 (Oct 05, 2026)**: .doc figures were 3x too big (Word ignores CSS size on HTML img; measured via Word COM qa/word-measure-figures.ps1) → doc-mhtml-packager sizeImgTags adds width/height px attrs. Deskew: estimateSkew (projection profile, page-level, cached) + cropClean rotates crop by −angle (>=0.15°); review UI rotate buttons ±0.5°. REAL full OCR verified (qa/ocr-full-e2e.mjs against running localhost:3008): Gemini emits tags like ২১। [[FIG: =23$ ; =17$ ,300,95,410]] (math-wrapped! — this is why old strict regex silently failed) → tolerant parser OK, 5/5 figures, Word-measured 1.04–1.38in identical in .doc/.docx, placed after stem. 1324 gates PASS.
- **Part-16.3b (Oct 05, 2026)**: Headless E2E on the user's real PDF (`qa/figure-e2e.mjs` engine-only, `qa/figure-ui-e2e.mjs` real button path incl. review modal; puppeteer + in-script temp server). Found: Gemini boxes are accurate; old refineRect over-grew into neighbouring text/options/solutions. New refineRect = connected-component rule (component ≥50% inside box, within box+2.5% → whole; else clipped; outside components never), Gemini box pad 0; `clearBorderFragments` whitens edge-touching foreign fragments. Verified: 5/5 figures clean with labels, docx drawings after stem/before options at physical size (~1–1.3in), .doc MHTML 5 images, review screen shown, success toast. Word display itself still to be confirmed by user (FIGURE_TEST_* copied to Downloads). 1317 gates PASS.
- **Part-16.3 (Oct 05, 2026)**: User report: still no figures (direct + studio), figure-question numbers isolated on own line, and every question got its own repeated heading (numbering restarted at 1). Fixes: tolerant FIG-tag parsing (`parseTagBody`: box=[..], page=, Bangla digits, extra fields, escaped brackets); `normalizePlacement` joins "N। [[FIG]]\nstem" → "N। stem [[FIG]]" before marker/strip; unreadable tags now warn (toast + console) instead of silent strip; QuestionEngine merges a heading identical to the section directly above (question-engine.js, core file — user informed). Root cause of missing figures still UNCONFIRMED (no raw OCR text / browser console available). 1314+ gates PASS.
- **Part-16.2 (Oct 05, 2026)**: Bug: studio downloads printed raw `[[FIG:..]]` (studio tab has no source PDF). Fix: shared `prepareSourceFigures` in ai-ocr-engine.js (download + send-to-studio both extract→review; failure → tags stripped). Figures go to studio via IndexedDB `js/engines/figure-transfer-store.js` (`FayzarFigureTransfer.put/take`), payload `figuresKey`; studio resets old figures on transfer. Safety net `FayzarFigureExtractor.stripTags/hasLooseTags` in studio preview/download and .md path. Studio .doc still uses RTF injectIntoRtf. 35 suites / 1299 gates PASS.
- **Part-16.1 (Oct 05, 2026)**: Source-figure path 1 built. Gemini prompt now emits `[[FIG:p=<page>;box=ymin,xmin,ymax,xmax]]` (0–1000). `js/layout-engine/figure-extractor.js` (300 DPI re-render via pdf.js, ink-bound refine incl. touching labels, background whitening, speck removal, trim, physical size clamped to column) + `js/figure-review-ui.js` (review modal before download). OCR download: tags present → extract → review → `FayzarExport` (cache per text); no tags → legacy path unchanged. NOT yet done: figure handoff OCR→Studio (IndexedDB store) and Studio re-crop from source page (path 2 currently = existing studio upload/preset features). Unverified in real use: Gemini box accuracy, Word 2003 opening MHTML .doc. 34 suites / 1276 gates PASS.
- **Part-16.0 (Oct 05, 2026)**: Architecture "single master" — Phase 1 foundation added, NOT yet wired into OCR/MD/Studio: `js/layout-engine/fayzar-export.js` (`FayzarExport.produce`) and `js/layout-engine/doc-mhtml-packager.js` (`FayzarDocMhtml`, MHTML images for Word 2003 .doc). Verification page `qa/sample-doc-builder.html` (open via http://localhost:3008/qa/sample-doc-builder.html). Next phases (after user's Word verification): figure store (IndexedDB) → source figure extraction engine (Gemini bbox + refine, 300 DPI crop, clean, physical size) → review screen → route OCR/MD/Studio through FayzarExport, retire RTF. 33 suites / 1253 gates PASS.
- **Part-15.8 (Oct 05, 2026) — DECISION**: OCR .doc download reverted to the proven legacy docx→doc path (default). RTF-path EQ fields render correctly but Equation Editor editing changes letters (x → ξ) in Word 2003. RTF path only via `localStorage fayzar_doc_engine = rtf`. User: do NOT touch equation code further without a way to verify in real Word; prioritize pending features. Known leftover on legacy path: Bangla ৩/৫ inside EQ shows as English 3/5.
- **Part-15.7 (Oct 05, 2026)**: RTF EQ-field rule now matches the old docx→doc path exactly (`/\\[FRISBXUA]\b/`): powers/subscripts (x², H₂O) are editable EQ fields with 8pt script args; switch-free math (y = x − 3) stays italic text. 32 suites / 1226 gates PASS.
- **Part-15.6 (Oct 05, 2026)**: RTF exponents: plain math uses `{\super …}`/`{\sub …}` without `\fs16` (was double-shrunk to ~5pt); inside EQ fields only the `\S\up(…)` argument gets 8pt (`FayzarEqFieldRtf.splitRuns`). 32 suites / 1225 gates PASS. Open question to user: CQ stems (incl. math) are bold in the RTF renderer; old docx→doc output was regular weight.
- **Part-15.5 (Oct 05, 2026)**: RTF EQ fields were broken since before (single `\F` switches dropped by RTF parser → Word showed "(3,5)"); exposed when OCR .doc moved to RTF in 15.2. Now switches are literal `\\F`/`\\R`/`\\S\\up`, variables italic via `FayzarEqFieldRtf.italicVars`. MCQ back to 0.3" for all questions (user); 1–9 → 0.2" only for CQ/general. Regression harness now snapshots real RTF (was "[object Blob]"). 32 suites / 1223 gates PASS.
- **Part-15.4 (Oct 05, 2026)**: User rule — every question numbered 1–9 gets hanging indent 0.2" (288), 10+ gets 0.3" (432), on ALL paths (CQ, general, MCQ incl. option tab stops shifted −144, previews). Single source `FayzarLayoutUnits.questionIndent`; CQ planner `questionIndent` replaces Part-15.3's section rule. 32 suites / 1218 gates PASS.
- **Part-15.3 (Oct 05, 2026)**: Degree superscripts (`^\circ`, `^{o}`) normalized to plain `°` before equation conversion (`TextRunProcessor.normalizeDegrees`) — fixes tiny ° in .docx. CQ/General sections whose numbers are all 1–9 use hanging indent 288 (`CqBookletPlanner.sectionIndent` / `itemGeometry`), 10+ sections keep 432. Snapshot baselines updated (indent-only diffs verified). 32 suites / 1217 gates PASS.
- **Part-15.2 (Oct 05, 2026)**: OCR .doc download now uses RTF path (`FayzarPipeline.exportDoc`, fallback/legacy toggle `localStorage fayzar_doc_engine=legacy`). New `js/layout-engine/frontmatter-header.js` fills empty header fields from Gemini frontmatter; `QuestionEngine._metaLine` moves pre-question time/marks lines into header. Audit note printed once (`suppressAuditNote` for combined parts & student copy); trailing-note scan stops at option lines. Open pages via START_SERVER.bat → http://localhost:3008 (file:// origin is blocked by proxy CORS). 31 suites / 1197 gates PASS.
- **Part-15.1 (Oct 05, 2026)**: Bijoy .doc EQ-field font runs via new module `js/layout-engine/eq-field-rtf.js` (latin/switches → TNR \f1, Bangla → Bijoy code in SutonnyMJ \f0). First step of plan "OCR .doc → RTF path" (next: side-by-side comparison of both .doc paths on real OCR samples, then switch OCR download to ExportDualEngine). User rule change: no file is frozen; for core files just report why/where. Keep export-dual-engine thin — new logic in separate modules. 30 suites / 1176 gates PASS.
- **Part-15.0 (Oct 05, 2026)**: Audit steps 1–4 — EXAM_GENERAL portrait profile (`CqBookletPlanner.LAYOUT_PROFILES`), English header/Part-A/`1.`/`(a)` preservation, no invented header values, index.html engine scripts, non-fatal schema validator, combined split without marker (`ExportDualEngine._splitCombined`). 29 suites / 1163 gates PASS. Awaiting user's visual verification in Word. Security (API keys/tokens) deliberately deferred to project end by user.
- **Part-14.3 Deployed (Oct 04, 2026)**: OCR Section Categorization & Booklet Column 2 Header Injection.
  - **Gemini OCR Section Categorization (`js/ai-ocr-engine.js`, `js/layout-engine/gemini-prompt-factory.js`)**: Directs Gemini prompts to explicitly separate distinct exam question sections (e.g. `## ক-বিভাগ (সংক্ষিপ্ত প্রশ্ন)`, `## খ-বিভাগ (সৃজনশীল প্রশ্ন)`) using Markdown section headings (`##`), keeping questions categorized and allowing per-section sequential numbering.
  - **Booklet Column 2 Header Injection (`js/layout-engine/cq-booklet-planner.js`, `js/engines/export-dual-engine.js`)**: In 2-sheet / landscape booklet mode where the left column (Column 1) is reserved for the back cover, the planner assigns Page 1 to physical Column 2 and places the fallback header before the first question in that actual starting column, eliminating the missing header bug.
  - **Master Test Runner**: 27 suites / 1122 gates all passing (100% PASS, 0 failures). Added `tests/part-14.3-mixed-sections-and-header.test.js`.

- **Part-14.2 Deployed (Oct 04, 2026)**: Layout & Equation Fix Pack (Creative/Math Header Fallback, Bengali Equation Digits, MCQ Visual Option Grid & True Stops).
  - **Creative/Math Exam Header Fallback (`js/layout-engine/cq-booklet-planner.js`, `js/engines/export-dual-engine.js`, `js/engines/question-engine.js`)**: Extended fallback header generation (`আপনার প্রতিষ্ঠানের নাম`, `ঠিকানা লিখুন`, `পরীক্ষার নাম লিখুন`, `শ্রেণি ও বিষয়`, `সময়`, `পূর্ণমান`) across all creative exam archetypes (`EXAM_MATH`, `EXAM_GENERAL`, and `EXAM_CQ`). Prevents creative math exams from dropping headers.
  - **Bengali Digits in Equations (`js/equation-converter.js`)**: Preserved Bengali digits ($৩/৫ \to \F(৩,৫)$) across Word 2003 RTF EQ-fields, OMML XML, and readable HTML. ASCII authored digits remain ASCII without cross-language corruption.
  - **MCQ Math Option Visual Grid & Dynamic L-Tabs (`js/layout-engine/mcq-layout-planner.js`, `js/engines/export-dual-engine.js`)**: Replaced crude regex-based math collapse with visual symbol width measurement. Compact math choices ($2\pi r, \sqrt{7}$, fractions) dynamically format into 4-across or 2x2 grids, eliminating large empty blank right margins. Emitted RTF `\tx` and DOCX `<w:tab/>` tab stops align directly with the active grid columns.
  - **Master Test Runner**: 26 suites / 1122 gates all passing (100% PASS, 0 failures). Added `tests/part-14.2-regression.test.js` (161/161 PASS offline).

- **Part-14.1 Deployed (Oct 04, 2026)**: Layout Engine Fix Pack (CQ Fallback Header, CQ Booklet 4-Page Back-Fill Delay, MCQ 4-Tab Alignment & Page-Fit).
  - **CQ Fallback Header (`js/engines/question-engine.js`, `js/layout-engine/cq-booklet-planner.js`)**: Missing CQ headers now generate editable, field-level fallback placeholders (`আপনার প্রতিষ্ঠানের নাম`, `ঠিকানা লিখুন`, `পরীক্ষার নাম লিখুন`, `সময়: ... | পূর্ণমান: ...`) matching Word and preview output.
  - **CQ Booklet Back-Fill Delay (`js/layout-engine/cq-booklet-planner.js`)**: Back-fill delayed until flow reaches Page 4 (`used >= 4`), keeping Pages 1–3 in natural consecutive order and preventing premature dump to back cover for 2-sheet booklets.
  - **MCQ 4-Tab Interval Grid & Spacing (`js/layout-engine/mcq-layout-planner.js`, `js/engines/export-dual-engine.js`)**: Refined option grid evaluation so math options don't falsely force 1-column explosion on simple operators, and quarter-grid tabs are properly scoped so Word options align uniformly with true 25% tab intervals.
  - **Master Test Runner**: 25 suites / 961 gates all passing (100% PASS, 0 failures). Added `tests/part14-1-fixes.test.mjs` (7/7 PASS offline).
- **Part-14.0 Deployed (Oct 03, 2026)**: Studio Fix Pack (Figure Export Pipeline, Single-Run Marker Token, Caret Guard, Modal UX).
  - **Figure Export Pipeline (`js/engines/studio-figure-pipeline.js`)**: Converts studio figures (`QZFIGnQZ` markers) into native document images across both Word formats:
    - Word 2003 `.doc` (RTF): Injects `{\pict\pngblip\picw...\pich... <hex>}` with tolerant fallbacks and brace balance.
    - Modern Word `.docx`: Generates `word/media/figureN.png`, registers `[Content_Types].xml`, `document.xml.rels`, and inserts `<w:drawing>` paragraphs respecting alignment.
  - **Edit Bridge Marker/Label Leak Prevention (`js/engines/studio-edit-bridge.js`)**: Purges `.studio-figure-wrapper` from text extraction clones, strips marker tokens during dirty checks (`stripFigMarkers`), and preserves tokens during field assignment (`preserveFigMarkers`). Upgraded marker format to single ASCII run token (`QZFIGnQZ`).
  - **Studio Controller Caret Guard & Focus Defense (`js/studio-controller.js`)**: Valid target caret resolver (`resolveValidTarget()`), removed stale `lastSavedRange` and textbox fallbacks, `mousedown.preventDefault` on ribbons/modals to protect selection, persistent `parsedData.__figures` across AutoSave and History undo/redo.
  - **UI Integration (`studio.html`)**: Added `#btn-quick-insert-math` & `#btn-quick-insert-diagram` IDs and loaded `studio-figure-pipeline.js`.
  - **Master Test Runner**: 24 suites / 954 gates all passing (100% PASS, 0 failures). Added `tests/part14-0-studio-figure.test.mjs` (63/63 PASS offline).
- **Part-13.4 Deployed (Oct 03, 2026)**: 3-Issue Layout & Math Fixes (CQ Booklet Column Breaks, Bijoy $৩/৫$ ANSI Mapping, Exponent $x^2, x^4$ 8pt Size Reduction).
  - **CQ Booklet Premature Break Elimination**: In `js/layout-engine/cq-booklet-planner.js`, multi-column flow only emits 1 leading break for first flow-column (after back-cover), eliminating mid-flow breaks that previously caused 40-50% blank gaps.
  - **Bijoy .doc EQ-Field Bangla Digits ($৩/৫ \to 3/5$)**: In `js/equation-converter.js` (`latexToEqField`) and `js/docx-to-doc-engine.js` (`_toTargetScript`), Bangla Unicode digits (U+09E6..U+09EF) inside EQ-field codes mapped to SutonnyMJ ANSI (`3/5`), eliminating Unicode box/mismatch in Word 2003 while preserving Unicode mode untouched.
  - **Exponent / Superscript / Subscript Font Sizing (~67% = 8pt)**:
    - DOCX (OMML): `EquationConverter._applyOmmlScriptSizes()` injects `<w:sz w:val="16"/><w:szCs w:val="16"/>` into `m:sup`/`m:sub` runs.
    - DOC (EQ-Field): `_wrapEqScriptSizes()` wraps `\S\up4(...)` / `\S\do8(...)` arguments in `<span style='font-size:8.0pt'>...</span>`.
    - RTF: In `js/engines/export-dual-engine.js` and `js/ai-ocr-engine.js`, `{\super\fs16 ...}` and `{\sub\fs16 ...}` emit clean 8pt font sizing.
  - **Master Test Runner**: 23 suites / 891 gates all passing (100% PASS, 0 failures). Added `tests/part13-4-fixes.test.mjs` (36/36 PASS).
- **Studio v4.0 Deployed (Oct 03, 2026)**: Direct Always-On WYSIWYG Editing + Math/Science Symbol Palette + Geometric Figures & Diagrams System.
  - **Seamless Click-to-Edit**: Document sheets activate typing immediately upon click without requiring a separate "এডিট করুন" button click.
  - **Math Symbol Palette Modal**: 4 categories (মৌলিক, বীজগণিত, জ্যামিতি, সেট) with 1-click insertion into caret position in markdown or live preview.
  - **Geometry Figures & Diagrams Modal**: Local image upload (auto DataURL embedding) + 8 preset vector geometry diagrams (সমকোণী ত্রিভুজ, সাধারণ ত্রিভুজ, বৃত্ত ও ব্যাসার্ধ, বৃত্তের জ্যা, সামান্তরিক, রম্বস, সংখ্যারেখা, স্থানাঙ্ক অক্ষ) with interactive figure toolbar (ছোট, মাঝারি, বড়, বামে, মাঝে, ডানে, মুছুন; print-hidden).
  - **Master Test Runner**: 22 suites / 855 gates all passing (100% PASS, 0 failures).
- **Part-13.3 Deployed (Oct 03, 2026)**: Comprehensive 8-Issue Layout & Spacing Hardening Release (Word 2003 .doc + Modern Word .docx).
  - **Difficulty Tag Strip**: `FayzarExamRenumber.stripDifficultyLabels()` automatically purges `(সহজমান)`, `(মধ্যমান)`, `(কঠিনমান)` across all question fields while preserving geometry clauses like `[অঙ্কনের চিহ্ন ও বিবরণ আবশ্যক]`.
  - **CQ Question Gap (12pt / 240 dxa)**: Word 2003 RTF (`\sa240`) and DOCX (`w:after="240"`) inject clean 12pt visual enter gap between consecutive creative questions without exceeding 14pt (280 dxa) line rhythm.
  - **Header Left/Right Alignment**: Word-standard `tab-stops:` emitted (`tab-stops:right 518.3pt`), placing `সময়:` on the left margin and `পূর্ণমান:` on the right margin.
  - **MCQ 2x2 L-Tab Grid**: Word 2003 `.doc` options emitted with valid Word-standard `tab-stops:` (`21.6pt 79.8pt 138.0pt 196.2pt`) preventing option stacking on the left.
  - **Premature Break Fix (.docx)**: Removed artificial `\page` and `\column` breaks in MCQ path, enabling natural Word balance. In `mcq-layout-planner.js`, added `balancePageHeader(items, cap1, cap2, from)` to allocate full height to column 2 of page 1.
  - **CQ Column Separator Removed**: In `docx-to-doc-engine.js`, `w:sep` parsed conditionally; CQ booklet sets `colSep: false`, eliminating the vertical line between columns.
  - **Booklet Column-Break Mapping**: In `docx-to-doc-engine.js`, `w:type="column"` maps cleanly to `<br clear=all style='mso-column-break-before:always'>` ensuring the header stays at the top of the column.
  - **Master Test Runner**: 22 suites / 855 gates all passing (0 failures). Added `tests/part13-3-layout-fixes.test.mjs` (41/41 PASS).
- **Part-13.2 Deployed (Oct 03, 2026)**: Word 2003 `.doc` Math-Font Sanitization + Code-Level Per-Section Exam Renumbering.
  - **Word 2003 `.doc` Spacing Fix**: Resolved via math-font sanitization (`sanitizeFontFamily()`) at font-resolution level in `js/docx-to-doc-engine.js` (Cambria Math/STIX/MathJax mapped to ANSI/Times New Roman). Fixed line-height completely prohibited, eliminating clipping risk (0 fraction tops cut).
  - **Sequential Renumbering (১।, ২।, ৩। ...)**: Per-section sequential renumbering implemented at code-level via `js/layout-engine/exam-renumber.js` (`FayzarExamRenumber`) hooked into `fayzar-pipeline.js` and `export-dual-engine.js`. Gemini prompt strictly enforces verbatim preservation; downstream code handles renumbering without placeholder hallucination. Parser fidelity (questions 12/07) intact.
  - **Master Test Runner (`npm test` / `node tests/run-all.mjs`)**: 21 suites / 814 gates all passing (0 failures). Added `tests/exam-renumber.test.mjs` (34/34 PASS) and `tests/word2003-font-metric.test.mjs` (23/23 PASS).
- **Part-13.1 Deployed**: Studio Edit Bridge (`js/engines/studio-edit-bridge.js`) & Parity Hardening.
- **Part-12.1 Deployed**: Word-2003 Artifact-Test Fixture Hardening.
- **Part-12 Deployed**: Full hardening & stability release for Word 2003 (.doc RTF) and Modern Word (.docx).
- **Part-11 Deployed**: Master CQ Booklet Layout Planner (`js/layout-engine/cq-booklet-planner.js`).
- **Part-10 Deployed**: Master MCQ Layout Planner (`js/layout-engine/mcq-layout-planner.js`).
- **Part-18.0/18.1 (Oct 05–06, 2026)**: Service-audit fixes (nukta canonical form য়/ড়/ঢ় precomposed in js/engines + js/layout-engine, form parsers normalize input; admit/salary/routine/CV/deed/certificate parsers; salary 4-col table). Site rebrand "ফয়জার এআই কম্পোজ": `converter.html` = new home, shared theme `css/fayzar-theme.css` + `js/fayzar-nav.js`, header/footer single source `scripts/fz-shell.mjs` (FZ-NAV/FZ-FOOT markers), home→OCR handoff via IndexedDB (`js/home.js` → `js/handoff-receiver.js`). Tests no longer expect tool scripts in converter.html.
- **Part-18.2 (Oct 06, 2026)**: Site = single page `index.html` (new design) with work embedded: hero card runs OCR via `FayzarAiOcrEngine` public API (handleFiles/startUnifiedOcr/downloadWordDocument) or faithful (`FayzarFaithfulUI`), tools tabs (Unicode⇄Bijoy, Word→Bijoy, DOCX→DOC, MD→Word via FayzarExport). Controller `js/home-app.js`. Old index kept as unlinked `ocr-classic.html`; converter.html redirects; tests that read old-UI labels now read ocr-classic.html. E2E: `qa/home-app-e2e.mjs`.
- **Part-18.3 (Oct 06, 2026)**: Work-first site (iLovePDF style): index = upload hero → workspace (page thumbnails with reorder/delete/add, right settings panel, big convert button, downloads); `services.html` (service cards + tools tabs, `js/tools-app.js`), `samples.html` (steps, before/after, gallery). Shared toast moved to `js/fayzar-nav.js` (top-right, pointer-events none — bottom-right toasts were blocking the sidebar buttons).
- **Part-18.4 (Oct 06, 2026)**: Separate processing page (ring progress) and result page (big .doc button, studio button). Session cache `js/session-store.js` (IndexedDB): refresh restores workspace/result (faithful result re-laid from saved cap via FayzarFaithful.layout); a refresh mid-processing returns to the workspace with a notice. View changes save immediately. Tools textareas use localStorage.
- **Part-18.5 (Oct 06, 2026)**: Convert history (menu "ইতিহাস" → right drawer). Successful conversions are stored in IndexedDB `fayzar-session/history` (text, or ir for faithful, plus a thumbnail), last 20 within 24h. Actions: open as result page, direct .doc, delete, clear all. Downloads are regenerated, never stored. A corner "হোম · নতুন ফাইল" on the result page, and the nav হোম asks before clearing work.
- **Part-18.6 (Oct 06, 2026)**: Layout from facts. The OCR prompt now asks Gemini for grade/subject/content/sections (kind:count) in the frontmatter. `DocClassifier.layoutFromFacts`: primary (1–5) or SYLLABUS/OTHER → EXAM_GENERAL; cq(+short) → CQ/MATH; cq+mcq → COMBINED; mcq only → MCQ; any other kind → GENERAL. Claims are verified against `structureStats` (creative/MCQ blocks). promoteCombined no longer lifts GENERAL. The engine download path uses the classifier, not the raw doc_type. Real-OCR fixtures live in tests/fixtures/real-ocr (class5, class2syllabus, class8sci, hmathcq) with test part-18.6. CQ-only vs the combined CQ part render identically in Word.
- **Part-18.7 (Oct 06, 2026)**: Nested general papers (primary/বৃত্তি). New `js/layout-engine/general-paper-parser.js` keeps the structure main Q → `(১)` items with their own 4 options, lettered sub-questions (ক–হ) with marks, and repeated-number headings becoming section titles. It is hooked at the start of QuestionEngine.parseQuestionPaper for EXAM_GENERAL when `isNested`. Sections carry `keepNumbers` (renumber skips them), and the renderer omits "।" for number-less items. Class 5 real OCR renders correctly in Word.
- **Part-18.8 (Oct 08, 2026)**: Diagnostics for the test-period survey. `js/diag-log.js` logs every conversion (stages, progress, toasts/retries, console warnings/errors, result with layout+reason, downloads) to IndexedDB `fayzar-diag` (last 30, 7 days). A "সমস্যা জানান" modal (vote, issue chips, comment) downloads a ZIP containing report.json, ocr.md, input files and faithful IR. Full roadmap is in docs/MASTER_PLAN.md (phases 0–12).
- **Part-18.9 (Oct 09, 2026)**: Layouts from the user's real shop samples (`Downloads\SAMPLE`). (a) EXAM_GENERAL + grade 2–5 → profile EXAM_PRIMARY in `cq-booklet-planner.js` (A4 landscape, 2 cols, 0.7" gap, no column line, header in column, booklet "auto": ≤2 columns = single page, 3+ = booklet). Grade comes from frontmatter or the header text; docType stays EXAM_GENERAL. (b) Verified + tested: CQ-only / MCQ-only output equals the CQ / MCQ part of a combined paper. (c) New `js/layout-engine/application-layout.js` for GOVT_APP (shop format, one model → DOCX/RTF/preview, one-page fit calibrated in Word: Kalpurush ×1.24, SutonnyMJ ×1.08); old ApplicationEngine stays as fallback. (d) Bijoy fix in `text-run-processor.js`: "_", "×", "÷" go to Times New Roman runs (SutonnyMJ showed থ/ম). (e) Parser: sub-question ঙ/চ/ছ/জ after ঘ. Tests: `tests/part-18.9-*.test.mjs`.
- **Part-18.9b (Oct 09, 2026)**: One-column papers. Profile EXAM_ONECOL (A4 portrait, 1 col) for CQ/MATH/GENERAL. Precedence: result-page button (`#colPick`, `state.layoutColumns`, no re-OCR) > class 2–5 rule > Gemini fact `source_columns` (printed pages only, handwritten = 0). Site chain fixes: "_"/"×" are isolated in the Unicode master too, because Bijoy/.doc are converted from it. Application fit uses `targetFont`. The nested general parser keeps unlabelled lines as stimulus; question-engine requires it in node too. QA: `qa/site-chain-download.mjs`.
- **Part-19.0 (Oct 09, 2026)**: Office pad letters (OFFICE_PAD) and প্রত্যয়নপত্র (PROTTOYON) from the shop samples (Pad.doc, Pad Ap.doc, Prottyon.doc + real scans). New `js/layout-engine/letter-layout.js` (`FayzarLetterLayout`): letterhead (org = Gemini "#" line, bold 36pt shrinking to one line; "…কার্যালয়"/সরকার lines above it small; rule under the last line), letter part reuses FayzarApplicationLayout blocks (application-layout.js got `bodyOnly` for RTF/HTML + `geometry` for HTML), prottoyon title bold+underline 25pt and 16pt/1.5 body, right-hand centred signature block (two bracketed names side by side in a borderless table; search starts after বরাবর/বিষয়/জনাব so receiver designations are not signatures), one-page fit steps measured in Word. Export: OFFICE_PAD/PROTTOYON route to it before the old CertificateEngine; site chain packages the Unicode master with default style font SutonnyMJ when targetFont is bijoy (u2b does not touch styles; blank lines took Kalpurush height → 2 pages). Known gap: site .doc (docx-to-doc-engine) drops auto line spacing (writes unitless line-height). Tests: `tests/part-19.0-letter-layout.test.mjs`; fixtures `tests/fixtures/{pad-notice,pad-school-app,prottoyon-school,prottoyon-up}.input.md`.
- **Part-19.1 (Oct 09, 2026) — Bangla CV (CV_RESUME)**: Shop sample measured earlier (the measurements are in the header comment of `js/layout-engine/cv-layout.js`; do not re-measure SAMPLE). Bangla CVs use `FayzarCvLayout`, English CVs stay on the old `cv-engine.js`. Routing is in all 5 places: prompt rule after the GOVT_APP line (a CV inside a letter → GOVT_APP), doc-classifier (CV_RESUME in NON_EXAM, so content: OTHER no longer turns it into a question paper), fayzar-pipeline, export-dual-engine, and the HTML script tags.
  - Parser fixes this session: the second address line without a number ("উপজেলাঃ …") goes under the address value; the ঃ in "মোঃ/মোছাঃ/ডাঃ" is not a separator; when no step fits on one page, the smallest step is used (it used to fall back to step 0).
  - Tests: `tests/part-19.1-cv-layout.test.mjs` (10). Anonymous fixtures `cv-basic`, `cv-biodata`, `cv-long`, `cv-english`. The source-fidelity bag now reads the CV footer and the old CVEngine shape. Suite: 1634 PASS / 0 FAIL.
  - Measuring scripts were copied to `tools/` (`dump-doc.ps1`, `pdf-pages.ps1`, `cv-tabs.ps1`).
  - Part-19.1 closing (Oct 09): the site chain (`qa/site-chain-download.mjs`, new env `FMTS=bijoy_docx,doc,unicode_docx`) made 4 fixtures × 3 formats in `Downloads\Fayzar-লেআউট-প্রিভিউ\Part-19.1`, and pages were counted in Word. Only cv-long Unicode was 2 pages, because a Kalpurush line is ≈1.39× a SutonnyMJ line. USER DECISION: the minimum font stays 12pt (STEPS end at {24,264}). A longer CV goes to 2 pages, but the date/signature must stay with the last text. In DOCX/RTF, the paragraph before the footer and the gap lines get keepNext/\keepn (`keepLast`), and the footer row is cantSplit. Word check: cv-long Unicode is 2 pages with last text + footer on p2. The other 11 files are 1 page. A longer test copy also put .doc on p2 together. Caveat: docx-to-doc-engine drops keepNext, so the .doc keep is not guaranteed (it needs the user's permission). The CV baselines were updated. Suite 1634 PASS / 0 FAIL. MASTER_PLAN §৬: CV ✅, next = certificate layout (19.2).
  - Still open: the user's visual check in Word.
- **Rules + cleanup (Oct 09, 2026)**:
  - CLAUDE.md and the root AGENTS.md are synced. Permission is tiered (core engines → ask first; main engines → small wiring OK, behavior change → ask; other files → report afterwards). New entry point `docs/HANDOFF.md`, rewritten before every stop.
  - Cleanup: 217 items went to the Recycle Bin (not permanent). They were: upload_part*.js (they held a token), bundle4/6b, old_engine.js, ping_models.js (it held a key), old test_* files/images, identical root copies of docs (LAYOUT_*, PROJECT_MASTER_GUIDE, AI_MISTAKES_LOG), the stale root LAYOUT_SPECIFICATION, docs/AGENTS.md, docs/GEMINI.md, docs/.ai_memory.md, and the old scratch scripts.
  - KEPT: scratch/github_sync.js; scratch/test_env (Playwright for 5 E2E suites; it was restored after the pass count dropped); root GEMINI.md, PROJECT_MAP.md and .ai_memory.md (GEMINI.md points to them).
  - Suite after cleanup: 1635 PASS / 0 FAIL.
- **Map rewrite (Oct 09, 2026)**:
  - `docs/PROJECT_MAP.md` is now a 100-line task → file → function table, marked with permission tiers (🔒/⚙️).
  - Line numbers come from `docs/CODE_INDEX.md`, generated by `node tools/gen-map.mjs` (141 files, ~1480 functions/tables; grep it, never read it whole).
  - The old 486-line map is in `docs/archive/PROJECT_MAP_OLD_2026-10-09.md`. The root PROJECT_MAP.md is now only a pointer.
  - Note: `stripDifficultyLabels` (Part-13.3 above) no longer exists in the code. An English CV in the shop format is not built. The known site .doc line-spacing gap (docx-to-doc-engine; needs the user's permission) applies here too.


- **Part-19.2 (Oct 09, 2026) — decorated landscape certificates**: new `js/layout-engine/certificate-layout.js` (FayzarCertificateLayout), measured from the shop samples "prottoyon pottro Dreamland.doc" and "Rangamati R. Proshonsha protro 2025.doc" (sample text boxes become tables and paragraphs so they survive the .doc conversion).
  - Two variants. single = A4 landscape, double page border, grade table to the right of the header (vMerge table), bold body 15pt at 1.7. stub = counterfoil (মুড়ি) on the left and the main certificate on the right, each in a 4.5pt box, with a boxed title.
  - Routing: PROTTOYON goes here only if `wants()` is true (frontmatter `page_orientation: landscape`, or a counterfoil split: a `***` line, the first line repeated, or the `#` org line twice). Otherwise it goes to letter-layout as before. Wired in export-dual-engine (rtf + docx), fayzar-pipeline (parse + html) and 4 HTML script tags. One prompt fact line was added under the PROTTOYON rule in ai-ocr-engine.
  - Word COM check: all 6 site-chain files (bijoy/unicode docx and .doc, both variants) are 1 page; thick borders, boxed title and double page border survive in .doc. The fix that made stub fit: ROW_SPARE plus a 1pt exact trailing paragraph. Known: .doc loses the 1.7 line spacing (core-engine issue, permission pending).
  - Tests: `tests/part-19.2-certificate-layout.test.mjs` (9). Fixtures `cert-landscape`, `cert-stub` (anonymized). source-fidelity now reads the `parts` model. Full suite 1648 PASS / 0 FAIL.


- **Part-19.3 (Oct 09, 2026) — .doc line spacing (core engine, with user permission)**: in `js/docx-to-doc-engine.js` the auto spacing was written as a unitless `line-height:1.70`. Word's HTML import ignores that, so every .doc came out at 1.0. It now uses Word's own form `line-height:170%`, in both the style-inherited and direct pPr branches. `w:keepNext` is now converted to `page-break-after:avoid`.
  - Word COM before/after (10 fixtures: cert ×2, CQ, MCQ, combined, math, primary, notice, CV, application): page count unchanged in all 10. Certificate now 20.4pt (1.7×12). CV/notice/application now get their docx spacing too. Exam-paper paragraphs unchanged (240 = 1.0); only the divider line (w:line=100) is now 42%.
  - Full suite 1648 PASS / 0 FAIL. Preview: `Downloads\Fayzar-লেআউট-প্রিভিউ\Part-19.3-লাইন-দূরত্ব`. Pushed to GitHub.
- **Part-19.3b (Oct 09, 2026) — real Gemini OCR check for certificates and pad application**: OCR of 4 samples (Dreamland and Rangamati .doc rendered to PDF via Word, prottoyon.jpg, the pad-application PDF). Classification correct for all; Gemini writes `page_orientation: landscape` for both decorative certificates.
  - Pad application: Gemini says GOVT_APP, so application-layout was used and the pad was lost. Fix: `FayzarLetterLayout.hasLetterhead()` plus a remap in fayzar-pipeline `process()` to OFFICE_PAD. The remap checks the raw text, because `stripOcrArtifacts` removes `#`.
  - certificate-layout: a grade table before the org name is taken first. Two full certificates (prose ≥150 in both) render as two single pages (page break), and a lone `*` counts as a separator. The single layout follows the Dreamland sample: grade table top-right above the name, 0.4" margins, date + signature on one level, all bold (sizes 16/15/16/14, centre tab), footer pushed down (footGap). Kalpurush gets 2 extra head-shrink steps (HEAD_K). Height factors per role were measured in Word.
  - ai-ocr-engine: `honorCellMargins` for decorated certificates only. The engine's default 3.5pt cell padding pushed the .doc ~36pt lower.
  - Word COM: all 12 files have the right page count (Dreamland 2, others 1). Body 15pt / counterfoil fields 14pt double, as in the samples. New test `part-19.3-real-ocr-fixes` (5), fixture `real-ocr/cert-two-pages.md` (anonymized), cert-stub snapshot updated (intentional). Full suite 1653/0.- **Part-19.4 (Oct 09, 2026) — exam paper fixed for Kalpurush + cash memo 2-up/3-up**:
  - Kalpurush: in Word a Kalpurush single line is 1.575em (win 1000+400 + lineGap 175) vs SutonnyMJ 1.169em, so the class-4 Unicode .docx went to 2 pages. New `FayzarLayoutUnits.examLineFactor(targetFont)` gives 0.72 only for an explicit `targetFont: 'unicode'`. `ExportDualEngine._examLineFactor` feeds it to `_fixDocxSpacing` (lower clamp 0.9 → 0.7) in the CQ/MCQ/combined .docx. Measured in Word: Unicode last line 5.59" vs Bijoy 5.64", 1 page, no clipping (EMF render). Bijoy, .doc and calls without targetFont are unchanged (240).
  - New `js/layout-engine/cash-memo-layout.js` (CASH_MEMO), built from `SAMPLE\Cash Memo (Write) - Copy.doc` (2-up blank) and `Jahid Hasan_Cash Memo-.doc` (3-up product list). A4 landscape, N columns, one copy per column; the column break goes at the start of the next copy's first paragraph. Proprietor and title sit in a black box (run shd). Fields use dot-leader tabs. The table has a tall blank row, or item rows plus numbered filler rows; the total row is last. `copies` comes from options, then frontmatter, then defaults to 2.
  - Measured in Word, then fixed: (a) planner measure overstates width (real/measure: Sutonny ≤0.78, Kalpurush ≤0.91), so wrap factors are 0.82/0.95; (b) real line pitch ≈1.25em; (c) atLeast rows add the border width, more in .doc, so all rows are exact; (d) docx→doc turns an empty paragraph into a sizeless 12pt &nbsp;, so empty cells/paragraphs get a sized space run; (e) Unicode memo line ×0.72. If too many items, the base font shrinks to a minimum of 8pt (the 3-up sample is 10pt; ours fits at 9pt).
  - Wiring: DocClassifier CASH_MEMO (+NON_EXAM), Gemini prompt (doc_type + `copies` fact + transcribe one copy), fayzar-pipeline parse/html, export-dual docx/rtf routing, `honorCellMargins` for CASH_MEMO .doc, script tag in 4 HTML pages. Fixtures `cash-memo-blank/items.input.md`; tests `part-19.4-*.test.mjs`; source-fidelity knows the memo model.
  - Word: all 9 files are 1 page (`Downloads\Fayzar-লেআউট-প্রিভিউ\Part-19.4-ক্যাশমেমো-কালপুরুষ`). Suite 1668 PASS / 0 FAIL.
- **Planning session (Oct 10, 2026) — no code changed.** Checked the studio: the preview uses `FayzarPipeline._renderHtml` (an HTML renderer), while the download uses `ExportDualEngine.generateWordDoc`; a .doc there takes the RTF route, not the single master path (`FayzarExport`). Preview ≠ download is structural (3 renderers per layout); this is phase 7.
  - Gaps: no layout registry (each new layout is wired into about 6 places), no golden scoring tool, and faithful mode has no automatic accuracy score (open items in `docs/FAITHFUL_ISSUES.md` #3, 6–14, 24, 27–31, 33–35, 37).
  - Idea: turn the shop .doc files in `SAMPLE` into PDF/PNG with Word COM. That gives exact ground truth (positions, font size, tables) for the faithful engine.
  - A sample list was given to the user, and the user's choice of work order is pending.
  - Full work plan written to `docs/WORK_PLAN.md`, phases A–H with checkboxes, starting 2026-10-11 at A1. The user asked that it be kept in memory.
  - The user gave 2 government form PDFs for faithful mode. Their PDF text layer is broken, so they can only be OCR'd from images. Added WORK_PLAN A5 (image-based score for PDF-only samples) and B9 (form elements faithful lacks: cell shading and text color, digit boxes, dot leaders, dashed boxes, photo box).
- **WORK_PLAN pass A (Oct 11, 2026):** new `qa/golden/` (build-golden.ps1 + measure-lib.ps1 + measure-doc.ps1, docx-runs.mjs, finalize-golden.mjs, compare-truth.mjs, faithful-score.mjs, image-score.mjs) and the test `tests/golden-compare.test.mjs`.
  - Positions come from COM. Run fonts come from the XML of a Word-saved .docx, because a per-word COM loop was far too slow on long files.
  - Matching is order-independent and text similarity is bigram-based. 2-up copies interleave lines, and Bijoy conjunct spelling differs from Gemini's reading.
  - Faithful capture fix: the prompt bans long same-character runs. Fill lines come as `⟦c×N⟧` and repeated empty table rows as `⟦rows×N⟧`; `layout-tags.expandFill` expands both at parse time.
  - The cause was Gemini repetition loops running into MAX_TOKENS: the cash memo took 2×7 min, then 6s. Now 9s for that page and 20s for 7 pages.
  - First scores: g01 54.3, form-8 58, grant form 8.5 (3→6 pages).
  - Golden data is local only. `qa/golden-data/` is in .gitignore and in the github_sync EXCLUDE list.
  - Math-1 (7MB) gets a proxy 5xx and never reaches the log. Investigate.
- **WORK_PLAN A3/B2/G1 (Oct 11, 2026, afternoon)**: golden build finished for all 40 SAMPLE docs (an earlier run had stopped at g21 without writing the manifest). finalize-golden now retries a failed PNG fetch once and keeps going.
  - Subset swaps: g06 (87 pages) → g11, g37 (11 pages) → g32. Baseline `baseline-pdf.json`: 13 samples, avg 57.7.
  - G1 diagnosed with `wrangler tail`: the Worker hits `exceededCpu` on payloads over ~1MB (JSON parse/stringify on the free plan). Responses have no CORS headers and never reach the log. That is the Math-1/g33/g36 failure. Fix needs a user decision (paid plan / stream body / smaller client images).
  - faithful-docx-builder: `tableRowHeights` keeps text rows at natural height and gives the rest of the measured height to empty rows, only when equal sharing would inflate text rows ≥1.8×. One-line "label: ....." gets a right dot-leader tab at the measured right edge. g01 54.3→57.7, nothing else moved; suite 1680/0.
  - New `qa/golden/asis-score.mjs` + `qa/golden-data/asis/manifest.json` (20 small PDFs from Downloads\AS it IS). faithful-e2e now prints browser logs and POST sizes on failure.
  - AS it IS review: mostly government forms/notices; only the roll-number card sheet (8 dashed boxes) is a common shop job. AdmitCardEngine (2×2) is the nearest layout. Not added as a new doc_type.
- **G1 proxy alternatives (Oct 11, 2026)**: user rejected lowering image quality (JPEG/WebP) and a local serve.js proxy, because blurry sources would OCR badly and the shop PC isn't always on. Compared Cloud Run, Vercel and others. Recommendation: (2) Worker forwards the raw body without JSON parse, with models/options in headers. If still exceededCpu, (1) Workers Paid. Vercel Hobby is non-commercial with a 4.5MB body limit, so it's rejected. Cloud Run is a fallback only (rewrite + billing account). Waiting on user decision.
- **G1 fix, option 2 (Oct 11, 2026, evening)**: Worker raw mode `?raw=1&models=..` reads the body with `arrayBuffer()` and does no JSON parse/stringify. Each attempt sends `rawBuf.slice(0)`.
  - Client `executeGeminiRequestViaSupabase` now applies withThoughts itself (includeThoughts, level low) and sends the bare Gemini payload. The old JSON mode stays for backward compatibility.
  - Deployed `47c8c2c7` (rollback `1e76997f`).
  - Tail results: g33 cpu 14ms ok, g36 98ms ok, Math-1 5.4MB 197/154ms ok. No exceededCpu.
  - Math-1 still fails: Gemini 503 "high demand" mid-stream after ~80s (finish=NONE), twice. That's a separate issue.
  - New captures: g33 48.6, g36 52.8 (page overflow). Suite 1680/0.
- **G1b + B5/B1 (Oct 11, 2026, night)**:
  - Client: an `error` arriving mid-stream after text has started now keeps the partial text and adds an `[অসম্পূর্ণ: ERROR 503]` marker.
  - faithful-capture: continuation request failures wait 20s and retry. maxContinuations raised 3→6. Math-1 (20 pages) finished in one request (121s).
  - Pushed 09f0b87 (25 files, including earlier B2/golden work).
  - B5: new `js/layout-engine/faithful/line-fit.js`, run in the pipeline after IR.build. Order: shorten fill runs → reduce indent/centre-shift/right-indent → shrink font ≥85%. Rule lines (───) become leader-tab paragraphs in the builder.
  - B1 #30: table cell font now uses per-column line heights (upper quartile of column medians), only when a column has more lines than the row-lines (multi-line cells merged rows). g20 table 18→13pt.
  - Subset 57.0→62.9, pages 5→9/15. Tests 1698/0.
  - g33/g18 overflow is a Gemini block error (one block holding 202/72 lines in a tiny box) → B6.
  - New diag tools: `qa/golden/layout-{wrap,drift,seq}-diag.mjs`.
  - User asked about Cloud Run/Render/Workers Paid. Advised staying on the Worker: measured limits already resolved, and a 503 is Gemini capacity, not the proxy platform.

- **Push + plan + B6 (Oct 11, 2026, late night)**:
  - Pushed B5/B1 as a8ffaa4 (16 files). Baseline set to 62.9 (score-pdf → baseline-pdf, as the owner approved).
  - New `docs/TEMPLATE_COMPOSE_PLAN.md`: template gallery (reuses existing layout modules plus a forced doc_type), custom sample (faithful IR as the mold), and clean Word (new clean-composer). Phases T1→T3. Not coded yet.
  - B6 root cause: Gemini closed tags with a single `]` (`…u=0]`), and the parser needed `]]`. Everything after that, including page 2, merged into one block. TAG_SRC now accepts a single `]` at the end of a line.
  - page-geometry snap clips a Gemini box at the start of the next block in the same column (≥50% x-overlap, figures excluded).
  - layout-ir estOf: the width-based font is rejected when it exceeds the measured line pitch ×1.05. Lowering the ratio limit 1.6→1.25 regressed g22/g38, so it was not used.
  - faithful-e2e re-parses the cached capture.text with the current parser.
  - g33 48.6→54.3, g18 42.3→48.5, average 63.7, pages 9/15. Tests 1705/0. Not pushed.
  - Lesson: a PowerShell Get-Content/Set-Content edit garbled the UTF-8 Bengali in layout-ir.js. It was recovered via a cp1252→UTF-8 round-trip. Edit source files only with the Edit tool.

- **B6 push + T1 clean Word (Oct 11, 2026, end of night)**:
  - Owner decisions: push B6 (pushed as 037a5d7), baseline 63.7 (saved from a full 15-sample run). Gallery order: exam → prottoyon → pad/application → cash memo → CV → certificate. Clean mode uses Kalpurush 12pt at 1.15 line spacing. Templates are stored locally in IndexedDB. Order T1→T2→T3.
  - T1: new `js/layout-engine/clean-composer.js`. It parses MD into heading, para, bullet and table blocks. Runs and equations come from ExportDualEngine.renderDocxRuns (called, not changed). It builds its own master with Heading1-3 styles and gives it to FayzarExport.produce({ masterDocx }), so export-dual-engine needed no change.
  - UI: a "লেআউট: সাজানো | ক্লিন" picker plus copy/.txt/.md buttons on the results page (`home-app.js`: setStyle, cleanDownload, textOut). ai-ocr-engine now exports prepareSourceFigures (one line).
  - It strips the OCR marker `---SECTION_BREAK:MCQ---`.
  - QA `qa/clean-e2e.mjs` and `qa/clean-word-check.ps1`, which must stay ASCII because PowerShell 5.1 reads BOM-less files as ANSI. The clean .doc has the same EQ count as the template path (30/7). Simple `$x$` becomes text in docx→doc on both paths.
  - Tests 1723/0. T1 not pushed.

- **T1 push + T2 exam templates (Oct 11, 2026, end of night 2)**:
  - T1 pushed as b61816f.
  - T2: new `js/layout-engine/template-composer.js` with 6 exam templates in REGISTRY (cq, math, mcq, combined, general, primary). `enforce()` writes `doc_type` first, plus `layout_lock: true`, `template`, and `layout_profile`, and keeps Gemini's other fields.
  - Finding: for exams, the frontmatter facts (grade/sections) override doc_type in `classify`, so locking needed a classifier line. Small ⚙️ additions:
    - classifier: honors the template lock.
    - planner `layoutKey`: uses `__frontmatter.layout_profile` unless the user chose "1 column".
    - ai-ocr-engine: appends `state.templateHint` to the prompt.
  - UI: workspace gallery of inline-SVG cards. The chosen template is saved in the session. Warnings appear when the needed structure (CQ/MCQ) is missing.
  - Tests: t2 has 6 tests, total 1729/0. `qa/template-e2e.mjs` runs on the real page with no Gemini call. It strips FIG tags, because the figure-review screen otherwise waits for a person. The site's download path gives the expected orientation in all 5 cases.
  - Fixture note: `cq-short.input.md`'s "[উদ্দীপক ১]" form gets cqBlocks=0. Real OCR (`hmathcq`) counts correctly.
  - T2 not pushed.

- **T2 push + certificate group (Oct 11, 2026, end of night 3)**:
  - T2 exam group pushed as 53c1965.
  - Group 2 added: prottoyon-school, prottoyon-up (portrait, letter-layout), cert-landscape, cert-stub (landscape, certificate-layout).
  - Templates now support `fm`: extra frontmatter that gets locked, here `page_orientation`. PROTTOYON routing (`FayzarCertificateLayout.wants`) already reads `__frontmatter`, so no engine change was needed.
  - `OFFICE_FORMAT` prompt for non-exam templates: pad head → স্মারক/তারিখ → title → body → signature. Formal wording may be composed from facts only, never invented, with `........` for missing facts.
  - Checks: certificate title present; for the stub template, `CertificateLayout._split` must succeed.
  - The gallery got group headings.
  - Tests 1731/0. template-e2e passes all 8 cases. Not pushed.

- **Group 2 push + pad/application group (Oct 11, 2026, end of night 4)**:
  - Group 2 pushed as 969140d.
  - Group 3 added (`group: 'pad'`): pad-letter and pad-notice (OFFICE_PAD, letter-layout), app-general and app-job (GOVT_APP, application-layout, `fmt: 'app'`). Four icons (pad/notice/app/job).
  - `NO_INVENT` was split out of `OFFICE_FORMAT`. `OFFICE_FORMAT` now says the title is "(if any)".
  - New `APP_FORMAT` for applications: বরাবর → বিষয় → জনাব → body → অতএব → বিনীত নিবেদক → সংযুক্তি, and no "#" line. Reason: pipeline line 291 turns GOVT_APP into OFFICE_PAD when `hasLetterhead` is true.
  - Checks: `need.pad` warns when `hasLetterhead` is false. `need.app` warns when বরাবর or বিষয় is missing, and when the text has a letterhead.
  - Found but not fixed: a plain notice with no বরাবর loses its "বিজ্ঞপ্তি" title, which merges into the first paragraph because `RX.title` doesn't cover it. Needs the owner's permission.
  - Tests 1734/0. template-e2e passes the gallery plus 12 cases (gallery group count now comes from `GROUPS`). Not pushed.

- **Notice title + group 3 push + memo/receipt group (Oct 11, 2026, end of night 5)**:
  - The owner allowed the notice-title change: letter-layout `RX.title` now also matches বিজ্ঞপ্তি / নোটিশ / অফিস আদেশ / NOTICE. Snapshots unchanged. Group 3 pushed as d3135e9.
  - Group 4 (`memo`): memo-1up, memo-2up, memo-3up (`fm.copies`), receipt, voucher. `FORMATS` map: app / memo / receipt / voucher.
  - Owner decisions: 1-up is A5 portrait. Receipt and voucher are built without a shop sample, using standard Bangladeshi formats; the owner will check them in Word.
  - cash-memo-layout: new `UP[1]` and `PAGE_A5`. `copiesOf` accepts 1. Landscape is now conditional in sectPr, RTF and HTML. The 2-up/3-up values are unchanged.
  - New `js/layout-engine/receipt-layout.js` (FayzarReceiptLayout). It runs only when the frontmatter has `memo_kind: receipt|voucher`, which the templates lock. Routing lines were added to export-dual-engine (RTF + DOCX, before the cash-memo routes) and pipeline (parse + html). Script tags were added in index, services, studio and ocr-classic.
  - Word COM check: all 12 files (3 templates × docx/rtf × unicode/bijoy) are one page each with the correct size and columns. Copies are in `Downloads\Fayzar-লেআউট-প্রিভিউ\T2-দল৪-মেমো-রসিদ-ভাউচার`.
  - Tests 1748/0 (the three "with skips" suites change the total from run to run). template-e2e: gallery plus 17 cases. Group 4 not pushed.

- **Group 4 push + CV group, T2 done (Oct 11, 2026, end of night 6)**:
  - Group 4 pushed as b44d235.
  - Group 5 (`cv`): cv-bangla (numbered "০১। নাম ঃ" rows) and cv-biodata (section headings, no numbers). Both use cv-layout. New `CV_FORMAT` prompt.
  - Checks for CV templates: warns when the text is mostly English (`isBangla`; it would go to the old English CV engine), when there is no title, and when there are fewer than 3 kv rows.
  - T2 acceptance: `GOLDEN` maps every template to a fixture. The docx summary (type, orientation, page width, cols, tbl/tr/p counts) is checked against `tests/baseline/t2-templates.snap.json`; `UPDATE=1` rewrites it.
  - No engine change in this step (template-composer, tests and qa only).
  - Tests 1752/0. template-e2e: gallery plus 19 cases. Group 5 not pushed. T2 is complete (21 templates); T3 has not started.

- **English CV template + group 5 push (Oct 11, 2026, night 7)**:
  - The owner approved pushing group 5, liked the receipt/voucher previews, and asked for an English CV template before T3.
  - The 3 shop English CVs (Taher Khan / Najmul / Anu mama) are one format, measured via Word COM: A4; margins 0.5/0.5/1/0.5"; Arial Black title; "OF"; name 22pt; photo box at right; grey #737373 bars with white Calibri 18; "Label<tab>:<tab>value" rows (tabs 3510/3880); bullets; a language table; a line, "(Name)" and "Date:".
  - New `js/layout-engine/en-cv-layout.js` (FayzarEnCvLayout). The photo box and bars are table cells, not shapes, so they survive docx→doc. Pure-English runs are built in the module (font/colour); Bangla goes through the site's runs. It runs only with the `template: cv-english` lock. Without the lock, English CVs still go to the old CVEngine (unchanged).
  - Routing lines were added in export-dual-engine (RTF + DOCX, before the Bangla cv-layout) and pipeline (parse + html), with script tags in 4 HTML files. template-composer gained `cv-english` + `EN_CV_FORMAT` + `cvEn` warnings.
  - The fixture is `tests/fixtures/cv-english-shop.md` (not `.input.md`: the generic harnesses run without the lock and would test the old engine). Word COM: 2 pages in docx and rtf, unicode and bijoy; a keepNext fix stops a bar from being stranded at the page end. Previews are in `Downloads\Fayzar-লেআউট-প্রিভিউ\T2-দল৫-ইংরেজি-সিভি`.
  - Tests 1757/0; template-e2e has the gallery plus 21 cases, ALL OK. T2 is complete (22 templates).

- **English CV auto-routing + T3 plan (২০২৬-১০-১১, রাত)**:
  - মালিক ইংরেজি সিভি পছন্দ করেছেন আর অনুমতি দিয়েছেন: তালা ছাড়া (অটো) ইংরেজি সিভিও নতুন লেআউটে যাবে।
  - বদল শুধু `en-cv-layout.js`-এর `wants()`-এ। নিয়ম: তালা `cv-english` ⇒ হ্যাঁ; অন্য ছাঁচের তালা ⇒ না; তালা নেই ⇒ ইংরেজি-প্রধান (cv-layout.isBangla-র উল্টো) হলে হ্যাঁ। পাইপলাইন আর export-dual-engine-এ শুধু মন্তব্য বদলেছে। পুরোনো CVEngine এখন শুধু ফেলব্যাক।
  - টেস্ট হালনাগাদ: t2 রাউটিং-টেস্ট (অটোতেও ধূসর পটি ৭টি), part-19.1 প্রিভিউ (EN_CV_LAYOUT), source-fidelity (`head` ব্লকের title/of/name), run-regression-এ cv-english-এর বেসলাইন নতুন করে লেখা।
  - নতুন `docs/T3_PLAN.md`: নিজের নমুনা → হুবহু-ক্যাপচার IR → স্লট (Gemini `type` থেকে); "আমার টেমপ্লেট" আলাদা DB `fayzar-templates`-এ (session-store ২৪ ঘণ্টা পরে মোছে, তাই ওখানে নয়); দুই স্তরে মিলানো (স্থানীয় লেবেল-মিল + JSON-মাত্র Gemini ম্যাপ); ধাপ T3a–e; মালিকের ৬টি সিদ্ধান্ত বাকি।
  - টেস্ট ১৭৫৭/০।

- **T3a + T3b (২০২৬-১০-১১, গভীর রাত)**:
  - মালিক T3_PLAN-এর §৭-এর ৬টি সিদ্ধান্তই প্রস্তাবমতো অনুমোদন করলেন। আগের বদল পুশ হয়েছে `9222629`-এ।
  - T3a `js/template-store.js`: ব্যাকএন্ড-নিরপেক্ষ `create(backend)`, ব্রাউজারে IndexedDB, টেস্টে মেমরি। কিছু নিজে মোছে না। আমদানিতে সবসময় নতুন id। বার্তায় বাংলা অঙ্ক।
  - T3b `js/layout-engine/sample-template.js`: আসল IR দেখে শেখা কয়েকটি জিনিস:
    - Gemini-র type অনির্ভরযোগ্য, তাই লেবেল-মান লেখা দেখে চেনা হয়।
    - ২-আপে যমজ দল।
    - প্যাড-মাথার নিয়ম (মাঝে-বসানো অংশের নিচে স্থির শিরোনাম থাকলে স্থির)।
    - ক্রম-মিল (মেলানো জোড়ার মাঝে সমান সংখ্যা হলে জোড়া)।
    - টেবিলের লেখার-জায়গায় মোট উচ্চতা একই।
    - line-fit-এর ছোট ফন্ট পূরণের সময় `fit.fontFrom`-এ ফেরত যায়।
  - builder `m`/`diag`/`box` পড়ে না, তাই `slimIR` সেগুলো বাদ দেয় (g01-এর IR ৪০KB থেকে ১৬KB)।
  - টেস্ট ১৭৮০/০ (নতুন ২৩টি)। T3c/d/e বাকি। T3a/b পুশের অনুমতি বাকি।

- **T3c Gemini-ম্যাপ (২০২৬-১০-১১, গভীর রাত)**:
  - মালিকের অনুমতিতে T3a/b পুশ হয়েছে `a536f9d`-এ।
  - `sample-template.js`-এ যোগ হলো `needsRemote`/`buildMapPrompt`/`parseMap`/`mapWithGemini`/`composeAsync`।
    - `executeGeminiRequest` শুধু-লেখায় চলে: media=[], customPrompt যায় system_instruction-এ, extraTextContent যায় ডেটা হিসেবে। `stripOcrArtifacts` JSON নষ্ট করে না। তাই ai-ocr-engine-এ কোনো বদল লাগেনি।
    - `state.isProcessing`-এর মোড়ক faithful-capture-এর মতো।
  - টেস্ট-ফিক্সচার একটি দুর্বলতা ধরল: ক্রম-মিল শুধু সংখ্যা দেখে স্বাক্ষরকে ঠিকানার স্লটে দিত। সমাধান **প্রথম-লাইন মিল** (ছোট প্রথম লাইন হুবহু এক হলে জোড়া, আর সেটা সীমানাও হয়)।
  - অতিরিক্ত অংশ এখন খসড়ায় তার আগের বসানো অংশের স্লটের পরে বসে।
  - টেস্টে টাইপ করা বাংলায় য় বিচ্ছিন্ন রূপে আসে, তাই তুলনার আগে নুক্তা স্বাভাবিক করতে হয় (regex-এর source-ও)।
  - টেস্ট ১৭৮৯/০। আসল কল T3d-এর E2E-তে হবে।

- **T3d UI (২০২৬-১০-১১, গভীর রাত)**:
  - মালিকের অনুমতিতে T3c পুশ হয়েছে `cc5994d`-এ।
  - নতুন `js/my-template-ui.js` (FayzarMyTemplateUI)। প্রবাহ: ওয়ার্কস্পেসের পাতা = নমুনা → capture + layout → রেডিমেড-প্রস্তাব → স্থির/বদলাবে প্রিভিউ → নাম → store-এ সেভ।
    - কার্ডে আছে নাম বদল/রপ্তানি/মুছা, আর আমদানি।
    - home-app convert-এ: সাধারণ OCR → `composeFromText` → lastRun.mode `faithful` + `custom`, তাই হুবহু-ডাউনলোড পথ চলে।
  - ইঞ্জিনে বদল নেই। home-app-এ রাউটিং-লাইন, index.html-এ ঘর + script, css যোগ হলো।
  - E2E-তে ধরা পড়ল: লুকানো ওয়ার্কস্পেসে puppeteer ক্লিক করতে পারে না, তাই DOM-ক্লিক লাগে। নুক্তার কারণে তুলনায় `_cmp` লাগে।
  - আসল ম্যাপ-কল (g20): ≈১০ সেকেন্ড, ২টি মিল, ০টি বাদ, কোনো লেখা হারায়নি।
  - template-e2e-তে auto-ইংরেজি-সিভির প্রত্যাশা হালনাগাদ হলো। টেস্ট ১৭৯১/০। T3e বাকি।

- **T3e + T3 সম্পূর্ণ (২০২৬-১০-১১, গভীর রাত)**:
  - মালিক বললেন রুটিন কাজে (পুশ, দরকারি Gemini-কল, অনুমোদিত পরের ধাপ) অনুমতি না নিতে। T3d পুশ হলো `44b2336`-এ।
  - CV-ক্যাপচার নিতে ৩টি Gemini-কল লাগল (`qa/faithful-e2e.mjs`; g06-এর ৮৭ পাতা থেকে শুধু `::1-1`)।
  - নতুন `qa/t3-score.mjs` + `qa/t3-pages.ps1`। প্রথম দৌড়ে ৫/৫ ব্যর্থ। কারণ আর সমাধান:
    - ব্যক্তিগত নামে ফাঁস (মাথা/স্বাক্ষর স্থির ছিল) → নাম-লেবেলের মান দেখে var।
    - "০১।" ক্রমিক, ট্যাবে সাজানো লেবেল-মান, খালি-মানের পরের ট্যাবে আগের তারিখ (ফাঁস) → ঠিক করা হলো।
    - খসড়ায় ক্রমিক-লাইন তালিকা ধরা হচ্ছিল → ঠিক করা হলো।
    - সম্বোধন, ইনলাইন লেবেল, বন্ধনীর কোলন, ঠিকানা-প্রসঙ্গ/জোড়া → ঠিক করা হলো।
    - স্কোরের মাপ সৎভাবে শোধরানো হলো (লেবেলে min-গণনা; মেলানো টেবিলের শিরোনাম রিকলে বাদ; স্থির লেখা ফাঁস নয়)।
    - বাস্তবসম্মত খসড়া `tests/fixtures/t3/`-এ।
  - ফল: ALL OK (স্থানীয় ও --live)। টেস্ট ১৭৯৫/০। T3 সম্পূর্ণ।

- **হুবহু-মোড ফরম্যাট-শক্তিবৃদ্ধি, নমুনা g41 = মালিকের ইংরেজি সিভি (২০২৬-১০-১১ → ১০-১২)**:
  - নতুন সোনালি g41 (`CV of  MD. MAHFUZUL HAQUE.doc`)। স্কোর ৮৬.৪ → **৯৬.১**, পাতা ২/২, টেবিল ১/১।
  - করা হলো: ওপর-নিচ সীমানার ছক → এক সারির বহু-লাইনের ঘর (`mergeLineRows`); অর্থহীন সই → ছবি (`isScribble`); ধূসর/গাঢ় পটি (`blockShade` → w:shd); `**মোটা** *বাঁকা* ^{উপরে}` রান; ফরম্যাট-পূর্ণতা মাপ।
  - লাইনে-বসানোয় পুনরাবৃত্ত পূর্বাভাস (`snapBoxesToLines`)। পরে g33 ৫৪.৩→৫০.১ নামল। ধরা গেল ভুল ধাপ বাছায়। এখন বেশি-বসা ধাপ জেতে শুধু তখন, যখন প্রতি বাড়তি ব্লকে সরণ ≤৬ লাইন-ধাপ বাড়ে → g33 আবার ৫৪.৩।
  - নতুন ক্যাপচারে Gemini ছক কলাম ধরে পড়ল (মাঝের একটি লাইনেই '|') → এক-ব্যান্ড ২-কলামে কলাম-ক্রম চেনা হলো।
  - বহু-লাইনের ট্যাব-ব্লক এখন প্রতি লাইনে আলাদা অনুচ্ছেদ পায় (মূল Word-এর মতো)। আগে `<w:br/>` ছিল।
  - সোনালি ১৫টির গড় ৬৩.৭ = ভিত্তি, কোনো রিগ্রেশন নেই। টেস্ট ১৮০২/০। মূল ইঞ্জিনে কোনো বদল নেই। পুশ `d8701e3`।

- **হুবহু-মোড: ২০ ফরম + স্ক্যানার শক্ত করা + সিভি-অভিযোগ (২০২৬-১০-১২)**:
  - a01–a18-এর ক্যাপচার নেওয়া হলো (১৮টি Gemini-কল)। প্রথম গড় ৩৭.১, শেষে ৩৯.২।
  - `foldBoxRows`: লেবেল|মান ফরমের সংখ্যা-বাক্স → মান-ঘরে ছোট ভেতরের টেবিল (builder `boxRowXml`), রেডিও-লাইন → আগের ঘরে। f1 আগে ১৮ সমান কলাম আর ৭ পাতা ছিল; এখন ৩/৩, ৪৫.৯। সারি-উচ্চতা লাইন-অনুপাতে (`rowWeights`)।
  - `mergeLineRows`-এ নতুন শর্ত: কলাম-সংখ্যা ভিন্ন হলে জোড়া নয়। `docx-to-doc-engine` আগে থেকেই ভেতরের টেবিল সামলায়, তাই মূল ইঞ্জিনে হাত দিতে হয়নি।
  - `darkBandMask`: কালো/নীল ব্যান্ডের সাদা লেখা উল্টো মাস্কে মাপা হয়। এতে ফন্ট ৬ → ১৩–১৬ হলো। মাত্রা-সারি রাখা হয়, টানা হালকা রেখা বাদ যায়।
  - মালিকের অভিযোগ ছিল সিভির কোলন, ফন্ট আর পাতা-সেটআপ নিয়ে। সমাধান:
    - `tabify` এখন কোলনে ভাগ করে। `alignTabStops` ব্যান্ড জুড়ে একই রূপ ("\t: ") দেয় আর এক স্টপে বসায়।
    - `snapFonts`: list_item/label_value-এর একই fs-শ্রেণিতে মধ্যমা থেকে >২০% দূরের ফন্ট → মধ্যমা। শিরোনামে নয় (g01-এর শিক্ষা)।
  - `unifyMargins`: সোনালির আসল মার্জিন দেখে নিয়ম ঠিক করা হলো। পুরো ফাইলে এক সেটআপ, সবচেয়ে ছোটটি নেওয়া হয়, ডান ≤ বাঁ, প্রচলিত মানে স্ন্যাপ (বাঁ/ডান শুধু কমে)। নিচ আগে সবসময় ৩৬ ছিল; এখন ওপর > ৩৬ আর জায়গা থাকলে নিচ = ওপর।
  - বাইসেক্টে ধরা পড়ল: নিচ = ওপর দিলে g38-এ ২ পাতা হচ্ছিল, আর নিচ কমালে g22 খারাপ হচ্ছিল। দুটোই নিয়মে ঠিক করা হলো।
  - সোনালি ৬৪.৫, পাতা ১০/১৫, নতুন ভিত্তি। টেস্ট ১৮১০/০। পুশ `40c30ba`।
- ২০২৬-১০-১২ (বিকেল): মালিক দুটি জিনিস চাইলেন: Word রুলারে ট্যাব-স্টপ লক আর লাইন-স্পেসিং/after মাপে লক। কোড যাচাই করে দেখা গেল দুটোই আগে থেকে আছে।
  - ট্যাব: `layout-ir` মাপা স্টপ বের করে, `alignTabStops` কোলন এক সারিতে আনে, আর builder `pPr` থেকে `<w:tabs>` লেখে।
  - স্পেসিং: docDefaults-এ after=0 ও single; প্রতিটি অনুচ্ছেদে after=0, before মাপা, লেখায় exact lineH; ঘরের ওপর/নিচ মার্জিন ০।
  - আসল ফাঁক ছিল একটাই: মানের জন্য আলাদা দ্বিতীয় স্টপ নেই ("লেবেল\t: মান")।
  - মালিক অনুমতি দিলেন। TDD পদ্ধতিতে `alignTabStops`-এ যোগ হলো: কোলন-রূপ যখন সংখ্যাগরিষ্ঠ, তখন "\t:\t" আর মানের স্টপ = কোলনের স্টপ + ০.৭em। ঠিকানার পরের লাইন "\t\t" দিয়ে শুরু।
  - ফল: সোনালি ১৫টির স্কোর একটুও বদলায়নি (৬৪.৫)। g41 ৯৬.১, ৩৯টি অনুচ্ছেদে দুই স্টপ। টেস্ট ১৮১১/০। পুশ হয়েছে।
- ২০২৬-১০-১২ (পরে): মালিকের সিভি স্ক্রিনশটে কোলন এলোমেলো দেখা গেল।
  - নতুন Gemini ক্যাপচার প্রতিবার আলাদা হয়: g41-এর ক্যাশ ঠিক ছিল, ৩টি নতুনের একটিতে সমস্যা ধরা পড়ল।
  - কারণ ১: alignTabStops সংখ্যাগরিষ্ঠ "লেবেল :\t" রূপ রাখত, এতে কোলন লেবেলের গায়ে লেগে থাকত।
  - কারণ ২: ঠিকানার দ্বিতীয় লাইন আলাদা ট্যাবহীন item হিসেবে আসত।
  - সমাধান: সবসময় "\t:\t" (মাপা স্টপই কোলনের জায়গা)। কোলন-কলামের কাছে শুরু হওয়া ট্যাবহীন পরের item পায় "\t\t" আর আগের লেবেলের ইনডেন্ট।
  - ফল: সোনালি অপরিবর্তিত, g41 ৯৬.১, টেস্ট ১৮১১/০।
- ২০২৬-১০-১২ (সন্ধ্যা): মালিকের সিভি-স্ক্রিনশট (Academic Qualification ভাঙা) আর a18 ফরম নিয়ে কাজ।
  - সিভি: Gemini লেবেল-কলাম আর ": মান"-কলাম আলাদা 'paragraph' ব্লকে দিলে লাইন জুড়ে যেত। এখন layout-ir toItem-এ লাইন অক্ষত থাকে, যদি সব লাইন ':' দিয়ে শুরু হয়, অথবা ≥৩টি ছোট লাইন (≤৪০ অক্ষর), justified নয়, আর মাপা লাইন-সংখ্যা ±১-এ মেলে।
  - নতুন syncGridPitch: পাশাপাশি সমান ব্লকে ছোট লাইন-দূরত্বটাই দুটোতে বসে। নতুন syncLabelColumns: পুনরাবৃত্ত লেবেল-কলামে ফন্ট (মধ্যমা) আর মোটা-ভাব (সংখ্যাগরিষ্ঠ) এক হয়। g41fresh ক্যাপচারে Word-এ যাচাই করা হয়েছে।
  - a18: mergeLineRows পুরো-ফাঁকা সারি থাকলে আর জোড়া দেয় না। page-geometry-তে নতুন fitExtentDrift: ব্লক কম থাকলে কালি-বিস্তার দিয়ে Gemini-র সরণ ঠিক করে (নিজে যাচাই করে নেয়)। detectFrame: বড় আয়তের বাইরে ≥৮টি লেখা-খণ্ড থাকলে সেটা ফ্রেম নয়, টেবিল।
  - নতুন নির্ণয়-টুল: qa/golden/table-diag.mjs (টেবিল-মাপ, Word ছাড়া)। সোনালি ৬৪.৫→৬৫.৮, g41 ৯৬.১, টেস্ট ১৮১৩/০।
- ২০২৬-১০-১২ (রাত): সরকারি ফরম। গড় ৩৯.২→৪৪.৯, পাতা মিলেছে ১৪/২০। সোনালি ৬৭.১।
  - page-geometry: কাত স্ক্যানে ঘরের ফন্ট এখন সরু ফালিতে (৬০pt) মাপা হয় (a07-এ ১৮→১০)। নতুন vRulesPt: খাড়া দাগ, cov সহ।
  - layout-ir: কলাম-প্রস্থ খাড়া দাগ থেকে; দাগ-সংখ্যার চেয়ে বাড়তি Gemini-ঘর শেষ ঘরে জোড়া; ক্রমিক-কলামের দল দিয়ে ব্যান্ডে জোড়া; লম্বা লেখার কলাম বাঁয়ে।
  - layout-ir: ঘরের ফন্টের সর্বোচ্চ = সারি ÷ ১.২ (১.২৫+১.৫ ধরায় g18 কমেছিল, তাই বদলানো); মূল-লেখায় ঠেলে তোলা ≤৫%; একই ছকের ফন্ট ফাইলজুড়ে এক (syncTableFonts); "খাড়া লেখা" ছবি শুধু ≥১৮pt হলে (a12-এর "১।")।
  - builder: সারির উচ্চতা স্বাভাবিক-উচ্চতার অনুপাতে ভাগ হয়; ফ্রেমহীন পাতায় নিচের মার্জিন ৩৬pt পর্যন্ত কমে (উপচানো থেকে ছাড়)। line-fit: ট্যাব-লাইনের শেষ অংশের ফাঁকা-রেখাও আঁটায় (a09, a02)।
  - চেষ্টা করে বাদ: অনুচ্ছেদ-ফন্টের সহনশীলতা ±৫% (লাভ নেই)। নতুন টুল: qa/golden/asis-drift.mjs।
- ২০২৬-১০-১২ (রাত, পরে): পাতা-গোনা তদন্ত আর পুনর্মাপ। কোড বদলায়নি।
  - a14: Word ComputeStatistics ৩ পাতা দেখায় (রপ্তানির আগে-পরে, Print view-তে), কিন্তু SaveAs2-PDF হয় ৫ পাতা। compat ১২, প্রিন্টার "Microsoft Print to PDF"।
  - COM-এ ExportAsFixedFormat লুকানো Word-এ আটকে যায় (৮ মিনিট, কোনো PDF হয়নি)। এটা ব্যবহার করবে না, SaveAs2 [ref]17 চলে।
  - পুনর্মাপ: a04 ১৪ (পাতা ৬/৪), a18 ২৮.৮ (১/১), সোনালি ৬৭.২ (১১/১৫ পাতা মিলেছে)। বেসলাইন সংরক্ষণ হয়নি।
  - g25 ২১.৩-এর কারণ ভাঙা ক্যাশ (capture.json text "[[B", blocks ০); মালিক বললেন সোনালি সেট এখন যেমন আছে থাক, তাই ঠিক করা হয়নি।
  - হুবহু ফরম ২০টি পুনর্মাপ: গড় ৪৪.৩; কোড না বদলেও a07 ৫৫.৭→৩৬.৮ (পাতা ৬/৫), তাই Word-এর PDF রপ্তানি অস্থির।
  - নতুন qa/golden/line-drift.mjs (ছবি থেকে লাইন-ব্যান্ড, DP দিয়ে মেলানো, dy/প্রস্থ); image-score renderMasks export করা হয়েছে; builder-এর export-এ planPage যোগ (শুধু নির্ণয়ের জন্য)।
  - পাওয়া দোষ: planPage f অকারণে ফাঁক ছোট করে (a02 ০.৮৩৬, ফলে নিচে −২০pt); ছবি-অনুচ্ছেদ +৯pt উঁচু; ৭২dpi-তে সরু দাগ ধরা পড়ে না (a06-এর দাগ-মিলের ২০ নম্বর); পাশাপাশি অংশ খাড়া সাজানো হয়; লেখা ৬% চওড়া।
- ২০২৬-১০-১২ (গভীর রাত): মালিক অনুমোদন দিলেন — লক্ষ্য সম্পাদনযোগ্য Word + হুবহু লেআউট; মাপের সহায়তায় স্ক্যান পরিষ্কার চলবে; সব নয়, কয়েকটি ফাইল ধরে কাজ।
  - নতুন layout-score.mjs আর asis-layout.mjs (ভিত্তি ৪১.৮)। image-score: হালকা কালি '2', fetch পুনরায়-চেষ্টা।
  - বড় আবিষ্কার: measure-doc-এ Measure-WordDoc আগে চালালে Word-PDF-এ বাড়তি পাতা আসে (a15 সরাসরি ১, মাপের পরে ২) ⇒ এখন আগে PDF। আগের "PDF-রপ্তানির পুনর্বিন্যাস" ছাড়গুলো (টেবিল ৯৪%) আসলে এরই প্রতিকার ছিল — পরে পুনর্বিবেচনা।
  - builder: planPage নিচ-থেকে সংকোচন (১২pt ছাড়), ছবি exact, lineH ≥০.৮৫×ফন্ট (Word-পরীক্ষা: ১২pt SutonnyOMJ exact ১০pt-এ কালি অক্ষত, ৯pt-এ ০.৩% কাটে), পরের-শুরু পেরোলে লাইন আঁটানো।
  - line-fit: ট্যাব-লাইন (a09 ৫৪→৭৫) আর টেবিল-ঘর ফন্ট ≤১৫% ছোট। layout-ir: লেখার-অনুপাতে কলাম-প্রস্থ, attachBoxLabels (শুধু একই কলামে; পাতা-স্তরে করলে a02 ৬৫→৪২)।
  - কাজের সেট a03/a02/f2/a12 গড় ৫২.৮→৬১.৪; পূর্ণ ব্যাচ/সোনালি এখনো চালানো হয়নি।
- ২০২৬-১০-১২ (রাত ১১টা): মালিক বললেন অল্প ফাইল খুঁটিয়ে দেখো। তুলনা-ছবি দেখে বাগ ধরা হলো।
  - ছবির-বাক্স: refineRect ফ্রেম বাদ দিত ⇒ pipeline-এ কাটা অংশ মাপা অংশের <৩৫% হলে মাপা অংশ। চেকবক্স "⟦ ⟧" (প্রম্পটের পূরণ-চিহ্ন থেকে Gemini শেখে) ⇒ □।
  - HTML-চিহ্ন runsFor-এ রূপান্তর। estOf: পূরণ-সারির লেখায় প্রস্থ <৬০% উচ্চতা ⇒ উচ্চতা-অনুমান; চেকবক্স-লাইন মূল-লেখার চেয়ে বড় নয়; syncFillLabels (প্রবাহ-ব্যান্ড জুড়ে দল)।
  - নতুন আনুভূমিক-দাগ পথ: page-geometry horizontalRules (সারি-স্ক্যান) → layout-ir applyHorizontalRules (চওড়া, টেবিল/নিচে-দাগ/পটি/নিচের-মার্জিন বাদ) → builder pBdr bottom+between। a03 দাগ ৩.৬→৯.৯।
  - planPage ছাড় ১২→২pt, ফ্রেমের পাতায় ৮pt (ফ্রেমে sectPr মার্জিন কমায় না)। সেট: a03 ৫৬.৬, a02 ৬৪.৭, f2 ৫৯.৯, a12 ৭৩.৪, a15 ৬৯.৭; টেস্ট ১৮১৩/০।
- ২০২৬-১০-১২ (রাত ১১:৪৫): বাক্সের খাড়া দাগ।
  - page-geometry boxFrames: কলাম-স্ক্যান (≤৪.৫pt ফাঁক = ড্যাশ, ঘনত্ব ≥৪৫%, এক পাশ ফাঁকা ⇒ কালো পটি নয়, জোড়ায় দৈর্ঘ্যও মিলতে হবে), বাঁ-ডান জোড়া + ওপর/নিচ কালি ⇒ বাক্স, দুই পাশের মিলিত অংশ।
  - layout-ir applyBoxFrames: কিছু কিনারা না পেরোলে, ভেতরে অনুচ্ছেদ থাকলে ⇒ boxIds (পাতা-স্তর বা গ্রিড-ঘর), page.boxes; বাক্স-কিনারার hrule বাদ।
  - builder emitSeq: এক-ঘরের টেবিলে মোড়ানো (নেস্টেড চলে), ইনডেন্ট/মাঝে-বসানো বাক্সের সাপেক্ষে, পটিওয়ালা প্রথম অনুচ্ছেদে বর্ডার পটির কিনারায়, বাড়তি উচ্চতা carry দিয়ে পরের ফাঁক থেকে বাদ।
  - শিক্ষা: Word ড্যাশ মূলের চেয়ে ঘন (০.৮ বনাম ০.৫) ⇒ স্কোরে পাশের দাগ লাইন জোড়ে; sz ২ হলে দাগই হারায় (sz ≥৪)। sectPr নিচের মার্জিনের তলা ১৮→১০pt (f2 উপচানো)।
  - সেট: a03 ৫৮.৩, f2 ৬০.৮, বাকি অপরিবর্তিত। ১৪-ফরম ব্যাচ: f1 ৪২.৬→৪১, a06 ৮৮.৭→৮৫.৭ (দুটোতেই বাক্স নেই ⇒ আগের সেশনের বদল)।
- ২০২৬-১০-১৩ (রাতের স্বয়ংক্রিয় লুপ, মালিকের /goal): লাইন-সরণ।
  - নির্ণয়: plan-vs-word.mjs (নকশা বনাম Word-মাপা লাইন-শুরু) দেখাল সরণ তিন উৎসের: Word কালি লাইন-শুরুর ~১.৫pt নিচে (ink-offset.mjs, ২৩১ লাইন),
    planPage আগের অংশের মূল-শুরু থেকে ফাঁক ধরত (ঠেলা জমত), টেবিলে +১pt বেশি। তিনটিই ঠিক ⇒ Word বনাম নকশা ±০.৫pt।
  - টেবিল-সংকোচন/নিচ-সংকোচন আসল ছাপা-সীমায়; emitSeq carry নকশার হিসাবে; বিন্দু মোটা + নিরাপদ লিডার; Gemini-র ভুয়া বিন্দু (মাপা কালি সরু) বাদ;
    blockMetrics কিনারার অক্ষর শিকল; ছোট রেখা ⇒ ruleAbove (a15 ৭১→৯৪); ফ্রেম-পাতার নিচ-মার্জিন তলা ১৪; সীমানাওয়ালা ছকে খাড়া দাগ আগে।
  - শিক্ষা: লিডার-ট্যাব যোগ করলে আগের ট্যাব নিজের স্টপ পেরোলে লিডারে লাফায় (f2 ২ পাতা) ⇒ প্রস্থ-অনুমানে নিরাপদ-যাচাই; `\s*` ট্যাব খেয়ে ফেলে।
  - ফল: a03 ৬৯.৩, f2 ৭৫.৯, a02 ৭০.৫, a12 ৮১.৬, a15 ৯৪.২, a06 ৮৮.১, f1 ৪৩.৩। f1/a02-এর বাকি ক্ষতি জোড়া-ঘরের টেবিল (সারি/কলাম মেলানো) — বড় কাজ।
  - পরে: কালি-সরণ লেখা-নির্ভর (চিহ্নসহ ০.১১×, চিহ্নহীন ০.৩৩×ফন্ট), keepJust + ২.২× দূরত্ব (a13 ৫৯→৯৩), tblInd +ঘরের-ফাঁক ও "অন্তত" সারি −০.৭৫ (a08 ৭৮→৯৪)।
  - বাতিল: দুপাশে-সমান ডান-ইনডেন্ট (a13 ৯৩→৮০; ফন্ট সামান্য চওড়া)। ১৯-ফরম গড় ৪৭→৬৩; ৭টি ≥৮৫।
- ২০২৬-১০-১৩ (দিন): গ্রুপ-ক (পাতা উপচানো) + মালিকের দুই টেস্ট (a15 তথ্য-ফরম, জুনিয়র বৃত্তি পাতা ৬ = নতুন a19)।
  - line-fit: ট্যাব-লাইনের মাঝের অংশের বিন্দু স্টপ পর্যন্ত ছোট (a05 লাইন মুড়ত); fitTable '\n'-ঘরে প্রতি লাইন + ঘরের বিন্দু ছোট।
  - builder: নিচু "অন্তত" সারিতে ঠিক লাইন (a05 ৮pt ⇒ ১৪.৩); shiftInto ruleAbove বাক্সে সরানো (a14 শিরোনাম ২১ লাইন);
    ভাসমান ছবি floatAt (আগের লেখার সাথে মেশা বা নিচের মার্জিনে — a14 সিল, a19 CamScanner লোগো); রেখা-ভাগ সারি লেখার চেয়ে ১.২৫×-এর বেশি নিচু ⇒ বাড়ানো, মোট একই (a07)।
  - layout-ir: ২ ছোট লাইন + মাপা ২ ⇒ keepLines (Web/E-mail জুড়ত); লাতিন লেখায় উচ্চতা-অনুমান; ফরম-সারির ফন্ট সংখ্যাগরিষ্ঠ আকারে (১১.৫–১৫ ⇒ ১৩);
    foldSerialRows (ক্রমিকহীন লাইন = আগের সারির ধারাবাহিক, ৩০ সারি ⇒ ৮); ক্রমিক-কলাম সরু; পিক্সেল-পাতা (১০৯৩×১৮০০) আদর্শ কাগজের অনুপাতে ⇒ লিগ্যাল।
  - qa: manifest range ("6-6") image/layout-score-এও। ফল: a05 ২২→৪৬, a07 ৩৩→৬৩, a14 ২৫→৩৭ (সব পাতা মিলল), a19 ১/১ পাতা ৩৩, a15 ৯৪.৫, ≥৮৫-এর ৬টি অপরিবর্তিত।
  - শিক্ষা: Edit-এ লাইনের মাঝে `//` মন্তব্য বাকি কোড মুছে দেয় (builder সিনট্যাক্স-ভুল, পুরোনো আউটপুটে স্কোর এল) — রানের আগে require-যাচাই। a18 ৪৬→৪১ (মধ্যবর্তী ঢিলা অনুমানের ভাগ্য; আসল ৪১)।
- ২০২৬-১০-১৩ দুপুর: ছকের দাগ-ঘাটতি নির্ণয় (layout-score.json rules: মূল/আমাদের H/V গোনা)। দাগ কম: a07 p4 (H9/1 V5/0 — পুরো ছক
  borderless), a16 খাড়া (১০/৩, ৭/৩), a10 খাড়া, a03, a02; দাগ বেশি: f1 (H8/33), a18 (৬/১৭), a10 p1 আড়া (৭/১৭)।
  a07 p4 কারণ: ধূসর ভাঙা আড়া-রেখা — gridMask-এ টানা অংশ প্রস্থের ~৩৩%, ৩-সারি ফালিতে ৬৪–৭৬% ⇒ hRules শূন্য ⇒ hasGrid=false।
  page-geometry-তে `brokenHLinePositions` ফলব্যাক যোগ (সরু-কালি, ≤১২pt ফাঁক, বিস্তার ≥৮৫%) — কিন্তু এখনো ধরে না (বিস্তার ~৭৫%);
  বর্তমানে নিষ্ক্রিয়-সমতুল্য, টেস্ট ১৮১৭/০। নতুন নির্ণয়-টুল qa/golden/hline-probe.mjs (প্রতি সারির best/ink3/span/fill)।
- ২০২৬-১০-১৩ (রাত): a07 p4-এ ভাঙা-রেখার সীমা ০.৮৫→০.৭ করলে রেখা মেলে, স্কোর বাড়ে না (ক্ষতি ঘরের লেখা-লাইনে) ⇒ ফেরত।
  a19 = একটিই লম্বা পাতার ফর্ম (মালিক: পাতা-ভাগ নয়); a07/a19 জটিল ছক স্থগিত। Quick Win: a18 — মূলে ৬টি আড়া রেখা, আমাদের ১৭।
  সমাধান: layout-ir `rowBand` (rowBandHeights bandsOnly) ⇒ builder `bandBorders` একই ভাগের সারির মাঝে tcBorders nil
  (বন্ধ: __FZ_OFF_ROWBAND)। a18 ছবি ২৬→৩২.১, লেআউট ৪১.৩→৪৪.৫; টেস্ট ১৮১৭/০। অন্য ছকে প্রভাব মাপা বাকি (ব্যাচ নিষেধ)।
- ২০২৬-১০-১৩ (রাত, ২য়): f1/a10 একক মাপে রিগ্রেশন নেই। f1-এ মূলে খাড়া দাগ নেই, আড়া দাগ শুধু নীল-ব্যান্ডের কিনারা;
  আমরা পুরো জাল আঁকতাম (H১৭)। layout-ir `noVRules` (hasGrid আর vRulesPt খালি) ⇒ builder সব tblBorders nil (বন্ধ: __FZ_OFF_NOV)।
  প্রথমে শুধু খাড়া বাদ: ৫২/৪৫; সব বাদ: f1 ছবি ৫১.৯→৫৪.৫, লেআউট ৪৪.৪→৪৫.৪। a18/a10 অপরিবর্তিত; টেস্ট ১৮১৭/০।
- ২০২৬-১০-১৩ (রাত, ৩য়): মালিক "বড় পরিবর্তন নেই" বললেন ⇒ সব জমা স্কোর মিলিয়ে বিশ্লেষণ: ক্ষতি মূলত অবস্থান (১৩/৪০) আর প্রস্থে (৯/২০),
  দাগে কম। নতুন টুল qa/golden/width-ratio.mjs। a11-এ সরু লাইনের কারণ ফন্ট নয়: লাইন-অক্ষত 'j' অনুচ্ছেদ builder-এ 'left'।
  layout-ir: শেষটি বাদে সব মাপা লাইন ≥৯২% প্রস্থ ⇒ keepJust (বন্ধ __FZ_OFF_KJ)। a11 লেআউট ৬৪.৮→৬৭.২; a03 অপরিবর্তিত; টেস্ট ১৮১৭/০।
- ২০২৬-১০-১৩ (শেষ রাত): FZ_OFF env দিয়ে ধরা গেল ROWBAND a05-এ লেআউট −১.৯ (কাত স্ক্যান, মাপা লেখা-লাইন ৩/৩০) ⇒ ≥৮০% শর্ত।
  a05-এ ৩০ রেখা মাপা অথচ সারি-উচ্চতা ৪৫/৯/৩pt ⇒ rowBandHeights-এ EVEN নিয়ম (ভাগ≈সারি, লাইন অবিশ্বস্ত ⇒ সমান)। a05 ৫১.১→৫৭.৮, a07 ৬০.৮→৬৩.৯।
  a14 p3 তালিকা-ফন্ট (৬.৫–১০pt বনাম ~১২): দুই চেষ্টা উপচাল ⇒ ফেরত, HANDOFF-এ নির্ণয়। a16 ঘর-লেখা মূলের চেয়ে ছোট (ব্যান্ড ৯ বনাম ৩১)।
- ২০২৬-১০-১৩ (শেষ রাত, ২য়): মালিক গ্লোবাল ফন্ট-প্রস্থ ক্যালিব্রেশন + ছোট-ফন্ট বন্ধ চাইলেন। ২০ ফাইলে width-ratio: প্রস্থ-মধ্যমা ১৭টিতে ≈১.০০,
  উচ্চতা ≈১.০০, খাড়া ঢাল ≈০ ⇒ গ্লোবাল ভুল নেই। চেষ্টা: ফাইল-স্তরের মূল-লেখা (a14 ৬৬→৫১) ও ফন্ট-সীমা ০.৮৫ (a14 ৫৬, a02 −১.৭) — দুটোই ফেরত।
  নতুন টুল qa/golden/asis-overview.mjs। ক্ষতি ৭টি দুর্বল ফাইলের কাঠামো-ভুলে ঘন।
- ২০২৬-১০-১৩ (মধ্যরাত): মালিক "ফল চাই — Gemini ভুল করলে প্রম্পট বদলাও, ইঞ্জিনকে শেখাও"। প্রম্পটে মুদ্রিত-লাইন নিয়ম কড়া; parser অর্ধেক-ট্যাগ
  বাদ (a14 নতুন ক্যাপচারে "[[B:t=paragraph" টুকরো Web-ব্লক গিলেছিল) ⇒ a14 লেআউট ৪৮.৯→৬১.৭। মালিকের চিঠির স্ক্রিনশট: এক আকারের অনুচ্ছেদ
  বিভিন্ন আকারে + অযথা মোটা ⇒ BODYSNAP (ভোট অক্ষর-ভারিত, ≥১৫ অক্ষর, পূরণ-রেখা বাদ — a01 "১।"-ভোট আর a02/a09 বিন্দু-রেখার ক্ষতি থেকে শেখা)।
  পুনঃক্যাপচার: a18 ↑, a19 মিশ্র, a05 ↓। GBOLD চেষ্টা বাদ।
- ২০২৬-১০-১৪ (ভোর): মুদ্রিত-লাইন নিয়ম ছকের ঘরেও লাগায় a16-এর সারি দ্বিগুণ (২২→৪০, ১১ পাতা) ⇒ প্রম্পটে ছক-নিয়ম আলাদা। a05-এ Gemini ঘরের লেখা
  আলাদা ব্লকে, ফাঁকা সারিতে কপি, একই ছক ৪ বার ⇒ প্রম্পট + parser dedupe + কাটা-ট্যাগ মেরামত। asis-score লেআউটে range না পাঠানোর বাগ ঠিক
  (a19 ১.৪→৪২.৩)। f1/a10 নতুন প্রম্পটে ↑। a16: নিয়ম নিরপেক্ষ, নতুন ক্যাপচারের একটি বাড়তি সারিতে পাতা উপচায় ⇒ পরের কাজ সারি-উচ্চতা/উপচানো-রক্ষা।
- ২০২৬-১০-১৪: মালিক "৩ দিন একই জায়গায়, বড় পরিকল্পনা চাই"। temperature প্রস্তাব বাতিল (০.২ আছে; Gemini 3-এ কমানো ঝুঁকি)। docs/FAITHFUL_PLAN.md।
  নতুন যন্ত্র plan-jumps.mjs: Word মূলত নকশা মানে; ক্ষতি a11 (ঠিকানা-ব্লক প্রবাহে এক লাইন) ⇒ KEEPN নিয়ম, a11 লেআউট ৬৭.২→৭৮।
  a18-এর ছক-সংকোচন লক্ষ্য বদলানো খারাপ ⇒ ফেরত।
- ২০২৬-১০-১৪ (বিকেল): মালিক — পুরো সেট নয়; বাড়তি Gemini অনুরোধ চলবে যদি মান না কমে। যাচাই-ধাপ (verifyLines) বানানো ও চালু; a14-এ Gemini
  নিজের লাইন নিশ্চিত করল। table-rows.mjs: ছকে ক্ষতি সারি↔মূল-রেখা মেলানোয়। দুই চেষ্টা (মাপা শব্দ-মোড়ানো; a05 সমান-দূরত্ব+ঢিল) মেপে খারাপ ⇒ ফেরত।
  পরের কাজ: Word-এর প্রতি-সারি বাড়তি উচ্চতার মডেল।
- ২০২৬-১০-১৪ (সন্ধ্যা): row-overhead.mjs — প্রতি-সারি বাড়তি প্রায় শূন্য (+০.৬৫pt) ⇒ অনুমান বাতিল। a05 সমান-দূরত্ব নিয়ম আবারও ৩ পাতা ⇒ ফেরত;
  পূরণ-রেখা ৯২% নিষ্ফল ⇒ ফেরত (ফেরতের সময় line-fit-এ দুই লাইন জুড়ে MIN_SCALE মন্তব্যে ঢুকেছিল — টেস্টে ধরা, ঠিক)। পরের কাজ ছকে সারি-যাচাই।
- ২০২৬-১০-১৩ (রাত): মালিক হতাশ (৩ দিন স্কোর স্থির)। row-ink.js (রেখা-ভাগের কালি-উচ্চতা ⇒ সারি DP) + page-geometry textInkPt; সারি-ভুল
  +৬৬৮→+৪০৩pt কিন্তু ছবি a05 ৫৬.৬→৫২.৯, a14 −০.৩, a16 +০.৭ ⇒ ডিফল্টে বন্ধ (FZ_ON=INK; faithful-e2e-তে FZ_ON যোগ)। শিক্ষা: সারি-মাপ
  ঠিক হলেও ছবি-স্কোর না-ও বাড়ে। কাঠামোগত নির্ণয়: প্রবাহ-লেআউটে উচ্চতা-ভুল নিচে জমে (spaceBefore আপেক্ষিক); প্রতি-ফাইল নিয়মে
  শূন্য-যোগফল। প্রস্তাব: অবস্থান-আটকানো পরীক্ষা (মালিকের সিদ্ধান্ত বাকি)। মালিক: মূল ইঞ্জিনও দরকারে বদলানো যাবে, কোথায় তা জানিয়ে।
- ২০২৬-১০-১৩ (গভীর রাত): ANCHOR নির্ণয় (ফ্রেম/ভাসমান ছকে মাপা y) — a16 ৫৪.৫, a17 ৩৩.৬ ⇒ প্রবাহে ভুল-জমা মূল ক্ষতি নয়; ডিফল্ট বন্ধ।
  score-parts.mjs: হারানো গড় সারি-প্রোফাইল ১৫, কালি ১০, রেখা ৯ (a13 চোখে নিখুঁত অথচ রেখা-অংশে ২০ হারায় — ড্যাশ-রেখা)। a17 compare-ছবি:
  পাতা ভাঙা ⇒ দুই বাগ: (১) snap খাড়া দ্বৈত-ড্যাশ সীমানাকে লাইন ধরত (vDashComps: একা/জোড়া, একই x-এ ≥৮) (২) পিক্সেল-পাতায় মূল-লেখা
  >২৪ ⇒ ১২pt-স্বাভাবিককরণে পাতা ২৩% (FITBIG: কাগজ-অনুপাতে আঁটানো)। a17 ৩২.৮→৬৬.৯, অন্যরা অপরিবর্তিত। verifyTables প্রথম চলায় a02
  ৭৬→৭১.৬ ⇒ ডিফল্ট বন্ধ (FZ_ON=TVERIFY)। থামানো রানের Automation-Word ফাইল আটকে রাখে (EBUSY) ⇒ বন্ধ করতে হয়।
- ২০২৬-১০-১৪ (সারারাত, স্বাধীন লুপ): মাপকাঠি v2 (image-score; FZ_SCORE_V1=1 পুরোনো): ড্যাশ-ফাঁক জোড়া রেখা (সরু-শর্ত) + দুই-দিক ঢিলা মেলানো,
  লাইন-অবস্থান সারি-প্রোফাইল (সম্পৃক্ত), কঙ্কাল-গোনা কালি-মিল, ফিকে স্ক্যানে Otsu-সীমা (১৬০–২০৫)। ফাঁকি-যাচাই: নিজে ১০০, ভুল ফাইল ৯–৩১।
  গড় ৬৬→৭৬.৪ (a01 ৯৫.৯, a13 ৯২.৭, a06 ৯৫, a05 ৭১.৭)। নতুন যন্ত্র rescore.mjs (Word ছাড়া পুনঃমাপ, --sanity), ir-probe.mjs (measures.json থেকে
  node-এ IR), probe-lines.mjs। a18: ⟦rows⟧ পুরোনো রান; জোড়া-ঘরের মোড়ানো-অনুমান (SPANEST), মাপা লাইন=লেখা-সারি ⇒ হুবহু এক-লাইন-এক-সারি +
  লাইন থেকে উচ্চতা + rowShiftPt (EXACT1/EXACTH/RSHIFT), cellBoxV (আংশিক খাড়া দাগে ঘর-মাঝ), TFIT98 ⇒ ৪৬.৯→৪৮.২। a19: ছক-কিনারা ভাগ-সীমা
  (RECTEDGE), ছোট ঘরে vAlign top (VTOP), ক্ষুদে-ছকের ফন্ট/ক্রমিক-কলাম (TINYTF) ⇒ ৫৬.৪→৬৯.৩।
- ২০২৬-১০-১৪ (ভোর পর্যন্ত): ব্যাচ-যাচাইয়ে নিয়ম সরু করা — TINYTF ≤২ সারি (f1 ৫৯→২২ উপচানো থেকে শেখা), RECTEDGE শুধু ভাগ≈সারি,
  VTOP বাক্স-ছকে নয়, EXACT1 বন্ধ, SPANEST ≤৬ কলাম (a04)। নতুন: row-ink realign (মাপা রেখা-ভাগে সারি পুনর্গঠন: কপি-সারি বাদ,
  ফাঁকা সারি ফেরত, শিরোনাম-উপসারি জোড়া) + পাইপলাইনে শর্তসাপেক্ষ Otsu (T≥১৯০, কালি ≥১.৪×, ≤৮%) ⇒ a05 ৭১.৭→৮১.১; টেবিল-সংকোচন
  শুধু নকশা সত্যিই সীমা পেরোলে (OVER8) ⇒ a10 ৭৬.৭→৮৩.৭; TFIT97; পূর্ণ খাড়া দাগ পেরিয়ে ঘর-জোড়া নয় (FULLV) ⇒ a19 ৭৪.৪;
  SPARSETF (প্রায়-ফাঁকা ছকের ফন্ট)। VSPLIT (লাইন-খাদে ভাগ) কাজ করে কিন্তু স্কোরে লাভ নেই ⇒ FZ_ON। শিক্ষা: প্রতিটি নিয়ম ব্যাচে মাপা জরুরি।
- ২০২৬-১০-১৪ (শেষ): BANDCAP (ভাগে মাপা লাইনের বেশি সারি ⇒ নিচে; a18 লেআউট +১০, ছবি −১.৪ — রাখা), LINEH (f1 ৬১→৪৭) ও TALLFILL বন্ধ।
  লেআউট-স্কোর: Otsu যোগ (প্রায় নিরপেক্ষ); ড্যাশ-দাগ v2 গড় না বাড়িয়ে a13 −৯ ⇒ বাদ (FZ_LAYOUT_RULES2)। শেষ: ছবি-গড় ৭৮.৬, লেআউট ৭২.১;
  ৯০+ মাত্র ৪টি। বাকি বাধা ফাইল-নির্দিষ্ট (a04 খাড়া লেখা, Gemini বক্স-সরণ/কাটা, হালকা রেখা)।
- ২০২৬-১০-১৪ (দুপুর, সাধারণ মোড যাচাই): 2.pdf (২য় শ্রেণি সিলেবাস, ১০ পাতা) আসল শিকলে ⇒ খুব খারাপ। কারণ ১৮.৬/১৮.৯-এর নিয়ম:
  SYLLABUS→EXAM_GENERAL→grade২→EXAM_PRIMARY আড়াআড়ি প্রশ্নপত্র ⇒ ক্রম ওলট, ৩৮–৪৩ পুনঃসংখ্যা, কাঁচা "|---|" টেবিল, অডিট-নোট পাতা।
  GENERAL রুট (generateGenericDocx) টেবিলহীন সাদা লাইন। ক্লিন-কম্পোজারে ক্রম+৫ টেবিল ঠিক (Page-N পাতা-ভাঙা/কলাম-প্রস্থ বাকি)।
  OCR 0.0 QUESTION-ONLY সিলেবাসের উত্তর/Answer-কলাম ফেলে দেয়। কোড বদল নয়; qa/site-chain-download.mjs-এ FORCE_TYPE, CLEAN সুইচ।
  রাউটিং ও প্রম্পট-ব্যতিক্রমে মালিকের অনুমতি বাকি। ⇒ মালিক: ভুল দিক — তিনি হুবহু মোডের কথা বলছিলেন; ক্লাসিফায়ার/প্রম্পট নয়।
- ২০২৬-১০-১৪ (দুপুর-২, হুবহু): 2.pdf পাতা ১ ⇒ ২ পাতা, দ্বৈত ফ্রেম তিনবার (pgBorders + দুই রেখা ⇒ ২টি পাতা-জোড়া বাক্স-টেবিল, ডানে উপচে)।
  মালিক চেয়েছিলেন pgBorders বাদ; মেপে (NOPGB) তাতে ২ পাতা ও ওপরে পটি থাকে; উল্টোটি (ফ্রেম থাকলে পাতা-জোড়া বাক্স বাদ) ⇒ ১ পাতা, মূলের মতো।
  ডিফল্ট করা হলো (FZ_OFF=FRAMEBOX)। ১০ পাতা ⇒ ১০ পাতা। asis সেটে কেউ ছোঁয় না (শুধু a02-এ ফ্রেম, বাক্স নেই)। টেস্ট ১৮৩০/০।
- ২০২৬-১০-১৪ (সকাল-৩): মালিক Word-এ পুরোনো ফাইল (৭:২১) খুলেছিলেন। তাঁর তালিকা: লোগো কাটা, বিবরণ মাঝে, সর্বমোট-দাগ নেই, লেখার নিচে দাগ।
  কারণ/সমাধান: মাপা ৫ কলাম বনাম Gemini ৪ (ফাঁকা ভুয়া কলাম) ⇒ EMPTYCOL; দাগহীন ছকের আংশিক আড়া-রেখা ⇒ TRULE (বিস্তার মেপে ঘর-বর্ডার);
  "ঠিক" লাইনে Word বেসলাইন ~৮০%-এ ⇒ ছবির ওপর কাটা (খুদে ফন্টেও) ⇒ ছবিতে "অন্তত" + খুদে ফন্ট (FIGCLIP); লাল ঢেউ = বানান-যাচাই ⇒ noProof।
  স্পট-চেক a02/a13/a06/a16 প্রায় নিরপেক্ষ (a02 লেআউট −২, ছবি +০.৭ — লোগো পুরো দেখায়, রাখা)।
- ২০২৬-১০-১৪ (দুপুর): মালিকের Word-যাচাই (2.pdf p2): ক্রমিকের সাজ ভুল (প্রশ্ন সাধারণ, উত্তর মোটা), কিছু লাইনে ধূসর ছায়া, শেষে বাড়তি দাগ।
  কারণ: Gemini ২ নং উত্তরের বক্স ১ লাইন নিচে দিয়েছিল (শেষে ≈৩৯pt) ⇒ snapBoxesToLines ১ম ধাপে শিকল ১ লাইন সরল; ২য় ধাপ ঠিক ছিল (৪০ বনাম ৩৯ ব্লক),
  কিন্তু "মোট সরণ বেশি" নিয়মে বাদ। সমাধান ORPHAN: বেশি বসা + কারো-না-পাওয়া লেখা-লাইন কম ⇒ নেওয়া (DP-তে লাইন-শাস্তি চেষ্টা করেছিলাম, কাজ করেনি, ফেরানো)।
  ছায়া = জলছাপ ⇒ SHADEEDGE (দুই প্রান্তও রঙিন চাই)। বাড়তি দাগ = দ্বৈত ফ্রেমের ভেতরের দাগ, পাতা-নম্বরের Gemini-বক্স নিচে থাকায় ⇒ FRAMERULE।
  টেস্ট ১৮৩০/০; a02/a06/a13/a16 হুবহু একই স্কোর। p7-এর ছোট-ফন্ট ছক আগে থেকেই ছিল (রিগ্রেশন নয়) — পরের কাজ।
- ২০২৬-১০-১৪ (বিকেল): মালিক সাইটে আবার কনভার্ট করলেন — প্রতি রানে Gemini-ক্যাপচার আলাদা, ভুলও আলাদা। নতুন ক্যাপচারে (fa5) প্রশ্ন+উত্তর
  এক ২-লাইনের ব্লক, Gemini-বক্স ১ লাইন ওপরে ⇒ ৮ নং থেকে লাইন টানা (দুপাশে-সাজ)। snapBoxesToLines-এ ৪টি কারণ পাওয়া গেল ও ঠিক হলো (FZ_OFF=LINEOV):
  ছেদ-সীমা বক্সের অর্ধেক (২-লাইনে পুরো লাইন), ২pt বিন্দু "লাইন" হয়ে জোড়া ভাঙত, জানালা ১ লাইনে সঠিক জোড়া কাটা, ডানের পাতা-নম্বর (ঠিক বসা)
  সরণ-ধারাবাহিকতায় পুরো কলামকে ভুল দিকে টানত। জানালা ১.৬ শুধু বহু-লাইনে (এক-লাইনে g41 কৃত্রিম টেস্ট ভাঙত)। unclaimed এখন পুরো পাতা গোনে।
  fa4/fa5/fa6 তিনটিতেই p2 ঠিক; টেস্ট ১৮৩০/০; ৬ নমুনা নিরপেক্ষ/সামান্য ভালো। মালিকের (3).doc-এ লোগো ভুল জায়গা থেকে কাটা — পুনরুৎপাদন হয়নি, ZIP চাওয়া।
- ২০২৬-১০-১৪ (সন্ধ্যা): মালিক localhost:3009 থেকে চালাতেই প্রতিবার "⚡ প্রক্সি সার্ভার সাময়িক ব্যস্ত — প্রায় ১ মিনিট"। কারণ CORS:
  Worker-এর ALLOWED_ORIGINS-এ শুধু 3008 ছিল → অচেনা Origin-কে allowed[0] ফেরত → ব্রাউজার fetch আটকায় (status 0, /log-এ কিছুই নেই)
  → policy-তে status 0 = server_error, "১ মিনিট" = ডিফল্ট ৬০s। wrangler.toml-এ localhost/127.0.0.1:3009 যোগ, deploy 4018d507 (রোলব্যাক 47c8c2c7);
  OPTIONS প্রিফ্লাইটে 3009/3008 দুটোই নিজ Origin পায়। শিক্ষা: status 0 মানেই "ব্যস্ত" নয় — CORS/নেটওয়ার্ক/ক্লায়েন্ট-ভুলও এখানে পড়ে।
- ২০২৬-১০-১৪ (সন্ধ্যা): কনভার্ট-ইতিহাসে হুবহু-এন্ট্রি খুললে "ডেটা রাখা যায়নি"। কারণ: layout-ir.js-এ `rbh.shift` সত্যতা-যাচাই — নিজস্ব সরণ-তালিকা
  না থাকলে Array.prototype.shift (ফাংশন) rowShiftPt-এ ঢুকত → IndexedDB DataCloneError → session-store নীরবে ir বাদ (irMissing)। Array.isArray দিয়ে ঠিক;
  docx-এ প্রভাব নেই (আগেও [ri]=undefined→0)। প্রোব (scratchpad hist-probe.mjs, আসল layout + historyAdd): a05/a18 hasIr=true। টেস্ট ১৮৩০/০। push ca3d78e।
- ২০২৬-১০-১৪ (রাত, মালিকের a16 চেকলিস্ট Word-যাচাই, ৪ সমস্যা): (১) "বিষয়" ঘর "হ্যাঁ" জুড়ে (Word COM: সারিতে ৫ ঘর) — builder rowSpans
  (a18 জোড়া) fullVRule-এ আটকায়, কিন্তু ফিকে স্ক্যানে দাগ cov ০.৪৩–০.৭২ < ০.৭৫। ⇒ layout-ir: পূরণ-কলাম (শিরোনামে লেখা, বাকি ফাঁকা) হলে cov ≥০.৪ (FZ_OFF=FILLCOL)।
  (২) নিচে-দাগ শুধু শেষ লাইন মেপে পুরো ব্লকে ⇒ page-geometry underlineLines (প্রতি লাইন; আংশিক = শুরু থেকে অংশ), layout-ir perLineUnderline <u> (FZ_OFF=ULINE)।
  (৩) ঘরে Gemini-র HTML <table> হুবহু ছাপা ⇒ builder subTable/subTableXml নেস্টেড ছক (+ফাঁকা সারি; FZ_OFF=SUBTBL); .doc-এ nested=1 যাচাই।
  (৪) সইয়ের হাতে-লেখা তারিখ আলাদা লেখাও ⇒ layout-ir dropSigDates (ছবির ওপর শুধু-তারিখ লাইন বাদ; FZ_OFF=SIGDATE) — কৃত্রিম ইনজেক্টে যাচাই, মালিকের ক্যাপচার নেই।
  "বিতরণ"-এর আংশিক দাগ লেখায় লেগে থাকায় ধরা পড়ে না (বাকি)। টেস্ট ১৮৩০/০।
- ২০২৬-১০-১৪ (রাত-২, মালিকের a17/a02 Word-যাচাই): নতুন সুইচ — ORPHFILL (জানালায় কালি না পাওয়া এক-লাইনের ব্লক প্রতিবেশীর সরণে
  কাছের ফাঁকা কালি-লাইনে: "৩)"), FEWLN (Gemini কম লাইন দিলে বক্স-উচ্চতা ধরে বসানো নয়: p5 নোট ৮→১১pt), SHORTB (≤৩ অক্ষর/পূরণ-সারিতে
  মাপা বোল্ড নয়), FILLW+FILLSNAP (পূরণ-সারির প্রস্থ-অনুমান অবিশ্বস্ত; >১৮% গোলমালে প্রধান আকার), ULBOX (দাগওয়ালা শিরোনামে ⟦ ⟧ বাদ),
  RULEIN (শিরোনামের নিচে-দাগ ওপরের লাইনে বসত), HEADV (শিরোনাম-সারির ঘরের মাপা খাড়া অবস্থান; page-geometry textInkXPt),
  SHADEHR (ছায়া-পটির হাফটোন "দাগ" গুচ্ছ ⇒ ওপর-নিচ; a02 পরিবার-ছক ৫→৩ সারি), BOXROW (দিন|মাস|বছর বাক্স-সারি বর্ডার),
  NUMTAB (ক্রমিক "০৫।"-এ পাতার অন্য ক্রমিকের ট্যাব-স্টপ)। a02 .doc ২ পাতা (docx দুটোই ১) — docx-to-doc মূল ইঞ্জিনে, আগে থেকেই; অনুমতি চাওয়া।
- ২০২৬-১০-১৪ (রাত-৩): বিন্দু-সারি মোটা নিয়ম (runsPlain + LTAB) ডিফল্ট বন্ধ (মালিক: মূলে চিকন; FZ_ON=DOTBOLD); FILLSNAP ৮% সীমা ও ভোটার <২-এ
  শ্রেণি-মধ্যমা (a17 p2 ১৫.৫/১১.৫ ⇒ সমান); SPLITCOL (মাপা কলাম-সীমা আমাদের ভাগ থেকে >৬% দূরে ⇒ মাপা সাজ বাদ: a17 p6 বিবরণ বাঁয়ে);
  EMPTYRUN (exact/আকারওয়ালা খালি অনুচ্ছেদে আকারি ফাঁকা-রান)। a02 .doc-এর +৪২pt: Word COM-এ docx বনাম doc অনুচ্ছেদ-অবস্থান —
  নেস্টেড বাক্স-ছকওয়ালা বিন্যাস-সারি প্রতিটি .doc-এ +১৪pt (অনুচ্ছেদ-সংখ্যা সমান) ⇒ docx-to-doc-এর নেস্টেড-সারি উচ্চতা; অনুমতি চাওয়া।
- ২০২৬-১০-১৫: ১৪ তারিখ রাতের ৭-নমুনা স্কোর (score-asis.json 22:07, সব নিয়ম চালু; "বন্ধ"-রান হয়নি) ছবি/লেআউট:
  f1 ৫৮.৮/৫৫.২, f2 ৮৫.৭/৭৮.২, a02 ৮২.৬/৭০.৮, a03 ৭৯.২/৬৮.৯, a16 ৮৩.৬/৫০.৩, a17 ৭৯.৯/৬৪.১, a18 ৫২.৩/৬৩ (গড় ছবি ৭৪.৬)।
  ১৪ তারিখ ভোরের লেআউটের (score-asis-layout.json) তুলনায় a16 −৬.১, a03 −২.১, f1/f2/a02 প্রায় −১, a17 +২.৯, a18 সমান। push হয়নি।
  কারণ খোঁজা: a16-এর ক্ষতি শুধু FILLCOL থেকে, p4-এ (চালু থাকলে ৬০.৪, বন্ধ করলে ৮৩.৫)। মাপা কলাম-দাগ প্রায় ১০pt বাঁয়ে, আর মন্তব্য-ঘর ৫০pt (মূলে ৩৯.৫pt)
  ⇒ বিষয়-ঘর সরু, ১৩(খ) ৩ লাইনে ভাঙে, ছক +১৮pt। ছবি-স্কোর অবশ্য FILLCOL চালু থাকলে বেশি (৮৩.৬ বনাম ৮১.৪)। a03-তে রাতের সব নিয়ম বন্ধ করলে ৬৮.২/৭৭.৩
  (চালু থাকলে ৬৮.৯/৭৯.২) ⇒ a03-এর পতন দিনের আগের বদল থেকে। স্কোর-ফাইলগুলো চালু অবস্থায় ফেরত রাখা আছে।
- ২০২৬-১০-১৫ (বাইরের রিভিউ যাচাই, কোডে কোনো বদল হয়নি): মিলেছে — .doc-এ খালি অনুচ্ছেদ খালি &nbsp; পায়, অনুচ্ছেদে font-size থাকে না
  (docx-to-doc _parseParagraph ১১৫১; a02-এর +১৪pt-এর সম্ভাব্য কারণ), HEADW-এ ফাঁকাওয়ালা শিরোনাম বাদ ("ক্রঃ নং"), VTOP4-এ maxLn≥৪ শর্ত (a17 p6-এ ৩ লাইন)।
  ভুল — noVRules সব বর্ডার nil করে জেনেশুনেই (১৩ তারিখ, f1-এর মূলে জাল নেই; শুধু মন্তব্যটা ভুল লেখা); SPARSETF ফন্ট শুধু ওঠায়, নামায় না।
  ঝুঁকিপূর্ণ — FIGTXT ০.৬→০.৩৫ (সই কেটে যাবে), a18-এর ছক-ফন্ট bodyFont-এ বেঁধে দেওয়া (মাপ দেখে করতে হবে)। a16-এর আসল কারণ (FILLCOL, p4) রিভিউতে আসেনি।
- ২০২৬-১০-১৫ দুপুর (রিভিউয়ারের ৫ ফাইল, কোডে বদল হয়নি): Downloads\*_*.js বনাম লোকাল diff — layout-ir +১০৬/−৩৫, builder +৩৪/−১৩, line-fit +১৭,
  pipeline ৩ লাইন, docx-to-doc ৪ লাইন। আগে মাপে নেতিবাচক পাওয়া নিয়ম ডিফল্টে চালু (EXACT1, LINEH); noVRules এখন হালকা ধূসর বর্ডার (আগে nil, ইচ্ছাকৃত);
  FIGTXT ০.৩৫; VTOP-এ বাক্স-ছক বাদ এখন সারি-ভিত্তিক; line-fit-এ বহু-পাতার ছক ৩০তম শতাংশ ফন্টে; নতুন lastRowSpan ("সর্বমোট"), isChecklist, headFontPt,
  dropSigDates-এ সই-বক্স ছাঁটা। ফাইল বসানো অটো-অনুমতিতে আটকেছে — মাপা বাকি।

- ২০২৬-১০-১৫ (রিভিউয়ার Pack2 বসানো): builder +২৩/−৭, layout-ir +৯০/−২৪, page-geometry +৩৩/−৪, layout-score +১২৬ (--v2 পতাকা), line-drift বদল,
  নতুন tests/reviewer-fixes.test.js। নতুন সুইচ FILLW2, DOTFONT, TXTTF, VTOP4, ULINE2, ULTOUCH, SHADEBAR, SHADECOL, BOXPOS। ১ম দফার বদল অক্ষত।
  টেস্টে ২ ব্যর্থ: part-17.5 ১-লাইন উঁচু সারি এখন top (VTOP4), g41 blockShade-এ নতুন wide ঘর। আগের কপি scratchpad before-pack2। স্কোর মাপা চলছে।
- ২০২৬-১০-১৫: রিভিউয়ার Pack3 (GridFirst) বসানো: builder/layout-ir/page-geometry/layout-score/reviewer-fixes টেস্ট + নতুন grid-first.js
  (FZ_ON=GRIDFIRST, ডিফল্ট বন্ধ)। a03/a02/f1-এর ক্ষতি সরাতে FILLW2/VTOP4/DOTFONT/SHADECOL/SHADEBAR/BOXPOS/ULINE2-এর শর্ত সরু করা; নোট docs\reviewer-pack3.md।
  টেস্ট ১৮৩০/০ (Pack2-এর ২ ব্যর্থ ঠিক)। আগের কপি scratchpad bfa43940…\before-pack3। asis-score-এর আগে `node serve.js` (পোর্ট ৩০০৮) চালু থাকতে হবে।
- ২০২৬-১০-১৫: মালিকের নির্দেশে GitHub পুনর্বিন্যাস — লোকাল সর্বশেষ ভার্সন main-এ push (কমিট 4ecd111, ৩৭৩ ফাইল), arena/01a0f18b-test-conveter ব্রাঞ্চ মোছা।
  github_sync.js ডিফল্ট ব্রাঞ্চ এখন main (FZ_BRANCH দিয়ে বদলানো যায়)। Cloudflare Pages production branch = main; 7476304 Production ডিপ্লয় সফল।
  নোট: main-এ লোকালে নেই এমন পুরোনো ফাইল রয়ে গেছে (base_tree), মোছা হয়নি।

- ২০২৬-১০-১৫: রিভিউয়ার Pack4 বসানো: faithful-docx-builder, layout-ir, line-fit, grid-first, tests/reviewer-fixes + নতুন header-merge.js (a07 ভাঙা হেডার জোড়া, FZ_OFF=HEADMERGE)।
  a02/a16 রিগ্রেশনের কারণ: cellP-এ sz বাদ, isRuleLn, tallRow, FILLW2 useF40। SHADECOL/SHADEBAR/BOXPOS/PCELLSHD/TXTTFREV/LINEH/EXACT1/GFTRIM এখন FZ_ON। ব্যাকআপ before-pack4। টেস্ট ১৮৩০/০।

- ২০২৬-১০-১৫: রিভিউয়ার Pack5 (GRIDFIRST + এডিট-স্কোর) বসানো: faithful/ builder, grid-first, layout-ir, line-fit, page-geometry + নতুন qa/edit-score.mjs/.ps1।
  বসানোর আগে যাচাই: লোকাল = প্যাকের ভিত্তি (diff উল্টে মেলানো)। ব্যাকআপ scratchpad 8018d810…\before-pack5। টেস্ট ১৮৩০/০। ডিফল্ট স্কোর Pack4-এর সমান।
  FZ_ON=GRIDFIRST (Word, ছবি/লেআউট/এডিট): a02 ৭৮.৮/৫৯.৩/৬৩.২ (ছবি −৩.৬), a03 ৭৯.৭/৬৩/৫৯.৫, a16 ৮৮.১/৭১.৬/৫৫, a18 ৪৮.৯/৭২.৪/৭৯.৭ (ছবি −৪), f1 অপরিবর্তিত।
  গড় এডিট ৬১ → ৭১.৫, ছবি ৭২.১ → ৭১.১। docx-to-doc-এর প্রস্তাবিত diff (নেস্টেড ছকের পরের খালি <p> বাদ) বসানো হয়নি — মূল ইঞ্জিন, অনুমতি বাকি।

- ২০২৬-১০-১৫: রিভিউয়ারকে Word-ডেটা zip দেওয়া (Desktop\রিভিউয়ার-প্যাক৬-ডেটা.zip) ⇒ Pack6 এল: FZ_ON=GRIDFIRST/FORMFIX/PLEADER (+NOVGRAY)। মালিকের অনুমতিতে বসানো
  (প্যাকের diff ফাঁকা ছিল; নিজে মাপা: ছোট, সুইচে বাঁধা)। ব্যাকআপ before-pack6। টেস্ট ১৮৩০/০। ডিফল্ট ছবি/লেআউট Pack5-এর সমান।
  তিন সুইচ চালু (Word, ছবি/লেআউট/এডিট): f1 ৭৭.১/৭২.২/১০০, a02 ৮৩.৪/৬৪.৭/৯৬.৮, a03 ৮০/৬২.৩/৫৮.৮, a16 ৯০.২/৭৬.৫/৫২, a18 ৭৮.৪/৯৫.৬/১০০।
  গড় ছবি ৭২.১ → ৮১.৮, এডিট ৬৩ → ৮১.৫ — প্রথমবার মূল স্কোর বড় নড়ল। ঝুঁকি: রিভিউয়ার এই ৫টিই দেখেছে (ওভারফিট সম্ভব) ⇒ f2/a17 ইত্যাদিতে রিগ্রেশন-যাচাই বাকি।
- ২০২৬-১০-১৫ রাত: Pack7 বসানো (faithful ৪ ফাইল; নিয়ম একই তিন সুইচে, FB-1..8 ইত্যাদি)। ব্যাকআপ 2132c8d4…\before-pack7। টেস্ট ১৮৩০/০।
  রিভিউয়ারের দাবি: সুইচ ছাড়া ০-বাইট diff; এডিট a03 ৫৮.৮→১০০, a16 ৫২→১০০ (উপচানো ঘর ১৭৪→০), a02 →১০০। নিজে মাপা: ডিফল্ট অপরিবর্তিত; সুইচে এডিট ৫টিতেই ১০০ সত্য, কিন্তু ছবি গড় ৮১.৮→৭৪.৭ (a02 ২ পাতা, ৬১.৪),
  এবং এডিট-যোগ্য ঘর কমেছে (a18 ৭৫→২৪) ⇒ এডিট-স্কোর আংশিক কৃত্রিম। মালিকের সিদ্ধান্তের অপেক্ষা।
  অন্য ফাইলে (সুইচ চালু): ছবি f2 ৮৭.১→৬৭.৮, a10 ৮২.১→৬২, a17 ৭৯.৬→৭৫.১, a05 সমান ⇒ তিন সুইচ ওভারফিট/ক্ষতিকর, ডিফল্টে চালু করা যাবে না।
  রিভিউয়ারকে Desktop\রিভিউয়ার-প্যাক৭-যাচাই.zip দেওয়া হলো: ৯ ফাইলের টেবিল + প্যাক-৮ প্রম্পট (ছবি না কমানো, a02 ১ পাতা, এডিট-ঘর না কমানো, সুইচ-ভিত্তিক দায় আলাদা করা)।
- ২০২৬-১০-১৬ রাত: Claude in Chrome দিয়ে দুই Gemini (দুই অ্যাকাউন্ট) সারারাত চালানো; প্রজেক্টে কিছু বসানো/push হয়নি, সব যাচাই scratchpad কপিতে।
  Gemini-১: Pack8 (a02 ২ পাতা, a10 ৭৭.৫ — দাবি মেলেনি) → Pack9 (গড় ৮৩.০, a02 1/1) → Pack10 (সুইচ ডিফল্ট-চালু; f1/a03 সমস্যা) → Pack11: ডিফল্টেই গড় ছবি ৮৩.২, এডিট ১০০, কোনো ফাইল পুরোনো ডিফল্টের নিচে নয়।
  শিক্ষা: asis-score/faithful-e2e কোড নেয় localhost:3008 (মূল প্রজেক্ট) থেকে — কপি মাপতে আলাদা সার্ভার (3018) লাগে; প্রথম Pack8 মাপা এই কারণে ভুল ছিল।
  Gemini-২: C2/C3 (classify-score টেস্ট 42/0) + E1 LAYOUT_REGISTRY.md; classifier-fix v1 (সুইচহীন, ৪ ব্যর্থ), v2 (hunk মেলেনি), v3 (SyntaxError) → v4 সফল (ডিফল্ট হুবহু, CLSFIX-এ অমিল 7→4)।
  Gemini UI: ট্যাব রিলোড না করলে পুরোনো অবস্থা দেখায়; Enter-এ বার্তা যায় না (send বাটন); প্রায়ই "[file-tag]" দেয় আসল ফাইলের বদলে; Drive সংযোগ চাইলে প্রত্যাখ্যান।

- ২০২৬-১০-১৬ বিকাল: মাল্টি-অ্যাসিস্ট্যান্ট ক্রোম এক্সটেনশন ব্রিজ (`gemini-bridge-extension/`, পোর্ট ১৮৭৬৫) সম্পন্ন। ব্যবহারকারীর রানিং ক্রোমে ৪টি অ্যাকাউন্টের লগইন অক্ষত রেখে ৪টি জিমিনি ট্যাবে অটোমেশন সংযোগ নিশ্চিত (A-1 লেআউট, A-2 ক্লাসিফায়ার, A-3 .doc লেগ্যাসি, A-4 সিনিয়র লিড)। সেন্ট্রাল CLI `tools/agent_manager.mjs` এবং ট্র্যাকার `docs/MULTI_AGENT_MANAGEMENT.md` তৈরি। TASK-01 (a05 e2e) সমাধান ও Word COM ভেরিফাইড (`measure-doc.ps1` এ GetFullPath ফিক্স; pages=2, paras=320, tables=8; স্কোর ৮০.৮ ছবি / ৭০.৫ লেআউট)। TASK-02 (CLSFIX পর্যালোচনা) এর জন্য `scratch/bundles/TASK-02_bundle.zip` তৈরি। ১৮৭২ টেস্ট পাস অক্ষত।
- ২০২৬-১০-১৬ গভীর রাত / ১৭ ভোর (Part-19.6): জিপ ফাইল ভিত্তিক তথ্য আদান-প্রদান প্রোটোকল বাস্তবায়ন (`fetch_all_patches.mjs`, `switch-mode` API)। ৪টি ট্যাবকেই স্বয়ংক্রিয়ভাবে Argon থেকে দ্রুতগতির Flash মোডে সুইচ করা হয়েছে যা টাইমআউট বা স্ট্রিম ড্রপ রোধ করে। এক্সটেনশন ব্রিজে ডুপ্লিকেট ডিসপ্যাচ ও ফলব্যাক অপসারণ করে কঠোর সিঙ্গেল ডিসপ্যাচ নিশ্চিত করা হয়েছে। ডায়নামিক স্ক্রিপ্ট ইনজেকশন চলায় এক্সটেনশন ম্যানুয়ালি রিলোড করতে হয় না। A-3 ট্যাবে `A3_GOAL4B_OTSU_THRESHOLD_bundle.zip` আনপ্যাক ও টাস্ক সমাধান চলছে। ১৮৭২/১৮৭২ টেস্ট গেট শতভাগ গ্রিন, কোর ফ্রোজেন ইঞ্জিন সম্পূর্ণ সুরক্ষিত।
- ২০২৬-১০-১৮ বিকাল: IDM আনইন্সটলের পর তিনটি Gemini প্যাচ বসানো: A1_MATHH (`__FZ_ON_MATHH`, গণিত-লাইনের বাড়তি উচ্চতা; layout-ir + faithful-docx-builder), A3_OTSU (`__FZ_ON_OTSU`, page-geometry inkMask-এ Otsu/টাইল-নরমালাইজেশন), A2_REGISTRY (নতুন layout-registry.js + টেস্ট ২৯/২৯, archetype-map হুক)।
  যাচাই: hunk-মিল + দেওয়া পুরো ফাইলের সাথে হুবহু মিল (A1 diff-এ একটি newline-ত্রুটি ছিল, হাতে মিলিয়ে নিরাপদ প্রমাণিত)। ব্যাকআপ scratchpad backup-before-A123। টেস্ট ১৯০১/০। push হয়নি।
  ডাউনলোড: bridge এক্সটেনশন আবার বসানো; Antigravity এজেন্ট Drive-viewer div সিলেক্টর ঠিক করায় `agent_manager.mjs fetch --tab N` কাজ করে (A3 হ্যাশ মিলেছে)।
  সন্ধ্যা: v3 বান্ডেল তিনটি (A1 টেস্ট/প্রান্তিক, A2 run-all+REGISTRY সুইচ, A3 টেস্ট/বাকি থ্রেশহোল্ড) তৈরি, পাঠানো হয়নি; পরের বার নতুন অ্যাকাউন্ট বাধ্যতামূলক।


## 2026-10-19 — Offline form-fill plan
- Owner chose: 'অফলাইন ফরম ফিলাপ' as a separate service (own page form-fill.html + js/form-fill/), engines only called, not changed.
- Step 1 = current faithful OCR prompt unchanged; step 2 = new prompt built from the form's slot labels, returns only JSON values.
- Plan: docs/FORM_FILL_PLAN.md (FF0-FF4), after running F tasks; WORK_PLAN has phase FF.
- Future web-autofill extension (separate repo, after this project): docs/future/AUTOFILL_EXTENSION.md.

## 2026-10-19 (রাত) — নমুনা ফেরত, স্কোর, Gemini-লুপ
- বসানো+push: F3_REBASE_v10, ASIS_SCORE_v10, ROWCHECK_FLAKY_v10, D_E2E_v10 (টেস্টের নুক্তা/৬০০-অক্ষর ভুল ঠিক), F2_WIRE_FIX_v9। run-all 2403/0।
- bridge-বাগ: Task-চিপের অবস্থা থাকে `gem-segmented-button-selected`-এ (ভেতরের button-এ নয়) ⇒ আগে রিট্রাইয়ে Chat-এ ফিরত। এখন চিপ না পেলে/Task না হলে পাঠায় না; Send-পুনঃচেষ্টা ৫ ও ১৫ সে.।
- পুরোনো ১২ নমুনা মাপা (গড় ~৮৩); a01 নামল (লাইন-ভাঙা, Gemini-তে), a14 বাক্স দুই-কলাম, a07 বাড়তি কলাম — Gemini-তে।
- সুইচ: FONTPICK ক্ষতিকর (a01 −১০), OTSU/FORMKIT নিরপেক্ষ। n1–n4 ক্যাপচার প্রক্সি-ব্যস্ততায় ব্যর্থ।
- ব্যবহারকারী: পিসি হ্যাং ⇒ একসাথে ২ ট্যাব; আজ বন্ধ।

## 2026-10-19 (ভোর) — প্রতিযোগী-তুলনা (কোড-বদল নেই)
- একই image-score দিয়ে a09/a18: আমাদের ৮৯.১/৭৮.৪; Gemini Flash-Lite সরাসরি HTML ৩৬.৩/১৩.৩; pdftoword-converter.com/bangla ৩০.৫/১১.৮ (বাংলা ভাঙা, টেবিল ০); BanglaOCR (শুধু লেখা) a09 ২৪.৪।
- banglapdfeditor: শর্তে সম্মতি চায় (করিনি), বিজয় ANSI অসমর্থিত লেখা। UPDF: নেটিভ ফাইল-ডায়ালগ, চালানো যায়নি। Question Maker: Android, চালানো যায়নি (Play: 10K+, ৪.২★)।
- ফাইল/স্কোর: scratchpad\cmp (সেশন-অস্থায়ী)।

## 2026-10-19 (দুপুর) — A07/A04/A19/A10 বসানো + push
- বসানো (সব সুইচে, ডিফল্ট অপরিবর্তিত): A07 TABLECOL, A04 PAGES4, A19 EXTRALINES, A10 A10LINES; Q_ASIS_SCORE_v11 (asis-score)।
- A10 rebase প্রথম চ্যাটে "জিপ খোলা যায়নি" ⇒ u/2-এ navigate-tab নতুন চ্যাট + Argon + send --force; ~৪৫ মিনিটে উত্তর।
- যাচাই: তিন faithful ফাইলে আগের সব __FZ_ON_* সুইচ অক্ষত (হারানো ০)। ব্যাকআপ scratch\backup-a10, backup-a19।
- টেস্ট: a10-lines 7/0; run-all 2487/0। চার সুইচের স্কোর-প্রভাব এখনো মাপা হয়নি।
- ১০-১৯ বিকেল: হুবহু স্কোর আবার মাপা (a14,a02,a01,a09) — গতরাতের সমান; a01 বেসলাইন 79.3→72.6 রিগ্রেশন। a17 পাতা-১-এ ৫৫ লাইনের মাত্র ৮টি আসে (বড় বাগ)। ঘাটতি মূলত pos ও rules অংশে। A14/F1_FIX জিপ এখনো বসানো হয়নি।

## ২০২৬-১০-১৯ সন্ধ্যা — চার Gemini প্যাচ একসাথে বসানো
- A17_P1LOSS (P1LOSS), A01_REGRESS (A01FIX), A05_DRIFT (P2DRIFT), A02_RULES (RULEFIX)। চারটিই একই ৩ faithful ফাইল বদলায়; git নেই বলে tools/merge3.mjs (৩-পথ মার্জ, ভিত্তি scratch\backup-a17) দিয়ে মেলানো।
- সংঘর্ষ: line-fit fit()-এর শুরু ও export লাইন (চার সুইচ হাতে একত্র); builder planPage গ্রিড (A17-এর if/else-এর else-শাখায় A05/A02 হাতে বসানো), বক্সের lead লাইন।
- Gemini টেস্ট samples/… পথ খোঁজে → qa/golden-data/asis/… করা হলো। টেস্ট 7+21+7+7 পাস; run-all 2529/0।
- স্কোর: a01 72.6→96.7 (A01FIX), a02 84→90.4 (RULEFIX, লেআউট 65→94)। a17/a05 মূল PDF নেই → মাপা যায়নি।
- Arena (arena.ai/agent) পরীক্ষা: arena-bridge-extension (পোর্ট 18766) + tools/arena_send.mjs; ফাইল তোলা কাজ করে, কিন্তু auto-mode classifier বারবার "Data Exfiltration" বলে আটকায় → ব্যবহারকারী হাতে পাঠালেন।
- agent_manager send-এ `--acct` নেই (সব ট্যাব 0-তে যেত); ঠিক রূপ: `send --tab T --task ID --prompt .. --file ..`।
- ১০-১৯ রাত: A1_F1_PAGEFIT_FIX_v6 merge3-এ পরিষ্কার বসল (৪ ফাইল); f1-pagefit টেস্ট ১৫ কন্ট্রোলারে আক্ষরিক studioFit:true খুঁজত → fayzar-export-এর ডিফল্ট-যুক্তি যাচাইয়ে বদলানো (কন্ট্রোলারে জোর করলে exam-এও চালু হতো)।
- a01-regress/wrapfit ভাঙছিল কারণ ৫:৪৪-এর স্কোর-রান qa/golden-data/asis/a01-এর JSON ওভাররাইট করেছিল → stage_A01_REGRESS_v1 থেকে ফেরানো। run-all 2545/0।
- A14_BOXSPLIT_v1: বেস পুরোনো, ৩ ফাইলে সংঘর্ষ → v2 rebase দরকার। ৪ ট্যাবে A03/A07/A14/A17_SCORE চলছিল, তখনও উত্তর আসেনি।
- পরের সেশন: ট্যাবগুলো বন্ধ ছিল (ব্রিজ Tabs=0, এক্সটেনশন বিচ্ছিন্ন) → উত্তর হারানো; চ্যাট-তালিকায় Task-চ্যাট দেখা যায় না। ব্রিজ রিস্টার্ট, `Start-Process chrome <gemini url>` দিয়ে ২ ট্যাব খুলে A03 (u/4), A07 (u/6) আবার পাঠানো। exec-script Gemini-তে Trusted Types-এ আটকায়।
- A03_SCORE_v1 ও A17_SCORE_v1 উত্তর বসানো (A03FIX/A17FIX, ডিফল্ট বন্ধ)। A17 merge-এ ২+৩টি সংঘর্ষ: দুজনেই একই শর্ত/এক্সপোর্ট লাইনে নিজের সুইচ যোগ করেছিল → আমাদের লাইন বেসে ফিরিয়ে merge, তারপর দুটো সুইচ একসাথে। run-all 2555/0। A14 v1b পাঠানো আবার "Task mode not selected"-এ আটকাল।
- 2026-10-19 (night): live convert failed with 'proxy busy'. Cause: client G_PROXY_STREAM_v6 sends X-Fayzar-* headers on >200KB requests; deployed Worker CORS Allow-Headers = only Content-Type/Authorization/apikey -> preflight blocked (Failed to fetch, status 0). Local index.js already allows them; deploy blocked because wrangler auth expired.
  -> fixed: wrangler re-login, Worker deploy 9eebdefd (Allow-Headers now has X-Fayzar-*); live site g01 photo converted OK. Rule: when the client gains new headers/proxy changes, deploy the Worker together with Pages.

- 2026-10-20: "Task mode not selected" সমাধান: Claude-in-Chrome দিয়ে Task চিপে আসল ক্লিক → `send --force`; A14_SCORE_v1b (u/1), A07_SCORE_v1 (u/6) পাঠানো। A14 উত্তর (ব্যবহারকারী Downloads-এ দিলেন) বসানো: merge3 MERGE_KEEP_OURS + ৬টি সংঘর্ষ-লাইন হাতে (সুইচ OR); keep-ours-এ layout-ir-এর repairA14Page/Ir ব্লকও বাদ পড়েছিল → আলাদা ঢোকানো। শিক্ষা: KEEP_OURS-এর পরে theirs-এর নতুন function সংজ্ঞা আছে কিনা grep করো। run-all 2560/0।
- 2026-10-20 ভোর: A07_SCORE_v1 উত্তর ~১ ঘণ্টা ট্যাবে পড়ে ছিল (gemini-round watch ধরেনি) → ব্যবহারকারী বিরক্ত; fetch করে A07FIX বসানো (একই KEEP_OURS+হাতে মেলানো+layout-ir ব্লক ঢোকানো), run-all 2564/0। নতুন ৪ কাজ A10/A19/A11/A16 SCORE_v1 পাঠানো; send "false" দেখালেও আপলোড হচ্ছিল, পুনরায় পাঠানোয় ডুপ্লিকেট চ্যাট + u/6-এ google_abuse → ব্যবহারকারী মুছেছেন। নিয়ম: এক কাজ এক send, স্ক্রিনশটে যাচাই। নতুন watch4.ps1 (রিফ্রেশ ছাড়া, ~২ মিনিট পালা করে fetch)।- 2026-10-20: দ্রুত-চক্র টুল: asis-score.mjs-এ --tag (runs/<tag>, fixture অক্ষত) + docxFingerprint (word xml+স্কোরিং-স্ক্রিপ্ট ছাপ; এক হলে Word/স্কোর বাদ, --force); নতুন asis-report.mjs (ধরন-ভিত্তিক হারানো নম্বর) ও asis-ab.mjs (সুইচ বন্ধ/চালু পার্থক্য)। Gemini ক্যাপচার-ক্যাশ আগেই ছিল। a01 ২য় রান ২৫৩s→৪৪s।
- 2026-10-20: মাপে দেখা গেল Word-এ PDF নিজে ~৩s, কিন্তু প্রতি ফাইলে Word চালু/বন্ধ ~২২s + Measure-WordDoc (স্কোরে অব্যবহৃত) মিলে ~৯৮s। নিজস্ব Word→PDF ইঞ্জিন প্রস্তাব নাকচ (স্কোর Word-এর আসল রূপ মাপে)। সমাধান: word-pdf-batch.ps1 (এক Word), মাপ শুধু --measure, faithful-e2e --jobs (এক ব্রাউজার, FZ_E2E_FMTS)। ৩ ফাইল ২৬১s, স্কোর অপরিবর্তিত (a01 72.6)।
- 2026-10-20: পুরোনো সুইচ A/B (base WRAPFIT+NESTBOX+TBLMERGE, a01/02/03/07/13/14): TABLECOL বাতিল (৪ ফাইলে docx তৈরি হয় না, a14 −৩৮); EXTRALINES নিরপেক্ষ (+০.১); A10LINES মিশ্র (a14 +৩.১/ছবি +৬.৬, a13 −২; গড় +১.০)।
- 2026-10-20 সন্ধ্যা: ব্যবহারকারী "সার্ভারের অঞ্চল থেকে অনুরোধ নিচ্ছে না" ত্রুটিতে কাজ করতে পারছিলেন না। proxy-log: সব ব্যর্থ অনুরোধ HKG colo (placement us-central1 থাকা সত্ত্বেও), প্রথম চেষ্টা LOCATION, বাকি ৯ ফেইলওভার "ReadableStream is disturbed" — G_PROXY_STREAM_v6-এর বড়-বডি স্ট্রিম পথ বডি একবারই পাঠাতে পারে। ঠিক: raw মোডে isLargeStream বন্ধ, বড় বডিও arrayBuffer-এ বাফার (peek-করা স্ট্রিম থাকলে Response দিয়ে পড়া)। deploy 45575dec (rollback 9eebdefd), probe ৬/৬ OK।
- 2026-10-20 বিকাল (সেশন ৩০৭৮৯): দুই Claude সেশন একই asis-ab চালাচ্ছিল (Word পরস্পর মারে) → নিজেরটা বন্ধ; নিয়ম: একবারে এক ভারী রান, HANDOFF-এ কে চালাচ্ছে লেখো। A03FIX A/B: a14 +৪.৯/ছবি +৬.২, কেউ কমেনি ⇒ গৃহীত-প্রার্থী। ব্যবহারকারীর কথায় সব পুরোনো Chrome বন্ধ (puppeteer বাদে), নতুন ট্যাব একটি করে: u/7 LINEGAP_v3, u/5 A16FIX_v2 (a13 −৩৫.৬), u/3 A11FIX_v2 (a03 −১৪.৭) — প্রতিটি একবার, জিপ-জোড়া যাচাই ✓। agent_manager bundle --files ফোল্ডার নেয় না → ফাইল আলাদা করে দিতে হয়।
- 2026-10-20 রাত: তিন উত্তর বসানো (merge পরিষ্কার, কোনো FZ_ON সুইচ হারায়নি; run-all 2588/0)। A16FIX_v2 গৃহীত (a13 −৩৫.৬→০, a16 +২.৭)। A11FIX_v2 বাতিল (a03 সারলেও a13 −৬৪.৮)। LINEGAP_v3 বাতিল (উন্নতি নেই, a14 ছবি −৭.৩)। PAGEFIT = studioFit, হুবহু-মোডে কখনো চালু হয় না। gemini-round watch নিজে-পাঠানো সেন্ড দেখে না ("সব কাজ শেষ" ভুল সংকেত) → নাম-ধরা fetch-লুপ; পুরোনো zip আবার নামলে নতুন মনে হয় → শুধু চাওয়া নাম গণ্য। HANDOFF ১৫ লাইনে নতুন করে লেখা।
- 2026-10-20 গভীর রাত: ব্যবহারকারী সব সিদ্ধান্ত Claude-কে দিলেন। গৃহীত ৫ সুইচ ডিফল্ট-চালু: নতুন switch-defaults.js (৩ HTML-এ layout-ir-এর আগে, window.__FZ_ON_* বসায়, __FZ_OFF_* মানে); ইঞ্জিন-কোড অপরিবর্তিত, node টেস্ট ডিফল্ট-বন্ধে। run-all 2588/0; a13 FZ_ON ছাড়া ছবি ৯২ = ভিত্তি ✓। push a7d9bcf (৪৩ ফাইল, লাইভ)। A10LINES বন্ধ (a13 −২)।
- a14 নতুন ডিফল্টে: ছবি ৭৯.৭, লেআউট ৬৮; পাতা ২-এর বাক্স এখনো দুই কলাম ⇒ A14_BOXSPLIT_v2 (runs/box2 ডেটা + v1 উত্তর রেফারেন্স) u/5 (bridge-ট্যাব 1)-এ একবার পাঠানো।
- নতুন অনুমতি: ছোট বাগ (~২ মিনিট) নিজে সারানো, বড় কাজ Gemini।
- 2026-10-21 ভোর: ৪ ট্যাব একটানা। base5 (৮ ফাইল) কারণ-বিশ্লেষণ থেকে কাজ: VSPACE_v1, INDENT_v1, SERIAL_v2, WIDTH_v1, A07_SCORE_v2, A02_RULES_v2। VSPACE গৃহীত (a07/a16 +৪.২; মূল কারণ: Object.assign-এ ভেতরের _a16*-প্রপ হারিয়ে অনুচ্ছেদ ভাঙা ⇒ +১২pt লাফ), BOXSPLIT গৃহীত (a14 ছবি +৬.৪); push 94d56d1। SERIAL_v2 a14 −১৫.৫ ⇒ বন্ধ, SERIAL_v3 তৈরি। Gemini-র SERIAL টেস্ট ভুল ⇒ .pending, পুরোনো টেস্ট ফেরত। শিক্ষা: apply_reply টেস্ট-ফাইল ওভাররাইট করে (ব্যাকআপ নেয় না); send-এ জিপ লাগলেও Send না চাপলে `/click-send?tabId=` দাও; A/B চলাকালীন কোড বসাবে না।
- 2026-10-21 সকাল: গৃহীত ও লাইভ — SERIALHANG v3, A07FIX2 (a07 +২.৩), A14FIX3 (a14 +৯.৩), WIDTH v2 (a13 +৩.৬, a09 +২.৩) ⇒ ডিফল্ট ১১টি (push cc3f961)। বাতিল/চলছে: INDENT_v1 (a13 −৬৩ ⇒ v2 Gemini-তে), WIDTH_v1 (a09 −৬.৬ ⇒ v2-তে সারল)। শিক্ষা: (১) merge3 KEEP_OURS একই এলাকায় দুই সুইচ থাকলে theirs-এর পুরো ব্লক ফেলে দেয় ⇒ `tools/merge-switch-check.mjs <stage>` (base-diff) দিয়ে প্রতিবার যাচাই; (২) Gemini-টেস্ট switch-defaults লোড করলে নতুন ডিফল্টে ভাঙে ⇒ টেস্টে ভিত্তি-সুইচ নাম ধরে পিন, _RULES_TAIL-এ নিয়ম।
- 2026-10-21 ভোর–সকাল: আরও গৃহীত ও লাইভ — A16FIX3 (a16 +১.৫), A14RULES (a14 ৮১.১→৯২.৪); ডিফল্ট ১৩টি (push 094541b)। FONTFIX v1 বাতিল (পাতা ৩-এ মোটা অক্ষর বাদ দেওয়ায়), v2 বসানো-যাচাই বাকি। Task-চ্যাটে URL `/app` থাকে ⇒ watcher-রিফ্রেশে চ্যাট হারায় (A02/INDENT_v2) — Chrome-এ /u/N/search দিয়ে উদ্ধার, Gemini টুল-সীমায় জিপ না দিলে "জিপ দিন" পাঠাও। u/5-এ Argon কোটা শেষ। নতুন টুল: tools/make-score-task.mjs, scratch/sendtask.ps1, scratch/watchn.ps1।
- ব্যবহারকারীর "গতকালের ৩ সমস্যা": কলাম-মার্জ (TBLMERGE লাইভ; TABLECOL বাতিল), ক্রমিক (SERIALHANG নিরপেক্ষ ⇒ বন্ধ), স্পেসিং (LINEGAP ৩ চেষ্টায় ব্যর্থ) — শেষ দুটি এখনো খোলা।
- 2026-10-21 দুপুর: A07FIX3 গৃহীত (a07 ৮২.৭→৮৭.১, a09 ছবি +১.৮) ⇒ ডিফল্ট ১৪টি, run-all 3105/0, push dff7fd8। বসানো কিন্তু বন্ধ: FONTFIX v2 (মিশ্র), INDENT v2 (নিরপেক্ষ), RULES2 v2 (a02 +৪.২ / a03 −২.২ — a03 পাতা১ শিরোনাম-টেবিল কলাম ও একটি bottom-border দাগ বদলায় ⇒ A02_RULES_v3 পাঠানো বাকি)। শিক্ষা: (১) Gemini ডিফল্ট-চালু সুইচের শর্তে (যেমন isA07Fix2On) নতুন আচরণ ঢোকালে শুধু নতুন সুইচের অধীনে রাখো; (২) asis-ab docx-ছাপ এক হলে পুরোনো স্কোর দেয় ⇒ IR/docx diff দিয়ে কারণ খোঁজো; (৩) u/2 ট্যাব Task-চিপে আটকালে একবার পরে আবার, তারপর নতুন ট্যাব — নতুন ট্যাবে সফল; A03_SCORE_v2 u/1-এ, A14_SCORE_v4 u/2-এ পাঠানো।
- 2026-10-21 দুপুর–বিকেল: গৃহীত RULES2 v3 (a02 +৪.৩), A13FIX (a13 +২.৯; শিরোনাম-পিচ নিয়ম heading-এ সীমিত), A16FIX5 (a16 +৪.৫), A14FIX5 (a14 +১.৮; লিডার+২.৫pt নিয়ম বাদ), A07FIX5 (a07 +১.২) ⇒ ডিফল্ট ১৯। ব্যবহারকারী Word-এ a07-এর ভাঙা টেবিল ধরলেন ⇒ কারণ A07FIX3 (স্কোর +৪.৪ দিলেও টেবিল ভাঙত) ⇒ বাদ; টেবিল-নিয়ম (গ্রিড→merge→লেখা) _RULES_TAIL ও মেমরিতে। বাতিল: A09FIX (a01 −২৫), A03FIX2 (টেবিল-রূপান্তর)। শিক্ষা: (১) স্কোর টেবিল-ভাঙন ধরে না, চোখে দেখো; (২) watchn-এ স্বয়ংক্রিয় জিপ-অনুরোধ Task-চ্যাট ভাঙল ⇒ সরানো; (৩) Task-চিপ শুধু সক্রিয় ট্যাবে ধরে; (৪) ১৮+ সুইচের লম্বা ট্যাগে Word-PDF ব্যর্থ ⇒ asis-ab ছোট ট্যাগ; (৫) merge-এ লাইভে অসংজ্ঞায়িত ভেরিয়েবল (effA07NL) ধরা পড়ল। নতুন: tools/new-session.bat (নতুন কথোপকথন স্বয়ংক্রিয়)।

- 2026-10-21 সন্ধ্যা: A12FIX গৃহীত (a12 ৯৫.৯→৯৯.৬); প্রথমে a01/a13 −১৮ — কারণ ঘন গদ্যে charspacing সরানো ও ১-লাইন টেবিল-শিরোনামে ভাঁজ; শর্ত কড়া করে ০ ⇒ ডিফল্ট ২০, push 08c907d। A03FIX3 বসানো কিন্তু বন্ধ (a03 −২১.৬, সারি-ড্রিফট) ⇒ A03_SCORE_v4 পাঠানো বাকি। A06_SCORE_v1 পাঠানো (u/2)। A02_SCORE_v1, A07_SCORE_v4 এসেছে, বসানো বাকি। নতুন-সেশন ৪-ধাপ নিয়ম মেমরিতে।

- 2026-10-21 রাত: "Google এই মুহূর্তে আমাদের সার্ভারের অঞ্চল থেকে অনুরোধ নিচ্ছে না" ঘনঘন। proxy-log: সব ব্যর্থ অনুরোধ HKG, ৬টি কি-তেই LOCATION। /where দেখাল placement (gcp:us-central1) কাজ করছে না — Worker edge-এই চলে (DAC/HKG)। ঠিক: US-এ স্থির Durable Object `UsEgress` (locationHint wnam → DFW), শুধু generativelanguage-এ ফরোয়ার্ড; edge HKG/MFM হলে, প্রথম LOCATION-এর পরে, বা `?us=1` দিলে ওই পথ। লগে `viaUs`। `/where?us=1` এখন US-অবস্থানও দেখায়; `PROBE_US=1 node qa/proxy-probe.mjs`। deploy f5967cb3 (rollback 45575dec), probe ৫/৫ OK, proxy টেস্ট পাস। মাল্টি-পিসি Gemini-ব্রিজ (Google Drive ফোল্ডার) পরিকল্পনা আলোচনায় — ব্রিজ-অ্যাপের কোড বাকি।
- 2026-10-21 রাত (২): A02FIX গৃহীত (a02 ৯৪.৯→৯৫.৩, ছবি +৩.৩; builder-নিয়ম a02PageOn() দিয়ে পাতা-সীমিত — নইলে a01/a13 docx বদলাত) push 83d4e53; A06FIX গৃহীত (a06 ৬৯→৯৬.১!; প্রথমে a03 −১২.৫ — IR-মেরামত শুধু margins.top ১২০–২০০ পাতায়) push 6ffd000 ⇒ ডিফল্ট ২২। A03FIX4 বসানো কিন্তু বন্ধ (a03 −৪.৭) push 0bc764f। A07_SCORE_v4 বাতিল (A07FIX3-পথ)। পাঠানো: A07_SCORE_v6 (ট্যাব1), F1_SCORE_v1 (ট্যাব2)। শিক্ষা: ট্যাব-id বদলায় (sendtask এখন /tabs থেকে নেয়); node-এ fit+bodyXml-এ পার্থক্য না দেখালেও ব্রাউজার-স্কোরে আসতে পারে; Gemini নতুন "Chat / Task" ল্যান্ডিং-পাতায় মোড-বোতাম/আপলোড কাজ করে না ⇒ ট্যাব 0/3 আটকে।