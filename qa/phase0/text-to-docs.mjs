// QA: একটি OCR-মার্কডাউন → প্রোডাকশন-পথে (FayzarExport) মাস্টার/বিজয় .docx ও Word 2003 .doc।
// রিগ্রেশন-তুলনায় (রূপান্তরকারী বদলের আগে/পরে) ব্যবহারের জন্য। চালানো: node qa/phase0/text-to-docs.mjs <in.md> <outDir> [docType]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const IN = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]), DT = process.argv[4] || 'EXAM_CQ';
fs.mkdirSync(OUT, { recursive: true });
let text = fs.readFileSync(IN, 'utf8');
const fm = text.match(/^---\s*\n([\s\S]*?)\n---/);
let docType = DT;
if (fm) { const t = fm[1].match(/doc_type:\s*(\w+)/); if (t) docType = t[1]; text = text.slice(fm[0].length).trim(); }
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
  const out = await page.evaluate(async (t, docType) => {
    const enc = async (b) => { const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
    const r = {};
    for (const fmt of ['docx-bijoy', 'doc']) {
      const res = await FayzarExport.produce(t, { format: fmt, docType, pageSize: 'a4', margin: 'normal', fontSize: '12', columns: /EXAM_/.test(docType) ? 2 : 1 });
      r[fmt] = await enc(res.blob);
    }
    return r;
  }, text, docType);
  fs.writeFileSync(path.join(OUT, 'bijoy.docx'), Buffer.from(out['docx-bijoy'], 'base64'));
  fs.writeFileSync(path.join(OUT, 'word2003.doc'), Buffer.from(out.doc, 'base64'));
  console.log('ok', docType);
} finally { await browser.close(); server.close(); }
