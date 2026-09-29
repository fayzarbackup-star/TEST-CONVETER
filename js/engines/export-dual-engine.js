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

      const runs = trp.processTextRuns(norm, { isBijoy, generateOmml: false });
      if (!runs || runs.length === 0) return '';

      let out = '';
      for (const run of runs) {
        if (run.type === 'math') {
          const rawLatex = run.cleanLatex || run.value || '';
          let _eqOut = null;
          const _EqC = (typeof EquationConverter !== 'undefined') ? EquationConverter
            : (typeof window !== 'undefined' && window.EquationConverter) ? window.EquationConverter : null;
          if (_EqC && typeof _EqC.latexToEqField === 'function') {
            try { _eqOut = _EqC.latexToEqField(rawLatex, isBijoy); } catch(e) {}
          }
          if (_eqOut) {
            // If it only contains superscripts/subscripts and symbols, avoid EQ field to prevent Word "Error!" on Unicode
            if (!/\\[FRIBXA]\b/i.test(_eqOut)) {
                let rtfSafe = this.escapeUnicodeRtf(_eqOut);
                rtfSafe = rtfSafe.replace(/\\\\S\\\\up\d*\((.*?)\)/gi, '{\\super $1}');
                rtfSafe = rtfSafe.replace(/\\\\S\\\\do\d*\((.*?)\)/gi, '{\\sub $1}');
                out += '{\\f1 ' + rtfSafe + '}';
            } else {
                let escapedEq = this.escapeUnicodeRtf(_eqOut);
                // Unescape EQ specific commands so Word recognizes them
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

      const runs = trp.processTextRuns(norm, { isBijoy, generateOmml: true });
      if (!runs || runs.length === 0) return '';

      let xml = '';
      for (const run of runs) {
        if (run.type === 'math') {
          if (run.ommlXml) {
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

      const format = (options.format || 'doc').toLowerCase();
      if (format === 'docx') {
        return this.generateModernDocx(cleanText, normalizedDocType, options);
      }
      return this.generateLegacyDoc(cleanText, normalizedDocType, options);
    },

    /**
     * Generates Word 2003 (.doc) binary/RTF Blob.
     */
    generateLegacyDoc(rawText, docType = 'EXAM_CQ', options = {}) {
      let qEngine = this._getQuestionEngine();

      if (qEngine && docType === 'EXAM_COMBINED') {
        const parts = rawText.split(/---SECTION_?BREAK:MCQ---/i);
        const parsedCq = qEngine.parseQuestionPaper(parts[0] || '');
        const parsedMcq = qEngine.parseQuestionPaper(parts[1] || '');
        const validator = this._getSchemaValidator();
        if (validator) { validator.validate(docType, parsedCq); validator.validate(docType, parsedMcq); }
        const rtf = this.generateCombinedExamRtf(parsedCq, parsedMcq, options);
        return new Blob([rtf], { type: 'application/msword' });
      }

      if (qEngine && (docType === 'EXAM_CQ' || docType === 'EXAM_MATH' || docType === 'EXAM_GENERAL')) {
        const parsed = qEngine.parseQuestionPaper(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        const rtf = this.generateCqExamRtf(parsed, options);
        return new Blob([rtf], { type: 'application/msword' });
      }

      if (qEngine && docType === 'EXAM_MCQ') {
        const parsed = qEngine.parseQuestionPaper(rawText);
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
    async generateCombinedExamDocx(parsedCq, parsedMcq, options = {}) {
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : (options.font || 'Kalpurush');

      // Generate CQ xml part
      const cqRes = await this.generateCqExamDocx(parsedCq, { ...options, returnInnerXml: true });
      
      // Generate MCQ xml part
      const mcqRes = await this.generateMcqExamDocx(parsedMcq, { ...options, returnInnerXml: true, isCombined: true });

      // Add a page break between CQ and MCQ so they are on separate sides of the paper
      const pageBreak = `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
      const combinedBody = cqRes.bodyXml + pageBreak + mcqRes.bodyXml;
      
      if (options.auditNote) {
        bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="240"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t>Verification Notes</w:t></w:r></w:p>`;
        const lines = options.auditNote.split('\n');
        for (const line of lines) {
           bodyXml += `<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>${this.renderDocxRuns(line, options, { sz: 24 })}</w:p>`;
        }
      }

      // Landscape 2-column section
      const sectPr = `
        <w:sectPr>
          <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
          <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/>
          <w:cols w:num="2" w:space="1008"/>
        </w:sectPr>`;
      
      return await this._packageDocx(combinedBody + sectPr, fontName);
    },

    /**
     * Generates Modern Word (.docx) OpenXML Package.
     * Compatible with Word 2007, 2010, 2013, 2016, 2019, 2021, and Office 365.
     */
    async generateModernDocx(rawText, docType = 'EXAM_CQ', options = {}) {
      let qEngine = this._getQuestionEngine();

      if (qEngine && docType === 'EXAM_COMBINED') {
        const parts = rawText.split(/---SECTION_?BREAK:MCQ---/i);
        const parsedCq = qEngine.parseQuestionPaper(parts[0] || '');
        const parsedMcq = qEngine.parseQuestionPaper(parts[1] || '');
        const validator = this._getSchemaValidator();
        if (validator) { validator.validate(docType, parsedCq); validator.validate(docType, parsedMcq); }
        return await this.generateCombinedExamDocx(parsedCq, parsedMcq, options);
      }

      if (qEngine && (docType === 'EXAM_CQ' || docType === 'EXAM_MATH' || docType === 'EXAM_GENERAL')) {
        const parsed = qEngine.parseQuestionPaper(rawText);
        const validator = this._getSchemaValidator();
        if (validator) validator.validate(docType, parsed);
        return await this.generateCqExamDocx(parsed, options);
      }

      if (qEngine && docType === 'EXAM_MCQ') {
        const parsed = qEngine.parseQuestionPaper(rawText);
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

    generateCqExamRtf(parsedData, options = {}) {
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let rtf = '';
      if (!options.returnInnerRtf) {
        rtf += '{\\rtf1\\ansi\\deff0\n';
        rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
        rtf += '{\\colortbl;\\red0\\green0\\blue0;}\n';
      }

      const marginTwips = options.margin === 0.4 ? 576 : 720;
      const pageWidth = 11906 - 2 * marginTwips;
      rtf += `\\paperw11906\\paperh16838\\margl${marginTwips}\\margr${marginTwips}\\margt${marginTwips}\\margb${marginTwips}\\cols1\n`;

      if (options.skipFirstColumn) {
        rtf += '{\\column}\n';
      }

      const h = parsedData.header;
      if (h.institute) {
        rtf += '{\\qc\\b\\fs32\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.institute, options) + '\\par}\n';
      }
      if (h.location) {
        rtf += '{\\qc\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.location, options) + '\\par}\n';
      }
      if (h.exam) {
        rtf += '{\\qc\\b\\fs26\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.exam, options) + '\\par}\n';
      }
      if (h.classAndSubject) {
        rtf += '{\\qc\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.classAndSubject, options) + '\\par}\n';
      }
      if (h.time || h.marks || h.examType) {
        const tTxt = h.time ? this.formatRtfText('সময়: ' + h.time, options) : '';
        const mTxt = h.marks ? this.formatRtfText('পূর্ণমান: ' + h.marks, options) : '';
        if (h.examType) {
          const eTxt = this.formatRtfText(h.examType, options);
          const midX = Math.round(pageWidth / 2);
          rtf += '{\\ql\\b\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0\\tqc\\tx' + midX + '\\tqr\\tx' + pageWidth + ' ' + tTxt + '\\tab {\\b\\ul ' + eTxt + '}\\tab ' + mTxt + '\\par}\n';
        } else {
          rtf += '{\\ql\\b\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0\\tqr\\tx' + pageWidth + ' ' + tTxt + '\\tab ' + mTxt + '\\par}\n';
        }
      }
      if (h.instructions) {
        rtf += '{\\qc\\i\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.instructions, options) + '\\par}\n';
      }
      // Divider line
      rtf += '{\\ql\\fs4\\f0\\sl100\\slmult1\\sb0\\sa40\\brdrb\\brdrs\\brdrw10\\brsp20 \\par}\n';

      // 2. Sections & Questions
      for (const sec of parsedData.sections) {
        if (sec.title) {
          rtf += '{\\qc\\b\\fs24\\f0\\sl240\\slmult1\\sb40\\sa40 ' + this.formatRtfText(sec.title, options) + '\\par}\n';
        }

        for (const q of sec.questions) {
          const qTextTrimmed = (q.text || '').trim();
          let firstLineText = qTextTrimmed;
          let remainingStimLines = [];
          if (q.stimulus) {
            const allStimLines = q.stimulus.split('\\n').map(l => l.trim()).filter(Boolean);
            if (!firstLineText && allStimLines.length > 0) {
              const fLine = allStimLines[0].trim();
              if (fLine.startsWith('|') && fLine.endsWith('|')) {
                firstLineText = '';
                remainingStimLines = allStimLines;
              } else {
                firstLineText = allStimLines[0];
                remainingStimLines = allStimLines.slice(1);
              }
            } else {
              remainingStimLines = allStimLines;
            }
          }

          rtf += '{\\ql\\b\\fs24\\f0\\sl240\\slmult1\\sb30\\sa0\\li432\\fi-432\\tx432\\tqr\\tx' + pageWidth + ' ' + this.formatRtfText(q.num + '।', options) + '\\tab ' + this.formatRtfText(firstLineText, options) + '\\par}\n';

          if (remainingStimLines.length > 0) {
            for (const sLine of remainingStimLines) {
              if (sLine.trim().startsWith('|') && sLine.trim().endsWith('|')) {
                if (sLine.includes('---')) continue;
                const cells = sLine.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
                let rowRtf = '{\\trowd\\trgaph108\\trleft-108';
                let currentX = 0;
                const colWidth = Math.floor(pageWidth / Math.max(1, cells.length));
                for (let i = 0; i < cells.length; i++) {
                  currentX += colWidth;
                  rowRtf += `\\cellx${currentX}`;
                }
                for (const cell of cells) {
                  rowRtf += '\\pard\\intbl\\qc\\fs24\\f0 ' + this.formatRtfText(cell, options) + '\\cell';
                }
                rowRtf += '\\row}\n';
                rtf += rowRtf;
              } else {
                rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb15\\sa20\\li432 ' + this.formatRtfText(sLine, options) + '\\par}\n';
              }
            }
          }

          if (q.subQuestions && q.subQuestions.length > 0) {
            for (const sub of q.subQuestions) {
              const subMark = sub.mark ? this.formatRtfText(sub.mark, options) : '';
              let subTextRtf = this.formatRtfText(sub.label + '. ' + sub.text, options);
              // Prevent overlapping by splitting (খ) and (গ) onto new lines if they were merged by OCR
              subTextRtf = subTextRtf.replace(/\s*\(খ\)\s*/g, '\\par (খ) ');
              subTextRtf = subTextRtf.replace(/\s*\(গ\)\s*/g, '\\par (গ) ');
              rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb15\\sa15\\li432\\fi-432\\tx432\\tqr\\tx' + pageWidth + ' ' + subTextRtf + '\\tab ' + subMark + '\\par}\n';
            }
          }
        }
      }

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },

    /**
     * Generates Board Standard Combined (CQ+MCQ) Word RTF Document.
     */
    generateCombinedExamRtf(parsedCq, parsedMcq, options = {}) {
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let rtf = '';
      if (!options.returnInnerRtf) {
        rtf += '{\\rtf1\\ansi\\deff0\n';
        rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
        rtf += '{\\colortbl;\\red0\\green0\\blue0;}\n';
      }

      const rightTab = 7050; // column right edge
      rtf += '\\landscape\\paperw16838\\paperh11906\\margl720\\margr720\\margt720\\margb720\\cols2\\colsx1008\n';

      if (options.skipFirstColumn) {
        rtf += '{\\column}\n';
      }

      // 1. Header Block
      const h = parsedCq.header;
      if (h.institute) {
        rtf += '{\\qc\\b\\fs32\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.institute, options) + '\\par}\n';
      }
      if (h.location) {
        rtf += '{\\qc\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.location, options) + '\\par}\n';
      }
      if (h.exam) {
        rtf += '{\\qc\\b\\fs26\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.exam, options) + '\\par}\n';
      }
      if (h.classAndSubject) {
        rtf += '{\\qc\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.classAndSubject, options) + '\\par}\n';
      }
      if (h.time || h.marks || h.examType) {
        const tTxt = h.time ? this.formatRtfText('সময়: ' + h.time, options) : '';
        const mTxt = h.marks ? this.formatRtfText('পূর্ণমান: ' + h.marks, options) : '';
        if (h.examType) {
          const eTxt = this.formatRtfText(h.examType, options);
          const midX = Math.round(rightTab / 2);
          rtf += '{\\ql\\b\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0\\tqc\\tx' + midX + '\\tqr\\tx' + rightTab + ' ' + tTxt + '\\tab {\\b\\ul ' + eTxt + '}\\tab ' + mTxt + '\\par}\n';
        } else {
          rtf += '{\\ql\\b\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0\\tqr\\tx' + rightTab + ' ' + tTxt + '\\tab ' + mTxt + '\\par}\n';
        }
      }
      if (h.instructions) {
        rtf += '{\\qc\\i\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.instructions, options) + '\\par}\n';
      }
      // Divider line
      rtf += '{\\ql\\fs4\\f0\\sl100\\slmult1\\sb0\\sa40\\brdrb\\brdrs\\brdrw10\\brsp20 \\par}\n';

      // 2. Sections & Questions
      for (const sec of parsedCq.sections) {
        if (sec.title) {
          rtf += '{\\qc\\b\\fs24\\f0\\sl240\\slmult1\\sb40\\sa40 ' + this.formatRtfText(sec.title, options) + '\\par}\n';
        }

        for (const q of sec.questions) {
          rtf += '{\\ql\\b\\fs24\\f0\\sl240\\slmult1\\sb30\\sa0\\li240\\fi-240 ' + this.formatRtfText(q.num + '. ' + q.text, options) + '\\par}\n';

          if (q.stimulus) {
            let firstLineText = '';
            let remainingStimLines = [];
            const allStimLines = q.stimulus.split('\n').map(l => l.trim()).filter(Boolean);
            if (!firstLineText && allStimLines.length > 0) {
              const fLine = allStimLines[0].trim();
              if (fLine.startsWith('|') && fLine.endsWith('|')) {
                firstLineText = '';
                remainingStimLines = allStimLines;
              } else {
                firstLineText = allStimLines[0];
                remainingStimLines = allStimLines.slice(1);
              }
            } else {
              remainingStimLines = allStimLines;
            }

            rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0\\li240 ' + this.formatRtfText(firstLineText, options) + '\\par}\n';

            if (remainingStimLines.length > 0) {
              for (const sLine of remainingStimLines) {
                if (sLine.trim().startsWith('|') && sLine.trim().endsWith('|')) {
                  if (sLine.includes('---')) continue;
                  const cells = sLine.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
                  let rowRtf = '{\\trowd\\trgaph108\\trleft-108';
                  let currentX = 0;
                  const colWidth = Math.floor(rightTab / Math.max(1, cells.length));
                  for (let i = 0; i < cells.length; i++) {
                    currentX += colWidth;
                    rowRtf += `\\cellx${currentX}`;
                  }
                  for (const cell of cells) {
                    rowRtf += '\\pard\\intbl\\qc\\fs24\\f0 ' + this.formatRtfText(cell, options) + '\\cell';
                  }
                  rowRtf += '\\row}\n';
                  rtf += rowRtf;
                } else {
                  rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0\\li240 ' + this.formatRtfText(sLine, options) + '\\par}\n';
                }
              }
            }
          }

          if (q.subQuestions && q.subQuestions.length > 0) {
            for (const sub of q.subQuestions) {
              if (sub.isAlternative) {
                rtf += '{\\qc\\b\\fs24\\f0\\sl240\\slmult1\\sb20\\sa20 ' + this.formatRtfText('--- অথবা ---', options) + '\\par}\n';
                continue;
              }
              let subTextRtf = this.formatRtfText(sub.label + '. ' + sub.text, options);
              // Prevent overlapping by splitting (খ) and (গ) onto new lines if they were merged by OCR
              subTextRtf = subTextRtf.replace(/\s*\(খ\)\s*/g, '\\par (খ) ');
              subTextRtf = subTextRtf.replace(/\s*\(গ\)\s*/g, '\\par (গ) ');
              const subMark = this.formatRtfText(sub.mark || '', options);
              rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0\\li240\\tqr\\tx' + rightTab + ' ' + subTextRtf + '\\tab ' + subMark + '\\par}\n';
            }
          }

          if (q.statements && q.statements.length > 0) {
            for (const stmt of q.statements) {
              rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0\\li240 ' + this.renderMcqTextRtf(stmt, options) + '\\par}\n';
            }
          }

          if (q.options && q.options.length > 0) {
            const opts = q.options;
            if (opts.length >= 4) {
              const o0 = '({\\f0 ' + this.formatRtfText(opts[0].label, options) + '}) ' + this.renderMcqTextRtf(opts[0].text, options);
              const o1 = '({\\f0 ' + this.formatRtfText(opts[1].label, options) + '}) ' + this.renderMcqTextRtf(opts[1].text, options);
              const o2 = '({\\f0 ' + this.formatRtfText(opts[2].label, options) + '}) ' + this.renderMcqTextRtf(opts[2].text, options);
              const o3 = '({\\f0 ' + this.formatRtfText(opts[3].label, options) + '}) ' + this.renderMcqTextRtf(opts[3].text, options);

              rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0\\li240\\tx3600 ' + o0 + '\\tab ' + o1 + '\\par}\n';
              rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb0\\sa20\\li240\\tx3600 ' + o2 + '\\tab ' + o3 + '\\par}\n';
            } else {
              let optLine = '';
              for (let oi = 0; oi < opts.length; oi++) {
                const optRtf = '({\\f0 ' + this.formatRtfText(opts[oi].label, options) + '}) ' + this.renderMcqTextRtf(opts[oi].text, options);
                optLine += (oi > 0 ? '\\tab ' : '') + optRtf;
              }
              rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb0\\sa20\\li240\\tx2450\\tx4900\\tx7350 ' + optLine + '\\par}\n';
            }
          }
        }
      }

      if (parsedMcq && parsedMcq.sections && parsedMcq.sections.length > 0) {
        // Page break for MCQ to keep it on a separate page but same landscape layout
        rtf += '\\page\n';
        const mcqRtf = this.generateMcqExamRtf(parsedMcq, { ...options, returnInnerRtf: true, isCombined: true });
        rtf += mcqRtf;
      }

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },

    /**
     * Generates Board Standard Creative Question (CQ) Modern Word (.docx).
     */
    async generateCqExamDocx(parsedData, options = {}) {
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';
      const rightTabPos = 7050;

      let bodyXml = '';

      if (options.skipFirstColumn) {
        bodyXml += '<w:p><w:r><w:br w:type="column"/></w:r></w:p>';
      }

      // Header Block
      const h = parsedData.header;
      if (h.institute) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(h.institute, options)}</w:t></w:r></w:p>`;
      }
      if (h.location) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(h.location, options)}</w:t></w:r></w:p>`;
      }
      if (h.exam) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(h.exam, options)}</w:t></w:r></w:p>`;
      }
      if (h.classAndSubject) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(h.classAndSubject, options)}</w:t></w:r></w:p>`;
      }
      if (h.time || h.marks || h.examType) {
        const tTxt = h.time ? this.formatDocxText('সময়: ' + h.time, options) : '';
        const mTxt = h.marks ? this.formatDocxText('পূর্ণমান: ' + h.marks, options) : '';
        const midPos = Math.round(rightTabPos / 2);

        if (h.examType) {
          const eTxt = this.formatDocxText(h.examType, options);
          bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/><w:tabs><w:tab w:val="center" w:pos="${midPos}"/><w:tab w:val="right" w:pos="${rightTabPos}"/></w:tabs></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${tTxt}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${eTxt}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${mTxt}</w:t></w:r></w:p>`;
        } else {
          bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/><w:tabs><w:tab w:val="right" w:pos="${rightTabPos}"/></w:tabs></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${tTxt}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${mTxt}</w:t></w:r></w:p>`;
        }
      }
      if (h.instructions) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(h.instructions, options)}</w:t></w:r></w:p>`;
      }

      // Divider line
      bodyXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="60" w:line="100" w:lineRule="auto"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="000000"/></w:pBdr></w:pPr></w:p>`;

      // Sections & Questions
      for (const sec of parsedData.sections) {
        if (sec.title) {
          bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(sec.title, options)}</w:t></w:r></w:p>`;
        }

        for (const q of sec.questions) {
          const qTextTrimmed = (q.text || '').trim();
          let firstLineText = qTextTrimmed;
          let remainingStimLines = [];
          if (q.stimulus) {
            const allStimLines = q.stimulus.split('\n').map(l => l.trim()).filter(Boolean);
            if (!firstLineText && allStimLines.length > 0) {
              const fLine = allStimLines[0].trim();
              if (fLine.startsWith('|') && fLine.endsWith('|')) {
                firstLineText = '';
                remainingStimLines = allStimLines;
              } else {
                firstLineText = allStimLines[0];
                remainingStimLines = allStimLines.slice(1);
              }
            } else {
              remainingStimLines = allStimLines;
            }
          }

          const qNumRun = `<w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(q.num + '।', options)}</w:t></w:r>`;
          const qTextRuns = this.renderDocxRuns(firstLineText, options, { sz: 24 });
          bodyXml += `<w:p><w:pPr><w:spacing w:before="60" w:after="20" w:line="240" w:lineRule="auto"/><w:ind w:left="432" w:hanging="432"/><w:tabs><w:tab w:val="left" w:pos="432"/><w:tab w:val="right" w:pos="${rightTabPos}"/></w:tabs></w:pPr>${qNumRun}<w:r><w:tab/></w:r>${qTextRuns}</w:p>`;

          if (remainingStimLines.length > 0) {
            let inTable = false;
            for (const sLine of remainingStimLines) {
              if (sLine.trim().startsWith('|') && sLine.trim().endsWith('|')) {
                if (sLine.includes('---')) continue;
                const cells = sLine.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
                let tr = '<w:tr>';
                for (const cell of cells) {
                  tr += `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/><w:tcBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${this.renderDocxRuns(cell, options, { sz: 24 })}</w:p></w:tc>`;
                }
                tr += '</w:tr>';
                if (!inTable) { 
                  bodyXml += '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr><w:tblGrid>';
                  for(let i=0; i<cells.length; i++) bodyXml += '<w:gridCol/>';
                  bodyXml += '</w:tblGrid>';
                  inTable = true;
                }
                bodyXml += tr;
              } else {
                if (inTable) { bodyXml += '</w:tbl>'; inTable = false; }
                bodyXml += `<w:p><w:pPr><w:spacing w:before="15" w:after="20" w:line="240" w:lineRule="auto"/><w:ind w:left="432"/></w:pPr>${this.renderDocxRuns(sLine, options, { sz: 24 })}</w:p>`;
              }
            }
            if (inTable) bodyXml += '</w:tbl>';
          }

          if (q.subQuestions && q.subQuestions.length > 0) {
            for (const sub of q.subQuestions) {
              let rawText = sub.label + '. ' + sub.text;
              // Prevent overlapping by splitting (খ) and (গ) onto new lines if they were merged by OCR
              rawText = rawText.replace(/\s*\((খ|গ)\)\s*/g, '\n($1) ');
              const subLines = rawText.split('\n');
              for (let i = 0; i < subLines.length; i++) {
                const subTextRuns = this.renderDocxRuns(subLines[i], options, { sz: 24 });
                // Print the mark on the first line (usually the only line)
                const isFirst = (i === 0);
                const subMarkRun = (isFirst && sub.mark) ? `<w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(sub.mark, options)}</w:t></w:r>` : '';
                bodyXml += `<w:p><w:pPr><w:spacing w:before="15" w:after="15" w:line="240" w:lineRule="auto"/><w:ind w:left="864" w:hanging="432"/><w:tabs><w:tab w:val="left" w:pos="864"/><w:tab w:val="right" w:pos="${rightTabPos}"/></w:tabs></w:pPr>${subTextRuns}<w:r><w:tab/></w:r>${subMarkRun}</w:p>`;
              }
            }
          }

          if (q.statements && q.statements.length > 0) {
            for (const stmt of q.statements) {
              bodyXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="432"/></w:pPr>${this.renderDocxRuns(stmt, options, { sz: 24 })}</w:p>`;
            }
          }

          if (q.options && q.options.length > 0) {
            const opts = q.options;
            if (opts.length >= 4) {
              const o0 = this.renderDocxRuns(`(${opts[0].label}) ${opts[0].text}`, options, { sz: 24 });
              const o1 = this.renderDocxRuns(`(${opts[1].label}) ${opts[1].text}`, options, { sz: 24 });
              const o2 = this.renderDocxRuns(`(${opts[2].label}) ${opts[2].text}`, options, { sz: 24 });
              const o3 = this.renderDocxRuns(`(${opts[3].label}) ${opts[3].text}`, options, { sz: 24 });

              bodyXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="234"/><w:tabs><w:tab w:val="left" w:pos="3600"/></w:tabs></w:pPr>${o0}<w:r><w:tab/></w:r>${o1}</w:p>`;
              bodyXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="20" w:line="240" w:lineRule="auto"/><w:ind w:left="234"/><w:tabs><w:tab w:val="left" w:pos="3600"/></w:tabs></w:pPr>${o2}<w:r><w:tab/></w:r>${o3}</w:p>`;
            } else {
              let runs = '';
              for (let oi = 0; oi < opts.length; oi++) {
                if (oi > 0) runs += '<w:r><w:tab/></w:r>';
                runs += this.renderDocxRuns(`(${opts[oi].label}) ${opts[oi].text}`, options, { sz: 24 });
              }
              bodyXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="20" w:line="240" w:lineRule="auto"/><w:ind w:left="234"/><w:tabs><w:tab w:val="left" w:pos="2450"/><w:tab w:val="left" w:pos="4900"/><w:tab w:val="left" w:pos="7350"/></w:tabs></w:pPr>${runs}</w:p>`;
            }
          }
        }
      }

      if (options.auditNote) {
        bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="240"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t>Verification Notes</w:t></w:r></w:p>`;
        const lines = options.auditNote.split('\n');
        for (const line of lines) {
           bodyXml += `<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>${this.renderDocxRuns(line, options, { sz: 24 })}</w:p>`;
        }
      }

      // Landscape 2-column section
      const sectPr = `
        <w:sectPr>
          <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
          <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/>
          <w:cols w:num="2" w:space="1008"/>
        </w:sectPr>`;

      if (options.returnInnerXml) {
        return { bodyXml, sectPr };
      }
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
     * Generates Board Standard MCQ Word RTF Document.
     */
    generateMcqExamRtf(parsedData, options = {}) {
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';

      let rtf = '';
      if (!options.returnInnerRtf) {
        rtf += '{\\rtf1\\ansi\\deff0\n';
        rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
        rtf += '{\\colortbl;\\red0\\green0\\blue0;}\n';
      }

      const marginTwips = options.margin === 0.4 ? 576 : 720;
      const pageWidth = 11906 - 2 * marginTwips;

      // Section 1: Single column for Header
      rtf += `\\paperw11906\\paperh16838\\margl${marginTwips}\\margr${marginTwips}\\margt${marginTwips}\\margb${marginTwips}\\cols1\n`;

      const h = parsedData.header;
      if (h.institute) {
        rtf += '{\\qc\\b\\fs32\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.institute, options) + '\\par}\n';
      }
      if (h.location) {
        rtf += '{\\qc\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.location, options) + '\\par}\n';
      }
      if (h.exam) {
        rtf += '{\\qc\\b\\fs26\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.exam, options) + '\\par}\n';
      }
      if (h.classAndSubject) {
        rtf += '{\\qc\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.classAndSubject, options) + '\\par}\n';
      }
      if (h.time || h.marks || h.examType) {
        const tTxt = h.time ? this.formatRtfText('সময়: ' + h.time, options) : '';
        const mTxt = h.marks ? this.formatRtfText('পূর্ণমান: ' + h.marks, options) : '';
        if (h.examType) {
          const eTxt = this.formatRtfText(h.examType, options);
          const midX = Math.round(pageWidth / 2);
          const rightX = pageWidth - 100;
          rtf += '{\\ql\\b\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0\\tqc\\tx' + midX + '\\tqr\\tx' + rightX + ' ' + tTxt + '\\tab {\\b\\ul ' + eTxt + '}\\tab ' + mTxt + '\\par}\n';
        } else {
          rtf += '{\\ql\\b\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0\\tqr\\tx' + (pageWidth - 100) + ' ' + tTxt + '\\tab ' + mTxt + '\\par}\n';
        }
      }
      if (h.instructions) {
        rtf += '{\\qc\\i\\fs22\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(h.instructions, options) + '\\par}\n';
      }
      rtf += '{\\ql\\fs4\\f0\\sl100\\slmult1\\sb0\\sa20\\brdrb\\brdrs\\brdrw10\\brsp20 \\par}\n';

      // Collect questions
      const allQuestions = [];
      for (const sec of parsedData.sections) {
        for (const q of sec.questions) allQuestions.push(q);
      }
      const N = allQuestions.length;

      let compactLines = 0;
      for (const q of allQuestions) {
        const titleLines = Math.ceil((q.num.length + 2 + q.text.length) / 38);
        compactLines += Math.max(1, titleLines);
        if (q.preContext) compactLines += q.preContext.split('\n').filter(Boolean).length;
        if (q.stimulus) compactLines += q.stimulus.split('\n').filter(Boolean).length;
        if (q.statements && q.statements.length > 0) compactLines += q.statements.length;
        if (q.options && q.options.length > 0) compactLines += 1;
      }
      let headerLines = 6;
      if (h.instructions) headerLines += Math.ceil(h.instructions.length / 75);
      const totalCompactLines = compactLines + headerLines;

      let layoutMode = options.layoutMode || 'AUTO';
      if (layoutMode === 'AUTO') {
        if (totalCompactLines > 102) layoutMode = 'C';
        else if (totalCompactLines < 70) layoutMode = 'B';
        else layoutMode = 'A';
      }

      const isTwoPage = layoutMode === 'C';
      const isTwoLineOptions = layoutMode === 'B' || isTwoPage;
      const lineMultiplier = isTwoPage ? 1.18 : (layoutMode === 'B' ? 1.20 : 1.0);
      const lineSpacingTwips = Math.round(240 * lineMultiplier);
      const lineSpacingRtf = `\\sl${lineSpacingTwips}\\slmult1`;

      // Section 2: Continuous 2 Columns
      rtf += `\\sect\\sbknone\\margl${marginTwips}\\margr${marginTwips}\\margt${marginTwips}\\margb${marginTwips}\\cols2\\colsx288\\linebetcol\n`;

      let p1End = N;
      let p1Col1End = Math.ceil(N / 2);

      if (isTwoPage) {
        if (options.splitIndex) {
          p1End = options.splitIndex;
          p1Col1End = options.col1End || Math.ceil(p1End / 2);
        } else {
          p1End = Math.min(N, 20);
          p1Col1End = Math.ceil(p1End / 2);
        }
      }

      const p1Col1Questions = allQuestions.slice(0, p1Col1End);
      const p1Col2Questions = allQuestions.slice(p1Col1End, p1End);
      const page2Questions = isTwoPage ? allQuestions.slice(p1End) : [];
      const p2Half = Math.ceil(page2Questions.length / 2);
      const page2Col1 = page2Questions.slice(0, p2Half);
      const page2Col2 = page2Questions.slice(p2Half);

      const renderQuestionsList = (questions) => {
        let block = '';
        for (const q of questions) {
          if (q.preContext) {
            const ctxLines = q.preContext.split('\n').map(l => l.trim()).filter(Boolean);
            for (const cLine of ctxLines) {
              block += `{\\ql\\b\\i\\fs24\\f0${lineSpacingRtf}\\sb20\\sa0\\li0\\fi0 ` + this.formatRtfText(cLine, options) + '\\par}\n';
            }
          }

          block += `{\\ql\\b\\fs24\\f0${lineSpacingRtf}\\sb${isTwoPage ? '10' : '0'}\\sa0\\li260\\fi-260 ` + this.formatRtfText(q.num + '. ' + q.text, options) + '\\par}\n';

          if (q.statements && q.statements.length > 0) {
            for (const stmt of q.statements) {
              block += `{\\ql\\fs24${lineSpacingRtf}\\sb0\\sa0\\li260 ` + this.renderMcqTextRtf(stmt, options) + '\\par}\n';
            }
          } else if (q.stimulus) {
            const stimLines = q.stimulus.split('\n').map(l => l.trim()).filter(Boolean);
            for (const sLine of stimLines) {
              block += `{\\ql\\b\\i\\fs24\\f0${lineSpacingRtf}\\sb0\\sa0\\li0\\fi0 ` + this.formatRtfText(sLine, options) + '\\par}\n';
            }
          }

          if (q.options && q.options.length > 0) {
            const opts = q.options;
            if (opts.length >= 4) {
              const maxLen = Math.max(...opts.map(o => o.text.length));
              const totalLen = opts.reduce((s, o) => s + o.text.length, 0);
              const isRoman = opts.every(o => /(?:^|[\s,(])(?:i{1,3}|iv|র{1,3})(?:[\s,.)]|$)/i.test(o.text));

              let o0 = '({\\f0 ' + this.formatRtfText(opts[0].label, options) + '}) ' + this.renderMcqTextRtf(opts[0].text, options);
              let o1 = '({\\f0 ' + this.formatRtfText(opts[1].label, options) + '}) ' + this.renderMcqTextRtf(opts[1].text, options);
              let o2 = '({\\f0 ' + this.formatRtfText(opts[2].label, options) + '}) ' + this.renderMcqTextRtf(opts[2].text, options);
              let o3 = '({\\f0 ' + this.formatRtfText(opts[3].label, options) + '}) ' + this.renderMcqTextRtf(opts[3].text, options);

              if (!isTwoLineOptions && (isRoman || (maxLen <= 14 && totalLen <= 48))) {
                block += `{\\ql\\fs24${lineSpacingRtf}\\sb0\\sa0\\li260\\tx1250\\tx2450\\tx3650 ` + o0 + '\\tab ' + o1 + '\\tab ' + o2 + '\\tab ' + o3 + '\\par}\n';
              } else {
                block += `{\\ql\\fs24${lineSpacingRtf}\\sb0\\sa0\\li260\\tx2450 ` + o0 + '\\tab ' + o1 + '\\par}\n';
                block += `{\\ql\\fs24${lineSpacingRtf}\\sb0\\sa${isTwoPage ? '15' : '0'}\\li260\\tx2450 ` + o2 + '\\tab ' + o3 + '\\par}\n';
              }
            } else {
              let optLine = '';
              for (let oi = 0; oi < opts.length; oi++) {
                const optRtf = '({\\f0 ' + this.formatRtfText(opts[oi].label, options) + '}) ' + this.renderMcqTextRtf(opts[oi].text, options);
                optLine += (oi > 0 ? '\\tab ' : '') + optRtf;
              }
              block += `{\\ql\\fs24${lineSpacingRtf}\\sb0\\sa0\\li260\\tx2450\\tx4900\\tx7350 ` + optLine + '\\par}\n';
            }
          }
        }
        return block;
      };

      rtf += renderQuestionsList(p1Col1Questions);

      if (isTwoPage && p1Col2Questions.length > 0) {
        rtf += `\\column\n`;
        rtf += renderQuestionsList(p1Col2Questions);
      } else if (!isTwoPage && p1Col2Questions.length > 0) {
        rtf += renderQuestionsList(p1Col2Questions);
      }

      if (isTwoPage && page2Questions.length > 0) {
        rtf += `\\page\n`;
        rtf += renderQuestionsList(page2Col1);
        rtf += `\\column\n`;
        rtf += renderQuestionsList(page2Col2);
      }

      if (!options.returnInnerRtf) {
        rtf += '}\n';
      }
      return rtf;
    },

    /**
     * Generates Board Standard MCQ Modern Word (.docx).
     */
    async generateMcqExamDocx(parsedData, options = {}) {
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';
      const marginTwips = options.margin === 0.4 ? 576 : 720;
      const pageWidth = 11906 - 2 * marginTwips;

      let bodyXml = '';

      // 1. Header Block (Single Column)
      const h = parsedData.header;
      if (h.institute) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(h.institute, options)}</w:t></w:r></w:p>`;
      }
      if (h.location) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(h.location, options)}</w:t></w:r></w:p>`;
      }
      if (h.exam) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(h.exam, options)}</w:t></w:r></w:p>`;
      }
      if (h.classAndSubject) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(h.classAndSubject, options)}</w:t></w:r></w:p>`;
      }
      if (h.time || h.marks || h.examType) {
        const tTxt = h.time ? this.formatDocxText('সময়: ' + h.time, options) : '';
        const mTxt = h.marks ? this.formatDocxText('পূর্ণমান: ' + h.marks, options) : '';
        const midPos = Math.round(pageWidth / 2);
        const rightPos = pageWidth - 100;

        if (h.examType) {
          const eTxt = this.formatDocxText(h.examType, options);
          bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/><w:tabs><w:tab w:val="center" w:pos="${midPos}"/><w:tab w:val="right" w:pos="${rightPos}"/></w:tabs></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${tTxt}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${eTxt}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${mTxt}</w:t></w:r></w:p>`;
        } else {
          bodyXml += `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/><w:tabs><w:tab w:val="right" w:pos="${rightPos}"/></w:tabs></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${tTxt}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${mTxt}</w:t></w:r></w:p>`;
        }
      }
      if (h.instructions) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="240" w:lineRule="auto" w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${this.formatDocxText(h.instructions, options)}</w:t></w:r></w:p>`;
      }
      bodyXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="40" w:line="100" w:lineRule="auto"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="000000"/></w:pBdr></w:pPr></w:p>`;

      // Section break to continuous 2-column layout
      bodyXml += `
        <w:p>
          <w:pPr>
            <w:sectPr>
              <w:type w:val="continuous"/>
              <w:pgSz w:w="11906" w:h="16838"/>
              <w:pgMar w:top="${marginTwips}" w:right="${marginTwips}" w:bottom="${marginTwips}" w:left="${marginTwips}"/>
              <w:cols w:num="1"/>
            </w:sectPr>
          </w:pPr>
        </w:p>`;

      // Collect all questions
      const allQuestions = [];
      for (const sec of parsedData.sections) {
        for (const q of sec.questions) allQuestions.push(q);
      }
      const N = allQuestions.length;
      const isTwoPage = N > 20 || options.layoutMode === 'C';
      const p1Split = options.splitIndex || (isTwoPage ? 20 : N);

      const renderDocxQuestion = (q) => {
        let qXml = '';
        if (q.preContext) {
          const ctxLines = q.preContext.split('\n').map(l => l.trim()).filter(Boolean);
          for (const cLine of ctxLines) {
            qXml += `<w:p><w:pPr><w:spacing w:before="40" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>${this.renderDocxRuns(cLine, options, { b: true, i: true, sz: 24 })}</w:p>`;
          }
        }
        qXml += `<w:p><w:pPr><w:spacing w:before="20" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="260" w:hanging="260"/></w:pPr>${this.renderDocxRuns(q.num + '. ' + q.text, options, { b: true, sz: 24 })}</w:p>`;

        if (q.statements && q.statements.length > 0) {
          for (const s of q.statements) {
            qXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="260"/></w:pPr>${this.renderDocxRuns(s, options, { sz: 24 })}</w:p>`;
          }
        } else if (q.stimulus) {
          const stimLines = q.stimulus.split('\n').map(l => l.trim()).filter(Boolean);
          for (const sLine of stimLines) {
            qXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="0"/></w:pPr>${this.renderDocxRuns(sLine, options, { b: true, i: true, sz: 24 })}</w:p>`;
          }
        }

        if (q.options && q.options.length > 0) {
          const opts = q.options;
          if (opts.length >= 4) {
            const o0 = this.renderDocxRuns(`(${opts[0].label}) ${opts[0].text}`, options, { sz: 24 });
            const o1 = this.renderDocxRuns(`(${opts[1].label}) ${opts[1].text}`, options, { sz: 24 });
            const o2 = this.renderDocxRuns(`(${opts[2].label}) ${opts[2].text}`, options, { sz: 24 });
            const o3 = this.renderDocxRuns(`(${opts[3].label}) ${opts[3].text}`, options, { sz: 24 });

            qXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="260"/><w:tabs><w:tab w:val="left" w:pos="2450"/></w:tabs></w:pPr>${o0}<w:r><w:tab/></w:r>${o1}</w:p>`;
            qXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="10" w:line="240" w:lineRule="auto"/><w:ind w:left="260"/><w:tabs><w:tab w:val="left" w:pos="2450"/></w:tabs></w:pPr>${o2}<w:r><w:tab/></w:r>${o3}</w:p>`;
          } else {
            let runs = '';
            for (let oi = 0; oi < opts.length; oi++) {
              if (oi > 0) runs += '<w:r><w:tab/></w:r>';
              runs += this.renderDocxRuns(`(${opts[oi].label}) ${opts[oi].text}`, options, { sz: 24 });
            }
            qXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="10" w:line="240" w:lineRule="auto"/><w:ind w:left="260"/><w:tabs><w:tab w:val="left" w:pos="2450"/><w:tab w:val="left" w:pos="4900"/><w:tab w:val="left" w:pos="7350"/></w:tabs></w:pPr>${runs}</w:p>`;
          }
        }
        return qXml;
      };

      for (let i = 0; i < allQuestions.length; i++) {
        if (isTwoPage && i === p1Split) {
          bodyXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
        }
        bodyXml += renderDocxQuestion(allQuestions[i]);
      }

      // Final 2-column Section Properties
      const sectPr = `
        <w:sectPr>
          <w:pgSz w:w="11906" w:h="16838"/>
          <w:pgMar w:top="${marginTwips}" w:right="${marginTwips}" w:bottom="${marginTwips}" w:left="${marginTwips}"/>
          <w:cols w:num="2" w:space="288" w:sep="1"/>
        </w:sectPr>`;

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

    generateGenericRtf(rawText, docType, options = {}) {
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';
      let rtf = '{\\rtf1\\ansi\\deff0\n';
      rtf += `{\\fonttbl\n{\\f0\\fnil\\fcharset0 ${fontName};}\n{\\f1\\fnil\\fcharset0 Times New Roman;}\n}\n`;
      rtf += '{\\colortbl;\\red0\\green0\\blue0;}\n';
      rtf += '\\paperw11906\\paperh16838\\margl720\\margr720\\margt720\\margb720\n';
      const lines = String(rawText || '').split('\\n');
      for (const line of lines) {
        if (!line.trim()) {
          rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0 \\par}\n';
        } else {
          rtf += '{\\ql\\fs24\\f0\\sl240\\slmult1\\sb0\\sa0 ' + this.formatRtfText(line, options) + '\\par}\n';
        }
      }
      rtf += '}';
      return rtf;
    },

    async generateGenericDocx(rawText, docType, options = {}) {
      const isBijoy = this.isBijoyFont(options);
      const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';
      const contentXmlParts = [];
      const lines = String(rawText || '').split('\\n');
      for (const line of lines) {
        if (!line.trim()) {
          contentXmlParts.push(`<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>`);
        } else {
          contentXmlParts.push(`<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>`);
          contentXmlParts.push(this.formatDocxText(line, options));
          contentXmlParts.push(`</w:p>`);
        }
      }
      return await this._buildDocxPackage(contentXmlParts.join(''), fontName, options);
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
