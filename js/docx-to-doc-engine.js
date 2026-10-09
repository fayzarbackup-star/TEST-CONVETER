/**
 * DOCX to DOC (Word 97-2003) Full Fidelity Converter Engine v2.0
 * Deep Style Inheritance, Theme Color Resolution, Font Sizing, Tables & SutonnyMJ / Unicode Typography
 * 100% Compatible with Microsoft Office Word 2003, 2007, 2010, 2013, 2016, 2019, 2021 & Office 365
 */

(function (global) {
  'use strict';

  // Standard Microsoft Office Theme Color Palette Fallbacks
  const THEME_COLORS = {
    'dark1': '000000',
    'light1': 'FFFFFF',
    'dark2': '1F497D',
    'light2': 'EEECE1',
    'accent1': '4F81BD', // Standard Blue
    'accent2': 'C0504D', // Standard Red
    'accent3': '9BBB59', // Standard Green
    'accent4': '8064A2', // Standard Purple
    'accent5': '4BACC6', // Standard Aqua
    'accent6': 'F79646', // Standard Orange
    'hyperlink': '0000FF',
    'followedHyperlink': '800080'
  };

  /**
   * Part-13.2 (Word 2003 font-metric fix): Cambria Math প্রভৃতি OpenType-math ফন্টের
   * লাইন-বক্স মেট্রিক্স SutonnyMJ-এর (ascent 1150 / descent 350) সঙ্গে মিশলে Word 2003-এর
   * অটো-স্পেসিং ওই লাইনকে ৪০–৫০pt করে ফেলে ⇒ নির্দিষ্ট প্রশ্নে বিশাল ফাঁকা।
   * .doc-HTML-এ সমীকরণ থাকে EQ-field-এ, তাই math-ফন্ট এখানে অপ্রয়োজনীয় —
   * ANSI-নিরাপদ 'Times New Roman'-এ ম্যাপ করা হয়। (কোনো fixed line-height নয় —
   * ভগ্নাংশ/সমীকরণের মাথা কাটার ঝুঁকি শূন্য।)
   */
  function sanitizeFontFamily(name) {
    const s = String(name == null ? '' : name);
    return /cambria\s*math|mathjax|stix\s*(?:two|general)?|latin\s*modern\s*math/i.test(s) ? 'Times New Roman' : s;
  }

  class DocxToDocConverter {
    constructor() {
      this.domParser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
    }

    /**
     * Convert a .docx File/Blob into Word 2003 compatible .doc Blob
     * @param {File|Blob} file 
     * @param {Object} options 
     * @returns {Promise<Object>}
     */
    /**
     * Part-9f (Word-2003 ক্র্যাশ ফিক্স): OMML নোড → Word 97-2003-নিরাপদ HTML।
     * Word 2003 (11.0) `m:` (OMML = Office 2007+) ট্যাগ বোঝে না — Part-9c-তে `.doc`-এ OMML
     * পাঠানোর পর ব্যবহারকারীর Word 2003 ক্র্যাশ করত (Disabled-Items ডায়ালগ)।
     * তাই `.doc`-এ Equation Editor 3.0-এর `EQ` ফিল্ড (2003-নেটিভ, এডিটযোগ্য);
     * `.docx` আগের মতোই OMML রাখে (আধুনিক Word-এ নেটিভ ও এডিটযোগ্য)।
     * @param {Node} node   m:oMath / m:oMathPara নোড
     * @param {string} mode 'eqfield' (ডিফল্ট — **ক্লিন ফিল্ড**: begin+কোড+end একই block-এ,
     *                            separator/ক্যাশ-টেক্সট কিছুই নেই — Part-9i; এডিটে ডুপ অসম্ভব)
     *                     | 'cached' (৯f-এর আচরণ: ফিল্ড-ফলাফলে পড়ার-উপযোগ্য ক্যাশ টেক্সটও থাকে)
     *                     | 'plain'  (ফিল্ড ছাড়াই শুধু ইটালিক পাঠ্য)
     * @returns {string} Word-HTML
     */
    /**
     * Part-9g: Equation Editor-স্টাইল টাইপোগ্রাফি — অক্ষর (a, b, n) ইটালিক, সংখ্যা/চিহ্ন নরমাল।
     * ফাংশন-নাম (sin, log, lim…) গণিতের নিয়মে খাড়া (upright) থাকে।
     * ইনপুট: HTML-escaped রাশি (sup/sub ট্যাগ থাকতে পারে)। আউটপুট: <i> মোড়ানো HTML।
     */
    _styleMathLetters(inner) {
      const FN = /^(sin|cos|tan|cot|sec|csc|log|ln|lim|max|min|exp|det|mod|deg|arcsin|arccos|arctan|sinh|cosh|tanh)$/i;
      return String(inner === undefined || inner === null ? '' : inner)
        .split(/(<[^>]+>)/)
        .map((part) => {
          if (!part) return '';
          if (part.charAt(0) === '<') return part;               // ট্যাগ হুবহু
          return part.replace(/[A-Za-z]+/g, (w) => (FN.test(w) ? w : `<i>${w}</i>`));
        })
        .join('');
    }

    /**
     * Part-9k: EQ ফিল্ড-কোডের ভেতরের চলক-অক্ষরগুলোকে ইটালিক রান করা।
     * কেন কোডে: EQ ফিল্ডের ফলাফল Word সবসময় **null** সেভ করে (Murray Sargent, MS —
     * "EQ fields always have a null field result")। তাই পর্দায় রাশি আঁকা হয়
     * ফিল্ড-কোডের run-ফরম্যাটিং থেকেই। ৯i-তে ক্যাশ-ফলাফল বাদ দেওয়ায় ইটালিক-রান
     * আর কোথাও ছিল না ⇒ স্বাভাবিক ভিউতে অক্ষর খাড়া দেখাত (ব্যবহারকারীর রিপোর্ট)।
     * নিয়ম: `\F` `\S` `\up4` `\do8` জাতীয় সুইচ/অপশন টোকেন ও sin/cos/log… ফাংশন-নাম
     * খাড়া; কেবল সাধারণ চলক-অক্ষর <i>-এ মোড়া; সংখ্যা/চিহ্ন অপরিবর্তিত।
     * নিরাপত্তা: ফরম্যাটিং কেবল রান-লেভেলে — কোডের **অক্ষর হুবহু আগের মতো**, তাই
     * EQ পার্সিং/এডিটিং কিছুই বদলায় না (ট্যাগ কোডের টেক্সট নয়)।
     */
    _styleEqCodeLetters(rawCode) {
      const FN = /^(?:sin|cos|tan|cot|sec|csc|log|ln|lim|max|min|exp|det|mod|deg|arcsin|arccos|arctan|sinh|cosh|tanh)$/i;
      const esc = (x) => this._escapeHtml(x);
      return String(rawCode === undefined || rawCode === null ? '' : rawCode)
        .split(/(\\[A-Za-z]{1,3}\d*|[A-Za-z]+)/g)
        .map((part) => {
          if (!part) return '';
          if (/^\\[A-Za-z]/.test(part)) return esc(part);
          if (/^[A-Za-z]+$/.test(part)) return FN.test(part) ? esc(part) : `<i>${esc(part)}</i>`;
          return esc(part);
        })
        .join('');
    }

    /** Part-13.4 (রিপোর্ট-২): বিজয় টার্গেটে বাংলা-ইউনিকোড → SutonnyMJ (ANSI) — শুধু বাংলা রেঞ্জ */
    _toTargetScript(text, opts) {
      const s = String(text == null ? '' : text);
      if (!s || !opts || !opts.preserveSutonny || opts.direction === 'all_unicode') return s;
      let BC = null;
      try {
        if (typeof BanglaConverter !== 'undefined' && BanglaConverter) BC = BanglaConverter;
        else if (typeof window !== 'undefined' && window.BanglaConverter) BC = window.BanglaConverter;
        else if (typeof globalThis !== 'undefined' && globalThis.BanglaConverter) BC = globalThis.BanglaConverter;
      } catch (e) { BC = null; }
      if (!BC || typeof BC.unicodeToBijoy !== 'function') return s;
      return s.replace(/[\u0980-\u09FF]+/g, (m) => { try { return BC.unicodeToBijoy(m); } catch (e) { return m; } });
    }

    /**
     * Part-13.4 (রিপোর্ট-৩): EQ ফিল্ড-কোডের `\S\up4(...)`/`\S\do4(...)` আর্গুমেন্টকে
     * স্পষ্ট ছোট সাইজ-স্প্যানে মুড়ে দেয় (৮pt = ১২pt-এর ৬৭%)। ৯k-এর নীতিই প্রযোজ্য:
     * EQ-ফিল্ডের দৃশ্যমান রূপ নির্ধারিত হয় ফিল্ড-কোড-রানের ফরম্যাটিং থেকে।
     */
    _wrapEqScriptSizes(html, scriptPt) {
      const s = String(html == null ? '' : html);
      if (!s) return s;
      const pt = scriptPt || '8.0';
      const open = "<span style='font-size:" + pt + "pt'>";
      let out = '', i = 0;
      while (i < s.length) {
        if (s[i] === '\\' && s.startsWith('\\S\\', i)) {
          const m = /^\\S\\(up|do)\d*\(/.exec(s.slice(i));
          if (m) {
            const start = i + m[0].length;
            let depth = 1, j = start;
            while (j < s.length && depth > 0) {
              const ch = s[j];
              if (ch === '<') { const gt = s.indexOf('>', j); if (gt < 0) break; j = gt + 1; continue; }
              if (ch === '(') depth += 1;
              else if (ch === ')') { depth -= 1; if (depth === 0) break; }
              j += 1;
            }
            if (depth === 0) {
              out += s.slice(i, start) + open + s.slice(start, j) + '</span>' + s.slice(j, j + 1);
              i = j + 1;
              continue;
            }
          }
        }
        out += s[i];
        i += 1;
      }
      return out;
    }

    _ommlToLegacyEqHtml(node, mode = 'eqfield', opts = null) {
      try {
        if (!node) return '';
        const EqC = (typeof EquationConverter !== 'undefined') ? EquationConverter
          : (typeof window !== 'undefined' && window.EquationConverter) ? window.EquationConverter : null;
        let eqCode = '';
        if (EqC && typeof EqC._parseOmmlNode === 'function') {
          try { eqCode = String(EqC._parseOmmlNode(node) || '').replace(/\s+/g, ' ').trim(); } catch (e) { eqCode = ''; }
        }
        // Part-13.4 (রিপোর্ট-২): বিজয় .doc-এ ফিল্ড-কোডের ভেতরের বাংলা ডিজিট (৩/৫) →
        // SutonnyMJ ANSI (3/5) — নইলে Word-এ ভগ্নাংশের অঙ্ক/হর ফন্ট-মিসম্যাচ দেখায়
        eqCode = this._toTargetScript(eqCode, opts);

        // দৃশ্যমান ফলাফল-টেক্সট: পড়ার-উপযোগী ম্যাথ (1/2, √(27), x²) —
        // কাঁচা EQ সুইচ (\S\up4(3), \F(1,2)) কখনো যেন চোখে না পড়ে। Word নিজে ফিল্ড
        // পুনঃগণনা করে আসল সমীকরণ আঁকে; অন্য ভিউয়ারে এই পাঠ্যটাই দেখায়।
        let body = '';
        if (EqC && typeof EqC.ommlNodeToEqHtml === 'function') {
          try { body = EqC.ommlNodeToEqHtml(node, 12, true) || ''; } catch (e) { body = ''; }
        }
        if (!body && EqC && typeof EqC.formatEqCodeToWordHtml === 'function') {
          body = EqC.formatEqCodeToWordHtml(eqCode, 12, true);
        }
        if (!body) body = this._escapeHtml(eqCode);
        body = this._toTargetScript(body, opts);   // Part-13.4: বিজয়-টার্গেটে বাংলা → ANSI
        if (body) {
          // ^2 → <sup>2</sup>, _3 → <sub>3</sub> (পাঠ্য আগেই HTML-escape করা, তাই নিরাপদ)
          const inner = body
            .replace(/^<span[^>]*>([\s\S]*)<\/span>$/, '$1')
            .replace(/\^\s*([0-9A-Za-z+\-]{1,6})/g, '<sup>$1</sup>')
            .replace(/_\s*([0-9A-Za-z+\-]{1,6})/g, '<sub>$1</sub>');
          // Part-9g: পুরোটা ইটালিক নয় — কেবল অক্ষর ইটালিক, সংখ্যা/চিহ্ন খাড়া (EE-স্টাইল)
          // Part-13.4 (রিপোর্ট-৩): ঘাত/পদ স্পষ্ট ৮pt-এ (১২pt-এর ৬৭%)
          const _inner2 = inner
            .replace(/<sup>/g, "<sup style='font-size:8.0pt;vertical-align:super;'>")
            .replace(/<sub>/g, "<sub style='font-size:8.0pt;vertical-align:sub;'>");
          body = `<span style="font-family:'Times New Roman',serif;font-size:12pt;">${this._styleMathLetters(_inner2)}</span>`;
        }
        if (!eqCode && !body) return '';
        // EQ সুইচ (\F \R \S \I \B \X \A \U) থাকলে ফিল্ড, নইলে সাধারণ ইটালিক স্প্যান
        const hasSwitches = /\\[FRISBXUA]\b/i.test(eqCode);
        if (mode === 'plain' || !hasSwitches) {
          // Part-9g: অক্ষর ইটালিক, সংখ্যা খাড়া (EE-স্টাইল)
          return `<span style="font-family:'Times New Roman',serif;font-size:12pt;">${this._styleMathLetters(body)}</span>`;
        }
        // Equation Editor 3.0 EQ ফিল্ড — Word 2003-নেটিভ, এডিটযোগ্য।
        // Part-9i (রিভিউয়ার-নির্দেশ, js/docx-handler.js:L1428-এর ক্লিন গঠন):
        //   begin + ` EQ <কোড>` + end — **একই conditional block-এ**; কোনো field-separator নেই,
        //   separator↔end-এ কোনো ক্যাশ-ফলাফল টেক্সটও নেই।
        // কারণ: separator/cached-body থাকলে Word 2003-এ ডাবল-ক্লিক → EE in-place activation-এর
        //   সময় সেই টেক্সট সমীকরণ-ক্যানভাসে ঢুকে মূল রাশির পাশে বসে = ডুপ (ব্যবহারকারীর স্ক্রিনশট)।
        //   EQ display-ফিল্ড — Word খোলার/প্রিন্টের সময় কোড থেকেই আঁকে (MS doc-confirmed)।
        // docMath:'cached' দিলে ৯f-এর পুরোনো আচরণ (separator + ক্যাশ span) ফিরে আসে — fallback।
        if (mode === 'cached') {
          return `<span style="font-family:'Times New Roman',serif;font-size:12pt;">`
            + `<!--[if supportFields]><span style='mso-element:field-begin'></span> EQ ${this._escapeHtml(eqCode)} <span style='mso-element:field-separator'></span><![endif]-->`
            + `<span style="font-style:italic;">${body}</span>`
            + `<!--[if supportFields]><span style='mso-element:field-end'></span><![endif]-->`
            + `</span>`;
        }
        return `<span style="font-family:'Times New Roman',serif;font-size:12pt;">`
          + `<!--[if supportFields]><span class="MsoFieldCode"><span style='mso-element:field-begin'></span><span style='mso-spacerun:yes'>&nbsp;</span>EQ ${this._wrapEqScriptSizes(this._styleEqCodeLetters(eqCode))} <span style='mso-element:field-end'></span></span><![endif]-->`
          + `</span>`;
      } catch (e) { return ''; }
    }

    async convertDocxToDoc(file, options = {}) {
      const opts = Object.assign({
        pageSize: 'a4',        // 'a4', 'legal', 'letter'
        preserveSutonny: true,
        docMath: 'eqfield',    // 9i: 'eqfield' (ডিফল্ট — ক্লিন ফিল্ড: separator/ক্যাশ নেই) | 'cached' (৯f: ক্যাশ-সহ) | 'plain' (ফিল্ড ছাড়া)
        optimizeForQuestionPaper: true,
        includeImages: true,
        onProgress: (percent, msg) => {}
      }, options);

      opts.onProgress(5, "ডকুমেন্ট প্যাকেজ লোড ও আনপ্যাক করা হচ্ছে...");
      let fileData = file;
      if (typeof Blob !== 'undefined' && file instanceof Blob) {
        fileData = await file.arrayBuffer();
      }
      const zip = await JSZip.loadAsync(fileData);

      opts.onProgress(20, "ডকুমেন্ট রিলেশন ও ইমেজ মেটাডাটা প্রসেস হচ্ছে...");
      const relsMap = await this._parseRelationships(zip);
      const mediaMap = await this._loadMediaFiles(zip, relsMap);

      opts.onProgress(35, "স্টাইল শিট ও থিম কালার বিশ্লেষণ হচ্ছে...");
      const stylesXmlStr = await this._getZipFileContent(zip, "word/styles.xml") || "";
      const styleResolver = this._buildStyleResolver(stylesXmlStr);

      opts.onProgress(50, "মূল টেক্সট, প্রশ্নপত্র ও টেবিল স্ট্রাকচার রূপান্তর হচ্ছে...");
      const docXmlStr = await this._getZipFileContent(zip, "word/document.xml");
      if (!docXmlStr) {
        throw new Error("অকার্যকর ওয়ার্ড ফাইল: word/document.xml পাওয়া যায়নি।");
      }

      const docXml = this.domParser.parseFromString(docXmlStr, "application/xml");
      const parsedBody = this._parseDocumentBody(docXml, styleResolver, mediaMap, opts);
      // Part-17.3: হেডার/ফুটার (আগে .doc-এ পুরো হারাত)
      try {
        const hf = await this._parseHeaderFooter(zip, relsMap, docXml, styleResolver, mediaMap, opts);
        parsedBody.headerHtml = hf.header; parsedBody.footerHtml = hf.footer;
      } catch (e) { /* হেডার না পেলে আগের আচরণ */ }

      opts.onProgress(85, "অফিস ২০০৩ কমপ্লায়েন্ট (.doc) আর্কিটেকচার তৈরি হচ্ছে...");
      const docHtml = this._buildWord2003Document(parsedBody, opts);

      const docBlob = new Blob([docHtml], { type: "application/msword;charset=utf-8" });

      const baseName = file.name ? file.name.replace(/\.docx$/i, '') : 'Question_Paper';
      const outputFileName = `${baseName}_Word2003.doc`;

      opts.onProgress(100, "রূপান্তর সফলভাবে সম্পন্ন হয়েছে!");

      return {
        originalName: file.name || 'document.docx',
        outputFileName: outputFileName,
        blob: docBlob,
        convertedBlob: docBlob,
        preview: parsedBody.preview,
        stats: {
          paragraphs: parsedBody.stats.paragraphs,
          tables: parsedBody.stats.tables,
          runs: parsedBody.stats.runs,
          images: Object.keys(mediaMap).length
        }
      };
    }

    async _getZipFileContent(zip, path) {
      const entry = zip.file(path);
      if (!entry) return null;
      return await entry.async("string");
    }

    async _parseRelationships(zip) {
      const relsStr = await this._getZipFileContent(zip, "word/_rels/document.xml.rels");
      const relsMap = {};
      if (!relsStr) return relsMap;

      const relsDoc = this.domParser.parseFromString(relsStr, "application/xml");
      const rels = relsDoc.querySelectorAll("Relationship");
      for (let rel of rels) {
        const id = rel.getAttribute("Id");
        const target = rel.getAttribute("Target");
        const type = rel.getAttribute("Type");
        if (id && target) {
          relsMap[id] = { target, type };
        }
      }
      return relsMap;
    }

    async _loadMediaFiles(zip, relsMap) {
      const mediaMap = {};
      const allZipKeys = Object.keys(zip.files || {});

      for (let id in relsMap) {
        const rel = relsMap[id];
        const isImageRel = (rel.type && rel.type.toLowerCase().includes('/image')) ||
                           (rel.target && /\.(png|jpe?g|gif|bmp|wmf|emf|webp|svg|tiff?)$/i.test(rel.target));
        if (isImageRel) {
          let rawTarget = (rel.target || '').replace(/\\/g, '/');
          let cleanPath = rawTarget.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
          let wordPath = cleanPath.startsWith('word/') ? cleanPath : 'word/' + cleanPath;
          let filenameOnly = cleanPath.split('/').pop().toLowerCase();

          let imgFile = zip.file(wordPath) || zip.file(cleanPath) || zip.file(rawTarget);
          if (!imgFile) {
            const foundKey = allZipKeys.find(k => {
              const lower = k.toLowerCase().replace(/\\/g, '/');
              return lower.endsWith('/' + filenameOnly) || lower === filenameOnly;
            });
            if (foundKey) imgFile = zip.file(foundKey);
          }

          if (imgFile) {
            try {
              const base64Data = await imgFile.async("base64");
              const lowerName = (imgFile.name || cleanPath).toLowerCase();
              let mime = "image/png";
              if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) mime = "image/jpeg";
              else if (lowerName.endsWith('.gif')) mime = "image/gif";
              else if (lowerName.endsWith('.bmp')) mime = "image/bmp";
              else if (lowerName.endsWith('.webp')) mime = "image/webp";
              else if (lowerName.endsWith('.svg')) mime = "image/svg+xml";

              const dataUri = `data:${mime};base64,${base64Data}`;
              mediaMap[id] = dataUri;
              mediaMap[rawTarget] = dataUri;
              mediaMap[cleanPath] = dataUri;
              mediaMap[filenameOnly] = dataUri;
            } catch (e) {
              console.warn("Failed to load image:", rawTarget, e);
            }
          }
        }
      }

      // Direct Archive-Wide Indexing: Ensure 100% of images anywhere in the docx zip are catalogued
      for (const filePath of allZipKeys) {
        if (/\.(png|jpe?g|gif|bmp|wmf|emf|webp|svg|tiff?)$/i.test(filePath)) {
          const filename = filePath.split('/').pop().toLowerCase();
          if (!mediaMap[filename]) {
            try {
              const f = zip.file(filePath);
              if (f) {
                const b64 = await f.async("base64");
                const lower = filePath.toLowerCase();
                let mime = "image/png";
                if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = "image/jpeg";
                else if (lower.endsWith('.gif')) mime = "image/gif";
                else if (lower.endsWith('.bmp')) mime = "image/bmp";
                else if (lower.endsWith('.webp')) mime = "image/webp";
                else if (lower.endsWith('.svg')) mime = "image/svg+xml";

                const uri = `data:${mime};base64,${b64}`;
                mediaMap[filePath] = uri;
                mediaMap[filename] = uri;
                mediaMap['word/' + filename] = uri;
                mediaMap['media/' + filename] = uri;
              }
            } catch (e) {}
          }
        }
      }

      return mediaMap;
    }

    _extractImagesFromNode(node, mediaMap) {
      if (!node || !mediaMap) return "";
      let html = "";
      const foundImages = [];

      const elements = [node, ...(node.getElementsByTagName ? Array.from(node.getElementsByTagName('*')) : [])];
      let currentWidth = null;
      let currentHeight = null;
      let anchor = null;   // Part-17.3: ভাসমান ছবির অবস্থান (wp:anchor) — আগে সাধারণ ছবি হয়ে যেত

      for (let el of elements) {
        const elName = (el.localName || el.nodeName || '').split(':').pop();
        if (elName === 'anchor') {
          const posOf = (axis) => {
            const p = Array.from(el.childNodes || []).find((c) => c.nodeType === 1 && (c.localName || c.nodeName).split(':').pop() === 'position' + axis);
            if (!p) return null;
            const off = Array.from(p.childNodes || []).find((c) => c.nodeType === 1 && (c.localName || c.nodeName).split(':').pop() === 'posOffset');
            return { rel: p.getAttribute('relativeFrom') || 'column', pt: off ? parseInt(off.textContent || '0', 10) / 12700 : 0 };
          };
          const behind = el.getAttribute('behindDoc') === '1';
          anchor = { h: posOf('H'), v: posOf('V'), behind };
        }
        if (elName === 'extent') {
          const cx = parseInt(el.getAttribute("cx") || "0", 10);
          const cy = parseInt(el.getAttribute("cy") || "0", 10);
          if (cx > 0 && cy > 0) {
            currentWidth = (cx / 12700).toFixed(1) + 'pt';
            currentHeight = (cy / 12700).toFixed(1) + 'pt';
          }
        }
        const style = el.getAttribute("style");
        if (style && !currentWidth) {
          const wMatch = style.match(/width:\s*([\d.]+)\s*(pt|in|px)?/i);
          const hMatch = style.match(/height:\s*([\d.]+)\s*(pt|in|px)?/i);
          if (wMatch) currentWidth = wMatch[1] + (wMatch[2] || 'pt');
          if (hMatch) currentHeight = hMatch[1] + (hMatch[2] || 'pt');
        }

        const blipEmbed = el.getAttribute("r:embed") || el.getAttribute("embed") || el.getAttribute("r:link") || el.getAttribute("link");
        if (blipEmbed && mediaMap[blipEmbed]) foundImages.push({ id: blipEmbed, w: currentWidth, h: currentHeight });

        const vmlId = el.getAttribute("r:id") || el.getAttribute("id") || el.getAttribute("src") || el.getAttribute("href");
        if (vmlId && mediaMap[vmlId]) foundImages.push({ id: vmlId, w: currentWidth, h: currentHeight });

        if (typeof el.getAttributeNS === 'function') {
          const relNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
          const nsEmbed = el.getAttributeNS(relNs, "embed");
          const nsId = el.getAttributeNS(relNs, "id");
          if (nsEmbed && mediaMap[nsEmbed]) foundImages.push({ id: nsEmbed, w: currentWidth, h: currentHeight });
          if (nsId && mediaMap[nsId]) foundImages.push({ id: nsId, w: currentWidth, h: currentHeight });
        }
      }

      if (foundImages.length === 0 && node.outerHTML) {
        const matches = node.outerHTML.match(/(?:embed|id|src)=["']([^"']+)["']/gi);
        if (matches) {
          for (let m of matches) {
            const val = m.replace(/^(?:embed|id|src)=["']/i, '').replace(/["']$/, '');
            if (mediaMap[val]) foundImages.push({ id: val, w: currentWidth, h: currentHeight });
          }
        }
      }

      const seen = new Set();
      for (let img of foundImages) {
        if (seen.has(img.id)) continue;
        seen.add(img.id);
        const wAttr = img.w ? `width:${img.w};` : '';
        const hAttr = img.h ? `height:${img.h};` : '';
        if (anchor && anchor.h && anchor.v && img.w && img.h) {
          const relMap = { page: 'page', margin: 'margin', column: 'text', paragraph: 'text', character: 'char', line: 'line' };
          const rh = relMap[anchor.h.rel] || 'text', rv = relMap[anchor.v.rel] || 'text';
          const sid = '_x0000_s' + (1025 + (this._anchorSeq = (this._anchorSeq || 0) + 1));
          const pos = `position:absolute;margin-left:${anchor.h.pt.toFixed(1)}pt;margin-top:${anchor.v.pt.toFixed(1)}pt;width:${img.w};height:${img.h};z-index:${anchor.behind ? -1 : 1};mso-position-horizontal-relative:${rh};mso-position-vertical-relative:${rv}`;
          html += `<!--[if gte vml 1]><v:shape id="${sid}" type="#_x0000_t75" style='${pos}'><v:imagedata src="${mediaMap[img.id]}" o:title=""/><w:wrap type="square"/></v:shape><![endif]--><![if !vml]><span style='mso-ignore:vglayout;position:absolute;z-index:1;left:${anchor.h.pt.toFixed(1)}pt;top:${anchor.v.pt.toFixed(1)}pt;width:${img.w};height:${img.h}'><img src="${mediaMap[img.id]}" style="${wAttr}${hAttr}" alt="Image" v:shapes="${sid}" /></span><![endif]>`;
          continue;
        }
        html += `<img src="${mediaMap[img.id]}" style="${wAttr}${hAttr}max-width:100%;height:auto;display:inline-block;margin:3pt 0;vertical-align:middle;" alt="Image" />`;
      }
      return html;
    }

    _buildStyleResolver(stylesXmlStr) {
      const styles = {};
      const docDefaults = {
        fontFamily: 'SutonnyMJ',
        fontSizePt: 12,
        color: '000000',
        lineHeight: 1.15,
        spaceAfterPt: 0
      };

      if (!stylesXmlStr) {
        return { styles, docDefaults, resolve: () => ({}) };
      }

      const stylesDoc = this.domParser.parseFromString(stylesXmlStr, "application/xml");

      // Document Defaults
      const rPrDef = stylesDoc.querySelector("docDefaults > rPrDefault > rPr");
      if (rPrDef) {
        const sz = rPrDef.querySelector("sz");
        if (sz) {
          const v = parseInt(sz.getAttribute("w:val") || sz.getAttribute("val"), 10);
          if (v) docDefaults.fontSizePt = v / 2;
        }
        const col = rPrDef.querySelector("color");
        if (col) {
          const v = col.getAttribute("w:val") || col.getAttribute("val");
          if (v && v !== 'auto') docDefaults.color = v;
        }
        const rFonts = rPrDef.querySelector("rFonts");
        if (rFonts) {
          const ascii = rFonts.getAttribute("w:ascii") || rFonts.getAttribute("ascii");
          if (ascii) docDefaults.fontFamily = ascii;
        }
      }

      // Named Styles
      const styleNodes = stylesDoc.querySelectorAll("style");
      for (let sNode of styleNodes) {
        const styleId = sNode.getAttribute("w:styleId") || sNode.getAttribute("styleId");
        const type = sNode.getAttribute("w:type") || sNode.getAttribute("type");
        if (!styleId) continue;

        const sData = {
          styleId,
          type,
          isBold: false,
          isItalic: false,
          isUnderline: false,
          fontSizePt: null,
          color: null,
          fontFamily: null,
          align: null,
          spaceBeforePt: null,
          spaceAfterPt: null,
          lineHeight: null
        };

        const rPr = sNode.querySelector("rPr");
        if (rPr) {
          if (rPr.querySelector("b")) sData.isBold = true;
          if (rPr.querySelector("i")) sData.isItalic = true;
          if (rPr.querySelector("u")) sData.isUnderline = true;

          const sz = rPr.querySelector("sz");
          if (sz) {
            const v = parseInt(sz.getAttribute("w:val") || sz.getAttribute("val"), 10);
            if (v) sData.fontSizePt = v / 2;
          }

          const col = rPr.querySelector("color");
          if (col) {
            const v = col.getAttribute("w:val") || col.getAttribute("val");
            const themeCol = col.getAttribute("w:themeColor") || col.getAttribute("themeColor");
            if (v && v !== 'auto') {
              sData.color = v;
            } else if (themeCol && THEME_COLORS[themeCol]) {
              sData.color = THEME_COLORS[themeCol];
            }
          }

          const rFonts = rPr.querySelector("rFonts");
          if (rFonts) {
            sData.fontFamily = rFonts.getAttribute("w:ascii") || rFonts.getAttribute("ascii") || rFonts.getAttribute("w:cs");
          }
        }

        const pPr = sNode.querySelector("pPr");
        if (pPr) {
          const jc = pPr.querySelector("jc");
          if (jc) {
            const val = jc.getAttribute("w:val") || jc.getAttribute("val");
            if (val === 'center') sData.align = 'center';
            else if (val === 'right') sData.align = 'right';
            else if (val === 'both' || val === 'justify') sData.align = 'justify';
            else if (val === 'left') sData.align = 'left';
          }

          const spacing = pPr.querySelector("spacing");
          if (spacing) {
            const before = spacing.getAttribute("w:before") || spacing.getAttribute("before");
            const after = spacing.getAttribute("w:after") || spacing.getAttribute("after");
            const line = spacing.getAttribute("w:line") || spacing.getAttribute("line");
            if (before) sData.spaceBeforePt = parseInt(before, 10) / 20;
            if (after) sData.spaceAfterPt = parseInt(after, 10) / 20;
            if (line) sData.lineHeight = parseInt(line, 10) / 240;
          }
        }

        styles[styleId] = sData;
      }

      return {
        styles,
        docDefaults,
        resolve: (styleId) => styles[styleId] || null
      };
    }

    _parseDocumentBody(docXml, styleResolver, mediaMap, opts) {
      const body = docXml ? (docXml.querySelector("body") || docXml.documentElement) : null;
      let sections = [];
      let currentSectionHtml = [];
      let previewLines = [];
      let stats = { paragraphs: 0, tables: 0, runs: 0 };

      // Find the final body sectPr (direct child or document end)
      let bodyEndSectPr = null;
      if (body) {
        const bodyChildren = body.childNodes;
        for (let i = bodyChildren.length - 1; i >= 0; i--) {
          const c = bodyChildren[i];
          if (c.nodeType === 1 && (c.localName === 'sectPr' || c.nodeName.split(':').pop() === 'sectPr')) {
            bodyEndSectPr = c;
            break;
          }
        }
      }

      const children = body ? body.childNodes : [];
      for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType !== 1) continue;

        const nodeName = node.localName || node.nodeName.split(':').pop();

        if (nodeName === 'p') {
          const pData = this._parseParagraph(node, styleResolver, mediaMap, opts);
          currentSectionHtml.push(pData.html);
          stats.paragraphs++;
          stats.runs += pData.runCount;
          if (pData.text && previewLines.length < 20) {
            previewLines.push(pData.text);
          }

          // Check if paragraph ends with a section break (<w:pPr><w:sectPr>)
          let pSectPr = null;
          const pPr = node.querySelector("pPr") || Array.from(node.childNodes).find(c => c.nodeType === 1 && (c.localName === 'pPr' || c.nodeName.split(':').pop() === 'pPr'));
          if (pPr) {
            pSectPr = pPr.querySelector("sectPr") || Array.from(pPr.childNodes).find(c => c.nodeType === 1 && (c.localName === 'sectPr' || c.nodeName.split(':').pop() === 'sectPr'));
          }

          if (pSectPr) {
            const secSettings = this._parseSectionProperties(pSectPr, opts);
            sections.push({
              html: currentSectionHtml.join('\n'),
              pageSettings: secSettings
            });
            currentSectionHtml = [];
          }
        } else if (nodeName === 'tbl') {
          const tblData = this._parseTable(node, styleResolver, mediaMap, opts);
          currentSectionHtml.push(tblData.html);
          stats.tables++;
          stats.paragraphs += tblData.stats.paragraphs;
          stats.runs += tblData.stats.runs;
        }
      }

      // Add the final section (or default single section)
      const finalSecSettings = this._parseSectionProperties(bodyEndSectPr, opts);
      sections.push({
        html: currentSectionHtml.join('\n'),
        pageSettings: finalSecSettings
      });

      // Backward compatibility: default pageSettings pointing to last/main section
      const mainPageSettings = sections[sections.length - 1].pageSettings;

      return {
        bodyHtml: sections.map(s => s.html).join('\n'),
        sections: sections,
        pageSettings: mainPageSettings,
        preview: previewLines,
        stats: stats
      };
    }

    /** Part-17.3: শেষ সেকশনের ডিফল্ট হেডার/ফুটার → HTML (Word-HTML mso-element) */
    async _parseHeaderFooter(zip, relsMap, docXml, styleResolver, mediaMap, opts) {
      const out = { header: '', footer: '' };
      const body = docXml ? (docXml.querySelector('body') || docXml.documentElement) : null;
      if (!body) return out;
      let sectPr = null;
      for (let i = body.childNodes.length - 1; i >= 0; i--) {
        const c = body.childNodes[i];
        if (c.nodeType === 1 && (c.localName || c.nodeName).split(':').pop() === 'sectPr') { sectPr = c; break; }
      }
      if (!sectPr) return out;
      for (const [kind, refName] of [['header', 'headerReference'], ['footer', 'footerReference']]) {
        const refs = Array.from(sectPr.childNodes).filter((c) => c.nodeType === 1 && (c.localName || c.nodeName).split(':').pop() === refName);
        const ref = refs.find((r) => (r.getAttribute('w:type') || r.getAttribute('type') || 'default') === 'default') || refs[0];
        if (!ref) continue;
        const rid = ref.getAttribute('r:id') || ref.getAttribute('id');
        const rel = rid && relsMap[rid];
        if (!rel || !rel.target) continue;
        const xmlStr = await this._getZipFileContent(zip, 'word/' + rel.target.replace(/^\/?(word\/)?/, ''));
        if (!xmlStr) continue;
        const hx = this.domParser.parseFromString(xmlStr, 'application/xml');
        const root = hx.documentElement;
        const parts = [];
        for (const ch of Array.from(root.childNodes || [])) {
          if (ch.nodeType !== 1) continue;
          const nm = (ch.localName || ch.nodeName).split(':').pop();
          if (nm === 'p') parts.push(this._parseParagraph(ch, styleResolver, mediaMap, opts).html);
          else if (nm === 'tbl') parts.push(this._parseTable(ch, styleResolver, mediaMap, opts).html);
        }
        out[kind] = parts.join('\n');
      }
      return out;
    }

    _parseSectionProperties(sectPr, opts) {
      let width = "8.27in";  // A4 default
      let height = "11.69in";
      let marginTop = "0.6in"; // Optimized for question papers
      let marginBottom = "0.6in";
      let marginLeft = "0.6in";
      let marginRight = "0.6in";
      let cols = 1;
      let colSpace = "0.2in";
      let colSep = false;   // Part-13.3: w:sep="1" থাকলে কলাম-বিভাজক রেখা

      if (opts.pageSize === 'legal') {
        width = "8.5in";
        height = "14in";
      } else if (opts.pageSize === 'letter') {
        width = "8.5in";
        height = "11in";
      }

      const MARGIN_MAP = {
        'normal': { top: '1.0in', right: '1.0in', bottom: '1.0in', left: '1.0in' },
        'narrow': { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
        'moderate': { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
        'wide': { top: '1.25in', right: '1.25in', bottom: '1.25in', left: '1.25in' }
      };

      const selectedMargin = opts.margin || opts.pageMargin;
      if (selectedMargin && MARGIN_MAP[selectedMargin]) {
        marginTop = MARGIN_MAP[selectedMargin].top;
        marginRight = MARGIN_MAP[selectedMargin].right;
        marginBottom = MARGIN_MAP[selectedMargin].bottom;
        marginLeft = MARGIN_MAP[selectedMargin].left;
      }

      if (sectPr) {
        const pgSz = sectPr.querySelector("pgSz");
        if (pgSz) {
          const wTwips = parseInt(pgSz.getAttribute("w:w") || pgSz.getAttribute("w"), 10);
          const hTwips = parseInt(pgSz.getAttribute("w:h") || pgSz.getAttribute("h"), 10);
          if (wTwips) width = (wTwips / 1440).toFixed(2) + "in";
          if (hTwips) height = (hTwips / 1440).toFixed(2) + "in";
        }

        // Section Margins from master docx
        const pgMar = sectPr.querySelector("pgMar");
        if (pgMar) {
          const topTwips = parseInt(pgMar.getAttribute("w:top") || pgMar.getAttribute("top"), 10);
          const bottomTwips = parseInt(pgMar.getAttribute("w:bottom") || pgMar.getAttribute("bottom"), 10);
          const leftTwips = parseInt(pgMar.getAttribute("w:left") || pgMar.getAttribute("left"), 10);
          const rightTwips = parseInt(pgMar.getAttribute("w:right") || pgMar.getAttribute("right"), 10);

          if (topTwips) marginTop = (topTwips / 1440).toFixed(2) + "in";
          if (bottomTwips) marginBottom = (bottomTwips / 1440).toFixed(2) + "in";
          if (leftTwips) marginLeft = (leftTwips / 1440).toFixed(2) + "in";
          if (rightTwips) marginRight = (rightTwips / 1440).toFixed(2) + "in";
        } else if (selectedMargin && MARGIN_MAP[selectedMargin]) {
          marginTop = MARGIN_MAP[selectedMargin].top;
          marginRight = MARGIN_MAP[selectedMargin].right;
          marginBottom = MARGIN_MAP[selectedMargin].bottom;
          marginLeft = MARGIN_MAP[selectedMargin].left;
        }

        const colsEl = sectPr.querySelector("cols");
        if (colsEl) {
          cols = parseInt(colsEl.getAttribute("w:num") || colsEl.getAttribute("num") || "1", 10);
          const spaceTwips = parseInt(colsEl.getAttribute("w:space") || colsEl.getAttribute("space"), 10);
          if (spaceTwips) {
            colSpace = (spaceTwips / 1440).toFixed(2) + "in";
          }
          // Part-13.3: DOCX-এর w:sep="1" = দৃশ্যমান কলাম-রেখা; না থাকলে রেখা নয়
          const sepAttr = colsEl.getAttribute("w:sep") || colsEl.getAttribute("sep");
          colSep = (sepAttr === "1" || sepAttr === "true");
        }
      }

      // Part-17.5: সেকশন শুরুর ধরন — শুধু স্পষ্ট "nextPage" হলে .doc-এ পাতা ভাঙে (হুবহু-মোড: মূলের প্রতি পাতা = নতুন পাতা);
      // অনুপস্থিত হলে আগের আচরণ (একটানা) — চালু প্রশ্নপত্রের .doc অপরিবর্তিত
      let breakType = null;
      if (sectPr) {
        const typeEl = Array.from(sectPr.childNodes || []).find((c) => c.nodeType === 1 && (c.localName || c.nodeName).split(':').pop() === 'type');
        if (typeEl) breakType = typeEl.getAttribute('w:val') || typeEl.getAttribute('val');
      }

      // Part-17.7: পাতার বর্ডার (w:pgBorders) ⇒ Word-HTML @page border/padding। না থাকলে কিছুই যোগ হয় না (চালু আউটপুট অপরিবর্তিত)
      let pageBorderCss = '';
      let pageFrame = null;
      if (sectPr) {
        const pb = Array.from(sectPr.childNodes || []).find((c) => c.nodeType === 1 && (c.localName || c.nodeName).split(':').pop() === 'pgBorders');
        if (pb) {
          const STYLE = { single: 'solid', double: 'double', dotted: 'dotted', dashed: 'dashed', thick: 'solid' };
          const parts = [], pads = {};
          ['top', 'right', 'bottom', 'left'].forEach((side) => {
            const el = Array.from(pb.childNodes || []).find((c) => c.nodeType === 1 && (c.localName || c.nodeName).split(':').pop() === side);
            const val = el && (el.getAttribute('w:val') || el.getAttribute('val'));
            if (!el || !val || val === 'nil' || val === 'none') { pads[side] = 0; return; }
            const sz = parseInt(el.getAttribute('w:sz') || el.getAttribute('sz') || '4', 10);
            const css = STYLE[val] || 'solid';
            const wPt = Math.max(0.5, (css === 'double' ? sz / 8 * 3 : sz / 8));
            parts.push(`border-${side}:${css} windowtext ${wPt.toFixed(1)}pt`);
            pads[side] = parseInt(el.getAttribute('w:space') || el.getAttribute('space') || '0', 10);
          });
          // Part-17.9: Word-HTML আমদানি সবসময় "পাতার কিনারা থেকে" মাপে (সর্বোচ্চ ৩১pt) — "লেখা থেকে" (w:offsetFrom="text")
          // বর্ডার .doc-এ সেভাবে আসে না ⇒ পাতা-স্থির আয়তক্ষেত্র-আকৃতি (VML) হিসেবে ঠিক জায়গায় আঁকা
          const offsetFrom = pb.getAttribute('w:offsetFrom') || pb.getAttribute('offsetFrom');
          const allSame = ['top', 'right', 'bottom', 'left'].every((s) => pads[s] !== undefined);
          if (parts.length && offsetFrom === 'text' && allSame) {
            const inPt = (v) => parseFloat(v) * 72;
            const firstEl = Array.from(pb.childNodes || []).find((c) => c.nodeType === 1);
            const v0 = firstEl ? (firstEl.getAttribute('w:val') || firstEl.getAttribute('val')) : 'single';
            const sz0 = firstEl ? parseInt(firstEl.getAttribute('w:sz') || firstEl.getAttribute('sz') || '4', 10) : 4;
            const x = inPt(marginLeft) - pads.left, y = inPt(marginTop) - pads.top;
            pageFrame = {
              x, y, w: inPt(width) - inPt(marginLeft) - inPt(marginRight) + pads.left + pads.right,
              h: inPt(height) - inPt(marginTop) - inPt(marginBottom) + pads.top + pads.bottom,
              double: v0 === 'double', weightPt: Math.max(0.75, v0 === 'double' ? sz0 / 8 * 3 : sz0 / 8)
            };
          } else if (parts.length) {
            pageBorderCss = '\t' + parts.join(';\n\t') + `;\n\tpadding:${pads.top}.0pt ${pads.right}.0pt ${pads.bottom}.0pt ${pads.left}.0pt;\n` +
              '\tmso-page-border-surround-header:no;\n\tmso-page-border-surround-footer:no;\n';
          }
        }
      }

      return {
        pageBorderCss,
        pageFrame,
        width,
        height,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        cols,
        colSpace,
        colSep,
        breakType
      };
    }

    _parseParagraph(pNode, styleResolver, mediaMap, opts) {
      let pStyles = [];
      let align = 'left';
      let runCount = 0;
      let textContent = "";
      let inheritedStyle = null;

      const pPr = pNode.querySelector("pPr");
      if (pPr) {
        const pStyleNode = pPr.querySelector("pStyle");
        if (pStyleNode) {
          const sId = pStyleNode.getAttribute("w:val") || pStyleNode.getAttribute("val");
          inheritedStyle = styleResolver.resolve(sId);
          if (inheritedStyle) {
            if (inheritedStyle.align) align = inheritedStyle.align;
            if (inheritedStyle.spaceBeforePt !== null) pStyles.push(`margin-top:${inheritedStyle.spaceBeforePt}pt`);
            if (inheritedStyle.spaceAfterPt !== null) pStyles.push(`margin-bottom:${inheritedStyle.spaceAfterPt}pt`);
            if (inheritedStyle.lineHeight !== null) pStyles.push(`line-height:${Math.round(inheritedStyle.lineHeight * 100)}%`);
          }
        }

        const jc = pPr.querySelector("jc");
        if (jc) {
          const val = jc.getAttribute("w:val") || jc.getAttribute("val");
          if (val === 'center') align = 'center';
          else if (val === 'right') align = 'right';
          else if (val === 'both' || val === 'justify') align = 'justify';
          else if (val === 'left') align = 'left';
        }

        const spacing = pPr.querySelector("spacing");
        if (spacing) {
          const before = spacing.getAttribute("w:before") || spacing.getAttribute("before");
          const after = spacing.getAttribute("w:after") || spacing.getAttribute("after");
          const line = spacing.getAttribute("w:line") || spacing.getAttribute("line");

          if (before) pStyles.push(`margin-top:${(parseInt(before, 10)/20).toFixed(1)}pt`);
          if (after) pStyles.push(`margin-bottom:${(parseInt(after, 10)/20).toFixed(1)}pt`);
          // Part-17.5: lineRule মানা — exact/atLeast-এ w:line টুইপ (pt×২০), গুণিতক নয়। আগে সবসময় ÷২৪০ গুণিতক ধরা হতো
          // ⇒ "ঠিক ২৯pt" লাইন হয়ে যেত "২৯ গুণ" (হুবহু-মোডের .doc-এ ৪ পাতা ⇒ ২৯ পাতা)। auto হলে আগের মতো।
          const lineRule = spacing.getAttribute("w:lineRule") || spacing.getAttribute("lineRule") || 'auto';
          if (line && (lineRule === 'exact' || lineRule === 'atLeast')) {
            pStyles.push(`line-height:${(parseInt(line, 10)/20).toFixed(1)}pt`);
            pStyles.push(`mso-line-height-rule:${lineRule === 'exact' ? 'exactly' : 'at-least'}`);
          } else if (line) pStyles.push(`line-height:${Math.round(parseInt(line, 10) / 240 * 100)}%`);
          // Part-19.3: এককহীন গুণক (১.৭০) Word-এর HTML-আমদানি মানে না ⇒ .doc-এ ১.০ হতো; Word নিজে % লেখে (১৭০%)
        }
        // Part-19.3: keepNext → Word-HTML-এর page-break-after:avoid (শিরোনাম পরের লাইন থেকে আলাদা না হয়)
        const keepNext = pPr.querySelector("keepNext");
        if (keepNext && !/^(0|false)$/.test(keepNext.getAttribute("w:val") || keepNext.getAttribute("val") || '')) pStyles.push('page-break-after:avoid');

        const ind = pPr.querySelector("ind");
        if (ind) {
          const left = ind.getAttribute("w:left") || ind.getAttribute("left");
          const right = ind.getAttribute("w:right") || ind.getAttribute("right");
          const firstLine = ind.getAttribute("w:firstLine") || ind.getAttribute("firstLine");
          const hanging = ind.getAttribute("w:hanging") || ind.getAttribute("hanging");

          if (left) pStyles.push(`margin-left:${(parseInt(left, 10)/20).toFixed(1)}pt`);
          if (right) pStyles.push(`margin-right:${(parseInt(right, 10)/20).toFixed(1)}pt`);
          if (firstLine) {
            pStyles.push(`text-indent:${(parseInt(firstLine, 10)/20).toFixed(1)}pt`);
          } else if (hanging) {
            // Negative indent for Word hanging indents (e.g. question numbers)
            pStyles.push(`text-indent:-${(parseInt(hanging, 10)/20).toFixed(1)}pt`);
          }
        }

        // Parse tab stops (w:tabs > w:tab)
        const tabsEl = pPr.querySelector("tabs") || pPr.querySelector("*|tabs");
        // Part-17.3: অনুচ্ছেদের রেখা (pBdr — শিরোনামের নিচের দাগ ইত্যাদি) — আগে হারাত
        const pBdr = Array.from(pPr.childNodes || []).find((c) => c.nodeType === 1 && (c.localName || c.nodeName).split(':').pop() === 'pBdr');
        if (pBdr) {
          const sides = [];
          for (const sd of ['top', 'bottom', 'left', 'right']) {
            const el = Array.from(pBdr.childNodes || []).find((c) => c.nodeType === 1 && (c.localName || c.nodeName).split(':').pop() === sd);
            const v = el && (el.getAttribute('w:val') || el.getAttribute('val'));
            if (!v || v === 'none' || v === 'nil') continue;
            const sz = parseInt(el.getAttribute('w:sz') || el.getAttribute('sz') || '4', 10);
            const col = el.getAttribute('w:color') || el.getAttribute('color');
            const sp = (v === 'double' ? 'double' : 'solid') + ' ' + (col && col !== 'auto' ? '#' + col : 'windowtext') + ' ' + Math.max(0.5, sz / 8).toFixed(1) + 'pt';
            sides.push(sd, sp);
          }
          if (sides.length) {
            pStyles.push('border:none');
            for (let k = 0; k < sides.length; k += 2) {
              pStyles.push(`border-${sides[k]}:${sides[k + 1]}`, `mso-border-${sides[k]}-alt:${sides[k + 1]}`, `padding-${sides[k]}:1.0pt`);
            }
          }
        }

        if (tabsEl) {
          const tabNodes = tabsEl.querySelectorAll("tab, *|tab");
          const tabStops = [];
          for (let tn of tabNodes) {
            const pos = tn.getAttribute("w:pos") || tn.getAttribute("pos");
            const val = tn.getAttribute("w:val") || tn.getAttribute("val") || "left";
            // Part-17.3: ট্যাব-লিডার (……. / ---- / ____) — আগে হারাত
            const leaderRaw = tn.getAttribute("w:leader") || tn.getAttribute("leader") || "";
            const leader = { dot: 'dotted', middleDot: 'dotted', hyphen: 'dashed', underscore: 'lined', heavy: 'lined' }[leaderRaw] || '';
            if (pos && val !== 'clear') {
              const ptVal = (parseInt(pos, 10)/20).toFixed(1) + "pt";
              if (val === 'left' || val === 'start') {
                tabStops.push(leader ? `${leader} ${ptVal}` : ptVal);
              } else {
                tabStops.push(`${val === 'end' ? 'right' : val}${leader ? ' ' + leader : ''} ${ptVal}`);
              }
            }
          }
          if (tabStops.length > 0) {
            // Part-13.3: Word-2003-মান্য CSS-প্রপার্টি `tab-stops:` (রুলারে স্টপ
            // দেখায় ও ট্যাব সঠিক কলামে বসে — সময়/পূর্ণমান, MCQ অপশন-গ্রিড,
            // CQ মার্ক)। আগে শুধু `mso-tab-stops:` ছিল — Word 2003 সেটি চিনত
            // না ⇒ রুলারে কোনো স্টপ নেই, সব ট্যাব বামে আটকে যেত।
            const stops = tabStops.join(' ');
            pStyles.push(`tab-stops:${stops}`);
            pStyles.push(`mso-tab-stops:${stops}`);
          }
        }
      }

      if (align !== 'left') {
        pStyles.push(`text-align:${align}`);
      }

      let runsHtml = [];
      const childNodes = pNode.childNodes;
      let inField = false;
      let fieldCode = "";

      for (let i = 0; i < childNodes.length; i++) {
        const child = childNodes[i];
        if (child.nodeType !== 1) continue;

        const childName = child.localName || child.nodeName.split(':').pop();

        if (childName === 'tab') {
          runsHtml.push('<span style="mso-tab-count:1">\t</span>');
          textContent += "\t";
          runCount++;
          continue;
        }

        if (childName === 'r') {
          const fldCharNode = child.querySelector("fldChar");
          const instrTextNode = child.querySelector("instrText");

          if (fldCharNode) {
            const type = fldCharNode.getAttribute("w:fldCharType") || fldCharNode.getAttribute("fldCharType");
            if (type === "begin") {
              inField = true;
              fieldCode = "";
              continue;
            } else if (type === "end") {
              if (inField) {
                const rawEq = fieldCode.trim();
                const cleanEq = rawEq.startsWith('EQ ') ? rawEq.slice(3).trim() : rawEq;

                let formattedEq = "";
                if (typeof EquationConverter !== 'undefined' && typeof EquationConverter.formatEqCodeToWordHtml === 'function') {
                  formattedEq = EquationConverter.formatEqCodeToWordHtml(cleanEq, 12, true);
                } else {
                  formattedEq = this._escapeHtml(cleanEq);
                }

                // ── Smart equation rendering ──────────────────────────────────
                // EQ field code-এ Unicode থাকলে (∩, ∪, ∅, ^c ইত্যাদি) Word "Error!" দেখায়।
                // তাই:
                // ১. cleanEq-এ EQ switch (\\F, \\R, \\I) আছে কিনা দেখো → তাহলে EQ field ব্যবহার করো
                // ২. অন্যথায় → সরাসরি HTML span রেন্ডার করো (সব সময় সঠিক)

                const hasEqSwitches = /\\[FRISBXUA]\b/.test(cleanEq);
                let fieldHtml;

                // Part-9c: পুরোনো EQ-ফিল্ড ধরা পড়লে আর কখনো Equation-Editor ফিল্ড বানানো হয় না
                // (আধুনিক Word-এ সেই ফিল্ডই "Word equation too large to convert" এরর দিত) —
                // সরল (italic) রেন্ডার করা হয়, যেটা কখনো এরর দেয় না।
                fieldHtml =
                  `<span style="font-family:'Times New Roman',serif;font-size:12pt;font-style:italic;">` +
                  `${formattedEq}` +
                  `</span>`;


                runsHtml.push(fieldHtml);
                inField = false;
                fieldCode = "";
                runCount++;
                continue;
              }
            } else if (type === "separate") {
              continue;
            }
          }

          if (inField) {
            if (instrTextNode) {
              fieldCode += instrTextNode.textContent || "";
            } else {
              fieldCode += child.textContent || "";
            }
            continue;
          }

          const rData = this._parseRun(child, inheritedStyle, styleResolver, mediaMap, opts);
          runsHtml.push(rData.html);
          textContent += rData.text;
          runCount++;
        } else if (childName === 'hyperlink') {
          const rList = child.querySelectorAll("r");
          for (let r of rList) {
            const rData = this._parseRun(r, inheritedStyle, styleResolver, mediaMap, opts);
            runsHtml.push(rData.html);
            textContent += rData.text;
            runCount++;
          }
        } else if (childName === 'oMath' || childName === 'oMathPara') {
          // ============================================================
          // OMML (Office Math Markup Language) → Word HTML EQ field
          // DocxLayoutBuilder generates <m:oMath> for equations.
          // Convert to Word-compatible EQ field HTML for .doc output.
          // ============================================================
          let mathHtml = '';
          try {
            // Part-9f (Word-2003 ক্র্যাশ ফিক্স): Word 2003 (11.0) `m:` (OMML = Office 2007+)
            // ট্যাগ বোঝে না — 9c-তে `.doc`-এ OMML পাঠানোর পর ব্যবহারকারীর Word 2003 ক্র্যাশ করত।
            // তাই 2003-নেটিভ Equation Editor 3.0 (EQ) ফিল্ড; docMath:'plain' দিলে ফিল্ড ছাড়া পাঠ্য।
            // `.docx` আগের মতোই OMML-ই রাখে (আধুনিক Word-এ নেটিভ/এডিটযোগ্য)।
            mathHtml = this._ommlToLegacyEqHtml(child, (opts && opts.docMath) || 'eqfield', opts);   // Part-13.4
            if (mathHtml) {
              runsHtml.push(mathHtml);
              runCount++;
              continue;
            }
            if (typeof EquationConverter !== 'undefined' && typeof EquationConverter.ommlNodeToEqHtml === 'function') {
              // ফ্ল্যাট-টেক্সট fallback (শুধু সিরিয়ালাইজ ব্যর্থ হলে)
              mathHtml = EquationConverter.ommlNodeToEqHtml(child, 12, true);
            } else if (typeof EquationConverter !== 'undefined' && typeof EquationConverter.ommlToOpenXmlRuns === 'function') {
              // Fallback: extract readable math text from OMML node
              const mathText = (child.textContent || '').replace(/\s+/g, ' ').trim();
              if (mathText) {
                mathHtml = `<span style="font-family:'Times New Roman',serif;font-style:italic;">${this._escapeHtml(mathText)}</span>`;
              }
            } else {
              // Last resort: plain text extraction
              const mathText = (child.textContent || '').replace(/\s+/g, ' ').trim();
              if (mathText) {
                mathHtml = `<span style="font-family:'Times New Roman',serif;font-style:italic;">${this._escapeHtml(mathText)}</span>`;
              }
            }
          } catch (e) {
            const mathText = (child.textContent || '').replace(/\s+/g, ' ').trim();
            if (mathText) {
              mathHtml = `<span style="font-family:'Times New Roman',serif;font-style:italic;">${this._escapeHtml(mathText)}</span>`;
            }
          }
          if (mathHtml) {
            runsHtml.push(mathHtml);
            runCount++;
          }
        } else if (childName === 'drawing' || childName === 'pict' || childName === 'shape') {
          // Parse VML Textboxes
          const txbxContent = child.querySelector('txbxContent, *|txbxContent');
          if (txbxContent) {
            let innerHtml = '';
            const txbxChildren = txbxContent.childNodes;
            for (let j = 0; j < txbxChildren.length; j++) {
              const cn = txbxChildren[j];
              if (cn.nodeType !== 1) continue;
              const localName = cn.localName || cn.nodeName.split(':').pop();
              if (localName === 'p') {
                const pData = this._parseParagraph(cn, styleResolver, mediaMap, opts);
                innerHtml += pData.html + '\n';
              } else if (localName === 'tbl') {
                const tData = this._parseTable(cn, styleResolver, mediaMap, opts);
                innerHtml += tData.html + '\n';
              }
            }

            const shapeNode = child.querySelector('shape, *|shape');
            const shapetypeNode = child.querySelector('shapetype, *|shapetype');
            
            let vmlHtml = '<!--[if gte vml 1]>';
            if (shapetypeNode) {
               vmlHtml += shapetypeNode.outerHTML;
            }
            if (shapeNode) {
               let shapeOuter = shapeNode.outerHTML;
               // Word HTML expects standard HTML inside <v:textbox> instead of Word XML
               shapeOuter = shapeOuter.replace(/(<v:textbox[^>]*>).*?(<\/v:textbox>)/is, `$1\n<table cellpadding=0 cellspacing=0 width="100%"><tr><td>${innerHtml}</td></tr></table>\n$2`);
               vmlHtml += shapeOuter;
            }
            vmlHtml += '<![endif]-->';
            
            runsHtml.push(vmlHtml);
            runCount++;
          }

          const imgs = this._extractImagesFromNode(child, mediaMap);
          if (imgs) {
            runsHtml.push(imgs);
            runCount++;
          }
        }
      }

      // If empty paragraph, keep spacing
      if (runsHtml.length === 0) {
        runsHtml.push('&nbsp;');
      }

      const styleAttr = pStyles.length > 0 ? ` style="${pStyles.join(';')}"` : '';
      const html = `<p class="MsoNormal"${styleAttr}>${runsHtml.join('')}</p>`;

      return {
        html: html,
        text: textContent.trim(),
        runCount: runCount
      };
    }

    _parseRun(rNode, inheritedPStyle, styleResolver, mediaMap, opts) {
      let rStyles = [];
      
      // Start with Style Hierarchy: Doc Defaults -> Paragraph Style -> Run Style -> Direct Run Formatting
      let isBold = inheritedPStyle ? inheritedPStyle.isBold : false;
      let isItalic = inheritedPStyle ? inheritedPStyle.isItalic : false;
      let isUnderline = inheritedPStyle ? inheritedPStyle.isUnderline : false;
      let fontSizePt = inheritedPStyle ? inheritedPStyle.fontSizePt : (styleResolver.docDefaults.fontSizePt || 12);
      let colorHex = inheritedPStyle ? inheritedPStyle.color : (styleResolver.docDefaults.color || null);
      let fontFamily = inheritedPStyle ? (inheritedPStyle.fontFamily || 'SutonnyMJ') : 'SutonnyMJ';
      let bgColor = null;

      const rPr = rNode.querySelector("rPr");
      if (rPr) {
        // Run Style inheritance
        const rStyleNode = rPr.querySelector("rStyle");
        if (rStyleNode) {
          const rStyleId = rStyleNode.getAttribute("w:val") || rStyleNode.getAttribute("val");
          const rStyle = styleResolver.resolve(rStyleId);
          if (rStyle) {
            if (rStyle.isBold) isBold = true;
            if (rStyle.isItalic) isItalic = true;
            if (rStyle.isUnderline) isUnderline = true;
            if (rStyle.fontSizePt) fontSizePt = rStyle.fontSizePt;
            if (rStyle.color) colorHex = rStyle.color;
            if (rStyle.fontFamily) fontFamily = rStyle.fontFamily;
          }
        }

        // Direct Formatting overrides
        const b = rPr.querySelector("b");
        if (b) {
          const val = b.getAttribute("w:val") || b.getAttribute("val");
          isBold = (val !== '0' && val !== 'false');
        }

        const it = rPr.querySelector("i");
        if (it) {
          const val = it.getAttribute("w:val") || it.getAttribute("val");
          isItalic = (val !== '0' && val !== 'false');
        }

        const u = rPr.querySelector("u");
        if (u) {
          const val = u.getAttribute("w:val") || u.getAttribute("val");
          isUnderline = (val && val !== 'none');
        }

        const sz = rPr.querySelector("sz, szCs");
        if (sz) {
          const halfPoints = parseInt(sz.getAttribute("w:val") || sz.getAttribute("val"), 10);
          if (halfPoints) {
            fontSizePt = halfPoints / 2;
          }
        }

        const color = rPr.querySelector("color");
        if (color) {
          const colVal = color.getAttribute("w:val") || color.getAttribute("val");
          const themeCol = color.getAttribute("w:themeColor") || color.getAttribute("themeColor");
          if (colVal && colVal !== 'auto') {
            colorHex = colVal;
          } else if (themeCol && THEME_COLORS[themeCol]) {
            colorHex = THEME_COLORS[themeCol];
          }
        }

        const rFonts = rPr.querySelector("rFonts");
        if (rFonts) {
          const ascii = rFonts.getAttribute("w:ascii") || rFonts.getAttribute("ascii");
          const cs = rFonts.getAttribute("w:cs") || rFonts.getAttribute("cs");
          const hAnsi = rFonts.getAttribute("w:hAnsi") || rFonts.getAttribute("hAnsi");
          fontFamily = ascii || cs || hAnsi || fontFamily;
        }

        const highlight = rPr.querySelector("highlight");
        if (highlight) {
          const hlVal = highlight.getAttribute("w:val") || highlight.getAttribute("val");
          if (hlVal && hlVal !== 'none') bgColor = hlVal;
        }

        const shd = rPr.querySelector("shd");
        if (shd) {
          const fill = shd.getAttribute("w:fill") || shd.getAttribute("fill");
          if (fill && fill !== 'auto' && fill !== 'none') bgColor = `#${fill}`;
        }
      }

      // Format Specifications for Word 2003
      if (fontSizePt) {
        rStyles.push(`font-size:${fontSizePt}pt`);
        rStyles.push(`mso-bidi-font-size:${fontSizePt}pt`);
        rStyles.push(`mso-font-size:${fontSizePt}pt`);
      }

      if (colorHex) {
        const safeHex = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
        rStyles.push(`color:${safeHex}`);
        rStyles.push(`mso-color:${safeHex}`);
      }

      if (bgColor) {
        rStyles.push(`background-color:${bgColor}`);
        rStyles.push(`mso-highlight:${bgColor}`);
      }

      // Extract Text Content
      let textContent = "";
      let htmlContent = "";
      const textNodes = rNode.querySelectorAll("t, tab, br");

      for (let t of textNodes) {
        const tName = t.localName || t.nodeName.split(':').pop();
        if (tName === 't') {
          const rawT = t.textContent || "";
          textContent += rawT;
          const escT = this._escapeHtml(rawT);
          htmlContent += this._renderMsoSpaces(escT);
        } else if (tName === 'tab') {
          textContent += "\t";
          htmlContent += '___MSO_TAB_SEP___';
        } else if (tName === 'br') {
          // Part-13.3: কলাম/পেজ-ব্রেক Word-HTML-এ মান্য সিনট্যাক্সে ম্যাপ — আগে
          // সব br হারিয়ে যেত ⇒ বুকলেটে হেডিং পূর্ববর্তী প্রশ্নের নিচে গিয়ে পড়ত
          const brType = t.getAttribute('w:type') || t.getAttribute('type') || '';
          textContent += "\n";
          if (brType === 'page') htmlContent += '___MSO_BRK_PAGE___';
          else if (brType === 'column') htmlContent += '___MSO_BRK_COL___';
          else htmlContent += '<br/>\n';
        }
      }

      // Ensure SutonnyMJ / Bijoy font family is preserved with full fidelity for Word 2003 (.doc)
      if (!fontFamily) {
        fontFamily = opts.direction === 'all_unicode' ? 'Nikosh' : (opts.preserveSutonny ? 'SutonnyMJ' : 'Times New Roman');
      }

      // Part-13.2: math-ফন্ট (Cambria Math ইত্যাদি) → ANSI-নিরাপদ ফন্ট —
      // fixed line-height ছাড়াই Word 2003-এর ৪০–৫০pt লাইন-ফুলে-ওঠা বন্ধ হয়।
      fontFamily = DocxToDocConverter.sanitizeFontFamily(fontFamily);   // static — টেস্টে monkeypatch-যোগ্য (নিয়ন্ত্রণ-রান)

      // Check if run is SutonnyMJ/Bijoy vs English/Math/Unicode
      const isEnglishFont = fontFamily && /times|calibri|arial|verdana|courier|georgia|cambria/i.test(fontFamily);
      const isSutonnyFont = fontFamily && (fontFamily.includes('Sutonny') || fontFamily.includes('Bijoy') || fontFamily.includes('Bangla'));
      const isSutonnyRun = (opts.direction === 'all_bijoy' && !isEnglishFont) || isSutonnyFont;

      const effectiveAsciiFont = isSutonnyRun ? 'SutonnyMJ' : (fontFamily || 'Times New Roman');
      const effectiveBidiFont = isSutonnyRun ? 'SutonnyMJ' : (fontFamily || 'Kalpurush');

      // Check for Drawings / Images inside Run (both DrawingML and VML)
      const imagesHtml = this._extractImagesFromNode(rNode, mediaMap);

      // Check if SutonnyMJ run contains hyphens/dashes or % - if so, isolate them to Times New Roman
      if (isSutonnyRun && /[-–—−‒―%]/.test(textContent) && !/\t/.test(textContent)) {
        const dParts = textContent.split(/([-–—−‒―%]+)/);
        let splitHtml = imagesHtml;
        for (let dp of dParts) {
          if (!dp) continue;
          const isSymbol = /[-–—−‒―%]/.test(dp);
          const fAscii = isSymbol ? 'Times New Roman' : 'SutonnyMJ';
          const fBidi = isSymbol ? 'Times New Roman' : 'SutonnyMJ';
          const partStyles = [
            `font-family:'${fAscii}',Arial,sans-serif`,
            `mso-ascii-font-family:'${fAscii}'`,
            `mso-hansi-font-family:'${fAscii}'`,
            `mso-bidi-font-family:'${fBidi}'`
          ];
          if (isBold) partStyles.push(`font-weight:bold;mso-bidi-font-weight:bold`);
          if (isItalic) partStyles.push(`font-style:italic;mso-bidi-font-style:italic`);
          if (isUnderline) partStyles.push(`text-decoration:underline`);
          const escDp = this._escapeHtml(dp);
          const fmtDp = this._renderMsoSpaces(escDp);
          if (isSymbol) {
            splitHtml += `<span lang="EN-US" style="${partStyles.join(';')}">${fmtDp}</span>`;
          } else {
            splitHtml += `<span style="${partStyles.join(';')}">${fmtDp}</span>`;
          }
        }
        return {
          html: splitHtml,
          text: textContent
        };
      }

      // Font family declarations with proper dual-font binding
      rStyles.push(`font-family:'${effectiveAsciiFont}',Arial,sans-serif`);
      rStyles.push(`mso-ascii-font-family:'${effectiveAsciiFont}'`);
      rStyles.push(`mso-hansi-font-family:'${effectiveAsciiFont}'`);
      rStyles.push(`mso-bidi-font-family:'${effectiveBidiFont}'`);

      if (isBold) rStyles.push(`font-weight:bold;mso-bidi-font-weight:bold`);
      if (isItalic) rStyles.push(`font-style:italic;mso-bidi-font-style:italic`);
      if (isUnderline) rStyles.push(`text-decoration:underline`);

      const styleAttr = rStyles.length > 0 ? ` style="${rStyles.join(';')}"` : '';
      let html = imagesHtml;

      const SPLIT_RE = /(___MSO_TAB_SEP___|___MSO_BRK_PAGE___|___MSO_BRK_COL___)/;
      if (SPLIT_RE.test(htmlContent)) {
        const parts = htmlContent.split(SPLIT_RE);
        for (const part of parts) {
          if (!part) continue;
          if (part === '___MSO_TAB_SEP___') { html += '<span style="mso-tab-count:1">\t</span>'; continue; }
          if (part === '___MSO_BRK_PAGE___') { html += `<br clear=all style='page-break-before:always'>\n`; continue; }
          if (part === '___MSO_BRK_COL___') { html += `<br clear=all style='mso-column-break-before:always'>\n`; continue; }
          html += `<span${styleAttr}>${part}</span>`;
        }
      } else {
        html += `<span${styleAttr}>${htmlContent}</span>`;
      }

      return {
        html: html,
        text: textContent
      };
    }

    // Part-17.3 (হুবহু-লেআউট ধাপ ২): টেবিল পুনর্লিখন — ধাপ ০-এ Word দিয়ে মাপা ফাঁক পূরণ:
    //  • শুধু নিজের সরাসরি সারি/ঘর (আগে `tr`-সিলেক্টর ভেতরের টেবিলের সারিও টেনে আনত ⇒ নেস্টেড টেবিল মিশে যেত)
    //  • ঘরের ভেতরে নেস্টেড টেবিল পুনরাবৃত্ত রূপান্তর
    //  • লম্বালম্বি জোড়া ঘর (vMerge ⇒ rowspan), আড়াআড়ি (gridSpan ⇒ colspan)
    //  • প্রতি পাশের বর্ডার: ঘরের tcBorders, না থাকলে টেবিলের tblBorders (বাইরের/ভেতরের), Grid-স্টাইলে সব
    //  • টেবিলের চওড়া tblW (dxa/pct) ও অবস্থান (jc); tblW না থাকলে আগের মতো ১০০%
    _parseTable(tblNode, styleResolver, mediaMap, opts) {
      const ln = (n) => (n.localName || n.nodeName || '').split(':').pop();
      const kids = (n, name) => Array.from((n && n.childNodes) || []).filter((c) => c.nodeType === 1 && ln(c) === name);
      const kid = (n, name) => kids(n, name)[0] || null;
      const attr = (n, a) => (n ? (n.getAttribute('w:' + a) || n.getAttribute(a)) : null);
      const on = (el) => { if (!el) return null; const v = attr(el, 'val'); return v && v !== 'none' && v !== 'nil' ? true : false; };
      const spec = (el) => {
        if (!on(el)) return null;
        const sz = parseInt(attr(el, 'sz') || '4', 10);
        const col = attr(el, 'color');
        const v = attr(el, 'val');
        const kind = v === 'double' ? 'double' : (v === 'dotted' ? 'dotted' : (v === 'dashed' ? 'dashed' : 'solid'));
        return kind + ' ' + (col && col !== 'auto' ? '#' + col : 'windowtext') + ' ' + Math.max(0.5, sz / 8).toFixed(1) + 'pt';
      };

      const tblPr = kid(tblNode, 'tblPr');
      const tb = tblPr ? kid(tblPr, 'tblBorders') : null;
      const T = {
        top: tb ? spec(kid(tb, 'top')) : null, bottom: tb ? spec(kid(tb, 'bottom')) : null,
        left: tb ? spec(kid(tb, 'left') || kid(tb, 'start')) : null, right: tb ? spec(kid(tb, 'right') || kid(tb, 'end')) : null,
        insideH: tb ? spec(kid(tb, 'insideH')) : null, insideV: tb ? spec(kid(tb, 'insideV')) : null
      };
      const tsEl = tblPr ? kid(tblPr, 'tblStyle') : null;
      if (tsEl && !tb && /grid|border/i.test(attr(tsEl, 'val') || '')) {
        const d = 'solid windowtext 1.0pt';
        Object.assign(T, { top: d, bottom: d, left: d, right: d, insideH: d, insideV: d });
      }

      let widthCss = 'width:100%';
      const twEl = tblPr ? kid(tblPr, 'tblW') : null;
      if (twEl) {
        const t = attr(twEl, 'type'); const w = parseInt(attr(twEl, 'w') || '0', 10);
        if (t === 'dxa' && w > 0) widthCss = 'width:' + (w / 20).toFixed(1) + 'pt';
        else if (t === 'pct' && w > 0) widthCss = 'width:' + (w > 100 ? (w / 50) : w).toFixed(1) + '%';
      }
      const tjEl = tblPr ? kid(tblPr, 'jc') : null;
      const tj = attr(tjEl, 'val');
      const alignAttr = tj === 'center' ? ' align="center"' : (tj === 'right' || tj === 'end' ? ' align="right"' : '');

      // Part-17.7: opts.honorCellMargins (শুধু হুবহু-মোড) — টেবিলের নিজের tblCellMar-ই ঘরের প্যাডিং (Word-এর হুবহু);
      // অন্যথায় আগের 3.5pt 5.5pt (চালু প্রশ্নপত্রের .doc অপরিবর্তিত)
      let cellPad = 'padding:3.5pt 5.5pt';
      const cmEl = tblPr && opts && opts.honorCellMargins ? kid(tblPr, 'tblCellMar') : null;
      if (cmEl) {
        const mv = (names, d) => { for (const n of names) { const e = kid(cmEl, n); if (e) return (parseInt(attr(e, 'w') || '0', 10) / 20); } return d; };
        cellPad = `padding:${mv(['top'], 0).toFixed(1)}pt ${mv(['right', 'end'], 5.4).toFixed(1)}pt ${mv(['bottom'], 0).toFixed(1)}pt ${mv(['left', 'start'], 5.4).toFixed(1)}pt`;
      }

      const tblStyles = [
        'border-collapse:collapse', 'mso-table-layout-alt:fixed', 'border:none', 'mso-border-alt:none',
        'mso-padding-alt:0in 5.4pt 0in 5.4pt', widthCss
      ];
      if (tj === 'center') tblStyles.push('margin-left:auto', 'margin-right:auto');

      // গ্রিড-মডেল: প্রতি ঘরের শুরু-কলাম, colspan, vMerge
      const rows = kids(tblNode, 'tr');
      const model = rows.map((tr) => kids(tr, 'tc').map((tc) => {
        const pr = kid(tc, 'tcPr');
        const gs = parseInt(attr(pr ? kid(pr, 'gridSpan') : null, 'val') || '1', 10) || 1;
        const vmEl = pr ? kid(pr, 'vMerge') : null;
        const vm = vmEl ? ((attr(vmEl, 'val') || 'continue') === 'restart' ? 'restart' : 'continue') : null;
        return { tc, pr, gs, vm, col: 0, rowspan: 1 };
      }));
      let totalCols = 0;
      model.forEach((cells) => { let col = 0; cells.forEach((c) => { c.col = col; col += c.gs; }); totalCols = Math.max(totalCols, col); });
      model.forEach((cells, r) => cells.forEach((c) => {
        if (c.vm !== 'restart') return;
        for (let k = r + 1; k < model.length; k++) {
          const nx = model[k].find((x) => x.col === c.col);
          if (nx && nx.vm === 'continue') c.rowspan++; else break;
        }
      }));

      const stats = { paragraphs: 0, runs: 0 };
      const rowsHtml = [];
      model.forEach((cells, r) => {
        const cellsHtml = [];
        cells.forEach((c) => {
          if (c.vm === 'continue') return;                    // জোড়া ঘরের অংশ — উপরের ঘর rowspan দিয়ে ঢাকে
          const pr = c.pr;
          const cb = pr ? kid(pr, 'tcBorders') : null;
          const side = (names, fallback) => {
            if (cb) { for (const n of names) { const el = kid(cb, n); if (el) return spec(el); } }
            return fallback;
          };
          const lastRow = r + c.rowspan - 1 >= model.length - 1;
          const bTop = side(['top'], r === 0 ? T.top : T.insideH);
          const bBottom = side(['bottom'], lastRow ? T.bottom : T.insideH);
          const bLeft = side(['left', 'start'], c.col === 0 ? T.left : T.insideV);
          const bRight = side(['right', 'end'], c.col + c.gs >= totalCols ? T.right : T.insideV);
          // Part-17.8: হুবহু-মোডে ঘরের নিজের vAlign (মাঝে/নিচে); অন্যথায় আগের মতো ওপরে
          const vaEl = opts && opts.honorCellMargins && pr ? kid(pr, 'vAlign') : null;
          const va = vaEl ? attr(vaEl, 'val') : null;
          const tcStyles = [cellPad, 'vertical-align:' + (va === 'center' ? 'middle' : (va === 'bottom' ? 'bottom' : 'top'))];
          for (const [nm, v] of [['top', bTop], ['bottom', bBottom], ['left', bLeft], ['right', bRight]]) {
            tcStyles.push('border-' + nm + ':' + (v || 'none'));
            tcStyles.push('mso-border-' + nm + '-alt:' + (v || 'none'));
          }
          if (pr) {
            const shd = kid(pr, 'shd');
            const fill = attr(shd, 'fill');
            if (fill && fill !== 'auto' && fill !== 'none') { tcStyles.push('background-color:#' + fill); tcStyles.push('mso-shading:#' + fill); }
            const tcW = kid(pr, 'tcW');
            const w = parseInt(attr(tcW, 'w') || '0', 10);
            if (w > 0 && (attr(tcW, 'type') || 'dxa') === 'dxa') tcStyles.push('width:' + (w / 20).toFixed(1) + 'pt');
            const va = attr(kid(pr, 'vAlign'), 'val');
            if (va === 'center') tcStyles.push('vertical-align:middle');
            else if (va === 'bottom') tcStyles.push('vertical-align:bottom');
          }
          // ঘরের সরাসরি সন্তান: অনুচ্ছেদ ও নেস্টেড টেবিল (ক্রম অক্ষত)
          const inner = [];
          for (const ch of Array.from(c.tc.childNodes || [])) {
            if (ch.nodeType !== 1) continue;
            const nm = ln(ch);
            if (nm === 'p') {
              const pData = this._parseParagraph(ch, styleResolver, mediaMap, opts);
              inner.push(pData.html); stats.paragraphs++; stats.runs += pData.runCount;
            } else if (nm === 'tbl') {
              const t = this._parseTable(ch, styleResolver, mediaMap, opts);
              inner.push(t.html); stats.paragraphs += t.stats.paragraphs; stats.runs += t.stats.runs;
            }
          }
          if (!inner.length) {
            const cellImgs = this._extractImagesFromNode(c.tc, mediaMap);
            inner.push(cellImgs ? '<p class="MsoNormal">' + cellImgs + '</p>' : '<p class="MsoNormal">&nbsp;</p>');
          }
          const span = (c.gs > 1 ? ' colspan="' + c.gs + '"' : '') + (c.rowspan > 1 ? ' rowspan="' + c.rowspan + '"' : '');
          cellsHtml.push('<td' + span + ' style="' + tcStyles.join(';') + '">' + inner.join('') + '</td>');
        });
        // Part-17.9: হুবহু-মোডে সারির উচ্চতা (w:trHeight) ⇒ Word-HTML height + mso-height-rule (Word নিজে এভাবেই লেখে)
        let trStyle = '';
        if (opts && opts.honorCellMargins) {
          const trPr = kid(rows[r], 'trPr');
          const th = trPr ? kid(trPr, 'trHeight') : null;
          const hv = th ? parseInt(attr(th, 'val') || '0', 10) : 0;
          if (hv > 0) trStyle = ` style="height:${(hv / 20).toFixed(1)}pt;mso-height-rule:${attr(th, 'hRule') === 'exact' ? 'exactly' : 'at-least'}"`;
        }
        rowsHtml.push('<tr' + trStyle + '>' + cellsHtml.join('') + '</tr>');
      });

      const html = '<table class="MsoNormalTable"' + alignAttr + ' border=0 cellspacing=0 cellpadding=0 style="' + tblStyles.join(';') + '">' + rowsHtml.join('\n') + '</table>';
      return { html, stats };
    }

    _buildWord2003Document(parsedBody, opts) {
      const sections = (parsedBody.sections && parsedBody.sections.length > 0)
        ? parsedBody.sections
        : [{ html: parsedBody.bodyHtml, pageSettings: parsedBody.pageSettings }];

      // Generate CSS @page Section1, Section2 ... and div.Section1, div.Section2 ...
      let pageStylesCss = '';
      let bodyDivsHtml = '';

      sections.forEach((sec, idx) => {
        const secIndex = idx + 1;
        const page = sec.pageSettings;
        // Part-13.3: কলাম-রেখা কেবল w:sep="1" থাকলে; CQ বুকলেটে (sep=0) রেখা থাকবে না
        const colsCss = page.cols >= 2
          ? (`\tmso-columns:${page.cols} even ${page.colSpace || '0.2in'};\n` +
             (page.colSep ? '\tmso-column-separator:solid;\n' : ''))
          : '';

        pageStylesCss += ` @page Section${secIndex}
\t{size:${page.width} ${page.height};
\tmargin:${page.marginTop} ${page.marginRight} ${page.marginBottom} ${page.marginLeft};
\tmso-header-margin:.5in;
\tmso-footer-margin:.5in;
${page.pageBorderCss || ''}${colsCss}${parsedBody.headerHtml ? '\tmso-header:h1;\n' : ''}${parsedBody.footerHtml ? '\tmso-footer:f1;\n' : ''}\tmso-paper-source:0;}
 div.Section${secIndex}
\t{page:Section${secIndex};}\n`;

        // Part-17.5: DOCX-নিয়ম — সেকশনের নিজের sectPr-এর type=nextPage ⇒ এই সেকশন নতুন পাতায় শুরু (Word-এর আচরণের হুবহু)
        const sectionBreak = (idx === 0)
          ? ''
          : ((page.breakType === 'nextPage')
            ? `<br clear=all style='page-break-before:always;mso-break-type:section-break'>\n`
            : `<br clear=all style='page-break-before:auto;mso-break-type:section-break'>\n`);

        // Part-17.9: "লেখা থেকে" মাপা পাতার ফ্রেম ⇒ পাতা-স্থির VML আয়তক্ষেত্র (লেখার পেছনে), সেকশনের প্রথম অনুচ্ছেদে নোঙর
        let secHtml = sec.html;
        if (page.pageFrame) {
          const f = page.pageFrame;
          const sid = '_x0000_s' + (1025 + (this._anchorSeq = (this._anchorSeq || 0) + 1));
          const shape = `<!--[if gte vml 1]><v:rect id="${sid}" style='position:absolute;margin-left:${f.x.toFixed(1)}pt;margin-top:${f.y.toFixed(1)}pt;width:${f.w.toFixed(1)}pt;height:${f.h.toFixed(1)}pt;z-index:-251658240;mso-position-horizontal-relative:page;mso-position-vertical-relative:page' filled="f" strokeweight="${f.weightPt.toFixed(2)}pt"><v:stroke linestyle="${f.double ? 'thinThin' : 'single'}"/><w:wrap anchorx="page" anchory="page"/></v:rect><![endif]-->`;
          const firstP = secHtml.search(/<p[\s>]/i);
          const firstTbl = secHtml.search(/<table[\s>]/i);
          if (firstP >= 0 && (firstTbl < 0 || firstP < firstTbl)) {
            const end = secHtml.indexOf('>', firstP) + 1;
            secHtml = secHtml.slice(0, end) + shape + secHtml.slice(end);
          } else {
            secHtml = `<p class=MsoNormal style='margin:0;line-height:1.0pt;font-size:1.0pt'>${shape}</p>\n` + secHtml;
          }
        }
        bodyDivsHtml += `${sectionBreak}<div class="Section${secIndex}">\n${secHtml}\n</div>\n`;
      });
      // Part-17.3: হেডার/ফুটার উপাদান (Word-HTML: @page-এ mso-header:h1 / mso-footer:f1 এদের নির্দেশ করে)
      if (parsedBody.headerHtml || parsedBody.footerHtml) {
        bodyDivsHtml += "<div style='mso-element:header' id=h1>\n" + (parsedBody.headerHtml || '') + "\n</div>\n" +
          "<div style='mso-element:footer' id=f1>\n" + (parsedBody.footerHtml || '') + "\n</div>\n";
      }

      return `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 11">
<meta name="Originator" content="Microsoft Word 11">
<!--[if gte mso 9]>
<xml>
 <o:DocumentProperties>
  <o:Author>Fayzar Computer</o:Author>
  <o:LastAuthor>Fayzar Computer</o:LastAuthor>
  <o:Revision>1</o:Revision>
  <o:TotalTime>1</o:TotalTime>
  <o:Created>${new Date().toISOString()}</o:Created>
  <o:LastSaved>${new Date().toISOString()}</o:LastSaved>
  <o:Pages>1</o:Pages>
  <o:Words>100</o:Words>
  <o:Characters>600</o:Characters>
  <o:Company>Fayzar Computer</o:Company>
  <o:Lines>30</o:Lines>
  <o:Paragraphs>15</o:Paragraphs>
  <o:CharactersWithSpaces>750</o:CharactersWithSpaces>
  <o:Version>11.9999</o:Version>
 </o:DocumentProperties>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:SpellingState>Clean</w:SpellingState>
  <w:GrammarState>Clean</w:GrammarState>
  <w:ValidateAgainstSubstances/>
  <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
  <w:IgnoreMarketStoreErrors>false</w:IgnoreMarketStoreErrors>
  <w:Compatibility>
   <w:BreakWrappedTables/>
   <w:SnapToGridInCell/>
   <w:WrapTextWithPunct/>
   <w:UseAsianBreakRules/>
   <w:DontGrowAutofit/>
   <w:UseFELayout/>
  </w:Compatibility>
  <w:BrowserLevel>MicrosoftInternetExplorer4</w:BrowserLevel>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
<!--
 /* Font Definitions */
 @font-face
\t{font-family:SutonnyMJ;
\tpanose-1:2 11 6 4 2 2 2 2 2 4;
\tmso-font-alt:"SutonnyMJ";
\tmso-font-charset:0;
\tmso-generic-font-family:auto;
\tmso-font-pitch:variable;
\tmso-font-signature:3 0 0 0 1 0;}
 @font-face
\t{font-family:SutonnyOMJ;
\tpanose-1:2 11 6 4 2 2 2 2 2 4;
\tmso-font-alt:"SutonnyOMJ";
\tmso-font-charset:0;
\tmso-generic-font-family:auto;
\tmso-font-pitch:variable;
\tmso-font-signature:3 0 0 0 1 0;}
 @font-face
\t{font-family:Kalpurush;
\tpanose-1:2 11 6 4 2 2 2 2 2 4;
\tmso-font-alt:"Kalpurush";
\tmso-font-charset:0;
\tmso-generic-font-family:auto;
\tmso-font-pitch:variable;
\tmso-font-signature:3 0 0 0 1 0;}
 @font-face
\t{font-family:"Times New Roman";
\tpanose-1:2 2 6 3 5 4 5 2 3 4;
\tmso-font-charset:0;
\tmso-generic-font-family:roman;
\tmso-font-pitch:variable;
\tmso-font-signature:-536870145 1107305727 0 0 415 0;}

 /* Style Definitions */
 p.MsoNormal, li.MsoNormal, div.MsoNormal
\t{mso-style-parent:"";
\tmargin:0in;
\tmargin-bottom:.0001pt;
\tmso-pagination:widow-orphan;
\tfont-size:12.0pt;
\tfont-family:"SutonnyMJ",Arial,sans-serif;
\tmso-ascii-font-family:"Times New Roman";
\tmso-hansi-font-family:"Times New Roman";
\tmso-fareast-font-family:"Times New Roman";
\tmso-bidi-font-family:"SutonnyMJ";}
 table.MsoNormalTable
\t{mso-style-name:"Table Normal";
\tmso-tstyle-rowband-size:0;
\tmso-tstyle-colband-size:0;
\tmso-style-noshow:yes;
\tmso-style-parent:"";
\tmso-padding-alt:0in 5.4pt 0in 5.4pt;
\tmso-para-margin:0in;
\tmso-para-margin-bottom:.0001pt;
\tmso-pagination:widow-orphan;
\tfont-size:10.0pt;
\tfont-family:"Times New Roman";
\tmso-ansi-language:#0400;
\tmso-fareast-language:#0400;
\tmso-bidi-language:#0400;}
${pageStylesCss}-->
</style>
</head>
<body lang="EN-US" style="tab-interval:.5in">
${bodyDivsHtml}</body>
</html>`;
    }

    _escapeHtml(text) {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    _renderMsoSpaces(str) {
      if (!str) return '';
      if (/^ +$/.test(str)) {
        return `<span style='mso-spacerun:yes'>${'&nbsp;'.repeat(str.length)}</span>`;
      }
      str = str.replace(/^( +)/, (m) => `<span style='mso-spacerun:yes'>${'&nbsp;'.repeat(m.length)}</span>`);
      str = str.replace(/( +)$/, (m) => `<span style='mso-spacerun:yes'>${'&nbsp;'.repeat(m.length)}</span>`);
      str = str.replace(/ {2,}/g, (m) => ` <span style='mso-spacerun:yes'>${'&nbsp;'.repeat(m.length - 1)}</span>`);
      return str;
    }
  }

  const docxToDocEngine = new DocxToDocConverter();
  DocxToDocConverter.convertDocxToDoc = (docxInput, opts) => docxToDocEngine.convertDocxToDoc(docxInput, opts);

  DocxToDocConverter.sanitizeFontFamily = sanitizeFontFamily;   // Part-13.2: টেস্টযোগ্য

  if (typeof window !== 'undefined') {
    window.DocxToDocConverter = DocxToDocConverter;
    window.docxToDocEngine = docxToDocEngine;
  }
  if (typeof global !== 'undefined') {
    global.DocxToDocConverter = DocxToDocConverter;
    global.docxToDocEngine = docxToDocEngine;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocxToDocConverter;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
