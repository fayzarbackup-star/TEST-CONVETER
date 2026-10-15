// QA: পাতার একটি অংশে (০–১ ভগ্নাংশ) কালি-পিক্সেল ও খণ্ডের পরিসংখ্যান + ক্রপ-ছবি (জলছাপের ছোপ কেমন)।
// চালানো (localhost:3008): node qa/region-ink.mjs <pdf> <page> <x0,y0,x1,y1 ভগ্নাংশ> <out.png>
import fs from 'node:fs';
import puppeteer from 'puppeteer';
const [PDF, PN, REG, OUT] = process.argv.slice(2);
const [fx0, fy0, fx1, fy1] = REG.split(',').map(Number);
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  const r = await page.evaluate(async (b64, pn, R) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const doc = await window.pdfjsLib.getDocument({ data: u }).promise;
    const pg = await doc.getPage(pn); const vp = pg.getViewport({ scale: 150 / 72 });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    const x0 = Math.round(R[0] * c.width), y0 = Math.round(R[1] * c.height), x1 = Math.round(R[2] * c.width), y1 = Math.round(R[3] * c.height);
    const img = c.getContext('2d').getImageData(x0, y0, x1 - x0, y1 - y0);
    const G = window.FayzarPageGeometry;
    const out = {};
    for (const thr of [100, 130, 160]) {
      const m = G.inkMask(img, thr);
      const comps = G.components(m, null, 1);
      const sizes = comps.map((k) => k.n).sort((a, b) => a - b);
      out[thr] = { ink: m.mask.reduce((a, v) => a + v, 0), comps: comps.length, medianN: sizes[Math.floor(sizes.length / 2)] || 0, big: comps.filter((k) => k.n >= 40).length };
    }
    const cc = document.createElement('canvas'); cc.width = (x1 - x0) * 2; cc.height = (y1 - y0) * 2;
    const ctx = cc.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, x0, y0, x1 - x0, y1 - y0, 0, 0, cc.width, cc.height);
    out.png = cc.toDataURL('image/png').split(',')[1];
    return out;
  }, fs.readFileSync(PDF).toString('base64'), Number(PN), [fx0, fy0, fx1, fy1]);
  fs.writeFileSync(OUT, Buffer.from(r.png, 'base64')); delete r.png;
  console.log(JSON.stringify(r));
} finally { await browser.close(); }
