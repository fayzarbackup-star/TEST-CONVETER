/**
 * Fayzar — হুবহু-লেআউট মোডের ইন্টারফেস (FayzarFaithfulUI)
 * =======================================================
 * Part-17.6 (ধাপ ৬, প্রথম সংস্করণ): ফাইল বাছাইয়ের পর দুই কার্ড — "আমাদের সাজানো ফরম্যাট" / "মূল ফাইলের মতো হুবহু"।
 * হুবহু বাছাই থাকলে উইজার্ডের "রূপান্তর" বোতাম হুবহু-পথ চালায় (FayzarFaithful), ফলাফল-কার্ডের ডাউনলোড-বোতাম
 * হুবহু ফাইল দেয়। স্টুডিও প্রথম সংস্করণে হুবহু মোডে বন্ধ (ব্যবহারকারীর সিদ্ধান্ত)।
 * main.js শুধু দুই জায়গায় ডাকে: mountModeCards() (ধাপ ২) ও isFaithful()/runWizard() (রূপান্তর-বোতাম)।
 */
(function (global) {
  'use strict';

  const KEY = 'fayzar_layout_mode';
  const $ = (id) => document.getElementById(id);
  let mode = 'template';
  try { const v = localStorage.getItem(KEY); if (v === 'faithful' || v === 'template') mode = v; } catch (e) { /* নেই */ }
  let last = null;   // { cap, ir, baseName }

  function isFaithful() { return mode === 'faithful'; }
  function setMode(m) { mode = m === 'faithful' ? 'faithful' : 'template'; try { localStorage.setItem(KEY, mode); } catch (e) { /* নেই */ } paint(); }

  function card(id, icon, title, sub) {
    return `<button type="button" data-fz-mode="${id}" class="fz-mode-card" style="flex:1 1 220px;text-align:left;border-radius:14px;padding:12px 14px;border:2px solid #cbd5e1;background:#fff;cursor:pointer;font:inherit">
      <div style="font-weight:800;font-size:15px;color:#0f172a">${icon} ${title}</div>
      <div style="font-size:12.5px;color:#475569;margin-top:4px">${sub}</div></button>`;
  }
  function paint() {
    document.querySelectorAll('.fz-mode-card').forEach((b) => {
      const on = b.getAttribute('data-fz-mode') === mode;
      b.style.borderColor = on ? '#0f766e' : '#cbd5e1';
      b.style.background = on ? '#ecfdf5' : '#fff';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /** ধাপ ২-এ (AI OCR বিকল্পের ওপরে) দুই কার্ড বসানো — একবারই */
  function mountModeCards(container) {
    if (!container || document.getElementById('fzModeCards')) { paint(); return; }
    const box = document.createElement('div');
    box.id = 'fzModeCards';
    box.style.cssText = 'margin:0 0 14px 0';
    box.innerHTML = `<div style="font-weight:700;font-size:13px;color:#334155;margin-bottom:8px">লেআউট কেমন চান?</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${card('template', '📐', 'আমাদের সাজানো ফরম্যাট', 'প্রশ্নপত্র/ডকুমেন্ট আমাদের নিয়মে সুন্দর করে সাজানো')}
        ${card('faithful', '📄', 'মূল ফাইলের মতো হুবহু', 'যেভাবে আছে সেভাবেই — অবস্থান, আকার, পাশাপাশি অংশ, চিত্র (পরীক্ষামূলক)')}
      </div>`;
    container.insertBefore(box, container.firstChild);
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-fz-mode]'); if (b) setMode(b.getAttribute('data-fz-mode')); });
    paint();
  }

  function setProgress(text, pct) {
    const t = $('wizardProgressTitle'); if (t) t.textContent = text;
    const p = $('wizardProgressPctText'); if (p) p.textContent = `${pct}%`;
    const bar = $('wizardProgressBar'); if (bar) bar.style.width = `${pct}%`;
  }
  function toast(msg, tone) {
    if (typeof global.showToastNotification === 'function') global.showToastNotification(msg, tone || 'info');
  }

  async function download(fmt) {
    if (!last) return;
    const X = global.FayzarFaithful;
    try {
      toast('হুবহু-লেআউট ফাইল প্রস্তুত হচ্ছে…', 'info');
      const res = await X.produce(last.ir, fmt, { pageSize: 'a4', margin: 'normal' });
      const ext = fmt === 'doc' ? '_হুবহু_Word2003.doc' : (fmt === 'docx-bijoy' ? '_হুবহু_Bijoy.docx' : '_হুবহু_Unicode.docx');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(res.blob); a.download = last.baseName + ext;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('ডাউনলোড সম্পন্ন', 'success');
    } catch (e) {
      console.error('[FayzarFaithfulUI] download', e);
      toast('ফাইল তৈরি ব্যর্থ: ' + (e && e.message || e), 'error');
    }
  }

  /** উইজার্ডের রূপান্তর — হুবহু-পথ */
  async function runWizard(opts) {
    const o = opts || {};
    const Eng = global.FayzarAiOcrEngine, X = global.FayzarFaithful;
    if (!Eng || !X) throw new Error('হুবহু-মোডের মডিউল লোড হয়নি');
    const queue = (Eng.state.filesQueue || []).slice();
    if (!queue.length) throw new Error('কোনো পাতা নেই');
    const baseName = (o.fileName || (queue[0] && queue[0].name) || 'Document').replace(/\.[^/.]+$/, '').replace(/\s*\(পৃষ্ঠা[^)]*\)\s*$/, '');
    setProgress(`হুবহু-লেআউট: ${queue.length}টি পাতা Gemini-তে পাঠানো হচ্ছে…`, 15);
    const cap = await X.capture(queue, { onProgress: (m, p) => setProgress(m, Math.min(60, p)) });
    const ir = await X.layout(cap, queue, { onProgress: (m, p) => setProgress(m, p) });
    last = { cap, ir, baseName };
    setProgress('হুবহু-লেআউট প্রস্তুত', 100);

    // ফলাফল-কার্ড
    const preview = $('wizardPreviewContent');
    if (preview) preview.value = cap.blocks.map((b) => b.type === 'figure' ? '[চিত্র]' : b.text).join('\n\n') + (cap.auditNote ? '\n\n' + cap.auditNote : '');
    $('wizardProgressCard') && $('wizardProgressCard').classList.add('hidden');
    $('wizardResultCard') && $('wizardResultCard').classList.remove('hidden');
    const nm = $('wizardResultFileName'); if (nm) nm.textContent = baseName + '_হুবহু';
    const incomplete = (cap.issues || []).some((i) => i.kind === 'still_incomplete');
    const stats = $('wizardResultStatsBadge');
    if (stats) stats.textContent = `হুবহু-লেআউট: ${ir.pages.length} পাতা, ${cap.blocks.length}টি ব্লক` + (incomplete ? ' — ⚠️ কিছু অংশ অসম্পূর্ণ (Gemini থেমেছে)' : '');
    const bind = (id, fmt) => { const b = $(id); if (b) { b.classList.remove('hidden'); b.onclick = () => download(fmt); } };
    bind('wizardDlDocBtn', 'doc'); bind('wizardDlDocxBtn', 'docx-bijoy'); bind('wizardDlUnicodeDocxBtn', 'docx-unicode');
    ['wizardStudioPreviewBtn', 'wizardOpenStudioInlineBtn', 'wizardDlMdBtn'].forEach((id) => { const b = $(id); if (b) b.classList.add('hidden'); });
    if (incomplete) toast('Gemini কিছু অংশে লেখা থামিয়েছে (সম্ভবত প্রকাশিত লেখার কপিরাইট-ছাঁকনি) — ফাইলে সেই অংশ অসম্পূর্ণ।', 'warning');
    return { cap, ir };
  }

  const FayzarFaithfulUI = { isFaithful, setMode, mountModeCards, runWizard, download, get last() { return last; } };
  global.FayzarFaithfulUI = FayzarFaithfulUI;
})(typeof window !== 'undefined' ? window : globalThis);
