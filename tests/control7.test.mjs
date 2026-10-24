// tests/control7.test.mjs — পর্ব ৭ (CONTROL7_v1): OCR ক্যাশ ও পুরোনো পদ্ধতি (legacy) সুইচ ইউনিট ও ইন্টিগ্রেশন টেস্ট
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AutoRoute = require('../js/auto-route.js');
const FayzarSession = require('../js/session-store.js');

let pass = 0, fail = 0;
async function test(name, fn) {
  try {
    await fn();
    pass++;
    console.log('PASS:', name);
  } catch (err) {
    fail++;
    console.error('FAIL:', name, err && err.stack ? err.stack : err);
  }
}

const origLocation = globalThis.location;
const origLocalStorage = globalThis.localStorage;

function resetGlobals() {
  delete globalThis.location;
  delete globalThis.localStorage;
  delete globalThis.__FZ_OFF_OCRCACHE;
  delete globalThis.FZ_OFF_OCRCACHE;
  delete globalThis.__FZ_PROMPT_VERSION;
  FayzarSession.setPromptVersion('ocr-v1');
}

// home-app.js চালানোর জন্য হালকা ব্রাউজার DOM স্যান্ডবক্স তৈরি
function createHomeSandbox(opts = {}) {
  const elements = {};
  const makeEl = (id) => ({
    id,
    hidden: false,
    value: '',
    textContent: '',
    innerHTML: '',
    checked: false,
    style: {},
    dataset: {},
    files: [],
    classList: {
      _set: new Set(),
      add(...c) { c.forEach((x) => this._set.add(x)); },
      remove(...c) { c.forEach((x) => this._set.delete(x)); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._set.has(c)) this._set.delete(c); else this._set.add(c);
        } else if (force) this._set.add(c); else this._set.delete(c);
      },
      contains(c) { return this._set.has(c); }
    },
    setAttribute(k, v) { this[k] = v; },
    getAttribute(k) { return this[k]; },
    addEventListener(ev, fn) {
      this._listeners = this._listeners || {};
      (this._listeners[ev] = this._listeners[ev] || []).push(fn);
    },
    click() {
      if (typeof this.onclick === 'function') return this.onclick();
      const list = (this._listeners && this._listeners.click) || [];
      list.forEach((fn) => fn({ preventDefault() {}, stopPropagation() {}, target: this }));
    },
    focus() {},
    remove() {},
    append(...children) { this.children = (this.children || []).concat(children); },
    appendChild(child) { (this.children = this.children || []).push(child); return child; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; }
  });

  const getEl = (id) => {
    if (!elements[id]) elements[id] = makeEl(id);
    return elements[id];
  };

  const storageMap = new Map(Object.entries(opts.storage || {}));
  const localStorageMock = {
    getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  };

  let ocrCalls = 0;
  let autoPrepCalls = 0;
  let lastDownloadArgs = null;
  let layoutCalls = 0;

  const engine = {
    PROMPT_VERSION: opts.promptVersion || 'ocr-v1',
    state: {
      filesQueue: [],
      unicodeText: '',
      isProcessing: false,
      layoutColumns: 'auto'
    },
    async handleFiles(files) {
      this.state.filesQueue = files.map((f, i) => ({
        file: f,
        name: f.name || `page_${i + 1}.png`,
        size: f.size || 0,
        isPdf: false,
        mimeType: f.type || 'image/png',
        base64: f.base64 || ''
      }));
    },
    async startUnifiedOcr() {
      ocrCalls++;
      const txt = opts.ocrResponse || `বাংলা OCR ফলাফল #${ocrCalls}`;
      this.state.unicodeText = txt;
      return { unicode: txt };
    },
    async downloadWordDocument(fmt, dlOpts) {
      lastDownloadArgs = { fmt, dlOpts, legacyState: this.state.legacy, text: this.state.unicodeText };
      return { ok: true };
    }
  };

  const sandboxWindow = {
    document: {
      readyState: 'complete',
      body: makeEl('body'),
      getElementById: getEl,
      createElement: (tag) => makeEl(tag),
      querySelectorAll: () => []
    },
    location: {
      search: opts.search || '',
      hash: '',
      pathname: '/index.html'
    },
    history: { replaceState() {} },
    localStorage: localStorageMock,
    crypto: globalThis.crypto,
    TextEncoder: globalThis.TextEncoder,
    Uint8Array: globalThis.Uint8Array,
    ArrayBuffer: globalThis.ArrayBuffer,
    Blob: globalThis.Blob,
    File: globalThis.File || class MockFile {
      constructor(parts, name) {
        this._buf = new TextEncoder().encode((parts || []).join(''));
        this.name = name || 'Document';
        this.size = this._buf.byteLength;
        this.type = 'image/png';
      }
      async arrayBuffer() { return this._buf.buffer; }
    },
    URL: {
      createObjectURL: () => 'blob:mock',
      revokeObjectURL: () => {}
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    WeakMap: globalThis.WeakMap,
    Set: globalThis.Set,
    Promise: globalThis.Promise,
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    scrollTo: () => {},
    addEventListener: () => {},
    confirm: () => true,
    showToastNotification: () => {},
    FayzarAutoRoute: AutoRoute,
    FayzarSession: null,
    FayzarAiOcrEngine: engine,
    FayzarAutoPrep: {
      async autoPrep(item) {
        autoPrepCalls++;
        return [item];
      }
    },
    FayzarTemplateComposer: {
      GROUPS: [],
      REGISTRY: [],
      byId: (id) => (id ? { id, label: 'ছাঁচ', desc: 'পরীক্ষা' } : null),
      promptHint: () => 'hint',
      enforce: (text) => {
        layoutCalls++;
        return { text: text + '\n[সাজানো-লেআউট]', warnings: [] };
      }
    }
  };
  sandboxWindow.window = sandboxWindow;
  sandboxWindow.globalThis = sandboxWindow;

  // স্যান্ডবক্সের ভেতরে আলাদা FayzarSession ইনস্ট্যান্স লোড করা
  const sessionCode = fs.readFileSync(path.join(__dirname, '../js/session-store.js'), 'utf8');
  vm.runInNewContext(sessionCode, sandboxWindow);

  const homeCode = fs.readFileSync(path.join(__dirname, '../js/home-app.js'), 'utf8');
  vm.runInNewContext(homeCode, sandboxWindow);

  return {
    window: sandboxWindow,
    elements,
    engine,
    localStorage: localStorageMock,
    getOcrCalls: () => ocrCalls,
    getAutoPrepCalls: () => autoPrepCalls,
    getLayoutCalls: () => layoutCalls,
    getLastDownloadArgs: () => lastDownloadArgs
  };
}

function makeFakeFile(content, name = 'test.png', type = 'image/png') {
  const bytes = new TextEncoder().encode(content);
  return {
    name,
    size: bytes.byteLength,
    type,
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
  };
}

// ===================================================================
// টেস্ট শুরু
// ===================================================================

// (ক) একই হ্যাশে দ্বিতীয়বার OCR-ফাংশন ডাকা হয় না (mock)
await test('(ক.১) একই হ্যাশে দ্বিতীয়বার OCR-ফাংশন ডাকা হয় না (FayzarSession.runWithOcrCache)', async () => {
  resetGlobals();
  await FayzarSession.clear();
  await FayzarSession.historyClear();

  const file1 = makeFakeFile('একই ছবির বাইট ডেটা ১২৩৪৫', 'page1.png');
  const file1Copy = makeFakeFile('একই ছবির বাইট ডেটা ১২৩৪৫', 'page1_copy.png');

  let geminiCalls = 0;
  const mockGeminiOcr = async () => {
    geminiCalls++;
    return { unicode: 'প্রথমবার Gemini থেকে পাওয়া লেখা' };
  };

  const res1 = await FayzarSession.runWithOcrCache({
    items: [{ file: file1, name: file1.name }],
    mode: 'template',
    runOcr: mockGeminiOcr
  });
  assert.equal(geminiCalls, 1, 'প্রথমবার OCR ডাকা হবে');
  assert.equal(res1.hit, false);
  assert.equal(res1.text, 'প্রথমবার Gemini থেকে পাওয়া লেখা');

  const res2 = await FayzarSession.runWithOcrCache({
    items: [{ file: file1Copy, name: file1Copy.name }],
    mode: 'template',
    runOcr: mockGeminiOcr
  });
  assert.equal(geminiCalls, 1, 'একই কনটেন্ট-হ্যাশে দ্বিতীয়বার Gemini OCR ডাকা হবে না');
  assert.equal(res2.hit, true, 'ক্যাশ হিট হতে হবে');
  assert.equal(res2.text, 'প্রথমবার Gemini থেকে পাওয়া লেখা');
  assert.equal(res1.contentHash, res2.contentHash, 'SHA-256 হ্যাশ এক হতে হবে');
});

await test('(ক.২) home-app.js-এ একই ফাইল আবার কনভার্ট ও ইতিহাস থেকে ডাউনলোডে Gemini ডাকা হয় না, শুধু লেআউট/এক্সপোর্ট চলে', async () => {
  const sb = createHomeSandbox({ ocrResponse: 'ক্যাশকৃত প্রশ্নপত্রের লেখা' });
  const f1 = makeFakeFile('প্রশ্নপত্রের ছবির বাইট-কনটেন্ট', 'q1.png');

  await sb.window.FayzarHome.acceptFiles([f1], false);
  sb.window.document.getElementById('tplGallery');
  await sb.window.FayzarHome.convert();
  assert.equal(sb.getOcrCalls(), 1, 'প্রথমবার কনভার্টে ১ বার OCR ডাকা হয়েছে');

  // একই ফাইল আবার দিয়ে কনভার্ট করলে Gemini ডাকা হবে না
  const f1Again = makeFakeFile('প্রশ্নপত্রের ছবির বাইট-কনটেন্ট', 'q1_again.png');
  await sb.window.FayzarHome.acceptFiles([f1Again], false);
  await sb.window.FayzarHome.convert();
  assert.equal(sb.getOcrCalls(), 1, 'একই ফাইলে দ্বিতীয়বার কনভার্টে Gemini ডাকা হয়নি');
  assert.equal(sb.elements['wizardPreviewContent'].value, 'ক্যাশকৃত প্রশ্নপত্রের লেখা');

  // ইতিহাস থেকে খুলে আবার ডাউনলোড করলেও Gemini ডাকা হবে না
  const hist = await sb.window.FayzarSession.historyList();
  assert.equal(hist.length, 1, 'ইতিহাসে ১টি এন্ট্রি জমা আছে');
  await sb.window.FayzarHome.openEntry(hist[0].id);
  await sb.window.FayzarHome.downloadEntry(hist[0].id, 'doc');
  assert.equal(sb.getOcrCalls(), 1, 'ইতিহাস থেকে খোলা ও ডাউনলোডে Gemini ডাকা হয়নি');
  assert.equal(sb.getLastDownloadArgs().fmt, 'doc', 'এক্সপোর্ট ফাংশন ডাকা হয়েছে');
});

// (খ) ভিন্ন ফাইলে ডাকা হয়
await test('(খ) ভিন্ন ফাইলে নতুন হ্যাশ তৈরি হয় এবং OCR-ফাংশন ডাকা হয়', async () => {
  resetGlobals();
  await FayzarSession.clear();
  await FayzarSession.historyClear();

  const fileA = makeFakeFile('ফাইল ক-এর ছবি ডেটা', 'a.png');
  const fileB = makeFakeFile('ফাইল খ-এর ভিন্ন ছবি ডেটা', 'b.png');

  let calls = 0;
  const mockOcr = async () => {
    calls++;
    return { unicode: `লেখা-${calls}` };
  };

  const rA = await FayzarSession.runWithOcrCache({
    items: [{ file: fileA }],
    runOcr: mockOcr
  });
  const rB = await FayzarSession.runWithOcrCache({
    items: [{ file: fileB }],
    runOcr: mockOcr
  });

  assert.notEqual(rA.contentHash, rB.contentHash, 'ভিন্ন ফাইলের হ্যাশ ভিন্ন হতে হবে');
  assert.equal(calls, 2, 'ভিন্ন ফাইলের জন্য OCR-ফাংশন দ্বিতীয়বার ডাকা হয়েছে');
  assert.equal(rB.hit, false);
  assert.equal(rB.text, 'লেখা-2');
});

// (গ) প্রম্পট-সংস্করণ বদলালে ডাকা হয়
await test('(গ) প্রম্পট-সংস্করণ বদলালে পুরোনো ক্যাশ ব্যবহার না করে আবার OCR-ফাংশন ডাকা হয়', async () => {
  resetGlobals();
  await FayzarSession.clear();
  await FayzarSession.historyClear();

  const file = makeFakeFile('একই ফাইলের বাইট কিন্তু প্রম্পট বদলাবে', 'doc.png');
  let calls = 0;
  const mockOcr = async ({ promptVersion }) => {
    calls++;
    return { unicode: `ফল:${promptVersion}:${calls}` };
  };

  FayzarSession.setPromptVersion('v1.0');
  const resV1 = await FayzarSession.runWithOcrCache({
    items: [{ file }],
    runOcr: mockOcr
  });
  assert.equal(calls, 1);
  assert.equal(resV1.text, 'ফল:v1.0:1');

  // একই প্রম্পট-সংস্করণে ক্যাশ হিট
  const resV1Cached = await FayzarSession.runWithOcrCache({
    items: [{ file }],
    runOcr: mockOcr
  });
  assert.equal(calls, 1, 'একই প্রম্পট-সংস্করণে আবার ডাকা হয়নি');
  assert.equal(resV1Cached.hit, true);

  // প্রম্পট-সংস্করণ বদলানো হলো
  FayzarSession.setPromptVersion('v2.0');
  const resV2 = await FayzarSession.runWithOcrCache({
    items: [{ file }],
    runOcr: mockOcr
  });
  assert.equal(calls, 2, 'প্রম্পট-সংস্করণ বদলালে আবার OCR ডাকা হয়েছে');
  assert.equal(resV2.hit, false);
  assert.notEqual(resV1.cacheKey, resV2.cacheKey, 'ক্যাশ-কী ভিন্ন হতে হবে');
  assert.equal(resV2.text, 'ফল:v2.0:2');
});

// (ঘ) FZ_OFF_OCRCACHE-এ সবসময় ডাকা হয়
await test('(ঘ) FZ_OFF_OCRCACHE সুইচ চালু থাকলে ক্যাশ বাইপাস করে সবসময় OCR ডাকা হয়', async () => {
  resetGlobals();
  await FayzarSession.clear();
  await FayzarSession.historyClear();

  const file = makeFakeFile('ক্যাশ বন্ধ পরীক্ষার ফাইল', 'nocache.png');
  let calls = 0;
  const mockOcr = async () => {
    calls++;
    return { unicode: `লাইভ-${calls}` };
  };

  // ১. localStorage FZ_OFF_OCRCACHE === '1'
  globalThis.localStorage = {
    getItem: (k) => (k === 'FZ_OFF_OCRCACHE' ? '1' : null)
  };

  const r1 = await FayzarSession.runWithOcrCache({ items: [{ file }], runOcr: mockOcr });
  const r2 = await FayzarSession.runWithOcrCache({ items: [{ file }], runOcr: mockOcr });
  assert.equal(calls, 2, 'FZ_OFF_OCRCACHE=1 থাকলে প্রতিবার OCR ডাকা হয়');
  assert.equal(r1.hit, false);
  assert.equal(r2.hit, false);

  // ২. home-app স্যান্ডবক্সে FZ_OFF_OCRCACHE=1
  const sb = createHomeSandbox({ storage: { FZ_OFF_OCRCACHE: '1' } });
  await sb.window.FayzarHome.acceptFiles([file], false);
  await sb.window.FayzarHome.convert();
  await sb.window.FayzarHome.convert();
  assert.equal(sb.getOcrCalls(), 2, 'home-app এ FZ_OFF_OCRCACHE=1 থাকলে প্রতিবার startUnifiedOcr ডাকা হয়');
});

// (ঙ) ?engine=legacy ও FZ_ON_LEGACY === '1' → decide().legacy === true এবং home-app এ পাস
await test('(ঙ.১) ?engine=legacy দিলে decide().legacy === true', () => {
  resetGlobals();
  globalThis.location = { search: '?engine=legacy' };
  globalThis.localStorage = { getItem: () => null };

  const res = AutoRoute.decide({});
  assert.equal(res.legacy, true, '?engine=legacy থাকলে legacy true হতে হবে');
  assert.equal(res.mode, 'template', 'মোড ডিফল্ট template থাকবে');
});

await test('(ঙ.২) localStorage FZ_ON_LEGACY=1 দিলে decide().legacy === true এবং home-app নতুন পর্ব এড়িয়ে যায়', async () => {
  resetGlobals();
  globalThis.location = { search: '' };
  globalThis.localStorage = {
    getItem: (k) => (k === 'FZ_ON_LEGACY' ? '1' : null)
  };

  const res = AutoRoute.decide({});
  assert.equal(res.legacy, true, 'FZ_ON_LEGACY=1 থাকলে legacy true হতে হবে');

  // home-app স্যান্ডবক্সে ?engine=legacy থাকলে autoPrep এড়ানো এবং ইঞ্জিনে legacy ফ্ল্যাগ পৌঁছানো যাচাই
  const sb = createHomeSandbox({ search: '?engine=legacy' });
  const file = makeFakeFile('লেগ্যাসি পরীক্ষার ছবি', 'legacy.png');
  await sb.window.FayzarHome.acceptFiles([file], false);
  assert.equal(sb.getAutoPrepCalls(), 0, 'legacy চালু থাকলে AUTOPREP (autoPrep) এড়িয়ে যাবে');
  await sb.window.FayzarHome.convert();
  assert.equal(sb.engine.state.legacy, true, 'ইঞ্জিনের state.legacy = true সেট হয়েছে');
  assert.equal(sb.engine.state.designSheet, false, 'legacy মোডে designSheet বন্ধ করা হয়েছে');
  await sb.elements['wizardDlDocBtn'].click();
  assert.equal(sb.getLastDownloadArgs().dlOpts.legacy, true, 'ডাউনলোডে legacy: true পাস হয়েছে');
});

// (চ) ডিফল্টে legacy false, আর পুরোনো auto-route টেস্ট পাস
await test('(চ.১) ডিফল্টে decide().legacy === false', () => {
  resetGlobals();
  globalThis.location = { search: '' };
  globalThis.localStorage = { getItem: () => null };

  const res = AutoRoute.decide({});
  assert.equal(res.legacy, false, 'ডিফল্টে legacy false হতে হবে');
  assert.equal(res.mode, 'template');
  assert.equal(res.reason, 'default');
});

await test('(চ.২) পুরোনো auto-route টেস্টের সব শর্ত পাস ও ইতিহাসের ২০-সীমা অক্ষুণ্ণ', async () => {
  resetGlobals();
  // ১. URL ?mode=faithful
  globalThis.location = { search: '?doc=1&mode=faithful&lang=bn' };
  globalThis.localStorage = { getItem: () => null };
  let r = AutoRoute.decide({});
  assert.equal(r.mode, 'faithful');
  assert.equal(r.reason, 'override');
  assert.equal(r.legacy, false);

  // ২. localStorage FZ_ON_FAITHFUL = '1'
  globalThis.location = { search: '' };
  globalThis.localStorage = { getItem: (k) => (k === 'FZ_ON_FAITHFUL' ? '1' : null) };
  r = AutoRoute.decide({});
  assert.equal(r.mode, 'faithful');
  assert.equal(r.reason, 'override');
  assert.equal(r.legacy, false);

  // ৩. localStorage ত্রুটি সহনশীলতা
  globalThis.localStorage = { getItem: () => { throw new Error('SecurityError'); } };
  r = AutoRoute.decide({ doc_type: 'exam_question', pages: 2 });
  assert.equal(r.mode, 'template');
  assert.equal(r.reason, 'default');
  assert.equal(r.legacy, false);

  // ৪. ইতিহাসের আকার-সীমা (MAX_HISTORY = 20) অক্ষুণ্ণ থাকা যাচাই
  resetGlobals();
  await FayzarSession.historyClear();
  for (let i = 1; i <= 25; i++) {
    await FayzarSession.historyAdd({ name: `doc_${i}`, baseName: `doc_${i}`, pages: 1, mode: 'template', text: `লেখা ${i}`, cacheKey: `k_${i}` });
  }
  const list = await FayzarSession.historyList();
  assert.equal(list.length, 20, 'ইতিহাসের আকার-সীমা সর্বোচ্চ ২০টি থাকবে');
});

resetGlobals();
if (origLocation !== undefined) globalThis.location = origLocation;
if (origLocalStorage !== undefined) globalThis.localStorage = origLocalStorage;

console.log(`\nফলাফল: ${pass} পাস, ${fail} ব্যর্থ`);
if (fail > 0) process.exit(1);
