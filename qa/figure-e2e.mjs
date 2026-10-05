// QA: সোর্স-চিত্র পথের পূর্ণ যাচাই (Gemini ছাড়া) — আসল PDF → handleFiles → extract → FayzarExport।
// হেডলেস Chrome (puppeteer), এই স্ক্রিপ্টের ভেতরেই ক্ষণস্থায়ী স্ট্যাটিক সার্ভার (শেষে বন্ধ)।
// চালানো: node qa/figure-e2e.mjs "<pdf-path>" [outDir]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PDF = process.argv[2];
const OUT = process.argv[3] || path.join(ROOT, 'qa', 'figure-e2e-out');
fs.mkdirSync(OUT, { recursive: true });

const TEXT = [
  'বহুনির্বাচনি প্রশ্ন',
  '১৬। ৬ সে.মি. ব্যাসবিশিষ্ট বৃত্তাকার বাগানের পরিধি কত? [[FIG: p=23; box=15,290,90,410]]',
  '(ক) 36π সে.মি. (খ) 12π সে.মি. (গ) 9π সে.মি. (ঘ) 6π সে.মি.',
  '১৭। [[FIG: p=23; box=255,280,350,435]]',
  'চিত্রে, OA = 4 সে.মি.; OM = 3 সে.মি. হলে, AB = কত সে.মি.?',
  '(ক) 7 (খ) 2√7 (গ) 5 (ঘ) 10',
  '১৮। চিত্রে O বৃত্তের কেন্দ্র হলে CD এর দৈর্ঘ্য কত সে.মি.? [[FIG: p=23; box=445,270,540,410]]',
  '(ক) ৪ সে.মি. (খ) ৬ সে.মি. (গ) ৮ সে.মি. (ঘ) ১০ সে.মি.',
  '১৯। OM = 6 সে.মি., AB = 16 সে.মি. হলে, OA এর দৈর্ঘ্য কত? [[FIG: p=23; box=645,265,735,390]]',
  '(ক) ১০ সে.মি. (খ) ১৪ সে.মি. (গ) ৯৬ সে.মি. (ঘ) ১০০ সে.মি.',
  '২০। চিত্রে O কেন্দ্র এবং ∠AOB = 100° হলে ∠OAB = কত? [[FIG: p=23; box=820,250,910,385]]',
  '(ক) 80° (খ) 60° (গ) 50° (ঘ) 40°',
].join('\n');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/__source.pdf') { res.writeHead(200, { 'Content-Type': 'application/pdf' }); fs.createReadStream(PDF).pipe(res); return; }
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 120000 });

  const result = await page.evaluate(async (TEXT) => {
    const out = { steps: [] };
    const buf = await (await fetch('/__source.pdf')).arrayBuffer();
    const file = new File([buf], 'class 8 math (1).pdf', { type: 'application/pdf' });
    out.libs = { pdfjs: !!(window.pdfjsLib || window['pdfjs-dist/build/pdf']), extractor: !!window.FayzarFigureExtractor, review: !!window.FayzarFigureReview, exporter: !!window.FayzarExport, transfer: !!window.FayzarFigureTransfer, ocr: !!window.FayzarAiOcrEngine };
    await window.FayzarAiOcrEngine.handleFiles([file]);
    const q = window.FayzarAiOcrEngine.state.filesQueue;
    out.queue = { length: q.length, first: q[0] && { pdfPage: q[0].pdfPage, pageWidthPt: q[0].pageWidthPt, hasFile: !!q[0].file } };
    const X = window.FayzarFigureExtractor;
    out.tags = X.parseTags(TEXT).map((t) => ({ page: t.page, box: t.box }));
    const t0 = performance.now();
    const ext = await X.extract(TEXT, q, { docType: 'EXAM_MCQ' });
    out.extractMs = Math.round(performance.now() - t0);
    out.markedText = ext.text;
    out.items = ext.items.map((it) => ({ id: it.id, page: it.page, error: it.error || null, rect: it.rect, pageWidthIn: it.pageWidthIn, maxWidthIn: it.maxWidthIn,
      pagePx: it.pageCanvas ? [it.pageCanvas.width, it.pageCanvas.height] : null,
      fig: it.fig ? { pxW: it.fig.pxW, pxH: it.fig.pxH, cssW: it.fig.cssW, widthIn: it.fig.widthIn, clamped: it.fig.clamped, dataUrl: it.fig.dataUrl } : null }));
    // পাতার ছোট ছবি + বক্স (চোখে দেখার জন্য)
    const pg = ext.items.find((i) => i.pageCanvas);
    if (pg) {
      const c = document.createElement('canvas'); const s = 1200 / pg.pageCanvas.width;
      c.width = 1200; c.height = Math.round(pg.pageCanvas.height * s);
      const g = c.getContext('2d'); g.drawImage(pg.pageCanvas, 0, 0, c.width, c.height);
      g.lineWidth = 3;
      for (const it of ext.items) {
        const [y0, x0, y1, x1] = it.box || [0, 0, 0, 0];
        g.strokeStyle = '#2563eb'; g.strokeRect(x0 / 1000 * c.width, y0 / 1000 * c.height, (x1 - x0) / 1000 * c.width, (y1 - y0) / 1000 * c.height);
        if (it.rect) { g.strokeStyle = '#dc2626'; g.strokeRect(it.rect.x * s, it.rect.y * s, it.rect.w * s, it.rect.h * s); }
      }
      out.pageOverlay = c.toDataURL('image/png');
    }
    out.angles = ext.items.map((i) => i.angle);
    // কাত-পরীক্ষা: আসল পাতা ২৩ কৃত্রিমভাবে +২.৫° ঘুরিয়ে ছবি-উৎস বানানো; বক্সও একইভাবে ঘোরানো
    {
      const SK = 2.5, base = ext.items[0].pageCanvas, W = base.width, H = base.height;
      const rc = document.createElement('canvas'); rc.width = W; rc.height = H;
      const g = rc.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
      g.translate(W / 2, H / 2); g.rotate(SK * Math.PI / 180); g.drawImage(base, -W / 2, -H / 2);
      const blob = await new Promise((r) => rc.toBlob(r, 'image/png'));
      const t = SK * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
      const rot = (x, y) => [W / 2 + (x - W / 2) * c - (y - H / 2) * s, H / 2 + (x - W / 2) * s + (y - H / 2) * c];
      const tags = X.parseTags(TEXT).map((tg) => {
        const [y0, x0, y1, x1] = tg.box.map((v, k) => v / 1000 * (k % 2 ? W : H));
        const pts = [rot(x0, y0), rot(x1, y0), rot(x0, y1), rot(x1, y1)];
        const bx = pts.map((p) => p[0]), by = pts.map((p) => p[1]);
        return `[[FIG:p=1;box=${Math.round(Math.min(...by) / H * 1000)},${Math.round(Math.min(...bx) / W * 1000)},${Math.round(Math.max(...by) / H * 1000)},${Math.round(Math.max(...bx) / W * 1000)}]]`;
      });
      const skText = tags.map((tg, k) => (k + 1) + '। প্রশ্ন ' + tg).join('\n');
      const skExt = await X.extract(skText, [{ file: new File([blob], 'skew.png', { type: 'image/png' }), mimeType: 'image/png' }], { docType: 'EXAM_MCQ' });
      out.skewTest = { applied: SK, detected: skExt.items.map((i) => i.angle), errors: skExt.items.map((i) => i.error || null) };
      out.skewFigs = skExt.items.map((i) => i.fig && i.fig.dataUrl);
    }
    const figures = Object.fromEntries(ext.items.filter((i) => i.fig).map((i) => [i.id, i.fig]));
    const ab = async (b) => { const u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    for (const format of ['docx-unicode', 'docx-bijoy', 'doc']) {
      try {
        const r = await window.FayzarExport.produce(ext.text, { format, docType: 'EXAM_MCQ', figures, pageSize: 'a4', margin: 'normal', fontSize: '12', columns: 2 });
        out.steps.push({ format, ok: true, steps: r.steps, figures: r.figures, mhtml: r.mhtmlImages, size: r.blob.size, b64: await ab(r.blob) });
      } catch (e) { out.steps.push({ format, ok: false, error: String(e && e.stack || e) }); }
    }
    return out;
  }, TEXT);

  const save = (name, dataUrl) => fs.writeFileSync(path.join(OUT, name), Buffer.from(dataUrl.split(',')[1], 'base64'));
  if (result.pageOverlay) save('page-overlay.png', result.pageOverlay);
  for (const it of result.items) if (it.fig && it.fig.dataUrl) { save('fig' + it.id + '.png', it.fig.dataUrl); it.fig.dataUrl = '[saved]'; }
  for (const s of result.steps) if (s.b64) { fs.writeFileSync(path.join(OUT, 'out-' + s.format + (s.format === 'doc' ? '.doc' : '.docx')), Buffer.from(s.b64, 'base64')); delete s.b64; }
  (result.skewFigs || []).forEach((u, k) => { if (u) save('skew-fig' + (k + 1) + '.png', u); });
  delete result.skewFigs;
  delete result.pageOverlay;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ result, logs: logs.slice(-60) }, null, 2));
  console.log(JSON.stringify(result, null, 2));
  console.log('--- console (last 25) ---\n' + logs.slice(-25).join('\n'));
} finally {
  await browser.close();
  server.close();
}
