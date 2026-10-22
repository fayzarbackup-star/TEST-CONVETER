# Phase 1B-iii brief — T01 pad header split + hide role tags from the user

Context: 1B-ii added role marks (`js/layout-engine/role-marks.js`, report `scratch/agent-out/phase1b2_report.md`). Current T01 output: `scratch/samples/new/2026-10-22/out-1b2/T01_jpeg/p1.png` and its OCR text in the same folder.
All files editable; if you touch a core engine (docx-to-doc, bangla-converter, equation-converter, doc-binary) add a row to `docs/FROZEN_CHANGES.md`. Never touch equation code.

## Problems
1. Pad header lines stay in the body: the tagline ("এখানে সর্বপ্রকার … বিক্রয় করা হয়।"), the address line and "মোবাইল - …" belong in the pad header (under the name, small, centered, above the rule).
2. The `---` separator and the title "প্রত্যয়ন পত্র" get glued onto the mobile line. The `---` should end the header; "প্রত্যয়ন পত্র" should be its own centered bold title line, then the body.
3. Role tags (`<!--r:...-->`) are visible in the OCR textarea for OFFICE_PAD/PROTTOYON/GOVT_APP. Users must never see them. Keep them in an internal copy (e.g. a hidden field/variable keyed to the OCR result) and re-attach for export; if the user edits the text, fall back to untagged output safely.

## Rules
- Generic logic, no text regex for this specific shop. Use structure: lines before the first `---`/rule (or before the title line) on a pad = header; short title-like line matching common document titles (প্রত্যয়ন পত্র, চারিত্রিক সনদ, ছাড়পত্র, অভিজ্ঞতা সনদ, প্রত্যয়নপত্র…) = title. A small list of standard title words is fine.
- If the OCR text puts `---` mid-line, split there first (in the shared cleanup, not per layout).
- Untagged/old inputs that are not pads must render exactly as before (snapshots must not change, or prove diffs are intended).

## Verify
- Unit tests for the 3 problems. `node tests/run-all.mjs` → 0 fail.
- Rebuild T01 from its cached OCR text in `out-1b2/T01_jpeg/` (no new Gemini call) via `qa/site-chain-download.mjs` → `scratch/samples/new/2026-10-22/out-1b3/T01_jpeg/`; also rebuild T02, T24 from `out-auto` to confirm no regression. Score with `qa/usability-score.mjs`; render T01 p1.png (`qa/golden/word-pdf-batch.ps1` → `qa/render-pdf-page.mjs`) and look at it yourself.
- No push. UTF-8 via Write/Edit only. Short shell output.

## Report
`scratch/agent-out/phase1b3_report.md` (≤20 lines), last line `DONE`.
