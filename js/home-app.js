/* ফয়জার এআই কম্পোজ — হোম (index.html): ফাইল দেওয়া → ওয়ার্কস্পেস।
 * ওয়ার্কস্পেস: বামে পাতার থাম্বনেইল (টেনে ক্রম বদল, ✕ দিয়ে বাদ, + দিয়ে আরও ফাইল), ডানে সেটিংস ও বড় বোতাম;
 * রূপান্তর → অগ্রগতি → ডাউনলোড (Word 2003 .doc / বিজয় .docx / ইউনিকোড .docx), লেখা দেখা/ঠিক করা, স্টুডিও।
 * ইঞ্জিন: FayzarAiOcrEngine (handleFiles, state.filesQueue, startUnifiedOcr, downloadWordDocument) ও
 *         FayzarFaithfulUI (হুবহু) — ইঞ্জিনের কোড অপরিবর্তিত, শুধু প্রকাশ্য API। টোস্ট: js/fayzar-nav.js।
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const W = window;
  const toast = (m, t) => { if (typeof W.showToastNotification === 'function') W.showToastNotification(m, t); };
  const bn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
  const baseOf = (n) => String(n || 'Document').replace(/\.[^/.]+$/, '').replace(/\s*\(পৃষ্ঠা[^)]*\)\s*$/, '');
  const Eng = () => W.FayzarAiOcrEngine;
  const queue = () => (Eng() && Eng().state && Eng().state.filesQueue) || [];

  const ws = $('panel-ai-ocr'), grid = $('wsGrid'), input = $('ocrFile');
  if (!ws) return;
  let appendNext = false, busy = false, lastRun = null;
  let restoring = false, saveTimer = null, current = 'hero';
  let historyId = null, histTimer = null, fromHistory = false;   // কনভার্ট-ইতিহাস   // সেশন-ক্যাশ ও বর্তমান দৃশ্য (আগে ঘোষণা — শুরুতেই persist() ডাকা হয়)
  const thumbUrl = new WeakMap();

  // ---------- দৃশ্য: ওয়ার্কস্পেস → প্রসেসিং-পাতা → ফলাফল-পাতা (iLovePDF-ধাঁচ) ----------
  function view(v) {
    current = v;
    $('hero').hidden = v !== 'hero';
    ws.hidden = v !== 'ws';
    $('wsProc').hidden = v !== 'proc';
    $('wsResult').hidden = v !== 'result';
    document.body.classList.toggle('ws-on', v !== 'hero');
    ws.dataset.state = v === 'ws' ? 'stReady' : v;
    W.scrollTo(0, 0);
    persist(true);   // দৃশ্য বদল সঙ্গে সঙ্গে সেভ (দ্রুত রিফ্রেশেও যেন না হারায়)
  }
  const openWorkspace = () => view('ws');
  const closeWorkspace = () => view('hero');
  const side = () => view('ws');

  // ---------- মোড ----------
  const mode = () => { const r = document.querySelector('input[name="ocrMode"]:checked'); return r ? r.value : 'template'; };
  function applyMode() {
    const faithful = mode() === 'faithful';
    if (W.FayzarFaithfulUI) W.FayzarFaithfulUI.setMode(faithful ? 'faithful' : 'template');
    $('modeNote').textContent = faithful
      ? 'বর্ডার, টেবিল, লোগো ও অবস্থান যতটা সম্ভব মূলের মতো রাখা হবে (পরীক্ষামূলক)'
      : 'প্রশ্নপত্র/নথি আমাদের নিয়মে সুন্দর করে সাজানো হবে';
    $('dirLabel').hidden = faithful;
    $('ai-custom-directive-input').hidden = faithful;
    if (typeof persist === 'function') persist();
  }
  document.querySelectorAll('input[name="ocrMode"]').forEach((r) => r.addEventListener('change', applyMode));
  if (/[?&]mode=faithful\b/.test(location.search)) { const r = document.querySelector('input[name="ocrMode"][value="faithful"]'); if (r) r.checked = true; }
  applyMode();

  // ---------- ফাইল নেওয়া ----------
  async function acceptFiles(list, append) {
    const files = Array.from(list || []).filter((f) => /pdf|image\//i.test(f.type) || /\.(pdf|png|jpe?g|webp|bmp)$/i.test(f.name));
    if (!files.length) { toast('শুধু PDF বা ছবি (JPG, PNG, WEBP) দিন', 'warning'); return; }
    const E = Eng();
    if (!E) { toast('OCR-ইঞ্জিন লোড হয়নি — পাতাটি আবার খুলুন', 'error'); return; }
    if (busy) return;
    const prev = append ? queue().slice() : [];
    openWorkspace();
    side('stReady');
    grid.classList.add('loading');
    grid.setAttribute('data-msg', 'পাতা প্রস্তুত হচ্ছে…');
    try {
      await E.handleFiles(files);                 // ইঞ্জিন queue নতুন করে বানায়
      E.state.filesQueue = prev.concat(queue());  // যোগ করার সময় আগের পাতা সামনে রাখি
      syncSelected();
    } catch (e) { console.error(e); toast('ফাইল পড়া যায়নি: ' + ((e && e.message) || e), 'error'); }
    grid.classList.remove('loading');
    render();
    if (!queue().length) closeWorkspace();
  }
  function syncSelected() {
    const q = queue();
    if (q.length && Eng().state) Eng().state.selectedFile = q[0].file;   // ডাউনলোডের নাম প্রথম ফাইল থেকে
  }

  // ---------- থাম্বনেইল-গ্রিড ----------
  function srcOf(item) {
    if (item.base64) return item.base64;
    if (!thumbUrl.has(item) && item.file) thumbUrl.set(item, URL.createObjectURL(item.file));
    return thumbUrl.get(item) || '';
  }
  let dragFrom = -1;
  function render() {
    const q = queue();
    grid.innerHTML = '';
    q.forEach((item, i) => {
      const c = document.createElement('figure');
      c.className = 'pg';
      c.draggable = true;
      c.dataset.i = i;
      const img = document.createElement('img');
      img.alt = item.name || 'পাতা'; img.loading = 'lazy';
      if (item.isPdf && !item.base64) { c.classList.add('pg-pdf'); } else img.src = srcOf(item);
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'pg-del'; del.title = 'এই পাতা বাদ দিন'; del.textContent = '✕';
      del.addEventListener('click', (e) => { e.stopPropagation(); removeAt(i); });
      const num = document.createElement('span');
      num.className = 'pg-num'; num.textContent = bn(i + 1);
      const cap = document.createElement('figcaption');
      cap.textContent = (item.name || '').replace(/\s*\(পৃষ্ঠা[^)]*\)\s*$/, '') + (item.pdfPage ? ' · পৃষ্ঠা ' + bn(item.pdfPage) : '');
      c.append(num, del, img, cap);
      c.addEventListener('dragstart', (e) => { dragFrom = i; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      c.addEventListener('dragend', () => { c.classList.remove('dragging'); dragFrom = -1; });
      c.addEventListener('dragover', (e) => { if (dragFrom >= 0) { e.preventDefault(); c.classList.add('drop-target'); } });
      c.addEventListener('dragleave', () => c.classList.remove('drop-target'));
      c.addEventListener('drop', (e) => { e.preventDefault(); c.classList.remove('drop-target'); if (dragFrom >= 0 && dragFrom !== i) moveItem(dragFrom, i); });
      grid.appendChild(c);
    });
    $('wsCount').textContent = bn(q.length);
    $('wsInfo').textContent = q.length > 1
      ? `${bn(q.length)}টি পাতা একসাথে রূপান্তর হবে। টেনে ক্রম বদলাতে পারেন, ✕ দিয়ে বাদ দিতে পারেন।`
      : 'আরও পাতা থাকলে + বোতামে যোগ করুন।';
    persist();
  }
  function removeAt(i) {
    if (busy) return;
    const q = queue();
    if (q.length <= 1) { toast('অন্তত একটি পাতা থাকতে হবে — নতুন ফাইল দিতে "নতুন ফাইল" চাপুন', 'info'); return; }
    q.splice(i, 1); syncSelected(); render();
  }
  function moveItem(from, to) {
    if (busy) return;
    const q = queue();
    const [it] = q.splice(from, 1); q.splice(to, 0, it); syncSelected(); render();
  }

  // ---------- রূপান্তর ----------
  const RING = 2 * Math.PI * 52;
  function ring(pct) {
    const v = Math.max(0, Math.min(100, pct || 0));
    $('ringFg').style.strokeDasharray = RING;
    $('ringFg').style.strokeDashoffset = RING * (1 - v / 100);
  }
  function progress(text, pct) {
    $('wizardProgressTitle').textContent = text;
    $('wizardProgressPctText').textContent = bn(Math.round(pct)) + '%';
    $('wizardProgressBar').style.width = Math.max(0, Math.min(100, pct)) + '%';
    ring(pct);
  }
  // হুবহু-মোড নিজে wizardProgress* id-তে লেখে — শতাংশ বদলালে রিংও মেলাই
  new MutationObserver(() => {
    const t = $('wizardProgressPctText').textContent.replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));
    const n = parseFloat(t); if (!isNaN(n)) ring(n);
  }).observe($('wizardProgressPctText'), { childList: true, characterData: true, subtree: true });
  function procReset(faithful) {
    $('procTitle').textContent = faithful ? 'হুবহু-লেআউট Word তৈরি হচ্ছে…' : 'ছবি/PDF থেকে Word তৈরি হচ্ছে…';
    $('procErr').hidden = true;
    ['procRing', 'wizardProgressTitle', 'procNote', 'btnCancel'].forEach((id) => { $(id).hidden = false; });
  }
  function fail(e) {
    console.error('[home-app]', e);
    busy = false;
    if (Eng() && Eng().state) Eng().state.isProcessing = false;
    $('errMsg').textContent = 'রূপান্তর হয়নি: ' + ((e && e.message) || e || 'অজানা ত্রুটি');
    $('procTitle').textContent = 'রূপান্তর সম্পন্ন হয়নি';
    ['procRing', 'wizardProgressTitle', 'procNote', 'btnCancel'].forEach((id) => { $(id).hidden = true; });
    $('procErr').hidden = false;
    view('proc');
  }
  async function convert() {
    const E = Eng();
    if (!E || busy) return;
    const q = queue();
    if (!q.length) return;
    busy = true;
    const baseName = baseOf(q[0].name || (q[0].file && q[0].file.name));
    procReset(mode() === 'faithful'); view('proc'); progress('এআই প্রসেসিং শুরু হচ্ছে…', 2);
    $('wizardPreviewContent').value = '';
    showText(false);
    try {
      if (mode() === 'faithful') {
        const res = await W.FayzarFaithfulUI.runWizard({ fileName: baseName });
        lastRun = { mode: 'faithful', ir: res && res.ir, cap: res && res.cap, baseName };
        const pages = res && res.ir ? res.ir.pages.length : q.length;
        const incomplete = res && res.cap && (res.cap.issues || []).some((i) => i.kind === 'still_incomplete');
        $('doneTitle').textContent = 'আপনার হুবহু-লেআউট Word ফাইল প্রস্তুত!';
        $('doneMeta').textContent = bn(pages) + ' পাতা' + (incomplete ? ' · কিছু অংশ অসম্পূর্ণ (Gemini থেমেছে)' : '');
      } else {
        const res = await E.startUnifiedOcr('none', (t, p) => progress(t, p), (chunk) => { $('wizardPreviewContent').value = chunk; });
        const text = (res && res.unicode) || (E.state && E.state.unicodeText) || '';
        if (!text.trim()) throw new Error('লেখা পাওয়া যায়নি — ফাইলটি পরিষ্কার কিনা দেখুন');
        $('wizardPreviewContent').value = text;
        lastRun = { mode: 'template', baseName };
        $('doneTitle').textContent = 'আপনার Word ফাইল প্রস্তুত!';
        $('doneMeta').textContent = bn(q.length) + ' পাতা · তিন ফরম্যাটেই নামাতে পারবেন';
      }
      if (E.state) E.state.isProcessing = false;
      busy = false;
      fromHistory = false;
      bindDownloads();
      view('result');
      recordHistory(q, baseName);
    } catch (e) { fail(e); }
  }
  function bindDownloads() {
    const faithful = lastRun && lastRun.mode === 'faithful';
    const map = { wizardDlDocBtn: ['doc', 'doc'], wizardDlDocxBtn: ['bijoy_docx', 'docx-bijoy'], wizardDlUnicodeDocxBtn: ['unicode_docx', 'docx-unicode'] };
    Object.entries(map).forEach(([id, [tplFmt, fFmt]]) => {
      $(id).onclick = async () => {
        try {
          if (faithful) await faithfulDownload(fFmt);
          else await Eng().downloadWordDocument(tplFmt);
        } catch (e) { toast('ফাইল তৈরি হয়নি: ' + ((e && e.message) || e), 'error'); }
      };
    });
    $('btnStudio').hidden = faithful;   // স্টুডিও শুধু সাজানো-ফরম্যাটের লেখার জন্য
    $('btnBack2').hidden = fromHistory && !queue().length;
  }
  function showText(on) {
    $('wsText').hidden = !on;
    $('btnShowText').textContent = on ? 'লেখা লুকান' : 'লেখা দেখুন / ঠিক করুন';
    if (on) $('wizardPreviewContent').focus();
  }
  function resetAll() {
    if (busy) return;
    if (Eng() && Eng().state) { Eng().state.filesQueue = []; Eng().state.isProcessing = false; }
    input.value = '';
    lastRun = null;
    showText(false);
    closeWorkspace();
    if (W.FayzarSession) W.FayzarSession.clear();
  }

  // ---------- ঘটনা ----------
  const idle = $('stIdle'), dropCard = $('dropCard');
  function pick(append) { appendNext = append; input.value = ''; input.click(); }
  idle.addEventListener('click', () => pick(false));
  idle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(false); } });
  $('btnPick').addEventListener('click', (e) => { e.stopPropagation(); pick(false); });
  $('wsAdd').addEventListener('click', () => { if (!busy && current === 'ws') pick(true); });
  input.addEventListener('change', () => acceptFiles(input.files, appendNext));
  ['dragenter', 'dragover'].forEach((t) => dropCard.addEventListener(t, (e) => { e.preventDefault(); dropCard.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => dropCard.addEventListener(t, (e) => { e.preventDefault(); dropCard.classList.remove('over'); }));
  dropCard.addEventListener('drop', (e) => acceptFiles(e.dataTransfer && e.dataTransfer.files, false));
  // ওয়ার্কস্পেসে বাইরে থেকে ফাইল টেনে আনলে যোগ হয় (পাতার ক্রম-বদল নয়)
  $('wsMain').addEventListener('dragover', (e) => { if (dragFrom < 0 && e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault(); });
  $('wsMain').addEventListener('drop', (e) => { if (dragFrom < 0 && e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); if (current === 'ws') acceptFiles(e.dataTransfer.files, true); } });

  $('btnConvert').addEventListener('click', convert);
  $('btnRetry').addEventListener('click', convert);
  ['btnNew', 'btnNew2'].forEach((id) => $(id).addEventListener('click', resetAll));
  $('btnHome').addEventListener('click', resetAll);
  // মেনুর "হোম" (এই পাতাতেই): কাজ চললে/ফলাফল থাকলে জিজ্ঞেস করে হিরোতে ফেরা — রিলোড নয় (রিলোডে ক্যাশ আগের কাজ ফেরাত)
  document.querySelectorAll('.fz-nav a[href="index.html"]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    if (current === 'hero') { W.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (busy) { toast('রূপান্তর চলছে — আগে বাতিল করুন', 'warning'); return; }
    if (W.confirm('আগের কাজ মুছে নতুন ফাইল দিয়ে শুরু করবেন?')) resetAll();
  }));
  ['btnBack1', 'btnBack2'].forEach((id) => $(id).addEventListener('click', () => { if (!busy) { showText(false); view('ws'); } }));
  $('btnCancel').addEventListener('click', () => {
    try { if (Eng() && typeof Eng().cancelCurrentConversion === 'function') Eng().cancelCurrentConversion(); } catch (e) { /* নীরব */ }
    busy = false;
    if (Eng() && Eng().state) Eng().state.isProcessing = false;
    view('ws');
    toast('রূপান্তর বাতিল করা হয়েছে', 'info');
  });
  $('btnShowText').addEventListener('click', () => showText($('wsText').hidden));
  // লেখা ঠিক করলে ডাউনলোডে সেটিই যায় (ইঞ্জিনের state.unicodeText)
  $('wizardPreviewContent').addEventListener('input', (e) => {
    if (Eng() && Eng().state) Eng().state.unicodeText = e.target.value;
    persist();
    if (historyId && lastRun && lastRun.mode === 'template') { clearTimeout(histTimer); histTimer = setTimeout(() => W.FayzarSession.historyUpdate(historyId, { text: e.target.value }), 600); }
  });
  $('ai-custom-directive-input').addEventListener('input', () => persist());
  $('btnStudio').addEventListener('click', () => { if (Eng() && Eng().openStudioPreviewEditor) Eng().openStudioPreviewEditor(); });
  W.addEventListener('beforeunload', (e) => { if (busy) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- হুবহু-মোডের ডাউনলোড (নিজেদের রাখা ir থেকে — রিফ্রেশের পরেও চলে) ----------
  function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  async function faithfulDownload(fmt) {
    const X = W.FayzarFaithful;
    if (!X || !lastRun || !lastRun.ir) throw new Error('হুবহু-লেআউটের ফলাফল পাওয়া যায়নি — আবার কনভার্ট করুন');
    toast('হুবহু-লেআউট ফাইল প্রস্তুত হচ্ছে…', 'info');
    const res = await X.produce(lastRun.ir, fmt, { pageSize: 'a4', margin: 'normal' });
    const ext = fmt === 'doc' ? '_হুবহু_Word2003.doc' : (fmt === 'docx-bijoy' ? '_হুবহু_Bijoy.docx' : '_হুবহু_Unicode.docx');
    saveBlob(res.blob, (lastRun.baseName || 'Document') + ext);
  }

  // ---------- সেশন-ক্যাশ (js/session-store.js): রিফ্রেশে কাজ হারায় না ----------
  function persist(now) {
    if (restoring || !W.FayzarSession) return;
    clearTimeout(saveTimer);
    const run = () => {
      if (current === 'hero' || !queue().length) { W.FayzarSession.clear(); return; }
      W.FayzarSession.save({
        view: busy ? 'proc' : current,
        mode: mode(),
        directive: $('ai-custom-directive-input').value,
        items: queue().map((it) => ({ file: it.file, name: it.name, size: it.size, isPdf: it.isPdf, mimeType: it.mimeType, base64: it.base64 || '', pdfPage: it.pdfPage, pageWidthPt: it.pageWidthPt, pageHeightPt: it.pageHeightPt })),
        text: $('wizardPreviewContent').value,
        run: lastRun ? { mode: lastRun.mode, baseName: lastRun.baseName } : null,
        done: { title: $('doneTitle').textContent, meta: $('doneMeta').textContent },
        cap: lastRun && lastRun.mode === 'faithful' ? lastRun.cap : undefined
      });
    };
    if (now) run(); else saveTimer = setTimeout(run, 300);
  }
  function notice(msg) { $('wsInfo').textContent = msg; toast(msg, 'warning'); }
  async function restore() {
    if (!W.FayzarSession || !Eng()) return;
    const rec = await W.FayzarSession.load();
    if (!rec || !rec.items || !rec.items.length) return;
    restoring = true;
    try {
      const E = Eng();
      E.state.filesQueue = rec.items.map((it) => Object.assign({}, it));
      syncSelected();
      const r = document.querySelector(`input[name="ocrMode"][value="${rec.mode === 'faithful' ? 'faithful' : 'template'}"]`);
      if (r) r.checked = true;
      applyMode();
      $('ai-custom-directive-input').value = rec.directive || '';
      render();
      $('wizardPreviewContent').value = rec.text || '';
      if (rec.done) { $('doneTitle').textContent = rec.done.title || 'আপনার Word ফাইল প্রস্তুত!'; $('doneMeta').textContent = rec.done.meta || ''; }
      if (rec.view === 'result' && rec.run && rec.run.mode === 'template' && (rec.text || '').trim()) {
        E.state.unicodeText = rec.text;
        lastRun = { mode: 'template', baseName: rec.run.baseName };
        bindDownloads(); view('result');
      } else if (rec.view === 'result' && rec.run && rec.run.mode === 'faithful' && rec.cap && W.FayzarFaithful) {
        const ir = await W.FayzarFaithful.layout(rec.cap, queue(), {});
        lastRun = { mode: 'faithful', ir, cap: rec.cap, baseName: rec.run.baseName };
        bindDownloads(); view('result');
      } else {
        view('ws');
        if (rec.view === 'proc') notice('পাতা রিফ্রেশ হওয়ায় রূপান্তর থেমে গেছে — পাতাগুলো আছে, আবার "কনভার্ট করুন" চাপুন।');
        else if (rec.view === 'result') notice('আগের ফলাফল ফেরানো যায়নি — পাতাগুলো আছে, আবার কনভার্ট করুন।');
      }
      if (rec.view !== 'proc') toast('আগের কাজ ফিরিয়ে আনা হয়েছে', 'success');
    } catch (e) {
      console.warn('[home-app] restore', e);
      view('ws');
    } finally { restoring = false; persist(); }
  }
  if (document.readyState === 'complete') restore(); else W.addEventListener('load', restore);

  // =====================================================================
  // কনভার্ট-ইতিহাস: সফল রূপান্তর জমা (লেখা / হুবহু-ir), ডান প্যানেলে তালিকা — খুলুন, .doc, ✕
  // =====================================================================
  const histPanel = $('histPanel'), histList = $('histList');
  function makeThumb(item) {
    return new Promise((resolve) => {
      if (!item || (item.isPdf && !item.base64)) { resolve(''); return; }
      const src = item.base64 || (item.file ? URL.createObjectURL(item.file) : '');
      if (!src) { resolve(''); return; }
      const img = new Image();
      img.onload = () => {
        try {
          const w = 120, h = Math.round(img.height * (w / img.width)) || 160;
          const c = document.createElement('canvas'); c.width = w; c.height = Math.min(h, 180);
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.7));
        } catch (e) { resolve(''); }
      };
      img.onerror = () => resolve('');
      img.src = src;
    });
  }
  async function recordHistory(q, baseName) {
    if (!W.FayzarSession || !lastRun) return;
    const files = [...new Set(q.map((it) => (it.file && it.file.name) || it.name))];
    const entry = {
      name: files.length > 1 ? files[0] + ' + আরও ' + bn(files.length - 1) + 'টি' : files[0],
      baseName, pages: q.length, mode: lastRun.mode,
      thumb: await makeThumb(q[0])
    };
    if (lastRun.mode === 'faithful') entry.ir = lastRun.ir; else entry.text = $('wizardPreviewContent').value;
    historyId = await W.FayzarSession.historyAdd(entry);
    updateHistCount();
  }
  function ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'এইমাত্র';
    if (m < 60) return bn(m) + ' মিনিট আগে';
    return bn(Math.round(m / 60)) + ' ঘণ্টা আগে';
  }
  async function updateHistCount() {
    if (!W.FayzarSession) return;
    const n = (await W.FayzarSession.historyList()).length;
    document.querySelectorAll('.fz-links a.fz-hist').forEach((a) => { a.textContent = n ? 'ইতিহাস (' + bn(n) + ')' : 'ইতিহাস'; });
  }
  async function openHistory() {
    if (!W.FayzarSession) return;
    const list = await W.FayzarSession.historyList();
    histList.innerHTML = '';
    if (!list.length) {
      histList.innerHTML = '<p class="hist-empty">এখনো কোনো রূপান্তর নেই। ফাইল কনভার্ট করলে এখানে জমা হবে।</p>';
    }
    list.forEach((h) => {
      const row = document.createElement('div');
      row.className = 'hist-row';
      const th = document.createElement('div');
      th.className = 'hist-thumb';
      if (h.thumb) { const im = document.createElement('img'); im.src = h.thumb; im.alt = ''; th.appendChild(im); } else th.textContent = 'PDF';
      const info = document.createElement('div');
      info.className = 'hist-info';
      const nm = document.createElement('b'); nm.textContent = h.name || 'ফাইল';
      const meta = document.createElement('span');
      meta.textContent = bn(h.pages || 1) + ' পাতা · ' + (h.mode === 'faithful' ? 'হুবহু' : 'সাজানো') + ' · ' + ago(h.at);
      const acts = document.createElement('div');
      acts.className = 'hist-acts';
      const bOpen = document.createElement('button'); bOpen.type = 'button'; bOpen.className = 'btn-o'; bOpen.textContent = 'খুলুন';
      bOpen.addEventListener('click', () => openEntry(h.id));
      const bDoc = document.createElement('button'); bDoc.type = 'button'; bDoc.className = 'btn'; bDoc.textContent = '.doc';
      bDoc.title = 'Word 2003 (.doc) ডাউনলোড';
      bDoc.addEventListener('click', () => downloadEntry(h.id, 'doc'));
      const bDel = document.createElement('button'); bDel.type = 'button'; bDel.className = 'hist-del'; bDel.textContent = '✕'; bDel.title = 'ইতিহাস থেকে মুছুন';
      bDel.addEventListener('click', async () => { await W.FayzarSession.historyDelete(h.id); if (historyId === h.id) historyId = null; openHistory(); updateHistCount(); });
      acts.append(bOpen, bDoc);
      info.append(nm, meta, acts);
      row.append(th, info, bDel);
      histList.appendChild(row);
    });
    $('histClear').hidden = !list.length;
    histPanel.hidden = false; $('histBack').hidden = false;
    document.body.classList.add('hist-on');
  }
  function closeHistory() {
    histPanel.hidden = true; $('histBack').hidden = true;
    document.body.classList.remove('hist-on');
    if (location.hash === '#history') history.replaceState(null, '', location.pathname + location.search);
  }
  // ইতিহাসের এন্ট্রি → ফলাফল-পাতা (সব ডাউনলোড, লেখা ঠিক করা, স্টুডিও)
  async function openEntry(id) {
    if (busy) { toast('রূপান্তর চলছে — শেষ হলে খুলুন', 'warning'); return; }
    const h = await W.FayzarSession.historyGet(id);
    if (!h) { toast('এন্ট্রিটি পাওয়া যায়নি', 'error'); return; }
    if (h.mode === 'faithful' && !h.ir) { toast('এই হুবহু-ফাইলের ডেটা রাখা যায়নি — আবার কনভার্ট করুন', 'warning'); return; }
    const E = Eng();
    fromHistory = true; historyId = id;
    if (h.mode === 'faithful') {
      lastRun = { mode: 'faithful', ir: h.ir, baseName: h.baseName };
      $('wizardPreviewContent').value = '';
      $('doneTitle').textContent = 'হুবহু-লেআউট Word ফাইল (ইতিহাস থেকে)';
    } else {
      E.state.unicodeText = h.text || '';
      if (!queue().length) E.state.selectedFile = new File([''], h.baseName || 'Document');
      lastRun = { mode: 'template', baseName: h.baseName };
      $('wizardPreviewContent').value = h.text || '';
      $('doneTitle').textContent = 'Word ফাইল (ইতিহাস থেকে)';
    }
    $('doneMeta').textContent = (h.name || '') + ' · ' + bn(h.pages || 1) + ' পাতা · ' + ago(h.at);
    showText(false);
    bindDownloads();
    closeHistory();
    view('result');
  }
  // প্যানেল থেকে সরাসরি .doc — বর্তমান কাজ না বদলে
  async function downloadEntry(id, fmt) {
    const h = await W.FayzarSession.historyGet(id);
    if (!h) return;
    try {
      if (h.mode === 'faithful') {
        if (!h.ir) throw new Error('এই হুবহু-ফাইলের ডেটা রাখা যায়নি');
        const keep = lastRun; lastRun = { mode: 'faithful', ir: h.ir, baseName: h.baseName };
        try { await faithfulDownload(fmt === 'doc' ? 'doc' : fmt); } finally { lastRun = keep; }
      } else {
        const E = Eng(), st = E.state;
        const keep = { text: st.unicodeText, sel: st.selectedFile, q: st.filesQueue };
        st.unicodeText = h.text || ''; st.selectedFile = new File([''], h.baseName || 'Document'); st.filesQueue = [];
        try { await E.downloadWordDocument(fmt === 'doc' ? 'doc' : fmt); } finally { st.unicodeText = keep.text; st.selectedFile = keep.sel; st.filesQueue = keep.q; }
      }
    } catch (e) { toast('ফাইল তৈরি হয়নি: ' + ((e && e.message) || e), 'error'); }
  }
  $('histClose').addEventListener('click', closeHistory);
  $('histBack').addEventListener('click', closeHistory);
  W.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !histPanel.hidden) closeHistory(); });
  $('histClear').addEventListener('click', async () => {
    if (!W.confirm('সব ইতিহাস মুছে ফেলবেন?')) return;
    await W.FayzarSession.historyClear(); historyId = null; openHistory(); updateHistCount();
  });
  document.querySelectorAll('.fz-links a.fz-hist').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); openHistory(); }));
  if (location.hash === '#history') W.addEventListener('load', () => setTimeout(openHistory, 300));
  updateHistCount();
})();
