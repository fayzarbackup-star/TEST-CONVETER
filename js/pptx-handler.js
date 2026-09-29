/**
 * ====================================================================
 * PPTX HANDLER ENGINE (PowerPoint Presentation Converter)
 * Converts Bengali Unicode & Bijoy in PowerPoint .pptx presentations
 * Preserves Slide Layouts, Animations, Shapes, Colors, Tables, and Images
 * ====================================================================
 */

(function(global) {
  'use strict';

  class PptxHandler {
    constructor() {
      this.supportedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint'
      ];
    }

    /**
     * Converts a PowerPoint presentation (.pptx)
     * @param {ArrayBuffer|Uint8Array|Blob} fileData
     * @param {Object} options
     * @returns {Promise<{blob: Blob, stats: Object, preview: Object}>}
     */
    async convertPptx(fileData, options = {}) {
      if (typeof JSZip === 'undefined') {
        throw new Error("JSZip লাইব্রেরি লোড হয়নি। দয়া করে পেজটি রিফ্রেশ দিন।");
      }

      const opts = {
        direction: options.direction || 'auto',
        targetFont: options.targetFont || 'Kalpurush',
        convertNumbers: options.convertNumbers || false,
        numberFormat: options.numberFormat || 'keep',
        ...options
      };

      const stats = {
        convertedRuns: 0,
        slidesProcessed: 0
      };

      const preview = {
        originalSample: [],
        convertedSample: []
      };

      const zip = new JSZip();
      await zip.loadAsync(fileData);

      const parser = new DOMParser();
      const serializer = new XMLSerializer();

      // Find all slide files: ppt/slides/slide*.xml, ppt/notesSlides/notesSlide*.xml
      const xmlPaths = Object.keys(zip.files).filter(path => 
        /^ppt\/slides\/slide\d+\.xml$/i.test(path) ||
        /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(path) ||
        /^ppt\/slideMasters\/slideMaster\d+\.xml$/i.test(path) ||
        /^ppt\/slideLayouts\/slideLayout\d+\.xml$/i.test(path)
      );

      stats.slidesProcessed = xmlPaths.filter(p => /^ppt\/slides\/slide\d+\.xml$/i.test(p)).length;

      for (let xmlPath of xmlPaths) {
        const file = zip.file(xmlPath);
        if (!file) continue;

        const xmlText = await file.async("string");
        const doc = parser.parseFromString(xmlText, "application/xml");

        // Find all text runs <a:r>
        const rNodes = Array.from(doc.getElementsByTagName("a:r"));
        let modified = false;

        for (let r of rNodes) {
          const tNodes = Array.from(r.getElementsByTagName("a:t"));
          if (tNodes.length === 0) continue;

          const orig = tNodes.map(t => t.textContent || "").join("");
          if (!orig || !orig.trim()) continue;

          // Check font name in <a:rPr>
          let runFont = "";
          const rPr = r.getElementsByTagName("a:rPr")[0];
          if (rPr) {
            const latin = rPr.getElementsByTagName("a:latin")[0];
            if (latin) {
              runFont = latin.getAttribute("typeface") || "";
            }
          }

          // Preserve pure English
          if (typeof BanglaConverter !== 'undefined' && BanglaConverter.isPureEnglish(orig, runFont)) {
            continue;
          }

          const dir = opts.direction || 'auto';
          let shouldConvert = false;
          let converted = orig;
          let targetFont = 'SutonnyMJ';
          let isU2B = true;

          if (dir === 'all_bijoy' || dir === 'u2b') {
            isU2B = true;
            targetFont = 'SutonnyMJ';
            if (typeof BanglaConverter !== 'undefined' && BanglaConverter.hasBengaliText(orig)) {
              converted = BanglaConverter.unicodeToBijoy(orig, {
                convertNumbers: opts.convertNumbers,
                numberFormat: opts.numberFormat
              });
              shouldConvert = true;
            } else if (typeof BanglaConverter !== 'undefined' && BanglaConverter.isBijoyText(orig, runFont)) {
              shouldConvert = false;
            }
          } else if (dir === 'all_unicode' || dir === 'b2u') {
            isU2B = false;
            targetFont = opts.targetFont || 'Kalpurush';
            if (typeof BanglaConverter !== 'undefined' && (BanglaConverter.isBijoyText(orig, runFont) || !BanglaConverter.hasBengaliText(orig))) {
              converted = BanglaConverter.bijoyToUnicode(orig, {
                convertNumbers: opts.convertNumbers,
                numberFormat: opts.numberFormat
              });
              shouldConvert = true;
            }
          } else {
            // Auto
            if (typeof BanglaConverter !== 'undefined') {
              if (BanglaConverter.hasBengaliText(orig)) {
                isU2B = true;
                targetFont = 'SutonnyMJ';
                converted = BanglaConverter.unicodeToBijoy(orig, {
                  convertNumbers: opts.convertNumbers,
                  numberFormat: opts.numberFormat
                });
                shouldConvert = true;
              } else if (BanglaConverter.isBijoyText(orig, runFont)) {
                isU2B = false;
                targetFont = opts.targetFont || 'Kalpurush';
                converted = BanglaConverter.bijoyToUnicode(orig, {
                  convertNumbers: opts.convertNumbers,
                  numberFormat: opts.numberFormat
                });
                shouldConvert = true;
              }
            }
          }

          if (shouldConvert) {
            tNodes[0].textContent = converted;
            for (let k = 1; k < tNodes.length; k++) {
              r.removeChild(tNodes[k]);
            }
            stats.convertedRuns++;
            modified = true;

            if (preview.originalSample.length < 10) {
              preview.originalSample.push(orig);
              preview.convertedSample.push(converted);
            }
          }

          // Update font in rPr if Bengali converted
          if (shouldConvert && rPr) {
            let latin = rPr.getElementsByTagName("a:latin")[0];
            if (!latin) {
              latin = doc.createElementNS("http://schemas.openxmlformats.org/drawingml/2006/main", "a:latin");
              rPr.appendChild(latin);
            }
            latin.setAttribute("typeface", targetFont);

            let ea = rPr.getElementsByTagName("a:ea")[0];
            if (!ea) {
              ea = doc.createElementNS("http://schemas.openxmlformats.org/drawingml/2006/main", "a:ea");
              rPr.appendChild(ea);
            }
            ea.setAttribute("typeface", targetFont);

            let cs = rPr.getElementsByTagName("a:cs")[0];
            if (!cs) {
              cs = doc.createElementNS("http://schemas.openxmlformats.org/drawingml/2006/main", "a:cs");
              rPr.appendChild(cs);
            }
            cs.setAttribute("typeface", targetFont);
          }
        }

        if (modified) {
          zip.file(xmlPath, serializer.serializeToString(doc));
        }
      }

      const outputBlob = await zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      return {
        blob: outputBlob,
        stats,
        preview
      };
    }
  }

  const pptxHandler = new PptxHandler();

  if (typeof window !== 'undefined') {
    window.PptxHandler = pptxHandler;
  }
  if (typeof global !== 'undefined') {
    global.PptxHandler = pptxHandler;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = pptxHandler;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
