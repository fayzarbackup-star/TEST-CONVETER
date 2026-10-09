/**
 * Fayzar — ক্যাশমেমো (CASH_MEMO) লেআউট, ২-আপ/৩-আপ — Part-19.4
 * ==========================================================
 * দোকানের আসল নমুনা (`SAMPLE\Cash Memo (Write) - Copy.doc` = ২-আপ ফাঁকা, `SAMPLE\Jahid Hasan_Cash Memo-.doc` = ৩-আপ
 * পণ্য-তালিকাসহ; Word COM দিয়ে মাপা):
 *  - পাতা   : A4 ল্যান্ডস্কেপ; একই মেমো পাশাপাশি ২ বা ৩ কলামে (কলাম-ব্রেক), প্রতি কলামে ঠিক এক কপি
 *  - মাথা   : বিসমিল্লাহ (ছোট) → দোকানের নাম (বড় বোল্ড, এক লাইনে না ধরলে ছোট) → প্রোপ্রাইটর (কালো বাক্সে সাদা) →
 *             সেবা/ঠিকানা (বোল্ড) → মোবাইল/ই-মেইল → "ক্যাশ মেমো" (কালো বাক্সে সাদা)
 *  - ঘর     : "নাম: …… তারিখ: ……" — লেবেলের পরে ডট-লিডার ট্যাব (১.৫ লাইন)
 *  - ছক     : ক্রমিক/বিবরণ/পরিমাণ/দর/টাকা; ফাঁকা মেমোতে এক লম্বা সারি (শুধু খাড়া দাগ), পণ্য-তালিকায় প্রতি পণ্য এক সারি +
 *             নম্বরসহ ফাঁকা সারি দিয়ে কলামের নিচ পর্যন্ত ভরা; শেষে "সর্বমোট" সারি
 *  - নিচে   : কথায় (ডট-লিডার), দুই লাইন ফাঁক, বামে ক্রেতার / ডানে বিক্রেতার স্বাক্ষর
 *  - মাপ    : ২-আপ ১২pt (নাম ২৪pt), ৩-আপ ১০pt (নাম ২১pt)
 * কপি-সংখ্যা: options.copies → ফ্রন্টম্যাটার `copies` → ২। এক মডেল → DOCX / Word 2003 RTF / HTML প্রিভিউ।
 * উচ্চতা অনুমান রক্ষণশীল: কপি কলাম ছাপিয়ে গেলে পরের কপি ভুল কলামে যেত, তাই শুধু ফাঁকা সারি/লম্বা সারি ছোট-বড় হয়।
 */
(function (global) {
  'use strict';

  function measure(str, sz) {
    const P = global.CqBookletPlanner;
    if (P && typeof P.measure === 'function') return P.measure(str, sz);
    return Math.round(String(str || '').length * (sz / 2) * 20 * 0.55);
  }
  function lineCount(str, sz, w) {
    const P = global.CqBookletPlanner;
    if (P && typeof P.lineCount === 'function') return P.lineCount(str, sz, w);
    return Math.max(1, Math.ceil(measure(str, sz) / Math.max(600, w)));
  }
  function norm(text) {
    return String(text == null ? '' : text)
      .replace(/\u09AF\u09BC/g, '\u09DF').replace(/\u09A1\u09BC/g, '\u09DC').replace(/\u09A2\u09BC/g, '\u09DD')
      .replace(/\r\n?/g, '\n');
  }
  function cleanLine(l) {
    return String(l).replace(/\*\*/g, '').replace(/^\s*#{1,6}\s*/, '').replace(/^>\s*/, '').replace(/\s+$/, '').replace(/^\s+/, '');
  }
  const BN = '০১২৩৪৫৬৭৮৯';
  const toBn = (n) => String(n).replace(/\d/g, (d) => BN[+d]);
  const toNum = (s) => parseInt(String(s || '').replace(/[০-৯]/g, (d) => BN.indexOf(d)).replace(/\D/g, ''), 10);

  const RX = {
    frontmatter: /^---\s*\n[\s\S]*?\n---\s*\n?/,
    title: /^(?:ক্যাশ\s*মেমো|ক্যাশমেমো|ক্যাশ\s*মেমু|cash\s*memo|বিল\s*মেমো|বিল|চালান|ইনভ(?:য়|য়)েস|invoice)\s*[:ঃ]?$/i,
    bismillah: /বিসমিল্লা|بسم|৭৮৬|bismillah/i,
    proprietor: /^(?:প্রোঃ?|প্রো\.|প্রো:|প্রোপ্রাইটর|প্রোপ্রাইটারঃ?|স্বত্বাধিকারী|prop(?:rietor)?\.?)\s*[:ঃ.]?/i,
    contact: /(?:মোবাইল|মোবা|ফোন|হটলাইন|ই-?মেইল|e-?mail|phone|mobile|cell|[০0][১1][৩-৯3-9][০-৯0-9\-\s]{6,})/i,
    total: /^(?:সর্ব\s*মোট|মোট|grand\s*total|total)(?![ঀ-৿A-Za-z])/i,   // বাংলায় \b কাজ করে না
    inWords: /^(?:কথা(?:য়|য়)|in\s*words?)\s*[:ঃ\-]?/i,
    sign: /স্বাক্ষর|signature/i,
    label: /(?:^|\s)((?:অর্ডার|ডেলিভারি|সরবরাহ|ক্র(?:য়|য়)|বিক্র(?:য়|য়)|মেমো|বিল|চালান|ক্রমিক)\s*(?:তাং|তারিখ|নং|নম্বর)|নাম|তারিখ|তাং|ঠিকানা|মোবাইল|ফোন|গ্রাম|থানা|জেলা|name|date|address|mobile|phone|no\.?)(?:\s*[:ঃ\-–]|(?=[.…_]{2,}))/gi,
    placeholder: /^[\s.…_\-–—·]*$/
  };
  const DEFAULT_HEAD = ['ক্রমিক', 'বিবরণ', 'পরিমাণ', 'দর', 'টাকা'];

  /** কপি-সংখ্যা অনুযায়ী মাপ (অর্ধ-পয়েন্ট / টুইপ) — নমুনা থেকে */
  const UP = {
    2: { base: 24, bis: 24, shop: 48, prop: 24, serv: 24, addr: 30, contact: 24, title: 24, addrBold: true,
      top: 432, bottom: 288, left: 432, right: 432, gap: 864 },
    3: { base: 20, bis: 20, shop: 42, prop: 26, serv: 20, addr: 24, contact: 24, title: 28, addrBold: false,
      top: 432, bottom: 288, left: 288, right: 288, gap: 576 }
  };
  const PAGE = { pageW: 16838, pageH: 11906 };
  // Word-এ single লাইনের উচ্চতা: সুতন্নীএমজে ১.১৬৯em; কালপুরুষ ১.৫৭৫em ⇒ ইউনিকোড ফাইলে লাইন-গুণক ০.৭২
  // (প্রশ্নপত্রের মতো, FayzarLayoutUnits.examLineFactor) — তখন দুই ফন্টেই লাইন ≈১.১৭em, মাপ এক।
  // প্রস্থ: CqBookletPlanner.measure প্রশ্নপত্রের জন্য রক্ষণশীল — Word-এ মাপা আসল প্রস্থ/measure: সুতন্নী ০.৫৭–০.৭৮,
  // কালপুরুষ ০.৬৭–০.৯১ (পণ্য-নাম, সেবা-লাইন, ঠিকানা; ১০pt) ⇒ মোড়ানো গোনায় গুণক ০.৮২ / ০.৯৫।
  // Word-এ মাপা আসল লাইন-পিচ (single, সুতন্নী; কালপুরুষ ×০.৭২ একই বা কম): ≈১.২৫em — ৯pt ছকের সারি ২৬৫ টুইপ
  const LINE_EM = 1.26;
  const KALPURUSH = { line: 0.72 };
  const WIDTH_K = { bijoy: 0.82, unicode: 0.95 };
  const SLACK = 400;            // কলামের নিচে নিরাপত্তা-ফাঁক (টুইপ) — কপি যেন পরের কলামে না গড়ায়
  const MIN_BASE = 16;          // পণ্য বেশি হলে মূল সাইজ ধাপে ছোট — সর্বনিম্ন ৮pt
  const SPACER = 60;            // ঘর-লাইন আর ছকের মাঝের সরু ফাঁকা অনুচ্ছেদ (৩pt)

  const FayzarCashMemoLayout = {
    UP, PAGE,

    /** লেখাটা কি ক্যাশমেমো? (ফ্রন্টম্যাটার ছাড়া পাঠানো লেখার জন্য — শিরোনাম + ছকের দর/টাকা) */
    looksLike(text) {
      const t = norm(text);
      return /ক্যাশ\s*মেমো|ক্যাশমেমো|cash\s*memo/i.test(t) && /\|[^\n]*(?:দর|টাকা|মূল্য|rate|amount)[^\n]*\|/i.test(t);
    },

    copiesOf(options) {
      const o = options || {};
      const fm = o.__frontmatter || {};
      for (const v of [o.copies, o.memoCopies, fm.copies]) {
        const n = toNum(v);
        if (n === 2 || n === 3) return n;
      }
      return 2;
    },

    // ------------------------------------------------------------------ পার্স
    parse(rawText, options) {
      let t = norm(rawText);
      const fmM = t.match(RX.frontmatter);
      let fm = null;
      if (fmM) {
        fm = {};
        for (const ln of fmM[0].split('\n')) { const kv = ln.match(/^\s*([A-Za-z_]+)\s*:\s*(.*)$/); if (kv) fm[kv[1].toLowerCase()] = kv[2].trim(); }
        t = t.slice(fmM[0].length);
      }
      const opts = Object.assign({}, options || {});
      if (fm && !opts.__frontmatter) opts.__frontmatter = fm;
      const lines = t.split('\n').map((l) => l.replace(/\s+$/, ''));

      const model = { kind: 'CASH_MEMO_LAYOUT', copies: this.copiesOf(opts), header: [], title: '', fields: [], notes: [], table: null, total: null, inWords: null, sign: null, footNotes: [] };
      let stage = 'head';
      const tableRows = [];
      for (const raw of lines) {
        const isRow = /^\s*\|.*\|\s*$/.test(raw);
        const l = cleanLine(raw);
        if (!l && !isRow) continue;
        if (isRow) {
          if (/^\s*\|[\s:\-|]+\|\s*$/.test(raw)) continue;   // |---|---|
          const cells = raw.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => cleanLine(c));
          tableRows.push(cells);
          stage = 'after';
          continue;
        }
        if (stage === 'head' && RX.title.test(l.replace(/[*_]/g, ''))) { model.title = l; stage = 'fields'; continue; }
        // ঘর-লাইন: শিরোনামের পরে, অথবা মাথাতেই ফাঁকা ঘরসহ (মাথার "মোবাইল: ০১…" ঘর নয়)
        const segs = stage !== 'after' ? this._segments(l) : null;
        if (segs && (stage === 'fields' || segs.some((s) => !s.value))) {
          model.fields.push(segs);
          stage = 'fields';
          continue;
        }
        if (stage === 'head') { model.header.push(l); continue; }
        if (stage === 'fields') { model.notes.push(l); continue; }
        // ছকের পরে
        if (RX.total.test(l) && !model.total) { model.total = this._totalFromLine(l); continue; }
        if (RX.inWords.test(l)) {
          const m = l.match(RX.inWords), rest = l.slice(m[0].length).trim();
          const label = m[0].trim();
          model.inWords = [{ label: /[:ঃ\-]$/.test(label) ? label : label + ':', value: RX.placeholder.test(rest) ? '' : rest }];
          continue;
        }
        if (RX.sign.test(l)) { model.sign = this._signParts(raw); continue; }
        model.footNotes.push(l);
      }
      model.header = this._classifyHeader(model.header);
      model.table = this._table(tableRows, model);
      return model;
    },

    /** "নাম: ..... তারিখ: ....." → [{label:'নাম:', value:''}, {label:'তারিখ:', value:''}]; লেবেল না থাকলে null */
    _segments(line) {
      const s = String(line);
      const re = new RegExp(RX.label.source, 'gi');
      const hits = [];
      let m;
      while ((m = re.exec(s))) {
        const start = m.index + (m[0].length - m[0].replace(/^\s/, '').length);
        hits.push({ start, end: m.index + m[0].length });
      }
      if (!hits.length || hits[0].start > 0) return null;
      const segs = [];
      hits.forEach((h, i) => {
        const label = s.slice(h.start, h.end).trim();
        const value = s.slice(h.end, i + 1 < hits.length ? hits[i + 1].start : s.length).trim();
        segs.push({ label, value: RX.placeholder.test(value) ? '' : value });
      });
      return segs;
    },

    _totalFromLine(l) {
      const m = l.match(/^(.*?(?:মোট|total))\s*[:ঃ=\-]*\s*(.*)$/i);
      const label = m ? m[1].trim() : l;
      const value = m && !RX.placeholder.test(m[2]) ? m[2].trim() : '';
      return { label: /[:ঃ=]$/.test(label) ? label : label + ':', value };
    },

    _signParts(raw) {
      const s = cleanLine(raw).replace(/\|/g, '\t');
      let parts = s.split(/\t+|\s{3,}/).map((x) => x.trim()).filter(Boolean);
      if (parts.length < 2) {
        const m = s.match(/^(.*?স্বাক্ষর)\s+(.*স্বাক্ষর.*)$/);
        if (m) parts = [m[1].trim(), m[2].trim()];
      }
      return { left: parts[0] || '', right: parts.slice(1).join(' ') };
    },

    _classifyHeader(lines) {
      const out = [];
      let shopDone = false;
      for (const l of lines) {
        let role = 'serv';
        if (RX.bismillah.test(l) && !shopDone) role = 'bis';
        else if (!shopDone) { role = 'shop'; shopDone = true; }
        else if (RX.proprietor.test(l)) role = 'prop';
        else if (RX.contact.test(l)) role = 'contact';
        out.push({ role, text: l });
      }
      // যোগাযোগ-লাইনের ঠিক আগের সাধারণ লাইন = ঠিকানা (নমুনায় বড়); যোগাযোগ না থাকলে শেষ সাধারণ লাইন
      const ci = out.findIndex((x) => x.role === 'contact');
      const before = ci >= 0 ? out.slice(0, ci) : out;
      for (let i = before.length - 1; i >= 0; i--) { if (before[i].role === 'serv') { before[i].role = 'addr'; break; } if (before[i].role !== 'serv' && before[i].role !== 'prop') break; }
      return out;
    },

    /** ছক: প্রথম সারি হেডার (না থাকলে ডিফল্ট); "মোট" সারি আলাদা */
    _table(rows, model) {
      let head = DEFAULT_HEAD.slice();
      let body = rows.slice();
      if (body.length && this._isHeadRow(body[0])) head = body.shift();
      const n = head.length;
      const items = [];
      for (const r of body) {
        const cells = r.slice(0, n);
        while (cells.length < n) cells.push('');
        const first = cells.find((c) => c);
        if (first && RX.total.test(first)) {
          const val = cells.slice().reverse().find((c) => c && c !== first) || '';
          if (!model.total || !model.total.value) model.total = { label: /[:ঃ=]$/.test(first) ? first : first + ':', value: RX.placeholder.test(val) ? '' : val };
          continue;
        }
        items.push(cells);
      }
      if (!model.total) model.total = { label: 'সর্বমোট:', value: '' };
      // শুধু ক্রমিক-নম্বর আছে এমন ফাঁকা সারি = ছাপা মেমোর খালি ঘর (ফাঁকা-সারি দিয়ে আবার ভরা হবে)
      const serialCol = head.findIndex((h) => /ক্রম|ক্র:|নং|sl|no/i.test(h));
      const hasContent = (c) => c.some((x, i) => x && i !== serialCol);
      while (items.length && !hasContent(items[items.length - 1])) items.pop();
      return { head, items, serialCol, blank: !items.length };
    },

    _isHeadRow(cells) {
      return cells.some((c) => /বিবরণ|পণ্য|মালের|দর|টাকা|পরিমাণ|ক্রমিক|description|item|qty|rate|amount/i.test(c)) && !cells.some((c) => /^[০-৯0-9]+$/.test(c));
    },

    // ------------------------------------------------------------------ জ্যামিতি
    geometry(model, opts) {
      const o = opts || {};
      const up = (model && model.copies) === 3 ? 3 : 2;
      const U = UP[up];
      const g = Object.assign({ up }, PAGE, U);
      // isBijoy = শেষ ফাইল বিজয় (সুতন্নী); নইলে কালপুরুষ
      g.isBijoy = !!o.isBijoy;
      g.lineK = g.isBijoy ? 1 : KALPURUSH.line;
      g.wrapK = g.isBijoy ? WIDTH_K.bijoy : WIDTH_K.unicode;
      g.lineEm = LINE_EM;
      g.usableW = g.pageW - g.left - g.right;
      g.usableH = g.pageH - g.top - g.bottom;
      g.colW = Math.floor((g.usableW - g.gap * (up - 1)) / up);
      g.shopSz = U.shop;
      // দোকানের নাম এক লাইনে — না ধরলে ২pt করে ছোট (সর্বনিম্ন মূল সাইজের ১.২৫ গুণ)
      const shop = model && model.header.find((h) => h.role === 'shop');
      if (shop) while (g.shopSz > Math.round(U.base * 1.25) && measure(shop.text, g.shopSz) * 1.08 * g.wrapK > g.colW) g.shopSz -= 2;
      g.colWidths = this._colWidths(model ? model.table.head : DEFAULT_HEAD, g.colW, up);
      // কলামে না ধরলে (অনেক পণ্য) মূল সাইজ ১pt করে ছোট — মাথার সাইজ অপরিবর্তিত
      for (g.sz = U.base; ; g.sz -= 2) {
        g.rowH = Math.round(this.lh(g.sz, g) + 20);   // সব সারি exact (atLeast-এ বর্ডার যোগ হয়, .doc-এ আরও বেশি — Word-এ মাপা)
        if (this._fill(model, g) >= 0 || g.sz <= MIN_BASE) break;
      }
      return g;
    },

    /** মাথার লাইনের সাইজ: দোকানের নাম g.shopSz; সেবা/ঠিকানা/যোগাযোগ এক লাইনে ধরাতে সর্বোচ্চ ২pt ছোট (নমুনায় এক লাইন) */
    _hsz(g, hd) {
      if (hd.role === 'shop') return g.shopSz;
      let sz = g[hd.role] || g.sz;
      if (hd.role === 'serv' || hd.role === 'addr' || hd.role === 'contact') {
        const min = sz - 4;
        while (sz > min && measure(hd.text, sz) * g.wrapK * (hd.role === 'contact' ? 1 : 1.05) > g.colW) sz -= 2;
      }
      return sz;
    },

    /** single লাইনের উচ্চতা (টুইপ) */
    lh(sz, g) { return (sz / 2) * 20 * g.lineEm; },
    /** খালি অনুচ্ছেদ/ঘরে নিজের সাইজের একটি স্পেস — docx→doc খালি অনুচ্ছেদকে সাইজহীন &nbsp; (১২pt) বানায়, তাতে সারি উঁচু হতো */
    _spaceRun(sz) {
      return '<w:r><w:rPr><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>';
    },
    /** Word-এর w:line / \sl (ফন্ট-গুণক সহ) */
    lineVal(v, g) { return Math.round((v || 240) * g.lineK); },

    _colWidths(head, w, up) {
      const n = head.length;
      const kind = head.map((h) => (/ক্রম|ক্র:|নং|^sl|^no/i.test(h) ? 'serial' : /বিবরণ|পণ্য|মালের|নাম|description|item|particular/i.test(h) ? 'desc' : 'num'));
      if (!kind.includes('desc')) kind[Math.min(1, n - 1)] = 'desc';
      const frac = { serial: up === 3 ? 0.085 : 0.09, num: up === 3 ? 0.15 : 0.125 };
      const ws = kind.map((k) => (k === 'desc' ? 0 : Math.round(w * frac[k])));
      const rest = w - ws.reduce((a, b) => a + b, 0);
      const nd = kind.filter((k) => k === 'desc').length;
      return kind.map((k, i) => (k === 'desc' ? Math.floor(rest / nd) : ws[i]));
    },

    /** ছকের বাইরের সবকিছুর উচ্চতা → ফাঁকা সারির সংখ্যা / লম্বা সারির উচ্চতা */
    _fill(model, g) {
      if (!model) return 0;
      const lines = (txt, sz, w) => Math.max(1, lineCount(txt, sz, (w || g.colW) / g.wrapK));
      let h = 0;
      for (const hd of model.header) {
        const sz = this._hsz(g, hd);
        h += lines(hd.text + (hd.role === 'prop' ? '    ' : ''), sz) * this.lh(sz, g);
      }
      if (model.title) h += this.lh(g.title, g) + 40;
      for (const f of model.fields) h += 1.5 * this.lh(g.sz, g);
      for (const n of model.notes) h += lines(n, g.sz) * this.lh(g.sz, g);
      h += SPACER;
      // ছকের পরে
      const after = (model.inWords ? 1.5 : 0) + (model.sign ? 3 : 0) + model.footNotes.reduce((a, n) => a + lines(n, g.sz), 0);
      h += after * this.lh(g.sz, g) + 40;
      const head = this._rowHeight(model.table.head, g, true);
      const total = g.rowH;
      const itemsH = model.table.items.reduce((a, r) => a + this._rowHeight(r, g), 0);
      const left = g.usableH - SLACK - h - head - total - itemsH;
      g.fixedH = Math.round(h);
      if (model.table.blank) { g.tallRowH = Math.max(g.rowH * 3, Math.floor(left)); g.fillerRows = 0; }
      else { g.tallRowH = 0; g.fillerRows = Math.max(0, Math.floor(left / g.rowH)); }
      return model.table.blank ? left - g.rowH * 3 : left;
    },

    _rowHeight(cells, g, bold) {
      let n = 1;
      cells.forEach((c, i) => { if (c) n = Math.max(n, lineCount(c, g.sz, (g.colWidths[i] - 144) / g.wrapK / (bold ? 1.1 : 1))); });
      return Math.max(g.rowH, Math.round(n * this.lh(g.sz, g) + 20));
    },

    /** ফাঁকা সারির ক্রমিক — উৎসের ধরন (০১ / ১ / 01) মেনে */
    _serial(model, k) {
      const t = model.table;
      const prev = t.serialCol >= 0 ? t.items.map((r) => r[t.serialCol]).filter(Boolean) : [];
      const last = prev.length ? prev[prev.length - 1] : '';
      const base = Number.isFinite(toNum(last)) ? toNum(last) : t.items.length;
      const n = base + k;
      const pad = /^[০0]\d/.test(last) || /^[০0][০-৯0-9]/.test(last);
      let s = pad && n < 10 ? '0' + n : String(n);
      if (!last || /[০-৯]/.test(last)) s = toBn(s);
      return s;
    },

    // ------------------------------------------------------------------ DOCX
    /** @param h { runs(text, style) → <w:r>…</w:r>, isBijoy, geometry } */
    renderDocx(model, h) {
      const g = (h && h.geometry) || this.geometry(model, { isBijoy: h && h.isBijoy });
      const R = (t, st) => h.runs(t, Object.assign({ sz: g.sz }, st || {}));
      const sp = (line, rule) => '<w:spacing w:before="0" w:after="0" w:line="' + (rule === 'exact' ? line : this.lineVal(line, g)) + '" w:lineRule="' + (rule || 'auto') + '"/>';
      const P = (inner, o) => {
        o = o || {};
        return '<w:p><w:pPr>' + (o.keep ? '<w:keepNext/>' : '') + (o.tabs || '') + sp(o.line, o.rule) + (o.ind || '') + '<w:jc w:val="' + (o.jc || 'left') + '"/>' +
          '<w:rPr><w:sz w:val="' + (o.sz || g.sz) + '"/><w:szCs w:val="' + (o.sz || g.sz) + '"/></w:rPr></w:pPr>' + (inner || this._spaceRun(o.sz || g.sz)) + '</w:p>';
      };
      const boxed = (t, sz) => {
        const pad = '<w:r><w:rPr><w:color w:val="FFFFFF"/><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/><w:shd w:val="clear" w:color="auto" w:fill="000000"/></w:rPr><w:t xml:space="preserve">  </w:t></w:r>';
        return pad + R(t, { sz, b: true }).replace(/<\/w:rPr>/g, '<w:color w:val="FFFFFF"/><w:shd w:val="clear" w:color="auto" w:fill="000000"/></w:rPr>') + pad;
      };
      const one = this._docxCopy(model, g, { R, P, boxed });
      let xml = '';
      for (let i = 0; i < g.up; i++) {
        // কলাম-ব্রেক পরের কপির প্রথম অনুচ্ছেদের শুরুতে — আলাদা খালি অনুচ্ছেদ নিলে পরের কলামের মাথায় এক লাইন নষ্ট হতো
        xml += i === 0 ? one : one.replace(/(<w:p><w:pPr>[\s\S]*?<\/w:pPr>)/, '$1<w:r><w:br w:type="column"/></w:r>');
      }
      return xml;
    },

    _docxCopy(model, g, k) {
      const { R, P, boxed } = k;
      let xml = '';
      for (const hd of model.header) {
        const sz = this._hsz(g, hd);
        if (hd.role === 'prop') xml += P(boxed(hd.text, sz), { jc: 'center', sz });
        else xml += P(R(hd.text, { sz, b: hd.role === 'shop' || hd.role === 'prop' || hd.role === 'serv' || (hd.role === 'addr' && g.addrBold) }), { jc: 'center', sz });
      }
      if (model.title) xml += P(boxed(model.title, g.title), { jc: 'center', sz: g.title, line: 260 });
      for (const segs of model.fields) xml += this._docxFieldLine(segs, g, R, P);
      for (const n of model.notes) xml += P(R(n), { jc: 'center' });
      if (!xml) xml = P('');
      xml += P('', { line: SPACER, rule: 'exact', sz: 6 });
      xml += this._docxTable(model, g, R);
      if (model.inWords) xml += this._docxFieldLine(model.inWords, g, R, P);
      if (model.sign) {
        xml += P('') + P('', { keep: true });
        xml += P(R(model.sign.left) + (model.sign.right ? '<w:r><w:tab/></w:r>' + R(model.sign.right) : ''),
          { tabs: '<w:tabs><w:tab w:val="right" w:pos="' + (g.colW - 120) + '"/></w:tabs>', ind: '<w:ind w:left="120"/>' });
      }
      for (const n of model.footNotes) xml += P(R(n), { jc: 'center' });
      if (!model.inWords && !model.sign && !model.footNotes.length) xml += P('', { line: 20, rule: 'exact', sz: 2 });   // ছকের পরে বাধ্যতামূলক অনুচ্ছেদ
      return xml;
    },

    /** লেবেল + মান + ডট-লিডার ট্যাব; একাধিক ঘর সমান ভাগে (প্রথমটা চওড়া) */
    _fieldStops(segs, g) {
      const n = segs.length, w = g.colW;
      if (n === 1) return [w];
      if (n === 2) return [Math.round(w * 0.6), w];
      return segs.map((_, i) => Math.round(w * (i + 1) / n));
    },
    _docxFieldLine(segs, g, R, P) {
      const stops = this._fieldStops(segs, g);
      const tabs = '<w:tabs>' + stops.map((p, i) => '<w:tab w:val="' + (i === stops.length - 1 ? 'right' : 'left') + '" w:leader="dot" w:pos="' + p + '"/>').join('') + '</w:tabs>';
      let inner = '';
      segs.forEach((s, i) => {
        inner += R((i ? ' ' : '') + s.label + (s.value ? ' ' + s.value : ' '));
        inner += /\//.test(s.value) ? '' : '<w:r><w:tab/></w:r>';
      });
      return P(inner, { tabs, line: 360 });
    },

    _docxTable(model, g, R) {
      const t = model.table, ws = g.colWidths, n = ws.length;
      const B = (v) => '<w:' + v + ' w:val="single" w:sz="6" w:space="0" w:color="000000"/>';
      const NIL = (v) => '<w:' + v + ' w:val="nil"/>';
      const cell = (txt, i, o) => {
        o = o || {};
        const span = o.span || 1;
        const w = ws.slice(i, i + span).reduce((a, b) => a + b, 0);
        const bd = o.borders ? '<w:tcBorders>' + o.borders + '</w:tcBorders>' : '';
        return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (span > 1 ? '<w:gridSpan w:val="' + span + '"/>' : '') + bd + '<w:vAlign w:val="' + (o.valign || 'center') + '"/></w:tcPr>' +
          '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="' + this.lineVal(240, g) + '" w:lineRule="auto"/><w:jc w:val="' + (o.jc || 'left') + '"/><w:rPr><w:sz w:val="' + g.sz + '"/><w:szCs w:val="' + g.sz + '"/></w:rPr></w:pPr>' +
          (txt ? R(txt, { b: !!o.b }) : this._spaceRun(g.sz)) + '</w:p></w:tc>';
      };
      const row = (cells, hgt, rule) => '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="' + Math.round(hgt) + '" w:hRule="exact"/></w:trPr>' + cells + '</w:tr>';
      const numAlign = (i) => (i === t.serialCol ? 'center' : (i === 0 || /বিবরণ|পণ্য|মালের|description|item/i.test(t.head[i] || '') ? 'left' : 'right'));
      let rows = row(t.head.map((hd, i) => cell(hd, i, { jc: 'center', b: true })).join(''), this._rowHeight(t.head, g, true));
      if (t.blank) {
        // ফাঁকা মেমো: এক লম্বা সারি, ভেতরে শুধু খাড়া দাগ
        rows += row(t.head.map((_, i) => cell('', i, { borders: NIL('top') + NIL('bottom') })).join(''), g.tallRowH, 'exact');
      } else {
        for (const r of t.items) rows += row(r.map((c, i) => cell(c, i, { jc: numAlign(i) })).join(''), this._rowHeight(r, g));
        for (let k = 1; k <= g.fillerRows; k++) rows += row(t.head.map((_, i) => cell(i === t.serialCol ? this._serial(model, k) : '', i, { jc: numAlign(i) })).join(''), g.rowH, 'exact');
      }
      // সর্বমোট: লেবেল প্রথম n-1 ঘর জুড়ে ডানে, টাকা শেষ ঘরে
      const tot = model.total || { label: 'সর্বমোট:', value: '' };
      rows += row(cell(tot.label, 0, { span: n - 1, jc: 'right', b: true, borders: t.blank ? NIL('top') : '' }) + cell(tot.value, n - 1, { jc: 'right', b: true }), g.rowH);
      const all = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(B).join('');
      return '<w:tbl><w:tblPr><w:tblW w:w="' + g.colW + '" w:type="dxa"/><w:tblBorders>' + all + '</w:tblBorders><w:tblLayout w:type="fixed"/>' +
        '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="72" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="72" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
        '<w:tblGrid>' + ws.map((w) => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>' + rows + '</w:tbl>';
    },

    docxSectPr(g) {
      const G = g || this.geometry(null);
      return '<w:sectPr><w:pgSz w:w="' + G.pageW + '" w:h="' + G.pageH + '" w:orient="landscape"/>' +
        '<w:pgMar w:top="' + G.top + '" w:right="' + G.right + '" w:bottom="' + G.bottom + '" w:left="' + G.left + '" w:header="288" w:footer="288" w:gutter="0"/>' +
        '<w:cols w:num="' + G.up + '" w:space="' + G.gap + '"/></w:sectPr>';
    },

    // ------------------------------------------------------------------ Word 2003 (RTF)
    /** @param h { rtf(text) → RTF রান, fontName, isBijoy, geometry } */
    renderRtf(model, h) {
      const g = (h && h.geometry) || this.geometry(model, { isBijoy: h && h.isBijoy });
      const T = (t, st) => {
        let s = h.rtf(t);
        if (st && st.b) s = '{\\b ' + s + '}';
        return s;
      };
      const P = (body, o) => {
        o = o || {};
        const sz = o.sz || g.sz;
        return '{\\pard\\plain' + (o.keep ? '\\keepn' : '') + (o.jc || '\\ql') + '\\f0\\fs' + sz + '\\sl' + (o.exact ? o.sl : this.lineVal(o.sl, g)) + '\\slmult' + (o.exact ? '0' : '1') + '\\sb0\\sa0' + (o.tabs || '') + (o.li ? '\\li' + o.li : '') + ' ' + (body || '') + '\\par}\n';
      };
      const boxed = (t, sz) => '{\\b\\fs' + sz + '\\cf2\\highlight1   ' + h.rtf(t) + '  }';
      const field = (segs) => {
        const stops = this._fieldStops(segs, g);
        const tabs = stops.map((p, i) => '\\tldot' + (i === stops.length - 1 ? '\\tqr' : '') + '\\tx' + p).join('');
        let body = '';
        segs.forEach((s, i) => { body += T((i ? ' ' : '') + s.label + (s.value ? ' ' + s.value : ' ')) + (/\//.test(s.value) ? '' : '\\tab '); });
        return P(body, { tabs, sl: 360 });
      };
      let copy = '';
      for (const hd of model.header) {
        const sz = this._hsz(g, hd);
        copy += hd.role === 'prop' ? P(boxed(hd.text, sz), { jc: '\\qc', sz })
          : P(T(hd.text, { b: hd.role === 'shop' || hd.role === 'serv' || (hd.role === 'addr' && g.addrBold) }), { jc: '\\qc', sz });
      }
      if (model.title) copy += P(boxed(model.title, g.title), { jc: '\\qc', sz: g.title, sl: 260 });
      for (const segs of model.fields) copy += field(segs);
      for (const n of model.notes) copy += P(T(n), { jc: '\\qc' });
      if (!copy) copy = P('');
      copy += P('', { sz: 6, sl: -SPACER, exact: true });
      copy += this._rtfTable(model, g, T);
      if (model.inWords) copy += field(model.inWords);
      if (model.sign) copy += P('') + P('', { keep: true }) + P(T(model.sign.left) + (model.sign.right ? '\\tab ' + T(model.sign.right) : ''), { tabs: '\\tqr\\tx' + (g.colW - 120), li: 120 });
      for (const n of model.footNotes) copy += P(T(n), { jc: '\\qc' });
      let rtf = '{\\rtf1\\ansi\\deff0\n{\\fonttbl\n{\\f0\\fnil\\fcharset0 ' + (h.fontName || 'Kalpurush') + ';}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n' +
        '{\\colortbl;\\red0\\green0\\blue0;\\red255\\green255\\blue255;}\n' +
        '\\paperw' + g.pageW + '\\paperh' + g.pageH + '\\landscape\\margl' + g.left + '\\margr' + g.right + '\\margt' + g.top + '\\margb' + g.bottom + '\n' +
        '\\sectd\\cols' + g.up + '\\colsx' + g.gap + '\n';
      for (let i = 0; i < g.up; i++) rtf += (i ? '{\\pard\\plain\\fs2\\sl20\\slmult0\\column\\par}\n' : '') + copy;
      return rtf + '}\n';
    },

    _rtfTable(model, g, T) {
      const t = model.table, ws = g.colWidths, n = ws.length;
      const brd = (s) => '\\clbrdr' + s + '\\brdrs\\brdrw10';
      const def = (spans, opts) => {
        let x = 0, d = '';
        spans.forEach((sp, j) => {
          x += ws.slice(sp[0], sp[0] + sp[1]).reduce((a, b) => a + b, 0);
          const o = (opts && opts[j]) || {};
          d += '\\clvertalc' + (o.noTop ? '' : brd('t')) + brd('l') + (o.noBottom ? '' : brd('b')) + brd('r') + '\\cellx' + x;
        });
        return d;
      };
      const cell = (txt, o) => '\\pard\\plain\\intbl' + ((o && o.jc) || '\\ql') + '\\f0\\fs' + g.sz + '\\sl' + this.lineVal(240, g) + '\\slmult1 ' + (txt ? T(txt, { b: o && o.b }) : '') + '\\cell ';
      const row = (spans, cells, hgt, exact, opts) => '{\\trowd\\trgaph72\\trleft0\\trkeep\\trrh' + -Math.round(hgt) + def(spans, opts) + '\n' + cells + '\\row}\n';
      const each = ws.map((_, i) => [i, 1]);
      const jcOf = (i) => (i === t.serialCol ? '\\qc' : (i === 0 || /বিবরণ|পণ্য|মালের|description|item/i.test(t.head[i] || '') ? '\\ql' : '\\qr'));
      let rtf = row(each, t.head.map((hd) => cell(hd, { jc: '\\qc', b: true })).join(''), this._rowHeight(t.head, g, true));
      if (t.blank) rtf += row(each, t.head.map(() => cell('')).join(''), g.tallRowH, true, ws.map(() => ({ noTop: true, noBottom: true })));
      else {
        for (const r of t.items) rtf += row(each, r.map((c, i) => cell(c, { jc: jcOf(i) })).join(''), this._rowHeight(r, g));
        for (let k = 1; k <= g.fillerRows; k++) rtf += row(each, t.head.map((_, i) => cell(i === t.serialCol ? this._serial(model, k) : '', { jc: jcOf(i) })).join(''), g.rowH, true);
      }
      const tot = model.total || { label: 'সর্বমোট:', value: '' };
      rtf += row([[0, n - 1], [n - 1, 1]], cell(tot.label, { jc: '\\qr', b: true }) + cell(tot.value, { jc: '\\qr', b: true }), g.rowH, false, [{ noTop: t.blank }, {}]);
      return rtf + '\\pard\\plain\n';
    },

    // ------------------------------------------------------------------ HTML প্রিভিউ
    renderHtml(model, options, h) {
      const o = options || {};
      const isBijoy = o.font === 'bijoy' || o.font === 'sutonnymj';
      const g = this.geometry(model, { isBijoy });
      const esc = (h && h.esc) || ((s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      const inch = (tw) => (tw / 1440).toFixed(2) + 'in';
      const pt = (hp) => (hp / 2) + 'pt';
      const box = (t, sz) => '<span style="background: #000; color: #fff; font-weight: 700; padding: 0 0.5em; border-radius: 0.4em; font-size: ' + pt(sz) + ';">' + esc(t) + '</span>';
      const line = (inner, style) => '<div style="line-height: 1.3; ' + (style || '') + '">' + (inner || '&nbsp;') + '</div>';
      const field = (segs) => '<div style="display: flex; gap: 0.3em; line-height: 1.8;">' + segs.map((s, i) =>
        '<span style="display: flex; flex: ' + (segs.length === 2 && i === 0 ? 3 : 2) + '; white-space: nowrap;">' + esc(s.label) + '&nbsp;' + (s.value ? esc(s.value) : '') +
        '<span style="flex: 1; border-bottom: 1px dotted #000; margin: 0 0.2em 0.35em;"></span></span>').join('') + '</div>';
      let c = '';
      for (const hd of model.header) {
        const sz = this._hsz(g, hd);
        c += hd.role === 'prop' ? line(box(hd.text, sz), 'text-align: center;')
          : line(esc(hd.text), 'text-align: center; font-size: ' + pt(sz) + ';' + ((hd.role === 'shop' || hd.role === 'serv' || (hd.role === 'addr' && g.addrBold)) ? ' font-weight: 700;' : ''));
      }
      if (model.title) c += line(box(model.title, g.title), 'text-align: center; margin: 0.15em 0;');
      for (const segs of model.fields) c += field(segs);
      for (const n of model.notes) c += line(esc(n), 'text-align: center;');
      const t = model.table;
      const td = (txt, st) => '<td style="border: 1px solid #000; padding: 0 0.3em; ' + (st || '') + '">' + (txt ? esc(txt) : '&nbsp;') + '</td>';
      const colg = '<colgroup>' + g.colWidths.map((w) => '<col style="width: ' + (100 * w / g.colW).toFixed(1) + '%;">').join('') + '</colgroup>';
      let rows = '<tr>' + t.head.map((x) => td(x, 'text-align: center; font-weight: 700;')).join('') + '</tr>';
      if (t.blank) rows += '<tr style="height: ' + inch(g.tallRowH) + ';">' + t.head.map(() => td('', 'border-top: 0; border-bottom: 0;')).join('') + '</tr>';
      else {
        for (const r of t.items) rows += '<tr>' + r.map((x) => td(x)).join('') + '</tr>';
        for (let k = 1; k <= g.fillerRows; k++) rows += '<tr>' + t.head.map((_, i) => td(i === t.serialCol ? this._serial(model, k) : '')).join('') + '</tr>';
      }
      const tot = model.total || { label: 'সর্বমোট:', value: '' };
      rows += '<tr>' + td(tot.label, 'text-align: right; font-weight: 700;' + (t.blank ? ' border-top: 0;' : '')).replace('<td', '<td colspan="' + (t.head.length - 1) + '"') + td(tot.value, 'text-align: right; font-weight: 700;') + '</tr>';
      c += '<table style="width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 3pt;">' + colg + rows + '</table>';
      if (model.inWords) c += field(model.inWords);
      if (model.sign) c += '<div style="display: flex; justify-content: space-between; margin-top: 2.6em; padding: 0 0.1in;"><span>' + esc(model.sign.left) + '</span><span>' + esc(model.sign.right) + '</span></div>';
      for (const n of model.footNotes) c += line(esc(n), 'text-align: center;');
      const colDiv = '<div style="flex: 1; min-width: 0;">' + c + '</div>';
      const fontClass = isBijoy ? 'font-sutonny' : 'font-kalpurush';
      return '<div class="paper-sheet size-a4-landscape official-cash-memo-layout ' + fontClass + '" ' + (o.editable ? 'contenteditable="true" spellcheck="false" ' : '') +
        'style="padding: ' + inch(g.top) + ' ' + inch(g.right) + ' ' + inch(g.bottom) + ' ' + inch(g.left) + '; font-size: ' + pt(g.sz) + '; box-sizing: border-box;">' +
        '<div style="display: flex; gap: ' + inch(g.gap) + ';">' + new Array(g.up).fill(colDiv).join('') + '</div></div>';
    }
  };

  global.FayzarCashMemoLayout = FayzarCashMemoLayout;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarCashMemoLayout;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
