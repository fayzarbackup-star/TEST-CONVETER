// একটি নমুনার সব অংশ ক্রমে: মূল y/h বনাম Word-এর পাতা/y/লাইন
import fs from 'fs'; import path from 'path';
const GD = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../golden-data');
const [id, from = '0'] = process.argv.slice(2);
const od = path.join(GD, id, 'faithful-pdf');
const ir = JSON.parse(fs.readFileSync(od + '/ir.json', 'utf8'));
const out = JSON.parse(fs.readFileSync(od + '/out.raw.json', 'utf8'));
const norm = (s) => String(s || '').replace(/\*\*/g, '').replace(/[\s\u200c\u200d]+/g, '').slice(0, 14);
const wp = out.paragraphs.map((p) => ({ p, key: norm([].concat(p.runs || []).map((r) => r.t).join('')) }));
const used = new Set(); let n = 0;
console.log(`page h=${out.page.h} top=${out.page.top} bottom=${out.page.bottom}; IR margins`, JSON.stringify(ir.pages[0].margins));
for (const pg of ir.pages) for (const band of pg.bands) for (const cell of band.cells) for (const it of cell.items) {
  n++;
  const L = it.tabLines || it.lines || [];
  let w = '';
  if (it.kind === 'para') {
    const k = norm(L.join(''));
    const j = wp.findIndex((x, i) => !used.has(i) && x.key && x.key === k);
    if (j >= 0) { used.add(j); const p = wp[j].p; w = `W p${p.page} y${p.y.toFixed(0)} L${p.lines} ls${p.ls} sb${p.sb}`; }
  }
  if (n < +from) continue;
  console.log(`${String(n).padStart(3)} p${pg.page} ${band.kind[0]} ${it.kind.padEnd(5)} y${it.rect ? it.rect.y.toFixed(0) : '?'} h${it.rect ? it.rect.h.toFixed(0) : (it.heightPt || 0).toFixed(0)} fs${it.fontPt} n${L.length || (it.rows || []).length} sbIR${(it.spaceBeforePt || 0).toFixed(0)} | ${w} | ${JSON.stringify(String(L[0] || '')).slice(0, 26)}`);
}
