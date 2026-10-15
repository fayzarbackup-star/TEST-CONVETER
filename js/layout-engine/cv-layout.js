/**
 * Fayzar — বাংলা জীবনবৃত্তান্ত (CV_RESUME) লেআউট — Part-19.1
 * ==========================================================
 * দোকানের আসল নমুনা (`SAMPLE\CV\Bangla জীবন বৃত্তন্ত.doc`, ৮৭ পাতা একই ছাঁচে; Word COM দিয়ে মাপা):
 *  - পাতা   : A4 পোর্ট্রেট; উপরে ১", বামে ১", ডানে ০.৫", নিচে ০.৫"
 *  - শিরোনাম: "জীবন বৃত্তান্ত" মাঝে, বোল্ড + আন্ডারলাইন, ৩২pt
 *  - সারি   : "০১। নাম<ট্যাব>ঃ মান" — ১৬pt, লাইন ১.৭; ট্যাব ≈১৭৪pt (দীর্ঘতম লেবেলের পরে); মোড়ানো/ঠিকানার দ্বিতীয় লাইন মানের নিচে;
 *             নামের মান বোল্ড; উৎসের বিভাজক (ঃ বা :) অক্ষত
 *  - টেবিল  : শিক্ষাগত যোগ্যতা — বর্ডারসহ, হেডার বোল্ড, মাঝে (FayzarApplicationLayout-এর টেবিল-রেন্ডার)
 *  - নিচে   : বামে "তারিখঃ……ইং", ডানে দাগের নিচে "স্বাক্ষর" (সীমানাহীন ২-ঘরের টেবিল)
 * এক মডেল → DOCX / Word 2003 RTF / HTML প্রিভিউ। এক পাতায় না ধরলে ধাপে ধাপে ছোট (দোকানের ফাইলে কখনো শুধু
 * "তারিখ/স্বাক্ষর" পরের পাতায় চলে যেত — এখানে সেটা আটকানো)। ক্রম কখনো বদলায় না।
 */
(function (global) {
  'use strict';

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

  const RX = {
    title: /জীবন\s*বৃত্তান্ত|জীবনবৃত্তান্ত|বায়ো\s*-?\s*ডাটা|Curriculum\s*Vitae|Resume|Bio\s*-?\s*data/i,
    // "০১। নাম : মান" বা "পিতার নাম : মান" — লেবেল ছোট, বিভাজক ঃ বা :
    kv: /^(?:([০-৯\d]{1,2})\s*[।.|)]\s*)?([^:ঃ।]{1,40}?)\s*[-–]?\s*([:ঃ])\s*(.*)$/,
    heading: /^(?:ব্যক্তিগত\s*তথ্য|শিক্ষাগত\s*যোগ্যতা|অভিজ্ঞতা|কর্ম\s*অভিজ্ঞতা|চাকরির\s*অভিজ্ঞতা|দক্ষতা|কম্পিউটার\s*দক্ষতা|ভাষাগত\s*দক্ষতা|প্রশিক্ষণ|রেফারেন্স|তথ্যসূত্র|অঙ্গীকার(?:নামা)?|ঘোষণা|উদ্দেশ্য|ক্যারিয়ার\s*উদ্দেশ্য|Personal\s*Information|Educational?\s*Qualifications?|Experience|Skills|References?|Declaration|(?:Career\s*)?Objective)\s*[:ঃ]?\s*$/i,
    address: /ঠিকানা|Address/i,
    addrLine: /^(?:উপজেলা|জেলা|থানা|ডাকঘর|পোস্ট|গ্রাম|ইউনিয়ন|Upazila|District|Post|Vill)/i,
    name: /^(?:নাম|প্রার্থীর\s*নাম|আবেদনকারীর\s*নাম|Name)$/i,
    date: /^তারিখ\s*[:ঃ]?/,
    sign: /স্বাক্ষর|Signature/i,
    tableRow: /^\|.*\|$/,
    tableSep: /^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?$/,
    sentenceEnd: /[।?!]\s*$/,
    numLead: /^[০-৯\d]{1,2}\s*[।.|)]/,
    abbr: /(^|[\s(])(মো|মোছা|মোসা|ডা|মুছা|মু|কোং)ঃ/g
  };
  for (const k of Object.keys(RX)) RX[k] = new RegExp(norm(RX[k].source), RX[k].flags);
  const ABBR_MARK = '';
  const maskAbbr = (t) => t.replace(RX.abbr, '$1$2' + ABBR_MARK);
  const unmaskKv = (m) => m && m.map((s) => (typeof s === 'string' ? s.split(ABBR_MARK).join('ঃ') : s));

  const STEPS = [
    { sz: 32, line: 408 },    // ১৬pt · ১.৭ (নমুনা)
    { sz: 30, line: 360 },
    { sz: 28, line: 336 },
    { sz: 26, line: 300 },
    { sz: 24, line: 264 }     // সর্বনিম্ন ১২pt (ব্যবহারকারী); এর বেশি লম্বা হলে ২ পাতা, তারিখ/স্বাক্ষর শেষ লেখার সাথে
  ];
  /** শেষ অনুচ্ছেদের শুরুর চিহ্নের ঠিক পরে keep বসায় (আগে থেকে থাকলে বাদ) */
  const keepLast = (s, mark, keep) => {
    const i = s.lastIndexOf(mark);
    if (i < 0 || s.startsWith(keep, i + mark.length)) return s;
    return s.slice(0, i + mark.length) + keep + s.slice(i + mark.length);
  };
  const PAGE = { pageW: 11906, pageH: 16838, top: 1440, bottom: 720, left: 1440, right: 720 };
  const TITLE_SZ = 64;

  const FayzarCvLayout = {
    RX,
    STEPS,

    /** বাংলা-প্রধান লেখা? (ইংরেজি সিভির দোকানের ছাঁচ আলাদা — সেগুলো পুরোনো ইঞ্জিনে) */
    isBangla(text) {
      const s = String(text || '').replace(/^\s*---[\s\S]*?---\s*/, '');
      const bn = (s.match(/[\u0980-\u09FF]/g) || []).length;
      const en = (s.match(/[A-Za-z]/g) || []).length;
      return bn > 0 && bn >= en;
    },

    parse(rawText) {
      const lines = norm(rawText).replace(/^\s*---[\s\S]*?---\s*/, '').split('\n').map(cleanLine).filter(Boolean);
      // ---- শেষের তারিখ/স্বাক্ষর ----
      const foot = this._takeFooter(lines);
      const body = foot ? lines.slice(0, foot.at) : lines;
      const blocks = [];
      let cur = null;
      const push = (b) => { blocks.push(b); cur = b; return b; };
      for (let i = 0; i < body.length; i++) {
        const t = body[i];
        if (RX.tableRow.test(t)) {
          if (RX.tableSep.test(t)) continue;
          const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
          if (cur && cur.kind === 'table') cur.rows.push(cells);
          else push({ kind: 'table', rows: [cells], header: !!(body[i + 1] && RX.tableSep.test(body[i + 1])) });
          continue;
        }
        if (!blocks.length && t.length <= 40 && RX.title.test(t) && !/[:ঃ]\s*\S/.test(t)) { push({ kind: 'title', text: t }); continue; }
        if (RX.heading.test(t)) { push({ kind: 'heading', text: t }); continue; }
        // নম্বরওয়ালা সারিতে ঠিকানার পরের নম্বরহীন লাইন ("উপজেলাঃ সদর, জেলাঃ …") নতুন সারি নয় — মানের নিচে
        if (cur && cur.kind === 'kv' && cur.rows[0].num && t.length <= 90 && !RX.numLead.test(t) && RX.address.test(cur.rows[cur.rows.length - 1].label)) {
          cur.rows[cur.rows.length - 1].more.push(t); continue;
        }
        // "মোঃ/মোছাঃ/ডাঃ" সংক্ষেপের ঃ বিভাজক নয়
        const m = unmaskKv(maskAbbr(t).match(RX.kv));
        // লেবেল-বাক্য নয়: ছোট, আর নম্বর থাকলে যেকোনো; নম্বর ছাড়া হলে লেবেলে ৫ শব্দের বেশি নয়
        if (m && (m[1] || m[2].trim().split(/\s+/).length <= 5)) {
          const row = { num: m[1] || '', label: m[2].trim(), sep: m[3], value: m[4].trim(), more: [] };
          if (cur && cur.kind === 'kv') cur.rows.push(row); else push({ kind: 'kv', rows: [row] });
          continue;
        }
        // মানের দ্বিতীয় লাইন (ঠিকানা বা মোড়ানো মান) — আগের সারির নিচে
        if (cur && cur.kind === 'kv' && t.length <= 90) {
          const last = cur.rows[cur.rows.length - 1];
          if (RX.address.test(last.label) || RX.addrLine.test(t) || (last.value && !RX.sentenceEnd.test(last.value))) { last.more.push(t); continue; }
        }
        if (cur && cur.kind === 'para' && !RX.sentenceEnd.test(cur.text)) { cur.text += ' ' + t; continue; }
        push({ kind: 'para', text: t });
      }
      if (foot) blocks.push({ kind: 'footer', date: foot.date, sign: foot.sign });
      return { kind: 'CV_LAYOUT', version: 1, blocks };
    },

    /** শেষের লাইনগুলোতে "তারিখঃ……ইং" ও "স্বাক্ষর" (এক লাইনে বা আলাদা), সঙ্গে স্বাক্ষরের নিচের নাম */
    _takeFooter(lines) {
      let k = lines.length;
      let seenSign = false, seenDate = false;
      while (k > 0 && lines.length - k < 6) {
        const t = lines[k - 1];
        const isDate = RX.date.test(t) && t.length <= 70;
        const isSign = RX.sign.test(t) && t.length <= 70;
        const isName = /^\(.{2,50}\)$/.test(t) || /^[._…\-–]{3,}$/.test(t);
        if (!(isDate || isSign || isName)) break;
        seenSign = seenSign || isSign; seenDate = seenDate || isDate;
        k--;
      }
      if (!seenSign && !seenDate) return null;
      let date = '';
      const sign = [];
      for (const t of lines.slice(k)) {
        if (/^[._…\-–]{3,}$/.test(t)) continue;                       // দাগ নিজেরা আঁকি
        if (RX.date.test(t)) {
          const s = t.search(RX.sign);
          if (s > 0) { date = t.slice(0, s).trim(); sign.push(t.slice(s).trim()); } else date = t;
          continue;
        }
        sign.push(t);
      }
      return { at: k, date, sign };
    },

    // ------------------------------------------------------------------ মাপ
    geometry(model, opts) {
      const o = opts || {};
      const mk = (s, i) => {
        const g = Object.assign({}, PAGE, s, { fitStep: i });
        g.textW = g.pageW - g.left - g.right;
        g.usableH = g.pageH - g.top - g.bottom;
        g.tableSz = s.sz;
        g.paraLine = Math.max(240, Math.round(s.line * 0.8));
        return g;
      };
      if (Number.isInteger(o.step) && STEPS[o.step]) return mk(STEPS[o.step], o.step);
      const base = mk(STEPS[0], 0);
      if (o.noFit || !model || !model.blocks) return base;
      for (let i = 0; i < STEPS.length; i++) {
        const g = mk(STEPS[i], i);
        if (this.estimateHeight(model, g, o.isBijoy) <= g.usableH) return g;
      }
      return mk(STEPS[STEPS.length - 1], STEPS.length - 1);   // কোনো ধাপেই না ধরলে সবচেয়ে ছোট ধাপ
    },

    /** মানের ট্যাব: দীর্ঘতম "নম্বর। লেবেল"-এর পরে (নমুনা ১৬pt-এ ≈৩৪৮০ টুইপ) */
    _kvTab(rows, sz) {
      const widest = rows.reduce((a, r) => Math.max(a, measure(this._kvLead(r), sz)), 0);
      return Math.min(4600, Math.max(2600, widest + 280));
    },
    _kvLead(r) { return (r.num ? r.num + '। ' : '') + r.label; },
    _kvIndent(rows, g) { return this._kvTab(rows, g.sz) + Math.round(measure('ঃ ', g.sz)) + 40; },
    _isNameRow(b, r) { return RX.name.test(r.label) && b.rows.find((x) => RX.name.test(x.label)) === r; },

    _gap(prev, b) {
      if (!prev) return 0;
      if (prev.kind === 'title') return 0;              // শিরোনামের পরে ছোট ফাঁক আলাদা (spacer)
      if (b.kind === 'footer') return 2;
      if (b.kind === 'table' && prev.kind === 'kv') return 0;
      if (b.kind === 'kv' && prev.kind === 'kv') return 0;
      return 1;
    },

    estimateHeight(model, g, isBijoy) {
      const AL = getAL();
      const ff = isBijoy ? 1.02 : 1.24;
      const corr = isBijoy ? 1.08 : 1.24;
      const lineH = (sz, line) => (sz / 2) * 20 * (line / 240) * ff;
      const L = (t, w, sz) => Math.max(1, Math.ceil(measure(String(t || ''), sz) / Math.max(1500, w)));
      const one = lineH(g.sz, g.line);
      let h = 0, prev = null;
      for (const b of model.blocks) {
        h += this._gap(prev, b) * one * corr;
        prev = b;
        if (b.kind === 'table') { if (AL) h += AL.estimateHeight({ blocks: [b] }, g, isBijoy); continue; }
        let x = 0;
        switch (b.kind) {
          case 'title': x += lineH(TITLE_SZ, 240) + lineH(12, 240) * 2; break;
          case 'heading': x += one; break;
          case 'kv': {
            const ind = this._kvIndent(b.rows, g);
            for (const r of b.rows) {
              x += L(r.sep + ' ' + r.value, g.textW - ind, g.sz) * one;
              for (const mo of r.more) x += L(mo, g.textW - ind, g.sz) * one;
            }
            break;
          }
          case 'para': x += L(b.text, g.textW, g.sz) * lineH(g.sz, g.paraLine); break;
          case 'footer': x += (1 + b.sign.length) * lineH(g.sz, 240) + 120; break;
          default: break;
        }
        h += x * corr;
      }
      return Math.round(h);
    },

    // ------------------------------------------------------------------ DOCX
    /** @param h { runs(text, style), isBijoy, geometry } */
    renderDocx(model, h) {
      const AL = getAL();
      const g = (h && h.geometry) || this.geometry(model, { isBijoy: h && h.isBijoy });
      const sp = (line) => '<w:spacing w:before="0" w:after="0" w:line="' + (line || g.line) + '" w:lineRule="auto"/>';
      // pPr-এর ক্রম (স্কিমা): keepNext/pBdr → tabs → spacing → ind → jc → rPr; parts = [আগে, tabs, পরে] অথবা শুধু "পরে"
      const P = (inner, parts, line) => {
        const [pre, tabs, post] = Array.isArray(parts) ? parts : ['', '', parts || ''];
        return '<w:p><w:pPr>' + (pre || '') + (tabs || '') + sp(line) + (post || '') + '</w:pPr>' + (inner || '') + '</w:p>';
      };
      const R = (t, st) => h.runs(t, Object.assign({ sz: g.sz }, st || {}));
      const blank = P('', '<w:rPr><w:sz w:val="' + g.sz + '"/><w:szCs w:val="' + g.sz + '"/></w:rPr>');
      let xml = '';
      let prev = null;
      for (const b of model.blocks) {
        if (b.kind === 'footer') xml = keepLast(xml, '<w:pPr>', '<w:keepNext/>');   // তারিখ/স্বাক্ষর শেষ লেখার পাতায়
        xml += (b.kind === 'footer' ? blank.replace('<w:pPr>', '<w:pPr><w:keepNext/>') : blank).repeat(this._gap(prev, b));
        prev = b;
        switch (b.kind) {
          case 'title':
            xml += P(R(b.text, { sz: TITLE_SZ, b: true, u: true }), '<w:jc w:val="center"/>', 240);
            xml += P('', '<w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>', 240);
            break;
          case 'heading':
            xml += P(R(b.text, { b: true, u: true }), ['<w:keepNext/>', '', '']);
            break;
          case 'kv': {
            const tab = this._kvTab(b.rows, g.sz), ind = this._kvIndent(b.rows, g);
            const tabs = '<w:tabs><w:tab w:val="left" w:pos="' + tab + '"/></w:tabs>';
            for (const r of b.rows) {
              const bold = this._isNameRow(b, r);
              xml += P(R(this._kvLead(r)) + '<w:r><w:tab/></w:r>' + R(r.sep + ' ' + r.value, { b: bold }), ['', tabs, '<w:ind w:left="' + ind + '" w:hanging="' + ind + '"/>']);
              for (const mo of r.more) xml += P(R(mo, { b: bold }), '<w:ind w:left="' + ind + '"/>');
            }
            break;
          }
          case 'table':
            if (AL) xml += AL._docxTable(b, h, g);
            break;
          case 'para':
            xml += P(R(b.text), '<w:jc w:val="both"/>', g.paraLine);
            break;
          case 'footer':
            xml += this._docxFooter(b, h, g);
            break;
          default: break;
        }
      }
      return xml;
    },

    /** বামে তারিখ (নিচে-সাজানো), ডানে দাগ + "স্বাক্ষর" — সীমানাহীন টেবিল (নমুনার মতো) */
    _docxFooter(b, h, g) {
      const R = (t) => h.runs(t, { sz: g.sz });
      const sw = 2880, lw = g.textW - sw;
      const none = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((k) => '<w:' + k + ' w:val="nil"/>').join('');
      const p = (inner, pre, jc) => '<w:p><w:pPr>' + (pre || '') + '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="' + jc + '"/></w:pPr>' + (inner || '') + '</w:p>';
      const line = '<w:pBdr><w:top w:val="single" w:sz="6" w:space="1" w:color="000000"/></w:pBdr>';
      let right = '';
      b.sign.forEach((s, i) => { right += p(R(s), i === 0 && RX.sign.test(s) ? line : '', 'center'); });
      if (!right) right = p('', '', 'center');
      return '<w:tbl><w:tblPr><w:tblW w:w="' + g.textW + '" w:type="dxa"/><w:tblBorders>' + none + '</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr>' +
        '<w:tblGrid><w:gridCol w:w="' + lw + '"/><w:gridCol w:w="' + sw + '"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>' +
        '<w:tc><w:tcPr><w:tcW w:w="' + lw + '" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>' + p(b.date ? R(b.date) : '', '', 'left') + '</w:tc>' +
        '<w:tc><w:tcPr><w:tcW w:w="' + sw + '" w:type="dxa"/></w:tcPr>' + right + '</w:tc></w:tr></w:tbl>';
    },

    docxSectPr(g) {
      const G = g || this.geometry(null);
      return '<w:sectPr><w:pgSz w:w="' + G.pageW + '" w:h="' + G.pageH + '"/>' +
        '<w:pgMar w:top="' + G.top + '" w:right="' + G.right + '" w:bottom="' + G.bottom + '" w:left="' + G.left + '" w:header="720" w:footer="360" w:gutter="0"/>' +
        '<w:cols w:num="1"/></w:sectPr>';
    },

    // ------------------------------------------------------------------ Word 2003 (RTF)
    renderRtf(model, h) {
      const AL = getAL();
      const g = (h && h.geometry) || this.geometry(model, { isBijoy: h && h.isBijoy });
      const P = (body, pfx, sz, line) => '{\\pard\\plain\\f0\\fs' + (sz || g.sz) + '\\sl' + (line || g.line) + '\\slmult1\\sb0\\sa0' + (pfx || '\\ql') + ' ' + (body || '') + '\\par}\n';
      const T = (t, st) => {
        let s = h.rtf(t);
        if (st && st.u) s = '{\\ul ' + s + '}';
        if (st && st.b) s = '{\\b ' + s + '}';
        return s;
      };
      const blank = P('');
      let rtf = '{\\rtf1\\ansi\\deff0\n{\\fonttbl\n{\\f0\\fnil\\fcharset0 ' + (h.fontName || 'Kalpurush') + ';}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n{\\colortbl;\\red0\\green0\\blue0;}\n' +
        '\\paperw' + g.pageW + '\\paperh' + g.pageH + '\\margl' + g.left + '\\margr' + g.right + '\\margt' + g.top + '\\margb' + g.bottom + '\\cols1\n';
      let prev = null;
      for (const b of model.blocks) {
        if (b.kind === 'footer') rtf = keepLast(rtf, '\\pard\\plain', '\\keepn');
        rtf += (b.kind === 'footer' ? blank.replace('\\pard\\plain', '\\pard\\plain\\keepn') : blank).repeat(this._gap(prev, b));
        prev = b;
        switch (b.kind) {
          case 'title': rtf += P(T(b.text, { b: true, u: true }), '\\qc', TITLE_SZ, 240) + P('', '\\ql', 24, 240); break;
          case 'heading': rtf += P(T(b.text, { b: true, u: true }), '\\keepn\\ql'); break;
          case 'kv': {
            const tab = this._kvTab(b.rows, g.sz), ind = this._kvIndent(b.rows, g);
            for (const r of b.rows) {
              const bold = this._isNameRow(b, r);
              rtf += P(T(this._kvLead(r)) + '\\tab ' + T(r.sep + ' ' + r.value, { b: bold }), '\\ql\\li' + ind + '\\fi-' + ind + '\\tx' + tab);
              for (const mo of r.more) rtf += P(T(mo, { b: bold }), '\\ql\\li' + ind);
            }
            break;
          }
          case 'table': if (AL) rtf += AL._rtfTable(b, h, g); break;
          case 'para': rtf += P(T(b.text), '\\qj', g.sz, g.paraLine); break;
          case 'footer': {
            const sw = 2880, lw = g.textW - sw;
            const cell = (txt, extra) => '\\pard\\plain\\intbl' + (extra || '\\ql') + '\\f0\\fs' + g.sz + '\\sl240\\slmult1 ' + txt;
            let right = '';
            b.sign.forEach((s, i) => { right += cell(T(s), '\\qc' + (i === 0 && RX.sign.test(s) ? '\\brdrt\\brdrs\\brdrw10\\brsp20' : '')) + (i < b.sign.length - 1 ? '\\par ' : ''); });
            rtf += '{\\trowd\\trgaph80\\trleft0\\trkeep\\clvertalb\\cellx' + lw + '\\cellx' + (lw + sw) + '\n' +
              cell(b.date ? T(b.date) : '') + '\\cell ' + (right || cell('')) + '\\cell \\row}\n\\pard\\plain\n';
            break;
          }
          default: break;
        }
      }
      return rtf + '}\n';
    },

    // ------------------------------------------------------------------ HTML প্রিভিউ
    renderHtml(model, options, h) {
      const AL = getAL();
      const o = options || {};
      const isBijoy = o.font === 'bijoy' || o.font === 'sutonnymj';
      const g = this.geometry(model, { isBijoy });
      const esc = (h && h.esc) || ((s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      const inch = (tw) => (tw / 1440).toFixed(2) + 'in';
      const lh = (1.34 * g.line / 240).toFixed(2);
      const p = (inner, style) => '<div style="min-height: ' + lh + 'em; line-height: ' + lh + ';' + (style || '') + '">' + (inner || '&nbsp;') + '</div>';
      const blank = p('');
      let html = '';
      let prev = null;
      for (const b of model.blocks) {
        html += blank.repeat(this._gap(prev, b));
        prev = b;
        switch (b.kind) {
          case 'title': html += '<div style="text-align: center; font-weight: 700; text-decoration: underline; line-height: 1.3; font-size: ' + (TITLE_SZ / 2) + 'pt; margin-bottom: 0.25em;">' + esc(b.text) + '</div>'; break;
          case 'heading': html += p('<b><u>' + esc(b.text) + '</u></b>'); break;
          case 'kv': {
            const tab = this._kvTab(b.rows, g.sz), ind = inch(this._kvIndent(b.rows, g));
            for (const r of b.rows) {
              const v = esc(r.sep + ' ' + r.value);
              html += p('<span style="display: inline-block; width: ' + inch(tab) + '; text-indent: 0;">' + esc(this._kvLead(r)) + '</span>' + (this._isNameRow(b, r) ? '<b>' + v + '</b>' : v),
                'padding-left: ' + ind + '; text-indent: -' + ind + ';');
              for (const mo of r.more) html += p(esc(mo), 'padding-left: ' + ind + ';');
            }
            break;
          }
          case 'table': if (AL) html += AL.renderHtml({ blocks: [b] }, { font: o.font, geometry: g, bodyOnly: true }, { esc }); break;
          case 'para': html += p(esc(b.text), 'text-align: justify;'); break;
          case 'footer':
            html += '<div style="display: flex; align-items: flex-end; line-height: 1.34;"><div style="flex: 1;">' + esc(b.date) + '</div><div style="width: 2in; text-align: center;">' +
              b.sign.map((s, i) => '<div' + (i === 0 && RX.sign.test(s) ? ' style="border-top: 1px solid #000;"' : '') + '>' + esc(s) + '</div>').join('') + '</div></div>';
            break;
          default: break;
        }
      }
      const fontClass = isBijoy ? 'font-sutonny' : 'font-kalpurush';
      const pad = inch(g.top) + ' ' + inch(g.right) + ' ' + inch(g.bottom) + ' ' + inch(g.left);
      return '<div class="paper-sheet size-a4-portrait official-cv-layout ' + fontClass + '" ' + (o.editable ? 'contenteditable="true" spellcheck="false" ' : '') +
        'style="padding: ' + pad + '; font-size: ' + (g.sz / 2) + 'pt; box-sizing: border-box;">' + html + '</div>';
    }
  };

  global.FayzarCvLayout = FayzarCvLayout;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarCvLayout;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
