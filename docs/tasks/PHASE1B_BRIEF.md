# Phase 1B-i brief (big-engine fixes 1.1, 1.4, 1.6) — for the delegated coding agent

Plan: `docs/FINAL_WORK_PLAN.md` §9 row "১খ". Owner approved (D1) on condition of a before/after comparison. 1.3 (OCR prompt) is NOT in this task.
**Never touch:** `js/docx-to-doc-engine.js`, `js/bangla-converter-engine.js`, `js/equation-converter.js`, `js/doc-binary-engine.js`, and any equation/EQ code. Minimal, local changes; prefer new helpers over restructuring. Find code via `docs/PROJECT_MAP.md` → grep `docs/CODE_INDEX.md`; never read whole big files.

## Before you change anything: save the "before" outputs
Inputs (cached OCR, no Gemini): `scratch/samples/new/2026-10-22/out-auto/<ID>/ocr-text.md` for T01_*, T02_pdf, T05_*, T24_jpeg (list the folder for exact names).
Build: `$env:FMTS='doc,unicode_docx'; node qa/site-chain-download.mjs <outDir> <input.md>` (one case per call; outDir = `scratch/samples/new/2026-10-22/out-1b-before/<ID>/`). Score each: `node qa/usability-score.mjs <unicode.docx> eval/golden-set/<ID>/expected.json <ocr-text.md>`.

## Fix 1.1 — certificate: wrapper detection too loose (T01)
- `js/layout-engine/certificate-layout.js:104-110` treats `---` lines and a repeated name as the decorative wrapper/frame, so T01 comes out landscape and broken (golden c3/c8 fail).
- Make the wrapper condition strict: require a real wrapper signal (e.g. both a top and bottom rule AND the repeated text being a short title-like line), not just any `---` or a name that appears twice. A plain certificate (প্রত্যয়ন / চারিত্রিক সনদ) must render portrait on a normal long page.

## Fix 1.4 — question engine (T24)
- The question engine splits inline `(a) (b) …` inside a paragraph/passage into separate sub-questions and stamps a mark "8" on each; the OCR text was correct.
- Change: inline `(a)(b)` markers that sit inside a running sentence/passage stay in the paragraph (no split). Marks come only from the question's own line (e.g. `.5 × 10 = 05`, trailing number) — never invented/inherited. Header "Marks/Full Marks" uses the source value (T24 source says Marks: 50).
- Find the splitter in `js/engines/question-engine.js` (or the module PROJECT_MAP names). Add a regression test in `tests/` for a passage with inline (a)…(j).

## Fix 1.6 — unknown doc types → clean composer
- `js/engines/export-dual-engine.js` ~line 936 sends unknown types to `generateGenericDocx` (plain 12pt lines, no tables).
- Route them to `js/layout-engine/clean-composer.js` (FayzarCleanComposer: Kalpurush 12pt, 1.15, A4, headings, tables intact) for both unicode docx and the RTF/.doc path if clean-composer supports it; otherwise docx only and keep RTF as is (say so in the report). Keep `generateGenericDocx` as fallback if the composer throws.

## Verify (required)
1. Related tests only during work; at the end `node tests/run-all.mjs` (report failures + totals). If snapshots change, prove the diffs are only the intended ones before `node tests/run-regression.js --update`.
2. Build "after" outputs to `.../out-1b/<ID>/`, score them; render page 1 PNG: `powershell -File qa/golden/word-pdf-batch.ps1 <jobs.json>` (jobs `[{docx, pdf, raw:""}]`, docx = the .doc) then `node qa/render-pdf-page.mjs <pdf> 1 <png>` → `.../out-1b/<ID>/p1.png`.
3. Gate: no previously-passing check may fail (T02 and T24 currently pass everything; T05 c1 0.967).
4. **Do NOT push.** UTF-8 via Write/Edit only, never PowerShell Set-Content. Keep shell output short.

## Report
Write `scratch/agent-out/phase1b_report.md` (≤30 lines): changed files + one-line diff summary each; before→after scorecard per ID (only changed checks); test totals; PNG paths; anything not done. Last line exactly `DONE`.
