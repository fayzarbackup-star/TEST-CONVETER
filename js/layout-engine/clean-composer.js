/**
 * Fayzar — ক্লিন/রিল্যাক্সড ওয়ার্ড (FayzarCleanComposer) — TEMPLATE_COMPOSE_PLAN T1
 * ==================================================================================
 * OCR-এর Markdown → সাধারণ ১-কলাম মাস্টার .docx: কোনো কলাম/পেজ-ফিট/লাইন-আঁটানো নেই, ব্যবহারকারী নিজে সাজাবেন।
 * অক্ষত থাকে: বাংলা-ইংরেজি রান ও এডিটযোগ্য সমীকরণ (ExportDualEngine.renderDocxRuns — শুধু ডাকা, বদল নয়),
 * টেবিলের সারি/ঘর, শিরোনাম (Word Heading ১–৩, নেভিগেশনে দেখা যায়), চিত্র-মার্কার QZFIGnQZ (FayzarExport বসায়)।
 * মাপ (মালিকের সিদ্ধান্ত ২০২৬-১০-১১): কালপুরুষ ১২pt, লাইন ১.১৫, A4, ১" মার্জিন।
 * বিজয় .docx / .doc: মাস্টারটি FayzarExport.produce(text, { masterDocx }) — একই প্রমাণিত পথ।
 * plainText(): কপি/.txt-এর জন্য ফ্রন্টম্যাটার, ট্যাগ ও Markdown-চিহ্ন ছাড়া লেখা।
 */
(function (global) {
  'use strict';

  const PAGE = { w: 11906, h: 16838, margin: 1440 };         // A4, ১" (twip)
  const TEXT_W = PAGE.w - 2 * PAGE.margin;                    // ৯০২৬
  const STYLE = { font: 'Kalpurush', sz: 24, line: 276, after: 80 };   // ১২pt, ১.১৫, ৪pt
  const HEAD_SZ = { 1: 32, 2: 28, 3: 26 };
  const AUDIT_RE = /\[\s*এআই অডিট নোট[\s\S]*?\](?=\s*$|\s*\n)/;
  const FIG_TAG_RE = /\\?\[\\?\[\s*FIG\b[^\n]*?\\?\]\\?\]/gi;
  const PAGE_MARK_RE = /^[ \t]*={2,}[^\n]*পৃষ্ঠা[^\n]*={2,}[ \t]*$/;

  function pick(name) {
    if (typeof global !== 'undefined' && global[name]) return global[name];
    if (typeof window !== 'undefined' && window[name]) return window[name];
    return null;
  }
  function jszip() {
    const Z = pick('JSZip') || pick('jszip');
    if (Z) return Z;
    if (typeof require === 'function') { try { return require('../jszip.min.js'); } catch (e) { /* নেই */ } }
    return null;
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /** ফ্রন্টম্যাটার ও এআই-অডিট নোট বাদ (চিত্র-ট্যাগ থাকে — চিত্র-প্রস্তুতি সেগুলো পড়ে) */
  function strip(md) {
    let s = String(md == null ? '' : md).replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    s = s.replace(/^---[ \t]*\n[\s\S]*?\n---[ \t]*(\n|$)/, '');
    s = s.replace(AUDIT_RE, '');
    // Phase 2A: বহু-ছবির ডকুমেন্টে পরের ছবির মেটাডেটা-ব্লক/`doc_type:` লাইন বডিতে ঢুকলে মুছে দেওয়া
    s = s.replace(/(^|\n)[ \t]*---[ \t]*\n(?:[ \t]*[A-Za-z0-9_]+[ \t]*:[^\n]*\n)*?[ \t]*doc_type[ \t]*:[^\n]*\n(?:[ \t]*[A-Za-z0-9_]+[ \t]*:[^\n]*\n)*[ \t]*---[ \t]*(?=\n|$)/g, '$1')
      .replace(/^[ \t]*doc_type[ \t]*:[ \t]*[A-Z_]+[ \t]*$\n?/gm, '');
    return s.trim();
  }

  /** `$…$`-এর বাইরে `|`-এ ঘর ভাগ */
  function splitCells(line) {
    let t = line.trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
    const cells = []; let cur = '', math = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (c === '$') math = !math;
      if (c === '|' && !math && t[i - 1] !== '\\') { cells.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    cells.push(cur.trim());
    return cells;
  }
  const isSepRow = (cells) => {
    const cs = cells.map((c) => c.replace(/\s/g, ''));
    return cs.some((c) => /^:-+|-+:$|-{3}/.test(c)) && cs.every((c) => c === '' || /^:?-+:?$/.test(c));
  };

  /** "# institute: নাম" ⇒ "নাম" (ফ্রন্টম্যাটার-হেডারের ইংরেজি চাবি) */
  const headText = (t) => t.replace(/^[a-z_]+\s*:\s*/, '').trim();

  /**
   * Markdown → ব্লক: { kind:'heading', level, text } | { kind:'para', text, indent, bullet } | { kind:'table', rows }
   * প্রতিটি অ-ফাঁকা লাইন একটি অনুচ্ছেদ (OCR-এর লেখা লাইন-ভিত্তিক); ফাঁকা লাইন, `---`, পৃষ্ঠা-মার্কার বাদ।
   */
  function parse(md) {
    const lines = strip(md).replace(FIG_TAG_RE, '').split('\n');
    const blocks = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const t = raw.trim();
      // ফাঁকা, আনুভূমিক রেখা, পৃষ্ঠা-মার্কার ও ভেতরের সেকশন-মার্কার (---SECTION_BREAK:MCQ---) বাদ
      if (!t || /^(-{3,}|\*{3,}|_{3,})$/.test(t) || /^-{3}[A-Z_]+(:[A-Z_]*)?-{3}$/.test(t) || PAGE_MARK_RE.test(raw)) continue;
      if (t.startsWith('|')) {
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) { const c = splitCells(lines[i]); if (!isSepRow(c)) rows.push(c); i++; }
        i--;
        if (rows.length) {
          const n = Math.max(...rows.map((r) => r.length));
          blocks.push({ kind: 'table', rows: rows.map((r) => r.concat(Array(n - r.length).fill(''))) });
        }
        continue;
      }
      const h = /^(#{1,6})\s+(.*)$/.exec(t);
      if (h) { const text = headText(h[2]); if (text) blocks.push({ kind: 'heading', level: Math.min(3, h[1].length), text }); continue; }
      const lead = /^[\t ]*/.exec(raw)[0];
      const indent = (lead.match(/\t/g) || []).length + Math.floor(lead.replace(/\t/g, '').length / 4);
      const b = /^[-*•]\s+(.*)$/.exec(t);
      blocks.push({ kind: 'para', text: b ? b[1] : t, indent, bullet: !!b });
    }
    return blocks;
  }

  /** একটি লেখা → রান-XML: **মোটা** অংশ আলাদা, ট্যাব = <w:tab/>; রান/সমীকরণ ExportDualEngine-এর */
  function runsXml(text, style) {
    const EX = pick('ExportDualEngine');
    const opt = { font: STYLE.font };
    const one = (s, st) => {
      if (!s) return '';
      if (EX && typeof EX.renderDocxRuns === 'function') return EX.renderDocxRuns(s, opt, st);
      return `<w:r><w:rPr>${st.b ? '<w:b/>' : ''}<w:sz w:val="${st.sz}"/><w:szCs w:val="${st.sz}"/></w:rPr><w:t xml:space="preserve">${esc(s)}</w:t></w:r>`;
    };
    return String(text).split('\t').map((piece) => piece.split('**').map((seg, k) => one(seg, Object.assign({}, style, { b: style.b || k % 2 === 1 }))).join(''))
      .join('<w:r><w:tab/></w:r>');
  }

  function paraXml(b) {
    const st = { sz: STYLE.sz };
    let ppr = '';
    if (b.kind === 'heading') {
      ppr = `<w:pStyle w:val="Heading${b.level}"/>`;
      return `<w:p><w:pPr>${ppr}</w:pPr>${runsXml(b.text, { sz: HEAD_SZ[b.level], b: true })}</w:p>`;
    }
    let text = b.text;
    if (b.bullet) text = '•\t' + text;
    // শেষে একটি ছোট অংশ (নম্বর "২", "৪") ট্যাবের পরে ⇒ ডান-কিনারায় ট্যাব-স্টপ; বাকিতে Word-এর স্বাভাবিক ট্যাব
    const parts = b.text.split('\t');
    const rightTab = !b.bullet && parts.length === 2 && parts[1].trim().length > 0 && parts[1].trim().length <= 6;
    const ind = b.indent * 360 + (b.bullet ? 360 : 0);
    if (rightTab) ppr += `<w:tabs><w:tab w:val="right" w:pos="${TEXT_W}"/></w:tabs>`;
    if (ind) ppr += `<w:ind w:left="${ind}"${b.bullet ? ' w:hanging="360"' : ''}/>`;
    return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${runsXml(text, st)}</w:p>`;
  }

  function tableXml(b) {
    const n = b.rows[0].length;
    const cw = Math.floor(TEXT_W / n);
    const bd = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('');
    let x = `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${bd}</w:tblBorders><w:tblLayout w:type="autofit"/>` +
      '<w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr>';
    x += `<w:tblGrid>${Array(n).fill(`<w:gridCol w:w="${cw}"/>`).join('')}</w:tblGrid>`;
    b.rows.forEach((r) => {
      x += '<w:tr>' + r.map((c) => `<w:tc><w:tcPr><w:tcW w:w="${cw}" w:type="dxa"/></w:tcPr>` +
        `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${runsXml(c.replace(/<br\s*\/?>/gi, ' '), { sz: STYLE.sz })}</w:p></w:tc>`).join('') + '</w:tr>';
    });
    // টেবিলের পরে একটি ফাঁকা অনুচ্ছেদ (পরপর দুই টেবিল Word-এ জোড়া না লাগে)
    return x + '</w:tbl><w:p/>';
  }

  function bodyXml(md) {
    const blocks = parse(md);
    const xml = blocks.map((b) => (b.kind === 'table' ? tableXml(b) : paraXml(b))).join('\n');
    return { xml, blocks };
  }

  function stylesXml() {
    const f = STYLE.font;
    const head = (lv) => `<w:style w:type="paragraph" w:styleId="Heading${lv}"><w:name w:val="heading ${lv}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>` +
      `<w:pPr><w:keepNext/><w:spacing w:before="${lv === 1 ? 240 : 160}" w:after="80"/><w:outlineLvl w:val="${lv - 1}"/></w:pPr>` +
      `<w:rPr><w:b/><w:bCs/><w:sz w:val="${HEAD_SZ[lv]}"/><w:szCs w:val="${HEAD_SZ[lv]}"/></w:rPr></w:style>`;
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}"/><w:sz w:val="${STYLE.sz}"/><w:szCs w:val="${STYLE.sz}"/></w:rPr></w:rPrDefault>` +
      `<w:pPrDefault><w:pPr><w:spacing w:after="${STYLE.after}" w:line="${STYLE.line}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      head(1) + head(2) + head(3) + '</w:styles>';
  }

  const SECT = `<w:sectPr><w:pgSz w:w="${PAGE.w}" w:h="${PAGE.h}"/><w:pgMar w:top="${PAGE.margin}" w:right="${PAGE.margin}" w:bottom="${PAGE.margin}" w:left="${PAGE.margin}" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`;

  /**
   * @param {string} md  OCR-এর পূর্ণ লেখা (ফ্রন্টম্যাটার থাকলেও চলে; চিত্র থাকলে আগে QZFIGnQZ মার্কারে বদলানো)
   * @returns {Promise<Blob|Buffer>} ইউনিকোড মাস্টার .docx
   */
  async function renderDocx(md) {
    return packDocx(bodyXml(md).xml, SECT, stylesXml());
  }

  /** Phase 2A: বডি-XML + sectPr + styles → .docx (GENERAL_CLEAN-ও এটাই ব্যবহার করে) */
  async function packDocx(xml, sect, styles) {
    const Z = jszip();
    if (!Z) throw new Error('JSZip লোড হয়নি');
    const zip = new Z();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file('word/styles.xml', styles);
    zip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>\n' +
      xml + '\n' + sect + '</w:body></w:document>');
    const blobOk = Z.support && Z.support.blob && typeof Blob !== 'undefined';
    return zip.generateAsync(blobOk
      ? { type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      : { type: 'nodebuffer' });
  }

  /** কপি/.txt: ফ্রন্টম্যাটার, ট্যাগ, মার্কার ও Markdown-চিহ্ন ছাড়া ইউনিকোড লেখা; টেবিলের ঘর ট্যাবে; সমীকরণ $ ছাড়া LaTeX */
  function plainText(md) {
    const out = [];
    parse(String(md == null ? '' : md).replace(/[ \t]*QZFIG\d+QZ[ \t]*/g, ' ')).forEach((b) => {
      const clean = (s) => String(s).replace(/\*\*/g, '').replace(/\$([^$\n]*)\$/g, '$1').replace(/<br\s*\/?>/gi, ' ').replace(/[ ]{2,}/g, ' ').trim();
      if (b.kind === 'table') { b.rows.forEach((r) => out.push(r.map(clean).join('\t'))); out.push(''); }
      else if (b.kind === 'heading') out.push(clean(b.text));
      else out.push('\t'.repeat(b.indent) + (b.bullet ? '• ' : '') + b.text.split('\t').map(clean).join('\t'));
    });
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  /** .md ডাউনলোড: ফ্রন্টম্যাটার/অডিট-নোট/চিত্র-ট্যাগ ছাড়া মূল Markdown (সমীকরণ LaTeX-এ অক্ষত) */
  function markdown(md) {
    return strip(md).replace(FIG_TAG_RE, '').replace(/[ \t]*QZFIG\d+QZ[ \t]*/g, ' ').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  const FayzarCleanComposer = { STYLE, PAGE, strip, parse, splitCells, bodyXml, stylesXml, renderDocx, packDocx, runsXml, esc, plainText, markdown };
  global.FayzarCleanComposer = FayzarCleanComposer;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarCleanComposer;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
