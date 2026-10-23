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
  if (typeof W.__FZ_ON_RELAYOUT === 'undefined') W.__FZ_ON_RELAYOUT = false;   // D1–D4: চালু করতে false → true করুন
  const toast = (m, t) => { if (typeof W.showToastNotification === 'function') W.showToastNotification(m, t); };
  const bn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
  const baseOf = (n) => String(n || 'Document').replace(/\.[^/.]+$/, '').replace(/\s*\(পৃষ্ঠা[^)]*\)\s*$/, '');
  const Eng = () => W.FayzarAiOcrEngine;
  const queue = () => (Eng() && Eng().state && Eng().state.filesQueue) || [];

  const ws = $('panel-ai-ocr'), grid = $('wsGrid'), input = $('ocrFile');
  if (!ws) return;
  let appendNext = false, busy = false, lastRun = null, cleanStyle = false, tplId = '';
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
    if ($('tplBox')) $('tplBox').hidden = faithful;   // ছাঁচ শুধু সাজানো-ফরম্যাটে
    if (typeof persist === 'function') persist();
  }

  // ---------- T2: ছাঁচ-গ্যালারি (js/layout-engine/template-composer.js) ----------
  const TC = () => W.FayzarTemplateComposer;
  function setTpl(id) {
    const t = id && TC() ? TC().byId(id) : null;
    tplId = t ? t.id : '';
    document.querySelectorAll('#tplGallery .tpl-card').forEach((c) => c.setAttribute('aria-checked', String((c.dataset.tpl || '') === tplId)));
    if ($('tplNote')) $('tplNote').textContent = t ? `${t.label}: ${t.desc} — লেখা এই ছাঁচেই বসবে` : 'স্বয়ংক্রিয়: এআই লেখা দেখে লেআউট ঠিক করবে';
  }
  function renderGallery() {
    const box = $('tplGallery');
    if (!box || !TC()) { if ($('tplBox')) $('tplBox').hidden = true; return; }
    const card = (id, inner, cls) => `<button type="button" role="radio" class="tpl-card${cls ? ' ' + cls : ''}" data-tpl="${id}" aria-checked="false">${inner}</button>`;
    box.innerHTML = card('', '<b>স্বয়ংক্রিয়</b><small>এআই ঠিক করবে</small>', 'tpl-auto') +
      TC().GROUPS.map((g) => `<p class="tpl-group">${g.label}</p>` + TC().REGISTRY.filter((t) => t.group === g.id)
        .map((t) => card(t.id, TC().icon(t.icon) + `<b>${t.label}</b><small>${t.desc}</small>`)).join('')).join('');
    box.addEventListener('click', (e) => {
      const c = e.target.closest('.tpl-card');
      if (!c || busy) return;
      if (MT()) MT().clear();   // T3d: রেডিমেড/স্বয়ংক্রিয় বাছলে "আমার টেমপ্লেট" ছাড়া
      setTpl(c.dataset.tpl || '');
      if (W.FayzarDiag) W.FayzarDiag.note('template', tplId || 'auto');
      persist();
    });
    setTpl(tplId);
  }
  renderGallery();
  // ---------- T3d: "আমার টেমপ্লেট" (js/my-template-ui.js) — নিজের নমুনা থেকে ছাঁচ ----------
  const MT = () => W.FayzarMyTemplateUI;
  if (MT()) MT().mount({
    getQueue: () => queue(),
    baseName: () => baseOf(queue()[0] && (queue()[0].name || (queue()[0].file && queue()[0].file.name))),
    busy: () => busy,
    setBusy: (b) => { busy = b; },
    onSelect: (id, t) => {
      setTpl('');
      if (id && t && $('tplNote')) $('tplNote').textContent = `আমার টেমপ্লেট: ${t.name} — খসড়ার লেখা এই ছাঁচে বসবে`;
      if (W.FayzarDiag) W.FayzarDiag.note('template', id ? 'my:' + id : 'auto');
      persist();
    },
    onReadymade: (id) => { setTpl(id); persist(); }
  });
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
      let newItems = queue();
      const offAuto = !!(W.__FZ_OFF_AUTOPREP || W.__FZ_OFF_IMAGEPREP || (typeof localStorage !== 'undefined' && (localStorage.getItem('FZ_OFF_AUTOPREP') === '1' || localStorage.getItem('FZ_OFF_IMAGEPREP') === '1')));
      if (!offAuto && W.FayzarAutoPrep && W.FayzarAutoPrep.autoPrep) {
        const preppedNew = [];
        const total = newItems.length;
        for (let j = 0; j < total; j++) {
          const it = newItems[j];
          if (it.isPdf && !it.base64) {
            preppedNew.push(it);
          } else {
            grid.setAttribute('data-msg', `পাতা সোজা করা হচ্ছে… ${bn(j + 1)}/${bn(total)}`);
            try {
              const res = await W.FayzarAutoPrep.autoPrep(it);
              if (Array.isArray(res) && res.length) {
                preppedNew.push(...res);
              } else {
                preppedNew.push(it);
              }
            } catch (err) {
              console.warn('autoPrep item error:', err);
              preppedNew.push(it);
            }
          }
        }
        newItems = preppedNew;
      }
      E.state.filesQueue = prev.concat(newItems);  // যোগ করার সময় আগের পাতা সামনে রাখি
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
      // ঝাপসা-সতর্কতা ব্যাজ (Laplacian variance ও উজ্জ্বলতা)
      const offPrep = !!(W.__FZ_OFF_IMAGEPREP || W.__FZ_OFF_AUTOPREP || (typeof localStorage !== 'undefined' && (localStorage.getItem('FZ_OFF_IMAGEPREP') === '1' || localStorage.getItem('FZ_OFF_AUTOPREP') === '1')));
      if (!offPrep && W.FayzarLightBlur && item.isBlurry) {
        const blurBadge = document.createElement('div');
        blurBadge.style.cssText = 'position:absolute;bottom:8px;left:4px;right:4px;background:#dc2626;color:#fff;font-size:10px;padding:2px 4px;border-radius:4px;text-align:center;font-weight:bold;z-index:4;pointer-events:none;';
        blurBadge.textContent = '✘ ছবি ঝাপসা — আবার ছবি তুলুন';
        c.appendChild(blurBadge);
      }
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
    if (W.FayzarDiag) W.FayzarDiag.ev('progress', { text: String(text).slice(0, 160), pct: Math.round(pct) });
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
    if (W.FayzarDiag) W.FayzarDiag.end({ ok: false, error: String((e && e.message) || e || 'অজানা ত্রুটি').slice(0, 400) });
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
    procReset(mode() === 'faithful'); view('proc');
    // ডায়াগনস্টিক খতিয়ান (js/diag-log.js) — পরীক্ষামূলক সময়ের জরিপ
    const files = []; const seenF = new Set();
    q.forEach((it) => { const f = it.file; if (f && !seenF.has(f)) { seenF.add(f); files.push({ name: f.name, size: f.size, type: f.type }); } });
    if (W.FayzarDiag) W.FayzarDiag.begin({ mode: mode(), pages: q.length, files, directive: $('ai-custom-directive-input').value.trim().slice(0, 200) });
    if (E.state) E.state.layoutColumns = 'auto';   // Part-18.9: নতুন ফাইলে কলাম আবার স্বয়ংক্রিয়
    progress('এআই প্রসেসিং শুরু হচ্ছে…', 2);
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
        // T2: বাছা ছাঁচ ⇒ প্রম্পটে ইঙ্গিত (ইঞ্জিনের state.templateHint), ফলাফলে ফ্রন্টম্যাটার তালাবদ্ধ
        // T3d: "আমার টেমপ্লেট" বাছা থাকলে সাধারণ OCR-এর লেখা ছাঁচে বসে (হুবহু-নকশা ⇒ হুবহু-ডাউনলোড পথ)
        const myTpl = MT() ? MT().selectedId() : '';
        const tpl = !myTpl && tplId && TC() ? TC().byId(tplId) : null;
        if (E.state) E.state.templateHint = tpl ? TC().promptHint(tpl) : '';
        let res;
        try { res = await E.startUnifiedOcr('none', (t, p) => progress(t, p), (chunk) => { $('wizardPreviewContent').value = chunk; }); }
        finally { if (E.state) E.state.templateHint = ''; }
        let text = (res && res.unicode) || (E.state && E.state.unicodeText) || '';
        if (!text.trim()) throw new Error('লেখা পাওয়া যায়নি — ফাইলটি পরিষ্কার কিনা দেখুন');
        let warn = [];
        if (tpl) {
          const en = TC().enforce(text, tpl);
          text = en.text; warn = en.warnings;
          if (E.state) E.state.unicodeText = text;
        }
        $('wizardPreviewContent').value = text;
        if (myTpl) {
          const r = await MT().composeFromText(text, { id: myTpl, onProgress: (t, p) => progress(t, p) });
          lastRun = { mode: 'faithful', ir: r.ir, baseName, custom: myTpl };
          $('doneTitle').textContent = 'আপনার ছাঁচের Word ফাইল প্রস্তুত!';
          $('doneMeta').textContent = bn(r.ir.pages.length) + ' পাতা · আমার টেমপ্লেট: ' + r.tpl.name;
          MT().warnings(r.report).forEach((w) => toast(w, 'warning'));
        } else {
          lastRun = { mode: 'template', baseName, tpl: tpl ? tpl.id : '' };
          $('doneTitle').textContent = 'আপনার Word ফাইল প্রস্তুত!';
          $('doneMeta').textContent = bn(q.length) + ' পাতা · ' + (tpl ? 'ছাঁচ: ' + tpl.label : 'তিন ফরম্যাটেই নামাতে পারবেন');
        }
        warn.forEach((w) => toast(w, 'warning'));
      }
      if (E.state) E.state.isProcessing = false;
      busy = false;
      fromHistory = false;
      if (W.FayzarDiag) {
        const txt = $('wizardPreviewContent').value || '';
        const cls = W.DocClassifier ? W.DocClassifier.classify(txt) : null;
        W.FayzarDiag.end({ ok: true, mode: lastRun.mode, chars: txt.length, layout: cls && cls.type, reason: cls && cls.reason, frontmatter: (txt.match(/^---\s*[\r\n]([\s\S]*?)[\r\n]---/) || [])[1] || '' });
      }
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
        if (W.FayzarDiag) W.FayzarDiag.note('download', faithful ? fFmt : tplFmt);
        try {
          if (faithful) await faithfulDownload(fFmt);
          else if (cleanStyle) await cleanDownload(fFmt);
          else if (W.__FZ_ON_RELAYOUT && W.FayzarRelayout && W.FayzarRelayout.hasCustomExport()) await W.FayzarRelayout.download(fFmt);
          else await Eng().downloadWordDocument(tplFmt);
        } catch (e) { toast('ফাইল তৈরি হয়নি: ' + ((e && e.message) || e), 'error'); }
      };
    });
    $('btnStudio').hidden = faithful;   // স্টুডিও শুধু সাজানো-ফরম্যাটের লেখার জন্য
    ['btnCopyText', 'btnDlTxt', 'btnDlMd'].forEach((id) => { if ($(id)) $(id).hidden = faithful; });
    if ($('stylePick')) $('stylePick').hidden = faithful;
    setStyle(cleanStyle && !faithful ? 'clean' : 'layout');
    if ($('colPick')) setCols((Eng() && Eng().state && Eng().state.layoutColumns) || 'auto');
    $('btnBack2').hidden = fromHistory && !queue().length;
    // D1–D4: ফলাফল-পাতায় লেআউট/সেটিং বদল ও "ঠিক হয়নি?" (সুইচ __FZ_ON_RELAYOUT)
    if (W.__FZ_ON_RELAYOUT && W.FayzarRelayout) {
      W.FayzarRelayout.mountResult({
        faithful,
        baseName: () => (lastRun && lastRun.baseName) || 'Document',
        getText: resultText,
        setText: (t) => { $('wizardPreviewContent').value = t; if (Eng() && Eng().state) Eng().state.unicodeText = t; persist(); },
        reOcr: async (promptText) => { const inp = $('ai-custom-directive-input'), prev = inp ? inp.value : ''; if (inp) inp.value = prev ? prev + '\n' + promptText : promptText; try { await convert(); } finally { if (inp) inp.value = prev; } },
        saveBlob,
        toast
      });
    }
  }
  // Part-18.9: কলাম-বাছাই — ইঞ্জিনের state.layoutColumns (ডাউনলোডের সময় প্ল্যানারে যায়; আবার OCR লাগে না)
  function setCols(v) {
    const box = $('colPick');
    if (!box) return;
    box.querySelectorAll('button[data-cols]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cols === String(v))));
    if (Eng() && Eng().state) Eng().state.layoutColumns = String(v) === 'auto' ? 'auto' : Number(v);
  }
  if ($('colPick')) $('colPick').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cols]');
    if (!b) return;
    setCols(b.dataset.cols);
    if (W.FayzarDiag) W.FayzarDiag.note('columns', b.dataset.cols);
    toast(b.dataset.cols === 'auto' ? 'কলাম: স্বয়ংক্রিয় (উৎস অনুযায়ী)' : 'কলাম: ' + (b.dataset.cols === '1' ? '১' : '২') + ' — এখন ডাউনলোড করুন', 'info');
  });
  // T1: লেআউট-বাছাই — সাজানো (আমাদের নিয়মে) / ক্লিন (সাধারণ ১-কলাম, js/layout-engine/clean-composer.js)
  function setStyle(v) {
    cleanStyle = v === 'clean';
    const box = $('stylePick');
    if (box) box.querySelectorAll('button[data-style]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.style === v)));
    // কলাম-বাছাই শুধু সাজানো লেআউটে অর্থবহ
    if ($('colPick')) $('colPick').hidden = cleanStyle || !!(lastRun && lastRun.mode === 'faithful');
  }
  if ($('stylePick')) $('stylePick').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-style]');
    if (!b) return;
    setStyle(b.dataset.style);
    if (W.FayzarDiag) W.FayzarDiag.note('style', b.dataset.style);
    toast(cleanStyle ? 'লেআউট: ক্লিন — সাধারণ ১ কলাম, এখন ডাউনলোড করুন' : 'লেআউট: সাজানো', 'info');
  });
  const resultText = () => $('wizardPreviewContent').value || (Eng() && Eng().state && Eng().state.unicodeText) || '';
  async function cleanDownload(fmt) {
    const C = W.FayzarCleanComposer, X = W.FayzarExport;
    if (!C || !X) throw new Error('ক্লিন-ওয়ার্ড মডিউল লোড হয়নি');
    let body = C.strip(resultText());
    if (!body.trim()) throw new Error('ডাউনলোড করার মতো লেখা নেই');
    let figures = null;
    if (Eng() && typeof Eng().prepareSourceFigures === 'function') {
      const prep = await Eng().prepareSourceFigures(body, 'GENERAL');
      if (prep.cancelled) { toast('ডাউনলোড বাতিল করা হয়েছে', 'warning'); return; }
      body = prep.text; figures = prep.figures;
    }
    toast('ক্লিন Word ফাইল প্রস্তুত হচ্ছে…', 'info');
    const master = await C.renderDocx(body);
    const res = await X.produce(body, { format: fmt, masterDocx: master, figures: figures || undefined, pageSize: 'a4', margin: 'normal' });
    const ext = fmt === 'doc' ? '_ক্লিন_Word2003.doc' : (fmt === 'docx-bijoy' ? '_ক্লিন_Bijoy.docx' : '_ক্লিন_Unicode.docx');
    saveBlob(res.blob, ((lastRun && lastRun.baseName) || 'Document') + ext);
  }
  function textOut(kind) {
    const C = W.FayzarCleanComposer;
    const src = resultText();
    if (!C || !src.trim()) { toast('লেখা পাওয়া যায়নি', 'warning'); return null; }
    return kind === 'md' ? C.markdown(src) : C.plainText(src);
  }
  if ($('btnCopyText')) $('btnCopyText').addEventListener('click', async () => {
    const t = textOut('txt');
    if (t == null) return;
    try { await navigator.clipboard.writeText(t); toast('লেখা কপি হয়েছে', 'success'); }
    catch (e) { toast('কপি করা যায়নি — ".txt" নামিয়ে নিন', 'error'); }
  });
  [['btnDlTxt', 'txt', 'text/plain'], ['btnDlMd', 'md', 'text/markdown']].forEach(([id, kind, mime]) => {
    if ($(id)) $(id).addEventListener('click', () => {
      const t = textOut(kind);
      if (t == null) return;
      // BOM: Windows Notepad-এ বাংলা ঠিকমতো খোলে
      saveBlob(new Blob(['﻿' + t], { type: mime + ';charset=utf-8' }), ((lastRun && lastRun.baseName) || 'Document') + '.' + kind);
    });
  });
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
    if (W.FayzarDiag) W.FayzarDiag.end({ ok: false, cancelled: true });
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
    const tag = lastRun.custom ? '_ছাঁচ' : '_হুবহু';   // T3d: আমার টেমপ্লেট
    const ext = fmt === 'doc' ? tag + '_Word2003.doc' : (fmt === 'docx-bijoy' ? tag + '_Bijoy.docx' : tag + '_Unicode.docx');
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
        tpl: tplId,
        myTpl: MT() ? MT().selectedId() : '',
        items: queue().map((it) => ({ file: it.file, name: it.name, size: it.size, isPdf: it.isPdf, mimeType: it.mimeType, base64: it.base64 || '', pdfPage: it.pdfPage, pageWidthPt: it.pageWidthPt, pageHeightPt: it.pageHeightPt })),
        text: $('wizardPreviewContent').value,
        run: lastRun ? { mode: lastRun.mode, baseName: lastRun.baseName, custom: lastRun.custom || '' } : null,
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
      setTpl(rec.tpl || '');
      if (rec.myTpl && MT()) MT().select(rec.myTpl);
      render();
      $('wizardPreviewContent').value = rec.text || '';
      if (rec.done) { $('doneTitle').textContent = rec.done.title || 'আপনার Word ফাইল প্রস্তুত!'; $('doneMeta').textContent = rec.done.meta || ''; }
      if (rec.view === 'result' && rec.run && rec.run.mode === 'template' && (rec.text || '').trim()) {
        E.state.unicodeText = rec.text;
        lastRun = { mode: 'template', baseName: rec.run.baseName };
        bindDownloads(); view('result');
      } else if (rec.view === 'result' && rec.run && rec.run.custom && MT() && (rec.text || '').trim()) {
        // T3d: আমার টেমপ্লেট — সেভ করা OCR-লেখা আবার ছাঁচে (ম্যাপ ক্যাশে থাকে, নতুন খরচ নেই)
        const r = await MT().composeFromText(rec.text, { id: rec.run.custom });
        lastRun = { mode: 'faithful', ir: r.ir, baseName: rec.run.baseName, custom: rec.run.custom };
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
  // "সমস্যা জানান" — মতামত + খতিয়ান + (ঐচ্ছিক) মূল ফাইল → ZIP (ব্যবহারকারীর কম্পিউটারেই)
  // =====================================================================
  const repModal = $('repModal');
  function openReport() {
    if (!repModal) return;
    repModal.querySelectorAll('input[type=checkbox][name=repIssue]').forEach((c) => { c.checked = false; });
    repModal.querySelectorAll('.rep-vote button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    $('repComment').value = '';
    $('repStatus').textContent = '';
    repModal.hidden = false; $('repBack').hidden = false;
  }
  function closeReport() { repModal.hidden = true; $('repBack').hidden = true; }
  if (repModal) {
    ['btnReport1', 'btnReport2'].forEach((id) => { const b = $(id); if (b) b.addEventListener('click', openReport); });
    $('repCancel').addEventListener('click', closeReport);
    $('repBack').addEventListener('click', closeReport);
    repModal.querySelectorAll('.rep-vote button').forEach((b) => b.addEventListener('click', () => {
      repModal.querySelectorAll('.rep-vote button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    $('repDownload').addEventListener('click', async () => {
      const vote = repModal.querySelector('.rep-vote button[aria-pressed="true"]');
      const feedback = {
        vote: vote ? vote.dataset.vote : '',
        issues: Array.from(repModal.querySelectorAll('input[name=repIssue]:checked')).map((c) => c.value),
        comment: $('repComment').value.trim(),
        view: current, mode: lastRun ? lastRun.mode : mode()
      };
      $('repStatus').textContent = 'রিপোর্ট তৈরি হচ্ছে…';
      try {
        const blob = await W.FayzarDiag.buildReportZip({
          feedback,
          includeFiles: $('repFiles').checked,
          includeRecent: $('repRecent').checked,
          queue: queue(),
          ocrText: $('wizardPreviewContent').value || (Eng() && Eng().state && Eng().state.unicodeText) || '',
          faithful: lastRun && lastRun.mode === 'faithful' ? lastRun.ir : null
        });
        const d = new Date(), pad = (n) => String(n).padStart(2, '0');
        saveBlob(blob, 'AI-Compose-রিপোর্ট-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.zip');
        $('repStatus').textContent = 'রিপোর্ট নামানো হয়েছে — ফাইলটি আমাদের পাঠান।';
        setTimeout(closeReport, 1500);
      } catch (e) { $('repStatus').textContent = 'রিপোর্ট তৈরি হয়নি: ' + ((e && e.message) || e); }
    });
  }

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
