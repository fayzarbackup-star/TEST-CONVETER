/**
 * Fayzar — ইংরেজি সিভি (English CV / Resume) লেআউট — TEMPLATE_COMPOSE_PLAN T2 দল ৫
 * ==================================================================================
 * দোকানের আসল নমুনা (`SAMPLE\CV\Taher Khan.doc`, `Najmul.doc`, `Anu mama - Copy (2).doc` — একই ছাঁচ; Word COM দিয়ে মাপা):
 *  - পাতা   : A4 পোর্ট্রেট; উপরে ০.৫", নিচে ০.৫", বামে ১", ডানে ০.৫"
 *  - মাথা   : মাঝে "CURRICULUM VITAE" (Arial Black ১৮ বোল্ড) / "OF" (১৬ বোল্ড) / নাম (২২ বোল্ড) / C/O, ঠিকানা (১২) / "Cell Phone" (১২ বোল্ড);
 *             ডানে ছবির বাক্স (≈১.৫"×১.৯")
 *  - অংশ    : ধূসর (#737373) পটির ওপর সাদা বোল্ড শিরোনাম (Calibri ১৮) — Career Objective, Educational Qualification …
 *  - পরীক্ষা: উপ-শিরোনাম (১৭ বোল্ড), তারপর "Label<ট্যাব>:<ট্যাব>মান" সারি (১৫, লাইন ১.৩; ট্যাব ১৭৫.৫pt / ১৯৪pt)
 *  - দক্ষতা : বুলেট (বামে ০.৫", ঝুলন্ত ০.২৫"); ভাষা-দক্ষতা বর্ডারসহ ছকে (হেডার বোল্ড, মাঝে)
 *  - শেষে   : Declaration অনুচ্ছেদ (১৪, দুই পাশে সমান), তারপর দাগ, "(নাম)", "Date: ……"
 * ভাসমান আকার (shape) নয় — ছবির বাক্স আর ধূসর পটি টেবিলের ঘর, তাই docx→doc পথেও অক্ষত থাকে।
 * এক মডেল → DOCX / Word 2003 RTF / HTML প্রিভিউ। তালা `template: cv-english` বা তালা ছাড়া ইংরেজি-প্রধান সিভি ⇒ এই লেআউট।
 */
(function (global) {
  'use strict';

  function norm(text) {
    return String(text == null ? '' : text)
      .replace(/\u09AF\u09BC/g, '\u09DF').replace(/\u09A1\u09BC/g, '\u09DC').replace(/\u09A2\u09BC/g, '\u09DD')
      .replace(/\r\n?/g, '\n');
  }
  const FRONT = /^\uFEFF?\s*---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/;
  function readFm(text) {
    const m = norm(text).match(FRONT);
    const fm = {};
    if (m) for (const ln of m[1].split('\n')) { const kv = ln.match(/^\s*([A-Za-z_]+)\s*:\s*(.*)$/); if (kv) fm[kv[1].toLowerCase()] = kv[2].trim(); }
    return { fm, body: m ? norm(text).slice(m[0].length) : norm(text) };
  }
  // "## শিরোনাম" স্তর আগে জেনে তারপর চিহ্ন বাদ
  const level = (l) => { const m = String(l).match(/^\s*(#{1,6})\s+/); return m ? m[1].length : 0; };
  const clean = (l) => String(l).replace(/\*\*/g, '').replace(/^\s*#{1,6}\s*/, '').replace(/^>\s*/, '').replace(/\t+/g, ' ').trim();

  const RX = {
    title: /^(?:curriculum\s*vitae|resume|résumé|bio\s*-?\s*data|cv)\s*:?$/i,
    of: /^of$/i,
    heading: /^(?:career\s*objectives?|objectives?|carrier\s*objectives?|educational?\s*qualifications?|academic\s*qualifications?|education|(?:work(?:ing)?\s*|job\s*|professional\s*)?experiences?|employment\s*history|training(?:s)?|computer\s*(?:skills?|knowledge|literacy)|(?:special\s*)?skills?|competitive\s*strengths?|strengths?|language\s*(?:skills?|proficiency)|languages?|personal\s*(?:information|details|profile)|extra[\s-]*curricular\s*activities|hobbies|interests?|references?|declaration|contact\s*info(?:rmation)?)\s*[:：]?\s*$/i,
    exam: /^(?:(?:higher\s*)?secondary\s*school\s*certificate|junior\s*school\s*certificate|primary\s*(?:school\s*)?(?:education\s*)?certificate|bachelor|master|honou?rs|diploma|degree|b\.?\s?a\b|b\.?\s?sc|b\.?\s?com|m\.?\s?a\b|m\.?\s?sc|m\.?\s?com|bba|mba|ssc|hsc|jsc|psc|dakhil|alim|fazil|kamil)\b[^:：]*$/i,
    kv: /^([A-Za-z][A-Za-z0-9 .'’()\/&,-]{0,44}?)\s*[:：]\s*(.*)$/,
    address: /address/i,
    addrLine: /^(?:vill(?:age)?|post|p\.?\s?o|p\.?\s?s|upazila|thana|dist(?:rict)?|road|house|holding|ward|union|sub-?district)\b/i,
    phone: /^(?:cell|mobile|phone|contact|tel)/i,
    // মাথার যোগাযোগ-লাইনের লেবেল (এগুলো ছাড়া অন্য "লেবেল : মান" এলে মাথা শেষ)
    contact: /^(?:c\/o|care\s*of|vill(?:age)?|post|p\.?\s?o|p\.?\s?s|upazila|thana|dist(?:rict)?|cell(?:\s*phone)?|mobile|phone|tel|e-?mail|contact(?:\s*no)?)\.?$/i,
    name: /^(?:full\s*)?name$/i,
    bullet: /^\s*(?:[-*•➢✓►▪●◆]|\d{1,2}[.)])\s+/,
    tableRow: /^\|.*\|$/,
    tableSep: /^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?$/,
    signLine: /^_{4,}\s*$/,
    signName: /^\(.{2,60}\)$/,
    sign: /^(?:signature|signature\s*of\s*the\s*applicant|applicant'?s\s*signature)\s*:?$/i,
    date: /^date\s*[:：.-]/i,
    sentenceEnd: /[.!?]\s*$/
  };
  const HAS_BN = /[\u0980-\u09FF]/;

  // মাপ (টুইপ; অর্ধ-পয়েন্ট আকার) — নমুনা থেকে
  const PAGE = { pageW: 11906, pageH: 16838, top: 720, bottom: 720, left: 1440, right: 720 };
  const SZ = { title: 36, of: 32, name: 44, contact: 24, heading: 36, sub: 34, kv: 30, para: 28, bullet: 30, table: 30, foot: 30 };
  const LINE = { kv: 312, head: 288, single: 240 };
  const PHOTO = { w: 2160, h: 2736, blanks: 9 };
  const SHADE = '737373';
  const FONT = { en: 'Times New Roman', title: 'Arial Black', heading: 'Calibri' };

  const FayzarEnCvLayout = {
    RX, PAGE, SZ,

    /** তালা `template: cv-english` ⇒ এই লেআউট; অন্য ছাঁচের তালা ⇒ না; তালা নেই ⇒ ইংরেজি-প্রধান সিভি হলে এটিই (মালিকের অনুমতি ২০২৬-১০-১১) */
    wants(text, options) {
      const o = options || {};
      const { fm, body } = readFm(text);
      const all = Object.assign({}, fm, o.__frontmatter || {});
      const tpl = String(o.template || all.template || '').trim().toLowerCase();
      if (tpl) return tpl === 'cv-english';
      const bn = (body.match(/[ঀ-৿]/g) || []).length;
      const en = (body.match(/[A-Za-z]/g) || []).length;
      return en > 0 && !(bn > 0 && bn >= en);   // cv-layout.isBangla-র উল্টো
    },

    // ------------------------------------------------------------------ পার্স
    parse(rawText) {
      const raw = readFm(rawText).body.split('\n').map((l) => ({ lv: level(l), t: clean(l) })).filter((x) => x.t);
      const isHeading = (x) => (x.lv === 2 || (x.lv === 1 && !RX.title.test(x.t)) || RX.heading.test(x.t)) && x.t.length <= 50 && !RX.title.test(x.t);
      // ---- মাথা: প্রথম অংশ-শিরোনাম বা প্রথম অ-যোগাযোগ সারির ("Name : …") আগ পর্যন্ত
      const bodyKv = (t) => { const m = t.match(RX.kv); return !!m && !RX.contact.test(m[1].trim()); };
      let k = 0;
      while (k < raw.length && !isHeading(raw[k]) && !bodyKv(raw[k].t)) k++;
      const head = this._head(raw.slice(0, k).map((x) => x.t));
      if (!head.name) {   // আলাদা নাম-লাইন নেই ⇒ "Name : …" সারির মান (দোকানের মতো বড় হাতে)
        const nm = raw.slice(k).map((x) => x.t.match(RX.kv)).find((m) => m && RX.name.test(m[1].trim()) && m[2].trim());
        if (nm) { head.name = nm[2].trim().toUpperCase(); if (!head.of && /curriculum/i.test(head.title)) head.of = 'OF'; }
      }
      // ---- শেষের স্বাক্ষর/তারিখ
      const body = raw.slice(k);
      const foot = this._takeFooter(body.map((x) => x.t));
      const rest = foot ? body.slice(0, foot.at) : body;
      const blocks = [head];
      let cur = null, section = '';
      const push = (b) => { blocks.push(b); cur = b; return b; };
      for (let i = 0; i < rest.length; i++) {
        const { lv, t } = rest[i];
        if (RX.tableRow.test(t)) {
          if (RX.tableSep.test(t)) continue;
          const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
          if (cur && cur.kind === 'table') cur.rows.push(cells);
          else push({ kind: 'table', rows: [cells], header: !!(rest[i + 1] && RX.tableSep.test(rest[i + 1].t)) });
          continue;
        }
        if (isHeading(rest[i])) { section = t.toLowerCase(); push({ kind: 'heading', text: t }); continue; }
        if (lv >= 3 || (/educat|academic|qualif/.test(section) && RX.exam.test(t) && t.length <= 70)) { push({ kind: 'sub', text: t }); continue; }
        if (RX.bullet.test(t)) {
          const it = t.replace(RX.bullet, '').trim();
          if (cur && cur.kind === 'bullets') cur.items.push(it); else push({ kind: 'bullets', items: [it] });
          continue;
        }
        // ঠিকানার পরের লাইন ("P.S: Phulbari, Dist: Dinajpur") নতুন সারি নয় — মানের নিচে
        if (cur && cur.kind === 'kv' && t.length <= 90) {
          const last = cur.rows[cur.rows.length - 1];
          if (RX.address.test(last.label) && (RX.addrLine.test(t) || !RX.kv.test(t))) { last.more.push(t); continue; }
        }
        const m = t.match(RX.kv);
        if (m && m[1].trim().split(/\s+/).length <= 5 && !RX.sentenceEnd.test(m[1])) {
          const row = { label: m[1].trim(), value: m[2].trim(), more: [] };
          if (cur && cur.kind === 'kv') cur.rows.push(row); else push({ kind: 'kv', rows: [row] });
          continue;
        }
        // লম্বা অনুচ্ছেদ মোড়ানো লাইনে ভাঙলে জোড়া; ছোট লাইন (অভিজ্ঞতার পদ/তারিখ/প্রতিষ্ঠান) আলাদাই
        if (cur && cur.kind === 'para' && cur.text.length >= 60 && !RX.sentenceEnd.test(cur.text)) { cur.text += ' ' + t; continue; }
        push({ kind: 'para', text: t });
      }
      if (foot) blocks.push({ kind: 'footer', sign: foot.sign, date: foot.date });
      return { kind: 'EN_CV_LAYOUT', version: 1, blocks };
    },

    /** মাথা: শিরোনাম, "OF", নাম, বাকি লাইন (ঠিকানা/ফোন/ই-মেইল) */
    _head(lines) {
      const h = { kind: 'head', title: '', of: '', name: '', lines: [] };
      let i = 0;
      if (lines[i] && RX.title.test(lines[i])) h.title = lines[i++].replace(/\s*:$/, '');
      if (lines[i] && RX.of.test(lines[i])) h.of = lines[i++];
      if (lines[i] && !RX.kv.test(lines[i]) && lines[i].length <= 50) h.name = lines[i++];
      for (; i < lines.length; i++) h.lines.push({ text: lines[i], b: RX.phone.test(lines[i]) });
      if (!h.title) h.title = 'CURRICULUM VITAE';
      if (!h.of && h.name && /curriculum/i.test(h.title)) h.of = 'OF';
      return h;
    },

    /** শেষের লাইনগুলো: দাগ "____", "(নাম)", "Signature", "Date: ……" — যেকোনো ক্রমে */
    _takeFooter(lines) {
      let k = lines.length;
      const isFoot = (t) => RX.signLine.test(t) || RX.signName.test(t) || RX.sign.test(t) || (RX.date.test(t) && t.length <= 40);
      while (k > 0 && isFoot(lines[k - 1])) k--;
      if (k === lines.length) return null;
      const tail = lines.slice(k);
      const date = tail.find((t) => RX.date.test(t)) || '';
      const sign = tail.filter((t) => !RX.date.test(t) && !RX.signLine.test(t));
      return { at: k, date, sign };
    },

    geometry() {
      const g = Object.assign({}, PAGE);
      g.textW = g.pageW - g.left - g.right;
      g.usableH = g.pageH - g.top - g.bottom;
      return g;
    },

    /** "Label<ট্যাব>:<ট্যাব>মান" — কোলন ১৭৫.৫pt-এ (৩৫১০), মান ১৯৪pt-এ (৩৮৮০); লম্বা লেবেলে ডানে সরে */
    _kvTabs(rows) {
      const widest = rows.reduce((a, r) => Math.max(a, Math.round(String(r.label).length * SZ.kv * 10 * 0.5)), 0);
      const colon = Math.min(4600, Math.max(3510, widest + 200));
      return { colon, value: colon + 370 };
    },

    // ------------------------------------------------------------------ DOCX
    /** @param h { runs(text, style) } — বাংলা থাকলে সাইটের রান-নির্মাতা; খাঁটি ইংরেজি নিজেরাই (ফন্ট/রং ঠিক রাখতে) */
    renderDocx(model, h) {
      const g = (h && h.geometry) || this.geometry();
      const xe = (s) => String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const R = (t, st) => {
        const s = Object.assign({ sz: SZ.kv }, st || {});
        if (!t) return '';
        if (HAS_BN.test(t) && h && h.runs) return h.runs(t, s);
        const f = s.font || FONT.en;
        return '<w:r><w:rPr><w:rFonts w:ascii="' + f + '" w:hAnsi="' + f + '" w:cs="' + f + '"/>' + (s.b ? '<w:b/><w:bCs/>' : '') +
          (s.color ? '<w:color w:val="' + s.color + '"/>' : '') + '<w:sz w:val="' + s.sz + '"/><w:szCs w:val="' + s.sz + '"/>' +
          (s.u ? '<w:u w:val="single"/>' : '') + '</w:rPr><w:t xml:space="preserve">' + xe(t) + '</w:t></w:r>';
      };
      const TAB = '<w:r><w:tab/></w:r>';
      // pPr-এর ক্রম: keepNext → tabs → spacing → ind → jc
      const P = (inner, o) => {
        const x = o || {};
        return '<w:p><w:pPr>' + (x.keep ? '<w:keepNext/>' : '') + (x.tabs || '') +
          '<w:spacing w:before="' + (x.before || 0) + '" w:after="' + (x.after || 0) + '" w:line="' + (x.line || LINE.single) + '" w:lineRule="auto"/>' +
          (x.ind || '') + '<w:jc w:val="' + (x.jc || 'left') + '"/></w:pPr>' + (inner || '') + '</w:p>';
      };
      // খালি অনুচ্ছেদে আকারসহ স্পেস (docx→doc খালি অনুচ্ছেদকে ১২pt করে ফেলে)
      const blank = (sz, keep) => P(R(' ', { sz }), { keep });
      const none = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => '<w:' + s + ' w:val="nil"/>').join('');
      const single = (s) => '<w:' + s + ' w:val="single" w:sz="6" w:space="0" w:color="000000"/>';
      const tbl = (widths, borders, rowsXml) => '<w:tbl><w:tblPr><w:tblW w:w="' + widths.reduce((a, c) => a + c, 0) + '" w:type="dxa"/><w:tblBorders>' + borders +
        '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
        '<w:tblGrid>' + widths.map((w) => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>' + rowsXml + '</w:tbl>';
      const tc = (w, inner, pr) => '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (pr || '') + '</w:tcPr>' + inner + '</w:tc>';

      let xml = '';
      let prev = null;
      for (const b of model.blocks) {
        xml += this._gaps(prev, b).map((sz) => blank(sz, this._keepGap(prev, b))).join('');
        prev = b;
        switch (b.kind) {
          case 'head': {
            const lw = g.textW - PHOTO.w;
            let left = P(R(b.title, { sz: SZ.title, b: true, font: FONT.title }), { jc: 'center', after: 60 });
            if (b.of) left += P(R(b.of, { sz: SZ.of, b: true }), { jc: 'center' });
            if (b.name) left += P(R(b.name, { sz: SZ.name, b: true }), { jc: 'center', line: LINE.head });
            for (const l of b.lines) left += P(R(l.text, { sz: SZ.contact, b: l.b }), { jc: 'center', line: LINE.head });
            const photo = new Array(PHOTO.blanks).fill(blank(SZ.contact)).join('');
            const box = '<w:tcBorders>' + ['top', 'left', 'bottom', 'right'].map(single).join('') + '</w:tcBorders>';
            xml += tbl([lw, PHOTO.w], none, '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="' + PHOTO.h + '" w:hRule="atLeast"/></w:trPr>' +
              tc(lw, left, '<w:vAlign w:val="center"/>') + tc(PHOTO.w, photo, box) + '</w:tr>');
            break;
          }
          case 'heading': {
            const bn = HAS_BN.test(b.text);
            const run = R(b.text, bn ? { sz: SZ.heading, b: true } : { sz: SZ.heading, b: true, font: FONT.heading, color: 'FFFFFF' });
            xml += tbl([g.textW], none, '<w:tr><w:trPr><w:cantSplit/></w:trPr>' +
              tc(g.textW, P(run, { keep: true, before: 20, after: 20 }), '<w:shd w:val="clear" w:color="auto" w:fill="' + (bn ? 'D9D9D9' : SHADE) + '"/>') + '</w:tr>');
            break;
          }
          case 'sub':
            xml += P(R(b.text, { sz: SZ.sub, b: true }), { keep: true, line: LINE.kv });
            break;
          case 'kv': {
            const t = this._kvTabs(b.rows);
            const tabs = '<w:tabs><w:tab w:val="left" w:pos="' + t.colon + '"/><w:tab w:val="left" w:pos="' + t.value + '"/></w:tabs>';
            const ind = '<w:ind w:left="' + t.value + '" w:hanging="' + t.value + '"/>';
            for (const r of b.rows) {
              xml += P(R(r.label) + TAB + R(':') + TAB + R(r.value), { tabs, ind, line: LINE.kv, jc: 'both' });
              for (const mo of r.more) xml += P(R(mo), { ind: '<w:ind w:left="' + t.value + '"/>', line: LINE.kv });
            }
            break;
          }
          case 'bullets':
            for (const it of b.items) {
              xml += P(R('\u2022', { sz: SZ.bullet }) + TAB + R(it, { sz: SZ.bullet }),
                { tabs: '<w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs>', ind: '<w:ind w:left="720" w:hanging="360"/>' });
            }
            break;
          case 'table': {
            const n = Math.max(1, ...b.rows.map((r) => r.length));
            const w = Math.floor(g.textW / n);
            const widths = new Array(n).fill(w);
            const border = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(single).join('');
            const rows = b.rows.map((r, ri) => '<w:tr><w:trPr><w:cantSplit/></w:trPr>' +
              widths.map((cw, ci) => tc(cw, P(R(r[ci] || ' ', { sz: SZ.table, b: ri === 0 && b.header }), { jc: 'center', before: 20, after: 20 }))).join('') + '</w:tr>').join('');
            xml += tbl(widths, border, rows);
            break;
          }
          case 'para':
            xml += P(R(b.text, { sz: SZ.para }), { jc: 'both' });
            break;
          case 'footer':
            xml += P(R('____________________', { sz: SZ.foot }), { keep: true });
            b.sign.forEach((s, i) => { xml += P(R(s, { sz: SZ.foot }), { keep: i < b.sign.length - 1 || !!b.date, line: LINE.kv }); });
            if (b.date) xml += P(R(b.date, { sz: SZ.foot }), { line: LINE.kv });
            break;
          default: break;
        }
      }
      // টেবিলে শেষ হলে Word-এর নিয়মে পরে একটি অনুচ্ছেদ চাই
      if (prev && (prev.kind === 'table' || prev.kind === 'heading' || prev.kind === 'head')) xml += blank(SZ.contact);
      return xml;
    },

    /** কোন খালি লাইন (আকার) কোন ব্লকের আগে — টেবিল পরপর বসলে Word এক টেবিল বানায়, তাই মাঝে সবসময় খালি লাইন */
    _gaps(prev, b) {
      if (!prev) return [];
      if (b.kind === 'heading') return [SZ.contact];
      if (b.kind === 'footer') return [SZ.foot, SZ.foot];
      if (prev.kind === 'heading' || prev.kind === 'head') return [16];
      if (b.kind === 'sub' && prev.kind !== 'heading') return [16];
      if (b.kind === 'table' && prev.kind === 'table') return [16];
      return [];
    },

    /** খালি লাইন পরের লেখার সাথে থাকে কি না — অংশ-পটি পাতার শেষে একা না পড়ে, স্বাক্ষর আলাদা পাতায় না যায় */
    _keepGap(prev, b) { return b.kind === 'footer' || b.kind === 'heading' || (!!prev && prev.kind === 'heading'); },

    docxSectPr(g) {
      const G = g || this.geometry();
      return '<w:sectPr><w:pgSz w:w="' + G.pageW + '" w:h="' + G.pageH + '"/>' +
        '<w:pgMar w:top="' + G.top + '" w:right="' + G.right + '" w:bottom="' + G.bottom + '" w:left="' + G.left + '" w:header="360" w:footer="360" w:gutter="0"/>' +
        '<w:cols w:num="1"/></w:sectPr>';
    },

    // ------------------------------------------------------------------ Word 2003 (RTF)
    /** @param h { rtf(text) — বাংলা থাকলে সাইটের রূপান্তর, fontName } */
    renderRtf(model, h) {
      const g = (h && h.geometry) || this.geometry();
      const esc = (s) => String(s).replace(/[\\{}]/g, '\\$&').replace(/[^\x00-\x7f]/g, (c) => { const n = c.charCodeAt(0); return '\\u' + (n > 32767 ? n - 65536 : n) + '?'; });
      // \f0 বাংলা, \f1 Times New Roman, \f2 Arial Black, \f3 Calibri; রং: \cf2 সাদা, \clcbpat3 ধূসর, \clcbpat4 হালকা ধূসর
      const T = (t, st) => {
        const s = st || {};
        if (!t) return '';
        const f = s.font === FONT.title ? 2 : (s.font === FONT.heading ? 3 : 1);
        const body = HAS_BN.test(t) && h && h.rtf ? h.rtf(t) : '{\\f' + f + ' ' + esc(t) + '}';
        return '{' + (s.b ? '\\b' : '') + (s.color ? '\\cf2' : '') + (s.sz ? '\\fs' + s.sz : '') + ' ' + body + '}';
      };
      const P = (body, o) => {
        const x = o || {};
        return '{\\pard\\plain' + (x.intbl ? '\\intbl' : '') + (x.keep ? '\\keepn' : '') + '\\f1\\fs' + (x.sz || SZ.kv) + '\\sl' + (x.line || LINE.single) + '\\slmult1\\sb' + (x.before || 0) + '\\sa' + (x.after || 0) +
          (x.pfx || '') + (x.jc || '\\ql') + ' ' + (body || '') + '\\par}\n';
      };
      // ঘরের ভেতরের অনুচ্ছেদ: শেষটিতে \par নয়, \cell
      const C = (paras) => paras.map((p, i) => p.replace(/\\par\}\n$/, i === paras.length - 1 ? '\\cell}\n' : '\\par}\n')).join('');
      const blank = (sz, keep) => P(T(' ', { sz }), { sz, keep });
      const brd = (s) => '\\clbrdr' + s + '\\brdrs\\brdrw10';
      let rtf = '{\\rtf1\\ansi\\deff1\n{\\fonttbl\n{\\f0\\fnil\\fcharset0 ' + ((h && h.fontName) || 'Kalpurush') + ';}\n{\\f1\\froman\\fcharset0 Times New Roman;}\n' +
        '{\\f2\\fswiss\\fcharset0 Arial Black;}\n{\\f3\\fswiss\\fcharset0 Calibri;}\n}\n{\\colortbl;\\red0\\green0\\blue0;\\red255\\green255\\blue255;\\red115\\green115\\blue115;\\red217\\green217\\blue217;}\n' +
        '\\paperw' + g.pageW + '\\paperh' + g.pageH + '\\margl' + g.left + '\\margr' + g.right + '\\margt' + g.top + '\\margb' + g.bottom + '\\cols1\n';
      let prev = null;
      for (const b of model.blocks) {
        rtf += this._gaps(prev, b).map((sz) => blank(sz, this._keepGap(prev, b))).join('');
        prev = b;
        switch (b.kind) {
          case 'head': {
            const lw = g.textW - PHOTO.w;
            const left = [P(T(b.title, { sz: SZ.title, b: true, font: FONT.title }), { intbl: 1, jc: '\\qc', sz: SZ.title, after: 60 })];
            if (b.of) left.push(P(T(b.of, { sz: SZ.of, b: true }), { intbl: 1, jc: '\\qc', sz: SZ.of }));
            if (b.name) left.push(P(T(b.name, { sz: SZ.name, b: true }), { intbl: 1, jc: '\\qc', sz: SZ.name, line: LINE.head }));
            for (const l of b.lines) left.push(P(T(l.text, { sz: SZ.contact, b: l.b }), { intbl: 1, jc: '\\qc', sz: SZ.contact, line: LINE.head }));
            const photo = new Array(PHOTO.blanks).fill(P(T(' ', { sz: SZ.contact }), { intbl: 1, sz: SZ.contact }));
            rtf += '{\\trowd\\trgaph100\\trleft0\\trkeep\\trrh' + PHOTO.h + '\\clvertalc\\cellx' + lw + brd('t') + brd('l') + brd('b') + brd('r') + '\\cellx' + g.textW + '\n' +
              C(left) + C(photo) + '\\row}\n';
            break;
          }
          case 'heading': {
            const bn = HAS_BN.test(b.text);
            const cell = P(T(b.text, bn ? { sz: SZ.heading, b: true } : { sz: SZ.heading, b: true, font: FONT.heading, color: 1 }), { intbl: 1, keep: true, sz: SZ.heading, before: 20, after: 20 });
            rtf += '{\\trowd\\trgaph100\\trleft0\\trkeep\\clcbpat' + (bn ? 4 : 3) + '\\cellx' + g.textW + '\n' + C([cell]) + '\\row}\n';
            break;
          }
          case 'sub': rtf += P(T(b.text, { sz: SZ.sub, b: true }), { keep: true, sz: SZ.sub, line: LINE.kv }); break;
          case 'kv': {
            const t = this._kvTabs(b.rows);
            for (const r of b.rows) {
              rtf += P(T(r.label) + '\\tab ' + T(':') + '\\tab ' + T(r.value), { pfx: '\\li' + t.value + '\\fi-' + t.value + '\\tx' + t.colon + '\\tx' + t.value, jc: '\\qj', line: LINE.kv });
              for (const mo of r.more) rtf += P(T(mo), { pfx: '\\li' + t.value, line: LINE.kv });
            }
            break;
          }
          case 'bullets':
            for (const it of b.items) rtf += P(T('\u2022', { sz: SZ.bullet }) + '\\tab ' + T(it, { sz: SZ.bullet }), { sz: SZ.bullet, pfx: '\\li720\\fi-360\\tx720' });
            break;
          case 'table': {
            const n = Math.max(1, ...b.rows.map((r) => r.length));
            const w = Math.floor(g.textW / n);
            let def = '\\trowd\\trgaph100\\trleft0';
            for (let ci = 1; ci <= n; ci++) def += brd('t') + brd('l') + brd('b') + brd('r') + '\\cellx' + (w * ci);
            for (let ri = 0; ri < b.rows.length; ri++) {
              const cells = [];
              for (let ci = 0; ci < n; ci++) cells.push(C([P(T(b.rows[ri][ci] || ' ', { sz: SZ.table, b: ri === 0 && b.header }), { intbl: 1, jc: '\\qc', sz: SZ.table, before: 20, after: 20 })]));
              rtf += '{' + def + '\n' + cells.join('') + '\\row}\n';
            }
            break;
          }
          case 'para': rtf += P(T(b.text, { sz: SZ.para }), { sz: SZ.para, jc: '\\qj' }); break;
          case 'footer':
            rtf += P(T('____________________', { sz: SZ.foot }), { sz: SZ.foot, keep: true });
            b.sign.forEach((s, i) => { rtf += P(T(s, { sz: SZ.foot }), { sz: SZ.foot, keep: i < b.sign.length - 1 || !!b.date, line: LINE.kv }); });
            if (b.date) rtf += P(T(b.date, { sz: SZ.foot }), { sz: SZ.foot, line: LINE.kv });
            break;
          default: break;
        }
      }
      if (prev && (prev.kind === 'table' || prev.kind === 'heading' || prev.kind === 'head')) rtf += blank(SZ.contact);
      return rtf + '}\n';
    },

    // ------------------------------------------------------------------ HTML প্রিভিউ
    renderHtml(model, options, h) {
      const o = options || {};
      const g = this.geometry();
      const esc = (h && h.esc) || ((s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      const inch = (tw) => (tw / 1440).toFixed(2) + 'in';
      const pt = (sz) => (sz / 2) + 'pt';
      const div = (inner, style) => '<div style="' + (style || '') + '">' + (inner || '&nbsp;') + '</div>';
      let html = '';
      let prev = null;
      for (const b of model.blocks) {
        const gaps = this._gaps(prev, b);
        if (gaps.length) html += gaps.map((sz) => '<div style="height: ' + pt(sz) + ';"></div>').join('');
        prev = b;
        switch (b.kind) {
          case 'head': {
            let left = div('<b>' + esc(b.title) + '</b>', 'font-family: \'' + FONT.title + '\', sans-serif; font-size: ' + pt(SZ.title) + '; margin-bottom: 3pt;');
            if (b.of) left += div('<b>' + esc(b.of) + '</b>', 'font-size: ' + pt(SZ.of) + ';');
            if (b.name) left += div('<b>' + esc(b.name) + '</b>', 'font-size: ' + pt(SZ.name) + '; line-height: 1.2;');
            for (const l of b.lines) left += div(l.b ? '<b>' + esc(l.text) + '</b>' : esc(l.text), 'font-size: ' + pt(SZ.contact) + '; line-height: 1.2;');
            html += '<div style="display: flex; align-items: center; gap: 0.1in;"><div style="flex: 1; text-align: center;">' + left + '</div>' +
              '<div style="width: ' + inch(PHOTO.w) + '; height: ' + inch(PHOTO.h) + '; border: 1px solid #000; box-sizing: border-box; flex: none;"></div></div>';
            break;
          }
          case 'heading': {
            const bn = HAS_BN.test(b.text);
            html += div('<b>' + esc(b.text) + '</b>', 'background: #' + (bn ? 'D9D9D9' : SHADE) + '; color: ' + (bn ? '#000' : '#fff') + '; font-family: ' + (bn ? 'inherit' : '\'' + FONT.heading + '\', sans-serif') +
              '; font-size: ' + pt(SZ.heading) + '; padding: 1pt 5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;');
            break;
          }
          case 'sub': html += div('<b>' + esc(b.text) + '</b>', 'font-size: ' + pt(SZ.sub) + '; line-height: 1.3;'); break;
          case 'kv': {
            const t = this._kvTabs(b.rows);
            const lab = 'display: inline-block; text-indent: 0; width: ';
            for (const r of b.rows) {
              html += div('<span style="' + lab + inch(t.colon) + ';">' + esc(r.label) + '</span><span style="' + lab + inch(t.value - t.colon) + ';">:</span>' + esc(r.value),
                'font-size: ' + pt(SZ.kv) + '; line-height: 1.3; padding-left: ' + inch(t.value) + '; text-indent: -' + inch(t.value) + '; text-align: justify;');
              for (const mo of r.more) html += div(esc(mo), 'font-size: ' + pt(SZ.kv) + '; line-height: 1.3; padding-left: ' + inch(t.value) + ';');
            }
            break;
          }
          case 'bullets':
            for (const it of b.items) html += div('<span style="display: inline-block; width: 0.25in; text-indent: 0;">&bull;</span>' + esc(it), 'font-size: ' + pt(SZ.bullet) + '; padding-left: 0.5in; text-indent: -0.25in;');
            break;
          case 'table':
            html += '<table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: ' + pt(SZ.table) + ';">' + b.rows.map((r, ri) => '<tr>' +
              r.map((c) => '<td style="border: 1px solid #000; text-align: center; padding: 1pt 4pt;' + (ri === 0 && b.header ? ' font-weight: 700;' : '') + '">' + esc(c) + '</td>').join('') + '</tr>').join('') + '</table>';
            break;
          case 'para': html += div(esc(b.text), 'font-size: ' + pt(SZ.para) + '; text-align: justify;'); break;
          case 'footer':
            html += div('____________________', 'font-size: ' + pt(SZ.foot) + ';') + b.sign.map((s) => div(esc(s), 'font-size: ' + pt(SZ.foot) + ';')).join('') +
              (b.date ? div(esc(b.date), 'font-size: ' + pt(SZ.foot) + ';') : '');
            break;
          default: break;
        }
      }
      const pad = inch(g.top) + ' ' + inch(g.right) + ' ' + inch(g.bottom) + ' ' + inch(g.left);
      return '<div class="paper-sheet size-a4-portrait official-cv-layout en-cv-layout" ' + (o.editable ? 'contenteditable="true" spellcheck="false" ' : '') +
        'style="padding: ' + pad + '; font-family: \'Times New Roman\', serif; color: #000; background: #fff; box-sizing: border-box;">' + html + '</div>';
    }
  };

  global.FayzarEnCvLayout = FayzarEnCvLayout;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarEnCvLayout;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
