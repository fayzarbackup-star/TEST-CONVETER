// QA: আসল OCR-এর সময়রেখা — Worker-এর প্রতিটি fayzar_status ঘটনা (trying/waiting/retry/switch/streaming/failed)
// সময়সহ রেকর্ড; প্রথম লেখা-টোকেন কখন এল, মোট সময়, চূড়ান্ত ফল। চলমান অ্যাপ-সার্ভারে (localhost:3008)।
// চালানো: node qa/ocr-trace.mjs "<pdf>" [outDir] [baseUrl]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const PDF = process.argv[2];
const OUT = path.resolve(process.argv[3] || 'qa/ocr-trace-out');
const BASE = process.argv[4] || 'http://localhost:3008';
fs.mkdirSync(OUT, { recursive: true });
const pdfB64 = fs.readFileSync(PDF).toString('base64');

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(20 * 60 * 1000);
  await page.evaluateOnNewDocument(() => {
    window.__trace = [];
    const t0 = () => (window.__t0 || 0);
    const origFetch = window.fetch;
    window.fetch = async function (input, init) {
      const url = String(input && input.url || input);
      const isOcr = /workers\.dev|\/api\/gemini|generativelanguage/.test(url) && init && init.method === 'POST';
      const started = performance.now();
      if (isOcr) window.__trace.push({ t: Math.round((started - t0()) / 1000), ev: 'client_post', bytes: init.body ? init.body.length : 0, url: url.replace(/key=[^&]+/, 'key=***') });
      const res = await origFetch.apply(this, arguments);
      if (!isOcr || !res.body) return res;
      window.__trace.push({ t: Math.round((performance.now() - t0()) / 1000), ev: 'client_headers', status: res.status });
      const [a, b] = res.body.tee();
      (async () => {
        const rd = b.getReader(); const dec = new TextDecoder(); let buf = ''; let firstText = false;
        while (true) {
          const { done, value } = await rd.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n'); buf = lines.pop();
          for (const l of lines) {
            const s = l.trim(); if (!s.startsWith('data:')) { if (s.startsWith(':')) window.__trace.push({ t: Math.round((performance.now() - t0()) / 1000), ev: 'comment', s: s.slice(0, 80) }); continue; }
            try {
              const j = JSON.parse(s.slice(5));
              const now = Math.round((performance.now() - t0()) / 1000);
              if (j.fayzar_status) { const st = j.fayzar_status; window.__trace.push({ t: now, ev: 'worker:' + st.event, attempt: st.attempt, model: st.model, key: st.key, waitingSec: st.waitingSec, reason: st.reason, status: st.status, cls: st.class, body: st.body && JSON.stringify({ e: st.body.error, last: st.body.lastError, attempts: st.body.attempts }).slice(0, 600) }); }
              else if (!firstText && j.candidates) { firstText = true; window.__trace.push({ t: now, ev: 'first_text_chunk' }); }
              else if (j.candidates && j.candidates[0] && j.candidates[0].finishReason) window.__trace.push({ t: now, ev: 'finish', reason: j.candidates[0].finishReason, usage: j.usageMetadata });
            } catch (e) {}
          }
        }
        window.__trace.push({ t: Math.round((performance.now() - t0()) / 1000), ev: 'stream_end' });
      })();
      return new Response(a, { status: res.status, statusText: res.statusText, headers: res.headers });
    };
  });
  await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 120000 });
  const pages = await page.evaluate(async (b64, name) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    await window.FayzarAiOcrEngine.handleFiles([new File([u], name, { type: 'application/pdf' })]);
    return window.FayzarAiOcrEngine.state.filesQueue.length;
  }, pdfB64, path.basename(PDF));
  console.log('pages', pages);
  const result = await page.evaluate(async () => {
    window.__t0 = performance.now();
    try {
      const res = await window.FayzarAiOcrEngine.startUnifiedOcr('none', () => {}, () => {});
      const text = (res && res.unicode) || window.FayzarAiOcrEngine.state.unicodeText || '';
      return { ok: true, chars: text.length, text, totalSec: Math.round((performance.now() - window.__t0) / 1000) };
    } catch (e) { return { ok: false, error: String(e && e.message || e), totalSec: Math.round((performance.now() - window.__t0) / 1000) }; }
  });
  await new Promise((r) => setTimeout(r, 1500));
  const trace = await page.evaluate(() => window.__trace);
  if (result.text) fs.writeFileSync(path.join(OUT, 'ocr-text.md'), result.text);
  delete result.text;
  fs.writeFileSync(path.join(OUT, 'trace.json'), JSON.stringify({ pages, result, trace }, null, 2));
  console.log(JSON.stringify(result));
  for (const e of trace) if (e.ev !== 'worker:waiting' || e.waitingSec % 60 === 0) console.log(JSON.stringify(e));
} finally {
  await browser.close();
}
