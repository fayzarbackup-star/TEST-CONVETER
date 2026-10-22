# Phase 1B-ii brief (fix 1.3: light role marks from OCR) — for the delegated coding agent

Plan: `docs/FINAL_WORK_PLAN.md` §9 row "১খ" item 1.3 (also read §৪/§৫ about roles: grep "stamp|signature|marginal_note" in the plan). Owner rule: all files editable; if you touch `js/docx-to-doc-engine.js`, `js/bangla-converter-engine.js`, `js/equation-converter.js` or `js/doc-binary-engine.js`, add a row to `docs/FROZEN_CHANGES.md`. Never touch equation code.

## Goal
T01 (প্রত্যয়ন on a shop pad) currently mixes the pad header (address, mobile), the body, and the signature/stamp block into one flowing body (see `scratch/samples/new/2026-10-22/out-1b/T01_jpeg/p1.png`). Make Gemini's first OCR call emit light role marks, and make the letter/application/certificate layouts honor them.

## Change
1. `js/ai-ocr-engine.js` OCR prompt (find the main extraction prompt near the header-placeholder rules ~line 181): ask for optional, lightweight role tags on lines/blocks: `stamp`, `signature`, `marginal_note`, `side_by_side` (two blocks on one row, left/right), and `align` (left/center/right) only when clearly visible. The tag syntax must be backward-compatible: old parsers must ignore it (pick a syntax the existing parser already skips, or strip it in one central place before legacy consumers). Keep the prompt addition short (token cost!). One call only — no extra Gemini call.
2. Parse the tags in one helper (new module under `js/layout-engine/` is preferred) and use them in the certificate, letter and application layouts: pad header stays as header; signature/stamp block goes bottom-right (or side_by_side as a 2-cell borderless table); marginal notes small at the margin position.
3. Unit tests in `tests/` with hand-written tagged OCR text (no Gemini) for T01-like input, plus a test that untagged old text gives exactly the old output.

## Verify
- `node tests/run-all.mjs` → 0 fail; snapshots must not change (untagged input).
- Real check (needs Gemini via the app's OCR proxy): run `qa/auto-batch-e2e.mjs` (read its header) on ONLY T01 and T05 originals (find them under `scratch/samples/new/2026-10-22/`; copy just those 2 into a temp inDir). Output `scratch/samples/new/2026-10-22/out-1b2/`. If the proxy/Gemini is unavailable, say so and stop after unit tests.
- Score with `qa/usability-score.mjs` against `eval/golden-set/<ID>/expected.json`; render p1.png (`qa/golden/word-pdf-batch.ps1` → `qa/render-pdf-page.mjs`). Gate: no check that passed in `out-1b` may fail.
- No push. UTF-8 via Write/Edit only. Short shell output.

## Report
`scratch/agent-out/phase1b2_report.md` (≤25 lines): changed files + one-line summary, before→after scores, PNG paths, open issues. Last line `DONE`.
