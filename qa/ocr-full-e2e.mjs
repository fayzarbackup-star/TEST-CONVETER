// QA: পূর্ণ বাস্তব পথ — আসল PDF → আসল Gemini OCR → চিত্র-ট্যাগ → কাটা → রিভিউ ("নিশ্চিত") → ডাউনলোড।
// চলমান অ্যাপ-সার্ভারে (START_SERVER.bat, ডিফল্ট http://localhost:3008) — নিজে কোনো সার্ভার চালায় না।
// চালানো: node qa/ocr-full-e2e.mjs "<pdf>" [outDir] [baseUrl] [formats=doc,bijoy_docx,unicode_docx]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const PDF = process.argv[2];
const OUT = path.resolve(process.argv[3] || 'qa/ocr-full-e2e-out');
const BASE = process.argv[4] || 'http://localhost:3008';
const FORMATS = (process.argv[5] || 'doc,bijoy_docx,unicode_docx').split(',');
fs.mkdirSync(OUT, { recursive: true });
const pdfB64 = fs.readFileSync(PDF).toString('base64');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(15 * 60 * 1000);
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  const cdp = await page.createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT });
  await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(async (b64, name) => {
    window.__toasts = [];
    const orig = window.showToastNotification;
    window.showToastNotification = function (m, t) { window.__toasts.push(t + ': ' + m); if (orig) return orig.apply(this, arguments); };
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    await window.FayzarAiOcrEngine.handleFiles([new File([u], name, { type: 'application/pdf' })]);
  }, pdfB64, path.basename(PDF));
  log('pages queued:', await page.evaluate(() => window.FayzarAiOcrEngine.state.filesQueue.length));

  log('OCR started (real Gemini)...');
  const t0 = Date.now();
  const ocr = await page.evaluate(async () => {
    let last = '';
    try {
      const res = await window.FayzarAiOcrEngine.startUnifiedOcr('none', (s, p) => { last = p + '% ' + s; }, () => {});
      const text = (res && res.unicode) || window.FayzarAiOcrEngine.state.unicodeText || '';
      const ta = document.getElementById('wizardPreviewContent') || document.getElementById('ai-ocr-output-unicode');
      if (ta) ta.value = text;
      return { ok: true, text, last };
    } catch (e) { return { ok: false, error: String(e && e.message || e), last }; }
  });
  log('OCR done in', Math.round((Date.now() - t0) / 1000) + 's', ocr.ok ? 'OK' : 'FAILED: ' + ocr.error);
  if (!ocr.ok) throw new Error('OCR failed: ' + ocr.error);
  fs.writeFileSync(path.join(OUT, 'ocr-text.md'), ocr.text);
  const tagInfo = await page.evaluate((t) => ({
    strict: window.FayzarFigureExtractor.parseTags(t).map((x) => ({ page: x.page, box: x.box, raw: x.raw })),
    loose: (t.match(/\[\[\s*FIG[^\n]*/gi) || []).length
  }), ocr.text);
  log('FIG tags parsed:', tagInfo.strict.length, '(raw tag lines:', tagInfo.loose + ')');

  const results = [];
  for (const fmt of FORMATS) {
    const before = new Set(fs.readdirSync(OUT));
    await page.evaluate((f) => { window.__dl = window.FayzarAiOcrEngine.downloadWordDocument(f).then(() => 'done', (e) => 'ERR ' + e.message); }, fmt);
    let review = null;
    try {
      const btn = await page.waitForFunction(() => [...document.querySelectorAll('button')].find((b) => /নিশ্চিত করে ডাউনলোড/.test(b.textContent)), { timeout: 120000 });
      review = await page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => /^চিত্র [০-৯]+ — পাতা/.test(d.textContent) && d.children.length === 0).map((d) => d.textContent));
      await page.screenshot({ path: path.join(OUT, 'review-' + fmt + '.png') });
      await btn.asElement().click();
    } catch (e) { review = 'NOT SHOWN (' + e.message.slice(0, 60) + ')'; }
    const dl = await page.evaluate(() => window.__dl);
    await new Promise((r) => setTimeout(r, 3000));
    results.push({ fmt, review, dl, files: fs.readdirSync(OUT).filter((f) => !before.has(f) && !/\.png$/.test(f)) });
    log(fmt, '→', JSON.stringify(results[results.length - 1]));
  }
  const toasts = await page.evaluate(() => window.__toasts);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ tagInfo, results, toasts, logs: logs.filter((l) => !/tailwind|404|DOM\]/.test(l)).slice(-80) }, null, 2));
  log('toasts:', toasts.filter((t) => /চিত্র|warning|error/i.test(t)).join(' | '));
} finally {
  await browser.close();
}
