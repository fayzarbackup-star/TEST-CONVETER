// লেআউট-স্কোর (হুবহু-মোডের মূল লক্ষ্য, ২০২৬-১০-১২): মূল PDF বনাম আমাদের out.pdf — হরফের নকশা নয়, লেআউট মাপে।
// ধাপ: ১৪৪dpi ছবি → পরিষ্কার (কিনারা-ছোঁয়া দাগ, ছোট ছিটে বাদ) → লেখা-লাইন ব্যান্ড (line-drift) ক্রমে মেলানো
// নম্বর (প্রতি পাতা ১০০): লাইন-অবস্থান ৪০ (|dy| ≤২pt পূর্ণ, ১০pt-এ শূন্য) · আনুভূমিক বিস্তার ২০ (শুরু+শেষ, ≤২pt পূর্ণ, ২০pt-এ শূন্য)
// · লাইন-উচ্চতা ১০ · দাগ (আনুভূমিক+খাড়া, ±৪pt) ২০ · কালি-মিল (৩pt সহনশীল F1) ১০। বাড়তি পাতা প্রতি −১৫% (সর্বোচ্চ −৫০%)।
// চালানো: node qa/golden/layout-score.mjs <orig.pdf> <ours.pdf> <outDir>  → outDir/layout-score.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMasks, inkF1 } from './image-score.mjs';
import { lineBands, alignBands } from './line-drift.mjs';

// ---- বিশুদ্ধ মাপ (টেস্টযোগ্য) ----
// পরিষ্কার: ৪-সংযুক্ত অংশ; পাতার কিনারা (০.৫%) ছোঁয়া অংশ আর ≤minArea পিক্সেলের ছিটে বাদ
export function cleanMask(mask, w, h, minArea) {
  const out = new Uint8Array(mask), seen = new Uint8Array(w * h), stack = new Int32Array(w * h);
  const ex = Math.max(1, Math.round(w * 0.005)), ey = Math.max(1, Math.round(h * 0.005));
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || seen[s]) continue;
    let sp = 0, n = 0, edge = false; const comp = [];
    stack[sp++] = s; seen[s] = 1;
    while (sp) {
      const i = stack[--sp], x = i % w, y = (i - x) / w; comp.push(i); n++;
      if (x < ex || x >= w - ex || y < ey || y >= h - ey) edge = true;
      if (x > 0 && mask[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack[sp++] = i - 1; }
      if (x < w - 1 && mask[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack[sp++] = i + 1; }
      if (y > 0 && mask[i - w] && !seen[i - w]) { seen[i - w] = 1; stack[sp++] = i - w; }
      if (y < h - 1 && mask[i + w] && !seen[i + w]) { seen[i + w] = 1; stack[sp++] = i + w; }
    }
    if (edge || n <= minArea) for (const i of comp) out[i] = 0;
  }
  return out;
}
// লম্বা দাগ: আনুভূমিক (≥২৫% প্রস্থ) ও খাড়া (≥১০% উচ্চতা) — অবস্থান pt-এ
// mask এখানে হালকা-কালিসহ (সরু দাগ ধূসর হয়)। টানা প্রার্থী-সারির দল ≤৩pt মোটা হলেই দাগ (ধূসর পটি/ছায়া বাদ); অবস্থান = দলের মাঝ
export function rules(mask, w, h, px, loose) {
  const groups = (n, m, at) => {
    const out = []; let g0 = -1;
    for (let i = 0; i <= n; i++) {
      let hit = false;
      // v2 (২০২৬-১০-১৪, image-score-এর মতো): ড্যাশ/বিন্দু-রেখা — ≤২pt ফাঁক জোড়া, জোড়া-রানে কালি ≥৬০%। লেখার সারি জুড়লে দল
      // ৩pt-এর বেশি মোটা হয় ⇒ নিচের পুরুত্ব-শর্তেই বাদ। FZ_SCORE_V1=1 ⇒ শুধু টানা
      if (i < n) {
        // loose (মেলানোর প্রার্থী): ছোট দৈর্ঘ্য, বড় ফাঁক, কম ঘনত্ব, মোটা দল চলে
        // মাপা: সব ফাইলে গড় অপরিবর্তিত, অথচ চোখে নিখুঁত a13 ৯২.৬→৮৩.৫ ⇒ ডিফল্টে পুরোনো (শুধু টানা); পরীক্ষা FZ_LAYOUT_RULES2=1
        const v2 = !!process.env.FZ_LAYOUT_RULES2 && !process.env.FZ_SCORE_V1;
        const need = (n === h ? w * 0.25 : h * 0.1) * (loose ? 0.7 : 1), gap = v2 ? Math.round((loose ? 3 : 2) * px) : 0;
        const minInk = loose ? 0.35 : 0.6;
        let best = 0, s = -1, last = -1, ink = 0;
        const close = () => { if (s >= 0) { const len = last - s + 1; if (ink >= minInk * len && len > best) best = len; } };
        for (let j = 0; j < m; j++) {
          if (!at(i, j)) continue;
          if (s >= 0 && j - last - 1 <= gap) { last = j; ink++; } else { close(); s = j; last = j; ink = 1; }
        }
        close();
        hit = best >= need;
      }
      if (hit && g0 < 0) g0 = i;
      if (!hit && g0 >= 0) { if (i - g0 <= (loose ? 6 : 3) * px) out.push((g0 + i - 1) / 2 / px); g0 = -1; }
    }
    return out;
  };
  return { h: groups(h, w, (y, x) => mask[y * w + x]), v: groups(w, h, (x, y) => mask[y * w + x]) };
}
function matchF1(A, B, tol) {
  if (!A.length && !B.length) return 1;
  const used = new Set(); let hit = 0;
  for (const a of A) { let bj = -1, bd = tol; B.forEach((b, j) => { const d = Math.abs(a - b); if (!used.has(j) && d <= bd) { bd = d; bj = j; } }); if (bj >= 0) { used.add(bj); hit++; } }
  return A.length + B.length ? 2 * hit / (A.length + B.length) : 1;
}
const ramp = (v, full, zero) => (v <= full ? 1 : v >= zero ? 0 : 1 - (v - full) / (zero - full));

// ---- কাজ ৫ (২০২৬-১০-১৫): কলাম ও ছক-রেখা ভেদে আলাদা লাইন নির্ণয় (--v2 বা FZ_LAYOUT_V2=1) ----
// খাড়া রেখা (ছকের কলাম-দাগ, ছবির বাক্সের খাড়া বাহু ≥১৮pt) ও আনুভূমিক রেখা সরিয়ে এবং কলাম-ফাঁক ভেদে আলাদা লাইন-ব্যান্ড নির্ণয়,
// যাতে বাম কলামের স্মারক/তারিখ ডান কলামের ছবির বাক্সে বা ছকের খাড়া দাগে জুড়ে ৬–১০ লাইন এক ব্যান্ডে গলে না যায়।
export function lineBandsV2(mask, w, h, px, r) {
  const work = new Uint8Array(mask);
  const pad = Math.max(1, Math.round(1.5 * px));
  if (r && Array.isArray(r.h)) {
    for (const ry of r.h) {
      const y0 = Math.max(0, Math.round(ry * px) - pad), y1 = Math.min(h - 1, Math.round(ry * px) + pad);
      for (let y = y0; y <= y1; y++) for (let x = 0; x < w; x++) work[y * w + x] = 0;
    }
  }
  if (r && Array.isArray(r.v)) {
    for (const rx of r.v) {
      const x0 = Math.max(0, Math.round(rx * px) - pad), x1 = Math.min(w - 1, Math.round(rx * px) + pad);
      for (let x = x0; x <= x1; x++) for (let y = 0; y < h; y++) work[y * w + x] = 0;
    }
  }
  // স্থানীয় খাড়া রেখা-খণ্ড (টানা ≥১৮pt উঁচু ও ≤৩pt চওড়া — যেমন ছবির বাক্সের বাহু বা আংশিক কলাম-দাগ) ও আনুভূমিক বাক্স-বাহু (≥২৮pt) মোছা
  const minVRun = Math.round(18 * px), maxThick = Math.max(2, Math.round(3.5 * px));
  for (let x = 0; x < w; x++) {
    let y0 = -1;
    for (let y = 0; y <= h; y++) {
      if (y < h && work[y * w + x]) { if (y0 < 0) y0 = y; }
      else if (y0 >= 0) {
        if (y - y0 >= minVRun) {
          let thin = true;
          for (let yy = y0; yy < y; yy += Math.max(1, Math.round(3 * px))) {
            let lx = x, rx = x;
            while (lx > 0 && work[yy * w + lx - 1] && x - lx <= maxThick) lx--;
            while (rx < w - 1 && work[yy * w + rx + 1] && rx - x <= maxThick) rx++;
            if (rx - lx + 1 > maxThick) { thin = false; break; }
          }
          if (thin) for (let yy = y0; yy < y; yy++) for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) work[yy * w + xx] = 0;
        }
        y0 = -1;
      }
    }
  }
  const minHRun = Math.round(28 * px);
  for (let y = 0; y < h; y++) {
    let x0 = -1;
    for (let x = 0; x <= w; x++) {
      if (x < w && work[y * w + x]) { if (x0 < 0) x0 = x; }
      else if (x0 >= 0) {
        if (x - x0 >= minHRun) {
          let thin = true;
          for (let xx = x0; xx < x; xx += Math.max(1, Math.round(4 * px))) {
            let ty = y, by = y;
            while (ty > 0 && work[(ty - 1) * w + xx] && y - ty <= maxThick) ty--;
            while (by < h - 1 && work[(by + 1) * w + xx] && by - y <= maxThick) by++;
            if (by - ty + 1 > maxThick) { thin = false; break; }
          }
          if (thin) for (let xx = x0; xx < x; xx++) for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) work[yy * w + xx] = 0;
        }
        x0 = -1;
      }
    }
  }
  // প্রাথমিক ব্যান্ড নির্ণয়; যে ব্যান্ড এক লাইনের চেয়ে উঁচু (>১৮pt — পাশাপাশি অসম কলাম বা ছকের বহু-লাইন ঘর) সেটিকে কলাম-দাগ বা ≥১২pt সাদা ফাঁকে ভাগ
  const rawBands = lineBands(work, w, h, px);
  const vSplits = (r && Array.isArray(r.v) ? r.v.map((x) => Math.round(x * px)) : []).sort((a, b) => a - b);
  const minGap = Math.round(12 * px), minH = Math.max(2, Math.round(2 * px));
  const out = [];
  for (const b of rawBands) {
    const bh = (b.y1 - b.y0 + 1) / px;
    if (bh <= 18) { out.push(b); continue; }
    const innerV = vSplits.filter((vx) => vx > b.x0 + minGap && vx < b.x1 - minGap);
    let zones = [];
    if (innerV.length) {
      const edges = [b.x0, ...innerV, b.x1];
      for (let k = 0; k < edges.length - 1; k++) zones.push([edges[k] + (k ? pad : 0), edges[k + 1] - (k < edges.length - 2 ? pad : 0)]);
    } else {
      let gapStart = -1, lastEdge = b.x0;
      for (let x = b.x0; x <= b.x1 + 1; x++) {
        let colInk = 0;
        if (x <= b.x1) for (let y = b.y0; y <= b.y1; y++) colInk += work[y * w + x];
        if (colInk === 0) { if (gapStart < 0) gapStart = x; }
        else if (gapStart >= 0) {
          if (x - gapStart >= minGap && gapStart > lastEdge + minGap) { zones.push([lastEdge, gapStart - 1]); lastEdge = x; }
          gapStart = -1;
        }
      }
      if (zones.length && lastEdge <= b.x1) zones.push([lastEdge, b.x1]);
    }
    if (zones.length < 2) { out.push(b); continue; }
    const subs = [];
    for (const [zx0, zx1] of zones) {
      if (zx1 - zx0 < minGap) continue;
      let sy0 = -1, sx0 = w, sx1 = -1;
      for (let y = b.y0; y <= b.y1 + 1; y++) {
        let cnt = 0, rx0 = w, rx1 = -1;
        if (y <= b.y1) for (let x = zx0; x <= zx1; x++) if (work[y * w + x]) { cnt++; if (x < rx0) rx0 = x; rx1 = x; }
        if (cnt >= Math.max(2, Math.round(px * 0.8))) {
          if (sy0 < 0) { sy0 = y; sx0 = rx0; sx1 = rx1; }
          else { if (rx0 < sx0) sx0 = rx0; if (rx1 > sx1) sx1 = rx1; }
        } else if (sy0 >= 0) {
          if (y - sy0 >= minH) subs.push({ y0: sy0, y1: y - 1, x0: sx0, x1: sx1 });
          sy0 = -1;
        }
      }
    }
    if (subs.length <= 1) { out.push(b); continue; }
    // একই অনুভূমিক সারির (|y0| ≤ ৩pt) পাশের কলামের খণ্ডগুলো এক লাইনে রাখা, আর ভিন্ন সারির লাইনগুলো আলাদা রাখা
    subs.sort((a, c) => a.y0 - c.y0 || a.x0 - c.x0);
    const mergedRows = [];
    for (const s of subs) {
      const prev = mergedRows[mergedRows.length - 1];
      if (prev && Math.abs(s.y0 - prev.y0) <= 3 * px && Math.abs(s.y1 - prev.y1) <= 4 * px) {
        prev.y0 = Math.min(prev.y0, s.y0); prev.y1 = Math.max(prev.y1, s.y1);
        prev.x0 = Math.min(prev.x0, s.x0); prev.x1 = Math.max(prev.x1, s.x1);
      } else mergedRows.push(Object.assign({}, s));
    }
    out.push(...mergedRows);
  }
  return out.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
}

export function pageLayout(ma, mb, w, h, px, la = ma, lb = mb, opts = {}) {
  const useV2 = !!(opts && opts.v2) || !!process.env.FZ_LAYOUT_V2 || (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv.includes('--v2'));
  const ra = rules(la, w, h, px), rb = rules(lb, w, h, px);
  const A = useV2 ? lineBandsV2(ma, w, h, px, ra) : lineBands(ma, w, h, px);
  const B = useV2 ? lineBandsV2(mb, w, h, px, rb) : lineBands(mb, w, h, px);
  const pairs = alignBands(A, B, h), denom = Math.max(A.length, B.length) || 1;
  let pos = 0, ext = 0, hgt = 0; const rows = [];
  for (const [i, j] of pairs) {
    const a = A[i], b = B[j];
    const dy = (b.y0 - a.y0) / px, d0 = Math.abs(b.x0 - a.x0) / px, d1 = Math.abs(b.x1 - a.x1) / px;
    const ha = (a.y1 - a.y0 + 1) / px, hb = (b.y1 - b.y0 + 1) / px;
    pos += ramp(Math.abs(dy), 2, 10); ext += (ramp(d0, 2, 20) + ramp(d1, 2, 20)) / 2; hgt += 1 - Math.abs(ha - hb) / Math.max(ha, hb);
    rows.push({ y: Math.round(a.y0 / px), dy: Math.round(dy), dx0: Math.round((b.x0 - a.x0) / px), dx1: Math.round((b.x1 - a.x1) / px), h: Math.round(ha), hOurs: Math.round(hb), x0: Math.round(a.x0 / px), w: Math.round((a.x1 - a.x0) / px), wOurs: Math.round((b.x1 - b.x0) / px) });
  }
  const nr = ra.h.length + ra.v.length + rb.h.length + rb.v.length;
  let rul;
  if (process.env.FZ_SCORE_V1 || !process.env.FZ_LAYOUT_RULES2) rul = nr ? (matchF1(ra.h, rb.h, 4) * (ra.h.length + rb.h.length) + matchF1(ra.v, rb.v, 4) * (ra.v.length + rb.v.length)) / nr : 1;
  else {
    // v2: কঠোর দাগ ⇔ অপর দিকের ঢিলা প্রার্থী (দুই দিক) — সীমান্তের ড্যাশ/বিন্দু-রেখা অসম শাস্তি পায় না
    const la2 = rules(la, w, h, px, true), lb2 = rules(lb, w, h, px, true);
    const hits = (A, B) => { const used = new Set(); let k = 0; for (const a of A) { let bj = -1, bd = 4; B.forEach((b, j) => { const d = Math.abs(a - b); if (!used.has(j) && d <= bd) { bd = d; bj = j; } }); if (bj >= 0) { used.add(bj); k++; } } return k; };
    rul = nr ? (hits(ra.h, lb2.h) + hits(rb.h, la2.h) + hits(ra.v, lb2.v) + hits(rb.v, la2.v)) / nr : 1;
  }
  const ink = inkF1(ma, mb, w, h, Math.max(1, Math.round(3 * px))).f1;
  const part = { pos: 40 * pos / denom, ext: 20 * ext / denom, hgt: 10 * hgt / denom, rules: 20 * rul, ink: 10 * ink };
  const score = Math.round(Object.values(part).reduce((s, v) => s + v, 0) * 10) / 10;
  return { score, part: Object.fromEntries(Object.entries(part).map(([k, v]) => [k, +v.toFixed(1)])),
    lines: { orig: A.length, ours: B.length, matched: pairs.length }, rules: { orig: ra, ours: rb }, rows };
}

export async function layoutScore(origPdf, oursPdf, outDir, { dpi = 144, v2 = false } = {}) {
  const useV2 = v2 || !!process.env.FZ_LAYOUT_V2 || (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv.includes('--v2'));
  const px = dpi / 72;
  // ২০২৬-১০-১৪: ফিকে স্ক্যানে Otsu-সীমা (image-score v2-এর মতো; ঝকঝকে পাতায় ১৬০ অপরিবর্তিত)। FZ_SCORE_FIXEDTHR=1 ⇒ পুরোনো
  const { pages: [P, Q], browser } = await renderMasks([origPdf, oursPdf], dpi, { thr: process.env.FZ_SCORE_FIXEDTHR ? 'fixed' : 'otsu' });
  await browser.close();
  // light = হালকা কালিসহ ('1' বা '2') — শুধু দাগ-মাপে
  const toMask = (p, W, H, light) => { const m = new Uint8Array(W * H); for (let y = 0; y < H; y++) { const sy = Math.min(p.h - 1, Math.floor(y * p.h / H)); for (let x = 0; x < W; x++) { const c = p.bits.charCodeAt(sy * p.w + Math.min(p.w - 1, Math.floor(x * p.w / W))); m[y * W + x] = c === 49 || (light && c === 50) ? 1 : 0; } } return m; };
  const minArea = Math.round(px * px * 1.5); // ≈১.৫pt² — বিন্দু-রেখার বিন্দু (≥২pt²) থাকে
  const per = [];
  for (let k = 0; k < P.length; k++) {
    if (!Q[k]) { per.push({ page: k + 1, missing: true, score: 0 }); continue; }
    const W = P[k].w, H = P[k].h;
    const C = (p, light) => cleanMask(toMask(p, W, H, light), W, H, minArea);
    const r = pageLayout(C(P[k]), C(Q[k]), W, H, px, C(P[k], true), C(Q[k], true), { v2: useV2 });
    per.push(Object.assign({ page: k + 1 }, r));
  }
  const extra = Math.max(0, Q.length - P.length);
  const score = +(per.reduce((s, p) => s + p.score, 0) / Math.max(1, P.length) * (1 - Math.min(0.5, extra * 0.15))).toFixed(1);
  const avg = (k) => +(per.filter((p) => p.part).reduce((s, p) => s + p.part[k], 0) / Math.max(1, per.filter((p) => p.part).length)).toFixed(1);
  const res = { pages: { truth: P.length, out: Q.length, ok: P.length === Q.length }, score, part: { pos: avg('pos'), ext: avg('ext'), hgt: avg('hgt'), rules: avg('rules'), ink: avg('ink') }, per };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'layout-score.json'), JSON.stringify(res, null, 1));
  return res;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [a, b, o] = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  const r = await layoutScore(a, b, o);
  console.log(`লেআউট ${r.score} | পাতা ${r.pages.out}/${r.pages.truth} | অবস্থান ${r.part.pos}/৪০ বিস্তার ${r.part.ext}/২০ উচ্চতা ${r.part.hgt}/১০ দাগ ${r.part.rules}/২০ কালি ${r.part.ink}/১০`);
}
