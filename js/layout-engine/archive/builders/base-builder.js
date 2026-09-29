(function(global) {
  'use strict';

  class BaseBuilder {
    static hasBengali(parsedAst) {
      const textSamples = [];
      if (parsedAst.metadata) {
        Object.values(parsedAst.metadata).forEach(v => typeof v === 'string' && textSamples.push(v));
      }
      if (parsedAst.blocks) {
        parsedAst.blocks.forEach(b => {
          if (b.text) textSamples.push(b.text);
          if (b.stimulus) textSamples.push(b.stimulus);
          if (b.subQuestions) b.subQuestions.forEach(sq => textSamples.push(sq.text));
          if (b.headers) b.headers.forEach(h => textSamples.push(h));
          if (b.rows) b.rows.forEach(r => r.forEach(c => textSamples.push(c)));
          if (b.items) b.items.forEach(it => textSamples.push(typeof it === 'string' ? it : (it.text || '')));
        });
      }
      const fullSample = textSamples.join(' ');
      if (typeof BanglaConverter !== 'undefined' && typeof BanglaConverter.hasBengaliText === 'function') {
        return BanglaConverter.hasBengaliText(fullSample);
      }
      return /[\u0980-\u09FF]/.test(fullSample);
    }

    static esc(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    static cvt(str, isBijoy) {
      if (!str) return '';
      if (isBijoy) {
        if (typeof BanglaConverter !== 'undefined' && typeof BanglaConverter.unicodeToBijoy === 'function') {
          return BanglaConverter.unicodeToBijoy(str);
        }
        if (typeof BanglaConverterEngine !== 'undefined' && typeof BanglaConverterEngine.convertUnicodeToBijoy === 'function') {
          return BanglaConverterEngine.convertUnicodeToBijoy(str);
        }
      }
      return str;
    }

    static renderSmartRuns(text, isBijoy, isBold = false, isItalic = false, sz = '24', isPureEnglish = false, extraRPr = '') {
      if (!text) return '';
      const esc = BaseBuilder.esc;
      const cvt = BaseBuilder.cvt;

      if (text.includes('**')) {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        let combinedXml = '';
        for (const part of parts) {
          if (!part) continue;
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            const innerText = part.slice(2, -2);
            combinedXml += BaseBuilder.renderSmartRuns(innerText, isBijoy, true, isItalic, sz, isPureEnglish, extraRPr);
          } else {
            combinedXml += BaseBuilder.renderSmartRuns(part, isBijoy, isBold, isItalic, sz, isPureEnglish, extraRPr);
          }
        }
        return combinedXml;
      }

      const boldTag = isBold ? '<w:b/><w:bCs/>' : '';
      const italicTag = isItalic ? '<w:i/><w:iCs/>' : '';
      const szTag = `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`;

      text = text.replace(/\\rightarrow\b|\\to\b/g, '→');
      text = text.replace(/(?<!\$)(?:\\frac\{[^{}]*\}\{[^{}]*\}|\\sqrt\{[^{}]*\})(?!\$)/g, '$$$&$$');

      const EqConv = (typeof EquationConverter !== 'undefined') ? EquationConverter : (typeof globalThis !== 'undefined' && globalThis.EquationConverter ? globalThis.EquationConverter : null);
      if (EqConv && /\$|\\frac|\\sqrt|\^|_/.test(text)) {
        const mathSegments = EqConv.splitTextAndMath(text);
        let mathXml = '';
        for (const mSeg of mathSegments) {
          if (mSeg.type === 'math') {
            let mVal = mSeg.value.trim().replace(/\\rightarrow\b|\\to\b/g, '→');
            const chemSubMatch = mVal.match(/^([a-zA-Z0-9]+)_\{?([0-9a-zA-Z]+)\}?$/);
            if (chemSubMatch) {
              const chemBase = chemSubMatch[1];
              const chemSub = chemSubMatch[2];
              mathXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(chemBase)}</w:t></w:r>`;
              mathXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:vertAlign w:val="subscript"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(chemSub)}</w:t></w:r>`;
            } else if (mVal === '→' || mVal.includes('→')) {
              mathXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve"> ${esc(mVal)} </w:t></w:r>`;
            } else if (typeof EqConv.latexToOmml === 'function') {
              mathXml += EqConv.latexToOmml(mVal, isBijoy);
            } else {
              let fallbackText = mVal.replace(/\$/g, '');
              let fbSub = fallbackText.match(/_\{([^}]+)\}|_([a-zA-Z0-9]+)/);
              let fbSup = fallbackText.match(/\^\{([^}]+)\}|\^([a-zA-Z0-9]+)/);
              
              if (fbSub) {
                let base = fallbackText.split('_')[0];
                let sub = fbSub[1] || fbSub[2];
                mathXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(base)}</w:t></w:r>`;
                mathXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:vertAlign w:val="subscript"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(sub)}</w:t></w:r>`;
              } else if (fbSup) {
                let base = fallbackText.split('^')[0];
                let sup = fbSup[1] || fbSup[2];
                mathXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(base)}</w:t></w:r>`;
                mathXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:vertAlign w:val="superscript"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(sup)}</w:t></w:r>`;
              } else {
                mathXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(fallbackText)}</w:t></w:r>`;
              }
            }
          } else {
            mathXml += BaseBuilder.renderSmartRuns(mSeg.value, isBijoy, isBold, isItalic, sz, isPureEnglish, extraRPr);
          }
        }
        return mathXml;
      }

      if (isPureEnglish) {
        const rPr = `<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${boldTag}${italicTag}${szTag}${extraRPr}</w:rPr>`;
        return `<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
      }

      let segments = [];
      if (typeof BanglaConverter !== 'undefined' && typeof BanglaConverter.splitMixedBengaliAndEnglish === 'function') {
        segments = BanglaConverter.splitMixedBengaliAndEnglish(text);
      } else {
        const hasBn = /[\u0980-\u09FF]/.test(text);
        segments = [{ type: hasBn ? 'bengali' : 'english', text }];
      }

      let xml = '';
      for (const seg of segments) {
        if (!seg.text) continue;
        
        const font = seg.type === 'english' ? 'Times New Roman' : (isBijoy ? 'SutonnyMJ' : 'Kalpurush');
        const converted = seg.type === 'bengali' && isBijoy ? cvt(seg.text, true) : seg.text;
        const rPr = `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>${boldTag}${italicTag}${szTag}${extraRPr}</w:rPr>`;
        
        const parts = converted.split('\n');
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) {
            xml += `<w:r>${rPr}<w:t xml:space="preserve">${esc(parts[i])}</w:t></w:r>`;
          }
          if (i < parts.length - 1) {
            xml += `<w:r>${rPr}<w:br/></w:r>`;
          }
        }
      }
      return xml;
    }
    
    static extractMcqOptions(subQuestions) {
      if (!subQuestions || subQuestions.length === 0) return null;
      const hasMarks = subQuestions.some(s => s.marks && String(s.marks).trim().length > 0);
      if (hasMarks) return null;

      const optionCandidates = subQuestions.filter(s =>
        !s.isPromptText &&
        !/^(?:[iIvVxX]+|\([iIvVxX]+\))[\.\)]/i.test((s.subId || '').trim())
      );
      if (optionCandidates.length === 0) return null;

      const hasQuestionSentences = optionCandidates.some(s => {
        const t = (s.text || '').trim();
        if (s.isPromptText || /(?:নিচের\s+কোনটি\s+সঠিক|সঠিক\s+উত্তর)/i.test(t)) return false;
        return t.endsWith('?') || t.endsWith('?।') || (t.length > 40 && (t.includes('কী') || t.includes('কি') || t.includes('কেন') || t.includes('কোথায়') || t.includes('কাকে বলে') || t.includes('ব্যাখ্যা কর') || t.includes('আলোচনা কর')));
      });
      if (hasQuestionSentences) return null;

      const hasExtendedSubQuestions = optionCandidates.some(s => /^(?:\([ঙ-হe-z]\)|[ঙ-হe-z][\.\)])/i.test((s.subId || '').trim()));
      if (hasExtendedSubQuestions) return null;

      const pattern = /(\([ক-ঘa-d]\)|[ক-ঘa-d][\.\)])/gi;

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

      const mcqRows = optionCandidates.filter(s => s.isMcqOptionsRow && !s.isPromptText);
      if (mcqRows.length >= 4) {
        return mcqRows.slice(0, 4).map(s => ({
          label: s.subId || '',
          text: s.text || ''
        }));
      }
      return null;
    }

    static formatMcqOptionsXml(optionsList, isBijoy, isPureEnglish, bodySz = '24', layout = null) {
      if (!optionsList || optionsList.length === 0) return '';
      const renderRuns = (txt, isBold, isItalic, sz = bodySz, extra = '') => BaseBuilder.renderSmartRuns(txt, isBijoy, isBold, isItalic, sz, isPureEnglish, extra);

      const getVisualLength = (str) => {
        if (!str) return 0;
        return str.replace(/[\u09BE-\u09CC\u09CD\u0981-\u0983\u09D7]/g, '').length;
      };

      const totalLen = optionsList.reduce((sum, o) => sum + getVisualLength(o.text || ''), 0);
      const maxSingleLen = Math.max(...optionsList.map(o => getVisualLength(o.text || '')));
      
      const is2Col = layout && layout.columns === 2;
      const tab1_4 = is2Col ? 1540 : 2500;
      const tab2_4 = is2Col ? 2720 : 5000;
      const tab3_4 = is2Col ? 3900 : 7500;
      
      const tab1_2 = is2Col ? 2740 : 5000;

      // In 2-column layout, 4 options in 1 line requires them to be VERY short (e.g., numbers)
      const max4ColLen = is2Col ? 24 : 48;
      const maxSingle4ColLen = is2Col ? 6 : 14;

      if (optionsList.length === 4 && totalLen <= max4ColLen && maxSingleLen <= maxSingle4ColLen) {
        return `
        <w:p>
          <w:pPr>
            <w:ind w:left="360"/>
            <w:tabs>
              <w:tab w:val="left" w:pos="${tab1_4}"/>
              <w:tab w:val="left" w:pos="${tab2_4}"/>
              <w:tab w:val="left" w:pos="${tab3_4}"/>
            </w:tabs>
            <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
          </w:pPr>
          ${renderRuns(optionsList[0].label + ' ' + optionsList[0].text, false, false, bodySz)}
          <w:r><w:tab/></w:r>
          ${renderRuns(optionsList[1].label + ' ' + optionsList[1].text, false, false, bodySz)}
          <w:r><w:tab/></w:r>
          ${renderRuns(optionsList[2].label + ' ' + optionsList[2].text, false, false, bodySz)}
          <w:r><w:tab/></w:r>
          ${renderRuns(optionsList[3].label + ' ' + optionsList[3].text, false, false, bodySz)}
        </w:p>`;
      }

      const max2ColLen = is2Col ? 55 : 110;
      const maxSingle2ColLen = is2Col ? 16 : 32;

      if (optionsList.length === 4 && totalLen <= max2ColLen && maxSingleLen <= maxSingle2ColLen) {
        return `
        <w:p>
          <w:pPr>
            <w:ind w:left="360"/>
            <w:tabs>
              <w:tab w:val="left" w:pos="${tab1_2}"/>
            </w:tabs>
            <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
          </w:pPr>
          ${renderRuns(optionsList[0].label + ' ' + optionsList[0].text, false, false, bodySz)}
          <w:r><w:tab/></w:r>
          ${renderRuns(optionsList[1].label + ' ' + optionsList[1].text, false, false, bodySz)}
        </w:p>
        <w:p>
          <w:pPr>
            <w:ind w:left="360"/>
            <w:tabs>
              <w:tab w:val="left" w:pos="${tab1_2}"/>
            </w:tabs>
            <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
          </w:pPr>
          ${renderRuns(optionsList[2].label + ' ' + optionsList[2].text, false, false, bodySz)}
          <w:r><w:tab/></w:r>
          ${renderRuns(optionsList[3].label + ' ' + optionsList[3].text, false, false, bodySz)}
        </w:p>`;
      }

      return optionsList.map(opt => `
      <w:p>
        <w:pPr>
          <w:ind w:left="360"/>
          <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
        </w:pPr>
        ${renderRuns(opt.label + ' ' + opt.text, false, false, bodySz)}
      </w:p>`).join('\n');
    }

    static generateSectionProperties(layout) {
      let pgSz = '<w:pgSz w:w="11906" w:h="16838"/>'; // A4 Default
      if (layout.pageSize === 'legal') {
        pgSz = '<w:pgSz w:w="12240" w:h="20160"/>';
      } else if (layout.pageSize === 'letter') {
        pgSz = '<w:pgSz w:w="12240" w:h="15840"/>';
      }

      if (layout.orientation === 'landscape') {
        if (layout.pageSize === 'legal') {
          pgSz = '<w:pgSz w:w="20160" w:h="12240" w:orient="landscape"/>';
        } else if (layout.pageSize === 'letter') {
          pgSz = '<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>';
        } else {
          pgSz = '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>'; // A4 Landscape
        }
      }

      let top = 720, bottom = 720, left = 720, right = 720;
      if (layout.margins) {
        top = Math.round((layout.margins.top || 0.5) * 1440);
        bottom = Math.round((layout.margins.bottom || 0.5) * 1440);
        left = Math.round((layout.margins.left || 0.5) * 1440);
        right = Math.round((layout.margins.right || 0.5) * 1440);
      }
      const pgMar = `<w:pgMar w:top="${top}" w:right="${right}" w:bottom="${bottom}" w:left="${left}" w:header="720" w:footer="720" w:gutter="0"/>`;

      let colsXml = '<w:cols w:num="1" w:space="720"/>';
      if (layout.columns === 2) {
        if (layout.orientation === 'landscape') {
          colsXml = '<w:cols w:num="2" w:space="1008" w:equalWidth="1"/>';
        } else {
          colsXml = '<w:cols w:num="2" w:space="360" w:sep="1" w:equalWidth="1"/>';
        }
      }

      return `
      <w:sectPr>
        ${pgSz}
        ${pgMar}
        ${colsXml}
        <w:docGrid w:linePitch="360"/>
      </w:sectPr>`;
    }

    static generateAcademicHeader(meta, layout, isBijoy, isPureEnglish) {
      let xml = '';
      
      const isLandscape = layout.orientation === 'landscape';
      let widthTwips = 11906; // A4 portrait width
      if (layout.pageSize === 'legal') widthTwips = 12240;
      else if (layout.pageSize === 'letter') widthTwips = 12240;
      if (isLandscape) {
        if (layout.pageSize === 'a4') widthTwips = 16838;
        if (layout.pageSize === 'legal') widthTwips = 20160;
        if (layout.pageSize === 'letter') widthTwips = 15840;
      }
      
      let leftTwips = 720, rightTwips = 720;
      if (layout.margins) {
        leftTwips = Math.round((layout.margins.left || 0.5) * 1440);
        rightTwips = Math.round((layout.margins.right || 0.5) * 1440);
      }
      const rightTabPos = widthTwips - leftTwips - rightTwips;

      const renderRuns = (txt, isBold, isItalic, sz) => BaseBuilder.renderSmartRuns(txt, isBijoy, isBold, isItalic, sz, isPureEnglish);
      const isPlaceholder = (txt) => !txt || /^(?:আপনার\s*প্রতিষ্ঠানের?\s*নাম|পরীক্ষার\s*নাম\s*লিখুন|ঠিকানা\s*লিখুন|Class\s*Name|Exam\s*Name)$/i.test(txt.trim());

      if (meta.institute && !isPlaceholder(meta.institute)) {
        xml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="30"/></w:pPr>${renderRuns(meta.institute, true, false, '30')}</w:p>`;
      }

      if (meta.address || meta.subHeader) {
        const addrText = meta.address || meta.subHeader;
        if (!isPlaceholder(addrText)) {
          xml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="30"/></w:pPr>${renderRuns(addrText, false, false, '22')}</w:p>`;
        }
      }

      if (meta.exam && !isPlaceholder(meta.exam)) {
        xml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="40"/></w:pPr>${renderRuns(meta.exam, true, false, '25')}</w:p>`;
      }

      if (meta.grade) {
        const gradeLabel = isPureEnglish ? 'Class: ' : 'শ্রেণিঃ ';
        xml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="30"/></w:pPr>${renderRuns(gradeLabel + meta.grade, true, false, '23')}</w:p>`;
      }

      if (meta.subject || meta.subjectCode) {
        const gradeText = String(meta.grade || '');
        const subjectText = String(meta.subject || '').trim();
        const alreadyInGrade = gradeText.includes(subjectText) || (gradeText.includes('বিষয়') && gradeText.includes(subjectText.replace(/^বিষয়\s*[:\-]?\s*/, '')));
        
        let subjectLine = '';
        if (!alreadyInGrade && subjectText) {
          const subjLabel = isPureEnglish ? 'Subject: ' : 'বিষয়ঃ ';
          subjectLine = renderRuns(subjLabel + meta.subject, true, false, '23');
        }

        if (meta.subjectCode) {
          const digits = String(meta.subjectCode).replace(/\D/g, '').split('');
          const codeDigits = digits.length > 0 ? digits : ['১', '০', '১'];
          const cellsXml = codeDigits.map(d => `<w:tc><w:tcPr><w:tcW w:w="320" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>${renderRuns(d, true, false, '20')}</w:p></w:tc>`).join('');
          
          if (subjectLine) {
            subjectLine += `<w:r><w:tab/></w:r>`;
          }
          subjectLine += `
          <w:r>
            <w:pict>
              <v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe">
                <v:stroke joinstyle="miter"/>
                <v:path gradientshapeok="t" o:connecttype="rect"/>
              </v:shapetype>
              <v:shape id="SubjectCodeBox" type="#_x0000_t202" stroked="f" style="position:absolute;margin-top:-60pt;width:80pt;height:40pt;z-index:1;visibility:visible;mso-wrap-style:square;mso-width-percent:0;mso-height-percent:0;mso-wrap-distance-left:9pt;mso-wrap-distance-top:0;mso-wrap-distance-right:0;mso-wrap-distance-bottom:0;mso-position-horizontal:right;mso-position-horizontal-relative:margin;mso-position-vertical:absolute;mso-position-vertical-relative:text">
                <v:textbox style="mso-fit-shape-to-text:t" inset="0,0,0,0">
                  <w:txbxContent>
                    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="20"/></w:pPr>${renderRuns('বিষয় কোড:', false, false, '18')}</w:p>
                    <w:tbl>
                      <w:tblPr><w:jc w:val="center"/><w:tblW w:w="0" w:type="auto"/></w:tblPr>
                      <w:tr>${cellsXml}</w:tr>
                    </w:tbl>
                  </w:txbxContent>
                </v:textbox>
              </v:shape>
            </w:pict>
          </w:r>`;
        }

        if (subjectLine) {
          xml += `<w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="${rightTabPos}"/></w:tabs><w:jc w:val="both"/><w:spacing w:before="0" w:after="40"/></w:pPr>${subjectLine}</w:p>`;
        }
      }

      if (meta.time || meta.fullMarks) {
        const timeText = meta.time ? (isPureEnglish ? `Time: ${meta.time}` : `সময়: ${meta.time}`) : '';
        const marksText = meta.fullMarks ? (isPureEnglish ? `Full Marks: ${meta.fullMarks}` : `পূর্ণমান: ${meta.fullMarks}`) : '';

        xml += `
        <w:p>
          <w:pPr>
            <w:tabs>
              <w:tab w:val="right" w:pos="${rightTabPos}"/>
            </w:tabs>
            <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
          </w:pPr>
          ${renderRuns(timeText, true, false, '23')}
          <w:r><w:tab/></w:r>
          ${renderRuns(marksText, true, false, '23')}
        </w:p>
        <w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>`;
      }

      if (meta.note) {
        xml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="120"/></w:pPr>${renderRuns(meta.note, false, true, '19')}</w:p>`;
      }
      return xml;
    }
  }

  global.BaseBuilder = BaseBuilder;
})(typeof window !== 'undefined' ? window : globalThis);
