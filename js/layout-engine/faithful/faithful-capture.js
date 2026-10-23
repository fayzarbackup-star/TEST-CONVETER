/**
 * Fayzar — হুবহু-লেআউট ক্যাপচার-চালক (FayzarFaithfulCapture)
 * ==========================================================
 * Part-17.2 (ধাপ ১): ফাইলের সব পাতা একসাথে (ব্যবহারকারীর সিদ্ধান্ত — ভাগ নয়) হুবহু-প্রম্পটে Gemini-তে,
 * চালু OCR-পথ দিয়েই (FayzarAiOcrEngine.executeGeminiRequest → Worker: চাবি-ঘোরানো, চিন্তা-গেট, low চিন্তা)।
 * উত্তর কাটা পড়লে (RECITATION / MAX_TOKENS / অডিট-নোট নেই) — যেখানে থেমেছে সেখান থেকে চালিয়ে-যাওয়া অনুরোধ,
 * সর্বোচ্চ maxContinuations বার; তারপর ট্যাগ-পার্স।
 *
 * প্রশ্নপত্র-মোডের পরিষ্কারক (cleanOcrResponse) এখানে চলে না — হুবহু মোডে কিছুই মোছা/সাজানো হয় না।
 */
(function (global) {
  'use strict';

  const pick = (n) => (typeof global !== 'undefined' && global[n]) || (typeof window !== 'undefined' && window[n]) || null;

  /** filesQueue → Gemini মিডিয়া + পাতার তথ্য (PDF হলে আসল মাপ পয়েন্টে) */
  async function mediaFromQueue(queue, engine) {
    const media = [], pages = [];
    for (const it of queue || []) {
      if (!it) continue;
      let data = it.base64 || '', mimeType = it.mimeType || 'image/jpeg';
      if (!data && it.file && engine && typeof engine.fastOptimizeImageFile === 'function') {
        const r = await engine.fastOptimizeImageFile(it.file);
        data = r.base64; mimeType = r.mimeType;
      }
      if (!data) continue;
      media.push({ data, mimeType, name: it.name });
      pages.push({
        page: pages.length + 1,
        sourcePdfPage: it.pdfPage || null,
        widthPt: it.pageWidthPt || null,
        heightPt: it.pageHeightPt || null,
        isPdfRaw: mimeType === 'application/pdf'
      });
    }
    return { media, pages };
  }

  function activeKey() {
    try {
      const own = typeof localStorage !== 'undefined' && localStorage.getItem('fayzar_ai_ocr_custom_byok');
      if (own) return own.trim();
    } catch (e) { /* ignore */ }
    const C = pick('FayzarOcrConfig');
    return C && typeof C.getActiveApiKey === 'function' ? (C.getActiveApiKey() || '') : '';
  }

  /**
   * @param {Array} queue  FayzarAiOcrEngine.state.filesQueue
   * @param {object} opts  { onProgress(msg,pct), onStream(text), maxContinuations=6, retryWaitMs=20000, request (পরীক্ষার জন্য বিকল্প) }
   * @returns {Promise<{ text, blocks, auditNote, issues, truncated, continuations, pages }>}
   */
  async function run(queue, opts) {
    // বড় ফাইলে (২০ পাতা) কয়েকবার থামতে পারে — তাই ৬; প্রতিবার পুরো ফাইল যায়, প্রসঙ্গ অটুট
    const o = Object.assign({ maxContinuations: 6, retryWaitMs: 20000 }, opts || {});
    const Prompt = pick('FayzarFaithfulPrompt'), Tags = pick('FayzarLayoutTags'), Engine = pick('FayzarAiOcrEngine');
    if (!Prompt || !Tags) throw new Error('হুবহু-মোডের মডিউল লোড হয়নি (faithful-prompt / layout-tags)');
    const request = o.request || (Engine && Engine.executeGeminiRequest);
    if (typeof request !== 'function') throw new Error('OCR-ইঞ্জিন পাওয়া যায়নি');
    const { media, pages } = await mediaFromQueue(queue, Engine);
    if (!media.length) throw new Error('কোনো পাতা পাওয়া যায়নি');
    const pageCount = pages.length;
    const key = activeKey();
    const progress = (m, p) => { if (typeof o.onProgress === 'function') o.onProgress(m, p); };

    // executeGeminiRequest কেবল state.isProcessing=true হলে চলে (বাতিল-বোতামের নিয়ম) — চলাকালীন চালু, শেষে আগের অবস্থা
    const st = !o.request && Engine && Engine.state ? Engine.state : null;
    const wasProcessing = st ? st.isProcessing : null;
    if (st) st.isProcessing = true;
    let text = '', continuations = 0;
    try {
      progress(`হুবহু-লেআউট: ${pageCount}টি পাতা একসাথে Gemini-তে পাঠানো হচ্ছে…`, 40);
      text = String(await request(key, media, o.onStream || null, Prompt.build({ pageCount, designSheet: o.designSheet === true })) || '');
      if (!text.trim()) throw new Error('Gemini থেকে কোনো উত্তর আসেনি (খালি) — রূপান্তর বাতিল হয়েছে বা সংযোগ ব্যর্থ');
      while (Tags.needsContinuation(text) && continuations < o.maxContinuations) {
        if (st && !st.isProcessing) break;          // ব্যবহারকারী বাতিল করেছেন
        continuations++;
        const info = Tags.lastBlockInfo(text);
        progress(`উত্তর মাঝপথে থেমেছে — পাতা ${info.lastPage || '?'} থেকে চালিয়ে নেওয়া হচ্ছে (${continuations}/${o.maxContinuations})…`, 70);
        // G1b: চালিয়ে-যাওয়ার অনুরোধ নিজেই ব্যর্থ হলে (Google 503 ইত্যাদি) এ পর্যন্ত পাওয়া লেখা ফেলে দেওয়া নয় —
        // অপেক্ষা করে আবার (এটিও একটি চেষ্টা হিসেবে গোনা); শেষে still_incomplete
        let cont = '';
        try {
          cont = String(await request(key, media, null, Prompt.continuation(Object.assign({ pageCount, designSheet: o.designSheet === true }, info))) || '');
        } catch (e) {
          progress(`চালিয়ে-যাওয়া ব্যর্থ (${String(e && e.message || e).slice(0, 80)}) — ${o.retryWaitMs / 1000}s পর আবার…`, 70);
          await new Promise(r => setTimeout(r, o.retryWaitMs));
          continue;
        }
        if (!cont.trim()) break;
        text = Tags.mergeContinuation(text, cont);
      }
    } finally {
      if (st) st.isProcessing = wasProcessing;
    }
    const parsed = Tags.parse(text);
    if (parsed.truncated || Tags.needsContinuation(text)) parsed.issues.push({ kind: 'still_incomplete', continuations });
    progress(`হুবহু-লেআউট: ${parsed.blocks.length}টি ব্লক পাওয়া গেছে`, 90);
    return Object.assign({ text, continuations, pages }, parsed);
  }

  /**
   * ২০২৬-১০-১৪ যাচাই-ধাপ (FAITHFUL_PLAN ধাপ ৫): লেখা-ব্লকে Gemini-র লাইন-সংখ্যা ≠ ছবিতে মাপা ছাপা-লাইন ⇒ সেই পাতার ছবিসহ
   * একটি অনুরোধ: "শুধু লাইন-ভাঙা ঠিক করো"। উত্তরের অক্ষর আগের লেখার সাথে না মিললে (Gemini লেখা বদলালে) গ্রহণ নয়।
   * ফেরত repairs = { "<পাতা>|<বক্স>": নতুন লেখা } — ক্যাপচারে রাখা হয় (আবার চালালে Gemini লাগে না)
   */
  const VERIFY_TYPES = /^(paragraph|list_item|question|label_value|other|caption|signature)$/;
  const repairKey = (b) => `${b.page}|${(b.box || []).join(',')}`;
  const sameChars = (a, b) => { const n = (s) => String(s || '').replace(/\s+/g, ''); return n(a) === n(b); };

  function lineMismatches(blocks, measures) {
    const out = [];
    (blocks || []).forEach((b) => {
      if (!b.box || !VERIFY_TYPES.test(b.type)) return;
      const m = measures && measures[b.i];
      if (!m || m.empty || !Array.isArray(m.lines)) return;
      const nG = (b.lines || []).filter((l) => String(l).trim()).length, nM = m.lines.length;
      if (String(b.text || '').replace(/\s+/g, '').length < 25 || !nM || nM > 15 || nG === nM) return;
      out.push({ b, nG, nM });
    });
    return out;
  }

  function applyRepairs(blocks, repairs) {
    let n = 0;
    (blocks || []).forEach((b) => {
      const t = repairs && repairs[repairKey(b)];
      if (t == null || !sameChars(t, b.text)) return;
      b.text = t; b.lines = t.split('\n'); n++;
    });
    return n;
  }

  async function verifyLines(queue, blocks, measures, opts) {
    const o = opts || {};
    const mism = lineMismatches(blocks, measures);
    const repairs = {};
    if (!mism.length) return { repairs, asked: 0, fixed: 0 };
    const Engine = pick('FayzarAiOcrEngine');
    const request = o.request || (Engine && Engine.executeGeminiRequest);
    if (typeof request !== 'function') return { repairs, asked: 0, fixed: 0 };
    const { media } = await mediaFromQueue(queue, Engine);
    const byPage = {};
    mism.forEach((x) => { (byPage[x.b.page] = byPage[x.b.page] || []).push(x); });
    const st = !o.request && Engine && Engine.state ? Engine.state : null;
    const was = st ? st.isProcessing : null;
    if (st) st.isProcessing = true;
    let asked = 0, fixed = 0;
    const why = { same: 0, changed: 0, empty: 0, noParse: 0, failed: 0 };
    try {
      for (const pn of Object.keys(byPage)) {
        const list = byPage[pn], md = media[pn - 1];
        if (!md) continue;
        if (typeof o.onProgress === 'function') o.onProgress(`যাচাই: পাতা ${pn}-এ ${list.length}টি ব্লকের লাইন-ভাঙা আবার পড়া হচ্ছে…`, 75);
        const prompt = [
          'You transcribed this page earlier. For each block listed below, the printed LINE BREAKS in your transcription do not match the page image.',
          'For each block, look ONLY inside its box (normalized 0-1000 coordinates: ymin,xmin,ymax,xmax) and rewrite its text with ONE output line per PRINTED line, breaking at exactly the same words as the print.',
          'Change NOTHING else: same characters, spelling, numerals, punctuation, numbering and markup (**bold**, *italic*, ^{...}, $...$, ⟦...⟧). Only the line breaks may change.',
          'Our image measurement counted the printed lines shown for each block; if the image clearly shows a different number, follow the image.',
          'Output ONLY the blocks in this exact format, nothing else:',
          '[[R:<id>]]', '<line 1>', '<line 2>', '...', '',
          'Blocks:'
        ].concat(list.map((x, k) => `[[R:${k}]] box=${x.b.box.join(',')}; measured printed lines=${x.nM}\n${x.b.text}`)).join('\n');
        let ans = '';
        try { ans = String(await request(activeKey(), [md], null, prompt) || ''); asked++; } catch (e) { why.failed++; why.sample = why.sample || String(e && e.message || e).slice(0, 120); continue; }
        const parts = ans.split(/\[\[\s*R\s*:\s*(\d+)\s*\]\][^\n]*\n?/);
        if (parts.length < 3) { why.noParse++; why.sample = why.sample || ans.slice(0, 160); }
        for (let k = 1; k + 1 < parts.length; k += 2) {
          const x = list[+parts[k]], t = String(parts[k + 1] || '').replace(/^\n+|\s+$/g, '');
          if (!x || !t) { why.empty++; continue; }
          if (!sameChars(t, x.b.text)) { why.changed++; why.sample = why.sample || t.slice(0, 80) + ' ≠ ' + String(x.b.text).slice(0, 80); continue; }   // লেখা বদলেছে ⇒ গ্রহণ নয়
          const nNew = t.split('\n').filter((l) => l.trim()).length;
          if (nNew === x.nG) { why.same++; continue; }
          repairs[repairKey(x.b)] = t; fixed++;
        }
      }
    } finally { if (st) st.isProcessing = was; }
    applyRepairs(blocks, repairs);
    return { repairs, asked, fixed, mismatches: mism.length, why, list: mism.map((x) => `${x.b.page}:${x.b.type}:${x.nG}→${x.nM}`) };
  }

  /**
   * ২০২৬-১০-১৫ ছকের সারি-যাচাই: মাপা আড়া-রেখার ভাগ (hRulesPt, layout-ir rowBandHeights-এর মতো) > Gemini-র সারি ⇒ Gemini সারি বাদ
   * দিয়েছে (a05: ৪টি ফাঁকা সারি) ⇒ সেই পাতার ছবিসহ একটি অনুরোধ: "প্রতি রেখা-ভাগে এক সারি, ফাঁকা সারিও"। ভাগ < সারি = বহু-লাইনের ঘর
   * (a10/f1, IR জোড়া দেয়) ⇒ জিজ্ঞাসা নয়; জোড়া-ঘরের ছক (সারির ঘর-সংখ্যা ভিন্ন: a18/f1) বাদ। ঘরের লেখা ('|' বাদে) না মিললে গ্রহণ নয়।
   * ফেরত tableRepairs = { "<পাতা>|<বক্স>": নতুন লেখা } — আলাদা ক্যাশ (লাইন-মেরামতের repairs আগেই থাকলেও এটি চলে)
   */
  const cellChars = (s) => String(s || '').replace(/[\s|]+/g, '');
  const tableRows = (b) => (b.lines || String(b.text || '').split('\n')).filter((l) => String(l).trim()).map((l) => String(l).split('|'));
  function ruleBands(m) {
    if (!m || m.empty || !m.hasGrid || !Array.isArray(m.hRulesPt)) return 0;
    const H = [];
    m.hRulesPt.slice().sort((a, c) => a - c).forEach((y) => { if (!H.length || y - H[H.length - 1] > 3) H.push(y); });
    let n = 0;
    for (let k = 1; k < H.length; k++) if (H[k] - H[k - 1] >= 4) n++;
    return n;
  }
  // a05: শিরোনাম-সারিতে জোড়া-ঘর ("টাকার অংক" ২ কলাম) — বাকি সারি সমান ⇒ চলবে; ≥৮০% সারির ঘর-সংখ্যা এক (প্রধান সংখ্যা)
  const modalCells = (rows) => { const f = {}; rows.forEach((r) => { f[r.length] = (f[r.length] || 0) + 1; }); return +Object.keys(f).sort((a, c) => f[c] - f[a])[0]; };
  const mostlyUniform = (rows) => { const k = modalCells(rows); return rows.filter((r) => r.length === k).length >= rows.length * 0.8; };

  function tableMismatches(blocks, measures) {
    const out = [];
    (blocks || []).forEach((b) => {
      if (b.type !== 'table' || !b.box) return;
      const rows = tableRows(b), nB = ruleBands(measures && measures[b.i]);
      if (rows.length < 2 || nB < 3 || nB <= rows.length || nB - rows.length > Math.max(6, rows.length)) return;
      if (!mostlyUniform(rows)) return;
      out.push({ b, nG: rows.length, nM: nB });
    });
    return out;
  }

  function applyTableRepairs(blocks, repairs) {
    let n = 0;
    (blocks || []).forEach((b) => {
      const t = b.type === 'table' && repairs && repairs[repairKey(b)];
      if (!t || cellChars(t) !== cellChars(b.text)) return;
      b.text = t; b.lines = t.split('\n'); n++;
    });
    return n;
  }

  async function verifyTables(queue, blocks, measures, opts) {
    const o = opts || {};
    const mism = tableMismatches(blocks, measures);
    const repairs = {};
    if (!mism.length) return { repairs, asked: 0, fixed: 0, mismatches: 0 };
    const Engine = pick('FayzarAiOcrEngine');
    const request = o.request || (Engine && Engine.executeGeminiRequest);
    if (typeof request !== 'function') return { repairs, asked: 0, fixed: 0, mismatches: mism.length };
    const { media } = await mediaFromQueue(queue, Engine);
    const byPage = {};
    mism.forEach((x) => { (byPage[x.b.page] = byPage[x.b.page] || []).push(x); });
    const st = !o.request && Engine && Engine.state ? Engine.state : null;
    const was = st ? st.isProcessing : null;
    if (st) st.isProcessing = true;
    let asked = 0, fixed = 0;
    const why = { same: 0, changed: 0, empty: 0, noParse: 0, failed: 0, worse: 0 };
    try {
      for (const pn of Object.keys(byPage)) {
        const list = byPage[pn], md = media[pn - 1];
        if (!md) continue;
        if (typeof o.onProgress === 'function') o.onProgress(`যাচাই: পাতা ${pn}-এ ${list.length}টি ছকের সারি আবার পড়া হচ্ছে…`, 76);
        // a05 প্রথম চেষ্টা: পুরো ছক আবার লিখতে বললে Gemini শিরোনামের জোড়া-ঘর দুবার লিখল ⇒ লেখা বদল ⇒ বাতিল।
        // তাই লেখা নয় — শুধু কোন সারির পরে ফাঁকা সারি বসবে (সংখ্যা); সারি আমরা নিজেরা বসাই, ঘরের লেখা অটুট
        const prompt = [
          'You transcribed this page earlier. For each TABLE listed below, your transcription has FEWER rows than the ruled rows printed in the image',
          '(box in normalized 0-1000 coordinates: ymin,xmin,ymax,xmax; our image measurement counted the horizontally ruled row bands).',
          'The usual cause: EMPTY ruled rows (blank rows for writing, or rows with no text) were skipped. Compare the numbered rows below with the image.',
          'For each table, answer with the row numbers AFTER which one empty ruled row must be inserted (0 = before row 1). Repeat a number for several empty rows in a row.',
          'Do NOT rewrite any text. If no empty row is missing, answer "none". If the image clearly shows a different number of ruled rows than measured, follow the image.',
          'Output ONLY lines in this exact format, nothing else:',
          '[[T:<id>]] <n>,<n>,...',
          'Tables:'
        ].concat(list.map((x, k) => `[[T:${k}]] box=${x.b.box.join(',')}; your rows=${x.nG}; measured ruled rows=${x.nM}\n` +
          (x.b.lines || []).filter((l) => String(l).trim()).map((l, j) => `${j + 1}. ${l}`).join('\n'))).join('\n');
        let ans = '';
        try { ans = String(await request(activeKey(), [md], null, prompt) || ''); asked++; } catch (e) { why.failed++; why.sample = why.sample || String(e && e.message || e).slice(0, 120); continue; }
        const parts = ans.split(/\[\[\s*T\s*:\s*(\d+)\s*\]\]/);
        if (parts.length < 3) { why.noParse++; why.sample = why.sample || ans.slice(0, 160); }
        for (let k = 1; k + 1 < parts.length; k += 2) {
          const x = list[+parts[k]], s = String(parts[k + 1] || '').split('\n')[0];
          if (!x) { why.empty++; continue; }
          const at = (s.match(/\d+/g) || []).map(Number);
          if (!at.length) { why.same++; continue; }
          const lines = (x.b.lines || []).filter((l) => String(l).trim());
          if (at.some((n) => n > lines.length)) { why.changed++; why.sample = why.sample || s.slice(0, 80); continue; }
          // সারি বেড়ে মাপা ভাগের কাছে এসেছে ⇒ গ্রহণ (বেশি বসানো বা দূরে সরে যাওয়া নয়)
          if (Math.abs(lines.length + at.length - x.nM) >= Math.abs(x.nG - x.nM)) { why.worse++; why.sample = why.sample || s.slice(0, 80); continue; }
          const blank = Array(modalCells(tableRows(x.b))).fill(' ').join('|');
          const out = [];
          for (let j = 0; j <= lines.length; j++) {
            at.filter((n) => n === j).forEach(() => out.push(blank));
            if (j < lines.length) out.push(lines[j]);
          }
          repairs[repairKey(x.b)] = out.join('\n'); fixed++;
        }
      }
    } finally { if (st) st.isProcessing = was; }
    applyTableRepairs(blocks, repairs);
    return { repairs, asked, fixed, mismatches: mism.length, why, list: mism.map((x) => `${x.b.page}:table:${x.nG}→${x.nM}`) };
  }

  const FayzarFaithfulCapture = { run, mediaFromQueue, lineMismatches, verifyLines, applyRepairs, repairKey, ruleBands, tableMismatches, applyTableRepairs, verifyTables };
  global.FayzarFaithfulCapture = FayzarFaithfulCapture;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarFaithfulCapture;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
