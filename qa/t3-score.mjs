// QA (T3e, docs/T3_PLAN.md §৫): নিজের নমুনা থেকে ছাঁচ — ৫টি জোড়া (নমুনা-নকশা + নতুন খসড়া) আসল পাতায় (localhost:3008)।
// প্রতিটি জোড়া: ছাঁচ "আমার টেমপ্লেট"-এ সেভ → FayzarMyTemplateUI.composeFromText (আসল পথ, line-fit সহ) → .docx →
//   মাপ: পাতা (Word COM) নমুনার সমান · লেবেল-স্লট পূরণ ১০০% · খসড়ার লেখা-রিকল ≥৯৯% · নমুনার পুরোনো তথ্য-ফাঁস = ০
// নমুনা-নকশা: qa/golden-data/<id>/faithful-pdf/ir.json (ব্যক্তিগত, পুশ নয়)। আউটপুট: qa/golden-data/t3/<pair>/ (Word-এ দেখার জন্য)।
// চালানো: node qa/t3-score.mjs [--live]   (--live = দরকার হলে আসল Gemini-ম্যাপ; নইলে শুধু স্থানীয় মিল)। সারাংশ ≤৩০ লাইন।
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const ST = require(path.join(ROOT, 'js/layout-engine/sample-template.js'));
const LIVE = process.argv.includes('--live');
const GD = path.join(ROOT, 'qa/golden-data'), OUT = path.join(GD, 't3');
const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');
const irOf = (id) => JSON.parse(fs.readFileSync(path.join(GD, id, 'faithful-pdf/ir.json'), 'utf8'));

/** ক্যাপচার-ব্লক ⇒ সাধারণ OCR-এর মতো Markdown (খসড়া হিসেবে; খরচ ছাড়া) */
function capToMd(cap) {
  return (cap.blocks || []).filter((b) => b.type !== 'figure').map((b) => {
    const lines = (b.lines && b.lines.length ? b.lines : [b.text || '']).map((l) => String(l).trim()).filter(Boolean);
    if (b.type === 'title' || b.type === 'heading') return lines.map((l) => '# ' + l).join('\n');
    if (b.type === 'table') { const rows = lines.map((l) => '| ' + l.split(/\s*\|\s*/).join(' | ') + ' |'); return [rows[0], '|' + ' --- |'.repeat(rows[0].split('|').length - 2), ...rows.slice(1)].join('\n'); }
    return lines.join('\n');
  }).join('\n\n');
}

const PAIRS = [
  { id: 'en-cv', sample: 'g16', draft: () => capToMd(JSON.parse(fs.readFileSync(path.join(GD, 'g14/faithful-pdf/capture.json'), 'utf8'))) },
  { id: 'bn-cv', sample: 'g06', draft: () => fx('cv-basic.input.md') },
  { id: 'prottoyon', sample: 'g24', draft: () => fx('t3/prottoyon-draft.md') },        // দোকানে আসা খসড়া (প্যাড ছাড়া, কাল্পনিক নাম)
  { id: 'application', sample: 'g20', draft: () => fx('pad-school-app.input.md') },
  { id: 'memo', sample: 'g01', draft: () => fx('t3/memo-draft.md') }                    // ক্রেতার নাম + পণ্য + মোট
];

const C = ST._cmp;
const DOTS = /^[.…·_\-─\s]+$/;
const rows = [];
let bad = 0;
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 300000 });
const results = [];
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  for (const P of PAIRS) {
    if (!fs.existsSync(path.join(GD, P.sample, 'faithful-pdf/ir.json'))) { rows.push(`SKIP ${P.id}: ${P.sample} নকশা নেই`); continue; }
    const ir = irOf(P.sample), md = P.draft();
    const dir = path.join(OUT, P.id); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'draft.md'), md);
    const r = await page.evaluate(async (ir, md, live, name) => {
      const S = window.FayzarSampleTemplate, Store = window.FayzarTemplateStore, MT = window.FayzarMyTemplateUI;
      const rec = await Store.save(S.toTemplate(ir, { name }));
      const t0 = Date.now();
      const out = await MT.composeFromText(md, { id: rec.id, remote: live ? undefined : false });
      const ms = Date.now() - t0;
      const res = await window.FayzarFaithful.produce(out.ir, 'docx-unicode');
      const bytes = new Uint8Array(await res.blob.arrayBuffer());
      let b64 = ''; for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      await Store.remove(rec.id);
      return { b64: btoa(b64), slots: rec.slots, parts: out.parts, map: Object.assign({}, out.local.map, out.remote.map), report: out.report,
        remote: { called: out.remote.called, mapped: Object.keys(out.remote.map).length, error: out.remote.error || '' }, ms, pages: ir.pages.length };
    }, ir, md, LIVE, 'T3e ' + P.id);
    const docx = path.join(dir, 'out.docx');
    fs.writeFileSync(docx, Buffer.from(r.b64, 'base64'));
    const xml = await (await JSZip.loadAsync(fs.readFileSync(docx))).file('word/document.xml').async('string');
    const outText = xml.replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const outC = C(outText), draftC = C(md.replace(/^---[\s\S]*?---/, ''));
    // লেবেল-স্লট: প্রতিটি লেবেলে প্রত্যাশা = min(নমুনার স্লট, খসড়ার অংশ) — নমুনায় দুটি "উপজেলা" আর খসড়ায় একটি হলে ১টি
    const partN = {}, slotN = {}, fillN = {};
    r.parts.filter((p) => p.kind === 'kv').forEach((p) => { partN[p.key] = (partN[p.key] || 0) + 1; });
    r.slots.filter((s) => !s.twinOf && s.role === 'var' && s.key && partN[s.key]).forEach((s) => { slotN[s.key] = (slotN[s.key] || 0) + 1; if (r.map[s.id]) fillN[s.key] = (fillN[s.key] || 0) + 1; });
    let labN = 0, labOk = 0;
    for (const k of Object.keys(slotN)) { const want = Math.min(slotN[k], partN[k]); labN += want; labOk += Math.min(fillN[k] || 0, want); }
    // রিকল: খসড়ার শব্দ (≥২ অক্ষর, চিহ্ন বাদে) আউটপুটে — মেলানো টেবিলের শিরোনাম-সারি বাদ (নমুনার শিরোনামই থাকে, ইচ্ছাকৃত)
    const usedTbl = new Set(Object.values(r.map).flat());
    let body = md.replace(/^---[\s\S]*?---/, '');
    r.parts.filter((p) => p.kind === 'table' && p.header && usedTbl.has(p.id)).forEach((p) => {
      const hdr = p.rows[0].join('|');
      body = body.split('\n').filter((l) => C(l.replace(/\|/g, ' ')) !== C(hdr.replace(/\|/g, ' '))).join('\n');
    });
    const words = body.replace(/[#*|>`]/g, ' ').split(/\s+/).map(C).filter((w) => w.length >= 2 && !/^[-.…·_]+$/.test(w));
    const found = words.filter((w) => outC.includes(w)).length;
    const missing = words.filter((w) => !outC.includes(w)).slice(0, 4);
    // ফাঁস: নমুনার var-লেখা (দলনেতা, টেবিল বাদ, ≥৬ অক্ষর, বিন্দু নয়, খসড়াতেও নেই, নমুনার স্থির লেখাতেও নেই) আউটপুটে থাকলে
    const fixedC = C(r.slots.filter((s) => s.role === 'fixed').map((s) => s.sampleText).join(' '));
    const leakTexts = [];
    for (const s of r.slots.filter((x) => !x.twinOf && x.role === 'var' && x.kind !== 'table')) {
      const t = String(s.sampleText || '');
      if (DOTS.test(t)) continue;
      // লম্বা লেখা টুকরায়: প্রতিটি লাইন/অংশ ৬+ অক্ষরের
      for (const seg of t.split(/\n|\s\/\s|,\s/)) {
        const c = C(seg);
        if (c.length >= 6 && !draftC.includes(c) && !fixedC.includes(c) && outC.includes(c)) leakTexts.push(seg.slice(0, 30));
      }
    }
    for (const s of r.slots.filter((x) => !x.twinOf && x.kind === 'table')) {
      String(s.sampleText || '').split('\n').slice(s.header && s.header.length ? 1 : 0).forEach((ln) => ln.split(' | ').forEach((cell) => {
        const c = C(cell);
        if (c.length >= 4 && !/মোট|total/i.test(cell) && !draftC.includes(c) && outC.includes(c)) leakTexts.push('[ছক] ' + cell.slice(0, 20));
      }));
    }
    results.push({ P, r, docx, labOk, labN, recall: words.length ? found / words.length : 1, missing, leak: leakTexts });
  }
  if (errs.length) rows.push(`BAD page errors: ${errs.length} — ${errs[0].slice(0, 100)}`), bad++;
} finally { await browser.close(); }

// Word COM: পাতা গোনা (এক সেশনে)
const pg = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'qa/t3-pages.ps1'), ...results.map((x) => x.docx)], { encoding: 'utf8', timeout: 10 * 60 * 1000 });
const pages = {};
String(pg.stdout || '').split(/\r?\n/).forEach((l) => { const [n, f] = l.split('\t'); if (f) pages[path.resolve(f)] = n; });

const summary = {};
for (const x of results) {
  const wp = pages[path.resolve(x.docx)];
  // পাতা: নমুনার সমান; খসড়ায় নমুনার-স্লটহীন বাড়তি লেখা (অতিরিক্ত) থাকলে সর্বোচ্চ +১ (লেখা কাটা যায় না)
  const pOk = Number(wp) === x.r.pages || (x.r.report.extras.length > 0 && Number(wp) <= x.r.pages + 1);
  const lOk = x.labOk === x.labN, rOk = x.recall >= 0.99, kOk = x.leak.length === 0;
  const ok = pOk && lOk && rOk && kOk;
  if (!ok) bad++;
  summary[x.P.id] = { pages: [wp, x.r.pages], label: [x.labOk, x.labN], recall: +(x.recall * 100).toFixed(1), leak: x.leak.length, blank: x.r.report.blank.length, extras: x.r.report.extras.length, remote: x.r.remote };
  rows.push(`${ok ? 'OK ' : 'BAD'} ${x.P.id.padEnd(12)} পাতা ${wp}/${x.r.pages}${pOk ? '' : '✗'} · লেবেল ${x.labOk}/${x.labN}${lOk ? '' : '✗'} · রিকল ${(x.recall * 100).toFixed(1)}%${rOk ? '' : '✗'} · ফাঁস ${x.leak.length}${kOk ? '' : '✗'} · খালি ${x.r.report.blank.length} · অতিরিক্ত ${x.r.report.extras.length}` +
    (x.r.remote.called ? ` · ম্যাপ-কল ${x.r.remote.mapped}${x.r.remote.error ? ' (' + x.r.remote.error + ')' : ''}` : '') + ` · ${x.r.ms}ms`);
  if (!rOk) rows.push(`     রিকলে বাদ: ${x.missing.join(', ')}`);
  if (!kOk) rows.push(`     ফাঁস: ${x.leak.slice(0, 3).join(' | ')}`);
}
fs.writeFileSync(path.join(OUT, 'score.json'), JSON.stringify({ at: new Date().toISOString(), live: LIVE, pairs: summary }, null, 1));
console.log(rows.join('\n'));
console.log(bad ? `FAIL: ${bad}` : 'ALL OK');
process.exit(bad ? 1 : 0);
