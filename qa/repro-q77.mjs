// Q77 রিপ্রো: ক/খ/গ/ঘ চারটিই ভগ্নাংশ-অপশন — পুরো পাইপলাইন (markdown → .docx → `.doc` → ফিল্ড-ফরেনসিক)
//   node qa/repro-q77.mjs
import fs from 'fs'; import path from 'path'; import http from 'http';
import { createRequire } from 'module';
const require = createRequire('/home/user/qa/package.json');
const { chromium } = require('playwright');

const ROOT = '/home/user/repo_p2';
const OUT = '/home/user/probe/q77';
fs.mkdirSync(OUT, { recursive: true });

const MD = [
  '---', 'doc_type: EXAM_MCQ', '---', '',
  '৭৭। মোট উপাত্তের সংখ্যা $n$ এবং $n$ বিজোড় হলে মধ্যক— (সহজমান)',
  'ক. $\\frac{n}{2}$ তম পদ\tখ. $\\frac{n-1}{2}$ তম পদ\tগ. $\\frac{n+1}{2}$ তম পদ\tঘ. $\\frac{n}{2}+1$ তম পদ',
].join('\n');

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
const page = await (await b.newContext()).newPage();
await page.route('**', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.FayzarPipeline !== 'undefined' && typeof window.ExportDualEngine !== 'undefined', { timeout: 60000 });

const res = await page.evaluate(async (md) => {
  const out = {};
  try {
    const docx = await window.FayzarPipeline.process(md, { docType: 'EXAM_MCQ', outputFormat: 'docx' });
    let blob = docx.content;
    if (blob && typeof blob.arrayBuffer === 'function') {
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      out.docxB64 = btoa(bin);
      out.docxLen = buf.length;
    } else { out.docxErr = 'content not a Blob: ' + (typeof blob); }
  } catch (e) { out.docxErr = String(e && e.message || e); }
  try {
    const html = await window.FayzarPipeline.previewHtml(md, { docType: 'EXAM_MCQ' });
    out.preview = String(html.content || '').slice(0, 4000);
  } catch (e) { out.previewErr = String(e && e.message || e); }
  return out;
}, MD);

console.log('docx:', res.docxLen, 'বাইট | ত্রুটি:', res.docxErr || 'নেই');
if (res.docxB64) fs.writeFileSync(path.join(OUT, 'q77.docx'), Buffer.from(res.docxB64, 'base64'));
if (res.preview) fs.writeFileSync(path.join(OUT, 'q77.preview.html'), res.preview);

// .docx-এ OMML গণনা
if (res.docxB64) {
  const { execSync } = await import('child_process');
  const xml = execSync(`cd ${OUT} && rm -rf x && mkdir x && cd x && unzip -o -q ../q77.docx word/document.xml && cat word/document.xml`).toString();
  const eqs = (xml.match(/<m:oMath[ >]/g) || []).length;
  console.log('docx-এ oMath:', eqs);
  fs.writeFileSync(path.join(OUT, 'document.xml'), xml);
}
await b.close(); server.close();
console.log('✔ আউটপুট:', OUT);
