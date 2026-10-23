// QA (পর্ব ১গ): ঘোরান / ২ পাতা ভাগ বোতাম — ইউআই ধাপ নিজেই চালিয়ে দেখে।
//   node qa/image-tools-e2e.mjs --ui                       // file://, Gemini লাগে না: বোতাম চেপে পাতার সংখ্যা/মাপ যাচাই
//   node qa/image-tools-e2e.mjs --real <outDir> <spec>...  // আসল OCR (চলমান সার্ভার, $env:BASE ডিফল্ট http://localhost:3008)
//   spec = ID=file1|file2:op,op,...   (op = rot | split; বোতাম প্রথম কার্ডে চাপা হয়)
//   যেমন: "T10=scratch/samples/new/2026-10-22/T- (10).jpeg:rot,rot,rot,split"
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const [mode, outDir, ...specs] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://localhost:3008';
const FORMATS = (process.env.FMTS || 'unicode_docx,doc').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'], protocolTimeout: 900000 });
let failed = 0;
const check = (n, ok, extra = '') => { if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (extra ? ' ' + extra : '')); };

async function openAndUpload(page, url, files) {
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await sleep(1200);
  const inp = await page.$('#ocrFile');
  await inp.uploadFile(...files.map((f) => path.resolve(f)));
  await page.waitForFunction((n) => document.querySelectorAll('#wsGrid .pg').length >= n, { timeout: 60000 }, files.length);
  await sleep(500);
}
const cards = (page) => page.$$eval('#wsGrid .pg img', (ims) => ims.map((i) => ({ w: i.naturalWidth, h: i.naturalHeight, name: i.alt })));
async function click(page, kind) {
  const n0 = (await cards(page)).length;
  await page.evaluate((k) => document.querySelector('#wsGrid .pg .pg-' + k).click(), kind);
  await sleep(kind === 'split' ? 900 : 600);
  await page.waitForFunction(() => !document.querySelector('#wsGrid.loading'), { timeout: 20000 });
  return n0;
}

try {
  if (mode === '--ui') {
    // ৫০০x৩৫০ দুই-পাতার স্প্রেড নমুনা বানিয়ে ইউআই-তে দিই
    const tmp = path.resolve('scratch/agent-out/_it-sample.png');
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    const probe = await browser.newPage();
    const b64 = await probe.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 600; c.height = 400; // w/h = 1.5 >= 1.15; h/(w/2) = 400/300 = 1.33 >= 1.1
      const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 400);
      x.fillStyle = '#111';
      // বাম পাতা লেখা (x = 40..250)
      for (let y = 60; y <= 340; y += 24) x.fillRect(40, y, 210, 8);
      // ডান পাতা লেখা (x = 350..560)
      for (let y = 60; y <= 340; y += 24) x.fillRect(350, y, 210, 8);
      return c.toDataURL('image/png').split(',')[1];
    });
    await probe.close();
    fs.writeFileSync(tmp, Buffer.from(b64, 'base64'));
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
    await openAndUpload(page, pathToFileURL(path.resolve('index.html')).href, [tmp]);
    const c = await cards(page);
    const btns = await page.$$eval('#wsGrid .pg .pg-tool', (b) => b.map((x) => x.textContent));
    check('no manual prep buttons', btns.length === 0, `buttons found: ${btns.join('|')}`);
    check('auto-prep split spread into 2 cards', c.length === 2, JSON.stringify(c));
    check('split names have _L and _R', c.length === 2 && /_L\.jpg$/.test(c[0].name) && /_R\.jpg$/.test(c[1].name), JSON.stringify(c));
    check('no page errors', errs.length === 0, errs.join(';'));
  } else if (mode === '--real') {
    fs.mkdirSync(outDir, { recursive: true });
    for (const spec of specs) {
      const m = spec.match(/^([^=]+)=(.*?)(?::([a-z,]*))?$/);
      const id = m[1], files = m[2].split('|'), ops = (m[3] || '').split(',').filter(Boolean);
      const dir = path.join(outDir, id); fs.mkdirSync(dir, { recursive: true });
      const page = await browser.newPage();
      page.setDefaultTimeout(15 * 60 * 1000);
      const cdp = await page.createCDPSession();
      await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: path.resolve(dir) });
      await openAndUpload(page, BASE + '/index.html', files);
      for (const op of ops) await click(page, op);
      const c = await cards(page);
      console.log(id, 'queue after ops:', JSON.stringify(c.map((x) => `${x.name} ${x.w}x${x.h}`)));
      fs.writeFileSync(path.join(dir, 'queue.json'), JSON.stringify(c, null, 1));
      const calls = await page.evaluate(() => { window.__gc = 0; const of = window.fetch; window.fetch = function (u, o) { if (/generativelanguage|\/ocr|gemini/i.test(String(u && u.url || u))) window.__gc++; return of.apply(this, arguments); }; });
      const ocr = await page.evaluate(async () => {
        try {
          const res = await window.FayzarAiOcrEngine.startUnifiedOcr('none', () => {}, () => {});
          return { ok: true, text: (res && res.unicode) || window.FayzarAiOcrEngine.state.unicodeText || '' };
        } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
      });
      if (!ocr.ok) { console.log(id, 'OCR FAIL', ocr.error); failed++; await page.close(); continue; }
      fs.writeFileSync(path.join(dir, 'ocr-text.md'), ocr.text);
      const gc = await page.evaluate(() => window.__gc);
      console.log(id, 'ocr chars', ocr.text.length, 'fetch-calls-seen', gc, 'docType', (ocr.text.match(/doc_type:\s*([A-Z_]+)/) || [])[1] || '?');
      for (const fmt of FORMATS) {
        await page.evaluate((x) => { window.__dl = window.FayzarAiOcrEngine.downloadWordDocument(x).then(() => 'done', (e) => 'ERR ' + e.message); }, fmt);
        try {
          const btn = await page.waitForFunction(() => [...document.querySelectorAll('button')].find((b) => /নিশ্চিত করে ডাউনলোড/.test(b.textContent)), { timeout: 15000 });
          await btn.asElement().click();
        } catch {}
        console.log(id, fmt, await page.evaluate(() => window.__dl));
        await sleep(2500);
      }
      await page.close();
    }
  }
} finally { await browser.close(); }
console.log(failed ? `FAILED ${failed}` : 'OK');
process.exit(failed ? 1 : 0);
