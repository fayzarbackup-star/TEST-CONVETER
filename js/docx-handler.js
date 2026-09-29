/**
 * DOCX Document Parser & Transformer Engine
 * Preserves 100% of formatting, tables, styles, images, alignments, headers, footers.
 * Converts text nodes and updates run fonts seamlessly to guarantee SutonnyMJ rendering in MS Word.
 */

(function (global) {
  'use strict';

  class DocxHandler {
    constructor(options = {}) {
      this.options = Object.assign({
        direction: 'u2b', // 'u2b' (Unicode -> Bijoy) or 'b2u' (Bijoy -> Unicode)
        targetFont: 'SutonnyMJ',
        convertHeadersFooters: true,
        convertFootnotes: true,
        convertComments: true,
        convertNumbers: true,
        numberFormat: 'bengali',
        onProgress: null
      }, options);
    }

    /**
     * Convert an uploaded .docx ArrayBuffer or File
     * Returns: Promise<{ convertedBlob: Blob, stats: Object, preview: Object, originalName: string }>
     */
    async convertDocx(fileOrBuffer, customOptions = {}) {
      const opts = Object.assign({}, this.options, customOptions);
      const isU2B = opts.direction === 'u2b';
      const targetFontName = opts.targetFont || (isU2B ? 'SutonnyMJ' : 'Kalpurush');

      let arrayBuffer;
      let originalName = "document.docx";

      if (fileOrBuffer instanceof File || fileOrBuffer instanceof Blob) {
        if (fileOrBuffer.name) originalName = fileOrBuffer.name;
        arrayBuffer = await fileOrBuffer.arrayBuffer();
      } else {
        arrayBuffer = fileOrBuffer;
      }

      this._reportProgress(10, "ডকুমেন্ট আনপ্যাক করা হচ্ছে...", opts);

      if (typeof JSZip === 'undefined') {
        throw new Error("JSZip library is not loaded.");
      }

      const zip = await JSZip.loadAsync(arrayBuffer);
      
      const stats = {
        totalParagraphs: 0,
        convertedRuns: 0,
        totalWords: 0,
        filesProcessed: 0
      };

      const preview = {
        originalSample: [],
        convertedSample: []
      };

      // Normalize and collect all XML files to process (handles both / and \ in zip entries)
      const xmlFilesToProcess = [];

      zip.forEach((relativePath) => {
        const norm = relativePath.replace(/\\/g, '/');
        if (norm === "word/document.xml") {
          xmlFilesToProcess.push(relativePath);
        } else if (opts.convertHeadersFooters && /^word\/(header|footer)\d+\.xml$/i.test(norm)) {
          xmlFilesToProcess.push(relativePath);
        } else if (opts.convertFootnotes && (norm === "word/footnotes.xml" || norm === "word/endnotes.xml")) {
          xmlFilesToProcess.push(relativePath);
        } else if (opts.convertComments && norm === "word/comments.xml") {
          xmlFilesToProcess.push(relativePath);
        }
      });

      const totalFiles = xmlFilesToProcess.length;
      const parser = new DOMParser();
      const serializer = new XMLSerializer();
      const parsedXmlDocs = {};

      // Parse all XML files first
      for (let fIdx = 0; fIdx < totalFiles; fIdx++) {
        const filePath = xmlFilesToProcess[fIdx];
        const xmlContent = await zip.file(filePath).async("string");
        const xmlDoc = parser.parseFromString(xmlContent, "application/xml");
        parsedXmlDocs[filePath] = xmlDoc;
      }

      // =========================================================================
      // ধাপ ১: শুধুমাত্র ল্যাটেক্স (LaTeX) ও OMML ইকুয়েশন কনভার্ট (ডকুমেন্ট .docx থাকবে, ইউনিকোড টেক্সট অপরিবর্তিত)
      // =========================================================================
      this._reportProgress(25, "ধাপ ১: ল্যাটেক্স ইকুয়েশনসমূহ ওয়ার্ড ইকুয়েশনে কনভার্ট করা হচ্ছে...", opts);
      for (let fIdx = 0; fIdx < totalFiles; fIdx++) {
        const filePath = xmlFilesToProcess[fIdx];
        const xmlDoc = parsedXmlDocs[filePath];
        const paragraphs = Array.from(xmlDoc.getElementsByTagName("w:p"));
        stats.totalParagraphs += paragraphs.length;

        for (let p of paragraphs) {
          this._step1_convertMathToOpenXml(p, xmlDoc, isU2B, stats);
        }
      }

      // =========================================================================
      // ধাপ ২: ইউনিকোড বাংলা টেক্সট বিজয়ে (SutonnyMJ) কনভার্ট (ইকুয়েশন অক্ষত থাকবে, ডকুমেন্ট .docx থাকবে)
      // =========================================================================
      this._reportProgress(60, "ধাপ ২: ইউনিকোড টেক্সট বিজয়ে (SutonnyMJ) রূপান্তর করা হচ্ছে...", opts);
      for (let fIdx = 0; fIdx < totalFiles; fIdx++) {
        const filePath = xmlFilesToProcess[fIdx];
        const xmlDoc = parsedXmlDocs[filePath];
        const paragraphs = Array.from(xmlDoc.getElementsByTagName("w:p"));

        for (let p of paragraphs) {
          this._step2_convertTextToBijoy(p, xmlDoc, opts, isU2B, targetFontName, stats, preview);
        }

        const modifiedXmlString = serializer.serializeToString(xmlDoc);
        zip.file(filePath, modifiedXmlString);
        stats.filesProcessed++;
      }

      this._reportProgress(90, "ধাপ ২ সম্পন্ন: .docx ফাইল তৈরি করা হচ্ছে...", opts);

      const convertedBlob = await zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      this._reportProgress(100, "রূপান্তর সম্পন্ন হয়েছে!", opts);

      const baseName = originalName.replace(/\.[^/.]+$/, "");
      const ext = ".docx";
      const suffix = isU2B ? "_Bijoy_SutonnyMJ" : "_Unicode";
      const outputFileName = `${baseName}${suffix}${ext}`;

      return {
        blob: convertedBlob,
        convertedBlob,
        outputFileName,
        stats,
        preview,
        originalName
      };
    }

    /**
     * ধাপ ১: প্যারাগ্রাফের ভেতর থাকা ল্যাটেক্স ($...$) এবং OMML ইকুয়েশনকে OpenXML EQ Field এ রূপান্তর
     */
    _step1_convertMathToOpenXml(p, xmlDoc, isU2B, stats) {
      // 0. Parse native OMML equations (<m:oMath>) to EQ fields
      if (typeof EquationConverter !== 'undefined') {
        const oMathNodes = Array.from(p.getElementsByTagName("m:oMath"));
        for (let m of oMathNodes) {
          const newRuns = EquationConverter.ommlToOpenXmlRuns(m, xmlDoc);
          if (newRuns && newRuns.length > 0) {
            for (let newR of newRuns) p.insertBefore(newR, m);
            p.removeChild(m);
            stats.convertedRuns++;
          }
        }
      }

      // 1. Merge contiguous runs to prevent fragmented LaTeX syntax
      const initialRuns = Array.from(p.getElementsByTagName("w:r"));
      if (initialRuns.length === 0) return;
      this._mergeContiguousRuns(p, initialRuns);

      // 2. Check full paragraph text for LaTeX math ($...$, $$...$$, \[...\], \(...\))
      const pFullText = p.textContent || "";
      const hasMath = typeof EquationConverter !== 'undefined' && 
                      (/\$\$[\s\S]*?\$\$|\$[^\$]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/.test(pFullText));

      if (!hasMath) return;

      // Extract base rPr from first run
      const firstR = p.getElementsByTagName("w:r")[0];
      const baseRPr = firstR ? firstR.getElementsByTagName("w:rPr")[0] : null;

      // Split into text and math segments
      const segments = EquationConverter.splitTextAndMath(pFullText);
      const newRuns = [];

      for (let seg of segments) {
        if (seg.type === 'math') {
          if (typeof EquationConverter !== 'undefined' && EquationConverter.needsEqField && !EquationConverter.needsEqField(seg.value)) {
            // Simple math quantity/unit/number (e.g. $90\%$, $40$, $40~m$, $B - \cos\theta = 0$): Clean standard text runs
            const simpleRuns = EquationConverter.createSimpleMathRuns(xmlDoc, seg.value, baseRPr, isU2B);
            newRuns.push(...simpleRuns);
            stats.convertedRuns++;
          } else {
            // Complex equation: Convert LaTeX to EQ Field code
            const eqCode = EquationConverter.latexToEqField(seg.value, isU2B);
            const eqRuns = EquationConverter.createOpenXmlEqRuns(xmlDoc, eqCode, baseRPr, isU2B);
            newRuns.push(...eqRuns);
            stats.convertedRuns++;
          }
        } else if (seg.type === 'text' && seg.value) {
          // Keep Unicode text intact in step 1!
          const textRun = EquationConverter.createTextRun(xmlDoc, seg.value, null, baseRPr);
          newRuns.push(textRun);
        }
      }

      // Remove old runs in p, keeping pPr intact and strictly preserving runs with drawings/images
      const oldRuns = Array.from(p.getElementsByTagName("w:r"));
      for (let r of oldRuns) {
        if (r.getElementsByTagName("w:drawing").length > 0 ||
            r.getElementsByTagName("w:pict").length > 0 ||
            r.getElementsByTagName("w:object").length > 0 ||
            r.getElementsByTagName("a:blip").length > 0 ||
            r.getElementsByTagName("v:imagedata").length > 0) {
          continue; // PRESERVE DRAWING / IMAGE RUN!
        }
        p.removeChild(r);
      }

      // Append new runs
      for (let r of newRuns) {
        p.appendChild(r);
      }
    }

    /**
     * ধাপ ২: টেক্সট কনভার্ট (মিক্সড ফাইল হ্যান্ডলিং ও ইংরেজি ফন্ট অক্ষত রাখার লজিকসহ)
     */
    /**
     * ধাপ ২: টেক্সট কনভার্ট (মিক্সড রান স্প্লিটিং ও ইংরেজি ফন্ট শতভাগ অক্ষত রাখার লজিকসহ)
     */
    _step2_convertTextToBijoy(p, xmlDoc, opts, isU2B, targetFontName, stats, preview) {
      const currentRuns = Array.from(p.getElementsByTagName("w:r"));

      for (let r of currentRuns) {
        // Skip EQ fields completely!
        if (r.getElementsByTagName("w:fldChar").length > 0 || r.getElementsByTagName("w:instrText").length > 0) {
          continue;
        }

        const textNodes = Array.from(r.getElementsByTagName("w:t"));
        if (textNodes.length === 0) continue;

        let originalText = textNodes.map(t => t.textContent || "").join("");
        if (!originalText || !originalText.trim()) continue;

        // Extract run font name
        let runFontName = "";
        const rPr = r.getElementsByTagName("w:rPr")[0];
        if (rPr) {
          const rFonts = rPr.getElementsByTagName("w:rFonts")[0];
          if (rFonts) {
            runFontName = rFonts.getAttribute("w:ascii") || rFonts.getAttribute("w:hAnsi") || rFonts.getAttribute("w:cs") || "";
          }
        }

        const dirMode = opts.direction || (isU2B ? 'u2b' : 'b2u');

        const isBijoyFont = /sutonny|bijoy|sutony|matra|boishakhi|chandan|probhat|bandhan|doshomik/i.test(runFontName);
        const isEnglishFont = /times|calibri|arial|verdana|helvetica|courier|georgia|tahoma|trebuchet|cambria|segoe|century|palatino|garamond|bookman|lucida|impact/i.test(runFontName);

        // 1. In Unicode-to-Bijoy mode (u2b / all_bijoy): If run has NO Bengali text at all, KEEP 100% UNTOUCHED!
        if ((dirMode === 'u2b' || dirMode === 'all_bijoy') && !BanglaConverter.hasBengaliText(originalText)) {
          continue;
        }

        // 2. If run has an explicit English font (not Bijoy) and contains pure English in b2u mode, KEEP UNTOUCHED!
        if (isEnglishFont && !isBijoyFont && BanglaConverter.isPureEnglish(originalText, runFontName)) {
          continue;
        }

        // 2. Check if the run has MIXED English and Bengali
        let segments = [{ type: 'bengali', text: originalText }];
        if (dirMode === 'u2b' || dirMode === 'all_bijoy') {
          if (typeof BanglaConverter.splitMixedBengaliAndEnglish === 'function') {
            segments = BanglaConverter.splitMixedBengaliAndEnglish(originalText);
          }
        } else {
          // Bijoy to Unicode: always use splitBijoyAndEnglish so ASCII Bijoy text is never mistreated as English!
          if (typeof BanglaConverter.splitBijoyAndEnglish === 'function') {
            segments = BanglaConverter.splitBijoyAndEnglish(originalText);
          }
        }

        if (segments.length > 1) {
          // Mixed run! Split into separate <w:r> runs

          for (let seg of segments) {
            const newR = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:r");
            let newRPr = rPr ? rPr.cloneNode(true) : null;
            if (newRPr) newR.appendChild(newRPr);

            const newT = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:t");
            newT.setAttribute("xml:space", "preserve");

            if (seg.type === 'english') {
              // English segment: Keep original text and original English font
              newT.textContent = seg.text;
              newR.appendChild(newT);
              const engFont = runFontName && !/sutonny|bijoy|kalpurush|nikosh|solaiman/i.test(runFontName) ? runFontName : "Times New Roman";
              this._updateRunFontAndProps(newR, xmlDoc, engFont, false);
            } else {
              // Bengali segment: Convert text and update font
              let converted = seg.text;
              let targetFont = 'SutonnyMJ';
              let runIsU2B = true;

              if (dirMode === 'u2b' || dirMode === 'all_bijoy') {
                runIsU2B = true;
                targetFont = 'SutonnyMJ';
                if (BanglaConverter.hasBengaliText(seg.text)) {
                  converted = BanglaConverter.unicodeToBijoy(seg.text, {
                    convertNumbers: opts.convertNumbers,
                    numberFormat: opts.numberFormat
                  });
                }
              } else if (dirMode === 'b2u' || dirMode === 'all_unicode') {
                runIsU2B = false;
                targetFont = opts.targetFont || 'Kalpurush';
                converted = BanglaConverter.bijoyToUnicode(seg.text, {
                  convertNumbers: opts.convertNumbers,
                  numberFormat: opts.numberFormat
                });
              } else {
                if (BanglaConverter.hasBengaliText(seg.text)) {
                  runIsU2B = true;
                  targetFont = 'SutonnyMJ';
                  converted = BanglaConverter.unicodeToBijoy(seg.text, {
                    convertNumbers: opts.convertNumbers,
                    numberFormat: opts.numberFormat
                  });
                } else {
                  runIsU2B = false;
                  targetFont = opts.targetFont || 'Kalpurush';
                  converted = BanglaConverter.bijoyToUnicode(seg.text, {
                    convertNumbers: opts.convertNumbers,
                    numberFormat: opts.numberFormat
                  });
                }
              }

              if (runIsU2B && /[-–—−‒―]/.test(converted)) {
                const dParts = converted.split(/([-–—−‒―]+)/);
                for (let dpi = 0; dpi < dParts.length; dpi++) {
                  const dp = dParts[dpi];
                  if (!dp) continue;
                  const splitR = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:r");
                  if (rPr) splitR.appendChild(rPr.cloneNode(true));
                  const splitT = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:t");
                  splitT.setAttribute("xml:space", "preserve");
                  splitT.textContent = dp;
                  splitR.appendChild(splitT);
                  const isDash = /[-–—−‒―]/.test(dp);
                  this._updateRunFontAndProps(splitR, xmlDoc, isDash ? "Times New Roman" : targetFont, !isDash);
                  p.insertBefore(splitR, r);
                }
              } else {
                newT.textContent = converted;
                newR.appendChild(newT);
                this._updateRunFontAndProps(newR, xmlDoc, targetFont, runIsU2B);
                p.insertBefore(newR, r);
              }
              stats.convertedRuns++;

              if (preview.originalSample.length < 8 && seg.text.trim().length > 2) {
                preview.originalSample.push(seg.text.trim());
                preview.convertedSample.push(converted.trim());
              }
            }
          }

          p.removeChild(r);
          continue;
        }

        // 3. Single-type run (Bengali or English)
        let shouldConvertText = false;
        let convertedText = originalText;
        let shouldUpdateFont = false;
        let currentTargetFont = targetFontName;
        let runIsU2B = true;

        if (dirMode === 'u2b' || dirMode === 'all_bijoy') {
          runIsU2B = true;
          currentTargetFont = 'SutonnyMJ';

          if (BanglaConverter.hasBengaliText(originalText)) {
            convertedText = BanglaConverter.unicodeToBijoy(originalText, {
              convertNumbers: opts.convertNumbers,
              numberFormat: opts.numberFormat
            });
            shouldConvertText = true;
            shouldUpdateFont = true;
          } else if (BanglaConverter.isBijoyText(originalText, runFontName)) {
            shouldConvertText = false;
            shouldUpdateFont = true;
          } else {
            shouldConvertText = false;
            shouldUpdateFont = false;
          }
        } else if (dirMode === 'b2u' || dirMode === 'all_unicode') {
          runIsU2B = false;
          currentTargetFont = opts.targetFont || 'Kalpurush';

          if (isEnglishFont && !isBijoyFont && BanglaConverter.isPureEnglish(originalText, runFontName)) {
            shouldConvertText = false;
            shouldUpdateFont = false;
          } else {
            convertedText = BanglaConverter.bijoyToUnicode(originalText, {
              convertNumbers: opts.convertNumbers,
              numberFormat: opts.numberFormat
            });
            if (convertedText !== originalText || BanglaConverter.hasBengaliText(convertedText)) {
              shouldConvertText = true;
              shouldUpdateFont = true;
            } else {
              shouldConvertText = false;
              shouldUpdateFont = false;
            }
          }
        } else {
          // Auto Mode (Bidirectional Smart)
          if (BanglaConverter.hasBengaliText(originalText)) {
            runIsU2B = true;
            currentTargetFont = 'SutonnyMJ';
            convertedText = BanglaConverter.unicodeToBijoy(originalText, {
              convertNumbers: opts.convertNumbers,
              numberFormat: opts.numberFormat
            });
            shouldConvertText = true;
            shouldUpdateFont = true;
          } else {
            runIsU2B = false;
            currentTargetFont = opts.targetFont || 'Kalpurush';
            convertedText = BanglaConverter.bijoyToUnicode(originalText, {
              convertNumbers: opts.convertNumbers,
              numberFormat: opts.numberFormat
            });
            if (convertedText !== originalText || BanglaConverter.hasBengaliText(convertedText)) {
              shouldConvertText = true;
              shouldUpdateFont = true;
            } else {
              shouldConvertText = false;
              shouldUpdateFont = false;
            }
          }
        }

        if (shouldConvertText) {
          if (runIsU2B && /[-–—−‒―]/.test(convertedText)) {
            const dParts = convertedText.split(/([-–—−‒―]+)/);
            for (let dpi = 0; dpi < dParts.length; dpi++) {
              const dp = dParts[dpi];
              if (!dp) continue;
              const splitR = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:r");
              if (rPr) splitR.appendChild(rPr.cloneNode(true));
              const splitT = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:t");
              splitT.setAttribute("xml:space", "preserve");
              splitT.textContent = dp;
              splitR.appendChild(splitT);
              const isDash = /[-–—−‒―]/.test(dp);
              this._updateRunFontAndProps(splitR, xmlDoc, isDash ? "Times New Roman" : currentTargetFont, !isDash);
              p.insertBefore(splitR, r);
            }
            p.removeChild(r);
            stats.convertedRuns++;

            if (preview.originalSample.length < 8 && originalText.trim().length > 2) {
              preview.originalSample.push(originalText.trim());
              preview.convertedSample.push(convertedText.trim());
            }
            continue;
          }
          textNodes[0].textContent = convertedText;
          textNodes[0].setAttribute("xml:space", "preserve");
          for (let k = 1; k < textNodes.length; k++) {
            r.removeChild(textNodes[k]);
          }
          stats.convertedRuns++;

          if (preview.originalSample.length < 8 && originalText.trim().length > 2) {
            preview.originalSample.push(originalText.trim());
            preview.convertedSample.push(convertedText.trim());
          }
        }

        if (shouldUpdateFont) {
          this._updateRunFontAndProps(r, xmlDoc, currentTargetFont, runIsU2B);
        }
      }
    }

    /**
     * Merge adjacent runs that have identical formatting
     */
    _mergeContiguousRuns(p, runs) {
      if (runs.length <= 1) return;

      for (let i = 0; i < runs.length - 1; i++) {
        const currentRun = runs[i];
        const nextRun = runs[i + 1];

        if (!currentRun || !nextRun || !currentRun.parentNode || !nextRun.parentNode) continue;
        if (currentRun.nextSibling !== nextRun) continue;

        // Never merge runs containing drawings or images
        if (currentRun.getElementsByTagName("w:drawing").length > 0 ||
            currentRun.getElementsByTagName("w:pict").length > 0 ||
            nextRun.getElementsByTagName("w:drawing").length > 0 ||
            nextRun.getElementsByTagName("w:pict").length > 0) {
          continue;
        }

        const currentPr = currentRun.getElementsByTagName("w:rPr")[0];
        const nextPr = nextRun.getElementsByTagName("w:rPr")[0];

        const currentPrXml = currentPr ? currentPr.outerHTML : "";
        const nextPrXml = nextPr ? nextPr.outerHTML : "";

        if (currentPrXml === nextPrXml) {
          const currentT = currentRun.getElementsByTagName("w:t")[0];
          const nextT = nextRun.getElementsByTagName("w:t")[0];

          if (currentT && nextT) {
            currentT.textContent = (currentT.textContent || "") + (nextT.textContent || "");
            p.removeChild(nextRun);
            runs.splice(i + 1, 1);
            i--; // Recheck with next run
          }
        }
      }
    }

    /**
     * Set or update font properties in <w:rPr>
     */
    _updateRunFontAndProps(run, xmlDoc, targetFontName, isU2B) {
      let rPr = run.getElementsByTagName("w:rPr")[0];
      if (!rPr) {
        rPr = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:rPr");
        run.insertBefore(rPr, run.firstChild);
      }

      // 1. Font Definition
      let rFonts = rPr.getElementsByTagName("w:rFonts")[0];
      if (!rFonts) {
        rFonts = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:rFonts");
        rPr.insertBefore(rFonts, rPr.firstChild);
      }

      rFonts.setAttribute("w:ascii", targetFontName);
      rFonts.setAttribute("w:hAnsi", targetFontName);
      rFonts.setAttribute("w:cs", targetFontName);
      rFonts.setAttribute("w:eastAsia", targetFontName);

      if (isU2B) {
        rFonts.setAttribute("w:hint", "ascii");

        // Remove <w:cs/> if present
        const csTags = Array.from(rPr.getElementsByTagName("w:cs"));
        csTags.forEach(tag => rPr.removeChild(tag));

        // Remove <w:rtl/> if present
        const rtlTags = Array.from(rPr.getElementsByTagName("w:rtl"));
        rtlTags.forEach(tag => rPr.removeChild(tag));

        // Update <w:lang>
        let lang = rPr.getElementsByTagName("w:lang")[0];
        if (!lang) {
          lang = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:lang");
          rPr.appendChild(lang);
        }
        lang.setAttribute("w:val", "en-US");
        lang.setAttribute("w:eastAsia", "en-US");
        lang.setAttribute("w:bidi", "en-US");
      } else {
        rFonts.setAttribute("w:hint", "cs");
      }

      // 2. Synchronize <w:sz> and <w:szCs> so font size is 100% identical between ASCII and Complex Script
      const szNode = rPr.getElementsByTagName("w:sz")[0];
      const szCsNode = rPr.getElementsByTagName("w:szCs")[0];

      if (szNode && !szCsNode) {
        const newSzCs = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:szCs");
        newSzCs.setAttribute("w:val", szNode.getAttribute("w:val"));
        rPr.appendChild(newSzCs);
      } else if (szCsNode && !szNode) {
        const newSz = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:sz");
        newSz.setAttribute("w:val", szCsNode.getAttribute("w:val"));
        rPr.appendChild(newSz);
      } else if (szNode && szCsNode) {
        const val = isU2B ? (szNode.getAttribute("w:val") || szCsNode.getAttribute("w:val")) : (szCsNode.getAttribute("w:val") || szNode.getAttribute("w:val"));
        if (val) {
          szNode.setAttribute("w:val", val);
          szCsNode.setAttribute("w:val", val);
        }
      }
    }

    _reportProgress(percent, message, opts) {
      if (typeof opts.onProgress === 'function') {
        opts.onProgress(percent, message);
      }
    }

    /**
     * Check if a line is part of an English question paper or English section
     * English lines must remain 100% normal/untouched (no Dari, no pipe, no forced tabs, no forced dots)
     */
    static isEnglishQuestionLine(line) {
      if (!line) return false;
      // Bengali Unicode character presence -> Definitely not English
      if (/[\u0980-\u09FF]/.test(line)) return false;
      // Bijoy character presence -> Definitely not English
      if (/[\u0080-\u00FF‡‰†Š&|]/.test(line)) return false;

      const hasEnglishWords = /\b(what|which|where|when|who|whom|whose|why|how|read|write|fill|choose|correct|answer|following|passage|poem|story|change|transform|rewrite|complete|narrate|voice|sentence|sentences|paragraph|dialogue|table|column|true|false|match|blank|blanks|question|questions|section|marks|time|grammar|english|translation|clause|phrase|verb|tense|preposition|article|narration|suffix|prefix|antonym|synonym|punctuation|degree|given|below|text|comprehension|rearrange|letter|application|email|composition|essay|cv|resume|notice|report|summary|theme|identify|explain|describe|define|mention|differentiate|compare|calculate|find|prove|state|discuss|illustrate|passage)\b/i.test(line);
      if (hasEnglishWords) return true;

      // Question serial pattern e.g. 1. "Honesty is...", 1. Karim went..., Question 1. ...
      if (/^[ \t]*(?:question|q)?\s*[0-9]+[\.\):]\s*["'A-Za-z]/i.test(line)) return true;

      // Sub-question pattern e.g. (a) What is..., a. Dhaka (excluding roman numerals i, ii, iii, iv, v...)
      const isRomanNum = /^[ \t]*[\(（\[]?\s*(?:i{1,3}|iv|v|vi{0,3}|ix|x)\s*[\)）\]\.]/i.test(line);
      if (!isRomanNum && /^[ \t]*[\(（]?[a-zA-Z][\)）\.]\s+[A-Za-z]/.test(line)) return true;

      // English options on line e.g. (a) Dhaka (b) Chittagong or a. Dhaka b. Chittagong
      if (/[\(（]?[a-dA-D][\)）\.]\s+[A-Za-z]/.test(line)) return true;

      return false;
    }

    /**
     * Format Bengali Question Number with Dari (।) e.g. ১।, ২। or Bijoy 1|, 2|
     * For English questions, preserves standard English format (e.g. 1. What...)
     */
    static formatQuestionNumber(line, isBijoy = false) {
      if (!line) return line;
      if (DocxHandler.isEnglishQuestionLine(line)) return line;

      // Unicode Bengali Question: e.g. ১. or ১) or ১: or 1. (with Bengali text)
      // Must NOT match multi-part or decimal numbered clauses like ৪.১., ৫.২.
      if (/[\u0980-\u09FF]/.test(line)) {
        return line.replace(/^[ \t]*(?:প্রশ্ন|প্রশ্ন নং|প্রশ্ননং|Question)?\s*([০-৯0-9]+)[\.\)\:\-](?!\s*[০-৯0-9])\s*/i, (match, p1) => {
          const bnDigits = p1.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
          return `${bnDigits}। `;
        });
      }

      // Bijoy Question: 1. or 1) or 1:
      if (isBijoy || /[\u0080-\u00FF‡‰†Š&|]/.test(line)) {
        if (/^[ \t]*(?:cÖkœ|cÖkœ bs)?\s*([0-9]+)[\.\)\:\-](?!\s*[0-9])\s*/i.test(line)) {
          return line.replace(/^[ \t]*(?:cÖkœ|cÖkœ bs)?\s*([0-9]+)[\.\)\:\-](?!\s*[0-9])\s*/i, '$1| ');
        }
        if (/^[ \t]*([0-9]+)[\.\)\:\-](?!\s*[0-9])\s*/.test(line)) {
          return line.replace(/^[ \t]*([0-9]+)[\.\)\:\-](?!\s*[0-9])\s*/, '$1| ');
        }
      }

      return line;
    }

    /**
     * Format Creative Question Sub-Questions (ক., খ., গ., ঘ. or K., L., M., N.)
     * Removes brackets: (ক), ক) -> ক.
     * For English sub-questions (e.g. (a), (b), (c)), preserves standard English format
     */
    static formatCqSubQuestion(line, isBijoy = false) {
      if (!line) return line;
      if (DocxHandler.isEnglishQuestionLine(line)) return line;

      // Replace (ক), ক), [ক] with ক.
      if (/^[ \t]*[\(（\[]?\s*([কখগঘ])\s*[\)）\]\.]\s*/.test(line)) {
        return line.replace(/^[ \t]*[\(（\[]?\s*([কখগঘ])\s*[\)）\]\.]\s*/, '$1. ');
      }
      // Bijoy sub-questions (K), K) -> K.
      if (isBijoy || /[\u0080-\u00FF‡‰†Š&]/.test(line)) {
        if (/^[ \t]*[\(（\[]?\s*([KLMN])\s*[\)）\]\.]\s*/.test(line)) {
          return line.replace(/^[ \t]*[\(（\[]?\s*([KLMN])\s*[\)）\]\.]\s*/, '$1. ');
        }
      }
      return line;
    }

    /**
     * Ensure MCQ options (ক., খ., গ., ঘ.) or (K., L., M., N.) have leading and separating tabs
     * Normalizes (ক), ক), etc. into ক., খ., গ., ঘ. with leading \t
     * For English questions, preserves normal English operation untouched
     */
    static formatMcqLineTabs(line, isBijoy = false) {
      if (!line) return line;
      if (DocxHandler.isEnglishQuestionLine(line)) return line;

      // Collapse multiple tabs or mixed space-tab combinations into a single tab
      line = line.replace(/[ \t]*\t+[ \t]*/g, '\t');

      // 1. Bengali Unicode options
      const hasBnKa = /[\(（\[]?\s*[ক]\s*[\)）\]\.]/.test(line);
      const hasBnKha = /[\(（\[]?\s*[খ]\s*[\)）\]\.]/.test(line);
      const hasBnGa = /[\(（\[]?\s*[গ]\s*[\)）\]\.]/.test(line);
      const hasBnGha = /[\(（\[]?\s*[ঘ]\s*[\)）\]\.]/.test(line);

      if ((hasBnKa && hasBnKha) || (hasBnGa && hasBnGha) || (hasBnKa && (hasBnGa || hasBnGha))) {
        let l = line.trim();
        // Normalize any bracketed (ক), ক), [ক], ক. to uniform "ক. "
        l = l.replace(/[\(（\[]?\s*ক\s*[\)）\]\.]\s*/g, 'ক. ');
        l = l.replace(/[\(（\[]?\s*খ\s*[\)）\]\.]\s*/g, 'খ. ');
        l = l.replace(/[\(（\[]?\s*গ\s*[\)）\]\.]\s*/g, 'গ. ');
        l = l.replace(/[\(（\[]?\s*ঘ\s*[\)）\]\.]\s*/g, 'ঘ. ');

        // Insert tab before খ., গ., ঘ. even if concatenated or separated by space
        l = l.replace(/(?:\s+|\t+)?(খ\.)/g, '\t$1');
        l = l.replace(/(?:\s+|\t+)?(গ\.)/g, '\t$1');
        l = l.replace(/(?:\s+|\t+)?(ঘ\.)/g, '\t$1');

        // Ensure leading tab before first option (ক. or গ.)
        l = l.replace(/^[ \t]*(ক\.|গ\.)/, '\t$1');
        if (!l.startsWith('\t')) l = '\t' + l;

        return l.replace(/\t+/g, '\t');
      }

      // 2. Bijoy SutonnyMJ options (K, L, M, N)
      const hasBijoyK = /[\(（\[]?\s*[K]\s*[\)）\]\.]/.test(line);
      const hasBijoyL = /[\(（\[]?\s*[L]\s*[\)）\]\.]/.test(line);
      const hasBijoyM = /[\(（\[]?\s*[M]\s*[\)）\]\.]/.test(line);
      const hasBijoyN = /[\(（\[]?\s*[N]\s*[\)）\]\.]/.test(line);

      if ((hasBijoyK && hasBijoyL) || (hasBijoyM && hasBijoyN) || (hasBijoyK && (hasBijoyM || hasBijoyN))) {
        let l = line.trim();
        // Normalize any bracketed (K), K), [K], K. to uniform "K. "
        l = l.replace(/[\(（\[]?\s*K\s*[\)）\]\.]\s*/g, 'K. ');
        l = l.replace(/[\(（\[]?\s*L\s*[\)）\]\.]\s*/g, 'L. ');
        l = l.replace(/[\(（\[]?\s*M\s*[\)）\]\.]\s*/g, 'M. ');
        l = l.replace(/[\(（\[]?\s*N\s*[\)）\]\.]\s*/g, 'N. ');

        // Insert tab before L., M., N.
        l = l.replace(/[ \t]*\t*[ \t]*(L\.)/g, '\t$1');
        l = l.replace(/[ \t]*\t*[ \t]*(M\.)/g, '\t$1');
        l = l.replace(/[ \t]*\t*[ \t]*(N\.)/g, '\t$1');

        // Ensure leading tab before first option (K. or M.)
        l = l.replace(/^[ \t]*\t*[ \t]*(K\.|M\.)/, '\t$1');
        if (!l.startsWith('\t')) l = '\t' + l;

        return l.replace(/\t+/g, '\t');
      }

      return line.replace(/\t+/g, '\t');
    }

    /**
     * Unified single-line formatter for Question Papers
     * Handles:
     * - English lines: 100% untouched
     * - Question serials: ১। (Unicode) or 1| (Bijoy)
     * - Multi-option MCQ lines: leading \t and dots \tক. ...\tখ. ...
     * - Vertical single-option MCQ lines: leading \t and dot \tক. [option]
     * - CQ sub-questions: dot without brackets ক. [question text]
     */
    static formatQuestionPaperLine(line, isBijoy = false) {
      if (!line) return line;
      if (DocxHandler.isEnglishQuestionLine(line)) return line;

      // 1. Multi-option MCQ line check (e.g. \tক. ...\tখ. ...)
      const hasBnKa = /[\(（\[]?\s*[ক]\s*[\)）\]\.]/.test(line);
      const hasBnKha = /[\(（\[]?\s*[খ]\s*[\)）\]\.]/.test(line);
      const hasBnGa = /[\(（\[]?\s*[গ]\s*[\)）\]\.]/.test(line);
      const hasBnGha = /[\(（\[]?\s*[ঘ]\s*[\)）\]\.]/.test(line);
      const isMultiBn = (hasBnKa && hasBnKha) || (hasBnGa && hasBnGha) || (hasBnKa && (hasBnGa || hasBnGha));

      const hasBijoyK = /[\(（\[]?\s*[K]\s*[\)）\]\.]/.test(line);
      const hasBijoyL = /[\(（\[]?\s*[L]\s*[\)）\]\.]/.test(line);
      const hasBijoyM = /[\(（\[]?\s*[M]\s*[\)）\]\.]/.test(line);
      const hasBijoyN = /[\(（\[]?\s*[N]\s*[\)）\]\.]/.test(line);
      const isMultiBijoy = (hasBijoyK && hasBijoyL) || (hasBijoyM && hasBijoyN) || (hasBijoyK && (hasBijoyM || hasBijoyN));

      if (isMultiBn || isMultiBijoy) {
        return DocxHandler.formatMcqLineTabs(line, isBijoy);
      }

      // 2. Question number check (e.g. ১. ... -> ১। ...)
      const qNumFormatted = DocxHandler.formatQuestionNumber(line, isBijoy);
      if (qNumFormatted !== line) {
        return qNumFormatted;
      }

      // 2.5 Roman numeral statements under MCQ stem (e.g. i. সোডিয়াম, ii. ক্যালসিয়াম, iii. ক্লোরিন)
      const romanMatch = line.match(/^[ \t]*[\(（\[]?\s*(i{1,3}|iv|v|vi{0,3}|ix|x)\s*[\)）\]\.]\s*(.*)$/i);
      if (romanMatch) {
        return `\t${romanMatch[1].toLowerCase()}. ${romanMatch[2]}`;
      }

      // 3. Single option or CQ sub-question check
      // Unicode: ক., খ., গ., ঘ.
      const bnMatch = line.match(/^([ \t]*)[\(（\[]?\s*([কখগঘ])\s*[\)）\]\.]\s*(.*)$/);
      if (bnMatch) {
        const leadingWs = bnMatch[1];
        const letter = bnMatch[2];
        const rest = bnMatch[3] || '';
        
        // If line already had a leading tab, keep it (MCQ vertical option)
        if (leadingWs.includes('\t')) {
          return `\t${letter}. ${rest}`;
        }

        // Check if this looks like a CQ sub-question (typically contains question keywords or ends with ?)
        const isCq = /[\?？]|কাকে বলে|কী|কি|কেন|ব্যাখ্যা|বর্ণনা|লিখ|লেখ|চিহ্নিত|নির্ণয়|নির্ণয়|প্রমাণ|মূল্যায়ন|মূল্যায়ন|বিশ্লেষণ|উৎস|উদ্দীপক/i.test(rest);
        if (isCq) {
          // CQ sub-questions must NOT have a leading tab (handled manually by user)
          return `${letter}. ${rest}`;
        }

        // Vertical MCQ option without initial tab gets a leading tab
        return `\t${letter}. ${rest}`;
      }

      // Bijoy: K., L., M., N.
      if (isBijoy || /[\u0080-\u00FF‡‰†Š&]/.test(line)) {
        const bjMatch = line.match(/^([ \t]*)[\(（\[]?\s*([KLMN])\s*[\)）\]\.]\s*(.*)$/);
        if (bjMatch) {
          const leadingWs = bjMatch[1];
          const letter = bjMatch[2];
          const rest = bjMatch[3] || '';
          if (leadingWs.includes('\t')) {
            return `\t${letter}. ${rest}`;
          }
          const isCq = /\?|Kv‡K e‡j|Kx|wK|‡Kb|e¨vL¨v|eY©bv|wjL|‡jL|wPý|wbY©q|cÖgvY|we‡kølY|DÏxcK/i.test(rest);
          if (isCq) {
            return `${letter}. ${rest}`;
          }
          return `\t${letter}. ${rest}`;
        }
      }

      return line;
    }

    /**
     * Converts LaTeX chemical / reaction arrows into standard Word-compatible symbols
     */
    static formatReactionArrows(text) {
      if (!text) return text;
      // Clean any existing disjointed dash arrows: ──[ label ]──> -> → (label)
      text = text.replace(/──\[\s*([^\]]+)\s*\]──>/g, ' → ($1) ');
      text = text.replace(/──>/g, ' → ');

      // 1. \xrightarrow[sub]{sup} or xrightarrow[sub]{sup}
      text = text.replace(/\\?xrightarrow\s*\[([^\]]*)\]\s*\{([^}]*)\}/gi, (m, sub, sup) => {
        const s1 = (sup || '').trim();
        const s2 = (sub || '').trim();
        const label = s1 && s2 ? `${s1} / ${s2}` : (s1 || s2);
        return label ? ` → (${label}) ` : ' → ';
      });

      // 2. \xrightarrow{sup} or xrightarrow{sup}
      text = text.replace(/\\?xrightarrow\s*\{([^}]*)\}/gi, (m, sup) => {
        const s = (sup || '').trim();
        return s ? ` → (${s}) ` : ' → ';
      });

      // 3. \rightarrow, \longrightarrow, \to
      text = text.replace(/\\(?:rightarrow|longrightarrow|to)\b/g, ' → ');

      // 4. \leftarrow, \longleftarrow
      text = text.replace(/\\(?:leftarrow|longleftarrow)\b/g, ' ← ');

      // 5. \rightleftharpoons, \longleftrightarrow, \leftrightarrow
      text = text.replace(/\\(?:rightleftharpoons|longleftrightarrow|leftrightarrow)\b/g, ' ⇄ ');

      return text;
    }

    /**
     * Safely executes a regex transform on segments outside LaTeX math blocks ($...$ or $$...$$)
     */
    static processOutsideMath(text, fn) {
      if (!text) return text;
      const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
      for (let i = 0; i < parts.length; i += 2) {
        if (parts[i]) parts[i] = fn(parts[i]);
      }
      return parts.join('');
    }

    /**
     * Cleanly heals broken scientific notations (e.g. 6.023imes1022, 6.023\times 1023, 6.023*10^23)
     * and chemical formulas (e.g. H2SO4, CO2, CCl4, CaCO3, N2+3H2=2NH3) into valid math blocks.
     */
    static healScientificAndChemical(text) {
      if (!text) return text;
      let s = text;

      // 0. Convert Unicode superscripts & subscripts to standard ASCII LaTeX format
      const supChars = '[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]';
      const subChars = '[₀₁₂₃₄₅₆₇₈₉₊₋]';
      const supMap = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-'};
      const subMap = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','₊':'+','₋':'-'};

      s = s.replace(new RegExp('(' + supChars + '+)', 'g'), (m, g) => {
        let digits = g.split('').map(c => supMap[c] || c).join('');
        return '^{' + digits + '}';
      });

      s = s.replace(new RegExp('(' + subChars + '+)', 'g'), (m, g) => {
        let digits = g.split('').map(c => subMap[c] || c).join('');
        return '_{' + digits + '}';
      });

      // Fix lowercase typos in common chemical formulas like Na_{2}co_{3} -> Na_{2}CO_{3}
      s = s.replace(/\b([A-Z][a-z]?)_\{?(\d+)\}?co_\{?(\d+)\}?/g, '$1_{$2}CO_{$3}');
      s = s.replace(/([A-Z][a-z]?)_\{?(\d+)\}?co([0-9])/g, '$1_{$2}CO$3');
      s = s.replace(/\b([a-z]{1,2})_\{?(\d+)\}?/g, (m, el, sub) => el.toUpperCase() + '_{' + sub + '}');

      // 1. Repair broken powers with newlines e.g. "6.023×10\n23\nটি" -> "6.023 × 10^{23} টি"
      s = s.replace(/([×x*\u00D7\u2A2F]?\s*10)\s*\n+(\d{1,3})\s*\n+(?=[^\s])/g, '$1^{$2} ');
      s = s.replace(/([×x*\u00D7\u2A2F]?\s*10)\s*\n+(\d{1,3})/g, '$1^{$2}');

      // 2. Fix scientific notation variants e.g. "6.023imes1022", "6.023 imes 1023", "6.023\times 1023", "6.023×10^23", "6.023 \times 10^{23}"
      s = DocxHandler.processOutsideMath(s, str => {
        return str.replace(/(?<![\$\d])(\d+(?:\.\d+)?)\s*(?:\\*times|imes|[×x*\u00D7\u2A2F])\s*10\s*(?:\^\s*\{?(\d{1,3})\}?|\^?\{?(\d{1,3})\}?)(?!\d)/gi, (m, coeff, exp1, exp2) => {
          let exp = exp1 || exp2;
          return `$${coeff} \\times 10^{${exp}}$`;
        });
      });

      // 2b. If there was no multiplication sign but wrote "6.023 10^23" or "6.023 1023"
      s = DocxHandler.processOutsideMath(s, str => {
        return str.replace(/(?<![\$\d])(\d+(?:\.\d+)?)\s+10\s*(?:\^\s*\{?(\d{1,3})\}?|(?:1[0-9]|2[0-9]|3[0-9]))\b(?!\$)/g, (m, coeff, exp1) => {
          let exp = exp1;
          if (!exp) {
            const match10 = m.match(/10(1[0-9]|2[0-9]|3[0-9])/);
            if (match10) exp = match10[1];
          }
          return exp ? `$${coeff} \\times 10^{${exp}}$` : m;
        });
      });

      // 2c. Match standalone "10^23" or "10^{23}" or "10^{-3}"
      s = DocxHandler.processOutsideMath(s, str => {
        return str.replace(/(?<!(?:\$|\\times\s*|[×*]\s*))\b10\s*\^\s*\{?(-?\d{1,3})\}?(?![\$\w])/g, (m, g1) => `$10^{${g1}}$`);
      });

      // 3. Slash units: mol/L, g/L, L/mol, g/mol, km/h, m/s -> $\frac{mol}{L}$, etc.
      s = DocxHandler.processOutsideMath(s, str => {
        return str.replace(/\b(mol\/L|g\/L|L\/mol|g\/mol|km\/h|m\/s|m\/s\^2)\b/gi, (m) => {
          let parts = m.split('/');
          return `$\\frac{${parts[0]}}{${parts[1]}}$`;
        });
      });

      // 4. Fix broken spaces in split formulas: "H_2 O" -> "H_2O", "H_2 SO_4" -> "H_2SO_4", "H2 SO4" -> "H2SO4"
      s = s.replace(/\b([A-Z][a-z]?(?:_\d+|\d+))\s+([A-Z][a-z]?(?:[A-Z][a-z]?)?(?:_\d+|\d+))\b/g, '$1$2');
      s = s.replace(/\b([A-Z][a-z]?(?:_\d+|\d+))\s+([A-Z][a-z]?(?:_\d+|\d+)?)\b/g, '$1$2');

      // 5. Match and wrap chemical reaction equations e.g. "N_2 + 3H_2 = 2NH_3" or "2H_2 + O_2 = 2H_2O" or "(2H_2 + O_2 = 2H_2O)"
      s = DocxHandler.processOutsideMath(s, str => {
        const chemReaction = /(\(?\d*(?:[A-Z][a-z]?(?:_\{?\d+\}?|\d+)?)+(?:\s*[-+]\s*\d*(?:[A-Z][a-z]?(?:_\{?\d+\}?|\d+)?)+)*\s*(?:=|→|->|──>)\s*\d*(?:[A-Z][a-z]?(?:_\{?\d+\}?|\d+)?)+(?:\s*[-+]\s*\d*(?:[A-Z][a-z]?(?:_\{?\d+\}?|\d+)?)+)*\)?)/g;
        return str.replace(chemReaction, (m) => {
          if (!/_{|\d/.test(m)) return m;
          let hasParen = m.startsWith('(') && m.endsWith(')');
          let clean = hasParen ? m.slice(1, -1) : m;
          clean = clean.replace(/([A-Z][a-z]?)(\d+)/g, '$1_{$2}');
          clean = clean.replace(/_(\d+)(?!\})/g, '_{$1}');
          return hasParen ? '($' + clean + '$)' : '$' + clean + '$';
        });
      });

      // 6. Wrap chemical formulas with or without existing subscripts outside $...$
      s = DocxHandler.processOutsideMath(s, str => {
        const chemUnit = /(?<![\$a-zA-Z0-9])(\d*)((?:[A-Z][a-z]?(?:_\{?\d+\}?|\d+)?)+)(?![\$a-zA-Z0-9])/g;
        return str.replace(chemUnit, (m, coeff, formula) => {
          if (!/_{|\d/.test(formula)) return m;
          if (/^(?:MCQ|CQ|CPU|RAM|LED|DNA|RNA|A4|B5|Q\d+|P\d+|ID|OK|AM|PM|US|UK|BD|HTML|CSS|JS|PDF|DOC|DOCX)$/i.test(m)) return m;
          let cleanFormula = formula.replace(/([A-Z][a-z]?)(\d+)/g, '$1_{$2}');
          cleanFormula = cleanFormula.replace(/_(\d+)(?!\})/g, '_{$1}');
          return '$' + (coeff || '') + cleanFormula + '$';
        });
      });

      return s;
    }

    static healAlgebraicPowers(text) {
      if (!text) return text;
      let s = DocxHandler.healScientificAndChemical(text);

      // 1. Parenthesized expressions followed by a power e.g. (x+y)2 -> $(x+y)^2$, (x-y)2 -> $(x-y)^2$
      s = s.replace(/(\([a-zA-Z0-9\s_+\-*\/=]+\))\s*([2-9]|\d{2,})(?![\$\w])/g, (m, g1, g2) => '$(' + g1.slice(1, -1) + ')^{' + g2 + '}$');

      // 2. Variables or coeff+var followed by power (2-9) before operators or boundaries
      // e.g. 4x2 -> $4x^2$, 8x2 -> $8x^2$, 2a3 -> $2a^3$, 3a2 -> $3a^2$, a2 -> $a^2$, b2 -> $b^2$, c2 -> $c^2$
      s = s.replace(/(?<![a-zA-Z0-9\$])(\d*[a-zA-Z])([2-9])(?=[-+=×\u00D7\u2A2F\/\*,\s\)]|$)/g, (m, g1, g2) => '$' + g1 + '^{' + g2 + '}$');

      // 3. Merge adjacent math segments separated by operators e.g. $a^2$-$b^2$ -> $a^2 - b^2$
      let merged = true;
      while (merged) {
        const next = s.replace(/\$([^\$]+)\$\s*([-+=×\u00D7\u2A2F\/\*])\s*\$([^\$]+)\$/g, '$$$1 $2 $3$$');
        if (next === s) merged = false;
        else s = next;
      }

      // 4. Include attached terms like "$4x^2$-3y+7z" -> "$4x^2 - 3y + 7z$"
      s = s.replace(/\$([^\$]+)\$\s*([-+])\s*(\d*[a-zA-Z][a-zA-Z0-9]*(?:\s*[-+]\s*\d*[a-zA-Z][a-zA-Z0-9]*)*)/g, '$$$1 $2 $3$$');
      s = s.replace(/\$([^\$]+)\$\s*([-+=])\s*(\d*[a-zA-Z][a-zA-Z0-9]*)/g, '$$$1 $2 $3$$');

      // 5. Wrap algebraic assignments/equalities like a=7x-5y+7z, b=2x-3z+7y, c=8x+2y-3z, a+b+c=17x+4y+z
      s = s.replace(/(?<![\$\w])([a-zA-Z]\s*=\s*\d*[a-zA-Z][0-9a-zA-Z\s+\-*\/]+)(?![\$\w])/g, (m, g1) => ' $' + g1.trim() + '$ ');
      s = s.replace(/(?<![\$\w])([a-zA-Z0-9\s+\-*\/]+=[0-9a-zA-Z\s+\-*\/]+)(?![\$\w])/g, (m, g1) => {
        if (/[\u0980-\u09FF]/.test(g1)) return m;
        if (!/[=]/.test(g1) || !/[a-zA-Z]/.test(g1)) return m;
        return ' $' + g1.trim() + '$ ';
      });

      // 6. Wrap comma-separated variable assignments e.g. a=2,b=3,c=1 or x=3,y=5,z=2
      s = s.replace(/(?<![\$\w])([a-zA-Z]\s*=\s*\d+(?:\s*,\s*[a-zA-Z]\s*=\s*\d+)+)(?![\$\w])/g, (m, g1) => ' $' + g1.trim() + '$ ');
      s = s.replace(/(?<![\$\w])([a-zA-Z]\s*=\s*\d+)(?![\$\w])/g, (m, g1) => ' $' + g1.trim() + '$ ');

      return s;
    }

    /**
     * Unified full-document question paper formatter
     */
    static formatQuestionPaper(text, isBijoy = false) {
      if (!text) return text;
      const healedText = DocxHandler.healAlgebraicPowers(text);
      const arrowNormalized = DocxHandler.formatReactionArrows(healedText);
      const lines = arrowNormalized.split(/\r?\n/);
      return lines.map(line => DocxHandler.formatQuestionPaperLine(line, isBijoy)).join('\n');
    }

    /**
     * Render whitespace into MS Word compatible HTML tokens preserving mso-tab-count and spaces
     */
    static renderWordWhitespace(ws) {
      if (!ws) return "";
      let res = "";
      for (let ch of ws) {
        if (ch === '\t') res += "<span style='mso-tab-count:1'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>";
        else res += "<span style='mso-spacerun:yes'>&nbsp;</span>";
      }
      return res;
    }

    /**
     * Generate a complete standalone .docx Blob from raw text
     */
    static async createDocxFromText(text, options = {}) {
      if (typeof JSZip === 'undefined') {
        throw new Error("JSZip is not loaded.");
      }

      const opts = typeof options === 'string' ? { fontName: options } : (options || {});
      const isBijoy = opts.direction === 'all_bijoy' || opts.direction === 'u2b' || opts.isBijoy;
      const fontName = isBijoy ? 'SutonnyMJ' : (opts.targetFont || opts.fontName || 'Kalpurush');

      const pageSizeVal = opts.pageSize || (typeof document !== 'undefined' && (document.getElementById('ai-target-page-size')?.value || document.getElementById('ai-ocr-page-size')?.value)) || 'a4';
      const marginVal = opts.margin || opts.pageMargin || (typeof document !== 'undefined' && (document.getElementById('ai-target-page-margin')?.value || document.getElementById('ai-ocr-page-margin')?.value)) || 'normal';

      const PAGE_SIZES_TWIPS = {
        'a4': { w: 11906, h: 16838 },
        'legal': { w: 12240, h: 20160 },
        'letter': { w: 12240, h: 15840 }
      };
      const MARGINS_TWIPS = {
        'normal': { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        'narrow': { top: 720, right: 720, bottom: 720, left: 720 },
        'moderate': { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        'wide': { top: 1800, right: 1800, bottom: 1800, left: 1800 }
      };
      const pageDim = PAGE_SIZES_TWIPS[pageSizeVal] || PAGE_SIZES_TWIPS['a4'];
      const pageMar = MARGINS_TWIPS[marginVal] || MARGINS_TWIPS['normal'];

      const zip = new JSZip();
      const lines = (text || '').replace(/\*\*/g, '').replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0).map(l => DocxHandler.formatQuestionPaperLine(l, isBijoy));
      
      const paragraphsXml = lines.map(line => {
        if (!line) return '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:t></w:t></w:r></w:p>';

        const hasMath = typeof EquationConverter !== 'undefined' && 
                        (/\$\$[\s\S]*?\$\$|\$[^\$]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/.test(line));

        if (hasMath) {
          const segments = EquationConverter.splitTextAndMath(line);
          let runsXml = "";
          for (let seg of segments) {
            if (seg.type === 'math') {
              if (typeof EquationConverter !== 'undefined' && typeof EquationConverter.latexToOmml === 'function') {
                runsXml += EquationConverter.latexToOmml(seg.value, isBijoy);
              } else if (typeof EquationConverter !== 'undefined' && EquationConverter.needsEqField && !EquationConverter.needsEqField(seg.value)) {
                const clean = EquationConverter.sanitizeSimpleMath(seg.value, isBijoy);
                const tokens = typeof EquationConverter.tokenizeSimpleMath === 'function'
                  ? EquationConverter.tokenizeSimpleMath(clean)
                  : [{ text: clean, italic: false }];
                for (let t of tokens) {
                  if (!t.text) continue;
                  const hasBn = t.isBengali || (typeof BanglaConverter !== 'undefined' && (BanglaConverter.hasBengaliText(t.text) || (isBijoy && BanglaConverter.isBijoyString && BanglaConverter.isBijoyString(t.text))));
                  const font = hasBn ? fontName : "Times New Roman";
                  const hintAttr = hasBn ? (isBijoy ? 'w:hint="ascii"' : 'w:hint="cs"') : 'w:hint="default"';
                  const italicTag = (t.italic && !hasBn) ? '<w:i/><w:iCs/>' : '';
                  const escapedText = (t.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                  runsXml += `<w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" ${hintAttr}/>${italicTag}<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escapedText}</w:t></w:r>`;
                }
              } else {
                const eqCode = EquationConverter.latexToEqField(seg.value, isBijoy);
                const fullEq = ' EQ ' + eqCode + ' ';
                const tokens = typeof EquationConverter.tokenizeEqCode === 'function' ? EquationConverter.tokenizeEqCode(fullEq) : [{ text: fullEq, italic: false }];
                
                runsXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>`;
                for (let t of tokens) {
                  if (!t.text) continue;
                  const isBn = t.isQuotedText && typeof BanglaConverter !== 'undefined' && (BanglaConverter.hasBengaliText(t.text) || isBijoy);
                  const font = isBn ? fontName : "Times New Roman";
                  const hintAttr = isBn ? (isBijoy ? 'w:hint="ascii"' : 'w:hint="cs"') : 'w:hint="default"';
                  const italicTag = (t.italic && !isBn) ? '<w:i/><w:iCs/>' : '';
                  const escapedText = (t.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                  runsXml += `<w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" ${hintAttr}/>${italicTag}<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:instrText xml:space="preserve">${escapedText}</w:instrText></w:r>`;
                }
                runsXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>`;
              }
            } else if (seg.value) {
              const subSegments = typeof BanglaConverter !== 'undefined' && typeof BanglaConverter.splitMixedBengaliAndEnglish === 'function'
                ? BanglaConverter.splitMixedBengaliAndEnglish(seg.value)
                : [{ type: 'bengali', text: seg.value }];
              
              for (let sub of subSegments) {
                const textVal = sub.text || '';
                const parts = textVal.split('\t');
                for (let pIdx = 0; pIdx < parts.length; pIdx++) {
                  if (pIdx > 0) {
                    runsXml += `<w:r><w:tab/></w:r>`;
                  }
                  const pText = parts[pIdx];
                  if (!pText) continue;
                  const escaped = pText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                  if (sub.type === 'english') {
                    runsXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>`;
                  } else if (isBijoy && /[-–—−‒―]/.test(pText)) {
                    const dParts = pText.split(/([-–—−‒―]+)/);
                    for (let dp of dParts) {
                      if (!dp) continue;
                      const escDp = dp.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                      if (/[-–—−‒―]/.test(dp)) {
                        runsXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escDp}</w:t></w:r>`;
                      } else {
                        runsXml += `<w:r><w:rPr><w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}" w:hint="ascii"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escDp}</w:t></w:r>`;
                      }
                    }
                  } else {
                    runsXml += `<w:r><w:rPr><w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}" ${isBijoy ? 'w:hint="ascii"' : 'w:hint="cs"'}/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>`;
                  }
                }
              }
            }
          }
          return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>${runsXml}</w:p>`;
        }

        const isInputBijoy = Boolean(options.inputIsBijoy || options.isInputBijoy);
        const segments = (typeof BanglaConverter !== 'undefined')
          ? (isInputBijoy && typeof BanglaConverter.splitBijoyAndEnglish === 'function'
              ? BanglaConverter.splitBijoyAndEnglish(line)
              : BanglaConverter.splitMixedBengaliAndEnglish(line))
          : [{ type: 'bengali', text: line }];

        let runsXml = "";
        for (let seg of segments) {
          const textVal = seg.text || '';
          const parts = textVal.split('\t');
          for (let pIdx = 0; pIdx < parts.length; pIdx++) {
            if (pIdx > 0) {
              runsXml += `<w:r><w:tab/></w:r>`;
            }
            const pText = parts[pIdx];
            if (!pText) continue;
            const escaped = pText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            if (seg.type === 'english') {
              runsXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>`;
            } else if (isBijoy) {
              const targetText = (typeof BanglaConverter !== 'undefined' && !isInputBijoy) ? BanglaConverter.unicodeToBijoy(pText) : pText;
              if (/[-–—−‒―]/.test(targetText)) {
                const dParts = targetText.split(/([-–—−‒―]+)/);
                for (let dp of dParts) {
                  if (!dp) continue;
                  const escDp = dp.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                  if (/[-–—−‒―]/.test(dp)) {
                    runsXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escDp}</w:t></w:r>`;
                  } else {
                    runsXml += `<w:r><w:rPr><w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}" w:hint="ascii"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escDp}</w:t></w:r>`;
                  }
                }
              } else {
                const escTarget = targetText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                runsXml += `<w:r><w:rPr><w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}" w:hint="ascii"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escTarget}</w:t></w:r>`;
              }
            } else {
              runsXml += `<w:r><w:rPr><w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}" w:hint="cs"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>`;
            }
          }
        }
        return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>${runsXml}</w:p>`;
      }).join('\n');

      const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

      const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

      const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${paragraphsXml}
    <w:sectPr>
      <w:pgSz w:w="${pageDim.w}" w:h="${pageDim.h}"/>
      <w:pgMar w:top="${pageMar.top}" w:right="${pageMar.right}" w:bottom="${pageMar.bottom}" w:left="${pageMar.left}" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

      const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/>
        <w:sz w:val="28"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

      zip.file("[Content_Types].xml", contentTypesXml);
      zip.file("_rels/.rels", relsXml);
      zip.file("word/document.xml", documentXml);
      zip.file("word/_rels/document.xml.rels", docRelsXml);
      zip.file("word/styles.xml", stylesXml);

      return await zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });
    }

    /**
     * Generate an Office 2003 .doc Blob from raw text with 100% font & math preservation
     */
    static createDocFromText(text, fontName = 'SutonnyMJ', isBijoy = true, baseFontSizePt = 12, options = {}) {
      let opts = {};
      if (typeof baseFontSizePt === 'object' && baseFontSizePt !== null) {
        opts = baseFontSizePt;
        baseFontSizePt = parseInt(opts.fontSize || opts.fontSizePt || opts.baseFontSizePt, 10) || 12;
      } else if (typeof options === 'object' && options !== null) {
        opts = options;
      }

      const pageSizeVal = opts.pageSize || (typeof document !== 'undefined' && (document.getElementById('ai-target-page-size')?.value || document.getElementById('ai-ocr-page-size')?.value)) || 'a4';
      const marginVal = opts.margin || opts.pageMargin || (typeof document !== 'undefined' && (document.getElementById('ai-target-page-margin')?.value || document.getElementById('ai-ocr-page-margin')?.value)) || 'normal';

      const PAGE_SIZES_PT = {
        'a4': { w: 595.35, h: 841.95 },
        'legal': { w: 612.0, h: 1008.0 },
        'letter': { w: 612.0, h: 792.0 }
      };
      const MARGINS_PT = {
        'normal': { top: 72.0, right: 72.0, bottom: 72.0, left: 72.0 },
        'narrow': { top: 36.0, right: 36.0, bottom: 36.0, left: 36.0 },
        'moderate': { top: 54.0, right: 54.0, bottom: 54.0, left: 54.0 },
        'wide': { top: 90.0, right: 90.0, bottom: 90.0, left: 90.0 }
      };

      const pageDim = PAGE_SIZES_PT[pageSizeVal] || PAGE_SIZES_PT['a4'];
      const pageMar = MARGINS_PT[marginVal] || MARGINS_PT['normal'];

      let sanitizedText = (text || '').replace(/\*\*/g, '').replace(/\r/g, '');

      // 0. Extract ALL Bengali text out of math mode so words like 'এবং', 'অথবা' are NEVER inside equations
      sanitizedText = sanitizedText.replace(/\\(?:text|mathrm|textmd|textbf|textit|mbox)\{\s*([^{}]*?[\u0980-\u09FF][^{}]*?)\s*\}/g, ' $1 ');
      sanitizedText = sanitizedText.replace(/["“'’](\s*[\u0980-\u09FF\s]+\s*)["”'’]/g, ' $1 ');
      sanitizedText = sanitizedText.replace(/(\}\s*)([A-Za-z]\s*=)/g, (match, g1, g2) => `${g1.trim()}, ${g2}`);
      sanitizedText = sanitizedText.replace(/\$\$([\s\S]*?)\$\$|\$([^\$]+?)\$|\\\[([\s\S]*?\\\])|\\\(([\s\S]*?)\\\)/g, (match, d1, s1, b1, p1) => {
        const isDouble = Boolean(d1 || b1);
        const inner = (d1 || s1 || b1 || p1 || '').trim();
        if (!/[\u0980-\u09FF]/.test(inner)) return match;
        const parts = inner.split(/([\u0980-\u09FF]+(?:\s+[\u0980-\u09FF]+)*)/);
        let out = [];
        for (let p of parts) {
          p = (p || '').trim();
          if (!p) continue;
          if (/[\u0980-\u09FF]/.test(p)) {
            out.push(p);
          } else {
            if (/^[.,;:]+$/.test(p)) {
              out.push(p);
            } else {
              out.push(isDouble ? `$$${p}$$` : `$${p}$`);
            }
          }
        }
        return out.join(' ');
      });
      sanitizedText = sanitizedText.replace(/\$\$\s*\$\$/g, '').replace(/\$\s*\$/g, '');
      sanitizedText = sanitizedText.replace(/,\s*,/g, ',');

      // 1. Strip stray quotes around scientific & standard units and convert cubic/square units to superscripts
      sanitizedText = sanitizedText.replace(/(?<=\d|\))\s*["']\s*(cm|mm|m|km|gm|kg|sec|s|hr|min|V|W|kW|A|mA|Hz|N|Pa|J)\s*["']\s*(\^?\d+)?/gi, function(match, unit, exp) {
        let cleanExp = exp ? exp.replace('^', '') : '';
        return cleanExp ? ` ${unit}<sup>${cleanExp}</sup>` : ` ${unit}`;
      });
      sanitizedText = sanitizedText.replace(/["']\s*(cm|mm|m|km|gm|kg|sec|s|hr|min|V|W|kW|A|mA|Hz|N|Pa|J)\s*["']/gi, '$1');
      // Convert e.g. "cm 3", "cm 2", "cm^3", "m 3", "m^3" to superscripts
      sanitizedText = sanitizedText.replace(/\b(cm|mm|m|km)\s*(\^?([23]))\b/gi, '$1<sup>$3</sup>');

      // 1b. Auto-format common chemical formulas (e.g. KNO3, KNO2, H2O, HO2, 2H2O, H2O2, CO2, O2, SO4, CaCO3) to have proper HTML subscripts
      sanitizedText = sanitizedText.replace(/\b([A-Z][a-z]?)([0-9]+)\b/g, '$1<sub>$2</sub>');
      sanitizedText = sanitizedText.replace(/\b([A-Z][a-z]?[A-Z][a-z]?)([0-9]+)\b/g, '$1<sub>$2</sub>');
      sanitizedText = sanitizedText.replace(/\b([A-Z][a-z]?[A-Z][a-z]?[A-Z][a-z]?)([0-9]+)\b/g, '$1<sub>$2</sub>');
      sanitizedText = sanitizedText.replace(/\b([0-9]*[A-Z][a-z]?)([0-9]+)([A-Z][a-z]?)([0-9]+)?\b/g, (m, g1, g2, g3, g4) => {
        return `${g1}<sub>${g2}</sub>${g3}${g4 ? `<sub>${g4}</sub>` : ''}`;
      });

      // 2. UNWRAP comma-separated lists of numbers (e.g. 75, 65, 80... in Q11)
      // These must NEVER be treated as EQ fields, which cause Word's "!Syntax Error" / "Error!"
      sanitizedText = sanitizedText.replace(/\$\s*([০-৯0-9\s,.\-]+(?:\s*,\s*[০-৯0-9\s,.\-]+)+)\s*\$/g, '$1');

      // 3. UNWRAP plain isolated numbers in $...$ (e.g. $50$, $65$, $62.5$, $30$, $7$)
      sanitizedText = sanitizedText.replace(/\$\s*([০-৯0-9]+(?:\.[০-৯0-9]+)?)\s*\$/g, '$1');

      // 4. UNWRAP plain measurements in $...$ (e.g. $8 m$, $6 m$, $20 cm$)
      sanitizedText = sanitizedText.replace(/\$\s*([০-৯0-9]+(?:\.[০-৯0-9]+)?\s*(?:m|cm|mm|km|gm|kg|sec|s|hr|min|V|W|kW|A|mA|Hz|N|Pa|J))\s*\$/gi, '$1');

      // 5. UNWRAP Bengali abbreviations in $...$ (e.g. $7 সে.মি.$, $7 সে. মি.$)
      sanitizedText = sanitizedText.replace(/\$\s*([০-৯0-9]+(?:\.[০-৯0-9]+)?\s*[\u0980-\u09FF\s.]+)\s*\$/g, '$1');

      // 6. ONLY auto-wrap isolated math variables and expressions before Bengali postpositions (strictly [a-zA-Z], NEVER \d*[a-zA-Z])
      sanitizedText = sanitizedText.replace(/(?<!\$)\b([a-zA-Z]\([a-zA-Z0-9,\s]+\))(?!\$)(?=\s+(?:এর|হলে|নির্ণয়|মান|কে|তালিকা|প্রকাশ)(?:[\s।\?,\.]|$))/g, '$$$1$$');
      sanitizedText = sanitizedText.replace(/(?<!\$)\b([a-zA-Z])(?!\$)(?=\s+(?:এর|হলে|কে|তে|মান|নির্ণয়|সমান|মানটি|থেকে|পর্যন্ত|সংখ্যক|তম|পদ)(?:[\s।\?,\.]|$))/g, '$$$1$$');
      sanitizedText = sanitizedText.replace(/(?<!\$)\b([A-Z])(?!\$)(?=\s+(?:অন্বয়|সেট|তালিকা|ফাংশন|সম্পর্ক|কে|নির্ণয়))/g, '$$$1$$');
      sanitizedText = sanitizedText.replace(/(?<!\$)\b([a-zA-Z]\s*[-+]\s*[a-zA-Z]\s*=\s*-?\d+(?:\s*\\?\}|\s*\})?)(?!\$)/g, '$$$1$$');

      function renderFormattedRun(str) {
        if (!str || !str.trim()) return "";
        const hasMath = typeof EquationConverter !== 'undefined' && 
                        (/\$\$[\s\S]*?\$\$|\$[^\$]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/.test(str));

        if (hasMath) {
          const segments = EquationConverter.splitTextAndMath(str);
          let innerHtml = "";
          for (let seg of segments) {
            if (seg.type === 'math') {
              const rawMath = seg.value;
              const cleanContent = rawMath.replace(/^\$\$|\$\$$|^\$|\$$|^\\\[|\\\]$|^\\\(|\\\)$/g, '').trim();

              // If comma-separated numbers or pure numbers, render as plain text (NEVER EQ field!)
              if (/^[\d\s,.\u09E6-\u09EF\-]+$/.test(cleanContent) || /^[\d\s,.\u09E6-\u09EF]+[a-zA-Z\u0980-\u09FF\s.]+$/.test(cleanContent)) {
                innerHtml += renderMixedWithHtmlTags(cleanContent);
                continue;
              }

              // If segment contains any Bengali characters, NEVER send to Word EQ field!
              if (/[\u0980-\u09FF]/.test(cleanContent)) {
                if (/\^|\_/.test(cleanContent)) {
                  innerHtml += renderSuperscriptsAndSubscripts(cleanContent, isBijoy, fontName, baseFontSizePt);
                } else {
                  innerHtml += renderMixedWithHtmlTags(cleanContent);
                }
                continue;
              }

              // Check if it genuinely needs a Word EQ field
              const needsEq = typeof EquationConverter !== 'undefined' && typeof EquationConverter.needsEqField === 'function'
                ? EquationConverter.needsEqField(rawMath)
                : false;

              if (!needsEq) {
                if (/\^|\_/.test(cleanContent)) {
                  innerHtml += renderSuperscriptsAndSubscripts(cleanContent, isBijoy, fontName, baseFontSizePt);
                } else {
                  const sanitized = typeof EquationConverter !== 'undefined' && typeof EquationConverter.sanitizeSimpleMath === 'function'
                    ? EquationConverter.sanitizeSimpleMath(rawMath, isBijoy)
                    : cleanContent;
                  innerHtml += renderMixedWithHtmlTags(sanitized);
                }
                continue;
              }

              // Complex equation: generate compliant Word 2003 Field
              const eqCode = EquationConverter.latexToEqField(rawMath, isBijoy);
              const cleanEq = (eqCode || '').trim();
              const cleanEqCode = cleanEq.startsWith('EQ ') ? cleanEq.slice(3).trim() : cleanEq;

              const formattedEq = (typeof EquationConverter !== 'undefined' && typeof EquationConverter.formatEqCodeToWordHtml === 'function')
                ? EquationConverter.formatEqCodeToWordHtml(cleanEqCode, baseFontSizePt, isBijoy)
                : cleanEqCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

              // Standard Word 2003 field markup with math variable italics and small 8pt scripts:
              innerHtml += `<!--[if supportFields]><span class="MsoFieldCode" style="font-family:'Times New Roman',serif;"><span style='mso-element:field-begin'></span><span style='mso-spacerun:yes'>&nbsp;</span>EQ ${formattedEq} <span style='mso-element:field-end'></span></span><![endif]-->`;
            } else if (seg.value) {
              innerHtml += renderMixedWithHtmlTags(seg.value);
            }
          }
          return innerHtml;
        }

        return renderMixedWithHtmlTags(str);
      }

      function renderSuperscriptsAndSubscripts(str, isBijoy, fontName, baseFontSizePt) {
        let s = str;
        const scriptSize = '8.0'; // crisp small font size for superscripts & subscripts

        s = s.replace(/\^\{([^}]+)\}|\^\(([^)]+)\)|\^([a-zA-Z0-9\u09E6-\u09EF+\-]+)/g, (m, g1, g2, g3) => {
          const val = g1 || g2 || g3;
          const rendered = renderPlainMixedText(val);
          return `<sup style="font-size:${scriptSize}pt;vertical-align:super;mso-text-raise:3.0pt;">${rendered}</sup>`;
        });

        s = s.replace(/_\{([^}]+)\}|_\(([^)]+)\)|_([a-zA-Z0-9\u09E6-\u09EF+\-]+)/g, (m, g1, g2, g3) => {
          const val = g1 || g2 || g3;
          const rendered = renderPlainMixedText(val);
          return `<sub style="font-size:${scriptSize}pt;vertical-align:sub;mso-text-raise:-2.0pt;">${rendered}</sub>`;
        });

        return renderMixedWithHtmlTags(s);
      }

      function renderMixedWithHtmlTags(str) {
        if (!str) return "";
        if (!/<\/?(sup|sub|i|b|span|table|tr|td)[^>]*>/i.test(str)) {
          return renderPlainMixedText(str);
        }
        const tagRegex = /(<\/?(?:sup|sub|i|b|span|table|tr|td)[^>]*>)/gi;
        const parts = str.split(tagRegex);
        let result = "";
        for (const p of parts) {
          if (tagRegex.test(p)) {
            result += p;
          } else if (p) {
            result += renderPlainMixedText(p);
          }
        }
        return result;
      }

      function renderPlainMixedText(str) {
        if (!str) return "";
        if (/^\s+$/.test(str)) {
          return DocxHandler.renderWordWhitespace(str);
        }
        const isInputBijoy = Boolean(opts.inputIsBijoy || opts.isInputBijoy);
        const mixedParts = (typeof BanglaConverter !== 'undefined')
          ? (isInputBijoy && typeof BanglaConverter.splitBijoyAndEnglish === 'function'
              ? BanglaConverter.splitBijoyAndEnglish(str)
              : BanglaConverter.splitMixedBengaliAndEnglish(str))
          : [{ type: 'bengali', text: str }];
        
        let out = "";
        for (const part of mixedParts) {
          const escaped = (part.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          if (part.type === 'english') {
            const trimmedEn = part.text.trim();
            const leadSpMatch = part.text.match(/^\s+/);
            const trailSpMatch = part.text.match(/\s+$/);
            const leadSp = leadSpMatch ? DocxHandler.renderWordWhitespace(leadSpMatch[0]) : "";
            const trailSp = trailSpMatch ? DocxHandler.renderWordWhitespace(trailSpMatch[0]) : "";
            const formattedEn = escaped.replace(/\t/g, "<span style='mso-tab-count:1'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>");
            // Single math variable letter (e.g. x, y, n, a, b, N) -> render in italic!
            if (/^[a-hj-zA-HJ-Z]$/.test(trimmedEn)) {
              out += `${leadSp}<i style="font-family:'Times New Roman',serif;mso-ascii-font-family:'Times New Roman';mso-hansi-font-family:'Times New Roman';">${escaped.trim()}</i>${trailSp}`;
            } else if (/^\d+[a-zA-Z]$/.test(trimmedEn)) { // e.g. 3n
              const numPart = trimmedEn.slice(0, -1);
              const varPart = trimmedEn.slice(-1);
              out += `${leadSp}<span lang="EN-US" style="font-family:'Times New Roman',serif;mso-ascii-font-family:'Times New Roman';mso-hansi-font-family:'Times New Roman';">${numPart}<i>${varPart}</i></span>${trailSp}`;
            } else if (/^[a-zA-Z]\([a-zA-Z0-9,\s]+\)$/.test(trimmedEn)) { // e.g. P(A), f(x)
              const formattedFn = formattedEn.trim().replace(/([a-zA-Z])/g, '<i>$1</i>');
              out += `${leadSp}<span lang="EN-US" style="font-family:'Times New Roman',serif;mso-ascii-font-family:'Times New Roman';mso-hansi-font-family:'Times New Roman';">${formattedFn}</span>${trailSp}`;
            } else if (/[=+\-*/<>]/.test(trimmedEn)) {
              // Mathematical expression containing variable letters and operators e.g. y - x = -1}
              const formattedExpr = formattedEn.trim().replace(/\b([a-zA-Z])\b/g, '<i>$1</i>');
              out += `${leadSp}<span lang="EN-US" style="font-family:'Times New Roman',serif;mso-ascii-font-family:'Times New Roman';mso-hansi-font-family:'Times New Roman';">${formattedExpr}</span>${trailSp}`;
            } else {
              out += `<span lang="EN-US" style="font-family:'Times New Roman',serif;mso-ascii-font-family:'Times New Roman';mso-hansi-font-family:'Times New Roman';">${formattedEn}</span>`;
            }
          } else {
            const targetText = (isBijoy && !isInputBijoy && typeof BanglaConverter !== 'undefined') ? BanglaConverter.unicodeToBijoy(part.text) : part.text;
            if (isBijoy && /[-–—−‒―]/.test(targetText)) {
              const dParts = targetText.split(/([-–—−‒―]+)/);
              for (let dp of dParts) {
                if (!dp) continue;
                const escDp = dp.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const fmtDp = escDp.replace(/\t/g, "<span style='mso-tab-count:1'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>");
                if (/[-–—−‒―]/.test(dp)) {
                  out += `<span lang="EN-US" style="font-family:'Times New Roman',serif;mso-ascii-font-family:'Times New Roman';mso-hansi-font-family:'Times New Roman';">${fmtDp}</span>`;
                } else {
                  out += `<span style="font-family:'${fontName}',Arial,sans-serif;mso-ascii-font-family:'${fontName}';mso-hansi-font-family:'${fontName}';mso-bidi-font-family:'${fontName}';">${fmtDp}</span>`;
                }
              }
            } else {
              const escapedBn = (targetText || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              const formattedBn = escapedBn.replace(/\t/g, "<span style='mso-tab-count:1'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>");
              out += `<span style="font-family:'${fontName}',Arial,sans-serif;mso-ascii-font-family:'${fontName}';mso-hansi-font-family:'${fontName}';mso-bidi-font-family:'${fontName}';">${formattedBn}</span>`;
            }
          }
        }
        return out;
      }

      const lines = sanitizedText.split(/\r?\n/).map(l => DocxHandler.formatQuestionPaperLine(l, isBijoy));
      let i = 0;
      const htmlBlocks = [];

      let isInsideNote = false;

      while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Check if line is a markdown table row
        if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
          const tableLines = [];
          while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
            tableLines.push(lines[i].trim());
            i++;
          }

          const parsedRows = [];
          for (const tLine of tableLines) {
            if (/^\|[\s\-:]+(\|[\s\-:]+)+\|$/.test(tLine)) continue; // skip markdown divider |:---|:---|
            const cells = tLine.split('|').slice(1, -1).map(c => c.trim());
            if (cells.length > 0) parsedRows.push(cells);
          }

          if (parsedRows.length > 0) {
            let tableHtml = `<table class="MsoTableGrid" border="1" cellspacing="0" cellpadding="0" align="center" style="border-collapse:collapse; border:none; mso-border-alt:solid windowtext .5pt; mso-yfti-tbllook:1184; mso-padding-alt:2.0pt 5.4pt 2.0pt 5.4pt; margin:4pt auto; width:auto;">\n`;
            for (let rIdx = 0; rIdx < parsedRows.length; rIdx++) {
              const row = parsedRows[rIdx];
              tableHtml += `  <tr class="MsoTableRow" style="mso-yfti-irow:${rIdx};">\n`;
              for (let cIdx = 0; cIdx < row.length; cIdx++) {
                const cellVal = row[cIdx];
                const renderedCell = renderFormattedRun(cellVal);
                tableHtml += `    <td class="MsoTableCell" style="border:solid windowtext 1.0pt; mso-border-alt:solid windowtext .5pt; padding:2.0pt 5.4pt 2.0pt 5.4pt; text-align:center; vertical-align:middle;">\n`;
                tableHtml += `      <p class="MsoNormal" align="center" style="margin:0cm;margin-bottom:.0001pt;text-align:center;line-height:normal;mso-line-height-rule:auto;font-size:${baseFontSizePt}pt;">${renderedCell || '&nbsp;'}</p>\n`;
                tableHtml += `    </td>\n`;
              }
              tableHtml += `  </tr>\n`;
            }
            tableHtml += `</table>`;
            htmlBlocks.push(tableHtml);
            continue;
          }
        }

        // Regular paragraph line (skip empty lines / extra enters)
        if (!trimmed) {
          i++;
          continue;
        } else {
          const contentHtml = renderFormattedRun(line);
          const isNoteHeader = /^\s*\[\s*নোট/i.test(trimmed);
          if (isNoteHeader) isInsideNote = true;
          const isNoteLine = isNoteHeader || isInsideNote;
          const noteStyle = isNoteLine ? (isNoteHeader ? 'color:#334155;font-weight:bold;padding-top:6pt;' : 'color:#334155;padding-left:10pt;') : '';
          if (trimmed.endsWith(']')) isInsideNote = false;
          htmlBlocks.push(`<p class="MsoNormal" style="margin:0cm;margin-bottom:.0001pt;line-height:normal;mso-line-height-rule:auto;font-size:${baseFontSizePt}pt;${noteStyle}">${contentHtml || '&nbsp;'}</p>`);
        }
        i++;
      }
      const paragraphsHtml = htmlBlocks.join('\n');

      const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<style>
@page Section1 { size: ${pageDim.w}pt ${pageDim.h}pt; margin: ${pageMar.top}pt ${pageMar.right}pt ${pageMar.bottom}pt ${pageMar.left}pt; mso-header-margin: 36pt; mso-footer-margin: 36pt; mso-paper-source: 0; }
div.Section1 { page: Section1; }
p.MsoNormal, li.MsoNormal, div.MsoNormal {
  margin: 0cm;
  margin-bottom: .0001pt;
  mso-pagination: widow-orphan;
  font-size: ${baseFontSizePt}pt;
  line-height: normal;
  mso-line-height-rule: auto;
  font-family: "${fontName}", Arial, sans-serif;
  mso-ascii-font-family: "Times New Roman";
  mso-hansi-font-family: "Times New Roman";
  mso-fareast-font-family: "Times New Roman";
  mso-bidi-font-family: "${fontName}";
}
table.MsoTableGrid {
  border-collapse: collapse;
  mso-table-layout-alt: auto;
  border: none;
  mso-border-alt: solid windowtext .5pt;
  margin: 4pt auto;
}
td.MsoTableCell {
  border: solid windowtext 1.0pt;
  mso-border-alt: solid windowtext .5pt;
  padding: 2.0pt 5.4pt;
}
body {
  font-family: "${fontName}", Arial, sans-serif;
  mso-ascii-font-family: "Times New Roman";
  mso-hansi-font-family: "Times New Roman";
  mso-bidi-font-family: "${fontName}";
  font-size: ${baseFontSizePt}pt;
}
p { margin: 0cm; margin-bottom: .0001pt; line-height: normal; mso-line-height-rule: auto; }
</style>
</head>
<body>
<div class="Section1">
${paragraphsHtml}
</div>
</body>
</html>`;

      return new Blob([docHtml], { type: "application/msword;charset=utf-8" });
    }
  }

  const docxHandlerInstance = new DocxHandler();
  DocxHandler.convertDocx = (fileOrBuf, opts) => docxHandlerInstance.convertDocx(fileOrBuf, opts);
  DocxHandler.prototype.createDocxFromText = DocxHandler.createDocxFromText;
  DocxHandler.prototype.createDocFromText = DocxHandler.createDocFromText;
  DocxHandler.prototype.formatMcqLineTabs = DocxHandler.formatMcqLineTabs;
  DocxHandler.prototype.formatQuestionNumber = DocxHandler.formatQuestionNumber;
  DocxHandler.prototype.formatCqSubQuestion = DocxHandler.formatCqSubQuestion;
  DocxHandler.prototype.formatQuestionPaperLine = DocxHandler.formatQuestionPaperLine;
  DocxHandler.prototype.formatQuestionPaper = DocxHandler.formatQuestionPaper;
  DocxHandler.prototype.renderWordWhitespace = DocxHandler.renderWordWhitespace;

  if (typeof window !== 'undefined') {
    window.DocxHandler = DocxHandler;
    window.docxHandler = docxHandlerInstance;
  }
  if (typeof global !== 'undefined') {
    global.DocxHandler = DocxHandler;
    global.docxHandler = docxHandlerInstance;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocxHandler;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));


