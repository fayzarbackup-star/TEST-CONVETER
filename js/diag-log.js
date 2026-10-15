/* ফয়জার এআই কম্পোজ — ডায়াগনস্টিক খতিয়ান ও "সমস্যা জানান" রিপোর্ট (পরীক্ষামূলক সময়ের জরিপ, ২০২৬-১০-০৮)
 * প্রতিটি রূপান্তরের খতিয়ান: ধাপ ও সময়, অগ্রগতি-বার্তা, টোস্ট (পুনঃচেষ্টা/ব্যর্থতা), কনসোল-সতর্কতা/ত্রুটি, ফলাফল।
 * IndexedDB 'fayzar-diag' → store 'runs' (সর্বশেষ ৩০টি, ৭ দিন)। শুধু এই ব্রাউজারে থাকে; কোথাও পাঠানো হয় না।
 * রিপোর্ট: buildReportZip() → ZIP (report.json + OCR-লেখা + ঐচ্ছিক মূল ফাইল + হুবহু-মোডের ডেটা) — ব্যবহারকারী নিজে নামান।
 * ইঞ্জিনে হাত নেই: চলাকালীন console.warn/error ও window.showToastNotification মুড়ে রাখা হয়, শেষে আগের মতো।
 */
(function (global) {
  'use strict';
  const APP = 'AI Compose web · 2026-10-08';
  const DB = 'fayzar-diag', STORE = 'runs', MAX_RUNS = 30, MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  let cur = null, last = null, saved = null;

  const clip = (v, n) => { const s = typeof v === 'string' ? v : (() => { try { return JSON.stringify(v); } catch (e) { return String(v); } })(); return s && s.length > (n || 400) ? s.slice(0, n || 400) + '…' : s; };

  function open() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) { reject(new Error('IndexedDB নেই')); return; }
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const out = fn(t.objectStore(STORE));
      t.oncomplete = () => { db.close(); resolve(out && out.result); };
      t.onerror = () => { db.close(); reject(t.error); };
    });
  }
  async function save(run) {
    try {
      await tx('readwrite', (s) => s.put(run));
      const all = ((await tx('readonly', (s) => s.getAll())) || []).sort((a, b) => b.at - a.at);
      const drop = all.filter((r, i) => i >= MAX_RUNS || Date.now() - r.at > MAX_AGE).map((r) => r.id);
      if (drop.length) await tx('readwrite', (s) => { drop.forEach((id) => s.delete(id)); });
    } catch (e) { /* খতিয়ান না গেলেও কাজ থামবে না */ }
  }

  // ---------- চলাকালীন বার্তা ধরা ----------
  function hook() {
    if (saved) return;
    saved = { warn: console.warn, error: console.error, toast: global.showToastNotification };
    console.warn = function () { FayzarDiag.ev('warn', clip(Array.from(arguments).map(String).join(' '), 300)); return saved.warn.apply(console, arguments); };
    console.error = function () { FayzarDiag.ev('error', clip(Array.from(arguments).map((a) => (a && a.message) || String(a)).join(' '), 300)); return saved.error.apply(console, arguments); };
    if (typeof saved.toast === 'function') {
      global.showToastNotification = function (msg, type) { FayzarDiag.ev('toast', { type: type || 'info', msg: clip(String(msg), 200) }); return saved.toast.apply(global, arguments); };
    }
    global.addEventListener('unhandledrejection', onRejection);
  }
  function unhook() {
    if (!saved) return;
    console.warn = saved.warn; console.error = saved.error;
    if (saved.toast) global.showToastNotification = saved.toast;
    global.removeEventListener('unhandledrejection', onRejection);
    saved = null;
  }
  function onRejection(e) { FayzarDiag.ev('rejection', clip((e && e.reason && e.reason.message) || String(e && e.reason), 300)); }

  const FayzarDiag = {
    APP,
    /** রূপান্তর শুরু — meta: { mode, pages, files:[{name,size,type}], directive } */
    begin(meta) {
      if (cur) this.end({ ok: false, note: 'আগের খতিয়ান অসমাপ্ত ছিল' });
      cur = { id: 'r' + Date.now().toString(36), at: Date.now(), app: APP, ua: navigator.userAgent, meta: meta || {}, events: [], result: null, downloads: [] };
      hook();
      this.ev('start', { mode: cur.meta.mode, pages: cur.meta.pages });
      return cur.id;
    },
    /** ঘটনা যোগ (একই অগ্রগতি-বার্তা পরপর দুবার নয়) */
    ev(kind, data) {
      if (!cur) return;
      const lastEv = cur.events[cur.events.length - 1];
      const d = typeof data === 'object' ? data : clip(data, 400);
      if (kind === 'progress' && lastEv && lastEv.kind === 'progress' && lastEv.data && d && lastEv.data.text === d.text) { lastEv.data.pct = d.pct; return; }
      if (cur.events.length < 400) cur.events.push({ t: Date.now() - cur.at, kind, data: d });
    },
    /** রূপান্তর শেষ — result: { ok, error?, cancelled?, chars?, layout?, reason?, frontmatter? } */
    end(result) {
      if (!cur) return null;
      cur.result = result || {};
      cur.ms = Date.now() - cur.at;
      unhook();
      const r = cur; cur = null; last = r;
      save(r);
      return r;
    },
    /** শেষ হওয়া রূপান্তরে পরে কিছু যোগ (যেমন কোন ফরম্যাট নামানো হলো) */
    async note(key, value) {
      if (!last) return;
      if (key === 'download') last.downloads.push({ t: Date.now() - last.at, fmt: value });
      else last[key] = value;
      save(last);
    },
    last() { return last; },
    async list() { try { return ((await tx('readonly', (s) => s.getAll())) || []).sort((a, b) => b.at - a.at); } catch (e) { return []; } },

    /**
     * রিপোর্ট-ZIP: { feedback, includeFiles, includeRecent, queue, ocrText, faithful }
     * queue = ইঞ্জিনের filesQueue (মূল File + পাতার base64)
     */
    async buildReportZip(o) {
      const JSZip = global.JSZip;
      if (!JSZip) throw new Error('JSZip লোড হয়নি');
      const zip = new JSZip();
      const recent = o.includeRecent ? (await this.list()).slice(0, 10).map((r) => ({ id: r.id, at: new Date(r.at).toISOString(), ms: r.ms, meta: r.meta, result: r.result, downloads: r.downloads, events: r.events.filter((e) => e.kind !== 'progress').slice(-40) })) : [];
      const run = last ? Object.assign({}, last, { at: new Date(last.at).toISOString() }) : null;
      zip.file('report.json', JSON.stringify({ app: APP, created: new Date().toISOString(), feedback: o.feedback || {}, run, recentRuns: recent }, null, 2));
      if (o.ocrText) zip.file('ocr.md', o.ocrText);
      if (o.faithful) { try { zip.file('faithful-ir.json', JSON.stringify(o.faithful)); } catch (e) { /* বড়/চক্রাকার হলে বাদ */ } }
      if (o.includeFiles && Array.isArray(o.queue)) {
        const seen = new Set();
        let n = 0;
        for (const it of o.queue) {
          if (it.file && !seen.has(it.file)) {
            seen.add(it.file);
            zip.file('input/' + String(it.file.name || ('file-' + (++n))).replace(/[\\/:*?"<>|]/g, '_'), it.file);
          } else if (!it.file && it.base64) {
            const b64 = String(it.base64).split(',')[1] || '';
            zip.file('input/page-' + String(++n).padStart(2, '0') + '.jpg', b64, { base64: true });
          }
        }
      }
      zip.file('README.txt', [
        'AI Compose — সমস্যা-রিপোর্ট',
        'report.json : মতামত, রূপান্তরের খতিয়ান (ধাপ, সময়, পুনঃচেষ্টা, ত্রুটি), সাম্প্রতিক রূপান্তরের সারাংশ',
        'ocr.md      : Gemini-র পড়া লেখা (যেটি থেকে Word ফাইল তৈরি হয়)',
        'input/      : মূল ফাইল (ব্যবহারকারী অনুমতি দিলে)',
        'faithful-ir.json : হুবহু-মোডের লেআউট-ডেটা (থাকলে)',
        'এই ফাইল আপনার কম্পিউটারেই তৈরি — কোথাও স্বয়ংক্রিয়ভাবে পাঠানো হয়নি।'
      ].join('\r\n'));
      return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    }
  };

  global.FayzarDiag = FayzarDiag;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarDiag;
})(typeof window !== 'undefined' ? window : globalThis);
