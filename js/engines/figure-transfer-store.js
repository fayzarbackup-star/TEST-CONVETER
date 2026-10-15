/**
 * Fayzar — চিত্র-হস্তান্তর স্টোর (FayzarFigureTransfer)
 * ======================================================
 * OCR পাতা → স্টুডিও (আলাদা ট্যাব) চিত্র পাঠানো। localStorage-এর ~৫MB সীমায় ছবি ধরে না,
 * তাই IndexedDB (একই origin: localhost:3008)। পেলোডে শুধু চাবি যায়; স্টুডিও take() করে
 * নেয় এবং রেকর্ড মুছে যায় (এককালীন হস্তান্তর)। ৪৮ ঘণ্টার পুরনো রেকর্ড put()-এর সময় ছাঁটা হয়।
 */
(function (global) {
  'use strict';

  const DB_NAME = 'fayzar_figure_transfer';
  const STORE = 'figures';
  const MAX_AGE_MS = 48 * 3600 * 1000;

  function openDb() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB নেই')); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB খোলা যায়নি'));
    });
  }

  function tx(db, mode, fn) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const st = t.objectStore(STORE);
      let out;
      Promise.resolve(fn(st)).then((r) => { out = r; });
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('IndexedDB লেনদেন বাতিল'));
    });
  }

  function reqP(r) {
    return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  }

  /** figures {id: fig} রাখে → চাবি */
  async function put(figures) {
    const key = 'fig_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const db = await openDb();
    try {
      await tx(db, 'readwrite', async (st) => {
        const keys = await reqP(st.getAllKeys());
        const now = Date.now();
        keys.forEach((k) => {
          const ts = parseInt(String(k).split('_')[1], 10) || 0;
          if (now - ts > MAX_AGE_MS) st.delete(k);
        });
        st.put({ figures: figures || {}, savedAt: now }, key);
      });
    } finally { db.close(); }
    return key;
  }

  /** চাবির চিত্রগুলো ফেরত দেয় এবং রেকর্ড মুছে দেয়; না থাকলে null */
  async function take(key) {
    if (!key) return null;
    const db = await openDb();
    try {
      return await tx(db, 'readwrite', async (st) => {
        const rec = await reqP(st.get(key));
        st.delete(key);
        return rec && rec.figures ? rec.figures : null;
      });
    } finally { db.close(); }
  }

  global.FayzarFigureTransfer = { put, take };
})(typeof window !== 'undefined' ? window : globalThis);
