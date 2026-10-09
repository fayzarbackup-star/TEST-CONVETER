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

  /**
   * ডিগ্রি-সুপারস্ক্রিপ্ট → সাধারণ `°` (U+00B0): `80^\circ`, `80^{\circ}`, `80^{o}`, `80^°`, `^\degree`।
   * `°` গ্লিফ নিজেই ওপরে ওঠানো — আগে .docx-এ এটি sSup (৮pt) হয়ে দ্বিগুণ ছোট দেখাত।
   * `x^0`-জাতীয় প্রকৃত ঘাত অপরিবর্তিত (শুধু ° / \circ / \degree / অক্ষর o)।
   */
  function normalizeDegrees(latex) {
    return String(latex == null ? '' : latex)
      .replace(/\^\s*\{\s*(?:\\circ|\\degree|°|o)\s*\}/g, '°')
      .replace(/\^\s*(?:\\circ\b|\\degree\b|°)/g, '°')
      .replace(/\^\s*o(?![A-Za-z])/g, '°');
  }

  const TextRunProcessor = {
    normalizeDegrees,
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
          const rawVal = normalizeDegrees(seg.value || seg.text || '');
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

      // সবসময় (ইউনিকোডেও): সাইটের বিজয় .docx/.doc ইউনিকোড-মাস্টার থেকে রূপান্তরে তৈরি হয় (DocxHandler u2b),
      // যা বাংলা-ছাড়া রান অক্ষত রাখে — তাই মাস্টারেই চিহ্নগুলো আলাদা রানে থাকা চাই
      return isolateBijoyUnsafe(runs);
    }
  };

  /**
   * Part-18.9: বিজয় (SutonnyMJ) ফন্টে কিছু ল্যাটিন চিহ্নের কোডে অন্য বাংলা অক্ষর বসানো —
   * '_' দেখায় "থ" (শূন্যস্থানের দাগ "থথথথ" হয়ে যেত), '×' দেখায় "ম" ("১×৫=৫" → "১ম৫=৫"), '÷'-ও ভুল।
   * এগুলো বাংলা-রান থেকে আলাদা করে Times New Roman রানে পাঠানো হয় (রূপান্তর ছাড়াই, যেমন ইংরেজি)।
   * ইউনিকোডেও একই (চিহ্নগুলো Times New Roman-এ দেখতে একই); সমীকরণ-রান স্পর্শ করা হয় না।
   */
  function isolateBijoyUnsafe(runs) {
    const RE = /[_×÷]+/g;
    const out = [];
    for (const r of runs) {
      if (!r || r.type !== 'bengali' || !/[_×÷]/.test(r.text || '')) { out.push(r); continue; }
      const s = r.text;
      let last = 0;
      let m;
      RE.lastIndex = 0;
      while ((m = RE.exec(s))) {
        if (m.index > last) out.push({ type: 'bengali', text: s.slice(last, m.index), fontHint: null });
        out.push({ type: 'english', text: m[0], fontHint: 'Times New Roman' });
        last = m.index + m[0].length;
      }
      if (last < s.length) out.push({ type: 'bengali', text: s.slice(last), fontHint: null });
    }
    return out;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = TextRunProcessor;
  if (typeof window !== 'undefined') window.TextRunProcessor = TextRunProcessor;
  if (typeof globalThis !== 'undefined') globalThis.TextRunProcessor = TextRunProcessor;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
