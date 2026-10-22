/**
 * Fayzar — হালকা ভূমিকা-চিহ্ন (Phase 1B-ii, fix 1.3)
 * ===================================================
 * Gemini-র প্রথম OCR ডাকেই (নতুন ডাক নেই) লাইনের শেষে ঐচ্ছিক HTML-মন্তব্য: <!--r:sig,sideR-->
 *   stamp        সিল/স্ট্যাম্পের লেখা
 *   sig          স্বাক্ষর/নাম/পদবির ব্লক
 *   note         মার্জিনের নোট (marginal_note)
 *   sideL/sideR  একই সারিতে পাশাপাশি দুই ব্লকের বাম/ডান (side_by_side)
 *   aL/aC/aR     সারিবদ্ধতা (শুধু স্পষ্ট দেখা গেলে)
 * পুরোনো পার্সার ছাড়া চলে: চিহ্ন না থাকলে extract() লেখা অপরিবর্তিত ফেরত দেয়।
 * চিহ্ন কেবল OFFICE_PAD / PROTTOYON / GOVT_APP-এ রাখা হয় (gate); বাকি সব ধরনে ai-ocr-engine মুছে দেয়।
 */
(function (global) {
  'use strict';

  const TAG_RX = /[ \t]*<!--\s*r:([A-Za-z,\s]+?)\s*-->[ \t]*/g;
  const KEEP_TYPES = /^(?:OFFICE_PAD|PROTTOYON|GOVT_APP)$/;

  function parseTags(s) {
    const r = {};
    for (const t of String(s).split(',').map((x) => x.trim()).filter(Boolean)) {
      if (t === 'sig') r.signature = true;
      else if (t === 'stamp') r.stamp = true;
      else if (t === 'note') r.note = true;
      else if (t === 'sideL') r.side = 'L';
      else if (t === 'sideR') r.side = 'R';
      else if (t === 'aL') r.align = 'left';
      else if (t === 'aC') r.align = 'center';
      else if (t === 'aR') r.align = 'right';
    }
    return r;
  }

  const FayzarRoleMarks = {
    TAG_RX,
    KEEP_TYPES,

    has(text) { return /<!--\s*r:[A-Za-z,\s]+?-->/.test(String(text || '')); },

    /** সব চিহ্ন মুছে দেয় (লাইন-সংখ্যা অপরিবর্তিত) */
    strip(text) {
      return String(text == null ? '' : text).replace(TAG_RX, '');
    },

    /**
     * @param keyFn লাইন → চাবি (লেআউটের নিজের cleanLine∘norm), না দিলে trim
     * @returns { text, marks: { [key]: {signature,stamp,note,side,align} }, count }
     */
    extract(text, keyFn) {
      const src = String(text == null ? '' : text);
      if (!this.has(src)) return { text: src, marks: {}, count: 0 };
      const key = typeof keyFn === 'function' ? keyFn : (l) => String(l).trim();
      const marks = {};
      let count = 0;
      const out = src.split('\n').map((line) => {
        let found = null;
        const clean = line.replace(TAG_RX, (m, tags) => { found = Object.assign(found || {}, parseTags(tags)); return ''; });
        if (found) {
          const k = key(clean);
          if (k) { marks[k] = Object.assign(marks[k] || {}, found); count++; }
        }
        return clean;
      });
      return { text: out.join('\n'), marks, count };
    },

    /** Phase 1B-iii: ব্যবহারকারীকে চিহ্ন-ছাড়া লেখা দেখাও; চিহ্ন-সহ কপি ভেতরে রাখো → { visible, tagged|null } */
    hide(text) {
      const s = String(text == null ? '' : text);
      return this.has(s) ? { visible: this.strip(s), tagged: s } : { visible: s, tagged: null };
    },

    /** এক্সপোর্টের আগে: লেখা অপরিবর্তিত থাকলে চিহ্ন-সহ কপি ফেরত; ব্যবহারকারী বদলালে (বা কপি নেই) লেখা যেমন আছে */
    reattach(current, hidden) {
      const cur = String(current == null ? '' : current);
      if (!hidden || !hidden.tagged || this.has(cur)) return cur;
      return cur === hidden.visible ? hidden.tagged : cur;
    },

    /** ai-ocr-engine: doc_type ফ্রন্টম্যাটার দেখে চিহ্ন রাখা বা মুছা */
    gate(text) {
      let s = String(text == null ? '' : text);
      if (!this.has(s)) return s;
      // চিত্র-ট্যাগ ([[FIG…]]) ও টেবিল-সারিতে চিহ্ন অর্থহীন — চিত্র-পার্সার লাইন-শেষ দেখে, তাই মুছে দেওয়া
      s = s.split('\n').map((l) => (/^\s*(?:\[\[|\|)/.test(l) ? l.replace(TAG_RX, '') : l)).join('\n');
      const m = s.match(/^\s*---[\s\S]*?\bdoc_type\s*:\s*["']?([A-Z_]+)/);
      return m && KEEP_TYPES.test(m[1]) ? s : this.strip(s);
    }
  };

  global.FayzarRoleMarks = FayzarRoleMarks;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarRoleMarks;
})(typeof globalThis !== 'undefined' ? globalThis : this);
