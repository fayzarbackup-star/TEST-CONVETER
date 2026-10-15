/**
 * Fayzar — সাধারণ-ফরম্যাটের (EXAM_GENERAL) স্তরযুক্ত প্রশ্নপত্র পার্সার (Part-18.7)
 * ====================================================================
 * প্রাথমিক/বৃত্তি ধাঁচের পত্র (ব্যবহারকারীর রিপোর্ট ২০২৬-১০-০৬, ৫ম শ্রেণি গণিত):
 *   ১। সঠিক উত্তরটি লেখো :            ১ x ১০ = ১০     ← মূল প্রশ্ন (নির্দেশনা + নম্বর)
 *   (১) …?                                            ← উপ-প্রশ্ন (নিজের লেবেল)
 *       ক. …   খ. …   / গ. …   ঘ. …                  ← ঐ উপ-প্রশ্নের বিকল্প
 *   ২। শূন্যস্থান পূরণ করো :            ১ x ১০ = ১০
 *   ক. … ...... ।  (ঙ) … ......।                      ← লেবেলযুক্ত উপ-প্রশ্ন (বিকল্প নয়)
 *   ৪। সমস্যা …                                       ← প্রশ্ন
 *   ক. …   ৪                                         ← নম্বরসহ উপ-প্রশ্ন
 * question-engine এক স্তর বোঝে বলে এগুলো জট পাকাত (৪০টি বিকল্প = ৪০টি উপ-প্রশ্ন)। এই মডিউল লেখা যেমন আছে
 * তেমন কাঠামো দেয়; নম্বর অপরিবর্তিত (section.keepNumbers)। রেন্ডারার আগের মতোই (cq-booklet-planner / export)।
 *
 * API: FayzarGeneralParser.isNested(body) → bool;  .parseSections(body) → sections[]
 */
(function (global) {
  'use strict';

  const D = '[০-৯\\d]';
  const TOP = new RegExp('^(' + D + '{1,2})\\s*[।.]\\s*(.*)$');          // ১। …   (মূল প্রশ্ন)
  const NUM_ITEM = new RegExp('^\\((' + D + '{1,2})\\)\\s*(.*)$');        // (১) …  (উপ-প্রশ্ন)
  const LET_ITEM = /^\(?([ক-হ])[.)।]\s*(.*)$/;                            // ক. … / (ঙ) … / (ট) … (ক–হ)
  const OPT_SPLIT = /(?:^|\t| {2,})\(?([কখগঘ])[.)]\s*/g;
  const MARK_END = new RegExp('(?:\\t|\\s{2,}|\\s)(\\[?' + D + '{1,2}\\]?)\\s*$');

  const clean = (l) => String(l || '').replace(/\s+$/, '');
  const stripHash = (l) => l.replace(/^\s*#{1,6}\s*/, '');

  /** একই লাইনে ≥২টি ক/খ/গ/ঘ বিকল্প? → [{label,text}] */
  function inlineOptions(line) {
    const s = line.replace(/^\s+/, '');
    const marks = [];
    let m;
    OPT_SPLIT.lastIndex = 0;
    while ((m = OPT_SPLIT.exec(s))) marks.push({ label: m[1], at: m.index, end: OPT_SPLIT.lastIndex });
    if (marks.length < 2 || marks[0].at !== 0) return null;
    return marks.map((mk, i) => ({ label: mk.label, text: s.slice(mk.end, i + 1 < marks.length ? marks[i + 1].at : s.length).trim() }));
  }

  function splitMark(text) {
    const m = String(text).match(MARK_END);
    if (m && m.index > 0 && String(text).slice(0, m.index).trim().length > 2) return { text: String(text).slice(0, m.index).trim(), mark: m[1].replace(/[\[\]]/g, '') };
    return { text: String(text).trim(), mark: '' };
  }

  const FayzarGeneralParser = {
    /** স্তরযুক্ত কি না: (১)-ধাঁচের উপ-প্রশ্ন, বা একই লাইনে একাধিক বিকল্পসহ উপ-প্রশ্ন, বা ক–ঞ ছাড়িয়ে (ঙ…) লেবেল */
    isNested(body) {
      const lines = String(body || '').split(/\r?\n/).map((l) => stripHash(l).trim());
      const numItems = lines.filter((l) => NUM_ITEM.test(l)).length;
      const highLetters = lines.filter((l) => /^\(?[ঙচছজঝঞটঠডঢণত][.)]\s/.test(l)).length;
      return numItems >= 2 || highLetters >= 2;
    },

    parseSections(body) {
      const lines = String(body || '').split(/\r?\n/).map(clean);
      const sections = [];
      let sec = null, q = null, item = null, started = false;
      const newSection = (title) => { sec = { title: title || '', questions: [], keepNumbers: true }; sections.push(sec); q = null; item = null; };
      const pushQ = (obj) => { if (!sec) newSection(''); sec.questions.push(obj); return obj; };
      const nextNonEmpty = (i) => { for (let j = i + 1; j < lines.length; j++) if (lines[j].trim()) return stripHash(lines[j]).trim(); return ''; };

      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (!raw.trim()) continue;
        const isHead = /^\s*#{1,6}\s/.test(raw);
        const l = stripHash(raw).trim();
        const top = l.match(TOP);

        if (isHead && !top) {                       // সংখ্যাহীন শিরোনাম → নতুন অংশ
          if (started || sections.length) newSection(l);
          continue;
        }
        if (top) {
          // "## ৪। সমস্যা…" যার পরের লাইনই "৪। …" → এটি অংশের শিরোনাম, প্রশ্ন নয়
          const nxt = nextNonEmpty(i).match(TOP);
          // (পাইপলাইন `##` মুছে দিলেও একই নিয়ম — শিরোনাম চেনা যায় পরের লাইনের একই নম্বর দেখে)
          if (nxt && nxt[1] === top[1]) { newSection(top[2]); started = true; continue; }
          started = true;
          let text = top[2];
          const sm = text.match(new RegExp('\\t(' + D + '{1,2})\\s*$'));            // "…?\t৮" → [৮] (রেন্ডারার ডানে বসায়)
          if (sm) text = text.slice(0, sm.index).trim() + ' [' + sm[1] + ']';
          q = pushQ({ num: top[1], text: text.replace(/\t+/g, ' \t').trim(), subQuestions: [], options: [] });
          item = null;
          continue;
        }
        if (!started) continue;                     // প্রথম প্রশ্নের আগের লাইন = হেডার (question-engine দেখে)

        const ni = l.match(NUM_ITEM);
        if (ni) {                                   // (১) … → নিজস্ব লেবেলসহ উপ-প্রশ্ন (রেন্ডারে আলাদা প্রশ্ন, নম্বরহীন)
          item = pushQ({ num: '', text: '(' + ni[1] + ') ' + ni[2].trim(), subQuestions: [], options: [] });
          continue;
        }
        const opts = inlineOptions(raw.replace(/^\s*#{1,6}\s*/, ''));
        if (opts && (item || q)) {                  // একই লাইনে ≥২ বিকল্প → বর্তমান উপ-প্রশ্নের বিকল্প
          (item || q).options.push(...opts);
          continue;
        }
        const li = l.match(LET_ITEM);
        if (li && (item || q)) {
          const target = item || q;
          const shortOpt = item && /^[কখগঘ]$/.test(li[1]) && li[2].length < 40 && !/\.{4,}|…{2,}/.test(li[2]);
          if (shortOpt) { target.options.push({ label: li[1], text: li[2].trim() }); continue; }
          const sm = splitMark(li[2]);
          (q || target).subQuestions.push({ label: li[1], text: sm.text, mark: sm.mark });
          item = null;
          continue;
        }
        // লেবেলহীন লাইন (চিত্র-ট্যাগ, ধারাবাহিক লেখা) → শেষ উপাদানের সাথে
        const cur = item || q;
        if (!cur) continue;
        const lastSub = !item && cur.subQuestions.length ? cur.subQuestions[cur.subQuestions.length - 1] : null;
        if (lastSub) lastSub.text += ' ' + l;
        else if (!item && !/^\[\[FIG/i.test(l)) {
          // Part-18.9: মূল প্রশ্নের নিচের লেবেলহীন লাইন (শব্দ-তালিকা/অনুচ্ছেদ) উৎসের মতো আলাদা লাইনে — প্রশ্নের সাথে
          // জোড়া নয় (দোকানের ৪র্থ শ্রেণির পত্র: "…অর্থ লিখ: ১×৫=৫" ডানে নম্বর, পরের লাইনে শব্দগুলো)
          cur.stimulus = (cur.stimulus ? cur.stimulus + '\n' : '') + l;
        } else cur.text += (/^\[\[FIG/i.test(l) ? '\n' : ' ') + l;
      }
      return sections.filter((s) => s.questions.length || s.title);
    }
  };

  global.FayzarGeneralParser = FayzarGeneralParser;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarGeneralParser;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
