// ব্র্যান্ড-ফাইল তৈরি: পূর্ণ লোগো (স্বচ্ছ PNG, ২× ও ৪×) + favicon PNG (১৬/৩২/১৮০/১৯২/৫১২)।
// উৎস: assets/brand/logo-lockup.html, assets/brand/favicon.svg, assets/brand/logo-mark.svg
// চালানো: node scripts/brand-export.mjs   (সার্ভার লাগে না)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const B = path.resolve('assets/brand');
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
try {
  const page = await browser.newPage();
  // ১) পূর্ণ লোগো
  for (const scale of [2, 4]) {
    await page.setViewport({ width: 1100, height: 400, deviceScaleFactor: scale });
    await page.goto(pathToFileURL(path.join(B, 'logo-lockup.html')).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 300));
    const el = await page.$('#lockup');
    await el.screenshot({ path: path.join(B, `logo-full@${scale}x.png`), omitBackground: true });
  }
  // ২) favicon ও আইকন PNG
  const html = (src, size) => `<!doctype html><html><body style="margin:0;background:transparent"><img src="${src}" width="${size}" height="${size}" style="display:block"></body></html>`;
  for (const [file, src, size] of [
    ['favicon-16.png', 'favicon.svg', 16], ['favicon-32.png', 'favicon.svg', 32], ['apple-touch-icon.png', 'favicon.svg', 180],
    ['icon-192.png', 'favicon.svg', 192], ['icon-512.png', 'favicon.svg', 512], ['logo-mark-512.png', 'logo-mark.svg', 512]
  ]) {
    const tmp = path.join(B, '_tmp.html');
    fs.writeFileSync(tmp, html(src, size));
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 150));
    await page.screenshot({ path: path.join(B, file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    fs.unlinkSync(tmp);
  }
  console.log(fs.readdirSync(B).map((f) => f + ' ' + fs.statSync(path.join(B, f)).size).join('\n'));
} finally { await browser.close(); }
