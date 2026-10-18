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
  // B9/B4 ফরমকিট সুইচ: চালু থাকলে ফরমের উপাদান ও ট্যাব-কলামের অতিরিক্ত ব্লক-ধরন ও ট্যাগ-ক্ষেত্র পার্স করা হয়
  const formKitOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_FORMKIT : global.__FZ_ON_FORMKIT);
  const FORMKIT_TYPES = ['box_row', 'form_box', 'photo_box', 'label_box', 'schedule_box', 'radio_list', 'match_col'];
  const FORMKIT_SYNONYM = {
    digit_box: 'box_row', digit_boxes: 'box_row', nid_box: 'box_row', boxrow: 'box_row',
    photobox: 'photo_box', formbox: 'form_box', labelbox: 'label_box', schedulebox: 'schedule_box',
    radio: 'radio_list', matching: 'match_col', match: 'match_col'
  };
  const AL = { l: 'l', left: 'l', c: 'c', center: 'c', centre: 'c', r: 'r', right: 'r', j: 'j', justify: 'j', justified: 'j' };
  const AUDIT_RE = /\[\s*এআই অডিট নোট[\s\S]*$/;
  // WORK_PLAN B6: লাইনের শেষে একক `]`-এ বন্ধ ট্যাগও (g33: "…u=0]" না ধরায় পাতা-২-এর সব লেখা আগের ব্লকে ঢুকে ২০২ লাইন হতো)
  const TAG_SRC = '\\\\?\\[\\\\?\\[\\s*B\\s*[:：]([^\\n]*?)(?:\\\\?\\]\\\\?\\](?!\\])|\\\\?\\](?=[ \\t]*(?:\\n|$)))';

  const bn2en = (s) => String(s == null ? '' : s).replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /** ট্যাগের ভেতরের অংশ → { type, page, box, align, fs, bold } */
  function parseTagBody(body) {
    const b = bn2en(body).replace(/\$/g, '');
    let t = (/\bt(?:ype)?\s*=\s*([a-z_]+)/i.exec(b) || /^\s*([a-z_]+)\s*(?:[;,]|$)/i.exec(b) || [])[1];
    t = t ? t.toLowerCase() : 'other';
    if (formKitOn() && FORMKIT_SYNONYM[t]) t = FORMKIT_SYNONYM[t];
    if (SYNONYM[t]) t = SYNONYM[t];
    if (TYPES.indexOf(t) === -1 && !(formKitOn() && FORMKIT_TYPES.indexOf(t) !== -1)) t = 'other';
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
    const out = {
      italic: io ? /^(1|true)$/i.test(io[1]) : null,
      underline: uo ? /^(1|true)$/i.test(uo[1]) : null,
      type: t,
      page: pm ? parseInt(pm[1], 10) : null,
      box,
      align: am ? (AL[am[1].toLowerCase()] || null) : null,
      fs: fm ? fm[1].toLowerCase() : null,
      bold: bo ? /^(1|true)$/i.test(bo[1]) : null
    };
    if (formKitOn()) {
      const flm = /\b(?:fill|bg|shade)\s*=\s*#?([0-9a-f]{3,6}|[a-z]+)\b/i.exec(b);
      const clm = /\b(?:color|fg)\s*=\s*#?([0-9a-f]{3,6}|[a-z]+)\b/i.exec(b);
      const bdm = /\b(?:bdr|border|style)\s*=\s*([a-z_-]+)\b/i.exec(b);
      const phm = /\b(?:ph|placeholder)\s*=\s*([01]|true|false)\b/i.exec(b);
      const bxm = /\b(?:boxes|box_count)\s*=\s*(\d+)\b/i.exec(b);
      if (flm) out.fill = flm[1];
      if (clm) out.color = clm[1];
      if (bdm) out.border = bdm[1];
      if (phm) out.placeholder = /^(1|true)$/i.test(phm[1]);
      if (bxm) out.boxCount = parseInt(bxm[1], 10);
    }
    return out;
  }

  /**
   * পূর্ণ উত্তর → { blocks:[{ i, type, page, box, align, fs, bold, text, lines }], auditNote, issues, truncated }
   * পাতা না লেখা থাকলে আগের ব্লকের পাতা (প্রথমটিতে ১) ধরা হয়; "===== পৃষ্ঠা N/M =====" মার্কারও পাতা ঠিক করে।
   */
  /**
   * WORK_PLAN B9: ফাঁকা-রেখার সংক্ষিপ্ত চিহ্ন ⟦c×N⟧ ⇒ N-টি c (আগের মতো পুরো বিন্দু-সারি — পরের ধাপ অপরিবর্তিত)।
   * প্রম্পট লম্বা একই-অক্ষরের সারি লিখতে নিষেধ করে: ১৩০+ বিন্দুতে Gemini পুনরাবৃত্তি-ফাঁদে পড়ে MAX_TOKENS পর্যন্ত লিখত (১ পাতা ≈ ১৫ মিনিট)।
   */
  function expandFill(text) {
    // ফাঁকা টেবিল-সারির চিহ্ন: আগের লাইন (একটি ফাঁকা সারি) মোট N বার — অসীম ফাঁকা "| | |" সারিও একই ফাঁদ ছিল
    // a05 (২০২৬-১০-১৫): Gemini চিহ্নের পরে ফাঁকা ঘরও লেখে ("⟦rows×2⟧ | | | |") ⇒ আগে মিলত না, চিহ্ন ঘরে আক্ষরিক ছাপা হতো
    let s = String(text == null ? '' : text).replace(globalThis.__FZ_OFF_ROWSFIX ? /^([^\n]*)\n[ \t]*⟦\s*rows?\s*[×xX*]\s*([০-৯\d]+)\s*⟧[ \t]*$/gm : /^([^\n]*)\n[ \t]*⟦\s*rows?\s*[×xX*]\s*([০-৯\d]+)\s*⟧[ \t|]*$/gm,
      (m, row, n) => Array(Math.max(1, Math.min(60, parseInt(bn2en(n), 10) || 1))).fill(row).join('\n'));
    if (formKitOn()) {
      s = s.replace(/⟦\s*box(?:es)?\s*[×xX*]\s*([০-৯\d]+)\s*⟧/gi,
        (m, n) => Array(Math.max(1, Math.min(40, parseInt(bn2en(n), 10) || 1))).fill('□').join(' '));
    }
    return s.replace(/⟦\s*([^\s×xX*⟧])\s*[×xX*]\s*([০-৯\d]+)\s*⟧/g,
      (m, c, n) => c.repeat(Math.max(1, Math.min(400, parseInt(bn2en(n), 10) || 1))));
  }

  function parse(text) {
    const issues = [];
    let s = expandFill(String(text == null ? '' : text).replace(/\r\n?/g, '\n'));
    let auditNote = null;
    const am = AUDIT_RE.exec(s);
    if (am) { auditNote = am[0].trim(); s = s.slice(0, am.index); }
    // a14 (২০২৬-১০-১৩): Gemini কখনো অর্ধেক ট্যাগ লিখে ছেড়ে দেয় ("[[B:t=paragraph" — বন্ধনী নেই, লাইনে আর কিছু নেই) ⇒ TAG_SRC ধরে না,
    // টুকরোটি আগের ব্লকের লেখা হয়ে যেত। বক্স থাকলে (a05: "[[B:t=paragraph;p=1;box=185,82,204,926;al=l") বন্ধনী জুড়ে আসল ট্যাগ —
    // পরের লাইনের লেখা তার; বক্স না থাকলে লাইন বাদ (issue হিসেবে রাখা)
    s = s.replace(/^[ \t]*\\?\[\\?\[\s*B\s*[:：][^\]\n]*$/gm, (frag) => {
      issues.push({ kind: 'broken_tag', text: frag.trim().slice(0, 60) });
      return /\bbox\s*=\s*\d+[\s,]+\d+[\s,]+\d+[\s,]+\d+/i.test(frag) ? frag.trim().replace(/[;,\s]+$/, '') + ']]' : '';
    });
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
      // a05 (২০২৬-১০-১৩): Gemini একই ব্লক (একই পাতা/ধরন/বক্স/লেখা) বারবার লেখে — চারটি ফাঁকা ছক একই বক্সে ⇒ পাতা উপচাত ⇒ পুনরাবৃত্তি বাদ
      const dup = meta.box && blocks.some((p) => p.page === meta.page && p.type === meta.type && p.box && p.box.join() === meta.box.join() && p.text === (meta.type === 'figure' ? '' : txt));
      if (dup) { issues.push({ kind: 'duplicate_block', type: meta.type }); return; }
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

  const FayzarLayoutTags = { TYPES, parseTagBody, parse, expandFill, byPage, needsContinuation, lastBlockInfo, mergeContinuation };
  Object.defineProperty(FayzarLayoutTags, 'FORMKIT_TYPES', { value: FORMKIT_TYPES, enumerable: false });
  global.FayzarLayoutTags = FayzarLayoutTags;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarLayoutTags;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
