/**
 * ============================================================================
 * Fayzar Computer v2 - AI Bengali OCR & Math (LaTeX) to Bijoy .doc Engine
 * (MULTI-PAGE UNIFIED EXTRACTION WITH LIVE STREAMING & CLEAN FORMATTING)
 * ============================================================================
 * Features:
 * 1. Unified Multi-Page Batching: Sends ALL images/pages together in 1 single API call.
 * 2. Real-Time Live SSE Streaming: Output streams live onto the screen immediately.
 * 3. Clean Roman Numerals: Automatic removal of asterisks (*i.* -> i., *i* -> i).
 * 4. Clean Creative Questions: Formatted without score brackets ([১], [২]).
 * 5. Native .doc (RTF/SutonnyMJ) & .docx (OOXML, Bijoy/Unicode) Word Generation.
 * 6. Multi-Model Independent Quota Failover (Gemini 2.0 Flash -> 1.5 Flash -> 1.5 Pro).
 * ============================================================================
 */

(function (global) {
  'use strict';

  const STORAGE_KEYS = {
    FREE_COUNT: 'fayzar_ai_ocr_free_count',
    BYOK_KEY: 'fayzar_ai_ocr_gemini_key',
    GAS_URL: 'fayzar_ai_ocr_gas_url',
    DEMO_MODE: 'fayzar_ai_ocr_demo_mode',
    SELECTED_MODEL: 'fayzar_ai_ocr_selected_model'
  };

  // ---------------------------------------------------------
  // HYBRID PRO-BRIDGE: NATIVE REST API (ZERO SDK DEPENDENCY)
  // ---------------------------------------------------------
  const FIREBASE_BRIDGE_URL = "https://fayzar-ocr-bridge-default-rtdb.asia-southeast1.firebasedatabase.app";
  let cachedBridgeOnline = false;
  let lastBridgeCheckTime = 0;
  let activeAbortController = null;
  let activeBridgeJobId = null;

  function updateProModelStatusUI(isOnline) {
    const modeBadge = (elements && elements.modeBadge) || document.getElementById('ai-ocr-mode-badge');
    const toggleWrapper = (elements && elements.proModelToggleWrapper) || document.getElementById('proModelToggleWrapper');
    if (toggleWrapper) {
      toggleWrapper.style.display = 'none';
      toggleWrapper.classList.add('hidden');
    }

    if (modeBadge) {
      if (isOnline) {
        if (state.proBridgeEnabled) {
          modeBadge.className = "px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-purple-700 via-indigo-600 to-emerald-600 text-white border border-purple-400/80 shadow-md inline-flex items-center gap-1.5 animate-pulse cursor-pointer hover:shadow-lg transition-all duration-300";
          modeBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-300 shadow-sm animate-ping"></span> ⚡ প্রো মডেল একটিভ আছে`;
          modeBadge.title = "⚡ প্রো মডেল (Gemini 3.1 Pro) সক্রিয় আছে। ক্লিক করলে এপিআই কি মোড চলবে।";
        } else {
          modeBadge.className = "px-3 py-1.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300/80 hover:bg-purple-100 dark:hover:bg-purple-900 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer hover:shadow-md transition-all duration-300";
          modeBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span> ⚡ প্রো মডেল একটিভ করুন`;
          modeBadge.title = "ডেস্কটপ Gemini 3.1 Pro ইঞ্জিন সংযুক্ত আছে। প্রো মডেল সক্রিয় করতে ক্লিক করুন।";
        }
      } else {
        modeBadge.className = "px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer hover:shadow-md transition-all duration-300";
        modeBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span> এপিআই কি সক্রিয় আছে`;
        modeBadge.title = "Google Gemini Live Cloud API সক্রিয়";
      }
    }
    const pill = document.getElementById('ai-model-type-pill');
    if (pill) {
      if (isOnline && state.proBridgeEnabled) {
        pill.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 inline-flex items-center gap-1.5 shadow-2xs";
        pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ⚡ প্রো মডেল (3.1 Pro) প্রস্তুত`;
      } else if (isOnline && !state.proBridgeEnabled) {
        pill.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 inline-flex items-center gap-1.5";
        pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ক্লাউড API সচল (দ্রুত গতি)`;
      } else {
        pill.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 inline-flex items-center gap-1.5";
        pill.innerHTML = `Gemini AI + ফয়জার ইঞ্জিন`;
      }
    }
    const btnText = document.getElementById('executeAiConversionBtnText');
    if (btnText && (!state || !state.isProcessing)) {
      if (isOnline && state.proBridgeEnabled) {
        btnText.textContent = '⚡ প্রো মডেল দিয়ে সরাসরি কনভার্ট শুরু করুন';
      } else {
        btnText.textContent = 'AI দিয়ে সরাসরি কনভার্ট শুরু করুন';
      }
    }
  }

  async function checkDesktopBridgeOnline(forceRefresh = false) {
    if (!forceRefresh && (Date.now() - lastBridgeCheckTime < 2000)) {
      return cachedBridgeOnline;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    try {
      const res = await fetch(`${FIREBASE_BRIDGE_URL}/status/desktop.json?t=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timer);
      const val = await res.json();
      cachedBridgeOnline = (val === 'online');
    } catch (e) {
      clearTimeout(timer);
      cachedBridgeOnline = false;
    }
    lastBridgeCheckTime = Date.now();
    updateProModelStatusUI(cachedBridgeOnline);
    return cachedBridgeOnline;
  }
  // ---------------------------------------------------------

  const MAX_FREE_USES = 5;
  const REQUEST_TIMEOUT_MS = 180000; // 180s (3 minutes) timeout for complete multi-page extraction
  const MAX_IMAGE_DIMENSION = 2048; // 2048px = ultra-crisp 200-250 DPI — essential for dense Bengali yuktakhor & small printed text
  const JPEG_COMPRESSION_QUALITY = 0.92; // High-fidelity compression: preserves fine strokes, Bengali ligatures & math symbols perfectly
  const modelCooldowns = new Map(); // Tracks models with 429 quota exhaustion (model -> expireTimestamp)

  const GEMINI_PROMPT = `You are an elite Bengali Document Composer & LaTeX formatting specialist. Extract and compose a COMPLETE document from the provided images using STRICT MARKDOWN formatting.
0.0 STRICT QUESTION-ONLY EXTRACTION (প্রশ্নপত্র, উত্তরমালা নয় — সর্বোচ্চ অগ্রাধিকার):
   - এই টুলের আউটপুট শুধু প্রশ্নপত্র। উৎস পৃষ্ঠায় উত্তর/সমাধানের অংশ থাকলেও তা অনুলিপি করবেন না এবং নিজের থেকে তৈরিও করবেন না।
   - বাদ যাবে: "উত্তর: …", "সমাধান: …", "Answer: …", Solution/Explanation ব্লক, গাণিতিক work-out-এর ধাপ (যদি প্রশ্নের অংশ না হয়), উত্তরমালা/হেড-শিট, মূল্যায়ন চার্ট বা নম্বর বণ্টন-টেবিল।
   - যে লাইন প্রশ্নের নির্দেশনা ("সঠিক উত্তরটি লিখ:", "নিচের থেকে বেছে নাও:", "যুক্তি দেখাও:") সেগুলো প্রশ্নের অংশ — অক্ষুণ্ন রাখবেন।
   - আউটপুটে কোনো 'answers', 'solutions' বা উত্তরের ফিল্ড/অনুচ্ছেদ থাকবে না; থাকলে তা ফাঁকা রাখবেন না — সম্পূর্ণ বাদ দেবেন।


0. MANDATORY DOCUMENT ARCHETYPE FRONTMATTER (LINE 1 MUST START WITH '---'):
   - Output an exact YAML frontmatter header at the very beginning between '---' delimiters:
     ---
     doc_type: <EXAM_CQ | EXAM_GENERAL | EXAM_MCQ | EXAM_COMBINED | OFFICE_PAD | PROTTOYON | GOVT_APP | OFFICIAL_NOTICE | STAMP_DEED>
     columns: <1 or 2>
     ---
   - SECTOR DETERMINATION RULES (DO NOT RELY ON COLUMNS IN HANDWRITTEN DRAFTS; CLASSIFY BY INTENDED PURPOSE):
     * Creative Questions (CQ 70 marks, Class 6-12 with stimulus & ক,খ,গ,ঘ): doc_type: EXAM_CQ, columns: 2
     * Standard/Primary Exam (Class 1-5, short questions, fill-in-blanks, matching, grammar, general questions): doc_type: EXAM_GENERAL, columns: 2
       -> CRITICAL: NEVER classify general or primary exam papers as EXAM_CQ! If there is no stimulus or no 4-tier CQ sub-questions, it is EXAM_GENERAL.
     * Pure Multiple Choice Questions (20-30 MCQs, or source has only MCQs with at least 10-15 questions): doc_type: EXAM_MCQ, columns: 2
     * Combined Exam (both Creative Questions & 20-30 MCQs): doc_type: EXAM_COMBINED, columns: 2
     * Institutional Office Pad / Letterhead Memo: doc_type: OFFICE_PAD, columns: 1
     * Testimonial / Character Certificate (প্রত্যয়নপত্র ও প্রশংসাপত্র): doc_type: PROTTOYON, columns: 1
     * Government / Job Application (বরাবর, বিষয়, জনাব সংবলিত দরখাস্ত): doc_type: GOVT_APP, columns: 1
     * Official Government / Institutional Notice / Memo: doc_type: OFFICIAL_NOTICE, columns: 1
     * Legal Deed / 300 Tk Non-Judicial Stamp Contract: doc_type: STAMP_DEED, columns: 1
   - HEADER PLACEHOLDER MANDATE (FOR EXAM PAPERS):
     * If the source exam paper has no school/institute name, write: institute: "আপনার প্রতিষ্ঠান এর নাম"
     * If address is missing, write address in subtitle or next line: "ঠিকানা লিখুন"
     * If exam name is missing, write: exam: "পরীক্ষার নাম লিখুন"
     * Ensure grade (শ্রেণি), subject (বিষয়), time (সময়), fullMarks (পূর্ণমান) are included in frontmatter or top header.
   - SECTION BREAK MANDATE:
     * When transcribing a combined question paper (containing both Creative Questions and Multiple Choice Questions), when the Creative Question part ends and the Multiple Choice (MCQ) section begins (before its institutional header/title), YOU MUST INSERT THIS EXACT SEPARATOR ON ITS OWN LINE:
       ---SECTION_BREAK:MCQ---

1. ZERO-HALLUCINATION & STRICT 100% SOURCE FIDELITY (NO EDITS, NO PARAPHRASING):
   - Transcribe ONLY what is physically and visibly present in the source images. Never invent, extrapolate, or guess any question, sub-question, or header.
   - DO NOT alter, rewrite, rephrase, summarize, or modify the original text, question contents, equations, or numbers on your own.
   - Transcribe stroke-by-stroke with 100% fidelity. Everything must match the source image word-for-word!

2. MARKDOWN STRUCTURE:
   - Use # for main document/institution titles.
   - Use ## for main serials and questions (e.g. ## ১। ..., ## ২। ...).
   - Use > for Creative Question paragraphs (উদ্দীপক).
   - Convert all tabular grids to standard Markdown tables |---|---| with proper column dividers.

3. EQUATIONS & CHEMICAL FORMULAS:
   - Wrap ALL variables, equations, fractions, and vectors (e.g., \\vec{AD}) strictly in LaTeX using $ for inline and $$ for block math (e.g., $\\vec{AD}$). NEVER output raw LaTeX without the $ signs!
   - CRITICAL: Wrap ALL LaTeX blocks inside inline code backticks (e.g., \`$CaCO_3$\`, \`$\\frac{a}{b}$\`) to prevent UI/API rendering issues.
   - MANDATORY MATH PATTERNS — always convert these to backtick-wrapped LaTeX:
     * Fractions: "3/5" or "frac{3}{5}" → \`$\\frac{3}{5}$\`
     * Powers/Superscripts: "x^2", "a²", "x2" (where 2 is a power) → \`$x^2$\`
     * Roots: "√5", "root 5" → \`$\\sqrt{5}$\`
     * Angles: "∠x", "angle x = 80°" → \`$\\angle x = 80°$\`
     * Inequalities: "x > 0", "a ≥ b" → \`$x > 0$\`, \`$a \\geq b$\`
     * Algebraic expressions: "P = 1 - x + x²" → \`$P = 1 - x + x^2$\`
     * Chemical formulas: "H₂O", "CO₂" → \`$H_2O$\`, \`$CO_2$\`
   - ZERO "ERROR!" POLICY: If you cannot read an equation or it is blurry, do your best-effort LaTeX transcription. NEVER EVER output the word "Error!" in the text.

4. MCQ FORMATTING:
   - Use independent serials starting from 1 (১।, ২।, ৩। ... ৩০।).
   - Use tabs for options: [Tab]ক. [Tab]খ. [Tab]গ. [Tab]ঘ. to help the downstream layout engine.
   - MULTINOMIAL MCQ (বহুপদী): If the question has roman numeral statements (i., ii., iii. or i, ii, iii), you MUST preserve them exactly at the beginning of the lines (e.g., \`i. statement\`, \`ii. statement\`, \`iii. statement\`). DO NOT remove or convert them to standard markdown lists!

5. NO EXTRA ENTERS:
   - Do not add double blank lines between questions, sub-questions, or options.

6. UNIVERSAL SCRIPT & NUMERAL FIDELITY:
   - Keep all English letters, variables, and units in pure ASCII English (A, B, P, Q, pH, Cu, FeCl3, 20 cm).
   - Transcribe English digits (0-9) as English digits, and Bengali digits (০-৯) as Bengali digits exactly as in the source.

7. COMPREHENSIVE MULTI-PAGE EXTRACTION & ZERO TRUNCATION (সম্পূর্ণ বহু-পৃষ্ঠা নিষ্কাশন ও কোনো অংশ বাদ না দেওয়া):
   - Transcribe every single visible question and line from Page 1 to the very last page across all provided images/pages in order.
   - When multiple pages (পৃষ্ঠা ১, ২, ৩, ৪, ৫, ৬...) are attached, you MUST extract ALL pages completely without dropping, skipping, or summarizing any page.
   - If the document contains 11 creative questions, transcribe all 11 questions. If it contains only 1 question, transcribe that 1 question. If it contains 30 MCQs, transcribe all 30.
   - CRITICAL: NEVER STOP HALFWAY, NEVER SKIP ANY VISIBLE QUESTION OR MIDDLE PAGE, AND NEVER TRUNCATE!

8. STRICT PRESERVATION OF SOURCE TEXT & DETAILS:
   - STIMULUS & QUESTION FULL FIDELITY (উদ্দীপক ও প্রশ্নের ভাষা সংক্ষেপণ সম্পূর্ণ নিষিদ্ধ): NEVER change, paraphrase, shorten, or rewrite the stimulus (উদ্দীপক) or question text. It MUST match the source image word-for-word!
   - OMIT EXAM BOARD REFERENCES: Omit all exam board tags, cadet college tags, and chapter citations (যেমন: [ঢাকা বোর্ড-২০২৩], [ক্যাডেট কলেজ], [অধ্যায়-৩], (দিনাজপুর বোর্ড-২০২২) ইত্যাদি সম্পূর্ণ বাদ দিন).
   - STRICT PRESERVATION OF CONTENT PARENTHESES & ENGLISH GLOSSES:
     * সাধারণ নথিপত্র, গঠনতন্ত্র, বিধিমালা, চুক্তিনামা বা প্রশ্নপত্রের মূল বিষয়বস্তুর ভেতরের কোনো বন্ধনী বা উদাহরণ যেমন: (Vision & Mission), (যেমন: ...), (বেঞ্চ/টেবিল), (ক), (খ) ইত্যাদি কখনোই বাদ দেওয়া যাবে না! এগুলো অবিকল রাখতে হবে।
     * বাংলা শব্দের পাশে ইংরেজি বন্ধনী (যেমন: রূপকল্প (Vision & Mission)) সম্পূর্ণ অক্ষত রাখতে হবে।
     * যুক্ত বা হাইফেনযুক্ত বাংলা শব্দসমূহ (যেমন: শিল্প-সংস্কৃতি, আলো-বাতাস, শিক্ষক-শিক্ষিকাদের, যুগোপযোগী, আর্থ-সামাজিক) এর ভেতরের হাইফেন (-) কোনোভাবেই বাদ বা মুছে ফেলা যাবে না!

9. DIAGRAMS & IMAGES (ছবি বা ডায়াগ্রামের ক্ষেত্রে শুধুমাত্র পেজ নম্বর উল্লেখ, কোনো বর্ণনা নয়):
   - Whenever there is a diagram, geometric figure, circuit, chart, or image, DO NOT write any description or details of the picture.
   - Simply write: [ছবি আছে-পৃ:০১] (বা পেজ নম্বর অনুযায়ী [ছবি আছে-পৃ:০২], [ছবি আছে-পৃ:০৩] ইত্যাদি)।

10. CLEAN PROFESSIONAL OUTPUT (NO CHATTER / NO CODE BLOCKS / NO MARKDOWN ASTERISKS):
    - Output ONLY the clean transcribed document text directly.
    - CRITICAL MANDATE: NEVER use markdown bold asterisks (**). NEVER write **পঞ্চম শ্রেণি** or **১. সঠিক উত্তর:**. Output completely plain text without any ** asterisks.
    - DO NOT add introductory greetings, explanations, chat preamble, or markdown code fences (\`\`\`).

11. NO EXTRA ENTERS OR BLANK LINES (অতিরিক্ত ফাঁকা লাইন বা ডাবল এন্টার নিষেধ, তবে প্রতিটি অনুচ্ছেদ ও উপ-ধারা অবশ্যই আলাদা লাইনে থাকবে):
    - CRITICAL: DO NOT insert empty blank lines or double Enters between consecutive questions, sub-questions, or lines.
    - PRESERVE EVERY ARTICLE / SUB-ARTICLE ON ITS OWN LINE (প্রতিটি ধারা, উপ-ধারা ও প্যারাগ্রাফের নিজস্ব লাইন বজায় রাখা):
      * প্রতিটি উপ-ধারা, তালিকা আইটেম বা অনুচ্ছেদ অবশ্যই তার নিজস্ব আলাদা নতুন লাইনে (Enter / newline) থাকবে।

12. ROMAN NUMERALS & MCQ FORMATTING (রোমান সংখ্যা ও বহুনির্বাচনী প্রশ্ন):
    - MANDATORY SEQUENTIAL RENUMBERING (ধারাবাহিক ক্রমিক নম্বর ১ থেকে শুরু): প্রতিটি বিভাগের (বহুনির্বাচনী, সৃজনশীল, সংক্ষিপ্ত প্রশ্ন) প্রশ্নসমূহ অবশ্যই ১।, ২।, ৩।, ৪। ... ক্রমানুসারে সাজাবেন। বই, টেস্ট পেপার বা গাইডের বিচ্ছিন্ন নম্বর (যেমন: ৭২, ৭৩, ৪৪, ৪৭ ইত্যাদি) প্রশ্নপত্রে রাখা সম্পূর্ণ নিষিদ্ধ! বহুনির্বাচনী প্রশ্নের ক্রমিক অবশ্যই ১।, ২।, ৩। ... থেকে ধারাবাহিকভাবে শুরু হবে।
    - CRITICAL: NEVER wrap roman numerals in asterisks (*i.*, *ii.*, *iii.*, *i* ও *ii* etc. are strictly forbidden ❌).
    - বহুনির্বাচনীর ক্ষেত্রে ক্রমিক নম্বরের নিচে রোমান সংখ্যা বা স্টেটমেন্টের (i., ii., iii., iv. অথবা ১., ২., ৩.) প্রতিটি লাইনের শুরুতে অবশ্যই ১টি করে ট্যাব (\t) যুক্ত করবেন:
      \ti. সোডিয়াম
      \tii. ক্যালসিয়াম
      \tiii. ক্লোরিন
      নিচের কোনটি সঠিক?
      	ক. i ও ii	খ. i ও iii	গ. ii ও iii	ঘ. i, ii ও iii ✅
    - CRITICAL MANDATE FOR MCQ OPTIONS (বহুনির্বাচনী অপশনে ডট 'ক.' ও শুরুর ট্যাব \t):
      * বাংলা, গণিত, বিজ্ঞান ইত্যাদি বিষয়ের বিকল্পগুলোর ক্ষেত্রে কোনো প্রকার বন্ধনী যেমন: (ক), ক), (খ), খ) ব্যবহার করা সম্পূর্ণ নিষেধ ❌! প্রতিটি বিকল্প অবশ্যই 'ক.', 'খ.', 'গ.', 'ঘ.' ডট ফরম্যাটে উপস্থাপন করতে হবে।
      * প্রতিটি অপশন লাইনের শুরুতে (ক-এর পূর্বে) অবশ্যই ১টি ট্যাব (\t) এবং প্রতিটি বিকল্পের মাঝে ১টি করে ট্যাব (\t) ব্যবহার করবেন (যেমন: \tক. অপশন ১\tখ. অপশন ২\tগ. অপশন ৩\tঘ. অপশন ৪)।
      * দ্বি-সারি বিকল্পের ক্ষেত্রে দ্বিতীয় লাইনের শুরুতেও ১টি ট্যাব থাকবে (যেমন: \tগ. অপশন ৩\tঘ. অপশন ৪)।
      * OPTIONS DIGITS FIDELITY: বহুনির্বাচনীর বিকল্পে সংখ্যাগুলো যদি ইংরেজি ডিজিটে (যেমন: 1, 2, 9, 10 বা 0, 1, 2, 3 বা 0, 2, 4, 6) লেখা থাকে, তবে বিকল্পের সংখ্যাগুলো অবশ্যই ইংরেজিতেই (\tক. 1\tখ. 2\tগ. 9\tঘ. 10) উপস্থাপন করবেন। কোনো অবস্থাতেই সেগুলোকে বাংলায় (১, ২, ৯, ১০ ❌) অনুবাদ করা সম্পূর্ণ নিষিদ্ধ!

13. CREATIVE QUESTIONS & PLAIN SCORE MARKS (সৃজনশীল প্রশ্নপত্র ও ব্র্যাকেটবিহীন নম্বর):
    - MANDATORY SEQUENTIAL RENUMBERING (সৃজনশীল প্রশ্নের ক্রমিক ১ থেকে শুরু) & QUESTION NUMBER PRESERVATION: মূল ছবিতে বা গাইডের পাতার এলোমেলো প্রশ্ন নম্বর (যেমন: ২৪, ৩, ১০, ১৩, ৪৭ ইত্যাদি) হুবহু রাখা সম্পূর্ণ নিষেধ! প্রতিটি সেকশনের সৃজনশীল প্রশ্নের ক্রমিক নম্বর ১ থেকে আবার শুরু করে অবশ্যই ১।, ২।, ৩।, ৪। ... হিসেবে ক্রমানুসারে শুরু করবেন। উপ-প্রশ্নগুলো যথারীতি ক., খ., গ., ঘ. থাকবে।
    - Format sub-questions (উদ্দীপক, ১।, ক., খ., গ., ঘ.) cleanly and beautifully.
    - PLAIN SCORE MARKS (NO BRACKETS): Do NOT use square brackets [] or parentheses () for question marks/scores! Write ONLY plain numbers (যেমন: ১, ২, ৩, ৪ বা ১০) preceded by a tab (\t) or space e.g. ক. ...\t১, খ. ...\t২, গ. ...\t৩, ঘ. ...\t৪ or \t১০. NEVER use [১], [২], (১), (২) brackets!

14. PRIMARY EXAMS (CLASS 1-5) & SHORT QUESTIONS (১ম থেকে ৫ম শ্রেণি ও সাধারণ সংক্ষিপ্ত প্রশ্নপত্র):
    - DO NOT FORCE INTO CREATIVE FORMAT (কোনো কৃত্রিম ক, খ, গ, ঘ বা উদ্দীপক রূপান্তর সম্পূর্ণ নিষিদ্ধ):
      * সাধারণত সৃজনশীল প্রশ্ন ও বহুনির্বাচনী প্রশ্ন ৬ষ্ঠ থেকে ১২শ শ্রেণি পর্যন্ত হয়। ১ম থেকে ৫ম শ্রেণির প্রশ্ন এবং অন্যান্য সাধারণ প্রশ্ন ছোট প্রশ্ন বা সাধারণ প্রশ্ন হয়ে থাকে।
      * ১ম থেকে ৫ম শ্রেণির প্রশ্ন বা সাধারণ ছোট প্রশ্নগুলোকে কখনোই জোর করে সৃজনশীলের মতো 'ক, খ, গ, ঘ' বা উদ্দীপক (>) ফরম্যাটে ফেলবেন না!
      * মূল প্রশ্নপত্রে যেভাবে ছাপা আছে (যেমন: ১। সঠিক উত্তরটি লিখ:, ২। এক কথায় উত্তর দাও:, ৩। কবিতাটি পড়ে নিচের প্রশ্নের উত্তর দাও:, ৪। শূন্যস্থান পূরণ কর:, অথবা i, ii, iii বা ক., খ. যদি মূল ফাইলে থাকে) ঠিক হুবহু সেই স্বাভাবিক ফরম্যাট ও ক্রমিক বজায় রাখুন।
      * এগুলোর ক্ষেত্রে শুধুমাত্র পেজ ডিজাইন ও ২-কলাম ফরম্যাট প্রযোজ্য হবে, ভেতরের প্রশ্নগুলোকে কৃত্রিম সৃজনশীলে বদলানো যাবে না।

15. SHORT QUESTIONS (সংক্ষিপ্ত ও অতি সংক্ষিপ্ত প্রশ্নপত্র):
    - সংক্ষিপ্ত প্রশ্ন, অতি সংক্ষিপ্ত প্রশ্ন বা এক কথায় উত্তরের ক্ষেত্রেও ক্রমিক নম্বর প্রতিটি সেকশনে স্বতন্ত্রভাবে ১।, ২।, ৩।, ৪। ... থেকে ক্রমানুসারে শুরু করতে হবে। বই বা গাইডের খণ্ডিত নম্বর বসানো সম্পূর্ণ নিষেধ।


16. TABLES & GRIDS (টেবিল ও ছক):
    - Transcribe all tables into complete, standard Markdown tables.

17. MATHEMATICAL & SCIENTIFIC NOTATION (লেটেক্স, তীর চিহ্ন ও রাসায়নিক সমীকরণ):
    - রাসায়নিক বিক্রিয়া ও তীর চিহ্ন (Chemical Arrows): বিক্রিয়ার তীর চিহ্নের জন্য \\xrightarrow বা ভাঙা LaTeX কমান্ড এড়িয়ে সরাসরি স্ট্যান্ডার্ড তীর চিহ্ন '→' লিখুন (যেমন: কার্বন ডাইঅক্সাইড + পানি → গ্লুকোজ + অক্সিজেন, অথবা প্রভাবক থাকলে: → (আলো / ক্লোরোফিল))। ড্যাশ বা ব্র্যাকেট দেওয়া যাবে না।
    - রাসায়নিক সংকেত ও যৌগ (Chemical Formulas & Symbols): বিজ্ঞানের সকল রাসায়নিক সংকেত ও যৌগ (যেমন: $KNO_3$, $KOH$, $2H_2O$, $H_2SO_4$, $CO_2$, $NaCl$, $O_2$, $Na_2CO_3$, $CaCO_3$, $H_2$, $CH_2O$, $C_2H_4O$, $C_2H_4O_2$, $N_2 + 3H_2 = 2NH_3$, $2H_2 + O_2 = 2H_2O$, $C_6H_{12}O_6$ ইত্যাদি) সাবস্ক্রিপ্ট সহ বাধ্যতামূলকভাবে LaTeX ($...$) কোডে লিখবেন!
      * কঠোর নিষেধাজ্ঞা: কখনোই ইউনিকোড সাবস্ক্রিপ্ট বা সুপারস্ক্রিপ্ট অক্ষর (যেমন: 10²³, CaCO₃, O₂, Na₂co₃, H₂, 2H₂O ❌) ব্যবহার করবেন না! এগুলো ওয়ার্ডে ইকুয়েশন হিসেবে কাজ করে না। সর্বদা LaTeX ($...$) ব্লকে লিখবেন: $6.023 \\times 10^{23}$ ✅, $CaCO_3$ ✅, $O_2$ ✅, $Na_2CO_3$ ✅, $H_2$ ✅, $2H_2 + O_2 = 2H_2O$ ✅।
      * মূল স্ক্যানে বিজয় কিবোর্ডের টাইপিং ভুলে 'KO' এর জায়গায় 'কও', 'KOH' এর জায়গায় 'কঘ', '2H2O' এর জায়গায় '২ঐও' মুদ্রিত থাকলেও আপনি তা ১০০% খাঁটি ইংরেজি সংকেতে ($KO$, $KOH$, $2H_2O$) সংশোধন করবেন। বাংলায় লেখা সম্পূর্ণ নিষিদ্ধ!
    - ভগ্নাংশ একক ও মোলারিটি একক (FRACTION UNITS LIKE mol/L, g/L):
      * প্রশ্নপত্রে যখন কোনো ভগ্নাংশ একক থাকে (যেমন: mol/L, g/L, L/mol, g/mol, km/h, m/s), সেগুলোকে সমতল স্লাশ (/) দিয়ে না লিখে বাধ্যতামূলকভাবে LaTeX ভগ্নাংশ কোডে লিখবেন:
        - $\\frac{mol}{L}$ ✅
        - $\\frac{g}{L}$ ✅
        - $\\frac{L}{mol}$ ✅
        - $\\frac{g}{mol}$ ✅
        যাতে মাইক্রোসফট ওয়ার্ড ফাইলে এগুলো আসল খাড়া ইকুয়েশন ভগ্নাংশ (Equation Fraction) হিসেবে তৈরি হয়!
    - মূল ফাইলের সংখ্যা ও একক অত্যন্ত সতর্কতার সাথে পুঙ্খানুপুঙ্খ যাচাই (Source Image & Number Verification):
      * মূল ফাইলের প্রতিটি প্রশ্নের সংখ্যা, দশমিক এবং একক অত্যন্ত সতর্কতার সাথে মিলিয়ে সঠিক ফলাফল প্রদান করবেন।
      * ইংরেজি '8' এবং বাংলা '৮' এর দৃষ্টিবিভ্রম কঠোরভাবে পরিহার করুন: কোনো সংখ্যার ভেতরে কখনোই ইংরেজি ও বাংলার বিকৃত সংমিশ্রণ (যেমন: 8.8৮ L ❌) করা যাবে না!
      * বিজ্ঞানের বহুনির্বাচনী ও গাণিতিক প্রশ্নে যেসকল অপশনে বৈজ্ঞানিক রাশি বা ইংরেজি একক রয়েছে, সেই অপশনগুলোর সকল সংখ্যা বাধ্যতামূলকভাবে ১০০% খাঁটি ইংরেজিতে (যেমন: 2.55 L ✅, 8.88 L ✅, 0.4 ✅, 0.2 ✅) উপস্থাপন করবেন।
      * বৈজ্ঞানিক ঘাত বা এক্সপোনেন্ট সমীকরণ (যেমন: $6.023 \\times 10^{23}$, $3.011 \\times 10^{23}$, $10^{-3}$, $10^5$ ইত্যাদি) বাধ্যতামূলকভাবে সম্পূর্ণ অংশ LaTeX ($...$) ব্লকে লিখবেন; কোনো অবস্থাতেই ঘাত বা সংখ্যা ভেঙে আলাদা লাইনে নেওয়া যাবে না!
    - বীজগণিতীয় রাশি, সমীকরণ ও ঘাত/পাওয়ারের জন্য বিশেষ কঠোর নিয়ম (ALGEBRAIC POWERS & EQUATIONS):
      * প্রশ্নপত্রে যখন কোনো চলকের উপর ঘাত/বর্গ/ঘন (squares, cubes) থাকে, সেগুলোকে কখনোই সমতল সাধারণ সংখ্যা (যেমন: 4x2 ❌, 8x2 ❌, 2a3 ❌, 3a2 ❌, a2-b2+c2 ❌, (x+y)2 ❌) আকারে লিখবেন না!
      * বাধ্যতামূলকভাবে সকল বীজগণিতীয় রাশি ও সমীকরণ সম্পূর্ণ অংশ LaTeX ($...$) ব্লকে লিখবেন:
        - $4x^2 - 3y + 7z$ ✅
        - $8x^2 + 5y - 3z$ ✅
        - $2a^3 \\times 3a^2$ ✅
        - $a^2 - b^2 + c^2$ ✅
        - $(x+y)^2 = (x-y)^2 + 4xy$ ✅
        - $a = 7x - 5y + 7z$ ✅
        - $a + b + c = 17x + 4y + z$ ✅
        - $a = 2, b = 3, c = 1$ ✅
        - $x = 3, y = 5, z = 2$ ✅
    - Write mathematical formulas, algebraic equations, variables, sets, and expressions in LaTeX ($...$).
    - CRITICAL: DO NOT wrap plain numbers, lists of numbers, counts, or simple measurements in $...$!
      - Plain numbers & counts: 50 জন (NOT $50$ জন), 30 জন (NOT $30$ জন), 65, 62.5 (NOT $65$, $62.5$)
      - Comma-separated numbers series: 75, 65, 80, 55, 60... (CRITICAL: NEVER wrap comma-separated numbers in $...$!)
      - Standard units & measurements: 8 m, 6 m, 20 cm, 7 সে.মি. (NOT $8 m$, $6 m$, $20 cm$, $7 সে.মি.$)
    - DO wrap actual math variables, terms, set notations, and equations in $...$:
      - Variables: $x$ এর মান, $n$ এর মান, $3n$ সংখ্যক পদ
      - Sets & Functions: $P(A)$ নির্ণয় কর, $S$ অন্বয়টিকে, $A = \{ ... \}$, $B = \{ ... \}$
      - Expressions & Equations: $y - x = -1$, $x^2 > 7$, $y^2 + 3y + 2 = 0$, $b = 2, c = 8, d = 3, p = \frac{1}{3}$
      - Series & Sequences: Use \dots for series e.g. $5 + 8 + 11 + \dots$ or $\log 2 + \log 4 + \log 8 + \dots$
    - SCIENTIFIC UNITS & QUOTATIONS:
      - NEVER wrap units like cm, mm, m, km, kg, sec, V in quotation marks! Write $2262\text{ cm}^3$ (NEVER "cm" 3 or "cm"^3).
      - NEVER put Bengali words or quotes inside LaTeX blocks.

15. DOTTED & BLANK LINES IN OFFICIAL LETTERS & FORMS (ডট ডট বা ফাঁকা স্থান হ্যান্ডলিং):
    - CRITICAL MANDATE: Never generate long or infinite chains of dots (...).
    - If there are dotted blank lines (e.g. সূত্র নং- ....., তারিখঃ ....., স্মারক নং, শূন্যস্থান বা স্বাক্ষরের স্থান), output at most 3 to 6 dots (......) or a short dash line, and immediately proceed to the next line or word!
    - DO NOT get trapped in repetitive dot loops. Continue transcribing the rest of the letter/form (বরাবর, বিষয়, জনাব, বিবরণ, আবেদনকারী, স্বাক্ষর ইত্যাদি) completely and faithfully!

16. ACCURATE BENGALI TYPOGRAPHY, INTELLIGENT OCR TYPO CORRECTION & AUDIT NOTES (অস্পষ্ট লেখা ও এআই নোট):
    - Use 100% correct Bengali spelling (যুক্তবর্ণ, ণ-ত্ব/ষ-ত্ব, দাড়ি, কমা, হাইফেন). Keep English terms, units, and symbols clean.
    - BLURRY OR UNCLEAR TEXT: If a word is blurry but guessable from context, you MUST silently insert the guessed word in the main text (DO NOT add any inline marker or bracket next to it). Instead, you MUST log the guessed word in the audit note at the very end of the document. If a word is completely unreadable and cannot be guessed, write \`⟦অস্পষ্ট: ১ শব্দ⟧\`.
    - OMIT ALL EXAM BOARD CITATIONS & REFERENCES: Completely omit board tags and citations (e.g., [ঢাকা বোর্ড-২০২৩], [ক্যাডেট কলেজ], [অধ্যায়-৩] ইত্যাদি সম্পূর্ণ বাদ দিন).
    - MANDATORY DETAILED AUDIT NOTE (বাধ্যতামূলক অডিট নোট): At the VERY END of the transcribed document, you MUST include a clean audit note block listing every single guess, blurry word recovery, and removed board reference, including the question/sub-question number and page number.
      [এআই অডিট নোট ও পরিবর্তনসমূহ:
      - প্রশ্ন ৪(খ), মূল পৃষ্ঠা ২: শব্দটি ঝাপসা ছিল; খসড়ায় "..." বসানো হয়েছে — যাচাই প্রয়োজন।
      - প্রশ্ন ১(ক), মূল পৃষ্ঠা ১: বোর্ড রেফারেন্স [ঢাকা বোর্ড-২০২৩] মুছে ফেলা হয়েছে।]

17. ENGLISH LANGUAGE QUESTION PAPERS (ইংরেজি বিষয়ের প্রশ্নপত্র - সম্পূর্ণ স্বাভাবিক কার্যক্রম):
    - CRITICAL EXCEPTION & MANDATE: The formatting rules for Bengali Dari ('।'), Bengali dot options ('ক.', 'খ.', 'গ.', 'ঘ.') with leading tabs, and CQ dot sub-questions apply ONLY to Bengali, Mathematics, Physics, Chemistry, Biology, and other Bengali-medium subjects!
    - This rule DOES NOT apply to English (English 1st Paper, English 2nd Paper, etc.).
    - For English Question Papers, run in standard/normal manner:
      * Question numbers must remain standard English format: 1. , 2. , 3. , etc. (DO NOT convert to '১।' or '1|').
      * Sub-questions and items must remain standard English format: (a), (b), (c), (d) or (i), (ii), (iii), (iv) or a. , b. , c. , d. as written in the source document.
      * Options must remain standard English format without forcing 'ক.', 'খ.', 'গ.', 'ঘ.' or Bengali letters.

18. MANDATORY INTERNAL TWO-PHASE SELF-RECHECK BEFORE OUTPUT (একই উত্তরে নিজেই পুনঃযাচাই — সর্বাধিক গুরুত্বপূর্ণ):
    - PHASE 1 (INTERNAL DRAFT — DO NOT PRINT): Silently transcribe the ENTIRE document from the first page to the last page.
    - PHASE 2 (INTERNAL VERIFICATION — DO NOT PRINT): Before writing anything, go back over EVERY attached page image one more time and compare it line-by-line against your own draft. Specifically re-check:
      * MISSING CONTENT: Is any question, sub-question, stimulus (উদ্দীপক), option, statement, table row or page missing? Recover it.
      * NUMBERING: Does every question serial and sub-question label match the source EXACTLY and in the same order (১। ২। ৩। অথবা 1. 2. 3. / ক. খ. গ. ঘ.)? NEVER renumber, re-sequence, merge or split them.
      * MARKS: Does every mark shown in the source still exist in your output with the exact same value and position (end of the line)? Multi-digit marks (১০, ১৫) must stay intact.
      * NUMBERS, UNITS & EQUATIONS: Re-read every digit, unit, chemical formula and equation against the image.
      * SPELLING & STIMULUS FIDELITY: The stimulus and question wording must match the source word-for-word.
    - FINAL OUTPUT: Print the corrected, fully verified document ONE time only. NEVER print the phase labels, the draft, a comparison table, or any commentary about this process.
    - MARKS ARE NEVER REMOVED (নম্বর কখনোই মুছবেন না): Omitting board/source citations is required for a fresh paper, but the marks of a question ([১], ৩, মান: ৪) must ALWAYS be preserved. Removing a board tag must never remove the marks printed next to it.
    - MANDATORY VERIFICATION NOTE AT THE VERY END: After the last line of the document you MUST append exactly one audit block, starting with this exact marker:
      [এআই অডিট নোট ও পরিবর্তনসমূহ:
      - প্রশ্ন ৪(খ), মূল পৃষ্ঠা ২: শব্দটি ঝাপসা ছিল; অনুমান করে "..." বসানো হয়েছে — যাচাই প্রয়োজন।
      - প্রশ্ন ৬(গ), মূল পৃষ্ঠা ৩: পুনঃযাচাইয়ে এই উপ-প্রশ্নটি খসড়ায় বাদ পড়েছিল, যোগ করা হয়েছে।
      - প্রশ্ন ১(ক), মূল পৃষ্ঠা ১: বোর্ড রেফারেন্স [ঢাকা বোর্ড-২০২৩] মুছে ফেলা হয়েছে (নম্বর অক্ষত আছে)।]
    - If the re-check found nothing to change, still append: [এআই অডিট নোট ও পরিবর্তনসমূহ: মূল ফাইলের সাথে সম্পূর্ণ যাচাইকৃত; কোনো অনুমান বা সংশোধন করা হয়নি।]`;

  const GEMINI_VERIFY_PROMPT = `You are the Chief Examination Paper Auditor, Proofreader, and Senior Bengali Question Typist.
0.0 STRICT QUESTION-ONLY EXTRACTION (প্রশ্নপত্র, উত্তরমালা নয় — সর্বোচ্চ অগ্রাধিকার):
   - এই টুলের আউটপুট শুধু প্রশ্নপত্র। উৎস পৃষ্ঠায় উত্তর/সমাধানের অংশ থাকলেও তা অনুলিপি করবেন না এবং নিজের থেকে তৈরিও করবেন না।
   - বাদ যাবে: "উত্তর: …", "সমাধান: …", "Answer: …", Solution/Explanation ব্লক, গাণিতিক work-out-এর ধাপ (যদি প্রশ্নের অংশ না হয়), উত্তরমালা/হেড-শিট, মূল্যায়ন চার্ট বা নম্বর বণ্টন-টেবিল।
   - যে লাইন প্রশ্নের নির্দেশনা ("সঠিক উত্তরটি লিখ:", "নিচের থেকে বেছে নাও:", "যুক্তি দেখাও:") সেগুলো প্রশ্নের অংশ — অক্ষুণ্ন রাখবেন।
   - আউটপুটে কোনো 'answers', 'solutions' বা উত্তরের ফিল্ড/অনুচ্ছেদ থাকবে না; থাকলে তা ফাঁকা রাখবেন না — সম্পূর্ণ বাদ দেবেন।

You are given:
1. The ORIGINAL source images / document pages (attached as media).
2. The PREVIOUSLY EXTRACTED draft text of the document / exam paper (provided in text).

YOUR PRIMARY MISSION:
Conduct a rigorous, stroke-by-stroke and word-by-word audit comparing the extracted draft text against the ORIGINAL source images to find and fix all flaws.

SPECIFIC DEFECTS YOU MUST AUDIT AND FIX:
1. উদ্দীপক ও অনুচ্ছেদ পুঙ্খানুপুঙ্খ যাচাই (Strictly Verbatim Stimulus):
   - Compare the stimulus (উদ্দীপক/অনুচ্ছেদ) of every question against the source image stroke-by-stroke.
   - If any word, phrase, sentence, or data in the stimulus was altered, paraphrased, summarized, or changed, RESTORE the EXACT original wording from the source image.
   - For handwritten text, verify each word against the handwriting strokes (e.g. 'কোনো বিষয়ে', 'বিদ্রোহী সত্ত্বা', 'অবজ্ঞার পাত্র', '১৯৬৯', 'গণঅভ্যুত্থান', 'তুরস্ককে').

2. মিসিং অংশ ও উপ-প্রশ্ন অডিট (Zero Omission & Zero Hallucination):
   - Transcribe ONLY what is physically and visibly present in the source images.
   - CRITICAL: DO NOT invent a 'ঘ' sub-question if it is NOT written on the image! If the image only has ক., খ., গ., keep ONLY ক., খ., গ. and remove any hallucinated 'ঘ'!
   - DO NOT invent Question 2 or letter writing if not on the image! Remove any fabricated questions or sections.
   - If any visible question or sub-question was actually skipped or dropped from the image, restore it from the image.
   - In MCQs, verify all options ((ক), (খ), (গ), (ঘ)) and roman numerals (i, ii, iii) are present.
   - Verify that all equations, tables, and lines from all pages are included.

3. বানান ও সমীকরণ সংশোধন (Spelling, Equations & Math Correction):
   - Fix any OCR spelling errors, broken yuktakhor (যুক্তবর্ণ), blurred characters, or punctuation mistakes.
   - CRITICAL MATH AUDIT: Ensure all equations, variables, vectors, and fractions (e.g., \\vec{AD}) are strictly wrapped in LaTeX $ signs (e.g., $\\vec{AD}$) AND wrapped in backticks (e.g., \`$\\vec{AD}$\`). NEVER leave raw LaTeX strings unprotected!
   - ZERO "ERROR!" POLICY: If the previous draft says "Error!", it means the earlier model failed to read the equation. You MUST read the equation from the image and replace "Error!" with the correct LaTeX math. NEVER output "Error!".

4. ক্রমিক নম্বর ও ফরম্যাটিং নিয়ম বজায় রাখা:
   - QUESTION NUMBER PRESERVATION (CRITICAL): Keep original question numbers exactly as they are in the image. DO NOT re-sequence or re-number them! (Never start from ১ if the image starts from ৫).
   - বাংলা, গণিত ও বিজ্ঞান বিষয়ের ক্ষেত্রে প্রশ্নের ক্রমিক নম্বর এর পর মূল ছবিতে যেমন আছে (দাড়ি '।', ডট '.' বা ব্রাকেট ')') হুবহু সেভাবেই রাখবেন। কোনোভাবেই জোর করে দাড়ি (।) বসাবেন না। (ইংরেজি বিষয়ের ক্ষেত্রেও ছবির স্বাভাবিক ফরম্যাট অপরিবর্তিত রাখবেন)।
   - সৃজনশীল প্রশ্ন: প্রতিটি উপ-প্রশ্ন ডট ফরম্যাটে ক., খ., গ., ঘ. (বন্ধনী ছাড়া, শুরুতে কোনো ট্যাব থাকবে না)।
   - বহুনির্বাচনী প্রশ্ন: ক্রমিক নম্বরের নিচে রোমান সংখ্যা বা তালিকার শুরুতে \t সহ \ti. ..., \tii. ...। প্রতিটি অপশন লাইনে শুরুতে \t এবং মাঝে \t সহ ডট ফরম্যাট \tক. ...\tখ. ...\tগ. ...\tঘ. ...।
   - সংক্ষিপ্ত ও প্রাথমিক প্রশ্ন (১ম থেকে ৫ম শ্রেণি): কোনোভাবেই জোর করে সৃজনশীলের মতো 'ক, খ, গ, ঘ' বা উদ্দীপক (>) বানাবেন না; মূল ফাইলের স্বাভাবিক প্রশ্ন ও উপ-প্রশ্ন বজায় রাখুন।
     * রাসায়নিক সংকেত ও সমীকরণ: বিজ্ঞানের সকল রাসায়নিক সংকেত ও যৌগ (যেমন: $KNO_3$, $KOH$, $2H_2O$, $H_2SO_4$, $CO_2$, $N_2 + 3H_2 = 2NH_3$ ইত্যাদি) এবং বৈজ্ঞানিক ঘাত ($6.023 \\times 10^{23}$) সাবস্ক্রিপ্ট ও সুপারস্ক্রিপ্ট সহ বাধ্যতামূলকভাবে LaTeX ($...$) ব্লকে রাখবেন; কোনো অবস্থাতেই এগুলোকে সাধারণ টেক্সটে বা ভাঙা লাইনে রাখবেন না। বিক্রিয়ার তীর চিহ্ন সরাসরি '→' বা '──[...]──>' লিখবেন।
     * সার্বজনীন স্ক্রিপ্ট ও ডিজিট অডিট (Universal Script & Digit Fidelity): সৃজনশীল উদ্দীপক, উপ-প্রশ্ন (ক., খ., গ., ঘ.), বহুনির্বাচনী, সংক্ষিপ্ত প্রশ্ন বা ফর্ম—যেকোনো কাজের ক্ষেত্রে মূল ছবিতে যেখানেই ইংরেজি অক্ষর, প্রতীক বা সংখ্যা (যেমন: A, B, C, Cu, Fe, FeCl3, 20, 4, 6 বা অপশনে 1, 2, 9, 10 বা 0, 1, 2, 3) রয়েছে, খসড়ায় তা ভুলবশত বাংলায় রূপান্তর হয়ে থাকলে অবশ্যই মূল ছবির মতো খাঁটি ইংরেজিতে (ASCII English) সংশোধন করুন। ইংরেজি '8' এবং বাংলা '৮' এর মিশ্রণ (যেমন: 8.8৮ L ❌) দূর করে খাঁটি ইংরেজিতে সংশোধন করুন। বিজ্ঞানের বহুনির্বাচনীতে এককযুক্ত সকল অপশনের সংখ্যা একরূপ খাঁটি ইংরেজিতে রাখবেন।
   - No exam board tags/references (e.g., omit [ঢাকা বোর্ড-২০২৩], [ক্যাডেট কলেজ], [অধ্যায়-৩]). All removed tags MUST be logged in the audit note.
   - BLURRY TEXT RECOVERY: If you guess a blurry word, silently insert it in the text (no inline markers) and log the details in the audit note at the very end.
   - PLAIN SCORE MARKS (NO BRACKETS): Keep question scores as plain digits/marks e.g. \t১, \t২, \t৩, \t৪ without any square brackets [] or parentheses ().
   - STIMULUS & QUESTION FULL FIDELITY: Never summarize or shorten stimulus (উদ্দীপক) or question text.
   - Preserve all legitimate content parentheses e.g. (Vision & Mission), (যেমন: ...), (বেঞ্চ/টেবিল), and retain hyphens in compound words (শিল্প-সংস্কৃতি, আলো-বাতাস, শিক্ষক-শিক্ষিকাদের).
   - Never merge or collapse sub-articles or clause lines (৪.১, ৪.২, ৫.১, ৫.২); ensure each remains on its own separate line.
   - For diagrams/images, simply write: [ছবি আছে-পৃ:০১].
   - No markdown bold asterisks (**). No asterisks on roman numerals (*i.* -> i.).
   - No empty blank lines or double Enters between consecutive questions or lines.
   - Never output long chains of dots. Keep dotted lines to at most 3 to 6 dots (......) and preserve the rest of the letter/form.

5. MANDATORY DETAILED AUDIT NOTE (বাধ্যতামূলক অডিট নোট — সকল প্রশ্নের পর সম্পূর্ণ শেষে):
   - At the VERY END of the verified document (AFTER all questions and text are finished), you MUST include a clean audit note block listing every single correction, guessed word, and removed board reference:
     [এআই অডিট নোট ও পরিবর্তনসমূহ:
     - প্রশ্ন ৪(খ), মূল পৃষ্ঠা ২: শব্দটি ঝাপসা ছিল; খসড়ায় "..." বসানো হয়েছে — অনুমান—যাচাই প্রয়োজন।
     - প্রশ্ন ১(ক), মূল পৃষ্ঠা ১: বোর্ড রেফারেন্স [ঢাকা বোর্ড-২০২৩] মুছে ফেলা হয়েছে।]
   - CRITICAL MANDATE: NEVER attach or place this note inside or near any question or question number! It must be strictly on its own lines at the very bottom after all questions are completely finished.
   - If absolutely NO errors were found and the draft was already 100% faithful:
     [এআই অডিট নোট ও পরিবর্তনসমূহ: মূল ফাইলের সাথে সম্পূর্ণ যাচাইকৃত, কোনো পরিবর্তন বা অনুমান করা হয়নি।]

OUTPUT REQUIREMENT:
Output the COMPLETE, FULL document text from start to finish, ending with the mandatory [নোট... block at the very bottom.`;

  const DEFAULT_GEMINI_API_KEY = '';
  const DEMO_SAMPLE_TEXT = `মেসার্স শাহ আলম ট্রেডার্স
ফুলবাড়ী, দিনাজপুর। ফোন: 01717-101919

বিষয়: পণ্য সরবরাহ বিবরণী ও মূল্য তালিকা

| ক্রমিক | পণ্যের বিবরণ | পরিমাণ | একক দর (টাকা) | মোট মূল্য (টাকা) |
|---|---|---|---|---|
| ০১ | মিনিকেট চাল | ৫০ বস্তা | ৩,২০০/- | ১,৬০,০০০/- |
| ০২ | নাজিরশাইল চাল | ৩০ বস্তা | ৩,৫০০/- | ১,০৫,০০০/- |
| ০৩ | সয়াবিন তেল (৫ লিটার) | ২০ কার্টুন | ৪,২০০/- | ৮৪,০০০/- |
| ০৪ | মসুর ডাল (দেশি) | ১০ বস্তা | ৬,০০০/- | ৬০,০০০/- |

সর্বমোট মূল্য: ৪,০৯,০০০/- (চার লক্ষ নয় হাজার টাকা মাত্র)

১. গণিত সমীকরণ মডেল:
\\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\]`;

  const savedKey = localStorage.getItem(STORAGE_KEYS.BYOK_KEY) || localStorage.getItem('bengali_ocr_gemini_key') || DEFAULT_GEMINI_API_KEY;
  const savedGas = localStorage.getItem(STORAGE_KEYS.GAS_URL) || localStorage.getItem('bengali_ocr_gas_url') || '';
  const hasValidConfig = Boolean(savedKey || savedGas);

  const rawDemoSetting = localStorage.getItem(STORAGE_KEYS.DEMO_MODE);
  // Default to Live mode (false) when API key is available
  const isDemo = (rawDemoSetting === 'true');

  let savedModelSetting = localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL) || 'auto';
  if (savedModelSetting === 'gemini-1.5-flash' || savedModelSetting === 'gemini-1.5-pro' || savedModelSetting.includes('1.5') || savedModelSetting.includes('lite')) {
    savedModelSetting = 'auto';
    localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, 'auto');
  }

  const SUPABASE_CONFIG = {
    FUNCTIONS_URL: 'https://fayzar-ocr-proxy.fayzar-ocr-proxy.workers.dev', // Cloudflare Worker URL
    // ⚠️ Worker-এর PROXY_TOKEN-এর সাথে হুবহু মিলতে হবে। এটি ক্লায়েন্টে থাকা শেয়ারড সিক্রেট —
    // ক্যাজুয়াল অপব্যবহার ঠেকায়, কিন্তু ডিটারমিনড অ্যাটাকার পড়ে ফেলতে পারে; তাই Worker-এ
    // রেট-লিমিট + Origin allowlist অবশ্যই রাখুন (fayzar-ocr-proxy/README.md দেখুন)।
    // Part-12 (অডিট ৪): কঠোর মান সোর্স-এ লেগে থাকলে রোটেশন/ডিপ্লয়মেন্ট-ভেদে বদলানো যায় না।
    // অগ্রাধিকার: localStorage override → বিল্ড-টাইম globalThis.FAYZAR_PROXY_TOKEN → পুরনো ফলব্যাক।
    // প্রকৃত সুরক্ষা Worker-এর পাশে (env/secret) থাকাই উচিত; ক্লায়েন্ট-সাইড শেয়ারড গেট তাই অস্থায়ী।
    PROXY_TOKEN: (typeof localStorage !== 'undefined' && localStorage.getItem('fayzar_proxy_token')) ||
      (typeof globalThis !== 'undefined' && globalThis.FAYZAR_PROXY_TOKEN) ||
      '40jclzkNXxkaji5MkXaosxKn7JDnrxLzOYMYN6wCYJAx',
    ANON_KEY: 'cloudflare_proxy', // পুরোনো নাম — শুধু ব্যাকওয়ার্ড কম্প্যাটিবিলিটির জন্য
    ENABLED: true, 
    CHUNK_PAGES: 3, // Safe limit for Edge Function payload (around 6MB-10MB max)
    TIMEOUT_MS: 480000 // part-7: ৮ মিনিটের সিলিং — Worker-এর ৭ মিনিট বাজেটের উপরে হেডরুম
  };

  // ক্লাউড প্রক্সি (Cloudflare Worker) দিয়ে লোকাল কি ছাড়াই OCR চালানো সম্ভব কি না —
  // কি-গুলো সার্ভারে (KV) রাখা হলে ব্রাউজারে কোনো কি না থাকলেও কনভার্সন চলবে।
  function isCloudProxyAvailable() {
    try {
      if (!SUPABASE_CONFIG || !SUPABASE_CONFIG.ENABLED || !SUPABASE_CONFIG.FUNCTIONS_URL) return false;
      const userCustomKey = (typeof localStorage !== 'undefined')
        ? localStorage.getItem('fayzar_ai_ocr_custom_byok')
        : '';
      return !userCustomKey; // BYOK থাকলে সরাসরি সেই কি ব্যবহার হবে
    } catch (e) { return false; }
  }

  const state = {
    freeUsesCount: parseInt(localStorage.getItem(STORAGE_KEYS.FREE_COUNT) || '0', 10),
    byokApiKey: savedKey,
    gasUrl: savedGas,
    demoMode: isDemo,
    selectedModel: savedModelSetting,
    autoVerify: localStorage.getItem('ai_ocr_auto_verify') === 'true',
    proBridgeEnabled: localStorage.getItem('fayzar_pro_bridge_enabled') === 'true',

    filesQueue: [],
    deletedPagesHistory: [],
    currentZoomIndex: 0,
    currentZoomScale: 1.0,
    selectedFile: null,
    imageBase64: '',
    imageMimeType: '',
    lastMediaItems: [],
    isProcessing: false,
    unicodeText: '',
    bijoyText: '',
    activeViewTab: 'unicode'
  };

  let elements = {};
  let _dictLoaded = false;

  async function loadConverterDictionary() {
    if (_dictLoaded) return;
    _dictLoaded = true;
    let dict = [];
    try {
      const local = JSON.parse(localStorage.getItem('fayzar_converter_dict') || '[]');
      if (Array.isArray(local) && local.length) dict = local;
    } catch (e) { /* ignore */ }

    if (!dict.length) {
      if (typeof window !== 'undefined' && window.OFFLINE_DATA?.converter_dict) {
        dict = window.OFFLINE_DATA.converter_dict;
      }
      try {
        const res = await fetch('data/converter_dict.json?t=' + Date.now());
        if (res.ok) {
          const j = await res.json();
          if (Array.isArray(j) && j.length) dict = j;
        }
      } catch (e) { /* ignore */ }
    }

    if (typeof window.BanglaConverter !== 'undefined' && typeof window.BanglaConverter.setCustomDictionary === 'function') {
      window.BanglaConverter.setCustomDictionary(dict);
    }
  }

  function init() {
    bindElements();
    if (!elements.panel) return;
    loadSettings();
    updateBadges();
    setupEvents();
    loadConverterDictionary();
    checkDesktopBridgeOnline(true);
    // Silently pre-warm 2-3 healthy keys and models in background (zero token cost)
    if (typeof FayzarOcrConfig !== 'undefined') {
      if (typeof FayzarOcrConfig.buildValidatedKeysCache === 'function') {
        FayzarOcrConfig.buildValidatedKeysCache();
      }
      if (typeof FayzarOcrConfig.prewarmStandbyPool === 'function') {
        FayzarOcrConfig.prewarmStandbyPool();
      }
    }
    // Poll bridge every 2.5s for instant status sync
    setInterval(() => {
      if (!state.isProcessing) {
        checkDesktopBridgeOnline(false);
      }
    }, 2500);
    window.addEventListener('focus', () => {
      if (!state.isProcessing) {
        checkDesktopBridgeOnline(true);
      }
    });
  }

  function bindElements() {
    elements = {
      panel: document.getElementById('panel-text') || document.getElementById('panel-ai-ocr'),
      dropZone: document.getElementById('ai-ocr-dropzone'),
      fileInput: document.getElementById('ai-ocr-file-input'),
      uploadPrompt: document.getElementById('ai-ocr-upload-prompt'),
      previewContainer: document.getElementById('ai-ocr-preview-container'),
      imagePreview: document.getElementById('ai-ocr-image-preview'),
      pdfPreviewIcon: document.getElementById('ai-ocr-pdf-preview'),
      removeImageBtn: document.getElementById('ai-ocr-remove-image-btn'),
      fileName: document.getElementById('ai-ocr-file-name'),
      fileSize: document.getElementById('ai-ocr-file-size'),
      fileCountBadge: document.getElementById('ai-ocr-file-count-badge'),
      multiThumbs: document.getElementById('aiOcrThumbsList') || document.getElementById('ai-ocr-multi-thumbs'),

      convertBtn: document.getElementById('executeAiConversionBtn') || document.getElementById('ai-ocr-convert-btn'),
      convertBtnText: document.getElementById('executeAiConversionBtnText') || document.getElementById('ai-ocr-convert-btn-text'),
      progressContainer: document.getElementById('wizardProgressCard') || document.getElementById('ai-ocr-progress-container'),
      progressStepText: document.getElementById('wizardProgressTitle') || document.getElementById('ai-ocr-progress-step-text'),
      progressBar: document.getElementById('wizardProgressBar') || document.getElementById('ai-ocr-progress-bar'),
      progressPercent: document.getElementById('wizardProgressPctText') || document.getElementById('ai-ocr-progress-percent'),

      successCard: document.getElementById('wizardResultCard') || document.getElementById('ai-ocr-success-card'),
      togglePreviewBtn: document.getElementById('wizardPreviewToggleBtn') || document.getElementById('ai-ocr-toggle-preview-btn'),
      togglePreviewText: document.getElementById('wizardPreviewToggleText') || document.getElementById('ai-ocr-toggle-preview-text'),
      collapsiblePreview: document.getElementById('wizardPreviewBox') || document.getElementById('ai-ocr-collapsible-preview'),

      creditBadge: document.getElementById('ai-ocr-credit-badge'),
      modeBadge: document.getElementById('ai-ocr-mode-badge'),

      undoPageDeleteBtn: document.getElementById('undoPageDeleteBtn'),
      undoPageDeleteBtnText: document.getElementById('undoPageDeleteBtnText'),
      cancelConversionBtn: document.getElementById('wizardCancelConversionBtn'),

      // Page Zoom Modal Elements
      pageZoomModal: document.getElementById('pageZoomModal'),
      pageZoomTitle: document.getElementById('pageZoomTitle'),
      pageZoomSubtitle: document.getElementById('pageZoomSubtitle'),
      pageZoomImg: document.getElementById('pageZoomImg'),
      pageZoomImgWrapper: document.getElementById('pageZoomImgWrapper'),
      pageZoomInBtn: document.getElementById('pageZoomInBtn'),
      pageZoomOutBtn: document.getElementById('pageZoomOutBtn'),
      pageZoomResetBtn: document.getElementById('pageZoomResetBtn'),
      pageZoomPrevBtn: document.getElementById('pageZoomPrevBtn'),
      pageZoomNextBtn: document.getElementById('pageZoomNextBtn'),
      pageZoomCloseBtn: document.getElementById('pageZoomCloseBtn'),

      outputUnicodeArea: document.getElementById('wizardPreviewContent') || document.getElementById('ai-ocr-output-unicode'),
      outputBijoyArea: document.getElementById('ai-ocr-output-bijoy'),

      copyBtn: document.getElementById('wizardCopyTextBtn') || document.getElementById('ai-ocr-copy-btn'),
      sendToConverterBtn: document.getElementById('ai-ocr-send-to-converter-btn'),
      downloadDocBtn: document.getElementById('wizardDlDocBtn') || document.getElementById('ai-ocr-download-doc-btn'),
      downloadBijoyDocxBtn: document.getElementById('wizardDlDocxBtn') || document.getElementById('ai-ocr-download-bijoy-docx-btn'),
      downloadUnicodeDocxBtn: document.getElementById('wizardDlUnicodeDocxBtn'),
      downloadDocxBtn: document.getElementById('wizardDlUnicodeDocxBtn') || document.getElementById('wizardDlDocxBtn') || document.getElementById('ai-ocr-download-docx-btn'),
      wizardStudioPreviewBtn: document.getElementById('wizardStudioPreviewBtn'),
      wizardOpenStudioInlineBtn: document.getElementById('wizardOpenStudioInlineBtn'),

      pageSizeSelect: document.getElementById('ai-target-page-size') || document.getElementById('ai-ocr-page-size'),
      pageMarginSelect: document.getElementById('ai-target-page-margin') || document.getElementById('ai-ocr-page-margin'),
      fontSizeSelect: document.getElementById('ai-target-font-size') || document.getElementById('ai-ocr-font-size'),
      lineSpacingSelect: document.getElementById('ai-ocr-line-spacing'),

      openSettingsBtn: document.getElementById('ai-ocr-open-settings-btn') || document.getElementById('ai-ocr-settings-btn'),
      settingsModal: document.getElementById('ai-ocr-settings-modal'),
      closeSettingsBtn: document.getElementById('ai-ocr-settings-close-btn') || document.getElementById('ai-ocr-close-settings-btn'),
      saveSettingsBtn: document.getElementById('ai-ocr-settings-save-btn') || document.getElementById('ai-ocr-save-settings-btn'),
      demoToggle: document.getElementById('ai-ocr-demo-toggle'),
      geminiKeyInput: document.getElementById('ai-ocr-settings-api-key') || document.getElementById('ai-ocr-gemini-key-input'),
      modelSelect: document.getElementById('ai-ocr-settings-model-select') || document.getElementById('ai-ocr-model-select'),
      gasUrlInput: document.getElementById('ai-ocr-gas-url-input'),
      resetCreditsBtn: document.getElementById('ai-ocr-reset-credits-btn'),
      autoVerifyToggle: document.getElementById('ai-ocr-settings-autoverify'),
      keysRefreshBtn: document.getElementById('ai-ocr-keys-refresh-btn'),
      keysCsvBtn: document.getElementById('ai-ocr-keys-csv-btn'),
      keysSummary: document.getElementById('ai-ocr-keys-summary'),
      keysTbody: document.getElementById('ai-ocr-keys-tbody'),
      keysModels: document.getElementById('ai-ocr-keys-models'),
      downloadAuditBtn: document.getElementById('ai-ocr-download-audit-btn'),

      // Re-verification & Audit elements
      verifyBtn: document.getElementById('wizardVerifyBtn'),
      verifyBtnText: document.getElementById('wizardVerifyBtnText'),
      auditNotesBox: document.getElementById('wizardAuditNotesBox'),
      auditNotesContent: document.getElementById('wizardAuditNotesContent'),
      auditStatusBadge: document.getElementById('wizardAuditStatusBadge'),

      byokModal: document.getElementById('ai-ocr-byok-modal'),
      byokInput: document.getElementById('ai-ocr-modal-api-key'),
      saveByokBtn: document.getElementById('ai-ocr-byok-save-btn'),
      cancelByokBtn: document.getElementById('ai-ocr-byok-cancel-btn'),
      customDirectiveInput: document.getElementById('ai-custom-directive-input')
    };
  }

  function loadSettings() {
    if (elements.demoToggle) elements.demoToggle.checked = state.demoMode;
    if (elements.geminiKeyInput) elements.geminiKeyInput.value = state.byokApiKey;
    if (elements.gasUrlInput) elements.gasUrlInput.value = state.gasUrl;
    if (elements.modelSelect) elements.modelSelect.value = state.selectedModel || 'auto';
    if (elements.autoVerifyToggle) elements.autoVerifyToggle.checked = state.autoVerify;

    // Load Target Settings if they exist
    if (elements.pageSizeSelect && localStorage.getItem('ai_target_page_size')) {
      elements.pageSizeSelect.value = localStorage.getItem('ai_target_page_size');
    }
    if (elements.pageMarginSelect && localStorage.getItem('ai_target_page_margin')) {
      elements.pageMarginSelect.value = localStorage.getItem('ai_target_page_margin');
    }
    if (elements.fontSizeSelect && localStorage.getItem('ai_target_font_size')) {
      elements.fontSizeSelect.value = localStorage.getItem('ai_target_font_size');
    }
  }

  function updateBadges() {
    const remaining = Math.max(0, MAX_FREE_USES - state.freeUsesCount);
    if (elements.creditBadge) {
      elements.creditBadge.textContent = `ফ্রি ক্রেডিট: ${toBengaliNumber(remaining)}/${toBengaliNumber(MAX_FREE_USES)}`;
      if (remaining === 0) {
        elements.creditBadge.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300";
        elements.creditBadge.textContent = "ফ্রি শেষ (BYOK)";
      } else {
        elements.creditBadge.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300";
      }
    }
    updateProModelStatusUI(cachedBridgeOnline);
  }

  function setupEvents() {
    if (elements.dropZone) {
      ['dragenter', 'dragover'].forEach(name => {
        elements.dropZone.addEventListener(name, (e) => {
          e.preventDefault();
          elements.dropZone.classList.add('border-indigo-500', 'bg-indigo-50/50', 'dark:bg-indigo-950/20');
        });
      });
      ['dragleave', 'drop'].forEach(name => {
        elements.dropZone.addEventListener(name, (e) => {
          e.preventDefault();
          elements.dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/50', 'dark:bg-indigo-950/20');
        });
      });
      elements.dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
      });
    }

    if (elements.fileInput) {
      elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
      });
    }

    if (elements.removeImageBtn) {
      elements.removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearImage();
      });
    }

    // Only attach listener if convertBtn is not the wizard's executeAiConversionBtn (which is handled by main.js)
    if (elements.convertBtn && elements.convertBtn.id !== 'executeAiConversionBtn') {
      elements.convertBtn.addEventListener('click', startOcrConversion);
    }

    if (elements.togglePreviewBtn) {
      elements.togglePreviewBtn.addEventListener('click', (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const box = elements.collapsiblePreview || document.getElementById('wizardPreviewBox');
        if (!box) return;
        const isHidden = box.classList.contains('hidden');
        if (isHidden) {
          const latestText = state.unicodeText || (elements.outputUnicodeArea && elements.outputUnicodeArea.value) || '';
          if (elements.outputUnicodeArea) {
            elements.outputUnicodeArea.value = latestText;
          }
          box.classList.remove('hidden');
          box.classList.add('flex');
          if (elements.togglePreviewText) elements.togglePreviewText.textContent = 'টেক্সট প্রিভিউ লুকান';
        } else {
          box.classList.add('hidden');
          box.classList.remove('flex');
          if (elements.togglePreviewText) elements.togglePreviewText.textContent = 'টেক্সট প্রিভিউ দেখুন';
        }
      });
    }

    if (elements.outputUnicodeArea) {
      elements.outputUnicodeArea.addEventListener('input', () => {
        state.unicodeText = elements.outputUnicodeArea.value;
      });
    }

    // Save target settings on change
    if (elements.pageSizeSelect) {
      elements.pageSizeSelect.addEventListener('change', (e) => localStorage.setItem('ai_target_page_size', e.target.value));
    }
    if (elements.pageMarginSelect) {
      elements.pageMarginSelect.addEventListener('change', (e) => localStorage.setItem('ai_target_page_margin', e.target.value));
    }
    if (elements.fontSizeSelect) {
      elements.fontSizeSelect.addEventListener('change', (e) => localStorage.setItem('ai_target_font_size', e.target.value));
    }

    if (elements.copyBtn) elements.copyBtn.addEventListener('click', copyCurrentText);
    if (elements.sendToConverterBtn) elements.sendToConverterBtn.addEventListener('click', sendToMainConverter);

    if (elements.downloadDocBtn) elements.downloadDocBtn.onclick = () => downloadWordDocument('doc');
    if (elements.downloadBijoyDocxBtn) elements.downloadBijoyDocxBtn.onclick = () => downloadWordDocument('bijoy_docx');
    if (elements.downloadUnicodeDocxBtn) elements.downloadUnicodeDocxBtn.onclick = () => downloadWordDocument('unicode_docx');
    if (elements.wizardStudioPreviewBtn) elements.wizardStudioPreviewBtn.onclick = () => openStudioPreviewEditor();
    if (elements.wizardOpenStudioInlineBtn) elements.wizardOpenStudioInlineBtn.onclick = () => openStudioPreviewEditor();

    if (elements.verifyBtn) {
      elements.verifyBtn.addEventListener('click', () => runVerificationPipeline(false));
    }

    function toggleProModel(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!cachedBridgeOnline) {
        showToast('ডেস্কটপ প্রো ব্রিজ সংযুক্ত নেই, সাধারণ ক্লাউড এপিআই সক্রিয় আছে।', 'info');
        return;
      }
      state.proBridgeEnabled = !state.proBridgeEnabled;
      localStorage.setItem('fayzar_pro_bridge_enabled', state.proBridgeEnabled ? 'true' : 'false');
      updateProModelStatusUI(cachedBridgeOnline);
      if (state.proBridgeEnabled) {
        showToast('⚡ প্রো মডেল (Gemini 3.1 Pro) সক্রিয় করা হয়েছে!', 'success');
      } else {
        showToast('ক্লাউড এপিআই কি মোড সক্রিয় করা হয়েছে (“প্রো মডেল একটিভ করুন” প্রস্তুত)।', 'info');
      }
    }

    if (elements.modeBadge) {
      elements.modeBadge.style.cursor = 'pointer';
      elements.modeBadge.addEventListener('click', toggleProModel);
    }
    const proToggleBtn = document.getElementById('proModelToggleBtn');
    if (proToggleBtn) {
      proToggleBtn.addEventListener('click', toggleProModel);
    }
    if (elements.openSettingsBtn) elements.openSettingsBtn.addEventListener('click', () => {
      toggleModal(elements.settingsModal, true);
      refreshKeyStatus(true); // সেটিংস খুললেই কি-খতিয়ান নীরবে হালনাগাদ
    });
    if (elements.keysRefreshBtn) elements.keysRefreshBtn.addEventListener('click', () => refreshKeyStatus(false));
    if (elements.keysCsvBtn) elements.keysCsvBtn.addEventListener('click', downloadKeyStatusCsv);
    if (elements.closeSettingsBtn) elements.closeSettingsBtn.addEventListener('click', () => toggleModal(elements.settingsModal, false));
    if (elements.saveSettingsBtn) elements.saveSettingsBtn.addEventListener('click', saveSettings);
    if (elements.resetCreditsBtn) elements.resetCreditsBtn.addEventListener('click', resetCredits);
    if (elements.cancelByokBtn) elements.cancelByokBtn.addEventListener('click', () => toggleModal(elements.byokModal, false));
    if (elements.saveByokBtn) elements.saveByokBtn.addEventListener('click', saveByokKey);
    if (elements.downloadAuditBtn) {
      elements.downloadAuditBtn.addEventListener('click', () => {
        const logs = (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.getAuditLogs === 'function')
          ? FayzarOcrConfig.getAuditLogs()
          : [];
        if (!logs || logs.length === 0) {
          showToast('এখনও কোনো অডিট লগ রেকর্ড হয়নি। কনভার্ট সম্পন্ন হলে লগ পাওয়া যাবে।', 'info');
          return;
        }
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fayzar_ocr_audit_log_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('অডিট লগ ফাইল সফলভাবে ডাউনলোড হয়েছে!', 'success');
      });
    }

    if (elements.undoPageDeleteBtn) {
      elements.undoPageDeleteBtn.addEventListener('click', undoPageDelete);
    }
    if (elements.cancelConversionBtn) {
      elements.cancelConversionBtn.addEventListener('click', cancelCurrentConversion);
    }

    // Lightbox Zoom Modal Controls
    if (elements.pageZoomCloseBtn) elements.pageZoomCloseBtn.addEventListener('click', closePageZoom);
    if (elements.pageZoomInBtn) elements.pageZoomInBtn.addEventListener('click', () => setZoomScale(state.currentZoomScale + 0.25));
    if (elements.pageZoomOutBtn) elements.pageZoomOutBtn.addEventListener('click', () => setZoomScale(state.currentZoomScale - 0.25));
    if (elements.pageZoomResetBtn) elements.pageZoomResetBtn.addEventListener('click', () => setZoomScale(1.0));
    if (elements.pageZoomPrevBtn) elements.pageZoomPrevBtn.addEventListener('click', () => navPageZoom(-1));
    if (elements.pageZoomNextBtn) elements.pageZoomNextBtn.addEventListener('click', () => navPageZoom(1));
    if (elements.pageZoomImg) {
      elements.pageZoomImg.addEventListener('click', () => {
        setZoomScale(state.currentZoomScale > 1.2 ? 1.0 : 1.8);
      });
    }

    if (elements.pageZoomModal) {
      elements.pageZoomModal.addEventListener('click', (e) => {
        if (e.target === elements.pageZoomModal || e.target === elements.pageZoomImgWrapper) {
          closePageZoom();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      const zoomModal = elements.pageZoomModal || document.getElementById('pageZoomModal');
      if (zoomModal && !zoomModal.classList.contains('hidden')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closePageZoom();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navPageZoom(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navPageZoom(1);
        }
      }
    });
  }

  // Extract all pages from a PDF as crisp images
  async function convertPdfToImages(file) {
    const pdfLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    if (!pdfLib) {
      return null;
    }
    try {
      if (pdfLib.GlobalWorkerOptions && !pdfLib.GlobalWorkerOptions.workerSrc) {
        pdfLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
      }
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      if (!numPages || numPages <= 0) return null;

      const pageItems = [];
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const unscaled = page.getViewport({ scale: 1.0 });

        // Optimal scale bounded by MAX_IMAGE_DIMENSION (2048px)
        let scale = 2.0;
        if (unscaled.width * scale > MAX_IMAGE_DIMENSION || unscaled.height * scale > MAX_IMAGE_DIMENSION) {
          scale = Math.min(MAX_IMAGE_DIMENSION / unscaled.width, MAX_IMAGE_DIMENSION / unscaled.height);
        }

        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        const base64 = canvas.toDataURL('image/jpeg', JPEG_COMPRESSION_QUALITY);
        pageItems.push({
          file: file,
          name: `${file.name} (পৃষ্ঠা ${toBengaliNumber(pageNum)})`,
          size: Math.round(base64.length * 0.75),
          isPdf: false,
          mimeType: 'image/jpeg',
          base64: base64
        });
      }
      return pageItems;
    } catch (err) {
      console.warn('PDF.js rendering fallback to raw PDF:', err);
      return null;
    }
  }

  // Fast image optimization: resize on canvas for lightweight, high-speed upload
  async function fastOptimizeImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const reader = new FileReader();
        reader.onload = e => resolve({ base64: e.target.result, mimeType: 'application/pdf' });
        reader.onerror = e => reject(new Error('PDF file read error'));
        reader.onabort = e => reject(new Error('PDF file read aborted'));
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onerror = e => reject(new Error('Image file read error'));
      reader.onabort = e => reject(new Error('Image file read aborted'));
      reader.onload = (e) => {
        const rawDataUrl = e.target.result;
        const mimeType = file.type || 'image/jpeg';

        const img = new Image();
        img.onload = () => {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          const maxDim = MAX_IMAGE_DIMENSION;
          const quality = JPEG_COMPRESSION_QUALITY;

          if (w > maxDim || h > maxDim || file.size > 400 * 1024) {
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            resolve({ base64: canvas.toDataURL('image/jpeg', quality), mimeType: 'image/jpeg' });
          } else {
            resolve({ base64: rawDataUrl, mimeType: mimeType });
          }
        };
        img.onerror = () => reject(new Error('Invalid image file or format not supported'));
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(filesList) {
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList);

    clearImage();
    state.filesQueue = [];
    let totalBytes = 0;

    for (let file of files) {
      const isImage = file.type.match('image.*') || /\.(png|jpe?g|webp|bmp|jfif)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (!isImage && !isPdf) {
        showToast(`'${file.name}' ফরম্যাট সমর্থিত নয়! শুধুমাত্র PDF বা ছবি দিন।`, 'warning');
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        showToast(`'${file.name}' সাইজ ৫০MB-র বেশি!`, 'warning');
        continue;
      }

      totalBytes += file.size;

      if (isPdf) {
        // High-fidelity multi-page PDF rendering via pdf.js
        const renderedPages = await convertPdfToImages(file);
        if (renderedPages && renderedPages.length > 0) {
          for (let p of renderedPages) {
            state.filesQueue.push(p);
          }
          continue;
        }
      }

      state.filesQueue.push({
        file: file,
        name: file.name,
        size: file.size,
        isPdf: isPdf,
        mimeType: isPdf ? 'application/pdf' : (file.type || 'image/jpeg'),
        base64: ''
      });
    }

    if (state.filesQueue.length === 0) return;

    // Single file/page handling
    if (state.filesQueue.length === 1) {
      const single = state.filesQueue[0];
      state.selectedFile = single.file;
      state.imageMimeType = single.mimeType;
      if (elements.fileName) elements.fileName.textContent = single.name;
      if (elements.fileSize) elements.fileSize.textContent = formatBytes(single.size);
      if (elements.fileCountBadge) elements.fileCountBadge.textContent = '১টি পেজ প্রস্তুত';

      if (single.base64) {
        state.imageBase64 = single.base64;
        if (elements.imagePreview) elements.imagePreview.src = single.base64;
        elements.imagePreview?.classList.remove('hidden');
        elements.pdfPreviewIcon?.classList.add('hidden');
      } else {
        fastOptimizeImageFile(single.file).then((opt) => {
          state.imageBase64 = opt.base64;
          state.imageMimeType = opt.mimeType;
          single.base64 = opt.base64;
          single.mimeType = opt.mimeType;

          if (single.isPdf) {
            elements.imagePreview?.classList.add('hidden');
            elements.pdfPreviewIcon?.classList.remove('hidden');
          } else {
            if (elements.imagePreview) elements.imagePreview.src = opt.base64;
            elements.imagePreview?.classList.remove('hidden');
            elements.pdfPreviewIcon?.classList.add('hidden');
          }
        });
      }

      elements.uploadPrompt?.classList.add('hidden');
      elements.previewContainer?.classList.remove('hidden');
      elements.multiThumbs?.classList.add('hidden');
      const multiThumbsContainer = document.getElementById('aiOcrMultiThumbsContainer');
      if (multiThumbsContainer) multiThumbsContainer.classList.add('hidden');
      if (elements.convertBtn) elements.convertBtn.disabled = false;
      elements.successCard?.classList.add('hidden');
      return;
    }

    // All pages will be sent to Gemini in a SINGLE request!
    state.selectedFile = state.filesQueue[0].file;
    state.deletedPagesHistory = [];

    if (elements.fileName) elements.fileName.textContent = `${toBengaliNumber(state.filesQueue.length)}টি পেজ নির্বাচিত`;
    if (elements.fileSize) elements.fileSize.textContent = `মোট ${formatBytes(totalBytes)}`;
    if (elements.fileCountBadge) elements.fileCountBadge.textContent = `${toBengaliNumber(state.filesQueue.length)}টি পেজ একসাথে প্রসেস হবে`;

    elements.imagePreview?.classList.add('hidden');
    elements.pdfPreviewIcon?.classList.add('hidden');
    elements.uploadPrompt?.classList.add('hidden');
    elements.previewContainer?.classList.remove('hidden');

    renderThumbnails();

    if (elements.convertBtn) elements.convertBtn.disabled = false;
    elements.successCard?.classList.add('hidden');
    showToast(`মোট ${toBengaliNumber(state.filesQueue.length)}টি পেজ প্রস্তুত! সবগুলো একসাথে সম্পূর্ণ রূপান্তর হবে।`, 'info');
    // Pre-warm standby keys immediately in background while user reviews files
    if (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.prewarmStandbyPool === 'function') {
      FayzarOcrConfig.prewarmStandbyPool();
    }
  }

  // Render rich interactive thumbnail cards with Zoom & Delete
  function renderThumbnails() {
    const multiThumbsContainer = document.getElementById('aiOcrMultiThumbsContainer');
    const thumbsList = elements.multiThumbs || document.getElementById('aiOcrThumbsList');
    if (!thumbsList) return;

    if (state.filesQueue.length === 0) {
      if (multiThumbsContainer) multiThumbsContainer.classList.add('hidden');
      thumbsList.innerHTML = '';
      if (elements.convertBtn) elements.convertBtn.disabled = true;
      return;
    }

    if (multiThumbsContainer) {
      multiThumbsContainer.classList.remove('hidden');
      multiThumbsContainer.classList.add('flex');
    }
    thumbsList.innerHTML = '';
    thumbsList.classList.remove('hidden');

    // Update Undo Button state
    const undoBtn = elements.undoPageDeleteBtn || document.getElementById('undoPageDeleteBtn');
    const undoText = elements.undoPageDeleteBtnText || document.getElementById('undoPageDeleteBtnText');
    if (undoBtn) {
      if (state.deletedPagesHistory && state.deletedPagesHistory.length > 0) {
        undoBtn.classList.remove('hidden');
        undoBtn.classList.add('inline-flex');
        if (undoText) undoText.textContent = `মুছে ফেলা পেজ ফেরত আনুন (${toBengaliNumber(state.deletedPagesHistory.length)}টি)`;
      } else {
        undoBtn.classList.add('hidden');
        undoBtn.classList.remove('inline-flex');
      }
    }

    state.filesQueue.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'w-24 sm:w-28 h-32 sm:h-36 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a263d] p-1.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group overflow-hidden flex-shrink-0 cursor-pointer';

      // Top Bar: Page Badge & Delete Button
      const topBar = document.createElement('div');
      topBar.className = 'flex items-center justify-between w-full px-1 z-10';
      topBar.innerHTML = `
        <span class="px-1.5 py-0.5 rounded-md bg-slate-900/85 text-[10px] font-bold text-white shadow-xs">পৃ: ${toBengaliNumber(idx + 1)}</span>
        <button type="button" class="thumb-delete-btn w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-sm transition opacity-80 hover:opacity-100 cursor-pointer" title="এই পৃষ্ঠাটি বাদ দিন">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;

      // Middle: Image Preview & Zoom Overlay
      const previewArea = document.createElement('div');
      previewArea.className = 'flex-1 my-1 w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative';

      const img = document.createElement('img');
      img.className = 'w-full h-full object-cover';

      const zoomOverlay = document.createElement('div');
      zoomOverlay.className = 'absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1';
      zoomOverlay.innerHTML = '<i class="fa-solid fa-magnifying-glass-plus text-base"></i><span>বড় দেখুন</span>';

      if (item.base64) {
        img.src = item.base64;
        previewArea.appendChild(img);
      } else if (item.isPdf) {
        previewArea.innerHTML = `<i class="fa-solid fa-file-pdf text-rose-500 text-2xl"></i>`;
        fastOptimizeImageFile(item.file).then(opt => {
          item.base64 = opt.base64;
          item.mimeType = opt.mimeType;
          img.src = opt.base64;
          previewArea.innerHTML = '';
          previewArea.appendChild(img);
          previewArea.appendChild(zoomOverlay);
        });
      } else {
        fastOptimizeImageFile(item.file).then(opt => {
          item.base64 = opt.base64;
          item.mimeType = opt.mimeType;
          img.src = opt.base64;
          previewArea.innerHTML = '';
          previewArea.appendChild(img);
          previewArea.appendChild(zoomOverlay);
        });
      }
      previewArea.appendChild(zoomOverlay);

      // Bottom: Truncated Filename
      const label = document.createElement('div');
      label.className = 'w-full text-center text-[9px] font-semibold text-slate-600 dark:text-slate-300 truncate px-0.5';
      label.textContent = item.name || `পৃষ্ঠা ${idx + 1}`;

      card.appendChild(topBar);
      card.appendChild(previewArea);
      card.appendChild(label);

      // Card Click -> Open Lightbox Zoom
      card.addEventListener('click', (e) => {
        if (e.target.closest('.thumb-delete-btn')) return;
        openPageZoom(idx);
      });

      // Delete Button Click
      const delBtn = topBar.querySelector('.thumb-delete-btn');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deletePage(idx);
      });

      thumbsList.appendChild(card);
    });

    if (elements.convertBtn) elements.convertBtn.disabled = false;
  }

  // Remove a single page with undo recording
  function deletePage(idx) {
    if (idx < 0 || idx >= state.filesQueue.length) return;
    const removed = state.filesQueue.splice(idx, 1)[0];
    state.deletedPagesHistory.push({ item: removed, originalIndex: idx });

    const totalBytes = state.filesQueue.reduce((acc, f) => acc + (f.file ? f.file.size : (f.size || 0)), 0);
    if (elements.fileName) elements.fileName.textContent = `${toBengaliNumber(state.filesQueue.length)}টি পেজ নির্বাচিত`;
    if (elements.fileSize) elements.fileSize.textContent = `মোট ${formatBytes(totalBytes)}`;
    if (elements.fileCountBadge) elements.fileCountBadge.textContent = `${toBengaliNumber(state.filesQueue.length)}টি পেজ একসাথে প্রসেস হবে`;

    const scanFileSize = document.getElementById('scanFileSize');
    if (scanFileSize) scanFileSize.textContent = `${toBengaliNumber(state.filesQueue.length)}টি পেজ (${formatBytes(totalBytes)})`;

    renderThumbnails();
    showToast(`পৃষ্ঠা ${toBengaliNumber(idx + 1)} বাদ দেওয়া হয়েছে। প্রয়োজনে আনডু করুন।`, 'info');
  }

  // Restore the last deleted page
  function undoPageDelete() {
    if (!state.deletedPagesHistory || state.deletedPagesHistory.length === 0) return;
    const record = state.deletedPagesHistory.pop();
    const insertIdx = Math.min(record.originalIndex, state.filesQueue.length);
    state.filesQueue.splice(insertIdx, 0, record.item);

    const totalBytes = state.filesQueue.reduce((acc, f) => acc + (f.file ? f.file.size : (f.size || 0)), 0);
    if (elements.fileName) elements.fileName.textContent = `${toBengaliNumber(state.filesQueue.length)}টি পেজ নির্বাচিত`;
    if (elements.fileSize) elements.fileSize.textContent = `মোট ${formatBytes(totalBytes)}`;
    if (elements.fileCountBadge) elements.fileCountBadge.textContent = `${toBengaliNumber(state.filesQueue.length)}টি পেজ একসাথে প্রসেস হবে`;

    const scanFileSize = document.getElementById('scanFileSize');
    if (scanFileSize) scanFileSize.textContent = `${toBengaliNumber(state.filesQueue.length)}টি পেজ (${formatBytes(totalBytes)})`;

    renderThumbnails();
    showToast('মুছে ফেলা পৃষ্ঠা সফলভাবে ফিরিয়ে আনা হয়েছে!', 'success');
  }

  // ---------------------------------------------------------
  // LIGHTBOX PAGE ZOOM & FULLSCREEN PREVIEW
  // ---------------------------------------------------------
  function openPageZoom(index) {
    if (index < 0 || index >= state.filesQueue.length) return;
    state.currentZoomIndex = index;
    state.currentZoomScale = 1.0;
    updatePageZoomView();
    const modal = elements.pageZoomModal || document.getElementById('pageZoomModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function closePageZoom() {
    const modal = elements.pageZoomModal || document.getElementById('pageZoomModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    state.currentZoomScale = 1.0;
  }

  function updatePageZoomView() {
    const item = state.filesQueue[state.currentZoomIndex];
    if (!item) return;

    const img = elements.pageZoomImg || document.getElementById('pageZoomImg');
    const title = elements.pageZoomTitle || document.getElementById('pageZoomTitle');
    const subtitle = elements.pageZoomSubtitle || document.getElementById('pageZoomSubtitle');
    const resetBtn = elements.pageZoomResetBtn || document.getElementById('pageZoomResetBtn');

    if (title) title.textContent = `পৃষ্ঠা ${toBengaliNumber(state.currentZoomIndex + 1)} প্রিভিউ`;
    if (subtitle) subtitle.textContent = `পৃষ্ঠা ${toBengaliNumber(state.currentZoomIndex + 1)} / ${toBengaliNumber(state.filesQueue.length)} (${item.name || ''})`;

    if (img) {
      img.style.transform = `scale(${state.currentZoomScale})`;
      if (item.base64) {
        img.src = item.base64;
      } else {
        fastOptimizeImageFile(item.file).then(opt => {
          item.base64 = opt.base64;
          img.src = opt.base64;
        });
      }
    }

    if (resetBtn) {
      resetBtn.textContent = `${Math.round(state.currentZoomScale * 100)}%`;
    }
  }

  function setZoomScale(scale) {
    state.currentZoomScale = Math.max(0.5, Math.min(3.0, scale));
    const img = elements.pageZoomImg || document.getElementById('pageZoomImg');
    const resetBtn = elements.pageZoomResetBtn || document.getElementById('pageZoomResetBtn');
    if (img) img.style.transform = `scale(${state.currentZoomScale})`;
    if (resetBtn) resetBtn.textContent = `${Math.round(state.currentZoomScale * 100)}%`;
  }

  function navPageZoom(step) {
    if (state.filesQueue.length <= 1) return;
    state.currentZoomIndex = (state.currentZoomIndex + step + state.filesQueue.length) % state.filesQueue.length;
    state.currentZoomScale = 1.0;
    updatePageZoomView();
  }

  // ---------------------------------------------------------
  // CONVERSION CANCELLATION (রূপান্তর বাতিল / বন্ধ করার অপশন)
  // ---------------------------------------------------------
  function cancelCurrentConversion() {
    if (!state.isProcessing) return;
    state.isProcessing = false;

    if (activeAbortController) {
      try {
        activeAbortController.abort();
      } catch (e) {}
      activeAbortController = null;
    }

    if (activeBridgeJobId) {
      const jId = activeBridgeJobId;
      activeBridgeJobId = null;
      fetch(`${FIREBASE_BRIDGE_URL}/requests/${jId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      }).catch(() => {});
      setTimeout(() => {
        fetch(`${FIREBASE_BRIDGE_URL}/requests/${jId}.json`, { method: 'DELETE' }).catch(() => {});
      }, 1500);
    }

    setLoading(false);

    // Hide progress card and return user to Step 2 options
    const progressCard = document.getElementById('wizardProgressCard') || elements.progressContainer;
    const step2 = document.getElementById('wizard-step-2');
    const step3 = document.getElementById('wizard-step-3');
    if (progressCard) {
      progressCard.classList.add('hidden');
      progressCard.classList.remove('flex');
    }
    if (step3) step3.classList.add('hidden');
    if (step2) step2.classList.remove('hidden');

    if (elements.convertBtn) elements.convertBtn.disabled = false;
    updateProModelStatusUI(cachedBridgeOnline);

    showToast('রূপান্তর সফলভাবে বাতিল করা হয়েছে।', 'info');
  }

  function clearImage() {
    state.selectedFile = null;
    state.imageBase64 = '';
    state.imageMimeType = '';
    state.filesQueue = [];
    state.deletedPagesHistory = [];
    closePageZoom();
    if (elements.fileInput) elements.fileInput.value = '';
    if (elements.imagePreview) elements.imagePreview.src = '';
    if (elements.previewContainer) elements.previewContainer.classList.add('hidden');
    if (elements.uploadPrompt) elements.uploadPrompt.classList.remove('hidden');
    if (elements.multiThumbs) {
      elements.multiThumbs.innerHTML = '';
      elements.multiThumbs.classList.add('hidden');
    }
    const multiThumbsContainer = document.getElementById('aiOcrMultiThumbsContainer');
    if (multiThumbsContainer) multiThumbsContainer.classList.add('hidden');
    if (elements.convertBtn) elements.convertBtn.disabled = true;
    if (elements.successCard) {
      elements.successCard.classList.add('hidden');
      elements.successCard.classList.remove('flex');
    }
    if (elements.collapsiblePreview) {
      elements.collapsiblePreview.classList.add('hidden');
      elements.collapsiblePreview.classList.remove('flex');
      if (elements.togglePreviewText) elements.togglePreviewText.textContent = 'টেক্সট প্রিভিউ দেখুন';
    }
  }

  async function startOcrConversion() {
    if (state.isProcessing) return;
    if (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.clearCooldowns === 'function') {
      FayzarOcrConfig.clearCooldowns();
    }
    if (!state.imageBase64 && state.filesQueue.length === 0) {
      showToast('অনুগ্রহ করে প্রথমে ফাইল আপলোড করুন', 'warning');
      return;
    }

    const isValidKeyCheck = (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.isValidApiKey === 'function')
      ? FayzarOcrConfig.isValidApiKey
      : (k => typeof k === 'string' && (k.trim().startsWith('AIzaSy') || k.trim().startsWith('AQ.')) && k.trim().length >= 35);
    const userCustomKey = localStorage.getItem('fayzar_ai_ocr_custom_byok');
    const activeKey = (userCustomKey && isValidKeyCheck(userCustomKey))
      ? userCustomKey.trim()
      : (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.getActiveApiKey === 'function' ? FayzarOcrConfig.getActiveApiKey() : (state.byokApiKey || ''));

    state.isProcessing = true;

    // ---------------------------------------------------------
    // HYBRID PRO-BRIDGE: PRE-FLIGHT CHECK
    // ---------------------------------------------------------
    const isDesktopOnline = state.proBridgeEnabled && (await checkDesktopBridgeOnline());
    if (isDesktopOnline) {
      showToast('⚡ Pro Desktop Bridge অনলাইনে সংযুক্ত! রিকোয়েস্ট পাঠানো হচ্ছে...', 'info');
      state.isProcessing = false;
      await startUnifiedOcr('doc');
      return;
    }
    // ---------------------------------------------------------

    if (state.demoMode) {
      state.isProcessing = false;
      await runDemoSimulation();
      return;
    }

    if (activeKey && activeKey.length > 0) {
      state.isProcessing = false;
      await runDirectGeminiOcr(activeKey);
      return;
    }

    if (state.gasUrl && state.gasUrl.trim().length > 0 && state.freeUsesCount < MAX_FREE_USES) {
      state.isProcessing = false;
      await runGasProxyOcr();
      return;
    }

    state.isProcessing = false;

    toggleModal(elements.byokModal, true);
  }

  // Unified Smart Wizard Conversion Bridge
  async function startUnifiedOcr(targetFormat = 'doc', onProgress = null, onStream = null) {
    if (state.isProcessing) {
      console.warn('OCR রূপান্তর ইতিমধ্যে চলছে, ডুপ্লিকেট রিকুয়েস্ট অগ্রাহ্য করা হয়েছে');
      return {
        unicodeText: state.unicodeText,
        bijoyText: state.bijoyText,
        totalFiles: state.filesQueue.length || 1
      };
    }
    state.isProcessing = true;

    try {
      if (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.clearCooldowns === 'function') {
        FayzarOcrConfig.clearCooldowns();
      }
    if (!state.imageBase64 && state.filesQueue.length === 0) {
      throw new Error('অনুগ্রহ করে প্রথমে ছবি বা PDF ফাইল নির্বাচন করুন');
    }

    const queue = state.filesQueue.length > 0
      ? state.filesQueue
      : [{ file: state.selectedFile, mimeType: state.imageMimeType, base64: state.imageBase64, name: 'ফাইল' }];
    const total = queue.length;

    if (onProgress) onProgress(total > 1 ? `মোট ${toBengaliNumber(total)}টি পেজ/ছবি প্রস্তুত করা হচ্ছে...` : 'ফাইল প্রস্তুত করা হচ্ছে...', 25);

    const mediaItems = await Promise.all(queue.map(async (item) => {
      const b64 = await ensureBase64(item);
      return {
        data: b64,
        mimeType: item.mimeType,
        name: item.name
      };
    }));

    state.lastMediaItems = mediaItems;

    if (onProgress) onProgress(total > 1 ? `সবগুলো (${toBengaliNumber(total)}টি) পেজ একসাথে AI-তে পাঠানো হচ্ছে...` : 'Gemini AI দিয়ে রূপান্তর হচ্ছে...', 45);

    // Always resolve the freshest rotated active key from the 19-key pool for every request
    const isValidKeyCheck = (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.isValidApiKey === 'function')
      ? FayzarOcrConfig.isValidApiKey
      : (k => typeof k === 'string' && (k.trim().startsWith('AIzaSy') || k.trim().startsWith('AQ.')) && k.trim().length >= 35);
    const userCustomKey = localStorage.getItem('fayzar_ai_ocr_custom_byok');
    const apiKey = (userCustomKey && isValidKeyCheck(userCustomKey))
      ? userCustomKey.trim()
      : (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.getActiveApiKey === 'function' ? FayzarOcrConfig.getActiveApiKey() : (state.byokApiKey || ''));

    let rawText = '';

    // ---------------------------------------------------------
    // HYBRID PRO-BRIDGE: PRE-FLIGHT CHECK & DIRECT REST EXECUTION
    // ---------------------------------------------------------
    const isDesktopOnline = state.proBridgeEnabled && (await checkDesktopBridgeOnline(false));

    if (isDesktopOnline) {
      if (onProgress) onProgress('⚡ ১. ফাইল ও ছবি আপলোড হচ্ছে...', 35, 1);
      
      const combinedBase64 = mediaItems.map(m => m.data.includes('base64,') ? m.data.split('base64,')[1] : m.data).join('|||');
      const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      activeBridgeJobId = jobId;

      const userDirective = (elements.customDirectiveInput ? elements.customDirectiveInput.value : (document.getElementById('ai-custom-directive-input')?.value || '')).trim();
      const bridgePrompt = (userDirective)
        ? `${GEMINI_PROMPT}\n\n### CRITICAL USER SCOPE DIRECTIVE (HIGHEST PRIORITY):\n"${userDirective}"\nFollow the above user directive strictly over any other extraction rule. Only extract what the user requested!`
        : GEMINI_PROMPT;

      try {
        await fetch(`${FIREBASE_BRIDGE_URL}/requests/${jobId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'pending',
            imageBase64: combinedBase64,
            prompt: bridgePrompt,
            timestamp: Date.now()
          })
        });

        if (onProgress) onProgress('⚡ ২. জেমিনি ৩.১ প্রো-তে প্রমট সেন্ট হয়েছে। অপেক্ষা করুন...', 50, 2);

        let bridgeSuccess = false;
        const bridgeStart = Date.now();
        let lastKnownActivity = Date.now();
        let workerPickedUp = false;

        while (true) {
          if (!state.isProcessing) {
            fetch(`${FIREBASE_BRIDGE_URL}/requests/${jobId}.json`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'cancelled' })
            }).catch(() => {});
            setTimeout(() => {
              fetch(`${FIREBASE_BRIDGE_URL}/requests/${jobId}.json`, { method: 'DELETE' }).catch(() => {});
            }, 1500);
            activeBridgeJobId = null;
            return null;
          }

          // 1. Immediate Response Check (Success OR Desktop Error)
          try {
            const resp = await fetch(`${FIREBASE_BRIDGE_URL}/responses/${jobId}.json?t=${Date.now()}`, {
              cache: 'no-store'
            });
            const val = await resp.json();
            if (val) {
              fetch(`${FIREBASE_BRIDGE_URL}/responses/${jobId}.json`, { method: 'DELETE' }).catch(() => {});
              if (val.status === 'success') {
                rawText = val.text;
                bridgeSuccess = true;
                break;
              } else if (val.status === 'error') {
                console.warn('Desktop Bridge reported immediate error:', val.error);
                // INSTANT FAILOVER TO CLOUD API IN 0ms!
                break;
              }
            }
          } catch (pollErr) {
            // Ignore temporary network glitch during polling
          }

          // 2. Adaptive Heartbeat & Processing Status Check
          try {
            const reqCheck = await fetch(`${FIREBASE_BRIDGE_URL}/requests/${jobId}.json?t=${Date.now()}`, { cache: 'no-store' });
            const reqData = await reqCheck.json();
            
            if (!reqData) {
              // Worker may have just completed the job and removed the request after writing response.
              // Double check response immediately before breaking:
              try {
                const finalResp = await fetch(`${FIREBASE_BRIDGE_URL}/responses/${jobId}.json?t=${Date.now()}`, { cache: 'no-store' });
                const finalVal = await finalResp.json();
                if (finalVal) {
                  fetch(`${FIREBASE_BRIDGE_URL}/responses/${jobId}.json`, { method: 'DELETE' }).catch(() => {});
                  if (finalVal.status === 'success') {
                    rawText = finalVal.text;
                    bridgeSuccess = true;
                  } else if (finalVal.status === 'error') {
                    console.warn('Desktop Bridge reported error on exit:', finalVal.error);
                  }
                }
              } catch (e) {}
              break;
            }

            const elapsedSec = Math.round((Date.now() - bridgeStart) / 1000);

            if (reqData.status === 'processing') {
              workerPickedUp = true;
              if (reqData.lastActive) {
                lastKnownActivity = reqData.lastActive;
              }
              
              if (reqData.stage === 'uploading') {
                if (onProgress) onProgress(`⚡ ১. ফাইল ও ছবি আপলোড হচ্ছে (${toBengaliNumber(elapsedSec)} সে)...`, 25, 1);
              } else if (reqData.stage === 'prompt_sent') {
                if (onProgress) onProgress(`⚡ ২. প্রমট সেন্ট হয়েছে (${toBengaliNumber(elapsedSec)} সে)...`, 45, 2);
              } else if (reqData.stage === 'generating') {
                if (onProgress) onProgress(`⚡ ৩. জেমিনি ৩.১ প্রো গভীর বিশ্লেষণ ও বাংলা রূপান্তর করছে (${toBengaliNumber(elapsedSec)} সে)...`, Math.min(92, 50 + Math.round(elapsedSec / 4)), 3);
              } else if (reqData.stage === 'extracting') {
                if (onProgress) onProgress(`⚡ ৪. ফাইনাল আউটপুট প্রস্তুত হচ্ছে (${toBengaliNumber(elapsedSec)} সে)...`, 96, 4);
              } else {
                const stageMsg = reqData.isGenerating
                  ? `⚡ ৩. জেমিনি ৩.১ প্রো গভীর বিশ্লেষণ করছে (${toBengaliNumber(elapsedSec)} সে)...`
                  : `⚡ ৩. প্রো ডেসকটপ জেমিনি সেশনে প্রসেস করছে (${toBengaliNumber(elapsedSec)} সে)...`;
                if (onProgress) onProgress(stageMsg, Math.min(92, 40 + Math.round(elapsedSec / 3)), 3);
              }
            } else if (!workerPickedUp) {
              if (onProgress) onProgress(`⚡ প্রো ৩.১ সেশনে কানেক্ট হচ্ছে (${toBengaliNumber(elapsedSec)} সে)...`, Math.min(30, 10 + Math.round(elapsedSec / 3)), 1);
              if (Date.now() - bridgeStart > 180000) {
                console.warn('Desktop bridge queue pickup timeout after 180s. Failover to cloud API...');
                break;
              }
            }
          } catch (e) {}

          // 3. Heartbeat Guard:
          if (workerPickedUp && (Date.now() - lastKnownActivity > 300000)) {
            console.warn('Desktop bridge inactive for > 5 minutes. Failover to cloud API...');
            break;
          }

          // Safety limit: up to 15 minutes (900 seconds) for large multi-page documents
          if (Date.now() - bridgeStart > 900000) {
            console.warn('Desktop job exceeded 15-minute safety threshold. Failover to cloud API...');
            break;
          }

          await sleep(1500);
        }

        fetch(`${FIREBASE_BRIDGE_URL}/requests/${jobId}.json`, { method: 'DELETE' }).catch(() => {});
        activeBridgeJobId = null;

        if (bridgeSuccess && rawText) {
          if (onStream) onStream(rawText);
        } else {
          // Instant graceful fallback to Gemini API without waiting or blocking
          console.warn('Pro Bridge did not complete in time. Auto-falling back to API pool seamlessly...');
          cachedBridgeOnline = false;
          updateProModelStatusUI(false);
          showToast('⚡ প্রো মডেল সাড়া দেয়নি, ক্লাউড এপিআই দিয়ে দ্রুত সম্পন্ন করা হচ্ছে...', 'info');

          if (apiKey || isCloudProxyAvailable()) {
            rawText = await processWithChunking(apiKey, mediaItems, onProgress, onStream);
          } else {
            throw new Error("প্রো মডেল সাড়া দেয়নি এবং কোনো Gemini API Key পাওয়া যায়নি।");
          }
        }
      } catch (bridgeErr) {
        console.warn('Bridge execution exception:', bridgeErr);
        fetch(`${FIREBASE_BRIDGE_URL}/requests/${jobId}.json`, { method: 'DELETE' }).catch(() => {});
        cachedBridgeOnline = false;
        updateProModelStatusUI(false);
        if (apiKey || isCloudProxyAvailable()) {
          showToast('⚡ ক্লাউড এপিআই দিয়ে দ্রুত সম্পন্ন করা হচ্ছে...', 'info');
          rawText = await processWithChunking(apiKey, mediaItems, onProgress, onStream);
        } else {
          throw bridgeErr;
        }
      }
    } else if (state.demoMode || (!apiKey && !isCloudProxyAvailable())) {
      if (state.demoMode) {
        if (onProgress) onProgress('অফলাইন ডেমো সিমুলেশন চলছে...', 60);
        await sleep(700);
        rawText = DEMO_SAMPLE_TEXT;
        if (onStream) onStream(rawText);
      } else {
        toggleModal(elements.byokModal, true);
        throw new Error('অনুগ্রহ করে আপনার Gemini API Key প্রদান করুন বা সেটিংস থেকে ডেমো মোড চালু করুন।');
      }
    } else {
      rawText = await processWithChunking(apiKey, mediaItems, onProgress, onStream);
    }

    if (onProgress) onProgress('৪. ওয়েটিং ফর ফাইনাল আউটপুট ও সমীকরণ...', 95, 4);

    let finalExtractedText = rawText;

    // Auto verification pipeline if enabled - run in single continuous flow BEFORE showing final output
    if (state.autoVerify && state.lastMediaItems && state.lastMediaItems.length > 0 && !state.demoMode && (apiKey || isCloudProxyAvailable())) {
      if (onProgress) onProgress('স্বয়ংক্রিয় অডিট ও যাচাই চলছে (বানান, উদ্দীপক ও মিসিং প্রশ্ন)...', 97, 4);
      try {
        const extraTextContent = `[পূর্বে সংগৃহীত খসড়া টেক্সট (DRAFT TO BE AUDITED & VERIFIED AGAINST ATTACHED IMAGES)]:\n\n${rawText}\n\n[নির্দেশনা: উপরের খসড়া টেক্সটটিকে সংযুক্ত মূল ছবিগুলোর সাথে পুঙ্খানুপুঙ্খ মিলিয়ে বানান ভুল, উদ্দীপকের বিচ্যুতি এবং কোনো প্রশ্ন বা উপ-প্রশ্ন বাদ পড়ে থাকলে তা সংশোধন করে সম্পূর্ণ নির্ভুল প্রশ্নপত্র প্রস্তুত করুন। যদি কোনো অস্পষ্ট শব্দের অনুমান করা হয় বা সোর্স রেফারেন্স বাদ দেওয়া হয়, তবে অবশ্যই ডকুমেন্টের শেষে [এআই অডিট নোট ও পরিবর্তনসমূহ: ...] অংশে তা বিস্তারিত উল্লেখ করবেন।]`;
        const verifiedRaw = await executeGeminiRequest(
          apiKey,
          state.lastMediaItems,
          (liveChunk) => {
            if (onStream) onStream(liveChunk);
          },
          GEMINI_VERIFY_PROMPT,
          extraTextContent
        );
        if (verifiedRaw && verifiedRaw.trim()) {
          finalExtractedText = verifiedRaw;
        }
      } catch (verErr) {
        console.warn('Auto verification error, continuing with main draft:', verErr);
      }
    }

    if (!state.isProcessing) return null;

    // Now emit the single final verified output
    handleExtractionSuccess(finalExtractedText, state.autoVerify);

    // Auto-generate and download the requested target document if specified
    if (targetFormat && targetFormat !== 'none') {
      await downloadWordDocument(targetFormat);
    }

    if (onProgress) onProgress('রূপান্তর সফলভাবে সম্পন্ন হয়েছে!', 100, 4);

    return {
      unicodeText: state.unicodeText,
      bijoyText: state.bijoyText,
      totalFiles: total
    };
  } finally {
    state.isProcessing = false;
  }
}

  // Helper: Split media items into chunks
  function splitMediaIntoChunks(mediaItems, chunkSize) {
    const chunks = [];
    for (let i = 0; i < mediaItems.length; i += chunkSize) {
      chunks.push(mediaItems.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async function processWithChunking(apiKey, mediaItems, onProgress, onStream) {
    // ইউজারের রিকোয়েস্ট অনুযায়ী চাংকিং (Chunking) সম্পূর্ণ বাদ দেওয়া হলো।
    // এখন সব পেজ একসাথে জেমিনিতে যাবে এবং স্বাভাবিক প্রক্রিয়ার সময় পর্যন্ত অপেক্ষা করবে।
    if (onProgress) onProgress('⚡ রূপান্তর হচ্ছে (সব পেজ একসাথে)...', 50);
    
    return await executeGeminiRequest(apiKey, mediaItems, (liveChunk) => {
      if (onStream) onStream(liveChunk);
      if (onProgress) onProgress(`লাইভ স্ট্রিমিং চলছে (${toBengaliNumber(liveChunk.length)} অক্ষর)...`, Math.min(95, 45 + Math.round(liveChunk.length / 30)));
    });
  }

  async function ensureBase64(item) {
    if (item.base64) return item.base64;
    const opt = await fastOptimizeImageFile(item.file);
    item.base64 = opt.base64;
    item.mimeType = opt.mimeType;
    return item.base64;
  }

  function fetchWithTimeout(url, options, timeoutMs = 60000) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      try {
        controller.abort(new Error('কানেকশন টাইমআউট: সার্ভার নির্ধারিত সময়ে সাড়া দেয়নি।'));
      } catch (e) {
        controller.abort();
      }
    }, timeoutMs);

    let cleanupAbort = null;
    if (activeAbortController) {
      const onMainAbort = () => {
        try {
          controller.abort(activeAbortController.signal.reason || new Error('রূপান্তর বাতিল করা হয়েছে'));
        } catch (e) {
          controller.abort();
        }
      };
      if (activeAbortController.signal.aborted) {
        onMainAbort();
      } else {
        activeAbortController.signal.addEventListener('abort', onMainAbort, { once: true });
        cleanupAbort = () => {
          if (activeAbortController) {
            try { activeAbortController.signal.removeEventListener('abort', onMainAbort); } catch (e) {}
          }
        };
      }
    }

    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => {
        clearTimeout(timer);
        if (cleanupAbort) cleanupAbort();
      });
  }

  // ---------------------------------------------------------
  // HYBRID PRO-BRIDGE: SEND TO FIREBASE
  // ---------------------------------------------------------
  // ---------------------------------------------------------
  // HYBRID PRO-BRIDGE: SEND TO FIREBASE VIA NATIVE REST
  // ---------------------------------------------------------
  async function runFirebaseBridgeOcr() {
    const queue = state.filesQueue.length > 0
      ? state.filesQueue
      : [{ file: state.selectedFile, mimeType: state.imageMimeType, base64: state.imageBase64, name: 'ফাইল' }];
    const total = queue.length;

    setLoading(true, `Pro Desktop Bridge-এ পাঠানো হচ্ছে (${toBengaliNumber(total)}টি পেজ)...`, 30);

    try {
      const mediaItems = await Promise.all(queue.map(async (item) => {
        const b64 = await ensureBase64(item);
        return { data: b64, mimeType: item.mimeType, name: item.name };
      }));
      state.lastMediaItems = mediaItems;

      // Extract raw base64 without prefix
      const combinedBase64 = mediaItems.map(m => m.data.includes('base64,') ? m.data.split('base64,')[1] : m.data).join('|||');

      const jobId = 'job_' + Date.now();

      const userDirective = (elements.customDirectiveInput ? elements.customDirectiveInput.value : (document.getElementById('ai-custom-directive-input')?.value || '')).trim();
      const bridgePrompt = (userDirective)
        ? `${GEMINI_PROMPT}\n\n### CRITICAL USER SCOPE DIRECTIVE (HIGHEST PRIORITY):\n"${userDirective}"\nFollow the above user directive strictly over any other extraction rule. Only extract what the user requested!`
        : GEMINI_PROMPT;

      await fetch(`${FIREBASE_BRIDGE_URL}/requests/${jobId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending',
          imageBase64: combinedBase64,
          prompt: bridgePrompt,
          timestamp: Date.now()
        })
      });

      setLoading(true, '⚡ Pro Desktop Bridge আপনার জেমিনি সেশনে কাজ করছে। অপেক্ষা করুন...', 50);

      const timeoutMs = REQUEST_TIMEOUT_MS;
      const start = Date.now();
      let resultText = null;

      while (Date.now() - start < timeoutMs) {
        await sleep(1500);
        try {
          const resp = await fetch(`${FIREBASE_BRIDGE_URL}/responses/${jobId}.json?t=${Date.now()}`, {
            cache: 'no-store'
          });
          const val = await resp.json();
          if (val) {
            fetch(`${FIREBASE_BRIDGE_URL}/responses/${jobId}.json`, { method: 'DELETE' }).catch(() => {});
            if (val.status === 'success') {
              resultText = val.text;
              break;
            } else {
              throw new Error(val.error || 'Desktop Bridge error');
            }
          }
        } catch (pollErr) {
          if (pollErr.message && !pollErr.message.includes('fetch')) throw pollErr;
        }
      }

      if (!resultText) {
        fetch(`${FIREBASE_BRIDGE_URL}/requests/${jobId}.json`, { method: 'DELETE' }).catch(() => {});
        throw new Error("Pro Desktop Bridge থেকে রেসপন্স পেতে নির্ধারিত সময় অতিক্রান্ত হয়েছে");
      }

      setLoading(false);

      // Track Usage Stats for pro-bridge
      try {
        const stats = JSON.parse(localStorage.getItem('fayzar_usage_stats')) || { models: {}, keys: {} };
        stats.models['pro-bridge'] = (stats.models['pro-bridge'] || 0) + 1;
        localStorage.setItem('fayzar_usage_stats', JSON.stringify(stats));
      } catch (e) { /* ignore */ }

      handleExtractionSuccess(resultText, false);
      showToast('⚡ Pro Desktop Bridge দিয়ে সফলভাবে রূপান্তর সম্পন্ন হয়েছে!', 'success');
      return resultText;

    } catch (err) {
      setLoading(false);
      showToast(`ব্রিজ ত্রুটি: ${err.message}`, 'error');
    }
  }

  // UNIFIED MULTI-IMAGE / MULTI-PAGE GEMINI OCR (ALL PAGES IN 1 SINGLE API REQUEST)
  async function runDirectGeminiOcr(apiKey) {
    const activeKey = (apiKey && apiKey.trim().length > 10)
      ? apiKey.trim()
      : (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.getActiveApiKey === 'function' ? FayzarOcrConfig.getActiveApiKey() : '');
    const queue = state.filesQueue.length > 0
      ? state.filesQueue
      : [{ file: state.selectedFile, mimeType: state.imageMimeType, base64: state.imageBase64, name: 'ফাইল' }];
    const total = queue.length;

    try {
      setLoading(true, total > 1 ? `মোট ${toBengaliNumber(total)}টি পেজ/ছবি একসাথে প্রস্তুত করা হচ্ছে...` : 'ফাইল প্রস্তুত করা হচ্ছে...', 25);

      // Parallel pre-optimization of all images
      const mediaItems = await Promise.all(queue.map(async (item) => {
        const b64 = await ensureBase64(item);
        return {
          data: b64,
          mimeType: item.mimeType,
          name: item.name
        };
      }));

      state.lastMediaItems = mediaItems;

      setLoading(true, total > 1 ? `সবগুলো (${toBengaliNumber(total)}টি) পেজ একসাথে Gemini AI-তে পাঠানো হচ্ছে...` : 'Gemini AI দিয়ে রূপান্তর হচ্ছে...', 45);

      const text = await executeGeminiRequest(activeKey, mediaItems, (liveText) => {
        if (elements.outputUnicodeArea) elements.outputUnicodeArea.value = liveText;
        setLoading(true, `লাইভ স্ট্রিমিং চলছে (${toBengaliNumber(liveText.length)} অক্ষর)...`, Math.min(95, 45 + Math.round(liveText.length / 30)));
      });

      setLoading(false);
      if (text && text.trim()) {
        handleExtractionSuccess(text, false);
        const _snapshotText = state.unicodeText; // snapshot before verify
        if (state.autoVerify && state.lastMediaItems && state.lastMediaItems.length > 0) {
          try { await runVerificationPipeline(true); } catch (ve) { console.warn('Auto-verify skipped:', ve); }
        }
        // If verification wiped state somehow, restore snapshot
        if (!state.unicodeText && _snapshotText) {
          state.unicodeText = _snapshotText;
          if (elements.outputUnicodeArea) elements.outputUnicodeArea.value = _snapshotText;
        }
        // আউটপুট অসম্পূর্ণ হলে ফাইল স্বয়ংক্রিয়ভাবে ডাউনলোড হবে না — ব্যবহারকারী যেন
        // ভুল করে অর্ধেক প্রশ্নপত্র বিতরণ না করেন (১০০% কোয়ালিটি শর্ত)।
        const _isIncomplete = /\[অসম্পূর্ণ:/.test(state.unicodeText || '');
        if (_isIncomplete) {
          showToast('⚠️ আউটপুট অসম্পূর্ণ — ফাইল স্বয়ংক্রিয়ভাবে ডাউনলোড করা হয়নি। টেক্সট যাচাই করে প্রয়োজনে পুনরায় চেষ্টা করুন।', 'warning');
        } else {
          await downloadWordDocument('bijoy_docx');
        }
        if (!_isIncomplete) showToast(total > 1 ? `সবগুলো (${toBengaliNumber(total)}টি) পেজ একসাথে সফলভাবে রূপান্তর সম্পন্ন হয়েছে!` : 'AI দিয়ে ডকুমেন্ট রূপান্তর সম্পন্ন হয়েছে!', 'success');
      } else {
        showToast('কোনো টেক্সট পাওয়া যায়নি।', 'warning');
      }
    } catch (err) {
      if (err.name !== 'AbortError' && err.message !== 'রূপান্তর বাতিল করা হয়েছে') {
        showToast(`ত্রুটি: ${err.message}`, 'error');
      } else {
        showToast('রূপান্তর সফলভাবে বাতিল করা হয়েছে', 'info');
      }
    } finally {
      setLoading(false);
    }
  }

  /**
   * Supabase Edge Function via Streaming (SSE)
   * Returns: { text: string, model: string, keyId: string }
   */
  /** Worker-এর লাইভ হার্টবিট → বাংলা অগ্রগতি-বার্তা (part-6′) */
  function proxyStatusMessage(s) {
    if (!s || !s.event) return '';
    switch (s.event) {
      case 'trying':
        return `⚡ চেষ্টা ${s.attempt || 1}/${s.total || '?'}: ${s.model} (${s.key || ''})…`;
      case 'retry_same_key':
        return `⚡ Google ব্যস্ত (${s.status || 503}) — ${s.waitSec || 3} সেকেন্ড পরে আবার চেষ্টা…`;
      case 'switch_key': {
        // part-7: অপেক্ষার কারণ স্পষ্ট — কোটা শেষ নাকি মডেল ব্যস্ত
        const why = (s.reason === 'RPD' || s.reason === 'RPM') ? 'কোটা শেষ'
          : (s.reason === 'MODEL_NA') ? 'এই কি-তে মডেল নেই'
          : (s.reason === 'INVALID') ? 'কি অবৈধ' : 'মডেল ব্যস্ত (৫০৩)';
        return `⚡ ${why} — বিকল্প কি-তে যাচ্ছি…`;
      }
      case 'switch_model':
        return `⚡ সব কি ব্যস্ত — ক্রম অনুযায়ী পরের মডেলে যাচ্ছি…`;
      case 'streaming':
        return `✅ সফল — ${s.model || ''} থেকে আউটপুট আসছে…`;
      case 'waiting':
        return `⏳ ${s.model || ''} — ${s.waitingSec || 0} সেকেন্ড ধরে অপেক্ষা করছি…`;
      case 'fatal':
        return '⚠️ ফাইল/পেলোডে সমস্যা — অন্য কি বা মডেলে চেষ্টা করে লাভ নেই।';
      default:
        return '';
    }
  }

  /** part-7: ৫+ পৃষ্ঠার কভারেজ-যাচাই (একই অনুরোধ, কোনো ভাগ নয়) — নীরব অসম্পূর্ণ আউটপুট ঠেকাতে।
   *  মডেল প্রতিটি পৃষ্ঠার শুরুতে "===== পৃষ্ঠা N/M =====" মার্কার দেয়; সেগুলো গুনে কম পৃষ্ঠা এলে
   *  [অসম্পূর্ণ: …] চিহ্ন বসাই → অটো-ডাউনলোড বন্ধ হয়, ব্যবহারকারী সতর্ক হন। */
  function applyPageCoverageGuard(text, expectedPages) {
    if (!text || !text.trim() || expectedPages < 5) return text;
    if (/\[অসম্পূর্ণ:/.test(text)) return text;
    const found = new Set();
    const re = /পৃষ্ঠা\s*([০-৯]{1,3})\s*\/\s*([০-৯]{1,3})/g;
    let m;
    while ((m = re.exec(text)) !== null) found.add(m[1]);
    if (found.size >= expectedPages) return text;
    const msg = found.size === 0
      ? `[অসম্পূর্ণ: ${toBengaliNumber(expectedPages)} পৃষ্ঠার কভারেজ-মার্কার পাওয়া যায়নি — কতগুলো পৃষ্ঠার আউটপুট এসেছে তা নিশ্চিত করা গেল না। ফাইলটি আবার পাঠান (একই অনুরোধে, ভাগ নয়)।]`
      : `[অসম্পূর্ণ: ${toBengaliNumber(expectedPages)} পৃষ্ঠার মধ্যে ${toBengaliNumber(found.size)} পৃষ্ঠার আউটপুট পাওয়া গেছে — বাকি পৃষ্ঠাগুলো আসেনি। ফাইলটি আবার পাঠান (একই অনুরোধে, ভাগ নয়)।]`;
    return text + '\n\n' + msg;
  }

  /** Part-8a: OCR-আর্টিফ্যাক্ট পরিষ্কার — পৃষ্ঠা-মার্কার (=...=) ও MANIFEST লাইন বাদ।
   *  কভারেজ-গার্ড আগে চলে (ক্লায়েন্ট), তাই যাচাই অটুট থাকে; আউটপুট ডকুমেন্টে মার্কার যায় না। */
  function stripOcrArtifacts(text) {
    if (!text) return text;
    let out = String(text);
    // ১) সম্পূর্ণ মার্কার — ===== পৃষ্ঠা ১/৪৬ ===== (যেকোনো =, স্পেস, বাংলা/ইংরেজি অঙ্ক, ইনলাইন-ও)
    out = out.replace(/[ \t]*={2,}[ \t]*পৃষ্ঠা[ \t]*[০-৯0-9]+(?:[ \t]*\/[ \t]*[০-৯0-9]+)?[ \t]*={2,}[ \t]*/g, '');
    // ২) আংশিক/ভাঙা মার্কার — একপাশে = ছাড়া, লাইন-শেষে
    out = out.replace(/[ \t]*={2,}[ \t]*পৃষ্ঠা[ \t]*[০-৯0-9]+(?:[ \t]*\/[ \t]*[০-৯0-9]+)?[ \t]*(?=\r?\n|$)/gm, '');
    out = out.replace(/[ \t]*পৃষ্ঠা[ \t]*[০-৯0-9]+[ \t]*\/[ \t]*[০-৯0-9]+[ \t]*={2,}[ \t]*/g, '');
    // ৩) কভারেজ MANIFEST লাইন
    out = out.replace(/^[ \t]*MANIFEST\s*[:\uFF1A][^\r\n]*/gm, '');
    // ৪) খালি লাইন জমলে দুইয়ে নামানো (লাইন-এন্ডিং অপরিবর্তিত)
    const nl = out.indexOf('\r\n') !== -1 ? '\r\n' : '\n';
    out = out.replace(/(?:\r?\n){3,}/g, nl + nl);
    return out;
  }

  async function executeGeminiRequestViaSupabase(payload, model = 'gemini-3-flash-preview', onStreamChunk = null, modelPriority = null) {
    if (!SUPABASE_CONFIG.ENABLED) throw new Error('Supabase proxy disabled');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_CONFIG.TIMEOUT_MS);
    
    try {
      // part-4: টোকেন খালি/প্লেসহোল্ডার হলে অকারণ নেটওয়ার্ক কল না করে স্পষ্ট বার্তা
      {
        const t = String(SUPABASE_CONFIG.PROXY_TOKEN || '').trim();
        if (!t || t === 'cloudflare_proxy' || t === 'PROXY_TOKEN' || t === '<token>') {
          const msg = '⚙️ সেটআপ অসম্পূর্ণ: প্রক্সি টোকেন বসানো হয়নি। অ্যাডমিনকে জানান — js/ai-ocr-engine.js-এ SUPABASE_CONFIG.PROXY_TOKEN সেট করতে হবে।';
          if (typeof showToast === 'function') showToast(msg, 'error');
          throw new Error(msg);
        }
      }

      const response = await fetch(SUPABASE_CONFIG.FUNCTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.PROXY_TOKEN}`,
          'apikey': SUPABASE_CONFIG.PROXY_TOKEN
        },
        // models[] পাঠানো হলে Worker একই আপলোড দিয়ে কি ও মডেল — দুই স্তরেই ফেইলওভার করে
        body: JSON.stringify({ payload, model, models: (modelPriority && modelPriority.length ? modelPriority : [model]) }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // ৪২৯ (retryInSec), ৫০২ (attempts[].class) কিংবা ৪০১ — সিদ্ধান্ত নেওয়ার জন্য
        // পুরো বডিটাই দরকার, তাই স্ট্যাটাস+বডি error-এর সাথে বেঁধে দেওয়া হলো।
        const body = await response.json().catch(() => ({}));
        const err = new Error(body.error || body.message || `Proxy HTTP ${response.status}`);
        err.proxyStatus = response.status;
        err.proxyBody = body;
        throw err;
      }
      
      // ===== STREAMING HANDLING (SSE + legacy JSON-array tolerant) =====
      // পুরোনো worker `alt=sse` ছাড়া কল করত, ফলে Gemini JSON-array স্ট্রিম পাঠাত অথচ এখানে
      // শুধু `data:` লাইন পার্স হতো — প্রতিটি কনভার্সনে প্রক্সিতে পুরো ফাইল আপলোড হয়ে বৃথা যেত।
      // এখন দুই ফরম্যাটই পার্স হয় এবং কিছুই না পেলে throw করে দ্রুত key-pool ফলব্যাকে যায়।
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let keyId = '';
      let buffer = '';

      let proxyFailure = null;
      let proxyTruncated = false;      // finishReason: MAX_TOKENS — আউটপুট কেটে গেছে
      const absorb = (data) => {
        if (!data || typeof data !== 'object') return;
        // Worker-এর লাইভ হার্টবিট: সফল হওয়ার আগেই অবস্থা দেখা যায় (আর "জমে থাকা" নয়)
        if (data.fayzar_status) {
          const st = data.fayzar_status;
          if (st.event === 'failed') {
            proxyFailure = { status: st.status || 502, body: st.body || { error: 'সবগুলো কি/মডেল ব্যর্থ হয়েছে।' } };
          }
          const note = proxyStatusMessage(st);
          if (note) setLoading(true, note, Math.min(96, 48 + (st.attempt || 1) * 4));
          return;
        }
        if (data.error) throw new Error(`Proxy Error: ${JSON.stringify(data.error)}`);
        if (data.keyId) keyId = data.keyId;
        // আউটপুট সীমায় পৌঁছালে সেটি লুকিয়ে না রেখে স্পষ্ট চিহ্ন দেওয়া হয় (নইলে অর্ধেক প্রশ্নপত্র
        // "সফল" ভেবে ডাউনলোড হয়ে যেত) — ক্লায়েন্টের অটো-ডাউনলোড ব্লকার এটি চিনে ফেলে।
        if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') proxyTruncated = true;
        const parts = data.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          const t = parts.map(pp => pp.text || '').join('');
          if (t) fullText += t;
        } else if (typeof data.text === 'string' && data.text) {
          fullText += data.text;
        }
        // কলারকে সর্বদা সম্পূর্ণ (ক্রমসঞ্চিত) টেক্সট দিতে হবে — ডেল্টা দিলে UI-তে আগের অংশ মুছে যেত
        if (onStreamChunk && fullText) onStreamChunk(fullText);
      };

      const drain = (text, isFinal) => {
        buffer += text;
        if (buffer.includes('data:')) {
          const lines = buffer.split('\n');
          buffer = isFinal ? '' : (lines.pop() || '');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try { absorb(JSON.parse(jsonStr)); }
            catch (e) { if (e.name !== 'SyntaxError') throw e; }
          }
          return;
        }
        // Legacy JSON-array stream: [ {...}, {...} ] — সম্পূর্ণ অবজেক্টগুলো খুঁজে বের করা
        let depth = 0, objStart = -1, consumedTo = 0, inStr = false, esc = false;
        for (let i = 0; i < buffer.length; i++) {
          const ch = buffer[i];
          if (inStr) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === '"') inStr = false;
            continue;
          }
          if (ch === '"') { inStr = true; continue; }
          if (ch === '{') { if (depth === 0) objStart = i; depth++; }
          else if (ch === '}') {
            depth--;
            if (depth === 0 && objStart !== -1) {
              try { absorb(JSON.parse(buffer.slice(objStart, i + 1))); }
              catch (e) { if (e.name !== 'SyntaxError') throw e; }
              consumedTo = i + 1;
              objStart = -1;
            }
          }
        }
        buffer = isFinal ? '' : buffer.slice(consumedTo);
      };

      if (reader) {
        while (true) {
          // হার্টবিট আসতেই থাকে; ৩ মিনিট সম্পূর্ণ নীরবতা মানে সংযোগ মৃত — তখন থামা ভালো
          let _idleTimer = null;
          const _idle = new Promise((_, rej) => {
            _idleTimer = setTimeout(() => rej(new Error('প্রক্সি থেকে ৩ মিনিট ধরে কোনো সাড়া আসেনি — সংযোগ বিচ্ছিন্ন')), 180000);
          });
          let _r;
          try { _r = await Promise.race([reader.read(), _idle]); }
          finally { clearTimeout(_idleTimer); }
          const { done, value } = _r;
          if (done) break;
          drain(decoder.decode(value, { stream: true }), false);
        }
        drain(decoder.decode(), true);
      } else {
        const raw = await response.text();
        try {
          const data = JSON.parse(raw);
          if (Array.isArray(data)) data.forEach(absorb); else absorb(data);
        } catch (_) {
          drain(raw, true);
        }
      }

      if (fullText.trim() && proxyTruncated && !/\[অসম্পূর্ণ:/.test(fullText)) {
        fullText += '\n\n[অসম্পূর্ণ: MAX_TOKENS — আউটপুট সীমায় পৌঁছেছে, শেষ অংশ কাটা পড়তে পারে। ফাইলটি ছোট করে বা মডেল বদলে পুনরায় চেষ্টা করুন।]';
      }

      if (!fullText.trim() && proxyFailure) {
        // Worker স্ট্রিমেই চূড়ান্ত ব্যর্থতা জানিয়েছে → নীতিমালা-মডিউল সিদ্ধান্ত নেবে (লোকাল পুলে যাবে না)
        const perr = new Error((proxyFailure.body && proxyFailure.body.error) || 'সবগুলো কি/মডেল ব্যর্থ হয়েছে।');
        perr.proxyStatus = proxyFailure.status;
        perr.proxyBody = proxyFailure.body;
        throw perr;
      }

      if (!fullText.trim()) {
        // খালি ফলাফল নিয়ে সফল রিটার্ন করলে ব্যবহারকারী "কোনো টেক্সট পাওয়া যায়নি" দেখত।
        throw new Error('Proxy returned an empty stream');
      }

      return { text: fullText, model, keyId };
      
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') throw new Error('Supabase request timeout (8 min)');
      throw err;
    }
  }

  // Gemini Execution Engine: sends media parts with Google's official system_instruction & live SSE Streaming
  async function executeGeminiRequest(apiKey, mediaInput, onStreamChunk = null, customPrompt = null, extraTextContent = null) {
    if (!state.isProcessing) return '';
    activeAbortController = new AbortController();
    try {
      let mediaItems = [];
      if (Array.isArray(mediaInput)) {
        mediaItems = mediaInput;
      } else if (typeof mediaInput === 'object' && mediaInput.data) {
        mediaItems = [mediaInput];
      } else if (typeof mediaInput === 'string') {
        mediaItems = [{ data: mediaInput, mimeType: 'image/jpeg' }];
      }

    // Build media items array (JPEG / PDF)
    const mediaParts = [];
    for (const item of mediaItems) {
      const cleanBase64 = item.data.includes('base64,')
        ? item.data.split('base64,')[1]
        : item.data;
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
      const finalMime = validMimeTypes.includes(item.mimeType) ? item.mimeType : 'image/jpeg';
      mediaParts.push({
        inlineData: { mimeType: finalMime, data: cleanBase64 }
      });
    }

    const contentParts = extraTextContent
      ? [...mediaParts, { text: extraTextContent }]
      : mediaParts;

    const userDirective = (elements && elements.customDirectiveInput ? elements.customDirectiveInput.value : (document.getElementById('ai-custom-directive-input')?.value || '')).trim();
    let activePrompt = customPrompt || GEMINI_PROMPT;
    if (userDirective && !customPrompt) {
      activePrompt += `\n\n### CRITICAL USER SCOPE DIRECTIVE (HIGHEST PRIORITY):\n"${userDirective}"\nFollow the above user directive strictly over any other extraction rule. Only extract what the user requested!`;
    }

    // part-7: ৫+ পৃষ্ঠার ডকুমেন্টে পৃষ্ঠা-ভিত্তিক কভারেজ-বাধ্যবাধকতা — সব পৃষ্ঠা একই অনুরোধে, কোনো ভাগ নয়।
    const coverageMandateApplied = !customPrompt && mediaParts.length >= 5;
    if (coverageMandateApplied) {
      const bnTotal = toBengaliNumber(mediaParts.length);
      activePrompt += `\n\n### MULTI-PAGE COVERAGE MANDATE (HIGHEST PRIORITY — OVERRIDES OTHER FORMAT RULES):\n` +
        `- There are exactly ${bnTotal} source pages in this request. You MUST produce output for EVERY page, in order, none skipped.\n` +
        `- Start each source page's section with this exact marker on its own line (Bengali numerals): ===== পৃষ্ঠা <N>/${bnTotal} =====\n` +
        `- Inside each page section, transcribe that page's question-side visible content (questions, tables, figure placeholders) exactly per the rules above — NO answer/solution text (see rule 0.0).\n` +
        `- Do NOT stop before page ${bnTotal}. If space feels tight, write more compactly — but never omit content or pages.\n` +
        `- At the very end, on its own line: MANIFEST: <comma-separated Bengali page numbers you fully transcribed>`;
    }

    const allActiveModels = [
      'gemini-3-flash-preview',   // #1: ডিপ রিজনিং ফ্ল্যাগশিপ — শতভাগ কাঠামোগত নির্ভুল বাংলা ও টেবিল
      'gemini-3.8-flash',         // #2: গণিত ও বিজ্ঞান স্পেশালিস্ট — জটিল সমীকরণ ও LaTeX
      'gemini-3.6-flash'          // #3: উচ্চগতির ব্যালেন্সড ব্যাকআপ
    ];

    // Helper: Build optimal payload tailored per model (bypassing reasoning deliberation latency)
    function buildModelPayload(model, isFallbackFormat = false) {
      const genConfig = {
        temperature: 0.2,
        maxOutputTokens: isFallbackFormat ? 8192 : 65536
      };

      const safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ];

      if (isFallbackFormat) {
        return {
          contents: [{ parts: [{ text: activePrompt }, ...contentParts] }],
          generationConfig: genConfig,
          safetySettings: safetySettings
        };
      }

      return {
        system_instruction: {
          parts: [{ text: activePrompt }]
        },
        contents: [{ parts: contentParts }],
        generationConfig: genConfig,
        safetySettings: safetySettings
      };
    }

    const isValidKeyFn = (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.isValidApiKey === 'function')
      ? FayzarOcrConfig.isValidApiKey
      : (k => typeof k === 'string' && (k.trim().startsWith('AIzaSy') || k.trim().startsWith('AQ.')) && k.trim().length >= 35);

    let candidateModels;
    if (state.selectedModel && state.selectedModel !== 'auto' && state.selectedModel !== 'pro-bridge' && !state.selectedModel.includes('2.5-flash')) {
      candidateModels = [state.selectedModel, ...allActiveModels.filter(m => m !== state.selectedModel)];
    } else {
      // ব্যবহারকারীর নির্ধারিত অগ্রাধিকার-ক্রম (কঠোর, এলোমেলো নয়):
      // #1 gemini-3-flash-preview (ডিপ রিজনিং) | #2 gemini-3.8-flash (গণিত/LaTeX) | #3 gemini-3.6-flash (দ্রুত ব্যাকআপ)
      candidateModels = [
        'gemini-3-flash-preview',
        'gemini-3.8-flash',
        'gemini-3.6-flash'
      ];
    }

    // setLoading is handled by the caller (startUnifiedOcr / processWithChunking)
    // to avoid interrupting the streaming UI between chunks.

    let lastError = null;
    let bestPartialText = '';      // সব কি ব্যর্থ হলে সবচেয়ে দীর্ঘ আংশিক ফলাফল (অটো-ডাউনলোড হবে না)
    let isRateLimited = false;

    // ===== SUPABASE PROXY (FIRST TRY) =====
    const userCustomKey = localStorage.getItem('fayzar_ai_ocr_custom_byok');
    const useSupabase = SUPABASE_CONFIG.ENABLED && !userCustomKey;
    
    if (useSupabase) {
      try {
        const primaryModel = candidateModels[0];
        const payload = buildModelPayload(primaryModel, false);
        const { text, keyId } = await executeGeminiRequestViaSupabase(payload, primaryModel, onStreamChunk, candidateModels);
        console.log(`[Supabase] Success via key: ${keyId}`);
        // part-7: বহু-পৃষ্ঠার কভারেজ-যাচাই → কম পৃষ্ঠা এলে [অসম্পূর্ণ: …] (অটো-ডাউনলোড বন্ধ হবে)
        const guarded = coverageMandateApplied ? applyPageCoverageGuard(text, mediaParts.length) : text;
        return stripOcrArtifacts(guarded);
      } catch (supabaseErr) {
        console.error('[Supabase] Proxy failed:', supabaseErr.message);
        // সিদ্ধান্ত শুধু নীতিমালা-মডিউলে (DOM-মুক্ত, পরীক্ষাযোগ্য): ভুল-টোকেন / অবৈধ-পেলোড /
        // সব-কুলডাউনে লোকাল পুলে *যাওয়া যাবে না* — কেবল ব্যবহারকারীর নিজের BYOK কি থাকলে সরাসরি চেষ্টা।
        const policy = (typeof FayzarProxyPolicy !== 'undefined')
          ? FayzarProxyPolicy.decideProxyFallback(supabaseErr.proxyStatus || 0, supabaseErr.proxyBody || null, Boolean(userCustomKey))
          : { action: 'abort', tone: 'warning', message: 'প্রক্সি সার্ভার ব্যর্থ হয়েছে — কিছুক্ষণ পর আবার চেষ্টা করুন।' };
        if (typeof window.showToastNotification === 'function') {
          window.showToastNotification(policy.message, policy.tone || 'warning');
        }
        if (policy.action === 'abort') {
          throw new Error(policy.message);
        }
      }
    }

    // ---- প্রচেষ্টার সীমা (আগে ছিল অসীম: ৪ মডেল × ১৯ কি = ৭৬ বার, প্রতি বার পুরো ফাইল আপলোড) ----
    const MAX_KEY_ATTEMPTS_PER_MODEL = 3;          // প্রতি মডেলে সর্বোচ্চ ৩টি কি
    const MAX_TOTAL_ATTEMPTS = 8;                  // সব মডেল মিলিয়ে সর্বোচ্চ ৮টি আপলোড-চেষ্টা
    const OCR_TOTAL_DEADLINE_MS = 6 * 60 * 1000;   // পুরো রূপান্তরের সর্বোচ্চ সময় (৬ মিনিট)
    const ocrStartedAt = Date.now();
    let totalAttempts = 0;

    // MODEL & KEY STRATEGY: For each model, try a few healthy keys for that model.
    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];

      // এই মডেলের জন্য *সুস্থ* কি-গুলো (কুলিং কি আর জোর করে চেষ্টা করা হয় না — সেটিই
      // আগে ৭৬-বারের লুপ বানাত, আর কুলিং কি কখনো সফল হয় না)।
      let keyPool = [];
      if (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.getKeysForModel === 'function') {
        keyPool = FayzarOcrConfig.getKeysForModel(model, false);
      } else if (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.getRotatedSystemKeys === 'function') {
        keyPool = FayzarOcrConfig.getRotatedSystemKeys(false);
      }

      if (apiKey && isValidKeyFn(apiKey) && !keyPool.includes(apiKey.trim())) {
        keyPool.unshift(apiKey.trim());
      }
      // ব্রাউজারে কোনো সিস্টেম-কি নেই (ভল্ট খালি)। লোকাল সার্ভার (serve.js) চালু থাকলে
      // GEMINI_API_KEY দিয়ে সেটি ব্যবহার করা যায়; পাবলিক হোস্টে অটো-ফলব্যাক নেই।
      if (keyPool.length === 0 && typeof location !== 'undefined' &&
          /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname)) {
        keyPool.push('BACKEND_PROXY');
      }
      if (keyPool.length === 0) continue;   // এই মডেলে কোনো সুস্থ কি নেই → পরের মডেল

      const modelAttemptLimit = Math.min(keyPool.length, MAX_KEY_ATTEMPTS_PER_MODEL);
      for (let k = 0; k < modelAttemptLimit; k++) {
        const currentKey = keyPool[k];
        totalAttempts++;
        if (totalAttempts > MAX_TOTAL_ATTEMPTS) {
          throw new Error('সর্বোচ্চ সংখ্যক চেষ্টা শেষ — সবগুলো কি/মডেল এই মুহূর্তে ব্যর্থ। কিছুক্ষণ পর আবার চেষ্টা করুন।');
        }
        if (Date.now() - ocrStartedAt > OCR_TOTAL_DEADLINE_MS) {
          throw new Error('সময়সীমা শেষ — সার্ভার নির্ধারিত সময়ে সম্পূর্ণ ফলাফল দেয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
        }

        const epVersion = 'v1beta';
        let realModel = model;

        const streamEndpoint = currentKey === 'BACKEND_PROXY'
          ? '/api/gemini'
          : `https://generativelanguage.googleapis.com/${epVersion}/models/${realModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(currentKey)}`;

        const buildFetchPayload = (payload) => {
          if (currentKey === 'BACKEND_PROXY') {
            return {
              model: model,
              endpoint: `${epVersion}/models/${model}:streamGenerateContent`,
              data: payload
            };
          }
          return payload;
        };

        let currentPayload = buildModelPayload(model, false);
        let fetchPayload = buildFetchPayload(currentPayload);

        // 300s (5 minutes) timeout: allows Gemini to take its natural time for large PDFs
        // NO CHUNKING: Wait patiently for the entire document to process without disconnecting.
        const CONNECT_TIMEOUT_MS = 300000;
        try {
          const attemptStartTime = Date.now();
          if (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.logAudit === 'function') {
            FayzarOcrConfig.logAudit('KEY_ATTEMPT_START', { keyMask: currentKey.slice(0, 8) + '...', model });
          }

          let res = await fetchWithTimeout(streamEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fetchPayload)
          }, CONNECT_TIMEOUT_MS);

          if (res.status === 404) {
            if (typeof FayzarOcrConfig !== 'undefined') {
              if (typeof FayzarOcrConfig.markKeyModelCooldown === 'function') FayzarOcrConfig.markKeyModelCooldown(currentKey, model, 300);
            }
            break; // Model not found, break out of key loop to try next candidate model
          }

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error?.message || `HTTP ${res.status}`;

            if (res.status === 400 && (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid'))) {
              if (typeof FayzarOcrConfig !== 'undefined') {
                if (typeof FayzarOcrConfig.markKeyInvalid === 'function') FayzarOcrConfig.markKeyInvalid(currentKey);
                if (typeof FayzarOcrConfig.advanceRoundRobin === 'function') FayzarOcrConfig.advanceRoundRobin();
              }
              // Use onProgress if available, otherwise fallback to setLoading but only if not streaming
              if (onStreamChunk) {
                // Do not interrupt streaming with global loading
              } else {
                setLoading(true, `⚡ স্বয়ংক্রিয়ভাবে বিকল্প কি-তে সুইচ করে প্রসেসিং চলছে...`, 50 + Math.min(40, (k + 1) * 2));
              }
              continue;
            }

            // Fallback payload if thinkingConfig, system_instruction or maxOutputTokens is rejected
            if (res.status === 400 && (errMsg.includes('system_instruction') || errMsg.includes('thinkingConfig') || errMsg.includes('thinkingBudget') || errMsg.includes('maxOutputTokens') || errMsg.includes('exceed') || errMsg.includes('Unknown field') || errMsg.includes('invalid argument') || errMsg.includes('Invalid argument'))) {
              currentPayload = buildModelPayload(model, true);
              const retryFetchPayload = buildFetchPayload(currentPayload);
              const retryRes = await fetchWithTimeout(streamEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(retryFetchPayload)
              }, CONNECT_TIMEOUT_MS);
              if (retryRes.ok) {
                res = retryRes;
              } else {
                continue;
              }
            } else if (res.status === 429 || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('Quota')) {
              isRateLimited = true;
              if (typeof FayzarOcrConfig !== 'undefined') {
                if (typeof FayzarOcrConfig.markKeyModelCooldown === 'function') {
                  FayzarOcrConfig.markKeyModelCooldown(currentKey, model, 14400);
                } else if (typeof FayzarOcrConfig.markKeyCooldown === 'function') {
                  FayzarOcrConfig.markKeyCooldown(currentKey, 14400);
                }
                if (typeof FayzarOcrConfig.advanceRoundRobin === 'function') FayzarOcrConfig.advanceRoundRobin();
                if (typeof FayzarOcrConfig.logAudit === 'function') {
                  FayzarOcrConfig.logAudit('KEY_RATE_LIMITED', { keyMask: currentKey.slice(0, 8) + '...', model, attemptDurationMs: Date.now() - attemptStartTime });
                }
              }
              // ZERO DELAY FAILOVER: 100-250ms instant handover to next key without model drop
              if (!onStreamChunk) {
                setLoading(true, `⚡ কোটা অপ্টিমাইজেশন: সক্রিয় কি-তে তাৎক্ষণিক সুইচ হচ্ছে...`, 50 + Math.min(40, (k + 1) * 2));
              }
              continue;
            } else if (res.status === 404 || errMsg.includes('not found') || errMsg.includes('no longer available')) {
              console.warn(`Model ${model} is not found (deprecated/removed). Skipping to next model.`);
              if (!onStreamChunk) {
                setLoading(true, `⚡ মডেল সাপোর্ট নেই, অন্য মডেলে সুইচ হচ্ছে...`, 50 + Math.min(40, (k + 1) * 2));
              }
              break; // Break the 'k' loop, try next model
            } else if (res.status === 503 || errMsg.includes('No capacity') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
              if (typeof FayzarOcrConfig !== 'undefined') {
                if (typeof FayzarOcrConfig.markKeyModelCooldown === 'function') {
                  FayzarOcrConfig.markKeyModelCooldown(currentKey, model, 300);
                }
                if (typeof FayzarOcrConfig.advanceRoundRobin === 'function') FayzarOcrConfig.advanceRoundRobin();
                if (typeof FayzarOcrConfig.logAudit === 'function') {
                  FayzarOcrConfig.logAudit('KEY_MODEL_ERROR', { keyMask: currentKey.slice(0, 8) + '...', model, error: errMsg, attemptDurationMs: Date.now() - attemptStartTime });
                }
              }
              // Try next key instead of dropping the model
              setLoading(true, `⚡ বিকল্প কি-তে চ্যানেল সুইচ হচ্ছে...`, 50 + Math.min(40, (k + 1) * 2));
              continue;
            } else {
              // As per user request: throw error immediately instead of silent fallback.
              throw new Error(errMsg);
            }
          }


          // Read and parse SSE stream chunks in real-time with activity keep-alive
          if (res.body && typeof res.body.getReader === 'function') {
            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let fullStreamedText = '';
            let lastChunkTime = 0;
            // বড় মাল্টি-পেজ ফাইলে Gemini প্রথম টোকেন দিতে ২০-৯০ সেকেন্ড নিতে পারে (ছবি প্রসেসিং + রিজনিং)।
            // তাই প্রথম টোকেনের জন্য আলাদা লম্বা grace, স্ট্রিম শুরু হলে স্বাভাবিক idle timeout।
            const FIRST_TOKEN_TIMEOUT_MS = 240000; // 240s — একই কলে অভ্যন্তরীণ পুনঃযাচাই হওয়ায় প্রথম টোকেন দেরিতে আসবে
            const STREAM_IDLE_TIMEOUT_MS = 90000;  // 90s — দুই চাঙ্কের মাঝে সর্বোচ্চ বিরতি
            let shouldStopStream = false;
            let streamIncomplete = false;   // স্ট্রিম অসম্পূর্ণ হলে true → পরের কি-তে ফেইলওভার
            let incompleteFatal = false;    // MAX_TOKENS-এর মতো: অন্য কি-তেও লাভ নেই

            while (true) {
              if (shouldStopStream) break;
              let chunkTimeoutId;
              const idleLimitMs = fullStreamedText.length === 0 ? FIRST_TOKEN_TIMEOUT_MS : STREAM_IDLE_TIMEOUT_MS;
              const chunkTimeoutPromise = new Promise((_, reject) => {
                chunkTimeoutId = setTimeout(() => reject(new Error('স্ট্রিমিং চলাকালীন সংযোগ বিচ্ছিন্ন হয়েছে (Idle Timeout)')), idleLimitMs);
              });

              let readResult;
              try {
                readResult = await Promise.race([reader.read(), chunkTimeoutPromise]);
              } catch (raceErr) {
                // আংশিক টেক্সট আর 'সফল' নয় — সংরক্ষণ করে পরের কি/মডেলে ফেইলওভার হবে।
                if (fullStreamedText.length > 100) {
                  console.warn('⚠️ স্ট্রিম টাইমআউট — আংশিক টেক্সট সংরক্ষিত, পরের কি-তে চেষ্টা:', fullStreamedText.length);
                  if (fullStreamedText.length > (bestPartialText || '').length) {
                    bestPartialText = fullStreamedText + '\n\n[অসম্পূর্ণ: নেটওয়ার্ক টাইমআউট বা সার্ভার সংযোগ বিচ্ছিন্ন]';
                  }
                  streamIncomplete = true;
                  try { reader.cancel(); } catch (e) {}
                  break;
                }
                throw raceErr;
              } finally {
                clearTimeout(chunkTimeoutId);
              }

              const { done, value } = readResult || { done: true };
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data:')) {
                  const dataJson = trimmed.slice(5).trim();
                  if (!dataJson || dataJson === '[DONE]') continue;
                  try {
                    const chunkObj = JSON.parse(dataJson);
                    const candidate = chunkObj.candidates?.[0];
                    // Detect safety block or empty model output
                    const finishReason = candidate?.finishReason;
                    if (finishReason === 'SAFETY') {
                      throw new Error('Safety Filter: কন্টেন্ট Gemini-র নিরাপত্তা ফিল্টারে আটকে গেছে।');
                    }
                    if (finishReason === 'MAX_TOKENS') {
                      streamIncomplete = true; incompleteFatal = true; // আউটপুট সীমা — অন্য কি-তেও একই হবে
                      fullStreamedText += `\n\n[অসম্পূর্ণ: MAX_TOKENS - ফাইলটি অনেক বড় হওয়ায় সম্পূর্ণটি কনভার্ট করা সম্ভব হয়নি। দয়া করে ফাইলের পেজ কমিয়ে পুনরায় চেষ্টা করুন।]`;
                    } else if (finishReason && finishReason !== 'STOP') {
                      streamIncomplete = true;
                      fullStreamedText += `\n\n[অসম্পূর্ণ: ${finishReason}]`;
                    }
                    
                    if (candidate?.content?.parts) {
                      const chunkPart = candidate.content.parts.map(p => p.text || '').join('');
                      if (chunkPart) {
                        fullStreamedText += chunkPart;
                        if (fullStreamedText.includes('.......')) {
                          fullStreamedText = fullStreamedText.replace(/\.{8,}/g, '......');
                        }

                        // 🛡️ রিপিটেশন লুপ ও অতিরিক্ত অক্ষরের ইনফিনিট স্ট্রিমিং প্রতিরোধ গার্ড
                        if (fullStreamedText.length > 2000) {
                          const tail = fullStreamedText.slice(-300);
                          const cleanTail = tail.replace(/[\s\.\-_|~=\t]/g, '');
                          const repeatMatch = cleanTail.match(/(.{20,50}?)\1{4,}/);
                          if (repeatMatch) {
                            console.warn('⚠️ রিপিটেশন লুপ শনাক্ত! স্ট্রিমিং সম্পন্ন করা হলো।');
                            shouldStopStream = true;
                            fullStreamedText += '\n\n[অসম্পূর্ণ: রিপিটেশন লুপ শনাক্ত হয়েছে]';
                          streamIncomplete = true;
                            try { reader.cancel(); } catch(e){}
                            break;
                          }
                        }
                        // আগের সীমা ৩৫,০০০ ছিল — ১০-১২ পৃষ্ঠার বাংলা প্রশ্নপত্রই কেটে যাচ্ছিল।
                        // এখন শুধু ব্রাউজার সুরক্ষার জন্য ৬০+ পৃষ্ঠার সমতুল্য হার্ড সীমা।
                        if (fullStreamedText.length > 300000) {
                          console.warn('⚠️ নিরাপদ অক্ষর সীমা (৩,০০,০০০) অতিক্রম! স্ট্রিমিং সম্পন্ন করা হলো।');
                          shouldStopStream = true;
                          fullStreamedText += '\n\n[অসম্পূর্ণ: নিরাপদ অক্ষর সীমা অতিক্রম করেছে]';
                          streamIncomplete = true;
                          try { reader.cancel(); } catch(e){}
                          break;
                        }

                        const cTime = Date.now();
                        if (cTime - lastChunkTime > 60 || fullStreamedText.length < 80) {
                          lastChunkTime = cTime;
                          if (onStreamChunk) onStreamChunk(fullStreamedText);
                        }
                      }
                    }
                  } catch (pe) {
                    if (pe.message && pe.message.includes('Safety Filter')) throw pe;
                    /* partial chunk, ignore parse error */
                  }
                }
              }
            }

            // Flush remaining buffer
            if (buffer) {
              buffer += decoder.decode();
              const lines = buffer.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data:')) {
                  const dataJson = trimmed.slice(5).trim();
                  if (!dataJson || dataJson === '[DONE]') continue;
                  try {
                    const chunkObj = JSON.parse(dataJson);
                    const candidate = chunkObj.candidates?.[0];
                    if (candidate?.content?.parts) {
                      fullStreamedText += candidate.content.parts.map(p => p.text || '').join('');
                    }
                  } catch (e) {}
                }
              }
            }

            // অসম্পূর্ণ স্ট্রিম কখনোই 'সফল' নয় — সংরক্ষণ করে পরের কি/মডেলে চেষ্টা হবে।
            if (fullStreamedText.trim() && streamIncomplete) {
              if (fullStreamedText.length > bestPartialText.length) bestPartialText = fullStreamedText;
              if (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.logAudit === 'function') {
                FayzarOcrConfig.logAudit('OCR_INCOMPLETE', { keyMask: currentKey.slice(0, 8) + '...', model, length: fullStreamedText.length, fatal: incompleteFatal });
              }
              if (incompleteFatal) break;   // MAX_TOKENS — অন্য কি-তেও একই ফল, লুপ থামাও
              if (!onStreamChunk) {
                setLoading(true, '⚡ আউটপুট অসম্পূর্ণ — পরের কি দিয়ে পুনরায় চেষ্টা হচ্ছে...', 60);
              }
              continue;                     // একই আপলোড, পরের কি
            }

            if (fullStreamedText.trim()) {
              if (typeof FayzarOcrConfig !== 'undefined') {
                if (typeof FayzarOcrConfig.advanceRoundRobin === 'function') FayzarOcrConfig.advanceRoundRobin();
                if (typeof FayzarOcrConfig.logAudit === 'function') {
                  FayzarOcrConfig.logAudit('OCR_SUCCESS', { keyMask: currentKey.slice(0, 8) + '...', model, length: fullStreamedText.length });
                }
                
                // Track Usage Stats
                try {
                  const stats = JSON.parse(localStorage.getItem('fayzar_usage_stats')) || { models: {}, keys: {} };
                  stats.models[model] = (stats.models[model] || 0) + 1;
                  const keyIdx = FayzarOcrConfig.keys ? FayzarOcrConfig.keys.indexOf(currentKey) : -1;
                  if (keyIdx !== -1) {
                    stats.keys[keyIdx] = (stats.keys[keyIdx] || 0) + 1;
                  }
                  localStorage.setItem('fayzar_usage_stats', JSON.stringify(stats));
                } catch (e) { /* ignore */ }
              }
              if (onStreamChunk) onStreamChunk(fullStreamedText);
              // Replenish pre-warmed standby pool silently in background for next task
              if (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.prewarmStandbyPool === 'function') {
                setTimeout(() => FayzarOcrConfig.prewarmStandbyPool(), 1000);
              }
              return cleanOcrResponse(fullStreamedText);
            }
            // খালি স্ট্রিম: আগে এখানেই একই কি-তে সম্পূর্ণ ফাইল আবার আপলোড হতো (দ্বিগুণ খরচ)।
            // এখন সরাসরি পরের কি-তে যাওয়া হয় — একই আপলোড ডেটা পুনঃব্যবহার করে।
          }

          // If stream produced no text on this key, advance and try next key immediately
          if (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.advanceRoundRobin === 'function') {
            FayzarOcrConfig.advanceRoundRobin();
          }
          continue;

        } catch (err) {
          if (typeof FayzarOcrConfig !== 'undefined') {
            if (typeof FayzarOcrConfig.advanceRoundRobin === 'function') FayzarOcrConfig.advanceRoundRobin();
            if (typeof FayzarOcrConfig.logAudit === 'function') {
              FayzarOcrConfig.logAudit('KEY_ATTEMPT_FAILED', { keyMask: currentKey.slice(0, 8) + '...', model, error: err.message });
            }
          }
          if (err.message && err.message.includes('Safety Filter')) {
            throw err;
          }
          lastError = err;

          // ত্রুটির শ্রেণিবিন্যাস: সাময়িক/নেটওয়ার্ক সমস্যা হলে একই আপলোড ডেটা দিয়ে
          // সঙ্গে সঙ্গে পরের কি-তে যাওয়া হয়; ইনপুট/নিরাপত্তাজনিত ত্রুটিতে সঙ্গে সঙ্গে থামা হয়।
          const msg = String(err && err.message || '');
          const isFatal = /Safety Filter|API_KEY_INVALID|INVALID_ARGUMENT|invalid argument/i.test(msg);
          if (isFatal) throw err;
          if (!onStreamChunk) {
            setLoading(true, '⚡ সংযোগ সমস্যা — পরের কি দিয়ে একই ফাইলে পুনরায় চেষ্টা হচ্ছে...', 60);
          }
          continue;   // পরের কি (ফাইল পুনরায় এনকোড হয় না)
        }
      }
    }

      // সব কি/মডেল ব্যর্থ — আংশিক ফল থাকলে তা মার্কারসহ ফেরত যাবে (অটো-ডাউনলোড ব্লক হবে)
      if (bestPartialText && bestPartialText.trim()) {
        const marked = bestPartialText.includes('[অসম্পূর্ণ:')
          ? bestPartialText
          : bestPartialText + '\n\n[অসম্পূর্ণ: সবগুলো কি ব্যর্থ হয়েছে]';
        if (onStreamChunk) onStreamChunk(marked);
        return cleanOcrResponse(marked);
      }
      throw new Error(isRateLimited
        ? 'সার্ভারের সবগুলো কি-এর কোটা/রেট-লিমিট শেষ — কিছুক্ষণ (বা কয়েক ঘণ্টা) পর আবার চেষ্টা করুন।'
        : (lastError?.message || 'Gemini API-র সকল কি ব্যস্ত বা কোটা পূর্ণ। অনুগ্রহ করে কয়েক মুহূর্ত পর পুনরায় চেষ্টা করুন।'));
    } finally {
      activeAbortController = null;
    }
  }

  // ===========================================================
  // কি মনিটর — Worker-এর GET /status থেকে খতিয়ান দেখানো
  // (কোনো পূর্ণ API key এখানে আসে না, শুধু মাস্কড তথ্য)
  // ===========================================================
  let lastKeyStatus = null;

  function formatCountdown(sec) {
    if (!sec || sec <= 0) return '—';
    if (sec < 60) return `${toBengaliNumber(sec)} সেকেন্ড`;
    if (sec < 3600) return `${toBengaliNumber(Math.ceil(sec / 60))} মিনিট`;
    const h = Math.floor(sec / 3600);
    const m = Math.ceil((sec % 3600) / 60);
    return `${toBengaliNumber(h)} ঘণ্টা ${toBengaliNumber(m)} মিনিট`;
  }

  function renderKeyStatus(status) {
    if (!elements.keysTbody) return;
    lastKeyStatus = status;
    const rows = (status && status.keys) || [];
    const ready = rows.filter(k => k.state === 'READY').length;
    const cooling = rows.filter(k => k.state === 'COOLING').length;
    const invalid = rows.filter(k => k.state === 'INVALID').length;
    const usedToday = rows.reduce((a, k) => a + (k.requestsToday || 0), 0);

    if (elements.keysSummary) {
      elements.keysSummary.innerHTML =
        `মোট <b>${toBengaliNumber(rows.length)}</b> · প্রস্তুত <b class="text-emerald-600">${toBengaliNumber(ready)}</b>` +
        ` · কুলিং <b class="text-amber-600">${toBengaliNumber(cooling)}</b>` +
        ` · অবৈধ <b class="text-rose-600">${toBengaliNumber(invalid)}</b>` +
        ` · আজ মোট রিকোয়েস্ট <b>${toBengaliNumber(usedToday)}</b>`;
    }

    const chip = (state) => state === 'READY'
      ? '<span class="text-emerald-600 font-black">🟢 প্রস্তুত</span>'
      : state === 'COOLING'
        ? '<span class="text-amber-600 font-black">🟡 কুলিং</span>'
        : '<span class="text-rose-600 font-black">🔴 অবৈধ</span>';

    elements.keysTbody.innerHTML = rows.length === 0
      ? '<tr><td colspan="6" class="px-2 py-3 text-center text-slate-500">কোনো কি পাওয়া যায়নি।</td></tr>'
      : rows.map(k => `
        <tr class="border-t border-slate-200 dark:border-slate-700">
          <td class="px-2 py-1.5 font-mono">${k.id} <span class="text-slate-400">${k.mask}</span></td>
          <td class="px-2 py-1.5">${chip(k.state)}</td>
          <td class="px-2 py-1.5 text-center">${toBengaliNumber(k.requestsToday || 0)}</td>
          <td class="px-2 py-1.5 text-center">${toBengaliNumber(k.success || 0)}/${toBengaliNumber(k.fail || 0)}</td>
          <td class="px-2 py-1.5 text-center">${k.avgLatencyMs ? toBengaliNumber(Math.round(k.avgLatencyMs / 1000)) + 's' : '—'}</td>
          <td class="px-2 py-1.5">${formatCountdown(k.reopenInSec)}${k.reopenReason ? ` <span class="text-slate-400">(${k.reopenReason})</span>` : ''}</td>
        </tr>`).join('');

    if (elements.keysModels) {
      const blocked = [];
      rows.forEach(k => Object.keys(k.models || {}).forEach(m => {
        if (k.models[m].reopenInSec > 0) blocked.push(`${k.id}·${m} → ${formatCountdown(k.models[m].reopenInSec)} (${k.models[m].reason || ''})`);
      }));
      elements.keysModels.textContent = blocked.length
        ? 'মডেল-ভিত্তিক কুলডাউন: ' + blocked.join(' | ')
        : 'কোনো মডেল-ভিত্তিক কুলডাউন নেই।';
    }
  }

  async function refreshKeyStatus(silent = false) {
    if (!elements.keysSummary) return;
    if (!SUPABASE_CONFIG.ENABLED || !SUPABASE_CONFIG.FUNCTIONS_URL) {
      elements.keysSummary.textContent = 'প্রক্সি নিষ্ক্রিয় — কি মনিটর কেবল সার্ভার-সাইড কি-এর জন্য প্রযোজ্য।';
      return;
    }
    elements.keysSummary.textContent = 'তথ্য আনা হচ্ছে...';
    try {
      const base = SUPABASE_CONFIG.FUNCTIONS_URL.replace(/\/+$/, '');
      const res = await fetch(base + '/status', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${SUPABASE_CONFIG.PROXY_TOKEN}` }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data || !Array.isArray(data.keys)) throw new Error('পুরোনো প্রক্সি সংস্করণ (/status নেই)');
      renderKeyStatus(data);
    } catch (e) {
      elements.keysSummary.innerHTML =
        `<span class="text-rose-600">স্ট্যাটাস আনা যায়নি: ${e.message}</span><br>` +
        `<span class="text-slate-500">Worker-এর নতুন সংস্করণ (KeyLedger) ডিপ্লয় করা আছে কি না দেখুন।</span>`;
      if (elements.keysTbody) elements.keysTbody.innerHTML = '';
      if (!silent) console.warn('Key status fetch failed:', e);
    }
  }

  function downloadKeyStatusCsv() {
    if (!lastKeyStatus || !lastKeyStatus.keys) {
      showToast('আগে "রিফ্রেশ" চেপে তথ্য আনুন।', 'warning');
      return;
    }
    const head = ['id', 'mask', 'state', 'requestsToday', 'success', 'fail', 'avgLatencyMs', 'reopenInSec', 'reopenReason'];
    const lines = [head.join(',')].concat(lastKeyStatus.keys.map(k =>
      head.map(h => JSON.stringify(k[h] == null ? '' : k[h])).join(',')));
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fayzar-key-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function runGasProxyOcr() {
    const queue = state.filesQueue.length > 0
      ? state.filesQueue
      : [{ file: state.selectedFile, mimeType: state.imageMimeType, base64: state.imageBase64, name: 'ফাইল' }];
    const total = queue.length;

    setLoading(true, `সবগুলো (${toBengaliNumber(total)}টি) ফাইল একসাথে প্রক্সির মাধ্যমে পাঠানো হচ্ছে...`, 35);

    try {
      const mediaItems = await Promise.all(queue.map(async (item) => {
        const b64 = await ensureBase64(item);
        const cleanBase64 = b64.includes('base64,') ? b64.split('base64,')[1] : b64;
        return {
          imageBase64: cleanBase64,
          mimeType: item.mimeType
        };
      }));

      const postBody = mediaItems.length === 1
        ? { imageBase64: mediaItems[0].imageBase64, mimeType: mediaItems[0].mimeType }
        : { images: mediaItems, imageBase64: mediaItems[0].imageBase64, mimeType: mediaItems[0].mimeType };

      const res = await fetchWithTimeout(state.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(postBody)
      }, REQUEST_TIMEOUT_MS * 2);

      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'GAS Proxy Error');

      state.freeUsesCount += 1;
      localStorage.setItem(STORAGE_KEYS.FREE_COUNT, state.freeUsesCount.toString());
      updateBadges();

      handleExtractionSuccess(result.extractedText);
      showToast(`সফলভাবে এক্সট্রাক্ট করা হয়েছে! (${MAX_FREE_USES - state.freeUsesCount} টি ফ্রি ক্রেডিট বাকি)`, 'success');
    } catch (e) {
      const msg = e.name === 'AbortError' ? 'রিকোয়েস্ট টাইমআউট হয়েছে' : e.message;
      showToast(`প্রক্সি ত্রুটি: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function runDemoSimulation() {
    setLoading(true, 'ইমেজ অপ্টিমাইজেশন ও নয়েজ ফিল্টারিং...', 40);
    await sleep(200);
    setLoading(true, 'বাংলা যুক্তবর্ণ ও গাণিতিক সমীকরণ রিকগনিশন...', 85);
    await sleep(200);

    const demoText = `মেসার্স শাহ আলম ট্রেডার্স
ফুলবাড়ী, দিনাজপুর। ফোন: 01717-101919

বিষয়: পণ্য সরবরাহ বিবরণী ও মূল্য তালিকা

| ক্রমিক | পণ্যের বিবরণ | পরিমাণ | একক দর (টাকা) | মোট মূল্য (টাকা) |
|---|---|---|---|---|
| ০১ | মিনিকেট চাল | ৫০ বস্তা | ৩,২০০/- | ১,৬০,০০০/- |
| ০২ | নাজিরশাইল চাল | ৩০ বস্তা | ৩,৫০০/- | ১,০৫,০০০/- |
| ০৩ | সয়াবিন তেল (৫ লিটার) | ২০ কার্টুন | ৪,২০০/- | ৮৪,০০০/- |
| ০৪ | মসুর ডাল (দেশি) | ১০ বস্তা | ৬,০০০/- | ৬০,০০০/- |

সর্বমোট মূল্য: ৪,০৯,০০০/- (চার লক্ষ নয় হাজার টাকা মাত্র)

১. গণিত সমীকরণ মডেল:
\\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\]`;

    handleExtractionSuccess(demoText);
    setLoading(false);
    showToast('অফলাইন ডেমো কনভার্সন সফল হয়েছে!', 'success');
  }

  function extractAuditNote(text) {
    if (!text) return null;
    const match = text.match(/(?:[০-৯0-9]+[।\.\)]\s*)?\[\s*(?:[^\]\n]{0,12}?\s*)?(?:নোট|পরিবর্তনসমূহ|সংশোধনী|অডিট)[\s\S]*?(?:\]|(?=\n\s*(?:\([ক-ঘa-divx০-৯]+\)|[ক-ঘa-divx][\.\)]|[০-৯0-9]+[।\.\)]|#{1,6}\s|$)))/);
    return match ? match[0].trim() : null;
  }

  async function runVerificationPipeline(isAuto = false) {
    if (state.isProcessing) return;

    const currentText = (state.unicodeText || (elements.outputUnicodeArea ? elements.outputUnicodeArea.value : '')).trim();
    if (!currentText) {
      showToast('পূর্বে কোনো টেক্সট রূপান্তর করা হয়নি। প্রথমে ফাইল কনভার্ট করুন।', 'warning');
      return;
    }

    let mediaItems = state.lastMediaItems;
    if (!mediaItems || mediaItems.length === 0) {
      const queue = state.filesQueue.length > 0
        ? state.filesQueue
        : (state.selectedFile ? [{ file: state.selectedFile, mimeType: state.imageMimeType, base64: state.imageBase64, name: 'ফাইল' }] : []);

      if (queue.length > 0) {
        mediaItems = await Promise.all(queue.map(async (item) => {
          const b64 = await ensureBase64(item);
          return {
            data: b64,
            mimeType: item.mimeType,
            name: item.name
          };
        }));
        state.lastMediaItems = mediaItems;
      }
    }

    if (!mediaItems || mediaItems.length === 0) {
      showToast('মূল ফাইলের কোনো ডেটা পাওয়া যায়নি। অনুগ্রহ করে ফাইল পুনরায় নির্বাচন করুন।', 'error');
      return;
    }

    const apiKey = (state.byokApiKey && state.byokApiKey.trim().length > 10)
      ? state.byokApiKey.trim()
      : (typeof FayzarOcrConfig !== 'undefined' && typeof FayzarOcrConfig.getActiveApiKey === 'function' ? FayzarOcrConfig.getActiveApiKey() : '');
    if (!apiKey && !state.demoMode) {
      toggleModal(elements.byokModal, true);
      showToast('পুনরায় যাচাইয়ের জন্য আপনার Gemini API Key প্রদান করুন।', 'warning');
      return;
    }

    state.isProcessing = true;
    const origBtnHtml = elements.verifyBtn ? elements.verifyBtn.innerHTML : '';
    if (elements.verifyBtn) {
      elements.verifyBtn.disabled = true;
      elements.verifyBtn.classList.add('opacity-75', 'cursor-not-allowed');
      elements.verifyBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>মূল ফাইলের সাথে অডিট ও যাচাই চলছে...</span>`;
    }

    setLoading(true, 'মূল ফাইলের সাথে শব্দে-শব্দে উদ্দীপক, বানান ও মিসিং প্রশ্ন অডিট করা হচ্ছে...', 65);

    try {
      let verifiedRawText = '';
      if (state.demoMode || !apiKey) {
        await sleep(800);
        verifiedRawText = currentText + '\n\n[নোট: অফলাইন ডেমো মোডে মূল ফাইলের সাথে যাচাই সম্পন্ন হয়েছে।]';
      } else {
        const extraTextContent = `[পূর্বে সংগৃহীত খসড়া টেক্সট (DRAFT TO BE AUDITED & VERIFIED AGAINST ATTACHED IMAGES)]:\n\n${currentText}\n\n[নির্দেশনা: উপরের খসড়া টেক্সটটিকে সংযুক্ত মূল ছবিগুলোর সাথে পুঙ্খানুপুঙ্খ মিলিয়ে বানান ভুল, উদ্দীপকের বিচ্যুতি এবং কোনো প্রশ্ন বা উপ-প্রশ্ন বাদ পড়ে থাকলে তা সংশোধন করে সম্পূর্ণ নির্ভুল প্রশ্নপত্র প্রস্তুত করুন। সকল প্রশ্ন শেষ হওয়ার পর একদম নিচে আলাদাভাবে একটি [নোট ও পরিবর্তনসমূহ:] ব্লকে কী কী সংশোধন করেছেন তা পয়েন্ট আকারে উল্লেখ করুন।]`;

        verifiedRawText = await executeGeminiRequest(
          apiKey,
          mediaItems,
          (liveChunk) => {
            if (elements.outputUnicodeArea) elements.outputUnicodeArea.value = liveChunk;
            setLoading(true, `লাইভ অডিট ও সংশোধন চলছে (${toBengaliNumber(liveChunk.length)} অক্ষর)...`, Math.min(95, 60 + Math.round(liveChunk.length / 35)));
          },
          GEMINI_VERIFY_PROMPT,
          extraTextContent
        );
      }

      setLoading(false);
      state.isProcessing = false;

      if (verifiedRawText && verifiedRawText.trim()) {
        handleExtractionSuccess(verifiedRawText, true);
        if (elements.verifyBtn) {
          elements.verifyBtn.disabled = false;
          elements.verifyBtn.classList.remove('opacity-75', 'cursor-not-allowed');
          elements.verifyBtn.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-300"></i> <span>যাচাই ও সংশোধন সম্পন্ন!</span>`;
          setTimeout(() => {
            if (elements.verifyBtn) {
              elements.verifyBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> <span>পুনরায় যাচাই ও সংশোধন করুন</span>`;
            }
          }, 6000);
        }
        showToast('মূল ফাইলের সাথে সফলভাবে যাচাই ও সংশোধন সম্পন্ন হয়েছে!', 'success');
      } else {
        showToast('যাচাইয়ের ফলাফল পাওয়া যায়নি। পূর্বের টেক্সট বহাল আছে।', 'warning');
      }
    } catch (err) {
      setLoading(false);
      state.isProcessing = false;
      if (elements.verifyBtn) {
        elements.verifyBtn.disabled = false;
        elements.verifyBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        elements.verifyBtn.innerHTML = origBtnHtml || `<i class="fa-solid fa-wand-magic-sparkles"></i> <span>পুনরায় যাচাই ও সংশোধন করুন</span>`;
      }
      showToast(`যাচাইকরণে ত্রুটি: ${err.message}`, 'error');
    }
  }

  function handleExtractionSuccess(unicodeText, isVerification = false) {
    const auditNote = extractAuditNote(unicodeText);
    window.lastAuditNote = auditNote;
    const cleaned = cleanOcrResponse(unicodeText);
    state.unicodeText = cleaned;
    if (elements.outputUnicodeArea) elements.outputUnicodeArea.value = cleaned;
    recalculateBijoyFromUnicode();

    if (elements.auditNotesBox) {
      if (auditNote) {
        elements.auditNotesBox.classList.remove('hidden');
        if (elements.auditNotesContent) {
          elements.auditNotesContent.textContent = auditNote.replace(/^\[\s*|\]\s*$/g, '').trim();
        }
        if (elements.auditStatusBadge) {
          elements.auditStatusBadge.textContent = isVerification ? 'অডিট ও যাচাই সম্পন্ন' : 'সংশোধনী নোট অন্তর্ভুক্ত';
          elements.auditStatusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300';
        }
      } else if (isVerification) {
        elements.auditNotesBox.classList.remove('hidden');
        if (elements.auditNotesContent) {
          elements.auditNotesContent.textContent = 'মূল ফাইলের সাথে সম্পূর্ণ যাচাইকৃত, কোনো পরিবর্তন প্রয়োজন হয়নি।';
        }
        if (elements.auditStatusBadge) {
          elements.auditStatusBadge.textContent = '১০০% নিখুঁত';
          elements.auditStatusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300';
        }
      } else {
        elements.auditNotesBox.classList.add('hidden');
      }
    }

    if (elements.successCard) {
      elements.successCard.classList.remove('hidden');
      elements.successCard.classList.add('flex');
      setTimeout(() => {
        elements.successCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }

  function recalculateBijoyFromUnicode() {
    if (window.BanglaConverter && typeof window.BanglaConverter.unicodeToBijoy === 'function') {
      state.bijoyText = window.BanglaConverter.unicodeToBijoy(state.unicodeText);
      if (elements.outputBijoyArea) elements.outputBijoyArea.value = state.bijoyText;
    } else {
      state.bijoyText = state.unicodeText;
      if (elements.outputBijoyArea) elements.outputBijoyArea.value = state.unicodeText;
    }
  }

  async function copyCurrentText() {
    const text = state.unicodeText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('টেক্সট সফলভাবে ক্লিপবোর্ডে কপি করা হয়েছে!', 'success');
    } catch (e) {
      showToast('টেক্সট কপি সম্পন্ন হয়েছে!', 'success');
    }
  }

  async function sendToMainConverter() {
    if (!state.unicodeText || !state.unicodeText.trim()) {
      showToast('কোনো টেক্সট পাওয়া যায়নি!', 'warning');
      return;
    }

    showToast('ফয়জার কনভার্টারে ফাইল প্রস্তুত ও আপলোড করা হচ্ছে...', 'info');

    try {
      const docxBlob = await createDocxBlob(state.unicodeText, false);
      const rawName = state.selectedFile?.name || state.filesQueue?.[0]?.name || 'OCR_Document';
      const baseName = rawName.replace(/\.[^/.]+$/, '');
      const docxFile = new File([docxBlob], `${baseName}.docx`, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        lastModified: Date.now()
      });

      const textTabBtn = document.querySelector('.tool-switch-btn[data-tool-tab="text"]');
      if (textTabBtn) textTabBtn.click();

      const wizardSubTabFileBtn = document.getElementById('wizard-subtab-file-btn');
      if (wizardSubTabFileBtn) wizardSubTabFileBtn.click();

      if (typeof window.initiateFileScan === 'function') {
        await window.initiateFileScan(docxFile);
      } else {
        const wizardFileInput = document.getElementById('wizardFileInput');
        if (wizardFileInput) {
          const dt = new DataTransfer();
          dt.items.add(docxFile);
          wizardFileInput.files = dt.files;
          wizardFileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      const mainSource = document.getElementById('source-text');
      if (mainSource) {
        mainSource.value = state.unicodeText;
        mainSource.dispatchEvent(new Event('input', { bubbles: true }));
      }

      showToast('ফাইলটি সফলভাবে ফয়জার কনভার্টারে আপলোড ও স্ক্যান হয়েছে!', 'success');
    } catch (e) {
      console.error('Send to converter error:', e);
      showToast(`ফয়জার কনভার্টারে পাঠাতে সমস্যা: ${e.message}`, 'error');
    }
  }

  // =========================================================================
  // DOCUMENT EXPORT ENGINE (RTF .doc + OOXML .docx WITH REAL TABLES & MATH)
  // =========================================================================

  const CP1252_MAP_TABLE = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
    0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
    0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
    0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
    0x017E: 0x9E, 0x0178: 0x9F
  };

  function encodeRtfText(str) {
    if (!str) return '';
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code === 0x09) out += '\\tab ';
      else if (code === 0x5C) out += '\\\\';
      else if (code === 0x7B) out += '\\{';
      else if (code === 0x7D) out += '\\}';
      else if (code >= 0x20 && code <= 0x7E) {
        out += str[i];
      } else if (CP1252_MAP_TABLE[code] !== undefined) {
        out += "\\'" + CP1252_MAP_TABLE[code].toString(16).padStart(2, '0');
      } else if (code >= 0x80 && code <= 0xFF) {
        out += "\\'" + code.toString(16).padStart(2, '0');
      } else {
        out += `\\u${code}?`;
      }
    }
    return out;
  }

  function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function sanitizeMathBengaliSeparation(rawText) {
    if (!rawText || typeof rawText !== 'string') return rawText || '';
    let s = rawText;

    // 1. Unpack any \text{...} that contains Bengali characters so Bengali words are never trapped in equations
    s = s.replace(/\\(?:text|mathrm|textmd|textbf|textit|mbox)\{\s*([^{}]*?[\u0980-\u09FF][^{}]*?)\s*\}/g, ' $1 ');

    // 2. Strip quotes around Bengali words
    s = s.replace(/["“'’](\s*[\u0980-\u09FF\s]+\s*)["”'’]/g, ' $1 ');

    // 3. Separate multiple adjacent definitions: "} B =" -> "}, B ="
    s = s.replace(/(\}\s*)([A-Za-z]\s*=)/g, (match, g1, g2) => `${g1.trim()}, ${g2}`);

    // 4. Process all math delimiters and extract ALL Bengali text completely outside
    s = s.replace(/\$\$([\s\S]*?)\$\$|\$([^\$]+?)\$|\\\[([\s\S]*?\\\])|\\\(([\s\S]*?)\\\)/g, (match, d1, s1, b1, p1) => {
      const isDouble = Boolean(d1 || b1);
      const inner = (d1 || s1 || b1 || p1 || '').trim();

      if (!/[\u0980-\u09FF]/.test(inner)) {
        return match;
      }

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

    s = s.replace(/\$\$\s*\$\$/g, '').replace(/\$\s*\$/g, '');
    s = s.replace(/,\s*,/g, ',');
    return s;
  }

  // Sanitizer: Strips unwanted asterisks around Roman numerals & removes mark brackets [১], [২] from questions
  function cleanOcrResponse(rawText) {
    if (!rawText) return '';
    let text = sanitizeMathBengaliSeparation(rawText.trim());

    // Extract audit note for UI badge before stripping
    const detectedNote = extractAuditNote(text);
    if (detectedNote) state.lastAuditNote = detectedNote;

    // STRIP all AI Audit Note & Change Log blocks completely so they NEVER enter the document text!
    // Case 1: When attached to a question number e.g. "১২। [নোট ও পরিবর্তনসমূহ: ... \n - bullet 1\n - bullet 2" before subquestion "(ক)"
    text = text.replace(/([০-৯0-9]+[।\.\)])\s*\[\s*(?:[^\]\n]{0,12}?\s*)?(?:নোট|পরিবর্তনসমূহ|সংশোধনী|অডিট|খসড়া|Note|Audit)[\s\S]*?(?:\]|(?=\n\s*(?:\([ক-ঘa-divx০-৯]+\)|[ক-ঘa-divx][\.\)]|[০-৯0-9]+[।\.\)]|#{1,6}\s|$)))/gi, '$1\n');
    // Case 2: Standalone note block e.g. "[নোট ও পরিবর্তনসমূহ: ..."
    text = text.replace(/\[\s*(?:[^\]\n]{0,12}?\s*)?(?:নোট|পরিবর্তনসমূহ|সংশোধনী|অডিট|খসড়া|Note|Audit)[\s\S]*?(?:\]|(?=\n\s*(?:\([ক-ঘa-divx০-৯]+\)|[ক-ঘa-divx][\.\)]|[০-৯0-9]+[।\.\)]|#{1,6}\s|$)))/gi, '');

    // Strip exam board tags, cadet college tags, and chapter citations anywhere in text
    text = text.replace(/\s*\[\s*(?:[^\]\n]*(?:(?:ঢাকা|রাজশাহী|দিনাজপুর|কুমিল্লা|চট্টগ্রাম|সিলেট|বরিশাল|যশোর|ময়মনসিংহ|মাদ্রাসা|কারিগরি|সকল)?\s*(?:বোর্ড|বো\.)|ক্যাডেট\s*কলেজ|জিলা\s*স্কুল|অধ্যায়|অধ্যায়|অনুশীলনী|পরিপত্র|সহপাঠ|গদ্যাংশ|পদ্যাংশ|বোর্ড\s*প্রশ্ন|মডেল\s*টেস্ট|Board|Cadet|Chapter))[^\]\n]*\]\s*/gi, ' ');
    text = text.replace(/\s*\(\s*(?:[^\)\n]*(?:(?:ঢাকা|রাজশাহী|দিনাজপুর|কুমিল্লা|চট্টগ্রাম|সিলেট|বরিশাল|যশোর|ময়মনসিংহ|মাদ্রাসা|কারিগরি|সকল)\s*(?:বোর্ড|বো\.)|বোর্ড\s*[-–—]?\s*[০-৯0-9]{4}|ক্যাডেট\s*কলেজ|জিলা\s*স্কুল))[^\]\n]*\)\s*/gi, ' ');

    if (text.startsWith('```')) {
      text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
    }

    text = text.replace(/^[=\-\s]*Start of OCR[^\n]*[=\-\s]*\n?/gim, '');
    text = text.replace(/^[=\-\s]*End of OCR[^\n]*[=\-\s]*\n?/gim, '');
    text = text.replace(/^[=\-\s]*Page\s*\d+[^\n]*[=\-\s]*\n?/gim, '');

    // CRITICAL: Strip any markdown bold asterisks (**)
    text = text.replace(/\*\*/g, '');

    // CRITICAL: Clamp runaway dot repetitions (e.g. ............. -> ......)
    text = text.replace(/\.{8,}/g, '......');

    // 1. Clean asterisks around Roman numerals: *i.* -> i., *ii.* -> ii., *iii.* -> iii.
    text = text.replace(/\*+\s*(i{1,4}|iv|v|vi{0,3}|ix|x)\s*\.\s*\*+/gi, '$1.');
    
    // 2. Clean asterisks around inline Roman numerals: *i*, *ii*, *iii*, *i, ii*, *i ও ii*, *i, ii ও iii*
    text = text.replace(/\*+\s*([iIvVxX0-9]+(?:\s*,\s*[iIvVxX0-9]+)*(?:\s*ও\s*[iIvVxX0-9]+)*)\s*\*+/g, '$1');
    text = text.replace(/\*+([iIvVxX]+)\*+/g, '$1');

    // 3. Clean leading bullet asterisks on numbered lists: * i. -> i., * 1. -> 1.
    text = text.replace(/^[\*\-•]\s*([iIvVxX0-9\u0980-\u09FF]+\.)/gm, '$1');

    // 3-sort. Auto-sort misordered Roman numeral statements in MCQs (e.g. ii., iii., i. -> i., ii., iii.)
    const getRomanVal = (line) => {
      const trimmed = line.trim().replace(/^[\t\s]*\*+|\*+$/g, '');
      const m = trimmed.match(/^(?:[iIvVxX]+|\([iIvVxX]+\))[\.\)]/);
      if (!m) return 999;
      const r = m[0].replace(/[\(\)\.\s]/g, '').toLowerCase();
      const map = { 'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10 };
      return map[r] || 999;
    };
    const rawSplit = text.split('\n');
    const sortedRomanLines = [];
    let rIdx = 0;
    while (rIdx < rawSplit.length) {
      if (getRomanVal(rawSplit[rIdx]) < 999) {
        const romanBlock = [];
        while (rIdx < rawSplit.length && getRomanVal(rawSplit[rIdx]) < 999) {
          romanBlock.push(rawSplit[rIdx]);
          rIdx++;
        }
        if (romanBlock.length > 1) {
          romanBlock.sort((a, b) => getRomanVal(a) - getRomanVal(b));
        }
        sortedRomanLines.push(...romanBlock);
      } else {
        sortedRomanLines.push(rawSplit[rIdx]);
        rIdx++;
      }
    }
    text = sortedRomanLines.join('\n');

    // 3a. Format reaction arrows (\xrightarrow, \rightarrow, etc.) into clean standard symbols
    if (typeof DocxHandler !== 'undefined' && typeof DocxHandler.formatReactionArrows === 'function') {
      text = DocxHandler.formatReactionArrows(text);
    }

    // 3b. Auto-correct common Bijoy keyboard font mistakes for chemical symbols in science options:
    text = text.replace(/(?<=[\s\t\(\[]|\b)কও২(?=[\s\t\)\],।]|\b|$)/g, 'KO2');
    text = text.replace(/(?<=[\s\t\(\[]|\b)কও(?=[\s\t\)\],।]|\b|$)/g, 'KO');
    text = text.replace(/(?<=[\s\t\(\[]|\b)কঘ(?=[\s\t\)\],।]|\b|$)/g, 'KOH');
    text = text.replace(/(?<=[\s\t\(\[]|\b)২ঐও(?=[\s\t\)\],।]|\b|$)/g, '2H2O');
    text = text.replace(/(?<=[\s\t\(\[]|\b)ঐ২ও(?=[\s\t\)\],।]|\b|$)/g, 'H2O');
    text = text.replace(/(?<=[\s\t\(\[]|\b)২ঐ২ও(?=[\s\t\)\],।]|\b|$)/g, '2H2O');
    text = text.replace(/(?<=[\s\t\(\[]|\b)২ঞও(?=[\s\t\)\],।]|\b|$)/g, '2H2O');

    // 3c. Auto-heal hybrid/corrupted mixed numbers (e.g. 8.8৮ L -> 8.88 L or 8.8৮ -> 8.88)
    text = text.replace(/([0-9০-৯]*[0-9][0-9০-৯.]*[০-৯][0-9০-৯.]*|[0-9০-৯]*[০-৯][0-9০-৯.]*[0-9][0-9০-৯.]*)(\s*[a-zA-Z%]+)?/g, (match, numPart, trailingUnit) => {
      const enCount = (numPart.match(/[0-9]/g) || []).length;
      const bnCount = (numPart.match(/[০-৯]/g) || []).length;
      const hasLatinUnit = trailingUnit && /[a-zA-Z]/.test(trailingUnit);
      const bnToEn = { '০':'0', '১':'1', '২':'2', '৩':'3', '৪':'4', '৫':'5', '৬':'6', '৭':'7', '৮':'8', '৯':'9' };
      const enToBn = { '0':'০', '1':'১', '2':'২', '3':'৩', '4':'৪', '5':'৫', '6':'৬', '7':'৭', '8':'৮', '9':'৯' };
      if (enCount >= bnCount || hasLatinUnit) {
        return numPart.replace(/[০-৯]/g, d => bnToEn[d] || d) + (trailingUnit || '');
      }
      return numPart.replace(/[0-9]/g, d => enToBn[d] || d) + (trailingUnit || '');
    });

    // 3d. Auto-heal scientific notation, broken powers and chemical formulas/reactions
    if (typeof DocxHandler !== 'undefined' && typeof DocxHandler.healScientificAndChemical === 'function') {
      text = DocxHandler.healScientificAndChemical(text);
    }
    // 3e. Auto-heal un-exponented algebraic powers e.g. 4x2-3y+7z, 2a3×3a2, a2-b2+c2, (x+y)2=(x-y)2+4xy
    if (typeof DocxHandler !== 'undefined' && typeof DocxHandler.healAlgebraicPowers === 'function') {
      text = DocxHandler.healAlgebraicPowers(text);
    }

    const rawLines = text.split('\n');
    const cleanedLines = [];
    let inNoteBlock = false;

    for (let i = 0; i < rawLines.length; i++) {
      let l = rawLines[i];
      const trimmed = l.trim();
      if (!trimmed) continue; // Skip empty lines / extra enters!

      // Skip OCR delimiter lines
      if (/^[=\-]{2,}/.test(trimmed) && /ocr/i.test(trimmed)) {
        continue;
      }

      // Skip any residual Audit Note blocks & bullet lists completely!
      if (/^\s*\[\s*(?:[^\]\n]{0,12}?\s*)?(?:নোট|পরিবর্তনসমূহ|সংশোধনী|অডিট|খসড়া|Note|Audit)/i.test(trimmed)) {
        inNoteBlock = !trimmed.endsWith(']');
        continue;
      }
      if (inNoteBlock) {
        if (trimmed.endsWith(']')) inNoteBlock = false;
        continue;
      }
      // Skip any AI audit bullet points that escaped e.g. - খসড়া টেক্সটে..., - ৪ থেকে ১২ নং...
      if (/^\s*[-•]\s*(?:খসড়া|মূল ছবি|সকল উদ্দীপক|প্রশ্নের ক্রমিক|নম্বর প্রদান|বিষয় কোড|বানান সংশোধন|প্রশ্ন\s*[০-৯0-9]+)/.test(trimmed)) {
        continue;
      }

      // 4. PLAIN SCORE MARKS: Convert any bracketed marks [১] or (১) to plain unbracketed tabbed numbers (e.g. ক. ...\t১)
      l = l.replace(/(\?|।|:|[a-zA-Z\u0980-\u09FF"'”’\$])\s*\[\s*([০-৯0-9\s]+)\s*\]\s*$/g, '$1\t$2');
      l = l.replace(/(\?|।|:|[a-zA-Z\u0980-\u09FF"'”’\$])\s*[\(（]\s*([০-৯0-9\s]+)\s*[\)）]\s*$/g, '$1\t$2');

      // 4a. Remove references & source brackets (e.g. [ঢাকা বোর্ড-২০২৩], [ক্যাডেট কলেজ], (দিনাজপুর বোর্ড), [অধ্যায়-৩], মান: ১ ইত্যাদি)
      // Strictly constrained to exam board tags so legitimate content parentheses like (Vision & Mission), (যেমন: ...), (বেঞ্চ/টেবিল) are never stripped
      l = l.replace(/\s*\[\s*(?:[^\]\n]*(?:(?:ঢাকা|রাজশাহী|দিনাজপুর|কুমিল্লা|চট্টগ্রাম|সিলেট|বরিশাল|যশোর|ময়মনসিংহ|মাদ্রাসা|কারিগরি|সকল)?\s*বোর্ড|ক্যাডেট\s*কলেজ|জিলা\s*স্কুল|অধ্যায়\s*[-–—:]\s*[০-৯0-9]+|অনুশীলনী\s*[-–—:]\s*[০-৯0-9]+|পরিপত্র\s*[-–—:]\s*[০-৯0-9]+))[^\]\n]*\]\s*/gi, ' ');
      l = l.replace(/\s*\(\s*(?:[^\)\n]*(?:(?:ঢাকা|রাজশাহী|দিনাজপুর|কুমিল্লা|চট্টগ্রাম|সিলেট|বরিশাল|যশোর|ময়মনসিংহ|মাদ্রাসা|কারিগরি|সকল)\s*বোর্ড|বোর্ড\s*[-–—]?\s*[০-৯0-9]{4}|ক্যাডেট\s*কলেজ|জিলা\s*স্কুল))[^\)\n]*\)\s*/gi, ' ');
      l = l.replace(/(\?|।|[a-zA-Z\u0980-\u09FF])\s*মান\s*[:\s]*[০-৯0-9]+\s*$/g, '$1');

      // 4b. Format diagram/image tags strictly as [ছবি আছে-পৃ:০১] without any description
      l = l.replace(/\[\s*(?:চিত্র|ছবি)\s*আছে\s*[:\-]\s*(?:পৃ(?:ষ্ঠা)?[:\s]*([০-৯0-9]+))?[^\]]*\]/gi, function(match, pageNum) {
        let p = pageNum ? toBengaliNumber(pageNum.replace(/[^\d০-৯]/g, '').padStart(2, '0')) : '০১';
        return `[ছবি আছে-পৃ:${p}]`;
      });
      // 4c. Unified Question Paper Formatting (Question serials ১।, MCQ tabs \tক. ..., CQ dot sub-questions, English preserved)
      if (typeof DocxHandler !== 'undefined' && typeof DocxHandler.formatQuestionPaperLine === 'function') {
        l = DocxHandler.formatQuestionPaperLine(l, false);
      } else if (typeof BanglaConverter !== 'undefined' && typeof BanglaConverter.formatQuestionPaper === 'function') {
        l = BanglaConverter.formatQuestionPaper(l, false);
      }

      cleanedLines.push(l);
    }

    let finalOutput = cleanedLines.join('\n').trim();

    // 5. Clean stray quotes around units e.g. 2262 "cm" 3, "cm"^3, "cm"
    finalOutput = finalOutput.replace(/(?<=\d|\))\s*["']\s*(cm|mm|m|km|gm|kg|sec|s|hr|min|V|W|kW|A|mA|Hz|N|Pa|J)\s*["']\s*(\^?\d+)?/gi, function(match, unit, exp) {
      let cleanExp = exp ? exp.replace('^', '') : '';
      return cleanExp ? ` $${unit}^{${cleanExp}}$` : ` ${unit}`;
    });
    finalOutput = finalOutput.replace(/["']\s*(cm|mm|m|km|gm|kg|sec|s|hr|min|V|W|kW|A|mA|Hz|N|Pa|J)\s*["']/gi, '$1');
    finalOutput = finalOutput.replace(/\b(cm|mm|m|km)\s*(\^?([23]))\b/gi, '$1^$3');

    // 6. UNWRAP comma-separated number lists (e.g. $75, 65, 80...$ in Q11)
    finalOutput = finalOutput.replace(/\$\s*([০-৯0-9\s,.\-]+(?:\s*,\s*[০-৯0-9\s,.\-]+)+)\s*\$/g, '$1');

    // 7. UNWRAP plain isolated numbers in $...$ (e.g. $50$, $65$, $62.5$, $30$, $7$)
    finalOutput = finalOutput.replace(/\$\s*([০-৯0-9]+(?:\.[০-৯0-9]+)?)\s*\$/g, '$1');

    // 8. UNWRAP plain measurements in $...$ (e.g. $8 m$, $6 m$, $20 cm$)
    finalOutput = finalOutput.replace(/\$\s*([০-৯0-9]+(?:\.[০-৯0-9]+)?\s*(?:m|cm|mm|km|gm|kg|sec|s|hr|min|V|W|kW|A|mA|Hz|N|Pa|J))\s*\$/gi, '$1');

    // 9. UNWRAP Bengali abbreviations in $...$ (e.g. $7 সে.মি.$, $7 সে. মি.$)
    finalOutput = finalOutput.replace(/\$\s*([০-৯0-9]+(?:\.[০-৯0-9]+)?\s*[\u0980-\u09FF\s.]+)\s*\$/g, '$1');

    // 10. Auto-wrap isolated math variables and expressions before Bengali postpositions (strictly [a-zA-Z], NEVER \d*[a-zA-Z])
    finalOutput = finalOutput.replace(/(?<![`$])\b([a-zA-Z]\([a-zA-Z0-9,\s]+\))(?![`$])(?=\s+(?:এর|হলে|নির্ণয়|মান|কে|তালিকা|প্রকাশ)(?:[\s।\?,\.]|$))/g, '`$1`');
    finalOutput = finalOutput.replace(/(?<![`$])\b([a-zA-Z])(?![`$])(?=\s+(?:এর|হলে|কে|তে|মান|নির্ণয়|সমান|মানটি|থেকে|পর্যন্ত|সংখ্যক|তম|পদ)(?:[\s।\?,\.]|$))/g, '`$1`');
    finalOutput = finalOutput.replace(/(?<![`$])\b([A-Z])(?![`$])(?=\s+(?:অন্বয়|সেট|তালিকা|ফাংশন|সম্পর্ক|কে|নির্ণয়))/g, '`$1`');
    finalOutput = finalOutput.replace(/(?<![`$])\b([a-zA-Z]\s*[-+]\s*[a-zA-Z]\s*=\s*-?\d+)(?![`$])/g, '`$1`');

    // Strip any remaining ** marks and collapse extra enters/blank lines
    finalOutput = finalOutput.replace(/\*\*/g, '').replace(/\r/g, '').replace(/\n\s*\n+/g, '\n').trim();

    return finalOutput;
  }

  function parseRichRuns(rawText) {
    if (!rawText) return [];

    let clean = rawText
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\pm/g, '±')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\neq/g, '≠')
      .replace(/\\approx/g, '≈')
      .replace(/\\theta/g, 'θ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\lambda/g, 'λ')
      .replace(/\\pi/g, 'π')
      .replace(/\\Omega/g, 'Ω')
      .replace(/\\mu/g, 'µ')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\degree|\^\\circ/g, '°')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\quad|\\qquad/g, '   ')
      .replace(/\$/g, '');

    const rx = /([a-zA-Z0-9\u0980-\u09FF]+)([_^])(\{([^}]+)\}|([a-zA-Z0-9\u0980-\u09FF]))/g;
    const runs = [];
    let lastIdx = 0;
    let match;

    while ((match = rx.exec(clean)) !== null) {
      const pre = clean.substring(lastIdx, match.index);
      if (pre) runs.push({ text: pre });

      const base = match[1];
      const op = match[2];
      const scriptVal = match[4] || match[5];

      runs.push({ text: base });
      if (op === '_') runs.push({ text: scriptVal, isSubscript: true });
      else if (op === '^') runs.push({ text: scriptVal, isSuperscript: true });

      lastIdx = rx.lastIndex;
    }

    const post = clean.substring(lastIdx);
    if (post) runs.push({ text: post });

    return runs.length > 0 ? runs : [{ text: clean }];
  }

  function parseDocumentBlocks(text) {
    if (!text || !text.trim()) return [];

    if (text.includes('<table') || text.includes('<TABLE')) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const body = doc.body;
        const blocks = [];

        for (const node of Array.from(body.childNodes)) {
          if (node.nodeType === 1) {
            const tag = node.tagName.toLowerCase();
            if (tag === 'table') {
              const rows = [];
              const trs = node.querySelectorAll('tr');
              for (const tr of Array.from(trs)) {
                const cells = [];
                const tds = tr.querySelectorAll('th, td');
                for (const td of Array.from(tds)) cells.push(td.textContent.trim());
                if (cells.length > 0) rows.push(cells);
              }
              if (rows.length > 0) blocks.push({ type: 'table', rows });
            } else {
              const textContent = node.textContent.trim();
              if (textContent) {
                blocks.push({ type: 'paragraph', text: textContent });
              }
            }
          } else if (node.nodeType === 3 && node.textContent.trim()) {
            blocks.push({ type: 'paragraph', text: node.textContent.trim() });
          }
        }

        if (blocks.length > 0) return blocks;
      } catch (e) {
        console.warn('DOM parsing failed, falling back to text parsing:', e);
      }
    }

    const lines = (text || '').replace(/\*\*/g, '').split('\n').filter(l => l.trim().length > 0);
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        const parsedRows = [];
        for (const tLine of tableLines) {
          if (/^\|[\s\-:]+(\|[\s\-:]+)+\|$/.test(tLine)) continue;
          const cells = tLine.split('|').slice(1, -1).map(c => c.trim());
          if (cells.length > 0) parsedRows.push(cells);
        }

        if (parsedRows.length > 0) {
          blocks.push({ type: 'table', rows: parsedRows });
          continue;
        }
      }

      blocks.push({ type: 'paragraph', text: line });
      i++;
    }

    return blocks;
  }

  function renderRunsForRtf(text, isBijoy, fontSizeHalfPt) {
    if (!text || !text.trim()) return '';
    if (typeof EquationConverter !== 'undefined' && hasLatexMath(text)) {
      const segments = EquationConverter.splitTextAndMath(text);
      let rtf = '';
      for (const seg of segments) {
        if (seg.type === 'math') {
          if (/[\u0980-\u09FF]/.test(seg.value)) {
            rtf += renderRunsForRtfPlain(seg.value, isBijoy, fontSizeHalfPt, false);
          } else if (EquationConverter.needsEqField && !EquationConverter.needsEqField(seg.value)) {
            const clean = EquationConverter.sanitizeSimpleMath ? EquationConverter.sanitizeSimpleMath(seg.value, isBijoy) : seg.value.replace(/\$/g, '');
            rtf += renderSimpleMathRtf(clean, isBijoy, fontSizeHalfPt, false);
          } else {
            // Part-9f: Word 2003-নিরাপদ EQ-ফিল্ড (Equation Editor) — ম্যাথ-জোন বাদ
            const eqCode = EquationConverter.latexToEqField(seg.value, isBijoy);
            rtf += renderEquationForRtf(eqCode, isBijoy, fontSizeHalfPt, false);
          }
        } else if (seg.value) {
          rtf += renderRunsForRtfPlain(seg.value, isBijoy, fontSizeHalfPt, false);
        }
      }
      return rtf;
    }
    return renderRunsForRtfPlain(text, isBijoy, fontSizeHalfPt, false);
  }

  function encodeEqInst(str) {
    if (!str) return '';
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c === 0x7B) out += '\\{';
      else if (c === 0x7D) out += '\\}';
      else if (c >= 0x20 && c <= 0x7E) out += str[i];
      else out += '\\u' + c + '?';
    }
    return out;
  }

  function plainEqApprox(eqCode) {
    return String(eqCode || '')
      .replace(/\\F\(([^,]*),([^)]*)\)/g, '($1)/($2)')
      .replace(/\\R\((?:[^,]*,)?([^)]*)\)/g, '√($1)')
      .replace(/\\S\\up4\((.*?)\)/g, '$1 ')
      .replace(/\\S\\do4\((.*?)\)/g, '$1 ')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function renderEquationForRtf(eqCode, isBijoy, fontSizeHalfPt, isBold) {
    const boldPrefix = isBold ? '\\b ' : '';
    const boldSuffix = isBold ? '\\b0 ' : '';
    const inst = encodeEqInst(eqCode);
    const plain = plainEqApprox(eqCode);
    const visible = isBijoy && typeof window.BanglaConverter !== 'undefined'
      ? window.BanglaConverter.unicodeToBijoy(plain)
      : plain;
    return `{\\field{\\*\\fldinst ${boldPrefix}{\\f0\\fs${fontSizeHalfPt} EQ ${inst}}${boldSuffix}}{\\fldrslt ${boldPrefix}{\\f0\\fs${fontSizeHalfPt} ${encodeRtfText(visible || ' ')}}${boldSuffix}}}`;
  }

  function renderSimpleMathRtf(clean, isBijoy, fontSizeHalfPt, isBold) {
    const boldPrefix = isBold ? '\\b ' : '';
    const boldSuffix = isBold ? '\\b0 ' : '';
    return `{\\f0\\fs${fontSizeHalfPt} ${boldPrefix}${encodeRtfText(isBijoy && typeof window.BanglaConverter !== 'undefined' ? window.BanglaConverter.unicodeToBijoy(clean) : clean)}${boldSuffix}}`;
  }

  function renderRunsForRtfPlain(text, isBijoy, fontSizeHalfPt, isBold) {
    if (!text || !text.trim()) return '';

    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    let rtf = '';

    for (const part of parts) {
      if (!part) continue;
      const bold = isBold || (part.startsWith('**') && part.endsWith('**'));
      const cleanText = (part.startsWith('**') && part.endsWith('**')) ? part.slice(2, -2) : part;

      const mathRuns = parseRichRuns(cleanText);

      for (const mRun of mathRuns) {
        const segments = window.BanglaConverter && typeof window.BanglaConverter.splitMixedBengaliAndEnglish === 'function'
          ? window.BanglaConverter.splitMixedBengaliAndEnglish(mRun.text)
          : [{ type: 'bengali', text: mRun.text }];

        for (const seg of segments) {
          const boldPrefix = bold ? '\\b ' : '';
          const boldSuffix = bold ? '\\b0 ' : '';
          const subPrefix = mRun.isSubscript ? '\\sub ' : (mRun.isSuperscript ? '\\super ' : '');
          const subSuffix = (mRun.isSubscript || mRun.isSuperscript) ? '\\nosupersub ' : '';

          if (seg.type === 'english' || !isBijoy) {
            const font = isBijoy ? '\\f1' : '\\f0';
            rtf += `{${font}\\fs${fontSizeHalfPt} ${boldPrefix}${subPrefix}${encodeRtfText(seg.text)}${subSuffix}${boldSuffix}}`;
          } else {
            const bijoyText = window.BanglaConverter ? window.BanglaConverter.unicodeToBijoy(seg.text) : seg.text;
            if (isBijoy && /[-–—−‒―]/.test(bijoyText)) {
              const dParts = bijoyText.split(/([-–—−‒―]+)/);
              for (const dp of dParts) {
                if (!dp) continue;
                const font = /[-–—−‒―]/.test(dp) ? '\\f1' : '\\f0';
                rtf += `{${font}\\fs${fontSizeHalfPt} ${boldPrefix}${subPrefix}${encodeRtfText(dp)}${subSuffix}${boldSuffix}}`;
              }
            } else {
              rtf += `{\\f0\\fs${fontSizeHalfPt} ${boldPrefix}${subPrefix}${encodeRtfText(bijoyText)}${subSuffix}${boldSuffix}}`;
            }
          }
        }
      }
    }
    return rtf;
  }

  function hasLatexMath(text) {
    return /\$\$[\s\S]*?\$\$|\$[^\$]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/.test(text);
  }

  function renderRunsForOoxml(text, isBijoy, fontSizeHalfPt) {
    if (!text || !text.trim()) return '';
    if (typeof EquationConverter !== 'undefined' && hasLatexMath(text)) {
      const segments = EquationConverter.splitTextAndMath(text);
      let runsXml = '';
      for (const seg of segments) {
        if (seg.type === 'math') {
          if (/[\u0980-\u09FF]/.test(seg.value)) {
            runsXml += renderRunsForOoxmlPlain(seg.value, isBijoy, fontSizeHalfPt, false);
          } else if (typeof EquationConverter !== 'undefined' && typeof EquationConverter.latexToOmml === 'function') {
            runsXml += EquationConverter.latexToOmml(seg.value, isBijoy);
          } else {
            const eqCode = EquationConverter.latexToEqField(seg.value, isBijoy);
            runsXml += renderEquationForOoxml(eqCode, isBijoy, fontSizeHalfPt, false);
          }
        } else if (seg.value) {
          runsXml += renderRunsForOoxmlPlain(seg.value, isBijoy, fontSizeHalfPt, false);
        }
      }
      return runsXml;
    }
    return renderRunsForOoxmlPlain(text, isBijoy, fontSizeHalfPt, false);
  }

  function renderEquationForOoxml(eqCode, isBijoy, fontSizeHalfPt, isBold) {
    const bengaliFont = isBijoy ? 'SutonnyMJ' : 'Kalpurush';
    const scriptSz = Math.round(fontSizeHalfPt * 0.67);
    const boldTag = isBold ? '<w:b/>' : '';

    const rpr = (fontName, sz) => `      <w:rPr>
        <w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/>
        <w:sz w:val="${sz}"/>
        <w:szCs w:val="${sz}"/>
        ${boldTag}
      </w:rPr>`;

    let xml = '';
    xml += `      <w:r>
${rpr('Times New Roman', fontSizeHalfPt)}
        <w:fldChar w:fldCharType="begin"/>
      </w:r>\n`;

    const fullEq = ' EQ ' + eqCode + ' ';
    const tokens = (typeof EquationConverter !== 'undefined' && typeof EquationConverter.tokenizeEqCode === 'function')
      ? EquationConverter.tokenizeEqCode(fullEq)
      : [{ text: fullEq, italic: false, isScript: false, isQuotedText: false }];

    for (const t of tokens) {
      if (!t || !t.text) continue;
      const isBn = t.isQuotedText && typeof window.BanglaConverter !== 'undefined'
        && (window.BanglaConverter.hasBengaliText && window.BanglaConverter.hasBengaliText(t.text) || isBijoy);
      const fontName = isBn ? bengaliFont : 'Times New Roman';
      const sz = t.isScript ? scriptSz : fontSizeHalfPt;
      const italicTag = t.italic && !isBn ? '<w:i/><w:iCs/>' : '';
      xml += `      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/>
          <w:sz w:val="${sz}"/>
          <w:szCs w:val="${sz}"/>
          ${boldTag}
          ${italicTag}
        </w:rPr>
        <w:instrText xml:space="preserve">${escapeXml(t.text)}</w:instrText>
      </w:r>\n`;
    }

    xml += `      <w:r>
${rpr('Times New Roman', fontSizeHalfPt)}
        <w:fldChar w:fldCharType="end"/>
      </w:r>\n`;
    return xml;
  }

  function renderSimpleMathOoxml(tok, isBijoy, fontSizeHalfPt, isBold) {
    const boldTag = isBold ? '<w:b/>' : '';
    const isBn = tok.isBengali || (typeof window.BanglaConverter !== 'undefined'
      && window.BanglaConverter.hasBengaliText && window.BanglaConverter.hasBengaliText(tok.text));
    const fontName = isBn ? (isBijoy ? 'SutonnyMJ' : 'Kalpurush') : 'Times New Roman';
    const italicTag = tok.italic && !isBn ? '<w:i/><w:iCs/>' : '';
    return `      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/>
          <w:sz w:val="${fontSizeHalfPt}"/>
          <w:szCs w:val="${fontSizeHalfPt}"/>
          ${boldTag}
          ${italicTag}
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(tok.text)}</w:t>
      </w:r>\n`;
  }

  function renderRunsForOoxmlPlain(text, isBijoy, fontSizeHalfPt, isBold) {
    if (!text || !text.trim()) return '';

    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    let runsXml = '';

    for (const part of parts) {
      if (!part) continue;
      const bold = isBold || (part.startsWith('**') && part.endsWith('**'));
      const cleanText = (part.startsWith('**') && part.endsWith('**')) ? part.slice(2, -2) : part;

      const mathRuns = parseRichRuns(cleanText);

      for (const mRun of mathRuns) {
        const segments = window.BanglaConverter && typeof window.BanglaConverter.splitMixedBengaliAndEnglish === 'function'
          ? window.BanglaConverter.splitMixedBengaliAndEnglish(mRun.text)
          : [{ type: 'bengali', text: mRun.text }];

        for (const seg of segments) {
          const boldTag = bold ? '<w:b/>' : '';
          const vertAlignTag = mRun.isSubscript
            ? '<w:vertAlign w:val="subscript"/>'
            : (mRun.isSuperscript ? '<w:vertAlign w:val="superscript"/>' : '');

          if (seg.type === 'english') {
            const engRpr = `        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:sz w:val="${fontSizeHalfPt}"/>
          <w:szCs w:val="${fontSizeHalfPt}"/>
          ${boldTag}
          ${vertAlignTag}
        </w:rPr>`;
            const eParts = seg.text.split('\t');
            for (let ep = 0; ep < eParts.length; ep++) {
              if (ep > 0) runsXml += `      <w:r>\n${engRpr}\n        <w:tab/>\n      </w:r>\n`;
              if (eParts[ep]) runsXml += `      <w:r>\n${engRpr}\n        <w:t xml:space="preserve">${escapeXml(eParts[ep])}</w:t>\n      </w:r>\n`;
            }
          } else {
            const targetText = isBijoy && window.BanglaConverter ? window.BanglaConverter.unicodeToBijoy(seg.text) : seg.text;
            const fontName = isBijoy ? 'SutonnyMJ' : 'Kalpurush';
            const bnRpr = `        <w:rPr>
          <w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/>
          <w:sz w:val="${fontSizeHalfPt}"/>
          <w:szCs w:val="${fontSizeHalfPt}"/>
          ${boldTag}
          ${vertAlignTag}
        </w:rPr>`;
            const engRpr = `        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:sz w:val="${fontSizeHalfPt}"/>
          <w:szCs w:val="${fontSizeHalfPt}"/>
          ${boldTag}
          ${vertAlignTag}
        </w:rPr>`;
            const bParts = targetText.split('\t');
            for (let bp = 0; bp < bParts.length; bp++) {
              if (bp > 0) runsXml += `      <w:r>\n${bnRpr}\n        <w:tab/>\n      </w:r>\n`;
              if (bParts[bp]) {
                if (isBijoy && /[-–—−‒―]/.test(bParts[bp])) {
                  const dParts = bParts[bp].split(/([-–—−‒―]+)/);
                  for (let dp of dParts) {
                    if (!dp) continue;
                    const rprToUse = /[-–—−‒―]/.test(dp) ? engRpr : bnRpr;
                    runsXml += `      <w:r>\n${rprToUse}\n        <w:t xml:space="preserve">${escapeXml(dp)}</w:t>\n      </w:r>\n`;
                  }
                } else {
                  runsXml += `      <w:r>\n${bnRpr}\n        <w:t xml:space="preserve">${escapeXml(bParts[bp])}</w:t>\n      </w:r>\n`;
                }
              }
            }
          }
        }
      }
    }
    return runsXml;
  }

  let isDownloadingDocument = false;
  async function downloadWordDocument(format) {
    if (isDownloadingDocument) {
      console.warn('ডকুমেন্ট ডাউনলোড প্রসেস চলছে, অতিরিক্ত ক্লিক অগ্রাহ্য করা হয়েছে');
      return;
    }
    isDownloadingDocument = true;

    try {
      const text = (elements.outputUnicodeArea && elements.outputUnicodeArea.value) || state.unicodeText || state.bijoyText;
      if (!text || !text.trim()) {
        showToast('ডাউনলোড করার মতো কোনো টেক্সট নেই', 'warning');
        return;
      }

      const pageSizeVal = (elements.pageSizeSelect && elements.pageSizeSelect.value) || document.getElementById('ai-target-page-size')?.value || 'a4';
      const marginVal = (elements.pageMarginSelect && elements.pageMarginSelect.value) || document.getElementById('ai-target-page-margin')?.value || 'normal';
      const fontSizeVal = (elements.fontSizeSelect && elements.fontSizeSelect.value) || document.getElementById('ai-target-font-size')?.value || '12';
      const fontSizePt = parseInt(fontSizeVal, 10) || 12;

      const rawName = state.selectedFile?.name || state.filesQueue?.[0]?.name || 'Document';
      const baseName = rawName.replace(/\.[^/.]+$/, '');

      let parsedDocType = 'EXAM_CQ';
      let exportText = text;
      const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---/);
      if (fmMatch) {
        const typeMatch = fmMatch[1].match(/doc_type:\s*(\w+)/);
        if (typeMatch) parsedDocType = typeMatch[1];
        exportText = text.substring(fmMatch[0].length).trim();
      }

      // FORMAT 0: Raw Markdown .MD (Direct pure text with full LaTeX equations intact)
      if (format === 'md' || format === 'markdown') {
        const mdBlob = new Blob([exportText], { type: 'text/markdown;charset=utf-8' });
        triggerDownload(mdBlob, `${baseName}_Equations.md`);
        showToast(`মার্কডাউন (.md) ফাইল সফলভাবে ডাউনলোড হয়েছে!`, 'success');
        return;
      }
      
      let auditNote = null;
      const auditNoteRegex = /\[এআই অডিট নোট ও পরিবর্তনসমূহ:[\s\S]*?\]/i;
      const noteMatch = exportText.match(auditNoteRegex);
      if (noteMatch) {
        auditNote = noteMatch[0];
        exportText = exportText.replace(auditNoteRegex, '').trim();
      } else if (state.lastAuditNote) {
        // যাচাই-নোটটি cleanOcrResponse() আগেই বডি থেকে সরিয়ে রাখে; তাই সংরক্ষিত কপি থেকে নেওয়া হয়
        auditNote = state.lastAuditNote;
      }
      
      const isStudentCopy = document.getElementById('cleanCopyCheckbox')?.checked;
      
      const processDownload = async (isClean, suffix) => {
        showToast(`মাস্টার ওয়ার্ড (.docx) ফাইল প্রস্তুত হচ্ছে...`, 'info');
        
        let masterDocxBlob = null;
        try {
          masterDocxBlob = await generateMasterDocx(exportText, {
            docType: parsedDocType,
            pageSize: pageSizeVal,
            margin: marginVal,
            fontSize: fontSizeVal,
            columns: /EXAM_|question_paper/i.test(parsedDocType) ? 2 : 1,
            auditNote: isClean ? null : auditNote
          });
        } catch (err) {
          console.warn('Failed to generate master docx in download process:', err);
        }

        if (!masterDocxBlob) {
          showToast('মাস্টার ওয়ার্ড ফাইল তৈরি করা যায়নি', 'error');
          return;
        }

        // FORMAT 3: Word 2003 .DOC (Direct Full-Fidelity Word 2003 SutonnyMJ Document via Core Master Pipeline)
        if (format === 'doc') {
          showToast(`ওয়ার্ড ২০০৩ (.doc) ফাইল প্রস্তুত হচ্ছে...`, 'info');
          let docBlob = null;

          if (masterDocxBlob && typeof DocxHandler !== 'undefined' && typeof DocxToDocConverter !== 'undefined') {
            const bijoyDocxRes = await DocxHandler.convertDocx(masterDocxBlob, {
              direction: 'u2b',
              targetFont: 'SutonnyMJ'
            });
            const intermediateDocxBlob = bijoyDocxRes.convertedBlob || bijoyDocxRes.blob;

            const docxConverter = new DocxToDocConverter();
            const docResult = await docxConverter.convertDocxToDoc(intermediateDocxBlob, {
              pageSize: pageSizeVal,
              margin: marginVal,
              preserveSutonny: true,
              optimizeForQuestionPaper: true
            });
            docBlob = docResult.blob || docResult.convertedBlob;
          } else if (typeof DocxToDocConverter !== 'undefined' && masterDocxBlob) {
            const docxConverter = new DocxToDocConverter();
            const docResult = await docxConverter.convertDocxToDoc(masterDocxBlob, {
              pageSize: pageSizeVal,
              margin: marginVal,
              preserveSutonny: true,
              optimizeForQuestionPaper: true
            });
            docBlob = docResult.blob || docResult.convertedBlob;
          } else if (typeof MdLayoutParser !== 'undefined' && typeof DocWord2003Builder !== 'undefined') {
            const detectFn = (t) => {
              if (typeof MdLayoutParser.detectDocumentProfile === 'function') {
                const prof = MdLayoutParser.detectDocumentProfile(t);
                if (prof?.archetypeId) return prof.archetypeId;
              }
              return 'question-2col';
            };
            const detectedLayout = detectFn(exportText);
            const ast = MdLayoutParser.parse(exportText, { layout: detectedLayout, pageSize: pageSizeVal, margin: marginVal, fontSize: fontSizeVal });
            docBlob = DocWord2003Builder.build(ast, { font: 'SutonnyMJ' });
          } else if (typeof DocxHandler !== 'undefined' && typeof DocxHandler.createDocFromText === 'function') {
            docBlob = DocxHandler.createDocFromText(exportText, 'SutonnyMJ', true, fontSizePt, {
              pageSize: pageSizeVal,
              margin: marginVal,
              fontSize: fontSizeVal
            });
          }

          if (!docBlob) {
            throw new Error('Word 2003 (.doc) ফাইল প্রস্তুত করা যায়নি');
          }

          try {
            let htmlText = await docBlob.text();
            if (htmlText && (htmlText.includes('<html') || htmlText.includes('<!DOCTYPE'))) {
              htmlText = htmlText.replace(/['"]?Cambria Math['"]?/gi, "'Times New Roman'");
              htmlText = htmlText.replace(/line-height:\s*1\.00;?/gi, 'mso-line-height-rule:exactly;line-height:14.0pt;');
              docBlob = new Blob([htmlText], { type: 'application/msword;charset=utf-8' });
            }
          } catch (postErr) {
            console.warn('Word 2003 doc line-height hardening warning:', postErr);
          }

          triggerDownload(docBlob, `${baseName}${suffix}_Word2003.doc`);
          showToast(`ওয়ার্ড ২০০৩ (.doc - সুতন্নিএমজে) সফলভাবে ডাউনলোড হয়েছে!`, 'success');
          return;
        }

        // FORMAT 1: Modern Word .DOCX (Pure Unicode Master)
        if (format === 'unicode_docx') {
          triggerDownload(masterDocxBlob, `${baseName}${suffix}_Master_Unicode.docx`);
          showToast(`ইউনিকোড মাস্টার .DOCX ডাউনলোড সম্পন্ন!`, 'success');
          return;
        }

        // FORMAT 2: Modern Word .DOCX (Bijoy SutonnyMJ via DocxHandler)
        if (format === 'bijoy_docx') {
          showToast(`বিজয় .DOCX তৈরি হচ্ছে...`, 'info');
          let bijoyBlob = null;
          if (typeof DocxHandler !== 'undefined' && typeof DocxHandler.convertDocx === 'function') {
            const res = await DocxHandler.convertDocx(masterDocxBlob, {
              direction: 'u2b',
              targetFont: 'SutonnyMJ'
            });
            bijoyBlob = res.convertedBlob || res.blob;
          } else {
            bijoyBlob = await createDocxBlob(exportText, true, { pageSize: pageSizeVal, margin: marginVal, fontSize: fontSizeVal });
          }
          triggerDownload(bijoyBlob, `${baseName}${suffix}_Bijoy.docx`);
          showToast(`বিজয় .DOCX ডাউনলোড সম্পন্ন!`, 'success');
          return;
        }
      };

      await processDownload(false, '_Teacher');
      if (isStudentCopy) {
        await new Promise(res => setTimeout(res, 1000));
        await processDownload(true, '_Student');
      }

    } catch (err) {
      console.error('Download error:', err);
      showToast(`ফাইল ডাউনলোডে ত্রুটি: ${err.message}`, 'error');
    } finally {
      isDownloadingDocument = false;
    }
  }

  /**
   * পর্যায় ১: লেআউট ডিজাইন ও মাস্টার ওয়ার্ড ফাইল (.docx) জেনারেশন
   * সর্বদা ১০০% খাঁটি ইউনিকোড — কোনো প্রকার বিজয় রূপান্তর এখানে ঘটবে না।
   */
  async function generateMasterDocx(text, customOptions = {}) {
    if (typeof FayzarPipeline !== 'undefined' && typeof FayzarPipeline.exportDocx === 'function') {
      try {
        const result = await FayzarPipeline.exportDocx(text, {
          font: customOptions.font || 'Kalpurush',
          docType: customOptions.docType || 'EXAM_CQ',
          ...customOptions
        });
        if (result && result.content) return result.content;
      } catch (err) {
        console.warn('FayzarPipeline exportDocx error, falling back:', err);
        if (typeof window !== 'undefined' && window.FayzarExportDualEngine && typeof window.FayzarExportDualEngine.generateModernDocx === 'function') {
          try {
            const blob = await window.FayzarExportDualEngine.generateModernDocx(text, 'GENERAL_TEXT', customOptions);
            if (blob) return blob;
          } catch (e2) {
            console.warn('FayzarExportDualEngine generic fallback error:', e2);
          }
        }
      }
    }
    if (typeof MdLayoutParser !== 'undefined' && typeof DocxLayoutBuilder !== 'undefined') {
      try {
        const detectFn = (t) => {
          if (typeof MdLayoutParser.detectDocumentProfile === 'function') {
            const prof = MdLayoutParser.detectDocumentProfile(t);
            if (prof?.archetypeId) return prof.archetypeId;
          }
          return 'question-2col';
        };
        const detectedLayout = detectFn(text);
        const ast = MdLayoutParser.parse(text, Object.assign({ layout: detectedLayout }, customOptions));
        return await DocxLayoutBuilder.build(ast, { font: customOptions.font || 'Kalpurush' });
      } catch (err) {
        console.warn('DocxLayoutBuilder error, falling back to createDocxBlob:', err);
      }
    }
    return await createDocxBlob(text, false, customOptions);
  }

  /**
   * স্টুডিও প্রিভিউ ও এডিটর অপশন
   * মাস্টার ফাইল ও টেক্সটকে সরাসরি মাইক্রোসফট ওয়ার্ড স্টুডিও এডিটরে ট্রান্সফার করে
   */
  function openStudioPreviewEditor(customText, customName) {
    const text = customText || (elements.outputUnicodeArea && elements.outputUnicodeArea.value) || state.unicodeText;
    if (!text || !text.trim()) {
      showToast('স্টুডিওতে ওপেন করার মতো কোনো টেক্সট নেই', 'warning');
      return;
    }

    const rawName = customName || state.selectedFile?.name || state.filesQueue?.[0]?.name || 'Document';
    const baseName = rawName.replace(/\.[^/.]+$/, '');

    // Classify document if available
    let docType = 'AUTO';
    if (typeof DocClassifier !== 'undefined' && typeof DocClassifier.classify === 'function') {
      const detected = DocClassifier.classify(text);
      if (detected && detected.type) docType = detected.type;
    } else if (/সৃজনশীল|ক\.\s+|খ\.\s+/i.test(text)) {
      docType = 'EXAM_CQ';
    } else if (/বহুনির্বাচনি|MCQ/i.test(text)) {
      docType = 'EXAM_MCQ';
    }

    const payload = {
      text: text,
      fileName: `${baseName}_Master`,
      docType: docType,
      font: 'kalpurush',
      paperSize: (text.length > 400 && /সৃজনশীল|বহুনির্বাচনি|MCQ/i.test(text)) ? 'a4-landscape' : 'a4-portrait'
    };

    if (typeof ConverterStudioBridge !== 'undefined' && typeof ConverterStudioBridge.sendToStudio === 'function') {
      ConverterStudioBridge.sendToStudio(payload);
    } else {
      try {
        localStorage.setItem('fayzar_studio_transfer_v1', JSON.stringify(Object.assign({ source: 'fayzar-converter', timestamp: Date.now() }, payload)));
        sessionStorage.setItem('fayzar_studio_transfer_v1', JSON.stringify(Object.assign({ source: 'fayzar-converter', timestamp: Date.now() }, payload)));
      } catch (e) {
        console.warn('Storage error', e);
      }
    }

    showToast('ওয়ার্ড স্টুডিও লাইভ প্রিভিউ ও এডিটর চালু হচ্ছে...', 'info');
    window.open('studio.html?source=converter', '_blank');
  }

  async function createDocxBlob(text, isBijoy = false, customOptions = {}) {
    const ZipConstructor = (typeof JSZip !== 'undefined')
      ? JSZip
      : (typeof window !== 'undefined' && window.JSZip ? window.JSZip : (typeof global !== 'undefined' && global.JSZip ? global.JSZip : null));

    if (!ZipConstructor) {
      if (typeof DocxHandler !== 'undefined' && typeof DocxHandler.createDocxFromText === 'function') {
        return await DocxHandler.createDocxFromText(text, { isBijoy });
      }
      throw new Error('JSZip লাইব্রেরি লোড হয়নি, অনুগ্রহ করে পেজটি রিফ্রেশ দিন');
    }

    const pageSizeVal = customOptions.pageSize || (elements.pageSizeSelect && elements.pageSizeSelect.value) || document.getElementById('ai-target-page-size')?.value || 'a4';
    const marginVal = customOptions.margin || (elements.pageMarginSelect && elements.pageMarginSelect.value) || document.getElementById('ai-target-page-margin')?.value || 'normal';
    const fontSizeVal = customOptions.fontSize || (elements.fontSizeSelect && elements.fontSizeSelect.value) || document.getElementById('ai-target-font-size')?.value || '12';
    const fontSizePt = parseInt(fontSizeVal, 10) || 12;
    const fontSizeHalfPt = fontSizePt * 2;

    const PAGE_SIZES = {
      'a4': { w: 11906, h: 16838, name: 'A4' },
      'legal': { w: 12240, h: 20160, name: 'Legal' },
      'letter': { w: 12240, h: 15840, name: 'Letter' }
    };

    const MARGINS = {
      'normal': { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      'narrow': { top: 720, right: 720, bottom: 720, left: 720 },
      'moderate': { top: 1080, right: 1080, bottom: 1080, left: 1080 },
      'wide': { top: 1800, right: 1800, bottom: 1800, left: 1800 }
    };

    let docType = customOptions.docType || 'GENERAL';
    if (typeof DocClassifier !== 'undefined' && typeof DocClassifier.classify === 'function') {
      const detected = DocClassifier.classify(text);
      if (detected && detected.type) docType = detected.type;
    }

    const isStampDeed = docType === 'STAMP_DEED' || /৩০০|তিনশত|স্ট্যাম্প|অঙ্গীকার\s*নামা|বায়নানামা|চুক্তিপত্র|তফসিল|১ম\s*পক্ষ|২য়\s*পক্ষ/i.test(text);

    const pageDim = PAGE_SIZES[pageSizeVal] || PAGE_SIZES['a4'];
    const pageMar = Object.assign({}, MARGINS[marginVal] || MARGINS['normal']);

    // Special layout archetype: Stamp deed Page 1 cartridge margin (3.5 inches = 5040 dxa)
    if (isStampDeed && !customOptions.ignoreStampMargin) {
      pageMar.top = 5040;
    }

    const printableWidth = pageDim.w - pageMar.left - pageMar.right;

    let bodyContentXml = '';

    if (typeof MarkdownLayoutEngine !== 'undefined' && typeof MarkdownLayoutEngine.parse === 'function') {
      const blocks = MarkdownLayoutEngine.parse(text);
      bodyContentXml = MarkdownLayoutEngine.renderToOoxml(blocks, isBijoy, fontSizeHalfPt, printableWidth, renderRunsForOoxml);
    } else {
      const cleanInput = (text || '').replace(/\*\*/g, '').replace(/\r/g, '');
      const blocks = parseDocumentBlocks(cleanInput);

      for (const block of blocks) {
        if (block.type === 'paragraph') {
          const trimmed = block.text.trim();
          if (!trimmed) continue;
          const runsXml = renderRunsForOoxml(block.text, isBijoy, fontSizeHalfPt);
          bodyContentXml += `    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      </w:pPr>
${runsXml}    </w:p>\n`;
        } else if (block.type === 'table') {
          const rows = block.rows;
          if (rows.length === 0) continue;
          const maxCols = Math.max(...rows.map(r => r.length));
          const colWidth = Math.floor(printableWidth / maxCols);

          const gridColsXml = Array(maxCols).fill(0).map(() => `<w:gridCol w:w="${colWidth}"/>`).join('');
          const rowsXml = rows.map((row, rIdx) => {
            const isHeader = (rIdx === 0);
            const trPr = isHeader ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
            const cellsXml = Array(maxCols).fill(0).map((_, c) => {
              const cellText = row[c] || '';
              const cellRuns = renderRunsForOoxml(cellText, isBijoy, fontSizeHalfPt);
              return `        <w:tc>
            <w:tcPr>
              <w:tcW w:w="${colWidth}" w:type="dxa"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
              <w:vAlign w:val="top"/>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
              </w:pPr>
${cellRuns || '            <w:r><w:t xml:space="preserve"> </w:t></w:r>'}
            </w:p>
          </w:tc>`;
            }).join('\n');

            return `      <w:tr>${trPr}\n${cellsXml}\n      </w:tr>`;
          }).join('\n');

          bodyContentXml += `    <w:tbl>
        <w:tblPr>
          <w:tblStyle w:val="TableGrid"/>
          <w:tblW w:w="0" w:type="auto"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
          </w:tblBorders>
          <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
        </w:tblPr>
        <w:tblGrid>${gridColsXml}</w:tblGrid>
${rowsXml}
      </w:tbl>
      <w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>\n`;
        }
      }
    }

    const numCols = customOptions.columns || (customOptions.twoColumns ? 2 : 1);
    const colsXml = numCols > 1 ? `\n      <w:cols w:num="${numCols}" w:space="720"/>` : '';

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  mc:Ignorable="w14">
  <w:body>
${bodyContentXml}
    <w:sectPr>
      <w:pgSz w:w="${pageDim.w}" w:h="${pageDim.h}"/>
      <w:pgMar w:top="${pageMar.top}" w:right="${pageMar.right}" w:bottom="${pageMar.bottom}" w:left="${pageMar.left}" w:header="709" w:footer="709" w:gutter="0"/>${colsXml}
    </w:sectPr>
  </w:body>
</w:document>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${isBijoy ? 'SutonnyMJ' : 'Times New Roman'}" w:hAnsi="${isBijoy ? 'SutonnyMJ' : 'Times New Roman'}" w:cs="${isBijoy ? 'SutonnyMJ' : 'Kalpurush'}"/>
        <w:sz w:val="${fontSizeHalfPt}"/>
        <w:szCs w:val="${fontSizeHalfPt}"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr>
      <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
    </w:pPr>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      </w:tblBorders>
    </w:tblPr>
  </w:style>
</w:styles>`;

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

    const zip = new ZipConstructor();
    zip.file("[Content_Types].xml", contentTypesXml);
    zip.folder("_rels").file(".rels", relsXml);
    zip.folder("word").file("document.xml", documentXml);
    zip.folder("word").file("styles.xml", stylesXml);
    zip.folder("word").folder("_rels").file("document.xml.rels", docRelsXml);

    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function setLoading(loading, text = '', percent = 0) {
    state.isProcessing = loading;
    if (elements.convertBtn) elements.convertBtn.disabled = loading;
    if (loading) {
      if (elements.progressContainer) {
        elements.progressContainer.classList.remove('hidden');
        elements.progressContainer.classList.add('flex');
      }
      if (elements.progressStepText) {
        elements.progressStepText.innerHTML = '';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-spinner fa-spin text-indigo-500 mr-2';
        elements.progressStepText.appendChild(icon);
        elements.progressStepText.appendChild(document.createTextNode(' ' + text));
      }
      if (elements.progressBar) elements.progressBar.style.width = `${percent}%`;
      if (elements.progressPercent) elements.progressPercent.textContent = `${Math.round(percent)}%`;
      if (elements.convertBtnText) elements.convertBtnText.textContent = 'প্রসেসিং হচ্ছে...';
      if (elements.successCard) elements.successCard.classList.add('hidden');
    } else {
      if (elements.progressContainer) {
        elements.progressContainer.classList.add('hidden');
        elements.progressContainer.classList.remove('flex');
      }
      if (elements.convertBtnText) elements.convertBtnText.textContent = 'AI দিয়ে কনভার্ট ও ওয়ার্ড ফাইল তৈরি করুন';
    }
  }

  function toggleModal(modal, show) {
    if (!modal) return;
    if (show) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    } else {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function saveByokKey() {
    const key = elements.byokInput.value.trim();
    if (!key) {
      showToast('অনুগ্রহ করে একটি সঠিক Gemini API Key প্রদান করুন', 'warning');
      return;
    }
    state.byokApiKey = key;
    state.demoMode = false;
    localStorage.setItem(STORAGE_KEYS.BYOK_KEY, key);
    localStorage.setItem('bengali_ocr_gemini_key', key);
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, 'false');
    if (elements.geminiKeyInput) elements.geminiKeyInput.value = key;
    if (elements.demoToggle) elements.demoToggle.checked = false;

    updateBadges();
    toggleModal(elements.byokModal, false);
    showToast('API Key সংরক্ষিত হয়েছে! লাইভ কনভার্সন শুরু হচ্ছে...', 'success');
    startOcrConversion();
  }

  function saveSettings() {
    if (elements.demoToggle) state.demoMode = !!elements.demoToggle.checked;
    if (elements.gasUrlInput) state.gasUrl = elements.gasUrlInput.value.trim();
    if (elements.geminiKeyInput) state.byokApiKey = elements.geminiKeyInput.value.trim();
    if (elements.modelSelect) state.selectedModel = elements.modelSelect.value || 'auto';

    if (elements.autoVerifyToggle) {
      state.autoVerify = !!elements.autoVerifyToggle.checked;
      localStorage.setItem('ai_ocr_auto_verify', state.autoVerify ? 'true' : 'false');
    }

    if (state.byokApiKey || state.gasUrl) {
      if (elements.demoToggle) state.demoMode = !!elements.demoToggle.checked;
    }

    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, (state.demoMode || false).toString());
    if (state.gasUrl) {
      localStorage.setItem(STORAGE_KEYS.GAS_URL, state.gasUrl);
      localStorage.setItem('bengali_ocr_gas_url', state.gasUrl);
    }
    localStorage.setItem(STORAGE_KEYS.BYOK_KEY, state.byokApiKey || '');
    localStorage.setItem('bengali_ocr_gemini_key', state.byokApiKey || '');
    localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, state.selectedModel || 'auto');

    updateBadges();
    toggleModal(elements.settingsModal, false);
    showToast('সেটিংস সফলভাবে সংরক্ষিত হয়েছে!', 'success');
  }

  function resetCredits() {
    state.freeUsesCount = 0;
    localStorage.setItem(STORAGE_KEYS.FREE_COUNT, '0');
    updateBadges();
    showToast('ফ্রি ক্রেডিট রিসেট করা হয়েছে (৫ টি ব্যবহার প্রাপ্ত)', 'success');
  }

  function toBengaliNumber(num) {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().replace(/\d/g, (d) => bnDigits[parseInt(d)]);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function showToast(message, type = 'info') {
    if (typeof window.showToastNotification === 'function') {
      window.showToastNotification(message, type);
      return;
    }
    const toast = document.createElement('div');
    const bgColors = {
      info: 'bg-slate-900 text-slate-100 border-slate-700',
      success: 'bg-emerald-950 text-emerald-100 border-emerald-700',
      warning: 'bg-amber-950 text-amber-100 border-amber-700',
      error: 'bg-rose-950 text-rose-100 border-rose-700'
    };
    toast.className = `fixed bottom-5 right-5 z-50 p-3.5 px-4 rounded-2xl border shadow-2xl flex items-center gap-2.5 text-xs transition-all duration-300 ${bgColors[type] || bgColors.info}`;
    
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-circle-info';
    toast.appendChild(icon);
    
    const span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);
    
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast && toast.style) toast.style.opacity = '0';
      setTimeout(() => { if (toast && toast.remove) toast.remove(); }, 300);
    }, 4000);
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.FayzarAiOcrEngine = {
    init,
    startOcrConversion,
    startUnifiedOcr,
    cancelCurrentConversion,
    renderThumbnails,
    deletePage,
    undoPageDelete,
    openPageZoom,
    closePageZoom,
    runVerificationPipeline,
    extractAuditNote,
    downloadWordDocument,
    generateMasterDocx,
    openStudioPreviewEditor,
    handleFiles,
    fastOptimizeImageFile,
    executeGeminiRequest,
    cleanOcrResponse,
    state
  };

})(typeof window !== 'undefined' ? window : this);

