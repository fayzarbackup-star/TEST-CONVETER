// Phase 2A QA: ক্যাশ-করা সব capture.json → doc-model → GENERAL_CLEAN .docx; ক্র্যাশ গোনা; ✔ ফাইলের স্কোর। Gemini লাগে না।
// চালানো: node qa/general-clean-batch.mjs [capturesRoot] [outDir]
//   ডিফল্ট: scratch/samples/new/2026-10-22/out → scratch/samples/new/2026-10-22/out-2a
// প্রতি ID-তে: clean.docx, kept-text.md, (✔ হলে) clean.score.json; শেষে summary.json + jobs.json (Word → PDF-এর জন্য)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const g = globalThis;
g.EquationConverter = require(path.join(ROOT, 'js/equation-converter.js'));
g.BanglaConverter = require(path.join(ROOT, 'js/bangla-converter-engine.js'));
g.TextRunProcessor = require(path.join(ROOT, 'js/layout-engine/text-run-processor.js'));
g.jszip = require(path.join(ROOT, 'js/jszip.min.js'));
g.ExportDualEngine = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const DM = require(path.join(ROOT, 'js/layout-engine/doc-model.js'));
const AD = require(path.join(ROOT, 'js/layout-engine/doc-model-adapters.js'));
const GC = require(path.join(ROOT, 'js/layout-engine/general-clean-layout.js'));

const capRoot = path.resolve(process.argv[2] || path.join(ROOT, 'scratch/samples/new/2026-10-22/out'));
const outRoot = path.resolve(process.argv[3] || path.join(ROOT, 'scratch/samples/new/2026-10-22/out-2a'));
const GOLD = path.join(ROOT, 'eval/golden-set');
fs.mkdirSync(outRoot, { recursive: true });

const ids = fs.readdirSync(capRoot).filter((d) => fs.existsSync(path.join(capRoot, d, 'capture.json'))).sort();
const rows = [], jobs = [];
let crashes = 0;
for (const id of ids) {
  const r = { id };
  try {
    const cap = JSON.parse(fs.readFileSync(path.join(capRoot, id, 'capture.json'), 'utf8'));
    const doc = AD.fromCapture(cap);   // Phase 4: ফ্রন্টম্যাটার থাকলে নকশা-পত্র অ্যাডাপ্টার, নইলে পুরোনোটা
    const errs = DM.validate(doc);
    if (errs.length) throw new Error('validate: ' + errs[0]);
    const out = path.join(outRoot, id);
    fs.mkdirSync(out, { recursive: true });
    const blob = await GC.renderDocx(doc, { generalClean: true });
    const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(path.join(out, 'clean.docx'), buf);
    fs.writeFileSync(path.join(out, 'kept-text.md'), DM.plainText(doc) + '\n');
    const st = GC.render(doc, { generalClean: true }).stats;
    Object.assign(r, { ok: true, pages: doc.pages.length, columns: doc.columns, blocks: DM.flat(doc).length, base: st.base, est: st.estPages,
      side: doc.pages.reduce((n, p) => n + p.blocks.filter((b) => b.role === 'side_by_side').length, 0), dropped: st.dropped, figDropped: st.droppedFigures });
    jobs.push({ docx: path.join(out, 'clean.docx'), pdf: path.join(out, 'clean.pdf'), raw: '' });
    // ✔ ফাইলের স্কোর
    const exp = path.join(GOLD, id, 'expected.json');
    if (fs.existsSync(exp)) {
      const p = spawnSync(process.execPath, [path.join(ROOT, 'qa/usability-score.mjs'), path.join(out, 'clean.docx'), exp, path.join(out, 'kept-text.md')], { encoding: 'utf8' });
      try { const sc = JSON.parse(p.stdout); fs.writeFileSync(path.join(out, 'clean.score.json'), JSON.stringify(sc, null, 1)); r.score = sc; } catch (e) { r.scoreErr = (p.stderr || p.stdout || '').slice(0, 120); }
    }
  } catch (e) { crashes++; r.ok = false; r.err = String(e && e.message || e).slice(0, 160); }
  rows.push(r);
}
fs.writeFileSync(path.join(outRoot, 'summary.json'), JSON.stringify({ total: ids.length, crashes, rows }, null, 1));
fs.writeFileSync(path.join(outRoot, 'jobs.json'), JSON.stringify(jobs, null, 1));
console.log(`captures=${ids.length} crashes=${crashes}`);
rows.filter((r) => !r.ok).forEach((r) => console.log('CRASH', r.id, r.err));
console.log(rows.filter((r) => r.ok).map((r) => `${r.id}:b${r.base}/${r.columns}c/${r.blocks}blk/sbs${r.side}`).join(' '));
