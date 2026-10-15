// নির্ণয় (নতুন রান ছাড়া): জমা qa/golden-data/asis/*/layout-score.json থেকে প্রতি নমুনার হারানো নম্বর (অংশ-ভাগ), লাইন মেলা/হারানো,
// বড় সরণ, দাগ-সংখ্যা — সবচেয়ে খারাপ আগে; শেষে গড় ক্ষতি। চালানো: node qa/golden/asis-overview.mjs
import fs from 'fs'; import path from 'path';
const D = 'qa/golden-data/asis', MAX = { pos: 40, ext: 20, hgt: 10, rules: 20, ink: 10 };
const tot = { pos: 0, ext: 0, hgt: 0, rules: 0, ink: 0 }, rows = [];
const T = { lineMiss: 0, lineExtra: 0, linesOrig: 0, dyBig: 0, dyMid: 0, matched: 0, dxBig: 0, hDiff: 0, rOrig: 0, rOurs: 0, pageMis: 0, emptyPages: 0 };
for (const id of fs.readdirSync(D)) {
  const f = path.join(D, id, 'layout-score.json'); if (!fs.existsSync(f)) continue;
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  let img = ''; try { img = JSON.parse(fs.readFileSync(path.join(D, id, 'image-score.json'), 'utf8')).score; } catch {}
  const lost = {}; for (const k in MAX) { lost[k] = +(MAX[k] - (j.part?.[k] || 0)).toFixed(1); tot[k] += lost[k]; }
  let lm = 0, le = 0, lo = 0, dyB = 0, dyM = 0, mt = 0, dxB = 0, hd = 0, ro = 0, ru = 0, ep = 0;
  for (const p of j.per || []) {
    if (!p.lines) { ep++; continue; }
    lo += p.lines.orig; lm += Math.max(0, p.lines.orig - p.lines.matched); le += Math.max(0, p.lines.ours - p.lines.matched); mt += p.lines.matched;
    for (const r of p.rows || []) { const a = Math.abs(r.dy); if (a > 10) dyB++; else if (a > 2) dyM++; if (Math.max(Math.abs(r.dx0), Math.abs(r.dx1)) > 20) dxB++; if (Math.abs(r.h - r.hOurs) > Math.max(4, r.h * 0.3)) hd++; }
    ro += p.rules.orig.h.length + p.rules.orig.v.length; ru += p.rules.ours.h.length + p.rules.ours.v.length;
  }
  const pm = j.pages && !j.pages.ok ? `${j.pages.truth}/${j.pages.out}` : '';
  Object.assign(T, { lineMiss: T.lineMiss + lm, lineExtra: T.lineExtra + le, linesOrig: T.linesOrig + lo, dyBig: T.dyBig + dyB, dyMid: T.dyMid + dyM, matched: T.matched + mt, dxBig: T.dxBig + dxB, hDiff: T.hDiff + hd, rOrig: T.rOrig + ro, rOurs: T.rOurs + ru, pageMis: T.pageMis + (pm ? 1 : 0), emptyPages: T.emptyPages + ep });
  const worst = Object.entries(lost).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k}-${v}`).join(' ');
  rows.push({ id, s: j.score, img, worst, txt: `L ${lo}/${mt}(miss ${lm},+${le}) dy>10:${dyB} dy2-10:${dyM} dx>20:${dxB} hBad:${hd} rules ${ro}/${ru}${pm ? ' PAGES ' + pm : ''}${ep ? ' emptyPg ' + ep : ''}` });
}
rows.sort((a, b) => a.s - b.s).forEach((r) => console.log(`${r.id.padEnd(4)} lay ${String(r.s).padStart(5)} img ${String(r.img).padStart(5)} | lost ${r.worst.padEnd(18)} | ${r.txt}`));
const n = rows.length;
console.log('AVG LOST/file: ' + Object.entries(tot).map(([k, v]) => `${k} ${(v / n).toFixed(1)}/${MAX[k]}`).join(', '));
console.log('TOTAL: ' + JSON.stringify(T));
