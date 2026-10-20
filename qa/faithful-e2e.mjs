// QA: হুবহু-লেআউট পূর্ণ পথ — আসল ফাইল → ক্যাপচার (ক্যাশ: <out>/capture.json) → মাপ+নকশা → মাস্টার/বিজয়/.doc।
// চলমান অ্যাপ-সার্ভারে (localhost:3008)। চালানো: node qa/faithful-e2e.mjs <pdf>[::from-to] <outDir> [--recapture]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

// ব্যাচ: node qa/faithful-e2e.mjs --jobs <jobs.json>  ([{ spec, out }], এক ব্রাউজারে সব; প্রতি কাজের শেষে "JOB ok|fail <out>")
const RECAP = process.argv.includes('--recapture');
const BATCH = process.argv[2] === '--jobs';
const JOBS = BATCH ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : [{ spec: process.argv[2], out: process.argv[3] }];
// FZ_E2E_FMTS=docx-unicode — শুধু এই ফরম্যাট (স্কোর-রানে বিজয়/.doc লাগে না)
const FMTS = (process.env.FZ_E2E_FMTS || 'docx-unicode,docx-bijoy,doc').split(',').filter(Boolean);

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 30 * 60 * 1000 });
try {
 for (const { spec, out: outArg } of JOBS) {
 const [PDF, range] = spec.split('::');
 const [from, to] = (range || '').split('-').map(Number);
 const OUT = path.resolve(outArg);
 fs.mkdirSync(OUT, { recursive: true });
 const capPath = path.join(OUT, 'capture.json');
 const cached = !RECAP && fs.existsSync(capPath) ? fs.readFileSync(capPath, 'utf8') : null;
 const page = await browser.newPage();
 try {
  page.setDefaultTimeout(30 * 60 * 1000);
  const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
  page.on('request', (q) => { if (q.method() === 'POST' && /workers\.dev|supabase/.test(q.url())) logs.push(`POST ${(Buffer.byteLength(q.postData() || '') / 1048576).toFixed(2)}MB`); });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 200)); });
  // নির্ণয়: FZ_OFF=MERGE,FONT,FRAC,SPECK,BROKEN,BAND,CUSTOM — সংশ্লিষ্ট নতুন নিয়ম বন্ধ (window.__FZ_OFF_*), বদলের কারণ খুঁজতে
  const offs = (process.env.FZ_OFF || '').split(',').filter(Boolean);
  if (offs.length) await page.evaluateOnNewDocument((l) => { l.forEach((k) => { window['__FZ_OFF_' + k] = true; }); }, offs);
  // FZ_ON=INK — পরীক্ষাধীন নিয়ম চালু (window.__FZ_ON_*)
  const ons = (process.env.FZ_ON || '').split(',').filter(Boolean);
  if (ons.length) await page.evaluateOnNewDocument((l) => { l.forEach((k) => { window['__FZ_ON_' + k] = true; }); }, ons);
  const tGo = Date.now();
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  const gotoSec = (Date.now() - tGo) / 1000, tEval = Date.now();
  // ব্যর্থ হলেও ব্রাউজার-লগ (প্রক্সি-স্ট্যাটাস ইত্যাদি) দেখাও
  const r = await page.evaluate(async (b64, name, from, to, cached, fmts) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const type = /\.jpe?g$/i.test(name) ? 'image/jpeg' : /\.png$/i.test(name) ? 'image/png' : 'application/pdf';
    await window.FayzarAiOcrEngine.handleFiles([new File([u], name, { type })]);
    const q = window.FayzarAiOcrEngine.state.filesQueue.slice((from || 1) - 1, to || undefined);
    const t0 = performance.now();
    const cap = cached ? JSON.parse(cached) : await window.FayzarFaithful.capture(q, {});
    // ক্যাশে পুরোনো পার্সারের ব্লক — বর্তমান ট্যাগ-পার্সারে আবার পড়া (পার্সার-উন্নতি বিনা খরচে স্কোরে আসে)
    if (cached && cap.text && window.FayzarLayoutTags) { const pp = window.FayzarLayoutTags.parse(cap.text); cap.blocks = pp.blocks; cap.issues = pp.issues; }
    const tCap = (performance.now() - t0) / 1000;
    const t1 = performance.now();
    window.__FZ_KEEP_MEASURES = true;
    const ir = await window.FayzarFaithful.layout(cap, q, {});
    const lastM = window.__FZ_LAST_MEASURES ? JSON.stringify(window.__FZ_LAST_MEASURES, (k, v) => (k === 'image' || k === 'mask' ? undefined : v)) : null;
    const tLay = (performance.now() - t1) / 1000;
    const enc = async (b) => { const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
    const files = {};
    for (const fmt of fmts) {
      try { const res = await window.FayzarFaithful.produce(ir, fmt); files[fmt] = await enc(res.blob); }
      catch (e) { files[fmt] = 'ERR ' + (e && e.stack || e); }
    }
    const irLite = JSON.parse(JSON.stringify(ir, (k, v) => (k === 'image' ? (v ? { pxW: v.pxW, pxH: v.pxH } : v) : v)));
    return { cap: JSON.stringify({ text: cap.text, blocks: cap.blocks, pages: cap.pages, auditNote: cap.auditNote, issues: cap.issues, continuations: cap.continuations, repairs: cap.repairs, verify: cap.verify, tableRepairs: cap.tableRepairs, tableVerify: cap.tableVerify }), lastM, tCap, tLay, ir: irLite, files, pages: q.length, verified: !!(cap.verify || cap.tableVerify), verify: cap.verify, tableVerify: cap.tableVerify };
  }, fs.readFileSync(PDF).toString('base64'), path.basename(PDF), from || 1, to || 0, cached, FMTS)
    .catch((e) => { console.log(logs.slice(-12).join('\n')); throw e; });
  // যাচাই-ধাপ এই রানে নতুন চলেছে (ক্যাশে repairs ছিল না) ⇒ ক্যাপচারে মেরামতসহ লেখা, পরের রানে Gemini লাগবে না
  if (!cached || r.verified) fs.writeFileSync(capPath, r.cap);
  if (r.verify) console.log('verify ' + JSON.stringify(r.verify));
  if (r.tableVerify) console.log('tableVerify ' + JSON.stringify(r.tableVerify));
  fs.writeFileSync(path.join(OUT, 'ir.json'), JSON.stringify(r.ir, null, 1));
  if (r.lastM) fs.writeFileSync(path.join(OUT, 'measures.json'), r.lastM);   // নির্ণয়: node-এ IR.build আবার চালাতে (qa/golden/ir-probe.mjs)
  for (const [fmt, b64] of Object.entries(r.files)) {
    if (String(b64).startsWith('ERR')) { console.log(fmt, b64.slice(0, 600)); continue; }
    fs.writeFileSync(path.join(OUT, fmt === 'doc' ? 'faithful_Word2003.doc' : `faithful_${fmt}.docx`), Buffer.from(b64, 'base64'));
  }
  const bands = r.ir.pages.reduce((a, p) => a + p.bands.length, 0), grids = r.ir.pages.reduce((a, p) => a + p.bands.filter((b) => b.kind === 'grid').length, 0);
  console.log(JSON.stringify({ pages: r.pages, gotoSec, evalSec: (Date.now() - tEval) / 1000, captureSec: Math.round(r.tCap), cachedCapture: !!cached, layoutSec: Math.round(r.tLay), irPages: r.ir.pages.length, bands, grids, warnings: r.ir.warnings.length }));
  if (logs.length) console.log(logs.slice(-12).join('\n'));
  if (BATCH) console.log(`JOB ok ${OUT}`);
 } catch (e) {
  if (!BATCH) throw e;
  console.log(`JOB fail ${OUT} ${String(e && e.message || e).replace(/\s+/g, ' ').slice(0, 200)}`);
 } finally { await page.close().catch(() => {}); }
 }
} finally { await browser.close(); }
