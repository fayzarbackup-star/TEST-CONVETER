// QA: হুবহু-লেআউট পূর্ণ পথ — আসল ফাইল → ক্যাপচার (ক্যাশ: <out>/capture.json) → মাপ+নকশা → মাস্টার/বিজয়/.doc।
// চলমান অ্যাপ-সার্ভারে (localhost:3008)। চালানো: node qa/faithful-e2e.mjs <pdf>[::from-to] <outDir> [--recapture]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const [spec, outArg] = process.argv.slice(2);
const RECAP = process.argv.includes('--recapture');
const [PDF, range] = spec.split('::');
const [from, to] = (range || '').split('-').map(Number);
const OUT = path.resolve(outArg);
fs.mkdirSync(OUT, { recursive: true });
const capPath = path.join(OUT, 'capture.json');
const cached = !RECAP && fs.existsSync(capPath) ? fs.readFileSync(capPath, 'utf8') : null;

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 30 * 60 * 1000 });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(30 * 60 * 1000);
  const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 200)); });
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  const r = await page.evaluate(async (b64, name, from, to, cached) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    await window.FayzarAiOcrEngine.handleFiles([new File([u], name, { type: 'application/pdf' })]);
    const q = window.FayzarAiOcrEngine.state.filesQueue.slice((from || 1) - 1, to || undefined);
    const t0 = performance.now();
    const cap = cached ? JSON.parse(cached) : await window.FayzarFaithful.capture(q, {});
    const tCap = (performance.now() - t0) / 1000;
    const t1 = performance.now();
    const ir = await window.FayzarFaithful.layout(cap, q, {});
    const tLay = (performance.now() - t1) / 1000;
    const enc = async (b) => { const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
    const files = {};
    for (const fmt of ['docx-unicode', 'docx-bijoy', 'doc']) {
      try { const res = await window.FayzarFaithful.produce(ir, fmt); files[fmt] = await enc(res.blob); }
      catch (e) { files[fmt] = 'ERR ' + (e && e.stack || e); }
    }
    const irLite = JSON.parse(JSON.stringify(ir, (k, v) => (k === 'image' ? (v ? { pxW: v.pxW, pxH: v.pxH } : v) : v)));
    return { cap: JSON.stringify({ text: cap.text, blocks: cap.blocks, pages: cap.pages, auditNote: cap.auditNote, issues: cap.issues, continuations: cap.continuations }), tCap, tLay, ir: irLite, files, pages: q.length };
  }, fs.readFileSync(PDF).toString('base64'), path.basename(PDF), from || 1, to || 0, cached);
  if (!cached) fs.writeFileSync(capPath, r.cap);
  fs.writeFileSync(path.join(OUT, 'ir.json'), JSON.stringify(r.ir, null, 1));
  for (const [fmt, b64] of Object.entries(r.files)) {
    if (String(b64).startsWith('ERR')) { console.log(fmt, b64.slice(0, 600)); continue; }
    fs.writeFileSync(path.join(OUT, fmt === 'doc' ? 'faithful_Word2003.doc' : `faithful_${fmt}.docx`), Buffer.from(b64, 'base64'));
  }
  const bands = r.ir.pages.reduce((a, p) => a + p.bands.length, 0), grids = r.ir.pages.reduce((a, p) => a + p.bands.filter((b) => b.kind === 'grid').length, 0);
  console.log(JSON.stringify({ pages: r.pages, captureSec: Math.round(r.tCap), cachedCapture: !!cached, layoutSec: Math.round(r.tLay), irPages: r.ir.pages.length, bands, grids, warnings: r.ir.warnings.length }));
  if (logs.length) console.log(logs.slice(-12).join('\n'));
} finally { await browser.close(); }
