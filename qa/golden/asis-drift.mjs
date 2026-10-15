// নির্ণয়: হুবহু-ফরম (asis) নমুনায় নকশার অবস্থান (ir.json) বনাম Word-এর আসল অবস্থান (out.raw.json) — উচ্চতা কোথায় জমছে।
// শুধু সরণ ≥৮pt বদলানো অংশগুলো (আর পাতা-বদল) দেখায়; সর্বোচ্চ ৩০ লাইন। চালানো: node qa/golden/asis-drift.mjs <id>
import fs from 'node:fs';
import path from 'node:path';

const id = process.argv[2];
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const od = path.join(ROOT, 'qa/golden-data/asis', id);
const ir = JSON.parse(fs.readFileSync(path.join(od, 'ir.json'), 'utf8'));
const raw = JSON.parse(fs.readFileSync(path.join(od, 'out.raw.json'), 'utf8'));
const norm = (s) => String(s || '').replace(/[\s\t.\-_…*]/g, '').slice(0, 12);
const ps = raw.paragraphs.filter((p) => !p.inTable);
const used = new Set();
const out = [`${id}: Word পাতা ${raw.pages}, নকশা-পাতা ${ir.pages.length}`];
let prevD = null;
for (const P of ir.pages) {
  for (const b of P.bands) for (const c of b.cells) for (const it of c.items) {
    if (it.kind !== 'para' || !it.rect) continue;
    const key = norm(it.text);
    if (!key) continue;
    const j = ps.findIndex((p, k) => !used.has(k) && norm(p.runs && p.runs.t) === key);
    if (j < 0) continue;
    used.add(j);
    const p = ps[j], pageOff = (p.page - P.page) * raw.page.h, d = Math.round(p.y + pageOff - it.rect.y);
    if (prevD == null || Math.abs(d - prevD) >= 8 || p.page !== P.page)
      out.push(`পৃ${P.page}→${p.page} ${b.kind.padEnd(4)} y${Math.round(it.rect.y)} d${d >= 0 ? '+' : ''}${d} L${p.lines}/${(it.tabLines || it.lines || []).length} fs${it.fontPt} ${key}`);
    prevD = d;
  }
}
console.log(out.slice(0, 30).join('\n'));
