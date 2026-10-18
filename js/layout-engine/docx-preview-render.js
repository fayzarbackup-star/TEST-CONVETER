/**
 * Fayzar — মাস্টার .docx থেকে প্রিভিউ আঁকার লোকাল রেন্ডারার (FayzarDocxPreview)
 * ==============================================================================
 * WORK_PLAN F2 (A3_F2_DOCXPREVIEW_v5): কোনো CDN বা বাহ্যিক নির্ভরতা ছাড়া সরাসরি
 * মাস্টার .docx (Blob / ArrayBuffer / Uint8Array / Buffer) থেকে হুবহু HTML/CSS
 * পাতা (.fz-page) রেন্ডারার।
 *
 * সমর্থিত বৈশিষ্ট্যসমূহ:
 *  - পাতার মাপ, মার্জিন ও আড়াআড়ি/লম্বালম্বি (w:sectPr, w:pgSz, w:pgMar, w:type)
 *  - ১/২ বা বহু-কলাম লেআউট ও কলাম-বিরতি (w:cols, w:br w:type="column")
 *  - অনুচ্ছেদ: অবস্থান (jc), ইনডেন্ট (ind: left/right/firstLine/hanging),
 *    স্পেসিং (before/after/line/lineRule), বর্ডার (pBdr), শেডিং (shd) এবং
 *    সম্পাদনার জন্য ক্রমিক `data-fz-p="<index>"` অ্যাট্রিবিউট
 *  - রান: ফন্ট (rFonts + styles.xml ডিফল্ট), আকার (sz/szCs), বোল্ড (b), ইটালিক (i),
 *    আন্ডারলাইন (u), রং (color), হাইলাইট/শেডিং, সুপারস্ক্রিপ্ট/সাবস্ক্রিপ্ট (vertAlign)
 *  - ট্যাব-স্টপ (left/center/right/decimal) ও লিডার (dot/hyphen/underscore)
 *  - টেবিল: কলাম-গ্রিড (tblGrid/gridCol), আনুভূমিক মার্জ (gridSpan → colspan),
 *    উল্লম্ব মার্জ (vMerge → rowspan), বর্ডার (tblBorders/tcBorders), ঘর-মার্জিন
 *    (tblCellMar/tcMar), শেডিং (shd) ও উল্লম্ব অবস্থান (vAlign)
 *  - ছবি: এমবেডেড মিডিয়া (w:drawing, wp:extent, a:blip, word/_rels/document.xml.rels)
 *  - পাতা-বিরতি: স্পষ্ট বিরতি (w:br w:type="page", pageBreakBefore, sectPr) এবং
 *    উচ্চতা মেপে স্বয়ংক্রিয় পাতা-ভাগ (A4 px মাপ, pt→px = ৪/৩)
 *  - OMML সমীকরণ: ভগ্নাংশ (m:f), ঘাত/সাবস্ক্রিপ্ট (m:sSup, m:sSub, m:sSubSup),
 *    বর্গমূল (m:rad), বন্ধনী (m:d) ও সাধারণ গাণিতিক রান (m:r/m:t)
 */
(function (global) {
  'use strict';

  const PT_TO_PX = 4 / 3;          // ১ pt = ৪/৩ px (৯৬ DPI / ৭২ pt)
  const TWIP_TO_PT = 1 / 20;       // ১ pt = ২০ twips (dxa)
  const TWIP_TO_PX = 1 / 15;       // ১ dxa = (১/২০) * (৪/৩) = ১/১৫ px
  const EMU_TO_PX = 1 / 9525;      // ১ ইঞ্চি = ৯১৪৪০০ EMU = ৯৬ px
  const DEFAULT_A4_W_TWIP = 11906; // A4 প্রস্থ (৫৯৫.৩ pt ≈ ৭৯৪ px)
  const DEFAULT_A4_H_TWIP = 16838; // A4 উচ্চতা (৮৪১.৯ pt ≈ ১১২৩ px)
  const DEFAULT_MAR_TWIP = 1440;   // ১ ইঞ্চি মার্জিন (৭২ pt = ৯৬ px)

  const twipToPx = (v, fb = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * TWIP_TO_PX * 100) / 100 : fb;
  };
  const twipToPt = (v, fb = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * TWIP_TO_PT * 100) / 100 : fb;
  };
  const emuToPx = (v, fb = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * EMU_TO_PX * 10) / 10 : fb;
  };

  /** HTML বিশেষ অক্ষর এস্কেপ */
  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** XML এনটিটি আন-এস্কেপ */
  function unescXml(str) {
    return String(str == null ? '' : str)
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#([0-9]+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  /**
   * বিশুদ্ধ জাভাস্ক্রিপ্ট XML পার্সার (DOM ছাড়া Node এবং ব্রাউজার উভয়েই চলে)।
   * @param {string} xml
   * @returns {{ tag: string, attrs: Object, children: Array }}
   */
  function parseXml(xml) {
    const root = { tag: '#document', attrs: {}, children: [] };
    if (!xml || typeof xml !== 'string') return root;
    const s = xml
      .replace(/^\uFEFF/, '')
      .replace(/<\?[\s\S]*?\?>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<!DOCTYPE[\s\S]*?>/gi, '');

    const stack = [root];
    const tagRe = /<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>/]+))?)*)\s*(\/?)>/g;
    const attrRe = /([A-Za-z_][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g;

    let lastIdx = 0;
    let m;
    while ((m = tagRe.exec(s)) !== null) {
      if (m.index > lastIdx) {
        const rawText = s.slice(lastIdx, m.index);
        if (rawText) {
          stack[stack.length - 1].children.push({ tag: '#text', text: unescXml(rawText) });
        }
      }
      lastIdx = tagRe.lastIndex;

      if (m[1] !== undefined) {
        stack[stack.length - 1].children.push({ tag: '#text', text: m[1] });
        continue;
      }

      const isClose = m[2] === '/';
      const tagName = m[3];
      const attrStr = m[4] || '';
      const isSelfClose = m[5] === '/';

      if (isClose) {
        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i].tag === tagName) {
            stack.length = i;
            break;
          }
        }
        continue;
      }

      const attrs = {};
      let am;
      attrRe.lastIndex = 0;
      while ((am = attrRe.exec(attrStr)) !== null) {
        const val = am[2] !== undefined ? am[2] : (am[3] !== undefined ? am[3] : (am[4] !== undefined ? am[4] : ''));
        attrs[am[1]] = unescXml(val);
      }

      const node = { tag: tagName, attrs, children: [] };
      stack[stack.length - 1].children.push(node);
      if (!isSelfClose) stack.push(node);
    }

    if (lastIdx < s.length) {
      const tail = s.slice(lastIdx);
      if (tail) stack[stack.length - 1].children.push({ tag: '#text', text: unescXml(tail) });
    }
    return root;
  }

  /** ট্যাগের স্থানীয় নাম বা পূর্ণ নাম মেলানো সহায়ক */
  function isTag(node, name) {
    if (!node || !node.tag) return false;
    if (node.tag === name) return true;
    const colon = node.tag.indexOf(':');
    return colon >= 0 && node.tag.slice(colon + 1) === name;
  }

  function findChild(node, name) {
    if (!node || !node.children) return null;
    for (const c of node.children) if (isTag(c, name)) return c;
    return null;
  }

  function findChildren(node, name) {
    if (!node || !node.children) return [];
    return node.children.filter((c) => isTag(c, name));
  }

  function findAll(node, name, out = []) {
    if (!node || !node.children) return out;
    for (const c of node.children) {
      if (isTag(c, name)) out.push(c);
      if (c.children && c.children.length) findAll(c, name, out);
    }
    return out;
  }

  function getAttr(node, localOrFull) {
    if (!node || !node.attrs) return undefined;
    if (node.attrs[localOrFull] !== undefined) return node.attrs[localOrFull];
    if (node.attrs['w:' + localOrFull] !== undefined) return node.attrs['w:' + localOrFull];
    if (node.attrs['m:' + localOrFull] !== undefined) return node.attrs['m:' + localOrFull];
    if (node.attrs['r:' + localOrFull] !== undefined) return node.attrs['r:' + localOrFull];
    for (const k of Object.keys(node.attrs)) {
      const idx = k.indexOf(':');
      if (idx >= 0 && k.slice(idx + 1) === localOrFull) return node.attrs[k];
    }
    return undefined;
  }

  function isOnVal(node) {
    if (!node) return false;
    const v = getAttr(node, 'val');
    if (v === undefined) return true;
    const s = String(v).toLowerCase();
    return s !== '0' && s !== 'false' && s !== 'none' && s !== 'off';
  }

  const faithfulStudioOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_FAITHFUL_STUDIO : global.__FZ_ON_FAITHFUL_STUDIO)
    || !!(typeof process !== 'undefined' && process.env && process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('FAITHFUL_STUDIO'));

  /** JSZip ইনস্ট্যান্স খুঁজে বের করা (ব্রাউজার এবং Node উভয় পরিবেশে) */
  function resolveJSZip(opts) {
    if (opts && opts.JSZip) return opts.JSZip;
    if (global && global.JSZip) return global.JSZip;
    if (typeof window !== 'undefined' && window.JSZip) return window.JSZip;
    if (typeof require === 'function') {
      const candidates = ['../jszip.min.js', './jszip.min.js', 'jszip'];
      for (const p of candidates) {
        try {
          const z = require(p);
          if (z) return z;
        } catch (_) { /* পরের পাথ চেষ্টা */ }
      }
    }
    if (faithfulStudioOn()) {
      const fb = (global && global.FayzarFaithfulDocx && global.FayzarFaithfulDocx.MiniJSZip)
        || (typeof window !== 'undefined' && window.FayzarFaithfulDocx && window.FayzarFaithfulDocx.MiniJSZip);
      if (fb) return fb;
      if (typeof require === 'function') {
        try {
          const d = require('./faithful/faithful-docx-builder.js');
          if (d && d.MiniJSZip) return d.MiniJSZip;
        } catch (_) {}
      }
    }
    throw new Error('JSZip পাওয়া যায়নি (js/jszip.min.js লোড করুন বা opts.JSZip দিন)।');
  }

  /** বর্ডার XML নোড থেকে CSS border মান তৈরি */
  function borderNodeToCss(bNode) {
    if (!bNode) return '';
    const val = String(getAttr(bNode, 'val') || 'single').toLowerCase();
    if (val === 'none' || val === 'nil') return 'none';
    const szEighths = Number(getAttr(bNode, 'sz') || 4);
    const pt = Math.max(0.5, szEighths / 8);
    const px = Math.max(1, Math.round(pt * PT_TO_PX * 10) / 10);
    const rawColor = String(getAttr(bNode, 'color') || '000000').replace(/^#/, '');
    const color = (!rawColor || rawColor === 'auto') ? '#000000' : '#' + rawColor;
    let style = 'solid';
    if (val === 'double') style = 'double';
    else if (val === 'dotted' || val === 'dot') style = 'dotted';
    else if (val === 'dashed' || val === 'dash' || val === 'dashsmallgap') style = 'dashed';
    const finalPx = style === 'double' ? Math.max(3, px) : px;
    return `${finalPx}px ${style} ${color}`;
  }

  /** সেকশন প্রপার্টি (w:sectPr) পার্স করা */
  function parseSectPr(sectNode, fallback) {
    const base = Object.assign({
      widthTwip: DEFAULT_A4_W_TWIP,
      heightTwip: DEFAULT_A4_H_TWIP,
      orient: 'portrait',
      margins: { top: DEFAULT_MAR_TWIP, right: DEFAULT_MAR_TWIP, bottom: DEFAULT_MAR_TWIP, left: DEFAULT_MAR_TWIP },
      cols: 1,
      colSpaceTwip: 720,
      colSep: false,
      type: 'nextPage'
    }, fallback || {});
    if (!sectNode) return finalizeSectGeometry(base);

    const pgSz = findChild(sectNode, 'pgSz');
    if (pgSz) {
      let w = Number(getAttr(pgSz, 'w')) || base.widthTwip;
      let h = Number(getAttr(pgSz, 'h')) || base.heightTwip;
      const orientAttr = String(getAttr(pgSz, 'orient') || '').toLowerCase();
      const isLand = orientAttr === 'landscape' || w > h;
      if (isLand && w < h) { const tmp = w; w = h; h = tmp; }
      base.widthTwip = w;
      base.heightTwip = h;
      base.orient = isLand ? 'landscape' : 'portrait';
    }

    const pgMar = findChild(sectNode, 'pgMar');
    if (pgMar) {
      base.margins = {
        top: Number(getAttr(pgMar, 'top') ?? base.margins.top),
        right: Number(getAttr(pgMar, 'right') ?? base.margins.right),
        bottom: Number(getAttr(pgMar, 'bottom') ?? base.margins.bottom),
        left: Number(getAttr(pgMar, 'left') ?? base.margins.left)
      };
    }

    const colsNode = findChild(sectNode, 'cols');
    if (colsNode) {
      base.cols = Math.max(1, Number(getAttr(colsNode, 'num') || 1));
      if (getAttr(colsNode, 'space') !== undefined) base.colSpaceTwip = Number(getAttr(colsNode, 'space')) || 0;
      const sepVal = String(getAttr(colsNode, 'sep') || '').toLowerCase();
      base.colSep = sepVal === '1' || sepVal === 'true';
    }

    const typeNode = findChild(sectNode, 'type');
    if (typeNode && getAttr(typeNode, 'val')) {
      base.type = String(getAttr(typeNode, 'val'));
    }

    return finalizeSectGeometry(base);
  }

  function finalizeSectGeometry(s) {
    const widthPx = Math.round(twipToPx(s.widthTwip, 794));
    const heightPx = Math.round(twipToPx(s.heightTwip, 1123));
    const marginPx = {
      top: Math.round(twipToPx(s.margins.top, 96)),
      right: Math.round(twipToPx(s.margins.right, 96)),
      bottom: Math.round(twipToPx(s.margins.bottom, 96)),
      left: Math.round(twipToPx(s.margins.left, 96))
    };
    const contentWidthPx = Math.max(120, widthPx - marginPx.left - marginPx.right);
    const contentHeightPx = Math.max(120, heightPx - marginPx.top - marginPx.bottom);
    const colGapPx = Math.round(twipToPx(s.colSpaceTwip, 24));
    return Object.assign({}, s, { widthPx, heightPx, marginPx, contentWidthPx, contentHeightPx, colGapPx });
  }

  /** styles.xml থেকে ডিফল্ট ফন্ট ও সাইজ পড়া */
  function parseStylesDefaults(stylesRoot) {
    const defaults = { font: 'Kalpurush', szHalfPt: 24, stylesById: {} };
    if (!stylesRoot) return defaults;

    const rPrDef = findAll(stylesRoot, 'rPrDefault')[0];
    if (rPrDef) {
      const rFonts = findAll(rPrDef, 'rFonts')[0];
      if (rFonts) {
        defaults.font = getAttr(rFonts, 'cs') || getAttr(rFonts, 'ascii') || getAttr(rFonts, 'hAnsi') || defaults.font;
      }
      const sz = findAll(rPrDef, 'sz')[0] || findAll(rPrDef, 'szCs')[0];
      if (sz && getAttr(sz, 'val')) defaults.szHalfPt = Number(getAttr(sz, 'val')) || defaults.szHalfPt;
    }

    for (const st of findAll(stylesRoot, 'style')) {
      const id = getAttr(st, 'styleId');
      if (!id) continue;
      const rPr = findChild(st, 'rPr');
      const pPr = findChild(st, 'pPr');
      defaults.stylesById[id] = { rPr, pPr };
    }
    return defaults;
  }

  /** word/_rels/document.xml.rels পার্স করা */
  function parseRels(relsRoot) {
    const map = {};
    if (!relsRoot) return map;
    for (const rel of findAll(relsRoot, 'Relationship')) {
      const id = getAttr(rel, 'Id');
      const target = getAttr(rel, 'Target');
      if (id && target) map[id] = target;
    }
    return map;
  }

  /** ফাইলের নাম থেকে MIME টাইপ নির্ণয় */
  function mimeFromPath(path) {
    const ext = String(path || '').split('.').pop().toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'svg') return 'image/svg+xml';
    if (ext === 'webp') return 'image/webp';
    return 'image/png';
  }

  /** OMML সমীকরণ (m:oMath, m:f, m:sSup, m:sSub, m:rad ইত্যাদি) HTML-এ রূপান্তর */
  function renderOmmlNode(node, ctx) {
    if (!node) return '';
    if (node.tag === '#text') return escHtml(node.text);

    if (isTag(node, 'oMathPara')) {
      const inner = (node.children || []).map((c) => renderOmmlNode(c, ctx)).join('');
      return `<span class="fz-omath-para" style="display:inline-block;vertical-align:middle;">${inner}</span>`;
    }
    if (isTag(node, 'oMath')) {
      const inner = (node.children || []).map((c) => renderOmmlNode(c, ctx)).join('');
      return `<span class="fz-omath" style="display:inline-flex;align-items:center;gap:1px;font-family:'Cambria Math','Times New Roman',serif;">${inner}</span>`;
    }
    if (isTag(node, 'f')) {
      // ভগ্নাংশ (m:f -> m:num / m:den)
      const fPr = findChild(node, 'fPr');
      const typeNode = fPr ? findChild(fPr, 'type') : null;
      const fracType = typeNode ? String(getAttr(typeNode, 'val') || 'bar').toLowerCase() : 'bar';
      const numHtml = renderOmmlChildren(findChild(node, 'num'), ctx);
      const denHtml = renderOmmlChildren(findChild(node, 'den'), ctx);
      if (fracType === 'lin') {
        return `<span class="fz-math-frac fz-math-frac-lin">(${numHtml})/(${denHtml})</span>`;
      }
      const barCss = fracType === 'nobar' ? 'none' : '1px solid currentColor';
      return `<span class="fz-math-frac" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 2px;line-height:1.05;font-size:0.92em;">` +
        `<span class="fz-math-num" style="padding:0 3px;border-bottom:${barCss};text-align:center;">${numHtml}</span>` +
        `<span class="fz-math-den" style="padding:0 3px;text-align:center;">${denHtml}</span>` +
        `</span>`;
    }
    if (isTag(node, 'sSup')) {
      const baseHtml = renderOmmlChildren(findChild(node, 'e'), ctx);
      const supHtml = renderOmmlChildren(findChild(node, 'sup'), ctx);
      return `<span class="fz-math-ssup"><span class="fz-math-base">${baseHtml}</span><sup class="fz-math-sup" style="font-size:0.75em;line-height:0;">${supHtml}</sup></span>`;
    }
    if (isTag(node, 'sSub')) {
      const baseHtml = renderOmmlChildren(findChild(node, 'e'), ctx);
      const subHtml = renderOmmlChildren(findChild(node, 'sub'), ctx);
      return `<span class="fz-math-ssub"><span class="fz-math-base">${baseHtml}</span><sub class="fz-math-sub" style="font-size:0.75em;line-height:0;">${subHtml}</sub></span>`;
    }
    if (isTag(node, 'sSubSup')) {
      const baseHtml = renderOmmlChildren(findChild(node, 'e'), ctx);
      const subHtml = renderOmmlChildren(findChild(node, 'sub'), ctx);
      const supHtml = renderOmmlChildren(findChild(node, 'sup'), ctx);
      return `<span class="fz-math-ssubsup"><span class="fz-math-base">${baseHtml}</span><sub class="fz-math-sub" style="font-size:0.75em;">${subHtml}</sub><sup class="fz-math-sup" style="font-size:0.75em;">${supHtml}</sup></span>`;
    }
    if (isTag(node, 'rad')) {
      // বর্গমূল / মূলক (m:rad -> m:deg, m:e)
      const degNode = findChild(node, 'deg');
      const degHtml = degNode ? renderOmmlChildren(degNode, ctx).trim() : '';
      const bodyHtml = renderOmmlChildren(findChild(node, 'e'), ctx);
      return `<span class="fz-math-rad" style="display:inline-flex;align-items:baseline;vertical-align:middle;">` +
        (degHtml ? `<sup class="fz-math-rad-deg" style="font-size:0.7em;margin-right:1px;">${degHtml}</sup>` : '') +
        `<span class="fz-math-rad-sym" style="font-size:1.1em;line-height:1;">&radic;</span>` +
        `<span class="fz-math-rad-body" style="border-top:1px solid currentColor;padding:1px 2px 0 2px;">${bodyHtml}</span>` +
        `</span>`;
    }
    if (isTag(node, 'd')) {
      // বন্ধনী (m:d)
      const dPr = findChild(node, 'dPr');
      const begChr = (dPr && findChild(dPr, 'begChr') && getAttr(findChild(dPr, 'begChr'), 'val')) || '(';
      const endChr = (dPr && findChild(dPr, 'endChr') && getAttr(findChild(dPr, 'endChr'), 'val')) || ')';
      const inner = findChildren(node, 'e').map((e) => renderOmmlChildren(e, ctx)).join(', ');
      return `<span class="fz-math-delim">${escHtml(begChr)}${inner}${escHtml(endChr)}</span>`;
    }
    if (isTag(node, 'r')) {
      const tNodes = findChildren(node, 't');
      if (tNodes.length) {
        return `<span class="fz-math-r">${tNodes.map((t) => escHtml(textOf(t))).join('')}</span>`;
      }
    }
    if (isTag(node, 't')) {
      return escHtml(textOf(node));
    }
    if (isTag(node, 'fPr') || isTag(node, 'sSupPr') || isTag(node, 'sSubPr') || isTag(node, 'radPr') || isTag(node, 'rPr') || isTag(node, 'ctrlPr')) {
      return '';
    }
    return (node.children || []).map((c) => renderOmmlNode(c, ctx)).join('');
  }

  function renderOmmlChildren(node, ctx) {
    if (!node || !node.children) return '';
    return node.children.map((c) => renderOmmlNode(c, ctx)).join('');
  }

  function textOf(node) {
    if (!node) return '';
    if (node.tag === '#text') return node.text || '';
    return (node.children || []).map(textOf).join('');
  }

  /** ছবি / ড্রয়িং (w:drawing / w:pict) HTML-এ রূপান্তর */
  function renderDrawing(drawNode, ctx) {
    const extNode = findAll(drawNode, 'extent')[0] || findAll(drawNode, 'ext')[0];
    const wPx = extNode && getAttr(extNode, 'cx') ? emuToPx(getAttr(extNode, 'cx'), 120) : 0;
    const hPx = extNode && getAttr(extNode, 'cy') ? emuToPx(getAttr(extNode, 'cy'), 80) : 0;

    let rId = '';
    const blip = findAll(drawNode, 'blip')[0];
    if (blip) rId = getAttr(blip, 'embed') || getAttr(blip, 'link') || '';
    if (!rId) {
      const imgData = findAll(drawNode, 'imagedata')[0];
      if (imgData) rId = getAttr(imgData, 'id') || '';
    }

    const src = (rId && ctx.mediaByRelId[rId]) || '';
    const sizeCss = (wPx ? `width:${wPx}px;` : '') + (hPx ? `height:${hPx}px;` : '') + 'max-width:100%;';
    return {
      html: `<img class="fz-drawing" src="${escHtml(src)}" data-rid="${escHtml(rId)}" style="display:inline-block;vertical-align:middle;${sizeCss}" alt="" />`,
      heightPx: hPx || 80
    };
  }

  /** রান (w:r) রেন্ডারিং */
  function renderRun(rNode, pRPr, ctx) {
    const rPr = findChild(rNode, 'rPr');
    const styles = [];

    const pickNode = (name) => (rPr && findChild(rPr, name)) || (pRPr && findChild(pRPr, name)) || null;

    const rFonts = pickNode('rFonts');
    const fontName = (rFonts && (getAttr(rFonts, 'cs') || getAttr(rFonts, 'ascii') || getAttr(rFonts, 'hAnsi'))) || ctx.defaults.font || 'Kalpurush';
    if (fontName) styles.push(`font-family:'${escHtml(fontName)}',sans-serif`);

    const szNode = pickNode('sz') || pickNode('szCs');
    const szHalfPt = szNode && getAttr(szNode, 'val') ? Number(getAttr(szNode, 'val')) : ctx.defaults.szHalfPt;
    const fontPt = (szHalfPt || 24) / 2;
    styles.push(`font-size:${fontPt}pt`);

    const isBold = isOnVal(pickNode('b')) || isOnVal(pickNode('bCs'));
    if (isBold) styles.push('font-weight:bold');

    const isItalic = isOnVal(pickNode('i')) || isOnVal(pickNode('iCs'));
    if (isItalic) styles.push('font-style:italic');

    const uNode = pickNode('u');
    if (uNode && isOnVal(uNode)) {
      const uVal = String(getAttr(uNode, 'val') || 'single').toLowerCase();
      styles.push('text-decoration:underline');
      if (uVal === 'double') styles.push('text-decoration-style:double');
      else if (uVal === 'dotted') styles.push('text-decoration-style:dotted');
      else if (uVal === 'dash' || uVal === 'dashed') styles.push('text-decoration-style:dashed');
      else if (uVal === 'wave') styles.push('text-decoration-style:wavy');
    }

    const colorNode = pickNode('color');
    if (colorNode) {
      const cVal = String(getAttr(colorNode, 'val') || '').replace(/^#/, '');
      if (cVal && cVal.toLowerCase() !== 'auto') styles.push(`color:#${escHtml(cVal)}`);
    }

    const shdNode = pickNode('shd');
    if (shdNode) {
      const fill = String(getAttr(shdNode, 'fill') || '').replace(/^#/, '');
      if (fill && fill.toLowerCase() !== 'auto') styles.push(`background-color:#${escHtml(fill)}`);
    }

    const vertNode = pickNode('vertAlign');
    const vertVal = vertNode ? String(getAttr(vertNode, 'val') || '').toLowerCase() : '';

    const parts = [];
    let hasPageBreak = false;
    let hasColumnBreak = false;
    let maxImgHeightPx = 0;

    for (const c of rNode.children || []) {
      if (isTag(c, 'rPr')) continue;
      if (isTag(c, 't')) {
        const txt = textOf(c);
        const spaceAttr = getAttr(c, 'space');
        const htmlTxt = escHtml(txt);
        parts.push(spaceAttr === 'preserve' ? htmlTxt.replace(/  /g, ' &nbsp;') : htmlTxt);
      } else if (isTag(c, 'tab')) {
        parts.push({ type: 'tab' });
      } else if (isTag(c, 'br')) {
        const brType = String(getAttr(c, 'type') || 'textWrapping').toLowerCase();
        if (brType === 'page') {
          hasPageBreak = true;
        } else if (brType === 'column') {
          hasColumnBreak = true;
          parts.push('<span class="fz-col-break" style="break-after:column;display:block;"></span>');
        } else {
          parts.push('<br/>');
        }
      } else if (isTag(c, 'drawing') || isTag(c, 'pict')) {
        const dr = renderDrawing(c, ctx);
        if (dr.heightPx > maxImgHeightPx) maxImgHeightPx = dr.heightPx;
        parts.push(dr.html);
      } else if (isTag(c, 'sym')) {
        const ch = getAttr(c, 'char') || '';
        if (ch) parts.push(escHtml(String.fromCodePoint(parseInt(ch, 16) || 0x2022)));
      }
    }

    const wrapSpan = (innerHtml) => {
      if (!innerHtml) return '';
      const styleStr = styles.join(';');
      if (vertVal === 'superscript') {
        return `<sup class="fz-run fz-sup" style="${styleStr}">${innerHtml}</sup>`;
      }
      if (vertVal === 'subscript') {
        return `<sub class="fz-run fz-sub" style="${styleStr}">${innerHtml}</sub>`;
      }
      return `<span class="fz-run" style="${styleStr}">${innerHtml}</span>`;
    };

    const segments = [];
    let curBuf = '';
    for (const p of parts) {
      if (typeof p === 'object' && p.type === 'tab') {
        if (curBuf) { segments.push({ type: 'html', html: wrapSpan(curBuf) }); curBuf = ''; }
        segments.push({ type: 'tab', fontPt });
      } else {
        curBuf += p;
      }
    }
    if (curBuf) segments.push({ type: 'html', html: wrapSpan(curBuf) });

    return { segments, fontPt, hasPageBreak, hasColumnBreak, maxImgHeightPx, plainText: textOf(rNode) };
  }

  /** অনুচ্ছেদ (w:p) রেন্ডারিং ও উচ্চতা প্রাক্কলন */
  function renderParagraph(pNode, ctx, colWidthPx) {
    const pIndex = ctx.paragraphCounter++;
    const pPr = findChild(pNode, 'pPr');
    const pStyleNode = pPr ? findChild(pPr, 'pStyle') : null;
    const styleId = pStyleNode ? getAttr(pStyleNode, 'val') : null;
    const styleDef = (styleId && ctx.defaults.stylesById[styleId]) || {};
    const pRPr = (pPr && findChild(pPr, 'rPr')) || styleDef.rPr || null;

    const inlineSectNode = pPr ? findChild(pPr, 'sectPr') : null;
    const pageBreakBefore = pPr ? isOnVal(findChild(pPr, 'pageBreakBefore')) : false;

    const pStyles = ['margin:0', 'padding:0', 'box-sizing:border-box'];

    // অবস্থান (w:jc)
    const jcNode = (pPr && findChild(pPr, 'jc')) || (styleDef.pPr && findChild(styleDef.pPr, 'jc'));
    const jcVal = jcNode ? String(getAttr(jcNode, 'val') || 'left').toLowerCase() : 'left';
    const cssAlign = (jcVal === 'both' || jcVal === 'distribute' || jcVal === 'justify')
      ? 'justify'
      : (jcVal === 'center' || jcVal === 'right' ? jcVal : 'left');
    pStyles.push(`text-align:${cssAlign}`);

    // ইনডেন্ট (w:ind)
    const indNode = (pPr && findChild(pPr, 'ind')) || (styleDef.pPr && findChild(styleDef.pPr, 'ind'));
    let leftIndPx = 0, rightIndPx = 0;
    if (indNode) {
      const leftTw = Number(getAttr(indNode, 'left') ?? getAttr(indNode, 'start') ?? 0);
      const rightTw = Number(getAttr(indNode, 'right') ?? getAttr(indNode, 'end') ?? 0);
      const firstLineTw = Number(getAttr(indNode, 'firstLine') || 0);
      const hangingTw = Number(getAttr(indNode, 'hanging') || 0);
      if (leftTw) { leftIndPx = twipToPx(leftTw); pStyles.push(`padding-left:${leftIndPx}px`); }
      if (rightTw) { rightIndPx = twipToPx(rightTw); pStyles.push(`padding-right:${rightIndPx}px`); }
      if (hangingTw) pStyles.push(`text-indent:-${twipToPx(hangingTw)}px`);
      else if (firstLineTw) pStyles.push(`text-indent:${twipToPx(firstLineTw)}px`);
    }

    // স্পেসিং (w:spacing)
    const spcNode = (pPr && findChild(pPr, 'spacing')) || (styleDef.pPr && findChild(styleDef.pPr, 'spacing'));
    let beforePx = 0, afterPx = 0, lineMult = 1.2, exactLinePx = 0;
    if (spcNode) {
      if (getAttr(spcNode, 'before') !== undefined) {
        beforePx = twipToPx(getAttr(spcNode, 'before'), 0);
        pStyles.push(`margin-top:${beforePx}px`);
      }
      if (getAttr(spcNode, 'after') !== undefined) {
        afterPx = twipToPx(getAttr(spcNode, 'after'), 0);
        pStyles.push(`margin-bottom:${afterPx}px`);
      }
      const lineVal = Number(getAttr(spcNode, 'line') || 0);
      const lineRule = String(getAttr(spcNode, 'lineRule') || 'auto').toLowerCase();
      if (lineVal > 0) {
        if (lineRule === 'exact' || lineRule === 'atleast') {
          exactLinePx = twipToPx(lineVal, 16);
          pStyles.push(`line-height:${exactLinePx}px`);
        } else {
          lineMult = Math.max(0.85, Math.round((lineVal / 240) * 1.15 * 100) / 100);
          pStyles.push(`line-height:${lineMult}`);
        }
      }
    } else {
      pStyles.push('line-height:1.2');
    }

    // অনুচ্ছেদ বর্ডার (w:pBdr)
    const pBdr = pPr ? findChild(pPr, 'pBdr') : null;
    if (pBdr) {
      for (const side of ['top', 'bottom', 'left', 'right']) {
        const bNode = findChild(pBdr, side);
        if (bNode) {
          const cssB = borderNodeToCss(bNode);
          if (cssB && cssB !== 'none') pStyles.push(`border-${side}:${cssB}`);
        }
      }
    }

    // অনুচ্ছেদ শেডিং (w:shd)
    const pShd = pPr ? findChild(pPr, 'shd') : null;
    if (pShd) {
      const fill = String(getAttr(pShd, 'fill') || '').replace(/^#/, '');
      if (fill && fill.toLowerCase() !== 'auto') pStyles.push(`background-color:#${escHtml(fill)}`);
    }

    // ট্যাব-স্টপ তালিকা (w:tabs -> w:tab)
    const tabsNode = pPr ? findChild(pPr, 'tabs') : null;
    const tabStops = tabsNode ? findChildren(tabsNode, 'tab').map((t) => ({
      val: String(getAttr(t, 'val') || 'left').toLowerCase(),
      posTwip: Number(getAttr(t, 'pos') || 0),
      posPx: twipToPx(getAttr(t, 'pos') || 0, 0),
      leader: String(getAttr(t, 'leader') || 'none').toLowerCase()
    })) : [];

    // অনুচ্ছেদের ভেতরের রান ও সমীকরণ সংগ্রহ
    const allSegments = [];
    let maxFontPt = ctx.defaults.szHalfPt / 2;
    let maxImgHeightPx = 0;
    let totalChars = 0;
    let hasRunPageBreak = false;
    let hasColumnBreak = false;

    const collectInline = (parent) => {
      for (const child of parent.children || []) {
        if (isTag(child, 'pPr')) continue;
        if (isTag(child, 'r')) {
          const rr = renderRun(child, pRPr, ctx);
          if (rr.fontPt > maxFontPt) maxFontPt = rr.fontPt;
          if (rr.maxImgHeightPx > maxImgHeightPx) maxImgHeightPx = rr.maxImgHeightPx;
          if (rr.hasPageBreak) hasRunPageBreak = true;
          if (rr.hasColumnBreak) hasColumnBreak = true;
          totalChars += rr.plainText.length;
          allSegments.push(...rr.segments);
        } else if (isTag(child, 'oMath') || isTag(child, 'oMathPara')) {
          const ommlHtml = renderOmmlNode(child, ctx);
          totalChars += textOf(child).length + 4;
          allSegments.push({ type: 'html', html: ommlHtml });
        } else if (isTag(child, 'hyperlink') || isTag(child, 'smartTag') || isTag(child, 'sdtContent')) {
          collectInline(child);
        }
      }
    };
    collectInline(pNode);

    // ট্যাব ও লিডার রেন্ডারিং
    let tabIdx = 0;
    let hasLeaderOrFlexTab = false;
    const renderedParts = allSegments.map((seg) => {
      if (seg.type !== 'tab') return seg.html;
      const stop = tabStops[tabIdx] || tabStops[tabStops.length - 1] || { val: 'left', posTwip: 720, posPx: 48, leader: 'none' };
      tabIdx++;
      const leader = stop.leader;
      const hasDotLeader = leader === 'dot' || leader === 'middledot' || leader === 'dotted';
      const hasDashLeader = leader === 'hyphen' || leader === 'dashed';
      const hasUnderLeader = leader === 'underscore' || leader === 'heavy';
      let leaderCss = 'display:inline-block;min-width:24px;';
      if (stop.posPx > 0 && stop.val === 'left' && !hasDotLeader && !hasDashLeader && !hasUnderLeader) {
        const wPx = Math.max(16, Math.min(240, Math.round(stop.posPx - leftIndPx)));
        leaderCss = `display:inline-block;min-width:${wPx}px;`;
      }
      if (hasDotLeader || hasDashLeader || hasUnderLeader || stop.val === 'right' || stop.val === 'center') {
        hasLeaderOrFlexTab = true;
        const bStyle = hasDotLeader ? '1px dotted currentColor' : (hasDashLeader ? '1px dashed currentColor' : (hasUnderLeader ? '1px solid currentColor' : 'none'));
        leaderCss = `display:inline-block;flex:1 1 24px;min-width:24px;border-bottom:${bStyle};margin:0 4px;transform:translateY(-0.22em);`;
      }
      const cls = `fz-tab${leader && leader !== 'none' ? ' fz-tab-leader fz-tab-leader-' + escHtml(leader) : ''}`;
      return `<span class="${cls}" data-tab-val="${escHtml(stop.val)}" data-tab-pos="${stop.posTwip}" data-leader="${escHtml(leader)}" style="${leaderCss}">&nbsp;</span>`;
    });

    if (hasLeaderOrFlexTab) {
      pStyles.push('display:flex', 'align-items:baseline', 'flex-wrap:wrap');
    }

    const innerHtml = renderedParts.join('') || '&nbsp;';
    const html = `<p class="fz-p" data-fz-p="${pIndex}" data-jc="${escHtml(jcVal)}" style="${pStyles.join(';')}">${innerHtml}</p>`;

    // উচ্চতা প্রাক্কলন (স্বয়ংক্রিয় পাতা-ভাগের জন্য)
    const fontPx = maxFontPt * PT_TO_PX;
    const singleLinePx = exactLinePx > 0 ? exactLinePx : Math.max(14, fontPx * lineMult);
    const availW = Math.max(80, (colWidthPx || 600) - leftIndPx - rightIndPx);
    const avgCharW = Math.max(6, fontPx * 0.55);
    const estLines = Math.max(1, Math.ceil((totalChars * avgCharW) / availW));
    const estHeightPx = Math.round(beforePx + afterPx + Math.max(estLines * singleLinePx, maxImgHeightPx));

    return {
      type: 'paragraph',
      pIndex,
      html,
      estHeightPx,
      pageBreakBefore,
      hasRunPageBreak,
      hasColumnBreak,
      inlineSectPr: inlineSectNode ? parseSectPr(inlineSectNode) : null
    };
  }

  /** টেবিল (w:tbl) রেন্ডারিং (grid, gridSpan, vMerge, বর্ডার, ঘর-মার্জিন, শেডিং) */
  function renderTable(tblNode, ctx, colWidthPx) {
    const tblPr = findChild(tblNode, 'tblPr');
    const tblGrid = findChild(tblNode, 'tblGrid');
    const gridCols = tblGrid ? findChildren(tblGrid, 'gridCol').map((c) => twipToPx(getAttr(c, 'w'), 0)) : [];

    const tblStyles = ['border-collapse:collapse', 'box-sizing:border-box', 'margin:4px 0'];
    const tblW = tblPr ? findChild(tblPr, 'tblW') : null;
    if (tblW) {
      const wType = String(getAttr(tblW, 'type') || 'dxa').toLowerCase();
      const wVal = Number(getAttr(tblW, 'w') || 0);
      if (wType === 'pct' && wVal > 0) tblStyles.push(`width:${Math.min(100, Math.round(wVal / 50))}%`);
      else if (wType === 'dxa' && wVal > 0) tblStyles.push(`width:${Math.min(colWidthPx || 9999, twipToPx(wVal))}px`);
      else tblStyles.push('width:100%');
    } else {
      tblStyles.push('width:100%');
    }

    const jcNode = tblPr ? findChild(tblPr, 'jc') : null;
    const tblJc = jcNode ? String(getAttr(jcNode, 'val') || 'left').toLowerCase() : 'left';
    if (tblJc === 'center') tblStyles.push('margin-left:auto', 'margin-right:auto');
    else if (tblJc === 'right') tblStyles.push('margin-left:auto');

    // টেবিল বর্ডার (w:tblBorders)
    const tblBordersNode = tblPr ? findChild(tblPr, 'tblBorders') : null;
    const tblBorders = {};
    if (tblBordersNode) {
      for (const side of ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']) {
        tblBorders[side] = borderNodeToCss(findChild(tblBordersNode, side));
      }
    }

    // ডিফল্ট ঘর-মার্জিন (w:tblCellMar)
    const tblCellMarNode = tblPr ? findChild(tblPr, 'tblCellMar') : null;
    const defaultPad = {
      top: tblCellMarNode && findChild(tblCellMarNode, 'top') ? twipToPx(getAttr(findChild(tblCellMarNode, 'top'), 'w'), 3) : 3,
      right: tblCellMarNode && findChild(tblCellMarNode, 'right') ? twipToPx(getAttr(findChild(tblCellMarNode, 'right'), 'w'), 5) : 5,
      bottom: tblCellMarNode && findChild(tblCellMarNode, 'bottom') ? twipToPx(getAttr(findChild(tblCellMarNode, 'bottom'), 'w'), 3) : 3,
      left: tblCellMarNode && findChild(tblCellMarNode, 'left') ? twipToPx(getAttr(findChild(tblCellMarNode, 'left'), 'w'), 5) : 5
    };

    const trNodes = findChildren(tblNode, 'tr');
    // ১ম ধাপ: প্রতিটি সারি ও ঘরের গ্রিড-অবস্থান নির্ণয় এবং vMerge (rowspan) গণনা
    const matrix = [];
    const activeVMerge = {}; // colIndex -> cellDesc (restart cell)

    for (let rIdx = 0; rIdx < trNodes.length; rIdx++) {
      const tr = trNodes[rIdx];
      const trPr = findChild(tr, 'trPr');
      const isHeader = trPr ? isOnVal(findChild(trPr, 'tblHeader')) : false;
      const trHeightNode = trPr ? findChild(trPr, 'trHeight') : null;
      const trHeightPx = trHeightNode && getAttr(trHeightNode, 'val') ? twipToPx(getAttr(trHeightNode, 'val'), 0) : 0;

      const tcNodes = findChildren(tr, 'tc');
      const rowCells = [];
      let colCursor = 0;

      for (const tc of tcNodes) {
        const tcPr = findChild(tc, 'tcPr');
        const gsNode = tcPr ? findChild(tcPr, 'gridSpan') : null;
        const colspan = gsNode && getAttr(gsNode, 'val') ? Math.max(1, Number(getAttr(gsNode, 'val'))) : 1;

        const vmNode = tcPr ? findChild(tcPr, 'vMerge') : null;
        let vMergeState = null; // null | 'restart' | 'continue'
        if (vmNode) {
          const vmVal = getAttr(vmNode, 'val');
          vMergeState = (vmVal && String(vmVal).toLowerCase() === 'restart') ? 'restart' : 'continue';
        }

        const cellDesc = {
          tc,
          tcPr,
          rIdx,
          colStart: colCursor,
          colspan,
          rowspan: 1,
          vMergeState,
          skip: false
        };

        if (vMergeState === 'continue') {
          const master = activeVMerge[colCursor];
          if (master) {
            master.rowspan++;
            cellDesc.skip = true;
          } else {
            cellDesc.vMergeState = 'restart';
            for (let c = colCursor; c < colCursor + colspan; c++) activeVMerge[c] = cellDesc;
          }
        } else if (vMergeState === 'restart') {
          for (let c = colCursor; c < colCursor + colspan; c++) activeVMerge[c] = cellDesc;
        } else {
          for (let c = colCursor; c < colCursor + colspan; c++) delete activeVMerge[c];
        }

        rowCells.push(cellDesc);
        colCursor += colspan;
      }

      matrix.push({ rIdx, isHeader, trHeightPx, cells: rowCells });
    }

    // ২য় ধাপ: প্রতিটি সারি ও ঘরের HTML তৈরি ও উচ্চতা প্রাক্কলন
    const colGroupHtml = gridCols.length
      ? `<colgroup>${gridCols.map((w) => `<col style="width:${w}px"/>`).join('')}</colgroup>`
      : '';

    const renderedRows = [];
    let totalTableHeightPx = 8;

    for (let rIdx = 0; rIdx < matrix.length; rIdx++) {
      const row = matrix[rIdx];
      let rowMaxCellHeightPx = Math.max(20, row.trHeightPx);
      const cellHtmls = [];

      for (const cell of row.cells) {
        if (cell.skip) continue;
        const { tc, tcPr, colspan, rowspan } = cell;
        const tdStyles = ['box-sizing:border-box'];

        // বর্ডার নির্ণয় (tcBorders অগ্রাধিকার পাবে, নইলে tblBorders)
        const tcBordersNode = tcPr ? findChild(tcPr, 'tcBorders') : null;
        for (const side of ['top', 'right', 'bottom', 'left']) {
          const tcB = tcBordersNode ? borderNodeToCss(findChild(tcBordersNode, side)) : '';
          let bCss = tcB;
          if (!bCss) {
            if (side === 'top') bCss = rIdx === 0 ? tblBorders.top : (tblBorders.insideH || tblBorders.top);
            else if (side === 'bottom') bCss = (rIdx + rowspan >= matrix.length) ? tblBorders.bottom : (tblBorders.insideH || tblBorders.bottom);
            else if (side === 'left') bCss = cell.colStart === 0 ? tblBorders.left : (tblBorders.insideV || tblBorders.left);
            else if (side === 'right') bCss = tblBorders.insideV || tblBorders.right;
          }
          if (bCss && bCss !== 'none') tdStyles.push(`border-${side}:${bCss}`);
          else if (bCss === 'none') tdStyles.push(`border-${side}:none`);
        }

        // ঘর-মার্জিন (tcMar / tblCellMar)
        const tcMarNode = tcPr ? findChild(tcPr, 'tcMar') : null;
        const padTop = tcMarNode && findChild(tcMarNode, 'top') ? twipToPx(getAttr(findChild(tcMarNode, 'top'), 'w'), defaultPad.top) : defaultPad.top;
        const padRight = tcMarNode && findChild(tcMarNode, 'right') ? twipToPx(getAttr(findChild(tcMarNode, 'right'), 'w'), defaultPad.right) : defaultPad.right;
        const padBottom = tcMarNode && findChild(tcMarNode, 'bottom') ? twipToPx(getAttr(tcMarNode, 'bottom'), defaultPad.bottom) : defaultPad.bottom;
        const padLeft = tcMarNode && findChild(tcMarNode, 'left') ? twipToPx(getAttr(findChild(tcMarNode, 'left'), 'w'), defaultPad.left) : defaultPad.left;
        tdStyles.push(`padding:${padTop}px ${padRight}px ${padBottom}px ${padLeft}px`);

        // ঘরের প্রস্থ (w:tcW)
        const tcWNode = tcPr ? findChild(tcPr, 'tcW') : null;
        let cellWidthPx = 0;
        if (tcWNode) {
          const wType = String(getAttr(tcWNode, 'type') || 'dxa').toLowerCase();
          const wVal = Number(getAttr(tcWNode, 'w') || 0);
          if (wType === 'dxa' && wVal > 0) {
            cellWidthPx = twipToPx(wVal);
            tdStyles.push(`width:${cellWidthPx}px`);
          } else if (wType === 'pct' && wVal > 0) {
            tdStyles.push(`width:${Math.round(wVal / 50)}%`);
          }
        } else if (gridCols[cell.colStart]) {
          cellWidthPx = gridCols.slice(cell.colStart, cell.colStart + colspan).reduce((a, b) => a + b, 0);
          if (cellWidthPx > 0) tdStyles.push(`width:${cellWidthPx}px`);
        }

        // ঘরের শেডিং (w:shd)
        const shdNode = tcPr ? findChild(tcPr, 'shd') : null;
        if (shdNode) {
          const fill = String(getAttr(shdNode, 'fill') || '').replace(/^#/, '');
          if (fill && fill.toLowerCase() !== 'auto') tdStyles.push(`background-color:#${escHtml(fill)}`);
        }

        // উল্লম্ব অবস্থান (w:vAlign)
        const vAlignNode = tcPr ? findChild(tcPr, 'vAlign') : null;
        const vAlignVal = vAlignNode ? String(getAttr(vAlignNode, 'val') || 'top').toLowerCase() : 'top';
        tdStyles.push(`vertical-align:${vAlignVal === 'center' ? 'middle' : (vAlignVal === 'bottom' ? 'bottom' : 'top')}`);

        // ঘরের ভেতরের অনুচ্ছেদ ও টেবিল রেন্ডারিং
        const innerHtmls = [];
        let cellContentHeightPx = padTop + padBottom;
        for (const child of tc.children || []) {
          if (isTag(child, 'p')) {
            const pr = renderParagraph(child, ctx, cellWidthPx || Math.round((colWidthPx || 600) / Math.max(1, row.cells.length)));
            innerHtmls.push(pr.html);
            cellContentHeightPx += pr.estHeightPx;
          } else if (isTag(child, 'tbl')) {
            const subTbl = renderTable(child, ctx, cellWidthPx || 200);
            innerHtmls.push(subTbl.html);
            cellContentHeightPx += subTbl.estHeightPx;
          }
        }

        if (cellContentHeightPx / rowspan > rowMaxCellHeightPx) {
          rowMaxCellHeightPx = Math.round(cellContentHeightPx / rowspan);
        }

        const tag = row.isHeader ? 'th' : 'td';
        const spanAttrs = (colspan > 1 ? ` colspan="${colspan}"` : '') + (rowspan > 1 ? ` rowspan="${rowspan}"` : '');
        cellHtmls.push(`<${tag} class="fz-tc"${spanAttrs} style="${tdStyles.join(';')}">${innerHtmls.join('')}</${tag}>`);
      }

      const trStyle = row.trHeightPx > 0 ? ` style="height:${row.trHeightPx}px;"` : '';
      const trHtml = `<tr class="fz-tr${row.isHeader ? ' fz-tr-header' : ''}" data-row="${rIdx}"${trStyle}>${cellHtmls.join('')}</tr>`;
      renderedRows.push({ rIdx, isHeader: row.isHeader, html: trHtml, estHeightPx: rowMaxCellHeightPx });
      totalTableHeightPx += rowMaxCellHeightPx;
    }

    const buildTableHtml = (rowsSlice) =>
      `<table class="fz-tbl" style="${tblStyles.join(';')}">${colGroupHtml}<tbody>${rowsSlice.map((r) => r.html).join('')}</tbody></table>`;

    return {
      type: 'table',
      html: buildTableHtml(renderedRows),
      estHeightPx: totalTableHeightPx,
      rows: renderedRows,
      buildTableHtml
    };
  }

  /**
   * ডকুমেন্টের বডি থেকে সেকশন ও পাতা ভাগ (.fz-page) তৈরি করা।
   * উচ্চতা মেপে স্বয়ংক্রিয়ভাবে নতুন পাতা (.fz-page) খোলে।
   */
  function paginateDocument(bodyNode, ctx) {
    const bodyChildren = (bodyNode && bodyNode.children) || [];
    const finalSectNode = findChild(bodyNode, 'sectPr');
    const finalSect = parseSectPr(finalSectNode);

    // বডির প্রতিটি ব্লককে তার কার্যকর সেকশনে ভাগ করা
    const rawBlocks = [];
    for (const node of bodyChildren) {
      if (isTag(node, 'sectPr')) continue;
      if (isTag(node, 'p') || isTag(node, 'tbl')) rawBlocks.push(node);
    }

    // ইনলাইন sectPr অনুযায়ী সেকশন তালিকা তৈরি
    const sections = [];
    let currentNodes = [];
    for (const node of rawBlocks) {
      currentNodes.push(node);
      if (isTag(node, 'p')) {
        const pPr = findChild(node, 'pPr');
        const sNode = pPr ? findChild(pPr, 'sectPr') : null;
        if (sNode) {
          sections.push({ nodes: currentNodes, sectPr: parseSectPr(sNode, finalSect) });
          currentNodes = [];
        }
      }
    }
    if (currentNodes.length || !sections.length) {
      sections.push({ nodes: currentNodes, sectPr: finalSect });
    }

    const pages = [];
    let curPage = null;

    const openNewPage = (sect) => {
      curPage = {
        index: pages.length,
        sectPr: sect,
        segments: [],
        usedHeightPx: 0,
        availHeightPx: sect.contentHeightPx
      };
      pages.push(curPage);
      return curPage;
    };

    const ensureSegment = (sect) => {
      if (!curPage) openNewPage(sect);
      let seg = curPage.segments[curPage.segments.length - 1];
      if (!seg || seg.cols !== sect.cols || seg.colGapPx !== sect.colGapPx || seg.colSep !== sect.colSep) {
        seg = { cols: sect.cols, colGapPx: sect.colGapPx, colSep: sect.colSep, items: [] };
        curPage.segments.push(seg);
      }
      return seg;
    };

    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx];
      const sect = sec.sectPr;
      const isContinuous = sIdx > 0 && String(sect.type || '').toLowerCase() === 'continuous';

      if (!curPage) {
        openNewPage(sect);
      } else if (!isContinuous) {
        const hasItems = curPage.segments.some((sg) => sg.items.length > 0);
        if (hasItems) openNewPage(sect);
        else curPage.sectPr = sect;
      }

      const colWidthPx = sect.cols > 1
        ? Math.floor((sect.contentWidthPx - (sect.cols - 1) * sect.colGapPx) / sect.cols)
        : sect.contentWidthPx;
      const heightFactor = 1 / Math.max(1, sect.cols);

      for (const node of sec.nodes) {
        if (isTag(node, 'p')) {
          const pItem = renderParagraph(node, ctx, colWidthPx);
          const hasContentOnPage = curPage.segments.some((sg) => sg.items.length > 0);

          if (pItem.pageBreakBefore && hasContentOnPage) {
            openNewPage(sect);
          }

          const deltaH = pItem.estHeightPx * heightFactor;
          if (hasContentOnPage && curPage.usedHeightPx + deltaH > curPage.availHeightPx) {
            openNewPage(sect);
          }

          const isPureBreakParagraph = pItem.hasRunPageBreak && !textOf(node).trim();
          if (!isPureBreakParagraph) {
            ensureSegment(sect).items.push(pItem.html);
            curPage.usedHeightPx += deltaH;
          }

          if (pItem.hasRunPageBreak) {
            openNewPage(sect);
          }
        } else if (isTag(node, 'tbl')) {
          const tItem = renderTable(node, ctx, colWidthPx);
          const hasContentOnPage = curPage.segments.some((sg) => sg.items.length > 0);
          const deltaH = tItem.estHeightPx * heightFactor;

          if (curPage.usedHeightPx + deltaH <= curPage.availHeightPx) {
            ensureSegment(sect).items.push(tItem.html);
            curPage.usedHeightPx += deltaH;
          } else if (tItem.rows.length > 2) {
            // লম্বা টেবিল একাধিক পাতায় ভাগ করা (শিরোনাম সারি পুনরাবৃত্তিসহ)
            const headerRows = tItem.rows.filter((r) => r.isHeader);
            const headerH = headerRows.reduce((a, r) => a + r.estHeightPx, 0);
            let chunk = [];

            for (const row of tItem.rows) {
              const rowDelta = row.estHeightPx * heightFactor;
              if (chunk.length > 0 && curPage.usedHeightPx + rowDelta > curPage.availHeightPx) {
                ensureSegment(sect).items.push(tItem.buildTableHtml(chunk));
                openNewPage(sect);
                chunk = headerRows.length && !row.isHeader ? headerRows.slice() : [];
                curPage.usedHeightPx += headerH * heightFactor;
              }
              chunk.push(row);
              curPage.usedHeightPx += rowDelta;
            }
            if (chunk.length) {
              ensureSegment(sect).items.push(tItem.buildTableHtml(chunk));
            }
          } else {
            if (hasContentOnPage) openNewPage(sect);
            ensureSegment(sect).items.push(tItem.html);
            curPage.usedHeightPx += deltaH;
          }
        }
      }
    }

    // শেষে খালি অতিরিক্ত পাতা তৈরি হয়ে থাকলে এবং আগে অন্তত ১টি পাতা থাকলে ছাঁটা
    while (pages.length > 1 && !pages[pages.length - 1].segments.some((sg) => sg.items.length > 0)) {
      pages.pop();
    }

    return pages.map((pg, idx) => {
      const s = pg.sectPr;
      const pageStyles = [
        `width:${s.widthPx}px`,
        `min-height:${s.heightPx}px`,
        `padding:${s.marginPx.top}px ${s.marginPx.right}px ${s.marginPx.bottom}px ${s.marginPx.left}px`,
        'background:#ffffff',
        'color:#000000',
        'box-sizing:border-box',
        'position:relative',
        'overflow:hidden',
        `font-family:'${escHtml(ctx.defaults.font)}',sans-serif`
      ];

      const segHtmls = pg.segments.map((sg) => {
        if (sg.cols > 1) {
          const colRule = sg.colSep ? 'column-rule:1px solid #000000;' : '';
          return `<div class="fz-cols" data-cols="${sg.cols}" style="column-count:${sg.cols};column-gap:${sg.colGapPx}px;${colRule}">${sg.items.join('')}</div>`;
        }
        return `<div class="fz-cols" data-cols="1">${sg.items.join('')}</div>`;
      });

      const pageHtml = `<div class="fz-page${s.orient === 'landscape' ? ' fz-landscape' : ''}" data-page="${idx + 1}" data-orient="${s.orient}" data-width-px="${s.widthPx}" data-height-px="${s.heightPx}" style="${pageStyles.join(';')}">${segHtmls.join('')}</div>`;
      return {
        index: idx,
        pageNumber: idx + 1,
        orient: s.orient,
        widthPx: s.widthPx,
        heightPx: s.heightPx,
        sectPr: s,
        html: pageHtml,
        toString() { return pageHtml; }
      };
    });
  }

  /** .docx ফাইল (Blob / ArrayBuffer / Uint8Array / Buffer) আনপ্যাক ও পার্স করা */
  async function parseDocx(docxBlobOrArrayBuffer, opts = {}) {
    if (global.__FZ_ON_DOCX_PREVIEW === false) return null;
    if (!docxBlobOrArrayBuffer) throw new Error('docxBlobOrArrayBuffer আবশ্যক।');

    let docXmlStr = '';
    let stylesXmlStr = '';
    let relsXmlStr = '';
    const mediaByRelId = {};

    if (typeof docxBlobOrArrayBuffer === 'object' && docxBlobOrArrayBuffer.documentXml) {
      docXmlStr = docxBlobOrArrayBuffer.documentXml;
      stylesXmlStr = docxBlobOrArrayBuffer.stylesXml || '';
      relsXmlStr = docxBlobOrArrayBuffer.relsXml || '';
      Object.assign(mediaByRelId, docxBlobOrArrayBuffer.mediaByRelId || {});
    } else {
      const JSZip = resolveJSZip(opts);
      let input = docxBlobOrArrayBuffer;
      if (typeof Blob !== 'undefined' && input instanceof Blob && typeof input.arrayBuffer === 'function') {
        input = await input.arrayBuffer();
      }
      const zip = await JSZip.loadAsync(input);
      const docFile = zip.file('word/document.xml');
      if (!docFile) throw new Error('word/document.xml পাওয়া যায়নি।');
      docXmlStr = await docFile.async('string');

      const stylesFile = zip.file('word/styles.xml');
      if (stylesFile) stylesXmlStr = await stylesFile.async('string');

      const relsFile = zip.file('word/_rels/document.xml.rels');
      if (relsFile) relsXmlStr = await relsFile.async('string');

      const relsMap = parseRels(parseXml(relsXmlStr));
      for (const [rId, target] of Object.entries(relsMap)) {
        if (/^data:|^https?:/i.test(target)) {
          mediaByRelId[rId] = target;
          continue;
        }
        const cleanTarget = target.replace(/^\/+/, '');
        const zipPath = cleanTarget.startsWith('word/') ? cleanTarget : 'word/' + cleanTarget;
        const mFile = zip.file(zipPath) || zip.file(cleanTarget);
        if (mFile) {
          const b64 = await mFile.async('base64');
          mediaByRelId[rId] = `data:${mimeFromPath(zipPath)};base64,${b64}`;
        }
      }
    }

    const docRoot = parseXml(docXmlStr);
    const stylesRoot = stylesXmlStr ? parseXml(stylesXmlStr) : null;
    const defaults = parseStylesDefaults(stylesRoot);

    const docNode = findChild(docRoot, 'document') || docRoot;
    const bodyNode = findChild(docNode, 'body') || docNode;

    const ctx = {
      defaults,
      mediaByRelId,
      paragraphCounter: 0,
      opts
    };

    const pages = paginateDocument(bodyNode, ctx);
    const html = pages.map((p) => p.html).join('');

    return {
      pages,
      pageCount: pages.length,
      html,
      paragraphCount: ctx.paragraphCounter,
      defaults
    };
  }

  /** DOM ছাড়াই সরাসরি HTML স্ট্রিং তৈরির সহায়ক (Node টেস্ট ও SSR-এর জন্য) */
  async function renderToHtmlString(docxBlobOrArrayBuffer, opts = {}) {
    if (global.__FZ_ON_DOCX_PREVIEW === false) return null;
    const res = await parseDocx(docxBlobOrArrayBuffer, opts);
    return res ? res.html : null;
  }

  /**
   * মূল রেন্ডার ফাংশন: মাস্টার .docx থেকে containerEl-এ `.fz-page` পাতাগুলো আঁকে।
   * @param {Blob|ArrayBuffer|Uint8Array|Buffer|Object} docxBlobOrArrayBuffer
   * @param {HTMLElement|Object|null} containerEl
   * @param {Object} [opts]
   * @returns {Promise<{pages: Array, pageCount: number, html: string, paragraphCount: number}|null>}
   */
  async function render(docxBlobOrArrayBuffer, containerEl, opts = {}) {
    if (global.__FZ_ON_DOCX_PREVIEW === false) return null;
    const res = await parseDocx(docxBlobOrArrayBuffer, opts);
    if (!res) return null;

    if (containerEl && typeof containerEl === 'object') {
      containerEl.innerHTML = res.html;
      if (typeof containerEl.querySelectorAll === 'function') {
        const domPages = Array.from(containerEl.querySelectorAll('.fz-page'));
        if (domPages.length) {
          res.pageElements = domPages;
        }
      }
    }
    return res;
  }

  const FayzarDocxPreview = {
    PT_TO_PX,
    TWIP_TO_PT,
    TWIP_TO_PX,
    parseXml,
    parseDocx,
    renderToHtmlString,
    render
  };

  global.FayzarDocxPreview = FayzarDocxPreview;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FayzarDocxPreview;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
