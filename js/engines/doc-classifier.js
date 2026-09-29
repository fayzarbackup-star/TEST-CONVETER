/**
 * Fayzar Publishing Studio - Document Classifier & Parser
 * Accurately classifies text and extracts structural metadata.
 */

(function(global) {
  'use strict';

  const DocClassifier = {
    DOC_TYPES: {
      EXAM_COMBINED: 'EXAM_COMBINED',
      EXAM_CQ: 'EXAM_CQ',
      EXAM_GENERAL: 'EXAM_GENERAL',
      EXAM_MCQ: 'EXAM_MCQ',
      EXAM_MATH: 'EXAM_MATH',
      STAMP_DEED: 'STAMP_DEED',
      GOVT_APP: 'GOVT_APP',
      PROTTOYON: 'PROTTOYON',
      ADMIT_CARD: 'ADMIT_CARD',
      SALARY_SLIP: 'SALARY_SLIP',
      OFFICE_PAD: 'OFFICE_PAD',
      OFFICIAL_NOTICE: 'OFFICIAL_NOTICE',
      ROUTINE: 'ROUTINE',
      CV_RESUME: 'CV_RESUME',
      GENERAL: 'GENERAL'
    },

    classify(text) {
      if (!text || typeof text !== 'string') return { type: this.DOC_TYPES.GENERAL, confidence: 0 };
      const t = text.trim();

      // 0. EXPLICIT MASTER SECTOR ID (Highest Priority: Zero-hallucination Frontmatter / Tag)
      const frontmatterMatch = t.match(/^---\s*[\r\n]([\s\S]*?)[\r\n]---/);
      let detectedDocType = '';
      if (frontmatterMatch) {
        const fmStr = frontmatterMatch[1];
        const dtMatch = fmStr.match(/(?:doc_type|type|layout)\s*:\s*([^\r\n]+)/i);
        if (dtMatch) detectedDocType = dtMatch[1].trim().toUpperCase();
      }
      if (!detectedDocType) {
        const tagMatch = t.match(/\[(?:LAYOUT|DOC_PROFILE):\s*([^\]]+)\]/i);
        if (tagMatch) {
          const raw = tagMatch[1];
          const typePart = raw.split('|').find(p => /(?:doc_type|type)\s*[:=]/i.test(p));
          if (typePart) {
            detectedDocType = typePart.split(/[:=]/)[1].trim().toUpperCase();
          } else {
            detectedDocType = raw.split('|')[0].trim().toUpperCase();
          }
        }
      }

      if (detectedDocType) {
        if (detectedDocType === 'EXAM_GENERAL' || detectedDocType === 'GENERAL_EXAM' || detectedDocType === 'QUESTION_2COL' || detectedDocType === 'PRIMARY_EXAM') {
          return { type: this.DOC_TYPES.EXAM_GENERAL, confidence: 1.0, reason: 'Sector: EXAM_GENERAL' };
        }
        if (detectedDocType === 'EXAM_CQ' || detectedDocType === 'CREATIVE_EXAM' || detectedDocType === 'CQ_BOOKLET') {
          return { type: this.DOC_TYPES.EXAM_CQ, confidence: 1.0, reason: 'Sector: EXAM_CQ' };
        }
        if (detectedDocType === 'EXAM_MCQ' || detectedDocType === 'MCQ_EXAM' || detectedDocType === 'MCQ_2COL') {
          return { type: this.DOC_TYPES.EXAM_MCQ, confidence: 1.0, reason: 'Sector: EXAM_MCQ' };
        }
        if (detectedDocType === 'EXAM_COMBINED' || detectedDocType === 'COMBINED_EXAM') {
          return { type: this.DOC_TYPES.EXAM_COMBINED, confidence: 1.0, reason: 'Sector: EXAM_COMBINED' };
        }
        if (detectedDocType === 'OFFICE_PAD' || detectedDocType === 'PAD') {
          return { type: this.DOC_TYPES.OFFICE_PAD, confidence: 1.0, reason: 'Sector: OFFICE_PAD' };
        }
        if (detectedDocType === 'PROTTOYON_CERT' || detectedDocType === 'PROTTOYON' || detectedDocType === 'TESTIMONIAL_CERT') {
          return { type: this.DOC_TYPES.PROTTOYON, confidence: 1.0, reason: 'Sector: PROTTOYON' };
        }
        if (detectedDocType === 'GOVT_APP' || detectedDocType === 'APPLICATION') {
          return { type: this.DOC_TYPES.GOVT_APP, confidence: 1.0, reason: 'Sector: GOVT_APP' };
        }
        if (detectedDocType === 'OFFICIAL_NOTICE' || detectedDocType === 'NOTICE') {
          return { type: this.DOC_TYPES.OFFICIAL_NOTICE, confidence: 1.0, reason: 'Sector: OFFICIAL_NOTICE' };
        }
        if (detectedDocType === 'LEGAL_DEED' || detectedDocType === 'STAMP_DEED' || detectedDocType === 'DEED') {
          return { type: this.DOC_TYPES.STAMP_DEED, confidence: 1.0, reason: 'Sector: LEGAL_DEED' };
        }
      }

      // Count questions and MCQ clusters
      const totalQuestionMatches = t.match(/^[০-৯0-9]+[।\.\)]\s/gm) || [];
      const totalQCount = totalQuestionMatches.length;
      const mcqClusterMatches = t.match(/[ক-ঘ][\)\.]\s+[^\n]+[ক-ঘ][\)\.]/g) || [];
      const mcqCount = mcqClusterMatches.length;
      const isStrictMcq = (mcqCount >= 18) || (totalQCount >= 3 && mcqCount >= totalQCount * 0.85);

      // Combined CQ + MCQ Detection (Highest Priority for Exam Papers)
      const hasCqMarkers = /(?:সৃজনশীল|উদ্দীপক|দৃশ্যকল্প|ক\-বিভাগ|খ\-বিভাগ)/i.test(t) ||
        (/(?:ক\.\s*[^\n]+\s*খ\.\s*[^\n]+\s*গ\.)/.test(t) && /\[[১-৪\d]\]/.test(t));
      const hasExplicitSectionBreak = /---SECTION_BREAK/i.test(t) || /\[LAYOUT:\s*COMBINED/i.test(t);

      let combinedScore = 0;
      if (hasExplicitSectionBreak || (hasCqMarkers && isStrictMcq)) {
        combinedScore = 50;
      }

      // Keyword & Pattern Scoring
      let cqScore = 0;
      let mcqScore = 0;
      let generalScore = 0;
      let stampScore = 0;
      let appScore = 0;
      let certScore = 0;
      let admitScore = 0;
      let salaryScore = 0;
      let padScore = 0;
      let routineScore = 0;
      let noticeScore = 0;
      let cvScore = 0;

      // Stamp patterns (requires deed co-occurrence so questions with "৩০০ টাকা" or "মৌজা" don't trigger stamp)
      if (/(?:৩০০|তিনশত)\s*টাকার\s*স্ট্যাম্প|স্ট্যাম্প\s*অ্যাক্ট|অঙ্গীকার\s*নামা|বায়নানামা|চুক্তিপত্র|দলিল\s*পত্র/i.test(t)) stampScore += 8;
      if (/তফসিল|মৌজা|খতিয়ান|দাগ\s*নং/.test(t) && /১ম\s*পক্ষ|২য়\s*পক্ষ|প্রথম\s*পক্ষ|দ্বিতীয়\s*পক্ষ|লিখিতং|চুক্তি/i.test(t)) stampScore += 6;
      if (/১ম\s*পক্ষ|২য়\s*পক্ষ|প্রথম\s*পক্ষ|দ্বিতীয়\s*পক্ষ|লিখিতং/.test(t) && !/পরীক্ষা|প্রশ্ন|পূর্ণমান/.test(t)) stampScore += 4;

      // Application patterns (requires formal structural co-occurrence, "জনাব রহমান একজন ব্যবসায়ী" will not trigger)
      if (/বরাবর[,:\s]/.test(t) && /বিষয়[:\s]/.test(t)) appScore += 8;
      if (/বিনীত\s*নিবেদন|অতএব,\s*বিনীত|নিবেদক/i.test(t)) appScore += 6;
      if (/(?:মহোদয়|জনাব)[,:\s]/.test(t) && /আবেদন|নিবেদন|অনুরোধ|প্রার্থনা/i.test(t)) appScore += 4;

      // Certificate patterns
      if (/প্রত্যয়নপত্র|অভিজ্ঞতার\s*সনদ|প্রশংসাপত্র|এই\s*মর্মে\s*প্রত্যয়ন|ছাড়পত্র/.test(t)) certScore += 7;

      // Pad patterns (Office letterhead / pad)
      const hasExamContext = /শ্রেণি|পূর্ণমান|সময়|পরীক্ষা|প্রশ্নপত্র/i.test(t) || totalQCount >= 2;
      if (!hasExamContext) {
        if (/মেসার্স|প্রোঃ|প্রোপাইটর|মোবাইলঃ|বিসমিল্লাহির\s*রহমানির/i.test(t) && !/বরাবর/.test(t)) padScore += 6;
        if (/(?:সূত্র|স্মারক|রেফ|Ref)\s*(?:নং|নম্বর)?[:\s\-]/i.test(t) && /তারিখ/i.test(t) && !/বরাবর/.test(t)) padScore += 5;
      }

      // Routine patterns
      if (/ক্লাস\s*রুটিন|সময়সূচী|পিরিয়ড|১ম-ঘণ্টা|১ম\s*ঘণ্টা/.test(t)) routineScore += 6;

      // Admit card patterns
      if (/প্রবেশপত্র|ADMIT\s*CARD/i.test(t)) admitScore += 8;
      if (/পূর্ণমান.*পাসমান/i.test(t)) admitScore += 5;
      if (/পরীক্ষার্থীর\s*নাম.*রোল|রোল.*সময়/i.test(t)) admitScore += 4;

      // Salary slip patterns
      if (/বেতন\s*স্লিপ|PAY\s*SLIP/i.test(t)) salaryScore += 8;
      if (/মূল\s*বেতন|বাড়ি\s*ভাড়া\s*ভাতা|নিট\s*বেতন/i.test(t)) salaryScore += 6;
      if (/ভবিষ্যৎ\s*তহবিল|আয়কর/i.test(t) && /বেতন|মাস/i.test(t)) salaryScore += 4;

      // Notice patterns
      if (/বিজ্ঞপ্তি|নোটিশ|অফিস\s*আদেশ|জরুরি\s*বিজ্ঞপ্তি/i.test(t)) noticeScore += 6;
      if (/স্মারক\s*নং|জ্ঞাতার্থে|সদয়\s*অবগতি|অনুলিপি/i.test(t)) noticeScore += 4;

      // CV/Resume patterns (deduplicated)
      if (/জীবনবৃত্তান্ত|বায়োডাটা|কারিকুলাম\s*ভিটা|CURRICULUM\s*VITAE|RESUME|পিতার\s*নাম.*মাতার\s*নাম|শিক্ষাগত\s*যোগ্যতা/i.test(t)) cvScore += 8;
      if (/ব্যক্তিগত\s*তথ্য|পেশাগত\s*অভিজ্ঞতা|কর্মঅভিজ্ঞতা|দক্ষতা\s*সমূহ|জাতীয়তা|জাতীয়তা|স্থায়ী\s*ঠিকানা|স্থায়ী\s*ঠিকানা|বর্তমান\s*ঠিকানা|REFERENCE/i.test(t)) cvScore += 5;
      if (/পরীক্ষার\s*নাম.*পাশের\s*সন|বোর্ড\/বিশ্ববিদ্যালয়|বোর্ড\/বিশ্ববিদ্যালয়/i.test(t)) cvScore += 4;

      // Specialized document gate: only high-fidelity non-exam document types bypass the exam gate
      const maxSpecialScore = Math.max(
        cvScore, appScore, stampScore, certScore,
        noticeScore, routineScore, salaryScore, admitScore
      );

      // STRICT CQ vs GENERAL vs MCQ SCORING (Eliminated Early-Return: pure unified scoring)
      if (maxSpecialScore < 4) {
        if (/সৃজনশীল|উদ্দীপক|দৃশ্যকল্প/i.test(t)) {
          cqScore += 30;
        } else if (isStrictMcq) {
          mcqScore += 35; // Pure MCQ paper
        } else if ((/শ্রেণি|সময়|পূর্ণমান/.test(t) && /পরীক্ষা|বিষয়/.test(t)) || totalQCount >= 2 || (/পরীক্ষা/.test(t) && totalQCount > 0)) {
          generalScore += 25;
        } else if (/শ্রেণি|বিষয়|সময়|পূর্ণমান|পরীক্ষা/.test(t) || totalQCount > 0) {
          generalScore += 15;
        }
      } else {
        if (/সৃজনশীল|উদ্দীপক|দৃশ্যকল্প/i.test(t)) {
          cqScore += 30;
        } else if (isStrictMcq) {
          mcqScore += 35;
        }
      }

      if (/ক\.\s*[^\n]+\s*খ\.\s*[^\n]+\s*গ\./.test(t) && !/সৃজনশীল/.test(t)) {
        cqScore += 8;
      }
      if (/[\u09E7-\u09EF\d]+\s*[+\-xX×=]\s*[\u09E7-\u09EF\d]+/.test(t)) cqScore += 3;

      const scores = [
        { type: this.DOC_TYPES.EXAM_COMBINED, score: combinedScore },
        { type: this.DOC_TYPES.EXAM_CQ, score: cqScore },
        { type: this.DOC_TYPES.EXAM_MCQ, score: mcqScore },
        { type: this.DOC_TYPES.EXAM_GENERAL, score: generalScore },
        { type: this.DOC_TYPES.STAMP_DEED, score: stampScore },
        { type: this.DOC_TYPES.GOVT_APP, score: appScore },
        { type: this.DOC_TYPES.PROTTOYON, score: certScore },
        { type: this.DOC_TYPES.ADMIT_CARD, score: admitScore },
        { type: this.DOC_TYPES.SALARY_SLIP, score: salaryScore },
        { type: this.DOC_TYPES.OFFICE_PAD, score: padScore },
        { type: this.DOC_TYPES.OFFICIAL_NOTICE, score: noticeScore },
        { type: this.DOC_TYPES.ROUTINE, score: routineScore },
        { type: this.DOC_TYPES.CV_RESUME, score: cvScore }
      ];

      scores.sort((a, b) => b.score - a.score);

      if (scores[0].score >= 4) {
        return { type: scores[0].type, confidence: scores[0].score, allScores: scores };
      }

      return { type: this.DOC_TYPES.GENERAL, confidence: 1, allScores: scores };
    },

    extractMetadata(text, type) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const meta = {
        title: '',
        subtitle: '',
        institute: '',
        examName: '',
        subject: '',
        className: '',
        time: '',
        marks: '',
        date: '',
        memoNo: '',
        firstParty: '',
        secondParty: '',
        subjectText: ''
      };

      if (!lines.length) return meta;

      // Common extraction
      for (const line of lines.slice(0, 10)) {
        if (/স্কুল|কলেজ|মাদরাসা|বিদ্যালয়|একাডেমী|প্রতিষ্ঠান|মসজিদ|ট্রেডার্স|সমিতি/i.test(line) && !meta.institute) {
          meta.institute = line;
        }
        if (/পরীক্ষা/i.test(line) && !meta.examName) {
          meta.examName = line;
        }
        if (/শ্রেণি[ঃ:]\s*([^\s;]+)/.test(line) && !meta.className) {
          meta.className = line.match(/শ্রেণি[ঃ:]\s*([^\s;]+)/)[1];
        }
        if (/বিষয়[ঃ:]\s*([^\s;]+)/.test(line) && !meta.subject) {
          meta.subject = line.match(/বিষয়[ঃ:]\s*([^\s;]+)/)[1];
        }
        if (/সময়[ঃ:\-]\s*([^\n;]+?)(?:পূর্ণমান|মান|$)/.test(line) && !meta.time) {
          meta.time = line.match(/সময়[ঃ:\-]\s*([^\n;]+?)(?:পূর্ণমান|মান|$)/)[1].trim();
        }
        if (/(?:পূর্ণমান|মান)[ঃ:\-]\s*([\u09E6-\u09EF\d]+)/.test(line) && !meta.marks) {
          meta.marks = line.match(/(?:পূর্ণমান|মান)[ঃ:\-]\s*([\u09E6-\u09EF\d]+)/)[1].trim();
        }
        if (/তারিখ[ঃ:]\s*([^\n]+)/.test(line) && !meta.date) {
          meta.date = line.match(/তারিখ[ঃ:]\s*([^\n]+)/)[1].trim();
        }
        if (/বিষয়[ঃ:]\s*([^\n]+)/.test(line) && !meta.subjectText) {
          meta.subjectText = line.match(/বিষয়[ঃ:]\s*([^\n]+)/)[1].trim();
        }
      }

      return meta;
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DocClassifier;
  if (typeof window !== 'undefined') window.DocClassifier = DocClassifier;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
