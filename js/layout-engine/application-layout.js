/**
 * Fayzar — আবেদনপত্র-লেআউট (GOVT_APP) — Part-18.9
 * =================================================
 * দোকানের আসল, পরীক্ষিত আবেদনপত্র (জমি-সংশোধন, হোল্ডিং, মিস কেস, চাকরি) থেকে মাপা নকশা:
 *  - পাতা  : A4 পোর্ট্রেট; মার্জিন উপরে ১", বামে ১.২৫", ডানে ০.৭৫", নিচে ০.৭৫"
 *  - লেখা  : ১৩pt, লাইন-দূরত্ব ১.২ (w:line=288); প্রতিটি অংশের মাঝে একটি ফাঁকা লাইন
 *  - ক্রম   : তারিখ → বরাবর, (বোল্ড) + প্রাপক-লাইন (ইনডেন্ট নয়) → বিষয় (পুরো লাইন বোল্ড) → জনাব, (বোল্ড)
 *            → মূল লেখা (দুই-পাশে সমান) → [তফসিল (মাঝে, বোল্ড) + বর্ডার-টেবিল (মাঝে)] → অতএব …
 *            → নিবেদক, (বোল্ড, বামে) + স্বাক্ষরের জন্য ২ লাইন ফাঁকা + নাম/ঠিকানা → সংযুক্তি (ডট-লিডার + কপি সংখ্যা)
 *  - চাকরির আবেদন: "১। নাম : …" সারি — লেবেলের পরে ট্যাবে কোলন, মোড়ানো লেখা মানের নিচে
 *
 * এক মডেল → তিন রেন্ডার (DOCX / Word 2003 RTF / HTML প্রিভিউ) — preview == download।
 * লেখা-রূপান্তর (ইউনিকোড/বিজয়, ইংরেজি-রান, সমীকরণ) ExportDualEngine-এর ফাংশন দিয়েই হয় (কলব্যাক)।
 * ক্রম কখনো বদলানো হয় না — উৎসে যা যে ক্রমে আছে, সেভাবেই বসে।
 */
(function (global) {
  'use strict';

  const GEO = {
    pageW: 11906, pageH: 16838,
    top: 1440, left: 1800, right: 1080, bottom: 1080,
    sz: 26,            // ১৩pt (অর্ধ-পয়েন্ট)
    line: 288,         // ১.২ লাইন
    tableSz: 24        // টেবিলের ভেতরে ১২pt
  };
  GEO.textW = GEO.pageW - GEO.left - GEO.right;   // ৯০২৬

  // ------------------------------------------------------------------ মাপ (আনুমানিক, রক্ষণশীল)
  function measure(str, sz) {
    const P = global.CqBookletPlanner;
    if (P && typeof P.measure === 'function') return P.measure(str, sz);
    return Math.round(String(str || '').length * (sz / 2) * 20 * 0.55);
  }

  // ------------------------------------------------------------------ প্যাটার্ন
  const RX = {
    date: /^তারিখ\s*[:ঃ]/,
    memo: /^(?:স্মারক|সূত্র|স্বারক|রেফ)\s*(?:নং|নম্বর)?\s*[:ঃ\-–]?/,
    receiver: /^বরাবর\s*[,:ঃ]?\s*(.*)$/,
    via: /^মাধ্যম\s*[:ঃ]/,
    subject: /^বিষয়\s*[:ঃ]\s*(.*)$/,
    salutation: /^(?:জনাব|মহোদয়|মহোদয়া|মাননীয়\s*মহোদয়|সুধী)\s*[,:ঃ]?\s*$/,
    applicantHead: /^(?:আবেদনকারী|আবেদনকারীর\s*(?:নাম|পরিচয়))\s*[:ঃ]\s*$/,
    prayer: /^অতএব/,
    // শব্দের পরে বিরামচিহ্ন বা লাইনের শেষ চাই — "আবেদনকারীর জমি…" জাতীয় বাক্য সমাপ্তি নয়
    closing: /^(?:বিনীত\s*)?(?:নিবেদক|নিবেদিকা|আবেদনকারী|প্রার্থী|আপনার\s*বিশ্বস্ত)(?:\s*[,:ঃ\-–]+\s*(.*)|\s*)$/,
    attach: /^(?:সংযুক্তি(?:সমূহ)?|সংলগ্নী|সংলগ্ন)(?:\s*[:ঃ\-–]+\s*(.*)|\s*)$/,
    copy: /^(?:অনুলিপি(?:\s*(?:প্রেরণ|সদয়\s*অবগতি\s*ও\s*প্রয়োজনীয়\s*ব্যবস্থা\s*গ্রহণের\s*জন্য))?|সদয়\s*অবগতি(?:র\s*জন্য)?(?:\s*\([^)]*\))?)\s*[:ঃ\-–]?\s*$/,
    tableRow: /^\|.*\|$/,
    tableSep: /^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?$/,
    scheduleHead: /^(?:তফসিল|তফশিল|বিবরণ|জমির\s*বিবরণ|তথ্য)\s*[:ঃ]?\s*$/,
    // চাকরির আবেদনের "১। নাম : মান" সারি (লেবেল ছোট)
    kv: /^([০-৯\d]{1,2})\s*[।.|)]\s*([^:ঃ]{1,34}?)\s*[:ঃ]\s*(.*)$/,
    numbered: /^(?:([০-৯\d]{1,2})\s*[।.|)]|\(?([কখগঘঙচছজঝঞ])\s*[).।])\s*(.+)$/,
    total: /^(?:সর্বমোট|মোট)\s*[:=ঃ\-]/,
    sentenceEnd: /[।?!:ঃ;]\s*$/
  };
  // নুকতা-রূপ এক করা: নিয়মের লেখা (য+়) আর ইনপুট (norm → য়) যেভাবেই আসুক, তুলনা একই রূপে
  for (const k of Object.keys(RX)) RX[k] = new RegExp(norm(RX[k].source), RX[k].flags);

  function norm(text) {
    return String(text == null ? '' : text)
      .replace(/\u09AF\u09BC/g, '\u09DF').replace(/\u09A1\u09BC/g, '\u09DC').replace(/\u09A2\u09BC/g, '\u09DD')
      .replace(/\r\n?/g, '\n');
  }
  function cleanLine(l) {
    // শুধু মার্কডাউন-বোল্ড ** বাদ — "______" (শূন্যস্থানের দাগ) অক্ষত থাকে
    return String(l).replace(/\*\*/g, '').replace(/^\s*#{1,6}\s*/, '').replace(/^>\s*/, '').replace(/\s+$/, '').replace(/^\s+/, '');
  }
  function splitCells(row) {
    return row.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  }
  /** "১। ডিপি খতিয়ানের ফটোকপি ......... ১ ফর্দ।" → { text, count } */
  function splitLeader(t) {
    const m = String(t).match(/^(.*?\S)\s*(?:\.{3,}|…{2,}|_{3,}|\t+)\s*([^.…]*\S)\s*$/);
    return m ? { text: m[1], count: m[2] } : { text: String(t), count: '' };
  }

  const FayzarApplicationLayout = {
    GEOMETRY: GEO,

    /** উৎস-লেখা → ক্রমানুসারী ব্লক-তালিকা */
    parse(rawText) {
      const lines = norm(rawText).split('\n').map(cleanLine);
      const blocks = [];
      let state = 'head';          // head → body → closing → attach/copy
      let seenSalutation = false;
      let cur = null;              // খোলা ব্লক (যেখানে পরের লাইন যোগ হতে পারে)
      const push = (b) => { blocks.push(b); cur = b; return b; };
      const close = () => { cur = null; };

      for (let i = 0; i < lines.length; i++) {
        const t = lines[i];
        if (!t) { if (cur && /^(para|subject)$/.test(cur.kind)) close(); else if (cur && cur.kind === 'lines' && cur.role === 'receiver') close(); continue; }

        // ---- টেবিল (মার্কডাউন) ----
        if (RX.tableRow.test(t)) {
          if (RX.tableSep.test(t)) continue;
          const cells = splitCells(t);
          if (cur && cur.kind === 'table') cur.rows.push(cells);
          else push({ kind: 'table', rows: [cells], header: lines[i + 1] && RX.tableSep.test(lines[i + 1]) });
          continue;
        }
        if (cur && cur.kind === 'table') close();

        // ---- তারিখ / স্মারক ----
        if (RX.memo.test(t) && /তারিখ\s*[:ঃ]/.test(t)) {
          const k = t.search(/তারিখ\s*[:ঃ]/);
          push({ kind: 'memoDate', left: t.slice(0, k).trim(), right: t.slice(k).trim() }); close(); continue;
        }
        if (RX.date.test(t) && state !== 'attach') { push({ kind: 'line', role: 'date', text: t }); close(); continue; }
        if (RX.memo.test(t) && state === 'head') { push({ kind: 'line', role: 'memo', text: t }); close(); continue; }

        // ---- বরাবর ----
        let m = t.match(RX.receiver);
        if (m && state === 'head') {
          const b = push({ kind: 'lines', role: 'receiver', label: 'বরাবর,', lines: [] });
          if (m[1]) b.lines.push(m[1]);
          continue;
        }
        if (RX.via.test(t)) { push({ kind: 'line', role: 'via', text: t }); close(); continue; }

        // ---- বিষয় ----
        m = t.match(RX.subject);
        if (m && !seenSalutation) {
          const label = t.slice(0, t.length - m[1].length).trim();
          push({ kind: 'subject', label, text: m[1].trim() });
          state = 'head';
          continue;
        }
        if (cur && cur.kind === 'subject' && !RX.salutation.test(t) && !RX.applicantHead.test(t) && !RX.memo.test(t) && !RX.date.test(t) && !RX.closing.test(t)) {
          cur.text += ' ' + t; continue;   // মোড়ানো বিষয়-লাইন
        }

        // ---- আবেদনকারী: (সম্বোধনের আগে) ----
        if (RX.applicantHead.test(t) && !seenSalutation) { push({ kind: 'lines', role: 'applicant', label: t, lines: [] }); continue; }

        // ---- সম্বোধন ----
        if (RX.salutation.test(t)) { push({ kind: 'line', role: 'salutation', text: t }); close(); seenSalutation = true; state = 'body'; continue; }

        // ---- সংযুক্তি / অনুলিপি ----
        m = t.match(RX.attach);
        if (m && state !== 'head') {
          const b = push({ kind: 'attach', label: (m[1] ? t.slice(0, t.length - m[1].length) : t).trim() || 'সংযুক্তি:', items: [], total: '' });
          if (m[1]) b.items.push(splitLeader(m[1]));
          state = 'attach'; continue;
        }
        if (RX.copy.test(t) && state !== 'head') { push({ kind: 'list', role: 'copy', label: t, items: [] }); state = 'copy'; continue; }
        if (state === 'attach' && cur && cur.kind === 'attach') {
          if (RX.total.test(t) || /^মোট\s*=/.test(t)) cur.total = t;
          else cur.items.push(splitLeader(t));
          continue;
        }
        if (state === 'copy' && cur && cur.kind === 'list') { cur.items.push(t); continue; }

        // ---- নিবেদক (সমাপ্তি) ----
        m = t.match(RX.closing);
        if (m && (seenSalutation || state === 'body') && !(RX.applicantHead.test(t) && !seenSalutation)) {
          const label = (m[1] ? t.slice(0, t.length - m[1].length) : t).trim();
          const b = push({ kind: 'closing', label, lines: [] });
          if (m[1]) b.lines.push(m[1]);
          state = 'closing'; continue;
        }
        if (state === 'closing' && cur && cur.kind === 'closing') { cur.lines.push(t); continue; }

        // ---- প্রাপক / আবেদনকারী-ব্লকের লাইন ----
        if (cur && cur.kind === 'lines') { cur.lines.push(t); continue; }

        // ---- তফসিল-শিরোনাম ও তার ক্যাপশন ----
        if (RX.scheduleHead.test(t)) { push({ kind: 'heading', text: t }); continue; }
        if (cur && (cur.kind === 'heading' || (cur.kind === 'caption')) && t.length < 120 && lines.slice(i + 1).find(Boolean) && RX.tableRow.test(lines.slice(i + 1).find(Boolean))) {
          push({ kind: 'caption', text: t }); continue;
        }

        // ---- "১। নাম : মান" সারি (চাকরির আবেদন) ----
        m = t.match(RX.kv);
        if (m && state !== 'head') {
          const row = { num: m[1], label: m[2].trim(), value: m[3].trim(), more: [] };
          if (cur && cur.kind === 'kv') cur.rows.push(row); else push({ kind: 'kv', rows: [row] });
          continue;
        }
        // ঠিকানার দ্বিতীয় লাইন ("উপজেলা: …, জেলা: …") — আগের সারির মানের নিচে
        if (cur && cur.kind === 'kv' && !RX.numbered.test(t) && !RX.prayer.test(t) && t.length < 90 &&
          (/ঠিকানা/.test(cur.rows[cur.rows.length - 1].label) || /^(?:উপজেলা|জেলা|থানা|ডাকঘর|পোস্ট|গ্রাম)\s*[:ঃ]/.test(t))) {
          cur.rows[cur.rows.length - 1].more.push(t); continue;
        }

        // ---- নম্বরযুক্ত বিন্দু (দীর্ঘ লেখা) ----
        m = t.match(RX.numbered);
        if (m && state === 'body' && t.length > 40) {
          const num = m[1] || m[2];
          const sep = (t.match(/^\(?\s*[০-৯\dকখগঘঙচছজঝঞ]{1,2}\s*([।.|)])/) || [])[1] || '.';
          const item = { num, sep, text: m[3].trim() };
          if (cur && cur.kind === 'numbered') cur.items.push(item); else push({ kind: 'numbered', items: [item] });
          continue;
        }

        // ---- অনুচ্ছেদ ----
        const role = RX.prayer.test(t) ? 'prayer' : 'body';
        if (state === 'head' && seenSalutation === false && !blocks.some((b) => b.kind === 'subject')) {
          // শিরোনামের আগে অচেনা লাইন (প্যাড-শিরোনাম ইত্যাদি) — যেমন আছে, বামে
          push({ kind: 'line', role: 'plain', text: t }); close(); continue;
        }
        if (cur && cur.kind === 'para' && role === 'body' && !RX.sentenceEnd.test(cur.text)) { cur.text += ' ' + t; continue; }
        push({ kind: 'para', role, text: t });
        if (state === 'head') state = 'body';
      }
      return { kind: 'GOVT_APP_LAYOUT', version: 1, blocks };
    },

    // ------------------------------------------------------------------ রেন্ডার-পরিকল্পনা
    /** ব্লকের মাঝে ফাঁকা লাইন বসবে কি না (দোকানের নিয়ম: প্রতিটি অংশের পরে একটি) */
    _gapBefore(prev, b) {
      if (!prev) return false;
      if (b.kind === 'caption' && prev.kind === 'heading') return false;
      if (b.kind === 'table' && (prev.kind === 'heading' || prev.kind === 'caption' || prev.kind === 'kv')) return false;
      return true;
    },

    /**
     * পাতার মাপ বাছাই (দোকানের নিয়ম): সাধারণত S13-এর মাপ; লেখা এক পাতা ছাড়ালে তবেই ধাপে ধাপে
     * মার্জিন/ফন্ট/লাইন কমিয়ে এক পাতায় ধরানো (যেমন দোকানের চাকরির আবেদনে করা)। কমিয়েও না ধরলে
     * (সত্যিকারের লম্বা চিঠি) সাধারণ মাপেই একাধিক পাতা — জোর করে ছোট নয়।
     */
    STEPS: [
      { top: 1440, left: 1800, right: 1080, bottom: 1080, sz: 26, line: 288 },   // ১", ১.২৫", ০.৭৫", ০.৭৫" · ১৩pt · ১.২
      { top: 1080, left: 1440, right: 720, bottom: 720, sz: 26, line: 288 },    // ০.৭৫", ১", ০.৫", ০.৫"
      { top: 1080, left: 1440, right: 720, bottom: 720, sz: 24, line: 288 },    // + ১২pt
      { top: 720, left: 1152, right: 720, bottom: 540, sz: 24, line: 264 }      // চাকরির-আবেদনের মতো আঁটসাঁট
    ],

    geometry(model, opts) {
      const o = opts || {};
      const mk = (s) => {
        const g = Object.assign({ pageW: GEO.pageW, pageH: GEO.pageH, tableSz: s.sz <= 24 ? 22 : 24 }, s);
        g.textW = g.pageW - g.left - g.right;
        g.usableH = g.pageH - g.top - g.bottom;
        return g;
      };
      if (Number.isInteger(o.step) && this.STEPS[o.step]) return Object.assign(mk(this.STEPS[o.step]), { fitStep: o.step });
      const base = mk(this.STEPS[0]);
      if (o.noFit || !model || !model.blocks) return base;
      if (this.estimateHeight(model, base, o.isBijoy) <= base.usableH) return base;
      for (let i = 1; i < this.STEPS.length; i++) {
        const g = mk(this.STEPS[i]);
        if (this.estimateHeight(model, g, o.isBijoy) <= g.usableH) return Object.assign(g, { fitStep: i });
      }
      return base;
    },

    /** আনুমানিক উচ্চতা (টুইপ) — রেন্ডারের হুবহু একই ব্লক/ফাঁকা-লাইন নিয়মে */
    estimateHeight(model, g, isBijoy) {
      const ff = isBijoy ? 1.02 : 1.24;                      // ফন্টের স্বাভাবিক লাইন-উচ্চতা (সুতন্নী / কালপুরুষ)
      const lineH = (sz, line) => (sz / 2) * 20 * (line / 240) * ff;
      const L = (t, w, sz) => Math.max(1, Math.ceil(measure(String(t || ''), sz || g.sz) / Math.max(1500, w)));
      const one = lineH(g.sz, g.line);
      let h = 0;
      let prev = null;
      for (const b of model.blocks) {
        if (this._gapBefore(prev, b)) h += one;
        prev = b;
        switch (b.kind) {
          case 'line': case 'heading': case 'caption': h += L(b.text, g.textW) * one; break;
          case 'memoDate': h += one; break;
          case 'lines': h += one; for (const l of b.lines) h += L(l, g.textW) * one; break;
          case 'subject': h += L(b.label + ' ' + b.text, g.textW - this._subjectHang(b, g)) * one; break;
          case 'para': h += L(b.text, g.textW) * one; break;
          case 'numbered': for (const it of b.items) h += L(it.text, g.textW - 360) * one; break;
          case 'kv': {
            const ind = this._kvTab(b.rows, g.sz) + 160;
            for (const r of b.rows) { h += L(': ' + r.value, g.textW - ind) * one; h += r.more.length * one; }
            break;
          }
          case 'table': {
            const widths = this._tableWidths(b.rows, g.tableSz, g.textW, b.header);
            for (const row of b.rows) {
              let n = 1;
              widths.forEach((w, ci) => { n = Math.max(n, L(row[ci], w - 160, g.tableSz) + (String(row[ci] || '').match(/<br\s*\/?>/gi) || []).length); });
              h += n * lineH(g.tableSz, 240) + 30;
            }
            break;
          }
          case 'closing': h += 3 * one + b.lines.length * one; break;
          case 'attach': h += one * (1 + b.items.length + (b.total ? 1 : 0)); break;
          case 'list': h += one * (1 + b.items.length); break;
          default: break;
        }
      }
      // Word-এ মাপা সংশোধন (২০২৬-১০-০৯, ৩ নমুনা × ৪ ধাপ): আসল/হিসাব — কালপুরুষ ≈১.২০–১.২৫, সুতন্নী ≈১.০২–১.০৯।
      // সুতন্নী ১.০৮: মাপা সব এক-পাতার ফল মেলে (সংশোধন-আবেদন সাধারণ মাপে ১ পাতা, চাকরির আবেদন ধাপ-২-এ ২ পাতা)।
      return Math.round(h * (isBijoy ? 1.08 : 1.24));
    },

    _subjectHang(b, g) {
      return Math.min(1000, Math.max(500, Math.round(measure(b.label, g.sz) * 0.9) + 100));
    },

    /**
     * টেবিলের কলাম-প্রস্থ (Word-এর "অটো-ফিট"-এর মতো): প্রতিটি কলামের ন্যূনতম = দীর্ঘতম শব্দ,
     * পছন্দের = পুরো লেখা। পছন্দেরটা ধরলে সেটিই (টেবিল মাঝে); না ধরলে বাড়তি জায়গা আনুপাতিক ভাগ —
     * ফলে "বিভাগ/বিষয়"-এর মতো শব্দ মাঝখানে ভাঙে না।
     */
    _tableWidths(rows, sz, maxW, header) {
      const W = maxW || GEO.textW;
      const n = Math.max(1, ...rows.map((r) => r.length));
      const PAD = 260;
      const min = new Array(n).fill(500), pref = new Array(n).fill(500);
      rows.forEach((r, ri) => {
        const k = ri === 0 && header ? 1.08 : 1;            // হেডার বোল্ড — একটু চওড়া
        for (let i = 0; i < n; i++) {
          const parts = String(r[i] == null ? '' : r[i]).split(/<br\s*\/?>/i).map((p) => p.trim());
          for (const p of parts) {
            pref[i] = Math.max(pref[i], Math.round(measure(p, sz) * k) + PAD);
            for (const w of p.split(/\s+/)) min[i] = Math.max(min[i], Math.round(measure(w, sz) * k) + PAD);
          }
        }
      });
      const sp = pref.reduce((a, b) => a + b, 0), sm = min.reduce((a, b) => a + b, 0);
      if (sp <= W) return pref;
      if (sm >= W) return min.map((x) => Math.floor(x * W / sm));
      const extra = W - sm;
      return min.map((x, i) => Math.floor(x + (pref[i] - x) * extra / (sp - sm)));
    },

    _kvTab(rows, sz) {
      const widest = rows.reduce((a, r) => Math.max(a, measure(r.num + '। ' + r.label, sz)), 0);
      return Math.min(3800, Math.max(1800, widest + 240));
    },

    // ------------------------------------------------------------------ DOCX
    /**
     * @param model parse()-এর ফল
     * @param h { runs(text, style) → <w:r>…</w:r> XML (ExportDualEngine.renderDocxRuns), isBijoy }
     */
    renderDocx(model, h) {
      const g = (h && h.geometry) || this.geometry(model, { isBijoy: h && h.isBijoy });
      const sz = g.sz;
      const sp = (extra) => '<w:spacing w:before="0" w:after="0" w:line="' + g.line + '" w:lineRule="auto"/>' + (extra || '');
      const P = (inner, pPr, keep) => '<w:p><w:pPr>' + (keep ? '<w:keepNext/>' : '') + sp(pPr) + '</w:pPr>' + (inner || '') + '</w:p>';
      const R = (t, st) => h.runs(t, Object.assign({ sz }, st || {}));
      const blank = P('');
      let xml = '';
      let prev = null;
      const blocks = model.blocks;
      for (let bi = 0; bi < blocks.length; bi++) {
        const b = blocks[bi];
        const keepLast = !!(blocks[bi + 1] && blocks[bi + 1].kind === 'table');   // টেবিলের আগের লাইন টেবিলের সঙ্গে
        if (this._gapBefore(prev, b)) xml += blank;
        prev = b;
        switch (b.kind) {
          case 'line':
            xml += P(R(b.text, { b: b.role === 'salutation' }), '', keepLast);
            break;
          case 'memoDate':
            xml += P(R(b.left) + '<w:r><w:tab/></w:r>' + R(b.right), '<w:tabs><w:tab w:val="right" w:pos="' + g.textW + '"/></w:tabs>');
            break;
          case 'lines':
            xml += P(R(b.label, { b: true }));
            b.lines.forEach((l, i) => { xml += P(R(l), '', keepLast && i === b.lines.length - 1); });
            break;
          case 'subject': {
            const hang = this._subjectHang(b, g);
            // লেবেলের পরে একটি সাধারণ স্পেস (দোকানের নমুনার মতো); দ্বিতীয় লাইন হলে ঝুলন্ত ইনডেন্টে লেখার নিচে
            xml += P(R(b.label + ' ' + b.text, { b: true }), '<w:ind w:left="' + hang + '" w:hanging="' + hang + '"/><w:jc w:val="both"/>');
            break;
          }
          case 'para':
            xml += P(R(b.text), '<w:jc w:val="both"/>', keepLast);
            break;
          case 'numbered':
            b.items.forEach((it, i) => {
              xml += P(R(it.num + it.sep) + '<w:r><w:tab/></w:r>' + R(it.text), '<w:ind w:left="360" w:hanging="360"/><w:jc w:val="both"/><w:tabs><w:tab w:val="left" w:pos="360"/></w:tabs>', keepLast && i === b.items.length - 1);
            });
            break;
          case 'kv': {
            const tab = this._kvTab(b.rows, sz);
            const ind = tab + 160;
            b.rows.forEach((r, i) => {
              const last = i === b.rows.length - 1 && !r.more.length;
              xml += P(R(r.num + '। ' + r.label) + '<w:r><w:tab/></w:r>' + R(': ' + r.value), '<w:ind w:left="' + ind + '" w:hanging="' + ind + '"/><w:tabs><w:tab w:val="left" w:pos="' + tab + '"/></w:tabs>', keepLast && last);
              r.more.forEach((mo, k) => { xml += P(R(mo), '<w:ind w:left="' + ind + '"/>', keepLast && i === b.rows.length - 1 && k === r.more.length - 1); });
            });
            break;
          }
          case 'heading':
            xml += P(R(b.text, { b: true }), '<w:jc w:val="center"/>', true);
            break;
          case 'caption':
            xml += P(R(b.text), '<w:jc w:val="center"/>', true);
            break;
          case 'table':
            xml += this._docxTable(b, h, g);
            break;
          case 'closing':
            xml += P(R(b.label, { b: true }), '', true) + P('', '', true) + P('', '', true);
            for (const l of b.lines) xml += P(R(l));
            break;
          case 'attach': {
            const pos = Math.round(g.textW * 0.73);
            xml += P(R(b.label, { b: true }), '', true);
            for (const it of b.items) {
              xml += it.count
                ? P(R(it.text) + '<w:r><w:tab/></w:r>' + R(it.count), '<w:tabs><w:tab w:val="left" w:leader="dot" w:pos="' + pos + '"/></w:tabs>')
                : P(R(it.text));
            }
            if (b.total) xml += P('<w:r><w:tab/></w:r>' + R(b.total), '<w:tabs><w:tab w:val="left" w:pos="' + Math.max(0, pos - 900) + '"/></w:tabs>');
            break;
          }
          case 'list':
            xml += P(R(b.label, { b: true }), '', true);
            for (const it of b.items) xml += P(R(it));
            break;
          default:
            break;
        }
      }
      return xml;
    },

    _docxTable(b, h, g) {
      const sz = g.tableSz;
      const widths = this._tableWidths(b.rows, sz, g.textW, b.header);
      const line = (k) => '<w:' + k + ' w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
      const border = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(line).join('');
      let x = '<w:tbl><w:tblPr><w:tblW w:w="' + widths.reduce((a, c) => a + c, 0) + '" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>' + border + '</w:tblBorders><w:tblLayout w:type="fixed"/>' +
        '<w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' +
        widths.map((w) => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>';
      b.rows.forEach((row, ri) => {
        const keep = ri < b.rows.length - 1 ? '<w:keepNext/>' : '';   // টেবিল এক পাতায় একসাথে
        x += '<w:tr><w:trPr><w:cantSplit/></w:trPr>';
        for (let ci = 0; ci < widths.length; ci++) {
          const parts = String(row[ci] == null ? '' : row[ci]).split(/<br\s*\/?>/i).map((p) => p.trim());
          x += '<w:tc><w:tcPr><w:tcW w:w="' + widths[ci] + '" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>';
          for (const p of parts) {
            x += '<w:p><w:pPr>' + keep + '<w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>' +
              (p ? h.runs(p, { sz, b: ri === 0 && b.header }) : '') + '</w:p>';
          }
          x += '</w:tc>';
        }
        x += '</w:tr>';
      });
      return x + '</w:tbl>';
    },

    docxSectPr(g) {
      const G = g || this.geometry(null);
      return '<w:sectPr><w:pgSz w:w="' + G.pageW + '" w:h="' + G.pageH + '"/>' +
        '<w:pgMar w:top="' + G.top + '" w:right="' + G.right + '" w:bottom="' + G.bottom + '" w:left="' + G.left + '" w:header="720" w:footer="720" w:gutter="0"/>' +
        '<w:cols w:num="1"/></w:sectPr>';
    },

    // ------------------------------------------------------------------ Word 2003 (RTF)
    /** @param h { rtf(text) → ফরম্যাট-করা RTF রান (ExportDualEngine.formatRtfText), fontName, isBijoy } */
    renderRtf(model, h) {
      const g = (h && h.geometry) || this.geometry(model, { isBijoy: h && h.isBijoy });
      const base = '\\pard\\plain\\f0\\fs' + g.sz + '\\sl' + g.line + '\\slmult1\\sb0\\sa0';
      const P = (body, pfx, keep) => '{' + base + (keep ? '\\keepn' : '') + (pfx || '\\ql') + ' ' + (body || '') + '\\par}\n';
      const T = (t, st) => {
        const s = h.rtf(t);
        return st && st.b ? '{\\b ' + s + '}' : s;
      };
      const blank = P('');
      // h.bodyOnly: শুধু অনুচ্ছেদগুলো (প্যাড/প্রত্যয়ন-লেআউট নিজের ডকুমেন্টের ভেতরে বসায় — letter-layout.js)
      let rtf = h.bodyOnly ? '' : '{\\rtf1\\ansi\\deff0\n{\\fonttbl\n{\\f0\\fnil\\fcharset0 ' + (h.fontName || 'Kalpurush') + ';}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n{\\colortbl;\\red0\\green0\\blue0;}\n' +
        '\\paperw' + g.pageW + '\\paperh' + g.pageH + '\\margl' + g.left + '\\margr' + g.right + '\\margt' + g.top + '\\margb' + g.bottom + '\\cols1\n';
      let prev = null;
      const blocks = model.blocks;
      for (let bi = 0; bi < blocks.length; bi++) {
        const b = blocks[bi];
        const keepLast = !!(blocks[bi + 1] && blocks[bi + 1].kind === 'table');
        if (this._gapBefore(prev, b)) rtf += blank;
        prev = b;
        switch (b.kind) {
          case 'line': rtf += P(T(b.text, { b: b.role === 'salutation' }), '\\ql', keepLast); break;
          case 'memoDate': rtf += P(T(b.left) + '\\tab ' + T(b.right), '\\ql\\tqr\\tx' + g.textW); break;
          case 'lines':
            rtf += P(T(b.label, { b: true }));
            b.lines.forEach((l, i) => { rtf += P(T(l), '\\ql', keepLast && i === b.lines.length - 1); });
            break;
          case 'subject': {
            const hang = this._subjectHang(b, g);
            rtf += P(T(b.label + ' ' + b.text, { b: true }), '\\qj\\li' + hang + '\\fi-' + hang);
            break;
          }
          case 'para': rtf += P(T(b.text), '\\qj', keepLast); break;
          case 'numbered':
            b.items.forEach((it, i) => { rtf += P(T(it.num + it.sep) + '\\tab ' + T(it.text), '\\qj\\li360\\fi-360\\tx360', keepLast && i === b.items.length - 1); });
            break;
          case 'kv': {
            const tab = this._kvTab(b.rows, g.sz);
            const ind = tab + 160;
            b.rows.forEach((r, i) => {
              const last = i === b.rows.length - 1 && !r.more.length;
              rtf += P(T(r.num + '। ' + r.label) + '\\tab ' + T(': ' + r.value), '\\ql\\li' + ind + '\\fi-' + ind + '\\tx' + tab, keepLast && last);
              r.more.forEach((mo, k) => { rtf += P(T(mo), '\\ql\\li' + ind, keepLast && i === b.rows.length - 1 && k === r.more.length - 1); });
            });
            break;
          }
          case 'heading': rtf += P(T(b.text, { b: true }), '\\qc', true); break;
          case 'caption': rtf += P(T(b.text), '\\qc', true); break;
          case 'table': rtf += this._rtfTable(b, h, g); break;
          case 'closing':
            rtf += P(T(b.label, { b: true }), '\\ql', true) + P('', '\\ql', true) + P('', '\\ql', true);
            for (const l of b.lines) rtf += P(T(l));
            break;
          case 'attach': {
            const pos = Math.round(g.textW * 0.73);
            rtf += P(T(b.label, { b: true }), '\\ql', true);
            for (const it of b.items) rtf += it.count ? P(T(it.text) + '\\tab ' + T(it.count), '\\ql\\tldot\\tx' + pos) : P(T(it.text));
            if (b.total) rtf += P('\\tab ' + T(b.total), '\\ql\\tx' + Math.max(0, pos - 900));
            break;
          }
          case 'list':
            rtf += P(T(b.label, { b: true }), '\\ql', true);
            for (const it of b.items) rtf += P(T(it));
            break;
          default: break;
        }
      }
      return h.bodyOnly ? rtf : rtf + '}\n';
    },

    _rtfTable(b, h, g) {
      const widths = this._tableWidths(b.rows, g.tableSz, g.textW, b.header);
      const total = widths.reduce((a, c) => a + c, 0);
      const left = Math.max(0, Math.round((g.textW - total) / 2));
      const brd = '\\clvertalc\\clbrdrt\\brdrs\\brdrw10\\clbrdrl\\brdrs\\brdrw10\\clbrdrb\\brdrs\\brdrw10\\clbrdrr\\brdrs\\brdrw10';
      let out = '';
      b.rows.forEach((row, ri) => {
        const keep = ri < b.rows.length - 1 ? '\\keepn' : '';
        let defs = '\\trowd\\trgaph80\\trleft' + left + '\\trkeep';
        let x = left;
        for (const w of widths) { x += w; defs += brd + '\\cellx' + x; }
        let cells = '';
        for (let ci = 0; ci < widths.length; ci++) {
          const parts = String(row[ci] == null ? '' : row[ci]).split(/<br\s*\/?>/i).map((p) => p.trim());
          const body = parts.map((p) => (p ? h.rtf(p) : '')).join('\\line ');
          cells += '\\pard\\plain\\intbl' + keep + '\\qc\\f0\\fs' + g.tableSz + '\\sl240\\slmult1 ' + (ri === 0 && b.header ? '{\\b ' + body + '}' : body) + '\\cell ';
        }
        out += '{' + defs + '\n' + cells + '\\row}\n';
      });
      return out + '\\pard\\plain\n';
    },

    // ------------------------------------------------------------------ HTML প্রিভিউ
    /** @param h { esc(text) → HTML-নিরাপদ লেখা } ; options.font === 'bijoy' হলে সুতন্নী-ক্লাস ও বিজয়-মাপ */
    renderHtml(model, options, h) {
      const o = options || {};
      const isBijoy = o.font === 'bijoy' || o.font === 'sutonnymj';
      const g = o.geometry || this.geometry(model, { isBijoy });
      const esc = (h && h.esc) || ((s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      const inch = (tw) => (tw / 1440).toFixed(2) + 'in';
      const lh = (1.34 * g.line / 240).toFixed(2);        // বাংলা ফন্টের স্বাভাবিক লাইন (≈১.৩৪) × লাইন-দূরত্ব
      const p = (inner, style) => '<div style="min-height: ' + lh + 'em; line-height: ' + lh + ';' + (style || '') + '">' + (inner || '&nbsp;') + '</div>';
      const blank = p('');
      const B = (s) => '<b>' + esc(s) + '</b>';
      let html = '';
      let prev = null;
      for (const b of model.blocks) {
        if (this._gapBefore(prev, b)) html += blank;
        prev = b;
        switch (b.kind) {
          case 'line': html += p(b.role === 'salutation' ? B(b.text) : esc(b.text)); break;
          case 'memoDate': html += p('<span>' + esc(b.left) + '</span><span>' + esc(b.right) + '</span>', 'display: flex; justify-content: space-between;'); break;
          case 'lines': html += p(B(b.label)); for (const l of b.lines) html += p(esc(l)); break;
          case 'subject': {
            const hang = inch(this._subjectHang(b, g));
            html += p(B(b.label + ' ' + b.text), 'text-align: justify; padding-left: ' + hang + '; text-indent: -' + hang + ';');
            break;
          }
          case 'para': html += p(esc(b.text), 'text-align: justify;'); break;
          case 'numbered': for (const it of b.items) html += p('<span style="display: inline-block; width: 0.25in;">' + esc(it.num + it.sep) + '</span>' + esc(it.text), 'text-align: justify; padding-left: 0.25in; text-indent: -0.25in;'); break;
          case 'kv': {
            const tab = this._kvTab(b.rows, g.sz), ind = inch(tab + 160);
            for (const r of b.rows) {
              html += p('<span style="display: inline-block; width: ' + inch(tab) + ';">' + esc(r.num + '। ' + r.label) + '</span>' + esc(': ' + r.value), 'padding-left: ' + ind + '; text-indent: -' + ind + ';');
              for (const mo of r.more) html += p(esc(mo), 'padding-left: ' + ind + ';');
            }
            break;
          }
          case 'heading': html += p(B(b.text), 'text-align: center;'); break;
          case 'caption': html += p(esc(b.text), 'text-align: center;'); break;
          case 'table': {
            const widths = this._tableWidths(b.rows, g.tableSz, g.textW, b.header);
            html += '<table style="border-collapse: collapse; margin: 0 auto; table-layout: fixed; font-size: ' + (g.tableSz / 2) + 'pt;">';
            b.rows.forEach((row, ri) => {
              html += '<tr>';
              widths.forEach((w, ci) => {
                const c = String(row[ci] == null ? '' : row[ci]).split(/<br\s*\/?>/i).map((x) => esc(x.trim())).join('<br>');
                html += '<td style="border: 1px solid #000; padding: 0 4px; text-align: center; vertical-align: middle; width: ' + inch(w) + ';' + (ri === 0 && b.header ? ' font-weight: 700;' : '') + '">' + (c || '&nbsp;') + '</td>';
              });
              html += '</tr>';
            });
            html += '</table>';
            break;
          }
          case 'closing': html += p(B(b.label)) + blank + blank; for (const l of b.lines) html += p(esc(l)); break;
          case 'attach': {
            const pos = (0.73 * g.textW / 1440).toFixed(2) + 'in';
            html += p(B(b.label));
            for (const it of b.items) {
              html += it.count
                ? p('<span style="display: inline-flex; width: ' + pos + ';"><span>' + esc(it.text) + '</span><span style="flex: 1; border-bottom: 1px dotted #000; margin: 0 2px 0.3em;"></span></span>' + esc(it.count))
                : p(esc(it.text));
            }
            if (b.total) html += p(esc(b.total), 'padding-left: ' + ((0.73 * g.textW - 900) / 1440).toFixed(2) + 'in;');
            break;
          }
          case 'list': html += p(B(b.label)); for (const it of b.items) html += p(esc(it)); break;
          default: break;
        }
      }
      if (o.bodyOnly) return html;
      const fontClass = isBijoy ? 'font-sutonny' : 'font-kalpurush';
      const pad = inch(g.top) + ' ' + inch(g.right) + ' ' + inch(g.bottom) + ' ' + inch(g.left);
      return '<div class="paper-sheet size-a4-portrait official-application-layout ' + fontClass + '" ' + (o.editable ? 'contenteditable="true" spellcheck="false" ' : '') +
        'style="padding: ' + pad + '; font-size: ' + (g.sz / 2) + 'pt; box-sizing: border-box;">' + html + '</div>';
    }
  };

  global.FayzarApplicationLayout = FayzarApplicationLayout;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarApplicationLayout;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
