// .doc (Word-HTML) → PNG রেন্ডার-প্রমাণ
import { createRequire } from 'module';
const require = createRequire('/home/user/qa/package.json');
const { chromium } = require('playwright');
const [src, out, sel] = process.argv.slice(2);
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 1000, height: 1300 } })).newPage();
await page.goto('file://' + src, { waitUntil: 'load' });
await page.waitForTimeout(700);
if (sel) { const el = await page.$(sel); if (el) { await el.screenshot({ path: out }); } else { await page.screenshot({ path: out }); } }
else await page.screenshot({ path: out });
const vis = await page.evaluate(() => document.body.innerText.slice(0, 300));
console.log(vis.replace(/\n{2,}/g, '\n'));
await b.close();
