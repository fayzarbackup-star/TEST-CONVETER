/**
 * Fayzar — doc-model অ্যাডাপ্টার (Phase 2A, M2)
 * =============================================
 * fromCaptureBlocks(capture)  ক্যাপচারের ব্লক ([[B:t=…;box=y0,x0,y1,x1]]) → doc-model
 *   কাজ: টেবিল-লাইন → rows, option_row → cells, ⟦─×N⟧ → rule, পাশাপাশি ব্লক (y-ওভারল্যাপ) → side_by_side,
 *   দুই-কলামের পাতা চিনে doc.columns = 2।
 * fromOcrMarkdown(text)       OCR-এর Markdown (+ role-marks <!--r:…--> ট্যাগ) → doc-model
 *   কাজ: # হেডিং, | টেবিল, - তালিকা, `---` পাতা-বিরতি, [[FIG…]] → figure, sig/stamp/note/sideL/sideR/aL/aC/aR।
 * দুটোই শুধু ডেটা বানায়; লেআউট যুক্তি general-clean-layout.js-এ।
 */
(function (global) {
  'use strict';

  function mod(name, path) {
    if (global[name]) return global[name];
    if (typeof require === 'function') { try { return require(path); } catch (e) { /* নেই */ } }
    return null;
  }
  const DM = () => mod('FayzarDocModel', './doc-model.js');
  const RM = () => mod('FayzarRoleMarks', './role-marks.js');

  const RULE_RE = /^\s*⟦[─\-—_=]×\d+⟧\s*$/;
  const OPT_RE = /(?:^|\s)(?:\(?[ক-ঘ]\)|\([কখগঘ]\)|\(?[a-dA-D]\)|\([a-dA-D]\)|[কখগঘ]\.)\s/g;
  const NUM_RE = /^\s*[০-৯0-9]+\s*[.।)]\s+\S/;
  const FIG_RE = /^\s*\\?\[\\?\[\s*FIG\b/i;
  const SIZE_OF = { xl: 'xl', l: 'l', m: 'm', s: 's' };
  const TEXTY = ['paragraph', 'signature', 'label_value', 'heading', 'list'];

  const splitRow = (line) => {
    let t = String(line).trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
    return t.split('|').map((c) => c.trim());
  };
  const isSep = (cells) => cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, '')) || c === '');
  const hasMath = (t) => /\$[^$\n]+\$/.test(t);

  // ───────── fromCaptureBlocks ─────────
  const ROLE_OF = { title: 'title', heading: 'heading', paragraph: 'paragraph', list_item: 'list', label_value: 'label_value',
    table: 'table', question: 'question', option_row: 'option_row', signature: 'signature', stamp: 'stamp', footer: 'footer',
    figure: 'figure', header: 'header', page_number: 'page_number', other: 'other', note: 'note', marginal_note: 'note' };

  function yOverlap(a, b) {
    const lo = Math.max(a.box[0], b.box[0]), hi = Math.min(a.box[2], b.box[2]);
    const h = Math.min(a.box[2] - a.box[0], b.box[2] - b.box[0]) || 1;
    return (hi - lo) / h;
  }

  function detectColumns(pageBlocks) {
    const body = pageBlocks.filter((b) => b.box && ['question', 'option_row', 'list', 'paragraph'].indexOf(b.role) >= 0);
    if (body.length < 6) return 1;
    const narrow = body.filter((b) => b.box[3] - b.box[1] < 520);
    const L = narrow.filter((b) => b.box[3] <= 560), R = narrow.filter((b) => b.box[1] >= 440);
    const wide = body.length - narrow.length;
    return L.length >= 3 && R.length >= 3 && (L.length + R.length) >= 0.8 * narrow.length && narrow.length >= 0.7 * body.length && wide <= 1 ? 2 : 1;
  }

  function fromCaptureBlocks(capture, opts) {
    const D = DM();
    const o = opts || {};
    const list = Array.isArray(capture) ? capture : (capture && capture.blocks) || [];
    const doc = D.createDocument({ docType: o.docType || '', source: 'capture' });
    const byPage = {};
    list.forEach((cb) => {
      let role = ROLE_OF[cb.type] || 'paragraph';
      const lines = Array.isArray(cb.lines) && cb.lines.length ? cb.lines : String(cb.text || '').split('\n');
      const props = { align: cb.align, size: SIZE_OF[cb.fs] || null, bold: !!cb.bold, italic: !!cb.italic, underline: !!cb.underline,
        box: Array.isArray(cb.box) && cb.box.length === 4 ? cb.box : null, page: cb.page || 1, lines };
      if (role === 'other' && lines.length === 1 && RULE_RE.test(lines[0])) role = 'rule';
      if (role === 'table') {
        const rows = lines.filter((l) => l.trim()).map(splitRow).filter((c) => !isSep(c) || c.some((x) => x));
        if (!rows.length) return;
        props.rows = rows;
      }
      if (role === 'heading') props.level = (cb.fs === 'xl' || cb.fs === 'l') ? 1 : 2;
      const b = D.block(role, props);
      (byPage[b.page] = byPage[b.page] || []).push(b);
    });
    Object.keys(byPage).map(Number).sort((a, b) => a - b).forEach((pn) => {
      const pb = byPage[pn];
      if (detectColumns(pb) === 2) doc.columns = 2;
      const out = [];
      for (let i = 0; i < pb.length; i++) {
        const a = pb[i], c = pb[i + 1];
        if (doc.columns === 1 && c && a.box && c.box && TEXTY.indexOf(a.role) >= 0 && TEXTY.indexOf(c.role) >= 0
          && yOverlap(a, c) >= 0.5 && a.box[3] <= c.box[1] && a.box[3] - a.box[1] < 700 && c.box[3] - c.box[1] < 700) {
          const left = [a], right = [c];
          out.push(D.block('side_by_side', { left, right, box: [Math.min(a.box[0], c.box[0]), a.box[1], Math.max(a.box[2], c.box[2]), c.box[3]], page: pn }));
          i++;
          continue;
        }
        out.push(a);
      }
      const pg = D.addPage(doc, out);
      pg.index = pn;
    });
    return doc;
  }

  // ───────── fromOcrMarkdown ─────────
  function fromOcrMarkdown(md, opts) {
    const D = DM();
    const R = RM();
    const o = opts || {};
    let s = String(md == null ? '' : md).replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    let docType = o.docType || '';
    const fm = /^\s*---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(s);
    if (fm && /^[ \t]*[A-Za-z0-9_]+[ \t]*:/m.test(fm[1])) {
      const t = /doc_type\s*:\s*["']?([A-Z_]+)/.exec(fm[1]);
      if (t && !docType) docType = t[1];
      s = s.slice(fm[0].length);
    }
    // বডির মাঝের মেটাডেটা-ব্লক, অডিট-নোট
    s = s.replace(/(^|\n)[ \t]*---[ \t]*\n(?:[ \t]*[A-Za-z0-9_]+[ \t]*:[^\n]*\n)*?[ \t]*doc_type[ \t]*:[^\n]*\n(?:[ \t]*[A-Za-z0-9_]+[ \t]*:[^\n]*\n)*[ \t]*---[ \t]*(?=\n|$)/g, '$1')
      .replace(/^[ \t]*doc_type[ \t]*:[ \t]*[A-Z_]+[ \t]*$\n?/gm, '')
      .replace(/\[\s*এআই অডিট নোট[\s\S]*?\](?=\s*$|\s*\n)/, '');
    const doc = D.createDocument({ docType, source: 'ocr-markdown' });
    let blocks = [];
    let figN = 0;
    const flushPage = () => { if (blocks.length) { D.addPage(doc, blocks); blocks = []; } };
    const lines = s.split('\n');
    let sideL = [], sideR = [];
    const flushSide = () => {
      if (sideL.length && sideR.length) blocks.push(D.block('side_by_side', { left: sideL, right: sideR }));
      else sideL.concat(sideR).forEach((b) => blocks.push(b));
      sideL = []; sideR = [];
    };
    for (let i = 0; i < lines.length; i++) {
      let raw = lines[i];
      // ট্যাগ বের করা
      let mk = {};
      if (R && R.has(raw)) {
        const r = R.extract(raw, (l) => l.trim() || 'x');
        const k = Object.keys(r.marks)[0];
        mk = (k && r.marks[k]) || {};
        raw = r.text;
      }
      const t = raw.trim();
      if (!t) continue;
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flushSide(); if (/^-{3,}$/.test(t)) flushPage(); continue; }
      if (/^-{3}[A-Z_]+(:[A-Z_]*)?-{3}$/.test(t) || /^[ \t]*={2,}[^\n]*পৃষ্ঠা[^\n]*={2,}[ \t]*$/.test(raw)) continue;
      if (FIG_RE.test(t) || /^QZFIG\d+QZ$/.test(t)) { flushSide(); blocks.push(D.block('figure', { text: '', figIndex: figN++ })); continue; }
      if (RULE_RE.test(t)) { flushSide(); blocks.push(D.block('rule', { text: t })); continue; }
      if (t.startsWith('|')) {
        flushSide();
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) { const c = splitRow(lines[i]); if (!isSep(c)) rows.push(c); i++; }
        i--;
        if (rows.length) blocks.push(D.block('table', { rows }));
        continue;
      }
      let role = 'paragraph', level = 0, text = t;
      const h = /^(#{1,6})\s+(.*)$/.exec(t);
      const bl = /^[-*•]\s+(.*)$/.exec(t);
      if (h) {
        text = h[2].replace(/^[a-z_]+\s*:\s*/, '').trim();
        if (!text) continue;
        level = Math.min(3, h[1].length);
        role = (level === 1 && !blocks.length && !doc.pages.length) ? 'title' : 'heading';
      } else if (bl) { role = 'list'; text = bl[1]; }
      else if ((t.match(OPT_RE) || []).length >= 2 && !hasMath(t)) role = 'option_row';
      else if (NUM_RE.test(t)) {
        const nxt = (lines[i + 1] || '');
        role = (nxt.match(OPT_RE) || []).length >= 1 ? 'question' : 'list';
      }
      if (mk.stamp) role = 'stamp'; else if (mk.signature) role = 'signature'; else if (mk.note) role = 'note';
      const props = { text, align: mk.align, level };
      if (role === 'option_row') {
        const parts = text.split(/\s+(?=\(?[ক-ঘa-dA-D]\)|[কখগঘ]\.)/).map((x) => x.trim()).filter(Boolean);
        props.cells = parts;
      }
      const b = D.block(role, props);
      if (mk.side === 'L') { if (sideR.length) flushSide(); sideL.push(b); continue; }
      if (mk.side === 'R') { sideR.push(b); continue; }
      flushSide();
      blocks.push(b);
    }
    flushSide();
    flushPage();
    return doc;
  }

  const FayzarDocModelAdapters = { fromCaptureBlocks, fromOcrMarkdown, detectColumns };
  global.FayzarDocModelAdapters = FayzarDocModelAdapters;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarDocModelAdapters;
})(typeof globalThis !== 'undefined' ? globalThis : this);
