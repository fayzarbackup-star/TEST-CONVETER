// Usage: node qa/baseline.mjs
// Scores every golden ID that has an auto-mode docx in out-auto; writes eval/baseline-2026-10-23.md.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUTO = path.join(root, 'scratch', 'samples', 'new', '2026-10-22', 'out-auto');
const GS = path.join(root, 'eval', 'golden-set');
const manifest = JSON.parse(fs.readFileSync(path.join(GS, 'manifest.json'), 'utf8'));

const results = [];
const pending = [];
for (const it of manifest.items) {
  const dir = path.join(AUTO, it.id);
  const docx = fs.existsSync(dir) ? fs.readdirSync(dir).find(f => f.endsWith('_Teacher_Master_Unicode.docx')) : null;
  if (!docx) { pending.push(it); continue; }
  const ocr = path.join(dir, 'ocr-text.md');
  try {
    const out = execFileSync(process.execPath, [
      path.join(root, 'qa', 'usability-score.mjs'), path.join(dir, docx), path.join(GS, it.id, 'expected.json'), ocr,
    ], { encoding: 'utf8' });
    results.push({ it, r: JSON.parse(out) });
  } catch (e) {
    results.push({ it, r: null, err: String(e.message).split('\n')[0] });
  }
}

const mark = c => (c ? (c.pass ? 'PASS' : 'FAIL') : '-');
const val = c => {
  if (!c) return '';
  const v = c.value;
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
};
const cols = ['c1', 'c2', 'c3', 'c5', 'c6', 'c7', 'c8', 'c9'];
function section(title, tier) {
  const rows = results.filter(x => x.it.tier === tier);
  let s = `## ${title}\n\n| ID | docType | ${cols.join(' | ')} | safety | looks |\n|${'---|'.repeat(cols.length + 4)}\n`;
  for (const { it, r, err } of rows) {
    if (!r) { s += `| ${it.id} | ${it.docType} | ERROR: ${err} |${' |'.repeat(cols.length + 1)}\n`; continue; }
    s += `| ${it.id} | ${it.docType} | ${cols.map(c => mark(r.checks[c])).join(' | ')} | ${r.safetyPass ? 'PASS' : 'FAIL'} | ${r.lookPass ? 'PASS' : 'FAIL'} |\n`;
  }
  if (!rows.length) s += '| (none scored) |\n';
  return s + '\n';
}

let md = `# Baseline 2026-10-23 (auto-mode output, no new Gemini runs)\n\nScored by qa/usability-score.mjs against eval/golden-set/*/expected.json (needsHumanCheck: true on all expectations).\n\n`;
md += section('Gate (✔)', '✔') + section('Separate track (◐)', '◐');
md += '## Details (failing checks)\n\n';
for (const { it, r } of results) {
  if (!r) continue;
  const fails = cols.filter(c => !r.checks[c].pass);
  if (fails.length) md += `- ${it.id}: ${fails.map(c => `${c}=${val(r.checks[c])}`).join('; ')}\n`;
}
md += '\n## Pending (no auto-mode docx)\n\n' + pending.map(p => `- ${p.id} (${p.tier})`).join('\n') + '\n';
fs.writeFileSync(path.join(root, 'eval', 'baseline-2026-10-23.md'), md, 'utf8');

const nSafe = results.filter(x => x.r?.safetyPass).length;
console.log(`scored ${results.length}, safety pass ${nSafe}, pending ${pending.length}`);
