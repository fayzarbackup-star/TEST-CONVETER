// QA: Gemini 3 মডেলগুলো কোন thinkingLevel মান গ্রহণ করে — ক্ষুদ্র অনুরোধ (কি মাস্কড, কোটা নগণ্য)।
// চালানো: node qa/thinking-levels-check.mjs
import fs from 'node:fs';
const keys = JSON.parse(fs.readFileSync(new URL('../fayzar-ocr-proxy/keys.json', import.meta.url), 'utf8'));
const key = keys[0];
const models = ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.6-flash'];
const levels = [null, 'minimal', 'low', 'medium', 'high'];
for (const model of models) {
  const row = [];
  for (const lv of levels) {
    const gc = { maxOutputTokens: 2000 };
    if (lv) gc.thinkingConfig = { thinkingLevel: lv };
    const t = Date.now();
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'A train travels 120 km in 1.5 hours. What is its speed in km/h? Reply with the number only.' }] }], generationConfig: gc })
    });
    const j = await r.json().catch(() => ({}));
    const u = j.usageMetadata || {};
    row.push(`${lv || 'default'}: ${r.ok ? 'OK think=' + (u.thoughtsTokenCount || 0) + ' ' + (Date.now() - t) + 'ms' : 'HTTP ' + r.status + ' ' + String(j.error && j.error.message || '').slice(0, 70)}`);
  }
  console.log(model + '\n  ' + row.join('\n  '));
}
