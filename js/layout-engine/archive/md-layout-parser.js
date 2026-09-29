/**
 * ============================================================================
 * Fayzar Layout Engine - Markdown Document Layout Parser v1.0
 * ============================================================================
 * Parses structured Markdown with frontmatter, document sections, 2-column flow,
 * question items with right-aligned marks, mathematical formulas, and tables into
 * an Abstract Syntax Tree (AST) ready for Word 2003 (.doc) and Modern Word (.docx).
 * ============================================================================
 */

(function(global) {
  'use strict';

  class MdLayoutParser {

    /**
     * Parse markdown text into a structured document AST
     * @param {string} markdownText - Raw markdown input
     * @param {Object} defaultOptions - Overrides or default layout options
     * @returns {Object} AST object
     */
    static parse(markdownText, defaultOptions = {}) {
      if (!markdownText || typeof markdownText !== 'string') {
        markdownText = '';
      }

      // 1. Extract Frontmatter
      const { frontmatter, body } = MdLayoutParser.extractFrontmatter(markdownText);
      const metadata = Object.assign({}, frontmatter, defaultOptions);

      // 1b. Detect Document & Question Archetype so rules never get confused
      const profile = MdLayoutParser.detectDocumentProfile(markdownText, metadata);

      // 2. Determine template / layout settings
      const templateId = (profile.hasCombinedSections || profile.archetypeId === 'bengali_combined_exam_paper')
        ? 'bengali_combined_exam_paper'
        : (metadata.layout || metadata.templateId || metadata.template || profile.archetypeId || 'question-2col');
      const templates = global.LAYOUT_TEMPLATES || {};
      const templateDef = templates[templateId] || templates['question-2col'] || {};

      const isCqProfile = profile.archetypeId === 'bengali_cq_paper' || templateId === 'bengali-cq-paper' || templateId === 'bengali_cq_paper' || templateId === 'creative-cq';
      const layoutSettings = {
        templateId: templateId,
        columns: (templateId === 'bengali_combined_exam_paper') ? 1 : (isCqProfile ? 2 : parseInt(metadata.columns || templateDef.columns || profile.columns || 1, 10)),
        pageSize: (metadata.pageSize || templateDef.pageSize || 'a4').toLowerCase(),
        orientation: (metadata.orientation || templateDef.orientation || (isCqProfile ? 'landscape' : 'portrait')).toLowerCase(),
        margins: Object.assign({}, templateDef.margins || { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }, metadata.margins || {}),
        stampMarginInches: parseFloat(metadata.stampMarginInches || (profile.stampMarginInches || (templateId === 'legal-deed' ? 4.0 : 0))),
        profile: profile
      };

      // 3. Parse Body Lines into Blocks
      const blocks = MdLayoutParser.parseBodyBlocks(body, layoutSettings);

      return {
        metadata: metadata,
        profile: profile,
        layoutSettings: layoutSettings,
        blocks: blocks
      };
    }

    /**
     * Identifies the exact document and question archetype so rules never get mixed up
     */
    static detectDocumentProfile(text, metadata = {}) {
      if (!text || !text.trim()) {
        return {
          archetypeId: 'bengali_general_doc',
          name: 'বাংলা সাধারণ ডকুমেন্ট',
          reason: 'ডিফল্ট প্রোফাইল',
          isPureEnglish: false,
          fontFamily: 'SutonnyMJ',
          numberingDelimiter: '।',
          hangingIndentDxa: 432,
          subIndentDxa: 864,
          columns: 1,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }

      const bnCharCount = (text.match(/[\u0980-\u09FF]/g) || []).length;
      const totalLetterCount = (text.match(/[a-zA-Z\u0980-\u09FF]/g) || []).length;
      const isPureEnglish = (totalLetterCount > 20 && (bnCharCount / totalLetterCount) < 0.05);

      // 0a. MASTER SECTOR PROFILE MAPPING (From Universal Frontmatter or Profile Tag)
      const docType = (metadata && (metadata.doc_type || metadata.docType || metadata.type || metadata.layoutTag))
        ? String(metadata.doc_type || metadata.docType || metadata.type || metadata.layoutTag).toUpperCase().trim()
        : '';

      if (docType === 'EXAM_GENERAL' || docType === 'GENERAL_EXAM' || docType === 'QUESTION_2COL' || docType === 'PRIMARY_EXAM') {
        return {
          archetypeId: 'bengali_standard_question_paper',
          name: 'বাংলা সাধারণ/প্রাথমিক প্রশ্নপত্র (২-কলাম)',
          reason: 'ফ্রন্টম্যাটার Sector ID: EXAM_GENERAL',
          isPureEnglish: isPureEnglish,
          fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
          numberingDelimiter: isPureEnglish ? '.' : '।',
          hangingIndentDxa: 360,
          subIndentDxa: 720,
          columns: metadata && metadata.columns ? parseInt(metadata.columns, 10) : 2,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }
      if (docType === 'EXAM_CQ' || docType === 'CREATIVE_EXAM' || docType === 'CQ_BOOKLET') {
        return {
          archetypeId: 'bengali_cq_paper',
          name: 'বাংলা সৃজনশীল প্রশ্নপত্র (CQ)',
          reason: 'ফ্রন্টম্যাটার Sector ID: EXAM_CQ',
          isPureEnglish: isPureEnglish,
          fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
          numberingDelimiter: '।',
          hangingIndentDxa: 432,
          subIndentDxa: 864,
          columns: 2,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }
      if (docType === 'EXAM_MCQ' || docType === 'MCQ_EXAM' || docType === 'MCQ_2COL') {
        return {
          archetypeId: 'bengali_mcq_paper',
          name: 'বহুনির্বাচনী প্রশ্নপত্র (MCQ)',
          reason: 'ফ্রন্টম্যাটার Sector ID: EXAM_MCQ',
          isPureEnglish: isPureEnglish,
          fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
          numberingDelimiter: '।',
          hangingIndentDxa: 360,
          subIndentDxa: 0,
          columns: 2,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }
      if (docType === 'EXAM_COMBINED' || docType === 'COMBINED_EXAM') {
        const hasCqMarkers = /(?:ক-বিভাগ|খ-বিভাগ|গ-বিভাগ|ঘ-বিভাগ|গদ্য|কবিতা|সৃজনশীল|উদ্দীপক|দৃশ্যকল্প|---SECTION_BREAK)/i.test(text);
        if (hasCqMarkers) {
          return {
            archetypeId: 'bengali_combined_exam_paper',
            name: 'সম্মিলিত সৃজনশীল ও বহুনির্বাচনী প্রশ্নপত্র',
            reason: 'ফ্রন্টম্যাটার Sector ID: EXAM_COMBINED',
            isPureEnglish: isPureEnglish,
            fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
            numberingDelimiter: '।',
            hangingIndentDxa: 432,
            subIndentDxa: 864,
            columns: 1,
            hasCombinedSections: true,
            tableStyle: 'plain_compact',
            stripAuditNotes: true
          };
        }
        // If frontmatter declared COMBINED but document contains only MCQs and no CQ markers, route to bengali_mcq_paper
        return {
          archetypeId: 'bengali_mcq_paper',
          name: 'বহুনির্বাচনী প্রশ্নপত্র (MCQ)',
          reason: 'ফ্রন্টম্যাটার Sector ID: EXAM_COMBINED কিন্তু সৃজনশীল অংশ অনুপস্থিত থাকায় বহুনির্বাচনী প্রোফাইল কার্যকর',
          isPureEnglish: isPureEnglish,
          fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
          numberingDelimiter: '।',
          hangingIndentDxa: 360,
          subIndentDxa: 0,
          columns: 2,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }
      if (docType === 'OFFICE_PAD' || docType === 'PAD') {
        return {
          archetypeId: 'office_pad',
          name: 'প্রাতিষ্ঠানিক প্যাড ও অফিশিয়াল পত্র',
          reason: 'ফ্রন্টম্যাটার Sector ID: OFFICE_PAD',
          isPureEnglish: isPureEnglish,
          fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
          numberingDelimiter: '.',
          hangingIndentDxa: 0,
          subIndentDxa: 360,
          columns: 1,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }
      if (docType === 'PROTTOYON_CERT' || docType === 'PROTTOYON' || docType === 'TESTIMONIAL_CERT') {
        return {
          archetypeId: 'testimonial_cert',
          name: 'চারিত্রিক প্রত্যয়নপত্র ও প্রশংসাপত্র',
          reason: 'ফ্রন্টম্যাটার Sector ID: PROTTOYON_CERT',
          isPureEnglish: isPureEnglish,
          fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
          numberingDelimiter: '.',
          hangingIndentDxa: 0,
          subIndentDxa: 360,
          columns: 1,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }
      if (docType === 'GOVT_APP' || docType === 'APPLICATION') {
        return {
          archetypeId: 'govt_application',
          name: 'সরকারি ও চাকরির আবেদনপত্র',
          reason: 'ফ্রন্টম্যাটার Sector ID: GOVT_APP',
          isPureEnglish: isPureEnglish,
          fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
          numberingDelimiter: '.',
          hangingIndentDxa: 0,
          subIndentDxa: 360,
          columns: 1,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }
      if (docType === 'OFFICIAL_NOTICE' || docType === 'NOTICE') {
        return {
          archetypeId: 'official_notice_memo',
          name: 'অফিসিয়াল নোটিশ ও স্মারক',
          reason: 'ফ্রন্টম্যাটার Sector ID: OFFICIAL_NOTICE',
          isPureEnglish: isPureEnglish,
          fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
          numberingDelimiter: '.',
          hangingIndentDxa: 0,
          subIndentDxa: 360,
          columns: 1,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }
      if (docType === 'LEGAL_DEED' || docType === 'DEED') {
        return {
          archetypeId: 'legal_deed_contract',
          name: 'আইনি দলিল ও চুক্তিপত্র',
          reason: 'ফ্রন্টম্যাটার Sector ID: LEGAL_DEED',
          isPureEnglish: isPureEnglish,
          fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
          numberingDelimiter: '.',
          hangingIndentDxa: 0,
          subIndentDxa: 360,
          columns: 1,
          stampMarginInches: metadata && metadata.stampMarginInches ? parseFloat(metadata.stampMarginInches) : 3.5,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }

      // User Mandate: Count genuine MCQ questions vs total main questions
      let totalQuestions = 0;
      let mcqQuestions = 0;
      const rawLines = text.split(/\r?\n/);
      let currentHasMcq = false;

      for (let l of rawLines) {
        const trimmed = l.trim();
        if (/^[০-৯0-9]+[।\.\)]\s/.test(trimmed)) {
          totalQuestions++;
          currentHasMcq = false;
        }
        if (/(?:(?:\t|\s{2,})[কa][\.\)]|\([কa]\)).*?(?:(?:\t|\s{2,})[খb][\.\)]|\([খb]\))/i.test(trimmed) ||
            /^(?:[কa][\.\)]|\([কa]\))\s+[^\n]+?(?:(?:\t|\s{2,})[খb][\.\)]|\([খb]\))/i.test(trimmed)) {
          if (!currentHasMcq) {
            mcqQuestions++;
            currentHasMcq = true;
          }
        }
      }

      // Strict MCQ Gate: A document is ONLY an MCQ paper if:
      // 1. It has 18 to 30 MCQs (e.g. standard 20-30 MCQ exam), OR
      // 2. 100% of all questions are MCQs (all questions have options).
      const isStrictMcqPaper = (mcqQuestions >= 10) || (totalQuestions >= 3 && mcqQuestions === totalQuestions) || (totalQuestions >= 10 && mcqQuestions >= totalQuestions * 0.7);

      // 0. EXPLICIT VISION AI LAYOUT TAGS (Highest Priority - Direct Vision AI Classification)
      const layoutTagMatch = text.match(/\[LAYOUT:\s*([A-Za-z0-9_\-]+)\]/i);
      if (layoutTagMatch) {
        const tag = layoutTagMatch[1].toUpperCase();
        if (tag === 'COMBINED_EXAM' || tag === 'BENGALI_COMBINED_EXAM') {
          return {
            archetypeId: 'bengali_combined_exam_paper',
            name: 'সম্মিলিত সৃজনশীল ও বহুনির্বাচনী প্রশ্নপত্র',
            reason: 'Gemini Vision লেআউট ট্যাগ [LAYOUT: COMBINED_EXAM]',
            isPureEnglish: isPureEnglish,
            fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
            numberingDelimiter: '।',
            hangingIndentDxa: 432,
            subIndentDxa: 864,
            columns: 1,
            hasCombinedSections: true,
            tableStyle: 'plain_compact',
            stripAuditNotes: true
          };
        }
        if (tag === 'CQ_BOOKLET' || tag === 'BENGALI_CQ_PAPER') {
          // If document also contains MCQ, it is COMBINED!
          const hasCombinedMcq = /---SECTION_BREAK:MCQ---/i.test(text) || (isStrictMcqPaper && /(?:ক\-বিভাগ|খ\-বিভাগ|সৃজনশীল)/i.test(text));
          if (hasCombinedMcq) {
            return {
              archetypeId: 'bengali_combined_exam_paper',
              name: 'সম্মিলিত সৃজনশীল ও বহুনির্বাচনী প্রশ্নপত্র',
              reason: 'Gemini Vision লেআউট ট্যাগ [LAYOUT: CQ_BOOKLET] কিন্তু নথিতে বহুনির্বাচনী অংশ বিদ্যমান',
              isPureEnglish: isPureEnglish,
              fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
              numberingDelimiter: '।',
              hangingIndentDxa: 432,
              subIndentDxa: 864,
              columns: 1,
              hasCombinedSections: true,
              tableStyle: 'plain_compact',
              stripAuditNotes: true
            };
          }
          return {
            archetypeId: 'bengali_cq_paper',
            name: 'বাংলা সৃজনশীল প্রশ্নপত্র (CQ)',
            reason: 'Gemini Vision লেআউট ট্যাগ [LAYOUT: CQ_BOOKLET]',
            isPureEnglish: isPureEnglish,
            fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
            numberingDelimiter: '।',
            hangingIndentDxa: 432,
            subIndentDxa: 864,
            columns: 2,
            tableStyle: 'plain_compact',
            stripAuditNotes: true
          };
        }
        if (tag === 'MCQ_2COL' || tag === 'BENGALI_MCQ_PAPER') {
          if (isStrictMcqPaper) {
            return {
              archetypeId: 'bengali_mcq_paper',
              name: 'বহুনির্বাচনী প্রশ্নপত্র (MCQ)',
              reason: 'Gemini Vision লেআউট ট্যাগ [LAYOUT: MCQ_2COL] ও ২০-৩০টি বা শতভাগ বহুনির্বাচনী প্রশ্ন সত্য প্রমাণিত',
              isPureEnglish: isPureEnglish,
              fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
              numberingDelimiter: '।',
              hangingIndentDxa: 360,
              subIndentDxa: 0,
              columns: 2,
              tableStyle: 'plain_compact',
              stripAuditNotes: true
            };
          }
          return {
            archetypeId: 'bengali_standard_question_paper',
            name: 'বাংলা সাধারণ/প্রাথমিক প্রশ্নপত্র (২-কলাম)',
            reason: 'নথিতে ২০-৩০টি বহুনির্বাচনী প্রশ্ন না থাকায় সাধারণ ২-কলাম প্রশ্নপত্র প্রোফাইল কার্যকর',
            isPureEnglish: isPureEnglish,
            fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
            numberingDelimiter: '।',
            hangingIndentDxa: 360,
            subIndentDxa: 720,
            columns: 2,
            tableStyle: 'plain_compact',
            stripAuditNotes: true
          };
        }
        if (tag === 'QUESTION_2COL' || tag === 'STANDARD_EXAM' || tag === 'SHORT_QUESTION') {
          return {
            archetypeId: 'bengali_standard_question_paper',
            name: 'বাংলা সাধারণ/প্রাথমিক প্রশ্নপত্র (২-কলাম)',
            reason: `Gemini Vision লেআউট ট্যাগ [LAYOUT: ${tag}]`,
            isPureEnglish: isPureEnglish,
            fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
            numberingDelimiter: '।',
            hangingIndentDxa: 360,
            subIndentDxa: 720,
            columns: 2,
            tableStyle: 'plain_compact',
            stripAuditNotes: true
          };
        }
        if (tag === 'MATH_SCIENCE') {
          return {
            archetypeId: 'math_science_paper',
            name: 'গণিত ও বিজ্ঞান প্রশ্নপত্র',
            reason: 'Gemini Vision লেআউট ট্যাগ [LAYOUT: MATH_SCIENCE]',
            isPureEnglish: isPureEnglish,
            fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
            numberingDelimiter: '।',
            hangingIndentDxa: 432,
            subIndentDxa: 864,
            columns: 2,
            tableStyle: 'plain_compact',
            stripAuditNotes: true
          };
        }
        if (tag === 'OFFICIAL_NOTICE') {
          return {
            archetypeId: 'official_notice_memo',
            name: 'অফিসিয়াল নোটিশ ও মেমোরেন্ডাম',
            reason: 'Gemini Vision লেআউট ট্যাগ [LAYOUT: OFFICIAL_NOTICE]',
            isPureEnglish: isPureEnglish,
            fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
            numberingDelimiter: '.',
            hangingIndentDxa: 0,
            subIndentDxa: 360,
            columns: 1,
            tableStyle: 'plain_compact',
            stripAuditNotes: true
          };
        }
        if (tag === 'APPLICATION_LETTER' || tag === 'GENERAL_DOC') {
          return {
            archetypeId: 'single_column_standard_document',
            name: 'এক-কলাম সাধারণ ডকুমেন্ট / আবেদনপত্র',
            reason: `Gemini Vision লেআউট ট্যাগ [LAYOUT: ${tag}]`,
            isPureEnglish: isPureEnglish,
            fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
            numberingDelimiter: '.',
            hangingIndentDxa: 0,
            subIndentDxa: 360,
            columns: 1,
            tableStyle: 'plain_compact',
            stripAuditNotes: true
          };
        }
        if (tag === 'LEGAL_DEED') {
          return {
            archetypeId: 'legal_deed_contract',
            name: 'আইনি দলিল ও চুক্তিপত্র',
            reason: 'Gemini Vision লেআউট ট্যাগ [LAYOUT: LEGAL_DEED]',
            isPureEnglish: isPureEnglish,
            fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
            numberingDelimiter: '.',
            hangingIndentDxa: 0,
            subIndentDxa: 360,
            columns: 1,
            stampMarginInches: 3.5,
            tableStyle: 'plain_compact',
            stripAuditNotes: true
          };
        }
      }

      // ARCHETYPE 1: English Language Exam Paper
      if (isPureEnglish && /(?:Time:\s*\d|Full Marks:|Part-[A-Z]|Grammar|Composition|Rewrite|Fill in the blanks|Make sentences|Answer the question|Question)/i.test(text)) {
        return {
          archetypeId: 'english_question_paper',
          name: 'ইংরেজি প্রশ্নপত্র',
          reason: 'ইংরেজি বিষয়ের ব্যাকরণ, উদ্দীপক বা কম্পোজিশন ভিত্তিক প্রশ্নপত্র',
          isPureEnglish: true,
          fontFamily: 'Times New Roman',
          numberingDelimiter: '.',
          hangingIndentDxa: 432,
          subIndentDxa: 864,
          columns: 2,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }

      // ARCHETYPE 2: Official Government/Institutional Notice
      if (/(?:স্মারক নং|স্মারক নম্বর|গণপ্রজাতন্ত্রী বাংলাদেশ|উপজেলা নির্বাহী|সদয় অবগতি|কার্যার্থে|নোটিশ)/i.test(text)) {
        return {
          archetypeId: 'official_notice_memo',
          name: 'অফিসিয়াল নোটিশ ও মেমোরেন্ডাম',
          reason: 'সরকারি বা প্রাতিষ্ঠানিক স্মারক নম্বর ও নোটিশ ফরম্যাট',
          isPureEnglish: false,
          fontFamily: 'SutonnyMJ',
          numberingDelimiter: '.',
          hangingIndentDxa: 0,
          subIndentDxa: 360,
          columns: 1,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }

      // ARCHETYPE 3: Legal Deed / Contract
      if (/(?:চুক্তিপত্র|১ম পক্ষ|২য় পক্ষ|নন-জুডিশিয়াল স্ট্যাম্প|দলিল)/i.test(text)) {
        return {
          archetypeId: 'legal_deed_contract',
          name: 'আইনি দলিল ও চুক্তিপত্র',
          reason: 'স্ট্যাম্প গ্যাপসহ আইনি চুক্তি বা দলিল',
          isPureEnglish: false,
          fontFamily: 'SutonnyMJ',
          numberingDelimiter: '.',
          hangingIndentDxa: 0,
          subIndentDxa: 360,
          columns: 1,
          stampMarginInches: 3.5,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }

      // ARCHETYPE 4: Combined Bengali Exam Paper (CQ + MCQ in one document)
      const hasExplicitCqKeyword = /(?:ক-বিভাগ|খ-বিভাগ|গ-বিভাগ|ঘ-বিভাগ|গদ্য|কবিতা|সৃজনশীল|উদ্দীপক|দৃশ্যকল্প)/i.test(text) || (/---SECTION_BREAK/i.test(text));
      const hasCqSubQuestionsWithMarks = /(?:^|\n)\s*(?:\([কa]\)|[কa][\.।])[^\n]+\[[১1]\][\s\S]*?(?:^|\n)\s*(?:\([খb]\)|[খb][\.।])[^\n]+\[[২2]\]/m.test(text);
      const hasCqMarkers = hasExplicitCqKeyword || hasCqSubQuestionsWithMarks;
      const hasCombinedMcq = /---SECTION_BREAK:MCQ---/i.test(text) || (isStrictMcqPaper && /(?:ক\-বিভাগ|খ\-বিভাগ|সৃজনশীল)/i.test(text));

      if (hasCqMarkers && hasCombinedMcq) {
        return {
          archetypeId: 'bengali_combined_exam_paper',
          name: 'সম্মিলিত সৃজনশীল ও বহুনির্বাচনী প্রশ্নপত্র',
          reason: 'একই নথিতে সৃজনশীল (১-কলাম) ও বহুনির্বাচনী (২-কলাম) উভয়ের উপস্থিতি',
          isPureEnglish: false,
          fontFamily: 'SutonnyMJ',
          numberingDelimiter: '।',
          hangingIndentDxa: 432,
          subIndentDxa: 864,
          columns: 1, // Default CQ is 1-column, MCQ transitions via section break
          hasCombinedSections: true,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }

      // ARCHETYPE 5: Multiple Choice Questions (MCQ) - STRICT GATE: ONLY when 20-30 MCQs or 100% of questions are MCQs!
      if (isStrictMcqPaper) {
        return {
          archetypeId: 'bengali_mcq_paper',
          name: 'বহুনির্বাচনী প্রশ্নপত্র (MCQ)',
          reason: '২০-৩০টি বা শতভাগ বহুনির্বাচনী প্রশ্ন সংবলিত প্রশ্নপত্র',
          isPureEnglish: false,
          fontFamily: 'SutonnyMJ',
          numberingDelimiter: '।',
          hangingIndentDxa: 360,
          subIndentDxa: 0,
          columns: 2,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }

      // ARCHETYPE 5.1: Mathematics & Science Question Paper
      if (/\$|\\frac|\\sqrt|\\[a-zA-Z]+|\^2|\+.*=/.test(text) || /(?:গণিত|পদার্থবিজ্ঞান|রসায়ন|সমীকরণ|বীজগণিত|জ্যামিতি)/i.test(text)) {
        return {
          archetypeId: 'math_science_paper',
          name: 'গণিত ও বিজ্ঞান প্রশ্নপত্র',
          reason: 'গাণিতিক সমীকরণ, সংকেত বা ভগ্নাংশ সংবলিত প্রশ্নপত্র',
          isPureEnglish: false,
          fontFamily: 'SutonnyMJ',
          numberingDelimiter: '।',
          hangingIndentDxa: 432,
          subIndentDxa: 864,
          columns: 2,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }

      // ARCHETYPE 6: Bengali Creative Question Paper (CQ) - Specifically for Class 6-12 with Stimulus and 4-tier sub-questions
      if (/(?:উদ্দীপক|দৃশ্যকল্প|সৃজনশীল)/i.test(text) || (/(?:ক\.\s*[^\n]+\s*খ\.\s*[^\n]+\s*গ\.)/.test(text) && /\[[১-৪\d]\]/.test(text))) {
        return {
          archetypeId: 'bengali_cq_paper',
          name: 'বাংলা সৃজনশীল প্রশ্নপত্র (CQ)',
          reason: 'উদ্দীপক ও ক, খ, গ, ঘ উপ-প্রশ্ন সংবলিত সৃজনশীল কাঠামো',
          isPureEnglish: false,
          fontFamily: 'SutonnyMJ',
          numberingDelimiter: '।',
          hangingIndentDxa: 432,
          subIndentDxa: 864,
          columns: 2,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }

      // ARCHETYPE 7: Standard Bengali Exam Paper / Primary School Exam / Short Questions (১ম থেকে ৫ম শ্রেণি ও সাধারণ ছোট প্রশ্ন)
      if (/(?:শ্রেণি|বিষয়|সময়|পূর্ণমান|পরীক্ষা|সংক্ষিপ্ত\s*প্রশ্ন|শূন্যস্থান|উত্তর\s*দাও)/i.test(text) || /^[০-৯0-9]+[।\.\)]\s/m.test(text)) {
        return {
          archetypeId: 'bengali_standard_question_paper',
          name: 'বাংলা সাধারণ/প্রাথমিক প্রশ্নপত্র (২-কলাম)',
          reason: '১ম-৫ম শ্রেণি বা সাধারণ ছোট প্রশ্ন সংবলিত ২-কলাম প্রশ্নপত্র',
          isPureEnglish: isPureEnglish,
          fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
          numberingDelimiter: isPureEnglish ? '.' : '।',
          hangingIndentDxa: 360,
          subIndentDxa: 720,
          columns: 2,
          tableStyle: 'plain_compact',
          stripAuditNotes: true
        };
      }

      // Fallback Default Question Paper
      return {
        archetypeId: isPureEnglish ? 'english_question_paper' : 'bengali_standard_question_paper',
        name: isPureEnglish ? 'ইংরেজি প্রশ্নপত্র' : 'বাংলা সাধারণ প্রশ্নপত্র (২-কলাম)',
        reason: 'স্বয়ংক্রিয় ডিটেকশন',
        isPureEnglish: isPureEnglish,
        fontFamily: isPureEnglish ? 'Times New Roman' : 'SutonnyMJ',
        numberingDelimiter: isPureEnglish ? '.' : '।',
        hangingIndentDxa: 360,
        subIndentDxa: 720,
        columns: 2,
        tableStyle: 'plain_compact',
        stripAuditNotes: true
      };
    }

    /**
     * Extracts YAML frontmatter between leading '---' delimiters or smart extracts from plain text
     */
    static extractFrontmatter(text) {
      // Try standard closed frontmatter: ---\n...\n---
      let match = text.match(/^\s*---\s*[\r\n]([\s\S]*?)[\r\n]---\s*[\r\n]?([\s\S]*)$/);
      // Also try unclosed frontmatter: ---\n<key:val lines>\n<non-key line starts body>
      if (!match) {
        match = text.match(/^\s*---\s*[\r\n]([\s\S]*?)(?=\n[^\s#:][^\n]*\n|$)/);
        if (match) {
          // Re-split: frontmatter is lines starting with optional ## and containing ':'
          const lines = text.replace(/^\s*---\s*\n/, '').split(/\r?\n/);
          let yamlLines = [];
          let bodyStart = 0;
          for (let i = 0; i < lines.length; i++) {
            const stripped = lines[i].replace(/^#+\s*/, '').trim();
            if (stripped.includes(':') && /^[a-zA-Z_]/.test(stripped)) {
              yamlLines.push(stripped);
              bodyStart = i + 1;
            } else if (stripped === '' && i < 3) {
              bodyStart = i + 1; // skip blank lines in header
            } else {
              break;
            }
          }
          match = [null, yamlLines.join('\n'), lines.slice(bodyStart).join('\n')];
        }
      }

      let frontmatter = {};
      let body = text.trim();

      if (match) {
        const yamlStr = match[1];
        body = (match[2] || '').trim();
        const lines = yamlStr.split(/\r?\n/);
        for (const line of lines) {
          // Strip leading markdown heading markers: ## doc_type: → doc_type:
          const cleanLine = line.replace(/^#+\s*/, '').trim();
          const colonIdx = cleanLine.indexOf(':');
          if (colonIdx > 0) {
            const key = cleanLine.slice(0, colonIdx).trim();
            const val = cleanLine.slice(colonIdx + 1).trim();
            if (key && /^[a-zA-Z_]/.test(key)) {
              frontmatter[key] = val.replace(/^["']|["']$/g, '');
            }
          }
        }
      }

      // Explicit Vision Layout Tag / Profile extraction & clean stripping from body
      const tagMatch = body.match(/^\s*\[(?:LAYOUT|DOC_PROFILE):\s*([^\]]+)\]\s*[\r\n]?/im);
      if (tagMatch) {
        const rawContent = tagMatch[1];
        if (rawContent.includes('|') || rawContent.includes(':') || rawContent.includes('=')) {
          const parts = rawContent.split('|');
          for (const part of parts) {
            const p = part.trim();
            if (p.includes(':') || p.includes('=')) {
              const sep = p.includes(':') ? ':' : '=';
              const k = p.split(sep)[0].trim().toLowerCase();
              const v = p.split(sep)[1].trim();
              if (k === 'type' || k === 'doc_type') frontmatter.doc_type = v.toUpperCase();
              if (k === 'grade') frontmatter.grade = v;
              if (k === 'columns') frontmatter.columns = v;
            } else if (!frontmatter.layoutTag) {
              frontmatter.layoutTag = p.toUpperCase();
            }
          }
        } else {
          frontmatter.layoutTag = rawContent.trim().toUpperCase();
        }
        body = body.replace(/^\s*\[(?:LAYOUT|DOC_PROFILE):[^\]]+\]\s*[\r\n]?/im, '').trim();
      }

      // Smart Header Extractor: If institute is missing, extract from the start of body
      if (!frontmatter.institute) {
        const extracted = MdLayoutParser.extractHeaderFromPlainText(body);
        if (extracted.metadata && Object.keys(extracted.metadata).length > 0) {
          frontmatter = Object.assign({}, extracted.metadata, frontmatter);
          body = extracted.bodyText;
        }
      }

      return { frontmatter, body };
    }

    /**
     * Auto-extracts institutional exam header lines from raw text before questions begin
     */
    static extractHeaderFromPlainText(bodyText) {
      const lines = bodyText.split(/\r?\n/);
      const metadata = {};
      const bodyLines = [];
      let inHeader = true;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          if (!inHeader) bodyLines.push('');
          continue;
        }

        if (inHeader) {
          const cleanLine = line.replace(/^[\*\#\-\s]+/, '').trim();
          // Stop header extraction if first question, category division, or part begins
          if (/^[০-৯0-9]+[।\.\)]\s/.test(cleanLine) || /^(?:ক|খ|গ|ঘ|ঙ|চ)\-বিভাগ/i.test(cleanLine) || /^Part\s*[-–—:]/i.test(cleanLine)) {
            inHeader = false;
            bodyLines.push(line);
            continue;
          }

          if (!metadata.institute && /(?:স্কুল|বিদ্যালয়|মডেল|কলেজ|মাদরাসা|মাদ্রাসা|ইনস্টিটিউট|School|College|Academy|University)/i.test(cleanLine)) {
            metadata.institute = cleanLine;
            continue;
          }
          if (!metadata.exam && /(?:পরীক্ষা|সেমিস্টার|মূল্যায়ন|Exam|Examination|Test)/i.test(cleanLine)) {
            metadata.exam = cleanLine;
            continue;
          }
          if (!metadata.grade && /(?:শ্রেণি|Class)\s*[:\-]?\s*([^|\n\r]+)/i.test(cleanLine)) {
            const m = cleanLine.match(/(?:শ্রেণি|Class)\s*[:\-]?\s*([^|\n\r]+)/i);
            metadata.grade = m[1].trim();
            const subjMatch = cleanLine.match(/(?:বিষয়|Subject)\s*[:\-]?\s*([^|\n\r]+)/i);
            if (subjMatch) metadata.subject = subjMatch[1].trim();
            const scMatch = cleanLine.match(/(?:বিষয়\s*কোড|Subject\s*Code)\s*[:\-]?\s*([০-৯0-9]+)/i);
            if (scMatch) metadata.subjectCode = scMatch[1];
            continue;
          }
          if (/(?:বিষয়|Subject)/i.test(cleanLine)) {
            const scMatch = cleanLine.match(/(?:বিষয়\s*কোড|Subject\s*Code)\s*[:\-]?\s*([০-৯0-9]+)/i);
            if (scMatch && !metadata.subjectCode) metadata.subjectCode = scMatch[1];

            let subjRemainder = cleanLine;
            if (scMatch) subjRemainder = subjRemainder.replace(scMatch[0], '').trim();
            const subjMatch = subjRemainder.match(/(?:বিষয়|Subject)\s*[:\-]?\s*([^|\n\r]+)/i);
            if (subjMatch && !metadata.subject) metadata.subject = subjMatch[1].trim();
            continue;
          }
          if (/(?:সময়|Time|পূর্ণমান|Full\s*Marks)/i.test(cleanLine)) {
            const tMatch = cleanLine.match(/(?:সময়|Time)\s*[:\-]?\s*([^;,\n|]+?)(?=(?:পূর্ণমান|সৃজনশীল|বহুনির্বাচন|$))/i);
            if (tMatch && !metadata.time) metadata.time = tMatch[1].trim();

            const mMatch = cleanLine.match(/(?:পূর্ণমান|Full\s*Marks|Marks|মান)\s*[:\-]?\s*([^;,\n|]+)/i);
            if (mMatch && !metadata.fullMarks) metadata.fullMarks = mMatch[1].trim();

            const subHMatch = cleanLine.match(/(?:সৃজনশীল\s*অভীক্ষা|বহুনির্বাচনি\s*অভীক্ষা|রচনামূলক)/i);
            if (subHMatch && !metadata.subHeader) metadata.subHeader = subHMatch[0].trim();

            continue;
          }
          if (!metadata.subHeader && /(?:সৃজনশীল\s*অভীক্ষা|বহুনির্বাচনি\s*অভীক্ষা|রচনামূলক)/i.test(cleanLine)) {
            metadata.subHeader = cleanLine;
            continue;
          }
          if (!metadata.note && /^(?:\[?বিশেষ\s*দ্রষ্টব্য|\[\s*নোট|\bদ্রষ্টব্য)/i.test(cleanLine)) {
            metadata.note = cleanLine;
            continue;
          }

          bodyLines.push(line);
        } else {
          bodyLines.push(line);
        }
      }

      return { metadata, bodyText: bodyLines.join('\n') };
    }

    /**
     * Parses the markdown body lines into structured block elements
     */
    static parseBodyBlocks(bodyText, layoutSettings) {
      const lines = bodyText.split(/\r?\n/);
      const blocks = [];
      let i = 0;
      let isInMcqSection = false;

      while (i < lines.length) {
        let line = lines[i].trim();

        // Skip empty lines
        if (!line) {
          i++;
          continue;
        }

        // Skip residual audit note headers & bullet lists entirely
        if (/^\[\s*(?:নোট|পরিবর্তনসমূহ|সংশোধনী|অডিট|খসড়া|Note|Audit)/i.test(line) ||
            /^\s*[-•]\s*(?:খসড়া|মূল ছবি|সকল উদ্দীপক|প্রশ্নের ক্রমিক|নম্বর প্রদান|বিষয় কোড|বানান সংশোধন|প্রশ্ন\s*[০-৯0-9]+)/.test(line)) {
          i++;
          continue;
        }

        // Figure / Diagram Placeholder tag
        if (/^\[\s*(?:চিত্র|ছবি)\s*আছে[^\]]*\]$/i.test(line)) {
          blocks.push({
            type: 'figure',
            text: line
          });
          i++;
          continue;
        }

        // Horizontal Rule / Page Break
        if (/^(\-{3,}|\={3,}|\*{3,})$/.test(line)) {
          blocks.push({ type: 'hr' });
          i++;
          continue;
        }

        // Section Break for MCQ or multi-layout (e.g., ---SECTION_BREAK:MCQ--- or ---SECTION_BREAK--- or natural Bengali MCQ header)
        const isExplicitSectionBreak = /^---(?:SECTION_BREAK(?::[A-Za-z0-9_\-]+)?|MCQ_SECTION)---$/i.test(line) ||
          /^\[(?:SECTION_BREAK(?::[A-Za-z0-9_\-]+)?|MCQ_SECTION)\]$/i.test(line);
        const isMcqSectionStartLine = !isInMcqSection && /^(?:#{1,6}\s*)?(?:(?:ক|খ|গ|ঘ|ঙ|চ)\s*[-–—:]\s*)?(?:বহুনির্বাচন[ীি]|নৈর্ব্যক্তিক|MCQ)(?:\s*(?:প্রশ্ন|অভীক্ষা|অংশ|বিভাগ))?/i.test(line);

        // Natural Institutional Header detection preceding MCQ in combined papers
        let isInstitutionalMcqHeader = false;
        if (!isInMcqSection && i > 3 && /(?:স্কুল|বিদ্যালয়|মডেল|কলেজ|মাদরাসা|ইনস্টিটিউট|School|College)/i.test(line)) {
          for (let look = i; look < Math.min(lines.length, i + 9); look++) {
            if (/(?:বহুনির্বাচন[ীি]|নৈর্ব্যক্তিক|MCQ)/i.test(lines[look])) {
              isInstitutionalMcqHeader = true;
              break;
            }
          }
        }

        if (isExplicitSectionBreak || isMcqSectionStartLine || isInstitutionalMcqHeader) {
          isInMcqSection = true;
          const mcqHeader = {};
          if (isMcqSectionStartLine) {
            mcqHeader.title = line.replace(/^#{1,6}\s+/, '').trim();
            i++;
          } else if (isInstitutionalMcqHeader) {
            mcqHeader.institute = line.replace(/^#{1,6}\s+/, '').trim();
            i++;
          } else if (isExplicitSectionBreak) {
            i++;
          }
          while (i < lines.length) {
            const hLine = lines[i].trim();
            if (!hLine) { i++; continue; }
            if (/^[০-৯0-9]+[।\.\)]\s/.test(hLine)) break;
            if (/^#{1,6}\s+(.*)$/.test(hLine)) {
              mcqHeader.title = hLine.replace(/^#{1,6}\s+/, '');
              i++;
              continue;
            }
            if (!mcqHeader.institute && /(?:স্কুল|বিদ্যালয়|মডেল|কলেজ|মাদরাসা|মাদ্রাসা|ইনস্টিটিউট|School|College)/i.test(hLine)) {
              mcqHeader.institute = hLine;
              i++;
              continue;
            }
            if (!mcqHeader.subHeader && /(?:দিনাজপুর|ঢাকা|চট্টগ্রাম|উপজেলা|জেলা|ফুলবাড়ী|ফুলবাড়ি|রাস্তা|পোস্ট)/i.test(hLine)) {
              mcqHeader.subHeader = hLine;
              i++;
              continue;
            }
            if (!mcqHeader.exam && /(?:পরীক্ষা|সেমিস্টার|মূল্যায়ন|Exam)/i.test(hLine)) {
              mcqHeader.exam = hLine;
              i++;
              continue;
            }
            if (!mcqHeader.subjectCode && /(?:বিষয়\s*কোড|Subject\s*Code)/i.test(hLine)) {
              mcqHeader.subjectCode = hLine;
              i++;
              continue;
            }
            if (!mcqHeader.grade && /(?:শ্রেণি|Class)/i.test(hLine)) {
              mcqHeader.grade = hLine;
              i++;
              continue;
            }
            if (!mcqHeader.timeMarks && /(?:সময়|Time|পূর্ণমান|Full\s*Marks)/i.test(hLine)) {
              mcqHeader.timeMarks = hLine;
              i++;
              continue;
            }
            if (!mcqHeader.title && /(?:বহুনির্বাচনি|নৈর্ব্যক্তিক|MCQ)/i.test(hLine)) {
              mcqHeader.title = hLine;
              i++;
              continue;
            }
            if (!mcqHeader.note && /^(?:\[?বিশেষ\s*দ্রষ্টব্য|\[\s*নোট|\bদ্রষ্টব্য)/i.test(hLine)) {
              mcqHeader.note = hLine;
              i++;
              continue;
            }
            if (!mcqHeader.subHeader) {
              mcqHeader.subHeader = hLine;
            } else {
              mcqHeader.note = (mcqHeader.note ? mcqHeader.note + ' ' : '') + hLine;
            }
            i++;
          }
          blocks.push({
            type: 'section_break',
            layout: '2_column',
            target: 'mcq',
            mcqHeader: mcqHeader
          });
          continue;
        }

        // Split Left-Right Header (e.g., Time: 2 hours    Full Marks: 50)
        const timeMarksMatch = line.match(/(?:Time|সময়)\s*[:\-]\s*([^|\n\r]+?)(?:\s{2,}|\t|\s+)(?:Full\s*Marks|Marks|পূর্ণমান)\s*[:\-]\s*([^|\n\r]+)/i);
        if (timeMarksMatch) {
          blocks.push({
            type: 'header_time_marks',
            time: `Time: ${timeMarksMatch[1].trim()}`,
            marks: `Full Marks: ${timeMarksMatch[2].trim()}`
          });
          i++;
          continue;
        }

        // Section / Part Heading (e.g., Part-A: Grammar (30 Marks) or বিভাগ: ক)
        if (/^(?:Part\s*[-–—:]\s*[A-Z]|(?:ক|খ|গ|ঘ|ঙ|চ)\s*[-–—]\s*বিভাগ|বিভাগ\s*[:\-])/i.test(line)) {
          blocks.push({
            type: 'heading',
            level: 2,
            text: line
          });
          i++;
          continue;
        }

        // Headings (#, ##, ###, ####) or Question with markdown heading (e.g. ## ১।, ## 1.)
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          const hText = headingMatch[2].trim();
          // If the heading is actually a Question Number (e.g. ## ১।, ## 1., ## ১):
          const qHeadingMatch = hText.match(/^([০-৯0-9]+)\s*([।\.\|\)\:\-])(?:\s*(.*))?$/);
          if (qHeadingMatch) {
            line = hText; // Strips the ## and falls through to Question Item parser!
          } else {
            if (/(?:বহুনির্বাচন|নৈর্ব্যক্তিক|MCQ)/i.test(hText)) {
              isInMcqSection = true;
              blocks.push({ type: 'section_break', layout: '2_column', target: 'mcq' });
            }
            blocks.push({
              type: 'heading',
              level: headingMatch[1].length,
              text: hText
            });
            i++;
            continue;
          }
        }

        // Blockquote / Stimulus Box (> ...)
        if (line.startsWith('>')) {
          const quoteLines = [];
          while (i < lines.length && lines[i].trim().startsWith('>')) {
            quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
            i++;
          }
          blocks.push({
            type: 'stimulus_box',
            text: quoteLines.join('\n').trim()
          });
          continue;
        }

        // Table (| Col 1 | Col 2 |)
        if (line.startsWith('|') && line.endsWith('|')) {
          const tableLines = [];
          while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
            tableLines.push(lines[i].trim());
            i++;
          }
          const tableBlock = MdLayoutParser.parseMarkdownTable(tableLines);
          if (tableBlock) {
            blocks.push(tableBlock);
          }
          continue;
        }

        // Question Item (1., 1।, 1|, 1), 1-, 1: or ১., ১।, ১|)
        const questionMatch = line.match(/^([০-৯0-9]+)\s*([।\.\|\)\:\-])\s*(.*)$/);
        if (questionMatch) {
          const qNum = questionMatch[1];
          const rawDelim = questionMatch[2];
          let qText = questionMatch[3];
          let qMarks = '';

          // Strip residual audit note headers attached to question serial e.g. "১২। [নোট ও পরিবর্তনসমূহ:"
          qText = qText.replace(/\[\s*(?:নোট|পরিবর্তনসমূহ|সংশোধনী|অডিট|খসড়া|Note|Audit)[^\]]*\]?/gi, '').trim();
          // Strip board / chapter citations e.g. [ঢাকা বোর্ড-২০২৩], (দিনাজপুর বোর্ড ২০১৭), [অধ্যায়-৩]
          qText = qText.replace(/\[\s*(?:(?:ঢাকা|কুমিল্লা|চট্টগ্রাম|রাজশাহী|যশোর|বরিশাল|সিলেট|দিনাজপুর|ময়মনসিংহ|বাংলাদেশ|কারিগরি|মাদরাসা)\s*বোর্ড|বোর্ড|ক্যাডেট\s*কলেজ|অধ্যায়|সহপাঠ|পৃষ্ঠা)[^\]]*\]/gi, '').trim();
          qText = qText.replace(/\((?:(?:ঢাকা|কুমিল্লা|চট্টগ্রাম|রাজশাহী|যশোর|বরিশাল|সিলেট|দিনাজপুর|ময়মনসিংহ|বাংলাদেশ|কারিগরি|মাদরাসা)\s*বোর্ড|বোর্ড|ক্যাডেট\s*কলেজ)[^\)]*\)/gi, '').trim();

          // Extract right-aligned marks [0.5x10=5], [1x5=5], [১০], [১] at end of line (allowing spaces)
          const marksMatch = qText.match(/\s*\[\s*([০-৯0-9a-zA-Z\s\*\+\-\=\/×÷\.\,\:\;]+?)\s*\]\s*$/);
          if (marksMatch) {
            qMarks = marksMatch[1].trim();
            qText = qText.replace(/\s*\[\s*[০-৯0-9a-zA-Z\s\*\+\-\=\/×÷\.\,\:\;]+\s*\]\s*$/, '').trim();
          }

          const questionBlock = {
            type: 'question',
            id: qNum + (rawDelim === '|' ? '.' : rawDelim),
            number: qNum,
            delimiter: (rawDelim === '|' ? '.' : rawDelim),
            text: qText,
            marks: qMarks,
            subQuestions: []
          };

          // If qText starts with an inline sub-question (e.g. ১২। ক. ... or 9. (a) ...)
          const inlineSubMatch = qText.match(/^(\([ক-ঘa-z0-9০-৯]+\)|(?:[iIvVxX]+|[ক-ঘa-z0-9০-৯])[\.\)])\s*(.*)$/i);
          if (inlineSubMatch) {
            const inlineSubId = inlineSubMatch[1];
            let inlineSubText = inlineSubMatch[2];
            let inlineSubMarks = qMarks;

            const sMarksMatch = inlineSubText.match(/\s*\[\s*([০-৯0-9a-zA-Z\s\*\+\-\=\/×÷\.\,\:\;]+?)\s*\]\s*$/)
              || inlineSubText.match(/(?:(?:\?|।|:)\s*|\t|\s{2,})([০-৯0-9]{1,2})\s*$/);
            if (sMarksMatch) {
              inlineSubMarks = sMarksMatch[1].trim();
              inlineSubText = inlineSubText.replace(/\s*\[\s*[০-৯0-9a-zA-Z\s\*\+\-\=\/×÷\.\,\:\;]+\s*\]\s*$/, '')
                .replace(/(?:(?:\?|।|:)\s*|\t|\s{2,})[০-৯0-9]{1,2}\s*$/, (m) => m.startsWith('?') ? '?' : (m.startsWith('।') ? '।' : (m.startsWith(':') ? ':' : ''))).trim();
            }

            questionBlock.text = '';
            questionBlock.marks = '';
            questionBlock.subQuestions.push({
              subId: inlineSubId,
              text: inlineSubText,
              marks: inlineSubMarks,
              isMcqOptionsRow: false
            });
          }

          i++;

          // ONLY look ahead for immediate sub-questions (a., b., c. or (a), (b) or ক., খ.)
          while (i < lines.length) {
            const subLine = lines[i].trim();
            if (!subLine) {
              i++;
              continue;
            }

            // Skip residual audit notes and bullet points inside question processing!
            if (/^\[\s*(?:নোট|পরিবর্তনসমূহ|সংশোধনী|অডিট|খসড়া|Note|Audit)/i.test(subLine) ||
                /^\s*[-•]\s*(?:খসড়া|মূল ছবি|সকল উদ্দীপক|প্রশ্নের ক্রমিক|নম্বর প্রদান|বিষয় কোড|বানান সংশোধন|প্রশ্ন\s*[০-৯0-9]+)/.test(subLine)) {
              i++;
              continue;
            }

            // Boundary defense: If this question already has subquestions and another 'ক' or 'a' appears, break to avoid absorbing next question
            if (questionBlock.subQuestions && questionBlock.subQuestions.length > 0 && /^(\([কa]\)|[কa][\.\)])/i.test(subLine)) {
              // Exception: If existing subQuestions are ONLY Roman numeral statements or prompt text (e.g. i., ii., iii., 'নিচের কোনটি সঠিক?'),
              // then 'ক.' or 'a.' is the MCQ option choices line for this same question! Do NOT break!
              const hasOnlyRomanOrPrompt = questionBlock.subQuestions.every(s => 
                s.isPromptText || /^[iIvVxX]+[\.\)]/i.test(s.subId || '') || /^\([iIvVxX]+\)/i.test(s.subId || '')
              );
              if (!hasOnlyRomanOrPrompt) {
                break;
              }
            }

            // If a new main question, section heading, or section break begins, stop processing this question immediately!
            if (/^[০-৯0-9]+\s*[।\.\|\)\:\-](?:\s|$)/.test(subLine) || /^#{1,6}\s/.test(subLine) || /^---(?:SECTION_BREAK|MCQ)/i.test(subLine) || /^(?:ক|খ|গ|ঘ|ঙ|চ)\-বিভাগ/i.test(subLine) || /^Part\s*[-–—:]/i.test(subLine) || /(?:বহুনির্বাচন[ীি]|নৈর্ব্যক্তিক|MCQ)/i.test(subLine)) {
              break;
            }

            // Sub-question match: (ক), (খ), (গ), (ঘ) or ক., খ., গ. or (a), (b), (c) or a., b., c. or i., ii., iii., iv. or (1), (2) or (১), (২)
            const subMatch = subLine.match(/^(\([ক-ঘa-z0-9০-৯]+\)|(?:[iIvVxX]+|[ক-ঘa-z0-9০-৯])[\.\)])\s*(.*)$/i);
            if (subMatch) {
              const subId = subMatch[1];
              let subText = subMatch[2];
              let subMarks = '';

              // Strip board citations from sub-questions
              subText = subText.replace(/\[\s*(?:(?:ঢাকা|কুমিল্লা|চট্টগ্রাম|রাজশাহী|যশোর|বরিশাল|সিলেট|দিনাজপুর|ময়মনসিংহ|বাংলাদেশ|কারিগরি|মাদরাসা)\s*বোর্ড|বোর্ড|ক্যাডেট\s*কলেজ|অধ্যায়|সহপাঠ|পৃষ্ঠা)[^\]]*\]/gi, '').trim();
              subText = subText.replace(/\((?:(?:ঢাকা|কুমিল্লা|চট্টগ্রাম|রাজশাহী|যশোর|বরিশাল|সিলেট|দিনাজপুর|ময়মনসিংহ|বাংলাদেশ|কারিগরি|মাদরাসা)\s*বোর্ড|বোর্ড|ক্যাডেট\s*কলেজ)[^\)]*\)/gi, '').trim();

              // Only match trailing marks if not ending in % or part of MCQ option/math values
              const subMarksMatch = subText.match(/\s*\[\s*([০-৯0-9a-zA-Z\s\*\+\-\=\/×÷\.\,\:\;]+?)\s*\]\s*$/)
                || (!subText.includes('%') && subText.match(/(?:(?:\?|।|:)\s*|\t|\s{2,})([০-৯0-9]{1,2})\s*$/));
              if (subMarksMatch) {
                subMarks = subMarksMatch[1].trim();
                subText = subText.replace(/\s*\[\s*[০-৯0-9a-zA-Z\s\*\+\-\=\/×÷\.\,\:\;]+\s*\]\s*$/, '')
                  .replace(/(?:(?:\?|।|:)\s*|\t|\s{2,})[০-৯0-9]{1,2}\s*$/, (m) => m.startsWith('?') ? '?' : (m.startsWith('।') ? '।' : (m.startsWith(':') ? ':' : ''))).trim();
              }

              const isMcqOptionsRow = /(?:[খ-ঘ][\.\)]|\t)/.test(subText)
                || /^[iIvVxX]+[\.\)]/i.test(subId)
                || (isInMcqSection && !subMarks)
                || (layoutSettings.profile && layoutSettings.profile.archetypeId === 'bengali_mcq_paper' && !subMarks);

              questionBlock.subQuestions.push({
                subId: subId,
                text: subText,
                marks: subMarks,
                isMcqOptionsRow: isMcqOptionsRow
              });
              i++;
              continue;
            }

            // Connector text inside multi-statement MCQ (e.g. 'নিচের কোনটি সঠিক?')
            if (/(?:নিচের\s+কোনটি\s+সঠিক|সঠিক\s+উত্তর|তথ্যের\s+আলোকে)/i.test(subLine)) {
              questionBlock.subQuestions.push({
                subId: '',
                text: subLine,
                marks: '',
                isPromptText: true,
                isMcqOptionsRow: true
              });
              i++;
              continue;
            }

            // If stimulus line (উদ্দীপক:) inside question
            if (subLine.startsWith('উদ্দীপক:') || subLine.startsWith('>')) {
              const cleanStim = subLine.replace(/^>\s?/, '');
              questionBlock.stimulus = questionBlock.stimulus
                ? (questionBlock.stimulus + '\n' + cleanStim)
                : cleanStim;
              i++;
              continue;
            }

            // Multi-line stimulus / poem absorption:
            // If the line doesn't match any sub-question pattern but is part of the question block
            if (/^[০-৯0-9]+[।\.\)](?:\s|$)/.test(subLine) || /^#{1,6}\s/.test(subLine) || /^(\-{3,}|\={3,}|\*{3,})$/.test(subLine) || /^---(?:SECTION_BREAK|MCQ)/i.test(subLine) || subLine.startsWith('|') || /^(?:ক|খ|গ|ঘ|ঙ|চ)\-বিভাগ/i.test(subLine) || /^Part\s*[-–—:]/i.test(subLine) || /(?:বহুনির্বাচন[ীি]|নৈর্ব্যক্তিক|MCQ)/i.test(subLine)) {
              break;
            }
            const cleanStimLine = subLine.replace(/^>\s?/, '');
            
            // If a sub-question already exists, this could be stimulus placed AFTER a sub-question (allowed in CQ)
            // We append it to the main stimulus block.
            questionBlock.stimulus = questionBlock.stimulus
              ? (questionBlock.stimulus + '\n' + cleanStimLine)
              : cleanStimLine;
            i++;
            continue;
          }

          // Ensure Roman numeral items (i., ii., iii., iv.) inside the question are sorted in proper ascending order
          if (questionBlock.subQuestions && questionBlock.subQuestions.length > 1) {
            const getRomanVal = (subId) => {
              const m = String(subId || '').trim().match(/^([iIvVxX]+)[\.\)]/);
              if (!m) return 999;
              const r = m[1].toLowerCase();
              const map = { 'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10 };
              return map[r] || 999;
            };
            const rIndices = [];
            const rItems = [];
            for (let idx = 0; idx < questionBlock.subQuestions.length; idx++) {
              if (getRomanVal(questionBlock.subQuestions[idx].subId) < 999) {
                rIndices.push(idx);
                rItems.push(questionBlock.subQuestions[idx]);
              }
            }
            if (rItems.length > 1) {
              rItems.sort((a, b) => getRomanVal(a.subId) - getRomanVal(b.subId));
              for (let j = 0; j < rIndices.length; j++) {
                questionBlock.subQuestions[rIndices[j]] = rItems[j];
              }
            }
          }

          blocks.push(questionBlock);
          continue;
        }

        // Unordered List (- or *)
        if (/^[\-\*]\s+(.*)$/.test(line)) {
          const listItems = [];
          while (i < lines.length && /^[\-\*]\s+(.*)$/.test(lines[i].trim())) {
            const itemText = lines[i].trim().replace(/^[\-\*]\s+/, '');
            listItems.push(itemText);
            i++;
          }
          blocks.push({
            type: 'unordered_list',
            items: listItems
          });
          continue;
        }

        // Ordered List (1. or ১.)
        if (/^([০-৯0-9]+)[\.\)]\s+(.*)$/.test(line) && !line.includes('।')) {
          const listItems = [];
          while (i < lines.length && /^([০-৯0-9]+)[\.\)]\s+(.*)$/.test(lines[i].trim())) {
            const m = lines[i].trim().match(/^([০-৯0-9]+)[\.\)]\s+(.*)$/);
            listItems.push({ number: m[1], text: m[2] });
            i++;
          }
          blocks.push({
            type: 'ordered_list',
            items: listItems
          });
          continue;
        }

        // Standard Paragraph / Passage / Alternative (preserve distinct lines cleanly)
        blocks.push({
          type: 'paragraph',
          text: line
        });
        i++;
      }

      return blocks;
    }

    /**
     * Parses a series of markdown table lines into headers, rows, and alignments
     */
    static parseMarkdownTable(tableLines) {
      if (tableLines.length < 2) return null;

      // Extract cells from a pipe row
      const extractRow = (rowLine) => {
        return rowLine
          .split('|')
          .slice(1, -1) // omit outer empty strings from starting & ending pipes
          .map(cell => cell.trim());
      };

      const headerCells = extractRow(tableLines[0]);
      const alignLine = extractRow(tableLines[1]);

      const alignments = alignLine.map(col => {
        if (col.startsWith(':') && col.endsWith(':')) return 'center';
        if (col.endsWith(':')) return 'right';
        return 'left';
      });

      const rows = [];
      for (let r = 2; r < tableLines.length; r++) {
        rows.push(extractRow(tableLines[r]));
      }

      return {
        type: 'table',
        headers: headerCells,
        alignments: alignments,
        rows: rows
      };
    }

    /**
     * Helper to tokenize inline formatting (Bold, Italic, LaTeX Math, Inline Code)
     */
    static parseInlineTokens(text) {
      if (!text) return [];
      const tokens = [];

      // Regex to match math ($...$), bold (**...**), italic (*...*), code (`...`)
      const regex = /(\$[^$]+\$|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          tokens.push({
            type: 'text',
            content: text.substring(lastIndex, match.index)
          });
        }

        const raw = match[0];
        if (raw.startsWith('$') && raw.endsWith('$')) {
          tokens.push({
            type: 'math',
            formula: raw.slice(1, -1)
          });
        } else if (raw.startsWith('**') && raw.endsWith('**')) {
          tokens.push({
            type: 'bold',
            content: raw.slice(2, -2)
          });
        } else if (raw.startsWith('*') && raw.endsWith('*')) {
          tokens.push({
            type: 'italic',
            content: raw.slice(1, -1)
          });
        } else if (raw.startsWith('`') && raw.endsWith('`')) {
          tokens.push({
            type: 'code',
            content: raw.slice(1, -1)
          });
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        tokens.push({
          type: 'text',
          content: text.substring(lastIndex)
        });
      }

      return tokens;
    }
  }

  // Export to global scope
  global.MdLayoutParser = MdLayoutParser;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MdLayoutParser;
  }
})(typeof window !== 'undefined' ? window : this);
