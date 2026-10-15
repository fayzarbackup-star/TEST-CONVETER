// নির্ণয়: একটি পাতায় লেখা-ব্লক ⇒ মুদ্রিত লাইন বসানো (page-geometry snapBoxesToLines) — node qa/golden/probe-snap.mjs a17 [পাতা=1]
// প্রতিটি ব্লক: Gemini-বক্স → বসানো বক্স (০–১০০০), বক্সের x-সীমায় মাপা লাইন (y০–y১), খাড়া ড্যাশ-খণ্ড, বাক্স-শনাক্তি
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { renderMasks } from './image-score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const G = createRequire(import.meta.url)(path.join(ROOT, 'js/layout-engine/faithful/page-geometry.js'));
const SRC = process.env.ASIS_DIR || path.join(process.env.USERPROFILE || '', 'Downloads', 'AS it IS');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/manifest.json'), 'utf8').replace(/^﻿/, ''));
const id = process.argv[2] || 'a17', pn = +(process.argv[3] || 1);
const e = man.find((x) => x.id === id);
const cap = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis', id, 'capture.json'), 'utf8').replace(/^﻿/, ''));
const r0 = e.range ? +e.range.split('-')[0] : 1;
const { pages, browser } = await renderMasks([path.join(SRC, e.src) + `::${r0 + pn - 1}`], 144);
await browser.close();
const p = pages[0][0];
const mask = new Uint8Array(p.w * p.h);
for (let i = 0; i < mask.length; i++) mask[i] = p.bits.charCodeAt(i) === 49 ? 1 : 0;
const m = { W: p.w, H: p.h, mask };
const comps = G.components(m, null, 4);
const dash = G.vDashComps(comps, p.w);
const N = (v, D) => Math.round(v / D * 1000);
console.log(`${id} p${pn}: ${p.w}x${p.h}px, খণ্ড ${comps.length}, খাড়া-ড্যাশ ${dash.size}, বাক্স ${G.boxFrames(m, { pxPerPt: 2 }).length}`);
const blocks = cap.blocks.filter((b) => b.page === pn && b.box);
const snapped = G.snapBoxesToLines(m, comps, blocks);
blocks.slice(0, 4).forEach((b) => {
  const bx0 = b.box[1] / 1000 * p.w, bx1 = b.box[3] / 1000 * p.w, by0 = b.box[0] / 1000 * p.h, by1 = b.box[2] / 1000 * p.h;
  const cs = comps.filter((c) => !dash.has(c) && (c.x0 + c.x1) / 2 >= bx0 && (c.x0 + c.x1) / 2 <= bx1 && (c.y0 + c.y1) / 2 >= by0 && (c.y0 + c.y1) / 2 <= by1);
  const L = G.linesOf(cs, p.h).map((l) => `${N(l.y0, p.h)}-${N(l.y1, p.h)}`);
  const s = snapped[b.i];
  console.log(`  ব্লক ${b.i} ${b.type} Gemini ${b.box.join(',')} ⇒ ${s ? s.map(Math.round).join(',') : '(অপরিবর্তিত)'} | লাইন ${L.length}: ${L.slice(0, 10).join(' ')}`);
});
