// নির্ণয়: হুবহু-মোডের একটি নমুনার টেবিল-ব্লকে মাপার ইঞ্জিন কী দেখে (কলাম-ফাঁক, খাড়া/আড়া রেখা, ঘরের ফন্ট) — Word ছাড়া।
// চালানো (localhost:3008): node qa/golden/table-diag.mjs <asis-id> [pageNo]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import puppeteer from 'puppeteer';

const [ID, PG] = process.argv.slice(2);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/manifest.json'), 'utf8')).find((e) => e.id === ID);
const PDF = path.join(os.homedir(), 'Downloads', 'AS it IS', man.src);
const cap = fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis', ID, 'capture.json'), 'utf8');
const [from, to] = (man.range || '').split('-').map(Number);
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 10 * 60 * 1000 });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  const r = await page.evaluate(async (b64, name, from, to, cached, pg) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    await window.FayzarAiOcrEngine.handleFiles([new File([u], name, { type: 'application/pdf' })]);
    const q = window.FayzarAiOcrEngine.state.filesQueue.slice((from || 1) - 1, to || undefined);
    const cap = JSON.parse(cached);
    const pp = window.FayzarLayoutTags.parse(cap.text); cap.blocks = pp.blocks;
    const G = window.FayzarPageGeometry, orig = G.blockMetrics, seen = [];
    G.blockMetrics = function (m, box, o) { const res = orig.apply(this, arguments); if (o && o.isTable) seen.push({ box, res }); return res; };
    let ir;
    try { ir = await window.FayzarFaithful.layout(cap, q, {}); } finally { G.blockMetrics = orig; }
    const tbls = [];
    ir.pages.forEach((p) => { if (pg && p.page !== pg) return; p.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => { if (it.kind === 'table') tbls.push({ page: p.page, rows: it.rows.length, nCols: Math.max(...it.rows.map((r) => r.length)), fontPt: it.fontPt, cellFontSrc: it.cellFontSrc, colFractions: it.colFractions, rect: it.rect }); }))); });
    const r1 = (v) => (Array.isArray(v) ? v.map(r1) : typeof v === 'number' ? Math.round(v * 10) / 10 : v);
    const boxes = [];
    ir.pages.forEach((p) => { if (pg && p.page !== pg) return; p.bands.forEach((b) => b.cells.forEach((c) => c.items.forEach((it) => { if (it.kind === 'table' && it.box) boxes.push(it.box); }))); });
    const near = (a, b) => a && b && Math.abs(a[1] - b[1]) < 1 && Math.abs(a[3] - b[3]) < 1 && Math.abs(a[0] - b[0]) < 30;
    const ms = seen.filter((s) => boxes.some((bx) => near(s.box, bx))).slice(-Math.max(1, boxes.length)).map((s) => ({ box: s.box, ink: r1(s.res.cellInkPt), gut: r1(s.res.colGuttersPt), hR: r1(s.res.hRulesPt), vR: r1(s.res.vRulesPt), tl: (s.res.textLinesPt || []).length, grid: s.res.hasGrid, rect: r1([s.res.rectPt.x, s.res.rectPt.y, s.res.rectPt.w, s.res.rectPt.h]) }));
    return { tbls: r1(tbls), ms };
  }, fs.readFileSync(PDF).toString('base64'), path.basename(PDF), from || 1, to || 0, cap, Number(PG) || 0);
  r.tbls.forEach((t) => console.log('TBL', JSON.stringify(t).slice(0, 400)));
  r.ms.forEach((m) => console.log('M', JSON.stringify(m).slice(0, 600)));
} finally { await browser.close(); }
