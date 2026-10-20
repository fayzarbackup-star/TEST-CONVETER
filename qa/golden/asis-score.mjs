// WORK_PLAN A5 ব্যাচ: PDF-মাত্র নমুনা (ASIS_DIR → Downloads\AS it IS → Downloads) → (ক্যাশ করা) ক্যাপচার → আমাদের .docx → Word-PDF → ছবি-স্কোর।
// তালিকা: qa/golden-data/asis/manifest.json = [{ id, src, range? }] (src = ফাইলনাম; range "1-3" বড় ফাইলে)
// চালানো: node qa/golden/asis-score.mjs [--ids f1,f2] [--capture] [--save-baseline] [--kill-stale-word]
//   --capture : ক্যাপচার না থাকলে Gemini-তে নেওয়া (খরচ)। না দিলে শুধু ক্যাশ-থাকা নমুনা। 3008 না চললে নিজে serve.js চালাবে।
// সারাংশ ≤৩০ লাইন; বিস্তারিত: asis/<id>/image-score.json, মোট: qa/golden-data/score-asis.json
//   --tag X  : আলাদা ফোল্ডারে রান (qa/golden-data/runs/X/<id>, capture.json কপি) — fixture বদলায় না; মোট: runs/X/score.json
//   --force  : docx-ছাপ এক হলেও Word/স্কোর আবার (ডিফল্টে ছাপ এক হলে আগের স্কোর নেওয়া হয়)
//   --measure: --tag রানেও Word-মাপ out.raw.json (fixture-রানে সবসময়; table-rows/plan-jumps/wrapfit-টেস্ট পড়ে; স্কোরে লাগে না, ধীর)
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AD = path.join(ROOT, 'qa/golden-data/asis');

export const OUTPUT_FILES = [
  'faithful_docx-unicode.docx',
  'faithful_docx-bijoy.docx',
  'faithful_Word2003.doc',
  'out.pdf',
];

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

// e2e/স্কোর ব্যর্থ হলে আসল ত্রুটির লাইন (Error: …) বাছাই, "Node.js vNN", স্ট্যাক-ট্রেস বা { errno, ... } / } নয়
export function pickErrorLine(stderr = '', stdout = '', status = '') {
  if (stderr && typeof stderr === 'object') {
    return pickErrorLine(stderr.stderr, stderr.stdout, stderr.status);
  }
  const code = typeof stdout === 'number' && status === '' ? stdout : status;
  const out = typeof stdout === 'number' && status === '' ? '' : stdout;
  const text = [out, stderr].filter(Boolean).join('\n');
  const rawLines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  // PowerShell বা টার্মিনালে লম্বা Error/path লাইন ভেঙে পরের লাইনে গেলে (অসমাপ্ত ' কোট) জোড়া লাগানো
  const lines = [];
  for (let i = 0; i < rawLines.length; i++) {
    let cur = rawLines[i];
    while (
      i + 1 < rawLines.length &&
      ((cur.match(/'/g) || []).length % 2 === 1) &&
      !/^(?:at\s+|Node\.js\s+v\d|\+\s)/i.test(rawLines[i + 1])
    ) {
      cur += rawLines[++i];
    }
    lines.push(cur);
  }
  const clean = lines.filter((l) =>
    !/^Node\.js\s+v\d/i.test(l) &&
    !/^at\s+/.test(l) &&
    !/^\^+$/.test(l) &&
    !/^[{}[\]().,;:\s]+$/.test(l) &&
    !/^(?:errno|code|syscall|path|dest|address|port|info|fd):\s/.test(l) &&
    !/^(?:node\s*:\s*)?node:[\w/\\.-]+:\d+/i.test(l) &&
    !/^(?:At line:\d+|\+\s)/i.test(l) &&
    !/^(?:file:\/\/|[A-Za-z]:[\\/]|\/|\S*\.m?js).*:\d+(?::\d+)?$/.test(l)
  );
  const err =
    clean.findLast((l) => /^(?:Uncaught\s+)?(?:[A-Za-z_$][\w.$]*Error|Exception|ERR\b|PAGEERROR\b)[:\s]/i.test(l)) ||
    clean.findLast((l) => /(?:[A-Za-z_$][\w.$]*Error:|ERR_[A-Z0-9_]+|PAGEERROR\b)/.test(l)) ||
    clean.at(-1);
  return err || String(code ?? '');
}

// প্রতি id-র আগে আউটপুট ফাইল (faithful_*.docx/.doc, out.pdf) লেখা যায় কি না যাচাই (খুলে বন্ধ)
export function checkOutputFilesWritable(outDir, opts = {}) {
  if (!outDir) return null;
  const exists = opts.existsSync || fs.existsSync;
  const open = opts.openSync || fs.openSync;
  const close = opts.closeSync || fs.closeSync;
  const readdir = opts.readdirSync || fs.readdirSync;
  const names = [...(opts.files || OUTPUT_FILES)];
  try {
    if (exists(outDir)) {
      for (const f of readdir(outDir)) {
        if (/^(?:faithful_.*\.(?:docx?|pdf)|out\.pdf)$/i.test(f) && !names.includes(f)) names.push(f);
      }
    }
  } catch {}
  for (const name of names) {
    const fp = path.join(outDir, name);
    if (!exists(fp)) continue;
    let fd;
    try {
      fd = open(fp, 'r+');
    } catch (e) {
      if (e && e.code === 'ENOENT') continue;
      return name;
    }
    try { close(fd); } catch {}
  }
  return null;
}

export function formatLockedMessage(id, fileName) {
  return `${id} — ফাইল আটকে আছে (খোলা Word?): ${fileName}`;
}

// চালুর শুরুতে জানালা-হীন (MainWindowTitle ফাঁকা) WINWORD প্রসেস যাচাই ও ঐচ্ছিক বন্ধ (--kill-stale-word)
export function handleStaleWord(opts = {}) {
  const kill = !!opts.kill;
  const log = opts.log !== undefined ? opts.log : console.log;
  const run = opts.spawnSync || spawnSync;
  let procs = opts.processes;
  if (!Array.isArray(procs)) {
    if (typeof opts.listProcesses === 'function') {
      procs = opts.listProcesses() || [];
    } else if (process.platform === 'win32' || opts.spawnSync) {
      try {
        const r = run(
          'powershell',
          ['-NoProfile', '-Command', 'Get-Process WINWORD -ErrorAction SilentlyContinue | Select-Object Id,MainWindowTitle | ConvertTo-Json -Compress'],
          { encoding: 'utf8', timeout: 10000 }
        );
        const raw = (r && r.stdout || '').trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          procs = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          procs = [];
        }
      } catch {
        procs = [];
      }
    } else {
      procs = [];
    }
  }
  const stale = procs.filter((p) => p && !String(p.MainWindowTitle ?? p.mainWindowTitle ?? '').trim());
  const pids = stale.map((p) => p.Id ?? p.id ?? p.pid).filter((id) => id != null);
  if (!pids.length) return { stale: [], killed: [], message: '' };
  if (!kill) {
    const message = `সতর্কবার্তা: জানালা-হীন WINWORD প্রসেস চলছে (PID: ${pids.join(', ')})। বন্ধ করতে --kill-stale-word দিন।`;
    if (log) log(message);
    return { stale: pids, killed: [], message };
  }
  if (typeof opts.killProcess === 'function') {
    for (const pid of pids) opts.killProcess(pid);
  } else {
    run(
      'powershell',
      ['-NoProfile', '-Command', `Stop-Process -Id ${pids.join(',')} -Force -ErrorAction SilentlyContinue`],
      { encoding: 'utf8', timeout: 10000 }
    );
  }
  const message = `সতর্কবার্তা: জানালা-হীন WINWORD প্রসেস বন্ধ করা হয়েছে (PID: ${pids.join(', ')})।`;
  if (log) log(message);
  return { stale: pids, killed: [...pids], message };
}

export const resolveSource = findSourcePdf;
export const errLine = pickErrorLine;
export const findLockedOutput = checkOutputFilesWritable;
export const checkStaleWord = handleStaleWord;

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
    detached: true,
    env: { ...process.env, FZ_NO_OPEN: '1' },
  });
  // সার্ভার চালু থাকে, পরের রান একই সার্ভার ব্যবহার করে (বারবার চালু/বন্ধ নয়)
  srv.unref();
  const stop = () => {};
  for (let i = 0; i < 100; i++) {
    if ((await isPortOpen(port, '127.0.0.1')) || srv.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  return stop;
}

// docx-ছাপ: word/*.xml + media (docProps-এর সময়-তারিখ বাদ) + স্কোরিং-স্ক্রিপ্ট — এক হলে Word-PDF/স্কোর আবার লাগে না
export async function docxFingerprint(docxPath) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
  const h = crypto.createHash('sha1');
  for (const n of Object.keys(zip.files).filter((n) => !n.startsWith('docProps/')).sort()) {
    if (zip.files[n].dir) continue;
    h.update(n); h.update(await zip.files[n].async('nodebuffer'));
  }
  for (const s of ['qa/golden/word-pdf-batch.ps1', 'qa/golden/image-score.mjs', 'qa/golden/layout-score.mjs']) {
    const p = path.join(ROOT, s);
    if (fs.existsSync(p)) h.update(fs.readFileSync(p));
  }
  return h.digest('hex');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : ''; };
  const IDS = opt('--ids') ? new Set(opt('--ids').split(',')) : null;
  const CAPTURE = argv.includes('--capture');
  const KILL_STALE_WORD = argv.includes('--kill-stale-word');
  const FORCE = argv.includes('--force');
  const TAG = opt('--tag');
  const RUN = TAG ? path.join(ROOT, 'qa/golden-data/runs', TAG) : AD;
  const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));

  handleStaleWord({ kill: KILL_STALE_WORD });

  const man = read(path.join(AD, 'manifest.json')).filter((e) => !IDS || IDS.has(e.id));
  const MEASURE = argv.includes('--measure') || !TAG; // fixture-রানে মাপ লাগে (wrapfit ইত্যাদি টেস্ট out.raw.json পড়ে)
  const rowOf = {}, all = {}, lays = {}, pending = [];
  let reused = 0;
  const stopServer = await ensureServer(3008);
  try {
    // ধাপ ১: এক ব্রাউজারে সব docx (ক্যাশ-ক্যাপচার থেকে; আগে প্রতি ফাইলে নতুন ব্রাউজার); docx-ছাপ এক হলে আগের স্কোর
    const jobs = [];
    for (const e of man) {
      const rows = { push: (r) => { rowOf[e.id] = r; } };
      const od = path.join(RUN, e.id), pdf = findSourcePdf(e.src);
      if (TAG) {
        fs.mkdirSync(od, { recursive: true });
        const fixCap = path.join(AD, e.id, 'capture.json');
        if (!fs.existsSync(path.join(od, 'capture.json')) && fs.existsSync(fixCap)) fs.copyFileSync(fixCap, path.join(od, 'capture.json'));
      }
      const locked = checkOutputFilesWritable(od);
      if (locked) { rows.push(formatLockedMessage(e.id, locked)); continue; }
      if (!pdf) { rows.push(`${e.id} — উৎস নেই: ${e.src}`); continue; }
      if (!fs.existsSync(path.join(od, 'capture.json')) && !CAPTURE) { rows.push(`${e.id} — ক্যাপচার নেই (--capture)`); continue; }
      const spec = e.range ? `${pdf}::${e.range}` : pdf;
      const docx = path.join(od, 'faithful_docx-unicode.docx');
      if (fs.existsSync(docx)) fs.unlinkSync(docx); // ব্যর্থ কাজে পুরোনো docx যেন স্কোর না হয়
      jobs.push({ e, od, spec, docx });
    }
    if (jobs.length) {
      const jp = path.join(RUN, `e2e-jobs-${process.pid}.json`);
      fs.mkdirSync(RUN, { recursive: true });
      fs.writeFileSync(jp, JSON.stringify(jobs.map((j) => ({ spec: j.spec, out: j.od }))));
      const e2e = spawnSync(process.execPath, [path.join(ROOT, 'qa/faithful-e2e.mjs'), '--jobs', jp], { encoding: 'utf8', timeout: (10 + jobs.length * 40) * 60 * 1000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, FZ_E2E_FMTS: process.env.FZ_E2E_FMTS || (TAG ? 'docx-unicode' : '') } }); // fixture-রানে সব ফরম্যাট (টেস্ট পড়ে)
      fs.unlinkSync(jp);
      const fails = Object.fromEntries((e2e.stdout || '').split('\n').filter((l) => l.startsWith('JOB fail ')).map((l) => { const m = l.slice(9); const j = jobs.find((x) => m.startsWith(path.resolve(x.od))); return [j ? j.e.id : '?', m]; }));
      if (e2e.status !== 0) console.log(`e2e-ব্যাচ থেমেছে: ${pickErrorLine(e2e.stderr, e2e.stdout, e2e.status)}`.slice(0, 160));
      jobs.forEach((j) => { j.fail = fails[j.e.id]; });
    }
    for (const { e, od, spec, docx, fail } of jobs) {
      const rows = { push: (r) => { rowOf[e.id] = r; } };
      if (!fs.existsSync(docx)) { rows.push(`${e.id} — e2e ব্যর্থ: ${fail || 'docx নেই'}`.slice(0, 160)); continue; }
      const outPdf = path.join(od, 'out.pdf');
      const sj = path.join(od, 'image-score.json'), lj = path.join(od, 'layout-score.json'), fpPath = path.join(od, 'fp.txt');
      const fp = await docxFingerprint(docx);
      if (!FORCE && fs.existsSync(fpPath) && fs.readFileSync(fpPath, 'utf8') === fp && fs.existsSync(sj) && fs.existsSync(lj)) {
        const m = read(sj), lay = read(lj).score;
        all[e.id] = m; lays[e.id] = lay; reused++;
        rows.push(`${e.id.padEnd(6)} ${String(m.score ?? '–').padStart(5)} | লেআউট ${String(lay).padStart(5)} | পাতা ${m.pages?.out ?? '?'}/${m.pages?.truth ?? '?'} | (অপরিবর্তিত) ${e.kind || ''}`);
        continue;
      }
      if (fs.existsSync(fpPath)) fs.unlinkSync(fpPath);
      if (fs.existsSync(outPdf)) fs.unlinkSync(outPdf);
      pending.push({ e, od, spec, docx, outPdf, sj, lj, fpPath, fp });
    }
    // ধাপ ২: এক Word-এ সব PDF (আগে প্রতি ফাইলে Word চালু/বন্ধ + মাপ ≈ ১-১.৫ মিনিট; মাপ এখন --measure দিলে)
    if (pending.length) {
      const jobsPath = path.join(RUN, `word-jobs-${process.pid}.json`);
      fs.mkdirSync(RUN, { recursive: true });
      fs.writeFileSync(jobsPath, JSON.stringify(pending.map((p) => ({ docx: p.docx, pdf: p.outPdf, raw: MEASURE ? path.join(p.od, 'out.raw.json') : '' }))));
      const wb = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'qa/golden/word-pdf-batch.ps1'), jobsPath], { encoding: 'utf8', timeout: (10 + pending.length * 12) * 60 * 1000 }); // a04 মাপসহ ~১০ মিনিট
      fs.unlinkSync(jobsPath);
      const errs = (wb.stdout || '').split('\n').filter((l) => l.startsWith('err'));
      if (errs.length) console.log(errs.slice(0, 5).map((l) => l.slice(0, 160)).join('\n'));
    }
    // ধাপ ৩: স্কোর
    for (const { e, od, spec, outPdf, sj, lj, fpPath, fp } of pending) {
      const rows = { push: (r) => { rowOf[e.id] = r; } };
      if (!fs.existsSync(outPdf)) { rows.push(`${e.id} — Word-PDF ব্যর্থ`); continue; }
      // মূল PDF-এর পাতা-পরিসর: image-score পুরো PDF নেয়, তাই range থাকলে ছোট নমুনাতেই রাখা ভালো
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
      const lay = ls.status === 0 && fs.existsSync(lj) ? read(lj).score : '–';
      lays[e.id] = lay;
      if (lay !== '–') fs.writeFileSync(fpPath, fp);
      rows.push(`${e.id.padEnd(6)} ${String(m.score ?? '–').padStart(5)} | লেআউট ${String(lay).padStart(5)} | পাতা ${m.pages?.out ?? '?'}/${m.pages?.truth ?? '?'} | ${e.kind || ''}`);
    }
  } finally {
    stopServer();
  }

  const ids = Object.keys(all);
  const score = ids.length ? +(ids.reduce((a, k) => a + (+all[k].score || 0), 0) / ids.length).toFixed(1) : 0;
  const sumPath = TAG ? path.join(RUN, 'score.json') : path.join(ROOT, 'qa/golden-data/score-asis.json');
  fs.writeFileSync(sumPath, JSON.stringify({ at: new Date().toISOString(), fzOn: process.env.FZ_ON || '', total: { n: ids.length, score }, ids: Object.fromEntries(ids.map((k) => [k, all[k].score])), layout: lays }, null, 1));
  const basePath = path.join(ROOT, 'qa/golden-data/baseline-asis.json'), regress = [];
  let base = null;
  if (argv.includes('--save-baseline') && !TAG) fs.writeFileSync(basePath, fs.readFileSync(sumPath));
  else if (fs.existsSync(basePath)) {
    const b = read(basePath); base = b.total.score;
    for (const k of ids) if (b.ids[k] != null && all[k].score < b.ids[k] - 1) regress.push(`${k} ${b.ids[k]}→${all[k].score}`);
  }
  man.map((e) => rowOf[e.id]).filter(Boolean).slice(0, 26).forEach((r) => console.log(r));
  console.log(`মোট ${ids.length}টি | গড় ছবি-স্কোর ${score}${base != null ? ` (ভিত্তি ${base})` : ''}${reused ? ` | অপরিবর্তিত (Word বাদ) ${reused}টি` : ''}`);
  if (regress.length) { console.log('REGRESSION: ' + regress.join(', ')); process.exitCode = 2; }
}
