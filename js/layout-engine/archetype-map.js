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

  const ArchetypeMap = {
    ARCHETYPE_TO_DOCTYPE,
    toDocType(archetypeId) {
      if (!archetypeId) return 'GENERAL';
      return ARCHETYPE_TO_DOCTYPE[archetypeId] || 'GENERAL';
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ArchetypeMap;
  if (typeof window !== 'undefined') window.ArchetypeMap = ArchetypeMap;
  if (typeof globalThis !== 'undefined') globalThis.ArchetypeMap = ArchetypeMap;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
