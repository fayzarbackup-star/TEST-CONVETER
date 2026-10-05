/**
 * Fayzar — সোর্স-চিত্র কাটার ইঞ্জিন (FayzarFigureExtractor)
 * ========================================================
 * পথ-১ (ব্যবহারকারীর সিদ্ধান্ত ২০২৬-১০-০৫): ছবি/PDF-এর যেখানে চিত্র আছে, সেটি মূল পাতা থেকে কেটে
 * পরিষ্কার করে প্রকৃত মাপে এডিটযোগ্য ফাইলে বসানো।
 *
 *  ১) Gemini OCR লেখায় চিত্রের জায়গায় ট্যাগ দেয়:  [[FIG:p=<পাতা>;box=<ymin>,<xmin>,<ymax>,<xmax>]]  (০–১০০০)
 *  ২) মূল পাতা আবার উচ্চ রেজোলিউশনে (≈৩০০ DPI) আঁকা — Gemini-তে পাঠানো সংকুচিত ছবি থেকে নয়
 *  ৩) বক্স নিখুঁত করা (আমাদের ইঞ্জিন): বক্সের ভেতরের কালির সীমা + গায়ে-লাগা লেবেল (A, B, O, ৫ সে.মি.)
 *     যতক্ষণ সংলগ্ন কালি আছে ততক্ষণ প্রান্ত বাড়ানো; ফাঁকা সাদা ফালিতে থামে (পাশের প্রশ্ন-লেখা ঢোকে না)
 *  ৪) পরিষ্কার: স্ক্যানের ধূসর/হলদে পটভূমি সাদা, বিচ্ছিন্ন দাগ মোছা, চারপাশের বাড়তি সাদা ছাঁটা
 *  ৫) মাপ: মূল পাতায় চিত্রের প্রকৃত প্রস্থ (ইঞ্চি); কলামের লেখার প্রস্থের বেশি হলে কলাম-প্রস্থ
 *  ৬) লেখায় ট্যাগের জায়গায় চিত্র-মার্কার QZFIGnQZ — চিত্র-স্টোর StudioFigurePipeline-এর একই কাঠামো
 *
 * বিশুদ্ধ হিসাব (ট্যাগ, বক্স, পরিষ্কার, মাপ) RGBA বাফারে — Node-এ টেস্টযোগ্য।
 * ব্রাউজার-অংশ (pdf.js দিয়ে পাতা আঁকা, ক্যানভাসে কাটা) আলাদা ফাংশনে।
 */
(function (global) {
  'use strict';

  const DPI = 300;
  const MAX_RENDER_PX = 5200;          // ব্রাউজার-ক্যানভাস সীমার নিচে নিরাপদ
  const A4_WIDTH_IN = 8.27;
  const DESKEW_MIN_DEG = 0.15;          // এর কম কাত চোখে পড়ে না — ঘোরালে বরং সামান্য ঝাপসা হয়
  const CSS_PX_PER_IN = 96;            // StudioFigurePipeline-এর cssW (EMU_PER_PX = 9525) ৯৬ DPI ধরে

  const bnToAscii = (s) => String(s == null ? '' : s).replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lum = (d, i) => (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;

  // ───────────────────────────── ১) ট্যাগ ─────────────────────────────
  // Part-16.3: Gemini ট্যাগের গঠন প্রতিবার হুবহু এক থাকে না (box=[..], "page=", পৃষ্ঠা=, বাড়তি ক্ষেত্র,
  // \[\[ এস্কেপ) — তাই যেকোনো [[FIG ...]] ধরা হয়, ভেতর থেকে পাতা ও ৪টি সংখ্যা সহনশীলভাবে পড়া হয়।
  const ANY_TAG_SRC = '\\\\?\\[\\\\?\\[\\s*FIG\\b([^\\n]*?)\\\\?\\]\\\\?\\](?!\\])';
  const anyTagRe = (lead) => new RegExp((lead ? '[ \\t]*' : '') + ANY_TAG_SRC, 'gi');

  /** ট্যাগের ভেতরের লেখা → { page, box } | null */
  function parseTagBody(body) {
    const b = bnToAscii(body);
    const pm = /(?:\bp(?:age|g)?|পৃষ্ঠা|পাতা)\s*[=:]\s*(\d+)/i.exec(b);
    let page = pm ? parseInt(pm[1], 10) : NaN;
    let nums;
    const bm = /box\s*[=:]?\s*([\s\S]*)$/i.exec(b);
    if (bm) nums = (bm[1].match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    else {
      const rest = pm ? b.slice(pm.index + pm[0].length) : b;
      nums = (rest.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      if (!pm && nums.length === 5) page = nums.shift();
    }
    if (!(page >= 1) || !nums || nums.length < 4) return null;
    let [ymin, xmin, ymax, xmax] = nums.slice(0, 4).map((n) => clamp(Math.round(n), 0, 1000));
    if (ymax < ymin) [ymin, ymax] = [ymax, ymin];
    if (xmax < xmin) [xmin, xmax] = [xmax, xmin];
    if (ymax - ymin < 5 || xmax - xmin < 5) return null;
    return { page, box: [ymin, xmin, ymax, xmax] };
  }

  /** লেখা থেকে চিত্র-ট্যাগ: [{ raw, index, page, box:[ymin,xmin,ymax,xmax] }] — অবৈধ বক্স বাদ */
  function parseTags(text) {
    const out = [];
    const s = String(text == null ? '' : text);
    const re = anyTagRe(false);
    let m;
    while ((m = re.exec(s)) !== null) {
      const t = parseTagBody(m[1]);
      if (t) out.push({ raw: m[0], index: m.index, page: t.page, box: t.box });
    }
    return out;
  }

  /** ট্যাগ → চিত্র-মার্কার (ক্রমিক id ১ থেকে, বা firstId থেকে); বাদ পড়া (অবৈধ) ট্যাগ লেখা থেকে মুছে যায় */
  function replaceTagsWithMarkers(text, firstId) {
    let id = Number.isFinite(firstId) ? firstId : 1;
    const ids = [];
    const out = normalizePlacement(text).replace(anyTagRe(false), (raw, body) => {
      if (!parseTagBody(body)) return '';
      ids.push(id);
      return 'QZFIG' + (id++) + 'QZ';
    });
    return { text: out, ids };
  }

  /** নিরাপত্তা-জাল: মূল পাতা হাতে না থাকলে (যেমন স্টুডিওতে) সব চিত্র-ট্যাগ — ভাঙা ট্যাগসহ — লেখা থেকে মোছা */
  function stripTags(text) {
    return normalizePlacement(text).replace(anyTagRe(true), '');
  }
  function hasLooseTags(text) {
    return anyTagRe(false).test(String(text == null ? '' : text));
  }

  /**
   * Part-16.3: ট্যাগের অবস্থান ঠিক করা — Gemini কখনো "১৭। [[FIG]]\nপ্রশ্নের লেখা" বা "১৭।\n[[FIG]]\nলেখা"
   * লেখে; ট্যাগ সরালে নম্বর একা লাইনে পড়ে প্রশ্ন ভেঙে যেত (নম্বর আলাদা অনুচ্ছেদ, ক্রম নতুন করে শুরু)।
   * নিয়ম: নম্বর + (শুধু ট্যাগ) + পরের লেখা ⇒ "১৭। লেখা [[FIG]]" (চিত্র প্রশ্নের লেখার ঠিক পরে বসে)।
   * অন্য সব লাইন অপরিবর্তিত।
   */
  const NUM_PREFIX_RE = /^(\s*(?:\*\*)?[0-9০-৯]{1,3}\s*[।.)](?:\*\*)?)\s*$/;
  const NUM_LINE_RE = /^\s*(?:\*\*)?[0-9০-৯]{1,3}\s*[।.)]/;
  function normalizePlacement(text) {
    const s = String(text == null ? '' : text);
    if (!anyTagRe(false).test(s)) return s;
    const lines = s.split('\n');
    const tagsOf = (l) => (l.match(anyTagRe(false)) || []).join(' ');
    const withoutTags = (l) => l.replace(anyTagRe(true), '').replace(/\s+$/, '');
    const isBlank = (l) => !l || !l.trim();
    const isTagOnly = (l) => !isBlank(l) && anyTagRe(false).test(l) && isBlank(withoutTags(l));
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const bare = withoutTags(line);
      const np = NUM_PREFIX_RE.exec(bare);
      if (np) {
        // নম্বর-একা (ট্যাগসহ বা ছাড়া) → পরের ট্যাগ-লাইন জমিয়ে প্রথম লেখার লাইনের সাথে জোড়া
        let tags = tagsOf(line);
        let j = i + 1;
        while (j < lines.length && (isBlank(lines[j]) || isTagOnly(lines[j]))) { if (isTagOnly(lines[j])) tags += (tags ? ' ' : '') + tagsOf(lines[j]); j++; }
        if (j < lines.length && !NUM_LINE_RE.test(lines[j]) && tags) {
          out.push(np[1] + ' ' + lines[j].trim() + ' ' + tags);
          i = j;
          continue;
        }
      }
      out.push(line);
    }
    return out.join('\n');
  }

  /** ০–১০০০ বক্স → পিক্সেল আয়তক্ষেত্র {x,y,w,h} (pad = পাতার ভগ্নাংশ) */
  function boxToRect(box, W, H, pad) {
    const p = Number.isFinite(pad) ? pad : 0;
    const [ymin, xmin, ymax, xmax] = box;
    const x0 = clamp(Math.floor((xmin / 1000 - p) * W), 0, W - 1);
    const y0 = clamp(Math.floor((ymin / 1000 - p) * H), 0, H - 1);
    const x1 = clamp(Math.ceil((xmax / 1000 + p) * W), x0 + 1, W);
    const y1 = clamp(Math.ceil((ymax / 1000 + p) * H), y0 + 1, H);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /** পিক্সেল আয়তক্ষেত্র → ০–১০০০ বক্স (রিভিউ স্ক্রিনে সংরক্ষণের জন্য) */
  function rectToBox(r, W, H) {
    return [Math.round(r.y / H * 1000), Math.round(r.x / W * 1000), Math.round((r.y + r.h) / H * 1000), Math.round((r.x + r.w) / W * 1000)];
  }

  // ───────────────────────────── ৩) বক্স নিখুঁত করা ─────────────────────────────
  /** img: {width,height,data(RGBA)}; ফালির ভেতরে কালির পিক্সেল-সংখ্যা */
  function inkCount(img, x0, y0, x1, y1, thr) {
    const W = img.width, d = img.data;
    let n = 0;
    for (let y = Math.max(0, y0); y < Math.min(img.height, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) if (lum(d, (y * W + x) * 4) < thr) n++;
    }
    return n;
  }

  /**
   * Gemini-বক্স → চিত্রের ঠিক চারপাশে (Part-16.3, আসল PDF-এ যাচাইকৃত)।
   * আসল স্ক্যানে Gemini-র বক্স প্রায় নিখুঁত; ঝুঁকি হলো বাড়তি কাটা (পাশের প্রশ্ন/অপশন/সমাধান)।
   * পদ্ধতি — সংযুক্ত কালি-খণ্ড (8-connected):
   *  • যে খণ্ড বক্সের ভেতরে অন্তত একটি পিক্সেল রাখে, তা বিবেচ্য
   *  • খণ্ডটি পুরোটা বক্স+maxGrow (পাতার ছোট দিকের ২.৫%) সীমার ভেতরে ⇒ পুরো খণ্ড (আধা-কাটা লেবেল A, B, M উদ্ধার)
   *  • খণ্ডের অর্ধেকের কম পিক্সেল বক্সের ভেতরে (প্রান্ত-ছোঁয়া পাশের লেখা/অপশন) ⇒ পুরো বাদ
   *  • সীমা ছাড়িয়ে গেলে (ছোট বক্সে কাটা বড় বৃত্ত/রেখা) ⇒ সীমা পর্যন্ত
   *  • বক্সের বাইরে থাকা খণ্ড (পাশের লেখা, বিন্দু-রেখা) কখনো নয়; অতি-ছোট দাগ (< minPix) উপেক্ষা
   *  তারপর চারপাশে margin।
   */
  function refineRect(img, rect, opts) {
    const o = opts || {};
    const W = img.width, H = img.height, d = img.data;
    const thr = o.inkThreshold || 170;
    const unit = Math.max(2, Math.round(Math.min(W, H) / 400));
    const maxGrow = Math.round(o.maxGrow != null ? o.maxGrow : Math.min(W, H) * 0.025);
    const margin = Math.round(o.margin != null ? o.margin : unit * 3);
    const minPix = o.minPix != null ? o.minPix : Math.max(4, unit * unit);
    const bx0 = clamp(Math.round(rect.x), 0, W - 1), by0 = clamp(Math.round(rect.y), 0, H - 1);
    const bx1 = clamp(Math.round(rect.x + rect.w), bx0 + 1, W), by1 = clamp(Math.round(rect.y + rect.h), by0 + 1, H);
    // অনুসন্ধান-এলাকা = বক্স + maxGrow (+১, সীমা ছোঁয়া খণ্ড চেনার জন্য)
    const gx0 = Math.max(0, bx0 - maxGrow - 1), gy0 = Math.max(0, by0 - maxGrow - 1);
    const gx1 = Math.min(W, bx1 + maxGrow + 1), gy1 = Math.min(H, by1 + maxGrow + 1);
    const lx0 = bx0 - maxGrow, ly0 = by0 - maxGrow, lx1 = bx1 + maxGrow, ly1 = by1 + maxGrow;
    const RW = gx1 - gx0, RH = gy1 - gy0;
    const ink = new Uint8Array(RW * RH);
    for (let yy = 0; yy < RH; yy++) for (let xx = 0; xx < RW; xx++) {
      if (lum(d, ((yy + gy0) * W + xx + gx0) * 4) < thr) ink[yy * RW + xx] = 1;
    }
    const seen = new Uint8Array(RW * RH);
    const stack = new Int32Array(RW * RH);
    let ux0 = Infinity, uy0 = Infinity, ux1 = -Infinity, uy1 = -Infinity;
    for (let yy = by0 - gy0; yy < by1 - gy0; yy++) for (let xx = bx0 - gx0; xx < bx1 - gx0; xx++) {
      const s0 = yy * RW + xx;
      if (!ink[s0] || seen[s0]) continue;
      // খণ্ড খোঁজা (BFS/স্ট্যাক)
      let sp = 0; stack[sp++] = s0; seen[s0] = 1;
      let cx0 = Infinity, cy0 = Infinity, cx1 = -Infinity, cy1 = -Infinity, n = 0, nIn = 0;
      let ix0 = Infinity, iy0 = Infinity, ix1 = -Infinity, iy1 = -Infinity;   // বক্সের ভেতরের অংশের সীমা
      while (sp) {
        const p = stack[--sp];
        const py = (p / RW) | 0, px = p - py * RW;
        const X = px + gx0, Y = py + gy0;
        n++;
        if (X < cx0) cx0 = X; if (X > cx1) cx1 = X; if (Y < cy0) cy0 = Y; if (Y > cy1) cy1 = Y;
        if (X >= bx0 && X < bx1 && Y >= by0 && Y < by1) { nIn++; if (X < ix0) ix0 = X; if (X > ix1) ix1 = X; if (Y < iy0) iy0 = Y; if (Y > iy1) iy1 = Y; }
        for (let dy = -1; dy <= 1; dy++) {
          const ny = py + dy; if (ny < 0 || ny >= RH) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx; if (nx < 0 || nx >= RW) continue;
            const q = ny * RW + nx;
            if (ink[q] && !seen[q]) { seen[q] = 1; stack[sp++] = q; }
          }
        }
      }
      if (n < minPix) continue;
      // বক্সের প্রান্ত সামান্য ছোঁয়া পাশের লেখা (খণ্ডের অর্ধেকের কম ভেতরে) ⇒ পুরো বাদ
      if (nIn * 2 < n) continue;
      const within = cx0 > lx0 && cy0 > ly0 && cx1 < lx1 - 1 && cy1 < ly1 - 1;
      const [a0, b0, a1, b1] = within ? [cx0, cy0, cx1, cy1]
        : [Math.max(cx0, lx0), Math.max(cy0, ly0), Math.min(cx1, lx1 - 1), Math.min(cy1, ly1 - 1)];
      if (a0 < ux0) ux0 = a0; if (b0 < uy0) uy0 = b0; if (a1 > ux1) ux1 = a1; if (b1 > uy1) uy1 = b1;
    }
    if (!(ux1 >= ux0 && uy1 >= uy0)) return { x: rect.x, y: rect.y, w: rect.w, h: rect.h, empty: true };
    const x = Math.max(0, ux0 - margin), y = Math.max(0, uy0 - margin);
    const x1 = Math.min(W, ux1 + 1 + margin), y1 = Math.min(H, uy1 + 1 + margin);
    return { x, y, w: x1 - x, h: y1 - y };
  }

  /**
   * Part-16.4: পাতার কাত (ডিগ্রি) — লেখার লাইনের অনুভূমিক প্রক্ষেপণ (projection profile)।
   * প্রতিটি কোণে কালি-বিন্দুগুলো y' = y·cosθ − x·sinθ সারিতে জমা; সারিগুলোর বর্গ-যোগফল সর্বোচ্চ
   * যে কোণে (লাইনগুলো সবচেয়ে "ধারালো") সেটাই কাত। ধনাত্মক = লাইন ডানে নামছে (ঘড়ির কাঁটার দিকে কাত)।
   * দ্রুততার জন্য ~১০০০px প্রস্থে নমুনা; ±maxDeg-এ ০.১° ধাপ, তারপর ০.০২° সূক্ষ্ম ধাপ।
   */
  function estimateSkew(img, opts) {
    const o = opts || {};
    const W = img.width, H = img.height, d = img.data;
    const thr = o.inkThreshold || 160;
    const maxDeg = o.maxDeg || 5;
    const stepPx = Math.max(1, Math.round(W / (o.sampleW || 1000)));
    const xs = [], ys = [];
    for (let y = 0; y < H; y += stepPx) for (let x = 0; x < W; x += stepPx) {
      if (lum(d, (y * W + x) * 4) < thr) { xs.push(x / stepPx); ys.push(y / stepPx); }
    }
    if (xs.length < 200) return 0;
    const n = xs.length, rows = Math.ceil(H / stepPx) + Math.ceil(W / stepPx) + 4, off = Math.ceil(W / stepPx) + 2;
    const hist = new Float64Array(rows);
    const score = (deg) => {
      const t = deg * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t);
      hist.fill(0);
      for (let i = 0; i < n; i++) { const r = Math.round(ys[i] * c - xs[i] * sn) + off; if (r >= 0 && r < rows) hist[r]++; }
      let sc = 0; for (let i = 0; i < rows; i++) sc += hist[i] * hist[i];
      return sc;
    };
    let best = 0, bestS = -1;
    for (let a = -maxDeg; a <= maxDeg + 1e-9; a += 0.1) { const v = score(a); if (v > bestS) { bestS = v; best = a; } }
    const c0 = best;
    for (let a = c0 - 0.1; a <= c0 + 0.1 + 1e-9; a += 0.02) { const v = score(a); if (v > bestS) { bestS = v; best = a; } }
    return Math.round(best * 100) / 100;
  }

  /**
   * Part-16.3: কাটা ছবির কিনারা ছোঁয়া কালি-খণ্ড = পাশের লেখার টুকরো (চিত্র মার্জিনের কারণে কিনারা ছোঁয় না) ⇒ সাদা।
   * নিরাপত্তা: মোট কালির ২৫%-এর বড় খণ্ড (ছোট বক্সে কাটা চিত্র নিজেই) কখনো মোছা হয় না। img in-place।
   */
  function clearBorderFragments(img, thr) {
    const W = img.width, H = img.height, d = img.data, T = thr || 170;
    const ink = new Uint8Array(W * H);
    let total = 0;
    for (let i = 0; i < W * H; i++) if (lum(d, i * 4) < T) { ink[i] = 1; total++; }
    if (!total) return 0;
    const seen = new Uint8Array(W * H), stack = new Int32Array(W * H);
    let cleared = 0;
    const visit = (s0) => {
      if (!ink[s0] || seen[s0]) return;
      const pix = []; let sp = 0; stack[sp++] = s0; seen[s0] = 1;
      while (sp) {
        const p = stack[--sp]; pix.push(p);
        const py = (p / W) | 0, px = p - py * W;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = py + dy; if (ny < 0 || ny >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx; if (nx < 0 || nx >= W) continue;
            const q = ny * W + nx; if (ink[q] && !seen[q]) { seen[q] = 1; stack[sp++] = q; }
          }
        }
      }
      if (pix.length * 4 > total) return;
      for (const p of pix) { d[p * 4] = d[p * 4 + 1] = d[p * 4 + 2] = 255; }
      cleared += pix.length;
    };
    for (let x = 0; x < W; x++) { visit(x); visit((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { visit(y * W); visit(y * W + W - 1); }
    return cleared;
  }

  // ───────────────────────────── ৪) পরিষ্কার ─────────────────────────────
  /**
   * পটভূমি সাদা (রঙ অক্ষত): উজ্জ্বলতম ~২০% পিক্সেল = পটভূমি ⇒ প্রতিটি চ্যানেল সেই অনুপাতে টেনে ২৫৫;
   * প্রায়-সাদা ⇒ খাঁটি সাদা; বিচ্ছিন্ন একক কালো দাগ (৮-প্রতিবেশীর ≤১টি কালো) ⇒ সাদা। img in-place।
   */
  function cleanImage(img) {
    const W = img.width, H = img.height, d = img.data;
    const n = W * H;
    if (!n) return img;
    const hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) hist[Math.round(lum(d, i * 4))]++;
    let acc = 0, bgLum = 255;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.20) { bgLum = v; break; } }
    let sr = 0, sg = 0, sb = 0, sc = 0;
    for (let i = 0; i < n; i++) {
      const k = i * 4;
      if (lum(d, k) >= bgLum) { sr += d[k]; sg += d[k + 1]; sb += d[k + 2]; sc++; }
    }
    const br = sc ? sr / sc : 255, bg = sc ? sg / sc : 255, bb = sc ? sb / sc : 255;
    const fr = br > 40 ? 255 / br : 1, fg = bg > 40 ? 255 / bg : 1, fb = bb > 40 ? 255 / bb : 1;
    for (let i = 0; i < n; i++) {
      const k = i * 4;
      let r = Math.min(255, d[k] * fr), g = Math.min(255, d[k + 1] * fg), b = Math.min(255, d[k + 2] * fb);
      if (r > 232 && g > 232 && b > 232) r = g = b = 255;
      d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255;
    }
    // বিচ্ছিন্ন দাগ
    const dark = new Uint8Array(n);
    for (let i = 0; i < n; i++) dark[i] = lum(d, i * 4) < 128 ? 1 : 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (!dark[i]) continue;
        const nb = dark[i - W - 1] + dark[i - W] + dark[i - W + 1] + dark[i - 1] + dark[i + 1] + dark[i + W - 1] + dark[i + W] + dark[i + W + 1];
        if (nb <= 1) { const k = i * 4; d[k] = d[k + 1] = d[k + 2] = 255; }
      }
    }
    return img;
  }

  /** চারপাশের সাদা ছাঁটার আয়তক্ষেত্র (কালি না থাকলে পুরোটা) */
  function trimRect(img, margin) {
    const W = img.width, H = img.height, d = img.data;
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (lum(d, (y * W + x) * 4) < 245) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return { x: 0, y: 0, w: W, h: H };
    const m = Number.isFinite(margin) ? margin : 4;
    const x0 = Math.max(0, minX - m), y0 = Math.max(0, minY - m);
    return { x: x0, y: y0, w: Math.min(W, maxX + 1 + m) - x0, h: Math.min(H, maxY + 1 + m) - y0 };
  }

  // ───────────────────────────── ৫) মাপ ─────────────────────────────
  /** কলামে চিত্রের সর্বোচ্চ প্রস্থ (ইঞ্চি) — লেখার প্রস্থ = কলাম − প্রশ্নের ইনডেন্ট, প্ল্যানার থেকে */
  function maxWidthIn(docType) {
    const t = String(docType || 'EXAM_CQ').toUpperCase();
    try {
      if (t === 'EXAM_MCQ' && global.McqLayoutPlanner) {
        const g = global.McqLayoutPlanner.geometry({});
        if (g && g.textW) return g.textW / 1440;
      }
      if (global.CqBookletPlanner) {
        const g = global.CqBookletPlanner.geometry({ docType: t === 'EXAM_MCQ' ? 'EXAM_CQ' : t });
        if (g && g.textW) return g.textW / 1440;
      }
    } catch (e) { /* ফলব্যাক নিচে */ }
    return 4.5;
  }

  /**
   * প্রকৃত প্রস্থ (ইঞ্চি) = কাটা অংশের পিক্সেল ÷ পাতার পিক্সেল × পাতার প্রকৃত প্রস্থ; কলামের বেশি হলে কলাম।
   * @returns {{ widthIn, cssW, clamped }}
   */
  function physicalSize(cropPxW, pagePxW, pageWidthIn, maxIn) {
    const pw = Number(pageWidthIn) > 0 ? Number(pageWidthIn) : A4_WIDTH_IN;
    let w = pagePxW > 0 ? (cropPxW / pagePxW) * pw : 2;
    const cap = Number(maxIn) > 0 ? Number(maxIn) : 4.5;
    const clamped = w > cap;
    if (clamped) w = cap;
    w = Math.max(0.4, w);
    return { widthIn: +w.toFixed(3), cssW: Math.round(w * CSS_PX_PER_IN), clamped };
  }

  // ───────────────────────────── ব্রাউজার-অংশ ─────────────────────────────
  const pdfCache = new Map();
  const pageCache = new Map();

  function pdfLib() { return (typeof window !== 'undefined') && (window['pdfjs-dist/build/pdf'] || window.pdfjsLib); }

  /**
   * filesQueue (ai-ocr-engine) → পাতার উৎস তালিকা, Gemini-কে যে ক্রমে পাঠানো হয়েছে সেই ক্রমে।
   * আইটেম: PDF-পাতা {file, pdfPage, pageWidthPt} | ছবি {file|base64} | কাঁচা PDF {file, isPdf} (সব পাতা বিস্তার)
   */
  async function buildPageSources(queue) {
    const out = [];
    for (const it of (queue || [])) {
      if (it && it.pdfPage) out.push({ kind: 'pdf', file: it.file, page: it.pdfPage, widthIn: (it.pageWidthPt || 595) / 72 });
      else if (it && it.isPdf && it.file && pdfLib()) {
        const pdf = await loadPdf(it.file);
        for (let p = 1; p <= pdf.numPages; p++) out.push({ kind: 'pdf', file: it.file, page: p, widthIn: null });
      } else if (it) out.push({ kind: 'image', file: it.file || null, base64: it.base64 || '', widthIn: null });
    }
    return out;
  }

  async function loadPdf(file) {
    const key = file.name + ':' + file.size + ':' + file.lastModified;
    if (!pdfCache.has(key)) {
      const lib = pdfLib();
      if (!lib) throw new Error('pdf.js লোড হয়নি');
      if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
      pdfCache.set(key, lib.getDocument({ data: await file.arrayBuffer() }).promise);
    }
    return pdfCache.get(key);
  }

  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('ছবি লোড হয়নি')); im.src = src; });
  }

  /** পাতা → উচ্চ-রেজোলিউশন ক্যানভাস {canvas, widthIn} (ক্যাশসহ) */
  async function renderPage(src) {
    const key = src.kind === 'pdf' ? ('pdf:' + src.file.name + ':' + src.file.size + ':' + src.page) : ('img:' + (src.file ? src.file.name + ':' + src.file.size : String(src.base64).slice(0, 64)));
    if (pageCache.has(key)) return pageCache.get(key);
    let result;
    if (src.kind === 'pdf') {
      const pdf = await loadPdf(src.file);
      const page = await pdf.getPage(src.page);
      const base = page.getViewport({ scale: 1 });
      let scale = DPI / 72;
      if (base.width * scale > MAX_RENDER_PX || base.height * scale > MAX_RENDER_PX) scale = Math.min(MAX_RENDER_PX / base.width, MAX_RENDER_PX / base.height);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      result = { canvas, widthIn: base.width / 72 };
    } else {
      const url = src.file ? URL.createObjectURL(src.file) : src.base64;
      const im = await loadImage(url);
      if (src.file) URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = im.naturalWidth; canvas.height = im.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(im, 0, 0);
      // ছবির DPI অজানা — প্রশ্নপত্র ধরে প্রস্থ = A4 (পোর্ট্রেট) বা A4-উচ্চতা (ল্যান্ডস্কেপ ছবি)
      result = { canvas, widthIn: canvas.width >= canvas.height ? 11.69 : A4_WIDTH_IN };
    }
    pageCache.set(key, result);
    return result;
  }

  /** পাতার পিক্সেল-ডেটা একবারই পড়া (৩০০ DPI A4 ≈ ৩৫ MB) — একই পাতার একাধিক চিত্রে পুনর্ব্যবহার */
  function pageImageData(pg) {
    if (!pg.imageData) pg.imageData = pg.canvas.getContext('2d').getImageData(0, 0, pg.canvas.width, pg.canvas.height);
    return pg.imageData;
  }

  /** পাতা-ক্যানভাস + আয়তক্ষেত্র → পরিষ্কার চিত্র {dataUrl, pxW, pxH, cssW, widthIn, clamped} */
  function cropClean(pageCanvas, rect, pageWidthIn, maxIn, angleDeg) {
    // Part-16.4: কাত সোজা করা — আয়তক্ষেত্রের কেন্দ্র ঘিরে পাতাকে −কাত ঘুরিয়ে আঁকা (কোণ কাটা না পড়তে চারপাশে বাড়তি জায়গা)
    const ang = Math.abs(angleDeg || 0) >= DESKEW_MIN_DEG ? angleDeg : 0;
    const pad = ang ? Math.ceil(Math.max(rect.w, rect.h) * Math.sin(Math.abs(ang) * Math.PI / 180)) + 2 : 0;
    const cw = rect.w + 2 * pad, ch = rect.h + 2 * pad;
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
    if (ang) {
      ctx.save();
      ctx.translate(cw / 2, ch / 2);
      ctx.rotate(-ang * Math.PI / 180);
      ctx.drawImage(pageCanvas, -(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
      ctx.restore();
    } else {
      ctx.drawImage(pageCanvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    }
    const id = ctx.getImageData(0, 0, cw, ch);
    cleanImage(id);
    clearBorderFragments(id, 245);   // হালকা-ধূসর টুকরোও (পরিষ্কারের পর পটভূমি সাদা)
    const t = trimRect(id, Math.max(4, Math.round(rect.w / 150)));
    ctx.putImageData(id, 0, 0);
    const out = document.createElement('canvas');
    out.width = t.w; out.height = t.h;
    out.getContext('2d').drawImage(c, t.x, t.y, t.w, t.h, 0, 0, t.w, t.h);
    const size = physicalSize(t.w, pageCanvas.width, pageWidthIn, maxIn);
    return { dataUrl: out.toDataURL('image/png'), pxW: t.w, pxH: t.h, cssW: size.cssW, widthIn: size.widthIn, clamped: size.clamped, angle: ang };
  }

  /**
   * পুরো কাজ: লেখার ট্যাগ → কাটা চিত্র + মার্কারসহ লেখা।
   * @returns {{ text, items: [{ id, page, box, rect, pageCanvas, pageWidthIn, fig, error? }] }}
   */
  async function extract(text, queue, opts) {
    const o = opts || {};
    const tags = parseTags(text);
    if (!tags.length) return { text, items: [] };
    const sources = await buildPageSources(queue);
    const maxIn = o.maxWidthIn || maxWidthIn(o.docType);
    const { text: marked, ids } = replaceTagsWithMarkers(text, o.firstId || 1);
    const items = [];
    for (let i = 0; i < tags.length; i++) {
      const tg = tags[i];
      const item = { id: ids[i], page: tg.page, box: tg.box.slice(), maxWidthIn: maxIn, align: 'center' };
      try {
        const src = sources[tg.page - 1];
        if (!src) throw new Error('পাতা ' + tg.page + ' পাওয়া যায়নি');
        const pg = await renderPage(src);
        const W = pg.canvas.width, H = pg.canvas.height;
        const img = pageImageData(pg);
        const rect = refineRect(img, boxToRect(tg.box, W, H, 0));
        if (pg.skew == null) pg.skew = (o.deskew === false) ? 0 : estimateSkew(img);
        item.pageCanvas = pg.canvas;
        item.pageRef = pg;
        item.pageWidthIn = src.widthIn || pg.widthIn;
        item.rect = rect;
        item.angle = pg.skew;
        item.fig = Object.assign(cropClean(pg.canvas, rect, item.pageWidthIn, maxIn, item.angle), { align: 'center', name: 'চিত্র ' + ids[i], source: 'ocr', page: tg.page });
      } catch (e) {
        item.error = e && e.message;
      }
      items.push(item);
    }
    return { text: marked, items };
  }

  /** রিভিউ স্ক্রিনে নতুন আয়তক্ষেত্রে আবার কাটা */
  function recrop(item, rect, refine) {
    const W = item.pageCanvas.width, H = item.pageCanvas.height;
    let r = { x: clamp(Math.round(rect.x), 0, W - 1), y: clamp(Math.round(rect.y), 0, H - 1), w: 0, h: 0 };
    r.w = clamp(Math.round(rect.w), 2, W - r.x); r.h = clamp(Math.round(rect.h), 2, H - r.y);
    if (refine) r = refineRect(item.pageRef ? pageImageData(item.pageRef) : item.pageCanvas.getContext('2d').getImageData(0, 0, W, H), r);
    item.rect = r;
    item.box = rectToBox(r, W, H);
    const keep = item.fig || {};
    item.fig = Object.assign(cropClean(item.pageCanvas, r, item.pageWidthIn, item.maxWidthIn, item.angle || 0), { align: keep.align || 'center', name: keep.name, source: 'ocr', page: item.page });
    return item;
  }

  const FayzarFigureExtractor = {
    DPI, CSS_PX_PER_IN, parseTagBody, normalizePlacement,
    parseTags, replaceTagsWithMarkers, stripTags, hasLooseTags, boxToRect, rectToBox,
    refineRect, estimateSkew, cleanImage, clearBorderFragments, trimRect, maxWidthIn, physicalSize,
    buildPageSources, renderPage, cropClean, extract, recrop,
    hasTags: (text) => parseTags(text).length > 0
  };

  global.FayzarFigureExtractor = FayzarFigureExtractor;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarFigureExtractor;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
