// QA: PDF-এর একটি পাতা PNG-তে (চোখে দেখার জন্য), ঐচ্ছিক ব্লক-বক্স আঁকা (হুবহু-ক্যাপচারের লেখা থেকে)।
// চালানো: node qa/render-pdf-page.mjs <pdf> <pageNo> <out.png> [faithful.txt] [captureFirstPdfPage=1]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [PDF, PAGE, OUTP, TXT, FIRST] = process.argv.slice(2);
const L = (await import('../js/layout-engine/faithful/layout-tags.js')).default;
const blocks = TXT ? L.parse(fs.readFileSync(TXT, 'utf8')).blocks.filter((b) => b.page === Number(PAGE) - Number(FIRST || 1) + 1 && b.box) : [];
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/__p.pdf') { res.writeHead(200, { 'Content-Type': 'application/pdf' }); fs.createReadStream(PDF).pipe(res); return; }
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  const url = await page.evaluate(async (n, blocks) => {
    const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
    if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
    const pdf = await lib.getDocument({ data: new Uint8Array(await (await fetch('/__p.pdf')).arrayBuffer()) }).promise;
    const pg = await pdf.getPage(n);
    const vp = pg.getViewport({ scale: 1000 / pg.getViewport({ scale: 1 }).width });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    await pg.render({ canvasContext: g, viewport: vp }).promise;
    g.lineWidth = 2;
    blocks.forEach((b, k) => { g.strokeStyle = ['#2563eb', '#dc2626', '#16a34a', '#9333ea'][k % 4]; g.strokeRect(b.box[1] / 1000 * c.width, b.box[0] / 1000 * c.height, (b.box[3] - b.box[1]) / 1000 * c.width, (b.box[2] - b.box[0]) / 1000 * c.height); g.fillStyle = g.strokeStyle; g.font = '12px sans-serif'; g.fillText((k + 1) + ':' + b.type, b.box[1] / 1000 * c.width + 2, b.box[0] / 1000 * c.height + 12); });
    return c.toDataURL('image/png');
  }, Number(PAGE), blocks);
  fs.writeFileSync(OUTP, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', OUTP, 'blocks', blocks.length);
} finally { await browser.close(); server.close(); }
