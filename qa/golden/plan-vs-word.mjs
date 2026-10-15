// নকশার (planPage) লাইন-শুরু বনাম Word-এর মাপা লাইন-শুরু, প্রতিটি প্রবাহ-অনুচ্ছেদে — সরণ কোথায় জন্মায় দেখতে
// চালানো: node qa/golden/plan-vs-word.mjs a03 [পাতা]   (সারাংশ ≤৩০ লাইন)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const D = createRequire(import.meta.url)(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));
const id = process.argv[2] || 'a03', pn = +(process.argv[3] || 1);
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis', id, f), 'utf8').replace(/^﻿/, ''));
const ir = read('ir.json'), raw = read('out.raw.json');
const page = ir.pages[pn - 1];
const { els, f } = D.planPage(page);
const key = (s) => String(s || '').replace(/\*\*|<[^>]+>|[\s.…:_\-–—]/g, '').slice(0, 6);
const paras = raw.paragraphs.filter((p) => p.page === pn).map((p) => ({ p, k: key([].concat(p.runs || []).map((r) => r.t).join('')) }));
let y = page.margins.top, used = new Set();
const out = [];
const add = (it, top) => {
  const k = key((it.lines && it.lines[0]) || it.text);
  if (!k || it.kind !== 'para') return;
  const m = paras.find((q, i) => !used.has(i) && q.k === k && (used.add(i) || true));
  out.push({ k, src: it.rect ? it.rect.y : null, plan: top, word: m ? m.p.y : null, F: it.fontPt, L: m ? m.p.ls : null });
};
els.forEach((e) => {
  y += e.before * f;
  if (e.band) {
    e.cells.forEach((c) => { let cy = y; c.its.forEach((x) => { cy += x.before * f; add(x.it, cy); cy += x.h; }); });
  } else {
    add(e.it, y);
    if (e.it.kind === 'table' && process.env.TABLES) {
      const t = e.it, rw = t.rows || [];
      console.log(`table y${y.toFixed(1)} h${e.h.toFixed(1)} src-h${t.heightPt} rows${rw.length} cols${Math.max(...rw.map((r) => r.length))} F${t.fontPt} empty${rw.filter((r) => !r.some((c) => c && String(c).trim())).length} borderless${!!t.borderless}`);
    }
  }
  y += e.h;
});
const r = (v) => (v == null ? '  -  ' : v.toFixed(1).padStart(6));
console.log(`${id} p${pn}: src=মূল কালি-শুরু, plan=নকশার লাইন-শুরু, word=Word-এর লাইন-শুরু`);
out.slice(0, 28).forEach((o) => console.log(`${o.k.padEnd(7)} F${String(o.F).padEnd(5)} src${r(o.src)} plan${r(o.plan)} word${r(o.word)}  w-p ${o.word != null ? (o.word - o.plan).toFixed(1) : '-'}  w-src ${o.word != null && o.src != null ? (o.word - o.src).toFixed(1) : '-'}`));
