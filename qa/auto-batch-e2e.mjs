// QA: স্বয়ংক্রিয় মোডের ব্যাচ — অনেক আসল ছবি/PDF → আসল Gemini OCR (startUnifiedOcr) → downloadWordDocument।
// ocr-full-e2e.mjs-এর মতো, তবে ছবি (jpeg/png) নেয় আর এক ফোল্ডারের সব ফাইল একটার পর একটা চালায়।
// চলমান অ্যাপ-সার্ভারে (ডিফল্ট http://localhost:3008)।
// চালানো: node qa/auto-batch-e2e.mjs <inDir> <outDir> [formats=unicode_docx,doc] [baseUrl]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const IN = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3] || 'qa/auto-batch-out');
const FORMATS = (process.argv[4] || 'unicode_docx,doc').split(',');
const BASE = process.argv[5] || 'http://localhost:3008';
const MIME = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
const files = fs.readdirSync(IN).filter((f) => MIME[path.extname(f).toLowerCase()]).sort((a, b) => (parseInt(a.match(/\d+/)) || 0) - (parseInt(b.match(/\d+/)) || 0) || a.localeCompare(b));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const summary = [];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const id = 'T' + String(parseInt(f.match(/\d+/)) || 0).padStart(2, '0') + '_' + ext.slice(1);
    const dir = path.join(OUT, id);
    fs.mkdirSync(dir, { recursive: true });
    const t0 = Date.now();
    const page = await browser.newPage();
    page.setDefaultTimeout(15 * 60 * 1000);
    const logs = [];
    page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
    try {
      const cdp = await page.createCDPSession();
      await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dir });
      await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 120000 });
      await page.evaluate(async (b64, name, type) => {
        const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        await window.FayzarAiOcrEngine.handleFiles([new File([u], name, { type })]);
      }, fs.readFileSync(path.join(IN, f)).toString('base64'), f, MIME[ext]);
      const ocr = await page.evaluate(async () => {
        try {
          const res = await window.FayzarAiOcrEngine.startUnifiedOcr('none', () => {}, () => {});
          const text = (res && res.unicode) || window.FayzarAiOcrEngine.state.unicodeText || '';
          const ta = document.getElementById('wizardPreviewContent') || document.getElementById('ai-ocr-output-unicode');
          if (ta) ta.value = text;
          return { ok: true, text };
        } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
      });
      if (!ocr.ok) throw new Error('OCR: ' + ocr.error);
      fs.writeFileSync(path.join(dir, 'ocr-text.md'), ocr.text);
      const docType = (ocr.text.match(/doc_type:\s*([A-Z_]+)/) || [])[1] || '?';
      const got = [];
      for (const fmt of FORMATS) {
        const before = new Set(fs.readdirSync(dir));
        await page.evaluate((x) => { window.__dl = window.FayzarAiOcrEngine.downloadWordDocument(x).then(() => 'done', (e) => 'ERR ' + e.message); }, fmt);
        // চিত্র থাকলে রিভিউ-পর্দা আসে — "নিশ্চিত" চাপো
        try {
          const btn = await page.waitForFunction(() => [...document.querySelectorAll('button')].find((b) => /নিশ্চিত করে ডাউনলোড/.test(b.textContent)), { timeout: 15000 });
          await btn.asElement().click();
        } catch {}
        const dl = await page.evaluate(() => window.__dl);
        await new Promise((r) => setTimeout(r, 2500));
        got.push(fmt + ':' + (dl === 'done' ? fs.readdirSync(dir).filter((x) => !before.has(x)).length : dl));
      }
      summary.push({ id, ok: true, docType, sec: Math.round((Date.now() - t0) / 1000), got });
      log('ok', id, docType, got.join(' '));
    } catch (e) {
      summary.push({ id, ok: false, error: String(e.message || e).slice(0, 200) });
      log('FAIL', id, String(e.message || e).slice(0, 120));
    } finally {
      if (logs.length) fs.writeFileSync(path.join(dir, 'errors.txt'), logs.join('\n'));
      await page.close();
      fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
    }
  }
} finally {
  await browser.close();
}
log('DONE', summary.filter((s) => s.ok).length + '/' + summary.length);
