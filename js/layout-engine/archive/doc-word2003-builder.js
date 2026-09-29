/**
 * ============================================================================
 * Fayzar Layout Engine - Microsoft Word 2003 (.doc) High-Fidelity Builder v1.0
 * ============================================================================
 * Generates genuine, beautifully styled Microsoft Word 2003 (.doc) documents
 * with exact 2-column questions, right-aligned marks, header blocks, tables,
 * and seamless SutonnyMJ (Bijoy) or Unicode font rendering.
 * 100% Compatible with Word 2003, 2007, 2010, 2013, 2016, 2019, 2021 & Office 365.
 * ============================================================================
 */

(function(global) {
  'use strict';

  class DocWord2003Builder {

    /**
     * Build Word 2003 .doc Blob from parsed AST
     * @param {Object} parsedAst - Output of MdLayoutParser.parse()
     * @param {Object} options - { font: 'SutonnyMJ' | 'Kalpurush', onProgress: Function }
     * @returns {Blob} Binary Blob with MIME 'application/msword'
     */
    static build(parsedAst, options = {}) {
      const opts = Object.assign({
        font: 'SutonnyMJ', // 'SutonnyMJ' (Bijoy) or 'Kalpurush' (Unicode)
        onProgress: (pct, msg) => {}
      }, options);

      opts.onProgress(10, 'ওয়ার্ড ২০০৩ আর্কিটেকচার প্রস্তুত হচ্ছে...');

      const meta = parsedAst.metadata || {};
      const layout = parsedAst.layoutSettings || {};
      const profile = parsedAst.profile || (parsedAst.layoutSettings && parsedAst.layoutSettings.profile);
      const docHasBengali = (typeof DocxLayoutBuilder !== 'undefined' && typeof DocxLayoutBuilder.hasBengali === 'function')
        ? DocxLayoutBuilder.hasBengali(parsedAst)
        : /[\u0980-\u09FF]/.test(JSON.stringify(parsedAst));
      const isPureEnglish = (profile && typeof profile.isPureEnglish === 'boolean')
        ? profile.isPureEnglish
        : !docHasBengali;
      const isBijoy = !isPureEnglish && opts.font === 'SutonnyMJ';
      const targetFont = isPureEnglish ? 'Times New Roman' : (isBijoy ? 'SutonnyMJ' : 'Kalpurush');

      // Helper to convert text if Bijoy selected
      const cvt = (str) => {
        if (!str) return '';
        if (isPureEnglish) return str;
        if (isBijoy) {
          // If already converted to Bijoy, do not touch or split
          if (typeof BanglaConverter !== 'undefined' && typeof BanglaConverter.isBijoyText === 'function' && BanglaConverter.isBijoyText(str)) {
            return str;
          }
          if (typeof BanglaConverter !== 'undefined' && typeof BanglaConverter.splitMixedBengaliAndEnglish === 'function') {
            const segs = BanglaConverter.splitMixedBengaliAndEnglish(String(str));
            return segs.map(seg => {
              if (seg.type === 'english') {
                return `<span style="font-family:'Times New Roman',serif;">${seg.text}</span>`;
              } else {
                return (typeof BanglaConverter.unicodeToBijoy === 'function')
                  ? BanglaConverter.unicodeToBijoy(seg.text)
                  : seg.text;
              }
            }).join('');
          }
          if (typeof BanglaConverter !== 'undefined' && typeof BanglaConverter.unicodeToBijoy === 'function') {
            return BanglaConverter.unicodeToBijoy(str);
          }
          if (typeof BanglaConverterEngine !== 'undefined' && typeof BanglaConverterEngine.convertUnicodeToBijoy === 'function') {
            return BanglaConverterEngine.convertUnicodeToBijoy(str);
          }
          return str;
        }
        return str;
      };

      opts.onProgress(30, 'হেডার, মার্জিন ও লেআউট বিন্যাস তৈরি হচ্ছে...');

      // 1. Build Header HTML
      const headerHtml = DocWord2003Builder.buildHeaderHtml(meta, layout, cvt);

      // 2. Build Native Word 2003 Sections (Combined, Standalone MCQ, CQ Booklet, or Standard)
      opts.onProgress(60, 'প্রশ্নপত্র ও কলাম কাঠামো বিন্যাস হচ্ছে...');

      const archetypeId = (layout.profile && layout.profile.archetypeId) || '';
      const totalQuestionBlocks = parsedAst.blocks.filter(b => b.type === 'question');
      const mcqQuestionBlocks = totalQuestionBlocks.filter(q => {
        if (!q.subQuestions || q.subQuestions.length === 0) return false;
        const candidateSubs = q.subQuestions.filter(s => !s.isPromptText && !/^(?:[iIvVxX]+|\([iIvVxX]+\))[\.\)]/i.test((s.subId || '').trim()));
        return candidateSubs.length >= 2 && candidateSubs.some(s => /^[ক-ঘa-d][\.\)]/i.test(s.subId || s.text || ''));
      });
      const isDominantMcq = (mcqQuestionBlocks.length >= 10) || (totalQuestionBlocks.length >= 3 && mcqQuestionBlocks.length >= totalQuestionBlocks.length * 0.7);

      const isMcqPaper = archetypeId === 'bengali_mcq_paper' || layout.templateId === 'mcq-grid' || layout.templateId === 'bengali-mcq-paper' || layout.templateId === 'bengali_mcq_paper' || isDominantMcq;
      const isCqPaper = !isDominantMcq && (archetypeId === 'bengali_cq_paper' || layout.orientation === 'landscape' || layout.templateId === 'bengali-cq-paper' || layout.templateId === 'bengali_cq_paper' || layout.templateId === 'creative-cq');
      const isCombined = !isDominantMcq && (archetypeId === 'bengali_combined_exam_paper' || layout.templateId === 'bengali-combined-exam' || layout.templateId === 'bengali_combined_exam_paper' || (Array.isArray(parsedAst.blocks) && parsedAst.blocks.some(b => b && b.type === 'section_break' && b.target === 'mcq')));
      const isStandardQuestionPaper = archetypeId === 'bengali_standard_question_paper' || layout.templateId === 'question-2col' || layout.templateId === 'bengali_standard_question_paper' || layout.templateId === 'bengali-standard-question';

      let sections = [];

      // Stamp Margin for Legal Deeds
      let stampGapHtml = '';
      if (layout.stampMarginInches > 0) {
        stampGapHtml = `<div style="height:${(layout.stampMarginInches * 72).toFixed(0)}pt; mso-height-rule:exactly;">&nbsp;</div>`;
      }

      if (isCombined) {
        const breakIdx = parsedAst.blocks.findIndex(b => b.type === 'section_break');
        if (breakIdx !== -1) {
          const cqBlocks = parsedAst.blocks.slice(0, breakIdx);
          const breakBlock = parsedAst.blocks[breakIdx];
          const mcqBlocks = parsedAst.blocks.slice(breakIdx + 1);

          // Section 1: CQ (Landscape Booklet, 2 Columns, 0.7in gap, 0.5in margins, initial col break)
          sections.push({
            pageSize: 'a4',
            orientation: 'landscape',
            margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
            cols: 2,
            colGap: '0.7in',
            hasSeparator: false,
            isContinuous: false,
            startWithColumnBreak: true, // Imposition: text starts in Page 1 Right column
            html: headerHtml + DocWord2003Builder.renderBlocks(cqBlocks, cvt, targetFont)
          });

          // Section 2: MCQ Header (Portrait, 1 Column, 0.5in margins)
          let mcqHeaderHtml = '';
          if (breakBlock && breakBlock.mcqHeader) {
            mcqHeaderHtml = DocWord2003Builder.renderMcqHeaderBlock(breakBlock.mcqHeader, cvt);
          } else {
            mcqHeaderHtml = `<div style="text-align:center; margin-bottom:8pt;"><p style="font-size:13pt; font-weight:bold; margin:6pt 0 4pt 0; text-align:center;">${cvt('বহুনির্বাচনী অভীক্ষা')}</p><hr style="border:0; border-top:1pt solid #000; margin:4pt 0 8pt 0;"/></div>`;
          }

          sections.push({
            pageSize: 'a4',
            orientation: 'portrait',
            margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
            cols: 1,
            colGap: '0in',
            hasSeparator: false,
            isContinuous: false, // Next page break
            startWithColumnBreak: false,
            html: mcqHeaderHtml
          });

          // Section 3: MCQ Questions (Portrait, 2 Columns, 0.2in gap, solid separator, 0.5in margins)
          sections.push({
            pageSize: 'a4',
            orientation: 'portrait',
            margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
            cols: 2,
            colGap: '0.2in',
            hasSeparator: true,
            isContinuous: true, // Continuous break directly under MCQ header
            startWithColumnBreak: false,
            html: DocWord2003Builder.renderBlocks(mcqBlocks, cvt, targetFont)
          });
        } else {
          sections.push({
            pageSize: 'a4',
            orientation: 'portrait',
            margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
            cols: 1,
            html: headerHtml + DocWord2003Builder.renderBlocks(parsedAst.blocks, cvt, targetFont)
          });
        }
      } else if (isMcqPaper) {
        // Standalone MCQ Paper (Strict 20-30 MCQs):
        // Section 1: Header (1 Column, 0.5in margins)
        sections.push({
          pageSize: 'a4',
          orientation: 'portrait',
          margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
          cols: 1,
          isContinuous: false,
          startWithColumnBreak: false,
          html: headerHtml
        });

        // Section 2: MCQ Questions (2 Columns, 0.2in gap, solid separator, 0.5in margins)
        sections.push({
          pageSize: 'a4',
          orientation: 'portrait',
          margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
          cols: 2,
          colGap: '0.2in',
          hasSeparator: true,
          isContinuous: true, // Continuous break directly below header!
          startWithColumnBreak: false,
          html: DocWord2003Builder.renderBlocks(parsedAst.blocks, cvt, targetFont)
        });
      } else if (isStandardQuestionPaper || (layout.columns === 2 && !isCqPaper)) {
        // Standard 2-Column Bengali Question Paper (Class 1-5 / Short Questions / General):
        // Section 1: Header (1 Column, 0.5in margins)
        sections.push({
          pageSize: 'a4',
          orientation: 'portrait',
          margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
          cols: 1,
          isContinuous: false,
          startWithColumnBreak: false,
          html: headerHtml
        });

        // Section 2: Questions (2 Columns, 0.25in gap, solid separator, 0.5in margins)
        // Starts naturally at Column 1 Top (no column skip)
        sections.push({
          pageSize: 'a4',
          orientation: 'portrait',
          margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
          cols: 2,
          colGap: '0.25in',
          hasSeparator: true,
          isContinuous: true, // Continuous break directly below header
          startWithColumnBreak: false,
          html: DocWord2003Builder.renderBlocks(parsedAst.blocks, cvt, targetFont)
        });
      } else if (isCqPaper) {
        // Standalone Creative Question Paper (Landscape 2-page booklet, 2 cols, 0.7in gap, 0.5in margins)
        sections.push({
          pageSize: 'a4',
          orientation: 'landscape',
          margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
          cols: 2,
          colGap: '0.7in',
          hasSeparator: false,
          isContinuous: false,
          startWithColumnBreak: true, // Column 1 skipped, begins Page 1 Right
          html: headerHtml + DocWord2003Builder.renderBlocks(parsedAst.blocks, cvt, targetFont)
        });
      } else {
        // Default 1-column document
        sections.push({
          pageSize: layout.pageSize || 'a4',
          orientation: layout.orientation || 'portrait',
          margins: layout.margins || { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
          cols: 1,
          html: headerHtml + DocWord2003Builder.renderBlocks(parsedAst.blocks, cvt, targetFont)
        });
      }

      // 3. Construct Full Word 2003 Mso HTML Document
      opts.onProgress(85, 'ওয়ার্ড ২০০৩ স্পেসিফিকেশন প্যাকেজিং হচ্ছে...');
      const fullHtml = DocWord2003Builder.assembleWordDocument({
        sections: sections,
        stampGapHtml: stampGapHtml,
        meta: meta,
        layout: layout,
        fontFamily: targetFont
      });

      opts.onProgress(100, 'ওয়ার্ড ২০০৩ (.doc) ফাইল প্রস্তুত সম্পন্ন!');

      return new Blob([fullHtml], { type: 'application/msword;charset=utf-8' });
    }

    /**
     * Builds standard institutional/exam header
     */
    static buildHeaderHtml(meta, layout, cvt) {
      if (layout.templateId === 'official-notice') {
        return `
        <div style="text-align:center; margin-bottom:12pt;">
          <p style="font-size:15pt; font-weight:bold; margin:0 0 2pt 0;">${cvt(meta.institute || 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার')}</p>
          <p style="font-size:12pt; font-weight:bold; margin:0 0 8pt 0;">${cvt(meta.subHeader || 'উপজেলা নির্বাহী অফিসারের কার্যালয়')}</p>
          <table style="width:100%; border:none; border-bottom:1pt solid #000; padding-bottom:4pt; margin-bottom:10pt;">
            <tr>
              <td style="text-align:left; border:none; font-size:11pt;"><b>${cvt('স্মারক নং:')}</b> ${cvt(meta.memoNo || '—')}</td>
              <td style="text-align:right; border:none; font-size:11pt;"><b>${cvt('তারিখ:')}</b> ${cvt(meta.date || '—')}</td>
            </tr>
          </table>
          ${meta.subject ? `<p style="text-align:left; font-size:12pt; font-weight:bold; margin:8pt 0 12pt 0;">${cvt('বিষয়: ' + meta.subject)}</p>` : ''}
        </div>`;
      }

      if (layout.templateId === 'legal-deed') {
        return `
        <div style="text-align:center; margin-bottom:14pt;">
          <p style="font-size:16pt; font-weight:bold; margin:0 0 4pt 0;">${cvt(meta.title || 'চুক্তিপত্র দলিল')}</p>
          <p style="font-size:11pt; margin:0 0 4pt 0;">${cvt(meta.stampValue || '')}</p>
          <p style="font-size:11pt; margin:0 0 10pt 0;">${cvt('তারিখ: ' + (meta.deedDate || ''))}</p>
          <hr style="border:0; border-top:1pt solid #000; margin:4pt 0 12pt 0;"/>
        </div>`;
      }

      // Academic Question Paper Header (Default)
      const institute = cvt(meta.institute || '');
      const exam = cvt(meta.exam || '');
      const grade = cvt(meta.grade ? `শ্রেণি: ${meta.grade}` : '');
      const subject = cvt(meta.subject ? `বিষয়: ${meta.subject}` : '');
      const time = cvt(meta.time ? `সময়: ${meta.time}` : '');
      const fullMarks = cvt(meta.fullMarks ? `পূর্ণমান: ${meta.fullMarks}` : '');
      const note = cvt(meta.note || '');

      return `
      <div style="text-align:center; margin-bottom:8pt;">
        ${institute ? `<p style="font-size:15pt; font-weight:bold; margin:0 0 2pt 0; line-height:1.2;">${institute}</p>` : ''}
        ${exam ? `<p style="font-size:13pt; font-weight:bold; margin:0 0 3pt 0; line-height:1.2;">${exam}</p>` : ''}
        
        ${(grade || subject) ? `
        <p style="font-size:11.5pt; font-weight:bold; margin:0 0 3pt 0;">
          ${grade ? `<span>${grade}</span>` : ''}
          ${(grade && subject) ? '&nbsp;&nbsp;|&nbsp;&nbsp;' : ''}
          ${subject ? `<span>${subject}</span>` : ''}
        </p>` : ''}

        ${meta.subjectCode ? (() => {
          const digits = String(meta.subjectCode).replace(/\D/g, '').split('');
          const codeDigits = digits.length > 0 ? digits : ['১', '০', '১'];
          const cells = codeDigits.map(d => `<td style="border:1pt solid #000; width:16pt; text-align:center; font-size:10pt; font-weight:bold; padding:1pt;">${cvt(d)}</td>`).join('');
          return `<div style="text-align:center; margin:3pt 0 4pt 0;"><span style="font-size:10pt;">${cvt('বিষয় কোড: ')}</span><table align="center" style="display:inline-table; border-collapse:collapse; margin-left:4pt;"><tr>${cells}</tr></table></div>`;
        })() : ''}

        ${(time || fullMarks) ? `
        <table style="width:100%; border:none; margin:4pt 0 2pt 0; border-bottom:0.75pt solid #000; padding-bottom:2pt;">
          <tr>
            <td style="text-align:left; border:none; font-size:10.5pt; font-weight:bold;">${time}</td>
            <td style="text-align:right; border:none; font-size:10.5pt; font-weight:bold;">${fullMarks}</td>
          </tr>
        </table>` : ''}

        ${note ? `<p style="font-size:9.5pt; font-style:italic; margin:3pt 0 6pt 0; text-align:center;">${note}</p>` : ''}
      </div>`;
    }

    /**
     * Renders an array of blocks to Word 2003 HTML
     */
    static renderBlocks(blocks, cvt, targetFont) {
      if (!blocks || blocks.length === 0) return '';
      return blocks.map(b => DocWord2003Builder.renderBlock(b, cvt, targetFont)).join('\n');
    }

    /**
     * Renders standalone MCQ Header block across 1 full column
     */
    static renderMcqHeaderBlock(h, cvt) {
      let hHtml = '<div style="text-align:center; margin-bottom:8pt;">';
      if (h.institute) hHtml += `<p style="font-size:15pt; font-weight:bold; margin:0 0 2pt 0; text-align:center; line-height:1.2;">${cvt(h.institute)}</p>`;
      if (h.subHeader) hHtml += `<p style="font-size:10pt; font-weight:bold; margin:0 0 2pt 0; text-align:center; line-height:1.2;">${cvt(h.subHeader)}</p>`;
      if (h.exam) hHtml += `<p style="font-size:13pt; font-weight:bold; margin:0 0 2pt 0; text-align:center; line-height:1.2;">${cvt(h.exam)}</p>`;
      if (h.grade) hHtml += `<p style="font-size:10.5pt; font-weight:bold; margin:0 0 2pt 0; text-align:center; line-height:1.2;">${cvt(h.grade)}</p>`;
      if (h.subjectCode) {
        const digits = String(h.subjectCode).replace(/\D/g, '').split('');
        const codeDigits = digits.length > 0 ? digits : ['১', '০', '১'];
        const cells = codeDigits.map(d => `<td style="border:1pt solid #000; width:16pt; text-align:center; font-size:10pt; font-weight:bold; padding:1pt;">${cvt(d)}</td>`).join('');
        hHtml += `<div style="text-align:center; margin:3pt 0 4pt 0;"><span style="font-size:10pt;">${cvt('বিষয় কোড: ')}</span><table align="center" style="display:inline-table; border-collapse:collapse; margin-left:4pt;"><tr>${cells}</tr></table></div>`;
      }
      if (h.timeMarks || h.title) {
        const titleText = h.title || 'বহুনির্বাচনি অভীক্ষা';
        hHtml += `<p style="font-size:11.5pt; font-weight:bold; margin:3pt 0 3pt 0; text-align:center; line-height:1.2;">${cvt(h.timeMarks ? h.timeMarks : titleText)}</p>`;
      }
      if (h.note) hHtml += `<p style="font-size:9.5pt; font-style:italic; margin:2pt 0 6pt 0; text-align:center; line-height:1.2;">${cvt(h.note)}</p>`;
      hHtml += '<hr style="border:0; border-top:1pt solid #000; margin:4pt 0 8pt 0;"/></div>';
      return hHtml;
    }

    /**
     * Extracts MCQ options from subQuestions
     */
    static extractMcqOptions(subQuestions) {
      if (!subQuestions || subQuestions.length === 0) return null;

      // If any item has explicit marks, it is a creative subquestion, NOT MCQ!
      const hasMarks = subQuestions.some(s => s.marks && String(s.marks).trim().length > 0);
      if (hasMarks) return null;

      // Filter out Roman numeral statements (i., ii., iii., iv.) and prompt text from option evaluation
      const optionCandidates = subQuestions.filter(s =>
        !s.isPromptText &&
        !/^(?:[iIvVxX]+|\([iIvVxX]+\))[\.\)]/i.test((s.subId || '').trim())
      );
      if (optionCandidates.length === 0) return null;

      // If any candidate ends in '?' or contains question words, it is a real question, NOT an MCQ option choice!
      const hasQuestionSentences = optionCandidates.some(s => {
        const t = (s.text || '').trim();
        if (s.isPromptText || /(?:নিচের\s+কোনটি\s+সঠিক|সঠিক\s+উত্তর)/i.test(t)) return false;
        return t.endsWith('?') || t.endsWith('?।') || (t.length > 40 && (t.includes('কী') || t.includes('কি') || t.includes('কেন') || t.includes('কোথায়') || t.includes('কাকে বলে') || t.includes('ব্যাখ্যা কর') || t.includes('আলোচনা কর')));
      });
      if (hasQuestionSentences) return null;

      // If there are subquestions beyond 'ঘ' (e.g. ঙ, চ, ছ or e, f, g), it's a list of questions, not 4-choice MCQ!
      const hasExtendedSubQuestions = optionCandidates.some(s => /^(?:\([ঙ-হe-z]\)|[ঙ-হe-z][\.\)])/i.test((s.subId || '').trim()));
      if (hasExtendedSubQuestions) return null;

      const pattern = /(\([ক-ঘa-d]\)|[ক-ঘa-d][\.\)])/gi;

      // Case 1: Check distinct subQuestions representing options (handling isMcqOptionsRow)
      const optionSubs = optionCandidates.filter(s =>
        /^(?:\([ক-ঘa-d]\)|[ক-ঘa-d][\.\)])/i.test((s.subId || '').trim()) ||
        (s.isMcqOptionsRow && /^(?:\([ক-ঘa-d]\)|[ক-ঘa-d][\.\)])/i.test((s.text || '').trim()))
      );
      if (optionSubs.length >= 4) {
        return optionSubs.slice(0, 4).map(s => ({
          label: s.subId || '',
          text: s.text || ''
        }));
      }

      // Case 2: embedded options in 1 or more rows containing (ক)...(খ)...(গ)...(ঘ)
      const fullText = optionCandidates.map(s => (s.subId ? s.subId + ' ' : '') + s.text).join(' ');
      const matches = [...fullText.matchAll(pattern)];
      if (matches.length >= 4) {
        const optMatches = matches.length === 4 ? matches : matches.slice(-4);
        const opts = [];
        for (let i = 0; i < 4; i++) {
          const lbl = optMatches[i][0];
          const start = optMatches[i].index + lbl.length;
          const end = (i + 1 < 4) ? optMatches[i + 1].index : fullText.length;
          opts.push({
            label: lbl,
            text: fullText.substring(start, end).trim()
          });
        }
        return opts;
      }

      // Case 3: Check isMcqOptionsRow flag fallback
      const mcqRows = optionCandidates.filter(s => s.isMcqOptionsRow && !s.isPromptText);
      if (mcqRows.length >= 4) {
        return mcqRows.slice(0, 4).map(s => ({
          label: s.subId || '',
          text: s.text || ''
        }));
      }

      return null;
    }

    /**
     * Formats MCQ options in 4 equal columns (or 2 columns across 2 lines when long)
     */
    static formatMcqOptionsHtml(optionsList, cvt, formatMath) {
      if (!optionsList || optionsList.length === 0) return '';
      const formatted = optionsList.map(opt => ({
        label: cvt(opt.label || ''),
        text: formatMath(opt.text || '')
      }));

      const getVisualLength = (str) => {
        if (!str) return 0;
        return str.replace(/[\u09BE-\u09CC\u09CD\u0981-\u0983\u09D7]/g, '').length;
      };

      const totalLen = optionsList.reduce((sum, o) => sum + getVisualLength(o.text || ''), 0);
      const maxSingleLen = Math.max(...optionsList.map(o => getVisualLength(o.text || '')));

      // 4 Options fit in 1 line across 4 equal columns (short options)
      // Matches sample Sec3 P5: Tabs=[11.7pt] [69.8pt] [127.8pt] [185.4pt]
      if (formatted.length === 4 && totalLen <= 56 && maxSingleLen <= 15) {
        return `<p class="MsoNormal" style="margin-left:11.7pt;text-indent:0pt;margin-bottom:1.5pt;line-height:normal;tab-stops:11.7pt 69.8pt 127.8pt 185.4pt 351.9pt;">` +
          `${formatted[0].label}&nbsp;${formatted[0].text}<span style='mso-tab-count:1'>&nbsp;</span>` +
          `${formatted[1].label}&nbsp;${formatted[1].text}<span style='mso-tab-count:1'>&nbsp;</span>` +
          `${formatted[2].label}&nbsp;${formatted[2].text}<span style='mso-tab-count:1'>&nbsp;</span>` +
          `${formatted[3].label}&nbsp;${formatted[3].text}</p>`;
      }

      // 4 Options split into 2 lines x 2 columns (medium/long options)
      // Matches sample Sec3 P2/P3: Tabs=[11.7pt] [127.8pt] with single tab jump
      if (formatted.length === 4 && totalLen <= 120 && maxSingleLen <= 32) {
        return `<p class="MsoNormal" style="margin-left:11.7pt;text-indent:0pt;margin-bottom:1pt;line-height:normal;tab-stops:11.7pt 127.8pt 351.9pt;">` +
          `${formatted[0].label}&nbsp;${formatted[0].text}<span style='mso-tab-count:1'>&nbsp;</span>` +
          `${formatted[1].label}&nbsp;${formatted[1].text}</p>\n` +
          `<p class="MsoNormal" style="margin-left:11.7pt;text-indent:0pt;margin-bottom:1.5pt;line-height:normal;tab-stops:11.7pt 127.8pt 351.9pt;">` +
          `${formatted[2].label}&nbsp;${formatted[2].text}<span style='mso-tab-count:1'>&nbsp;</span>` +
          `${formatted[3].label}&nbsp;${formatted[3].text}</p>`;
      }

      // Very long options: each gets its own line with 11.7pt indent
      return formatted.map(opt =>
        `<p class="MsoNormal" style="margin-left:11.7pt;text-indent:0pt;margin-bottom:1pt;line-height:1.2;">` +
        `${opt.label}&nbsp;${opt.text}</p>`
      ).join('\n');
    }

    /**
     * Builds 2-Column Content (legacy fallback)
     */
    static buildTwoColumnContent(blocks, cvt, targetFont) {
      return DocWord2003Builder.renderBlocks(blocks, cvt, targetFont);
    }

    /**
     * Builds 1-Column Content (legacy fallback)
     */
    static buildSingleColumnContent(blocks, cvt, targetFont) {
      return DocWord2003Builder.renderBlocks(blocks, cvt, targetFont);
    }

    /**
     * Format math and chemical formulas into Word 2003 compatible HTML
     */
    static formatMath(text, cvt) {
      if (!text) return '';
      // Support markdown bold (**bold**) by converting to HTML <b> tags safely outside cvt
      if (text.includes('**')) {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        let out = '';
        for (const part of parts) {
          if (!part) continue;
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            out += '<b>' + DocWord2003Builder.formatMath(part.slice(2, -2), cvt) + '</b>';
          } else {
            out += DocWord2003Builder.formatMath(part, cvt);
          }
        }
        return out;
      }

      let s = text.replace(/\\rightarrow\b|\\to\b/g, '→');
      // Auto-wrap bare LaTeX \frac and \sqrt with $ if not wrapped
      s = s.replace(/(?<!\$)(?:\\frac\{[^{}]*\}\{[^{}]*\}|\\sqrt\{[^{}]*\})(?!\$)/g, '$$$&$$');

      const EqConv = (typeof EquationConverter !== 'undefined') ? EquationConverter : (typeof globalThis !== 'undefined' && globalThis.EquationConverter ? globalThis.EquationConverter : null);
      if (EqConv && /\$|\\frac|\\sqrt|\^|_/.test(s)) {
        const segments = EqConv.splitTextAndMath(s);
        let out = '';
        for (const seg of segments) {
          if (seg.type === 'math') {
            let mVal = seg.value.trim().replace(/\\rightarrow\b|\\to\b/g, '→');
            // Apply full symbol map (set theory, Greek, etc.)
            if (typeof EqConv.cleanLatexSymbols === 'function') {
              mVal = EqConv.cleanLatexSymbols(mVal);
            }
            // Superscript / subscript
            mVal = mVal.replace(/([a-zA-Z0-9}])\^{([^}]+)}/g, '$1<sup>$2</sup>');
            mVal = mVal.replace(/([a-zA-Z0-9}])\^([a-zA-Z0-9])/g, '$1<sup>$2</sup>');
            mVal = mVal.replace(/([a-zA-Z0-9}])_\{([^}]+)\}/g, '$1<sub>$2</sub>');
            mVal = mVal.replace(/([a-zA-Z0-9}])_([a-zA-Z0-9])/g, '$1<sub>$2</sub>');
            // Wrap in italic Times New Roman (standard math style)
            out += `<span style="font-family:'Times New Roman',serif;font-style:italic;">${mVal}</span>`;
          } else {
            out += cvt(seg.value);
          }
        }
        return out;
      }
      
      // Simple HTML fallback if EquationConverter is not available or fails
      let fallback = s.replace(/\$/g, '');
      fallback = fallback.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>').replace(/_([a-zA-Z0-9]+)/g, '<sub>$1</sub>');
      fallback = fallback.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>').replace(/\^([a-zA-Z0-9]+)/g, '<sup>$1</sup>');
      fallback = fallback.replace(/\\rightarrow\b|\\to\b/g, '→');
      
      return cvt(fallback);
    }

    /**
     * Renders an individual block to Word 2003 compatible HTML
     */
    static renderBlock(block, cvt, targetFont) {
      if (!block) return '';
      const isPureEnglish = (targetFont === 'Times New Roman');
      const formatMath = (t) => DocWord2003Builder.formatMath(t, cvt);

      switch (block.type) {
        case 'section_break': {
          let hHtml = '<div style="page-break-before:always; margin:10pt 0 6pt 0; border-top:1.5pt solid #000; padding-top:4pt;">&nbsp;</div>';
          if (block.mcqHeader) {
            const h = block.mcqHeader;
            hHtml += '<div style="text-align:center; margin-bottom:8pt;">';
            if (h.institute) hHtml += `<p style="font-size:14pt; font-weight:bold; margin:0 0 2pt 0;">${cvt(h.institute)}</p>`;
            if (h.exam) hHtml += `<p style="font-size:12pt; font-weight:bold; margin:0 0 2pt 0;">${cvt(h.exam)}</p>`;
            if (h.grade) hHtml += `<p style="font-size:11pt; font-weight:bold; margin:0 0 2pt 0;">${cvt(h.grade)}</p>`;
            if (h.subjectCode) {
              const digits = String(h.subjectCode).replace(/\D/g, '').split('');
              const codeDigits = digits.length > 0 ? digits : ['১', '০', '১'];
              const cells = codeDigits.map(d => `<td style="border:1pt solid #000; width:16pt; text-align:center; font-size:10pt; font-weight:bold; padding:1pt;">${cvt(d)}</td>`).join('');
              hHtml += `<div style="text-align:center; margin:3pt 0 4pt 0;"><span style="font-size:10pt;">${cvt('বিষয় কোড: ')}</span><table align="center" style="display:inline-table; border-collapse:collapse; margin-left:4pt;"><tr>${cells}</tr></table></div>`;
            }
            if (h.title) hHtml += `<p style="font-size:13pt; font-weight:bold; margin:3pt 0 2pt 0;">${cvt(h.title)}</p>`;
            if (h.timeMarks) hHtml += `<p style="font-size:10.5pt; font-weight:bold; margin:2pt 0 4pt 0;">${cvt(h.timeMarks)}</p>`;
            if (h.note) hHtml += `<p style="font-size:9.5pt; font-style:italic; margin:2pt 0 6pt 0;">${cvt(h.note)}</p>`;
            hHtml += '<hr style="border:0; border-top:1pt solid #000; margin:4pt 0 8pt 0;"/></div>';
          }
          return hHtml;
        }
        case 'header_time_marks': {
          const timeText = block.time || '';
          const marksText = block.marks || '';
          return `
          <table style="width:100%; border:none; border-bottom:0.75pt solid #000; padding-bottom:2pt; margin:4pt 0 6pt 0;">
            <tr>
              <td style="text-align:left; border:none; font-size:10.5pt; font-weight:bold;">${cvt(timeText)}</td>
              <td style="text-align:right; border:none; font-size:10.5pt; font-weight:bold;">${cvt(marksText)}</td>
            </tr>
          </table>`;
        }

        case 'heading': {
          const size = block.level === 1 ? '13pt' : (block.level === 2 ? '12pt' : '11pt');
          return `<p class="MsoHeading" style="font-size:${size}; font-weight:bold; margin:6pt 0 3pt 0; text-align:center; border-bottom:0.5pt solid #ccc; padding-bottom:1pt;">${cvt(block.text)}</p>`;
        }

        case 'question': {
          let html = '<div class="MsoQuestionBlock" style="margin-bottom:4pt;">';
          const isMcq = (block.subQuestions && DocWord2003Builder.extractMcqOptions(block.subQuestions) != null);
          const rawDelim = block.delimiter || (isPureEnglish ? '.' : (isMcq ? '।' : '.'));
          const formattedMarks = block.marks ? ((isPureEnglish || block.marks.includes('=')) ? `[${block.marks}]` : cvt(block.marks)) : '';

          // Question paragraph:
          // For MCQ: single space after serial number without tab jump to avoid wide gaps on 2-digit numbers (10+)
          // For CQ: native hanging indent matching sample P7
          if (isMcq) {
            html += `
            <p class="MsoNormal" style="margin-left:0pt;text-indent:0pt;margin-bottom:1.5pt;line-height:normal;text-align:justify;">
              <b>${cvt(block.number)}${rawDelim === '.' ? '.' : cvt(rawDelim)}&nbsp;</b>${formatMath(block.text)}${formattedMarks ? `<span style='mso-tab-count:1'>&nbsp;</span><b>${formattedMarks}</b>` : ''}
            </p>`;
          } else {
            let firstLineText = (block.text || '').trim();
            let remainingStimLines = [];
            if (block.stimulus) {
              const allStimLines = block.stimulus.split('\n').map(l => l.trim()).filter(Boolean);
              if (!firstLineText && allStimLines.length > 0) {
                firstLineText = allStimLines[0];
                remainingStimLines = allStimLines.slice(1);
              } else {
                remainingStimLines = allStimLines;
              }
            }

            html += `
            <p class="MsoNormal" style="margin-left:21.6pt;text-indent:-21.6pt;tab-stops:21.6pt 351pt;margin-bottom:2pt;line-height:normal;text-align:justify;font-size:12pt;">
              <b>${cvt(block.number)}${rawDelim === '.' ? '.' : cvt(rawDelim)}</b><span style='mso-tab-count:1'>&nbsp;</span>${formatMath(firstLineText)}${formattedMarks ? `<span style='mso-tab-count:1'>&nbsp;</span><b>${formattedMarks}</b>` : ''}
            </p>`;

            if (remainingStimLines.length > 0) {
              for (const sLine of remainingStimLines) {
                html += `<p class="MsoNormal" style="margin-left:21.6pt;margin-bottom:2pt;line-height:1.2;text-align:justify;font-size:12pt;">${formatMath(sLine)}</p>`;
              }
            }
          }

          // Sub-questions (ক, খ, গ, ঘ) or MCQ options
          if (block.subQuestions && block.subQuestions.length > 0) {
            const mcqOptions = DocWord2003Builder.extractMcqOptions(block.subQuestions);
            if (mcqOptions && mcqOptions.length >= 2) {
              // Defensively sort Roman numeral statements (i., ii., iii.) so i. is always on top
              const getRomanVal = (subId) => {
                const m = String(subId || '').trim().match(/^([iIvVxX]+)[\.\)]/);
                if (!m) return 999;
                const map = { 'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10 };
                return map[m[1].toLowerCase()] || 999;
              };
              const nonOptionSubs = block.subQuestions.filter(sub => {
                return !/(\([ক-ঘa-d]\)|[ক-ঘa-d][\.\)])/i.test((sub.subId || '') + ' ' + (sub.text || ''));
              });
              const rIndices = [];
              const rItems = [];
              for (let idx = 0; idx < nonOptionSubs.length; idx++) {
                if (getRomanVal(nonOptionSubs[idx].subId) < 999) {
                  rIndices.push(idx);
                  rItems.push(nonOptionSubs[idx]);
                }
              }
              if (rItems.length > 1) {
                rItems.sort((a, b) => getRomanVal(a.subId) - getRomanVal(b.subId));
                for (let j = 0; j < rIndices.length; j++) {
                  nonOptionSubs[rIndices[j]] = rItems[j];
                }
              }

              // Extract any non-option prompts (like 'নিচের কোনটি সঠিক?' or Roman numeral statements)
              for (const sub of nonOptionSubs) {
                if (sub.isPromptText) {
                  html += `<p class="MsoNormal" style="margin-left:21.6pt;font-weight:bold;margin-bottom:2pt;line-height:normal;font-size:12pt;">${formatMath(sub.text)}</p>`;
                } else if (/^(?:[iIvVxX]+|[0-9]+)[\.\)]/.test(sub.subId || '')) {
                  const isRoman = /^[iIvVxX]+[\.\)]/.test(sub.subId || '');
                  const rIdHtml = isRoman
                    ? `<span style="font-family:'Times New Roman',serif;">${sub.subId}</span>`
                    : `<b>${cvt(sub.subId)}</b>`;
                  html += `<p class="MsoNormal" style="margin-left:21.6pt;margin-bottom:1pt;line-height:normal;font-size:12pt;">${rIdHtml}&nbsp;${formatMath(sub.text)}</p>`;
                } else {
                  html += `<p class="MsoNormal" style="margin-left:21.6pt;margin-bottom:1.5pt;line-height:normal;font-size:12pt;">${formatMath((sub.subId ? sub.subId + '&nbsp;' : '') + sub.text)}</p>`;
                }
              }

              // Render MCQ Options formatted in 4 equal columns (or 2 columns if long)
              html += DocWord2003Builder.formatMcqOptionsHtml(mcqOptions, cvt, formatMath);
            } else {
              // Standard Creative Sub-questions ((ক), (খ), (গ), (ঘ)) with marks
              for (const sub of block.subQuestions) {
                const subFormattedMarks = sub.marks ? ((isPureEnglish || sub.marks.includes('=')) ? `[${sub.marks}]` : cvt(sub.marks)) : '';
                if (sub.isPromptText) {
                  html += `<p class="MsoNormal" style="margin-left:21.6pt;font-weight:bold;margin-bottom:2pt;line-height:normal;font-size:12pt;">${formatMath(sub.text)}</p>`;
                } else {
                  const sId = (sub.subId || '').trim();
                  const sIdFormatted = sId ? (/[.\)।:]\s*$/.test(sId) ? sId : sId + '.') : '';
                  html += `
                  <p class="MsoNormal" style="margin-left:21.6pt;text-indent:0pt;tab-stops:21.6pt 351pt;margin-bottom:1.5pt;line-height:normal;text-align:justify;font-size:12pt;">
                    <b>${cvt(sIdFormatted)}&nbsp;</b>${formatMath(sub.text)}${subFormattedMarks ? `<span style='mso-tab-count:1'>&nbsp;</span><b>${subFormattedMarks}</b>` : ''}
                  </p>`;
                }
              }
            }
          }

          html += '</div>';
          return html;
        }

        case 'stimulus_box': {
          return `
          <p class="MsoNormal" style="margin-left:21.6pt; margin-top:2pt; margin-bottom:2pt; font-size:12pt; line-height:1.2; text-align:justify;">
            ${cvt(block.text).replace(/\n/g, '<br/>')}
          </p>`;
        }

        case 'table': {
          let tblHtml = '<table class="MsoNormalTable" style="border-collapse:collapse; border:0.5pt solid #000; margin:4pt 0;">';

          // Plain normal header row without gray background
          if (block.headers && block.headers.length > 0) {
            tblHtml += '<tr>';
            block.headers.forEach((h, idx) => {
              const align = (block.alignments && block.alignments[idx]) || 'left';
              tblHtml += `<td style="border:0.5pt solid #000; padding:1.5pt 3pt; font-size:10.5pt; text-align:${align}; line-height:1.15;">${cvt(h)}</td>`;
            });
            tblHtml += '</tr>';
          }

          // Rows
          if (block.rows && block.rows.length > 0) {
            block.rows.forEach(row => {
              tblHtml += '<tr>';
              row.forEach((cell, idx) => {
                const align = (block.alignments && block.alignments[idx]) || 'left';
                tblHtml += `<td style="border:0.5pt solid #000; padding:1.5pt 3pt; font-size:10.5pt; text-align:${align}; line-height:1.15;">${cvt(cell)}</td>`;
              });
              tblHtml += '</tr>';
            });
          }

          tblHtml += '</table>';
          return tblHtml;
        }

        case 'unordered_list': {
          let listHtml = '<ul style="margin:2pt 0 4pt 15pt; padding:0;">';
          block.items.forEach(item => {
            listHtml += `<li style="font-size:12pt; margin-bottom:1.5pt; line-height:1.25;">${cvt(item)}</li>`;
          });
          listHtml += '</ul>';
          return listHtml;
        }

        case 'ordered_list': {
          let listHtml = '<ol style="margin:2pt 0 4pt 15pt; padding:0;">';
          block.items.forEach(item => {
            listHtml += `<li style="font-size:12pt; margin-bottom:1.5pt; line-height:1.25;">${cvt(item.text)}</li>`;
          });
          listHtml += '</ol>';
          return listHtml;
        }

        case 'hr': {
          return '<hr style="border:0; border-top:0.75pt solid #666; margin:6pt 0;"/>';
        }

        case 'paragraph':
        default: {
          return `<p style="font-size:12pt; margin:0 0 4pt 0; line-height:1.25; text-align:justify;">${cvt(block.text)}</p>`;
        }
      }
    }

    /**
     * Assembles the complete Word 2003 Mso HTML structure
     */
    static assembleWordDocument({ sections, headerHtml, bodyHtml, stampGapHtml, meta, layout, fontFamily }) {
      let pageSections = [];
      if (sections && sections.length > 0) {
        pageSections = sections;
      } else {
        pageSections = [{
          pageSize: layout && layout.pageSize || 'a4',
          orientation: layout && layout.orientation || 'portrait',
          margins: (layout && layout.margins) || { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
          cols: 1,
          html: `${stampGapHtml || ''}${headerHtml || ''}${bodyHtml || ''}`,
          isContinuous: false,
          startWithColumnBreak: false
        }];
      }

      let pageStyles = [];
      let divStyles = [];

      pageSections.forEach((sec, idx) => {
        const sNum = idx + 1;
        const isLandscape = sec.orientation === 'landscape';
        const pageW = isLandscape ? '841.9pt' : (sec.pageSize === 'legal' ? '612.0pt' : '595.3pt');
        const pageH = isLandscape ? '595.3pt' : (sec.pageSize === 'legal' ? '1008.0pt' : '841.9pt');
        const mTop = (((sec.margins && sec.margins.top) != null ? sec.margins.top : 0.5) * 72).toFixed(1) + 'pt';
        const mRight = (((sec.margins && sec.margins.right) != null ? sec.margins.right : 0.5) * 72).toFixed(1) + 'pt';
        const mBottom = (((sec.margins && sec.margins.bottom) != null ? sec.margins.bottom : 0.5) * 72).toFixed(1) + 'pt';
        const mLeft = (((sec.margins && sec.margins.left) != null ? sec.margins.left : 0.5) * 72).toFixed(1) + 'pt';
        const orientCss = isLandscape ? '\tmso-page-orientation:landscape;\n' : '';
        const colCss = (sec.cols === 2)
          ? `\tmso-columns:2 even ${sec.colGap || '0.2in'};\n`
          : '';
        const sepCss = (sec.cols === 2 && sec.hasSeparator)
          ? '\tmso-column-separator:solid;\n'
          : '';

        pageStyles.push(` @page Section${sNum}
\t{size:${pageW} ${pageH};
${orientCss}\tmargin:${mTop} ${mRight} ${mBottom} ${mLeft};
\tmso-header-margin:36.0pt;
\tmso-footer-margin:36.0pt;
${colCss}${sepCss}\tmso-paper-source:0;
\tmso-forms-protection:no;}`);

        divStyles.push(` div.Section${sNum}
\t{page:Section${sNum};}`);
      });

      const bodyDivs = pageSections.map((sec, idx) => {
        const sNum = idx + 1;
        const breakTag = idx === 0
          ? ''
          : (sec.isContinuous
              ? "<br clear=all style='page-break-before:auto;mso-break-type:section-break'>\n"
              : "<br clear=all style='page-break-before:always;mso-break-type:section-break'>\n");
        const colBreakTag = sec.startWithColumnBreak
          ? "<br clear=all style='mso-column-break-before:always'>\n"
          : "";
        const stamp = (idx === 0 && stampGapHtml) ? stampGapHtml : '';
        return `${breakTag}<div class="Section${sNum}">\n${stamp}${colBreakTag}${sec.html}\n</div>`;
      }).join('\n');

      const isBijoyFont = fontFamily === 'SutonnyMJ';
      const bodyLang = isBijoyFont ? 'EN-US' : 'BN';
      const msoAnsiLang = isBijoyFont ? 'EN-US' : 'BN-BD';

      return `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
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
  <o:Company>Fayzar Computer & Photostat</o:Company>
  <o:Title>${meta && (meta.title || meta.exam) ? (meta.title || meta.exam) : 'Document'}</o:Title>
  <o:Created>${new Date().toISOString()}</o:Created>
 </o:DocumentProperties>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:SpellingState>Clean</w:SpellingState>
  <w:GrammarState>Clean</w:GrammarState>
  <w:ProtectForms>false</w:ProtectForms>
  <w:DontTrackRevisions/>
  <w:DoNotEmbedSystemFonts/>
  <w:DontPromoteQF/>
  <w:Compatibility>
   <w:BreakWrappedTables/>
   <w:SnapToGridInCell/>
   <w:WrapTextWithPunct/>
   <w:UseAsianBreakRules/>
   <w:DontGrowAutofit/>
  </w:Compatibility>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
<!--
 @font-face {
   font-family: "${fontFamily}";
   mso-font-alt: "Arial";
 }
 p.MsoNormal, li.MsoNormal, div.MsoNormal {
   mso-style-parent: "";
   margin: 0in;
   margin-bottom: .0001pt;
   mso-pagination: widow-orphan;
   font-size: 12.0pt;
   font-family: "${fontFamily}", Arial, sans-serif;
   mso-ascii-font-family: "${fontFamily}";
   mso-hansi-font-family: "${fontFamily}";
   mso-bidi-font-family: "${fontFamily}";
   mso-fareast-font-family: "${fontFamily}";
   mso-ansi-language: ${msoAnsiLang};
 }
 table.MsoNormalTable {
   border-collapse: collapse;
   mso-table-layout-alt: fixed;
 }
${pageStyles.join('\n')}
${divStyles.join('\n')}
 body {
   font-family: "${fontFamily}", "Times New Roman", Arial, sans-serif;
   font-size: 12.0pt;
   color: #000000;
   background: #ffffff;
   mso-ansi-language: ${msoAnsiLang};
 }
 p, div, td, th {
   font-family: "${fontFamily}", Arial, sans-serif;
   font-size: 12.0pt;
   mso-ascii-font-family: "${fontFamily}";
   mso-hansi-font-family: "${fontFamily}";
   mso-bidi-font-family: "${fontFamily}";
   mso-fareast-font-family: "${fontFamily}";
   mso-ansi-language: ${msoAnsiLang};
 }
 table {
   border-collapse: collapse;
   mso-table-layout-alt: fixed;
 }
-->
</style>
</head>
<body lang="${bodyLang}">
${bodyDivs}
</body>
</html>`;
    }
  }

  // Export to global scope
  global.DocWord2003Builder = DocWord2003Builder;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocWord2003Builder;
  }
})(typeof window !== 'undefined' ? window : this);
