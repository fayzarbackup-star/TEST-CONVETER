# Phase 4 brief — design sheet v1 (richer capture tags + `fromDesignSheet()`)

Plan: `docs/FINAL_WORK_PLAN.md` §3 row "নকশা-পত্র" (line ~44, M2), flow diagram (~54-66), §6 role table (~92-106), §10 (T02 digits = English), §9 row "৪" (line ~159). Previous: `scratch/agent-out/phase2b3_report.md`, `eval/compare-2a.md`.
All files editable; core-engine edits (docx-to-doc, bangla-converter, equation-converter, doc-binary) need a row in `docs/FROZEN_CHANGES.md`. Never touch equation code. 100% offline. Read only the parts of big files you need (PROJECT_MAP → CODE_INDEX grep → partial Read).

## Tasks
1. **Capture prompt** (`js/layout-engine/faithful/faithful-prompt.js` / `faithful-capture.js` — check which builds the `[[B:t=…;box=…]]` request): add, backward-compatible:
   - frontmatter (`---` block: doc_type, page size/orientation, columns, digit script),
   - block roles `date`, `recipient`, `subject`, `salutation`, `marginal_note` (plus existing ones),
   - side-by-side marker (blocks sharing a row → same group id),
   - tables: header rows, column width ratios, merged cells (rowspan/colspan),
   - `[?]` for unreadable words,
   - **digits: keep the source script exactly** (T02 numbers are English; the old capture converted them — fix this, add a test).
   Old captures without the new tags must still parse.
2. **Adapter** `fromDesignSheet(capture)` in `js/layout-engine/doc-model-adapters.js` → same `doc-model` that `general-clean-layout.js` already reads. **Do not edit `general-clean-layout.js`** unless doc-model truly lacks a field; if so, add the field to `doc-model.js` and say why. Map new roles per §6 (date/recipient/subject/salutation → paragraph variants with alignment; marginal_note → dropped in v1).
   Route: where `fromCaptureBlocks` is used for GENERAL_CLEAN, use `fromDesignSheet` when the capture has the new frontmatter, else the old adapter.
3. **Re-capture the 15 golden files** (`eval/golden-set/manifest.json`, T01…T25) with the new prompt — 15 Gemini calls max, one per file, no retries unless a call errors. Find the existing capture runner (e.g. `qa/golden/*`, `qa/site-chain-download.mjs`, or the script that wrote `scratch/samples/new/2026-10-22/out/*/capture.json`). Save to `scratch/samples/new/2026-10-23/out-p4/<ID>/capture.json` + built docx + score.
4. **Gate measurement** (write numbers, do not tune to pass):
   - tag validity ≥90% (blocks that parse with a known role & valid box),
   - role accuracy ≥75% vs `expected.json` / your careful look at the image for 5 files,
   - word error ≤3% on 3 truth texts. If truth texts do not exist yet (plan 0.6), create `eval/golden-set/<ID>/truth.txt` for T01, T05, T08 by careful reading of the source image (~300 words each), mark them "draft — owner to verify" in the report.
   - verdict: does one call give both text and structure well enough? (→ plan "এক ডাকের চূড়ান্ত রায়").
5. Compare GENERAL_CLEAN outputs old-capture vs new-capture on T01, T05, T08, T17, T19, T02 with `qa/usability-score.mjs`; render 2-3 PNGs (`qa/golden/word-pdf-batch.ps1` → `qa/render-pdf-page.mjs`) and look at them yourself (titles/signature roles on T19 should now be right).

## Verify
- Unit tests for the parser/adapter (old + new format, digits kept, merged table, side-by-side) in `tests/`.
- `node tests/run-all.mjs` → 0 fail (prove any snapshot diff is intended before `--update`).
- No push. UTF-8 via Write/Edit only (never PowerShell Set-Content). `node tools/gen-map.mjs` after adding files. Short shell output (≤30 lines).

## Report
`scratch/agent-out/phase4_report.md` (≤25 lines): changes, gate numbers, old vs new scores table, PNG paths, Gemini calls used, open issues. Last line `DONE`.
