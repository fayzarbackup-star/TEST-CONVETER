/**
 * Fayzar Publishing Studio - Central Text-Run Processor
 * Coordinates EquationConverter and BanglaConverter to split mixed content into font-tagged and OMML/LaTeX math runs.
 * Fully offline, zero external dependencies, strictly preserves core engine contracts.
 */
(function(global) {
  'use strict';

  function getEquationConverter() {
    if (typeof EquationConverter !== 'undefined') return EquationConverter;
    if (typeof window !== 'undefined' && window.EquationConverter) return window.EquationConverter;
    if (typeof globalThis !== 'undefined' && globalThis.EquationConverter) return globalThis.EquationConverter;
    if (typeof global !== 'undefined' && global.EquationConverter) return global.EquationConverter;
    if (typeof require === 'function') {
      try {
        return require('../equation-converter.js');
      } catch (e) {
        try {
          return require('./equation-converter.js');
        } catch (e2) {}
      }
    }
    return null;
  }

  function getBanglaConverter() {
    if (typeof BanglaConverter !== 'undefined') return BanglaConverter;
    if (typeof window !== 'undefined' && window.BanglaConverter) return window.BanglaConverter;
    if (typeof globalThis !== 'undefined' && globalThis.BanglaConverter) return globalThis.BanglaConverter;
    if (typeof global !== 'undefined' && global.BanglaConverter) return global.BanglaConverter;
    if (typeof require === 'function') {
      try {
        return require('../bangla-converter-engine.js');
      } catch (e) {
        try {
          return require('./bangla-converter-engine.js');
        } catch (e2) {}
      }
    }
    return null;
  }

  const TextRunProcessor = {
    /**
     * Splits mixed text containing LaTeX math, Bengali, and English into structured runs.
     * @param {string} text - Raw input string.
     * @param {Object} [options] - Processing options.
     * @param {boolean} [options.isBijoy=false] - Whether output is targeted for Bijoy font encoding.
     * @param {boolean} [options.generateOmml=true] - Whether to generate OOXML OMML for math segments.
     * @returns {Array<Object>} Array of run objects:
     *   - Text run: { type: 'bengali'|'english', text: string, fontHint: string|null }
     *   - Math run: { type: 'math', value: string, rawLatex: string, cleanLatex: string, ommlXml: string|null, conversionError: boolean }
     */
    processTextRuns(text, options = {}) {
      if (!text || typeof text !== 'string') return [];

      const EqConv = getEquationConverter();
      const BnConv = getBanglaConverter();
      const isBijoy = !!options.isBijoy;
      const generateOmml = options.generateOmml !== false;

      // 1. Math vs Plain-text segmentation
      let primarySegments = [];
      if (EqConv && typeof EqConv.splitTextAndMath === 'function') {
        primarySegments = EqConv.splitTextAndMath(text);
      } else {
        primarySegments = [{ type: 'text', value: text }];
      }

      const runs = [];

      for (let i = 0; i < primarySegments.length; i++) {
        const seg = primarySegments[i];
        if (!seg) continue;

        // Math segment: defensive check for value or text property
        if (seg.type === 'math') {
          const rawVal = seg.value || seg.text || '';
          let cleanVal = rawVal;
          if (EqConv && typeof EqConv.cleanLatexSymbols === 'function') {
            cleanVal = EqConv.cleanLatexSymbols(rawVal);
          }

          let omml = null;
          let conversionError = false;
          if (generateOmml && EqConv && typeof EqConv.latexToOmml === 'function') {
            try {
              omml = EqConv.latexToOmml(rawVal, isBijoy);
            } catch (e) {
              omml = null;
              conversionError = true;
            }
          }

          runs.push({
            type: 'math',
            value: rawVal,
            rawLatex: rawVal,
            cleanLatex: cleanVal,
            ommlXml: omml,
            conversionError: conversionError
          });
          continue;
        }

        // Text segment: defensive check for value or text property
        const textVal = seg.value || seg.text || '';
        if (!textVal) continue;

        // 2. Bengali vs English segmentation inside plain text
        if (BnConv && typeof BnConv.splitMixedBengaliAndEnglish === 'function') {
          const subSegs = BnConv.splitMixedBengaliAndEnglish(textVal);
          for (let j = 0; j < subSegs.length; j++) {
            const sub = subSegs[j];
            if (!sub || !sub.text) continue;

            runs.push({
              type: sub.type === 'english' ? 'english' : 'bengali',
              text: sub.text,
              fontHint: sub.type === 'english' ? 'Times New Roman' : null
            });
          }
        } else {
          // Advanced Fallback Tokenizer when BanglaConverter is unavailable
          // Accurately isolates Latin/English tokens from Bengali without lumping mixed text
          const tokens = textVal.split(/([A-Za-z0-9\s.,!?;:'"()\[\]{}\-+/=]+)/).filter(Boolean);
          for (let k = 0; k < tokens.length; k++) {
            const token = tokens[k];
            const hasLatin = /[A-Za-z]/.test(token);
            runs.push({
              type: hasLatin ? 'english' : 'bengali',
              text: token,
              fontHint: hasLatin ? 'Times New Roman' : null
            });
          }
        }
      }

      return runs;
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TextRunProcessor;
  if (typeof window !== 'undefined') window.TextRunProcessor = TextRunProcessor;
  if (typeof globalThis !== 'undefined') globalThis.TextRunProcessor = TextRunProcessor;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
