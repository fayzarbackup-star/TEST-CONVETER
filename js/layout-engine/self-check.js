/**
 * Fayzar — স্ব-যাচাই (Phase 3): তৈরি .docx-এর document.xml পড়ে চেক c1–c9 চালায় — Gemini লাগে না।
 * ==========================================================================================
 * selfCheck(docxXmlOrModel, sourceText, opts) → { pass, checks:{c1,c2,c3,c5,c6,c7,c8,c9}, errors:[বাংলা ছোট বার্তা] }
 *   docxXmlOrModel: document.xml-এর স্ট্রিং, বা { documentXml, stylesXml }
 *   sourceText    : OCR Markdown (c1 শব্দ-মিল; না দিলে c1 বাদ)
 *   opts          : { expected:{tables,orientation,digits,docType}, stylesXml, docType, orientation, digits }
 *                   expected না দিলে c3-এর প্রত্যাশা sourceText-এর Markdown ছক থেকে নেওয়া হয়
 * computeChecks(docXml, stylesXml, exp, sourceText) — qa/usability-score.mjs-ও এটাই ব্যবহার করে (কোড একটাই)।
 * showNotice(errors) — ব্রাউজারে ছোট বিজ্ঞপ্তি-প্যানেল (ডাউনলোড আটকায় না)।
 * ব্রাউজার ও Node দুটোতেই চলে; কোনো বাইরের লাইব্রেরি নেই।
 */
(function (global) {
  'use strict';

  const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const T_RE = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  const wtText = (xml) => [...xml.matchAll(T_RE)].map((m) => decode(m[1])).join(' ');   // রান-ভিত্তিক (c5)

  // একই অনুচ্ছেদের পাশাপাশি w:t রান জোড়া লাগে (হাইফেন/স্ল্যাশ/অঙ্কে রান-ভাঙা শব্দ-ত্রুটি নয়)
  function paraText(p) {
    let out = '';
    for (const m of p.matchAll(/<[wm]:t(?:\s[^>]*)?>([\s\S]*?)<\/[wm]:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>|<w:cr\b[^>]*\/>/g)) {
      out += m[1] !== undefined ? decode(m[1]) : ' ';
    }
    return out;
  }
  function joinedText(xml) {
    const ps = xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g);
    if (!ps) return wtText(xml);
    return ps.map(paraText).join(' ');
  }

  const bnDigits = /[০-৯]/;
  const enDigits = /[0-9]/;
  const PLACEHOLDERS = ['আপনার প্রতিষ্ঠান', 'ঠিকানা লিখুন', 'পরীক্ষার নাম লিখুন'];
  const normWord = (w) => w.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').normalize('NFC');

  const MESSAGES = {
    c1: 'কিছু লেখা ফাইলে বাদ পড়েছে বা বদলে গেছে',
    c2: 'ভাসমান বক্স/ফ্রেম আছে — Word-এ জায়গা এলোমেলো হতে পারে',
    c3: 'ছকের (টেবিল) সংখ্যা বা মাপ মূল লেখার সাথে মিলছে না',
    c5: 'লেখা বেশি ছোট (১০pt-এর নিচে) হয়ে গেছে',
    c6: 'লম্বা ছক বা প্রথম ছক পাতা ভাঙার সমস্যা তৈরি করছে',
    c7: 'নমুনা-হেডারের ফাঁকা লেখা ("ঠিকানা লিখুন" ইত্যাদি) রয়ে গেছে',
    c8: 'পাতার দিক (লম্বালম্বি/আড়াআড়ি) মিলছে না',
    c9: 'ছকের ভেতর সংখ্যার ধরন (বাংলা/ইংরেজি) মিলছে না'
  };

  // ---------- c1 উৎস ----------
  function sourceWords(sourceText) {
    const t = String(sourceText).replace(/^---[\s\S]*?\n---\s*\n/, '').replace(/[ \t]*<!--\s*r:[A-Za-z,\s]+?-->/g, '');
    const lines = t.split(/\r?\n/).filter((l) => {
      const s = l.trim();
      if (!s) return false;
      if (/^\|?[\s:|-]+\|?$/.test(s)) return false;
      if (/^[\d০-৯\s.\-–—]+$/.test(s)) return false;
      if (/\[\[B:t=(stamp|header|page_number)/.test(s)) return false;
      if (PLACEHOLDERS.some((p) => s.includes(p))) return false;
      return true;
    });
    return lines.join(' ')
      .replace(/^#+\s*/gm, '')
      .replace(/\$[^$]*\$/g, ' ')
      .replace(/\*\*|__|\||⟦[^⟧]*⟧|\.{3,}/g, ' ')
      .split(/\s+/).map(normWord).filter((w) => w && /[\p{L}\p{N}]/u.test(w));
  }

  // ---------- টেবিল ----------
  function topTables(xml) {
    const out = [];
    const re = /<w:tbl>|<w:tbl\s|<\/w:tbl>/g;
    let depth = 0, start = -1, m;
    while ((m = re.exec(xml))) {
      if (m[0].startsWith('</')) {
        depth--;
        if (depth === 0) out.push(xml.slice(start, m.index + m[0].length));
      } else {
        if (depth === 0) start = m.index;
        depth++;
      }
    }
    return out;
  }
  const hasRealBorder = (s) => [...s.matchAll(/w:val="(\w+)"/g)].some((m) => !/^(nil|none)$/.test(m[1]));
  // লেআউট-ছক = সব বর্ডার nil/none (যেমন পাশাপাশি বসানোর ২-ঘরের ছক); c3 এগুলো গোনে না
  function isLayoutTable(xml) {
    const pr = xml.match(/<w:tblPr>[\s\S]*?<\/w:tblPr>/);   // বাইরের ছকের নিজের tblPr-এ লেআউট-চিহ্ন থাকলে গোনা হবে না
    if (pr && /<w:tblCaption\s+w:val="fz-layout"\s*\/>/.test(pr[0])) return true;
    const tb = xml.match(/<w:tblBorders>[\s\S]*?<\/w:tblBorders>/);
    const tc = xml.match(/<w:tcBorders>[\s\S]*?<\/w:tcBorders>/g) || [];
    if (tb && hasRealBorder(tb[0])) return false;
    if (tc.some(hasRealBorder)) return false;
    return !!tb || !/<w:tblStyle\b/.test(xml);
  }
  function parseTables(docXml) {
    return topTables(docXml).map((x) => {
      const rows = x.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || [];
      const grid = (x.match(/<w:gridCol\b/g) || []).length;
      const tcMax = Math.max(0, ...rows.map((r) => (r.match(/<w:tc>|<w:tc\s/g) || []).length));
      return { xml: x, rows, nrows: rows.length, ncols: grid || tcMax, layout: isLayoutTable(x) };
    });
  }

  // Markdown ছক থেকে প্রত্যাশা (expected.json না থাকলে)
  function mdTables(sourceText) {
    const out = [];
    let cur = null;
    for (const line of String(sourceText || '').split(/\r?\n/)) {
      const s = line.trim();
      if (s.startsWith('|') && s.indexOf('|', 1) > 0) {
        if (!cur) cur = { rows: 0, cols: 0, sep: false };
        if (/^\|?[\s:|-]+\|?$/.test(s)) { cur.sep = true; continue; }
        cur.rows++;
        if (!cur.cols) cur.cols = s.replace(/^\||\|$/g, '').split('|').length;
      } else if (cur) { if (cur.sep) out.push({ rows: cur.rows, cols: cur.cols }); cur = null; }
    }
    if (cur && cur.sep) out.push({ rows: cur.rows, cols: cur.cols });
    return out;
  }

  // ---------- চেকগুলো ----------
  function computeChecks(docXml, stylesXml, exp, sourceText) {
    exp = exp || {};
    stylesXml = stylesXml || '';
    const allText = joinedText(docXml);
    const tables = parseTables(docXml);

    function c1() {
      if (sourceText === undefined || sourceText === null || sourceText === '') return { pass: true, value: 'skipped (no ocr-text.md)' };
      const words = sourceWords(sourceText);
      if (!words.length) return { pass: true, value: 'skipped (no words)' };
      const have = new Set(allText.split(/\s+/).map(normWord));
      const hay = allText.normalize('NFC');
      const hit = words.filter((w) => have.has(w) || hay.includes(w)).length;
      const r = hit / words.length;
      return { pass: r >= 0.97, value: +r.toFixed(4) };
    }
    function c2() {
      const n = (docXml.match(/<w:framePr\b/g) || []).length + (docXml.match(/<w:tblpPr\b/g) || []).length;
      return { pass: n === 0, value: n };
    }
    function c3() {
      if (!Array.isArray(exp.tables)) return { pass: true, value: 'skipped' };
      const real = tables.filter((t) => !t.layout);
      const val = { expected: exp.tables.map((t) => `${t.rows}x${t.cols}`), got: real.map((t) => `${t.nrows}x${t.ncols}`) };
      let pass = real.length === exp.tables.length;
      if (pass) exp.tables.forEach((e, i) => {
        if (Math.abs(e.rows - real[i].nrows) > 1 || Math.abs(e.cols - real[i].ncols) > 1) pass = false;
      });
      return { pass, value: val };
    }
    function c5() {
      let defSz = 20;
      const dd = stylesXml.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/);
      const dm = dd && dd[0].match(/<w:sz w:val="(\d+)"/);
      if (dm) defSz = +dm[1];
      const hist = {};
      let min = Infinity;
      for (const m of docXml.matchAll(/<w:r[\s>][\s\S]*?<\/w:r>/g)) {
        const txt = wtText(m[0]).trim();
        if (!txt) continue;
        const sm = m[0].match(/<w:rPr>[\s\S]*?<w:sz w:val="(\d+)"/);
        const sz = sm ? +sm[1] : defSz;
        hist[sz] = (hist[sz] || 0) + txt.length;
        if (sz < min) min = sz;
      }
      const mode = +Object.entries(hist).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      if (mode === null) return { pass: false, value: 'no text runs' };
      return { pass: mode >= 20 && min >= 18, value: { mode, min } };
    }
    function c6() {
      const bad = [];
      let stat = { rows: 0, rowsWithKeepNext: 0 };
      tables.forEach((t, i) => {
        if (t.nrows <= 15) return;
        const kn = t.rows.filter((r) => /<w:keepNext\b/.test(r)).length;
        if (kn > stat.rowsWithKeepNext || !stat.rows) stat = { rows: t.nrows, rowsWithKeepNext: kn };
        if (kn / t.nrows > 0.5) bad.push(`table${i + 1}:keepNext-on-${kn}-of-${t.nrows}-rows`);
      });
      if (tables.length) {
        const first = docXml.indexOf(tables[0].xml.slice(0, 40));
        const before = docXml.slice(0, first);
        const pbs = [...before.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)];
        const last = pbs[pbs.length - 1];
        if (last && /<w:pageBreakBefore\b|<w:br\b[^>]*w:type="page"/.test(last[0])) bad.push('page-break-before-first-table');
        if (/<w:pageBreakBefore\b/.test(tables[0].xml.slice(0, 600))) bad.push('pageBreakBefore-in-first-table');
      }
      return { pass: bad.length === 0, value: Object.assign({}, stat, { issues: bad }) };
    }
    function c7() {
      const found = PLACEHOLDERS.filter((p) => allText.includes(p));
      const isExam = String(exp.docType || '').startsWith('EXAM');
      return { pass: isExam || found.length === 0, value: found.length ? found : 'none' };
    }
    function c8() {
      if (!exp.orientation) return { pass: true, value: 'skipped' };
      const m = docXml.match(/<w:pgSz\b[^>]*>/);
      if (!m) return { pass: false, value: 'no pgSz' };
      const w = +(m[0].match(/w:w="(\d+)"/) || [])[1], h = +(m[0].match(/w:h="(\d+)"/) || [])[1];
      const orient = /w:orient="landscape"/.test(m[0]) || w > h ? 'landscape' : 'portrait';
      return { pass: orient === exp.orientation, value: orient };
    }
    function c9() {
      if (!exp.digits) return { pass: true, value: 'skipped' };
      const cells = tables.flatMap((t) => t.xml.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || []).map(wtText).join(' ');
      const wrong = exp.digits === 'english' ? bnDigits.test(cells) : enDigits.test(cells);
      return { pass: !wrong, value: wrong ? `wrong-digits-in-cells(${exp.digits})` : 'ok' };
    }
    return { c1: c1(), c2: c2(), c3: c3(), c5: c5(), c6: c6(), c7: c7(), c8: c8(), c9: c9() };
  }

  function selfCheck(input, sourceText, opts) {
    const o = opts || {};
    const docXml = typeof input === 'string' ? input : String((input && (input.documentXml || input.docXml)) || '');
    const stylesXml = o.stylesXml || (input && typeof input === 'object' && input.stylesXml) || '';
    const exp = Object.assign({}, o.expected || {});
    if (!exp.docType && o.docType) exp.docType = o.docType;
    if (!exp.orientation && o.orientation) exp.orientation = o.orientation;
    if (!exp.digits && o.digits) exp.digits = o.digits;
    if (!Array.isArray(exp.tables) && sourceText) exp.tables = mdTables(sourceText);
    const checks = computeChecks(docXml, stylesXml, exp, sourceText);
    // opts.only: শুধু এই চেকগুলো গোনা হবে (বাকিগুলো দেখানো হয়, কিন্তু ফলাফলে "বাদ")
    if (Array.isArray(o.only)) Object.keys(checks).forEach((k) => { if (o.only.indexOf(k) < 0) checks[k] = { pass: true, value: 'ignored (opts.only)' }; });
    const errors = Object.keys(checks).filter((k) => !checks[k].pass).map((k) => MESSAGES[k]);
    return { pass: errors.length === 0, checks, errors, passed: Object.keys(checks).filter((k) => checks[k].pass).length };
  }

  // ব্রাউজারে ছোট বিজ্ঞপ্তি — ডাউনলোড আটকায় না, ✕ দিয়ে বন্ধ হয়
  function showNotice(errors) {
    try {
      if (typeof document === 'undefined' || !errors || !errors.length) return false;
      let box = document.getElementById('fz-selfcheck-notice');
      if (!box) {
        box = document.createElement('div');
        box.id = 'fz-selfcheck-notice';
        box.setAttribute('role', 'status');
        box.style.cssText = 'position:fixed;left:16px;bottom:16px;max-width:420px;z-index:99999;background:#fff8e1;color:#5d4037;border:1px solid #ffb300;border-radius:8px;padding:10px 14px;font:14px/1.5 sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.25)';
        document.body.appendChild(box);
      }
      box.innerHTML = '';
      const head = document.createElement('div');
      head.style.cssText = 'font-weight:bold;margin-bottom:4px';
      head.textContent = 'ফাইলটি ডাউনলোড হয়েছে, তবে Word-এ একবার দেখে নিন:';
      const close = document.createElement('span');
      close.textContent = ' ✕';
      close.style.cssText = 'cursor:pointer;float:right';
      close.onclick = () => box.remove();
      head.appendChild(close);
      box.appendChild(head);
      const ul = document.createElement('ul');
      ul.style.cssText = 'margin:0;padding-left:18px';
      errors.forEach((e) => { const li = document.createElement('li'); li.textContent = e; ul.appendChild(li); });
      box.appendChild(ul);
      return true;
    } catch (e) { return false; }
  }

  const FayzarSelfCheck = { selfCheck, computeChecks, showNotice, mdTables, joinedText, isLayoutTable, MESSAGES };
  global.FayzarSelfCheck = FayzarSelfCheck;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarSelfCheck;
})(typeof globalThis !== 'undefined' ? globalThis : this);
