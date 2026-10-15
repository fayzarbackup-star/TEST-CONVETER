// নির্ণয়: একটি নমুনার টেবিল-ব্লকের Gemini-ব্লক + মাপ (blockMetrics) ফাইলে রাখা — তারপর node-এ সরাসরি FayzarLayoutIR.toItem চালিয়ে
// দ্রুত পরীক্ষা (ব্রাউজার ছাড়া)। চালানো (localhost:3008): node qa/golden/table-dump.mjs <asis-id> [pageNo]  → %TEMP%/tables-<id>.json
// পরীক্ষা: node qa/golden/table-dump.mjs --try <asis-id>  (সংরক্ষিত ফাইল থেকে toItem; সারি-সংখ্যা, সারি-উচ্চতা, প্রথম ঘর)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
if (args[0] === '--try') {
  const require = createRequire(import.meta.url);
  const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
  const T = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), `tables-${args[1]}.json`), 'utf8'));
  for (const t of T) {
    const it = IR.toItem(t.block, t.m);
    const arr = Array.isArray(it) ? it : [it];
    arr.forEach((x) => console.log(`p${t.block.page} rows ${x.rows.length} bands ${(t.m.hRulesPt || []).length - 1} border ${!x.borderless} rh ${JSON.stringify((x.rowHeightsPt || []).map(Math.round))} | ${x.rows.map((r) => String(r[0] || '').replace(/\n/g, '/').slice(0, 14)).join(' ¦ ')}`.slice(0, 300)));
  }
  process.exit(0);
}
const puppeteer = (await import('puppeteer')).default;
const [ID, PG] = args;
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/manifest.json'), 'utf8')).find((e) => e.id === ID);
const PDF = path.join(os.homedir(), 'Downloads', 'AS it IS', man.src);
const cap = fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis', ID, 'capture.json'), 'utf8');
const [from, to] = (man.range || '').split('-').map(Number);
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 10 * 60 * 1000 });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  const out = await page.evaluate(async (b64, name, from, to, cached, pg) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    await window.FayzarAiOcrEngine.handleFiles([new File([u], name, { type: 'application/pdf' })]);
    const q = window.FayzarAiOcrEngine.state.filesQueue.slice((from || 1) - 1, to || undefined);
    const cap = JSON.parse(cached); cap.blocks = window.FayzarLayoutTags.parse(cap.text).blocks;
    // toItem ভেতরে সরাসরি ডাকা হয় ⇒ blockMetrics ধরে, বক্স মিলিয়ে ব্লক (শেষ মাপটি — সংশোধিত বক্সসহ)
    const G = window.FayzarPageGeometry, orig = G.blockMetrics, seen = [];
    G.blockMetrics = function (m, box, o) { const res = orig.apply(this, arguments); if (o && o.isTable) seen.push({ box: box.slice(), res: JSON.parse(JSON.stringify(res)) }); return res; };
    try { await window.FayzarFaithful.layout(cap, q, {}); } finally { G.blockMetrics = orig; }
    const near = (a, b) => Math.abs(a[1] - b[1]) < 1 && Math.abs(a[3] - b[3]) < 1 && Math.abs(a[0] - b[0]) < 30;
    return cap.blocks.filter((b) => b.type === 'table' && b.box && (!pg || b.page === pg)).map((b) => {
      const ms = seen.filter((s) => near(s.box, b.box));
      return { block: b, m: ms.length ? ms[ms.length - 1].res : null };
    });
  }, fs.readFileSync(PDF).toString('base64'), path.basename(PDF), from || 1, to || 0, cap, Number(PG) || 0);
  const fn = path.join(os.tmpdir(), `tables-${ID}.json`);
  fs.writeFileSync(fn, JSON.stringify(out));
  console.log(`${out.length} টেবিল ⇒ ${fn}`);
} finally { await browser.close(); }
