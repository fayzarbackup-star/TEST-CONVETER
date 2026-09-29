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
      const text = String(rawText || '').trim();
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

      // Step 2: Parse (with Graceful Fallback)
      let parsedData = null;
      let parserError = null;

      try {
        parsedData = this._parseByDocType(docType, text, options);
      } catch (err) {
        parserError = err;
        console.warn(`[FayzarPipeline] Parser error for ${docType}, falling back to general representation:`, err);
      }

      if (!parsedData) {
        parsedData = this._buildFallbackData(text, docType);
      }

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
      switch (docType) {
        case 'EXAM_CQ':
        case 'EXAM_COMBINED':
        case 'EXAM_GENERAL':
        case 'EXAM_MATH':
        case 'EXAM_MCQ': {
          const qEngine = this._getQuestionEngine();
          if (qEngine && typeof qEngine.parseQuestionPaper === 'function') {
            return qEngine.parseQuestionPaper(text);
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
          const cvEngine = this._getCVEngine();
          if (cvEngine && typeof cvEngine.parseCV === 'function') {
            return cvEngine.parseCV(text);
          }
          break;
        }

        case 'PROTTOYON': {
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
          const cvEngine = this._getCVEngine();
          if (cvEngine && typeof cvEngine.renderToHtml === 'function') {
            inner = cvEngine.renderToHtml(parsedData, options);
          }
          break;
        }

        case 'PROTTOYON': {
          const certEngine = this._getCertificateEngine();
          if (certEngine && typeof certEngine.renderToHtml === 'function') {
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
