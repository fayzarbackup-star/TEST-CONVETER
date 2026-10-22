# Brief: repeat table header row in .doc (core engine, owner-approved 2026-10-23)

- Problem: unicode .docx has `<w:tblHeader/>` (and `<w:cantSplit/>`) in `w:trPr`, but the Word-2003 .doc made by `js/docx-to-doc-engine.js` drops them. T02 page 2 shows no header row.
- Change (minimal, additive): in `js/docx-to-doc-engine.js`, where table-row properties (TAPX / sprms for a row end) are written, read `w:trPr/w:tblHeader` → emit sprmTTableHeader (0x3404, operand 1); `w:cantSplit` → sprmTFCantSplit (0x3403, operand 1) (also 0x3466 sprmTFCantSplit90 if the engine targets Word 97+ row props). Find the spot via grep (`trPr`, `trHeight`, `0x9407`, `sprmT`) — do not read the whole file.
- **Do not touch** equation/EQ/OLE code, text/run/font paths, or anything else. If table-row sprms aren't written in one clear place, stop and report instead of restructuring.
- Verify:
  1. `node tests/run-all.mjs` → 0 failures (snapshots should not change; if they do, report exact diffs, don't update).
  2. Rebuild T02: `$env:FMTS='doc,unicode_docx'; node qa/site-chain-download.mjs scratch/samples/new/2026-10-22/out-tblh/T02_pdf scratch/samples/new/2026-10-22/out-auto/T02_pdf/ocr-text.md`, render pages 1–2 (`qa/golden/word-pdf-batch.ps1` jobs `[{docx:<the .doc>, pdf, raw:""}]`, then `node qa/render-pdf-page.mjs <pdf> <n> <png>`) → `out-tblh/T02_pdf/p1.png`, `p2.png`. Page 2 must start with the header row.
  3. Also render page 1 of one math fixture .doc (e.g. build `tests/fixtures/math-equations.input.md` the same way) to confirm equations unchanged vs before your change (render before editing too).
- After the change, append one row to `docs/FROZEN_CHANGES.md` (Bengali): date | file | what/why | verification | জানানো: না.
- No push. UTF-8 via Write/Edit only. Report `scratch/agent-out/tblheader_report.md` (≤15 lines, last line `DONE`).
