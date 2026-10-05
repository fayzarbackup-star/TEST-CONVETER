// ধাপ ০(খ): একটি .docx-কে প্রোডাকশন-পথে (FayzarExport-এর ধাপ ৩–৫) রূপান্তর — বিজয় .docx ও Word 2003 .doc।
// চালানো: node qa/phase0/convert-in-browser.mjs <in.docx> <outDir>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const IN = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 10 * 60 * 1000 });
try {
  const page = await browser.newPage();
  const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  const out = await page.evaluate(async (b64) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const master = new Blob([u], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const enc = async (b) => { const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
    const r = {};
    // হুবহু FayzarExport-এর ধাপ ৩–৫
    const bj = await DocxHandler.convertDocx(master, { direction: 'u2b', targetFont: 'SutonnyMJ' });
    const bijoy = bj && (bj.convertedBlob || bj.blob);
    r.bijoy = await enc(bijoy);
    const dr = await new DocxToDocConverter().convertDocxToDoc(bijoy, { pageSize: 'a4', margin: 'normal', preserveSutonny: true, optimizeForQuestionPaper: true });
    let doc = dr.blob || dr.convertedBlob;
    doc = await FayzarDocMhtml.packBlob(doc);
    r.doc = await enc(doc);
    // হেডার/ফুটারসহ বিজয় (বিকল্প পতাকা) — পার্থক্য দেখার জন্য
    const bj2 = await DocxHandler.convertDocx(master, { direction: 'u2b', targetFont: 'SutonnyMJ', convertHeadersFooters: true });
    r.bijoyHF = await enc(bj2.convertedBlob || bj2.blob);
    return r;
  }, fs.readFileSync(IN).toString('base64'));
  fs.writeFileSync(path.join(OUT, '2-bijoy.docx'), Buffer.from(out.bijoy, 'base64'));
  fs.writeFileSync(path.join(OUT, '2b-bijoy-hf.docx'), Buffer.from(out.bijoyHF, 'base64'));
  fs.writeFileSync(path.join(OUT, '3-word2003.doc'), Buffer.from(out.doc, 'base64'));
  fs.copyFileSync(IN, path.join(OUT, '1-master.docx'));
  console.log('ok', logs.join(' | '));
} finally { await browser.close(); server.close(); }
