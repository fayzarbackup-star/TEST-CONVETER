// নির্ণয়: ব্রাউজার/Word ছাড়া node-এ IR.build আবার (asis/<id>/measures.json — faithful-e2e লেখে) ⇒ ছকের সারি/ভাগ/উচ্চতা দেখা।
// চালানো: node qa/golden/ir-probe.mjs <id> [FZ_OFF/ON ফ্ল্যাগ, যেমন OFF_EGAP,ON_INK]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const req = createRequire(import.meta.url);
const [id, flags = ''] = process.argv.slice(2);
flags.split(',').filter(Boolean).forEach((f) => { globalThis['__FZ_' + f] = true; });
globalThis.window = globalThis;
for (const f of ['layout-tags', 'row-ink', 'page-geometry', 'layout-ir']) { try { req(path.join(ROOT, 'js/layout-engine/faithful', f + '.js')); } catch (e) { console.log('লোড ব্যর্থ', f, e.message); } }
const IR = globalThis.FayzarLayoutIR;
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis', id, 'measures.json'), 'utf8'));
const ir = IR.build(M.cap, M.measures, M.pageInfo);
const r1 = (v) => Math.round(v * 10) / 10;
ir.pages.forEach((p, pi) => {
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (o.kind === 'table' && Array.isArray(o.rows)) {
      console.log(`পাতা ${pi + 1} ছক ${o.rows.length}×${o.rows[0].length} y=${r1(o.rect.y)} h=${r1(o.rect.h)} রেখা=${JSON.stringify((o.srcRulesPt || []).map(r1))}`);
      o.rows.forEach((r, i) => console.log(`  ${String(i).padStart(2)} ভাগ ${o.rowBand ? o.rowBand[i] : '-'} h ${o.rowHeightsPt ? r1(o.rowHeightsPt[i]) : '-'} | ${r.map((c) => String(c || '').slice(0, 18)).join(' | ')}`));
      return;
    }
    for (const k in o) if (k !== 'image') walk(o[k]);
  };
  walk(p);
});
