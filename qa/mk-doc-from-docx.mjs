// যেকোনো .docx → ৯f/৯g `.doc` (ব্রাউজারে, হুবহু প্রোডাকশন পথ: docx-to-doc.html → DocxToDocConverter)
//   node qa/mk-doc-from-docx.mjs <in.docx> <out.doc> [eqfield|plain]
import fs from 'fs'; import path from 'path'; import http from 'http';
import { createRequire } from 'module';
const require = createRequire('/home/user/qa/package.json');
const { chromium } = require('playwright');

const FIXTURE = process.argv[2];
const OUT = process.argv[3] || '/home/user/probe/live3f/out_Word2003.doc';
const MODE = process.argv[4] || 'eqfield';
if (!FIXTURE || !fs.existsSync(FIXTURE)) { console.error('ব্যবহার: node qa/mk-doc-from-docx.mjs <in.docx> <out.doc> [eqfield|plain]'); process.exit(1); }
const ROOT = '/home/user/repo_p2';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const fp = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const b = await chromium.launch();
const ctx = await b.newContext({ acceptDownloads: true });
await ctx.addInitScript(() => { window.__blobs = []; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = (x) => { try { window.__blobs.push(x); } catch (e) {} return o(x); }; });
const page = await ctx.newPage();
await page.route('**', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
await page.goto(`${BASE}/docx-to-doc.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.docxToDocEngine !== 'undefined', { timeout: 30000 });
if (MODE !== 'eqfield') {
  await page.evaluate((mode) => {
    const orig = window.docxToDocEngine.convertDocxToDoc.bind(window.docxToDocEngine);
    window.docxToDocEngine.convertDocxToDoc = (file, opts = {}) => orig(file, Object.assign({}, opts, { docMath: mode }));
  }, MODE);
}
await page.setInputFiles('#fileInput', FIXTURE);
await page.waitForFunction(() => document.querySelectorAll('#fileItemsContainer > div').length > 0, { timeout: 180000 });
await page.click('#fileItemsContainer .download-btn');
await page.waitForFunction(() => window.__blobs.length > 0, { timeout: 30000 });
const text = await page.evaluate(async () => await window.__blobs[0].text());
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text);
console.log('✔ তৈরি:', OUT, '|', text.length, 'বাইট | মোড:', MODE);
console.log('  EQ ফিল্ড:', (text.match(/mso-element:field-begin/g) || []).length,
            '| OMML:', (text.match(/<m:oMath/g) || []).length,
            '| <i>',':', (text.match(/<i>/g) || []).length,
            '| <i>+সংখ্যা:', (text.match(/<i>[0-9]/g) || []).length);
await b.close(); server.close();
