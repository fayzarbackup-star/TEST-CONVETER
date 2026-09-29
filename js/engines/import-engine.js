/**
 * Fayzar Publishing Studio - File Import Engine
 * Supports:
 *  1. Plain .txt files (Unicode & Bijoy auto-detect)
 *  2. .docx files (Word 2007-2024) — extracts plain text via JSZip
 *  3. Drag-and-drop from filesystem
 */

(function(global) {
  'use strict';

  const ImportEngine = {

    /**
     * Detects if text is Bijoy (ANSI) encoded by checking for high-frequency SutonnyMJ chars.
     */
    isBijoyEncoded(text) {
      if (!text) return false;
      const unicodeCount = (text.match(/[\u0980-\u09FF]/g) || []).length;
      const bijoyCount = (text.match(/[Avbcxkq~\u00A0-\u00FF]/g) || []).length;
      return bijoyCount > 20 && unicodeCount < 5;
    },

    /**
     * Reads a .txt file and returns text content.
     * Auto-detects Bijoy encoding and converts if needed.
     */
    async readTxtFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          let text = e.target.result;
          const wasBijoy = this.isBijoyEncoded(text);
          if (wasBijoy) {
            let engine = null;
            if (global.BanglaConverter) engine = global.BanglaConverter;
            else if (typeof window !== 'undefined' && window.BanglaConverter) engine = window.BanglaConverter;
            if (engine && engine.bijoyToUnicode) {
              text = engine.bijoyToUnicode(text);
            }
          }
          resolve({ text, wasConverted: wasBijoy });
        };
        reader.onerror = () => reject(new Error('ফাইল পড়া সম্ভব হয়নি।'));
        reader.readAsText(file, 'UTF-8');
      });
    },

    /**
     * Reads a .docx file and extracts plain text from word/document.xml via JSZip.
     */
    async readDocxFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            let JSZipLib = null;
            if (typeof JSZip !== 'undefined') JSZipLib = JSZip;
            else if (global.JSZip) JSZipLib = global.JSZip;
            if (!JSZipLib) {
              reject(new Error('JSZip লাইব্রেরি পাওয়া যায়নি।'));
              return;
            }

            const zip = await JSZipLib.loadAsync(e.target.result);
            const docXmlFile = zip.file('word/document.xml');
            if (!docXmlFile) {
              reject(new Error('ডকুমেন্ট ফাইলের ভেতর word/document.xml পাওয়া যায়নি।'));
              return;
            }

            const xmlString = await docXmlFile.async('string');
            const text = this.extractTextFromDocXml(xmlString);
            resolve({ text, wasConverted: false });
          } catch (err) {
            reject(new Error('DOCX পার্স করা সম্ভব হয়নি: ' + err.message));
          }
        };
        reader.onerror = () => reject(new Error('ফাইল পড়া সম্ভব হয়নি।'));
        reader.readAsArrayBuffer(file);
      });
    },

    /**
     * Extracts readable text from OOXML (word/document.xml).
     */
    extractTextFromDocXml(xmlString) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'application/xml');
      const body = doc.querySelector('body');
      if (!body) return '';

      const lines = [];
      const paragraphs = body.querySelectorAll('p');

      paragraphs.forEach(para => {
        let lineText = '';

        // Iterate all child nodes recursively
        const extractRuns = (node) => {
          node.childNodes.forEach(child => {
            const ln = child.localName;
            if (ln === 't') {
              lineText += child.textContent;
            } else if (ln === 'tab') {
              lineText += '\t';
            } else if (ln === 'br') {
              lineText += '\n';
            } else if (child.childNodes && child.childNodes.length) {
              extractRuns(child);
            }
          });
        };

        extractRuns(para);
        lines.push(lineText);
      });

      return lines.join('\n');
    },

    /**
     * Main entry point. Accepts a File object and returns { text, wasConverted, format }.
     */
    async importFile(file) {
      if (!file) throw new Error('কোনো ফাইল নির্বাচন করা হয়নি।');
      const name = file.name.toLowerCase();

      if (name.endsWith('.txt')) {
        const result = await this.readTxtFile(file);
        return { ...result, format: 'txt' };
      } else if (name.endsWith('.docx')) {
        const result = await this.readDocxFile(file);
        return { ...result, format: 'docx' };
      } else {
        throw new Error('সমর্থিত ফরম্যাট: .txt এবং .docx');
      }
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImportEngine;
  } else {
    global.ImportEngine = ImportEngine;
  }

})(typeof window !== 'undefined' ? window : this);
