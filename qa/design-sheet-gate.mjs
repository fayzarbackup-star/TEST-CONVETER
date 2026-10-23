// Phase 4 গেট-মাপ (Gemini লাগে না): ট্যাগ-বৈধতা, ফ্রন্টম্যাটার-মিল, [?]/নতুন-ভূমিকা সংখ্যা, truth.txt-এর বিপরীতে শব্দ-ত্রুটি (WER; নতুন বনাম পুরোনো ক্যাপচার)।
// চালানো: node qa/design-sheet-gate.mjs [newRoot] [oldRoot]   (ডিফল্ট: 2026-10-23/out-p4 বনাম 2026-10-22/out)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = require(path.join(ROOT, 'js/layout-engine/faithful/layout-tags.js'));
const newRoot = path.resolve(process.argv[2] || path.join(ROOT, 'scratch/samples/new/2026-10-23/out-p4'));
const oldRoot = path.resolve(process.argv[3] || path.join(ROOT, 'scratch/samples/new/2026-10-22/out'));
const GOLD = path.join(ROOT, 'eval/golden-set');
const NEWR = ['date', 'recipient', 'subject', 'salutation', 'marginal_note'];

const toks = (s) => String(s || '').replace(/\*\*|\*|\||•|\^\{|\}/g, ' ').split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
function lev(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
// rescue=true: figure-ট্যাগের পরে লেখা (figText) গোনা — fromDesignSheet যা উদ্ধার করে
const capText = (c, rescue) => c.blocks.map((b) => (b.type === 'figure' ? (rescue ? b.figText || '' : '') : b.text)).join('\n');
// bag = ক্রম-নিরপেক্ষ (টেবিলে ঘরের লাইন-ভাঙা ক্রম আলাদা হলে ordered ফুলে যায়); err = ordered Levenshtein
const wer = (cap, truth, rescue) => {
  const t = toks(truth), a = toks(capText(cap, rescue));
  const cnt = (x) => x.reduce((m, w) => (m[w] = (m[w] || 0) + 1, m), {}), A = cnt(a), B = cnt(t);
  let ex = 0, mi = 0; Object.keys(A).forEach((k) => { ex += Math.max(0, A[k] - (B[k] || 0)); }); Object.keys(B).forEach((k) => { mi += Math.max(0, B[k] - (A[k] || 0)); });
  return { n: t.length, err: lev(a, t), bag: Math.max(ex, mi) };
};

const ids = fs.readdirSync(newRoot).filter((d) => fs.existsSync(path.join(newRoot, d, 'capture.json'))).sort();
let tot = 0, valid = 0, fmAgree = 0, fmN = 0, newRoles = 0, unreadable = 0, grouped = 0, fmHave = 0;
const dmap = { bangla: 'bn', english: 'en', mixed: 'mixed' };
for (const id of ids) {
  const c = JSON.parse(fs.readFileSync(path.join(newRoot, id, 'capture.json'), 'utf8'));
  c.blocks.forEach((b) => { tot++; if (!b.unknownType && T.TYPES.indexOf(b.type) >= 0 && b.box) valid++; if (NEWR.indexOf(b.type) >= 0) newRoles++; if (b.group) grouped++; unreadable += b.unreadable || 0; });
  if (c.frontmatter) fmHave++;
  const ep = path.join(GOLD, id, 'expected.json');
  if (c.frontmatter && fs.existsSync(ep)) {
    const e = JSON.parse(fs.readFileSync(ep, 'utf8')), f = c.frontmatter;
    [[f.orientation, e.orientation], [f.columns, e.columns], [f.digits, e.digits ? dmap[e.digits] || e.digits : null]].forEach(([a, b]) => { if (b != null) { fmN++; if (a === b) fmAgree++; } });
  }
}
console.log(`files=${ids.length} frontmatter=${fmHave}/${ids.length} blocks=${tot} tagValidity=${(100 * valid / tot).toFixed(1)}% newRoleBlocks=${newRoles} grouped=${grouped} [?]=${unreadable} frontmatterAgreeWithExpected=${fmAgree}/${fmN}`);
for (const id of ids) {
  const tp = path.join(GOLD, id, 'truth.txt');
  if (!fs.existsSync(tp)) continue;
  const truth = fs.readFileSync(tp, 'utf8').split('\n').slice(1).join('\n');
  const nc = JSON.parse(fs.readFileSync(path.join(newRoot, id, 'capture.json'), 'utf8'));
  const n = wer(nc, truth, true);
  const op = path.join(oldRoot, id, 'capture.json');
  const o = fs.existsSync(op) ? wer(JSON.parse(fs.readFileSync(op, 'utf8')), truth) : null;
  console.log(`WER ${id}: new ordered ${n.err}/${n.n}=${(100 * n.err / n.n).toFixed(1)}% bag ${(100 * n.bag / n.n).toFixed(1)}%` + (o ? `  | old ordered ${(100 * o.err / o.n).toFixed(1)}% bag ${(100 * o.bag / o.n).toFixed(1)}%` : ''));
}
