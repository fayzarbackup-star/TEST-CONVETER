// নির্ণয়: ছবি-স্কোরের রেখা-খোঁজা (hLines) মূল ও আমাদের পাতায় কী পায় — y, দৈর্ঘ্য, কালি-ঘনত্ব, পুরু-অংশ।
// চালানো: node qa/golden/probe-lines.mjs <id> [page=1]  → সারাংশ; বিস্তারিত qa/golden-data/asis/<id>/probe-lines.txt
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMasks, lineCands } from './image-score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AD = path.join(ROOT, 'qa/golden-data/asis');
const SRC = process.env.ASIS_DIR || path.join(process.env.USERPROFILE || '', 'Downloads', 'AS it IS');
const [id, pg = '1'] = process.argv.slice(2);
const e = JSON.parse(fs.readFileSync(path.join(AD, 'manifest.json'), 'utf8').replace(/^﻿/, '')).find((x) => x.id === id);
const spec = e.range ? `${path.join(SRC, e.src)}::${e.range}` : path.join(SRC, e.src);
const { pages: [P, Q], browser } = await renderMasks([spec, path.join(AD, id, 'out.pdf')], 72);
await browser.close();
const k = +pg - 1, lines = [];
for (const [tag, p] of [['মূল', P[k]], ['আমাদের', Q[k]]]) {
  const m = new Uint8Array(p.w * p.h); for (let i = 0; i < m.length; i++) m[i] = p.bits.charCodeAt(i) === 49 ? 1 : 0;
  const c = lineCands(m, p.w, p.h, p.w * 0.25, 3);
  lines.push(`== ${tag} (${c.length})`);
  c.forEach((l) => lines.push(`y=${l.y} len=${l.len} ink=${l.ink.toFixed(2)} thick=${l.thick.toFixed(2)} solid=${l.solid}`));
}
fs.writeFileSync(path.join(AD, id, 'probe-lines.txt'), lines.join('\n'));
console.log(lines.slice(0, 60).join('\n'));
