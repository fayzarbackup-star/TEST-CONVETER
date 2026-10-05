/**
 * Fayzar — হুবহু-লেআউট ট্যাগ-পার্সার (FayzarLayoutTags)
 * =====================================================
 * Part-17.2 (ধাপ ১): Gemini-র উত্তর → ব্লক-তালিকা।
 *   [[B:t=paragraph;p=1;box=208,108,508,988;al=l;fs=m;b=0]]
 *   লেখা (মুদ্রিত লাইন-ভাঙনসহ)
 *
 * সহনশীলতা (ধাপ ০-এ বাস্তবে দেখা ভিন্নতা): "t=" ছাড়া সরাসরি ধরন ([[B:heading;box=…]]), বক্স [..]-এ মোড়ানো,
 * বাংলা অঙ্ক, `$p=1$`-ধরনের $-মোড়ক, \[\[ এস্কেপ, বাড়তি ক্ষেত্র, উল্টো min/max।
 * বিশুদ্ধ ফাংশন — DOM/নেটওয়ার্ক নেই, Node-এ টেস্টযোগ্য।
 */
(function (global) {
  'use strict';

  const TYPES = ['title', 'heading', 'paragraph', 'list_item', 'question', 'option_row', 'table', 'figure',
    'caption', 'header', 'footer', 'page_number', 'label_value', 'signature', 'stamp', 'other'];
  const SYNONYM = {
    para: 'paragraph', text: 'paragraph', body: 'paragraph', list: 'list_item', item: 'list_item', bullet: 'list_item',
    image: 'figure', img: 'figure', logo: 'figure', diagram: 'figure', graph: 'figure', photo: 'figure', picture: 'figure', chart: 'figure',
    options: 'option_row', option: 'option_row', mcq_options: 'option_row', subheading: 'heading', section: 'heading',
    pagenumber: 'page_number', page_no: 'page_number', label: 'label_value', field: 'label_value', seal: 'stamp'
  };
  const AL = { l: 'l', left: 'l', c: 'c', center: 'c', centre: 'c', r: 'r', right: 'r', j: 'j', justify: 'j', justified: 'j' };
  const AUDIT_RE = /\[\s*এআই অডিট নোট[\s\S]*$/;
  const TAG_SRC = '\\\\?\\[\\\\?\\[\\s*B\\s*[:：]([^\\n]*?)\\\\?\\]\\\\?\\](?!\\])';

  const bn2en = (s) => String(s == null ? '' : s).replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /** ট্যাগের ভেতরের অংশ → { type, page, box, align, fs, bold } */
  function parseTagBody(body) {
    const b = bn2en(body).replace(/\$/g, '');
    let t = (/\bt(?:ype)?\s*=\s*([a-z_]+)/i.exec(b) || /^\s*([a-z_]+)\s*(?:[;,]|$)/i.exec(b) || [])[1];
    t = t ? t.toLowerCase() : 'other';
    if (SYNONYM[t]) t = SYNONYM[t];
    if (TYPES.indexOf(t) === -1) t = 'other';
    const pm = /\bp(?:age|g)?\s*=\s*(\d+)/i.exec(b);
    const bm = /\bbox\s*=\s*[\[(]?\s*(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)/i.exec(b);
    let box = null;
    if (bm) {
      let [y0, x0, y1, x1] = bm.slice(1, 5).map((n) => clamp(Math.round(Number(n)), 0, 1000));
      if (y1 < y0) [y0, y1] = [y1, y0];
      if (x1 < x0) [x0, x1] = [x1, x0];
      if (y1 - y0 >= 2 && x1 - x0 >= 2) box = [y0, x0, y1, x1];
    }
    const am = /\bal(?:ign)?\s*=\s*([a-z]+)/i.exec(b);
    const fm = /\bfs\s*=\s*(xl|s|m|l)\b/i.exec(b);
    const bo = /\bb(?:old)?\s*=\s*([01]|true|false)\b/i.exec(b);
    const io = /\bit(?:alic)?\s*=\s*([01]|true|false)\b/i.exec(b);
    const uo = /\bu(?:nderline)?\s*=\s*([01]|true|false)\b/i.exec(b);
    return {
      italic: io ? /^(1|true)$/i.test(io[1]) : null,
      underline: uo ? /^(1|true)$/i.test(uo[1]) : null,
      type: t,
      page: pm ? parseInt(pm[1], 10) : null,
      box,
      align: am ? (AL[am[1].toLowerCase()] || null) : null,
      fs: fm ? fm[1].toLowerCase() : null,
      bold: bo ? /^(1|true)$/i.test(bo[1]) : null
    };
  }

  /**
   * পূর্ণ উত্তর → { blocks:[{ i, type, page, box, align, fs, bold, text, lines }], auditNote, issues, truncated }
   * পাতা না লেখা থাকলে আগের ব্লকের পাতা (প্রথমটিতে ১) ধরা হয়; "===== পৃষ্ঠা N/M =====" মার্কারও পাতা ঠিক করে।
   */
  function parse(text) {
    const issues = [];
    let s = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
    let auditNote = null;
    const am = AUDIT_RE.exec(s);
    if (am) { auditNote = am[0].trim(); s = s.slice(0, am.index); }
    const truncated = /\[অসম্পূর্ণ:/.test(String(text || ''));
    const re = new RegExp(TAG_SRC, 'gi');
    const tags = [];
    let m;
    while ((m = re.exec(s)) !== null) tags.push({ at: m.index, end: re.lastIndex, body: m[1] });
    const blocks = [];
    const pageMarkerAt = (from, to) => {
      const seg = s.slice(from, to);
      const pm = /={2,}\s*পৃষ্ঠা\s*([০-৯0-9]+)/.exec(seg);
      return pm ? parseInt(bn2en(pm[1]), 10) : null;
    };
    const cleanText = (t) => t.replace(/^[ \t]*={2,}[^\n]*পৃষ্ঠা[^\n]*={2,}[ \t]*$/gm, '').replace(/^\n+|\s+$/g, '');
    const pre = cleanText(s.slice(0, tags.length ? tags[0].at : s.length));
    if (pre) issues.push({ kind: 'untagged_preamble', text: pre.slice(0, 120) });
    let curPage = 1;
    tags.forEach((tg, k) => {
      const mk = pageMarkerAt(k === 0 ? 0 : tags[k - 1].end, tg.at);
      if (mk) curPage = mk;
      const meta = parseTagBody(tg.body);
      if (meta.page) curPage = meta.page; else meta.page = curPage;
      const raw = s.slice(tg.end, k + 1 < tags.length ? tags[k + 1].at : s.length);
      const txt = cleanText(raw);
      if (!meta.box) issues.push({ kind: 'no_box', block: blocks.length, type: meta.type });
      blocks.push(Object.assign({ i: blocks.length }, meta, { text: meta.type === 'figure' ? '' : txt, lines: meta.type === 'figure' || !txt ? [] : txt.split('\n') }));
      if (meta.type === 'figure' && txt) issues.push({ kind: 'figure_has_text', block: blocks.length - 1, text: txt.slice(0, 80) });
    });
    if (!tags.length && s.trim()) issues.push({ kind: 'no_tags' });
    return { blocks, auditNote, issues, truncated };
  }

  /** পাতা অনুযায়ী ভাগ: { [page]: blocks[] } */
  function byPage(blocks) {
    const out = {};
    (blocks || []).forEach((b) => { (out[b.page] = out[b.page] || []).push(b); });
    return out;
  }

  /** কাটা পড়া উত্তর কি না — অসম্পূর্ণ-মার্কার, অথবা শেষে অডিট-নোট নেই */
  function needsContinuation(text) {
    const s = String(text || '');
    if (/\[অসম্পূর্ণ:/.test(s)) return true;
    return !AUDIT_RE.test(s) && new RegExp(TAG_SRC, 'i').test(s);
  }

  /** চালিয়ে-যাওয়ার প্রম্পটের জন্য শেষ ব্লকের তথ্য */
  function lastBlockInfo(text) {
    const p = parse(String(text || '').replace(/\n*\[অসম্পূর্ণ:[^\]]*\]\s*$/, ''));
    const last = p.blocks[p.blocks.length - 1];
    const body = String(text || '').replace(/\n*\[অসম্পূর্ণ:[^\]]*\]\s*$/, '');
    return { lastPage: last ? last.page : null, lastType: last ? last.type : null, lastText: body.slice(-400) };
  }

  /**
   * আগের (কাটা) উত্তর + চালিয়ে-যাওয়া উত্তর জোড়া। চালিয়ে-যাওয়ার প্রথম ব্লক যদি আগের শেষ (আধা) ব্লকেরই পূর্ণ রূপ হয়
   * (একই পাতা ও ধরন, এবং আগের লেখা তার শুরু) ⇒ আগের আধা ব্লক বাদ। অসম্পূর্ণ-মার্কার মুছে যায়।
   */
  function mergeContinuation(prevText, contText) {
    const prev = String(prevText || '').replace(/\n*\[অসম্পূর্ণ:[^\]]*\]\s*$/, '');
    const cont = String(contText || '');
    const re = new RegExp(TAG_SRC, 'gi');
    let m, lastAt = -1; while ((m = re.exec(prev)) !== null) lastAt = m.index;
    const pp = parse(prev), pc = parse(cont);
    const lastPrev = pp.blocks[pp.blocks.length - 1], firstCont = pc.blocks[0];
    const norm = (t) => String(t || '').replace(/\s+/g, '');
    let head = prev;
    if (lastPrev && firstCont && lastAt >= 0 && lastPrev.page === firstCont.page && lastPrev.type === firstCont.type &&
        norm(firstCont.text).startsWith(norm(lastPrev.text).slice(0, Math.max(1, Math.min(40, norm(lastPrev.text).length))))) {
      head = prev.slice(0, lastAt);
    }
    // চালিয়ে-যাওয়ার শুরুতে ট্যাগের আগের কিছু (ভূমিকা) থাকলে বাদ
    const firstTag = new RegExp(TAG_SRC, 'i').exec(cont);
    const tail = firstTag ? cont.slice(firstTag.index) : cont;
    return head.replace(/\s+$/, '') + '\n\n' + tail.replace(/^\s+/, '');
  }

  const FayzarLayoutTags = { TYPES, parseTagBody, parse, byPage, needsContinuation, lastBlockInfo, mergeContinuation };
  global.FayzarLayoutTags = FayzarLayoutTags;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarLayoutTags;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
