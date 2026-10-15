import { renderMasks } from './image-score.mjs';
import fs from 'node:fs'; import path from 'node:path';
const man = JSON.parse(fs.readFileSync('qa/golden-data/asis/manifest.json','utf8').replace(/^﻿/,''));
const id = process.argv[2], ys = process.argv[3].split(',').map(Number);
const src = path.join(process.env.USERPROFILE, 'Downloads', 'AS it IS', man.find((e) => e.id === id).src);
const { pages, browser } = await renderMasks([src, `qa/golden-data/asis/${id}/out.pdf`], 144); await browser.close();
pages.forEach((d, k) => { const p = d[0]; console.log(k ? 'ours' : 'orig', ys.map((y) => { let mx = -1, mn = 1e9; for (let yy = y * 2; yy < y * 2 + 14; yy++) { for (let x = 40; x < p.w - 40; x++) if (p.bits.charCodeAt(yy * p.w + x) === 49) { mn = Math.min(mn, x); break; } for (let x = p.w - 40; x >= 0; x--) if (p.bits.charCodeAt(yy * p.w + x) === 49) { mx = Math.max(mx, x); break; } } return y + ':' + (mn / 2).toFixed(0) + '-' + (mx / 2).toFixed(0); }).join(' ')); });
