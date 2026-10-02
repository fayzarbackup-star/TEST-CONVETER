/**
 * Part-9j টুল: MD → (FayzarPipeline/question-engine) → docx → .doc চেইন, শুধু ব্রাউজার-এ।
 *   node qa/e2e-md-to-doc.mjs "<input.md>" [out.doc]
 * chromium দরকার: npm i playwright@1.63.0 && npx playwright install chromium && npx playwright install-deps chromium
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createRequire } from 'module';

const require = createRequire('/home/user/qa/package.json');
const { chromium } = require('playwright');

const MD = process.argv[2];
const OUT = process.argv[3] || '/tmp/e2e_out.doc';
const ROOT = '/home/user/repo_p2';
if (!MD || !fs.existsSync(MD)) { console.error('ব্যবহার: node qa/e2e-md-to-doc.mjs "<file.md>" [out.doc]'); process.exit(1); }
const mdText = fs.readFileSync(MD, 'utf8');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const fp = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, '0.0.0.0', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true });
await ctx.addInitScript(() => { window.__blobs = []; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = (b) => { try { window.__blobs.push(b); } catch (e) {} return o(b); }; });
const page = await ctx.newPage();
await page.route('**', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
// ধাপ ১-পেজ: index.html (FayzarPipeline + export-dual-engine লোড থাকে — OCR-এক্সপোর্টের হুবহু পথ)
await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.FayzarPipeline !== 'undefined', { timeout: 30000 });

// ধাপ ১: MD → docx (OCR এক্সপোর্টের হুবহু পথ: FayzarPipeline.exportDocx)
const docxB64 = await page.evaluate(async (md) => {
  const res = await window.FayzarPipeline.exportDocx(md, { font: 'Kalpurush' });
  const blob = res && res.content instanceof Blob ? res.content : res;
  const buf = await blob.arrayBuffer();
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}, mdText);
fs.writeFileSync('/tmp/e2e_master.docx', Buffer.from(docxB64, 'base64'));
console.log('✔ ধাপ১ docx (পেজ-পাইপলাইন):', fs.statSync('/tmp/e2e_master.docx').size, 'বাইট');

// ধাপ ২: docx → .doc (docx-to-doc.html-এর DocxToDocConverter — লাইভ ডাউনলোডের হুবহু পথ)
await page.goto(`${BASE}/docx-to-doc.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.docxToDocEngine !== 'undefined', { timeout: 30000 });
await page.setInputFiles('#fileInput', '/tmp/e2e_master.docx');
await page.waitForFunction(() => document.querySelectorAll('#fileItemsContainer > div').length > 0, { timeout: 120000 });
await page.click('#fileItemsContainer .download-btn');
await page.waitForFunction(() => window.__blobs && window.__blobs.length > 0, { timeout: 30000 });
const docText = await page.evaluate(async () => await window.__blobs[0].text());
fs.writeFileSync(OUT, docText);
console.log('✔ ধাপ২ .doc:', Buffer.byteLength(docText, 'utf8'), 'বাইট →', OUT);

await browser.close();
server.close();
