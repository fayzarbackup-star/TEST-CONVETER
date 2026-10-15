// "ঠিক" লাইন-উচ্চতার লাইনে Word-এর লাইন-শুরু থেকে কালির ওপর/নিচ কত নিচে (ফন্ট/লাইন-উচ্চতা ধরে) — আমাদের out.pdf + out.raw.json থেকে
// চালানো: node qa/golden/ink-offset.mjs a03,f2,…   (সারাংশ ≤৩০ লাইন; বিস্তারিত qa/golden-data/ink-offset.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMasks } from './image-score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AD = path.join(ROOT, 'qa/golden-data/asis');
const ids = (process.argv[2] || 'a03').split(',');
const px = 2, rows = [];
const docs = ids.filter((id) => fs.existsSync(path.join(AD, id, 'out.pdf')) && fs.existsSync(path.join(AD, id, 'out.raw.json')));
const { pages: all, browser } = await renderMasks(docs.map((id) => path.join(AD, id, 'out.pdf')), 144);
await browser.close();
docs.forEach((id, k) => {
  const raw = JSON.parse(fs.readFileSync(path.join(AD, id, 'out.raw.json'), 'utf8').replace(/^﻿/, ''));
  for (const p of raw.paragraphs) {
    const runs = p.runs ? [].concat(p.runs) : [];
    if (p.lsRule !== 4 || p.lines !== 1 || !runs.length || p.page !== p.pageEnd || p.ls < 5) continue;
    const pg = all[k][p.page - 1];
    if (!pg) continue;
    const sizes = runs.filter((r) => String(r.t || '').trim()).map((r) => r.size);
    if (!sizes.length || Math.max(...sizes) - Math.min(...sizes) > 0.6) continue;
    const F = sizes[0], L = p.ls, top = p.y;
    const x0 = Math.round((p.x + (p.li || 0)) * px), x1 = pg.w - Math.round(30 * px);
    const y0 = Math.round(top * px), y1 = Math.round((top + L) * px);
    let a = -1, b = -1;
    for (let y = Math.max(0, y0 - 2); y <= Math.min(pg.h - 1, y1 + 2); y++) {
      let n = 0;
      for (let x = x0; x < x1; x++) if (pg.bits.charCodeAt(y * pg.w + x) === 49) n++;
      if (n >= 3) { if (a < 0) a = y; b = y; }
    }
    if (a < 0) continue;
    const text = runs.map((r) => r.t || '').join('');
    rows.push({ id, F, L: +L.toFixed(2), top: +top.toFixed(1), off: +((a / px) - top).toFixed(2), bot: +((b / px) - top).toFixed(2),
      tall: /[িীৈৌঁ]|র্/.test(text) ? 1 : 0, bn: /[ঀ-৿]/.test(text) ? 1 : 0, lat: /[A-Za-z]/.test(text) ? 1 : 0 });
  }
});
fs.writeFileSync(path.join(ROOT, 'qa/golden-data/ink-offset.json'), JSON.stringify(rows, null, 0));
// ফন্ট ধরে দল: মধ্যমা off/bot, এবং (L−F) সম্পর্ক
const med = (v) => { const s = [...v].sort((x, y) => x - y); return s[s.length >> 1]; };
const by = {};
rows.forEach((r) => { const key = `${r.F}|${r.L}|${r.bn ? (r.tall ? 'bn-tall' : 'bn-flat') : (r.lat ? 'latin' : 'other')}`; (by[key] = by[key] || []).push(r); });
console.log(`লাইন ${rows.length}`);
Object.entries(by).sort((a, b) => b[1].length - a[1].length).slice(0, 25).forEach(([k, v]) => {
  const [F, L, cls] = k.split('|');
  console.log(`F ${F} L ${L} ${cls} n${v.length}  off ${med(v.map((r) => r.off))} (÷F ${(med(v.map((r) => r.off)) / F).toFixed(3)})  bot ${med(v.map((r) => r.bot))}`);
});
