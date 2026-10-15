// নির্ণয়: টেবিল-ব্লকে আড়াআড়ি রেখা কেন ধরা পড়ে না — প্রতি সারির সেরা টানা-কালি (বর্তমান নিয়ম) বনাম ±k সারি-সহনশীল পথ।
// চালানো (localhost:3008): node qa/golden/hline-probe.mjs <asis-id> <pageNo>
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
  const out = await page.evaluate(async (b64, name, from, to, cached, pg) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    await window.FayzarAiOcrEngine.handleFiles([new File([u], name, { type: 'application/pdf' })]);
    const q = window.FayzarAiOcrEngine.state.filesQueue.slice((from || 1) - 1, to || undefined);
    const cap = JSON.parse(cached); cap.blocks = window.FayzarLayoutTags.parse(cap.text).blocks;
    const G = window.FayzarPageGeometry, orig = G.blockMetrics, logs = [];
    let curPage = 0;
    G.blockMetrics = function (m, box, o) {
      const res = orig.apply(this, arguments);
      if (!(o && o.isTable && o.gridMask)) return res;
      const gm = o.gridMask, W = gm.W, ppt = o.pxPerPt;
      const x0 = Math.floor(box[1] / 1000 * W), x1 = Math.ceil(box[3] / 1000 * W), y0 = Math.floor(box[0] / 1000 * gm.H), y1 = Math.ceil(box[2] / 1000 * gm.H);
      const rows = [];
      for (let y = y0; y < y1; y++) {
        let run = 0, best = 0, miss = 0;
        for (let x = x0; x < x1; x++) { if (gm.mask[y * W + x]) { run += miss + 1; miss = 0; if (run > best) best = run; } else if (run && ++miss > 2) { run = 0; miss = 0; } }
        // মোট কালি (ফাঁক সহ) — ভাঙা রেখা হলেও বেশি
        let ink = 0; for (let x = x0; x < x1; x++) if (gm.mask[y * W + x] || gm.mask[(y - 1) * W + x] || gm.mask[(y + 1) * W + x]) ink++;
        // brokenHLinePositions-এর মাপ (বিস্তার%, ভরাট%)
        const at = (x, yy) => yy >= 0 && yy < gm.H && gm.mask[yy * W + x], off = Math.max(3, Math.round(2 * ppt)), maxMiss = Math.round(12 * ppt);
        let s0 = -1, last = -1, fill = 0, bs = 0, bf = 0;
        for (let x = x0; x < x1; x++) {
          const band = at(x, y - 1) || at(x, y) || at(x, y + 1);
          if (!(band && !at(x, y + off) && !at(x, y + off + 1))) continue;
          if (s0 < 0 || x - last > maxMiss) { s0 = x; fill = 0; }
          last = x; fill++; if (x - s0 + 1 > bs) { bs = x - s0 + 1; bf = fill; }
        }
        // ৩-সারি ফালির বড় ফাঁক (≥৬pt) — x pt-এ [শুরু, শেষ]
        const gaps = []; let gs = -1;
        for (let x = x0; x <= x1; x++) {
          const b = x < x1 && (at(x, y - 1) || at(x, y) || at(x, y + 1));
          if (!b) { if (gs < 0) gs = x; } else { if (gs >= 0 && x - gs >= 6 * ppt) gaps.push([Math.round(gs / ppt), Math.round(x / ppt)]); gs = -1; }
        }
        if (gs >= 0 && x1 - gs >= 6 * ppt) gaps.push([Math.round(gs / ppt), Math.round(x1 / ppt)]);
        rows.push({ y: Math.round(y / ppt * 10) / 10, best: Math.round(best / (x1 - x0) * 100), ink3: Math.round(ink / (x1 - x0) * 100), span: Math.round(bs / (x1 - x0) * 100), fill: bs ? Math.round(bf / bs * 100) : 0, gaps });
      }
      logs.push({ box, ppt, w: x1 - x0, grid: res.hasGrid, peaks: rows.filter((r) => r.ink3 >= 50 || r.best >= 30) });
      return res;
    };
    try { await window.FayzarFaithful.layout(cap, q, {}); } finally { G.blockMetrics = orig; }
    return logs;
  }, fs.readFileSync(PDF).toString('base64'), path.basename(PDF), from || 1, to || 0, cap, Number(PG) || 0);
  const fn = path.join(os.tmpdir(), `hline-${ID}.json`);
  fs.writeFileSync(fn, JSON.stringify(out, null, 1));
  out.slice(-6).forEach((l) => l.peaks.filter((r) => r.ink3 >= 60).slice(0, 6).forEach((r) => console.log(' y', r.y, 'gaps', JSON.stringify(r.gaps))));
  out.slice(-6).forEach((l) => console.log('box', l.box.join(','), 'grid', l.grid, 'w', l.w, 'peaks', l.peaks.length, JSON.stringify(l.peaks.slice(0, 14).map((r) => [r.y, r.best, r.ink3, r.span, r.fill]))));
  console.log('full:', fn);
} finally { await browser.close(); }

