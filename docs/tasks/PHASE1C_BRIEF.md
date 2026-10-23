# Phase 1C brief — input tools: rotate 90°, split into 2 pages, multi-image check

Plan: `docs/FINAL_WORK_PLAN.md` §9 row "১গ" (line ~156; also grep the plan for "ঘোরান", "ভাগ করুন", "ডাকের বাজেট"). Golden files: T10, T12 (`eval/golden-set/`, manifest says where originals are) and one 3-image document (find one among `scratch/samples/new/2026-10-22/` originals or the manifest; if none, make one by using 3 page images of an existing multi-page sample).
All files editable; core-engine edits (docx-to-doc, bangla-converter, equation-converter, doc-binary) need a row in `docs/FROZEN_CHANGES.md`. 100% offline: no CDN.

## Build
1. In the image preview of the main OCR page (`index.html` + `js/ai-ocr-engine.js` preview/upload area — locate via `docs/PROJECT_MAP.md`), add two buttons per image: **[৯০° ঘোরান]** (rotate clockwise, repeatable) and **[২ পাতা ভাগ করুন]** (split a landscape two-page scan into left/right images, inserted in order in place of the original). Plain `<canvas>` code in a new small module under `js/` (e.g. `js/image-tools.js`), wired by a few lines. The processed image is what gets sent to OCR. Keep the original file name with suffixes.
2. Per-image call budget: make sure a multi-image document still uses one OCR call per image at most (check the existing flow; just report if it already does). No extra calls.
3. Bengali button labels, matching the existing button style.

## Verify
- Unit test for the canvas math where feasible (rotation dims, split halves) with a Node test using plain arrays or a tiny canvas shim; don't add heavy deps.
- Headless check with puppeteer (already used by `qa/site-chain-download.mjs`): load `index.html` from file://, add an image, click both buttons, assert the preview image count/dimensions. No Gemini call needed for this.
- Real run (Gemini, keep it minimal): T10, T12 and the 3-image doc once each through `qa/auto-batch-e2e.mjs` (read its header; if it can't apply rotate/split, pre-rotate/split the images with the same module in Node and feed those). Output `scratch/samples/new/2026-10-22/out-1c/`. Score with `qa/usability-score.mjs`, render p1.png, look at them.
- `node tests/run-all.mjs` → 0 fail. No push. UTF-8 via Write/Edit only. Short shell output.

## Report
`scratch/agent-out/phase1c_report.md` (≤25 lines): changes, scores, PNG paths, open issues. Last line `DONE`.
