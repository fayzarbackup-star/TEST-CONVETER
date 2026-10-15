// ধাপ ০: প্রোডাকশন-পথে (FayzarExport → বিজয় .docx) মিশ্র বাংলা-ইংরেজি লেখার ইংরেজি/চিহ্ন টেকে কি না।
// চালানো: node qa/phase0/bijoy-mixed-check.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const TEXT = [
  'সাধারণ প্রশ্ন',
  '১। তারিখ: ০৫/১০/২০২৬ এবং মোট ১০০% (A+B)/2 হলে মান কত?',
  '২। স্মারক নং: ৪৫.০০.০০০০.১২৩.১৮.০০১.২৬-৫৪ এবং ISBN 978-984 লেখো।',
  '৩। চিত্রে, OA = 4 সে.মি. হলে AB কত?'
].join('\n');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  const b64 = await page.evaluate(async (t) => {
    const r = await FayzarExport.produce(t, { format: 'docx-bijoy', docType: 'GENERAL', pageSize: 'a4', margin: 'normal' });
    const a = new Uint8Array(await r.blob.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s);
  }, TEXT);
  const z = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
  const x = await z.file('word/document.xml').async('string');
  const paras = x.split('</w:p>').map((p) => [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')).filter((s) => s.trim());
  paras.forEach((p) => console.log(JSON.stringify(p)));
  const all = paras.join('\n');
  const want = ['/10/', '%', '(A+B)/2', 'ISBN', '978', 'OA = 4'];
  for (const w of want) console.log((all.includes(w) ? '✓ ' : '✗ MISSING ') + w);
} finally { await browser.close(); server.close(); }
