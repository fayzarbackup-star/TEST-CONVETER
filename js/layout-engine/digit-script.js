/**
 * Fayzar — অঙ্ক-লিপি মেলানো (Phase 4B)
 * =====================================
 * reconcileDigits(designText, ocrText)
 *   ডাক ১-এর স্বয়ংক্রিয় OCR-এ সংখ্যা-টোকেন যে লিপিতে আছে (বাংলা বা ইংরেজি),
 *   নকশা-পত্রের মিলে যাওয়া টোকেনকে সেই লিপিতে আনে।
 *   কোনো টোকেন না মিললে পুরো নথির সংখ্যাগরিষ্ঠ লিপি ব্যবহার করে।
 *   OCR লেখা না থাকলে কিছু বদলায় না।
 *   ব্রাউজার ও Node উভয় পরিবেশে চলে।
 */
(function (global) {
  'use strict';

  const toEnDigit = (s) => String(s).replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6));
  const toBnDigit = (s) => String(s).replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 48 + 0x09E6));

  function reconcileDigits(designText, ocrText) {
    if (designText == null) return designText;
    if (!ocrText || typeof ocrText !== 'string' || !ocrText.trim()) return designText;

    // OCR টেক্সট থেকে মেটাডাটা ও ট্যাগ সরিয়ে শুধু কনটেন্ট দেখা
    const ocrClean = String(ocrText)
      .replace(/^---[\s\S]*?---\s*\n/m, '')
      .replace(/\[\[B:[^\]]*\]\]/g, '');

    const ocrBn = (ocrClean.match(/[০-৯]/g) || []).length;
    const ocrEn = (ocrClean.match(/[0-9]/g) || []).length;
    const docMajority = ocrEn > ocrBn ? 'en' : (ocrBn > ocrEn ? 'bn' : null);

    // OCR থেকে টোকেন-স্ক্রিপ্ট মানচিত্র
    const tokenMap = new Map();
    const ocrTokens = ocrClean.match(/[0-9০-৯]+/g) || [];
    for (const t of ocrTokens) {
      const canon = toEnDigit(t);
      const hasBn = /[০-৯]/.test(t);
      const hasEn = /[0-9]/.test(t);
      const script = hasBn && !hasEn ? 'bn' : (hasEn && !hasBn ? 'en' : null);
      if (script && !tokenMap.has(canon)) {
        tokenMap.set(canon, script);
      }
    }

    function transformContent(str) {
      if (typeof str !== 'string') return str;
      return str.replace(/[0-9০-৯]+/g, (m) => {
        const canon = toEnDigit(m);
        const script = tokenMap.get(canon) || docMajority;
        if (script === 'en') return toEnDigit(m);
        if (script === 'bn') return toBnDigit(m);
        return m;
      });
    }

    // স্ট্রিং হলে লাইন ধরে প্রসেস (ট্যাগ [[B:...]] ও ফ্রন্টম্যাটার সুরক্ষিত রাখা)
    if (typeof designText === 'string') {
      const lines = designText.split('\n');
      let inFm = false;
      const out = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === 0 && line.trim() === '---') {
          inFm = true;
          out.push(line);
          continue;
        }
        if (inFm) {
          if (line.trim() === '---') {
            inFm = false;
            out.push(line);
            continue;
          }
          if (/^digits:\s*/.test(line)) {
            out.push(docMajority ? 'digits: ' + docMajority : line);
            continue;
          }
          out.push(line);
          continue;
        }
        if (/^\[\[B:.*\]\]$/.test(line.trim())) {
          out.push(line);
        } else {
          out.push(transformContent(line));
        }
      }
      return out.join('\n');
    }

    // অবজেক্ট (ক্যাপচার অবজেক্ট) হলে
    if (typeof designText === 'object' && designText !== null) {
      if (designText.text) {
        designText.text = reconcileDigits(designText.text, ocrText);
      }
      if (Array.isArray(designText.blocks)) {
        designText.blocks.forEach((b) => {
          if (b.text) b.text = transformContent(b.text);
          if (Array.isArray(b.lines)) b.lines = b.lines.map(transformContent);
        });
      }
      if (designText.frontmatter && docMajority) {
        designText.frontmatter.digits = docMajority;
      }
      return designText;
    }

    return designText;
  }

  const FayzarDigitScript = { reconcileDigits, toEnDigit, toBnDigit };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FayzarDigitScript;
  }
  global.FayzarDigitScript = FayzarDigitScript;
})(typeof globalThis !== 'undefined' ? globalThis : this);
