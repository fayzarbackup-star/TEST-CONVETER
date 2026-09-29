/**
 * Fayzar Computer - Internationalization (i18n) & Day/Night Theme Engine
 * 100% Client-side, Zero-dependency, Offline-compatible
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Translations Dictionary (Bangla & English)
  // =========================================================================
  const translations = {
    bn: {
      // Top Bar
      top_phone: '+880 1717-101919',
      top_location: 'ফুলবাড়ী সরকারি কলেজ গেট, দিনাজপুর',
      top_hours: 'শনি - বৃহস্পতি: সকাল ১০টা - রাত ৯টা | শুক্র: বিকাল ৪টা - রাত ৯টা',
      top_hotline: 'ভূমি সেবা: ১৬১২২ | জরুরি সেবা: ৯৯৯',
      topbar_tagline: 'স্মার্ট ভূমিসেবা ও নাগরিক ডিজিটাল সহায়তা কেন্দ্র',
      topbar_status: 'দোকান খোলা আছে (রাত ৯টা পর্যন্ত)',
      theme_day: 'ডে মোড',
      theme_night: 'নাইট মোড',
      lang_label: 'বাংলা',
      
      // Brand
      brand_name: 'ফয়জার কম্পিউটার',
      brand_sub: 'ডিজিটাল ও ভূমিসেবা কেন্দ্র',
      brand_domain: 'fayzarcomputer.com.bd',

      // 8-Item Sequential Navigation Menu
      nav_home: 'হোম',
      nav_land: 'ভূমিসেবা',
      nav_services: 'অন্যান্য সেবাসমূহ',
      nav_notices: 'চাকরি সংক্রান্ত',
      nav_tools: 'কনভার্টার ও টুলস',
      nav_results: 'ফলাফল',
      nav_links: 'প্রয়োজনীয় ওয়েবলিংক',
      nav_contact: 'যোগাযোগ',
      nav_cta: 'শুরু করুন',
      nav_services_short: 'সার্ভিস',
      nav_jobs_short: 'জব',
      nav_converter_short: 'কনভার্টার',
      nav_tools_short: 'টুলস',
      nav_results_short: 'রেজাল্ট',
      nav_contact_short: 'কন্টাক্ট',

      // Hero Section
      hero_badge: 'সরকার অনুমোদিত ভূমিসেবা কেন্দ্র (দিনাজ/ফুল/এলএসএসএফসি-০৭/২০২৫)',
      hero_title: 'ফয়জার কম্পিউটার এন্ড ফটোস্ট্যাট',
      hero_domain: 'fayzarcomputer.com.bd',
      hero_subtitle: 'আপনার বিশ্বস্ত ডিজিটাল, অনলাইন ও ভূমিসেবা সহায়তা কেন্দ্র',
      hero_description: 'ই-নামজারি, খতিয়ান ও খাজনা পরিশোধের পাশাপাশি সরকারি চাকরির আবেদন, জাতীয় বিশ্ববিদ্যালয় ভর্তি, টেলিটক ছবি রিসাইজিং এবং ডিজিটাল প্রিন্টিং সেবা।',
      hero_btn_services: 'আমাদের সেবাসমূহ',
      hero_btn_converter: 'কনভার্টার ও টুলস',

      // 4-Column Core Solutions Grid
      grid_tag: 'আমাদের মূল শক্তিমত্তা',
      grid_title: 'আপনার জন্য বিশেষায়িত ডিজিটাল সেবা সমাধান',
      grid_subtitle: 'স্বল্প সময়ে, সরকারি নিয়মে বিশ্বস্ত কম্পিউটার ও ভূমিসেবা সহায়তা',
      
      card1_badge: 'ভূমিসেবা',
      card1_title: 'ডিজিটাল ভূমিসেবা',
      card1_desc: 'খতিয়ান অনুসন্ধান, জমির পর্চা, ই-নামজারি ও বার্ষিক খাজনা পরিশোধ',
      card1_link: 'বিস্তারিত দেখুন →',

      card2_badge: 'অনলাইন',
      card2_title: 'নাগরিক অনলাইন সেবা',
      card2_desc: 'চাকরি, ভর্তি, এনআইডি, পাসপোর্ট, ড্রাইভিং ও আয়কর ই-রিটার্ন আবেদন',
      card2_link: 'বিস্তারিত দেখুন →',

      card3_badge: 'কম্পোজ ও টাইপিং',
      card3_title: 'ডকুমেন্ট টাইপিং ও কম্পোজ',
      card3_desc: 'দ্রুত বাংলা ও ইংরেজি কম্পোজ, আবেদনপত্র, চুক্তিপত্র ও নির্ভুল ফরম্যাটিং',
      card3_link: 'বিস্তারিত দেখুন →',
      card3_btn_quick: '⚡ ইউনিকোড ⇄ বিজয় কনভার্টার খুলুন',

      card4_badge: 'প্রিন্টিং ও স্টুডিও',
      card4_title: 'প্রিন্টিং ও ফটোস্ট্যাট',
      card4_desc: 'হাই-স্পিড ডিজিটাল ফটোকপি, কালার প্রিন্ট, ল্যামিনেশন ও পাসপোর্ট ছবি',
      card4_link: 'বিস্তারিত দেখুন →',

      // Land Services Spotlight
      land_tag: 'বিশেষায়িত সেবা',
      land_title: 'স্মার্ট ভূমিসেবা ও নাগরিক সহায়তা',
      land_subtitle: 'ভূমি মন্ত্রণালয় অনুমোদিত কেন্দ্র থেকে নির্ভুল ও হয়রানিমুক্ত সেবা',
      land_mutation_title: 'ই-নামজারি ও খতিয়ান',
      land_mutation_desc: 'জমি ক্রয় বা ওয়ারিশসূত্রে প্রাপ্ত জমির নতুন খতিয়ান তৈরি ও অনলাইন ট্র্যাকিং।',
      land_tax_title: 'অনলাইন জমির খাজনা (LD-Tax)',
      land_tax_desc: 'হোল্ডিং এন্ট্রি, ভূমি উন্নয়ন কর পরিশোধ এবং তাৎক্ষণিক ডিজিটাল দাখিলা রসিদ।',
      land_khatian_title: 'পর্চা ও মৌজা ম্যাপ',
      land_khatian_desc: 'CS, SA, RS খতিয়ান যাচাই এবং ডাকযোগে মূল সার্টিফাইড পর্চা ও ডিজিটাল ম্যাপ সংগ্রহ।',
      land_btn_apply: 'আবেদন করুন →',
      land_btn_pay: 'খাজনা দিন →',
      land_btn_search: 'পর্চা খুঁজুন →',
      land_view_all: 'সকল ভূমিসেবা দেখুন →',

      // Live Circulars Section
      notices_tag: 'তাত্ক্ষণিক বিজ্ঞপ্তি',
      notices_title: 'চলমান চাকরি ও ভর্তি বিজ্ঞপ্তি',
      notices_subtitle: 'সরকারি-বেসরকারি চাকরি ও বিভিন্ন পরীক্ষার সর্বশেষ সময়সীমা',
      notices_view_all: 'সকল বিজ্ঞপ্তি দেখুন',
      notice_apply_online: 'অনলাইন আবেদন লিংক →',
      notice_apply_shop: 'দোকান থেকে আবেদন',
      notice_vacancies_lbl: 'পদসংখ্যা:',
      notice_deadline_lbl: 'শেষ সময়:',

      // Useful Web Links
      links_tag: 'সরকারি ও শিক্ষামূলক পোর্টাল',
      links_title: 'প্রয়োজনীয় গুরুত্বপূর্ণ ওয়েবলিংকসমূহ',
      links_subtitle: 'এক ক্লিকেই প্রবেশ করুন জাতীয় ভূমিসেবা, শিক্ষাবোর্ড, চাকরি ও নাগরিক পোর্টালে',
      links_cat_land: 'ভূমিসেবা পোর্টাল',
      links_cat_job: 'চাকরি ও নিয়োগ পোর্টাল',
      links_cat_citizen: 'নাগরিক সেবা পোর্টাল',
      links_cat_edu: 'শিক্ষা ও ফলাফল পোর্টাল',
      link_mutation: 'ই-নামজারি পোর্টাল',
      link_ldtax: 'ভূমি উন্নয়ন কর (LD-Tax)',
      link_eporcha: 'অনলাইন খতিয়ান (e-Porcha)',
      link_dlrs: 'মৌজা ম্যাপ পোর্টাল (DLRS)',
      link_land_help: 'জাতীয় ভূমি হেল্পলাইন: ১৬১২২',
      link_alljobs: 'টেলিটক অলজবস (AllJobs)',
      link_bpsc: 'সরকারি কর্ম কমিশন (BPSC)',
      link_dpe: 'প্রাথমিক শিক্ষা অধিদপ্তর (DPE)',
      link_bb: 'বাংলাদেশ ব্যাংক ই-রিক্রুটমেন্ট',
      link_job_help: 'অনলাইন আবেদন সহায়তা সেবা',
      link_nid: 'এনআইডি পোর্টাল (NID Wing)',
      link_epassport: 'ই-পাসপোর্ট পোর্টাল (E-Passport)',
      link_pcc: 'পুলিশ ক্লিয়ারেন্স (PCC)',
      link_etax: 'অনলাইন আয়কর রিটার্ন (e-Return)',
      link_citizen_help: 'সরকারি ফি ও চালান সমাধান',
      link_nu: 'জাতীয় বিশ্ববিদ্যালয় ভর্তি ও ফরম',
      link_eduboard: 'শিক্ষাবোর্ড ফলাফল (SSC/HSC)',
      link_phulbari_col: 'ফুলবাড়ী সরকারি কলেজ নোটিশ',
      link_bteb: 'কারিগরি শিক্ষা বোর্ড (BTEB)',
      link_edu_help: 'ভর্তি ও রেজাল্ট মার্কশিট প্রিন্ট',

      // Customer Reviews & Testimonials
      reviews_tag: 'গ্রাহক মতামত',
      reviews_title: 'আমাদের সম্মানিত গ্রাহকদের অভিজ্ঞতা',
      reviews_subtitle: 'নির্ভুল ও দ্রুত ডিজিটাল সেবায় ফুলবাড়ীবাসীর বিশ্বস্ত কেন্দ্র',
      review1_name: 'মাহমুদুল হাসান',
      review1_role: 'বিশ্ববিদ্যালয় শিক্ষার্থী',
      review1_service: 'অনলাইন আবেদন ও ফরম',
      review1_text: 'চমৎকার ও আন্তরিক সেবা। চাকরির আবেদনের ছবি ও স্বাক্ষর নিখুঁতভাবে রিসাইজ করে সঠিক সময়ে সাবমিট করে দিয়েছেন।',
      review2_name: 'মোঃ আনোয়ারুল ইসলাম',
      review2_role: 'ব্যবসায়ী ও ভূমির মালিক',
      review2_service: 'ডিজিটাল ভূমিসেবা',
      review2_text: 'খুবই দ্রুততম সময়ে জমির ই-নামজারি আবেদন ও ট্র্যাকিং করে দিয়েছেন। ফুলবাড়ীতে এমন নির্ভরযোগ্য সেবা পাওয়া সত্যি আনন্দের।',
      review3_name: 'রাবেয়া খাতুন',
      review3_role: 'সরকারি প্রাথমিক শিক্ষক প্রার্থী',
      review3_service: 'টেলিটক আবেদন ও এডমিট',
      review3_text: 'প্রাথমিক শিক্ষক নিয়োগের আবেদন ও প্রবেশপত্র প্রিন্ট নির্ভুলভাবে পেয়েছি। ফয়জার ভাইয়ের সেবা অত্যন্ত আন্তরিক।',

      // Contact & Footer
      contact_tag: 'আমাদের অবস্থান',
      contact_title: 'সরাসরি আমাদের সেন্টারে আসুন',
      contact_subtitle: 'ফুলবাড়ী সরকারি কলেজ গেটের পশ্চিম পার্শ্বে, ফুলবাড়ী, দিনাজপুর',
      contact_phone_lbl: 'মোবাইল নম্বর:',
      contact_whatsapp_lbl: 'হোয়াটসঅ্যাপ চ্যাট:',
      contact_hours_lbl: 'খোলা থাকার সময়:',
      footer_desc: 'সরকার অনুমোদিত উন্মুক্ত ভূমিসেবা কেন্দ্র (LSFC) ও বিশ্বস্ত ডিজিটাল সার্ভিস সেন্টার। ফুলবাড়ী, দিনাজপুর।',
      footer_col_services: 'জনপ্রিয় সেবাসমূহ',
      footer_col_links: 'প্রয়োজনীয় লিংক',
      footer_col_helpline: 'জরুরি হেল্পলাইন',
      footer_quick_nav: 'দ্রুত নেভিগেশন',
      footer_tools_title: 'টুলস ও পোর্টাল',
      footer_tool_converter: 'ইউনিকোড ⇄ বিজয় কনভার্টার',
      footer_tool_equation: 'ওয়ার্ড EQ ও ল্যাটেক্স কনভার্টার',
      footer_tool_ocr: 'AI OCR প্রশ্নপত্র কনভার্টার',
      footer_tool_resizer: 'টেলিটক ছবি ও স্বাক্ষর রিসাইজার',
      footer_admin: 'এডমিন প্যানেল',
      footer_proprietor: 'প্রোপাইটর: মোঃ ফয়জার আলী',
      footer_approval: 'অনুমোদন নং: দিনাজ/ফুল/এলএসএসএফসি-০৭/২০২৫',
      footer_rights: '© ২০২৬ সর্বস্বত্ব সংরক্ষিত। ফয়জার কম্পিউটার এন্ড ফটোস্ট্যাট।',
      footer_address_line: 'ফুলবাড়ী সরকারি কলেজ গেট, ফুলবাড়ী, দিনাজপুর | ফোন: 01717-101919',
      btn_whatsapp: 'হোয়াটসঅ্যাপে মেসেজ',
      btn_call_now: 'সরাসরি কল',
      btn_apply_online: 'অনলাইন আবেদন লিংক →',
      btn_apply_shop: 'দোকান থেকে আবেদন',
      notice_vacancies: 'পদসংখ্যা:',
      notice_deadline: 'শেষ সময়:',

      // Land.gov.bd Inspired Redesign Keys
      topbar_helpline: 'ভূমিসেবা হটলাইন: ১৬১২২ | জরুরি সেবা: ৯৯৯',
      topbar_shop_phone: 'দোকান যোগাযোগ: ০১৭১৭-১০১৯১৯',
      topbar_timing: 'প্রতিদিন: সকাল ৯:০০ - রাত ১০:০০',
      nav_applications: 'অনলাইন আবেদন',
      nav_converter: 'বাংলা কনভার্টার',
      nav_print_studio: 'প্রিন্ট ও স্টুডিও',
      search_placeholder: 'যে কোনো সেবা খুঁজুন... (যেমন: নামজারি, খাজনা, খতিয়ান, চাকরির আবেদন)',
      search_btn: 'অনুসন্ধান',
      search_tag_all: 'সকল সেবা',
      search_tag_land: 'ভূমিসেবা',
      search_tag_jobs: 'চাকরির আবেদন',
      search_tag_converter: 'কনভার্টার',
      search_tag_print: 'প্রিন্ট ও ফটোস্ট্যাট',
      service_mutation_title: 'ই-নামজারি আবেদন ও ট্র্যাকিং',
      service_mutation_desc: 'অনলাইনে নামজারি আবেদন, খতিয়ান জমাভাগ ও ডিসিআর ফি পরিশোধের পূর্ণাঙ্গ সহায়তা।',
      service_ldtax_title: 'ভূমি উন্নয়ন কর (খাজনা পরিশোধ)',
      service_ldtax_desc: 'হোল্ডিং এন্ট্রি, বার্ষিক জমির খাজনা প্রদান ও তাৎক্ষণিক ডিজিটাল দাখিলা সংগ্রহ।',
      service_porcha_title: 'অনলাইন খতিয়ান ও মৌজা ম্যাপ (পর্চা)',
      service_porcha_desc: 'CS, SA, RS ও BS খতিয়ান অনুসন্ধান, সার্টিফাইড পর্চা ও ডিজিটাল ম্যাপ প্রাপ্তি।',
      service_jobs_title: 'চাকরির অনলাইন আবেদন ও এডমিট',
      service_jobs_desc: 'টেলিটক ও বিভিন্ন নিয়োগ পরীক্ষার নির্ভুল ফরম পূরণ, ছবি-স্বাক্ষর রিসাইজ ও এডমিট কার্ড।',
      service_converter_title: 'ইউনিকোড ⇄ বিজয় বাংলা কনভার্টার',
      service_converter_desc: 'ফন্ট রূপান্তর, মাইক্রোসফট ওয়ার্ড ইকুয়েশন, গণিত ফর্মুলা ও এআই ওসিআর ইঞ্জিন।',
      service_photostat_title: 'ছবি প্রিন্ট, ফটোকপি ও ল্যামিনেশন',
      service_photostat_desc: 'এইচডি কালার ছবি, হাই-স্পিড ডিজিটাল ফটোকপি, কম্পিউটার কম্পোজ ও প্লাস্টিক ল্যামিনেশন।',
      service_registration_title: 'জন্ম-মৃত্যু নিবন্ধন ও সংশোধন',
      service_registration_desc: 'নতুন জন্ম ও মৃত্যু সনদের অনলাইন আবেদন, তথ্য সংশোধন ও ভেরিফাইড প্রিন্ট কপি।',
      service_results_title: 'পরীক্ষার রেজাল্ট ও মার্কশিট প্রিন্ট',
      service_results_desc: 'SSC, HSC, সমমান ও জাতীয় বিশ্ববিদ্যালয়ের ফলাফল অনুসন্ধান ও মার্কশিট প্রিন্ট।',
      service_btn_details: 'সেবা গ্রহণ করুন →',
      service_sec_tag: 'সেবাসমূহ',
      service_sec_title: 'নাগরিক ও ডিজিটাল সেবাসমূহ',
      service_sec_subtitle: 'ভূমি মন্ত্রণালয় অনুমোদিত কেন্দ্র থেকে স্বচ্ছ ও নির্ভরযোগ্য সেবা সমাধান',
      nav_about: 'আমাদের সম্পর্কে',
      about_intro: 'কেন্দ্র পরিচিতি ও লক্ষ্য',
      about_facilities: 'নাগরিক সুবিধা ও সেবা',
      about_license: 'অনুমোদন ও সনদ',
      nav_login: 'লগইন',

      // Footer
      footer_desc: 'সরকার অনুমোদিত ডিজিটাল ও উন্মুক্ত ভূমিসেবা কেন্দ্র (LSFC)। অনুমোদন নং: দিনাজ/ফুল/এলএসএসএফসি-০৭/২০২৫।',
      footer_rights: '© ২০২৬ ফয়জার কম্পিউটার এন্ড ফটোস্ট্যাট। সর্বস্বত্ব সংরক্ষিত।',
      footer_approval: 'সরকারি নির্দেশিকা ও ফি তালিকাভুক্ত',
      footer_proprietor: 'মোঃ ফয়জার আলী',

      // --- Subpages Comprehensive Translations (bn) ---
      // results.html
      results_badge: 'ড্রিমল্যান্ড রেসিডেন্সিয়াল মডেল স্কুল',
      results_title: 'অনলাইন রেজাল্ট ও মার্কশীট অনুসন্ধান',
      results_subtitle: 'পরীক্ষার সাল, পরীক্ষার নাম, শ্রেণি এবং রোল নম্বর ইনপুট দিয়ে তাৎক্ষণিক বিষয়ভিত্তিক ফলাফল ও অফিশিয়াল মার্কশীট দেখুন।',
      results_lbl_inst: 'প্রতিষ্ঠান নির্বাচন (Select Institution)',
      results_opt_inst: '-- প্রতিষ্ঠান নির্বাচন করুন --',
      results_lbl_year: 'পরীক্ষার সাল',
      results_opt_year: '-- সাল নির্বাচন করুন --',
      results_lbl_exam: 'পরীক্ষার নাম',
      results_opt_exam: '-- পরীক্ষার নাম নির্বাচন করুন --',
      results_lbl_class: 'শ্রেণি ও শাখা',
      results_opt_class: '-- শ্রেণি ও শাখা নির্বাচন করুন --',
      results_lbl_roll: 'রোল নম্বর',
      results_roll_placeholder: 'যেমন: 1, 2, 10',
      results_tip: 'টিপস: শ্রেণি নির্বাচন করে সরাসরি রোল নম্বর লিখে খুঁজুন।',
      results_btn_reset: 'রিসেট',
      results_btn_search: 'ফলাফল দেখুন',
      results_tab_marksheet: 'একাডেমিক ট্রান্সক্রিপ্ট / মার্কশীট',
      results_tab_merit: 'পূর্ণাঙ্গ মেধাতালিকা',
      results_tab_stats: 'ফলাফল পরিসংখ্যান',
      results_btn_print: 'মার্কশীট প্রিন্ট করুন (A4)',
      results_btn_download: 'ডাউনলোড',
      results_tbl_sl: 'ক্রমিক',
      results_tbl_subject: 'বিষয়ের নাম',
      results_tbl_total: 'মোট নম্বর',
      results_tbl_obtained: 'প্রাপ্ত নম্বর',
      results_tbl_grade: 'লেটার গ্রেড',
      results_tbl_point: 'গ্রেড পয়েন্ট',

      // notices.html
      notices_page_badge: '📢 লাইভ বুলেটিন বোর্ড • দৈনিক আপডেট',
      notices_page_title: 'চলমান সরকারি চাকরি ও স্কুল-কলেজ সংক্রান্ত নোটিশ',
      notices_page_subtitle: 'ফুলবাড়ী সরকারি কলেজ সহ স্থানীয় শিক্ষার্থী ও চাকরিপ্রার্থীদের জন্য নিয়মিত হালনাগাদকৃত সার্কুলার, পরীক্ষার সময়সূচী এবং আবেদনের শেষ তারিখের আপডেট।',
      notices_search_placeholder: 'পদ, প্রতিষ্ঠান বা বিষয় দিয়ে খুঁজুন...',
      notices_tab_college: 'স্কুল-কলেজ সংক্রান্ত নোটিশ',
      notices_tab_jobs: 'চাকুরির সার্কুলার',
      notices_tab_all: 'সকল নোটিশ',
      notices_status_autocycle: 'ক্যাটাগরি স্বয়ংক্রিয়ভাবে পরিবর্তিত হচ্ছে (প্রতি ৫ সে.)',
      notices_status_pause: 'যেকোনো বাটনে ক্লিক বা সার্চ করলে পরিবর্তন থেমে থাকবে',
      notices_btn_apply_direct: 'অনলাইনে সরাসরি আবেদন / সার্কুলার',
      notices_btn_details: 'বিস্তারিত দেখুন',
      notices_btn_whatsapp: 'সরাসরি আবেদন পাঠান',
      notices_modal_title: 'বিজ্ঞপ্তির বিস্তারিত বিবরণ',
      notices_modal_deadline: 'আবেদনের শেষ তারিখ:',
      notices_modal_vacancies: 'পদসংখ্যা:',
      notices_modal_req: 'প্রয়োজনীয় যোগ্যতা:',
      notices_modal_btn_apply: 'অনলাইনে সরাসরি আবেদন / সার্কুলার লিংক',
      notices_modal_btn_wa: 'হোয়াটসঅ্যাপে ডকুমেন্টস পাঠিয়ে আবেদন করুন',

      // services.html
      services_page_badge: 'স্বীকৃত ভূমিসেবা ও ডিজিটাল সমাধান কেন্দ্র',
      services_page_title: 'আমাদের সকল ডিজিটাল, ভূমিসেবা ও স্টুডিও সেবাসমূহ',
      services_page_subtitle: 'ভূমি মন্ত্রণালয় অনুমোদিত উন্মুক্ত কেন্দ্র (LSFC) থেকে স্বচ্ছ সরকারি ফি ও দ্রুততম সময়ে নির্ভরযোগ্য নাগরিক সেবা সমাধান।',
      services_search_placeholder: '১৯টি সেবার যেকোনোটি নাম বা বিষয় দিয়ে খুঁজুন...',
      services_tab_all: 'সকল সেবা (১৯টি)',
      services_tab_land: 'ডিজিটাল ভূমিসেবা',
      services_tab_digital: 'নাগরিক অনলাইন সেবা',
      services_tab_student: 'শিক্ষার্থী ও চাকরি সেবা',
      services_tab_banking: 'ব্যাংকিং ও বিল পেমেন্ট',
      services_tab_studio: 'প্রিন্ট, স্টুডিও ও ডিজাইন',
      services_checklist_tag: 'স্বচ্ছ ফি ও চেকলিস্ট',
      services_checklist_title: 'সেবামূল্য ও প্রয়োজনীয় কাগজপত্র চেকলিস্ট',
      services_checklist_subtitle: 'দোকানে আসার আগেই যেকোনো সেবা নির্বাচন করে জেনে নিন সরকারি ফি, কম্পিউটার চার্জ এবং সাথে আনার প্রয়োজনীয় কাগজপত্র।',
      services_lbl_govt_fee: 'সরকারি ফি:',
      services_lbl_shop_fee: 'দোকানের চার্জ:',
      services_lbl_duration: 'আনুমানিক সময়:',
      services_lbl_required_docs: 'প্রয়োজনীয় কাগজপত্রসমূহ:',
      services_btn_view_modal: 'বিস্তারিত ও আবেদন প্রক্রিয়া',
      services_btn_call_now: 'পরামর্শ ও বুকিং কল করুন',

      // portal.html
      portal_page_badge: 'ফয়জার ডিজিটাল জব পোর্টাল v2.0 • ক্লাউড প্রোফাইল হাব',
      portal_page_title: 'চাকরি প্রার্থীদের স্মার্ট ক্লাউড প্রোফাইল ও অটো-ফিল পোর্টাল',
      portal_page_subtitle: 'আপনার আবেদন তথ্য, ঠিকানা, শিক্ষাগত যোগ্যতা ও ছবি-স্বাক্ষর একবার ক্লাউডে সংরক্ষণ করে যেকোনো সরকারি চাকুরির আবেদনে ১-ক্লিকে সেকেন্ডে নির্ভুল পূরণ করুন!',
      portal_calc_tag: 'স্মার্ট ফি ক্যালকুলেটর',
      portal_calc_title: 'ভূমি উন্নয়ন কর ও নামজারি ফি ক্যালকুলেটর',
      portal_mutation_step1: 'ধাপ ১: খতিয়ান ও দলিল যাচাই',
      portal_mutation_step2: 'ধাপ ২: অনলাইন আবেদন ও ফি পরিশোধ',
      portal_mutation_step3: 'ধাপ ৩: শুনানি ও খতিয়ান সংগ্রহ',

      // converter.html
      converter_page_badge: '১০০% অফলাইন • আল্ট্রা-ফাস্ট বাংলা ও সমীকরণ কনভার্টার',
      converter_page_title: 'ফয়জার কনভার্টার',
      converter_page_subtitle: 'ইউনিকোড ⇄ বিজয় বাংলা কনভার্টার ও ল্যাটেক্স ওওসিআর',
      converter_btn_uni_to_bijoy: 'ইউনিকোড ➔ বিজয়',
      converter_btn_bijoy_to_uni: 'বিজয় ➔ ইউনিকোড',
      converter_btn_copy: 'কপি করুন',
      converter_btn_clear: 'মুছে ফেলুন',
      converter_btn_docx: 'DOCX ডাউনলোড',
      converter_input_lbl: 'ইনপুট টেক্সট (বাংলা অথবা বিজয় টাইপ করুন):',
      converter_output_lbl: 'রূপান্তরিত ফলাফল:',
      converter_stats_words: 'শব্দ:',
      converter_stats_chars: 'অক্ষর:',

      // tools.html
      tools_page_badge: 'নাগরিক ও চাকরিপ্রার্থীদের জন্য ডিজিটাল টুলস',
      tools_page_title: 'সরকারি চাকরির অনলাইন আবেদন ও ফটো রিসাইজার টুলস',
      tools_page_subtitle: 'টেলিটক ও সরকারি চাকরির জন্য নির্দিষ্ট ৩০০×৩০০ ফটো, ৩০০×৮০ স্বাক্ষর রিসাইজিং এবং ফাইল প্রসেসিং টুলস।',
      tools_photo_title: 'টেলিটক ছবি রিসাইজার (৩০০×৩০০)',
      tools_photo_desc: 'ফাইলের সাইজ সর্বোচ্চ ১০০ কেবি এবং রেজোলিউশন ৩০০×৩০০ পিক্সেলে স্বয়ংক্রিয়ভাবে রূপান্তর।',
      tools_sig_title: 'স্বাক্ষর রিসাইজার (৩০০×৮০)',
      tools_sig_desc: 'ফাইলের সাইজ সর্বোচ্চ ৬০ কেবি এবং রেজোলিউশন ৩০০×৮০ পিক্সেলে নিখুঁত কনভার্ট।',
      tools_btn_upload: 'ছবি নির্বাচন করুন',
      tools_btn_download: 'রিসাইজড ছবি ডাউনলোড করুন',
      tools_age_title: 'সরকারি চাকরির বয়স ক্যালকুলেটর',
      tools_age_desc: 'নির্ধারিত তারিখে প্রার্থীর বয়স কত বছর, মাস ও দিন তা নিমেষেই হিসাব করুন।',
      tools_btn_calc_age: 'বয়স বের করুন',

      // contact.html
      contact_page_badge: 'সরাসরি সেবা ও অবস্থান',
      contact_page_title: 'যোগাযোগ ও সার্ভিস সেন্টার পরিদর্শন',
      contact_page_subtitle: 'যেকোনো ডিজিটাল সেবা, ভূমিসেবা পরামর্শ বা জরুরি প্রিন্টিং সহায়তায় আমাদের দোকানে সরাসরি আসুন বা ফোনে যোগাযোগ করুন।',
      contact_card_address_title: 'আমাদের ঠিকানা',
      contact_address_text: 'ফুলবাড়ী সরকারি কলেজ গেটের পশ্চিম পার্শ্বে, ফুলবাড়ী, দিনাজপুর-৫২৬০',
      contact_card_hours_title: 'সেবা প্রদানের সময়সূচী',
      contact_hours_weekdays: 'শনিবার - বৃহস্পতিবার: সকাল ১০:০০ - রাত ৯:০০',
      contact_hours_friday: 'শুক্রবার: বিকাল ৪:০০ - রাত ৯:০০',
      contact_card_phone_title: 'হটলাইন ও হোয়াটসঅ্যাপ',
      contact_form_title: 'সরাসরি বার্তা পাঠান',
      contact_form_name: 'আপনার নাম',
      contact_form_phone: 'মোবাইল নম্বর',
      contact_form_subject: 'সেবার বিষয়',
      contact_form_message: 'বিস্তারিত বার্তা',
      contact_btn_send: 'মেসেজ পাঠান'
    },

    en: {
      // Top Bar
      top_phone: '+880 1717-101919',
      top_location: 'Phulbari Govt. College Gate, Dinajpur',
      top_hours: 'Sat - Thu: 10:00 AM - 9:00 PM | Fri: 4:00 PM - 9:00 PM',
      top_hotline: 'Land Hotline: 16122 | Emergency: 999',
      topbar_tagline: 'Smart Land & Citizen Digital Assistance Centre',
      topbar_status: 'Open Now (until 9:00 PM)',
      theme_day: 'Day Mode',
      theme_night: 'Night Mode',
      lang_label: 'English',

      // Brand
      brand_name: 'Fayzar Computer',
      brand_sub: 'Digital & Land Services Centre',
      brand_domain: 'fayzarcomputer.com.bd',

      // 8-Item Sequential Navigation Menu
      nav_home: 'Home',
      nav_land: 'Land Services',
      nav_services: 'Other Services',
      nav_notices: 'Job Circulars',
      nav_tools: 'Converter & Tools',
      nav_results: 'Results',
      nav_links: 'Useful Links',
      nav_contact: 'Contact',
      nav_cta: 'Get Services',
      nav_services_short: 'Services',
      nav_jobs_short: 'Jobs',
      nav_converter_short: 'Converter',
      nav_tools_short: 'Tools',
      nav_results_short: 'Results',
      nav_contact_short: 'Contact',

      // Hero Section
      hero_badge: 'Govt. Authorized Land Services Facilitating Centre (LSFC: 07/2025)',
      hero_title: 'Fayzar Computer & Photostat',
      hero_domain: 'fayzarcomputer.com.bd',
      hero_subtitle: 'Your Trusted Digital, Online & Land Services Centre',
      hero_description: 'Official E-Mutation, Land Tax & Porcha services alongside Govt Job Applications, University Admissions, Teletalk Image Resizing & Digital Printing.',
      hero_btn_services: 'Our Services',
      hero_btn_converter: 'Converter & Tools',

      // 4-Column Core Solutions Grid
      grid_tag: 'Core Services Gateway',
      grid_title: 'Specialized Digital Services for You',
      grid_subtitle: 'Fast, compliant, and dependable computer & land citizen assistance',

      card1_badge: 'Land Services',
      card1_title: 'Digital Land Services',
      card1_desc: 'Khatian search, porcha records, e-mutation and land tax payment',
      card1_link: 'Learn More →',

      card2_badge: 'Online',
      card2_title: 'Online Citizen Applications',
      card2_desc: 'Govt jobs, admission, NID, passport, driving license & e-tax filing',
      card2_link: 'Learn More →',

      card3_badge: 'Typing & Compose',
      card3_title: 'Document Typing & Composing',
      card3_desc: 'Fast Bengali & English typing, legal petitions & document formatting',
      card3_link: 'Learn More →',
      card3_btn_quick: '⚡ Open Unicode ⇄ Bijoy Converter',

      card4_badge: 'Print & Studio',
      card4_title: 'Printing & Digital Photostat',
      card4_desc: 'High-speed digital photocopy, color print, lamination & passport photos',
      card4_link: 'Learn More →',

      // Land Services Spotlight
      land_tag: 'Specialized Facilitation',
      land_title: 'Smart Land Services & Citizen Assistance',
      land_subtitle: 'Accurate, transparent, and hassle-free support from certified land experts',
      land_mutation_title: 'E-Mutation & Khatian',
      land_mutation_desc: 'New khatian creation and status tracking for purchased or inherited land.',
      land_tax_title: 'Online Land Tax (LD-Tax)',
      land_tax_desc: 'Holding registration, annual land tax payment, and instant digital receipt.',
      land_khatian_title: 'Porcha & Mouza Maps',
      land_khatian_desc: 'CS, SA, RS record verification and certified copy postal delivery.',
      land_btn_apply: 'Apply Online →',
      land_btn_pay: 'Pay Tax →',
      land_btn_search: 'Search Porcha →',
      land_view_all: 'View All Land Services →',

      // Live Circulars Section
      notices_tag: 'Recent Circulars',
      notices_title: 'Latest Job & Admission Notices',
      notices_subtitle: 'Latest government recruitment deadlines and university admission updates',
      notices_view_all: 'View All Notices',
      notice_apply_online: 'Apply Online →',
      notice_apply_shop: 'Apply from Shop',
      notice_vacancies_lbl: 'Vacancies:',
      notice_deadline_lbl: 'Deadline:',

      // Useful Web Links
      links_tag: 'Government & Educational Portals',
      links_title: 'Essential Government & Citizen Portals',
      links_subtitle: 'One-click direct access to major Bangladesh government and public service portals',
      links_cat_land: 'Land Portals',
      links_cat_job: 'Job & Recruitment Portals',
      links_cat_citizen: 'Citizen Service Portals',
      links_cat_edu: 'Education & Result Portals',
      link_mutation: 'E-Mutation Portal',
      link_ldtax: 'Land Tax (LD-Tax)',
      link_eporcha: 'Online Khatian (e-Porcha)',
      link_dlrs: 'Mouza Map Portal (DLRS)',
      link_land_help: 'National Land Helpline: 16122',
      link_alljobs: 'Teletalk AllJobs',
      link_bpsc: 'Public Service Commission (BPSC)',
      link_dpe: 'Directorate of Primary Education',
      link_bb: 'Bangladesh Bank E-Recruitment',
      link_job_help: 'Online Application Assistance',
      link_nid: 'NID Citizen Services',
      link_epassport: 'E-Passport Portal',
      link_pcc: 'Police Clearance (PCC)',
      link_etax: 'Online Tax e-Return (NBR)',
      link_citizen_help: 'Govt Fee & Chalan Solution',
      link_nu: 'National University Admission',
      link_eduboard: 'Education Board Results',
      link_phulbari_col: 'Phulbari Govt. College Notice',
      link_bteb: 'Technical Education Board (BTEB)',
      link_edu_help: 'Admission & Result Marksheet Print',

      // Customer Reviews & Testimonials
      reviews_tag: 'Customer Reviews',
      reviews_title: 'What Our Valued Clients Say',
      reviews_subtitle: 'Trusted by citizens of Phulbari for accurate and prompt digital services',
      review1_name: 'Mahmudul Hasan',
      review1_role: 'University Student',
      review1_service: 'Online Admissions & Forms',
      review1_text: 'Excellent and cordial service. They resized my photo and signature flawlessly and submitted the job application on time.',
      review2_name: 'Md. Anwarul Islam',
      review2_role: 'Business Owner & Landholder',
      review2_service: 'Digital Land Services',
      review2_text: 'Processed my land E-Mutation application and tracking in record time. A truly dependable service centre in Phulbari.',
      review3_name: 'Rabeya Khatun',
      review3_role: 'Primary Teacher Candidate',
      review3_service: 'Teletalk Application & Admit',
      review3_text: 'Got my primary teacher recruitment application and admit card printed without any errors. Highly recommended!',

      // Contact & Footer
      contact_tag: 'Our Location',
      contact_title: 'Visit Our Service Centre',
      contact_subtitle: 'West side of Phulbari Govt. College Gate, Phulbari, Dinajpur',
      contact_phone_lbl: 'Phone Number:',
      contact_whatsapp_lbl: 'WhatsApp Chat:',
      contact_hours_lbl: 'Opening Hours:',
      footer_desc: 'Government Authorized Land Services Facilitating Centre (LSFC) and Premier Digital Service Provider in Phulbari, Dinajpur.',
      footer_col_services: 'Featured Services',
      footer_col_links: 'Quick Links',
      footer_col_helpline: 'Emergency Hotlines',
      footer_quick_nav: 'Quick Navigation',
      footer_tools_title: 'Tools & Portals',
      footer_tool_converter: 'Unicode ⇄ Bijoy Converter',
      footer_tool_equation: 'Word EQ & LaTeX Converter',
      footer_tool_ocr: 'AI OCR Question Paper Converter',
      footer_tool_resizer: 'Teletalk Photo & Signature Resizer',
      footer_admin: 'Admin Panel',
      footer_proprietor: 'Proprietor: Md. Fayzar Ali',
      footer_approval: 'Govt Approval No: Dinaj/Phul/LSFC-07/2025',
      footer_rights: '© 2026 All Rights Reserved. Fayzar Computer & Photostat.',
      footer_address_line: 'Phulbari Govt. College Gate, Phulbari, Dinajpur | Phone: 01717-101919',
      btn_whatsapp: 'Message on WhatsApp',
      btn_call_now: 'Call Directly',
      btn_apply_online: 'Online Application Link →',
      btn_apply_shop: 'Apply at Shop',
      notice_vacancies: 'Vacancies:',
      notice_deadline: 'Deadline:',

      // Land.gov.bd Inspired Redesign Keys
      topbar_helpline: 'Land Helpline: 16122 | Emergency: 999',
      topbar_shop_phone: 'Shop Hotline: 01717-101919',
      topbar_timing: 'Daily: 9:00 AM - 10:00 PM',
      nav_applications: 'Online Applications',
      nav_converter: 'Bangla Converter',
      nav_print_studio: 'Print & Studio',
      search_placeholder: 'Search any service... (e.g. Mutation, Land Tax, Khatian, Job Apply)',
      search_btn: 'Search',
      search_tag_all: 'All Services',
      search_tag_land: 'Land Services',
      search_tag_jobs: 'Job Applications',
      search_tag_converter: 'Converter',
      search_tag_print: 'Print & Photostat',
      service_mutation_title: 'E-Mutation & Tracking',
      service_mutation_desc: 'Online mutation application, khatian partition & DCR fee payment support.',
      service_ldtax_title: 'Land Development Tax (LD-Tax)',
      service_ldtax_desc: 'Citizen holding entry, annual land tax payment & instant digital receipt.',
      service_porcha_title: 'Online Khatian & Mouza Map',
      service_porcha_desc: 'CS, SA, RS & BS record search, certified porcha copy & digital maps.',
      service_jobs_title: 'Online Job Application & Admit',
      service_jobs_desc: 'Error-free Teletalk form filling, photo-signature resizing & admit card download.',
      service_converter_title: 'Unicode ⇄ Bijoy Converter',
      service_converter_desc: 'Font conversion, Word Equation & LaTeX math, and AI question OCR engine.',
      service_photostat_title: 'Photo Print & Digital Photostat',
      service_photostat_desc: 'HD color photo printing, high-speed photostat, compose & plastic lamination.',
      service_registration_title: 'Birth & Death Registration',
      service_registration_desc: 'Online certificate application, correction & verified printout service.',
      service_results_title: 'Exam Results & Marksheets',
      service_results_desc: 'SSC, HSC, Madrasah & National University results lookup with full marksheet.',
      service_btn_details: 'Access Service →',
      service_sec_tag: 'Services',
      service_sec_title: 'Citizen & Digital Services',
      service_sec_subtitle: 'Transparent and dependable digital services from govt approved center',
      nav_about: 'About Us',
      about_intro: 'Overview & Goals',
      about_facilities: 'Citizen Services',
      about_license: 'Licensing & Approval',
      nav_login: 'Login',

      // Footer
      footer_desc: 'Govt. Authorized Digital & Land Services Centre (LSFC). Approval No: Dinaj/Phul/LSFC-07/2025.',
      footer_rights: '© 2026 Fayzar Computer & Photostat. All rights reserved.',
      footer_approval: 'Govt Guidelines & Regulated Fees',
      footer_proprietor: 'Md. Fayzar Ali',

      // --- Subpages Comprehensive Translations (en) ---
      // results.html
      results_badge: 'Dreamland Residential Model School',
      results_title: 'Online Result & Marksheet Search Portal',
      results_subtitle: 'Instant subject-wise results and official marksheet lookup with exam year, exam name, class and roll number.',
      results_lbl_inst: 'Select Institution',
      results_opt_inst: '-- Select Institution --',
      results_lbl_year: 'Exam Year',
      results_opt_year: '-- Select Year --',
      results_lbl_exam: 'Exam Name',
      results_opt_exam: '-- Select Exam --',
      results_lbl_class: 'Class & Section',
      results_opt_class: '-- Select Class & Section --',
      results_lbl_roll: 'Roll Number',
      results_roll_placeholder: 'e.g. 1, 2, 10',
      results_tip: 'Tip: Select class and enter roll number directly to search.',
      results_btn_reset: 'Reset',
      results_btn_search: 'View Result',
      results_tab_marksheet: 'Academic Transcript / Marksheet',
      results_tab_merit: 'Full Merit List',
      results_tab_stats: 'Result Statistics',
      results_btn_print: 'Print Marksheet (A4)',
      results_btn_download: 'Download',
      results_tbl_sl: 'SL',
      results_tbl_subject: 'Subject Name',
      results_tbl_total: 'Total Marks',
      results_tbl_obtained: 'Obtained',
      results_tbl_grade: 'Letter Grade',
      results_tbl_point: 'Grade Point',

      // notices.html
      notices_page_badge: '📢 Live Bulletin Board • Daily Updates',
      notices_page_title: 'Ongoing Government Jobs & Academic Notices',
      notices_page_subtitle: 'Regularly updated circulars, exam routines and application deadlines for students of Phulbari Govt College and job seekers.',
      notices_search_placeholder: 'Search by post, institution or topic...',
      notices_tab_college: 'Academic & College Notices',
      notices_tab_jobs: 'Job Circulars',
      notices_tab_all: 'All Notices',
      notices_status_autocycle: 'Categories auto-cycling (every 5s)',
      notices_status_pause: 'Auto-cycle pauses on click or search',
      notices_btn_apply_direct: 'Direct Online Application / Circular',
      notices_btn_details: 'View Details',
      notices_btn_whatsapp: 'Apply via WhatsApp',
      notices_modal_title: 'Notice Details',
      notices_modal_deadline: 'Application Deadline:',
      notices_modal_vacancies: 'Vacancies:',
      notices_modal_req: 'Required Qualifications:',
      notices_modal_btn_apply: 'Direct Online Application / Circular Link',
      notices_modal_btn_wa: 'Send Documents & Apply via WhatsApp',

      // services.html
      services_page_badge: 'Certified Land & Digital Solutions Centre',
      services_page_title: 'All Digital, Land & Studio Services',
      services_page_subtitle: 'Transparent government fees and fastest dependable citizen service solutions from LSFC certified center.',
      services_search_placeholder: 'Search any of 19 services by name or keyword...',
      services_tab_all: 'All Services (19)',
      services_tab_land: 'Digital Land Services',
      services_tab_digital: 'Citizen Online Services',
      services_tab_student: 'Student & Job Services',
      services_tab_banking: 'Banking & Bill Payment',
      services_tab_studio: 'Print, Studio & Design',
      services_checklist_tag: 'Transparent Fees & Checklist',
      services_checklist_title: 'Service Pricing & Document Checklist',
      services_checklist_subtitle: 'Before visiting our shop, select any service to verify official government fee, computer charges and required documents.',
      services_lbl_govt_fee: 'Government Fee:',
      services_lbl_shop_fee: 'Shop Charge:',
      services_lbl_duration: 'Estimated Time:',
      services_lbl_required_docs: 'Required Documents:',
      services_btn_view_modal: 'Details & Application Process',
      services_btn_call_now: 'Call for Consultation',

      // portal.html
      portal_page_badge: 'Fayzar Digital Job Portal v2.0 • Cloud Profile Hub',
      portal_page_title: 'Smart Cloud Profile & Job Auto-Fill Portal',
      portal_page_subtitle: 'Save your profile, address, education, and photo-signature once in cloud to auto-fill government and Teletalk job applications in 1 click!',
      portal_calc_tag: 'Smart Fee Calculator',
      portal_calc_title: 'Land Tax & Mutation Fee Calculator',
      portal_mutation_step1: 'Step 1: Khatian & Deed Verification',
      portal_mutation_step2: 'Step 2: Online Filing & Fee Payment',
      portal_mutation_step3: 'Step 3: Hearing & Khatian Collection',

      // converter.html
      converter_page_badge: '100% Offline • Ultra-Fast Bangla & Equation Converter',
      converter_page_title: 'Fayzar Converter',
      converter_page_subtitle: 'Unicode ⇄ Bijoy Bangla Converter & LaTeX OCR',
      converter_btn_uni_to_bijoy: 'Unicode ➔ Bijoy',
      converter_btn_bijoy_to_uni: 'Bijoy ➔ Unicode',
      converter_btn_copy: 'Copy Text',
      converter_btn_clear: 'Clear All',
      converter_btn_docx: 'Export DOCX',
      converter_input_lbl: 'Input Text (Type Bangla or Bijoy):',
      converter_output_lbl: 'Converted Output:',
      converter_stats_words: 'Words:',
      converter_stats_chars: 'Characters:',

      // tools.html
      tools_page_badge: 'Digital Tools for Citizens & Applicants',
      tools_page_title: 'Online Job Application & Photo Resizer Tools',
      tools_page_subtitle: 'Standard 300x300 photo resizer, 300x80 signature resizer and document processing tools for job applications.',
      tools_photo_title: 'Teletalk Photo Resizer (300x300)',
      tools_photo_desc: 'Automatically resize image to exact 300x300 pixels with maximum file size under 100 KB.',
      tools_sig_title: 'Signature Resizer (300x80)',
      tools_sig_desc: 'Precisely resize signature to 300x80 pixels with maximum file size under 60 KB.',
      tools_btn_upload: 'Choose Image',
      tools_btn_download: 'Download Resized Image',
      tools_age_title: 'Govt Job Age Calculator',
      tools_age_desc: 'Instantly calculate candidate exact age in years, months and days as of application date.',
      tools_btn_calc_age: 'Calculate Age',

      // contact.html
      contact_page_badge: 'Direct Services & Location',
      contact_page_title: 'Contact & Visit Service Centre',
      contact_page_subtitle: 'Visit our center directly or contact via phone for digital assistance, land advice or express printing services.',
      contact_card_address_title: 'Our Address',
      contact_address_text: 'West Side of Phulbari Govt. College Gate, Phulbari, Dinajpur-5260',
      contact_card_hours_title: 'Opening Hours',
      contact_hours_weekdays: 'Saturday - Thursday: 10:00 AM - 9:00 PM',
      contact_hours_friday: 'Friday: 4:00 PM - 9:00 PM',
      contact_card_phone_title: 'Hotline & WhatsApp',
      contact_form_title: 'Send Direct Message',
      contact_form_name: 'Your Name',
      contact_form_phone: 'Mobile Number',
      contact_form_subject: 'Service Subject',
      contact_form_message: 'Detailed Message',
      contact_btn_send: 'Send Message'
    }
  };

  // =========================================================================
  
  // =========================================================================
  // 1.5. Comprehensive Inner DOM Content Dictionary (870+ sentences & phrases)
  // =========================================================================
  const bilingualContentDict = {
  "ই-নামজারি ও রেকর্ড খারিজ": "E-Mutation & Record Correction",
  "ই-নামজারি ও রেকর্ড খারিজ (E-Mutation)": "E-Mutation & Record Correction (E-Mutation)",
  "অনলাইনে জমির খাজনা পরিশোধ (LD Tax)": "Online Land Development Tax Payment (LD Tax)",
  "অনলাইনে জমির খাজনা পরিশোধ": "Online Land Development Tax Payment",
  "খতিয়ান/পর্চা যাচাই ও সার্টিফাইড কপি": "Khatian/Porcha Verification & Certified Copy",
  "মৌজা ম্যাপ (নকশা) ও ডিজিটাল সিট আবেদন": "Mouza Map (Cadastral Map) & Digital Sheet Application",
  "দলিল কম্পোজ ও রেজিস্ট্রি সংক্রান্ত পরামর্শ": "Deed Drafting & Land Registry Consultation",
  "আয়কর ই-রিটার্ন ও ট্যাক্স সার্টিফিকেট": "Income Tax E-Return & Tax Certificate",
  "পাসপোর্ট আবেদন ও পুলিশ ক্লিয়ারেন্স": "Passport Application & Police Clearance Certificate",
  "ড্রাইভিং লাইসেন্স ও বিআরটিএ সেবা": "Driving License & BRTA Online Services",
  "সরকারি ও বেসরকারি চাকরির আবেদন": "Government & Private Job Applications",
  "বিশ্ববিদ্যালয় ভর্তি ও পরীক্ষার আবেদন": "University Admission & Examination Applications",
  "জাতীয় পরিচয়পত্র (NID) সংশোধন ও রি-ইস্যু": "National ID (NID) Correction & Re-issue",
  "জন্ম ও মৃত্যু নিবন্ধন সংশোধন ও প্রিন্ট": "Birth & Death Registration Correction & Printing",
  "ট্রেড লাইসেন্স ও টিন (TIN) সার্টিফিকেট": "Trade License & e-TIN Certificate",
  "বাংলা ও ইংরেজি নির্ভুল কম্পিউটার কম্পোজ": "Accurate Bengali & English Computer Typing/Composing",
  "হাই-স্পিড ডিজিটাল ফটোকপি ও প্রিন্ট": "High-Speed Digital Photocopy & Laser Printing",
  "স্টুডিও কোয়ালিটি ল্যাব পাসপোর্ট ছবি": "Studio Quality Lab Passport Photos",
  "উচ্চমানের ল্যামিনেশন ও হার্ড স্পাইরাল বাইন্ডিং": "Premium Lamination & Hard Spiral Binding",
  "জরুরি প্লাস্টিক পিভিসি (PVC) কার্ড প্রিন্ট": "Instant Plastic PVC Smart Card Printing",
  "অনলাইন রেজাল্ট ও মার্কশীট অনুসন্ধান": "Online Results & Marksheet Search",
  "ফলাফল ও মার্কশীট অনুসন্ধান করুন": "Search Results & Academic Marksheet",
  "প্রতিষ্ঠান নির্বাচন (Select Institution)": "Select Institution",
  "-- প্রতিষ্ঠান নির্বাচন করুন --": "-- Select Institution --",
  "-- সাল নির্বাচন করুন --": "-- Select Year --",
  "-- পরীক্ষার নাম নির্বাচন করুন --": "-- Select Exam Name --",
  "-- শ্রেণি নির্বাচন করুন --": "-- Select Class --",
  "পরীক্ষার সাল": "Exam Year",
  "পরীক্ষার নাম": "Exam Name",
  "শ্রেণি (Class)": "Class",
  "রোল নম্বর": "Roll Number",
  "রেজিস্ট্রেশন নম্বর (ঐচ্ছিক)": "Registration Number (Optional)",
  "ফলাফল দেখুন": "View Result",
  "পুনরায় খুঁজুন": "Search Again",
  "মার্কশীট প্রিন্ট": "Print Marksheet",
  "মার্কশীট ডাউনলোড (PDF)": "Download Marksheet (PDF)",
  "ফয়জার কম্পিউটার": "Fayzar Computer",
  "ফয়জার কম্পিউটার এন্ড ফটোস্ট্যাট": "Fayzar Computer & Photostat",
  "সরকার অনুমোদিত ডিজিটাল ও ভূমিসেবা কেন্দ্র": "Govt. Approved Digital & Land Service Center",
  "দোকানের সঠিক অবস্থান:": "Exact Shop Location:",
  "ফুলবাড়ী সরকারি কলেজ গেটের পশ্চিম পার্শ্বে, ফুলবাড়ী, দিনাজপুর।": "West side of Phulbari Govt. College Gate, Phulbari, Dinajpur.",
  "ফুলবাড়ী সরকারি কলেজ গেটের পশ্চিম পার্শ্বে, ফুলবাড়ী, দিনাজপুর - ৫২৬০": "West side of Phulbari Govt. College Gate, Phulbari, Dinajpur - 5260",
  "মোবাইল হেল্পলাইন:": "Mobile Helpline:",
  "হোয়াটসঅ্যাপ:": "WhatsApp:",
  "ইমেইল:": "Email:",
  "সরাসরি মেসেজ": "Direct Message",
  "প্রোপ্রাইটর: মোঃ ফয়জার আলী": "Proprietor: Md. Fayzar Ali",
  "ছবি ও স্বাক্ষর রিসাইজার": "Photo & Signature Resizer",
  "টেলিটক ৩০০x৩০০ ও ৩০০x৮০": "Teletalk 300x300 & 300x80",
  "চাকরির বয়স ক্যালকুলেটর": "Job Age Calculator",
  "১৮-৩২ বছর যোগ্যতা যাচাই": "18-32 Years Eligibility Check",
  "জমি ও দলিল ফি হিসাব": "Land & Deed Fee Calculator",
  "শতক, কাঠা ও রেজিস্ট্রি ফি": "Shotok, Katha & Registration Fee",
  "ইউনিকোড ⇄ বিজয় কনভার্টার": "Unicode ⇄ Bijoy Converter",
  "ফাইল ড্রপ ও AI OCR": "File Drop & AI OCR",
  "দ্রুত নেভিগেশন": "Quick Navigation",
  "হোমপেজ": "Homepage",
  "সেবাসমূহ ও মূল্য তালিকা": "Services & Pricing Table",
  "জব ও চাকরির পোর্টাল": "Job Application Portal",
  "বিজয়-ইউনিকোড কনভার্টার": "Bijoy-Unicode Converter",
  "রেজাল্ট ও মার্কশীট": "Results & Marksheet",
  "টুলস ও ফটো রিসাইজ": "Tools & Photo Resizer",
  "যোগাযোগ ও লোকেশন": "Contact & Location",
  "প্রয়োজনীয় কাগজপত্র:": "Required Documents:",
  "সরকারি ফি:": "Government Fee:",
  "কাজের স্বচ্ছ মূল্য তালিকা (ছক)": "Transparent Service Pricing Table",
  "চেকলিস্ট ক্যালকুলেটর": "Checklist Calculator",
  "ক্যাটাগরি অনুযায়ী সেবা": "Services by Category",
  "সকল সেবা (১৯)": "All Services (19)",
  "ভূমিসেবা": "Land Services",
  "নাগরিক ও অনলাইন": "Citizen & Online",
  "টাইপিং ও কম্পোজ": "Typing & Composing",
  "প্রিন্ট ও স্টুডিও": "Printing & Studio",
  "বাং": "BN",
  "EN": "EN",
  "ডে মোড": "Day Mode",
  "নাইট মোড": "Night Mode",
  "চলমান সরকারি চাকরি ও স্কুল-কলেজ সংক্রান্ত নোটিশ, ই-নামজারি ও খাজনা পরিশোধের বিশ্বস্ত কেন্দ্র — হেল্পলাইন: 01717-101919 | ভূমিসেবা কলসেন্টার: ১৬১২২ (16122) | ফুলবাড়ী সরকারি কলেজ গেটের পশ্চিম পার্শ্বে, দিনাজপুর | সময়: সকাল ১০:০০ - রাত ৯:০০": "Current Government Jobs & School-College Notifications, E-Registration & Fee Payment Trusted Center — Helpline: 01717-101919 | Bhumiseva Call Center: 16122 (16122) | Fulbari Govt College Gate West Side, Dinajpur Timings: 10:00 AM - 9:00 PM",
  "নির্বাচিত শ্রেণি/পরীক্ষার ফলাফল শিক্ষকমণ্ডলী কর্তৃক এন্ট্রি করা হয়েছে। ফয়জার কম্পিউটার (ওয়েব অ্যাডমিন) কর্তৃক চূড়ান্ত অনুমোদন শেষে এটি সর্বসাধারণের জন্য আনুষ্ঠানিকভাবে প্রকাশ (Publish) করা হবে।": "Selected class/examination results are entered by faculty. It will be officially published for public after final approval by Foyer Computer (Web Admin).",
  "হ্যাঁ, শতভাগ নিরাপদ! সাধারণ টেক্সট, ওয়ার্ড, এক্সেল ও পাওয়ারপয়েন্ট ফাইল সম্পূর্ণ আপনার ব্রাউজারের ভেতর অফলাইনে প্রসেস হয়। কোনো ডেটা আমাদের সার্ভারে জমা রাখা হয় না।": "Yes, 100% safe! Plain text, Word, Excel and PowerPoint files are processed offline entirely within your browser. No data is stored on our servers.",
  "আমাদের শেয়ার্ড ফ্রি কোটা শেষ হয়ে গেছে। আপনার নিজস্ব গুগল অ্যাকাউন্ট থেকে মাত্র ১ মিনিটে সম্পূর্ণ ফ্রি Gemini API Key এনে নিচে দিন এবং আনলিমিটেড ব্যবহার করুন।": "Our shared free quota has been exhausted. Get free Gemini API Key in just 1 minute from your own Google account and give it unlimited usage.",
  "বাটনে ক্লিক করুন। আমাদের সিস্টেম Google Gemini 2.5 দিয়ে সকল বাংলা লেখা ও সমীকরণ নিখুঁতভাবে পড়ে সরাসরি SutonnyMJ ফন্টে সাজানো .doc ফাইল তৈরি করে দেবে।": "Click the button. Our system will read all Bengali texts and equations perfectly with Google Gemini 2.5 and directly generate .doc files arranged in SutonnyMJ font.",
  "টেলিটক ও সরকারি চাকরির আবেদনে প্রার্থী, পিতা, মাতার নাম (বাংলা ও ইংরেজি আলাদা), ঠিকানা ও ছবি-স্বাক্ষর সহ সবকিছু ১-ক্লিকে স্বয়ংক্রিয় পূরণ করুন।": "1-click auto-fill everything including candidate, father, mother name (Bangla and English separately), address and photo-signature in teletalk and government job applications.",
  "আপনার মোবাইল নম্বর দিয়ে একাউন্ট খুলে প্রার্থীর নাম, পিতার নাম, মাতার নাম (বাংলা/ইংরেজি), ঠিকানা ও ছবি-স্বাক্ষর যুক্ত করে ফাইল সংরক্ষণ করুন।": "Open the account with your mobile number and save the file by adding the candidate's name, father's name, mother's name (Bangla/English), address and photo-signature.",
  "কম্পোজ, প্রিন্ট, ফটোকপি, পাসপোর্ট ছবি ও অনলাইন আবেদনের সঠিক এবং স্বচ্ছ নির্ধারিত মূল্য দেখে নিন। কোনো গোপন বা অতিরিক্ত চার্জ নেই।": "Check accurate and transparent pricing for comp, print, photocopy, passport photo and online application. There are no hidden or extra charges.",
  "প্রতিটি সার্কুলারের পদসংখ্যা, প্রয়োজনীয় যোগ্যতা, আবেদনের ডেডলাইন এবং সরাসরি অনলাইন আবেদনের লিংক নিচে বিস্তারিত দেওয়া হলো।": "Details of each circular post number, required qualification, application deadline and direct online application link are given below.",
  "ইউনিকোড ⇄ বিজয়, গণিত প্রশ্নপত্র, সমীকরণ, PDF/ছবি (AI OCR) ও Word 2003 (.doc) এক্সপোর্ট করতে আমাদের আলাদা কনভার্টারে যান।": "Visit our separate converters to export Unicode ⇄ VIJAY, maths question papers, equations, PDF/Image (AI OCR) and Word 2003 (.doc).",
  "কনভার্ট বাটনে চাপ দিলে আমাদের স্মার্ট ইঞ্জিন কয়েক সেকেন্ডের মধ্যে যুক্তবর্ণ ও সমীকরণ সহ সম্পূর্ণ ফাইল প্রস্তুত করে।": "Our smart engine prepares the complete file with additions and equations in seconds after pressing the convert button.",
  "বানান ভুল, উদ্দীপক পরিবর্তন বা কোনো প্রশ্ন মিসিং আছে কিনা মূল ছবির সাথে পুঙ্খানুপুঙ্খ মিলিয়ে সংশোধন করুন": "Correct any spelling mistakes, stimulus changes or missing questions by matching them thoroughly with the original image.",
  "বিজয় কি-বোর্ডের ক্যারেক্টার ম্যাপিং ইউনিকোড থেকে ভিন্ন। তাই ওয়ার্ড ফাইলে পেস্ট করার পর পুরো লেখার ফন্ট": "Vijay Keyboard's character mapping is different from Unicode. So after pasting the whole text font in word file",
  "এক্সটেনশনে আপনার মোবাইল নম্বর দিয়ে লগইন করলেই আপনার সকল ফাইল নিমেষেই ব্রাউজারে সিঙ্ক হয়ে যাবে।": "Just login to the extension with your mobile number and all your files will be instantly synced to the browser.",
  "বাটন চেপে ফাইল ডাউনলোড করেন, তাহলে ফাইলটিতে স্বয়ংক্রিয়ভাবেই SutonnyMJ ফন্ট এমবেড থাকবে।": "Click the button to download the file, then the file will automatically have SutonnyMJ font embedded.",
  "আমাদের সেবা ও কাজের মান সম্পর্কে আপনার যেকোনো পরামর্শ, মন্তব্য বা অভিজ্ঞতা সরাসরি জানান": "Any suggestions, comments or experiences you may have about our service and quality of work are direct",
  "অনলাইন আবেদন ও সরকারি চালানের ক্ষেত্রে সরকার কর্তৃক নির্ধারিত ব্যাংক ও ভ্যাট প্রযোজ্য।": "Bank and VAT as prescribed by the government is applicable for online application and government challan.",
  "জমি ক্রয়, হেবা, দান বা ওয়ারিশসূত্রে প্রাপ্ত জমির মালিকানা পরিবর্তন ও নতুন খতিয়ান তৈরি।": "Change of ownership of land acquired through purchase, donation, gift or inheritance and preparation of new deeds.",
  "কনভার্সন শেষে মূল ছবির সাথে বানান, উদ্দীপক ও মিসিং প্রশ্ন স্বয়ংক্রিয়ভাবে মিলিয়ে নেবে": "At the end of the conversion, the spelling, prompts and missing questions will be automatically matched with the original image",
  "সমীকরণ ও জটিল যুক্তবর্ণ নির্ভুল করতে কয়েক সেকেন্ড সময় লাগে, অনুগ্রহ করে অপেক্ষা করুন": "It takes a few seconds to validate equations and complex characters, please wait",
  "Gemini 3.6 Flash (২ নম্বর অফিসিয়াল ফ্ল্যাগশিপ — গতি ও নির্ভুলতার সেরা ব্যালেন্স)": "Gemini 3.6 Flash (No. 2 official flagship — the best balance of speed and accuracy)",
  "১,১৭০ ৳ (কোর্ট ফি ২০৳ + নোটিশ ফি ৫০৳ + রেকর্ড সংশোধন ফি ১,০০০৳ + খতিয়ান ফি ১০০৳)": "1,170 ৳ (Court Fee 20 ৳ + Notice Fee 50 ৳ + Record Correction Fee 1,000 ৳ + Khatian Fee 100 ৳)",
  "২. ছবি বা প্রশ্নপত্রের PDF থেকে সরাসরি Word 2003 (.doc) ফাইল কিভাবে পাওয়া যাবে?": "2. How to get Word 2003 (.doc) file directly from image or question paper PDF?",
  "সরকারি ফি ও আবেদনের শর্তাবলী সম্পর্কে জানতে দোকানে আসুন অথবা ফোনে যোগাযোগ করুন।": "Visit the store or call to know about government fees and application conditions.",
  "ডকুমেন্টের টেক্সট, টেবিল, গণিত সমীকরণ ও যুক্তবর্ণ সুচারুভাবে বিশ্লেষণ করা হচ্ছে": "Document text, tables, mathematical equations and hyphens are analyzed smoothly",
  "চেপে Enter দিন — ব্যাস, এক্সটেনশনটি সাথে সাথে আপনার ব্রাউজারে যুক্ত হয়ে যাবে!": "Hit Enter — voila, the extension will be added to your browser instantly!",
  "ড্রপডাউনে ক্লিক বা মাউস রাখলে চেকলিস্ট স্বয়ংক্রিয় পরিবর্তন সাময়িক থেমে থাকবে": "Clicking or hovering over the dropdown will temporarily pause the checklist auto-change",
  "Word, Excel, PPT, Math প্রশ্নপত্র ও টেক্সট — অটো-ডিটেকশনে নির্ভুল রূপান্তর।": "Word, Excel, PPT, Math worksheets and text — accurate conversion with auto-detection.",
  "চাকরির আবেদন, পাসপোর্ট, পুলিশ ক্লিয়ারেন্স, এনআইডি ও আয়কর সংক্রান্ত সকল সেবা": "All Services related to Job Application, Passport, Police Clearance, NID and Income Tax",
  "আপনার সার্চ অনুযায়ী কোনো কাজের মূল্য পাওয়া যায়নি। সরাসরি ফোনে যোগাযোগ করুন।": "No job prices were found according to your search. Contact directly by phone.",
  "অনলাইনে জমির নামজারি, খাজনা দাখিলা, খতিয়ান পর্চা ও নকশা সংক্রান্ত সকল সেবা": "Online Land Registration, Tax Filing, Khatian Parcha and all services related to design",
  "Gemini 3.5 Flash (১ নম্বর প্রধান ফ্ল্যাগশিপ — শতভাগ নির্ভুল বাংলা ও ম্যাথ)": "Gemini 3.5 Flash (No. 1 flagship — 100% accurate Bengali and Math)",
  "ভর্তি আবেদন, পরীক্ষার ফলাফল, কম্পোজ, কনভার্টার, ফটো প্রিন্ট ও পিভিসি কার্ড": "Admission Application, Exam Result, Compose, Converter, Photo Print & PVC Card",
  "শ্রেণিভিত্তিক সকল শিক্ষার্থীর ফলাফল, জিপিএ, মোট নম্বর ও মেধা স্থান তালিকা।": "Result, GPA, Total Marks and Merit Rank list of all students class wise.",
  "আপনার নিজস্ব API Key দিলে আনলিমিটেড ফাস্ট স্পিডে ছবি/পিডিএফ কনভার্ট হবে।": "Enter your own API Key to convert images/PDFs at unlimited fast speed.",
  "ফয়জার সার্বজনীন বাংলা কনভার্টার | ইউনিকোড ⇄ বিজয়, AI OCR ও গণিত সমীকরণ": "Fayzar Universal Bengali Converter Unicode ⇄ Victory, AI OCR and Math Equations",
  "যেকোনো উইন্ডোজ পিসি বা ল্যাপটপে এক্সটেনশনটি ব্যবহার করার সহজ ৩টি ধাপ:": "3 easy steps to use the extension on any Windows PC or laptop:",
  ".doc বা .docx বাটনে চাপার সাথে সাথেই স্বয়ংক্রিয়ভাবে ডাউনলোড শুরু হবে": ".doc or .docx will start downloading automatically as soon as the button is clicked",
  "ওয়ার্ড (.docx, .doc), এক্সেল, পাওয়ারপয়েন্ট, প্রশ্নপত্রের ছবি বা PDF": "Word (.docx, .doc), Excel, PowerPoint, question paper image or PDF",
  "অনলাইন রেজাল্ট ও একাডেমিক ট্রান্সক্রিপ্ট পোর্টাল | ফয়জার কম্পিউটার": "Online Results & Academic Transcript Portal | Foyer Computer",
  "Gemini 3.1 Pro (৬ নম্বর প্রো রিজনিং — ১M কনটেক্সট, জটিল হাতের লেখা)": "Gemini 3.1 Pro (6 Number Pro Reasoning — 1M Context, Complex Handwriting)",
  "⚡ অটো মোড (মডেল-ফার্স্ট প্রায়োরিটি + ১৪টি কি-এর স্বয়ংক্রিয় রোটেশন)": "⚡ Auto mode (model-first priority + automatic rotation of 14 keys)",
  "বাটনে ক্লিক করুন (পাথ স্বয়ংক্রিয় কপি হয়ে যাবে এবং ক্রোম ওপেন হবে)।": "Click the button (the path will be automatically copied and Chrome will open).",
  "যেকোনো স্বাক্ষরের ছবি দিলে সিস্টেম স্বয়ংক্রিয়ভাবে ৩০০x৮০ করে নেবে": "Any signature image will be automatically resized by the system to 300x80",
  "Gemini 2.5 Flash (৫ নম্বর লেগাসি সুপারফাস্ট — ১.২ সেকেন্ড স্পিড)": "Gemini 2.5 Flash (No. 5 Legacy Superfast — 1.2 second speed)",
  "ডাউনলোড করুন যা যেকোনো প্রিন্টার বা প্রেসে নির্দ্বিধায় খোলা যায়।": "Download which can be freely opened on any printer or press.",
  "Gemini 3.8 Flash (৩ নম্বর আধুনিক সংস্করণ — মাল্টি-টাস্ক সক্ষমতা)": "Gemini 3.8 Flash (No. 3 Latest Version — Multi-tasking Capability)",
  "বিজয় আউটপুট ওয়ার্ড ফাইলে কপি করে পেস্ট করার পর ফন্ট পরিবর্তন করে": "Vijay changed the font after copying and pasting it into the output word file",
  "করে দিন। সরাসরি ফন্ট সেটসহ পেতে উপরের ডাউনলোড বাটন ব্যবহার করুন।": "do it Use the download button above to get the font set directly.",
  "বারবার টাইপ করার দিন শেষ — প্রযুক্তির সহায়তায় সময় ও শ্রম বাঁচান": "Gone are the days of repetitive typing — save time and effort with the help of technology",
  "যেকোনো সাইজের ছবি দিলে সিস্টেম স্বয়ংক্রিয়ভাবে ৩০০x৩০০ করে নেবে": "If you give a picture of any size, the system will automatically make it 300x300",
  "ফয়জার কম্পিউটার এন্ড ফটোস্ট্যাট | Fayzar Computer & Photostat": "Foiser Computer and Photostat Fayzar Computer & Photostat",
  "ওয়ারিশান সনদ ও মৃত্যু সনদ (ওয়ারিশ সূত্রে প্রাপ্ত জমির ক্ষেত্রে)": "Warishan Sanad and Death Deed (in case of land inherited by inheritance)",
  "ব্রাউজারের ডাউনলোড অপশনে আপনার রূপান্তরিত ফাইলটি সংরক্ষণ হয়েছে": "Your converted file is saved in the download option of the browser",
  "শতক, কাঠা ও বিঘা রূপান্তর এবং সরকারি জমি রেজিস্ট্রি ফি হিসাব।": "Shatak, Katha and Bigha Conversion and Government Land Registry Fee Calculation.",
  "টার্গেট ফন্ট সিলেক্ট করে সরাসরি .doc বা .docx বাটনে ক্লিক করুন": "Select the target font and click the Directly .doc or .docx button",
  "সাফ-কবলা, হেবা ও বণ্টননামা দলিলের সরকারি খরচের আনুমানিক হিসাব": "Estimates of government expenditure on clear-cut, heba and distribution documents",
  "বীর মুক্তিযোদ্ধা / শহীদ মুক্তিযোদ্ধার সন্তান (১৮ থেকে ৩২ বছর)": "Children of Heroic Freedom Fighters / Martyred Freedom Fighters (18 to 32 years)",
  "৩০০x৩০০ ছবি ও ৩০০x৮০ স্বাক্ষর নির্দিষ্ট সাইজে দ্রুত রিসাইজিং।": "Fast resizing of 300x300 images and 300x80 signatures to specific sizes.",
  "স্কুল-কলেজ ও মাদ্রাসার ডিজিটাল পিভিসি (PVC) আইডি কার্ড ও ফিতা": "Digital PVC (PVC) ID Cards and Ribbons of Schools-Colleges and Madrasas",
  "সেবাসমূহ, চেকলিস্ট ও কাজের মূল্য তালিকা | ফয়জার কম্পিউটার": "Services, Checklist and Job Price List | Foyer Computer",
  "নির্দিষ্ট তারিখে বছর-মাস-দিন সহ চাকরির আবেদন যোগ্যতা যাচাই।": "Job Application Eligibility Verification with Date Year-Month-Day",
  "🔒 আপনার সকল তথ্য ও ছবি ক্লাউডে ১০০% সুরক্ষিত ও এনক্রিপ্টেড।": "🔒 All your data and photos are 100% secure and encrypted in the cloud.",
  "টার্গেট ফরম্যাট সিলেক্ট করে সরাসরি কনভার্ট বাটনে ক্লিক করুন": "Select the target format and click the Convert button directly",
  "১. ইউনিকোড থেকে বিজয়ে রূপান্তরের পর ফন্ট কেন অদ্ভুত দেখায়?": "1. Why does the font look weird after converting from unicode to win?",
  "* জরুরি বা বিশেষ কাজের ক্ষেত্রে পারিশ্রমিক আলোচনা সাপেক্ষে": "* Remuneration is subject to negotiation in case of urgent or special work",
  "বামে ছবি আপলোড করলে এখানে প্রিভিউ ও কনভার্ট ফাইল দেখতে পাবেন": "If you upload the image on the left, you will see the preview and convert file here",
  "যেকোনো চাকরির সাইটে গিয়ে ১-ক্লিকেই ফর্ম ও ছবি পূরণ করুন!": "Go to any job site and fill out forms and photos in 1-click!",
  "প্রশ্নপত্রের ছবি বা PDF ড্রপজোনে আপলোড করে টার্গেট হিসেবে": "Upload question paper image or PDF to dropzone as target",
  "ছবি ও স্বাক্ষর (টেলিটক স্ট্যান্ডার্ড ৩০০x৩০০ ও ৩০০x৮০)": "Photograph and signature (Teletalk standard 300x300 and 300x80)",
  "শতক, কাঠা, বিঘা, একর রূপান্তর ও দলিলের সরকারি খরচ যাচাই": "Government cost verification of Shatak, Katha, Bigha, Acre conversion and deed",
  "যেকোনো সেবার বিষয়ে বিস্তারিত জানতে সরাসরি যোগাযোগ করুন": "Contact directly for details on any service",
  "যেভাবে সবচেয়ে দ্রুত ও নির্ভুলভাবে বাংলা কনভার্ট করবেন": "How to convert Bengali most quickly and accurately",
  "অনলাইন স্মার্ট টুলস ও ইউটিলিটি স্যুট | ফয়জার কম্পিউটার": "Online Smart Tools & Utility Suite | Foyer Computer",
  "৩. আমার আপলোড করা ফাইল বা ডেটা কি নিরাপদ ও গোপনীয় থাকবে?": "3. Will my uploaded files or data be secure and confidential?",
  "ক্রেতা ও বিক্রেতার জাতীয় পরিচয়পত্র (NID) নম্বর ও ছবি": "National Identity Card (NID) number and photograph of buyer and seller",
  "২ পৃষ্ঠার অধিক হলে প্রতি পৃষ্ঠা ৫ ৳ হারে বৃদ্ধি পাবে": "If more than 2 pages, each page will increase at the rate of 5 ৳",
  "যোগাযোগ ও অবস্থান | ফয়জার কম্পিউটার এন্ড ফটোস্ট্যাট": "Contact and location Foyer Computer and Photostat",
  "ফয়জার জব অটো-ফিল — ১-ক্লিকে যেকোনো চাকরির ফর্ম পূরণ!": "Foyzer Job Auto-Fill — Fill any job form in 1-click!",
  "ধন্যবাদ! আপনার মূল্যবান মতামত ও মন্তব্য গৃহীত হয়েছে।": "Thank you! Your valuable feedback and comments are received.",
  "(বা Control Panel)-এ গিয়ে সাধারণ সফটওয়্যারের মতোই": "(or Control Panel) just like normal software",
  "স্ট্যান্ডার্ড ফন্ট ও ফরম্যাট (প্রিন্ট খরচ আলাদা)": "Standard fonts and formats (print costs vary)",
  "টেলিটক বা যেকোনো সরকারি চাকরির আবেদন পেজে গিয়ে শুধু": "Just go to teletalk or any government job application page",
  "জমির হাত নকশা বা সীমানা বিবরণী (প্রযোজ্য ক্ষেত্রে)": "Land Survey or Boundary Statement (if applicable)",
  "ফাইলের শিরোনাম (যেমন: সরকারি চাকরি মাস্টার ফাইল) *": "File Title (eg: Government Job Master File) *",
  "চাপলেই পুরো ফর্ম ও ছবি স্বয়ংক্রিয় পূরণ হয়ে যাবে!": "Just press the entire form and picture will be automatically filled!",
  "স্বচ্ছ মূল্য নিশ্চয়তা • নির্ধারিত দোকান রেটচার্ট": "Transparent price assurance • Fixed store rate chart",
  "আপলোড করা পেজ প্রিভিউ (সবগুলো একসাথে প্রসেস হবে):": "Uploaded page preview (all will be processed together):",
  ", ছবি বা PDF) ড্রপ করুন অথবা টেক্সট বক্সে লিখুন।": ", image or PDF) drop or type in the text box.",
  "গুগল ড্রাইভ শিট থেকে লাইভ সার্কুলার লোড হচ্ছে...": "Loading live circular from google drive sheet...",
  "একাউন্ট নেই? এখানে ক্লিক করে নতুন একাউন্ট খুলুন": "Don't have an account? Click here to open a new account",
  "অনলাইন স্মার্ট এনআইডি কার্ড ডাউনলোড ও লেমিনেশন": "Online Smart NID Card Download & Lamination",
  "সহকারী কমিশনার (ভূমি) বরাবর দরখাস্ত ড্রাফটিং সহ": "With Drafting of Petition with Assistant Commissioner (Lands).",
  "কম্পিউটারাইজড রেজাল্ট প্রস্তুত ও প্রক্রিয়াকরণে:": "Preparation and processing of computerized results:",
  "Gemini 3.7 Flash (৪ নম্বর হাইব্রিড রিজনিং মডেল)": "Gemini 3.7 Flash (No. 4 Hybrid Reasoning Model)",
  "পূর্ববর্তী খতিয়ানসমূহ (CS, SA, RS, হাল খতিয়ান)": "Previous Examinations (CS, SA, RS, Hal Examinations)",
  "মোবাইল নম্বর ও ৪ ডিজিটের পিন দিয়ে প্রবেশ করুন": "Login with mobile number and 4 digit PIN",
  "অনলাইন পর্চা কপি বা ডিসি অফিসের সার্টিফাইড কপি": "Online Certificate Copy or DC Office Certified Copy",
  "চলমান সরকারি ও স্বায়ত্তশাসিত চাকরির সার্কুলার": "Current Govt and Autonomous Job Circulars",
  "সর্বশেষ পরিশোধিত ভূমি উন্নয়ন কর (খাজনা) দাখিলা": "Filing of last paid Land Development Tax (Rent).",
  "অনলাইন থেকে সার্চ, ডাউনলোড ও তৎক্ষণাৎ প্রিন্ট": "Search, download and print instantly from online",
  "ডিজিটাল জব ও আবেদন পোর্টাল — ফয়জার কম্পিউটার": "Digital Job & Application Portal — Foyzer Computers",
  "ই-টিন (e-TIN) সার্টিফিকেট নতুন আবেদন ও সংশোধন": "e-TIN Certificate New Application and Amendment",
  "আপনার নিজস্ব ফ্রি Gemini API Key ব্যবহার করুন": "Use your own free Gemini API Key",
  "অনলাইন আয়কর ই-রিটার্ন দাখিল (e-Return Dakhil)": "Online Income Tax e-Return Filing (e-Return Dakhil)",
  "গ্রেডভিত্তিক পরিসংখ্যান (Grade Distribution)": "Grade Distribution",
  "বোর্ড/বিশ্ববিদ্যালয় পরীক্ষার ফরম পূরণ ও স্লিপ": "Board/University Examination form filling and slip",
  "আপনার মূল্যবান মন্তব্য, অভিজ্ঞতা বা পরামর্শ *": "Your valuable comments, experiences or suggestions *",
  "ACADEMIC TRANSCRIPT / একাডেমিক ট্রান্সক্রিপ্ট": "ACADEMIC TRANSCRIPT / Academic Transcript",
  "অ্যাপয়েন্টমেন্ট স্লিপ ও পূর্ণ ফর্ম প্রিন্ট সহ": "With appointment slip and full form print",
  "গুগল এআই স্টুডিও থেকে ফ্রি কী (API Key) নিন": "Get free API Key from Google AI Studio",
  "স্কুল, মাদ্রাসা ও প্রতিষ্ঠানের ডিজিটাল কার্ড": "Digital cards of schools, madrasas and institutions",
  "ফয়জার কনভার্টার ব্যবহারের নিয়ম ও সুবিধাসমূহ": "Rules and Benefits of Using Foyzer Converter",
  "সহজ ৪-ধাপের ব্যবহার নির্দেশিকা (How to Use)": "Simple 4-step usage guide (How to Use)",
  "চাকরি ও বিশ্ববিদ্যালয়ে ভর্তির অনলাইন আবেদন": "Online application for jobs and university admissions",
  "ই-পাসপোর্ট (E-Passport) নতুন ও রিনিউ আবেদন": "E-Passport (E-Passport) New and Renewal Application",
  "ফলাফল সন্তোষজনক। পরবর্তী শ্রেণিতে উত্তীর্ণ।": "The results are satisfactory. passed the next class.",
  "৪ কপি পাসপোর্ট / স্ট্যাম্প সাইজ (নতুন ছবি)": "4 copies of passport / stamp size (new photo)",
  "৪ কপি পাসপোর্ট / স্ট্যাম্প সাইজ (আগের ছবি)": "4 copies of passport / stamp size (previous photo)",
  "২ কপি পাসপোর্ট / স্ট্যাম্প সাইজ (আগের ছবি)": "2 copies of passport / stamp size (previous photo)",
  "ফয়জার কম্পিউটার কাজের স্বচ্ছ মূল্য তালিকা": "Foyer Computer Jobs Transparent Price List",
  "২ কপি পাসপোর্ট / স্ট্যাম্প সাইজ (নতুন ছবি)": "2 copies of passport / stamp size (new photo)",
  "খতিয়ান, দলিল ও ওয়ারিশ স্ক্যান ও আপলোড সহ": "With scan and upload of Khatian, Deeds and Wills",
  "পূর্ণাঙ্গ শ্রেণি মেধাতালিকা ও রেজাল্ট শিট": "Complete class merit list and result sheet",
  "কম্পিউটার, কম্পোজ, প্রিন্ট ও স্টুডিও সেবা": "Computer, compose, print and studio services",
  "ফুলবাড়ী সরকারি কলেজ গেট সংলগ্ন, দিনাজপুর।": "Adjacent to Phulbari Government College Gate, Dinajpur.",
  "একাদশ শ্রেণি, ডিগ্রি, অনার্স ভর্তি আবেদন": "Class XI, Degree, Honors Admission Application",
  "স্টুডিও কোয়ালিটি ছবি প্রিন্ট ও লেমিনেটিং": "Studio quality photo printing and laminating",
  "বোর্ড ও বিশ্ববিদ্যালয় পরীক্ষার ফরম ফিল-আপ": "Form fill-up for board and university exams",
  "মূল দলিল / বায়া দলিলের সার্টিফাইড ফটোকপি": "Certified photocopy of original document / supporting document",
  "গণিত / পদার্থ / রসায়ন: প্রতি পৃষ্ঠা (A4)": "Mathematics / Physics / Chemistry: Per Page (A4)",
  "বিজ্ঞপ্তির নির্ধারিত তারিখ (Target Date)": "Target Date of Notification",
  "ফয়জার অটো-ফিল এক্সটেনশন ব্যবহারের নিয়ম": "Rules for Using Fossil Auto-Fill Extension",
  "পিভিসি ডিজিটাল আইডি কার্ড প্রিন্ট ও ফিতা": "PVC Digital ID Card Print & Ribbon",
  "ফলাফল বর্তমানে পর্যালোচনায় রয়েছে (Draft)": "Results are currently under review (Draft).",
  "প্রধান শিক্ষক / অধ্যক্ষের স্বাক্ষর ও সিল": "Signature and seal of Head Teacher / Principal",
  "সংরক্ষিত বা মোবাইলের ছবি থেকে রিপ্রিন্ট": "Reprint from saved or mobile photos",
  "সমীকরণ অপরিবর্তিত রাখতে চাইলে আনচেক করুন": "Uncheck to keep the equation unchanged",
  "AI দিয়ে কনভার্ট ও ওয়ার্ড ফাইল তৈরি করুন": "Convert and create Word files with AI",
  "চাপলে এটি এক ক্লিকে সম্পূর্ণ মুছে যাবে।": "Pressing it will delete it completely in one click.",
  "বিএসপি লার্নার কার্ড ও স্লিপ প্রিন্ট সহ": "With BSP Learner Card and Slip Print",
  "ড্রাইভিং লাইসেন্স ও বিআরটিএ সেবা (BRTA)": "Driving License and BRTA Services (BRTA)",
  "হোল্ডিং এন্ট্রি ও অনলাইন দাখিলা প্রিন্ট": "Holding Entry & Online Filing Print",
  "ড্রিমল্যান্ড রেসিডেন্সিয়াল মডেল স্কুল": "Dreamland Residential Model School",
  "হারানো ডকুমেন্টস সংক্রান্ত পুলিশ জিডি": "Police GD regarding lost documents",
  "বীর মুক্তিযোদ্ধা / শহীদ সন্তানের পোষ্য": "Pet of brave freedom fighter/martyr child",
  "• \n              সংরক্ষিত চাকরির ফাইল:": "• \n              Saved job files:",
  "কালার কারেকশন বা রিসাইজ আলোচনা সাপেক্ষে": "Color correction or resize is negotiable",
  "ওয়াটারপ্রুফ ফটো প্রিন্ট (ল্যাব ফিনিশ)": "Waterproof Photo Print (Lab Finish)",
  "ফাইল কনভার্ট হয়ে ডাউনলোড সম্পন্ন হয়েছে!": "The file has been converted and downloaded!",
  "দোকানে ছবি তোলা ও ব্যাকগ্রাউন্ড চেঞ্জ": "In-store photography and background change",
  "জমি পরিমাপ ও দলিল রেজিস্ট্রি ফি হিসাব": "Calculation of Land Survey and Deed Registry Fees",
  "মাত্র ৩টি ধাপে ফর্ম পূরণ সম্পন্ন করুন": "Complete the form filling in just 3 steps",
  "সিলেক্ট করতে হয়। তবে আপনি যদি আমাদের": "to be selected. But if you are our",
  "আবেদনের ধরণ অনুযায়ী (পূর্বে জেনে নিন)": "According to Application Type (Know in advance)",
  "ডিজিটাল ভূমিসেবা ও রেকর্ড ব্যবস্থাপনা": "Digital land services and records management",
  "DLR থেকে মূল সিট ডাকযোগে হোম ডেলিভারি": "Home delivery by original seat post from DLR",
  "ডকুমেন্ট স্ক্যান, আপলোড ও বিকাশ ফি সহ": "Including document scan, upload and development fee",
  "ফাইল এখানে ছেড়ে দিন অথবা ব্রাউজ করুন": "Drop or browse files here",
  "আপনার সংরক্ষিত চাকরির আবেদন ফাইলসমূহ": "Your saved job application files",
  "ক্রোম ও এজ ব্রাউজারে ১-ক্লিক অটো-ফিল": "1-click auto-fill in Chrome and Edge browsers",
  "স্বয়ংক্রিয় অডিট ও যাচাই (Auto-Verify)": "Auto-Verify",
  "এনআইডি (NID) সংশোধন ও রি-ইস্যু আবেদন": "Application for NID correction and re-issue",
  "বাংলা অথবা ইংরেজি: প্রতি পৃষ্ঠা (A4)": "Bengali or English: Per Page (A4)",
  "রেকর্ড সংশোধন ও বিবিধ মিস কেস আবেদন": "Rectification of records and miscellaneous miss case application",
  "দলিল রেজিস্ট্রি ও স্ট্যাম্প ফি হিসাব": "Deed registry and stamp fee calculation",
  "সুতন্নিএমজে বিজয় ফন্ট (প্রিন্ট রেডি)": "Suttannimj Vijay Font (Print Ready)",
  "NBR রেজিস্টার্ড ১২ ডিজিট সার্টিফিকেট": "NBR Registered 12 Digit Certificate",
  "অনলাইন ভোটার আইডি ডাউনলোড ও লেমিনেশন": "Online Voter ID Download and Lamination",
  "প্রতিবন্ধী প্রার্থী (১৮ থেকে ৩২ বছর)": "Candidates with Disability (18 to 32 years)",
  "ফয়জার হাই-স্পিড ইঞ্জিন (No AI Cost)": "Foyzer High-Speed ​​Engine (No AI Cost)",
  "ল্যাব কোয়ালিটি গ্লসি পেপার ফিনিশিং": "Lab quality glossy paper finishing",
  "প্রার্থীর স্বাক্ষর (৩০০x৮০ পিক্সেল)": "Candidate's Signature (300x80 pixels)",
  "যাচাই ও সংশোধনের বিবরণ (Audit Log):": "Audit Log:",
  "কম্পিউটার টাইপিং, প্রিন্ট ও স্টুডিও": "Computer typing, print and studio",
  "ফ্রি ডিজিটাল টুলস ও কনভার্টার স্যুট": "Free digital tools and converter suite",
  "হাই-গ্লসি ফটো প্রিন্ট ও লেমিনেশন সহ": "With high-glossy photo print and lamination",
  "আপনার পছন্দের আউটপুট নির্বাচন করুন:": "Select your preferred output:",
  "মূল ফাইলের সাথে পুনরায় অডিট ও যাচাই": "Re-audit and verify with original file",
  "পরীক্ষার রেজাল্ট ও মার্কশিট প্রিন্ট": "Exam Result and Marksheet Print",
  "ড্রাইভিং লাইসেন্স ও বিআরটিএ লার্নার": "Driving License and BRTA Learner",
  "পুলিশ ক্লিয়ারেন্স সার্টিফিকেট (PCC)": "Police Clearance Certificate (PCC)",
  "সাধারণ সরকারি/বেসরকারি চাকরির আবেদন": "General Govt/Private Job Application",
  "১-ক্লিকে Word 2003 (.doc) এক্সপোর্ট": "1-click Word 2003 (.doc) export",
  "Gemini 3.5 Flash ইঞ্জিন কনফিগারেশন": "Gemini 3.5 Flash Engine Configuration",
  "অনলাইন পুলিশ ক্লিয়ারেন্স সনদ (PCC)": "Online Police Clearance Certificate (PCC)",
  "ই-ট্রেড লাইসেন্স ও অনলাইন রিনিউয়াল": "E-Trade License and Online Renewal",
  "সোনালী ই-সেবা চালান ও আবেদন কপি সহ": "Sonali e-service with challan and application copy",
  "ডিজিটাল ফটোস্ট্যাট ও কালার প্রিন্ট": "Digital photostat and color print",
  "সাধারণ পরামর্শ, মন্তব্য বা প্রশংসা": "General suggestions, comments or compliments",
  "রেজাল্ট / এডমিট / নেট থেকে প্রিন্ট": "Print from Result / Admit / Net",
  "Legal পেজ প্রতি পৃষ্ঠা (উভয় সাইড)": "Legal Page Per Page (Both Sides)",
  "এই সেবার জন্য WhatsApp-এ মেসেজ দিন": "Message on WhatsApp for this service",
  "অনলাইন খতিয়ান ও মৌজা ম্যাপ (পর্চা)": "Online Khatian & Mauza Map (Paper)",
  "ব্যক্তিগত তথ্য (Personal Details)": "Personal Details",
  "প্রিমিয়াম কোয়ালিটি কাগজ ও প্রিন্ট": "Premium quality paper and print",
  "A4 (8.27\" x 11.69\" স্ট্যান্ডার্ড)": "A4 (8.27\" x 11.69\" standard)",
  "ক্যাটাগরি ০৩ • কম্পিউটার ও স্টুডিও": "Category 03 • Computer and Studio",
  "ডিজিটাল ভূমিসেবা (নামজারি, খাজনা)": "Digital Land Services (Namjari, Khajna)",
  "সর্বোচ্চ ১০০ KB ফাইল (JPG / PNG)": "Max 100 KB file (JPG / PNG)",
  "\"🚀 ক্রোম এক্সটেনশন পেজ ওপেন করুন\"": "\"🚀 Open Chrome extension page\"",
  "১. জমির ক্ষেত্রফল ইউনিট রূপান্তর:": "1. Conversion of land area units:",
  "ই-পাসপোর্ট নতুন ও রি-ইস্যু আবেদন": "E-Passport New and Re-Issue Application",
  "অনলাইন সাধারণ ডায়েরি (Online GD)": "Online General Diary (Online GD)",
  "আইডি কার্ড / ভোটার কার্ড লেমিনেশন": "ID Card / Voter Card Lamination",
  "অনলাইনে সাধারণ ডায়েরি (Online GD)": "Online General Diary (Online GD)",
  "জটিল সমীকরণ, ইকুয়েশন ও প্রশ্নপত্র": "Complex Equations, Equations and Question Papers",
  "অনলাইন সাধারণ ডায়েরি (Online GD)": "Online General Diary (Online GD)",
  "খতিয়ান / পর্চা অনুসন্ধান ও আবেদন": "Khatian / Parcha search and application",
  "কালার প্রিন্ট ও ভারী লেমিনেশন সহ": "With color print and heavy lamination",
  "সাধারণ প্রার্থী (১৮ থেকে ৩২ বছর)": "General Candidates (18 to 32 Years)",
  "গ্রাহক মতামত, অভিজ্ঞতা ও পরামর্শ": "Customer reviews, experiences and advice",
  "Gemini AI দিয়ে রূপান্তর হচ্ছে...": "Transforming with Gemini AI…",
  "কলেজ ও বিশ্ববিদ্যালয় ভর্তি আবেদন": "College and University Admission Application",
  "ডিজিটাল কিউআর ট্রেড লাইসেন্স কপি": "Digital QR Trade License Copy",
  "হেবা / দানপত্র (রক্তের সম্পর্কে)": "Heba / Donation (relating to blood)",
  "ডিজিটাল পিভিসি আইডি কার্ড ও ফিতা": "Digital PVC ID Card & Ribbon",
  "সমীকরণ সহ সব টেক্সট কনভার্ট করুন": "Convert all text with equations",
  "ছবি প্রিন্ট, ফটোকপি ও ল্যামিনেশন": "Photo printing, photocopying and lamination",
  "কাস্টম Gemini API Key (ঐচ্ছিক):": "Custom Gemini API Key (Optional):",
  "Legal দলিল / কোর্ট সাইজ লেমিনেশন": "Legal document / court size lamination",
  "ডেলিভারি: ২৮ কর্মদিবস (সাধারণত)": "Delivery: 28 working days (usually)",
  "আন-ইনস্টল (Uninstall) করার নিয়ম:": "Uninstall Rules:",
  "নির্দিষ্ট তারিখে আপনার সঠিক বয়স:": "Your exact age on the specified date:",
  "অনলাইনে জমির খাজনা/LD Tax পরিশোধ": "Payment of land tax/LD Tax online",
  "ডকুমেন্ট স্ক্যান ও ইমেইল প্রেরণ": "Document scanning and email sending",
  "শ্রেণি শিক্ষকের স্বাক্ষর ও তারিখ": "Signature and date of class teacher",
  "ইতিমধ্যে একাউন্ট আছে? লগইন করুন": "Already have an account? Login",
  "হাই-গ্লসি ফটো পেপার প্রিন্ট (A4)": "High-Glossy Photo Paper Print (A4)",
  "বাংলা ও ইংরেজি কম্পিউটার কম্পোজ": "Bengali and English Computer Compose",
  "সরকারি চাকরির আবেদন ও সার্কুলার": "Government job applications and circulars",
  "\"১-ক্লিকে ফর্ম ও ছবি পূরণ করুন\"": "\"Fill Forms & Images in 1-Click\"",
  "অনলাইন ফরম-২ পূরণ ও প্রিন্ট কপি": "Online form-2 filling and print copy",
  "+880 1717-101919 (সরাসরি মেসেজ)": "+880 1717-101919 (Direct Message)",
  "A4 পেজ প্রতি পৃষ্ঠা (উভয় সাইড)": "A4 pages per page (both sides)",
  "অনলাইন নাগরিক ও ক্যারিয়ার আবেদন": "Online Citizen and Career Application",
  "সুতন্নিএমজে বিজয় (প্রিন্ট রেডি)": "Suttannimj Vijay (Print Ready)",
  "গুগল ম্যাপে আমাদের সঠিক অবস্থান": "Our exact location on Google Maps",
  "নতুন ভোটার নিবন্ধন ও ফরম-২ পূরণ": "Registration of new voters and filling of Form-2",
  "কনভার্সন সফলভাবে সম্পন্ন হয়েছে!": "Conversion completed successfully!",
  "ডিজিটাল মৌজা ম্যাপ (নকশা) আবেদন": "Digital Mauza Map (Design) Application",
  "প্রার্থীর ছবি (৩০০x৩০০ পিক্সেল)": "Candidate's photograph (300x300 pixels)",
  "Legal পেজ প্রতি পৃষ্ঠা (১ সাইড)": "Legal Page Per Page (1 Side)",
  "ই-ট্রেড লাইসেন্স ও অনলাইন রিনিউ": "E-Trade License and Online Renewal",
  "ই-টিন (e-TIN) সার্টিফিকেট আবেদন": "e-TIN Certificate Application",
  "Legal (8.5\" x 14.0\" দলিল/নোটিশ)": "Legal (8.5\" x 14.0\" document/notice)",
  "টেলিটক ছবি ও স্বাক্ষর রিসাইজার": "Teletalk image and signature resizer",
  "১-ক্লিক ইনস্টলার ডাউনলোড (.EXE)": "1-Click Installer Download (.EXE)",
  "ইউনিকোড ⇄ বিজয় বাংলা কনভার্টার": "Unicode ⇄ Vijay Bangla Converter",
  "স্কুল বা মাদ্রাসা সিলেক্ট করুন": "Select School or Madrasa",
  "ই-টিন (e-TIN) সার্টিফিকেট তৈরি": "Generation of e-TIN certificate",
  "উপরে দেওয়া ড্রপডাউন থেকে আপনার": "Yours from the dropdown given above",
  "ই-নামজারি ও রেকর্ড খারিজ আবেদন": "E-registration and record rejection application",
  "কোনো অতিরিক্ত লুকানো চার্জ নেই": "There are no additional hidden charges",
  "জন্ম ও মৃত্যু নিবন্ধন ও সংশোধন": "Registration and correction of births and deaths",
  "ভূমি উন্নয়ন কর (খাজনা পরিশোধ)": "Land Development Tax (Payment of Rent)",
  "আনসার ও গ্রাম প্রতিরক্ষা সদস্য": "Ansar and village defense members",
  "প্রার্থী একাউন্ট ও ক্লাউড ফাইল": "Candidate account and cloud file",
  "ফয়জার কনভার্টার ও অনলাইন টুলস": "Foyer Converter & Online Tools",
  "আপনার জন্ম তারিখ (Birth Date)": "Your Birth Date",
  "অনলাইন স্মার্ট এনআইডি ডাউনলোড": "Online Smart NID Download",
  "4R সাইজ (প্রিন্ট + লেমেনেটিং)": "4R Size (Print + Laminating)",
  "ব্যাংক বন্ধকী দলিল (Mortgage)": "Bank Mortgage Deed (Mortgage)",
  "বা বিজয়/ইউনিকোড সিলেক্ট করুন।": "Or select Win/Unicode.",
  "দলিল ও বড় সাইজ কাগজের সুরক্ষা": "Protection of documents and large size paper",
  "তারিখ প্রবেশ করিয়ে বাটন চাপুন": "Enter the date and press the button",
  "রেকর্ড সংশোধন ও মিস কেস আবেদন": "Rectification of records and miss case applications",
  "অনলাইন কলেজ চয়েস ও ফরম ফিল-আপ": "Online college choice and form fill-up",
  "স্ক্যানিং + মেইল (১-২ পৃষ্ঠা)": "Scanning + Mail (1-2 pages)",
  "পাওয়ারপয়েন্ট (.PPTX) ডাউনলোড": "PowerPoint (.PPTX) Download",
  "সাধারণ জিজ্ঞাসা ও উত্তর (FAQ)": "Common Questions and Answers (FAQ)",
  "ই-পাসপোর্ট নতুন ও রিনিউ আবেদন": "E-Passport New and Renewal Application",
  "উত্তরাধিকার সনদ ও ক্যালকুলেটর": "Inheritance Certificate and Calculator",
  "ডিজিটাল মৌজা নকশা (সিট আবেদন)": "Digital Mouza Design (Seat Application)",
  "একক পাশ ফটোকপি (৮০ GSM পেপার)": "Single side photocopy (80 GSM paper)",
  "A4 পেজ প্রতি পৃষ্ঠা (১ সাইড)": "A4 page per page (1 side)",
  "অটো-রোটেশন সচল (প্রতি ৩ সে.)": "Auto-rotation enabled (every 3 sec.)",
  "জাতীয় পরিচয়পত্র (NID) সংশোধন": "Revision of National Identity Card (NID).",
  "ভারী প্লাস্টিক পাউচ লেমিনেশন": "Heavy plastic pouch lamination",
  "সাদাকালো লেজার প্রিন্ট (A4)": "Black & White Laser Print (A4)",
  "A4 সাইজ সার্টিফিকেট লেমিনেশন": "A4 size certificate lamination",
  "মাত্র ৫ সেকেন্ডের সহজ সেটআপ!": "Easy setup in just 5 seconds!",
  "অফিস ও প্রশ্নপত্র কনভার্টার": "Office and Question Paper Converter",
  "জাতীয় পরিচয়পত্র (NID) নম্বর": "National Identity Card (NID) number",
  "শিক্ষাগত যোগ্যতা (SSC & HSC)": "Educational Qualification (SSC & HSC)",
  "Narrow (০.৫\" প্রশ্ন ও ফর্ম)": "Narrow (0.5\" questions and forms)",
  "AI মডেল (ওসিআর প্রায়োরিটি):": "AI Model (OCR Priority):",
  "ক্যাটাগরি ০২ • নাগরিক আবেদন": "Category 02 • Civil applications",
  "১-ক্লিক অটো ইনস্টলার (.EXE)": "1-Click Auto Installer (.EXE)",
  "ই-নামজারি আবেদন ও ট্র্যাকিং": "E-Namjari application and tracking",
  "চাকরির অনলাইন আবেদন ও এডমিট": "Online Job Application and Admit",
  "অনলাইন আয়কর ই-রিটার্ন দাখিল": "Online income tax e-return filing",
  "ক্লাউড একাউন্ট ও ফাইল তৈরি": "Cloud account and file creation",
  "আজকের অবশিষ্ট ফ্রি ক্রেডিট:": "Today's Remaining Free Credits:",
  "বণ্টননামা দলিল (Partition)": "Partition Deed",
  "নতুন ভোটার নিবন্ধন ও ফরম-২": "New Voter Registration and Form-II",
  "৩ সেকেন্ডে ১-ক্লিক অটো-ফিল": "1-click auto-fill in 3 seconds",
  "12 pt (অফিস স্ট্যান্ডার্ড)": "12 pt (office standard)",
  "ওয়ার্ড ২০০৩ (.DOC) ডাউনলোড": "Word 2003 (.DOC) Download",
  "নতুন চাকরির ফাইল তৈরি করুন": "Create a new job file",
  "ইউনিয়ন পরিষদ এলাকা (গ্রাম)": "Union Parishad Area (Village)",
  "পুনরায় যাচাই ও সংশোধন করুন": "Recheck and revise",
  "৪ ডিজিটের গোপন পিন (PIN) *": "4 Digit Secret Pin (PIN) *",
  "ক্রোম পেজের উপরে ডান কোণায়": "In the top right corner of the Chrome page",
  "কাজ বা এডিট করতে হলে ১০ ৳": "10 ৳ to work or edit",
  "প্রার্থীর নাম (ENGLISH) *": "Candidate Name (ENGLISH) *",
  "14 pt (বাংলা টাইপিং আদর্শ)": "14 pt (Bangla typing is ideal)",
  "ছবি ও স্বাক্ষর অটো-রিসাইজ": "Image and signature auto-resize",
  "Gemini AI + ফয়জার ইঞ্জিন": "Gemini AI + Foyzer engine",
  "১-ক্লিক চাকরির ফর্ম ও ছবি": "1-click job forms and images",
  "১-ক্লিকে যেকোনো ফর্ম পূরণ": "Fill any form in 1-click",
  "সর্বমোট / চূড়ান্ত ফলাফল :": "Total / Final Result :",
  "১১ ডিজিটের মোবাইল নম্বর *": "11 Digit Mobile Number *",
  "বার্ষিক বা সাময়িক পরীক্ষা": "Annual or periodical examination",
  "সাধারণ কালার প্রিন্ট (A4)": "Plain Color Print (A4)",
  "খুঁজলেই অফিশিয়াল মার্কশীট": "Look for the official marksheet",
  "এতিম ও শারীরিক প্রতিবন্ধী": "Orphans and physically challenged",
  "কী সংরক্ষণ ও কনভার্ট করুন": "Save and convert keys",
  "সিটি কর্পোরেশন / জেলা সদর": "City Corporation / District Headquarters",
  "দিনাজপুর জেলা আবেদনযোগ্য": "Dinajpur district is applicable",
  "শ্রেণি শিক্ষকের মন্তব্য:": "Class teacher comments:",
  "অনলাইন সেলফ-সার্ভিস টুলস": "Online self-service tools",
  "বারাই, ফুলবাড়ী, দিনাজপুর": "Barai, Phulbari, Dinajpur",
  "প্রার্থীর নাম (বাংলায়) *": "Candidate Name (in Bengali) *",
  "লাইভ গুগল শিট জব বুলেটিন": "Live Google Sheets Job Bulletin",
  "ফয়জার অটো-ফিল এক্সটেনশন": "Foyzer Auto-Fill Extension",
  "সরকারি চাকরির নিয়মাবলী:": "Government Job Rules:",
  "দ্রুত ও নির্ভুল ডেলিভারি": "Fast and accurate delivery",
  "🚀 নতুন একাউন্ট তৈরি করুন": "🚀 Create new account",
  "ব্যবহার নির্দেশিকা ও FAQ": "Usage Guidelines and FAQs",
  "উভয় পাশ ডুপ্লেক্স ফটোকপি": "Both sides duplex photocopy",
  "বর্তমান ও স্থায়ী ঠিকানা": "Current and permanent address",
  "11 pt (কমপ্যাক্ট প্রশ্ন)": "11 pt (compact questions)",
  "খ্রিস্টান (Christianity)": "Christianity",
  "স্ট্যাম্প শুল্ক (১.৫%):": "Stamp Duty (1.5%):",
  "সংশ্লিষ্ট ক্লাস ও সেকশন": "Class and Section concerned",
  "ক্যাটাগরি ০১ • ভূমিসেবা": "Category 01 • Land Services",
  "আনুমানিক মোট সরকারি খরচ:": "Estimated Total Government Expenditure:",
  "জন্ম তারিখ (দিন-মাস-বছর)": "Date of Birth (Day-Month-Year)",
  "AI OCR, Word, Math ও PDF": "AI OCR, Word, Math and PDF",
  "ডাউনলোড ইনস্টলার (.EXE)": "Download Installer (.EXE)",
  "সরাসরি কল: 01717-101919": "Direct Call: 01717-101919",
  "AI OCR সেটিংস ও API Key": "AI OCR Settings and API Key",
  "Moderate (০.৭৫\" আদর্শ)": "Moderate (0.75\" ideal)",
  "পরীক্ষার ফলাফল পোর্টাল": "Exam Result Portal",
  "গুগল ম্যাপ অ্যাপে দেখুন": "View in the Google Maps app",
  "সাফ-কবলা (বিক্রয় দলিল)": "Clear-cut (Sale Deed)",
  "অনলাইন ক্লাউড প্রোফাইল": "Online cloud profile",
  "বার্ষিক পরীক্ষা - ২০২৫": "Annual Examination - 2025",
  "কনভার্টারে প্রবেশ করুন": "Enter the converter",
  "১০০% ব্রাউজার প্রসেসিং": "100% browser processing",
  "নতুন চাকরির আবেদন ফাইল": "New job application file",
  "ওয়ার্ড (.DOCX) ডাউনলোড": "Word (.DOCX) Download",
  "সেবার বিষয় / ক্যাটাগরি": "Subject / Category of Service",
  "অন্য ফাইল কনভার্ট করুন": "Convert other files",
  "(সাইজ সর্বোচ্চ ১০০ KB)": "(Size Max 100 KB)",
  "স্থানীয় সরকার কর (৩%):": "Local Government Tax (3%):",
  "এক্সেল (.XLSX) ডাউনলোড": "Excel (.XLSX) download",
  "ইউনিকোড ওয়ার্ড (.docx)": "Unicode Word (.docx)",
  "লাইভ নোটিশ ও সার্কুলার": "Live notices and circulars",
  "শনিবার – বৃহস্পতিবার:": "Saturday – Thursday:",
  "বিকাল ৪:০০ - রাত ৯:০০": "4:00 PM - 9:00 PM",
  "সকাল ১০:০০ - রাত ৯:০০": "10:00 AM - 9:00 PM",
  "Normal (চারপাশে ১.০\")": "Normal (around 1.0\")",
  "কনভার্ট ও ডাউনলোড করুন": "Convert and download",
  "রিয়েল-টাইম লাইভ সিঙ্ক": "Real-time live sync",
  "সবগুলো টুলস ওপেন করুন": "Open all tools",
  "(সাইজ সর্বোচ্চ ৬০ KB)": "(Size Max 60 KB)",
  "রেজিস্ট্রেশন ফি (১%):": "Registration Fee (1%):",
  "টেলিটক ছবি ও স্বাক্ষর": "Teletalk photo and signature",
  "আধুনিক ওয়ার্ড ফরম্যাট": "Modern word format",
  "গ্রাম / রাস্তা / বাসা": "Village / Road / House",
  "এক্সটেনশনে সিঙ্ক করুন": "Sync to extensions",
  "শনিবার - বৃহস্পতিবার:": "Saturday - Thursday:",
  "রিপ্রিন্ট স্পেশাল রেট": "Reprint Special Rate",
  "কালপুরুষ / নিকোশ ফন্ট": "Kalpurush / Nikosh font",
  "মোড বা ফরম্যাট বাছুন": "Select the mode or format",
  "মোট উত্তীর্ণ (Passed)": "Total Passed",
  "আধুনিক ওয়ার্ড (.docx)": "Modern Word (.docx)",
  "পাশের হার (Pass Rate)": "Pass Rate",
  "ফলাফল প্রদর্শিত হচ্ছে": "Results are displayed",
  "১০০% রূপান্তর সম্পন্ন": "100% conversion complete",
  "মজবুত হিটেড লেমিনেশন": "Strong heated lamination",
  "সকাল ৮:০০ - রাত ৯:০০": "8:00 am - 9:00 pm",
  "উভয় পাশ লিগ্যাল কপি": "Both sides are legal copies",
  "ইনস্টল গাইড ও পোর্টাল": "Install Guide and Portal",
  "দলিল ও কোর্ট সাইজ পেজ": "Document and court size pages",
  "সুতন্নিএমজে বিজয় ফন্ট": "Suttannimj Vijay Font",
  "কোটা বা বিশেষ সুবিধা": "quotas or privileges",
  "প্রার্থীর পুরো নাম *": "Candidate Full Name *",
  "-- বছর -- মাস -- দিন": "-- year -- month -- day",
  "টেক্সট প্রিভিউ দেখুন": "View text preview",
  "জব অটো-ফিল এক্সটেনশন": "Job Auto-Fill Extension",
  "ফুলবাড়ী পৌরসভা এলাকা": "Phulbari Municipal Area",
  ", ফুলবাড়ী, দিনাজপুর": ", Phulbari, Dinajpur",
  "সরাসরি ফাইল ডাউনলোড:": "Direct File Download:",
  "স্বয়ংক্রিয় প্রসেসিং": "Automated processing",
  "মাতার নাম (English)": "Mother's Name (English)",
  "\"ওয়ার্ড ২০০৩ (.doc)\"": "\"Word 2003 (.doc)\"",
  "পিতার নাম (English)": "Father's Name (English)",
  "১,১৭০ ৳ (সরকারি ফি)": "1,170 ৳ (government fee)",
  "লেটার গ্রেড (GRADE)": "Letter Grade (GRADE)",
  "প্রাপ্ত জিপিএ (GPA)": "GPA",
  "প্রতিষ্ঠান নির্বাচন": "Institution selection",
  "বিআরটিএ চালান আলাদা": "BRTA challan is different",
  "ক্লাউড ফাইল উইজার্ড": "Cloud File Wizard",
  "দোকান চার্জ / মূল্য": "Store Charges / Prices",
  "ওয়ার্ড ২০০৩ ফরম্যাট": "Word 2003 format",
  "ক্লিপবোর্ডে কপি হবে": "will be copied to the clipboard",
  "স্বাক্ষর (৩০০ x ৮০)": "Signature (300 x 80)",
  "ফ্রি ক্রেডিট সমাপ্ত": "Free credit ends",
  "🔥 জরুরি / হট নোটিশ": "🔥 Urgent / Hot Notice",
  "পিতার নাম (বাংলায়)": "Father's Name (in Bengali)",
  "১২টি নির্ধারিত সেবা": "12 scheduled services",
  "দোকান খোলার সময়সূচী": "Shop opening schedule",
  "কাজের / সেবার বিবরণ": "Job / Service Description",
  "ফ্ল্যাগশিপ এআই টুল": "Flagship AI tool",
  "নতুন এক্সটেনশন v2.0": "New extension v2.0",
  "২. AI OCR বিশ্লেষণ": "2. AI OCR analysis",
  "পিন নিশ্চিত করুন *": "Confirm PIN *",
  "১০০ ৳ (সার্টিফাইড)": "100 ৳ (Certified)",
  "মাতার নাম (বাংলায়)": "Mother's Name (in Bengali)",
  "ওয়ার্ড ২০০৩ (.doc)": "Word 2003 (.doc)",
  "ফাইল নির্বাচন করুন": "Select the file",
  "৬টি নির্ধারিত সেবা": "6 prescribed services",
  "৮টি নির্ধারিত সেবা": "8 scheduled services",
  "সরাসরি প্রোপ্রাইটর": "Direct Proprietor",
  "৪. ওয়ার্ড প্রস্তুত": "4. Ward is ready",
  "উৎস কর (AIT - ৩%):": "Source Tax (AIT - 3%):",
  "ছবি ও PDF (AI OCR)": "Image & PDF (AI OCR)",
  "জিপিএ-৫.০০ (GPA 5)": "GPA 5.00",
  "হোয়াটসঅ্যাপ বার্তা": "WhatsApp messages",
  "ইউনিয়ন/পৌরসভা ভেদে": "By Union/Municipality",
  "১০০% নিরাপদ ক্লাউড": "100% secure cloud",
  "সাধারণ (Non-Quota)": "General (Non-Quota)",
  "লগইন / প্রবেশ করুন": "Login / Enter",
  "হোয়াটসঅ্যাপ চ্যাট": "WhatsApp chat",
  "মন্তব্য ও সময়সীমা": "Comments and deadlines",
  "মোট নম্বর (TOTAL)": "Total Marks (TOTAL)",
  "অবিবাহিত (Single)": "Single",
  "অভিভাবক / Care of": "Guardian / Care of",
  "পরীক্ষার ফি আলাদা": "Exam fee is different",
  "৩০০ x ৩০০ পিক্সেল": "300 x 300 pixels",
  "হিন্দু (Hinduism)": "Hinduism",
  "🔥 স্মার্ট উইজার্ড": "🔥 Smart Wizard",
  "\"AI দিয়ে কনভার্ট\"": "\"Convert with AI\"",
  "বাটনে ক্লিক করুন।": "Click the button.",
  "শিক্ষার্থীর নাম :": "Student Name:",
  "ক্ষুদ্র নৃ-গোষ্ঠী": "Minorities",
  "মেধা স্থান (RANK)": "Merit Rank (RANK)",
  "বিবাহিত (Married)": "Married",
  "ফলাফল স্ট্যাটাস :": "Result Status:",
  "তারিখ: ৩১/১২/২০২৫": "Date: 31/12/2025",
  "মোবাইল বা ইমেইল *": "Mobile or Email *",
  "ইনপুট প্রদান করুন": "Provide input",
  "সর্বাধিক জনপ্রিয়": "most popular",
  "উত্তীর্ণ (Passed)": "Passed",
  "দলিল মূল্য (টাকা)": "Deed Value (Rs.)",
  "ফাইল সংরক্ষণ করুন": "Save the file",
  "প্রসেসিং চলছে...": "Processing in progress...",
  "এ ক্লিক করে শুধু": "Just click on",
  "৩. সমীকরণ ও বিজয়": "3. Equation and victory",
  "HSC রেজিস্ট্রেশন": "HSC Registration",
  "SSC রেজিস্ট্রেশন": "SSC Registration",
  "বিনামূল্যে (০ ৳)": "Free (0 ৳)",
  "16 pt (বড় হেডিং)": "16 pt (large heading)",
  "৩০০ x ৮০ পিক্সেল": "300 x 80 pixels",
  "ফয়জার কনভার্টার": "Foyer converter",
  "বৌদ্ধ (Buddhism)": "Buddhism",
  "ব্যবহারকারীর নাম": "Username",
  "অফলাইন প্রসেসিং": "Offline processing",
  "৪,০২৫ / ৫,৭৫০ ৳": "4,025 / 5,750 ৳",
  "১. ফাইল পার্সিং": "1. File parsing",
  "০ শব্দ | ০ বর্ণ": "0 words 0 characters",
  "ধর্ম (Religion)": "Religion",
  "জেলা (District)": "District",
  "উপস্থিতি: নিয়মিত": "Attendance: Regular",
  "\"ফয়জার অটো-ফিল\"": "\"Foyzer Auto-Fill\"",
  "জমির ধরণ অনুযায়ী": "According to the type of land",
  "অর্ডার / সহায়তা": "Order / Support",
  "১-ক্লিক ডাউনলোড": "1-click download",
  "অফিসিয়াল ইমেইল:": "Official Email:",
  "ওয়ার্ড ডকুমেন্ট": "Word document",
  "অন্য ফাইল বাছুন": "Choose another file",
  "প্রয়োজন অনুযায়ী": "as needed",
  "ডিজিটাল সত্যায়ন": "Digital authentication",
  "বর্গফুট (Sq Ft)": "Square Feet (Sq Ft)",
  "সহজ কার্যপদ্ধতি": "Simple procedure",
  "শিক্ষার্থীর নাম": "Student Name",
  "টেক্সট কপি করুন": "Copy the text",
  "শনাক্তকৃত ফাইল:": "Identified files:",
  "ছবি (৩০০ x ৩০০)": "Image (300 x 300)",
  "বৈবাহিক অবস্থা": "marital status",
  "ভূমি উন্নয়ন কর": "Land development tax",
  "ফয়জার কনভার্টার": "Foyer converter",
  "বোর্ড ফি আলাদা": "Board fee is different",
  "মোট পরীক্ষার্থী": "Total candidates",
  "স্বাক্ষরের মাপ:": "Signature Size:",
  "সকল নোটিশ দেখুন": "View all notices",
  "সরাসরি কল করুন": "Call directly",
  "চালান/টেলিটক ফি": "Challan/Teletalk Fees",
  "SutonnyMJ ফন্ট": "SutonnyMJ font",
  "ছবি ও লেমিনেশন": "Image and lamination",
  "সমীকরণ ও ম্যাথ": "Equations and Math",
  "দোকানের ঠিকানা": "Shop Address",
  "লিঙ্গ (Gender)": "Gender",
  "এক্সটেনশন গাইড": "Extension Guide",
  "টগলটি অন করুন।": "Turn the toggle on.",
  "মোবাইল নম্বর *": "Mobile Number *",
  "স্বত্বাধিকারী:": "Proprietor:",
  "বয়স হিসাব করুন": "Calculate the age",
  "ফি হিসাব করুন": "Calculate the fee",
  "৫২০ ৳ (ডাক ফি)": "520 ৳ (postage fee)",
  "শাখা / বিভাগ :": "Branch/Department:",
  "স্ক্যান ও মেইল": "Scan and mail",
  "৬ টি কাগজপত্র": "6 documents",
  "শতক / ডেসিমেল": "Cent / Decimal",
  "কাজের সময়সূচী": "work schedule",
  "সকল সার্কুলার": "All circulars",
  "উপজেলা / থানা": "Upazila / Thana",
  "ইসলাম (Islam)": "Islam",
  "মহিলা (Female)": "Female",
  "SSC GPA ও সাল": "SSC GPA & Year",
  "১৬১২২ (16122)": "16122 (16122)",
  "শ্রেণি ও শাখা": "Class and branch",
  "পরীক্ষা ও সাল": "Examination and year",
  "'ফলাফল দেখুন'": "'View Results'",
  "দোকানে সরাসরি": "Direct to the store",
  "এডমিন প্যানেল": "Admin panel",
  "কার্ড প্রিন্ট": "Card print",
  "টুলস কন্ট্রোল": "Tools Control",
  "মোড নির্বাচন:": "Mode selection:",
  "৫০০ ৳ (চালান)": "500 ৳ (Invoice)",
  "HSC GPA ও সাল": "HSC GPA & Year",
  "ডিরেকশন নিন ↗": "Take direction ↗",
  "রোল টাইপ করুন": "Type the roll",
  "ডাউনলোড (EXE)": "Download (EXE)",
  "সরকারি চালান": "Government challan",
  "জন্ম তারিখ :": "Date of Birth :",
  "নতুন একাউন্ট": "New account",
  "কোটা (Quota)": "Quota",
  "সরাসরি ফাইল (": "direct file (",
  "খতিয়ান/পর্চা": "Khatian/Paper",
  "স্মার্ট টুলস": "Smart Tools",
  "WhatsApp করুন": "WhatsApp",
  "পুরুষ (Male)": "male",
  "Wide (১.২৫\")": "Wide (1.25\")",
  "অনলাইন আবেদন": "Online application",
  "নির্বাচন করে": "by selecting",
  "লোড হচ্ছে...": "Loading...",
  "কাঠা (Katha)": "Katha",
  "মতামত পাঠান": "Send feedback",
  "কনভার্ট করুন": "convert",
  "ছবি প্রিন্ট": "Print the picture",
  "লাইভ AI সচল": "Live AI Active",
  "লাইভ টেক্সট": "Live text",
  "ফাইল কনভার্ট": "Convert files",
  "১০০% নিরাপদ": "100% safe",
  "টুলবক্স মেনু": "Toolbox menu",
  "পেজের সাইজ:": "Page Size:",
  "দৈনিক আপডেট": "Daily updates",
  "সিলেক্ট করে": "By selecting",
  "পিতার নাম :": "Father's Name:",
  "মাতার নাম :": "Mother's Name:",
  "শিট প্রিন্ট": "Sheet print",
  "রোল নম্বর :": "Roll Number :",
  "প্রযোজ্য নয়": "Not applicable",
  "আপনার নাম *": "your name *",
  "প্রাপ্ত GPA": "Earned GPA",
  "সুপারফাস্ট": "Superfast",
  "২৩০ - ৩৪৫ ৳": "230 - 345 ৳",
  "লেটার গ্রেড": "Letter grade",
  "২০০ - ৩০০ ৳": "200 - 300 Tk",
  "এলাকার ধরণ": "type of area",
  "রিসাইজ করুন": "Resize",
  "১৫০ - ২০০ ৳": "150 - 200 Tk",
  "১০০ - ১৫০ ৳": "100 - 150 Tk",
  "৩০০ - ৫০০ ৳": "300 - 500 ৳",
  "ফন্ট সাইজ:": "Font Size:",
  "লাইভ নোটিশ": "Live notice",
  "মেধা স্থান": "merit place",
  "পোস্ট অফিস": "post office",
  "যেকোনো সময়": "any time",
  "প্রতিষ্ঠান": "Institution",
  "জব পোর্টাল": "Job portal",
  "আইডি কার্ড": "ID card",
  "একর (Acre)": "Acre",
  "গোপন পিন *": "secret pin *",
  "৫০ - ১০০ ৳": "50 - 100 Tk",
  "দলিলের ধরণ": "Type of document",
  "ছবি পাঠান": "send picture",
  "শুক্রবার:": "Friday:",
  "মোট নম্বর": "Total no",
  "সরকারি ফি": "Government fees",
  "ক্যাটাগরি": "category",
  "ব্রাউজারে": "in the browser",
  "ভূমিসেবা:": "Land Service:",
  "আলাদা পেজ": "separate page",
  "স্ক্যানিং": "scanning",
  "বন্ধ করুন": "turn off",
  "কম্পিউটার": "Computer",
  "ছবির মাপ:": "Image Size:",
  "সেবা ১/১৯": "Service 1/19",
  "৫৮৯ / ৬০০": "589 / 600",
  "পোস্ট কোড": "Post Code",
  "লিঙ্ক কপি": "Copy the link",
  "স্ট্যাটাস": "Status",
  "উপরে বামে": "top left",
  "SSC বোর্ড": "SSC Board",
  "HSC বোর্ড": "HSC Board",
  "অফিসিয়াল": "official",
  "সেভ করুন": "save",
  "যাচাইকৃত": "verified",
  "অন্যান্য": "other",
  "লেমিনেশন": "Lamination",
  "১০০% ফ্রি": "100% free",
  "১৫,০০০ ৳": "15,000 Tk",
  "মার্জিন:": "Margin:",
  "ওপেন করে": "By opening",
  "কালপুরুষ": "Old Man",
  "প্রিন্ট": "Print",
  "৪৩,১৫০ ৳": "43,150 Tk",
  "ঠিক আছে": "ok",
  "যোগাযোগ": "communication",
  "ঠিকানা:": "Address:",
  "৭,৫০০ ৳": "7,500 Tk",
  "ইউনিকোড": "Unicode",
  "৫,০০০ ৳": "5,000 Tk",
  "HSC রোল": "HSC Roll",
  "১৫ / ১৫": "15 / 15",
  "SSC রোল": "SSC Roll",
  "দোকান ফি": "Shop Fees",
  "অদল-বদল": "Swap",
  "শ্রেণি :": "Category:",
  "পরামর্শ": "advice",
  "নামজারি": "Namjari",
  "মোবাইল:": "Mobile:",
  "ধাপ ২:": "Step 2:",
  "সরাসরি": "directly",
  "অ্যাকশন": "action",
  "সক্রিয়": "active",
  "ধাপ ৩:": "Step 3:",
  "ফটোকপি": "Photocopy",
  "শ্রেণি": "class",
  "কম্পোজ": "Compose",
  "সবগুলো": "all of them",
  "ফয়জার": "Faizar",
  "দাখিলা": "filing",
  "১৫০ ৳": "150 ৳",
  "সাধারণ": "general",
  "অর্ডার": "order",
  "ধাপ ১:": "Step 1:",
  "পর্চা": "paper",
  "নম্বর": "No",
  "৮০-১০০": "80-100",
  "১০০ ৳": "100 ৳",
  "৫০-৫৯": "50-59",
  "লগআউট": "Logout",
  "পাঠান": "send",
  "বাতিল": "canceled",
  "২০০ ৳": "200 ৳",
  "গ্রেড": "Grade",
  "০০-৩২": "00-32",
  "ই-টিন": "E-tin",
  "আবেদন": "application",
  "টিপস:": "Tips:",
  "৪০ ৳": "40 ৳",
  "ফন্ট:": "font:",
  "৪০-৪৯": "40-49",
  "৩৩-৩৯": "33-39",
  "৬০-৬৯": "60-69",
  "৫০ ৳": "50 ৳",
  "নিকশ": "Nikash",
  "৭০-৭৯": "70-79",
  "২০ ৳": "20 ৳",
  "জিডি": "gd",
  "গাইড": "Guide",
  "৮০ ৳": "80 ৳",
  "অথবা": "or",
  "ক্র:": "Q:",
  "নকশা": "design",
  "৬০ ৳": "60 ৳",
  "৪৫ ৳": "45 ৳",
  "৩৫ ৳": "35 ৳",
  "৩০ ৳": "30 ৳",
  "১৫ ৳": "15 ৳",
  "০ KB": "0 KB",
  "লিখে": "by writing",
  "১০ ৳": "10 ৳",
  "বিজয়": "victory",
  "লগইন": "Login",
  "৫৮৯": "589",
  "৫ ৳": "5 ৳",
  "২ ৳": "2 ৳",
  "১/৩": "1/3",
  "৬০০": "600",
  "০টি": "0 items",
  "২৪৭": "247",
  "অটো": "Auto",
  "৪৫%": "45%",
  "৩ ৳": "3 ৳",
  "রোল": "roll",
  "৩২": "32",
  "১৪": "14",
  "০১": "01",
  "১৯": "19",
  "২৩": "23",
  "১ম": "1st",
  "৩৩": "33",
  "২৬": "26",
  "৩৭": "37",
  "৩৪": "34",
  "২০": "20",
  "৩০": "30",
  "২৮": "28",
  "০৭": "07",
  "২২": "22",
  "২৪": "24",
  "০৫": "05",
  "০৬": "06",
  "২৭": "27",
  "০৯": "09",
  "২১": "21",
  "১০": "10",
  "১৭": "17",
  "১৬": "16",
  "১১": "11",
  "৩৫": "35",
  "১৮": "18",
  "১২": "12",
  "২৫": "25",
  "৩১": "31",
  "০৩": "03",
  "২৯": "29",
  "বা": "or",
  "১৩": "13",
  "০২": "02",
  "১৫": "15",
  "০৮": "08",
  "৩৬": "36",
  "০৪": "04",
  "৬": "6",
  "ও": "and",
  "১": "1",
  "৫": "5",
  "২": "2",
  "৪": "4",
  "৩": "3",
  "০": "0",
  "৭": "7",
  "৮": "8",
  "৯": "9",
  "২/৩": "2/3",
  "৩/৩": "3/3",
  "১/১৯": "1/19",
  "ফি:": "Fee:",
  "সময়:": "Time:",
  "দিন": "Days",
  "ঘণ্টা": "Hours",
  "মিনিট": "Minutes",
  "সেকেন্ড": "Seconds",
  "টাকা": "BDT",
  "৳": "৳",
  "২য়": "2nd",
  "৩য়": "3rd",
  "৪র্থ": "4th",
  "লাইভ API সচল": "Live API Active",
  "🏫 ড্রিমল্যান্ড রেসিডেন্সিয়াল মডেল স্কুল": "🏫 Dreamland Residential Model School",
  "🕌 আমডুঙ্গীহাট ঈমান উদ্দিন চৌধুরী আলিম মাদ্রাসা": "🕌 Amdungihat Iman Uddin Chowdhury Alim Madrasah",
  "-- শ্রেণি ও শাখা নির্বাচন করুন --": "-- Select Class & Section --",
  "১৫টি সক্রিয় সার্কুলার": "15 Active Circulars",
  "ব্যাংক / সরকারি": "Bank / Govt",
  "💼 ব্যাংক / সরকারি": "💼 Bank / Govt",
  "হট নোটিশ": "Hot Notice",
  "শেষ:": "Deadline:",
  "7 দিন বাকি": "7 days left",
  "দিন বাকি": "days left",
  "সহকারী পরিচালক (এক্স-ক্যাডার আইন)": "Assistant Director (Ex-Cadre Law)",
  "আবেদন লিংক": "Apply Link",
  "১/১০": "1/10",
  "২/১০": "2/10",
  "৩/১০": "3/10",
  "৪/১০": "4/10",
  "৫/১০": "5/10",
  "৬/১০": "6/10",
  "৭/১০": "7/10",
  "৮/১০": "8/10",
  "৯/১০": "9/10",
  "১০/১০": "10/10",
  "বাংলাদেশ ব্যাংক (Bangladesh Bank)": "Bangladesh Bank",
  "আবেদনের শেষ তারিখ:": "Application Deadline:",
  "পদসংখ্যা:": "Vacancies:",
  "শিক্ষাগত যোগ্যতা:": "Educational Qualification:",
  "অনলাইন আবেদন করুন": "Apply Online",
  "সার্কুলার PDF": "Circular PDF",
  "সার্কুলার বিস্তারিত": "Circular Details",
  "বিস্তারিত দেখুন": "View Details",
  "সকল নোটিশ": "All Notices",
  "সকল সেবা": "All services",
  "প্রবেশপত্র": "Admission",
  "টেলিটক ও অন্যান্য": "Teletalk and others",
  "৭ - ১৫ কর্মদিবস (পুলিশ ভেরিফিকেশন সাপেক্ষে)": "7 - 15 working days (subject to police verification)",
  "শনাক্তকৃত অফিস ফাইল:": "Identified Office files:",
  "আবেদনকারীর সচল জাতীয় পরিচয়পত্র (NID) নম্বর": "Active National Identity Card (NID) number of the applicant",
  "></span> বিরতি (সেবা কার্ডে মাউস)": "></span> break (mouse on service card)",
  "ছবি/ডকুমেন্ট স্ক্যান": "Image/Document Scan",
  "ব্যাংক চাকরি": "bank job",
  "চলমান আবেদন": "Ongoing application",
  "${downloadedFileName} ডাউনলোড সম্পন্ন হয়েছে!": "${downloadedFileName} download completed!",
  "৭ - ১০ কর্মদিবস": "7 - 10 working days",
  "শনাক্তকৃত স্ক্যান/ছবি:": "Identified Scans/Photos:",
  "সরকারি ম্যাপ ফি ও পোস্টাল চার্জ (৫২০৳+)": "Government map fee and postal charges (520৳+)",
  "প্রাথমিক ও গণশিক্ষা অধিদপ্তর (DPE)": "Department of Primary and Mass Education (DPE)",
  "বিজ্ঞপ্তি দেখুন": "See notification",
  "সরকারি ফি: ২২০ ৳": "Government Fee: 220 ৳",
  "প্রতি পেজ ২০ - ৫০ ৳": "20 - 50 ৳ per page",
  "টেক্সট সফলভাবে ক্লিপবোর্ডে কপি হয়েছে!": "Text has been successfully copied to the clipboard!",
  "ডিগ্রি (পাস) ৩য় বর্ষ পরীক্ষার প্রবেশপত্র (Admit Card) বিতরণ": "Distribution of Admit Card for Degree (Pass) 3rd Year Exam",
  "সিভির ক্ষেত্রে শিক্ষাগত তথ্য ও ব্যক্তিগত বিবরণ": "Educational information and personal details in case of CV",
  "রেজিস্টার্ড ডাক্তার কর্তৃক প্রদত্ত মেডিকেল সার্টিফিকেট": "Medical certificate issued by a registered doctor",
  "স্কুল": "school",
  "নির্ধারিত ফি": "prescribed fee",
  "ডিগ্রি ১ম বর্ষ পরীক্ষার ফরম পূরণ বিজ্ঞপ্তি": "Degree 1st Year Examination Form Filling Notice",
  "DocxHandler ইঞ্জিন লোড হয়নি": "DocxHandler engine not loaded",
  "আসসালামু আলাইকুম, আমি অনলাইন সার্ভিস নিতে চাচ্ছি।\\n\\nনাম: ${name}\\nমোবাইল: ${phone}\\nপ্রয়োজনীয় সেবা: ${service}\\nবিবরণ: ${notes}": "Assalamu Alaikum, I want to take online service.\\n\\nName: ${name}\\nMobile: ${phone}\\nRequired service: ${service}\\nDescription: ${notes}",
  "https://wa.me/8801717101919?text=আসসালামু%20আলাইকুম,%20আমি%20${encodeURIComponent(n.title)}%20বিজ্ঞপ্তির%20আবেদন%20করতে%20চাচ্ছি。": "https://wa.me/8801717101919?text=Assalamu%20alaikum,%20I%20want%20to%20apply%20${encodeURIComponent(n.title)}%20notification.",
  "১৫০ - ৩০০ ৳": "150 - 300 ৳",
  "আবেদনকারীর নাম, এনআইডি নম্বর ও মোবাইল নম্বর": "Applicant Name, NID Number and Mobile Number",
  "স্কুল, কলেজ, মাদ্রাসা ও যেকোনো প্রতিষ্ঠানের উন্নত মানের ডিজিটাল পিভিসি আইডি কার্ড, প্রিমিয়াম প্রিন্টেড ফিতা (Lanyard) ও কার্ড হোল্ডার তৈরি।": "High Quality Digital PVC ID Card, Premium Printed Ribbon (Lanyard) and Card Holder for School, College, Madrasah and any organization.",
  ">কোনো চেকলিস্ট তথ্য পাওয়া যায়নি।</div>": ">No checklist information found.</div>",
  "শুনানি ও তদন্ত সাপেক্ষে": "Subject to hearing and investigation",
  "অনার্স পার্ট-২ পরীক্ষা ফরম পূরণ সংক্রান্ত বিজ্ঞপ্তি": "Honors Part-II Exam Form Filling Notice",
  "নির্ধারিত": "prescribed",
  "চলমান সেশন": "ongoing session",
  "পিতা ও মাতার মূল জাতীয় পরিচয়পত্রের কপি": "Copy of original national identity card of father and mother",
  "অধিদপ্তর": "Department of",
  "৩০০ x ৮০ পিক্সেল (সর্বোচ্চ ৬০ KB)": "300 x 80 pixels (max 60 KB)",
  "তাৎক্ষণিক (৫-১০ মিনিট)": "Immediate (5-10 minutes)",
  "বিদেশ গমনার্থী সেবা": "Foreign Tourist Services",
  "এনবিআর ই-ট্যাক্স": "NBR e-tax",
  "এইচএসসি / এসএসসি / স্নাতক পাস পদ অনুযায়ী": "HSC / SSC / Graduate pass as per rank",
  "></i> মতামত পাঠান": "></i> Send feedback",
  "স্টুডিও ও প্রিন্টিং": "Studio and Printing",
  "জাতীয় পরিচয়পত্র ও কোটা সনদ (প্রযোজ্য হলে)": "National Identity Card and Quota Certificate (if applicable)",
  "প্রাথমিক আবেদন ফি: ৩৫০ ৳": "Initial application fee: 350 ৳",
  "আয়কর স্ল্যাব অনুযায়ী অথবা জিরো ট্যাক্স": "As per income tax slab or zero tax",
  "সরকারি দপ্তর/প্রতিষ্ঠান": "Government Offices/Institutions",
  "আবেদনকারীর জাতীয় পরিচয়পত্র (NID) নম্বর ও জন্ম তারিখ": "Applicant's National Identity Card (NID) number and date of birth",
  "ভর্তি": "admission",
  "৩০০ x ৩০০ পিক্সেল (সর্বোচ্চ ১০০ KB)": "300 x 300 pixels (max 100 KB)",
  "মালিকের জাতীয় পরিচয়পত্র ও পাসপোর্ট সাইজ ছবি": "National identity card and passport size photograph of the owner",
  "সঠিক তথ্যের স্বপক্ষে দালিলিক প্রমাণাদি": "Documentary evidence in support of correct information",
  "হাতে লেখা খসড়া বা মূল কাগজের নমুনা": "Sample of handwritten draft or original paper",
  "৪,০০০+ জন": "4,000+ people",
  "১৫০ - ২৫০ ৳": "150 - 250 ৳",
  "পিডিএফ নথি (PDF Document)": "PDF Document",
  ">AI প্রসেসিং শুরু হচ্ছে...</span>": ">Starting AI processing...</span>",
  "প্রিন্ট চার্জ প্রযোজ্য": "Print charges apply",
  "${toBanglaNumber(srcWords)} শব্দ | ${toBanglaNumber(srcVal.length)} বর্ণ": "${toBanglaNumber(srcWords)} words | ${toBanglaNumber(srcVal.length)} characters",
  "এনবিআর ট্যাক্স সেবা": "NBR Tax Services",
  "আবেদন সচল": "Application is active",
  "দ্রুত অনলাইন ডেলিভারি": "Fast online delivery",
  "জাতীয় পরিচয়পত্র ও আবেদনকারীর ছবি": "National identity card and photograph of the applicant",
  "বেসরকারি": "private",
  "টেলিটক অলজবস / DPE": "Teletalk All Jobs / DPE",
  "চলমান কার্যক্রম": "ongoing activities",
  "বাংলাদেশ রেলওয়ে সহকারী স্টেশন মাস্টার ও পয়েন্টসম্যান নিয়োগ": "Bangladesh Railway Assistant Station Master and Pointsman Recruitment",
  "বিসিএস, প্রাথমিক শিক্ষক, সরকারি-বেসরকারি চাকরি এবং জাতীয় ও পাবলিক বিশ্ববিদ্যালয়ে ভর্তি আবেদন।": "BCS, Elementary Teacher, Govt-Private Jobs and National and Public University Admission Applications.",
  "১০৮৫ জন": "1085 people",
  "০ টি সেবা": "0 services",
  "নির্বাচন কমিশন সেবা": "Election Commission Services",
  "></i>${toBanglaNumber(stats.words || stats.totalWords)} শব্দ</span>": "></i>${toBanglaNumber(stats.words || stats.totalWords)} words</span>",
  "AI রূপান্তর সম্পন্ন করা যায়নি:": "AI conversion could not be completed:",
  "ব্যবসার নাম ও ঠিকানা (ব্যবসায়িক টিন এর ক্ষেত্রে)": "Business name and address (in case of business tin)",
  "ডিগ্রি ১ম বর্ষ শিক্ষাবর্ষের শিক্ষার্থী": "Degree 1st year student",
  "bpdb.teletalk.com.bd পোর্টালে বিভিন্ন পদে অনলাইন আবেদন ও ফি জমা।": "Online application and fee submission for various posts at bpdb.teletalk.com.bd portal.",
  "যেকোনো বিষয়ে স্নাতক/সমমান (ন্যূনতম ২য় বিভাগ/সিজিপিএ ২.২৫)": "Graduation/Equivalent in any subject (Minimum 2nd Division/CGPA 2.25)",
  "ভুল খতিয়ান বা দলিলের কপি": "Wrong certificate or copy of document",
  "জাতীয় পরিচয়পত্র ও ইউটিলিটি বিলের কপি": "Copy of National Identity Card and Utility Bill",
  "স্থানীয় ইউনিয়ন পরিষদ/পৌরসভার চেয়ারম্যান প্রদত্ত চারিত্রিক সনদ": "Character certificate issued by Chairman of Local Union Parishad/Municipality",
  "মৌজার নাম ও জে.এল (JL) নম্বর": "Mauza's Name and JL Number",
  "বিভাগ, জেলা, উপজেলা ও সংশ্লিষ্ট মৌজার নাম / JL নম্বর": "Name of Division, District, Upazila and concerned Mauza / JL No",
  "></span> দোকান এখন বন্ধ (সকাল ১০টায় খুলবে)": "></span> Shop now closed (opens at 10am)",
  "ভোটার হওয়ার সময় প্রদত্ত সঠিক জন্ম তারিখ": "Correct date of birth given at the time of becoming a voter",
  "></i> পাঠানো হয়েছে": "></i> Sent",
  "></i> <span>রূপান্তর ও ডাউনলোড হচ্ছে...</span></div>": "></i> <span>Converting and downloading...</span></div>",
  "এসএসসি ও এইচএসসি উত্তীর্ণ (ফুলবাড়ী সরকারি কলেজ সহ সকল কলেজ)": "Passed SSC & HSC (all colleges including Phulbari Govt. College)",
  ".pptx স্লাইড কনভার্ট ও ডাউনলোড": "Convert and download .pptx slides",
  "বিজ্ঞপ্তি অনুযায়ী নির্দিষ্ট অ্যাপ্লিকেশন ফি": "Specific application fee as per notification",
  "কনভার্ট করা টেক্সট কপি হয়েছে!": "The converted text has been copied!",
  "নির্বাচন কমিশনের অনুমোদন সাপেক্ষে": "Subject to the approval of the Election Commission",
  "></i> আপনার বয়স সাধারণ চাকরির নির্ধারিত সীমা অতিক্রম করেছে বা অপ্রাপ্তবয়স্ক।</div>": "></i> You are above the prescribed age limit for general employment or minor.</div>",
  "ব্যাংক স্টেটমেন্ট ও বেতন বিবরণী (যদি থাকে)": "Bank Statement and Salary Statement (if any)",
  "erecruitment.bb.org.bd পোর্টালে বাংলাদেশ ব্যাংকের মাধ্যমে আবেদন।": "Apply through Bangladesh Bank at erecruitment.bb.org.bd portal.",
  "তাৎক্ষণিক (অনলাইন পেমেন্ট সাপেক্ষে)": "Instant (subject to online payment)",
  "></i> পাঠানো হচ্ছে...": "></i> Sending...",
  "জমির ধরণ ও শতক অনুযায়ী সরকারি নির্ধারিত ফি": "Fees fixed by the government according to the type and age of the land",
  "ওয়ার্ড ৯৭-২০০৩ ডকুমেন্ট (.doc)": "Word 97-2003 Document (.doc)",
  "কোর্ট ফি ও নির্ধারিত সরকারি চালানের কপি": "Copy of court fee and prescribed government challan",
  "লার্নার তাৎক্ষণিক ডাউনলোড": "Learner Instant Download",
  "জরুরি আবেদন": "Urgent application",
  "অনার্স": "honors",
  "ফুলবাড়ী সরকারি কলেজ, দিনাজপুর": "Phulbari Government College, Dinajpur",
  "কলেজ ও বিশ্ববিদ্যালয় নির্ধারিত ফি": "College and University prescribed fees",
  "২৮ কর্মদিবস (সাধারণত)": "28 working days (usually)",
  "আধুনিক ওয়ার্ড (.docx - বিজয়)": "Modern Word (.docx - Victory)",
  "সমন্বিত ১০ ব্যাংক ও আর্থিক প্রতিষ্ঠানে সিনিয়র অফিসার নিয়োগ": "Appointment of senior officers in integrated 10 banks and financial institutions",
  "স্থাবর ও অস্থাবর সম্পত্তির বিবরণ ও সঞ্চয়পত্র/ডিপিএস তথ্য": "Details of immovable and immovable property and savings certificate/DPS information",
  "অনলাইন কপি: ৫০৳ | সার্টিফাইড হার্ডকপি: ১০০৳ + ডাক মাশুল": "Online copy: ৳50 Certified hard copy: 100 ৳ + postage",
  "আইনি ও ভূমিসেবা": "Legal and land services",
  "খতিয়ান নম্বর অথবা দাগ নম্বর অথবা মালিকের নাম": "Khatian number or dag number or name of owner",
  "টেলিটক অলজবস / BPDB": "Teletalk AllJobs / BPDB",
  "৫ বছর (৪৮ পাতা): ৪,০২৫৳ | ১০ বছর: ৫,৭৫০৳ (সাধারণ ডেলিভারি)": "5 years (48 pages): 4,025 ৳ 10 years: ₹5,750 (normal delivery)",
  "তাৎক্ষণিক": "immediate",
  "ডিজিটাল স্টুডিও": "Digital Studio",
  "লার্নার ও স্মার্ট কার্ড": "Learner and Smart Card",
  "কলেজ": "college",
  "জাতীয় পরিচয়পত্র (NID) বা অনলাইন জন্ম নিবন্ধন": "National Identity Card (NID) or Online Birth Registration",
  "ইন-শপ সার্ভিস": "In-shop service",
  "এডমিট কার্ড": "Admit Card",
  "সরকারি ফি: ১১২ - ২২৩ ৳": "Government Fee: 112 - 223 ৳",
  "পাওয়ারপয়েন্ট স্লাইড (.pptx)": "PowerPoint slides (.pptx)",
  "বাংলাদেশ রেলওয়ে (BR)": "Bangladesh Railway (BR)",
  "পাসপোর্টের ১ম পাতার সত্যায়িত ফটোকপি (মেয়াদ অন্তত ৩ মাস থাকতে হবে)": "Attested photocopy of 1st page of passport (must be valid for at least 3 months)",
  "ব্যাচ ${i + 1}": "batch ${i + 1}",
  "ডিজিটাল অনলাইন জন্ম নিবন্ধন সনদ": "Digital Online Birth Registration Certificate",
  "></span> অটো-রোটেশন সচল (প্রতি ৩ সে.)": "></span> Auto-rotation enabled (every 3 sec.)",
  "আবেদন চলছে": "Application is in progress",
  "তাৎক্ষণিক একনলেজমেন্ট রসিদ": "Immediate Acknowledgment Receipt",
  "অনলাইন কপি সাথে সাথে | সার্টিফাইড কপি ৫-৭ দিন": "Online copy immediately Certified copy 5-7 days",
  "বিবাহিত হলে নিকাহনামা/ম্যারেজ সার্টিফিকেট (প্রযোজ্য ক্ষেত্রে)": "Nikahnama/Marriage Certificate if married (if applicable)",
  "কপি করার মতো কোনো টেক্সট নেই": "There is no text to copy",
  "চাকুরির সার্কুলার": "Job circular",
  "নোটিশের শিরোনাম / পদের নাম": "Title of Notice / Name of Post",
  "বস্ত্র অধিদপ্তর (DOT) বিভিন্ন পদে নিয়োগ বিজ্ঞপ্তি": "Department of Textiles (DOT) recruitment notification for various posts",
  "নতুন হোল্ডিং এন্ট্রি, বার্ষিক ভূমি উন্নয়ন কর অনলাইন পেমেন্ট ও তাৎক্ষণিক ডিজিটাল রসিদ সংগ্রহ।": "New holding entry, annual land development tax online payment and instant digital receipt collection.",
  "প্রবেশপত্র সচল": "Admit card active",
  "বিভিন্ন সরকারি ও বিশ্ববিদ্যালয়ের পোর্টাল": "Various government and university portals",
  "সরকারি ফি: ৩০০ - ৫০০ ৳": "Government Fee: 300 - 500 ৳",
  "প্রযোজ্য ক্ষেত্রে সরকারি ফি": "Government fees as applicable",
  "সকল নিয়মিত/অনিয়মিত পরীক্ষার্থী": "All Regular/Irregular Candidates",
  "যে ডকুমেন্ট বা পিডিএফ প্রিন্ট করতে চান": "The document or PDF you want to print",
  "অনলাইন ও ডাক ডেলিভারি": "Online and postal delivery",
  "পূর্বে পরিশোধিত সর্বশেষ খাজনার দাখিলা কপি (যদি থাকে)": "Copy of latest rent paid earlier (if any)",
  "অনলাইন ফরম পূরণ তাৎক্ষণিক": "Online form filling is instant",
  "ডাকযোগে হোম ডেলিভারি": "Home delivery by post",
  "আবেদনকারীর সঠিক ডাক ঠিকানা ও সচল মোবাইল নম্বর": "Correct postal address and active mobile number of the applicant",
  ">বর্তমানে কোনো স্কুল বা কলেজের নোটিশ নেই।</div>": ">Currently there are no school or college notices.</div>",
  "ফাইলটি সরাসরি ব্রাউজারে সেভ হয়েছে। প্রয়োজনে অন্য ফরম্যাটেও রূপান্তর করতে পারেন।": "The file is saved directly in the browser. You can also convert to other formats if necessary.",
  "স্নাতক / ডিপ্লোমা / এইচএসসি / এসএসসি পাস": "Graduation / Diploma / HSC / SSC Pass",
  "></i>${toBanglaNumber(stats.slides)} স্লাইড</span>": "></i>${toBanglaNumber(stats.slides)} slides</span>",
  "ব্রাউজারের ডাউনলোড অপশনে আপনার রূপান্তরিত ${selectedAiTargetFormat ===": "In the download option of the browser you convert ${selectedAiTargetFormat ===",
  "বাংলাদেশ পুলিশ ট্রেইনি রিক্রুট কনস্টেবল (TRC) নিয়োগ": "Bangladesh Police Trainee Recruit Constable (TRC) Recruitment",
  "হাই-স্পিড ডিজিটাল ফটোকপি, অফসেট পেপারে নিখুঁত সাদাকালো ও লেজার কালার প্রিন্টিং।": "High-speed digital photocopying, perfect black and white and laser color printing on offset paper.",
  "জাতীয় পরিচয়পত্রে নাম, জন্ম তারিখ, পিতা-মাতার নাম ও ঠিকানা সংক্রান্ত ভুল সংশোধন আবেদন।": "Application for correction of errors in name, date of birth, name of parents and address in National Identity Card.",
  "১ - ৩ কর্মদিবস": "1 - 3 working days",
  "(${org}) নোটিশ সম্পর্কে অনলাইন আবেদন/ফরম পূরণের সেবা নিতে চাচ্ছি।": "(${org}) would like to avail online application/form filling service regarding notice.",
  "পরীক্ষা": "test",
  "বিদ্যুৎ খাত চাকরি": "Power sector jobs",
  "সেবাটি নিতে আগ্রহী। প্রয়োজনীয় কাগজপত্র ও ফি সম্পর্কে বিস্তারিত জানতে চাচ্ছি।": "Interested in taking the service. I would like to know the details about the necessary documents and fees.",
  "জনপ্রিয় সেবা": "Popular services",
  "৩৫০+ জন": "350+ people",
  "৪২ জন (০৫টি ক্যাটাগরি)": "42 people (05 categories)",
  "DocBinaryEngine লোড হয়নি": "DocBinaryEngine not loaded",
  "৫০-১০০৳": "50-100",
  "ভর্তি ও নোটিশ": "Admission and notice",
  "নিবন্ধনকৃত মোবাইল নম্বর (ফেস ভেরিফিকেশন বা OTP এর জন্য)": "Registered Mobile Number (for Face Verification or OTP)",
  "বাংলাদেশ বিদ্যুৎ উন্নয়ন বোর্ড (BPDB) নিয়োগ বিজ্ঞপ্তি": "Bangladesh Power Development Board (BPDB) Recruitment Circular",
  "সরকারি চাকরি": "Government job",
  "সাইজ: ${targetW} x ${targetH} পিক্সেল | টেলিটক কমপ্লায়েন্ট": "Size: ${targetW} x ${targetH} pixels | Teletalk Compliant",
  ".xlsx এক্সেল ফাইল কনভার্ট ও ডাউনলোড": "Convert and download .xlsx excel files",
  "জাতীয় পরিচয়পত্র, সার্টিফিকেট, পাসপোর্ট, ব্যাংকের চেক বা মূল্যবান নথি হারানো সংক্রান্ত থানা জিডি।": "Police GD regarding loss of national identity card, certificate, passport, bank check or valuable document.",
  "একটি সচল মোবাইল নম্বর (এসএমএস ভেরিফিকেশনের জন্য)": "An active mobile number (for SMS verification)",
  "${modeLabel} এ সফলভাবে রূপান্তর হয়েছে": "Successful conversion to ${modeLabel}",
  "XlsxHandler লোড হয়নি": "XlsxHandler not loaded",
  "১০ - ১৫ মিনিট": "10 - 15 minutes",
  "} ফাইলটি সেভ হয়েছে": "} The file is saved",
  "দ্রুত ডেলিভারি": "Fast delivery",
  "CS, SA, RS, BS ও সিটি জরিপের খতিয়ান অনুসন্ধান, অনলাইন কপি ও জেলা রেকর্ডরুমের মূল পর্চা আবেদন।": "CS, SA, RS, BS & City Survey Certificate Search, Online Copy & District Record Room Original Paper Application.",
  "https://wa.me/8801717101919?text=আসসালামু%20আলাইকুম,%20আমি%20${encodeURIComponent(s.title)}%20সেবাটি%20নিতে%20চাচ্ছি。": "https://wa.me/8801717101919?text=Assalamu%20alaikum,%20I%20want%20to%20${encodeURIComponent(s.title)}%20service.",
  "সরকারি নির্ধারিত ফি": "Government prescribed fees",
  "০৬ সেপ্টেম্বর ২০২৬": "06 September 2026",
  "বোর্ড": "board",
  "১০০ - ২০০ ৳": "100 - 200 Tk",
  "মাইক্রোসফট এক্সেল শিট (.xlsx)": "Microsoft Excel Sheet (.xlsx)",
  "গণিত ও প্রশ্নপত্র ওয়ার্ড ফাইল (.docx)": "Maths and Question Paper Word File (.docx)",
  "০ ৳ (সরকারি কোনো ফি নেই)": "0 ৳ (No government fee)",
  "বিস্তারিত তথ্যের জন্য ক্লিক করুন।": "Click for detailed information.",
  "চাকরি বিজ্ঞপ্তি": "Job Notification",
  "ফাইলটি বিশ্লেষণ করতে সমস্যা হয়েছে:": "There was a problem parsing the file:",
  "ফুলবাড়ী সরকারি কলেজের ডিগ্রি ১ম বর্ষের অনলাইন ফরম পূরণ ও ফি জমাদান সংক্রান্ত বিজ্ঞপ্তি।": "Phulbari Government College Degree 1st Year Online Form Filling and Fee Submission Notification.",
  "ছবি বা সরাসরি দোকানে ছবি তোলার সুবিধা": "Facility to take pictures or directly in store",
  "></span> বিরতি (মাউস রাখা হয়েছে)": "></span> break (mouse held)",
  "আবেদনকারীর নিজস্ব নামে বায়োমেট্রিক নিবন্ধিত সিম নম্বর": "Biometric registered SIM number in applicant's own name",
  "dotr.teletalk.com.bd পোর্টালে অনলাইন আবেদন চলছে। বয়স ১৮-৩০ বছর।": "Online application is going on at dotr.teletalk.com.bd portal. Age 18-30 years.",
  "ভর্তি ও পরীক্ষা": "Admission and Examination",
  "৬০ - ১১০ ৳ (প্রতি পিস - ফিতা ও মান অনুযায়ী)": "60 - 110 ৳ (per piece - according to ribbon and quality)",
  "সঠিক জন্ম ও নির্ধারিত তারিখ প্রদান করুন!": "Please provide correct birth and due date!",
  "অনার্স ২য় বর্ষ নিয়মিত ও মানোন্নয়ন পরীক্ষার্থী": "Honors 2nd Year Regular and Standard Examination Candidates",
  "></span> দোকান খোলা আছে (রাত ৯টা পর্যন্ত)": "></span> Shop open (till 9pm)",
  "আসসালামু আলাইকুম, আমি": "Assalamu Alaikum, I am",
  "হারিয়ে যাওয়া ডকুমেন্টের নম্বর বা স্পষ্ট বিবরণ": "Number or clear description of missing document",
  "বাংলাদেশ ব্যাংক ব্যাংকার্স সিলেকশন কমিটি (BSCK)": "Bangladesh Bank Bankers Selection Committee (BSCK)",
  "বিশ্ববিদ্যালয়": "university",
  "ব্যবসা সেবা": "Business services",
  "৫ মিনিটে ডেলিভারি": "Delivery in 5 minutes",
  "ফটোস্ট্যাট ও প্রিন্ট": "Photostats and Prints",
  "ইউনিয়ন পরিষদ বা পৌরসভা আওতাধীন ব্যবসার বৈধ ই-ট্রেড লাইসেন্স আবেদন ও রিনিউ ফি জমা।": "Valid e-trade license application and renewal fee of business under Union Parishad or Municipality.",
  "app1.nu.edu.bd পোর্টালে কলেজ ও বিষয় পছন্দক্রম দিয়ে অনলাইন আবেদন ও ফি জমা।": "Online application and fee submission by selecting college and subject at app1.nu.edu.bd portal.",
  "শিক্ষার্থীর নাম, শ্রেণি, রোল, রক্তের গ্রুপ ও পিতা-মাতার নাম": "Student's name, class, roll, blood group and parent's name",
  "></i>${toBanglaNumber(stats.cells)} সেল</span>": "></i>${toBanglaNumber(stats.cells)} cells</span>",
  "অনলাইনে ট্রেইনি রিক্রুট কনস্টেবল (TRC) পদে আবেদন ও শারীরিক যোগ্যতার ফর্ম পূরণ।": "Online Trainee Recruit Constable (TRC) Application & Physical Qualification Form Filling.",
  "চাকরি সার্কুলার": "Job circular",
  "></i>গণিত সমীকরণ অক্ষুণ্ণ</span>": "></i>Mathematical equation intact</span>",
  "${toBanglaNumber(tgtWords)} শব্দ | ${toBanglaNumber(tgtVal.length)} বর্ণ": "${toBanglaNumber(tgtWords)} words | ${toBanglaNumber(tgtVal.length)} characters",
  "ভোটার নিবন্ধন ফরম নম্বর / স্লিপ নম্বর অথবা NID নম্বর": "Voter Registration Form Number / Slip Number or NID Number",
  "বিশ্ববিদ্যালয় ভর্তি": "University admission",
  "ভর্তি ফরম চলছে": "Admission form is running",
  "প্রতিরক্ষা চাকরি": "Defense Jobs",
  "স্কুল-কলেজ নোটিশ": "School-College Notice",
  "সরাসরি আবেদন লিংক": "Direct Application Link",
  "পয়েন্টসম্যান, খালাসি, সহকারী স্টেশন মাস্টার পদে অনলাইনে আবেদন চলছে।": "Online application is going on for the posts of Pointsman, Khalasi, Assistant Station Master.",
  "ফরম পূরণ সম্পন্নকারী শিক্ষার্থী": "Students completing the form",
  "ব্যবসার মূলধন ও ইউনিয়ন পরিষদ/পৌরসভা নির্ধারিত ফি": "Business Capital and Union Parishad/Municipality prescribed fees",
  "সরকারি প্রাথমিক সহকারী শিক্ষক নিয়োগ ও আবেদন": "Government Primary Assistant Teacher Recruitment and Application",
  "ফি দেখুন": "See Fees",
  "জমির হাল খতিয়ান / নামজারি পর্চার কপি": "Copy of Land Hal Khatian / Namjari Parcha",
  "বাংলাদেশ পুলিশ হেডকোয়ার্টার্স": "Bangladesh Police Headquarters",
  "জরুরি সরকারি সেবা": "Essential government services",
  "২০০ - ৫০০ ৳": "200 - 500 Tk",
  ">সেবাসমূহ</div>": ">Services</div>",
  "খতিয়ানে নামের ভুল, দাগ নম্বর বা হিস্যা ভুল সংক্রান্ত সহকারী কমিশনার (ভূমি) বরাবর মিস কেস আবেদন।": "Missed case application to Assistant Commissioner (Land) regarding wrong name, mark number or hisya in Khatian.",
  "টেলিটকের মাধ্যমে dpe.teletalk.com.bd পোর্টালে রংপুর ও রাজশাহী সহ সকল বিভাগে আবেদন।": "Apply through teletalk portal dpe.teletalk.com.bd to all departments including Rangpur and Rajshahi.",
  "ফরম্যাট সমর্থিত নয়: ${firstFile.name}\\n(শুধুমাত্র .docx, .doc, .xlsx, .xls, .pptx, .ppt, PDF অথবা ছবি সমর্থিত)": "Format not supported: ${firstFile.name}\\n(only .docx, .doc, .xlsx, .xls, .pptx, .ppt, PDF or image supported)",
  "ফরম পূরণ": "Fill the form",
  "পুরাতন পাসপোর্ট (রিনিউ করার ক্ষেত্রে)": "Old passport (in case of renewal)",
  "মালিকের সচল জাতীয় পরিচয়পত্র (NID) নম্বর": "Active National Identity Card (NID) number of the owner",
  "ফি: ২০০ ৳": "Fee: 200 ৳",
  "></span> ক্যাটাগরি: ${catNames[selectedCat] || selectedCat} (অটো-পরিবর্তন)": "></span> category: ${catNames[selectedCat] || selectedCat} (auto-replace)",
  "উল্লেখিত": "mentioned",
  "শিক্ষার্থী বা কর্মকর্তা/কর্মচারীর পাসপোর্ট সাইজ স্পষ্ট ছবি": "Passport size clear photograph of student or officer/employee",
  "প্রতিষ্ঠানের নাম, লোগো ও প্রধানের স্বাক্ষর": "Name of the organization, logo and signature of the head",
  "৫০০ ৳ (চালান কোড অনুযায়ী ব্যাংক ট্রেজারি বা সোনালী সেবা)": "500 ৳ (bank treasury or gold service according to the invoice code)",
  "বাংলাদেশ বিদ্যুৎ উন্নয়ন বোর্ড (BPDB)": "Bangladesh Power Development Board (BPDB)",
  "কম্পিউটার কম্পোজ": "Computer Compose",
  "নোটিশ ব্যাচ ${i + 1}": "notice batch ${i + 1}",
  "টিন সার্টিফিকেট (প্রযোজ্য ক্ষেত্রে)": "Tin Certificate (if applicable)",
  "সচল মোবাইল নম্বর (ওটিপি যাচাইয়ের জন্য)": "Active Mobile Number (for OTP Verification)",
  "ক্যাটাগরি অনুযায়ী ২৩০ ৳ থেকে ৩৪৫ ৳ (বিকাশ/রকেটে প্রদেয়)": "230 ৳ to 345 ৳ category wise (payable at development/rocket)",
  "ব্যবসা, সঞ্চয়পত্র ক্রয়, ব্যাংক লোন বা ট্রেড লাইসেন্সের জন্য নতুন ১২ ডিজিটের ই-টিন সার্টিফিকেট তাৎক্ষণিক গ্রহণ।": "Instant receipt of new 12 digit e-TIN certificate for business, purchase of savings bonds, bank loan or trade license.",
  "৩,৫০০+ জন": "3,500+ people",
  "ডিজিটাল সেবা": "Digital services",
  "টেক্সট প্রিভিউ লুকান": "Hide text preview",
  "শিক্ষাগত যোগ্যতার সনদ (ন্যূনতম ৮ম শ্রেণি)": "Educational Qualification Certificate (Minimum 8th Class)",
  "স্কুল-কলেজ সংক্রান্ত নোটিশ": "Notice regarding schools and colleges",
  "অনার্স ২য় বর্ষের সকল শিক্ষার্থী": "All Honors 2nd year students",
  "বিভাগ অনুযায়ী নির্ধারিত ফি": "Fees as per department",
  "ওটিপি (OTP) যাচাইয়ের জন্য সচল মোবাইল নম্বর": "Active mobile number for OTP verification",
  "বিএসসি ইঞ্জিনিয়ারিং / ডিপ্লোমা / স্নাতক / এইচএসসি": "B.Sc Engineering / Diploma / Graduate / HSC",
  "জাতীয় বিশ্ববিদ্যালয়ের অনার্স ২য় বর্ষ পরীক্ষার অনলাইন ফরম পূরণ ও ইনকোর্স নম্বর নিশ্চিতকরণ।": "National University Honors 2nd Year Exam Online Form Filling and Incourse Mark Confirmation.",
  "বিআরটিএ সার্ভিস পোর্টালে লার্নার ড্রাইভিং লাইসেন্স আবেদন, মেডিকেল ফি ও পরীক্ষা স্লট বুকিং।": "Learner Driving License Application, Medical Fee and Exam Slot Booking on BRTA Service Portal.",
  "বাংলাদেশ রেলওয়ে": "Bangladesh Railway",
  "রূপান্তর ব্যর্থ হয়েছে:": "Conversion failed:",
  "জাতীয় বিশ্ববিদ্যালয় / ফুলবাড়ী সরকারি কলেজ": "National University / Phulbari Government College",
  "নতুন ভোটারদের স্লিপ নম্বর বা হারিয়ে যাওয়া NID এর অনলাইন কপি ডাউনলোড ও প্লাস্টিক কার্ড প্রিন্ট।": "Online copy download and plastic card print of slip number or lost NID of new voters.",
  "সকল শিক্ষাগত যোগ্যতার রোল, রেজিস্ট্রেশন নম্বর ও জিপিএ": "All educational qualification roll, registration number and GPA",
  "সেবা ${toBanglaNumber(start + 1)}-${toBanglaNumber(end)} / ${toBanglaNumber(filtered.length)}": "Service ${toBanglaNumber(start + 1)}-${toBanglaNumber(end)} / ${toBanglaNumber(filtered.length)}",
  "বিবাহিত হলে কাবিননামা ও স্বামীর NID কপি": "Copy of cabin certificate and husband's NID if married",
  "সকল আসন": "All seats",
  "বস্ত্র ও পাট মন্ত্রণালয় / বস্ত্র অধিদপ্তর (DOT)": "Ministry of Textiles and Jute / Directorate of Textiles (DOT)",
  "চলমান বিজ্ঞপ্তি": "Ongoing Notifications",
  "জাতীয় বিশ্ববিদ্যালয়": "National University",
  "ডিজিটাল খাজনা দাখিলা": "Digital tax filing",
  "ব্যাংক": "Bank",
  "সেবা ${toBanglaNumber(currentChecklistIdx + 1)}/${toBanglaNumber(list.length)}": "Service ${toBanglaNumber(currentChecklistIdx + 1)}/${toBanglaNumber(list.length)}",
  "যেকোনো মৌজার মূল সিট বা নকশার জন্য ভূমি রেকর্ড ও জরিপ অধিদপ্তরে সরাসরি অনলাইন আবেদন।": "Direct online application to Directorate of Land Records and Surveys for original sit or design of any Mauza.",
  "কলেজ ফরম ফিলাপ": "College Form Philap",
  "ওয়ার্ড ডকুমেন্ট (.docx)": "Word Document (.docx)",
  "চলমান": "ongoing",
  "></span> অটো-রোটেশন সচল": "></span> Auto-rotation is enabled",
  ")} ৳": ")} ৳",
  "৪৮ ও ৬৪ পাতার ৫ বা ১০ বছর মেয়াদি নতুন ই-পাসপোর্ট আবেদন, তথ্য এন্ট্রি ও চালান পেমেন্ট।": "48 and 64 page 5 or 10 year new e-passport application, data entry and challan payment.",
  "https://wa.me/8801717101919?text=আসসালামু%20আলাইকুম,%20আমি%20${encodeURIComponent(n.title)}%20এর%20জন্য%20অনলাইন%20আবেদন%20করতে%20চাচ্ছি。": "https://wa.me/8801717101919?text=Assalamu%20alaikum,%20I%20want%20to%20apply%20online%20for%20${encodeURIComponent(n.title)}%20.",
  "এসএসসি / সমমান পাস (ন্যূনতম জিপিএ ২.৫)": "SSC / Equivalent Pass (Minimum GPA 2.5)",
  "প্রথম আলো চাকরি": "Prothom Alo Job",
  "${daysRemaining} দিন বাকি": "${daysRemaining} days remaining",
  "ডিগ্রি ৩য় বর্ষ পরীক্ষার্থী": "Degree 3rd Year Candidates",
  "></span> ফিল্টার সিলেক্টেড: ${catNames[cat] || cat}": "></span> filter selected: ${catNames[cat] || cat}",
  "সর্বাধিক জনপ্রিয় ভূমিসেবা": "Most popular land service",
  "স্নাতকোত্তর / ৪ বছর মেয়াদি স্নাতক": "Post Graduate / 4 years Degree",
  "ফুলবাড়ী সরকারি কলেজ": "Phulbari Government College",
  "সরকারি ফি: ১২০ ৳": "Government Fee: 120 ৳",
  "লার্নার ফি: ৫১৮৳ (১ ক্যাটাগরি) / ৭৪৮৳ (২ ক্যাটাগরি)": "Learner Fee: 518 ৳ (1 Category) / 748 ৳ (2 Category)",
  "এসএসসি/সমমানের শিক্ষাগত যোগ্যতার মূল সার্টিফিকেট": "Original Certificate of SSC/Equivalent Educational Qualification",
  "প্রতি পৃষ্ঠা স্বল্পমূল্যে": "Low cost per page",
  "PptxHandler লোড হয়নি": "PptxHandler not loaded",
  "></i>${toBanglaNumber(stats.paragraphs || stats.totalParagraphs)} প্যারাগ্রাফ</span>": "></i>${toBanglaNumber(stats.paragraphs || stats.totalParagraphs)} paragraphs</span>",
  "জাতীয় বিশ্ববিদ্যালয় অনার্স ও ডিগ্রি ১ম বর্ষ ভর্তি": "National University Honors and Degree 1st year admission",
  "পেশাগত সনদের কপি (সরকারি/বেসরকারি চাকুরিজীবী বা ছাত্র হলে)": "Copy of professional certificate (if government/private employee or student)",
  "পরীক্ষা শুরুর পূর্ব পর্যন্ত": "Before the start of the exam",
  "></i> সরকারি চাকরির সাধারণ বয়সসীমা (১৮–৩২ বছর) অনুযায়ী আপনি আবেদনের যোগ্য।</div>": "></i> You are eligible to apply as per the general age limit (18-32 years) for government jobs.</div>",
  "${toBanglaNumber(scan.totalFiles)}টি ফাইল নির্বাচিত (${scan.file.name} ইত্যাদি)": "${toBanglaNumber(scan.totalFiles)} files selected (${scan.file.name} etc.)",
  "পাসপোর্ট সাইজ ছবি ও স্বাক্ষরের স্পষ্ট কপি (৩০০x৩০০ ও ৩০০x৮০ পিক্সেল)": "Clear copy of passport size photograph and signature (300x300 and 300x80 pixels)",
  "></i> সফলভাবে গৃহীত হয়েছে": "></i> Accepted successfully",
  "সিট নম্বর (Sheet Number)": "Sheet Number",
  "৯২২ জন": "922 people",
  "ডিগ্রি": "degree",
  "চলতি মাসের শেষ তারিখ": "Last date of current month",
  "সরকারি প্রতিষ্ঠান": "Government institutions",
  "১ - ৩ কর্মদিবস (পরিমাণ সাপেক্ষে)": "1 - 3 working days (subject to quantity)",
  "কলেজ নোটিশ": "College Notice",
  "১০ - ২০ মিনিট": "10 - 20 minutes",
  "৫ - ১০ মিনিট": "5 - 10 minutes",
  "আবেদনপত্র, দরখাস্ত, সিভি (Curriculum Vitae), স্ট্যাম্প চুক্তিপত্র ও প্রশ্ন নির্ভুলভাবে কম্পোজ।": "Compose applications, applications, CVs (Curriculum Vitae), stamp contracts and queries accurately.",
  "এনবিআর এর অনলাইন পোর্টালে বার্ষিক আয়কর ই-রিটার্ন দাখিল, ট্যাক্স হিসাব এবং তাৎক্ষণিক অফিসিয়াল একনলেজমেন্ট প্রাপ্তি।": "Annual income tax e-return filing, tax calculation and instant official acknowledgment on NBR's online portal.",
  "সাইজ ও কপি অনুযায়ী নির্ধারিত": "Determined according to size and copy",
  "দোকান ভাড়ার চুক্তিপত্র বা নিজস্ব জায়গার খাজনা দাখিলা": "Filing of shop lease agreement or rent of own premises",
  "সরকারি বিজ্ঞপ্তি": "Government Notification",
  "০/০": "0/0",
  "বিজ্ঞপ্তি অনুযায়ী": "As per notification",
  "সরকারি ফি নেই": "No government fees",
  "কলেজ অফিস থেকে প্রবেশপত্র সংগ্রহ ও অনলাইনে এডমিট কার্ড ডাউনলোড সেবা।": "Collection of admit card from college office and online admit card download service.",
  "বর্তমান ঠিকানার ইউটিলিটি বিলের কপি (প্রয়োজনে)": "Copy of utility bill of current address (if required)",
  "ওয়ার্ড ২০০৩ (.doc - সুতন্নিএমজে বিজয়)": "Word 2003 (.doc - Suttannimj Vijay)",
  "ফরম ফিলাপ চলছে": "Form filling is in progress",
  "তাৎক্ষণিক জিডি সেবা": "Instant GD service",
  "পাসপোর্ট সাইজ, স্ট্যাম্প সাইজ ও থ্রি-আর/ফোর-আর ছবি প্রিন্ট এবং ডকুমেন্টস হার্ড লেমিনেটিং।": "Passport size, stamp size and 3-R/4-R photo print and hard laminating of documents.",
  "সরকারি ফি নেই (ফ্রি)": "No Government Fee (Free)",
  ">চলমান নোটিশ</div>": ">Continuing Notice</div>",
  "মূল এনআইডি (NID) অথবা অনলাইন জন্ম নিবন্ধন (১৭ ডিজিট)": "Original NID or Online Birth Registration (17 digits)",
  "১২ ডিজিটের ই-টিন (e-TIN) নম্বর": "12 digit e-TIN (e-TIN) number",
  "বিদেশ যাত্রা বা চাকরির প্রয়োজনে পুলিশ ক্লিয়ারেন্স সার্টিফিকেট এর নির্ভুল অনলাইন আবেদন ও চালান জমা।": "Accurate online application and challan submission of Police Clearance Certificate for overseas travel or employment.",
  "৫. আমার আপলোড করা ফাইল বা তথ্যের নিরাপত্তা কেমন?": "৫. আমার আপলোড করা ফাইল বা তথ্যের নিরাপত্তা কেমন?",
  "জিরো-হ্যালুসিনেশন ও অডিট": "জিরো-হ্যালুসিনেশন ও অডিট",
  "ফাইল প্রসেস করা হচ্ছে": "ফাইল প্রসেস করা হচ্ছে",
  "নিচের বাটনে ক্লিক করে সরাসরি কনভার্ট শুরু করুন (কনভার্ট শেষে ৩টি ওয়ার্ড ফরম্যাটেই ডাউনলোড করতে পারবেন)": "নিচের বাটনে ক্লিক করে সরাসরি কনভার্ট শুরু করুন (কনভার্ট শেষে ৩টি ওয়ার্ড ফরম্যাটেই ডাউনলোড করতে পারবেন)",
  "# কম্পিউটার দোকান প্রিন্ট কনভার্টার": "# কম্পিউটার দোকান প্রিন্ট কনভার্টার",
  "আমাদের কনভার্টার ও সেবা সম্পর্কে আপনার মূল্যবান পরামর্শ, মন্তব্য বা অভিজ্ঞতা জানান": "আমাদের কনভার্টার ও সেবা সম্পর্কে আপনার মূল্যবান পরামর্শ, মন্তব্য বা অভিজ্ঞতা জানান",
  "ডাউনলোড পেজ ও মার্জিন কন্ট্রোল": "ডাউনলোড পেজ ও মার্জিন কন্ট্রোল",
  "১. কোন কোন ফাইল ফয়জার কনভার্টারে রূপান্তর করা যায়?": "১. কোন কোন ফাইল ফয়জার কনভার্টারে রূপান্তর করা যায়?",
  "\"AI দিয়ে সরাসরি কনভার্ট শুরু করুন\"": "\"AI দিয়ে সরাসরি কনভার্ট শুরু করুন\"",
  "আপলোড শুরু হচ্ছে...": "আপলোড শুরু হচ্ছে...",
  "৫. বহুনির্বাচনী প্রশ্নে অপশন-ভিত্তিক একক ট্যাব:": "৫. বহুনির্বাচনী প্রশ্নে অপশন-ভিত্তিক একক ট্যাব:",
  "আপনি প্রশ্নপত্র বা ডকুমেন্টের ছবি (JPG, PNG, WEBP), পিডিএফ (PDF), মাইক্রোসফট ওয়ার্ড (.DOCX ও .DOC), এক্সেল (.XLSX) এবং পাওয়ারপয়েন্ট (.PPTX) ফাইল আপলোড করতে পারেন। এছাড়াও লাইভ টেক্সট বক্সে যেকোনো বাংলা লেখা সরাসরি পেস্ট করে কনভার্ট করা যায়।": "আপনি প্রশ্নপত্র বা ডকুমেন্টের ছবি (JPG, PNG, WEBP), পিডিএফ (PDF), মাইক্রোসফট ওয়ার্ড (.DOCX ও .DOC), এক্সেল (.XLSX) এবং পাওয়ারপয়েন্ট (.PPTX) ফাইল আপলোড করতে পারেন। এছাড়াও লাইভ টেক্সট বক্সে যেকোনো বাংলা লেখা সরাসরি পেস্ট করে কনভার্ট করা যায়।",
  "# বাংলা টাইপিং কনভার্টার অনলাইন": "# বাংলা টাইপিং কনভার্টার অনলাইন",
  "বিস্তারিত বিবরণ ও FAQ": "বিস্তারিত বিবরণ ও FAQ",
  "AI ওসিআর রূপান্তর:": "AI ওসিআর রূপান্তর:",
  "৪. নিখুঁত গণিত ও ল্যাটেক্স সমীকরণ (LaTeX & Equations):": "৪. নিখুঁত গণিত ও ল্যাটেক্স সমীকরণ (LaTeX & Equations):",
  "পিডিএফ ফাইল (PDF Documents):": "পিডিএফ ফাইল (PDF Documents):",
  "\"ওয়ার্ড ২০০৩ (.DOC)\"": "\"ওয়ার্ড ২০০৩ (.DOC)\"",
  "AI দিয়ে সরাসরি কনভার্ট শুরু করুন": "AI দিয়ে সরাসরি কনভার্ট শুরু করুন",
  "ফাইল ডাউনলোড ছাড়াও রূপান্তরিত টেক্সট ১-ক্লিকে কপি করে যেকোনো সফটওয়্যার বা চ্যাটবক্সে তাৎক্ষণিক পেস্ট করার সুবিধা।": "ফাইল ডাউনলোড ছাড়াও রূপান্তরিত টেক্সট ১-ক্লিকে কপি করে যেকোনো সফটওয়্যার বা চ্যাটবক্সে তাৎক্ষণিক পেস্ট করার সুবিধা।",
  "# Excel ও PowerPoint বাংলা কনভার্টার": "# Excel ও PowerPoint বাংলা কনভার্টার",
  "ওয়ার্ড ২০০৩ (.DOC)": "ওয়ার্ড ২০০৩ (.DOC)",
  "# বহুনির্বাচনী MCQ প্রশ্ন কনভার্টার": "# বহুনির্বাচনী MCQ প্রশ্ন কনভার্টার",
  "ফয়জার কনভার্টার এর বিস্তারিত বিবরণ ও সক্ষমতা": "ফয়জার কনভার্টার এর বিস্তারিত বিবরণ ও সক্ষমতা",
  "Gemini 3.6 Flash (২ নম্বর দ্রুততম ব্যালেন্সড সংস্করণ)": "Gemini 3.6 Flash (২ নম্বর দ্রুততম ব্যালেন্সড সংস্করণ)",
  "০%": "০%",
  "আল্ট্রা-পাওয়ার্ড ইঞ্জিন": "আল্ট্রা-পাওয়ার্ড ইঞ্জিন",
  "# বাংলা যুক্তবর্ণ ফিক্সার": "# বাংলা যুক্তবর্ণ ফিক্সার",
  "লেটেস্ট মাইক্রোসফট ওয়ার্ড (২০১৩, ২০১৬, ২০১৯, ২০২১, ৩৬৫) উপযোগী SutonnyMJ বিজয় ফাইল। এডিটিং ও কাস্টম স্টাইলিংয়ের জন্য উপযুক্ত।": "লেটেস্ট মাইক্রোসফট ওয়ার্ড (২০১৩, ২০১৬, ২০১৯, ২০২১, ৩৬৫) উপযোগী SutonnyMJ বিজয় ফাইল। এডিটিং ও কাস্টম স্টাইলিংয়ের জন্য উপযুক্ত।",
  "শতভাগ নিরাপদ ও সুরক্ষিত! সাধারণ টেক্সট, ওয়ার্ড, এক্সেল ও পাওয়ারপয়েন্ট ফাইল সম্পূর্ণ আপনার নিজস্ব ব্রাউজারে অফলাইনে প্রসেস হয়। কোনো ডেটা আমাদের লোকাল বা রিমোট ডাটাবেজে সংরক্ষণ করা হয় না।": "শতভাগ নিরাপদ ও সুরক্ষিত! সাধারণ টেক্সট, ওয়ার্ড, এক্সেল ও পাওয়ারপয়েন্ট ফাইল সম্পূর্ণ আপনার নিজস্ব ব্রাউজারে অফলাইনে প্রসেস হয়। কোনো ডেটা আমাদের লোকাল বা রিমোট ডাটাবেজে সংরক্ষণ করা হয় না।",
  "# প্রিন্ট-রেডি ওয়ার্ড ডকুমেন্ট": "# প্রিন্ট-রেডি ওয়ার্ড ডকুমেন্ট",
  "একক বা বহু-পাতার (Multi-page) স্ক্যান করা বা টাইপ করা যেকোনো PDF ফাইলকে সরাসরি সম্পাদনাযোগ্য মাইক্রোসফট ওয়ার্ড ফাইলে রূপান্তর।": "একক বা বহু-পাতার (Multi-page) স্ক্যান করা বা টাইপ করা যেকোনো PDF ফাইলকে সরাসরি সম্পাদনাযোগ্য মাইক্রোসফট ওয়ার্ড ফাইলে রূপান্তর।",
  "প্রেজেন্টেশনের সকল টেক্সট বক্স, শেপ ও মূল স্লাইড ডিজাইন অক্ষত রেখে এক ক্লিকে বাংলা ফন্ট রূপান্তর।": "প্রেজেন্টেশনের সকল টেক্সট বক্স, শেপ ও মূল স্লাইড ডিজাইন অক্ষত রেখে এক ক্লিকে বাংলা ফন্ট রূপান্তর।",
  "# Word 2003 .doc কনভার্টার": "# Word 2003 .doc কনভার্টার",
  "প্রশ্নপত্রের ছবি বা PDF ড্রপজোনে আপলোড করে সরাসরি": "প্রশ্নপত্রের ছবি বা PDF ড্রপজোনে আপলোড করে সরাসরি",
  "ওয়েবসাইটে সরাসরি যেকোনো ইউনিকোড বা সুতন্নিএমজে বিজয় লেখা পেস্ট করে রিয়েলটাইমে স্বয়ংক্রিয় রূপান্তর ও সরাসরি ক্লিপবোর্ড কপি।": "ওয়েবসাইটে সরাসরি যেকোনো ইউনিকোড বা সুতন্নিএমজে বিজয় লেখা পেস্ট করে রিয়েলটাইমে স্বয়ংক্রিয় রূপান্তর ও সরাসরি ক্লিপবোর্ড কপি।",
  "# নিখুঁত সুতন্নিএমজে কনভার্টার": "# নিখুঁত সুতন্নিএমজে কনভার্টার",
  "যেসব আউটপুট ফরম্যাট পাওয়া যায় (Available Outputs):": "যেসব আউটপুট ফরম্যাট পাওয়া যায় (Available Outputs):",
  "JPG, JPEG, PNG, WEBP, BMP — প্রশ্নপত্র, অফিশিয়াল দলিল, হ্যান্ডরিটেন নোট বা বইয়ের পাতার ছবি থেকে সরাসরি বাংলা লেখা ও গাণিতিক সমীকরণ নিখুঁতভাবে রূপান্তর।": "JPG, JPEG, PNG, WEBP, BMP — প্রশ্নপত্র, অফিশিয়াল দলিল, হ্যান্ডরিটেন নোট বা বইয়ের পাতার ছবি থেকে সরাসরি বাংলা লেখা ও গাণিতিক সমীকরণ নিখুঁতভাবে রূপান্তর।",
  "# অভ্র থেকে বিজয় ৫০": "# অভ্র থেকে বিজয় ৫০",
  "হ্যাঁ। ফয়জার ইঞ্জিনে বহুনির্বাচনী প্রশ্নের প্রতিটি অপশনের (ক, খ, গ, ঘ) মাঝে সুষম দূরত্ব বজায় রাখার জন্য স্বয়ংক্রিয়ভাবে ১টি স্ট্যান্ডার্ড ট্যাব যুক্ত করে দেওয়া হয়, যাতে ওয়ার্ডে নেওয়ার পর অপশনগুলো এলোমেলো না হয়ে একদম সোজা সারিবদ্ধ থাকে।": "হ্যাঁ। ফয়জার ইঞ্জিনে বহুনির্বাচনী প্রশ্নের প্রতিটি অপশনের (ক, খ, গ, ঘ) মাঝে সুষম দূরত্ব বজায় রাখার জন্য স্বয়ংক্রিয়ভাবে ১টি স্ট্যান্ডার্ড ট্যাব যুক্ত করে দেওয়া হয়, যাতে ওয়ার্ডে নেওয়ার পর অপশনগুলো এলোমেলো না হয়ে একদম সোজা সারিবদ্ধ থাকে।",
  "৬. সুতন্নিএমজে বিজয় ও ইউনিকোড ওয়ার্ডের মধ্যে পার্থক্য কী?": "৬. সুতন্নিএমজে বিজয় ও ইউনিকোড ওয়ার্ডের মধ্যে পার্থক্য কী?",
  "অটো-কনফিগারড": "অটো-কনফিগারড",
  "# ইউনিকোড টু বিজয় কনভার্টার": "# ইউনিকোড টু বিজয় কনভার্টার",
  "ডাউনলোড করার আগে সরাসরি রেজাল্ট কার্ড থেকে A4, Legal পেজ সাইজ ও Narrow, Normal মার্জিন সেট করা যায়।": "ডাউনলোড করার আগে সরাসরি রেজাল্ট কার্ড থেকে A4, Legal পেজ সাইজ ও Narrow, Normal মার্জিন সেট করা যায়।",
  "যেসব ফাইল কনভার্ট করা যায় (Supported Inputs):": "যেসব ফাইল কনভার্ট করা যায় (Supported Inputs):",
  "# ফয়জার কম্পিউটার ফুলবাড়ী দিনাজপুর": "# ফয়জার কম্পিউটার ফুলবাড়ী দিনাজপুর",
  "একদমই না! ফয়জার কনভার্টারে ইন্টিগ্রেটেড রয়েছে বিশেষায়িত ল্যাটেক্স ও ম্যাথ ইঞ্জিন। ভগ্নাংশ, রুট, স্কয়ার, ইন্টিগ্রাল এবং গ্রিক প্রতীকসমূহ বাংলা অক্ষরের সাথে গুলিয়ে না গিয়ে সম্পূর্ণ নির্ভুল গাণিতিক সমীকরণ আকারে সংরক্ষিত থাকে।": "একদমই না! ফয়জার কনভার্টারে ইন্টিগ্রেটেড রয়েছে বিশেষায়িত ল্যাটেক্স ও ম্যাথ ইঞ্জিন। ভগ্নাংশ, রুট, স্কয়ার, ইন্টিগ্রাল এবং গ্রিক প্রতীকসমূহ বাংলা অক্ষরের সাথে গুলিয়ে না গিয়ে সম্পূর্ণ নির্ভুল গাণিতিক সমীকরণ আকারে সংরক্ষিত থাকে।",
  "৪. বহুনির্বাচনী (MCQ) প্রশ্নের অপশনগুলোতে কি দূরত্ব ঠিক থাকে?": "৪. বহুনির্বাচনী (MCQ) প্রশ্নের অপশনগুলোতে কি দূরত্ব ঠিক থাকে?",
  "২. ছবি বা প্রশ্নপত্রের PDF থেকে সরাসরি Word 2003 (.doc) ফাইল কীভাবে পাওয়া যাবে?": "২. ছবি বা প্রশ্নপত্রের PDF থেকে সরাসরি Word 2003 (.doc) ফাইল কীভাবে পাওয়া যাবে?",
  "ডাউনলোডের পূর্বে পেজের সাইজ, মার্জিন বা ফন্ট সাইজ কাস্টমাইজ করতে পারেন": "ডাউনলোডের পূর্বে পেজের সাইজ, মার্জিন বা ফন্ট সাইজ কাস্টমাইজ করতে পারেন",
  "পাওয়ারপয়েন্ট স্লাইড (.PPTX, .PPT):": "পাওয়ারপয়েন্ট স্লাইড (.PPTX, .PPT):",
  "আধুনিক বিজয় (.DOCX)": "আধুনিক বিজয় (.DOCX)",
  "জনপ্রিয় সার্চ কিওয়ার্ড ও এসইও ট্যাগ (SEO Search Keywords)": "জনপ্রিয় সার্চ কিওয়ার্ড ও এসইও ট্যাগ (SEO Search Keywords)",
  "# হাতের লেখা বাংলা OCR": "# হাতের লেখা বাংলা OCR",
  "ভগ্নাংশ, সূচক, রুট, সমাকলন (Integral), ম্যাট্রিক্স ও জ্যামিতিক চিত্রসমূহ রূপান্তরের সময় বিকৃত না হয়ে স্বয়ংক্রিয়ভাবে উপযুক্ত সমীকরণ ফরম্যাটে সংরক্ষিত হয়।": "ভগ্নাংশ, সূচক, রুট, সমাকলন (Integral), ম্যাট্রিক্স ও জ্যামিতিক চিত্রসমূহ রূপান্তরের সময় বিকৃত না হয়ে স্বয়ংক্রিয়ভাবে উপযুক্ত সমীকরণ ফরম্যাটে সংরক্ষিত হয়।",
  "# ছবি থেকে বাংলা লেখা কনভার্ট": "# ছবি থেকে বাংলা লেখা কনভার্ট",
  "Gemini 3.7 Flash (৪ নম্বর হাইব্রিড ফ্ল্যাশ)": "Gemini 3.7 Flash (৪ নম্বর হাইব্রিড ফ্ল্যাশ)",
  "⚡ অটো মোড (১৬টি সক্রিয় কি-এর স্বয়ংক্রিয় রোটেশন + Gemini 3.5 & 3.8 Flash)": "⚡ অটো মোড (১৬টি সক্রিয় কি-এর স্বয়ংক্রিয় রোটেশন + Gemini 3.5 & 3.8 Flash)",
  "Gemini 3.5 Flash (১ নম্বর প্রধান ফ্ল্যাগশিপ — দ্রুততম, শতভাগ নির্ভুল বাংলা ও ম্যাথ)": "Gemini 3.5 Flash (১ নম্বর প্রধান ফ্ল্যাগশিপ — দ্রুততম, শতভাগ নির্ভুল বাংলা ও ম্যাথ)",
  "সরাসরি লাইভ টেক্সট (Text Area):": "সরাসরি লাইভ টেক্সট (Text Area):",
  "ছবি ও স্ক্যান কপি (Image OCR):": "ছবি ও স্ক্যান কপি (Image OCR):",
  "১০০% অফলাইন ও নিরাপদ": "১০০% অফলাইন ও নিরাপদ",
  "৬. তাৎক্ষণিক টেক্সট কপি ও প্রিভিউ:": "৬. তাৎক্ষণিক টেক্সট কপি ও প্রিভিউ:",
  "খাঁটি বাইনারি অফিস ২০০৩ কম্প্যাটিবল ফাইল। প্রেস প্রিন্টিং ও পুরনো কম্পিউটার সমূহে কোনো প্রকার ফন্ট মিসিং ছাড়াই সরাসরি ওপেন ও প্রিন্ট করা যায়।": "খাঁটি বাইনারি অফিস ২০০৩ কম্প্যাটিবল ফাইল। প্রেস প্রিন্টিং ও পুরনো কম্পিউটার সমূহে কোনো প্রকার ফন্ট মিসিং ছাড়াই সরাসরি ওপেন ও প্রিন্ট করা যায়।",
  "Gemini 2.5 Flash (৫ নম্বর হাই-স্পিড অফিশিয়াল ব্যাকআপ)": "Gemini 2.5 Flash (৫ নম্বর হাই-স্পিড অফিশিয়াল ব্যাকআপ)",
  "৩. ইউনিকোড ওয়ার্ড (.DOCX - Kalpurush/Nikosh):": "৩. ইউনিকোড ওয়ার্ড (.DOCX - Kalpurush/Nikosh):",
  "কোন কোন ফাইল কনভার্ট করা যায় এবং কী কী আউটপুট সুবিধা পাবেন তার পূর্ণাঙ্গ তালিকা": "কোন কোন ফাইল কনভার্ট করা যায় এবং কী কী আউটপুট সুবিধা পাবেন তার পূর্ণাঙ্গ তালিকা",
  "মাইক্রোসফট ওয়ার্ড ফাইল (.DOCX ও .DOC):": "মাইক্রোসফট ওয়ার্ড ফাইল (.DOCX ও .DOC):",
  "গুগল ও সার্চ ইঞ্জিনের জন্য ফয়জার কনভার্টারের প্রাসঙ্গিক কিওয়ার্ডসমূহ": "গুগল ও সার্চ ইঞ্জিনের জন্য ফয়জার কনভার্টারের প্রাসঙ্গিক কিওয়ার্ডসমূহ",
  "২. আধুনিক বিজয় (.DOCX - SutonnyMJ ফন্ট):": "২. আধুনিক বিজয় (.DOCX - SutonnyMJ ফন্ট):",
  "সুতন্নিএমজে (SutonnyMJ) হলো বাংলাদেশের ঐতিহ্যবাহী ও জনপ্রিয় প্রেস প্রিন্টিং ফন্ট যা পুরনো ও নতুন যেকোনো ভার্সনের অফিস সফটওয়্যারে নির্বিঘ্নে প্রিন্ট হয়। অপরদিকে ইউনিকোড (Nikosh/Kalpurush) হলো আধুনিক স্ট্যান্ডার্ড যা ওয়েবসাইট ও ডিজিটাল ডিভাইসে সর্বত্র প্রদর্শন উপযোগী।": "সুতন্নিএমজে (SutonnyMJ) হলো বাংলাদেশের ঐতিহ্যবাহী ও জনপ্রিয় প্রেস প্রিন্টিং ফন্ট যা পুরনো ও নতুন যেকোনো ভার্সনের অফিস সফটওয়্যারে নির্বিঘ্নে প্রিন্ট হয়। অপরদিকে ইউনিকোড (Nikosh/Kalpurush) হলো আধুনিক স্ট্যান্ডার্ড যা ওয়েবসাইট ও ডিজিটাল ডিভাইসে সর্বত্র প্রদর্শন উপযোগী।",
  "ডকুমেন্ট পেজ ও মার্জিন সেটাপ:": "ডকুমেন্ট পেজ ও মার্জিন সেটাপ:",
  "ফয়জার বাংলা কনভার্টার ও AI OCR": "ফয়জার বাংলা কনভার্টার ও AI OCR",
  "ফয়জার কনভার্টার | ইউনিকোড ⇄ বিজয় বাংলা কনভার্টার ও ল্যাটেক্স ওওসিআর": "ফয়জার কনভার্টার | ইউনিকোড ⇄ বিজয় বাংলা কনভার্টার ও ল্যাটেক্স ওওসিআর",
  "আধুনিক .docx ফাইল আপলোড করে এক ক্লিকে পুরনো Word 2003 .doc বাইনারি ফরম্যাটে ফন্ট কনভার্টসহ সেভ করার সরাসরি সুবিধা (প্রেস কম্পোজের জন্য আদর্শ)।": "আধুনিক .docx ফাইল আপলোড করে এক ক্লিকে পুরনো Word 2003 .doc বাইনারি ফরম্যাটে ফন্ট কনভার্টসহ সেভ করার সরাসরি সুবিধা (প্রেস কম্পোজের জন্য আদর্শ)।",
  "Gemini 3.8 Flash (৩ নম্বর হাতের লেখা ও জটিল ম্যাথ স্পেশালিস্ট — আধুনিক সংস্করণ)": "Gemini 3.8 Flash (৩ নম্বর হাতের লেখা ও জটিল ম্যাথ স্পেশালিস্ট — আধুনিক সংস্করণ)",
  "১. ওয়ার্ড ২০০৩ (.DOC - SutonnyMJ বিজয়):": "১. ওয়ার্ড ২০০৩ (.DOC - SutonnyMJ বিজয়):",
  "এক্সেল শিটের প্রতিটি টেবিল সেল, কলাম ও হেডার হুবহু অক্ষত রেখে সম্পূর্ণ বাংলা ফন্ট ইউনিকোড ⇄ বিজয় কনভার্সন।": "এক্সেল শিটের প্রতিটি টেবিল সেল, কলাম ও হেডার হুবহু অক্ষত রেখে সম্পূর্ণ বাংলা ফন্ট ইউনিকোড ⇄ বিজয় কনভার্সন।",
  "# Word 2007 থেকে Word 2003": "# Word 2007 থেকে Word 2003",
  "ফাইল আপলোড ও স্ক্যান হচ্ছে...": "ফাইল আপলোড ও স্ক্যান হচ্ছে...",
  "ইউনিকোড ওয়ার্ড (.DOCX)": "ইউনিকোড ওয়ার্ড (.DOCX)",
  "# গণিত সমীকরণ ল্যাটেক্স কনভার্টার": "# গণিত সমীকরণ ল্যাটেক্স কনভার্টার",
  "# বাংলা প্রশ্নপত্র OCR": "# বাংলা প্রশ্নপত্র OCR",
  "# বিজয় টু ইউনিকোড কনভার্টার": "# বিজয় টু ইউনিকোড কনভার্টার",
  "এক্সেল স্প্রেডশিট (.XLSX, .XLS):": "এক্সেল স্প্রেডশিট (.XLSX, .XLS):",
  "আন্তর্জাতিক স্ট্যান্ডার্ড কালপুরুষ ও নিকোশ ফন্টে সুবিন্যস্ত আধুনিক ফাইল। ওয়েবসাইট, ইমেইল ও ডিজিটাল আর্কাইভিংয়ের জন্য সর্বোৎকৃষ্ট।": "আন্তর্জাতিক স্ট্যান্ডার্ড কালপুরুষ ও নিকোশ ফন্টে সুবিন্যস্ত আধুনিক ফাইল। ওয়েবসাইট, ইমেইল ও ডিজিটাল আর্কাইভিংয়ের জন্য সর্বোৎকৃষ্ট।",
  "সাধারণ ফাইল কনভার্সন সম্পূর্ণ আপনার ব্রাউজারে ঘটে। কোনো ক্লাউড সার্ভারে ডেটা জমা রাখা হয় না।": "সাধারণ ফাইল কনভার্সন সম্পূর্ণ আপনার ব্রাউজারে ঘটে। কোনো ক্লাউড সার্ভারে ডেটা জমা রাখা হয় না।",
  "MCQ প্রশ্নের প্রতিটি অপশনের (ক, খ, গ, ঘ) মাঝে সুষম দূরত্ব বজায় রাখার জন্য স্বয়ংক্রিয়ভাবে স্ট্যান্ডার্ড ১টি করে ট্যাব যুক্ত থাকে।": "MCQ প্রশ্নের প্রতিটি অপশনের (ক, খ, গ, ঘ) মাঝে সুষম দূরত্ব বজায় রাখার জন্য স্বয়ংক্রিয়ভাবে স্ট্যান্ডার্ড ১টি করে ট্যাব যুক্ত থাকে।",
  "বাটনে চাপুন। কনভার্ট শেষে রেজাল্ট কার্ডে থাকা": "বাটনে চাপুন। কনভার্ট শেষে রেজাল্ট কার্ডে থাকা",
  "# পদার্থ ও রসায়ন সমীকরণ OCR": "# পদার্থ ও রসায়ন সমীকরণ OCR",
  "প্রশ্ন নম্বর, উদ্দীপক ও গাণিতিক চিহ্ন মূল ফাইলের সাথে মিলিয়ে নির্ভুল প্রশ্নপত্র প্রস্তুত করে।": "প্রশ্ন নম্বর, উদ্দীপক ও গাণিতিক চিহ্ন মূল ফাইলের সাথে মিলিয়ে নির্ভুল প্রশ্নপত্র প্রস্তুত করে।",
  "৩. গণিতের সমীকরণ বা ভগ্নাংশ কি কনভার্ট করার সময় নষ্ট হয়ে যাবে?": "৩. গণিতের সমীকরণ বা ভগ্নাংশ কি কনভার্ট করার সময় নষ্ট হয়ে যাবে?",
  "বাটনে ক্লিক করলেই স্বয়ংক্রিয়ভাবে সুতন্নিএমজে বিজয় ফন্টে সাজানো প্রিন্ট-রেডি .doc ফাইল ডাউনলোড হবে।": "বাটনে ক্লিক করলেই স্বয়ংক্রিয়ভাবে সুতন্নিএমজে বিজয় ফন্টে সাজানো প্রিন্ট-রেডি .doc ফাইল ডাউনলোড হবে।",
  "# ম্যাথ টাইপ থেকে ওয়ার্ড সমীকরণ": "# ম্যাথ টাইপ থেকে ওয়ার্ড সমীকরণ"
};

  const bnDigits = '০১২৩৪৫৬৭৮৯';
  const enDigits = '0123456789';

  function toEnDigits(str) {
    if (!str) return str;
    return str.replace(/[০-৯]/g, (ch) => enDigits[bnDigits.indexOf(ch)]);
  }

  function getEnglishTranslation(text) {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    // 1. Direct dictionary match
    if (bilingualContentDict[trimmed]) {
      return bilingualContentDict[trimmed];
    }

    // 2. Strip leading/trailing emoji, bullets, symbols
    const m = trimmed.match(/^([^\w\s\u0980-\u09FF]*\s*)([\w\s\u0980-\u09FF()–—\-]+)(.*)$/);
    if (m) {
      const prefix = m[1];
      const core = m[2].trim();
      const suffix = m[3];
      if (bilingualContentDict[core]) {
        return prefix + bilingualContentDict[core] + suffix;
      }
    }

    // 3. Dynamic patterns
    if (trimmed.startsWith('সেবা ')) {
      return 'Service ' + toEnDigits(trimmed.substring(5));
    }
    if (trimmed.startsWith('শেষ:')) {
      return 'Deadline:' + toEnDigits(trimmed.substring(4));
    }
    if (trimmed.includes('দিন বাকি')) {
      return toEnDigits(trimmed.replace('দিন বাকি', 'days left'));
    }
    if (trimmed.includes('সক্রিয় সার্কুলার')) {
      return toEnDigits(trimmed.replace('সক্রিয় সার্কুলার', 'Active Circulars').replace('টি', ''));
    }
    if (/^[\d\s\u09E6-\u09EF/.,\-+–—%৳]+$/.test(trimmed)) {
      return toEnDigits(trimmed);
    }

    return null;
  }

  let i18nObserver = null;
  function startI18nObserver() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.body) return;
    if (i18nObserver) return;
    i18nObserver = new MutationObserver((mutations) => {
      if (currentLang !== 'en') return;
      let shouldTranslate = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          shouldTranslate = true;
          break;
        }
      }
      if (shouldTranslate) {
        if (window._i18n_timer) clearTimeout(window._i18n_timer);
        window._i18n_timer = setTimeout(() => {
          translateDOMTextNodes('en');
        }, 60);
      }
    });
    i18nObserver.observe(document.body, { childList: true, subtree: true });
  }

  function stopI18nObserver() {
    if (i18nObserver) {
      i18nObserver.disconnect();
      i18nObserver = null;
    }
  }

  function translateDOMTextNodes(lang) {
    if (!bilingualContentDict || Object.keys(bilingualContentDict).length === 0) return;
    if (typeof document === 'undefined' || !document.body) return;

    if (lang === 'en') {
      startI18nObserver();

      // 1. Text nodes
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toUpperCase();
            if (['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT', 'TEXTAREA'].includes(tag)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (parent.hasAttribute('data-i18n')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const nodesToTranslate = [];
      while (walker.nextNode()) {
        nodesToTranslate.push(walker.currentNode);
      }

      nodesToTranslate.forEach((node) => {
        const trimmed = node.nodeValue.trim();
        if (!trimmed) return;
        const translated = getEnglishTranslation(trimmed);
        if (translated) {
          if (node.__orig_text === undefined) {
            node.__orig_text = node.nodeValue;
          }
          node.nodeValue = node.nodeValue.replace(trimmed, translated);
        }
      });

      // 2. Select Option elements
      document.querySelectorAll('option').forEach((opt) => {
        const trimmed = opt.textContent.trim();
        if (trimmed) {
          const translated = getEnglishTranslation(trimmed);
          if (translated) {
            if (opt.__orig_text === undefined) {
              opt.__orig_text = opt.textContent;
            }
            opt.textContent = translated;
          }
        }
      });

      // 3. Placeholders
      document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
        const placeholder = el.getAttribute('placeholder');
        if (placeholder && !el.hasAttribute('data-i18n-placeholder')) {
          const trimmed = placeholder.trim();
          const translated = getEnglishTranslation(trimmed);
          if (translated) {
            if (el.__orig_placeholder === undefined) {
              el.__orig_placeholder = placeholder;
            }
            el.setAttribute('placeholder', translated);
          }
        }
      });

      // 4. Title attributes
      document.querySelectorAll('[title]').forEach((el) => {
        const title = el.getAttribute('title');
        if (title && !el.hasAttribute('data-i18n-title')) {
          const trimmed = title.trim();
          const translated = getEnglishTranslation(trimmed);
          if (translated) {
            if (el.__orig_title === undefined) {
              el.__orig_title = title;
            }
            el.setAttribute('title', translated);
          }
        }
      });

    } else {
      stopI18nObserver();

      // Revert to Bengali (lang === 'bn')
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            return (node.__orig_text !== undefined) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        }
      );
      const nodesToRestore = [];
      while (walker.nextNode()) {
        nodesToRestore.push(walker.currentNode);
      }
      nodesToRestore.forEach((node) => {
        if (node.__orig_text !== undefined) {
          node.nodeValue = node.__orig_text;
        }
      });

      document.querySelectorAll('option').forEach((opt) => {
        if (opt.__orig_text !== undefined) {
          opt.textContent = opt.__orig_text;
        }
      });

      document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
        if (el.__orig_placeholder !== undefined) {
          el.setAttribute('placeholder', el.__orig_placeholder);
        }
      });

      document.querySelectorAll('[title]').forEach((el) => {
        if (el.__orig_title !== undefined) {
          el.setAttribute('title', el.__orig_title);
        }
      });
    }
  }

  // =========================================================================
  // 2. State Management & Time-Based Theme Engine
  // =========================================================================
  let currentLang = localStorage.getItem('fayzar_lang') || 'bn';

  function getTimeBasedTheme() {
    const hour = new Date().getHours();
    // Daytime: 06:00 to 17:59 (6:00 AM - 5:59 PM) -> 'light' (Day Mode)
    // Nighttime: 18:00 to 05:59 (6:00 PM - 5:59 AM) -> 'dark' (Night Mode)
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
  }

  function determineInitialTheme() {
    const sessionManual = sessionStorage.getItem('fayzar_theme_manual');
    const savedManualTheme = localStorage.getItem('fayzar_theme_manual');
    const manualTime = parseInt(localStorage.getItem('fayzar_theme_manual_time') || '0', 10);
    const elapsedHours = (Date.now() - manualTime) / (1000 * 60 * 60);

    // If user explicitly toggled during this browsing session or recently (within 4 hours)
    if (sessionManual === 'true' && savedManualTheme) {
      return savedManualTheme;
    }
    if (savedManualTheme && elapsedHours < 4) {
      return savedManualTheme;
    }

    // Default to current local time of day (Day = light, Night = dark)
    return getTimeBasedTheme();
  }

  let currentTheme = determineInitialTheme();

  // Apply theme immediately to root to prevent screen flashing
  if (typeof document !== 'undefined' && document.documentElement) {
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // =========================================================================
  // 3. Theme Controller (Day ☀️ / Night 🌙)
  // =========================================================================
  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('fayzar_theme', theme);
    
    const root = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    const mobileThemeIcon = document.getElementById('mobile-theme-icon');
    const mobileThemeText = document.getElementById('mobile-theme-text');

    if (theme === 'dark') {
      root.classList.add('dark');
      if (themeIcon) themeIcon.className = 'fa-solid fa-sun text-amber-300';
      if (mobileThemeIcon) mobileThemeIcon.className = 'fa-solid fa-sun text-amber-400';
      const label = translations[currentLang] ? translations[currentLang].theme_day : 'ডে মোড';
      if (themeText) themeText.textContent = label;
      if (mobileThemeText) mobileThemeText.textContent = label;
    } else {
      root.classList.remove('dark');
      if (themeIcon) themeIcon.className = 'fa-solid fa-moon text-amber-300';
      if (mobileThemeIcon) mobileThemeIcon.className = 'fa-solid fa-moon text-indigo-600';
      const label = translations[currentLang] ? translations[currentLang].theme_night : 'নাইট মোড';
      if (themeText) themeText.textContent = label;
      if (mobileThemeText) mobileThemeText.textContent = label;
    }
  }

  function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    try {
      sessionStorage.setItem('fayzar_theme_manual', 'true');
      localStorage.setItem('fayzar_theme_manual', newTheme);
      localStorage.setItem('fayzar_theme_manual_time', Date.now().toString());
    } catch (e) {}
    applyTheme(newTheme);
  }

  // =========================================================================
  // 4. Language Controller (বাংলা ⇄ English)
  // =========================================================================
  function applyLanguage(lang) {
    if (!translations[lang]) lang = 'bn';
    currentLang = lang;
    localStorage.setItem('fayzar_lang', lang);

    const dict = translations[lang];

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.setAttribute('placeholder', dict[key]);
      }
    });

    // Update titles
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (dict[key]) {
        el.setAttribute('title', dict[key]);
      }
    });

    // Update Language Button Indicators
    const langBtnText = document.getElementById('lang-btn-text');
    const mobileLangBtnText = document.getElementById('mobile-lang-btn-text');
    if (langBtnText) {
      langBtnText.textContent = lang === 'bn' ? 'English' : 'বাংলা';
    }
    // Update [ বাং | EN ] pill indicators
    const btnBn = document.getElementById('lang-btn-bn');
    const btnEn = document.getElementById('lang-btn-en');
    if (btnBn && btnEn) {
      if (lang === 'bn') {
        btnBn.className = 'px-2 py-0.2 bg-emerald-800 text-white font-bold cursor-pointer transition';
        btnEn.className = 'px-2 py-0.2 bg-white text-emerald-800 font-bold hover:bg-emerald-50 cursor-pointer transition';
      } else {
        btnBn.className = 'px-2 py-0.2 bg-white text-emerald-800 font-bold hover:bg-emerald-50 cursor-pointer transition';
        btnEn.className = 'px-2 py-0.2 bg-emerald-800 text-white font-bold cursor-pointer transition';
      }
    }

    // Refresh theme labels based on current language
    applyTheme(currentTheme);

    // Deep Translate DOM text nodes, options & placeholders
    translateDOMTextNodes(lang);

    // Dispatch global event for custom components
    window.dispatchEvent(new CustomEvent('fayzar:langchange', { detail: { lang: lang } }));
  }

  window.setLanguage = applyLanguage;

  window.FayzarLang = {
    applyLanguage: applyLanguage,
    translateDOMTextNodes: translateDOMTextNodes,
    bilingualContentDict: bilingualContentDict
  };


  function toggleLanguage() {
    applyLanguage(currentLang === 'bn' ? 'en' : 'bn');
  }

  // =========================================================================
  // 5. Expose Global Controller & Auto-Init
  // =========================================================================
  window.FayzarUI = {
    getLang: () => currentLang,
    getTheme: () => currentTheme,
    setLang: applyLanguage,
    setTheme: applyTheme,
    toggleLang: toggleLanguage,
    toggleTheme: toggleTheme,
    getTimeBasedTheme: getTimeBasedTheme,
    translations: translations
  };

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    applyLanguage(currentLang);

    // Bind event listeners to UI toggles
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const mobileThemeBtn = document.getElementById('mobile-theme-toggle-btn');
    if (mobileThemeBtn) mobileThemeBtn.addEventListener('click', toggleTheme);

    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) langBtn.addEventListener('click', toggleLanguage);

    const mobileLangBtn = document.getElementById('mobile-lang-toggle-btn');
    if (mobileLangBtn) mobileLangBtn.addEventListener('click', toggleLanguage);

    // Automatic time-based transition check every 60 seconds
    setInterval(() => {
      try {
        if (sessionStorage.getItem('fayzar_theme_manual') !== 'true') {
          const expected = getTimeBasedTheme();
          if (currentTheme !== expected) {
            applyTheme(expected);
          }
        }
      } catch (e) {}
    }, 60000);
  });
})();
