/**
 * Part-9f/9g/9i: Word-2003 `.doc` আর্টিফ্যাক্ট-টেস্ট (আসল Chromium-এ পুরো পেজ-ফ্লো)
 *   node tests/word2003-doc-artifact.test.mjs
 *
 * নিয়ম (৯f):  `.doc`-এ OMML (`m:`) বা ম্যাথ-জোন (`\mmath`) থাকতে পারবে না — Word 2003 ক্র্যাশ করে।
 * নিয়ম (৯g):  অক্ষর ইটালিক, সংখ্যা/ফাংশন-নাম খাড়া (কেবল cached/plain মোডে প্রযোজ্য)।
 * নিয়ম (৯i):  EQ ফিল্ড = **ক্লিন ফিল্ড** — begin + ` EQ <কোড>` + end **একই supportFields block-এ**;
 *             কোনো field-separator নেই, separator↔end-এ কোনো ক্যাশ-টেক্সট নেই
 *             (js/docx-handler.js:L1428-এর গঠন)। ⇒ Word 2003-এ ডাবল-ক্লিক-এডিটেও ডুপ অসম্ভব।
 * নিয়ম (৯k):  ফিল্ড-কোডের ভেতরের **চলক-অক্ষর** <i>-রানে মোড়া (EQ রেজাল্ট null ⇒ পর্দায়
 *             ফরম্যাটিং আসে কোডের run থেকেই) — সংখ্যা/চিহ্ন ও `\F`/`\S`/`\up4` সুইচ-টোকেন
 *             খাড়া; কোডের **অক্ষর হুবহু অপরিবর্তিত** (ফরম্যাটিং কেবল রান-লেভেলে)।
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

// ---------- ১) ডিফল্ট (৯i): ক্লিন EQ ফিল্ড — separator ও ক্যাশ-টেক্সট শূন্য ----------
{
  const html = await runConvert('eqfield');
  fs.writeFileSync(path.join(OUTDIR, 'height_cq9i_Word2003.doc'), html);

  const fields = cnt(html, /mso-element:field-begin/g);
  const seps = cnt(html, /mso-element:field-separator/g);
  const ends = cnt(html, /mso-element:field-end/g);
  T('.doc-এ কোনো OMML ট্যাগ নেই (`<m:oMath`)', cnt(html, /<m:oMath/g) === 0, cnt(html, /<m:oMath/g));
  T('.doc-এ কোনো m: ট্যাগই নেই (Word 2003-safe)', cnt(html, /<\/?m:[a-zA-Z]/g) === 0, cnt(html, /<\/?m:[a-zA-Z]/g));
  T('.doc-এ RTF ম্যাথ-জোন (`\\mmath`) নেই', cnt(html, /\\mmath/g) === 0, cnt(html, /\\mmath/g));
  T('EQ ফিল্ড আছে (begin = end = N > 0)', fields > 0 && fields === ends, [fields, ends]);
  T('৯i: `field-separator` শূন্য (ক্লিন ফিল্ড)', seps === 0, seps);
  T('EQ সুইচ আছে (\\F( ভগ্নাংশ)', cnt(html, /EQ\s*[^\n<]*\\F\(/g) > 0, cnt(html, /EQ[^\n<]*\\F\(/g));

  // ৯i-এর মূল প্রমাণ: begin+কোড+end একই supportFields block-এ (MsoFieldCode span)
  const cleanBlocks = cnt(html, /<!--\[if supportFields\]><span class="MsoFieldCode"><span[^>]*field-begin[^>]*><\/span><span[^>]*mso-spacerun[^>]*>&nbsp;<\/span>EQ [\s\S]{0,900}?<span[^>]*field-end[^>]*><\/span><\/span><!\[endif\]-->/g);
  T('৯i: প্রতিটি ফিল্ড = এক ব্লকে begin→কোড→end (MsoFieldCode)', cleanBlocks === fields, `${cleanBlocks} / ${fields}`);
  T('৯i: separator-ব্লক একটিও নেই', cnt(html, /field-separator/g) === 0);

  // প্রতিটি begin→end-এর মাঝে কেবল EQ কোড + অক্ষরের <i>-রান (ক্যাশ-ফলাফল নেই)
  let innerBad = 0, regions = 0, regionsWithItalic = 0, italicRuns = 0, italicBad = 0, switchInItalic = 0, tagLeak = 0;
  const re = /mso-element:field-begin[^>]*><\/span>([\s\S]{0,900}?)<span[^>]*mso-element:field-end/g;
  const FN = /^(?:sin|cos|tan|cot|sec|csc|log|ln|lim|max|min|exp|det|mod|deg|arcsin|arccos|arctan|sinh|cosh|tanh)$/i;
  let m;
  while ((m = re.exec(html)) !== null) {
    const region = m[1];
    regions++;
    const textOnly = region.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
    if (!/^\s*EQ\s/.test(textOnly)) innerBad++;                       // কোড ছাড়া কিছু থাকলেই ধরা পড়বে
    if (/<sup>|<sub>|font-style\s*:\s*italic/i.test(region)) innerBad++;   // ক্যাশ-বডির চিহ্ন
    if (/&lt;i&gt;|&amp;lt;/.test(region)) tagLeak++;                   // ট্যাগ টেক্সট হয়ে গেলে
    const runs = region.match(/<i>([^<]*)<\/i>/g) || [];
    if (runs.length) regionsWithItalic++;
    for (const r of runs) {
      italicRuns++;
      const inner = r.slice(3, -4);
      if (!/^[A-Za-z]+$/.test(inner) || FN.test(inner)) italicBad++;     // সংখ্যা/ফাংশন-নাম ইটালিক হলে ব্যর্থ
      if (inner.includes('\\') || inner.includes('(')) switchInItalic++;
    }
    if (/\\<i>/.test(region)) switchInItalic++;                        // সুইচ-অক্ষর ভেঙে ইটালিক হলে
  }
  T('৯k: begin↔end-এর মাঝে শুধু EQ কোড (+অক্ষরে <i>) — ক্যাশ-টেক্সট নেই', innerBad === 0, innerBad);
  T('৯k: <i>-রান আছে এবং কেবল চলক-অক্ষরে (সংখ্যা/ফাংশন-নাম নয়)', italicRuns > 0 && italicBad === 0 && regionsWithItalic > 0, { italicRuns, italicBad, regionsWithItalic });
  T('৯k: সুইচ-টোকেন (`\\F`, `\\S`, `\\up4`) ইটালিক হয়নি', switchInItalic === 0, switchInItalic);
  T('৯k: কোডে ট্যাগ টেক্সট-লিক নেই (`&lt;i&gt;` শূন্য)', tagLeak === 0, tagLeak);
  // স্যুইচবিহীন সাধারণ ম্যাথ (x = 5) plain-span পাথে বৈধভাবে <i> পায় — তাই ফিল্ড-গণনার বদলে
  // ডকুমেন্ট-জুড়ে আসল নিরাপত্তা-নিয়ম মাপি: প্রতিটি <i> কেবল চলক-অক্ষর ধরে (সংখ্যা/সুইচ/চিহ্ন নয়)।
  const allItalics = html.match(/<i>([^<]*)<\/i>/g) || [];
  const badItalic = allItalics.filter((r) => {
    const inner = r.slice(3, -4);
    return !/^[A-Za-z]+$/.test(inner) || FN.test(inner);
  });
  T('৯k: ফিল্ড-কোডের ভেতরে <i>-রান আছে (ইটালিক থেকেই আঁকবে)', italicRuns > 0, italicRuns);
  T('৯k: ডকুমেন্টের প্রতিটি <i> কেবল চলক-অক্ষর (সংখ্যা/সুইচ/চিহ্ন নয়)', badItalic.length === 0, badItalic.slice(0, 3));
  T('৯i: ক্যাশ-ফলাফল-স্প্যান কোথাও নেই', cnt(html, /<span style="font-style:italic;">/g) === 0, cnt(html, /<span style="font-style:italic;">/g));

  const vis = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  T('.doc-এ কাঁচা LaTeX/`$` নেই', cnt(vis, /\$|\\(frac|sqrt|vec|overline)\b/g) === 0);
  T('.doc-এ সমীকরণের রাশি কোডে অটুট (x, 27)', /27/.test(html) && /\\F\(/.test(html));

  // সিমুলেটেড "Word compute" ভিউ: supportFields কমেন্ট খুলে দিলে কেবল EQ কোড দেখা যায়, ডুপ নয়
  const sim = html.replace(/<!--\[if supportFields\]>/g, '').replace(/<!\[endif\]-->/g, '');
  const simVis = sim.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<span[^>]*mso-element[^>]*><\/span>/g, ' ').replace(/<[^>]+>/g, ' ');
  T('সিমুলেটেড Word-ভিউতে `EQ \\F(` কোড পরিষ্কার', /EQ[^\n]{0,80}\\F\(/.test(simVis), simVis.slice(0, 160));
  // ডুপ-প্রুফ: প্রতিটি স্ক্রিনে-দেখানো রাশি মাত্র একবার (কোড ছাড়া দ্বিতীয় কপি নেই)
  T('৯i: রাশির দ্বিতীয় কপি (ক্যাশ-টেক্সট) কোথাও নেই', cnt(html, /\b\d\s*\/\s*\d\b/g) === 0, cnt(html, /\b\d\s*\/\s*\d\b/g));
}

// ---------- ২) 'cached' মোড (৯f-আচরণ, fallback): separator + ক্যাশ + ৯g স্টাইল ----------
{
  const html = await runConvert('cached');
  fs.writeFileSync(path.join(OUTDIR, 'height_cq9i_Word2003_cached.doc'), html);
  const fields = cnt(html, /mso-element:field-begin/g);
  T('cached: OMML/m: নেই', cnt(html, /<\/?m:[a-zA-Z]/g) === 0 && cnt(html, /\\mmath/g) === 0);
  T('cached: ফিল্ড ট্রিপল সমান (begin/sep/end)', fields > 0 && fields === cnt(html, /mso-element:field-separator/g) && fields === cnt(html, /mso-element:field-end/g));
  T('cached: ফিল্ড-ফলাফলে <span> ক্যাশ আছে', cnt(html, /field-separator'><\/span><!\[endif\]--><span/g) > 0);
  T('cached: অক্ষর ইটালিক (<i>)', /<i>[A-Za-z]/.test(html), (html.match(/<i>[A-Za-z][^<]*<\/i>/g) || []).slice(0, 3));
  T('cached: সংখ্যা ইটালিক নয় (খাড়া)', !/<i>[0-9]/.test(html));
  T('cached: সুপারস্ক্রিপ্ট `<sup>` ট্যাগে', /<sup>\d/.test(html));
}

// ---------- ৩) 'plain' মোড: ফিল্ড ছাড়া (সব Word-এ পড়া যায়) ----------
{
  const html = await runConvert('plain');
  fs.writeFileSync(path.join(OUTDIR, 'height_cq9i_Word2003_plain.doc'), html);
  T('plain: কোনো m: ট্যাগ নেই', cnt(html, /<\/?m:[a-zA-Z]/g) === 0, cnt(html, /<\/?m:[a-zA-Z]/g));
  T('plain: কোনো EQ-ফিল্ড নেই', cnt(html, /mso-element:field-begin/g) === 0, cnt(html, /mso-element:field-begin/g));
  T('plain: ম্যাথ-জোন নেই', cnt(html, /\\mmath/g) === 0);
  T('plain: অক্ষর ইটালিক, সংখ্যা খাড়া', /<i>[A-Za-z]/.test(html) && !/<i>[0-9]/.test(html));
}

// ---------- ৪) `.docx` পাথ অপরিবর্তিত (OMML অটুট) ----------
{
  const { execSync } = await import('child_process');
  const xml = execSync(`cd /tmp && rm -rf dxchk9i && mkdir dxchk9i && cd dxchk9i && unzip -o -q ${FIXTURE} word/document.xml && grep -o "<m:oMath" word/document.xml | wc -l`).toString().trim();
  T('.docx (ইনপুট) এখনও OMML ধরে রাখে', Number(xml) > 0, xml);
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
server.close();
process.exit(fail ? 1 : 0);
