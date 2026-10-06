// QA: নতুন থিম — প্রতিটি পাতা লোড (JS-ত্রুটি), অভিন্ন হেডার/ফুটার আছে কি না, পাশে-স্ক্রল, স্ক্রিনশট;
// আর হোম → OCR ফাইল-হস্তান্তর (converter.html-এ ফাইল বাছাই → index.html?from=home → wizardFileInput-এ ফাইল)।
// চালানো: node qa/site-shell-check.mjs <outDir>   (সার্ভার লাগে না; file:// দিয়ে খোলে)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const OUT = path.resolve(process.argv[2] || 'qa-site-shell');
fs.mkdirSync(OUT, { recursive: true });
const PAGES = ['converter.html', 'index.html', 'doc-converter.html', 'docx-to-doc.html', 'layout-studio.html', 'studio.html'];
const url = (f) => pathToFileURL(path.resolve(f)).href;

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
try {
  const page = await browser.newPage();
  for (const f of PAGES) {
    const errs = [];
    const onErr = (e) => errs.push(e.message.split('\n')[0]);
    page.on('pageerror', onErr);
    const row = { page: f };
    for (const [w, h, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
      await page.setViewport({ width: w, height: h });
      await page.goto(url(f), { waitUntil: 'load', timeout: 120000 });
      await new Promise((r) => setTimeout(r, 800));
      const info = await page.evaluate(() => ({
        nav: !!document.querySelector('.fz-nav'), foot: !!document.querySelector('.fz-foot'),
        current: (document.querySelector('.fz-links a[aria-current="page"]') || {}).textContent || '',
        overflowX: document.documentElement.scrollWidth - innerWidth, title: document.title
      }));
      Object.assign(row, { title: info.title, nav: info.nav, foot: info.foot, current: info.current });
      row['overflow_' + tag] = info.overflowX;
      await page.screenshot({ path: path.join(OUT, `${f.replace('.html', '')}-${tag}.png`) });
    }
    page.off('pageerror', onErr);
    row.errors = [...new Set(errs)];
    console.log(JSON.stringify(row));
  }

  // হোম → OCR হস্তান্তর
  const png = path.join(OUT, '_handoff.png');
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64'));
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(url('converter.html'), { waitUntil: 'load' });
  const input = await page.$('#file');
  await input.uploadFile(png);
  await page.waitForSelector('#dropDone:not([hidden])', { timeout: 5000 });
  await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 120000 }), page.click('#go')]);
  await new Promise((r) => setTimeout(r, 2500));
  const got = await page.evaluate(() => {
    const i = document.getElementById('wizardFileInput');
    return { url: location.href.split('/').pop(), files: i && i.files ? Array.from(i.files).map((f) => f.name) : null };
  });
  console.log('handoff:', JSON.stringify(got));
  await page.screenshot({ path: path.join(OUT, 'handoff-index.png') });
} finally { await browser.close(); }
