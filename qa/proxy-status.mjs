// QA: Cloudflare OCR-প্রক্সির GET /status (শুধু পড়া; কি মাস্কড)। টোকেন ক্লায়েন্ট-ফাইল থেকে পড়ে, কখনো ছাপে না।
// চালানো: node qa/proxy-status.mjs [outFile]
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../js/ai-ocr-engine.js', import.meta.url), 'utf8');
const url = /FUNCTIONS_URL:\s*'([^']+)'/.exec(src)[1];
const token = process.env.FAYZAR_PROXY_TOKEN || /PROXY_TOKEN:[\s\S]{0,400}?\|\|\s*['"]([A-Za-z0-9_\-.]{20,})['"]/.exec(src)[1];
const res = await fetch(url.replace(/\/+$/, '') + '/status', { headers: { Authorization: 'Bearer ' + token, Origin: 'http://localhost:3008' } });
const body = await res.text();
const out = process.argv[2];
if (out) fs.writeFileSync(out, body);
console.log('HTTP', res.status, out ? '(saved ' + body.length + ' bytes)' : body.slice(0, 4000));
