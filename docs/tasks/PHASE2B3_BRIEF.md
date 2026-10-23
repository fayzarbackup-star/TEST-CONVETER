# Phase 2B + 3 brief — scorer fixes, default-template decision, routing + self-check

Plan: `docs/FINAL_WORK_PLAN.md` line ~43 (S4), ~56-63 (flow diagram), §৭ self-check (grep "স্ব-যাচাই", "চেক ১–৯", "ত্রুটি-তালিকা"), §9 row "৩" (line ~158). Previous phase: `scratch/agent-out/phase2a_report.md`, `eval/compare-2a.md`.
All files editable; core-engine edits (docx-to-doc, bangla-converter, equation-converter, doc-binary) need a row in `docs/FROZEN_CHANGES.md`. Never touch equation code. 100% offline.

## 2B — fair comparison, then decide defaults
1. `qa/usability-score.mjs` artifacts (tooling, fix them): c1 must join adjacent w:t runs inside a paragraph before tokenizing (hyphen/slash/digit run splits must not count as word errors); c3 must ignore tables whose borders are all nil/none (layout tables, e.g. side_by_side). Re-score T01, T05 (template + clean) and T08, T17, T19 (clean). Expect c1 ≥0.98 where text is right; if not, say why.
2. Build the missing template outputs for T08/T17/T19 from the cached capture/ocr text if any path exists without Gemini (check `scratch/samples/new/2026-10-22/out-auto/<ID>/`); else leave n/a.
3. Rule (S4): per known doc_type, the variant with more passing checks wins; tie → keep the template. Write the decision table into `eval/compare-2a.md` (append "## 2B decision").
4. Unknown doc types: route production to GENERAL_CLEAN (via `fromOcrMarkdown`) in place of the current `_cleanComposerGeneric()` path in `export-dual-engine.js` (~line 432 area; grep it). Keep the existing fallback chain (on throw → clean-composer → generateGenericDocx). Skip for Bijoy fonts and STAMP_DEED as now. Before/after for 3 unknown-type samples: scores + one p1.png each in `scratch/samples/new/2026-10-22/out-2b/`.

## 3 — self-check (no extra Gemini calls in tests)
5. `js/layout-engine/self-check.js`: pure function `selfCheck(docxXmlOrModel, sourceText, opts)` → {pass, checks:{c1..c9}, errors:[Bengali short messages]}, reusing the logic of `qa/usability-score.mjs` (move shared code into a module both use; no duplication). Must run in the browser and Node.
6. Wire it after export: if it fails on a template output → rebuild with GENERAL_CLEAN; if still failing → deliver the better of the two + show the Bengali error list to the user (small panel/notice in the existing result UI; never block download, never empty-handed). The "call 2 (capture)" retry: implement only as a hook/stub flag (`FZ_SELFCHECK_RECAPTURE`, default off) — do not add a live Gemini call.
7. Tests: 1 known + 3 unknown files from cache, plus 4 deliberately broken inputs (dropped text, broken table, empty body, wrong orientation) → correct fallback + error list.

## Verify
- `node tests/run-all.mjs` → 0 fail (snapshots: prove any diff is intended before `--update`). Render and look at 2-3 PNGs yourself.
- No push. UTF-8 via Write/Edit only. `node tools/gen-map.mjs` after adding files. Short shell output.

## Report
`scratch/agent-out/phase2b3_report.md` (≤25 lines): changes, before/after scores, decision table, PNG paths, open issues. Last line `DONE`.
