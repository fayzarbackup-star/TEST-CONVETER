// QA: দুটি OCR-ফলের অর্থপূর্ণ পার্থক্য — নম্বর/ক্রম নয়, লেখার মিল দিয়ে প্রশ্ন-জোড়া খোঁজা।
// বিন্যাস-গোলমাল (ফাঁকা, $, `, LaTeX-স্পেস, যতিচিহ্ন, অঙ্কের লিপি) বাদ দিয়ে তুলনা।
// ফল: কোন প্রশ্ন একটিতে আছে অন্যটিতে নেই; জোড়াগুলোর অক্ষর-মিল %; সবচেয়ে বড় পার্থক্যগুলো।
// চালানো: node qa/ocr-diff.mjs <a.md> <b.md> [maxShow=12]
import fs from 'node:fs';
const [A, B] = [process.argv[2], process.argv[3]].map((f) => fs.readFileSync(f, 'utf8'));
const MAX = parseInt(process.argv[4] || '12', 10);
const bn2en = (s) => s.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6));
const body = (s) => s.replace(/^---[\s\S]*?---/, '').replace(/\[এআই অডিট নোট[\s\S]*$/, '').replace(/^=+.*পৃষ্ঠা.*=+$/gm, '').replace(/^MANIFEST:.*$/gm, '');
const key = (s) => bn2en(s).replace(/\$+|`/g, '').replace(/\\(text|mathrm|mathbf|left|right|quad|qquad)\b/g, '')
  .replace(/^\s*\d{1,3}\s*[।.)]\s*/, '').replace(/[\s.,;:।'"“”‘’()\[\]{}*_#>|\\–—-]+/g, '').toLowerCase();
function segments(text) {
  const out = []; let cur = [];
  for (const raw of body(text).split('\n')) {
    if (/^\s*[0-9০-৯]{1,3}\s*[।.)]/.test(raw) && cur.length) { out.push(cur.join(' ')); cur = []; }
    if (raw.trim()) cur.push(raw.trim());
  }
  if (cur.length) out.push(cur.join(' '));
  return out.map((t) => ({ t, k: key(t) })).filter((s) => s.k.length >= 6);
}
const grams = (k) => { const g = new Set(); for (let i = 0; i < k.length - 2; i++) g.add(k.slice(i, i + 3)); return g; };
const jac = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n / Math.max(1, a.size + b.size - n); };
// অক্ষর-স্তরের সম্পাদনা-দূরত্ব (ছোট লেখায়) — মিল %
function sim(a, b) {
  if (a === b) return 1;
  const m = a.length, n = b.length; if (!m || !n) return 0;
  let prev = new Array(n + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return 1 - prev[n] / Math.max(m, n);
}
const sa = segments(A), sb = segments(B);
sa.forEach((s) => (s.g = grams(s.k))); sb.forEach((s) => (s.g = grams(s.k)));
const usedB = new Set(); const pairs = []; const onlyA = [];
for (const s of sa) {
  let best = -1, bj = 0;
  sb.forEach((o, j) => { if (usedB.has(j)) return; const v = jac(s.g, o.g); if (v > bj) { bj = v; best = j; } });
  if (best >= 0 && bj >= 0.35) { usedB.add(best); pairs.push({ a: s, b: sb[best], s: sim(s.k.slice(0, 600), sb[best].k.slice(0, 600)) }); }
  else onlyA.push(s);
}
const onlyB = sb.filter((_, j) => !usedB.has(j));
const exact = pairs.filter((p) => p.s >= 0.999).length;
const near = pairs.filter((p) => p.s >= 0.97 && p.s < 0.999).length;
const avg = pairs.reduce((x, p) => x + p.s, 0) / Math.max(1, pairs.length);
console.log(`অংশ: A=${sa.length} B=${sb.length} | জোড়া=${pairs.length} (হুবহু=${exact}, ≥৯৭%=${near}) গড় অক্ষর-মিল=${(avg * 100).toFixed(1)}% | শুধু A-তে=${onlyA.length} শুধু B-তে=${onlyB.length}`);
onlyA.slice(0, 6).forEach((s) => console.log('  – শুধু A: ' + s.t.slice(0, 120)));
onlyB.slice(0, 6).forEach((s) => console.log('  + শুধু B: ' + s.t.slice(0, 120)));
pairs.filter((p) => p.s < 0.97).sort((x, y) => x.s - y.s).slice(0, MAX).forEach((p) => {
  let i = 0; while (i < p.a.k.length && p.a.k[i] === p.b.k[i]) i++;
  console.log(`  ≠ ${(p.s * 100).toFixed(0)}%\n     A: …${p.a.k.slice(Math.max(0, i - 20), i + 50)}\n     B: …${p.b.k.slice(Math.max(0, i - 20), i + 50)}`);
});
