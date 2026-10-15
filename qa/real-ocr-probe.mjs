// QA: আসল ফাইলে আসল OCR (Gemini) — কাঁচা আউটপুট সংরক্ষণ + শ্রেণিবিন্যাস কী দাঁড়ায় দেখা।
// চালানো (localhost:3008 চালু): node qa/real-ocr-probe.mjs <outDir> <case>...   case = name=path[#pages]  (pages: 3-4, 1-5 …)
// ফল: <outDir>/<name>.md (Gemini-র লেখা), <outDir>/summary.json (doc_type, classifier, promoteCombined, সময়)
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const [outDir, ...cases] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const summaryPath = path.join(outDir, 'summary.json');
const summary = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, 'utf8')) : {};

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 1200000 });
try {
  for (const c of cases) {
    const [name, rest] = c.split('=');
    const [file, pages] = rest.split('#');
    const page = await browser.newPage();
    const logs = [];
    page.on('pageerror', (e) => logs.push('ERR ' + e.message));
    await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.evaluate(() => window.FayzarSession && window.FayzarSession.clear());
    const t0 = Date.now();
    await (await page.$('#ocrFile')).uploadFile(path.resolve(file));
    await page.waitForFunction(() => document.querySelectorAll('#wsGrid .pg').length > 0, { timeout: 180000 });
    const res = await page.evaluate(async (pages) => {
      const E = window.FayzarAiOcrEngine;
      if (pages) {
        const [a, b] = pages.split('-').map(Number);
        E.state.filesQueue = E.state.filesQueue.filter((it, i) => (it.pdfPage || i + 1) >= a && (it.pdfPage || i + 1) <= (b || a));
      }
      const nPages = E.state.filesQueue.length;
      const r = await E.startUnifiedOcr('none', () => {}, null);
      const text = (r && r.unicode) || E.state.unicodeText || '';
      const fm = (text.match(/^---\s*[\r\n]([\s\S]*?)[\r\n]---/) || [])[1] || '';
      const C = window.DocClassifier;
      const cls = C.classify(text);
      const promoted = C.promoteCombined(cls.type, text);
      return { nPages, text, frontmatter: fm, classifier: cls.type, reason: cls.reason, promoted };
    }, pages || '');
    fs.writeFileSync(path.join(outDir, name + '.md'), res.text);
    summary[name] = { file, pages: pages || 'all', nPages: res.nPages, secs: Math.round((Date.now() - t0) / 1000), frontmatter: res.frontmatter, classifier: res.classifier, reason: res.reason, final: res.promoted, chars: res.text.length, errors: logs };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(name, JSON.stringify(summary[name]));
    await page.close();
  }
} finally { await browser.close(); }
