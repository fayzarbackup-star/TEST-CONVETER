/**
 * Part-9f/9g/9h: Word-2003 `.doc` আর্টিফ্যাক্ট-টেস্ট (আসল Chromium-এ পুরো পেজ-ফ্লো)
 *   node tests/word2003-doc-artifact.test.mjs
 *
 * নিয়ম (৯f):  `.doc`-এ OMML (`m:`) বা ম্যাথ-জোন (`\mmath`) থাকতে পারবে না — Word 2003 ক্র্যাশ করে।
 * নিয়ম (৯g):  অক্ষর ইটালিক, সংখ্যা/ফাংশন-নাম খাড়া (Equation Editor স্ট্রাকচার)।
 * নিয়ম (৯h):  EQ ফিল্ডের ফলাফল-অঞ্চল **খালি** — Word নিজে কোড থেকে আঁকে,
 *             তাই এডিটরে ঢুকলে ক্যাশ-টেক্সট ডুপ হয়ে যায় না (ব্যবহারকারীর রিপোর্ট #৭৭-খ)।
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
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
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
    return route.abort();
  });
  await page.goto(`${BASE}/docx-to-doc.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.docxToDocEngine !== 'undefined', { timeout: 30000 });
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

// ---------- ১) ডিফল্ট (৯h): EQ ফিল্ড, ক্যাশ-ফলাফল খালি ----------
{
  const html = await runConvert('eqfield');
  fs.writeFileSync(path.join(OUTDIR, 'height_cq9h_Word2003.doc'), html);

  const fields = cnt(html, /mso-element:field-begin/g);
  const seps = cnt(html, /mso-element:field-separator/g);
  const ends = cnt(html, /mso-element:field-end/g);
  T('.doc-এ কোনো OMML ট্যাগ নেই (`<m:oMath`)', cnt(html, /<m:oMath/g) === 0, cnt(html, /<m:oMath/g));
  T('.doc-এ কোনো m: ট্যাগই নেই (Word 2003-safe)', cnt(html, /<\/?m:[a-zA-Z]/g) === 0, cnt(html, /<\/?m:[a-zA-Z]/g));
  T('.doc-এ RTF ম্যাথ-জোন (`\\mmath`) নেই', cnt(html, /\\mmath/g) === 0, cnt(html, /\\mmath/g));
  T('EQ ফিল্ড ট্রিপল সমান (begin/sep/end)', fields > 0 && fields === seps && seps === ends, [fields, seps, ends]);
  T('EQ সুইচ আছে (\\F( ভগ্নাংশ)', cnt(html, /EQ\s*[^<]*\\F\(/g) > 0, cnt(html, /\\F\(/g));

  // ৯h-এর মূল প্রমাণ: separator-এর পরে সরাসরি field-end — কোথাও ক্যাশ-টেক্সট নেই
  const emptyResults = cnt(html, /field-separator'><\/span><!\[endif\]--><!--\[if supportFields\]><span[^>]*field-end[\s\S]{0,12}?<\/span><!\[endif\]-->/g);
  T('৯h: প্রতিটি ফিল্ডের ফলাফল-অঞ্চল খালি (ক্যাশ-টেক্সট নেই)', emptyResults === fields, `${emptyResults} / ${fields}`);
  T('৯h: separator↔field-end-এর মাঝে কোনো <span> ফলাফল নেই', !/field-separator'><\/span><!\[endif\]--><span/.test(html));

  const vis = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  T('.doc-এ কাঁচা LaTeX/`$` নেই', cnt(vis, /\$|\\(frac|sqrt|vec|overline)\b/g) === 0);
  T('.doc-এ সমীকরণের রাশি কোডে অটুট (x, 27)', /27/.test(html) && /\\F\(/.test(html));

  // সিমুলেটেড "Word compute" ভিউ: supportFields কমেন্ট খুলে দিলে শুধু EQ কোড দেখা যায়, ডুপ নয়
  const sim = html.replace(/<!--\[if supportFields\]>/g, '').replace(/<!\[endif\]-->/g, '');
  const simVis = sim.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<span[^>]*mso-element[^>]*><\/span>/g, ' ').replace(/<[^>]+>/g, ' ');
  T('সিমুলেটেড Word-ভিউতে `EQ \\F(` কোড পরিষ্কার', /EQ[^\n]{0,80}\\F\(/.test(simVis), simVis.slice(0, 160));
}

// ---------- ২) 'cached' মোড (৯f-আচরণ): ফলাফল-ক্যাশ থাকে + ৯g স্টাইল ----------
{
  const html = await runConvert('cached');
  fs.writeFileSync(path.join(OUTDIR, 'height_cq9h_Word2003_cached.doc'), html);
  T('cached: OMML/m: নেই', cnt(html, /<\/?m:[a-zA-Z]/g) === 0 && cnt(html, /\\mmath/g) === 0);
  T('cached: ফিল্ড-ফলাফলে <span> ক্যাশ আছে', cnt(html, /field-separator'><\/span><!\[endif\]--><span/g) > 0);
  T('cached: অক্ষর ইটালিক (<i>)', /<i>[A-Za-z]/.test(html), (html.match(/<i>[A-Za-z][^<]*<\/i>/g) || []).slice(0, 3));
  T('cached: সংখ্যা ইটালিক নয় (খাড়া)', !/<i>[0-9]/.test(html));
  T('cached: সুপারস্ক্রিপ্ট `<sup>` ট্যাগে', /<sup>\d/.test(html));
}

// ---------- ৩) 'plain' মোড: ফিল্ড ছাড়া (সব Word-এ পড়া যায়) ----------
{
  const html = await runConvert('plain');
  fs.writeFileSync(path.join(OUTDIR, 'height_cq9h_Word2003_plain.doc'), html);
  T('plain: কোনো m: ট্যাগ নেই', cnt(html, /<\/?m:[a-zA-Z]/g) === 0, cnt(html, /<\/?m:[a-zA-Z]/g));
  T('plain: কোনো EQ-ফিল্ড নেই', cnt(html, /mso-element:field-begin/g) === 0, cnt(html, /mso-element:field-begin/g));
  T('plain: ম্যাথ-জোন নেই', cnt(html, /\\mmath/g) === 0);
  T('plain: অক্ষর ইটালিক, সংখ্যা খাড়া', /<i>[A-Za-z]/.test(html) && !/<i>[0-9]/.test(html));
}

// ---------- ৪) `.docx` পাথ অপরিবর্তিত (OMML অটুট) ----------
{
  const { execSync } = await import('child_process');
  const xml = execSync(`cd /tmp && rm -rf dxchk9h && mkdir dxchk9h && cd dxchk9h && unzip -o -q ${FIXTURE} word/document.xml && grep -o "<m:oMath" word/document.xml | wc -l`).toString().trim();
  T('.docx (ইনপুট) এখনও OMML ধরে রাখে', Number(xml) > 0, xml);
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
server.close();
process.exit(fail ? 1 : 0);
