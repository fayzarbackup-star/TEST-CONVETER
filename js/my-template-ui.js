/* ফয়জার এআই কম্পোজ — "আমার টেমপ্লেট" ইন্টারফেস (T3d, docs/T3_PLAN.md §১)।
 * ছাঁচ-বাক্সে (#myTplBox): "+ নমুনা থেকে নতুন ছাঁচ" (ওয়ার্কস্পেসের বর্তমান পাতা = নমুনা), সেভ করা ছাঁচের কার্ড, আমদানি।
 * নতুন ছাঁচ: হুবহু-ক্যাপচার (FayzarFaithful.capture + layout, একবারই Gemini) → রেডিমেড-প্রস্তাব →
 *   স্থির/বদলাবে প্রিভিউ (ক্লিকে বদল; প্যাড-মাথা আলাদা রঙে) → নাম → FayzarTemplateStore.save।
 * ব্যবহার: home-app কনভার্টে সাধারণ OCR-এর লেখা দিয়ে composeFromText() ডাকে → নকশা → FayzarFaithful.produce।
 * ইঞ্জিন অপরিবর্তিত — শুধু প্রকাশ্য API (FayzarFaithful, FayzarSampleTemplate, FayzarTemplateStore, FayzarLineFit)।
 */
(function (global) {
  'use strict';
  const W = global;
  const $ = (id) => document.getElementById(id);
  const bn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => { if (typeof W.showToastNotification === 'function') W.showToastNotification(m, t || 'info'); };
  const ST = () => W.FayzarSampleTemplate, Store = () => W.FayzarTemplateStore;
  const KIND = { kv: 'লেবেল-মান', para: 'অনুচ্ছেদ', list: 'তালিকা', heading: 'শিরোনাম', sign: 'স্বাক্ষর', table: 'টেবিল' };

  let host = null, selected = '', draft = null, list = [];

  // ---------------------------------------------------------------- লেখা মাপা (line-fit-এর জন্য; faithful-pipeline-এর একই নিয়ম)
  let measurer = null;
  async function textMeasurer() {
    if (measurer !== null) return measurer;
    measurer = false;
    try {
      if (typeof FontFace === 'undefined') return false;
      const ff = new FontFace('FzMeasureOMJ', 'url(fonts/SutonnyOMJ.ttf)');
      await ff.load(); document.fonts.add(ff);
      const ctx = document.createElement('canvas').getContext('2d');
      const EN = /([A-Za-z0-9][A-Za-z0-9.,:;'"()\-/ ]*[A-Za-z0-9.)]|[A-Za-z0-9])/;
      measurer = (text, bold) => {
        let w = 0;
        String(text).split(EN).forEach((part, k) => {
          if (!part) return;
          const en = k % 2 === 1;
          ctx.font = (en && bold ? 'bold ' : '') + (en ? '100px "Times New Roman", Times, serif' : '100px FzMeasureOMJ');
          w += ctx.measureText(part).width;
        });
        return w;
      };
    } catch (e) { measurer = false; }
    return measurer;
  }

  function thumbOf(item) {
    return new Promise((resolve) => {
      if (!item || (item.isPdf && !item.base64)) { resolve(''); return; }
      const src = item.base64 || (item.file ? URL.createObjectURL(item.file) : '');
      if (!src) { resolve(''); return; }
      const img = new Image();
      img.onload = () => {
        try {
          const w = 160, h = Math.round(img.height * (w / img.width)) || 220;
          const c = document.createElement('canvas'); c.width = w; c.height = Math.min(h, 230);
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.7));
        } catch (e) { resolve(''); }
      };
      img.onerror = () => resolve('');
      img.src = src;
    });
  }
  function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // ---------------------------------------------------------------- কার্ড-তালিকা
  async function refresh() {
    if (!host) return;
    try { list = Store() ? await Store().list() : []; } catch (e) { list = []; console.warn('[my-template]', e); }
    if (selected && !list.some((t) => t.id === selected)) selected = '';
    paint();
  }
  function paint() {
    const card = (t) => `<button type="button" role="radio" class="tpl-card mt-card" data-mt="${esc(t.id)}" aria-checked="${t.id === selected}">` +
      (t.thumb ? `<img class="mt-thumb" src="${esc(t.thumb)}" alt="">` : '<span class="mt-thumb mt-nothumb" aria-hidden="true">▤</span>') +
      `<b>${esc(t.name)}</b><small>${bn(t.pages || 1)} পাতা</small></button>`;
    const sel = list.find((t) => t.id === selected);
    host.innerHTML = '<p class="tpl-group">আমার টেমপ্লেট <small class="mt-hint">— নিজের নমুনা থেকে বানানো, এই ব্রাউজারেই থাকে</small></p>' +
      '<div class="tpl-grid">' +
      '<button type="button" class="tpl-card mt-new" data-mt-act="new"><b>+ নমুনা থেকে নতুন ছাঁচ</b><small>ওপরের পাতাগুলোই নমুনা</small></button>' +
      list.map(card).join('') + '</div>' +
      `<div class="mt-actions">${sel ? `<span>"${esc(sel.name)}":</span><button type="button" class="mt-link" data-mt-act="rename">নাম বদল</button>` +
        '<button type="button" class="mt-link" data-mt-act="export">রপ্তানি (ফাইল)</button><button type="button" class="mt-link mt-danger" data-mt-act="delete">মুছুন</button>' : ''}` +
      '<button type="button" class="mt-link" data-mt-act="import">আমদানি (.fayzar-template)</button></div>';
  }
  function select(id) {
    selected = id || '';
    paint();
    if (opts.onSelect) opts.onSelect(selected, list.find((t) => t.id === selected) || null);
  }

  async function onClick(e) {
    if (opts.busy && opts.busy()) return;
    const c = e.target.closest('[data-mt]');
    if (c) { select(c.dataset.mt === selected ? '' : c.dataset.mt); return; }
    const a = e.target.closest('[data-mt-act]');
    if (!a) return;
    const act = a.dataset.mtAct, sel = list.find((t) => t.id === selected);
    try {
      if (act === 'new') await createFromQueue();
      else if (act === 'import') importPick();
      else if (act === 'export' && sel) { const f = await Store().exportBlob(sel.id); saveBlob(f.blob, f.filename); toast('ছাঁচ ফাইলে রাখা হলো — পেনড্রাইভে অন্য কম্পিউটারে নিতে পারবেন', 'success'); }
      else if (act === 'rename' && sel) {
        const nm = W.prompt('ছাঁচের নতুন নাম', sel.name);
        if (nm != null) { await Store().rename(sel.id, nm); await refresh(); toast('নাম বদলানো হলো', 'success'); }
      } else if (act === 'delete' && sel) {
        if (W.confirm(`"${sel.name}" ছাঁচটি মুছবেন? এটি ফেরানো যাবে না (আগে রপ্তানি করে রাখতে পারেন)।`)) { await Store().remove(sel.id); select(''); await refresh(); toast('ছাঁচ মুছে ফেলা হয়েছে', 'info'); }
      }
    } catch (err) { toast((err && err.message) || String(err), 'error'); }
  }

  function importPick() {
    let inp = $('mtImportFile');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file'; inp.id = 'mtImportFile'; inp.accept = '.fayzar-template,application/json'; inp.hidden = true;
      document.body.appendChild(inp);
      inp.addEventListener('change', async () => {
        const f = inp.files && inp.files[0];
        inp.value = '';
        if (!f) return;
        try {
          const r = await Store().importFile(await f.text());
          await refresh();
          if (r.added.length) toast(`${bn(r.added.length)}টি ছাঁচ আমদানি হলো` + (r.skipped.length ? ` (${bn(r.skipped.length)}টি বাদ: ${r.skipped[0].reason})` : ''), r.skipped.length ? 'warning' : 'success');
          else toast('কোনো ছাঁচ আমদানি হয়নি' + (r.skipped.length ? ': ' + r.skipped[0].reason : ''), 'warning');
        } catch (err) { toast((err && err.message) || String(err), 'error'); }
      });
    }
    inp.click();
  }

  // ---------------------------------------------------------------- নতুন ছাঁচ: মডাল
  function modal() {
    let m = $('mtModal');
    if (m) return m;
    const back = document.createElement('div');
    back.className = 'hist-back'; back.id = 'mtBack'; back.hidden = true;
    m = document.createElement('div');
    m.className = 'rep mt-modal'; m.id = 'mtModal'; m.hidden = true;
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-labelledby', 'mtTitle');
    document.body.appendChild(back); document.body.appendChild(m);
    return m;
  }
  function show(html) { const m = modal(); m.innerHTML = html; m.hidden = false; $('mtBack').hidden = false; return m; }
  function hide() { const m = $('mtModal'); if (m) m.hidden = true; if ($('mtBack')) $('mtBack').hidden = true; draft = null; }

  async function createFromQueue() {
    const q = opts.getQueue ? opts.getQueue() : [];
    const S = ST();
    if (!S || !Store() || !W.FayzarFaithful) throw new Error('ছাঁচ-মডিউল লোড হয়নি — পাতাটি আবার খুলুন');
    if (!q.length) throw new Error('আগে নমুনার ছবি/PDF দিন (ওপরের পাতাগুলোই নমুনা হবে)');
    if (q.length > Store().LIMITS.maxPages) throw new Error(`নমুনায় সর্বোচ্চ ${bn(Store().LIMITS.maxPages)} পাতা দিন`);
    show('<h2 id="mtTitle">নমুনা থেকে নতুন ছাঁচ</h2>' +
      '<p class="rep-sub">নমুনার নকশা (মার্জিন, ফন্ট, টেবিল, লোগো) একবার পড়া হবে — এতে একটি এআই-অনুরোধ লাগে। পরে এই ছাঁচ বারবার বিনা খরচে ব্যবহার করা যাবে।</p>' +
      '<p class="mt-warn">নমুনায় আগের গ্রাহকের তথ্য থাকলে তা শুধু এই ব্রাউজারে থাকবে; নতুন ফাইলে কখনো যাবে না (না-মেলা ঘর খালি থাকে)।</p>' +
      '<p class="rep-status" id="mtStatus" aria-live="polite">নমুনা পড়া হচ্ছে…</p>');
    const status = (t) => { const s = $('mtStatus'); if (s) s.textContent = t; };
    let cap, ir;
    try {
      if (opts.setBusy) opts.setBusy(true);
      cap = await W.FayzarFaithful.capture(q.slice(), { onProgress: (m) => status(m) });
      ir = await W.FayzarFaithful.layout(cap, q.slice(), { onProgress: (m) => status(m) });
    } catch (e) {
      status('নমুনা পড়া যায়নি: ' + ((e && e.message) || e));
      appendClose();
      return;
    } finally { if (opts.setBusy) opts.setBusy(false); }
    const base = opts.baseName ? opts.baseName() : 'নতুন ছাঁচ';
    const tpl = S.toTemplate(ir, { name: base, thumb: await thumbOf(q[0]), source: { kind: q[0] && q[0].isPdf ? 'pdf' : 'image' } });
    draft = tpl;
    // রেডিমেড-প্রস্তাব
    const text = (cap.blocks || []).map((b) => b.text || '').join('\n');
    const cls = W.DocClassifier ? W.DocClassifier.classify(text) : null;
    const ready = W.FayzarTemplateComposer ? S.suggestReadymade({ docType: cls && cls.type, text, slots: tpl.slots }, W.FayzarTemplateComposer.REGISTRY) : null;
    if (ready) {
      show('<h2 id="mtTitle">রেডিমেড ছাঁচ মিলেছে</h2>' +
        `<p class="rep-sub">নমুনাটি আমাদের রেডিমেড <b>"${esc(ready.label)}"</b> ছাঁচের মতো। রেডিমেড ছাঁচে ফল বেশি নিশ্চিত আর প্রতিবার খরচ কম।</p>` +
        '<div class="rep-actions"><button type="button" class="btn" id="mtUseReady">রেডিমেড ব্যবহার করুন</button>' +
        '<button type="button" class="btn-o" id="mtOwn">না, নিজের ছাঁচই বানাই</button></div>');
      $('mtUseReady').onclick = () => { hide(); if (opts.onReadymade) opts.onReadymade(ready.id); toast(`রেডিমেড ছাঁচ: ${ready.label}`, 'success'); };
      $('mtOwn').onclick = () => preview();
      return;
    }
    preview();
  }
  function appendClose() {
    const m = $('mtModal');
    if (!m) return;
    const d = document.createElement('div'); d.className = 'rep-actions';
    d.innerHTML = '<button type="button" class="link" id="mtCancel">বন্ধ করুন</button>';
    m.appendChild(d); $('mtCancel').onclick = hide;
  }

  /** স্থির/বদলাবে প্রিভিউ */
  function preview() {
    if (!draft) return;
    const rows = draft.slots.filter((s) => !s.twinOf).map((s) => {
      const twin = draft.slots.some((o) => o.twinOf === s.id);
      const label = s.label ? `<b>${esc(s.label)}:</b> ` : '';
      const sample = esc(String(s.sampleText || '').replace(/\n+/g, ' / ').slice(0, 90)) || '<i>ফাঁকা</i>';
      return `<li class="mt-slot mt-${s.role}${s.auto ? ' mt-auto' : ''}" data-slot="${esc(s.id)}">` +
        `<span class="mt-kind">${KIND[s.kind] || s.kind}${twin ? ' ×২' : ''}</span><span class="mt-text">${label}${sample}</span>` +
        `<button type="button" class="mt-role" aria-pressed="${s.role === 'var'}" title="ক্লিকে বদলান">${s.role === 'var' ? 'বদলাবে' : 'স্থির'}</button>` +
        (s.auto === 'letterhead' ? '<small class="mt-tag">প্যাড-মাথা (স্বয়ংক্রিয়)</small>' : '') + '</li>';
    }).join('');
    const nVar = draft.slots.filter((s) => !s.twinOf && s.role === 'var').length;
    show('<h2 id="mtTitle">কোন অংশ বদলাবে?</h2>' +
      '<p class="rep-sub"><span class="mt-dot mt-var"></span>হলুদ = নতুন খসড়ার লেখা বসবে (না পেলে ফাঁকা/"......") · <span class="mt-dot mt-fixed"></span>সাদা = হুবহু থাকবে। ভুল হলে বোতামে ক্লিক করে বদলান।</p>' +
      `<ul class="mt-slots" id="mtSlots">${rows}</ul>` +
      `<p class="mt-count" id="mtCount">${bn(nVar)}টি অংশ বদলাবে</p>` +
      `<label class="ws-label" for="mtName">ছাঁচের নাম</label><input id="mtName" class="field" maxlength="80" value="${esc(draft.name)}">` +
      '<div class="rep-actions"><button type="button" class="btn" id="mtSave">"আমার টেমপ্লেট"-এ সেভ করুন</button><button type="button" class="link" id="mtCancel">বাতিল</button></div>');
    $('mtSlots').addEventListener('click', (e) => {
      const b = e.target.closest('.mt-role');
      if (!b || !draft) return;
      const li = b.closest('[data-slot]');
      const s = draft.slots.find((x) => x.id === li.dataset.slot);
      ST().setRole(draft.slots, s.id, s.role === 'var' ? 'fixed' : 'var');
      li.className = `mt-slot mt-${s.role}`;
      b.textContent = s.role === 'var' ? 'বদলাবে' : 'স্থির';
      b.setAttribute('aria-pressed', String(s.role === 'var'));
      const tag = li.querySelector('.mt-tag'); if (tag) tag.remove();
      $('mtCount').textContent = bn(draft.slots.filter((x) => !x.twinOf && x.role === 'var').length) + 'টি অংশ বদলাবে';
    });
    $('mtCancel').onclick = hide;
    $('mtSave').onclick = async () => {
      try {
        draft.name = $('mtName').value;
        const rec = await Store().save(draft);
        hide();
        await refresh();
        select(rec.id);
        toast(`"${rec.name}" সেভ হলো — এখন খসড়ার পাতা দিয়ে কনভার্ট করুন`, 'success');
      } catch (err) { toast((err && err.message) || String(err), 'error'); }
    };
  }

  // ---------------------------------------------------------------- ব্যবহার (কনভার্ট)
  /**
   * ছাঁচ + খসড়ার OCR-লেখা ⇒ নতুন নকশা (Gemini-ম্যাপ দরকার হলে; ব্যর্থ হলেও চলে) ⇒ line-fit।
   * @returns {Promise<{ ir, report, tpl, remote }>}
   */
  async function composeFromText(text, o) {
    const oo = o || {};
    const id = oo.id || selected;
    const tpl = id && Store() ? await Store().get(id) : null;
    if (!tpl) throw new Error('বাছা ছাঁচটি পাওয়া যায়নি — "আমার টেমপ্লেট" থেকে আবার বাছুন');
    if (oo.onProgress) oo.onProgress('ছাঁচে লেখা বসানো হচ্ছে…', 92);
    const r = await ST().composeAsync(tpl, text, { remote: oo.remote });
    const LF = W.FayzarLineFit, meas = LF ? await textMeasurer() : null;
    if (LF && meas) r.ir.lineFits = LF.fit(r.ir, meas);
    return Object.assign(r, { tpl });
  }
  /** ফলাফলের সতর্কবার্তা (বাংলা) */
  function warnings(report) {
    const out = [];
    (report && report.warnings || []).forEach((w) => {
      if (w.kind === 'blank_slots') out.push(`${bn(w.count)}টি ঘরের তথ্য খসড়ায় পাওয়া যায়নি — ফাঁকা/"......" রাখা হয়েছে`);
      else if (w.kind === 'extras') out.push(`খসড়ার ${bn(w.count)}টি অংশ ছাঁচের কোনো ঘরে মেলেনি — কাছাকাছি জায়গায় যোগ করা হয়েছে`);
      else if (w.kind === 'map_failed') out.push('এআই-মিলানো হয়নি — শুধু লেবেল/ক্রম দেখে বসানো হয়েছে');
    });
    return out;
  }

  let opts = {};
  /**
   * @param o { getQueue(), baseName(), busy(), setBusy(b), onSelect(id, summary), onReadymade(tplId) }
   */
  function mount(o) {
    opts = o || {};
    host = $('myTplBox');
    if (!host || !Store() || !ST()) { if (host) host.hidden = true; return false; }
    host.addEventListener('click', onClick);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('mtModal') && !$('mtModal').hidden) hide(); });
    refresh();
    return true;
  }

  W.FayzarMyTemplateUI = {
    mount, refresh, composeFromText, warnings,
    selectedId: () => selected,
    selected: () => list.find((t) => t.id === selected) || null,
    clear: () => { if (selected) { selected = ''; if (host) paint(); } },
    select: (id) => { selected = id || ''; if (host) paint(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
