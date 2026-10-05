/**
 * Part-17.3 gates — Word 2003 .doc রূপান্তরকারী (docx-to-doc-engine.js): হুবহু-লেআউটের জন্য পূরণ করা ৭টি ফাঁক।
 * ধাপ ০-এ Word (COM) দিয়ে প্রমাণিত ফাঁক: হেডার/ফুটার, অনুচ্ছেদ-রেখা, ডট-লিডার, টেবিল-বর্ডার, vMerge, নেস্টেড টেবিল,
 * টেবিলের চওড়া, ভাসমান ছবি। এখানে রূপান্তরিত Word-HTML-এর গঠন যাচাই (Word লাগে না); Word-মাপ: qa/phase0/word-structure.ps1।
 *   node tests/part-17.3-doc-converter.test.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + String(JSON.stringify(x)).slice(0, 300))); };

let puppeteer;
try { puppeteer = (await import('puppeteer')).default; } catch (e) { console.log('⏭️  puppeteer নেই — স্কিপ'); console.log('\nফল: 0 পাস, 0 ব্যর্থ'); process.exit(0); }

const tmp = path.join(os.tmpdir(), 'fz-p173-' + Date.now() + '.docx');
execFileSync(process.execPath, [path.join(ROOT, 'qa/phase0/make-primitives-docx.mjs'), tmp]);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  const html = await page.evaluate(async (b64) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const bj = await DocxHandler.convertDocx(new Blob([u]), { direction: 'u2b', targetFont: 'SutonnyMJ' });
    const dr = await new DocxToDocConverter().convertDocxToDoc(bj.convertedBlob || bj.blob, { pageSize: 'a4', margin: 'normal', preserveSutonny: true, optimizeForQuestionPaper: true });
    return await (dr.blob || dr.convertedBlob).text();
  }, fs.readFileSync(tmp).toString('base64'));

  // হেডার/ফুটার
  T('হেডার: @page-এ mso-header:h1 + mso-element:header ব্লক', /mso-header:h1/.test(html) && /mso-element:header' id=h1>[\s\S]*H01XHEADER/.test(html));
  T('ফুটার: @page-এ mso-footer:f1 + mso-element:footer ব্লক', /mso-footer:f1/.test(html) && /mso-element:footer' id=f1>[\s\S]*F01XFOOTER/.test(html));
  // অনুচ্ছেদ
  const p03 = (html.match(/<p class="MsoNormal" style="[^"]*"[^>]*>(?:(?!<\/p>)[\s\S])*P03XBORDER/) || [''])[0];
  T('অনুচ্ছেদের নিচে রেখা (pBdr → border-bottom)', /border-bottom:solid (?:windowtext|#000000) 1\.5pt/.test(p03) && /mso-border-bottom-alt/.test(p03), p03.slice(0, 300));
  const p06 = (html.match(/<p class="MsoNormal" style="[^"]*"[^>]*>(?:(?!<\/p>)[\s\S])*P06XDOTLEADER/) || [''])[0];
  T('ডট-লিডার ট্যাব (right dotted)', /tab-stops:right dotted 480\.0pt/.test(p06), p06.slice(0, 200));
  const p05 = (html.match(/<p class="MsoNormal" style="[^"]*"[^>]*>(?:(?!<\/p>)[\s\S])*P05XTABS/) || [''])[0];
  T('মাঝে/ডানে/দশমিক ট্যাব অটুট', /center 240\.0pt/.test(p05) && /right 480\.0pt/.test(p05) && /decimal 450\.0pt/.test(p05), p05.slice(0, 200));
  // টেবিল
  T('লম্বালম্বি জোড়া ঘর → rowspan="2"', /rowspan="2"/.test(html));
  T('আড়াআড়ি জোড়া ঘর → colspan="2"', /colspan="2"/.test(html));
  T('ঘরের নিজস্ব বর্ডার (tcBorders → border-top solid)', /<td[^>]*border-top:solid (?:windowtext|#000000) 1\.0pt/.test(html));
  T('বর্ডারহীন ঘর (nil) → border none', /<td[^>]*border-top:none;mso-border-top-alt:none/.test(html));
  const tables = html.match(/<table class="MsoNormalTable"/g) || [];
  T('নেস্টেড টেবিল আলাদা টেবিল হিসেবে (মোট ৩টি টেবিল-ট্যাগ)', tables.length === 3, tables.length);
  const t2 = html.slice(html.indexOf('T2XMID') - 2000, html.indexOf('T2XRIGHT'));
  T('নেস্টেড টেবিল ঘরের ভেতরেই (বাইরের সারিতে মিশে যায় না)', /<td[^>]*>(?:(?!<\/td>)[\s\S])*T2XMID[\s\S]*<table class="MsoNormalTable"[\s\S]*T3XNESTED/.test(t2));
  T('টেবিলের চওড়া tblW (৪৩২pt) ও মাঝে বসানো', /align="center"[^>]*style="[^"]*width:432\.0pt/.test(html));
  // ভাসমান ছবি
  T('ভাসমান ছবি → VML absolute (পাতা-সাপেক্ষ ৪৩২pt, ৫৭৬pt)', /<v:shape[^>]*position:absolute;margin-left:432\.0pt;margin-top:576\.0pt[^>]*mso-position-horizontal-relative:page;mso-position-vertical-relative:page/.test(html));
  T('ভাসমান ছবির জন্য সাধারণ ব্রাউজার-বিকল্প (v:shapes)', /<!\[if !vml\]><span style='mso-ignore:vglayout;position:absolute[^>]*><img[^>]*v:shapes=/.test(html));
  T('সাধারণ ছবি আগের মতো inline img', (html.match(/<img src="data:image\/png[^>]*max-width:100%/g) || []).length >= 2);
} finally {
  await browser.close(); server.close(); try { fs.unlinkSync(tmp); } catch (e) {}
}
console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
