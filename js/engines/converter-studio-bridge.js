/**
 * Fayzar Publishing Studio - Converter Bridge Engine
 * Bridges Fayzar Converter with Publishing Studio Layout Engines.
 * 
 * Features:
 * 1. Seamless data passing via localStorage, sessionStorage, and BroadcastChannel / postMessage.
 * 2. Instant formatting and finishing pipeline utilizing DocClassifier & Studio Engines.
 * 3. Bidirectional event synchronization between converter.html and studio.html.
 */

(function (global) {
  'use strict';

  const TRANSFER_KEY = 'fayzar_studio_transfer_v1';
  const CHANNEL_NAME = 'fayzar_studio_bus';

  let broadcastChannel = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch (e) {
      // BroadcastChannel unavailable in restricted contexts
    }
  }

  const ConverterStudioBridge = {
    TRANSFER_KEY,

    /**
     * Sends document data from Converter to Studio
     * @param {Object} options
     * @param {string} options.text - Raw or converted text content
     * @param {string} [options.fileName] - Original or output file name
     * @param {string} [options.docType] - Auto or specific doc type (EXAM_CQ, STAMP_DEED, etc.)
     * @param {string} [options.font] - 'kalpurush' or 'bijoy'
     * @param {string} [options.paperSize] - 'a4-landscape', 'a4-portrait', etc.
     * @param {HTMLIFrameElement} [targetIframe] - Optional iframe to message directly
     */
    sendToStudio(options, targetIframe = null) {
      if (!options || !options.text) return false;

      const payload = {
        text: options.text,
        fileName: options.fileName || 'Converted_Document',
        docType: options.docType || 'AUTO',
        font: options.font || 'kalpurush',
        paperSize: options.paperSize || (options.text.length > 500 && /সৃজনশীল|বহুনির্বাচনি|MCQ/i.test(options.text) ? 'a4-landscape' : 'a4-portrait'),
        source: 'fayzar-converter',
        timestamp: Date.now()
      };

      // Save to Storage
      try {
        localStorage.setItem(TRANSFER_KEY, JSON.stringify(payload));
        sessionStorage.setItem(TRANSFER_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn('Bridge: Storage quota or access issue', e);
      }

      // Send to BroadcastChannel
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({ action: 'LOAD_DOCUMENT', payload });
        } catch (e) {
          console.warn('Bridge: Broadcast error', e);
        }
      }

      // Send to Target IFrame if provided
      if (targetIframe && targetIframe.contentWindow) {
        try {
          targetIframe.contentWindow.postMessage({ action: 'LOAD_DOCUMENT', payload }, '*');
        } catch (e) {
          console.warn('Bridge: IFrame postMessage error', e);
        }
      }

      return payload;
    },

    /**
     * Gets transfer data if available and fresh
     */
    getTransferData() {
      try {
        const raw = sessionStorage.getItem(TRANSFER_KEY) || localStorage.getItem(TRANSFER_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        // Valid for up to 48 hours
        if (Date.now() - (data.timestamp || 0) < 48 * 3600 * 1000) {
          return data;
        }
      } catch (e) {
        return null;
      }
      return null;
    },

    /**
     * Clears transfer data
     */
    clearTransferData() {
      try {
        sessionStorage.removeItem(TRANSFER_KEY);
        localStorage.removeItem(TRANSFER_KEY);
      } catch (e) { }
    },

    /**
     * Formats finishing output using Studio Engines directly in-memory
     * @param {string} text - Raw document text
     * @param {Object} [options] - Rendering & paper options
     */
    formatFinishingOutput(text, options = {}) {
      if (!text) return { docType: 'GENERAL', label: 'সাধারণ', html: '' };

      const font = options.font || 'kalpurush';
      const marginClass = options.marginClass || 'margin-normal';
      const fontSize = options.fontSize || '11pt';
      const lineSpacing = options.lineSpacing || '1.3';
      const splitIndex = options.splitIndex || 0;

      // Classification
      let docType = options.docType || 'AUTO';
      let confidence = 0;
      if (docType === 'AUTO' && typeof global.DocClassifier !== 'undefined') {
        const detected = global.DocClassifier.classify(text);
        docType = detected.type;
        confidence = detected.confidence;
      } else if (docType === 'AUTO') {
        docType = 'GENERAL';
      }

      const renderOpts = {
        font,
        orientation: (options.paperSize || '').includes('landscape') ? 'landscape' : 'portrait',
        skipFirstColumn: !!options.skipFirstColumn,
        marginClass,
        fontSize,
        lineSpacing,
        splitIndex,
        editable: false
      };

      let html = '';
      let parsedData = null;
      const cropMarks = (typeof global.QuestionEngine !== 'undefined' && global.QuestionEngine.renderCropMarks) ? global.QuestionEngine.renderCropMarks() : '';

      if ((docType === 'EXAM_CQ' || docType === 'EXAM_MATH') && typeof global.QuestionEngine !== 'undefined') {
        parsedData = global.QuestionEngine.parseQuestionPaper(text);
        html = global.QuestionEngine.renderToHtml(parsedData, renderOpts);
      } else if (docType === 'EXAM_MCQ' && typeof global.QuestionEngine !== 'undefined') {
        parsedData = global.QuestionEngine.parseQuestionPaper(text);
        html = global.QuestionEngine.renderToHtml(parsedData, renderOpts);
      } else if (docType === 'STAMP_DEED' && typeof global.StampEngine !== 'undefined') {
        parsedData = global.StampEngine.parseDeed(text);
        html = `<div class="paper-sheet size-legal-portrait ${marginClass}" style="font-size:${fontSize}; line-height:${lineSpacing};">${cropMarks}${global.StampEngine.renderToHtml(parsedData, renderOpts)}</div>`;
      } else if (docType === 'GOVT_APP' && typeof global.ApplicationEngine !== 'undefined') {
        parsedData = global.ApplicationEngine.parseApplication(text);
        html = `<div class="paper-sheet size-a4-portrait ${marginClass}" style="font-size:${fontSize}; line-height:${lineSpacing};">${cropMarks}${global.ApplicationEngine.renderToHtml(parsedData, renderOpts)}</div>`;
      } else if (docType === 'PROTTOYON' && typeof global.CertificateEngine !== 'undefined') {
        parsedData = global.CertificateEngine.parseCertificate(text);
        html = `<div class="paper-sheet size-a4-portrait ${marginClass}" style="font-size:${fontSize}; line-height:${lineSpacing};">${cropMarks}${global.CertificateEngine.renderToHtml(parsedData, renderOpts)}</div>`;
      } else if (docType === 'ADMIT_CARD' && typeof global.AdmitCardEngine !== 'undefined') {
        parsedData = global.AdmitCardEngine.parseAdmitData(text);
        html = global.AdmitCardEngine.renderToHtml(parsedData, renderOpts);
      } else if (docType === 'SALARY_SLIP' && typeof global.SalarySlipEngine !== 'undefined') {
        parsedData = global.SalarySlipEngine.parseSalaryData(text);
        html = global.SalarySlipEngine.renderToHtml(parsedData, renderOpts);
      } else {
        html = `<div class="paper-sheet size-a4-portrait ${marginClass}" style="font-size:${fontSize}; line-height:${lineSpacing};">${cropMarks}<div class="text-justify leading-relaxed ${font === 'bijoy' ? 'font-sutonny' : 'font-kalpurush'}">${text.replace(/\n/g, '<br>')}</div></div>`;
      }

      return {
        docType,
        label: this.getDocTypeBanglaLabel(docType),
        confidence,
        parsedData,
        html
      };
    },

    getDocTypeBanglaLabel(type) {
      const map = {
        'EXAM_CQ': 'সৃজনশীল প্রশ্নপত্র (CQ)',
        'EXAM_MCQ': 'বহুনির্বাচনি প্রশ্নপত্র (MCQ)',
        'EXAM_MATH': 'গণিত সমীকরণ প্রশ্নপত্র',
        'STAMP_DEED': '৩০০ টাকার স্ট্যাম্প / চুক্তিপত্র',
        'GOVT_APP': 'সরকারি / প্রাতিষ্ঠানিক আবেদন',
        'PROTTOYON': 'প্রত্যয়নপত্র / সনদপত্র',
        'ADMIT_CARD': 'এডমিট কার্ড (প্রবেশপত্র)',
        'SALARY_SLIP': 'স্যালারি স্লিপ (বেতন রশিদ)',
        'OFFICE_PAD': 'অফিসিয়াল প্যাড',
        'ROUTINE': 'ক্লাস রুটিন',
        'GENERAL': 'সাধারণ ডকুমেন্ট'
      };
      return map[type] || 'অটো-শনাক্তকরণ';
    },

    /**
     * Opens studio.html with the document preloaded
     */
    openInStudio(options = {}) {
      if (options.text) {
        this.sendToStudio(options);
      }
      const studioUrl = 'studio.html?source=converter&t=' + Date.now();
      window.open(studioUrl, '_blank');
    }
  };

  global.ConverterStudioBridge = ConverterStudioBridge;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConverterStudioBridge;
  }

})(typeof window !== 'undefined' ? window : this);
