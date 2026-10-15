// QA: মূল PDF-এর পাতা ও আউটপুট (Word→PDF)-এর পাতা পাশাপাশি এক ছবিতে — চোখে মিলিয়ে দেখার জন্য।
// চালানো: node qa/side-by-side.mjs <source.pdf> <output.pdf> <outDir> [pages e.g. 1-10] [width=1600]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [SRC, OUTPDF, OUTDIR, range = '1-1', widthArg] = process.argv.slice(2);
const [p0, p1] = range.split('-').map(Number);
const WIDTH = Number(widthArg) || 1600;
fs.mkdirSync(OUTDIR, { recursive: true });

// pdf.js স্থানীয় ফাইল থেকে (অফলাইন)
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const map = { '/src.pdf': SRC, '/out.pdf': OUTPDF };
  const f = map[u] || path.join(ROOT, u);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const type = f.endsWith('.js') || f.endsWith('.mjs') ? 'text/javascript' : (f.endsWith('.pdf') ? 'application/pdf' : 'text/html');
  res.writeHead(200, { 'Content-Type': type }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const pdfjs = fs.existsSync(path.join(ROOT, 'js/vendor/pdf.min.js')) ? '/js/vendor/pdf.min.js' : null;

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: 1200 });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  for (let p = p0; p <= p1; p++) {
    const b64 = await page.evaluate(async (pn, W) => {
      const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      const render = async (url, n, w) => {
        const doc = await lib.getDocument(url).promise;
        if (n > doc.numPages) { const c = document.createElement('canvas'); c.width = w; c.height = 10; return c; }
        const pg = await doc.getPage(n);
        const vp0 = pg.getViewport({ scale: 1 });
        const vp = pg.getViewport({ scale: w / vp0.width });
        const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        return c;
      };
      const half = Math.floor(W / 2) - 6;
      const a = await render('/src.pdf', pn, half), b = await render('/out.pdf', pn, half);
      const c = document.createElement('canvas'); c.width = W; c.height = Math.max(a.height, b.height) + 24;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = '#c00'; x.font = '16px sans-serif'; x.fillText('মূল (source) p' + pn, 8, 16); x.fillText('আউটপুট p' + pn, half + 20, 16);
      x.drawImage(a, 0, 24); x.drawImage(b, half + 12, 24);
      x.fillStyle = '#c00'; x.fillRect(half + 4, 0, 3, c.height);
      return c.toDataURL('image/png').split(',')[1];
    }, p, WIDTH);
    fs.writeFileSync(path.join(OUTDIR, `sbs-${p}.png`), Buffer.from(b64, 'base64'));
  }
  console.log('wrote', p1 - p0 + 1, 'images to', OUTDIR);
} finally { await browser.close(); server.close(); }
