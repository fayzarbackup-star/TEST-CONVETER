// QA: আসল বোতাম-পথ — OCR-লেখা (চিত্র-ট্যাগসহ) → downloadWordDocument → রিভিউ স্ক্রিন → "নিশ্চিত" → ডাউনলোড।
// Gemini ছাড়া; আসল PDF পাতা থেকে কাটা। চালানো: node qa/figure-ui-e2e.mjs "<pdf>" [outDir] [format=doc|bijoy_docx|unicode_docx] [textFile]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PDF = process.argv[2];
const OUT = path.resolve(process.argv[3] || path.join(ROOT, 'qa', 'figure-e2e-out'));
const FORMAT = process.argv[4] || 'doc';
fs.mkdirSync(OUT, { recursive: true });
const TEXT = process.argv[5] ? fs.readFileSync(process.argv[5], 'utf8') : [
  '---', 'doc_type: EXAM_MCQ', '---',
  'বহুনির্বাচনি প্রশ্ন',
  '২১। [[FIG: p=23; box=15,290,90,410]]',
  'চিত্রে, OA = 4 সে.মি.; OM = 3 সে.মি. হলে, AB = কত সে.মি.?',
  '(ক) $\\sqrt{7}$ (খ) $2\\sqrt{7}$ (গ) 5 (ঘ) 10',
  '২২। চিত্রে O বৃত্তের কেন্দ্র হলে CD এর দৈর্ঘ্য কত সে.মি.? [[FIG: p=23; box=255,280,350,435]]',
  '(ক) ৪ সে.মি. (খ) ৬ সে.মি. (গ) ৮ সে.মি. (ঘ) ১০ সে.মি.',
  '২৩।',
  '[[FIG:p=23;box=[445,270,540,410]]]',
  'OM = 6 সে.মি., AB = 16 সে.মি. হলে, OA এর দৈর্ঘ্য কত?',
  '(ক) ১০ সে.মি. (খ) ১৪ সে.মি. (গ) ৯৬ সে.মি. (ঘ) ১০০ সে.মি.',
  '২৪। চিত্রে O কেন্দ্র এবং $\\angle AOB = 100^\\circ$ হলে $\\angle OAB$ = কত? [[FIG: p=23; box=645,265,735,390]]',
  '(ক) 80° (খ) 60° (গ) 50° (ঘ) 40°',
  '২৫। চিত্রে AB এর দৈর্ঘ্য কত সে.মি.? [[FIG: p=23; box=820,250,910,385]]',
  '(ক) ৮ সে.মি. (খ) ১২ সে.মি. (গ) ১৬ সে.মি. (ঘ) ২০ সে.মি.',
].join('\n');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/__source.pdf') { res.writeHead(200, { 'Content-Type': 'application/pdf' }); fs.createReadStream(PDF).pipe(res); return; }
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  const cdp = await page.createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(async (TEXT) => {
    window.__toasts = [];
    const orig = window.showToastNotification;
    window.showToastNotification = function (m, t) { window.__toasts.push(t + ': ' + m); if (orig) return orig.apply(this, arguments); };
    const buf = await (await fetch('/__source.pdf')).arrayBuffer();
    await window.FayzarAiOcrEngine.handleFiles([new File([buf], 'class 8 math (1).pdf', { type: 'application/pdf' })]);
    const ta = document.getElementById('wizardPreviewContent') || document.getElementById('ai-ocr-output-unicode');
    ta.value = TEXT;
    window.FayzarAiOcrEngine.state.unicodeText = TEXT;
  }, TEXT);
  const before = new Set(fs.readdirSync(OUT));
  page.evaluate((f) => { window.__dl = window.FayzarAiOcrEngine.downloadWordDocument(f).then(() => 'done', (e) => 'ERR ' + e.message); }, FORMAT);
  let reviewSeen = false;
  try {
    const btn = await page.waitForFunction(() => [...document.querySelectorAll('button')].find((b) => /নিশ্চিত করে ডাউনলোড/.test(b.textContent)), { timeout: 90000 });
    reviewSeen = true;
    const cards = await page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => /^চিত্র [০-৯]+ — পাতা/.test(d.textContent) && d.children.length === 0).map((d) => d.textContent));
    await page.screenshot({ path: path.join(OUT, 'review-screen.png'), fullPage: false });
    console.log('review cards:', cards);
    await btn.asElement().click();
  } catch (e) { console.log('review screen NOT shown:', e.message); }
  const dl = await page.evaluate(async () => window.__dl);
  await new Promise((r) => setTimeout(r, 2500));
  const fresh = fs.readdirSync(OUT).filter((f) => !before.has(f));
  const toasts = await page.evaluate(() => window.__toasts);
  console.log(JSON.stringify({ reviewSeen, dl, downloaded: fresh, toasts }, null, 2));
  console.log('--- console errors/warns ---\n' + logs.filter((l) => /^(error|warn|PAGEERROR)/.test(l) && !/tailwind|404/.test(l)).slice(-20).join('\n'));
} finally {
  await browser.close();
  server.close();
}
