// সমস্যা-ধরন বিশ্লেষণ (Word লাগে না): প্রতি ফাইলের সর্বশেষ layout-score.json থেকে ভুলের ধরন গুনে
// কোন ধরন কতগুলো ফাইলে আছে দেখায় — বেশি ফাইলে ছড়ানো ধরন = সার্বজনীন সমস্যা, আগে সারাতে হবে।
// চালানো: node qa/golden/asis-types.mjs [--ids a01,a02] [--json out.json]
//   প্রতি id-র জন্য runs/-এর সবচেয়ে নতুন রান নেয় (না থাকলে qa/golden-data/asis/<id>)
import fs from 'node:fs';
import path from 'node:path';

const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const ROOT = 'qa/golden-data';
const fixtureIds = fs.readdirSync(`${ROOT}/asis`).filter((d) => fs.existsSync(`${ROOT}/asis/${d}/layout-score.json`) || fs.statSync(`${ROOT}/asis/${d}`).isDirectory());
const ids = (opt('--ids') || fixtureIds.join(',')).split(',');

// প্রতি id-র সর্বশেষ রান
const runs = fs.readdirSync(`${ROOT}/runs`).filter((t) => fs.statSync(`${ROOT}/runs/${t}`).isDirectory())
  .map((t) => ({ t, m: fs.statSync(`${ROOT}/runs/${t}`).mtimeMs })).sort((a, b) => a.m - b.m);
const src = {};
for (const id of ids) {
  src[id] = `${ROOT}/asis/${id}`;
  for (const { t } of runs) if (fs.existsSync(`${ROOT}/runs/${t}/${id}/layout-score.json`)) src[id] = `${ROOT}/runs/${t}/${id}`;
}

// ধরন ও উপ-ধরন (চিহ্ন = দিক)
const TYPES = {
  'font+': (r) => r.hOurs - r.h >= 3, // আমাদের লেখা বড়
  'font-': (r) => r.h - r.hOurs >= 3, // আমাদের লেখা ছোট
  'vgap+': (r) => r.dy >= 4, // নিচে সরে গেছে
  'vgap-': (r) => r.dy <= -4, // ওপরে উঠে গেছে
  'indent+': (r) => r.dx0 >= 4, // ডানে সরে শুরু
  'indent-': (r) => r.dx0 <= -4,
  long: (r) => r.dx1 >= 8,
  short: (r) => r.dx1 <= -8,
};
const per = {}, byType = {};
for (const id of ids) {
  const f = `${src[id]}/layout-score.json`;
  if (!fs.existsSync(f)) { console.log(`${id}: layout-score.json নেই`); continue; }
  const j = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
  const c = { lines: 0 };
  const add = (k, n = 1) => { if (n > 0) c[k] = (c[k] || 0) + n; };
  if (j.pages && j.pages.out !== j.pages.truth) add('pages', Math.abs(j.pages.out - j.pages.truth));
  for (const p of j.per || []) {
    for (const r of p.rows || []) { c.lines++; for (const [k, t] of Object.entries(TYPES)) if (t(r)) add(k); }
    const L = p.lines || {};
    add('missing', (L.orig || 0) - (L.matched || 0)); // মূলে আছে, আমাদের মেলেনি
    add('extra', (L.ours || 0) - (L.matched || 0));
    const len = (o, k) => (o && o[k] && o[k].length) || 0;
    add('rules-', len(p.rules?.orig, 'h') + len(p.rules?.orig, 'v') - len(p.rules?.ours, 'h') - len(p.rules?.ours, 'v'));
    add('rules+', len(p.rules?.ours, 'h') + len(p.rules?.ours, 'v') - len(p.rules?.orig, 'h') - len(p.rules?.orig, 'v'));
  }
  per[id] = { score: j.score, src: src[id], ...c };
  for (const k of Object.keys(c)) if (k !== 'lines') (byType[k] = byType[k] || { files: [], n: 0 }), byType[k].files.push(id), (byType[k].n += c[k]);
}

const N = Object.keys(per).length;
console.log(`ফাইল ${N}টি | গড় লেআউট ${(Object.values(per).reduce((s, x) => s + x.score, 0) / N).toFixed(1)}`);
console.log('ধরন        ফাইল   মোট   কোন ফাইলে (বেশি থেকে কম)');
for (const [k, v] of Object.entries(byType).sort((a, b) => b[1].files.length - a[1].files.length || b[1].n - a[1].n)) {
  const top = v.files.map((id) => `${id}:${per[id][k]}`).sort((a, b) => +b.split(':')[1] - +a.split(':')[1]).slice(0, 8).join(' ');
  console.log(`${k.padEnd(10)} ${String(v.files.length).padStart(3)}/${N} ${String(v.n).padStart(5)}   ${top}`);
}
if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify({ per, byType }, null, 1));
