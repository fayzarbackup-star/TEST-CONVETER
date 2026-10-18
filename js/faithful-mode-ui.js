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
  let rangeChoice = 'all', customRangeText = '';   // G3: পাতা-পরিসর ("all" | "1-3" | "custom")

  // G3: সুইচ __FZ_ON_PAGERANGE যাচাই
  function isPageRangeOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_PAGERANGE)) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_PAGERANGE)) return true;
    if (global && Boolean(global.__FZ_ON_PAGERANGE)) return true;
    if (typeof process !== 'undefined' && process && process.env && (process.env.__FZ_ON_PAGERANGE === '1' || process.env.__FZ_ON_PAGERANGE === 'true')) return true;
    return false;
  }

  // G3: পাতা-পরিসর পার্সার ("2-5,8", "১–৩", "সব", ভুল ইনপুট ও পাতা-সংখ্যার বাইরে যাচাই)
  function parsePageRange(input, totalPages) {
    if (global.FayzarFaithful && typeof global.FayzarFaithful.parsePageRange === 'function') {
      return global.FayzarFaithful.parsePageRange(input, totalPages);
    }
    const maxP = typeof totalPages === 'number' && totalPages > 0 ? Math.floor(totalPages) : null;
    if (input == null) {
      return { ok: false, valid: false, pages: [], indices: [], outOfRange: [], invalidTokens: [''], error: 'পাতা-পরিসর দেওয়া হয়নি' };
    }
    const raw = String(input)
      .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/[;،]/g, ',')
      .trim();

    if (raw.toLowerCase() === 'all' || raw === 'সব' || raw === '*') {
      const pages = maxP ? Array.from({ length: maxP }, (_, i) => i + 1) : [];
      return { ok: true, valid: true, mode: 'all', pages, indices: pages.map((p) => p - 1), outOfRange: [], invalidTokens: [], error: null };
    }
    if (!raw) {
      return { ok: false, valid: false, pages: [], indices: [], outOfRange: [], invalidTokens: [''], error: 'পাতা-পরিসর ফাঁকা রাখা যাবে না (যেমন: 2-5,8)' };
    }

    const tokens = raw.split(',').map((t) => t.trim());
    const pageSet = new Set();
    const outSet = new Set();
    const invalidTokens = [];

    for (const tok of tokens) {
      if (!tok) { invalidTokens.push(''); continue; }
      if (/^\d+$/.test(tok)) {
        const n = parseInt(tok, 10);
        if (n < 1) invalidTokens.push(tok);
        else if (maxP && n > maxP) outSet.add(n);
        else pageSet.add(n);
        continue;
      }
      const m = tok.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (a < 1 || b < 1 || a > b) { invalidTokens.push(tok); continue; }
        for (let p = a; p <= b; p++) {
          if (maxP && p > maxP) outSet.add(p);
          else pageSet.add(p);
        }
        continue;
      }
      invalidTokens.push(tok);
    }

    const pages = Array.from(pageSet).sort((a, b) => a - b);
    const outOfRange = Array.from(outSet).sort((a, b) => a - b);
    const indices = pages.map((p) => p - 1);

    if (invalidTokens.length > 0) {
      return { ok: false, valid: false, pages, indices, outOfRange, invalidTokens, error: 'ভুল পাতা-পরিসর: ' + invalidTokens.filter(Boolean).join(', ') };
    }
    if (pages.length === 0) {
      const errMsg = outOfRange.length ? `নির্বাচিত পাতা মোট পাতা-সংখ্যার (${maxP}) বাইরে` : 'সঠিক পাতা-পরিসর দিন (যেমন: 2-5,8)';
      return { ok: false, valid: false, pages: [], indices: [], outOfRange, invalidTokens: [], error: errMsg };
    }
    return { ok: true, valid: true, pages, indices, outOfRange, invalidTokens: [], error: null };
  }

  function getRangeSpec() {
    if (rangeChoice === '1-3') return '1-3';
    if (rangeChoice === 'custom') return customRangeText;
    return 'all';
  }

  function setRangeSpec(choice, customVal) {
    if (choice === 'all' || choice === 'সব') { rangeChoice = 'all'; }
    else if (choice === '1-3' || choice === '১–৩' || choice === '১-৩') { rangeChoice = '1-3'; }
    else if (choice === 'custom') { rangeChoice = 'custom'; if (customVal !== undefined) customRangeText = String(customVal); }
    else { rangeChoice = 'custom'; customRangeText = String(choice == null ? '' : choice); }
    if (isPageRangeOn()) syncPageRangeUI();
  }

  function selectQueuePages(queue, specOverride) {
    const q = Array.isArray(queue) ? queue.slice() : [];
    const spec = specOverride !== undefined ? specOverride : getRangeSpec();
    if (!isPageRangeOn() || !spec || spec === 'all' || spec === 'সব') {
      return { ok: true, queue: q, pages: q.map((_, i) => i + 1), outOfRange: [], error: null };
    }
    const parsed = parsePageRange(spec, q.length);
    if (!parsed.ok || !parsed.pages.length) {
      return { ok: false, queue: [], pages: [], outOfRange: parsed.outOfRange, error: parsed.error };
    }
    return {
      ok: true,
      queue: parsed.pages.map((p) => q[p - 1]).filter(Boolean),
      pages: parsed.pages,
      outOfRange: parsed.outOfRange,
      error: null
    };
  }

  function syncPageRangeUI() {
    if (!isPageRangeOn() || typeof document === 'undefined') return;
    let box = $('fzPageRangeBox');
    const anchor = $('modeNote') || $('fzModeCards');
    if (!box && anchor && anchor.parentNode) {
      box = document.createElement('div');
      box.id = 'fzPageRangeBox';
      box.className = 'fz-pagerange-box';
      box.style.cssText = 'margin:8px 0;';
      box.innerHTML =
        `<p class="ws-label" style="margin:0 0 6px 0;">পাতা:</p>` +
        `<div class="seg" role="radiogroup" aria-label="পাতা-পরিসর">` +
          `<label><input type="radio" name="fzPageRangeChoice" value="all" checked><span>সব</span></label>` +
          `<label><input type="radio" name="fzPageRangeChoice" value="1-3"><span>১–৩</span></label>` +
          `<label><input type="radio" name="fzPageRangeChoice" value="custom"><span>নিজে লিখুন</span></label>` +
        `</div>` +
        `<input type="text" id="fzPageRangeInput" class="field" placeholder="যেমন 2-5,8" hidden style="margin-top:6px;">` +
        `<p class="seg-note" id="fzPageRangeNote" style="margin-top:4px;"></p>`;
      anchor.parentNode.insertBefore(box, anchor.nextSibling);
      box.querySelectorAll('input[name="fzPageRangeChoice"]').forEach((r) => {
        r.addEventListener('change', () => {
          rangeChoice = r.value;
          syncPageRangeUI();
        });
      });
      const inp = $('fzPageRangeInput');
      if (inp) {
        inp.addEventListener('input', () => {
          customRangeText = inp.value;
          syncPageRangeUI();
        });
      }
    }
    if (!box) return;
    box.hidden = mode !== 'faithful';
    box.querySelectorAll('input[name="fzPageRangeChoice"]').forEach((r) => { r.checked = r.value === rangeChoice; });
    const inp = $('fzPageRangeInput');
    if (inp) {
      inp.hidden = rangeChoice !== 'custom';
      if (inp.value !== customRangeText) inp.value = customRangeText;
    }
    const note = $('fzPageRangeNote');
    if (note) {
      const qLen = (global.FayzarAiOcrEngine && global.FayzarAiOcrEngine.state && Array.isArray(global.FayzarAiOcrEngine.state.filesQueue))
        ? global.FayzarAiOcrEngine.state.filesQueue.length : 0;
      const spec = getRangeSpec();
      if (spec === 'all') {
        note.textContent = qLen > 0 ? `সব পাতা (${qLen}টি) এক অনুরোধে রূপান্তর হবে` : 'সব পাতা রূপান্তর হবে';
      } else {
        const p = parsePageRange(spec, qLen || undefined);
        note.textContent = p.ok
          ? `নির্বাচিত পাতা: ${p.pages.join(', ')} (এক অনুরোধে যাবে)`
          : (p.error || 'সঠিক পাতা-পরিসর দিন (যেমন 2-5,8)');
      }
    }
  }

  function isFaithful() { return mode === 'faithful'; }
  function setMode(m) { mode = m === 'faithful' ? 'faithful' : 'template'; try { localStorage.setItem(KEY, mode); } catch (e) { /* নেই */ } paint(); }

  function card(id, icon, title, sub) {
    return `<button type="button" data-fz-mode="${id}" class="fz-mode-card" style="flex:1 1 220px;text-align:left;border-radius:14px;padding:12px 14px;border:2px solid #cbd5e1;background:#fff;cursor:pointer;font:inherit">
      <div style="font-weight:800;font-size:15px;color:#0f172a">${icon} ${title}</div>
      <div style="font-size:12.5px;color:#475569;margin-top:4px">${sub}</div></button>`;
  }
  function paint() {
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.fz-mode-card').forEach((b) => {
        const on = b.getAttribute('data-fz-mode') === mode;
        b.style.borderColor = on ? '#0f766e' : '#cbd5e1';
        b.style.background = on ? '#ecfdf5' : '#fff';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    if (isPageRangeOn()) syncPageRangeUI();
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
    const fullQueue = (Eng.state.filesQueue || []).slice();
    if (!fullQueue.length) throw new Error('কোনো পাতা নেই');
    let queue = fullQueue;
    let selectedPages = null;
    if (isPageRangeOn()) {
      const sel = selectQueuePages(fullQueue, o.pageRange);
      if (!sel.ok || !sel.queue.length) throw new Error(sel.error || 'সঠিক পাতা-পরিসর দিন (যেমন: 2-5,8)');
      queue = sel.queue;
      selectedPages = sel.pages;
    }
    const baseName = (o.fileName || (fullQueue[0] && fullQueue[0].name) || 'Document').replace(/\.[^/.]+$/, '').replace(/\s*\(পৃষ্ঠা[^)]*\)\s*$/, '');
    setProgress(`হুবহু-লেআউট: ${queue.length}টি পাতা Gemini-তে পাঠানো হচ্ছে…`, 15);
    const cap = await X.capture(queue, { onProgress: (m, p) => setProgress(m, Math.min(60, p)) });
    if (selectedPages && cap && typeof cap === 'object') cap.selectedPages = selectedPages;
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

  const FayzarFaithfulUI = {
    isFaithful, setMode, mountModeCards, runWizard, download,
    isPageRangeOn, parsePageRange, getRangeSpec, setRangeSpec, selectQueuePages, syncPageRangeUI,
    get last() { return last; }
  };
  global.FayzarFaithfulUI = FayzarFaithfulUI;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarFaithfulUI;
})(typeof window !== 'undefined' ? window : globalThis);
