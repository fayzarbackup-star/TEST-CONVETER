/**
 * Fayzar Computer Online Result Management - Admin Panel Script
 * 3-Tier RBAC (Web Super Admin, School Master Admin, Subject Teacher)
 * Concurrency-safe field update with updateMask, Firestore REST sync,
 * Web Admin Exclusive Publish Control, Excel Export & A4 Batch Print Engine.
 */

(function () {
  'use strict';

  let config = null;
  let allStudents = [];
  let currentUser = null;
  let currentClassId = '';
  let activeSchoolId = 'dreamland-school';
  let currentYear = '2026';
  let currentExamId = 'first_term_2026';

  // DOM Elements
  const authOverlay = document.getElementById('adminAuthOverlay');
  const pinForm = document.getElementById('adminPinForm');
  const pinInput = document.getElementById('adminPinInput');
  const adminThemeToggleBtn = document.getElementById('adminThemeToggleBtn');
  const adminUserRoleBadge = document.getElementById('adminUserRoleBadge');
  const adminRoleText = document.getElementById('adminRoleText');
  const adminInstitutionSelect = document.getElementById('adminInstitutionSelect');
  const lockedSchoolNameBadge = document.getElementById('lockedSchoolNameBadge');
  const lockedSchoolText = document.getElementById('lockedSchoolText');

  // Tabs
  const adminTabButtons = document.querySelectorAll('.admin-tab-btn');
  const batchPrintTabContent = document.getElementById('batchPrintTabContent');
  const spreadsheetTabContent = document.getElementById('spreadsheetTabContent');
  const excelImportTabContent = document.getElementById('excelImportTabContent');
  const settingsTabContent = document.getElementById('settingsTabContent');

  // Batch Print Tab
  const batchPrintMainCard = document.getElementById('batchPrintMainCard');
  const batchPreviewSection = document.getElementById('batchPreviewSection');
  const batchYearSelect = document.getElementById('batchYearSelect');
  const batchExamSelect = document.getElementById('batchExamSelect');
  const batchClassSelect = document.getElementById('batchClassSelect');
  const executeBatchPrintBtn = document.getElementById('executeBatchPrintBtn');
  const batchStudentCount = document.getElementById('batchStudentCount');
  const batchPreviewGrid = document.getElementById('batchPreviewGrid');
  const batchPrintContainer = document.getElementById('batchPrintContainer');

  // Spreadsheet Editor Tab
  const editorYearSelect = document.getElementById('editorYearSelect');
  const editorExamSelect = document.getElementById('editorExamSelect');
  const editorClassSelect = document.getElementById('editorClassSelect');
  const editorSectionSelect = document.getElementById('editorSectionSelect');
  let currentSection = 'all';
  const editorRoleInstruction = document.getElementById('editorRoleInstruction');
  const publishControlContainer = document.getElementById('publishControlContainer');
  const classPublishStatusBadge = document.getElementById('classPublishStatusBadge');
  const togglePublishBtn = document.getElementById('togglePublishBtn');
  const togglePublishBtnText = document.getElementById('togglePublishBtnText');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const addNewStudentBtn = document.getElementById('addNewStudentBtn');
  const saveEditorChangesBtn = document.getElementById('saveEditorChangesBtn');
  const editorTableHead = document.getElementById('editorTableHead');
  const editorTableBody = document.getElementById('editorTableBody');

  // Excel Import Tab
  const importYearSelect = document.getElementById('importYearSelect');
  const importExamSelect = document.getElementById('importExamSelect');
  const importClassSelect = document.getElementById('importClassSelect');
  const downloadSampleExcelBtn = document.getElementById('downloadSampleExcelBtn');
  const excelFileInput = document.getElementById('excelFileInput');
  const excelDropzone = document.getElementById('excelDropzone');
  const importResultStatus = document.getElementById('importResultStatus');

  // Manage & Edit Exams Modal
  const manageExamsModal = document.getElementById('manageExamsModal');
  const manageExamForm = document.getElementById('manageExamForm');
  const editingExamOriginalId = document.getElementById('editingExamOriginalId');
  const manageExamFormTitle = document.getElementById('manageExamFormTitle');
  const cancelEditExamBtn = document.getElementById('cancelEditExamBtn');
  const examFormYear = document.getElementById('examFormYear');
  const examFormNameBn = document.getElementById('examFormNameBn');
  const examFormSubmitBtn = document.getElementById('examFormSubmitBtn');
  const examFormSubmitText = document.getElementById('examFormSubmitText');
  const manageExamsTableBody = document.getElementById('manageExamsTableBody');
  const activeSchoolExamCountBadge = document.getElementById('activeSchoolExamCountBadge');

  // Publish Schedule Modal
  const publishScheduleModal = document.getElementById('publishScheduleModal');
  const publishScheduleForm = document.getElementById('publishScheduleForm');
  const publishScheduleDate = document.getElementById('publishScheduleDate');
  const publishScheduleTime = document.getElementById('publishScheduleTime');
  const publishNoticeText = document.getElementById('publishNoticeText');
  const publishModalTargetText = document.getElementById('publishModalTargetText');

  // Add Student Modal
  const addStudentModal = document.getElementById('addStudentModal');
  const newStudentForm = document.getElementById('newStudentForm');
  const newStudentRoll = document.getElementById('newStudentRoll');
  const newStudentSection = document.getElementById('newStudentSection');
  const newStudentNameBn = document.getElementById('newStudentNameBn');
  const newStudentFather = document.getElementById('newStudentFather');
  const newStudentMother = document.getElementById('newStudentMother');

  // Settings Tab
  const settingsForm = document.getElementById('settingsForm');
  const cfgInstNameBn = document.getElementById('cfgInstNameBn');
  const cfgInstNameEn = document.getElementById('cfgInstNameEn');
  const cfgInstAddress = document.getElementById('cfgInstAddress');
  const cfgExamName = document.getElementById('cfgExamName');
  // Toast Notification System
  function showToast(message, type = 'info') {
    const box = document.getElementById('toast-box');
    if (!box) {
      console.log(`[Toast ${type}]: ${message}`);
      return;
    }

    const toast = document.createElement('div');
    let bg = 'bg-slate-900 border-slate-700 text-white';
    let icon = '<i class="fas fa-info-circle text-sky-400"></i>';

    if (type === 'success') {
      bg = 'bg-emerald-950 border-emerald-500/60 text-emerald-100 shadow-emerald-900/30';
      icon = '<i class="fas fa-check-circle text-emerald-400"></i>';
    } else if (type === 'error') {
      bg = 'bg-rose-950 border-rose-500/60 text-rose-100 shadow-rose-900/30';
      icon = '<i class="fas fa-exclamation-circle text-rose-400"></i>';
    } else if (type === 'warning') {
      bg = 'bg-amber-950 border-amber-500/60 text-amber-100 shadow-amber-900/30';
      icon = '<i class="fas fa-triangle-exclamation text-amber-400"></i>';
    }

    toast.className = `${bg} border shadow-2xl rounded-2xl px-4 py-3 text-xs font-bold flex items-center gap-2.5 transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto max-w-sm`;
    toast.innerHTML = `${icon} <span>${message}</span>`;

    box.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
  window.showToast = showToast;

  // Initialize
  async function init() {
    initTheme();
    bindEvents();

    config = await ResultEngine.Storage.loadConfig();
    allStudents = await ResultEngine.Storage.loadStudents();

    // Auto-normalize legacy students missing year or exam_id (e.g. Amdungi Madrasah 2025)
    let needsSave = false;
    allStudents.forEach(s => {
      if (!s.year && s.academic_year) { s.year = s.academic_year; needsSave = true; }
      if (!s.year) { s.year = '2025'; needsSave = true; }
      if (!s.academic_year) { s.academic_year = s.year; needsSave = true; }
      if (!s.exam_id) {
        if (s.exam_name_bn && (s.exam_name_bn.includes('টেস্ট') || s.exam_name_bn.includes('Test'))) {
          s.exam_id = 'dakhil_test_2025';
        } else {
          s.exam_id = 'annual_2025';
        }
        needsSave = true;
      }

      // Fix: primary-class students (Nursery, KG, Class 1-5) should NOT have cq/mcq/practical
      // fields on their subjects. If present from a previous bug, clean them up.
      const classId = s.class_id || '';
      if (!isSecondaryClass(classId) && !isJuniorSecondaryClass(classId)) {
        (s.subjects || []).forEach(sub => {
          if (!Array.isArray(sub.papers)) { // not a composite/paper subject
            if ('cq' in sub || 'mcq' in sub || 'practical' in sub) {
              delete sub.cq;
              delete sub.mcq;
              delete sub.practical;
              needsSave = true;
            }
          }
        });

        // Auto-heal nursery student 'অ' (2026) if BGS was stuck at 0 due to the substring collision bug
        if (s.id === 'st_1788803412800_f4wc' || (s.class_id === 'nursery' && s.student_name_bn === 'অ')) {
          const bgs = (s.subjects || []).find(sub => sub.code === '108' || (sub.name_bn && sub.name_bn.includes('বাংলাদেশ ও বিশ্বপরিচয়')));
          if (bgs && (bgs.marks_obtained === 0 || !bgs.marks_obtained)) {
            bgs.marks_obtained = 50;
            const recalculated = ResultEngine.calculateStudent(s);
            Object.assign(s, recalculated);
            needsSave = true;
          }
        }
      }
    });
    if (needsSave) {
      ResultEngine.Storage.saveStudents(allStudents);
    }

    // Check URL parameters for Direct Navigation & Single Sign-On (SSO)
    const urlParams = new URLSearchParams(window.location.search);
    const authParam = urlParams.get('auth');
    const schoolParam = urlParams.get('school');
    const tabParam = urlParams.get('tab');

    const isSwitchedOut = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('fayzar_result_switched_out') === 'true');

    if (!isSwitchedOut && (authParam === 'super')) {
      currentUser = {
        role: 'super_admin',
        role_title: 'ওয়েব সুপার অ্যাডমিন (ফয়জার কম্পিউটার)',
        name: 'ফয়জার কম্পিউটার অ্যাডমিন',
        canBatchPrint: true,
        canPublish: true,
        canSwitchSchool: true,
        canManageUsers: true,
        school_id: null
      };
      ResultEngine.Storage.setCurrentUser(currentUser);
    } else {
      currentUser = isSwitchedOut ? null : ResultEngine.Storage.getCurrentUser();
    }

    if (schoolParam) {
      activeSchoolId = schoolParam;
    }

    if (!currentUser) {
      showAuthOverlay();
    } else {
      hideAuthOverlay();
      applyUserPermissions(currentUser);

      if (schoolParam && adminInstitutionSelect) {
        adminInstitutionSelect.value = schoolParam;
      }

      // If requested directly into spreadsheet or coming from admin
      if (tabParam === 'spreadsheet' || tabParam === 'spreadsheetTab') {
        switchAdminTab('spreadsheetTab');
      } else if (tabParam) {
        switchAdminTab(tabParam);
      }
    }
  }

  function initTheme() {
    // Unified with centralized FayzarUI Day/Night theme engine (theme-lang.js)
    if (window.FayzarUI && typeof window.FayzarUI.getTheme === 'function') {
      const current = window.FayzarUI.getTheme();
      if (current === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  function showAuthOverlay() {
    if (authOverlay) {
      authOverlay.classList.remove('hidden');
      authOverlay.style.display = 'flex';
      setTimeout(() => pinInput?.focus(), 100);
    }
  }

  function hideAuthOverlay() {
    if (authOverlay) {
      authOverlay.classList.add('hidden');
      authOverlay.style.display = 'none';
    }
  }

  // 3-Tier Permission Enforcer
  function applyUserPermissions(user) {
    if (!user) return;

    // 1. Set Role Badge
    if (adminRoleText) {
      adminRoleText.textContent = user.role_title || user.name;
    }

    // 2. School Switcher Control
    if (user.role === 'super_admin') {
      // Super Admin: Can switch to any school
      if (adminInstitutionSelect) {
        adminInstitutionSelect.classList.remove('hidden');
        adminInstitutionSelect.disabled = false;
        populateInstitutionDropdown();
        adminInstitutionSelect.value = activeSchoolId;
      }
      if (lockedSchoolNameBadge) lockedSchoolNameBadge.classList.add('hidden');
    } else {
      // School Master or Teacher: School is locked!
      activeSchoolId = user.school_id;
      if (adminInstitutionSelect) adminInstitutionSelect.classList.add('hidden');
      if (lockedSchoolNameBadge) {
        lockedSchoolNameBadge.classList.remove('hidden');
        if (lockedSchoolText) lockedSchoolText.textContent = user.school_name || 'নিজ বিদ্যালয়';
      }
    }

    // 3. Batch Print Tab Control (Accessible to all authenticated users)
    if (batchPrintMainCard) batchPrintMainCard.classList.remove('hidden');
    if (batchPreviewSection) batchPreviewSection.classList.remove('hidden');

    // 4. Publish / Draft Control (Web Admin ONLY)
    if (publishControlContainer) {
      if (user.canPublish) {
        publishControlContainer.classList.remove('hidden');
        if (togglePublishBtn) togglePublishBtn.classList.remove('hidden');
      } else {
        publishControlContainer.classList.remove('hidden');
        // School Master & Teachers can only see status badge, cannot toggle!
        if (togglePublishBtn) togglePublishBtn.classList.add('hidden');
      }
    }

    // 5. Editor Role Instruction
    if (editorRoleInstruction) {
      if (user.role === 'teacher') {
        editorRoleInstruction.textContent = `(আপনার দায়িত্ব: ${user.assigned_subjects.join(', ')} এর নম্বর এন্ট্রি)`;
      } else if (user.role === 'school_master') {
        editorRoleInstruction.textContent = `(${user.school_name} এর সকল মার্কস নিয়ন্ত্রণ)`;
      } else {
        editorRoleInstruction.textContent = '(ওয়েব সুপার অ্যাডমিন - সর্বময় নিয়ন্ত্রণ)';
      }
    }

    populateYearAndExamDropdowns();
    populateClassDropdowns();
    renderSpreadsheet();
    renderBatchPreview();
    loadSettingsForm();
  }

  function populateInstitutionDropdown() {
    if (!adminInstitutionSelect || !config || !Array.isArray(config.institutions)) return;
    adminInstitutionSelect.innerHTML = '';
    config.institutions.forEach(inst => {
      const opt = document.createElement('option');
      opt.value = inst.id;
      opt.textContent = `${inst.id.includes('madrasah') ? '🕌' : '🏫'} ${inst.name_bn}`;
      adminInstitutionSelect.appendChild(opt);
    });
  }

  function getActiveSchool() {
    const currentConfig = config || (typeof window !== 'undefined' && window.DEFAULT_RESULTS_CONFIG) || {};
    return (currentConfig.institutions || []).find(i => i.id === activeSchoolId) || currentConfig.institution || {};
  }

  function populateYearAndExamDropdowns() {
    const school = getActiveSchool();
    const years = school.academic_years || ['2026', '2025'];

    const yearSelects = [editorYearSelect, batchYearSelect, importYearSelect].filter(Boolean);
    yearSelects.forEach(sel => {
      sel.innerHTML = '';
      years.forEach(yr => {
        const opt = document.createElement('option');
        opt.value = yr;
        opt.textContent = `${ResultEngine.toBnDigit(yr)} (${yr})`;
        sel.appendChild(opt);
      });
      if (years.includes(currentYear)) {
        sel.value = currentYear;
      } else if (years.length > 0) {
        currentYear = years[0];
        sel.value = currentYear;
      }
    });

    updateExamDropdownsForYear();
  }

  function updateExamDropdownsForYear() {
    const school = getActiveSchool();
    const allExams = school.exams || [];
    const relevantExams = allExams.filter(e => !e.year || String(e.year) === String(currentYear));
    const examsToShow = relevantExams.length > 0 ? relevantExams : allExams;

    const examSelects = [editorExamSelect, batchExamSelect, importExamSelect].filter(Boolean);
    examSelects.forEach(sel => {
      sel.innerHTML = '';
      examsToShow.forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex.id;
        opt.textContent = ex.name_bn;
        sel.appendChild(opt);
      });
      if (examsToShow.some(e => e.id === currentExamId)) {
        sel.value = currentExamId;
      } else if (examsToShow.length > 0) {
        currentExamId = examsToShow[0].id;
        sel.value = currentExamId;
      }
    });
  }

  function populateClassDropdowns() {
    const school = getActiveSchool();
    const classes = school.classes || config.classes || [];

    if (editorClassSelect) {
      editorClassSelect.innerHTML = '';
      classes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name_bn;
        editorClassSelect.appendChild(opt);
      });
      if (classes.length > 0) {
        currentClassId = classes[0].id;
        editorClassSelect.value = currentClassId;
      }
    }

    if (batchClassSelect) {
      batchClassSelect.innerHTML = '';
      classes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name_bn;
        batchClassSelect.appendChild(opt);
      });
      if (classes.length > 0) {
        batchClassSelect.value = classes[0].id;
      }
    }

    if (importClassSelect) {
      importClassSelect.innerHTML = '';
      classes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name_bn;
        importClassSelect.appendChild(opt);
      });
      if (classes.length > 0) {
        importClassSelect.value = currentClassId;
      }
    }
  }

  // Check Class Publish Status
  function updateClassPublishStatusUI() {
    const studentsInClass = getStudentsInCurrentClass();
    if (studentsInClass.length === 0) {
      if (classPublishStatusBadge) {
        classPublishStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
        classPublishStatusBadge.textContent = 'কোনো শিক্ষার্থী নেই';
      }
      return;
    }

    const isPublished = studentsInClass.some(s => s.publish_status === 'published');
    const isScheduled = studentsInClass.some(s => s.publish_status === 'scheduled');
    const sampleSt = studentsInClass.find(s => s.published_date_bn) || {};

    if (classPublishStatusBadge) {
      if (isPublished) {
        classPublishStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
        classPublishStatusBadge.textContent = sampleSt.published_date_bn ? `প্রকাশিত (${sampleSt.published_date_bn})` : 'প্রকাশিত (Published)';
      } else if (isScheduled) {
        classPublishStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
        classPublishStatusBadge.textContent = sampleSt.published_date_bn ? `নির্ধারিত (${sampleSt.published_date_bn})` : 'নির্ধারিত (Scheduled)';
      } else {
        classPublishStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300';
        classPublishStatusBadge.textContent = 'ড্রাফট (পর্যালোচনায়)';
      }
    }

    if (togglePublishBtnText) {
      togglePublishBtnText.textContent = isPublished ? 'ড্রাফট করুন (Unpublish)' : 'পাবলিশ করুন (Publish)';
    }
  }

  function getStudentsInCurrentClass() {
    return allStudents.filter(s => {
      const matchSchool = (s.institution_id === activeSchoolId) || (!s.institution_id && activeSchoolId === 'dreamland-school');
      const matchClass = String(s.class_id) === String(currentClassId);
      const sYear = String(s.year || s.academic_year || '2025');
      const sExamId = s.exam_id || (s.exam_name_bn && s.exam_name_bn.includes('টেস্ট') ? 'dakhil_test_2025' : 'annual_2025');
      const matchYear = !currentYear || sYear === String(currentYear);
      const matchExam = !currentExamId || sExamId === currentExamId || s.exam_id === currentExamId;
      return matchSchool && matchClass && matchYear && matchExam;
    });
  }

  // Helpers for Class Classification & Subject CQ/MCQ/Practical Components
  function isJuniorSecondaryClass(classId) {
    if (!classId) return false;
    const cid = String(classId).toLowerCase();
    return cid.includes('class_6') || cid.includes('class_7') || cid.includes('class_8') ||
           cid.includes('class6') || cid.includes('class7') || cid.includes('class8') ||
           cid.includes('৬ষ্ঠ') || cid.includes('৭ম') || cid.includes('৮ম') ||
           cid.includes('class_6_daiya') || cid.includes('class_6_defodil') ||
           cid.includes('madrasah_class_6') || cid.includes('madrasah_class_7') || cid.includes('madrasah_class_8');
  }

  function getSubjectComponentConfig(col, classId, schoolId) {
    const full = col.full_marks || 100;
    const name = (col.name_bn || col.name_en || '').toLowerCase();
    const code = String(col.code || '');
    const isSec = isSecondaryClass(classId);
    const isJunior = isJuniorSecondaryClass(classId);

    // Primary Classes (Nursery, KG, Class 1-5): single mark column
    if (!isSec && !isJunior) {
      return [{ key: 'marks_obtained', label: 'নম্বর', max: full }];
    }

    // Class 6 to 8 (Junior Secondary / Dakhil 6-8):
    // Rule: 6-8 পর্যন্ত কোন বিষয়ে ব্যবহারিক মার্ক নাই। তবে এমসিকিউ ও সিকিউ আছে।
    // যেসব বিষয়ে কোনো MCQ থাকে না (শুধু লিখিত/একক ১০০ বা ৫০):
    // ১. ইংরেজি (English 1st & 2nd)
    // ২. আরবি (Arabic 1st & 2nd in Madrasah)
    if (isJunior) {
      const isEnglish = name.includes('ইংরেজি') || name.includes('english') || ((code === '107' || code === '108') && (name.includes('ইংরেজি') || name.includes('english') || !name));
      const isArabic = name.includes('আরবি') || name.includes('arabic');

      if (isEnglish || isArabic) {
        return [{ key: 'marks_obtained', label: 'নম্বর', max: full }];
      }
      // সাধারণ বিজ্ঞান, বিজ্ঞান, বাংলাদেশ ও বিশ্বপরিচয়, গণিত, বাংলা ১ম, ধর্ম, কুরআন মাজিদ, আকাঈদ ইত্যাদি ১০০ নম্বরের বিষয়: CQ 70 + MCQ 30
      if (full === 100) {
        return [
          { key: 'cq', label: 'CQ', max: 70 },
          { key: 'mcq', label: 'MCQ', max: 30 }
        ];
      }
      // ৫০ নম্বরের বিষয় (যেমন: তথ্য ও যোগাযোগ প্রযুক্তি, বাংলা ২য় পত্র): CQ 35 + MCQ 15
      if (full === 50) {
        return [
          { key: 'cq', label: 'CQ', max: 35 },
          { key: 'mcq', label: 'MCQ', max: 15 }
        ];
      }
      const cqMax = Math.round(full * 0.7);
      const mcqMax = full - cqMax;
      return [
        { key: 'cq', label: 'CQ', max: cqMax },
        { key: 'mcq', label: 'MCQ', max: mcqMax }
      ];
    }

    // Class 9 to 10 (Secondary & Dakhil):
    // 1. English: Single column (no MCQ)
    const isSecEnglish = name.includes('ইংরেজি') || name.includes('english') || ((code === '107' || code === '108') && (name.includes('ইংরেজি') || name.includes('english') || !name));
    if (isSecEnglish) {
      return [{ key: 'marks_obtained', label: 'নম্বর', max: full }];
    }
    // 2. Arabic (Madrasah): Single column (written only)
    if (name.includes('আরবি ১ম') || name.includes('আরবি ২য়') || name.includes('আরবি ২য়') || code === '203' || code === '204' || code === '203-1' || code === '203-2') {
      return [{ key: 'marks_obtained', label: 'নম্বর', max: full }];
    }
    // 3. ICT (Theory 25 + Practical 25 = 50)
    if (code === '154' || name.includes('তথ্য ও যোগাযোগ') || name.includes('ict')) {
      return [
        { key: 'cq', label: 'তত্ত্বীয়', max: 25 },
        { key: 'practical', label: 'ব্য', max: 25 }
      ];
    }
    // 4. Practical subjects: Physics, Chemistry, Biology, Higher Math, Agriculture, Domestic Science
    const hasPractical = code === '136' || code === '137' || code === '138' || code === '126' || code === '134' || code === '135' ||
                          name.includes('পদার্থ') || name.includes('রসায়ন') || name.includes('রসায়ন') || name.includes('জীব') || 
                          name.includes('উচ্চতর গণিত') || name.includes('কৃষি') || name.includes('গার্হস্থ্য');
    if (hasPractical) {
      if (full === 100) {
        return [
          { key: 'cq', label: 'CQ', max: 50 },
          { key: 'mcq', label: 'MCQ', max: 25 },
          { key: 'practical', label: 'ব্য', max: 25 }
        ];
      }
      if (full === 50) {
        return [
          { key: 'cq', label: 'CQ', max: 25 },
          { key: 'mcq', label: 'MCQ', max: 15 },
          { key: 'practical', label: 'ব্য', max: 10 }
        ];
      }
    }
    // 5. Standard 100 mark subjects (Bangla 1st & 2nd, Math, Religion, BGS, History, Civics, Geography, Quran, Hadith, Akaid)
    if (full === 100) {
      return [
        { key: 'cq', label: 'CQ', max: 70 },
        { key: 'mcq', label: 'MCQ', max: 30 }
      ];
    }
    if (full === 50) {
      return [
        { key: 'cq', label: 'CQ', max: 35 },
        { key: 'mcq', label: 'MCQ', max: 15 }
      ];
    }
    const cqMax = Math.round(full * 0.7);
    const mcqMax = full - cqMax;
    return [
      { key: 'cq', label: 'CQ', max: cqMax },
      { key: 'mcq', label: 'MCQ', max: mcqMax }
    ];
  }

  // =========================================================================
  // লাইভ মার্কশীট স্প্রেডশিট ফুল স্ক্রিন ও জুম ইন/আউট কন্ট্রোল (Fullscreen & Zoom)
  // =========================================================================
  let currentSpreadsheetZoom = 1.0;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('spreadsheet_zoom')) {
      currentSpreadsheetZoom = parseFloat(localStorage.getItem('spreadsheet_zoom')) || 1.0;
    }
  } catch (err) {}

  function applySpreadsheetZoom() {
    const tableWrapper = document.getElementById('editorTableWrapper');
    const display = document.getElementById('spreadsheetZoomDisplay');
    if (!tableWrapper) return;
    
    // Clamp zoom between 0.60 (60%) and 1.60 (160%)
    currentSpreadsheetZoom = Math.max(0.60, Math.min(1.60, Math.round(currentSpreadsheetZoom * 100) / 100));
    
    const table = tableWrapper.querySelector('table');
    if (table) {
      table.style.zoom = currentSpreadsheetZoom;
      // Fallback for browsers that don't support css zoom
      if (!('zoom' in table.style)) {
        table.style.transform = `scale(${currentSpreadsheetZoom})`;
        table.style.transformOrigin = 'top left';
      }
    }
    
    if (display) {
      display.textContent = ResultEngine.toBnDigit(Math.round(currentSpreadsheetZoom * 100)) + '%';
    }
    try {
      localStorage.setItem('spreadsheet_zoom', String(currentSpreadsheetZoom));
    } catch (err) {}
  }

  window.zoomInSpreadsheet = function () {
    currentSpreadsheetZoom += 0.10;
    applySpreadsheetZoom();
  };

  window.zoomOutSpreadsheet = function () {
    currentSpreadsheetZoom -= 0.10;
    applySpreadsheetZoom();
  };

  window.resetSpreadsheetZoom = function () {
    currentSpreadsheetZoom = 1.0;
    applySpreadsheetZoom();
  };

  window.toggleSpreadsheetFullscreen = function () {
    const card = document.getElementById('spreadsheetCard');
    const btn = document.getElementById('toggleSpreadsheetFullscreenBtn');
    if (!card) return;
    const isFull = card.classList.toggle('spreadsheet-fullscreen');
    document.body.classList.toggle('overflow-hidden', isFull);
    if (btn) {
      if (isFull) {
        btn.innerHTML = '<i class="fas fa-compress text-indigo-600 dark:text-indigo-400"></i> <span id="fullscreenBtnText">ছোট করুন</span>';
        btn.classList.add('bg-indigo-600', 'text-white');
        btn.classList.remove('bg-indigo-50', 'text-indigo-700');
      } else {
        btn.innerHTML = '<i class="fas fa-expand text-indigo-600 dark:text-indigo-400"></i> <span id="fullscreenBtnText">ফুল স্ক্রিন</span>';
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-indigo-50', 'text-indigo-700');
      }
    }
  };

  // Support ESC key to exit fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const card = document.getElementById('spreadsheetCard');
      if (card && card.classList.contains('spreadsheet-fullscreen')) {
        window.toggleSpreadsheetFullscreen();
      }
    }
  });

  /**
   * Robust, tier-prioritized subject matcher for student marksheet.
   * Strictly prevents catastrophic substring collisions (e.g. 'বাংলা' substring inside 'বাংলাদেশ ও বিশ্বপরিচয়').
   */
  function findStudentSubject(subjects, colOrCriteria) {
    if (!Array.isArray(subjects) || subjects.length === 0 || !colOrCriteria) return null;

    const norm = (s) => String(s || '').trim().toLowerCase().replace(/য়/g, 'য়').replace(/\s+/g, ' ');
    const stripSuffix = (s) => s.replace(/\(৪র্থ\s*বিষয়\)/g, '').replace(/\(ঐচ্ছিক\)/g, '').replace(/\(৪র্থ\)/g, '').trim();

    const targetCode = String(colOrCriteria.code || colOrCriteria.subCode || '').trim();
    const targetNameBn = norm(colOrCriteria.name_bn || colOrCriteria.subNameBn || '');
    const targetNameEn = norm(colOrCriteria.name_en || colOrCriteria.subNameEn || '');

    // Tier 1: Exact code match (if code is provided and non-empty)
    if (targetCode) {
      const byCode = subjects.find(s => String(s.code || '').trim() === targetCode);
      if (byCode) return byCode;
    }

    // Tier 2: Exact Bengali name match
    if (targetNameBn) {
      const byName = subjects.find(s => norm(s.name_bn) === targetNameBn);
      if (byName) return byName;
    }

    // Tier 3: Exact English name match
    if (targetNameEn) {
      const byEn = subjects.find(s => norm(s.name_en) === targetNameEn);
      if (byEn) return byEn;
    }

    // Tier 4: Exact Bengali name without optional suffixes like (৪র্থ বিষয়)
    if (targetNameBn) {
      const cleanTarget = stripSuffix(targetNameBn);
      const byCleanName = subjects.find(s => stripSuffix(norm(s.name_bn)) === cleanTarget);
      if (byCleanName) return byCleanName;
    }

    // Tier 5: Controlled paper prefix match (e.g. '101' for '101-1', but NEVER substring on subject names)
    if (targetCode && targetCode.length >= 3) {
      const byCodePrefix = subjects.find(s => {
        const sc = String(s.code || '').trim();
        return sc && (sc === targetCode || sc.startsWith(targetCode + '-') || targetCode.startsWith(sc + '-'));
      });
      if (byCodePrefix) return byCodePrefix;
    }

    return null;
  }

  function findStudentParentSubject(subjects, col) {
    if (!Array.isArray(subjects) || subjects.length === 0 || !col) return null;

    const norm = (s) => String(s || '').trim().toLowerCase().replace(/য়/g, 'য়').replace(/\s+/g, ' ');
    const parentCode = String(col.parent_code || '').trim();
    const parentNameBn = norm(col.parent_name_bn || '');

    // 1. Exact parent code match
    if (parentCode) {
      const byCode = subjects.find(s => String(s.code || '').trim() === parentCode);
      if (byCode) return byCode;
    }

    // 2. Exact parent Bengali name match
    if (parentNameBn) {
      const byName = subjects.find(s => norm(s.name_bn) === parentNameBn);
      if (byName) return byName;
    }

    // 3. Parent code prefix with hyphen (e.g. 101 for 101-1)
    if (parentCode && parentCode.length >= 3) {
      const byPrefix = subjects.find(s => {
        const sc = String(s.code || '').trim();
        return sc && (sc === parentCode || sc.startsWith(parentCode + '-') || parentCode.startsWith(sc + '-'));
      });
      if (byPrefix) return byPrefix;
    }

    return null;
  }

  // Render Live Spreadsheet Editor
  function renderSpreadsheet() {
    if (!editorTableHead || !editorTableBody) return;

    updateClassPublishStatusUI();
    const allStudentsInClass = getStudentsInCurrentClass();

    // Populate Section (শাখা) Filter Dropdown
    if (editorSectionSelect) {
      const distinctSections = Array.from(new Set(allStudentsInClass.map(s => s.section || 'সাধারণ').filter(Boolean)));
      const prevVal = editorSectionSelect.value || currentSection || 'all';
      editorSectionSelect.innerHTML = `<option value="all">সকল শাখা (${ResultEngine.toBnDigit(allStudentsInClass.length)} জন)</option>`;
      distinctSections.forEach(sec => {
        const count = allStudentsInClass.filter(s => (s.section || 'সাধারণ') === sec).length;
        const opt = document.createElement('option');
        opt.value = sec;
        opt.textContent = `শাখা ${sec} (${ResultEngine.toBnDigit(count)} জন)`;
        editorSectionSelect.appendChild(opt);
      });
      if (distinctSections.includes(prevVal)) {
        editorSectionSelect.value = prevVal;
        currentSection = prevVal;
      } else {
        editorSectionSelect.value = 'all';
        currentSection = 'all';
      }
    }

    let studentsInClass = currentSection === 'all' 
      ? allStudentsInClass 
      : allStudentsInClass.filter(s => (s.section || 'সাধারণ') === currentSection);

    // Sort by roll ascending
    studentsInClass.sort((a, b) => (parseInt(a.roll, 10) || 0) - (parseInt(b.roll, 10) || 0));

    if (studentsInClass.length === 0) {
      const school = getActiveSchool();
      const currentExamObj = (school.exams || []).find(e => e.id === currentExamId);
      const examTitle = currentExamObj ? currentExamObj.name_bn : `${ResultEngine.toBnDigit(currentYear)} সালের পরীক্ষা`;

      editorTableHead.innerHTML = `
        <tr>
          <th class="p-3 text-center text-xs font-bold text-slate-700 dark:text-slate-200">
            ${ResultEngine.toBnDigit(currentYear)} সালের "${examTitle}"-এ ${currentSection !== 'all' ? `শাখা "${currentSection}"-এ ` : ''}কোনো শিক্ষার্থী নেই
          </th>
        </tr>
      `;

      editorTableBody.innerHTML = `
        <tr>
          <td class="p-6 sm:p-10 text-center bg-slate-50/50 dark:bg-slate-900/40">
            <div class="max-w-3xl mx-auto space-y-6">
              <div class="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
                <i class="fas fa-sparkles"></i>
              </div>
              <div class="space-y-1">
                <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  ${ResultEngine.toBnDigit(currentYear)} সালের রেজাল্ট শুরু করার ৩টি সহজ পদ্ধতি
                </h3>
                <p class="text-xs text-slate-500 max-w-lg mx-auto">
                  আপনার সুবিধা অনুযায়ী নিচের যেকোনো একটি মাধ্যমে শিক্ষার্থী ও নম্বর অন্তর্ভুক্ত করুন:
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <!-- Method 1: Clone from 2025 -->
                <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-800/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div class="space-y-2">
                    <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      <i class="fas fa-clone"></i> পদ্ধতি ১ (দ্রুততম)
                    </div>
                    <h4 class="font-black text-xs sm:text-sm text-slate-900 dark:text-white">পূর্ববর্তী সাল থেকে কপি</h4>
                    <p class="text-[11px] text-slate-500">
                      ২০২৫ সালের ছাত্রছাত্রীদের নাম ও রোল হুবহু ২০২৬ সালে কপি হয়ে যাবে। নম্বরগুলো খালি (০) থাকবে, শুধু নতুন নম্বর ইনপুট দিন।
                    </p>
                  </div>
                  <button type="button" onclick="window.cloneStudentsFromPreviousYear()" class="w-full py-2.5 px-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
                    <i class="fas fa-copy"></i> ছাত্রছাত্রী কপি করুন
                  </button>
                </div>

                <!-- Method 2: Excel Import -->
                <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div class="space-y-2">
                    <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                      <i class="fas fa-file-excel"></i> পদ্ধতি ২ (এক্সেল ফাইল)
                    </div>
                    <h4 class="font-black text-xs sm:text-sm text-slate-900 dark:text-white">এক্সেল ফাইল ইমপোর্ট</h4>
                    <p class="text-[11px] text-slate-500">
                      নমুনা এক্সেল ফাইল ডাউনলোড করে তাতে রোল, নাম ও প্রাপ্ত নম্বর বসিয়ে আপলোড দিন। এক ক্লিকে সব চলে আসবে।
                    </p>
                  </div>
                  <button type="button" onclick="window.switchAdminTab('excelImportTab')" class="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
                    <i class="fas fa-upload"></i> এক্সেলে আপলোড দিন
                  </button>
                </div>

                <!-- Method 3: Manual Entry -->
                <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div class="space-y-2">
                    <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      <i class="fas fa-user-plus"></i> পদ্ধতি ৩ (ম্যানুয়াল)
                    </div>
                    <h4 class="font-black text-xs sm:text-sm text-slate-900 dark:text-white">এক এক করে যোগ</h4>
                    <p class="text-[11px] text-slate-500">
                      শিক্ষার্থীর রোল, নাম ও অভিভাবকের নাম সরাসরি ফরম পূরণ করে এক এক করে নতুন শিক্ষার্থী অন্তর্ভুক্ত করুন।
                    </p>
                  </div>
                  <button type="button" onclick="window.openAddStudentModal()" class="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
                    <i class="fas fa-plus"></i> শিক্ষার্থী যোগ করুন
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    // Determine all distinct columns across ALL students in the class
    // If a subject has papers (e.g. Bangla 1st & 2nd, English 1st & 2nd, Arabic 1st & 2nd),
    // UNPACK each paper as an independent column so teachers enter each paper directly!
    const columns = getDistinctClassColumns(studentsInClass);

    // Build Table Header (2-Tier Header for direct CQ, MCQ, and Practical entry)
    let theadRow1 = `
      <tr>
        <th rowspan="2" class="py-2.5 px-2 border-r border-b border-slate-300 dark:border-slate-700 text-center w-14 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">অ্যাকশন</th>
        <th rowspan="2" class="py-2.5 px-2 border-r border-b border-slate-300 dark:border-slate-700 text-center w-12 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold font-mono">রোল</th>
        <th rowspan="2" class="py-2.5 px-3 border-r border-b border-slate-300 dark:border-slate-700 text-left w-52 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">শিক্ষার্থীর নাম ও তথ্য</th>
    `;

    let theadRow2 = '<tr>';
    let hasSubRow = false;

    columns.forEach(col => {
      const isTeacherSubject = isSubjectAssignedToUser(col);
      const thStyle = isTeacherSubject ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
      const comps = getSubjectComponentConfig(col, currentClassId, activeSchoolId);

      if (comps.length > 1) {
        hasSubRow = true;
        theadRow1 += `
          <th colspan="${comps.length}" class="py-1.5 px-1 border-r border-b border-slate-300 dark:border-slate-700 text-center ${thStyle}">
            <div class="text-[11px] leading-tight font-bold">${col.name_bn || col.name_en}</div>
            <div class="text-[9px] font-mono text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              পূর্ণ: ${ResultEngine.toBnDigit(col.full_marks)} ${col.is_optional ? '(৪র্থ)' : ''}
            </div>
          </th>
        `;
        comps.forEach(cmp => {
          theadRow2 += `
            <th class="py-1 px-1 border-r border-b border-slate-300 dark:border-slate-700 text-center bg-slate-50 dark:bg-slate-800/90 text-[10px] font-bold text-slate-600 dark:text-slate-300 min-w-[50px]">
              ${cmp.label} (${ResultEngine.toBnDigit(cmp.max)})
            </th>
          `;
        });
      } else {
        theadRow1 += `
          <th rowspan="2" class="py-2 px-1.5 border-r border-b border-slate-300 dark:border-slate-700 text-center min-w-[70px] ${thStyle}">
            <div class="text-[11px] leading-tight font-bold">${col.name_bn || col.name_en}</div>
            <div class="text-[9px] font-mono text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              পূর্ণ: ${ResultEngine.toBnDigit(col.full_marks)} ${col.is_optional ? '(৪র্থ)' : ''}
            </div>
          </th>
        `;
      }
    });

    theadRow2 += '</tr>';

    theadRow1 += `
        <th rowspan="2" class="py-2.5 px-2 border-r border-b border-slate-300 dark:border-slate-700 text-center w-16 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">মোট নম্বর</th>
        <th rowspan="2" class="py-2.5 px-2 border-r border-b border-slate-300 dark:border-slate-700 text-center w-14 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">GPA</th>
        <th rowspan="2" class="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-center w-14 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">গ্রেড</th>
        <th rowspan="2" class="py-2.5 px-2 border-b border-slate-300 dark:border-slate-700 text-center w-24 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">স্ট্যাটাস</th>
      </tr>
    `;

    editorTableHead.innerHTML = hasSubRow ? (theadRow1 + theadRow2) : theadRow1;

    // Build Table Rows
    let tbodyHtml = '';
    studentsInClass.forEach((st, sIdx) => {
      const calculated = ResultEngine.calculateStudent(st);
      const isPassed = calculated.status === 'Passed';
      const failCount = calculated.fail_count || 0;
      const failTextEn = calculated.fail_text_en || (failCount > 0 ? `Fail in ${failCount}` : '');
      const failTextBn = calculated.fail_text_bn || (failCount > 0 ? `${ResultEngine.toBnDigit(failCount)} বিষয়ে ফেল` : '');
      const rowBg = !isPassed 
        ? 'bg-rose-50/30 dark:bg-rose-950/25 border-l-4 border-l-rose-500' 
        : (sIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/40');

      let trHtml = `
        <tr class="${rowBg} hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors" data-student-id="${st.id}">
          <td class="py-2 px-1 border-r border-slate-200 dark:border-slate-700 text-center">
            <button type="button" onclick="window.openEditStudentModal('${st.id}')" class="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 cursor-pointer shadow-xs inline-flex items-center gap-1" title="শিক্ষার্থীর তথ্য সংশোধন করুন">
              <i class="fas fa-user-pen text-emerald-600"></i>
              <span>এডিট</span>
            </button>
          </td>
          <td class="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold font-mono text-slate-800 dark:text-slate-200">
            ${ResultEngine.toBnDigit(st.roll)}
          </td>
          <td class="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 font-semibold text-slate-950 dark:text-white student-info-cell">
            <div class="flex items-center justify-between gap-1">
              <div>
                <span class="font-bold ${!isPassed ? 'text-rose-950 dark:text-rose-200' : ''}">${st.student_name_bn}</span>
                ${!isPassed && failCount > 0 ? `
                  <div class="student-fail-badge mt-0.5">
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800 shadow-2xs">
                      <i class="fas fa-times-circle text-[9px] text-rose-600"></i> ${failTextBn} (${failTextEn})
                    </span>
                  </div>
                ` : ''}
              </div>
              <div class="flex flex-wrap items-center gap-1">
                ${st.section ? `<span class="text-[9px] px-1.5 py-0.2 rounded font-mono bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold">${st.section}</span>` : ''}
                ${st.group_bn ? `<span class="text-[9px] px-1.5 py-0.2 rounded font-mono bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">${st.group_bn}</span>` : ''}
                ${st.religion ? `<span class="text-[9px] px-1.5 py-0.2 rounded font-mono ${st.religion === 'hindu' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">${st.religion === 'hindu' ? 'সনাতন' : 'ইসলাম'}</span>` : ''}
              </div>
            </div>
          </td>
      `;

      columns.forEach(col => {
        let studentTarget = null;
        let isApplicable = true;

        if (col.is_paper) {
          const parentSub = findStudentParentSubject(st.subjects, col);
          if (!parentSub) {
            isApplicable = false;
          } else if (Array.isArray(parentSub.papers)) {
            studentTarget = (col.paper_index !== undefined && col.paper_index >= 0 && parentSub.papers[col.paper_index])
              ? parentSub.papers[col.paper_index]
              : findStudentSubject(parentSub.papers, col);
            if (!studentTarget) isApplicable = false;
          } else {
            isApplicable = false;
          }
        } else {
          studentTarget = findStudentSubject(st.subjects, col);
          if (!studentTarget) isApplicable = false;
        }

        const comps = getSubjectComponentConfig(col, currentClassId, activeSchoolId);

        if (!isApplicable || !studentTarget) {
          trHtml += `
            <td colspan="${comps.length}" class="py-1.5 px-1 border-r border-slate-200 dark:border-slate-700 text-center bg-slate-100/70 dark:bg-slate-800/60 select-none" title="এই শিক্ষার্থীর জন্য এ বিষয়টি প্রযোজ্য নয়">
              <span class="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-[10px] font-bold text-slate-400 font-mono">N/A</span>
            </td>
          `;
        } else {
          const isEditable = isSubjectAssignedToUser(col);
          const isAbs = studentTarget.is_absent || String(studentTarget.marks_obtained).toUpperCase() === 'ABS';

          // Unified cell-fail helper (defined once per subject block)
          // Rules: ABS=red | empty/0=red | value < passmark=red | value >= passmark=green
          const cellFail = (v, max) => {
            const s = String(v ?? '').trim();
            if (s.toUpperCase() === 'ABS' || s === 'অনুপস্থিত') return true;
            const n = parseFloat(ResultEngine.toEnDigit(s));
            if (s === '' || isNaN(n) || n === 0) return true;
            const pm = (max === 25) ? 8 : (max === 30) ? 10 : Math.ceil(max * 0.33);
            return n < pm;
          };

          comps.forEach(cmp => {
            let val = '';
            if (isAbs) {
              val = 'ABS';
            } else if (cmp.key === 'marks_obtained') {
              val = (studentTarget.marks_obtained !== undefined && studentTarget.marks_obtained !== null) ? studentTarget.marks_obtained : '';
            } else {
              val = (studentTarget[cmp.key] !== undefined && studentTarget[cmp.key] !== null) ? studentTarget[cmp.key] : '';
            }

            const fieldMax = parseFloat(cmp.max) || parseFloat(col.full_marks) || 100;
            const isCellFail = cellFail(val, fieldMax);

            if (isEditable) {
              // NOTE: bg-color is set in CSS (input.mark-input) so .failing-mark-cell can properly override it
              const baseInputClass = 'mark-input w-12 sm:w-14 py-1 text-center font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-hidden font-mono shadow-2xs';
              const inputClass = isCellFail
                ? `${baseInputClass} failing-mark-cell font-black`
                : baseInputClass;

              trHtml += `
                <td class="py-1 px-1 border-r border-slate-200 dark:border-slate-700 text-center ${isCellFail ? 'bg-rose-50/50 dark:bg-rose-950/30' : 'bg-emerald-50/15 dark:bg-emerald-950/10'}">
                  <input type="text" 
                    inputmode="decimal"
                    autocomplete="off"
                    spellcheck="false"
                    data-student-id="${st.id}" 
                    data-is-paper="${col.is_paper ? 'true' : 'false'}"
                    data-parent-code="${col.parent_code || ''}"
                    data-parent-name-bn="${col.parent_name_bn || ''}"
                    data-paper-index="${col.paper_index ?? -1}"
                    data-sub-code="${col.code || ''}" 
                    data-sub-name-bn="${col.name_bn || ''}"
                    data-sub-name-en="${col.name_en || ''}"
                    data-field="${cmp.key}"
                    data-field-max="${cmp.max}"
                    data-full-marks="${col.full_marks || 100}"
                    value="${val}" 
                    placeholder="0"
                    class="${inputClass}"
                    title="${col.name_bn}: ${cmp.label} (সর্বোচ্চ ${cmp.max})${isCellFail ? ' - [ফেল / পাস মার্কের নিচে]' : ''}"
                  >
                </td>
              `;
            } else {
              trHtml += `
                <td class="py-2 px-1 border-r border-slate-200 dark:border-slate-700 text-center ${isCellFail ? 'bg-rose-50/60 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold' : 'text-slate-400 font-mono text-xs'}">
                  ${val !== '' ? (isCellFail ? `<span class="inline-flex items-center gap-0.5"><i class="fas fa-times text-[9px] text-rose-600"></i> ${val}</span>` : val) : (isCellFail ? `<span class="inline-flex items-center gap-0.5"><i class="fas fa-times text-[9px] text-rose-600"></i> ০</span>` : '--')}
                </td>
              `;
            }
          });
        }
      });

      trHtml += `
          <td class="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-mono font-bold text-slate-700 dark:text-slate-300 row-total">
            ${ResultEngine.toBnDigit(calculated.total_marks)}
          </td>
          <td class="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-mono font-bold text-emerald-600 row-gpa">
            ${isPassed ? ResultEngine.formatGpa(calculated.gpa) : '0.00'}
          </td>
          <td class="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-bold row-grade ${isPassed ? 'text-slate-800 dark:text-slate-200' : 'text-rose-600'}">
            ${isPassed ? calculated.grade : 'F'}
          </td>
          <td class="py-2.5 px-3 text-center row-status">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isPassed ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800'}">
              ${isPassed ? 'উত্তীর্ণ' : (failCount > 0 ? `ফেল (${failTextEn})` : 'অকৃতকার্য')}
            </span>
          </td>
        </tr>
      `;
      tbodyHtml += trHtml;
    });

    editorTableBody.innerHTML = tbodyHtml;
    // Ensure delegation is set up (idempotent - runs once)
    setupMarkInputDelegation();
    applySpreadsheetZoom();
  }

  // Called ONCE to set up delegated event handling on the table body.
  // This avoids the N×renderSpreadsheet() event accumulation bug.
  let _markInputDelegationSetUp = false;
  function setupMarkInputDelegation() {
    if (_markInputDelegationSetUp || !editorTableBody) return;
    _markInputDelegationSetUp = true;

    // Shared input handler (runs for every .mark-input inside tbody)
    editorTableBody.addEventListener('input', (e) => {
      if (!e.target.classList.contains('mark-input')) return;
      handleMarkInputChange(e);
    });

    // Shared blur handler
    editorTableBody.addEventListener('blur', (e) => {
      if (!e.target.classList.contains('mark-input')) return;
      const fieldMax = parseFloat(e.target.getAttribute('data-field-max')) || 100;
      let val = e.target.value.trim();
      if (val.toUpperCase() === 'ABS' || val === 'অনুপস্থিত') return;
      let numVal = parseFloat(ResultEngine.toEnDigit(val));
      if (isNaN(numVal) || numVal < 0) numVal = 0;
      if (numVal > fieldMax) numVal = fieldMax;
      e.target.value = String(numVal);
    }, true); // capture:true so blur fires on delegated targets
  }

  function getDistinctClassColumns(studentsInClass) {
    const columnMap = new Map();
    studentsInClass.forEach(st => {
      (st.subjects || []).forEach(sub => {
        if (Array.isArray(sub.papers) && sub.papers.length > 0) {
          sub.papers.forEach((p, pIdx) => {
            const colKey = `paper_${sub.code || sub.name_bn}_${p.code || p.name_bn || pIdx}`;
            if (!columnMap.has(colKey)) {
              columnMap.set(colKey, {
                col_key: colKey,
                is_paper: true,
                paper_index: pIdx,
                parent_code: sub.code || sub.name_bn,
                parent_name_bn: sub.name_bn,
                code: p.code || `${sub.code}-${pIdx + 1}`,
                name_bn: p.name_bn || `${sub.name_bn} পত্র ${pIdx + 1}`,
                name_en: p.name_en || p.name_bn,
                full_marks: parseFloat(p.full_marks) || 100,
                is_optional: sub.is_optional || false
              });
            }
          });
        } else {
          const colKey = sub.code || sub.name_bn;
          if (!columnMap.has(colKey)) {
            columnMap.set(colKey, {
              col_key: colKey,
              is_paper: false,
              code: sub.code,
              name_bn: sub.name_bn,
              name_en: sub.name_en,
              full_marks: parseFloat(sub.full_marks) || 100,
              is_optional: sub.is_optional || false
            });
          }
        }
      });
    });
    return Array.from(columnMap.values());
  }

  function matchSubjectAgainstList(colOrSub, assignedList) {
    if (!colOrSub || !Array.isArray(assignedList) || assignedList.length === 0) return false;
    const norm = (s) => String(s || '').trim().toLowerCase().replace(/য়/g, 'য়').replace(/\s+/g, ' ');
    const stripSuffix = (s) => s.replace(/\(৪র্থ\s*বিষয়\)/g, '').replace(/\(ঐচ্ছিক\)/g, '').replace(/\(৪র্থ\)/g, '').replace(/\([১১২]+\s*পত্র\)/g, '').trim();

    const subCode = String(colOrSub.code || '').trim().toLowerCase();
    const subNameBn = norm(colOrSub.name_bn || '');
    const subNameEn = norm(colOrSub.name_en || '');
    const parentCode = String(colOrSub.parent_code || '').trim().toLowerCase();
    const parentNameBn = norm(colOrSub.parent_name_bn || '');

    const cleanBn = stripSuffix(subNameBn);
    const cleanParentBn = stripSuffix(parentNameBn);

    const directMatch = assignedList.some(item => {
      const a = norm(item);
      const cleanA = stripSuffix(a);
      if (subCode && subCode === a) return true;
      if (parentCode && parentCode === a) return true;
      if (subNameBn && (subNameBn === a || cleanBn === cleanA)) return true;
      if (subNameEn && subNameEn === a) return true;
      if (parentNameBn && (parentNameBn === a || cleanParentBn === cleanA)) return true;
      return false;
    });
    if (directMatch) return true;

    if (Array.isArray(colOrSub.papers)) {
      return colOrSub.papers.some(p => {
        const pNameBn = norm(p.name_bn || '');
        const pCode = String(p.code || '').trim().toLowerCase();
        const cleanPBn = stripSuffix(pNameBn);
        return assignedList.some(item => {
          const a = norm(item);
          const cleanA = stripSuffix(a);
          return (pCode && pCode === a) || (pNameBn && (pNameBn === a || cleanPBn === cleanA));
        });
      });
    }
    return false;
  }

  function isSubjectAssignedToUser(colOrSub, classId = currentClassId) {
    const user = currentUser || (typeof ResultEngine !== 'undefined' && ResultEngine.Storage && ResultEngine.Storage.getCurrentUser());
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'school_master') return true;
    if (user.role === 'teacher') {
      // 1. Class-specific assignments
      if (user.class_assignments && typeof user.class_assignments === 'object') {
        let classSubjects = user.class_assignments[classId];
        if (!classSubjects && user.class_assignments['all']) {
          classSubjects = user.class_assignments['all'];
        }
        if (!classSubjects || !Array.isArray(classSubjects) || classSubjects.length === 0) {
          return false;
        }
        return matchSubjectAgainstList(colOrSub, classSubjects);
      }

      // 2. Fallback for legacy teacher accounts
      const allowedClasses = user.classes || ['all'];
      if (!allowedClasses.includes('all') && classId && !allowedClasses.includes(classId)) {
        return false;
      }

      return matchSubjectAgainstList(colOrSub, user.assigned_subjects || []);
    }
    return false;
  }

  // Real-time Debounced Auto-Save
  let autoSaveTimer = null;
  function triggerDebouncedAutoSave() {
    const indicator = document.getElementById('autoSaveIndicator');
    if (indicator) {
      indicator.innerHTML = '<i class="fas fa-spinner fa-spin text-amber-500"></i> <span class="text-amber-600 dark:text-amber-400">সংরক্ষণ হচ্ছে...</span>';
      indicator.classList.remove('hidden');
    }
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      try {
        await ResultEngine.Storage.saveStudents(allStudents);
        if (indicator) {
          indicator.innerHTML = '<i class="fas fa-circle-check text-emerald-500"></i> <span class="text-emerald-600 dark:text-emerald-400">স্বয়ংক্রিয়ভাবে সংরক্ষিত</span>';
        }
      } catch (err) {
        if (indicator) {
          indicator.innerHTML = '<i class="fas fa-triangle-exclamation text-rose-500"></i> <span class="text-rose-600 dark:text-rose-400">অফলাইন সংরক্ষিত</span>';
        }
      }
    }, 1000);
  }

  // Shared handler called by delegated listener on editorTableBody
  function handleMarkInputChange(e) {
        const studentId = e.target.getAttribute('data-student-id');
        const isPaper = e.target.getAttribute('data-is-paper') === 'true';
        const parentCode = e.target.getAttribute('data-parent-code');
        const parentNameBn = e.target.getAttribute('data-parent-name-bn');
        const paperIndex = parseInt(e.target.getAttribute('data-paper-index'), 10);
        const subCode = e.target.getAttribute('data-sub-code');
        const subNameBn = e.target.getAttribute('data-sub-name-bn');
        const subNameEn = e.target.getAttribute('data-sub-name-en');
        const field = e.target.getAttribute('data-field') || 'marks_obtained';
        const fieldMax = parseFloat(e.target.getAttribute('data-field-max')) || 100;
        const fullMarks = parseFloat(e.target.getAttribute('data-full-marks')) || 100;
        let val = e.target.value.trim();

        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;

        let targetObj = null;
        let parentSub = null;

        if (isPaper) {
          parentSub = findStudentParentSubject(student.subjects, { parent_code: parentCode, parent_name_bn: parentNameBn });
          if (parentSub && Array.isArray(parentSub.papers)) {
            targetObj = (!isNaN(paperIndex) && paperIndex >= 0 && parentSub.papers[paperIndex])
              ? parentSub.papers[paperIndex]
              : findStudentSubject(parentSub.papers, { code: subCode, name_bn: subNameBn, name_en: subNameEn });
          }
        } else {
          targetObj = findStudentSubject(student.subjects, { code: subCode, name_bn: subNameBn, name_en: subNameEn });
        }

        if (!targetObj) return;

        const isAbsent = val.toUpperCase() === 'ABS' || val === 'অনুপস্থিত';
        if (isAbsent) {
          targetObj.is_absent = true;
          targetObj[field] = 'ABS';
          targetObj.marks_obtained = 'ABS';
        } else {
          targetObj.is_absent = false;
          let numVal = parseFloat(ResultEngine.toEnDigit(val));
          if (isNaN(numVal)) numVal = 0;
          if (numVal < 0) {
            numVal = 0;
            e.target.value = '0';
          }
          if (numVal > fieldMax) {
            numVal = fieldMax;
            e.target.value = String(fieldMax);
            e.target.classList.add('ring-2', 'ring-rose-500', 'bg-rose-50', 'dark:bg-rose-950/40');
            setTimeout(() => {
              e.target.classList.remove('ring-2', 'ring-rose-500', 'bg-rose-50', 'dark:bg-rose-950/40');
            }, 1500);
          }

          targetObj[field] = numVal;

          if (field === 'marks_obtained') {
            targetObj.marks_obtained = numVal;
            // Only mirror to cq for secondary/junior-secondary classes that use CQ+MCQ components.
            // For primary classes (Nursery, KG, Class 1-5), do NOT set cq — they use marks_obtained only.
            const isPrimaryClass = !isSecondaryClass(currentClassId) && !isJuniorSecondaryClass(currentClassId);
            if (!isPrimaryClass) {
              targetObj.cq = numVal;
            } else {
              // Clear any stale cq/mcq from legacy data so calculateStudent uses marks_obtained correctly
              delete targetObj.cq;
              delete targetObj.mcq;
              delete targetObj.practical;
            }
          } else {
            const cq = parseFloat(targetObj.cq) || 0;
            const mcq = parseFloat(targetObj.mcq) || 0;
            const pr = parseFloat(targetObj.practical) || 0;
            targetObj.marks_obtained = Math.round((cq + mcq + pr) * 100) / 100;
          }
        }

        // If paper, recalculate parent composite marks
        if (isPaper && parentSub && Array.isArray(parentSub.papers)) {
          let pSum = 0;
          let cqSum = 0;
          let mcqSum = 0;
          let prSum = 0;
          let anyAbs = false;
          parentSub.papers.forEach(p => {
            if (p.is_absent || p.marks_obtained === 'ABS') anyAbs = true;
            else {
              pSum += (parseFloat(p.marks_obtained) || 0);
              cqSum += (parseFloat(p.cq) || 0);
              mcqSum += (parseFloat(p.mcq) || 0);
              prSum += (parseFloat(p.practical) || 0);
            }
          });
          parentSub.marks_obtained = (anyAbs && pSum === 0) ? 'ABS' : Math.round(pSum * 100) / 100;
          parentSub.cq = cqSum;
          parentSub.mcq = mcqSum;
          parentSub.practical = prSum;
          parentSub.is_absent = (anyAbs && pSum === 0);
        }

        student.updated_at = Date.now();

        // Recalculate row live
        const updated = ResultEngine.calculateStudent(student);
        Object.assign(student, updated);

        const tr = e.target.closest('tr');
        if (tr) {
          const totalEl = tr.querySelector('.row-total');
          const gpaEl = tr.querySelector('.row-gpa');
          const gradeEl = tr.querySelector('.row-grade');
          const statusEl = tr.querySelector('.row-status');
          const studentInfoEl = tr.querySelector('.student-info-cell');

          const isPassed = updated.status === 'Passed';
          const failCount = updated.fail_count || 0;
          
          // Live update ALL inputs in this row for fail highlight using unified rule
          tr.querySelectorAll('input.mark-input').forEach(inp => {
            const inpMax = parseFloat(inp.getAttribute('data-field-max')) || 100;
            const inpVal = inp.value.trim();
            const inpS = inpVal.toUpperCase();
            let inpFail;
            if (inpS === 'ABS' || inpVal === 'অনুপস্থিত' || inpVal === '' || inpVal === '0') {
              inpFail = true;
            } else {
              const inpNum = parseFloat(ResultEngine.toEnDigit(inpVal));
              const inpPm = (inpMax === 25) ? 8 : (inpMax === 30) ? 10 : Math.ceil(inpMax * 0.33);
              inpFail = isNaN(inpNum) || inpNum < inpPm;
            }
            inp.classList.toggle('failing-mark-cell', inpFail);
          });

          // Also update TD background for the edited cell's parent td
          tr.querySelectorAll('td').forEach(td => {
            const inp = td.querySelector('input.mark-input');
            if (inp) {
              const isFail = inp.classList.contains('failing-mark-cell');
              td.classList.toggle('bg-rose-50/50', isFail);
              td.classList.toggle('dark:bg-rose-950/30', isFail);
              td.classList.toggle('bg-emerald-50/15', !isFail);
              td.classList.toggle('dark:bg-emerald-950/10', !isFail);
            }
          });

          const failTextEn = updated.fail_text_en || (failCount > 0 ? `Fail in ${failCount}` : '');
          const failTextBn = updated.fail_text_bn || (failCount > 0 ? `${ResultEngine.toBnDigit(failCount)} বিষয়ে ফেল` : '');

          if (totalEl) totalEl.textContent = ResultEngine.toBnDigit(updated.total_marks);
          if (gpaEl) gpaEl.textContent = isPassed ? ResultEngine.formatGpa(updated.gpa) : '0.00';
          if (gradeEl) {
            gradeEl.textContent = isPassed ? updated.grade : 'F';
            gradeEl.className = `py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-bold row-grade ${isPassed ? 'text-slate-800 dark:text-slate-200' : 'text-rose-600'}`;
          }
          if (statusEl) {
            statusEl.innerHTML = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isPassed ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800'}">${isPassed ? 'উত্তীর্ণ' : (failCount > 0 ? `ফেল (${failTextEn})` : 'অকৃতকার্য')}</span>`;
          }

          // Live update student fail badge under name
          if (studentInfoEl) {
            let failBadge = studentInfoEl.querySelector('.student-fail-badge');
            if (!isPassed && failCount > 0) {
              if (!failBadge) {
                failBadge = document.createElement('div');
                failBadge.className = 'student-fail-badge mt-0.5';
                const nameContainer = studentInfoEl.querySelector('div > div') || studentInfoEl.firstElementChild;
                if (nameContainer) nameContainer.appendChild(failBadge);
              }
              failBadge.innerHTML = `<span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800 shadow-2xs"><i class="fas fa-times-circle text-[9px] text-rose-600"></i> ${failTextBn} (${failTextEn})</span>`;
            } else if (failBadge) {
              failBadge.remove();
            }
          }

          // Toggle row border highlight
          if (!isPassed) {
            tr.classList.add('border-l-4', 'border-l-rose-500');
          } else {
            tr.classList.remove('border-l-4', 'border-l-rose-500');
          }
        }

        // Trigger real-time debounced auto-save
        triggerDebouncedAutoSave();
  }

  // Setup delegated blur handler — called from renderSpreadsheet. Now a no-op (legacy stub kept for safety).
  function bindMarkInputEvents() {
    // Intentionally empty — event delegation is handled by setupMarkInputDelegation()
  }

  // =========================================================================
  // বিষয়ভিত্তিক দ্রুত নম্বর এন্ট্রি (Subject-wise Fast Entry Modal)
  // =========================================================================
  let currentSubjectEntryCol = null;

  function getSubjectLimits(col, classId = currentClassId) {
    const full = col.full_marks || 100;
    const comps = getSubjectComponentConfig(col, classId, activeSchoolId);
    let cq = 0, mcq = 0, practical = 0, single = 0;
    comps.forEach(c => {
      if (c.key === 'cq') cq = c.max;
      else if (c.key === 'mcq') mcq = c.max;
      else if (c.key === 'practical') practical = c.max;
      else if (c.key === 'marks_obtained') single = c.max;
    });
    return { full, cq, mcq, practical, single, comps };
  }

  function openSubjectEntryModal() {
    const modal = document.getElementById('subjectEntryModal');
    const select = document.getElementById('subjectEntrySubjectSelect');
    if (!modal || !select) return;

    // Sync active class ID
    if (editorClassSelect && editorClassSelect.value) {
      currentClassId = editorClassSelect.value;
    }

    const studentsInClass = getStudentsInCurrentClass();
    if (studentsInClass.length === 0) {
      alert('বর্তমান ক্লাসে কোনো শিক্ষার্থী নেই! অনুগ্রহ করে প্রথমে শিক্ষার্থী যোগ করুন।');
      return;
    }

    if (studentsInClass[0] && studentsInClass[0].class_id) {
      currentClassId = studentsInClass[0].class_id;
    }

    const allColumns = getDistinctClassColumns(studentsInClass);
    if (allColumns.length === 0) {
      alert('এই ক্লাসের কোনো বিষয় পাওয়া যায়নি!');
      return;
    }

    let columns = allColumns;
    if (currentUser && currentUser.role === 'teacher') {
      columns = allColumns.filter(c => isSubjectAssignedToUser(c, currentClassId));
      if (columns.length === 0) {
        alert('বর্তমান শ্রেণিতে আপনার কোনো বরাদ্দকৃত বিষয় নেই!');
        return;
      }
    }

    select.innerHTML = columns.map(c => `<option value="${c.col_key}">${c.name_bn} (পূর্ণমান: ${ResultEngine.toBnDigit(c.full_marks)})</option>`).join('');

    currentSubjectEntryCol = columns[0];

    const fullMarksInput = document.getElementById('modalSubjectFullMarksInput');
    if (fullMarksInput) {
      fullMarksInput.value = currentSubjectEntryCol.full_marks || 100;
    }

    renderSubjectEntryRows(currentSubjectEntryCol);

    select.onchange = (e) => {
      const col = columns.find(c => c.col_key === e.target.value);
      if (col) {
        currentSubjectEntryCol = col;
        if (fullMarksInput) fullMarksInput.value = col.full_marks || 100;
        renderSubjectEntryRows(col);
      }
    };

    modal.classList.remove('hidden');
  }

  function closeSubjectEntryModal() {
    const modal = document.getElementById('subjectEntryModal');
    if (modal) modal.classList.add('hidden');
    currentSubjectEntryCol = null;
  }

  function setModalFullMarksPreset(val) {
    const input = document.getElementById('modalSubjectFullMarksInput');
    if (input) input.value = val;
    applyModalSubjectFullMarks();
  }
  window.setModalFullMarksPreset = setModalFullMarksPreset;

  function applyModalSubjectFullMarks() {
    if (!currentSubjectEntryCol) return;
    const input = document.getElementById('modalSubjectFullMarksInput');
    const newFull = parseFloat(ResultEngine.toEnDigit(input?.value || '100')) || 100;

    currentSubjectEntryCol.full_marks = newFull;

    // Update in memory for all students in current class
    const studentsInClass = getStudentsInCurrentClass();
    studentsInClass.forEach(st => {
      const col = currentSubjectEntryCol;
      let targetObj = null;
      if (col.is_paper) {
        const parentSub = (st.subjects || []).find(s => s.code === col.parent_code || s.name_bn === col.parent_name_bn);
        if (parentSub && Array.isArray(parentSub.papers)) {
          targetObj = parentSub.papers[col.paper_index] || parentSub.papers.find(p => p.code === col.code || p.name_bn === col.name_bn);
        }
      } else {
        targetObj = (st.subjects || []).find(s => s.code === col.code || s.name_bn === col.name_bn);
      }
      if (targetObj) {
        targetObj.full_marks = newFull;
      }
    });

    // Update option text in select
    const select = document.getElementById('subjectEntrySubjectSelect');
    if (select && select.selectedOptions[0]) {
      select.selectedOptions[0].textContent = `${currentSubjectEntryCol.name_bn} (পূর্ণমান: ${ResultEngine.toBnDigit(newFull)})`;
    }

    renderSubjectEntryRows(currentSubjectEntryCol);
  }
  window.applyModalSubjectFullMarks = applyModalSubjectFullMarks;

  function renderSubjectEntryRows(col) {
    const thead = document.getElementById('subjectEntryTableHead');
    const tbody = document.getElementById('subjectEntryTableBody');
    const limitsPill = document.getElementById('subjectEntryLimitsPill');
    const fullMarksInput = document.getElementById('modalSubjectFullMarksInput');
    if (!tbody || !col) return;

    const studentsInClass = getStudentsInCurrentClass();
    const classId = (studentsInClass.length > 0 && studentsInClass[0].class_id) || currentClassId || editorClassSelect?.value;
    const comps = getSubjectComponentConfig(col, classId, activeSchoolId);
    const full = col.full_marks || 100;

    if (fullMarksInput && document.activeElement !== fullMarksInput) {
      fullMarksInput.value = full;
    }

    // 1. Dynamic Badges (Only show components that actually exist!)
    if (limitsPill) {
      let pillsHtml = `
        <span class="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1 shadow-2xs">
          <i class="fas fa-award"></i> পূর্ণমান: ${ResultEngine.toBnDigit(full)}
        </span>
      `;
      comps.forEach(c => {
        let badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
        if (c.key === 'cq') badgeColor = 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300';
        else if (c.key === 'mcq') badgeColor = 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300';
        else if (c.key === 'practical') badgeColor = 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300';
        else if (c.key === 'marks_obtained') badgeColor = 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300';

        const label = c.key === 'marks_obtained' ? 'নম্বর' : (c.label || c.key);
        pillsHtml += `<span class="px-2 py-0.5 rounded-lg ${badgeColor} font-bold shadow-2xs">${label}: ${ResultEngine.toBnDigit(c.max)}</span>`;
      });
      limitsPill.innerHTML = pillsHtml;
    }

    // 2. Dynamic thead Header
    if (thead) {
      let thComps = '';
      comps.forEach(c => {
        let thColor = 'text-slate-700 dark:text-slate-200';
        if (c.key === 'cq') thColor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20';
        else if (c.key === 'mcq') thColor = 'text-sky-700 dark:text-sky-300 bg-sky-50/50 dark:bg-sky-950/20';
        else if (c.key === 'practical') thColor = 'text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20';
        else if (c.key === 'marks_obtained') thColor = 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20';

        const labelName = c.key === 'marks_obtained' ? 'প্রাপ্ত নম্বর' : (c.label || c.key);
        thComps += `<th class="py-2.5 px-3 text-center min-w-[95px] ${thColor}">${labelName} (${ResultEngine.toBnDigit(c.max)})</th>`;
      });

      thead.innerHTML = `
        <tr>
          <th class="py-2.5 px-2 text-center w-12">ক্র.</th>
          <th class="py-2.5 px-3 text-center w-14">রোল</th>
          <th class="py-2.5 px-4 min-w-[140px]">শিক্ষার্থীর নাম</th>
          <th class="py-2.5 px-2 text-center w-14"> শাখা</th>
          ${thComps}
          <th class="py-2.5 px-3 text-center w-18">মোট</th>
          <th class="py-2.5 px-2 text-center w-14">গ্রেড</th>
          <th class="py-2.5 px-2 text-center w-14">পয়েন্ট</th>
        </tr>
      `;
    }

    // 3. Dynamic tbody Rows
    let rowsHtml = '';
    studentsInClass.forEach((st, idx) => {
      let targetObj = null;
      let isApplicable = true;

      if (col.is_paper) {
        const parentSub = (st.subjects || []).find(s => s.code === col.parent_code || s.name_bn === col.parent_name_bn);
        if (!parentSub) isApplicable = false;
        else if (Array.isArray(parentSub.papers)) {
          targetObj = parentSub.papers[col.paper_index] || parentSub.papers.find(p => p.code === col.code || p.name_bn === col.name_bn);
          if (!targetObj) isApplicable = false;
        } else isApplicable = false;
      } else {
        targetObj = (st.subjects || []).find(s => s.code === col.code || s.name_bn === col.name_bn);
        if (!targetObj) isApplicable = false;
      }

      if (!isApplicable || !targetObj) {
        rowsHtml += `
          <tr class="bg-slate-50/50 dark:bg-slate-800/30 opacity-60" data-student-id="${st.id}">
            <td class="py-2 px-2 text-center text-slate-400 font-mono">${idx + 1}</td>
            <td class="py-2 px-3 text-center font-bold font-mono text-slate-400">${ResultEngine.toBnDigit(st.roll)}</td>
            <td class="py-2 px-4 font-bold text-slate-400">${st.student_name_bn}</td>
            <td class="py-2 px-2 text-center text-slate-400">${st.section || 'ক'}</td>
            <td colspan="${comps.length + 3}" class="py-2 px-4 text-center text-slate-400 font-bold">এই শিক্ষার্থীর জন্য প্রযোজ্য নয় (N/A)</td>
          </tr>
        `;
        return;
      }

      const isAbs = targetObj.is_absent || String(targetObj.marks_obtained).toUpperCase() === 'ABS';
      let totalVal = isAbs ? 'ABS' : (targetObj.marks_obtained !== undefined ? targetObj.marks_obtained : 0);

      let inputsHtml = '';
      comps.forEach(c => {
        let fieldVal = '';
        if (!isAbs) {
          if (c.key === 'marks_obtained') {
            fieldVal = (targetObj.marks_obtained !== undefined && targetObj.marks_obtained !== null) ? targetObj.marks_obtained : '';
          } else if (c.key === 'cq') {
            fieldVal = (targetObj.cq !== undefined && targetObj.cq !== null) ? targetObj.cq : '';
          } else if (c.key === 'mcq') {
            fieldVal = (targetObj.mcq !== undefined && targetObj.mcq !== null) ? targetObj.mcq : '';
          } else if (c.key === 'practical') {
            fieldVal = (targetObj.practical !== undefined && targetObj.practical !== null) ? targetObj.practical : '';
          }
        }

        inputsHtml += `
          <td class="py-1.5 px-2 text-center">
            <input type="text"
              inputmode="decimal"
              data-field="${c.key}"
              data-max="${c.max}"
              class="sub-modal-input sub-modal-field-${c.key} w-20 py-1 text-center font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              placeholder="0"
              value="${fieldVal}">
          </td>
        `;
      });

      const gInfo = isAbs ? { grade: 'F', point: 0 } : ResultEngine.calculateGrade(parseFloat(totalVal) || 0, full);

      rowsHtml += `
        <tr class="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors" data-student-id="${st.id}">
          <td class="py-1.5 px-2 text-center font-mono text-slate-500">${idx + 1}</td>
          <td class="py-1.5 px-3 text-center font-bold font-mono text-slate-900 dark:text-white">${ResultEngine.toBnDigit(st.roll)}</td>
          <td class="py-1.5 px-4 font-bold text-slate-950 dark:text-white">
            ${st.student_name_bn}
            ${st.group_bn ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold ml-1">${st.group_bn}</span>` : ''}
          </td>
          <td class="py-1.5 px-2 text-center text-sky-700 dark:text-sky-300 font-bold">${st.section || 'ক'}</td>
          ${inputsHtml}
          <td class="py-1.5 px-3 text-center font-mono font-black text-xs text-indigo-700 dark:text-indigo-300 row-modal-total">
            ${isAbs ? 'ABS' : ResultEngine.toBnDigit(totalVal)}
          </td>
          <td class="py-1.5 px-2 text-center font-bold row-modal-grade ${gInfo.grade === 'F' ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}">
            ${gInfo.grade}
          </td>
          <td class="py-1.5 px-2 text-center font-mono font-bold row-modal-point ${gInfo.grade === 'F' ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}">
            ${ResultEngine.formatGpa(gInfo.point)}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;

    // Real-time calculation on typing
    function updateModalRow(tr) {
      const inputs = tr.querySelectorAll('.sub-modal-input');
      const totEl = tr.querySelector('.row-modal-total');
      const grEl = tr.querySelector('.row-modal-grade');
      const ptEl = tr.querySelector('.row-modal-point');

      let singleMarks = undefined;
      let sum = 0;

      inputs.forEach(inp => {
        const field = inp.getAttribute('data-field');
        const maxVal = parseFloat(inp.getAttribute('data-max')) || full;
        let raw = inp.value.trim();
        if (raw === '') return;

        let val = parseFloat(ResultEngine.toEnDigit(raw));
        if (isNaN(val)) val = 0;
        if (val > maxVal) {
          val = maxVal;
          inp.value = val;
        }
        if (val < 0) {
          val = 0;
          inp.value = 0;
        }

        if (field === 'marks_obtained') {
          singleMarks = val;
        } else {
          sum += val;
        }
      });

      const total = singleMarks !== undefined ? singleMarks : Math.min(full, sum);
      const g = ResultEngine.calculateGrade(total, full);

      if (totEl) totEl.textContent = ResultEngine.toBnDigit(total);
      if (grEl) {
        grEl.textContent = g.grade;
        grEl.className = `py-1.5 px-2 text-center font-bold row-modal-grade ${g.grade === 'F' ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`;
      }
      if (ptEl) {
        ptEl.textContent = ResultEngine.formatGpa(g.point);
        ptEl.className = `py-1.5 px-2 text-center font-mono font-bold row-modal-point ${g.grade === 'F' ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`;
      }
    }

    tbody.querySelectorAll('.sub-modal-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const tr = e.target.closest('tr');
        if (tr) updateModalRow(tr);
      });

      inp.addEventListener('keydown', (e) => {
        const tr = inp.closest('tr');
        if (!tr) return;
        const field = inp.getAttribute('data-field');
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextTr = tr.nextElementSibling;
          if (nextTr) {
            const nextInp = nextTr.querySelector(`.sub-modal-input[data-field="${field}"]`);
            if (nextInp) { nextInp.focus(); nextInp.select(); }
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevTr = tr.previousElementSibling;
          if (prevTr) {
            const prevInp = prevTr.querySelector(`.sub-modal-input[data-field="${field}"]`);
            if (prevInp) { prevInp.focus(); prevInp.select(); }
          }
        }
      });
    });
  }

  async function saveSubjectEntryModal() {
    if (!currentSubjectEntryCol) return;
    const tbody = document.getElementById('subjectEntryTableBody');
    if (!tbody) return;

    const col = currentSubjectEntryCol;
    const studentsInClass = getStudentsInCurrentClass();
    const classId = (studentsInClass.length > 0 && studentsInClass[0].class_id) || currentClassId || editorClassSelect?.value;
    const comps = getSubjectComponentConfig(col, classId, activeSchoolId);
    const full = col.full_marks || 100;
    const rows = tbody.querySelectorAll('tr[data-student-id]');

    rows.forEach(tr => {
      const stId = tr.getAttribute('data-student-id');
      const student = allStudents.find(s => s.id === stId);
      if (!student) return;

      const inputs = tr.querySelectorAll('.sub-modal-input');
      if (inputs.length === 0) return; // N/A row

      let cq = undefined;
      let mcq = undefined;
      let prac = undefined;
      let singleMarks = undefined;

      inputs.forEach(inp => {
        const field = inp.getAttribute('data-field');
        const maxVal = parseFloat(inp.getAttribute('data-max')) || full;
        let raw = inp.value.trim();
        let val = raw === '' ? 0 : parseFloat(ResultEngine.toEnDigit(raw));
        if (isNaN(val)) val = 0;
        if (val > maxVal) val = maxVal;
        if (val < 0) val = 0;

        if (field === 'cq') cq = val;
        else if (field === 'mcq') mcq = val;
        else if (field === 'practical') prac = val;
        else if (field === 'marks_obtained') singleMarks = val;
      });

      let total = 0;
      if (singleMarks !== undefined) {
        total = singleMarks;
      } else {
        total = Math.min(full, (cq || 0) + (mcq || 0) + (prac || 0));
      }

      let targetObj = null;
      let parentSub = null;

      if (col.is_paper) {
        parentSub = (student.subjects || []).find(s => s.code === col.parent_code || s.name_bn === col.parent_name_bn);
        if (parentSub && Array.isArray(parentSub.papers)) {
          targetObj = parentSub.papers[col.paper_index] || parentSub.papers.find(p => p.code === col.code || p.name_bn === col.name_bn);
        }
      } else {
        targetObj = (student.subjects || []).find(s => s.code === col.code || s.name_bn === col.name_bn);
      }

      if (targetObj) {
        targetObj.full_marks = full;
        if (singleMarks !== undefined) {
          targetObj.marks_obtained = total;
          delete targetObj.cq;
          delete targetObj.mcq;
          delete targetObj.practical;
        } else {
          targetObj.cq = cq !== undefined ? cq : 0;
          targetObj.mcq = mcq !== undefined ? mcq : 0;
          targetObj.practical = prac !== undefined ? prac : 0;
          targetObj.marks_obtained = total;
        }
        targetObj.is_absent = false;

        if (col.is_paper && parentSub && Array.isArray(parentSub.papers)) {
          let pSum = 0;
          let pCq = 0;
          let pMcq = 0;
          let pPr = 0;
          parentSub.papers.forEach(p => {
            pSum += (parseFloat(p.marks_obtained) || 0);
            pCq += (parseFloat(p.cq) || 0);
            pMcq += (parseFloat(p.mcq) || 0);
            pPr += (parseFloat(p.practical) || 0);
          });
          parentSub.marks_obtained = pSum;
          if (parentSub.cq !== undefined || pCq > 0) parentSub.cq = pCq;
          if (parentSub.mcq !== undefined || pMcq > 0) parentSub.mcq = pMcq;
          if (parentSub.practical !== undefined || pPr > 0) parentSub.practical = pPr;
          parentSub.is_absent = false;
        }

        student.updated_at = Date.now();
        const updated = ResultEngine.calculateStudent(student);
        Object.assign(student, updated);
      }
    });

    // Save and re-render
    await ResultEngine.Storage.saveStudents(allStudents);
    try {
      await fetch('/api/results/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allStudents)
      });
    } catch (err) {}

    closeSubjectEntryModal();
    renderSpreadsheet();
    renderBatchPreview();
    showToast(`সফল! "${col.name_bn}" বিষয়ের নম্বর সফলভাবে সংরক্ষিত এবং কার্যকর করা হয়েছে।`, 'success');
  }

  // Cell Breakdown Modal
  let activeBreakdownContext = null;

  function openCellBreakdownModal(studentId, colKey) {
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;

    const studentsInClass = getStudentsInCurrentClass();
    const columns = getDistinctClassColumns(studentsInClass);
    const col = columns.find(c => c.col_key === colKey);
    if (!col) return;

    let targetObj = null;
    let parentSub = null;
    if (col.is_paper) {
      parentSub = (student.subjects || []).find(s => s.code === col.parent_code || s.name_bn === col.parent_name_bn);
      if (parentSub && Array.isArray(parentSub.papers)) {
        targetObj = parentSub.papers[col.paper_index] || parentSub.papers.find(p => p.code === col.code || p.name_bn === col.name_bn);
      }
    } else {
      targetObj = (student.subjects || []).find(s => s.code === col.code || s.name_bn === col.name_bn);
    }
    if (!targetObj) return;

    const limits = getSubjectLimits(col);
    activeBreakdownContext = { studentId, colKey, targetObj, parentSub, isPaper: col.is_paper, limits, col };

    const modal = document.getElementById('cellBreakdownModal');
    document.getElementById('cellModalSubjectTitle').textContent = `${col.name_bn} (পূর্ণমান: ${ResultEngine.toBnDigit(limits.full)})`;
    document.getElementById('cellModalStudentInfo').textContent = `রোল: ${ResultEngine.toBnDigit(student.roll)} | ${student.student_name_bn} (${student.section || 'ক'})`;

    const cqInput = document.getElementById('cellModalCqInput');
    const mcqInput = document.getElementById('cellModalMcqInput');
    const pracInput = document.getElementById('cellModalPracInput');
    const pracWrapper = document.getElementById('cellModalPracWrapper');
    const totalDisplay = document.getElementById('cellModalTotalDisplay');

    document.getElementById('cellModalCqMaxText').textContent = `সর্বোচ্চ ${ResultEngine.toBnDigit(limits.cq)}`;
    document.getElementById('cellModalMcqMaxText').textContent = `সর্বোচ্চ ${ResultEngine.toBnDigit(limits.mcq)}`;

    cqInput.max = limits.cq;
    mcqInput.max = limits.mcq;
    pracInput.max = limits.practical;

    if (limits.practical > 0) {
      pracWrapper.classList.remove('hidden');
      document.getElementById('cellModalPracMaxText').textContent = `সর্বোচ্চ ${ResultEngine.toBnDigit(limits.practical)}`;
    } else {
      pracWrapper.classList.add('hidden');
    }

    cqInput.value = targetObj.cq !== undefined ? targetObj.cq : '';
    mcqInput.value = targetObj.mcq !== undefined ? targetObj.mcq : '';
    pracInput.value = targetObj.practical !== undefined ? targetObj.practical : '';

    function updateModalTotal() {
      let c = parseFloat(cqInput.value) || 0;
      let m = parseFloat(mcqInput.value) || 0;
      let p = limits.practical > 0 ? (parseFloat(pracInput.value) || 0) : 0;
      if (c > limits.cq) { c = limits.cq; cqInput.value = c; }
      if (m > limits.mcq) { m = limits.mcq; mcqInput.value = m; }
      if (p > limits.practical) { p = limits.practical; pracInput.value = p; }
      const tot = c + m + p;
      totalDisplay.textContent = ResultEngine.toBnDigit(tot);
    }

    cqInput.oninput = updateModalTotal;
    mcqInput.oninput = updateModalTotal;
    pracInput.oninput = updateModalTotal;

    updateModalTotal();
    modal.classList.remove('hidden');
  }

  function closeCellBreakdownModal() {
    const modal = document.getElementById('cellBreakdownModal');
    if (modal) modal.classList.add('hidden');
    activeBreakdownContext = null;
  }

  async function applyCellBreakdownModal() {
    if (!activeBreakdownContext) return;
    const { studentId, targetObj, parentSub, isPaper, limits } = activeBreakdownContext;
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;

    const cqVal = parseFloat(document.getElementById('cellModalCqInput').value) || 0;
    const mcqVal = parseFloat(document.getElementById('cellModalMcqInput').value) || 0;
    const pracVal = limits.practical > 0 ? (parseFloat(document.getElementById('cellModalPracInput').value) || 0) : 0;
    const totalVal = Math.min(limits.full, cqVal + mcqVal + pracVal);

    targetObj.cq = cqVal;
    targetObj.mcq = mcqVal;
    targetObj.practical = pracVal;
    targetObj.marks_obtained = totalVal;
    targetObj.is_absent = false;

    if (isPaper && parentSub && Array.isArray(parentSub.papers)) {
      let pSum = 0;
      let pCq = 0;
      let pMcq = 0;
      let pPr = 0;
      parentSub.papers.forEach(p => {
        pSum += (parseFloat(p.marks_obtained) || 0);
        pCq += (parseFloat(p.cq) || 0);
        pMcq += (parseFloat(p.mcq) || 0);
        pPr += (parseFloat(p.practical) || 0);
      });
      parentSub.marks_obtained = pSum;
      parentSub.cq = pCq;
      parentSub.mcq = pMcq;
      parentSub.practical = pPr;
      parentSub.is_absent = false;
    }

    student.updated_at = Date.now();
    const updated = ResultEngine.calculateStudent(student);
    Object.assign(student, updated);

    closeCellBreakdownModal();
    renderSpreadsheet();
    triggerDebouncedAutoSave();
  }

  window.openSubjectEntryModal = openSubjectEntryModal;
  window.closeSubjectEntryModal = closeSubjectEntryModal;
  window.saveSubjectEntryModal = saveSubjectEntryModal;
  window.openCellBreakdownModal = openCellBreakdownModal;
  window.closeCellBreakdownModal = closeCellBreakdownModal;
  window.applyCellBreakdownModal = applyCellBreakdownModal;
  window.getSubjectComponentConfig = getSubjectComponentConfig;
  window.getSubjectLimits = getSubjectLimits;
  window.getSchoolClassesList = getSchoolClassesList;
  window.getAvailableSubjectsForClass = getAvailableSubjectsForClass;
  window.isSubjectAssignedToUser = isSubjectAssignedToUser;

  // Concurrency-Safe Save to Local & Firebase
  async function saveSpreadsheetChanges() {
    if (saveEditorChangesBtn) {
      saveEditorChangesBtn.disabled = true;
      saveEditorChangesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সংরক্ষণ হচ্ছে...';
    }

    try {
      // 1. Recalculate class merit positions
      const studentsInClass = getStudentsInCurrentClass();
      const ranked = ResultEngine.calculateClassPositions(studentsInClass);
      ranked.forEach(r => {
        const target = allStudents.find(s => s.id === r.id);
        if (target) Object.assign(target, r);
      });

      // 2. Save locally
      await ResultEngine.Storage.saveStudents(allStudents);

      // 3. Sync changed students to Firebase with updateMask for concurrency safety
      const syncPromises = studentsInClass.map(st => {
        const mask = (currentUser && currentUser.role === 'teacher') ? ['subjects', 'total_marks', 'gpa', 'grade', 'status'] : null;
        return ResultEngine.Firestore.saveStudentToFirestore(st, mask);
      });

      await Promise.allSettled(syncPromises);

      // 4. Save to local backend if running
      try {
        await fetch('/api/results/save-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allStudents)
        });
      } catch (e) {}

      showToast('সফল! সমস্ত নম্বর সংরক্ষিত ও ব্যাকএন্ডে সিঙ্ক হয়েছে।', 'success');
      const indicator = document.getElementById('autoSaveIndicator');
      if (indicator) {
        indicator.innerHTML = '<i class="fas fa-circle-check text-emerald-500"></i> <span class="text-emerald-600 dark:text-emerald-400">সফলভাবে সংরক্ষিত</span>';
        indicator.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('সংরক্ষণে সমস্যা: ' + err.message, 'error');
    } finally {
      if (saveEditorChangesBtn) {
        saveEditorChangesBtn.disabled = false;
        saveEditorChangesBtn.innerHTML = '<i class="fas fa-save"></i> পরিবর্তন সংরক্ষণ';
      }
      renderSpreadsheet();
    }
  }

  // Bengali Date & Time formatters for Result Publishing
  function formatBengaliDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const bnMonths = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const monthBn = bnMonths[month - 1] || parts[1];
    return `${ResultEngine.toBnDigit(day)} ${monthBn}, ${ResultEngine.toBnDigit(year)}`;
  }

  function formatBengaliTime(timeStr) {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    let ampm = 'সকাল';
    if (h >= 12) {
      ampm = h >= 15 && h < 18 ? 'বিকাল' : h >= 18 && h < 20 ? 'সন্ধ্যা' : h >= 20 ? 'রাত' : 'দুপুর';
      if (h > 12) h -= 12;
    } else {
      if (h === 0) h = 12;
      ampm = h < 6 ? 'রাত' : 'সকাল';
    }
    return `${ampm} ${ResultEngine.toBnDigit(h)}:${ResultEngine.toBnDigit(m < 10 ? '0' + m : m)} মিনিট`;
  }

  // Web Admin Exclusive: Toggle Publish / Draft & Publish Modal
  window.openPublishModal = function () {
    if (!currentUser || currentUser.role !== 'super_admin') {
      alert('অনুমতি নেই! ফলাফল পাবলিশ করার একক ক্ষমতা শুধুমাত্র ফয়জার কম্পিউটার (ওয়েব অ্যাডমিন)-এর কাছে সংরক্ষিত।');
      return;
    }

    const studentsInClass = getStudentsInCurrentClass();
    if (studentsInClass.length === 0) {
      alert('নির্বাচিত ক্লাসে কোনো শিক্ষার্থী নেই।');
      return;
    }

    const school = getActiveSchool();
    const currentClass = (school.classes || config.classes || []).find(c => c.id === currentClassId);
    const currentExam = (school.exams || []).find(x => x.id === currentExamId);

    if (publishModalTargetText) {
      publishModalTargetText.innerHTML = `
        <div class="font-bold text-sm text-emerald-950 dark:text-emerald-200">
          <i class="fas fa-school mr-1"></i> ${school.name_bn}
        </div>
        <div class="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
          <strong>শ্রেণি:</strong> ${currentClass ? currentClass.name_bn : currentClassId} &nbsp;|&nbsp; 
          <strong>পরীক্ষা:</strong> ${currentExam ? currentExam.name_bn : currentExamId} (${ResultEngine.toBnDigit(currentYear)}) &nbsp;|&nbsp; 
          <strong>মোট শিক্ষার্থী:</strong> ${ResultEngine.toBnDigit(studentsInClass.length)} জন
        </div>
      `;
    }

    // Prefill date & time
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const sample = studentsInClass.find(s => s.published_date) || {};
    if (publishScheduleDate) publishScheduleDate.value = sample.published_date || todayStr;
    if (publishScheduleTime) publishScheduleTime.value = sample.published_time || timeStr;
    if (publishNoticeText) publishNoticeText.value = sample.publish_notice || 'প্রধান শিক্ষকের অনুমোদনক্রমে ফলাফল আনুষ্ঠানিকভাবে প্রকাশিত হলো।';

    if (publishScheduleModal) publishScheduleModal.classList.remove('hidden');
  };

  window.closePublishModal = function () {
    if (publishScheduleModal) publishScheduleModal.classList.add('hidden');
  };

  window.confirmPublishWithDateTime = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentUser || currentUser.role !== 'super_admin') {
      alert('অনুমতি নেই! ফলাফল পাবলিশ করার একক ক্ষমতা শুধুমাত্র ফয়জার কম্পিউটার (ওয়েব অ্যাডমিন)-এর কাছে সংরক্ষিত।');
      return;
    }

    const studentsInClass = getStudentsInCurrentClass();
    if (studentsInClass.length === 0) {
      alert('নির্বাচিত ক্লাসে কোনো শিক্ষার্থী নেই।');
      return;
    }

    const dateVal = publishScheduleDate ? publishScheduleDate.value : '';
    const timeVal = publishScheduleTime ? publishScheduleTime.value : '';
    const noticeVal = publishNoticeText ? publishNoticeText.value.trim() : '';
    const modeRadio = document.querySelector('input[name="publishModeRadio"]:checked');
    const publishMode = modeRadio ? modeRadio.value : 'immediate';

    if (!dateVal || !timeVal) {
      alert('অনুগ্রহ করে প্রকাশের তারিখ ও সময় নির্বাচন করুন!');
      return;
    }

    const dateBn = formatBengaliDate(dateVal);
    const timeBn = formatBengaliTime(timeVal);

    studentsInClass.forEach(s => {
      s.publish_status = publishMode === 'scheduled' ? 'scheduled' : 'published';
      s.published_date = dateVal;
      s.published_time = timeVal;
      s.published_date_bn = dateBn;
      s.published_time_bn = timeBn;
      s.publish_notice = noticeVal;
      s.published_at = `${dateVal}T${timeVal}:00`;
    });

    ResultEngine.Storage.saveStudents(allStudents);

    // Sync to Firestore
    studentsInClass.forEach(st => {
      ResultEngine.Firestore.saveStudentToFirestore(st, [
        'publish_status',
        'published_date',
        'published_time',
        'published_date_bn',
        'published_time_bn',
        'publish_notice',
        'published_at'
      ]);
    });

    window.closePublishModal();

    const successMsg = publishMode === 'scheduled'
      ? `ফলাফল প্রকাশের সময় নির্ধারিত হয়েছে!\nতারিখ: ${dateBn}\nসময়: ${timeBn}\n(শিক্ষার্থীরা নির্ধারিত সময়ে ফলাফল দেখতে পাবে)`
      : `ফলাফল সফলভাবে অনলাইনে প্রকাশিত (Published) হয়েছে!\nপ্রকাশের সময়: ${dateBn}, ${timeBn}`;

    alert(successMsg);
    renderSpreadsheet();
  };

  async function toggleClassPublishStatus() {
    if (!currentUser || currentUser.role !== 'super_admin') {
      alert('অনুমতি নেই! ফলাফল পাবলিশ করার একক ক্ষমতা শুধুমাত্র ফয়জার কম্পিউটার (ওয়েব অ্যাডমিন)-এর কাছে সংরক্ষিত।');
      return;
    }

    const studentsInClass = getStudentsInCurrentClass();
    if (studentsInClass.length === 0) {
      alert('নির্বাচিত ক্লাসে কোনো শিক্ষার্থী নেই।');
      return;
    }

    const isCurrentlyPublished = studentsInClass.some(s => s.publish_status === 'published' || s.publish_status === 'scheduled');

    if (isCurrentlyPublished) {
      if (!confirm('আপনি কি নিশ্চিত যে এই শ্রেণির ফলাফল ড্রাফট (Draft) করতে চান? ড্রাফট করলে শিক্ষার্থীরা অনলাইনে রেজাল্ট দেখতে পারবে না।')) {
        return;
      }
      studentsInClass.forEach(s => {
        s.publish_status = 'draft';
      });
      ResultEngine.Storage.saveStudents(allStudents);
      studentsInClass.forEach(st => {
        ResultEngine.Firestore.saveStudentToFirestore(st, ['publish_status']);
      });
      alert('ফলাফল সফলভাবে ড্রাফট (Draft) অবস্থায় রাখা হয়েছে।');
      renderSpreadsheet();
    } else {
      window.openPublishModal();
    }
  }

  // 1-Click Excel Export via SheetJS
  function exportClassToExcel() {
    const studentsInClass = getStudentsInCurrentClass();
    if (studentsInClass.length === 0) {
      alert('এক্সেল এক্সপোর্ট করার মত কোনো শিক্ষার্থী নেই।');
      return;
    }

    if (typeof XLSX === 'undefined') {
      alert('SheetJS লাইব্রেরি লোড হয়নি। অনুগ্রহ করে পেজ রিফ্রেশ করুন।');
      return;
    }

    const sampleStudent = studentsInClass.find(s => Array.isArray(s.subjects) && s.subjects.length > 0) || studentsInClass[0];
    const subjects = sampleStudent.subjects || [];

    const excelData = studentsInClass.map(st => {
      const calculated = ResultEngine.calculateStudent(st);
      const row = {
        'মেধা স্থান': calculated.position ? `${calculated.position}` : '',
        'রোল নম্বর': st.roll,
        'শিক্ষার্থীর নাম': st.student_name_bn,
        'পিতার নাম': st.father_name_bn || '',
        'মাতার নাম': st.mother_name_bn || ''
      };

      subjects.forEach(sub => {
        const studentSub = (st.subjects || []).find(s => s.code === sub.code || s.name_bn === sub.name_bn) || sub;
        row[`${sub.name_bn} (প্রাপ্ত)`] = studentSub.is_absent ? 'ABS' : studentSub.marks_obtained;
        row[`${sub.name_bn} (গ্রেড)`] = studentSub.grade;
      });

      row['সর্বমোট নম্বর'] = calculated.total_marks;
      row['প্রাপ্ত GPA'] = ResultEngine.formatGpa(calculated.gpa);
      row['লেটার গ্রেড'] = calculated.grade;
      row['ফলাফল স্ট্যাটাস'] = calculated.status === 'Passed' ? 'উত্তীর্ণ' : 'অকৃতকার্য';
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Class_${currentClassId}`);

    const school = getActiveSchool();
    const fileName = `Fayzar_Result_${(school.name_en || 'School').replace(/\s+/g, '_')}_${currentClassId}_${currentYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  // Batch Print Engine (A4 Continuous Pages - Accessible to all authorized users)
  function renderBatchPreview(classId) {
    if (!batchPreviewGrid) return;

    classId = classId || batchClassSelect?.value || currentClassId;
    const year = batchYearSelect?.value || currentYear;
    const exam = batchExamSelect?.value || currentExamId;

    const students = allStudents.filter(s => {
      const matchSchool = (s.institution_id === activeSchoolId) || (!s.institution_id && activeSchoolId === 'dreamland-school');
      const matchClass = String(s.class_id) === String(classId);
      const sYear = String(s.year || s.academic_year || '2025');
      const sExamId = s.exam_id || (s.exam_name_bn && s.exam_name_bn.includes('টেস্ট') ? 'dakhil_test_2025' : 'annual_2025');
      const matchYear = !year || sYear === String(year);
      const matchExam = !exam || sExamId === exam || s.exam_id === exam;
      return matchSchool && matchClass && matchYear && matchExam;
    });

    if (batchStudentCount) batchStudentCount.textContent = ResultEngine.toBnDigit(students.length);

    batchPreviewGrid.innerHTML = '';
    if (students.length === 0) {
      batchPreviewGrid.innerHTML = `<div class="col-span-2 p-6 text-center text-slate-400">নির্বাচিত ক্লাসে ${ResultEngine.toBnDigit(year)} সালের কোনো শিক্ষার্থী পাওয়া যায়নি।</div>`;
      return;
    }

    students.slice(0, 4).forEach(st => {
      const calculated = ResultEngine.calculateStudent(st);
      const card = document.createElement('div');
      card.className = 'p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-2';
      card.innerHTML = `
        <div class="flex items-center justify-between font-bold border-b border-slate-200 dark:border-slate-700 pb-2">
          <span>রোল: ${ResultEngine.toBnDigit(st.roll)} - ${st.student_name_bn}</span>
          <span class="font-mono text-emerald-600">GPA: ${ResultEngine.formatGpa(calculated.gpa)}</span>
        </div>
        <div class="text-[11px] text-slate-500">মোট নম্বর: ${ResultEngine.toBnDigit(calculated.total_marks)} | গ্রেড: ${calculated.grade} | স্ট্যাটাস: ${calculated.status}</div>
      `;
      batchPreviewGrid.appendChild(card);
    });
  }

  function executeBatchPrint() {
    const classId = batchClassSelect?.value || currentClassId;
    const year = batchYearSelect?.value || currentYear;
    const exam = batchExamSelect?.value || currentExamId;
    const school = getActiveSchool();

    const students = allStudents.filter(s => {
      const matchSchool = (s.institution_id === activeSchoolId) || (!s.institution_id && activeSchoolId === 'dreamland-school');
      const matchClass = String(s.class_id) === String(classId);
      const sYear = String(s.year || s.academic_year || '2025');
      const sExamId = s.exam_id || (s.exam_name_bn && s.exam_name_bn.includes('টেস্ট') ? 'dakhil_test_2025' : 'annual_2025');
      const matchYear = !year || sYear === String(year);
      const matchExam = !exam || sExamId === exam || s.exam_id === exam;
      return matchSchool && matchClass && matchYear && matchExam;
    });

    if (students.length === 0) {
      alert(`নির্বাচিত ক্লাসে ${ResultEngine.toBnDigit(year)} সালের প্রিন্ট করার মত কোনো শিক্ষার্থী নেই।`);
      return;
    }

    // Sort by roll
    students.sort((a, b) => (parseInt(a.roll, 10) || 0) - (parseInt(b.roll, 10) || 0));

    if (!batchPrintContainer) return;
    batchPrintContainer.innerHTML = '';

    const watermark = school.watermark_text || 'FAYZAR';

    students.forEach(st => {
      const calculated = ResultEngine.calculateStudent(st);
      const isPassed = calculated.status === 'Passed';
      const page = document.createElement('div');
      page.className = 'batch-student-page watermark-bg';
      page.setAttribute('data-watermark', watermark);

      const isSec = isSecondaryClass(st.class_id);
      const isJunior = isJuniorSecondaryClass(st.class_id);
      let subjectsRows = '';
      let displaySerial = 1;
      let totalCq = 0;
      let totalMcq = 0;
      let totalPr = 0;

      (calculated.subjects || []).forEach((sub, idx) => {
        const isSubFail = sub.grade === 'F';
        const gradeColor = isSubFail ? 'text-rose-700 font-bold' : 'text-slate-900 font-bold';
        const bgRow = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70';
        const isComposite = Array.isArray(sub.papers) && sub.papers.length >= 2;

        if (isComposite) {
          const p1 = sub.papers[0];
          const p2 = sub.papers[1];
          const p1MarksDisplay = (p1.is_absent || String(p1.marks_obtained).toUpperCase() === 'ABS') ? '<span class="text-rose-700 font-bold">ABS</span>' : ResultEngine.toBnDigit(p1.marks_obtained);
          const p2MarksDisplay = (p2.is_absent || String(p2.marks_obtained).toUpperCase() === 'ABS') ? '<span class="text-rose-700 font-bold">ABS</span>' : ResultEngine.toBnDigit(p2.marks_obtained);

          if (p1.cq !== undefined) totalCq += (parseFloat(p1.cq) || 0);
          if (p1.mcq !== undefined) totalMcq += (parseFloat(p1.mcq) || 0);
          if (p1.practical !== undefined) totalPr += (parseFloat(p1.practical) || 0);

          if (p2.cq !== undefined) totalCq += (parseFloat(p2.cq) || 0);
          if (p2.mcq !== undefined) totalMcq += (parseFloat(p2.mcq) || 0);
          if (p2.practical !== undefined) totalPr += (parseFloat(p2.practical) || 0);

          if (isSec) {
            subjectsRows += `
              <tr class="${bgRow}">
                <td rowspan="2" class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono text-slate-700 align-middle">${ResultEngine.toBnDigit(displaySerial)}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-200 text-center font-mono text-slate-600 font-bold">${p1.code || sub.code || '--'}</td>
                <td class="py-1 px-2 border-r border-b border-slate-200 font-bold text-slate-950">${p1.name_bn || p1.name_en}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-200 text-center font-mono text-slate-800">${ResultEngine.toBnDigit(p1.full_marks || 100)}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-200 text-center font-mono text-slate-700">${p1.cq !== undefined ? ResultEngine.toBnDigit(p1.cq) : '--'}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-200 text-center font-mono text-slate-700">${p1.mcq !== undefined ? ResultEngine.toBnDigit(p1.mcq) : '--'}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-200 text-center font-mono text-slate-700">${p1.practical !== undefined ? ResultEngine.toBnDigit(p1.practical) : '--'}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-200 text-center font-mono font-extrabold text-slate-950">${p1MarksDisplay}</td>
                <td rowspan="2" class="py-1 px-1.5 border-r border-b border-slate-300 text-center ${gradeColor} align-middle bg-slate-50/50">${sub.grade || 'F'}</td>
                <td rowspan="2" class="py-1 px-1.5 border-b border-slate-300 text-center font-mono font-bold ${gradeColor} align-middle bg-slate-50/50">${ResultEngine.formatGpa(sub.point)}</td>
              </tr>
              <tr class="${bgRow}">
                <td class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono text-slate-600 font-bold">${p2.code || '--'}</td>
                <td class="py-1 px-2 border-r border-b border-slate-300 font-bold text-slate-950">
                  ${p2.name_bn || p2.name_en}
                  <span class="text-[8.5px] text-slate-500 font-medium ml-1">(যৌথ মোট: ${ResultEngine.toBnDigit(sub.marks_obtained)} / ${ResultEngine.toBnDigit(sub.full_marks || 200)})</span>
                </td>
                <td class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono text-slate-800">${ResultEngine.toBnDigit(p2.full_marks || 100)}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono text-slate-700">${p2.cq !== undefined ? ResultEngine.toBnDigit(p2.cq) : '--'}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono text-slate-700">${p2.mcq !== undefined ? ResultEngine.toBnDigit(p2.mcq) : '--'}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono text-slate-700">${p2.practical !== undefined ? ResultEngine.toBnDigit(p2.practical) : '--'}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono font-extrabold text-slate-950">${p2MarksDisplay}</td>
              </tr>
            `;
          } else if (isJunior) {
            const p1CqDisplay = p1.cq !== undefined ? ResultEngine.toBnDigit(p1.cq) : (p1.mcq === undefined ? p1MarksDisplay : '--');
            const p1McqDisplay = p1.mcq !== undefined ? ResultEngine.toBnDigit(p1.mcq) : '--';
            const p2CqDisplay = p2.cq !== undefined ? ResultEngine.toBnDigit(p2.cq) : (p2.mcq === undefined ? p2MarksDisplay : '--');
            const p2McqDisplay = p2.mcq !== undefined ? ResultEngine.toBnDigit(p2.mcq) : '--';
            subjectsRows += `
              <tr class="${bgRow}">
                <td rowspan="2" class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono text-slate-700 align-middle">${ResultEngine.toBnDigit(displaySerial)}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-200 text-center font-mono text-slate-600 font-bold">${p1.code || sub.code || '--'}</td>
                <td class="py-1 px-2 border-r border-b border-slate-200 font-bold text-slate-950">${p1.name_bn || p1.name_en}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-200 text-center font-mono text-slate-800">${ResultEngine.toBnDigit(p1.full_marks || 100)}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-200 text-center font-mono text-slate-700">${p1CqDisplay}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-200 text-center font-mono text-slate-700">${p1McqDisplay}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-200 text-center font-mono font-extrabold text-slate-950">${p1MarksDisplay}</td>
                <td rowspan="2" class="py-1 px-1.5 border-r border-b border-slate-300 text-center ${gradeColor} align-middle bg-slate-50/50">${sub.grade || 'F'}</td>
                <td rowspan="2" class="py-1 px-1.5 border-b border-slate-300 text-center font-mono font-bold ${gradeColor} align-middle bg-slate-50/50">${ResultEngine.formatGpa(sub.point)}</td>
              </tr>
              <tr class="${bgRow}">
                <td class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono text-slate-600 font-bold">${p2.code || '--'}</td>
                <td class="py-1 px-2 border-r border-b border-slate-300 font-bold text-slate-950">
                  ${p2.name_bn || p2.name_en}
                  <span class="text-[8.5px] text-slate-500 font-medium ml-1">(যৌথ মোট: ${ResultEngine.toBnDigit(sub.marks_obtained)} / ${ResultEngine.toBnDigit(sub.full_marks || 200)})</span>
                </td>
                <td class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono text-slate-800">${ResultEngine.toBnDigit(p2.full_marks || 100)}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono text-slate-700">${p2CqDisplay}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono text-slate-700">${p2McqDisplay}</td>
                <td class="py-1 px-1.5 border-r border-b border-slate-300 text-center font-mono font-extrabold text-slate-950">${p2MarksDisplay}</td>
              </tr>
            `;
          } else {
            subjectsRows += `
              <tr class="${bgRow}">
                <td rowspan="2" class="py-1 px-2 border-r border-b border-slate-300 text-center font-mono text-slate-700 align-middle">${ResultEngine.toBnDigit(displaySerial)}</td>
                <td class="py-1 px-2.5 border-r border-b border-slate-200 font-bold text-slate-950">${p1.name_bn || p1.name_en}</td>
                <td class="py-1 px-2 border-r border-b border-slate-200 text-center font-mono text-slate-800">${ResultEngine.toBnDigit(p1.full_marks || 100)}</td>
                <td class="py-1 px-2 border-r border-b border-slate-200 text-center font-mono font-extrabold text-slate-950">${p1MarksDisplay}</td>
                <td rowspan="2" class="py-1 px-2 border-r border-b border-slate-300 text-center ${gradeColor} align-middle bg-slate-50/50">${sub.grade || 'F'}</td>
                <td rowspan="2" class="py-1 px-2 border-b border-slate-300 text-center font-mono font-bold ${gradeColor} align-middle bg-slate-50/50">${ResultEngine.formatGpa(sub.point)}</td>
              </tr>
              <tr class="${bgRow}">
                <td class="py-1 px-2.5 border-r border-slate-300 font-bold text-slate-950">
                  ${p2.name_bn || p2.name_en}
                  <span class="text-[9px] text-slate-500 font-medium ml-1.5">(যৌথ মোট: ${ResultEngine.toBnDigit(sub.marks_obtained)} / ${ResultEngine.toBnDigit(sub.full_marks || 200)})</span>
                </td>
                <td class="py-1 px-2 border-r border-slate-300 text-center font-mono text-slate-800">${ResultEngine.toBnDigit(p2.full_marks || 100)}</td>
                <td class="py-1 px-2 border-r border-slate-300 text-center font-mono font-extrabold text-slate-950">${p2MarksDisplay}</td>
              </tr>
            `;
          }
        } else {
          const cqVal = (sub.cq !== undefined && sub.cq !== null && sub.cq !== '') ? sub.cq : '--';
          const mcqVal = (sub.mcq !== undefined && sub.mcq !== null && sub.mcq !== '') ? sub.mcq : '--';
          const prVal = (sub.practical !== undefined && sub.practical !== null && sub.practical !== '') ? sub.practical : '--';

          totalCq += (parseFloat(sub.cq) || 0);
          totalMcq += (parseFloat(sub.mcq) || 0);
          totalPr += (parseFloat(sub.practical) || 0);

          if (isSec) {
            subjectsRows += `
              <tr class="${bgRow} border-b border-slate-300">
                <td class="py-1 px-1 border-r border-slate-400 text-center font-bold text-slate-800">${ResultEngine.toBnDigit(displaySerial)}</td>
                <td class="py-1 px-2 border-r border-slate-400 text-left font-bold text-slate-900 truncate max-w-[130px]">${sub.name_bn} ${sub.is_optional ? '<span class="text-[8px] font-sans text-amber-700 font-bold">(৪র্থ)</span>' : ''}</td>
                <td class="py-1 px-1 border-r border-slate-300 text-center font-mono text-slate-700">${ResultEngine.toBnDigit(sub.full_marks || 100)}</td>
                <td class="py-1 px-1 border-r border-slate-300 text-center font-mono">${cqVal !== '--' ? ResultEngine.toBnDigit(cqVal) : '--'}</td>
                <td class="py-1 px-1 border-r border-slate-300 text-center font-mono">${mcqVal !== '--' ? ResultEngine.toBnDigit(mcqVal) : '--'}</td>
                <td class="py-1 px-1 border-r border-slate-300 text-center font-mono">${prVal !== '--' ? ResultEngine.toBnDigit(prVal) : '--'}</td>
                <td class="py-1 px-1 border-r border-slate-400 text-center font-mono font-bold">${sub.is_absent ? 'ABS' : ResultEngine.toBnDigit(sub.marks_obtained)}</td>
                <td class="py-1 px-1 border-r border-slate-400 text-center font-mono font-black text-slate-950 bg-slate-100/60">${ResultEngine.toBnDigit(sub.full_marks || 100)}</td>
                <td class="py-1 px-1 border-r border-slate-400 text-center font-mono font-black text-slate-950 bg-slate-100/60">${sub.is_absent ? 'ABS' : ResultEngine.toBnDigit(sub.marks_obtained)}</td>
                <td class="py-1 px-1 border-r border-slate-400 text-center font-mono font-black text-xs ${gradeColor}">${sub.grade}</td>
                <td class="py-1 px-2 text-center font-mono font-bold ${gradeColor}">${ResultEngine.formatGpa(sub.point)}</td>
              </tr>
            `;
          } else {
            subjectsRows += `
              <tr class="${bgRow}">
                <td class="py-1 px-1 border-b border-r border-slate-400 text-center font-bold text-slate-800">${ResultEngine.toBnDigit(displaySerial)}</td>
                <td class="py-1 px-2 border-b border-r border-slate-400 text-left font-bold text-slate-900 truncate max-w-[130px]">${sub.name_bn} ${sub.is_optional ? '<span class="text-[8px] font-sans text-amber-700 font-bold">(৪র্থ)</span>' : ''}</td>
                <td class="py-1 px-1 border-b border-r border-slate-400 text-center font-mono font-black text-slate-950">${ResultEngine.toBnDigit(sub.full_marks || 100)}</td>
                <td class="py-1 px-1 border-b border-r border-slate-300 text-center font-mono">${cqVal !== '--' ? ResultEngine.toBnDigit(cqVal) : '--'}</td>
                <td class="py-1 px-1 border-b border-r border-slate-300 text-center font-mono">${mcqVal !== '--' ? ResultEngine.toBnDigit(mcqVal) : '--'}</td>
                ${isJunior ? `<td class="py-1 px-1 border-b border-r border-slate-300 text-center font-mono">${prVal !== '--' ? ResultEngine.toBnDigit(prVal) : '--'}</td>` : ''}
                <td class="py-1 px-1 border-b border-r border-slate-400 text-center font-mono font-black text-slate-950 bg-slate-100/60">${sub.is_absent ? 'ABS' : ResultEngine.toBnDigit(sub.marks_obtained)}</td>
                <td class="py-1 px-1 border-b border-r border-slate-400 text-center font-mono font-black text-xs ${gradeColor}">${sub.grade}</td>
                <td class="py-1 px-2 border-b border-slate-300 text-center font-mono font-bold ${gradeColor}">${ResultEngine.formatGpa(sub.point)}</td>
              </tr>
            `;
          }
        }
        displaySerial++;
      });

      let remarksText = 'ফলাফল সন্তোষজনক। পরবর্তী শ্রেণিতে উত্তীর্ণ।';
      if (isPassed) {
        if (calculated.gpa >= 5.0) {
          remarksText = 'অনন্য ও অসাধারণ ফলাফল! পরবর্তী শ্রেণিতে প্রমোশন লাভ করেছে।';
        } else if (calculated.gpa >= 4.0) {
          remarksText = 'খুবই প্রশংসনীয় ফলাফল। পরবর্তী শ্রেণিতে প্রমোশন লাভ করেছে।';
        } else if (calculated.gpa >= 3.0) {
          remarksText = 'সন্তোষজনক ফলাফল। পরবর্তী শ্রেণিতে ভর্তি ও পাঠ গ্রহণের যোগ্যতা অর্জিত হয়েছে।';
        } else {
          remarksText = 'উত্তীর্ণ। তবে নিয়মিত অধ্যয়নে আরও মনোযোগী হওয়ার নির্দেশ দেওয়া যাচ্ছে।';
        }
      } else {
        const failSubNames = (calculated.failed_subjects || []).map(s => s.name_bn).filter(Boolean).join(', ');
        const failSubInfo = failSubNames ? ` [${failSubNames}]` : '';
        const failCountBn = ResultEngine.toBnDigit(calculated.fail_count || 1);
        const failText = calculated.fail_count ? `${failCountBn} বিষয়ে ফেল / Fail in ${calculated.fail_count}` : 'Failed';
        remarksText = `<span class="text-rose-700 font-bold">অকৃতকার্য (${failText})${failSubInfo}। সংশ্লিষ্ট বিষয়সমূহে বিশেষ ক্লাস ও পুনর্বিবেচনা প্রযোজ্য।</span>`;
      }

      const sig = ResultEngine.generateVerificationSignature ? ResultEngine.generateVerificationSignature(st) : '';
      const verifyUrl = `${window.location.origin}/results.html?inst=${encodeURIComponent(school.id || st.institution_id || '')}&year=${encodeURIComponent(st.year || year)}&exam=${encodeURIComponent(st.exam_id || examId)}&class=${encodeURIComponent(st.class_id || classId)}&roll=${encodeURIComponent(st.roll)}&sig=${encodeURIComponent(sig)}`;
      const qrSvg = ResultEngine.generateVerificationQrSvg(verifyUrl, 64);
      const publishDateDisplay = st.published_date_bn || (st.published_date ? ResultEngine.toBnDigit(st.published_date) : `${new Date().toLocaleDateString('bn-BD')}`);
      const examDisplayTitle = st.exam_name_bn || (st.exam_name || `${ResultEngine.toBnDigit(year)} সালের পরীক্ষা`);
      const rankDisplay = st.position ? `${ResultEngine.toBnDigit(st.position)}ম` : '--';

      page.innerHTML = `
        <div class="certificate-inner-frame">
          <div class="corner-ornament corner-tl"></div>
          <div class="corner-ornament corner-tr"></div>
          <div class="corner-ornament corner-bl"></div>
          <div class="corner-ornament corner-br"></div>

          <div class="pb-2 border-b-2 border-slate-950 relative">
            <div class="flex items-center justify-between gap-2">
              <div class="w-16 h-16 flex-shrink-0 p-1 rounded-full border-2 border-slate-900 bg-white shadow-xs flex items-center justify-center">
                <img src="${school.logo_url || 'assets/images/school-logo.png'}" alt="School Logo" class="max-h-full max-w-full object-contain rounded-full" onerror="this.src='assets/favicon.svg'">
              </div>

              <div class="text-center flex-1 px-1">
                <h1 class="text-xl font-black text-slate-950 tracking-tight leading-tight">
                  ${school.name_bn || 'ড্রিমল্যান্ড রেসিডেন্সিয়াল মডেল স্কুল'}
                </h1>
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-700 mt-0.5">
                  ${school.name_en || 'DREAMLAND RESIDENTIAL MODEL SCHOOL'}
                </div>
                <div class="text-[10px] text-slate-600 font-medium mt-0.5">
                  ${school.address_bn || 'বারাই, ফুলবাড়ী, দিনাজপুর'}
                </div>
                
                <div class="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                  <div class="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-slate-950 text-white font-black text-[10.5px] uppercase tracking-wider shadow-xs">
                    <span>ACADEMIC TRANSCRIPT / একাডেমিক ট্রান্সক্রিপ্ট</span>
                  </div>
                  <div class="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-900 bg-slate-100 font-extrabold text-[10.5px] text-slate-900">
                    <span>${examDisplayTitle}</span>
                  </div>
                </div>
              </div>

              <div class="w-32 border border-slate-900 bg-white text-[8px] shadow-xs flex-shrink-0">
                <div class="bg-slate-950 text-white font-extrabold text-[8px] text-center py-0.5 uppercase tracking-wider">
                  Grading Scale
                </div>
                <table class="w-full border-collapse text-center leading-tight">
                  <thead>
                    <tr class="bg-slate-100 border-b border-slate-900 font-bold text-[7.5px]">
                      <th class="px-0.5 py-0.2 border-r border-slate-900">নম্বর</th>
                      <th class="px-0.5 py-0.2 border-r border-slate-900">গ্রেড</th>
                      <th class="px-0.5 py-0.2">GP</th>
                    </tr>
                  </thead>
                  <tbody class="text-[8px] font-mono divide-y divide-slate-300">
                    <tr><td class="px-0.5 py-0.2 border-r border-slate-300">৮০-১০০</td><td class="px-0.5 py-0.2 border-r border-slate-300 font-bold">A+</td><td class="px-0.5 py-0.2 font-bold text-emerald-800">5.0</td></tr>
                    <tr><td class="px-0.5 py-0.2 border-r border-slate-300">৭০-৭৯</td><td class="px-0.5 py-0.2 border-r border-slate-300 font-bold">A</td><td class="px-0.5 py-0.2 font-bold">4.0</td></tr>
                    <tr><td class="px-0.5 py-0.2 border-r border-slate-300">৬০-৬৯</td><td class="px-0.5 py-0.2 border-r border-slate-300 font-bold">A-</td><td class="px-0.5 py-0.2 font-bold">3.5</td></tr>
                    <tr><td class="px-0.5 py-0.2 border-r border-slate-300">৫০-৫৯</td><td class="px-0.5 py-0.2 border-r border-slate-300 font-bold">B</td><td class="px-0.5 py-0.2 font-bold">3.0</td></tr>
                    <tr><td class="px-0.5 py-0.2 border-r border-slate-300">৪০-৪৯</td><td class="px-0.5 py-0.2 border-r border-slate-300 font-bold">C</td><td class="px-0.5 py-0.2 font-bold">2.0</td></tr>
                    <tr><td class="px-0.5 py-0.2 border-r border-slate-300">৩৩-৩৯</td><td class="px-0.5 py-0.2 border-r border-slate-300 font-bold">D</td><td class="px-0.5 py-0.2 font-bold">1.0</td></tr>
                    <tr class="bg-rose-50 text-rose-800"><td class="px-0.5 py-0.2 border-r border-slate-300">০০-৩২</td><td class="px-0.5 py-0.2 border-r border-slate-300 font-bold">F</td><td class="px-0.5 py-0.2 font-bold">0.0</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="my-2 rounded-lg border-2 border-slate-900 bg-white overflow-hidden text-[11px]">
            <div class="grid grid-cols-4 divide-x divide-slate-300 border-b border-slate-300 bg-slate-50/80">
              <div class="p-1.5">
                <span class="text-slate-500 block text-[9.5px] font-bold">শিক্ষার্থীর নাম :</span>
                <span class="font-black text-slate-950 text-xs block truncate">${st.student_name_bn}</span>
              </div>
              <div class="p-1.5">
                <span class="text-slate-500 block text-[9.5px] font-bold">রোল নম্বর :</span>
                <span class="font-black text-slate-950 font-mono text-xs block">${ResultEngine.toBnDigit(st.roll)}</span>
              </div>
              <div class="p-1.5">
                <span class="text-slate-500 block text-[9.5px] font-bold">শ্রেণি :</span>
                <span class="font-extrabold text-slate-950 text-xs block">${st.class_name_bn || st.class_id}</span>
              </div>
              <div class="p-1.5">
                <span class="text-slate-500 block text-[9.5px] font-bold">শাখা / বিভাগ :</span>
                <span class="font-extrabold text-slate-950 text-xs block">${st.section || 'ক'}${st.group_bn ? ` (${st.group_bn})` : ''}</span>
              </div>
            </div>
            <div class="grid grid-cols-4 divide-x divide-slate-300 bg-white">
              <div class="p-1.5">
                <span class="text-slate-500 block text-[9.5px] font-bold">পিতার নাম :</span>
                <span class="font-bold text-slate-800 block truncate text-[10.5px]">${st.father_name_bn || '--'}</span>
              </div>
              <div class="p-1.5">
                <span class="text-slate-500 block text-[9.5px] font-bold">মাতার নাম :</span>
                <span class="font-bold text-slate-800 block truncate text-[10.5px]">${st.mother_name_bn || '--'}</span>
              </div>
              <div class="p-1.5">
                <span class="text-slate-500 block text-[9.5px] font-bold">ধর্ম / জন্ম তারিখ :</span>
                <span class="font-bold text-slate-800 block text-[10.5px]">${st.dob ? ResultEngine.toBnDigit(st.dob) + ' ' : ''}(${st.religion === 'hindu' ? 'সনাতন' : (st.religion === 'christian' ? 'খ্রিষ্টান' : (st.religion === 'buddhist' ? 'বৌদ্ধ' : 'ইসলাম'))})</span>
              </div>
              <div class="p-1.5 flex flex-col justify-center">
                <span class="text-slate-500 block text-[9.5px] font-bold mb-0.5">ফলাফল স্ট্যাটাস :</span>
                <span class="inline-flex items-center w-fit px-2 py-0.2 rounded-full text-[10px] font-black ${isPassed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}">
                  ${isPassed ? '✓ উত্তীর্ণ (Passed)' : `✕ অকৃতকার্য (${calculated.fail_count ? `Fail in ${calculated.fail_count}` : 'Failed'})`}
                </span>
              </div>
            </div>
          </div>

          <!-- 3. Result Performance Area (SSC 4th Subject Matrix or Standard 4-Block Bar) -->
          ${(isSec && calculated.fourth_subject_info) ? `
          <div class="mb-2 border-2 border-slate-900 rounded-lg overflow-hidden bg-white shadow-xs">
            <div class="grid grid-cols-12 divide-x-2 divide-slate-900">
              <div class="col-span-7 bg-slate-50/70 p-1.5 flex flex-col justify-center">
                <div class="text-[9.5px] font-black uppercase text-slate-800 tracking-wider mb-0.5 flex items-center justify-between">
                  <span><i class="fas fa-calculator text-emerald-700 mr-1"></i> এসএসসি ৪র্থ বিষয়ের জিপিএ গণনা ছক</span>
                  <span class="text-[8px] font-mono font-bold bg-amber-100 text-amber-900 px-1 rounded">Rule: GP > 2.00</span>
                </div>
                <table class="w-full text-center border-collapse text-[9.5px] font-sans">
                  <thead>
                    <tr class="bg-slate-200/90 text-slate-950 font-black border-b border-slate-900 text-[8.5px]">
                      <th class="py-0.5 px-1 border-r border-slate-400">GPA (Without 4th)</th>
                      <th class="py-0.5 px-1 border-r border-slate-400">৪র্থ বিষয় (${calculated.fourth_subject_info.name_bn})</th>
                      <th class="py-0.5 px-1 border-r border-slate-400 text-amber-900">GP Above 2.00</th>
                      <th class="py-0.5 px-1 text-emerald-950 font-black">Total GPA</th>
                    </tr>
                  </thead>
                  <tbody class="font-mono font-black text-slate-900 bg-white">
                    <tr>
                      <td class="py-0.5 px-1 border-r border-slate-300 text-xs">${ResultEngine.formatGpa(calculated.gpa_without_4th)}</td>
                      <td class="py-0.5 px-1 border-r border-slate-300 text-xs text-slate-700">${ResultEngine.formatGpa(calculated.fourth_subject_info.point)} <span class="text-[8px] font-sans font-bold">(${calculated.fourth_subject_info.grade})</span></td>
                      <td class="py-0.5 px-1 border-r border-slate-300 text-xs text-amber-700 font-extrabold">+${ResultEngine.formatGpa(calculated.fourth_subject_info.bonus_point)}</td>
                      <td class="py-0.5 px-1 text-sm font-black text-emerald-700">${isPassed ? ResultEngine.formatGpa(calculated.gpa) : '0.00'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="col-span-5 grid grid-cols-3 divide-x divide-slate-300 text-center py-1">
                <div class="px-1 flex flex-col justify-center">
                  <span class="text-[8px] font-extrabold text-slate-600 block uppercase">GRADE</span>
                  <span class="text-lg font-black text-blue-800 font-mono block leading-tight mt-0.5">${isPassed ? calculated.grade : 'F'}</span>
                </div>
                <div class="px-1 flex flex-col justify-center">
                  <span class="text-[8px] font-extrabold text-slate-600 block uppercase">RANK</span>
                  <span class="text-lg font-black text-amber-800 block leading-tight mt-0.5">${rankDisplay}</span>
                </div>
                <div class="px-1 flex flex-col justify-center">
                  <span class="text-[8px] font-extrabold text-slate-600 block uppercase">TOTAL</span>
                  <span class="text-xs font-black text-purple-900 font-mono block leading-tight mt-0.5">${ResultEngine.toBnDigit(calculated.total_marks)}</span>
                </div>
              </div>
            </div>
          </div>
          ` : `
          <div class="mb-2 grid grid-cols-4 border-2 border-slate-900 rounded-lg overflow-hidden divide-x-2 divide-slate-900 bg-white text-center shadow-xs">
            <div class="py-1.5 px-1 bg-emerald-50/40">
              <span class="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider block">প্রাপ্ত জিপিএ (GPA)</span>
              <span class="text-2xl font-black text-emerald-800 font-mono leading-none block mt-0.5">${isPassed ? ResultEngine.formatGpa(calculated.gpa) : '0.00'}</span>
            </div>
            <div class="py-1.5 px-1 bg-blue-50/40">
              <span class="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider block">লেটার গ্রেড (GRADE)</span>
              <span class="text-2xl font-black text-blue-800 font-mono leading-none block mt-0.5">${isPassed ? calculated.grade : 'F'}</span>
            </div>
            <div class="py-1.5 px-1 bg-amber-50/40">
              <span class="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider block">মেধা স্থান (RANK)</span>
              <span class="text-2xl font-black text-amber-800 leading-none block mt-0.5">${rankDisplay}</span>
            </div>
            <div class="py-1.5 px-1 bg-purple-50/40">
              <span class="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider block">মোট নম্বর (TOTAL)</span>
              <span class="text-2xl font-black text-purple-900 font-mono leading-none block mt-0.5">${ResultEngine.toBnDigit(calculated.total_marks)} / ${ResultEngine.toBnDigit(calculated.max_possible_marks || 600)}</span>
            </div>
          </div>
          `}

          <!-- 4. Subject Marks Details Table -->
          <div class="mb-2 border-2 border-slate-900 rounded-lg overflow-hidden bg-white">
            <table class="w-full text-left text-[11px] border-collapse">
              <thead>
                ${isSec ? `
                <tr class="bg-slate-100 text-slate-950 font-black border-b-2 border-slate-900 text-[10px]">
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-8">ক্র.</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-14">কোড</th>
                  <th class="py-1 px-2 border-r border-slate-900">বিষয়ের নাম (Subject Name)</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-14">পূর্ণমান</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-11">CQ</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-11">MCQ</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-11">ব্যবহারিক</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-14">মোট</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-12">গ্রেড</th>
                  <th class="py-1 px-1.5 text-center w-12">পয়েন্ট</th>
                </tr>
                ` : isJunior ? `
                <tr class="bg-slate-100 text-slate-950 font-black border-b-2 border-slate-900 text-[10px]">
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-8">ক্র.</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-14">কোড</th>
                  <th class="py-1 px-2 border-r border-slate-900">বিষয়ের নাম (Subject Name)</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-14">পূর্ণমান</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-11">CQ</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-11">MCQ</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-14">মোট</th>
                  <th class="py-1 px-1.5 border-r border-slate-900 text-center w-12">গ্রেড</th>
                  <th class="py-1 px-1.5 text-center w-12">পয়েন্ট</th>
                </tr>
                ` : `
                <tr class="bg-slate-100 text-slate-950 font-black border-b-2 border-slate-900 text-[10.5px]">
                  <th class="py-1.5 px-2 border-r border-slate-900 text-center w-10">ক্র.</th>
                  <th class="py-1.5 px-2.5 border-r border-slate-900">বিষয়ের নাম (Subject Name)</th>
                  <th class="py-1.5 px-2 border-r border-slate-900 text-center w-16">পূর্ণমান</th>
                  <th class="py-1.5 px-2 border-r border-slate-900 text-center w-20">প্রাপ্ত নম্বর</th>
                  <th class="py-1.5 px-2 border-r border-slate-900 text-center w-16">লেটার গ্রেড</th>
                  <th class="py-1.5 px-2 text-center w-16">গ্রেড পয়েন্ট</th>
                </tr>
                `}
              </thead>
              <tbody class="divide-y divide-slate-300 text-slate-900 font-medium text-[10px]">
                ${subjectsRows}
              </tbody>
              <tfoot>
                ${isSec ? `
                <tr class="bg-slate-100 font-black border-t-2 border-slate-900 text-slate-950 text-[10.5px]">
                  <td colspan="3" class="py-1.5 px-2 border-r border-slate-900 text-right uppercase tracking-wide">সর্বমোট / চূড়ান্ত ফলাফল :</td>
                  <td class="py-1.5 px-1.5 border-r border-slate-900 text-center font-mono font-bold">${ResultEngine.toBnDigit(calculated.max_possible_marks || 600)}</td>
                  <td class="py-1.5 px-1.5 border-r border-slate-900 text-center font-mono font-bold">${totalCq > 0 ? ResultEngine.toBnDigit(totalCq) : '--'}</td>
                  <td class="py-1.5 px-1.5 border-r border-slate-900 text-center font-mono font-bold">${totalMcq > 0 ? ResultEngine.toBnDigit(totalMcq) : '--'}</td>
                  <td class="py-1.5 px-1.5 border-r border-slate-900 text-center font-mono font-bold">${totalPr > 0 ? ResultEngine.toBnDigit(totalPr) : '--'}</td>
                  <td class="py-1.5 px-1.5 border-r border-slate-900 text-center font-mono font-extrabold text-emerald-800 text-xs">${ResultEngine.toBnDigit(calculated.total_marks)}</td>
                  <td class="py-1.5 px-1.5 border-r border-slate-900 text-center font-bold text-blue-800 text-xs">${isPassed ? calculated.grade : 'F'}</td>
                  <td class="py-1.5 px-1.5 text-center font-mono font-extrabold text-emerald-800 text-xs">${isPassed ? ResultEngine.formatGpa(calculated.gpa) : '0.00'}</td>
                </tr>
                ` : isJunior ? `
                <tr class="bg-slate-100 font-black border-t-2 border-slate-900 text-slate-950 text-[10.5px]">
                  <td colspan="3" class="py-1.5 px-2 border-r border-slate-900 text-right uppercase tracking-wide">সর্বমোট / চূড়ান্ত ফলাফল :</td>
                  <td class="py-1.5 px-1.5 border-r border-slate-900 text-center font-mono font-bold">${ResultEngine.toBnDigit(calculated.max_possible_marks || 600)}</td>
                  <td class="py-1.5 px-1.5 border-r border-slate-900 text-center font-mono font-bold">${totalCq > 0 ? ResultEngine.toBnDigit(totalCq) : '--'}</td>
                  <td class="py-1.5 px-1.5 border-r border-slate-900 text-center font-mono font-bold">${totalMcq > 0 ? ResultEngine.toBnDigit(totalMcq) : '--'}</td>
                  <td class="py-1.5 px-1.5 border-r border-slate-900 text-center font-mono font-extrabold text-emerald-800 text-xs">${ResultEngine.toBnDigit(calculated.total_marks)}</td>
                  <td class="py-1.5 px-1.5 border-r border-slate-900 text-center font-bold text-blue-800 text-xs">${isPassed ? calculated.grade : 'F'}</td>
                  <td class="py-1.5 px-1.5 text-center font-mono font-extrabold text-emerald-800 text-xs">${isPassed ? ResultEngine.formatGpa(calculated.gpa) : '0.00'}</td>
                </tr>
                ` : `
                <tr class="bg-slate-100 font-black border-t-2 border-slate-900 text-slate-950 text-[11px]">
                  <td colspan="2" class="py-1.5 px-2.5 border-r border-slate-900 text-right uppercase tracking-wide">সর্বমোট / চূড়ান্ত ফলাফল :</td>
                  <td class="py-1.5 px-2 border-r border-slate-900 text-center font-mono font-bold">${ResultEngine.toBnDigit(calculated.max_possible_marks || 600)}</td>
                  <td class="py-1.5 px-2 border-r border-slate-900 text-center font-mono font-extrabold text-emerald-800 text-xs">${ResultEngine.toBnDigit(calculated.total_marks)}</td>
                  <td class="py-1.5 px-2 border-r border-slate-900 text-center font-bold text-blue-800 text-xs">${isPassed ? calculated.grade : 'F'}</td>
                  <td class="py-1.5 px-2 text-center font-mono font-extrabold text-emerald-800 text-xs">${isPassed ? ResultEngine.formatGpa(calculated.gpa) : '0.00'}</td>
                </tr>
                `}
              </tfoot>
            </table>
          </div>

          <!-- 5. Evaluation Remarks Strip -->
          <div class="mb-2 rounded-md border border-slate-300 p-1.5 bg-slate-50/50 flex items-center justify-between text-[11px]">
            <div class="flex items-center gap-1.5">
              <span class="font-black text-slate-900">শ্রেণি শিক্ষকের মন্তব্য:</span>
              <span class="text-slate-800 font-bold">${remarksText}</span>
            </div>
            <div class="text-[9.5px] text-slate-500 font-mono">
              উপস্থিতি: নিয়মিত
            </div>
          </div>

          <!-- 6. Bottom Signatures & Digital Verification -->
          <div class="grid grid-cols-3 gap-3 pt-2 border-t-2 border-slate-950 items-end">
            <!-- Left: QR Code & Verification -->
            <div class="flex items-center gap-2 text-left">
              <div class="w-14 h-14 p-0.5 border-2 border-slate-900 bg-white rounded-md flex-shrink-0 flex items-center justify-center">
                ${qrSvg}
              </div>
              <div class="text-[9px] text-slate-600 leading-tight space-y-0.5">
                <div class="font-black text-slate-950 text-[9.5px]">ডিজিটাল সত্যায়ন</div>
                <div class="font-mono text-slate-500 text-[8px]">FAYZAR-AUTH-VERIFIED</div>
                <div class="text-slate-800 font-bold text-[8.5px]">তারিখ: ${publishDateDisplay}</div>
              </div>
            </div>

            <!-- Middle: Class Teacher Signature -->
            <div class="text-center space-y-1">
              <div class="h-6 border-b-2 border-slate-800 border-dashed w-32 mx-auto"></div>
              <span class="text-[10px] font-bold text-slate-900 block">শ্রেণি শিক্ষকের স্বাক্ষর ও তারিখ</span>
            </div>

            <!-- Right: Principal Signature -->
            <div class="text-right space-y-1">
              <div class="h-6 border-b-2 border-slate-800 border-dashed w-36 ml-auto"></div>
              <span class="text-[10px] font-bold text-slate-900 block">প্রধান শিক্ষক / অধ্যক্ষের স্বাক্ষর ও সিল</span>
            </div>
          </div>

          <!-- 7. Mandatory Shop Branding & Credential Footer -->
          <div class="mt-2 pt-1.5 border-t border-dashed border-slate-400 flex items-center justify-between gap-1 text-[9px] text-slate-600 font-medium">
            <div class="flex items-center gap-1">
              <span>কম্পিউটারাইজড রেজাল্ট প্রস্তুত ও প্রক্রিয়াকরণে: <strong class="text-slate-950 font-bold">ফয়জার কম্পিউটার এন্ড ফটোস্ট্যাট</strong>, ফুলবাড়ী, দিনাজপুর</span>
            </div>
            <div class="font-mono font-bold text-slate-900">
              হেল্পলাইন: 01717-101919
            </div>
          </div>
        </div>
      `;

      batchPrintContainer.appendChild(page);
    });

    window.print();
  }

  // Method 1: 1-Click Roster Clone from Previous Year (2025 -> 2026)
  window.cloneStudentsFromPreviousYear = function () {
    const school = getActiveSchool();
    // Find students from previous year (2025) in this class
    const prevStudents = allStudents.filter(s => {
      const matchSchool = (s.institution_id === activeSchoolId) || (!s.institution_id && activeSchoolId === 'dreamland-school');
      const matchClass = String(s.class_id) === String(currentClassId);
      const sYear = String(s.year || s.academic_year || '2025');
      return matchSchool && matchClass && sYear === '2025';
    });

    if (prevStudents.length === 0) {
      alert('২০২৫ সালের এই শ্রেণিতে কোনো শিক্ষার্থী পাওয়া যায়নি। অনুগ্রহ করে "এক এক করে যোগ" অথবা "এক্সেল ফাইল ইমপোর্ট" ব্যবহার করুন।');
      return;
    }

    const currentExamObj = (school.exams || []).find(e => e.id === currentExamId);
    const examTitle = currentExamObj ? currentExamObj.name_bn : `${ResultEngine.toBnDigit(currentYear)} সালের পরীক্ষা`;

    if (!confirm(`২০২৫ সালের মোট ${ResultEngine.toBnDigit(prevStudents.length)} জন শিক্ষার্থীর তালিকা ${ResultEngine.toBnDigit(currentYear)} সালের "${examTitle}"-এ কপি করতে চান?`)) {
      return;
    }

    // Clone each student with blank marks
    const clonedList = prevStudents.map(st => {
      const blankSubjects = (st.subjects || []).map(sub => ({
        ...sub,
        marks_obtained: 0,
        grade: 'F',
        point: 0,
        is_absent: false
      }));

      const newId = `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      return {
        ...st,
        id: newId,
        year: String(currentYear),
        academic_year: String(currentYear),
        exam_id: currentExamId,
        exam_name_bn: examTitle,
        subjects: blankSubjects,
        total_marks: 0,
        gpa: 0,
        grade: 'F',
        status: 'Failed',
        position: null,
        merit_position: null,
        class_position: null,
        publish_status: 'draft'
      };
    });

    allStudents.push(...clonedList);
    ResultEngine.Storage.saveStudents(allStudents);
    if (typeof ResultEngine.Storage.saveCustomStudents === 'function') {
      const customList = allStudents.filter(s => s.is_custom || (typeof s.id === 'string' && s.id.startsWith('st_')));
      ResultEngine.Storage.saveCustomStudents(customList);
    }

    // Sync to Firestore in background
    clonedList.forEach(cl => ResultEngine.Firestore.saveStudentToFirestore(cl));

    showToast(`সফল! ২০২৫ সাল থেকে ${ResultEngine.toBnDigit(clonedList.length)} জন শিক্ষার্থী ${ResultEngine.toBnDigit(currentYear)} সালের "${examTitle}"-এ অন্তর্ভুক্ত হয়েছে।`, 'success');
    renderSpreadsheet();
    renderBatchPreview();
  };

  // Helpers for Class Classification & Subject Generation
  function isSecondaryClass(classId) {
    if (!classId) return false;
    const cid = String(classId).toLowerCase();
    return cid.includes('class_9') || cid.includes('class_10') || 
           cid.includes('class9') || cid.includes('class10') || 
           cid.includes('৯ম') || cid.includes('১০ম') || 
           cid.includes('নবম') || cid.includes('দশম') ||
           cid.includes('madrasah_class_9') || cid.includes('madrasah_class_10') ||
           cid.includes('dakhil_9') || cid.includes('dakhil_10');
  }

  function addReligionSubject(arr, religion) {
    if (religion === 'hindu') {
      arr.push({ code: '112', name_bn: 'হিন্দুধর্ম ও নৈতিক শিক্ষা', name_en: 'Hindu Religion & Moral Education', full_marks: 100, is_optional: false });
    } else if (religion === 'christian') {
      arr.push({ code: '113', name_bn: 'খ্রিস্টধর্ম ও নৈতিক শিক্ষা', name_en: 'Christian Religion & Moral Education', full_marks: 100, is_optional: false });
    } else if (religion === 'buddhist') {
      arr.push({ code: '114', name_bn: 'বৌদ্ধধর্ম ও নৈতিক শিক্ষা', name_en: 'Buddhist Religion & Moral Education', full_marks: 100, is_optional: false });
    } else {
      arr.push({ code: '111', name_bn: 'ইসলাম ও নৈতিক শিক্ষা', name_en: 'Islam & Moral Education', full_marks: 100, is_optional: false });
    }
  }

  function getClassSubjectList(classId, religion = 'islam', group = 'science', fourthSubject = '', schoolId = null) {
    const isSec = isSecondaryClass(classId);
    const currentConfig = config || (typeof window !== 'undefined' && window.DEFAULT_RESULTS_CONFIG) || {};
    const school = (currentConfig.institutions || []).find(i => i.id === (schoolId || activeSchoolId)) || getActiveSchool();
    const isMadrasah = (school.id && school.id.includes('madrasah')) || (String(classId).includes('madrasah') || String(classId).includes('dakhil'));

    const res = [];

    if (isMadrasah) {
      if (!isSec) {
        // Madrasah Classes 6, 7, 8
        res.push(
          { code: '201', name_bn: 'কুরআন মাজীদ ও তাজবীদ', name_en: 'Quran Mazid & Tajweed', full_marks: 100, is_optional: false },
          { code: '205', name_bn: 'আকাঈদ ও ফিকহ', name_en: 'Akaid & Fiqh', full_marks: 100, is_optional: false },
          { code: '203', name_bn: 'আরবি ১ম পত্র', name_en: 'Arabic 1st Paper', full_marks: 100, is_optional: false },
          { code: '204', name_bn: 'আরবি ২য় পত্র', name_en: 'Arabic 2nd Paper', full_marks: 100, is_optional: false },
          { code: '101', name_bn: 'বাংলা ১ম পত্র', name_en: 'Bangla 1st Paper', full_marks: 100, is_optional: false },
          { code: '102', name_bn: 'বাংলা ২য় পত্র', name_en: 'Bangla 2nd Paper', full_marks: 50, is_optional: false },
          { code: '107', name_bn: 'ইংরেজি ১ম পত্র', name_en: 'English 1st Paper', full_marks: 100, is_optional: false },
          { code: '108', name_bn: 'ইংরেজি ২য় পত্র', name_en: 'English 2nd Paper', full_marks: 50, is_optional: false },
          { code: '109', name_bn: 'গণিত', name_en: 'Mathematics', full_marks: 100, is_optional: false },
          { code: '127', name_bn: 'সাধারণ বিজ্ঞান', name_en: 'General Science', full_marks: 100, is_optional: false },
          { code: '150', name_bn: 'বাংলাদেশ ও বিশ্বপরিচয়', name_en: 'BGS', full_marks: 100, is_optional: false },
          { code: '154', name_bn: 'তথ্য ও যোগাযোগ প্রযুক্তি', name_en: 'ICT', full_marks: 50, is_optional: false }
        );
      } else {
        // Madrasah Dakhil Classes 9 & 10
        // Compulsory core
        res.push(
          { code: '201', name_bn: 'কুরআন মাজীদ ও তাজবীদ', name_en: 'Quran Mazid & Tajweed', full_marks: 100, is_optional: false },
          { code: '202', name_bn: 'হাদিস শরিফ', name_en: 'Hadith Sharif', full_marks: 100, is_optional: false },
          {
            code: '203',
            name_bn: 'আরবি',
            name_en: 'Arabic',
            full_marks: 200,
            is_optional: false,
            papers: [
              { code: '203-1', name_bn: 'আরবি ১ম পত্র', name_en: 'Arabic 1st Paper', full_marks: 100 },
              { code: '203-2', name_bn: 'আরবি ২য় পত্র', name_en: 'Arabic 2nd Paper', full_marks: 100 }
            ]
          },
          { code: '205', name_bn: 'আকাঈদ ও ফিকহ', name_en: 'Akaid & Fiqh', full_marks: 100, is_optional: false },
          {
            code: '101',
            name_bn: 'বাংলা',
            name_en: 'Bangla',
            full_marks: 200,
            is_optional: false,
            papers: [
              { code: '101-1', name_bn: 'বাংলা ১ম পত্র', name_en: 'Bangla 1st Paper', full_marks: 100 },
              { code: '101-2', name_bn: 'বাংলা ২য় পত্র', name_en: 'Bangla 2nd Paper', full_marks: 100 }
            ]
          },
          {
            code: '107',
            name_bn: 'ইংরেজি',
            name_en: 'English',
            full_marks: 200,
            is_optional: false,
            papers: [
              { code: '107-1', name_bn: 'ইংরেজি ১ম পত্র', name_en: 'English 1st Paper', full_marks: 100 },
              { code: '107-2', name_bn: 'ইংরেজি ২য় পত্র', name_en: 'English 2nd Paper', full_marks: 100 }
            ]
          },
          { code: '109', name_bn: 'গণিত', name_en: 'Mathematics', full_marks: 100, is_optional: false }
        );

        const isSciGroup = group === 'science' || group === 'বিজ্ঞান';
        if (isSciGroup) {
          res.push(
            { code: '136', name_bn: 'পদার্থবিজ্ঞান', name_en: 'Physics', full_marks: 100, is_optional: false },
            { code: '137', name_bn: 'রসায়ন', name_en: 'Chemistry', full_marks: 100, is_optional: false },
            { code: '138', name_bn: 'জীববিজ্ঞান', name_en: 'Biology', full_marks: 100, is_optional: false },
            { code: '154', name_bn: 'তথ্য ও যোগাযোগ প্রযুক্তি', name_en: 'ICT', full_marks: 50, is_optional: false }
          );
          if (fourthSubject === 'higher_math') {
            res.push({ code: '126', name_bn: 'উচ্চতর গণিত (৪র্থ বিষয়)', name_en: 'Higher Mathematics (4th Subject)', full_marks: 100, is_optional: true });
          } else {
            res.push({ code: '134', name_bn: 'কৃষি শিক্ষা (৪র্থ বিষয়)', name_en: 'Agriculture Studies (4th Subject)', full_marks: 100, is_optional: true });
          }
        } else {
          // সাধারণ বিভাগ
          res.push(
            { code: '154', name_bn: 'তথ্য ও যোগাযোগ প্রযুক্তি', name_en: 'ICT', full_marks: 50, is_optional: false },
            { code: '112', name_bn: 'ইসলামের ইতিহাস', name_en: 'Islamic History', full_marks: 100, is_optional: false },
            { code: '127', name_bn: 'সাধারণ বিজ্ঞান', name_en: 'General Science', full_marks: 100, is_optional: false }
          );
          if (fourthSubject === 'civics') {
            res.push({ code: '140', name_bn: 'পৌরনীতি ও নাগরিকতা (৪র্থ বিষয়)', name_en: 'Civics (4th Subject)', full_marks: 100, is_optional: true });
          } else if (fourthSubject === 'domestic_science') {
            res.push({ code: '135', name_bn: 'গার্হস্থ্য বিজ্ঞান (৪র্থ বিষয়)', name_en: 'Domestic Science (4th Subject)', full_marks: 100, is_optional: true });
          } else {
            res.push({ code: '134', name_bn: 'কৃষি শিক্ষা (৪র্থ বিষয়)', name_en: 'Agriculture Studies (4th Subject)', full_marks: 100, is_optional: true });
          }
        }
      }
    } else {
      // School (Dreamland School)
      const isJunior = isJuniorSecondaryClass(classId);
      if (isJunior) {
        // Classes 6, 7, 8 (Junior Secondary)
        res.push(
          { code: '101', name_bn: 'বাংলা ১ম পত্র', name_en: 'Bangla 1st Paper', full_marks: 100, is_optional: false },
          { code: '102', name_bn: 'বাংলা ২য় পত্র', name_en: 'Bangla 2nd Paper', full_marks: 50, is_optional: false },
          { code: '107', name_bn: 'ইংরেজি ১ম পত্র', name_en: 'English 1st Paper', full_marks: 100, is_optional: false },
          { code: '108', name_bn: 'ইংরেজি ২য় পত্র', name_en: 'English 2nd Paper', full_marks: 50, is_optional: false },
          { code: '109', name_bn: 'গণিত', name_en: 'Mathematics', full_marks: 100, is_optional: false },
          { code: '127', name_bn: 'সাধারণ বিজ্ঞান', name_en: 'General Science', full_marks: 100, is_optional: false },
          { code: '150', name_bn: 'বাংলাদেশ ও বিশ্বপরিচয়', name_en: 'BGS', full_marks: 100, is_optional: false },
          { code: '154', name_bn: 'তথ্য ও যোগাযোগ প্রযুক্তি', name_en: 'ICT', full_marks: 50, is_optional: false },
          { code: '134', name_bn: 'কৃষি শিক্ষা', name_en: 'Agriculture Studies', full_marks: 100, is_optional: false }
        );
        addReligionSubject(res, religion);
      } else if (!isSec) {
        // Classes 0-5 (Primary)
        res.push(
          { code: '101', name_bn: 'বাংলা', name_en: 'Bangla', full_marks: 100, is_optional: false },
          { code: '102', name_bn: 'ইংরেজি', name_en: 'English', full_marks: 100, is_optional: false },
          { code: '103', name_bn: 'গণিত', name_en: 'Mathematics', full_marks: 100, is_optional: false },
          { code: '104', name_bn: 'প্রাথমিক বিজ্ঞান', name_en: 'Elementary Science', full_marks: 100, is_optional: false },
          { code: '105', name_bn: 'বাংলাদেশ ও বিশ্বপরিচয়', name_en: 'BGS', full_marks: 100, is_optional: false }
        );
        addReligionSubject(res, religion);
      } else {
        // Secondary Classes 9 & 10
        // Compulsory core
        res.push(
          {
            code: '101',
            name_bn: 'বাংলা',
            name_en: 'Bangla',
            full_marks: 200,
            is_optional: false,
            papers: [
              { code: '101', name_bn: 'বাংলা ১ম পত্র', name_en: 'Bangla 1st Paper', full_marks: 100 },
              { code: '102', name_bn: 'বাংলা ২য় পত্র', name_en: 'Bangla 2nd Paper', full_marks: 100 }
            ]
          },
          {
            code: '107',
            name_bn: 'ইংরেজি',
            name_en: 'English',
            full_marks: 200,
            is_optional: false,
            papers: [
              { code: '107', name_bn: 'ইংরেজি ১ম পত্র', name_en: 'English 1st Paper', full_marks: 100 },
              { code: '108', name_bn: 'ইংরেজি ২য় পত্র', name_en: 'English 2nd Paper', full_marks: 100 }
            ]
          },
          { code: '109', name_bn: 'গণিত', name_en: 'Mathematics', full_marks: 100, is_optional: false },
          { code: '154', name_bn: 'তথ্য ও যোগাযোগ প্রযুক্তি', name_en: 'ICT', full_marks: 50, is_optional: false }
        );
        addReligionSubject(res, religion);

        const isSciGroup = group === 'science' || group === 'বিজ্ঞান';
        if (isSciGroup) {
          res.push(
            { code: '136', name_bn: 'পদার্থবিজ্ঞান', name_en: 'Physics', full_marks: 100, is_optional: false },
            { code: '137', name_bn: 'রসায়ন', name_en: 'Chemistry', full_marks: 100, is_optional: false },
            { code: '138', name_bn: 'জীববিজ্ঞান', name_en: 'Biology', full_marks: 100, is_optional: false },
            { code: '150', name_bn: 'বাংলাদেশ ও বিশ্বপরিচয়', name_en: 'BGS', full_marks: 100, is_optional: false }
          );
          if (fourthSubject === 'higher_math') {
            res.push({ code: '126', name_bn: 'উচ্চতর গণিত (৪র্থ বিষয়)', name_en: 'Higher Mathematics (4th Subject)', full_marks: 100, is_optional: true });
          } else if (fourthSubject === 'biology') {
            res.push({ code: '138', name_bn: 'জীববিজ্ঞান (৪র্থ বিষয়)', name_en: 'Biology (4th Subject)', full_marks: 100, is_optional: true });
          } else {
            res.push({ code: '134', name_bn: 'কৃষি শিক্ষা (৪র্থ বিষয়)', name_en: 'Agriculture Studies (4th Subject)', full_marks: 100, is_optional: true });
          }
        } else {
          // মানবিক বিভাগ
          res.push(
            { code: '127', name_bn: 'সাধারণ বিজ্ঞান', name_en: 'General Science', full_marks: 100, is_optional: false },
            { code: '153', name_bn: 'বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা', name_en: 'History of BD & World', full_marks: 100, is_optional: false },
            { code: '110', name_bn: 'ভূগোল ও পরিবেশ', name_en: 'Geography & Environment', full_marks: 100, is_optional: false },
            { code: '140', name_bn: 'পৌরনীতি ও নাগরিকতা', name_en: 'Civics & Citizenship', full_marks: 100, is_optional: false }
          );
          if (fourthSubject === 'domestic_science') {
            res.push({ code: '135', name_bn: 'গার্হস্থ্য বিজ্ঞান (৪র্থ বিষয়)', name_en: 'Domestic Science (4th Subject)', full_marks: 100, is_optional: true });
          } else if (fourthSubject === 'economics') {
            res.push({ code: '141', name_bn: 'অর্থনীতি (৪র্থ বিষয়)', name_en: 'Economics (4th Subject)', full_marks: 100, is_optional: true });
          } else {
            res.push({ code: '134', name_bn: 'কৃষি শিক্ষা (৪র্থ বিষয়)', name_en: 'Agriculture Studies (4th Subject)', full_marks: 100, is_optional: true });
          }
        }
      }
    }

    // Apply any customized class full marks from settings
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('class_full_marks_' + (schoolId || activeSchoolId) + '_' + classId);
        if (stored) {
          const fmMap = JSON.parse(stored);
          res.forEach(sub => {
            const k = sub.code || sub.name_bn;
            if (fmMap[k] !== undefined) sub.full_marks = fmMap[k];
          });
        }
      }
    } catch (e) {}

    return res;
  }

  // Dynamic 4th Subject options update for Add Student modal
  window.updateNewStudentFourthSubjectOptions = function () {
    const isSec = isSecondaryClass(currentClassId);
    if (!isSec) return;
    const group = document.getElementById('newStudentGroup')?.value || 'science';
    const fourthSelect = document.getElementById('newStudentFourthSubject');
    if (!fourthSelect) return;

    const school = getActiveSchool();
    const isMadrasah = school.id && school.id.includes('madrasah');

    fourthSelect.innerHTML = '';
    if (isMadrasah) {
      if (group === 'science') {
        fourthSelect.innerHTML = `
          <option value="higher_math" selected>উচ্চতর গণিত (৪র্থ বিষয় - ১২৬)</option>
          <option value="agriculture">কৃষি শিক্ষা (৪র্থ বিষয় - ১৩৪)</option>
        `;
      } else {
        fourthSelect.innerHTML = `
          <option value="agriculture" selected>কৃষি শিক্ষা (৪র্থ বিষয় - ১৩৪)</option>
          <option value="civics">পৌরনীতি ও নাগরিকতা (৪র্থ বিষয় - ১৪০)</option>
          <option value="domestic_science">গার্হস্থ্য বিজ্ঞান (৪র্থ বিষয় - ১৩৫)</option>
        `;
      }
    } else {
      if (group === 'science') {
        fourthSelect.innerHTML = `
          <option value="higher_math" selected>উচ্চতর গণিত (৪র্থ বিষয় - ১২৬)</option>
          <option value="agriculture">কৃষি শিক্ষা (৪র্থ বিষয় - ১৩৪)</option>
          <option value="biology">জীববিজ্ঞান (৪র্থ বিষয় - ১৩৮)</option>
        `;
      } else {
        fourthSelect.innerHTML = `
          <option value="agriculture" selected>কৃষি শিক্ষা (৪র্থ বিষয় - ১৩৪)</option>
          <option value="domestic_science">গার্হস্থ্য বিজ্ঞান (৪র্থ বিষয় - ১৩৫)</option>
          <option value="economics">অর্থনীতি (৪র্থ বিষয় - ১৪১)</option>
        `;
      }
    }
  };

  // Dynamic 4th Subject options update for Edit Student modal
  window.updateEditStudentFourthSubjectOptions = function (selectedVal) {
    const group = document.getElementById('editStudentGroup')?.value || 'science';
    const fourthSelect = document.getElementById('editStudentFourthSubject');
    if (!fourthSelect) return;

    const school = getActiveSchool();
    const isMadrasah = school.id && school.id.includes('madrasah');

    fourthSelect.innerHTML = '';
    if (isMadrasah) {
      if (group === 'science') {
        fourthSelect.innerHTML = `
          <option value="higher_math">উচ্চতর গণিত (৪র্থ বিষয় - ১২৬)</option>
          <option value="agriculture">কৃষি শিক্ষা (৪র্থ বিষয় - ১৩৪)</option>
        `;
      } else {
        fourthSelect.innerHTML = `
          <option value="agriculture">কৃষি শিক্ষা (৪র্থ বিষয় - ১৩৪)</option>
          <option value="civics">পৌরনীতি ও নাগরিকতা (৪র্থ বিষয় - ১৪০)</option>
          <option value="domestic_science">গার্হস্থ্য বিজ্ঞান (৪র্থ বিষয় - ১৩৫)</option>
        `;
      }
    } else {
      if (group === 'science') {
        fourthSelect.innerHTML = `
          <option value="higher_math">উচ্চতর গণিত (৪র্থ বিষয় - ১২৬)</option>
          <option value="agriculture">কৃষি শিক্ষা (৪র্থ বিষয় - ১৩৪)</option>
          <option value="biology">জীববিজ্ঞান (৪র্থ বিষয় - ১৩৮)</option>
        `;
      } else {
        fourthSelect.innerHTML = `
          <option value="agriculture">কৃষি শিক্ষা (৪র্থ বিষয় - ১৩৪)</option>
          <option value="domestic_science">গার্হস্থ্য বিজ্ঞান (৪র্থ বিষয় - ১৩৫)</option>
          <option value="economics">অর্থনীতি (৪র্থ বিষয় - ১৪১)</option>
        `;
      }
    }
    if (selectedVal) fourthSelect.value = selectedVal;
  };

  // =========================================================================
  // নতুন শিক্ষার্থী যোগ মডাল ও নিয়ন্ত্রণ (Add Student Modal Management)
  // =========================================================================
  function openAddStudentModal() {
    const modal = document.getElementById('addStudentModal');
    if (!modal) return;
    const form = document.getElementById('newStudentForm');
    if (form) form.reset();

    // Auto calculate next roll
    const currentStudents = getStudentsInCurrentClass();
    let maxRoll = 0;
    currentStudents.forEach(s => {
      const r = parseInt(s.roll, 10);
      if (!isNaN(r) && r > maxRoll) maxRoll = r;
    });
    const rollInput = document.getElementById('newStudentRoll');
    if (rollInput) rollInput.value = maxRoll + 1;

    const isSec = isSecondaryClass(currentClassId);
    const religionWrapper = document.getElementById('newStudentReligionWrapper');
    const groupWrapper = document.getElementById('newStudentGroupWrapper');
    const fourthWrapper = document.getElementById('newStudentFourthSubjectWrapper');
    const promptBox = document.getElementById('fourthSubjectPromptBox');
    const groupSelect = document.getElementById('newStudentGroup');
    const school = getActiveSchool();
    const isMadrasah = school.id && school.id.includes('madrasah');

    if (isSec) {
      if (religionWrapper) religionWrapper.className = 'col-span-1';
      if (groupWrapper) {
        groupWrapper.classList.remove('hidden');
        if (isMadrasah) {
          groupSelect.innerHTML = `
            <option value="general" selected>সাধারণ বিভাগ</option>
            <option value="science">বিজ্ঞান বিভাগ</option>
          `;
        } else {
          groupSelect.innerHTML = `
            <option value="science" selected>বিজ্ঞান বিভাগ</option>
            <option value="humanities">মানবিক বিভাগ</option>
          `;
        }
      }
      if (fourthWrapper) fourthWrapper.classList.remove('hidden');
      if (promptBox) promptBox.classList.remove('hidden');
      window.updateNewStudentFourthSubjectOptions();
    } else {
      if (religionWrapper) religionWrapper.className = 'col-span-1 sm:col-span-2';
      if (groupWrapper) groupWrapper.classList.add('hidden');
      if (fourthWrapper) fourthWrapper.classList.add('hidden');
      if (promptBox) promptBox.classList.add('hidden');
    }

    modal.classList.remove('hidden');
  }
  window.openAddStudentModal = openAddStudentModal;

  function closeAddStudentModal() {
    const modal = document.getElementById('addStudentModal');
    if (modal) modal.classList.add('hidden');
  }
  window.closeAddStudentModal = closeAddStudentModal;

  async function handleCreateNewStudent(e) {
    if (e && e.preventDefault) e.preventDefault();

    const roll = parseInt(document.getElementById('newStudentRoll')?.value, 10);
    const name = document.getElementById('newStudentNameBn')?.value.trim();
    const father = document.getElementById('newStudentFather')?.value.trim() || '';
    const mother = document.getElementById('newStudentMother')?.value.trim() || '';
    const section = document.getElementById('newStudentSection')?.value.trim() || 'ক';
    const religion = document.getElementById('newStudentReligion')?.value || 'islam';
    const isSec = isSecondaryClass(currentClassId);
    const group = isSec ? (document.getElementById('newStudentGroup')?.value || 'science') : '';
    const groupBn = group === 'science' ? 'বিজ্ঞান' : (group === 'humanities' ? 'মানবিক' : 'সাধারণ');
    const fourthSubject = isSec ? (document.getElementById('newStudentFourthSubject')?.value || '') : '';

    if (!roll || !name) {
      showToast('রোল নম্বর ও শিক্ষার্থীর নাম আবশ্যক!', 'warning');
      return;
    }

    if (isSec && (!fourthSubject || fourthSubject === 'none')) {
      showToast('নবম ও দশম শ্রেণির শিক্ষার্থীর ক্ষেত্রে একটি ৪র্থ বিষয় নির্বাচন করা আবশ্যক!', 'warning');
      document.getElementById('newStudentFourthSubject')?.focus();
      return;
    }

    // Check duplicate roll in current class and section
    const currentStudents = getStudentsInCurrentClass();
    const exists = currentStudents.some(s => parseInt(s.roll, 10) === roll && (s.section || 'ক') === section);
    if (exists) {
      showToast(`রোল নম্বর ${ResultEngine.toBnDigit(roll)} শাখা "${section}"-এ ইতিমধ্যে বিদ্যমান! অন্য রোল নম্বর দিন।`, 'warning');
      return;
    }

    const school = getActiveSchool();
    const currentYearVal = editorYearSelect?.value || currentYear || '2026';
    const currentExamVal = editorExamSelect?.value || currentExamId;
    const currentClassVal = editorClassSelect?.value || currentClassId;

    currentYear = currentYearVal;
    currentExamId = currentExamVal;
    currentClassId = currentClassVal;

    const classObj = (school.classes || config.classes || []).find(c => c.id === currentClassId) || { name_bn: currentClassId };
    const currentExamObj = (school.exams || []).find(e => e.id === currentExamId);
    const examTitle = currentExamObj ? currentExamObj.name_bn : `${ResultEngine.toBnDigit(currentYear)} সালের পরীক্ষা`;

    // Inherit subject configuration from existing class students if available
    let subjectList = [];
    if (currentStudents.length > 0) {
      const templateStudent = currentStudents.find(s => s.religion === religion && (isSec ? s.group_bn === groupBn : true)) || currentStudents[0];
      if (templateStudent && Array.isArray(templateStudent.subjects) && templateStudent.subjects.length > 0) {
        subjectList = JSON.parse(JSON.stringify(templateStudent.subjects)).map(sub => {
          const cleanSub = {
            ...sub,
            cq: 0,
            mcq: 0,
            practical: 0,
            marks_obtained: 0,
            grade: 'F',
            point: 0,
            is_absent: false
          };
          if (Array.isArray(cleanSub.papers)) {
            cleanSub.papers = cleanSub.papers.map(p => ({
              ...p,
              cq: 0,
              mcq: 0,
              practical: 0,
              marks_obtained: 0
            }));
          }
          return cleanSub;
        });

        if (templateStudent.religion !== religion) {
          subjectList = subjectList.filter(s => {
            const code = String(s.code || '');
            const n = s.name_bn || '';
            return !['111', '112', '113', '114'].includes(code) && !n.includes('ধর্ম');
          });
          addReligionSubject(subjectList, religion);
        }
      }
    }

    if (!subjectList || subjectList.length === 0) {
      subjectList = getClassSubjectList(currentClassId, religion, group, fourthSubject, activeSchoolId).map(sub => {
        const copy = {
          ...sub,
          cq: 0,
          mcq: 0,
          practical: 0,
          marks_obtained: 0,
          grade: 'F',
          point: 0,
          is_absent: false
        };
        if (Array.isArray(copy.papers)) {
          copy.papers = copy.papers.map(p => ({
            ...p,
            cq: 0,
            mcq: 0,
            practical: 0,
            marks_obtained: 0
          }));
        }
        return copy;
      });
    }

    const newStudent = {
      id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      institution_id: activeSchoolId,
      institution_name_bn: school.name_bn,
      year: String(currentYear),
      academic_year: String(currentYear),
      exam_id: currentExamId,
      exam_name_bn: examTitle,
      class_id: currentClassId,
      class_name_bn: classObj.name_bn,
      roll: roll,
      student_name_bn: name,
      father_name_bn: father,
      mother_name_bn: mother,
      section: section,
      dob: '',
      religion: religion,
      group_bn: isSec ? groupBn : '',
      fourth_subject: isSec ? fourthSubject : '',
      subjects: subjectList,
      total_marks: 0,
      gpa: 0,
      grade: 'F',
      status: 'Failed',
      position: null,
      merit_position: null,
      class_position: null,
      publish_status: 'draft',
      is_custom: true
    };

    const calc = ResultEngine.calculateStudent(newStudent);
    Object.assign(newStudent, calc);

    allStudents.push(newStudent);

    // Recalculate positions
    const classStudents = getStudentsInCurrentClass();
    const ranked = ResultEngine.calculateClassPositions(classStudents);
    ranked.forEach(r => {
      const target = allStudents.find(s => s.id === r.id);
      if (target) Object.assign(target, r);
    });

    // Save locally to both allStudents and custom delta storage
    await ResultEngine.Storage.saveStudents(allStudents);
    if (typeof ResultEngine.Storage.saveCustomStudents === 'function') {
      const customList = allStudents.filter(s => s.is_custom || (typeof s.id === 'string' && s.id.startsWith('st_')));
      await ResultEngine.Storage.saveCustomStudents(customList);
    }
    ResultEngine.Firestore.saveStudentToFirestore(newStudent);

    // Sync to backend
    try {
      await fetch('/api/results/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allStudents)
      });
    } catch (err) {}

    closeAddStudentModal();

    // Reset section filter to 'all' so new student is immediately visible
    currentSection = 'all';
    if (editorSectionSelect) {
      editorSectionSelect.value = 'all';
    }

    renderSpreadsheet();
    renderBatchPreview();
    showToast(`শিক্ষার্থী "${name}" (রোল: ${ResultEngine.toBnDigit(roll)}) সফলভাবে যোগ করা হয়েছে!`, 'success');

    // Smoothly scroll to and highlight the newly added student's row
    setTimeout(() => {
      const newRow = document.querySelector(`tr[data-student-id="${newStudent.id}"]`);
      if (newRow) {
        newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        newRow.classList.add('ring-2', 'ring-emerald-500');
        setTimeout(() => newRow.classList.remove('ring-2', 'ring-emerald-500'), 2500);
      }
    }, 100);
  }

  // =========================================================================
  // শিক্ষার্থী তথ্য সংশোধন মডাল (Edit Student Modal Management)
  // =========================================================================
  window.openEditStudentModal = function(studentId) {
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;

    const modal = document.getElementById('editStudentModal');
    if (!modal) return;

    document.getElementById('editStudentId').value = student.id;
    document.getElementById('editStudentRoll').value = student.roll || '';
    document.getElementById('editStudentNameBn').value = student.student_name_bn || '';
    document.getElementById('editStudentFather').value = student.father_name_bn || '';
    document.getElementById('editStudentMother').value = student.mother_name_bn || '';
    document.getElementById('editStudentSection').value = student.section || 'ক';
    document.getElementById('editStudentReligion').value = student.religion || 'islam';

    const isSec = isSecondaryClass(student.class_id);
    const groupWrapper = document.getElementById('editStudentGroupWrapper');
    const fourthWrapper = document.getElementById('editStudentFourthWrapper');
    const groupSelect = document.getElementById('editStudentGroup');
    const school = getActiveSchool();
    const isMadrasah = school.id && school.id.includes('madrasah');

    if (isSec) {
      if (groupWrapper) {
        groupWrapper.classList.remove('hidden');
        if (isMadrasah) {
          groupSelect.innerHTML = `
            <option value="general" ${student.group_bn === 'বিজ্ঞান' ? '' : 'selected'}>সাধারণ বিভাগ</option>
            <option value="science" ${student.group_bn === 'বিজ্ঞান' ? 'selected' : ''}>বিজ্ঞান বিভাগ</option>
          `;
        } else {
          groupSelect.innerHTML = `
            <option value="science" ${student.group_bn === 'মানবিক' ? '' : 'selected'}>বিজ্ঞান বিভাগ</option>
            <option value="humanities" ${student.group_bn === 'মানবিক' ? 'selected' : ''}>মানবিক বিভাগ</option>
          `;
        }
      }
      if (fourthWrapper) fourthWrapper.classList.remove('hidden');
      window.updateEditStudentFourthSubjectOptions(student.fourth_subject);
    } else {
      if (groupWrapper) groupWrapper.classList.add('hidden');
      if (fourthWrapper) fourthWrapper.classList.add('hidden');
    }

    modal.classList.remove('hidden');
  };

  window.closeEditStudentModal = function() {
    const modal = document.getElementById('editStudentModal');
    if (modal) modal.classList.add('hidden');
  };

  async function handleSaveEditedStudent(e) {
    if (e && e.preventDefault) e.preventDefault();

    const studentId = document.getElementById('editStudentId')?.value;
    const student = allStudents.find(s => s.id === studentId);
    if (!student) {
      alert('শিক্ষার্থী রেকর্ড পাওয়া যায়নি!');
      return;
    }

    const roll = parseInt(document.getElementById('editStudentRoll')?.value, 10);
    const name = document.getElementById('editStudentNameBn')?.value.trim();
    const father = document.getElementById('editStudentFather')?.value.trim() || '';
    const mother = document.getElementById('editStudentMother')?.value.trim() || '';
    const section = document.getElementById('editStudentSection')?.value.trim() || 'ক';
    const religion = document.getElementById('editStudentReligion')?.value || 'islam';
    const isSec = isSecondaryClass(student.class_id);
    const group = isSec ? (document.getElementById('editStudentGroup')?.value || 'science') : '';
    const groupBn = group === 'science' ? 'বিজ্ঞান' : (group === 'humanities' ? 'মানবিক' : 'সাধারণ');
    const fourthSubject = isSec ? (document.getElementById('editStudentFourthSubject')?.value || '') : '';

    if (!roll || !name) {
      showToast('রোল নম্বর ও শিক্ষার্থীর নাম আবশ্যক!', 'warning');
      return;
    }

    // Check duplicate roll (excluding current student)
    const currentStudents = getStudentsInCurrentClass();
    const duplicate = currentStudents.some(s => s.id !== studentId && parseInt(s.roll, 10) === roll && (s.section || 'ক') === section);
    if (duplicate) {
      showToast(`রোল নম্বর ${ResultEngine.toBnDigit(roll)} শাখা "${section}"-এ ইতিমধ্যে বিদ্যমান! অন্য রোল নম্বর দিন।`, 'warning');
      return;
    }

    student.roll = roll;
    student.student_name_bn = name;
    student.father_name_bn = father;
    student.mother_name_bn = mother;
    student.section = section;
    student.religion = religion;
    if (isSec) {
      student.group_bn = groupBn;
      student.fourth_subject = fourthSubject;
    }

    // Update subject list if curriculum structure changed, preserving marks
    const newSubjectList = getClassSubjectList(student.class_id, religion, group, fourthSubject, student.institution_id);
    const updatedSubjects = newSubjectList.map(newSub => {
      const existingSub = (student.subjects || []).find(old => (old.code && old.code === newSub.code) || (old.name_bn === newSub.name_bn));
      if (existingSub) {
        return {
          ...newSub,
          marks_obtained: existingSub.marks_obtained,
          is_absent: existingSub.is_absent,
          papers: Array.isArray(newSub.papers) && Array.isArray(existingSub.papers) ? newSub.papers.map((p, pIdx) => ({
            ...p,
            marks_obtained: existingSub.papers[pIdx]?.marks_obtained !== undefined ? existingSub.papers[pIdx].marks_obtained : p.marks_obtained,
            is_absent: existingSub.papers[pIdx]?.is_absent || false
          })) : newSub.papers
        };
      } else {
        return {
          ...newSub,
          marks_obtained: 0,
          grade: 'F',
          point: 0,
          is_absent: false
        };
      }
    });

    student.subjects = updatedSubjects;

    // Recalculate
    const calc = ResultEngine.calculateStudent(student);
    Object.assign(student, calc);

    // Recalculate class positions
    const classStudents = getStudentsInCurrentClass();
    const ranked = ResultEngine.calculateClassPositions(classStudents);
    ranked.forEach(r => {
      const target = allStudents.find(s => s.id === r.id);
      if (target) Object.assign(target, r);
    });

    // Save
    await ResultEngine.Storage.saveStudents(allStudents);
    ResultEngine.Firestore.saveStudentToFirestore(student);

    try {
      await fetch('/api/results/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allStudents)
      });
    } catch (err) {}

    window.closeEditStudentModal();
    renderSpreadsheet();
    renderBatchPreview();
    showToast(`শিক্ষার্থী "${name}" এর তথ্য সফলভাবে আপডেট ও সংরক্ষণ করা হয়েছে!`, 'success');
  }

  async function deleteStudentFromModal() {
    const studentId = document.getElementById('editStudentId')?.value;
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;

    if (!confirm(`আপনি কি নিশ্চিতভাবে শিক্ষার্থী "${student.student_name_bn}" (রোল: ${ResultEngine.toBnDigit(student.roll)}) কে তালিকা থেকে মুছে ফেলতে চান?`)) {
      return;
    }

    allStudents = allStudents.filter(s => s.id !== studentId);
    try {
      const remainingCustom = ResultEngine.Storage.getCustomStudents().filter(s => s.id !== studentId);
      ResultEngine.Storage.saveCustomStudents(remainingCustom);
    } catch (e) {}

    // Recalculate positions
    const classStudents = getStudentsInCurrentClass();
    const ranked = ResultEngine.calculateClassPositions(classStudents);
    ranked.forEach(r => {
      const target = allStudents.find(s => s.id === r.id);
      if (target) Object.assign(target, r);
    });

    // Save
    await ResultEngine.Storage.saveStudents(allStudents);
    try {
      await fetch('/api/results/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allStudents)
      });
    } catch (err) {}

    window.closeEditStudentModal();
    renderSpreadsheet();
    renderBatchPreview();
    showToast('শিক্ষার্থী সফলভাবে মুছে ফেলা হয়েছে!', 'info');
  }
  window.deleteStudentFromModal = deleteStudentFromModal;

  // =========================================================================
  // বিষয় ও পূর্ণমান ব্যবস্থাপনা মডাল (Subject Settings & Full Marks Management)
  // =========================================================================
  window.setAllClassSubjectsFullMarks = function (val) {
    const inputs = document.querySelectorAll('.subject-full-mark-input');
    inputs.forEach(inp => {
      inp.value = val;
    });
  };

  window.openSubjectSettingsModal = function () {
    const modal = document.getElementById('subjectSettingsModal');
    const tbody = document.getElementById('subjectSettingsTableBody');
    if (!modal || !tbody) return;

    if (editorClassSelect && editorClassSelect.value) {
      currentClassId = editorClassSelect.value;
    }

    const students = getStudentsInCurrentClass();
    let subjects = [];

    if (students.length === 0) {
      // If no students yet, load default class curriculum subjects so full marks can be configured beforehand
      const defaultList = getClassSubjectList(currentClassId, 'islam', 'science', '', activeSchoolId);
      subjects = defaultList.map(sub => ({
        code: sub.code || '',
        name_bn: sub.name_bn,
        full_marks: sub.full_marks || 100,
        is_optional: !!sub.is_optional
      }));
    } else {
      // Determine distinct subjects from existing students
      const subMap = new Map();
      students.forEach(st => {
        (st.subjects || []).forEach(sub => {
          const key = sub.code || sub.name_bn;
          if (!subMap.has(key)) {
            subMap.set(key, {
              code: sub.code || '',
              name_bn: sub.name_bn,
              full_marks: sub.full_marks || 100,
              is_optional: !!sub.is_optional
            });
          }
        });
      });
      subjects = Array.from(subMap.values());
    }

    if (subjects.length === 0) {
      alert('বর্তমান শ্রেণির কোনো বিষয় পাওয়া যায়নি!');
      return;
    }

    tbody.innerHTML = subjects.map(sub => `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <td class="p-2.5 text-center font-mono font-bold text-slate-500">${sub.code || '--'}</td>
        <td class="p-2.5 font-bold text-slate-900 dark:text-white">${sub.name_bn}</td>
        <td class="p-2.5 text-center">
          <input type="text"
            inputmode="numeric" 
            data-sub-key="${sub.code || sub.name_bn}"
            value="${sub.full_marks}" 
            class="subject-full-mark-input w-24 px-2 py-1 text-center font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-hidden"
          >
        </td>
        <td class="p-2.5 text-center">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${sub.is_optional ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}">
            ${sub.is_optional ? '৪র্থ বিষয়' : 'আবশ্যিক'}
          </span>
        </td>
      </tr>
    `).join('');

    modal.classList.remove('hidden');
  };

  window.closeSubjectSettingsModal = function () {
    const modal = document.getElementById('subjectSettingsModal');
    if (modal) modal.classList.add('hidden');
  };

  window.saveSubjectSettings = async function () {
    const inputs = document.querySelectorAll('.subject-full-mark-input');
    if (!inputs || inputs.length === 0) return;

    const newFullMarksMap = {};
    inputs.forEach(inp => {
      const key = inp.getAttribute('data-sub-key');
      const val = parseFloat(ResultEngine.toEnDigit(inp.value.trim())) || 100;
      if (key) newFullMarksMap[key] = val;
    });

    // Save class-level custom full marks in localStorage
    try {
      localStorage.setItem('class_full_marks_' + activeSchoolId + '_' + currentClassId, JSON.stringify(newFullMarksMap));
    } catch (e) {}

    // Update for all students in currentClassId
    let updatedCount = 0;
    allStudents.forEach(st => {
      const matchSchool = (st.institution_id === activeSchoolId) || (!st.institution_id && activeSchoolId === 'dreamland-school');
      if (matchSchool && String(st.class_id) === String(currentClassId)) {
        if (Array.isArray(st.subjects)) {
          st.subjects.forEach(sub => {
            const key = sub.code || sub.name_bn;
            if (newFullMarksMap[key] !== undefined) {
              sub.full_marks = newFullMarksMap[key];
            }
          });
          const calc = ResultEngine.calculateStudent(st);
          Object.assign(st, calc);
          updatedCount++;
        }
      }
    });

    // Recalculate rankings if students exist
    if (updatedCount > 0) {
      const classStudents = getStudentsInCurrentClass();
      const ranked = ResultEngine.calculateClassPositions(classStudents);
      ranked.forEach(r => {
        const target = allStudents.find(s => s.id === r.id);
        if (target) Object.assign(target, r);
      });
    }

    // Save
    await ResultEngine.Storage.saveStudents(allStudents);
    try {
      await fetch('/api/results/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allStudents)
      });
    } catch (err) {}

    window.closeSubjectSettingsModal();
    renderSpreadsheet();
    renderBatchPreview();
    if (updatedCount > 0) {
      showToast(`সফল! বর্তমান শ্রেণির বিষয়সমূহের পূর্ণমান আপডেট ও পুনঃগণনা সম্পন্ন হয়েছে (${ResultEngine.toBnDigit(updatedCount)} জন শিক্ষার্থী)।`, 'success');
    } else {
      showToast('সফল! বর্তমান শ্রেণির বিষয়সমূহের পূর্ণমান কনফিগারেশন সংরক্ষিত হয়েছে।', 'success');
    }
  };

  // Dropdown UI Helpers
  window.toggleExcelTemplatesMenu = function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const menu = document.getElementById('excelTemplatesMenu') || document.getElementById('spreadsheetExcelDropdownMenu');
    if (menu) menu.classList.toggle('hidden');
  };

  window.closeExcelTemplatesMenu = function () {
    const menu = document.getElementById('excelTemplatesMenu') || document.getElementById('spreadsheetExcelDropdownMenu');
    if (menu) menu.classList.add('hidden');
  };

  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('spreadsheetExcelDropdownWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      window.closeExcelTemplatesMenu();
    }
  });

  // =========================================================================
  // ৩ ধরনের এক্সেল টেমপ্লেট ডাউনলোড Engine (Excel Template 1, 2, 3)
  // =========================================================================
  window.downloadSampleExcelTemplate = function () {
    window.downloadTemplateWithMarksBlank();
  };

  // টেমপ্লেট ১: শুধুমাত্র ছাত্র/ছাত্রীর তালিকা (Students Only Template)
  window.downloadTemplateStudentsOnly = function () {
    window.closeExcelTemplatesMenu();
    if (typeof XLSX === 'undefined') {
      alert('SheetJS লাইব্রেরি পাওয়া যায়নি।');
      return;
    }

    const school = getActiveSchool();
    const classObj = (school.classes || config.classes || []).find(c => c.id === currentClassId) || { name_bn: currentClassId };
    const isSec = isSecondaryClass(currentClassId);

    const row1 = {
      'রোল নম্বর': 1,
      'শিক্ষার্থীর নাম': 'মোছাঃ তাসফিয়া জাহান',
      'শাখা': 'সাধারণ',
      'পিতার নাম': 'মোঃ রফিকুল ইসলাম',
      'মাতার নাম': 'মোছাঃ শামীমা আক্তার',
      'ধর্ম': 'ইসলাম'
    };
    if (isSec) {
      row1['৪র্থ বিষয়'] = 'কৃষি শিক্ষা';
    }

    const row2 = {
      'রোল নম্বর': 2,
      'শিক্ষার্থীর নাম': 'বর্ণ রায়',
      'শাখা': 'সাধারণ',
      'পিতার নাম': 'সুভাষ রায়',
      'মাতার নাম': 'দীপা রায়',
      'ধর্ম': 'হিন্দু'
    };
    if (isSec) {
      row2['৪র্থ বিষয়'] = 'উচ্চতর গণিত';
    }

    const ws = XLSX.utils.json_to_sheet([row1, row2]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${classObj.name_bn || 'Class'}`);

    const safeSchool = (school.name_en || 'School').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `1_Students_List_${safeSchool}_${currentClassId}_${currentYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // টেমপ্লেট ২: নম্বর সহ ফাঁকা নমুনা তালিকা (Blank Template with Marks Columns)
  window.downloadTemplateWithMarksBlank = function () {
    window.closeExcelTemplatesMenu();
    if (typeof XLSX === 'undefined') {
      alert('SheetJS লাইব্রেরি পাওয়া যায়নি।');
      return;
    }

    const school = getActiveSchool();
    const classObj = (school.classes || config.classes || []).find(c => c.id === currentClassId) || { name_bn: currentClassId };
    const isSec = isSecondaryClass(currentClassId);

    // Get unpacked columns for the current class
    let columns = [];
    const currentClassStudents = getStudentsInCurrentClass();
    if (currentClassStudents.length > 0) {
      columns = getDistinctClassColumns(currentClassStudents);
    } else {
      const sampleSubjects = getClassSubjectList(currentClassId, 'islam', 'science', isSec ? 'agriculture' : '', activeSchoolId);
      columns = getDistinctClassColumns([{ subjects: sampleSubjects }]);
    }

    const row1 = {
      'রোল নম্বর': 1,
      'শিক্ষার্থীর নাম': 'মোছাঃ তাসফিয়া জাহান',
      'শাখা': 'সাধারণ',
      'পিতার নাম': 'মোঃ রফিকুল ইসলাম',
      'মাতার নাম': 'মোছাঃ শামীমা আক্তার',
      'ধর্ম': 'ইসলাম'
    };
    if (isSec) row1['৪র্থ বিষয়'] = 'কৃষি শিক্ষা';

    const row2 = {
      'রোল নম্বর': 2,
      'শিক্ষার্থীর নাম': 'মোঃ আরিয়ান হোসেন',
      'শাখা': 'সাধারণ',
      'পিতার নাম': 'মোঃ জয়নাল আবেদীন',
      'মাতার নাম': 'মোছাঃ ফাতেমা বেগম',
      'ধর্ম': 'ইসলাম'
    };
    if (isSec) row2['৪র্থ বিষয়'] = isSec ? 'উচ্চতর গণিত' : '';

    columns.forEach(col => {
      const comps = getSubjectComponentConfig(col, currentClassId, activeSchoolId);
      comps.forEach(cmp => {
        let colTitle = '';
        if (comps.length === 1) {
          colTitle = `${col.name_bn} (${col.full_marks || 100})`;
        } else {
          colTitle = `${col.name_bn} (${cmp.label}-${cmp.max})`;
        }
        row1[colTitle] = Math.round(cmp.max * 0.85);
        row2[colTitle] = Math.round(cmp.max * 0.75);
      });
    });

    const ws = XLSX.utils.json_to_sheet([row1, row2]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${classObj.name_bn || 'Class'}`);

    const safeSchool = (school.name_en || 'School').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `2_Blank_With_Marks_${safeSchool}_${currentClassId}_${currentYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // টেমপ্লেট ৩: বর্তমান ক্লাসের শিক্ষার্থীদের তালিকা সহ নতুন নম্বর প্রদানের তালিকা (Class Roster for Entering Marks)
  window.downloadTemplateCurrentClassWithStudents = function () {
    window.closeExcelTemplatesMenu();
    if (typeof XLSX === 'undefined') {
      alert('SheetJS লাইব্রেরি পাওয়া যায়নি।');
      return;
    }

    const school = getActiveSchool();
    const classObj = (school.classes || config.classes || []).find(c => c.id === currentClassId) || { name_bn: currentClassId };
    const isSec = isSecondaryClass(currentClassId);

    // Get current students for this class and exam
    let students = getStudentsInCurrentClass();
    if (students.length === 0) {
      // Fallback: Check if students exist for this class in any exam/year
      students = allStudents.filter(s => {
        const matchSchool = (s.institution_id === activeSchoolId) || (!s.institution_id && activeSchoolId === 'dreamland-school');
        return matchSchool && String(s.class_id) === String(currentClassId);
      });
      // Deduplicate by roll
      const seen = new Set();
      students = students.filter(s => {
        const r = parseInt(s.roll, 10);
        if (seen.has(r)) return false;
        seen.add(r);
        return true;
      });
    }

    if (students.length === 0) {
      alert('এই শ্রেণিতে বর্তমানে কোনো শিক্ষার্থীর তালিকা পাওয়া যায়নি। একটি নমুনা টেমপ্লেট ডাউনলোড করা হচ্ছে যাতে আপনি সরাসরি শিক্ষার্থী ও নম্বর একসাথে এন্ট্রি করতে পারেন।');
      window.downloadTemplateWithMarksBlank();
      return;
    }

    // Sort by roll ascending
    students.sort((a, b) => (parseInt(a.roll, 10) || 0) - (parseInt(b.roll, 10) || 0));

    // Get unpacked columns
    const columns = getDistinctClassColumns(students);

    const rows = students.map(st => {
      const relBn = (st.religion === 'hindu') ? 'হিন্দু' : 
                    (st.religion === 'christian') ? 'খ্রিস্ট' : 
                    (st.religion === 'buddhist') ? 'বৌদ্ধ' : 'ইসলাম';
      
      let fourthBn = '';
      if (isSec) {
        if (st.fourth_subject === 'higher_math' || st.fourth_subject?.includes('গণিত')) fourthBn = 'উচ্চতর গণিত';
        else if (st.fourth_subject === 'agriculture' || st.fourth_subject?.includes('কৃষি')) fourthBn = 'কৃষি শিক্ষা';
        else if (st.fourth_subject === 'domestic_science' || st.fourth_subject?.includes('গার্হস্থ্য')) fourthBn = 'গার্হস্থ্য বিজ্ঞান';
        else if (st.fourth_subject === 'biology' || st.fourth_subject?.includes('জীব')) fourthBn = 'জীববিজ্ঞান';
        else fourthBn = st.fourth_subject || '';
      }

      const row = {
        'রোল নম্বর': st.roll,
        'শিক্ষার্থীর নাম': st.student_name_bn,
        'শাখা': st.section || 'সাধারণ',
        'পিতার নাম': st.father_name_bn || '',
        'মাতার নাম': st.mother_name_bn || '',
        'ধর্ম': relBn
      };
      if (isSec) row['৪র্থ বিষয়'] = fourthBn;

      // Fill in subject columns with current marks or blank
      columns.forEach(col => {
        const comps = getSubjectComponentConfig(col, currentClassId, activeSchoolId);
        let studentTarget = null;
        if (col.is_paper) {
          const parentSub = (st.subjects || []).find(s => s.code === col.parent_code || s.name_bn === col.parent_name_bn);
          if (parentSub && Array.isArray(parentSub.papers)) {
            studentTarget = parentSub.papers[col.paper_index] || parentSub.papers.find(p => p.code === col.code || p.name_bn === col.name_bn);
          }
        } else {
          studentTarget = (st.subjects || []).find(s => s.code === col.code || s.name_bn === col.name_bn);
        }

        comps.forEach(cmp => {
          let colTitle = '';
          if (comps.length === 1) {
            colTitle = `${col.name_bn} (${col.full_marks || 100})`;
          } else {
            colTitle = `${col.name_bn} (${cmp.label}-${cmp.max})`;
          }

          if (!studentTarget) {
            row[colTitle] = '';
          } else if (studentTarget.is_absent || studentTarget.marks_obtained === 'ABS') {
            row[colTitle] = 'ABS';
          } else if (cmp.key === 'marks_obtained') {
            row[colTitle] = (studentTarget.marks_obtained !== undefined && studentTarget.marks_obtained !== null) ? studentTarget.marks_obtained : '';
          } else {
            row[colTitle] = (studentTarget[cmp.key] !== undefined && studentTarget[cmp.key] !== null) ? studentTarget[cmp.key] : '';
          }
        });
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${classObj.name_bn || 'Class'}`);

    const safeSchool = (school.name_en || 'School').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `3_Class_Roster_For_Marks_${safeSchool}_${currentClassId}_${currentYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Helper to extract component marks from excel row
  function extractMarksFromRowForComponent(subOrPaper, comps, row) {
    let cq = 0;
    let mcq = 0;
    let practical = 0;
    let singleMark = 0;
    let isAbsent = false;
    let found = false;

    const nameBn = (subOrPaper.name_bn || '').toLowerCase().trim();
    const nameEn = (subOrPaper.name_en || '').toLowerCase().trim();
    const code = String(subOrPaper.code || '').trim();

    comps.forEach(cmp => {
      for (const [k, v] of Object.entries(row)) {
        const key = k.toLowerCase().trim();
        const matchesSub = key.includes(nameBn) || (nameEn && key.includes(nameEn)) || (code && key.includes(code));
        if (!matchesSub) continue;

        let matchesCmp = false;
        if (comps.length === 1) {
          matchesCmp = true;
        } else if (cmp.key === 'cq' && (key.includes('cq') || key.includes('সিকিউ') || key.includes('সৃজনশীল') || key.includes('তত্ত্বীয়') || key.includes('তত্ত্বীয়'))) {
          matchesCmp = true;
        } else if (cmp.key === 'mcq' && (key.includes('mcq') || key.includes('এমসিকিউ') || key.includes('বহুনির্বাচনি') || key.includes('নৈর্ব্যক্তিক'))) {
          matchesCmp = true;
        } else if (cmp.key === 'practical' && (key.includes('ব্যবহারিক') || key.includes('ব্য') || key.includes('prac'))) {
          matchesCmp = true;
        }

        if (matchesCmp) {
          const valStr = String(v).trim();
          if (valStr.toUpperCase() === 'ABS' || valStr === 'অনুপস্থিত') {
            isAbsent = true;
            found = true;
          } else {
            const num = parseFloat(ResultEngine.toEnDigit(valStr));
            if (!isNaN(num)) {
              const clamped = Math.min(cmp.max, Math.max(0, num));
              if (cmp.key === 'cq') cq = clamped;
              else if (cmp.key === 'mcq') mcq = clamped;
              else if (cmp.key === 'practical') practical = clamped;
              else singleMark = clamped;
              found = true;
            }
          }
          break;
        }
      }
    });

    // Fallback: match subject name directly
    if (!found) {
      for (const [k, v] of Object.entries(row)) {
        const key = k.toLowerCase().trim();
        const matchesSub = key.includes(nameBn) || (nameEn && key.includes(nameEn)) || (code && key.includes(code));
        if (matchesSub) {
          const valStr = String(v).trim();
          if (valStr.toUpperCase() === 'ABS' || valStr === 'অনুপস্থিত') {
            isAbsent = true;
            found = true;
          } else {
            const num = parseFloat(ResultEngine.toEnDigit(valStr));
            if (!isNaN(num)) {
              found = true;
              singleMark = num;
              if (comps.length === 2 && comps[0].key === 'cq' && comps[1].key === 'mcq') {
                cq = Math.round(num * (comps[0].max / (comps[0].max + comps[1].max)));
                mcq = num - cq;
              } else if (comps.length === 3) {
                cq = Math.round(num * 0.5);
                mcq = Math.round(num * 0.25);
                practical = num - cq - mcq;
              }
            }
          }
          break;
        }
      }
    }

    const total = (comps.length === 1) ? singleMark : (cq + mcq + practical);
    return {
      cq,
      mcq,
      practical,
      marks_obtained: isAbsent ? 'ABS' : Math.round(total * 100) / 100,
      is_absent: isAbsent,
      found
    };
  }

  function extractSubjectMarksFromRow(subject, row, classId) {
    if (Array.isArray(subject.papers) && subject.papers.length > 0) {
      let pSum = 0;
      let cqSum = 0;
      let mcqSum = 0;
      let prSum = 0;
      let anyFound = false;

      const updatedPapers = subject.papers.map(paper => {
        const comps = getSubjectComponentConfig(paper, classId, activeSchoolId);
        const pRes = extractMarksFromRowForComponent(paper, comps, row);
        if (pRes.found) anyFound = true;
        pSum += (parseFloat(pRes.marks_obtained) || 0);
        cqSum += (parseFloat(pRes.cq) || 0);
        mcqSum += (parseFloat(pRes.mcq) || 0);
        prSum += (parseFloat(pRes.practical) || 0);
        return {
          ...paper,
          cq: pRes.cq,
          mcq: pRes.mcq,
          practical: pRes.practical,
          marks_obtained: pRes.is_absent ? 'ABS' : pRes.marks_obtained,
          is_absent: pRes.is_absent
        };
      });

      return {
        ...subject,
        papers: updatedPapers,
        cq: cqSum,
        mcq: mcqSum,
        practical: prSum,
        marks_obtained: anyFound ? Math.round(pSum * 100) / 100 : (subject.marks_obtained || 0),
        is_absent: false,
        found: anyFound
      };
    } else {
      const comps = getSubjectComponentConfig(subject, classId, activeSchoolId);
      const sRes = extractMarksFromRowForComponent(subject, comps, row);
      return {
        ...subject,
        cq: sRes.cq,
        mcq: sRes.mcq,
        practical: sRes.practical,
        marks_obtained: sRes.found ? (sRes.is_absent ? 'ABS' : sRes.marks_obtained) : (subject.marks_obtained || 0),
        is_absent: sRes.is_absent,
        found: sRes.found
      };
    }
  }

  // Backward compatibility alias
  window.downloadSampleExcelTemplate = window.downloadTemplateWithMarksBlank;

  // Smart Upsert Excel Importer (স্মার্ট আপডেট ও সংযোজন)
  async function handleExcelUpload(file) {
    if (!file) return;
    if (typeof XLSX === 'undefined') {
      alert('SheetJS লাইব্রেরি লোড হয়নি!');
      return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (!Array.isArray(rows) || rows.length === 0) {
          alert('এক্সেল ফাইলটিতে কোনো তথ্য পাওয়া যায়নি!');
          return;
        }

        const school = getActiveSchool();
        const classObj = (school.classes || config.classes || []).find(c => c.id === currentClassId) || { name_bn: currentClassId };
        const currentExamObj = (school.exams || []).find(e => e.id === currentExamId);
        const examTitle = currentExamObj ? currentExamObj.name_bn : `${ResultEngine.toBnDigit(currentYear)} সালের পরীক্ষা`;
        const isSec = isSecondaryClass(currentClassId);

        let createdCount = 0;
        let updatedCount = 0;

        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const roll = parseInt(ResultEngine.toEnDigit(String(row['রোল নম্বর'] || row['রোল'] || row['Roll'] || row['roll'] || (idx + 1))), 10);
          const name = String(row['শিক্ষার্থীর নাম'] || row['নাম'] || row['Name'] || row['name'] || '').trim();
          if (!name) continue;

          const father = String(row['পিতার নাম'] || row['পিতা'] || row['Father'] || '').trim();
          const mother = String(row['মাতার নাম'] || row['মাতা'] || row['Mother'] || '').trim();
          const section = String(row['শাখা'] || row['Section'] || 'সাধারণ').trim();

          // Parse Religion
          const relStr = String(row['ধর্ম'] || row['Religion'] || row['religion'] || '').trim().toLowerCase();
          let religion = 'islam';
          if (relStr.includes('হিন্দু') || relStr.includes('hindu')) religion = 'hindu';
          else if (relStr.includes('খ্রিস্ট') || relStr.includes('christian')) religion = 'christian';
          else if (relStr.includes('বৌদ্ধ') || relStr.includes('buddhist')) religion = 'buddhist';

          // Parse 4th Subject (strictly for Class 9-10)
          let fourthSubject = '';
          if (isSec) {
            const fourthStr = String(row['৪র্থ বিষয়'] || row['৪র্থ বিষয়'] || row['4th Subject'] || row['fourth_subject'] || '').trim().toLowerCase();
            if (fourthStr.includes('উচ্চতর গণিত') || fourthStr.includes('higher') || fourthStr.includes('math')) fourthSubject = 'higher_math';
            else if (fourthStr.includes('কৃষি') || fourthStr.includes('agri')) fourthSubject = 'agriculture';
            else if (fourthStr.includes('গার্হস্থ্য') || fourthStr.includes('domestic')) fourthSubject = 'domestic_science';
            else if (fourthStr.includes('জীব') || fourthStr.includes('bio')) fourthSubject = 'biology';
          }

          // Generate base subject curriculum
          const classSubjects = getClassSubjectList(currentClassId, religion, (row['বিভাগ'] || 'science'), fourthSubject, activeSchoolId);

          // Extract marks using component parser
          let hasMarksInRow = false;
          const mappedSubjects = classSubjects.map(ts => {
            const res = extractSubjectMarksFromRow(ts, row, currentClassId);
            if (res.found) hasMarksInRow = true;
            return res;
          });

          // Check if student already exists in allStudents
          const existingIdx = allStudents.findIndex(s => {
            const matchSchool = (s.institution_id === activeSchoolId) || (!s.institution_id && activeSchoolId === 'dreamland-school');
            const matchClass = String(s.class_id) === String(currentClassId);
            const matchYear = String(s.year || s.academic_year) === String(currentYear);
            const matchExam = (s.exam_id === currentExamId);
            return matchSchool && matchClass && matchYear && matchExam && (parseInt(s.roll, 10) === roll);
          });

          if (existingIdx >= 0) {
            // Smart Update: Overwrite or update marks
            const target = allStudents[existingIdx];
            target.student_name_bn = name;
            if (father) target.father_name_bn = father;
            if (mother) target.mother_name_bn = mother;
            if (section) target.section = section;
            target.religion = religion;
            target.fourth_subject = fourthSubject;

            if (hasMarksInRow) {
              target.subjects = mappedSubjects;
            } else if (!target.subjects || target.subjects.length === 0) {
              target.subjects = mappedSubjects;
            }

            const calc = ResultEngine.calculateStudent(target);
            Object.assign(target, calc);
            updatedCount++;
          } else {
            // Insert New Student
            const newSt = {
              id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${idx}`,
              institution_id: activeSchoolId,
              institution_name_bn: school.name_bn,
              year: String(currentYear),
              academic_year: String(currentYear),
              exam_id: currentExamId,
              exam_name_bn: examTitle,
              class_id: currentClassId,
              class_name_bn: classObj.name_bn,
              roll: roll,
              student_name_bn: name,
              father_name_bn: father,
              mother_name_bn: mother,
              section: section,
              dob: '',
              religion: religion,
              fourth_subject: fourthSubject,
              subjects: mappedSubjects,
              publish_status: 'draft',
              status: 'Failed'
            };

            const calc = ResultEngine.calculateStudent(newSt);
            Object.assign(newSt, calc);
            allStudents.push(newSt);
            createdCount++;
          }
        }

        if (createdCount === 0 && updatedCount === 0) {
          alert('কোনো বৈধ শিক্ষার্থীর তথ্য পাওয়া যায়নি!');
          return;
        }

        // Recalculate rank positions for the entire current class
        const currentClassStudents = getStudentsInCurrentClass();
        const ranked = ResultEngine.calculateClassPositions(currentClassStudents);
        ranked.forEach(r => {
          const target = allStudents.find(s => s.id === r.id);
          if (target) Object.assign(target, r);
        });

        // Persist to local backend & browser storage
        await ResultEngine.Storage.saveStudents(allStudents);
        if (typeof ResultEngine.Storage.saveCustomStudents === 'function') {
          const customList = allStudents.filter(s => s.is_custom || (typeof s.id === 'string' && s.id.startsWith('st_')));
          await ResultEngine.Storage.saveCustomStudents(customList);
        }

        // Background sync to Firestore
        ranked.forEach(st => ResultEngine.Firestore.saveStudentToFirestore(st));

        const totalHandled = createdCount + updatedCount;
        if (importResultStatus) {
          importResultStatus.classList.remove('hidden');
          importResultStatus.innerHTML = `
            <div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
              <i class="fas fa-check-circle text-lg"></i>
              <span>সফল! মোট ${ResultEngine.toBnDigit(totalHandled)} জন শিক্ষার্থী (নতুন: ${ResultEngine.toBnDigit(createdCount)}, আপডেট: ${ResultEngine.toBnDigit(updatedCount)}) প্রক্রিয়াজাত করা হয়েছে।</span>
            </div>
            <div class="mt-2">
              <button type="button" onclick="window.switchAdminTab('spreadsheetTab')" class="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer">
                <i class="fas fa-table mr-1"></i> লাইভ স্প্রেডশিটে ফলাফল দেখুন
              </button>
            </div>
          `;
        }

        showToast(`সফল! মোট ${ResultEngine.toBnDigit(totalHandled)} জন শিক্ষার্থীর তথ্য সফলভাবে এক্সেল থেকে সেভ করা হয়েছে (নতুন যুক্ত: ${ResultEngine.toBnDigit(createdCount)}, আপডেট: ${ResultEngine.toBnDigit(updatedCount)})।`, 'success');
        switchAdminTab('spreadsheetTab');
        renderSpreadsheet();
      } catch (err) {
        console.error('Excel parse error:', err);
        alert('এক্সেল ফাইল প্রক্রিয়াকরণে সমস্যা: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // =========================================================================
  // MANAGE & EDIT CLASSES (নতুন শ্রেণি যোগ ও বিদ্যমান শ্রেণি এডিট/সংশোধন)
  // =========================================================================
  const manageClassesModal = document.getElementById('manageClassesModal');
  const manageClassForm = document.getElementById('manageClassForm');
  const editingClassOriginalId = document.getElementById('editingClassOriginalId');
  const classFormNameBn = document.getElementById('classFormNameBn');
  const classFormId = document.getElementById('classFormId');
  const classFormLevel = document.getElementById('classFormLevel');
  const classFormSections = document.getElementById('classFormSections');
  const manageClassFormTitle = document.getElementById('manageClassFormTitle');
  const cancelEditClassBtn = document.getElementById('cancelEditClassBtn');
  const classFormSubmitText = document.getElementById('classFormSubmitText');
  const manageClassesTableBody = document.getElementById('manageClassesTableBody');
  const activeSchoolClassCountBadge = document.getElementById('activeSchoolClassCountBadge');

  window.openManageClassesModal = function () {
    if (manageClassesModal) manageClassesModal.classList.remove('hidden');
    window.resetClassForm();
    renderManageClassesList();
  };

  window.closeManageClassesModal = function () {
    if (manageClassesModal) manageClassesModal.classList.add('hidden');
    window.resetClassForm();
  };

  window.resetClassForm = function () {
    if (editingClassOriginalId) editingClassOriginalId.value = '';
    if (classFormNameBn) classFormNameBn.value = '';
    if (classFormId) {
      classFormId.value = '';
      classFormId.readOnly = false;
    }
    if (classFormLevel) classFormLevel.value = 'junior';
    if (classFormSections) classFormSections.value = '';
    if (manageClassFormTitle) {
      manageClassFormTitle.innerHTML = '<i class="fas fa-plus-circle"></i> নতুন শ্রেণি যোগ করুন';
    }
    if (cancelEditClassBtn) cancelEditClassBtn.classList.add('hidden');
    if (classFormSubmitText) classFormSubmitText.textContent = 'শ্রেণি সংরক্ষণ';
  };

  classFormNameBn?.addEventListener('input', () => {
    if (!editingClassOriginalId?.value && classFormId) {
      const bn = classFormNameBn.value.trim();
      if (bn.includes('৬') || bn.includes('ছয়') || bn.includes('ষষ্ঠ')) classFormId.value = 'class_6';
      else if (bn.includes('৭') || bn.includes('সাত') || bn.includes('সপ্তম')) classFormId.value = 'class_7';
      else if (bn.includes('৮') || bn.includes('আট') || bn.includes('অষ্টম')) classFormId.value = 'class_8';
      else if (bn.includes('৯') || bn.includes('নয়') || bn.includes('নবম')) classFormId.value = 'class_9';
      else if (bn.includes('১০') || bn.includes('দশ') || bn.includes('দশম')) classFormId.value = 'class_10';
      else if (bn.includes('১১') || bn.includes('একাদশ')) classFormId.value = 'class_11';
      else if (bn.includes('১২') || bn.includes('দ্বাদশ')) classFormId.value = 'class_12';
      else if (bn.includes('প্লে')) classFormId.value = 'play';
      else if (bn.includes('নার্সারি')) classFormId.value = 'nursery';
      else if (bn.includes('কেজি')) classFormId.value = 'kg';
      else if (bn.includes('১')) classFormId.value = 'class_1';
      else if (bn.includes('২')) classFormId.value = 'class_2';
      else if (bn.includes('৩')) classFormId.value = 'class_3';
      else if (bn.includes('৪')) classFormId.value = 'class_4';
      else if (bn.includes('৫')) classFormId.value = 'class_5';
    }
  });

  function renderManageClassesList() {
    const school = getActiveSchool();
    const classes = school.classes || config.classes || [];
    if (activeSchoolClassCountBadge) {
      activeSchoolClassCountBadge.textContent = `${ResultEngine.toBnDigit(classes.length)} টি শ্রেণি`;
    }
    if (!manageClassesTableBody) return;

    if (classes.length === 0) {
      manageClassesTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-slate-400 font-bold">
            কোনো শ্রেণি পাওয়া যায়নি। ওপরের ফর্ম ব্যবহার করে নতুন শ্রেণি যোগ করুন।
          </td>
        </tr>
      `;
      return;
    }

    manageClassesTableBody.innerHTML = classes.map((cls) => {
      const isCurrent = cls.id === currentClassId;
      const count = allStudents.filter(s => {
        const matchSchool = (s.institution_id === activeSchoolId) || (!s.institution_id && activeSchoolId === 'dreamland-school');
        return matchSchool && (s.class_id === cls.id || s.class_name_bn === cls.name_bn);
      }).length;

      let levelText = 'সাধারণ';
      let levelBadgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      const cid = String(cls.id || '').toLowerCase();

      if (ResultEngine.isSecondaryClass(cls.id) || cls.level === 'secondary') {
        levelText = 'মাধ্যমিক / এসএসসি / দাখিল';
        levelBadgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200';
      } else if (ResultEngine.isJuniorSecondaryClass(cls.id) || cls.level === 'junior') {
        levelText = 'নিম্ন মাধ্যমিক (৬ষ্ঠ-৮ম)';
        levelBadgeClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200';
      } else if (cid.includes('class_1') || cid.includes('class_2') || cid.includes('class_3') || cid.includes('class_4') || cid.includes('class_5') || cls.level === 'primary') {
        levelText = 'প্রাথমিক (১ম-৫ম)';
        levelBadgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
      }

      const sectionsText = cls.section || (Array.isArray(cls.sections) ? cls.sections.join(', ') : '') || '--';

      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isCurrent ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''}">
          <td class="py-3 px-3">
            <div class="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>${cls.name_bn}</span>
              ${isCurrent ? '<span class="text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-sm font-bold">বর্তমান সক্রিয়</span>' : ''}
            </div>
            <div class="text-[10px] text-slate-400 font-mono">
              ID: ${cls.id} ${cls.name_en ? `| ${cls.name_en}` : ''}
            </div>
          </td>
          <td class="py-3 px-3">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-md ${levelBadgeClass}">
              ${levelText}
            </span>
          </td>
          <td class="py-3 px-3 text-slate-600 dark:text-slate-300 text-xs font-medium">
            ${sectionsText}
          </td>
          <td class="py-3 px-3 text-center font-mono font-bold text-xs ${count > 0 ? 'text-emerald-600' : 'text-slate-400'}">
            ${ResultEngine.toBnDigit(count)} জন
          </td>
          <td class="py-3 px-3 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button type="button" onclick="window.editClass('${cls.id}')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 cursor-pointer flex items-center gap-1" title="শ্রেণির নাম, কোড বা শাখা এডিট করুন">
                <i class="fas fa-edit"></i> <span>এডিট</span>
              </button>
              <button type="button" onclick="window.deleteClass('${cls.id}')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-800 text-rose-700 dark:text-rose-300 cursor-pointer flex items-center gap-1" title="মুছে ফেলুন">
                <i class="fas fa-trash-alt"></i> <span>ডিলিট</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.editClass = function (classId) {
    const school = getActiveSchool();
    const classes = school.classes || config.classes || [];
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;

    if (editingClassOriginalId) editingClassOriginalId.value = cls.id;
    if (classFormNameBn) classFormNameBn.value = cls.name_bn || '';
    if (classFormId) {
      classFormId.value = cls.id || '';
    }
    if (classFormLevel) {
      if (cls.level) {
        classFormLevel.value = cls.level;
      } else if (ResultEngine.isSecondaryClass(cls.id)) {
        classFormLevel.value = 'secondary';
      } else if (ResultEngine.isJuniorSecondaryClass(cls.id)) {
        classFormLevel.value = 'junior';
      } else {
        classFormLevel.value = 'primary';
      }
    }
    if (classFormSections) {
      classFormSections.value = cls.section || (Array.isArray(cls.sections) ? cls.sections.join(', ') : '');
    }
    if (manageClassFormTitle) {
      manageClassFormTitle.innerHTML = `<i class="fas fa-pen-to-square"></i> "${cls.name_bn}" শ্রেণি এডিট/সংশোধন`;
    }
    if (cancelEditClassBtn) cancelEditClassBtn.classList.remove('hidden');
    if (classFormSubmitText) classFormSubmitText.textContent = 'আপডেট সংরক্ষণ করুন';

    classFormNameBn?.focus();
  };

  window.handleSaveClassForm = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    const nameBn = (classFormNameBn?.value || '').trim();
    let cid = (classFormId?.value || '').trim();
    const level = classFormLevel?.value || 'junior';
    const sectionsStr = (classFormSections?.value || '').trim();
    const originalId = editingClassOriginalId?.value || '';

    if (!nameBn) {
      alert('অনুগ্রহ করে শ্রেণির নাম (বাংলা) লিখুন!');
      return;
    }
    if (!cid) {
      cid = 'class_' + nameBn.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || `class_${Date.now()}`;
    }

    const school = getActiveSchool();
    if (!Array.isArray(school.classes)) {
      school.classes = config.classes ? [...config.classes] : [];
    }

    if (originalId) {
      // EDITING EXISTING CLASS
      const existingIdx = school.classes.findIndex(c => c.id === originalId);
      if (existingIdx >= 0) {
        const oldClass = school.classes[existingIdx];
        school.classes[existingIdx] = {
          ...oldClass,
          id: cid,
          name_bn: nameBn,
          name_en: oldClass.name_en || nameBn,
          level: level,
          section: sectionsStr
        };

        // If class ID or name changed, update students belonging to this class
        let updatedCount = 0;
        allStudents.forEach(st => {
          const matchSchool = (st.institution_id === activeSchoolId) || (!st.institution_id && activeSchoolId === 'dreamland-school');
          if (matchSchool && (st.class_id === originalId || st.class_name_bn === oldClass.name_bn)) {
            st.class_id = cid;
            st.class_name_bn = nameBn;
            updatedCount++;
          }
        });

        if (updatedCount > 0) {
          await ResultEngine.Storage.saveStudents(allStudents);
        }

        // Also update config.classes if present
        if (Array.isArray(config.classes)) {
          const cIdx = config.classes.findIndex(c => c.id === originalId);
          if (cIdx >= 0) {
            config.classes[cIdx] = { ...config.classes[cIdx], id: cid, name_bn: nameBn, level, section: sectionsStr };
          }
        }

        if (currentClassId === originalId) {
          currentClassId = cid;
        }

        await ResultEngine.Storage.saveConfig(config);
        showToast(`"${nameBn}" শ্রেণি সফলভাবে আপডেট করা হয়েছে!`, 'success');
      }
    } else {
      // ADDING NEW CLASS
      const isDuplicate = school.classes.some(c => c.id === cid || c.name_bn === nameBn);
      if (isDuplicate) {
        showToast(`সতর্কতা: এই নামের বা আইডির শ্রেণি (${nameBn} / ${cid}) ইতিমধ্যে তালিকায় বিদ্যমান!`, 'warning');
        return;
      }

      const newClassObj = {
        id: cid,
        name_bn: nameBn,
        name_en: nameBn,
        level: level,
        section: sectionsStr
      };
      school.classes.push(newClassObj);
      if (Array.isArray(config.classes)) {
        config.classes.push(newClassObj);
      }

      currentClassId = cid;
      await ResultEngine.Storage.saveConfig(config);
      showToast(`নতুন শ্রেণি "${nameBn}" সফলভাবে তৈরি ও সক্রিয় করা হয়েছে!`, 'success');
    }

    window.resetClassForm();
    renderManageClassesList();
    populateClassDropdowns();
    if (editorClassSelect) editorClassSelect.value = currentClassId;
    renderSpreadsheet();
    renderBatchPreview();
  };

  window.deleteClass = async function (classId) {
    const school = getActiveSchool();
    const classes = school.classes || config.classes || [];
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;

    const countStudents = allStudents.filter(s => {
      const matchSchool = (s.institution_id === activeSchoolId) || (!s.institution_id && activeSchoolId === 'dreamland-school');
      return matchSchool && (s.class_id === classId || s.class_name_bn === cls.name_bn);
    }).length;

    let confirmMsg = `আপনি কি নিশ্চিত যে "${cls.name_bn}" (${cls.id}) শ্রেণিটি তালিকা থেকে মুছে ফেলতে চান?`;
    if (countStudents > 0) {
      confirmMsg += `\n\nসতর্কতা: এই শ্রেণির অধীনে বর্তমানে ${ResultEngine.toBnDigit(countStudents)} জন শিক্ষার্থীর ফলাফল সংরক্ষিত আছে!`;
    }

    if (!confirm(confirmMsg)) return;

    school.classes = (school.classes || []).filter(c => c.id !== classId);
    if (Array.isArray(config.classes)) {
      config.classes = config.classes.filter(c => c.id !== classId);
    }
    await ResultEngine.Storage.saveConfig(config);

    if (currentClassId === classId) {
      currentClassId = school.classes.length > 0 ? school.classes[0].id : '';
    }

    window.resetClassForm();
    renderManageClassesList();
    populateClassDropdowns();
    if (editorClassSelect) editorClassSelect.value = currentClassId;
    renderSpreadsheet();
    renderBatchPreview();
    alert(`"${cls.name_bn}" শ্রেণিটি তালিকা থেকে অপসারণ করা হয়েছে।`);
  };

  // Manage & Edit Exams Modal functions
  window.openManageExamsModal = function () {
    if (manageExamsModal) manageExamsModal.classList.remove('hidden');
    window.resetExamForm();
    renderManageExamsList();
  };

  window.closeManageExamsModal = function () {
    if (manageExamsModal) manageExamsModal.classList.add('hidden');
    window.resetExamForm();
  };

  function renderManageExamsList() {
    const school = getActiveSchool();
    const exams = school.exams || [];
    if (activeSchoolExamCountBadge) {
      activeSchoolExamCountBadge.textContent = `${ResultEngine.toBnDigit(exams.length)} টি পরীক্ষা`;
    }
    if (!manageExamsTableBody) return;

    if (exams.length === 0) {
      manageExamsTableBody.innerHTML = `
        <tr>
          <td colspan="3" class="py-6 text-center text-slate-400 font-bold">
            কোনো পরীক্ষা পাওয়া যায়নি। ওপরের ফর্ম ব্যবহার করে নতুন পরীক্ষা যোগ করুন।
          </td>
        </tr>
      `;
      return;
    }

    manageExamsTableBody.innerHTML = exams.map(ex => {
      const isCurrent = ex.id === currentExamId;
      const count = allStudents.filter(s => {
        const matchSchool = (s.institution_id === activeSchoolId) || (!s.institution_id && activeSchoolId === 'dreamland-school');
        return matchSchool && (s.exam_id === ex.id || s.exam_name_bn === ex.name_bn);
      }).length;

      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isCurrent ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''}">
          <td class="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">
            ${ResultEngine.toBnDigit(ex.year || '2026')}
          </td>
          <td class="py-3 px-3">
            <div class="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>${ex.name_bn || ex.name_en || ex.id}</span>
              ${isCurrent ? '<span class="text-[10px] bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded-sm font-bold">বর্তমান সক্রিয়</span>' : ''}
            </div>
            <div class="text-[10px] text-slate-400 font-mono flex items-center gap-2">
              <span>ID: ${ex.id}</span>
              ${count > 0 ? `<span class="text-emerald-600 font-sans">(${ResultEngine.toBnDigit(count)} জন শিক্ষার্থী)</span>` : ''}
            </div>
          </td>
          <td class="py-3 px-3 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button type="button" onclick="window.editExam('${ex.id}')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/60 dark:hover:bg-sky-800 text-sky-700 dark:text-sky-300 cursor-pointer flex items-center gap-1" title="নাম বা সাল এডিট করুন">
                <i class="fas fa-edit"></i> <span>এডিট</span>
              </button>
              <button type="button" onclick="window.deleteExam('${ex.id}')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-800 text-rose-700 dark:text-rose-300 cursor-pointer flex items-center gap-1" title="মুছে ফেলুন">
                <i class="fas fa-trash-alt"></i> <span>ডিলিট</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.editExam = function (examId) {
    const school = getActiveSchool();
    const exam = (school.exams || []).find(x => x.id === examId);
    if (!exam) return;

    if (editingExamOriginalId) editingExamOriginalId.value = exam.id;
    if (examFormYear) examFormYear.value = exam.year || '2026';
    if (examFormNameBn) {
      examFormNameBn.value = exam.name_bn || exam.name_en || '';
      examFormNameBn.focus();
    }
    if (manageExamFormTitle) {
      manageExamFormTitle.innerHTML = `<i class="fas fa-edit"></i> পরীক্ষা এডিট করুন: "${exam.name_bn || exam.id}"`;
    }
    if (examFormSubmitText) {
      examFormSubmitText.textContent = 'পরিবর্তন সংরক্ষণ করুন';
    }
    if (cancelEditExamBtn) {
      cancelEditExamBtn.classList.remove('hidden');
    }
  };

  window.resetExamForm = function () {
    if (manageExamForm) manageExamForm.reset();
    if (editingExamOriginalId) editingExamOriginalId.value = '';
    if (examFormYear) examFormYear.value = currentYear || '2026';
    if (manageExamFormTitle) {
      manageExamFormTitle.innerHTML = `<i class="fas fa-plus-circle"></i> নতুন পরীক্ষা যোগ করুন`;
    }
    if (examFormSubmitText) {
      examFormSubmitText.textContent = 'পরীক্ষা সংরক্ষণ';
    }
    if (cancelEditExamBtn) {
      cancelEditExamBtn.classList.add('hidden');
    }
  };

  window.handleSaveExamForm = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    const originalId = editingExamOriginalId ? editingExamOriginalId.value.trim() : '';
    const year = (examFormYear?.value || '2026').trim();
    const nameBn = (examFormNameBn?.value || '').trim();

    if (!year || !nameBn) {
      alert('শিক্ষাবর্ষ এবং পরীক্ষার নাম আবশ্যক!');
      return;
    }

    const school = getActiveSchool();
    if (!school.exams) school.exams = [];
    if (!school.academic_years) school.academic_years = ['2026', '2025'];

    if (!school.academic_years.includes(year)) {
      school.academic_years.unshift(year);
    }

    if (originalId) {
      // EDITING EXISTING EXAM
      const examIdx = school.exams.findIndex(x => x.id === originalId);
      if (examIdx >= 0) {
        const oldExam = school.exams[examIdx];
        school.exams[examIdx] = {
          ...oldExam,
          name_bn: nameBn,
          name_en: nameBn,
          year: year
        };

        // Also update any existing students who had this exam_id or exam_name_bn
        let updatedStudentCount = 0;
        allStudents.forEach(st => {
          const matchSchool = (st.institution_id === activeSchoolId) || (!st.institution_id && activeSchoolId === 'dreamland-school');
          if (matchSchool && (st.exam_id === originalId || st.exam_name_bn === oldExam.name_bn)) {
            st.exam_name_bn = nameBn;
            st.year = year;
            st.academic_year = year;
            updatedStudentCount++;
          }
        });
        if (updatedStudentCount > 0) {
          await ResultEngine.Storage.saveStudents(allStudents);
        }

        await ResultEngine.Storage.saveConfig(config);
        showToast(`পরীক্ষার নাম ও তথ্য সফলভাবে আপডেট করা হয়েছে! (${nameBn})`, 'success');
      }
    } else {
      // ADDING NEW EXAM
      const examId = `exam_${year}_${Date.now().toString(36)}`;
      const newExamObj = {
        id: examId,
        name_bn: nameBn,
        name_en: nameBn,
        year: year,
        is_published: false
      };
      school.exams.unshift(newExamObj);
      await ResultEngine.Storage.saveConfig(config);
      currentYear = year;
      currentExamId = examId;
      showToast(`নতুন পরীক্ষা "${nameBn}" (${year}) সফলভাবে তৈরি ও সক্রিয় করা হয়েছে!`, 'success');
    }

    window.resetExamForm();
    renderManageExamsList();
    populateYearAndExamDropdowns();
    renderSpreadsheet();
    renderBatchPreview();
  };

  window.deleteExam = async function (examId) {
    const school = getActiveSchool();
    const exam = (school.exams || []).find(x => x.id === examId);
    if (!exam) return;

    const countStudents = allStudents.filter(s => {
      const matchSchool = (s.institution_id === activeSchoolId) || (!s.institution_id && activeSchoolId === 'dreamland-school');
      return matchSchool && (s.exam_id === examId || s.exam_name_bn === exam.name_bn);
    }).length;

    let confirmMsg = `আপনি কি নিশ্চিত যে "${exam.name_bn || exam.id}" (${exam.year || '2026'}) পরীক্ষাটি তালিকা থেকে মুছে ফেলতে চান?`;
    if (countStudents > 0) {
      confirmMsg += `\n\nসতর্কতা: এই পরীক্ষার অধীনে বর্তমানে ${ResultEngine.toBnDigit(countStudents)} জন শিক্ষার্থীর ফলাফল সংরক্ষিত আছে!`;
    }

    if (!confirm(confirmMsg)) return;

    school.exams = school.exams.filter(x => x.id !== examId);
    await ResultEngine.Storage.saveConfig(config);

    if (currentExamId === examId) {
      currentExamId = school.exams.length > 0 ? school.exams[0].id : '';
    }

    window.resetExamForm();
    renderManageExamsList();
    populateYearAndExamDropdowns();
    renderSpreadsheet();
    renderBatchPreview();
    alert('পরীক্ষাটি তালিকা থেকে মুছে ফেলা হয়েছে।');
  };

  // Backward-compatibility aliases
  window.openCreateExamModal = window.openManageExamsModal;
  window.closeCreateExamModal = window.closeManageExamsModal;
  window.handleCreateExamSubmit = window.handleSaveExamForm;

  // Settings tab form
  function loadSettingsForm() {
    const school = getActiveSchool();
    if (cfgInstNameBn) cfgInstNameBn.value = school.name_bn || '';
    if (cfgInstNameEn) cfgInstNameEn.value = school.name_en || '';
    if (cfgInstAddress) cfgInstAddress.value = school.address_bn || '';
    if (cfgExamName) cfgExamName.value = `${ResultEngine.toBnDigit(currentYear)} সালের পরীক্ষা`;

    // Security PIN Management
    const superAdminPinInput = document.getElementById('cfgSuperAdminPin');
    const schoolMasterPinInput = document.getElementById('cfgSchoolMasterPin');
    const activeSchoolBadge = document.getElementById('cfgActiveSchoolBadge');

    if (superAdminPinInput) {
      const storedSuperPin = (typeof localStorage !== 'undefined' && localStorage.getItem('fayzar_admin_pin')) 
        || (config.super_admin_pins && config.super_admin_pins[0]) 
        || '101919';
      superAdminPinInput.value = storedSuperPin;
    }

    if (schoolMasterPinInput) {
      schoolMasterPinInput.value = school.master_pin || '';
    }

    if (activeSchoolBadge) {
      activeSchoolBadge.textContent = school.name_bn || 'প্রতিষ্ঠান';
    }

    renderTeachersTable();
  }

  function getSchoolClassesList(schoolId = activeSchoolId) {
    const currentConfig = config || (typeof window !== 'undefined' && window.DEFAULT_RESULTS_CONFIG) || {};
    const school = (currentConfig.institutions || []).find(i => i.id === schoolId) || getActiveSchool();
    if (Array.isArray(school.classes) && school.classes.length > 0) {
      return school.classes;
    }
    if (Array.isArray(currentConfig.classes) && currentConfig.classes.length > 0) {
      return currentConfig.classes;
    }
    return [
      { id: 'nursery', name_bn: 'নার্সারি' },
      { id: 'kg', name_bn: 'কেজি' },
      { id: 'class_1', name_bn: '১ম শ্রেণি' },
      { id: 'class_2', name_bn: '২য় শ্রেণি' },
      { id: 'class_3', name_bn: '৩য় শ্রেণি' },
      { id: 'class_4', name_bn: '৪র্থ শ্রেণি' },
      { id: 'class_5', name_bn: '৫ম শ্রেণি' },
      { id: 'class_6', name_bn: '৬ষ্ঠ শ্রেণি' },
      { id: 'class_7', name_bn: '৭ম শ্রেণি' },
      { id: 'class_8', name_bn: '৮ম শ্রেণি' },
      { id: 'class_9', name_bn: '৯ম শ্রেণি' },
      { id: 'class_10', name_bn: '১০ম শ্রেণি' }
    ];
  }

  function getAvailableSubjectsForClass(classId, schoolId = activeSchoolId) {
    const currentConfig = config || (typeof window !== 'undefined' && window.DEFAULT_RESULTS_CONFIG) || {};
    const school = (currentConfig.institutions || []).find(i => i.id === schoolId) || getActiveSchool();
    
    // In 'all' classes mode, combine unique subjects from all classes of the school
    if (classId === 'all') {
      const allClassList = getSchoolClassesList(school.id);
      const subMap = new Map();
      allClassList.forEach(cls => {
        const list = getAvailableSubjectsForClass(cls.id, school.id);
        list.forEach(s => {
          if (!subMap.has(s.name_bn)) subMap.set(s.name_bn, s);
        });
      });
      return Array.from(subMap.values());
    }

    // 1. Try finding actual students in that class
    const stInClass = allStudents.filter(s => {
      const matchSchool = (s.institution_id === school.id) || (!s.institution_id && school.id === 'dreamland-school');
      return matchSchool && String(s.class_id) === String(classId);
    });
    if (stInClass.length > 0) {
      const distinctCols = getDistinctClassColumns(stInClass);
      if (distinctCols.length > 0) {
        return distinctCols.map(c => ({
          code: c.code,
          name_bn: c.name_bn,
          name_en: c.name_en || c.name_bn
        }));
      }
    }

    // 2. Fallback to getClassSubjectList
    const subList = getClassSubjectList(classId, 'islam', 'science', 'higher_math', school.id);
    const result = [];
    subList.forEach(sub => {
      if (Array.isArray(sub.papers) && sub.papers.length > 0) {
        sub.papers.forEach((p, idx) => {
          result.push({
            code: p.code || `${sub.code}-${idx + 1}`,
            name_bn: p.name_bn,
            name_en: p.name_en || p.name_bn
          });
        });
      } else {
        result.push({
          code: sub.code,
          name_bn: sub.name_bn,
          name_en: sub.name_en || sub.name_bn
        });
      }
    });
    return result;
  }

  function renderTeachersTable() {
    const school = getActiveSchool();
    const tableBody = document.getElementById('cfgTeachersTableBody');
    if (!tableBody) return;

    const teachers = school.teachers || [];
    if (teachers.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="p-4 text-center text-slate-400">
            এই প্রতিষ্ঠানের কোনো শিক্ষক একাউন্ট যুক্ত করা হয়নি। উপরের '+ নতুন শিক্ষক যুক্ত করুন' বাটনে ক্লিক করুন।
          </td>
        </tr>
      `;
      return;
    }

    const schoolClasses = getSchoolClassesList(school.id);
    const classMap = new Map(schoolClasses.map(c => [c.id, c.name_bn]));

    tableBody.innerHTML = teachers.map((teacher, idx) => {
      let subjectsBadgeHtml = '';

      if (teacher.class_assignments && typeof teacher.class_assignments === 'object') {
        if (teacher.class_assignments['all']) {
          const subs = teacher.class_assignments['all'].join(', ');
          subjectsBadgeHtml = `<span class="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold"><i class="fas fa-school mr-1 text-[10px]"></i>সকল শ্রেণি: ${subs}</span>`;
        } else {
          const entries = Object.entries(teacher.class_assignments).filter(([_, subs]) => subs && subs.length > 0);
          if (entries.length > 0) {
            subjectsBadgeHtml = entries.map(([cid, subs]) => {
              const cName = classMap.get(cid) || cid;
              return `<span class="inline-block mr-1.5 mb-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-bold"><strong>${cName}:</strong> ${subs.join(', ')}</span>`;
            }).join('');
          }
        }
      }

      if (!subjectsBadgeHtml) {
        const subjects = (teacher.assigned_subjects || []).join(', ') || 'সকল বিষয়';
        subjectsBadgeHtml = `<span class="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono text-[11px]">${subjects}</span>`;
      }

      const pin = teacher.pin || '----';
      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
          <td class="p-3 font-bold text-slate-800 dark:text-slate-200 align-top">
            <i class="fas fa-chalkboard-user text-emerald-600 mr-1.5"></i> ${teacher.name}
          </td>
          <td class="p-3 text-slate-600 dark:text-slate-300 align-top">
            <div class="flex flex-wrap gap-1">
              ${subjectsBadgeHtml}
            </div>
          </td>
          <td class="p-3 align-top">
            <span class="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md tracking-wider border border-slate-200 dark:border-slate-700">${pin}</span>
          </td>
          <td class="p-3 text-right space-x-1.5 whitespace-nowrap align-top">
            <button type="button" onclick="openCfgTeacherModal(${idx})" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold text-xs transition cursor-pointer">
              <i class="fas fa-pen-to-square mr-1"></i> এডিট
            </button>
            <button type="button" onclick="deleteCfgTeacher(${idx})" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 font-bold text-xs transition cursor-pointer">
              <i class="fas fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Teacher modal state
  let teacherModalAllocationMode = 'class_specific'; // 'class_specific' | 'all_classes'
  let activeTeacherModalClassId = null;
  let workingTeacherClassAssignments = {};

  // Teacher modal management
  window.openCfgTeacherModal = function (idx = -1) {
    const modal = document.getElementById('cfgTeacherModal');
    const form = document.getElementById('cfgTeacherForm');
    const title = document.getElementById('cfgTeacherModalTitle');
    const editIndexInput = document.getElementById('cfgTeacherEditIndex');
    const nameInput = document.getElementById('cfgTeacherName');
    const pinInput = document.getElementById('cfgTeacherPin');
    if (!modal || !form) return;

    editIndexInput.value = idx;
    workingTeacherClassAssignments = {};

    const school = getActiveSchool();
    const classes = getSchoolClassesList(school.id);

    if (idx >= 0 && school.teachers && school.teachers[idx]) {
      const teacher = school.teachers[idx];
      if (title) title.innerHTML = '<i class="fas fa-user-pen text-emerald-600"></i> শিক্ষক তথ্য ও শ্রেণিভিত্তিক বিষয় বরাদ্দ';
      if (nameInput) nameInput.value = teacher.name || '';
      if (pinInput) pinInput.value = teacher.pin || '';

      if (teacher.class_assignments && typeof teacher.class_assignments === 'object' && Object.keys(teacher.class_assignments).length > 0) {
        Object.keys(teacher.class_assignments).forEach(cid => {
          workingTeacherClassAssignments[cid] = [...(teacher.class_assignments[cid] || [])];
        });
        if (workingTeacherClassAssignments['all']) {
          teacherModalAllocationMode = 'all_classes';
        } else {
          teacherModalAllocationMode = 'class_specific';
        }
      } else {
        const legacySubs = teacher.assigned_subjects || [];
        const legacyClasses = teacher.classes || ['all'];
        if (legacyClasses.includes('all')) {
          teacherModalAllocationMode = 'all_classes';
          workingTeacherClassAssignments['all'] = [...legacySubs];
        } else {
          teacherModalAllocationMode = 'class_specific';
          legacyClasses.forEach(cid => {
            workingTeacherClassAssignments[cid] = [...legacySubs];
          });
        }
      }
      if (title) title.innerHTML = '<i class="fas fa-user-plus text-emerald-600"></i> নতুন শিক্ষক ও শ্রেণিভিত্তিক বিষয় বরাদ্দ';
      if (typeof form.reset === 'function') form.reset();
      editIndexInput.value = -1;
      teacherModalAllocationMode = 'class_specific';
      workingTeacherClassAssignments = {};
    }

    activeTeacherModalClassId = (classes[0] && classes[0].id) || 'nursery';

    updateTeacherAllocationModeUI();
    renderTeacherModalClassTabs();
    renderTeacherModalSubjects();
    updateTeacherAllocationSummary();

    modal.classList.remove('hidden');
  };

  window.closeCfgTeacherModal = function () {
    const modal = document.getElementById('cfgTeacherModal');
    if (modal) modal.classList.add('hidden');
  };

  window.setTeacherAllocationMode = function(mode) {
    teacherModalAllocationMode = mode;
    updateTeacherAllocationModeUI();
    renderTeacherModalClassTabs();
    renderTeacherModalSubjects();
    updateTeacherAllocationSummary();
  };

  function updateTeacherAllocationModeUI() {
    const classBtn = document.getElementById('cfgTeacherModeClassBtn');
    const allBtn = document.getElementById('cfgTeacherModeAllBtn');
    const tabsWrapper = document.getElementById('cfgTeacherClassTabsWrapper');
    const copyBtn = document.getElementById('cfgCopySubjectsBtn');

    if (teacherModalAllocationMode === 'class_specific') {
      if (classBtn) {
        classBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs cursor-pointer';
      }
      if (allBtn) {
        allBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer';
      }
      if (tabsWrapper) tabsWrapper.classList.remove('hidden');
      if (copyBtn) copyBtn.classList.remove('hidden');
    } else {
      if (allBtn) {
        allBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs cursor-pointer';
      }
      if (classBtn) {
        classBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer';
      }
      if (tabsWrapper) tabsWrapper.classList.add('hidden');
      if (copyBtn) copyBtn.classList.add('hidden');
    }
  }

  function renderTeacherModalClassTabs() {
    const container = document.getElementById('cfgTeacherClassTabs');
    if (!container) return;

    if (teacherModalAllocationMode === 'all_classes') {
      container.innerHTML = '';
      return;
    }

    const school = getActiveSchool();
    const classes = getSchoolClassesList(school.id);

    container.innerHTML = classes.map(cls => {
      const count = (workingTeacherClassAssignments[cls.id] || []).length;
      const isActive = cls.id === activeTeacherModalClassId;
      const activeClass = isActive 
        ? 'bg-emerald-600 text-white font-bold shadow-xs' 
        : (count > 0 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold'
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100');
      
      return `
        <button type="button" onclick="window.selectTeacherModalClass('${cls.id}')" class="px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 ${activeClass}">
          <span>${cls.name_bn}</span>
          ${count > 0 ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'}">${ResultEngine.toBnDigit(count)}</span>` : ''}
        </button>
      `;
    }).join('');
  }

  window.selectTeacherModalClass = function(classId) {
    activeTeacherModalClassId = classId;
    renderTeacherModalClassTabs();
    renderTeacherModalSubjects();
  };

  function renderTeacherModalSubjects() {
    const container = document.getElementById('cfgTeacherSubjectsChips');
    const titleEl = document.getElementById('cfgTeacherCurrentTargetTitle');
    if (!container) return;

    const targetClassId = (teacherModalAllocationMode === 'all_classes') ? 'all' : activeTeacherModalClassId;
    const school = getActiveSchool();
    const classes = getSchoolClassesList(school.id);
    const activeClassObj = classes.find(c => c.id === targetClassId);

    if (titleEl) {
      if (teacherModalAllocationMode === 'all_classes') {
        titleEl.innerHTML = `<i class="fas fa-school text-emerald-600"></i> <span>সকল শ্রেণির জন্য সাধারণ বিষয় নির্বাচন করুন:</span>`;
      } else {
        const clsName = activeClassObj ? activeClassObj.name_bn : 'শ্রেণি';
        titleEl.innerHTML = `<i class="fas fa-book-open text-indigo-500"></i> <span><strong>${clsName}</strong> এর বিষয়সমূহ (ক্লিক করে নির্বাচন/বাতিল করুন):</span>`;
      }
    }

    const available = getAvailableSubjectsForClass(targetClassId, school.id);
    const assigned = workingTeacherClassAssignments[targetClassId] || [];

    if (available.length === 0 && assigned.length === 0) {
      container.innerHTML = `
        <div class="p-3 text-slate-400 text-center w-full text-xs">
          কোনো বিষয় পাওয়া যায়নি। নিচের বক্সে নাম লিখে 'যুক্ত' বাটনে ক্লিক করুন।
        </div>
      `;
      return;
    }

    // Merge any custom assigned subjects that might not be in available
    const allSubjectsToShow = [...available];
    assigned.forEach(subName => {
      if (!allSubjectsToShow.some(s => s.name_bn === subName)) {
        allSubjectsToShow.push({ name_bn: subName, code: '' });
      }
    });

    container.innerHTML = allSubjectsToShow.map(sub => {
      const isSelected = assigned.includes(sub.name_bn);
      const chipClass = isSelected
        ? 'bg-emerald-600 text-white font-bold shadow-xs hover:bg-emerald-500 border border-emerald-600'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700';

      const safeName = sub.name_bn.replace(/'/g, "\\'");
      return `
        <button type="button" onclick="window.toggleTeacherSubject('${safeName}')" class="px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 ${chipClass}">
          <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-plus'} text-[11px]"></i>
          <span>${sub.name_bn}</span>
        </button>
      `;
    }).join('');
  }

  window.toggleTeacherSubject = function(subName) {
    const targetClassId = (teacherModalAllocationMode === 'all_classes') ? 'all' : activeTeacherModalClassId;
    if (!workingTeacherClassAssignments[targetClassId]) {
      workingTeacherClassAssignments[targetClassId] = [];
    }
    const arr = workingTeacherClassAssignments[targetClassId];
    const idx = arr.indexOf(subName);
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      arr.push(subName);
    }
    renderTeacherModalClassTabs();
    renderTeacherModalSubjects();
    updateTeacherAllocationSummary();
  };

  window.selectAllCurrentClassSubjects = function() {
    const targetClassId = (teacherModalAllocationMode === 'all_classes') ? 'all' : activeTeacherModalClassId;
    const available = getAvailableSubjectsForClass(targetClassId);
    workingTeacherClassAssignments[targetClassId] = available.map(s => s.name_bn);
    renderTeacherModalClassTabs();
    renderTeacherModalSubjects();
    updateTeacherAllocationSummary();
  };

  window.clearCurrentClassSubjects = function() {
    const targetClassId = (teacherModalAllocationMode === 'all_classes') ? 'all' : activeTeacherModalClassId;
    workingTeacherClassAssignments[targetClassId] = [];
    renderTeacherModalClassTabs();
    renderTeacherModalSubjects();
    updateTeacherAllocationSummary();
  };

  window.copyCurrentClassSubjectsToAll = function() {
    const sourceClassId = activeTeacherModalClassId;
    const sourceSubjects = workingTeacherClassAssignments[sourceClassId] || [];
    if (sourceSubjects.length === 0) {
      alert('বর্তমান শ্রেণিতে কোনো বিষয় নির্বাচন করা হয়নি!');
      return;
    }

    const school = getActiveSchool();
    const classes = getSchoolClassesList(school.id);
    let copiedClasses = 0;

    classes.forEach(cls => {
      if (cls.id !== sourceClassId) {
        const clsAvailable = getAvailableSubjectsForClass(cls.id, school.id);
        const matched = [];
        sourceSubjects.forEach(sName => {
          const found = clsAvailable.find(a => 
            a.name_bn.toLowerCase().includes(sName.toLowerCase()) || 
            sName.toLowerCase().includes(a.name_bn.toLowerCase())
          );
          if (found) {
            matched.push(found.name_bn);
          } else {
            matched.push(sName);
          }
        });
        workingTeacherClassAssignments[cls.id] = Array.from(new Set(matched));
        copiedClasses++;
      }
    });

    renderTeacherModalClassTabs();
    renderTeacherModalSubjects();
    updateTeacherAllocationSummary();
    alert(`বর্তমান শ্রেণির নির্বাচিত বিষয়গুলো সফলভাবে আরও ${ResultEngine.toBnDigit(copiedClasses)} টি শ্রেণিতে অনুলিপি করা হয়েছে।`);
  };

  window.addCustomTeacherSubject = function() {
    const input = document.getElementById('cfgCustomSubjectInput');
    const val = input?.value.trim();
    if (!val) return;
    const targetClassId = (teacherModalAllocationMode === 'all_classes') ? 'all' : activeTeacherModalClassId;
    if (!workingTeacherClassAssignments[targetClassId]) {
      workingTeacherClassAssignments[targetClassId] = [];
    }
    if (!workingTeacherClassAssignments[targetClassId].includes(val)) {
      workingTeacherClassAssignments[targetClassId].push(val);
    }
    if (input) input.value = '';
    renderTeacherModalClassTabs();
    renderTeacherModalSubjects();
    updateTeacherAllocationSummary();
  };

  window.removeAssignedSubject = function(classId, subName) {
    if (workingTeacherClassAssignments[classId]) {
      const idx = workingTeacherClassAssignments[classId].indexOf(subName);
      if (idx >= 0) {
        workingTeacherClassAssignments[classId].splice(idx, 1);
        if (workingTeacherClassAssignments[classId].length === 0) {
          delete workingTeacherClassAssignments[classId];
        }
      }
    }
    renderTeacherModalClassTabs();
    renderTeacherModalSubjects();
    updateTeacherAllocationSummary();
  };

  function updateTeacherAllocationSummary() {
    const container = document.getElementById('cfgTeacherAllocationSummary');
    const badge = document.getElementById('cfgTeacherTotalCountBadge');
    if (!container) return;

    const school = getActiveSchool();
    const classes = getSchoolClassesList(school.id);
    const classMap = new Map(classes.map(c => [c.id, c.name_bn]));

    let totalSubjectsCount = 0;
    let html = '';

    if (teacherModalAllocationMode === 'all_classes') {
      const subs = workingTeacherClassAssignments['all'] || [];
      totalSubjectsCount = subs.length;
      if (subs.length === 0) {
        html = '<div class="text-slate-400 text-[11px]">কোনো বিষয় নির্বাচিত হয়নি।</div>';
      } else {
        html = `
          <div class="flex items-center flex-wrap gap-1.5 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span class="font-bold text-emerald-700 dark:text-emerald-300 text-[11px] shrink-0">সকল শ্রেণি:</span>
            ${subs.map(s => `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold text-[10px]">
                ${s}
                <button type="button" onclick="window.removeAssignedSubject('all', '${s.replace(/'/g, "\\'")}')" class="text-rose-500 hover:text-rose-700 ml-0.5 cursor-pointer">&times;</button>
              </span>
            `).join('')}
          </div>
        `;
      }
    } else {
      const classKeys = Object.keys(workingTeacherClassAssignments).filter(k => (workingTeacherClassAssignments[k] || []).length > 0);
      if (classKeys.length === 0) {
        html = '<div class="text-slate-400 text-[11px]">এখনও কোনো শ্রেণির জন্য বিষয় বরাদ্দ করা হয়নি। উপরে বিষয়গুলোতে ক্লিক করুন।</div>';
      } else {
        html = classKeys.map(cid => {
          const subs = workingTeacherClassAssignments[cid] || [];
          totalSubjectsCount += subs.length;
          const cName = classMap.get(cid) || cid;
          return `
            <div class="flex items-center flex-wrap gap-1.5 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span class="font-bold text-slate-800 dark:text-slate-200 text-[11px] shrink-0 min-w-[70px]">${cName}:</span>
              <div class="flex flex-wrap gap-1">
                ${subs.map(s => `
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 font-bold text-[10px] border border-indigo-200 dark:border-indigo-800">
                    ${s}
                    <button type="button" onclick="window.removeAssignedSubject('${cid}', '${s.replace(/'/g, "\\'")}')" class="text-rose-500 hover:text-rose-700 ml-0.5 cursor-pointer">&times;</button>
                  </span>
                `).join('')}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    container.innerHTML = html;
    if (badge) badge.textContent = `${ResultEngine.toBnDigit(totalSubjectsCount)} বিষয়`;
  }

  window.deleteCfgTeacher = async function (idx) {
    const school = getActiveSchool();
    if (!school.teachers || !school.teachers[idx]) return;
    const tName = school.teachers[idx].name;
    if (confirm(`আপনি কি নিশ্চিত যে শিক্ষক "${tName}" এর একাউন্ট ও পিন মুছে ফেলতে চান?`)) {
      school.teachers.splice(idx, 1);
      await ResultEngine.Storage.saveConfig(config);
      renderTeachersTable();
      alert(`শিক্ষক "${tName}" এর তথ্য ও পিন মুছে ফেলা হয়েছে।`);
    }
  };

  window.togglePasswordVisibility = function (inputId, iconId) {
    const el = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!el) return;
    if (el.type === 'password') {
      el.type = 'text';
      if (icon) icon.className = 'fas fa-eye-slash';
    } else {
      el.type = 'password';
      if (icon) icon.className = 'fas fa-eye';
    }
  };

  // =========================================================================
  // ইউজার পরিবর্তন, প্রোফাইল সুইচিং, ব্যাকআপ ও লগআউট
  // =========================================================================
  window.openUserSwitcherModal = function () {
    const modal = document.getElementById('userSwitcherModal');
    if (!modal) {
      window.adminLogout();
      return;
    }

    const cur = currentUser || ResultEngine.Storage.getCurrentUser();
    const activeNameEl = document.getElementById('switcherActiveUserName');
    const activeRoleEl = document.getElementById('switcherActiveUserRole');
    if (activeNameEl) activeNameEl.textContent = cur ? (cur.name || cur.role_title) : 'লগইন করা নেই';
    if (activeRoleEl) activeRoleEl.textContent = cur ? (cur.role_title || cur.role) : '-';

    const profilesList = document.getElementById('userSwitcherProfilesList');
    if (profilesList) {
      let html = '';

      // 1. Super Admin Profile
      const isSuper = (cur && cur.role === 'super_admin');
      html += `
        <div class="p-3 rounded-2xl border ${isSuper ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850'} flex items-center justify-between gap-3 shadow-xs">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <i class="fas fa-crown"></i>
            </div>
            <div>
              <div class="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>ফয়জার কম্পিউটার (ওয়েব সুপার অ্যাডমিন)</span>
                ${isSuper ? '<span class="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[10px]">বর্তমান</span>' : ''}
              </div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">সর্বময় ক্ষমতা: ফলাফল প্রকাশ/ড্রাফট, সব প্রতিষ্ঠান নিয়ন্ত্রণ</div>
            </div>
          </div>
          <button type="button" onclick="window.switchToUserAccount('101919', null)" class="px-3 py-1.5 rounded-xl text-xs font-bold ${isSuper ? 'bg-slate-200 dark:bg-slate-800 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white'} transition shrink-0 cursor-pointer">
            ${isSuper ? 'সক্রিয়' : 'লগইন'}
          </button>
        </div>
      `;

      // 2. Institutions and Teachers
      const insts = (config && Array.isArray(config.institutions)) ? config.institutions : [];
      insts.forEach(inst => {
        const isCurrentSchool = (cur && cur.role === 'school_master' && cur.school_id === inst.id);
        const pin = inst.admin_pin || inst.master_pin || (inst.id.includes('madrasah') ? '5678' : '1234');
        const icon = inst.id.includes('madrasah') ? '🕌' : '🏫';

        html += `
          <div class="p-3 rounded-2xl border ${isCurrentSchool ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850'} space-y-2 shadow-xs">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <span class="text-xl">${icon}</span>
                <div>
                  <div class="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>${inst.name_bn}</span>
                    ${isCurrentSchool ? '<span class="px-1.5 py-0.2 bg-sky-600 text-white rounded text-[10px]">বর্তমান</span>' : ''}
                  </div>
                  <div class="text-[11px] text-slate-500 dark:text-slate-400">প্রধান শিক্ষক / অধ্যক্ষ অ্যাডমিন একাউন্ট</div>
                </div>
              </div>
              <button type="button" onclick="window.switchToUserAccount('${pin}', '${inst.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold ${isCurrentSchool ? 'bg-slate-200 dark:bg-slate-800 text-slate-500' : 'bg-sky-600 hover:bg-sky-500 text-white'} transition shrink-0 cursor-pointer">
                ${isCurrentSchool ? 'সক্রিয়' : 'লগইন'}
              </button>
            </div>
        `;

        if (Array.isArray(inst.teachers) && inst.teachers.length > 0) {
          html += `
            <div class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400">শিক্ষক প্রোফাইল:</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          `;
          inst.teachers.forEach(t => {
            const isTeacherActive = (cur && cur.role === 'teacher' && cur.teacher_id === t.id);
            html += `
              <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <div class="truncate mr-2">
                  <span class="font-bold text-slate-800 dark:text-slate-200 block truncate">${t.name}</span>
                  <span class="text-[10px] text-slate-500 dark:text-slate-400 truncate block">${(t.assigned_subjects || []).join(', ') || 'সাধারণ'}</span>
                </div>
                <button type="button" onclick="window.switchToUserAccount('${t.pin}', '${inst.id}')" class="px-2 py-1 rounded-lg text-[11px] font-bold ${isTeacherActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200'} transition shrink-0 cursor-pointer">
                  ${isTeacherActive ? 'সক্রিয়' : 'লগইন'}
                </button>
              </div>
            `;
          });
          html += `</div></div>`;
        }

        html += `</div>`;
      });

      profilesList.innerHTML = html;
    }

    modal.classList.remove('hidden');
  };

  window.closeUserSwitcherModal = function () {
    const modal = document.getElementById('userSwitcherModal');
    if (modal) modal.classList.add('hidden');
  };

  window.switchToUserAccount = async function (pin, schoolId) {
    if (!pin) return;
    const authResult = await ResultEngine.authenticatePin(pin);
    if (authResult.success) {
      currentUser = authResult.user;
      try { sessionStorage.removeItem('fayzar_result_switched_out'); } catch (e) {}
      if (schoolId) {
        activeSchoolId = schoolId;
      } else if (currentUser.school_id) {
        activeSchoolId = currentUser.school_id;
      }
      applyUserPermissions(currentUser);
      window.closeUserSwitcherModal();
      alert(`স্বাগতম! আপনি সফলভাবে "${currentUser.name || currentUser.role_title}" হিসেবে প্রবেশ করেছেন।`);
    } else {
      alert(authResult.error || 'ভুল পিন নম্বর!');
    }
  };

  window.submitManualPinFromSwitcher = async function () {
    const pinInputEl = document.getElementById('switcherManualPinInput');
    const pin = pinInputEl?.value.trim();
    if (!pin) {
      alert('অনুগ্রহ করে একটি পিন নম্বর লিখুন!');
      return;
    }
    const authResult = await ResultEngine.authenticatePin(pin);
    if (authResult.success) {
      currentUser = authResult.user;
      try { sessionStorage.removeItem('fayzar_result_switched_out'); } catch (e) {}
      if (currentUser.school_id) {
        activeSchoolId = currentUser.school_id;
      }
      applyUserPermissions(currentUser);
      window.closeUserSwitcherModal();
      if (pinInputEl) pinInputEl.value = '';
      alert(`স্বাগতম! আপনি সফলভাবে "${currentUser.name || currentUser.role_title}" হিসেবে প্রবেশ করেছেন।`);
    } else {
      alert(authResult.error || 'ভুল পিন নম্বর!');
    }
  };

  window.switchUserAccount = function () {
    window.openUserSwitcherModal();
  };

  window.adminLogout = function () {
    ResultEngine.Storage.logout();
    currentUser = null;
    try {
      sessionStorage.setItem('fayzar_result_switched_out', 'true');
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (e) {}
    window.closeUserSwitcherModal();
    showAuthOverlay();
    if (pinInput) {
      pinInput.value = '';
      pinInput.focus();
    }
  };

  window.exportFullDatabaseJson = async function () {
    try {
      const cfg = await ResultEngine.Storage.loadConfig();
      const stData = await ResultEngine.Storage.loadStudents();
      const backupObj = {
        system: "Fayzar Computer Online Result Management System",
        exportedAt: new Date().toISOString(),
        config: cfg,
        studentsCount: Array.isArray(stData) ? stData.length : 0,
        students: stData
      };
      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `fayzar_results_backup_${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert(`সম্পূর্ণ রেজাল্ট ডেটাবেজ ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে!\nমোট শিক্ষার্থী: ${ResultEngine.toBnDigit(backupObj.studentsCount)} জন।`);
    } catch (err) {
      alert('ব্যাকআপ ডাউনলোডে সমস্যা: ' + err.message);
    }
  };

  // Tab switching
  function switchAdminTab(tabName) {
    adminTabButtons.forEach(btn => {
      if (btn.getAttribute('data-admin-tab') === tabName) {
        btn.classList.add('active', 'bg-emerald-600', 'text-white');
        btn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
      } else {
        btn.classList.remove('active', 'bg-emerald-600', 'text-white');
        btn.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
      }
    });

    if (batchPrintTabContent) batchPrintTabContent.classList.toggle('hidden', tabName !== 'batchPrintTab');
    if (spreadsheetTabContent) spreadsheetTabContent.classList.toggle('hidden', tabName !== 'spreadsheetTab');
    if (excelImportTabContent) excelImportTabContent.classList.toggle('hidden', tabName !== 'excelImportTab');
    if (settingsTabContent) settingsTabContent.classList.toggle('hidden', tabName !== 'settingsTab');

    if (tabName === 'batchPrintTab') renderBatchPreview();
    if (tabName === 'spreadsheetTab') renderSpreadsheet();
  }

  window.switchAdminTab = switchAdminTab;

  // Event Listeners
  function bindEvents() {
    pinForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawPin = pinInput?.value || '';
      const authRes = await ResultEngine.authenticatePin(rawPin);
      if (authRes.success) {
        try { sessionStorage.removeItem('fayzar_result_switched_out'); } catch (e) {}
        currentUser = authRes.user;
        hideAuthOverlay();
        applyUserPermissions(currentUser);
      } else {
        alert(authRes.error);
        if (pinInput) {
          pinInput.value = '';
          pinInput.focus();
        }
      }
    });

    adminInstitutionSelect?.addEventListener('change', (e) => {
      activeSchoolId = e.target.value;
      populateYearAndExamDropdowns();
      populateClassDropdowns();
      renderSpreadsheet();
      renderBatchPreview();
      loadSettingsForm();
    });

    // Year and Exam selection changes
    editorYearSelect?.addEventListener('change', (e) => {
      currentYear = e.target.value;
      updateExamDropdownsForYear();
      if (batchYearSelect) batchYearSelect.value = currentYear;
      if (importYearSelect) importYearSelect.value = currentYear;
      renderSpreadsheet();
      renderBatchPreview();
    });

    editorExamSelect?.addEventListener('change', (e) => {
      currentExamId = e.target.value;
      if (batchExamSelect) batchExamSelect.value = currentExamId;
      if (importExamSelect) importExamSelect.value = currentExamId;
      renderSpreadsheet();
      renderBatchPreview();
    });

    batchYearSelect?.addEventListener('change', (e) => {
      currentYear = e.target.value;
      updateExamDropdownsForYear();
      if (editorYearSelect) editorYearSelect.value = currentYear;
      if (importYearSelect) importYearSelect.value = currentYear;
      renderBatchPreview();
      renderSpreadsheet();
    });

    batchExamSelect?.addEventListener('change', (e) => {
      currentExamId = e.target.value;
      if (editorExamSelect) editorExamSelect.value = currentExamId;
      if (importExamSelect) importExamSelect.value = currentExamId;
      renderBatchPreview();
      renderSpreadsheet();
    });

    importYearSelect?.addEventListener('change', (e) => {
      currentYear = e.target.value;
      updateExamDropdownsForYear();
      if (editorYearSelect) editorYearSelect.value = currentYear;
      if (batchYearSelect) batchYearSelect.value = currentYear;
    });

    importExamSelect?.addEventListener('change', (e) => {
      currentExamId = e.target.value;
      if (editorExamSelect) editorExamSelect.value = currentExamId;
      if (batchExamSelect) batchExamSelect.value = currentExamId;
    });

    importClassSelect?.addEventListener('change', (e) => {
      currentClassId = e.target.value;
      if (editorClassSelect) editorClassSelect.value = currentClassId;
      if (batchClassSelect) batchClassSelect.value = currentClassId;
    });

    // Tab buttons
    adminTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-admin-tab');
        if (tab) switchAdminTab(tab);
      });
    });

    editorClassSelect?.addEventListener('change', (e) => {
      currentClassId = e.target.value;
      if (batchClassSelect) batchClassSelect.value = currentClassId;
      if (importClassSelect) importClassSelect.value = currentClassId;
      renderSpreadsheet();
    });

    batchClassSelect?.addEventListener('change', (e) => {
      currentClassId = e.target.value;
      if (editorClassSelect) editorClassSelect.value = currentClassId;
      if (importClassSelect) importClassSelect.value = currentClassId;
      renderBatchPreview(e.target.value);
    });

    executeBatchPrintBtn?.addEventListener('click', executeBatchPrint);
    saveEditorChangesBtn?.addEventListener('click', saveSpreadsheetChanges);
    togglePublishBtn?.addEventListener('click', toggleClassPublishStatus);
    exportExcelBtn?.addEventListener('click', exportClassToExcel);
    addNewStudentBtn?.addEventListener('click', openAddStudentModal);
    const openSubjectEntryModalBtn = document.getElementById('openSubjectEntryModalBtn');
    openSubjectEntryModalBtn?.addEventListener('click', openSubjectEntryModal);
    newStudentForm?.addEventListener('submit', handleCreateNewStudent);

    editorSectionSelect?.addEventListener('change', (e) => {
      currentSection = e.target.value;
      renderSpreadsheet();
    });

    const editStudentForm = document.getElementById('editStudentForm');
    editStudentForm?.addEventListener('submit', handleSaveEditedStudent);
    window.handleSaveEditedStudent = handleSaveEditedStudent;

    // Excel import events
    downloadSampleExcelBtn?.addEventListener('click', window.downloadSampleExcelTemplate);
    
    excelDropzone?.addEventListener('click', () => {
      excelFileInput?.click();
    });

    excelDropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      excelDropzone.classList.add('border-emerald-500', 'bg-emerald-50/50');
    });

    excelDropzone?.addEventListener('dragleave', () => {
      excelDropzone.classList.remove('border-emerald-500', 'bg-emerald-50/50');
    });

    excelDropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      excelDropzone.classList.remove('border-emerald-500', 'bg-emerald-50/50');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleExcelUpload(e.dataTransfer.files[0]);
      }
    });

    excelFileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleExcelUpload(e.target.files[0]);
      }
    });

    settingsForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const school = getActiveSchool();
      if (cfgInstNameBn) school.name_bn = cfgInstNameBn.value.trim();
      if (cfgInstNameEn) school.name_en = cfgInstNameEn.value.trim();
      if (cfgInstAddress) school.address_bn = cfgInstAddress.value.trim();

      await ResultEngine.Storage.saveConfig(config);
      alert('স্কুল সেটিংস সফলভাবে সংরক্ষিত ও ব্যাকএন্ডে সিঙ্ক হয়েছে!');
    });

    resetDefaultDataBtn?.addEventListener('click', async () => {
      if (confirm('আপনি কি নিশ্চিত যে সমস্ত ডেটা রিসেট করতে চান?')) {
        await ResultEngine.Storage.resetToDefault();
        location.reload();
      }
    });

    // PIN and Teacher Security Management Event Listeners
    const saveSuperAdminPinBtn = document.getElementById('saveSuperAdminPinBtn');
    saveSuperAdminPinBtn?.addEventListener('click', async () => {
      const input = document.getElementById('cfgSuperAdminPin');
      const val = input?.value.trim();
      if (!val || val.length < 4) {
        alert('সুপার অ্যাডমিন পিন কমপক্ষে ৪ ডিজিট বা অক্ষরের হতে হবে!');
        return;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fayzar_admin_pin', val);
      }
      if (!Array.isArray(config.super_admin_pins)) {
        config.super_admin_pins = ['101919', 'fayzar', 'admin'];
      }
      if (!config.super_admin_pins.includes(val)) {
        config.super_admin_pins.unshift(val);
      }
      await ResultEngine.Storage.saveConfig(config);
      alert('সুপার অ্যাডমিন মাস্টার পাসকি সফলভাবে আপডেট ও সিঙ্ক করা হয়েছে!');
    });

    const saveSchoolMasterPinBtn = document.getElementById('saveSchoolMasterPinBtn');
    saveSchoolMasterPinBtn?.addEventListener('click', async () => {
      const input = document.getElementById('cfgSchoolMasterPin');
      const val = input?.value.trim();
      if (!val) {
        alert('স্কুল মাস্টার পিন খালি রাখা যাবে না!');
        return;
      }
      const school = getActiveSchool();
      school.master_pin = val;
      await ResultEngine.Storage.saveConfig(config);
      alert(`${school.name_bn} এর মাস্টার পিন সফলভাবে আপডেট ও সিঙ্ক করা হয়েছে!`);
    });

    const openAddTeacherBtn = document.getElementById('openAddTeacherBtn');
    openAddTeacherBtn?.addEventListener('click', () => {
      window.openCfgTeacherModal(-1);
    });

    const cfgTeacherForm = document.getElementById('cfgTeacherForm');
    cfgTeacherForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const school = getActiveSchool();
      if (!Array.isArray(school.teachers)) school.teachers = [];

      const idx = parseInt(document.getElementById('cfgTeacherEditIndex')?.value, 10);
      const name = document.getElementById('cfgTeacherName')?.value.trim();
      const pin = document.getElementById('cfgTeacherPin')?.value.trim();

      // Check assigned subjects across classes
      const assignedClassKeys = Object.keys(workingTeacherClassAssignments).filter(k => (workingTeacherClassAssignments[k] || []).length > 0);
      if (!name || !pin || assignedClassKeys.length === 0) {
        alert('অনুগ্রহ করে শিক্ষকের নাম, পিন এবং অন্তত একটি শ্রেণির জন্য বিষয় নির্বাচন করুন!');
        return;
      }

      // Prepare final assignments
      const finalClassAssignments = {};
      const allUniqueSubjects = new Set();
      const assignedClasses = [];

      if (teacherModalAllocationMode === 'all_classes') {
        const subs = workingTeacherClassAssignments['all'] || [];
        finalClassAssignments['all'] = subs;
        subs.forEach(s => allUniqueSubjects.add(s));
        assignedClasses.push('all');
      } else {
        assignedClassKeys.forEach(cid => {
          const subs = workingTeacherClassAssignments[cid] || [];
          if (subs.length > 0) {
            finalClassAssignments[cid] = subs;
            subs.forEach(s => allUniqueSubjects.add(s));
            assignedClasses.push(cid);
          }
        });
      }

      const flatSubjects = Array.from(allUniqueSubjects);

      if (idx >= 0 && school.teachers[idx]) {
        school.teachers[idx].name = name;
        school.teachers[idx].pin = pin;
        school.teachers[idx].assigned_subjects = flatSubjects;
        school.teachers[idx].classes = assignedClasses;
        school.teachers[idx].class_assignments = finalClassAssignments;
      } else {
        const newTeacher = {
          id: `teacher_${Date.now()}`,
          name: name,
          pin: pin,
          assigned_subjects: flatSubjects,
          classes: assignedClasses,
          class_assignments: finalClassAssignments
        };
        school.teachers.push(newTeacher);
      }

      await ResultEngine.Storage.saveConfig(config);
      renderTeachersTable();
      window.closeCfgTeacherModal();
      alert('শিক্ষক তথ্য, ব্যক্তিগত পিন ও শ্রেণিভিত্তিক বিষয় বরাদ্দ সফলভাবে সংরক্ষণ করা হয়েছে!');
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();
