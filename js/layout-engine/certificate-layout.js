/**
 * Fayzar — সাজানো ল্যান্ডস্কেপ সনদ/প্রশংসাপত্র (PROTTOYON, ল্যান্ডস্কেপ বা মুড়িসহ) — Part-19.2
 * =========================================================================================
 * দোকানের আসল নমুনা (Word COM দিয়ে মাপা; মূল ফাইলে সব টেক্সটবক্স — এখানে টেবিল/অনুচ্ছেদ, যাতে .doc রূপান্তরে টেকে):
 *  - single ("prottoyon pottro Dreamland.doc"): A4 ল্যান্ডস্কেপ, মার্জিন ০.৪", নকশাদার পাতা-বর্ডার;
 *      প্রতিষ্ঠান বোল্ড ৪৭pt → ঠিকানা ২৪pt → প্রতিষ্ঠার সন ১৭pt (সব বোল্ড, মাঝে) → [গ্রেড-ছক] → "প্রত্যয়ন পত্র" বোল্ড ৩২pt
 *      → মূল লেখা বোল্ড ১৫pt, লাইন ১.৭, দুই-পাশে সমান → নিচে বামে তারিখ (১৪pt), ডানে স্বাক্ষর-ব্লক
 *  - stub ("Rangamati R. Proshonsha protro 2025.doc"): A4 ল্যান্ডস্কেপ, বামে মুড়ি (৩০৬pt) + ডানে মূল সনদ (৪৫০pt),
 *      দুটোই ৪.৫pt দাগের বক্সে; মুড়ি: বিসমিল্লাহ ১৪ → নাম বোল্ড ২২ → ঠিকানা ১৫ → সন ১৩ → শিরোনাম বক্সে বোল্ড ২১
 *      → "ক্রমিক নং …… তারিখ" ১২ → ঘর-সারি ১৪pt ডাবল-লাইন → "তারিখ …… প্রধান শিক্ষক";
 *      মূল: বিসমিল্লাহ ১৪ → নাম (WordArt) → ঠিকানা/সন বোল্ড ১৬/১৪/১৩ → শিরোনাম বক্সে বোল্ড ২৩ → ক্রমিক/তারিখ ১২
 *      → মূল লেখা ১৪pt লাইন ১.৫ → তারিখ → স্বাক্ষর-ব্লক ডানে ১২pt
 * কখন: PROTTOYON + (ফ্রন্টম্যাটারে page_orientation: landscape, অথবা লেখায় মুড়ি+মূল দুই অংশ)। বাকি প্রত্যয়ন letter-layout-এ।
 * এক মডেল → অনুচ্ছেদ-তালিকা → DOCX / Word 2003 RTF / HTML (preview == download)। ক্রম কখনো বদলায় না।
 * প্যাড-শিরোনাম, স্বাক্ষর ও মূল-লেখা পার্স FayzarLetterLayout-এর — একই নিয়ম দুই জায়গায় লেখা হয় না।
 */
(function (global) {
  'use strict';

  function getLL() {
    if (global.FayzarLetterLayout) return global.FayzarLetterLayout;
    if (typeof require === 'function') { try { return require('./letter-layout.js'); } catch (e) { } }
    return null;
  }
  function getAL() {
    if (global.FayzarApplicationLayout) return global.FayzarApplicationLayout;
    if (typeof require === 'function') { try { return require('./application-layout.js'); } catch (e) { } }
    return null;
  }
  function measure(str, sz) {
    const P = global.CqBookletPlanner;
    if (P && typeof P.measure === 'function') return P.measure(str, sz);
    return Math.round(String(str || '').length * (sz / 2) * 20 * 0.55);
  }
  function norm(text) {
    return String(text == null ? '' : text)
      .replace(/\u09AF\u09BC/g, '\u09DF').replace(/\u09A1\u09BC/g, '\u09DC').replace(/\u09A2\u09BC/g, '\u09DD')
      .replace(/\r\n?/g, '\n');
  }
  function cleanLine(l) {
    return String(l).replace(/\*\*/g, '').replace(/^\s*#{1,6}\s*/, '').replace(/^>\s*/, '').replace(/\s+$/, '').replace(/^\s+/, '');
  }
  function frontmatter(text) {
    const m = norm(text).match(/^\s*---\n([\s\S]*?)\n---/);
    const out = {};
    if (m) for (const l of m[1].split('\n')) { const k = l.match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/); if (k) out[k[1].toLowerCase()] = k[2].replace(/^["']|["']$/g, ''); }
    return out;
  }

  const RX = {
    hr: /^(?:-{3,}|\*{3,}|_{3,}|={3,})$/,
    serial: /^(?:ক্রমিক|ক্রঃ|ক্র\.)\s*(?:নং|নম্বর|নং-)?/,
    date: /^তারিখ\s*[:ঃ]?/,
    // "তারিখ:………… প্রধান শিক্ষক" — এক লাইনে তারিখ + স্বাক্ষর
    dateSign: /^(তারিখ\s*[:ঃ]?\s*[.…_\-\s০-৯\d\/]*?(?:খ্রি\.?|ইং\.?)?)\s+([^.…_\s].{1,40})$/,
    title: /(?:প্রত্যয়ন|প্রশংসা\s*পত্র|প্রশংসাপত্র|সনদ|ছাড়\s*পত্র|ছাড়পত্র|CERTIFICATE|TESTIMONIAL)/i,
    notTitle: /এই\s*মর্মে|করা\s*যাচ্ছে|[।?!]\s*$|[:ঃ]\s*\S/,
    tableRow: /^\|.*\|$/,
    tableSep: /^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?$/
  };
  for (const k of Object.keys(RX)) RX[k] = new RegExp(norm(RX[k].source), RX[k].flags);

  // অর্ধ-পয়েন্ট; line = ২৪০-ভাগ (auto)
  const STYLE = {
    single: { top: 28, org: 94, addr: 48, meta: 34, headB: true, title: 64, box: false, body: 30, line: 408, bodyB: true, serial: 24, date: 28, sig: 28 },
    main: { top: 28, org: 56, addr: 32, meta: 28, headB: true, title: 46, box: true, body: 28, line: 360, bodyB: false, serial: 24, date: 28, sig: 24 },
    stub: { top: 28, org: 44, addr: 30, meta: 26, headB: false, title: 42, box: true, body: 28, line: 480, bodyB: false, serial: 24, date: 28, sig: 28 }
  };
  const STEPS = [0, 2, 4, 6];   // মূল লেখা ছোট করার ধাপ (অর্ধ-পয়েন্ট); সর্বনিম্ন ১২pt
  const MIN_BODY = 24;
  const PAGE = { pageW: 16838, pageH: 11906, top: 720, bottom: 720, left: 720, right: 720 };
  const STUB_W = 5900, GAP_W = 400, CELL_PAD = 180;
  const ROW_SPARE = 600;   // বক্সের সারি পাতার চেয়ে একটু খাটো — নইলে টেবিলের পরের বাধ্যতামূলক অনুচ্ছেদ দ্বিতীয় পাতায় যায় (Word-এ মাপা)
  const SIG_W = 3600;

  const FayzarCertificateLayout = {
    RX,
    STYLE,
    STEPS,

    /**
     * এই লেআউট লাগবে? ফ্রন্টম্যাটারের page_orientation: landscape, অথবা মুড়ি+মূল দুই অংশ
     * @param fields ইঞ্জিন/পাইপলাইন আগেই ফ্রন্টম্যাটার কেটে রাখলে তার ঘরগুলো (options.__frontmatter)
     */
    wants(rawText, fields) {
      const fm = Object.assign({}, frontmatter(rawText), fields || {});
      if (/^landscape$/i.test(fm.page_orientation || fm.orientation || '')) return true;
      return !!this._split(this._lines(rawText));
    },

    _lines(rawText) {
      return norm(rawText).replace(/^\s*---\n[\s\S]*?\n---\s*/, '').split('\n')
        .map((raw) => ({ t: cleanLine(raw), h: /^\s*#{1,6}\s/.test(raw), hr: RX.hr.test(raw.trim()) }))
        .filter((x) => x.t || x.hr);
    },

    /** মুড়ি + মূল: (ক) একা "***"/"---" লাইন, (খ) প্রথম লাইন আবার এলে, (গ) "#" প্রতিষ্ঠান-লাইন দুবার */
    _split(items) {
      const ok = (a, b) => a.filter((x) => !x.hr).length >= 4 && b.filter((x) => !x.hr).length >= 4;
      const hr = items.findIndex((x) => x.hr);
      if (hr > 0 && ok(items.slice(0, hr), items.slice(hr + 1))) return [items.slice(0, hr), items.slice(hr + 1)];
      const key = (s) => s.replace(/\s+/g, '');
      const first = items.find((x) => !x.hr);
      if (first) {
        const j = items.findIndex((x, i) => i >= 4 && !x.hr && key(x.t) === key(first.t));
        if (j > 0 && ok(items.slice(0, j), items.slice(j))) return [items.slice(0, j), items.slice(j)];
      }
      const heads = items.map((x, i) => (x.h ? i : -1)).filter((i) => i >= 0);
      if (heads.length >= 2 && key(items[heads[0]].t) === key(items[heads[1]].t)) {
        // দ্বিতীয় অংশ শুরু তার আগের "top" লাইন (বিসমিল্লাহ…) থেকে
        let j = heads[1];
        const LL = getLL();
        while (j > heads[0] + 1 && LL && LL.RX.top.test(items[j - 1].t)) j--;
        if (ok(items.slice(0, j), items.slice(j))) return [items.slice(0, j), items.slice(j)];
      }
      return null;
    },

    parse(rawText) {
      const items = this._lines(rawText);
      const two = this._split(items);
      if (!two) return { kind: 'CERT_LAYOUT', version: 1, variant: 'single', parts: [this._parsePart(items.filter((x) => !x.hr), 'single')] };
      // মুড়ি = গদ্য-অনুচ্ছেদ কম যে অংশে (নমুনায় বামে); মূল সনদ ডানে
      const prose = (arr) => arr.reduce((a, x) => a + (/[।]\s*$/.test(x.t) && x.t.length > 60 ? x.t.length : 0), 0);
      let [a, b] = two.map((p) => p.filter((x) => !x.hr));
      if (prose(a) > prose(b)) [a, b] = [b, a];
      return { kind: 'CERT_LAYOUT', version: 1, variant: 'stub', parts: [this._parsePart(a, 'stub'), this._parsePart(b, 'main')] };
    },

    /** এক অংশ: শিরোনাম-মাথা → [ছক] → শিরোনাম → ক্রমিক/তারিখ → লেখা → তারিখ + স্বাক্ষর */
    _parsePart(items, role) {
      const LL = getLL();
      const part = { role, head: [], tables: [], title: '', blocks: [], footer: null };
      // মাথা: প্রথম ক্রমিক/শিরোনাম/ছক-লাইনের আগ পর্যন্ত (প্যাড-শিরোনামের নিয়ম LetterLayout-এর)
      let cut = items.findIndex((x) => RX.serial.test(x.t) || RX.tableRow.test(x.t) || (RX.title.test(x.t) && !RX.notTitle.test(x.t) && x.t.length <= 40));
      if (cut < 0) cut = items.length;
      const head = LL ? LL._takeLetterhead(items.slice(0, cut)) : { lines: [], used: 0 };
      part.head = head.lines;
      let rest = items.slice(head.used).map((x) => x.t);

      // ছক (মার্কডাউন টেবিল) — মুড়িতে বক্সের ভেতরে টেবিল নয়, সারি-লাইন
      const lines = [];
      let tbl = null;
      for (let i = 0; i < rest.length; i++) {
        const t = rest[i];
        if (RX.tableRow.test(t)) {
          if (RX.tableSep.test(t)) continue;
          const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
          if (role === 'single') {
            if (!tbl) { tbl = { kind: 'table', rows: [], header: !!(rest[i + 1] && RX.tableSep.test(rest[i + 1])) }; part.tables.push(tbl); }
            tbl.rows.push(cells);
          } else lines.push(cells.filter(Boolean).join('   '));
          continue;
        }
        tbl = null;
        lines.push(t);
      }
      rest = lines;

      // শিরোনাম
      const ti = rest.findIndex((t) => RX.title.test(t) && !RX.notTitle.test(t) && t.length <= 40);
      if (ti >= 0 && ti <= 3) { part.title = rest[ti]; rest = rest.slice(0, ti).concat(rest.slice(ti + 1)); }

      // শেষের তারিখ + স্বাক্ষর
      let sig = LL ? LL._takeSignature(rest) : null;
      let sign = sig ? [].concat(...sig.groups) : [];
      let body = sig ? rest.slice(0, sig.at) : rest.slice();
      let date = '';
      const last = body[body.length - 1];
      if (last && RX.date.test(last) && last.length <= 70) {
        const m = last.match(RX.dateSign);
        if (m && !sign.length) { date = m[1].trim(); sign = [m[2].trim()]; } else date = last;
        body = body.slice(0, -1);
      }
      if (date || sign.length) part.footer = { date, sign };

      // ক্রমিক/তারিখ লাইন
      const bl = [];
      const flush = (arr) => {
        if (!arr.length) return;
        if (role === 'stub' || !LL) arr.forEach((t) => bl.push({ kind: 'line', text: t }));
        else bl.push(...LL._parseFree(arr));
      };
      let run = [];
      for (const t of body) {
        if (RX.serial.test(t)) {
          flush(run); run = [];
          const k = t.search(/তারিখ\s*[:ঃ]?/);
          bl.push(k > 0 ? { kind: 'serial', left: t.slice(0, k).trim(), right: t.slice(k).trim() } : { kind: 'serial', left: t, right: '' });
          continue;
        }
        run.push(t);
      }
      flush(run);
      part.blocks = bl;
      return part;
    },

    // ------------------------------------------------------------------ মাপ
    geometry(model, opts) {
      const o = opts || {};
      const g = Object.assign({}, PAGE);
      g.textW = g.pageW - g.left - g.right;
      g.usableH = g.pageH - g.top - g.bottom;
      g.variant = model && model.variant === 'stub' ? 'stub' : 'single';
      g.widths = g.variant === 'stub' ? [STUB_W, GAP_W, g.textW - STUB_W - GAP_W] : [g.textW];
      const mk = (i) => Object.assign({}, g, { fitStep: i, shrink: STEPS[i] });
      if (Number.isInteger(o.step) && o.step >= 0 && o.step < STEPS.length) return mk(o.step);
      if (o.noFit || !model || !model.parts) return mk(0);
      for (let i = 0; i < STEPS.length; i++) {
        const gi = mk(i);
        if (model.parts.every((p) => this.estimateHeight(p, gi, o.isBijoy) <= this._capacity(gi))) return gi;
      }
      return mk(STEPS.length - 1);
    },
    _capacity(g) { return g.variant === 'stub' ? g.usableH - 2 * CELL_PAD - 200 : g.usableH - 200; },
    _innerW(g, role) { return role === 'stub' ? g.widths[0] - 2 * CELL_PAD : role === 'main' ? g.widths[2] - 2 * CELL_PAD : g.textW; },
    _style(role, g) {
      const s = Object.assign({}, STYLE[role]);
      const d = (g && g.shrink) || 0;
      s.body = Math.max(MIN_BODY, s.body - d);
      s.line = Math.max(276, s.line - d * 12);
      return s;
    },

    /**
     * অংশ → অনুচ্ছেদ-তালিকা (তিন রেন্ডারের এক উৎস)।
     * অনুচ্ছেদ: { runs:[{t,sz,b,u}|{tab:true}], jc, line, before, li, ri, fi, tabR, keep, box, sz } অথবা { table }
     */
    _paras(part, g) {
      const S = this._style(part.role, g);
      const w = this._innerW(g, part.role);
      const out = [];
      const mkPara = (text, sz, o) => Object.assign({ runs: text ? [{ t: text, sz, b: !!(o && o.b), u: !!(o && o.u) }] : [], sz, jc: 'left', line: 240, before: 0 }, o || {});
      const para = (text, sz, o) => out.push(mkPara(text, sz, o));
      // নমুনার মতো প্রথম ছক (গ্রেড-ছক) শিরোনাম-মাথার ডানে: প্রতিষ্ঠানের নাম পুরো প্রস্থে, তার নিচে
      // [ফাঁকা | ঠিকানা/সন/শিরোনাম (মাঝে) | ছক] — একটি টেবিল, মাঝের দুই ঘর লম্বালম্বি জোড়া (vMerge)
      const AL = getAL();
      const sideT = part.role === 'single' && part.tables.length && AL ? part.tables[0] : null;
      const side = sideT ? { table: sideT, sz: 24, center: [] } : null;
      if (side) {
        side.widths = AL._tableWidths(sideT.rows, side.sz, Math.round(w * 0.3), sideT.header);
        side.gw = side.widths.reduce((a, c) => a + c, 0);
        side.cw = w - 2 * side.gw;
      }
      for (const hl of part.head) {
        let sz = S[hl.role] || S.addr;
        const into = side && hl.role !== 'org' && hl.role !== 'top' && part.head.findIndex((x) => x.role === 'org') < part.head.indexOf(hl);
        const room = into ? side.cw : w;
        if (hl.role === 'org' || into) while (sz > 28 && measure(hl.text, sz) > room - 200) sz -= 2;   // এক লাইনে ধরাতে
        const p = mkPara(hl.text, sz, { jc: 'center', b: hl.role === 'org' || (S.headB && hl.role !== 'top') });
        if (into) side.center.push(p); else out.push(p);
      }
      if (side) out.push({ side });
      for (const t of part.tables) if (t !== sideT) out.push({ table: t, sz: 24, before: 120 });
      if (part.title) {
        const tw = Math.min(w, measure(part.title, S.title) + 720);
        const pad = S.box ? Math.max(0, Math.round((w - tw) / 2)) : 0;
        const tp = mkPara(part.title, S.title, { jc: 'center', b: true, before: 160, li: pad, ri: pad, box: S.box });
        if (side) side.center.push(tp); else { out.push(tp); para('', 16, {}); }
      }
      for (const b of part.blocks) {
        switch (b.kind) {
          case 'serial':
          case 'memoDate':
            out.push({ runs: [{ t: b.left, sz: S.serial }, { tab: true }, { t: b.right, sz: S.serial }], sz: S.serial, jc: 'left', line: 240, before: 60, tabR: w });
            break;
          case 'line':
          case 'date':
            para(b.text, S.body, { line: S.line, b: S.bodyB });
            break;
          case 'fields':
            for (const t of b.lines) para(t, S.body, { line: S.line, b: S.bodyB });
            break;
          case 'title':
            para(b.text, S.title, { jc: 'center', b: true });
            break;
          case 'table':
            out.push({ table: b, sz: Math.max(22, S.body - 4), before: 60 });
            break;
          default:   // para, heading, list…
            para(b.text || (b.lines || []).join(' '), S.body, { jc: 'both', line: S.line, b: S.bodyB, fi: 480 });
            break;
        }
      }
      if (part.footer) {
        const f = part.footer;
        para('', S.body, { line: S.line, keep: true });
        if (part.role === 'stub' && f.sign.length <= 1) {
          out.push({ runs: [{ t: f.date, sz: S.date }, { tab: true }, { t: f.sign[0] || '', sz: S.date }], sz: S.date, jc: 'left', line: 240, before: 0, tabR: w });
        } else {
          if (f.date) para(f.date, S.date, { keep: f.sign.length > 0 });
          const li = Math.max(0, w - SIG_W);
          if (f.sign.length) para('', S.sig, { keep: true });
          f.sign.forEach((s, i) => para(s, S.sig, { jc: 'center', li, keep: i < f.sign.length - 1, b: i === 0 && /^\(.*\)$/.test(s) }));
        }
      }
      // ফুটার শেষ লেখার সাথে: ফুটারের আগের অনুচ্ছেদেও keep
      return out;
    },

    estimateHeight(part, g, isBijoy) {
      const ff = isBijoy ? 1.02 : 1.24;
      const corr = isBijoy ? 1.08 : 1.24;
      const w = this._innerW(g, part.role);
      const AL = getAL();
      let h = 0;
      const one = (p, avail) => {
        const txt = p.runs.map((r) => (r.tab ? '    ' : r.t)).join('');
        const n = Math.max(1, Math.ceil((measure(txt, p.sz) + (p.fi || 0)) / Math.max(1500, avail - (p.li || 0) - (p.ri || 0))));
        return (n * (p.sz / 2) * 20 * (p.line / 240) * ff + (p.before || 0) + (p.box ? 160 : 0)) * corr;
      };
      for (const p of this._paras(part, g)) {
        if (p.side) {
          const s = p.side;
          const tH = AL ? AL.estimateHeight({ blocks: [s.table] }, { textW: s.gw, tableSz: s.sz, sz: s.sz, line: 240, paraLine: 240 }, isBijoy) : 0;
          h += Math.max(tH, s.center.reduce((a, c) => a + one(c, s.cw), 0)) + 80;
          continue;
        }
        if (p.table) {
          if (AL) h += AL.estimateHeight({ blocks: [p.table] }, { textW: w, tableSz: p.sz, sz: p.sz, line: 240, paraLine: 240 }, isBijoy) + (p.before || 0);
          continue;
        }
        h += one(p, w);
      }
      return Math.round(h);
    },

    // ------------------------------------------------------------------ DOCX
    /** @param h { runs(text, style), isBijoy, geometry } */
    renderDocx(model, h) {
      const g = (h && h.geometry) || this.geometry(model, { isBijoy: h && h.isBijoy });
      const AL = getAL();
      const box = '<w:pBdr>' + ['top', 'left', 'bottom', 'right'].map((k) => '<w:' + k + ' w:val="single" w:sz="12" w:space="4" w:color="000000"/>').join('') + '</w:pBdr>';
      const JC = { left: 'left', center: 'center', right: 'right', both: 'both' };
      const P = (p, w) => {
        if (p.side) return this._docxSide(p.side, h, P);
        if (p.table) {
          const spacer = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:rPr><w:sz w:val="8"/></w:rPr></w:pPr></w:p>';
          return AL ? spacer + AL._docxTable(p.table, h, { tableSz: p.sz, textW: w }) : '';
        }
        const ind = (p.li || p.ri || p.fi) ? '<w:ind w:left="' + (p.li || 0) + '" w:right="' + (p.ri || 0) + '"' + (p.fi ? ' w:firstLine="' + p.fi + '"' : '') + '/>' : '';
        const runs = p.runs.map((r) => (r.tab ? '<w:r><w:tab/></w:r>' : (r.t ? h.runs(r.t, { sz: r.sz, b: r.b, u: r.u }) : ''))).join('');
        return '<w:p><w:pPr>' + (p.keep ? '<w:keepNext/>' : '') + (p.box ? box : '') +
          (p.tabR ? '<w:tabs><w:tab w:val="right" w:pos="' + p.tabR + '"/></w:tabs>' : '') +
          '<w:spacing w:before="' + (p.before || 0) + '" w:after="0" w:line="' + p.line + '" w:lineRule="auto"/>' + ind +
          '<w:jc w:val="' + JC[p.jc] + '"/><w:rPr><w:sz w:val="' + p.sz + '"/><w:szCs w:val="' + p.sz + '"/></w:rPr></w:pPr>' + runs + '</w:p>';
      };
      const partXml = (part) => { const w = this._innerW(g, part.role); return this._keepFooter(this._paras(part, g)).map((p) => P(p, w)).join(''); };
      if (model.variant !== 'stub') return partXml(model.parts[0]);
      // মুড়ি | ফাঁক | মূল — সীমানাহীন টেবিল, দুই অংশ ৪.৫pt দাগের বক্সে
      const thick = (k) => '<w:' + k + ' w:val="single" w:sz="36" w:space="0" w:color="000000"/>';
      const nil = (k) => '<w:' + k + ' w:val="nil"/>';
      const SIDES = ['top', 'left', 'bottom', 'right'];
      const cell = (w, inner, bordered) => '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/><w:tcBorders>' + SIDES.map(bordered ? thick : nil).join('') +
        '</w:tcBorders><w:vAlign w:val="top"/></w:tcPr>' + (inner || '<w:p/>') + '</w:tc>';
      return '<w:tbl><w:tblPr><w:tblW w:w="' + g.textW + '" w:type="dxa"/><w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(nil).join('') +
        '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="' + CELL_PAD + '" w:type="dxa"/><w:left w:w="' + CELL_PAD + '" w:type="dxa"/>' +
        '<w:bottom w:w="' + CELL_PAD + '" w:type="dxa"/><w:right w:w="' + CELL_PAD + '" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
        '<w:tblGrid>' + g.widths.map((w) => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>' +
        '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="' + (g.usableH - ROW_SPARE) + '" w:hRule="atLeast"/></w:trPr>' +
        cell(g.widths[0], partXml(model.parts[0]), true) + cell(g.widths[1], '', false) + cell(g.widths[2], partXml(model.parts[1]), true) +
        '</w:tr></w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>';
    },

    /** [ফাঁকা | মাঝের লেখা | ছক] — প্রথম দুই ঘর সব সারিতে জোড়া (vMerge), সীমানা শুধু ছকের ঘরে */
    _docxSide(s, h, P) {
      const nil = ['top', 'left', 'bottom', 'right'].map((k) => '<w:' + k + ' w:val="nil"/>').join('');
      const one = ['top', 'left', 'bottom', 'right'].map((k) => '<w:' + k + ' w:val="single" w:sz="4" w:space="0" w:color="000000"/>').join('');
      const grid = [s.gw, s.cw].concat(s.widths);
      const tc = (w, borders, extra, inner) => '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (extra || '') + '<w:tcBorders>' + borders + '</w:tcBorders><w:vAlign w:val="center"/></w:tcPr>' + inner + '</w:tc>';
      const empty = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>';
      let x = '<w:tbl><w:tblPr><w:tblW w:w="' + grid.reduce((a, c) => a + c, 0) + '" w:type="dxa"/><w:tblBorders>' +
        ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((k) => '<w:' + k + ' w:val="nil"/>').join('') + '</w:tblBorders><w:tblLayout w:type="fixed"/>' +
        '<w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + grid.map((w) => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>';
      s.table.rows.forEach((row, ri) => {
        const vm = '<w:vMerge' + (ri === 0 ? ' w:val="restart"' : '') + '/>';
        x += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + tc(s.gw, nil, vm, empty) + tc(s.cw, nil, vm, ri === 0 ? (s.center.map((p) => P(p, s.cw)).join('') || empty) : empty);
        s.widths.forEach((w, ci) => {
          const t = String(row[ci] == null ? '' : row[ci]);
          x += tc(w, one, '', '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>' + (t ? h.runs(t, { sz: s.sz, b: ri === 0 && s.table.header }) : '') + '</w:p>');
        });
        x += '</w:tr>';
      });
      return x + '</w:tbl>';
    },

    /** তারিখ/স্বাক্ষর শেষ লেখার পাতায়: ফুটারের ঠিক আগের লেখা-অনুচ্ছেদেও keep */
    _keepFooter(paras) {
      const fi = paras.findIndex((p) => p.keep);
      if (fi > 0 && !paras[fi - 1].table) paras[fi - 1].keep = true;
      return paras;
    },

    docxSectPr(g) {
      const G = g || this.geometry(null);
      const brd = G.variant === 'single'
        ? '<w:pgBorders w:offsetFrom="page">' + ['top', 'left', 'bottom', 'right'].map((k) => '<w:' + k + ' w:val="double" w:sz="18" w:space="20" w:color="000000"/>').join('') + '</w:pgBorders>'
        : '';
      return '<w:sectPr><w:pgSz w:w="' + G.pageW + '" w:h="' + G.pageH + '" w:orient="landscape"/>' +
        '<w:pgMar w:top="' + G.top + '" w:right="' + G.right + '" w:bottom="' + G.bottom + '" w:left="' + G.left + '" w:header="360" w:footer="360" w:gutter="0"/>' +
        brd + '<w:cols w:num="1"/></w:sectPr>';
    },

    // ------------------------------------------------------------------ Word 2003 (RTF)
    /** @param h { rtf(text), fontName, isBijoy } */
    renderRtf(model, h) {
      const g = (h && h.geometry) || this.geometry(model, { isBijoy: h && h.isBijoy });
      const AL = getAL();
      const JC = { left: '\\ql', center: '\\qc', right: '\\qr', both: '\\qj' };
      const T = (r) => {
        let s = h.rtf(r.t);
        if (r.u) s = '{\\ul ' + s + '}';
        if (r.b) s = '{\\b ' + s + '}';
        return '{\\fs' + r.sz + ' ' + s + '}';
      };
      // অনুচ্ছেদের মাথা ও লেখা আলাদা — টেবিল-ঘরে \intbl আর শেষ অনুচ্ছেদ \cell
      const fmt = (p, intbl) => '\\pard\\plain' + (intbl ? '\\intbl' : '') + (p.keep ? '\\keepn' : '') +
        (p.box ? '\\box\\brdrs\\brdrw15\\brsp80' : '') + (p.tabR ? '\\tqr\\tx' + p.tabR : '') +
        '\\sl' + p.line + '\\slmult1\\sb' + (p.before || 0) + '\\sa0' + (p.li ? '\\li' + p.li : '') + (p.ri ? '\\ri' + p.ri : '') + (p.fi ? '\\fi' + p.fi : '') +
        JC[p.jc] + '\\f0\\fs' + p.sz + ' ' + p.runs.map((r) => (r.tab ? '\\tab ' : (r.t ? T(r) : ''))).join('');
      let rtf = '{\\rtf1\\ansi\\deff0\n{\\fonttbl\n{\\f0\\fnil\\fcharset0 ' + (h.fontName || 'Kalpurush') + ';}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n{\\colortbl;\\red0\\green0\\blue0;}\n' +
        '\\landscape\\paperw' + g.pageW + '\\paperh' + g.pageH + '\\margl' + g.left + '\\margr' + g.right + '\\margt' + g.top + '\\margb' + g.bottom + '\\cols1\n';
      if (model.variant !== 'stub') {
        rtf += '\\pgbrdropt32' + ['t', 'l', 'b', 'r'].map((k) => '\\pgbrdr' + k + '\\brdrdb\\brdrw15\\brsp20').join('') + '\n';
        const w = g.textW;
        for (const p of this._keepFooter(this._paras(model.parts[0], g))) {
          if (p.side) {
            const s = p.side;
            const brd = '\\clbrdrt\\brdrs\\brdrw10\\clbrdrl\\brdrs\\brdrw10\\clbrdrb\\brdrs\\brdrw10\\clbrdrr\\brdrs\\brdrw10';
            s.table.rows.forEach((row, ri) => {
              const vm = ri === 0 ? '\\clvmgf' : '\\clvmrg';
              let defs = '\\trowd\\trgaph80\\trleft0\\trkeep\\clvertalc' + vm + '\\cellx' + s.gw + '\\clvertalc' + vm + '\\cellx' + (s.gw + s.cw);
              let xx = s.gw + s.cw;
              for (const cw of s.widths) { xx += cw; defs += '\\clvertalc' + brd + '\\cellx' + xx; }
              const center = ri === 0 && s.center.length ? s.center.map((c, i) => fmt(c, true) + (i < s.center.length - 1 ? '\\par\n' : '\\cell\n')).join('') : '\\pard\\plain\\intbl \\cell\n';
              let cells = '\\pard\\plain\\intbl \\cell\n' + center;
              s.widths.forEach((cw, ci) => {
                const t = String(row[ci] == null ? '' : row[ci]);
                cells += '\\pard\\plain\\intbl\\qc\\f0\\fs' + s.sz + '\\sl240\\slmult1 ' + (t ? (ri === 0 && s.table.header ? '{\\b ' + h.rtf(t) + '}' : h.rtf(t)) : '') + '\\cell\n';
              });
              rtf += '{' + defs + '\n' + cells + '\\row}\n';
            });
            rtf += '\\pard\\plain\n';
            continue;
          }
          if (p.table) { if (AL) rtf += AL._rtfTable(p.table, h, { tableSz: p.sz, textW: w }); continue; }
          rtf += '{' + fmt(p, false) + '\\par}\n';
        }
        return rtf + '}\n';
      }
      const cellBody = (part) => {
        const ps = this._keepFooter(this._paras(part, g)).filter((p) => !p.table);
        if (!ps.length) return '\\pard\\plain\\intbl \\cell ';
        return ps.map((p, i) => fmt(p, true) + (i < ps.length - 1 ? '\\par\n' : '\\cell\n')).join('');
      };
      const thick = '\\clbrdrt\\brdrs\\brdrw60\\clbrdrl\\brdrs\\brdrw60\\clbrdrb\\brdrs\\brdrw60\\clbrdrr\\brdrs\\brdrw60';
      const x1 = g.widths[0], x2 = x1 + g.widths[1], x3 = x2 + g.widths[2];
      rtf += '{\\trowd\\trgaph' + CELL_PAD + '\\trleft0\\trkeep\\trrh' + (g.usableH - ROW_SPARE) +
        '\\trpaddt' + CELL_PAD + '\\trpaddb' + CELL_PAD + '\\trpaddft3\\trpaddfb3\n' +
        '\\clvertalt' + thick + '\\cellx' + x1 + '\\clvertalt\\cellx' + x2 + '\\clvertalt' + thick + '\\cellx' + x3 + '\n' +
        cellBody(model.parts[0]) + '\\pard\\plain\\intbl \\cell\n' + cellBody(model.parts[1]) + '\\row}\n\\pard\\plain\\sl-20\\slmult0\\fs2\\par\n';
      return rtf + '}\n';
    },

    // ------------------------------------------------------------------ HTML প্রিভিউ
    renderHtml(model, options, h) {
      const o = options || {};
      const isBijoy = o.font === 'bijoy' || o.font === 'sutonnymj';
      const g = this.geometry(model, { isBijoy });
      const AL = getAL();
      const esc = (h && h.esc) || ((s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      const inch = (tw) => (tw / 1440).toFixed(2) + 'in';
      const JC = { left: 'left', center: 'center', right: 'right', both: 'justify' };
      const P = (p) => {
        if (p.side) {
          const s = p.side;
          const tbl = AL ? AL.renderHtml({ blocks: [s.table] }, { font: o.font, geometry: { tableSz: s.sz, textW: s.gw, sz: s.sz, line: 240 }, bodyOnly: true }, { esc }) : '';
          return '<div style="display: flex; align-items: center;"><div style="width: ' + inch(s.gw) + ';"></div><div style="width: ' + inch(s.cw) + ';">' +
            s.center.map(P).join('') + '</div><div style="width: ' + inch(s.gw) + ';">' + tbl + '</div></div>';
        }
        if (p.table) return AL ? '<div style="margin-top: 0.08in;">' + AL.renderHtml({ blocks: [p.table] }, { font: o.font, geometry: { tableSz: p.sz, textW: g.textW, sz: p.sz, line: 240 }, bodyOnly: true }, { esc }) + '</div>' : '';
        const lh = (1.34 * p.line / 240).toFixed(2);
        const run = (r) => { let s = esc(r.t); if (r.u) s = '<u>' + s + '</u>'; if (r.b) s = '<b>' + s + '</b>'; return '<span style="font-size: ' + (r.sz / 2) + 'pt;">' + s + '</span>'; };
        const inner = p.tabR
          ? '<span style="display: flex; justify-content: space-between;">' + p.runs.filter((r) => !r.tab).map(run).join('') + '</span>'
          : p.runs.map(run).join('');
        return '<div style="font-size: ' + (p.sz / 2) + 'pt; line-height: ' + lh + '; min-height: ' + lh + 'em; text-align: ' + JC[p.jc] + ';' +
          (p.before ? ' margin-top: ' + (p.before / 20) + 'pt;' : '') + (p.li ? ' margin-left: ' + inch(p.li) + ';' : '') + (p.ri ? ' margin-right: ' + inch(p.ri) + ';' : '') +
          (p.fi ? ' text-indent: ' + inch(p.fi) + ';' : '') + (p.box ? ' border: 1.5px solid #000; padding: 0 4pt;' : '') + '">' + (inner || '&nbsp;') + '</div>';
      };
      const partHtml = (part) => this._paras(part, g).map(P).join('');
      const fontClass = isBijoy ? 'font-sutonny' : 'font-kalpurush';
      const pad = inch(g.top) + ' ' + inch(g.right) + ' ' + inch(g.bottom) + ' ' + inch(g.left);
      let body;
      if (model.variant === 'stub') {
        const box = (w, part) => '<div style="width: ' + inch(w) + '; box-sizing: border-box; border: 4.5pt solid #000; padding: ' + inch(CELL_PAD) + ';">' + partHtml(part) + '</div>';
        body = '<div style="display: flex; gap: ' + inch(GAP_W) + '; align-items: stretch; min-height: ' + inch(g.usableH - ROW_SPARE) + ';">' + box(g.widths[0], model.parts[0]) + box(g.widths[2], model.parts[1]) + '</div>';
      } else {
        body = '<div style="border: 3px double #000; padding: 0.15in; min-height: ' + inch(g.usableH - ROW_SPARE) + '; box-sizing: border-box;">' + partHtml(model.parts[0]) + '</div>';
      }
      return '<div class="paper-sheet size-a4-landscape official-certificate-layout ' + fontClass + '" ' + (o.editable ? 'contenteditable="true" spellcheck="false" ' : '') +
        'style="padding: ' + pad + '; box-sizing: border-box;">' + body + '</div>';
    }
  };

  global.FayzarCertificateLayout = FayzarCertificateLayout;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarCertificateLayout;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
