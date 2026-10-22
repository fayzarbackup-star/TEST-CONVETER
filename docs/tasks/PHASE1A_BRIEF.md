# Phase 1A brief (zero-risk fixes) — for the delegated coding agent

Plan: `docs/FINAL_WORK_PLAN.md` §9 row "১ক". The owner has approved these changes (D1/D2). Keep every change minimal and local. **Do not touch these core engines:** `js/docx-to-doc-engine.js`, `js/bangla-converter-engine.js`, `js/equation-converter.js`, `js/doc-binary-engine.js`.

## Fix 1.2 — long tables push to the next page
- **Cause:** `js/layout-engine/application-layout.js:429` puts `<w:keepNext/>` on every table row except the last ("keep the table together"). For T02, a table of about 31 rows moves wholly to page 2 and leaves page 1 blank.
- **Change:**
  - Keep the rows together only when the table is short (≤15 rows).
  - For longer tables, add no keepNext. Add `<w:tblHeader/>` in `w:trPr` of the first (header) row so it repeats on every page.
  - Make the matching change in the RTF path of the same file if it has the same logic (`\trkeep`/`\keepn` per row): keep the header row marked as a repeating header (`\trhdr`).

## Fix 1.5 — highlight placeholder exam headers (do not remove them)
- **Background:** for exam papers with no institute name, the OCR prompt (`js/ai-ocr-engine.js:181`) and the defaults emit placeholders. This is intentional, so teachers can fill in their own school.
- **Placeholder strings:**
  - "আপনার প্রতিষ্ঠান এর নাম"
  - "আপনার প্রতিষ্ঠানের নাম"
  - "ঠিকানা লিখুন"
  - "পরীক্ষার নাম লিখুন"
  - dotted values like "................"
- **Change:** when a docx header line's text equals one of these placeholders, render that run with `<w:highlight w:val="yellow"/>`. Do the same in RTF with `\highlight` and a color table entry, if there is a single shared header renderer.
- **Where to look:** first find the shared place where the exam header lines become runs. Candidates are `js/engines/export-dual-engine.js` (around line 249, `kind: 'institute'`) and the header builders in `js/layout-engine/frontmatter-header.js`. Prefer a single helper used by all exam header paths. Don't change any text.
- The toggle button comes later, in phase 7. Not now.

## Fix 1.7 — label the faithful mode as experimental
- In `js/faithful-mode-ui.js`, or wherever the "হুবহু" mode card is rendered (it may be `index.html` or `js/home-app.js`), add the visible text "(পরীক্ষামূলক — শুধু পরিষ্কার স্ক্যানের জন্য)" to the card's title or subtitle.
- Change no behavior.

## Verify (required)
1. Run the related tests only: `node --test` on test files whose name matches application, letter, exam header or frontmatter (look in `tests/`). At the end, run `node tests/run-all.mjs`. Report only the failures and the totals.
2. Rebuild the outputs from cached OCR text. The app server is running at http://localhost:3008. Use `qa/site-chain-download.mjs`, reading its header comment for usage, with these inputs:
   - `scratch/samples/new/2026-10-22/out-auto/T02_pdf/ocr-text.md`
   - `.../T24_jpeg/ocr-text.md`

   Write the outputs to `scratch/samples/new/2026-10-22/out-1a/<ID>/`.
3. Score the new unicode docx files: `node qa/usability-score.mjs <docx> eval/golden-set/<ID>/expected.json <ocr-text.md>`. T02 c6 must now pass.
4. Render page 1 of each new `.doc` to PNG:
   - `powershell -File qa/golden/word-pdf-batch.ps1 <jobs.json>` (jobs = `[{docx, pdf, raw:""}]`)
   - then `node qa/render-pdf-page.mjs <pdf> 1 <png>`

   Save to `scratch/samples/new/2026-10-22/out-1a/<ID>/p1.png`. Also render page 2 for T02.
5. **Do NOT git push.**

## Rules
- Use UTF-8 and the Write/Edit tools only; never PowerShell Set-Content.
- Keep shell output short.
- Final report, 25 lines or fewer: the changed files with a one-line diff summary each, test totals, the scorecards for T02 and T24, and the PNG paths.
