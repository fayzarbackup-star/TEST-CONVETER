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
    /**
     * Part-12 (ট্রায়াজ ২): সাব-প্রশ্নের লাইন-শেষ থেকে প্রকৃত নম্বর তোলা।
     * `... ৩`, `... ৩ নম্বর`, `... [৩]`, `... (মান: ৩)` — যা টেক্সটে লেখা আছে সেটাই নেওয়া
     * হয়; না থাকলে খালি। আগে লেবেল থেকে নম্বর *কল্পনা* করা হতো (ক→১, খ→২, গ→৩, ঘ→৪),
     * ফলে বাক্সে ভুল নম্বর বসত এবং প্রশ্নের শেষ শব্দটি মনে হতো নম্বর।
     */
    _cqMarkTail(text) {
      const s = String(text == null ? '' : text).trim();
      const m = s.match(/[ 	]+[([]?\s*(?:(?:মান|মার্ক)[:ঃ]?\s*)?([০-৯\d]+)\s*(?:নম্বর|মার্ক|মান)?[)\]]?\s*$/);
      if (!m) return { text: s, mark: '' };
      const head = s.slice(0, m.index).replace(/[\s\t]+$/, '').trim();
      if (!head) return { text: s, mark: '' };
      return { text: head, mark: m[1] };
    },

    /**
     * Part-9j: একটি CQ-লাইন থেকে সাব-প্রশ্ন ভাগ করা।
     * সীমা = লাইন-শুরু, ট্যাব, বা ২+ স্পেস — তাই `গ. সা. গু.` (এক স্পেসে বসা সংক্ষেপ)
     * ভাঙে না, কিন্তু `ক. লেখা\t২\tখ. লেখা\t৮` ঠিকঠাক তিন টুকরো হয়।
     */
    _cqSubLineParts(line) {
      const s = String(line);
      const marks = [];
      const re = /(?:^|\t| {2,})([কখগঘ])[\.\:।\-]\s*/g;
      let m;
      while ((m = re.exec(s)) !== null) marks.push({ label: m[1], start: m.index, textStart: re.lastIndex });
      if (!marks.length || marks[0].start !== 0) return [];
      const parts = [];
      for (let i = 0; i < marks.length; i++) {
        const end = (i + 1 < marks.length) ? marks[i + 1].start : s.length;
        const tk = this._cqMarkTail(s.slice(marks[i].textStart, end).trim());
        if (tk.text) parts.push({ label: marks[i].label, text: tk.text, mark: tk.mark });
      }
      return parts;
    },

    parseQuestionPaper(rawText, parseOptions = {}) {
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

      // Part-10: MCQ হেডার-উন্নতি শুধু EXAM_MCQ আর্কিটাইপে প্রযোজ্য — EXAM_CQ /
      // EXAM_MATH / EXAM_GENERAL পাথ স্বেচ্ছায় অছুয়িত (ফ্রোজেন চুক্তি)।
      const isMcqParse = (parseOptions && parseOptions.docType) === 'EXAM_MCQ';

      // Extract header lines from top
      for (let i = 0; i < Math.min(8, lines.length); i++) {
        const line = lines[i];
        const cleanLine = line.replace(/^[\*\#\-\s]+/, '').trim();
        // Part-9j: হেডার-স্ক্যান যেন body-লাইন না গেলে — `## প্রশ্ন ১২।` ও `ক)`/`ক.` অপশন-লাইন
        // এখানে ব্রেক না করায় আগে `ক) ঢাকা ...` লাইনটিকে header.location ভেবে bodyStartIndex
        // এগিয়ে যেত ⇒ প্রথম প্রশ্ন(গুলো) নিঃশব্দে বাদ পড়ত (MCQ প্রশ্নপত্রে ধরা পড়েছে)।
        if (/^(?:প্রশ্ন\s*)?[\u09E6-\u09EF\d]+[।.)]/.test(cleanLine) ||
            /^(?:[কখগঘ]|[abcdABCD])[\.\:।\-\)\]]/.test(cleanLine) ||
            /^#{1,6}\s*(?:প্রশ্ন\s*)?[\u09E6-\u09EF\d]+[।.)]/.test(line)) {
          break; // Questions have started, header is complete
        }
        if (!result.header.institute && /স্কুল|কলেজ|মাদরাসা|বিদ্যালয়|একাডেমী|প্রতিষ্ঠান/i.test(cleanLine) || (isMcqParse && /\u09ac\u09bf\u09a6\u09cd\u09af\u09be\u09b2(?:\u09df|\u09af\u09bc)/i.test(cleanLine))) {
          result.header.institute = cleanLine;
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if (!result.header.location && /ফুলবাড়ী|দিনাজপুর|ঢাকা|উপজেলা|জেলা/i.test(cleanLine) && !/শ্রেণি|বিষয়|সময়/.test(cleanLine)) {
          result.header.location = cleanLine;
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if (isMcqParse && !result.header.location && result.header.institute && i >= 1 &&
                   lines[i - 1].replace(/^[\*\#\-\s]+/, '').trim() === result.header.institute &&
                   /[,।.]|কিলোমিটার|রোড|গ্রাম|থানা|উপজেলা|জেলা|বিভাগ|পোস্ট|পেট|সড়ক/.test(cleanLine) &&
                   cleanLine.length <= 70 && !/পরীক্ষা|শ্রেণি|বিষয়|সময়|পূর্ণমান|বিদ্যালয়|স্কুল|কলেজ|মাদরাসা/.test(cleanLine)) {
          // Part-10 (খ.২): OCR/মার্কডাউনের ক্রম — প্রতিষ্ঠান-লাইনের ঠিক পরের লাইনটাই ঠিকানা।
          // পুরনো নিয়ম শুধু কয়েকটি জেলার নাম চিনত, তাই 'কোতোয়ালী, রংপুর'-এর মতো ঠিকানা
          // থাকতেও 'ঠিকানা লিখুন' বসত। নিয়মটি সচেতনভাবে কেবল EXAM_MCQ-তে (CQ/Math অছুয়িত)।
          result.header.location = cleanLine;
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if (!result.header.exam && /পরীক্ষা|মূল্যায়ন|টার্ম|সেমিস্টার|নির্বাচনী/i.test(cleanLine) && !/বহুনির্বাচন|নৈর্ব্যক্তিক/.test(cleanLine)) {
          result.header.exam = cleanLine;
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if (/শ্রেণি|বিষয়/i.test(cleanLine)) {
          let cLine = cleanLine;
          const examSubMatch = cLine.match(/(বহুনির্বাচন[িী]\s*অভ[িী]ক্ষা(?:[\-\s]*[\u09E6-\u09EF\d]+)?|নৈর্ব্যক্তিক\s*অভ[িী]ক্ষা(?:[\-\s]*[\u09E6-\u09EF\d]+)?|\u09b8\u09c3\u099c\u09a8\u09b6\u09c0\u09b2\s*\u0985\u09ad[\u09bf\u09c0]\u0995\u09cd\u09b7\u09be(?:[\-\s]*[\u09E6-\u09EF\d]+)?)/i);
          if (examSubMatch) {
            result.header.examType = examSubMatch[1].trim();
            cLine = cLine.replace(examSubMatch[0], '').trim();
            cLine = cLine.replace(/;\s*$/, ';').trim();
          }
          result.header.classAndSubject = (result.header.classAndSubject ? result.header.classAndSubject + '  |  ' : '') + cLine;
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if (((cleanLine.startsWith('[') && cleanLine.endsWith(']')) || /^\[?বিশেষ\s*দ্রষ্টব্য/i.test(cleanLine)) &&
                   // Part-12: `[উদ্দীপক ১]` নির্দেশনা নয় — উদ্দীপক-ব্লকের মার্কার, body-তে থাকবে
                   !/^\[?\s*(?:নিচের\s+)?উদ্দীপক/i.test(cleanLine)) {
          result.header.instructions = cleanLine;
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if (!cleanLine.startsWith('[') && /বহুনির্বাচন[িী]\s*অভ[িী]ক্ষা|নৈর্ব্যক্তিক\s*অভ[িী]ক্ষা|সৃজনশীল\s*অভ[িী]ক্ষা/i.test(cleanLine) && !/সময়|পূর্ণমান/.test(cleanLine)) {
          const examSubMatch = cleanLine.match(/(বহুনির্বাচন[িী]\s*অভ[িী]ক্ষা(?:[\-\s]*[\u09E6-\u09EF\d]+)?|নৈর্ব্যক্তিক\s*অভ[িী]ক্ষা(?:[\-\s]*[\u09E6-\u09EF\d]+)?|\u09b8\u09c3\u099c\u09a8\u09b6\u09c0\u09b2\s*\u0985\u09ad[\u09bf\u09c0]\u0995\u09cd\u09b7\u09be(?:[\-\s]*[\u09E6-\u09EF\d]+)?)/i);
          if (examSubMatch) {
            result.header.examType = examSubMatch[1].trim();
          } else {
            result.header.examType = cleanLine.trim();
          }
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        } else if ((/\u09b8\u09ae(?:\u09df|\u09af\u09bc?)/i.test(cleanLine) || /পূর্ণমান|মান/i.test(cleanLine)) && (!result.header.time || !result.header.marks) &&
                   // Part-12 (অডিট ৩-এর মূল কারণ): 'মান' শব্দের অংশ থাকলেই এই শাখাটি
                   // উদ্দীপকের অনুচ্ছেদটি হেডার-মান মনে করে খেয়ে ফেলত ⇒ প্রথম উদ্দীপক হারাত
                   // (নমুনা: 'গ্রামের মানুষ চিন্তিত হয়ে পড়ে।')। এখন কেবল মান/সময় সংখ্যাসহ
                   // মেটালাইন ধরা হয়; বাকি লাইন body-তে থাকে।
                   (/সম(?:য়|য)\s*[\u0983:\-]?\s*[\u09E6-\u09EF\dA-Za-z]/.test(cleanLine) || /(?:পূর্ণমান|মান)\s*[\u0983:\-]?\s*[\u09E6-\u09EF\d]/.test(cleanLine)) &&
                   // Part-12: `বিভাগ: গণিত ... মান: ২০` শিরোনাম-লাইন — হেডার নয়, body-তে রাখা হয়
                   !/^\**\s*(?:বিভাগ|অংশ)\s*[ঃ:\-]/.test(cleanLine)) {
          let cLine = cleanLine;
          const examSubMatch = cLine.match(/(বহুনির্বাচন[িী]\s*অভ[িী]ক্ষা(?:[\-\s]*[\u09E6-\u09EF\d]+)?|নৈর্ব্যক্তিক\s*অভ[িী]ক্ষা(?:[\-\s]*[\u09E6-\u09EF\d]+)?|\u09b8\u09c3\u099c\u09a8\u09b6\u09c0\u09b2\s*\u0985\u09ad[\u09bf\u09c0]\u0995\u09cd\u09b7\u09be(?:[\-\s]*[\u09E6-\u09EF\d]+)?)/i);
          if (examSubMatch) {
            result.header.examType = examSubMatch[1].trim();
            cLine = cLine.replace(examSubMatch[0], ' ');
          }

          let tMatch = cLine.match(/\u09b8\u09ae(?:\u09df|\u09af\u09bc?)[\u0983:\-]\s*([^;\n|]+?)(?=(?:পূর্ণমান|সৃজনশীল|বহুনির্বাচন|মান|$))/i);
          // Part-10 (খ.২ লাইন ৫): "সময়: ৩০ মিনিট  |  পূর্ণমানঃ ৩০" — বিবরেটরসহ একই
          // লাইনে দুটোই থাকায় strict lookahead সময় বাদ দিত; MCQ-তে শিথিল প্যাটার্ন।
          if (!tMatch && isMcqParse) {
            tMatch = cLine.match(/\u09b8\u09ae(?:\u09df|\u09af\u09bc?)[:\u0983-]\s*([^;\n]+?)(?=\s*[:|\u0964]?\s*(?:\u09aa\u09c2\u09b0\u09cd\u09a3\u09ae\u09be\u09a8|\u09b8\u09c3\u099c\u09a8\u09b6\u09c0\u09b2|\u09ac\u09b9\u09c1\u09a8\u09bf\u09b0\u09cd\u09ac\u09be\u099a\u09a8|\u09ae\u09be\u09a8)|$)/i);
          }
          const mMatch = cLine.match(/(?:পূর্ণমান|মান)[ঃ:\-]?\s*([^\n;]+)/i);
          if (tMatch && !result.header.time) result.header.time = tMatch[1].trim();
          if (mMatch && !result.header.marks) result.header.marks = mMatch[1].trim();
          bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        }
      }

      // Part-9j: ফাইলের শেষে থাকা যাচাই/অডিট-নোট ব্লক আলাদা করা হয় — প্রশ্নের গায়ে জোড়া না লেগে
      // শেষ পৃষ্ঠায় "যাচাই প্রতিবেদন" শীট হিসেবে HTML/DOCX/RTF তিন পথেই একইভাবে ছাপে
      // (preview == download; ব্যবহারকারীর নিয়ম: অডিট নোট শেষ পৃষ্ঠায় একা)।
      const _auditSplit = this._extractTrailingAuditNote(lines.slice(bodyStartIndex));
      if (_auditSplit.note) result.auditNote = _auditSplit.note;
      const bodyLines = _auditSplit.lines;
      let currentSection = { title: '', marks: '', questions: [] };
      let currentQuestion = null;
      let pendingPreContext = '';
      let pendingStimulus = '';      // Part-12 (অডিট ৩): `[উদ্দীপক ১]` ব্লকের চলমান টেক্সট
      let stimulusOpen = false;

      for (let i = 0; i < bodyLines.length; i++) {
        const line = bodyLines[i];

        // Part-12 (অডিট ৩): `[উদ্দীপক ১]` / `উদ্দীপক: ১` মার্কার। আগে এই লাইনটি
        // কোনো শাখায় ধরা পড়ত না ⇒ আগের প্রশ্নের বডিতে যুক্ত হতো, আর পরের প্রশ্নের
        // উদ্দীপক ভুল জায়গায় বসত (নমুনা: প্রথম উদ্দীপক হারানো, দ্বিতীয়টি Q4-এ আটকানো)।
        {
          const bm2 = line.match(/^\s*[\[(]\s*(?:উদ্দীপক|নিচের উদ্দীপক)\s*[#:\u0983]?\s*([\u09E6-\u09EF\d]*)\s*[\])]\s*(.*)$/);
          const bm3 = line.match(/^\s*(?:উদ্দীপক)\s*[:\u0983]\s*([\u09E6-\u09EF\d]+)\s*$/);
          if (bm2 || bm3) {
            const num = (bm2 ? bm2[1] : bm3[1]) || '';
            const rest = (bm2 && bm2[2] ? String(bm2[2]).trim() : '');
            // উৎসের `উদ্দীপক ১` লেবেলটি হারায় না (HEAD-এ এটি বন্ধনিসহ ছাপা হতো) —
            // এখন বন্ধনীবিহীন পরিচ্ছন্ন লেবেল হিসেবে উদ্দীপকের প্রথম লাইনে থাকে।
            const label = num ? 'উদ্দীপক ' + num : '';
            const blk = [label, rest].filter(Boolean).join('\n');
            if (currentQuestion && !currentQuestion.stimulus) currentQuestion.stimulus = blk;
            pendingStimulus = blk;
            stimulusOpen = true;
            continue;
          }
          if (stimulusOpen) {      // মার্কার স্পষ্টভাবে ব্লক খোলে ⇒ খোলা প্রশ্ন থাকলেও লাইনগুলো উদ্দীপকে যায়
            const t = line.trim();
            const isNextQ = /^(?:>\s*)?(?:#{1,6}\s*)?(?:প্রশ্ন[\s\-:\u0983.]*)?[\u09E6-\u09EF\d]+[\u0964.)]/.test(t);
            // Part-12: সেকশন-বিভাজক/বিভাগ-শিরোনাম উদ্দীপকে জমা হয় না (combined পেপারে
            // `---SECTION_BREAK:MCQ---` প্রথম উদ্দীপকের সঙ্গে মিশে গিয়েছিল)
            const isBoundary = isNextQ || /SECTION[\s_\-]*BREAK/i.test(t) || /^[\-–—=*#\s]+$/.test(t) ||
              /^#{0,6}\s*(?:বিভাগ|অংশ|সেকশন|Section)\b/.test(t) || /(?:বিভাগ|অংশ)[\u0983:\-]/.test(t);
            if (!t) { stimulusOpen = false; continue; }        // ফাঁকা লাইন ব্লক শেষ করে
            if (!isBoundary) {
              pendingStimulus += (pendingStimulus ? '\n' : '') + t;
              continue;
            }
            stimulusOpen = false;
          }
        }

        // Section Title Detection
        if (/(?:বিভাগ|অংশ)[ঃ:\-]|সৃজনশীল\s*প্রশ্ন|সংক্ষিপ্ত(?:-উত্তর)?\s*প্রশ্ন|বহুনির্বাচনি|নৈর্ব্যক্তিক/i.test(line) && line.length < 75) {
          if (currentQuestion) {
            currentSection.questions.push(currentQuestion);
            currentQuestion = null;
          }
          if (currentSection.questions.length > 0 || currentSection.title) {
            result.sections.push(currentSection);
          }
          // Part-12 (অডিট ১-এর সহ-তথ্য): `বিভাগ: গণিত মান: ২০` — শিরোনামের সঙ্গে
          // লেগে-থাকা পূর্ণমান এখন আলাদা ফিল্ডে (আগে পুরো লাইনটি শিরোনাম হতো)।
          const secTail = line.match(/(?:মান|মার্ক)[\u0983:\u09df]\s*([\u09E6-\u09EF\d]+)\s*$/);
          currentSection = {
            title: secTail ? line.slice(0, secTail.index).replace(/[\s,;:\u0964\-–]+$/, '') : line,
            marks: secTail ? secTail[1] : '',
            questions: []
          };
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
        // Part-9j: OCR হেডিং প্রায়ই `## প্রশ্ন ১২। ...` লিখে — আগে `#` আর সংখ্যার মাঝে
        // `প্রশ্ন` শব্দ থাকলে রেগেক্স ফেল করত ⇒ প্রশ্নটি parse-ই হতো না, নিঃশব্দে হারিয়ে যেত।
        const qStartMatch = line.match(/^(?:>\s*)?(?:#{1,6}\s*)?(?:প্রশ্ন[\s\-–—:ঃ.]*)?([\u09E6-\u09EF\d]+)[।.)]\s*(.*)$/);
        if (qStartMatch) {
          // Part-12 (ট্রায়াজ ৩): `১. ক.` `১. খ.` … — একই নম্বরের লেবেল-সারিগুলো আলাদা
          // প্রশ্ন নয়; খোলা প্রশ্নের সাব-প্রশ্ন হিসেবে জমা হয় (আগে প্রতি লাইনে নতুন প্রশ্ন
          // তৈরি হয়ে ৪টি চ্যাপ্টা প্রশ্নের তালিকা হতো, উদ্দীপক আলাদা ব্লক থাকায় হারাত)।
          if (currentQuestion && String(currentQuestion.num) === String(qStartMatch[1])) {
            const dupLbl = qStartMatch[2].trim().match(/^([\u0995\u0996\u0997\u0998\u0999\u099a])[\.\u0983\u0964\-\u2013\u2014]\s*(.+)$/);
            if (dupLbl) {
              const tk2 = this._cqMarkTail(dupLbl[2]);
              currentQuestion.subQuestions.push({ label: dupLbl[1], text: tk2.text, mark: tk2.mark });
              continue;
            }
          }
          if (currentQuestion) {
            currentSection.questions.push(currentQuestion);
          }
          currentQuestion = {
            num: qStartMatch[1],
            text: qStartMatch[2].trim(),
            preContext: pendingPreContext,
            stimulus: pendingStimulus,
            statements: [],
            subQuestions: [],
            options: []
          };
          pendingPreContext = '';
          // Part-12 (ট্রায়াজ ৩): `১. নিচের উদ্দীপকটি পড়ে প্রশ্নগুলোর উত্তর দাও।`
          // স্টেম নয় — এটি ঐ নম্বরের সাব-প্রশ্নগুলোর সাধারণ উদ্দীপক। আগে এটি স্বাধীন
          // "প্রশ্ন" হয়ে ৮টি চ্যাপ্টা প্রশ্নের তালিকা বানাত; এখন ২টি গ্রুপ (প্রতিটিতে ৪টি
          // সাব-প্রশ্ন + নিজস্ব উদ্দীপক) তৈরি হয়।
          if (!currentQuestion.stimulus && /^নিচের\s*(?:উদ্দীপক|অনুচ্ছেদ|তথ্য|ছক|চিত্র)/i.test(currentQuestion.text) &&
              /(?:পড়|উত্তর দাও|লক্ষ্য কর|দেখো)/i.test(currentQuestion.text)) {
            currentQuestion.stimulus = currentQuestion.text;
            currentQuestion.text = '';
          }
          // Part-12 (ট্রায়াজ ৩): `১. ক. <বিষয়বস্তু> ৩` — নম্বরের সঙ্গে লেবেল একই লাইনে
          // এলে সেটিকে স্বতন্ত্র প্রশ্ন না করে ঐ নম্বরের প্রথম সাব-প্রশ্ন করা হয়।
          if (!/MCQ/i.test(String((parseOptions && parseOptions.docType) || ''))) {
            const inlineSub = currentQuestion.text.match(/^([\u0995\u0996\u0997\u0998\u0999\u099a])[\.\u0983:\u0964\-\u2013\u2014]\s*(.+)$/);
            if (inlineSub) {
              const tk = this._cqMarkTail(inlineSub[2]);
              currentQuestion.subQuestions.push({ label: inlineSub[1], text: tk.text, mark: tk.mark });
              currentQuestion.text = '';
            }
          }
          // উদ্দীপক একবারই ছাপা হয় (দুই প্রশ্নে ডুপ্লিকেট এড়াতে মার্কার খরচ হলো)
          stimulusOpen = false;
          pendingStimulus = '';
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

        // Part-9c-fix: CQ-তে বন্ধনী-লেবেল (ক) খ) গ) ঘ)) = সাব-প্রশ্ন — MCQ অপশন নয়।
        // আগে OCR-এর `ক)` `খ)` লাইনগুলো parseMcqOptions-এ ধরা পড়ে `options` হয়ে যেত;
        // CQ রেন্ডারারে options ছাপা হয় না ⇒ প্রশ্নের ক/খ/গ পুরো হারিয়ে যেত (.doc/.docx দুটোতেই)।
        const _isMcqCtx = /MCQ/i.test(String((parseOptions && parseOptions.docType) || ''));
        if (!_isMcqCtx && currentQuestion && (!currentQuestion.options || currentQuestion.options.length === 0)) {
          const brSub = line.match(/^\(?\s*([কখগঘ])\s*\)\s*(.+)$/);
          if (brSub) {
            const bt = this._cqMarkTail(brSub[2]);
            currentQuestion.subQuestions.push({
              label: brSub[1],
              text: bt.text,
              mark: bt.mark          // Part-12: উৎসে নম্বর না থাকলে খালি — কল্পনা করা হয় না
            });
            continue;
          }
        }

        // Part-9j: CQ-তে লাইন-শুরুতে `ক./খ./গ./ঘ.` = সাব-প্রশ্ন — parseMcqOptions-এর আগেই ধরা হয়।
        // আগে inline সংক্ষেপ (যেমন `গ. সা. গু.` = গরিষ্ঠ সাধারণ গুণনীয়ক) দুই টুকরো হয়ে option-এ
        // চলে যেত ⇒ CQ রেন্ডারে সেগুলো ছাপা হয় না ⇒ সাব-প্রশ্ন ও মার্ক দুটোই নিঃশব্দে হারাত।
        const _cqDocCtx = !/MCQ/i.test(String((parseOptions && parseOptions.docType) || ''));
        if (_cqDocCtx && currentQuestion && (currentQuestion.options || []).length === 0 &&
            (!currentQuestion.statements || currentQuestion.statements.length === 0) &&
            /^[কখগঘ][\.\:।\-]\s/.test(line)) {
          const cqParts = this._cqSubLineParts(line);
          if (cqParts.length) {
            for (const part of cqParts) {
              currentQuestion.subQuestions.push({
                label: part.label,
                text: part.text,
                mark: part.mark || ''      // Part-12: কল্পিত ডিফল্ট (ক→১ খ→২ …) বাদ
              });
            }
            continue;
          }
        }

        // 2. MCQ Options Detection
        const mcqOpts = this.parseMcqOptions(line);
        // If they end with marks (১, ২, ৩, ৪) or text is very long, they might be merged CQ subquestions
        const isMcqDoc = /MCQ/i.test(String((parseOptions && parseOptions.docType) || ''));
const isMergedCqSub = !isMcqDoc && mcqOpts.length >= 2 && mcqOpts.some(o => /[\s\t]+[\u09E6-\u09EF\d]$/.test(o.text.trim()) || o.text.trim().length > 50);
        
        // Part-9b: অপশন-সীমা — একই লেবেল (ক/খ/গ/ঘ) আবার শুরু হলে সেটা নতুন প্রশ্নের শুরু,
        // আগের প্রশ্নে জোড়া লাগানো নয় (১৫-অপশনের ভুল-গ্রুপিং ও তথ্য-হার দুটোই ঠেকায়)।
        if (mcqOpts.length > 0 && currentQuestion && currentQuestion.options.length > 0 &&
            currentQuestion.options.some(o => o.label === mcqOpts[0].label)) {
          currentSection.questions.push(currentQuestion);
          currentQuestion = {
            num: '',
            text: line.trim(),
            preContext: '',
            stimulus: '',
            statements: [],
            subQuestions: [],
            options: []
          };
          continue;
        }

        if (mcqOpts.length >= 2 && currentQuestion && !isMergedCqSub) {
          currentQuestion.options = currentQuestion.options.concat(mcqOpts);
          continue;
        }

        if (isMergedCqSub && currentQuestion) {
          for (const opt of mcqOpts) {
            let text = opt.text.trim();
            const markMatch = text.match(/[\s\t]+([\u09E6-\u09EF\d]+)\s*$/);
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
        const subMatch = line.match(/^([কখগঘ]|[abcdABCD])[\.\:।\-]\s*(.*?)(?:[\s\t]*([\u09E6-\u09EF\d]+))?\s*$/);
        if (subMatch && !isMcqDoc && currentQuestion && currentQuestion.options.length === 0 && (!currentQuestion.statements || currentQuestion.statements.length === 0)) {
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

        // Part-12: পাইপলাইন-নিয়ন্ত্রণ লাইন (`---SECTION_BREAK:MCQ---`, `[LAYOUT: …]`) কনটেন্টে
        // জোড়া লাগে না — main.js / doc-classifier এগুলো উপরেই আলাদা করে; এখানে এসে গেলে উপেক্ষা।
        if (/^\s*[-\u2013\u2014=*\s]*SECTION[\s_\-]*BREAK[\s\S]*$/i.test(line) || /^\s*\[LAYOUT:/i.test(line)) continue;

        // Append to question text / stimulus (strip leading > if present)
        if (currentQuestion) {
          const cleanStim = line.replace(/^>\s?/, '');
          if (currentQuestion.subQuestions.length === 0 && currentQuestion.options.length === 0) {
            currentQuestion.stimulus += (currentQuestion.stimulus ? '\n' : '') + cleanStim;
          } else if (currentQuestion.subQuestions.length > 0) {
            const lastSub = currentQuestion.subQuestions[currentQuestion.subQuestions.length - 1];
            lastSub.text += ' ' + cleanStim;
          } else if ((currentQuestion.options || []).length > 0) {
            // Part-9j: MCQ-তে অপশনের পরে আসা লাইন আগে নিঃশব্দে বাদ পড়ত (টীকা/নোট/গোটা-লাইন ধারাবাহিকতা) —
            // এখন প্রশ্নের টেক্সটে যোগ হয়, হারায় না।
            currentQuestion.text = (currentQuestion.text ? currentQuestion.text + ' ' : '') + cleanStim;
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
      // Part-9e: LaTeX/কোড-স্প্যানের ভিতরের অক্ষরকে অপশন-লেবেল ভাবা নিষিদ্ধ।
      // আগে `$3\vec{a} - 2\vec{b}$`-এর ভিতরের `a`/`b`-কে ইংরেজি লেবেল `a.`, `b.` ভেবে ভেঙে
      // ফেলা হত ⇒ অপশনে ভূত-লেবেল (ক a খ b) আর `\vec` হারিয়ে যেত (ব্যবহারকারীর স্ক্রিনশট #৩)।
      // এখন: কোড-স্প্যানগুলো (ব্যাকটিক, $..$, $$..$$) মাস্ক করে কেবল বাইরের লেখায় লেবেল খোঁজা হয়।
      const spans = [];
      const masked = String(line).replace(/`[^`]*`|\$\$[\s\S]*?\$\$|\$[^$]*\$/g, (mm) => {
        spans.push(mm);
        return '\u0000' + (spans.length - 1) + '\u0000';
      });

      const regex = /(?:^|\s*)(?:[\(\[\{（]?([ক-চa-dABCD])[.)\]\}]\s*)(.*?)(?=(?:[\s\t]*[\(\[\{（]?[ক-চa-dABCD][.)\]\}]|$))/g;
      const options = [];
      let m;
      // মাস্ক-করা অংশ বাদ দিয়ে লেবেল-পজিশন খুঁজি
      const labelPositions = [];
      let mm2;
      const labelRe = /(?:^|[\s\t])(?:[\(\[\{（]?([ক-চa-dABCD])[.)\]\}]\s*)/g;
      while ((mm2 = labelRe.exec(masked)) !== null) {
        labelPositions.push({ label: mm2[1], start: mm2.index + (mm2[0].length - mm2[0].replace(/^[\s\t]+/, '').length), contentStart: labelRe.lastIndex });
      }
      if (labelPositions.length === 0) return options;
      for (let i = 0; i < labelPositions.length; i++) {
        const end = i + 1 < labelPositions.length ? labelPositions[i + 1].start : masked.length;
        let text = masked.slice(labelPositions[i].contentStart, end).trim();
        // ট্রেইলিং খোলা ব্র্যাকেট বাদ
        text = text.replace(/[\(\[\{（]+$/, '').trim();
        // মাস্ক-প্লেসহোল্ডার ফিরিয়ে আনি
        text = text.replace(/\u0000(\d+)\u0000/g, (x, idx) => spans[parseInt(idx, 10)] || '');
        text = this.normalizeRomanText(text);
        if (text) options.push({ label: labelPositions[i].label, text });
      }
      return options;
    },

    /**
     * Renders MCQ Options in 4-Column or Auto 2-Column layout.
     * Guaranteed 4 columns for short text and Roman combined options; collapses to 2 columns if longer or forced.
     */
    /* =====================================================================
     * Part-10: MCQ মাস্টার লেআউট — প্রিভিউ ও এক্সপোর্ট একই জ্যামিতি প্ল্যান
     * ব্যবহার করে (McqLayoutPlanner)। preview == download চুক্তি এখান থেকেই।
     * ===================================================================== */
    _getMcqPlanner() {
      if (typeof McqLayoutPlanner !== 'undefined') return McqLayoutPlanner;
      if (typeof window !== 'undefined' && window.McqLayoutPlanner) return window.McqLayoutPlanner;
      if (typeof globalThis !== 'undefined' && globalThis.McqLayoutPlanner) return globalThis.McqLayoutPlanner;
      if (typeof global !== 'undefined' && global.McqLayoutPlanner) return global.McqLayoutPlanner;
      if (typeof require === 'function') {
        try { return require('../layout-engine/mcq-layout-planner.js'); } catch (e1) {
          try { return require('./mcq-layout-planner.js'); } catch (e2) {}
        }
      }
      return null;
    },

    /** Part-10 (খ.৩): হেডার অটো-প্লেসহোল্ডার — তথ্য না মিললেও কাঠামো অটুট থাকে */
    MCQ_HEADER_FALLBACK: {
      institute: 'আপনার প্রতিষ্ঠান এর নাম',
      location: 'ঠিকানা লিখুন',
      exam: 'পরীক্ষার নাম লিখুন',
      classSubject: 'শ্রেণিঃ ................  |  বিষয়ঃ ................',
      time: 'সময়: ................',
      marks: 'পূর্ণমানঃ ................'
    },

    /** প্রিভিউ/এক্সপোর্ট দুই পথেই একই ফলব্যাক টেক্সট বসে */
    applyMcqHeaderFallbacks(header) {
      const FB = this.MCQ_HEADER_FALLBACK;
      const h = header || {};
      return {
        institute: h.institute || FB.institute,
        location: h.location || FB.location,
        exam: h.exam || FB.exam,
        classAndSubject: h.classAndSubject || FB.classSubject,
        examType: h.examType || '',
        // সময়/পূর্ণমান কাঁচা মান হিসেবেই রাখা হয় — রেন্ডারার নিজে 'সময়: '/'পূর্ণমানঃ '
        // প্রিফিক্স বসায় (ডাবল-প্রিফিক্স এড়াতে)। প্লেসহোল্ডারে ডট বসে।
        time: h.time || '................',
        marks: h.marks || '................',
        instructions: h.instructions || '',
        fallbackUsed: {
          institute: !h.institute,
          location: !h.location,
          exam: !h.exam,
          classAndSubject: !h.classAndSubject,
          time: !h.time,
          marks: !h.marks
        }
      };
    },

    /** Part-10: জ্যামিতি প্ল্যান (প্রিভিউ) — প্ল্যানার না পেলে null → পুরনো পাথ চলবে */
    _mcqLayoutPlan(parsedData, options = {}) {
      const planner = this._getMcqPlanner();
      if (!planner || typeof planner.plan !== 'function') return null;
      try {
        const p = planner.plan(parsedData, {
          docType: 'EXAM_MCQ',
          margin: options.marginInches || options.margin || 0.5,
          columnGap: options.columnGapInches || 0.2,
          colSep: options.colSep !== false,
          layoutMode: options.layoutMode || 'AUTO',
          forceSz: options.forceSz,
          maxShrinkOverflow: options.maxShrinkOverflow
        });
        return (p && p.geometry && Array.isArray(p.pages)) ? p : null;
      } catch (e) {
        return null;
      }
    },

    /**
     * Part-11: CQ বুকলেট প্ল্যানার লোডার (একই মডিউল এক্সপোর্ট-ইঞ্জিন ও প্রিভিউ ব্যবহার করে)।
     */
    _getCqPlanner() {
      if (typeof CqBookletPlanner !== 'undefined') return CqBookletPlanner;
      if (typeof window !== 'undefined' && window.CqBookletPlanner) return window.CqBookletPlanner;
      if (typeof globalThis !== 'undefined' && globalThis.CqBookletPlanner) return globalThis.CqBookletPlanner;
      if (typeof global !== 'undefined' && global.CqBookletPlanner) return global.CqBookletPlanner;
      if (typeof require === 'function') {
        try { return require('../layout-engine/cq-booklet-planner.js'); } catch (e) {
          try { return require('./cq-booklet-planner.js'); } catch (e2) {}
        }
      }
      return null;
    },

    /** Part-11: প্রিভিউও একই জ্যামিতি/কলাম-বণ্টন মানে — preview == download */
    _cqLayoutPlan(parsedData, options = {}) {
      const planner = this._getCqPlanner();
      if (!planner || typeof planner.plan !== 'function') return null;
      try {
        const p = planner.plan(parsedData, {
          docType: 'EXAM_CQ',
          margin: options.marginInches || options.margin || 0.5,
          columnGap: options.columnGapInches || options.columnGap || 0.7,
          cols: options.columns || 2,
          rightTab: options.rightTab,
          skipFirstColumn: options.skipFirstColumn
        });
        return (p && p.geometry && Array.isArray(p.columns)) ? p : null;
      } catch (e) {
        return null;
      }
    },


    renderMcqOptions(options, renderOpts = {}) {
      if (!options || options.length === 0) return '';

      const maxLen = Math.max(...options.map(o => o.text.length));
      const totalLen = options.reduce((sum, o) => sum + o.text.length, 0);
      const isRoman = options.every(o => /(?:^|[\s,(])(?:i{1,3}|iv|র{1,3})(?:[\s,.)]|$)/i.test(o.text));

      let gridClass = 'mcq-grid-4';
      if (renderOpts.forceTwoColumns || (!isRoman && (maxLen > 14 || totalLen > 48))) {
        gridClass = maxLen > 25 ? 'mcq-grid-1' : 'mcq-grid-2';
      }
      // Part-10 (ঘ.১–ঘ.২): প্ল্যানার পরিমাপ করে যে গ্রিড ঠিক করেছে, প্রিভিউ সেটিই মানে —
      // ৪টি ছোট বিকল্প সমান দূরত্বে এক লাইনে, বড় হলে ২, আরও বড় হলে ১।
      const planCols = renderOpts.gridCols || (renderOpts.planItem && renderOpts.planItem.grid ? renderOpts.planItem.grid.cols : 0);
      if (planCols >= 1 && planCols <= 4) gridClass = 'mcq-grid-' + planCols;

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
        // Part-9b: অপশন না পেলে (লম্বা লাইন subQuestions-এ গেলে) সেগুলোও ছাপা হবে — তথ্য হারাবে না
        if ((!q.options || q.options.length === 0) && q.subQuestions && q.subQuestions.length > 0) {
          html += `<div class="mcq-options-row">`;
          for (const sub of q.subQuestions) {
            if (!sub || !sub.text) continue;
            html += `<div>(${this.escape(sub.label || '')}) ${this.richText(sub.text)}${sub.mark ? ` <span class="mcq-mark">${this.escape(sub.mark)}</span>` : ''}</div>`;
          }
          html += `</div>`;
        }

          html += `</div>`;
        }

        html += `</div>`;
      } else {
        // CQ Question Item — Part-11: প্রিভিউর ইনডেন্ট/মার্ক-অবস্থান একই CqBookletPlanner
        // জ্যামিতি থেকে আসে (432 dxa হ্যাঙ্গিং স্টেম, 864 dxa উপ-প্রশ্ন, নম্বর ডান প্রান্তে),
        // ফলে স্ক্রিনে যা দেখা যায় তা-ই Word 2003 (.doc) ও .docx-তে ছাপা হয়।
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
        const G = renderOpts && renderOpts.cqGeom;
        const tw = (v) => +(v / 20).toFixed(2);   // twips → pt (প্রিভিউর inline styling)
        // Part-12 (ট্রায়াজ ১): প্রিভিউর line-height প্ল্যানের lineFactor (১.৫) থেকে আসে —
        // RTF-এর \sl (.fs × ১.৫) ও DOCX-এর w:line (২৪০ × ১.৫) হুবহু এই রেশিওতে লক করা।
        const lh = (G && Number.isFinite(+G.lineRenderCssRatio)) ? String(+G.lineRenderCssRatio) : '1.35';
        const stemCss = G ? `padding-left: ${tw(G.indent)}pt; text-indent: -${tw(G.indent)}pt;` : 'display: flex; align-items: flex-start;';
        const numCss = G
          ? `margin-right: ${tw(G.indent)}pt; font-weight: 700;`
          : 'margin-right: 8px; flex-shrink: 0; min-width: 24px;';
        const stimulusPad = G ? `padding-left: 0; margin: 2px 0 !important;` : `padding-left: 32px !important; margin: 2px 0 !important;`;

        html += `<div class="cq-q-item${G ? ' cq-booklet-item' : ''}" style="margin-bottom: 6px; font-size: 12pt; line-height: ${lh};">`;
        html += `<div class="cq-q-row${G ? ' cq-print-row' : ''}" style="${stemCss}">`;
        html += `<span class="cq-num font-bold" style="${numCss}">${this.escape(q.num)}।</span>`;
        html += `<span class="cq-text${G ? '' : ' text-justify flex-1'}">${this.richText(displayText)}</span>`;
        html += `</div>`;

        if (stimRemaining) {
          html += `<div class="cq-stimulus text-justify" style="${stimulusPad} font-size: 12pt; line-height: ${lh};">`;
          html += this.richTextBlock(stimRemaining);
          html += `</div>`;
        }

        if (q.subQuestions && q.subQuestions.length > 0) {
          const subsPad = G ? `padding-left: 0; margin: 3px 0 0 0 !important;` : `padding-left: 32px !important; margin: 3px 0 0 0 !important;`;
          html += `<div class="cq-subs" style="${subsPad}">`;
          for (const sub of q.subQuestions) {
            if (sub.isAlternative) {
              html += `<div class="cq-or-divider text-center font-bold my-1" style="text-align: center; font-weight: bold; margin: 4px 0; color: #334155; font-size: 12pt;">${this.escape(sub.text || '--- অথবা ---')}</div>`;
              continue;
            }
            if (G) {
              // হ্যাঙ্গিং 432 (43.2−21.6) + ডান-প্রান্তে নম্বর (প্রিন্টের রাইট ট্যাবের সমতুল্য)
              html += `<div class="cq-sub-row cq-print-row" style="padding-left: ${tw(G.subIndent)}pt; text-indent: -${tw(G.subHanging)}pt; font-size: 12pt; margin: 2px 0;">`;
              if (sub.mark) html += `<span class="cq-sub-mark" style="float: right; margin-left: 8pt; font-weight: 600;">${this.escape(sub.mark)}</span>`;
              html += `<span class="cq-sub-lbl font-bold" style="margin-right: ${tw(G.subIndent - G.subHanging)}pt;">${this.escape(sub.label)}.</span>`;
              html += `<span class="cq-sub-text">${this.richText(sub.text)}</span>`;
              html += `</div>`;
              continue;
            }
            html += `<div class="cq-sub-row" style="display: flex; align-items: flex-start; justify-content: space-between; font-size: 12pt; margin: 2px 0;">`;
            html += `<div class="flex-1 text-justify"><span class="cq-sub-lbl font-bold" style="margin-right: 6px;">${this.escape(sub.label)}.</span><span class="cq-sub-text">${this.richText(sub.text)}</span></div>`;
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
    renderHeaderBlock(header, renderOpts = {}) {
      // Part-10 (খ.৩): MCQ প্রিভিউতে অটো-প্লেসহোল্ডার — হেডার কখনো ভাঙে না।
      // (EXAM_CQ/অন্যান্য আর্কিটাইপের আচরণ অপরিবর্তিত — ফ্রোজেন চুক্তি।)
      const useFb = !!(renderOpts && (renderOpts.fallback || renderOpts.docType === 'EXAM_MCQ'));
      if (useFb && header) header = this.applyMcqHeaderFallbacks(header);
      const pmLabel = useFb ? 'পূর্ণমানঃ ' : 'পূর্ণমান: ';
      // Part-12: বুকেলেট প্রিভিউতে হেডারের লাইন-বক্সও প্ল্যান-রেশিওতে (RTF s32+\sl480)
      const hlh = (renderOpts && renderOpts.cqGeom && Number.isFinite(+renderOpts.cqGeom.lineRenderCssRatio)) ? String(+renderOpts.cqGeom.lineRenderCssRatio) : '1.2';
      let html = `<div class="qp-header text-center pb-1 mb-1 border-b border-black" style="margin-top: 0; padding-top: 0;">`;
      if (header.institute) {
        html += `<h1 class="qp-institute font-black" style="margin: 0; line-height: ${hlh}; font-size: 16pt;">${this.escape(header.institute)}</h1>`;
      }
      if (header.location) {
        html += `<div class="qp-location font-semibold" style="margin: 0; line-height: ${hlh}; font-size: 12pt;">${this.escape(header.location)}</div>`;
      }
      if (header.exam) {
        html += `<div class="qp-exam font-bold" style="margin: 0; line-height: ${hlh}; font-size: 13pt;">${this.escape(header.exam)}</div>`;
      }
      if (header.classAndSubject) {
        html += `<div class="qp-class-subject font-semibold" style="margin: 0; line-height: ${hlh}; font-size: 12pt;">${this.escape(header.classAndSubject)}</div>`;
      }

      html += `<div class="qp-metrics" style="display: flex !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; font-weight: bold; margin: 2px 0 0 0; line-height: 1.2; font-size: 12pt; border-top: 1px solid #94a3b8; padding-top: 2px;">`;
      html += `<div style="text-align: left; flex: 1; white-space: nowrap;">${header.time ? 'সময়: ' + this.escape(header.time) : ''}</div>`;
      if (header.examType) {
        html += `<div style="text-align: center; flex: 1.5; text-decoration: underline; font-weight: bold; font-size: 13pt; letter-spacing: 0.5px;">${this.escape(header.examType)}</div>`;
      } else {
        html += `<div style="text-align: center; flex: 1;"></div>`;
      }
      html += `<div style="text-align: right; flex: 1; white-space: nowrap;">${header.marks ? pmLabel + this.escape(header.marks) : ''}</div>`;
      html += `</div>`;

      if (header.instructions) {
        html += `<div class="qp-instructions italic" style="margin: 0; line-height: 1.35; font-size: 12pt; color: #1e293b;">${this.escape(header.instructions)}</div>`;
      }
      html += `</div>`;
      return html;
    },

    /**
     * Part-9: প্রকাশ্য renderToHtml — মূল রেন্ডারের পরে, প্রয়োজনে শেষে অডিট-নোট পৃষ্ঠা যোগ করে।
     * (preview == download সমতা: Word-এর মতোই আলাদা পৃষ্ঠা, পেজ-ব্রেক সহ।)
     */
    renderToHtml(parsedData, options = {}) {
      let html = this._renderToHtmlCore(parsedData, options);
      // Part-9j: অডিট-নোট MD থেকে পার্স হলেও (parsedData.auditNote) শীট ছাপে
      const _note = (options && options.auditNote) || (parsedData && parsedData.auditNote);
      if (_note) html += this.renderAuditSheet(Object.assign({}, options, { auditNote: _note }));
      return html;
    },

    /**
     * Part-9j: ফাইলের শেষের যাচাই/অডিট-নোট ব্লক আলাদা করা।
     * শুধু তখনই কাটে যখন ব্লকে বুলেট (`- `) বা স্পষ্ট সিগন্যাল (মূল পৃষ্ঠা/LaTeX/যাচাই/শিখনফল...) আছে,
     * আর ব্লকের ঠিক আগে কোনো প্রশ্ন-লাইন/শিরোনাম আছে — তাই সাধারণ বডি-টেক্সট ভুলে কাটা পড়ে না।
     */
    _extractTrailingAuditNote(lines) {
      const arr = Array.isArray(lines) ? lines.slice() : [];
      const NOTE_RE = /(মূল\s*পৃষ্ঠা|LaTeX\s*(?:ফরম্যাটে|কোডে)|যাচাই|অডিট|শিখনফল|বোর্ড\s*রেফারেন্স|সমাধান\s*নোট)/i;
      let end = arr.length - 1;
      while (end >= 0 && !String(arr[end]).trim()) end--;
      if (end < 0) return { note: '', lines: arr };
      let start = end;
      let seen = false;
      for (let i = end; i >= 0; i--) {
        const raw = String(arr[i]);
        const t = raw.trim();
        if (/^(?:#{1,6}\s*)?(?:প্রশ্ন\s*)?[\u09E6-\u09EF\d]+[।.)]/.test(t) || /^#{1,6}\s+\S/.test(t)) break; // প্রশ্ন/শিরোনাম ⇒ থামো
        const isBullet = /^[-–—•*]\s+/.test(t) || /^\[/.test(t) || /\]$/.test(t);
        const isNote = NOTE_RE.test(t);
        if (isBullet || isNote) { seen = true; start = i; continue; }
        if (!t) { if (seen) { start = i; continue; } break; }
        if (seen) { start = i; continue; }  // ব্লকের ভেতরের continuation
        break;
      }
      if (!seen) return { note: '', lines: arr };
      const block = arr.slice(start, end + 1);
      const strong = block.some((l) => /^[-–—•*]\s+/.test(String(l).trim()) || NOTE_RE.test(String(l)));
      if (!strong) return { note: '', lines: arr };
      const note = block.map((l) => String(l)).join('\n').trim();
      return { note, lines: arr.slice(0, start) };
    },

    _auditNoteLines(options = {}) {
      if (!options || !options.auditNote) return [];
      const note = String(options.auditNote).replace(/^\s*\[/, '').replace(/\]\s*$/, '').trim();
      return note ? note.split(/\r?\n/) : [];
    },

    renderAuditSheet(options = {}) {
      const lines = this._auditNoteLines(options);
      if (!lines.length) return '';
      const marginClass = options.marginClass || 'margin-standard';
      const sizeClass = options.orientation === 'landscape' ? 'size-a4-landscape' : 'size-a4-portrait';
      const render = (t) => (typeof this.richText === 'function' ? this.richText(t) : this.escape(t));
      let html = `<div class="sheet-label"><i class="fas fa-clipboard-check text-emerald-600"></i> যাচাই প্রতিবেদন (এআই অডিট নোট)</div>`;
      html += `<div class="paper-sheet ${sizeClass} ${marginClass} mb-8 page-break-indicator">`;
      html += `<div class="question-paper font-kalpurush dense-zero-gap" style="font-size: 12pt; line-height: 1.5;">`;
      html += `<div class="text-center font-bold" style="font-size: 16pt; margin-bottom: 0.25in;">যাচাই প্রতিবেদন (এআই অডিট নোট)</div>`;
      for (const line of lines) {
        const t = String(line).trim();
        html += t ? `<div style="margin-bottom: 0.08in;">${render(t)}</div>` : `<div style="height: 0.12in;"></div>`;
      }
      html += `</div></div>`;
      return html;
    },

    /**
     * Renders entire question paper.
     * In Booklet Mode: generates Sheet 1 (Page 4 Skipped Col 1, Page 1 Header Col 2) + Sheet 2 (Page 2 Col 1, Page 3 Col 2).
     * In Standard Mode: generates a 2-Column continuous flow sheet.
     */
    _renderToHtmlCore(parsedData, options = {}) {
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

      // CASE A: BOOKLET MODE — Part-11: প্ল্যান-চালিত। কলাম-ভাগ, ব্যাক-কভার সংরক্ষণ ও
      // ইনডেন্ট সব এখানে নতুন করে গণনা করা হয় না — একই CqBookletPlanner-এর
      // plan.columns ব্যবহার হয় যা Word 2003 (.doc) ও .docx রেন্ডারার কনজিউম করে।
      const cqPlan = isLandscape ? this._cqLayoutPlan(parsedData, options) : null;
      if (isLandscape && cqPlan && Array.isArray(cqPlan.columns) && cqPlan.columns.length) {
        const BND = '০১২৩৪৫৬৭৮৯';
        const bn = (v) => String(v).split('').map((d) => (d >= '0' && d <= '9' ? BND[+d] : d)).join('');
        const slots = [];
        if (cqPlan.skipFirstColumn) slots.push(null);      // সংরক্ষিত ব্যাক কভার (খালি = কনটেন্ট নয়)
        for (const col of cqPlan.columns) slots.push(col);
        if (slots.length % 2) slots.push(null);
        const gapPt = +(cqPlan.geometry.colGap / 20).toFixed(1);
        const cqPlanner = this._getCqPlanner();
        const headerModel = (cqPlanner && cqPlanner.headerPreviewModel) ? cqPlanner.headerPreviewModel(cqPlan) : parsedData.header;
        const renderBookletItem = (it) => (it.kind === 'sectionTitle'
          ? `<div class="font-bold text-center py-0.5 my-1" style="font-size: ${fontSize}; line-height: 1.35;">${this.escape(it.text)}</div>`
          : this.renderQuestionItem(it.q, { cqGeom: cqPlan.geometry }));

        let html = `<div class="${fontClass} dense-zero-gap">`;
        for (let si = 0; si < slots.length; si += 2) {
          const sheetNo = si / 2 + 1;
          const isLastSheet = si + 2 >= slots.length;
          html += `<div class="sheet-label"><i class="fas fa-book text-emerald-600"></i> শীট ${bn(sheetNo)} (A4 ল্যান্ডস্কেপ, ২ কলাম) — ${bn(2 * sheetNo - 1)}য় কলাম: ${sheetNo === 1 ? 'ব্যাক কভার' : 'পৃষ্ঠা ' + bn(2 * sheetNo - 1)} · ${bn(2 * sheetNo)}য় কলাম: ${sheetNo === 1 ? 'ফ্রন্ট কভার (পৃষ্ঠা ১)' : 'পৃষ্ঠা ' + bn(2 * sheetNo)}</div>`;
          html += `<div class="paper-sheet size-a4-landscape ${marginClass}${isLastSheet ? '' : ' mb-8 page-break-indicator'}">`;
          html += `<div class="grid grid-cols-2 h-full ${fontClass} dense-zero-gap" style="column-gap: ${gapPt}pt;" ${editableAttr} ${styleAttr}>`;
          for (const col of [slots[si], slots[si + 1]]) {
            if (!col) {
              html += `<div class="qp-col-skip-box" style="min-height: 200px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #94a3b8; font-size: 10pt; padding: 10px;">`;
              html += `<div style="font-weight: 700; color: #475569; font-size: 11pt; margin-bottom: 4px;">[ ব্যাক কভার — ${bn(2 * sheetNo - 1)}য় কলাম সংরক্ষিত ]</div>`;
              html += `<div>প্রশ্ন উপচে গেলে স্বয়ংক্রিয়ভাবে এই কলামেই বসবে; না হলে ফাঁকা থাকবে (একতলে ভাঁজ করার নিয়ম)।</div>`;
              html += `</div>`;
              continue;
            }
            html += `<div class="flex flex-col justify-start cq-booklet-col cq-print-col" data-print-page="${col.page}" data-col="${col.colInPage}">`;
            if (col.headerFirst) html += this.renderHeaderBlock(headerModel, { cqGeom: cqPlan.geometry });
            for (const it of (col.items || [])) html += renderBookletItem(it);
            html += `</div>`;
          }
          html += `</div></div>`;
        }
        html += `</div>`;
        return html;
      }

      // CqBookletPlanner অনুপলব্ধ হলে (স্ক্রিপ্ট লোড হয়নি) নিচের CASE B-র
      // সাধারণ ২-কলাম ফ্লোতে পড়ে যায় — লেখা তবু হারায় না, শুধু বুকলেট
      // ইম্পোজিশন (পৃষ্ঠা-প্রতি কলাম) বাদ পড়ে।

      // CASE B: STANDARD 2-COLUMN QUESTION PAPER (MCQ or Single Sheet CQ)
      const isMcq = allItems.some(i => i.type === 'QUESTION' && i.data.options && i.data.options.length > 0);
      const allQuestions = allItems.filter(i => i.type === 'QUESTION');
      const N = allQuestions.length;

      // Part-10: MCQ মাস্টার লেআউট প্রিভিউ — একই Geometry Plan ব্যবহার করে যা
      // Word 2003 (.doc) ও আধুনিক (.docx) রেন্ডারার ব্যবহার করে। ফলে
      // "preview == download" অনড় থাকে: ২-কলাম, কলাম লাইন, ০.৩" হ্যাঙ্গিং
      // ইনডেন্ট, সমান দূরত্বের অপশন গ্রিড, ১-পৃষ্ঠা ফিট সংকোচন ও কলাম ব্যালান্স।
      if (isMcq && !isLandscape && !allItems.some((i) => i.type === 'SECTION_TITLE')) {
        const plan = this._mcqLayoutPlan(parsedData, options);
        if (plan && plan.items && plan.pages) {
          const effFontSize = options.fontSize ? options.fontSize : (plan.font.pt + 'pt');
          const ratio = Math.round((plan.metrics.lineH / ((plan.font.sz / 2) * 20)) * 100) / 100;
          const mcqStyle = `line-height: ${ratio}; font-size: ${effFontSize};`;
          const renderCol = (idxList) => {
            let s = '';
            for (const i of (idxList || [])) {
              const it = plan.items[i];
              if (!it || !allQuestions[it.index]) continue;
              s += this.renderQuestionItem(allQuestions[it.index].data, {
                planItem: it,
                gridCols: it.grid && it.grid.cols ? it.grid.cols : 0,
                szHalf: plan.font.sz
              });
            }
            return s;
          };

          const pages = plan.pages.length ? plan.pages : [{ page: 1, col1: [], col2: [] }];
          let html = `<div class="${fontClass} dense-zero-gap">`;
          for (let pi = 0; pi < pages.length; pi++) {
            const pg = pages[pi];
            const isLast = pi === pages.length - 1;
            if (pi === 0) {
              html += `<div class="sheet-label"><i class="fas fa-file-word text-blue-600"></i> পৃষ্ঠা ১ — হেডার (১-কলাম, সেন্টারড) + ২-কলাম প্রশ্ন বডি${plan.font.shrunk ? ' (ফন্ট ' + plan.font.pt + 'pt-এ সংকুচিত করে ১ পৃষ্ঠায় ফিট করা হয়েছে)' : ''}</div>`;
              html += `<div class="paper-sheet size-a4-portrait ${marginClass}${isLast ? '' : ' mb-4 page-break-indicator'}">${this.renderCropMarks()}`;
              html += `<div class="question-paper ${fontClass} dense-zero-gap orientation-portrait" ${editableAttr} style="${mcqStyle}">`;
              html += this.renderHeaderBlock(parsedData.header, { docType: 'EXAM_MCQ', fallback: true });
            } else {
              html += `<div class="sheet-label"><i class="fas fa-file-word text-blue-600"></i> পৃষ্ঠা ${pi + 1} — অবশিষ্ট প্রশ্ন ২ কলামে উচ্চতা-ব্যালান্সড</div>`;
              html += `<div class="paper-sheet size-a4-portrait ${marginClass}${isLast ? '' : ' mb-4 page-break-indicator'}">${this.renderCropMarks()}`;
              html += `<div class="question-paper ${fontClass} dense-zero-gap orientation-portrait" ${editableAttr} style="${mcqStyle}">`;
              const runningTitle = (parsedData.header.classAndSubject || 'বহুনির্বাচনি অভীক্ষা') + ' - পৃষ্ঠা ' + (pi + 1);
              html += `<div class="text-center font-bold text-xs text-slate-700 border-b border-slate-400 pb-1 mb-2">${this.escape(runningTitle)}</div>`;
            }
            html += `<div class="qp-columns qp-columns-flex" style="display: flex; column-gap: 0.2in;">`;
            html += `<div style="flex: 1; border-right: 1px solid #000000; padding-right: 0.1in;">${renderCol(pg.col1)}</div>`;
            html += `<div style="flex: 1; padding-left: 0.1in;">${renderCol(pg.col2)}</div>`;
            html += `</div></div></div>`;
            if (!isLast) html += this.renderPageBreak();
          }
          html += `</div>`;
          return html;
        }
      }

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
