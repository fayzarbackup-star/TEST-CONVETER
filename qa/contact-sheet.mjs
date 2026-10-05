// QA: service-audit-এর প্রথম পাতাগুলো ৫টি করে এক ছবিতে (দ্রুত চোখে দেখা)। চালানো: node qa/contact-sheet.mjs <service-audit outDir>
import fs from 'node:fs'; import path from 'node:path'; import puppeteer from 'puppeteer';
const dir = process.argv[2]; const res = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'));
const items = res.map((r) => ({ id: r.id, img: (r.files.doc && r.files.doc.images || [])[0], p: r.files.doc && r.files.doc.pages })).filter((x) => x.img);
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] }); const pg = await b.newPage();
for (let g = 0; g < items.length; g += 5) {
  const grp = items.slice(g, g + 5);
  const html = '<body style="margin:0;display:flex;gap:6px;background:#888">' + grp.map((it) => `<div style="background:#fff"><div style="font:bold 20px sans-serif;color:#c00">${it.id} (${it.p}p)</div><img src="data:image/png;base64,${fs.readFileSync(path.join(dir, it.img)).toString('base64')}" style="width:480px"></div>`).join('') + '</body>';
  await pg.setViewport({ width: 2450, height: 720 }); await pg.setContent(html); await pg.screenshot({ path: path.join(dir, `_sheet${g / 5 + 1}.png`), fullPage: true });
}
await b.close();
