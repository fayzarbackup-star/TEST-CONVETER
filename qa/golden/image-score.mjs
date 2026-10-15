// WORK_PLAN A5: ছবি-ভিত্তিক স্কোর — যেসব নমুনার Word নেই (শুধু PDF/ছবি)। মূল PDF বনাম আমাদের আউটপুট-PDF (Word-রেন্ডার)
// একই dpi-তে ছবি করে কালির তুলনা: পাতা-সংখ্যা, সারি-প্রোফাইল মিল (উল্লম্ব অবস্থান), কালির মিল (±সহনশীলতা), লম্বা রেখার (টেবিল/বাক্স) মিল।
// সাথে পাশাপাশি তুলনার PNG (বাঁয়ে মূল, ডানে আমাদের, মাঝে লাল=শুধু মূলে, নীল=শুধু আমাদের)।
// চালানো: node qa/golden/image-score.mjs <orig.pdf> <ours.pdf> <outDir>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---- বিশুদ্ধ মাপ (টেস্টযোগ্য): mask = Uint8Array(w*h) 0/1 ----
export function rowProfile(mask, w, h, bins) {
  const p = new Float64Array(bins);
  for (let y = 0; y < h; y++) { let s = 0; for (let x = 0; x < w; x++) s += mask[y * w + x]; p[Math.min(bins - 1, Math.floor(y / h * bins))] += s; }
  return p;
}
// ২০২৬-১০-১৪ (মাপকাঠি v2): লাইন-অবস্থান ভিত্তিক প্রোফাইল — প্রতি পিক্সেল-সারির কালি sat-এ সম্পৃক্ত (≈ "এখানে লেখা/রেখা আছে কি না"),
// তাই স্ক্যানের মোটা কালি বা পূর্ণ-প্রস্থ ছক-রেখা প্রোফাইলে আধিপত্য করে না; অবস্থান ভুল হলে মিল তবুও কমে
export function rowOccupancy(mask, w, h, bins, sat = Math.max(4, Math.round(w * 0.02))) {
  const p = new Float64Array(bins);
  for (let y = 0; y < h; y++) { let s = 0; for (let x = 0; x < w; x++) s += mask[y * w + x]; p[Math.min(bins - 1, Math.floor(y / h * bins))] += Math.min(1, s / sat); }
  return p;
}
// একক বিচ্ছিন্ন বিন্দু (স্ক্যান-দাগ) বাদ
export function despeckle(mask, w, h) {
  const o = new Uint8Array(mask);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!mask[y * w + x]) continue;
    let n = 0;
    for (let dy = -1; dy <= 1 && !n; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w && mask[yy * w + xx]) { n = 1; break; } }
    if (!n) o[y * w + x] = 0;
  }
  return o;
}
// Zhang-Suen কঙ্কাল: দাগের পুরুত্ব (স্ক্যানের ঝাপসা/মোটা কালি বনাম Word-এর সরু) সমান করে কালি-মিল মাপা
export function skeleton(mask, w, h) {
  const m = new Uint8Array(mask);
  const del = [];
  for (let it = 0; it < 40; it++) {
    let changed = 0;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x; if (!m[i]) continue;
        const p2 = m[i - w], p3 = m[i - w + 1], p4 = m[i + 1], p5 = m[i + w + 1], p6 = m[i + w], p7 = m[i + w - 1], p8 = m[i - 1], p9 = m[i - w - 1];
        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9; if (B < 2 || B > 6) continue;
        const A = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
        if (A !== 1) continue;
        if (pass === 0 ? (p2 * p4 * p6 || p4 * p6 * p8) : (p2 * p4 * p8 || p2 * p6 * p8)) continue;
        del.push(i);
      }
      for (const i of del) m[i] = 0;
      changed += del.length;
    }
    if (!changed) break;
  }
  return m;
}
export function bestShiftCorr(a, b, maxShift) {
  const n = a.length; let best = { corr: -1, shift: 0 };
  for (let s = -maxShift; s <= maxShift; s++) {
    let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, k = 0;
    for (let i = 0; i < n; i++) { const j = i + s; if (j < 0 || j >= n) continue; const x = a[i], y = b[j]; sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y; k++; }
    if (!k) continue;
    const cov = sab - sa * sb / k, va = saa - sa * sa / k, vb = sbb - sb * sb / k;
    const c = va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : (va === 0 && vb === 0 ? 1 : 0);
    if (c > best.corr + 1e-9 || (Math.abs(c - best.corr) < 1e-9 && Math.abs(s) < Math.abs(best.shift))) best = { corr: c, shift: s };
  }
  return best;
}
function dilate(mask, w, h, r) {
  const t = new Uint8Array(w * h), o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < w) t[y * w + xx] = 1; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (t[y * w + x]) for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < h) o[yy * w + x] = 1; }
  return o;
}
// সহনশীল কালি-মিল: a-এর কালির কত অংশ b-এর r-পিক্সেলের মধ্যে (এবং উল্টো) ⇒ F1
export function inkF1(a, b, w, h, r) {
  const da = dilate(a, w, h, r), db = dilate(b, w, h, r);
  let na = 0, nb = 0, ha = 0, hb = 0;
  for (let i = 0; i < a.length; i++) { if (a[i]) { na++; if (db[i]) ha++; } if (b[i]) { nb++; if (da[i]) hb++; } }
  const rec = na ? ha / na : 1, prec = nb ? hb / nb : 1;
  return { recall: rec, precision: prec, f1: rec + prec ? 2 * rec * prec / (rec + prec) : 0 };
}
// v2 কালি-সমতা: গোনা হয় কঙ্কাল-পিক্সেল (দাগের দৈর্ঘ্য, পুরুত্ব নয় — স্ক্যানের মোটা কালি বেশি ওজন পায় না),
// মেলানো হয় অপর দিকের পূর্ণ কালির r-পিক্সেলের মধ্যে (সহনশীলতা আগের মতোই)
export function inkF1Skel(a, b, w, h, r) {
  const ca = despeckle(a, w, h), cb = despeckle(b, w, h);
  const sa = skeleton(ca, w, h), sb = skeleton(cb, w, h), da = dilate(ca, w, h, r), db = dilate(cb, w, h, r);
  let na = 0, nb = 0, ha = 0, hb = 0;
  for (let i = 0; i < sa.length; i++) { if (sa[i]) { na++; if (db[i]) ha++; } if (sb[i]) { nb++; if (da[i]) hb++; } }
  const rec = na ? ha / na : 1, prec = nb ? hb / nb : 1;
  return { recall: rec, precision: prec, f1: rec + prec ? 2 * rec * prec / (rec + prec) : 0 };
}
// লম্বা অনুভূমিক রেখা (টেবিল/বাক্সের সীমা): ≥ minLen পিক্সেল টানা কালি — y-অবস্থান (০–১) তালিকা
// v2 (gap>0): ড্যাশ/বিন্দু-রেখা — ≤gap পিক্সেলের ফাঁক জোড়া (ভেক্টর ড্যাশ ও স্ক্যানের ভাঙা দাগ রেখা হিসেবে ধরা পড়ে)।
// টানা রেখা (solid) সবসময় গোনা; শুধু-জোড়া-দিয়ে-পাওয়া রেখা গোনা হয় যদি কালি ≥LINK_INK আর সরু (thick ≤LINK_THICK):
// thick = রানের x-গুলোর কত অংশে রেখা-সারি থেকে খাড়া টানা কালি ≥৬ পিক্সেল (বাংলা মাত্রা থেকে দণ্ড নামে ⇒ লেখা, রেখা নয়)
export const LINK_INK = 0.35, LINK_THICK = 0.12;
export function lineCands(mask, w, h, minLen, gap) {
  const out = [];
  const vrun = (y, x) => { let y0 = -1; for (const d of [0, -1, 1]) { const z = y + d; if (z >= 0 && z < h && mask[z * w + x]) { y0 = z; break; } } if (y0 < 0) return 0;
    let a = y0, b = y0; while (a > 0 && mask[(a - 1) * w + x]) a--; while (b < h - 1 && mask[(b + 1) * w + x]) b++; return b - a + 1; };
  for (let y = 0; y < h; y++) {
    let solid = 0, run = 0;
    for (let x = 0; x < w; x++) { if (mask[y * w + x]) { run++; if (run > solid) solid = run; } else run = 0; }
    let best = null;
    if (gap) {
      // ±1 সারির কালি একত্রে (স্ক্যানের সামান্য ঢেউ)
      const row = (x) => mask[y * w + x] || (y > 0 && mask[(y - 1) * w + x]) || (y < h - 1 && mask[(y + 1) * w + x]);
      let s = -1, last = -1, ink = 0;
      const close = () => { if (s >= 0 && last - s + 1 >= minLen && (!best || last - s + 1 > best.len)) best = { len: last - s + 1, x0: s, x1: last, ink: ink / (last - s + 1) }; };
      for (let x = 0; x < w; x++) {
        if (!row(x)) continue;
        if (s >= 0 && x - last - 1 <= gap) { last = x; ink++; } else { close(); s = x; last = x; ink = 1; }
      }
      close();
    }
    if (solid < minLen && !best) continue;
    let thick = 0;
    // রেখার নিজের পুরুত্ব = খাড়া-রানের মধ্যমা; তার চেয়ে ≥৩ বেশি লম্বা খাড়া কালি (অক্ষরের দণ্ড) কত অংশে
    if (best) {
      const v = []; for (let x = best.x0; x <= best.x1; x++) v.push(vrun(y, x));
      const nz = v.filter((a) => a > 0).sort((a, b) => a - b), med = nz.length ? nz[nz.length >> 1] : 0;
      thick = v.filter((a) => a >= med + 3).length / best.len;
    }
    out.push({ y, len: Math.max(solid, best ? best.len : 0), ink: best ? best.ink : 1, thick, solid: solid >= minLen });
  }
  return out;
}
export function hLines(mask, w, h, minLen, gap = 0) {
  const ys = [];
  for (const c of lineCands(mask, w, h, minLen, gap)) {
    if (!(c.solid || (c.ink >= LINK_INK && c.thick <= LINK_THICK))) continue;
    if (!(ys.length && c.y - ys[ys.length - 1] <= 2)) ys.push(c.y);
  }
  return ys.map((y) => y / h);
}
// v2 রেখা-মিল: দুই দিকের কঠোর রেখা (hLines) অপর দিকের ঢিলা প্রার্থীর (ছোট দৈর্ঘ্য, বড় ফাঁক, ঘনত্ব/পুরুত্ব-শর্ত নেই) সাথে মেলানো —
// সীমান্তের রেখা (একদিকে কঠোর-শর্ত পেরোয়, অন্যদিকে সামান্য কম) অসম শাস্তি পায় না; ফাঁকা জায়গায় রেখা থাকলে তবুও অমিল
export function looseLines(mask, w, h, minLen) {
  const ys = [];
  for (const c of lineCands(mask, w, h, minLen * 0.7, 5)) if (!(ys.length && c.y - ys[ys.length - 1] <= 2)) ys.push(c.y);
  return ys.map((y) => y / h);
}
export function lineMatch2(A, B, looseA, looseB, tol) {
  const a = lineMatch(A, looseB, tol), b = lineMatch(B, looseA, tol);
  return { truth: A.length, out: B.length, matched: a.matched, matchedOut: b.matched };
}
export function lineMatch(A, B, tol) {
  const used = new Set(); let hit = 0;
  for (const y of A) { let bj = -1, bd = tol; B.forEach((z, j) => { const d = Math.abs(z - y); if (!used.has(j) && d <= bd) { bd = d; bj = j; } }); if (bj >= 0) { used.add(bj); hit++; } }
  return { truth: A.length, out: B.length, matched: hit };
}
export function lineRatio(l) {
  if (l.matchedOut != null) return l.truth + l.out ? (l.matched + l.matchedOut) / (l.truth + l.out) : 1;
  return l.truth ? l.matched / Math.max(l.truth, l.out) : (l.out ? 0.5 : 1);
}
export function pageScore(m) {
  // ০–১০০: সারি-প্রোফাইল ৩৫ · কালি-মিল ৩৫ · রেখা ২০ · অবস্থান-সরণ ১০
  const lines = lineRatio(m.lines);
  const shift = Math.max(0, 1 - Math.abs(m.shiftPt) / 36);
  return Math.round((35 * Math.max(0, m.rowCorr) + 35 * m.ink.f1 + 20 * lines + 10 * shift) * 10) / 10;
}

// ---- রেন্ডার (puppeteer + লোকাল pdf.js) ----
export async function renderMasks(pdfs, dpi, { thr = 'fixed' } = {}) {
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
  const out = [];
  try {
    const page = await browser.newPage();
    if (process.env.FZ_NODESKEW) await page.evaluateOnNewDocument(() => { window.__FZ_NODESKEW = true; });   // নির্ণয়: মূল সোজা-করা বন্ধ
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 120000 });
    // মাঝে মাঝে fetch ব্যর্থ হয় ("Failed to fetch", a09) ⇒ পাতা আবার লোড করে সর্বোচ্চ ৩ বার
    // "file.pdf::6" বা "::2-4" ⇒ শুধু ওই পাতাগুলো (বড় ফাইলের একটি পাতা আলাদা নমুনা — manifest range)
    const once = (pdf, rg) => page.evaluate(async (dpi, tag, rg, thrMode) => {
        const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
        if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
        const doc = await lib.getDocument({ data: new Uint8Array(await (await fetch('/__p.pdf?' + tag)).arrayBuffer()) }).promise;
        const pages = [];
        const [p0, p1] = rg ? [rg[0], Math.min(rg[1], doc.numPages)] : [1, doc.numPages];
        for (let n = p0; n <= p1; n++) {
          const pg = await doc.getPage(n); const vp = pg.getViewport({ scale: dpi / 72 });
          const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          await pg.render({ canvasContext: g, viewport: vp }).promise;
          // ২০২৬-১০-১৩: কাত স্ক্যান (a07: ছকের দাগ এক সারিতে পূর্ণ-প্রস্থ হয় না ⇒ মূলে দাগ ০, লাইন জোড়া) সোজা করে মাপা —
          // পাইপলাইনও সোজা করে মাপে; আমাদের Word-PDF-এ কাত ০ ⇒ অপরিবর্তিত
          const FX = window.FayzarFigureExtractor;
          if (FX && FX.estimateSkew && !window.__FZ_NODESKEW) {
            const ang = FX.estimateSkew(g.getImageData(0, 0, c.width, c.height));
            if (Math.abs(ang) >= 0.15) {
              const s = document.createElement('canvas'); s.width = c.width; s.height = c.height; s.getContext('2d').drawImage(c, 0, 0);
              g.save(); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
              g.translate(c.width / 2, c.height / 2); g.rotate(-ang * Math.PI / 180); g.drawImage(s, -c.width / 2, -c.height / 2); g.restore();
            }
          }
          const d = g.getImageData(0, 0, c.width, c.height).data; let bits = '';
          // রঙিন পটভূমি (ধূসর ঘর, নীল ব্যান্ড) কালি নয়: উজ্জ্বলতা < ১৬০ = কালি
          // '2' = হালকা কালি (১৬০–২১০): সরু দাগ (Word-এর নিচে-দাগ) ছবিতে ধূসর হয় — শুধু দাগ-মাপে (layout-score) গোনা
          const hist = new Array(256).fill(0);
          for (let i = 0; i < d.length; i += 4) hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
          // মাপকাঠি v2 (২০২৬-১০-১৪): ফিকে স্ক্যান (a05: লেখা ধূসর ~১৭০–১৯০) — Otsu-সীমা ১৬০-এর ওপরে হলে সেটিই (≤২০৫);
          // ঝকঝকে PDF/Word-এ Otsu ≈১২৮ ⇒ ১৬০ অপরিবর্তিত
          let T = 160;
          if (thrMode === 'otsu') {
            let tot = 0, sum = 0; hist.forEach((n, v) => { tot += n; sum += v * n; });
            let wB = 0, sB = 0, best = -1, bt = 160;
            for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; bt = t; } }
            T = Math.max(160, Math.min(205, bt));
          }
          for (let i = 0; i < d.length; i += 4) { const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; bits += L < T ? '1' : L < 210 ? '2' : '0'; }
          pages.push({ w: c.width, h: c.height, bits, png: c.toDataURL('image/png'), thr: T });
        }
        return pages;
      }, dpi, String(out.length) + '-' + Date.now(), rg, thr);
    for (const spec of pdfs) {
      const mm = String(spec).match(/^(.*)::(\d+)(?:-(\d+))?$/);
      const pdf = mm ? mm[1] : spec, rg = mm ? [+mm[2], +(mm[3] || mm[2])] : null;
      cur = pdf;
      for (let t = 0; ; t++) {
        try { out.push(await once(pdf, rg)); break; } catch (err) {
          if (t >= 2) throw err;
          await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 120000 });
        }
      }
    }
    return { pages: out, page, browser };
  } finally { server.close(); }
}

async function sideBySide(page, a, b, file) {
  const url = await page.evaluate(async (a, b) => {
    const load = (s) => new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.src = s; });
    const A = await load(a), B = b ? await load(b) : null;
    const W = A.width, H = A.height, c = document.createElement('canvas'); c.width = W * 3; c.height = H;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, H);
    g.drawImage(A, 0, 0); if (B) g.drawImage(B, 2 * W, 0, W, H);
    // মাঝে ওভারলে: লাল = মূল, নীল = আমাদের
    const ov = document.createElement('canvas'); ov.width = W; ov.height = H; const o = ov.getContext('2d');
    o.drawImage(A, 0, 0); const da = o.getImageData(0, 0, W, H);
    let db = null; if (B) { o.clearRect(0, 0, W, H); o.drawImage(B, 0, 0, W, H); db = o.getImageData(0, 0, W, H); }
    const res = o.createImageData(W, H);
    for (let i = 0; i < res.data.length; i += 4) {
      const ia = (da.data[i] + da.data[i + 1] + da.data[i + 2]) / 3 < 160, ib = db ? (db.data[i] + db.data[i + 1] + db.data[i + 2]) / 3 < 160 : false;
      const [r, gg, bb] = ia && ib ? [40, 40, 40] : ia ? [220, 30, 30] : ib ? [30, 90, 230] : [255, 255, 255];
      res.data[i] = r; res.data[i + 1] = gg; res.data[i + 2] = bb; res.data[i + 3] = 255;
    }
    o.putImageData(res, 0, 0); g.drawImage(ov, W, 0);
    g.fillStyle = '#999'; g.fillRect(W - 1, 0, 2, H); g.fillRect(2 * W - 1, 0, 2, H);
    return c.toDataURL('image/png');
  }, a, b);
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
}

export async function imageScore(origPdf, oursPdf, outDir, { dpi = 72 } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const { pages: [P, Q], page, browser } = await renderMasks([origPdf, oursPdf], dpi, { thr: process.env.FZ_SCORE_V1 || process.env.FZ_SCORE_FIXEDTHR ? 'fixed' : 'otsu' });
  try {
    const per = [];
    for (let k = 0; k < P.length; k++) {
      const a = P[k], b = Q[k];
      await sideBySide(page, a.png, b && b.png, path.join(outDir, `compare-${k + 1}.png`));
      if (!b) { per.push({ page: k + 1, missing: true, score: 0 }); continue; }
      // আমাদের পাতা মূলের মাপে আনা (ভিন্ন হলে নিকটতম-নমুনা)
      const toMask = (p, W, H) => { const m = new Uint8Array(W * H); for (let y = 0; y < H; y++) { const sy = Math.min(p.h - 1, Math.floor(y * p.h / H)); for (let x = 0; x < W; x++) m[y * W + x] = p.bits.charCodeAt(sy * p.w + Math.min(p.w - 1, Math.floor(x * p.w / W))) === 49 ? 1 : 0; } return m; };
      const W = a.w, H = a.h, ma = toMask(a, W, H), mb = toMask(b, W, H);
      const bins = Math.round(H / (dpi / 72) / 2); // ২pt-এর সারি
      // মাপকাঠি v2 (২০২৬-১০-১৪; FZ_SCORE_V1=1 ⇒ পুরোনো): লাইন-অবস্থান প্রোফাইল · কঙ্কাল-কালি-মিল · ড্যাশ-জোড়া রেখা
      const V1 = !!process.env.FZ_SCORE_V1;
      const prof = V1 ? rowProfile : rowOccupancy;
      const sc = bestShiftCorr(prof(ma, W, H, bins), prof(mb, W, H, bins), Math.round(bins * 0.1));
      const r = Math.max(1, Math.round(dpi / 24));
      const ink = V1 ? inkF1(ma, mb, W, H, r) : inkF1Skel(ma, mb, W, H, r);
      const g = V1 ? 0 : Math.max(2, Math.round(dpi / 24));
      const m = { page: k + 1, rowCorr: +sc.corr.toFixed(3), shiftPt: sc.shift * 2, ink,
        lines: V1 ? lineMatch(hLines(ma, W, H, W * 0.25), hLines(mb, W, H, W * 0.25), 0.012)
          : lineMatch2(hLines(ma, W, H, W * 0.25, g), hLines(mb, W, H, W * 0.25, g), looseLines(ma, W, H, W * 0.25), looseLines(mb, W, H, W * 0.25), 0.012) };
      m.ink = { recall: +m.ink.recall.toFixed(3), precision: +m.ink.precision.toFixed(3), f1: +m.ink.f1.toFixed(3) };
      m.score = pageScore(m);
      per.push(m);
    }
    const extra = Math.max(0, Q.length - P.length);
    const score = +(per.reduce((s, p) => s + p.score, 0) / Math.max(1, P.length) * (1 - Math.min(0.5, extra * 0.15))).toFixed(1);
    const res = { pages: { truth: P.length, out: Q.length, ok: P.length === Q.length }, score, per };
    fs.writeFileSync(path.join(outDir, 'image-score.json'), JSON.stringify(res, null, 1));
    return res;
  } finally { await browser.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [a, b, o] = process.argv.slice(2);
  const r = await imageScore(a, b, o);
  console.log(`পাতা ${r.pages.out}/${r.pages.truth} | স্কোর ${r.score}`);
  r.per.forEach((p) => console.log(p.missing ? `  পৃ.${p.page} — আমাদের আউটপুটে নেই` : `  পৃ.${p.page} ${p.score} | সারি-মিল ${p.rowCorr} সরণ ${p.shiftPt}pt | কালি F1 ${p.ink.f1} | রেখা ${p.lines.matched}/${p.lines.truth} (আমাদের ${p.lines.out})`));
}
