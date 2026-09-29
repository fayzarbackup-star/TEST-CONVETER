/**
 * DOCX to DOC (Word 97-2003) Full Fidelity Converter Engine v2.0
 * Deep Style Inheritance, Theme Color Resolution, Font Sizing, Tables & SutonnyMJ / Unicode Typography
 * 100% Compatible with Microsoft Office Word 2003, 2007, 2010, 2013, 2016, 2019, 2021 & Office 365
 */

(function (global) {
  'use strict';

  // Standard Microsoft Office Theme Color Palette Fallbacks
  const THEME_COLORS = {
    'dark1': '000000',
    'light1': 'FFFFFF',
    'dark2': '1F497D',
    'light2': 'EEECE1',
    'accent1': '4F81BD', // Standard Blue
    'accent2': 'C0504D', // Standard Red
    'accent3': '9BBB59', // Standard Green
    'accent4': '8064A2', // Standard Purple
    'accent5': '4BACC6', // Standard Aqua
    'accent6': 'F79646', // Standard Orange
    'hyperlink': '0000FF',
    'followedHyperlink': '800080'
  };

  class DocxToDocConverter {
    constructor() {
      this.domParser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
    }

    /**
     * Convert a .docx File/Blob into Word 2003 compatible .doc Blob
     * @param {File|Blob} file 
     * @param {Object} options 
     * @returns {Promise<Object>}
     */
    async convertDocxToDoc(file, options = {}) {
      const opts = Object.assign({
        pageSize: 'a4',        // 'a4', 'legal', 'letter'
        preserveSutonny: true,
        optimizeForQuestionPaper: true,
        includeImages: true,
        onProgress: (percent, msg) => {}
      }, options);

      opts.onProgress(5, "ডকুমেন্ট প্যাকেজ লোড ও আনপ্যাক করা হচ্ছে...");
      let fileData = file;
      if (typeof Blob !== 'undefined' && file instanceof Blob) {
        fileData = await file.arrayBuffer();
      }
      const zip = await JSZip.loadAsync(fileData);

      opts.onProgress(20, "ডকুমেন্ট রিলেশন ও ইমেজ মেটাডাটা প্রসেস হচ্ছে...");
      const relsMap = await this._parseRelationships(zip);
      const mediaMap = await this._loadMediaFiles(zip, relsMap);

      opts.onProgress(35, "স্টাইল শিট ও থিম কালার বিশ্লেষণ হচ্ছে...");
      const stylesXmlStr = await this._getZipFileContent(zip, "word/styles.xml") || "";
      const styleResolver = this._buildStyleResolver(stylesXmlStr);

      opts.onProgress(50, "মূল টেক্সট, প্রশ্নপত্র ও টেবিল স্ট্রাকচার রূপান্তর হচ্ছে...");
      const docXmlStr = await this._getZipFileContent(zip, "word/document.xml");
      if (!docXmlStr) {
        throw new Error("অকার্যকর ওয়ার্ড ফাইল: word/document.xml পাওয়া যায়নি।");
      }

      const docXml = this.domParser.parseFromString(docXmlStr, "application/xml");
      const parsedBody = this._parseDocumentBody(docXml, styleResolver, mediaMap, opts);

      opts.onProgress(85, "অফিস ২০০৩ কমপ্লায়েন্ট (.doc) আর্কিটেকচার তৈরি হচ্ছে...");
      const docHtml = this._buildWord2003Document(parsedBody, opts);

      const docBlob = new Blob([docHtml], { type: "application/msword;charset=utf-8" });

      const baseName = file.name ? file.name.replace(/\.docx$/i, '') : 'Question_Paper';
      const outputFileName = `${baseName}_Word2003.doc`;

      opts.onProgress(100, "রূপান্তর সফলভাবে সম্পন্ন হয়েছে!");

      return {
        originalName: file.name || 'document.docx',
        outputFileName: outputFileName,
        blob: docBlob,
        convertedBlob: docBlob,
        preview: parsedBody.preview,
        stats: {
          paragraphs: parsedBody.stats.paragraphs,
          tables: parsedBody.stats.tables,
          runs: parsedBody.stats.runs,
          images: Object.keys(mediaMap).length
        }
      };
    }

    async _getZipFileContent(zip, path) {
      const entry = zip.file(path);
      if (!entry) return null;
      return await entry.async("string");
    }

    async _parseRelationships(zip) {
      const relsStr = await this._getZipFileContent(zip, "word/_rels/document.xml.rels");
      const relsMap = {};
      if (!relsStr) return relsMap;

      const relsDoc = this.domParser.parseFromString(relsStr, "application/xml");
      const rels = relsDoc.querySelectorAll("Relationship");
      for (let rel of rels) {
        const id = rel.getAttribute("Id");
        const target = rel.getAttribute("Target");
        const type = rel.getAttribute("Type");
        if (id && target) {
          relsMap[id] = { target, type };
        }
      }
      return relsMap;
    }

    async _loadMediaFiles(zip, relsMap) {
      const mediaMap = {};
      const allZipKeys = Object.keys(zip.files || {});

      for (let id in relsMap) {
        const rel = relsMap[id];
        const isImageRel = (rel.type && rel.type.toLowerCase().includes('/image')) ||
                           (rel.target && /\.(png|jpe?g|gif|bmp|wmf|emf|webp|svg|tiff?)$/i.test(rel.target));
        if (isImageRel) {
          let rawTarget = (rel.target || '').replace(/\\/g, '/');
          let cleanPath = rawTarget.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
          let wordPath = cleanPath.startsWith('word/') ? cleanPath : 'word/' + cleanPath;
          let filenameOnly = cleanPath.split('/').pop().toLowerCase();

          let imgFile = zip.file(wordPath) || zip.file(cleanPath) || zip.file(rawTarget);
          if (!imgFile) {
            const foundKey = allZipKeys.find(k => {
              const lower = k.toLowerCase().replace(/\\/g, '/');
              return lower.endsWith('/' + filenameOnly) || lower === filenameOnly;
            });
            if (foundKey) imgFile = zip.file(foundKey);
          }

          if (imgFile) {
            try {
              const base64Data = await imgFile.async("base64");
              const lowerName = (imgFile.name || cleanPath).toLowerCase();
              let mime = "image/png";
              if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) mime = "image/jpeg";
              else if (lowerName.endsWith('.gif')) mime = "image/gif";
              else if (lowerName.endsWith('.bmp')) mime = "image/bmp";
              else if (lowerName.endsWith('.webp')) mime = "image/webp";
              else if (lowerName.endsWith('.svg')) mime = "image/svg+xml";

              const dataUri = `data:${mime};base64,${base64Data}`;
              mediaMap[id] = dataUri;
              mediaMap[rawTarget] = dataUri;
              mediaMap[cleanPath] = dataUri;
              mediaMap[filenameOnly] = dataUri;
            } catch (e) {
              console.warn("Failed to load image:", rawTarget, e);
            }
          }
        }
      }

      // Direct Archive-Wide Indexing: Ensure 100% of images anywhere in the docx zip are catalogued
      for (const filePath of allZipKeys) {
        if (/\.(png|jpe?g|gif|bmp|wmf|emf|webp|svg|tiff?)$/i.test(filePath)) {
          const filename = filePath.split('/').pop().toLowerCase();
          if (!mediaMap[filename]) {
            try {
              const f = zip.file(filePath);
              if (f) {
                const b64 = await f.async("base64");
                const lower = filePath.toLowerCase();
                let mime = "image/png";
                if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = "image/jpeg";
                else if (lower.endsWith('.gif')) mime = "image/gif";
                else if (lower.endsWith('.bmp')) mime = "image/bmp";
                else if (lower.endsWith('.webp')) mime = "image/webp";
                else if (lower.endsWith('.svg')) mime = "image/svg+xml";

                const uri = `data:${mime};base64,${b64}`;
                mediaMap[filePath] = uri;
                mediaMap[filename] = uri;
                mediaMap['word/' + filename] = uri;
                mediaMap['media/' + filename] = uri;
              }
            } catch (e) {}
          }
        }
      }

      return mediaMap;
    }

    _extractImagesFromNode(node, mediaMap) {
      if (!node || !mediaMap) return "";
      let html = "";
      const foundImages = [];

      const elements = [node, ...(node.getElementsByTagName ? Array.from(node.getElementsByTagName('*')) : [])];
      let currentWidth = null;
      let currentHeight = null;

      for (let el of elements) {
        const elName = (el.localName || el.nodeName || '').split(':').pop();
        if (elName === 'extent') {
          const cx = parseInt(el.getAttribute("cx") || "0", 10);
          const cy = parseInt(el.getAttribute("cy") || "0", 10);
          if (cx > 0 && cy > 0) {
            currentWidth = (cx / 12700).toFixed(1) + 'pt';
            currentHeight = (cy / 12700).toFixed(1) + 'pt';
          }
        }
        const style = el.getAttribute("style");
        if (style && !currentWidth) {
          const wMatch = style.match(/width:\s*([\d.]+)\s*(pt|in|px)?/i);
          const hMatch = style.match(/height:\s*([\d.]+)\s*(pt|in|px)?/i);
          if (wMatch) currentWidth = wMatch[1] + (wMatch[2] || 'pt');
          if (hMatch) currentHeight = hMatch[1] + (hMatch[2] || 'pt');
        }

        const blipEmbed = el.getAttribute("r:embed") || el.getAttribute("embed") || el.getAttribute("r:link") || el.getAttribute("link");
        if (blipEmbed && mediaMap[blipEmbed]) foundImages.push({ id: blipEmbed, w: currentWidth, h: currentHeight });

        const vmlId = el.getAttribute("r:id") || el.getAttribute("id") || el.getAttribute("src") || el.getAttribute("href");
        if (vmlId && mediaMap[vmlId]) foundImages.push({ id: vmlId, w: currentWidth, h: currentHeight });

        if (typeof el.getAttributeNS === 'function') {
          const relNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
          const nsEmbed = el.getAttributeNS(relNs, "embed");
          const nsId = el.getAttributeNS(relNs, "id");
          if (nsEmbed && mediaMap[nsEmbed]) foundImages.push({ id: nsEmbed, w: currentWidth, h: currentHeight });
          if (nsId && mediaMap[nsId]) foundImages.push({ id: nsId, w: currentWidth, h: currentHeight });
        }
      }

      if (foundImages.length === 0 && node.outerHTML) {
        const matches = node.outerHTML.match(/(?:embed|id|src)=["']([^"']+)["']/gi);
        if (matches) {
          for (let m of matches) {
            const val = m.replace(/^(?:embed|id|src)=["']/i, '').replace(/["']$/, '');
            if (mediaMap[val]) foundImages.push({ id: val, w: currentWidth, h: currentHeight });
          }
        }
      }

      const seen = new Set();
      for (let img of foundImages) {
        if (seen.has(img.id)) continue;
        seen.add(img.id);
        const wAttr = img.w ? `width:${img.w};` : '';
        const hAttr = img.h ? `height:${img.h};` : '';
        html += `<img src="${mediaMap[img.id]}" style="${wAttr}${hAttr}max-width:100%;height:auto;display:inline-block;margin:3pt 0;vertical-align:middle;" alt="Image" />`;
      }
      return html;
    }

    _buildStyleResolver(stylesXmlStr) {
      const styles = {};
      const docDefaults = {
        fontFamily: 'SutonnyMJ',
        fontSizePt: 12,
        color: '000000',
        lineHeight: 1.15,
        spaceAfterPt: 0
      };

      if (!stylesXmlStr) {
        return { styles, docDefaults, resolve: () => ({}) };
      }

      const stylesDoc = this.domParser.parseFromString(stylesXmlStr, "application/xml");

      // Document Defaults
      const rPrDef = stylesDoc.querySelector("docDefaults > rPrDefault > rPr");
      if (rPrDef) {
        const sz = rPrDef.querySelector("sz");
        if (sz) {
          const v = parseInt(sz.getAttribute("w:val") || sz.getAttribute("val"), 10);
          if (v) docDefaults.fontSizePt = v / 2;
        }
        const col = rPrDef.querySelector("color");
        if (col) {
          const v = col.getAttribute("w:val") || col.getAttribute("val");
          if (v && v !== 'auto') docDefaults.color = v;
        }
        const rFonts = rPrDef.querySelector("rFonts");
        if (rFonts) {
          const ascii = rFonts.getAttribute("w:ascii") || rFonts.getAttribute("ascii");
          if (ascii) docDefaults.fontFamily = ascii;
        }
      }

      // Named Styles
      const styleNodes = stylesDoc.querySelectorAll("style");
      for (let sNode of styleNodes) {
        const styleId = sNode.getAttribute("w:styleId") || sNode.getAttribute("styleId");
        const type = sNode.getAttribute("w:type") || sNode.getAttribute("type");
        if (!styleId) continue;

        const sData = {
          styleId,
          type,
          isBold: false,
          isItalic: false,
          isUnderline: false,
          fontSizePt: null,
          color: null,
          fontFamily: null,
          align: null,
          spaceBeforePt: null,
          spaceAfterPt: null,
          lineHeight: null
        };

        const rPr = sNode.querySelector("rPr");
        if (rPr) {
          if (rPr.querySelector("b")) sData.isBold = true;
          if (rPr.querySelector("i")) sData.isItalic = true;
          if (rPr.querySelector("u")) sData.isUnderline = true;

          const sz = rPr.querySelector("sz");
          if (sz) {
            const v = parseInt(sz.getAttribute("w:val") || sz.getAttribute("val"), 10);
            if (v) sData.fontSizePt = v / 2;
          }

          const col = rPr.querySelector("color");
          if (col) {
            const v = col.getAttribute("w:val") || col.getAttribute("val");
            const themeCol = col.getAttribute("w:themeColor") || col.getAttribute("themeColor");
            if (v && v !== 'auto') {
              sData.color = v;
            } else if (themeCol && THEME_COLORS[themeCol]) {
              sData.color = THEME_COLORS[themeCol];
            }
          }

          const rFonts = rPr.querySelector("rFonts");
          if (rFonts) {
            sData.fontFamily = rFonts.getAttribute("w:ascii") || rFonts.getAttribute("ascii") || rFonts.getAttribute("w:cs");
          }
        }

        const pPr = sNode.querySelector("pPr");
        if (pPr) {
          const jc = pPr.querySelector("jc");
          if (jc) {
            const val = jc.getAttribute("w:val") || jc.getAttribute("val");
            if (val === 'center') sData.align = 'center';
            else if (val === 'right') sData.align = 'right';
            else if (val === 'both' || val === 'justify') sData.align = 'justify';
            else if (val === 'left') sData.align = 'left';
          }

          const spacing = pPr.querySelector("spacing");
          if (spacing) {
            const before = spacing.getAttribute("w:before") || spacing.getAttribute("before");
            const after = spacing.getAttribute("w:after") || spacing.getAttribute("after");
            const line = spacing.getAttribute("w:line") || spacing.getAttribute("line");
            if (before) sData.spaceBeforePt = parseInt(before, 10) / 20;
            if (after) sData.spaceAfterPt = parseInt(after, 10) / 20;
            if (line) sData.lineHeight = parseInt(line, 10) / 240;
          }
        }

        styles[styleId] = sData;
      }

      return {
        styles,
        docDefaults,
        resolve: (styleId) => styles[styleId] || null
      };
    }

    _parseDocumentBody(docXml, styleResolver, mediaMap, opts) {
      const body = docXml ? (docXml.querySelector("body") || docXml.documentElement) : null;
      let sections = [];
      let currentSectionHtml = [];
      let previewLines = [];
      let stats = { paragraphs: 0, tables: 0, runs: 0 };

      // Find the final body sectPr (direct child or document end)
      let bodyEndSectPr = null;
      if (body) {
        const bodyChildren = body.childNodes;
        for (let i = bodyChildren.length - 1; i >= 0; i--) {
          const c = bodyChildren[i];
          if (c.nodeType === 1 && (c.localName === 'sectPr' || c.nodeName.split(':').pop() === 'sectPr')) {
            bodyEndSectPr = c;
            break;
          }
        }
      }

      const children = body ? body.childNodes : [];
      for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.nodeType !== 1) continue;

        const nodeName = node.localName || node.nodeName.split(':').pop();

        if (nodeName === 'p') {
          const pData = this._parseParagraph(node, styleResolver, mediaMap, opts);
          currentSectionHtml.push(pData.html);
          stats.paragraphs++;
          stats.runs += pData.runCount;
          if (pData.text && previewLines.length < 20) {
            previewLines.push(pData.text);
          }

          // Check if paragraph ends with a section break (<w:pPr><w:sectPr>)
          let pSectPr = null;
          const pPr = node.querySelector("pPr") || Array.from(node.childNodes).find(c => c.nodeType === 1 && (c.localName === 'pPr' || c.nodeName.split(':').pop() === 'pPr'));
          if (pPr) {
            pSectPr = pPr.querySelector("sectPr") || Array.from(pPr.childNodes).find(c => c.nodeType === 1 && (c.localName === 'sectPr' || c.nodeName.split(':').pop() === 'sectPr'));
          }

          if (pSectPr) {
            const secSettings = this._parseSectionProperties(pSectPr, opts);
            sections.push({
              html: currentSectionHtml.join('\n'),
              pageSettings: secSettings
            });
            currentSectionHtml = [];
          }
        } else if (nodeName === 'tbl') {
          const tblData = this._parseTable(node, styleResolver, mediaMap, opts);
          currentSectionHtml.push(tblData.html);
          stats.tables++;
          stats.paragraphs += tblData.stats.paragraphs;
          stats.runs += tblData.stats.runs;
        }
      }

      // Add the final section (or default single section)
      const finalSecSettings = this._parseSectionProperties(bodyEndSectPr, opts);
      sections.push({
        html: currentSectionHtml.join('\n'),
        pageSettings: finalSecSettings
      });

      // Backward compatibility: default pageSettings pointing to last/main section
      const mainPageSettings = sections[sections.length - 1].pageSettings;

      return {
        bodyHtml: sections.map(s => s.html).join('\n'),
        sections: sections,
        pageSettings: mainPageSettings,
        preview: previewLines,
        stats: stats
      };
    }

    _parseSectionProperties(sectPr, opts) {
      let width = "8.27in";  // A4 default
      let height = "11.69in";
      let marginTop = "0.6in"; // Optimized for question papers
      let marginBottom = "0.6in";
      let marginLeft = "0.6in";
      let marginRight = "0.6in";
      let cols = 1;
      let colSpace = "0.2in";

      if (opts.pageSize === 'legal') {
        width = "8.5in";
        height = "14in";
      } else if (opts.pageSize === 'letter') {
        width = "8.5in";
        height = "11in";
      }

      const MARGIN_MAP = {
        'normal': { top: '1.0in', right: '1.0in', bottom: '1.0in', left: '1.0in' },
        'narrow': { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
        'moderate': { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
        'wide': { top: '1.25in', right: '1.25in', bottom: '1.25in', left: '1.25in' }
      };

      const selectedMargin = opts.margin || opts.pageMargin;
      if (selectedMargin && MARGIN_MAP[selectedMargin]) {
        marginTop = MARGIN_MAP[selectedMargin].top;
        marginRight = MARGIN_MAP[selectedMargin].right;
        marginBottom = MARGIN_MAP[selectedMargin].bottom;
        marginLeft = MARGIN_MAP[selectedMargin].left;
      }

      if (sectPr) {
        const pgSz = sectPr.querySelector("pgSz");
        if (pgSz) {
          const wTwips = parseInt(pgSz.getAttribute("w:w") || pgSz.getAttribute("w"), 10);
          const hTwips = parseInt(pgSz.getAttribute("w:h") || pgSz.getAttribute("h"), 10);
          if (wTwips) width = (wTwips / 1440).toFixed(2) + "in";
          if (hTwips) height = (hTwips / 1440).toFixed(2) + "in";
        }

        // Section Margins from master docx
        const pgMar = sectPr.querySelector("pgMar");
        if (pgMar) {
          const topTwips = parseInt(pgMar.getAttribute("w:top") || pgMar.getAttribute("top"), 10);
          const bottomTwips = parseInt(pgMar.getAttribute("w:bottom") || pgMar.getAttribute("bottom"), 10);
          const leftTwips = parseInt(pgMar.getAttribute("w:left") || pgMar.getAttribute("left"), 10);
          const rightTwips = parseInt(pgMar.getAttribute("w:right") || pgMar.getAttribute("right"), 10);

          if (topTwips) marginTop = (topTwips / 1440).toFixed(2) + "in";
          if (bottomTwips) marginBottom = (bottomTwips / 1440).toFixed(2) + "in";
          if (leftTwips) marginLeft = (leftTwips / 1440).toFixed(2) + "in";
          if (rightTwips) marginRight = (rightTwips / 1440).toFixed(2) + "in";
        } else if (selectedMargin && MARGIN_MAP[selectedMargin]) {
          marginTop = MARGIN_MAP[selectedMargin].top;
          marginRight = MARGIN_MAP[selectedMargin].right;
          marginBottom = MARGIN_MAP[selectedMargin].bottom;
          marginLeft = MARGIN_MAP[selectedMargin].left;
        }

        const colsEl = sectPr.querySelector("cols");
        if (colsEl) {
          cols = parseInt(colsEl.getAttribute("w:num") || colsEl.getAttribute("num") || "1", 10);
          const spaceTwips = parseInt(colsEl.getAttribute("w:space") || colsEl.getAttribute("space"), 10);
          if (spaceTwips) {
            colSpace = (spaceTwips / 1440).toFixed(2) + "in";
          }
        }
      }

      return {
        width,
        height,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        cols,
        colSpace
      };
    }

    _parseParagraph(pNode, styleResolver, mediaMap, opts) {
      let pStyles = [];
      let align = 'left';
      let runCount = 0;
      let textContent = "";
      let inheritedStyle = null;

      const pPr = pNode.querySelector("pPr");
      if (pPr) {
        const pStyleNode = pPr.querySelector("pStyle");
        if (pStyleNode) {
          const sId = pStyleNode.getAttribute("w:val") || pStyleNode.getAttribute("val");
          inheritedStyle = styleResolver.resolve(sId);
          if (inheritedStyle) {
            if (inheritedStyle.align) align = inheritedStyle.align;
            if (inheritedStyle.spaceBeforePt !== null) pStyles.push(`margin-top:${inheritedStyle.spaceBeforePt}pt`);
            if (inheritedStyle.spaceAfterPt !== null) pStyles.push(`margin-bottom:${inheritedStyle.spaceAfterPt}pt`);
            if (inheritedStyle.lineHeight !== null) pStyles.push(`line-height:${inheritedStyle.lineHeight}`);
          }
        }

        const jc = pPr.querySelector("jc");
        if (jc) {
          const val = jc.getAttribute("w:val") || jc.getAttribute("val");
          if (val === 'center') align = 'center';
          else if (val === 'right') align = 'right';
          else if (val === 'both' || val === 'justify') align = 'justify';
          else if (val === 'left') align = 'left';
        }

        const spacing = pPr.querySelector("spacing");
        if (spacing) {
          const before = spacing.getAttribute("w:before") || spacing.getAttribute("before");
          const after = spacing.getAttribute("w:after") || spacing.getAttribute("after");
          const line = spacing.getAttribute("w:line") || spacing.getAttribute("line");

          if (before) pStyles.push(`margin-top:${(parseInt(before, 10)/20).toFixed(1)}pt`);
          if (after) pStyles.push(`margin-bottom:${(parseInt(after, 10)/20).toFixed(1)}pt`);
          if (line) pStyles.push(`line-height:${(parseInt(line, 10)/240).toFixed(2)}`);
        }

        const ind = pPr.querySelector("ind");
        if (ind) {
          const left = ind.getAttribute("w:left") || ind.getAttribute("left");
          const right = ind.getAttribute("w:right") || ind.getAttribute("right");
          const firstLine = ind.getAttribute("w:firstLine") || ind.getAttribute("firstLine");
          const hanging = ind.getAttribute("w:hanging") || ind.getAttribute("hanging");

          if (left) pStyles.push(`margin-left:${(parseInt(left, 10)/20).toFixed(1)}pt`);
          if (right) pStyles.push(`margin-right:${(parseInt(right, 10)/20).toFixed(1)}pt`);
          if (firstLine) {
            pStyles.push(`text-indent:${(parseInt(firstLine, 10)/20).toFixed(1)}pt`);
          } else if (hanging) {
            // Negative indent for Word hanging indents (e.g. question numbers)
            pStyles.push(`text-indent:-${(parseInt(hanging, 10)/20).toFixed(1)}pt`);
          }
        }

        // Parse tab stops (w:tabs > w:tab)
        const tabsEl = pPr.querySelector("tabs") || pPr.querySelector("*|tabs");
        if (tabsEl) {
          const tabNodes = tabsEl.querySelectorAll("tab, *|tab");
          const tabStops = [];
          for (let tn of tabNodes) {
            const pos = tn.getAttribute("w:pos") || tn.getAttribute("pos");
            const val = tn.getAttribute("w:val") || tn.getAttribute("val") || "left";
            if (pos) {
              const ptVal = (parseInt(pos, 10)/20).toFixed(1) + "pt";
              if (val === 'left' || val === 'clear') {
                tabStops.push(ptVal);
              } else {
                tabStops.push(`${val} ${ptVal}`);
              }
            }
          }
          if (tabStops.length > 0) {
            pStyles.push(`mso-tab-stops:${tabStops.join(' ')}`);
          }
        }
      }

      if (align !== 'left') {
        pStyles.push(`text-align:${align}`);
      }

      let runsHtml = [];
      const childNodes = pNode.childNodes;
      let inField = false;
      let fieldCode = "";

      for (let i = 0; i < childNodes.length; i++) {
        const child = childNodes[i];
        if (child.nodeType !== 1) continue;

        const childName = child.localName || child.nodeName.split(':').pop();

        if (childName === 'tab') {
          runsHtml.push('<span style="mso-tab-count:1">\t</span>');
          textContent += "\t";
          runCount++;
          continue;
        }

        if (childName === 'r') {
          const fldCharNode = child.querySelector("fldChar");
          const instrTextNode = child.querySelector("instrText");

          if (fldCharNode) {
            const type = fldCharNode.getAttribute("w:fldCharType") || fldCharNode.getAttribute("fldCharType");
            if (type === "begin") {
              inField = true;
              fieldCode = "";
              continue;
            } else if (type === "end") {
              if (inField) {
                const rawEq = fieldCode.trim();
                const cleanEq = rawEq.startsWith('EQ ') ? rawEq.slice(3).trim() : rawEq;

                let formattedEq = "";
                if (typeof EquationConverter !== 'undefined' && typeof EquationConverter.formatEqCodeToWordHtml === 'function') {
                  formattedEq = EquationConverter.formatEqCodeToWordHtml(cleanEq, 12, true);
                } else {
                  formattedEq = this._escapeHtml(cleanEq);
                }

                // ── Smart equation rendering ──────────────────────────────────
                // EQ field code-এ Unicode থাকলে (∩, ∪, ∅, ^c ইত্যাদি) Word "Error!" দেখায়।
                // তাই:
                // ১. cleanEq-এ EQ switch (\\F, \\R, \\I) আছে কিনা দেখো → তাহলে EQ field ব্যবহার করো
                // ২. অন্যথায় → সরাসরি HTML span রেন্ডার করো (সব সময় সঠিক)

                const hasEqSwitches = /\\[FRISBXUA]\b/.test(cleanEq);
                let fieldHtml;

                if (hasEqSwitches) {
                  // Complex EQ (fraction, radical etc.) → 5-part Word HTML EQ field
                  // cleanEq must be ASCII-safe EQ instruction
                  fieldHtml =
                    `<span style="font-family:'Times New Roman',serif;font-size:12pt;">` +
                    `<!--[if supportFields]>` +
                      `<span style='mso-element:field-begin'></span>` +
                      ` EQ ${cleanEq} ` +
                      `<span style='mso-element:field-separator'></span>` +
                    `<![endif]-->` +
                    `<span style="font-style:italic;">${formattedEq}</span>` +
                    `<!--[if supportFields]>` +
                      `<span style='mso-element:field-end'></span>` +
                    `<![endif]-->` +
                    `</span>`;
                } else {
                  // Simple symbols, Unicode math, superscripts → direct HTML span
                  // এটি সর্বদা সঠিকভাবে render করে, "Error!" হওয়ার কোনো সুযোগ নেই
                  fieldHtml =
                    `<span style="font-family:'Times New Roman',serif;font-size:12pt;font-style:italic;">` +
                    `${formattedEq}` +
                    `</span>`;
                }


                runsHtml.push(fieldHtml);
                inField = false;
                fieldCode = "";
                runCount++;
                continue;
              }
            } else if (type === "separate") {
              continue;
            }
          }

          if (inField) {
            if (instrTextNode) {
              fieldCode += instrTextNode.textContent || "";
            } else {
              fieldCode += child.textContent || "";
            }
            continue;
          }

          const rData = this._parseRun(child, inheritedStyle, styleResolver, mediaMap, opts);
          runsHtml.push(rData.html);
          textContent += rData.text;
          runCount++;
        } else if (childName === 'hyperlink') {
          const rList = child.querySelectorAll("r");
          for (let r of rList) {
            const rData = this._parseRun(r, inheritedStyle, styleResolver, mediaMap, opts);
            runsHtml.push(rData.html);
            textContent += rData.text;
            runCount++;
          }
        } else if (childName === 'oMath' || childName === 'oMathPara') {
          // ============================================================
          // OMML (Office Math Markup Language) → Word HTML EQ field
          // DocxLayoutBuilder generates <m:oMath> for equations.
          // Convert to Word-compatible EQ field HTML for .doc output.
          // ============================================================
          let mathHtml = '';
          try {
            if (typeof EquationConverter !== 'undefined' && typeof EquationConverter.ommlNodeToEqHtml === 'function') {
              // Preferred: use EquationConverter's OMML-to-EQ converter
              mathHtml = EquationConverter.ommlNodeToEqHtml(child, 12, true);
            } else if (typeof EquationConverter !== 'undefined' && typeof EquationConverter.ommlToOpenXmlRuns === 'function') {
              // Fallback: extract readable math text from OMML node
              const mathText = (child.textContent || '').replace(/\s+/g, ' ').trim();
              if (mathText) {
                mathHtml = `<span style="font-family:'Times New Roman',serif;font-style:italic;">${this._escapeHtml(mathText)}</span>`;
              }
            } else {
              // Last resort: plain text extraction
              const mathText = (child.textContent || '').replace(/\s+/g, ' ').trim();
              if (mathText) {
                mathHtml = `<span style="font-family:'Times New Roman',serif;font-style:italic;">${this._escapeHtml(mathText)}</span>`;
              }
            }
          } catch (e) {
            const mathText = (child.textContent || '').replace(/\s+/g, ' ').trim();
            if (mathText) {
              mathHtml = `<span style="font-family:'Times New Roman',serif;font-style:italic;">${this._escapeHtml(mathText)}</span>`;
            }
          }
          if (mathHtml) {
            runsHtml.push(mathHtml);
            runCount++;
          }
        } else if (childName === 'drawing' || childName === 'pict' || childName === 'shape') {
          // Parse VML Textboxes
          const txbxContent = child.querySelector('txbxContent, *|txbxContent');
          if (txbxContent) {
            let innerHtml = '';
            const txbxChildren = txbxContent.childNodes;
            for (let j = 0; j < txbxChildren.length; j++) {
              const cn = txbxChildren[j];
              if (cn.nodeType !== 1) continue;
              const localName = cn.localName || cn.nodeName.split(':').pop();
              if (localName === 'p') {
                const pData = this._parseParagraph(cn, styleResolver, mediaMap, opts);
                innerHtml += pData.html + '\n';
              } else if (localName === 'tbl') {
                const tData = this._parseTable(cn, styleResolver, mediaMap, opts);
                innerHtml += tData.html + '\n';
              }
            }

            const shapeNode = child.querySelector('shape, *|shape');
            const shapetypeNode = child.querySelector('shapetype, *|shapetype');
            
            let vmlHtml = '<!--[if gte vml 1]>';
            if (shapetypeNode) {
               vmlHtml += shapetypeNode.outerHTML;
            }
            if (shapeNode) {
               let shapeOuter = shapeNode.outerHTML;
               // Word HTML expects standard HTML inside <v:textbox> instead of Word XML
               shapeOuter = shapeOuter.replace(/(<v:textbox[^>]*>).*?(<\/v:textbox>)/is, `$1\n<table cellpadding=0 cellspacing=0 width="100%"><tr><td>${innerHtml}</td></tr></table>\n$2`);
               vmlHtml += shapeOuter;
            }
            vmlHtml += '<![endif]-->';
            
            runsHtml.push(vmlHtml);
            runCount++;
          }

          const imgs = this._extractImagesFromNode(child, mediaMap);
          if (imgs) {
            runsHtml.push(imgs);
            runCount++;
          }
        }
      }

      // If empty paragraph, keep spacing
      if (runsHtml.length === 0) {
        runsHtml.push('&nbsp;');
      }

      const styleAttr = pStyles.length > 0 ? ` style="${pStyles.join(';')}"` : '';
      const html = `<p class="MsoNormal"${styleAttr}>${runsHtml.join('')}</p>`;

      return {
        html: html,
        text: textContent.trim(),
        runCount: runCount
      };
    }

    _parseRun(rNode, inheritedPStyle, styleResolver, mediaMap, opts) {
      let rStyles = [];
      
      // Start with Style Hierarchy: Doc Defaults -> Paragraph Style -> Run Style -> Direct Run Formatting
      let isBold = inheritedPStyle ? inheritedPStyle.isBold : false;
      let isItalic = inheritedPStyle ? inheritedPStyle.isItalic : false;
      let isUnderline = inheritedPStyle ? inheritedPStyle.isUnderline : false;
      let fontSizePt = inheritedPStyle ? inheritedPStyle.fontSizePt : (styleResolver.docDefaults.fontSizePt || 12);
      let colorHex = inheritedPStyle ? inheritedPStyle.color : (styleResolver.docDefaults.color || null);
      let fontFamily = inheritedPStyle ? (inheritedPStyle.fontFamily || 'SutonnyMJ') : 'SutonnyMJ';
      let bgColor = null;

      const rPr = rNode.querySelector("rPr");
      if (rPr) {
        // Run Style inheritance
        const rStyleNode = rPr.querySelector("rStyle");
        if (rStyleNode) {
          const rStyleId = rStyleNode.getAttribute("w:val") || rStyleNode.getAttribute("val");
          const rStyle = styleResolver.resolve(rStyleId);
          if (rStyle) {
            if (rStyle.isBold) isBold = true;
            if (rStyle.isItalic) isItalic = true;
            if (rStyle.isUnderline) isUnderline = true;
            if (rStyle.fontSizePt) fontSizePt = rStyle.fontSizePt;
            if (rStyle.color) colorHex = rStyle.color;
            if (rStyle.fontFamily) fontFamily = rStyle.fontFamily;
          }
        }

        // Direct Formatting overrides
        const b = rPr.querySelector("b");
        if (b) {
          const val = b.getAttribute("w:val") || b.getAttribute("val");
          isBold = (val !== '0' && val !== 'false');
        }

        const it = rPr.querySelector("i");
        if (it) {
          const val = it.getAttribute("w:val") || it.getAttribute("val");
          isItalic = (val !== '0' && val !== 'false');
        }

        const u = rPr.querySelector("u");
        if (u) {
          const val = u.getAttribute("w:val") || u.getAttribute("val");
          isUnderline = (val && val !== 'none');
        }

        const sz = rPr.querySelector("sz, szCs");
        if (sz) {
          const halfPoints = parseInt(sz.getAttribute("w:val") || sz.getAttribute("val"), 10);
          if (halfPoints) {
            fontSizePt = halfPoints / 2;
          }
        }

        const color = rPr.querySelector("color");
        if (color) {
          const colVal = color.getAttribute("w:val") || color.getAttribute("val");
          const themeCol = color.getAttribute("w:themeColor") || color.getAttribute("themeColor");
          if (colVal && colVal !== 'auto') {
            colorHex = colVal;
          } else if (themeCol && THEME_COLORS[themeCol]) {
            colorHex = THEME_COLORS[themeCol];
          }
        }

        const rFonts = rPr.querySelector("rFonts");
        if (rFonts) {
          const ascii = rFonts.getAttribute("w:ascii") || rFonts.getAttribute("ascii");
          const cs = rFonts.getAttribute("w:cs") || rFonts.getAttribute("cs");
          const hAnsi = rFonts.getAttribute("w:hAnsi") || rFonts.getAttribute("hAnsi");
          fontFamily = ascii || cs || hAnsi || fontFamily;
        }

        const highlight = rPr.querySelector("highlight");
        if (highlight) {
          const hlVal = highlight.getAttribute("w:val") || highlight.getAttribute("val");
          if (hlVal && hlVal !== 'none') bgColor = hlVal;
        }

        const shd = rPr.querySelector("shd");
        if (shd) {
          const fill = shd.getAttribute("w:fill") || shd.getAttribute("fill");
          if (fill && fill !== 'auto' && fill !== 'none') bgColor = `#${fill}`;
        }
      }

      // Format Specifications for Word 2003
      if (fontSizePt) {
        rStyles.push(`font-size:${fontSizePt}pt`);
        rStyles.push(`mso-bidi-font-size:${fontSizePt}pt`);
        rStyles.push(`mso-font-size:${fontSizePt}pt`);
      }

      if (colorHex) {
        const safeHex = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
        rStyles.push(`color:${safeHex}`);
        rStyles.push(`mso-color:${safeHex}`);
      }

      if (bgColor) {
        rStyles.push(`background-color:${bgColor}`);
        rStyles.push(`mso-highlight:${bgColor}`);
      }

      // Extract Text Content
      let textContent = "";
      let htmlContent = "";
      const textNodes = rNode.querySelectorAll("t, tab, br");

      for (let t of textNodes) {
        const tName = t.localName || t.nodeName.split(':').pop();
        if (tName === 't') {
          const rawT = t.textContent || "";
          textContent += rawT;
          const escT = this._escapeHtml(rawT);
          htmlContent += this._renderMsoSpaces(escT);
        } else if (tName === 'tab') {
          textContent += "\t";
          htmlContent += '___MSO_TAB_SEP___';
        } else if (tName === 'br') {
          textContent += "\n";
          htmlContent += '<br/>\n';
        }
      }

      // Ensure SutonnyMJ / Bijoy font family is preserved with full fidelity for Word 2003 (.doc)
      if (!fontFamily) {
        fontFamily = opts.direction === 'all_unicode' ? 'Nikosh' : (opts.preserveSutonny ? 'SutonnyMJ' : 'Times New Roman');
      }

      // Check if run is SutonnyMJ/Bijoy vs English/Math/Unicode
      const isEnglishFont = fontFamily && /times|calibri|arial|verdana|courier|georgia|cambria/i.test(fontFamily);
      const isSutonnyFont = fontFamily && (fontFamily.includes('Sutonny') || fontFamily.includes('Bijoy') || fontFamily.includes('Bangla'));
      const isSutonnyRun = (opts.direction === 'all_bijoy' && !isEnglishFont) || isSutonnyFont;

      const effectiveAsciiFont = isSutonnyRun ? 'SutonnyMJ' : (fontFamily || 'Times New Roman');
      const effectiveBidiFont = isSutonnyRun ? 'SutonnyMJ' : (fontFamily || 'Kalpurush');

      // Check for Drawings / Images inside Run (both DrawingML and VML)
      const imagesHtml = this._extractImagesFromNode(rNode, mediaMap);

      // Check if SutonnyMJ run contains hyphens/dashes or % - if so, isolate them to Times New Roman
      if (isSutonnyRun && /[-–—−‒―%]/.test(textContent) && !/\t/.test(textContent)) {
        const dParts = textContent.split(/([-–—−‒―%]+)/);
        let splitHtml = imagesHtml;
        for (let dp of dParts) {
          if (!dp) continue;
          const isSymbol = /[-–—−‒―%]/.test(dp);
          const fAscii = isSymbol ? 'Times New Roman' : 'SutonnyMJ';
          const fBidi = isSymbol ? 'Times New Roman' : 'SutonnyMJ';
          const partStyles = [
            `font-family:'${fAscii}',Arial,sans-serif`,
            `mso-ascii-font-family:'${fAscii}'`,
            `mso-hansi-font-family:'${fAscii}'`,
            `mso-bidi-font-family:'${fBidi}'`
          ];
          if (isBold) partStyles.push(`font-weight:bold;mso-bidi-font-weight:bold`);
          if (isItalic) partStyles.push(`font-style:italic;mso-bidi-font-style:italic`);
          if (isUnderline) partStyles.push(`text-decoration:underline`);
          const escDp = this._escapeHtml(dp);
          const fmtDp = this._renderMsoSpaces(escDp);
          if (isSymbol) {
            splitHtml += `<span lang="EN-US" style="${partStyles.join(';')}">${fmtDp}</span>`;
          } else {
            splitHtml += `<span style="${partStyles.join(';')}">${fmtDp}</span>`;
          }
        }
        return {
          html: splitHtml,
          text: textContent
        };
      }

      // Font family declarations with proper dual-font binding
      rStyles.push(`font-family:'${effectiveAsciiFont}',Arial,sans-serif`);
      rStyles.push(`mso-ascii-font-family:'${effectiveAsciiFont}'`);
      rStyles.push(`mso-hansi-font-family:'${effectiveAsciiFont}'`);
      rStyles.push(`mso-bidi-font-family:'${effectiveBidiFont}'`);

      if (isBold) rStyles.push(`font-weight:bold;mso-bidi-font-weight:bold`);
      if (isItalic) rStyles.push(`font-style:italic;mso-bidi-font-style:italic`);
      if (isUnderline) rStyles.push(`text-decoration:underline`);

      const styleAttr = rStyles.length > 0 ? ` style="${rStyles.join(';')}"` : '';
      let html = imagesHtml;

      if (htmlContent.includes('___MSO_TAB_SEP___')) {
        const parts = htmlContent.split('___MSO_TAB_SEP___');
        for (let pi = 0; pi < parts.length; pi++) {
          if (pi > 0) {
            html += '<span style="mso-tab-count:1">\t</span>';
          }
          if (parts[pi]) {
            html += `<span${styleAttr}>${parts[pi]}</span>`;
          }
        }
      } else {
        html += `<span${styleAttr}>${htmlContent}</span>`;
      }

      return {
        html: html,
        text: textContent
      };
    }

    _parseTable(tblNode, styleResolver, mediaMap, opts) {
      const tblPr = tblNode.querySelector("tblPr");
      let hasBorders = false;
      if (tblPr) {
        const tblBorders = tblPr.querySelector("tblBorders");
        if (tblBorders) {
          const borders = tblBorders.querySelectorAll("top, left, bottom, right, insideH, insideV");
          for (let b of Array.from(borders)) {
            const val = b.getAttribute("w:val") || b.getAttribute("val");
            if (val && val !== 'none' && val !== 'nil') {
              hasBorders = true;
              break;
            }
          }
        }
        const tblStyle = tblPr.querySelector("tblStyle");
        if (tblStyle) {
          const styleVal = (tblStyle.getAttribute("w:val") || tblStyle.getAttribute("val") || '').toLowerCase();
          if (styleVal.includes('grid') || styleVal.includes('tablegrid') || styleVal.includes('border')) {
            hasBorders = true;
          }
        }
      }

      let tblStyles = [
        'border-collapse:collapse',
        'mso-table-layout-alt:fixed',
        hasBorders ? 'border:solid windowtext 1.0pt' : 'border:none',
        hasBorders ? 'mso-border-alt:solid windowtext .5pt' : 'mso-border-alt:none',
        'mso-padding-alt:0in 5.4pt 0in 5.4pt',
        'width:100%'
      ];

      let stats = { paragraphs: 0, runs: 0 };
      let rowsHtml = [];

      const rows = tblNode.querySelectorAll(":scope > tr, :scope > tblRow, tr");
      for (let r = 0; r < rows.length; r++) {
        const trNode = rows[r];
        let cellsHtml = [];

        const cells = trNode.querySelectorAll(":scope > tc, :scope > tblCell, tc");
        for (let c = 0; c < cells.length; c++) {
          const tcNode = cells[c];
          let tcStyles = [
            'padding:3.5pt 5.5pt',
            hasBorders ? 'border:solid windowtext 1.0pt' : 'border:none',
            hasBorders ? 'mso-border-alt:solid windowtext .5pt' : 'mso-border-alt:none',
            'vertical-align:top'
          ];
          let colSpanAttr = '';
          let rowSpanAttr = '';

          // Parse cell properties
          const tcPr = tcNode.querySelector("tcPr");
          if (tcPr) {
            const shd = tcPr.querySelector("shd");
            if (shd) {
              const fill = shd.getAttribute("w:fill") || shd.getAttribute("fill");
              if (fill && fill !== 'auto' && fill !== 'none') {
                tcStyles.push(`background-color:#${fill}`);
                tcStyles.push(`mso-shading:#${fill}`);
              }
            }

            const tcW = tcPr.querySelector("tcW");
            if (tcW) {
              const w = tcW.getAttribute("w:w") || tcW.getAttribute("w");
              if (w && parseInt(w, 10) > 0) {
                tcStyles.push(`width:${(parseInt(w, 10)/20).toFixed(1)}pt`);
              }
            }

            const vAlign = tcPr.querySelector("vAlign");
            if (vAlign) {
              const va = vAlign.getAttribute("w:val") || vAlign.getAttribute("val");
              if (va === 'center') tcStyles.push('vertical-align:middle');
              else if (va === 'bottom') tcStyles.push('vertical-align:bottom');
            }

            const gridSpan = tcPr.querySelector("gridSpan");
            if (gridSpan) {
              const spanVal = gridSpan.getAttribute("w:val") || gridSpan.getAttribute("val");
              if (spanVal && parseInt(spanVal, 10) > 1) {
                colSpanAttr = ` colspan="${spanVal}"`;
              }
            }
          }

          // Parse cell paragraphs
          let pList = tcNode.querySelectorAll("p");
          let cellInnerHtml = [];

          for (let p of pList) {
            const pData = this._parseParagraph(p, styleResolver, mediaMap, opts);
            cellInnerHtml.push(pData.html);
            stats.paragraphs++;
            stats.runs += pData.runCount;
          }

          if (cellInnerHtml.length === 0) {
            const cellImgs = this._extractImagesFromNode(tcNode, mediaMap);
            if (cellImgs) {
              cellInnerHtml.push(`<p class="MsoNormal">${cellImgs}</p>`);
            } else {
              cellInnerHtml.push('<p class="MsoNormal">&nbsp;</p>');
            }
          }

          cellsHtml.push(`<td${colSpanAttr}${rowSpanAttr} style="${tcStyles.join(';')}">${cellInnerHtml.join('')}</td>`);
        }

        rowsHtml.push(`<tr>${cellsHtml.join('')}</tr>`);
      }

      const html = `<table class="MsoNormalTable" style="${tblStyles.join(';')}">${rowsHtml.join('\n')}</table>`;

      return {
        html: html,
        stats: stats
      };
    }

    _buildWord2003Document(parsedBody, opts) {
      const sections = (parsedBody.sections && parsedBody.sections.length > 0)
        ? parsedBody.sections
        : [{ html: parsedBody.bodyHtml, pageSettings: parsedBody.pageSettings }];

      // Generate CSS @page Section1, Section2 ... and div.Section1, div.Section2 ...
      let pageStylesCss = '';
      let bodyDivsHtml = '';

      sections.forEach((sec, idx) => {
        const secIndex = idx + 1;
        const page = sec.pageSettings;
        const colsCss = page.cols >= 2
          ? `\tmso-columns:${page.cols} even ${page.colSpace || '0.2in'};\n\tmso-column-separator:solid;\n`
          : '';

        pageStylesCss += ` @page Section${secIndex}
\t{size:${page.width} ${page.height};
\tmargin:${page.marginTop} ${page.marginRight} ${page.marginBottom} ${page.marginLeft};
\tmso-header-margin:.5in;
\tmso-footer-margin:.5in;
${colsCss}\tmso-paper-source:0;}
 div.Section${secIndex}
\t{page:Section${secIndex};}\n`;

        const sectionBreak = (idx === 0)
          ? ''
          : `<br clear=all style='page-break-before:auto;mso-break-type:section-break'>\n`;

        bodyDivsHtml += `${sectionBreak}<div class="Section${secIndex}">\n${sec.html}\n</div>\n`;
      });

      return `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 11">
<meta name="Originator" content="Microsoft Word 11">
<!--[if gte mso 9]>
<xml>
 <o:DocumentProperties>
  <o:Author>Fayzar Computer</o:Author>
  <o:LastAuthor>Fayzar Computer</o:LastAuthor>
  <o:Revision>1</o:Revision>
  <o:TotalTime>1</o:TotalTime>
  <o:Created>${new Date().toISOString()}</o:Created>
  <o:LastSaved>${new Date().toISOString()}</o:LastSaved>
  <o:Pages>1</o:Pages>
  <o:Words>100</o:Words>
  <o:Characters>600</o:Characters>
  <o:Company>Fayzar Computer</o:Company>
  <o:Lines>30</o:Lines>
  <o:Paragraphs>15</o:Paragraphs>
  <o:CharactersWithSpaces>750</o:CharactersWithSpaces>
  <o:Version>11.9999</o:Version>
 </o:DocumentProperties>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:SpellingState>Clean</w:SpellingState>
  <w:GrammarState>Clean</w:GrammarState>
  <w:ValidateAgainstSubstances/>
  <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
  <w:IgnoreMarketStoreErrors>false</w:IgnoreMarketStoreErrors>
  <w:Compatibility>
   <w:BreakWrappedTables/>
   <w:SnapToGridInCell/>
   <w:WrapTextWithPunct/>
   <w:UseAsianBreakRules/>
   <w:DontGrowAutofit/>
   <w:UseFELayout/>
  </w:Compatibility>
  <w:BrowserLevel>MicrosoftInternetExplorer4</w:BrowserLevel>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
<!--
 /* Font Definitions */
 @font-face
\t{font-family:SutonnyMJ;
\tpanose-1:2 11 6 4 2 2 2 2 2 4;
\tmso-font-alt:"SutonnyMJ";
\tmso-font-charset:0;
\tmso-generic-font-family:auto;
\tmso-font-pitch:variable;
\tmso-font-signature:3 0 0 0 1 0;}
 @font-face
\t{font-family:SutonnyOMJ;
\tpanose-1:2 11 6 4 2 2 2 2 2 4;
\tmso-font-alt:"SutonnyOMJ";
\tmso-font-charset:0;
\tmso-generic-font-family:auto;
\tmso-font-pitch:variable;
\tmso-font-signature:3 0 0 0 1 0;}
 @font-face
\t{font-family:Kalpurush;
\tpanose-1:2 11 6 4 2 2 2 2 2 4;
\tmso-font-alt:"Kalpurush";
\tmso-font-charset:0;
\tmso-generic-font-family:auto;
\tmso-font-pitch:variable;
\tmso-font-signature:3 0 0 0 1 0;}
 @font-face
\t{font-family:"Times New Roman";
\tpanose-1:2 2 6 3 5 4 5 2 3 4;
\tmso-font-charset:0;
\tmso-generic-font-family:roman;
\tmso-font-pitch:variable;
\tmso-font-signature:-536870145 1107305727 0 0 415 0;}

 /* Style Definitions */
 p.MsoNormal, li.MsoNormal, div.MsoNormal
\t{mso-style-parent:"";
\tmargin:0in;
\tmargin-bottom:.0001pt;
\tmso-pagination:widow-orphan;
\tfont-size:12.0pt;
\tfont-family:"SutonnyMJ",Arial,sans-serif;
\tmso-ascii-font-family:"Times New Roman";
\tmso-hansi-font-family:"Times New Roman";
\tmso-fareast-font-family:"Times New Roman";
\tmso-bidi-font-family:"SutonnyMJ";}
 table.MsoNormalTable
\t{mso-style-name:"Table Normal";
\tmso-tstyle-rowband-size:0;
\tmso-tstyle-colband-size:0;
\tmso-style-noshow:yes;
\tmso-style-parent:"";
\tmso-padding-alt:0in 5.4pt 0in 5.4pt;
\tmso-para-margin:0in;
\tmso-para-margin-bottom:.0001pt;
\tmso-pagination:widow-orphan;
\tfont-size:10.0pt;
\tfont-family:"Times New Roman";
\tmso-ansi-language:#0400;
\tmso-fareast-language:#0400;
\tmso-bidi-language:#0400;}
${pageStylesCss}-->
</style>
</head>
<body lang="EN-US" style="tab-interval:.5in">
${bodyDivsHtml}</body>
</html>`;
    }

    _escapeHtml(text) {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    _renderMsoSpaces(str) {
      if (!str) return '';
      if (/^ +$/.test(str)) {
        return `<span style='mso-spacerun:yes'>${'&nbsp;'.repeat(str.length)}</span>`;
      }
      str = str.replace(/^( +)/, (m) => `<span style='mso-spacerun:yes'>${'&nbsp;'.repeat(m.length)}</span>`);
      str = str.replace(/( +)$/, (m) => `<span style='mso-spacerun:yes'>${'&nbsp;'.repeat(m.length)}</span>`);
      str = str.replace(/ {2,}/g, (m) => ` <span style='mso-spacerun:yes'>${'&nbsp;'.repeat(m.length - 1)}</span>`);
      return str;
    }
  }

  const docxToDocEngine = new DocxToDocConverter();
  DocxToDocConverter.convertDocxToDoc = (docxInput, opts) => docxToDocEngine.convertDocxToDoc(docxInput, opts);

  if (typeof window !== 'undefined') {
    window.DocxToDocConverter = DocxToDocConverter;
    window.docxToDocEngine = docxToDocEngine;
  }
  if (typeof global !== 'undefined') {
    global.DocxToDocConverter = DocxToDocConverter;
    global.docxToDocEngine = docxToDocEngine;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocxToDocConverter;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
