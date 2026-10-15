/* ফয়জার এআই কম্পোজ — সার্ভিস ও টুলস পাতা (services.html)।
 * ইউনিকোড⇄বিজয় (BanglaConverter), Word ফাইল → বিজয় (DocxHandler / DocBinaryEngine), DOCX → DOC (DocxToDocConverter),
 * MD → Word (FayzarExport.produce — একক রপ্তানি-পথ)। ইঞ্জিন অপরিবর্তিত; শুধু তাদের প্রকাশ্য API ডাকা। টোস্ট: js/fayzar-nav.js।
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const W = window;
  const toast = (m, t) => { if (typeof W.showToastNotification === 'function') W.showToastNotification(m, t); };
  function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  const baseOf = (n) => String(n || 'Document').replace(/\.[^/.]+$/, '');
  const bn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

  // =====================================================================
  // টুলস (ট্যাব)
  // =====================================================================
  const tabs = document.querySelectorAll('.tabs [data-tab]');
  function openTab(id, scroll) {
    if (!$(id)) return;
    tabs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
    document.querySelectorAll('.tool').forEach((p) => { p.hidden = p.id !== id; });
    if (scroll) $('tools').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  tabs.forEach((b) => b.addEventListener('click', () => openTab(b.dataset.tab, false)));
  function fromHash() { const h = location.hash.slice(1); if (/^tool-/.test(h)) openTab(h, true); }
  W.addEventListener('hashchange', fromHash);
  fromHash();

  // --- ইউনিকোড ⇄ বিজয় ---
  const BC = () => W.BanglaConverter;
  $('btnU2B').addEventListener('click', () => { if (BC()) $('txtBij').value = BC().unicodeToBijoy($('txtUni').value); });
  $('btnB2U').addEventListener('click', () => { if (BC()) $('txtUni').value = BC().bijoyToUnicode($('txtBij').value); });
  async function copy(id) {
    try { await navigator.clipboard.writeText($(id).value); toast('কপি হয়েছে', 'success'); }
    catch (e) { $(id).select(); document.execCommand('copy'); toast('কপি হয়েছে', 'success'); }
  }
  $('btnCopyUni').addEventListener('click', () => copy('txtUni'));
  $('btnCopyBij').addEventListener('click', () => copy('txtBij'));

  function outButtons(boxId, items) {
    const box = $(boxId);
    box.innerHTML = '';
    items.forEach(([label, blob, name], i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = i === 0 ? 'btn' : 'btn-o'; b.textContent = label;
      b.addEventListener('click', () => saveBlob(blob, name));
      box.appendChild(b);
    });
    box.hidden = false;
  }

  // --- Word ফাইল → বিজয় (বা উল্টো) ---
  $('btnWord').addEventListener('click', async () => {
    const f = $('wordFile').files[0];
    if (!f) { toast('একটি .docx বা .doc ফাইল দিন', 'warning'); return; }
    const dir = $('wordDir').value;
    const targetFont = dir === 'u2b' ? 'SutonnyMJ' : 'Kalpurush';
    const status = $('wordStatus');
    $('wordOut').hidden = true;
    status.textContent = 'রূপান্তর হচ্ছে…';
    try {
      const onProgress = (p, msg) => { status.textContent = (msg || 'রূপান্তর হচ্ছে…') + ' (' + bn(Math.round(p || 0)) + '%)'; };
      const isDoc = /\.doc$/i.test(f.name);
      const res = isDoc
        ? await W.DocBinaryEngine.convertDocFile(f, { direction: dir, targetFont, onProgress })
        : await W.DocxHandler.convertDocx(f, { direction: dir, targetFont, convertHeadersFooters: true, convertFootnotes: true, onProgress });
      const docx = res && (res.convertedBlob || res.blob);
      if (!docx) throw new Error('রূপান্তরিত ফাইল পাওয়া যায়নি');
      status.textContent = 'Word 2003 (.doc) সংস্করণ তৈরি হচ্ছে…';
      let doc = null;
      try { const dr = await new W.DocxToDocConverter().convertDocxToDoc(docx, { preserveSutonny: true, optimizeForQuestionPaper: true }); doc = dr && (dr.blob || dr.convertedBlob); } catch (e) { console.warn('[home-app] .doc', e); }
      const base = baseOf(f.name) + (dir === 'u2b' ? '_Bijoy' : '_Unicode');
      outButtons('wordOut', [[dir === 'u2b' ? 'বিজয় .docx' : 'ইউনিকোড .docx', docx, base + '.docx']].concat(doc ? [['Word 2003 (.doc)', doc, base + '_Word2003.doc']] : []));
      status.textContent = 'সম্পন্ন — নিচ থেকে নামান';
    } catch (e) { console.error(e); status.textContent = 'রূপান্তর হয়নি: ' + ((e && e.message) || e); }
  });

  // --- DOCX → DOC ---
  $('btnDoc').addEventListener('click', async () => {
    const f = $('docFile').files[0];
    if (!f) { toast('একটি .docx ফাইল দিন', 'warning'); return; }
    const status = $('docStatus');
    $('docOut').hidden = true;
    status.textContent = 'রূপান্তর হচ্ছে…';
    try {
      const r = await new W.DocxToDocConverter().convertDocxToDoc(f, {
        pageSize: $('docPage').value, optimizeForQuestionPaper: true, preserveSutonny: true, includeImages: true,
        onProgress: (p, msg) => { status.textContent = (msg || 'রূপান্তর হচ্ছে…') + ' (' + bn(Math.round(p || 0)) + '%)'; }
      });
      const doc = r && (r.blob || r.convertedBlob);
      if (!doc) throw new Error('রূপান্তরিত ফাইল পাওয়া যায়নি');
      outButtons('docOut', [['Word 2003 (.doc) নামান', doc, baseOf(f.name) + '_Word2003.doc']]);
      status.textContent = 'সম্পন্ন';
    } catch (e) { console.error(e); status.textContent = 'রূপান্তর হয়নি: ' + ((e && e.message) || e); }
  });

  // --- MD → Word (একক রপ্তানি-পথ) ---
  document.querySelectorAll('[data-md]').forEach((b) => b.addEventListener('click', async () => {
    const text = $('mdText').value;
    const status = $('mdStatus');
    if (!text.trim()) { toast('আগে লেখা দিন', 'warning'); return; }
    status.textContent = 'ফাইল তৈরি হচ্ছে…';
    try {
      const fmt = b.dataset.md;
      const res = await W.FayzarExport.produce(text, { format: fmt });
      const ext = fmt === 'doc' ? '_Word2003.doc' : (fmt === 'docx-bijoy' ? '_Bijoy.docx' : '_Unicode.docx');
      saveBlob(res.blob, 'Fayzar_Document' + ext);
      status.textContent = 'সম্পন্ন';
    } catch (e) { console.error(e); status.textContent = 'ফাইল তৈরি হয়নি: ' + ((e && e.message) || e); }
  }));

  // ---------- লেখা-বাক্স রিফ্রেশে না হারাতে (শুধু এই ব্রাউজারে) ----------
  ['txtUni', 'txtBij', 'mdText'].forEach((id) => {
    const el = $(id); if (!el) return;
    try { const v = localStorage.getItem('fz_tool_' + id); if (v && !el.value) el.value = v; } catch (e) { /* নীরব */ }
    let t = null;
    const save = () => { clearTimeout(t); t = setTimeout(() => { try { localStorage.setItem('fz_tool_' + id, el.value); } catch (e) { /* নীরব */ } }, 300); };
    el.addEventListener('input', save);
    // বোতামে লেখা বদলালেও সেভ
    new MutationObserver(save).observe(el, { attributes: true });
    el.addEventListener('change', save);
  });
  ['btnU2B', 'btnB2U'].forEach((id) => { const b = $(id); if (b) b.addEventListener('click', () => setTimeout(() => ['txtUni', 'txtBij'].forEach((k) => { try { localStorage.setItem('fz_tool_' + k, $(k).value); } catch (e) { /* নীরব */ } }), 0)); });
})();
