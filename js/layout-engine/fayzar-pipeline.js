/**
 * Fayzar Publishing Studio - Unified Pipeline Gateway (v4.0)
 * Central Gateway orchestrating Classification, Parsing, HTML Preview, and Word Export (.doc / .docx).
 * 
 * Flow:
 *  1. Classify: DocClassifier determines document archetype / type.
 *  2. Parse: Routes to dedicated parser (QuestionEngine, StampEngine, RoutineEngine, CVEngine, etc.).
 *  3. Render: Generates live responsive HTML preview or Word (.doc / .docx) binary via ExportDualEngine.
 * 
 * 100% Offline, Vanilla JS, Zero External Dependencies, Safe Initialization & Graceful Fallback.
 */

(function(global) {
  'use strict';

  function safeNow() {
    return (typeof performance !== 'undefined' && typeof performance.now === 'function') 
      ? performance.now() 
      : Date.now();
  }

  /** Part-8a: OCR-আর্টিফ্যাক্ট পরিষ্কার — পৃষ্ঠা-মার্কার (=...=) ও MANIFEST লাইন বাদ।
   *  কভারেজ-গার্ড আগে চলে (ক্লায়েন্ট), তাই যাচাই অটুট থাকে; আউটপুট ডকুমেন্টে মার্কার যায় না। */
  function stripOcrArtifacts(text) {
    if (!text) return text;
    let out = String(text);
    // ১) সম্পূর্ণ মার্কার — ===== পৃষ্ঠা ১/৪৬ ===== (যেকোনো =, স্পেস, বাংলা/ইংরেজি অঙ্ক, ইনলাইন-ও)
    out = out.replace(/[ \t]*={2,}[ \t]*পৃষ্ঠা[ \t]*[০-৯0-9]+(?:[ \t]*\/[ \t]*[০-৯0-9]+)?[ \t]*={2,}[ \t]*/g, '');
    // ২) আংশিক/ভাঙা মার্কার — একপাশে = ছাড়া, লাইন-শেষে
    out = out.replace(/[ \t]*={2,}[ \t]*পৃষ্ঠা[ \t]*[০-৯0-9]+(?:[ \t]*\/[ \t]*[০-৯0-9]+)?[ \t]*(?=\r?\n|$)/gm, '');
    out = out.replace(/[ \t]*পৃষ্ঠা[ \t]*[০-৯0-9]+[ \t]*\/[ \t]*[০-৯0-9]+[ \t]*={2,}[ \t]*/g, '');
    // ৩) কভারেজ MANIFEST লাইন
    out = out.replace(/^[ \t]*MANIFEST\s*[:\uFF1A][^\r\n]*/gm, '');
    // ৩.৫) Part-9d: মার্কডাউন হেডিং-চিহ্ন (`##`, `###`) লিক বন্ধ — শুধু সেগমেন্ট-হেডিং লাইনে,
    //      প্রশ্ন-নম্বর দিয়ে শুরু হওয়া লাইনে নয় (সেখানে পার্সার নিজেই `#` সামলায়)।
    //      OCR `## উদাহরণ ২৯।` জাতীয় লাইন দিলে আগে `##` প্রিন্ট হয়ে যেত।
    out = out.replace(/^[ \t]*#{1,6}[ \t]*(?![\u09E6-\u09EF\d]+[।.)])/gm, '');
    // ৪) খালি লাইন জমলে দুইয়ে নামানো (লাইন-এন্ডিং অপরিবর্তিত)
    const nl = out.indexOf('\r\n') !== -1 ? '\r\n' : '\n';
    out = out.replace(/(?:\r?\n){3,}/g, nl + nl);
    return out;
  }

  const FayzarPipeline = {
    version: '4.0.0',

    // -------------------------------------------------------------------------
    // 1. SAFE ENGINE RESOLVERS (Browser & Node.js Dual Compatibility)
    // -------------------------------------------------------------------------

    _getClassifier() {
      if (typeof DocClassifier !== 'undefined') return DocClassifier;
      if (typeof window !== 'undefined' && window.DocClassifier) return window.DocClassifier;
      if (typeof globalThis !== 'undefined' && globalThis.DocClassifier) return globalThis.DocClassifier;
      if (typeof global !== 'undefined' && global.DocClassifier) return global.DocClassifier;
      if (typeof require === 'function') {
        try { return require('../engines/doc-classifier.js'); } catch (e) {
          try { return require('./engines/doc-classifier.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getExportDualEngine() {
      if (typeof ExportDualEngine !== 'undefined') return ExportDualEngine;
      if (typeof window !== 'undefined' && window.ExportDualEngine) return window.ExportDualEngine;
      if (typeof globalThis !== 'undefined' && globalThis.ExportDualEngine) return globalThis.ExportDualEngine;
      if (typeof global !== 'undefined' && global.ExportDualEngine) return global.ExportDualEngine;
      if (typeof require === 'function') {
        try { return require('../engines/export-dual-engine.js'); } catch (e) {
          try { return require('./engines/export-dual-engine.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getQuestionEngine() {
      if (typeof QuestionEngine !== 'undefined') return QuestionEngine;
      if (typeof window !== 'undefined' && window.QuestionEngine) return window.QuestionEngine;
      if (typeof globalThis !== 'undefined' && globalThis.QuestionEngine) return globalThis.QuestionEngine;
      if (typeof global !== 'undefined' && global.QuestionEngine) return global.QuestionEngine;
      if (typeof require === 'function') {
        try { return require('../engines/question-engine.js'); } catch (e) {
          try { return require('./engines/question-engine.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getStampEngine() {
      if (typeof StampEngine !== 'undefined') return StampEngine;
      if (typeof window !== 'undefined' && window.StampEngine) return window.StampEngine;
      if (typeof globalThis !== 'undefined' && globalThis.StampEngine) return globalThis.StampEngine;
      if (typeof global !== 'undefined' && global.StampEngine) return global.StampEngine;
      if (typeof require === 'function') {
        try { return require('../engines/stamp-engine.js'); } catch (e) {
          try { return require('./engines/stamp-engine.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getApplicationEngine() {
      if (typeof ApplicationEngine !== 'undefined') return ApplicationEngine;
      if (typeof window !== 'undefined' && window.ApplicationEngine) return window.ApplicationEngine;
      if (typeof globalThis !== 'undefined' && globalThis.ApplicationEngine) return globalThis.ApplicationEngine;
      if (typeof global !== 'undefined' && global.ApplicationEngine) return global.ApplicationEngine;
      if (typeof require === 'function') {
        try { return require('../engines/application-engine.js'); } catch (e) {
          try { return require('./engines/application-engine.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getApplicationLayout() {
      if (typeof FayzarApplicationLayout !== 'undefined') return FayzarApplicationLayout;
      if (typeof globalThis !== 'undefined' && globalThis.FayzarApplicationLayout) return globalThis.FayzarApplicationLayout;
      if (typeof require === 'function') {
        try { return require('./application-layout.js'); } catch (e) {
          try { return require('../layout-engine/application-layout.js'); } catch (e2) {}
        }
      }
      return null;
    },

    /** Part-19.2: সাজানো ল্যান্ডস্কেপ সনদ/প্রশংসাপত্র */
    _getCertificateLayout() {
      if (typeof FayzarCertificateLayout !== 'undefined') return FayzarCertificateLayout;
      if (typeof globalThis !== 'undefined' && globalThis.FayzarCertificateLayout) return globalThis.FayzarCertificateLayout;
      if (typeof require === 'function') {
        try { return require('./certificate-layout.js'); } catch (e) {
          try { return require('../layout-engine/certificate-layout.js'); } catch (e2) {}
        }
      }
      return null;
    },

    /** Part-19.4: ক্যাশমেমো ২-আপ/৩-আপ */
    _getCashMemoLayout() {
      if (typeof FayzarCashMemoLayout !== 'undefined') return FayzarCashMemoLayout;
      if (typeof globalThis !== 'undefined' && globalThis.FayzarCashMemoLayout) return globalThis.FayzarCashMemoLayout;
      if (typeof require === 'function') {
        try { return require('./cash-memo-layout.js'); } catch (e) {
          try { return require('../layout-engine/cash-memo-layout.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getCvLayout() {
      if (typeof FayzarCvLayout !== 'undefined') return FayzarCvLayout;
      if (typeof globalThis !== 'undefined' && globalThis.FayzarCvLayout) return globalThis.FayzarCvLayout;
      if (typeof require === 'function') {
        try { return require('./cv-layout.js'); } catch (e) {
          try { return require('../layout-engine/cv-layout.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getLetterLayout() {
      if (typeof FayzarLetterLayout !== 'undefined') return FayzarLetterLayout;
      if (typeof globalThis !== 'undefined' && globalThis.FayzarLetterLayout) return globalThis.FayzarLetterLayout;
      if (typeof require === 'function') {
        try { return require('./letter-layout.js'); } catch (e) {
          try { return require('../layout-engine/letter-layout.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getAdmitCardEngine() {
      if (typeof AdmitCardEngine !== 'undefined') return AdmitCardEngine;
      if (typeof window !== 'undefined' && window.AdmitCardEngine) return window.AdmitCardEngine;
      if (typeof globalThis !== 'undefined' && globalThis.AdmitCardEngine) return globalThis.AdmitCardEngine;
      if (typeof global !== 'undefined' && global.AdmitCardEngine) return global.AdmitCardEngine;
      if (typeof require === 'function') {
        try { return require('../engines/admit-card-engine.js'); } catch (e) {
          try { return require('./engines/admit-card-engine.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getSalarySlipEngine() {
      if (typeof SalarySlipEngine !== 'undefined') return SalarySlipEngine;
      if (typeof window !== 'undefined' && window.SalarySlipEngine) return window.SalarySlipEngine;
      if (typeof globalThis !== 'undefined' && globalThis.SalarySlipEngine) return globalThis.SalarySlipEngine;
      if (typeof global !== 'undefined' && global.SalarySlipEngine) return global.SalarySlipEngine;
      if (typeof require === 'function') {
        try { return require('../engines/salary-slip-engine.js'); } catch (e) {
          try { return require('./engines/salary-slip-engine.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getRoutineEngine() {
      if (typeof RoutineEngine !== 'undefined') return RoutineEngine;
      if (typeof window !== 'undefined' && window.RoutineEngine) return window.RoutineEngine;
      if (typeof globalThis !== 'undefined' && globalThis.RoutineEngine) return globalThis.RoutineEngine;
      if (typeof global !== 'undefined' && global.RoutineEngine) return global.RoutineEngine;
      if (typeof require === 'function') {
        try { return require('../engines/routine-engine.js'); } catch (e) {
          try { return require('./engines/routine-engine.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getCVEngine() {
      if (typeof CVEngine !== 'undefined') return CVEngine;
      if (typeof window !== 'undefined' && window.CVEngine) return window.CVEngine;
      if (typeof globalThis !== 'undefined' && globalThis.CVEngine) return globalThis.CVEngine;
      if (typeof global !== 'undefined' && global.CVEngine) return global.CVEngine;
      if (typeof require === 'function') {
        try { return require('../engines/cv-engine.js'); } catch (e) {
          try { return require('./engines/cv-engine.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getCertificateEngine() {
      if (typeof CertificateEngine !== 'undefined') return CertificateEngine;
      if (typeof window !== 'undefined' && window.CertificateEngine) return window.CertificateEngine;
      if (typeof globalThis !== 'undefined' && globalThis.CertificateEngine) return globalThis.CertificateEngine;
      if (typeof global !== 'undefined' && global.CertificateEngine) return global.CertificateEngine;
      if (typeof require === 'function') {
        try { return require('../engines/certificate-engine.js'); } catch (e) {
          try { return require('./engines/certificate-engine.js'); } catch (e2) {}
        }
      }
      return null;
    },

    _getTextRunProcessor() {
      if (typeof TextRunProcessor !== 'undefined') return TextRunProcessor;
      if (typeof window !== 'undefined' && window.TextRunProcessor) return window.TextRunProcessor;
      if (typeof globalThis !== 'undefined' && globalThis.TextRunProcessor) return globalThis.TextRunProcessor;
      if (typeof global !== 'undefined' && global.TextRunProcessor) return global.TextRunProcessor;
      if (typeof require === 'function') {
        try { return require('./text-run-processor.js'); } catch (e) {
          try { return require('../layout-engine/text-run-processor.js'); } catch (e2) {}
        }
      }
      return null;
    },

    // -------------------------------------------------------------------------
    // 2. PRIMARY PIPELINE ENTRY POINT (The Triad Flow)
    // -------------------------------------------------------------------------

    /**
     * Single Unified Entry Point for Document Processing.
     * @param {string} rawText - Input text (plain text, markdown, or exam syntax).
     * @param {Object} [options] - Pipeline options:
     *   - outputFormat: 'html' | 'preview' | 'doc' | 'docx' (default 'html')
     *   - font: 'unicode' | 'bijoy' (default 'unicode')
     *   - docType: optional override (e.g. 'EXAM_CQ', 'STAMP_DEED', 'ROUTINE', 'CV_RESUME')
     *   - margin: optional margin in inches (e.g. 0.4, 0.5, 1.0)
     *   - layoutMode: optional ('A', 'B', 'C', 'AUTO')
     * @returns {Promise<Object>} Result object with parsedData, content, stats, and metadata.
     */
    async process(rawText, options = {}) {
      const startTime = safeNow();
      const text = stripOcrArtifacts(String(rawText || '').trim());
      const outputFormat = (options.outputFormat || options.format || 'html').toLowerCase();

      // Step 1: Classify (with explicit docType override support)
      let classification = null;
      let docType = options.docType || null;

      const classifier = this._getClassifier();
      if (!docType && classifier && typeof classifier.classify === 'function') {
        classification = classifier.classify(text);
        docType = classification.type;
      } else if (!docType) {
        docType = 'EXAM_CQ';
        classification = { type: docType, confidence: 1.0, reason: 'Default fallback' };
      } else {
        classification = { type: docType, confidence: 1.0, reason: 'Explicit user selection' };
      }
      // Part-15.9: সৃজনশীল/সাধারণ পত্রের ভেতরে আলাদা বহুনির্বাচনি অংশ থাকলে → যৌথ (MCQ নিজের ফরম্যাটে)
      if (classifier && typeof classifier.promoteCombined === 'function' && !options.noCombinedPromotion) {
        const promoted = classifier.promoteCombined(docType, text);
        if (promoted !== docType) { docType = promoted; classification = Object.assign({}, classification, { type: promoted, reason: 'MCQ section detected → EXAM_COMBINED' }); }
      }
      // Part-19.3: প্যাডে লেখা আবেদন (Gemini বলে GOVT_APP) ⇒ প্যাড-লেআউট। "#" শিরোনাম-চিহ্ন stripOcrArtifacts মুছে ফেলে, তাই কাঁচা লেখায় দেখা
      if (docType === 'GOVT_APP' && this._getLetterLayout() && this._getLetterLayout().hasLetterhead(String(rawText || ''))) {
        docType = 'OFFICE_PAD';
        classification = Object.assign({}, classification, { type: docType, reason: 'GOVT_APP on letterhead → OFFICE_PAD' });
      }

      // Step 2: Parse (with Graceful Fallback)
      // Part-13.1: Studio-এডিট-ব্রিজ — প্রি-পার্সড ও এডিটেড parsedData এলে পুনঃপার্স নয়;
      // এতে প্রিভিউতে হাতে-করা এডিট (প্রশ্ন/উপ-প্রশ্ন/অপশন/মার্ক) হুবহু এক্সপোর্টে যায়।
      let parsedData = null;
      let parserError = null;

      // ফ্রন্টম্যাটার (OCR-এর `---` ব্লক) আলাদা — পার্সার কেবল বডি দেখে; হেডারের ফাঁকা ঘর এ থেকে পূরণ
      let FM = (typeof FayzarFrontmatter !== 'undefined') ? FayzarFrontmatter
        : (typeof globalThis !== 'undefined' && globalThis.FayzarFrontmatter) ? globalThis.FayzarFrontmatter : null;
      if (!FM && typeof require === 'function') { try { FM = require('./frontmatter-header.js'); } catch (e) {} }
      const fmSplit = FM ? FM.split(text) : { fields: null, body: text };
      if (fmSplit.fields && !options.__frontmatter) options = Object.assign({}, options, { __frontmatter: fmSplit.fields });

      if (options.parsedData && options.parsedData.__fzDocType === docType) {
        parsedData = options.parsedData;
      } else try {
        parsedData = this._parseByDocType(docType, fmSplit.body, options);
        if (FM && options.__frontmatter && parsedData && parsedData.header) FM.applyToHeader(parsedData.header, options.__frontmatter);
      } catch (err) {
        parserError = err;
        console.warn(`[FayzarPipeline] Parser error for ${docType}, falling back to general representation:`, err);
      }

      if (!parsedData) {
        parsedData = this._buildFallbackData(text, docType);
      }
      // পার্স-উৎস চিহ্নিতকরণ — ভুল docType-এর parsedData কখনো ব্যবহার হবে না
      if (parsedData && !parsedData.__fzDocType) parsedData.__fzDocType = docType;

      // Part-13.2: পরীক্ষার কাগজে অংশভিত্তিক ধারাবাহিক নম্বরায়ন (১।, ২।, ৩। …) —
      // আউটপুট-লেয়ারে নীতি-স্টেপ; পার্সার/OCR ফিডেলিটি অটুট। options.renumber === false দিলে বন্ধ।
      try {
        let RN = (typeof FayzarExamRenumber !== 'undefined' && FayzarExamRenumber)
          || (typeof globalThis !== 'undefined' && globalThis.FayzarExamRenumber) || null;
        if (!RN && typeof require === 'function') { try { RN = require('./exam-renumber.js'); } catch (e) {} }
        // Part-13.3: কাঠিন্য-লেবেল বাদ (প্রশ্ন/উপ-প্রশ্ন)
        if (RN && RN.stripDifficultyTagsFromData && RN.isExamType(docType) && parsedData) RN.stripDifficultyTagsFromData(parsedData);
        if (RN && options.renumber !== false && RN.isExamType(docType) && parsedData) RN.renumberExamSections(parsedData);
      } catch (e) { console.warn('[FayzarPipeline] renumber skipped:', e); }

      // Step 3: Render (HTML Preview vs Word Document Export)
      let content = null;
      let renderError = null;

      try {
        if (outputFormat === 'html' || outputFormat === 'preview') {
          content = this._renderHtml(docType, parsedData, text, options);
        } else {
          // Word 2003 RTF (.doc) or Modern OpenXML (.docx)
          const exportEngine = this._getExportDualEngine();
          if (!exportEngine || typeof exportEngine.generateWordDoc !== 'function') {
            throw new Error('ExportDualEngine is unavailable for Word document export.');
          }
          const wordFormat = outputFormat === 'docx' ? 'docx' : 'doc';
          content = await exportEngine.generateWordDoc(text, docType, {
            ...options,
            format: wordFormat
          });
        }
      } catch (err) {
        renderError = err;
        console.error(`[FayzarPipeline] Render error for ${docType} (${outputFormat}):`, err);
        if (outputFormat === 'html' || outputFormat === 'preview') {
          content = this._renderFallbackHtml(parsedData, options);
        } else {
          throw err;
        }
      }

      const endTime = safeNow();

      return {
        success: !renderError,
        docType,
        classification,
        parsedData,
        outputFormat,
        content,
        stats: {
          characters: text.length,
          lines: text ? text.split('\n').length : 0,
          processingTimeMs: Math.round(endTime - startTime)
        },
        error: parserError || renderError || null
      };
    },

    // -------------------------------------------------------------------------
    // 3. PARSING ORCHESTRATOR
    // -------------------------------------------------------------------------

    _parseByDocType(docType, text, options = {}) {
      text = stripOcrArtifacts(String(text || ''));
      switch (docType) {
        case 'EXAM_CQ':
        case 'EXAM_COMBINED':
        case 'EXAM_GENERAL':
        case 'EXAM_MATH':
        case 'EXAM_MCQ': {
          const qEngine = this._getQuestionEngine();
          if (qEngine && typeof qEngine.parseQuestionPaper === 'function') {
          return qEngine.parseQuestionPaper(text, { docType });
          }
          break;
        }

        case 'STAMP_DEED': {
          const sEngine = this._getStampEngine();
          if (sEngine && typeof sEngine.parseDeed === 'function') {
            return sEngine.parseDeed(text);
          }
          break;
        }

        case 'GOVT_APP': {
          // Part-18.9: নতুন আবেদন-লেআউট (দোকানের নমুনা) — প্রিভিউ ও ডাউনলোড একই মডেল থেকে
          const AL = this._getApplicationLayout();
          if (AL) return AL.parse(text);
          const aEngine = this._getApplicationEngine();
          if (aEngine && typeof aEngine.parseApplication === 'function') {
            return aEngine.parseApplication(text);
          }
          break;
        }

        case 'ADMIT_CARD': {
          const adEngine = this._getAdmitCardEngine();
          if (adEngine && typeof adEngine.parseAdmitData === 'function') {
            return adEngine.parseAdmitData(text);
          }
          break;
        }

        case 'SALARY_SLIP': {
          const salEngine = this._getSalarySlipEngine();
          if (salEngine && typeof salEngine.parseSalaryData === 'function') {
            return salEngine.parseSalaryData(text);
          }
          break;
        }

        case 'ROUTINE': {
          const rEngine = this._getRoutineEngine();
          if (rEngine && typeof rEngine.parseRoutine === 'function') {
            return rEngine.parseRoutine(text);
          }
          break;
        }

        case 'CV_RESUME': {
          // Part-19.1: বাংলা জীবনবৃত্তান্ত — দোকানের ছাঁচ; ইংরেজি সিভি পুরোনো ইঞ্জিনে
          const CL = this._getCvLayout();
          if (CL && CL.isBangla(text)) return CL.parse(text);
          const cvEngine = this._getCVEngine();
          if (cvEngine && typeof cvEngine.parseCV === 'function') {
            return cvEngine.parseCV(text);
          }
          break;
        }

        case 'CASH_MEMO': {
          // Part-19.4: ক্যাশমেমো ২-আপ/৩-আপ (দোকানের নমুনা)
          const CM = this._getCashMemoLayout();
          if (CM) return CM.parse(text, options);
          break;
        }

        case 'OFFICE_PAD':
        case 'PROTTOYON': {
          // Part-19.2: ল্যান্ডস্কেপ/মুড়িসহ সনদ আলাদা মডিউলে
          const CT = docType === 'PROTTOYON' ? this._getCertificateLayout() : null;
          if (CT && CT.wants(text, options.__frontmatter)) return CT.parse(text);
          // Part-19.0: প্যাড/প্রত্যয়ন-লেআউট (দোকানের নমুনা) — প্রিভিউ ও ডাউনলোড একই মডেল থেকে
          const LL = this._getLetterLayout();
          if (LL) return LL.parse(text, docType === 'PROTTOYON' ? 'prottoyon' : 'pad');
          if (docType === 'OFFICE_PAD') break;
          const certEngine = this._getCertificateEngine();
          if (certEngine && typeof certEngine.parseCertificate === 'function') {
            return certEngine.parseCertificate(text);
          }
          break;
        }

        default:
          break;
      }
      return null;
    },

    // -------------------------------------------------------------------------
    // 4. HTML PREVIEW RENDERING ORCHESTRATOR
    // -------------------------------------------------------------------------

    _renderHtml(docType, parsedData, rawText, options = {}) {
      if (parsedData && parsedData.isFallback) {
        return this._renderFallbackHtml(parsedData, options);
      }

      let inner = null;
      switch (docType) {
        case 'EXAM_CQ':
        case 'EXAM_COMBINED':
        case 'EXAM_GENERAL':
        case 'EXAM_MATH':
        case 'EXAM_MCQ': {
          const qEngine = this._getQuestionEngine();
          if (qEngine && typeof qEngine.renderToHtml === 'function') {
            return qEngine.renderToHtml(parsedData, options);
          }
          break;
        }

        case 'STAMP_DEED': {
          const sEngine = this._getStampEngine();
          if (sEngine && typeof sEngine.renderToHtml === 'function') {
            inner = sEngine.renderToHtml(parsedData, options);
          }
          break;
        }

        case 'GOVT_APP': {
          const AL = this._getApplicationLayout();
          if (AL && parsedData && parsedData.kind === 'GOVT_APP_LAYOUT') {
            return AL.renderHtml(parsedData, options, { esc: (s) => this._escapeHtml(s) });
          }
          const aEngine = this._getApplicationEngine();
          if (aEngine && typeof aEngine.renderToHtml === 'function') {
            inner = aEngine.renderToHtml(parsedData, options);
          }
          break;
        }

        case 'ADMIT_CARD': {
          const adEngine = this._getAdmitCardEngine();
          if (adEngine && typeof adEngine.renderToHtml === 'function') {
            return adEngine.renderToHtml(parsedData, options);
          }
          break;
        }

        case 'SALARY_SLIP': {
          const salEngine = this._getSalarySlipEngine();
          if (salEngine && typeof salEngine.renderToHtml === 'function') {
            return salEngine.renderToHtml(parsedData, options);
          }
          break;
        }

        case 'ROUTINE': {
          const rEngine = this._getRoutineEngine();
          if (rEngine && typeof rEngine.renderToHtml === 'function') {
            inner = rEngine.renderToHtml(parsedData, options);
          }
          break;
        }

        case 'CV_RESUME': {
          const CL = this._getCvLayout();
          if (CL && parsedData && parsedData.kind === 'CV_LAYOUT') {
            return CL.renderHtml(parsedData, options, { esc: (s) => this._escapeHtml(s) });
          }
          const cvEngine = this._getCVEngine();
          if (cvEngine && typeof cvEngine.renderToHtml === 'function') {
            inner = cvEngine.renderToHtml(parsedData, options);
          }
          break;
        }

        case 'CASH_MEMO': {
          const CM = this._getCashMemoLayout();
          if (CM && parsedData && parsedData.kind === 'CASH_MEMO_LAYOUT') {
            return CM.renderHtml(parsedData, options, { esc: (s) => this._escapeHtml(s) });
          }
          break;
        }

        case 'OFFICE_PAD':
        case 'PROTTOYON': {
          const CT = this._getCertificateLayout();
          if (CT && parsedData && parsedData.kind === 'CERT_LAYOUT') {
            return CT.renderHtml(parsedData, options, { esc: (s) => this._escapeHtml(s) });
          }
          const LL = this._getLetterLayout();
          if (LL && parsedData && parsedData.kind === 'LETTER_LAYOUT') {
            return LL.renderHtml(parsedData, options, { esc: (s) => this._escapeHtml(s) });
          }
          const certEngine = this._getCertificateEngine();
          if (docType === 'PROTTOYON' && certEngine && typeof certEngine.renderToHtml === 'function') {
            inner = certEngine.renderToHtml(parsedData, options);
          }
          break;
        }

        default:
          break;
      }

      if (inner) {
        if (inner.includes('paper-sheet')) return inner;
        const qEngine = this._getQuestionEngine();
        const cropMarks = (qEngine && typeof qEngine.renderCropMarks === 'function') ? qEngine.renderCropMarks() : '';
        const paperSize = options.paperSize || (options.orientation === 'landscape' ? 'a4-landscape' : (docType === 'STAMP_DEED' ? 'legal-portrait' : 'a4-portrait'));
        const marginClass = options.marginClass || (docType === 'STAMP_DEED' ? 'margin-stamp' : 'margin-normal');
        const editable = options.editable ? 'contenteditable="true" spellcheck="false"' : '';
        const fontSize = options.fontSize || '12pt';
        const lineSpacing = options.lineSpacing || '1.35';
        return `<div class="paper-sheet size-${paperSize} ${marginClass}" ${editable} style="font-size: ${fontSize}; line-height: ${lineSpacing};">${cropMarks}${inner}</div>`;
      }

      return this._renderFallbackHtml(parsedData || this._buildFallbackData(rawText, docType), options);
    },

    _buildFallbackData(rawText, docType) {
      const lines = String(rawText || '').split('\n').map(l => l.trim()).filter(Boolean);
      return {
        isFallback: true,
        docType: docType || 'GENERAL',
        rawText: String(rawText || ''),
        title: lines[0] || 'ডকুমেন্ট',
        lines: lines
      };
    },

    _renderFallbackHtml(data, options = {}) {
      const isBijoy = options.font === 'bijoy' || options.font === 'sutonnymj';
      const font = isBijoy ? 'SutonnyMJ' : 'Kalpurush';
      const linesHtml = (data.lines || []).map(l => `<p style="margin: 8px 0; line-height: 1.6;">${this._escapeHtml(l)}</p>`).join('');
      return `
        <div class="fayzar-document-fallback" style="font-family: '${font}', 'SolaimanLipi', sans-serif; padding: 32px; background: #ffffff; color: #1e293b; max-width: 800px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; font-size: 20px; color: #0f172a;">${this._escapeHtml(data.title)}</h2>
          ${linesHtml}
        </div>
      `;
    },

    _escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    // -------------------------------------------------------------------------
    // 5. CONVENIENCE ALIASES
    // -------------------------------------------------------------------------

    async previewHtml(rawText, options = {}) {
      return this.process(rawText, { ...options, outputFormat: 'html' });
    },

    async exportDocx(rawText, options = {}) {
      return this.process(rawText, { ...options, outputFormat: 'docx' });
    },

    async exportDoc(rawText, options = {}) {
      return this.process(rawText, { ...options, outputFormat: 'doc' });
    },

    classify(rawText) {
      const classifier = this._getClassifier();
      if (classifier && typeof classifier.classify === 'function') {
        return classifier.classify(rawText);
      }
      return { type: 'EXAM_CQ', confidence: 0 };
    }
  };

  // Safe global exports
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarPipeline;
  if (typeof window !== 'undefined') window.FayzarPipeline = FayzarPipeline;
  if (typeof globalThis !== 'undefined') globalThis.FayzarPipeline = FayzarPipeline;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
