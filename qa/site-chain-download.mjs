// QA (Part-18.9): সাইটের আসল ডাউনলোড-শিকল — index.html-এ লেখা বসিয়ে ইঞ্জিনের downloadWordDocument
// (ইউনিকোড মাস্টার → DocxHandler u2b বিজয় .docx → DocxToDocConverter Word 2003 .doc)। Gemini লাগে না।
// ফলাফল-পাতার কলাম-বোতাম (#colPick) চাপার পথও পরীক্ষা হয়।
// চালানো: node qa/site-chain-download.mjs <outDir> <case=input.md>[;cols] ...
//   ফরম্যাট বদলাতে: $env:FMTS='bijoy_docx,doc,unicode_docx'
//   যেমন: node qa/site-chain-download.mjs out tests/fixtures/primary-class4-bangla.input.md "tests/fixtures/cq-short.input.md;1"
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const [outDir, ...cases] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'], protocolTimeout: 600000 });
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
  if (process.env.QA_CONSOLE) page.on('console', (m) => { if (/warn|error/.test(m.type())) console.log('[console.' + m.type() + ']', m.text().slice(0, 300)); });
  await page.goto(pathToFileURL(path.resolve('index.html')).href, { waitUntil: 'load', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => {
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
  for (const spec of cases) {
    const [file, cols] = spec.split(';');
    const text = fs.readFileSync(file, 'utf8');
    const tag = path.basename(file).replace(/\.input\.md$/, '') + (cols ? '-cols' + cols : '');
    await page.evaluate((t) => {
      const E = window.FayzarAiOcrEngine;
      E.state.unicodeText = t;
      const ta = document.getElementById('wizardPreviewContent');
      if (ta) ta.value = t;
      E.state.layoutColumns = 'auto';
    }, text);
    // QA: FORCE_TYPE=GENERAL → ক্লাসিফায়ারের ফল জোর করে (রুট তুলনার জন্য)
    if (process.env.FORCE_TYPE) await page.evaluate((t) => { const C = window.DocClassifier; if (C && !C.__orig) { C.__orig = C.classify; C.classify = function () { const r = C.__orig.apply(C, arguments) || {}; return Object.assign({}, r, { type: t }); }; } }, process.env.FORCE_TYPE);
    if (cols) await page.evaluate((v) => document.querySelector('#colPick button[data-cols="' + v + '"]').click(), cols);
    const chosen = await page.evaluate(() => window.FayzarAiOcrEngine.state.layoutColumns);
    for (const fmt of (process.env.FMTS || 'bijoy_docx,doc').split(',')) {
      const n0 = await page.evaluate(() => window.__dl.length);
      // QA: CLEAN=1 → ফলাফল-পাতার "ক্লিন" লেআউট (home-app cleanDownload-এর একই শিকল)
      if (process.env.CLEAN) await page.evaluate(async (f) => {
        const C = window.FayzarCleanComposer, X = window.FayzarExport;
        const body = C.strip(window.FayzarAiOcrEngine.state.unicodeText);
        const res = await X.produce(body, { format: f === 'doc' ? 'doc' : (f === 'bijoy_docx' ? 'docx-bijoy' : 'docx-unicode'), masterDocx: await C.renderDocx(body), pageSize: 'a4', margin: 'normal' });
        const a = document.createElement('a'); a.download = 'clean.' + (f === 'doc' ? 'doc' : 'docx'); a.href = URL.createObjectURL(res.blob); a.click();
      }, fmt);
      else await page.evaluate((f) => window.FayzarAiOcrEngine.downloadWordDocument(f), fmt);
      await page.waitForFunction((n) => window.__dl.length > n, { timeout: 180000 }, n0);
      const dl = await page.evaluate(() => window.__dl[window.__dl.length - 1]);
      const out = path.join(outDir, tag + '-' + fmt + path.extname(dl.name));
      fs.writeFileSync(out, Buffer.from(dl.b64, 'base64'));
      console.log(`${tag} [cols=${chosen}] ${fmt} → ${out} (${fs.statSync(out).size} bytes)`);
    }
  }
  if (errs.length) console.log('page errors:', errs.slice(0, 5).join(' | '));
} finally { await browser.close(); }
