// QA: প্রতিটি কি-তে কোন OCR-মডেল সত্যিই চালু (Google models.list — জেনারেশন-কোটা খরচ হয় না)।
// কি কখনো ছাপা হয় না (মাস্ক + Kনং, Worker-এর /status-এর একই ক্রম)। চালানো: node qa/key-model-check.mjs
import fs from 'node:fs';
const keys = JSON.parse(fs.readFileSync(new URL('../fayzar-ocr-proxy/keys.json', import.meta.url), 'utf8'));
const WANT = ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-pro-preview'];
const mask = (k) => k.slice(0, 6) + '...' + k.slice(-4);
const rows = [];
for (let i = 0; i < keys.length; i++) {
  const k = keys[i];
  let names = [], err = null;
  try {
    let pageToken = '';
    do {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000' + (pageToken ? '&pageToken=' + pageToken : '') + '&key=' + encodeURIComponent(k));
      const j = await r.json();
      if (!r.ok) { err = r.status + ' ' + String(j.error && j.error.message || '').slice(0, 90); break; }
      names.push(...(j.models || []).map((m) => m.name.replace('models/', '')));
      pageToken = j.nextPageToken || '';
    } while (pageToken);
  } catch (e) { err = String(e.message).slice(0, 90); }
  const has = WANT.map((m) => (names.includes(m) ? '✓' : '✗'));
  rows.push({ id: 'K' + String(i + 1).padStart(2, '0'), mask: mask(k), err, has, flashLike: names.filter((n) => /^gemini-3/.test(n)).join(',') });
}
console.log('model columns:', WANT.join(' | '));
for (const r of rows) console.log(r.id, r.mask, r.err ? 'ERROR ' + r.err : r.has.join('   '), r.err ? '' : '| gemini-3*: ' + r.flashLike);
