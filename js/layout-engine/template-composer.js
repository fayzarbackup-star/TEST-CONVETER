/**
 * Fayzar — টেমপ্লেট-গ্যালারি (FayzarTemplateComposer) — TEMPLATE_COMPOSE_PLAN T2
 * ==============================================================================
 * ব্যবহারকারী আগে ছাঁচ বাছেন → OCR শুধু লেখা তোলে → এখানে ফ্রন্টম্যাটার "তালাবদ্ধ" হয়:
 *   doc_type = ছাঁচের ধরন, layout_lock: true (DocClassifier তথ্য/অনুমান এড়িয়ে এটিই নেয়),
 *   layout_profile = পাতার জ্যামিতি (CqBookletPlanner.layoutKey; ফলাফল-পাতায় "১ কলাম" বাছলে সেটিই জেতে)।
 * লেআউট আঁকে বিদ্যমান প্রমাণিত মডিউল (প্রশ্নপত্র-প্ল্যানার, letter/cash-memo/cv…) — এখানে শুধু বাছাই ও যাচাই।
 * ক্রম (মালিকের সিদ্ধান্ত ২০২৬-১০-১১): প্রশ্নপত্র → প্রত্যয়ন → প্যাড/আবেদন → ক্যাশমেমো → সিভি → সনদ।
 * বিশুদ্ধ ফাংশন (DOM নেই) — Node-এ টেস্টযোগ্য; গ্যালারির UI home-app.js-এ।
 */
(function (global) {
  'use strict';

  // ছোট নকশা-আইকন (৪৮×৩৪ viewBox; লোকাল, কোনো ছবি-ফাইল নয়): পাতা + কলাম/গ্রিড
  const R = (x, y, w, h, o) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" ${o || 'fill="currentColor" opacity=".35"'}/>`;
  const PAGE_L = R(1, 1, 46, 32, 'fill="none" stroke="currentColor" stroke-width="1.2"');
  const PAGE_P = R(12, 1, 24, 32, 'fill="none" stroke="currentColor" stroke-width="1.2"');
  const HR = (y) => `<line x1="14" y1="${y}" x2="34" y2="${y}" stroke="currentColor" stroke-width=".7"/>`;
  const lines = (x, y, w, n, gap) => Array.from({ length: n }, (_, k) => R(x, y + k * (gap || 3), w, 1.2)).join('');
  const MEMO = (x, w) => R(x + 1, 3, w - 2, 2.5) + R(x + w / 2 - 3, 7, 6, 1.6) + lines(x, 10.5, w, 1) +
    R(x, 13, w, 13, 'fill="none" stroke="currentColor" stroke-width=".6"') + lines(x + 1, 15, w - 2, 3) + R(x, 29, w * 0.35, 1) + R(x + w * 0.65, 29, w * 0.35, 1);
  const RCPT = (x, w) => R(x + 1, 3, w - 2, 2.5) + R(x + w / 2 - 3, 7, 6, 1.6) + lines(x, 10.5, w, 1) + lines(x, 14, w, 3, 2.6) +
    R(x, 22, w * 0.4, 3, 'fill="none" stroke="currentColor" stroke-width=".6"') + R(x, 29, w * 0.35, 1) + R(x + w * 0.65, 29, w * 0.35, 1);
  const ICON = {
    cq: PAGE_L + lines(4, 5, 17, 8) + lines(27, 5, 17, 8),
    math: PAGE_L + lines(4, 5, 17, 8) + `<text x="35" y="22" font-size="12" text-anchor="middle" fill="currentColor">∑</text>`,
    mcq: PAGE_P + lines(15, 4, 18, 1) + [0, 1, 2, 3, 4, 5].map((k) => R(15 + (k % 2) * 10, 8 + Math.floor(k / 2) * 8, 8, 5)).join(''),
    combined: PAGE_L + lines(4, 5, 17, 8) + [0, 1, 2, 3].map((k) => R(27 + (k % 2) * 9, 6 + Math.floor(k / 2) * 9, 7, 6)).join(''),
    general: PAGE_P + R(15, 4, 18, 2.5) + lines(15, 9, 8, 7) + lines(25, 9, 8, 7) + `<line x1="24" y1="9" x2="24" y2="29" stroke="currentColor" stroke-width=".6"/>`,
    primary: PAGE_L + R(5, 4, 15, 3) + lines(4, 10, 17, 6) + lines(27, 5, 17, 8),
    // প্রত্যয়ন: প্যাড-মাথা + দাগ + শিরোনাম + অনুচ্ছেদ + ডানে স্বাক্ষর
    letter: PAGE_P + R(16, 3, 16, 2.5) + `<line x1="14" y1="7.5" x2="34" y2="7.5" stroke="currentColor" stroke-width=".7"/>` + R(19, 10, 10, 1.6) + lines(15, 14, 18, 4) + R(25, 28, 8, 1.2),
    // ইউপি: ওপরে সরকার-লাইন + মাঝে বড় নাম
    up: PAGE_P + R(19, 2.5, 10, 1.2) + R(15, 5, 18, 2.5) + `<line x1="14" y1="9" x2="34" y2="9" stroke="currentColor" stroke-width=".7"/>` + R(19, 11, 10, 1.6) + lines(15, 15, 18, 4) + R(25, 28, 8, 1.2),
    cert: R(1, 1, 46, 32, 'fill="none" stroke="currentColor" stroke-width="2"') + R(10, 5, 28, 3.5) + R(17, 11, 14, 2.5) + lines(7, 16, 34, 3, 3.5) + R(5, 28, 9, 1.2) + R(34, 28, 9, 1.2),
    stub: PAGE_L + R(3, 3, 15, 28, 'fill="none" stroke="currentColor" stroke-width=".8"') + lines(5, 6, 11, 6, 3.6) +
      R(21, 3, 24, 28, 'fill="none" stroke="currentColor" stroke-width=".8"') + R(25, 6, 16, 2.5) + lines(23, 12, 20, 4, 3.4),
    // প্যাড-চিঠি: প্যাড-মাথা + দাগ + বরাবর-লাইন + বিষয় + অনুচ্ছেদ + স্বাক্ষর
    pad: PAGE_P + R(16, 3, 16, 2.5) + HR(7.5) + lines(15, 10, 9, 2) + R(15, 16, 16, 1.4) + lines(15, 20, 18, 3) + R(25, 29, 8, 1.2),
    // বিজ্ঞপ্তি: প্যাড-মাথা + মাঝে শিরোনাম
    notice: PAGE_P + R(16, 3, 16, 2.5) + HR(7.5) + R(20, 10, 8, 2) + lines(15, 15, 18, 4) + R(25, 28, 8, 1.2),
    // আবেদন (প্যাড নেই): বামে বরাবর-লাইন + বিষয় + অনুচ্ছেদ + বামে নিবেদক
    app: PAGE_P + R(15, 3, 6, 1.2) + lines(15, 6, 10, 3) + R(15, 15, 16, 1.4) + lines(15, 19, 18, 3) + R(15, 29, 8, 1.2),
    // চাকরি: আবেদন + "১। নাম : …" সারি
    job: PAGE_P + lines(15, 3, 10, 3) + R(15, 12, 16, 1.4) + lines(15, 16, 18, 1) +
      [0, 1, 2, 3].map((k) => R(15, 19.5 + k * 2.6, 6, 1.2) + R(23, 19.5 + k * 2.6, 10, 1.2)).join(''),
    // ক্যাশমেমো: ল্যান্ডস্কেপে পাশাপাশি ২/৩টি একই মেমো (মাথা, শিরোনাম-বাক্স, ছক, দুই স্বাক্ষর)
    memo1: PAGE_P + MEMO(14, 20),
    memo2: PAGE_L + MEMO(4, 18) + MEMO(26, 18),
    memo3: PAGE_L + MEMO(3, 12) + MEMO(18, 12) + MEMO(33, 12),
    // রসিদ: পাশাপাশি ২টি — মাথা, শিরোনাম, বাক্য, টাকার বাক্স, দুই স্বাক্ষর
    receipt: PAGE_L + RCPT(4, 18) + RCPT(26, 18),
    // ভাউচার (A5): মাথা, শিরোনাম, ঘর, ছক, তিন স্বাক্ষর
    voucher: PAGE_P + R(16, 3, 16, 2.5) + R(21, 7, 6, 1.6) + lines(15, 10.5, 18, 1) + R(15, 13, 18, 11, 'fill="none" stroke="currentColor" stroke-width=".6"') +
      lines(16, 15, 16, 3) + R(15, 29, 4.5, 1) + R(21.75, 29, 4.5, 1) + R(28.5, 29, 4.5, 1),
    // সিভি: মাঝে শিরোনাম + "০১। নাম ঃ মান" সারি + শিক্ষার ছক + তারিখ/স্বাক্ষর
    cv: PAGE_P + R(19, 3, 10, 2) + [0, 1, 2, 3, 4].map((k) => R(15, 7.5 + k * 2.8, 6, 1.2) + R(23, 7.5 + k * 2.8, 10, 1.2)).join('') +
      R(15, 22, 18, 5, 'fill="none" stroke="currentColor" stroke-width=".6"') + `<line x1="15" y1="24.5" x2="33" y2="24.5" stroke="currentColor" stroke-width=".5"/>` +
      R(15, 29, 6, 1.2) + R(27, 29, 6, 1.2),
    // বায়োডাটা: শিরোনাম + অংশ-শিরোনাম + সারি + অঙ্গীকার-অনুচ্ছেদ
    biodata: PAGE_P + R(19, 3, 10, 2) + R(15, 7, 9, 1.6) + [0, 1, 2, 3].map((k) => R(15, 10 + k * 2.6, 6, 1.2) + R(23, 10 + k * 2.6, 10, 1.2)).join('') +
      R(15, 21, 9, 1.6) + lines(15, 24, 18, 2, 2.4) + R(15, 29, 6, 1.2) + R(27, 29, 6, 1.2),
    // ইংরেজি সিভি: মাঝে মাথা + ডানে ছবির বাক্স, ধূসর অংশ-পটি, সারি
    cven: PAGE_P + R(17, 3, 10, 1.6) + R(18, 6, 8, 2) + R(18.5, 9.5, 7, 1) + R(29, 2.5, 4.5, 6, 'fill="none" stroke="currentColor" stroke-width=".6"') +
      R(15, 13, 18, 2, 'fill="currentColor" opacity=".7"') + [0, 1, 2].map((k) => R(15, 16.5 + k * 2.4, 6, 1.1) + R(23, 16.5 + k * 2.4, 10, 1.1)).join('') +
      R(15, 24, 18, 2, 'fill="currentColor" opacity=".7"') + lines(15, 27.5, 18, 2, 2.2)
  };
  const svg = (k) => `<svg viewBox="0 0 48 34" width="48" height="34" aria-hidden="true">${ICON[k] || ''}</svg>`;

  /**
   * ছাঁচের তালিকা। group: গ্যালারির দল। profile: CqBookletPlanner.LAYOUT_PROFILES-এর চাবি (না থাকলে প্ল্যানারের নিয়ম)।
   * need: লেখায় যে গঠন থাকা চাই (DocClassifier.structureStats) — না থাকলে সতর্কবার্তা, লেআউট তবু ছাঁচেরই।
   */
  const REGISTRY = [
    { id: 'exam-cq', group: 'exam', icon: 'cq', label: 'সৃজনশীল প্রশ্নপত্র', desc: 'ল্যান্ডস্কেপ, ২ কলাম, বুকলেট',
      doc_type: 'EXAM_CQ', profile: 'EXAM_CQ', need: { cq: true },
      hint: 'This is a creative-question (CQ) paper: each question = stimulus (উদ্দীপক) + sub-questions ক/খ/গ/ঘ with marks at line end after a tab.' },
    { id: 'exam-math', group: 'exam', icon: 'math', label: 'গণিত সৃজনশীল', desc: 'সমীকরণসহ, ল্যান্ডস্কেপ বুকলেট',
      doc_type: 'EXAM_MATH', profile: 'EXAM_MATH', need: { cq: true },
      hint: 'This is a mathematics creative-question paper: write every formula in LaTeX between $…$; sub-questions ক/খ/গ with marks at line end after a tab.' },
    { id: 'exam-mcq', group: 'exam', icon: 'mcq', label: 'বহুনির্বাচনি (MCQ)', desc: 'লম্বালম্বি, বিকল্পের গ্রিড',
      doc_type: 'EXAM_MCQ', profile: null, need: { mcq: true },
      hint: 'This is a multiple-choice (MCQ) paper: number every question, and give its four options as ক. খ. গ. ঘ.' },
    { id: 'exam-combined', group: 'exam', icon: 'combined', label: 'সৃজনশীল + বহুনির্বাচনি', desc: 'সৃজনশীল বুকলেট, পরে MCQ গ্রিড',
      doc_type: 'EXAM_COMBINED', profile: 'EXAM_COMBINED', need: { cq: true, mcq: true },
      hint: 'This paper has a creative (CQ) part and a multiple-choice (MCQ) part: write the line ---SECTION_BREAK:MCQ--- on its own line right before the MCQ part.' },
    { id: 'exam-general', group: 'exam', icon: 'general', label: 'সাধারণ প্রশ্নপত্র', desc: 'লম্বালম্বি, পাতা-জোড়া হেডার, ২ কলাম',
      doc_type: 'EXAM_GENERAL', profile: 'EXAM_GENERAL', need: null,
      hint: 'This is a general question paper (short/broad questions, fill-in-the-blanks, matching etc.); keep each section heading and question number.' },
    { id: 'exam-primary', group: 'exam', icon: 'primary', label: 'প্রাথমিক প্রশ্নপত্র', desc: '২য়–৫ম শ্রেণি, ল্যান্ডস্কেপ ২ কলাম',
      doc_type: 'EXAM_GENERAL', profile: 'EXAM_PRIMARY', need: null,
      hint: 'This is a primary-school (class 2–5) question paper; keep each section heading, question number and marks.' },

    // ---- প্রত্যয়ন ও সনদ (letter-layout লম্বালম্বি / certificate-layout ল্যান্ডস্কেপ ও মুড়িসহ) ----
    { id: 'prottoyon-school', group: 'cert', icon: 'letter', label: 'শিক্ষা প্রতিষ্ঠানের প্রত্যয়ন', desc: 'স্কুল/কলেজ/মাদ্রাসা, A4 লম্বালম্বি',
      doc_type: 'PROTTOYON', fm: { page_orientation: 'portrait' }, need: { title: true },
      hint: 'Certificate from an educational institution. The body normally starts "এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, …".' },
    { id: 'prottoyon-up', group: 'cert', icon: 'up', label: 'ইউপি/পৌরসভা প্রত্যয়ন', desc: 'নাগরিকত্ব, চারিত্রিক, নাম সংশোধন…',
      doc_type: 'PROTTOYON', fm: { page_orientation: 'portrait' }, need: { title: true },
      hint: 'Certificate from a Union Parishad / Pourashava chairman or councillor. Keep any top lines (e.g. গণপ্রজাতন্ত্রী বাংলাদেশ সরকার, চেয়ারম্যান কার্যালয়) exactly as in the draft. The body normally starts "এতদ্বারা প্রত্যয়ন করা যাইতেছে যে, …".' },
    { id: 'cert-landscape', group: 'cert', icon: 'cert', label: 'প্রশংসাপত্র / সনদ', desc: 'বড় শিরোনাম, বর্ডার, A4 ল্যান্ডস্কেপ',
      doc_type: 'PROTTOYON', fm: { page_orientation: 'landscape' }, need: { title: true },
      hint: 'Decorated testimonial / certificate (প্রশংসাপত্র, সনদপত্র) printed in landscape.' },
    { id: 'cert-stub', group: 'cert', icon: 'stub', label: 'মুড়িসহ প্রশংসাপত্র', desc: 'বামে মুড়ি, ডানে মূল সনদ',
      doc_type: 'PROTTOYON', fm: { page_orientation: 'landscape' }, need: { title: true, stub: true },
      hint: 'Testimonial with a counterfoil (মুড়ি). Write TWO parts: first the counterfoil — the same heading lines, the title, "ক্রমিক নং- … তারিখ: …", then one "label: value" line per fact (নাম, পিতার নাম, মাতার নাম, রোল …) and "তারিখ: … প্রধান শিক্ষক"; then a line containing only *** ; then the main certificate (heading, title, serial/date line, body paragraph, date and signature).' },

    // ---- প্যাড ও আবেদন (letter-layout প্যাড / application-layout; প্যাডে লেখা আবেদন পাইপলাইনেই প্যাড-লেআউটে যায়) ----
    { id: 'pad-letter', group: 'pad', icon: 'pad', label: 'অফিস প্যাড / চিঠি', desc: 'স্মারক, বরাবর, বিষয়, স্বাক্ষর',
      doc_type: 'OFFICE_PAD', need: { pad: true },
      hint: 'Official letter / memorandum on an institution or office pad (also an application written on the pad). After the letterhead write "স্মারক নং- … তারিখ: …", then "বরাবর," with the recipient lines, "বিষয়: …", "জনাব,", the body, any list as a table, and the signature block.' },
    { id: 'pad-notice', group: 'pad', icon: 'notice', label: 'বিজ্ঞপ্তি / নোটিশ', desc: 'প্যাডে, মাঝে শিরোনাম',
      doc_type: 'OFFICE_PAD', need: { pad: true },
      hint: 'Notice / office order on an institution pad (বিজ্ঞপ্তি, নোটিশ, অফিস আদেশ, সভার নোটিশ). After the letterhead write "স্মারক নং- … তারিখ: …", then the title (e.g. বিজ্ঞপ্তি) on its own line, the body, any names or agenda as a table or numbered lines, the signature block, then "অনুলিপি:" with one item per line if any.' },
    { id: 'app-general', group: 'pad', icon: 'app', fmt: 'app', label: 'সাধারণ আবেদনপত্র', desc: 'ছুটি, জমি, হোল্ডিং, প্রধান বরাবর',
      doc_type: 'GOVT_APP', need: { app: true },
      hint: 'Plain application (দরখাস্ত): leave, land record correction, holding, to a head teacher / officer etc. Keep any land schedule (তফসিল) as a table.' },
    { id: 'app-job', group: 'pad', icon: 'job', fmt: 'app', label: 'চাকরির আবেদন', desc: 'বরাবর, বিষয়, "১। নাম : …" সারি',
      doc_type: 'GOVT_APP', need: { app: true },
      hint: 'Job application. After the opening paragraph give the applicant\'s details as numbered rows "১। নাম : …", "২। পিতার নাম : …", "৩। মাতার নাম : …" … (an address continuation on the next line), educational qualifications as a table, then the "অতএব …" paragraph.' },

    // ---- ক্যাশমেমো (cash-memo-layout: ১ = A5 লম্বালম্বি, ২/৩ = A4 ল্যান্ডস্কেপে পাশাপাশি; কপি-সংখ্যা ফ্রন্টম্যাটারের copies)
    //      রসিদ/ভাউচার (receipt-layout; CASH_MEMO + memo_kind তালা) ----
    { id: 'memo-1up', group: 'memo', icon: 'memo1', fmt: 'memo', label: 'ক্যাশমেমো ১-আপ', desc: 'A5 লম্বালম্বি, একটি মেমো',
      doc_type: 'CASH_MEMO', fm: { copies: 1 }, need: { memo: true },
      hint: 'Single cash memo printed on an A5 portrait page.' },
    { id: 'memo-2up', group: 'memo', icon: 'memo2', fmt: 'memo', label: 'ক্যাশমেমো ২-আপ', desc: 'এক পাতায় পাশাপাশি ২টি, ১২pt',
      doc_type: 'CASH_MEMO', fm: { copies: 2 }, need: { memo: true },
      hint: 'Cash memo printed two per A4 landscape sheet.' },
    { id: 'memo-3up', group: 'memo', icon: 'memo3', fmt: 'memo', label: 'ক্যাশমেমো ৩-আপ', desc: 'এক পাতায় পাশাপাশি ৩টি, ১০pt',
      doc_type: 'CASH_MEMO', fm: { copies: 3 }, need: { memo: true },
      hint: 'Cash memo printed three per A4 landscape sheet.' },
    { id: 'receipt', group: 'memo', icon: 'receipt', fmt: 'receipt', label: 'টাকা প্রাপ্তির রসিদ', desc: 'মানি রিসিপ্ট, পাশাপাশি ২টি',
      doc_type: 'CASH_MEMO', fm: { memo_kind: 'receipt', copies: 2 }, need: { rl: true },
      hint: 'Money receipt (টাকা প্রাপ্তির রসিদ / মানি রিসিপ্ট), printed two per A4 landscape sheet.' },
    { id: 'voucher', group: 'memo', icon: 'voucher', fmt: 'voucher', label: 'খরচের ভাউচার', desc: 'ডেবিট/ক্যাশ ভাউচার, A5 লম্বালম্বি',
      doc_type: 'CASH_MEMO', fm: { memo_kind: 'voucher', copies: 1 }, need: { rl: true, table: true },
      hint: 'Expense / debit / cash voucher (খরচের ভাউচার) printed on an A5 portrait page.' },

    // ---- জীবনবৃত্তান্ত (cv-layout: বাংলা-প্রধান লেখা হলে; A4, এক পাতায় ধরাতে ধাপে ছোট) ----
    { id: 'cv-bangla', group: 'cv', icon: 'cv', fmt: 'cv', label: 'বাংলা জীবন বৃত্তান্ত', desc: 'চাকরির জন্য, "০১। নাম ঃ" সারি, শিক্ষার ছক',
      doc_type: 'CV_RESUME', need: { cv: true },
      hint: 'Bangla job CV (জীবন বৃত্তান্ত). Title "জীবন বৃত্তান্ত". Number every fact row: "০১। নাম ঃ …", "০২। পিতার নাম ঃ …", "০৩। মাতার নাম ঃ …", "০৪। বর্তমান ঠিকানা ঃ …", "০৫। স্থায়ী ঠিকানা ঃ …", "০৬। জন্ম তারিখ ঃ …", "০৭। ধর্ম ঃ …", "০৮। জাতীয়তা ঃ …", "০৯। জাতীয় পরিচয়পত্র নং ঃ …", "১০। মোবাইল নম্বর ঃ …" (only the facts the draft has, in its order).' },
    { id: 'cv-biodata', group: 'cv', icon: 'biodata', fmt: 'cv', label: 'বায়োডাটা', desc: 'অংশ-শিরোনামসহ, অঙ্গীকার',
      doc_type: 'CV_RESUME', need: { cv: true },
      hint: 'Bangla biodata (বায়োডাটা), e.g. for marriage or admission. Title "বায়োডাটা". Group the facts under section headings on their own lines (ব্যক্তিগত তথ্য, শিক্ষাগত যোগ্যতা, …); fact rows "নাম : …" without numbers; then "অঙ্গীকার" and its paragraph if the draft has one.' },
    // en-cv-layout: দোকানের ইংরেজি সিভি (মাথা + ছবির বাক্স, ধূসর অংশ-পটি); তালা `template: cv-english` দেখে রাউটিং
    { id: 'cv-english', group: 'cv', icon: 'cven', fmt: 'cven', label: 'ইংরেজি সিভি (English CV)', desc: 'CURRICULUM VITAE OF…, ছবির ঘর, ধূসর অংশ-পটি',
      doc_type: 'CV_RESUME', need: { cvEn: true },
      hint: 'English job CV / resume in the shop format (CURRICULUM VITAE / OF / NAME, a photo box, grey section bars). Keep it in English exactly as the draft.' }
  ];
  const GROUPS = [{ id: 'exam', label: 'প্রশ্নপত্র' }, { id: 'cert', label: 'প্রত্যয়ন ও সনদ' }, { id: 'pad', label: 'প্যাড ও আবেদন' },
    { id: 'memo', label: 'ক্যাশমেমো ও রসিদ' }, { id: 'cv', label: 'জীবনবৃত্তান্ত' }];

  const NO_INVENT = 'If the draft only lists facts or notes (name, father, mother, address, year, result, dates …), compose the standard formal Bengali wording from ONLY those facts — ' +
    'never invent any name, number, date or result; write ........ where a needed fact is missing.';
  // অফিস-ধরনের সব ছাঁচে একই গঠন-নির্দেশ: প্যাড-মাথা → স্মারক/তারিখ → শিরোনাম → মূল লেখা → স্বাক্ষর (letter/certificate-layout যা পড়ে)
  const OFFICE_FORMAT = 'Write it as: top line(s) if any (each on its own line); "# <institution / office name>"; address and code lines; ' +
    '"স্মারক নং- … তারিখ: …" if present; the title (if any) on its own line; the body paragraphs; then the signature block (name, designation, office) one item per line. ' + NO_INVENT;
  // প্যাড-ছাড়া আবেদন (application-layout যা পড়ে); "#" লাইন থাকলে পাইপলাইন প্যাড-লেআউটে পাঠায়, তাই নিষেধ
  const APP_FORMAT = 'Write it as: "তারিখ: …" if present; "বরাবর," then the recipient lines (designation, office, address) one per line; "বিষয়: …" as one line; ' +
    '"জনাব," on its own line; the body paragraphs, ending with the "অতএব …" paragraph; then "বিনীত নিবেদক," followed by the applicant\'s name, address and mobile one per line; ' +
    'then "সংযুক্তি:" with one item per line if any. This is a plain application without a letterhead: never write a "#" heading line. ' + NO_INVENT;
  // ক্যাশমেমো (cash-memo-layout যা পড়ে): একটি কপিই লেখা হয়, পাতায় সাজানো লেআউটের কাজ
  const MEMO_FORMAT = 'Write it as: "বিসমিল্লাহির রাহমানির রাহিম" if present; "# <shop name>"; the proprietor line ("প্রো: …"); service and address lines; the mobile / e-mail line; ' +
    'the title "ক্যাশ মেমো" on its own line; field lines such as "নাম: ............ তারিখ: ............" and "ঠিকানা: ............" (keep dots for blanks); ' +
    'the item table as a markdown table "| ক্রমিক | বিবরণ | পরিমাণ | দর | টাকা |" with one row per item and a last row containing "সর্বমোট:"; "কথায়: …"; ' +
    'then "ক্রেতার স্বাক্ষর" and "বিক্রেতার স্বাক্ষর" on one line. Write ONE copy of the memo only, even if the sheet shows it several times. ' +
    'Never invent any item, quantity, price or total; a blank memo stays blank.';
  // রসিদ/ভাউচার (receipt-layout যা পড়ে): স্বাক্ষরের অংশগুলোর মাঝে তিন স্পেস
  const RL_HEAD = 'Write it as: "বিসমিল্লাহির রাহমানির রাহিম" if present; "# <institution / shop name>"; address and mobile lines; ';
  const RL_TAIL = ' Separate the signature parts on that line with three spaces. Write ONE copy only, even if the sheet shows it several times. ' +
    'Never invent any name, amount, date or item; keep dots (........) for blanks.';
  const RECEIPT_FORMAT = RL_HEAD + 'the title (e.g. "টাকা প্রাপ্তির রসিদ" or "মানি রিসিপ্ট") on its own line; "রসিদ নং: ........ তারিখ: ........" on one line; ' +
    'the receipt sentence as ONE paragraph in the draft\'s own wording, e.g. "জনাব/জনাবা ........................ এর নিকট হইতে কথায় ........................ টাকা মাত্র ........................ বাবদ নগদ/চেকে বুঝিয়া পাইলাম।"; ' +
    'then "টাকা: ........" on its own line; then the signature line, e.g. "প্রদানকারীর স্বাক্ষর   গ্রহীতার স্বাক্ষর".' + RL_TAIL;
  const VOUCHER_FORMAT = RL_HEAD + 'the title (e.g. "খরচের ভাউচার" or "ডেবিট ভাউচার") on its own line; "ভাউচার নং: ........ তারিখ: ........" on one line; "প্রাপকের নাম: ........"; ' +
    'the expense table as a markdown table "| ক্রমিক | বিবরণ | টাকা |" with one row per item and a last row containing "মোট:"; "কথায়: ........"; ' +
    'then the signature line, e.g. "প্রাপকের স্বাক্ষর   হিসাবরক্ষক   অনুমোদনকারী".' + RL_TAIL;
  // সিভি (cv-layout যা পড়ে): বাংলায়; "লেবেল ঃ মান" সারি, ঠিকানার দ্বিতীয় লাইন নম্বর ছাড়া, শিক্ষা ছকে, শেষে তারিখ/স্বাক্ষর
  const CV_FORMAT = 'Write it in Bengali as: the title on its own line; one "label ঃ value" row per fact; an address continuation on the next line without a number or label; ' +
    'section headings on their own line; educational qualifications as a markdown table "| পরীক্ষার নাম | বোর্ড/বিশ্ববিদ্যালয় | পাসের সন | ফলাফল |" (one row per exam); ' +
    'any experience, skills or reference as rows or short lines; the declaration paragraph if any; finally "তারিখঃ ................ইং" and "স্বাক্ষর" on their own lines. ' +
    'If the draft only lists facts or notes, arrange them in these rows — never invent any name, number, date or result; write ........ where a needed fact is missing.';
  // ইংরেজি সিভি (en-cv-layout যা পড়ে): মাথা, "## অংশ", "### পরীক্ষা", "Label : value", "- দক্ষতা", ভাষার ছক, শেষে দাগ/নাম/তারিখ
  const EN_CV_FORMAT = 'Write it in English as: "CURRICULUM VITAE", then "OF", then the person\'s name in capitals, each on its own line; then the contact lines ' +
    '(C/O, address lines, "Cell Phone: …", "E-mail: …") one per line; then each section as a "## " heading line — e.g. "## Career Objective", "## Educational Qualification", ' +
    '"## Experience", "## Computer Skill", "## Competitive Strength", "## Language Skill", "## Personal Information", "## Declaration" (only the sections the draft has, in its order); ' +
    'under Educational Qualification one "### <exam name>" line per exam followed by "Institution Name : …", "Group : …", "Board : …", "Year of Passing : …", "Result (G.P.A) : …" rows; ' +
    'personal details as "Label : value" rows (an address continuation on the next line without a label); skill or strength items as "- item" lines; ' +
    'language skill as a markdown table "| Language | Reading | Writing | Speaking |"; the objective and declaration as paragraphs; ' +
    'finally a line "____________________", the name in brackets "(Name)" and "Date: ........" on their own lines. ' +
    'If the draft only lists facts or notes, arrange them in these rows — never invent any name, number, date or result; write ........ where a needed fact is missing.';
  const FORMATS = { app: APP_FORMAT, memo: MEMO_FORMAT, receipt: RECEIPT_FORMAT, voucher: VOUCHER_FORMAT, cv: CV_FORMAT, cven: EN_CV_FORMAT };

  const byId = (id) => REGISTRY.find((t) => t.id === id) || null;

  /** OCR-প্রম্পটের শেষে যোগ (FayzarAiOcrEngine.state.templateHint) */
  function promptHint(tpl) {
    const t = typeof tpl === 'string' ? byId(tpl) : tpl;
    if (!t) return '';
    return `### USER-SELECTED TEMPLATE (HIGHEST PRIORITY FOR doc_type):\nThe user chose the "${t.id}" template. In the frontmatter write exactly: doc_type: ${t.doc_type}\n${t.hint}` +
      (t.group === 'exam' ? '' : '\n' + (FORMATS[t.fmt] || OFFICE_FORMAT));
  }

  /**
   * OCR-লেখার ফ্রন্টম্যাটার তালাবদ্ধ করা: doc_type (প্রথম লাইনে), layout_lock, template, layout_profile;
   * Gemini-র বাকি তথ্য (প্রতিষ্ঠান, শ্রেণি, বিষয়…) অক্ষত (হেডার সেগুলো থেকেই ভরে)।
   * @returns {{ text: string, warnings: string[] }}
   */
  function enforce(md, tpl) {
    const t = typeof tpl === 'string' ? byId(tpl) : tpl;
    const src = String(md == null ? '' : md).replace(/\r\n?/g, '\n');
    if (!t) return { text: src, warnings: [] };
    const m = src.match(/^﻿?---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
    const body = m ? src.slice(m[0].length) : src;
    const fm = t.fm || {};
    const lockedKeys = ['doc_type', 'type', 'layout', 'layout_lock', 'layout_profile', 'template'].concat(Object.keys(fm), fm.page_orientation ? ['orientation'] : []);
    const LOCKED = new RegExp('^\\s*(' + lockedKeys.join('|') + ')\\s*:', 'i');
    const keep = m ? m[1].split('\n').filter((l) => l.trim() && !LOCKED.test(l)) : [];
    const head = [`doc_type: ${t.doc_type}`, 'layout_lock: true', `template: ${t.id}`].concat(t.profile ? [`layout_profile: ${t.profile}`] : [],
      Object.keys(fm).map((k) => `${k}: ${fm[k]}`));
    const text = '---\n' + head.concat(keep).join('\n') + '\n---\n' + body.replace(/^\n+/, '');
    return { text, warnings: check(body, t) };
  }

  /** ছাঁচ যে গঠন চায় তা লেখায় আছে কি না (না থাকলে বাংলা সতর্কবার্তা) */
  function check(body, t) {
    const out = [];
    if (!String(body).trim()) { out.push('লেখা পাওয়া যায়নি'); return out; }
    if (!t.need) return out;
    const nk = String(body).replace(/য়/g, 'য়').replace(/ড়/g, 'ড়');
    // য়/ড় একক রূপে (nk স্বাভাবিককৃত) — উৎসে যে রূপেই লেখা থাকুক
    if (t.need.title && !/প্রত্যয়ন|প্রশংসা|সনদ|ছাড়\s*পত্র|CERTIFICATE|TESTIMONIAL/i.test(nk)) out.push('লেখায় শিরোনাম (প্রত্যয়নপত্র/প্রশংসাপত্র/সনদ) পাওয়া যায়নি — Word-এ যোগ করে নিন');
    if (t.need.stub) {
      const CT = (typeof global !== 'undefined' && global.FayzarCertificateLayout) || null;
      if (CT && typeof CT._split === 'function' && !CT._split(CT._lines(nk))) out.push('মুড়ি আর মূল সনদ আলাদা করা যায়নি — একটি সনদ হিসেবে বসবে (দুই অংশের মাঝে *** লাইন দিন)');
    }
    const LL = (typeof global !== 'undefined' && global.FayzarLetterLayout) || null;
    const head = LL && typeof LL.hasLetterhead === 'function' ? LL.hasLetterhead(nk) : null;
    if (t.need.pad && head === false) out.push('লেখায় প্যাডের শিরোনাম (প্রতিষ্ঠানের নাম ও ঠিকানা) পাওয়া যায়নি — প্যাড ছাড়া বসবে');
    if (t.need.app) {
      if (!/^\s*বরাবর/m.test(nk) || !/^\s*বিষ(?:য়|য়)\s*[:ঃ]/m.test(nk)) out.push('লেখায় "বরাবর" বা "বিষয়:" পাওয়া যায়নি — আবেদনের গঠন দেখুন');
      if (head) out.push('লেখায় প্যাডের শিরোনাম আছে — "অফিস প্যাড / চিঠি" ছাঁচ বেশি মানাবে');
    }
    if (t.need.memo) {
      const CM = (typeof global !== 'undefined' && global.FayzarCashMemoLayout) || null;
      if (CM && typeof CM.parse === 'function' && !CM.parse(nk).title) out.push('লেখায় "ক্যাশ মেমো" শিরোনাম পাওয়া যায়নি — মাথা আর ঘর ঠিক ভাগ নাও হতে পারে');
      if (!/^\s*\|.*\|\s*$/m.test(nk)) out.push('লেখায় পণ্যের ছক পাওয়া যায়নি — ফাঁকা ছক বসবে');
    }
    if (t.need.rl) {
      const RL = (typeof global !== 'undefined' && global.FayzarReceiptLayout) || null;
      if (RL && typeof RL.parse === 'function' && !RL.parse(nk, { memoKind: (t.fm || {}).memo_kind }).title) out.push('লেখায় রসিদ/ভাউচারের শিরোনাম পাওয়া যায়নি — মাথা আর ঘর ঠিক ভাগ নাও হতে পারে');
      if (t.need.table && !/^\s*\|.*\|\s*$/m.test(nk)) out.push('লেখায় খরচের ছক পাওয়া যায়নি — ছক ছাড়াই বসবে');
    }
    if (t.need.cv) {
      const CV = (typeof global !== 'undefined' && global.FayzarCvLayout) || null;
      if (CV && typeof CV.isBangla === 'function' && !CV.isBangla(nk)) out.push('লেখা মূলত ইংরেজি — বাংলা সিভি-লেআউট নয়, পুরোনো ইংরেজি সিভি-ছাঁচে বসবে ("ইংরেজি সিভি" ছাঁচ বেশি মানাবে)');
      else if (CV && typeof CV.parse === 'function') {
        const bl = CV.parse(nk).blocks;
        if (!bl.some((b) => b.kind === 'title')) out.push('লেখায় শিরোনাম (জীবন বৃত্তান্ত/বায়োডাটা) পাওয়া যায়নি — Word-এ যোগ করে নিন');
        if (bl.filter((b) => b.kind === 'kv').reduce((a, b) => a + b.rows.length, 0) < 3) out.push('লেখায় "নাম ঃ …" ধরনের তথ্য-সারি পাওয়া যায়নি — সিভির গঠন দেখুন');
      }
    }
    if (t.need.cvEn) {
      const CV = (typeof global !== 'undefined' && global.FayzarCvLayout) || null;
      const EN = (typeof global !== 'undefined' && global.FayzarEnCvLayout) || null;
      if (CV && typeof CV.isBangla === 'function' && CV.isBangla(nk)) out.push('লেখা মূলত বাংলা — "বাংলা জীবন বৃত্তান্ত" ছাঁচ বেশি মানাবে');
      else if (EN && typeof EN.parse === 'function') {
        const bl = EN.parse(nk).blocks;
        if (!bl[0].name) out.push('লেখায় নাম (CURRICULUM VITAE / OF / নাম) পাওয়া যায়নি — Word-এ যোগ করে নিন');
        if (bl.filter((b) => b.kind === 'kv').reduce((a, b) => a + b.rows.length, 0) < 3) out.push('লেখায় "Name : …" ধরনের তথ্য-সারি পাওয়া যায়নি — সিভির গঠন দেখুন');
      }
    }
    const DC = (typeof global !== 'undefined' && global.DocClassifier) || null;
    if (!DC || typeof DC.structureStats !== 'function' || !(t.need.cq || t.need.mcq)) return out;
    const st = DC.structureStats(body);
    if (t.need.cq && !st.cqBlocks) out.push('লেখায় সৃজনশীল প্রশ্নের গঠন (ক/খ/গ/ঘ ও নম্বর) পাওয়া যায়নি — ছাঁচ ঠিক আছে কি না দেখুন');
    if (t.need.mcq && !st.mcqBlocks && !/---\s*SECTION_?BREAK:MCQ/i.test(body)) out.push('লেখায় বহুনির্বাচনি প্রশ্ন (ক/খ/গ/ঘ বিকল্প) পাওয়া যায়নি — ছাঁচ ঠিক আছে কি না দেখুন');
    return out;
  }

  const FayzarTemplateComposer = { REGISTRY, GROUPS, byId, icon: svg, promptHint, enforce, check };
  global.FayzarTemplateComposer = FayzarTemplateComposer;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarTemplateComposer;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
