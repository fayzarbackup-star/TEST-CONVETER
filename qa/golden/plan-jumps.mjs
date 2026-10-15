// নির্ণয় (সব নমুনা, নতুন রান ছাড়া): নকশা (planPage) বনাম Word-এর আসল লাইন-শুরু — কোথায় হঠাৎ লাফ (Δ(word−plan) > ৩pt) আর তার ঠিক আগের অংশ কী।
// লাফ = আগের অংশের নকশা-উচ্চতা Word-এর আসল উচ্চতার সাথে মেলেনি। ধরন অনুযায়ী মোট pt — কোন অংশ-শ্রেণি ঠিক করলে সবচেয়ে বেশি লাভ।
// চালানো: node qa/golden/plan-jumps.mjs [id,id…] [--list]   (জমা ir.json + out.raw.json; Word লাগে না)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AD = path.join(ROOT, 'qa/golden-data/asis');
const D = createRequire(import.meta.url)(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));
const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const ids = arg ? arg.split(',') : fs.readdirSync(AD).filter((d) => fs.existsSync(path.join(AD, d, 'out.raw.json')) && fs.existsSync(path.join(AD, d, 'ir.json')));
const LIST = process.argv.includes('--list');
const key = (s) => String(s || '').replace(/\*\*|<[^>]+>|[\s.…:_\-–—]/g, '').slice(0, 6);

// অংশের শ্রেণি (কোন ধরনের অংশ উচ্চতা ভুল করে)
function klass(e) {
  if (e.band) return 'grid-band';
  const it = e.it;
  if (it.kind === 'table') return `table${it.borderless ? '-borderless' : ''}${it.rowHeightsPt ? '-rbh' : ''}`;
  if (it.kind === 'figure') return 'figure';
  const n = (it.lines || []).length;
  const tags = [it.type || 'para', n > 1 ? (it.keepLines ? 'kept' : 'flow') : 'one', it.tabLines ? 'tab' : '', it.keepJust ? 'kj' : '', it.lineRule === 'exact' ? 'exact' : ''].filter(Boolean);
  return tags.join('/');
}

const agg = {}, list = [], E = { n: 0, ps: 0, wp: 0, ws: 0, bad: 0, per: {} };
let totalAbs = 0, nPages = 0;
for (const id of ids) {
  let ir, raw;
  try { ir = JSON.parse(fs.readFileSync(path.join(AD, id, 'ir.json'), 'utf8')); raw = JSON.parse(fs.readFileSync(path.join(AD, id, 'out.raw.json'), 'utf8').replace(/^﻿/, '')); } catch { continue; }
  ir.pages.forEach((page, pi) => {
    const pn = pi + 1;
    let plan; try { plan = D.planPage(page); } catch { return; }
    const { els, f } = plan;
    const paras = raw.paragraphs.filter((p) => p.page === pn).map((p) => ({ p, k: key([].concat(p.runs || []).map((r) => r.t).join('')) }));
    const used = new Set(), pts = [];
    let y = page.margins.top, prevEl = null;
    const add = (it, top, el) => {
      const k = key((it.lines && it.lines[0]) || it.text);
      if (!k || it.kind !== 'para') return;
      const i = paras.findIndex((q, j) => !used.has(j) && q.k === k);
      if (i < 0) return;
      used.add(i);
      pts.push({ d: paras[i].p.y - top, el, prev: prevEl, k, ps: it.rect ? top - it.rect.y : null, ws: it.rect ? paras[i].p.y - it.rect.y : null });
    };
    els.forEach((e) => {
      y += e.before * f;
      if (e.band) e.cells.forEach((c) => { let cy = y; c.its.forEach((x) => { cy += x.before * f; add(x.it, cy, e); cy += x.h; }); });
      else add(e.it, y, e);
      y += e.h; prevEl = e;
    });
    nPages++;
    // ভুল মেলানো (একই ৬-অক্ষরের চাবি অন্য অনুচ্ছেদে): একটি বিন্দু দুই পাশ থেকে >১৫pt দূরে অথচ পাশের দুটি নিজেরা কাছাকাছি ⇒ বাদ
    for (let k = pts.length - 2; k >= 1; k--) {
      const a = pts[k - 1].d, b = pts[k].d, c = pts[k + 1].d;
      if (Math.abs(b - a) > 15 && Math.abs(b - c) > 15 && Math.abs(a - c) <= 8) pts.splice(k, 1);
    }
    if (pts.length >= 2 && Math.abs(pts[pts.length - 1].d - pts[pts.length - 2].d) > 150) pts.pop();
    pts.forEach((p) => { if (p.ps == null) return; E.n++; E.ps += Math.abs(p.ps); E.wp += Math.abs(p.d); E.ws += Math.abs(p.ws); if (Math.abs(p.ws) > 6) E.bad++; (E.per[id] = E.per[id] || { n: 0, ws: 0 }).n++; E.per[id].ws += Math.abs(p.ws); });
    for (let k = 1; k < pts.length; k++) {
      const jump = pts[k].d - pts[k - 1].d;
      if (Math.abs(jump) <= 3) continue;
      // দোষী = আগের মেলানো লাইনের অংশ থেকে এই অংশের আগ পর্যন্ত — সাধারণত আগের অংশটি (বা মাঝের টেবিল/ছবি)
      const from = els.indexOf(pts[k - 1].el), to = els.indexOf(pts[k].el);
      const between = els.slice(from, Math.max(from + 1, to));
      const culprit = between.find((e) => !e.band && e.it && e.it.kind !== 'para') || between[between.length - 1] || pts[k - 1].el;
      const c = klass(culprit);
      agg[c] = agg[c] || { n: 0, pt: 0, up: 0, down: 0 };
      agg[c].n++; agg[c].pt += Math.abs(jump); if (jump < 0) agg[c].up += -jump; else agg[c].down += jump;
      totalAbs += Math.abs(jump);
      list.push({ id, pn, jump: +jump.toFixed(1), c, at: pts[k].k, after: pts[k - 1].k });
    }
  });
}
console.log(`নমুনা ${ids.length}, পাতা ${nPages}, লাফ ${list.length}, মোট |লাফ| ${totalAbs.toFixed(0)}pt`);
console.log(`মেলানো অনুচ্ছেদ ${E.n}: গড় |নকশা−মূল| ${(E.ps / E.n).toFixed(1)}pt, |Word−নকশা| ${(E.wp / E.n).toFixed(1)}pt, |Word−মূল| ${(E.ws / E.n).toFixed(1)}pt; >৬pt দূরে ${E.bad}`);
console.log('ফাইল-প্রতি গড় |Word−মূল|: ' + Object.entries(E.per).sort((a, b) => b[1].ws / b[1].n - a[1].ws / a[1].n).map(([k, v]) => `${k} ${(v.ws / v.n).toFixed(1)}`).join(', '));
console.log('শ্রেণি (মোট pt | সংখ্যা | Word বেশি-ওপরে / বেশি-নিচে):');
Object.entries(agg).sort((a, b) => b[1].pt - a[1].pt).slice(0, 14).forEach(([c, v]) => console.log(`  ${c.padEnd(34)} ${v.pt.toFixed(0).padStart(5)}pt  ${String(v.n).padStart(3)}×  ↑${v.up.toFixed(0)} ↓${v.down.toFixed(0)}`));
const top = list.slice().sort((a, b) => Math.abs(b.jump) - Math.abs(a.jump));
(LIST ? top : top.slice(0, 12)).forEach((j) => console.log(`  ${j.id} p${j.pn} ${String(j.jump).padStart(6)}pt  ${j.c}  (${j.after} → ${j.at})`));
