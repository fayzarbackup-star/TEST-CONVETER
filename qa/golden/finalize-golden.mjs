// WORK_PLAN A1+A2: truth.raw.json → truth.json (বিজয় রান ⇒ ইউনিকোড) + source.pdf → পাতা-PNG (২০০dpi) ও কৃত্রিম "মোবাইল-ছবি" JPG।
// চালানো: node qa/golden/finalize-golden.mjs [qa/golden-data] [--only g01,g02] [--no-png] [--force]
// আউটপুট লোকাল-মাত্র (ব্যক্তিগত তথ্য) — qa/golden-data gitignore ও github_sync EXCLUDE-এ।
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { docxParagraphRuns } from './docx-runs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const BC = require(path.join(ROOT, 'js/bangla-converter-engine.js'));

const args = process.argv.slice(2);
const OUT = path.resolve(args.find((a) => !a.startsWith('--') && !/^g\d/.test(a)) || path.join(ROOT, 'qa/golden-data'));
const flag = (n) => args.includes(n);
const onlyArg = args[args.indexOf('--only') + 1];
const ONLY = args.includes('--only') && onlyArg ? new Set(onlyArg.split(',')) : null;
const DPI = 200;

// বিজয় (ANSI) ফন্ট: …MJ, Sutonny ইত্যাদি; SutonnyOMJ/Kalpurush/Nikosh ইউনিকোড
const BIJOY_FONT = /mj\b|mj$|bijoy|sutonny|sutony|matra|boishakhi|chandan|probhat|bandhan|doshomik/i;
const UNI_FONT = /omj|unicode|kalpurush|nikosh|siyam|solaimanlipi$|vrinda|nirmala|noto/i;
const HAS_BN = /[ঀ-৿]/;
export function isBijoyRun(font, t) {
  return !!font && BIJOY_FONT.test(font) && !UNI_FONT.test(font) && !HAS_BN.test(t || '') && /[A-Za-z†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿]/.test(t || '');
}
function uniRun(r) {
  const out = Object.assign({}, r);
  if (isBijoyRun(r.font, r.t)) { out.enc = 'bijoy'; out.raw = r.t; out.t = BC.bijoyToUnicode(r.t); } else out.enc = 'unicode';
  return out;
}
const join = (runs) => runs.map((r) => r.t).join('');

// PowerShell ConvertTo-Json এক-উপাদানের অ্যারেকে অবজেক্ট বানায় ⇒ সবসময় অ্যারে
const arr = (x) => (Array.isArray(x) ? x : x == null || x === '' ? [] : [x]);

const key = (s) => String(s || '').replace(/\s/g, '');
// COM-অনুচ্ছেদ (অবস্থান) ↔ XML-অনুচ্ছেদ (রান) — লেখা মিলিয়ে ক্রমে জোড়া (সারি-শেষ চিহ্নের মতো বাড়তি COM-অনুচ্ছেদ বাদ পড়ে)
export function attachXmlRuns(raw, xml) {
  if (!xml) return raw;
  let j = 0, hit = 0, want = 0;
  const paragraphs = arr(raw.paragraphs).map((p) => {
    const k = key(arr(p.runs)[0] && arr(p.runs)[0].t); if (!k) return p;
    want++;
    for (let s = j; s < Math.min(xml.paras.length, j + 8); s++) {
      if (key(xml.paras[s].text) === k) { j = s + 1; hit++; return Object.assign({}, p, { runs: xml.paras[s].runs, runsFrom: 'xml' }); }
    }
    return p;
  });
  const used = new Set();
  const shapes = arr(raw.shapes).map((s) => {
    const k = key(s.t); if (!k) return s;
    const bi = xml.boxes.findIndex((b, i) => !used.has(i) && key(b.map((p) => p.runs.map((r) => r.t).join('')).join('')) === k);
    if (bi < 0) return s;
    used.add(bi);
    return Object.assign({}, s, { runs: xml.boxes[bi].flatMap((p, i) => (i ? [{ t: '\n', font: null, size: null }] : []).concat(p.runs)), runsFrom: 'xml' });
  });
  return Object.assign({}, raw, { paragraphs, shapes, xmlMatch: { paras: hit, of: want, boxes: used.size } });
}

export function finalize(raw, xml = null) {
  raw = attachXmlRuns(raw, xml);
  const paragraphs = arr(raw.paragraphs).map((p) => { const runs = arr(p.runs).map(uniRun); return Object.assign({}, p, { runs, tabs: arr(p.tabs), t: join(runs) }); });
  const tables = arr(raw.tables).map((t) => Object.assign({}, t, {
    cells: arr(t.cells).map((c) => Object.assign({}, c, { raw: c.t, t: isBijoyRun(c.font, c.t) ? BC.bijoyToUnicode(c.t) : c.t }))
  }));
  const shapes = arr(raw.shapes).map((s) => { const runs = arr(s.runs).map(uniRun); return Object.assign({}, s, { runs, t: runs.length ? join(runs) : s.t }); });
  // সারাংশ: অক্ষর-ভারিত প্রধান ফন্ট-সাইজ, বিজয়-অনুপাত (স্কোরের ভিত্তি)
  const sizes = {}; let bij = 0, all = 0;
  for (const r of paragraphs.flatMap((p) => p.runs).concat(shapes.flatMap((s) => s.runs))) {
    const n = (r.t || '').replace(/\s/g, '').length; if (!n) continue;
    all += n; if (r.enc === 'bijoy') bij += n;
    if (r.size && r.size < 999) sizes[r.size] = (sizes[r.size] || 0) + n;
  }
  const bodySize = Number(Object.entries(sizes).sort((a, b) => b[1] - a[1])[0]?.[0] || 0);
  return Object.assign({}, raw, { paragraphs, tables, shapes, summary: { chars: all, bijoyShare: all ? +(bij / all).toFixed(3) : 0, bodySize, sizes } });
}

// ---------- PNG / মোবাইল-ছবি (puppeteer + pdf.js, লোকাল) ----------
async function renderAll(jobs) {
  if (!jobs.length) return;
  const puppeteer = (await import('puppeteer')).default;
  let cur = null;
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/__p.pdf') { res.writeHead(200, { 'Content-Type': 'application/pdf' }); fs.createReadStream(cur).pipe(res); return; }
    const f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 120000 });
    for (let ji = 0, tries = 0; ji < jobs.length; ji++) {
      const job = jobs[ji];
      cur = job.pdf;
      let imgs;
      try { imgs = await page.evaluate(async (dpi, seed) => {
        const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
        if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
        const pdf = await lib.getDocument({ data: new Uint8Array(await (await fetch('/__p.pdf?' + seed)).arrayBuffer()) }).promise;
        let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
        const out = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          const pg = await pdf.getPage(n);
          const vp = pg.getViewport({ scale: dpi / 72 });
          const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          await pg.render({ canvasContext: g, viewport: vp }).promise;
          const png = c.toDataURL('image/png');
          // কৃত্রিম মোবাইল-ছবি: ছোট ঘোরানো, চারপাশে পটভূমি, ঝাপসা, অসম আলো, নয়েজ (নির্ধারিত seed ⇒ পুনরুৎপাদনযোগ্য)
          const W = Math.round(c.width * 0.6), H = Math.round(c.height * 0.6), pad = Math.round(W * 0.05);
          const m = document.createElement('canvas'); m.width = W + 2 * pad; m.height = H + 2 * pad;
          const h = m.getContext('2d'); h.fillStyle = '#6b6258'; h.fillRect(0, 0, m.width, m.height);
          const ang = (rnd() * 2 - 1) * 1.5 * Math.PI / 180;
          h.save(); h.translate(m.width / 2, m.height / 2); h.rotate(ang); h.filter = 'blur(0.7px)';
          h.drawImage(c, -W / 2, -H / 2, W, H); h.restore(); h.filter = 'none';
          const gr = h.createLinearGradient(0, 0, m.width * (0.5 + rnd() * 0.5), m.height);
          gr.addColorStop(0, 'rgba(255,240,210,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0.22)');
          h.fillStyle = gr; h.fillRect(0, 0, m.width, m.height);
          const id = h.getImageData(0, 0, m.width, m.height), d = id.data;
          for (let i = 0; i < d.length; i += 4) { const z = (rnd() - 0.5) * 18; d[i] += z; d[i + 1] += z; d[i + 2] += z; }
          h.putImageData(id, 0, 0);
          out.push({ png, photo: m.toDataURL('image/jpeg', 0.82), w: c.width, h: c.height, angleDeg: +(ang * 180 / Math.PI).toFixed(3), scale: 0.6, pad });
        }
        return out;
      }, DPI, job.seed); } catch (e) { // মাঝে মাঝে fetch ব্যর্থ হয় ⇒ একবার আবার; তারপরও ব্যর্থ হলে বাকিগুলো চলবে
        if (tries++ < 1) { ji--; continue; }
        job.error = String(e.message || e).split('\n')[0]; tries = 0; continue;
      }
      tries = 0;
      const meta = [];
      imgs.forEach((im, k) => {
        fs.writeFileSync(path.join(job.dir, `page-${k + 1}.png`), Buffer.from(im.png.split(',')[1], 'base64'));
        fs.writeFileSync(path.join(job.dir, `photo-${k + 1}.jpg`), Buffer.from(im.photo.split(',')[1], 'base64'));
        meta.push({ page: k + 1, dpi: DPI, w: im.w, h: im.h, photo: { angleDeg: im.angleDeg, scale: im.scale, pad: im.pad } });
      });
      fs.writeFileSync(path.join(job.dir, 'images.json'), JSON.stringify(meta, null, 1));
      job.pages = imgs.length;
    }
  } finally { await browser.close(); server.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // manifest না থাকলে (নির্মাণ চলাকালীন) ফোল্ডার থেকে id
  const mp = path.join(OUT, 'manifest.json');
  const manifest = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf8').replace(/^﻿/, ''))
    : fs.readdirSync(OUT).filter((d) => /^g\d+$/.test(d) && fs.existsSync(path.join(OUT, d, 'truth.raw.json'))).map((id) => ({ id }));
  const jobs = []; const rows = []; let fails = 0;
  for (const m of manifest) {
    if (ONLY && !ONLY.has(m.id)) continue;
    const dir = path.join(OUT, m.id);
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, 'truth.raw.json'), 'utf8').replace(/^﻿/, ''));
      const dx = path.join(dir, 'source.docx');
      const t = finalize(raw, fs.existsSync(dx) ? await docxParagraphRuns(dx) : null);
      fs.writeFileSync(path.join(dir, 'truth.json'), JSON.stringify(t));
      const xm = t.xmlMatch ? ` xml=${t.xmlMatch.paras}/${t.xmlMatch.of}` : ' xml=–';
      rows.push(`${m.id} p=${t.pages} para=${t.paragraphs.length} tbl=${t.tables.length} shp=${t.shapes.length} body=${t.summary.bodySize}pt bijoy=${t.summary.bijoyShare}${xm}`);
      const pdf = path.join(dir, 'source.pdf');
      if (!flag('--no-png') && fs.existsSync(pdf) && (flag('--force') || !fs.existsSync(path.join(dir, 'images.json')))) {
        jobs.push({ dir, pdf, seed: parseInt(m.id.slice(1), 10) * 7919 });
      }
    } catch (e) { fails++; rows.push(`${m.id} FAIL ${e.message}`); }
  }
  await renderAll(jobs);
  jobs.filter((j) => j.error).forEach((j) => rows.push(`${path.basename(j.dir)} PNG-FAIL ${j.error}`.slice(0, 160)));
  rows.slice(0, 25).forEach((r) => console.log(r));
  if (rows.length > 25) console.log(`… (${rows.length - 25} আরও)`);
  console.log(`finalized=${rows.length - fails} failed=${fails} rendered=${jobs.length}`);
}
