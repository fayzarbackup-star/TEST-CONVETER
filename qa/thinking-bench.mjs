// QA: চিন্তার মাত্রা (thinkingLevel) তুলনা — একই ফাইল, একই প্রম্পট (নিয়ম ১৮ সহ), প্রোডাকশন-পথে (localhost:3008 → Worker)।
// প্রতিটি মাত্রায়: মোট সময়, প্রথম চিন্তা-সংকেত, প্রথম লেখা, চিন্তার টোকেন, লেখা; শেষে "default"-এর সাথে নির্ভুলতা-তুলনা।
// চালানো: node qa/thinking-bench.mjs <outDir> <levels=default,medium,low> <pdf>[::maxPages] [<pdf>[::maxPages] ...]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const OUT = path.resolve(process.argv[2]);
const LEVELS = process.argv[3].split(',');
const FILES = process.argv.slice(4).map((a) => { const [f, n] = a.split('::'); return { file: f, maxPages: n ? parseInt(n, 10) : 0 }; });
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 30 * 60 * 1000 });
const results = [];
try {
  for (const F of FILES) {
    const b64 = fs.readFileSync(F.file).toString('base64');
    for (const level of LEVELS) {
      const page = await browser.newPage();
      page.setDefaultTimeout(30 * 60 * 1000);
      await page.evaluateOnNewDocument(() => {
        window.__tl = {};
        const t0 = () => window.__t0 || performance.now();
        const of = window.fetch;
        window.fetch = async function (input, init) {
          const url = String(input && input.url || input);
          const res = await of.apply(this, arguments);
          if (!(/workers\.dev/.test(url) && init && init.method === 'POST') || !res.body) return res;
          const [a, b] = res.body.tee();
          (async () => {
            const rd = b.getReader(); const dec = new TextDecoder(); let buf = '';
            while (true) {
              const { done, value } = await rd.read(); if (done) break;
              buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop();
              for (const l of lines) {
                if (!l.startsWith('data:')) continue;
                try {
                  const j = JSON.parse(l.slice(5)); const now = (performance.now() - t0()) / 1000;
                  if (j.fayzar_status) {
                    const s = j.fayzar_status;
                    if (s.event === 'thinking' && window.__tl.firstThinking == null) window.__tl.firstThinking = now;
                    if (s.event === 'switch_key' || s.event === 'switch_model') (window.__tl.switches = window.__tl.switches || []).push(s.event + ':' + (s.reason || ''));
                  } else if (j.candidates) {
                    if (window.__tl.firstText == null) window.__tl.firstText = now;
                    if (j.usageMetadata) window.__tl.usage = { in: j.usageMetadata.promptTokenCount, out: j.usageMetadata.candidatesTokenCount, think: j.usageMetadata.thoughtsTokenCount };
                    if (j.candidates[0].finishReason) window.__tl.finish = j.candidates[0].finishReason;
                  }
                } catch (e) {}
              }
            }
          })();
          return new Response(a, { status: res.status, statusText: res.statusText, headers: res.headers });
        };
      });
      await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
      const r = await page.evaluate(async (b64, name, level, maxPages) => {
        try { if (level === 'default') localStorage.removeItem('fayzar_thinking_level'); else localStorage.setItem('fayzar_thinking_level', level); } catch (e) {}
        const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        await window.FayzarAiOcrEngine.handleFiles([new File([u], name, { type: 'application/pdf' })]);
        const q = window.FayzarAiOcrEngine.state.filesQueue;
        if (maxPages && q.length > maxPages) q.splice(maxPages);
        const pages = q.length;
        window.__t0 = performance.now();
        try {
          const res = await window.FayzarAiOcrEngine.startUnifiedOcr('none', () => {}, () => {});
          const text = (res && res.unicode) || window.FayzarAiOcrEngine.state.unicodeText || '';
          return { ok: true, pages, text, totalSec: (performance.now() - window.__t0) / 1000, tl: window.__tl };
        } catch (e) { return { ok: false, pages, error: String(e && e.message || e), totalSec: (performance.now() - window.__t0) / 1000, tl: window.__tl }; }
      }, b64, path.basename(F.file), level, F.maxPages);
      await page.close();
      const tag = path.basename(F.file).replace(/[^\w]+/g, '_') + '__' + level;
      if (r.text) fs.writeFileSync(path.join(OUT, tag + '.md'), r.text);
      const row = { file: path.basename(F.file), pages: r.pages, level, ok: r.ok, error: r.error, totalSec: Math.round(r.totalSec), firstThinkingSec: r.tl.firstThinking != null ? Math.round(r.tl.firstThinking) : null, firstTextSec: r.tl.firstText != null ? Math.round(r.tl.firstText) : null, think: r.tl.usage && r.tl.usage.think, out: r.tl.usage && r.tl.usage.out, finish: r.tl.finish, switches: (r.tl.switches || []).join(' '), chars: (r.text || '').length, tag };
      results.push(row);
      console.log(JSON.stringify(row));
      fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
    }
  }
} finally { await browser.close(); }

// ---- নির্ভুলতা-তুলনা: প্রতিটি ফাইলে "default" = মানদণ্ড ----
const norm = (s) => s.replace(/\[এআই অডিট নোট[\s\S]*$/, '').replace(/^---[\s\S]*?---/, '');
const tokens = (s) => norm(s).split(/\s+/).filter(Boolean);
const bag = (arr) => arr.reduce((m, t) => m.set(t, (m.get(t) || 0) + 1), new Map());
const overlap = (A, B) => { let n = 0; for (const [t, c] of A) n += Math.min(c, B.get(t) || 0); return n; };
const qCount = (s) => (norm(s).match(/^\s*[০-৯0-9]{1,3}\s*[।.)]/gm) || []).length;
const optCount = (s) => (norm(s).match(/(^|\s)(\(?[কখগঘ][.)]|[কখগঘ]\.)\s/g) || []).length;
console.log('\n==== নির্ভুলতা (মানদণ্ড = default) ====');
for (const F of FILES) {
  const fname = path.basename(F.file);
  const ref = results.find((x) => x.file === fname && x.level === 'default' && x.ok);
  if (!ref) { console.log(fname, ': default রান নেই/ব্যর্থ'); continue; }
  const refText = fs.readFileSync(path.join(OUT, ref.tag + '.md'), 'utf8'); const RA = bag(tokens(refText)); const nRef = tokens(refText).length;
  for (const x of results.filter((y) => y.file === fname && y.ok)) {
    const t = fs.readFileSync(path.join(OUT, x.tag + '.md'), 'utf8'); const TA = bag(tokens(t)); const nT = tokens(t).length;
    const ov = overlap(RA, TA);
    console.log(`${fname} [${x.level}] সময়=${x.totalSec}s চিন্তা=${x.think} টোকেন | শব্দ-মিল: recall ${(ov / nRef * 100).toFixed(1)}% precision ${(ov / Math.max(1, nT) * 100).toFixed(1)}% | প্রশ্ন ${qCount(t)}/${qCount(refText)} অপশন ${optCount(t)}/${optCount(refText)}`);
  }
}
