# Phase 0 brief (for the delegated coding agent)

Source of truth: `docs/FINAL_WORK_PLAN.md` §7 and §9 (phase 0). Work only in `eval/` and `qa/`. **Do not modify anything under `js/`.**

## Data
- Samples: `scratch/samples/new/2026-10-22/`.
  - Inputs are named `T- (N).jpeg`, plus a few `.jpg` and `.pdf` files.
  - Faithful-mode outputs and captures: `out/<ID>/capture.json`. The capture text uses block tags like `[[B:t=ROLE;p=1;box=...;al=..;fs=..;b=..]]` followed by the text.
  - Auto-mode outputs for T01_jpeg, T02_pdf, T05_jpeg and T24_jpeg: `out-auto/<ID>/` (`ocr-text.md`, `*_Teacher_Master_Unicode.docx`, `*_Teacher_Word2003.doc`).
- Golden set (15 IDs), ✔ = counts in the gate, ◐ = separate track:
  - ✔ T01_jpeg, T02_pdf, T05_jpeg, T08_jpeg, T17_jpeg, T24_jpeg, T07_jpeg, T20_jpeg, T22_jpeg, T25_jpeg, T06_jpeg
  - ◐ T10_jpeg, T12_jpeg, T19_jpeg, T21_jpeg
- Held-out set: T09, T16, T23. **Never open, view or tune on these.**
- Multi-image doc: T01_jpeg + T05_jpeg + T08_jpeg as one document (`MULTI3`).

## Tasks
1. Create `eval/golden-set/manifest.json`. For each ID give: id, input file, tier (✔/◐), docType guess (from the capture's roles), and notes.
2. Create `eval/golden-set/<ID>/expected.json` with `{docType, pages, orientation, columns, tables:[{rows,cols}], digits, tier, traps:[]}`.
   - Derive these from `capture.json`: table rows and columns come from the `table` blocks; columns from box x-ranges.
   - Leave a field `null` if unsure. Mark `"needsHumanCheck": true`.
   - T02_pdf digits = "english" (the owner confirmed this).
3. Write `qa/usability-score.mjs <docx> <expected.json> [ocr-text.md]`. It unzips the docx (use `jszip` if it is in `node_modules`; otherwise use the zip approach already in this repo) and prints a JSON scorecard with these checks:
   - c1: text completeness. Count the share of OCR words (kept roles only; drop stamp, header and page-number lines) that are present in `w:t`. Pass at ≥97%.
   - c2: no `w:framePr` or `w:tblpPr` floating frames.
   - c3: the table count and row/column counts match the expected values (allow ±1).
   - c5: the dominant body size (mode of `w:sz`) is ≥20 half-points, and no run is <18.
   - c6: no `w:keepNext` on every row of a table longer than 15 rows; no `pageBreakBefore` before the first table.
   - c7: the placeholder texts ("আপনার প্রতিষ্ঠান", "ঠিকানা লিখুন", "পরীক্ষার নাম লিখুন") appear only when docType starts with EXAM.
   - c8: `w:pgSz` orientation matches the expected orientation.
   - c9: if digits == "english", there are no Bengali digits inside table cells (and the reverse for "bangla").
   - Output: `{id, checks:{c1:{pass,value},...}, safetyPass, lookPass}`. Safety = c1, c2, c3. Looks = the rest.
4. Write `qa/baseline.mjs`:
   - Run `usability-score.mjs` over every golden ID that has an auto-mode docx in `out-auto`.
   - Write `eval/baseline-2026-10-23.md` as a table, with ✔ and ◐ in separate sections.
   - Do **not** run new Gemini batches. Only score what exists. List the IDs that lack auto output as "pending".
5. Self-test: run the baseline and paste the summary (≤30 lines) into your final report.

## Rules
- Bengali file content is UTF-8. Never edit files with PowerShell Set-Content.
- Keep console output short. Write details to files.
- Final report: a list of the files created, the baseline summary, and anything uncertain.
