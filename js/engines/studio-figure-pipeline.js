/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Fayzar Studio — Figure Pipeline (Part-14.0 · P0-1 + P0-3)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * সমস্যা যা এই মডিউল সমাধান করে (রিভিউ: Reviews/studio-v4-review.md):
 *   • P0-1: প্রিভিউতে বসানো চিত্র (SVG/ছবি) কোনো এক্সপোর্টেই যেত না
 *           (.docx-এ word/media শূন্য, .doc-এ কোনো ছবি নেই)।
 *   • P0-3: চিত্র শুধু DOM-এ বাঁচত — বাঁ দিকের টেক্সটবক্সে টাইপ করলে re-render-এ
 *           মুছে যেত; reload-এও হারাত।
 *
 * সমাধান — "মার্কার + ফিগার-স্টোর" মডেল:
 *   ১) সোর্স-টেক্সটে একটি ASCII মার্কার বসে:  QZFIG12QZ
 *      (টোকেনের সব অক্ষর english-শ্রেণির — রান-ভাগকারী টোকেনাইজার এটি
 *       এক টুকরোতেই রাখে; আগের `@@FIG12@@`-এ `@` নিউট্রাল হওয়ায় মার্কার RTF-এ
 *       `@@}{\f1 FIG12@@}` হয়ে ভাগ হয়ে যেত ⇒ এক্সপোর্টে চিত্র বসত না। ফিক্স-২।)
 *      (সোর্সটাই সত্য ⇒ typing/re-render নির্বিশেষে চিত্র টেকে)।
 *   ২) চিত্রের বাইনারি থাকে ফিগার-স্টোরে (id → { dataUrl, pxW, pxH, cssW, align }).
 *   ৩) প্রিভিউ-রেন্ডারের পরে মার্কারটি UI-র্যাপারে বদলানো হয় (applyFigures)।
 *   ৪) এক্সপোর্টে মার্কার → আসল চিত্র:
 *        .docx : word/media/figureN.png + [Content_Types] png + rels + <w:drawing>
 *        .doc  : RTF  {\pict\pngblip\picw…\pich…\picwgoal…\pichgoal… <HEX>}
 *   ৫) সব সময় রাস্টারাইজ (SVG→PNG/JPEG) — Word 2003 SVG আঁকতে পারে না।
 *
 * নোড ও ব্রাউজার দুই পরিবেশেই লোড হয় (ইউনিট-টেস্টে require করা যায়)।
 * ═══════════════════════════════════════════════════════════════════════════
 */
(function (global) {
  'use strict';

  const MARKER_SRC = 'QZFIG\\d+QZ';
  const FIG_MAX_PX = 1400;            // দীর্ঘতম বাহু (রাস্টারাইজ-সীমা)
  const FIG_PNG_BUDGET = 900 * 1024;  // এর বেশি হলে JPEG q0.85 (কেবল ছবি; SVG→সবসময় PNG)
  const EMU_PER_PX = 9525;            // CSS px (96dpi) → EMU
  const TWIPS_PER_PX = 15;            // CSS px → twips

  // ───────────────────────────── মার্কার ─────────────────────────────
  function markerFor(id) { return 'QZFIG' + id + 'QZ'; }

  function markerRegex() { return new RegExp(MARKER_SRC, 'g'); }

  function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /** বাংলা-অঙ্ক (০-৯) থাকলে ASCII-তে নামায় — ম্যাচ থেকে id বের করার আগে */
  function normDigits(s) {
    return String(s == null ? '' : s).replace(/[\u09E6-\u09EF]/g, function (ch) {
      return String(ch.charCodeAt(0) - 0x09E6);
    });
  }

  /**
   * সহনশীল ম্যাচার (নিরাপত্তা-জাল): মার্কারের অক্ষরগুলোর মাঝে RTF/XML কন্ট্রোল-জাঙ্ক
   * ঢুকে পড়লেও (যেমন `QZ}{\f1 FIG1QZ`) মার্কার ধরা পড়ে। কেবল তখনই ব্যবহৃত হয় যখন
   * হুবহু ম্যাচ ব্যর্থ হয় — ফলে সাধারণ পথে কোনো ঝুঁকি নেই।
   * @param {number|null} id  null ⇒ যেকোনো id
   */
  function tolerantMarkerRegex(id, opts) {
    const gap = (opts && opts.noTags)
      ? '(?:&[a-zA-Z#0-9]{1,8};|\\s){0,4}'
      : '(?:\\\\(?:u-?\\d+\\??|[a-z]{1,10}-?\\d* ?)|\\{+|\\}+|<[^<>]{0,60}>|&[a-zA-Z#0-9]{1,8};|\\s){0,6}';
    const seq = (id == null) ? ['Q', 'Z', 'F', 'I', 'G', '[0-9\u09E6-\u09EF]+', 'Q', 'Z'] : markerFor(id).split('');
    return new RegExp(seq.join(gap), 'g');
  }

  /**
   * RTF-এ সহনশীলভাবে সরানোর সময় দাঁড়-ব্যালান্স ঠিক রাখে (নইলে Word ভাঙে)।
   * ম্যাচের ভিতরে যত বেশি `{` খুলেছে তার সমান `}` জুড়ে দেয় (উল্টোটাও)।
   */
  function balanceBraces(matched) {
    const s = String(matched || '');
    let opens = 0, closes = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '{' && s[i - 1] !== '\\') opens++;
      else if (ch === '}' && s[i - 1] !== '\\') closes++;
    }
    const d = opens - closes;
    if (d > 0) return '}'.repeat(d);
    if (d < 0) return '{'.repeat(-d);
    return '';
  }

  /** আউটপুটে কোনো (জীবিত বা মৃত) মার্কার-অবশেষ থাকলে সরায় — কখনো ফাঁস হবে না */
  function stripAllMarkers(text, isRtf) {
    const s = String(text == null ? '' : text);
    return s.replace(tolerantMarkerRegex(null), function (m) {
      const fix = isRtf ? balanceBraces(m) : '';
      const bracesInside = /[{}]/.test(m);
      return (isRtf && !bracesInside) ? ' ' : (fix ? fix : ' ');
    });
  }

  /** টেক্সটে যত মার্কার আছে (হুবহু + সহনশীল মিলিয়ে) */
  function countMarkers(text) {
    const s = String(text == null ? '' : text);
    const exact = (s.match(markerRegex()) || []).length;
    return { exact: exact, tolerant: (s.match(tolerantMarkerRegex(null)) || []).length };
  }

  function hasMarkers(text) { return new RegExp(MARKER_SRC).test(String(text == null ? '' : text)); }

  /** [ {id, index, raw} ] — টেক্সটে যত মার্কার আছে, ক্রমে */
  function extractMarkers(text) {
    const out = [];
    const s = String(text == null ? '' : text);
    const re = markerRegex();
    let m;
    while ((m = re.exec(s)) !== null) out.push({ id: parseInt(normDigits(m[0]).replace(/\D+/g, ''), 10), index: m.index, raw: m[0] });
    return out;
  }

  /** মার্কার বাদ দিয়ে পরিষ্কার টেক্সট (তুলনা/সার্চের জন্য) */
  function stripMarkers(text) {
    return String(text == null ? '' : text)
      .replace(/[ \t]*QZFIG\d+QZ[ \t]*/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/ ?\n ?/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * এডিটের পরে মূল মানে থাকা মার্কার অটুট রাখে (নইলে টেক্সট-এডিটে চিত্র হারাত)।
   * যেগুলো নতুন মানে নেই, সেগুলো মানের শেষে যোগ হয়।
   */
  function preserveMarkers(value, original) {
    const orig = String(original == null ? '' : original).match(markerRegex()) || [];
    if (!orig.length) return value;
    const have = new Set(String(value == null ? '' : value).match(markerRegex()) || []);
    const missing = orig.filter((mk) => !have.has(mk));
    if (!missing.length) return value;
    return String(value == null ? '' : value).replace(/\s+$/, '') + ' ' + missing.join(' ');
  }

  /** পুরনো সোর্স-টেক্সট থেকে আর ব্যবহার না হওয়া মার্কার সরায় */
  function pruneMarkers(text, liveIds) {
    const live = new Set((liveIds || []).map((i) => markerFor(i)));
    return String(text == null ? '' : text).replace(/[ \t]*QZFIG\d+QZ[ \t]*/g, (m) => (live.has(m.trim()) ? m : ' '));
  }

  // ───────────────────────────── বাইনারি হেল্পার ─────────────────────────────
  function dataUrlToBytes(dataUrl) {
    const b64 = String(dataUrl || '').split(',')[1] || '';
    const bin = (typeof atob === 'function') ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i) & 0xff;
    return u8;
  }

  function bytesToHex(u8) {
    let out = '';
    for (let i = 0; i < u8.length; i++) out += (u8[i] < 16 ? '0' : '') + u8[i].toString(16);
    return out.toUpperCase();
  }

  function _getJSZip() {
    if (typeof JSZip !== 'undefined') return JSZip;
    if (global && global.JSZip) return global.JSZip;
    if (typeof window !== 'undefined' && window.JSZip) return window.JSZip;
    if (typeof require === 'function') {
      try { return require('../jszip.min.js'); } catch (e) {}
      try { return require('jszip'); } catch (e) {}
    }
    return null;
  }

  // ───────────────────────────── রাস্টারাইজ (ব্রাউজার) ─────────────────────────────
  function _utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function _loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('figure image load failed'));
      img.src = src;
    });
  }

  function _svgDataUrl(svgEl) {
    const clone = svgEl.cloneNode(true);
    let w = 100, h = 80;
    try {
      const b = svgEl.getBoundingClientRect();
      if (b && b.width) { w = Math.round(b.width); h = Math.round(b.height); }
    } catch (e) {}
    const vb = svgEl.getAttribute && svgEl.getAttribute('viewBox');
    if (vb) {
      const p = vb.split(/[\s,]+/).map(Number);
      if (p.length === 4 && p[2] && p[3]) {
        if (!clone.getAttribute('width')) clone.setAttribute('width', p[2]);
        if (!clone.getAttribute('height')) clone.setAttribute('height', p[3]);
        w = p[2]; h = p[3];
      }
    }
    if (!clone.getAttribute('width')) clone.setAttribute('width', w);
    if (!clone.getAttribute('height')) clone.setAttribute('height', h);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const xml = new XMLSerializer().serializeToString(clone);
    return 'data:image/svg+xml;base64,' + _utf8ToB64(xml);
  }

  /**
   * SVG/IMG এলিমেন্ট → { dataUrl, pxW, pxH, cssW, cssH, mime }
   * দীর্ঘতম বাহু ≤ maxPx; SVG সবসময় PNG (স্বচ্ছতা অটুট), ছবি বড় হলে JPEG।
   */
  async function rasterizeElement(el, opts) {
    opts = opts || {};
    if (!el || typeof document === 'undefined') throw new Error('rasterizeElement: DOM প্রয়োজন');
    const tag = (el.tagName || '').toLowerCase();
    const isSvg = tag === 'svg';
    let src, natW = 100, natH = 80;
    if (isSvg) {
      const box = el.getBoundingClientRect();
      natW = Math.max(1, Math.round(box.width || 100));
      natH = Math.max(1, Math.round(box.height || 80));
      src = _svgDataUrl(el);
    } else {
      src = el.currentSrc || el.src;
      natW = el.naturalWidth || parseInt(el.getAttribute('width') || '0', 10) || 100;
      natH = el.naturalHeight || parseInt(el.getAttribute('height') || '0', 10) || 80;
      if (!src) throw new Error('figure image source missing');
    }
    const maxPx = opts.maxPx || FIG_MAX_PX;
    const longest = Math.max(natW, natH);
    const scale = longest > maxPx ? maxPx / longest : Math.min(2, (opts.upscale || 2));
    const pxW = Math.max(1, Math.round(natW * scale));
    const pxH = Math.max(1, Math.round(natH * scale));
    const img = await _loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = pxW; canvas.height = pxH;
    const ctx = canvas.getContext('2d');
    if (opts.whiteBg) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, pxW, pxH); }
    ctx.drawImage(img, 0, 0, pxW, pxH);
    let mime = 'image/png';
    let dataUrl = canvas.toDataURL('image/png');
    if (!isSvg && dataUrl.length > FIG_PNG_BUDGET) {           // অপাক্ত ছবি — JPEG সাশ্রয়ী
      dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      mime = 'image/jpeg';
    }
    return { dataUrl, mime, pxW, pxH, cssW: natW, cssH: natH };
  }

  /** ছোট PNG-অনুপাতের ডেমো-ফিগার (টেস্টের জন্য) */
  function tinyPngDataUrl() {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AF+U3sAAAAASUVORK5CYII=';
  }

  // ───────────────────────────── RTF (.doc) ─────────────────────────────
  /** একটি ফিগারের RTF পিকচার-গ্রুপ */
  function buildRtfPict(fig) {
    const bytes = dataUrlToBytes(fig.dataUrl);
    const isJpeg = /jpe?g/i.test(fig.mime || '') || /^data:image\/jpe?g/i.test(fig.dataUrl || '');
    const pxW = fig.pxW || 100, pxH = fig.pxH || 80;
    const goalW = Math.max(1, Math.round((fig.cssW || fig.displayPx || 180) * TWIPS_PER_PX));
    const goalH = Math.max(1, Math.round(goalW * pxH / pxW));
    return '{\\pict' + (isJpeg ? '\\jpegblip' : '\\pngblip')
      + '\\picw' + pxW + '\\pich' + pxH
      + '\\picwgoal' + goalW + '\\pichgoal' + goalH
      + ' ' + bytesToHex(bytes) + '}';
  }

  /**
   * RTF-টেক্সটে মার্কার → ছবি। (Blob|string) → (Blob|string)
   * @returns প্রতিস্থাপিত সংখ্যা int
   */
  function injectIntoRtfSync(rtfText, figures, stats) {
    let text = String(rtfText == null ? '' : rtfText);
    const store = figures || {};
    let replaced = 0, found = 0, tolerantHits = 0;
    const ids = Object.keys(store);
    // কত মার্কার-সদৃশ জিনিস RTF-এ পৌঁছেছে (রিপোর্ট/সতর্কবার্তার জন্য)
    found = (text.match(tolerantMarkerRegex(null)) || []).length;
    for (const id of ids) {
      const fig = store[id];
      if (!fig || !fig.dataUrl) continue;
      const marker = markerFor(id);
      const pict = buildRtfPict(fig);
      let n = 0;
      if (text.indexOf(marker) !== -1) {
        const re = new RegExp(escapeRegex(marker), 'g');
        text = text.replace(re, () => { n++; return ' ' + pict + ' '; });
      } else {
        // সহনশীল পথ: মার্কারের অক্ষরগুলো রান-সীমানায় ভাগ হয়ে গেছে
        const reT = tolerantMarkerRegex(parseInt(id, 10));
        text = text.replace(reT, (m) => {
          n++; tolerantHits++;
          return ' ' + pict + ' ' + balanceBraces(m);
        });
      }
      replaced += n;
    }
    // অজানা/মৃত মার্কার কখনো আউটপুটে যাবে না
    const leftover = countMarkers(text).tolerant;
    let stripped = 0;
    if (leftover) {
      text = text.replace(markerRegex(), () => { stripped++; return ' '; }).replace(tolerantMarkerRegex(null), (m) => {
        stripped++;
        return balanceBraces(m) || ' ';
      });
    }
    if (stats) { stats.replaced = replaced; stats.found = found; stats.stripped = stripped; stats.tolerant = tolerantHits; }
    return { text, replaced, found, stripped, tolerant: tolerantHits };
  }

  async function injectIntoRtf(input, figures, opts) {
    const asBlob = (typeof Blob !== 'undefined') && input instanceof Blob;
    const raw = (asBlob ? await input.text() : (input && input.toString ? input.toString('utf8') : input));
    const stats = (opts && opts.stats) || null;
    const res = injectIntoRtfSync(raw, figures, stats);
    if (!asBlob) return res.text;
    return new Blob([res.text], { type: 'application/msword' });
  }

  // ───────────────────────────── DOCX ─────────────────────────────
  function buildDocxDrawingXml(fig, relId, imgIdx) {
    const wPx = Number(fig.cssW || fig.displayPx || 180) || 180;
    const pxW = Number(fig.pxW || 100) || 100;
    const pxH = Number(fig.pxH || 80) || 80;
    const cx = Math.max(1, Math.round(wPx * EMU_PER_PX));
    const cy = Math.max(1, Math.round(cx * pxH / pxW));
    const name = String(fig.name || ('চিত্র ' + (imgIdx || 1))).replace(/["<>]/g, '');
    return '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"'
      + ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'
      + ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
      + ' xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"'
      + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<wp:extent cx="' + cx + '" cy="' + cy + '"/>'
      + '<wp:docPr id="' + (9000 + (imgIdx || 1)) + '" name="' + name + '"/>'
      + '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
      + '<pic:pic><pic:nvPicPr><pic:cNvPr id="' + (imgIdx || 1) + '" name="figure' + (imgIdx || 1) + '.png"/><pic:cNvPicPr/></pic:nvPicPr>'
      + '<pic:blipFill><a:blip r:embed="' + relId + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
      + '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>'
      + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
      + '</a:graphicData></a:graphic></wp:inline></w:drawing>';
  }

  function _jcFor(align) {
    if (align === 'left') return '<w:jc w:val="left"/>';
    if (align === 'right') return '<w:jc w:val="right"/>';
    return '<w:jc w:val="center"/>';
  }

  /**
   * document.xml-এ মার্কার → ছবি-প্যারাগ্রাফ (ব্লক)। একবারে এক মার্কার।
   * @returns নতুন xml (বা null যদি মার্কার না থাকে)
   */
  function injectMarkerIntoDocumentXml(xml, marker, fig, relId, imgIdx) {
    const mi = xml.indexOf(marker);
    if (mi === -1) return null;
    const pEnd = xml.indexOf('</w:p>', mi);
    const insertAt = pEnd === -1 ? mi + marker.length : pEnd + '</w:p>'.length;
    const paragraph = '<w:p><w:pPr><w:spacing w:before="60" w:after="60"/>' + _jcFor(fig.align) + '</w:pPr>'
      + '<w:r>' + buildDocxDrawingXml(fig, relId, imgIdx) + '</w:r></w:p>';
    let out = xml.slice(0, insertAt) + paragraph + xml.slice(insertAt);
    out = out.slice(0, mi) + out.slice(mi + marker.length);   // মার্কার-টেক্সট সরানো (mi < insertAt ⇒ নিরাপদ)
    return out;
  }

  /**
   * .docx (Blob|Buffer|Uint8Array) → নতুন প্যাকেজ (মার্কারগুলো আসল ছবি হয়ে)।
   * media + rels + [Content_Types] + drawing — সবই এখানে।
   */
  async function injectIntoDocx(input, figures, opts) {
    const JSZip = _getJSZip();
    if (!JSZip) throw new Error('JSZip পাওয়া যায়নি');
    const zip = await JSZip.loadAsync(input);
    const docFile = zip.file('word/document.xml');
    if (!docFile) throw new Error('word/document.xml নেই — ডকুমেন্ট-প্যাকেজ নয়');
    let doc = await docFile.async('string');
    const relsFile = zip.file('word/_rels/document.xml.rels');
    let rels = relsFile ? await relsFile.async('string') : '';
    const typesFile = zip.file('[Content_Types].xml');
    let types = typesFile ? await typesFile.async('string') : '';

    const store = figures || {};
    const stats = (opts && opts.stats) || null;
    let imgIdx = 0, replaced = 0, tolerantHits = 0;
    const found = (doc.match(tolerantMarkerRegex(null, { noTags: true })) || []).length;
    for (const id of Object.keys(store)) {
      const fig = store[id];
      const marker = markerFor(id);
      if (!fig || !fig.dataUrl) continue;
      if (doc.indexOf(marker) === -1) {
        // সহনশীল পথ: মার্কার হুবহু নেই (রান-সীমানায় ভাগ হয়েছে) ⇒ এনটিটি/স্পেস-জাঙ্ক সহ মিলাই
        const mT = tolerantMarkerRegex(parseInt(id, 10), { noTags: true }).exec(doc);
        if (!mT) continue;
        doc = doc.slice(0, mT.index) + marker + doc.slice(mT.index + mT[0].length);
        tolerantHits++;
      }
      imgIdx += 1;
      const mediaName = 'figure' + imgIdx + '.png';
      const relId = 'rIdFig' + imgIdx;
      const next = injectMarkerIntoDocumentXml(doc, marker, fig, relId, imgIdx);
      if (!next) continue;
      doc = next;
      zip.file('word/media/' + mediaName, dataUrlToBytes(fig.dataUrl));
      replaced++;
      if (rels && rels.indexOf('Id="' + relId + '"') === -1) {
        rels = rels.replace(/<\/Relationships>/,
          '<Relationship Id="' + relId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + mediaName + '"/></Relationships>');
      }
      if (types && !/Extension="png"/i.test(types)) {
        if (types.indexOf('<Default Extension="xml"') !== -1) {
          types = types.replace('<Default Extension="xml"', '<Default Extension="png" ContentType="image/png"/><Default Extension="xml"');
        } else {
          types = types.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');
        }
      }
    }

    // কোনোমতেই মার্কার-অবশেষ আউটপুটে যাবে না
    let stripped = 0;
    if (tolerantMarkerRegex(null, { noTags: true }).test(doc)) {
      doc = doc.replace(markerRegex(), ' ').replace(tolerantMarkerRegex(null, { noTags: true }), () => { stripped++; return ''; });
    }
    if (stats) { stats.replaced = replaced; stats.found = found; stats.stripped = stripped; stats.tolerant = tolerantHits; }

    zip.file('word/document.xml', doc);
    if (rels) zip.file('word/_rels/document.xml.rels', rels);
    if (types) zip.file('[Content_Types].xml', types);

    // আউটপুট-টাইপ ইনপুটের সঙ্গে মিলিয়ে (Browser: Blob → Blob; Node: Buffer → nodebuffer)
    const inputIsBlob = (typeof Blob !== 'undefined') && (input instanceof Blob);
    const wantBlob = inputIsBlob || (opts && opts.type === 'blob');
    if (wantBlob) {
      return await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE'
      });
    }
    return await zip.generateAsync({
      type: (typeof Buffer !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node) ? 'nodebuffer' : 'uint8array',
      compression: 'DEFLATE'
    });
  }

  // ───────────────────────────── স্টোর-হেল্পার ─────────────────────────────
  /** parsedData.__figures না স্টোর — যেটা আছে সেটাই; __figures অগ্রাধিকার পায় */
  function collectStore(parsedData, fallbackStore) {
    const pinned = parsedData && parsedData.__figures;
    if (pinned && typeof pinned === 'object' && Object.keys(pinned).length) return pinned;
    return fallbackStore || {};
  }

  function countFigures(store) { return Object.keys(store || {}).length; }

  function totalBytes(store) {
    let n = 0;
    const s = store || {};
    for (const k of Object.keys(s)) n += String((s[k] && s[k].dataUrl) || '').length;
    return n;
  }

  const api = {
    MARKER_SRC,
    FIG_MAX_PX,
    markerFor,
    hasMarkers,
    extractMarkers,
    tolerantMarkerRegex,
    stripAllMarkers,
    countMarkers,
    stripMarkers,
    preserveMarkers,
    pruneMarkers,
    dataUrlToBytes,
    bytesToHex,
    tinyPngDataUrl,
    rasterizeElement,
    buildRtfPict,
    injectIntoRtf,
    injectIntoRtfSync,
    buildDocxDrawingXml,
    injectMarkerIntoDocumentXml,
    injectIntoDocx,
    collectStore,
    countFigures,
    totalBytes
  };

  global.StudioFigurePipeline = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
