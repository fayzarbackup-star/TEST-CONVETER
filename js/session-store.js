/* ফয়জার এআই কম্পোজ — কাজের সেশন-ক্যাশ ও কনভার্ট-ইতিহাস (রিফ্রেশে কাজ না হারাতে, আগের আউটপুট আবার পেতে)।
 * IndexedDB 'fayzar-session':
 *   store 'kv'      → key 'current': { v, at, view, mode, directive, items[], text, run, done, cap } (বর্তমান কাজ)
 *   store 'history' → { id, at, name, baseName, pages, mode, text | ir, thumb } (সফল রূপান্তর; সর্বশেষ ২০টি)
 * শুধু এই ব্রাউজারে থাকে; কোথাও পাঠানো হয় না। ২৪ ঘণ্টার পুরোনো সব বাদ। js/home-app.js ব্যবহার করে।
 */
(function (global) {
  'use strict';
  const DB = 'fayzar-session', KV = 'kv', HIST = 'history', KEY = 'current';
  const MAX_AGE = 24 * 60 * 60 * 1000, MAX_HISTORY = 20;

  function open() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) { reject(new Error('IndexedDB নেই')); return; }
      const req = indexedDB.open(DB, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
        if (!db.objectStoreNames.contains(HIST)) db.createObjectStore(HIST, { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const out = fn(t.objectStore(store));
      t.oncomplete = () => { db.close(); resolve(out && out.result); };
      t.onerror = () => { db.close(); reject(t.error); };
      t.onabort = () => { db.close(); reject(t.error); };
    });
  }

  const FayzarSession = {
    // ---------- বর্তমান কাজ ----------
    async save(rec) {
      try { await tx(KV, 'readwrite', (s) => s.put(Object.assign({ v: 1, at: Date.now() }, rec), KEY)); return true; }
      catch (e) {
        // বড় বা অ-কপিযোগ্য অংশ (যেমন হুবহু-মোডের cap) বাদ দিয়ে আরেকবার
        if (rec && rec.cap) { try { const r = Object.assign({}, rec); delete r.cap; await tx(KV, 'readwrite', (s) => s.put(Object.assign({ v: 1, at: Date.now() }, r), KEY)); return true; } catch (e2) { /* নীরব */ } }
        console.warn('[FayzarSession] save', e); return false;
      }
    },
    async load() {
      try {
        const rec = await tx(KV, 'readonly', (s) => s.get(KEY));
        if (!rec || rec.v !== 1 || Date.now() - (rec.at || 0) > MAX_AGE) return null;
        return rec;
      } catch (e) { console.warn('[FayzarSession] load', e); return null; }
    },
    async clear() { try { await tx(KV, 'readwrite', (s) => s.delete(KEY)); } catch (e) { /* নীরব */ } },

    // ---------- কনভার্ট-ইতিহাস ----------
    /** নতুন এন্ট্রি; ফেরত: id (ব্যর্থ হলে null) */
    async historyAdd(entry) {
      try {
        const id = await tx(HIST, 'readwrite', (s) => s.add(Object.assign({ at: Date.now() }, entry)));
        await this.historyPrune();
        return id;
      } catch (e) {
        // হুবহু-মোডের ir খুব বড়/অ-কপিযোগ্য হলে লেখাটুকু নিয়েই রাখি
        if (entry && entry.ir) { try { const r = Object.assign({ at: Date.now() }, entry); delete r.ir; r.irMissing = true; return await tx(HIST, 'readwrite', (s) => s.add(r)); } catch (e2) { /* নীরব */ } }
        console.warn('[FayzarSession] historyAdd', e); return null;
      }
    },
    async historyList() {
      try {
        const all = (await tx(HIST, 'readonly', (s) => s.getAll())) || [];
        return all.filter((h) => Date.now() - (h.at || 0) <= MAX_AGE).sort((a, b) => b.at - a.at);
      } catch (e) { console.warn('[FayzarSession] historyList', e); return []; }
    },
    async historyGet(id) { try { return await tx(HIST, 'readonly', (s) => s.get(id)); } catch (e) { return null; } },
    async historyUpdate(id, patch) {
      try {
        const cur = await this.historyGet(id);
        if (!cur) return false;
        await tx(HIST, 'readwrite', (s) => s.put(Object.assign(cur, patch)));
        return true;
      } catch (e) { console.warn('[FayzarSession] historyUpdate', e); return false; }
    },
    async historyDelete(id) { try { await tx(HIST, 'readwrite', (s) => s.delete(id)); } catch (e) { /* নীরব */ } },
    async historyClear() { try { await tx(HIST, 'readwrite', (s) => s.clear()); } catch (e) { /* নীরব */ } },
    /** ২৪ ঘণ্টার পুরোনো ও ২০টির বেশি পুরোনোগুলো বাদ */
    async historyPrune() {
      try {
        const all = ((await tx(HIST, 'readonly', (s) => s.getAll())) || []).sort((a, b) => b.at - a.at);
        const drop = all.filter((h, i) => i >= MAX_HISTORY || Date.now() - (h.at || 0) > MAX_AGE).map((h) => h.id);
        if (drop.length) await tx(HIST, 'readwrite', (s) => { drop.forEach((id) => s.delete(id)); });
      } catch (e) { /* নীরব */ }
    }
  };

  global.FayzarSession = FayzarSession;
})(typeof window !== 'undefined' ? window : this);
