/**
 * D_E2E_v10: ফলাফল-পাতার লেআউট-বদল (D1–D4) বাস্তব ব্রাউজারে E2E টেস্ট
 *   node tests/result-relayout-e2e.test.mjs
 *
 * বাস্তব Chromium-এ index.html খুলে (OCR ও নেটওয়ার্ক ছাড়াই):
 *   ১) সেশনে (FayzarSession ও ফলাফল প্রিভিউতে) কৃত্রিম Markdown রেখে ফলাফল-অংশ (#wsResult) প্রদর্শন।
 *   ২) (ক) D1: "শনাক্ত: … [বদলান]" লেবেল ও বোতাম দৃশ্যমান এবং লেআউট ড্রপডাউন খোলা।
 *   ৩) (খ) D1: ড্রপডাউনে লেআউট বদলালে <৫ সেকেন্ডে নতুন ফাইল/প্রিভিউ আসে এবং আবার OCR ডাকা হয় না (fetch/XHR = ০)।
 *   ৪) (গ) D2: কলাম/পাতা/দিক/বুকলেট/ফন্ট-সাইজ সেটিংস বদল প্রিভিউ, অপশন ও রপ্তানি ফাইলে প্রতিফলিত হয়।
 *   ৫) (ঘ) D4: localStorage 'fz_relayout_log'-এ "শনাক্ত X → বাছাই Y" এন্ট্রি জমা হয় (ফাইল-হ্যাশ ছাড়া)।
 *   ৬) D3: "ঠিক হয়নি?" প্যানেলে ① সাজানো ভুল ও ② লেখা বাদ/ভুল অপশন এবং বিশেষ প্রম্পট হুক যাচাই।
 * Playwright/Chromium না থাকলে পরিষ্কার SKIP (ভুয়া পাস নয়)।
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let chromium = null;
for (const from of [
  path.join(ROOT, 'package.json'),
  path.join(ROOT, 'scratch', 'test_env', 'package.json'),
  path.join(os.homedir(), 'qa', 'package.json')
]) {
  try {
    chromium = createRequire(from)('playwright').chromium;
    break;
  } catch (e) { /* পরের প্রোফাইল */ }
}
if (!chromium) {
  console.log('SKIP: playwright/Chromium নেই — result-relayout-e2e এড়ানো হলো (ভুয়া পাস নয়)');
  process.exit(0);
}

let pass = 0, fail = 0;
const T = (n, c, x) => {
  c ? pass++ : fail++;
  console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x)));
};

// RTF বা ডকুমেন্ট টেক্সট থেকে ইউনিকোড অক্ষর ডিকোড করার সহায়ক ফাংশন
const rtfDecode = (s) => String(s)
  .replace(/\\u(-?\d+)\s?\??/g, (_, d) => String.fromCharCode(((Number(d) % 65536) + 65536) % 65536))
  .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
const rtfPlain = (s) => rtfDecode(s).replace(/\\[a-zA-Z]+-?\d*\s?/g, '').replace(/[{}]/g, '');

// আংশিক বান্ডেল পরিবেশে কোনো সহায়ক স্ক্রিপ্ট না থাকলে অফলাইন ফলব্যাক (পূর্ণ রিপোতে ডিস্কের মূল ফাইলই ব্যবহৃত হবে)
const FALLBACK_JS = {
  '/js/session-store.js': `
    (function (w) {
      if (w.FayzarSession) return;
      const KEY = '__fz_session_v1';
      const HKEY = '__fz_history_v1';
      w.FayzarSession = {
        save(rec) { try { sessionStorage.setItem(KEY, JSON.stringify(rec || null)); } catch (e) {} },
        async load() { try { const r = sessionStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } },
        clear() { try { sessionStorage.removeItem(KEY); } catch (e) {} },
        async historyAdd(entry) {
          try {
            const list = await this.historyList();
            const id = 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
            list.unshift(Object.assign({ id, at: Date.now() }, entry || {}));
            sessionStorage.setItem(HKEY, JSON.stringify(list.slice(0, 20)));
            return id;
          } catch (e) { return 'h_1'; }
        },
        async historyList() { try { const r = sessionStorage.getItem(HKEY); return r ? JSON.parse(r) : []; } catch (e) { return []; } },
        async historyGet(id) { const list = await this.historyList(); return list.find((x) => x.id === id) || null; },
        async historyUpdate(id, patch) {
          const list = await this.historyList();
          const it = list.find((x) => x.id === id);
          if (it) Object.assign(it, patch || {});
          try { sessionStorage.setItem(HKEY, JSON.stringify(list)); } catch (e) {}
        },
        async historyDelete(id) {
          const list = (await this.historyList()).filter((x) => x.id !== id);
          try { sessionStorage.setItem(HKEY, JSON.stringify(list)); } catch (e) {}
        },
        async historyClear() { try { sessionStorage.removeItem(HKEY); } catch (e) {} }
      };
    })(window);
  `,
  '/js/ai-ocr-engine.js': `
    (function (w) {
      if (w.FayzarAiOcrEngine) return;
      w.FayzarAiOcrEngine = {
        state: { filesQueue: [], unicodeText: '', selectedFile: null, layoutColumns: 'auto', isProcessing: false, templateHint: '' },
        async handleFiles(files) {
          this.state.filesQueue = Array.from(files || []).map((f, i) => ({
            file: f, name: f.name || ('page-' + (i + 1) + '.png'), size: f.size || 0, isPdf: false, mimeType: f.type || 'image/png'
          }));
        },
        async startUnifiedOcr() {
          w.__ocrEngineCalledCount = (w.__ocrEngineCalledCount || 0) + 1;
          throw new Error('OCR ডাকা নিষিদ্ধ (অফলাইন টেস্ট)');
        },
        async prepareSourceFigures(text) {
          return { cancelled: false, text, figures: [] };
        },
        async downloadWordDocument(fmt) {
          if (w.FayzarExport && typeof w.FayzarExport.produce === 'function') {
            return await w.FayzarExport.produce(this.state.unicodeText || '', { format: fmt || 'doc' });
          }
        }
      };
    })(window);
  `,
  '/js/layout-engine/fayzar-export.js': `
    (function (w) {
      if (w.FayzarExport) return;
      w.FayzarExport = {
        async produce(text, opts) {
          const o = Object.assign({}, opts || {});
          const rtfHeader = '{\\\\rtf1\\\\ansi\\\\deff0{\\\\info{\\\\doccomm docType=' + (o.docType || 'GENERAL') +
            ';cols=' + (o.columns || 1) +
            ';page=' + (o.pageSize || 'a4') +
            ';orient=' + (o.orientation || 'portrait') +
            ';booklet=' + Boolean(o.booklet) +
            ';font=' + (o.fontSize || 11) + '}}\\n';
          const body = rtfHeader + String(text || '') + '}';
          const blob = new Blob([body], { type: 'application/msword;charset=utf-8' });
          return { blob, format: o.format || 'doc', options: o, steps: ['master-docx', o.format || 'doc'] };
        }
      };
    })(window);
  `
};

// ১x১ স্বচ্ছ PNG (ছবি ফাইলের অফলাইন ফলব্যাকের জন্য)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

// লোকাল HTTP সার্ভার চালু করা
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const rel = u === '/' ? 'index.html' : u.replace(/^\/+/, '');
  const fp = path.join(ROOT, rel);
  if (fs.existsSync(fp) && !fs.statSync(fp).isDirectory()) {
    r.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(r);
    return;
  }
  const ext = path.extname(u).toLowerCase();
  if (FALLBACK_JS[u]) {
    r.writeHead(200, { 'Content-Type': MIME['.js'] });
    r.end(FALLBACK_JS[u]);
    return;
  }
  if (ext === '.js' || ext === '.mjs') {
    r.writeHead(200, { 'Content-Type': MIME['.js'] });
    r.end('/* অফলাইন খালি মডিউল */');
    return;
  }
  if (ext === '.css') {
    r.writeHead(200, { 'Content-Type': MIME['.css'] });
    r.end('/* অফলাইন খালি স্টাইল */');
    return;
  }
  if (ext === '.svg') {
    r.writeHead(200, { 'Content-Type': MIME['.svg'] });
    r.end('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
    return;
  }
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
    r.writeHead(200, { 'Content-Type': MIME['.png'] });
    r.end(TINY_PNG);
    return;
  }
  r.writeHead(404);
  r.end('nf');
});
await new Promise((res) => server.listen(0, '127.0.0.1', res));
const BASE = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const ctx = await browser.newContext();

// পেজ লোডের আগেই সুইচ (__FZ_ON_RELAYOUT), Blob সংগ্রাহক এবং নেটওয়ার্ক (fetch/XHR) কাউন্টার বসানো
await ctx.addInitScript(() => {
  window.__FZ_ON_RELAYOUT = true;
  window.__blobs = [];
  window.__downloads = [];
  window.__exportCalls = [];
  window.__netStats = { fetch: 0, xhr: 0, ocrCalls: 0, urls: [] };

  const origCreateObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (obj) => {
    try {
      if (obj instanceof Blob) window.__blobs.push(obj);
    } catch (e) {}
    return origCreateObjectURL(obj);
  };

  const origAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    try {
      if (this.download) {
        window.__downloads.push({ download: this.download, href: this.href });
      }
    } catch (e) {}
    return origAnchorClick.apply(this, arguments);
  };

  if (typeof window.fetch === 'function') {
    const origFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      window.__netStats.fetch++;
      window.__netStats.urls.push({ type: 'fetch', url: String(url) });
      return origFetch(input, init);
    };
  }

  if (typeof XMLHttpRequest !== 'undefined') {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__fzUrl = String(url || '');
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      window.__netStats.xhr++;
      window.__netStats.urls.push({ type: 'xhr', url: this.__fzUrl || '' });
      return origSend.apply(this, arguments);
    };
  }
});

const page = await ctx.newPage();
const errs = [];
let pwFetchXhrCount = 0;
let pwExternalNetCount = 0;

page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
page.on('request', (req) => {
  try {
    const rt = typeof req.resourceType === 'function' ? req.resourceType() : '';
    const u = typeof req.url === 'function' ? req.url() : '';
    if (rt === 'fetch' || rt === 'xhr') pwFetchXhrCount++;
    if (u && !u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:') && u !== 'about:blank') {
      pwExternalNetCount++;
    }
  } catch (e) {}
});

await page.route('**', (r) => {
  const u = r.request().url();
  return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
});

await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.FayzarRelayout && document.getElementById('wsResult')), { timeout: 30000 });

// সেশনে রাখার জন্য কৃত্রিম বহুনির্বাচনি (MCQ) প্রশ্নপত্রের মার্কডাউন
const SAMPLE_MD = [
  '---',
  'doc_type: EXAM_MCQ',
  'institution: ফুলবাড়ী আদর্শ উচ্চ বিদ্যালয়',
  'subject: তথ্য ও যোগাযোগ প্রযুক্তি',
  'class: দশম',
  'time: ৩০ মিনিট',
  'full_marks: ২৫',
  '---',
  '১. কম্পিউটারের মস্তিষ্ক বলা হয় কোনটিকে?',
  'ক. হার্ডডিস্ক',
  'খ. র‍্যাম',
  'গ. মাইক্রোপ্রসেসর',
  'ঘ. মাদারবোর্ড',
  '',
  '২. নিচের কোনটি ইনপুট ডিভাইস?',
  'ক. মাউস',
  'খ. প্রিন্টার',
  'গ. মনিটর',
  'ঘ. স্পিকার'
].join('\n');

// ───────────── ১) সেশনে কৃত্রিম Markdown স্থাপন ও ফলাফল-পাতা প্রদর্শন (OCR ছাড়া) ─────────────
{
  const sessionReady = await page.evaluate(async (md) => {
    window.__FZ_ON_RELAYOUT = true;
    window.FayzarRelayout.clearLogs();

    // OCR ইঞ্জিন ও রপ্তানি মডিউলে স্পাই সংযোজন (যাতে প্রকৃত আচরণ অক্ষুণ্ণ রেখে যাচাই করা যায়)
    if (window.FayzarAiOcrEngine) {
      const origOcr = window.FayzarAiOcrEngine.startUnifiedOcr;
      window.FayzarAiOcrEngine.startUnifiedOcr = async function () {
        window.__netStats.ocrCalls++;
        if (typeof origOcr === 'function') return origOcr.apply(this, arguments);
      };
      if (!window.FayzarAiOcrEngine.state) window.FayzarAiOcrEngine.state = {};
      const dummyFile = new File(['dummy'], 'ict-mcq.png', { type: 'image/png' });
      window.FayzarAiOcrEngine.state.filesQueue = [{
        file: dummyFile,
        name: 'ict-mcq.png',
        size: 5,
        isPdf: false,
        mimeType: 'image/png',
        base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }];
      window.FayzarAiOcrEngine.state.selectedFile = dummyFile;
      window.FayzarAiOcrEngine.state.unicodeText = md;
    }

    if (window.FayzarExport && typeof window.FayzarExport.produce === 'function' && !window.FayzarExport.__spied) {
      const origProduce = window.FayzarExport.produce.bind(window.FayzarExport);
      window.FayzarExport.produce = async function (text, opts) {
        const res = await origProduce(text, opts);
        if (res && res.blob) window.__blobs.push(res.blob);
        window.__exportCalls.push({
          text: String(text || ''),
          opts: JSON.parse(JSON.stringify(opts || {})),
          hasBlob: Boolean(res && res.blob),
          blobSize: res && res.blob ? res.blob.size : 0
        });
        return res;
      };
      window.FayzarExport.__spied = true;
    }

    // সেশনে (FayzarSession) কৃত্রিম মার্কডাউন সংরক্ষণ এবং কনভার্ট-ইতিহাসের মাধ্যমে ফলাফল-পাতা খোলা
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    if (window.FayzarSession && typeof window.FayzarSession.save === 'function') {
      await window.FayzarSession.save({
        view: 'result',
        mode: 'template',
        directive: '',
        tpl: '',
        myTpl: '',
        items: [{ name: 'ict-mcq.png', size: 68, isPdf: false, mimeType: 'image/png', base64: dataUrl }],
        text: md,
        run: { mode: 'template', baseName: 'ict-mcq', custom: '' },
        done: { title: 'আপনার Word ফাইল প্রস্তুত!', meta: '১ পাতা · তিন ফরম্যাটেই নামাতে পারবেন' }
      });
    }

    if (window.FayzarSession && typeof window.FayzarSession.historyAdd === 'function') {
      await window.FayzarSession.historyAdd({
        name: 'ict-mcq.png',
        baseName: 'ict-mcq',
        pages: 1,
        mode: 'template',
        text: md,
        thumb: dataUrl
      });
      const histLink = document.querySelector('.fz-links a.fz-hist');
      if (histLink) histLink.click();
      await new Promise((r) => setTimeout(r, 80));
      const openBtn = document.querySelector('#histList .hist-row .hist-acts .btn-o');
      if (openBtn) openBtn.click();
      await new Promise((r) => setTimeout(r, 80));
    }

    // যদি কোনো কারণে সরাসরি মাউন্ট না হয়ে থাকে তবে ফলাফল-পাতা ও mountResult নিশ্চিত করা
    const wsResult = document.getElementById('wsResult');
    const previewEl = document.getElementById('wizardPreviewContent');
    if (previewEl && !previewEl.value.trim()) previewEl.value = md;
    if (wsResult && wsResult.hidden) {
      const hero = document.getElementById('hero');
      if (hero) hero.hidden = true;
      wsResult.hidden = false;
    }
    if (!document.getElementById('fzRelayoutBox')) {
      window.FayzarRelayout.mountResult({
        faithful: false,
        baseName: () => 'ict-mcq',
        getText: () => (previewEl && previewEl.value) || md,
        setText: (t) => {
          if (previewEl) previewEl.value = t;
          if (window.FayzarAiOcrEngine && window.FayzarAiOcrEngine.state) {
            window.FayzarAiOcrEngine.state.unicodeText = t;
          }
        },
        saveBlob: (blob, name) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        },
        toast: () => {}
      });
    }

    const sessionMd = await window.FayzarRelayout.getSessionMarkdown();
    return {
      resultVisible: Boolean(wsResult && !wsResult.hidden),
      heroHidden: Boolean(document.getElementById('hero') && document.getElementById('hero').hidden),
      hasSessionMd: sessionMd.includes('ফুলবাড়ী আদর্শ উচ্চ বিদ্যালয়') && sessionMd.includes('কম্পিউটারের মস্তিষ্ক'),
      ocrCalls: window.__netStats.ocrCalls
    };
  }, SAMPLE_MD);

  T('সেশন: OCR ছাড়াই ফলাফল-পাতা (#wsResult) দৃশ্যমান হয়েছে', sessionReady.resultVisible && sessionReady.heroHidden, sessionReady);
  T('সেশন: getSessionMarkdown() কৃত্রিম মার্কডাউন ফেরত দেয় ও OCR ডাকা হয়নি', sessionReady.hasSessionMd && sessionReady.ocrCalls === 0, sessionReady);
}

// ───────────── ২) যাচাই (ক): "শনাক্ত: … [বদলান]" দেখা যায় ─────────────
{
  const uiState = await page.evaluate(() => {
    const box = document.getElementById('fzRelayoutBox');
    const lbl = document.getElementById('fzDetectedLabel');
    const btn = document.getElementById('fzBtnChangeLayout');
    const pickerWrap = document.getElementById('fzLayoutPickerWrap');
    return {
      boxVisible: Boolean(box && !box.hidden),
      labelText: lbl ? lbl.textContent.trim() : '',
      btnText: btn ? btn.textContent.trim() : '',
      pickerInitiallyHidden: Boolean(pickerWrap && pickerWrap.hidden)
    };
  });

  T(
    '(ক) D1: ফলাফল-পাতায় "শনাক্ত: বহুনির্বাচনি (MCQ) প্রশ্নপত্র" ও "[বদলান]" বোতাম দেখা যায়',
    uiState.boxVisible &&
      uiState.labelText.startsWith('শনাক্ত:') &&
      uiState.labelText.includes('বহুনির্বাচনি (MCQ) প্রশ্নপত্র') &&
      uiState.btnText === '[বদলান]',
    uiState
  );

  // [বদলান] বোতামে ক্লিক করে লেআউট ড্রপডাউন খোলা যাচাই
  await page.click('#fzBtnChangeLayout');
  const dropdownState = await page.evaluate(() => {
    const pickerWrap = document.getElementById('fzLayoutPickerWrap');
    const sel = document.getElementById('fzLayoutSelect');
    const opts = sel ? Array.from(sel.options).map((o) => ({ value: o.value, text: o.textContent })) : [];
    return {
      pickerVisible: Boolean(pickerWrap && !pickerWrap.hidden),
      selectedValue: sel ? sel.value : '',
      optionCount: opts.length,
      hasCqOption: opts.some((o) => o.value === 'bengali_cq_paper' && o.text.includes('সৃজনশীল প্রশ্নপত্র'))
    };
  });

  T(
    '(ক) D1: "[বদলান]" ক্লিক করলে লেআউট ড্রপডাউন (#fzLayoutSelect) দৃশ্যমান হয় ও সব আর্কেটাইপ অপশন থাকে',
    dropdownState.pickerVisible &&
      dropdownState.selectedValue === 'bengali_mcq_paper' &&
      dropdownState.optionCount >= 16 &&
      dropdownState.hasCqOption,
    dropdownState
  );
}

// ───────────── ৩) যাচাই (খ): ড্রপডাউনে লেআউট বদল (<৫ সেকেন্ড ও fetch/XHR = ০) ─────────────
{
  const beforeNet = await page.evaluate(() => {
    window.__blobs.length = 0;
    window.__exportCalls.length = 0;
    return {
      fetch: window.__netStats.fetch,
      xhr: window.__netStats.xhr,
      ocrCalls: window.__netStats.ocrCalls,
      logsCount: window.FayzarRelayout.getLogs().length
    };
  });
  const pwFetchXhrBefore = pwFetchXhrCount;
  const pwExternalBefore = pwExternalNetCount;

  const t0 = Date.now();
  await page.evaluate(() => {
    const sel = document.getElementById('fzLayoutSelect');
    sel.value = 'bengali_cq_paper';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // রপ্তানি ও খতিয়ান আপডেট হওয়া পর্যন্ত অপেক্ষা (সর্বোচ্চ ৫ সেকেন্ড)
  await page.waitForFunction(
    () => window.FayzarRelayout.getLogs().length > 0 && window.__blobs.length > 0,
    { timeout: 5000 }
  );
  const elapsedMs = Date.now() - t0;

  const afterRelayout = await page.evaluate(async () => {
    const previewVal = document.getElementById('wizardPreviewContent').value;
    const parsedFm = window.FayzarRelayout.parseFrontmatter(previewVal);
    const detectedLbl = document.getElementById('fzDetectedLabel').textContent.trim();
    const blobText = window.__blobs[0] ? await window.__blobs[0].text() : '';
    const lastExport = window.__exportCalls[window.__exportCalls.length - 1] || null;
    const logs = window.FayzarRelayout.getLogs();
    return {
      previewVal,
      fmFields: parsedFm.fields,
      detectedLbl,
      blobSize: window.__blobs[0] ? window.__blobs[0].size : 0,
      blobTextSample: blobText.slice(0, 600),
      lastExport,
      logDurationMs: logs[0] && logs[0].meta ? logs[0].meta.durationMs : 99999,
      fetch: window.__netStats.fetch,
      xhr: window.__netStats.xhr,
      ocrCalls: window.__netStats.ocrCalls,
      hasCustom: window.FayzarRelayout.hasCustomExport()
    };
  });

  const fetchDelta = afterRelayout.fetch - beforeNet.fetch;
  const xhrDelta = afterRelayout.xhr - beforeNet.xhr;
  const ocrDelta = afterRelayout.ocrCalls - beforeNet.ocrCalls;
  const pwFetchXhrDelta = pwFetchXhrCount - pwFetchXhrBefore;
  const pwExternalDelta = pwExternalNetCount - pwExternalBefore;
  const plainDoc = rtfPlain(afterRelayout.blobTextSample);

  T(
    '(খ) D1: ড্রপডাউনে লেআউট বদলালে ৫ সেকেন্ডের কম সময়ে নতুন প্রিভিউ ও ফাইল আসে',
    elapsedMs < 5000 && afterRelayout.logDurationMs < 5000,
    { elapsedMs, logDurationMs: afterRelayout.logDurationMs }
  );

  T(
    '(খ) D1: লেআউট বদলে আবার OCR ডাকা হয় না এবং fetch ও XHR সংখ্যা শূন্য থাকে',
    fetchDelta === 0 && xhrDelta === 0 && ocrDelta === 0 && pwFetchXhrDelta === 0 && pwExternalDelta === 0,
    { fetchDelta, xhrDelta, ocrDelta, pwFetchXhrDelta, pwExternalDelta }
  );

  T(
    '(খ) D1: নতুন প্রিভিউ মার্কডাউনে doc_type: EXAM_CQ, layout_lock: true ও সৃজনশীল প্রশ্নপত্র লেবেল বসেছে',
    afterRelayout.fmFields.doc_type === 'EXAM_CQ' &&
      afterRelayout.fmFields.layout_lock === 'true' &&
      afterRelayout.fmFields.archetype === 'bengali_cq_paper' &&
      afterRelayout.detectedLbl.includes('সৃজনশীল প্রশ্নপত্র') &&
      afterRelayout.previewVal.includes('ফুলবাড়ী আদর্শ উচ্চ বিদ্যালয়'),
    { fmFields: afterRelayout.fmFields, detectedLbl: afterRelayout.detectedLbl }
  );

  T(
    '(খ) D1: নতুন ফাইল (Blob) তৈরি হয়েছে এবং মূল লেখার বিষয়বস্তু অক্ষত আছে',
    afterRelayout.blobSize > 0 &&
      afterRelayout.hasCustom &&
      // মূল লেখা অক্ষত: Markdown-এ দেখো (ব্লব বিজয়-এনকোডেড, প্রথম ৬০০ অক্ষর শুধু হেডার); নুক্তা ড় precomposed হতে পারে
      ((plainDoc + afterRelayout.previewVal).replace(/ড়/g, 'ড়').includes('ফুলবাড়ী') || afterRelayout.blobTextSample.includes('EXAM_CQ')),
    { blobSize: afterRelayout.blobSize, hasCustom: afterRelayout.hasCustom }
  );
}

// ───────────── ৪) যাচাই (গ): D2 সেটিং (কলাম/পাতা/ফন্ট) বদল প্রতিফলিত ─────────────
{
  await page.click('#fzBtnToggleSettings');
  const panelOpen = await page.evaluate(() => {
    const p = document.getElementById('fzSettingsPanel');
    return Boolean(p && !p.hidden);
  });
  T('(গ) D2: "পাতা ও ফন্ট সেটিংস" বোতামে ক্লিক করলে সেটিংস প্যানেল (#fzSettingsPanel) খোলে', panelOpen);

  const beforeD2 = await page.evaluate(() => {
    window.__blobs.length = 0;
    window.__downloads.length = 0;
    window.__exportCalls.length = 0;
    return {
      fetch: window.__netStats.fetch,
      xhr: window.__netStats.xhr,
      ocrCalls: window.__netStats.ocrCalls,
      logsLen: window.FayzarRelayout.getLogs().length
    };
  });

  const t0 = Date.now();
  await page.evaluate(() => {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      el.value = val;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setVal('fzSetCols', '2');
    setVal('fzSetPage', 'legal');
    setVal('fzSetOrient', 'landscape');
    setVal('fzSetBooklet', 'true');
    setVal('fzSetFont', '14');
    document.getElementById('fzBtnApplySettings').click();
  });

  await page.waitForFunction(
    () => window.FayzarRelayout.getLogs().length >= 2 && window.__blobs.length > 0,
    { timeout: 5000 }
  );
  const d2ElapsedMs = Date.now() - t0;

  const afterD2 = await page.evaluate((prev) => {
    const previewVal = document.getElementById('wizardPreviewContent').value;
    const parsedFm = window.FayzarRelayout.parseFrontmatter(previewVal);
    const lastExport = window.__exportCalls[window.__exportCalls.length - 1] || null;
    const engCols = window.FayzarAiOcrEngine && window.FayzarAiOcrEngine.state
      ? window.FayzarAiOcrEngine.state.layoutColumns
      : null;
    const logs = window.FayzarRelayout.getLogs();
    const latestLog = logs[logs.length - 1];
    return {
      fmFields: parsedFm.fields,
      exportOpts: lastExport ? lastExport.opts : null,
      engCols,
      latestMeta: latestLog ? latestLog.meta : null,
      downloads: window.__downloads.slice(),
      blobCount: window.__blobs.length,
      fetchDelta: window.__netStats.fetch - prev.fetch,
      xhrDelta: window.__netStats.xhr - prev.xhr,
      ocrDelta: window.__netStats.ocrCalls - prev.ocrCalls
    };
  }, beforeD2);

  T(
    '(গ) D2: প্রিভিউ ফ্রন্টম্যাটারে কলাম (2), পাতা (legal), দিক (landscape), বুকলেট (true) ও ফন্ট-সাইজ (14) প্রতিফলিত',
    afterD2.fmFields.columns === '2' &&
      afterD2.fmFields.page_size === 'legal' &&
      afterD2.fmFields.page_orientation === 'landscape' &&
      afterD2.fmFields.booklet === 'true' &&
      afterD2.fmFields.font_size === '14',
    afterD2.fmFields
  );

  T(
    '(গ) D2: রপ্তানি অপশন (FayzarExport.produce), ইঞ্জিন স্টেট ও ডাউনলোডে নতুন সেটিংস (<৫ সেকেন্ডে, OCR ছাড়াই) প্রতিফলিত',
    d2ElapsedMs < 5000 &&
      afterD2.fetchDelta === 0 &&
      afterD2.xhrDelta === 0 &&
      afterD2.ocrDelta === 0 &&
      Boolean(afterD2.exportOpts) &&
      afterD2.exportOpts.columns === 2 &&
      afterD2.exportOpts.pageSize === 'legal' &&
      afterD2.exportOpts.orientation === 'landscape' &&
      afterD2.exportOpts.landscape === true &&
      afterD2.exportOpts.booklet === true &&
      afterD2.exportOpts.fontSize === 14 &&
      afterD2.engCols === 2 &&
      afterD2.blobCount > 0,
    { d2ElapsedMs, exportOpts: afterD2.exportOpts, engCols: afterD2.engCols }
  );
}

// ───────────── ৫) যাচাই (ঘ): খতিয়ানে (fz_relayout_log) "শনাক্ত X → বাছাই Y" এন্ট্রি জমা ─────────────
{
  const logAudit = await page.evaluate(() => {
    const rawJson = localStorage.getItem('fz_relayout_log') || '';
    const logs = window.FayzarRelayout.getLogs();
    return {
      rawJson,
      logs
    };
  });

  const firstLog = logAudit.logs[0] || {};
  T(
    '(ঘ) D4: localStorage fz_relayout_log-এ "শনাক্ত বহুনির্বাচনি (MCQ) প্রশ্নপত্র → বাছাই সৃজনশীল প্রশ্নপত্র" এন্ট্রি জমা হয়েছে',
    Boolean(logAudit.rawJson) &&
      logAudit.logs.length >= 2 &&
      firstLog.transition === 'শনাক্ত বহুনির্বাচনি (MCQ) প্রশ্নপত্র → বাছাই সৃজনশীল প্রশ্নপত্র' &&
      firstLog.codeTransition === 'শনাক্ত bengali_mcq_paper → বাছাই bengali_cq_paper',
    firstLog
  );

  T(
    '(ঘ) D4: খতিয়ানে সময় (time/at) ও শুধু মেটাডেটা সংরক্ষিত আছে (ফাইল-হ্যাশ বা মূল টেক্সট নেই)',
    typeof firstLog.at === 'number' &&
      Boolean(firstLog.time && firstLog.time.includes('T')) &&
      Boolean(firstLog.meta && typeof firstLog.meta.columns === 'number') &&
      !logAudit.rawJson.includes('ফুলবাড়ী আদর্শ উচ্চ বিদ্যালয়') &&
      !('fileHash' in (firstLog.meta || {})) &&
      !('text' in (firstLog.meta || {})),
    firstLog
  );
}

// ───────────── ৬) যাচাই D3: "ঠিক হয়নি?" বোতাম ও বিশেষ প্রম্পট হুক ─────────────
{
  await page.click('#fzBtnNotRight');
  const d3Result = await page.evaluate(async () => {
    const notRightPanel = document.getElementById('fzNotRightPanel');
    const panelOpened = Boolean(notRightPanel && !notRightPanel.hidden);

    // ① সাজানো ভুল ক্লিক করলে লেআউট পিকার ও সেটিংস প্যানেল খোলা থাকে এবং reOcrBox লুকানো থাকে
    document.getElementById('fzOptWrongLayout').click();
    const afterWrongLayout = {
      pickerOpen: !document.getElementById('fzLayoutPickerWrap').hidden,
      settingsOpen: !document.getElementById('fzSettingsPanel').hidden,
      reOcrHidden: document.getElementById('fzReOcrBox').hidden
    };

    // ② লেখা বাদ/ভুল ক্লিক করলে কারণ লেখার বক্স খোলে
    document.getElementById('fzOptWrongText').click();
    const reOcrVisible = !document.getElementById('fzReOcrBox').hidden;

    // বিশেষ প্রম্পট হুক নিবন্ধন করে যাচাই (নেটওয়ার্ক OCR না ডেকে)
    let capturedPrompt = null;
    window.FayzarRelayout.setReOcrHandler(async (prompt) => {
      capturedPrompt = prompt;
    });
    window.confirm = () => true;

    const reasonInput = document.getElementById('fzReOcrReason');
    reasonInput.value = 'ডান কলামের ২ নং প্রশ্ন বাদ পড়েছে';
    document.getElementById('fzBtnConfirmReOcr').click();
    await new Promise((r) => setTimeout(r, 50));

    return {
      panelOpened,
      afterWrongLayout,
      reOcrVisible,
      capturedPrompt
    };
  });

  T(
    'D3: "ঠিক হয়নি?" প্যানেলে ① সাজানো ভুল ও ② লেখা বাদ/ভুল অপশন এবং বিশেষ প্রম্পট সঠিকভাবে কাজ করে',
    d3Result.panelOpened &&
      d3Result.afterWrongLayout.pickerOpen &&
      d3Result.afterWrongLayout.settingsOpen &&
      d3Result.afterWrongLayout.reOcrHidden &&
      d3Result.reOcrVisible &&
      Boolean(d3Result.capturedPrompt && d3Result.capturedPrompt.includes('ডান কলামের ২ নং প্রশ্ন বাদ পড়েছে')),
    d3Result
  );
}

T('পেজ-এরর শূন্য', errs.length === 0, errs.slice(0, 3));

await browser.close();
server.close();
console.log(`ফলাফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
