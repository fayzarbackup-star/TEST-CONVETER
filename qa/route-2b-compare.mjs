// Phase 2B QA: অচেনা ধরনের ৩ নমুনা — আগে (ক্লিন-কম্পোজার) বনাম পরে (GENERAL_CLEAN রাউটিং), এঞ্জিনের আসল পথে। Gemini লাগে না।
// চালানো: node qa/route-2b-compare.mjs   → scratch/samples/new/2026-10-22/out-2b/<ID>/{before,after}.docx + score.json + jobs.json
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
const E = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
g.ExportDualEngine = E;

const S = path.join(ROOT, 'scratch/samples/new/2026-10-22');
const OUT = path.join(S, 'out-2b');
function asMd(txt) {   // kept-text.md-এর "ক | খ" সারি → OCR Markdown ছক
  const out = []; let inT = false;
  for (const l of txt.split(/\r?\n/)) {
    if (l.includes(' | ')) { out.push('| ' + l.trim() + ' |'); if (!inT) { out.push('|' + l.split(' | ').map(() => '---').join('|') + '|'); inT = true; } }
    else { inT = false; out.push(l); }
  }
  return out.join('\n');
}
const buf = async (b) => Buffer.isBuffer(b) ? b : Buffer.from(await b.arrayBuffer());
const jobs = [], rows = [];
for (const id of ['T08_jpeg', 'T17_jpeg', 'T19_jpeg']) {
  const md = asMd(fs.readFileSync(path.join(S, 'out-2a', id, 'kept-text.md'), 'utf8'));
  const dir = path.join(OUT, id); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'source.md'), md);
  const row = { id };
  for (const variant of ['before', 'after']) {
    process.env.FZ_OFF_GENERAL_CLEAN = variant === 'before' ? '1' : '0';
    const blob = await E.generateModernDocx(md, 'GENERAL', { selfCheck: false });
    const f = path.join(dir, variant + '.docx');
    fs.writeFileSync(f, await buf(blob));
    jobs.push({ docx: f, pdf: path.join(dir, variant + '.pdf'), raw: '' });
    const p = spawnSync(process.execPath, [path.join(ROOT, 'qa/usability-score.mjs'), f, path.join(ROOT, 'eval/golden-set', id, 'expected.json'), path.join(dir, 'source.md')], { encoding: 'utf8' });
    const sc = JSON.parse(p.stdout);
    fs.writeFileSync(path.join(dir, variant + '.score.json'), JSON.stringify(sc, null, 1));
    row[variant] = Object.entries(sc.checks).map(([k, v]) => `${k}${v.pass ? 'P' : 'F'}`).join(' ') + ` c1=${sc.checks.c1.value}`;
  }
  rows.push(row);
}
fs.writeFileSync(path.join(OUT, 'jobs.json'), JSON.stringify(jobs, null, 1));
rows.forEach((r) => console.log(r.id, '\n  before:', r.before, '\n  after: ', r.after));
