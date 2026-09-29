const SchemaValidator = {
  validate: function(docType, parsedData) {
    if (!parsedData) {
      throw new Error(`[Schema Error] Parsed data is null for docType: ${docType}`);
    }

    switch (docType) {
      case 'ROUTINE':
        this._validateRoutine(parsedData);
        break;
      case 'EXAM_CQ':
      case 'EXAM_MATH':
      case 'EXAM_GENERAL':
      case 'EXAM_MCQ':
      case 'EXAM_COMBINED':
        this._validateQuestion(parsedData);
        break;
      case 'PROTTOYON':
        this._validateCertificate(parsedData);
        break;
      case 'STAMP_DEED':
        this._validateStamp(parsedData);
        break;
      case 'GOVT_APP':
        this._validateGovtApp(parsedData);
        break;
      case 'ADMIT_CARD':
        this._validateAdmitCard(parsedData);
        break;
      case 'SALARY_SLIP':
        this._validateSalarySlip(parsedData);
        break;
      case 'CV':
        this._validateCV(parsedData);
        break;
      default:
        console.warn(`[Schema Warning] No validation schema defined for docType: ${docType}`);
    }
    return true;
  },

  _validateRoutine: function(data) {
    // Expected: { institute, title, classInfo, session, headers: [], rows: [[]] }
    if (!data.headers || !Array.isArray(data.headers)) {
      throw new Error('রুটিনের হেডারে ত্রুটি রয়েছে। (headers is missing or not an array)');
    }
    if (!data.rows || !Array.isArray(data.rows)) {
      throw new Error('রুটিনের ডেটায় ত্রুটি রয়েছে। (rows is missing or not an array)');
    }
  },

  _validateQuestion: function(data) {
    // Expected: { institute, examName, subject, ... sections: [{ type, instructions, questions: [] }] }
    if (!data.sections || !Array.isArray(data.sections)) {
      throw new Error('প্রশ্নপত্রের সেকশনগুলো সঠিকভাবে পার্স হয়নি। (sections is missing or not an array)');
    }
    if (data.sections.length === 0) {
      throw new Error('প্রশ্নপত্রে কোনো সেকশন পাওয়া যায়নি।');
    }
  },

  _validateCertificate: function(data) {
    if (!data.name || !data.fatherName) {
      throw new Error('প্রত্যয়ন পত্রে নাম বা পিতার নাম মিসিং।');
    }
  },

  _validateStamp: function(data) {
    if (!data.partyA || !data.partyB) {
      throw new Error('স্ট্যাম্প/দলিলের প্রথম পক্ষ বা দ্বিতীয় পক্ষের তথ্য মিসিং।');
    }
  },

  _validateGovtApp: function(data) {
    if (!data.date || !data.recipient) {
      throw new Error('আবেদনের তারিখ বা প্রাপকের তথ্য মিসিং।');
    }
  },

  _validateAdmitCard: function(data) {
    if (!data.students || !Array.isArray(data.students)) {
      throw new Error('অ্যাডমিট কার্ডের স্টুডেন্ট লিস্ট মিসিং বা ইনভ্যালিড।');
    }
  },

  _validateSalarySlip: function(data) {
    if (!data.employeeName || !data.basicSalary) {
      throw new Error('স্যালারি স্লিপে কর্মচারীর নাম বা বেসিক স্যালারি মিসিং।');
    }
  },

  _validateCV: function(data) {
    if (!data.name || !data.contact) {
      throw new Error('সিভি-তে নাম বা কন্টাক্ট ইনফো মিসিং।');
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SchemaValidator;
} else if (typeof window !== 'undefined') {
  window.FayzarSchemaValidator = SchemaValidator;
}
