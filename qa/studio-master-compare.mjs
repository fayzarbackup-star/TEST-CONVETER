// QA (WORK_PLAN F1): স্টুডিওর বিজয় .doc — পুরোনো পথ (RTF) বনাম একক মাস্টার-পথ (__FZ_ON_STUDIO_MASTER)
// studio.html-এ লেখা বসিয়ে "বিজয় .doc" বোতাম চাপে, দুই পথের ফাইল পাশাপাশি রাখে; Word-তুলনা: qa/golden/measure-doc.ps1
// চালানো: node qa/studio-master-compare.mjs <outDir> <input.md> ...
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const [outDir, ...cases] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'], protocolTimeout: 600000 });
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
  await page.goto(pathToFileURL(path.resolve('studio.html')).href, { waitUntil: 'load', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => {
    window.__dl = [];
    const c = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download && this.href.startsWith('blob:')) {
        const name = this.download;
        fetch(this.href).then((r) => r.arrayBuffer()).then((ab) => {
          const a = new Uint8Array(ab); let s = '';
          for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
          window.__dl.push({ name, b64: btoa(s) });
        });
        return;
      }
      return c.call(this);
    };
  });
  for (const file of cases) {
    const text = fs.readFileSync(file, 'utf8');
    const tag = path.basename(file).replace(/\.input\.md$|\.md$/, '');
    await page.evaluate((t) => { const ta = document.getElementById('input-text'); ta.value = t; ta.dispatchEvent(new Event('input', { bubbles: true })); }, text);
    await new Promise((r) => setTimeout(r, 2500));
    for (const mode of ['old', 'master']) {
      await page.evaluate((m) => { window.__FZ_ON_STUDIO_MASTER = m === 'master'; }, mode);
      const n0 = await page.evaluate(() => window.__dl.length);
      await page.evaluate(() => document.getElementById('btn-file-doc-bijoy').click());
      try {
        await page.waitForFunction((n) => window.__dl.length > n, { timeout: 180000 }, n0);
      } catch (e) { console.log(`${tag} ${mode}: ডাউনলোড আসেনি`); continue; }
      const dl = await page.evaluate(() => window.__dl[window.__dl.length - 1]);
      const out = path.join(outDir, `${tag}-${mode}.doc`);
      fs.writeFileSync(out, Buffer.from(dl.b64, 'base64'));
      console.log(`${tag} ${mode} → ${out} (${fs.statSync(out).size} bytes)`);
    }
  }
  if (errs.length) console.log('page errors:', errs.slice(0, 5).join(' | '));
} finally { await browser.close(); }
