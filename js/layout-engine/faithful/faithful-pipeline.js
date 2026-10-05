/**
 * Fayzar — হুবহু-লেআউট পূর্ণ পথ (FayzarFaithful)
 * ============================================
 * Part-17.5: ক্যাপচার → পাতা-মাপ (১৫০ DPI, পাতা ধরে — মেমরি সাশ্রয়) → লেআউট-নকশা → চিত্র কাটা (৩০০ DPI) →
 * মাস্টার .docx → FayzarExport (বিজয় / Word 2003 .doc / ইউনিকোড)।
 *
 *   const cap = await FayzarFaithful.capture(queue)          // Gemini (একবার; ক্যাশ করে রাখা যায়)
 *   const ir  = await FayzarFaithful.layout(cap, queue)      // মাপ + নকশা + চিত্র
 *   const out = await FayzarFaithful.produce(ir, 'doc')      // { blob, ... }
 */
(function (global) {
  'use strict';

  const pick = (n) => (typeof global !== 'undefined' && global[n]) || (typeof window !== 'undefined' && window[n]) || null;
  const MEASURE_DPI = 150;

  function pdfLib() { return (typeof window !== 'undefined') && (window.pdfjsLib || window['pdfjs-dist/build/pdf']); }
  const pdfDocs = new Map();
  async function pdfDoc(file) {
    const key = file.name + ':' + file.size + ':' + file.lastModified;
    if (!pdfDocs.has(key)) {
      const lib = pdfLib();
      if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
      pdfDocs.set(key, lib.getDocument({ data: await file.arrayBuffer() }).promise);
    }
    return pdfDocs.get(key);
  }
  function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('ছবি লোড হয়নি')); im.src = src; }); }

  /** একটি পাতার মাপার-ছবি (ImageData) ও আসল মাপ (pt) */
  async function measureImage(item) {
    if (item && item.pdfPage && item.file && pdfLib()) {
      const pdf = await pdfDoc(item.file);
      const pg = await pdf.getPage(item.pdfPage);
      const base = pg.getViewport({ scale: 1 });
      const vp = pg.getViewport({ scale: MEASURE_DPI / 72 });
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: g, viewport: vp }).promise;
      const img = g.getImageData(0, 0, c.width, c.height);
      c.width = c.height = 0;
      return { img, widthPt: base.width, heightPt: base.height };
    }
    const src = item.file ? URL.createObjectURL(item.file) : (String(item.base64 || '').startsWith('data:') ? item.base64 : 'data:' + (item.mimeType || 'image/jpeg') + ';base64,' + item.base64);
    const im = await loadImage(src);
    if (item.file) URL.revokeObjectURL(src);
    // ছবির DPI অজানা — প্রস্থ A4 ধরে (প্রস্থ > উচ্চতা হলে A4 আড়াআড়ি)
    const landscape = im.naturalWidth > im.naturalHeight;
    const widthPt = landscape ? 841.9 : 595.3, heightPt = widthPt * im.naturalHeight / im.naturalWidth;
    const scale = Math.min(1, (widthPt / 72 * MEASURE_DPI) / im.naturalWidth);
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * scale); c.height = Math.round(im.naturalHeight * scale);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
    const img = g.getImageData(0, 0, c.width, c.height);
    c.width = c.height = 0;
    return { img, widthPt, heightPt };
  }

  /** ImageData ঘোরানো (কেন্দ্র ঘিরে, সাদা পটভূমি) */
  function rotateImageData(img, deg) {
    const s = document.createElement('canvas'); s.width = img.width; s.height = img.height;
    s.getContext('2d').putImageData(img, 0, 0);
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.translate(c.width / 2, c.height / 2); g.rotate(deg * Math.PI / 180); g.drawImage(s, -c.width / 2, -c.height / 2);
    const out = g.getImageData(0, 0, c.width, c.height);
    s.width = s.height = c.width = c.height = 0;
    return out;
  }

  /**
   * Part-17.7: কাটা আয়ত (rect) পাশের চিত্রের বক্সে (other) ঢুকলে — নিজের ও পাশেরটির কেন্দ্রের মাঝে
   * সবচেয়ে কম কালির সারি (ওপর-নিচে) বা কলাম (পাশাপাশি) খুঁজে সেখানে কাটা। না ঢুকলে অপরিবর্তিত।
   */
  function splitFromNeighbor(img, rect, own, other) {
    const ix = Math.min(rect.x + rect.w, other.x + other.w) - Math.max(rect.x, other.x);
    const iy = Math.min(rect.y + rect.h, other.y + other.h) - Math.max(rect.y, other.y);
    if (ix <= 0 || iy <= 0) return rect;
    const W = img.width, d = img.data;
    const ink = (x, y) => { const i = (y * W + x) * 4; return (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 < 200 ? 1 : 0; };
    const oc = { x: own.x + own.w / 2, y: own.y + own.h / 2 }, nc = { x: other.x + other.w / 2, y: other.y + other.h / 2 };
    const vertical = Math.abs(nc.y - oc.y) >= Math.abs(nc.x - oc.x);
    let best = null, bestInk = Infinity;
    if (vertical) {
      const a = Math.round(Math.min(oc.y, nc.y)), b = Math.round(Math.max(oc.y, nc.y));
      for (let y = a; y <= b; y++) { let s = 0; for (let x = rect.x; x < rect.x + rect.w; x++) s += ink(x, y); if (s < bestInk) { bestInk = s; best = y; } }
      if (best == null) return rect;
      return nc.y > oc.y ? Object.assign({}, rect, { h: Math.max(1, Math.min(rect.h, best - rect.y)) })
        : Object.assign({}, rect, { y: Math.max(rect.y, best + 1), h: Math.max(1, rect.y + rect.h - Math.max(rect.y, best + 1)) });
    }
    const a = Math.round(Math.min(oc.x, nc.x)), b = Math.round(Math.max(oc.x, nc.x));
    for (let x = a; x <= b; x++) { let s = 0; for (let y = rect.y; y < rect.y + rect.h; y++) s += ink(x, y); if (s < bestInk) { bestInk = s; best = x; } }
    if (best == null) return rect;
    return nc.x > oc.x ? Object.assign({}, rect, { w: Math.max(1, Math.min(rect.w, best - rect.x)) })
      : Object.assign({}, rect, { x: Math.max(rect.x, best + 1), w: Math.max(1, rect.x + rect.w - Math.max(rect.x, best + 1)) });
  }

  /**
   * Part-17.9: লেখার প্রস্থ মাপার যন্ত্র — আউটপুটের একই ফন্ট (fonts/SutonnyOMJ.ttf, ইংরেজি Times New Roman), ১০০px আকারে প্রস্থ।
   * ব্রাউজার/ফন্ট না পেলে false (তখন শুধু কালি-উচ্চতার অনুমান)।
   */
  let _measurer = null;
  async function textMeasurer() {
    if (_measurer !== null) return _measurer;
    _measurer = false;
    try {
      if (typeof document === 'undefined' || typeof FontFace === 'undefined') return false;
      const ff = new FontFace('FzMeasureOMJ', 'url(fonts/SutonnyOMJ.ttf)');
      await ff.load();
      document.fonts.add(ff);
      const ctx = document.createElement('canvas').getContext('2d');
      const EN = /([A-Za-z0-9][A-Za-z0-9.,:;'"()\-/ ]*[A-Za-z0-9.)]|[A-Za-z0-9])/;
      _measurer = (text, bold) => {
        let w = 0;
        String(text).split(EN).forEach((part, k) => {
          if (!part) return;
          const en = k % 2 === 1;
          ctx.font = (en && bold ? 'bold ' : '') + (en ? '100px "Times New Roman", Times, serif' : '100px FzMeasureOMJ');
          w += ctx.measureText(part).width;
        });
        return w;
      };
    } catch (e) { _measurer = false; }
    return _measurer;
  }

  /** একটি লেখা-ব্লকের প্রস্থ-ভিত্তিক ফন্ট-আকার (pt): প্রতিটি উপযুক্ত লাইনে মাপা-কালি-প্রস্থ ÷ (১০০px-এ লেখার প্রস্থ ÷ ১০০); মধ্যমা */
  function widthFontOf(b, me, measure) {
    if (!me || me.empty || !me.lines || !b.lines || me.lines.length !== b.lines.length) return 0;
    const n = b.lines.length, fs = [];
    b.lines.forEach((t0, i) => {
      const t = String(t0).replace(/\*\*/g, '').trim();
      if (t.length < 4 || /\$/.test(t)) return;
      if (me.lineSegs && me.lineSegs[i] && me.lineSegs[i].length > 1) return;   // ট্যাব-ফাঁকওয়ালা লাইন
      if (me.align === 'j' && n > 1 && i < n - 1) return;                       // দুপাশে-সমান: টানা লাইন বাদ
      const w100 = measure(t, !!b.bold);
      if (w100 > 0) fs.push(me.lines[i].w * 100 / w100);
    });
    if (!fs.length) return 0;
    fs.sort((a, c) => a - c);
    return fs[Math.floor(fs.length / 2)];
  }

  /** টেবিলের ঘরের প্রস্থ-ভিত্তিক ফন্ট: সারি-লাইন = Gemini-র সারি (সংখ্যা মিললে), প্রতিটি ঘরের কালি-প্রস্থ ÷ লেখার প্রস্থ; মধ্যমা */
  function tableWidthFontOf(b, me, measure) {
    if (!me || me.empty || !me.cellInk) return 0;
    const rows = (b.lines || []).filter((l) => l.trim()).map((l) => l.split(/\s*\|\s*/).map((c) => c.trim()))
      .filter((r) => r.some((c) => c));                                  // ফাঁকা সারি কালিতে নেই
    if (rows.length !== me.cellInk.length) return 0;
    const fs = [];
    rows.forEach((r, i) => r.forEach((t0, j) => {
      const t = String(t0 || '').replace(/\*\*/g, '');
      const w = me.cellInk[i] && me.cellInk[i][j];
      if (!w || t.length < 3 || /\$/.test(t)) return;
      const w100 = measure(t, false);
      if (w100 > 0) fs.push(w * 100 / w100);
    }));
    if (fs.length < 3) return 0;
    fs.sort((a, c) => a - c);
    return fs[Math.floor(fs.length / 2)];
  }

  async function capture(queue, opts) {
    const C = pick('FayzarFaithfulCapture');
    if (!C) throw new Error('faithful-capture লোড হয়নি');
    return C.run(queue, opts);
  }

  /** মাপ + নকশা + চিত্র। queue = ক্যাপচারে পাঠানো একই পাতার তালিকা (একই ক্রম) */
  async function layout(cap, queue, opts) {
    const o = opts || {};
    const G = pick('FayzarPageGeometry'), IR = pick('FayzarLayoutIR'), FX = pick('FayzarFigureExtractor');
    const progress = (m, p) => { if (typeof o.onProgress === 'function') o.onProgress(m, p); };
    const measures = {}, pageInfo = {}, fixedBox = {};
    const pages = [...new Set(cap.blocks.map((b) => b.page))].sort((a, b) => a - b);
    for (const pn of pages) {
      const item = queue[pn - 1];
      if (!item) continue;
      progress(`পাতা ${pn}/${pages.length} মাপা হচ্ছে…`, 50 + Math.round(30 * pn / pages.length));
      let { img, widthPt, heightPt } = await measureImage(item);
      // কাত পাতা সোজা করে মাপা (লাইন আলাদা হয়); ছোট কোণে Gemini-বক্সের সরণ নগণ্য
      if (FX && typeof FX.estimateSkew === 'function') {
        const ang = FX.estimateSkew(img);
        if (Math.abs(ang) >= 0.3) img = rotateImageData(img, -ang);
      }
      const m = G.inkMask(img);
      const pxPerPt = img.width / widthPt;
      const comps = G.components(m, null, 4);
      pageInfo[pn] = { widthPt, heightPt, margins: G.pageMargins(m, { pxPerPt, comps }), frame: G.detectFrame ? G.detectFrame(m, { pxPerPt, comps }) : null,
        vrules: G.verticalRules ? G.verticalRules(m, { pxPerPt, comps }) : [] };
      let gridMask = null;   // সরু ধূসর টেবিল-রেখার জন্য হালকা সীমা — শুধু টেবিল-ব্লক থাকলে
      const pageBlocks = cap.blocks.filter((x) => x.page === pn && x.box);
      const measureAll = (boxOf) => pageBlocks.map((b) => {
        if (b.type === 'table' && !gridMask) gridMask = G.inkMask(img, 225);
        return G.blockMetrics(m, boxOf(b), { pxPerPt, comps, align: b.align, gridMask: b.type === 'table' ? gridMask : null, isTable: b.type === 'table' });
      });
      let ms = measureAll((b) => b.box);
      // Part-17.9: Gemini-বক্সের ক্রমবর্ধমান উল্লম্ব সরণ থাকলে সংশোধিত বক্সে আবার মাপা
      const drift = G.fitBoxDrift ? G.fitBoxDrift(pageBlocks, ms, heightPt) : null;
      if (drift) {
        pageBlocks.forEach((b) => { fixedBox[b.i] = G.applyDrift(b.box, drift); });
        pageInfo[pn].drift = drift;
      }
      // Part-17.9: লেখা-ব্লক আসল মুদ্রিত লাইনে বসানো (বক্স অর্ধেক লাইন সরে থাকলেও পুরো লাইন ধরা)
      if (G.snapBoxesToLines) {
        const snapped = G.snapBoxesToLines(m, comps, pageBlocks.map((b) => Object.assign({}, b, { box: fixedBox[b.i] || b.box })));
        Object.keys(snapped).forEach((k) => { fixedBox[k] = snapped[k]; });
        pageInfo[pn].snapped = Object.keys(snapped).length;
      }
      if (drift || pageInfo[pn].snapped) ms = measureAll((b) => fixedBox[b.i] || b.box);
      // Part-17.9: প্রস্থ-ভিত্তিক ফন্ট-অনুমান (আউটপুট-ফন্টে লেখা মাপা প্রস্থে আঁটে যে আকারে)
      const measure = await textMeasurer();
      if (measure) pageBlocks.forEach((b, k) => {
        if (b.type === 'table') { const f = tableWidthFontOf(b, ms[k], measure); if (f) ms[k].cellWidthFontPt = f; }
        else if (b.type !== 'figure') { const f = widthFontOf(b, ms[k], measure); if (f) ms[k].widthFontPt = f; }
      });
      pageBlocks.forEach((b, k) => { measures[b.i] = ms[k]; });
    }
    // সংশোধিত বক্সসহ ব্লক (মূল ক্যাপচার অপরিবর্তিত — আবার নকশা করলেও দুবার সংশোধন হবে না)
    const capFixed = Object.assign({}, cap, { blocks: cap.blocks.map((b) => (fixedBox[b.i] ? Object.assign({}, b, { box: fixedBox[b.i] }) : b)) });
    const ir = IR.build(capFixed, measures, pageInfo);
    // চিত্র: ৩০০ DPI-তে কেটে পরিষ্কার (চিত্র-ইঞ্জিন), নকশার item-এ বসানো
    if (FX) {
      const sources = await FX.buildPageSources(queue);
      for (const page of ir.pages) {
        // Part-17.7: টেবিলের ঘরে বসানো চিত্রও (table.cellFigures)
        const figs = [];
        for (const band of page.bands) for (const cell of band.cells) for (const it of cell.items) {
          if (it.kind === 'figure') figs.push(it);
          if (it.kind === 'table' && it.cellFigures) figs.push(...it.cellFigures);
        }
        const boxed = figs.filter((f) => f.box);
        if (!boxed.length) continue;
        let pg = null, data = null;
        try { pg = await FX.renderPage(sources[page.page - 1]); data = pg.imageData || pg.canvas.getContext('2d').getImageData(0, 0, pg.canvas.width, pg.canvas.height); }
        catch (e) { ir.warnings.push({ page: page.page, kind: 'figure_crop_failed', detail: String(e && e.message || e) }); continue; }
        const W = pg.canvas.width, H = pg.canvas.height;
        const boxRects = boxed.map((f) => FX.boxToRect(f.box, W, H, 0));
        for (let fi = 0; fi < boxed.length; fi++) {
          const it = boxed[fi];
          try {
            let rect = FX.refineRect(data, boxRects[fi]);
            // Part-17.7: গা-ঘেঁষা পাশের চিত্রে ঢুকে পড়লে দুই চিত্রের কেন্দ্রের মাঝের সবচেয়ে ফাঁকা সারি/কলামে কাটা
            boxRects.forEach((o, oj) => { if (oj !== fi) rect = splitFromNeighbor(data, rect, boxRects[fi], o); });
            const fig = FX.cropClean(pg.canvas, rect, page.widthPt / 72, 100);
            it.image = fig;
            // প্রস্থ = নকশার (স্বাভাবিককৃত) প্রস্থ; উচ্চতা কাটা ছবির অনুপাতে
            if (!it.widthPt) it.widthPt = Math.round(fig.widthIn * 72 * 10) / 10;
            it.heightPt = Math.round(it.widthPt * fig.pxH / fig.pxW * 10) / 10;
          } catch (e) { ir.warnings.push({ page: page.page, kind: 'figure_crop_failed', detail: String(e && e.message || e) }); }
        }
      }
    }
    progress('লেআউট-নকশা তৈরি', 85);
    return ir;
  }

  /** নকশা → ফাইল (format: 'doc' | 'docx-bijoy' | 'docx-unicode') */
  async function produce(ir, format, opts) {
    const D = pick('FayzarFaithfulDocx'), X = pick('FayzarExport');
    const master = await D.build(ir);
    if (format === 'docx-unicode' || !X) return { blob: master, format: 'docx-unicode', steps: ['faithful-master'] };
    return X.produce('', Object.assign({ format, masterDocx: master }, opts || {}));
  }

  const FayzarFaithful = { MEASURE_DPI, capture, layout, produce, measureImage, splitFromNeighbor };
  global.FayzarFaithful = FayzarFaithful;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarFaithful;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
