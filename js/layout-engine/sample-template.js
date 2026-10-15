/**
 * Fayzar — নিজের নমুনা থেকে ছাঁচ (FayzarSampleTemplate) — T3b, docs/T3_PLAN.md §৩–৪
 * ==================================================================================
 * নমুনার হুবহু-নকশা (FayzarLayoutIR) ⇒ স্লট; খসড়ার Markdown ⇒ কনটেন্ট-অংশ; মিলিয়ে নতুন নকশা ⇒ FayzarFaithful.produce।
 *  - স্লট-ধরন: kv (লেবেল-মান; লাইনের প্রতিটি "লেবেল: মান" টুকরা আলাদা), para, list, heading, sign, table।
 *  - role: fixed (হুবহু থাকে) | var (বদলায়)। title/heading/header/footer/caption/page_number/signature/stamp ⇒ fixed; বাকিটা var।
 *    লেবেল-মান Gemini-র type দেখে নয়, লেখা দেখে চেনা হয় (g01-এ "নাম:……" type=paragraph)।
 *  - যমজ (২-আপ মেমো/প্রশংসাপত্র): একই গ্রিড-সারির ভিন্ন ঘরে একই লেখা ⇒ একটি দল, একই পূরণ।
 *  - মালিকের নিয়ম (২০২৬-১০-১১): না-মেলা var স্লট খালি/"......" — নমুনার আগের গ্রাহকের তথ্য কখনো ফাইলে নয়;
 *    টেবিলের নমুনা-সারি (ও তাতে বসানো চিত্র) বাদ, শুধু শিরোনাম-সারি আর "মোট"-লেবেল থাকে।
 *  - খসড়ার কোনো লেখা হারায় না: কোথাও না বসলে "অতিরিক্ত" হিসেবে শেষ var-অংশের পরে যোগ হয়।
 *  - স্থানীয় মিলানো (বিনা খরচে): লেবেল-সমার্থক, হুবহু-সমান লেখা, টেবিল ক্রমে। বাকিটা T3c-এর Gemini-ম্যাপ (JSON)।
 * বিশুদ্ধ ফাংশন — Node-এ টেস্টযোগ্য; faithful-* মডিউলে কোনো বদল নেই।
 */
(function (global) {
  'use strict';

  const VERSION = 1;
  const FIXED_TYPES = { title: 'heading', heading: 'heading', header: 'heading', footer: 'heading', caption: 'heading', page_number: 'heading', signature: 'sign', stamp: 'sign' };
  const FILL_ONLY = /^\s*([._\-…·─━═=])\1{5,}\s*$/;
  const ABBR = /^(?:মো|মোসা|মোছা|মোসাম্মত|প্রো|ডা|অ্যাড|এড|শ্রী|মিসেস|মিস|জনাব|ক্রঃ?|নং)$/;
  const SUMMARY = /মোট|সর্বমোট|total|grand|কথায়|in\s*words|সর্বসাকুল্যে/i;
  const SERIAL = /^(?:ক্রমিক|ক্রম|ক্রঃ|ক্র\.?\s*নং|sl\.?|s\.?\s*no\.?|serial|নং)$/i;

  // লেবেল-সমার্থক (প্রথমটি চাবি)
  const SYN = [
    ['নাম', 'name', 'full name', 'পূর্ণ নাম', 'নাম (বাংলায়)'],
    ['পিতা', 'পিতার নাম', "father's name", 'father name', 'father', 'পিতা/স্বামীর নাম', 'পিতা/স্বামী'],
    ['মাতা', 'মাতার নাম', "mother's name", 'mother name', 'mother'],
    ['স্বামী', 'স্বামীর নাম', "husband's name", 'husband'],
    ['ঠিকানা', 'address', 'বর্তমান ঠিকানা', 'present address'],
    ['স্থায়ী ঠিকানা', 'permanent address'],
    ['তারিখ', 'date', 'তাং', 'তাংঃ'],
    ['জন্ম তারিখ', 'date of birth', 'জন্মতারিখ', 'dob', 'birth date'],
    ['মোবাইল', 'মোবাইল নং', 'মোবাইল নম্বর', 'ফোন', 'mobile', 'mobile no', 'phone', 'cell', 'cell phone', 'contact', 'contact no'],
    ['ই-মেইল', 'ইমেইল', 'email', 'e-mail'],
    ['ধর্ম', 'religion'], ['জাতীয়তা', 'nationality'], ['লিঙ্গ', 'gender', 'sex'],
    ['বৈবাহিক অবস্থা', 'marital status'], ['রক্তের গ্রুপ', 'blood group'],
    ['জাতীয় পরিচয়পত্র নং', 'এনআইডি', 'nid', 'nid no', 'national id', 'জাতীয় পরিচয় পত্র নং'],
    ['গ্রাম', 'village', 'vill', 'গ্রাম/মহল্লা'], ['ডাকঘর', 'post', 'post office', 'p.o', 'po'],
    ['উপজেলা', 'থানা', 'upazila', 'thana', 'p.s', 'ps'], ['জেলা', 'district', 'dist'],
    ['বিষয়', 'subject', 'sub'], ['মাধ্যম', 'through'], ['সূত্র', 'স্মারক', 'স্মারক নং', 'ref', 'reference', 'memo no'],
    ['শ্রেণি', 'শ্রেণী', 'class'], ['রোল', 'রোল নং', 'roll', 'roll no'], ['শাখা', 'section'], ['শিক্ষাবর্ষ', 'session', 'সেশন'],
    ['টাকা', 'amount', 'পরিমাণ টাকা'], ['কথায়', 'in words', 'টাকা (কথায়)']
  ];

  // ---------------------------------------------------------------- সাধারণ সহায়ক
  const nukta = (s) => String(s == null ? '' : s).replace(/য়/g, 'য়').replace(/ড়/g, 'ড়').replace(/ঢ়/g, 'ঢ়');
  // হুবহু-নকশার চিহ্ন (**মোটা**, *বাঁকা*, ^{উপরে}) বাদ দিয়ে খাঁটি লেখা
  const plain = (s) => nukta(s).replace(/\*\*/g, '').replace(/\*([^*\s][^*]*?)\*/g, '$1').replace(/\^\{([^}]*)\}/g, '$1').replace(/\s+/g, ' ').trim();
  /** তুলনার জন্য: চিহ্ন/ফাঁক বাদ, ছোট হাতের */
  const cmp = (s) => plain(s).toLowerCase().replace(/[\s.,;:ঃ।!?'"“”‘’()\[\]{}\-–—_/\\|*…·]+/g, '');
  const LABEL_KEY = (() => {
    const m = new Map();
    for (const row of SYN) for (const w of row) m.set(cmp(w), cmp(row[0]));
    return m;
  })();
  const labelKey = (s) => { const k = cmp(s); return LABEL_KEY.get(k) || k; };
  const bnDigits = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
  const clone = (v) => JSON.parse(JSON.stringify(v));

  // ---------------------------------------------------------------- লেবেল-মান টুকরা
  // pre-তে ঐচ্ছিক ক্রমিক ("০১। নাম :", "1. Name:", "১) পিতা") — নম্বর হুবহু থাকে, লেবেল শুধু "নাম"
  // মোটা (**) বা বাঁকা (*) লেবেলের চিহ্ন pre/colon-এ থাকে ("*Name of University* : …")
  const KV_RX = /^(\s*(?:\*{1,2})?\s*(?:[০-৯\d]{1,2}\s*[।.)]\s*)?(?:\*{1,2})?\s*)([^:ঃ：\t*]{1,32}?)(\s*(?:\*{1,2})?\s*[:ঃ：]-?\s*(?:\*{1,2})?\s*)(.*)$/;
  /** একটি টুকরা "লেবেল: মান" হলে { pre, label, colon, value }, নইলে null */
  function parseKv(seg) {
    const m = String(seg).match(KV_RX);
    if (!m) return null;
    const label = m[2].trim();
    if (!label || label.length < 2 || /[।,]$/.test(label) || /[।]/.test(label) || label.split(/\s+/).length > 5) return null;
    if ((label.match(/\(/g) || []).length !== (label.match(/\)/g) || []).length) return null;   // "প্রধান শিক্ষক (চ: দা:)" — বন্ধনীর ভেতরের কোলন
    if (ABBR.test(label.replace(/[.ঃ]+$/, ''))) return null;
    if (/^\d+$/.test(label) || /^[০-৯]+$/.test(label)) return null;   // "১০:৩০" সময়
    // ঃ বাংলা বিসর্গও — "দুঃখ"-এর মতো শব্দের ভেতরে নয়: ঃ-এর পরে ফাঁক/** থাকবে, নয়তো মান খালি বা বিন্দু-সারি
    if (!/[:：]/.test(m[3]) && !m[3].replace(/^[^ঃ]*ঃ-?/, '') && m[4] && !/^[._…·]/.test(m[4])) return null;
    return { pre: m[1], label, colon: m[3], value: m[4] };
  }
  /**
   * লাইন ⇒ টুকরা/বিভাজক টোকেন (বিজোড় সূচক = বিভাজক)। ট্যাব সবসময় বিভাজক; ৩+ ফাঁক শুধু তখন,
   * যখন ওই ট্যাব-টুকরা ভাঙলে ২+ লেবেল-মান হয় ("নাম: ……   তারিখ: ……")। নির্ধারিত — পূরণের সময় একই সূচক।
   */
  function tokens(line) {
    const out = [];
    const tabs = String(line).split(/(\t)/);
    // ট্যাবে সাজানো লেবেল-মান ("০১।\tনাম\t:\tমান"): কোনো ট্যাব-টুকরা নিজে লেবেল-মান নয়, কিন্তু পুরো লাইন হলে ⇒ এক টুকরা (ট্যাব অক্ষত)
    if (tabs.length > 1 && !tabs.some((t, k) => !(k % 2) && parseKv(t)) && parseKv(line)) return [String(line)];
    tabs.forEach((t, k) => {
      if (k % 2) { out.push(t); return; }
      const sub = t.split(/(\s{3,})/);
      const kvN = sub.filter((x, j) => !(j % 2) && parseKv(x)).length;
      if (sub.length > 1 && kvN >= 2) out.push(...sub); else out.push(t);   // দুটোই টুকরা দিয়ে শুরু ও শেষ ⇒ জোড়-বিজোড় অক্ষত
    });
    // খালি-মানের লেবেল ("জন্ম তারিখ :" \t "০৬/০৭/২০০৩"): পরের অ-লেবেল টুকরাগুলোই তার মান — এক টুকরায় জোড়া
    // (নইলে পূরণে শুধু খালি অংশ বদলাত, আগের তারিখ পাশের ট্যাবে থেকে যেত = ফাঁস)
    for (let k = 0; k < out.length; k += 2) {
      const kv = parseKv(out[k]);
      if (!kv || kv.value.trim()) continue;
      while (k + 2 < out.length && !parseKv(out[k + 2]) && plain(out[k + 2])) { out[k] += out[k + 1] + out[k + 2]; out.splice(k + 1, 2); }
    }
    return out;
  }

  /** লাইনের kv-টুকরা (টোকেন-সূচক সহ) */
  function kvSegs(line) {
    const out = [];
    tokens(line).forEach((t, k) => { if (!(k % 2)) { const kv = parseKv(t); if (kv) out.push({ k, kv }); } });
    return out;
  }

  /** খালি মান: নমুনার মান আগেই বিন্দু-সারি হলে সেটিই, নইলে মাপমতো বিন্দু */
  function blankValue(v) {
    const s = String(v || '');
    if (!s.trim() || FILL_ONLY.test(s)) return s;
    const n = Math.max(12, Math.min(45, Math.round(plain(s).length * 1.6)));
    return '.'.repeat(n);
  }

  // ---------------------------------------------------------------- নকশা-ভ্রমণ
  function walk(ir, fn) {
    (ir.pages || []).forEach((pg, p) => (pg.bands || []).forEach((band, b) => (band.cells || []).forEach((cell, c) => (cell.items || []).forEach((it, i) => fn(it, { p, b, c, i }, band)))));
  }
  const itemAt = (ir, path) => ir.pages[path.p].bands[path.b].cells[path.c].items[path.i];
  const itemLines = (it) => (it.tabLines && it.tabLines.length ? it.tabLines : (it.lines && it.lines.length ? it.lines : [String(it.text || '')]));

  /** সেভের আগে নকশা হালকা করা (builder যা পড়ে না: মাপ m, diag, box) */
  function slimIR(ir) {
    const out = clone(ir);
    walk(out, (it) => { delete it.m; delete it.diag; delete it.box; (it.cellFigures || []).forEach((f) => { delete f.m; delete f.box; }); });
    return out;
  }

  // ---------------------------------------------------------------- ১) নকশা ⇒ স্লট
  function fromIR(ir) {
    const slots = [];
    let n = 0;
    const addSlot = (s) => { s.id = 's' + (++n); slots.push(s); return s; };
    walk(ir, (it, path, band) => {
      const grid = band && band.kind === 'grid';
      const add = (s) => addSlot(Object.assign(s, { align: it.align || '' }));
      if (it.kind === 'figure') return;
      if (it.kind === 'table') {
        const rows = it.rows || [];
        add({ kind: 'table', role: 'var', path, grid, cols: rows.length ? Math.max(...rows.map((r) => r.length)) : 0,
          header: rows.length > 1 ? rows[0].map(plain) : [], sampleText: rows.map((r) => r.map(plain).join(' | ')).join('\n') });
        return;
      }
      if (it.kind !== 'para') return;
      const lines = itemLines(it);
      const text = lines.map(plain).join('\n');
      if (!text.trim() || lines.every((l) => !plain(l) || FILL_ONLY.test(plain(l).replace(/\s+/g, '')))) return;   // রেখা/ফাঁকা লাইন
      const fixedKind = FIXED_TYPES[it.type];
      if (fixedKind) { add({ kind: fixedKind, role: 'fixed', path, grid, sampleText: text }); return; }
      // লেবেল-মান: প্রতিটি অ-ফাঁকা লাইনে অন্তত একটি টুকরা
      const per = lines.map((l) => (plain(l) ? kvSegs(l) : null));
      if (per.some((x) => x && x.length) && per.every((x) => x === null || x.length)) {
        per.forEach((segs, l) => (segs || []).forEach(({ k, kv }) => add({ kind: 'kv', role: 'var', path: Object.assign({ l, s: k }, path), grid,
          label: plain(kv.label), key: labelKey(kv.label), sampleText: plain(kv.value) })));
        return;
      }
      // লেবেল দিয়ে শুরু লম্বা অনুচ্ছেদ ("**বিষয়ঃ** … কয়েক লাইন") ⇒ চাবি রাখা, খসড়ার একই লেবেল-মান এখানে বসে
      const lead = parseKv(lines[0]);
      add({ kind: it.type === 'list_item' ? 'list' : 'para', role: 'var', path, grid, sampleText: text, keepLines: !!it.keepLines,
        key: lead ? labelKey(lead.label) : undefined, label: lead ? plain(lead.label) : undefined });
    });
    // যমজ: একই গ্রিড-সারির ভিন্ন ঘরে একই ধরন+লেখা(+লেবেল) ⇒ প্রথমটি দলনেতা
    const seen = new Map();
    for (const s of slots) {
      if (!s.grid) continue;
      const sig = [s.path.p, s.path.b, s.kind, s.key || '', cmp(s.sampleText)].join('|');
      const lead = seen.get(sig);
      if (lead && lead.path.c !== s.path.c && !slots.some((o) => o.twinOf === lead.id && o.path.c === s.path.c)) s.twinOf = lead.id;
      else if (!lead) seen.set(sig, s);
    }
    // প্যাড-মাথা: পাতার শুরুর মাঝে-বসানো টানা অংশ, যার শেষে স্থির শিরোনাম ("ক্যাশ মেমো") ⇒ তার আগের var-ও স্থির
    // (g01: দোকানের ট্যাগলাইন/ঠিকানা/মোবাইল type=paragraph)। স্থির শিরোনাম নিচে না থাকলে (সিভির নাম-মাথা) var-ই থাকে।
    const pagesN = Math.max(0, ...slots.map((s) => s.path.p + 1));
    for (let p = 0; p < pagesN; p++) {
      const lead = slots.filter((s) => s.path.p === p && !s.twinOf);
      let end = 0;
      while (end < lead.length && lead[end].align === 'c' && lead[end].kind !== 'table') end++;
      let last = -1;
      for (let k = 0; k < end; k++) if (lead[k].role === 'fixed' && lead[k].kind === 'heading') last = k;
      for (let k = 0; k < last; k++) if (lead[k].role === 'var') { lead[k].role = 'fixed'; lead[k].auto = 'letterhead'; }
    }
    // ব্যক্তিগত তথ্য: স্থির শিরোনাম/স্বাক্ষরের লেখা নমুনারই কোনো নাম-জাতীয় লেবেলের মানে থাকলে (সিভি-মাথার "TAHER KHAN",
    // স্বাক্ষরের "(Md. Taher Khan)" ⊂ "Full Name : Md. Taher Khan") ⇒ var — আগের মানুষের নাম কখনো থেকে না যায়
    const PERSONAL = new Set(['নাম', 'পিতা', 'মাতা', 'স্বামী'].map(labelKey));
    const names = slots.filter((s) => s.key && PERSONAL.has(s.key)).map((s) => {
      const v = s.kind === 'kv' ? s.sampleText : String(s.sampleText).replace(/^[^:ঃ：]*[:ঃ：]-?\s*/, '');
      return cmp(v).replace(/^(?:md|mst|mrs|mr|মো|মোসা|মোছা)/, '');
    }).filter((v) => v.length >= 5);
    if (names.length) for (const s of slots) {
      if (s.role !== 'fixed' || (s.kind !== 'heading' && s.kind !== 'sign')) continue;
      const t = cmp(s.sampleText).replace(/^(?:md|mst|mrs|mr|মো|মোসা|মোছা)/, '');
      if (t.length >= 5 && names.some((v) => t.includes(v) || v.includes(t))) { s.role = 'var'; s.auto = 'personal'; }
    }
    slots.forEach((s) => {
      const lead = s.twinOf && slots.find((o) => o.id === s.twinOf);
      if (lead) { s.role = lead.role; if (lead.auto) s.auto = lead.auto; }
      delete s.grid; delete s.align;
    });
    return slots;
  }

  // ---------------------------------------------------------------- ২) খসড়া ⇒ কনটেন্ট-অংশ
  const LIST_RX = /^\s*(?:[-*•➢✓►▪●◆]|\d{1,2}[.)]|[০-৯]{1,2}[.)।])\s+/;
  const SALUTE = /^(?:জনাব|মহোদয়|মহোদয়া|মাননীয় মহোদয়|শ্রদ্ধেয় মহোদয়|sir|madam|dear\s+[^,]{1,30}|respected\s+sir)\s*[,،]?$/i;
  /** মানের ভেতরের চেনা লেবেলে ভাগ: [[লেবেল, মান], …] — শুধু সমার্থক-তালিকার লেবেল (বাক্যের সাধারণ কোলনে নয়) */
  function splitInline(label, value) {
    const out = [[label, value]];
    for (let guard = 0; guard < 4; guard++) {
      const last = out[out.length - 1];
      const rx = /(^|\s)([^\s:ঃ：,।][^:ঃ：,।]{0,24}?)\s*[:ঃ：]-?\s*/g;
      let m, cut = null;
      while ((m = rx.exec(last[1]))) {
        const l = m[2].trim();
        if (m.index === 0 && !m[1]) { rx.lastIndex = 1; continue; }   // শুরু থেকে ধরা "মান তারিখ:" নয় — পরের ফাঁক থেকে আবার
        // ঠিকানার অংশ ("Vill: …, P.O: …", "উপজেলা: …, জেলা: …") একই মানে থাকে — নমুনা-পক্ষও এভাবেই রাখে
        if (LABEL_KEY.has(cmp(l)) && l.split(/\s+/).length <= 3 && !ADDR_PART.has(labelKey(l)) && !isAddr(labelKey(l), l)) { cut = { at: m.index + m[1].length, end: rx.lastIndex, l }; break; }
      }
      if (!cut) break;
      const before = last[1].slice(0, cut.at).trim(), after = last[1].slice(cut.end).trim();
      if (!before) break;
      last[1] = before;
      out.push([cut.l, after]);
    }
    return out;
  }
  function splitContent(md) {
    const body = nukta(String(md || '')).replace(/\r\n?/g, '\n').replace(/^﻿?\s*---[ \t]*\n[\s\S]*?\n---[ \t]*(?:\n|$)/, '');
    const parts = [];
    let n = 0;
    const add = (p) => { p.id = 'p' + (++n); parts.push(p); return p; };
    let para = null, table = null;
    const flush = () => { para = null; table = null; };
    for (const raw of body.split('\n')) {
      const line = raw.replace(/\s+$/, '');
      if (!line.trim()) { flush(); continue; }
      if (/^\s*\|.*\|\s*$/.test(line)) {
        para = null;
        if (/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)) { if (table) table.header = true; continue; }
        const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => plain(c));
        if (table) table.rows.push(cells); else table = add({ kind: 'table', rows: [cells], header: false });
        continue;
      }
      table = null;
      const h = line.match(/^\s*#{1,6}\s+(.*)$/);
      if (h) { para = null; add({ kind: 'heading', text: plain(h[1]), lines: [plain(h[1])] }); continue; }
      const segs = kvSegs(line);
      // ক্রমিকসহ লেবেল-মান ("০১। নাম ঃ …") তালিকা নয় — লেবেল-মান; লেবেল ছাড়া ক্রমিক-লাইনই তালিকা
      if (!segs.length && LIST_RX.test(line)) { para = null; add({ kind: 'list', text: line.trim(), lines: [line.trim()] }); continue; }
      if (segs.length) {
        para = null;
        // লাইনের বাকি (লেবেল-মান নয় এমন) টুকরা হারায় না: শেষ মানের সাথে জোড়া
        const tk = tokens(line), kvAt = new Set(segs.map((x) => x.k));
        const rest = tk.filter((t, k) => !(k % 2) && !kvAt.has(k) && plain(t)).map(plain).join(' ');
        segs.forEach(({ kv }, j) => {
          const value = plain(kv.value) + (rest && j === segs.length - 1 ? ' ' + rest : '');
          // মানের ভেতরে আরেকটি চেনা লেবেল ("সূত্র: ৩৮.০০… তারিখ: ১৬ মার্চ") ⇒ আলাদা অংশ
          splitInline(plain(kv.label), value.trim()).forEach(([l, v]) => add({ kind: 'kv', label: l, key: labelKey(l), value: v, text: plain(l + ': ' + v) }));
        });
        continue;
      }
      // সম্বোধন ("জনাব,", "মহোদয়,", "Dear Sir,") নিজেই একটি অংশ — নমুনায় সাধারণত আলাদা অনুচ্ছেদ
      if (SALUTE.test(line.trim())) { add({ kind: 'para', text: line.trim(), lines: [line.trim()] }); para = null; continue; }
      if (para) { para.lines.push(line.trim()); para.text += '\n' + line.trim(); }
      else para = add({ kind: 'para', text: line.trim(), lines: [line.trim()] });
    }
    return parts;
  }

  // ---------------------------------------------------------------- ৩) স্থানীয় মিলানো
  function tableFit(slot, part) {
    if (!part.rows.length) return 0;
    if (slot.header.length && part.rows[0]) {
      const head = part.rows[0].map(cmp);
      const hit = slot.header.filter((h) => h && head.some((c) => c && (c === cmp(h) || c.includes(cmp(h)) || cmp(h).includes(c)))).length;
      if (hit / Math.max(1, slot.header.filter(Boolean).length) >= 0.5) return 2;
    }
    return part.rows[0] && Math.max(...part.rows.map((r) => r.length)) === slot.cols ? 1 : 0;
  }

  // ঠিকানা: মূল লেবেল (ঠিকানা/Address) আর তার অংশ-লেবেল (গ্রাম/ডাকঘর/উপজেলা/জেলা, Vill/Post/P.S/Dist…)
  const ADDR_PART = new Set(['গ্রাম', 'ডাকঘর', 'উপজেলা', 'জেলা', 'road', 'house', 'holding', 'ward', 'union', 'ইউনিয়ন', 'ওয়ার্ড', 'রোড', 'বাসা'].map(labelKey));
  const isAddr = (key, label) => /ঠিকানা|address/i.test(String(label || '')) || key === labelKey('ঠিকানা') || key === labelKey('স্থায়ী ঠিকানা');
  /** ক্রমে প্রতিটি অংশ-লেবেলের "কোন ঠিকানার ভেতরে" — id → মূল-ঠিকানার চাবি ('' = বাইরে) */
  function addrContext(list) {
    const out = new Map();
    let ctx = '';
    for (const x of list) {
      if (isAddr(x.key, x.label)) { ctx = x.key; continue; }
      if (ADDR_PART.has(x.key)) out.set(x.id, ctx);
      else ctx = '';
    }
    return out;
  }

  /**
   * @returns {{ map: Object<slotId, partId | partId[]>, present: string[], unmatchedSlots: string[], unusedParts: string[] }}
   *   map-এর মান তালিকা হলে = একটি স্লটে কয়েকটি অংশ জোড়া (ঠিকানার পরের লাইন, নমুনায় আলাদা স্লট নেই)
   *   present = খসড়ার যে অংশ নমুনার স্থির লেখায় হুবহু আছে (আবার বসানো লাগবে না)
   */
  function matchLocal(slots, parts) {
    const map = {}, used = new Set(), present = [], fixedPairs = [];
    const leaders = slots.filter((s) => !s.twinOf);
    // ক) লেবেল-মান: একই চাবি ক্রমানুসারে — ঠিকানার অংশ-লেবেল (উপজেলা/P.S…) আগে একই ঠিকানার ভেতরে (বর্তমান ≠ স্থায়ী)
    const keyed = (x) => x.key && (x.kind === 'kv' || (x.kind === 'para' && x.key));
    const sCtx = addrContext(leaders.filter(keyed)), pCtx = addrContext(parts.filter((p) => p.kind === 'kv'));
    const kvParts = parts.filter((p) => p.kind === 'kv');
    for (const pass of [1, 2]) {
      for (const s of leaders.filter(keyed)) {
        if (map[s.id]) continue;
        // ১ম পাস: একই ঠিকানা-প্রসঙ্গ; ২য় পাস: যেকোনো একপক্ষ প্রসঙ্গহীন হলে (দুই ভিন্ন ঠিকানার মধ্যে কখনো নয়)
        const sc = sCtx.get(s.id) || '';
        const p = kvParts.find((x) => { const pc = pCtx.get(x.id) || ''; return !used.has(x.id) && x.key === s.key && (pass === 1 ? sc === pc : (!sc || !pc)); });
        if (p) { map[s.id] = p.id; used.add(p.id); }
      }
    }
    // খ) হুবহু-সমান লেখা (স্থির বা পরিবর্তনশীল; "জনাব," জাতীয় ছক-লেখা)
    for (const s of leaders.filter((x) => x.kind !== 'kv' && x.kind !== 'table')) {
      const key = cmp(s.sampleText);
      if (!key) continue;
      const p = parts.find((x) => !used.has(x.id) && x.kind !== 'table' && x.kind !== 'kv' && cmp(x.text) === key);
      if (!p) continue;
      used.add(p.id);
      if (s.role === 'fixed') { present.push(p.id); fixedPairs.push([s.id, p.id]); } else map[s.id] = p.id;
    }
    // গ) স্থির লেবেল-মান খসড়ায় হুবহু থাকলে (যেমন "বিষয়: …" নমুনার শিরোনামে) — আবার নয়
    for (const p of parts.filter((x) => !used.has(x.id) && x.kind === 'kv')) {
      if (leaders.some((s) => s.role === 'fixed' && cmp(s.sampleText).includes(cmp(p.text)) && cmp(p.text).length >= 6)) { used.add(p.id); present.push(p.id); }
    }
    // ঘ) টেবিল: ক্রমে, মানানসই হলে (একটি করে থাকলে যেকোনোভাবেই)
    const tSlots = leaders.filter((x) => x.kind === 'table');
    const tParts = parts.filter((x) => x.kind === 'table');
    for (const s of tSlots) {
      const free = tParts.filter((x) => !used.has(x.id));
      let p = free.find((x) => tableFit(s, x) === 2) || free.find((x) => tableFit(s, x) === 1);
      if (!p && tSlots.length === 1 && tParts.length === 1 && free.length) p = free[0];
      if (p) { map[s.id] = p.id; used.add(p.id); }
    }
    // ঘ২) প্রথম-লাইন মিল: একাধিক লাইনের অনুচ্ছেদের ছোট প্রথম লাইন হুবহু এক ("বরাবর,", "বিনীত নিবেদক") ⇒ জোড়া
    //     (খসড়ার ক্রম নমুনার থেকে আলাদা হলেও ঠিক জায়গায়; ক্রম-মিলের সীমানাও হয়)
    const first = (t) => cmp(String(t || '').split('\n')[0]);
    for (const s of leaders.filter((x) => x.role === 'var' && (x.kind === 'para' || x.kind === 'list') && !map[x.id])) {
      const f = first(s.sampleText);
      if (f.length < 2 || f.length > 30) continue;
      const p = parts.find((x) => !used.has(x.id) && (x.kind === 'para' || x.kind === 'list') && first(x.text) === f
        && ((x.lines || []).length > 1 || s.sampleText.includes('\n')));
      if (p) { map[s.id] = p.id; used.add(p.id); }
    }
    // ঙ) ক্রম-মিল: পাশাপাশি দুই মেলানো জোড়ার মাঝে না-মেলা লেখা-স্লট আর অব্যবহৃত লেখা-অংশ সংখ্যায় সমান ⇒ ক্রমে জোড়া
    //    (প্রত্যয়নের মূল অনুচ্ছেদ: "প্রত্যয়ন পত্র" আর "মঙ্গল কামনা"-র মাঝে একটি স্লট, একটি অংশ)
    const sIdx = new Map(leaders.map((s, k) => [s.id, k])), pIdx = new Map(parts.map((p, k) => [p.id, k]));
    const TEXT = { para: 1, list: 1 }, SLOT_TEXT = { para: 1, list: 1, heading: 1, sign: 1 };   // var শিরোনাম/স্বাক্ষর (ব্যক্তিগত) ← লেখা/শিরোনাম-অংশ
    const PART_TEXT = { para: 1, list: 1, heading: 1 };
    let pairs = Object.entries(map).concat(fixedPairs).map(([s, p]) => [sIdx.get(s), pIdx.get(Array.isArray(p) ? p[0] : p)]).filter((x) => x[0] != null && x[1] != null).sort((a, b) => a[0] - b[0]);
    pairs = pairs.filter((x, k) => pairs.slice(0, k).every((y) => y[1] < x[1]));   // ক্রম-ভাঙা জোড়া সীমানা নয়
    const bounds = [[-1, -1]].concat(pairs, [[leaders.length, parts.length]]);
    for (let k = 1; k < bounds.length; k++) {
      const [s0, p0] = bounds[k - 1], [s1, p1] = bounds[k];
      const gs = leaders.slice(s0 + 1, s1).filter((s) => s.role === 'var' && SLOT_TEXT[s.kind] && !map[s.id]);
      let gp = parts.slice(p0 + 1, p1).filter((p) => PART_TEXT[p.kind] && !used.has(p.id));
      if (gs.length !== gp.length) gp = gp.filter((p) => TEXT[p.kind]);   // শিরোনাম-অংশ বাদে আবার চেষ্টা (আগের নিয়ম)
      if (gs.some((s) => !TEXT[s.kind]) && gs.length !== gp.length) continue;
      if (gs.length && gs.length === gp.length) gs.forEach((s, j) => { map[s.id] = gp[j].id; used.add(gp[j].id); });
    }
    // চ) ঠিকানা-জোড়া: ঠিকানা-স্লটে বসা অংশের ঠিক পরের অব্যবহৃত অংশ-লেবেল লাইন ("Post: …", "P.S: …") —
    //    নমুনায় সেগুলোর আলাদা স্লট না থাকলে (থাকলে ক-ধাপেই বসেছে) একই স্লটে জোড়া; অতিরিক্তে আলাদা লাইন নয়
    for (const s of leaders) {
      const pid = map[s.id];
      if (!pid || typeof pid !== 'string') continue;
      const p0 = parts[pIdx.get(pid)];
      if (!p0 || p0.kind !== 'kv' || !(isAddr(p0.key, p0.label) || ADDR_PART.has(p0.key))) continue;
      const join = [pid];
      for (let k = pIdx.get(pid) + 1; k < parts.length; k++) {
        const q = parts[k];
        if (used.has(q.id) || q.kind !== 'kv' || !ADDR_PART.has(q.key)) break;
        join.push(q.id); used.add(q.id);
      }
      if (join.length > 1) map[s.id] = join;
    }
    return {
      map, present,
      unmatchedSlots: leaders.filter((s) => s.role === 'var' && !map[s.id]).map((s) => s.id),
      unusedParts: parts.filter((p) => !used.has(p.id)).map((p) => p.id)
    };
  }

  // ---------------------------------------------------------------- ৪) পূরণ
  function restoreFont(it) { if (it.fit && it.fit.fontFrom) it.fontPt = it.fit.fontFrom; delete it.fit; }

  function setLines(it, lines, keepTabs) {
    if (keepTabs && it.tabLines && it.tabLines.length) {
      it.tabLines = lines;
      it.lines = lines.map((l) => l.replace(/\t+/g, ' '));
    } else {
      it.tabLines = null; it.tabStops = null; it.tabStopsSrc = null;
      it.lines = lines;
    }
    it.text = it.lines.join('\n');
  }

  /** টেবিলের নতুন সারি: শিরোনাম রাখা, নমুনা-সারি বাদ, "মোট"-সারির লেবেল রাখা, খসড়ার সারি বসানো */
  function fillTable(it, part) {
    const rows = it.rows || [];
    const nCols = rows.length ? Math.max(...rows.map((r) => r.length)) : 0;
    const hasHead = rows.length > 1 && rows[0].some((c) => plain(c));
    const head = hasHead ? rows[0] : null;
    const body = rows.slice(hasHead ? 1 : 0);
    const isSum = (r) => r.some((c) => SUMMARY.test(plain(c)));
    const sumRows = body.filter(isSum);
    const bodyN = body.length - sumRows.length;
    // খসড়ার সারি → নমুনার কলামে
    let cRows = part ? part.rows.map((r) => r.slice()) : [];
    let colMap = null;
    if (part && head) {
      const ch = cRows[0] ? cRows[0].map(cmp) : [];
      const hits = head.map((h) => { const k = cmp(h); return k ? ch.findIndex((c) => c && (c === k || c.includes(k) || k.includes(c))) : -1; });
      if (hits.filter((x) => x >= 0).length / Math.max(1, head.filter((h) => plain(h)).length) >= 0.5) {
        cRows = cRows.slice(1);
        colMap = hits;
        // শিরোনামে না-মেলা খসড়া-কলাম: ফাঁকা নমুনা-কলামে, তাও না থাকলে শেষ কলামে জোড়া (লেখা হারায় না)
        const ncols = Math.max(0, ...cRows.map((r) => r.length));
        for (let j = 0; j < ncols; j++) {
          if (colMap.includes(j)) continue;
          const free = colMap.findIndex((x, k) => x < 0 && !SERIAL.test(plain(head[k])));
          if (free >= 0) colMap[free] = j; else colMap.push(j);
        }
      }
    }
    const place = (r) => {
      const out = Array.from({ length: nCols }, () => '');
      if (colMap) colMap.forEach((j, k) => { if (j < 0 || j >= r.length) return; if (k < nCols) out[k] = r[j]; else out[nCols - 1] = (out[nCols - 1] + ' ' + r[j]).trim(); });
      else if (r.length <= nCols) {
        // কলাম কম ⇒ ক্রমিক-কলাম (থাকলে) বাদ দিয়ে বসানো
        const start = head && SERIAL.test(plain(head[0])) && r.length < nCols ? 1 : 0;
        r.forEach((c, j) => { out[start + j] = c; });
      } else { r.slice(0, nCols - 1).forEach((c, j) => { out[j] = c; }); out[nCols - 1] = r.slice(nCols - 1).join(' '); }
      return out;
    };
    const cSum = cRows.filter(isSum), cData = cRows.filter((r) => !isSum(r));
    const data = cData.map(place);
    // ক্রমিক-কলাম খসড়ায় না থাকলে নিজে নম্বর
    if (head && SERIAL.test(plain(head[0]))) data.forEach((r, i) => { if (!plain(r[0])) r[0] = bnDigits(i + 1); });
    // নমুনায় ফাঁকা সারি (লেখার জায়গা, ক্যাশমেমো) থাকলে: মোট উচ্চতা একই, শেষে অন্তত একটি ফাঁকা সারি —
    // builder (B2) লেখার সারিকে স্বাভাবিক উচ্চতা দিয়ে বাকিটা ফাঁকা সারিতে দেয়
    const blankRow = () => Array.from({ length: nCols }, () => '');
    const formArea = body.some((r) => !isSum(r) && !r.some((c) => plain(c)));
    while (data.length < bodyN) data.push(blankRow());
    if (formArea && (!data.length || data[data.length - 1].some((c) => plain(c)))) data.push(blankRow());
    // মোট-সারি: লেবেল-ঘর রাখা, বাকি ঘর খসড়ার মোট-সারি থেকে (না পেলে ফাঁকা)
    const sums = sumRows.map((sr) => {
      const label = sr.map((c) => (SUMMARY.test(plain(c)) ? c : ''));
      const src = cSum.find((r) => r.some((c) => SUMMARY.test(c) && sr.some((x) => SUMMARY.test(x) && cmp(x) === cmp(c)))) || (cSum.length === 1 && sumRows.length === 1 ? cSum[0] : null);
      if (src) {
        const vals = src.filter((c) => c && !SUMMARY.test(c));
        if (src.length === nCols) src.forEach((c, k) => { if (!label[k] && !SUMMARY.test(c)) label[k] = c; });
        else for (let k = nCols - 1; k >= 0 && vals.length; k--) if (!label[k]) label[k] = vals.pop();
        cSum.splice(cSum.indexOf(src), 1);
      }
      return label;
    });
    cSum.forEach((r) => data.push(place(r)));   // নমুনায় মোট-সারি নেই ⇒ সাধারণ সারি হিসেবে (হারায় না)
    // নমুনার মোট-সারি যেখানে ছিল (সাধারণত শেষে) সেখানেই
    const out = head ? [head] : [];
    out.push(...data, ...sums);
    const oldN = rows.length;
    it.rows = out;
    if (it.heightPt && oldN && !formArea) it.heightPt = it.heightPt * out.length / oldN;
    it.cellAligns = null;
    it.cellFigures = (it.cellFigures || []).filter((f) => head && f.cell && f.cell[0] === 0);
  }

  /**
   * @param {{ ir, slots }} tpl  ছাঁচ (store-এর রেকর্ড বা fromIR-এর ফল)
   * @param {Array} parts        splitContent-এর ফল
   * @param {Object} map         { slotId: partId } (matchLocal + Gemini-ম্যাপ)
   * @param {Object} [opts]      { present: [partId] } — নমুনার স্থির লেখায় আগে থেকেই আছে
   * @returns {{ ir, report: { filled, blank, kept, extras, warnings } }}
   */
  function fill(tpl, parts, map, opts) {
    const o = opts || {};
    const ir = clone(tpl.ir);
    const slots = tpl.slots || [];
    const P = new Map(parts.map((p) => [p.id, p]));
    const usedParts = new Set(o.present || []);
    const report = { filled: [], blank: [], kept: [], extras: [], warnings: [] };
    // ম্যাপের মান তালিকা ⇒ প্রথম অংশের সাথে বাকিদের পূর্ণ লেখা ("লেবেল: মান") জোড়া — এক স্লটে
    const partOf = (s) => {
      const id = map[s.twinOf || s.id];
      if (Array.isArray(id)) {
        const ps = id.map((x) => P.get(x)).filter(Boolean);
        if (!ps.length) return null;
        const rest = ps.slice(1).map((p) => p.text).join(', ');
        return Object.assign({}, ps[0], { value: [ps[0].value, rest].filter(Boolean).join(', '), text: [ps[0].text, rest].filter(Boolean).join(', '), lines: [[ps[0].text, rest].filter(Boolean).join(', ')] });
      }
      return id && P.get(id) ? P.get(id) : null;
    };
    Object.values(map || {}).forEach((id) => [].concat(id).forEach((x) => { if (P.has(x)) usedParts.add(x); }));

    // লেবেল-মান: আইটেম ধরে সব টুকরা একসাথে
    const kvByItem = new Map();
    for (const s of slots.filter((x) => x.kind === 'kv')) {
      const key = [s.path.p, s.path.b, s.path.c, s.path.i].join(':');
      if (!kvByItem.has(key)) kvByItem.set(key, []);
      kvByItem.get(key).push(s);
    }
    for (const group of kvByItem.values()) {
      const it = itemAt(ir, group[0].path);
      const lines = itemLines(it).slice();
      const tkOf = {};   // লাইনপ্রতি একবার টোকেন (একই লাইনের পরের টুকরার সূচক যেন না সরে)
      let changed = false;
      for (const s of group) {
        const part = partOf(s);
        if (!part && s.role === 'fixed') { report.kept.push(s.id); continue; }
        const tk = tkOf[s.path.l] = tkOf[s.path.l] || tokens(lines[s.path.l]);
        const segIdx = s.path.s;
        const kv = tk[segIdx] != null ? parseKv(tk[segIdx]) : null;
        if (!kv) { report.warnings.push({ slot: s.id, kind: 'kv_mismatch' }); continue; }
        let value;
        if (part) {
          value = part.kind === 'kv' ? part.value : plain(part.text);
          report.filled.push(s.id);
        } else {
          value = blankValue(kv.value);
          report.blank.push(s.id);
        }
        // শুধু মান-অংশ বদল (ট্যাবের পরের লেজ, যেমন "\tখ্রি.", অক্ষত); কোলনের পরে ফাঁক না থাকলে লেখার আগে একটি
        const sp = part && value && !/\s$/.test(kv.colon) ? ' ' : '';
        tk[segIdx] = kv.pre + kv.label + kv.colon + sp + value;
        lines[s.path.l] = tk.join('');
        changed = true;
      }
      if (changed) { restoreFont(it); setLines(it, lines, true); }
    }

    // বাকি স্লট
    for (const s of slots.filter((x) => x.kind !== 'kv')) {
      const it = itemAt(ir, s.path);
      const part = partOf(s);
      if (s.kind === 'table') {
        if (part && part.kind !== 'table') {   // Gemini টেবিল-স্লটে লেখা দিলে: টেবিল খালি, লেখা অতিরিক্তে
          usedParts.delete(part.id);
          fillTable(it, null); report.blank.push(s.id); continue;
        }
        fillTable(it, part);
        (part ? report.filled : report.blank).push(s.id);
        continue;
      }
      if (!part) {
        if (s.role === 'fixed') { report.kept.push(s.id); continue; }
        restoreFont(it); setLines(it, [''], false); report.blank.push(s.id); continue;
      }
      if (part.kind === 'table') { usedParts.delete(part.id); if (s.role !== 'fixed') { restoreFont(it); setLines(it, [''], false); report.blank.push(s.id); } else report.kept.push(s.id); continue; }
      // লেবেল-মান অংশ লেবেল-শুরু অনুচ্ছেদে: নমুনার লেবেল-রূপ ("**বিষয়ঃ** ") রেখে খসড়ার মান
      const lead = part.kind === 'kv' && s.key ? parseKv(itemLines(it)[0]) : null;
      const pl = lead ? [lead.pre + lead.label + lead.colon + (/\s$/.test(lead.colon) ? '' : ' ') + part.value]
        : part.kind === 'kv' ? [part.text] : (part.lines && part.lines.length ? part.lines : [part.text]);
      restoreFont(it);
      if (it.keepLines || pl.length > 1 && s.kind !== 'para') { it.keepLines = pl.length > 1 || it.keepLines; setLines(it, pl.slice(), false); }
      else if (pl.length > 1 && s.kind === 'para' && it.keepLines !== false && pl.every((l) => l.length <= 60)) { it.keepLines = true; setLines(it, pl.slice(), false); }
      else setLines(it, [pl.join(' ')], false);
      report.filled.push(s.id);
    }

    // অতিরিক্ত: কোথাও না বসা অংশ ⇒ খসড়ায় তার ঠিক আগের বসানো অংশের স্লটের পরে (পড়ার ক্রম অক্ষত);
    // আগে কিছু বসানো না থাকলে শেষ var-অংশের পরে। যমজেও। নমুনার মূল-লেখার ধাঁচে।
    const extras = parts.filter((p) => !usedParts.has(p.id));
    if (extras.length) {
      const slotOfPart = new Map();
      slots.filter((s) => !s.twinOf && map[s.id]).forEach((s) => [].concat(map[s.id]).forEach((pid) => {
        if (P.has(pid) && usedParts.has(pid) && !slotOfPart.has(pid)) slotOfPart.set(pid, s);
      }));
      const fallback = slots.filter((s) => s.role === 'var' && s.kind !== 'table' && !s.twinOf).pop() || slots.filter((s) => !s.twinOf).pop();
      const groups = new Map();   // দলনেতা-স্লট → অংশ-তালিকা
      extras.forEach((p) => {
        let anchor = null;
        for (let k = parts.indexOf(p) - 1; k >= 0 && !anchor; k--) anchor = slotOfPart.get(parts[k].id) || null;
        anchor = anchor || fallback;
        const key = anchor ? anchor.id : '';
        if (!groups.has(key)) groups.set(key, { anchor, parts: [] });
        groups.get(key).parts.push(p);
      });
      const styleSrc = (() => {
        const para = slots.find((s) => s.kind === 'para' && !s.twinOf);
        return para ? itemAt(ir, para.path) : (fallback && fallback.kind !== 'table' ? itemAt(ir, fallback.path) : null);
      })();
      const mk = (p, cellW) => {
        if (p.kind === 'table') return { kind: 'table', type: 'table', rows: p.rows.map((r) => r.slice()), fontPt: (styleSrc && styleSrc.fontPt) || 12, widthPt: Math.max(72, cellW - 4), borderless: false, rect: null, spaceBeforePt: 4 };
        const lines = p.kind === 'kv' ? [p.text] : (p.lines || [p.text]);
        const base = styleSrc ? clone(styleSrc) : { kind: 'para', fontPt: 12, align: 'l' };
        Object.assign(base, { kind: 'para', type: p.kind === 'list' ? 'list_item' : 'paragraph', bold: false, align: base.align === 'c' ? 'l' : (base.align || 'l'),
          keepLines: lines.length > 1 && lines.every((l) => l.length <= 60), rect: null, extra: true, centerShiftPt: null });
        delete base.fit;
        setLines(base, lines.slice(), false);
        return base;
      };
      // সব লক্ষ্য (দলনেতা + যমজ) পেছন থেকে বসানো ⇒ আগের পথ অক্ষত; একই আইটেমের kv-স্লট একবারই
      const targets = [];
      for (const g of groups.values()) {
        if (!g.anchor) {   // কোনো স্লটই নেই ⇒ শেষ পাতার শেষ সারিতে
          const pg = ir.pages[ir.pages.length - 1];
          const band = pg.bands[pg.bands.length - 1] || (pg.bands[0] = { kind: 'flow', cells: [{ x0: 0, x1: pg.widthPt - pg.margins.left - pg.margins.right, items: [] }] });
          const cell = band.cells[0];
          cell.items.push(...g.parts.map((p) => mk(p, (cell.x1 || 0) - (cell.x0 || 0))));
          continue;
        }
        [g.anchor].concat(slots.filter((s) => s.twinOf === g.anchor.id)).forEach((s) => targets.push({ path: s.path, parts: g.parts, seq: targets.length }));
      }
      // একই আইটেমে দুই দল ⇒ পরেরটি আগে বসে, তারপর আগেরটি তার সামনে (ক্রম ঠিক থাকে)
      targets.sort((a, b) => b.path.p - a.path.p || b.path.b - a.path.b || b.path.c - a.path.c || b.path.i - a.path.i || b.seq - a.seq);
      for (const t of targets) {
        const cell = ir.pages[t.path.p].bands[t.path.b].cells[t.path.c];
        cell.items.splice(t.path.i + 1, 0, ...t.parts.map((p) => mk(p, (cell.x1 || 0) - (cell.x0 || 0))));
      }
      report.extras = extras.map((p) => p.id);
      report.warnings.push({ kind: 'extras', count: extras.length });
    }
    if (report.blank.length) report.warnings.push({ kind: 'blank_slots', count: report.blank.length });
    return { ir, report };
  }

  /** ছাঁচ-রেকর্ডের মূল অংশ (store-এ সেভের জন্য; নাম/থাম্ব UI দেয়) */
  function toTemplate(ir, meta) {
    const slim = slimIR(ir);
    return Object.assign({ version: VERSION, ir: slim, slots: fromIR(slim) }, meta || {});
  }

  /** এক ধাপে: ছাঁচ + খসড়া (+ বাইরের ম্যাপ) ⇒ নতুন নকশা */
  function compose(tpl, md, extraMap) {
    const parts = splitContent(md);
    const local = matchLocal(tpl.slots, parts);
    const map = Object.assign({}, local.map, extraMap || {});
    const out = fill(tpl, parts, map, { present: local.present });
    return Object.assign(out, { parts, local });
  }

  // ---------------------------------------------------------------- ৫) Gemini-ম্যাপ (T3c)
  // শুধু-লেখার ছোট কল: স্থানীয় মিলানোর পরে বাকি অংশ কোন স্লটে যাবে — উত্তর শুধু JSON, নতুন লেখা নয়।
  const MAP_PROMPT = [
    'You map pieces of a DRAFT document into the slots of a SAMPLE template. Reply with JSON only: {"map": {"<slotId>": "<partId>"}}.',
    'Rules:',
    '1. Never write, translate or change any text. Only pair existing ids.',
    '2. Each partId may be used at most once. Leave a slot out if no part fits it (it will stay blank).',
    '3. "table" slots take only "table" parts; "table" parts go only to "table" slots.',
    '4. Slots with role "var" hold changing data (names, values, body paragraphs). Pair by meaning: the part that plays the same role as the slot\'s sample text (labels may differ in language, e.g. "পিতার নাম" = "Father\'s Name").',
    '5. Slots with role "fixed" are the template\'s own wording (letterhead, titles, signatures). Pair a part with a fixed slot ONLY when the draft clearly gives a replacement for the same thing (e.g. a different person\'s name in a CV header, a different institution name). Otherwise leave fixed slots out.',
    '6. Keep the reading order where possible: earlier parts to earlier slots.',
    '7. Do not pair a part that is just a heading already present in the template.'
  ].join('\n');

  const cut = (s, n) => { const t = plain(s).replace(/\n+/g, ' / '); return t.length > n ? t.slice(0, n) + '…' : t; };

  /** ম্যাপ-কলের প্রার্থী: না-মেলা var দলনেতা + বদলযোগ্য স্থির (শিরোনাম/স্বাক্ষর/লেবেল-মান) দলনেতা */
  function mapCandidates(slots, parts, local) {
    const mapped = new Set(Object.keys(local.map));
    const unused = new Set(local.unusedParts);
    return {
      slots: slots.filter((s) => !s.twinOf && !mapped.has(s.id) && (s.role === 'var' || s.kind === 'heading' || s.kind === 'sign' || s.kind === 'kv')),
      parts: parts.filter((p) => unused.has(p.id))
    };
  }

  /** কল লাগবে কি না: বসানোর মতো অংশ আর প্রার্থী স্লট দুটোই থাকলে */
  function needsRemote(slots, parts, local) {
    const c = mapCandidates(slots, parts, local);
    return c.parts.length > 0 && c.slots.length > 0;
  }

  /** @returns {{ prompt, data }} — prompt = system, data = প্রার্থী স্লট/অংশের JSON (ছোট) */
  function buildMapPrompt(slots, parts, local) {
    const c = mapCandidates(slots, parts, local);
    const data = {
      slots: c.slots.map((s) => Object.assign({ id: s.id, kind: s.kind, role: s.role }, s.label ? { label: s.label } : {}, { sample: cut(s.sampleText, s.kind === 'table' ? 90 : 60) })),
      parts: c.parts.map((p) => Object.assign({ id: p.id, kind: p.kind }, p.label ? { label: p.label } : {},
        { text: p.kind === 'table' ? cut(p.rows.slice(0, 3).map((r) => r.join(' | ')).join('\n'), 160) : cut(p.kind === 'kv' ? p.value : p.text, 200) }))
    };
    return { prompt: MAP_PROMPT, data: 'DATA:\n' + JSON.stringify(data) };
  }

  /** উত্তর যাচাই: অচেনা/আগে-মেলানো id বাদ, এক অংশ একবার, টেবিল↔টেবিল */
  function parseMap(text, slots, parts, local) {
    const out = { map: {}, rejected: [] };
    let obj = null;
    const s = String(text || '').replace(/```(?:json)?/gi, '');
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a >= 0 && b > a) { try { obj = JSON.parse(s.slice(a, b + 1)); } catch (e) { obj = null; } }
    if (!obj) { out.rejected.push({ reason: 'not_json' }); return out; }
    const raw = obj.map && typeof obj.map === 'object' ? obj.map : obj;
    const c = mapCandidates(slots, parts, local);
    const S = new Map(c.slots.map((x) => [x.id, x])), P = new Map(c.parts.map((x) => [x.id, x]));
    const used = new Set();
    for (const [sid, pid] of Object.entries(raw)) {
      if (pid == null || pid === '') continue;
      const slot = S.get(sid), part = P.get(String(pid));
      if (!slot || !part) { out.rejected.push({ slot: sid, part: pid, reason: 'unknown_id' }); continue; }
      if (used.has(part.id)) { out.rejected.push({ slot: sid, part: pid, reason: 'part_twice' }); continue; }
      if ((slot.kind === 'table') !== (part.kind === 'table')) { out.rejected.push({ slot: sid, part: pid, reason: 'table_mismatch' }); continue; }
      out.map[sid] = part.id; used.add(part.id);
    }
    return out;
  }

  // ছোট স্থায়ী হ্যাশ (FNV-1a) — একই ছাঁচ+খসড়ায় আবার কল নয়
  function hash(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
  const MAP_CACHE = new Map();
  const CACHE_KEY = 'fayzar_t3_map_';
  function cacheGet(k) {
    if (MAP_CACHE.has(k)) return MAP_CACHE.get(k);
    try { const v = global.sessionStorage && sessionStorage.getItem(CACHE_KEY + k); if (v) return JSON.parse(v); } catch (e) { /* নীরব */ }
    return null;
  }
  function cachePut(k, v) {
    MAP_CACHE.set(k, v);
    try { if (global.sessionStorage) sessionStorage.setItem(CACHE_KEY + k, JSON.stringify(v)); } catch (e) { /* নীরব */ }
  }

  /**
   * Gemini-ম্যাপ। ব্যর্থ হলে কাজ থামে না — স্থানীয় ম্যাপই চলে (warning সহ)।
   * @param opts { request(key, media, onStream, prompt, extraText) — বিকল্প (টেস্ট), key, engine }
   * @returns {Promise<{ map, called, cached, rejected, error? }>}
   */
  async function mapWithGemini(tpl, parts, local, opts) {
    const o = opts || {};
    if (!needsRemote(tpl.slots, parts, local)) return { map: {}, called: false, cached: false, rejected: [] };
    const { prompt, data } = buildMapPrompt(tpl.slots, parts, local);
    const key = hash(prompt + '\n' + data);
    const hit = cacheGet(key);
    if (hit) return { map: hit, called: false, cached: true, rejected: [] };
    const Engine = o.engine || (global.FayzarAiOcrEngine || null);
    const request = o.request || (Engine && Engine.executeGeminiRequest);
    if (typeof request !== 'function') return { map: {}, called: false, cached: false, rejected: [], error: 'no_engine' };
    // executeGeminiRequest কেবল state.isProcessing=true হলে চলে — চলাকালীন চালু, শেষে আগের অবস্থা (faithful-capture-এর মতো)
    const st = !o.request && Engine && Engine.state ? Engine.state : null;
    const was = st ? st.isProcessing : null;
    if (st) st.isProcessing = true;
    try {
      const text = await request(o.key || '', [], null, prompt, data);
      const res = parseMap(text, tpl.slots, parts, local);
      if (!res.rejected.some((r) => r.reason === 'not_json')) cachePut(key, res.map);
      return { map: res.map, called: true, cached: false, rejected: res.rejected, error: res.rejected.some((r) => r.reason === 'not_json') ? 'not_json' : undefined };
    } catch (e) {
      return { map: {}, called: true, cached: false, rejected: [], error: String(e && e.message || e) };
    } finally {
      if (st) st.isProcessing = was;
    }
  }

  /** প্রিভিউ-বোতাম: স্লটের (ও যমজের) role বদল — হাতে বদলালে auto-চিহ্ন উঠে যায়। ফেরত: বদলানো স্লটের সংখ্যা */
  function setRole(slots, id, role) {
    if (role !== 'fixed' && role !== 'var') return 0;
    const lead = (slots || []).find((s) => s.id === id);
    if (!lead) return 0;
    const leadId = lead.twinOf || lead.id;
    let n = 0;
    slots.forEach((s) => { if (s.id === leadId || s.twinOf === leadId) { s.role = role; delete s.auto; n++; } });
    return n;
  }

  /**
   * রেডিমেড-শর্টকাট (মালিকের সিদ্ধান্ত ৪): নমুনা কোনো রেডিমেড ছাঁচের ধরনের হলে সেটির প্রস্তাব।
   * @param info { docType (DocClassifier), text (নমুনার লেখা), slots (fromIR) }
   * @param registry FayzarTemplateComposer.REGISTRY
   * @returns ছাঁচ-রেকর্ড বা null (প্রশ্নপত্র/অজানা ধরনে প্রস্তাব নয় — নিজের ছাঁচই ভালো)
   */
  function suggestReadymade(info, registry) {
    const i = info || {}, reg = registry || [];
    const by = (id) => reg.find((t) => t.id === id) || null;
    const text = String(i.text || '');
    const bn = (text.match(/[ঀ-৿]/g) || []).length, en = (text.match(/[A-Za-z]/g) || []).length;
    const twins = (i.slots || []).filter((s) => s.twinOf).length;
    switch (i.docType) {
      case 'CV_RESUME': return en > bn ? by('cv-english') : by('cv-bangla');
      case 'CASH_MEMO': return /রসিদ|receipt/i.test(text) ? by('receipt') || by('memo-2up') : (twins ? by('memo-2up') : by('memo-1up'));
      case 'PROTTOYON': return /ইউনিয়ন|পৌরসভা|ইউপি/.test(text) ? by('prottoyon-up') : by('prottoyon-school');
      case 'GOVT_APP': return /চাকরি|পদে|নিয়োগ/.test(text) ? by('app-job') : by('app-general');
      case 'OFFICE_PAD': return reg.find((t) => t.doc_type === 'OFFICE_PAD') || null;
      default: return null;
    }
  }

  /** পূর্ণ পথ (ব্রাউজার): স্থানীয় মিল → দরকারে Gemini-ম্যাপ → পূরণ */
  async function composeAsync(tpl, md, opts) {
    const parts = splitContent(md);
    const local = matchLocal(tpl.slots, parts);
    const remote = (opts && opts.remote === false) ? { map: {}, called: false, cached: false, rejected: [] } : await mapWithGemini(tpl, parts, local, opts);
    const out = fill(tpl, parts, Object.assign({}, local.map, remote.map), { present: local.present });
    if (remote.error) out.report.warnings.push({ kind: 'map_failed', detail: remote.error });
    return Object.assign(out, { parts, local, remote });
  }

  const FayzarSampleTemplate = { VERSION, parseKv, kvSegs, labelKey, blankValue, slimIR, fromIR, splitContent, matchLocal, fill, toTemplate, compose,
    MAP_PROMPT, mapCandidates, needsRemote, buildMapPrompt, parseMap, mapWithGemini, composeAsync, suggestReadymade, setRole, _cmp: cmp, _clearMapCache: () => MAP_CACHE.clear() };
  global.FayzarSampleTemplate = FayzarSampleTemplate;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarSampleTemplate;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
