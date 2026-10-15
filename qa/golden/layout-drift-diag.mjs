// কোথায় উচ্চতা জমছে: প্রতি মেলানো অনুচ্ছেদে (Word-অবস্থান − মূল-অবস্থান); বড় লাফের আগের অংশগুলো দেখায়
import fs from 'fs'; import path from 'path';
const GD = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../golden-data');
const ids = process.argv[2].split(',');
const TOP = parseInt(process.argv[3] || '5', 10);
const norm = (s) => String(s || '').replace(/\*\*/g, '').replace(/[\s\u200c\u200d]+/g, '').slice(0, 14);
for (const id of ids) {
  const od = path.join(GD, id, 'faithful-pdf');
  const ir = JSON.parse(fs.readFileSync(od + '/ir.json', 'utf8'));
  const out = JSON.parse(fs.readFileSync(od + '/out.raw.json', 'utf8'));
  const H = out.page.h;
  const wp = out.paragraphs.map((p) => ({ p, key: norm([].concat(p.runs || []).map((r) => r.t).join('')) }));
  const used = new Set(); let prev = null; const jumps = []; let between = [];
  for (const pg of ir.pages) for (const band of pg.bands) for (const cell of band.cells) for (const it of cell.items) {
    const lab = it.kind === 'para' ? `P"${String((it.tabLines || it.lines || [''])[0]).slice(0, 18)}"` : it.kind === 'table' ? `T${(it.rows || []).length}x${Math.max(0, ...(it.rows || [[]]).map((r) => r.length))} h=${(it.heightPt || 0).toFixed(0)}` : `${it.kind} h=${(it.heightPt || 0).toFixed(0)}`;
    between.push(lab + `@${band.kind}`);
    if (it.kind !== 'para' || !it.rect) continue;
    const k = norm((it.tabLines || it.lines || []).join(''));
    const j = wp.findIndex((w, i) => !used.has(i) && w.key && w.key === k);
    if (j < 0) continue;
    used.add(j);
    const w = wp[j].p;
    const src = (pg.page - 1) * pg.heightPt + it.rect.y, dst = (w.page - 1) * H + w.y;
    const d = dst - src;
    if (prev) jumps.push({ jump: d - prev.d, at: `p${pg.page} y${it.rect.y.toFixed(0)}→w${w.page} y${w.y.toFixed(0)}`, between: between.slice(0, -1).slice(-4) });
    prev = { d }; between = [lab];
  }
  console.log(`${id}: pages ${out.pages}/${ir.pages.length}, final drift ${prev ? prev.d.toFixed(0) : '?'}pt`);
  jumps.sort((a, b) => b.jump - a.jump).slice(0, TOP).forEach((x) => console.log(`  +${x.jump.toFixed(0)}pt ${x.at} | after: ${x.between.join(' ; ').slice(0, 150)}`));
}
