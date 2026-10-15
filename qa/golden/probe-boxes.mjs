// বাক্স-শনাক্তি যাচাই (page-geometry boxFrames) মূল PDF-এ: node qa/golden/probe-boxes.mjs a03,f2
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { renderMasks } from './image-score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const G = createRequire(import.meta.url)(path.join(ROOT, 'js/layout-engine/faithful/page-geometry.js'));
const SRC = process.env.ASIS_DIR || path.join(process.env.USERPROFILE || '', 'Downloads', 'AS it IS');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/manifest.json'), 'utf8').replace(/^﻿/, ''));
const ids = (process.argv[2] || 'a03').split(',');
// OUT=1 ⇒ আমাদের আউটপুট (asis/<id>/out.pdf)
const pdfs = ids.map((id) => (process.env.OUT ? path.join(ROOT, 'qa/golden-data/asis', id, 'out.pdf') : path.join(SRC, man.find((e) => e.id === id).src)));
const { pages, browser } = await renderMasks(pdfs, 144);
await browser.close();
pages.forEach((doc, k) => doc.forEach((p, n) => {
  const mask = new Uint8Array(p.w * p.h);
  for (let i = 0; i < mask.length; i++) mask[i] = p.bits.charCodeAt(i) === 49 ? 1 : 0;
  const debugSegs = [];
  const bx = G.boxFrames({ W: p.w, H: p.h, mask }, { pxPerPt: 2, debugSegs });
  if (process.env.SEGS) debugSegs.filter((s) => s.y0 < +process.env.SEGS).forEach((s) => console.log('   seg', JSON.stringify(s)));
  console.log(`${ids[k]} p${n + 1}: ${bx.length} বাক্স`);
  bx.slice(0, 12).forEach((b) => console.log(`  x ${b.x0}-${b.x1} y ${b.y0}-${b.y1}${b.dashed ? ' ড্যাশ' : ''}`));
}));
