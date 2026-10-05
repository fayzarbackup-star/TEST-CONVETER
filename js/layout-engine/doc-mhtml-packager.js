/**
 * Fayzar — Word 2003 .doc ছবি-প্যাকেজার (FayzarDocMhtml)
 * =====================================================
 * DocxToDocConverter-এর আউটপুট Word-HTML (.doc)। সেখানে ছবি `<img src="data:image/png;base64,…">`
 * হিসেবে বসে — Word 2003 `data:` URI দেখাতে পারে না (ছবি ফাঁকা/লাল-ক্রস)।
 *
 * সঠিক পদ্ধতি = MHTML (multipart/related, RFC 2557) — Word নিজে "Single File Web Page"-এ যেভাবে
 * সেভ করে: একটি HTML অংশ + প্রতিটি ছবি আলাদা base64 অংশ, `Content-Location` দিয়ে যুক্ত।
 * Word 2003 ও নতুন Word দুটোই .doc নামের MHTML ফাইল সরাসরি খোলে
 * (এই প্রজেক্টের doc-binary-engine.js একই ফরম্যাট পড়েও)।
 *
 * এই মডিউল রূপান্তরকারীর পরে চলে — DocxToDocConverter নিজে অপরিবর্তিত।
 * ছবি না থাকলে HTML হুবহু ফেরত দেয় (আগের আচরণ, কোনো ঝুঁকি নেই)।
 */
(function (global) {
  'use strict';

  const BASE = 'file:///C:/fayzar_doc/';
  const DATA_URI_RE = /data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)/g;
  const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/bmp': 'bmp', 'image/x-wmf': 'wmf', 'image/x-emf': 'emf', 'image/svg+xml': 'svg' };

  /** UTF-8 বাইট (স্ট্রিং থেকে) — TextEncoder না থাকলেও চলে */
  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    const out = [];
    for (const ch of String(str)) {
      let c = ch.codePointAt(0);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return Uint8Array.from(out);
  }

  /**
   * Quoted-printable (RFC 2045) — Word-এর নিজের MHTML-এর মতো HTML অংশ। লাইন ≤ ৭৬, CRLF,
   * `=` ও নন-ASCII বাইট `=XX`, লাইন-শেষের স্পেস/ট্যাব এনকোড।
   */
  function quotedPrintable(str) {
    const bytes = utf8Bytes(String(str).replace(/\r\n|\r|\n/g, '\n'));
    const hex = (b) => '=' + (b < 16 ? '0' : '') + b.toString(16).toUpperCase();
    const lines = [];
    let line = '';
    const push = (tok) => {
      if (line.length + tok.length > 75) { lines.push(line + '='); line = ''; }
      line += tok;
    };
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b === 0x0A) {
        if (/[ \t]$/.test(line)) line = line.slice(0, -1) + hex(line.charCodeAt(line.length - 1));
        lines.push(line); line = '';
        continue;
      }
      const safe = (b >= 33 && b <= 126 && b !== 61) || b === 32 || b === 9;
      push(safe ? String.fromCharCode(b) : hex(b));
    }
    if (/[ \t]$/.test(line)) line = line.slice(0, -1) + hex(line.charCodeAt(line.length - 1));
    lines.push(line);
    return lines.join('\r\n');
  }

  function wrap76(b64) {
    const s = String(b64).replace(/\s+/g, '');
    const out = [];
    for (let i = 0; i < s.length; i += 76) out.push(s.slice(i, i + 76));
    return out.join('\r\n');
  }

  /**
   * Part-16.4: Word (HTML-.doc) <img>-এর CSS `width/height` উপেক্ষা করে ছবির নিজস্ব পিক্সেল (৯৬ DPI) ধরে —
   * Word COM-এ মাপা: ২৮৯px চিত্র ⇒ ৩.০১" (docx-এ একই চিত্র ০.৯৬")। তাই style-এর pt মাপ থেকে
   * HTML `width`/`height` অ্যাট্রিবিউট (px = pt × ৯৬/৭২) বসানো হয় এবং মাপ-ভাঙা `height:auto`/`max-width` সরানো হয়।
   */
  function sizeImgTags(html) {
    return String(html).replace(/<img\b[^>]*>/gi, (tag) => {
      const st = /style\s*=\s*"([^"]*)"/i.exec(tag);
      if (!st) return tag;
      const w = /(?:^|;)\s*width\s*:\s*([\d.]+)pt/i.exec(st[1]);
      const h = /(?:^|;)\s*height\s*:\s*([\d.]+)pt/i.exec(st[1]);
      if (!w) return tag;
      const wPt = parseFloat(w[1]), hPt = h ? parseFloat(h[1]) : 0;
      const style = st[1].replace(/(?:^|;)\s*height\s*:\s*auto\s*(?=;|$)/gi, '').replace(/(?:^|;)\s*max-width\s*:\s*[^;]*/gi, '').replace(/^;+/, '');
      let out = tag.replace(st[0], 'style="' + style + '"').replace(/\s(?:width|height)\s*=\s*"?[\d.]+(?:px)?"?/gi, '');
      const attrs = ' width="' + Math.round(wPt * 96 / 72) + '"' + (hPt ? ' height="' + Math.round(hPt * 96 / 72) + '"' : '');
      return out.replace(/^<img\b/i, '<img' + attrs);
    });
  }

  const FayzarDocMhtml = {
    BASE,
    quotedPrintable,
    sizeImgTags,

    /** HTML-এ data:image আছে কি না */
    hasEmbeddedImages(html) {
      DATA_URI_RE.lastIndex = 0;
      return DATA_URI_RE.test(String(html || ''));
    },

    /**
     * Word-HTML → MHTML স্ট্রিং। একই ছবি (একই base64) একবারই অংশ হয়।
     * @returns {{ mhtml: string, images: Array<{name, mime, location}> }} — ছবি না থাকলে mhtml = মূল HTML
     */
    pack(html) {
      const src0 = String(html || '');
      const src = this.hasEmbeddedImages(src0) ? sizeImgTags(src0) : src0;
      const images = [];
      const seen = new Map();
      DATA_URI_RE.lastIndex = 0;
      const body = src.replace(DATA_URI_RE, (whole, mime, data) => {
        const key = mime + ':' + data.replace(/\s+/g, '');
        if (!seen.has(key)) {
          const name = 'image' + String(images.length + 1).padStart(3, '0') + '.' + (EXT[mime.toLowerCase()] || 'png');
          const location = BASE + 'document_files/' + name;
          images.push({ name, mime: mime.toLowerCase(), location, data: data.replace(/\s+/g, '') });
          seen.set(key, location);
        }
        return seen.get(key);
      });
      if (!images.length) return { mhtml: src, images: [] };

      const boundary = '----=_NextPart_FAYZAR_' + Date.now().toString(16);
      const parts = [];
      parts.push(
        'MIME-Version: 1.0',
        'Content-Type: multipart/related; boundary="' + boundary + '"; type="text/html"',
        '',
        'This is a multi-part message in MIME format.',
        '',
        '--' + boundary,
        'Content-Location: ' + BASE + 'document.htm',
        'Content-Transfer-Encoding: quoted-printable',
        'Content-Type: text/html; charset="utf-8"',
        '',
        quotedPrintable(body),
        ''
      );
      for (const img of images) {
        parts.push(
          '--' + boundary,
          'Content-Location: ' + img.location,
          'Content-Transfer-Encoding: base64',
          'Content-Type: ' + img.mime,
          '',
          wrap76(img.data),
          ''
        );
      }
      parts.push('--' + boundary + '--', '');
      return { mhtml: parts.join('\r\n'), images: images.map(({ name, mime, location }) => ({ name, mime, location })) };
    },

    /**
     * .doc Blob (Word-HTML) → ছবি থাকলে MHTML Blob, না থাকলে মূল Blob অপরিবর্তিত।
     */
    async packBlob(blob) {
      if (!blob || typeof blob.text !== 'function') return blob;
      const html = await blob.text();
      if (!this.hasEmbeddedImages(html)) return blob;
      const { mhtml } = this.pack(html);
      return new Blob([mhtml], { type: 'application/msword' });
    }
  };

  global.FayzarDocMhtml = FayzarDocMhtml;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarDocMhtml;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
