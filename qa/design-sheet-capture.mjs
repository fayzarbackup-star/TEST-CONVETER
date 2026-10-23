// Phase 4 QA: নকশা-পত্র প্রম্পটে (designSheet:true) গোল্ডেন-সেটের ফাইল ক্যাপচার — প্রতি ফাইলে ঠিক ১টি Gemini ডাক (maxContinuations=0, পুনঃচেষ্টা নেই)।
// চলমান অ্যাপ-সার্ভারে (localhost:3008)। চালানো: node qa/design-sheet-capture.mjs <inputDir> <outRoot> <ID> [<ID>…]   (ID = T01_jpeg …; ইনপুট ম্যানিফেস্ট থেকে)
// ফল: <outRoot>/<ID>/capture.json  { text, blocks, frontmatter, pages, issues, auditNote }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const [inDir, outRoot, ...ids] = process.argv.slice(2);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'eval/golden-set/manifest.json'), 'utf8'));
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 30 * 60 * 1000 });
let calls = 0;
try {
  for (const id of ids) {
    const item = manifest.items.find((i) => i.id === id);
    if (!item) { console.log('SKIP', id, 'ম্যানিফেস্টে নেই'); continue; }
    const out = path.join(outRoot, id);
    fs.mkdirSync(out, { recursive: true });
    const file = path.join(inDir, item.input);
    const page = await browser.newPage();
    page.setDefaultTimeout(30 * 60 * 1000);
    try {
      await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
      calls++;
      const r = await page.evaluate(async (b64, name) => {
        const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        const type = /\.jpe?g$/i.test(name) ? 'image/jpeg' : /\.png$/i.test(name) ? 'image/png' : 'application/pdf';
        await window.FayzarAiOcrEngine.handleFiles([new File([u], name, { type })]);
        const q = window.FayzarAiOcrEngine.state.filesQueue;
        const t0 = performance.now();
        const cap = await window.FayzarFaithfulCapture.run(q, { designSheet: true, maxContinuations: 0 });
        return { secs: Math.round((performance.now() - t0) / 1000), cap: JSON.stringify({ text: cap.text, blocks: cap.blocks, frontmatter: cap.frontmatter || null, pages: cap.pages, auditNote: cap.auditNote, issues: cap.issues, truncated: cap.truncated }) };
      }, fs.readFileSync(file).toString('base64'), path.basename(file));
      const c = JSON.parse(r.cap);
      if (!c.frontmatter) delete c.frontmatter;
      fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify(c));
      console.log(`OK ${id} blocks=${c.blocks.length} fm=${c.frontmatter ? 'yes' : 'NO'} secs=${r.secs}`);
    } catch (e) {
      console.log(`FAIL ${id} ${String(e && e.message || e).replace(/\s+/g, ' ').slice(0, 160)}`);
    } finally { await page.close().catch(() => {}); }
  }
} finally { await browser.close(); }
console.log('gemini-calls-attempted', calls);
