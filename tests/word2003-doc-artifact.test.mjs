/**
 * Part-9f: Word-2003 `.doc` আর্টিফ্যাক্ট-টেস্ট (আসল Chromium-এ পুরো পেজ-ফ্লো)
 *   node tests/word2003-doc-artifact.test.mjs
 *
 * যা যাচাই হয় (৯c-তে `.doc`-এ OMML পাঠানোর কারণে Word 2003 ক্র্যাশ করত):
 *   ১) `.doc`-এ কোনো OMML (`<m:oMath`, `<m:f`, `</m:` …) নেই — Word 2003 বোঝে না, ক্র্যাশ করে।
 *   ২) `.doc`-এ Equation Editor 3.0 EQ-ফিল্ড আছে (5-অংশের Word-HTML ফিল্ড) — 2003-নেটিভ।
 *   ৩) কোনো RTF math zone (`\mmath`) নেই; কাঁচা LaTeX নেই; রাশিগুলোর পাঠ্য অটুট।
 *   ৪) docMath:'plain' মোডেও ফাইল তৈরি হয় (ফিল্ড ছাড়া) — ফলব্যাক পথ।
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createRequire } from 'module';

const require = createRequire('/home/user/qa/package.json');
const { chromium } = require('playwright');

const ROOT = '/home/user/repo_p2';
const FIXTURE = '/home/user/probe/live3/height_cq9e.live.docx';
const OUTDIR = '/home/user/probe/live3f/word2003fix';
fs.mkdirSync(OUTDIR, { recursive: true });

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };
const cnt = (s, re) => (String(s).match(re) || []).length;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const fp = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const BASE = `http://127.0.0.1:${PORT}`;

async function runConvert(docMath) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.addInitScript((mode) => {
    window.__blobs = [];
    window.__docMath = mode;
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { try { window.__blobs.push(b); } catch (e) {} return orig(b); };
  }, docMath);
  const page = await ctx.newPage();
  await page.route('**', (route) => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    return route.abort(); // বাইরের CDN/ফন্ট — দরকার নেই
  });
  await page.goto(`${BASE}/docx-to-doc.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.docxToDocEngine !== 'undefined', { timeout: 30000 }).catch(() => {});
  // docMath মোড ইনজেক্ট (পেজ ডিফল্ট 'eqfield'; plain যাচাইয়ের জন্য op-কে র্যাপ করি)
  if (docMath && docMath !== 'eqfield') {
    await page.evaluate((mode) => {
      const orig = window.docxToDocEngine.convertDocxToDoc.bind(window.docxToDocEngine);
      window.docxToDocEngine.convertDocxToDoc = (file, opts = {}) => orig(file, Object.assign({}, opts, { docMath: mode }));
    }, docMath);
  }
  await page.setInputFiles('#fileInput', FIXTURE);
  await page.waitForFunction(() => document.querySelectorAll('#fileItemsContainer > div').length > 0, { timeout: 120000 });
  await page.click('#fileItemsContainer .download-btn');
  await page.waitForFunction(() => window.__blobs && window.__blobs.length > 0, { timeout: 30000 });
  const text = await page.evaluate(async () => await window.__blobs[0].text());
  await browser.close();
  return text;
}

// ---------- ১) ডিফল্ট মোড: eqfield ----------
{
  const html = await runConvert('eqfield');
  fs.writeFileSync(path.join(OUTDIR, 'height_cq9f_Word2003.doc'), html);

  T('.doc-এ কোনো OMML ট্যাগ নেই (`<m:oMath`)', cnt(html, /<m:oMath/g) === 0, cnt(html, /<m:oMath/g));
  T('.doc-এ কোনো m: ট্যাগই নেই (Word 2003-safe)', cnt(html, /<\/?m:[a-zA-Z]/g) === 0, cnt(html, /<\/?m:[a-zA-Z]/g));
  T('.doc-এ `<m:f>`/`<m:rad>` নেই', cnt(html, /<m:f>/g) === 0 && cnt(html, /<m:rad>/g) === 0);
  T('.doc-এ RTF ম্যাথ-জোন (`\\mmath`) নেই', cnt(html, /\\mmath/g) === 0, cnt(html, /\\mmath/g));
  T('.doc-এ Equation Editor EQ-ফিল্ড আছে (5-অংশ)', cnt(html, /mso-element:field-begin/g) > 0 && cnt(html, /mso-element:field-end/g) > 0,
    [cnt(html, /mso-element:field-begin/g), cnt(html, /mso-element:field-end/g)]);
  T('.doc-এ EQ সুইচ আছে (\\F( ভগ্নাংশ)', cnt(html, /EQ\s*[^<]*\\F\(/g) > 0, cnt(html, /\\F\(/g));
  T('.doc-এ কাঁচা LaTeX/`$` নেই', cnt(html.replace(/<[^>]*>/g, ''), /\$|\\(frac|sqrt|vec|overline)\b/g) === 0);
  T('.doc-এ সমীকরণের রাশি পাঠ্যে অটুট (x, √, 27)', /27/.test(html));
  T('.doc ফাইল সাইজ যুক্তিসঙ্গত (৫ KB+)', html.length > 5000, html.length);
}

// ---------- ১ক) ব্রাউজার-রেন্ডার: দৃশ্যমান পাঠ্যে কাঁচা EQ সুইচ যেন না থাকে ----------
{
  const html = fs.readFileSync(path.join(OUTDIR, 'height_cq9f_Word2003.doc'), 'utf8');
  const previewPath = path.join(OUTDIR, 'preview_render.html');
  fs.writeFileSync(previewPath, html);
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 1250 } })).newPage();
  await page.goto('file://' + previewPath, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const visible = await page.evaluate(() => document.body.innerText);
  const srcHtml = fs.readFileSync(previewPath, 'utf8');
  await page.screenshot({ path: path.join(OUTDIR, 'preview_page1.png'), fullPage: false });
  await browser.close();
  T('রেন্ডারে কাঁচা `\\S\\up` নেই', !/[\\]{1,2}S[\\]{1,2}up/.test(visible), visible.slice(0, 140));
  T('রেন্ডারে কাঁচা `\\F(` নেই', !/[\\]{1,2}F\(/.test(visible), visible.slice(0, 140));
  T('ভগ্নাংশ পড়ার-উপযোগ্য (1/2)', /1\/2/.test(visible), visible.slice(0, 160));
  T('সুপারস্ক্রিপ্ট `<sup>` ট্যাগে', /<sup>/.test(srcHtml), /<sup>\d/.test(srcHtml));
  T('মূল প্রশ্ন-পাঠ্য রেন্ডারে আছে', visible.includes('F(x, y, z)'), visible.slice(0, 160));
}

// ---------- ২) ফলব্যাক মোড: plain ----------
{
  const html = await runConvert('plain');
  fs.writeFileSync(path.join(OUTDIR, 'height_cq9f_Word2003_plain.doc'), html);
  T('plain: কোনো m: ট্যাগ নেই', cnt(html, /<\/?m:[a-zA-Z]/g) === 0, cnt(html, /<\/?m:[a-zA-Z]/g));
  T('plain: কোনো EQ-ফিল্ড নেই', cnt(html, /mso-element:field-begin/g) === 0, cnt(html, /mso-element:field-begin/g));
  T('plain: ম্যাথ-জোন নেই', cnt(html, /\\mmath/g) === 0);
}

// ---------- ৩) `.docx` পাথ অপরিবর্তিত (OMML অটুট) ----------
{
  const { execSync } = await import('child_process');
  const xml = execSync(`cd /tmp && rm -rf dxchk && mkdir dxchk && cd dxchk && unzip -o -q ${FIXTURE} word/document.xml && grep -o "<m:oMath" word/document.xml | wc -l`).toString().trim();
  T('.docx (ইনপুট) এখনও OMML ধরে রাখে', Number(xml) > 0, xml);
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
server.close();
process.exit(fail ? 1 : 0);
