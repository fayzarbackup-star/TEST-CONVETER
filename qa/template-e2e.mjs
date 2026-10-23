// QA (TEMPLATE_COMPOSE_PLAN T2): ছাঁচ-গ্যালারি — আসল পাতায় (localhost:3008), Gemini খরচ ছাড়া।
//  ১) গ্যালারি আঁকা হয়, ক্লিকে বাছাই বদলায়, হুবহু-মোডে লুকায়, পাতায় কোনো ত্রুটি নেই
//  ২) ফিক্সচার → enforce → সাইটের নিজের downloadWordDocument('unicode_docx') → .docx-এর পাতা-দিক (ছাঁচ অনুযায়ী)
// চালানো: node qa/template-e2e.mjs   (অ্যাপ-সার্ভার চালু থাকতে হবে)। সারাংশ ≤৩০ লাইন।
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const DL = fs.mkdtempSync(path.join(os.tmpdir(), 'fz-tpl-'));
const CASES = [
  ['primary-class4-bangla.input.md', '', 'landscape'],            // ছাঁচ ছাড়া: ৪র্থ শ্রেণি ⇒ প্রাথমিক (আগের আচরণ)
  ['primary-class4-bangla.input.md', 'exam-general', 'portrait'],
  ['real-ocr/class8sci.md', 'exam-primary', 'landscape'],
  ['real-ocr/hmathcq.md', 'exam-cq', 'landscape'],
  ['mcq-pure-28.input.md', 'exam-mcq', 'portrait'],
  ['cert-landscape.input.md', 'prottoyon-school', 'portrait'],    // ল্যান্ডস্কেপ-উৎসও ছাঁচে লম্বালম্বি
  ['prottoyon-up.input.md', 'cert-landscape', 'landscape'],
  ['cert-stub.input.md', 'cert-stub', 'landscape'],
  ['pad-notice.input.md', 'pad-notice', 'portrait'],
  ['pad-school-app.input.md', 'pad-letter', 'portrait'],
  ['app-job.input.md', 'app-job', 'portrait'],
  ['app-holding.input.md', 'app-general', 'portrait'],
  ['cash-memo-items.input.md', 'memo-2up', 'landscape'],
  ['cash-memo-blank.input.md', 'memo-3up', 'landscape'],
  ['cash-memo-items.input.md', 'memo-1up', 'portrait'],          // A5
  ['receipt.input.md', 'receipt', 'landscape'],
  ['voucher.input.md', 'voucher', 'portrait'],                    // A5
  ['cv-basic.input.md', 'cv-bangla', 'portrait'],
  ['cv-biodata.input.md', 'cv-biodata', 'portrait'],
  ['cv-english-shop.md', 'cv-english', 'portrait'],               // ধূসর অংশ-পটিও যাচাই (en-cv-layout)
  ['cv-english-shop.md', '', 'portrait'],                 // ছাঁচ ছাড়া: ২০২৬-১০-১১ থেকে স্বয়ংক্রিয়ভাবেও en-cv-layout (পটি আছে)
  ['cv-basic.input.md', '', 'portrait']                   // বাংলা সিভি ছাঁচ ছাড়া: cv-layout (পটি নেই)
];
const rows = [];
let bad = 0;
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 120000 });
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const cdp = await page.target().createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });

  // ১) গ্যালারি
  const g = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#tplGallery .tpl-card')];
    const pick = cards.find((c) => c.dataset.tpl === 'exam-mcq');
    if (pick) pick.click();
    const checked = cards.filter((c) => c.getAttribute('aria-checked') === 'true').map((c) => c.dataset.tpl);
    localStorage.setItem('FZ_ON_FAITHFUL', '1');
    if (window.FayzarHome) window.FayzarHome.applyMode();
    const hiddenInFaithful = document.getElementById('tplBox').hidden;
    localStorage.removeItem('FZ_ON_FAITHFUL');
    if (window.FayzarHome) window.FayzarHome.applyMode();
    document.querySelector('#tplGallery .tpl-card[data-tpl=""]').click();
    return { n: cards.length, svgs: document.querySelectorAll('#tplGallery svg').length, groups: document.querySelectorAll('#tplGallery .tpl-group').length,
      checked, hiddenInFaithful, note: document.getElementById('tplNote').textContent };
  });
  const [want, wantGroups] = await page.evaluate(() => [window.FayzarTemplateComposer.REGISTRY.length, window.FayzarTemplateComposer.GROUPS.length]);
  const gOk = g.n === want + 1 && g.svgs === want && g.groups === wantGroups && g.checked.join() === 'exam-mcq' && g.hiddenInFaithful;
  if (!gOk) bad++;
  rows.push(`${gOk ? 'OK ' : 'BAD'} gallery: cards ${g.n}, icons ${g.svgs}, groups ${g.groups}, click→${g.checked.join()}, faithful-hidden ${g.hiddenInFaithful}`);

  // ২) সাইটের ডাউনলোড-পথ
  for (const [f, tpl, want] of CASES) {
    const md = fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');
    fs.readdirSync(DL).forEach((x) => fs.unlinkSync(path.join(DL, x)));
    const info = await page.evaluate(async (md, tpl) => {
      const T = window.FayzarTemplateComposer;
      // চিত্র-ট্যাগ বাদ: নইলে চিত্র-রিভিউ পর্দা মানুষের অপেক্ষায় থেমে থাকে (এখানে শুধু লেআউট যাচাই)
      const noFig = md.replace(/\\?\[\\?\[\s*FIG\b[^\n]*?\\?\]\\?\]/gi, '');
      const text = tpl ? T.enforce(noFig, tpl).text : noFig;
      document.getElementById('wizardPreviewContent').value = text;
      window.FayzarAiOcrEngine.state.unicodeText = text;
      await window.FayzarAiOcrEngine.downloadWordDocument('unicode_docx');
      return { type: window.DocClassifier.classify(text).type };
    }, md, tpl);
    let file = null;
    for (let k = 0; k < 60 && !file; k++) { await new Promise((r) => setTimeout(r, 500)); file = fs.readdirSync(DL).find((x) => x.endsWith('.docx')); }
    if (!file) { bad++; rows.push(`BAD ${f} ${tpl || 'auto'}: no download`); continue; }
    const xml = await (await JSZip.loadAsync(fs.readFileSync(path.join(DL, file)))).file('word/document.xml').async('string');
    const got = /w:orient="landscape"/.test(xml) ? 'landscape' : 'portrait';
    const bars = /w:fill="737373"/.test(xml);
    // ইংরেজি সিভি: ছাঁচ cv-english বা ছাঁচ ছাড়া ⇒ পটি; বাংলা সিভি ⇒ পটি নয়
    const ok = got === want && (!/^cv-/.test(f) || bars === (/^cv-english/.test(f) && (tpl === 'cv-english' || !tpl)));
    if (!ok) bad++;
    rows.push(`${ok ? 'OK ' : 'BAD'} ${path.basename(f).padEnd(30)} ${(tpl || 'auto').padEnd(13)} ${info.type.padEnd(14)} ${got}`);
  }
  if (errs.length) { bad++; rows.push('PAGEERROR: ' + errs.slice(0, 3).join(' | ')); }
} finally { await browser.close(); fs.rmSync(DL, { recursive: true, force: true }); }
rows.push(bad ? `FAIL ${bad}` : 'ALL OK');
console.log(rows.slice(0, 30).join('\n'));
process.exit(bad ? 1 : 0);
