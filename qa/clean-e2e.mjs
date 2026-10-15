// QA (TEMPLATE_COMPOSE_PLAN T1): ক্লিন-ওয়ার্ড — আসল পাতায় (localhost:3008) ফিক্সচার → মাস্টার → বিজয় .docx → .doc,
// তারপর Word-এ খুলে গোনা (পাতা, টেবিল, সমীকরণ/EQ-ফিল্ড)। চালানো: node qa/clean-e2e.mjs [outDir]
// সারাংশ ≤৩০ লাইন। অ্যাপ-সার্ভার চালু থাকতে হবে (START_SERVER.bat)।
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'qa/out/clean-e2e'));
fs.mkdirSync(OUT, { recursive: true });
const FIX = ['real-ocr/class8sci.md', 'real-ocr/hmathcq.md', 'real-ocr/class5.md', 'math-equations.input.md'];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const rows = [];
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  for (const f of FIX) {
    const md = fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');
    const r = await page.evaluate(async (md) => {
      const C = window.FayzarCleanComposer, X = window.FayzarExport;
      const enc = async (b) => { const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
      const body = C.strip(md), out = {};
      for (const fmt of ['docx-unicode', 'docx-bijoy', 'doc']) {
        try { const res = await X.produce(body, { format: fmt, masterDocx: await C.renderDocx(body), pageSize: 'a4', margin: 'normal' }); out[fmt] = await enc(res.blob); }
        catch (e) { out[fmt] = 'ERR ' + (e && e.message || e); }
      }
      return { out, tables: C.parse(md).filter((b) => b.kind === 'table').length };
    }, md);
    const base = path.basename(f).replace(/\.(input\.)?md$/, '');
    const names = {};
    for (const [fmt, b64] of Object.entries(r.out)) {
      if (b64.startsWith('ERR')) { rows.push(`${base} ${fmt} ${b64.slice(0, 120)}`); continue; }
      const ext = fmt === 'doc' ? '.doc' : '.docx';
      names[fmt] = path.join(OUT, `${base}_${fmt}${ext}`);
      fs.writeFileSync(names[fmt], Buffer.from(b64, 'base64'));
    }
    // Word-এ গোনা
    for (const [fmt, file] of Object.entries(names)) {
      const ps = spawnSync('powershell', ['-NoProfile', '-File', path.join(ROOT, 'qa/clean-word-check.ps1'), file], { encoding: 'utf8', timeout: 180000 });
      rows.push(`${base.padEnd(16)} ${fmt.padEnd(13)} ${(ps.stdout || ps.stderr || '').trim().split('\n').pop()} | md-tables ${r.tables}`);
    }
  }
  if (errs.length) rows.push('PAGEERROR: ' + errs.slice(0, 3).join(' | '));
} finally { await browser.close(); }
console.log(rows.slice(0, 30).join('\n'));
