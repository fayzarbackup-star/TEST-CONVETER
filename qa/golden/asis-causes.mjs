// কারণ-ভিত্তিক রিপোর্ট (সব ফাইল একসাথে): layout-score.json-এর প্রতি-লাইন dy/dx0/dx1/h থেকে ভুলকে মূল কারণে ভাগ করে।
// উদ্দেশ্য: ফাইল ধরে নয়, সব ফাইলে সবচেয়ে বেশি ঘটা কারণ ধরে কোড লেখা। চালানো: node qa/golden/asis-causes.mjs [--tag X] [--ids ..]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : ''; };
const DIR = opt('--tag') ? path.join(ROOT, 'qa/golden-data/runs', opt('--tag')) : path.join(ROOT, 'qa/golden-data/asis');
const IDS = opt('--ids') ? new Set(opt('--ids').split(',')) : null;
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const med = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const T = 6; // pt-এর বেশি হলে ভুল ধরা

const C = {
  offset: ['পাতার শুরুতে স্থির সরণ (উপরের মার্জিন/প্রথম লাইন)', 0, []],
  drift: ['ক্রমশ জমা সরণ (লাইন-পিচ/অনুচ্ছেদ-ফাঁক কম-বেশি)', 0, []],
  jump: ['হঠাৎ লাফ (বাড়তি/হারানো ফাঁকা লাইন, স্পেস-আগে/পরে)', 0, []],
  indent: ['বাম প্রান্ত ভুল (ইনডেন্ট/অ্যালাইনমেন্ট/ট্যাব)', 0, []],
  short: ['লাইন ছোট (ডান প্রান্ত আগে শেষ — র‍্যাপ/জাস্টিফাই/ফন্ট-প্রস্থ)', 0, []],
  long: ['লাইন লম্বা (ডান প্রান্ত বেশি — র‍্যাপ/ফন্ট-প্রস্থ)', 0, []],
  font: ['লাইন-উচ্চতা/ফন্ট-আকার ভুল', 0, []],
  unmatched: ['লাইন মেলেনি (হারানো/বাড়তি/ভুল পাতায়)', 0, []],
  rules: ['রেখা-সংখ্যা ভুল (হারানো/বাড়তি দাগ)', 0, []],
};
const add = (k, id, n) => { if (!n) return; C[k][1] += n; C[k][2].push([id, n]); };
let lines = 0, files = 0;

for (const id of fs.readdirSync(DIR).sort()) {
  if (IDS && !IDS.has(id)) continue;
  const lj = path.join(DIR, id, 'layout-score.json');
  if (!fs.existsSync(lj)) continue;
  files++;
  const L = read(lj);
  const n = { offset: 0, drift: 0, jump: 0, indent: 0, short: 0, long: 0, font: 0, unmatched: 0, rules: 0 };
  for (const p of L.per || []) {
    const rows = (p.rows || []).filter((r) => r.dy != null);
    lines += rows.length;
    n.unmatched += Math.max(0, (p.lines?.orig || 0) - (p.lines?.matched || 0)) + Math.max(0, (p.lines?.ours || 0) - (p.lines?.matched || 0));
    const cnt = (s) => (s ? String(s).trim().split(/\s+/).filter(Boolean).length : 0);
    n.rules += Math.abs(cnt(p.rules?.orig?.h) - cnt(p.rules?.ours?.h)) + Math.abs(cnt(p.rules?.orig?.v) - cnt(p.rules?.ours?.v));
    // dy ভাগ: স্থির অংশ (প্রথম ৩ লাইনের মধ্যমা), বাকি — ধাপে লাফ নাকি ধীরে জমা
    const base = med(rows.slice(0, 3).map((r) => r.dy));
    let prev = base;
    rows.forEach((r, i) => {
      const step = r.dy - prev;
      if (Math.abs(r.dy) > T) {
        if (Math.abs(r.dy - base) <= T) n.offset++;
        else if (i > 0 && Math.abs(step) > T) n.jump++;
        else n.drift++;
      }
      prev = r.dy;
      if (Math.abs(r.dx0) > T) n.indent++;
      if (r.dx1 < -T) n.short++;
      else if (r.dx1 > T) n.long++;
      if (r.h && r.hOurs && Math.abs(r.h - r.hOurs) > 2) n.font++;
    });
  }
  for (const k in n) add(k, id, n[k]);
}

console.log(`ফাইল ${files}, মেলানো লাইন ${lines} | কারণ (ভুল-লাইনের সংখ্যা, বড় আগে) | কত ফাইলে | সবচেয়ে বেশি`);
for (const [k, [name, tot, per]] of Object.entries(C).sort((a, b) => b[1][1] - a[1][1])) {
  const top = per.sort((a, b) => b[1] - a[1]).slice(0, 4).map(([i, v]) => `${i}:${v}`).join(' ');
  console.log(`${String(tot).padStart(5)}  ${String(per.length).padStart(2)}ফা  ${k.padEnd(9)} ${name} | ${top}`);
}
