// WORK_PLAN A4: দুই মাপ (সোনালি truth.json বনাম আমাদের আউটপুটের মাপ) তুলনা → মেট্রিক + ০–১০০ স্কোর। বিশুদ্ধ ফাংশন (টেস্টযোগ্য)।
// মাপ দুটোই measure-lib.ps1-এর গঠনে, finalize-golden.mjs দিয়ে ইউনিকোড করা।

const arr = (x) => (Array.isArray(x) ? x : x == null || x === '' ? [] : [x]);
// ফাঁকা-রেখার বিন্দু/ড্যাশ/নিচে-দাগ আর ফাঁকা বাদ — লেখার মিল মাপতে
export const norm = (s) => String(s || '').normalize('NFC').replace(/[\s.…_\-–—…:।,;|]+/g, '');
const tokens = (s) => String(s || '').normalize('NFC').split(/[\s.…_\-–—…:।,;|()]+/).filter(Boolean);

function lcsLen(a, b) {
  if (!a.length || !b.length) return 0;
  let prev = new Uint32Array(b.length + 1), cur = new Uint32Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}
function bigrams(s) { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } if (s.length === 1) m.set(s, 1); return m; }
// a-এর কত অংশ b-তে আছে (০–১) — আউটপুট অনুচ্ছেদ জোড়া/ভাঙা হলেও কাজ করে
function containment(a, b) {
  const A = bigrams(a), B = bigrams(b); let hit = 0, tot = 0;
  for (const [k, n] of A) { tot += n; hit += Math.min(n, B.get(k) || 0); }
  return tot ? hit / tot : 0;
}
const dominant = (runs, key) => {
  const w = new Map();
  for (const r of runs) { const n = norm(r.t).length; if (!n || r[key] == null || r[key] === 9999999) continue; w.set(r[key], (w.get(r[key]) || 0) + n); }
  let best = null, bn = -1; for (const [k, n] of w) if (n > bn) { best = k; bn = n; }
  return best;
};

// লেখার একক: প্রতিটি অ-ফাঁকা অনুচ্ছেদ (টেবিলের ঘরসহ) + আকৃতির লেখা (অবস্থান ছাড়া)
export function items(m) {
  const H = (m.page && m.page.h) || 842;
  const out = [];
  for (const p of arr(m.paragraphs)) {
    const t = norm(p.t); if (!t) continue;
    const runs = arr(p.runs);
    out.push({ t, raw: p.t, gy: (p.page - 1) * H + p.y, x: p.x, page: p.page, size: dominant(runs, 'size'), b: dominant(runs, 'b'), al: p.al, inTable: !!p.inTable, src: 'p',
      i: dominant(runs, 'i'), u: dominant(runs, 'u'), lines: p.lines });
  }
  for (const s of arr(m.shapes)) {
    for (const line of String(s.t || '').split('\n')) {
      const t = norm(line); if (!t) continue;
      const runs = arr(s.runs);
      out.push({ t, raw: line, gy: null, x: null, page: s.page, size: dominant(runs, 'size'), b: dominant(runs, 'b'), al: null, src: 's' });
    }
  }
  return out;
}

// ক্রম-নিরপেক্ষ মিল (পাশাপাশি কপি/কলাম আউটপুটে অন্য ক্রমে আসতে পারে): একই বা পাশের পাতার জোড়াগুলোর মধ্যে
// সবচেয়ে বেশি মিল আগে নিয়ে লোভী এক-এক জোড়া। মিল = দুই দিকের bigram-অন্তর্ভুক্তির গড় (বানান-ভেদে সহনশীল)।
export function matchItems(T, O, { minScore = 0.6 } = {}) {
  const tb = T.map((i) => bigrams(i.t)), ob = O.map((i) => bigrams(i.t));
  const cont = (A, B) => { let hit = 0, tot = 0; for (const [k, n] of A) { tot += n; hit += Math.min(n, B.get(k) || 0); } return tot ? hit / tot : 0; };
  const cand = [];
  for (let i = 0; i < T.length; i++) {
    for (let j = 0; j < O.length; j++) {
      if (T[i].page != null && O[j].page != null && Math.abs(T[i].page - O[j].page) > 1) continue;
      const lt = T[i].t.length, lo = O[j].t.length;
      if (Math.min(lt, lo) / Math.max(lt, lo) < 0.25) continue; // দৈর্ঘ্যে খুব ভিন্ন ⇒ একই একক নয়
      const s = (cont(tb[i], ob[j]) + cont(ob[j], tb[i])) / 2;
      if (s >= minScore) cand.push([s, i, j]);
    }
  }
  cand.sort((a, b) => b[0] - a[0]);
  const ti = new Map(), uj = new Set();
  for (const [s, i, j] of cand) { if (ti.has(i) || uj.has(j)) continue; ti.set(i, [j, s]); uj.add(j); }
  return T.map((t, i) => (ti.has(i) ? [t, O[ti.get(i)[0]], ti.get(i)[1]] : [t, null, 0]));
}

function tableProfile(t) {
  const cells = arr(t.cells);
  const r1 = cells.filter((c) => c.row === 1).sort((a, b) => a.col - b.col);
  const tot = r1.reduce((a, c) => a + c.w, 0) || 1;
  return { rows: t.rows, cols: t.cols, widths: r1.map((c) => c.w / tot), text: norm(cells.map((c) => c.t).join('')), shaded: cells.filter((c) => c.shading != null && c.shading !== -16777216 && c.shading !== 16777215).length };
}

export function compare(truth, out) {
  const T = items(truth), O = items(out);
  // ১) লেখার পূর্ণতা — ক্রম-নিরপেক্ষ অক্ষর-জোড়া (bigram) মিল: কলাম/কপির ক্রম বা যুক্তাক্ষরের সামান্য বানান-ভেদে শাস্তি নয়;
  //    বাদ পড়া বা বাড়তি লেখা ধরা পড়ে। অনুক্রম-মিল (LCS) আলাদা তথ্য হিসেবে।
  const TA = bigrams(T.map((i) => i.t).join('')), OA = bigrams(O.map((i) => i.t).join(''));
  let inter = 0, nt = 0, no = 0;
  for (const [k, n] of TA) { nt += n; inter += Math.min(n, OA.get(k) || 0); }
  for (const n of OA.values()) no += n;
  const tt = tokens(T.map((i) => i.raw).join(' ')), ot = tokens(O.map((i) => i.raw).join(' '));
  const text = { recall: nt ? inter / nt : 1, precision: no ? inter / no : 1, orderedTokens: tt.length ? lcsLen(tt, ot) / tt.length : 1, truthTokens: tt.length };
  // ২) একক-মিল ও অবস্থান/আকার/মোটা
  const pairs = matchItems(T, O);
  const hit = pairs.filter((p) => p[1]);
  const dys = [], dxs = [], dsz = []; let bOk = 0, bN = 0, alOk = 0, alN = 0;
  for (const [t, o] of hit) {
    if (t.gy != null && o.gy != null) { dys.push(Math.abs(t.gy - o.gy)); dxs.push(Math.abs(t.x - o.x)); }
    if (t.size && o.size) dsz.push(Math.abs(t.size - o.size));
    if (t.b != null && o.b != null) { bN++; if (!!t.b === !!o.b) bOk++; }
    if (t.al != null && o.al != null && !t.inTable) { alN++; if (t.al === o.al) alOk++; }
  }
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const median = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
  // ৩) টেবিল
  const TT = arr(truth.tables).map(tableProfile), OT = arr(out.tables).map(tableProfile);
  const usedT = new Set(); const tbl = [];
  for (const a of TT) {
    let best = -1, bs = 0;
    OT.forEach((b, j) => { if (usedT.has(j)) return; const s = a.text ? containment(a.text, b.text) : (a.rows === b.rows && a.cols === b.cols ? 1 : 0); if (s > bs) { bs = s; best = j; } });
    if (best < 0 || bs < 0.3) { tbl.push({ found: false }); continue; }
    usedT.add(best); const b = OT[best];
    const wErr = a.widths.length === b.widths.length ? a.widths.reduce((s, w, k) => s + Math.abs(w - b.widths[k]), 0) / 2 : 1;
    tbl.push({ found: true, rowsOk: a.rows === b.rows, colsOk: a.cols === b.cols, widthErr: +wErr.toFixed(3), text: +bs.toFixed(3), shadeOk: (a.shaded > 0) === (b.shaded > 0) });
  }
  const tables = { truth: TT.length, out: OT.length, found: tbl.filter((t) => t.found).length,
    gridOk: tbl.filter((t) => t.found && t.rowsOk && t.colsOk).length, widthErr: mean(tbl.filter((t) => t.found).map((t) => t.widthErr)) };

  const m = {
    pages: { truth: truth.pages, out: out.pages, ok: truth.pages === out.pages },
    text,
    items: { truth: T.length, out: O.length, matched: hit.length, share: T.length ? hit.length / T.length : 1 },
    pos: { dyMean: mean(dys), dyMedian: median(dys), dxMean: mean(dxs), n: dys.length },
    size: { mae: mean(dsz), exact: dsz.length ? dsz.filter((d) => d <= 0.5).length / dsz.length : null },
    bold: bN ? bOk / bN : null, align: alN ? alOk / alN : null,
    tables,
    page: { wOk: Math.abs((truth.page.w || 0) - (out.page.w || 0)) < 3, orientOk: truth.page.orient === out.page.orient }
  };
  m.score = score(m);
  m.fmt = formatCompleteness(truth, out, hit);
  return m;
}

/**
 * g41: ফরম্যাট-পূর্ণতা (মূল স্কোরে নয় — আলাদা তথ্য; ভিত্তিরেখার তুলনা অক্ষত)।
 * ইটালিক/নিচে-দাগ (মেলানো একক), দৃশ্যত সারিবিন্যাস (এক লাইনের "দুপাশে সমান" = বাঁয়ে), পটি/ছায়া (সংখ্যা), ছবি (সংখ্যা)। ০–১০০।
 */
export function formatCompleteness(truth, out, pairs) {
  const share = (f) => { let ok = 0, n = 0; for (const [t, o] of pairs) { const v = f(t, o); if (v == null) continue; n++; if (v) ok++; } return n ? ok / n : null; };
  const on = (v) => !!v && v !== 0 && v !== 9999999;
  const visAl = (x) => (x.al === 3 && (x.lines == null || x.lines <= 1) ? 0 : x.al);
  const italic = share((t, o) => (t.i == null || o.i == null ? null : on(t.i) === on(o.i)));
  const underline = share((t, o) => (t.u == null || o.u == null ? null : on(t.u) === on(o.u)));
  const align = share((t, o) => (t.al == null || o.al == null || t.inTable ? null : visAl(t) === visAl(o)));
  const shadedP = (m) => arr(m.paragraphs).filter((p) => p.shading != null && p.shading !== -16777216 && p.shading !== 16777215 && norm(p.t)).length;
  const bars = (m) => arr(m.shapes).filter((s) => s.type === 1 && s.w >= 100 && s.h <= 40 && !norm(s.t)).length;
  const sT = shadedP(truth) + bars(truth), sO = shadedP(out) + bars(out);
  const shade = sT || sO ? Math.min(sT, sO) / Math.max(sT, sO) : null;
  const imgs = (m) => arr(m.inlineShapes).length + arr(m.shapes).filter((s) => s.type === 13).length;
  const iT = imgs(truth), iO = imgs(out);
  const images = iT || iO ? Math.min(iT, iO) / Math.max(iT, iO) : null;
  const parts = { italic, underline, align, shade, images };
  const vals = Object.values(parts).filter((v) => v != null);
  return Object.assign({ score: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 1000) / 10 : null, shadeCount: [sO, sT], imageCount: [iO, iT] }, parts);
}

// ০–১০০: লেখা ৩০ · পাতা ১০ · অবস্থান ২০ · ফন্ট-আকার ১৫ · টেবিল ১৫ · মোটা ১০ (যা মাপা যায়নি তা বাদ দিয়ে ওজন পুনর্বণ্টন)
export function score(m) {
  const parts = [];
  parts.push([30, Math.min(m.text.recall, 1) * 0.8 + Math.min(m.text.precision, 1) * 0.2]);
  parts.push([10, m.pages.ok ? 1 : Math.max(0, 1 - Math.abs(m.pages.out - m.pages.truth) / Math.max(1, m.pages.truth))]);
  if (m.pos.dyMedian != null) parts.push([20, Math.max(0, 1 - m.pos.dyMedian / 72) * m.items.share]);
  if (m.size.mae != null) parts.push([15, Math.max(0, 1 - m.size.mae / 4)]);
  if (m.tables.truth) parts.push([15, (m.tables.gridOk / m.tables.truth) * 0.6 + (m.tables.found / m.tables.truth) * 0.2 + (m.tables.widthErr != null ? Math.max(0, 1 - m.tables.widthErr * 3) * 0.2 : 0)]);
  else if (m.tables.out) parts.push([15, 0.5]); // টেবিল নেই অথচ বানানো ⇒ আংশিক
  if (m.bold != null) parts.push([10, m.bold]);
  const W = parts.reduce((a, p) => a + p[0], 0);
  return Math.round(parts.reduce((a, p) => a + p[0] * p[1], 0) / W * 1000) / 10;
}
