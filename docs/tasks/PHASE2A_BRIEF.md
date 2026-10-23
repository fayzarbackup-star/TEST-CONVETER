# Phase 2A brief — doc-model + adapters + GENERAL_CLEAN layout (no Gemini)

Plan: `docs/FINAL_WORK_PLAN.md` §9 row "২ GENERAL_CLEAN" (line ~157). Read ONLY the plan sections it cites: §৫ (font ladder), §৬ (role policy), the role table around line ~95–105, and §৪/M2 (GENERAL_CLEAN reads only doc-model). Grep the plan for "doc-model", "ফন্ট-সিঁড়ি", "ভূমিকা-নীতি".
All files editable; core-engine edits need a row in `docs/FROZEN_CHANGES.md`. 100% offline.

## Build
1. `js/layout-engine/doc-model.js` — pure data structure (no rendering): document → pages? → blocks {role: heading|title|paragraph|list|table|side_by_side|signature|stamp|note|question|option_row|figure, text/runs, align, level, cells…}. Document it at the top in ≤15 lines.
2. Adapters (same folder or `doc-model-adapters.js`): `fromCaptureBlocks(capture.json)` (look at a few `scratch/samples/new/2026-10-22/out/*/capture.json` to learn the block format) and `fromOcrMarkdown(text)` (uses `role-marks.js` tags, markdown headings/tables, `---`).
3. `js/layout-engine/general-clean-layout.js` — reads ONLY doc-model; outputs unicode docx XML (and RTF if cheap) following the role policy and font ladder; side-by-side blocks as borderless 2-cell tables; columns when the model says so. Reuse helpers from `clean-composer.js` rather than duplicating.
4. Do NOT route production traffic to it yet. Expose it behind an opt-in (e.g. option/flag `generalClean:true` or env) so comparison is possible.

## Small leftovers (do them too)
- `doc_type: GOVT_APP` (classifier metadata line) leaked into the body on a mixed 3-image doc (`scratch/samples/new/2026-10-22/out-1c/MULTI3/`). Strip such metadata lines centrally in OCR cleanup.
- Add a **[বাঁয়ে ঘোরান]** (−90°) button next to [৯০° ঘোরান] (`js/home-app.js`, `js/image-tools.js`).

## Verify
- Unit tests for model, both adapters, layout (round-trip tables, side-by-side, signature).
- Batch over the 28 cached captures (`.../out/*/capture.json`) with a new `qa/general-clean-batch.mjs`: build docx for each; report crashes (must be 0). For T08, T17, T05, T01 (+T19): score GENERAL_CLEAN vs the current specific template with `qa/usability-score.mjs` (expected.json in `eval/golden-set/`), render p1.png for both into `scratch/samples/new/2026-10-22/out-2a/<ID>/{clean,template}.png`, look at them.
- Write the comparison table to `eval/compare-2a.md`. Gate: no safety check that passes for the template may fail for GENERAL_CLEAN on ✔ files — just report; don't switch defaults.
- `node tests/run-all.mjs` → 0 fail. No push. UTF-8 via Write/Edit only. `node tools/gen-map.mjs` after adding files. Short shell output.

## Report
`scratch/agent-out/phase2a_report.md` (≤25 lines), last line `DONE`.
