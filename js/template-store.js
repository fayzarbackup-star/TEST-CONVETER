/* ফয়জার এআই কম্পোজ — "আমার টেমপ্লেট" ভান্ডার (T3a, docs/T3_PLAN.md §৩)।
 * IndexedDB 'fayzar-templates' → store 'templates' (keyPath 'id'):
 *   { id, name, createdAt, updatedAt, version, pages, thumb, ir, slots[], source{kind,hash} }
 * session-store-এর মতো নিজে কিছু মোছে না (মোছা শুধু ব্যবহারকারীর হাতে)। সীমা: ৫০টি ছাঁচ, প্রতিটি ≤৪ পাতা।
 * রপ্তানি/আমদানি: `.fayzar-template` (JSON; চিত্র IR-এর ভেতরে dataUrl হিসেবেই থাকে) — ব্যাকআপ / পেনড্রাইভে অন্য কম্পিউটারে।
 * মূল যুক্তি ব্যাকএন্ড-নিরপেক্ষ (`create(backend)`) — Node-টেস্টে ইন-মেমরি ব্যাকএন্ড, ব্রাউজারে IndexedDB।
 */
(function (global) {
  'use strict';
  const DB = 'fayzar-templates', STORE = 'templates';
  const LIMITS = { maxTemplates: 50, maxPages: 4, maxNameLen: 80 };
  const FORMAT = 'fayzar-template', FORMAT_VERSION = 1, VERSION = 1;
  const EXT = '.fayzar-template';

  function err(code, message) { const e = new Error(message); e.code = code; return e; }
  const cleanName = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, LIMITS.maxNameLen);
  const bn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
  const newId = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const pageCount = (t) => (t && t.ir && Array.isArray(t.ir.pages) ? t.ir.pages.length : Number(t && t.pages) || 0);

  /** সেভের আগে যাচাই; সমস্যা থাকলে বাংলা বার্তার তালিকা */
  function validate(t) {
    const out = [];
    if (!t || typeof t !== 'object') return ['ছাঁচ পাওয়া যায়নি'];
    if (!cleanName(t.name)) out.push('ছাঁচের নাম দিন');
    if (!t.ir || !Array.isArray(t.ir.pages) || !t.ir.pages.length) out.push('ছাঁচের নকশা (পাতা) নেই');
    if (pageCount(t) > LIMITS.maxPages) out.push(`ছাঁচে সর্বোচ্চ ${bn(LIMITS.maxPages)} পাতা থাকতে পারে`);
    if (t.slots != null && !Array.isArray(t.slots)) out.push('স্লট-তালিকা ভুল');
    return out;
  }

  /** তালিকার হালকা রূপ (নকশা ছাড়া) */
  const summary = (r) => ({ id: r.id, name: r.name, createdAt: r.createdAt, updatedAt: r.updatedAt, pages: r.pages, thumb: r.thumb || '' });

  // ---------------------------------------------------------------- ব্যাকএন্ড
  function memoryBackend() {
    const m = new Map();
    const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
    return {
      async getAll() { return [...m.values()].map(clone); },
      async get(id) { return clone(m.get(id)) || null; },
      async put(rec) { m.set(rec.id, clone(rec)); },
      async delete(id) { m.delete(id); },
      async count() { return m.size; }
    };
  }

  function idbBackend() {
    function open() {
      return new Promise((resolve, reject) => {
        if (!global.indexedDB) { reject(err('NO_IDB', 'এই ব্রাউজারে IndexedDB নেই')); return; }
        const req = global.indexedDB.open(DB, 1);
        req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }); };
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
        t.onabort = () => { db.close(); reject(t.error || err('QUOTA', 'জায়গা ফুরিয়েছে')); };
      });
    }
    return {
      async getAll() { return (await tx('readonly', (s) => s.getAll())) || []; },
      async get(id) { return (await tx('readonly', (s) => s.get(id))) || null; },
      async put(rec) { await tx('readwrite', (s) => s.put(rec)); },
      async delete(id) { await tx('readwrite', (s) => s.delete(id)); },
      async count() { return (await tx('readonly', (s) => s.count())) || 0; }
    };
  }

  // ---------------------------------------------------------------- ভান্ডার
  function create(backend) {
    const be = backend || idbBackend();
    let persistAsked = false;
    async function askPersist() {   // ব্রাউজার যেন নিজে না মোছে (একবারই চাওয়া; ব্যর্থ হলেও চুপ)
      if (persistAsked) return; persistAsked = true;
      try { if (global.navigator && navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* নীরব */ }
    }

    const api = {
      LIMITS, EXT,

      /** সব ছাঁচ (হালকা রূপ), নতুনটি আগে */
      async list() {
        const all = await be.getAll();
        return all.map(summary).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      },

      async get(id) { return id ? be.get(id) : null; },

      /** নতুন বা হালনাগাদ (id থাকলে ও আগে থাকলে)। ফেরত: পূর্ণ রেকর্ড */
      async save(t) {
        const problems = validate(t);
        if (problems.length) throw err('INVALID', problems.join('; '));
        const old = t.id ? await be.get(t.id) : null;
        if (!old && (await be.count()) >= LIMITS.maxTemplates) {
          throw err('LIMIT', `"আমার টেমপ্লেট"-এ সর্বোচ্চ ${bn(LIMITS.maxTemplates)}টি ছাঁচ রাখা যায়; পুরোনো কোনোটি মুছে আবার চেষ্টা করুন`);
        }
        const now = Date.now();
        const rec = {
          id: old ? old.id : (t.id || newId()),
          name: cleanName(t.name),
          createdAt: old ? old.createdAt : (t.createdAt || now),
          updatedAt: now,
          version: VERSION,
          pages: pageCount(t),
          thumb: typeof t.thumb === 'string' ? t.thumb : '',
          ir: t.ir,
          slots: Array.isArray(t.slots) ? t.slots : [],
          source: t.source || null
        };
        await be.put(rec);
        await askPersist();
        return rec;
      },

      async rename(id, name) {
        const rec = await be.get(id);
        if (!rec) throw err('NOT_FOUND', 'ছাঁচটি পাওয়া যায়নি');
        const nm = cleanName(name);
        if (!nm) throw err('INVALID', 'ছাঁচের নাম দিন');
        rec.name = nm; rec.updatedAt = Date.now();
        await be.put(rec);
        return summary(rec);
      },

      async remove(id) { await be.delete(id); },

      /** রপ্তানি: এক বা একাধিক id → { filename, text } (JSON) */
      async exportFile(ids) {
        const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
        const recs = [];
        for (const id of list) { const r = await be.get(id); if (r) recs.push(r); }
        if (!recs.length) throw err('NOT_FOUND', 'রপ্তানির মতো ছাঁচ পাওয়া যায়নি');
        const text = JSON.stringify({ format: FORMAT, formatVersion: FORMAT_VERSION, exportedAt: Date.now(), templates: recs });
        const base = recs.length === 1 ? recs[0].name.replace(/[\\/:*?"<>|]+/g, '_') : `আমার-টেমপ্লেট-${bn(recs.length)}টি`;
        return { filename: base + EXT, text };
      },

      /** ব্রাউজারে ডাউনলোডের Blob */
      async exportBlob(ids) {
        const f = await api.exportFile(ids);
        return { filename: f.filename, blob: new Blob([f.text], { type: 'application/json' }) };
      },

      /**
       * আমদানি: ফাইলের লেখা → প্রতিটি ছাঁচ নতুন id-তে (আগেরটির ওপরে কখনো লেখা হয় না)।
       * ফেরত: { added: [summary], skipped: [{ name, reason }] }
       */
      async importFile(text) {
        let data;
        try { data = JSON.parse(String(text || '')); } catch (e) { throw err('BAD_FILE', 'ফাইলটি ফয়জার-টেমপ্লেট নয় (পড়া যায়নি)'); }
        if (!data || data.format !== FORMAT || !Array.isArray(data.templates)) throw err('BAD_FILE', 'ফাইলটি ফয়জার-টেমপ্লেট নয়');
        if (Number(data.formatVersion) > FORMAT_VERSION) throw err('NEWER', 'ফাইলটি নতুন সংস্করণের; সফটওয়্যার হালনাগাদ করুন');
        const added = [], skipped = [];
        const names = new Set((await be.getAll()).map((r) => r.name));
        for (const t of data.templates) {
          const nm = cleanName(t && t.name) || 'আমদানি করা ছাঁচ';
          const problems = validate(Object.assign({}, t, { name: nm }));
          if (problems.length) { skipped.push({ name: nm, reason: problems.join('; ') }); continue; }
          let name = nm;
          for (let k = 2; names.has(name); k++) name = `${nm} (${bn(k)})`;
          try {
            const rec = await api.save(Object.assign({}, t, { id: newId(), name, createdAt: t.createdAt }));
            names.add(name); added.push(summary(rec));
          } catch (e) { skipped.push({ name, reason: e.message }); if (e.code === 'LIMIT') break; }
        }
        return { added, skipped };
      }
    };
    return api;
  }

  // ডিফল্ট (ব্রাউজার) ভান্ডার — প্রথম ব্যবহারে IndexedDB খোলে
  let dflt = null;
  const lazy = () => (dflt = dflt || create(idbBackend()));
  const FayzarTemplateStore = { LIMITS, EXT, FORMAT, FORMAT_VERSION, validate, create, memoryBackend };
  ['list', 'get', 'save', 'rename', 'remove', 'exportFile', 'exportBlob', 'importFile'].forEach((k) => {
    FayzarTemplateStore[k] = (...a) => lazy()[k](...a);
  });

  global.FayzarTemplateStore = FayzarTemplateStore;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarTemplateStore;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
