// প্রতি নমুনা: IR-অনুচ্ছেদের লাইন-সংখ্যা বনাম Word-এর আসল লাইন-সংখ্যা (out.raw.json)
import fs from 'fs'; import path from 'path';
const GD = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../golden-data');
const ids = process.argv[2] ? process.argv[2].split(',') : JSON.parse(fs.readFileSync(GD + '/subset.json', 'utf8')).ids;
const norm = (s) => String(s || '').replace(/\*\*/g, '').replace(/[\s\u200c\u200d]+/g, '').slice(0, 14);
const detail = process.argv.includes('--detail');
for (const id of ids) {
  const od = path.join(GD, id, 'faithful-pdf');
  if (!fs.existsSync(od + '/ir.json') || !fs.existsSync(od + '/out.raw.json')) { console.log(id, 'no data'); continue; }
  const ir = JSON.parse(fs.readFileSync(od + '/ir.json', 'utf8'));
  const out = JSON.parse(fs.readFileSync(od + '/out.raw.json', 'utf8'));
  const wp = out.paragraphs.map((p) => ({ p, key: norm([].concat(p.runs || []).map((r) => r.t).join('')) }));
  let used = new Set(), nPara = 0, nWrap = 0, extra = 0, extraPt = 0, rows = [];
  for (const pg of ir.pages) for (const band of pg.bands) for (const cell of band.cells) for (const it of cell.items) {
    if (it.kind !== 'para') continue;
    const L = it.tabLines || it.lines || [];
    const k = norm(L.join(''));
    if (!k) continue;
    const j = wp.findIndex((w, i) => !used.has(i) && w.key && w.key === k);
    if (j < 0) continue;
    used.add(j); nPara++;
    const p = wp[j].p;
    // keepLines ⇒ প্রতিটি লাইন আলাদা Word-অনুচ্ছেদ হতে পারে; তখন শুধু প্রথম লাইন মেলে
    const irN = it.keepLines || it.tabLines ? 1 : L.length;
    const wordN = p.lines > 0 ? p.lines : (p.ls > 0 ? Math.round((p.yEnd - p.y) / p.ls) + 1 : 1);
    const cmpN = it.keepLines || it.tabLines ? wordN : wordN;
    const exp = L.length;
    if (cmpN > exp) {
      nWrap++; extra += cmpN - exp; extraPt += (cmpN - exp) * (p.ls || it.fontPt * 1.15);
      rows.push(`  ${id} p${pg.page} fs=${it.fontPt} ir=${exp} word=${cmpN} kl=${!!it.keepLines} w=${it.rect ? it.rect.w.toFixed(0) : '?'} ind=${(it.indentPt || 0).toFixed(0)} cell=${band.kind}:${(cell.x1 - cell.x0).toFixed(0)} wtab=${p.inTable} ri=${p.ri} "${L[0].slice(0, 40)}"`);
    }
  }
  console.log(`${id}: para ${nPara}, wrapped ${nWrap}, extra lines ${extra} (~${extraPt.toFixed(0)}pt), pages ${out.pages}`);
  if (detail) rows.slice(0, 12).forEach((r) => console.log(r));
}
