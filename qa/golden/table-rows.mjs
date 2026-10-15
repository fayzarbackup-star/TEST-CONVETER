// নির্ণয় (নতুন রান ছাড়া): ছকের প্রতিটি সারি — নকশার সারি-উচ্চতা (IR rowHeightsPt, মূলের রেখা থেকে) বনাম Word-এর আসল সারি-উচ্চতা
// (out.raw.json tables[].cells[].y)। কোন সারি Word-এ লম্বা/খাটো হয়, আর কেন (ঘরের লেখা কত লম্বা, কয় লাইন)।
// চালানো: node qa/golden/table-rows.mjs [id,id…] [--list]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AD = path.join(ROOT, 'qa/golden-data/asis');
const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const ids = arg ? arg.split(',') : fs.readdirSync(AD).filter((d) => fs.existsSync(path.join(AD, d, 'out.raw.json')));
const LIST = process.argv.includes('--list');
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));

const tablesOf = (ir) => {
  const out = [];
  ir.pages.forEach((p) => { const seen = new Set();
    const walk = (o) => { if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o);
      if (o.kind === 'table' && Array.isArray(o.rows)) { out.push(Object.assign({ pg: p.page }, o)); return; }
      for (const v of Object.values(o)) walk(v); };
    walk(p); });
  return out;
};

const S = { rows: 0, grow: 0, shrink: 0, growPt: 0, shrinkPt: 0, cls: {} };
const worst = [], G = { n: 0, sum: 0, bad: 0, per: {}, bot: [] };
for (const id of ids) {
  let ir, raw;
  try { ir = read(path.join(AD, id, 'ir.json')); raw = read(path.join(AD, id, 'out.raw.json')); } catch { continue; }
  const T = tablesOf(ir).filter((t) => !t.boxLabel);
  const W = (raw.tables || []).filter((t) => !t.nested);
  // ক্রমে মেলানো: একই পাতা, সারি-সংখ্যা সমান
  let wi = 0;
  for (const t of T) {
    const j = W.findIndex((w, k) => k >= wi && w.page === t.pg && w.rows === t.rows.length);
    if (j < 0) continue;
    wi = j + 1;
    const w = W[j];
    const top = {}; w.cells.forEach((c) => { if (c.page === w.page) top[c.row] = Math.min(top[c.row] == null ? 1e9 : top[c.row], c.y); });
    const R = t.rows.length;
    const plan = Array.isArray(t.rowHeightsPt) && t.rowHeightsPt.length === R ? t.rowHeightsPt : Array(R).fill((t.heightPt || 0) / R);
    const k = t.heightPt && plan.reduce((a, b) => a + b, 0) ? t.heightPt / plan.reduce((a, b) => a + b, 0) : 1;
    // মূলের রেখা (IR srcRulesPt) বনাম Word-এর সারি-শুরু: প্রতিটি Word-সারির শুরুর কাছের মূল-রেখা কত দূরে
    if (Array.isArray(t.srcRulesPt) && t.srcRulesPt.length >= 2) {
      const SR = t.srcRulesPt;
      for (let r = 1; r <= R; r++) {
        if (top[r] == null) continue;
        const d = Math.min(...SR.map((y) => Math.abs(y - top[r])));
        G.n++; G.sum += d; if (d > 4) { G.bad++; (G.per[id] = G.per[id] || []).push(`p${t.pg}r${r}:${d.toFixed(0)}`); }
      }
      // শেষ রেখা বনাম Word-ছকের নিচ (শেষ সারির শুরু + উচ্চতা অনুমান নেই ⇒ শেষ ঘরের y+h)
      const last = w.cells.filter((c) => c.row === w.rows && c.page === w.page).map((c) => c.y + (c.h || 0));
      if (last.length) { const bot = Math.max(...last); G.bot.push(`${id}p${t.pg} ${(bot - SR[SR.length - 1]).toFixed(0)}`); }
    }
    for (let r = 1; r < R; r++) {
      if (top[r] == null || top[r + 1] == null) continue;
      const wh = top[r + 1] - top[r], ph = plan[r - 1] * k, d = wh - ph;
      S.rows++;
      const cells = t.rows[r - 1] || [], txt = cells.map((c) => String(c || '')).join(' ').replace(/\s+/g, ' ').trim();
      const empty = !txt, nl = Math.max(1, ...cells.map((c) => String(c || '').split('\n').length));
      const c = empty ? 'ফাঁকা' : nl > 1 ? 'বহু-লাইন' : txt.length > 40 ? 'লম্বা-এক-লাইন' : 'ছোট-এক-লাইন';
      const g = (S.cls[c] = S.cls[c] || { n: 0, grow: 0, shrink: 0 }); g.n++;
      if (d > 2) { S.grow++; S.growPt += d; g.grow += d; } else if (d < -2) { S.shrink++; S.shrinkPt += -d; g.shrink += -d; }
      if (Math.abs(d) > 4) worst.push({ id, pg: t.pg, r, d: +d.toFixed(1), ph: +ph.toFixed(1), wh: +wh.toFixed(1), c, F: t.fontPt, txt: txt.slice(0, 40) });
    }
  }
}
if (G.n) {
  console.log(`Word-সারি-শুরু বনাম মূলের রেখা: ${G.n} সারি, গড় দূরত্ব ${(G.sum / G.n).toFixed(1)}pt, >৪pt ${G.bad}`);
  Object.entries(G.per).forEach(([k, v]) => console.log(`  ${k}: ${v.slice(0, 14).join(' ')}${v.length > 14 ? ' …' : ''}`));
  console.log('  ছকের নিচ − মূলের শেষ রেখা: ' + G.bot.join(', '));
}
console.log(`সারি ${S.rows}: Word-এ লম্বা ${S.grow} (মোট +${S.growPt.toFixed(0)}pt), খাটো ${S.shrink} (মোট −${S.shrinkPt.toFixed(0)}pt)`);
Object.entries(S.cls).forEach(([c, g]) => console.log(`  ${c.padEnd(14)} ${String(g.n).padStart(4)} সারি  +${g.grow.toFixed(0)}pt  −${g.shrink.toFixed(0)}pt`));
const by = {}; worst.forEach((x) => { by[x.id] = (by[x.id] || 0) + Math.abs(x.d); });
console.log('ফাইল (|ভুল| >৪pt সারির মোট): ' + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', '));
worst.sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, LIST ? 200 : 12).forEach((x) => console.log(`  ${x.id} p${x.pg} সারি${x.r} নকশা ${x.ph} Word ${x.wh} (${x.d > 0 ? '+' : ''}${x.d}) ${x.c} F${x.F} | ${x.txt}`));
