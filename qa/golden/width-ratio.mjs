// নির্ণয় (ফন্ট-প্রস্থ ক্যালিব্রেশন): মূল PDF বনাম আমাদের out.pdf — মেলানো লেখা-লাইনের প্রস্থ-অনুপাত (আমাদের ÷ মূল)।
// শুধু "পরিষ্কার" লাইন: বাঁ-প্রান্ত ±৬pt-এ মেলে, উচ্চতা ±৩০%, প্রস্থ ≥৪০pt (মোড়ানো/ছক-সারির গোলমাল কম)।
// চালানো: node qa/golden/width-ratio.mjs a11 [--list]  (সারাংশ; --list ⇒ প্রতি লাইন)
import fs from 'node:fs'; import path from 'node:path';
import { renderMasks } from './image-score.mjs';
import { cleanMask } from './layout-score.mjs';
import { lineBands, alignBands } from './line-drift.mjs';

const id = process.argv[2], list = process.argv.includes('--list');
const man = JSON.parse(fs.readFileSync('qa/golden-data/asis/manifest.json', 'utf8').replace(/^﻿/, ''));
const e = man.find((x) => x.id === id);
if (!e) { console.log('id নেই'); process.exit(1); }
const src = path.join(process.env.USERPROFILE, 'Downloads', 'AS it IS', e.src);
const dpi = 144, px = dpi / 72;
const { pages: [P, Q], browser } = await renderMasks([e.range ? `${src}::${e.range}` : src, `qa/golden-data/asis/${id}/out.pdf`], dpi);
await browser.close();
const toMask = (p, W, H) => { const m = new Uint8Array(W * H); for (let y = 0; y < H; y++) { const sy = Math.min(p.h - 1, Math.floor(y * p.h / H)); for (let x = 0; x < W; x++) m[y * W + x] = p.bits.charCodeAt(sy * p.w + Math.min(p.w - 1, Math.floor(x * p.w / W))) === 49 ? 1 : 0; } return m; };
const minArea = Math.round(px * px * 1.5), all = [];
for (let k = 0; k < Math.min(P.length, Q.length); k++) {
  const W = P[k].w, H = P[k].h, A = lineBands(cleanMask(toMask(P[k], W, H), W, H, minArea), W, H, px), B = lineBands(cleanMask(toMask(Q[k], W, H), W, H, minArea), W, H, px);
  for (const [i, j] of alignBands(A, B, H)) {
    const a = A[i], b = B[j], wa = (a.x1 - a.x0) / px, wb = (b.x1 - b.x0) / px, ha = (a.y1 - a.y0) / px, hb = (b.y1 - b.y0) / px;
    const r = { page: k + 1, y: Math.round(a.y0 / px), x0: Math.round(a.x0 / px), wa: Math.round(wa), wb: Math.round(wb), ratio: wb / wa, ha: +ha.toFixed(1), hb: +hb.toFixed(1) };
    r.clean = Math.abs(a.x0 - b.x0) / px <= 6 && Math.abs(ha - hb) <= Math.max(ha, hb) * 0.3 && wa >= 40;
    all.push(r);
  }
}
const cl = all.filter((r) => r.clean).sort((x, y) => x.ratio - y.ratio);
const q = (f) => (cl.length ? cl[Math.min(cl.length - 1, Math.floor(f * cl.length))].ratio.toFixed(3) : '-');
const hr = cl.map((r) => r.hb / r.ha).sort((x, y) => x - y);
console.log(`${id}: মেলানো ${all.length}, পরিষ্কার ${cl.length} | প্রস্থ-অনুপাত p25 ${q(0.25)} মধ্যমা ${q(0.5)} p75 ${q(0.75)} | উচ্চতা-অনুপাত মধ্যমা ${hr.length ? hr[hr.length >> 1].toFixed(3) : '-'}`);
const narrow = cl.filter((r) => r.ratio < 0.97).length, wide = cl.filter((r) => r.ratio > 1.03).length;
console.log(`সরু (<০.৯৭) ${narrow}, চওড়া (>১.০৩) ${wide}, ±৩% ${cl.length - narrow - wide}`);
if (list) cl.forEach((r) => console.log(`p${r.page} y${r.y} x${r.x0} w ${r.wa}->${r.wb} (${r.ratio.toFixed(3)}) h ${r.ha}->${r.hb}`));
