// QA: হুবহু-লেআউট ক্যাপচার (ধাপ ১) আসল ফাইলে — চলমান অ্যাপ-সার্ভারে (localhost:3008 → Worker)।
// প্রতি পাতায় Gemini-ব্লক বক্স ↔ আসল কালি (১৫০ DPI): প্রান্ত-ভুল, কালি-কভারেজ; চালিয়ে-যাওয়া কতবার; সময়।
// চালানো: node qa/faithful-capture-live.mjs <outDir> <pdf>[::fromPage-toPage] ...
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const OUT = path.resolve(process.argv[2]);
const FILES = process.argv.slice(3).map((a) => { const [f, r] = a.split('::'); const [p0, p1] = (r || '').split('-').map(Number); return { file: f, from: p0 || 1, to: p1 || 0 }; });
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 30 * 60 * 1000 });
const summary = [];
try {
  for (const F of FILES) {
    const page = await browser.newPage();
    page.setDefaultTimeout(30 * 60 * 1000);
    await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
    if (process.env.MODEL) await page.evaluate((m) => { window.__MODEL = m; }, process.env.MODEL);
    const r = await page.evaluate(async (b64, name, from, to) => {
      const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      await window.FayzarAiOcrEngine.handleFiles([new File([u], name, { type: 'application/pdf' })]);
      const q = window.FayzarAiOcrEngine.state.filesQueue;
      const sel = q.slice(from - 1, to ? to : q.length);
      if (window.__MODEL) window.FayzarAiOcrEngine.state.selectedModel = window.__MODEL;
      const t0 = performance.now();
      let cap, err = null;
      try { cap = await window.FayzarFaithfulCapture.run(sel, {}); } catch (e) { err = String(e && e.message || e); }
      const secs = Math.round((performance.now() - t0) / 1000);
      if (!cap) return { err, secs };
      // ---- মাপ: প্রতি পাতায় কালি বনাম ব্লক ----
      const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      const pdf = await lib.getDocument({ data: u }).promise;
      const perPage = [];
      for (let pi = 0; pi < sel.length; pi++) {
        const pg = await pdf.getPage(sel[pi].pdfPage);
        const vp = pg.getViewport({ scale: 150 / 72 });
        const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        await pg.render({ canvasContext: g, viewport: vp }).promise;
        const W = c.width, H = c.height, d = g.getImageData(0, 0, W, H).data;
        const ink = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) if ((d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000 < 160) ink[i] = 1;
        const lab = new Int32Array(W * H).fill(-1), st = new Int32Array(W * H), comps = [];
        for (let s0 = 0; s0 < W * H; s0++) {
          if (!ink[s0] || lab[s0] >= 0) continue; const id = comps.length; let sp = 0; st[sp++] = s0; lab[s0] = id; let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
          while (sp) { const p = st[--sp]; const py = (p / W) | 0, px = p - py * W; n++; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
            for (let dy = -1; dy <= 1; dy++) { const ny = py + dy; if (ny < 0 || ny >= H) continue; for (let dx = -1; dx <= 1; dx++) { const nx = px + dx; if (nx < 0 || nx >= W) continue; const q2 = ny * W + nx; if (ink[q2] && lab[q2] < 0) { lab[q2] = id; st[sp++] = q2; } } } }
          comps.push({ x0, y0, x1, y1, n });
        }
        const big = comps.filter((cc) => cc.n >= 6);
        const blocks = cap.blocks.filter((b) => b.page === pi + 1 && b.box);
        const assigned = new Set(); const edges = [];
        for (const b of blocks) {
          const bx0 = b.box[1] / 1000 * W, by0 = b.box[0] / 1000 * H, bx1 = b.box[3] / 1000 * W, by1 = b.box[2] / 1000 * H;
          const mine = big.filter((cc) => { const cx = (cc.x0 + cc.x1) / 2, cy = (cc.y0 + cc.y1) / 2; return cx >= bx0 && cx <= bx1 && cy >= by0 && cy <= by1; });
          mine.forEach((cc) => assigned.add(cc));
          if (!mine.length) continue;
          const tx0 = Math.min(...mine.map((cc) => cc.x0)), ty0 = Math.min(...mine.map((cc) => cc.y0)), tx1 = Math.max(...mine.map((cc) => cc.x1)), ty1 = Math.max(...mine.map((cc) => cc.y1));
          edges.push(...[by0 - ty0, by1 - ty1, bx0 - tx0, bx1 - tx1].map((v) => Math.abs(v) * 72 / 150));
        }
        const inkA = big.filter((cc) => assigned.has(cc)).reduce((a, cc) => a + cc.n, 0), inkAll = big.reduce((a, cc) => a + cc.n, 0);
        edges.sort((a, b) => a - b);
        perPage.push({ page: pi + 1, blocks: blocks.length, coverage: inkAll ? Math.round(inkA / inkAll * 1000) / 10 : null, edgeMed: edges.length ? Math.round(edges[Math.floor(edges.length / 2)]) : null, edgeP90: edges.length ? Math.round(edges[Math.floor(edges.length * 0.9)]) : null });
      }
      return { secs, text: cap.text, continuations: cap.continuations, issues: cap.issues, nBlocks: cap.blocks.length, types: cap.blocks.reduce((a, b) => (a[b.type] = (a[b.type] || 0) + 1, a), {}), audit: cap.auditNote, perPage, pages: sel.length };
    }, fs.readFileSync(F.file).toString('base64'), path.basename(F.file), F.from, F.to);
    await page.close();
    const tag = path.basename(F.file).replace(/[^\w]+/g, '_');
    if (r.text) fs.writeFileSync(path.join(OUT, tag + '.faithful.txt'), r.text);
    const cov = (r.perPage || []).map((p) => p.coverage).filter((x) => x != null);
    const row = { file: path.basename(F.file), pages: r.pages, secs: r.secs, err: r.err, blocks: r.nBlocks, continuations: r.continuations,
      issues: (r.issues || []).map((i) => i.kind).reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {}),
      coverageMin: cov.length ? Math.min(...cov) : null, coverageAvg: cov.length ? Math.round(cov.reduce((a, b) => a + b, 0) / cov.length * 10) / 10 : null,
      edgeMedAvg: r.perPage ? Math.round(r.perPage.filter((p) => p.edgeMed != null).reduce((a, p) => a + p.edgeMed, 0) / Math.max(1, r.perPage.filter((p) => p.edgeMed != null).length)) : null,
      types: r.types, audit: r.audit && r.audit.slice(0, 120) };
    summary.push({ row, perPage: r.perPage });
    console.log(JSON.stringify(row));
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  }
} finally { await browser.close(); }
