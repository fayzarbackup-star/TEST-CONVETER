# AGENTS.md: Direct Execution Directives

1. **High Speed & Efficiency:** No mandatory multi-phase bureaucratic workflows or delays. Act on requests directly and promptly.
2. **Quality & Precision:** Maintain clean, robust code without guessing.
3. **100% Offline Integrity:** Keep all assets, fonts, and scripts local.
4. **Protect working engines (no big/structural change without the user knowing):** (a) Core — `js/docx-to-doc-engine.js`, `js/bangla-converter-engine.js`, `js/equation-converter.js`, `js/doc-binary-engine.js`: ask permission before ANY change. (b) Main working engines (export-dual-engine, question-engine, ai-ocr-engine, fayzar-pipeline, doc-classifier, docx-handler, text-run-processor, layout planners): small additive wiring (routing line, new case, calling a separate module) is fine — report afterwards; changing existing behavior or structure needs permission first. (c) Other files (own new modules, tests, qa, docs): change, then report. Layout logic stays in separate modules in `js/layout-engine/`. For a new doc_type, the agent decides which wiring places to touch (usually: ai-ocr-engine.js prompt, doc-classifier.js, fayzar-pipeline.js, export-dual-engine.js, HTML script tags) — as few as possible.
5. **Context first:** Read only docs/HANDOFF.md at start; docs/AI_MEMORY.md only if needed (relevant part only). To find an edit point: docs/PROJECT_MAP.md (task → file → function) → Grep docs/CODE_INDEX.md (name@line) → Read only that part. Never read the whole project or whole big files. After adding/renaming/deleting files run `node tools/gen-map.mjs`; add one line to PROJECT_MAP for a new task/module.

## Token saving
6. PowerShell/Word COM scripts print only a summary (max 30 lines); write details to a file, never read the full dump back. Filter useless lines (e.g. empty SHAPE).
7. Do not read PDFs; ask me for a screenshot if needed.
8. During work run only related tests; full suite once at the end; show only failures and totals.
9. Before stopping, every time: rewrite docs/HANDOFF.md (max 15 lines: where you stopped, what is left, next task and how to start it, pending permissions/decisions); add 5-10 lines of history to AI_MEMORY; then a short final report.