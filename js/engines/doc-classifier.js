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
      CASH_MEMO: 'CASH_MEMO',
      GENERAL: 'GENERAL'
    },

    // =====================================================================
    // Part-18.6: তথ্য-ভিত্তিক লেআউট (Gemini লেআউটের নাম নয়, তথ্য দেয়: শ্রেণি, বিষয়বস্তু, অংশের ধরন ও সংখ্যা)
    // সিদ্ধান্ত আমাদের নিয়মে; Gemini-র দাবি লেখার আসল গঠন (structureStats) দিয়ে যাচাই। সন্দেহ হলে সাধারণ ফরম্যাট।
    // =====================================================================
    GRADE_WORDS: { 'প্রথম': 1, 'দ্বিতীয়': 2, 'তৃতীয়': 3, 'চতুর্থ': 4, 'পঞ্চম': 5, 'ষষ্ঠ': 6, 'সপ্তম': 7, 'অষ্টম': 8, 'নবম': 9, 'দশম': 10, 'একাদশ': 11, 'দ্বাদশ': 12,
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12 },

    /** শ্রেণি-লেখা → সংখ্যা (৫ / 5 / পঞ্চম / ৫ম / Five); না পেলে 0 */
    parseGrade(v) {
      const s = String(v || '').trim().replace(/\u09AF\u09BC/g, '\u09DF').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)).replace(/^["']|["']$/g, '');
      const n = s.match(/\d{1,2}/);
      if (n) { const g = parseInt(n[0], 10); return g >= 1 && g <= 12 ? g : 0; }
      for (const [w, g] of Object.entries(this.GRADE_WORDS)) { if (s.toLowerCase().includes(w)) return g; }
      return 0;
    },

    /** ফ্রন্টম্যাটার থেকে তথ্য: { grade, content, subject, sections: {kind: count} } — কিছু না থাকলে null */
    factsFromFrontmatter(fm) {
      const s = String(fm || '');
      const get = (re) => { const m = s.match(re); return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; };
      const gradeRaw = get(/^\s*(?:grade|class|শ্রেণি)\s*:\s*(.+)$/im);
      const content = get(/^\s*content\s*:\s*([A-Za-z_]+)/im).toUpperCase();
      const subject = get(/^\s*subject\s*:\s*(.+)$/im);
      const secRaw = get(/^\s*sections\s*:\s*(.+)$/im);
      let sections = null;
      if (secRaw) {
        sections = {};
        secRaw.replace(/[\[\]"']/g, '').split(/[,;]/).forEach((p) => {
          const m = p.trim().replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)).match(/^([a-z_]+)\s*[:=x×]\s*(\d+)/i);
          if (m) { const k = m[1].toLowerCase(); sections[k] = (sections[k] || 0) + parseInt(m[2], 10); }
        });
        if (!Object.keys(sections).length) sections = null;
      }
      const grade = this.parseGrade(gradeRaw);
      if (!grade && !content && !sections) return null;
      return { grade, content, subject, sections };
    },

    /** লেখার আসল গঠন: সৃজনশীল-ব্লক (উপ-প্রশ্ন ক–ঘ, পাশে ১–৪ নম্বর) ও বহুনির্বাচনি-ব্লক (৪টি ছোট বিকল্প) গোনা */
    structureStats(text) {
      const lines = String(text || '').split(/\r?\n/);
      const qStart = /^\s*(?:#{1,6}\s*)?(?:প্রশ্ন\s*(?:নং)?[\s\-:ঃ.]*)?\(?[০-৯\d]{1,3}\s*[।.)]/;
      const blocks = [];
      let cur = null, creativeCtx = false;   // শেষ অংশ-শিরোনাম সৃজনশীল কিনা
      const CUE = /সৃজনশীল|creative|উদ্দীপক|দৃশ্যকল্প/i;
      for (const l of lines) {
        // শিরোনাম: `##` বা (পাইপলাইন `##` মুছে দিলে) ছোট অংশ-নাম-লাইন
        const isHead = /^\s*#{1,6}\s/.test(l) || (l.trim().length < 60 && !qStart.test(l) && /^(?:[কখগঘ]\s*[-–—]?\s*(?:বিভাগ|অংশ)\s*[:ঃ\-–—(]?\s*)?(?:সৃজনশীল|বহুনির্বাচন|সংক্ষিপ্ত|অতি\s*সংক্ষিপ্ত|নৈর্ব্যক্তিক|creative|multiple|MCQ|short)/i.test(l.trim()));
        if (isHead) creativeCtx = CUE.test(l);
        if (qStart.test(l) || isHead) { cur = []; cur.ctx = creativeCtx; blocks.push(cur); }
        if (cur) cur.push(l);
      }
      let cqBlocks = 0, mcqBlocks = 0;
      for (const b of blocks) {
        const subs = [];
        b.slice(1).forEach((l) => { const m = l.match(/^\s*\(?\s*([কখগঘ])\s*[.)।]\s*(.+)$/); if (m) subs.push({ k: m[1], txt: m[2].trim() }); });
        const keys = new Set(subs.map((x) => x.k));
        const marked = subs.filter((x) => x.txt.length >= 10 && /(?:^|\s|\[|\()[১-৪1-4]\s*[\])]?\s*$/.test(x.txt)).length;
        const body = b.join('\n');
        const stim = /উদ্দীপক|দৃশ্যকল্প|নিচের\s*(?:চিত্র|অনুচ্ছেদ|তথ্য)|লক্ষ\s*কর/.test(body);
        if (keys.size >= 3 && (marked >= 2 || (stim && subs.every((x) => x.txt.length >= 10)))) { cqBlocks++; continue; }
        // সৃজনশীল অংশের ভেতরে (শিরোনাম/উদ্দীপক-সংকেত) — কম উপ-প্রশ্ন হলেও নম্বরসহ উপ-প্রশ্ন থাকলে সৃজনশীল
        const shortMarked = subs.filter((x) => x.txt.length >= 2 && /\s[১-৪1-4]\s*[\])]?\s*$/.test(' ' + x.txt)).length;
        if ((b.ctx || stim) && shortMarked >= 1 && subs.every((x) => !/^\S{1,3}$/.test(x.txt))) { cqBlocks++; continue; }
        const optKeys = new Set();
        b.slice(1).forEach((l) => { (l.match(/(?:^|\s)\(?([কখগঘ])\s*[.)]\s*\S/g) || []).forEach((o) => optKeys.add(o.replace(/[^কখগঘ]/g, ''))); });
        if (optKeys.size >= 3 && subs.every((x) => x.txt.length < 70)) mcqBlocks++;
      }
      return { blocks: blocks.length, cqBlocks, mcqBlocks };
    },

    /** তথ্য → লেআউট (নিয়ম): প্রাথমিক/সিলেবাস/অন্য ধরন → সাধারণ; শুধু সৃজনশীল (+সংক্ষিপ্ত) → CQ/গণিত; সৃজনশীল + বহুনির্বাচনি → যৌথ; শুধু বহুনির্বাচনি → MCQ */
    layoutFromFacts(facts, text, hint) {
      const T = this.DOC_TYPES;
      if (!facts) return null;
      const why = (r) => 'Facts: ' + r;
      if (facts.content && !/QUESTION/.test(facts.content)) return { type: T.EXAM_GENERAL, confidence: 0.97, reason: why('content=' + facts.content + ' → general') };
      if (facts.grade >= 1 && facts.grade <= 5) return { type: T.EXAM_GENERAL, confidence: 0.97, reason: why('primary class ' + facts.grade + ' → general') };
      if (!facts.sections) return null;
      const sec = facts.sections;
      const st = this.structureStats(text);
      let cq = sec.cq || 0, mcq = sec.mcq || 0;
      const short = (sec.short || 0) + (sec.very_short || 0);
      if (cq && !st.cqBlocks) cq = 0;      // দাবি আছে, গঠন নেই → বিশ্বাস নয়
      if (mcq && !st.mcqBlocks) mcq = 0;
      const others = Object.keys(sec).filter((k) => sec[k] > 0 && !['cq', 'mcq', 'short', 'very_short'].includes(k));
      const facts2 = 'cq=' + cq + ' mcq=' + mcq + ' short=' + short + (others.length ? ' other=' + others.join('+') : '');
      if (others.length) return { type: T.EXAM_GENERAL, confidence: 0.95, reason: why(facts2 + ' → general') };
      const math = /গণিত|math/i.test(facts.subject || '') || /MATH/.test(String(hint || ''));
      if (cq && mcq) return { type: T.EXAM_COMBINED, confidence: 0.96, reason: why(facts2 + ' → combined') };
      if (cq) return { type: math ? T.EXAM_MATH : T.EXAM_CQ, confidence: 0.96, reason: why(facts2 + ' → creative') };
      if (mcq && !short) return { type: T.EXAM_MCQ, confidence: 0.96, reason: why(facts2 + ' → mcq') };
      return { type: T.EXAM_GENERAL, confidence: 0.9, reason: why(facts2 + ' → general') };
    },


    /**
     * Part-15.9: OCR-এর `doc_type` (বা ক্লাসিফায়ার) EXAM_CQ/MATH/GENERAL বললেও লেখায় প্রশ্নের পরে
     * আলাদা বহুনির্বাচনি অংশ (শিরোনাম + নিচে ≥৮টি ক/খ/গ/ঘ বিকল্প-লাইন) থাকলে → EXAM_COMBINED,
     * যাতে MCQ অংশ নিজের পোর্ট্রেট ২-কলাম গ্রিডে যায় (Gemini সবসময় `---SECTION_BREAK:MCQ---` দেয় না)।
     */
    promoteCombined(type, text) {
      const t = String(type || '').toUpperCase();
      // Part-18.6: সাধারণ (GENERAL) পত্রকে আর যৌথে তোলা হয় না — আসল সৃজনশীল-গঠন থাকলেই কেবল CQ/MATH → যৌথ
      if (!['EXAM_CQ', 'EXAM_MATH'].includes(t)) return type;
      const s = String(text || '');
      if (/---\s*SECTION_?BREAK:MCQ/i.test(s)) return this.DOC_TYPES.EXAM_COMBINED;
      const lines = s.split(/\r?\n/);
      const isQ = (l) => /^\s*(?:>\s*)?(?:#{1,6}\s*)?(?:প্রশ্ন[\s\-:ঃ.]*)?[০-৯\d]+[।.)]/.test(l);
      const head = lines.findIndex((l) => {
        const c = l.trim().replace(/^#{1,6}\s*/, '').replace(/^[*_\s]+|[*_\s]+$/g, '');
        return c.length > 0 && c.length < 80 && !isQ(c) &&
          /^(?:[কখগঘ]\s*[-–—]?\s*(?:বিভাগ|অংশ)\s*[:ঃ\-–—(]?\s*)?(?:বহুনির্বাচন[িী]|নৈর্ব্যক্তিক|MCQ\b|multiple[\s-]*choice)/i.test(c);
      });
      if (head < 1 || !lines.slice(0, head).some(isQ)) return type;
      const optLines = lines.slice(head + 1).filter((l) => /^\s*\(?\s*[কখগঘ]\s*[.)।]\s*\S/.test(l)).length;
      return optLines >= 8 && this.structureStats(s).cqBlocks > 0 ? this.DOC_TYPES.EXAM_COMBINED : type;
    },

    classify(text) {
      if (!text || typeof text !== 'string') return { type: this.DOC_TYPES.GENERAL, confidence: 0 };
      // Part-18.0: য়/ড়/ঢ় দুই-অংশ রূপ ⇒ একক অক্ষর (নিয়মগুলো এই রূপে লেখা; নইলে "প্রত্যয়ন", "পরীক্ষা"… মিলত না)
      const t = text.trim().replace(/\u09AF\u09BC/g, '\u09DF').replace(/\u09A1\u09BC/g, '\u09DC').replace(/\u09A2\u09BC/g, '\u09DD');
      // Category headings are structure, not a single document-wide type. Preserve a
      // short+creative paper as an exam even when OCR's frontmatter guessed GENERAL.
      const categoryLines = t.split(/\r?\n/).map((line) => line.trim().replace(/^#{1,6}\s*/, '')).filter((line) =>
        /^(?:(?:[কখগঘঙচছ])\s*[-–—]?\s*)?(?:বিভাগ|অংশ|সেকশন|section|part)(?=$|[\s:ঃ(])/i.test(line) ||
        /^(?:সৃজনশীল\s*প্রশ্ন|সংক্ষিপ্ত(?:-উত্তর)?\s*প্রশ্ন|অতি\s*সংক্ষিপ্ত(?:\s*প্রশ্ন)?|বহুনির্বাচন[িী](?:\s*প্রশ্ন)?|নৈর্ব্যক্তিক(?:\s*প্রশ্ন)?|creative(?:\s+questions?)?|short[\s-]*(?:answer|questions?)|multiple[\s-]*choice|MCQ)(?=$|[\s:ঃ(])/i.test(line)
      );
      const hasShortSectionHeading = categoryLines.some((line) => /সংক্ষিপ্ত|অতি\s*সংক্ষিপ্ত|short/i.test(line));
      const hasCreativeSectionHeading = categoryLines.some((line) => /সৃজনশীল|উদ্দীপক|দৃশ্যকল্প|creative|\bCQ\b/i.test(line));
      const hasCreativeExamMarkers = /সৃজনশীল|উদ্দীপক|দৃশ্যকল্প|creative/i.test(t);
      const struct = this.structureStats(t);
      // Part-18.6: "উদ্দীপক/সৃজনশীল" শব্দ একবার এলেই নয় — অন্তত একটি আসল সৃজনশীল-ব্লক (ক–ঘ, নম্বরসহ) চাই
      const hasMixedShortCreativeSections = hasShortSectionHeading && (hasCreativeSectionHeading || hasCreativeExamMarkers) && struct.cqBlocks > 0;
      const hasExplicitSectionBreak = /---\s*SECTION_BREAK/i.test(t) || /\[LAYOUT:\s*COMBINED/i.test(t);

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

      // Part-18.6: Gemini-র তথ্য (শ্রেণি/বিষয়বস্তু/অংশ) থাকলে লেআউট আমাদের নিয়মে — doc_type শুধু ইঙ্গিত
      // Part-19.1: CV_RESUME যোগ — আগে তালিকায় না থাকায় content: OTHER দেখে সিভি প্রশ্নপত্র (EXAM_GENERAL) হয়ে যেত
      const NON_EXAM = /^(OFFICE_PAD|PAD|PROTTOYON|PROTTOYON_CERT|TESTIMONIAL_CERT|GOVT_APP|APPLICATION|OFFICIAL_NOTICE|NOTICE|LEGAL_DEED|STAMP_DEED|DEED|CV_RESUME|CV|RESUME|BIODATA|CASH_MEMO|CASHMEMO|MEMO)$/;
      if (frontmatterMatch && !NON_EXAM.test(detectedDocType)) {
        const facts = this.factsFromFrontmatter(frontmatterMatch[1]);
        const byFacts = facts ? this.layoutFromFacts(facts, t, detectedDocType) : null;
        if (byFacts) return byFacts;
      }
      // তথ্য না থাকলে (পুরোনো/MD লেখা): যৌথ বা সৃজনশীল দাবি — কিন্তু লেখায় একটিও সৃজনশীল-ব্লক নেই → সাধারণ
      if (/^(EXAM_COMBINED|COMBINED_EXAM)$/.test(detectedDocType) && !hasExplicitSectionBreak && struct.cqBlocks === 0) {
        return { type: this.DOC_TYPES.EXAM_GENERAL, confidence: 0.9, reason: 'Combined claimed but no creative structure → general' };
      }

      if (detectedDocType) {
        // An explicit combined separator wins over a mistaken single-sector frontmatter.
        if (hasExplicitSectionBreak) {
          return { type: this.DOC_TYPES.EXAM_COMBINED, confidence: 1.0, reason: 'Explicit combined section marker' };
        }
        if (hasMixedShortCreativeSections && ['EXAM_GENERAL', 'GENERAL_EXAM', 'QUESTION_2COL', 'PRIMARY_EXAM'].includes(detectedDocType)) {
          return { type: this.DOC_TYPES.EXAM_CQ, confidence: 0.98, reason: 'Mixed short and creative sections; preserve section-wise exam layout' };
        }
        if (detectedDocType === 'EXAM_GENERAL' || detectedDocType === 'GENERAL_EXAM' || detectedDocType === 'QUESTION_2COL' || detectedDocType === 'PRIMARY_EXAM') {
          return { type: this.DOC_TYPES.EXAM_GENERAL, confidence: 1.0, reason: 'Sector: EXAM_GENERAL' };
        }
        if (detectedDocType === 'EXAM_MATH' || detectedDocType === 'MATH_EXAM' || detectedDocType === 'MATHEMATICS_EXAM') {
          return { type: this.DOC_TYPES.EXAM_MATH, confidence: 1.0, reason: 'Sector: EXAM_MATH' };
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
        if (detectedDocType === 'CV_RESUME' || detectedDocType === 'CV' || detectedDocType === 'RESUME' || detectedDocType === 'BIODATA') {
          return { type: this.DOC_TYPES.CV_RESUME, confidence: 1.0, reason: 'Sector: CV_RESUME' };
        }
        if (detectedDocType === 'CASH_MEMO' || detectedDocType === 'CASHMEMO' || detectedDocType === 'MEMO') {
          return { type: this.DOC_TYPES.CASH_MEMO, confidence: 1.0, reason: 'Sector: CASH_MEMO' };   // Part-19.4
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

      // Part-10 (ক.১–ক.২): ব্লক-ভিত্তিক বিশুদ্ধ MCQ শনাক্তকরণ।
      // আগের গণনা শুধু *একই লাইনে* অপশন থাকা ক্লাস্টার ধরত (`ক. x খ. y`);
      // OCR/মার্কডাউনের সবচেয়ে সাধারণ ফর্ম — প্রতি লাইনে একটি করে অপশন —
      // গণনার বাইরে থাকায় ২৫–৩০ প্রশ্নের বিশুদ্ধ MCQ প্রশ্নপত্রও EXAM_GENERAL
      // -এ যেত। এখন প্রশ্ন-ব্লক ধরে ধরে গনা হয় (১০+ বিশুদ্ধ MCQ ব্লক → পূর্ণ
      // MCQ ফরম্যাট; ২৫–৩০টি হলেও স্বয়ংক্রিয়ভাবে একই পাথ)।
      let mcqBlockCount = 0;
      let numberedBlockCount = 0;
      {
        const parts = t.split(/(?=^[\t ]*[\u09E6-\u09EF0-9]{1,3}[\t ]*[।.):\]])/m);
        for (const bp of parts) {
          if (!/^[\t ]*[\u09E6-\u09EF0-9]{1,3}[\t ]*[।.):\]]/.test(bp)) continue;
          numberedBlockCount++;
          const lines = bp.split('\n').slice(1);
          let optLines = 0;
          let cqish = 0;
          for (const ln of lines) {
            const m = ln.match(/^[\t ]*([কখগঘঙচছ])\s*[.):।\]]\s*(.+)$/);
            if (!m) continue;
            const txt = m[2].trim();
            if (!txt) continue;
            optLines++;
            // CQ সাব-প্রশ্নের স্বাক্ষর — মার্ক-ব্র্যাকেট, অতীতকালী ক্রিয়া-শেষ, অথবা
            // দীর্ঘ নির্দেশনামূলক বাক্য। MCQ বিকল্প সাধারণত সংক্ষিপ্ত নাম/বাঁধা উত্তর।
            if (/\[[^\]]*\]/.test(ln) ||
                /(?:করো|কর|দাও|দিাও|লিখ|নির্ণয়|ব্যাখ্যা|বর্ণনা|প্রমাণ|হিসাব|উত্তর দিন)\s*[।.]?\s*$/.test(txt) ||
                /উদ্দীপক|সূত্র|মান নির্ণয়|তালিকা|চিত্র|সংক্ষেপে/i.test(txt)) cqish++;
          }
          if (optLines >= 2 && cqish === 0) mcqBlockCount++;
        }
      }
      const isPureMcqPaper = (mcqBlockCount >= 10 && numberedBlockCount > 0 && mcqBlockCount >= numberedBlockCount * 0.85);
      // Part-18.0: গণিত — সংখ্যাযুক্ত প্রশ্নের অর্ধেকের বেশিতে সূত্র ($…$ / LaTeX) ⇒ EXAM_MATH (আগে শুধু ফ্রন্টম্যাটার দিয়ে)
      let mathQCount = 0;
      t.split(/(?=^[\t ]*[০-৯0-9]{1,3}[\t ]*[।.):\]])/m).forEach((bp) => {
        if (/^[\t ]*[০-৯0-9]{1,3}[\t ]*[।.):\]]/.test(bp) && /\$[^$\n]+\$|\\(?:frac|sqrt|int|sum|theta|pi|begin)\b/.test(bp)) mathQCount++;
      });
      const isMathPaper = numberedBlockCount >= 3 && mathQCount >= numberedBlockCount * 0.5;
      const isStrictMcq = (mcqCount >= 18) || (totalQCount >= 3 && mcqCount >= totalQCount * 0.85) || isPureMcqPaper;

      // A mixed short+creative exam must not fall through to the generic-question score.
      if (hasMixedShortCreativeSections && !hasExplicitSectionBreak) {
        return { type: this.DOC_TYPES.EXAM_CQ, confidence: 0.96, reason: 'Mixed short and creative sections; preserve section-wise exam layout' };
      }

      // Combined CQ + MCQ Detection (Highest Priority for Exam Papers)
      const hasCqMarkers = /(?:সৃজনশীল|উদ্দীপক|দৃশ্যকল্প|ক\-বিভাগ|খ\-বিভাগ)/i.test(t) ||
        (/(?:ক\.\s*[^\n]+\s*খ\.\s*[^\n]+\s*গ\.)/.test(t) && /\[[১-৪\d]\]/.test(t));

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
      let strongStamp = /(?:৩০০|তিনশত)\s*টাকার\s*স্ট্যাম্প|নন.?জুডিশিয়াল.?স্ট্যাম্প|^চুক্তিপত্র/im.test(t);
      if (strongStamp) stampScore += 10;
      if (/তফসিল|মৌজা|খতিয়ান|দাগ\s*নং/.test(t) && /১ম\s*পক্ষ|২য়\s*পক্ষ|প্রথম\s*পক্ষ|দ্বিতীয়\s*পক্ষ|লিখিতং|চুক্তি/i.test(t)) stampScore += strongStamp ? 6 : 2;
      if (/১ম\s*পক্ষ|২য়\s*পক্ষ|প্রথম\s*পক্ষ|দ্বিতীয়\s*পক্ষ|লিখিতং/.test(t) && !/পরীক্ষা|প্রশ্ন|পূর্ণমান/.test(t)) stampScore += strongStamp ? 4 : 1;

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
      if (/পরীক্ষার্থীর\s*নাম.*রোল|রোল.*সময়/i.test(t)) admitScore += 4;

      // Salary slip patterns
      if (/বেতন\s*স্লিপ|PAY\s*SLIP/i.test(t)) salaryScore += 8;
      if (/মূল\s*বেতন|বাড়ি\s*ভাড়া\s*ভাতা|নিট\s*বেতন/i.test(t)) salaryScore += 6;
      if (/ভবিষ্যৎ\s*তহবিল|আয়কর/i.test(t) && /বেতন|মাস/i.test(t)) salaryScore += 4;

      // Notice patterns
      if (/বিজ্ঞপ্তি|নোটিশ|অফিস\s*আদেশ|জরুরি\s*বিজ্ঞপ্তি/i.test(t)) noticeScore += 6;
      if (/স্মারক\s*নং|জ্ঞাতার্থে|সদয়\s*অবগতি|অনুলিপি/i.test(t)) noticeScore += 4;

      // CV/Resume patterns (deduplicated)
      if (/জীবনবৃত্তান্ত|বায়োডাটা|কারিকুলাম\s*ভিটা|CURRICULUM\s*VITAE|RESUME|পিতার\s*নাম.*মাতার\s*নাম|শিক্ষাগত\s*যোগ্যতা/i.test(t)) cvScore += 8;
      if (/ব্যক্তিগত\s*তথ্য|পেশাগত\s*অভিজ্ঞতা|কর্মঅভিজ্ঞতা|দক্ষতা\s*সমূহ|জাতীয়তা|জাতীয়তা|স্থায়ী\s*ঠিকানা|স্থায়ী\s*ঠিকানা|বর্তমান\s*ঠিকানা|REFERENCE/i.test(t)) cvScore += 5;
      if (/পরীক্ষার\s*নাম.*পাশের\s*সন|বোর্ড\/বিশ্ববিদ্যালয়|বোর্ড\/বিশ্ববিদ্যালয়/i.test(t)) cvScore += 4;

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

      // 1. CQ Paper - REQUIRED Gate
      if (!/উদ্দীপক|দৃশ্যকল্প|সৃজনশীল/i.test(t)) {
        // Only keep cqScore if it has very strong subquestion patterns, else block it
        if (!/ক\.\s*[^\n]+\s*খ\.\s*[^\n]+\s*গ\./.test(t)) {
          cqScore = 0;
        }
      }

      // Part-18.0: দলিল — হলফনামা/অঙ্গীকারনামা (আগে "জাতীয়তা" দেখে সিভি হয়ে যেত)
      if (/হলফ\s*নামা|হলফপূর্বক|এফিডেভিট|অঙ্গীকার\s*নামা/.test(t)) stampScore += 14;
      // Part-18.0: রুটিন — "রুটিন" শব্দ + বার/তারিখের টেবিল (আগে শুধু "ক্লাস রুটিন/পিরিয়ড")
      if (/রুটিন/.test(t) && /^\s*\|.*(?:বার|তারিখ|সময়|সময়)/m.test(t)) routineScore += 30;
      const mathScore = isMathPaper ? 30 : 0;

      const scores = [
        { type: this.DOC_TYPES.EXAM_MATH, score: mathScore },
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

      // 3. Priority Order / Tie-breaker
      if (scores[0].score > 0 && scores.length > 1) {
        if (scores[0].score - scores[1].score < 4) {
          // If CQ is close to the top, prefer CQ
          if (scores[1].type === this.DOC_TYPES.EXAM_CQ) {
            const temp = scores[0];
            scores[0] = scores[1];
            scores[1] = temp;
          }
        }
      }

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
