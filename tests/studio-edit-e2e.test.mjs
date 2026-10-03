/**
 * Part-13.1 E2E: স্টুডিওতে হাতে-এডিট → ডাউনলোড-ফাইল — চূড়ান্ত সমতা
 *   node tests/studio-edit-e2e.test.mjs
 *
 * বাস্তব Chromium-এ studio.html খুলে:
 *   ১) MCQ (mode-select = EXAM_MCQ): প্রশ্ন-স্টেম + একটি অপশন এডিট →
 *      .doc (RTF-ডিকোড) ও .docx (ZXML)-এ এডিট আছে, অ-সম্পাদিত অংশ অটুট।
 *   ২) CQ (mode-select = EXAM_CQ): উপ-প্রশ্নের মার্ক এডিট → .doc-এ নতুন মার্ক।
 * Playwright/Chromium না থাকলে পরিষ্কার SKIP (ভুয়া পাস নয়)।
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let chromium = null;
for (const from of [path.join(ROOT, 'package.json'), path.join(ROOT, 'scratch', 'test_env', 'package.json'), path.join(os.homedir(), 'qa', 'package.json')]) {
  try { chromium = createRequire(from)('playwright').chromium; break; } catch (e) { /* পরের প্রোফাইল */ }
}
if (!chromium) {
  console.log('SKIP: playwright/Chromium নেই — studio-edit-e2e এড়ানো হলো (ভুয়া পাস নয়)');
  process.exit(0);
}

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

const rtfDecode = (s) => String(s)
  .replace(/\\u(-?\d+)\s?\??/g, (_, d) => String.fromCharCode(((Number(d) % 65536) + 65536) % 65536))
  .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
// RTF-এর কন্ট্রোল-ওয়ার্ড/ব্রেস সরিয়ে প্লেইন টেক্সট (এডিট-লেখা 'অ' রান-ভাগ হলেও মিলবে:
// যেমন হাইফেন আলাদা {1 -} রানে ভাঙে)
const rtfPlain = (s) => rtfDecode(s).replace(/\\[a-zA-Z]+-?\d*\s?/g, '').replace(/[{}]/g, '');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const fp = path.join(ROOT, u === '/' ? 'studio.html' : u);
  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(r);
});
await new Promise((res) => server.listen(0, '127.0.0.1', res));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addInitScript(() => {
  window.__blobs = [];
  const o = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (x) => { try { window.__blobs.push(x); } catch (e) {} return o(x); };
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
await page.route('**', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
await page.goto(`${BASE}/studio.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.FayzarLayoutUnits && window.FayzarPipeline && window.StudioEditBridge, { timeout: 45000 });

const setMode = async (mode) => {
  await page.evaluate((m) => {
    const el = document.getElementById('mode-select');
    el.value = m;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, mode);
  await page.waitForTimeout(1400);
};
const grabDownloadText = async (menuId) => {
  await page.evaluate(() => { window.__blobs.length = 0; });
  await page.evaluate((id) => { const b = document.getElementById(id); if (b) b.click(); }, menuId);
  await page.waitForFunction(() => window.__blobs.length > 0, { timeout: 30000 });
  return await page.evaluate(async () => await window.__blobs[0].text());
};
const grabDownloadBase64 = async (menuId) => {
  await page.evaluate(() => { window.__blobs.length = 0; });
  await page.evaluate((id) => { const b = document.getElementById(id); if (b) b.click(); }, menuId);
  await page.waitForFunction(() => window.__blobs.length > 0, { timeout: 30000 });
  return await page.evaluate(async () => {
    const ab = await window.__blobs[0].arrayBuffer();
    const u8 = new Uint8Array(ab);
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  });
};

// ───────────────────────── ১) MCQ: স্টেম + অপশন এডিট ─────────────────────────
{
  await setMode('EXAM_MCQ');
  const md = '১. কম্পিউটারের মস্তিষ্ক বলা হয় কোনটিকে?\nক. হার্ডডিস্ক\nখ. র‍্যাম\nগ. মাইক্রোপ্রসেসর\nঘ. মাদারবোর্ড\n\n২. নিচের কোনটি ইনপুট ডিভাইস?\nক. মাউস\nখ. প্রিন্টার\nগ. মনিটর\nঘ. স্পিকার\n';
  await page.fill('#input-text', md);
  await page.waitForTimeout(1600);
  const items = await page.evaluate(() => document.querySelectorAll('#preview-container .mcq-q-item').length);
  T('MCQ: প্রিভিউতে ২টি mcq-q-item এসেছে', items === 2, items);

  await page.click('#btn-toggle-edit');
  await page.waitForTimeout(400);
  const edited = await page.evaluate(() => {
    const it = document.querySelectorAll('#preview-container .mcq-q-item')[0];
    if (!it) return { ok: false, why: 'no-item' };
    // স্টেম
    let a = false;
    const w = document.createTreeWalker(it.querySelector('.mcq-text') || it, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) { if (n.nodeValue.includes('মস্তিষ্ক')) { n.nodeValue = n.nodeValue.replace('মস্তিষ্ক', 'সম্পাদিত-মস্তিষ্ক'); a = true; break; } }
    // ২য় অপশন — সরাসরি টেক্সট বদল
    const opts = it.querySelectorAll('.mcq-opt-text');
    let b = false;
    if (opts.length >= 2) { opts[1].textContent = 'সম্পাদিত-অপশন'; b = true; }
    return { ok: a && b, stem: a, opt: b, opts: opts.length };
  });
  T('MCQ: DOM-এ স্টেম+অপশন এডিট হয়েছে', edited.ok, edited);

  const rtf = await grabDownloadText('menu-export-doc-unicode');
  const d = rtfPlain(rtf);
  T('MCQ .doc: এডিট করা স্টেম ছাপা হয়', d.includes('সম্পাদিত-মস্তিষ্ক'));
  T('MCQ .doc: এডিট করা অপশন ছাপা হয়', d.includes('সম্পাদিত-অপশন'));
  T('MCQ .doc: পুরোনো স্টেম আর নেই', !d.includes('কম্পিউটারের মস্তিষ্ক বলা হয়'));
  T('MCQ .doc: ২য় প্রশ্ন অটুট', d.includes('ইনপুট ডিভাইস'));
  T('MCQ .doc: অ-সম্পাদিত অপশন অটুট', d.includes('মাইক্রোপ্রসেসর') && d.includes('স্পিকার'));

  const b64 = await grabDownloadBase64('menu-export-docx-unicode');
  const JSZip = createRequire(import.meta.url)(path.join(ROOT, 'js', 'jszip.min.js'));
  const zip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
  const xml = await zip.file('word/document.xml').async('string');
  // রান-ভাগ (হাইফেন ইত্যাদি) হলেও মিলবে — ট্যাগ/এনটিটি ছেঁটে প্লেইন টেক্সট
  const xmlPlain = xml.replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  T('MCQ .docx: এডিট করা স্টেম ছাপা হয়', xmlPlain.includes('সম্পাদিত') && xmlPlain.includes('মস্তিষ্ক'));
  T('MCQ .docx: এডিট করা অপশন ছাপা হয়', xmlPlain.includes('সম্পাদিত') && xmlPlain.includes('অপশন'));
  T('MCQ .docx: পুরোনো স্টেম আর নেই', !xmlPlain.includes('কম্পিউটারের মস্তিষ্ক বলা হয় কোনটিকে'));
  T('MCQ .docx: ২য় প্রশ্ন অটুট', xmlPlain.includes('ইনপুট ডিভাইস'));
}

// ───────────────────────── ২) CQ: উপ-প্রশ্নের মার্ক এডিট ─────────────────────────
{
  await setMode('EXAM_CQ');
  const md = '১. নিচের উদ্দীপকটি পড়ে উত্তর দাও:\nক. প্রথম প্রশ্ন? ২\nখ. দ্বিতীয় প্রশ্ন? ৪\n';
  await page.fill('#input-text', md);
  await page.waitForTimeout(1600);
  await page.evaluate(() => { if (!document.getElementById('preview-container').classList.contains('editing-active')) document.getElementById('btn-toggle-edit').click(); });
  await page.waitForTimeout(400);
  const ok = await page.evaluate(() => {
    const row = document.querySelector('#preview-container .cq-sub-row');
    if (!row) return { ok: false, why: 'no-row' };
    const mk = row.querySelector('.cq-sub-mark');
    if (!mk) return { ok: false, why: 'no-mark' };
    mk.textContent = '৭';
    return { ok: true };
  });
  T('CQ: DOM-এ মার্ক এডিট হয়েছে', ok.ok, ok);
  const rtf2 = await grabDownloadText('menu-export-doc-unicode');
  const d2 = rtfPlain(rtf2);
  T('CQ .doc: নতুন মার্ক (৭) ছাপা হয়', d2.includes('৭'));
  T('CQ .doc: ২য় উপ-প্রশ্ন অটুট', d2.includes('দ্বিতীয় প্রশ্ন'));
}

T('পেজ-এরর শূন্য', errs.length === 0, errs.slice(0, 3));

await browser.close();
server.close();
console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
