// ধাপ ০(ক): লেখা-ব্লকে Gemini-র বক্স কতটা নির্ভুল — একটি পাতা → পরীক্ষামূলক লেআউট-ট্যাগ প্রম্পট → আসল কালির সাথে মাপ।
// চলমান অ্যাপ-সার্ভারে (localhost:3008, Worker-এর অনুমোদিত origin)। চালানো:
//   node qa/phase0/gemini-layout-probe.mjs "<pdf>" <pageNo> <outDir> [label]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const PDF = process.argv[2], PAGE = parseInt(process.argv[3] || '1', 10), OUT = path.resolve(process.argv[4] || 'qa/phase0/out'), LABEL = process.argv[5] || path.basename(PDF) + '-p' + PAGE;
fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(new URL('../../js/ai-ocr-engine.js', import.meta.url), 'utf8');
const WORKER = /FUNCTIONS_URL:\s*'([^']+)'/.exec(src)[1];
const TOKEN = process.env.FAYZAR_PROXY_TOKEN || /PROXY_TOKEN:[\s\S]{0,400}?\|\|\s*['"]([A-Za-z0-9_\-.]{20,})['"]/.exec(src)[1];

const PROMPT = `You are an expert document layout analyst and Bengali/English OCR transcriber.
Transcribe this page COMPLETELY and EXACTLY as printed (no omissions, no summaries, no corrections, keep the original language and numerals).
Split the page into layout BLOCKS in natural reading order. Before EACH block write ONE tag on its own line:
[[B:t=<type>;box=<ymin>,<xmin>,<ymax>,<xmax>;al=<l|c|r|j>]]
- type: title | heading | paragraph | list_item | question | option_row | table | figure | caption | header | footer | page_number | label_value | signature | other
- box: tight bounding box of the WHOLE block (all its lines) in normalized 0-1000 coordinates of this page image.
- al: alignment of the block's lines (left, center, right, justified).
- After the tag write the block text exactly, keeping the printed line breaks of the block. For a table write rows as lines with cells separated by " | ". For a figure write nothing after the tag.
- Every printed character on the page must belong to exactly one block. Blocks must not overlap unless physically nested.
Before answering, silently re-check every block box and text against the image once more. Output only the tags and text, nothing else.`;

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 15 * 60 * 1000 });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  if (process.env.INCLUDE_THOUGHTS) await page.evaluate(() => { window.__INCLUDE_THOUGHTS = true; });
  const res = await page.evaluate(async (b64, pageNo, PROMPT, WORKER, TOKEN) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
    if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
    const pdf = await lib.getDocument({ data: u }).promise;
    const pg = await pdf.getPage(pageNo);
    const base = pg.getViewport({ scale: 1 });
    const draw = async (scale) => { const vp = pg.getViewport({ scale }); const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); await pg.render({ canvasContext: g, viewport: vp }).promise; return c; };
    // Gemini-কে যে ছবি (প্রোডাকশনের মতো ~২০৪৮px)
    const sendScale = Math.min(2048 / base.width, 2048 / base.height, 2);
    const sendC = await draw(sendScale);
    const jpeg = sendC.toDataURL('image/jpeg', 0.92).split(',')[1];
    // মাপার জন্য ১৫০ DPI
    const measC = await draw(150 / 72);
    const t0 = performance.now();
    const r = await fetch(WORKER, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
      body: JSON.stringify({ models: ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.6-flash'], payload: {
        system_instruction: { parts: [{ text: PROMPT }] },
        contents: [{ parts: [{ inlineData: { mimeType: 'image/jpeg', data: jpeg } }] }],
        generationConfig: Object.assign({ temperature: 0.1, maxOutputTokens: 65536 }, window.__INCLUDE_THOUGHTS ? { thinkingConfig: { includeThoughts: true } } : {}) } }) });
    const raw = await r.text(); window.__RAW = raw;
    let text = '', fail = null, usage = null, finish = null;
    for (const l of raw.split('\n')) { if (!l.startsWith('data:')) continue; try { const j = JSON.parse(l.slice(5)); if (j.candidates) { const parts = j.candidates[0].content?.parts || []; if (window.__firstAny == null) window.__firstAny = performance.now() - t0; text += parts.filter((p) => !p.thought).map((p) => p.text || '').join(''); window.__thoughtChunks = (window.__thoughtChunks || 0) + parts.filter((p) => p.thought).length; } if (j.usageMetadata) usage = j.usageMetadata; if (j.candidates && j.candidates[0] && j.candidates[0].finishReason) finish = j.candidates[0].finishReason; if (j.fayzar_status && j.fayzar_status.event === 'failed') fail = j.fayzar_status.body; } catch (e) {} }
    const secs = Math.round((performance.now() - t0) / 1000);
    // ব্লক পার্স
    const blocks = [];
    const re = /\[\[\s*B\s*:([^\]\n]*)\]\]/g; let m; const idx = [];
    while ((m = re.exec(text))) idx.push({ at: m.index, end: re.lastIndex, body: m[1] });
    idx.forEach((b, k) => {
      const bm = /box\s*=\s*\[?\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)/i.exec(b.body);
      const t = (/\bt\s*=\s*([a-z_]+)/i.exec(b.body) || /^\s*([a-z_]+)\s*[;,]/i.exec(b.body) || [])[1] || '?';
      const al = (/al\s*=\s*([lcrj])/i.exec(b.body) || [])[1] || '?';
      const body = text.slice(b.end, k + 1 < idx.length ? idx[k + 1].at : text.length).trim();
      if (bm) blocks.push({ t, al, box: bm.slice(1, 5).map(Number), chars: body.length, text: body.slice(0, 60) });
    });
    // কালি-মানচিত্র (১৫০ DPI)
    const W = measC.width, H = measC.height, d = measC.getContext('2d').getImageData(0, 0, W, H).data;
    const ink = new Uint8Array(W * H); let total = 0;
    for (let i = 0; i < W * H; i++) { const L = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000; if (L < 160) { ink[i] = 1; total++; } }
    // সংযুক্ত খণ্ড (একবার) — প্রতিটি খণ্ডের bbox ও পিক্সেল
    const lab = new Int32Array(W * H).fill(-1); const comps = []; const st = new Int32Array(W * H);
    for (let s0 = 0; s0 < W * H; s0++) { if (!ink[s0] || lab[s0] >= 0) continue; const id = comps.length; let sp = 0; st[sp++] = s0; lab[s0] = id; let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
      while (sp) { const p = st[--sp]; const py = (p / W) | 0, px = p - py * W; n++; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        for (let dy = -1; dy <= 1; dy++) { const ny = py + dy; if (ny < 0 || ny >= H) continue; for (let dx = -1; dx <= 1; dx++) { const nx = px + dx; if (nx < 0 || nx >= W) continue; const q = ny * W + nx; if (ink[q] && lab[q] < 0) { lab[q] = id; st[sp++] = q; } } } }
      comps.push({ x0, y0, x1, y1, n }); }
    const big = comps.filter((c) => c.n >= 6);
    const pt = 72 / 150; // ১ পিক্সেল = কত পয়েন্ট
    const assigned = new Set();
    const metrics = blocks.map((b) => {
      const bx0 = b.box[1] / 1000 * W, by0 = b.box[0] / 1000 * H, bx1 = b.box[3] / 1000 * W, by1 = b.box[2] / 1000 * H;
      // খণ্ডের কেন্দ্র বক্সের ভেতরে ⇒ এই ব্লকের
      const mine = big.filter((c) => { const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2; return cx >= bx0 && cx <= bx1 && cy >= by0 && cy <= by1; });
      mine.forEach((c) => assigned.add(c));
      if (!mine.length) return { empty: true };
      const tx0 = Math.min(...mine.map((c) => c.x0)), ty0 = Math.min(...mine.map((c) => c.y0)), tx1 = Math.max(...mine.map((c) => c.x1)), ty1 = Math.max(...mine.map((c) => c.y1));
      // কাটা খণ্ড: আংশিক ভেতরে, কেন্দ্র বাইরে
      const cut = big.filter((c) => !mine.includes(c) && c.x1 >= bx0 && c.x0 <= bx1 && c.y1 >= by0 && c.y0 <= by1).length;
      return { dTop: Math.round((by0 - ty0) * pt), dBottom: Math.round((by1 - ty1) * pt), dLeft: Math.round((bx0 - tx0) * pt), dRight: Math.round((bx1 - tx1) * pt), comps: mine.length, cut };
    });
    const unassignedInk = big.filter((c) => !assigned.has(c)).reduce((a, c) => a + c.n, 0);
    const assignedInk = big.filter((c) => assigned.has(c)).reduce((a, c) => a + c.n, 0);
    // ওভারলে
    const ov = document.createElement('canvas'); const sc = 1000 / W; ov.width = 1000; ov.height = Math.round(H * sc);
    const g = ov.getContext('2d'); g.drawImage(measC, 0, 0, ov.width, ov.height); g.lineWidth = 2;
    blocks.forEach((b, k) => { g.strokeStyle = ['#2563eb', '#dc2626', '#16a34a', '#9333ea'][k % 4]; const x = b.box[1] / 1000 * ov.width, y = b.box[0] / 1000 * ov.height; g.strokeRect(x, y, (b.box[3] - b.box[1]) / 1000 * ov.width, (b.box[2] - b.box[0]) / 1000 * ov.height); g.fillStyle = g.strokeStyle; g.font = '12px sans-serif'; g.fillText(String(k + 1) + ':' + b.t, x + 2, y + 12); });
    big.filter((c) => !assigned.has(c) && c.n > 30).forEach((c) => { g.strokeStyle = '#f59e0b'; g.setLineDash([3, 3]); g.strokeRect(c.x0 * sc, c.y0 * sc, (c.x1 - c.x0) * sc, (c.y1 - c.y0) * sc); g.setLineDash([]); });
    return { raw: window.__RAW, firstChunkSec: window.__firstAny != null ? Math.round(window.__firstAny / 1000) : null, thoughtChunks: window.__thoughtChunks || 0, finish, secs, fail, usage: usage && { in: usage.promptTokenCount, out: usage.candidatesTokenCount, think: usage.thoughtsTokenCount }, pagePt: [Math.round(base.width), Math.round(base.height)], text, blocks, metrics, inkCoverage: assignedInk / Math.max(1, assignedInk + unassignedInk), overlay: ov.toDataURL('image/png') };
  }, fs.readFileSync(PDF).toString('base64'), PAGE, PROMPT, WORKER, TOKEN);
  fs.writeFileSync(path.join(OUT, LABEL + '.overlay.png'), Buffer.from(res.overlay.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(OUT, LABEL + '.txt'), res.text || '');
  delete res.overlay; fs.writeFileSync(path.join(OUT, LABEL + '.raw.sse'), res.raw || ''); delete res.raw;
  const ok = res.metrics.filter((m) => !m.empty);
  const absEdges = ok.flatMap((m) => [m.dTop, m.dBottom, m.dLeft, m.dRight].map(Math.abs)).sort((a, b) => a - b);
  const pct = (q) => absEdges.length ? absEdges[Math.min(absEdges.length - 1, Math.floor(q * absEdges.length))] : null;
  const summary = { label: LABEL, firstChunkSec: res.firstChunkSec, thoughtChunks: res.thoughtChunks, finish: res.finish, secs: res.secs, fail: res.fail && JSON.stringify(res.fail).slice(0, 200), usage: res.usage, blocks: res.blocks.length, emptyBlocks: res.metrics.filter((m) => m.empty).length,
    edgeErrPt: { median: pct(0.5), p90: pct(0.9), max: absEdges[absEdges.length - 1] }, blocksCuttingOthers: ok.filter((m) => m.cut > 0).length,
    inkCoverage: Math.round(res.inkCoverage * 1000) / 10 + '%', types: Object.entries(res.blocks.reduce((a, b) => (a[b.t] = (a[b.t] || 0) + 1, a), {})).map(([k, v]) => k + ':' + v).join(' ') };
  fs.writeFileSync(path.join(OUT, LABEL + '.json'), JSON.stringify({ summary, blocks: res.blocks, metrics: res.metrics }, null, 2));
  console.log(JSON.stringify(summary));
} finally { await browser.close(); }
