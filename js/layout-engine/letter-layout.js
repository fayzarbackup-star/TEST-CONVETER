/**
 * Fayzar — প্যাড/অফিস চিঠি (OFFICE_PAD) ও প্রত্যয়নপত্র (PROTTOYON) লেআউট — Part-19.0
 * =====================================================================================
 * দোকানের আসল নমুনা (Pad.doc, Pad Ap.doc, Prottyon.doc) থেকে মাপা নকশা:
 *  - পাতা   : A4 পোর্ট্রেট; মার্জিন চারদিকে ০.৫"; মূল লেখা আরও ০.২৫" ভেতরে (নমুনায় li≈১৮–২০pt)
 *  - প্যাড   : মাঝে — উপরের ছোট লাইন (গণপ্রজাতন্ত্রী… ১৫pt) → প্রতিষ্ঠানের নাম (বোল্ড ৩৬pt, এক লাইনে না ধরলে ছোট)
 *             → ঠিকানা (১৬pt) → স্থাপিত/কোড/মোবাইল (১৪pt) → নিচে পুরো প্রস্থের দাগ
 *  - চিঠি    : স্মারক/তারিখ → বরাবর → বিষয় → জনাব → মূল লেখা → [টেবিল] (এগুলো FayzarApplicationLayout-এর ব্লক)
 *             → ৩ লাইন ফাঁকা → স্বাক্ষর-ব্লক ডানে (মাঝে সাজানো; দুইজন হলে পাশাপাশি) → অনুলিপি
 *  - প্রত্যয়ন : প্যাড → তারিখ (ডানে) → "প্রত্যয়ন পত্র" (মাঝে, বোল্ড, আন্ডারলাইন, ২৫pt)
 *             → মূল লেখা ১৬pt, লাইন ১.৫, দুই-পাশে সমান → ৩ লাইন ফাঁকা → স্বাক্ষর-ব্লক ডানে (১৪pt)
 *
 * এক মডেল → তিন রেন্ডার (DOCX / Word 2003 RTF / HTML প্রিভিউ) — preview == download।
 * আবেদন-ধাঁচের ব্লক (বরাবর/বিষয়/টেবিল/অনুচ্ছেদ…) FayzarApplicationLayout-ই আঁকে — একই নিয়ম দুই জায়গায় লেখা হয় না।
 * ক্রম কখনো বদলানো হয় না।
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

  // ------------------------------------------------------------------ প্যাটার্ন
  const RX = {
    // প্যাড-শিরোনাম এখানেই শেষ (এর পর চিঠির অংশ)
    headStop: /^(?:স্মারক|সূত্র|স্বারক|রেফ|Ref|তারিখ|বরাবর|বিষয়|জনাব|মহোদয়|মাননীয়|এই\s*মর্মে|এতদ্বারা|প্রত্যয়ন\s*করা|\||নাম\s*[:ঃ])/i,
    // নামের উপরের ছোট লাইন: সরকার/বিসমিল্লাহ, অথবা "প্রধান শিক্ষকের কার্যালয়", "চেয়ারম্যান কার্যালয়"
    top: /^(?:গণপ্রজাতন্ত্রী\s*বাংলাদেশ\s*সরকার|বিসমিল্লাহ|৭৮৬|بسم|পরম\s*করুণাময়|আল্লাহ)|^.{2,30}(?:কার্যালয়|দপ্তর)\s*$/,
    meta: /(?:স্থাপিত|প্রতিষ্ঠা(?:কাল|র\s*সন|\s*সন)?\s*[:ঃ]|ইআইআইএন|EIIN|কোড|মোবাইল|মোবা\s*[:ঃ]|ফোন|ই-?মেইল|Email|E-mail|রেজি|নিবন্ধন|ওয়েব|Web)/i,
    // শিরোনাম: ছোট লাইন, সনদ/প্রত্যয়ন জাতীয় শব্দ, বাক্য নয়
    title: /(?:প্রত্যয়ন|প্রশংসা\s*পত্র|প্রশংসাপত্র|সনদ|ছাড়\s*পত্র|ছাড়পত্র|CERTIFICATE|TESTIMONIAL)/i,
    notTitle: /এই\s*মর্মে|করা\s*যাচ্ছে|[।?!]\s*$|[:ঃ]\s*\S/,
    memo: /^(?:স্মারক|সূত্র|স্বারক|রেফ)\s*(?:নং|নম্বর)?\s*[:ঃ\-–]?/,
    date: /^তারিখ\s*[:ঃ]?/,
    tableRow: /^\|.*\|$/,
    tableSep: /^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?$/,
    tail: /^(?:অনুলিপি|সংযুক্তি(?:সমূহ)?|সংলগ্নী|বিতরণ)/,
    copy: /^(?:অনুলিপি|বিতরণ)/,
    // স্বাক্ষর-ব্লকের শুরু: বন্ধনীতে নাম, "স্বাক্ষর", বা পদবি
    sigName: /^\(\s*[^()]{2,60}\)\s*$/,
    sigWord: /^(?:স্বাক্ষর|স্বা\s*[:ঃ\/]|সীল|সিল|Seal\b|Signature\b)/i,
    sigTitle: /^(?:প্রধান\s*শিক্ষক|সহকারী\s*প্রধান\s*শিক্ষক|ভারপ্রাপ্ত\s*প্রধান|অধ্যক্ষ|উপাধ্যক্ষ|সুপার(?:িনটেনডেন্ট)?|সভাপতি|সহ-?সভাপতি|সাধারণ\s*সম্পাদক|সম্পাদক|চেয়ারম্যান|আহ্বায়ক|যুগ্ম\s*আহ্বায়ক|সদস্য\s*সচিব|সচিব|ইউপি\s*সদস্য|মেম্বার|কাউন্সিলর|মেয়র|ইমাম|খতিব|মুহতামিম|পরিচালক|ব্যবস্থাপক|ম্যানেজার|প্রোপ্রাইটর|স্বত্বাধিকারী|কর্মকর্তা|উপজেলা\s*নির্বাহী|নির্বাহী|প্রভাষক|অফিস\s*সহকারী|Chairman\b|Registrar\b|Head\s*Master\b|Headmaster\b|Principal\b|Secretary\b|President\b)/i,
    sigLabel: /^(?:বিনীত\s*)?(?:নিবেদক|নিবেদিকা|আপনার\s*বিশ্বস্ত|ধন্যবাদান্তে|শুভেচ্ছান্তে)\s*[,:ঃ\-–]?\s*$/,
    // এর পরেই কেবল স্বাক্ষর খোঁজা — "বরাবর,\nপ্রধান শিক্ষক" স্বাক্ষর নয়
    bodyMark: /^(?:বরাবর|বিষয়|জনাব|মহোদয়|অতএব|বিনীত\s*নিবেদন|এই\s*মর্মে|এতদ্বারা)/,
    sentenceEnd: /[।?!:ঃ;]\s*$/,
    field: /^[^:ঃ।]{1,28}[:ঃ]\s*\S/
  };
  for (const k of Object.keys(RX)) RX[k] = new RegExp(norm(RX[k].source), RX[k].flags);

  // আবেদন-মডিউল যে ব্লকগুলো আঁকে
  const AL_KINDS = /^(?:line|memoDate|lines|subject|para|numbered|kv|heading|caption|table|closing|attach|list)$/;

  const STEPS = {
    pad: [
      { sz: 28, line: 276 },     // ১৪pt · ১.১৫ (নমুনা Pad.doc)
      { sz: 26, line: 264 },     // ১৩pt (নমুনা Pad Ap.doc)
      { sz: 24, line: 252 },
      { sz: 22, line: 240 }      // কালপুরুষে লম্বা চিঠি (Word-এ মাপা: ধাপ ২-এ ৮২৭pt > ৭৭০pt)
    ],
    prottoyon: [
      { sz: 32, line: 360 },     // ১৬pt · ১.৫ (নমুনা Prottyon.doc)
      { sz: 30, line: 336 },
      { sz: 28, line: 300 },
      { sz: 26, line: 276 }      // কালপুরুষে লম্বা প্রত্যয়ন (Word-এ মাপা: ধাপ ২-এ ৮৩৪pt)
    ]
  };
  const PAGE = { pageW: 11906, pageH: 16838, top: 720, bottom: 720, left: 1080, right: 720, headOut: 360 };
  const HEAD_SZ = { top: 30, org: 72, addr: 32, meta: 28 };   // অর্ধ-পয়েন্ট (নমুনা: ১৫ / ৩৪–৩৭ / ১৬–১৭ / ১৪–১৫pt)

  const FayzarLetterLayout = {
    RX,
    STEPS,

    /**
     * উৎস-লেখা → { kind: 'LETTER_LAYOUT', variant, blocks }
     * @param variant 'pad' (OFFICE_PAD) | 'prottoyon' (PROTTOYON)
     */
    parse(rawText, variant) {
      const v = variant === 'prottoyon' ? 'prottoyon' : 'pad';
      const src = norm(rawText).replace(/^\s*---[\s\S]*?---\s*/, '').split('\n');
      const items = [];
      for (const raw of src) {
        const t = cleanLine(raw);
        if (t) items.push({ t, h: /^\s*#{1,6}\s/.test(raw) });
      }
      const blocks = [];

      // ---- ১. প্যাড-শিরোনাম ----
      const head = this._takeLetterhead(items);
      if (head.lines.length) blocks.push({ kind: 'letterhead', lines: head.lines });
      let rest = items.slice(head.used).map((x) => x.t);

      // ---- ২. শেষের অনুলিপি/সংযুক্তি ----
      let tailAt = rest.findIndex((t, i) => i > 0 && RX.tail.test(t));
      const tail = tailAt >= 0 ? rest.slice(tailAt) : [];
      if (tailAt >= 0) rest = rest.slice(0, tailAt);

      // ---- ৩. স্বাক্ষর-ব্লক (শেষ থেকে) ----
      const sig = this._takeSignature(rest);
      const body = sig ? rest.slice(0, sig.at) : rest;

      // ---- ৪. মূল অংশ ----
      const AL = getAL();
      let bodyBlocks = null;
      if (v === 'pad' && AL) {
        const m = AL.parse(body.join('\n'));
        const letterish = m.blocks.some((b) => b.kind === 'subject' || b.kind === 'line' && b.role === 'salutation' || b.kind === 'lines' && b.role === 'receiver');
        if (letterish) bodyBlocks = m.blocks;
      }
      if (!bodyBlocks) bodyBlocks = this._parseFree(body);
      blocks.push(...bodyBlocks);
      if (sig) blocks.push({ kind: 'signature', groups: sig.groups });
      blocks.push(...this._parseTail(tail));
      return { kind: 'LETTER_LAYOUT', version: 1, variant: v, blocks };
    },

    /**
     * উপরের ≤৮টি ছোট লাইন, প্রথম চিঠি-চিহ্নের আগ পর্যন্ত। প্রতিষ্ঠানের নাম = "#" শিরোনাম-লাইন (Gemini-র নিয়ম),
     * না থাকলে প্রথম "top"-নয় এমন লাইন; নামের আগের লাইনগুলো ছোট (top), পরেরগুলো ঠিকানা/তথ্য।
     */
    _takeLetterhead(items) {
      const cand = [];
      for (let i = 0; i < items.length && i < 8; i++) {
        const { t } = items[i];
        if (RX.headStop.test(t) || RX.tableRow.test(t) || t.length > 90) break;
        if (RX.title.test(t) && !RX.notTitle.test(t) && t.length <= 40 && cand.length) break;
        if (RX.sentenceEnd.test(t) && t.length > 60) break;
        cand.push(items[i]);
      }
      let org = cand.findIndex((x) => x.h && !RX.top.test(x.t));
      if (org < 0) org = cand.findIndex((x) => !RX.top.test(x.t));
      if (org < 0) return { lines: [], used: 0 };
      const lines = cand.map((x, i) => ({ text: x.t, role: i < org ? 'top' : i === org ? 'org' : (RX.meta.test(x.t) ? 'meta' : 'addr') }));
      return { lines, used: cand.length };
    },

    /** শেষের ছোট লাইনগুলোর মধ্যে নাম/পদবি থেকে স্বাক্ষর-ব্লক; দুই-তিনজন হলে আলাদা দল */
    _takeSignature(lines) {
      const n = lines.length;
      if (!n) return null;
      // (ক) মার্কডাউন টেবিল-আকারে পাশাপাশি স্বাক্ষর
      if (RX.tableRow.test(lines[n - 1])) {
        let k = n;
        while (k > 0 && RX.tableRow.test(lines[k - 1])) k--;
        const rows = lines.slice(k, n).filter((r) => !RX.tableSep.test(r)).map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
        const cells = [].concat(...rows);
        const sigLike = cells.some((c) => c.split(/<br\s*\/?>/i).some((p) => RX.sigName.test(p.trim()) || RX.sigTitle.test(p.trim())));
        if (sigLike && rows.length <= 6) {
          const nc = Math.max(...rows.map((r) => r.length));
          const groups = [];
          for (let c = 0; c < nc; c++) {
            const g = [];
            for (const r of rows) for (const p of String(r[c] || '').split(/<br\s*\/?>/i)) if (p.trim()) g.push(p.trim());
            if (g.length) groups.push(g);
          }
          if (groups.length) return { at: k, groups };
        }
        return null;
      }
      // (খ) ধারাবাহিক লাইন: শেষের ছোট লাইনের সারি
      let floor = 0;
      lines.forEach((t, i) => { if (RX.bodyMark.test(t)) floor = i + 1; });
      let k = n;
      while (k > floor && lines[k - 1].length <= 70 && !RX.tableRow.test(lines[k - 1]) && n - k < 14) k--;
      let s = -1;
      for (let j = k; j < n; j++) {
        const t = lines[j];
        if (RX.sigName.test(t) || RX.sigWord.test(t)) { s = j; break; }
        if (RX.sigTitle.test(t)) {
          // পদবির আগের লাইনে বন্ধনী-ছাড়া নাম থাকতে পারে ("মোঃ হায়দার গনি")
          s = (j - 1 >= k && !RX.sentenceEnd.test(lines[j - 1]) && !RX.date.test(lines[j - 1]) && !RX.sigLabel.test(lines[j - 1]) && lines[j - 1].length <= 40) ? j - 1 : j;
          break;
        }
      }
      if (s < 0) return null;
      let at = s;
      if (at - 1 >= 0 && RX.sigLabel.test(lines[at - 1])) at--;     // "বিনীত নিবেদক," স্বাক্ষরের মাথায়
      const groups = [];
      let cur = [];
      for (let j = at; j < n; j++) {
        if (cur.length && RX.sigName.test(lines[j]) && cur.some((x) => RX.sigName.test(x)) && groups.length < 2) { groups.push(cur); cur = []; }
        cur.push(lines[j]);
      }
      if (cur.length) groups.push(cur);
      return { at, groups };
    },

    /** বরাবর/বিষয়-ছাড়া লেখা (প্রত্যয়ন, প্যাডে সাধারণ চিঠি): তারিখ, শিরোনাম, অনুচ্ছেদ, তথ্য-সারি, টেবিল */
    _parseFree(lines) {
      const blocks = [];
      let cur = null;
      const push = (b) => { blocks.push(b); cur = b; return b; };
      const seenText = () => blocks.some((b) => b.kind === 'para' || b.kind === 'fields' || b.kind === 'title');
      for (let i = 0; i < lines.length; i++) {
        const t = lines[i];
        if (RX.tableRow.test(t)) {
          if (RX.tableSep.test(t)) continue;
          const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
          if (cur && cur.kind === 'table') cur.rows.push(cells);
          else push({ kind: 'table', rows: [cells], header: !!(lines[i + 1] && RX.tableSep.test(lines[i + 1])) });
          continue;
        }
        if (RX.memo.test(t) && /তারিখ\s*[:ঃ]?/.test(t.slice(4))) {
          const k = t.search(/তারিখ\s*[:ঃ]?/);
          push({ kind: 'memoDate', left: t.slice(0, k).trim(), right: t.slice(k).trim() }); continue;
        }
        if (RX.date.test(t)) { push(seenText() ? { kind: 'line', role: 'date', text: t } : { kind: 'date', text: t }); continue; }
        if (RX.memo.test(t)) { push({ kind: 'line', role: 'memo', text: t }); continue; }
        if (RX.title.test(t) && !RX.notTitle.test(t) && t.length <= 40 && !blocks.some((b) => b.kind === 'title' || b.kind === 'para')) {
          push({ kind: 'title', text: t }); continue;
        }
        // "নাম: …" জাতীয় ছোট সারি — পরপর ২+টি হলে ফাঁকা লাইন ছাড়া একসাথে
        const nextField = lines[i + 1] && RX.field.test(lines[i + 1]) && lines[i + 1].length <= 70;
        if (RX.field.test(t) && t.length <= 70 && (cur && cur.kind === 'fields' || nextField)) {
          if (cur && cur.kind === 'fields') cur.lines.push(t); else push({ kind: 'fields', lines: [t] });
          continue;
        }
        if (cur && cur.kind === 'para' && !RX.sentenceEnd.test(cur.text)) { cur.text += ' ' + t; continue; }
        push({ kind: 'para', role: 'body', text: t });
      }
      return blocks;
    },

    /** অনুলিপি/সংযুক্তি → আবেদন-মডিউলের 'list' / 'attach' ব্লক */
    _parseTail(lines) {
      const out = [];
      let cur = null;
      for (const t of lines) {
        if (RX.tail.test(t)) {
          const m = t.match(/^[^:ঃ\-–]+[:ঃ\-–]+\s*(.+)$/);
          if (RX.copy.test(t)) cur = { kind: 'list', role: 'copy', label: m ? t.slice(0, t.length - m[1].length).trim() : t, items: m ? [m[1]] : [] };
          else cur = { kind: 'attach', label: m ? t.slice(0, t.length - m[1].length).trim() : t, items: m ? [{ text: m[1], count: '' }] : [], total: '' };
          out.push(cur);
          continue;
        }
        if (!cur) continue;
        if (cur.kind === 'list') cur.items.push(t);
        else {
          const lm = t.match(/^(.*?\S)\s*(?:\.{3,}|…{2,}|_{3,}|\t+)\s*([^.…]*\S)\s*$/);
          if (/^(?:সর্বমোট|মোট)\s*[:=ঃ\-]/.test(t)) cur.total = t;
          else cur.items.push(lm ? { text: lm[1], count: lm[2] } : { text: t, count: '' });
        }
      }
      return out;
    },

    // ------------------------------------------------------------------ মাপ
    geometry(model, opts) {
      const o = opts || {};
      const v = model && model.variant === 'prottoyon' ? 'prottoyon' : 'pad';
      const steps = STEPS[v];
      const mk = (s, i) => {
        const g = Object.assign({}, PAGE, s, { variant: v, fitStep: i });
        g.textW = g.pageW - g.left - g.right;
        g.usableH = g.pageH - g.top - g.bottom;
        g.tableSz = Math.max(22, g.sz - (v === 'prottoyon' ? 6 : 2));
        g.sigSz = v === 'prottoyon' ? 28 : g.sz;
        return g;
      };
      if (Number.isInteger(o.step) && steps[o.step]) return mk(steps[o.step], o.step);
      const base = mk(steps[0], 0);
      if (o.noFit || !model || !model.blocks) return base;
      for (let i = 0; i < steps.length; i++) {
        const g = mk(steps[i], i);
        if (this.estimateHeight(model, g, o.isBijoy) <= g.usableH) return g;
      }
      return base;                          // সত্যিকারের লম্বা চিঠি — সাধারণ মাপেই একাধিক পাতা
    },

    /** প্রতিষ্ঠানের নাম এক লাইনে ধরানো: ৩৬pt থেকে ধাপে ধাপে কমিয়ে (সর্বনিম্ন ২২pt) */
    _headSz(line, g) {
      let sz = HEAD_SZ[line.role] || HEAD_SZ.addr;
      const W = g.textW + g.headOut;
      const k = line.role === 'org' ? 1.06 : 1;
      while (sz > 44 && measure(line.text, sz) * k > W * 0.96) sz -= 4;
      while (line.role !== 'org' && sz > 24 && measure(line.text, sz) > W * 0.98) sz -= 2;
      return sz;
    },

    _sigWidths(groups, sz) {
      return groups.map((gr) => gr.reduce((a, l) => Math.max(a, measure(l, sz)), 0));
    },
    _sigIndent(groups, g) {
      const widest = Math.max(0, ...this._sigWidths(groups, g.sigSz));
      const w = Math.min(g.textW, Math.max(3600, widest + 360));
      return Math.max(0, g.textW - w);
    },

    /** ব্লকের আগে কয়টি ফাঁকা লাইন */
    _gap(prev, b) {
      if (!prev) return 0;
      if (b.kind === 'signature') return 3;
      if (prev.kind === 'signature') return 2;
      if (b.kind === 'title') return prev.kind === 'letterhead' ? 3 : 2;
      if (prev.kind === 'letterhead') return 1;
      if (AL_KINDS.test(prev.kind) && AL_KINDS.test(b.kind)) { const AL = getAL(); return AL && !AL._gapBefore(prev, b) ? 0 : 1; }
      return 1;
    },

    estimateHeight(model, g, isBijoy) {
      const AL = getAL();
      const ff = isBijoy ? 1.02 : 1.24;
      const corr = isBijoy ? 1.08 : 1.24;
      const lineH = (sz, line) => (sz / 2) * 20 * (line / 240) * ff;
      const L = (t, w, sz) => Math.max(1, Math.ceil(measure(String(t || ''), sz) / Math.max(1500, w)));
      const one = lineH(g.sz, g.line);
      let h = 0;
      let prev = null;
      for (const b of model.blocks) {
        h += this._gap(prev, b) * one * corr;
        prev = b;
        if (AL_KINDS.test(b.kind)) { if (AL) h += AL.estimateHeight({ blocks: [b] }, g, isBijoy); continue; }
        let x = 0;
        switch (b.kind) {
          case 'letterhead': for (const l of b.lines) x += lineH(this._headSz(l, g), 240); x += 120; break;
          case 'title': x += lineH(50, 240); break;
          case 'date': x += one; break;
          case 'fields': for (const l of b.lines) x += L(l, g.textW, g.sz) * one; break;
          case 'signature': x += Math.max(...b.groups.map((gr) => gr.length)) * lineH(g.sigSz, 240); break;
          default: break;
        }
        h += x * corr;
      }
      return Math.round(h);
    },

    // ------------------------------------------------------------------ DOCX
    /** @param h { runs(text, style) → <w:r>…</w:r>, isBijoy, geometry } */
    renderDocx(model, h) {
      const AL = getAL();
      const g = (h && h.geometry) || this.geometry(model, { isBijoy: h && h.isBijoy });
      const sp = (line) => '<w:spacing w:before="0" w:after="0" w:line="' + (line || g.line) + '" w:lineRule="auto"/>';
      // pPr-এর ক্রম (স্কিমা): keepNext/pBdr → spacing → ind → jc → rPr; pPr = [আগে, পরে] অথবা শুধু "পরে"
      const P = (inner, pPr, line) => {
        const [pre, post] = Array.isArray(pPr) ? pPr : ['', pPr || ''];
        return '<w:p><w:pPr>' + pre + sp(line) + post + '</w:pPr>' + (inner || '') + '</w:p>';
      };
      const R = (t, st) => h.runs(t, Object.assign({ sz: g.sz }, st || {}));
      const blank = P('', '<w:rPr><w:sz w:val="' + g.sz + '"/><w:szCs w:val="' + g.sz + '"/></w:rPr>');
      let xml = '';
      let prev = null;
      for (const b of model.blocks) {
        xml += blank.repeat(this._gap(prev, b));
        prev = b;
        if (AL_KINDS.test(b.kind)) { if (AL) xml += AL.renderDocx({ blocks: [b] }, { runs: h.runs, isBijoy: h.isBijoy, geometry: g }); continue; }
        switch (b.kind) {
          case 'letterhead':
            b.lines.forEach((l, i) => {
              const sz = this._headSz(l, g);
              const last = i === b.lines.length - 1;
              xml += P(R(l.text, { sz, b: l.role === 'org' }), [last ? '<w:pBdr><w:bottom w:val="single" w:sz="18" w:space="4" w:color="000000"/></w:pBdr>' : '',
                '<w:ind w:left="-' + g.headOut + '"/><w:jc w:val="center"/>'], 240);
            });
            break;
          case 'title':
            xml += P(R(b.text, { sz: 50, b: true, u: true }), '<w:jc w:val="center"/>', 240);
            break;
          case 'date':
            xml += P(R(b.text), '<w:jc w:val="right"/>');
            break;
          case 'fields':
            for (const l of b.lines) xml += P(R(l), '<w:jc w:val="left"/>');
            break;
          case 'signature':
            xml += this._docxSignature(b, h, g, P);
            break;
          default: break;
        }
      }
      return xml;
    },

    _docxSignature(b, h, g, P) {
      const R = (t) => h.runs(t, { sz: g.sigSz });
      if (b.groups.length === 1) {
        const ind = this._sigIndent(b.groups, g);
        return b.groups[0].map((l, i) => P(R(l), [i < b.groups[0].length - 1 ? '<w:keepNext/>' : '', '<w:ind w:left="' + ind + '"/><w:jc w:val="center"/>'], 240)).join('');
      }
      // দুই-তিনজন: সীমানাহীন টেবিলে পাশাপাশি (নমুনা Pad.doc)
      const n = b.groups.length;
      const w = Math.floor(g.textW / n);
      const none = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((k) => '<w:' + k + ' w:val="nil"/>').join('');
      let x = '<w:tbl><w:tblPr><w:tblW w:w="' + (w * n) + '" w:type="dxa"/><w:tblBorders>' + none + '</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>' +
        b.groups.map(() => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>';
      for (const gr of b.groups) {
        x += '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr>';
        for (const l of gr) x += '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>' + R(l) + '</w:p>';
        x += '</w:tc>';
      }
      return x + '</w:tr></w:tbl>';
    },

    docxSectPr(g) {
      const G = g || this.geometry(null);
      return '<w:sectPr><w:pgSz w:w="' + G.pageW + '" w:h="' + G.pageH + '"/>' +
        '<w:pgMar w:top="' + G.top + '" w:right="' + G.right + '" w:bottom="' + G.bottom + '" w:left="' + G.left + '" w:header="360" w:footer="360" w:gutter="0"/>' +
        '<w:cols w:num="1"/></w:sectPr>';
    },

    // ------------------------------------------------------------------ Word 2003 (RTF)
    /** @param h { rtf(text) → RTF রান (ExportDualEngine.formatRtfText), fontName, isBijoy, geometry } */
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
        rtf += blank.repeat(this._gap(prev, b));
        prev = b;
        if (AL_KINDS.test(b.kind)) { if (AL) rtf += AL.renderRtf({ blocks: [b] }, { rtf: h.rtf, fontName: h.fontName, isBijoy: h.isBijoy, geometry: g, bodyOnly: true }); continue; }
        switch (b.kind) {
          case 'letterhead':
            b.lines.forEach((l, i) => {
              const last = i === b.lines.length - 1;
              rtf += P(T(l.text, { b: l.role === 'org' }), '\\qc\\li-' + g.headOut + (last ? '\\brdrb\\brdrs\\brdrw30\\brsp80' : ''), this._headSz(l, g), 240);
            });
            break;
          case 'title': rtf += P(T(b.text, { b: true, u: true }), '\\qc', 50, 240); break;
          case 'date': rtf += P(T(b.text), '\\qr'); break;
          case 'fields': for (const l of b.lines) rtf += P(T(l), '\\ql'); break;
          case 'signature': rtf += this._rtfSignature(b, h, g, P, T); break;
          default: break;
        }
      }
      return rtf + '}\n';
    },

    _rtfSignature(b, h, g, P, T) {
      if (b.groups.length === 1) {
        const ind = this._sigIndent(b.groups, g);
        return b.groups[0].map((l, i) => P(T(l), (i < b.groups[0].length - 1 ? '\\keepn' : '') + '\\qc\\li' + ind, g.sigSz, 240)).join('');
      }
      const n = b.groups.length;
      const w = Math.floor(g.textW / n);
      let defs = '\\trowd\\trgaph80\\trleft0\\trkeep';
      for (let i = 1; i <= n; i++) defs += '\\cellx' + (w * i);
      let cells = '';
      for (const gr of b.groups) cells += '\\pard\\plain\\intbl\\qc\\f0\\fs' + g.sigSz + '\\sl240\\slmult1 ' + gr.map((l) => T(l)).join('\\line ') + '\\cell ';
      return '{' + defs + '\n' + cells + '\\row}\n\\pard\\plain\n';
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
      const pt = (sz) => 'font-size: ' + (sz / 2) + 'pt;';
      const blank = p('');
      let html = '';
      let prev = null;
      for (const b of model.blocks) {
        html += blank.repeat(this._gap(prev, b));
        prev = b;
        if (AL_KINDS.test(b.kind)) { if (AL) html += AL.renderHtml({ blocks: [b] }, { font: o.font, geometry: g, bodyOnly: true }, { esc }); continue; }
        switch (b.kind) {
          case 'letterhead':
            html += '<div style="margin-left: -' + inch(g.headOut) + '; text-align: center; line-height: 1.25; padding-bottom: 3px; border-bottom: 2px solid #000;">';
            for (const l of b.lines) html += '<div style="' + pt(this._headSz(l, g)) + (l.role === 'org' ? ' font-weight: 700;' : '') + '">' + esc(l.text) + '</div>';
            html += '</div>';
            break;
          case 'title': html += '<div style="text-align: center; font-weight: 700; text-decoration: underline; line-height: 1.3; ' + pt(50) + '">' + esc(b.text) + '</div>'; break;
          case 'date': html += p(esc(b.text), 'text-align: right;'); break;
          case 'fields': for (const l of b.lines) html += p(esc(l)); break;
          case 'signature': {
            const cell = (gr) => gr.map((l) => '<div>' + esc(l) + '</div>').join('');
            if (b.groups.length === 1) {
              html += '<div style="margin-left: ' + inch(this._sigIndent(b.groups, g)) + '; text-align: center; line-height: 1.34; ' + pt(g.sigSz) + '">' + cell(b.groups[0]) + '</div>';
            } else {
              html += '<div style="display: flex; text-align: center; line-height: 1.34; ' + pt(g.sigSz) + '">' + b.groups.map((gr) => '<div style="flex: 1;">' + cell(gr) + '</div>').join('') + '</div>';
            }
            break;
          }
          default: break;
        }
      }
      const fontClass = isBijoy ? 'font-sutonny' : 'font-kalpurush';
      const pad = inch(g.top) + ' ' + inch(g.right) + ' ' + inch(g.bottom) + ' ' + inch(g.left);
      return '<div class="paper-sheet size-a4-portrait official-letter-layout letter-' + g.variant + ' ' + fontClass + '" ' + (o.editable ? 'contenteditable="true" spellcheck="false" ' : '') +
        'style="padding: ' + pad + '; font-size: ' + (g.sz / 2) + 'pt; box-sizing: border-box;">' + html + '</div>';
    }
  };

  global.FayzarLetterLayout = FayzarLetterLayout;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarLetterLayout;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
