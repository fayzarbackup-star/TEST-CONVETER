// QA: প্রতিটি কি-তে একটি ক্ষুদ্র generateContent ("2+2") — আসল HTTP স্ট্যাটাস ও বার্তা (কি মাস্কড)।
// চালানো: node qa/key-ping.mjs [model=gemini-3-flash-preview]
import fs from 'node:fs';
const keys = JSON.parse(fs.readFileSync(new URL('../fayzar-ocr-proxy/keys.json', import.meta.url), 'utf8'));
const model = process.argv[2] || 'gemini-3-flash-preview';
const mask = (k) => k.slice(0, 6) + '...' + k.slice(-4);
console.log('model:', model);
await Promise.all(keys.map(async (k, i) => {
  const t = Date.now();
  let line;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(k)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with only the number: 2+2' }] }], generationConfig: { maxOutputTokens: 300 } })
    });
    const j = await r.json().catch(() => ({}));
    const msg = r.ok ? 'OK "' + String(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '').trim().slice(0, 10) + '"'
      : (j.error?.status || '') + ' ' + String(j.error?.message || '').slice(0, 140);
    line = `HTTP ${r.status}  ${Math.round((Date.now() - t) / 100) / 10}s  ${msg}`;
  } catch (e) { line = 'NET ' + e.message; }
  return ['K' + String(i + 1).padStart(2, '0') + ' ' + mask(k), line];
})).then((rows) => rows.forEach(([a, b]) => console.log(a, b)));
