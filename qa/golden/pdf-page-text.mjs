// নির্ণয়: PDF-এর নির্দিষ্ট পাতার লেখা (প্রথম ২০০ অক্ষর) ও লেখার y-পরিসর — Word-মাপে ১ পাতা অথচ PDF-এ ২ (a18) কেন, দেখতে।
// চালানো (localhost:3008): node qa/golden/pdf-page-text.mjs <file.pdf> [pageNo]
import fs from 'node:fs';
import puppeteer from 'puppeteer';

const [file, pn = '2'] = process.argv.slice(2);
const data = fs.readFileSync(file).toString('base64');
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  const out = await page.evaluate(async (b64, n) => {
    const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const doc = await lib.getDocument({ data: bytes }).promise;
    if (n > doc.numPages) return { numPages: doc.numPages };
    const pg = await doc.getPage(n), vp = pg.getViewport({ scale: 1 });
    const tc = await pg.getTextContent();
    const ys = tc.items.filter((i) => i.str.trim()).map((i) => vp.height - i.transform[5]);
    return { numPages: doc.numPages, items: tc.items.length, yMin: Math.min(...ys), yMax: Math.max(...ys), text: tc.items.map((i) => i.str).join(' ').slice(0, 200) };
  }, data, +pn);
  console.log(JSON.stringify(out));
} finally { await browser.close(); }
