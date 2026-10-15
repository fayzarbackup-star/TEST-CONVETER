// QA: Worker-এর OCR_LOG (GET /log) — শেষ ৩০টি OCR অনুরোধের চেষ্টা-বিবরণ (কি মাস্কড)। চালানো: node qa/proxy-log.mjs [n=10]
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../js/ai-ocr-engine.js', import.meta.url), 'utf8');
const url = /FUNCTIONS_URL:\s*'([^']+)'/.exec(src)[1];
const token = process.env.FAYZAR_PROXY_TOKEN || /PROXY_TOKEN:[\s\S]{0,400}?\|\|\s*['"]([A-Za-z0-9_\-.]{20,})['"]/.exec(src)[1];
const n = parseInt(process.argv[2] || '10', 10);
const res = await fetch(url.replace(/\/+$/, '') + '/log', { headers: { Authorization: 'Bearer ' + token, Origin: 'http://localhost:3008' } });
const { log = [] } = await res.json();
for (const r of log.slice(-n)) {
  const when = new Date(r.at).toISOString().replace('T', ' ').slice(0, 19);
  const atts = r.attempts.map((a) => `${a.key}/${a.model.replace('gemini-', '')}:${a.class}${a.sec ? '@' + a.sec + 's' : ''}`).join(' ');
  const th = r.firstThoughtMs != null ? ` firstThought=${Math.round(r.firstThoughtMs / 1000)}s` : '';
  console.log(`${when}Z ${r.colo || '?'}/${r.country || '?'} ${Math.round(r.bytes / 1024)}KB → ${r.outcome} ttfb=${r.ttfbSec}s${th} thoughts=${r.thoughtChunks ?? '-'} total=${r.totalSec}s finish=${r.finish} | ${atts}`);
}
