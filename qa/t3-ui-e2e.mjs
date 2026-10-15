// QA (T3d, docs/T3_PLAN.md): "আমার টেমপ্লেট" — আসল পাতায় (localhost:3008)।
//  ক) খরচ ছাড়া: capture/layout-এর জায়গায় সোনালি নকশা (qa/golden-data/g24, ব্যক্তিগত) —
//     বাক্স আঁকা → নতুন ছাঁচ (রেডিমেড-প্রস্তাব → নিজের → প্রিভিউ → বদল → সেভ) → বাছাই-পারস্পরিকতা →
//     রপ্তানি → মুছা → আমদানি → composeFromText → FayzarFaithful.produce (.docx) → পাতায় ত্রুটি নেই
//  খ) --live: g20 আবেদন-ছাঁচ + স্থানীয়ভাবে না-মেলা খসড়া ⇒ একটি আসল শুধু-লেখার Gemini-ম্যাপ কল
// চালানো: node qa/t3-ui-e2e.mjs [--live]   (অ্যাপ-সার্ভার চালু থাকতে হবে)। সারাংশ ≤৩০ লাইন।
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const LIVE = process.argv.includes('--live');
const GOLD = path.join(ROOT, 'qa/golden-data');
const DL = fs.mkdtempSync(path.join(os.tmpdir(), 'fz-t3-'));
const rows = [];
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; rows.push((ok ? 'OK  ' : 'BAD ') + msg); };

if (!fs.existsSync(path.join(GOLD, 'g24/faithful-pdf/ir.json'))) { console.log('SKIP: qa/golden-data/g24 নেই'); process.exit(0); }
const IR24 = JSON.parse(fs.readFileSync(path.join(GOLD, 'g24/faithful-pdf/ir.json'), 'utf8'));
const CAP24 = JSON.parse(fs.readFileSync(path.join(GOLD, 'g24/faithful-pdf/capture.json'), 'utf8'));
const PNG24 = 'data:image/png;base64,' + fs.readFileSync(path.join(GOLD, 'g24/page-1.png')).toString('base64');
const DRAFT = 'তারিখঃ ১১/১০/২০২৬\n\n# প্রত্যয়ন পত্র\n\nএই মর্মে প্রত্যয়ন করা যাচ্ছে যে, রাকিব হাসান, পিতা: আব্দুল কাদের, অত্র বিদ্যালয়ের ৫ম শ্রেণির নিয়মিত ছাত্র।\n\nআমি তার জীবনের সর্বাঙ্গীন মঙ্গল কামনা করছি।\n';

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 180000 });
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'নতুন নাম' : undefined));   // নাম বদল/মোছা নিশ্চিত
  const cdp = await page.target().createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(async () => { for (const t of await window.FayzarTemplateStore.list()) await window.FayzarTemplateStore.remove(t.id); await window.FayzarMyTemplateUI.refresh(); });

  // ১) বাক্স
  const box = await page.evaluate(() => ({ newCard: !!document.querySelector('#myTplBox [data-mt-act="new"]'), cards: document.querySelectorAll('#myTplBox [data-mt]').length,
    inTplBox: !!document.querySelector('#tplBox #myTplBox') }));
  check(box.newCard && box.cards === 0 && box.inTplBox, `box: new-card ${box.newCard}, cards ${box.cards}, inside tplBox ${box.inTplBox}`);

  // ২) নতুন ছাঁচ (capture/layout নকল — খরচ নেই)
  await page.evaluate((ir, cap, png) => {
    window.FayzarFaithful.capture = async () => cap;
    window.FayzarFaithful.layout = async () => JSON.parse(JSON.stringify(ir));
    window.FayzarAiOcrEngine.state.filesQueue = [{ name: 'স্কুল-প্রত্যয়ন.png', base64: png, mimeType: 'image/png', size: 1 }];
    document.querySelector('#myTplBox [data-mt-act="new"]').click();
  }, IR24, CAP24, PNG24);
  await page.waitForFunction(() => document.getElementById('mtUseReady') || document.getElementById('mtSlots'), { timeout: 30000 });
  const ready = await page.evaluate(() => { const b = document.getElementById('mtUseReady'); const t = b ? document.querySelector('#mtModal .rep-sub b').textContent : ''; if (b) document.getElementById('mtOwn').click(); return t; });
  check(true, `ready-made suggestion: ${ready || '(none)'}`);
  await page.waitForSelector('#mtSlots', { timeout: 10000 });
  const pv = await page.evaluate(() => {
    const li = [...document.querySelectorAll('#mtSlots .mt-slot')];
    const v0 = li.filter((x) => x.classList.contains('mt-var')).length;
    const f = li.find((x) => x.classList.contains('mt-fixed'));
    f.querySelector('.mt-role').click();   // একটি স্থিরকে বদলাবে
    const v1 = [...document.querySelectorAll('#mtSlots .mt-slot.mt-var')].length;
    f.querySelector('.mt-role').click();   // ফেরত
    document.getElementById('mtName').value = 'স্কুলের প্রত্যয়ন (পরীক্ষা)';
    document.getElementById('mtSave').click();
    return { n: li.length, v0, v1, count: document.getElementById('mtCount') && document.getElementById('mtCount').textContent };
  });
  check(pv.n >= 6 && pv.v1 === pv.v0 + 1, `preview: ${pv.n} slots, var ${pv.v0} → toggle ${pv.v1}`);
  await page.waitForFunction(() => document.querySelectorAll('#myTplBox [data-mt]').length === 1, { timeout: 10000 });
  const saved = await page.evaluate(() => {
    const c = document.querySelector('#myTplBox [data-mt]');
    return { name: c.querySelector('b').textContent, checked: c.getAttribute('aria-checked'), thumb: !!c.querySelector('img'), note: document.getElementById('tplNote').textContent,
      modal: document.getElementById('mtModal').hidden };
  });
  check(saved.checked === 'true' && saved.thumb && /আমার টেমপ্লেট/.test(saved.note) && saved.modal, `saved: "${saved.name}", selected ${saved.checked}, thumb ${saved.thumb}, modal closed ${saved.modal}`);

  // ৩) বাছাই-পারস্পরিকতা
  const mx = await page.evaluate(() => {
    document.querySelector('#tplGallery .tpl-card[data-tpl="prottoyon-school"]').click();
    const a = { my: window.FayzarMyTemplateUI.selectedId(), ready: document.querySelector('#tplGallery [aria-checked="true"]').dataset.tpl };
    document.querySelector('#myTplBox [data-mt]').click();
    const b = { my: window.FayzarMyTemplateUI.selectedId(), ready: (document.querySelector('#tplGallery [aria-checked="true"]') || {}).dataset };
    return { aMy: a.my, aReady: a.ready, bMy: !!b.my, bReady: b.ready && b.ready.tpl };
  });
  check(mx.aMy === '' && mx.aReady === 'prottoyon-school' && mx.bMy && mx.bReady === '', `exclusive: ready→my cleared ${mx.aMy === ''}, my→ready cleared ${mx.bReady === ''}`);

  // ৪) রপ্তানি → মুছা → আমদানি
  fs.readdirSync(DL).forEach((x) => fs.unlinkSync(path.join(DL, x)));
  const tap = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel);   // ওয়ার্কস্পেস লুকানো ⇒ DOM-ক্লিক
  await tap('#myTplBox [data-mt-act="export"]');
  let exp = null;
  for (let k = 0; k < 40 && !exp; k++) { await new Promise((r) => setTimeout(r, 250)); exp = fs.readdirSync(DL).find((x) => x.endsWith('.fayzar-template')); }
  check(!!exp, `export file: ${exp || 'none'}`);
  await tap('#myTplBox [data-mt-act="delete"]');
  await page.waitForFunction(() => document.querySelectorAll('#myTplBox [data-mt]').length === 0, { timeout: 10000 });
  if (exp) {
    const [chooser] = await Promise.all([page.waitForFileChooser({ timeout: 10000 }), tap('#myTplBox [data-mt-act="import"]')]);
    await chooser.accept([path.join(DL, exp)]);
    await page.waitForFunction(() => document.querySelectorAll('#myTplBox [data-mt]').length === 1, { timeout: 10000 });
  }
  const imp = await page.evaluate(async () => (await window.FayzarTemplateStore.list()).map((t) => t.name));
  check(imp.length === 1, `delete → import: ${JSON.stringify(imp)}`);

  // ৫) ব্যবহার: খসড়া-লেখা → ছাঁচ → .docx (Gemini ছাড়া; সব স্থানীয়ভাবে মেলে)
  const out = await page.evaluate(async (draft) => {
    const id = (await window.FayzarTemplateStore.list())[0].id;
    const r = await window.FayzarMyTemplateUI.composeFromText(draft, { id, remote: false });
    const res = await window.FayzarFaithful.produce(r.ir, 'docx-unicode');
    const buf = await res.blob.arrayBuffer();
    return { b64: btoa(String.fromCharCode(...new Uint8Array(buf))), report: r.report, fits: r.ir.lineFits };
  }, DRAFT);
  const xml = await (await JSZip.loadAsync(Buffer.from(out.b64, 'base64'))).file('word/document.xml').async('string');
  const plain = xml.replace(/<[^>]+>/g, '');
  check(/রাকিব হাসান/.test(plain) && /১১\/১০\/২০২৬/.test(plain) && !/মহিরুজ্জামান/.test(plain) && out.report.extras.length === 0,
    `compose → docx: new data ${/রাকিব হাসান/.test(plain)}, old name gone ${!/মহিরুজ্জামান/.test(plain)}, blank ${out.report.blank.length}, extras ${out.report.extras.length}, line-fit ${out.fits}`);

  // ৬) --live: আসল Gemini-ম্যাপ (একটি শুধু-লেখার কল)
  if (LIVE) {
    const IR20 = JSON.parse(fs.readFileSync(path.join(GOLD, 'g20/faithful-pdf/ir.json'), 'utf8'));
    const draft20 = 'বরাবর,\nপ্রধান শিক্ষক\nনমুনা সরকারি প্রাথমিক বিদ্যালয়\n\nবিষয়: তিন দিনের ছুটির আবেদন।\n\nজনাব,\n\nসবিনয় নিবেদন এই যে, আমি আপনার বিদ্যালয়ের ৫ম শ্রেণির ছাত্র।\n\nআমার বড় বোনের বিয়ে উপলক্ষে আমাকে গ্রামের বাড়ি যেতে হবে।\n\nঅতএব, আমাকে ১২/১০/২০২৬ থেকে তিন দিনের ছুটি দিতে আপনার মর্জি হয়।\n\nবিনীত নিবেদক\nরাকিব হাসান\nরোল: ৩\n';
    const live = await page.evaluate(async (ir, md) => {
      const S = window.FayzarSampleTemplate;
      const tpl = S.toTemplate(ir, { name: 'g20' });
      const t0 = Date.now();
      const r = await S.composeAsync(tpl, md, {});
      const all = r.ir.pages.map((p) => p.bands.map((b) => b.cells.map((c) => c.items.map((it) => it.kind === 'table' ? it.rows.flat().join(' ') : (it.lines || []).join(' ')).join('\n')).join('\n')).join('\n')).join('\n');
      const N = (s) => S._cmp(s);   // নুক্তা/ফাঁক স্বাভাবিক করে তুলনা
      const missing = ['রাকিব হাসান', 'তিন দিনের ছুটি', 'বড় বোনের বিয়ে', 'অতএব', 'সবিনয় নিবেদন'].filter((w) => !N(all).includes(N(w)));
      const P = new Map(r.parts.map((p) => [p.id, p]));
      const show = (id) => (P.get(id) ? (P.get(id).text || '').slice(0, 24).replace(/\n/g, '/') : id);
      return { called: r.remote.called, error: r.remote.error || '', mapped: Object.keys(r.remote.map).length, rejected: r.remote.rejected.length, ms: Date.now() - t0,
        extras: r.report.extras.length, blank: r.report.blank.length, missing,
        remote: Object.entries(r.remote.map).map(([s, p]) => s + '←' + show(p)).join('; '), extraTxt: r.report.extras.map(show).join(' | '),
        slotsVar: tpl.slots.filter((s) => s.role === 'var' && !s.twinOf).map((s) => s.id + ':' + s.kind + (s.label ? '(' + s.label + ')' : '')).join(' ') };
    }, IR20, draft20);
    check(live.called && !live.error && !live.missing.length, `LIVE map: called ${live.called}, err ${live.error || '-'}, mapped ${live.mapped}, rejected ${live.rejected}, extras ${live.extras}, blank ${live.blank}, missing ${JSON.stringify(live.missing)}, ${live.ms}ms`);
    rows.push('     remote: ' + live.remote);
    rows.push('     extras: ' + live.extraTxt);
    rows.push('     var slots: ' + live.slotsVar);
  }
  check(errs.length === 0, `page errors: ${errs.length}${errs.length ? ' — ' + errs[0].slice(0, 120) : ''}`);
  await page.evaluate(async () => { for (const t of await window.FayzarTemplateStore.list()) await window.FayzarTemplateStore.remove(t.id); });
} catch (e) { check(false, 'crash: ' + String(e && e.message || e).split('\n')[0].slice(0, 160)); }
finally { await browser.close(); }
console.log(rows.join('\n'));
console.log(bad ? `FAIL: ${bad}` : 'ALL OK');
process.exit(bad ? 1 : 0);
