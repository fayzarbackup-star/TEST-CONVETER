/**
 * Fayzar — টাকা প্রাপ্তির রসিদ ও খরচের ভাউচার লেআউট — TEMPLATE_COMPOSE_PLAN T2 দল ৪
 * ==================================================================================
 * দোকানের নমুনা নেই (মালিকের সিদ্ধান্ত ২০২৬-১০-১১: প্রচলিত বাংলাদেশি নকশায়, পরে Word-এ দেখে ঠিক)।
 * doc_type CASH_MEMO-ই; ছাঁচ ফ্রন্টম্যাটারে `memo_kind: receipt | voucher` তালা দিলে তবেই এই মডিউল (wants) —
 * ছাঁচ ছাড়া লেখা আগের মতো cash-memo-layout-এ।
 *  - পাতা  : copies ১ = A5 লম্বালম্বি; ২/৩ = A4 ল্যান্ডস্কেপে পাশাপাশি একই কপি (কলাম-ব্রেক, ক্যাশমেমোর মতো)
 *  - মাথা  : বিসমিল্লাহ (ছোট) → প্রতিষ্ঠান/দোকানের নাম (বড় বোল্ড) → প্রোপ্রাইটর/ঠিকানা → মোবাইল → শিরোনাম (কালো বাক্সে সাদা)
 *  - ঘর    : "রসিদ নং: …… তারিখ: ……" — লেবেলের পরে ডট-লিডার ট্যাব
 *  - রসিদ  : মূল বাক্য (দুই-পাশে সমান, লাইন ১.৫ — হাতে লেখার জায়গা) → টাকার বাক্স → স্বাক্ষর
 *  - ভাউচার: ক্রমিক/বিবরণ/টাকা ছক (কমপক্ষে ৬ সারি, শেষে মোট) → কথায় → ২–৪ জনের স্বাক্ষর পাশাপাশি
 * এক মডেল → DOCX / Word 2003 RTF / HTML প্রিভিউ। ক্রম কখনো বদলানো হয় না।
 */
(function (global) {
  'use strict';

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
    frontmatter: /^\uFEFF?---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/,
    title: /^(?:মানি\s*রিসিপ্ট|মানি\s*রিসিট|টাকা\s*প্রাপ্তির\s*রসিদ|প্রাপ্তি\s*রসিদ|প্রাপ্তি\s*স্বীকার\s*পত্র|রসিদ|রশিদ|money\s*receipt|receipt|(?:ডেবিট|ক্রেডিট|ক্যাশ|নগদ|খরচের|ব্যয়ের|পেমেন্ট)\s*ভাউচার|ভাউচার|(?:debit|credit|cash|payment)?\s*voucher)\s*[:ঃ]?$/i,
    bismillah: /বিসমিল্লা|بسم|৭৮৬|bismillah/i,
    proprietor: /^(?:প্রোঃ?|প্রো\.|প্রো:|প্রোপ্রাইটর|স্বত্বাধিকারী|prop(?:rietor)?\.?)\s*[:ঃ.]?/i,
    contact: /(?:মোবাইল|মোবা|ফোন|হটলাইন|ই-?মেইল|e-?mail|phone|mobile|[০0][১1][৩-৯3-9][০-৯0-9\-\s]{6,})/i,
    tableRow: /^\|.*\|$/,
    tableSep: /^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?$/,
    total: /^(?:সর্ব\s*মোট|মোট|grand\s*total|total)(?![ঀ-৿A-Za-z])/i,
    amount: /^(?:টাকা|tk\.?|৳)\s*[:ঃ=]?\s*(.*)$/i,
    sign: /স্বাক্ষর|signature/i,
    signWord: /^(?:প্রস্তুতকারী|প্রস্তুতকারক|হিসাবরক্ষক|হিসাব\s*রক্ষক|অনুমোদনকারী|অনুমোদনকারীর|গ্রহীতা|গ্রহীতার|প্রাপক|প্রাপকের|ক্যাশিয়ার|পরিশোধকারী|ম্যানেজার|সভাপতি|সম্পাদক|কোষাধ্যক্ষ|প্রধান\s*শিক্ষক|অধ্যক্ষ|কর্মকর্তা|prepared|checked|approved|received)/i,
    field: /^([^:ঃ।|]{1,30}?[:ঃ])\s*(.*)$/,
    placeholder: /^[\s.…_\-–—·]*$/,
    sentenceEnd: /[।?!]\s*$/
  };
  for (const k of Object.keys(RX)) RX[k] = new RegExp(norm(RX[k].source), RX[k].flags);

  const SIZES = {
    1: { base: 24, bis: 22, shop: 40, prop: 24, addr: 24, contact: 22, title: 26, top: 576, bottom: 432, left: 576, right: 576, gap: 0 },
    2: { base: 24, bis: 22, shop: 40, prop: 24, addr: 24, contact: 22, title: 26, top: 576, bottom: 432, left: 576, right: 576, gap: 864 },
    3: { base: 20, bis: 20, shop: 34, prop: 20, addr: 20, contact: 20, title: 24, top: 432, bottom: 288, left: 360, right: 360, gap: 576 }
  };
  const PAGE_L = { pageW: 16838, pageH: 11906 };   // A4 ল্যান্ডস্কেপ
  const PAGE_A5 = { pageW: 8391, pageH: 11906 };   // A5 লম্বালম্বি
  const MIN_ROWS = 6;                               // ভাউচারের ছকে কমপক্ষে এত সারি (হাতে লেখার জন্য)
  const DEFAULT_HEAD = ['ক্রমিক', 'বিবরণ', 'টাকা'];

  function readFm(text) {
    const m = norm(text).match(RX.frontmatter);
    const fm = {};
    if (m) for (const ln of m[1].split('\n')) { const kv = ln.match(/^\s*([A-Za-z_]+)\s*:\s*(.*)$/); if (kv) fm[kv[1].toLowerCase()] = kv[2].trim(); }
    return { fm, body: m ? norm(text).slice(m[0].length) : norm(text) };
  }
  function kindOf(text, options) {
    const o = options || {};
    const fm = Object.assign({}, readFm(text).fm, o.__frontmatter || {});
    const k = String(o.memoKind || fm.memo_kind || '').trim().toLowerCase();
    return k === 'receipt' || k === 'voucher' ? k : '';
  }

  const FayzarReceiptLayout = {
    RX, SIZES, MIN_ROWS,

    /** ছাঁচের তালা (`memo_kind: receipt|voucher`) থাকলে তবেই এই লেআউট */
    wants(text, options) { return !!kindOf(text, options); },

    copiesOf(variant, options, fm) {
      const o = options || {};
      for (const v of [o.copies, (o.__frontmatter || {}).copies, (fm || {}).copies]) {
        const n = toNum(v);
        if (n === 1 || n === 2 || n === 3) return n;
      }
      return variant === 'voucher' ? 1 : 2;
    },

    // ------------------------------------------------------------------ পার্স
    parse(rawText, options) {
      const { fm, body } = readFm(rawText);
      const variant = kindOf(rawText, options) || 'receipt';
      const model = { kind: 'RECEIPT_LAYOUT', version: 1, variant, copies: this.copiesOf(variant, options, fm), header: [], title: '', blocks: [] };
      const lines = body.split('\n').map((l) => l.replace(/\s+$/, ''));
      const ti = lines.findIndex((l) => RX.title.test(cleanLine(l).replace(/[*_]/g, '')));
      let start = 0;
      if (ti >= 0) {
        model.header = lines.slice(0, ti).map(cleanLine).filter(Boolean);
        model.title = cleanLine(lines[ti]);
        start = ti + 1;
      } else {
        // শিরোনাম নেই: শুরুর ছোট, ঘর-নয় এমন লাইন (সর্বোচ্চ ৫) মাথা
        while (start < lines.length && model.header.length < 5) {
          const t = cleanLine(lines[start]);
          if (!t) { start++; continue; }
          if (t.length > 60 || RX.tableRow.test(t) || RX.field.test(t) || RX.sign.test(t)) break;
          model.header.push(t); start++;
        }
      }
      model.header = this._classifyHeader(model.header);

      let table = null;
      for (let i = start; i < lines.length; i++) {
        const raw = lines[i].trim();
        if (!raw) { table = null; continue; }
        if (RX.tableRow.test(raw)) {
          if (RX.tableSep.test(raw)) continue;
          const cells = raw.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => cleanLine(c));
          if (!table) { table = { kind: 'table', rows: [] }; model.blocks.push(table); }
          table.rows.push(cells);
          continue;
        }
        table = null;
        const t = cleanLine(raw);
        const parts = this._signParts(t);
        if (parts) { model.blocks.push({ kind: 'sign', parts }); continue; }
        const am = t.match(RX.amount);
        if (am && t.length <= 40) { model.blocks.push({ kind: 'amount', label: t.slice(0, t.length - am[1].length).trim(), value: RX.placeholder.test(am[1]) ? '' : am[1].trim() }); continue; }
        const segs = this._segments(t);
        if (segs) { model.blocks.push({ kind: 'fields', segs }); continue; }
        model.blocks.push({ kind: 'para', text: t });
      }
      for (const b of model.blocks) if (b.kind === 'table') Object.assign(b, this._table(b.rows));
      return model;
    },

    _classifyHeader(lines) {
      let shopDone = false;
      return lines.map((l) => {
        let role = 'addr';
        if (RX.bismillah.test(l) && !shopDone) role = 'bis';
        else if (!shopDone) { role = 'shop'; shopDone = true; }
        else if (RX.proprietor.test(l)) role = 'prop';
        else if (RX.contact.test(l)) role = 'contact';
        return { role, text: l };
      });
    },

    /** "রসিদ নং: …… তারিখ: ……" → [{label, value}]; বাক্য (।) বা লেবেলহীন লাইন হলে null */
    _segments(t) {
      if (t.length > 140 || RX.sentenceEnd.test(t)) return null;
      const chunks = t.replace(/\s+(?=(?:তারিখ|তাং|date)\s*[:ঃ])/gi, '\t').split(/\t+|\s{2,}/).map((x) => x.trim()).filter(Boolean);
      const segs = [];
      for (const c of chunks) {
        const m = c.match(RX.field);
        if (!m) { if (!segs.length) return null; segs[segs.length - 1].value += (segs[segs.length - 1].value ? ' ' : '') + c; continue; }
        segs.push({ label: m[1].trim(), value: RX.placeholder.test(m[2]) ? '' : m[2].trim() });
      }
      return segs.length ? segs : null;
    },

    /** স্বাক্ষর-লাইন → অংশগুলো (বামে→ডানে); স্বাক্ষর-লাইন না হলে null */
    _signParts(t) {
      if (t.length > 160) return null;
      let parts = t.replace(/\|/g, '\t').split(/\t+|\s{3,}/).map((x) => x.trim()).filter(Boolean);
      if (RX.sign.test(t)) {
        if (parts.length < 2) {
          const m = t.match(/\S.*?(?:স্বাক্ষর|signature)(?:\s*[(（][^)）]*[)）])?/gi);
          if (m && m.length > 1) parts = m.map((x) => x.trim());
        }
        return parts.length <= 4 ? parts : null;
      }
      if (parts.length >= 2 && parts.length <= 4 && parts.every((p) => p.length <= 30 && RX.signWord.test(p))) return parts;
      return null;
    },

    /** ছক: প্রথম সারি হেডার (না থাকলে ডিফল্ট); "মোট" সারি আলাদা */
    _table(rows) {
      let head = DEFAULT_HEAD.slice();
      const body = rows.slice();
      if (body.length && body[0].some((c) => /বিবরণ|খাত|টাকা|ক্রমিক|পরিমাণ|description|particular|amount/i.test(c)) && !body[0].some((c) => /^[০-৯0-9]+$/.test(c))) head = body.shift();
      const n = head.length;
      const items = [];
      let total = null;
      for (const r of body) {
        const cells = r.slice(0, n);
        while (cells.length < n) cells.push('');
        const first = cells.find((c) => c);
        if (first && RX.total.test(first)) {
          const val = cells.slice().reverse().find((c) => c && c !== first) || '';
          total = { label: /[:ঃ=]$/.test(first) ? first : first + ':', value: RX.placeholder.test(val) ? '' : val };
          continue;
        }
        items.push(cells);
      }
      const serialCol = head.findIndex((h) => /ক্রম|ক্র:|নং|^sl|^no/i.test(h));
      const amountCol = n - 1;
      while (items.length && !items[items.length - 1].some((x, i) => x && i !== serialCol)) items.pop();
      return { head, items, serialCol, amountCol, total: total || { label: 'মোট:', value: '' } };
    },

    // ------------------------------------------------------------------ জ্যামিতি
    geometry(model) {
      const up = (model && model.copies) || 2;
      const S = SIZES[up] || SIZES[2];
      const g = Object.assign({ up, landscape: up > 1, sz: S.base }, up > 1 ? PAGE_L : PAGE_A5, S);
      g.usableW = g.pageW - g.left - g.right;
      g.colW = Math.floor((g.usableW - g.gap * (up - 1)) / up);
      return g;
    },

    _colWidths(t, w) {
      const n = t.head.length;
      const kind = t.head.map((h, i) => (i === t.serialCol ? 'serial' : /বিবরণ|খাত|description|particular/i.test(h) ? 'desc' : 'num'));
      if (!kind.includes('desc')) kind[Math.min(1, n - 1)] = 'desc';
      const ws = kind.map((k) => (k === 'serial' ? Math.round(w * 0.11) : k === 'num' ? Math.round(w * 0.22) : 0));
      const rest = w - ws.reduce((a, b) => a + b, 0);
      const nd = kind.filter((k) => k === 'desc').length;
      return kind.map((k, i) => (k === 'desc' ? Math.floor(rest / nd) : ws[i]));
    },

    /** ফাঁকা সারির সংখ্যা (কমপক্ষে MIN_ROWS সারি) ও তাদের ক্রমিক */
    _fillers(t) {
      const k = Math.max(0, MIN_ROWS - t.items.length);
      const last = t.serialCol >= 0 ? t.items.map((r) => r[t.serialCol]).filter(Boolean).pop() || '' : '';
      const base = Number.isFinite(toNum(last)) ? toNum(last) : t.items.length;
      return Array.from({ length: k }, (_, j) => (t.serialCol < 0 ? '' : (!last || /[০-৯]/.test(last) ? toBn(base + j + 1) : String(base + j + 1))));
    },

    /** স্বাক্ষর-অংশের ট্যাব: ১টি ডানে, ২টি দুই প্রান্তে, ৩–৪টি সমান ভাগে মাঝ-বরাবর */
    _signTabs(n, w) {
      if (n === 1) return [{ val: 'right', pos: w }];
      if (n === 2) return [{ val: 'right', pos: w }];
      return Array.from({ length: n }, (_, i) => ({ val: 'center', pos: Math.round(w * (2 * i + 1) / (2 * n)) }));
    },
    _fieldStops(n, w) {
      if (n === 1) return [w];
      if (n === 2) return [Math.round(w * 0.6), w];
      return Array.from({ length: n }, (_, i) => Math.round(w * (i + 1) / n));
    },
    _hsz(g, hd) { return g[hd.role] || g.sz; },

    // ------------------------------------------------------------------ DOCX
    /** @param h { runs(text, style) → <w:r>…</w:r>, geometry } */
    renderDocx(model, h) {
      const g = (h && h.geometry) || this.geometry(model);
      const R = (t, st) => h.runs(t, Object.assign({ sz: g.sz }, st || {}));
      const space = (sz) => '<w:r><w:rPr><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>';
      const P = (inner, o) => {
        o = o || {};
        const sz = o.sz || g.sz;
        return '<w:p><w:pPr>' + (o.keep ? '<w:keepNext/>' : '') + (o.bdr || '') + (o.tabs || '') +
          '<w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after || 0) + '" w:line="' + (o.line || 240) + '" w:lineRule="auto"/>' + (o.ind || '') +
          '<w:jc w:val="' + (o.jc || 'left') + '"/><w:rPr><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr></w:pPr>' + (inner || space(sz)) + '</w:p>';
      };
      const boxed = (t, sz) => {
        const pad = '<w:r><w:rPr><w:color w:val="FFFFFF"/><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/><w:shd w:val="clear" w:color="auto" w:fill="000000"/></w:rPr><w:t xml:space="preserve">  </w:t></w:r>';
        return pad + R(t, { sz, b: true }).replace(/<\/w:rPr>/g, '<w:color w:val="FFFFFF"/><w:shd w:val="clear" w:color="auto" w:fill="000000"/></w:rPr>') + pad;
      };
      const B = (v) => '<w:' + v + ' w:val="single" w:sz="8" w:space="4" w:color="000000"/>';
      let one = '';
      for (const hd of model.header) {
        const sz = this._hsz(g, hd);
        one += P(R(hd.text, { sz, b: hd.role === 'shop' || hd.role === 'prop' }), { jc: 'center', sz });
      }
      if (model.title) one += P(boxed(model.title, g.title), { jc: 'center', sz: g.title, before: 60, after: 120, line: 260 });
      for (const b of model.blocks) {
        if (b.kind === 'fields') {
          const stops = this._fieldStops(b.segs.length, g.colW);
          const tabs = '<w:tabs>' + stops.map((p, i) => '<w:tab w:val="' + (i === stops.length - 1 ? 'right' : 'left') + '" w:leader="dot" w:pos="' + p + '"/>').join('') + '</w:tabs>';
          one += P(b.segs.map((s, i) => R((i ? ' ' : '') + s.label + ' ' + (s.value || '')) + '<w:r><w:tab/></w:r>').join(''), { tabs, line: 360 });
        } else if (b.kind === 'para') {
          one += P(R(b.text), { jc: 'both', line: 360, after: 60 });
        } else if (b.kind === 'amount') {
          one += P(R(b.label + ' ' + (b.value || ''), { b: true }), { bdr: '<w:pBdr>' + ['top', 'left', 'bottom', 'right'].map(B).join('') + '</w:pBdr>',
            ind: '<w:ind w:left="80" w:right="' + Math.round(g.colW * 0.55) + '"/>', before: 120, after: 120, line: 300 });
        } else if (b.kind === 'table') {
          one += this._docxTable(b, g, R) + P('', { line: 120, sz: 6 });
        } else if (b.kind === 'sign') {
          const tabs = this._signTabs(b.parts.length, g.colW);
          const tabXml = '<w:tabs>' + tabs.map((x) => '<w:tab w:val="' + x.val + '" w:pos="' + x.pos + '"/>').join('') + '</w:tabs>';
          const inner = b.parts.length === 2 ? R(b.parts[0]) + '<w:r><w:tab/></w:r>' + R(b.parts[1])
            : b.parts.map((p) => '<w:r><w:tab/></w:r>' + R(p)).join('');
          one += P('', { keep: true }) + P('', { keep: true }) + P(inner, { tabs: tabXml });
        }
      }
      let xml = '';
      for (let i = 0; i < g.up; i++) xml += i === 0 ? one : one.replace(/(<w:p><w:pPr>[\s\S]*?<\/w:pPr>)/, '$1<w:r><w:br w:type="column"/></w:r>');
      return xml;
    },

    _docxTable(t, g, R) {
      const ws = this._colWidths(t, g.colW), n = ws.length;
      const B = (v) => '<w:' + v + ' w:val="single" w:sz="6" w:space="0" w:color="000000"/>';
      const rowH = Math.round(g.sz * 10 * 1.5);
      const jc = (i) => (i === t.serialCol ? 'center' : i === t.amountCol ? 'right' : 'left');
      const cell = (txt, i, o) => {
        o = o || {};
        const span = o.span || 1;
        const w = ws.slice(i, i + span).reduce((a, b) => a + b, 0);
        return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (span > 1 ? '<w:gridSpan w:val="' + span + '"/>' : '') + '<w:vAlign w:val="center"/></w:tcPr>' +
          '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="' + (o.jc || 'left') + '"/><w:rPr><w:sz w:val="' + g.sz + '"/><w:szCs w:val="' + g.sz + '"/></w:rPr></w:pPr>' +
          (txt ? R(txt, { b: !!o.b }) : '') + '</w:p></w:tc>';
      };
      const row = (cells) => '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="' + rowH + '" w:hRule="atLeast"/></w:trPr>' + cells + '</w:tr>';
      let rows = row(t.head.map((x, i) => cell(x, i, { jc: 'center', b: true })).join(''));
      for (const r of t.items) rows += row(r.map((c, i) => cell(c, i, { jc: jc(i) })).join(''));
      for (const s of this._fillers(t)) rows += row(t.head.map((_, i) => cell(i === t.serialCol ? s : '', i, { jc: jc(i) })).join(''));
      rows += row(cell(t.total.label, 0, { span: n - 1, jc: 'right', b: true }) + cell(t.total.value, n - 1, { jc: 'right', b: true }));
      return '<w:tbl><w:tblPr><w:tblW w:w="' + g.colW + '" w:type="dxa"/><w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(B).join('') + '</w:tblBorders>' +
        '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="72" w:type="dxa"/><w:right w:w="72" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
        '<w:tblGrid>' + ws.map((w) => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>' + rows + '</w:tbl>';
    },

    docxSectPr(g) {
      const G = g || this.geometry(null);
      return '<w:sectPr><w:pgSz w:w="' + G.pageW + '" w:h="' + G.pageH + '"' + (G.landscape ? ' w:orient="landscape"' : '') + '/>' +
        '<w:pgMar w:top="' + G.top + '" w:right="' + G.right + '" w:bottom="' + G.bottom + '" w:left="' + G.left + '" w:header="288" w:footer="288" w:gutter="0"/>' +
        '<w:cols w:num="' + G.up + '" w:space="' + G.gap + '"/></w:sectPr>';
    },

    // ------------------------------------------------------------------ Word 2003 (RTF)
    /** @param h { rtf(text) → RTF রান, fontName } */
    renderRtf(model, h) {
      const g = this.geometry(model);
      const T = (t, b) => (b ? '{\\b ' + h.rtf(t) + '}' : h.rtf(t));
      const P = (body, o) => {
        o = o || {};
        return '{\\pard\\plain' + (o.keep ? '\\keepn' : '') + (o.jc || '\\ql') + '\\f0\\fs' + (o.sz || g.sz) + '\\sl' + (o.sl || 240) + '\\slmult1\\sb' + (o.sb || 0) + '\\sa' + (o.sa || 0) +
          (o.bdr || '') + (o.tabs || '') + (o.ri ? '\\li80\\ri' + o.ri : '') + ' ' + (body || '') + '\\par}\n';
      };
      const boxed = (t, sz) => '{\\b\\fs' + sz + '\\cf2\\highlight1   ' + h.rtf(t) + '  }';
      let one = '';
      for (const hd of model.header) one += P(T(hd.text, hd.role === 'shop' || hd.role === 'prop'), { jc: '\\qc', sz: this._hsz(g, hd) });
      if (model.title) one += P(boxed(model.title, g.title), { jc: '\\qc', sz: g.title, sb: 60, sa: 120, sl: 260 });
      for (const b of model.blocks) {
        if (b.kind === 'fields') {
          const stops = this._fieldStops(b.segs.length, g.colW);
          const tabs = stops.map((p, i) => '\\tldot' + (i === stops.length - 1 ? '\\tqr' : '') + '\\tx' + p).join('');
          one += P(b.segs.map((s, i) => T((i ? ' ' : '') + s.label + ' ' + (s.value || '')) + '\\tab ').join(''), { tabs, sl: 360 });
        } else if (b.kind === 'para') one += P(T(b.text), { jc: '\\qj', sl: 360, sa: 60 });
        else if (b.kind === 'amount') {
          one += P(T(b.label + ' ' + (b.value || ''), true), { bdr: ['t', 'l', 'b', 'r'].map((s) => '\\brdr' + s + '\\brdrs\\brdrw15\\brsp80').join(''), ri: Math.round(g.colW * 0.55), sb: 120, sa: 120, sl: 300 });
        } else if (b.kind === 'table') one += this._rtfTable(b, g, T) + P('', { sz: 6, sl: 120 });
        else if (b.kind === 'sign') {
          const tabs = this._signTabs(b.parts.length, g.colW).map((x) => (x.val === 'right' ? '\\tqr' : '\\tqc') + '\\tx' + x.pos).join('');
          const body = b.parts.length === 2 ? T(b.parts[0]) + '\\tab ' + T(b.parts[1]) : b.parts.map((p) => '\\tab ' + T(p)).join('');
          one += P('', { keep: true }) + P('', { keep: true }) + P(body, { tabs });
        }
      }
      let rtf = '{\\rtf1\\ansi\\deff0\n{\\fonttbl\n{\\f0\\fnil\\fcharset0 ' + (h.fontName || 'Kalpurush') + ';}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n' +
        '{\\colortbl;\\red0\\green0\\blue0;\\red255\\green255\\blue255;}\n' +
        '\\paperw' + g.pageW + '\\paperh' + g.pageH + (g.landscape ? '\\landscape' : '') + '\\margl' + g.left + '\\margr' + g.right + '\\margt' + g.top + '\\margb' + g.bottom + '\n' +
        '\\sectd\\cols' + g.up + '\\colsx' + g.gap + '\n';
      for (let i = 0; i < g.up; i++) rtf += (i ? '{\\pard\\plain\\fs2\\sl20\\slmult0\\column\\par}\n' : '') + one;
      return rtf + '}\n';
    },

    _rtfTable(t, g, T) {
      const ws = this._colWidths(t, g.colW), n = ws.length;
      const brd = ['t', 'l', 'b', 'r'].map((s) => '\\clbrdr' + s + '\\brdrs\\brdrw10').join('');
      const def = (spans) => { let x = 0; return spans.map((sp) => { x += ws.slice(sp[0], sp[0] + sp[1]).reduce((a, b) => a + b, 0); return '\\clvertalc' + brd + '\\cellx' + x; }).join(''); };
      const jc = (i) => (i === t.serialCol ? '\\qc' : i === t.amountCol ? '\\qr' : '\\ql');
      const cell = (txt, j, b) => '\\pard\\plain\\intbl' + j + '\\f0\\fs' + g.sz + ' ' + (txt ? T(txt, b) : '') + '\\cell ';
      const row = (spans, cells) => '{\\trowd\\trgaph72\\trleft0\\trkeep\\trrh' + Math.round(g.sz * 10 * 1.5) + def(spans) + '\n' + cells + '\\row}\n';
      const each = ws.map((_, i) => [i, 1]);
      let rtf = row(each, t.head.map((x) => cell(x, '\\qc', true)).join(''));
      for (const r of t.items) rtf += row(each, r.map((c, i) => cell(c, jc(i))).join(''));
      for (const s of this._fillers(t)) rtf += row(each, t.head.map((_, i) => cell(i === t.serialCol ? s : '', jc(i))).join(''));
      rtf += row([[0, n - 1], [n - 1, 1]], cell(t.total.label, '\\qr', true) + cell(t.total.value, '\\qr', true));
      return rtf + '\\pard\\plain\n';
    },

    // ------------------------------------------------------------------ HTML প্রিভিউ
    renderHtml(model, options, h) {
      const o = options || {};
      const isBijoy = o.font === 'bijoy' || o.font === 'sutonnymj';
      const g = this.geometry(model);
      const esc = (h && h.esc) || ((s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      const inch = (tw) => (tw / 1440).toFixed(2) + 'in';
      const pt = (hp) => (hp / 2) + 'pt';
      const box = (t, sz) => '<span style="background: #000; color: #fff; font-weight: 700; padding: 0 0.5em; border-radius: 0.4em; font-size: ' + pt(sz) + ';">' + esc(t) + '</span>';
      const line = (inner, style) => '<div style="line-height: 1.3; ' + (style || '') + '">' + (inner || '&nbsp;') + '</div>';
      let c = '';
      for (const hd of model.header) c += line(esc(hd.text), 'text-align: center; font-size: ' + pt(this._hsz(g, hd)) + ';' + (hd.role === 'shop' || hd.role === 'prop' ? ' font-weight: 700;' : ''));
      if (model.title) c += line(box(model.title, g.title), 'text-align: center; margin: 0.2em 0 0.4em;');
      for (const b of model.blocks) {
        if (b.kind === 'fields') {
          c += '<div style="display: flex; gap: 0.3em; line-height: 1.8;">' + b.segs.map((s, i) => '<span style="display: flex; flex: ' + (b.segs.length === 2 && i === 0 ? 3 : 2) + '; white-space: nowrap;">' +
            esc(s.label) + '&nbsp;' + esc(s.value || '') + '<span style="flex: 1; border-bottom: 1px dotted #000; margin: 0 0.2em 0.35em;"></span></span>').join('') + '</div>';
        } else if (b.kind === 'para') c += line(esc(b.text), 'text-align: justify; line-height: 1.8;');
        else if (b.kind === 'amount') c += '<div style="display: inline-block; min-width: 40%; border: 1.5px solid #000; padding: 0.15em 0.5em; margin: 0.4em 0; font-weight: 700;">' + esc(b.label + ' ' + (b.value || '')) + '</div>';
        else if (b.kind === 'table') {
          const ws = this._colWidths(b, g.colW);
          const td = (x, st) => '<td style="border: 1px solid #000; padding: 0.1em 0.3em; ' + (st || '') + '">' + (x ? esc(x) : '&nbsp;') + '</td>';
          const al = (i) => (i === b.serialCol ? 'text-align: center;' : i === b.amountCol ? 'text-align: right;' : '');
          let rows = '<tr>' + b.head.map((x) => td(x, 'text-align: center; font-weight: 700;')).join('') + '</tr>';
          for (const r of b.items) rows += '<tr>' + r.map((x, i) => td(x, al(i))).join('') + '</tr>';
          for (const s of this._fillers(b)) rows += '<tr>' + b.head.map((_, i) => td(i === b.serialCol ? s : '', al(i))).join('') + '</tr>';
          rows += '<tr>' + td(b.total.label, 'text-align: right; font-weight: 700;').replace('<td', '<td colspan="' + (b.head.length - 1) + '"') + td(b.total.value, 'text-align: right; font-weight: 700;') + '</tr>';
          c += '<table style="width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0.3em 0;"><colgroup>' + ws.map((w) => '<col style="width: ' + (100 * w / g.colW).toFixed(1) + '%;">').join('') + '</colgroup>' + rows + '</table>';
        } else if (b.kind === 'sign') {
          c += '<div style="display: flex; justify-content: ' + (b.parts.length === 1 ? 'flex-end' : 'space-between') + '; margin-top: 2.6em;">' + b.parts.map((p) => '<span>' + esc(p) + '</span>').join('') + '</div>';
        }
      }
      const colDiv = '<div style="flex: 1; min-width: 0;">' + c + '</div>';
      return '<div class="paper-sheet ' + (g.landscape ? 'size-a4-landscape' : 'size-a4-portrait') + ' official-receipt-layout receipt-' + model.variant + ' ' + (isBijoy ? 'font-sutonny' : 'font-kalpurush') + '" ' +
        (o.editable ? 'contenteditable="true" spellcheck="false" ' : '') +
        'style="' + (g.landscape ? '' : 'width: 148mm; min-height: 210mm; ') + 'padding: ' + inch(g.top) + ' ' + inch(g.right) + ' ' + inch(g.bottom) + ' ' + inch(g.left) + '; font-size: ' + pt(g.sz) + '; box-sizing: border-box;">' +
        '<div style="display: flex; gap: ' + inch(g.gap) + ';">' + new Array(g.up).fill(colDiv).join('') + '</div></div>';
    }
  };

  global.FayzarReceiptLayout = FayzarReceiptLayout;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarReceiptLayout;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
