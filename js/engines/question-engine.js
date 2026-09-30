/**
 * Fayzar Publishing Studio - Board-Standard Question Paper Typesetting Engine
 * Features:
 *  1. Header inside Column (Full 2-Column flow from top to bottom)
 *  2. 1st Column Skip for 2-Page / 4-Page Booklet Fold Printing (Sheet 1 + Sheet 2)
 *  3. 0 Line Gap Mandate (line-height: 1.15, margin: 0, padding: 0)
 *  4. MCQ 4-Column / Auto 2-Column Option Grid Indented 22px after Question Number
 *  5. Complete support for 30-MCQ on 1 page and 7-CQ + Short questions
 */

(function (global) {
  'use strict';

  const QuestionEngine = {

    /**
     * Normalizes text and parses it into structured exam paper components.
     */
    parseQuestionPaper(rawText) {
      if (!rawText) rawText = '';
      // 0. Strip vision layout tags
      rawText = rawText.replace(/^\s*\[LAYOUT:[^\]]*\]\s*[\r\n]?/im, '');

      // 1. Normalize line endings and form-feeds
      const normalized = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\x0c/g, '\n')
        .replace(/\]\s*([\u09E6-\u09EF\d]+[।.)])/g, ']\n$1');

      const rawLines = normalized.split('\n');
      const lines = rawLines.map(l => l.trim()).filter(Boolean);

      const result = {
        header: {
          institute: '',
          location: '',
          exam: '',
          classAndSubject: '',
          examType: '',
          time: '',
          marks: '',
          instructions: ''
        },
        sections: []
      };

      let bodyStartIndex = 0;

      // Extract header lines from top
      for (let i = 0; i < Math.min(8, lines.length); i++) {
        const line = lines[i];
        const cleanLine = line.replace(/^[\*\#\-\s]+/, '').trim();
        if (/^[\u09E6-\u09EF\d]+[।.)]/.test(cleanLine) || /^([কখগঘ]|[abcdABCD])[\.\:।\-]/.test(cleanLine) || /^#{1,6}\s*[\u09E6-\u09EF\d]+[।.)]/.test(line)) {
          break; // Questions have started, header is complete
        }
        if (!result.header.institute && /স্কুল|কলেজ|মাদরাসা|বিদ্যালয়|একাডেমী|প্রতিষ্ঠান/i.test(cleanLine)) {
          result.header.institute = cleanLine;
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if (!result.header.location && /ফুলবাড়ী|দিনাজপুর|ঢাকা|উপজেলা|জেলা/i.test(cleanLine) && !/শ্রেণি|বিষয়|সময়/.test(cleanLine)) {
          result.header.location = cleanLine;
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if (!result.header.exam && /পরীক্ষা|মূল্যায়ন|টার্ম|সেমিস্টার|নির্বাচনী/i.test(cleanLine) && !/বহুনির্বাচন|নৈর্ব্যক্তিক/.test(cleanLine)) {
          result.header.exam = cleanLine;
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if (/শ্রেণি|বিষয়/i.test(cleanLine)) {
          let cLine = cleanLine;
          const examSubMatch = cLine.match(/(বহুনির্বাচন[িী]\s*অভ[িী]ক্ষা(?:[\-\s]*[\u09E6-\u09EF\d]+)?|নৈর্ব্যক্তিক\s*অভ[িী]ক্ষা(?:[\-\s]*[\u09E6-\u09EF\d]+)?)/i);
          if (examSubMatch) {
            result.header.examType = examSubMatch[1].trim();
            cLine = cLine.replace(examSubMatch[0], '').trim();
            cLine = cLine.replace(/;\s*$/, ';').trim();
          }
          result.header.classAndSubject = (result.header.classAndSubject ? result.header.classAndSubject + '  |  ' : '') + cLine;
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if ((cleanLine.startsWith('[') && cleanLine.endsWith(']')) || /^\[?বিশেষ\s*দ্রষ্টব্য/i.test(cleanLine)) {
          result.header.instructions = cleanLine;
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if (!cleanLine.startsWith('[') && /বহুনির্বাচন[িী]\s*অভ[িী]ক্ষা|নৈর্ব্যক্তিক\s*অভ[িী]ক্ষা/i.test(cleanLine) && !/সময়|পূর্ণমান/.test(cleanLine)) {
          const examSubMatch = cleanLine.match(/(বহুনির্বাচন[িী]\s*অভ[িী]ক্ষা(?:[\-\s]*[\u09E6-\u09EF\d]+)?|নৈর্ব্যক্তিক\s*অভ[িী]ক্ষা(?:[\-\s]*[\u09E6-\u09EF\d]+)?)/i);
          if (examSubMatch) {
            result.header.examType = examSubMatch[1].trim();
          } else {
            result.header.examType = cleanLine.trim();
          }
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if ((/সময়/i.test(cleanLine) || /পূর্ণমান|মান/i.test(cleanLine)) && (!result.header.time || !result.header.marks)) {
          let cLine = cleanLine;
          const examSubMatch = cLine.match(/(বহুনির্বাচন[িী]\s*অভ[িী]ক্ষা(?:[\-\s]*[\u09E6-\u09EF\d]+)?|নৈর্ব্যক্তিক\s*অভ[িী]ক্ষা(?:[\-\s]*[\u09E6-\u09EF\d]+)?)/i);
          if (examSubMatch) {
            result.header.examType = examSubMatch[1].trim();
            cLine = cLine.replace(examSubMatch[0], ' ');
          }

          const tMatch = cLine.match(/সময়[ঃ:\-]\s*([^;\n|]+?)(?=(?:পূর্ণমান|সৃজনশীল|বহুনির্বাচন|মান|$))/i);
          const mMatch = cLine.match(/(?:পূর্ণমান|মান)[ঃ:\-]?\s*([^\n;]+)/i);
          if (tMatch && !result.header.time) result.header.time = tMatch[1].trim();
          if (mMatch && !result.header.marks) result.header.marks = mMatch[1].trim();
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        }
      }

      const bodyLines = lines.slice(bodyStartIndex);
      let currentSection = { title: '', marks: '', questions: [] };
      let currentQuestion = null;
      let pendingPreContext = '';

      for (let i = 0; i < bodyLines.length; i++) {
        const line = bodyLines[i];

        // Section Title Detection
        if (/(?:বিভাগ|অংশ)[ঃ:\-]|সৃজনশীল\s*প্রশ্ন|সংক্ষিপ্ত(?:-উত্তর)?\s*প্রশ্ন|বহুনির্বাচনি|নৈর্ব্যক্তিক/i.test(line) && line.length < 75) {
          if (currentQuestion) {
            currentSection.questions.push(currentQuestion);
            currentQuestion = null;
          }
          if (currentSection.questions.length > 0 || currentSection.title) {
            result.sections.push(currentSection);
          }
          currentSection = { title: line, marks: '', questions: [] };
          continue;
        }

        // Shared Context / Stimulus Detection before a question (e.g. নিচের উদ্দীপকটি পড়ে ২৫ ও ২৬...)
        if (/^নিচের\s*(?:উদ্দীপক|অনুচ্ছেদ|তথ্য|ছক|চিত্র)/i.test(line) && !line.match(/^(?:#{1,6}\s*)?([\u09E6-\u09EF\d]+)[।.)]/)) {
          if (currentQuestion) {
            currentSection.questions.push(currentQuestion);
            currentQuestion = null;
          }
          pendingPreContext += (pendingPreContext ? '\n' : '') + line;
          continue;
        }

        // Question Number Match (১।, ২।, ৩। or 1., 2., 3. or ## ১।)
        const qStartMatch = line.match(/^(?:>\s*)?(?:#{1,6}\s*)?([\u09E6-\u09EF\d]+)[।.)]\s*(.*)$/);
        if (qStartMatch) {
          if (currentQuestion) {
            currentSection.questions.push(currentQuestion);
          }
          currentQuestion = {
            num: qStartMatch[1],
            text: qStartMatch[2].trim(),
            preContext: pendingPreContext,
            stimulus: '',
            statements: [],
            subQuestions: [],
            options: []
          };
          pendingPreContext = '';
          continue;
        }

        // Context continued (if waiting for next question)
        if (!currentQuestion && pendingPreContext) {
          pendingPreContext += '\n' + line;
          continue;
        }

        // 1. Alternative Question Divider ('অথবা' / '--- অথবা ---')
        if (/^(?:অথবা|বিকল্প\s*প্রশ্ন|[\-–—\s]*অথবা[\-–—\s]*)[,ঃ:\s]*$/i.test(line.trim())) {
          if (currentQuestion && currentQuestion.subQuestions && currentQuestion.subQuestions.length > 0) {
            currentQuestion.subQuestions.push({
              isAlternative: true,
              label: '',
              text: '--- অথবা ---',
              mark: ''
            });
            continue;
          }
        }

        // 2. MCQ Options Detection
        const mcqOpts = this.parseMcqOptions(line);
        // If they end with marks (১, ২, ৩, ৪) or text is very long, they might be merged CQ subquestions
        const isMergedCqSub = mcqOpts.length >= 2 && mcqOpts.some(o => /[\s\t]+[১২৩৪\d]$/.test(o.text.trim()) || o.text.trim().length > 50);
        
        if (mcqOpts.length >= 2 && currentQuestion && !isMergedCqSub) {
          currentQuestion.options = currentQuestion.options.concat(mcqOpts);
          continue;
        }

        if (isMergedCqSub && currentQuestion) {
          for (const opt of mcqOpts) {
            let text = opt.text.trim();
            const markMatch = text.match(/[\s\t]+([১২৩৪\d])$/);
            let mark = '';
            if (markMatch) {
              mark = markMatch[1];
              text = text.substring(0, text.length - markMatch[0].length).trim();
            }
            currentQuestion.subQuestions.push({
              label: opt.label,
              text: text,
              mark: mark || (opt.label === 'ক' ? '১' : opt.label === 'খ' ? '২' : opt.label === 'গ' ? '৩' : '৪')
            });
          }
          continue;
        }

        // 3. Sub-question for CQ (ক., খ., গ., ঘ. - separated by dot, colon, or dari; NOT bracket ')')
        const subMatch = line.match(/^([কখগঘ]|[abcdABCD])[\.\:।\-]\s*(.*?)(?:\s*([১২৩৪\d]))?$/);
        if (subMatch && currentQuestion && currentQuestion.options.length === 0 && (!currentQuestion.statements || currentQuestion.statements.length === 0)) {
          currentQuestion.subQuestions.push({
            label: subMatch[1],
            text: subMatch[2].trim(),
            mark: subMatch[3] || (subMatch[1] === 'ক' ? '১' : subMatch[1] === 'খ' ? '২' : subMatch[1] === 'গ' ? '৩' : '৪')
          });
          continue;
        }

        if (mcqOpts.length > 0 && currentQuestion) {
          currentQuestion.options = currentQuestion.options.concat(mcqOpts);
          continue;
        }

        // Statements or Roman numerals in MCQ (i., ii., iii. or র., রর., ররর.)
        if (/(?:^|\s+)(?:[iI\u09B0]{1,3}\.|[১-৩]\.)\s*/.test(line) && currentQuestion) {
          const parts = line.split(/(?=(?:^|\s+)(?:[iI\u09B0]{1,3}\.|[১-৩]\.)\s+)/).map(s => s.trim()).filter(Boolean);
          if (parts.length > 1) {
            for (const p of parts) {
              currentQuestion.statements.push(this.normalizeRomanText(p));
            }
          } else {
            currentQuestion.statements.push(this.normalizeRomanText(line));
          }
          continue;
        }
        if (/^নিচের\s*কোনটি\s*সঠিক/i.test(line) && currentQuestion) {
          currentQuestion.statements.push(line);
          continue;
        }

        // Append to question text / stimulus (strip leading > if present)
        if (currentQuestion) {
          const cleanStim = line.replace(/^>\s?/, '');
          if (currentQuestion.subQuestions.length === 0 && currentQuestion.options.length === 0) {
            currentQuestion.stimulus += (currentQuestion.stimulus ? '\n' : '') + cleanStim;
          } else if (currentQuestion.subQuestions.length > 0) {
            const lastSub = currentQuestion.subQuestions[currentQuestion.subQuestions.length - 1];
            lastSub.text += ' ' + cleanStim;
          }
        }
      }

      if (currentQuestion) {
        currentSection.questions.push(currentQuestion);
      }
      if (currentSection.questions.length > 0 || currentSection.title) {
        result.sections.push(currentSection);
      }

      return result;
    },

    /**
     * Normalizes Roman numerals:
     * Converts Bengali 'র', 'রর', 'ররর' into English Roman 'i', 'ii', 'iii'.
     * Preserves Bengali conjunctions ('ও', ',') and surrounding text.
     */
    normalizeRomanText(text) {
      if (!text) return '';
      return text
        .replace(/(^|[\s,(])ররর(?=[\s,.)]|$)/g, '$1iii')
        .replace(/(^|[\s,(])রর(?=[\s,.)]|$)/g, '$1ii')
        .replace(/(^|[\s,(])র(?=[\s,.)]|$)/g, '$1i')
        .replace(/^ররর\./g, 'iii.')
        .replace(/^রর\./g, 'ii.')
        .replace(/^র\./g, 'i.');
    },

    /**
     * Parses MCQ options even when fused together (e.g. ক) আমানুনখ) সিলমুন) or wrapped in brackets (e.g. (ক) ... (খ) ...).
     */
    parseMcqOptions(line) {
      const regex = /(?:^|\s*)(?:[\(\[\{（]?([ক-ঘa-dABCD])[.)\]\}]\s*)(.*?)(?=(?:[\s\t]*[\(\[\{（]?[ক-ঘa-dABCD][.)\]\}]|$))/g;
      const options = [];
      let m;
      while ((m = regex.exec(line)) !== null) {
        let text = m[2].trim();
        // Strip any trailing opening bracket captured before next option
        text = text.replace(/[\(\[\{（]+$/, '').trim();
        text = this.normalizeRomanText(text);
        if (text) {
          options.push({ label: m[1], text });
        }
      }
      return options;
    },

    /**
     * Renders MCQ Options in 4-Column or Auto 2-Column layout.
     * Guaranteed 4 columns for short text and Roman combined options; collapses to 2 columns if longer or forced.
     */
    renderMcqOptions(options, renderOpts = {}) {
      if (!options || options.length === 0) return '';

      const maxLen = Math.max(...options.map(o => o.text.length));
      const totalLen = options.reduce((sum, o) => sum + o.text.length, 0);
      const isRoman = options.every(o => /(?:^|[\s,(])(?:i{1,3}|iv|র{1,3})(?:[\s,.)]|$)/i.test(o.text));

      let gridClass = 'mcq-grid-4';
      if (renderOpts.forceTwoColumns || (!isRoman && (maxLen > 14 || totalLen > 48))) {
        gridClass = maxLen > 25 ? 'mcq-grid-1' : 'mcq-grid-2';
      }

      let html = `<div class="mcq-grid ${gridClass}">`;
      for (const opt of options) {
        html += `<div class="mcq-opt">`;
        html += `<span class="mcq-opt-label" style="font-weight: bold; margin-right: 6px; flex-shrink: 0;">(${this.escape(opt.label)})</span> `;
        html += `<span class="mcq-opt-text">${this.richText(this.normalizeRomanText(opt.text))}</span>`;
        html += `</div>`;
      }
      html += `</div>`;
      return html;
    },

    /**
     * Renders a Single Question (MCQ or CQ).
     */
    /** Part-8b: EquationConverter রেজলভার (ব্রাউজার/নোড দুই পরিবেশেই) */
    _getEquationConverter() {
      if (typeof EquationConverter !== 'undefined') return EquationConverter;
      if (typeof globalThis !== 'undefined' && globalThis.EquationConverter) return globalThis.EquationConverter;
      if (typeof window !== 'undefined' && window.EquationConverter) return window.EquationConverter;
      // Part-8b: Node/টেস্ট পরিবেশে লোড-অর্ডার-নিরপেক্ষ শিম (TextRunProcessor-এর মতোই)
      if (typeof require === 'function') {
        try { return require('../equation-converter.js'); } catch (e1) {
          try { return require('./equation-converter.js'); } catch (e2) { }
        }
      }
      return null;
    },

    /** Part-8b: টেক্সট + $...$ ইকুয়েশন → স্ক্রিন-প্রিভিউ HTML (কাঁচা LaTeX আর কখনো নয়) */
    richText(text) {
      const raw = String(text == null ? '' : text);
      const EC = this._getEquationConverter();
      if (!EC || typeof EC.splitTextAndMath !== 'function') return this.escape(raw);
      try {
        const segs = EC.splitTextAndMath(raw);
        return segs.map((seg) => {
          if (seg && seg.type === 'math') {
            return (typeof EC.latexToPreviewHtml === 'function') ? EC.latexToPreviewHtml(seg.value) : this.escape(seg.value);
          }
          return this.escape(seg && seg.value != null ? seg.value : '');
        }).join('');
      } catch (e) { return this.escape(raw); }
    },

    /** Part-8b: পুরো ব্লক — মার্কডাউন টেবিল (|---|) → সত্যিকারের <table>, বাকি লাইন <br>-এ */
    richTextBlock(text) {
      const lines = String(text == null ? '' : text).replace(/\r\n/g, '\n').split('\n');
      let html = '';
      let table = [];
      const isSep = (cells) => cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
      const flushTable = () => {
        if (!table.length) return;
        const parsed = table.map((row) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim()));
        table = [];
        let header = null;
        if (parsed.length > 1 && isSep(parsed[1])) { header = parsed[0]; parsed.splice(0, 2); }
        const th = (c) => `<th style="border:1px solid #64748b;background:#f1f5f9;padding:2px 6px;text-align:left;">${this.richText(c)}</th>`;
        const td = (c) => `<td style="border:1px solid #94a3b8;padding:2px 6px;">${this.richText(c)}</td>`;
        html += '<table style="border-collapse:collapse;margin:4px 0;">';
        if (header) html += '<tr>' + header.map(th).join('') + '</tr>';
        html += parsed.filter((r) => !isSep(r)).map((r) => '<tr>' + r.map(td).join('') + '</tr>').join('');
        html += '</table>';
      };
      for (const line of lines) {
        if (/^\s*\|.*\|\s*$/.test(line)) { table.push(line); continue; }
        flushTable();
        if (line.trim()) html += this.richText(line) + '<br>';
      }
      flushTable();
      return html.replace(/<br>$/, '');
    },

    renderQuestionItem(q, renderOpts = {}) {
      const isMcq = (q.options && q.options.length > 0) || (q.statements && q.statements.length > 0);
      let html = '';

      // Pre-context / Stimulus: Starts directly at the left margin, aligned with question serial!
      if (q.preContext) {
        html += `<div class="mcq-precontext font-bold italic" style="font-size: 12pt; line-height: 1.35; margin: 2px 0 1px 0; padding: 0;">`;
        html += this.richTextBlock(q.preContext);
        html += `</div>`;
      }

      if (isMcq) {
        // MCQ Question Item
        html += `<div class="mcq-q-item">`;
        html += `<div class="mcq-q-row">`;
        html += `<span class="mcq-num">${this.escape(q.num)}.</span>`;
        html += `<span class="mcq-text">${this.richText(q.text)}</span>`;
        html += `</div>`;

        // Stimulus / statements if any (indented 22px)
        if (q.statements && q.statements.length > 0) {
          html += `<div class="mcq-stimulus-row">`;
          for (const stmt of q.statements) {
            html += `<div>${this.richText(stmt)}</div>`;
          }
          html += `</div>`;
        } else if (q.stimulus) {
          html += `<div class="mcq-stimulus-row">`;
          html += this.richTextBlock(q.stimulus);
          html += `</div>`;
        }

        // Options row (indented 22px)
        if (q.options && q.options.length > 0) {
          html += `<div class="mcq-options-row">`;
          html += this.renderMcqOptions(q.options, renderOpts);
          html += `</div>`;
        }

        html += `</div>`;
      } else {
        // CQ Question Item: Hanging indent so question number (১।) is on left, text/stimulus strictly to the right
        const firstLineText = (q.text || '').trim();
        let displayStimulus = q.stimulus || '';
        let stimFirstLine = '';
        let stimRemaining = '';

        if (!firstLineText && displayStimulus) {
          const stimLines = displayStimulus.split('\n').map(l => l.trim()).filter(Boolean);
          if (stimLines.length > 0) {
            stimFirstLine = stimLines[0];
            stimRemaining = stimLines.slice(1).join('\n');
          }
        } else {
          stimRemaining = displayStimulus;
        }

        const displayText = firstLineText || stimFirstLine;

        html += `<div class="cq-q-item" style="margin-bottom: 6px; font-size: 12pt; line-height: 1.35;">`;
        html += `<div class="cq-q-row" style="display: flex; align-items: flex-start;">`;
        html += `<span class="cq-num font-bold" style="margin-right: 8px; flex-shrink: 0; min-width: 24px;">${this.escape(q.num)}।</span>`;
        html += `<span class="cq-text text-justify flex-1">${this.richText(displayText)}</span>`;
        html += `</div>`;

        if (stimRemaining) {
          html += `<div class="cq-stimulus text-justify" style="padding-left: 32px !important; margin: 2px 0 !important; font-size: 12pt; line-height: 1.35;">`;
          html += this.richTextBlock(stimRemaining);
          html += `</div>`;
        }

        if (q.subQuestions && q.subQuestions.length > 0) {
          html += `<div class="cq-subs" style="padding-left: 32px !important; margin: 3px 0 0 0 !important;">`;
          for (const sub of q.subQuestions) {
            if (sub.isAlternative) {
              html += `<div class="cq-or-divider text-center font-bold my-1" style="text-align: center; font-weight: bold; margin: 4px 0; color: #334155; font-size: 12pt;">--- অথবা ---</div>`;
              continue;
            }
            html += `<div class="cq-sub-row" style="display: flex; align-items: flex-start; justify-content: space-between; font-size: 12pt; margin: 2px 0;">`;
            html += `<div class="flex-1 text-justify"><span class="cq-sub-lbl font-bold" style="margin-right: 6px;">${this.escape(sub.label)}.</span><span class="cq-sub-txt">${this.richText(sub.text)}</span></div>`;
            html += `<div class="cq-sub-mark font-bold" style="margin-left: 12px; text-align: right; white-space: nowrap;">${this.escape(sub.mark)}</div>`;
            html += `</div>`;
          }
          html += `</div>`;
        }

        html += `</div>`;
      }

      return html;
    },

    /**
     * Renders Header Block (School Name, Address, Exam, Subject, Time, Marks, Instructions).
     */
    renderHeaderBlock(header) {
      let html = `<div class="qp-header text-center pb-1 mb-1 border-b border-black" style="margin-top: 0; padding-top: 0;">`;
      if (header.institute) {
        html += `<h1 class="qp-institute font-black" style="margin: 0; line-height: 1.2; font-size: 16pt;">${this.escape(header.institute)}</h1>`;
      }
      if (header.location) {
        html += `<div class="qp-location font-semibold" style="margin: 0; line-height: 1.2; font-size: 12pt;">${this.escape(header.location)}</div>`;
      }
      if (header.exam) {
        html += `<div class="qp-exam font-bold" style="margin: 0; line-height: 1.2; font-size: 13pt;">${this.escape(header.exam)}</div>`;
      }
      if (header.classAndSubject) {
        html += `<div class="qp-class-subject font-semibold" style="margin: 0; line-height: 1.2; font-size: 12pt;">${this.escape(header.classAndSubject)}</div>`;
      }

      html += `<div class="qp-metrics" style="display: flex !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; font-weight: bold; margin: 2px 0 0 0; line-height: 1.2; font-size: 12pt; border-top: 1px solid #94a3b8; padding-top: 2px;">`;
      html += `<div style="text-align: left; flex: 1; white-space: nowrap;">${header.time ? 'সময়: ' + this.escape(header.time) : ''}</div>`;
      if (header.examType) {
        html += `<div style="text-align: center; flex: 1.5; text-decoration: underline; font-weight: bold; font-size: 13pt; letter-spacing: 0.5px;">${this.escape(header.examType)}</div>`;
      } else {
        html += `<div style="text-align: center; flex: 1;"></div>`;
      }
      html += `<div style="text-align: right; flex: 1; white-space: nowrap;">${header.marks ? 'পূর্ণমান: ' + this.escape(header.marks) : ''}</div>`;
      html += `</div>`;

      if (header.instructions) {
        html += `<div class="qp-instructions italic" style="margin: 0; line-height: 1.35; font-size: 12pt; color: #1e293b;">${this.escape(header.instructions)}</div>`;
      }
      html += `</div>`;
      return html;
    },

    /**
     * Renders entire question paper.
     * In Booklet Mode: generates Sheet 1 (Page 4 Skipped Col 1, Page 1 Header Col 2) + Sheet 2 (Page 2 Col 1, Page 3 Col 2).
     * In Standard Mode: generates a 2-Column continuous flow sheet.
     */
    renderToHtml(parsedData, options = {}) {
      const isBijoy = options.font === 'bijoy';
      const fontClass = isBijoy ? 'font-sutonny' : 'font-kalpurush';
      const isLandscape = options.orientation === 'landscape';
      const skipFirstColumn = !!options.skipFirstColumn;
      const marginClass = options.marginClass || 'margin-standard';
      const fontSize = options.fontSize || '12pt';
      const lineSpacing = options.lineSpacing || '1.35';
      const editableAttr = options.editable ? 'contenteditable="true" spellcheck="false"' : '';
      const styleAttr = `style="font-size: ${fontSize}; line-height: ${lineSpacing};"`;

      // Flatten all questions with their section titles
      const allItems = [];
      for (const sec of parsedData.sections) {
        if (sec.title) {
          allItems.push({ type: 'SECTION_TITLE', title: sec.title });
        }
        for (const q of sec.questions) {
          allItems.push({ type: 'QUESTION', data: q });
        }
      }

      // CASE A: BOOKLET MODE (A4 Landscape, 1st Column Skip, 2 Sheets)
      if (skipFirstColumn && isLandscape) {
        // Sheet 1: Col 1 is Skipped (Page 4), Col 2 has Header + first items
        // Typically Header + 2 CQ questions or ~8 items fill Col 2 of Sheet 1
        const sheet1Col2Items = [];
        const remainingItems = [];

        let count = 0;
        for (const item of allItems) {
          if (count < 3) {
            sheet1Col2Items.push(item);
            if (item.type === 'QUESTION') count++;
          } else {
            remainingItems.push(item);
          }
        }

        // Divide remaining items across Sheet 2 (Col 1 & Col 2)
        const half = Math.ceil(remainingItems.length / 2);
        const sheet2Col1Items = remainingItems.slice(0, half);
        const sheet2Col2Items = remainingItems.slice(half);

        let html = `<div class="${fontClass} dense-zero-gap">`;

        // === SHEET 1 ===
        html += `<div class="sheet-label"><i class="fas fa-book text-emerald-600"></i> শীট ১ (বুকলেট ফ্রন্ট ও ব্যাক — কলাম ১: পৃষ্ঠা ৪ / ব্যাক কভার, কলাম ২: পৃষ্ঠা ১ / ফ্রন্ট কভার)</div>`;
        html += `<div class="paper-sheet size-a4-landscape ${marginClass} mb-8 page-break-indicator">`;
        html += `<div class="grid grid-cols-2 gap-x-5 h-full ${fontClass} dense-zero-gap" ${editableAttr} ${styleAttr}>`;

        // Sheet 1 Column 1: Skipped Box (Page 4)
        html += `<div class="qp-col-skip-box" style="min-height: 480px; height: 100%;">`;
        html += `<i class="fas fa-book-open text-4xl text-slate-300 mb-3"></i>`;
        html += `<div class="font-bold text-slate-700 text-sm mb-1">[ ১ম কলাম স্কিপ করা হয়েছে ]</div>`;
        html += `<div class="text-xs text-slate-500 max-w-xs leading-relaxed">বুকলেট ফোল্ডের নিয়ম অনুযায়ী এটি প্রশ্নপত্রের পৃষ্ঠা ৪ (ব্যাক কভার)। শিটটি মাঝ বরাবর ভাঁজ করলে এটি পেছনে থাকবে।</div>`;
        html += `<div class="mt-4 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded border border-emerald-200">২য় কলাম থেকে বিদ্যালয়ের নাম ও প্রশ্নপত্র শুরু ➜</div>`;
        html += `</div>`;

        // Sheet 1 Column 2: Header + Questions (Page 1)
        html += `<div class="flex flex-col justify-start">`;
        html += this.renderHeaderBlock(parsedData.header);
        for (const it of sheet1Col2Items) {
          if (it.type === 'SECTION_TITLE') {
            html += `<div class="font-bold text-center bg-slate-100 py-0.5 my-1 border-y border-slate-300" style="font-size: ${fontSize}; line-height: ${lineSpacing};">${this.escape(it.title)}</div>`;
          } else {
            html += this.renderQuestionItem(it.data);
          }
        }
        html += `</div>`;

        html += `</div>`; // end grid
        html += `</div>`; // end sheet 1

        // === SHEET 2 ===
        if (remainingItems.length > 0) {
          html += `<div class="sheet-label"><i class="fas fa-book-open text-emerald-600"></i> শীট ২ (বুকলেট ইনসাইড — কলাম ১: পৃষ্ঠা ২, কলাম ২: পৃষ্ঠা ৩)</div>`;
          html += `<div class="paper-sheet size-a4-landscape ${marginClass}">`;
          html += `<div class="grid grid-cols-2 gap-x-5 h-full ${fontClass} dense-zero-gap" ${editableAttr} ${styleAttr}>`;

          // Sheet 2 Column 1: Page 2
          html += `<div class="flex flex-col justify-start">`;
          for (const it of sheet2Col1Items) {
            if (it.type === 'SECTION_TITLE') {
              html += `<div class="font-bold text-center bg-slate-100 py-0.5 my-1 border-y border-slate-300" style="font-size: ${fontSize}; line-height: ${lineSpacing};">${this.escape(it.title)}</div>`;
            } else {
              html += this.renderQuestionItem(it.data);
            }
          }
          html += `</div>`;

          // Sheet 2 Column 2: Page 3
          html += `<div class="flex flex-col justify-start border-l border-slate-300 pl-5">`;
          for (const it of sheet2Col2Items) {
            if (it.type === 'SECTION_TITLE') {
              html += `<div class="font-bold text-center bg-slate-100 py-0.5 my-1 border-y border-slate-300" style="font-size: ${fontSize}; line-height: ${lineSpacing};">${this.escape(it.title)}</div>`;
            } else {
              html += this.renderQuestionItem(it.data);
            }
          }
          html += `</div>`;

          html += `</div>`; // end grid
          html += `</div>`; // end sheet 2
        }

        html += `</div>`;
        return html;
      }

      // CASE B: STANDARD 2-COLUMN QUESTION PAPER (MCQ or Single Sheet CQ)
      const isMcq = allItems.some(i => i.type === 'QUESTION' && i.data.options && i.data.options.length > 0);
      const allQuestions = allItems.filter(i => i.type === 'QUESTION');
      const N = allQuestions.length;

      // Intelligent MCQ Adaptive Page Balancing (Modes A, B, C)
      if (isMcq && !isLandscape) {
        let compactLines = 0;
        for (const qItem of allQuestions) {
          const q = qItem.data;
          const titleLines = Math.ceil((q.num.length + 2 + q.text.length) / 38);
          compactLines += Math.max(1, titleLines);
          if (q.preContext) compactLines += q.preContext.split('\n').filter(Boolean).length;
          if (q.stimulus) compactLines += q.stimulus.split('\n').filter(Boolean).length;
          if (q.statements && q.statements.length > 0) compactLines += q.statements.length;
          if (q.options && q.options.length > 0) compactLines += 1;
        }
        let headerLines = 6;
        if (parsedData.header.instructions) headerLines += Math.ceil(parsedData.header.instructions.length / 75);
        const totalLines = compactLines + headerLines;

        let layoutMode = options.layoutMode || 'AUTO';
        if (layoutMode === 'AUTO') {
          if (totalLines > 102) layoutMode = 'C';
          else if (totalLines < 70) layoutMode = 'B';
          else layoutMode = 'A';
        }

        if (layoutMode === 'C') {
          // MODE C: TWO-PAGE BALANCED FLOW
          // Page 1 is filled completely with 2-line options, both columns balanced to reach the bottom.
          // Remaining questions on Page 2 are divided equally across the 2 columns.
          let p1End = allItems.length;
          let p1Col1End = Math.ceil(allItems.length / 2);

          if (options.splitIndex) {
            p1End = options.splitIndex;
            p1Col1End = options.col1End || Math.ceil(p1End / 2);
          } else {
            const headerLines = 6 + (parsedData.header.instructions ? Math.ceil(parsedData.header.instructions.length / 75) : 0);
            const colCap = Math.max(30, 45.0 - headerLines);
            const getQLines = (it) => {
              if (it.type === 'SECTION_TITLE') return 2;
              const q = it.data;
              let l = Math.max(1, Math.ceil((q.num.length + 2 + q.text.length) / 38));
              if (q.preContext) l += q.preContext.split('\n').filter(Boolean).length;
              if (q.stimulus) l += q.stimulus.split('\n').filter(Boolean).length;
              if (q.statements && q.statements.length > 0) l += q.statements.length;
              l += 2; // 2-line options
              l += 0.2; // question spacing
              return l;
            };
            const itemLines = allItems.map(getQLines);

            let bestK = Math.min(allItems.length, 20);
            let bestK1 = Math.ceil(bestK / 2);
            let found = false;

            for (let K = allItems.length; K >= 1; K--) {
              for (let k1 = 1; k1 < K; k1++) {
                let c1 = itemLines.slice(0, k1).reduce((a, b) => a + b, 0);
                let c2 = itemLines.slice(k1, K).reduce((a, b) => a + b, 0);
                if (c1 <= colCap && c2 <= colCap) {
                  bestK = K;
                  bestK1 = k1;
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
            p1End = bestK;
            p1Col1End = bestK1;
          }

          const page1Col1 = allItems.slice(0, p1Col1End);
          const page1Col2 = allItems.slice(p1Col1End, p1End);
          const page2Questions = allItems.slice(p1End);
          const p2Half = Math.ceil(page2Questions.length / 2);
          const page2Col1 = page2Questions.slice(0, p2Half);
          const page2Col2 = page2Questions.slice(p2Half);

          let html = `<div class="${fontClass} dense-zero-gap">`;

          // SHEET 1 (Page 1 - Fully Filled Page with 2-Column Options, Balanced Columns)
          html += `<div class="sheet-label"><i class="fas fa-file-word text-blue-600"></i> পৃষ্ঠা ১ (১ম অংশ — সম্পূর্ণ পেজ ভরাট, ২-কলাম অপশন)</div>`;
          html += `<div class="paper-sheet size-a4-portrait ${marginClass} mb-4 page-break-indicator">${this.renderCropMarks()}`;
          html += `<div class="question-paper ${fontClass} dense-zero-gap orientation-portrait" ${editableAttr} ${styleAttr}>`;
          html += this.renderHeaderBlock(parsedData.header);
          html += `<div class="qp-columns qp-columns-flex" style="display: flex; column-gap: 0.2in;">`;

          // Page 1 Column 1
          html += `<div style="flex: 1; border-right: 1px solid #000000; padding-right: 0.1in;">`;
          for (const item of page1Col1) {
            if (item.type === 'SECTION_TITLE') {
              html += `<div class="font-bold text-center bg-slate-100 py-0.5 my-1 border-y border-slate-300" style="font-size: ${fontSize}; line-height: ${lineSpacing};">${this.escape(item.title)}</div>`;
            } else {
              html += this.renderQuestionItem(item.data, { forceTwoColumns: true });
            }
          }
          html += `</div>`;

          // Page 1 Column 2
          html += `<div style="flex: 1; padding-left: 0.1in;">`;
          for (const item of page1Col2) {
            if (item.type === 'SECTION_TITLE') {
              html += `<div class="font-bold text-center bg-slate-100 py-0.5 my-1 border-y border-slate-300" style="font-size: ${fontSize}; line-height: ${lineSpacing};">${this.escape(item.title)}</div>`;
            } else {
              html += this.renderQuestionItem(item.data, { forceTwoColumns: true });
            }
          }
          html += `</div>`;

          html += `</div></div></div>`;

          // PAGE BREAK INDICATOR
          html += this.renderPageBreak();

          // SHEET 2 (Page 2 - Remaining Questions Divided Equally Across 2 Columns)
          html += `<div class="sheet-label"><i class="fas fa-file-word text-blue-600"></i> পৃষ্ঠা ২ (২য় অংশ — অবশিষ্ট প্রশ্ন ২ কলামে সমান ভাগে বিভক্ত)</div>`;
          html += `<div class="paper-sheet size-a4-portrait ${marginClass}">${this.renderCropMarks()}`;
          html += `<div class="question-paper ${fontClass} dense-zero-gap orientation-portrait" ${editableAttr} ${styleAttr}>`;
          const runningTitle = (parsedData.header.classAndSubject || 'বহুনির্বাচনি অভীক্ষা') + ' - পৃষ্ঠা ২';
          html += `<div class="text-center font-bold text-xs text-slate-700 border-b border-slate-400 pb-1 mb-2">${this.escape(runningTitle)}</div>`;
          html += `<div class="qp-columns qp-columns-flex" style="display: flex; column-gap: 0.2in;">`;

          // Column 1 on Page 2
          html += `<div style="flex: 1; border-right: 1px solid #000000; padding-right: 0.1in;">`;
          for (const item of page2Col1) {
            if (item.type === 'SECTION_TITLE') {
              html += `<div class="font-bold text-center bg-slate-100 py-0.5 my-1 border-y border-slate-300" style="font-size: ${fontSize}; line-height: ${lineSpacing};">${this.escape(item.title)}</div>`;
            } else {
              html += this.renderQuestionItem(item.data, { forceTwoColumns: true });
            }
          }
          html += `</div>`;

          // Column 2 on Page 2
          html += `<div style="flex: 1; padding-left: 0.1in;">`;
          for (const item of page2Col2) {
            if (item.type === 'SECTION_TITLE') {
              html += `<div class="font-bold text-center bg-slate-100 py-0.5 my-1 border-y border-slate-300" style="font-size: ${fontSize}; line-height: ${lineSpacing};">${this.escape(item.title)}</div>`;
            } else {
              html += this.renderQuestionItem(item.data, { forceTwoColumns: true });
            }
          }
          html += `</div>`;

          html += `</div></div></div>`;

          html += `</div>`;
          return html;
        }

        // Single Page (Mode B: Full-fill with 1.45x line spacing, or Mode A: Compact)
        const lineStyle = layoutMode === 'B' ? 'line-height: 1.45;' : `line-height: ${lineSpacing};`;
        let html = `<div class="paper-sheet size-a4-portrait ${marginClass}">${this.renderCropMarks()}`;
        html += `<div class="question-paper ${fontClass} dense-zero-gap orientation-portrait" ${editableAttr} style="${lineStyle} font-size: ${fontSize};">`;
        html += this.renderHeaderBlock(parsedData.header);
        html += `<div class="qp-columns two-columns">`;
        for (const item of allItems) {
          if (item.type === 'SECTION_TITLE') {
            html += `<div class="font-bold text-center bg-slate-100 py-0.5 my-1 border-y border-slate-300" style="font-size: ${fontSize}; line-height: ${lineSpacing};">${this.escape(item.title)}</div>`;
          } else {
            html += this.renderQuestionItem(item.data);
          }
        }
        html += `</div></div></div>`;
        return html;
      }

      // Non-MCQ Standard 2-Column Sheet
      const paperSizeClass = isLandscape ? 'size-a4-landscape' : 'size-a4-portrait';
      let html = `<div class="paper-sheet ${paperSizeClass} ${marginClass}">${this.renderCropMarks()}`;
      html += `<div class="question-paper ${fontClass} dense-zero-gap ${isLandscape ? 'orientation-landscape' : 'orientation-portrait'}" ${editableAttr} ${styleAttr}>`;
      html += this.renderHeaderBlock(parsedData.header);
      html += `<div class="qp-columns ${options.singleColumn ? '' : 'two-columns'}">`;
      for (const item of allItems) {
        if (item.type === 'SECTION_TITLE') {
          html += `<div class="font-bold text-center bg-slate-100 py-0.5 my-1 border-y border-slate-300" style="font-size: ${fontSize}; line-height: ${lineSpacing};">${this.escape(item.title)}</div>`;
        } else {
          html += this.renderQuestionItem(item.data);
        }
      }
      html += `</div></div></div>`;
      return html;
    },

    renderCropMarks() {
      return `<div class="word-crop-marks no-print"><div class="crop-tl"></div><div class="crop-tr"></div><div class="crop-bl"></div><div class="crop-br"></div></div>`;
    },

    renderPageBreak() {
      return `<div class="word-page-break no-print"><span class="word-page-break-badge"><i class="fas fa-file-export text-blue-600"></i> পৃষ্ঠা বিরতি (Page Break)</span></div>`;
    },

    escape(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = QuestionEngine;
  if (typeof window !== 'undefined') window.QuestionEngine = QuestionEngine;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
