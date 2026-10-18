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

  // G3: __FZ_ON_PAGERANGE সুইচ ও পাতা-পরিসর পার্সার ("2-5,8", "১–৩", "সব")
  function isPageRangeOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_PAGERANGE)) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_PAGERANGE)) return true;
    if (global && Boolean(global.__FZ_ON_PAGERANGE)) return true;
    if (typeof process !== 'undefined' && process && process.env && (process.env.__FZ_ON_PAGERANGE === '1' || process.env.__FZ_ON_PAGERANGE === 'true')) return true;
    return false;
  }

  function parsePageRange(input, totalPages) {
    const maxP = typeof totalPages === 'number' && totalPages > 0 ? Math.floor(totalPages) : null;
    if (input == null) {
      return { ok: false, valid: false, pages: [], indices: [], outOfRange: [], invalidTokens: [''], error: 'পাতা-পরিসর দেওয়া হয়নি' };
    }
    const raw = String(input)
      .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/[;،]/g, ',')
      .trim();

    if (raw.toLowerCase() === 'all' || raw === 'সব' || raw === '*') {
      const pages = maxP ? Array.from({ length: maxP }, (_, i) => i + 1) : [];
      return { ok: true, valid: true, mode: 'all', pages, indices: pages.map((p) => p - 1), outOfRange: [], invalidTokens: [], error: null };
    }
    if (!raw) {
      return { ok: false, valid: false, pages: [], indices: [], outOfRange: [], invalidTokens: [''], error: 'পাতা-পরিসর ফাঁকা রাখা যাবে না (যেমন: 2-5,8)' };
    }

    const tokens = raw.split(',').map((t) => t.trim());
    const pageSet = new Set();
    const outSet = new Set();
    const invalidTokens = [];

    for (const tok of tokens) {
      if (!tok) {
        invalidTokens.push('');
        continue;
      }
      if (/^\d+$/.test(tok)) {
        const n = parseInt(tok, 10);
        if (n < 1) {
          invalidTokens.push(tok);
        } else if (maxP && n > maxP) {
          outSet.add(n);
        } else {
          pageSet.add(n);
        }
        continue;
      }
      const m = tok.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (a < 1 || b < 1 || a > b) {
          invalidTokens.push(tok);
          continue;
        }
        for (let p = a; p <= b; p++) {
          if (maxP && p > maxP) outSet.add(p);
          else pageSet.add(p);
        }
        continue;
      }
      invalidTokens.push(tok);
    }

    const pages = Array.from(pageSet).sort((a, b) => a - b);
    const outOfRange = Array.from(outSet).sort((a, b) => a - b);
    const indices = pages.map((p) => p - 1);

    if (invalidTokens.length > 0) {
      return { ok: false, valid: false, pages, indices, outOfRange, invalidTokens, error: 'ভুল পাতা-পরিসর: ' + invalidTokens.filter(Boolean).join(', ') };
    }
    if (pages.length === 0) {
      const errMsg = outOfRange.length ? `নির্বাচিত পাতা মোট পাতা-সংখ্যার (${maxP}) বাইরে` : 'সঠিক পাতা-পরিসর দিন (যেমন: 2-5,8)';
      return { ok: false, valid: false, pages: [], indices: [], outOfRange, invalidTokens: [], error: errMsg };
    }
    return { ok: true, valid: true, pages, indices, outOfRange, invalidTokens: [], error: null };
  }

  function filterQueueByRange(queue, rangeSpec) {
    const q = Array.isArray(queue) ? queue : [];
    if (!isPageRangeOn() || rangeSpec == null || rangeSpec === '' || rangeSpec === 'all' || rangeSpec === 'সব') return q;
    const parsed = parsePageRange(rangeSpec, q.length);
    if (!parsed.ok || !parsed.pages.length) throw new Error(parsed.error || 'ভুল পাতা-পরিসর');
    return parsed.pages.map((p) => q[p - 1]).filter(Boolean);
  }

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
    // a04: Gemini লাইন-বিরতি দেয়নি (১৪১০ অক্ষর "১ লাইন", মাপা ১৩) ⇒ সব মাপা লাইনের মোট কালি-প্রস্থ ÷ পুরো লেখার প্রস্থ
    // (Word-এর মোড়ানোয় লাইন-শেষে কিছু ফাঁক থাকে ⇒ ০.৯৭)
    if (me && !me.empty && me.lines && b.lines && b.lines.length && me.lines.length >= 3 && me.lines.length >= b.lines.length * 2) {
      const t = b.lines.join(' ').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
      const w100 = t.length >= 40 && !/\$/.test(t) ? measure(t, !!b.bold) : 0;
      return w100 > 0 ? 0.97 * me.lines.reduce((a, l) => a + l.w, 0) * 100 / w100 : 0;
    }
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
    if (isPageRangeOn() && opts && opts.pageRange != null) {
      const parsed = parsePageRange(opts.pageRange, Array.isArray(queue) ? queue.length : 0);
      if (!parsed.ok || !parsed.pages.length) throw new Error(parsed.error || 'ভুল পাতা-পরিসর');
      const subQueue = parsed.pages.map((p) => queue[p - 1]).filter(Boolean);
      const res = await C.run(subQueue, opts);
      if (res && typeof res === 'object') res.selectedPages = parsed.pages;
      return res;
    }
    return C.run(queue, opts);
  }

  /** মাপ + নকশা + চিত্র। queue = ক্যাপচারে পাঠানো একই পাতার তালিকা (একই ক্রম) */
  async function layout(cap, queue, opts) {
    const o = opts || {};
    if (isPageRangeOn()) {
      if (o.pageRange != null) queue = filterQueueByRange(queue, o.pageRange);
      else if (cap && Array.isArray(cap.selectedPages) && Array.isArray(queue) && queue.length > cap.selectedPages.length) {
        queue = cap.selectedPages.map((p) => queue[p - 1]).filter(Boolean);
      }
    }
    const G = pick('FayzarPageGeometry'), IR = pick('FayzarLayoutIR'), FX = pick('FayzarFigureExtractor');
    const progress = (m, p) => { if (typeof o.onProgress === 'function') o.onProgress(m, p); };
    const measures = {}, pageInfo = {}, fixedBox = {};
    // ২০২৬-১০-১৪ যাচাই-ধাপ: আগের যাচাইয়ের মেরামত (ক্যাপচারে রাখা) আগে বসানো — আবার চালালে Gemini লাগে না
    const CAP = pick('FayzarFaithfulCapture');
    const verifyOn = CAP && CAP.verifyLines && o.verify !== false && !globalThis.__FZ_OFF_VERIFY;
    if (verifyOn && cap.repairs) CAP.applyRepairs(cap.blocks, cap.repairs);
    // ২০২৬-১০-১৩: মাপা ফল নেতিবাচক (a02 ৭৬→৭১.৬: Gemini ছক ৫→৭ সারি; a05 লাভ নেই) ⇒ ডিফল্টে বন্ধ, পরীক্ষায় FZ_ON=TVERIFY
    const tVerifyOn = verifyOn && CAP.verifyTables && !!globalThis.__FZ_ON_TVERIFY;
    if (tVerifyOn && cap.tableRepairs) CAP.applyTableRepairs(cap.blocks, cap.tableRepairs);
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
      // ফিকে স্ক্যানে Otsu-সীমা (page-geometry otsuThreshold): শুধু যখন Otsu ≥১৯০ আর কালি ≥১.৪ গুণ (ফিকে ধূসর লেখা)
      // (a05 ছবি ৭১.৭⇒৮০.৩)। a07-এ সব পাতায় চালালে ৬ পাতা (৮০⇒৪৮) ⇒ সেখানে বাদ। FZ_OFF=OTSU
      let m = G.inkMask(img), otsuInfo = null;
      if (!globalThis.__FZ_OFF_OTSU && G.otsuThreshold) {
        const T = G.otsuThreshold(img);
        if (T > 160) {
          const frac = (mm) => { let n = 0; for (let i = 0; i < mm.mask.length; i++) n += mm.mask[i]; return n / mm.mask.length; };
          const m2 = G.inkMask(img, T), f1 = frac(m), f2 = frac(m2);
          // পাইপলাইনের মাপে (৩০০dpi): a05 T ১৯৬–১৯৮, কালি ১.৬–১.৭ গুণ; a07 T ১৬৬–১৭৮, ১.০৩–১.১৭ গুণ
          // ধূসর পটভূমির স্ক্যান (a04: Otsu-তে কালি ৯–১২% — পটভূমিই কালি) ⇒ বাদ; ফিকে লেখায় ≤৭% (a05)
          otsuInfo = { T, f1: +f1.toFixed(4), f2: +f2.toFixed(4), used: T >= 190 && f2 >= f1 * 1.4 && f2 <= 0.08 };
          if (otsuInfo.used) m = m2;
        }
      }
      const pxPerPt = img.width / widthPt;
      const comps = G.components(m, null, 4);
      pageInfo[pn] = { widthPt, heightPt, margins: G.pageMargins(m, { pxPerPt, comps }), frame: G.detectFrame ? G.detectFrame(m, { pxPerPt, comps }) : null,
        vrules: G.verticalRules ? G.verticalRules(m, { pxPerPt, comps }) : [],
        hrules: G.horizontalRules ? G.horizontalRules(m, { pxPerPt }) : [],
        boxes: G.boxFrames ? G.boxFrames(m, { pxPerPt }) : [], otsu: otsuInfo };
      let gridMask = null;   // সরু ধূসর টেবিল-রেখার জন্য হালকা সীমা — শুধু টেবিল-ব্লক থাকলে
      const pageBlocks = cap.blocks.filter((x) => x.page === pn && x.box);
      const measureAll = (boxOf) => pageBlocks.map((b) => {
        if (b.type === 'table' && !gridMask) gridMask = G.inkMask(img, 225);
        return G.blockMetrics(m, boxOf(b), { pxPerPt, comps, align: b.align, gridMask: b.type === 'table' ? gridMask : null, isTable: b.type === 'table' });
      });
      let ms = measureAll((b) => b.box);
      // Part-17.9: Gemini-বক্সের ক্রমবর্ধমান উল্লম্ব সরণ থাকলে সংশোধিত বক্সে আবার মাপা
      const drift = (G.fitBoxDrift ? G.fitBoxDrift(pageBlocks, ms, heightPt) : null) || (G.fitExtentDrift ? G.fitExtentDrift(pageBlocks, m, comps) : null);
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
      // g41: লেখার পেছনের পটি (ধূসর/রঙিন অংশ-শিরোনাম, কালো ব্যান্ড) — লাইনে-বসানো বক্সে, পাতার পটভূমির তুলনায়
      if (G.blockShade) {
        const pageL = G.pageBackground(img);
        pageBlocks.forEach((b, k) => { if (b.type !== 'figure' && b.type !== 'table') { const s = G.blockShade(img, fixedBox[b.i] || b.box, { pageL }); if (s) ms[k].shade = s; } });
        // ২০২৬-১০-১৪ (a02): ছকের শিরোনাম-সারির ধূসর পটি — প্রথম দুই মাপা আড়া-রেখার মাঝে (রেখা থেকে ২pt ভেতরে)। বন্ধ: FZ_OFF=TBLSHADE
        if (!globalThis.__FZ_OFF_TBLSHADE) pageBlocks.forEach((b, k) => {
          const me = ms[k];
          if (b.type !== 'table' || !me || me.empty || !me.hasGrid || !me.rectPt || !Array.isArray(me.hRulesPt) || me.hRulesPt.length < 3) return;
          const H = me.hRulesPt.slice().sort((a, c) => a - c);
          if (H[1] - H[0] < 10 || Math.abs(H[0] - me.rectPt.y) > 6) return;
          const yb = (y) => y / heightPt * 1000, xb = (x) => x / widthPt * 1000;
          const s = G.blockShade(img, [yb(H[0] + 2), xb(me.rectPt.x + 2), yb(H[1] - 2), xb(me.rectPt.x + me.rectPt.w - 2)], { pageL });
          // পরের সারিও একই রঙে ⇒ পুরো ছকের পটভূমি/স্ক্যানের ধূসর, শিরোনাম নয়
          const s2 = s && !s.dark ? G.blockShade(img, [yb(H[1] + 2), xb(me.rectPt.x + 2), yb(H[2] - 2), xb(me.rectPt.x + me.rectPt.w - 2)], { pageL }) : null;
          if (s && !s.dark && !s2) me.headShade = s.fill;
        });
        // a03: গাঢ় ব্যান্ডে সাদা লেখা ⇒ উল্টো মাস্কে আবার মাপা (সাধারণ মাস্কে পুরো ব্যান্ডই কালি — ফন্ট ৬, উচ্চতা ২–৯pt)
        if (G.darkBandMask) pageBlocks.forEach((b, k) => {
          if (!ms[k].shade || !ms[k].shade.dark) return;
          const box = fixedBox[b.i] || b.box, im = G.darkBandMask(img, box);
          if (!im) return;
          const mk = G.blockMetrics(im, box, { pxPerPt, comps: G.components(im, null, 4), align: b.align });
          if (!mk || mk.empty) return;
          mk.shade = ms[k].shade;
          if (measure && b.type !== 'figure') { const f = widthFontOf(b, mk, measure); if (f) mk.widthFontPt = f; }
          ms[k] = mk;
        });
      }
      pageBlocks.forEach((b, k) => { measures[b.i] = ms[k]; });
    }
    // যাচাই-ধাপ: মাপা ছাপা-লাইন ≠ Gemini-র লাইন ⇒ সেই পাতার জন্য একটি "শুধু লাইন-ভাঙা ঠিক করো" অনুরোধ (faithful-capture verifyLines);
    // মেরামত হওয়া ব্লকের প্রস্থ-ভিত্তিক ফন্ট-অনুমান নতুন লেখায় আবার
    if (verifyOn && !cap.repairs) {
      try {
        const v = await CAP.verifyLines(queue, cap.blocks, measures, { onProgress: progress });
        cap.repairs = v.repairs; cap.verify = { asked: v.asked, fixed: v.fixed, mismatches: v.mismatches || 0, why: v.why, list: v.list };
        if (v.fixed) {
          const measure = await textMeasurer();
          if (measure) cap.blocks.forEach((b) => { const me = measures[b.i]; if (me && v.repairs[CAP.repairKey(b)] && b.type !== 'table' && b.type !== 'figure') { const f = widthFontOf(b, me, measure); if (f) me.widthFontPt = f; } });
        }
      } catch (e) { (cap.issues = cap.issues || []).push({ kind: 'verify_failed', detail: String(e && e.message || e).slice(0, 120) }); }
    }
    // ছকের সারি-যাচাই: মাপা রেখা-ভাগ > Gemini-সারি ⇒ "বাদ পড়া (ফাঁকা) সারিসহ আবার লেখো" (faithful-capture verifyTables); মাপ বদলায় না
    if (tVerifyOn && !cap.tableRepairs) {
      try {
        const v = await CAP.verifyTables(queue, cap.blocks, measures, { onProgress: progress });
        cap.tableRepairs = v.repairs; cap.tableVerify = { asked: v.asked, fixed: v.fixed, mismatches: v.mismatches || 0, why: v.why, list: v.list };
      } catch (e) { (cap.issues = cap.issues || []).push({ kind: 'table_verify_failed', detail: String(e && e.message || e).slice(0, 120) }); }
    }
    // সংশোধিত বক্সসহ ব্লক (মূল ক্যাপচার অপরিবর্তিত — আবার নকশা করলেও দুবার সংশোধন হবে না)
    const capFixed = Object.assign({}, cap, { blocks: cap.blocks.map((b) => (fixedBox[b.i] ? Object.assign({}, b, { box: fixedBox[b.i] }) : b)) });
    const ir = IR.build(capFixed, measures, pageInfo);
    if (globalThis.__FZ_KEEP_MEASURES) globalThis.__FZ_LAST_MEASURES = { cap: capFixed, measures, pageInfo };   // নির্ণয় (qa/faithful-e2e → measures.json)
    // B5: আউটপুট-ফন্টে না-আঁটা লাইন (Word ভেঙে পাতা উপচাত) — ইনডেন্ট কমানো, দরকারে ফন্ট সামান্য ছোট
    const LF = pick('FayzarLineFit'), meas = LF ? await textMeasurer() : null;
    if (LF && meas) ir.lineFits = LF.fit(ir, meas);
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
            // a03 (২০২৬-১০-১২): ছবির-বাক্স (ফ্রেমের ভেতরে ছোট "ছবি") — Gemini-বক্স ফ্রেমের সামান্য ভেতরে হলে refineRect ফ্রেমকে
            // "পাশের দাগ" ভেবে বাদ দিত ⇒ শুধু লেখাটুকু কেটে মাপা প্রস্থে টেনে বিশাল "ছবি"। আসল-মাপের পাতায় কাটা অংশ মাপা
            // অংশের ৩৫%-এর কম হলে মাপা অংশটিই (ফ্রেমসহ, +২px)
            if (it.rect && page.scale === 1 && it.rect.w > 0 && it.rect.h > 0) {
              const k = W / page.widthPt, R = { x: it.rect.x * k - 2, y: it.rect.y * k - 2, w: it.rect.w * k + 4, h: it.rect.h * k + 4 };
              if (rect.w * rect.h < R.w * R.h * 0.35 && rect.x >= R.x - 4 && rect.y >= R.y - 4 && rect.x + rect.w <= R.x + R.w + 4 && rect.y + rect.h <= R.y + R.h + 4) rect = R;
            }
            // ২০২৬-১০-১৪ (a16 p1): সইয়ের নিচের অংশে নামের লাইন ("আক্তার") ছবিতেও ঢুকত, লেখাতেও আছে ⇒ দ্বিগুণ। ছবির নিচের ৪০%-এ শুরু হওয়া
            // লেখা-অনুচ্ছেদ (আড়াআড়ি ≥৩০% মিল) থাকলে তার ওপরে কাটা (≥৬০% উচ্চতা থাকে)। বন্ধ: FZ_OFF=FIGTXT
            // (ওপরের কিনারা মাপা কালির প্রথম লাইন থেকে — Gemini-বক্স উঁচুতে শুরু হয়ে হাতে-লেখা তারিখের নিচ কাটত)
            const srcW = pageInfo[page.page] && pageInfo[page.page].widthPt;
            if (!globalThis.__FZ_OFF_FIGTXT && it.kind === 'figure' && srcW) {
              for (const band of page.bands) for (const cell of band.cells) for (const t of cell.items) {
                if (t.kind !== 'para' || !t.box || !String(t.text || '').trim()) continue;
                // (IR শেষে it.m মুছে ফেলে ⇒ একই Gemini-বক্সের ব্লকের মাপ)
                const src = capFixed.blocks.find((cb) => cb.page === page.page && cb.box && cb.box.join() === t.box.join());
                const tm = src && measures[src.i], ml = tm && !tm.empty && Array.isArray(tm.lines) && tm.lines[0];
                if (!ml) continue;
                const lineY = ml.h > (tm.lineInkPt || 12) * 1.8 ? ml.y + ml.h - (tm.lineInkPt || 14) : (t.rect && t.rect.y > ml.y + 8 && page.scale === 1 ? t.rect.y : ml.y);
                const tr = Object.assign(FX.boxToRect(t.box, W, H, 0), { y: Math.round(lineY * W / srcW) });
                const ov = Math.min(rect.x + rect.w, tr.x + tr.w) - Math.max(rect.x, tr.x);
                if (ov < Math.min(tr.w, rect.w) * 0.3) continue;
                if (tr.y > rect.y + rect.h * 0.35 && tr.y < rect.y + rect.h) rect = Object.assign({}, rect, { h: Math.max(rect.h * 0.35, tr.y - rect.y - 1) });
              }
            }
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

  const faithfulStudioOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_FAITHFUL_STUDIO : global.__FZ_ON_FAITHFUL_STUDIO)
    || !!(typeof process !== 'undefined' && process.env && process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('FAITHFUL_STUDIO'));

  async function sendToStudio(irOrResult, opts, targetIframe) {
    if (!faithfulStudioOn()) return false;
    const o = opts || {};
    const B = pick('ConverterStudioBridge');
    const D = pick('FayzarFaithfulDocx');
    if (!B || typeof B.sendToStudio !== 'function') return false;
    const isResultObj = irOrResult && typeof irOrResult === 'object' && irOrResult.ir && Array.isArray(irOrResult.ir.pages);
    const ir = isResultObj ? irOrResult.ir : (irOrResult && Array.isArray(irOrResult.pages) ? irOrResult : o.ir);
    if (!ir) return false;
    let masterDocx = (isResultObj && (irOrResult.masterDocx || irOrResult.blob)) || o.masterDocx || null;
    if (!masterDocx && D && typeof D.build === 'function') {
      masterDocx = await D.build(ir, o);
    }
    const blocks = (D && typeof D.extractBlocks === 'function') ? D.extractBlocks(ir) : [];
    const text = o.text || blocks.map((b) => b.text).join('\n\n');
    return B.sendToStudio(Object.assign({}, o, { text, ir, masterDocx, mode: 'faithful' }), targetIframe || null);
  }

  async function produceWithFaithfulStudio(ir, format, opts, master, X) {
    const base = (format === 'docx-unicode' || !X)
      ? { blob: master, format: 'docx-unicode', steps: ['faithful-master'] }
      : await X.produce('', Object.assign({ format, masterDocx: master }, opts || {}));
    const out = Object.assign({}, base, { ir, masterDocx: master });
    if (opts && opts.sendToStudio) await sendToStudio(out, opts, opts.targetIframe || null);
    return out;
  }

  /** নকশা → ফাইল (format: 'doc' | 'docx-bijoy' | 'docx-unicode') */
  async function produce(ir, format, opts) {
    const D = pick('FayzarFaithfulDocx'), X = pick('FayzarExport');
    const master = await D.build(ir);
    if (faithfulStudioOn()) return produceWithFaithfulStudio(ir, format, opts, master, X);
    if (format === 'docx-unicode' || !X) return { blob: master, format: 'docx-unicode', steps: ['faithful-master'] };
    return X.produce('', Object.assign({ format, masterDocx: master }, opts || {}));
  }

  const FayzarFaithful = { MEASURE_DPI, capture, layout, produce, measureImage, splitFromNeighbor, isPageRangeOn, parsePageRange, filterQueueByRange };
  Object.defineProperties(FayzarFaithful, {
    sendToStudio: { value: sendToStudio, enumerable: false }
  });
  global.FayzarFaithful = FayzarFaithful;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarFaithful;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));