/**
 * Fayzar — ফরম-ছাঁচ মডিউল (Phase 6, FORMTPL_v1) — GENERAL_CLEAN পথে ফরমের ঘর শনাক্তকরণ ও রেন্ডারিং
 * =================================================================================================
 * কাজ:
 *   ১. ডট-লিডার ঘর: লেবেল + ডান-সারিবদ্ধ dot-leader ট্যাব (w:tab w:leader="dot"), ডট কখনো বোল্ড নয়, সব লেবেলের ফন্ট-মাপ সমান।
 *   ২. একই সারিতে একাধিক ঘর: একাধিক ট্যাব-স্টপ, প্রস্থ অনুপাতে।
 *   ৩. ছবির ঘর (passport photo box): ডানে নির্দিষ্ট মাপের সীমানাওয়ালা ফাঁকা ঘর (ফ্রেমহীন টেবিলের ডান কোষে বর্ডার), পাশের ঘরগুলো বাঁয়ে।
 *   ৪. ☐ চেকবক্স সারি: ☐ চিহ্ন + লেবেল, ট্যাবে সারিবদ্ধ।
 *   ৫. কাটা অংশ ("-----✂-----" বা ডটেড কাটার রেখা): পূর্ণ-প্রস্থ ড্যাশড নিচ-সীমানার অনুচ্ছেদ।
 *   ৬. এক পাতায় আঁটানো: ক্যাপচারে পাতা ১টি হলে ফন্ট ১০pt পর্যন্ত, তারপর লাইন-ফাঁক কমিয়ে এক পাতায় রাখা (কখনো ১০pt-এর নিচে নয়)।
 *   ৭. চেনা হয় জ্যামিতি ও ভূমিকা দিয়ে (role = label_value/field, ডট-রান, বাক্সের অবস্থান), নির্দিষ্ট লেখা-regex বা ফাইলের নাম দিয়ে নয়।
 *   সুইচ: FZ_OFF_FORMTPL সক্রিয় থাকলে বা ফরম-ঘর না পেলে পুরোনো আচরণ (বাইট-বাই-বাইট অপরিবর্তিত)।
 */
(function (global) {
  'use strict';

  function mod(name, path) {
    if (global[name]) return global[name];
    if (typeof require === 'function') { try { return require(path); } catch (e) { /* নেই */ } }
    return null;
  }
  const DM = () => mod('FayzarDocModel', './doc-model.js');

  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // অফলাইন ফলব্যাক: যদি একক পরিবেশে clean-composer লোড না থাকে তবে হুবহু অভিন্ন রান ও স্টাইল XML তৈরি করে
  const FallbackComposer = {
    runsXml(text, st) {
      const s = String(text == null ? '' : text);
      if (!s) return '';
      const style = st || {};
      const hasBn = /[\u0980-\u09FF]/.test(s);
      const segs = hasBn ? s.split(/([A-Za-z0-9/]+)/).filter(Boolean) : [s];
      return segs.map((seg) => {
        const isEn = !hasBn || /^[A-Za-z0-9/]+$/.test(seg);
        const fn = isEn ? 'Times New Roman' : 'Kalpurush';
        const rPr = (style.b ? '<w:b/>' : '') + (style.i ? '<w:i/>' : '') + (style.u ? '<w:u w:val="single"/>' : '') +
          (style.sz ? `<w:sz w:val="${style.sz}"/><w:szCs w:val="${style.sz}"/>` : '') +
          `<w:rFonts w:ascii="${fn}" w:hAnsi="${fn}" w:cs="${fn}"/>`;
        return `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${esc(seg)}</w:t></w:r>`;
      }).join('');
    },
    stylesXml() {
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Kalpurush" w:hAnsi="Kalpurush" w:cs="Kalpurush"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style></w:styles>';
    }
  };

  if (!global.FayzarCleanComposer) {
    let loaded = null;
    if (typeof require === 'function') { try { loaded = require('./clean-composer.js'); } catch (e) { /* নেই */ } }
    if (!loaded) global.FayzarCleanComposer = FallbackComposer;
  }

  // ───────── সুইচ যাচাই ─────────
  function isOff(opts) {
    if (opts && (opts.formTpl === false || opts.FZ_OFF_FORMTPL)) return true;
    if (typeof FZ_OFF_FORMTPL !== 'undefined' && FZ_OFF_FORMTPL) return true;
    if (typeof window !== 'undefined' && window.FZ_OFF_FORMTPL) return true;
    if (typeof globalThis !== 'undefined' && globalThis.FZ_OFF_FORMTPL) return true;
    if (global && global.FZ_OFF_FORMTPL) return true;
    if (typeof process !== 'undefined' && process.env && (process.env.FZ_OFF_FORMTPL === '1' || process.env.FZ_OFF_FORMTPL === 'true')) return true;
    return false;
  }

  // ───────── জ্যামিতি ও চিহ্ন শনাক্তকারী ─────────
  // ডট/রেখা লিডার রান: ৩+ বিন্দু/আন্ডারস্কোর অথবা ৪+ ড্যাশ বা সংক্ষিপ্ত ⟦.×N⟧ চিহ্ন
  const LEADER_SRC = '(?:[.\\u2026\\u2024_]{3,}|[-─—–]{4,}|⟦\\s*[.\\u2026\\u2024_\\-─—–]\\s*[×xX*]\\s*[০-৯\\d]+\\s*⟧)';
  const LEADER_RE = new RegExp(LEADER_SRC);
  const LEADER_G = new RegExp(LEADER_SRC, 'g');
  const ONLY_LEADER_RE = /^\s*(?:[.\u2026\u2024_\-─—–\s]{3,}|⟦\s*[.\u2026\u2024_\-─—–]\s*[×xX*]\s*[০-৯\d]+\s*⟧)\s*$/;
  const SCISSORS_RE = /[✂✁✃✄]/;
  const CHECKBOX_CHAR_RE = /[☐☑☒□■▢]|\[\s*[_xX✓✔]?\s*\]/;

  /** কাটার রেখা কি না (-----✂----- বা পূর্ণ-প্রস্থ ড্যাশড/ডটেড বিভাজক রেখা) */
  function isCutLineText(text, role) {
    const t = String(text || '').trim();
    if (!t) return false;
    // সাধারণ rule ব্লকে ⟦─×N⟧ থাকলে সেটি সাধারণ একক রেখা (ফরম কাটার রেখা নয়)
    if (role === 'rule' && /^⟦─×\d+⟧$/.test(t)) return false;
    if (SCISSORS_RE.test(t) && /^[\s.\u2026\u2024_\-─—–=~*✂✁✃✄]+$/.test(t)) return true;
    // ড্যাশ বা ফাঁক-দেওয়া ডট/ড্যাশের পূর্ণ সারি
    if (/^[-─—–=~]{5,}$/.test(t)) return true;
    if (/^(?:[.\u2026\-─—–]\s+){4,}[.\u2026\-─—–]?$/.test(t)) return true;
    return false;
  }

  /** শুধু ডট দিয়ে তৈরি পূর্ণ সারি কি না */
  function isPureDotLine(text) {
    const t = String(text || '').trim();
    return /^[.\u2026\u2024]{4,}$/.test(t) || /^⟦\s*[.\u2026\u2024]\s*[×xX*]\s*[০-৯\d]+\s*⟧$/.test(t);
  }

  /** চেকবক্স চিহ্ন আছে কি না */
  function hasCheckboxMarker(text) {
    return CHECKBOX_CHAR_RE.test(String(text || ''));
  }

  /** ডান পাশের ছবির ঘর (passport photo box) কি না — বাক্সের অবস্থান ও অনুপাত দিয়ে চেনা */
  function isPhotoBoxBlock(b) {
    if (!b) return false;
    if (b.role === 'photo_box') return true;
    if (!Array.isArray(b.box) || b.box.length !== 4) return false;
    const [y0, x0, y1, x1] = b.box;
    const h = y1 - y0, w = x1 - x0;
    // ডানে অবস্থিত (x0 >= 550, x1 >= 720), উচ্চতা >= 50, প্রস্থ >= 60 এবং চারকোনা/লম্বাটে অনুপাত
    if (x0 < 550 || x1 < 720 || h < 50 || h > 420 || w < 60 || w > 420) return false;
    const ratio = w / Math.max(1, h);
    if (ratio < 0.35 || ratio > 2.5) return false;
    if (b.role === 'figure' && b.figIndex == null) return true;
    if ((b.role === 'paragraph' || b.role === 'label_value' || b.role === 'other') && String(b.text || '').trim().length <= 25) {
      return !LEADER_RE.test(b.text) && !hasCheckboxMarker(b.text);
    }
    return false;
  }

  /** লেবেলের পাশে একই সারিতে চ্যাপ্টা অনুভূমিক ফাঁকা ঘর (figure) কি না */
  function isHorizontalFieldBox(b) {
    if (!b || b.role !== 'figure' || b.figIndex != null || !Array.isArray(b.box) || b.box.length !== 4) return false;
    const h = b.box[2] - b.box[0], w = b.box[3] - b.box[1];
    return h > 0 && h <= 48 && w >= 80 && (w / h) >= 3.0;
  }

  /** দুটি বাক্স একই অনুভূমিক সারিতে পাশাপাশি অবস্থিত কি না */
  function sameRowBox(firstBox, prevBox, nextBox) {
    if (!Array.isArray(firstBox) || !Array.isArray(prevBox) || !Array.isArray(nextBox)) return false;
    // পরের ব্লকটি অবশ্যই আগের ব্লকের ডান দিকে থাকতে হবে (নতুন লাইনে বাম মার্জিনে ফিরে গেলে নয়)
    if (nextBox[1] < prevBox[3] - 25) return false;
    const lo = Math.max(firstBox[0], nextBox[0]), hi = Math.min(firstBox[2], nextBox[2]);
    const minH = Math.max(1, Math.min(firstBox[2] - firstBox[0], nextBox[2] - nextBox[0]));
    if ((hi - lo) / minH >= 0.25) return true;
    const midFirst = (firstBox[0] + firstBox[2]) / 2;
    const midPrev = (prevBox[0] + prevBox[2]) / 2;
    const midNext = (nextBox[0] + nextBox[2]) / 2;
    // একই লাইনে সামান্য ঢাল থাকলে (যেমন স্ক্যান একটু বাঁকা হলে প্রতি কলামে ৪-১১ একক নামলে)
    return Math.abs(midFirst - midNext) <= 18 && Math.abs(midPrev - midNext) <= 14;
  }

  /** কোনো ব্লকে ডট-লিডার বা নিচে-ডট/রেখা আছে কি না */
  function isDotFieldBlock(b) {
    if (!b) return false;
    if (b.role === 'label_value' || b.role === 'field') return true;
    if (b.role !== 'paragraph' && b.role !== 'other') return false;
    const t = String(b.text || '').trim();
    if (!t || isCutLineText(t, b.role) || hasCheckboxMarker(t)) return false;
    return LEADER_RE.test(t);
  }

  /** পুরো ডকুমেন্টে কোনো ফরম-উপাদান আছে কি না */
  function hasFormFields(doc) {
    if (!doc || !Array.isArray(doc.pages)) return false;
    if (doc.meta && (doc.meta.docType === 'form' || doc.meta.designDocType === 'form')) return true;
    const D = DM();
    const blocks = D ? D.flat(doc) : [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b || (D && !D.isKept(b))) continue;
      if (b.role === 'label_value' || b.role === 'field' || b.role === 'photo_box') return true;
      if (isCutLineText(b.text, b.role)) return true;
      if (hasCheckboxMarker(b.text)) return true;
      if (isDotFieldBlock(b)) return true;
      if (isPhotoBoxBlock(b)) return true;
      if (isHorizontalFieldBox(b)) return true;
    }
    return false;
  }

  // ───────── এক লাইন থেকে একাধিক ডট-লিডার ঘর আলাদা করা ─────────
  function parseLineFields(line) {
    const raw = String(line || '');
    const re = new RegExp(LEADER_SRC, 'g');
    const fields = [];
    let lastIdx = 0;
    let m;
    while ((m = re.exec(raw)) !== null) {
      const label = raw.slice(lastIdx, m.index).trim();
      const leaderStr = m[0];
      const mult = /×\s*([০-৯\d]+)/.exec(leaderStr);
      const leaderLen = mult ? parseInt(mult[1].replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6)), 10) : leaderStr.length;
      const weight = Math.max(8, label.length + Math.min(80, leaderLen));
      fields.push({ label, leaderLen, weight });
      lastIdx = re.lastIndex;
    }
    const tail = raw.slice(lastIdx).trim();
    if (fields.length && tail) {
      // শেষে যদি আরেকটি লেবেল থাকে (যেমন "নাম: .... বয়স:")
      fields.push({ label: tail, leaderLen: 20, weight: Math.max(8, tail.length + 20) });
    }
    return fields;
  }

  // ───────── চেকবক্স সারি পার্সিং ─────────
  function parseCheckboxItems(text) {
    const s = String(text || '').trim()
      .replace(/\[\s*[_xX✓✔]?\s*\]/g, '☐')
      .replace(/[☑☒□■▢]/g, '☐');
    if (!s.includes('☐')) return null;
    const firstIdx = s.indexOf('☐');
    const prefix = s.slice(0, firstIdx).trim();
    const rest = s.slice(firstIdx);
    const parts = rest.split(/☐/).map((p) => p.replace(LEADER_G, '').trim()).filter(Boolean);
    if (!parts.length) return { prefix, items: ['☐'], hasLeaderGap: false };
    return {
      prefix,
      items: parts.map((p) => '☐ ' + p),
      hasLeaderGap: false
    };
  }

  // ───────── XML নির্মাতা সাহায্যকারী ─────────
  function tabRunXml(ptSz) {
    return `<w:r><w:rPr><w:sz w:val="${ptSz}"/><w:szCs w:val="${ptSz}"/></w:rPr><w:tab/></w:r>`;
  }

  function spacingXml(spacing) {
    if (!spacing) return '';
    const before = spacing.before != null ? ` w:before="${spacing.before}"` : '';
    const after = spacing.after != null ? ` w:after="${spacing.after}"` : '';
    const line = spacing.line != null ? ` w:line="${spacing.line}" w:lineRule="auto"` : '';
    return (before || after || line) ? `<w:spacing${before}${after}${line}/>` : '';
  }

  /**
   * ডট-লিডার সারি XML তৈরি (এক বা একাধিক ঘর)
   * fields: [{ label, bold, italic, underline, weight, box }]
   */
  function renderDotRowXml(fields, curW, ctx) {
    const { runs, para, sz, formPt, spacing, leftInd } = ctx;
    const ptSz = sz(formPt);
    const effW = Math.max(1440, curW);
    const n = fields.length;
    if (n === 0) return '';

    // প্রস্থ অনুপাতে ট্যাব-স্টপ হিসাব
    const weights = fields.map((f) => Math.max(10, f.weight || 20));
    const totalW = weights.reduce((a, b) => a + b, 0);
    const startX = leftInd && leftInd > 0 && leftInd < effW * 0.45 ? leftInd : 0;
    const spanW = effW - startX;

    let acc = 0;
    const stops = fields.map((_, idx) => {
      acc += weights[idx];
      const pos = idx === n - 1 ? effW : Math.round(startX + (spanW * acc) / totalW);
      return `<w:tab w:leader="dot" w:val="right" w:pos="${pos}"/>`;
    }).join('');

    const indXml = startX > 0 ? `<w:ind w:left="${startX}"/>` : '';
    const pPr = `<w:tabs>${stops}</w:tabs>${spacingXml(spacing)}${indXml}`;

    const inner = fields.map((f, idx) => {
      const lbl = String(f.label || '').trim();
      const prefixSpace = idx > 0 && lbl ? '  ' : '';
      const lblRun = lbl ? runs(prefixSpace + lbl + ' ', { sz: ptSz, b: !!f.bold, i: !!f.italic, u: !!f.underline }) : '';
      // ডট কখনো বোল্ড নয় — আলাদা রানে b ছাড়া <w:tab/>
      return lblRun + tabRunXml(ptSz);
    }).join('');

    return para(pPr, inner);
  }

  /**
   * ☐ চেকবক্স সারি XML তৈরি
   */
  function renderCheckboxRowXml(cbData, curW, ctx) {
    const { runs, para, sz, formPt, spacing } = ctx;
    const ptSz = sz(formPt);
    const effW = Math.max(1440, curW);
    const prefix = cbData.prefix ? cbData.prefix.trim() : '';
    const items = cbData.items || [];
    if (!items.length) return '';

    // যদি দুটি চেকবক্সের মাঝে ডট-লিডার ফাঁক থাকে (যেমন ": আছে ☐ ........ নেই ☐")
    if (cbData.hasLeaderGap && items.length >= 2) {
      const rightPos = effW;
      const leaderStopPos = Math.max(Math.round(effW * 0.5), effW - 960);
      const stops = `<w:tab w:leader="dot" w:val="right" w:pos="${leaderStopPos}"/><w:tab w:val="right" w:pos="${rightPos}"/>`;
      const pPr = `<w:tabs>${stops}</w:tabs>${spacingXml(spacing)}`;
      const preRun = prefix ? runs(prefix + ' ', { sz: ptSz, b: false }) : '';
      const firstRun = runs(items[0] + ' ', { sz: ptSz, b: false });
      const restRun = runs(' ' + items.slice(1).join('  '), { sz: ptSz, b: false });
      return para(pPr, preRun + firstRun + tabRunXml(ptSz) + restRun);
    }

    // সাধারণ চেকবক্স সারি: প্রস্থ অনুপাতে ট্যাব-স্টপ
    const prefixW = prefix ? Math.min(Math.round(effW * 0.45), Math.max(720, prefix.length * formPt * 12)) : 0;
    const availW = Math.max(1000, effW - prefixW);
    const n = items.length;
    const weights = items.map((it) => Math.max(6, it.length));
    const totW = weights.reduce((a, b) => a + b, 0);

    let acc = 0;
    const stops = [];
    for (let i = 0; i < n; i++) {
      if (i === 0 && !prefix) continue;
      const pos = i === 0 ? prefixW : Math.round(prefixW + (availW * acc) / totW);
      stops.push(`<w:tab w:val="left" w:pos="${pos}"/>`);
      acc += weights[i];
    }
    if (!stops.length) {
      stops.push(`<w:tab w:val="left" w:pos="${Math.round(effW / 2)}"/>`);
    }

    const pPr = `<w:tabs>${stops.join('')}</w:tabs>${spacingXml(spacing)}`;
    let inner = '';
    if (prefix) {
      inner += runs(prefix, { sz: ptSz, b: false }) + tabRunXml(ptSz);
    }
    inner += items.map((it, idx) => (idx > 0 ? tabRunXml(ptSz) : '') + runs(it, { sz: ptSz, b: false })).join('');
    return para(pPr, inner);
  }

  /**
   * কাটা অংশ (tear-off / cut line) XML তৈরি: পূর্ণ-প্রস্থ ড্যাশড নিচ-সীমানার অনুচ্ছেদ
   */
  function renderCutLineXml(spacing) {
    const before = spacing && spacing.compact ? 20 : 40;
    const after = spacing && spacing.compact ? 20 : 40;
    return `<w:p><w:pPr><w:pBdr><w:bottom w:val="dashed" w:sz="6" w:space="1" w:color="000000"/></w:pBdr><w:spacing w:before="${before}" w:after="${after}" w:line="120" w:lineRule="exact"/></w:pPr></w:p>`;
  }

  /**
   * ছবির ঘর (passport photo box) XML তৈরি:
   * ফ্রেমহীন ২-কলাম টেবিল, বাম কোষে পাশের ঘরগুলো, ডান কোষে নির্দিষ্ট মাপের চারপাশে বর্ডারযুক্ত ফাঁকা ঘর
   */
  function renderPhotoBoxTableXml(leftXmlList, photoBlock, curW, ctx) {
    const { runs, sz, formPt, spacing } = ctx;
    const effW = Math.max(3600, curW);
    const box = photoBlock && Array.isArray(photoBlock.box) ? photoBlock.box : [120, 770, 250, 945];
    const boxW = Math.max(80, box[3] - box[1]);
    const boxH = Math.max(60, box[2] - box[0]);
    // পাসপোর্ট ছবির ঘরের নির্দিষ্ট মাপ (প্রস্থ ~১.৩–১.৫ ইঞ্চি = ১৮০০–২১৬০ dxa, উচ্চতা অনুপাতে)
    const photoW = Math.max(1680, Math.min(2200, Math.round((effW * boxW) / 1000)));
    const leftW = effW - photoW;
    const rawH = Math.round(photoW * (boxH / boxW));
    const maxH = spacing && spacing.compact ? 1760 : 2300;
    const minH = spacing && spacing.compact ? 1100 : 1440;
    const photoH = Math.max(minH, Math.min(maxH, rawH));

    const nilBorders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="nil"/>`).join('');
    const leftCellBorders = ['top', 'left', 'bottom', 'right'].map((s) => `<w:${s} w:val="nil"/>`).join('');
    const photoCellBorders = ['top', 'left', 'bottom', 'right'].map((s) => `<w:${s} w:val="single" w:sz="6" w:space="0" w:color="000000"/>`).join('');

    const leftInner = leftXmlList.length ? leftXmlList.join('') : '<w:p/>';
    const photoLabel = photoBlock && photoBlock.role !== 'figure' && String(photoBlock.text || '').trim()
      ? runs(String(photoBlock.text).trim(), { sz: sz(Math.max(10, formPt - 1)), b: false })
      : '';
    const rightInner = `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>${photoLabel}</w:p>`;

    return `<w:tbl><w:tblPr><w:tblW w:w="${effW}" w:type="dxa"/><w:tblBorders>${nilBorders}</w:tblBorders><w:tblLayout w:type="fixed"/>` +
      '<w:tblCellMar><w:top w:w="20" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar><w:tblCaption w:val="fz-layout"/></w:tblPr>' +   // লেআউট-ছকের স্থায়ী চিহ্ন
      `<w:tblGrid><w:gridCol w:w="${leftW}"/><w:gridCol w:w="${photoW}"/></w:tblGrid>` +
      `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="${photoH}" w:hRule="atLeast"/></w:trPr>` +
      `<w:tc><w:tcPr><w:tcW w:w="${leftW}" w:type="dxa"/><w:tcBorders>${leftCellBorders}</w:tcBorders><w:vAlign w:val="center"/></w:tcPr>${leftInner}</w:tc>` +
      `<w:tc><w:tcPr><w:tcW w:w="${photoW}" w:type="dxa"/><w:tcBorders>${photoCellBorders}</w:tcBorders>` +
      '<w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar>' +
      `<w:vAlign w:val="center"/></w:tcPr>${rightInner}</w:tc></w:tr></w:tbl>`;
  }

  // ───────── ব্লক-তালিকা বিশ্লেষণ ও সারি গ্রুপিং ─────────
  /**
   * একই অনুভূমিক সারিতে থাকা ব্লকগুলো একত্রিত করে ফরমের যৌক্তিক আইটেম তৈরি করে
   */
  function groupRows(blocks) {
    const used = new Array(blocks.length).fill(false);
    const photoGroups = [];

    // ধাপ ১: ডান পাশের ছবির ঘর (photo box) এবং তার বাম পাশের সমান্তরাল ব্লকগুলো শনাক্ত করা
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (used[i] || !isPhotoBoxBlock(b)) continue;
      const pBox = b.box;
      const leftIndices = [];
      for (let j = 0; j < blocks.length; j++) {
        if (j === i || used[j]) continue;
        const lb = blocks[j];
        if (!lb || lb.role === 'title' || lb.role === 'heading' || lb.role === 'table') continue;
        if (!Array.isArray(lb.box) || lb.box.length < 4) continue;
        // ছবির ঘরের বাম পাশে এবং উল্লম্বভাবে ছবির ঘরের সীমার ভেতরে থাকা ব্লক
        if (lb.box[3] <= pBox[1] + 25 && lb.box[0] >= pBox[0] - 5 && lb.box[0] < pBox[2] - 2 && lb.box[2] > pBox[0] + 2) {
          leftIndices.push(j);
        }
      }
      used[i] = true;
      leftIndices.forEach((idx) => { used[idx] = true; });
      const insertAt = leftIndices.length ? Math.min(i, Math.min.apply(null, leftIndices)) : i;
      photoGroups.push({
        insertAt,
        photoIdx: i,
        photoBlock: b,
        leftBlocks: leftIndices.map((idx) => blocks[idx])
      });
    }

    // ধাপ ২: ক্রমানুসারে ব্লক ও ছবির-ঘর গ্রুপ সাজানো
    const photoByStart = {};
    photoGroups.forEach((pg) => {
      (photoByStart[pg.insertAt] = photoByStart[pg.insertAt] || []).push(pg);
    });

    const stream = [];
    for (let i = 0; i < blocks.length; i++) {
      if (photoByStart[i]) {
        photoByStart[i].forEach((pg) => stream.push({ kind: 'photo_section', photoBlock: pg.photoBlock, leftBlocks: pg.leftBlocks }));
      }
      if (!used[i]) {
        stream.push({ kind: 'block', block: blocks[i] });
      }
    }
    return stream;
  }

  /**
   * সাধারণ ব্লকের ধারা থেকে সারিভিত্তিক ফরম-আইটেম তৈরি করা
   */
  function buildLogicalRows(rawBlocks, allowSectionCut) {
    const out = [];
    let i = 0;
    while (i < rawBlocks.length) {
      const b = rawBlocks[i];
      if (!b) { i++; continue; }

      // ১) যদি পাতার নিচের অংশে দ্বিতীয় পূর্ণ-প্রস্থ title ব্লক আসে (যেমন "সদস্য অংশ"), তার আগে কাটার রেখা যোগ করা এবং ডানপাশের মূল্য-ব্লক একীভূত করা
      if (allowSectionCut && b.role === 'title' && i > 0 && Array.isArray(b.box) && b.box[0] >= 500) {
        const prevItem = out[out.length - 1];
        if (!prevItem || prevItem.type !== 'cut_line') {
          out.push({ type: 'cut_line', box: [b.box[0] - 8, 0, b.box[0] - 2, 1000] });
        }
        // যদি পরের ব্লকটি এই title ব্যানারের ভেতরেই ডান পাশে থাকে (যেমন "ফরম মূল্য: ৳১০০")
        const nxt = rawBlocks[i + 1];
        if (nxt && nxt.role === 'paragraph' && Array.isArray(nxt.box) && nxt.box[0] >= b.box[0] && nxt.box[2] <= b.box[2] + 5) {
          out.push({ type: 'banner_title', block: b, subBlock: nxt });
          i += 2;
          continue;
        }
      }

      // ২) কাটার রেখা ("-----✂-----" বা ডটেড/ড্যাশড কাটার রেখা)
      if (isCutLineText(b.text, b.role)) {
        out.push({ type: 'cut_line', block: b });
        i++;
        continue;
      }

      // ৩) শুধু ডট দিয়ে তৈরি একক লাইন: আগের ব্লকটি যদি লেবেল বা প্রশ্ন হয় তবে ডট-লিডার ঘর, নইলে ডটেড কাটার রেখা
      if ((b.role === 'paragraph' || b.role === 'other') && isPureDotLine(b.text)) {
        const prev = out[out.length - 1];
        const prevHasBoxGap = prev && prev.box && b.box ? (b.box[0] - prev.box[2]) : 999;
        if (prev && prev.type === 'plain_label') {
          // "নিচে-ডট/রেখা": আগের লেবেলটিকে ডট-লিডার ঘরে রূপান্তর
          prev.type = 'dot_row';
          prev.fields = [{ label: prev.text, bold: prev.bold, italic: prev.italic, underline: prev.underline, weight: 80 }];
          i++;
          continue;
        }
        if (prev && prev.type === 'dot_row' && prevHasBoxGap <= 20) {
          // বহুলব্ধ উত্তরের জন্য দ্বিতীয় ডট-লিডার লাইন
          out.push({ type: 'dot_row', fields: [{ label: '', bold: false, weight: 100 }], box: b.box });
          i++;
          continue;
        }
        // স্বতন্ত্র ডটেড রেখা ⇒ কাটার রেখা
        out.push({ type: 'cut_line', block: b });
        i++;
        continue;
      }

      // ৪) side_by_side ব্লকে দুটি ফরম-ঘর থাকলে এক সারিতে ২ ঘর হিসেবে রূপান্তর
      if (b.role === 'side_by_side' && b.left && b.right && b.left.length === 1 && b.right.length === 1) {
        const L = b.left[0], R = b.right[0];
        if (isDotFieldBlock(L) && isDotFieldBlock(R)) {
          const lf = parseLineFields(L.text);
          const rf = parseLineFields(R.text);
          const f1 = lf.length ? lf[0] : { label: L.text.replace(LEADER_G, '').trim(), weight: 50 };
          const f2 = rf.length ? rf[0] : { label: R.text.replace(LEADER_G, '').trim(), weight: 50 };
          out.push({
            type: 'dot_row',
            fields: [
              Object.assign({}, f1, { bold: L.bold, italic: L.italic, underline: L.underline }),
              Object.assign({}, f2, { bold: R.bold, italic: R.italic, underline: R.underline })
            ],
            box: b.box
          });
          i++;
          continue;
        }
      }

      // ৫) একই ব্লকের ভেতর ২ লাইন: ১ম লাইন লেবেল, ২য় লাইন ডট/রেখা ("নাম:\n........")
      if ((b.role === 'paragraph' || b.role === 'label_value' || b.role === 'field') && Array.isArray(b.lines) && b.lines.length === 2) {
        const l0 = b.lines[0].trim(), l1 = b.lines[1].trim();
        if (l0 && !LEADER_RE.test(l0) && ONLY_LEADER_RE.test(l1)) {
          out.push({
            type: 'dot_row',
            fields: [{ label: l0, bold: b.bold, italic: b.italic, underline: b.underline, weight: 80 }],
            box: b.box
          });
          i++;
          continue;
        }
      }

      // ৬) যদি ব্লকটির পরে একই অনুভূমিক সারিতে (box ওভারল্যাপ) আরও ব্লক থাকে, সবগুলো এক সারিতে সংগ্রহ করা
      if (Array.isArray(b.box) && (b.role === 'paragraph' || b.role === 'label_value' || b.role === 'field')) {
        // বহুপঙক্তি লেবেল যেটির পরের লাইনে ": আছে ......" ধরনের অপশন আছে (যেমন T21 ব্লক ৩৫+৩৬)
        let prefixLabel = '';
        let cur = b;
        if (!LEADER_RE.test(cur.text) && !cur.text.trim().endsWith(':') && i + 2 < rawBlocks.length) {
          const n1 = rawBlocks[i + 1], n2 = rawBlocks[i + 2];
          if (n1 && n2 && Array.isArray(n1.box) && Array.isArray(n2.box) &&
              Math.abs(n1.box[1] - cur.box[1]) <= 15 && (n1.box[0] - cur.box[2]) <= 12 &&
              !LEADER_RE.test(n1.text) && sameRowBox(n1.box, n1.box, n2.box) && n2.text.trim().startsWith(':')) {
            prefixLabel = cur.text.trim() + ' ';
            i++;
            cur = rawBlocks[i];
          }
        }

        const firstBox = cur.box.slice();
        let prevBox = cur.box.slice();
        const rowBlocks = [prefixLabel ? Object.assign({}, cur, { text: prefixLabel + cur.text.trim() }) : cur];
        let refBox = cur.box.slice();
        while (i + 1 < rawBlocks.length) {
          const nx = rawBlocks[i + 1];
          if (!nx || !Array.isArray(nx.box)) break;
          if (!sameRowBox(firstBox, prevBox, nx.box)) {
            // "ফরম নম্বর:" + "101302" এর মতো সামান্য নিচে-ডানে সরে থাকা মান
            const isLabelValPair = rowBlocks.length === 1 && /[:：]\s*$/.test(rowBlocks[0].text.trim()) &&
              !LEADER_RE.test(rowBlocks[0].text) && nx.role === 'paragraph' && !LEADER_RE.test(nx.text) &&
              nx.box[1] >= prevBox[1] + 50 && (nx.box[0] - prevBox[0]) >= 0 && (nx.box[0] - prevBox[0]) <= 22 && nx.text.trim().length <= 20;
            if (!isLabelValPair) break;
          }
          if (nx.role !== 'paragraph' && nx.role !== 'label_value' && nx.role !== 'field' && !isHorizontalFieldBox(nx)) break;
          rowBlocks.push(nx);
          prevBox = nx.box.slice();
          refBox = [Math.min(refBox[0], nx.box[0]), Math.min(refBox[1], nx.box[1]), Math.max(refBox[2], nx.box[2]), Math.max(refBox[3], nx.box[3])];
          i++;
        }

        if (rowBlocks.length > 1) {
          const rowItem = classifyMultiBlockRow(rowBlocks, refBox);
          if (rowItem) {
            out.push(rowItem);
            i++;
            continue;
          }
        }
      }

      // ৭) একক চেকবক্স ব্লক
      if (hasCheckboxMarker(b.text)) {
        const cbData = parseCheckboxItems(b.text);
        if (cbData) {
          out.push({ type: 'checkbox_row', cbData, box: b.box });
          i++;
          continue;
        }
      }

      // ৮) একক ডট-লিডার বা label_value/field ব্লক (যাতে ১ বা একাধিক ঘর থাকতে পারে)
      if (isDotFieldBlock(b)) {
        let fields = parseLineFields(b.text);
        if (!fields.length) {
          const cleanLbl = String(b.text || '').replace(/\t+$/, '').trim();
          fields = [{ label: cleanLbl, leaderLen: 40, weight: 80 }];
        }
        fields = fields.map((f) => Object.assign({}, f, { bold: b.bold, italic: b.italic, underline: b.underline }));
        out.push({ type: 'dot_row', fields, box: b.box });
        i++;
        continue;
      }

      // ৯) ফরমের ভেতরে পরপর থাকা সাধারণ গদ্য অনুচ্ছেদ (যেমন শপথবাক্যের ৩টি লাইন) এক অনুচ্ছেদে যুক্ত করা
      if (b.role === 'paragraph' && Array.isArray(b.box) && !/[:：]\s*$/.test(b.text.trim())) {
        const proseLines = [b.text.trim()];
        let lastBox = b.box;
        while (i + 1 < rawBlocks.length) {
          const nx = rawBlocks[i + 1];
          if (!nx || nx.role !== 'paragraph' || !Array.isArray(nx.box)) break;
          if (isDotFieldBlock(nx) || hasCheckboxMarker(nx.text) || isCutLineText(nx.text, nx.role) || /[:：]\s*$/.test(nx.text.trim())) break;
          const vGap = nx.box[0] - lastBox[2];
          if (vGap < 0 || vGap > 14 || Math.abs(nx.box[1] - b.box[1]) > 30) break;
          proseLines.push(nx.text.trim());
          lastBox = nx.box;
          i++;
        }
        if (proseLines.length > 1) {
          const mergedBlock = Object.assign({}, b, {
            lines: [proseLines.join(' ')],
            text: proseLines.join(' ')
          });
          out.push({ type: 'standard', block: mergedBlock, box: b.box });
          i++;
          continue;
        }
      }

      // ১০) যদি ছোট লেবেল ব্লক হয় যার ঠিক পরের ব্লকটি শুধু ডট-লাইন ("নিচে-ডট/রেখা")
      if (b.role === 'paragraph' && b.text.trim().length <= 40 && i + 1 < rawBlocks.length && isPureDotLine(rawBlocks[i + 1].text)) {
        out.push({
          type: 'dot_row',
          fields: [{ label: b.text.trim(), bold: b.bold, italic: b.italic, underline: b.underline, weight: 80 }],
          box: b.box
        });
        i += 2;
        continue;
      }

      out.push({ type: 'standard', block: b, box: b.box });
      i++;
    }
    return out;
  }

  /**
   * একই সারিতে থাকা একাধিক ব্লককে বিশ্লেষণ করে dot_row, checkbox_row বা label_value_pair-এ রূপান্তর করে
   */
  function classifyMultiBlockRow(rowBlocks, refBox) {
    // ক) "ফরম নম্বর:" + "101302" (কোনো ডট বা figure নেই, শুধু লেবেল ও মান)
    if (rowBlocks.length === 2 && rowBlocks.every((x) => x.role === 'paragraph' && !LEADER_RE.test(x.text) && !hasCheckboxMarker(x.text))) {
      const mergedText = rowBlocks.map((x) => x.text.trim()).join(' ');
      const merged = Object.assign({}, rowBlocks[0], { text: mergedText, lines: [mergedText] });
      return { type: 'standard', block: merged, box: refBox };
    }

    // খ) চেকবক্স সারি শনাক্তকরণ: হয় স্পষ্ট ☐ চিহ্ন আছে, নতুবা ২+ ছোট অপশন ব্লক আছে যাদের ডট-সংখ্যা <= ৮ এবং বাক্স সরু (যেমন ": আছে ......" ও "নেই ......")
    const isShortDotOption = (rb) => {
      if (rb.role !== 'paragraph' && rb.role !== 'label_value') return false;
      const t = rb.text.trim();
      const m = /^(.*?)\s*([.\u2026_]{2,8})$/.exec(t);
      if (!m) return false;
      const bw = rb.box ? (rb.box[3] - rb.box[1]) : 100;
      return bw <= 140 && m[1].trim().length <= 20;
    };

    const shortDotCount = rowBlocks.filter(isShortDotOption).length;
    const explicitCbCount = rowBlocks.filter((rb) => hasCheckboxMarker(rb.text)).length;

    if (explicitCbCount > 0 || shortDotCount >= 2) {
      let prefix = '';
      const items = [];
      const optBoxes = [];
      rowBlocks.forEach((rb) => {
        const t = rb.text.trim();
        if (hasCheckboxMarker(t)) {
          const parsed = parseCheckboxItems(t);
          if (parsed) {
            if (parsed.prefix) prefix = (prefix ? prefix + ' ' : '') + parsed.prefix;
            parsed.items.forEach((it) => { items.push(it); optBoxes.push(rb.box); });
          }
        } else if (isShortDotOption(rb)) {
          let lbl = t.replace(/[.\u2026_]+$/, '').trim();
          if (lbl.startsWith(':')) {
            prefix = (prefix ? prefix + ' :' : ':');
            lbl = lbl.replace(/^:\s*/, '').trim();
          }
          items.push('☐ ' + lbl);
          optBoxes.push(rb.box);
        } else if (!items.length) {
          prefix = (prefix ? prefix + ' ' : '') + t;
        }
      });
      const hasLeaderGap = optBoxes.length >= 2 && optBoxes[0] && optBoxes[1] && (optBoxes[1][1] - optBoxes[0][3] >= 300);
      return {
        type: 'checkbox_row',
        cbData: { prefix, items, hasLeaderGap },
        box: refBox
      };
    }

    // গ) একাধিক ডট-লিডার ঘর বা [লেবেল + অনুভূমিক ফাঁকা figure বাক্স]
    const fields = [];
    let pendingPrefix = '';
    let pendingStartX = null;
    for (let k = 0; k < rowBlocks.length; k++) {
      const rb = rowBlocks[k];
      const nx = rowBlocks[k + 1];
      if (isHorizontalFieldBox(rb)) continue;

      if (nx && isHorizontalFieldBox(nx)) {
        const lbl = (pendingPrefix ? pendingPrefix + ' ' : '') + rb.text.replace(LEADER_G, '').trim();
        const x0 = pendingStartX != null ? pendingStartX : (rb.box ? rb.box[1] : 0);
        pendingPrefix = '';
        pendingStartX = null;
        const x1 = nx.box ? nx.box[3] : (rb.box ? rb.box[3] + 200 : 500);
        fields.push({
          label: lbl,
          bold: rb.bold,
          italic: rb.italic,
          underline: rb.underline,
          weight: Math.max(15, x1 - x0),
          x0,
          x1
        });
        k++; // অনুভূমিক ফাঁকা figure ঘরটি ব্যবহৃত হয়েছে
        continue;
      }

      if (LEADER_RE.test(rb.text) || rb.role === 'label_value' || rb.role === 'field') {
        const segs = parseLineFields(rb.text);
        const rawLbl = rb.text.replace(LEADER_G, '').trim();
        const fullLbl = (pendingPrefix ? pendingPrefix + ' ' : '') + (segs.length ? segs[0].label : rawLbl);
        const x0 = pendingStartX != null ? pendingStartX : (rb.box ? rb.box[1] : 0);
        pendingPrefix = '';
        pendingStartX = null;
        // পরের ব্লকের শুরু পর্যন্ত বা নিজস্ব বাক্সের শেষ পর্যন্ত প্রস্থ
        let x1 = rb.box ? rb.box[3] : 500;
        if (nx && nx.box && nx.box[1] > x1) x1 = nx.box[1] - 15;
        else if (!nx && x1 < 700) x1 = 950;
        fields.push({
          label: fullLbl,
          bold: rb.bold,
          italic: rb.italic,
          underline: rb.underline,
          weight: Math.max(15, x1 - x0),
          x0,
          x1
        });
        for (let s = 1; s < segs.length; s++) {
          fields.push({
            label: segs[s].label,
            bold: rb.bold,
            italic: rb.italic,
            underline: rb.underline,
            weight: segs[s].weight
          });
        }
      } else {
        // যেমন "বর্তমান ঠিকানা" এবং তার পরে ": গ্রাম/রাস্তা: ...."
        if (pendingStartX == null && rb.box) pendingStartX = rb.box[1];
        pendingPrefix = (pendingPrefix ? pendingPrefix + ' ' : '') + rb.text.trim();
      }
    }

    if (fields.length) {
      // যদি পুরো সারিটি বাম থেকে অনেক ভেতরে শুরু হয় (যেমন "থানা: ... উপজেলা: ... জেলা: ..." যেখানে x0 ~ 258)
      const firstX0 = rowBlocks[0].box ? rowBlocks[0].box[1] : 0;
      return {
        type: 'dot_row',
        fields,
        leftRatio: firstX0 >= 180 ? (firstX0 - 37) / 950 : 0,
        box: refBox
      };
    }
    return null;
  }

  // ───────── এক পাতায় আঁটানোর হিসাব ─────────
  function computeFormPlan(doc, opts, streamCount) {
    const isSinglePage = doc.pages && doc.pages.length === 1;
    if (opts && opts.base) {
      const b = Math.max(10, opts.base);
      return { base: b, margin: b === 10 ? 864 : (b === 11 ? 1080 : 1440), spacing: null };
    }
    if (!isSinglePage) {
      return null; // বহু-পাতার ডকুমেন্টে সাধারণ choose() ব্যবহৃত হবে
    }
    // ১ পাতার ফরমে আইটেম সংখ্যা অনুযায়ী ফন্ট-সিঁড়ি (১২ → ১১ → ১০, কখনো ১০pt-এর নিচে নয়) এবং লাইন-ফাঁক সংকোচন
    if (streamCount <= 12) {
      return { base: 12, margin: 1440, spacing: null };
    }
    if (streamCount <= 17) {
      return { base: 11, margin: 1080, spacing: null };
    }
    if (streamCount <= 22) {
      return { base: 10, margin: 864, spacing: { after: 40, line: 240, compact: false } };
    }
    // ঘন ১-পাতার ফরম (যেমন T21): ১০pt ফন্ট + লাইন-ফাঁক ও অনুচ্ছেদ-ফাঁক কমিয়ে এক পাতায় রাখা
    return { base: 10, margin: 720, spacing: { after: 16, line: 215, compact: true } };
  }

  /**
   * ফরম-আইটেমগুলোকে চূড়ান্ত XML তালিকায় রূপান্তর করা
   */
  function renderLogicalRows(rows, curW, ctx) {
    const xmls = [];
    rows.forEach((item) => {
      if (item.type === 'cut_line') {
        xmls.push(renderCutLineXml(ctx.spacing));
      } else if (item.type === 'dot_row') {
        const leftInd = item.leftRatio ? Math.round(curW * item.leftRatio) : 0;
        xmls.push(renderDotRowXml(item.fields, curW, Object.assign({}, ctx, { leftInd })));
      } else if (item.type === 'checkbox_row') {
        xmls.push(renderCheckboxRowXml(item.cbData, curW, ctx));
      } else if (item.type === 'banner_title') {
        const b = item.block, sub = item.subBlock;
        const pt = ctx.base + (b.size === 'xl' ? 8 : 6);
        const titleXml = ctx.lineRuns(b, ctx.style(Object.assign({}, b, { bold: true }), pt), 'br');
        const subXml = sub ? `<w:r><w:br/></w:r>` + ctx.runs(sub.text.trim(), { sz: ctx.sz(ctx.base), b: true }) : '';
        const spBefore = ctx.spacing && ctx.spacing.compact ? 20 : 60;
        const spAfter = ctx.spacing && ctx.spacing.compact ? 20 : 60;
        xmls.push(ctx.para(`<w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="000000"/></w:pBdr><w:spacing w:before="${spBefore}" w:after="${spAfter}"/><w:jc w:val="center"/>`, titleXml + subXml));
      } else if (item.type === 'standard' && item.block) {
        let x = ctx.renderBlock(item.block, { borderBelow: item.borderBelow, cols: item.cols || 1 });
        if (ctx.spacing && ctx.spacing.compact && item.block.role === 'title') {
          x = x.replace('w:before="60" w:after="60"', 'w:before="20" w:after="20"');
        } else if (ctx.spacing && item.block.role === 'paragraph' && x.startsWith('<w:p>')) {
          const sp = spacingXml(ctx.spacing);
          if (x.startsWith('<w:p><w:pPr>')) x = x.replace('<w:p><w:pPr>', `<w:p><w:pPr>${sp}`);
          else x = x.replace('<w:p>', `<w:p><w:pPr>${sp}</w:pPr>`);
        }
        xmls.push(x);
      }
    });
    return xmls;
  }

  /**
   * general-clean-layout থেকে ডাকা মূল এন্ট্রি ফাংশন
   */
  function prepareFormRender(doc, seq, opts) {
    const stream = groupRows(seq);
    const topRows = [];
    stream.forEach((entry) => {
      if (entry.kind === 'photo_section') {
        const leftLogical = buildLogicalRows(entry.leftBlocks, false);
        topRows.push({ type: 'photo_section', photoBlock: entry.photoBlock, leftRows: leftLogical });
      } else {
        topRows.push(entry.block);
      }
    });

    // সাধারণ ব্লকগুলো একত্রে buildLogicalRows দিয়ে প্রক্রিয়াকরণ (photo_section অক্ষুণ্ণ রেখে)
    const finalItems = [];
    let buf = [];
    const flushBuf = () => {
      if (!buf.length) return;
      buildLogicalRows(buf, true).forEach((r) => finalItems.push(r));
      buf = [];
    };
    topRows.forEach((r) => {
      if (r && r.type === 'photo_section') {
        flushBuf();
        finalItems.push(r);
      } else {
        buf.push(r);
      }
    });
    flushBuf();

    // মোট লাইন-সংখ্যা গণনা (এক পাতায় আঁটানোর জন্য)
    let totalVisualRows = 0;
    finalItems.forEach((it) => {
      if (it.type === 'photo_section') totalVisualRows += Math.max(4, it.leftRows.length);
      else if (it.type === 'banner_title' || (it.type === 'standard' && it.block && it.block.role === 'title')) totalVisualRows += 2.5;
      else totalVisualRows += 1;
    });

    const plan = computeFormPlan(doc, opts, totalVisualRows);
    return { finalItems, plan, totalVisualRows };
  }

  function renderFormItems(prepared, ctx) {
    const { finalItems } = prepared;
    const out = [];
    for (let i = 0; i < finalItems.length; i++) {
      const it = finalItems[i];
      const nx = finalItems[i + 1];
      if (it.type === 'photo_section') {
        const photoW = Math.max(1680, Math.min(2200, Math.round((ctx.textW * Math.max(80, (it.photoBlock.box ? it.photoBlock.box[3] - it.photoBlock.box[1] : 175))) / 1000)));
        const leftCellW = ctx.textW - photoW - 140;
        const leftXmls = renderLogicalRows(it.leftRows, leftCellW, ctx);
        const tblXml = renderPhotoBoxTableXml(leftXmls, it.photoBlock, ctx.textW, ctx);
        out.push({ b: it.photoBlock, xml: tblXml });
      } else {
        if (it.type === 'standard' && it.block) {
          it.borderBelow = it.block.role === 'title' && !(nx && nx.type === 'standard' && nx.block && (nx.block.role === 'rule' || nx.block.role === 'title'));
          it.cols = it.block.cols || 1;
        }
        const curW = (it.cols === 2) ? Math.floor((ctx.textW - 425) / 2) : ctx.textW;
        const xmls = renderLogicalRows([it], curW, ctx);
        if (xmls.length) {
          out.push({ b: it.block || { role: 'paragraph', cols: 1 }, xml: xmls[0] });
        }
      }
    }
    return out;
  }

  function adjustStylesXml(stylesXml, spacing) {
    if (!spacing) return stylesXml;
    return stylesXml.replace(
      /<w:spacing w:after="80" w:line="276" w:lineRule="auto"\/>/,
      `<w:spacing w:after="${spacing.after}" w:line="${spacing.line}" w:lineRule="auto"/>`
    );
  }

  const FayzarFormFields = {
    isOff,
    hasFormFields,
    isCutLineText,
    isPhotoBoxBlock,
    isDotFieldBlock,
    parseLineFields,
    parseCheckboxItems,
    prepareFormRender,
    renderFormItems,
    adjustStylesXml
  };

  global.FayzarFormFields = FayzarFormFields;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarFormFields;
})(typeof globalThis !== 'undefined' ? globalThis : this);
