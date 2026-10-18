// WORK_PLAN A5 ব্যাচ: PDF-মাত্র নমুনা (ASIS_DIR → Downloads\AS it IS → Downloads) → (ক্যাশ করা) ক্যাপচার → আমাদের .docx → Word-PDF → ছবি-স্কোর।
// তালিকা: qa/golden-data/asis/manifest.json = [{ id, src, range? }] (src = ফাইলনাম; range "1-3" বড় ফাইলে)
// চালানো: node qa/golden/asis-score.mjs [--ids f1,f2] [--capture] [--save-baseline]
//   --capture : ক্যাপচার না থাকলে Gemini-তে নেওয়া (খরচ)। না দিলে শুধু ক্যাশ-থাকা নমুনা। 3008 না চললে নিজে serve.js চালাবে।
// সারাংশ ≤৩০ লাইন; বিস্তারিত: asis/<id>/image-score.json, মোট: qa/golden-data/score-asis.json
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AD = path.join(ROOT, 'qa/golden-data/asis');

// উৎস খোঁজা: ASIS_DIR → Downloads\AS it IS → Downloads (ফাইলনামে)
export function findSourcePdf(src, opts = {}) {
  if (!src) return null;
  const env = opts.env || process.env;
  const exists = opts.existsSync || fs.existsSync;
  const asisDir = opts.asisDir !== undefined ? opts.asisDir : env.ASIS_DIR;
  const home = opts.homeDir !== undefined ? opts.homeDir : (env.USERPROFILE || env.HOME || os.homedir() || '');
  const dirs = opts.dirs || [
    asisDir,
    home ? path.join(home, 'Downloads', 'AS it IS') : '',
    home ? path.join(home, 'Downloads') : '',
  ].filter(Boolean);
  const base = path.basename(src);
  for (const d of dirs) {
    const p1 = path.join(d, src);
    if (exists(p1)) return p1;
    if (base !== src) {
      const p2 = path.join(d, base);
      if (exists(p2)) return p2;
    }
  }
  return null;
}

// e2e/স্কোর ব্যর্থ হলে আসল ত্রুটির লাইন (Error: …) বাছাই, "Node.js vNN" বা স্ট্যাক-ট্রেস নয়
export function pickErrorLine(stderr = '', stdout = '', status = '') {
  if (stderr && typeof stderr === 'object') {
    return pickErrorLine(stderr.stderr, stderr.stdout, stderr.status);
  }
  const code = typeof stdout === 'number' && status === '' ? stdout : status;
  const out = typeof stdout === 'number' && status === '' ? '' : stdout;
  const text = [out, stderr].filter(Boolean).join('\n');
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const clean = lines.filter((l) =>
    !/^Node\.js\s+v\d/i.test(l) &&
    !/^at\s+/.test(l) &&
    !/^\^+$/.test(l) &&
    !/^(?:file:\/\/|[A-Za-z]:[\\/]|\/).*:\d+(?::\d+)?$/.test(l)
  );
  const err =
    clean.findLast((l) => /^(?:Uncaught\s+)?(?:[A-Za-z_$][\w.$]*Error|Exception|ERR\b|PAGEERROR\b)[:\s]/i.test(l)) ||
    clean.findLast((l) => /(?:[A-Za-z_$][\w.$]*Error:|ERR_[A-Z0-9_]+|PAGEERROR\b)/.test(l)) ||
    clean.at(-1);
  return err || String(code ?? '');
}

export const resolveSource = findSourcePdf;
export const errLine = pickErrorLine;

export const isPortOpen = (port = 3008, host = '127.0.0.1', timeout = 500) =>
  new Promise((resolve) => {
    const s = net.connect({ port, host });
    const done = (ok) => { s.destroy(); resolve(ok); };
    s.setTimeout(timeout);
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
    s.once('timeout', () => done(false));
  });

export async function ensureServer(port = 3008) {
  if ((await isPortOpen(port, '127.0.0.1')) || (await isPortOpen(port, 'localhost'))) {
    return () => {};
  }
  const srv = spawn(process.execPath, [path.join(ROOT, 'serve.js')], {
    cwd: ROOT,
    stdio: 'ignore',
    windowsHide: true,
  });
  const stop = () => {
    if (srv && !srv.killed) {
      try { srv.kill(); } catch {}
    }
  };
  process.once('exit', stop);
  for (let i = 0; i < 100; i++) {
    if ((await isPortOpen(port, '127.0.0.1')) || srv.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  return stop;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : ''; };
  const IDS = opt('--ids') ? new Set(opt('--ids').split(',')) : null;
  const CAPTURE = argv.includes('--capture');
  const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));

  const man = read(path.join(AD, 'manifest.json')).filter((e) => !IDS || IDS.has(e.id));
  const rows = [], all = {};
  const stopServer = await ensureServer(3008);
  try {
    for (const e of man) {
      const od = path.join(AD, e.id), pdf = findSourcePdf(e.src);
      if (!pdf) { rows.push(`${e.id} — উৎস নেই: ${e.src}`); continue; }
      if (!fs.existsSync(path.join(od, 'capture.json')) && !CAPTURE) { rows.push(`${e.id} — ক্যাপচার নেই (--capture)`); continue; }
      const spec = e.range ? `${pdf}::${e.range}` : pdf;
      const e2e = spawnSync(process.execPath, [path.join(ROOT, 'qa/faithful-e2e.mjs'), spec, od], { encoding: 'utf8', timeout: 40 * 60 * 1000 });
      const docx = path.join(od, 'faithful_docx-unicode.docx');
      if (e2e.status !== 0 || !fs.existsSync(docx)) { rows.push(`${e.id} — e2e ব্যর্থ: ${pickErrorLine(e2e.stderr, e2e.stdout, e2e.status)}`.slice(0, 160)); continue; }
      const outPdf = path.join(od, 'out.pdf');
      const ms = spawnSync('powershell', ['-NoProfile', '-File', path.join(ROOT, 'qa/golden/measure-doc.ps1'), docx, path.join(od, 'out.raw.json'), outPdf], { encoding: 'utf8', timeout: 20 * 60 * 1000 }); // a04 (৮ পাতা, ১৭ কলাম) Word-এ ~১০ মিনিট
      if (ms.status !== 0 || !fs.existsSync(outPdf)) { rows.push(`${e.id} — Word-PDF ব্যর্থ`); continue; }
      // মূল PDF-এর পাতা-পরিসর: image-score পুরো PDF নেয়, তাই range থাকলে ছোট নমুনাতেই রাখা ভালো
      const sj = path.join(od, 'image-score.json');
      if (fs.existsSync(sj)) fs.unlinkSync(sj);
      // Word সদ্য-লেখা PDF কখনো ধরে রাখে ⇒ ব্যর্থ হলে একবার ৩ সেকেন্ড পরে আবার
      let is;
      for (let t = 0; t < 2; t++) {
        if (t) spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},3000)']);
        is = spawnSync(process.execPath, [path.join(ROOT, 'qa/golden/image-score.mjs'), spec, outPdf, od], { encoding: 'utf8', timeout: 10 * 60 * 1000 });
        if (is.status === 0 && fs.existsSync(sj)) break;
      }
      if (is.status !== 0 || !fs.existsSync(sj)) { rows.push(`${e.id} — ছবি-স্কোর ব্যর্থ: ${pickErrorLine(is.stderr, is.stdout, is.status)}`.slice(0, 160)); continue; }
      const m = read(sj);
      all[e.id] = m;
      // ২০২৬-১০-১২: লেআউট-স্কোর (মূল লক্ষ্য) — বিস্তারিত/ব্যাচ: asis-layout.mjs
      const ls = spawnSync(process.execPath, [path.join(ROOT, 'qa/golden/layout-score.mjs'), spec, outPdf, od], { encoding: 'utf8', timeout: 10 * 60 * 1000 });
      const lj = path.join(od, 'layout-score.json');
      const lay = ls.status === 0 && fs.existsSync(lj) ? read(lj).score : '–';
      rows.push(`${e.id.padEnd(6)} ${String(m.score ?? '–').padStart(5)} | লেআউট ${String(lay).padStart(5)} | পাতা ${m.pages?.out ?? '?'}/${m.pages?.truth ?? '?'} | ${e.kind || ''}`);
    }
  } finally {
    stopServer();
  }

  const ids = Object.keys(all);
  const score = ids.length ? +(ids.reduce((a, k) => a + (+all[k].score || 0), 0) / ids.length).toFixed(1) : 0;
  const sumPath = path.join(ROOT, 'qa/golden-data/score-asis.json');
  fs.writeFileSync(sumPath, JSON.stringify({ at: new Date().toISOString(), total: { n: ids.length, score }, ids: Object.fromEntries(ids.map((k) => [k, all[k].score])) }, null, 1));
  const basePath = path.join(ROOT, 'qa/golden-data/baseline-asis.json'), regress = [];
  let base = null;
  if (argv.includes('--save-baseline')) fs.writeFileSync(basePath, fs.readFileSync(sumPath));
  else if (fs.existsSync(basePath)) {
    const b = read(basePath); base = b.total.score;
    for (const k of ids) if (b.ids[k] != null && all[k].score < b.ids[k] - 1) regress.push(`${k} ${b.ids[k]}→${all[k].score}`);
  }
  rows.slice(0, 26).forEach((r) => console.log(r));
  console.log(`মোট ${ids.length}টি | গড় ছবি-স্কোর ${score}${base != null ? ` (ভিত্তি ${base})` : ''}`);
  if (regress.length) { console.log('REGRESSION: ' + regress.join(', ')); process.exitCode = 2; }
}
