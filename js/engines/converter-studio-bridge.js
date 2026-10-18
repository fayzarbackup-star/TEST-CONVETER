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
      if (broadcastChannel && typeof broadcastChannel.unref === 'function') broadcastChannel.unref();
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
      if (faithfulStudioOn() && options && (options.ir || options.faithfulIr)) {
        return sendFaithfulToStudio(options, targetIframe);
      }
      if (!options || !options.text) return false;

      const payload = {
        text: options.text,
        fileName: options.fileName || 'Converted_Document',
        docType: options.docType || 'AUTO',
        font: options.font || 'kalpurush',
        paperSize: options.paperSize || (options.text.length > 500 && /সৃজনশীল|বহুনির্বাচনি|MCQ/i.test(options.text) ? 'a4-landscape' : 'a4-portrait'),
        figuresKey: options.figuresKey || null,   // Part-16.2: IndexedDB-তে রাখা সোর্স-চিত্রের চাবি
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
      if (faithfulStudioOn()) {
        const fData = getFaithfulTransferData();
        if (fData) return fData;
      }
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
      _lastFaithfulTransfer = null;
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
        'PROTTOYON': 'প্রত্যয়নপত্র / সনদপত্র',
        'ADMIT_CARD': 'এডমিট কার্ড (প্রবেশপত্র)',
        'SALARY_SLIP': 'স্যালারি স্লিপ (বেতন রশিদ)',
        'OFFICE_PAD': 'অফিসিয়াল প্যাড',
        'ROUTINE': 'ক্লাস রুটিন',
        'GENERAL': 'সাধারণ ডকুমেন্ট'
      };
      return map[type] || 'অটো-শনাক্তকরণ';
    },

    /**
     * Opens studio.html with the document preloaded
     */
    openInStudio(options = {}) {
      if (faithfulStudioOn() && options && (options.ir || options.faithfulIr)) {
        this.sendToStudio(options);
        if (typeof window !== 'undefined' && typeof window.open === 'function') {
          window.open('studio.html?source=converter&t=' + Date.now(), '_blank');
        }
        return;
      }
      if (options.text) {
        this.sendToStudio(options);
      }
      const studioUrl = 'studio.html?source=converter&t=' + Date.now();
      window.open(studioUrl, '_blank');
    }
  };

  // WORK_PLAN F3 (FAITHFUL #১৭): হুবহু-মোড → স্টুডিও সেতু সহায়ক (__FZ_ON_FAITHFUL_STUDIO)
  const faithfulStudioOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_FAITHFUL_STUDIO : global.__FZ_ON_FAITHFUL_STUDIO)
    || !!(typeof process !== 'undefined' && process.env && process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('FAITHFUL_STUDIO'));

  let _lastFaithfulTransfer = null;

  function encodeBytesToBase64(u8) {
    if (!u8 || !(u8 instanceof Uint8Array)) return null;
    if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');
    let bin = '';
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return typeof btoa === 'function' ? btoa(bin) : null;
  }

  function decodeBase64ToBytes(b64) {
    if (!b64 || typeof b64 !== 'string') return null;
    const clean = b64.replace(/^data:[^;]+;base64,/i, '').replace(/[^A-Za-z0-9+/=]/g, '');
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(clean, 'base64'));
    if (typeof atob === 'function') {
      const bin = atob(clean);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return u8;
    }
    return null;
  }

  function extractSyncBytes(masterDocx) {
    if (!masterDocx) return null;
    if (masterDocx._u8 instanceof Uint8Array) return masterDocx._u8;
    if (masterDocx instanceof Uint8Array) return masterDocx;
    if (typeof ArrayBuffer !== 'undefined' && masterDocx instanceof ArrayBuffer) return new Uint8Array(masterDocx);
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(masterDocx)) return new Uint8Array(masterDocx);
    if (typeof masterDocx === 'object' && ArrayBuffer.isView(masterDocx)) {
      return new Uint8Array(masterDocx.buffer, masterDocx.byteOffset, masterDocx.byteLength);
    }
    return null;
  }

  function snapshotIrInBridge(ir) {
    if (!ir || !Array.isArray(ir.pages)) return ir;
    const D = (global && global.FayzarFaithfulDocx) || (typeof window !== 'undefined' && window.FayzarFaithfulDocx);
    if (D && typeof D.snapshotIrLayout === 'function') return D.snapshotIrLayout(ir);
    const IR = (global && global.FayzarLayoutIR) || (typeof window !== 'undefined' && window.FayzarLayoutIR);
    if (IR && typeof IR.snapshotIrLayout === 'function') return IR.snapshotIrLayout(ir);
    ir.pages.forEach((page) => {
      (page.bands || []).forEach((band) => {
        (band.cells || []).forEach((cell) => {
          (cell.items || []).forEach((it) => {
            if (!it || typeof it !== 'object' || it._fzLayoutSnap) return;
            it._fzLayoutSnap = {
              text: it.text != null ? String(it.text) : '',
              lines: Array.isArray(it.lines) ? it.lines.slice() : null,
              tabLines: Array.isArray(it.tabLines) ? it.tabLines.slice() : null,
              rows: Array.isArray(it.rows)
                ? it.rows.map((r) => (Array.isArray(r) ? r.map((c) => (c && typeof c === 'object' ? Object.assign({}, c) : c)) : r))
                : null
            };
          });
        });
      });
    });
    return ir;
  }

  function extractIrBlocksInBridge(ir) {
    if (!faithfulStudioOn() || !ir || !Array.isArray(ir.pages)) return [];
    const D = (global && global.FayzarFaithfulDocx) || (typeof window !== 'undefined' && window.FayzarFaithfulDocx);
    if (D && typeof D.extractBlocks === 'function') return D.extractBlocks(ir);
    const IR = (global && global.FayzarLayoutIR) || (typeof window !== 'undefined' && window.FayzarLayoutIR);
    if (IR && typeof IR.extractBlocks === 'function') return IR.extractBlocks(ir);
    snapshotIrInBridge(ir);
    const blocks = [];
    let idx = 0;
    ir.pages.forEach((page, pi) => {
      (page.bands || []).forEach((band, bi) => {
        (band.cells || []).forEach((cell, ci) => {
          (cell.items || []).forEach((it, ii) => {
            if (!it || it.kind === 'figure') return;
            const text = it.kind === 'table'
              ? (it.rows || []).map((r) => (r || []).map((c) => (c && typeof c === 'object' ? String(c.text || '') : String(c == null ? '' : c))).join('\t')).join('\n')
              : (Array.isArray(it.tabLines) && it.tabLines.length ? it.tabLines.join('\n') : (Array.isArray(it.lines) && it.lines.length ? it.lines.join('\n') : String(it.text || '')));
            blocks.push({
              id: `p${pi}-b${bi}-c${ci}-i${ii}`,
              index: idx++,
              pageIndex: pi,
              bandIndex: bi,
              cellIndex: ci,
              itemIndex: ii,
              kind: it.kind || 'para',
              type: it.type || (it.kind === 'table' ? 'table' : 'body'),
              text
            });
          });
        });
      });
    });
    return blocks;
  }

  function updateIrBlockTextInBridge(ir, target, newText) {
    if (!faithfulStudioOn() || !ir || !Array.isArray(ir.pages)) return ir;
    const D = (global && global.FayzarFaithfulDocx) || (typeof window !== 'undefined' && window.FayzarFaithfulDocx);
    if (D && typeof D.updateBlockText === 'function') return D.updateBlockText(ir, target, newText);
    const IR = (global && global.FayzarLayoutIR) || (typeof window !== 'undefined' && window.FayzarLayoutIR);
    if (IR && typeof IR.updateBlockText === 'function') return IR.updateBlockText(ir, target, newText);
    snapshotIrInBridge(ir);
    const blocks = extractIrBlocksInBridge(ir);
    const isNum = typeof target === 'number' || (typeof target === 'string' && /^\d+$/.test(target.trim()));
    const blk = isNum ? blocks[Number(target)] : blocks.find((b) => b.id === target);
    if (!blk) return ir;
    const it = ir.pages[blk.pageIndex].bands[blk.bandIndex].cells[blk.cellIndex].items[blk.itemIndex];
    if (it.kind === 'table') {
      const rowLines = Array.isArray(newText) ? newText : String(newText == null ? '' : newText).split('\n');
      it.rows = (it.rows || []).map((row, rIdx) => {
        const cols = Array.isArray(rowLines[rIdx]) ? rowLines[rIdx] : (rowLines[rIdx] !== undefined ? String(rowLines[rIdx]).split('\t') : []);
        return row.map((cellVal, cIdx) => cols[cIdx] !== undefined ? String(cols[cIdx]) : cellVal);
      });
    } else {
      const str = String(newText == null ? '' : newText);
      it.text = str;
      if (Array.isArray(it.tabLines) && it.tabLines.length) it.tabLines = str.split('\n');
      if (Array.isArray(it.lines)) it.lines = str.split('\n');
    }
    return ir;
  }

  function sendFaithfulToStudio(options, targetIframe = null) {
    const ir = options.ir || options.faithfulIr;
    snapshotIrInBridge(ir);
    const resolvedText = options.text || extractIrBlocksInBridge(ir).map((b) => b.text).join('\n\n');
    const masterDocx = options.masterDocx !== undefined ? options.masterDocx : (options.blob || null);
    const syncBytes = extractSyncBytes(masterDocx);
    const masterDocxBase64 = typeof masterDocx === 'string'
      ? masterDocx
      : (syncBytes ? encodeBytesToBase64(syncBytes) : (options.masterDocxBase64 || null));
    const payload = {
      text: resolvedText,
      fileName: options.fileName || 'Converted_Document',
      docType: options.docType || 'AUTO',
      font: options.font || 'kalpurush',
      paperSize: options.paperSize || (resolvedText.length > 500 && /সৃজনশীল|বহুনির্বাচনি|MCQ/i.test(resolvedText) ? 'a4-landscape' : 'a4-portrait'),
      figuresKey: options.figuresKey || null,
      source: 'fayzar-converter',
      timestamp: Date.now(),
      mode: options.mode || 'faithful',
      ir,
      masterDocx
    };
    if (masterDocxBase64) payload.masterDocxBase64 = masterDocxBase64;
    const storageJsonPayload = Object.assign({}, payload);
    if (!masterDocx || !(typeof masterDocx === 'object' && masterDocx.documentXml)) {
      delete storageJsonPayload.masterDocx;
    }
    const jsonStr = JSON.stringify(storageJsonPayload);
    _lastFaithfulTransfer = { payload, storageJson: jsonStr };
    try {
      localStorage.setItem(TRANSFER_KEY, jsonStr);
      sessionStorage.setItem(TRANSFER_KEY, jsonStr);
    } catch (e) {}
    if (broadcastChannel) {
      try { broadcastChannel.postMessage({ action: 'LOAD_DOCUMENT', payload }); } catch (e) {}
    }
    if (targetIframe && targetIframe.contentWindow) {
      try { targetIframe.contentWindow.postMessage({ action: 'LOAD_DOCUMENT', payload }, '*'); } catch (e) {}
    }
    return payload;
  }

  function getFaithfulTransferData() {
    let data = null;
    try {
      const raw = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(TRANSFER_KEY))
        || (typeof localStorage !== 'undefined' && localStorage.getItem(TRANSFER_KEY));
      if (raw) data = JSON.parse(raw);
    } catch (e) { data = null; }
    if (!data && _lastFaithfulTransfer && _lastFaithfulTransfer.storageJson) {
      try { data = JSON.parse(_lastFaithfulTransfer.storageJson); } catch (_) { data = null; }
    }
    if (!data || Date.now() - (data.timestamp || 0) >= 48 * 3600 * 1000) return null;
    if (data.ir) {
      snapshotIrInBridge(data.ir);
      if (!data.masterDocx) {
        if (_lastFaithfulTransfer && _lastFaithfulTransfer.payload && _lastFaithfulTransfer.payload.timestamp === data.timestamp && _lastFaithfulTransfer.payload.masterDocx) {
          data.masterDocx = _lastFaithfulTransfer.payload.masterDocx;
        } else if (data.masterDocxBase64) {
          data.masterDocx = decodeBase64ToBytes(data.masterDocxBase64);
        }
      }
    }
    return data;
  }

  Object.defineProperties(ConverterStudioBridge, {
    extractIrBlocks: { value: extractIrBlocksInBridge, enumerable: false },
    updateIrBlockText: { value: updateIrBlockTextInBridge, enumerable: false }
  });

  global.ConverterStudioBridge = ConverterStudioBridge;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConverterStudioBridge;
  }

})(typeof window !== 'undefined' ? window : this);
