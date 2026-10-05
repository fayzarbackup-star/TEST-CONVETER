// QA: Worker দিয়ে ক্ষুদ্র অনুরোধ (2+2) N বার — কোন কি/মডেলে কী উত্তর (লোকেশন-ব্লক, ব্যস্ত, সফল)।
// টোকেন ক্লায়েন্ট-ফাইল থেকে পড়ে, ছাপে না। চালানো: node qa/proxy-probe.mjs [N=6]
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../js/ai-ocr-engine.js', import.meta.url), 'utf8');
const url = /FUNCTIONS_URL:\s*'([^']+)'/.exec(src)[1];
const token = process.env.FAYZAR_PROXY_TOKEN || /PROXY_TOKEN:[\s\S]{0,400}?\|\|\s*['"]([A-Za-z0-9_\-.]{20,})['"]/.exec(src)[1];
const N = parseInt(process.argv[2] || '6', 10);
for (let i = 0; i < N; i++) {
  const t = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, Origin: 'http://localhost:3008' },
    body: JSON.stringify({ payload: { contents: [{ parts: [{ text: 'Reply with only the number: 2+2' }] }], generationConfig: { maxOutputTokens: 200 } }, models: ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.6-flash'] })
  });
  const txt = await res.text();
  const evs = [];
  let out = '';
  for (const l of txt.split('\n')) {
    if (!l.startsWith('data:')) continue;
    try {
      const j = JSON.parse(l.slice(5));
      if (j.fayzar_status) {
        const s = j.fayzar_status;
        if (s.event === 'trying') evs.push(s.key + '/' + s.model.replace('gemini-', ''));
        else if (s.event === 'failed' || s.event === 'fatal') evs.push(s.event + ':' + JSON.stringify(s.body ? s.body.lastError : s.detail).slice(0, 120));
        else if (s.event !== 'waiting') evs.push(s.event + (s.reason ? '(' + s.reason + ')' : ''));
      } else if (j.candidates) out += (j.candidates[0].content?.parts || []).map((p) => p.text || '').join('');
    } catch (e) {}
  }
  console.log(`#${i + 1} HTTP ${res.status} ${Math.round((Date.now() - t) / 100) / 10}s  out="${out.trim()}"  ${evs.join(' → ')}`);
}
