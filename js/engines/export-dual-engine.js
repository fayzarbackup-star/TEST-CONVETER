/**
 * Fayzar Publishing Studio - Multi-Format Export Engine v4.0
 * Supports:
 *  1. Word 2003 (.doc) - বিজয় ৫০ (SutonnyMJ ANSI RTF)
 *  2. Word 2003 (.doc) - ইউনিকোড (Kalpurush Unicode RTF with \uN? escapes)
 *  3. আধুনিক Word (.docx) - ইউনিকোড (Word 2007-2024 / Office 365 OpenXML)
 *  4. আধুনিক Word (.docx) - বিজয় ৫০ (Word 2007-2024 / Office 365 SutonnyMJ)
 *  5. ভেক্টর PDF / প্রিন্ট (Vector PDF Browser Engine)
 */

(function (global) {
  'use strict';

  /** Part-8a: OCR-আর্টিফ্যাক্ট পরিষ্কার — পৃষ্ঠা-মার্কার (=...=) ও MANIFEST লাইন বাদ।
   *  কভারেজ-গার্ড আগে চলে (ক্লায়েন্ট), তাই যাচাই অটুট থাকে; আউটপুট ডকুমেন্টে মার্কার যায় না। */
  function stripOcrArtifacts(text) {
    if (!text) return text;
    let out = String(text);
    // ১) সম্পূর্ণ মার্কার — ===== পৃষ্ঠা ১/৪৬ ===== (যেকোনো =, স্পেস, বাংলা/ইংরেজি অঙ্ক, ইনলাইন-ও)
    out = out.replace(/[ \t]*={2,}[ \t]*পৃষ্ঠা[ \t]*[০-৯0-9]+(?:[ \t]*\/[ \t]*[০-৯0-9]+)?[ \t]*={2,}[ \t]*/g, '');
    // ২) আংশিক/ভাঙা মার্কার — একপাশে = ছাড়া, লাইন-শেষে
    out = out.replace(/[ \t]*={2,}[ \t]*পৃষ্ঠা[ \t]*[০-৯0-9]+(?:[ \t]*\/[ \t]*[০-৯0-9]+)?[ \t]*(?=\r?\n|$)/gm, '');
    out = out.replace(/[ \t]*পৃষ্ঠা[ \t]*[০-৯0-9]+[ \t]*\/[ \t]*[০-৯0-9]+[ \t]*={2,}[ \t]*/g, '');
    // ৩) কভারেজ MANIFEST লাইন
    out = out.replace(/^[ \t]*MANIFEST\s*[:\uFF1A][^\r\n]*/gm, '');
    // ৩.৫) Part-9d: মার্কডাউন হেডিং-চিহ্ন (`##`, `###`) লিক বন্ধ — শুধু সেগমেন্ট-হেডিং লাইনে,
    //      প্রশ্ন-নম্বর দিয়ে শুরু হওয়া লাইনে নয় (সেখানে পার্সার নিজেই `#` সামলায়)।
    //      OCR `## উদাহরণ ২৯।` জাতীয় লাইন দিলে আগে `##` প্রিন্ট হয়ে যেত।
    out = out.replace(/^[ \t]*#{1,6}[ \t]*(?![\u09E6-\u09EF\d]+[।.)])/gm, '');
    // ৪) খালি লাইন জমলে দুইয়ে নামানো (লাইন-এন্ডিং অপরিবর্তিত)
    const nl = out.indexOf('\r\n') !== -1 ? '\r\n' : '\n';
    out = out.replace(/(?:\r?\n){3,}/g, nl + nl);
    return out;
  }

  const ExportDualEngine = {

    /**
     * Helper to determine if target font is Bijoy (SutonnyMJ) or Unicode (Kalpurush).
     */
    isBijoyFont(options = {}) {
      if (!options || !options.font) return false; // default to Unicode unless specified
      const f = String(options.font).toLowerCase();
      return f.includes('bijoy') || f.includes('sutonny');
    },

    /**
     * Helper to convert Unicode Bengali text to Bijoy ANSI (SutonnyMJ).
     */
    toBijoy(text) {
      if (!text) return '';
      let engine = null;
      if (typeof global !== 'undefined' && global.BanglaConverter) {
        engine = global.BanglaConverter;
      } else if (typeof window !== 'undefined' && window.BanglaConverter) {
        engine = window.BanglaConverter;
      } else if (typeof require === 'function') {
        try {
          const fs = require('fs');
          const path = require('path');
          const vm = require('vm');
          const p = path.resolve(__dirname, '../bangla-converter-engine.js');
          if (fs.existsSync(p)) {
            const code = fs.readFileSync(p, 'utf8');
            const sandbox = { window: {}, console: console };
            vm.createContext(sandbox);
            vm.runInContext(code, sandbox);
            engine = sandbox.BanglaConverter || sandbox.window.BanglaConverter;
          }
        } catch (e) { }
      }
      return engine ? engine.unicodeToBijoy(String(text)) : String(text);
    },

    /**
     * Escapes text for Bijoy ANSI RTF.
     */
    escapeRtf(text) {
      if (!text) return '';
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code < 128) {
          if (text[i] === '\\') out += '\\\\';
          else if (text[i] === '{') out += '\\{';
          else if (text[i] === '}') out += '\\}';
          else out += text[i];
        } else {
          out += '\\u' + code + '?';
        }
      }
      return out;
    },

    /**
     * Escapes text for Unicode RTF (Standard 16-bit signed escapes for Word 2003-365).
     */
    escapeUnicodeRtf(text) {
      if (!text) return '';
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code < 128) {
          if (text[i] === '\\') out += '\\\\';
          else if (text[i] === '{') out += '\\{';
          else if (text[i] === '}') out += '\\}';
          else out += text[i];
        } else {
          const signed = code > 32767 ? code - 65536 : code;
          out += '\\u' + signed + '?';
        }
      }
      return out;
    },

    _getTextRunProcessor() {
      if (typeof TextRunProcessor !== 'undefined') return TextRunProcessor;
      if (typeof window !== 'undefined' && window.TextRunProcessor) return window.TextRunProcessor;
      if (typeof globalThis !== 'undefined' && globalThis.TextRunProcessor) return globalThis.TextRunProcessor;
      if (typeof global !== 'undefined' && global.TextRunProcessor) return global.TextRunProcessor;
      if (typeof require === 'function') {
        try {
          return require('../layout-engine/text-run-processor.js');
        } catch (e) {
          try {
            return require('./text-run-processor.js');
          } catch (e2) {}
        }
      }
      return null;
    },

    /**
     * Part-10: MCQ মাস্টার লেআউট প্ল্যানার রেজলভার (ব্রাউজার/নোড দুই পরিবেশেই)।
     * এটি শুধু জ্যামিতি প্ল্যান পড়ে — কোনো ফ্রোজেন কনভার্সন পাথ পরিবর্তন করে না।
     */
    _getMcqPlanner() {
      if (typeof McqLayoutPlanner !== 'undefined') return McqLayoutPlanner;
      if (typeof window !== 'undefined' && window.McqLayoutPlanner) return window.McqLayoutPlanner;
      if (typeof globalThis !== 'undefined' && globalThis.McqLayoutPlanner) return globalThis.McqLayoutPlanner;
      if (typeof global !== 'undefined' && global.McqLayoutPlanner) return global.McqLayoutPlanner;
      if (typeof require === 'function') {
        try {
          return require('../layout-engine/mcq-layout-planner.js');
        } catch (e) {
          try {
            return require('./mcq-layout-planner.js');
          } catch (e2) {}
        }
      }
      return null;
    },

    /**
     * Part-10: Geometry Plan নির্ধারণ। প্ল্যানার যেকোনো কারণে অনুপলব্ধ হলেও
     * কখনো null রিটার্ন করে না — নিচের ন্যূনতম ফলব্যাক প্ল্যান চলে, ফলে
     * প্রশ্নপত্র রেন্ডার বন্ধ হয় না (লেআউট ভাঙার ঝুঁকি শূন্য)।
     */
    _mcqPlan(parsedData, options = {}, docType = 'EXAM_MCQ') {
      const planner = this._getMcqPlanner();
      if (planner && typeof planner.plan === 'function') {
        try {
          const p = planner.plan(parsedData, {
            docType,
            margin: options.margin || 0.5,
            colSep: options.colSep !== false,
            columnGap: options.columnGap || options.colGapInches || 0.2,
            forceSz: options.forceSz,
            layoutMode: options.layoutMode || 'AUTO',
            lineFactor: options.lineFactor,
            baseSz: options.baseSz,
            maxShrinkOverflow: options.maxShrinkOverflow,
            forceMargin: !!options.forceMargin   // Part-10 পিন তুলে UI-মার্জিন চাইলে (ট্রায়াজ ২)
          });
          if (p && p.geometry && Array.isArray(p.pages) && Array.isArray(p.items)) return p;
        } catch (e) {
          /* ন্যূনতম ফলব্যাক প্ল্যান নিচে */
        }
      }
      return this._mcqPlanFallback(parsedData, options);
    },

    /** Part-10: প্ল্যানার ছাড়াও সমতুল্য কাঠামো — হেডার ফলব্যাক + ২-কলাম + ২-অ্যাক্রস অপশন */
    _mcqPlanFallback(parsedData, options = {}) {
      const G = {
        pageW: 11906, pageH: 16838, margin: 720, cols: 2, colGap: 288, colSep: true,
        indent: 432, lineFactor: 1.34, headerLineFactor: 1.28, baseSz: 24
      };
      // Part-12: 'narrow'/'normal' জাতীয় UI-নামও ধরা হয় (NaN কখনো বসে না)
      if (options.margin !== undefined && options.margin !== null && options.margin !== '') {
        G.margin = global.FayzarLayoutUnits ? global.FayzarLayoutUnits.margin(options.margin, G.margin)
          : (Math.round(parseFloat(options.margin) * 1440) || G.margin);
      }
      G.usableW = G.pageW - 2 * G.margin;
      G.usableH = G.pageH - 2 * G.margin;
      G.colW = Math.floor((G.usableW - G.colGap * (G.cols - 1)) / G.cols);
      G.textW = G.colW - G.indent;

      const h = (parsedData && parsedData.header) || {};
      const headerLines = [
        { kind: 'institute', text: h.institute || 'আপনার প্রতিষ্ঠান এর নাম', align: 'center', bold: true, sizeDelta: 8 },
        { kind: 'location', text: h.location || 'ঠিকানা লিখুন', align: 'center', bold: false, sizeDelta: 0 },
        { kind: 'exam', text: h.exam || 'পরীক্ষার নাম লিখুন', align: 'center', bold: true, sizeDelta: 2 },
        { kind: 'classSubject', text: h.classAndSubject || '', align: 'center', bold: false, sizeDelta: 0 },
        { kind: 'metrics', text: h.time ? 'সময়: ' + h.time : '', right: h.marks ? 'পূর্ণমানঃ ' + h.marks : '', center: h.examType || '', align: 'left', bold: true, sizeDelta: 0 }
      ].filter((l) => l.text || l.right || l.center);
      if (h.instructions) headerLines.push({ kind: 'instructions', text: h.instructions, align: 'center', italic: true, sizeDelta: -2 });

      const qs = [];
      for (const sec of ((parsedData && parsedData.sections) || [])) {
        for (const q of (sec.questions || [])) qs.push(q);
      }
      const lineH = Math.round((G.baseSz / 2) * 20 * G.lineFactor);
      const items = qs.map((q, i) => {
        const count = (q.options || []).length;
        const cols = count >= 4 ? 2 : (count > 0 ? count : 0);
        const slotW = cols ? Math.floor(G.textW / cols) : 0;
        const stops = [];
        for (let k = 1; k < cols; k++) stops.push(G.indent + slotW * k);
        const rows = [];
        for (let x = 0; x < count; x += Math.max(1, cols)) {
          const row = [];
          for (let j = x; j < Math.min(x + Math.max(1, cols), count); j++) row.push(j);
          rows.push(row);
        }
        const stemLines = Math.max(1, Math.ceil(((String(q.num || '').length + 2 + String(q.text || '').length) * G.baseSz * 10) / (G.textW * 0.6)));
        const lines = Math.max(2, stemLines + rows.length);
        return { index: i, q, grid: { cols, rows, stops, slotW, widest: 0 }, stemLines, parts: {}, lines, height: lines * lineH + 20 };
      });

      const headH = headerLines.length * lineH + 60;
      const half = Math.ceil(items.length / 2);
      return {
        version: 'fallback',
        docType: 'EXAM_MCQ',
        geometry: G,
        headerLines,
        divider: true,
        font: { sz: G.baseSz, pt: G.baseSz / 2, shrunk: false, shrinkAttempted: 0 },
        metrics: { lineH, headerHeight: headH, cap1: G.usableH - headH, totalQuestions: items.length, overflowCount: 0, singlePage: true, pages: 1 },
        items,
        pages: [{ page: 1, col1: items.slice(0, half).map((it) => it.index), col2: items.slice(half).map((it) => it.index), h1: 0, h2: 0 }],
        forceOneLineOptions: false,
        forceTwoLineOptions: false,
        forceOnePage: false
      };
    },
    /**
     * Formats text for RTF based on font option with dynamic font switching for English/Math.
     */
    formatRtfText(text, options = {}) {
      if (!text) return '';
      const isBijoy = this.isBijoyFont(options);
      const trp = this._getTextRunProcessor();
      if (!trp) {
        return isBijoy ? this.escapeRtf(this.toBijoy(text)) : this.escapeUnicodeRtf(text);
      }

      // Pre-normalize common OCR Roman numeral confusions (র, রর, ররর)
      let norm = String(text)
        .replace(/(^|[\s,(])ররর(?=[\s,.)]|$)/g, '$1iii')
        .replace(/(^|[\s,(])রর(?=[\s,.)]|$)/g, '$1ii')
        .replace(/(^|[\s,(])র(?=[\s,.)]|$)/g, '$1i')
        .replace(/^ররর\./g, 'iii.')
        .replace(/^রর\./g, 'ii.')
        .replace(/^র\./g, 'i.');

      const runs = this._collapseRunGaps(trp.processTextRuns(norm, { isBijoy, generateOmml: false }));
      if (!runs || runs.length === 0) return '';

      let out = '';
      for (const run of runs) {
        if (run.type === 'math') {
          const rawLatex = run.cleanLatex || run.value || '';
          const _EqC = (typeof EquationConverter !== 'undefined') ? EquationConverter
            : (typeof window !== 'undefined' && window.EquationConverter) ? window.EquationConverter : null;
          // Part-9f (Word-2003 ক্র্যাশ ফিক্স): RTF math zone (`\mmath` = Office 2007+ ম্যাথ ফরম্যাট)
          // Word 2003 (11.0) তা বোঝে না — 9c-তে `.doc`-এ পাঠানোর পর ওই Word ক্র্যাশ করত।
          // এখন `.doc` = 2003-নেটিভ Equation Editor 3.0 (EQ ফিল্ড, ডিফল্ট), অথবা
          // docMath:'plain' দিলে ফিল্ড ছাড়া ইটালিক পাঠ্য। `.docx` আগের মতোই OMML রাখে।
          const docMathMode = (options && options.docMath) || 'eqfield';
          let _eqOut = null;
          if (_EqC && typeof _EqC.latexToEqField === 'function') {
            try { _eqOut = _EqC.latexToEqField(rawLatex, isBijoy); } catch(e) {}
          }
          if (_eqOut) {
            let rtfSafe = this.escapeUnicodeRtf(_eqOut);
            rtfSafe = rtfSafe.replace(/\\\\S\\\\up\d*\((.*?)\)/gi, '{\\super $1}');
            rtfSafe = rtfSafe.replace(/\\\\S\\\\do\d*\((.*?)\)/gi, '{\\sub $1}');
            if (docMathMode === 'plain' || !/\\[FRIBXA]\b/i.test(_eqOut)) {
              // সরল রাশি / plain মোড → ফিল্ড ছাড়া ইটালিক পাঠ্য (সব Word-এ পড়া যায়)
              out += '{\\f1 ' + rtfSafe + '}';
            } else {
              // Equation Editor 3.0 EQ ফিল্ড → Word 2003-এ নেটিভ ও এডিটযোগ্য
              let escapedEq = this.escapeUnicodeRtf(_eqOut);
              // EQ সুইচগুলো Word যেন চিনতে পারে (escaped form → switch form)
              escapedEq = escapedEq.replace(/\\\\(F|R|I|B|X|A|S|up|do|al|ar|ac|con)/gi, '\\$1');
              out += '{\\field{\\*\\fldinst EQ ' + escapedEq + '}{\\fldrslt }}';
            }
          } else {
            out += '{\\f1 ' + this.escapeRtf(rawLatex) + '}';
          }
        } else if (run.type === 'english') {
          if (run.subscript) {
            out += '{\\f1\\sub ' + this.escapeRtf(run.text) + '}';
          } else {
            out += '{\\f1 ' + this.escapeRtf(run.text) + '}';
          }
        } else {
          if (isBijoy) {
            out += '{\\f0 ' + this.escapeRtf(this.toBijoy(run.text)) + '}';
          } else {
            out += '{\\f0 ' + this.escapeUnicodeRtf(run.text) + '}';
          }
        }
      }
      return out;
    },

    /**
     * Escapes text for OpenXML XML nodes.
     */
    xmlEscape(str) {
      if (!str) return '';
      return String(str)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    },

    /**
     * Formats plain text for OpenXML DOCX based on font option.
     */
    formatDocxText(text, options = {}) {
      if (!text) return '';
      const isBijoy = this.isBijoyFont(options);
      const txt = isBijoy ? this.toBijoy(text) : String(text);
      return this.xmlEscape(txt);
    },

    /**
     * Renders OpenXML DOCX runs with native dynamic font switching (<w:r> & <m:oMath>).
     * Sits directly inside <w:p> to prevent invalid <w:t> nesting.
     */
    renderDocxRuns(text, options = {}, style = {}) {
      if (!text) return '';
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : (options.font || 'Kalpurush');
      const trp = this._getTextRunProcessor();

      let styleTags = '';
      if (style.b) styleTags += '<w:b/>';
      if (style.i) styleTags += '<w:i/>';
      if (style.u) styleTags += '<w:u w:val="single"/>';
      const szVal = style.sz || 24;
      styleTags += `<w:sz w:val="${szVal}"/><w:szCs w:val="${szVal}"/>`;

      if (!trp) {
        const escaped = this.formatDocxText(text, options);
        return `<w:r><w:rPr>${styleTags}<w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>`;
      }

      let norm = String(text)
        .replace(/(^|[\s,(])ররর(?=[\s,.)]|$)/g, '$1iii')
        .replace(/(^|[\s,(])রর(?=[\s,.)]|$)/g, '$1ii')
        .replace(/(^|[\s,(])র(?=[\s,.)]|$)/g, '$1i')
        .replace(/^ররর\./g, 'iii.')
        .replace(/^রর\./g, 'ii.')
        .replace(/^র\./g, 'i.');

      const runs = this._collapseRunGaps(trp.processTextRuns(norm, { isBijoy, generateOmml: true }));
      if (!runs || runs.length === 0) return '';

      let xml = '';
      for (const run of runs) {
        if (run.type === 'math') {
          // Part-10 (ঘ.২–ঙ): RTF পাথের 'কাঠামোহীন সমীকরণ → সাধারণ টেক্সট' নিয়মটি
          // (formatRtfText: \\[FRIBXA] না মিললে plain) DOCX-তে ছিল না ⇒ বিকল্পের
          // এক-অক্ষরের চিহ্ন (÷ × − ±) <m:oMath> বক্স বানাত — দুই ফরমাতের আউটপুট
          // আলাদা হতো আর ২-কলাম গ্রিডের লাইন-উচ্চতা প্ল্যানের জ্যামিতির বাইরে যেত।
          const _mt = String(run.cleanLatex || run.value || '').trim();
          const _omml = run.ommlXml || '';
          const _trivial = !!_mt && _mt.length <= 4
            && !/[A-Za-z\u0980-\u09FF]/.test(_mt.replace(/\\[A-Za-z]+/g, ''))
            && !/<m:(sSup|sSub|sSubSup|f|num|den|rad|deg|nary|d|func|limLow|limUp|bar|acc|box|m|eqArr|groupChr)\b/i.test(_omml);
          if (_trivial) {
            const _mtTxt = this.xmlEscape(_mt);
            xml += `<w:r><w:rPr>${styleTags}<w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/><w:noProof/></w:rPr><w:t xml:space="preserve">${_mtTxt}</w:t></w:r>`;
          } else if (run.ommlXml) {
            xml += run.ommlXml;
          } else {
            const mathTxt = this.xmlEscape(run.cleanLatex || run.value || '');
            xml += `<w:r><w:rPr>${styleTags}<w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr><w:t xml:space="preserve">${mathTxt}</w:t></w:r>`;
          }
        } else if (run.type === 'english') {
          const engTxt = this.xmlEscape(run.text);
          const vertAlign = run.subscript ? '<w:vertAlign w:val="subscript"/>' : '';
          xml += `<w:r><w:rPr>${styleTags}<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${vertAlign}</w:rPr><w:t xml:space="preserve">${engTxt}</w:t></w:r>`;
        } else {
          const bnTxt = isBijoy ? this.toBijoy(run.text) : run.text;
          const escapedBn = this.xmlEscape(bnTxt);
          xml += `<w:r><w:rPr>${styleTags}<w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/></w:rPr><w:t xml:space="preserve">${escapedBn}</w:t></w:r>`;
        }
      }
      return xml;
    },

    // -------------------------------------------------------------------------
    // PRIMARY EXPORT DISPATCHER (Word 2003 .doc / Modern .docx)
    // -------------------------------------------------------------------------

    /**
     * Main entry point for Word documents.
     * @param {string} rawText
     * @param {string} docType
     * @param {Object} options - { font: 'bijoy'|'unicode', format: 'doc'|'docx', ... }
     * @returns {Blob|Promise<Blob>}
     */
    generateWordDoc(rawText, docType = 'EXAM_CQ', options = {}) {

      // 1. Normalize docType (e.g. EXAMGENERAL -> EXAM_GENERAL)
      let normalizedDocType = docType.toUpperCase().replace(/\s+/g, '_');
      if (normalizedDocType === 'EXAMMCQ') normalizedDocType = 'EXAM_MCQ';
      if (normalizedDocType === 'EXAMCQ') normalizedDocType = 'EXAM_CQ';
      if (normalizedDocType === 'EXAMGENERAL') normalizedDocType = 'EXAM_GENERAL';
      if (normalizedDocType === 'EXAMMATH') normalizedDocType = 'EXAM_MATH';
      if (normalizedDocType === 'EXAMCOMBINED') normalizedDocType = 'EXAM_COMBINED';
      if (normalizedDocType === 'ADMITCARD') normalizedDocType = 'ADMIT_CARD';
      if (normalizedDocType === 'SALARYSLIP') normalizedDocType = 'SALARY_SLIP';
      if (normalizedDocType === 'STAMPDEED') normalizedDocType = 'STAMP_DEED';
      if (normalizedDocType === 'GOVTAPP') normalizedDocType = 'GOVT_APP';

      // 2. Strip YAML frontmatter from rawText robustly
      let cleanText = rawText.trimStart();
      cleanText = cleanText.replace(/^---[\s\S]*?---\s*/, '');
      cleanText = stripOcrArtifacts(cleanText);

      const format = (options.format || 'doc').toLowerCase();
      if (format === 'docx') {
        return this.generateModernDocx(cleanText, normalizedDocType, options);
      }
      return this.generateLegacyDoc(cleanText, normalizedDocType, options);
    },

    /**
     * Generates Word 2003 (.doc) binary/RTF Blob.
     */
    /**
     * Part-13.1: Studio-এডিট-ব্রিজ — parsedData আগেই দেওয়া থাকলে পুনঃপার্স বাদ।
     * __fzDocType মিল না হলে (ভুল docType/পুরনো data) নিরাপদে সাধারণ পার্সে ফিরে যায়।
     */
    _resolveParsed(rawText, docType, options, qEngine) {
      const pd = options && options.parsedData;
      if (pd && pd.__fzDocType === docType) return pd;
      return qEngine.parseQuestionPaper(rawText, { docType });
    },

    generateLegacyDoc(rawText, docType = 'EXAM_CQ', options = {}) {
      rawText = stripOcrArtifacts(String(rawText || ''));
      let qEngine = this._getQuestionEngine();

      if (qEngine && docType === 'EXAM_COMBINED') {
        const parts = rawText.split(/---SECTION_?BREAK:MCQ---/i);
        const parsedCq = qEngine.parseQuestionPaper(parts[0] || '', { docType: 'EXAM_CQ' });
        const parsedMcq = qEngine.parseQuestionPaper(parts[1] || '', { docType: 'EXAM_MCQ' });
        const validator = this._getSchemaValidator();
        if (validator) { validator.validate(docType, parsedCq); validator.validate(docType, parsedMcq); }
        const rtf = this.generateCombinedExamRtf(parsedCq, parsedMcq, options);
        return new Blob([rtf], { type: 'application/msword' });
      }

      if (qEngine && (docType === 'EXAM_CQ' || docType === 'EXAM_MATH' || docType === 'EXAM_GENERAL')) {
        const parsed = this._resolveParsed(rawText, docType, options, qEngine);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        const rtf = this.generateCqExamRtf(parsed, options);
        return new Blob([rtf], { type: 'application/msword' });
      }

      if (qEngine && docType === 'EXAM_MCQ') {
        const parsed = this._resolveParsed(rawText, docType, options, qEngine);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        const rtf = this.generateMcqExamRtf(parsed, options);
        return new Blob([rtf], { type: 'application/msword' });
      }

      let cEngine = this._getCertificateEngine();
      if (cEngine && docType === 'PROTTOYON') {
        const parsed = cEngine.parseCertificate(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        const rtf = this.generateCertificateRtf(parsed, options);
        return new Blob([rtf], { type: 'application/msword' });
      }

      let sEngine = this._getStampEngine();
      if (sEngine && docType === 'STAMP_DEED') {
        const parsed = sEngine.parseDeed(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        const rtf = this.generateStampDeedRtf(parsed, options);
        return new Blob([rtf], { type: 'application/msword' });
      }

      let aEngine = this._getApplicationEngine();
      if (aEngine && docType === 'GOVT_APP') {
        const parsed = aEngine.parseApplication(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        const rtf = this.generateGovtAppRtf(parsed, options);
        return new Blob([rtf], { type: 'application/msword' });
      }

      let adEngine = this._getAdmitCardEngine();
      if (adEngine && docType === 'ADMIT_CARD') {
        const parsed = adEngine.parseAdmitData(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        const rtf = this.generateAdmitCardRtf(parsed, options);
        return new Blob([rtf], { type: 'application/msword' });
      }

      let salEngine = this._getSalarySlipEngine();
      if (salEngine && docType === 'SALARY_SLIP') {
        const parsed = salEngine.parseSalaryData(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        const rtf = this.generateSalarySlipRtf(parsed, options);
        return new Blob([rtf], { type: 'application/msword' });
      }

      let rEngine = this._getRoutineEngine();
      if (rEngine && docType === 'ROUTINE') {
        const parsed = rEngine.parseRoutine(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        const rtf = this.generateRoutineRtf_v2(parsed, options);
        return new Blob([rtf], { type: 'application/msword' });
      }

      let cvEngine = this._getCVEngine();
      if (cvEngine && docType === 'CV_RESUME') {
        const parsed = cvEngine.parseCV(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        const rtf = this.generateCVRtf(parsed, options);
        return new Blob([rtf], { type: 'application/msword' });
      }

      const rtf = this.generateGenericRtf(rawText, docType, options);
      return new Blob([rtf], { type: 'application/msword' });
    },

    /**
     * Generates Board Standard Combined (CQ+MCQ) Word DOCX Document.
     */
    // Part-9: অডিট-নোট পৃষ্ঠা — মূল কনটেন্টের একদম শেষে, পেজ-ব্রেক দিয়ে আলাদা পৃষ্ঠায়।
    /** Part-9j: parsed অবজেক্টে MD থেকে ধরা অডিট-নোট থাকলে options-এ তুলে দিই
     *  (HTML preview ও DOCX/RTF ডাউনলোডে একই অডিট-শীট ⇒ preview == download)। */
    _withAuditNote(options = {}, ...parsedList) {
      if (options && options.auditNote) return options;
      const hit = (parsedList || []).find((p) => p && p.auditNote && String(p.auditNote).trim());
      if (!hit) return options;
      return Object.assign({}, options, { auditNote: String(hit.auditNote) });
    },

    _auditNoteLines(options = {}) {
      if (!options || !options.auditNote) return [];
      const note = String(options.auditNote).replace(/^\s*\[/, '').replace(/\]\s*$/, '').trim();
      return note ? note.split(/\r?\n/) : [];
    },

    _auditSectionDocx(options = {}) {
      const lines = this._auditNoteLines(options);
      if (!lines.length) return '';
      let xml = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      xml += '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="240"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t xml:space="preserve">যাচাই প্রতিবেদন (এআই অডিট নোট)</w:t></w:r></w:p>';
      for (const line of lines) {
        const t = String(line).trim();
        if (!t) { xml += '<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr></w:p>'; continue; }
        xml += `<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>${this.renderDocxRuns(t, options, { sz: 24 })}</w:p>`;
      }
      return xml;
    },

    _auditSectionRtf(options = {}) {
      const lines = this._auditNoteLines(options);
      if (!lines.length) return '';
      let rtf = '\\page\n';
      rtf += '{\\qc\\b\\fs32\\f0\\sl240\\slmult1\\sb240\\sa240 ' + this.formatRtfText('যাচাই প্রতিবেদন (এআই অডিট নোট)', options) + '\\par}\n';
      for (const line of lines) {
        const t = String(line).trim();
        rtf += t ? ('{\\ql\\fs24\\f0\\sl240\\slmult1\\sb60\\sa60 ' + this.formatRtfText(t, options) + '\\par}\n') : '\\par\n';
      }
      return rtf;
    },


    /**
     * Combined (CQ + MCQ) Modern Word (.docx) — Part-11 মাস্টার লেআউট।
     * সেকশন ১ = সৃজনশীল ল্যান্ডস্কেপ ২-কলাম বুকলেট (ইনলাইন sectPr দিয়ে শেষ,
     * w:type="nextPage"), সেকশন ২ = MCQ A4 পোর্ট্রেট (হেডার ১-কলাম + কন্টিনিউয়াস
     * ২-কলাম বডি)। আগের সংস্করণ দুই অংশকেই একটিমাত্র ল্যান্ডস্কেপ sectPr-এ
     * ঢালত ⇒ MCQ অংশ ল্যান্ডস্কেপে ছাপা হতো।
     */
    async generateCombinedExamDocx(parsedCq, parsedMcq, options = {}) {
      options = this._withAuditNote(options, parsedCq, parsedMcq);
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : (options.font || 'Kalpurush');

      const childOptions = { ...options };
      delete childOptions.auditNote;

      // ---- সেকশন ১: CQ বুকলেট ----
      const cqRes = await this.generateCqExamDocx(parsedCq, { ...childOptions, returnInnerXml: true });
      // ---- সেকশন ২: MCQ পোর্ট্রেট (নিজস্ব হেডার/বডি সেকশনসহ) ----
      const mcqRes = await this.generateMcqExamDocx(parsedMcq, { ...childOptions, returnInnerXml: true, isCombined: true });

      const cqPlan = this._cqPlan(parsedCq, options);
      const cqSectionEnd = this._cqSectionBreakDocx(cqPlan.geometry);

      let combinedBody = cqRes.bodyXml + cqSectionEnd + mcqRes.bodyXml;
      combinedBody += this._auditSectionDocx(options);

      // শেষ সেকশন = MCQ বডির পোর্ট্রেট প্রপার্টি
      const sectPr = mcqRes.sectPr || '';

      if (options.returnInnerXml) {
        return { bodyXml: combinedBody, sectPr };
      }

      return await this._packageDocx(combinedBody + sectPr, fontName);
    },

    /**
     * Generates Modern Word (.docx) OpenXML Package.
     * Compatible with Word 2007, 2010, 2013, 2016, 2019, 2021, and Office 365.
     */
    async generateModernDocx(rawText, docType = 'EXAM_CQ', options = {}) {
      rawText = stripOcrArtifacts(String(rawText || ''));
      let qEngine = this._getQuestionEngine();

      if (qEngine && docType === 'EXAM_COMBINED') {
        const parts = rawText.split(/---SECTION_?BREAK:MCQ---/i);
        const parsedCq = qEngine.parseQuestionPaper(parts[0] || '', { docType: 'EXAM_CQ' });
        const parsedMcq = qEngine.parseQuestionPaper(parts[1] || '', { docType: 'EXAM_MCQ' });
        const validator = this._getSchemaValidator();
        if (validator) { validator.validate(docType, parsedCq); validator.validate(docType, parsedMcq); }
        return await this.generateCombinedExamDocx(parsedCq, parsedMcq, options);
      }

      if (qEngine && (docType === 'EXAM_CQ' || docType === 'EXAM_MATH' || docType === 'EXAM_GENERAL')) {
        const parsed = this._resolveParsed(rawText, docType, options, qEngine);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        return await this.generateCqExamDocx(parsed, options);
      }

      if (qEngine && docType === 'EXAM_MCQ') {
        const parsed = this._resolveParsed(rawText, docType, options, qEngine);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        return await this.generateMcqExamDocx(parsed, options);
      }

      let cEngine = this._getCertificateEngine();
      if (cEngine && docType === 'PROTTOYON') {
        const parsed = cEngine.parseCertificate(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        return await this.generateCertificateDocx(parsed, options);
      }

      let sEngine = this._getStampEngine();
      if (sEngine && docType === 'STAMP_DEED') {
        const parsed = sEngine.parseDeed(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        return await this.generateStampDeedDocx(parsed, options);
      }

      let aEngine = this._getApplicationEngine();
      if (aEngine && docType === 'GOVT_APP') {
        const parsed = aEngine.parseApplication(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        return await this.generateGovtAppDocx(parsed, options);
      }

      let adEngine = this._getAdmitCardEngine();
      if (adEngine && docType === 'ADMIT_CARD') {
        const parsed = adEngine.parseAdmitData(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        return await this.generateAdmitCardDocx(parsed, options);
      }

      let salEngine = this._getSalarySlipEngine();
      if (salEngine && docType === 'SALARY_SLIP') {
        const parsed = salEngine.parseSalaryData(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        return await this.generateSalarySlipDocx(parsed, options);
      }

      let rEngine = this._getRoutineEngine();
      if (rEngine && docType === 'ROUTINE') {
        const parsed = rEngine.parseRoutine(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        return await this.generateRoutineDocx_v2(parsed, options);
      }

      let cvEngine = this._getCVEngine();
      if (cvEngine && docType === 'CV_RESUME') {
        const parsed = cvEngine.parseCV(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        return await this.generateCVDocx(parsed, options);
      }

      return await this.generateGenericDocx(rawText, docType, options);
    },

    _getQuestionEngine() {
      if (typeof global !== 'undefined' && global.QuestionEngine) return global.QuestionEngine;
      if (typeof window !== 'undefined' && window.QuestionEngine) return window.QuestionEngine;
      if (typeof require === 'function') {
        try { return require('./question-engine.js'); } catch (e) { }
      }
      return null;
    },

    _getCertificateEngine() {
      if (typeof global !== 'undefined' && global.CertificateEngine) return global.CertificateEngine;
      if (typeof window !== 'undefined' && window.CertificateEngine) return window.CertificateEngine;
      if (typeof require === 'function') {
        try { return require('./certificate-engine.js'); } catch (e) { }
      }
      return null;
    },

    _getStampEngine() {
      if (typeof global !== 'undefined' && global.StampEngine) return global.StampEngine;
      if (typeof window !== 'undefined' && window.StampEngine) return window.StampEngine;
      if (typeof require === 'function') {
        try { return require('./stamp-engine.js'); } catch (e) { }
      }
      return null;
    },

    _getApplicationEngine() {
      if (typeof global !== 'undefined' && global.ApplicationEngine) return global.ApplicationEngine;
      if (typeof window !== 'undefined' && window.ApplicationEngine) return window.ApplicationEngine;
      if (typeof require === 'function') {
        try { return require('./application-engine.js'); } catch (e) { }
      }
      return null;
    },

    _getAdmitCardEngine() {
      if (typeof global !== 'undefined' && global.AdmitCardEngine) return global.AdmitCardEngine;
      if (typeof window !== 'undefined' && window.AdmitCardEngine) return window.AdmitCardEngine;
      if (typeof require === 'function') {
        try { return require('./admit-card-engine.js'); } catch (e) { }
      }
      return null;
    },

    _getSalarySlipEngine() {
      if (typeof global !== 'undefined' && global.SalarySlipEngine) return global.SalarySlipEngine;
      if (typeof window !== 'undefined' && window.SalarySlipEngine) return window.SalarySlipEngine;
      if (typeof require === 'function') {
        try { return require('./salary-slip-engine.js'); } catch (e) { }
      }
      return null;
    },

    _getRoutineEngine() {
      if (typeof global !== 'undefined' && global.RoutineEngine) return global.RoutineEngine;
      if (typeof window !== 'undefined' && window.RoutineEngine) return window.RoutineEngine;
      if (typeof require === 'function') {
        try { return require('./routine-engine.js'); } catch (e) { }
      }
      return null;
    },

    _getCVEngine() {
      if (typeof global !== 'undefined' && global.CVEngine) return global.CVEngine;
      if (typeof window !== 'undefined' && window.CVEngine) return window.CVEngine;
      if (typeof require === 'function') {
        try { return require('./cv-engine.js'); } catch (e) { }
      }
      return null;
    },

    _getJSZip() {
      if (typeof global !== 'undefined' && global.JSZip) return global.JSZip;
      if (typeof window !== 'undefined' && window.JSZip) return window.JSZip;
      if (typeof require === 'function') {
        try { return require('../jszip.min.js'); } catch (e) { }
      }
      return null;
    },

    // -------------------------------------------------------------------------
    // 1. CREATIVE QUESTION (CQ) GENERATORS
    // -------------------------------------------------------------------------
    // =========================================================================
    // Part-11 — সৃজনশীল (CQ) মাস্টার লেআউট: বুকলেট প্ল্যানার অ্যাডাপ্টার
    // জ্যামিতি ও কলাম-বণ্টনের একমাত্র উৎস js/layout-engine/cq-booklet-planner.js।
    // RTF (.doc), DOCX (.docx) ও প্রিভিউ — তিনটেই একই plan কনজিউম করে,
    // ফলে "preview == download" চুক্তি (Part-10) এখানেও অটুট থাকে।
    // =========================================================================
    _getCqPlanner() {
      if (typeof CqBookletPlanner !== 'undefined') return CqBookletPlanner;
      if (typeof window !== 'undefined' && window.CqBookletPlanner) return window.CqBookletPlanner;
      if (typeof globalThis !== 'undefined' && globalThis.CqBookletPlanner) return globalThis.CqBookletPlanner;
      if (typeof global !== 'undefined' && global.CqBookletPlanner) return global.CqBookletPlanner;
      if (typeof require === 'function') {
        try {
          return require('../layout-engine/cq-booklet-planner.js');
        } catch (e) {
          try {
            return require('./cq-booklet-planner.js');
          } catch (e2) {}
        }
      }
      return null;
    },

    /**
     * Part-11: CQ বুকলেট প্ল্যান। margin / columnGap / columns / skipFirstColumn
     * UI-অপশন প্ল্যানারে পাস হয় — নতুন কোনো জ্যামিতি এ ফাইলে গণনা করা হয় না।
     */
    _cqPlan(parsedData, options = {}) {
      const planner = this._getCqPlanner();
      if (planner && typeof planner.plan === 'function') {
        try {
          const p = planner.plan(parsedData, {
            docType: 'EXAM_CQ',
            margin: options.margin || 0.5,
            columnGap: options.columnGap || 0.7,
            cols: options.columns || 2,
            rightTab: options.rightTab,
            skipFirstColumn: options.skipFirstColumn
          });
          if (p && p.geometry && Array.isArray(p.columns) && Array.isArray(p.items)) return p;
        } catch (e) {
          /* ন্যূনতম ফলব্যাক প্ল্যান নিচে */
        }
      }
      return this._cqPlanFallback(parsedData, options);
    },

    /**
     * Part-11: প্ল্যানার অনুপলব্ধ হলেও লেখা হারাবে না — ল্যান্ডস্কেপ ২-কলাম সেটআপ
     * ঠিক থাকে, শুধু পৃষ্ঠা-প্রতি forced কলাম-ব্রেক ও টেল-ভরতি বাদ পড়ে।
     */
    /**
     * Part-12 (ট্রায়াজ ১): RTF-এর \sl সেই প্যারাগ্রাফের নিজস্ব \fs থেকে গণনা হওয়া চাই।
     * আগে প্রায় সব প্যারাগ্রাফে \sl240 (১২pt) হার্ডকোডেড ছিল — \fs32 (১৬pt) হেডারে
     * বা ১১pt-এ সংকুচিত MCQ লাইনেও। Word 2003 + সুতন্নীএমজে "at least" লাইনবক্সকে
     * ফন্ট-মেট্রিক দেখে নিজে থেকেই বড় করত ⇒ অসম লাইন-গ্যাপ ও অস্বাভাবিক লম্বা কার্সার।
     * এখন লাইন-বক্স = নিজের সাইজ × প্ল্যানের lineFactor (১.৫)। DOCX (w:line,
     * lineRule="auto" = ফন্ট-আপেক্ষিক গুণক) ও প্রিভিউ (line-height: 1.5) একই রেশিওতে
     * থাকে ⇒ প্রিভিউ ≈ ডাউনলোড, আর বড় অক্ষরেও লাইন কাটা পড়ে না।
     */
    _fixRtfSpacing(rtf, factor) {
      let s = String(rtf == null ? '' : rtf);
      // ডিফল্ট গুণক ১.০ = নিজ ফন্টের single লাইন — প্রতিটি প্যারাগ্রাফে একই রেশিও।
      // আগে \fs32 হেডারে \sl240 (০.৭৫×) আর ১১pt-এ সংকুচিত MCQ লাইনে ১.০৯× মিশে
      // লাইন-গ্যাপ অসম হতো ও কার্সার অস্বাভাবিক লম্বা দেখাত; এখন সবই এক রেশিও।
      // proportional (\slmult1) রাখা হয় — absolute (\slmult0) নিলে বাংলা অক্ষরের নিচের
      // অংশ কেটে যেত; প্ল্যানের ক্যাপাসিটি মডেল (lineFactor ১.৫) রেন্ডারের চেয়ে বড়ই
      // থাকে ⇒ পৃষ্ঠা-সংখ্যার চুক্তি (TC-LAY-29/৩৩) অক্ষুণ্ন।
      const f = Number.isFinite(parseFloat(factor)) ? Math.min(2, Math.max(0.9, parseFloat(factor))) : 1;
      const mult = Math.round(240 * f);
      s = s.replace(/\\fs(\d+)((?:\\f\d+)?)\\sl(\d+)\\slmult(\d)/g, (whole, sz, fslot, sl, mm) =>
        // ১২০-এর নিচে = হেয়ারলাইন/ডিভাইডার লাইন ⇒ সেগুলোর নিজস্ব সরু পিচই থাকে
        (+sl < 120 ? whole : '\\fs' + sz + fslot + '\\sl' + mult + '\\slmult1'));
      // \sb/\sa স্ট্যান্ডার্ড সীমায় (৯pt = ১৮০ টুইপ) — বড় before/after লাইন-ছন্দ ভাঙে
      s = s.replace(/\\s([ba])(\d{3,})/g, (whole, k, v) => '\\s' + k + Math.min(parseInt(v, 10), 180));
      return s;
    },

    /** Part-12: DOCX-তে একই নীতি — w:line = ২৪০ × lineFactor; \sb/\sa ক্ল্যাম্প */
    _fixDocxSpacing(xml, factor) {
      let s = String(xml == null ? '' : xml);
      // DOCX-তেও একই নীতি: সব প্যারাগ্রাফে lineRule="auto" (ফন্ট-আপেক্ষিক) + একই গুণক
      // ⇒ ১২pt/১৬pt/১১pt সবই লাইন-তাল সমান; exact/atLeast বন্ধ (ক্লিপ ও ফোলা দেখা গেছে)।
      const f = Number.isFinite(parseFloat(factor)) ? Math.min(2, Math.max(0.9, parseFloat(factor))) : 1;
      const line = Math.round(240 * f);
      s = s.replace(/w:line="([0-9]+)" w:lineRule="(auto|atLeast|exact)"/g, (whole, v, rule) =>
        (+v < 120 ? whole : 'w:line="' + line + '" w:lineRule="auto"'));
      s = s.replace(/w:lineRule="(auto|atLeast|exact)" w:line="([0-9]+)"/g, (whole, rule, v) =>
        (+v < 120 ? whole : 'w:lineRule="auto" w:line="' + line + '"'));
      s = s.replace(/ w:(before|after)="(\d{3,})"/g, (whole, k, v) => ' w:' + k + '="' + Math.min(parseInt(v, 10), 180) + '"');
      // সমীকরণ-জোনের শেষে ঝুলে-থাকা স্পেস Word-এর ম্যাথ-অটো-স্পেসিং-এর ওপর চাপে
      // ⇒ \pi r^2 জাতীয় রাশিতে অস্বাভাবিক ফাঁকা (ট্রায়াজ ৫)
      s = s.replace(/(<m:t[^>]*>)([^<]*?)\s+(<\/m:t>)(?=<\/m:r><m:r>)/g, '$1$2$3');
      return s;
    },

    /** Part-12 (ট্রায়াজ ৫): বাংলা রান ↔ সমীকরণ রানের সীমানায় ডাবল-স্পেস রেখে দেওয়া হয় না */
    _collapseRunGaps(runs) {
      if (!Array.isArray(runs) || runs.length < 2) return runs;
      const out = runs.map((r) => Object.assign({}, r));
      const txtOf = (r) => (r && r.type === 'math'
        ? String(r.cleanLatex != null ? r.cleanLatex : (r.value != null ? r.value : ''))
        : String((r && (r.text != null ? r.text : r.value)) || ''));
      for (let i = 1; i < out.length; i++) {
        const prev = out[i - 1], cur = out[i];
        if (prev.type !== 'math' && cur.type !== 'math') continue;
        if (/\s$/.test(txtOf(prev)) && /^\s/.test(txtOf(cur))) {
          const nv = txtOf(cur).replace(/^\s+/, '');
          if (cur.type === 'math') { cur.cleanLatex = nv; cur.value = nv; }
          else { cur.text = nv; if (cur.value != null) cur.value = nv; }
        }
      }
      return out;
    },

    _cqPlanFallback(parsedData, options = {}) {
      const g = {
        pageW: 16838, pageH: 11906, cols: 2, colSep: false,
        margin: (global.FayzarLayoutUnits ? global.FayzarLayoutUnits.margin(options.margin, 720)
          : (Number.isFinite(parseFloat(options.margin)) ? (Math.round(parseFloat(options.margin) * 1440) || 720) : 720)),
        colGap: (global.FayzarLayoutUnits ? global.FayzarLayoutUnits.gap(options.columnGap, 1008) : 1008),
        indent: 432, subIndent: 864, subHanging: 432,
        lineFactor: 1.5, headerLineFactor: 1.28, baseSz: 24,
        landscape: true
      };
      if (options.columns) g.cols = Math.max(1, parseInt(options.columns, 10) || 2);
      g.usableW = g.pageW - 2 * g.margin;
      g.usableH = g.pageH - 2 * g.margin;
      g.colW = Math.floor((g.usableW - g.colGap * (g.cols - 1)) / g.cols);
      g.textW = g.colW - g.indent;
      g.subTextW = g.colW - g.subIndent;
      g.rightTab = g.colW;
      g.capacity = Math.round(g.usableH * 0.98);

      const h = (parsedData && parsedData.header) || {};
      const headerLines = [];
      const push = (kind, text, extra) => {
        if (!String(text || '').trim()) return;
        headerLines.push(Object.assign({ kind, text: String(text).trim(), align: 'center', fallbackUsed: false }, extra || {}));
      };
      push('institute', h.institute, { bold: true, sz: 32 });
      push('location', h.location, { sz: 24 });
      push('exam', h.exam, { bold: true, sz: 26 });
      push('classSubject', h.classAndSubject, { sz: 24 });
      if (h.time || h.marks || h.examType) {
        headerLines.push({ kind: 'metrics', text: h.time ? 'সময়: ' + h.time : '', center: h.examType || '', right: h.marks ? 'পূর্ণমান: ' + h.marks : '', align: 'left', bold: true, sz: 24, fallbackUsed: false });
      }
      push('instructions', h.instructions, { italic: true, sz: 24 });

      const items = [];
      for (const sec of ((parsedData && parsedData.sections) || [])) {
        if (sec && sec.title) items.push({ kind: 'sectionTitle', text: sec.title, height: 0, lines: 1 });
        for (const q of ((sec && sec.questions) || [])) items.push({ kind: 'question', q, height: 0, lines: 0, parts: {} });
      }
      const columns = [{
        role: 'page1', slot: 1, page: 1, colInPage: 1, items,
        headerFirst: true, breakBefore: false, height: 0, cap: g.capacity
      }];
      return {
        geometry: g, font: { sz: g.baseSz, pt: g.baseSz / 2 },
        headerLines, headerHeight: 0, skipFirstColumn: false, columns, items,
        metrics: { count: items.length, capacity: g.capacity, columnsTotal: 1, printedPages: 1, docPages: 1, sheets: 1, reservedUsed: false, tailMoved: 0, headHeight: 0 }
      };
    },

    /** উদ্দীপকের প্রথম লাইন (প্রয়োজনে স্টেমের সঙ্গে যুক্ত) + বাকি লাইন/ছক */
    _cqSplitStimulus(q) {
      let firstLineText = String((q && q.text) || '').trim();
      let remaining = [];
      const stim = q && q.stimulus;
      if (stim) {
        const lines = String(stim).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (!firstLineText && lines.length > 0) {
          const f = lines[0];
          if (f.startsWith('|') && f.endsWith('|')) remaining = lines;
          else { firstLineText = f; remaining = lines.slice(1); }
        } else {
          remaining = lines;
        }
      }
      return { firstLineText, remaining };
    },

    /** RTF পেজ-সেটআপ্র (ল্যান্ডস্কেপ A4, ০.৫" মার্জিন, ২ কলাম, 0.7" গ্যাপ) — নম্বর সব প্ল্যানার থেকে */
    _cqPageSetupRtf(g) {
      return '\\landscape\\paperw' + g.pageW + '\\paperh' + g.pageH +
        '\\margl' + g.margin + '\\margr' + g.margin + '\\margt' + g.margin + '\\margb' + g.margin +
        '\\cols' + g.cols + '\\colsx' + g.colGap + (g.colSep ? '\\linebetcol' : '');
    },

    /** DOCX সেকশন-প্রপারটি (কলাম/পেজ) — sectPr র‍্যাপার ছাড়া, দুই জায়গায় বসে */
    _cqSectPrInnerDocx(g) {
      return '<w:pgSz w:w="' + g.pageW + '" w:h="' + g.pageH + '"' + (g.landscape !== false ? ' w:orient="landscape"' : '') + '/>' +
        '<w:pgMar w:top="' + g.margin + '" w:right="' + g.margin + '" w:bottom="' + g.margin +
        '" w:left="' + g.margin + '" w:header="' + g.margin + '" w:footer="' + g.margin + '" w:gutter="0"/>' +
        '<w:cols w:num="' + g.cols + '" w:space="' + g.colGap + '"' + (g.colSep ? ' w:sep="1"' : '') + '/>';
    },
    _cqSectPrDocx(g) {
      return '<w:sectPr>' + this._cqSectPrInnerDocx(g) + '</w:sectPr>';
    },
    /** DOCX: পরবর্তী-পৃষ্ঠা সেকশন-ব্রেক (সেকশন এই প্যারাগ্রাফেই শেষ হয়) */
    _cqSectionBreakDocx(g) {
      return '<w:p><w:pPr><w:sectPr><w:type w:val="nextPage"/>' + this._cqSectPrInnerDocx(g) + '</w:sectPr></w:pPr></w:p>';
    },

    // ------------------------------------------------------- হেডার ব্লক (৩ নম্বর ধারা)
    _cqHeaderRtf(plan, options) {
      const g = plan.geometry;
      const rightTab = g.rightTab;
      const mid = Math.round(rightTab / 2);
      let rtf = '';
      for (const hl of (plan.headerLines || [])) {
        const sz = hl.sz || g.baseSz;
        const sty = (hl.bold ? '\\b' : '') + (hl.italic ? '\\i' : '');
        if (hl.kind === 'metrics') {
          const tTxt = hl.text ? this.formatRtfText(hl.text, options) : '';
          const mTxt = hl.right ? this.formatRtfText(hl.right, options) : '';
          const eTxt = hl.center ? this.formatRtfText(hl.center, options) : '';
          let tabs = '\\tqr\\tx' + rightTab;
          let body = tTxt;
          if (eTxt) {
            tabs = '\\tqc\\tx' + mid + tabs;
            body += '\\tab {\\b\\ul ' + eTxt + '}';
          }
          if (mTxt) body += '\\tab ' + mTxt;
          if (body.trim()) rtf += '{\\ql' + sty + '\\fs' + sz + '\\f0\\sl240\\slmult1\\sb0\\sa0' + tabs + ' ' + body + '\\par}\n';
          continue;
        }
        const align = hl.align === 'left' ? '\\ql' : '\\qc';
        rtf += '{' + align + sty + '\\fs' + sz + '\\f0\\sl240\\slmult1\\sb0\\sa0 ' +
          this.formatRtfText(hl.text || '', options) + '\\par}\n';
      }
      // হেডারের নিচে একটিমাত্র দৃশ্যমান বিভাজক
      rtf += '{\\ql\\fs4\\f0\\sl100\\slmult1\\sb0\\sa40\\brdrb\\brdrs\\brdrw10\\brsp20 \\par}\n';
      return rtf;
    },

    _cqHeaderDocx(plan, ctx) {
      const g = ctx.geometry;
      const options = ctx.options;
      const rightTab = g.rightTab;
      const mid = Math.round(rightTab / 2);
      const pPr = (inner) => '<w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/>' + inner + '</w:pPr>';
      const rPr = (o) => {
        let s = '';
        if (o.bold) s += '<w:b/>';
        if (o.italic) s += '<w:i/>';
        if (o.underline) s += '<w:u w:val="single"/>';
        s += '<w:sz w:val="' + (o.sz || g.baseSz) + '"/><w:szCs w:val="' + (o.sz || g.baseSz) + '"/>';
        return '<w:rPr>' + s + '</w:rPr>';
      };
      const run = (txt, o) => '<w:r>' + rPr(o || {}) + '<w:t xml:space="preserve">' + this.formatDocxText(txt || '', options) + '</w:t></w:r>';
      let xml = '';
      for (const hl of (plan.headerLines || [])) {
        const sz = hl.sz || g.baseSz;
        if (hl.kind === 'metrics') {
          const tabs = hl.center
            ? '<w:tabs><w:tab w:val="center" w:pos="' + mid + '"/><w:tab w:val="right" w:pos="' + rightTab + '"/></w:tabs>'
            : '<w:tabs><w:tab w:val="right" w:pos="' + rightTab + '"/></w:tabs>';
          let inner = '';
          if (hl.text) inner += run(hl.text, { bold: true, sz });
          if (hl.center) inner += '<w:r><w:tab/></w:r>' + run(hl.center, { bold: true, underline: true, sz });
          if (hl.right) inner += '<w:r><w:tab/></w:r>' + run(hl.right, { bold: true, sz });
          if (inner) xml += '<w:p>' + pPr(tabs) + inner + '</w:p>';
          continue;
        }
        const jc = hl.align === 'left' ? '' : '<w:jc w:val="center"/>';
        xml += '<w:p>' + pPr(jc) + run(hl.text, { bold: hl.bold, italic: hl.italic, sz }) + '</w:p>';
      }
      // বিভাজক রেখা
      xml += '<w:p><w:pPr><w:spacing w:before="0" w:after="60" w:line="100" w:lineRule="auto"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="000000"/></w:pBdr></w:pPr></w:p>';
      return xml;
    },

    // ------------------------------------------------- একটি প্রশ্নের RTF ব্লক (৪–৬)
    _cqQuestionRtf(q, ctx) {
      const g = ctx.geometry;
      const options = ctx.options;
      const sz = ctx.sz || g.baseSz;
      const esc = (t) => this.formatRtfText(t, options);
      const rightTab = g.rightTab;
      const line = '\\sl240\\slmult1';
      let rtf = '';

      // (৫) উদ্দীপক — বক্সহীন, কলামের বাম প্রান্ত থেকেই
      for (const ln of String(q.preContext || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
        rtf += '{\\ql\\f0\\fs' + sz + line + '\\sb0\\sa15 ' + esc(ln) + '\\par}\n';
      }

      const sp = this._cqSplitStimulus(q);
      // (৪) ক্রমিক নম্বর বাম প্রান্তে, ট্যাবের পর লেখা; হ্যাঙ্গিং 432 → নম্বরের নিচে র‍্যাপ করে না
      rtf += '{\\ql\\b\\fs' + sz + '\\f0' + line + '\\sb30\\sa0\\li' + g.indent + '\\fi-' + g.indent +
        '\\tx' + g.indent + '\\tqr\\tx' + rightTab + ' ' + esc(q.num + '।') + '\\tab ' + esc(sp.firstLineText) + '\\par}\n';

      for (const sLine of sp.remaining) {
        const t = sLine.trim();
        if (t.startsWith('|') && t.endsWith('|')) {
          if (t.includes('---')) continue;
          const cells = t.split('|').map((c) => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
          const colWidth = Math.floor(g.colW / Math.max(1, cells.length));
          let row = '{\\trowd\\trgaph30\\trleft0';   // কমপ্যাক্ট প্যাডিং, অটো-উইডথ ছক — শেডিং নেই
          let x = 0;
          for (let i = 0; i < cells.length; i++) { x += colWidth; row += '\\cellx' + x; }
          for (const cell of cells) row += '\\pard\\intbl\\qc\\fs' + sz + '\\f0 ' + esc(cell) + '\\cell';
          rtf += row + '\\row}\n';
          continue;
        }
        rtf += '{\\ql\\f0\\fs' + sz + line + '\\sb15\\sa20 ' + esc(t) + '\\par}\n';
      }

      for (const sub of (q.subQuestions || [])) {
        if (sub && sub.isAlternative) {
          // (৬) বিকল্প প্রশ্নের মাঝে সেন্টারে বোল্ড অথবা-ডিভাইডার
          rtf += '{\\qc\\b\\f0\\fs' + sz + line + '\\sb20\\sa20 ' + esc(sub.text || '--- অথবা ---') + '\\par}\n';
          continue;
        }
        const mark = (sub && sub.mark) ? esc(sub.mark) : '';
        let subTextRtf = esc((sub.label ? sub.label + '. ' : '') + (sub.text || ''));
        // OCR এক লাইনে গুঁজে দেওয়া (খ)/(গ) আলাদা লাইনে বসে (অপরিবর্তিত আচরণ)
        const parts = subTextRtf.replace(/\s*\(খ\)\s*/g, '\n(খ) ').replace(/\s*\(গ\)\s*/g, '\n(গ) ').split('\n');
        parts.forEach((piece, i) => {
          const isLast = i === parts.length - 1;
          rtf += '{\\ql\\f0\\fs' + sz + line + '\\sb' + (i === 0 ? '15' : '0') + '\\sa' + (isLast ? '15' : '0') +
            '\\li' + g.subIndent + '\\fi-' + g.subHanging + '\\tx' + (g.subIndent - g.subHanging) +
            (isLast && mark ? '\\tqr\\tx' + rightTab + ' ' + piece + '\\tab ' + mark : ' ' + piece) + '\\par}\n';
        });
      }

      for (const stmt of (q.statements || [])) {
        rtf += '{\\ql\\f0\\fs' + sz + line + '\\sb0\\sa15\\li' + g.indent + ' ' + esc(stmt) + '\\par}\n';
      }

      const opts = q.options || [];
      if (opts.length) {
        // CQ পাথেও অপশন থাকলে ২-২ করে সারি (Part-9b-এর নিয়ম), ট্যাব কলাম-প্রস্থ থেকে
        const half = Math.round(g.colW / 2);
        for (let oi = 0; oi < opts.length; oi += 2) {
          const isLastRow = oi + 2 >= opts.length;
          let rowRtf = '(' + esc(opts[oi].label) + ') ' + esc(opts[oi].text);
          if (opts[oi + 1]) rowRtf += '\\tab (' + esc(opts[oi + 1].label) + ') ' + esc(opts[oi + 1].text);
          rtf += '{\\ql\\f0\\fs' + sz + line + '\\sb0\\sa' + (isLastRow ? '20' : '0') +
            '\\li' + g.indent + '\\fi-' + g.indent + '\\tx' + g.indent + '\\tx' + half + ' ' + rowRtf + '\\par}\n';
        }
      }
      return rtf;
    },

    /**
     * Generates Board Standard Creative Question (CQ) Word 2003 (.doc) RTF.
     * Part-11 মাস্টার লেআউট: A4 ল্যান্ডস্কেপ ২-কলাম বুকলেট — প্ল্যানার যে কলাম
     * দিয়েছে সেটিই একটি ছাপা পৃষ্ঠা, প্রতিটির আগে {\column}; ব্যাক কভারের
     * সংরক্ষিত কলাম ফাঁকা থাকলে কেবল একটি লিডিং ব্রেক বসে।
     */
    generateCqExamRtf(parsedData, options = {}) {
      options = this._withAuditNote(options, parsedData);
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      const plan = this._cqPlan(parsedData, options);
      const g = plan.geometry;
      const ctx = { geometry: g, options, sz: plan.font ? plan.font.sz : g.baseSz };

      let rtf = '';
      if (!options.returnInnerRtf) {
        rtf += '{\\rtf1\\ansi\\deff0\n';
        rtf += '{\\fonttbl\n{\\f0\\fnil\\fcharset0 ' + fontName + ';}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n';
        rtf += '{\\colortbl;\\red0\\green0\\blue0;}\n';
        rtf += this._cqPageSetupRtf(g) + '\n';
      }

      let firstCol = true;
      for (const col of plan.columns) {
        if (!col.items || (!col.items.length && !col.headerFirst)) continue;
        if (!firstCol || plan.skipFirstColumn) rtf += '{\\column}\n';
        firstCol = false;
        if (col.headerFirst) rtf += this._cqHeaderRtf(plan, options);
        for (const it of col.items) {
          rtf += it.kind === 'sectionTitle'
            ? ('{\\qc\\b\\f0\\fs' + ctx.sz + '\\sl240\\slmult1\\sb40\\sa40 ' + this.formatRtfText(it.text, options) + '\\par}\n')
            : this._cqQuestionRtf(it.q, ctx);
        }
      }

      if (!options.returnInnerRtf) rtf += this._auditSectionRtf(options);

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return this._fixRtfSpacing(rtf, g.lineRenderFactor || 1);   // Part-12 (ট্রায়াজ ১)
    },


    /**
     * Generates Board Standard Combined (CQ+MCQ) Word RTF Document.
     * Part-11: সেকশন ১ = সৃজনশীল ল্যান্ডস্কেপ ২-কলাম বুকলেট (মাস্টার লেআউট —
     * CQ পাথের হুবহু একই প্ল্যান), এরপর \sect\sbkpage → সেকশন ২ = MCQ A4 পোর্ট্রেট
     * (Part-10 হেডার সেকশন + কন্টিনিউয়াস ২-কলাম বডি)। আগের সংস্করণ MCQ-কে একই
     * ল্যান্ডস্কেপ সেটআপে \page দিয়ে বসাত — ফলে অর্ধেক পোর্ট্রেট পত্র ল্যান্ডস্কেপে বের হতো।
     */
    generateCombinedExamRtf(parsedCq, parsedMcq, options = {}) {
      options = this._withAuditNote(options, parsedCq, parsedMcq);
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      const cqPlan = this._cqPlan(parsedCq, options);

      let rtf = '';
      rtf += '{\\rtf1\\ansi\\deff0\n';
      rtf += '{\\fonttbl\n{\\f0\\fnil\\fcharset0 ' + fontName + ';}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n';
      rtf += '{\\colortbl;\\red0\\green0\\blue0;}\n';
      // ---- সেকশন ১: CQ বুকলেট (A4 ল্যান্ডস্কেপ, ২ কলাম, 0.7" গ্যাপ) ----
      rtf += this._cqPageSetupRtf(cqPlan.geometry) + '\n';
      rtf += this.generateCqExamRtf(parsedCq, { ...options, returnInnerRtf: true, isCombined: true, auditNote: null });

      if (parsedMcq && parsedMcq.sections && parsedMcq.sections.length > 0) {
        // ---- সেকশন ২: MCQ পোর্ট্রেট — next-page সেকশন ব্রেক; নিজস্ব প্রপার্টি MCQ-র ----
        rtf += '\\sect\\sbkpage\n';
        rtf += this.generateMcqExamRtf(parsedMcq, { ...options, returnInnerRtf: true, isCombined: true, auditNote: null });
      }

      if (!options.returnInnerRtf) rtf += this._auditSectionRtf(options);

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },


    // ------------------------------------------------- একটি প্রশ্নের DOCX ব্লক (৪–৬)
    _cqQuestionDocx(q, ctx) {
      const g = ctx.geometry;
      const options = ctx.options;
      const sz = ctx.sz || g.baseSz;
      const szCs = '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/>';
      const rightTab = g.rightTab;
      const tabsXml = (extra) => '<w:tabs>' + (extra || '') + '<w:tab w:val="right" w:pos="' + rightTab + '"/></w:tabs>';
      const run = (txt, inner) => '<w:r><w:rPr>' + (inner || '') + szCs + '</w:rPr><w:t xml:space="preserve">' + this.formatDocxText(txt, options) + '</w:t></w:r>';
      let xml = '';

      // (৫) উদ্দীপক — বক্স/শেডিং ছাড়া সাদামাটা লেখা
      for (const ln of String(q.preContext || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
        xml += '<w:p><w:pPr><w:spacing w:before="0" w:after="20" w:line="240" w:lineRule="auto"/></w:pPr>' + this.renderDocxRuns(ln, options, { sz }) + '</w:p>';
      }

      const sp = this._cqSplitStimulus(q);
      // (৪) নম্বর কলামের বাম প্রান্তে + হ্যাঙ্গিং 432
      xml += '<w:p><w:pPr><w:spacing w:before="60" w:after="20" w:line="240" w:lineRule="auto"/>' +
        '<w:ind w:left="' + g.indent + '" w:hanging="' + g.indent + '"/>' +
        tabsXml('<w:tab w:val="left" w:pos="' + g.indent + '"/>') + '</w:pPr>' +
        run(q.num + '।', '<w:b/>') + '<w:r><w:tab/></w:r>' + this.renderDocxRuns(sp.firstLineText, options, { sz, bold: true }) + '</w:p>';

      let inTable = false;
      const closeTable = () => { if (inTable) { xml += '</w:tbl>'; inTable = false; } };
      for (const sLine of sp.remaining) {
        const t = sLine.trim();
        if (t.startsWith('|') && t.endsWith('|')) {
          if (t.includes('---')) continue;
          const cells = t.split('|').map((c) => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
          if (!inTable) {
            // (৫) সাদামাটা ছক: অটো উইডথ, ১.৫pt (30 twips) প্যাডিং, শেডিং/হেডার-সারি নেই
            xml += '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:jc w:val="center"/>' +
              '<w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="30" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="30" w:type="dxa"/></w:tblCellMar>' +
              '<w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr><w:tblGrid>';
            for (let i = 0; i < cells.length; i++) xml += '<w:gridCol w:w="' + Math.floor(g.colW / cells.length) + '"/>';
            xml += '</w:tblGrid>';
            inTable = true;
          }
          xml += '<w:tr>';
          for (const cell of cells) {
            xml += '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>' + this.renderDocxRuns(cell, options, { sz }) + '</w:p></w:tc>';
          }
          xml += '</w:tr>';
          continue;
        }
        closeTable();
        xml += '<w:p><w:pPr><w:spacing w:before="15" w:after="20" w:line="240" w:lineRule="auto"/></w:pPr>' + this.renderDocxRuns(t, options, { sz }) + '</w:p>';
      }
      closeTable();

      for (const sub of (q.subQuestions || [])) {
        if (sub && sub.isAlternative) {
          // (৬) মাঝে সেন্টারে বোল্ড অথবা-ডিভাইডার
          xml += '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>' + run(sub.text || '--- অথবা ---', '<w:b/>') + '</w:p>';
          continue;
        }
        let rawText = (sub.label ? sub.label + '. ' : '') + (sub.text || '');
        rawText = rawText.replace(/\s*\((খ|গ)\)\s*/g, '\n($1) ');
        const subLines = String(rawText).split('\n');
        subLines.forEach((sl, i) => {
          const isFirst = i === 0;
          const isLast = i === subLines.length - 1;
          xml += '<w:p><w:pPr><w:spacing w:before="' + (isFirst ? '15' : '0') + '" w:after="' + (isLast ? '15' : '0') + '" w:line="240" w:lineRule="auto"/>' +
            '<w:ind w:left="' + g.subIndent + '" w:hanging="' + g.subHanging + '"/>' +
            (isLast && sub.mark ? tabsXml('<w:tab w:val="left" w:pos="' + (g.subIndent - g.subHanging) + '"/>')
              : '<w:tabs><w:tab w:val="left" w:pos="' + (g.subIndent - g.subHanging) + '"/></w:tabs>') +
            '</w:pPr>' + this.renderDocxRuns(sl, options, { sz }) +
            (isLast && sub.mark ? '<w:r><w:tab/></w:r>' + run(sub.mark, '') : '') + '</w:p>';
        });
      }

      for (const stmt of (q.statements || [])) {
        xml += '<w:p><w:pPr><w:spacing w:before="0" w:after="20" w:line="240" w:lineRule="auto"/><w:ind w:left="' + g.indent + '"/></w:pPr>' + this.renderDocxRuns(stmt, options, { sz }) + '</w:p>';
      }

      const opts = q.options || [];
      if (opts.length) {
        const half = Math.round(g.colW / 2);
        for (let oi = 0; oi < opts.length; oi += 2) {
          const isLastRow = oi + 2 >= opts.length;
          let rowXml = this.renderDocxRuns('(' + opts[oi].label + ') ' + opts[oi].text, options, { sz });
          if (opts[oi + 1]) rowXml += '<w:r><w:tab/></w:r>' + this.renderDocxRuns('(' + opts[oi + 1].label + ') ' + opts[oi + 1].text, options, { sz });
          xml += '<w:p><w:pPr><w:spacing w:before="0" w:after="' + (isLastRow ? '20' : '0') + '" w:line="240" w:lineRule="auto"/>' +
            '<w:ind w:left="' + g.indent + '" w:hanging="' + g.indent + '"/>' +
            '<w:tabs><w:tab w:val="left" w:pos="' + g.indent + '"/><w:tab w:val="left" w:pos="' + half + '"/></w:tabs></w:pPr>' + rowXml + '</w:p>';
        }
      }
      return xml;
    },

    /**
     * Generates Board Standard Creative Question (CQ) Modern Word (.docx).
     * Part-11: জ্যামিতি একই CqBookletPlanner থেকে আসে — ল্যান্ডস্কেপ ২-কলাম
     * বুকলেট, কলামপ্রতি একটি ছাপা পৃষ্ঠা, ৪৩২/৮৬৪ ইনডেন্ট ও রাইট ট্যাবে নম্বর।
     */
    async generateCqExamDocx(parsedData, options = {}) {
      options = this._withAuditNote(options, parsedData);
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      const plan = this._cqPlan(parsedData, options);
      const g = plan.geometry;
      const ctx = { geometry: g, options, sz: plan.font ? plan.font.sz : g.baseSz };

      let bodyXml = '';
      let firstCol = true;
      for (const col of plan.columns) {
        if (!col.items || (!col.items.length && !col.headerFirst)) continue;
        if (!firstCol || plan.skipFirstColumn) bodyXml += '<w:p><w:r><w:br w:type="column"/></w:r></w:p>';
        firstCol = false;
        if (col.headerFirst) bodyXml += this._cqHeaderDocx(plan, ctx);
        for (const it of col.items) {
          bodyXml += it.kind === 'sectionTitle'
            ? ('<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/>' +
              '<w:sz w:val="' + ctx.sz + '"/><w:szCs w:val="' + ctx.sz + '"/></w:rPr><w:t xml:space="preserve">' + this.formatDocxText(it.text, options) + '</w:t></w:r></w:p>')
            : this._cqQuestionDocx(it.q, ctx);
        }
      }

      bodyXml += this._auditSectionDocx(options);

      bodyXml = this._fixDocxSpacing(bodyXml, g.lineRenderFactor || 1);   // Part-12 (ট্রায়াজ ১+৫)
      const sectPr = this._cqSectPrDocx(g);
      if (options.returnInnerXml) {
        return { bodyXml, sectPr };
      }
      return await this._packageDocx(bodyXml + sectPr, fontName);
    },

    // -------------------------------------------------------------------------
    // 2. MULTIPLE CHOICE QUESTION (MCQ) GENERATORS
    // -------------------------------------------------------------------------

    renderMcqTextRtf(text, options = {}) {
      return this.formatRtfText(text, options);
    },

    /**
     * Generates Board Standard MCQ Word RTF Document (Word 2003 .doc).
     *
     * Part-10 (মাস্টার লেআউট ইঞ্জিন): জ্যামিতি এখানে আর হার্ডকোড করা হয় না —
     * McqLayoutPlanner-এর Geometry Plan থেকে মার্জিন (0.5"), কলাম গ্যাপ (0.2"),
     * কলাম লাইন, হ্যাঙ্গিং ইনডেন্ট + নম্বরের পর ট্যাব, সমান দূরত্বের অপশন গ্রিড,
     * ১-পৃষ্ঠা ফিট সংকোচন (১২→১১.৫→১১pt) ও কলাম উচ্চতা-ব্যালান্স সব আসে।
     * ফ্রোজেন টেক্সট/EQ পাথ (formatRtfText / Part-9k) অক্ষত রয়েছে।
     */
    generateMcqExamRtf(parsedData, options = {}) {
      options = this._withAuditNote(options, parsedData);
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let rtf = '';
      if (!options.returnInnerRtf) {
        rtf += '{\\rtf1\\ansi\\deff0\n';
        rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
        rtf += '{\\colortbl;\\red0\\green0\\blue0;}\n';
      }

      const plan = this._mcqPlan(parsedData, options, 'EXAM_MCQ');
      const g = plan.geometry;
      const sz = plan.font.sz;
      const marginTwips = g.margin;
      const pageWidth = g.usableW;
      const indent = g.indent;
      const lineRtf = '\\sl240\\slmult1';  // Part-12: single লাইন (পোস্ট-পাস সব প্যারাগ্রাফে একই রেশিও লক করে)

      // ---- Section 1: হেডার ব্লক — ১-কলাম, সেন্টারড, ৫ লাইন (খ.২–খ.৩) ----
      rtf += `\\paperw${g.pageW}\\paperh${g.pageH}\\margl${marginTwips}\\margr${marginTwips}\\margt${marginTwips}\\margb${marginTwips}\\cols1\n`;

      for (const hl of plan.headerLines) {
        if (hl.kind === 'metrics') {
          const tTxt = hl.text ? this.formatRtfText(hl.text, options) : '';
          const mTxt = hl.right ? this.formatRtfText(hl.right, options) : '';
          const rightX = pageWidth - 100;
          if (hl.center) {
            const eTxt = this.formatRtfText(hl.center, options);
            const midX = Math.round(pageWidth / 2);
            rtf += `{\\ql\\b\\fs${sz}\\f0${lineRtf}\\sb0\\sa0\\tqc\\tx${midX}\\tqr\\tx${rightX} ${tTxt}\\tab {\\b\\ul ${eTxt}}\\tab ${mTxt}\\par}\n`;
          } else {
            rtf += `{\\ql\\b\\fs${sz}\\f0${lineRtf}\\sb0\\sa0\\tqr\\tx${rightX} ${tTxt}${mTxt ? '\\tab ' + mTxt : ''}\\par}\n`;
          }
          continue;
        }
        const hsz = sz + (hl.sizeDelta || 0);
        const align = hl.align === 'center' ? '\\qc' : '\\ql';
        const style = (hl.bold ? '\\b' : '') + (hl.italic ? '\\i' : '');
        rtf += `{${align}${style}\\fs${hsz}\\f0${lineRtf}\\sb0\\sa0 ` + this.formatRtfText(hl.text || '', options) + '\\par}\n';
      }
      // ---- ডিভাইডার: হেডারের নিচে সিঙ্গেল বর্ডার লাইন (খ.৪) ----
      rtf += '{\\ql\\fs4\\f0\\sl100\\slmult1\\sb0\\sa20\\brdrb\\brdrs\\brdrw10\\brsp20 \\par}\n';

      // ---- Section 2: হেডারের পর থেকে সমান ২ কলাম + কলাম লাইন + 0.2" গ্যাপ (গ) ----
      rtf += `\\sect\\sbknone\\paperw${g.pageW}\\paperh${g.pageH}\\margl${marginTwips}\\margr${marginTwips}\\margt${marginTwips}\\margb${marginTwips}\\cols${g.cols}\\colsx${g.colGap}${g.colSep ? '\\linebetcol' : ''}\n`;

      const renderRtfItem = (it) => {
        const q = it.q;
        let block = '';

        if (q.preContext) {
          const ctxLines = String(q.preContext).split('\n').map((l) => l.trim()).filter(Boolean);
          for (const cLine of ctxLines) {
            block += `{\\ql\\b\\i\\fs${sz}\\f0${lineRtf}\\sb20\\sa0\\li0\\fi0 ` + this.formatRtfText(cLine, options) + '\\par}\n';
          }
        }

        // হ্যাঙ্গিং ইনডেন্ট: নম্বর বামে, লেখা ট্যাবের পর indent থেকে; র‍্যাপ হওয়া লাইন
        // নম্বরের নিচে ঢুকবে না (গ.৪ + মাস্টার চুক্তি §১)
        block += `{\\ql\\b\\fs${sz}\\f0${lineRtf}\\sb0\\sa0\\li${indent}\\fi-${indent}\\tx${indent} `
          + this.formatRtfText(String(q.num || '') + '।', options) + '\\tab '
          + this.formatRtfText(q.text || '', options) + '\\par}\n';

        if (q.statements && q.statements.length > 0) {
          for (const stmt of q.statements) {
            block += `{\\ql\\fs${sz}${lineRtf}\\sb0\\sa0\\li${indent} ` + this.renderMcqTextRtf(stmt, options) + '\\par}\n';
          }
        } else if (q.stimulus) {
          const stimLines = String(q.stimulus).split('\n').map((l) => l.trim()).filter(Boolean);
          for (const sLine of stimLines) {
            block += `{\\ql\\b\\i\\fs${sz}\\f0${lineRtf}\\sb0\\sa0\\li0\\fi0 ` + this.formatRtfText(sLine, options) + '\\par}\n';
          }
        }

        // ---- অপশন গ্রিড: সমান দূরত্বের ৪/২/১ কলাম (ঘ.১–ঘ.২) ----
        if (q.options && q.options.length > 0 && it.grid && it.grid.cols > 0) {
          const grid = it.grid;
          const stopsRtf = grid.stops.map((p) => '\\tx' + p).join('');
          for (let r = 0; r < grid.rows.length; r++) {
            const isLastRow = r === grid.rows.length - 1;
            const pieces = [];
            for (const oi of grid.rows[r]) {
              const o = q.options[oi];
              pieces.push('({\\f0 ' + this.formatRtfText(o.label, options) + '}) ' + this.renderMcqTextRtf(o.text, options));
            }
            block += `{\\ql\\fs${sz}${lineRtf}\\sb0\\sa${isLastRow ? '20' : '0'}\\li${indent}${stopsRtf} `
              + pieces.join('\\tab ') + '\\par}\n';
          }
        } else if ((!q.options || q.options.length === 0) && q.subQuestions && q.subQuestions.length > 0) {
          // Part-9b: অপশন না থাকলে subQuestions-এর লাইনগুলোও ছাপা হবে (তথ্য হারাবে না)
          for (const sub of q.subQuestions) {
            if (!sub || !sub.text) continue;
            block += `{\\ql\\fs${sz}${lineRtf}\\sb0\\sa0\\li${indent} `
              + this.renderMcqTextRtf('(' + (sub.label || '') + ') ' + sub.text + (sub.mark ? ' ' + sub.mark : ''), options) + '\\par}\n';
          }
          block += `{\\ql\\fs4\\f0\\sl100\\slmult1\\sb0\\sa20 \\par}\n`;
        }

        return block;
      };

      // পৃষ্ঠা ও কলাম বিন্যাস প্ল্যান থেকে (ঙ.২ — ২য় পৃষ্ঠায়ও ২-কলাম উচ্চতা-ব্যালান্স)
      for (let pi = 0; pi < plan.pages.length; pi++) {
        const pg = plan.pages[pi];
        if (pi > 0) rtf += '\\page\n';
        const byIdx = (list) => list.map((i) => plan.items[i]).filter(Boolean);
        const col1 = byIdx(pg.col1);
        const col2 = byIdx(pg.col2);
        for (const it of col1) rtf += renderRtfItem(it);
        // Part-10: সাধারণত কলাম-ব্রেক দেওয়া হয় না — ক্রমগত বহু-কলাম সেকশনের
        // শেষ পৃষ্ঠা Word/LibreOffice নিজেই উচ্চতা-ব্যালান্স করে (ঙ.২), আর প্রথম
        // পৃষ্ঠা কলাম ১ → কলাম ২ ক্রমে পূরণ হয়। জোরি ব্রেক কেবল options.forceColumnBreaks
        // দিলে (উচ্চতা মডেলের চেয়ে নিখুঁত ভাগ দরকার হলে) বসে।
        if (pg.forceBreak && col2.length > 0) rtf += '\\column\n';
        for (const it of col2) rtf += renderRtfItem(it);
      }

      if (!options.returnInnerRtf) rtf += this._auditSectionRtf(options);

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return this._fixRtfSpacing(rtf, g.lineRenderFactor || 1);   // Part-12 (ট্রায়াজ ১)
    },

    /**
     * Generates Board Standard MCQ Modern Word (.docx) — Part-10 plan-driven.
     * একই Geometry Plan ব্যবহার করে, তাই Word 2003 (.doc), আধুনিক (.docx) ও
     * লাইভ প্রিভিউ তিনটাই হুবহু এক পেজ-বিন্যাস পায়।
     */
    async generateMcqExamDocx(parsedData, options = {}) {
      options = this._withAuditNote(options, parsedData);
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      const plan = this._mcqPlan(parsedData, options, 'EXAM_MCQ');
      const g = plan.geometry;
      const sz = plan.font.sz;
      const marginTwips = g.margin;
      const pageWidth = g.usableW;
      const indent = g.indent;

      let bodyXml = '';

      // ---- 1. হেডার ব্লক (১-কলাম, সেন্টারড, ৫ লাইন + অটো-প্লেসহোল্ডার) ----
      for (const hl of plan.headerLines) {
        const hsz = sz + (hl.sizeDelta || 0);
        if (hl.kind === 'metrics') {
          const rightPos = pageWidth - 100;
          const runs = [];
          if (hl.text) runs.push(this.renderDocxRuns(hl.text, options, { b: true, sz: hsz }));
          if (hl.center) {
            runs.push('<w:r><w:tab/></w:r>');
            runs.push(this.renderDocxRuns(hl.center, options, { b: true, u: true, sz: hsz }));
          }
          if (hl.right) runs.push('<w:r><w:tab/></w:r>');
          if (hl.right) runs.push(this.renderDocxRuns(hl.right, options, { b: true, sz: hsz }));
          const tabs = hl.center
            ? `<w:tabs><w:tab w:val="center" w:pos="${Math.round(pageWidth / 2)}"/><w:tab w:val="right" w:pos="${rightPos}"/></w:tabs>`
            : `<w:tabs><w:tab w:val="right" w:pos="${rightPos}"/></w:tabs>`;
          bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/>${tabs}</w:pPr>${runs.join('')}</w:p>`;
          continue;
        }
        if (!hl.text) continue;
        const jc = hl.align === 'center' ? '<w:jc w:val="center"/>' : '';
        const style = { b: !!hl.bold, i: !!hl.italic, sz: hsz };
        bodyXml += `<w:p><w:pPr>${jc}<w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/></w:pPr>${this.renderDocxRuns(hl.text, options, style)}</w:p>`;
      }
      // ---- ডিভাইডার (খ.৪) ----
      bodyXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="40" w:line="100" w:lineRule="auto"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="000000"/></w:pBdr></w:pPr></w:p>`;

      // হেডার-সেকশন শেষ → অবিচ্ছিন্ন ২-কলাম সেকশনে প্রবেশ
      bodyXml += `
        <w:p>
          <w:pPr>
            <w:sectPr>
              <w:type w:val="continuous"/>
              <w:pgSz w:w="${g.pageW}" w:h="${g.pageH}"/>
              <w:pgMar w:top="${marginTwips}" w:right="${marginTwips}" w:bottom="${marginTwips}" w:left="${marginTwips}"/>
              <w:cols w:num="1"/>
            </w:sectPr>
          </w:pPr>
        </w:p>`;

      const renderDocxItem = (it) => {
        const q = it.q;
        let qXml = '';

        if (q.preContext) {
          const ctxLines = String(q.preContext).split('\n').map((l) => l.trim()).filter(Boolean);
          for (const cLine of ctxLines) {
            qXml += `<w:p><w:pPr><w:spacing w:before="40" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>${this.renderDocxRuns(cLine, options, { b: true, i: true, sz })}</w:p>`;
          }
        }

        // হ্যাঙ্গিং ইনডেন্ট + নম্বরের পর ট্যাব (গ.৪)
        qXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="${indent}" w:hanging="${indent}"/><w:tabs><w:tab w:val="left" w:pos="${indent}"/></w:tabs></w:pPr>`
          + this.renderDocxRuns(String(q.num || '') + '।', options, { b: true, sz })
          + '<w:r><w:tab/></w:r>'
          + this.renderDocxRuns(q.text || '', options, { b: true, sz })
          + '</w:p>';

        if (q.statements && q.statements.length > 0) {
          for (const s of q.statements) {
            qXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="${indent}"/></w:pPr>${this.renderDocxRuns(s, options, { sz })}</w:p>`;
          }
        } else if (q.stimulus) {
          const stimLines = String(q.stimulus).split('\n').map((l) => l.trim()).filter(Boolean);
          for (const sLine of stimLines) {
            qXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="0"/></w:pPr>${this.renderDocxRuns(sLine, options, { b: true, i: true, sz })}</w:p>`;
          }
        }

        // ---- অপশন গ্রিড: সমান ট্যাব স্টপে ৪/২/১ কলাম (ঘ) ----
        if (q.options && q.options.length > 0 && it.grid && it.grid.cols > 0) {
          const grid = it.grid;
          const tabsXml = grid.stops.length
            ? `<w:tabs>${grid.stops.map((p) => `<w:tab w:val="left" w:pos="${p}"/>`).join('')}</w:tabs>`
            : '';
          for (let r = 0; r < grid.rows.length; r++) {
            const isLastRow = r === grid.rows.length - 1;
            let rowXml = '';
            grid.rows[r].forEach((oi, pos) => {
              const o = q.options[oi];
              if (pos > 0) rowXml += '<w:r><w:tab/></w:r>';
              rowXml += this.renderDocxRuns('(' + (o.label || '') + ') ' + (o.text || ''), options, { sz });
            });
            qXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="${isLastRow ? '20' : '0'}" w:line="240" w:lineRule="auto"/><w:ind w:left="${indent}"/>${tabsXml}</w:pPr>${rowXml}</w:p>`;
          }
        } else if ((!q.options || q.options.length === 0) && q.subQuestions && q.subQuestions.length > 0) {
          // Part-9b: অপশন না থাকলে subQuestions-ও ছাপা হবে
          for (let si = 0; si < q.subQuestions.length; si++) {
            const sub = q.subQuestions[si];
            if (!sub || !sub.text) continue;
            const isLast = si === q.subQuestions.length - 1;
            qXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="${isLast ? '20' : '0'}" w:line="240" w:lineRule="auto"/><w:ind w:left="${indent}"/></w:pPr>${this.renderDocxRuns('(' + (sub.label || '') + ') ' + sub.text + (sub.mark ? ' ' + sub.mark : ''), options, { sz })}</w:p>`;
          }
        }

        return qXml;
      };

      // ---- পৃষ্ঠা/কলাম বিন্যাস (ঙ.১ সংকোচন, ঙ.২ ব্যালান্স) প্ল্যান থেকে ----
      const byIdx = (list) => list.map((i) => plan.items[i]).filter(Boolean);
      for (let pi = 0; pi < plan.pages.length; pi++) {
        const pg = plan.pages[pi];
        if (pi > 0) bodyXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
        for (const it of byIdx(pg.col1)) bodyXml += renderDocxItem(it);
        const c2 = byIdx(pg.col2);
        // Part-10: ডক্সেও ডিফল্ট কলাম-ব্রেক নেই (উপরের RTF নোট দেখুন)
        if (pg.forceBreak && c2.length > 0) bodyXml += '<w:p><w:r><w:br w:type="column"/></w:r></w:p>';
        for (const it of c2) bodyXml += renderDocxItem(it);
      }

      bodyXml += this._auditSectionDocx(options);

      // ---- ফাইনাল সেকশন: A4, 0.5" মার্জিন, ২ কলাম, 0.2" গ্যাপ, কলাম লাইন ----
      // Part-10 ক্রিটিক্যাল ফিক্স: `w:type="continuous"` এখানেই বসা জরুরি — এটি বডি
      // সেকশনটিকে হেডারের সঙ্গে এক পৃষ্ঠায় রাখে। না থাকলে ডিফল্ট nextPage প্রশ্নগুলোকে
      // জোর করে ২য় পৃষ্ঠায় ঠেলে দেয় (LibreOffice রেন্ডারে ধরা পড়েছে)।
      const sectPr = `
        <w:sectPr>
          <w:type w:val="continuous"/>
          <w:pgSz w:w="${g.pageW}" w:h="${g.pageH}"/>
          <w:pgMar w:top="${marginTwips}" w:right="${marginTwips}" w:bottom="${marginTwips}" w:left="${marginTwips}" w:header="432" w:footer="432" w:gutter="0"/>
          <w:cols w:num="${g.cols}" w:space="${g.colGap}"${g.colSep ? ' w:sep="1"' : ''}/>
        </w:sectPr>`;

      bodyXml = this._fixDocxSpacing(bodyXml, g.lineRenderFactor || 1);   // Part-12 (ট্রায়াজ ১+৫)
      if (options.returnInnerXml) {
        return { bodyXml, sectPr };
      }
      return await this._packageDocx(bodyXml + sectPr, fontName);
    },

    // -------------------------------------------------------------------------
    // 3. CERTIFICATE / TESTIMONIAL (PROTTOYON) GENERATORS
    // -------------------------------------------------------------------------

    /**
     * Generates Institutional Letterhead Pad Certificate Word RTF Document.
     */
    generateCertificateRtf(cert, options = {}) {
      if (!cert) return '';
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let rtf = '{\\rtf1\\ansi\\deff0\n';
      rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
      rtf += '{\\colortbl;\\red0\\green0\\blue0;}\n';

      const pageWidth = 11906 - 1728; // 10178 twips
      rtf += '\\paperw11906\\paperh16838\\margl864\\margr864\\margt864\\margb720\\cols1\n';

      if (cert.institute) {
        rtf += '{\\qc\\b\\fs50\\f0\\sl360\\slmult1\\sb0\\sa40 ' + this.formatRtfText(cert.institute, options) + '\\par}\n';
      }
      if (cert.location) {
        rtf += '{\\qc\\fs28\\f0\\sl260\\slmult1\\sb0\\sa20 ' + this.formatRtfText(cert.location, options) + '\\par}\n';
      }
      if (cert.details) {
        rtf += '{\\qc\\fs24\\f0\\sl240\\slmult1\\sb0\\sa40 ' + this.formatRtfText(cert.details, options) + '\\par}\n';
      }

      rtf += '{\\ql\\fs4\\f0\\sl100\\slmult1\\sb0\\sa40\\brdrb\\brdrdb\\brdrw20\\brsp40 \\par}\n';

      const memoText = cert.memoNo ? this.formatRtfText('স্মারক নং: ' + cert.memoNo, options) : this.formatRtfText('স্মারক নং: ........................................', options);
      const dateText = cert.date ? this.formatRtfText('তারিখ: ' + cert.date, options) : this.formatRtfText('তারিখ: ........................................', options);
      rtf += '{\\ql\\fs26\\f0\\sl280\\slmult1\\sb40\\sa140\\tqr\\tx' + pageWidth + ' ' + memoText + '\\tab ' + dateText + '\\par}\n';

      if (cert.title) {
        rtf += '{\\qc\\b\\fs36\\f0\\sl360\\slmult1\\sb240\\sa240\\ul ' + this.formatRtfText(cert.title, options) + '\\ulnone\\par}\n';
      }

      for (const p of cert.paragraphs) {
        rtf += '{\\qj\\fs30\\sl440\\slmult1\\sb100\\sa140\\fi720 ' + this.formatRtfText(p, options) + '\\par}\n';
      }

      rtf += '{\\ql\\fs12\\f0\\sl200\\slmult1\\sb240\\sa0 \\par}\n';

      const sigIndent = pageWidth - 3600;
      if (cert.signatory && cert.signatory.length > 0) {
        for (let i = 0; i < cert.signatory.length; i++) {
          const s = cert.signatory[i];
          const isBold = i === 0 || i === 1;
          const boldFlag = isBold ? '\\b' : '';
          rtf += '{\\ql\\fs26\\f0\\sl260\\slmult1\\sb0\\sa20\\li' + sigIndent + ' ' + boldFlag + ' ' + this.formatRtfText(s, options) + '\\par}\n';
        }
      } else {
        rtf += '{\\ql\\b\\fs26\\f0\\sl260\\slmult1\\sb0\\sa20\\li' + sigIndent + ' ' + this.formatRtfText('স্বাক্ষর ও সিলমোহর', options) + '\\par}\n';
      }

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },

    /**
     * Generates Institutional Letterhead Pad Certificate Modern Word (.docx).
     */
    async generateCertificateDocx(cert, options = {}) {
      if (!cert) return null;
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';
      const pageWidth = 10178;

      let bodyXml = '';

      if (cert.institute) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="50"/><w:szCs w:val="50"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(cert.institute, options)}</w:t></w:r></w:p>`;
      }
      if (cert.location) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="260" w:lineRule="auto" w:before="0" w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(cert.location, options)}</w:t></w:r></w:p>`;
      }
      if (cert.details) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(cert.details, options)}</w:t></w:r></w:p>`;
      }

      // Pad divider double border
      bodyXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="80" w:line="100" w:lineRule="auto"/><w:pBdr><w:bottom w:val="double" w:sz="12" w:space="3" w:color="000000"/></w:pBdr></w:pPr></w:p>`;

      const memoText = cert.memoNo ? this.formatDocxText('স্মারক নং: ' + cert.memoNo, options) : this.formatDocxText('স্মারক নং: ........................................', options);
      const dateText = cert.date ? this.formatDocxText('তারিখ: ' + cert.date, options) : this.formatDocxText('তারিখ: ........................................', options);
      bodyXml += `<w:p><w:pPr><w:spacing w:line="280" w:lineRule="auto" w:before="40" w:after="140"/><w:tabs><w:tab w:val="right" w:pos="${pageWidth}"/></w:tabs></w:pPr><w:r><w:rPr><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${memoText}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:rPr><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${dateText}</w:t></w:r></w:p>`;

      if (cert.title) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="360" w:lineRule="auto" w:before="240" w:after="240"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(cert.title, options)}</w:t></w:r></w:p>`;
      }

      for (const p of cert.paragraphs) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="both"/><w:ind w:firstLine="720"/><w:spacing w:line="440" w:lineRule="auto" w:before="100" w:after="140"/></w:pPr><w:r><w:rPr><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(p, options)}</w:t></w:r></w:p>`;
      }

      const sigIndent = pageWidth - 3600;
      if (cert.signatory && cert.signatory.length > 0) {
        for (let i = 0; i < cert.signatory.length; i++) {
          const s = cert.signatory[i];
          const isBold = i === 0 || i === 1;
          const boldXml = isBold ? '<w:b/>' : '';
          bodyXml += `<w:p><w:pPr><w:ind w:left="${sigIndent}"/><w:spacing w:line="260" w:lineRule="auto" w:before="0" w:after="20"/></w:pPr><w:r><w:rPr>${boldXml}<w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(s, options)}</w:t></w:r></w:p>`;
        }
      }

      const sectPr = `
        <w:sectPr>
          <w:pgSz w:w="11906" w:h="16838"/>
          <w:pgMar w:top="864" w:right="864" w:bottom="720" w:left="864" w:header="720" w:footer="720" w:gutter="0"/>
          <w:cols w:num="1"/>
        </w:sectPr>`;

      if (options.returnInnerXml) {
        return { bodyXml, sectPr };
      }
      return await this._packageDocx(bodyXml + sectPr, fontName);
    },

    // -------------------------------------------------------------------------
    // 4. STAMP DEED, APPLICATION, ADMIT CARD & SALARY SLIP GENERATORS
    // -------------------------------------------------------------------------

    generateStampDeedRtf(deed, options = {}) {
      if (!deed) return '';
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let rtf = '{\\rtf1\\ansi\\deff0\n';
      rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
      rtf += '{\\colortbl;\\red0\\green0\\blue0;}\n';

      // Legal Paper: 8.5" x 14" (12240 x 15840 twips), Top Margin 3.5" (5040 twips) for 300 Tk stamp
      rtf += '\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt5040\\margb1440\\cols1\n';

      if (deed.title) {
        rtf += '{\\qc\\b\\fs32\\f0\\sl320\\slmult1\\sb0\\sa200\\ul ' + this.formatRtfText(deed.title, options) + '\\ulnone\\par}\n';
      }

      if (deed.firstParty) {
        rtf += '{\\ql\\fs26\\f0\\sl280\\slmult1\\sb0\\sa60 {\\b ' + this.formatRtfText('১ম পক্ষ (গ্রহীতা/মালিক): ', options) + '}' + this.formatRtfText(deed.firstParty, options) + '\\par}\n';
      }
      if (deed.secondParty) {
        rtf += '{\\ql\\fs26\\f0\\sl280\\slmult1\\sb0\\sa140 {\\b ' + this.formatRtfText('২য় পক্ষ (দাতা/ভাড়াটিয়া): ', options) + '}' + this.formatRtfText(deed.secondParty, options) + '\\par}\n';
      }

      if (deed.preamble) {
        rtf += '{\\qj\\fs24\\f0\\sl300\\slmult1\\sb60\\sa120\\fi720 ' + this.formatRtfText(deed.preamble, options) + '\\par}\n';
      }

      if (deed.clauses && deed.clauses.length > 0) {
        for (let i = 0; i < deed.clauses.length; i++) {
          const cl = deed.clauses[i];
          rtf += '{\\qj\\fs24\\f0\\sl280\\slmult1\\sb40\\sa60\\li360 ' + this.formatRtfText(cl, options) + '\\par}\n';
        }
      }

      if (deed.schedule && (deed.schedule.mouza || (deed.schedule.rows && deed.schedule.rows.length > 0))) {
        rtf += '{\\qc\\b\\fs26\\f0\\sl280\\slmult1\\sb160\\sa80\\ul ' + this.formatRtfText('তফসিল বিবরণ', options) + '\\ulnone\\par}\n';
        if (deed.schedule.district || deed.schedule.mouza) {
          const loc = `জেলা: ${deed.schedule.district || ''}, উপজেলা: ${deed.schedule.thana || ''}, মৌজা: ${deed.schedule.mouza || ''}, জে.এল.নং: ${deed.schedule.jlNo || ''}`;
          rtf += '{\\qc\\fs22\\f0\\sl240\\slmult1\\sb0\\sa100 ' + this.formatRtfText(loc, options) + '\\par}\n';
        }
        if (deed.schedule.rows) {
          for (const row of deed.schedule.rows) {
            rtf += '{\\ql\\fs22\\f0\\sl240\\slmult1\\sb20\\sa20\\li360 ' + this.formatRtfText(row, options) + '\\par}\n';
          }
        }
      }

      if (deed.closing) {
        rtf += '{\\qj\\fs24\\f0\\sl280\\slmult1\\sb140\\sa140\\fi720 ' + this.formatRtfText(deed.closing, options) + '\\par}\n';
      }

      const sigIndent = 12240 - 2880 - 3600;
      rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb240\\sa60 {\\b\\ul ' + this.formatRtfText('স্বাক্ষীগণের স্বাক্ষর:', options) + '\\ulnone}\\par}\n';
      if (deed.witnesses && deed.witnesses.length > 0) {
        for (const w of deed.witnesses) {
          rtf += '{\\ql\\fs22\\f0\\sl220\\slmult1\\sb20\\sa20\\li360 ' + this.formatRtfText(w, options) + '\\par}\n';
        }
      } else {
        rtf += '{\\ql\\fs22\\f0\\sl220\\slmult1\\sb20\\sa20\\li360 ' + this.formatRtfText('(১) নাম: ....................................... পিতা: .......................................', options) + '\\par}\n';
        rtf += '{\\ql\\fs22\\f0\\sl220\\slmult1\\sb20\\sa20\\li360 ' + this.formatRtfText('(২) নাম: ....................................... পিতা: .......................................', options) + '\\par}\n';
      }
      rtf += '{\\ql\\b\\fs24\\f0\\sl240\\slmult1\\sb200\\sa0\\li' + sigIndent + ' ' + this.formatRtfText('সম্পাদনকারীর স্বাক্ষর ও টিপসহি', options) + '\\par}\n';

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },

    async generateStampDeedDocx(deed, options = {}) {
      if (!deed) return null;
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let bodyXml = '';

      if (deed.title) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="320" w:lineRule="auto" w:before="0" w:after="200"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(deed.title, options)}</w:t></w:r></w:p>`;
      }

      if (deed.firstParty) {
        bodyXml += `<w:p><w:pPr><w:spacing w:line="280" w:lineRule="auto" w:before="0" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('১ম পক্ষ (গ্রহীতা/মালিক): ', options)}</w:t></w:r><w:r><w:rPr><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(deed.firstParty, options)}</w:t></w:r></w:p>`;
      }
      if (deed.secondParty) {
        bodyXml += `<w:p><w:pPr><w:spacing w:line="280" w:lineRule="auto" w:before="0" w:after="140"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('২য় পক্ষ (দাতা/ভাড়াটিয়া): ', options)}</w:t></w:r><w:r><w:rPr><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(deed.secondParty, options)}</w:t></w:r></w:p>`;
      }

      if (deed.preamble) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="both"/><w:ind w:firstLine="720"/><w:spacing w:line="300" w:lineRule="auto" w:before="60" w:after="120"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(deed.preamble, options)}</w:t></w:r></w:p>`;
      }

      if (deed.clauses && deed.clauses.length > 0) {
        for (const cl of deed.clauses) {
          bodyXml += `<w:p><w:pPr><w:jc w:val="both"/><w:ind w:left="360"/><w:spacing w:line="280" w:lineRule="auto" w:before="40" w:after="60"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(cl, options)}</w:t></w:r></w:p>`;
        }
      }

      if (deed.schedule && (deed.schedule.mouza || (deed.schedule.rows && deed.schedule.rows.length > 0))) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="280" w:lineRule="auto" w:before="160" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('তফসিল বিবরণ', options)}</w:t></w:r></w:p>`;
        if (deed.schedule.district || deed.schedule.mouza) {
          const loc = `জেলা: ${deed.schedule.district || ''}, উপজেলা: ${deed.schedule.thana || ''}, মৌজা: ${deed.schedule.mouza || ''}, জে.এল.নং: ${deed.schedule.jlNo || ''}`;
          bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="100"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(loc, options)}</w:t></w:r></w:p>`;
        }
        if (deed.schedule.rows) {
          for (const row of deed.schedule.rows) {
            bodyXml += `<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:line="240" w:lineRule="auto" w:before="20" w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(row, options)}</w:t></w:r></w:p>`;
          }
        }
      }

      if (deed.closing) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="both"/><w:ind w:firstLine="720"/><w:spacing w:line="280" w:lineRule="auto" w:before="140" w:after="140"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(deed.closing, options)}</w:t></w:r></w:p>`;
      }

      bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="240" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('স্বাক্ষীগণের স্বাক্ষর:', options)}</w:t></w:r></w:p>`;
      if (deed.witnesses && deed.witnesses.length > 0) {
        for (const w of deed.witnesses) {
          bodyXml += `<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:line="220" w:lineRule="auto" w:before="20" w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(w, options)}</w:t></w:r></w:p>`;
        }
      } else {
        bodyXml += `<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:line="220" w:lineRule="auto" w:before="20" w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('(১) নাম: ....................................... পিতা: .......................................', options)}</w:t></w:r></w:p>`;
        bodyXml += `<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:line="220" w:lineRule="auto" w:before="20" w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('(২) নাম: ....................................... পিতা: .......................................', options)}</w:t></w:r></w:p>`;
      }

      bodyXml += `<w:p><w:pPr><w:ind w:left="5760"/><w:spacing w:line="240" w:lineRule="auto" w:before="200" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('সম্পাদনকারীর স্বাক্ষর ও টিপসহি', options)}</w:t></w:r></w:p>`;

      const sectPr = `
        <w:sectPr>
          <w:pgSz w:w="12240" w:h="15840"/>
          <w:pgMar w:top="5040" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
        </w:sectPr>`;

      if (options.returnInnerXml) {
        return { bodyXml, sectPr };
      }
      return await this._packageDocx(bodyXml + sectPr, fontName);
    },

    generateGovtAppRtf(app, options = {}) {
      if (!app) return '';
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let rtf = '{\\rtf1\\ansi\\deff0\n';
      rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
      rtf += '{\\colortbl;\\red0\\green0\\blue0;}\n';

      rtf += '\\paperw11906\\paperh16838\\margl1440\\margr1440\\margt1440\\margb1440\\cols1\n';

      const memoText = app.memoNo ? this.formatRtfText(app.memoNo, options) : '';
      const dateText = app.date ? this.formatRtfText('তারিখ: ' + app.date, options) : this.formatRtfText('তারিখ: .......................', options);
      const pageWidth = 11906 - 2880;

      if (memoText) {
        rtf += '{\\ql\\fs24\\f0\\sl260\\slmult1\\sb0\\sa100\\tqr\\tx' + pageWidth + ' ' + memoText + '\\tab ' + dateText + '\\par}\n';
      } else {
        rtf += '{\\ql\\fs24\\f0\\sl260\\slmult1\\sb0\\sa100 ' + dateText + '\\par}\n';
      }

      rtf += '{\\ql\\b\\fs24\\f0\\sl260\\slmult1\\sb40\\sa20 ' + this.formatRtfText('বরাবর,', options) + '\\par}\n';
      if (app.receiver && app.receiver.length > 0) {
        for (const rec of app.receiver) {
          rtf += '{\\ql\\fs24\\f0\\sl260\\slmult1\\sb0\\sa20\\li360 ' + this.formatRtfText(rec, options) + '\\par}\n';
        }
      }

      if (app.subject) {
        rtf += '{\\ql\\b\\fs24\\f0\\sl280\\slmult1\\sb140\\sa140 ' + this.formatRtfText('বিষয়: ', options) + '{\\ul ' + this.formatRtfText(app.subject, options) + '\\ulnone}\\par}\n';
      }

      rtf += '{\\ql\\b\\fs24\\f0\\sl260\\slmult1\\sb60\\sa60 ' + this.formatRtfText(app.salutation || 'জনাব,', options) + '\\par}\n';

      if (app.paragraphs && app.paragraphs.length > 0) {
        for (const p of app.paragraphs) {
          rtf += '{\\qj\\fs24\\f0\\sl320\\slmult1\\sb60\\sa100\\fi720 ' + this.formatRtfText(p, options) + '\\par}\n';
        }
      }

      if (app.table && app.table.length > 0) {
        for (const tRow of app.table) {
          rtf += '{\\ql\\fs22\\f0\\sl260\\slmult1\\sb20\\sa20\\li360 ' + this.formatRtfText(tRow, options) + '\\par}\n';
        }
      }

      if (app.prayer) {
        rtf += '{\\qj\\fs24\\f0\\sl320\\slmult1\\sb100\\sa140\\fi720 ' + this.formatRtfText(app.prayer, options) + '\\par}\n';
      }

      const sigIndent = pageWidth - 3600;
      rtf += '{\\ql\\b\\fs24\\f0\\sl260\\slmult1\\sb200\\sa40\\li' + sigIndent + ' ' + this.formatRtfText('বিনীত নিবেদক,', options) + '\\par}\n';
      if (app.applicant && app.applicant.length > 0) {
        for (const a of app.applicant) {
          rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb0\\sa20\\li' + sigIndent + ' ' + this.formatRtfText(a, options) + '\\par}\n';
        }
      }

      if (app.attachments && app.attachments.length > 0) {
        rtf += '{\\ql\\b\\fs22\\f0\\sl240\\slmult1\\sb160\\sa40 ' + this.formatRtfText('সংযুক্তি:', options) + '\\par}\n';
        for (const at of app.attachments) {
          rtf += '{\\ql\\fs22\\f0\\sl220\\slmult1\\sb0\\sa20\\li360 ' + this.formatRtfText(at, options) + '\\par}\n';
        }
      }

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },

    async generateGovtAppDocx(app, options = {}) {
      if (!app) return null;
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';
      const pageWidth = 11906 - 2880;

      let bodyXml = '';

      const memoText = app.memoNo ? this.formatDocxText(app.memoNo, options) : '';
      const dateText = app.date ? this.formatDocxText('তারিখ: ' + app.date, options) : this.formatDocxText('তারিখ: .......................', options);

      if (memoText) {
        bodyXml += `<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:before="0" w:after="100"/><w:tabs><w:tab w:val="right" w:pos="${pageWidth}"/></w:tabs></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${memoText}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${dateText}</w:t></w:r></w:p>`;
      } else {
        bodyXml += `<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:before="0" w:after="100"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${dateText}</w:t></w:r></w:p>`;
      }

      bodyXml += `<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:before="40" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('বরাবর,', options)}</w:t></w:r></w:p>`;
      if (app.receiver && app.receiver.length > 0) {
        for (const rec of app.receiver) {
          bodyXml += `<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:line="260" w:lineRule="auto" w:before="0" w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(rec, options)}</w:t></w:r></w:p>`;
        }
      }

      if (app.subject) {
        bodyXml += `<w:p><w:pPr><w:spacing w:line="280" w:lineRule="auto" w:before="140" w:after="140"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('বিষয়: ', options)}</w:t></w:r><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(app.subject, options)}</w:t></w:r></w:p>`;
      }

      bodyXml += `<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(app.salutation || 'জনাব,', options)}</w:t></w:r></w:p>`;

      if (app.paragraphs && app.paragraphs.length > 0) {
        for (const p of app.paragraphs) {
          bodyXml += `<w:p><w:pPr><w:jc w:val="both"/><w:ind w:firstLine="720"/><w:spacing w:line="320" w:lineRule="auto" w:before="60" w:after="100"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(p, options)}</w:t></w:r></w:p>`;
        }
      }

      if (app.table && app.table.length > 0) {
        for (const tRow of app.table) {
          bodyXml += `<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:line="260" w:lineRule="auto" w:before="20" w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(tRow, options)}</w:t></w:r></w:p>`;
        }
      }

      if (app.prayer) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="both"/><w:ind w:firstLine="720"/><w:spacing w:line="320" w:lineRule="auto" w:before="100" w:after="140"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(app.prayer, options)}</w:t></w:r></w:p>`;
      }

      const sigIndent = pageWidth - 3600;
      bodyXml += `<w:p><w:pPr><w:ind w:left="${sigIndent}"/><w:spacing w:line="260" w:lineRule="auto" w:before="200" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('বিনীত নিবেদক,', options)}</w:t></w:r></w:p>`;
      if (app.applicant && app.applicant.length > 0) {
        for (const a of app.applicant) {
          bodyXml += `<w:p><w:pPr><w:ind w:left="${sigIndent}"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(a, options)}</w:t></w:r></w:p>`;
        }
      }

      if (app.attachments && app.attachments.length > 0) {
        bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="160" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('সংযুক্তি:', options)}</w:t></w:r></w:p>`;
        for (const at of app.attachments) {
          bodyXml += `<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:line="220" w:lineRule="auto" w:before="0" w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(at, options)}</w:t></w:r></w:p>`;
        }
      }

      const sectPr = `
        <w:sectPr>
          <w:pgSz w:w="11906" w:h="16838"/>
          <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
          <w:cols w:num="1"/>
        </w:sectPr>`;

      if (options.returnInnerXml) {
        return { bodyXml, sectPr };
      }
      return await this._packageDocx(bodyXml + sectPr, fontName);
    },

    generateAdmitCardRtf(data, options = {}) {
      if (!data) return '';
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let rtf = '{\\rtf1\\ansi\\deff0\n';
      rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
      rtf += '{\\colortbl;\\red0\\green0\\blue0;\\red26\\green26\\blue46;}\n';

      rtf += '\\paperw11906\\paperh16838\\margl720\\margr720\\margt720\\margb720\\cols1\n';

      const students = (data.students && data.students.length > 0) ? data.students : [{ roll: '...', name: '...', section: '...' }];
      const cardWidth = 11906 - 1440;

      for (let i = 0; i < students.length; i++) {
        const s = students[i];
        if (i > 0 && i % 2 === 0) {
          rtf += '\\page\n';
        }

        rtf += '{\\ql\\fs2\\sl100\\sb60\\sa0\\brdrt\\brdrs\\brdrw15\\brsp20 \\par}\n';
        const inst = data.institute || 'প্রতিষ্ঠানের নাম';
        rtf += '{\\qc\\b\\fs28\\f0\\sl280\\slmult1\\sb40\\sa20 ' + this.formatRtfText(inst, options) + '\\par}\n';
        rtf += '{\\qc\\b\\fs22\\f0\\sl240\\slmult1\\sb0\\sa60 {\\ul ' + this.formatRtfText('প্রবেশপত্র (ADMIT CARD)', options) + '\\ulnone}\\par}\n';

        const examLine = (data.examName || '') + (data.subject ? ' | বিষয়: ' + data.subject : '') + (data.classAndSection ? ' | শ্রেণি: ' + data.classAndSection : '');
        if (examLine) {
          rtf += '{\\qc\\fs22\\f0\\sl240\\slmult1\\sb0\\sa60 ' + this.formatRtfText(examLine, options) + '\\par}\n';
        }

        const rollTxt = 'রোল নং: ' + (s.roll || '...');
        const nameTxt = 'শিক্ষার্থীর নাম: ' + (s.name || '...');
        const secTxt = s.section ? ' | শাখা: ' + s.section : '';
        const regTxt = s.reg ? ' | রেজি: ' + s.reg : '';
        rtf += '{\\ql\\b\\fs24\\f0\\sl260\\slmult1\\sb40\\sa40\\li360 ' + this.formatRtfText(rollTxt + '    ' + nameTxt + secTxt + regTxt, options) + '\\par}\n';

        if (data.date || data.time) {
          const dtTxt = (data.date ? 'তারিখ: ' + data.date : '') + (data.time ? '   সময়: ' + data.time : '');
          rtf += '{\\ql\\fs20\\f0\\sl220\\slmult1\\sb0\\sa40\\li360 ' + this.formatRtfText(dtTxt, options) + '\\par}\n';
        }

        rtf += '{\\ql\\fs20\\f0\\sl240\\slmult1\\sb160\\sa80\\li360\\tqr\\tx' + cardWidth + ' ' + this.formatRtfText('শ্রেণি শিক্ষকের স্বাক্ষর', options) + '\\tab ' + this.formatRtfText('প্রধান শিক্ষক / কেন্দ্র সচিব', options) + '\\par}\n';
        rtf += '{\\ql\\fs2\\sl100\\sb0\\sa140\\brdrb\\brdrs\\brdrw15\\brsp20 \\par}\n';
      }

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },

    async generateAdmitCardDocx(data, options = {}) {
      if (!data) return null;
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let bodyXml = '';
      const students = (data.students && data.students.length > 0) ? data.students : [{ roll: '...', name: '...', section: '...' }];

      for (let i = 0; i < students.length; i++) {
        const s = students[i];
        if (i > 0 && i % 2 === 0) {
          bodyXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
        }

        const inst = data.institute || 'প্রতিষ্ঠানের নাম';
        const examLine = (data.examName || '') + (data.subject ? ' | বিষয়: ' + data.subject : '') + (data.classAndSection ? ' | শ্রেণি: ' + data.classAndSection : '');
        const rollTxt = 'রোল নং: ' + (s.roll || '...');
        const nameTxt = 'শিক্ষার্থীর নাম: ' + (s.name || '...');
        const secTxt = s.section ? ' | শাখা: ' + s.section : '';
        const regTxt = s.reg ? ' | রেজি: ' + s.reg : '';

        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="280" w:lineRule="auto" w:before="60" w:after="20"/><w:pBdr><w:top w:val="single" w:sz="12" w:space="4" w:color="1A1A2E"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(inst, options)}</w:t></w:r></w:p>`;
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('প্রবেশপত্র (ADMIT CARD)', options)}</w:t></w:r></w:p>`;

        if (examLine) {
          bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(examLine, options)}</w:t></w:r></w:p>`;
        }

        bodyXml += `<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:before="40" w:after="20"/><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(rollTxt + '    ' + nameTxt + secTxt + regTxt, options)}</w:t></w:r></w:p>`;

        if (data.date || data.time) {
          const dtTxt = (data.date ? 'তারিখ: ' + data.date : '') + (data.time ? '   সময়: ' + data.time : '');
          bodyXml += `<w:p><w:pPr><w:spacing w:line="220" w:lineRule="auto" w:before="0" w:after="40"/><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(dtTxt, options)}</w:t></w:r></w:p>`;
        }

        const cardWidth = 11906 - 1440;
        bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="160" w:after="60"/><w:ind w:left="360"/><w:tabs><w:tab w:val="right" w:pos="${cardWidth}"/></w:tabs><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="6" w:color="1A1A2E"/></w:pBdr></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('শ্রেণি শিক্ষকের স্বাক্ষর', options)}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('প্রধান শিক্ষক / কেন্দ্র সচিব', options)}</w:t></w:r></w:p>`;
      }

      const sectPr = `
        <w:sectPr>
          <w:pgSz w:w="11906" w:h="16838"/>
          <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/>
          <w:cols w:num="1"/>
        </w:sectPr>`;

      if (options.returnInnerXml) {
        return { bodyXml, sectPr };
      }
      return await this._packageDocx(bodyXml + sectPr, fontName);
    },

    generateSalarySlipRtf(data, options = {}) {
      if (!data) return '';
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let rtf = '{\\rtf1\\ansi\\deff0\n';
      rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
      rtf += '{\\colortbl;\\red0\\green0\\blue0;\\red240\\green240\\blue240;}\n';

      rtf += '\\paperw11906\\paperh16838\\margl1080\\margr1080\\margt1080\\margb1080\\cols1\n';

      const pageWidth = 11906 - 2160;

      if (data.institute) {
        rtf += '{\\qc\\b\\fs32\\f0\\sl320\\slmult1\\sb0\\sa20 ' + this.formatRtfText(data.institute, options) + '\\par}\n';
      }
      rtf += '{\\qc\\b\\fs24\\f0\\sl260\\slmult1\\sb0\\sa20 {\\ul ' + this.formatRtfText('বেতন বিবরণী (SALARY SLIP)', options) + '\\ulnone}\\par}\n';
      if (data.month) {
        rtf += '{\\qc\\fs22\\f0\\sl240\\slmult1\\sb0\\sa100 ' + this.formatRtfText('মাস/সময়কাল: ' + data.month, options) + '\\par}\n';
      }

      const empLine1 = 'নাম: ' + (data.name || '') + (data.employeeId ? ' (আইডি: ' + data.employeeId + ')' : '');
      const empLine2 = (data.designation ? 'পদবি: ' + data.designation : '') + (data.department ? ' | বিভাগ: ' + data.department : '') + (data.joinDate ? ' | যোগদান: ' + data.joinDate : '');
      rtf += '{\\ql\\b\\fs24\\f0\\sl260\\slmult1\\sb40\\sa20 ' + this.formatRtfText(empLine1, options) + '\\par}\n';
      if (empLine2) {
        rtf += '{\\ql\\fs22\\f0\\sl240\\slmult1\\sb0\\sa80 ' + this.formatRtfText(empLine2, options) + '\\par}\n';
      }

      rtf += '{\\ql\\fs4\\f0\\sl100\\slmult1\\sb0\\sa40\\brdrb\\brdrs\\brdrw15\\brsp20 \\par}\n';

      const earnings = data.earnings || [];
      const deductions = data.deductions || [];
      const maxRows = Math.max(earnings.length, deductions.length);
      const halfWidth = Math.round(pageWidth / 2);

      rtf += '{\\ql\\b\\fs22\\f0\\sl260\\slmult1\\sb40\\sa20\\tx' + (halfWidth - 200) + '\\tx' + halfWidth + '\\tx' + pageWidth + ' ' +
        this.formatRtfText('মূল বেতন ও ভাতাসমূহ', options) + '\\tab ' + this.formatRtfText('পরিমাণ', options) + '\\tab ' +
        this.formatRtfText('কর্তনসমূহ', options) + '\\tab ' + this.formatRtfText('পরিমাণ', options) + '\\par}\n';

      for (let r = 0; r < maxRows; r++) {
        const e = earnings[r] || { label: '', amount: '' };
        const d = deductions[r] || { label: '', amount: '' };
        const eLabel = e.label ? this.formatRtfText(e.label, options) : '';
        const eAmt = e.amount !== undefined && e.amount !== null ? this.formatRtfText(String(e.amount), options) : '';
        const dLabel = d.label ? this.formatRtfText(d.label, options) : '';
        const dAmt = d.amount !== undefined && d.amount !== null ? this.formatRtfText(String(d.amount), options) : '';

        rtf += '{\\ql\\fs22\\f0\\sl240\\slmult1\\sb0\\sa20\\tx' + (halfWidth - 400) + '\\tx' + halfWidth + '\\tx' + (pageWidth - 400) + ' ' +
          eLabel + '\\tab ' + eAmt + '\\tab ' + dLabel + '\\tab ' + dAmt + '\\par}\n';
      }

      const totEarn = data.totalEarnings !== undefined ? String(data.totalEarnings) : '';
      const totDed = data.totalDeductions !== undefined ? String(data.totalDeductions) : '';
      const net = data.netSalary !== undefined ? String(data.netSalary) : '';

      rtf += '{\\ql\\fs4\\f0\\sl100\\slmult1\\sb20\\sa20\\brdrb\\brdrs\\brdrw10\\brsp10 \\par}\n';
      rtf += '{\\ql\\b\\fs22\\f0\\sl260\\slmult1\\sb20\\sa40\\tx' + (halfWidth - 400) + '\\tx' + halfWidth + '\\tx' + (pageWidth - 400) + ' ' +
        this.formatRtfText('মোট ভাতা:', options) + '\\tab ' + this.formatRtfText(totEarn, options) + '\\tab ' +
        this.formatRtfText('মোট কর্তন:', options) + '\\tab ' + this.formatRtfText(totDed, options) + '\\par}\n';

      rtf += '{\\ql\\b\\fs26\\f0\\sl300\\slmult1\\sb80\\sa140 ' + this.formatRtfText('সর্বমোট প্রদেয় বেতন (Net Pay): ' + net + ' টাকা', options) + '\\par}\n';

      const col3 = Math.round(pageWidth / 3);
      const col2_3 = col3 * 2;
      rtf += '{\\ql\\fs20\\f0\\sl240\\slmult1\\sb240\\sa0\\tx' + col3 + '\\tx' + col2_3 + '\\tx' + pageWidth + ' ' +
        this.formatRtfText('প্রস্তুতকারক', options) + '\\tab ' +
        this.formatRtfText('হিসাবরক্ষক', options) + '\\tab ' +
        this.formatRtfText('গ্রহণকারী / শিক্ষক', options) + '\\par}\n';

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },

    async generateSalarySlipDocx(data, options = {}) {
      if (!data) return null;
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';
      const pageWidth = 11906 - 2160;

      let bodyXml = '';

      if (data.institute) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="320" w:lineRule="auto" w:before="0" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(data.institute, options)}</w:t></w:r></w:p>`;
      }
      bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="260" w:lineRule="auto" w:before="0" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('বেতন বিবরণী (SALARY SLIP)', options)}</w:t></w:r></w:p>`;
      if (data.month) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="100"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('মাস/সময়কাল: ' + data.month, options)}</w:t></w:r></w:p>`;
      }

      const empLine1 = 'নাম: ' + (data.name || '') + (data.employeeId ? ' (আইডি: ' + data.employeeId + ')' : '');
      const empLine2 = (data.designation ? 'পদবি: ' + data.designation : '') + (data.department ? ' | বিভাগ: ' + data.department : '') + (data.joinDate ? ' | যোগদান: ' + data.joinDate : '');
      bodyXml += `<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:before="40" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(empLine1, options)}</w:t></w:r></w:p>`;
      if (empLine2) {
        bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="80"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(empLine2, options)}</w:t></w:r></w:p>`;
      }

      bodyXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="40" w:line="100" w:lineRule="auto"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="000000"/></w:pBdr></w:pPr></w:p>`;

      const earnings = data.earnings || [];
      const deductions = data.deductions || [];
      const maxRows = Math.max(earnings.length, deductions.length);
      const halfPos = Math.round(pageWidth / 2);

      bodyXml += `<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:before="40" w:after="20"/><w:tabs><w:tab w:val="left" w:pos="${halfPos - 300}"/><w:tab w:val="left" w:pos="${halfPos}"/><w:tab w:val="left" w:pos="${pageWidth - 300}"/></w:tabs></w:pPr>` +
        `<w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('মূল বেতন ও ভাতাসমূহ', options)}</w:t></w:r><w:r><w:tab/></w:r>` +
        `<w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('পরিমাণ', options)}</w:t></w:r><w:r><w:tab/></w:r>` +
        `<w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('কর্তনসমূহ', options)}</w:t></w:r><w:r><w:tab/></w:r>` +
        `<w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('পরিমাণ', options)}</w:t></w:r></w:p>`;

      for (let r = 0; r < maxRows; r++) {
        const e = earnings[r] || { label: '', amount: '' };
        const d = deductions[r] || { label: '', amount: '' };
        const eLabel = e.label ? this.formatDocxText(e.label, options) : '';
        const eAmt = e.amount !== undefined && e.amount !== null ? this.formatDocxText(String(e.amount), options) : '';
        const dLabel = d.label ? this.formatDocxText(d.label, options) : '';
        const dAmt = d.amount !== undefined && d.amount !== null ? this.formatDocxText(String(d.amount), options) : '';

        bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="20"/><w:tabs><w:tab w:val="left" w:pos="${halfPos - 300}"/><w:tab w:val="left" w:pos="${halfPos}"/><w:tab w:val="left" w:pos="${pageWidth - 300}"/></w:tabs></w:pPr>` +
          `<w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${eLabel}</w:t></w:r><w:r><w:tab/></w:r>` +
          `<w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${eAmt}</w:t></w:r><w:r><w:tab/></w:r>` +
          `<w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${dLabel}</w:t></w:r><w:r><w:tab/></w:r>` +
          `<w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${dAmt}</w:t></w:r></w:p>`;
      }

      const totEarn = data.totalEarnings !== undefined ? String(data.totalEarnings) : '';
      const totDed = data.totalDeductions !== undefined ? String(data.totalDeductions) : '';
      const net = data.netSalary !== undefined ? String(data.netSalary) : '';

      bodyXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="20" w:line="100" w:lineRule="auto"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="000000"/></w:pBdr></w:pPr></w:p>`;
      bodyXml += `<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:before="20" w:after="40"/><w:tabs><w:tab w:val="left" w:pos="${halfPos - 300}"/><w:tab w:val="left" w:pos="${halfPos}"/><w:tab w:val="left" w:pos="${pageWidth - 300}"/></w:tabs></w:pPr>` +
        `<w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('মোট ভাতা:', options)}</w:t></w:r><w:r><w:tab/></w:r>` +
        `<w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(totEarn, options)}</w:t></w:r><w:r><w:tab/></w:r>` +
        `<w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('মোট কর্তন:', options)}</w:t></w:r><w:r><w:tab/></w:r>` +
        `<w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(totDed, options)}</w:t></w:r></w:p>`;

      bodyXml += `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto" w:before="80" w:after="140"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('সর্বমোট প্রদেয় বেতন (Net Pay): ' + net + ' টাকা', options)}</w:t></w:r></w:p>`;

      const col3 = Math.round(pageWidth / 3);
      const col2_3 = col3 * 2;
      bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="240" w:after="0"/><w:tabs><w:tab w:val="left" w:pos="${col3}"/><w:tab w:val="left" w:pos="${col2_3}"/></w:tabs></w:pPr>` +
        `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('প্রস্তুতকারক', options)}</w:t></w:r><w:r><w:tab/></w:r>` +
        `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('হিসাবরক্ষক', options)}</w:t></w:r><w:r><w:tab/></w:r>` +
        `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('গ্রহণকারী / শিক্ষক', options)}</w:t></w:r></w:p>`;

      const sectPr = `
        <w:sectPr>
          <w:pgSz w:w="11906" w:h="16838"/>
          <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>
          <w:cols w:num="1"/>
        </w:sectPr>`;

      if (options.returnInnerXml) {
        return { bodyXml, sectPr };
      }
      return await this._packageDocx(bodyXml + sectPr, fontName);
    },

    _getRtfBuilder() {
      if (typeof global !== 'undefined' && global.FayzarRtfBuilder) return global.FayzarRtfBuilder;
      if (typeof window !== 'undefined' && window.FayzarRtfBuilder) return window.FayzarRtfBuilder;
      if (typeof require === 'function') {
        try { return require('../layout-engine/rtf-builder.js'); } catch (e) { }
      }
      return null;
    },

    generateRoutineRtf_v2(routine, options = {}) {
      if (!routine) return '';
      
      const Theme = this._getThemeConfig();
      const Builder = this._getRtfBuilder();
      if (!Theme || !Builder) {
        throw new Error('ThemeConfig or RtfBuilder missing for v2 export');
      }

      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? Theme.FONTS.BIJOY : Theme.FONTS.UNICODE;

      // RTF Document header is tricky for v2 since we want to reuse the exact output format
      // For now, I'll use the legacy header to ensure pixel-perfect match, but using the builder for the body.
      let rtf = '{\\rtf1\\ansi\\deff0\n';
      rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
      rtf += '{\\colortbl;\\red0\\green0\\blue0;\\red240\\green240\\blue240;}\n';
      rtf += '\\landscape\\paperw16838\\paperh11906\\margl720\\margr720\\margt720\\margb720\\cols1\n';

      if (routine.institute) {
        rtf += '{\\qc\\b\\fs32\\f0\\sl320\\slmult1\\sb0\\sa20 ' + this.formatRtfText(routine.institute, options) + '\\par}\n';
      }
      if (routine.title) {
        rtf += '{\\qc\\b\\fs26\\f0\\sl280\\slmult1\\sb0\\sa40\\ul ' + this.formatRtfText(routine.title, options) + '\\ulnone\\par}\n';
      }
      if (routine.classInfo || routine.session) {
        const sub = [routine.classInfo, routine.session].filter(Boolean).join(' | ');
        rtf += '{\\qc\\fs22\\f0\\sl240\\slmult1\\sb0\\sa100 ' + this.formatRtfText(sub, options) + '\\par}\n';
      }

      const headers = routine.headers || ['বার / দিন', '১ম', '২য়', '৩য়', '৪র্থ'];
      const numCols = Math.max(2, headers.length);
      const tableWidth = 16838 - 1440;
      const colW = Math.floor(tableWidth / numCols);

      // Header Row
      let hCells = [];
      for (let c = 0; c < numCols; c++) {
        const text = '{\\pard\\intbl\\qc\\b\\fs22\\f0 ' + this.formatRtfText(headers[c] || '', options);
        hCells.push({ width: colW, content: text, borders: '\\clbrdrt\\brdrs\\brdrw15\\clbrdr\\brdrs\\brdrw15\\clbrdb\\brdrs\\brdrw15\\clbrdl\\brdrs\\brdrw15\\clcbpat2' });
      }
      rtf += Builder.tableRowComplex(hCells);

      // Data Rows
      const rows = routine.rows || [];
      for (const row of rows) {
        let dCells = [];
        for (let c = 0; c < numCols; c++) {
          const val = row[c] || '-';
          const boldFlag = c === 0 ? '\\b' : '';
          const text = '{\\pard\\intbl\\qc\\fs20\\f0 ' + boldFlag + ' ' + this.formatRtfText(val, options);
          dCells.push({ width: colW, content: text, borders: '\\clbrdrt\\brdrs\\brdrw10\\clbrdr\\brdrs\\brdrw10\\clbrdb\\brdrs\\brdrw10\\clbrdl\\brdrs\\brdrw10' });
        }
        rtf += Builder.tableRowComplex(dCells);
      }

      const sigCol = Math.floor(tableWidth / 3);
      rtf += '{\\ql\\fs20\\f0\\sl240\\slmult1\\sb360\\sa0\\tx' + sigCol + '\\tx' + (sigCol * 2) + '\\tx' + tableWidth + ' ' +
        this.formatRtfText('শ্রেণি শিক্ষকের স্বাক্ষর', options) + '\\tab ' +
        this.formatRtfText('রুটিন কমিটির স্বাক্ষর', options) + '\\tab ' +
        this.formatRtfText('প্রধান শিক্ষক / অধ্যক্ষ', options) + '\\par}\n';

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },

    generateRoutineRtf(routine, options = {}) {
      if (!routine) return '';
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let rtf = '{\\rtf1\\ansi\\deff0\n';
      rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
      rtf += '{\\colortbl;\\red0\\green0\\blue0;\\red240\\green240\\blue240;}\n';

      rtf += '\\landscape\\paperw16838\\paperh11906\\margl720\\margr720\\margt720\\margb720\\cols1\n';

      if (routine.institute) {
        rtf += '{\\qc\\b\\fs32\\f0\\sl320\\slmult1\\sb0\\sa20 ' + this.formatRtfText(routine.institute, options) + '\\par}\n';
      }
      if (routine.title) {
        rtf += '{\\qc\\b\\fs26\\f0\\sl280\\slmult1\\sb0\\sa40\\ul ' + this.formatRtfText(routine.title, options) + '\\ulnone\\par}\n';
      }
      if (routine.classInfo || routine.session) {
        const sub = [routine.classInfo, routine.session].filter(Boolean).join(' | ');
        rtf += '{\\qc\\fs22\\f0\\sl240\\slmult1\\sb0\\sa100 ' + this.formatRtfText(sub, options) + '\\par}\n';
      }

      const headers = routine.headers || ['বার / দিন', '১ম', '২য়', '৩য়', '৪র্থ'];
      const numCols = Math.max(2, headers.length);
      const tableWidth = 16838 - 1440;
      const colW = Math.floor(tableWidth / numCols);

      rtf += '\\trowd\\trgaph108\\trleft0';
      for (let c = 1; c <= numCols; c++) {
        rtf += `\\clbrdrt\\brdrs\\brdrw15\\clbrdr\\brdrs\\brdrw15\\clbrdb\\brdrs\\brdrw15\\clbrdl\\brdrs\\brdrw15\\clcbpat2\\cellx${c * colW}`;
      }
      rtf += '\n';
      for (let c = 0; c < numCols; c++) {
        rtf += '{\\pard\\intbl\\qc\\b\\fs22\\f0 ' + this.formatRtfText(headers[c] || '', options) + '\\cell}\n';
      }
      rtf += '{\\row}\n';

      const rows = routine.rows || [];
      for (const row of rows) {
        rtf += '\\trowd\\trgaph108\\trleft0';
        for (let c = 1; c <= numCols; c++) {
          rtf += `\\clbrdrt\\brdrs\\brdrw10\\clbrdr\\brdrs\\brdrw10\\clbrdb\\brdrs\\brdrw10\\clbrdl\\brdrs\\brdrw10\\cellx${c * colW}`;
        }
        rtf += '\n';
        for (let c = 0; c < numCols; c++) {
          const val = row[c] || '-';
          const boldFlag = c === 0 ? '\\b' : '';
          rtf += '{\\pard\\intbl\\qc\\fs20\\f0 ' + boldFlag + ' ' + this.formatRtfText(val, options) + '\\cell}\n';
        }
        rtf += '{\\row}\n';
      }

      const sigCol = Math.floor(tableWidth / 3);
      rtf += '{\\ql\\fs20\\f0\\sl240\\slmult1\\sb360\\sa0\\tx' + sigCol + '\\tx' + (sigCol * 2) + '\\tx' + tableWidth + ' ' +
        this.formatRtfText('শ্রেণি শিক্ষকের স্বাক্ষর', options) + '\\tab ' +
        this.formatRtfText('রুটিন কমিটির স্বাক্ষর', options) + '\\tab ' +
        this.formatRtfText('প্রধান শিক্ষক / অধ্যক্ষ', options) + '\\par}\n';

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },


    _getSchemaValidator() {
      if (typeof global !== 'undefined' && global.FayzarSchemaValidator) return global.FayzarSchemaValidator;
      if (typeof window !== 'undefined' && window.FayzarSchemaValidator) return window.FayzarSchemaValidator;
      if (typeof require === 'function') {
        try { return require('../layout-engine/schema-validator.js'); } catch (e) { }
      }
      return null;
    },

    _getThemeConfig() {
      if (typeof global !== 'undefined' && global.FayzarThemeConfig) return global.FayzarThemeConfig;
      if (typeof window !== 'undefined' && window.FayzarThemeConfig) return window.FayzarThemeConfig;
      if (typeof require === 'function') {
        try { return require('../layout-engine/theme-config.js'); } catch (e) { }
      }
      return null;
    },

    _getDocxBuilder() {
      if (typeof global !== 'undefined' && global.FayzarDocxBuilder) return global.FayzarDocxBuilder;
      if (typeof window !== 'undefined' && window.FayzarDocxBuilder) return window.FayzarDocxBuilder;
      if (typeof require === 'function') {
        try { return require('../layout-engine/docx-builder.js'); } catch (e) { }
      }
      return null;
    },

    async generateRoutineDocx_v2(routine, options = {}) {
      if (!routine) return null;
      
      const Theme = this._getThemeConfig();
      const Builder = this._getDocxBuilder();
      if (!Theme || !Builder) {
        throw new Error('ThemeConfig or DocxBuilder missing for v2 export');
      }

      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? Theme.FONTS.BIJOY : Theme.FONTS.UNICODE;

      let bodyXml = '';

      if (routine.institute) {
        bodyXml += Builder.paragraph(
          Builder.run(this.formatDocxText(routine.institute, options), { bold: true, size: Theme.ROUTINE.FONT_SIZES.INSTITUTE }),
          { jc: 'center', spacing: Theme.ROUTINE.SPACING.INSTITUTE }
        );
      }
      
      if (routine.title) {
        bodyXml += Builder.paragraph(
          Builder.run(this.formatDocxText(routine.title, options), { bold: true, underline: 'single', size: Theme.ROUTINE.FONT_SIZES.TITLE }),
          { jc: 'center', spacing: Theme.ROUTINE.SPACING.TITLE }
        );
      }
      
      if (routine.classInfo || routine.session) {
        const sub = [routine.classInfo, routine.session].filter(Boolean).join(' | ');
        bodyXml += Builder.paragraph(
          Builder.run(this.formatDocxText(sub, options), { size: Theme.ROUTINE.FONT_SIZES.SUBTITLE }),
          { jc: 'center', spacing: Theme.ROUTINE.SPACING.SUBTITLE }
        );
      }

      const headers = routine.headers || ['বার / দিন', '১ম', '২য়', '৩য়', '৪র্থ'];
      const numCols = Math.max(2, headers.length);
      const totalWidth = Theme.ROUTINE.TABLE_WIDTH;
      const colW = Math.floor(totalWidth / numCols);

      let rowsXml = '';
      
      // Header Row
      let headerCellsXml = '';
      for (const h of headers) {
        headerCellsXml += Builder.tableCell(
          Builder.paragraph(
            Builder.run(this.formatDocxText(h, options), { bold: true, size: Theme.ROUTINE.FONT_SIZES.CELL_HEADER }),
            { jc: 'center', spacing: Theme.ROUTINE.SPACING.CELL_HEADER }
          ),
          { width: colW, shading: Theme.ROUTINE.HEADER_SHADING }
        );
      }
      rowsXml += Builder.tableRow(headerCellsXml, { isHeader: true });

      // Data Rows
      const rows = routine.rows || [];
      for (const r of rows) {
        let cellsXml = '';
        for (let c = 0; c < numCols; c++) {
          const val = r[c] || '-';
          const isDayCol = c === 0;
          cellsXml += Builder.tableCell(
            Builder.paragraph(
              Builder.run(this.formatDocxText(val, options), { bold: isDayCol, size: Theme.ROUTINE.FONT_SIZES.CELL_DATA }),
              { jc: 'center', spacing: Theme.ROUTINE.SPACING.CELL_DATA }
            ),
            { width: colW }
          );
        }
        rowsXml += Builder.tableRow(cellsXml);
      }
      
      bodyXml += Builder.table(rowsXml, { width: totalWidth, jc: 'center' });

      // Signatures
      const sigCol = Math.floor(totalWidth / 3);
      bodyXml += Builder.paragraph(
        Builder.run(this.formatDocxText('শ্রেণি শিক্ষকের স্বাক্ষর', options), { size: Theme.ROUTINE.FONT_SIZES.SIGNATURE }) +
        Builder.runTab() +
        Builder.run(this.formatDocxText('রুটিন কমিটির স্বাক্ষর', options), { size: Theme.ROUTINE.FONT_SIZES.SIGNATURE }) +
        Builder.runTab() +
        Builder.run(this.formatDocxText('প্রধান শিক্ষক / অধ্যক্ষ', options), { size: Theme.ROUTINE.FONT_SIZES.SIGNATURE }),
        { 
          spacing: Theme.ROUTINE.SPACING.SIGNATURE,
          tabs: [{ val: 'left', pos: sigCol }, { val: 'left', pos: sigCol * 2 }]
        }
      );

      const sectPr = Builder.sectionProperties({ page: Theme.PAGE.LANDSCAPE });

      if (options.returnInnerXml) {
        return { bodyXml, sectPr };
      }
      return await this._packageDocx(bodyXml + sectPr, fontName);
    },

    async generateRoutineDocx(routine, options = {}) {
      if (!routine) return null;
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let bodyXml = '';

      if (routine.institute) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="320" w:lineRule="auto" w:before="0" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(routine.institute, options)}</w:t></w:r></w:p>`;
      }
      if (routine.title) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="280" w:lineRule="auto" w:before="0" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(routine.title, options)}</w:t></w:r></w:p>`;
      }
      if (routine.classInfo || routine.session) {
        const sub = [routine.classInfo, routine.session].filter(Boolean).join(' | ');
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="100"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(sub, options)}</w:t></w:r></w:p>`;
      }

      const headers = routine.headers || ['বার / দিন', '১ম', '২য়', '৩য়', '৪র্থ'];
      const numCols = Math.max(2, headers.length);
      const totalWidth = 15398;
      const colW = Math.floor(totalWidth / numCols);

      bodyXml += `<w:tbl><w:tblPr><w:tblW w:w="${totalWidth}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tblBorders></w:tblPr>`;

      bodyXml += `<w:tr><w:trPr><w:tblHeader/></w:trPr>`;
      for (const h of headers) {
        bodyXml += `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="E2E8F0"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(h, options)}</w:t></w:r></w:p></w:tc>`;
      }
      bodyXml += `</w:tr>`;

      const rows = routine.rows || [];
      for (const r of rows) {
        bodyXml += `<w:tr>`;
        for (let c = 0; c < numCols; c++) {
          const val = r[c] || '-';
          const isDayCol = c === 0;
          const boldXml = isDayCol ? '<w:b/>' : '';
          bodyXml += `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="40" w:after="40"/></w:pPr><w:r><w:rPr>${boldXml}<w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(val, options)}</w:t></w:r></w:p></w:tc>`;
        }
        bodyXml += `</w:tr>`;
      }
      bodyXml += `</w:tbl>`;

      const sigCol = Math.floor(totalWidth / 3);
      bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="360" w:after="0"/><w:tabs><w:tab w:val="left" w:pos="${sigCol}"/><w:tab w:val="left" w:pos="${sigCol * 2}"/></w:tabs></w:pPr>` +
        `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('শ্রেণি শিক্ষকের স্বাক্ষর', options)}</w:t></w:r><w:r><w:tab/></w:r>` +
        `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('রুটিন কমিটির স্বাক্ষর', options)}</w:t></w:r><w:r><w:tab/></w:r>` +
        `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('প্রধান শিক্ষক / অধ্যক্ষ', options)}</w:t></w:r></w:p>`;

      const sectPr = `
        <w:sectPr>
          <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
          <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/>
          <w:cols w:num="1"/>
        </w:sectPr>`;

      if (options.returnInnerXml) {
        return { bodyXml, sectPr };
      }
      return await this._packageDocx(bodyXml + sectPr, fontName);
    },

    generateCVRtf(cv, options = {}) {
      if (!cv) return '';
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let rtf = '{\\rtf1\\ansi\\deff0\n';
      rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
      rtf += '{\\colortbl;\\red0\\green0\\blue0;\\red240\\green240\\blue240;}\n';

      rtf += '\\paperw11906\\paperh16838\\margl1080\\margr1080\\margt1080\\margb1080\\cols1\n';
      const pageWidth = 11906 - 2160;

      if (cv.name) {
        rtf += '{\\qc\\b\\fs36\\f0\\sl360\\slmult1\\sb0\\sa20 ' + this.formatRtfText(cv.name, options) + '\\par}\n';
      }
      rtf += '{\\qc\\b\\fs24\\f0\\sl260\\slmult1\\sb0\\sa20 ' + this.formatRtfText(cv.title || 'জীবনবৃত্তান্ত', options) + '\\par}\n';
      if (cv.contact && (cv.contact.phone || cv.contact.email)) {
        const cLine = [cv.contact.phone ? 'মোবাইল: ' + cv.contact.phone : '', cv.contact.email ? 'ইমেইল: ' + cv.contact.email : ''].filter(Boolean).join(' | ');
        rtf += '{\\qc\\fs20\\f0\\sl220\\slmult1\\sb0\\sa40 ' + this.formatRtfText(cLine, options) + '\\par}\n';
      }
      rtf += '{\\ql\\fs4\\f0\\sl100\\slmult1\\sb0\\sa60\\brdrb\\brdrs\\brdrw15\\brsp20 \\par}\n';

      if (cv.personalInfo && cv.personalInfo.length > 0) {
        rtf += '{\\ql\\b\\fs24\\f0\\sl260\\slmult1\\sb60\\sa40 {\\ul ' + this.formatRtfText('ব্যক্তিগত বিবরণী (Personal Details)', options) + '\\ulnone}\\par}\n';
        for (const item of cv.personalInfo) {
          rtf += '{\\ql\\fs22\\f0\\sl240\\slmult1\\sb0\\sa20\\li360\\tx3000 {\\b ' + this.formatRtfText(item.label + ':', options) + '}\\tab ' + this.formatRtfText(item.value, options) + '\\par}\n';
        }
      }

      if (cv.education && cv.education.length > 0) {
        rtf += '{\\ql\\b\\fs24\\f0\\sl260\\slmult1\\sb100\\sa40 {\\ul ' + this.formatRtfText('শিক্ষাগত যোগ্যতা (Educational Qualifications)', options) + '\\ulnone}\\par}\n';
        const col1 = 3000;
        const col2 = 5500;
        const col3 = 7500;
        const col4 = pageWidth;

        rtf += '\\trowd\\trgaph108\\trleft360\\clcbpat2\\cellx' + col1 + '\\clcbpat2\\cellx' + col2 + '\\clcbpat2\\cellx' + col3 + '\\clcbpat2\\cellx' + col4 + '\n';
        rtf += '{\\pard\\intbl\\qc\\b\\fs20\\f0 ' + this.formatRtfText('পরীক্ষার নাম', options) + '\\cell}' +
          '{\\pard\\intbl\\qc\\b\\fs20\\f0 ' + this.formatRtfText('বোর্ড / বিশ্ববিদ্যালয়', options) + '\\cell}' +
          '{\\pard\\intbl\\qc\\b\\fs20\\f0 ' + this.formatRtfText('পাসের সাল', options) + '\\cell}' +
          '{\\pard\\intbl\\qc\\b\\fs20\\f0 ' + this.formatRtfText('জিপিএ / বিভাগ', options) + '\\cell}{\\row}\n';

        for (const ed of cv.education) {
          rtf += '\\trowd\\trgaph108\\trleft360\\cellx' + col1 + '\\cellx' + col2 + '\\cellx' + col3 + '\\cellx' + col4 + '\n';
          rtf += '{\\pard\\intbl\\ql\\fs20\\f0 ' + this.formatRtfText(ed.exam, options) + '\\cell}' +
            '{\\pard\\intbl\\qc\\fs20\\f0 ' + this.formatRtfText(ed.board || '-', options) + '\\cell}' +
            '{\\pard\\intbl\\qc\\fs20\\f0 ' + this.formatRtfText(ed.year || '-', options) + '\\cell}' +
            '{\\pard\\intbl\\qc\\b\\fs20\\f0 ' + this.formatRtfText(ed.gpa || '-', options) + '\\cell}{\\row}\n';
        }
      }

      if (cv.experience && cv.experience.length > 0) {
        rtf += '{\\ql\\b\\fs24\\f0\\sl260\\slmult1\\sb100\\sa40 {\\ul ' + this.formatRtfText('কর্ম অভিজ্ঞতা', options) + '\\ulnone}\\par}\n';
        for (const ex of cv.experience) {
          rtf += '{\\ql\\fs22\\f0\\sl240\\slmult1\\sb0\\sa20\\li540 • ' + this.formatRtfText(ex, options) + '\\par}\n';
        }
      }

      if (cv.skills && cv.skills.length > 0) {
        rtf += '{\\ql\\b\\fs24\\f0\\sl260\\slmult1\\sb100\\sa40 {\\ul ' + this.formatRtfText('দক্ষতা ও প্রশিক্ষণ', options) + '\\ulnone}\\par}\n';
        for (const sk of cv.skills) {
          rtf += '{\\ql\\fs22\\f0\\sl240\\slmult1\\sb0\\sa20\\li540 • ' + this.formatRtfText(sk, options) + '\\par}\n';
        }
      }

      if (cv.declaration) {
        rtf += '{\\ql\\fs20\\f0\\sl240\\slmult1\\sb160\\sa100\\fi360 ' + this.formatRtfText(cv.declaration, options) + '\\par}\n';
      }
      const sigIndent = pageWidth - 2800;
      rtf += '{\\ql\\b\\fs22\\f0\\sl240\\slmult1\\sb240\\sa0\\li' + sigIndent + ' ' + this.formatRtfText('আবেদনকারীর স্বাক্ষর', options) + '\\par}\n';

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },

    async generateCVDocx(cv, options = {}) {
      if (!cv) return null;
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';
      const pageWidth = 11906 - 2160;

      let bodyXml = '';

      if (cv.name) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(cv.name, options)}</w:t></w:r></w:p>`;
      }
      bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="260" w:lineRule="auto" w:before="0" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(cv.title || 'জীবনবৃত্তান্ত', options)}</w:t></w:r></w:p>`;
      if (cv.contact && (cv.contact.phone || cv.contact.email)) {
        const cLine = [cv.contact.phone ? 'মোবাইল: ' + cv.contact.phone : '', cv.contact.email ? 'ইমেইল: ' + cv.contact.email : ''].filter(Boolean).join(' | ');
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="220" w:lineRule="auto" w:before="0" w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(cLine, options)}</w:t></w:r></w:p>`;
      }
      bodyXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="60" w:line="100" w:lineRule="auto"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="000000"/></w:pBdr></w:pPr></w:p>`;

      if (cv.personalInfo && cv.personalInfo.length > 0) {
        bodyXml += `<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:before="60" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('ব্যক্তিগত বিবরণী (Personal Details)', options)}</w:t></w:r></w:p>`;
        for (const item of cv.personalInfo) {
          bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="20"/><w:ind w:left="360"/><w:tabs><w:tab w:val="left" w:pos="3000"/></w:tabs></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(item.label + ':', options)}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(item.value, options)}</w:t></w:r></w:p>`;
        }
      }

      if (cv.education && cv.education.length > 0) {
        bodyXml += `<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:before="100" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('শিক্ষাগত যোগ্যতা (Educational Qualifications)', options)}</w:t></w:r></w:p>`;
        const col1 = 2800;
        const col2 = 2500;
        const col3 = 2000;
        const col4 = pageWidth - (col1 + col2 + col3);

        bodyXml += `<w:tbl><w:tblPr><w:tblW w:w="${pageWidth}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders></w:tblPr>`;

        bodyXml += `<w:tr><w:trPr><w:tblHeader/></w:trPr>` +
          `<w:tc><w:tcPr><w:tcW w:w="${col1}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="E2E8F0"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('পরীক্ষার নাম', options)}</w:t></w:r></w:p></w:tc>` +
          `<w:tc><w:tcPr><w:tcW w:w="${col2}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="E2E8F0"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('বোর্ড / বিশ্ববিদ্যালয়', options)}</w:t></w:r></w:p></w:tc>` +
          `<w:tc><w:tcPr><w:tcW w:w="${col3}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="E2E8F0"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('পাসের সাল', options)}</w:t></w:r></w:p></w:tc>` +
          `<w:tc><w:tcPr><w:tcW w:w="${col4}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="E2E8F0"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('জিপিএ / বিভাগ', options)}</w:t></w:r></w:p></w:tc></w:tr>`;

        for (const ed of cv.education) {
          bodyXml += `<w:tr>` +
            `<w:tc><w:tcPr><w:tcW w:w="${col1}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(ed.exam, options)}</w:t></w:r></w:p></w:tc>` +
            `<w:tc><w:tcPr><w:tcW w:w="${col2}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(ed.board || '-', options)}</w:t></w:r></w:p></w:tc>` +
            `<w:tc><w:tcPr><w:tcW w:w="${col3}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(ed.year || '-', options)}</w:t></w:r></w:p></w:tc>` +
            `<w:tc><w:tcPr><w:tcW w:w="${col4}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(ed.gpa || '-', options)}</w:t></w:r></w:p></w:tc></w:tr>`;
        }
        bodyXml += `</w:tbl>`;
      }

      if (cv.experience && cv.experience.length > 0) {
        bodyXml += `<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:before="100" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('কর্ম অভিজ্ঞতা', options)}</w:t></w:r></w:p>`;
        for (const ex of cv.experience) {
          bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="20"/><w:ind w:left="540"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">• ${this.formatDocxText(ex, options)}</w:t></w:r></w:p>`;
        }
      }

      if (cv.skills && cv.skills.length > 0) {
        bodyXml += `<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:before="100" w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('দক্ষতা ও প্রশিক্ষণ', options)}</w:t></w:r></w:p>`;
        for (const sk of cv.skills) {
          bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="20"/><w:ind w:left="540"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">• ${this.formatDocxText(sk, options)}</w:t></w:r></w:p>`;
        }
      }

      if (cv.declaration) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="both"/><w:ind w:firstLine="360"/><w:spacing w:line="240" w:lineRule="auto" w:before="160" w:after="100"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(cv.declaration, options)}</w:t></w:r></w:p>`;
      }
      const sigIndent = pageWidth - 2800;
      bodyXml += `<w:p><w:pPr><w:ind w:left="${sigIndent}"/><w:spacing w:line="240" w:lineRule="auto" w:before="240" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText('আবেদনকারীর স্বাক্ষর', options)}</w:t></w:r></w:p>`;

      const sectPr = `
        <w:sectPr>
          <w:pgSz w:w="11906" w:h="16838"/>
          <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>
          <w:cols w:num="1"/>
        </w:sectPr>`;

      if (options.returnInnerXml) {
        return { bodyXml, sectPr };
      }
      return await this._packageDocx(bodyXml + sectPr, fontName);
    },

    // -------------------------------------------------------------------------
    // 5. GENERIC GENERATORS
    // -------------------------------------------------------------------------

    generateGenericRtf(rawText, docType = 'GENERAL', options = {}) {
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let rtf = '{\\rtf1\\ansi\\deff0\n';
      rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
      rtf += '{\\colortbl;\\red0\\green0\\blue0;}\n';

      if (docType === 'STAMP_DEED') {
        rtf += '\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt5040\\margb1440\n';
      } else {
        rtf += '\\paperw11906\\paperh16838\\margl1440\\margr1440\\margt1440\\margb1440\n';
      }

      const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          rtf += '\\par\n';
          continue;
        }
        rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(trimmed, options) + '\\par}\n';
      }

      if (!options.returnInnerRtf) rtf += this._auditSectionRtf(options);

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },

    async generateGenericDocx(rawText, docType = 'GENERAL', options = {}) {
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let bodyXml = '';
      const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          bodyXml += '<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto"/></w:pPr></w:p>';
          continue;
        }
        bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(trimmed, options)}</w:t></w:r></w:p>`;
      }

      bodyXml += this._auditSectionDocx(options);

      const topMarg = docType === 'STAMP_DEED' ? '5040' : '1440';
      const pgW = docType === 'STAMP_DEED' ? '12240' : '11906';
      const pgH = docType === 'STAMP_DEED' ? '15840' : '16838';

      const sectPr = `
        <w:sectPr>
          <w:pgSz w:w="${pgW}" w:h="${pgH}"/>
          <w:pgMar w:top="${topMarg}" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
        </w:sectPr>`;

      if (options.returnInnerXml) {
        return { bodyXml, sectPr };
      }
      return await this._packageDocx(bodyXml + sectPr, fontName);
    },

    // -------------------------------------------------------------------------
    // 5. DOCX OPENXML PACKAGER (JSZip)
    // -------------------------------------------------------------------------

    async _packageDocx(bodyAndSectXml, fontName = 'Kalpurush') {
      const JSZip = this._getJSZip();
      if (!JSZip) {
        throw new Error('JSZip library is not available.');
      }

      const zip = new JSZip();

      const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

      const relsMain = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

      const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

      const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
</w:styles>`;

      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
${bodyAndSectXml}
  </w:body>
</w:document>`;

      zip.file("[Content_Types].xml", contentTypes);
      zip.file("_rels/.rels", relsMain);
      zip.file("word/_rels/document.xml.rels", wordRels);
      zip.file("word/styles.xml", stylesXml);
      zip.file("word/document.xml", documentXml);

      if (JSZip.support && JSZip.support.blob) {
        return await zip.generateAsync({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
      } else {
        return await zip.generateAsync({ type: 'nodebuffer' });
      }
    },


    // -------------------------------------------------------------------------
    // 6. VECTOR PDF / BROWSER PRINT ENGINE
    // -------------------------------------------------------------------------

    triggerPdfPrint(containerElementId, title = 'Document') {
      const el = document.getElementById(containerElementId);
      if (!el) return;

      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <script src="js/vendor/tailwindcss.js"></script>
  <link rel="stylesheet" href="css/studio.css">
  <style>
    @page {
      margin: 8mm 10mm;
      size: auto;
    }
    body {
      background: white !important;
      color: black !important;
      font-family: 'Kalpurush', 'SutonnyMJ', sans-serif;
      margin: 0 !important;
      padding: 0 !important;
    }
    .sheet-label, .word-crop-marks, .word-page-break, #word-mini-toolbar {
      display: none !important;
    }
    .paper-sheet {
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-height: auto !important;
      page-break-after: always;
      break-after: page;
    }
    .paper-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .stamp-header-spacer, .qp-col-skip-box {
      border: none !important;
      background: transparent !important;
      color: transparent !important;
    }
    .stamp-header-spacer *, .qp-col-skip-box * {
      visibility: hidden !important;
    }
  </style>
</head>
<body onload="setTimeout(() => { window.focus(); window.print(); }, 250);">
  ${el.innerHTML}
</body>
</html>`);
      frameDoc.close();

      setTimeout(() => {
        try {
          document.body.removeChild(printFrame);
        } catch (e) { }
      }, 60000);
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ExportDualEngine;
  if (typeof window !== 'undefined') window.ExportDualEngine = ExportDualEngine;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
