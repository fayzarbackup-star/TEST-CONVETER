/* ফয়জার এআই কম্পোজ — ছবি-প্রস্তুতি (পর্ব ১গ): ৯০° ঘোরান ও ২ পাতা ভাগ।
 * সাধারণ <canvas>; অফলাইন, কোনো লাইব্রেরি নেই। কিউ-আইটেম {file,name,size,mimeType,base64} নেয়, নতুন আইটেম ফেরত দেয়।
 * গণিত (rotatedDims, splitRects, suffixName) আলাদা — Node টেস্টে চলে: tests/image-tools.test.mjs
 */
(function (root) {
  'use strict';

  function rotatedDims(w, h) { return { w: h, h: w }; }

  // বাম অর্ধেক [0, floor(w/2)), ডান অর্ধেক [floor(w/2), w) — মোট প্রস্থ অটুট
  function splitRects(w, h) {
    const mid = Math.floor(w / 2);
    return [{ x: 0, y: 0, w: mid, h: h }, { x: mid, y: 0, w: w - mid, h: h }];
  }

  // "scan.png" + "_r90" -> "scan_r90.jpg"; আগের প্রত্যয় জমে: scan_r90_r90.jpg
  function suffixName(name, suffix, ext) {
    const n = String(name || 'image');
    const m = n.match(/^(.*?)(\.[^./\\]+)?$/);
    return (m[1] || 'image') + suffix + '.' + (ext || 'jpg');
  }

  // ---- ব্রাউজার অংশ ----
  function srcOf(item) {
    if (item.base64) return Promise.resolve({ url: item.base64, revoke: false });
    if (item.file) return Promise.resolve({ url: URL.createObjectURL(item.file), revoke: true });
    return Promise.reject(new Error('ছবির উৎস নেই'));
  }
  function loadImg(item) {
    return srcOf(item).then((s) => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => { if (s.revoke) URL.revokeObjectURL(s.url); res(im); };
      im.onerror = () => { if (s.revoke) URL.revokeObjectURL(s.url); rej(new Error('ছবি পড়া যায়নি')); };
      im.src = s.url;
    }));
  }
  function canvasToItem(canvas, name, suffix) {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return new Promise((res) => {
      canvas.toBlob((blob) => {
        const nm = suffixName(name, suffix, 'jpg');
        const file = blob ? new File([blob], nm, { type: 'image/jpeg' }) : null;
        res({ file: file, name: nm, size: blob ? blob.size : dataUrl.length, isPdf: false, mimeType: 'image/jpeg', base64: dataUrl, w: canvas.width, h: canvas.height });
      }, 'image/jpeg', 0.92);
    });
  }

  async function rotate90(item) {
    const im = await loadImg(item);
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    const d = rotatedDims(w, h);
    const c = document.createElement('canvas');
    c.width = d.w; c.height = d.h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.translate(d.w, 0); ctx.rotate(Math.PI / 2);   // ঘড়ির কাঁটার দিকে ৯০°
    ctx.drawImage(im, 0, 0);
    return canvasToItem(c, item.name, '_r90');
  }

  async function splitTwo(item) {
    const im = await loadImg(item);
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    const rects = splitRects(w, h), tags = ['_L', '_R'];
    const out = [];
    for (let i = 0; i < 2; i++) {
      const r = rects[i], c = document.createElement('canvas');
      c.width = r.w; c.height = r.h;
      c.getContext('2d').drawImage(im, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      out.push(await canvasToItem(c, item.name, tags[i]));
    }
    return out;
  }

  const api = { rotatedDims: rotatedDims, splitRects: splitRects, suffixName: suffixName, rotate90: rotate90, splitTwo: splitTwo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FayzarImageTools = api;
})(typeof window !== 'undefined' ? window : globalThis);
