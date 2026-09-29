/**
 * ====================================================================
 * XLSX HANDLER ENGINE (Excel Spreadsheet Converter)
 * Converts Bengali Unicode & Bijoy in Excel .xlsx spreadsheets
 * Preserves Formulas, Numbers, Grid Layout, Cell Styles, and Colors
 * ====================================================================
 */

(function(global) {
  'use strict';

  class XlsxHandler {
    constructor() {
      this.supportedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
    }

    /**
     * Converts an Excel spreadsheet (.xlsx)
     * @param {ArrayBuffer|Uint8Array|Blob} fileData
     * @param {Object} options
     * @returns {Promise<{blob: Blob, stats: Object, preview: Object}>}
     */
    async convertXlsx(fileData, options = {}) {
      if (typeof JSZip === 'undefined') {
        throw new Error("JSZip লাইব্রেরি লোড হয়নি। দয়া করে পেজটি রিফ্রেশ দিন।");
      }

      const opts = {
        direction: options.direction || 'auto', // 'all_bijoy', 'all_unicode', 'auto'
        targetFont: options.targetFont || 'Kalpurush',
        convertNumbers: options.convertNumbers || false,
        numberFormat: options.numberFormat || 'keep',
        ...options
      };

      const stats = {
        convertedCells: 0,
        totalStrings: 0,
        sheetsProcessed: 0
      };

      const preview = {
        originalSample: [],
        convertedSample: []
      };

      const zip = new JSZip();
      await zip.loadAsync(fileData);

      const parser = new DOMParser();
      const serializer = new XMLSerializer();

      // 1. Process Shared Strings Table (xl/sharedStrings.xml)
      const sstFile = zip.file("xl/sharedStrings.xml");
      if (sstFile) {
        const sstXmlText = await sstFile.async("string");
        const sstDoc = parser.parseFromString(sstXmlText, "application/xml");

        const siNodes = Array.from(sstDoc.getElementsByTagName("si"));
        stats.totalStrings = siNodes.length;

        for (let si of siNodes) {
          const tDirect = Array.from(si.children).filter(c => c.tagName === 't');
          if (tDirect.length > 0) {
            for (let tNode of tDirect) {
              const orig = tNode.textContent || "";
              if (!orig.trim()) continue;

              const converted = this._convertString(orig, opts);
              if (converted !== orig) {
                tNode.textContent = converted;
                tNode.setAttribute("xml:space", "preserve");
                stats.convertedCells++;
                if (preview.originalSample.length < 10) {
                  preview.originalSample.push(orig);
                  preview.convertedSample.push(converted);
                }
              }
            }
          }

          // Process rich text runs <r><t>
          const rNodes = Array.from(si.getElementsByTagName("r"));
          for (let r of rNodes) {
            const tNodes = Array.from(r.getElementsByTagName("t"));
            for (let tNode of tNodes) {
              const orig = tNode.textContent || "";
              if (!orig.trim()) continue;

              const converted = this._convertString(orig, opts);
              if (converted !== orig) {
                tNode.textContent = converted;
                tNode.setAttribute("xml:space", "preserve");
                stats.convertedCells++;
                if (preview.originalSample.length < 10) {
                  preview.originalSample.push(orig);
                  preview.convertedSample.push(converted);
                }
              }
            }
          }
        }

        zip.file("xl/sharedStrings.xml", serializer.serializeToString(sstDoc));
      }

      // 2. Process all Worksheets (xl/worksheets/sheet*.xml) for inline strings
      const sheetFiles = Object.keys(zip.files).filter(path => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path));
      stats.sheetsProcessed = sheetFiles.length;

      for (let sheetPath of sheetFiles) {
        const sheetFile = zip.file(sheetPath);
        if (!sheetFile) continue;

        const sheetXmlText = await sheetFile.async("string");
        const sheetDoc = parser.parseFromString(sheetXmlText, "application/xml");

        // Find inline strings: <c t="inlineStr"><is><t>Text</t></is></c>
        const inlineTNodes = Array.from(sheetDoc.querySelectorAll("c[t='inlineStr'] is t, is t"));
        let sheetModified = false;

        for (let tNode of inlineTNodes) {
          const orig = tNode.textContent || "";
          if (!orig.trim()) continue;

          const converted = this._convertString(orig, opts);
          if (converted !== orig) {
            tNode.textContent = converted;
            tNode.setAttribute("xml:space", "preserve");
            stats.convertedCells++;
            sheetModified = true;
          }
        }

        if (sheetModified) {
          zip.file(sheetPath, serializer.serializeToString(sheetDoc));
        }
      }

      // 3. Process Drawings / Shape text (xl/drawings/drawing*.xml)
      const drawingFiles = Object.keys(zip.files).filter(path => /^xl\/drawings\/drawing\d+\.xml$/i.test(path));
      for (let drawPath of drawingFiles) {
        const drawFile = zip.file(drawPath);
        if (!drawFile) continue;

        const drawXmlText = await drawFile.async("string");
        const drawDoc = parser.parseFromString(drawXmlText, "application/xml");
        const aTNodes = Array.from(drawDoc.getElementsByTagName("a:t"));
        let drawModified = false;

        for (let tNode of aTNodes) {
          const orig = tNode.textContent || "";
          if (!orig.trim()) continue;

          const converted = this._convertString(orig, opts);
          if (converted !== orig) {
            tNode.textContent = converted;
            drawModified = true;
          }
        }

        if (drawModified) {
          zip.file(drawPath, serializer.serializeToString(drawDoc));
        }
      }

      const outputBlob = await zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      return {
        blob: outputBlob,
        stats,
        preview
      };
    }

    /**
     * Converts a single string preserving English
     */
    _convertString(text, opts) {
      if (!text || typeof text !== 'string') return text || '';

      const dir = opts.direction || 'auto';

      if (dir === 'all_bijoy' || dir === 'u2b') {
        if (typeof BanglaConverter !== 'undefined' && BanglaConverter.hasBengaliText(text)) {
          return BanglaConverter.unicodeToBijoy(text, {
            convertNumbers: opts.convertNumbers,
            numberFormat: opts.numberFormat
          });
        }
        return text;
      } else if (dir === 'all_unicode' || dir === 'b2u') {
        if (typeof BanglaConverter !== 'undefined') {
          if (BanglaConverter.hasBengaliText(text)) {
            return text;
          }
          return BanglaConverter.bijoyToUnicode(text, {
            convertNumbers: opts.convertNumbers,
            numberFormat: opts.numberFormat
          });
        }
        return text;
      } else {
        // Auto
        if (typeof BanglaConverter !== 'undefined') {
          return BanglaConverter.autoConvert(text, {
            convertNumbers: opts.convertNumbers,
            numberFormat: opts.numberFormat
          });
        }
      }
      return text;
    }
  }

  const xlsxHandler = new XlsxHandler();

  if (typeof window !== 'undefined') {
    window.XlsxHandler = xlsxHandler;
  }
  if (typeof global !== 'undefined') {
    global.XlsxHandler = xlsxHandler;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = xlsxHandler;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
