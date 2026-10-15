// QA: হুবহু-মোডের ইন্টারফেস — আসল উইজার্ড: ফাইল-ইনপুট → মোড-কার্ড → রূপান্তর-বোতাম → ৩ ডাউনলোড-বোতাম।
// --cached <capture.json> দিলে Gemini-অনুরোধের বদলে আগের ক্যাপচার ফেরত দেয় (ইন্টারফেস-পরীক্ষা, খরচ নেই)।
// চালানো: node qa/faithful-ui-e2e.mjs <file.pdf> <outDir> [--cached capture.json]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const FILE = path.resolve(args[0]);
const OUT = path.resolve(args[1]);
const ci = args.indexOf('--cached');
const cached = ci > 0 ? fs.readFileSync(args[ci + 1], 'utf8') : null;
fs.mkdirSync(OUT, { recursive: true });

const fails = [];
const check = (ok, name) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) fails.push(name); };

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 30 * 60 * 1000 });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(30 * 60 * 1000);
  const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') logs.push('error: ' + m.text().slice(0, 200)); });
  await page.evaluateOnNewDocument(() => { try { localStorage.removeItem('fayzar_layout_mode'); } catch (e) { /* */ } });
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });

  // ডাউনলোড ধরা: <a download> ক্লিক ⇒ blob সংরক্ষণ
  await page.evaluate(() => {
    window.__dl = [];
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download && this.href.startsWith('blob:')) {
        const name = this.download;
        window.__dl.push(fetch(this.href).then((r) => r.arrayBuffer()).then((ab) => {
          const a = new Uint8Array(ab); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
          return { name, b64: btoa(s) };
        }));
        return;
      }
      return orig.call(this);
    };
  });

  const input = await page.$('#wizardFileInput');
  await input.uploadFile(FILE);
  await page.waitForSelector('#fzModeCards', { visible: true, timeout: 180000 });
  check(true, 'মোড-কার্ড দেখা যাচ্ছে');
  const def = await page.evaluate(() => window.FayzarFaithfulUI.isFaithful());
  check(def === false, 'ডিফল্ট মোড = আমাদের ফরম্যাট');
  // (কার্ড দেখা দেওয়ার পরপরই ক্লিক কখনো আগের রেন্ডারে পড়ে — একটু অপেক্ষা ও না হলে আবার)
  await new Promise((r) => setTimeout(r, 400));
  await page.click('[data-fz-mode="faithful"]');
  if (!(await page.evaluate(() => window.FayzarFaithfulUI.isFaithful()))) { await new Promise((r) => setTimeout(r, 600)); await page.click('[data-fz-mode="faithful"]'); }
  const st = await page.evaluate(() => ({ f: window.FayzarFaithfulUI.isFaithful(), ls: localStorage.getItem('fayzar_layout_mode'), pressed: document.querySelector('[data-fz-mode="faithful"]').getAttribute('aria-pressed') }));
  check(st.f && st.ls === 'faithful' && st.pressed === 'true', 'হুবহু কার্ড বাছাই + মনে রাখা');

  if (cached) {
    await page.evaluate((c) => { window.FayzarFaithful.capture = async () => JSON.parse(c); }, cached);
  }
  const t0 = Date.now();
  await page.click('#executeAiConversionBtn');
  await page.waitForFunction(() => { const r = document.getElementById('wizardResultCard'); return r && !r.classList.contains('hidden'); }, { timeout: 30 * 60 * 1000 });
  const sec = Math.round((Date.now() - t0) / 1000);
  const ui = await page.evaluate(() => ({
    studioHidden: document.getElementById('wizardStudioPreviewBtn').classList.contains('hidden'),
    mdHidden: document.getElementById('wizardDlMdBtn').classList.contains('hidden'),
    stats: (document.getElementById('wizardResultStatsBadge') || {}).textContent,
    name: (document.getElementById('wizardResultFileName') || {}).textContent,
    preview: ((document.getElementById('wizardPreviewContent') || {}).value || '').slice(0, 120),
    busy: window.FayzarAiOcrEngine.state.isProcessing,
  }));
  console.log(JSON.stringify(ui));
  fs.writeFileSync(path.join(OUT, 'ir.json'), await page.evaluate(() => JSON.stringify(window.FayzarFaithfulUI.last.ir, (k, v) => (k === 'image' ? (v ? { pxW: v.pxW, pxH: v.pxH } : v) : v), 1)));
  if (!cached) fs.writeFileSync(path.join(OUT, 'capture.json'), await page.evaluate(() => { const c = window.FayzarFaithfulUI.last.cap; return JSON.stringify({ text: c.text, blocks: c.blocks, pages: c.pages, auditNote: c.auditNote, issues: c.issues, continuations: c.continuations }); }));
  check(ui.studioHidden && ui.mdHidden, 'স্টুডিও ও MD বোতাম লুকানো');
  check(/হুবহু-লেআউট/.test(ui.stats || ''), 'ফলাফল-তথ্যে হুবহু');
  check(ui.preview.length > 20, 'প্রিভিউতে লেখা');
  check(!ui.busy, 'isProcessing ছাড়া হয়েছে');

  for (const id of ['wizardDlDocBtn', 'wizardDlDocxBtn', 'wizardDlUnicodeDocxBtn']) {
    await page.click('#' + id);
    await page.waitForFunction((n) => window.__dl.length >= n, { timeout: 300000 }, ['wizardDlDocBtn', 'wizardDlDocxBtn', 'wizardDlUnicodeDocxBtn'].indexOf(id) + 1);
  }
  const files = await page.evaluate(() => Promise.all(window.__dl));
  for (const f of files) {
    const buf = Buffer.from(f.b64, 'base64');
    fs.writeFileSync(path.join(OUT, f.name), buf);
    console.log(`  ${f.name}  ${buf.length} bytes`);
  }
  check(files.length === 3, '৩টি ফাইল ডাউনলোড');
  check(files.some((f) => /Word2003\.doc$/.test(f.name)) && files.some((f) => /Bijoy\.docx$/.test(f.name)) && files.some((f) => /Unicode\.docx$/.test(f.name)), 'ফাইল-নাম ঠিক');
  check(files.every((f) => f.b64.length > 2000), 'কোনো ফাইল ফাঁকা নয়');

  // ফিরে সাধারণ মোডে গেলে সাধারণ পথ (মোড-সুইচ কাজ করে)
  await page.evaluate(() => window.FayzarFaithfulUI.setMode('template'));
  check(await page.evaluate(() => !window.FayzarFaithfulUI.isFaithful() && localStorage.getItem('fayzar_layout_mode') === 'template'), 'আবার আমাদের ফরম্যাটে ফেরা');
  console.log(JSON.stringify({ convertSec: sec, cached: !!cached }));
  if (logs.length) console.log(logs.slice(-10).join('\n'));
} finally { await browser.close(); }
console.log(fails.length ? `\n${fails.length} FAIL` : '\nALL PASS');
process.exit(fails.length ? 1 : 0);
