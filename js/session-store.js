/* ফয়জার এআই কম্পোজ — কাজের সেশন-ক্যাশ ও কনভার্ট-ইতিহাস (রিফ্রেশে কাজ না হারাতে, আগের আউটপুট আবার পেতে)।
 * IndexedDB 'fayzar-session':
 *   store 'kv'      → key 'current': { v, at, view, mode, directive, items[], text, ocrText, cacheKey, contentHash, run, done, cap } (বর্তমান কাজ)
 *   store 'history' → { id, at, name, baseName, pages, mode, text | ir, ocrText, cap, cacheKey, contentHash, promptVersion, thumb } (সফল রূপান্তর; সর্বশেষ ২০টি)
 * শুধু এই ব্রাউজারে থাকে; কোথাও পাঠানো হয় না। ২৪ ঘণ্টার পুরোনো সব বাদ। js/home-app.js ব্যবহার করে।
 */
(function (global) {
  'use strict';
  const DB = 'fayzar-session', KV = 'kv', HIST = 'history', KEY = 'current';
  const MAX_AGE = 24 * 60 * 60 * 1000, MAX_HISTORY = 20;
  const DEFAULT_PROMPT_VERSION = 'ocr-v1';

  // IndexedDB না থাকলে (যেমন Node টেস্ট পরিবেশে) মেমোরি ফলব্যাক
  let memCurrent = null, memHist = [], memSeq = 1;

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

  // কনটেন্ট-হ্যাশ নির্ণয়ের সহায়ক (SHA-256 crypto.subtle; না থাকলে ফলব্যাক হ্যাশ)
  function toHex(buf) {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
    return s;
  }
  function fallbackHashHex(bytes) {
    let h1 = 0x811c9dc5 >>> 0, h2 = 0x01000193 >>> 0;
    for (let i = 0; i < bytes.length; i++) {
      h1 = Math.imul(h1 ^ bytes[i], 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ (bytes[i] + (i & 0xff)), 0x85ebca6b) >>> 0;
    }
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0') + '_' + bytes.length;
  }
  async function sha256Hex(bytes) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    const c = (global && global.crypto) || (typeof crypto !== 'undefined' ? crypto : null);
    if (c && c.subtle && typeof c.subtle.digest === 'function') {
      const dig = await c.subtle.digest('SHA-256', data);
      return toHex(dig);
    }
    return fallbackHashHex(data);
  }
  function strToBytes(str) {
    const s = String(str || '');
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
    return out;
  }
  async function extractItemBytes(item) {
    if (item == null) return new Uint8Array(0);
    if (typeof item === 'string') return strToBytes(item);
    if (item instanceof Uint8Array) return item;
    if (typeof ArrayBuffer !== 'undefined' && (item instanceof ArrayBuffer || ArrayBuffer.isView(item))) {
      return new Uint8Array(item.buffer || item, item.byteOffset || 0, item.byteLength ?? item.length ?? 0);
    }
    if (typeof item.arrayBuffer === 'function') {
      return new Uint8Array(await item.arrayBuffer());
    }
    if (typeof item === 'object') {
      const pagePrefix = item.pdfPage ? 'p' + item.pdfPage + ':' : '';
      if (item.file && typeof item.file.arrayBuffer === 'function') {
        const fb = new Uint8Array(await item.file.arrayBuffer());
        if (fb.length > 0) {
          if (!pagePrefix) return fb;
          const pb = strToBytes(pagePrefix);
          const merged = new Uint8Array(pb.length + fb.length);
          merged.set(pb, 0); merged.set(fb, pb.length);
          return merged;
        }
      }
      if (item.base64) return strToBytes(pagePrefix + item.base64);
      const raw = item.bytes ?? item.data ?? item.content ?? item.buffer;
      if (raw != null) {
        const rb = await extractItemBytes(raw);
        if (!pagePrefix) return rb;
        const pb = strToBytes(pagePrefix);
        const merged = new Uint8Array(pb.length + rb.length);
        merged.set(pb, 0); merged.set(rb, pb.length);
        return merged;
      }
      return strToBytes(JSON.stringify({ name: item.name || '', size: item.size || 0, pdfPage: item.pdfPage || 0 }));
    }
    return strToBytes(String(item));
  }

  const FayzarSession = {
    PROMPT_VERSION: DEFAULT_PROMPT_VERSION,

    // ---------- বর্তমান কাজ ----------
    async save(rec) {
      if (!global.indexedDB) {
        memCurrent = Object.assign({ v: 1, at: Date.now() }, rec);
        return true;
      }
      try { await tx(KV, 'readwrite', (s) => s.put(Object.assign({ v: 1, at: Date.now() }, rec), KEY)); return true; }
      catch (e) {
        // বড় বা অ-কপিযোগ্য অংশ (যেমন হুবহু-মোডের cap) বাদ দিয়ে আরেকবার
        if (rec && rec.cap) { try { const r = Object.assign({}, rec); delete r.cap; await tx(KV, 'readwrite', (s) => s.put(Object.assign({ v: 1, at: Date.now() }, r), KEY)); return true; } catch (e2) { /* নীরব */ } }
        console.warn('[FayzarSession] save', e); return false;
      }
    },
    async load() {
      if (!global.indexedDB) {
        if (!memCurrent || memCurrent.v !== 1 || Date.now() - (memCurrent.at || 0) > MAX_AGE) return null;
        return memCurrent;
      }
      try {
        const rec = await tx(KV, 'readonly', (s) => s.get(KEY));
        if (!rec || rec.v !== 1 || Date.now() - (rec.at || 0) > MAX_AGE) return null;
        return rec;
      } catch (e) { console.warn('[FayzarSession] load', e); return null; }
    },
    async clear() {
      memCurrent = null;
      if (!global.indexedDB) return;
      try { await tx(KV, 'readwrite', (s) => s.delete(KEY)); } catch (e) { /* নীরব */ }
    },

    // ---------- কনভার্ট-ইতিহাস ----------
    /** নতুন এন্ট্রি; ফেরত: id (ব্যর্থ হলে null) */
    async historyAdd(entry) {
      if (!global.indexedDB) {
        if (entry && entry.cacheKey) {
          const idx = memHist.findIndex((h) => h.cacheKey === entry.cacheKey);
          if (idx >= 0) {
            memHist[idx] = Object.assign({}, memHist[idx], entry, { at: Date.now() });
            await this.historyPrune();
            return memHist[idx].id;
          }
        }
        const rec = Object.assign({ at: Date.now() }, entry, { id: memSeq++ });
        memHist.push(rec);
        await this.historyPrune();
        return rec.id;
      }
      try {
        if (entry && entry.cacheKey) {
          const all = (await tx(HIST, 'readonly', (s) => s.getAll())) || [];
          const prev = all.find((h) => h.cacheKey === entry.cacheKey);
          if (prev && prev.id != null) {
            await tx(HIST, 'readwrite', (s) => s.put(Object.assign({}, prev, entry, { id: prev.id, at: Date.now() })));
            await this.historyPrune();
            return prev.id;
          }
        }
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
      if (!global.indexedDB) {
        return memHist.filter((h) => Date.now() - (h.at || 0) <= MAX_AGE).sort((a, b) => b.at - a.at);
      }
      try {
        const all = (await tx(HIST, 'readonly', (s) => s.getAll())) || [];
        return all.filter((h) => Date.now() - (h.at || 0) <= MAX_AGE).sort((a, b) => b.at - a.at);
      } catch (e) { console.warn('[FayzarSession] historyList', e); return []; }
    },
    async historyGet(id) {
      if (!global.indexedDB) return memHist.find((h) => h.id === id) || null;
      try { return await tx(HIST, 'readonly', (s) => s.get(id)); } catch (e) { return null; }
    },
    async historyUpdate(id, patch) {
      if (!global.indexedDB) {
        const cur = memHist.find((h) => h.id === id);
        if (!cur) return false;
        Object.assign(cur, patch);
        return true;
      }
      try {
        const cur = await this.historyGet(id);
        if (!cur) return false;
        await tx(HIST, 'readwrite', (s) => s.put(Object.assign(cur, patch)));
        return true;
      } catch (e) { console.warn('[FayzarSession] historyUpdate', e); return false; }
    },
    async historyDelete(id) {
      memHist = memHist.filter((h) => h.id !== id);
      if (!global.indexedDB) return;
      try { await tx(HIST, 'readwrite', (s) => s.delete(id)); } catch (e) { /* নীরব */ }
    },
    async historyClear() {
      memHist = [];
      if (!global.indexedDB) return;
      try { await tx(HIST, 'readwrite', (s) => s.clear()); } catch (e) { /* নীরব */ }
    },
    /** ২৪ ঘণ্টার পুরোনো ও ২০টির বেশি পুরোনোগুলো বাদ */
    async historyPrune() {
      if (!global.indexedDB) {
        memHist.sort((a, b) => b.at - a.at);
        memHist = memHist.filter((h, i) => i < MAX_HISTORY && Date.now() - (h.at || 0) <= MAX_AGE);
        return;
      }
      try {
        const all = ((await tx(HIST, 'readonly', (s) => s.getAll())) || []).sort((a, b) => b.at - a.at);
        const drop = all.filter((h, i) => i >= MAX_HISTORY || Date.now() - (h.at || 0) > MAX_AGE).map((h) => h.id);
        if (drop.length) await tx(HIST, 'readwrite', (s) => { drop.forEach((id) => s.delete(id)); });
      } catch (e) { /* নীরব */ }
    },

    // ---------- পর্ব ৭ (CONTROL7): কনটেন্ট-হ্যাশ ও প্রম্পট-সংস্করণ ভিত্তিক OCR ক্যাশ ----------
    /** বর্তমান প্রম্পট-সংস্করণ নির্ণয় */
    getPromptVersion(opts) {
      if (typeof opts === 'string' && opts) return opts;
      if (opts && opts.promptVersion) return String(opts.promptVersion);
      if (global && global.__FZ_PROMPT_VERSION) return String(global.__FZ_PROMPT_VERSION);
      if (global && global.FayzarAiOcrEngine && global.FayzarAiOcrEngine.PROMPT_VERSION) {
        return String(global.FayzarAiOcrEngine.PROMPT_VERSION);
      }
      return this.PROMPT_VERSION || DEFAULT_PROMPT_VERSION;
    },
    setPromptVersion(v) {
      this.PROMPT_VERSION = String(v || DEFAULT_PROMPT_VERSION);
      return this.PROMPT_VERSION;
    },

    /** FZ_OFF_OCRCACHE সুইচ চালু কিনা পরীক্ষা */
    isOcrCacheOff(opts) {
      if (opts && (opts.offCache === true || opts.FZ_OFF_OCRCACHE === '1' || opts.FZ_OFF_OCRCACHE === true)) return true;
      if (global && (global.__FZ_OFF_OCRCACHE === true || global.__FZ_OFF_OCRCACHE === '1' || global.FZ_OFF_OCRCACHE === true || global.FZ_OFF_OCRCACHE === '1')) return true;
      try {
        const st = (opts && opts.localStorage) ||
          (typeof localStorage !== 'undefined' && localStorage) ||
          (global && global.localStorage) || null;
        if (st && typeof st.getItem === 'function') {
          const val = st.getItem('FZ_OFF_OCRCACHE');
          if (val === '1' || val === 'true') return true;
        }
      } catch (_) {}
      return false;
    },

    /** ফাইল বা পাতার তালিকার SHA-256 কনটেন্ট-হ্যাশ নির্ণয় */
    async computeContentHash(items) {
      const list = Array.isArray(items) ? items : [items];
      if (!list.length) return await sha256Hex(new Uint8Array(0));
      const hashes = [];
      for (let i = 0; i < list.length; i++) {
        const bytes = await extractItemBytes(list[i]);
        hashes.push(await sha256Hex(bytes));
      }
      if (hashes.length === 1) return hashes[0];
      return await sha256Hex(strToBytes(hashes.join('|')));
    },

    /** কনটেন্ট-হ্যাশ ও প্রম্পট-সংস্করণ দিয়ে ক্যাশ-কী তৈরি */
    buildCacheKey(contentHash, opts) {
      const pv = this.getPromptVersion(opts);
      const mode = (opts && typeof opts === 'object' && opts.mode) || 'template';
      const dir = (opts && typeof opts === 'object' && opts.directive) ? String(opts.directive).trim() : '';
      return pv + '|' + mode + (dir ? '|' + dir : '') + '|' + String(contentHash || '');
    },

    /** সেশন বা ইতিহাস থেকে ক্যাশ করা OCR ফলাফল খোঁজা */
    async findCachedOcr(cacheKey, opts) {
      if (this.isOcrCacheOff(opts) || !cacheKey) return null;
      const cur = await this.load();
      if (cur && cur.cacheKey === cacheKey) {
        if (cur.mode === 'faithful' && (cur.cap || (cur.run && cur.run.ir) || cur.ir)) {
          return {
            source: 'session',
            mode: 'faithful',
            cap: cur.cap,
            ir: (cur.run && cur.run.ir) || cur.ir,
            text: cur.ocrText || cur.text || '',
            ocrText: cur.ocrText || cur.text || '',
            cacheKey
          };
        }
        const txt = cur.ocrText || cur.text || '';
        if (cur.mode !== 'faithful' && txt.trim()) {
          return { source: 'session', mode: cur.mode || 'template', text: txt, ocrText: txt, cacheKey };
        }
      }
      const list = await this.historyList();
      for (let i = 0; i < list.length; i++) {
        const h = list[i];
        if (h && h.cacheKey === cacheKey) {
          if (h.mode === 'faithful' && (h.cap || h.ir)) {
            return {
              source: 'history',
              mode: 'faithful',
              cap: h.cap,
              ir: h.ir,
              text: h.ocrText || h.text || '',
              ocrText: h.ocrText || h.text || '',
              cacheKey,
              id: h.id
            };
          }
          const txt = h.ocrText || h.text || '';
          if (h.mode !== 'faithful' && txt.trim()) {
            return { source: 'history', mode: h.mode || 'template', text: txt, ocrText: txt, cacheKey, id: h.id };
          }
        }
      }
      return null;
    },

    /**
     * ক্যাশ যাচাই করে OCR চালানো: ক্যাশ থাকলে Gemini না ডেকে আগের OCR ফল ফেরত দেয়,
     * না থাকলে বা FZ_OFF_OCRCACHE চালু থাকলে runOcr() ডাকে।
     */
    async runWithOcrCache(params) {
      params = params || {};
      const off = this.isOcrCacheOff(params);
      const contentHash = params.contentHash || await this.computeContentHash(params.items || []);
      const promptVersion = this.getPromptVersion(params);
      const mode = params.mode || 'template';
      const cacheKey = this.buildCacheKey(contentHash, {
        promptVersion,
        mode,
        directive: params.directive || ''
      });

      if (!off) {
        const hit = await this.findCachedOcr(cacheKey, params);
        if (hit) {
          return {
            cached: true,
            hit: true,
            source: hit.source,
            cacheKey,
            contentHash,
            promptVersion,
            mode,
            text: hit.ocrText || hit.text || '',
            ocrText: hit.ocrText || hit.text || '',
            cap: hit.cap,
            ir: hit.ir
          };
        }
      }

      if (typeof params.runOcr !== 'function') {
        throw new Error('runOcr ফাংশন দেওয়া হয়নি');
      }
      const raw = await params.runOcr({ contentHash, cacheKey, promptVersion, mode });
      const text = typeof raw === 'string'
        ? raw
        : ((raw && (raw.ocrText || raw.unicode || raw.text)) || '');
      const cap = raw && raw.cap;
      const ir = raw && raw.ir;

      if (!off && params.autoSave !== false) {
        await this.historyAdd({
          name: params.name || 'Document',
          baseName: params.baseName || 'Document',
          pages: Array.isArray(params.items) ? (params.items.length || 1) : 1,
          mode,
          text,
          ocrText: text,
          cap,
          ir,
          cacheKey,
          contentHash,
          promptVersion
        });
      }

      return {
        cached: false,
        hit: false,
        source: 'ocr',
        cacheKey,
        contentHash,
        promptVersion,
        mode,
        text,
        ocrText: text,
        cap,
        ir,
        raw
      };
    }
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = FayzarSession;
  }
  global.FayzarSession = FayzarSession;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
