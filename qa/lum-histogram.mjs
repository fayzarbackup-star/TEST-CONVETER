// QA: পাতার লুমিন্যান্স-হিস্টোগ্রাম (জলছাপ/ধূসর ছাপ শনাক্তের সীমা বাছাই) — ১৫০ DPI, পূর্ণ পাতা ও "কালো-থেকে-দূরের" ধূসর।
// চালানো (localhost:3008): node qa/lum-histogram.mjs <pdf> <page>
import fs from 'node:fs';
import puppeteer from 'puppeteer';
const [PDF, PN] = process.argv.slice(2);
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  const r = await page.evaluate(async (b64, pn) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const lib = window.pdfjsLib;
    const doc = await lib.getDocument({ data: u }).promise;
    const pg = await doc.getPage(pn); const vp = pg.getViewport({ scale: 150 / 72 });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const W = c.width, H = c.height, L = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) L[i] = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000;
    const hist = new Array(26).fill(0); for (let i = 0; i < L.length; i++) hist[Math.floor(L[i] / 10)]++;
    // কালো (<১০০) থেকে ≥৩px দূরের পিক্সেলের হিস্টোগ্রাম
    const dark = new Uint8Array(W * H); for (let i = 0; i < L.length; i++) if (L[i] < 100) dark[i] = 1;
    const near = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dark[y * W + x]) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < H && xx >= 0 && xx < W) near[yy * W + xx] = 1; }
    const far = new Array(26).fill(0); for (let i = 0; i < L.length; i++) if (!near[i]) far[Math.floor(L[i] / 10)]++;
    return { W, H, hist, far };
  }, fs.readFileSync(PDF).toString('base64'), Number(PN));
  console.log('W×H', r.W, r.H);
  r.hist.forEach((v, i) => console.log(String(i * 10).padStart(3), String(v).padStart(8), String(r.far[i]).padStart(8)));
} finally { await browser.close(); }
