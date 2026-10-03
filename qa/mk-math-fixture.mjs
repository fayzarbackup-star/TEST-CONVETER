#!/usr/bin/env node
/**
 * Word-2003 আর্টিফ্যাক্ট-টেস্টের **ম্যাথ-ফিক্সচার** পুনর্জনন (রিপো-আপেক্ষ)।
 *
 *   node qa/mk-math-fixture.mjs                 → tests/fixtures/word2003-math.docx
 *   node qa/mk-math-fixture.mjs --out <path>    → কাস্টম পথ
 *
 * উৎস: tests/fixtures/math-equations.input.md (রিপোর নিজের EXAM_MATH ফিক্সচার)
 * পথ:  index.html-এর FayzarPipeline.exportDocx — হুবহু প্রোডাকশন মাস্টার-ডক্স পাইpline।
 * কেন:  tests/word2003-doc-artifact.test.mjs-এর আগের ডিফল্ট ফিক্সচার
 *       `proof/render/cq-booklet-6.docx` ছিল qa-স্ক্রিপ্টের কাজের ডির (gitignore-করা)
 *       ⇒ ফ্রেশ ক্লোনে টেস্ট ENOENT-এ ক্র্যাশ করত, ৩০টি Word-2003 গেট কার্যত অচল ছিল।
 *
 * প্রয়োজন: playwright (dev) — npm i -D playwright && npx playwright install chromium
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outIdx = process.argv.indexOf('--out');
const OUT = outIdx > -1 ? path.resolve(process.argv[outIdx + 1]) : path.join(ROOT, 'tests', 'fixtures', 'word2003-math.docx');
const MD = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'math-equations.input.md'), 'utf8');

let chromium = null;
for (const from of [path.join(ROOT, 'package.json'), path.join(ROOT, 'qa', 'package.json')]) {
  try { chromium = createRequire(from)('playwright').chromium; break; } catch (e) { /* পরের প্রোফাইল */ }
}
if (!chromium) {
  console.error('⏩ playwright নেই — npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const fp = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const b = await chromium.launch();
const page = await (await b.newContext()).newPage();
await page.route('**', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.FayzarPipeline !== 'undefined', { timeout: 30000 });

const b64 = await page.evaluate(async (md) => {
  const res = await window.FayzarPipeline.exportDocx(md, { font: 'Kalpurush', docType: 'EXAM_MATH' });
  const blob = res && res.content instanceof Blob ? res.content : res;
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}, MD);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
console.log('✔ ফিক্সচার লেখা হলো:', OUT, fs.statSync(OUT).size, 'বাইট');
await b.close();
server.close();
