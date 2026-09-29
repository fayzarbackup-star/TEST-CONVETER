/**
 * Fayzar Computer & Digital Center - Modular Frontend Controller
 * Version: 3.5 (All 19 Services & Live Notices Embedded)
 */

// =========================================================================
// ১. পূর্ণাঙ্গ ১৯টি ডিজিটাল, ভূমি ও অনলাইন সেবাসমূহ (Full 19 Services Data)
// =========================================================================
const ALL_SERVICES_DATA = [
  {
    id: 'e-mutation',
    category: 'land',
    title: 'ই-নামজারি ও রেকর্ড খারিজ (E-Mutation)',
    badge: 'সর্বাধিক জনপ্রিয় ভূমিসেবা',
    icon: 'fa-landmark',
    summary: 'জমি ক্রয়, হেবা, দান বা ওয়ারিশসূত্রে প্রাপ্ত জমির মালিকানা পরিবর্তন ও নতুন খতিয়ান তৈরি।',
    portal: 'mutation.land.gov.bd',
    govtFee: '১,১৭০ ৳ (কোর্ট ফি ২০৳ + নোটিশ ফি ৫০৳ + রেকর্ড সংশোধন ফি ১,০০০৳ + খতিয়ান ফি ১০০৳)',
    serviceFee: '৩০০ - ৫০০ ৳',
    duration: '২৮ কর্মদিবস (সাধারণত)',
    documents: [
      'মূল দলিল / বায়া দলিলের সার্টিফাইড ফটোকপি',
      'পূর্ববর্তী খতিয়ানসমূহ (CS, SA, RS, হাল খতিয়ান)',
      'সর্বশেষ পরিশোধিত ভূমি উন্নয়ন কর (খাজনা) দাখিলা',
      'ক্রেতা ও বিক্রেতার জাতীয় পরিচয়পত্র (NID) নম্বর ও ছবি',
      'ওয়ারিশান সনদ ও মৃত্যু সনদ (ওয়ারিশ সূত্রে প্রাপ্ত জমির ক্ষেত্রে)',
      'জমির হাত নকশা বা সীমানা বিবরণী (প্রযোজ্য ক্ষেত্রে)'
    ]
  },
  {
    id: 'ld-tax',
    category: 'land',
    title: 'অনলাইনে জমির খাজনা পরিশোধ (LD Tax)',
    badge: 'ডিজিটাল খাজনা দাখিলা',
    icon: 'fa-file-invoice-dollar',
    summary: 'নতুন হোল্ডিং এন্ট্রি, বার্ষিক ভূমি উন্নয়ন কর অনলাইন পেমেন্ট ও তাৎক্ষণিক ডিজিটাল রসিদ সংগ্রহ।',
    portal: 'ldtax.gov.bd',
    govtFee: 'জমির ধরণ ও শতক অনুযায়ী সরকারি নির্ধারিত ফি',
    serviceFee: '৫০ - ১০০ ৳',
    duration: 'তাৎক্ষণিক (অনলাইন পেমেন্ট সাপেক্ষে)',
    documents: [
      'জমির হাল খতিয়ান / নামজারি পর্চার কপি',
      'পূর্বে পরিশোধিত সর্বশেষ খাজনার দাখিলা কপি (যদি থাকে)',
      'মালিকের সচল জাতীয় পরিচয়পত্র (NID) নম্বর',
      'ওটিপি (OTP) যাচাইয়ের জন্য সচল মোবাইল নম্বর'
    ]
  },
  {
    id: 'khatian',
    category: 'land',
    title: 'খতিয়ান/পর্চা যাচাই ও সার্টিফাইড কপি',
    badge: 'অনলাইন ও ডাক ডেলিভারি',
    icon: 'fa-search-location',
    summary: 'CS, SA, RS, BS ও সিটি জরিপের খতিয়ান অনুসন্ধান, অনলাইন কপি ও জেলা রেকর্ডরুমের মূল পর্চা আবেদন।',
    portal: 'eporcha.gov.bd',
    govtFee: 'অনলাইন কপি: ৫০৳ | সার্টিফাইড হার্ডকপি: ১০০৳ + ডাক মাশুল',
    serviceFee: '৫০ - ১০০ ৳',
    duration: 'অনলাইন কপি সাথে সাথে | সার্টিফাইড কপি ৫-৭ দিন',
    documents: [
      'বিভাগ, জেলা, উপজেলা ও সংশ্লিষ্ট মৌজার নাম / JL নম্বর',
      'খতিয়ান নম্বর অথবা দাগ নম্বর অথবা মালিকের নাম',
      'আবেদনকারীর নাম, এনআইডি নম্বর ও মোবাইল নম্বর'
    ]
  },
  {
    id: 'mouza-map',
    category: 'land',
    title: 'মৌজা ম্যাপ (নকশা) ও ডিজিটাল সিট আবেদন',
    badge: 'ডাকযোগে হোম ডেলিভারি',
    icon: 'fa-map-marked-alt',
    summary: 'যেকোনো মৌজার মূল সিট বা নকশার জন্য ভূমি রেকর্ড ও জরিপ অধিদপ্তরে সরাসরি অনলাইন আবেদন।',
    portal: 'dlrs.gov.bd',
    govtFee: 'সরকারি ম্যাপ ফি ও পোস্টাল চার্জ (৫২০৳+)',
    serviceFee: '১০০ - ১৫০ ৳',
    duration: '৭ - ১০ কর্মদিবস',
    documents: [
      'মৌজার নাম ও জে.এল (JL) নম্বর',
      'সিট নম্বর (Sheet Number)',
      'আবেদনকারীর সঠিক ডাক ঠিকানা ও সচল মোবাইল নম্বর'
    ]
  },
  {
    id: 'miss-case',
    category: 'land',
    title: 'রেকর্ড সংশোধন ও বিবিধ মিস কেস আবেদন',
    badge: 'আইনি ও ভূমিসেবা',
    icon: 'fa-gavel',
    summary: 'খতিয়ানে নামের ভুল, দাগ নম্বর বা হিস্যা ভুল সংক্রান্ত সহকারী কমিশনার (ভূমি) বরাবর মিস কেস আবেদন।',
    portal: 'land.gov.bd',
    govtFee: 'কোর্ট ফি ও নির্ধারিত সরকারি চালানের কপি',
    serviceFee: '২০০ - ৫০০ ৳',
    duration: 'শুনানি ও তদন্ত সাপেক্ষে',
    documents: [
      'ভুল খতিয়ান বা দলিলের কপি',
      'সঠিক তথ্যের স্বপক্ষে দালিলিক প্রমাণাদি',
      'জাতীয় পরিচয়পত্র ও আবেদনকারীর ছবি'
    ]
  },
  {
    id: 'e-passport',
    category: 'online',
    title: 'ই-পাসপোর্ট (E-Passport) নতুন ও রিনিউ আবেদন',
    badge: 'জরুরি সরকারি সেবা',
    icon: 'fa-passport',
    summary: '৪৮ ও ৬৪ পাতার ৫ বা ১০ বছর মেয়াদি নতুন ই-পাসপোর্ট আবেদন, তথ্য এন্ট্রি ও চালান পেমেন্ট।',
    portal: 'epassport.gov.bd',
    govtFee: '৫ বছর (৪৮ পাতা): ৪,০২৫৳ | ১০ বছর: ৫,৭৫০৳ (সাধারণ ডেলিভারি)',
    serviceFee: '২০০ - ৩০০ ৳',
    duration: 'অনলাইন ফরম পূরণ তাৎক্ষণিক',
    documents: [
      'মূল এনআইডি (NID) অথবা অনলাইন জন্ম নিবন্ধন (১৭ ডিজিট)',
      'পুরাতন পাসপোর্ট (রিনিউ করার ক্ষেত্রে)',
      'পেশাগত সনদের কপি (সরকারি/বেসরকারি চাকুরিজীবী বা ছাত্র হলে)',
      'বিবাহিত হলে নিকাহনামা/ম্যারেজ সার্টিফিকেট (প্রযোজ্য ক্ষেত্রে)'
    ]
  },
  {
    id: 'police-clearance',
    category: 'online',
    title: 'পুলিশ ক্লিয়ারেন্স সার্টিফিকেট (PCC)',
    badge: 'বিদেশ গমনার্থী সেবা',
    icon: 'fa-shield-alt',
    summary: 'বিদেশ যাত্রা বা চাকরির প্রয়োজনে পুলিশ ক্লিয়ারেন্স সার্টিফিকেট এর নির্ভুল অনলাইন আবেদন ও চালান জমা।',
    portal: 'pcc.police.gov.bd',
    govtFee: '৫০০ ৳ (চালান কোড অনুযায়ী ব্যাংক ট্রেজারি বা সোনালী সেবা)',
    serviceFee: '১৫০ - ২০০ ৳',
    duration: '৭ - ১৫ কর্মদিবস (পুলিশ ভেরিফিকেশন সাপেক্ষে)',
    documents: [
      'পাসপোর্টের ১ম পাতার সত্যায়িত ফটোকপি (মেয়াদ অন্তত ৩ মাস থাকতে হবে)',
      'জাতীয় পরিচয়পত্র (NID) বা অনলাইন জন্ম নিবন্ধন',
      'স্থানীয় ইউনিয়ন পরিষদ/পৌরসভার চেয়ারম্যান প্রদত্ত চারিত্রিক সনদ',
      'বর্তমান ঠিকানার ইউটিলিটি বিলের কপি (প্রয়োজনে)'
    ]
  },
  {
    id: 'online-gd',
    category: 'online',
    title: 'অনলাইন সাধারণ ডায়েরি (Online GD)',
    badge: 'তাৎক্ষণিক জিডি সেবা',
    icon: 'fa-file-shield',
    summary: 'জাতীয় পরিচয়পত্র, সার্টিফিকেট, পাসপোর্ট, ব্যাংকের চেক বা মূল্যবান নথি হারানো সংক্রান্ত থানা জিডি।',
    portal: 'gd.police.gov.bd',
    govtFee: '০ ৳ (সরকারি কোনো ফি নেই)',
    serviceFee: '১০০ - ১৫০ ৳',
    duration: '১০ - ২০ মিনিট',
    documents: [
      'আবেদনকারীর জাতীয় পরিচয়পত্র (NID) নম্বর ও জন্ম তারিখ',
      'হারিয়ে যাওয়া ডকুমেন্টের নম্বর বা স্পষ্ট বিবরণ',
      'একটি সচল মোবাইল নম্বর (এসএমএস ভেরিফিকেশনের জন্য)'
    ]
  },
  {
    id: 'nid-correct',
    category: 'online',
    title: 'এনআইডি (NID) সংশোধন ও রি-ইস্যু আবেদন',
    badge: 'নির্বাচন কমিশন সেবা',
    icon: 'fa-id-card',
    summary: 'জাতীয় পরিচয়পত্রে নাম, জন্ম তারিখ, পিতা-মাতার নাম ও ঠিকানা সংক্রান্ত ভুল সংশোধন আবেদন।',
    portal: 'services.nidw.gov.bd',
    govtFee: 'ক্যাটাগরি অনুযায়ী ২৩০ ৳ থেকে ৩৪৫ ৳ (বিকাশ/রকেটে প্রদেয়)',
    serviceFee: '১৫০ - ২৫০ ৳',
    duration: 'নির্বাচন কমিশনের অনুমোদন সাপেক্ষে',
    documents: [
      'এসএসসি/সমমানের শিক্ষাগত যোগ্যতার মূল সার্টিফিকেট',
      'ডিজিটাল অনলাইন জন্ম নিবন্ধন সনদ',
      'পিতা ও মাতার মূল জাতীয় পরিচয়পত্রের কপি',
      'বিবাহিত হলে কাবিননামা ও স্বামীর NID কপি'
    ]
  },
  {
    id: 'nid-download',
    category: 'online',
    title: 'অনলাইন ভোটার আইডি ডাউনলোড ও লেমিনেশন',
    badge: 'দ্রুত অনলাইন ডেলিভারি',
    icon: 'fa-download',
    summary: 'নতুন ভোটারদের স্লিপ নম্বর বা হারিয়ে যাওয়া NID এর অনলাইন কপি ডাউনলোড ও প্লাস্টিক কার্ড প্রিন্ট।',
    portal: 'services.nidw.gov.bd',
    govtFee: 'প্রযোজ্য ক্ষেত্রে সরকারি ফি',
    serviceFee: '৫০ - ১০০ ৳',
    duration: '৫ - ১০ মিনিট',
    documents: [
      'ভোটার নিবন্ধন ফরম নম্বর / স্লিপ নম্বর অথবা NID নম্বর',
      'ভোটার হওয়ার সময় প্রদত্ত সঠিক জন্ম তারিখ',
      'নিবন্ধনকৃত মোবাইল নম্বর (ফেস ভেরিফিকেশন বা OTP এর জন্য)'
    ]
  },
  {
    id: 'tin-cert',
    category: 'online',
    title: 'ই-টিন (e-TIN) সার্টিফিকেট নতুন আবেদন ও সংশোধন',
    badge: 'এনবিআর ট্যাক্স সেবা',
    icon: 'fa-file-invoice',
    summary: 'ব্যবসা, সঞ্চয়পত্র ক্রয়, ব্যাংক লোন বা ট্রেড লাইসেন্সের জন্য নতুন ১২ ডিজিটের ই-টিন সার্টিফিকেট তাৎক্ষণিক গ্রহণ।',
    portal: 'incometax.gov.bd',
    govtFee: 'সরকারি ফি নেই (ফ্রি)',
    serviceFee: '১০০ - ১৫০ ৳',
    duration: 'তাৎক্ষণিক (৫-১০ মিনিট)',
    documents: [
      'আবেদনকারীর সচল জাতীয় পরিচয়পত্র (NID) নম্বর',
      'সচল মোবাইল নম্বর (ওটিপি যাচাইয়ের জন্য)',
      'ব্যবসার নাম ও ঠিকানা (ব্যবসায়িক টিন এর ক্ষেত্রে)'
    ]
  },
  {
    id: 'e-return',
    category: 'online',
    title: 'অনলাইন আয়কর ই-রিটার্ন দাখিল (e-Return Dakhil)',
    badge: 'এনবিআর ই-ট্যাক্স',
    icon: 'fa-file-signature',
    summary: 'এনবিআর এর অনলাইন পোর্টালে বার্ষিক আয়কর ই-রিটার্ন দাখিল, ট্যাক্স হিসাব এবং তাৎক্ষণিক অফিসিয়াল একনলেজমেন্ট প্রাপ্তি।',
    portal: 'etaxnbr.gov.bd',
    govtFee: 'আয়কর স্ল্যাব অনুযায়ী অথবা জিরো ট্যাক্স',
    serviceFee: '২০০ - ৫০০ ৳',
    duration: 'তাৎক্ষণিক একনলেজমেন্ট রসিদ',
    documents: [
      '১২ ডিজিটের ই-টিন (e-TIN) নম্বর',
      'আবেদনকারীর নিজস্ব নামে বায়োমেট্রিক নিবন্ধিত সিম নম্বর',
      'ব্যাংক স্টেটমেন্ট ও বেতন বিবরণী (যদি থাকে)',
      'স্থাবর ও অস্থাবর সম্পত্তির বিবরণ ও সঞ্চয়পত্র/ডিপিএস তথ্য'
    ]
  },
  {
    id: 'trade-lic',
    category: 'online',
    title: 'ই-ট্রেড লাইসেন্স ও অনলাইন রিনিউ',
    badge: 'ব্যবসা সেবা',
    icon: 'fa-store',
    summary: 'ইউনিয়ন পরিষদ বা পৌরসভা আওতাধীন ব্যবসার বৈধ ই-ট্রেড লাইসেন্স আবেদন ও রিনিউ ফি জমা।',
    portal: 'etradelicense.gov.bd',
    govtFee: 'ব্যবসার মূলধন ও ইউনিয়ন পরিষদ/পৌরসভা নির্ধারিত ফি',
    serviceFee: '১৫০ - ৩০০ ৳',
    duration: '১ - ৩ কর্মদিবস',
    documents: [
      'দোকান ভাড়ার চুক্তিপত্র বা নিজস্ব জায়গার খাজনা দাখিলা',
      'মালিকের জাতীয় পরিচয়পত্র ও পাসপোর্ট সাইজ ছবি',
      'টিন সার্টিফিকেট (প্রযোজ্য ক্ষেত্রে)'
    ]
  },
  {
    id: 'driving',
    category: 'online',
    title: 'ড্রাইভিং লাইসেন্স ও বিআরটিএ সেবা (BRTA)',
    badge: 'লার্নার ও স্মার্ট কার্ড',
    icon: 'fa-id-card-clip',
    summary: 'বিআরটিএ সার্ভিস পোর্টালে লার্নার ড্রাইভিং লাইসেন্স আবেদন, মেডিকেল ফি ও পরীক্ষা স্লট বুকিং।',
    portal: 'bsp.brta.gov.bd',
    govtFee: 'লার্নার ফি: ৫১৮৳ (১ ক্যাটাগরি) / ৭৪৮৳ (২ ক্যাটাগরি)',
    serviceFee: '১৫০ - ২৫০ ৳',
    duration: 'লার্নার তাৎক্ষণিক ডাউনলোড',
    documents: [
      'রেজিস্টার্ড ডাক্তার কর্তৃক প্রদত্ত মেডিকেল সার্টিফিকেট',
      'জাতীয় পরিচয়পত্র ও ইউটিলিটি বিলের কপি',
      'শিক্ষাগত যোগ্যতার সনদ (ন্যূনতম ৮ম শ্রেণি)'
    ]
  },
  {
    id: 'job-apply',
    category: 'computer',
    title: 'চাকরি ও বিশ্ববিদ্যালয়ে ভর্তির অনলাইন আবেদন',
    badge: 'টেলিটক ও অন্যান্য',
    icon: 'fa-user-graduate',
    summary: 'বিসিএস, প্রাথমিক শিক্ষক, সরকারি-বেসরকারি চাকরি এবং জাতীয় ও পাবলিক বিশ্ববিদ্যালয়ে ভর্তি আবেদন।',
    portal: 'বিভিন্ন সরকারি ও বিশ্ববিদ্যালয়ের পোর্টাল',
    govtFee: 'বিজ্ঞপ্তি অনুযায়ী নির্দিষ্ট অ্যাপ্লিকেশন ফি',
    serviceFee: '১০০ - ২০০ ৳',
    duration: '১০ - ১৫ মিনিট',
    documents: [
      'পাসপোর্ট সাইজ ছবি ও স্বাক্ষরের স্পষ্ট কপি (৩০০x৩০০ ও ৩০০x৮০ পিক্সেল)',
      'সকল শিক্ষাগত যোগ্যতার রোল, রেজিস্ট্রেশন নম্বর ও জিপিএ',
      'জাতীয় পরিচয়পত্র ও কোটা সনদ (প্রযোজ্য হলে)'
    ]
  },
  {
    id: 'pvc-id-card',
    category: 'computer',
    title: 'স্কুল-কলেজ ও মাদ্রাসার ডিজিটাল পিভিসি (PVC) আইডি কার্ড ও ফিতা',
    badge: 'স্টুডিও ও প্রিন্টিং',
    icon: 'fa-id-badge',
    summary: 'স্কুল, কলেজ, মাদ্রাসা ও যেকোনো প্রতিষ্ঠানের উন্নত মানের ডিজিটাল পিভিসি আইডি কার্ড, প্রিমিয়াম প্রিন্টেড ফিতা (Lanyard) ও কার্ড হোল্ডার তৈরি।',
    portal: 'fayzarcomputer.com',
    govtFee: 'সরকারি ফি নেই',
    serviceFee: '৬০ - ১১০ ৳ (প্রতি পিস - ফিতা ও মান অনুযায়ী)',
    duration: '১ - ৩ কর্মদিবস (পরিমাণ সাপেক্ষে)',
    documents: [
      'শিক্ষার্থী বা কর্মকর্তা/কর্মচারীর পাসপোর্ট সাইজ স্পষ্ট ছবি',
      'শিক্ষার্থীর নাম, শ্রেণি, রোল, রক্তের গ্রুপ ও পিতা-মাতার নাম',
      'প্রতিষ্ঠানের নাম, লোগো ও প্রধানের স্বাক্ষর'
    ]
  },
  {
    id: 'typing',
    category: 'computer',
    title: 'বাংলা ও ইংরেজি কম্পিউটার কম্পোজ',
    badge: 'কম্পিউটার কম্পোজ',
    icon: 'fa-keyboard',
    summary: 'আবেদনপত্র, দরখাস্ত, সিভি (Curriculum Vitae), স্ট্যাম্প চুক্তিপত্র ও প্রশ্ন নির্ভুলভাবে কম্পোজ।',
    portal: 'ইন-শপ সার্ভিস',
    govtFee: 'প্রযোজ্য নয়',
    serviceFee: 'প্রতি পেজ ২০ - ৫০ ৳',
    duration: 'দ্রুত ডেলিভারি',
    documents: [
      'হাতে লেখা খসড়া বা মূল কাগজের নমুনা',
      'সিভির ক্ষেত্রে শিক্ষাগত তথ্য ও ব্যক্তিগত বিবরণ'
    ]
  },
  {
    id: 'photostat',
    category: 'computer',
    title: 'ডিজিটাল ফটোস্ট্যাট ও কালার প্রিন্ট',
    badge: 'ফটোস্ট্যাট ও প্রিন্ট',
    icon: 'fa-print',
    summary: 'হাই-স্পিড ডিজিটাল ফটোকপি, অফসেট পেপারে নিখুঁত সাদাকালো ও লেজার কালার প্রিন্টিং।',
    portal: 'ইন-শপ সার্ভিস',
    govtFee: 'প্রযোজ্য নয়',
    serviceFee: 'প্রতি পৃষ্ঠা স্বল্পমূল্যে',
    duration: 'তাৎক্ষণিক',
    documents: ['যে ডকুমেন্ট বা পিডিএফ প্রিন্ট করতে চান']
  },
  {
    id: 'photo-studio',
    category: 'computer',
    title: 'স্টুডিও কোয়ালিটি ছবি প্রিন্ট ও লেমিনেটিং',
    badge: 'ডিজিটাল স্টুডিও',
    icon: 'fa-camera-retro',
    summary: 'পাসপোর্ট সাইজ, স্ট্যাম্প সাইজ ও থ্রি-আর/ফোর-আর ছবি প্রিন্ট এবং ডকুমেন্টস হার্ড লেমিনেটিং।',
    portal: 'ইন-শপ সার্ভিস',
    govtFee: 'প্রযোজ্য নয়',
    serviceFee: 'সাইজ ও কপি অনুযায়ী নির্ধারিত',
    duration: '৫ মিনিটে ডেলিভারি',
    documents: ['ছবি বা সরাসরি দোকানে ছবি তোলার সুবিধা']
  }
];

// =========================================================================
// ২. লাইভ নোটিশ ও সার্কুলার তালিকা (Full Notices Data)
// =========================================================================
const ALL_NOTICES_DATA = [
  {
    id: 'job-dot-textiles-42',
    category: 'jobs',
    type: 'সরকারি চাকরি',
    badge: 'চাকরি সার্কুলার',
    title: 'বস্ত্র অধিদপ্তর (DOT) বিভিন্ন পদে নিয়োগ বিজ্ঞপ্তি',
    dept: 'বস্ত্র ও পাট মন্ত্রণালয় / বস্ত্র অধিদপ্তর (DOT)',
    posts: '৪২ জন (০৫টি ক্যাটাগরি)',
    qualification: 'স্নাতক / ডিপ্লোমা / এইচএসসি / এসএসসি পাস',
    deadline: '০৬ সেপ্টেম্বর ২০২৬',
    govtFee: 'সরকারি ফি: ১১২ - ২২৩ ৳',
    summary: 'dotr.teletalk.com.bd পোর্টালে অনলাইন আবেদন চলছে। বয়স ১৮-৩০ বছর।',
    sourceUrl: 'http://dotr.teletalk.com.bd/'
  },
  {
    id: 'job-bpdb-power-board',
    category: 'jobs',
    type: 'বিদ্যুৎ খাত চাকরি',
    badge: 'চাকরি সার্কুলার',
    title: 'বাংলাদেশ বিদ্যুৎ উন্নয়ন বোর্ড (BPDB) নিয়োগ বিজ্ঞপ্তি',
    dept: 'বাংলাদেশ বিদ্যুৎ উন্নয়ন বোর্ড (BPDB)',
    posts: '৩৫০+ জন',
    qualification: 'বিএসসি ইঞ্জিনিয়ারিং / ডিপ্লোমা / স্নাতক / এইচএসসি',
    deadline: 'বিজ্ঞপ্তি অনুযায়ী',
    govtFee: 'সরকারি ফি: ৩০০ - ৫০০ ৳',
    summary: 'bpdb.teletalk.com.bd পোর্টালে বিভিন্ন পদে অনলাইন আবেদন ও ফি জমা।',
    sourceUrl: 'https://bpdb.teletalk.com.bd/'
  },
  {
    id: 'job-primary-dpe',
    category: 'jobs',
    type: 'সরকারি চাকরি',
    badge: 'চাকরি সার্কুলার',
    title: 'সরকারি প্রাথমিক সহকারী শিক্ষক নিয়োগ ও আবেদন',
    dept: 'প্রাথমিক ও গণশিক্ষা অধিদপ্তর (DPE)',
    posts: '৩,৫০০+ জন',
    deadline: 'চলমান আবেদন',
    qualification: 'যেকোনো বিষয়ে স্নাতক/সমমান (ন্যূনতম ২য় বিভাগ/সিজিপিএ ২.২৫)',
    govtFee: 'সরকারি ফি: ২২০ ৳',
    summary: 'টেলিটকের মাধ্যমে dpe.teletalk.com.bd পোর্টালে রংপুর ও রাজশাহী সহ সকল বিভাগে আবেদন।',
    sourceUrl: 'https://dpe.teletalk.com.bd/'
  },
  {
    id: 'job-railway-1085',
    category: 'jobs',
    type: 'সরকারি চাকরি',
    badge: 'চাকরি সার্কুলার',
    title: 'বাংলাদেশ রেলওয়ে সহকারী স্টেশন মাস্টার ও পয়েন্টসম্যান নিয়োগ',
    dept: 'বাংলাদেশ রেলওয়ে (BR)',
    posts: '১০৮৫ জন',
    deadline: 'চলতি মাসের শেষ তারিখ',
    qualification: 'এইচএসসি / এসএসসি / স্নাতক পাস পদ অনুযায়ী',
    govtFee: 'সরকারি ফি: ১১২ - ২২৩ ৳',
    summary: 'পয়েন্টসম্যান, খালাসি, সহকারী স্টেশন মাস্টার পদে অনলাইনে আবেদন চলছে।',
    sourceUrl: 'https://br.teletalk.com.bd/'
  },
  {
    id: 'phulbari-col-218',
    category: 'college',
    type: 'কলেজ ফরম ফিলাপ',
    badge: 'ভর্তি ও পরীক্ষা',
    title: 'ডিগ্রি ১ম বর্ষ পরীক্ষার ফরম পূরণ বিজ্ঞপ্তি',
    dept: 'ফুলবাড়ী সরকারি কলেজ, দিনাজপুর',
    posts: 'সকল নিয়মিত/অনিয়মিত পরীক্ষার্থী',
    qualification: 'ডিগ্রি ১ম বর্ষ শিক্ষাবর্ষের শিক্ষার্থী',
    deadline: 'চলমান সেশন',
    govtFee: 'কলেজ ও বিশ্ববিদ্যালয় নির্ধারিত ফি',
    summary: 'ফুলবাড়ী সরকারি কলেজের ডিগ্রি ১ম বর্ষের অনলাইন ফরম পূরণ ও ফি জমাদান সংক্রান্ত বিজ্ঞপ্তি।',
    sourceUrl: 'https://www.phulbarigovtcollege.edu.bd/general_notice/218'
  },
  {
    id: 'job-police-trc',
    category: 'jobs',
    type: 'প্রতিরক্ষা চাকরি',
    badge: 'চাকরি সার্কুলার',
    title: 'বাংলাদেশ পুলিশ ট্রেইনি রিক্রুট কনস্টেবল (TRC) নিয়োগ',
    dept: 'বাংলাদেশ পুলিশ হেডকোয়ার্টার্স',
    posts: '৪,০০০+ জন',
    deadline: 'বিজ্ঞপ্তি অনুযায়ী',
    qualification: 'এসএসসি / সমমান পাস (ন্যূনতম জিপিএ ২.৫)',
    govtFee: 'সরকারি ফি: ১২০ ৳',
    summary: 'অনলাইনে ট্রেইনি রিক্রুট কনস্টেবল (TRC) পদে আবেদন ও শারীরিক যোগ্যতার ফর্ম পূরণ।',
    sourceUrl: 'https://police.teletalk.com.bd/'
  }
];

let allServices = (typeof window !== 'undefined' && window.OFFLINE_DATA?.services) || ALL_SERVICES_DATA;
let allNotices = (typeof window !== 'undefined' && window.OFFLINE_DATA?.notices) || ALL_NOTICES_DATA;

function initApp() {
  initTheme();
  initShopStatus();
  initMobileMenu();
  populateServiceSelects();
  initChecklistController();
  loadDataAndRender();
  initHeroSearch();
  initHeroMiniNoticeBoard();
  initToolsIfPresent();
  initForms();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// =========================================================================
// ৩. থিম কন্ট্রোলার (Light/Dark Theme)
// =========================================================================
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// =========================================================================
// ৪. লাইভ দোকান খোলার সময়সূচী স্ট্যাটাস
// =========================================================================
function initShopStatus() {
  const statusBadge = document.getElementById('shop-status-badge');
  if (!statusBadge) return;

  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;

  let isOpen = false;
  if (day === 5) {
    // Friday: 4:00 PM (960 min) to 9:00 PM (1260 min)
    isOpen = currentMinutes >= 960 && currentMinutes < 1260;
  } else {
    // Sat - Thu: 10:00 AM (600 min) to 9:00 PM (1260 min)
    isOpen = currentMinutes >= 600 && currentMinutes < 1260;
  }

  if (isOpen) {
    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
    statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 status-dot-open"></span> দোকান খোলা আছে (রাত ৯টা পর্যন্ত)`;
  } else {
    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
    statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> দোকান এখন বন্ধ (সকাল ১০টায় খুলবে)`;
  }
}

// =========================================================================
// ৪.১ লাইভ সার্চ সাজেস্ট কন্ট্রোলার (Homepage Hero Search)
// =========================================================================
function initHeroSearch() {
  const searchInput = document.getElementById('hero-live-search');
  const suggestionsBox = document.getElementById('search-suggestions');
  if (!searchInput || !suggestionsBox) return;

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    if (!val) {
      suggestionsBox.classList.add('hidden');
      suggestionsBox.innerHTML = '';
      return;
    }

    const matchedServices = allServices.filter(s => s.title.toLowerCase().includes(val) || (s.summary && s.summary.toLowerCase().includes(val))).slice(0, 4);
    const matchedNotices = allNotices.filter(n => n.title.toLowerCase().includes(val) || (n.summary && n.summary.toLowerCase().includes(val))).slice(0, 3);

    if (matchedServices.length === 0 && matchedNotices.length === 0) {
      suggestionsBox.innerHTML = `
        <div class="p-4 text-xs font-bold text-slate-500 text-center">
          "${e.target.value}" সম্পর্কিত কোনো সেবা বা নোটিশ পাওয়া যায়নি।
        </div>
      `;
      suggestionsBox.classList.remove('hidden');
      return;
    }

    let html = '<div class="divide-y divide-slate-100 dark:divide-slate-700 max-h-72 overflow-y-auto">';
    if (matchedServices.length > 0) {
      html += '<div class="bg-slate-50 dark:bg-slate-900/80 px-4 py-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">সেবাসমূহ</div>';
      matchedServices.forEach(s => {
        html += `
          <a href="services.html" class="flex items-center justify-between p-3 hover:bg-emerald-50 dark:hover:bg-slate-700/60 transition group">
            <div class="flex items-center gap-2.5">
              <i class="fas ${s.icon || 'fa-landmark'} text-emerald-600 text-xs"></i>
              <div>
                <div class="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-emerald-600">${s.title}</div>
                <div class="text-[10px] text-slate-500">${s.serviceFee || 'ফি দেখুন'}</div>
              </div>
            </div>
            <i class="fas fa-chevron-right text-[10px] text-slate-400"></i>
          </a>
        `;
      });
    }

    if (matchedNotices.length > 0) {
      html += '<div class="bg-slate-50 dark:bg-slate-900/80 px-4 py-1.5 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">চলমান নোটিশ</div>';
      matchedNotices.forEach(n => {
        html += `
          <a href="portal.html#job-circulars-section" class="flex items-center justify-between p-3 hover:bg-blue-50 dark:hover:bg-slate-700/60 transition group">
            <div class="flex items-center gap-2.5">
              <i class="fas fa-bullhorn text-blue-600 text-xs"></i>
              <div>
                <div class="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-blue-600">${n.title}</div>
                <div class="text-[10px] text-rose-500 font-bold">শেষ: ${n.deadline}</div>
              </div>
            </div>
            <i class="fas fa-chevron-right text-[10px] text-slate-400"></i>
          </a>
        `;
      });
    }

    html += '</div>';
    suggestionsBox.innerHTML = html;
    suggestionsBox.classList.remove('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
      suggestionsBox.classList.add('hidden');
    }
  });
}

// =========================================================================
// ৫. মোবাইল ড্রয়ার ও মেনু (স্মার্ট অটো-হাইড ও ৫ সেকেন্ড নিষ্ক্রিয়তায় স্বয়ংক্রিয় বন্ধ)
// =========================================================================
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');
  if (!toggleBtn || !drawer) return;

  let autoHideTimeout = null;

  function clearAutoHide() {
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout);
      autoHideTimeout = null;
    }
  }

  function startAutoHide() {
    clearAutoHide();
    // ব্যবহারকারী কোনো ক্লিক না করলে ৫ সেকেন্ড পর ড্রয়ার একা একাই বন্ধ হয়ে যাবে
    autoHideTimeout = setTimeout(() => {
      closeDrawer();
    }, 5000);
  }

  function closeDrawer() {
    clearAutoHide();
    if (!drawer.classList.contains('hidden')) {
      drawer.classList.add('hidden');
      toggleBtn.setAttribute('aria-expanded', 'false');
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-bars text-base';
      }
    }
  }

  function openDrawer() {
    drawer.classList.remove('hidden');
    toggleBtn.setAttribute('aria-expanded', 'true');
    const icon = toggleBtn.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-times text-base text-rose-500';
    }
    startAutoHide();
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (drawer.classList.contains('hidden')) {
      openDrawer();
    } else {
      closeDrawer();
    }
  });

  // ড্রয়ারে মাউস রাখলে বা টাচ করলে ৫ সেকেন্ডের কাউন্টডাউন থামবে, বাইরে সরালে আবার শুরু হবে
  drawer.addEventListener('mouseenter', clearAutoHide);
  drawer.addEventListener('mouseleave', startAutoHide);
  drawer.addEventListener('touchstart', clearAutoHide, { passive: true });
  drawer.addEventListener('touchend', startAutoHide, { passive: true });

  // ১. ড্রয়ারের ভেতরে যেকোনো লিংকে ক্লিক করলে সাথে সাথে বন্ধ হবে
  drawer.querySelectorAll('a, button').forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });

  // ২. ড্রয়ারের বাইরে পেজের যেকোনো ফাঁকা স্থানে ক্লিক বা টাচ করলে সাথে সাথে বন্ধ হবে
  const handleOutsideClose = (e) => {
    if (!drawer.contains(e.target) && !toggleBtn.contains(e.target)) {
      closeDrawer();
    }
  };
  document.addEventListener('click', handleOutsideClose);
  document.addEventListener('touchstart', handleOutsideClose, { passive: true });
  document.addEventListener('pointerdown', handleOutsideClose);

  // ৩. ব্যবহারকারী পেজ স্ক্রোল করতে শুরু করলে সাথে সাথে বন্ধ হবে
  window.addEventListener('scroll', () => {
    if (!drawer.classList.contains('hidden')) {
      closeDrawer();
    }
  }, { passive: true });

  // ৪. কীবোর্ডের ESC চাপলে বন্ধ হবে
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDrawer();
    }
  });

  // ৫. স্ক্রিন বড় (ডেস্কটপ >= 1024px) হলে নিজে থেকে বন্ধ হয়ে যাবে
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
      closeDrawer();
    }
  });
}

// =========================================================================
// ৬. লাইভ গুগল শিট নোটিশ হ্যান্ডলার ও ইনিশিয়ালাইজেশন (CORS-Free CSV Sync)
// =========================================================================
const GOOGLE_SHEET_NOTICE_CSV_URL = 'https://docs.google.com/spreadsheets/d/1HqbHGm1RnduSp8T1iLfDASs2urGziEwcBWsta1r3WwE/export?format=csv&gid=0';

function parseNoticeCSV(str) {
  const arr = [];
  let row = [''];
  let inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    let c = str[i];
    let next = str[i+1];
    if (c === '"' && inQuotes && next === '"') {
      row[row.length - 1] += '"';
      i++;
    } else if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') { i++; }
      arr.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || (row.length === 1 && row[0] !== '')) arr.push(row);
  return arr;
}

async function fetchLiveGoogleSheetNotices() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return null;
  }
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;
    const res = await fetch(GOOGLE_SHEET_NOTICE_CSV_URL, { signal: controller ? controller.signal : undefined });
    if (timeoutId) clearTimeout(timeoutId);
    if (!res.ok) throw new Error('Sheet fetch status: ' + res.status);
    const text = await res.text();
    const rows = parseNoticeCSV(text);
    
    if (rows && rows.length > 1) {
      const gNotices = rows.slice(1).map((r, i) => {
        const rawType = String(r[0] || '').trim();
        const orgName = String(r[1] || '').trim();
        const postTitle = String(r[2] || '').trim();
        const qualificationDesc = String(r[3] || '').trim();
        const startDate = String(r[4] || '').trim();
        const deadlineDate = String(r[5] || '').trim();
        const dinajpur = String(r[6] || '').trim();
        const applyUrl = String(r[7] || '').trim();
        const isHotNotice = String(r[8] || '').toUpperCase() === 'TRUE' || r[8] === true;
        const daysRemaining = String(r[9] || '').trim();

        let badgeStyle = 'bg-gradient-to-r from-amber-500 to-orange-600 text-white';
        if (rawType.includes('ব্যাংক')) badgeStyle = 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white';
        else if (rawType.includes('বেসরকারি')) badgeStyle = 'bg-gradient-to-r from-purple-600 to-pink-600 text-white';
        else if (rawType.includes('কলেজ') || rawType.includes('স্কুল')) badgeStyle = 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white';

        return {
          id: 'gsheet-notice-' + (i + 1),
          category: (rawType.includes('কলেজ') || rawType.includes('স্কুল')) ? 'college' : 'jobs',
          type: rawType || 'সরকারি চাকরি',
          badge: rawType || 'চাকরি সার্কুলার',
          badgeStyle: badgeStyle,
          title: postTitle || 'চাকরি বিজ্ঞপ্তি',
          org: orgName || 'সরকারি দপ্তর/প্রতিষ্ঠান',
          dept: orgName,
          qualification: qualificationDesc,
          summary: qualificationDesc,
          details: qualificationDesc,
          startDate: startDate,
          deadline: deadlineDate,
          daysLeft: daysRemaining ? `${daysRemaining} দিন বাকি` : 'আবেদন সচল',
          dinajpurEligible: dinajpur,
          applyLink: applyUrl,
          sourceUrl: applyUrl,
          pdfUrl: applyUrl,
          isHot: isHotNotice
        };
      }).filter(n => n.title && n.title !== 'নোটিশের শিরোনাম / পদের নাম');

      if (gNotices.length > 0) {
        console.log(`✅ Loaded ${gNotices.length} live notices from Google Sheet.`);
        try { localStorage.setItem('fayzar_cached_gnotices', JSON.stringify(gNotices)); } catch(e){}
        return gNotices;
      }
    }
  } catch (err) {
    console.warn('Google Sheet Live Sync Notice Warning:', err);
    try {
      const cached = localStorage.getItem('fayzar_cached_gnotices');
      if (cached) return JSON.parse(cached);
    } catch(e){}
  }
  return null;
}

async function loadDataAndRender() {
  try {
    if (window.location.protocol === 'file:' && window.OFFLINE_DATA?.services) {
      allServices = window.OFFLINE_DATA.services;
    } else {
      const sRes = await fetch('data/services.json');
      if (sRes.ok) {
        const fetchedServices = await sRes.json();
        if (Array.isArray(fetchedServices) && fetchedServices.length > 0) {
          allServices = fetchedServices;
        }
      } else if (window.OFFLINE_DATA?.services) {
        allServices = window.OFFLINE_DATA.services;
      }
    }
  } catch(e) {
    allServices = window.OFFLINE_DATA?.services || ALL_SERVICES_DATA;
  }

  // লাইভ গুগল শিট নোটিশ সিঙ্ক
  try {
    if (window.location.protocol === 'file:' && window.OFFLINE_DATA?.notices) {
      allNotices = window.OFFLINE_DATA.notices;
    } else {
      let loadedNotices = null;
      try {
        const liveGNotices = await fetchLiveGoogleSheetNotices();
        if (liveGNotices && liveGNotices.length > 0) {
          loadedNotices = liveGNotices;
        }
      } catch(sheetErr) {}

      if (loadedNotices) {
        // Merge offline college/admission notices if Google Sheets only has jobs
        const hasCollege = loadedNotices.some(n => n.category === 'college' || n.category === 'admissions');
        const fallbackCollege = (window.OFFLINE_DATA?.notices || ALL_NOTICES_DATA || []).filter(n => n.category === 'college' || n.category === 'admissions' || n.category === 'results');
        if (!hasCollege && fallbackCollege.length > 0) {
          allNotices = [...loadedNotices, ...fallbackCollege];
        } else {
          allNotices = loadedNotices;
        }
      } else {
        const nRes = await fetch('data/notices.json');
        if (nRes.ok) {
          const fetchedNotices = await nRes.json();
          if (Array.isArray(fetchedNotices) && fetchedNotices.length > 0) {
            allNotices = fetchedNotices;
          }
        } else if (window.OFFLINE_DATA?.notices) {
          allNotices = window.OFFLINE_DATA.notices;
        }
      }
    }
  } catch(e) {
    allNotices = window.OFFLINE_DATA?.notices || ALL_NOTICES_DATA;
  }

  // সাইট কনফিগারেশন লোড (অ্যাডমিন প্যানেল থেকে সংরক্ষিত)
  try {
    let siteConfig = null;
    if (window.location.protocol === 'file:' && window.OFFLINE_DATA?.site_config) {
      siteConfig = window.OFFLINE_DATA.site_config;
    } else {
      const cfgRes = await fetch('data/site_config.json');
      if (cfgRes.ok) {
        siteConfig = await cfgRes.json();
      } else if (window.OFFLINE_DATA?.site_config) {
        siteConfig = window.OFFLINE_DATA.site_config;
      }
    }
    if (siteConfig && siteConfig.sections) {
      if (siteConfig.sections.checklist === false) {
        const chkSec = document.getElementById('home-checklist-section');
        if (chkSec) chkSec.style.display = 'none';
      }
    }
  } catch(e) {
    if (window.OFFLINE_DATA?.site_config?.sections?.checklist === false) {
      const chkSec = document.getElementById('home-checklist-section');
      if (chkSec) chkSec.style.display = 'none';
    }
  }

  // Populate Dropdowns in forms
  populateServiceSelects();
  initChecklistController();

  // Render on Homepage
  renderHomepageComponents();

  // Render on Services Page (All 19 Services)
  renderServicesPage();

  // Render on Notices Page
  renderNoticesPage();
}

function populateServiceSelects() {
  const svcs = (allServices && allServices.length > 0)
    ? allServices
    : ((typeof window !== 'undefined' && window.OFFLINE_DATA?.services) || ALL_SERVICES_DATA || []);

  const selects = [
    document.getElementById('order-service-select'),
    document.getElementById('calc-service-select')
  ];

  selects.forEach(sel => {
    if (!sel) return;
    if (svcs.length > 0) {
      sel.innerHTML = svcs.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
    }
  });
}

// Helpers for Category Color Badges
function getServiceIconBg(category) {
  if (category === 'land') return 'from-emerald-500 to-teal-700 text-white';
  if (category === 'online') return 'from-blue-600 to-indigo-700 text-white';
  return 'from-purple-600 to-indigo-800 text-white';
}

function getServiceBadgeClass(category) {
  if (category === 'land') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
  if (category === 'online') return 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
  return 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800';
}

// Bangla Number formatting helper
function toBanglaNumber(num) {
  if (num === null || num === undefined) return '';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, d => bnDigits[d]);
}

// Homepage Renderer with High-Contrast Rich Cards & Smooth Infinite Auto-Rotation
// Homepage Renderer with Viewport-Aware Auto-Rotation & Card-Only Hover Pause
function renderHomepageComponents() {
  // ১. সেবাসমূহ কম্পোনেন্ট কন্ট্রোলার
  const serviceContainer = document.getElementById('home-services-container');
  if (serviceContainer) {
    const serviceBatchSize = 6;
    let activeHomeCategory = 'all';
    let homeSearchQuery = '';
    let currentServiceBatch = 0;
    let serviceAutoTimer = null;
    let isServiceCardHovered = false;
    let isSearchBoxFocused = false;

    const serviceIndicator = document.getElementById('service-batch-indicator');
    const serviceDotsContainer = document.getElementById('service-dots-container');
    const servicePrevBtn = document.getElementById('service-prev-btn');
    const serviceNextBtn = document.getElementById('service-next-btn');
    const servicesCycleStatus = document.getElementById('services-cycle-status');
    const homeSearchInput = document.getElementById('home-service-search-input');
    const homeTabBtns = document.querySelectorAll('.home-service-tab-btn');

    function updateServiceCycleStatus(hovered) {
      if (!servicesCycleStatus) return;
      if (hovered) {
        servicesCycleStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span> বিরতি (সেবা কার্ডে মাউস)';
        servicesCycleStatus.className = 'inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
      } else {
        servicesCycleStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 status-dot-open"></span> অটো-রোটেশন সচল (প্রতি ৩ সে.)';
        servicesCycleStatus.className = 'inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
      }
    }

    // Update Category Badges Count
    const landCount = allServices.filter(s => s.category === 'land').length;
    const onlineCount = allServices.filter(s => s.category === 'online').length;
    const computerCount = allServices.filter(s => s.category === 'computer').length;

    const countLandEl = document.getElementById('home-count-land');
    const countOnlineEl = document.getElementById('home-count-online');
    const countComputerEl = document.getElementById('home-count-computer');
    const countAllEl = document.getElementById('home-count-all');

    if (countLandEl) countLandEl.textContent = toBanglaNumber(landCount);
    if (countOnlineEl) countOnlineEl.textContent = toBanglaNumber(onlineCount);
    if (countComputerEl) countComputerEl.textContent = toBanglaNumber(computerCount);
    if (countAllEl) countAllEl.textContent = toBanglaNumber(allServices.length);

    function getFilteredServices() {
      let list = allServices;
      if (activeHomeCategory !== 'all') {
        list = list.filter(s => s.category === activeHomeCategory);
      }
      if (homeSearchQuery.trim()) {
        const q = homeSearchQuery.toLowerCase();
        list = list.filter(s => s.title.toLowerCase().includes(q) || (s.summary && s.summary.toLowerCase().includes(q)));
      }
      return list;
    }

    function renderServiceBatch(batchIdx) {
      const filtered = getFilteredServices();
      const totalBatches = Math.max(1, Math.ceil(filtered.length / serviceBatchSize));
      currentServiceBatch = (batchIdx + totalBatches) % totalBatches;
      
      const start = currentServiceBatch * serviceBatchSize;
      const end = Math.min(start + serviceBatchSize, filtered.length);
      const servicesToShow = filtered.slice(start, end);

      if (filtered.length === 0) {
        serviceContainer.innerHTML = `
          <div class="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md">
            <i class="fas fa-search text-4xl text-slate-400 mb-3"></i>
            <p class="text-xs font-extrabold text-slate-500">কোনো সেবা পাওয়া যায়নি।</p>
          </div>
        `;
        if (serviceIndicator) serviceIndicator.textContent = '০ টি সেবা';
        if (serviceDotsContainer) serviceDotsContainer.innerHTML = '';
        return;
      }

      serviceContainer.innerHTML = servicesToShow.map((s, idx) => `
        <div class="service-card card-accent-${s.category || 'land'} p-5 sm:p-6 flex flex-col justify-between rotate-card-enter stagger-${(idx % 6) + 1}">
          <div>
            <div class="flex items-center gap-3.5 mb-3">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${getServiceIconBg(s.category)} shadow-md flex items-center justify-center text-xl flex-shrink-0">
                <i class="fas ${s.icon || 'fa-landmark'}"></i>
              </div>
              <div>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${getServiceBadgeClass(s.category)}">
                  ${s.badge || 'ডিজিটাল সেবা'}
                </span>
                <h3 class="text-base font-black text-slate-900 dark:text-white leading-snug mt-1">${s.title}</h3>
              </div>
            </div>

            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">${s.summary || ''}</p>
            
            <div class="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900/90 dark:to-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs mb-4">
              <div class="text-slate-800 dark:text-slate-200 font-semibold flex justify-between">
                <span class="text-slate-500 dark:text-slate-400">সরকারি ফি:</span>
                <strong class="text-slate-900 dark:text-white text-right">${s.govtFee || 'নির্ধারিত ফি'}</strong>
              </div>
              <div class="text-emerald-800 dark:text-emerald-300 font-extrabold flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>দোকান চার্জ:</span>
                <span class="bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-300">${s.serviceFee || '৫০ - ১০০ ৳'}</span>
              </div>
            </div>
          </div>

          <a href="services.html" class="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2">
            <span>কাগজপত্রের চেকলিস্ট দেখুন</span>
            <i class="fas fa-arrow-right text-[11px]"></i>
          </a>
        </div>
      `).join('');

      if (serviceIndicator) {
        serviceIndicator.textContent = `সেবা ${toBanglaNumber(start + 1)}-${toBanglaNumber(end)} / ${toBanglaNumber(filtered.length)}`;
      }

      if (serviceDotsContainer) {
        serviceDotsContainer.innerHTML = Array.from({ length: totalBatches }).map((_, i) => `
          <button type="button" aria-label="ব্যাচ ${i + 1}" class="h-2 rounded-full transition-all duration-300 ${i === currentServiceBatch ? 'w-7 bg-emerald-600 dark:bg-emerald-400' : 'w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'}" onclick="window.setHomeServiceBatch(${i})"></button>
        `).join('');
      }
    }

    window.setHomeServiceBatch = function(idx) {
      renderServiceBatch(idx);
      resetServiceAutoTimer();
    };

    function nextServiceBatch() {
      const filtered = getFilteredServices();
      const totalBatches = Math.max(1, Math.ceil(filtered.length / serviceBatchSize));
      renderServiceBatch((currentServiceBatch + 1) % totalBatches);
    }

    function prevServiceBatch() {
      const filtered = getFilteredServices();
      const totalBatches = Math.max(1, Math.ceil(filtered.length / serviceBatchSize));
      renderServiceBatch((currentServiceBatch - 1 + totalBatches) % totalBatches);
    }

    function startServiceAutoTimer() {
      clearInterval(serviceAutoTimer);
      serviceAutoTimer = setInterval(() => {
        if (!isServiceCardHovered && !isSearchBoxFocused && !homeSearchQuery.trim() && activeHomeCategory === 'all') {
          nextServiceBatch();
        }
      }, 3000);
    }

    function resetServiceAutoTimer() {
      startServiceAutoTimer();
    }

    servicePrevBtn?.addEventListener('click', () => { prevServiceBatch(); resetServiceAutoTimer(); });
    serviceNextBtn?.addEventListener('click', () => { nextServiceBatch(); resetServiceAutoTimer(); });

    // Category Tabs click listeners
    homeTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        homeTabBtns.forEach(b => {
          b.className = 'home-service-tab-btn px-4 py-2.5 rounded-xl text-xs font-bold border bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-xs flex items-center gap-1.5';
        });
        btn.className = 'home-service-tab-btn active px-4 py-2.5 rounded-xl text-xs font-black border bg-emerald-600 text-white shadow-md transition flex items-center gap-1.5';
        activeHomeCategory = btn.dataset.homeCategory || 'all';
        renderServiceBatch(0);
        resetServiceAutoTimer();
      });
    });

    // Search Input listener
    if (homeSearchInput) {
      homeSearchInput.addEventListener('input', (e) => {
        homeSearchQuery = e.target.value;
        renderServiceBatch(0);
        resetServiceAutoTimer();
      });
      homeSearchInput.addEventListener('focus', () => {
        isSearchBoxFocused = true;
        updateServiceCycleStatus(true);
      });
      homeSearchInput.addEventListener('blur', () => {
        isSearchBoxFocused = false;
        updateServiceCycleStatus(false);
      });
    }

    // শুধুমাত্র সেবা কার্ডের ওপর মাউস নিলে বিরতি, ফাঁকা অংশে বা বাইরে থাকলে অটো-রোটেট চলবে
    serviceContainer.addEventListener('mouseover', (e) => {
      if (e.target.closest('.service-card')) {
        isServiceCardHovered = true;
        updateServiceCycleStatus(true);
      }
    });

    serviceContainer.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.service-card');
      const nextCard = e.relatedTarget?.closest('.service-card');
      if (card && card !== nextCard) {
        isServiceCardHovered = false;
        updateServiceCycleStatus(false);
      }
    });

    renderServiceBatch(0);
    startServiceAutoTimer();
  }

  // ২. স্কুল ও কলেজ সংক্রান্ত নোটিশ বুলেটিন কম্পোনেন্ট কন্ট্রোলার (Homepage School/College Notice Bulletin)
  const homeNoticeContainer = document.getElementById('home-notices-container');
  if (homeNoticeContainer) {
    const noticeBatchSize = 3;
    let currentNoticeBatch = 0;
    let noticeAutoTimer = null;
    let isNoticeHovered = false;

    const noticeIndicator = document.getElementById('notice-page-indicator');
    const noticeDotsContainer = document.getElementById('notice-dots-container');
    const noticePrevBtn = document.getElementById('notice-prev-btn');
    const noticeNextBtn = document.getElementById('notice-next-btn');
    const noticesCycleStatus = document.getElementById('notices-cycle-status');

    // Filter school/college/admission/exam notices
    let schoolCollegeNotices = allNotices.filter(n => 
      n.category === 'admissions' || 
      n.category === 'college' || 
      n.category === 'results' ||
      (n.org && (n.org.includes('কলেজ') || n.org.includes('বিশ্ববিদ্যালয়') || n.org.includes('বোর্ড') || n.org.includes('স্কুল') || n.org.includes('অধিদপ্তর'))) ||
      (n.title && (n.title.includes('ফরম পূরণ') || n.title.includes('ভর্তি') || n.title.includes('পরীক্ষা') || n.title.includes('ডিগ্রি') || n.title.includes('অনার্স') || n.title.includes('প্রবেশপত্র')))
    );

    if (schoolCollegeNotices.length === 0) {
      schoolCollegeNotices = ALL_NOTICES_DATA.filter(n => n.category === 'admissions' || n.category === 'results' || (n.org && n.org.includes('কলেজ')));
      if (schoolCollegeNotices.length === 0) schoolCollegeNotices = allNotices;
    }

    const totalNoticeBatches = Math.max(1, Math.ceil(schoolCollegeNotices.length / noticeBatchSize));

    function renderHomeNoticeBatch(batchIdx) {
      currentNoticeBatch = (batchIdx + totalNoticeBatches) % totalNoticeBatches;
      const start = currentNoticeBatch * noticeBatchSize;
      const end = Math.min(start + noticeBatchSize, schoolCollegeNotices.length);
      const batchList = schoolCollegeNotices.slice(start, end);

      if (batchList.length === 0) {
        homeNoticeContainer.innerHTML = '<div class="col-span-full text-center py-6 text-slate-300 text-xs font-bold">বর্তমানে কোনো স্কুল বা কলেজের নোটিশ নেই।</div>';
        return;
      }

      homeNoticeContainer.innerHTML = batchList.map(n => {
        const typeBadge = n.type || 'কলেজ নোটিশ';
        const deadline = n.deadline || 'চলমান';
        const org = n.org || 'ফুলবাড়ী সরকারি কলেজ';
        const pdfLink = n.pdfUrl || n.sourceUrl || 'portal.html';
        const whatsappMsg = `আসসালামু আলাইকুম, আমি "${n.title}" (${org}) নোটিশ সম্পর্কে অনলাইন আবেদন/ফরম পূরণের সেবা নিতে চাচ্ছি।`;

        return `
          <div class="p-5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-white/20 dark:border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-3 group text-slate-800 dark:text-slate-100">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                  <i class="fas fa-graduation-cap mr-1"></i> ${typeBadge}
                </span>
                <span class="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <i class="far fa-calendar-alt"></i> ${deadline}
                </span>
              </div>

              <div class="text-[11px] font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <i class="fas fa-school text-xs"></i>
                <span class="truncate">${org}</span>
              </div>

              <h4 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                ${n.title}
              </h4>

              <p class="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                ${n.details || n.qualification || n.summary || 'বিস্তারিত তথ্যের জন্য ক্লিক করুন।'}
              </p>
            </div>

            <div class="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
              <a href="https://wa.me/8801717101919?text=${encodeURIComponent(whatsappMsg)}" target="_blank" class="font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1">
                <i class="fab fa-whatsapp text-emerald-600"></i> <span>হেল্পলাইন</span>
              </a>
              ${n.sourceUrl || n.pdfUrl ? `
                <a href="${pdfLink}" target="_blank" rel="noopener" class="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 text-[11px] font-black transition flex items-center gap-1">
                  <span>বিজ্ঞপ্তি দেখুন</span>
                  <i class="fas fa-arrow-up-right-from-square text-[9px]"></i>
                </a>
              ` : `
                <a href="portal.html" class="px-3 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-black transition flex items-center gap-1">
                  <span>জব পোর্টাল</span>
                  <i class="fas fa-arrow-right text-[9px]"></i>
                </a>
              `}
            </div>
          </div>
        `;
      }).join('');

      if (noticeIndicator) {
        noticeIndicator.textContent = `${toBanglaNumber(currentNoticeBatch + 1)}/${toBanglaNumber(totalNoticeBatches)}`;
      }

      if (noticeDotsContainer) {
        noticeDotsContainer.innerHTML = Array.from({ length: totalNoticeBatches }).map((_, i) => `
          <button type="button" aria-label="নোটিশ ব্যাচ ${i + 1}" class="h-2 rounded-full transition-all duration-300 ${i === currentNoticeBatch ? 'w-6 bg-amber-400' : 'w-2 bg-white/40 hover:bg-white/70'}" onclick="window.setHomeNoticeBatch(${i})"></button>
        `).join('');
      }
    }

    window.setHomeNoticeBatch = function(idx) {
      renderHomeNoticeBatch(idx);
      resetNoticeAutoTimer();
    };

    function nextHomeNoticeBatch() {
      renderHomeNoticeBatch(currentNoticeBatch + 1);
    }

    function prevHomeNoticeBatch() {
      renderHomeNoticeBatch(currentNoticeBatch - 1);
    }

    function startNoticeAutoTimer() {
      clearInterval(noticeAutoTimer);
      noticeAutoTimer = setInterval(() => {
        if (!isNoticeHovered) {
          nextHomeNoticeBatch();
        }
      }, 4000);
    }

    function resetNoticeAutoTimer() {
      startNoticeAutoTimer();
    }

    noticePrevBtn?.addEventListener('click', () => { prevHomeNoticeBatch(); resetNoticeAutoTimer(); });
    noticeNextBtn?.addEventListener('click', () => { nextHomeNoticeBatch(); resetNoticeAutoTimer(); });

    homeNoticeContainer.addEventListener('mouseenter', () => {
      isNoticeHovered = true;
      if (noticesCycleStatus) {
        noticesCycleStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span> বিরতি (মাউস রাখা হয়েছে)';
      }
    });

    homeNoticeContainer.addEventListener('mouseleave', () => {
      isNoticeHovered = false;
      if (noticesCycleStatus) {
        noticesCycleStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 status-dot-open"></span> অটো-রোটেশন সচল';
      }
    });

    renderHomeNoticeBatch(0);
    startNoticeAutoTimer();
  }

  // ৩. ডিজিটাল ও ভূমিসেবামূল্য এবং চেকলিস্ট ক্যালকুলেটর কন্ট্রোলার
  initChecklistController();

  // ৪. হিরো সেকশন মিনি নোটিশ বোর্ড কন্ট্রোলার (২টি করে নোটিশ স্বয়ংক্রিয় রোটেশন)
  initHeroMiniNoticeBoard();
}

// ৪. হিরো সেকশন মিনি নোটিশ বোর্ড কন্ট্রোলার (Homepage Hero Mini Notice Board)
function initHeroMiniNoticeBoard() {
  const container = document.getElementById('hero-notices-container');
  if (!container) return;

  const counterEl = document.getElementById('hero-notice-counter');
  const prevBtn = document.getElementById('hero-notice-prev');
  const nextBtn = document.getElementById('hero-notice-next');
  const boardEl = document.getElementById('hero-notice-board');

  // Filter all active job, admission, and college notices
  let noticeList = (typeof allNotices !== 'undefined' && Array.isArray(allNotices) && allNotices.length > 0)
    ? allNotices
    : ((typeof window !== 'undefined' && window.OFFLINE_DATA?.notices) || ALL_NOTICES_DATA || []);

  if (!noticeList || noticeList.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 text-slate-500 dark:text-slate-400 text-xs font-bold">
        বর্তমানে কোনো সক্রিয় নোটিশ নেই।
      </div>
    `;
    if (counterEl) counterEl.textContent = '০/০';
    return;
  }

  const batchSize = 2; // Exactly 2 notices at a time
  const totalBatches = Math.max(1, Math.ceil(noticeList.length / batchSize));
  let currentBatch = 0;
  let autoTimer = null;
  let isPaused = false;

  function renderBatch(batchIdx) {
    currentBatch = (batchIdx + totalBatches) % totalBatches;
    const start = currentBatch * batchSize;
    const batchItems = noticeList.slice(start, start + batchSize);

    if (counterEl) {
      counterEl.textContent = `${toBanglaNumber(currentBatch + 1)}/${toBanglaNumber(totalBatches)}`;
    }

    container.style.opacity = '0';
    setTimeout(() => {
      container.innerHTML = batchItems.map(n => {
        const isJob = n.category === 'jobs';
        const badgeText = n.badge || (isJob ? 'চাকরি সার্কুলার' : 'ভর্তি ও নোটিশ');
        const badgeBg = isJob
          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
          : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white';
        const deadlineText = n.deadline || 'চলমান';
        const orgText = n.dept || n.org || 'সরকারি প্রতিষ্ঠান';

        return `
          <div onclick="openNoticeModal('${n.id}')" class="p-2.5 sm:p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-slate-800 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-2xs">
            <div class="flex items-center justify-between gap-2">
              <span class="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wide ${badgeBg} shadow-2xs shrink-0">
                ${isJob ? '💼 ' : '🎓 '}${badgeText}
              </span>
              <span class="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1 shrink-0">
                <i class="fa-regular fa-clock text-[9px]"></i> শেষ: ${deadlineText}
              </span>
            </div>

            <h4 class="text-xs font-black text-slate-900 dark:text-white leading-snug line-clamp-1 mt-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" title="${n.title}">
              ${n.title}
            </h4>

            <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              <span class="line-clamp-1 flex items-center gap-1 text-[10.5px]">
                <i class="fa-solid fa-building text-[9px] text-emerald-600 dark:text-emerald-400"></i>
                <span>${orgText}</span>
              </span>
              <div class="flex items-center gap-2 shrink-0">
                ${(n.sourceUrl || n.pdfUrl || n.link) ? `
                  <a href="${n.sourceUrl || n.pdfUrl || n.link}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5" title="সরাসরি আবেদন লিংক">
                    <i class="fa-solid fa-arrow-up-right-from-square text-[8px]"></i> আবেদন লিংক
                  </a>
                ` : ''}
                <span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 group-hover:underline flex items-center gap-0.5">
                  বিস্তারিত <i class="fa-solid fa-chevron-right text-[8px]"></i>
                </span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      container.style.opacity = '1';
      if (window.FayzarUI && window.FayzarUI.getLang() === 'en' && window.FayzarLang) {
        window.FayzarLang.translateDOMTextNodes('en');
      }
    }, 150);
  }

  function nextBatch() {
    renderBatch(currentBatch + 1);
  }

  function prevBatch() {
    renderBatch(currentBatch - 1);
  }

  function startAutoTimer() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      if (!isPaused) {
        nextBatch();
      }
    }, 4500);
  }

  function resetAutoTimer() {
    startAutoTimer();
  }

  prevBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    prevBatch();
    resetAutoTimer();
  });

  nextBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    nextBatch();
    resetAutoTimer();
  });

  if (boardEl) {
    boardEl.addEventListener('mouseenter', () => { isPaused = true; });
    boardEl.addEventListener('mouseleave', () => { isPaused = false; });
    boardEl.addEventListener('touchstart', () => { isPaused = true; }, { passive: true });
    boardEl.addEventListener('touchend', () => { isPaused = false; }, { passive: true });
  }

  renderBatch(0);
  startAutoTimer();
}

let checklistAutoTimer = null;

function initChecklistController() {
  const checklistResultDisplay = document.getElementById('calc-result-display');
  const calcSelect = document.getElementById('calc-service-select');
  if (!checklistResultDisplay || !calcSelect) return;

  if (!calcSelect.options || calcSelect.options.length === 0) {
    populateServiceSelects();
  }

  const svcs = (allServices && allServices.length > 0)
    ? allServices
    : ((typeof window !== 'undefined' && window.OFFLINE_DATA?.services) || ALL_SERVICES_DATA || []);

  const checklistServices = svcs.filter(s => s.includeInChecklist !== false);
  const list = checklistServices.length > 0 ? checklistServices : svcs;
  if (!list || list.length === 0) return;

  let currentChecklistIdx = 0;
  clearInterval(checklistAutoTimer);
  checklistAutoTimer = null;
  let isChecklistHovered = false;
  let isChecklistSelectFocused = false;

  const checklistIndicator = document.getElementById('checklist-service-indicator');
  const checklistPrevBtn = document.getElementById('checklist-prev-btn');
  const checklistNextBtn = document.getElementById('checklist-next-btn');
  const checklistCycleStatus = document.getElementById('checklist-cycle-status');
  const checklistCard = checklistResultDisplay.closest('.rounded-3xl') || checklistResultDisplay;

  function updateChecklistCycleStatus(paused) {
    if (!checklistCycleStatus) return;
    if (paused) {
      checklistCycleStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span> বিরতি (মাউস রাখা হয়েছে)';
      checklistCycleStatus.className = 'inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
    } else {
      checklistCycleStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 status-dot-open"></span> অটো-রোটেশন সচল (প্রতি ৩ সে.)';
      checklistCycleStatus.className = 'inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
    }
  }

  function renderChecklist(idx) {
    if (list.length === 0) {
      checklistResultDisplay.innerHTML = '<div class="text-center py-6 text-slate-400 font-bold text-xs">কোনো চেকলিস্ট তথ্য পাওয়া যায়নি।</div>';
      return;
    }

    currentChecklistIdx = (idx + list.length) % list.length;
    const s = list[currentChecklistIdx];

    // ড্রপডাউন ভ্যালু সিঙ্ক
    if (calcSelect.value !== s.id) {
      calcSelect.value = s.id;
    }

    // ইনডিকেটর আপডেট
    if (checklistIndicator) {
      checklistIndicator.textContent = `সেবা ${toBanglaNumber(currentChecklistIdx + 1)}/${toBanglaNumber(list.length)}`;
    }

    const docs = Array.isArray(s.documents) ? s.documents : [];
    const whatsappMsg = `আসসালামু আলাইকুম, আমি "${s.title}" সেবাটি নিতে আগ্রহী। প্রয়োজনীয় কাগজপত্র ও ফি সম্পর্কে বিস্তারিত জানতে চাচ্ছি।`;

    checklistResultDisplay.innerHTML = `
      <div class="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">
        <!-- Top Service Info Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-emerald-50/50 dark:from-slate-900/90 dark:via-slate-800/80 dark:to-emerald-950/30 border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${getServiceIconBg(s.category)} shadow-md flex items-center justify-center text-xl flex-shrink-0">
              <i class="fas ${s.icon || 'fa-landmark'}"></i>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${getServiceBadgeClass(s.category)}">
                  ${s.badge || 'জনপ্রিয় সেবা'}
                </span>
                ${s.duration ? `
                  <span class="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <i class="fas fa-clock text-[9px]"></i> ডেলিভারি: ${s.duration}
                  </span>
                ` : ''}
              </div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">${s.title}</h3>
            </div>
          </div>
          ${s.portal ? `
            <div class="self-start sm:self-auto">
              <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs">
                <i class="fas fa-globe text-emerald-600"></i> ${s.portal}
              </span>
            </div>
          ` : ''}
        </div>

        <!-- Description / Summary -->
        ${s.summary ? `
          <p class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <i class="fas fa-circle-info text-emerald-600 mr-1.5"></i> ${s.summary}
          </p>
        ` : ''}

        <!-- Fee Breakdown Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-1.5 shadow-2xs">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <i class="fas fa-building-columns text-slate-500"></i> সরকারি রাজস্ব ফি
              </span>
              <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">অফিসিয়াল</span>
            </div>
            <div class="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              ${s.govtFee || 'সরকারি নির্ধারিত ফি'}
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex flex-col justify-between space-y-1.5 shadow-2xs">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <i class="fas fa-desktop text-emerald-600"></i> কম্পিউটার সার্ভিস চার্জ
              </span>
              <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">দোকান ফি</span>
            </div>
            <div class="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400">
              ${s.serviceFee || '৫০ - ১০০ ৳'}
            </div>
          </div>
        </div>

        <!-- Required Documents Checklist -->
        <div class="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 border-2 border-emerald-500/20 shadow-xs space-y-3">
          <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <h4 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <i class="fas fa-list-check text-emerald-600"></i> সাথে যা যা আনতে হবে (কাগজপত্রের চেকলিস্ট):
            </h4>
            <span class="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
              ${toBanglaNumber(docs.length)} টি কাগজপত্র
            </span>
          </div>

          ${docs.length > 0 ? `
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-800 dark:text-slate-200">
              ${docs.map((doc, dIdx) => `
                <li class="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 hover:border-emerald-500/50 transition-colors shadow-2xs">
                  <span class="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0 text-[10px] font-black mt-0.5">
                    ${toBanglaNumber(dIdx + 1)}
                  </span>
                  <span class="font-bold leading-relaxed">${doc}</span>
                </li>
              `).join('')}
            </ul>
          ` : `
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">এই সেবার জন্য সরাসরি দোকানে যোগাযোগ করুন অথবা প্রয়োজনীয় নথি সাথে নিয়ে আসুন।</p>
          `}
        </div>

        <!-- Quick Action CTA Buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <a href="https://wa.me/8801717101919?text=${encodeURIComponent(whatsappMsg)}" target="_blank" rel="noopener" class="w-full sm:w-auto flex-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-extrabold py-3 px-5 rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2">
            <i class="fab fa-whatsapp text-base text-emerald-200"></i>
            <span>এই সেবার জন্য WhatsApp-এ মেসেজ দিন</span>
          </a>
          <a href="tel:01717101919" class="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 shadow-xs">
            <i class="fas fa-phone-alt text-emerald-600"></i>
            <span>সরাসরি কল: 01717-101919</span>
          </a>
        </div>
      </div>
    `;
    if (window.FayzarUI && window.FayzarUI.getLang() === 'en' && window.FayzarLang) {
      window.FayzarLang.translateDOMTextNodes('en');
    }
  }

  function startChecklistAutoTimer() {
    clearInterval(checklistAutoTimer);
    checklistAutoTimer = setInterval(() => {
      if (!isChecklistHovered && !isChecklistSelectFocused) {
        renderChecklist(currentChecklistIdx + 1);
      }
    }, 3000);
  }

  function resetChecklistAutoTimer() {
    startChecklistAutoTimer();
  }

  if (!calcSelect.getAttribute('data-events-bound')) {
    calcSelect.setAttribute('data-events-bound', 'true');

    // Prev / Next বাটন
    checklistPrevBtn?.addEventListener('click', () => {
      renderChecklist(currentChecklistIdx - 1);
      resetChecklistAutoTimer();
    });

    checklistNextBtn?.addEventListener('click', () => {
      renderChecklist(currentChecklistIdx + 1);
      resetChecklistAutoTimer();
    });

    // ড্রপডাউন সিলেক্ট ইভেন্ট
    calcSelect.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const foundIdx = list.findIndex(s => s.id === selectedId);
      if (foundIdx !== -1) {
        renderChecklist(foundIdx);
        resetChecklistAutoTimer();
      }
    });

    calcSelect.addEventListener('focus', () => {
      isChecklistSelectFocused = true;
      updateChecklistCycleStatus(true);
    });

    calcSelect.addEventListener('blur', () => {
      isChecklistSelectFocused = false;
      updateChecklistCycleStatus(false);
    });

    // মাউস নিলে অটো-রোটেশন বিরতি
    checklistCard.addEventListener('mouseenter', () => {
      isChecklistHovered = true;
      updateChecklistCycleStatus(true);
    });

    checklistCard.addEventListener('mouseleave', () => {
      isChecklistHovered = false;
      updateChecklistCycleStatus(false);
    });
  }

  // প্রথম রেন্ডার ও টাইমার শুরু
  renderChecklist(0);
  startChecklistAutoTimer();
}

window.initChecklistController = initChecklistController;

function renderServicesPage() {
  const gridContainer = document.getElementById('services-grid-container');
  const searchInput = document.getElementById('service-search-input');
  if (!gridContainer) return;

  const landCount = allServices.filter(s => s.category === 'land').length;
  const onlineCount = allServices.filter(s => s.category === 'online').length;
  const computerCount = allServices.filter(s => s.category === 'computer').length;

  const countLand = document.getElementById('count-land-services');
  const countOnline = document.getElementById('count-online-services');
  const countComputer = document.getElementById('count-computer-services');
  const countAll = document.getElementById('count-all-services');

  if (countLand) countLand.textContent = toBanglaNumber(landCount);
  if (countOnline) countOnline.textContent = toBanglaNumber(onlineCount);
  if (countComputer) countComputer.textContent = toBanglaNumber(computerCount);
  if (countAll) countAll.textContent = toBanglaNumber(allServices.length);

  // ক্যাটাগরি অনুযায়ী অটো রোটেশন স্টেট
  const CATEGORIES = ['land', 'online', 'computer'];
  let currentCategoryIndex = 0;
  let activeCategory = 'land';
  let searchQueryText = '';
  let categoryRotateTimer = null;
  let isMouseOverServices = false;

  function renderCategory(cat) {
    activeCategory = cat;

    // ক্যাটাগরি বাটনগুলোর স্টাইল আপডেট
    document.querySelectorAll('.service-tab-btn').forEach(btn => {
      const isSelected = btn.dataset.category === cat;
      const countBadge = btn.querySelector('span');

      if (isSelected) {
        btn.className = 'service-tab-btn active px-4 py-2.5 rounded-xl text-xs font-black border bg-emerald-600 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer';
        if (countBadge) countBadge.className = 'px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black';
      } else {
        btn.className = 'service-tab-btn px-4 py-2.5 rounded-xl text-xs font-bold border bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-xs flex items-center gap-1.5 cursor-pointer';
        if (countBadge) countBadge.className = 'px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-[10px] font-extrabold';
      }
    });

    // ফিল্টার অনুযায়ী সেবা লিস্ট
    let list = allServices;
    if (cat !== 'all') {
      list = list.filter(s => s.category === cat);
    }
    if (searchQueryText.trim()) {
      const q = searchQueryText.toLowerCase();
      list = list.filter(s => s.title.toLowerCase().includes(q) || (s.summary && s.summary.toLowerCase().includes(q)));
    }

    if (list.length === 0) {
      gridContainer.innerHTML = `
        <div class="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md">
          <i class="fas fa-search text-4xl text-slate-400 mb-3"></i>
          <p class="text-xs font-extrabold text-slate-500">কোনো সেবা পাওয়া যায়নি।</p>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = list.map(s => `
      <div class="service-card card-accent-${s.category || 'land'} p-5 sm:p-6 flex flex-col justify-between transition-all duration-300">
        <div>
          <div class="flex items-center gap-3.5 mb-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${getServiceIconBg(s.category)} shadow-md flex items-center justify-center text-xl flex-shrink-0">
              <i class="fas ${s.icon || 'fa-layer-group'}"></i>
            </div>
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${getServiceBadgeClass(s.category)}">
                ${s.badge || 'জনপ্রিয় সেবা'}
              </span>
              <h3 class="text-base font-black text-slate-900 dark:text-white leading-snug mt-1">${s.title}</h3>
            </div>
          </div>

          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">${s.summary || ''}</p>
          
          <div class="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900/90 dark:to-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs mb-4">
            <div class="text-slate-800 dark:text-slate-200 font-semibold flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">সরকারি রাজস্ব ফি:</span>
              <strong class="text-slate-900 dark:text-white text-right">${s.govtFee || 'নির্ধারিত'}</strong>
            </div>
            <div class="text-emerald-800 dark:text-emerald-300 font-extrabold flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>কম্পিউটার চার্জ:</span>
              <span class="bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-300">${s.serviceFee || '৫০-১০০৳'}</span>
            </div>
            <div class="text-slate-700 dark:text-slate-300 font-semibold flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
              <span class="text-slate-500 dark:text-slate-400">সময়কাল:</span>
              <span class="text-amber-700 dark:text-amber-400 font-bold">${s.duration || 'তাৎক্ষণিক'}</span>
            </div>
          </div>
        </div>

        <button onclick="openServiceModal('${s.id}')" class="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2">
          <i class="fas fa-list-check"></i> <span>কাগজপত্র ও বিস্তারিত গাইড</span>
        </button>
      </div>
    `).join('');
  }

  // অটো-রোটেশন টাইমার: প্রতি ৩.৫ সেকেন্ড পর পর এক ক্যাটাগরি থেকে অন্য ক্যাটাগরিতে যাবে
  function startCategoryAutoTimer() {
    clearInterval(categoryRotateTimer);
    categoryRotateTimer = setInterval(() => {
      // যদি মাউস কার্ডের ওপর থাকে, সার্চ চলতে থাকে বা 'সকল সেবা' দেখা হয়, তবে ক্যাটাগরি রোটেট থামবে
      if (!isMouseOverServices && !searchQueryText.trim() && activeCategory !== 'all') {
        currentCategoryIndex = (currentCategoryIndex + 1) % CATEGORIES.length;
        renderCategory(CATEGORIES[currentCategoryIndex]);
      }
    }, 3500);
  }

  function resetCategoryTimer() {
    startCategoryAutoTimer();
  }

  // মাউস কার্ডের ওপর নিলে রোটেশন সাময়িক বিরতি (Pause)
  gridContainer.addEventListener('mouseenter', () => {
    isMouseOverServices = true;
  });

  gridContainer.addEventListener('mouseleave', () => {
    isMouseOverServices = false;
  });

  // ক্যাটাগরি বাটনে ক্লিক হ্যান্ডলার
  document.querySelectorAll('.service-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category || 'all';
      if (cat !== 'all') {
        const foundIdx = CATEGORIES.indexOf(cat);
        if (foundIdx !== -1) currentCategoryIndex = foundIdx;
      }
      renderCategory(cat);
      resetCategoryTimer();
    });
  });

  // সার্চ ইনপুট হ্যান্ডলার
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQueryText = e.target.value;
      renderCategory(activeCategory);
      resetCategoryTimer();
    });
  }

  // প্রারম্ভিক রেন্ডার (প্রথম ক্যাটাগরি: ভূমিসেবা) এবং অটো-রোটেশন চালু
  renderCategory('land');
  startCategoryAutoTimer();
}

// Notices Page Renderer
// Notices Page Renderer with Category Auto-Cycle
function renderNoticesPage() {
  const noticesContainer = document.getElementById('notices-cards-container');
  const searchInput = document.getElementById('notice-search-input');
  if (!noticesContainer) return;

  const categories = ['college', 'jobs', 'all'];
  const catNames = {
    'college': 'স্কুল-কলেজ সংক্রান্ত নোটিশ',
    'jobs': 'চাকুরির সার্কুলার',
    'all': 'সকল নোটিশ'
  };

  let currentCategory = 'college';
  let categoryCycleTimer = null;
  let isNoticeUserInteracted = false;

  function renderNotices(category = 'college', searchQuery = '') {
    currentCategory = category;
    let list = allNotices;
    
    if (category === 'college') {
      list = list.filter(n => n.category === 'college' || n.category === 'admissions' || n.category === 'results');
    } else if (category === 'jobs') {
      list = list.filter(n => n.category === 'jobs');
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(q) || (n.dept && n.dept.toLowerCase().includes(q)) || (n.org && n.org.toLowerCase().includes(q)));
    }

    // Update Badge Counts
    const jobCount = allNotices.filter(n => n.category === 'jobs').length;
    const collegeCount = allNotices.filter(n => n.category === 'college' || n.category === 'admissions' || n.category === 'results').length;
    const jb = document.getElementById('site-job-badge');
    const cb = document.getElementById('site-college-badge');
    const ab = document.getElementById('site-all-badge');
    if (jb) jb.textContent = toBanglaNumber(jobCount);
    if (cb) cb.textContent = toBanglaNumber(collegeCount);
    if (ab) ab.textContent = toBanglaNumber(allNotices.length);

    if (list.length === 0) {
      noticesContainer.innerHTML = `
        <div class="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md rotate-card-enter">
          <i class="fas fa-search text-4xl text-slate-400 mb-3"></i>
          <p class="text-xs font-extrabold text-slate-500">কোনো নোটিশ পাওয়া যায়নি।</p>
        </div>
      `;
      return;
    }

    noticesContainer.innerHTML = list.map((n, idx) => {
      const isJob = n.category === 'jobs';
      return `
        <div class="notice-card ${isJob ? 'card-accent-job' : 'card-accent-college'} p-5 sm:p-6 flex flex-col justify-between rotate-card-enter stagger-${(idx % 6) + 1}">
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="px-3 py-1 rounded-full text-[10px] font-extrabold ${isJob ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xs' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'}">
                ${n.badge || (isJob ? 'চাকরি সার্কুলার' : 'স্কুল-কলেজ নোটিশ')}
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                <i class="fas fa-calendar-alt text-[10px]"></i> শেষ: ${n.deadline}
              </span>
            </div>

            <h3 class="text-base font-black text-slate-900 dark:text-white leading-snug mb-1">
              ${n.title}
            </h3>
            <div class="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1">
              <i class="fas fa-building text-[10px]"></i> ${n.dept || n.org || 'সরকারি প্রতিষ্ঠান'}
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">${n.summary || n.details || ''}</p>
          </div>

          <div class="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            ${(n.sourceUrl || n.pdfUrl || n.link) ? `
              <a href="${n.sourceUrl || n.pdfUrl || n.link}" target="_blank" rel="noopener noreferrer" class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs">
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> অনলাইনে সরাসরি আবেদন / সার্কুলার
              </a>
            ` : ''}
            <button onclick="openNoticeModal('${n.id}')" class="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-extrabold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700">
              <i class="fas fa-eye"></i> বিস্তারিত দেখুন
            </button>
            <a href="https://wa.me/8801717101919?text=আসসালামু%20আলাইকুম,%20আমি%20${encodeURIComponent(n.title)}%20এর%20জন্য%20অনলাইন%20আবেদন%20করতে%20চাচ্ছি。" target="_blank" class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md">
              <i class="fab fa-whatsapp"></i> সরাসরি আবেদন পাঠান
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  function updateTabButtons(selectedCat) {
    document.querySelectorAll('.notice-tab-btn').forEach(b => {
      if (b.dataset.noticeCategory === selectedCat) {
        b.className = 'notice-tab-btn active px-4 py-2.5 rounded-xl text-xs font-black border bg-emerald-600 text-white shadow-md transition flex items-center gap-1.5';
      } else {
        b.className = 'notice-tab-btn px-4 py-2.5 rounded-xl text-xs font-bold border bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-xs flex items-center gap-1.5';
      }
    });

    const indicatorEl = document.getElementById('category-cycle-indicator');
    if (indicatorEl) {
      indicatorEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 status-dot-open"></span> ক্যাটাগরি: ${catNames[selectedCat] || selectedCat} (অটো-পরিবর্তন)`;
    }
  }

  // Filter tab buttons click
  document.querySelectorAll('.notice-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      isNoticeUserInteracted = true;
      const cat = btn.dataset.noticeCategory;
      updateTabButtons(cat);
      renderNotices(cat, searchInput ? searchInput.value : '');

      const indicatorEl = document.getElementById('category-cycle-indicator');
      if (indicatorEl) {
        indicatorEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-500"></span> ফিল্টার সিলেক্টেড: ${catNames[cat] || cat}`;
      }
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      isNoticeUserInteracted = true;
      const activeBtn = document.querySelector('.notice-tab-btn.active');
      const cat = activeBtn ? activeBtn.dataset.noticeCategory : 'college';
      renderNotices(cat, e.target.value);
    });
  }

  // Category Auto-Cycle Timer (Advances category every 5 seconds)
  let catCycleIndex = 0;
  categoryCycleTimer = setInterval(() => {
    if (!isNoticeUserInteracted) {
      catCycleIndex = (catCycleIndex + 1) % categories.length;
      const nextCat = categories[catCycleIndex];
      updateTabButtons(nextCat);
      renderNotices(nextCat, searchInput ? searchInput.value : '');
    }
  }, 3000);

  // Pause on hover
  noticesContainer.addEventListener('mouseenter', () => {
    isNoticeUserInteracted = true;
  });

  updateTabButtons('college');
  renderNotices('college');
}

// Modal Handlers
window.openServiceModal = function(serviceId) {
  const s = allServices.find(item => item.id === serviceId);
  const modal = document.getElementById('service-modal');
  const title = document.getElementById('modal-service-title');
  const body = document.getElementById('modal-service-body');
  if (!modal || !s) return;

  title.textContent = s.title;
  body.innerHTML = `
    <p class="text-slate-600 dark:text-slate-300 leading-relaxed font-normal">${s.summary || ''}</p>
    
    <div class="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800/80 p-4 rounded-2xl space-y-2 text-xs border border-slate-200 dark:border-slate-700">
      <div><strong>সরকারি ফি:</strong> <span class="font-bold text-slate-900 dark:text-white">${s.govtFee || 'নির্ধারিত'}</span></div>
      <div><strong>দোকানের চার্জ:</strong> <span class="font-bold text-emerald-600">${s.serviceFee || '৫০-১০০৳'}</span></div>
      <div><strong>আনুমানিক সময়:</strong> <span class="font-bold text-amber-600">${s.duration || 'তাৎক্ষণিক'}</span></div>
    </div>

    <div>
      <h4 class="font-bold text-slate-900 dark:text-white mb-2">প্রয়োজনীয় কাগজপত্রের তালিকা:</h4>
      <ul class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
        ${(s.documents || []).map(d => `<li class="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl"><i class="fas fa-check-circle text-emerald-600 mt-0.5 text-xs"></i> <span>${d}</span></li>`).join('')}
      </ul>
    </div>

    <div class="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
      ${(n.sourceUrl || n.pdfUrl || n.link) ? `
        <a href="${n.sourceUrl || n.pdfUrl || n.link}" target="_blank" rel="noopener noreferrer" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition">
          <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> অনলাইনে সরাসরি আবেদন / সার্কুলার লিংক
        </a>
      ` : ''}
      <a href="https://wa.me/8801717101919?text=আসসালামু%20আলাইকুম,%20আমি%20${encodeURIComponent(s.title)}%20সেবাটি%20নিতে%20চাচ্ছি。" target="_blank" class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md">
        <i class="fab fa-whatsapp text-base"></i> হোয়াটসঅ্যাপে সরাসরি আবেদন শুরু করুন
      </a>
    </div>
  `;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.openNoticeModal = function(noticeId) {
  const n = allNotices.find(item => item.id === noticeId);
  const modal = document.getElementById('notice-modal');
  const title = document.getElementById('modal-notice-title');
  const badge = document.getElementById('modal-notice-badge');
  const body = document.getElementById('modal-notice-body');
  if (!modal || !n) return;

  title.textContent = n.title;
  badge.textContent = n.dept || n.org || 'সরকারি বিজ্ঞপ্তি';
  badge.className = 'px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
  
  body.innerHTML = `
    <div class="flex items-center justify-between bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800 p-3.5 rounded-2xl text-xs border border-slate-200 dark:border-slate-700">
      <span><strong>আবেদনের শেষ তারিখ:</strong> <span class="text-rose-600 font-extrabold">${n.deadline}</span></span>
      <span><strong>পদসংখ্যা:</strong> <span class="text-slate-900 dark:text-white font-bold">${n.posts || n.vacancies || 'উল্লেখিত'}</span></span>
    </div>

    <div class="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
      <strong>প্রয়োজনীয় যোগ্যতা:</strong> ${n.qualification || 'বিজ্ঞপ্তি দেখুন'}
    </div>

    <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${n.summary || n.details || ''}</p>

    <div class="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
      ${(n.sourceUrl || n.pdfUrl || n.link) ? `
        <a href="${n.sourceUrl || n.pdfUrl || n.link}" target="_blank" rel="noopener noreferrer" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition">
          <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> অনলাইনে সরাসরি আবেদন / সার্কুলার লিংক
        </a>
      ` : ''}
      <a href="https://wa.me/8801717101919?text=আসসালামু%20আলাইকুম,%20আমি%20${encodeURIComponent(n.title)}%20বিজ্ঞপ্তির%20আবেদন%20করতে%20চাচ্ছি。" target="_blank" class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md">
        <i class="fab fa-whatsapp text-base"></i> হোয়াটসঅ্যাপে ডকুমেন্টস পাঠিয়ে আবেদন করুন
      </a>
    </div>
  `;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

// Modal Close Listeners
document.getElementById('service-modal-close')?.addEventListener('click', () => {
  document.getElementById('service-modal').classList.add('hidden');
  document.getElementById('service-modal').classList.remove('flex');
});
document.getElementById('notice-modal-close')?.addEventListener('click', () => {
  document.getElementById('notice-modal').classList.add('hidden');
  document.getElementById('notice-modal').classList.remove('flex');
});

// =========================================================================
// ৭. স্মার্ট টুলস স্যুট ও সার্বজনীন কনভার্টার কন্ট্রোলার
// =========================================================================
function initToolsIfPresent() {
  const tabButtons = document.querySelectorAll('.tool-switch-btn');
  if (tabButtons && tabButtons.length > 0) {
    const BASE_BTN_CLASSES = "tool-switch-btn w-10 h-10 sm:w-11 sm:h-11 lg:w-full lg:h-auto mx-auto lg:mx-0 p-0 lg:p-3 rounded-xl lg:rounded-2xl transition-all flex items-center justify-center lg:justify-between gap-3 group relative cursor-pointer";
    const ACTIVE_CLASSES = "active shadow-md bg-emerald-600 text-white border-2 border-emerald-600 tool-featured-highlight";
    const INACTIVE_CLASSES = "bg-white dark:bg-[#1a263d] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600/80 hover:bg-slate-100 dark:hover:bg-[#23324f] shadow-2xs";

    const TAB_ICON_STYLES = {
      'ai-ocr': {
        active: "bg-white/25 text-white",
        inactive: "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
      },
      text: {
        active: "bg-white/25 text-white",
        inactive: "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
      },
      resizer: {
        active: "bg-white/25 text-white",
        inactive: "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
      },
      age: {
        active: "bg-white/25 text-white",
        inactive: "bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400"
      },
      land: {
        active: "bg-white/25 text-white",
        inactive: "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
      }
    };

    function switchToolTab(tabKey) {
      tabButtons.forEach(btn => {
        const tab = btn.dataset.toolTab;
        const isHighlighted = tab === 'text' || tab === 'ai-ocr';
        const iconBadge = btn.querySelector('.tool-tab-icon-badge');

        if (tab === tabKey) {
          btn.className = `${BASE_BTN_CLASSES} ${ACTIVE_CLASSES} ${isHighlighted ? 'tool-featured-highlight' : ''}`;
          btn.setAttribute('aria-selected', 'true');
          if (iconBadge && TAB_ICON_STYLES[tab]) {
            iconBadge.className = `tool-tab-icon-badge w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg lg:rounded-xl ${TAB_ICON_STYLES[tab].active} flex items-center justify-center text-xs sm:text-sm lg:text-base flex-shrink-0 transition-colors`;
          }
        } else {
          btn.className = `${BASE_BTN_CLASSES} ${INACTIVE_CLASSES}`;
          btn.setAttribute('aria-selected', 'false');
          if (iconBadge && TAB_ICON_STYLES[tab]) {
            iconBadge.className = `tool-tab-icon-badge w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg lg:rounded-xl ${TAB_ICON_STYLES[tab].inactive} flex items-center justify-center text-xs sm:text-sm lg:text-base flex-shrink-0 transition-colors`;
          }
        }
      });

      document.querySelectorAll('.tool-content-panel').forEach(p => p.classList.add('hidden'));
      const targetPanel = document.getElementById(`panel-${tabKey}`);
      if (targetPanel) {
        targetPanel.classList.remove('hidden');
        if (window.innerWidth < 1024) {
          targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        switchToolTab(btn.dataset.toolTab);
      });
    });

    // Read URL query parameter: ?tab=resizer/text/age/land/ai-ocr
    const urlParams = new URLSearchParams(window.location.search);
    let activeTabParam = urlParams.get('tab');
    if (activeTabParam === 'math') activeTabParam = 'text';
    if (activeTabParam === 'ocr') activeTabParam = 'ai-ocr';
    const defaultTab = document.getElementById('panel-text') ? 'text' : 'resizer';
    if (activeTabParam && ['resizer', 'text', 'age', 'land', 'ai-ocr'].includes(activeTabParam)) {
      switchToolTab(activeTabParam);
    } else {
      switchToolTab(defaultTab);
    }
  }

  // Always initialize individual engines if their DOM elements exist
  initResizerEngine();
  initUnifiedConverterEngine();
  initAgeCalcEngine();
  initLandCalculatorEngine();
}

// 1. Resizer Engine
function initResizerEngine() {
  const photoModeBtn = document.getElementById('resizer-photo-mode');
  const sigModeBtn = document.getElementById('resizer-sig-mode');
  const fileInput = document.getElementById('resizer-file-input');
  const canvas = document.getElementById('resizer-canvas');
  const outputBox = document.getElementById('resizer-output-box');
  const placeholderBox = document.getElementById('resizer-placeholder-box');
  const infoText = document.getElementById('resizer-info-text');
  const downloadBtn = document.getElementById('resizer-download-btn');
  const targetDimText = document.getElementById('resizer-target-dim');

  if (!photoModeBtn || !fileInput) return;

  let currentMode = 'photo'; // 'photo' = 300x300, 'sig' = 300x80
  let uploadedImage = null;

  photoModeBtn.addEventListener('click', () => {
    currentMode = 'photo';
    photoModeBtn.className = 'py-2.5 px-3 rounded-xl font-extrabold text-xs bg-emerald-600 text-white transition flex items-center justify-center gap-1 shadow-sm';
    sigModeBtn.className = 'py-2.5 px-3 rounded-xl font-bold text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition flex items-center justify-center gap-1';
    targetDimText.textContent = '৩০০ x ৩০০ পিক্সেল (সর্বোচ্চ ১০০ KB)';
    if (uploadedImage) processImage();
  });

  sigModeBtn.addEventListener('click', () => {
    currentMode = 'sig';
    sigModeBtn.className = 'py-2.5 px-3 rounded-xl font-extrabold text-xs bg-emerald-600 text-white transition flex items-center justify-center gap-1 shadow-sm';
    photoModeBtn.className = 'py-2.5 px-3 rounded-xl font-bold text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition flex items-center justify-center gap-1';
    targetDimText.textContent = '৩০০ x ৮০ পিক্সেল (সর্বোচ্চ ৬০ KB)';
    if (uploadedImage) processImage();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        uploadedImage = img;
        processImage();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  function processImage() {
    if (!uploadedImage) return;
    const targetW = 300;
    const targetH = currentMode === 'photo' ? 300 : 80;

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(uploadedImage, 0, 0, targetW, targetH);

    placeholderBox.classList.add('hidden');
    outputBox.classList.remove('hidden');

    infoText.textContent = `সাইজ: ${targetW} x ${targetH} পিক্সেল | টেলিটক কমপ্লায়েন্ট`;

    downloadBtn.onclick = () => {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Teletalk_${currentMode === 'photo' ? 'Photo_300x300' : 'Signature_300x80'}_${Date.now()}.jpg`;
      a.click();
    };
  }
}

// =========================================================================
// ২. অল-ইন-ওয়ান অফিস ও প্রশ্নপত্র কনভার্টার ইঞ্জিন (Smart 3-Step Wizard)
// =========================================================================
function initUnifiedConverterEngine() {
  // Sub-tabs: Wizard File vs Live Text
  const subtabFileBtn = document.getElementById('wizard-subtab-file-btn');
  const subtabTextBtn = document.getElementById('wizard-subtab-text-btn');
  const subpanelFile = document.getElementById('wizard-subpanel-file');
  const subpanelText = document.getElementById('wizard-subpanel-text');

  subtabFileBtn?.addEventListener('click', () => {
    subtabFileBtn.className = 'px-4 py-2 rounded-xl bg-emerald-600 text-white shadow-xs transition flex items-center gap-1.5 font-black';
    subtabTextBtn.className = 'px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition flex items-center gap-1.5 font-bold';
    subpanelFile?.classList.remove('hidden');
    subpanelText?.classList.add('hidden');
  });

  subtabTextBtn?.addEventListener('click', () => {
    subtabTextBtn.className = 'px-4 py-2 rounded-xl bg-emerald-600 text-white shadow-xs transition flex items-center gap-1.5 font-black';
    subtabFileBtn.className = 'px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition flex items-center gap-1.5 font-bold';
    subpanelText?.classList.remove('hidden');
    subpanelFile?.classList.add('hidden');
  });

  // --- Wizard Step Containers ---
  const step1Box = document.getElementById('wizard-step-1');
  const step2Box = document.getElementById('wizard-step-2');
  const step3Box = document.getElementById('wizard-step-3');

  // Step 1: Dropzone Elements
  const wizardDropZone = document.getElementById('wizardDropZone');
  const wizardFileInput = document.getElementById('wizardFileInput');
  const wizardBrowseBtn = document.getElementById('wizardBrowseBtn');

  // Step 2: Pre-scan Overview & Options
  const scanFileIconBox = document.getElementById('scanFileIconBox');
  const scanFileName = document.getElementById('scanFileName');
  const scanFileSize = document.getElementById('scanFileSize');
  const scanFileTypeLabel = document.getElementById('scanFileTypeLabel');
  const scanHighlightsBox = document.getElementById('scanHighlightsBox');
  const wizardChangeFileBtn = document.getElementById('wizardChangeFileBtn');

  // Step 2 State & Interactive Elements
  let selectedTargetDirection = 'all_bijoy';
  let selectedUnicodeFont = 'Nikosh';

  const wizardConvertMathCheckbox = document.getElementById('wizardConvertMathCheckbox');
  const optBtnBijoy = document.getElementById('optBtnBijoy');
  const optBtnUnicode = document.getElementById('optBtnUnicode');
  const unicodeFontSubgroup = document.getElementById('unicodeFontSubgroup');
  const subFontNikosh = document.getElementById('subFontNikosh');
  const subFontKalpurush = document.getElementById('subFontKalpurush');
  const subFontNikoshCheck = document.getElementById('subFontNikoshCheck');
  const subFontKalpurushCheck = document.getElementById('subFontKalpurushCheck');

  const wordActionButtonsContainer = document.getElementById('wordActionButtonsContainer');
  const actionConvertDocBtn = document.getElementById('actionConvertDocBtn');
  const actionConvertDocxBtn = document.getElementById('actionConvertDocxBtn');
  const nonWordActionContainer = document.getElementById('nonWordActionContainer');
  const actionConvertGenericBtn = document.getElementById('actionConvertGenericBtn');
  const genericActionBtnText = document.getElementById('genericActionBtnText');

  // Step 3: Progress & Results
  const wizardProgressCard = document.getElementById('wizardProgressCard');
  const wizardProgressTitle = document.getElementById('wizardProgressTitle');
  const wizardProgressStatus = document.getElementById('wizardProgressStatus');
  const wizardProgressPctText = document.getElementById('wizardProgressPctText');
  const wizardProgressBar = document.getElementById('wizardProgressBar');

  const wizardResultCard = document.getElementById('wizardResultCard');
  const wizardResultFileName = document.getElementById('wizardResultFileName');
  const wizardResultStatsBadge = document.getElementById('wizardResultStatsBadge');
  const wizardResultDetails = document.getElementById('wizardResultDetails');
  const wizardPreviewBox = document.getElementById('wizardPreviewBox');
  const wizardPreviewContent = document.getElementById('wizardPreviewContent');

  const wizardDlDocxBtn = document.getElementById('wizardDlDocxBtn');
  const wizardDlDocBtn = document.getElementById('wizardDlDocBtn');
  const wizardDlUnicodeDocxBtn = document.getElementById('wizardDlUnicodeDocxBtn');
  const wizardStudioPreviewBtn = document.getElementById('wizardStudioPreviewBtn');
  const wizardOpenStudioInlineBtn = document.getElementById('wizardOpenStudioInlineBtn');
  const wizardDlMdBtn = document.getElementById('wizardDlMdBtn');
  const wizardDlXlsxBtn = document.getElementById('wizardDlXlsxBtn');
  const wizardDlPptxBtn = document.getElementById('wizardDlPptxBtn');
  const wizardConvertAnotherBtn = document.getElementById('wizardConvertAnotherBtn');
  const wizardVerifyBtn = document.getElementById('wizardVerifyBtn');

  let currentScanResult = null;
  let selectedAiTargetFormat = 'doc'; // 'doc', 'bijoy_docx', 'unicode_docx'

  // Step 2 & 3 Contextual Containers
  const aiOcrOptionsBox = document.getElementById('aiOcrOptionsBox');
  const officeDocOptionsBox = document.getElementById('officeDocOptionsBox');
  const aiOcrMultiThumbsContainer = document.getElementById('aiOcrMultiThumbsContainer');
  const aiOcrThumbsList = document.getElementById('aiOcrThumbsList');
  const scanFileCategoryBadge = document.getElementById('scanFileCategoryBadge');
  const executeAiConversionBtn = document.getElementById('executeAiConversionBtn');
  const executeAiConversionBtnText = document.getElementById('executeAiConversionBtnText');
  const wizardCopyTextBtn = document.getElementById('wizardCopyTextBtn');
  const wizardPreviewToggleBtn = document.getElementById('wizardPreviewToggleBtn');
  const wizardPreviewToggleText = document.getElementById('wizardPreviewToggleText');

  // Live Upload Progress Overlay Elements
  const wizardDropOverlay = document.getElementById('wizardDropOverlay');
  const wizardDropOverlayTitle = document.getElementById('wizardDropOverlayTitle');
  const wizardDropOverlayFile = document.getElementById('wizardDropOverlayFile');
  const wizardDropProgressBar = document.getElementById('wizardDropProgressBar');
  const wizardDropProgressStatus = document.getElementById('wizardDropProgressStatus');
  const wizardDropProgressPct = document.getElementById('wizardDropProgressPct');

  function showDropzoneProgress(fileName, pct = 0, statusText = 'ফাইল আপলোড হচ্ছে...') {
    if (!wizardDropOverlay) return;
    wizardDropOverlay.classList.remove('hidden');
    if (wizardDropOverlayFile) wizardDropOverlayFile.textContent = fileName || 'ফাইল প্রসেস করা হচ্ছে';
    updateDropzoneProgress(pct, statusText);
  }

  function updateDropzoneProgress(pct, statusText) {
    if (wizardDropProgressBar) wizardDropProgressBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    if (wizardDropProgressPct) {
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      const formatted = Math.round(pct).toString().replace(/\d/g, d => bnDigits[parseInt(d)]);
      wizardDropProgressPct.textContent = `${formatted}%`;
    }
    if (wizardDropProgressStatus && statusText) wizardDropProgressStatus.textContent = statusText;
  }

  function hideDropzoneProgress() {
    if (wizardDropOverlay) {
      wizardDropOverlay.classList.add('hidden');
      updateDropzoneProgress(0, 'আপলোড শুরু হচ্ছে...');
    }
  }

  // --- Step 1 Events: Click anywhere on dropzone to upload ---
  wizardBrowseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    wizardFileInput?.click();
  });

  if (wizardDropZone) {
    wizardDropZone.addEventListener('click', (e) => {
      // If clicking inside the dropzone (and not on the input itself)
      if (e.target !== wizardFileInput) {
        wizardFileInput?.click();
      }
    });

    ['dragenter', 'dragover'].forEach(name => {
      wizardDropZone.addEventListener(name, (e) => {
        e.preventDefault();
        wizardDropZone.classList.add('file-dropzone-active');
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      wizardDropZone.addEventListener(name, (e) => {
        e.preventDefault();
        wizardDropZone.classList.remove('file-dropzone-active');
      });
    });
    wizardDropZone.addEventListener('drop', async (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        await initiateFileScan(files);
      }
    });
  }

  wizardFileInput?.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await initiateFileScan(e.target.files);
      wizardFileInput.value = '';
    }
  });

  wizardChangeFileBtn?.addEventListener('click', resetToStep1);
  wizardConvertAnotherBtn?.addEventListener('click', resetToStep1);

  function resetToStep1() {
    hideDropzoneProgress();
    currentScanResult = null;
    step1Box?.classList.remove('hidden');
    step2Box?.classList.add('hidden');
    step3Box?.classList.add('hidden');
    wizardProgressCard?.classList.add('hidden');
    wizardResultCard?.classList.add('hidden');
    if (wizardPreviewContent) wizardPreviewContent.value = '';
    if (wizardPreviewBox) wizardPreviewBox.classList.add('hidden');
    if (wizardPreviewToggleText) wizardPreviewToggleText.textContent = 'টেক্সট প্রিভিউ দেখুন';
  }

  // --- Universal Pre-Scan & Smart Router Function ---
  async function initiateFileScan(inputFiles) {
    let files = [];
    if (inputFiles instanceof FileList || Array.isArray(inputFiles)) {
      files = Array.from(inputFiles);
    } else if (inputFiles instanceof File) {
      files = [inputFiles];
    }
    if (files.length === 0) return;

    const firstFile = files[0];
    const ext = firstFile.name.split('.').pop().toLowerCase();

    // Show live progress overlay immediately
    showDropzoneProgress(firstFile.name, 15, 'ফাইল আপলোড হচ্ছে...');

    await new Promise(r => setTimeout(r, 70));
    updateDropzoneProgress(35, 'ফাইল রিড ও লোড হচ্ছে...');

    // Check if files are Images or PDF (AI OCR Route)
    const isImageOrPdf = files.some(f => {
      const fExt = f.name.split('.').pop().toLowerCase();
      return ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'jfif', 'pdf'].includes(fExt) || f.type.startsWith('image/') || f.type === 'application/pdf';
    });

    if (isImageOrPdf) {
      updateDropzoneProgress(65, ext === 'pdf' ? 'পিডিএফ পেজ রেন্ডার ও প্রসেস হচ্ছে...' : 'ছবি অপটিমাইজ ও রেন্ডার হচ্ছে...');
      if (window.FayzarAiOcrEngine && typeof window.FayzarAiOcrEngine.handleFiles === 'function') {
        try { await window.FayzarAiOcrEngine.handleFiles(files); } catch(e) { console.warn(e); }
      }
      updateDropzoneProgress(95, 'স্ক্যান সম্পূর্ণ হচ্ছে...');
      await new Promise(r => setTimeout(r, 60));
      updateDropzoneProgress(100, 'সম্পন্ন!');
      hideDropzoneProgress();

      const queueLen = window.FayzarAiOcrEngine?.state?.filesQueue?.length || files.length;
      currentScanResult = {
        file: firstFile,
        files: files,
        ext: ext,
        isAiOcr: true,
        totalFiles: queueLen,
        totalBytes: files.reduce((acc, f) => acc + f.size, 0)
      };
      renderStep2Options(currentScanResult);
      return;
    }


    // MD / TXT Direct Layout Route (no OCR needed)
    if (ext === 'md' || ext === 'txt') {
      updateDropzoneProgress(60, 'মার্কডাউন ফাইল পড়া হচ্ছে...');
      try {
        const mdText = await firstFile.text();
        updateDropzoneProgress(95, 'প্রস্তুত...');
        await new Promise(r => setTimeout(r, 40));
        updateDropzoneProgress(100, 'সম্পন্ন!');
        hideDropzoneProgress();
        currentScanResult = {
          file: firstFile, ext: ext,
          isMdFile: true, isAiOcr: false, totalFiles: 1,
          totalBytes: firstFile.size,
          mdText: mdText,
          hasMath: mdText.includes('$') || mdText.includes('['),
          isUnicode: true
        };
        renderStep2Options(currentScanResult);
      } catch (e) {
        hideDropzoneProgress();
        alert('MD ফাইল পড়তে সমস্যা: ' + e.message);
      }
      return;
    }

    // Digital Office File Route (.docx, .doc, .xlsx, .pptx)
    const validExtensions = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'];
    if (!validExtensions.includes(ext)) {
      hideDropzoneProgress();
      alert(`ফরম্যাট সমর্থিত নয়: ${firstFile.name}\n(শুধুমাত্র .docx, .doc, .xlsx, .xls, .pptx, .ppt, PDF অথবা ছবি সমর্থিত)`);
      return;
    }

    try {
      updateDropzoneProgress(60, 'ডকুমেন্ট স্ট্রাকচার বিশ্লেষণ হচ্ছে...');
      const scanResult = await preScanDocumentFile(firstFile, ext);
      updateDropzoneProgress(90, 'প্রস্তুত হচ্ছে...');
      scanResult.isAiOcr = false;
      scanResult.totalFiles = 1;
      currentScanResult = scanResult;
      await new Promise(r => setTimeout(r, 50));
      updateDropzoneProgress(100, 'সম্পন্ন!');
      hideDropzoneProgress();
      renderStep2Options(scanResult);
    } catch (err) {
      hideDropzoneProgress();
      console.error('File scan error', err);
      alert('ফাইলটি বিশ্লেষণ করতে সমস্যা হয়েছে: ' + err.message);
    }
  }

  // Export initiateFileScan to window
  window.initiateFileScan = initiateFileScan;

  async function preScanDocumentFile(file, ext) {
    const buffer = await file.arrayBuffer();
    const isWord = ['docx', 'doc'].includes(ext);
    const isExcel = ['xlsx', 'xls'].includes(ext);
    const isPpt = ['pptx', 'ppt'].includes(ext);
    const isDocBinary = ext === 'doc';

    let hasMath = false;
    let isMixed = false;
    let isUnicode = false;
    let isBijoy = false;
    let hasEnglish = false;
    let extractedText = '';

    if (ext === 'docx' && typeof JSZip !== 'undefined') {
      try {
        const zip = await JSZip.loadAsync(buffer);
        const docXmlFile = zip.file('word/document.xml') || zip.file('word\\document.xml') || Object.values(zip.files).find(f => f.name.replace(/\\/g, '/') === 'word/document.xml');
        if (docXmlFile) {
          const docXml = await docXmlFile.async('string');
          
          // Math Detection: OMML, MathType, LaTeX patterns
          if (
            docXml.includes('<m:oMath') ||
            docXml.includes('<m:oMathPara') ||
            docXml.includes('MathType') ||
            docXml.includes('w:object') ||
            /\$[^\$\r\n]+\$/.test(docXml)
          ) {
            hasMath = true;
          }

          // Text content analysis
          const textMatches = docXml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
          extractedText = textMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');

          const hasBanglaUnicode = /[\u0980-\u09FF]/.test(extractedText);
          const hasEnglishWords = /[A-Za-z]{3,}/.test(extractedText);
          const hasBijoyFont = docXml.includes('SutonnyMJ') || docXml.includes('Sutonny');
          const hasBijoyChars = /[AvwK‡©Ö«¯æ™—]/.test(extractedText);

          if (hasBanglaUnicode) isUnicode = true;
          if (hasBijoyFont || (hasBijoyChars && !hasBanglaUnicode)) isBijoy = true;
          if ((hasBanglaUnicode || isBijoy) && hasEnglishWords) {
            isMixed = true;
            hasEnglish = true;
          }
        }
      } catch (e) {
        console.warn('Docx scan warning', e);
      }
    } else if (isExcel && typeof JSZip !== 'undefined') {
      try {
        const zip = await JSZip.loadAsync(buffer);
        const sharedStrFile = zip.file('xl/sharedStrings.xml');
        if (sharedStrFile) {
          const xml = await sharedStrFile.async('string');
          if (/[\u0980-\u09FF]/.test(xml)) isUnicode = true;
          if (xml.includes('SutonnyMJ')) isBijoy = true;
          if (/[A-Za-z]{3,}/.test(xml)) isMixed = true;
        }
      } catch (e) {
        console.warn('Excel scan warning', e);
      }
    } else if (isPpt && typeof JSZip !== 'undefined') {
      try {
        const zip = await JSZip.loadAsync(buffer);
        const slide1 = zip.file('ppt/slides/slide1.xml');
        if (slide1) {
          const xml = await slide1.async('string');
          if (/[\u0980-\u09FF]/.test(xml)) isUnicode = true;
          if (xml.includes('SutonnyMJ')) isBijoy = true;
        }
      } catch (e) {
        console.warn('PPT scan warning', e);
      }
    } else if (isDocBinary) {
      isBijoy = true;
      try {
        const dec = new TextDecoder('utf-8', { fatal: false });
        const raw = dec.decode(buffer);
        if (/[\u0980-\u09FF]/.test(raw)) {
          isUnicode = true;
          isBijoy = false;
        } else if (raw.includes('SutonnyMJ') || /[AvwK‡©Ö«¯æ™—]/.test(raw)) {
          isBijoy = true;
        }
      } catch (e) {
        console.warn('Doc scan warning', e);
      }
    }

    return {
      file,
      buffer,
      ext,
      isWord,
      isExcel,
      isPpt,
      isDocBinary,
      hasMath,
      isMixed,
      isUnicode,
      isBijoy,
      hasEnglish,
      extractedText
    };
  }

  // --- Step 2: Render Smart Options based on pre-scan ---
  function renderStep2Options(scan) {
    step1Box?.classList.add('hidden');
    step2Box?.classList.remove('hidden');
    step3Box?.classList.add('hidden');

    const totalSize = scan.totalBytes || scan.file.size;
    if (scanFileName) {
      scanFileName.textContent = (scan.totalFiles && scan.totalFiles > 1)
        ? `${toBanglaNumber(scan.totalFiles)}টি ফাইল নির্বাচিত (${scan.file.name} ইত্যাদি)`
        : scan.file.name;
    }
    if (scanFileSize) scanFileSize.textContent = `${(totalSize / 1024).toFixed(1)} KB`;

    // --------------------------------------------------------
    // BRANCH MD: Gemini Markdown File (.md / .txt)
    // --------------------------------------------------------
    if (scan.isMdFile) {
      if (scanFileCategoryBadge) scanFileCategoryBadge.textContent = 'Gemini MD ফাইল:';
      if (scanFileTypeLabel) scanFileTypeLabel.textContent = 'মার্কডাউন (.md) — OCR ছাড়া সরাসরি লেআউট';
      if (scanFileIconBox) scanFileIconBox.innerHTML = '<i class="fa-solid fa-file-lines text-emerald-400"></i>';
      if (scanHighlightsBox) {
        scanHighlightsBox.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black shadow-xs">
            <i class="fa-solid fa-file-lines text-emerald-600"></i> Gemini MD ফাইল — সরাসরি লোড
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
            <i class="fa-solid fa-bolt text-blue-600"></i> OCR ছাড়াই তাৎক্ষণিক লেআউট ও Word Export
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
            <i class="fa-solid fa-square-root-variable text-amber-600"></i> সমীকরণ, প্রশ্নপত্র ও টেবিল সমর্থিত
          </span>`;
      }
      aiOcrOptionsBox?.classList.add('hidden');
      aiOcrMultiThumbsContainer?.classList.add('hidden');
      officeDocOptionsBox?.classList.remove('hidden');
      step2Box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    // --------------------------------------------------------
    // BRANCH A: AI OCR Pipeline (Images or PDF)
    // --------------------------------------------------------
    if (scan.isAiOcr) {
      if (scanFileCategoryBadge) scanFileCategoryBadge.textContent = 'শনাক্তকৃত স্ক্যান/ছবি:';
      if (scanFileTypeLabel) scanFileTypeLabel.textContent = scan.ext === 'pdf' ? 'পিডিএফ নথি (PDF Document)' : 'ছবি/ডকুমেন্ট স্ক্যান';
      if (scanFileIconBox) {
        scanFileIconBox.innerHTML = scan.ext === 'pdf'
          ? '<i class="fa-solid fa-file-pdf text-rose-400"></i>'
          : '<i class="fa-solid fa-file-image text-indigo-400"></i>';
      }

      if (scanHighlightsBox) {
        scanHighlightsBox.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-black shadow-xs">
            <i class="fa-solid fa-wand-magic-sparkles text-indigo-600"></i> Gemini AI OCR + ফয়জার ইঞ্জিন সক্রিয়
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
            <i class="fa-solid fa-file-lines text-emerald-600"></i> ১-ক্লিকে সরাসরি ওয়ার্ড ২০০৩ (.doc) বা .docx
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
            <i class="fa-solid fa-square-root-variable text-amber-600"></i> সমীকরণ, প্রশ্ন ও টেবিল অক্ষুণ্ণ
          </span>
        `;
      }

      aiOcrOptionsBox?.classList.remove('hidden');
      officeDocOptionsBox?.classList.add('hidden');

      if (scan.totalFiles > 1) {
        aiOcrMultiThumbsContainer?.classList.remove('hidden');
      } else {
        aiOcrMultiThumbsContainer?.classList.add('hidden');
      }

      step2Box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    // --------------------------------------------------------
    // BRANCH B: Digital Office Files (.docx, .doc, .xlsx, .pptx)
    // --------------------------------------------------------
    if (scanFileCategoryBadge) scanFileCategoryBadge.textContent = 'শনাক্তকৃত অফিস ফাইল:';
    aiOcrOptionsBox?.classList.add('hidden');
    aiOcrMultiThumbsContainer?.classList.add('hidden');
    officeDocOptionsBox?.classList.remove('hidden');

    let fileTypeLabel = 'ওয়ার্ড ডকুমেন্ট (.docx)';
    let iconHtml = '<i class="fa-solid fa-file-word text-blue-400"></i>';

    if (scan.isDocBinary) {
      fileTypeLabel = 'ওয়ার্ড ৯৭-২০০৩ ডকুমেন্ট (.doc)';
      iconHtml = '<i class="fa-solid fa-file-lines text-cyan-400"></i>';
    } else if (scan.isExcel) {
      fileTypeLabel = 'মাইক্রোসফট এক্সেল শিট (.xlsx)';
      iconHtml = '<i class="fa-solid fa-file-excel text-emerald-400"></i>';
    } else if (scan.isPpt) {
      fileTypeLabel = 'পাওয়ারপয়েন্ট স্লাইড (.pptx)';
      iconHtml = '<i class="fa-solid fa-file-powerpoint text-amber-400"></i>';
    } else if (scan.hasMath) {
      fileTypeLabel = 'গণিত ও প্রশ্নপত্র ওয়ার্ড ফাইল (.docx)';
      iconHtml = '<i class="fa-solid fa-square-root-variable text-indigo-300"></i>';
    }

    if (scanFileTypeLabel) scanFileTypeLabel.textContent = fileTypeLabel;
    if (scanFileIconBox) scanFileIconBox.innerHTML = iconHtml;

    // Badges
    const badges = [];
    if (scan.hasMath) {
      badges.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-black shadow-xs">
          <i class="fa-solid fa-square-root-variable text-indigo-600"></i> গণিত সমীকরণ ও প্রশ্নপত্র শনাক্ত!
        </span>
      `);
    }
    if (scan.isMixed) {
      badges.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold shadow-xs">
          <i class="fa-solid fa-shuffle text-amber-600"></i> মিক্সড টেক্সট (ইংরেজি ও বাংলা মিশ্রিত)
        </span>
      `);
    }
    if (scan.isUnicode) {
      badges.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
          <i class="fa-solid fa-globe text-emerald-600"></i> ইউনিকোড বাংলা টেক্সট
        </span>
      `);
    }
    if (scan.isBijoy) {
      badges.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
          <i class="fa-solid fa-font text-blue-600"></i> বিজয় (SutonnyMJ) টেক্সট
        </span>
      `);
    }
    if (scan.isExcel) {
      badges.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
          <i class="fa-solid fa-table-cells text-emerald-600"></i> সকল সেল ও ফর্মুলা সুরক্ষিত থাকবে
        </span>
      `);
    }
    if (scan.isPpt) {
      badges.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
          <i class="fa-solid fa-file-powerpoint text-amber-600"></i> স্লাইড ফরম্যাটিং অবিকৃত থাকবে
        </span>
      `);
    }
    if (badges.length === 0) {
      badges.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
          <i class="fa-solid fa-circle-check text-emerald-600"></i> সাধারণ ডকুমেন্ট রূপান্তর প্রস্তুত
        </span>
      `);
    }

    if (scanHighlightsBox) scanHighlightsBox.innerHTML = badges.join('');

    // Pre-select based on file content:
    if (scan.isBijoy && !scan.isUnicode) {
      updateTargetSelectionUI('all_unicode');
      updateSubFontUI('Nikosh');
    } else {
      updateTargetSelectionUI('all_bijoy');
    }

    // Toggle Word (.doc/.docx) vs Non-Word buttons
    if (scan.isWord) {
      wordActionButtonsContainer?.classList.remove('hidden');
      nonWordActionContainer?.classList.add('hidden');
    } else {
      wordActionButtonsContainer?.classList.add('hidden');
      nonWordActionContainer?.classList.remove('hidden');
      if (genericActionBtnText) {
        genericActionBtnText.textContent = scan.isExcel ? '.xlsx এক্সেল ফাইল কনভার্ট ও ডাউনলোড' : '.pptx স্লাইড কনভার্ট ও ডাউনলোড';
      }
    }

    step2Box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // --- Target & Sub-font Toggles ---
  function updateTargetSelectionUI(dir) {
    selectedTargetDirection = dir;
    if (dir === 'all_bijoy') {
      optBtnBijoy?.classList.remove('border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
      optBtnBijoy?.classList.add('border-emerald-500', 'bg-emerald-50/80', 'dark:bg-emerald-950/50', 'text-emerald-900', 'dark:text-emerald-100', 'shadow-md');

      optBtnUnicode?.classList.remove('border-blue-500', 'bg-blue-50/80', 'dark:bg-blue-950/50', 'text-blue-900', 'dark:text-blue-100', 'shadow-md');
      optBtnUnicode?.classList.add('border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');

      unicodeFontSubgroup?.classList.add('hidden');
    } else {
      optBtnUnicode?.classList.remove('border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
      optBtnUnicode?.classList.add('border-blue-500', 'bg-blue-50/80', 'dark:bg-blue-950/50', 'text-blue-900', 'dark:text-blue-100', 'shadow-md');

      optBtnBijoy?.classList.remove('border-emerald-500', 'bg-emerald-50/80', 'dark:bg-emerald-950/50', 'text-emerald-900', 'dark:text-emerald-100', 'shadow-md');
      optBtnBijoy?.classList.add('border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');

      unicodeFontSubgroup?.classList.remove('hidden');
      updateSubFontUI(selectedUnicodeFont);
    }
  }

  function updateSubFontUI(font) {
    selectedUnicodeFont = font;
    if (font === 'Nikosh') {
      subFontNikosh?.classList.remove('border-slate-300', 'dark:border-slate-600', 'bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
      subFontNikosh?.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-950', 'text-blue-700', 'dark:text-blue-300', 'font-black');
      subFontNikoshCheck?.classList.remove('hidden');

      subFontKalpurush?.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-950', 'text-blue-700', 'dark:text-blue-300', 'font-black');
      subFontKalpurush?.classList.add('border-slate-300', 'dark:border-slate-600', 'bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
      subFontKalpurushCheck?.classList.add('hidden');
    } else {
      subFontKalpurush?.classList.remove('border-slate-300', 'dark:border-slate-600', 'bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
      subFontKalpurush?.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-950', 'text-blue-700', 'dark:text-blue-300', 'font-black');
      subFontKalpurushCheck?.classList.remove('hidden');

      subFontNikosh?.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-950', 'text-blue-700', 'dark:text-blue-300', 'font-black');
      subFontNikosh?.classList.add('border-slate-300', 'dark:border-slate-600', 'bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
      subFontNikoshCheck?.classList.add('hidden');
    }
  }

  optBtnBijoy?.addEventListener('click', () => updateTargetSelectionUI('all_bijoy'));
  optBtnUnicode?.addEventListener('click', () => updateTargetSelectionUI('all_unicode'));
  subFontNikosh?.addEventListener('click', () => updateSubFontUI('Nikosh'));
  subFontKalpurush?.addEventListener('click', () => updateSubFontUI('Kalpurush'));

  // AI Target Buttons Selection Handler
  const aiTargetBtns = document.querySelectorAll('.ai-target-btn');
  aiTargetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedAiTargetFormat = btn.dataset.aiTarget || 'doc';
      aiTargetBtns.forEach(b => {
        if (b === btn) {
          b.className = 'ai-target-btn p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 shadow-md transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group';
        } else {
          b.className = 'ai-target-btn p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a263d] text-slate-700 dark:text-slate-200 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center hover:border-emerald-500 group shadow-xs';
        }
      });
    });
  });

  // AI OCR Execution Handler
  executeAiConversionBtn?.addEventListener('click', async () => {
    if (!currentScanResult || !currentScanResult.isAiOcr) return;

    // Guard: if already processing, do not start again
    if (window.FayzarAiOcrEngine && window.FayzarAiOcrEngine.state && window.FayzarAiOcrEngine.state.isProcessing) {
      if (typeof window.showToastNotification === 'function') {
        window.showToastNotification('রূপান্তর ইতিমধ্যে চলছে, অনুগ্রহ করে অপেক্ষা করুন', 'info');
      }
      return;
    }

    // Reset progress bar to clean state before starting
    if (wizardProgressBar) wizardProgressBar.style.width = '0%';
    if (wizardProgressPctText) wizardProgressPctText.textContent = '0%';

    step2Box?.classList.add('hidden');
    step3Box?.classList.remove('hidden');
    wizardProgressCard?.classList.remove('hidden');
    wizardResultCard?.classList.add('hidden');

    if (wizardProgressStatus) {
      wizardProgressStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-emerald-600 text-lg"></i> <span id="wizardProgressTitle">AI প্রসেসিং শুরু হচ্ছে...</span>';
    }

    try {
      const res = await window.FayzarAiOcrEngine.startUnifiedOcr(
        'none',
        (statusText, pct) => {
          const pt = document.getElementById('wizardProgressTitle') || wizardProgressTitle;
          if (pt) pt.textContent = statusText;
          if (wizardProgressPctText) wizardProgressPctText.textContent = `${pct}%`;
          if (wizardProgressBar) wizardProgressBar.style.width = `${pct}%`;

          // Dynamic Pipeline Step Highlights
          const s1 = document.getElementById('pipeStep1');
          const s2 = document.getElementById('pipeStep2');
          const s3 = document.getElementById('pipeStep3');
          const s4 = document.getElementById('pipeStep4');

          if (s1 && s2 && s3 && s4) {
            if (pct >= 90) {
              s1.className = 'p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-1.5 shadow-2xs';
              s2.className = 'p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-1.5 shadow-2xs';
              s3.className = 'p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-1.5 shadow-2xs';
              s4.className = 'p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center gap-1.5 shadow-2xs animate-pulse';
            } else if (pct >= 60) {
              s1.className = 'p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-1.5 shadow-2xs';
              s2.className = 'p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-1.5 shadow-2xs';
              s3.className = 'p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center gap-1.5 shadow-2xs animate-pulse';
              s4.className = 'p-2 rounded-xl bg-slate-100 dark:bg-[#1a263d] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5';
            } else if (pct >= 30) {
              s1.className = 'p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-1.5 shadow-2xs';
              s2.className = 'p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center gap-1.5 shadow-2xs animate-pulse';
              s3.className = 'p-2 rounded-xl bg-slate-100 dark:bg-[#1a263d] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5';
              s4.className = 'p-2 rounded-xl bg-slate-100 dark:bg-[#1a263d] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5';
            }
          }
        },
        (liveChunk) => {
          if (wizardPreviewContent) {
            wizardPreviewContent.value = liveChunk;
          }
        }
      );

      if (wizardPreviewContent) {
        wizardPreviewContent.value = (res && res.unicode) || (window.FayzarAiOcrEngine && window.FayzarAiOcrEngine.state && window.FayzarAiOcrEngine.state.unicodeText) || wizardPreviewContent.value || '';
      }

      wizardProgressCard?.classList.add('hidden');
      wizardResultCard?.classList.remove('hidden');

      const baseName = currentScanResult.file.name.replace(/\.[^/.]+$/, '');

      if (wizardResultFileName) wizardResultFileName.textContent = `${baseName}_Converted`;
      if (wizardResultStatsBadge) wizardResultStatsBadge.textContent = `ডকুমেন্ট রূপান্তর সফলভাবে সম্পন্ন হয়েছে (৩টি ফরম্যাটেই প্রস্তুত)`;

      if (wizardDlDocBtn) {
        wizardDlDocBtn.classList.remove('hidden');
        wizardDlDocBtn.onclick = () => window.FayzarAiOcrEngine.downloadWordDocument('doc');
      }
      if (wizardDlDocxBtn) {
        wizardDlDocxBtn.classList.remove('hidden');
        wizardDlDocxBtn.onclick = () => window.FayzarAiOcrEngine.downloadWordDocument('bijoy_docx');
      }
      if (wizardDlUnicodeDocxBtn) {
        wizardDlUnicodeDocxBtn.classList.remove('hidden');
        wizardDlUnicodeDocxBtn.onclick = () => window.FayzarAiOcrEngine.downloadWordDocument('unicode_docx');
      }
      if (wizardStudioPreviewBtn) {
        wizardStudioPreviewBtn.classList.remove('hidden');
        wizardStudioPreviewBtn.onclick = () => {
          if (window.FayzarAiOcrEngine && typeof window.FayzarAiOcrEngine.openStudioPreviewEditor === 'function') {
            window.FayzarAiOcrEngine.openStudioPreviewEditor();
          }
        };
      }
      if (wizardOpenStudioInlineBtn) {
        wizardOpenStudioInlineBtn.onclick = () => {
          if (window.FayzarAiOcrEngine && typeof window.FayzarAiOcrEngine.openStudioPreviewEditor === 'function') {
            window.FayzarAiOcrEngine.openStudioPreviewEditor();
          }
        };
      }
      if (wizardDlMdBtn) {
        wizardDlMdBtn.classList.remove('hidden');
        wizardDlMdBtn.onclick = () => window.FayzarAiOcrEngine.downloadWordDocument('md');
      }
      if (wizardCopyTextBtn) {
        wizardCopyTextBtn.classList.remove('hidden');
      }
      if (wizardVerifyBtn) {
        wizardVerifyBtn.onclick = () => {
          if (window.FayzarAiOcrEngine && typeof window.FayzarAiOcrEngine.runVerificationPipeline === 'function') {
            window.FayzarAiOcrEngine.runVerificationPipeline(false);
          }
        };
      }

      // Show Instant Ready Alert
      if (instantDownloadAlert) {
        if (instantDownloadTitle) instantDownloadTitle.textContent = `ডকুমেন্ট রূপান্তর সফলভাবে সম্পন্ন হয়েছে!`;
        if (instantDownloadSubtitle) instantDownloadSubtitle.textContent = `প্রয়োজনে পেজ সেটাপ পরিবর্তন করে নিচের যেকোনো ওয়ার্ড ফরম্যাটে ফাইলটি ডাউনলোড করুন`;
        instantDownloadAlert.classList.remove('hidden');
        if (alertTimeout) clearTimeout(alertTimeout);
        alertTimeout = setTimeout(() => instantDownloadAlert.classList.add('hidden'), 7000);
      }

    } catch (err) {
      console.error(err);

      // Force-reset processing state so retry works immediately without page reload
      if (window.FayzarAiOcrEngine && window.FayzarAiOcrEngine.state) {
        window.FayzarAiOcrEngine.state.isProcessing = false;
      }
      // Also call setLoading(false) to re-enable convertBtn and hide progress bar
      if (window.FayzarAiOcrEngine && typeof window.FayzarAiOcrEngine.setLoading === 'function') {
        window.FayzarAiOcrEngine.setLoading(false);
      }

      // Reset progress bar UI
      if (wizardProgressBar) wizardProgressBar.style.width = '0%';
      if (wizardProgressPctText) wizardProgressPctText.textContent = '0%';

      const isAbort = err.name === 'AbortError' || (err.message && (err.message.includes('বাতিল') || err.message.includes('aborted') || err.message.includes('abort')));
      const isTimeout = err.message && (err.message.includes('টাইমআউট') || err.message.includes('timeout') || err.message.includes('সাড়া দেয়নি'));

      if (isAbort) {
        if (typeof window.showToastNotification === 'function') {
          window.showToastNotification('রূপান্তর বাতিল করা হয়েছে — পুনরায় চেষ্টা করতে বাটনে ক্লিক করুন', 'info');
        }
      } else if (isTimeout) {
        if (typeof window.showToastNotification === 'function') {
          window.showToastNotification('⏱ সার্ভার সময়মতো সাড়া দেয়নি — পুনরায় চেষ্টা করুন', 'warning');
        }
      } else {
        if (typeof window.showToastNotification === 'function') {
          window.showToastNotification('AI রূপান্তর ব্যর্থ: ' + err.message, 'error');
        }
      }

      // Return to step 2 so user can retry without re-uploading
      step2Box?.classList.remove('hidden');
      step3Box?.classList.add('hidden');
      wizardProgressCard?.classList.add('hidden');
    }
  });


  // Direct 1-Click Action Buttons (.doc and .docx for Office Files)
  actionConvertDocBtn?.addEventListener('click', async () => {
    if (!currentScanResult) return;
    await executeWizardConversion(currentScanResult, 'doc');
  });

  actionConvertDocxBtn?.addEventListener('click', async () => {
    if (!currentScanResult) return;
    await executeWizardConversion(currentScanResult, 'docx');
  });

  actionConvertGenericBtn?.addEventListener('click', async () => {
    if (!currentScanResult) return;
    await executeWizardConversion(currentScanResult, 'generic');
  });

  // Copy Handlers (Preview toggle is managed exclusively by ai-ocr-engine)

  wizardCopyTextBtn?.addEventListener('click', async () => {
    const text = (window.FayzarAiOcrEngine && window.FayzarAiOcrEngine.state && window.FayzarAiOcrEngine.state.unicodeText) 
      || (wizardPreviewContent ? wizardPreviewContent.value : '');
    if (!text) {
      alert('কপি করার মতো কোনো টেক্সট নেই');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      if (typeof window.showToastNotification === 'function') {
        window.showToastNotification('টেক্সট সফলভাবে ক্লিপবোর্ডে কপি হয়েছে!', 'success');
      } else {
        alert('টেক্সট সফলভাবে ক্লিপবোর্ডে কপি হয়েছে!');
      }
    } catch (e) {
      console.warn(e);
    }
  });

  // Sleek Instant Download Alert Elements
  const instantDownloadAlert = document.getElementById('instantDownloadAlert');
  const instantDownloadTitle = document.getElementById('instantDownloadTitle');
  const instantDownloadSubtitle = document.getElementById('instantDownloadSubtitle');
  const closeDownloadAlertBtn = document.getElementById('closeDownloadAlertBtn');
  let alertTimeout = null;

  closeDownloadAlertBtn?.addEventListener('click', () => {
    instantDownloadAlert?.classList.add('hidden');
    if (alertTimeout) clearTimeout(alertTimeout);
  });

  // --- Step 3: Perform Conversion & Direct Browser Auto-Download for Office Files ---
  async function executeWizardConversion(scan, requestedFormat = 'docx') {
    const activeBtn = requestedFormat === 'doc' ? actionConvertDocBtn : (requestedFormat === 'docx' ? actionConvertDocxBtn : actionConvertGenericBtn);
    const origBtnHtml = activeBtn ? activeBtn.innerHTML : '';

    if (activeBtn) {
      activeBtn.disabled = true;
      activeBtn.classList.add('opacity-80', 'cursor-wait');
      activeBtn.innerHTML = '<div class="flex items-center justify-center gap-2 text-xs sm:text-sm font-black py-1"><i class="fa-solid fa-circle-notch fa-spin text-base"></i> <span>রূপান্তর ও ডাউনলোড হচ্ছে...</span></div>';
    }

    const direction = selectedTargetDirection;
    const targetFont = selectedTargetDirection === 'all_unicode' ? selectedUnicodeFont : 'SutonnyMJ';
    const preserveMath = true;

    const options = {
      direction,
      targetFont,
      convertNumbers: false,
      numberFormat: 'keep',
      convertHeaders: true,
      convertFootnotes: true,
      convertComments: true,
      preserveMath,
      pageSize: document.getElementById('ai-target-page-size')?.value || 'a4',
      margin: document.getElementById('ai-target-page-margin')?.value || 'normal'
    };

    try {
      let docxBlob = null;
      let docBlob = null;
      let xlsxBlob = null;
      let pptxBlob = null;

      const baseName = scan.file.name.replace(/\.[^/.]+$/, '');
      const modeSuffix = direction === 'all_unicode' ? 'Unicode' : 'Bijoy_SutonnyMJ';
      let downloadedFileName = '';

      // ── MD File: direct Word download via ExportDualEngine ──
      if (scan.isMdFile || scan.ext === 'md' || scan.ext === 'txt') {
        const mdText = scan.mdText || '';
        if (!mdText.trim()) { alert('MD ফাইলটি খালি।'); return; }
        try {
          // Auto-detect document type from content
          let mdDocType = 'EXAM_CQ';
          if (typeof DocClassifier !== 'undefined') {
            try { 
              const classification = DocClassifier.classify(mdText);
              if (classification && classification.type) mdDocType = classification.type;
            } catch(e) {}
          } else if (mdText.includes('---SECTION_BREAK:MCQ---')) {
            mdDocType = 'EXAM_COMBINED';
          } else if (/^d+.s*(ক)|^d+.s*(a)/m.test(mdText)) {
            mdDocType = 'EXAM_MCQ';
          }

          const mdOptions = {
            font: direction === 'all_unicode' ? 'unicode' : 'bijoy',
            format: requestedFormat,
            paperSize: 'a4-landscape',
            orientation: 'landscape',
            margin: 0.5
          };
          let blob;
          if (typeof ExportDualEngine !== 'undefined') {
            blob = await ExportDualEngine.generateWordDoc(mdText, mdDocType, mdOptions);
          } else {
            throw new Error('ExportDualEngine লোড হয়নি');
          }
          const fileName = baseName + '_' + modeSuffix + '.' + requestedFormat;
          triggerAutoDownload(blob, fileName);
        } catch(e) {
          console.error('MD convert error:', e);
          alert('MD ফাইল কনভার্ট করতে সমস্যা: ' + e.message);
        }
        return;
      }

      if (scan.ext === 'docx') {
        if (typeof DocxHandler === 'undefined') throw new Error('DocxHandler ইঞ্জিন লোড হয়নি');
        const handler = new DocxHandler(options);
        const res = await handler.convertDocx(scan.buffer, options);
        docxBlob = res.blob || res.convertedBlob;

        if (requestedFormat === 'doc') {
          if (typeof DocxToDocConverter !== 'undefined') {
            const docRes = await new DocxToDocConverter().convertDocxToDoc(docxBlob, options);
            docBlob = docRes.blob || docRes.convertedBlob;
          }
          downloadedFileName = `${baseName}_${modeSuffix}.doc`;
          triggerAutoDownload(docBlob || docxBlob, downloadedFileName);
        } else {
          downloadedFileName = `${baseName}_${modeSuffix}.docx`;
          triggerAutoDownload(docxBlob, downloadedFileName);
        }

      } else if (scan.ext === 'doc') {
        if (typeof DocBinaryEngine !== 'undefined') {
          const res = (typeof DocBinaryEngine.convertDoc === 'function')
            ? await DocBinaryEngine.convertDoc(scan.buffer, options)
            : await DocBinaryEngine.convertDocFile(scan.file, options);
          docxBlob = res.docxBlob || res.blob;
          docBlob = res.docBlob;
        } else {
          throw new Error('DocBinaryEngine লোড হয়নি');
        }

        if (requestedFormat === 'doc') {
          if (!docBlob && docxBlob && typeof DocxToDocConverter !== 'undefined') {
            try {
              const docRes = await new DocxToDocConverter().convertDocxToDoc(docxBlob, options);
              docBlob = docRes.blob || docRes.convertedBlob;
            } catch (e) {
              console.warn('Doc conversion fallback', e);
            }
          }
          downloadedFileName = `${baseName}_${modeSuffix}.doc`;
          triggerAutoDownload(docBlob || docxBlob, downloadedFileName);
        } else {
          downloadedFileName = `${baseName}_${modeSuffix}.docx`;
          triggerAutoDownload(docxBlob || docBlob, downloadedFileName);
        }

      } else if (scan.isExcel) {
        if (typeof XlsxHandler !== 'undefined') {
          const res = await XlsxHandler.convertXlsx(scan.buffer, options);
          xlsxBlob = res.blob;
          downloadedFileName = `${baseName}_${modeSuffix}.xlsx`;
          triggerAutoDownload(xlsxBlob, downloadedFileName);
        } else {
          throw new Error('XlsxHandler লোড হয়নি');
        }

      } else if (scan.isPpt) {
        if (typeof PptxHandler !== 'undefined') {
          const res = await PptxHandler.convertPptx(scan.buffer, options);
          pptxBlob = res.blob;
          downloadedFileName = `${baseName}_${modeSuffix}.pptx`;
          triggerAutoDownload(pptxBlob, downloadedFileName);
        } else {
          throw new Error('PptxHandler লোড হয়নি');
        }
      }

      // Show sleek floating success alert
      if (instantDownloadAlert) {
        if (instantDownloadTitle) instantDownloadTitle.textContent = `${downloadedFileName} ডাউনলোড সম্পন্ন হয়েছে!`;
        if (instantDownloadSubtitle) instantDownloadSubtitle.textContent = `ফাইলটি সরাসরি ব্রাউজারে সেভ হয়েছে। প্রয়োজনে অন্য ফরম্যাটেও রূপান্তর করতে পারেন।`;
        instantDownloadAlert.classList.remove('hidden');

        if (alertTimeout) clearTimeout(alertTimeout);
        alertTimeout = setTimeout(() => {
          instantDownloadAlert.classList.add('hidden');
        }, 7000);
      }

    } catch (err) {
      console.error(err);
      alert('রূপান্তর ব্যর্থ হয়েছে: ' + err.message);
    } finally {
      if (activeBtn) {
        activeBtn.disabled = false;
        activeBtn.classList.remove('opacity-80', 'cursor-wait');
        activeBtn.innerHTML = origBtnHtml;
      }
    }
  }

  function triggerAutoDownload(blob, filename) {
    if (!blob) {
      console.warn('triggerAutoDownload: Blob is empty');
      return;
    }
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url);
      }, 1500);
    } catch (e) {
      console.warn('Auto download error', e);
    }
  }

  function populateResultUI(scan, options, docxBlob, docBlob, xlsxBlob, pptxBlob, stats, preview) {
    const baseName = scan.file.name.replace(/\.[^/.]+$/, '');
    const modeSuffix = options.direction === 'all_unicode' ? 'Unicode' : 'Bijoy_SutonnyMJ';

    if (wizardResultFileName) {
      wizardResultFileName.textContent = `${baseName}_Converted`;
    }

    // Stats Details
    if (wizardResultDetails) {
      const statsList = [];
      if (stats.paragraphs || stats.totalParagraphs) statsList.push(`<span><i class="fa-solid fa-paragraph text-emerald-600 mr-1"></i>${toBanglaNumber(stats.paragraphs || stats.totalParagraphs)} প্যারাগ্রাফ</span>`);
      if (stats.cells) statsList.push(`<span><i class="fa-solid fa-table-cells text-emerald-600 mr-1"></i>${toBanglaNumber(stats.cells)} সেল</span>`);
      if (stats.slides) statsList.push(`<span><i class="fa-solid fa-file-powerpoint text-amber-600 mr-1"></i>${toBanglaNumber(stats.slides)} স্লাইড</span>`);
      if (stats.words || stats.totalWords) statsList.push(`<span><i class="fa-solid fa-font text-blue-600 mr-1"></i>${toBanglaNumber(stats.words || stats.totalWords)} শব্দ</span>`);
      if (scan.hasMath && options.preserveMath) {
        statsList.push(`<span class="text-indigo-600 dark:text-indigo-400 font-bold"><i class="fa-solid fa-check mr-1"></i>গণিত সমীকরণ অক্ষুণ্ণ</span>`);
      }
      wizardResultDetails.innerHTML = statsList.join(' • ');
    }

    // Preview
    if (preview && preview.convertedSample && preview.convertedSample.length && wizardPreviewContent) {
      wizardPreviewContent.textContent = preview.convertedSample.slice(0, 8).join('\n\n');
      if (options.direction === 'all_unicode') {
        wizardPreviewContent.classList.remove('font-sutonny');
      } else {
        wizardPreviewContent.classList.add('font-sutonny');
      }
      wizardPreviewBox?.classList.remove('hidden');
    } else {
      wizardPreviewBox?.classList.add('hidden');
    }

    // Download Buttons Setup
    [wizardDlDocxBtn, wizardDlDocBtn, wizardDlUnicodeDocxBtn, wizardDlXlsxBtn, wizardDlPptxBtn].forEach(b => b?.classList.add('hidden'));

    if (scan.isWord) {
      if (docxBlob && (!wizardOutputFormat || wizardOutputFormat.value !== 'doc')) {
        wizardDlDocxBtn?.classList.remove('hidden');
        wizardDlDocxBtn.onclick = () => downloadBlob(docxBlob, `${baseName}_${modeSuffix}.docx`);
      }
      if (docBlob && (!wizardOutputFormat || wizardOutputFormat.value !== 'docx')) {
        wizardDlDocBtn?.classList.remove('hidden');
        wizardDlDocBtn.onclick = () => downloadBlob(docBlob, `${baseName}_${modeSuffix}_Word2003.doc`);
      }
    } else if (scan.isExcel && xlsxBlob) {
      wizardDlXlsxBtn?.classList.remove('hidden');
      wizardDlXlsxBtn.onclick = () => downloadBlob(xlsxBlob, `${baseName}_${modeSuffix}.xlsx`);
    } else if (scan.isPpt && pptxBlob) {
      wizardDlPptxBtn?.classList.remove('hidden');
      wizardDlPptxBtn.onclick = () => downloadBlob(pptxBlob, `${baseName}_${modeSuffix}.pptx`);
    }
  }

  // --- Live Text Converter Logic ---
  const sourceTextArea = document.getElementById('sourceTextArea');
  const targetTextArea = document.getElementById('targetTextArea');
  const textModeAutoBtn = document.getElementById('textModeAutoBtn');
  const textModeU2BBtn = document.getElementById('textModeU2BBtn');
  const textModeB2UBtn = document.getElementById('textModeB2UBtn');
  const swapTextBtn = document.getElementById('swapTextBtn');
  const clearTextBtn = document.getElementById('clearTextBtn');
  const copyConvertedTextBtn = document.getElementById('copyConvertedTextBtn');
  const downloadTextDocxBtn = document.getElementById('downloadTextDocxBtn');
  const downloadTextDocBtn = document.getElementById('downloadTextDocBtn');

  let currentTextMode = 'auto'; // 'auto', 'u2b', 'b2u'

  function updateModeButtons() {
    [textModeAutoBtn, textModeU2BBtn, textModeB2UBtn].forEach(btn => {
      if (!btn) return;
      btn.className = 'px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition';
    });
    if (currentTextMode === 'auto' && textModeAutoBtn) textModeAutoBtn.className = 'px-3 py-1.5 rounded-lg bg-emerald-600 text-white shadow-xs transition';
    if (currentTextMode === 'u2b' && textModeU2BBtn) textModeU2BBtn.className = 'px-3 py-1.5 rounded-lg bg-emerald-600 text-white shadow-xs transition';
    if (currentTextMode === 'b2u' && textModeB2UBtn) textModeB2UBtn.className = 'px-3 py-1.5 rounded-lg bg-emerald-600 text-white shadow-xs transition';
  }

  textModeAutoBtn?.addEventListener('click', () => { currentTextMode = 'auto'; updateModeButtons(); performConvert(); });
  textModeU2BBtn?.addEventListener('click', () => { currentTextMode = 'u2b'; updateModeButtons(); performConvert(); });
  textModeB2UBtn?.addEventListener('click', () => { currentTextMode = 'b2u'; updateModeButtons(); performConvert(); });

  swapTextBtn?.addEventListener('click', () => {
    if (!sourceTextArea || !targetTextArea) return;
    const src = sourceTextArea.value;
    const tgt = targetTextArea.value;
    sourceTextArea.value = tgt;
    if (currentTextMode === 'u2b') currentTextMode = 'b2u';
    else if (currentTextMode === 'b2u') currentTextMode = 'u2b';
    updateModeButtons();
    performConvert();
  });

  clearTextBtn?.addEventListener('click', () => {
    if (sourceTextArea) sourceTextArea.value = '';
    if (targetTextArea) targetTextArea.value = '';
    updateStats();
  });

  copyConvertedTextBtn?.addEventListener('click', async () => {
    const val = targetTextArea ? targetTextArea.value : '';
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      alert('কনভার্ট করা টেক্সট কপি হয়েছে!');
    } catch(e) {
      targetTextArea.select();
      document.execCommand('copy');
      alert('কনভার্ট করা টেক্সট কপি হয়েছে!');
    }
  });

  function performConvert() {
    if (!sourceTextArea || !targetTextArea) return;
    const input = sourceTextArea.value;
    if (!input) {
      targetTextArea.value = '';
      updateStats();
      return;
    }

    if (typeof BanglaConverter === 'undefined') return;

    let output = '';
    let isU2B = true;

    if (currentTextMode === 'u2b') {
      output = BanglaConverter.unicodeToBijoy(input);
      isU2B = true;
    } else if (currentTextMode === 'b2u') {
      output = BanglaConverter.bijoyToUnicode(input);
      isU2B = false;
    } else {
      isU2B = BanglaConverter.hasBengaliText(input);
      output = isU2B ? BanglaConverter.unicodeToBijoy(input) : BanglaConverter.bijoyToUnicode(input);
    }

    if (isU2B) {
      sourceTextArea.classList.remove('font-sutonny');
      targetTextArea.classList.add('font-sutonny');
    } else {
      sourceTextArea.classList.add('font-sutonny');
      targetTextArea.classList.remove('font-sutonny');
    }

    // Apply universal Question Paper formatting (serials, MCQ leading tabs & dots, CQ dot subquestions, English bypassed)
    if (typeof DocxHandler !== 'undefined' && typeof DocxHandler.formatQuestionPaper === 'function') {
      output = DocxHandler.formatQuestionPaper(output, isU2B);
    } else if (typeof BanglaConverter !== 'undefined' && typeof BanglaConverter.formatQuestionPaper === 'function') {
      output = BanglaConverter.formatQuestionPaper(output, isU2B);
    }

    targetTextArea.value = output;
    updateStats();
  }

  function updateStats() {
    if (!sourceTextArea) return;
    const srcVal = sourceTextArea.value;
    const tgtVal = targetTextArea ? targetTextArea.value : '';
    const srcStats = document.getElementById('sourceStats');
    const tgtStats = document.getElementById('targetStats');

    if (srcStats) {
      const srcWords = srcVal.trim() ? srcVal.trim().split(/\s+/).length : 0;
      srcStats.textContent = `${toBanglaNumber(srcWords)} শব্দ | ${toBanglaNumber(srcVal.length)} বর্ণ`;
    }
    if (tgtStats) {
      const tgtWords = tgtVal.trim() ? tgtVal.trim().split(/\s+/).length : 0;
      tgtStats.textContent = `${toBanglaNumber(tgtWords)} শব্দ | ${toBanglaNumber(tgtVal.length)} বর্ণ`;
    }
  }

  sourceTextArea?.addEventListener('input', performConvert);

  // Helper to detect structured question/document layout in text
  function hasLayoutStructure(str) {
    if (!str) return false;
    return /^[১-৯1-9]+[।\.]/m.test(str) ||
           /^[ক-ঘa-d][\.\)]/m.test(str) ||
           /\[[০-৯0-9]+\]/m.test(str) ||
           /^#{1,4}\s+/m.test(str) ||
           /^\|.+\|$/m.test(str);
  }

  // Direct DOCX download (with Smart Auto-Layout)
  downloadTextDocxBtn?.addEventListener('click', async () => {
    const isU2B = (currentTextMode === 'u2b') || (currentTextMode === 'auto' && BanglaConverter.hasBengaliText(sourceTextArea.value));
    const text = (isU2B && sourceTextArea && sourceTextArea.value.trim()) ? sourceTextArea.value : (targetTextArea ? targetTextArea.value : '');
    if (!text.trim()) return;
    const fontName = isU2B ? 'SutonnyMJ' : 'Kalpurush';
    const pageSize = document.getElementById('ai-target-page-size')?.value || 'a4';
    const margin = document.getElementById('ai-target-page-margin')?.value || 'normal';

    try {
      let docxBlob = null;
      if (typeof MdLayoutParser !== 'undefined' && typeof DocxLayoutBuilder !== 'undefined' && hasLayoutStructure(text)) {
        const detectFn = (t) => {
          if (typeof MdLayoutParser !== 'undefined' && typeof MdLayoutParser.detectDocumentProfile === 'function') {
            const prof = MdLayoutParser.detectDocumentProfile(t);
            if (prof?.archetypeId === 'bengali_combined_exam_paper') return 'bengali_combined_exam_paper';
            if (prof?.archetypeId === 'english_question_paper') return 'english_question_paper';
          }
          if (typeof detectDocumentLayout === 'function') return detectDocumentLayout(t);
          if (window.FayzarAiOcrEngine?.detectDocumentLayout) return window.FayzarAiOcrEngine.detectDocumentLayout(t);
          return 'question-2col';
        };
        const detectedLayout = detectFn(text);
        const ast = MdLayoutParser.parse(text, { layout: detectedLayout, pageSize });
        docxBlob = await DocxLayoutBuilder.build(ast, { font: fontName });
      } else if (typeof DocxHandler !== 'undefined') {
        docxBlob = await DocxHandler.createDocxFromText(text, { fontName, isBijoy: isU2B, pageSize, margin });
      }

      if (docxBlob) {
        downloadBlob(docxBlob, `Text_${isU2B ? 'Bijoy_SutonnyMJ' : 'Unicode'}_${Date.now()}.docx`);
        if (typeof window.showToastNotification === 'function') {
          window.showToastNotification('DOCX ফাইল সফলভাবে প্রস্তুত হয়েছে!', 'success');
        }
      }
    } catch(err) {
      console.error('Text DOCX generation error', err);
    }
  });

  // Direct Word 2003 DOC download (with Smart Auto-Layout)
  downloadTextDocBtn?.addEventListener('click', async () => {
    const isU2B = (currentTextMode === 'u2b') || (currentTextMode === 'auto' && BanglaConverter.hasBengaliText(sourceTextArea.value));
    const text = (isU2B && sourceTextArea && sourceTextArea.value.trim()) ? sourceTextArea.value : (targetTextArea ? targetTextArea.value : '');
    if (!text.trim()) return;
    const fontName = isU2B ? 'SutonnyMJ' : 'Kalpurush';
    const pageSize = document.getElementById('ai-target-page-size')?.value || 'a4';
    const margin = document.getElementById('ai-target-page-margin')?.value || 'normal';

    try {
      let docBlob = null;
      if (typeof MdLayoutParser !== 'undefined' && hasLayoutStructure(text)) {
        const detectFn = (t) => {
          if (typeof MdLayoutParser !== 'undefined' && typeof MdLayoutParser.detectDocumentProfile === 'function') {
            const prof = MdLayoutParser.detectDocumentProfile(t);
            if (prof?.archetypeId === 'bengali_combined_exam_paper') return 'bengali_combined_exam_paper';
            if (prof?.archetypeId === 'english_question_paper') return 'english_question_paper';
          }
          if (typeof detectDocumentLayout === 'function') return detectDocumentLayout(t);
          if (window.FayzarAiOcrEngine?.detectDocumentLayout) return window.FayzarAiOcrEngine.detectDocumentLayout(t);
          return 'question-2col';
        };
        const detectedLayout = detectFn(text);
        const ast = MdLayoutParser.parse(text, { layout: detectedLayout, pageSize });

        // মূল পরীক্ষিত পাইপলাইন: DocxLayoutBuilder (মাস্টার) -> DocxHandler (বিজয় রূপান্তর) -> DocxToDocConverter (.doc)
        if (typeof DocxLayoutBuilder !== 'undefined' && typeof DocxToDocConverter !== 'undefined') {
          const docxBlob = await DocxLayoutBuilder.build(ast, { font: isU2B ? 'Kalpurush' : fontName });
          let targetBlob = docxBlob;
          if (isU2B && typeof DocxHandler !== 'undefined' && typeof DocxHandler.convertDocx === 'function') {
            const bijoyRes = await DocxHandler.convertDocx(docxBlob, { direction: 'u2b', targetFont: 'SutonnyMJ' });
            targetBlob = bijoyRes.convertedBlob || bijoyRes.blob;
          }
          const docxConverter = new DocxToDocConverter();
          const docResult = await docxConverter.convertDocxToDoc(targetBlob, {
            pageSize,
            margin,
            preserveSutonny: (fontName === 'SutonnyMJ'),
            optimizeForQuestionPaper: true
          });
          docBlob = docResult.blob || docResult.convertedBlob;
        } else if (typeof DocWord2003Builder !== 'undefined') {
          docBlob = DocWord2003Builder.build(ast, { font: fontName });
        }
      } else if (typeof DocxHandler !== 'undefined') {
        docBlob = DocxHandler.createDocFromText(text, fontName, isU2B, 12, { pageSize, margin });
      }

      if (docBlob) {
        downloadBlob(docBlob, `Text_${isU2B ? 'SutonnyMJ' : 'Unicode'}_Word2003_${Date.now()}.doc`);
        if (typeof window.showToastNotification === 'function') {
          window.showToastNotification('Word 2003 (.doc) ফাইল প্রস্তুত হয়েছে!', 'success');
        }
      }
    } catch(err) {
      console.error('Text DOC generation error', err);
    }
  });

  // Converter Feedback Form Handler
  const converterFeedbackForm = document.getElementById('converterFeedbackForm');
  const fbStatusMsg = document.getElementById('fbStatusMsg');
  const fbSubmitBtn = document.getElementById('fbSubmitBtn');

  converterFeedbackForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('fbUserName')?.value.trim();
    const contact = document.getElementById('fbUserContact')?.value.trim();
    const category = document.getElementById('fbCategory')?.value;
    const message = document.getElementById('fbUserMessage')?.value.trim();

    if (!name || !contact || !message) return;

    try {
      const existing = JSON.parse(localStorage.getItem('fayzar_converter_feedbacks') || '[]');
      existing.push({
        name,
        contact,
        category,
        message,
        date: new Date().toISOString()
      });
      localStorage.setItem('fayzar_converter_feedbacks', JSON.stringify(existing));
    } catch(err) {
      console.warn('Feedback save warning', err);
    }

    if (fbStatusMsg) {
      fbStatusMsg.classList.remove('hidden');
    }
    if (fbSubmitBtn) {
      fbSubmitBtn.disabled = true;
      fbSubmitBtn.innerHTML = '<i class="fa-solid fa-check"></i> পাঠানো হয়েছে';
    }

    setTimeout(() => {
      converterFeedbackForm.reset();
      if (fbSubmitBtn) {
        fbSubmitBtn.disabled = false;
        fbSubmitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> মতামত পাঠান';
      }
      setTimeout(() => fbStatusMsg?.classList.add('hidden'), 4500);
    }, 1800);
  });
}



// 4. Age Calculator Engine
function initAgeCalcEngine() {
  const ageForm = document.getElementById('age-calc-form');
  const birthInput = document.getElementById('age-birth-date');
  const targetInput = document.getElementById('age-target-date');
  const resultBox = document.getElementById('age-result-box');
  const resYears = document.getElementById('age-res-years');
  const resMonths = document.getElementById('age-res-months');
  const resDays = document.getElementById('age-res-days');
  const badgeDiv = document.getElementById('age-general-badge');

  if (!ageForm) return;

  // Set default target date to today
  if (targetInput && !targetInput.value) {
    targetInput.value = new Date().toISOString().split('T')[0];
  }

  ageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const bDate = new Date(birthInput.value);
    const tDate = new Date(targetInput.value);

    if (isNaN(bDate) || isNaN(tDate) || bDate > tDate) {
      alert('সঠিক জন্ম ও নির্ধারিত তারিখ প্রদান করুন!');
      return;
    }

    let years = tDate.getFullYear() - bDate.getFullYear();
    let months = tDate.getMonth() - bDate.getMonth();
    let days = tDate.getDate() - bDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(tDate.getFullYear(), tDate.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    resYears.textContent = years;
    resMonths.textContent = months;
    resDays.textContent = days;

    const isGeneralEligible = years >= 18 && (years < 32 || (years === 32 && months === 0 && days === 0));
    badgeDiv.innerHTML = isGeneralEligible
      ? `<div class="p-3 rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-2"><i class="fas fa-check-circle text-emerald-600 text-sm"></i> সরকারি চাকরির সাধারণ বয়সসীমা (১৮–৩২ বছর) অনুযায়ী আপনি আবেদনের যোগ্য।</div>`
      : `<div class="p-3 rounded-2xl bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold flex items-center gap-2"><i class="fas fa-exclamation-circle text-rose-600 text-sm"></i> আপনার বয়স সাধারণ চাকরির নির্ধারিত সীমা অতিক্রম করেছে বা অপ্রাপ্তবয়স্ক।</div>`;

    resultBox.classList.remove('hidden');
  });
}

// 5. Land Area & Deed Calculator Engine
function initLandCalculatorEngine() {
  const cShotok = document.getElementById('conv-shotok');
  const cKatha = document.getElementById('conv-katha');
  const cBigha = document.getElementById('conv-bigha');
  const cAcre = document.getElementById('conv-acre');

  if (!cShotok) return;

  cShotok.addEventListener('input', () => {
    const val = parseFloat(cShotok.value) || 0;
    cKatha.value = (val / 1.65).toFixed(3);
    cBigha.value = (val / 33).toFixed(3);
    cAcre.value = (val / 100).toFixed(3);
  });

  cKatha.addEventListener('input', () => {
    const val = parseFloat(cKatha.value) || 0;
    const shotok = val * 1.65;
    cShotok.value = shotok.toFixed(3);
    cBigha.value = (shotok / 33).toFixed(3);
    cAcre.value = (shotok / 100).toFixed(3);
  });
}

window.calculateDeedFees = function() {
  const deedValInput = document.getElementById('deed-value');
  const deedArea = document.getElementById('deed-area')?.value || 'paurashava';
  const feeReg = document.getElementById('fee-reg');
  const feeStamp = document.getElementById('fee-stamp');
  const feeLocal = document.getElementById('fee-local');
  const feeAit = document.getElementById('fee-ait');
  const feeTotal = document.getElementById('fee-total');

  if (!deedValInput || !feeReg) return;
  const val = parseFloat(deedValInput.value) || 0;

  const reg = Math.round(val * 0.01);
  const stamp = Math.round(val * 0.015);
  const local = Math.round(val * 0.03);
  const ait = Math.round(val * 0.03);
  const total = reg + stamp + local + ait + 650; // incl court fee / affidavit

  feeReg.textContent = `${reg.toLocaleString('bn-BD')} ৳`;
  feeStamp.textContent = `${stamp.toLocaleString('bn-BD')} ৳`;
  feeLocal.textContent = `${local.toLocaleString('bn-BD')} ৳`;
  feeAit.textContent = `${ait.toLocaleString('bn-BD')} ৳`;
  feeTotal.textContent = `${total.toLocaleString('bn-BD')} ৳`;
};

// Forms Helper
function initForms() {
  const quickForm = document.getElementById('quick-service-form');
  if (quickForm) {
    quickForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('order-name').value;
      const phone = document.getElementById('order-phone').value;
      const service = document.getElementById('order-service-select').selectedOptions[0].text;
      const notes = document.getElementById('order-notes')?.value || '';

      const msg = `আসসালামু আলাইকুম, আমি অনলাইন সার্ভিস নিতে চাচ্ছি।\n\nনাম: ${name}\nমোবাইল: ${phone}\nপ্রয়োজনীয় সেবা: ${service}\nবিবরণ: ${notes}`;
      const url = `https://wa.me/8801717101919?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    });
  }

  // যোগাযোগ সেকশনের গ্রাহক মতামত ও মন্তব্য ফর্ম হ্যান্ডলার (Customer Feedback Form)
  const contactFeedbackForm = document.getElementById('contactFeedbackForm');
  const contactFbStatusMsg = document.getElementById('contactFbStatusMsg');
  const contactFbSubmitBtn = document.getElementById('contactFbSubmitBtn');

  if (contactFeedbackForm) {
    contactFeedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('contactFbUserName')?.value.trim();
      const contact = document.getElementById('contactFbUserContact')?.value.trim();
      const category = document.getElementById('contactFbCategory')?.value;
      const message = document.getElementById('contactFbUserMessage')?.value.trim();

      if (!name || !contact || !message) return;

      const fbPayload = {
        id: 'fb_' + Date.now(),
        name,
        contact,
        category,
        message,
        rating: 5,
        status: 'pending',
        date: new Date().toISOString()
      };

      if (contactFbSubmitBtn) {
        contactFbSubmitBtn.disabled = true;
        contactFbSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> পাঠানো হচ্ছে...';
      }

      try {
        // 1. Try Firebase Cloud Save
        if (typeof FayzarFirebaseClient !== 'undefined' && FayzarFirebaseClient.submitFeedback) {
          await FayzarFirebaseClient.submitFeedback(fbPayload).catch(() => {});
        }

        // 2. Try Node Backend Save
        fetch('/api/submit-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fbPayload)
        }).catch(() => {});

        // 3. Save to LocalStorage for offline & instant admin panel visibility
        const existing = JSON.parse(localStorage.getItem('fayzar_contact_feedbacks') || '[]');
        existing.unshift(fbPayload);
        localStorage.setItem('fayzar_contact_feedbacks', JSON.stringify(existing));
      } catch(err) {
        console.warn('Contact feedback storage warning', err);
      }

      if (contactFbStatusMsg) {
        contactFbStatusMsg.classList.remove('hidden');
      }
      if (contactFbSubmitBtn) {
        contactFbSubmitBtn.innerHTML = '<i class="fa-solid fa-check"></i> সফলভাবে গৃহীত হয়েছে';
      }

      setTimeout(() => {
        contactFeedbackForm.reset();
        if (contactFbSubmitBtn) {
          contactFbSubmitBtn.disabled = false;
          contactFbSubmitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> মতামত পাঠান';
        }
        setTimeout(() => contactFbStatusMsg?.classList.add('hidden'), 4500);
      }, 1800);
    });
  }
}

// Utility Blob Downloader
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ৪. শপ রেট চার্ট (দোকানের কাজের মূল্য তালিকা) লাইভ সার্চ ও ক্যাটাগরি ফিল্টার কন্ট্রোলার
function initRateChartController() {
  const searchInput = document.getElementById('rate-search-input');
  const tabBtns = document.querySelectorAll('.rate-tab-btn');
  const cards = document.querySelectorAll('.rate-category-card');
  const tableRows = document.querySelectorAll('#master-rate-table tbody tr.rate-table-row');
  const noResultRow = document.getElementById('rate-table-no-results');

  if (!cards.length && !tableRows.length) return;

  let activeCat = 'all';
  let searchQuery = '';

  function filterRateItems() {
    // ১. কার্ড ফিল্টারিং (যদি পেজে কার্ড থাকে)
    cards.forEach(card => {
      const cardCat = card.dataset.rateCategory;
      const textContent = card.textContent.toLowerCase();
      const matchesCat = (activeCat === 'all' || cardCat === activeCat);
      const matchesSearch = (!searchQuery || textContent.includes(searchQuery));
      card.style.display = (matchesCat && matchesSearch) ? 'flex' : 'none';
    });

    // ২. একক ছক / মাস্টার টেবিল রো ফিল্টারিং
    let visibleRowCount = 0;
    tableRows.forEach(row => {
      const rowCat = row.dataset.rateCategory;
      const textContent = row.textContent.toLowerCase();
      const matchesCat = (activeCat === 'all' || rowCat === activeCat);
      const matchesSearch = (!searchQuery || textContent.includes(searchQuery));
      if (matchesCat && matchesSearch) {
        row.style.display = '';
        visibleRowCount++;
      } else {
        row.style.display = 'none';
      }
    });

    if (noResultRow) {
      noResultRow.style.display = (visibleRowCount === 0 && tableRows.length > 0) ? '' : 'none';
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.className = 'rate-tab-btn px-3 py-2 rounded-xl text-xs font-bold border bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition cursor-pointer';
      });
      btn.className = 'rate-tab-btn active px-3.5 py-2 rounded-xl text-xs font-black border bg-emerald-600 text-white shadow-xs transition cursor-pointer';
      activeCat = btn.dataset.rateCat || 'all';
      filterRateItems();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      filterRateItems();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRateChartController);
} else {
  initRateChartController();
}
