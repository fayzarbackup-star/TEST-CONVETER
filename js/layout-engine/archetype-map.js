/**
 * Fayzar Publishing Studio - Archetype to DocType Mapping
 * Maps MdLayoutParser archetypes to DocClassifier DOC_TYPES.
 * Offline, standalone mapping bridge.
 */
(function(global) {
  'use strict';

  const ARCHETYPE_TO_DOCTYPE = {
    'bengali_combined_exam_paper': 'EXAM_COMBINED',
    'bengali_cq_paper': 'EXAM_CQ',
    'bengali_mcq_paper': 'EXAM_MCQ',
    'bengali_standard_question_paper': 'EXAM_GENERAL',
    'english_question_paper': 'EXAM_GENERAL',
    'math_science_paper': 'EXAM_MATH',
    'govt_application': 'GOVT_APP',
    'legal_deed_contract': 'STAMP_DEED',
    'testimonial_cert': 'PROTTOYON',
    'office_pad': 'OFFICE_PAD',
    'official_notice_memo': 'OFFICIAL_NOTICE',
    'salary_slip': 'SALARY_SLIP',
    'admit_card': 'ADMIT_CARD',
    'class_routine': 'ROUTINE',
    'bengali_general_doc': 'GENERAL',
    'single_column_standard_document': 'GENERAL'
  };

  // __FZ_ON_REGISTRY সুইচ চালু আছে কি না তা যাচাই করার সহায়ক ফাংশন
  function isRegistrySwitchOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_REGISTRY)) {
      return true;
    }
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_REGISTRY)) {
      return true;
    }
    if (global && Boolean(global.__FZ_ON_REGISTRY)) {
      return true;
    }
    if (
      typeof process !== 'undefined' &&
      process &&
      process.env &&
      (process.env.__FZ_ON_REGISTRY === '1' || process.env.__FZ_ON_REGISTRY === 'true')
    ) {
      return true;
    }
    return false;
  }

  // গ্লোবাল বা ব্রাউজার পরিবেশে FayzarLayoutRegistry থাকলে তা খুঁজে বের করার সহায়ক ফাংশন
  function getLayoutRegistry() {
    if (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutRegistry) {
      return globalThis.FayzarLayoutRegistry;
    }
    if (typeof window !== 'undefined' && window.FayzarLayoutRegistry) {
      return window.FayzarLayoutRegistry;
    }
    if (global && global.FayzarLayoutRegistry) {
      return global.FayzarLayoutRegistry;
    }
    return null;
  }

  const ArchetypeMap = {
    ARCHETYPE_TO_DOCTYPE,
    toDocType(archetypeId) {
      if (!archetypeId) return 'GENERAL';
      // কেবল __FZ_ON_REGISTRY সুইচ চালু থাকলেই FayzarLayoutRegistry হুক ব্যবহৃত হবে
      if (isRegistrySwitchOn()) {
        const registry = getLayoutRegistry();
        if (registry && typeof registry.get === 'function') {
          const directEntry = registry.get(archetypeId);
          if (directEntry && directEntry.id) return directEntry.id;
          const mappedDocType = ARCHETYPE_TO_DOCTYPE[archetypeId];
          if (mappedDocType) {
            const mappedEntry = registry.get(mappedDocType);
            if (mappedEntry && mappedEntry.id) return mappedEntry.id;
          }
        }
      }
      // সুইচ বন্ধ থাকলে বা রেজিস্ট্রি না থাকলে/না মিললে বিদ্যমান আচরণ হুবহু অপরিবর্তিত
      return ARCHETYPE_TO_DOCTYPE[archetypeId] || 'GENERAL';
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ArchetypeMap;
  if (typeof window !== 'undefined') window.ArchetypeMap = ArchetypeMap;
  if (typeof globalThis !== 'undefined') globalThis.ArchetypeMap = ArchetypeMap;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
