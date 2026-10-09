// QA: নতুন সাইট — index.html (আপলোড → ওয়ার্কস্পেস → রূপান্তর → ডাউনলোড), services.html (টুলস), samples.html।
// OCR-ধাপ: Gemini-ডাক (startUnifiedOcr) একটি নমুনা-লেখা দিয়ে বদলানো (লাইভ API নয়); বাকি সব আসল —
//   handleFiles, পাতা যোগ/বাদ, ইঞ্জিনের downloadWordDocument (doc / বিজয় / ইউনিকোড)।
// চালানো: node qa/home-app-e2e.mjs <outDir> <sample.docx>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const OUT = path.resolve(process.argv[2] || 'qa-home-e2e');
const DOCX = path.resolve(process.argv[3] || 'tests/fixtures/sample.docx');
const DL = path.join(OUT, 'downloads');
fs.mkdirSync(DL, { recursive: true });
for (const f of fs.readdirSync(DL)) fs.unlinkSync(path.join(DL, f));
const MD = fs.readFileSync('qa/samples/16-mcq-math-figure.md', 'utf8').replace(/\[\[FIG:[^\]]*\]\]\n?/g, '');
const IMG1 = path.resolve('assets/home/in-hand.jpg');
const IMG2 = path.resolve('assets/home/in-old.jpg');
const url = (f, extra = '') => pathToFileURL(path.resolve(f)).href + extra;

const results = [];
const ok = (name, cond, info) => { results.push({ name, ok: !!cond }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  → ' + info : '')); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitDownload(before, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const fresh = fs.readdirSync(DL).filter((f) => !f.endsWith('.crdownload') && !before.includes(f));
    if (fresh.length) { await sleep(300); return fresh.map((f) => [f, fs.statSync(path.join(DL, f)).size]); }
    await sleep(250);
  }
  return [];
}

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'], protocolTimeout: 600000 });
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
  const cdp = await page.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
  await page.setViewport({ width: 1440, height: 900 });

  // ===== index: আপলোড → ওয়ার্কস্পেস =====
  await page.goto(url('index.html'), { waitUntil: 'load', timeout: 120000 });
  await sleep(1200);
  ok('হোম লোড — ইঞ্জিন আছে, ওয়ার্কস্পেস লুকানো', await page.evaluate(() => !!(window.FayzarAiOcrEngine && window.FayzarFaithfulUI) && document.getElementById('panel-ai-ocr').hidden));
  ok('হোমে অতিরিক্ত অংশ নেই (সার্ভিস/টুলস/নমুনা)', await page.evaluate(() => !document.getElementById('services') && !document.getElementById('tools') && !document.getElementById('samples')));
  await page.screenshot({ path: path.join(OUT, '1-home.png') });

  await page.evaluate((md) => {
    const E = window.FayzarAiOcrEngine;
    E.startUnifiedOcr = async (fmt, onProgress) => {
      for (const p of [10, 40, 75, 100]) { onProgress && onProgress('নমুনা-প্রসেস ' + p + '%', p); await new Promise((r) => setTimeout(r, 400)); }
      E.state.unicodeText = md; E.state.isProcessing = false;
      return { unicode: md };
    };
  }, MD);
  await (await page.$('#ocrFile')).uploadFile(IMG1);
  await page.waitForFunction(() => !document.getElementById('panel-ai-ocr').hidden && document.querySelectorAll('#wsGrid .pg').length === 1, { timeout: 20000 });
  ok('আপলোডের পর ওয়ার্কস্পেস খোলে, হিরো লুকায়', await page.evaluate(() => document.getElementById('hero').hidden && document.body.classList.contains('ws-on')));
  // + দিয়ে আরও ফাইল
  await page.click('#wsAdd');
  await (await page.$('#ocrFile')).uploadFile(IMG2);
  await page.waitForFunction(() => document.querySelectorAll('#wsGrid .pg').length === 2, { timeout: 20000 });
  ok('+ দিয়ে ফাইল যোগ → ২ পাতা', (await page.$eval('#wsCount', (e) => e.textContent)) === '২');
  await page.screenshot({ path: path.join(OUT, '2-workspace.png') });
  // ✕ দিয়ে বাদ
  await page.evaluate(() => document.querySelectorAll('#wsGrid .pg-del')[1].click());
  await page.waitForFunction(() => document.querySelectorAll('#wsGrid .pg').length === 1);
  ok('✕ দিয়ে পাতা বাদ → ১ পাতা', (await page.evaluate(() => window.FayzarAiOcrEngine.state.filesQueue.length)) === 1);
  // হুবহু মোড বাছলে নির্দেশনা-ঘর লুকায়
  await page.click('input[name="ocrMode"][value="faithful"]');
  ok('হুবহু মোডে নির্দেশনা-ঘর লুকায়', await page.$eval('#ai-custom-directive-input', (e) => e.hidden));
  await page.click('input[name="ocrMode"][value="template"]');

  // রূপান্তর
  await page.click('#btnConvert');
  await sleep(500);
  ok('কনভার্ট → আলাদা প্রসেসিং-পাতা (ওয়ার্কস্পেস লুকানো)', await page.evaluate(() => !document.getElementById('wsProc').hidden && document.getElementById('panel-ai-ocr').hidden));
  await page.screenshot({ path: path.join(OUT, '2b-processing.png') });
  await page.waitForSelector('#wsResult:not([hidden])', { timeout: 30000 });
  ok('সম্পন্ন → ফলাফল-পাতা', await page.evaluate(() => document.getElementById('wsProc').hidden), await page.$eval('#doneMeta', (e) => e.textContent));
  await page.screenshot({ path: path.join(OUT, '3-done.png') });
  for (const [id, label] of [['wizardDlDocBtn', '.doc'], ['wizardDlDocxBtn', 'বিজয় .docx'], ['wizardDlUnicodeDocxBtn', 'ইউনিকোড .docx']]) {
    const before = fs.readdirSync(DL);
    await page.click('#' + id);
    const got = await waitDownload(before);
    ok('OCR ডাউনলোড ' + label, got.length && got[0][1] > 2000, got.map((g) => g.join(' ')).join(', '));
  }
  await page.click('#btnShowText');
  ok('লেখা দেখা ও ঠিক করা', await page.evaluate(() => !document.getElementById('wsText').hidden && document.getElementById('wizardPreviewContent').value.length > 100));
  await page.screenshot({ path: path.join(OUT, '4-text.png') });
  // ---- সমস্যা জানান → ZIP (ডায়াগনস্টিক খতিয়ান) ----
  await page.evaluate(() => {
    window.__zip = null;
    const c = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (/\.zip$/.test(this.download || '')) {
        fetch(this.href).then((r) => r.blob()).then((b) => window.JSZip.loadAsync(b)).then(async (z) => {
          const rep = JSON.parse(await z.file('report.json').async('string'));
          window.__zip = { files: Object.keys(z.files), rep };
        });
        return;
      }
      return c.call(this);
    };
  });
  await page.click('#btnReport1');
  await page.click('.rep-vote button[data-vote="bad"]');
  await page.click('input[name=repIssue][value=layout] + span');
  await page.type('#repComment', 'পরীক্ষামূলক মন্তব্য');
  await page.click('#repDownload');
  await page.waitForFunction(() => window.__zip, { timeout: 30000 });
  const zr = await page.evaluate(() => window.__zip);
  const ev = (zr.rep.run && zr.rep.run.events) || [];
  ok('সমস্যা জানান → ZIP: report.json, ocr.md, মূল ফাইল', zr.files.includes('report.json') && zr.files.includes('ocr.md') && zr.files.some((f) => f.startsWith('input/')), zr.files.join(', '));
  ok('রিপোর্টে মতামত ও খতিয়ান (অগ্রগতি, সফল, ডাউনলোড)', zr.rep.feedback.vote === 'bad' && zr.rep.feedback.issues.includes('layout') && zr.rep.run.result.ok === true && ev.some((e) => e.kind === 'progress') && zr.rep.run.downloads.length >= 3,
    'events ' + ev.length + ', downloads ' + zr.rep.run.downloads.length + ', ms ' + zr.rep.run.ms);
  await page.waitForFunction(() => document.getElementById('repModal').hidden, { timeout: 5000 }).catch(() => {});

  // ---- রিফ্রেশ: ফলাফল-পাতায় ----
  await sleep(600);
  await page.reload({ waitUntil: 'load' });
  await sleep(2000);
  ok('রিফ্রেশের পর ফলাফল-পাতা ফেরে (সেশন-ক্যাশ)', await page.evaluate(() => !document.getElementById('wsResult').hidden && document.getElementById('wizardPreviewContent').value.length > 100));
  {
    // হেডলেস Chrome রিলোডের পর একই ফাইল আবার ডিস্কে রাখে না — তাই ডাউনলোড-লিংক চাপা ও সফল-বার্তা যাচাই
    await page.evaluate(() => { window.__dl = []; const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dl.push(this.download); return c.call(this); }; });
    await page.click('#wizardDlDocBtn');
    await sleep(4000);
    const names = await page.evaluate(() => window.__dl);
    ok('রিফ্রেশের পরেও .doc ডাউনলোড চালু হয়', names.some((n) => /\.doc$/.test(n)), names.join(', '));
  }
  await page.click('#btnBack2');
  ok('← ফিরে যান → ওয়ার্কস্পেস (পাতা অক্ষত)', await page.evaluate(() => !document.getElementById('panel-ai-ocr').hidden && document.querySelectorAll('#wsGrid .pg').length === 1));
  // ---- রিফ্রেশ: প্রসেসিং চলাকালে ----
  await page.evaluate(() => {
    const E = window.FayzarAiOcrEngine;
    E.startUnifiedOcr = async (fmt, onProgress) => { onProgress && onProgress('ধীর নমুনা-প্রসেস', 20); await new Promise((r) => setTimeout(r, 15000)); return { unicode: 'x' }; };
  });
  await page.click('#btnConvert');
  await sleep(900);
  page.once('dialog', (d) => d.accept());
  await page.reload({ waitUntil: 'load' });
  await sleep(2000);
  ok('প্রসেসিং-এর মাঝে রিফ্রেশ → পাতাসহ ওয়ার্কস্পেস + বার্তা', await page.evaluate(() => !document.getElementById('panel-ai-ocr').hidden && document.querySelectorAll('#wsGrid .pg').length === 1 && /রিফ্রেশ/.test(document.getElementById('wsInfo').textContent)));
  await page.screenshot({ path: path.join(OUT, '4b-after-refresh.png') });
  // ---- মেনুর "হোম" (ওয়ার্কস্পেসে থাকা অবস্থায়) → জিজ্ঞাসা → হিরো; রিলোডেও হিরো (ক্যাশ মোছা) ----
  page.once('dialog', (d) => d.accept());
  await page.click('.fz-links a[href="index.html"]');
  await sleep(500);
  ok('মেনুর হোম → হিরো (নতুন শুরু)', await page.evaluate(() => !document.getElementById('hero').hidden && document.getElementById('panel-ai-ocr').hidden));
  await page.reload({ waitUntil: 'load' });
  await sleep(1800);
  ok('হোমে ফেরার পর রিলোডেও হিরো (পুরোনো কাজ ফেরে না)', await page.evaluate(() => !document.getElementById('hero').hidden));
  // ---- ফলাফল-পাতার কোণের "হোম · নতুন ফাইল" ----
  await page.evaluate(() => { const E = window.FayzarAiOcrEngine; E.startUnifiedOcr = async () => { E.state.unicodeText = '১. প্রশ্ন\nক. উত্তর'; return { unicode: E.state.unicodeText }; }; });
  await (await page.$('#ocrFile')).uploadFile(IMG1);
  await page.waitForFunction(() => document.querySelectorAll('#wsGrid .pg').length === 1, { timeout: 20000 });
  await page.click('#btnConvert');
  await page.waitForSelector('#wsResult:not([hidden])', { timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, '4c-result-home.png') });
  await page.click('#btnHome');
  await sleep(400);
  ok('ফলাফল-পাতার কোণের হোম-বোতাম → হিরো', await page.evaluate(() => !document.getElementById('hero').hidden && document.getElementById('wsResult').hidden));
  // ---- কনভার্ট-ইতিহাস ----
  await sleep(500);
  await page.reload({ waitUntil: 'load' });
  await sleep(1800);
  const histLabel = await page.$eval('.fz-links a.fz-hist', (e) => e.textContent);
  ok('রিলোডের পরেও মেনুতে ইতিহাস-সংখ্যা', /ইতিহাস \([০-৯]+\)/.test(histLabel), histLabel);
  await page.click('.fz-links a.fz-hist');
  await sleep(600);
  const rows = await page.$$eval('#histList .hist-row', (r) => r.map((x) => x.querySelector('b').textContent + ' | ' + x.querySelector('span').textContent));
  ok('ইতিহাস-প্যানেলে আগের রূপান্তর', rows.length >= 2, rows.join(' ; '));
  await page.screenshot({ path: path.join(OUT, '4d-history.png') });
  await page.evaluate(() => { window.__dl = []; const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dl.push(this.download); return c.call(this); }; });
  await page.click('#histList .hist-row .hist-acts .btn');
  await sleep(4000);
  const hdl = await page.evaluate(() => window.__dl);
  ok('ইতিহাস থেকে সরাসরি .doc ডাউনলোড', hdl.some((n) => /\.doc$/.test(n)), hdl.join(', '));
  await page.click('#histList .hist-row .hist-acts .btn-o');
  await sleep(600);
  ok('ইতিহাস → "খুলুন" → ফলাফল-পাতা (লেখাসহ)', await page.evaluate(() => !document.getElementById('wsResult').hidden && document.getElementById('histPanel').hidden && document.getElementById('wizardPreviewContent').value.length > 5));
  await page.click('#btnHome');
  await sleep(300);

  // মোবাইল ওয়ার্কস্পেস
  await page.setViewport({ width: 390, height: 844 });
  await (await page.$('#ocrFile')).uploadFile(IMG1);
  await page.waitForFunction(() => document.querySelectorAll('#wsGrid .pg').length === 1, { timeout: 20000 });
  ok('মোবাইল-ওয়ার্কস্পেসে পাশে-স্ক্রল নেই', await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0);
  await page.screenshot({ path: path.join(OUT, '5-mobile-ws.png'), fullPage: true });
  await page.setViewport({ width: 1440, height: 900 });

  // ===== services: টুলস =====
  await page.goto(url('services.html', '#tool-text'), { waitUntil: 'load' });
  await sleep(1000);
  await page.type('#txtUni', 'আমার সোনার বাংলা, আমি তোমায় ভালোবাসি।');
  await page.click('#btnU2B');
  const bij = await page.$eval('#txtBij', (e) => e.value);
  ok('ইউনিকোড → বিজয়', bij.length > 10 && !/[ঀ-৿]/.test(bij), bij);
  await page.click('[data-tab="tool-word"]');
  await (await page.$('#wordFile')).uploadFile(DOCX);
  await page.click('#btnWord');
  await page.waitForSelector('#wordOut:not([hidden])', { timeout: 120000 }).catch(() => {});
  const nWord = (await page.$$('#wordOut button')).length;
  for (let i = 0; i < nWord; i++) {
    const before = fs.readdirSync(DL);
    await page.click(`#wordOut button:nth-child(${i + 1})`);
    const got = await waitDownload(before);
    ok('Word → বিজয় ডাউনলোড ' + (i + 1), got.length && got[0][1] > 2000, got.map((g) => g.join(' ')).join(', '));
  }
  await page.click('[data-tab="tool-doc"]');
  await (await page.$('#docFile')).uploadFile(DOCX);
  await page.click('#btnDoc');
  await page.waitForSelector('#docOut:not([hidden])', { timeout: 120000 }).catch(() => {});
  {
    const before = fs.readdirSync(DL);
    if (await page.$('#docOut button')) await page.click('#docOut button');
    const got = await waitDownload(before);
    ok('DOCX → DOC ডাউনলোড', got.length && got[0][1] > 2000, got.map((g) => g.join(' ')).join(', '));
  }
  await page.click('[data-tab="tool-md"]');
  await page.$eval('#mdText', (e, v) => { e.value = v; }, MD);
  {
    const before = fs.readdirSync(DL);
    await page.click('[data-md="doc"]');
    const got = await waitDownload(before, 120000);
    ok('MD → Word (.doc)', got.length && got[0][1] > 2000, got.map((g) => g.join(' ')).join(', '));
  }
  await page.screenshot({ path: path.join(OUT, '6-services.png'), fullPage: true });

  // ===== samples =====
  await page.goto(url('samples.html'), { waitUntil: 'load' });
  await sleep(600);
  ok('নমুনা-পাতা: ধাপ, আগে/পরে, গ্যালারি', await page.evaluate(() => !!(document.getElementById('how') && document.getElementById('samples') && document.querySelector('.gallery'))));
  await page.screenshot({ path: path.join(OUT, '7-samples.png') });

  ok('পাতায় JS-ত্রুটি নেই', errs.length === 0, [...new Set(errs)].join(' | '));
} finally { await browser.close(); }
const fails = results.filter((r) => !r.ok).length;
console.log(`\nফল: ${results.length - fails} পাস, ${fails} ব্যর্থ`);
process.exit(fails ? 1 : 0);
