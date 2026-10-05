// QA: Worker-অবস্থান (placement) তুলনা — বর্তমান ডিপ্লয়ে:
//   ১) /where ×৩: Worker কোথায় চলছে (runColo) ও সেখান থেকে Google-এ সংযোগ-সময়
//   ২) ক্ষুদ্র Gemini অনুরোধ ×N (2+2): ক্লায়েন্টের মোট সময় + Worker-এর ttfbMs (লগ থেকে)
//   ৩) বড় আপলোড ×1 (আসল PDF inlineData, "পাতা কয়টি?") — আপলোড+প্রক্রিয়া সময়
// টোকেন ক্লায়েন্ট-ফাইল থেকে; কি/টোকেন ছাপে না। চালানো: node qa/placement-bench.mjs <label> [N=5] [pdf]
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../js/ai-ocr-engine.js', import.meta.url), 'utf8');
const base = /FUNCTIONS_URL:\s*'([^']+)'/.exec(src)[1].replace(/\/+$/, '');
const token = process.env.FAYZAR_PROXY_TOKEN || /PROXY_TOKEN:[\s\S]{0,400}?\|\|\s*['"]([A-Za-z0-9_\-.]{20,})['"]/.exec(src)[1];
const label = process.argv[2] || 'run';
const N = parseInt(process.argv[3] || '5', 10);
const PDF = process.argv[4];
const H = { Authorization: 'Bearer ' + token, Origin: 'http://localhost:3008' };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

const where = [];
for (let i = 0; i < 3; i++) where.push(await (await fetch(base + '/where', { headers: H })).json());

async function gen(payload) {
  const t = Date.now();
  const res = await fetch(base, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ payload, models: ['gemini-3-flash-preview'] }) });
  const txt = await res.text();
  let out = '', fail = null;
  for (const l of txt.split('\n')) {
    if (!l.startsWith('data:')) continue;
    try { const j = JSON.parse(l.slice(5)); if (j.candidates) out += (j.candidates[0].content?.parts || []).map((p) => p.text || '').join(''); if (j.fayzar_status && j.fayzar_status.event === 'failed') fail = j.fayzar_status.body?.lastError?.detail; } catch (e) {}
  }
  return { ms: Date.now() - t, out: out.trim().slice(0, 20), fail };
}
const small = [];
for (let i = 0; i < N; i++) small.push(await gen({ contents: [{ parts: [{ text: 'Reply with only the number: 2+2' }] }], generationConfig: { maxOutputTokens: 200 } }));
let big = null;
if (PDF) {
  const b64 = fs.readFileSync(PDF).toString('base64');
  big = await gen({ contents: [{ parts: [{ inlineData: { mimeType: 'application/pdf', data: b64 } }, { text: 'How many pages does this PDF have? Reply with only the number.' }] }], generationConfig: { maxOutputTokens: 300 } });
  big.mb = Math.round(b64.length / 1048576 * 10) / 10;
}
const logRes = await (await fetch(base + '/log', { headers: H })).json();
const recent = (logRes.log || []).slice(-(N + (PDF ? 1 : 0)));
const row = {
  label,
  runColo: [...new Set(where.map((w) => w.runColo + '/' + w.runLoc))].join(','),
  edgeColo: [...new Set(where.map((w) => w.edgeColo))].join(','),
  googleConnectMs_med: med(where.map((w) => w.googleMs)),
  small_clientMs_med: med(small.map((s) => s.ms)),
  small_workerTtfbMs_med: med(recent.slice(0, N).map((r) => r.ttfbMs).filter(Boolean)),
  small_ok: small.filter((s) => s.out === '4').length + '/' + N,
  small_fail: small.filter((s) => s.fail).map((s) => s.fail).slice(0, 1),
  big: big && { mb: big.mb, clientMs: big.ms, workerTtfbMs: recent[recent.length - 1] && recent[recent.length - 1].ttfbMs, out: big.out, fail: big.fail }
};
console.log(JSON.stringify(row));
fs.appendFileSync(new URL('./placement-bench-results.jsonl', import.meta.url), JSON.stringify({ at: new Date().toISOString(), ...row }) + '\n');
