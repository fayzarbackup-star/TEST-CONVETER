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
   * @param {object} opts  { onProgress(msg,pct), onStream(text), maxContinuations=3, request (পরীক্ষার জন্য বিকল্প) }
   * @returns {Promise<{ text, blocks, auditNote, issues, truncated, continuations, pages }>}
   */
  async function run(queue, opts) {
    const o = Object.assign({ maxContinuations: 3 }, opts || {});
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
      text = String(await request(key, media, o.onStream || null, Prompt.build({ pageCount })) || '');
      if (!text.trim()) throw new Error('Gemini থেকে কোনো উত্তর আসেনি (খালি) — রূপান্তর বাতিল হয়েছে বা সংযোগ ব্যর্থ');
      while (Tags.needsContinuation(text) && continuations < o.maxContinuations) {
        if (st && !st.isProcessing) break;          // ব্যবহারকারী বাতিল করেছেন
        continuations++;
        const info = Tags.lastBlockInfo(text);
        progress(`উত্তর মাঝপথে থেমেছে — পাতা ${info.lastPage || '?'} থেকে চালিয়ে নেওয়া হচ্ছে (${continuations}/${o.maxContinuations})…`, 70);
        const cont = String(await request(key, media, null, Prompt.continuation(Object.assign({ pageCount }, info))) || '');
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

  const FayzarFaithfulCapture = { run, mediaFromQueue };
  global.FayzarFaithfulCapture = FayzarFaithfulCapture;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarFaithfulCapture;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
