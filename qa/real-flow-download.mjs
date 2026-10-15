// QA: ব্যবহারকারীর আসল পথ — নতুন index.html-এ ফাইল → "কনভার্ট করুন" (আসল Gemini) → ফলাফল-পাতা → .doc ডাউনলোড
// (চিত্র-রিভিউ স্ক্রিন স্বয়ংক্রিয় "সংরক্ষণ")। ডাউনলোড-ব্লব ধরে ফাইলে রাখে + কোন লেআউট হলো তা লেখা দেখে বলে।
// চালানো (localhost:3008 চালু): node qa/real-flow-download.mjs <file.pdf> <outDir> [pages e.g. 3-4]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const [file, outDir, pages] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 1200000 });
try {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => { if (/doc_type|docType|লেআউট|Facts|EXAM_/.test(m.text())) logs.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => logs.push('ERR ' + e.message));
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => {
    window.FayzarSession && window.FayzarSession.clear();
    // চিত্র-রিভিউ: স্বয়ংক্রিয় সংরক্ষণ (কাটা চিত্র যেমন আছে)
    if (window.FayzarFigureReview) window.FayzarFigureReview.open = async (items) => ({ figures: Object.fromEntries(items.filter((i) => i.fig).map((i) => [i.id, i.fig])) });
    // ডাউনলোড ধরা
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
  await (await page.$('#ocrFile')).uploadFile(path.resolve(file));
  await page.waitForFunction(() => document.querySelectorAll('#wsGrid .pg').length > 0, { timeout: 180000 });
  if (pages) {
    await page.evaluate((pages) => {
      const [a, b] = pages.split('-').map(Number);
      const E = window.FayzarAiOcrEngine;
      E.state.filesQueue = E.state.filesQueue.filter((it, i) => (it.pdfPage || i + 1) >= a && (it.pdfPage || i + 1) <= (b || a));
    }, pages);
  }
  await page.click('#btnConvert');
  await page.waitForSelector('#wsResult:not([hidden]), #procErr:not([hidden])', { timeout: 900000 });
  const fm = await page.evaluate(() => {
    const t = (window.FayzarAiOcrEngine.state.unicodeText || '');
    const c = window.DocClassifier.classify(t);
    return { frontmatter: (t.match(/^---\s*[\r\n]([\s\S]*?)[\r\n]---/) || [])[1], classified: c.type, reason: c.reason };
  });
  console.log('OCR:', JSON.stringify(fm));
  await page.click('#wizardDlDocBtn');
  await page.waitForFunction(() => window.__dl.length > 0, { timeout: 300000 });
  const dl = await page.evaluate(() => window.__dl[0]);
  const out = path.join(outDir, dl.name);
  fs.writeFileSync(out, Buffer.from(dl.b64, 'base64'));
  const txt = Buffer.from(dl.b64, 'base64').toString('latin1');
  console.log('saved', out, 'bytes', fs.statSync(out).size);
  console.log('logs:', logs.slice(-8).join(' | '));
} finally { await browser.close(); }
