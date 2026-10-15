/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Fayzar Studio — Edit Bridge (Part-13.1)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * সমস্যা যা এই মডিউল সমাধান করে:
 *   Studio-র প্রিভিউ `contenteditable` — ব্যবহারকারী সেখানে হাতে টেক্সট বদলাতে
 *   পারেন, কিন্তু ডাউনলোড-পাথ আবার `inputText` (মূল markdown) থেকে নতুন করে
 *   পার্স করে ফাইল বানাত ⇒ প্রিভিউতে করা **সব এডিট লোপ পেত**। (প্রমাণ: RTF-এ
 *   পুরোনো টেক্সটই থাকত।)
 *
 * সমাধান (রূপান্তর নয়, DP-সিঙ্ক):
 *   `parsedData`-ই এক্সপোর্ট-এঞ্জিনের সত্য — প্রিভিউও তার থেকেই আঁকা। তাই
 *   প্রিভিউ-DOM-কে `parsedData`-এর সঙ্গে মিলিয়ে শুধু **যেগুলো বদলেছে সেগুলো**
 *   (path → মান) সংগ্রহ করা হয়, তারপর parsedData-এর কপিতে বসানো হয়।
 *   এর ফলে:
 *     • প্রশ্নের গঠন/গণিত-সমীকরণ/EQ-ফিল্ড অটুট থাকে (পুনঃপার্স হয় না),
 *     • প্রিভিউ ১০০% যা দেখায়, এক্সপোর্ট ঠিক তা-ই ছাপে (WYSIWYG সমতা),
 *     • কেউ টাচ না করলে শূন্য এডিট ⇒ ব্যাবধান শূন্য সাইড-ইফেক্ট।
 *
 * পার্স-ডেটার গঠন (question-engine):
 *   CQ : {num, text, preContext, stimulus, subQuestions:[{label,text,mark}], …}
 *   MCQ: {num, text, options:[{label,text}], subQuestions:[…], statements:[…]}
 *
 * নির্ভরযোগ্যতা: প্রতিটি ক্ষেত্রের তুলনা হয় টেক্সট-নরমালাইজ করে — তাই যেখানে
 * ব্যবহারকারী সত্যিই কিছু বদলেছেন শুধু সেখানেই এডিট রেকর্ড হয় (বাকি সব
 * অটুট — বিশেষত .eq-rendered গণিত-নোড)।
 * ═══════════════════════════════════════════════════════════════════════════
 */
(function (global) {
  'use strict';

  const BN_DIGITS = '\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef';

  /** বাংলা ডিজিট → ইংরেজি */
  function bnToEn(s) {
    return String(s == null ? '' : s).replace(/[\u09e6-\u09ef]/g, (d) => String(BN_DIGITS.indexOf(d)));
  }

  /** প্রশ্ন-নম্বর তুলনার চাবি: '১।' / '1.' / ' ১ ' → '1' */
  function normNum(v) {
    return bnToEn(String(v == null ? '' : v)).replace(/[^0-9A-Za-z]/g, '');
  }

  /** তুলনার জন্য নরমালাইজ (মাঝের/\n স্পেস একসাথে) */
  function cmp(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  }

  /** একলাইন-ক্ষেত্রের মান: ভেতরের নতুন লাইন → স্পেস */
  function oneLine(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  }

  /** একাধিক লাইনের মান: লাইন-গঠন রাখে, অতিরিক্ত ফাঁকা লাইন ছাঁটে */
  function multiLine(s) {
    return String(s == null ? '' : s)
      .replace(/\r\n?/g, '\n')
      .split('\n').map((l) => l.replace(/[ \t]+$/g, '')).join('\n')
      .replace(/\n{3,}/g, '\n\n').trim();
  }

  function firstLine(s) {
    const l = String(s == null ? '' : s).split('\n');
    return l.length ? l[0] : '';
  }

  // ───────────────────────── path helpers (pure) ─────────────────────────
  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    let cur = obj;
    for (const p of String(path).split('.')) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function setByPath(obj, path, value) {
    const parts = String(path).split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (cur[k] == null) cur[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
    return obj;
  }

  function clone(o) {
    try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; }
  }

  /**
   * এডিট-তালিকা parsedData-এর কপিতে বসায় (মূল অবজেক্ট অটুট — immutable)
   * @param {object} parsedData
   * @param {Array<{path:string, value:*}>} edits
   */
  function applyEdits(parsedData, edits) {
    if (!parsedData || !Array.isArray(edits) || !edits.length) return parsedData;
    const out = clone(parsedData);
    for (const e of edits) {
      if (!e || !e.path) continue;
      setByPath(out, e.path, e.value);
    }
    out.__edited = true;
    return out;
  }

  /** সব সেকশনের প্রশ্ন এক তালিকায়: [{q, si, qi, path}] */
  function allQuestions(parsedData) {
    const list = [];
    if (!parsedData || !Array.isArray(parsedData.sections)) return list;
    parsedData.sections.forEach((sec, si) => {
      ((sec && sec.questions) || []).forEach((q, qi) => {
        list.push({ q: q, si: si, qi: qi, path: 'sections.' + si + '.questions.' + qi });
      });
    });
    return list;
  }

  // ───────────────────────── DOM helpers ─────────────────────────
  function isEl(n) { return !!(n && n.nodeType === 1); }

  /**
   * Part-14.0 (P0-2): চিত্র-র্যাপার/টুলবার বাদ দিয়ে ফিল্ডের টেক্সট।
   * আগে DOM-এ বসানো SVG-র শীর্ষবিন্দু-লেবেল (A/B/C) innerText-এ ঢুকে
   * "প্রশ্ন এডিট হয়েছে" ভেবে parsedData-তে ছাপা হত (নীরব দূষণ)।
   */
  function textWithoutFigures(el) {
    if (!isEl(el)) return '';
    if (!el.querySelector || !el.querySelector('.studio-figure-wrapper, .figure-toolbar')) {
      return (el.innerText != null && el.innerText !== '') ? el.innerText : el.textContent;
    }
    try {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('.studio-figure-wrapper, .figure-toolbar').forEach(function (n) { n.remove(); });
      return clone.textContent || '';
    } catch (e) {
      return '';
    }
  }

  /** @@FIGn@@ মার্কার ছাড়া টেক্সট (তুলনার জন্য) */
  function stripFigMarkers(s) {
    return String(s == null ? '' : s).replace(/QZFIG\d+QZ/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** মূল মানে থাকা মার্কার অটুট — নইলে প্রিভিউ-টেক্সটএডিটে চিত্র হারায় (P0-3) */
  function preserveFigMarkers(value, original) {
    const orig = String(original == null ? '' : original).match(/QZFIG\d+QZ/g) || [];
    if (!orig.length) return value;
    const have = new Set(String(value == null ? '' : value).match(/QZFIG\d+QZ/g) || []);
    const missing = orig.filter(function (mk) { return !have.has(mk); });
    if (!missing.length) return value;
    return String(value == null ? '' : value).replace(/\s+$/, '') + ' ' + missing.join(' ');
  }

  /** একলাইন-মানে মার্কার-সচেতন মান */
  function fieldValue(el, original) {
    return preserveFigMarkers(oneLine(textWithoutFigures(el)), original);
  }

  function nodeText(el) {
    if (!isEl(el)) return '';
    return cmp(stripFigMarkers(textWithoutFigures(el)));
  }

  /**
   * প্রিভিউ-ডোম থেকে বদলগুলো সংগ্রহ করে।
   * @param {Element} root   #preview-container
   * @param {object}  parsedData  রেন্ডারে ব্যবহৃত parsedData
   * @returns {Array<{path:string, value:string, kind:string}>}
   */
  function collectFromDom(root, parsedData) {
    const edits = [];
    if (!isEl(root) || !parsedData) return edits;

    const flat = allQuestions(parsedData);
    if (!flat.length) return edits;
    const byNum = new Map();
    flat.forEach((e) => {
      const k = normNum(e.q && e.q.num);
      if (k && !byNum.has(k)) byNum.set(k, e);
    });

    let orderPtr = 0;
    const items = root.querySelectorAll('.cq-q-item, .mcq-q-item');

    items.forEach((item) => {
      // ── প্রশ্ন শনাক্তকরণ: আগে নম্বর দিয়ে, না পেলে ক্রম দিয়ে
      const numEl = item.querySelector('.cq-num, .mcq-num');
      const key = numEl ? normNum(numEl.textContent) : '';
      let entry = key ? byNum.get(key) : null;
      if (!entry) {
        while (orderPtr < flat.length && flat[orderPtr].__used) orderPtr++;
        entry = flat[orderPtr];
      }
      if (!entry) return;
      entry.__used = true;

      const P = entry.path;
      const q = entry.q || {};
      const local = {};   // path → মান (একই path-এ একাধিক এডিট জোড়া লাগাতে)

      // ── ১) স্টেম (প্রশ্নের মূল লাইন / উদ্দীপকের প্রথম লাইন)
      const stemEl = item.querySelector('.cq-text, .mcq-text');
      const stemHasOwnText = !!(q.text && String(q.text).trim());
      if (stemEl) {
        const cur = nodeText(stemEl);
        const orig = stemHasOwnText ? cmp(q.text) : cmp(firstLine(q.stimulus));
        if (cur !== orig) {
          const value = fieldValue(stemEl, stemHasOwnText ? q.text : q.stimulus);
          if (stemHasOwnText) {
            local[P + '.text'] = value;
          } else if (q.stimulus != null) {
            const lines = String(q.stimulus).split('\n');
            const idx = lines.findIndex((l) => l.trim());
            if (idx >= 0) { lines[idx] = value; local[P + '.stimulus'] = lines.join('\n'); }
          } else {
            local[P + '.text'] = value;
          }
        }
      }

      // ── ২) উদ্দীপকের বাকি লাইন (.cq-stimulus) — স্টেম-এডিটের সঙ্গে মিলিয়ে
      const stimEl = item.querySelector('.cq-stimulus');
      if (stimEl && q.stimulus != null) {
        const stimLines = String(q.stimulus).split('\n');
        const restOrig = stemHasOwnText ? cmp(q.stimulus) : cmp(stimLines.slice(1).join('\n'));
        const cur = nodeText(stimEl);
        if (cur !== restOrig) {
          const value = multiLine(preserveFigMarkers(textWithoutFigures(stimEl), q.stimulus));
          if (stemHasOwnText) {
            local[P + '.stimulus'] = value;
          } else {
            const head = local[P + '.stimulus'] != null ? String(local[P + '.stimulus']).split('\n')[0] : stimLines[0];
            local[P + '.stimulus'] = (head || '') + (value ? '\n' + value : '');
          }
        }
      }

      // ── ৩) CQ উপ-প্রশ্ন (.cq-sub-row ↔ non-alternative subQuestions, ক্রমে)
      const subRows = item.querySelectorAll('.cq-sub-row');
      if (subRows.length && q.subQuestions && q.subQuestions.length) {
        const active = q.subQuestions.filter((s) => s && !s.isAlternative);
        subRows.forEach((row, k) => {
          const sub = active[k];
          if (!sub) return;
          const realIdx = q.subQuestions.indexOf(sub);
          const SP = P + '.subQuestions.' + realIdx;
          const tEl = row.querySelector('.cq-sub-text');
          if (tEl) {
            const cur = nodeText(tEl);
            if (cur !== cmp(sub.text)) local[SP + '.text'] = fieldValue(tEl, sub.text);
          }
          const mEl = row.querySelector('.cq-sub-mark');
          if (mEl) {
            const cur = nodeText(mEl);
            if (cur !== cmp(sub.mark)) local[SP + '.mark'] = oneLine(mEl.textContent);
          }
          const lEl = row.querySelector('.cq-sub-lbl');
          if (lEl) {
            const cur = nodeText(lEl).replace(/[.।]$/, '');
            if (cur !== cmp(sub.label)) local[SP + '.label'] = cur;
          }
        });
      }

      // ── ৪) MCQ অপশন (.mcq-opt ↔ options[])
      const optEls = item.querySelectorAll('.mcq-opt');
      if (optEls.length && q.options && q.options.length) {
        optEls.forEach((o, k) => {
          const opt = q.options[k];
          if (!opt) return;
          const OP = P + '.options.' + k;
          const tEl = o.querySelector('.mcq-opt-text');
          if (tEl) {
            const cur = nodeText(tEl);
            if (cur !== cmp(opt.text)) local[OP + '.text'] = fieldValue(tEl, opt.text);
          }
          const lEl = o.querySelector('.mcq-opt-label');
          if (lEl) {
            const cur = nodeText(lEl).replace(/^[\(\[]|[\)\]]$/g, '');
            if (cur !== cmp(opt.label)) local[OP + '.label'] = cur;
          }
        });
      }

      // ── ৫) MCQ fallback: অপশন না থাকলে subQuestions সারি হিসেবে ছাপা হয়
      if (!optEls.length && q.subQuestions && q.subQuestions.length) {
        const rowDivs = item.querySelectorAll('.mcq-options-row > div');
        rowDivs.forEach((d, k) => {
          const sub = q.subQuestions[k];
          if (!sub) return;
          const SP = P + '.subQuestions.' + k;
          const mkEl = d.querySelector('.mcq-mark');
          const mk = mkEl ? oneLine(mkEl.textContent) : '';
          const c = d.cloneNode(true);
          (c.querySelectorAll ? c.querySelectorAll('.mcq-mark') : []).forEach((x) => { if (x.parentNode) x.parentNode.removeChild(x); });
          const t = oneLine(c.textContent).replace(/^\([^)]*\)\s*/, '');
          if (cmp(t) !== cmp(sub.text)) local[SP + '.text'] = t;
          if (mk && cmp(mk) !== cmp(sub.mark)) local[SP + '.mark'] = mk;
        });
      }

      for (const path of Object.keys(local)) {
        edits.push({ path: path, value: local[path], kind: path.split('.').pop() });
      }
    });

    return edits;
  }

  /** উদ্দীপক/প্রশ্নে গণিত-নোড (eq-rendered) থাকা প্রশ্নের তালিকা — সতর্কবার্তার জন্য */
  function mathFieldsEdited(root, edits) {
    if (!isEl(root) || !Array.isArray(edits) || !edits.length) return [];
    const risky = [];
    const items = root.querySelectorAll('.cq-q-item, .mcq-q-item');
    items.forEach((item) => {
      if (!item.querySelector('.eq-rendered')) return;
      const numEl = item.querySelector('.cq-num, .mcq-num');
      const num = numEl ? normNum(numEl.textContent) : '';
      const has = edits.some((e) => e && /\.(text|stimulus)$/.test(e.path));
      if (has && num) risky.push(num);
    });
    return risky;
  }

  const api = {
    bnToEn: bnToEn,
    normNum: normNum,
    cmp: cmp,
    getByPath: getByPath,
    setByPath: setByPath,
    clone: clone,
    applyEdits: applyEdits,
    allQuestions: allQuestions,
    collectFromDom: collectFromDom,
    mathFieldsEdited: mathFieldsEdited,
    textWithoutFigures: textWithoutFigures,
    stripFigMarkers: stripFigMarkers,
    preserveFigMarkers: preserveFigMarkers
  };

  global.StudioEditBridge = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
