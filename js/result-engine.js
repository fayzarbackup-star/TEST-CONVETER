/**
 * Fayzar Computer Online Result Management & Multi-School Engine
 * Fully integrated with Firebase Firestore REST API, 3-Tier RBAC Authentication,
 * Concurrency-Safe Field Masking, Local-First Caching & Offline Fallback.
 */

(function (global) {
  'use strict';

  // National Standard Grading Rules
  const DEFAULT_GRADING_SCALE = [
    { grade: "A+", point: 5.0, min: 80, max: 100, remark_bn: "চমৎকার (Outstanding)", remark_en: "Outstanding" },
    { grade: "A",  point: 4.0, min: 70, max: 79,  remark_bn: "অতি উত্তম (Excellent)", remark_en: "Excellent" },
    { grade: "A-", point: 3.5, min: 60, max: 69,  remark_bn: "উত্তম (Very Good)", remark_en: "Very Good" },
    { grade: "B",  point: 3.0, min: 50, max: 59,  remark_bn: "ভালো (Good)", remark_en: "Good" },
    { grade: "C",  point: 2.0, min: 40, max: 49,  remark_bn: "সন্তোষজনক (Satisfactory)", remark_en: "Satisfactory" },
    { grade: "D",  point: 1.0, min: 33, max: 39,  remark_bn: "উত্তীর্ণ (Passed)", remark_en: "Passed" },
    { grade: "F",  point: 0.0, min: 0,  max: 32,  remark_bn: "অকৃতকার্য (Failed)", remark_en: "Failed" }
  ];

  /**
   * Convert marks to letter grade and grade point
   */
  function calculateGrade(marks, fullMarks = 100) {
    marks = parseFloat(marks) || 0;
    fullMarks = parseFloat(fullMarks) || 100;
    if (fullMarks <= 0) fullMarks = 100;

    const percentage = (marks / fullMarks) * 100;

    if (percentage >= 80) return { grade: 'A+', point: 5.0, percentage };
    if (percentage >= 70) return { grade: 'A',  point: 4.0, percentage };
    if (percentage >= 60) return { grade: 'A-', point: 3.5, percentage };
    if (percentage >= 50) return { grade: 'B',  point: 3.0, percentage };
    if (percentage >= 40) return { grade: 'C',  point: 2.0, percentage };
    if (percentage >= 33) return { grade: 'D',  point: 1.0, percentage };
    return { grade: 'F', point: 0.0, percentage };
  }

  /**
   * Convert GPA to Letter Grade
   */
  function getGpaGrade(gpa) {
    gpa = parseFloat(gpa) || 0;
    if (gpa >= 5.0) return 'A+';
    if (gpa >= 4.0) return 'A';
    if (gpa >= 3.5) return 'A-';
    if (gpa >= 3.0) return 'B';
    if (gpa >= 2.0) return 'C';
    if (gpa >= 1.0) return 'D';
    return 'F';
  }

  /**
   * Convert English digits to Bengali numerals
   */
  function toBnDigit(num) {
    if (num === null || num === undefined) return '';
    const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    // Normalize any comma separator in numeric decimals to standard dot
    let str = String(num).replace(/(\d),(\d)/g, '$1.$2').replace(/([০-৯]),([০-৯])/g, '$1.$2');
    return str.replace(/[0-9]/g, d => bn[parseInt(d, 10)]);
  }

  /**
   * Convert Bengali digits to English numerals
   */
  function toEnDigit(num) {
    if (num === null || num === undefined) return '';
    const en = { '০': 0, '১': 1, '২': 2, '৩': 3, '৪': 4, '৫': 5, '⑥': 6, '৬': 6, '৭': 7, '৮': 8, '৯': 9 };
    let str = String(num).replace(/([০-৯]),([০-৯])/g, '$1.$2').replace(/(\d),(\d)/g, '$1.$2');
    return str.replace(/[০-৯]/g, d => en[d]);
  }

  /**
   * Format GPA nicely (e.g. 5.00, 4.75)
   */
  function formatGpa(gpa) {
    if (gpa === null || gpa === undefined) return '0.00';
    if (typeof gpa === 'string') {
      gpa = gpa.replace(/,/g, '.');
      gpa = toEnDigit(gpa);
    }
    gpa = parseFloat(gpa);
    if (isNaN(gpa)) return '0.00';
    return gpa.toFixed(2);
  }

  /**
   * Check if a mark value indicates absence
   */
  function isAbsentValue(val) {
    if (val === null || val === undefined) return false;
    const s = String(val).trim().toUpperCase();
    return s === 'ABS' || s === 'অনুপস্থিত' || s === 'A';
  }

  /**
   * Calculate complete student marksheet with subject grades, total marks, GPA & status
   */
  function calculateStudent(student, options = {}) {
    if (!student || !Array.isArray(student.subjects)) return student;

    const requireComponentPass = options.require_component_pass || false;
    const requireBothPapersAppearance = options.require_both_papers_appearance || false;

    // Determine class level ONCE — primary classes always use marks_obtained only
    const classId = student.class_id || student.class || '';
    const isPrimaryClass = !isSecondaryClass(classId) && !isJuniorSecondaryClass(classId);

    let totalMarks = 0;
    let maxMarks = 0;
    let mandatoryCount = 0;
    let mandatoryGradePoints = 0;
    let fourthSubjectInfo = null;
    let hasFail = false;
    const failedSubjects = [];

    const subjects = student.subjects.map(sub => {
      let full = parseFloat(sub.full_marks) || 100;
      let obt = sub.marks_obtained;
      let isAbsent = isAbsentValue(obt);
      let hasComponentAbs = false;
      let failedComponent = false;
      let discrepancyWarning = false;
      
      let obtNum = 0;

      // If composite subject with individual papers (Board Standard e.g. Bangla 1st & 2nd)
      if (!isPrimaryClass && Array.isArray(sub.papers) && sub.papers.length > 0) {
        let pSum = 0;
        let pFull = 0;
        let pCq = 0;
        let pMcq = 0;
        let pPractical = 0;
        let hasPaperBreakdown = false;
        let paperAbsCount = 0;

        sub.papers = sub.papers.map(p => {
          let pSubFull = parseFloat(p.full_marks) || 100;
          pFull += pSubFull;
          let pObt = p.marks_obtained;
          const pIsAbs = isAbsentValue(pObt) || isAbsentValue(p.cq) || isAbsentValue(p.mcq) || isAbsentValue(p.practical);
          
          let pObtNum = 0;
          let pCqVal = 0;
          let pMcqVal = 0;
          let pPrVal = 0;

          if (p.cq !== undefined || p.mcq !== undefined || p.practical !== undefined) {
            hasPaperBreakdown = true;
            pCqVal = isAbsentValue(p.cq) ? 0 : (parseFloat(p.cq) || 0);
            pMcqVal = isAbsentValue(p.mcq) ? 0 : (parseFloat(p.mcq) || 0);
            pPrVal = isAbsentValue(p.practical) ? 0 : (parseFloat(p.practical) || 0);
            pObtNum = pCqVal + pMcqVal + pPrVal;
          } else {
            pObtNum = pIsAbs ? 0 : (parseFloat(pObt) || 0);
          }

          if (pIsAbs) {
            paperAbsCount++;
          }

          pSum += pObtNum;
          pCq += pCqVal;
          pMcq += pMcqVal;
          pPractical += pPrVal;

          return {
            ...p,
            full_marks: pSubFull,
            marks_obtained: pIsAbs ? 'ABS' : pObtNum,
            cq: isAbsentValue(p.cq) ? 'ABS' : (p.cq !== undefined ? (parseFloat(p.cq) || 0) : undefined),
            mcq: isAbsentValue(p.mcq) ? 'ABS' : (p.mcq !== undefined ? (parseFloat(p.mcq) || 0) : undefined),
            practical: isAbsentValue(p.practical) ? 'ABS' : (p.practical !== undefined ? (parseFloat(p.practical) || 0) : undefined),
            is_absent: pIsAbs
          };
        });

        // Detect composite papers extreme discrepancy (e.g. 66 in 1st, 0 in 2nd)
        if (sub.papers.length >= 2) {
          const p1 = sub.papers[0];
          const p2 = sub.papers[1];
          const m1 = p1.is_absent ? 0 : (parseFloat(p1.marks_obtained) || 0);
          const m2 = p2.is_absent ? 0 : (parseFloat(p2.marks_obtained) || 0);
          if ((m1 >= 33 && (m2 <= 10 || p2.is_absent)) || (m2 >= 33 && (m1 <= 10 || p1.is_absent))) {
            discrepancyWarning = true;
          }
          if (requireBothPapersAppearance && paperAbsCount > 0) {
            hasComponentAbs = true;
          }
        }

        if (paperAbsCount === sub.papers.length) {
          isAbsent = true;
        }

        if (pSum > 0 || sub.marks_obtained === undefined || sub.marks_obtained === null) {
          obtNum = pSum;
        }
        if (pFull > 0 && (!sub.full_marks || sub.full_marks <= 100)) {
          full = pFull;
        }
        if (hasPaperBreakdown) {
          sub.cq = pCq;
          sub.mcq = pMcq;
          sub.practical = pPractical;
        }
      } else {
        // Non-composite subject
        if (isPrimaryClass) {
          // PRIMARY CLASS (Nursery, KG, Class 1-5): ALWAYS use marks_obtained directly.
          // Ignore any cq/mcq/practical that may exist as stale legacy data.
          obtNum = isAbsent ? 0 : (parseFloat(sub.marks_obtained) || 0);
        } else {
          // Secondary/Junior-Secondary: check component-level ABS
          const cqIsAbs = isAbsentValue(sub.cq);
          const mcqIsAbs = isAbsentValue(sub.mcq);
          const prIsAbs = isAbsentValue(sub.practical);

          if (cqIsAbs || mcqIsAbs || prIsAbs) {
            hasComponentAbs = true;
          }

          if (sub.cq !== undefined || sub.mcq !== undefined || sub.practical !== undefined) {
            const cqVal = cqIsAbs ? 0 : (parseFloat(sub.cq) || 0);
            const mcqVal = mcqIsAbs ? 0 : (parseFloat(sub.mcq) || 0);
            const prVal = prIsAbs ? 0 : (parseFloat(sub.practical) || 0);
            const cSum = cqVal + mcqVal + prVal;
            const marksObtNum = parseFloat(sub.marks_obtained);
            if (cSum > 0) {
              obtNum = cSum;
            } else if (!isNaN(marksObtNum) && marksObtNum > 0) {
              obtNum = marksObtNum;
            } else {
              obtNum = parseFloat(sub.marks_obtained) || 0;
            }

            if (requireComponentPass && !hasComponentAbs) {
              if (sub.cq !== undefined && cqVal < 23 && full === 100) failedComponent = true;
              if (sub.mcq !== undefined && mcqVal < 10 && full === 100) failedComponent = true;
              if (sub.practical !== undefined && prVal < 8 && (full === 100 || full === 50)) failedComponent = true;
            }
          } else {
            obtNum = isAbsent ? 0 : (parseFloat(sub.marks_obtained) || 0);
          }
        }
      }

      if (obtNum > full) obtNum = full;

      let gInfo = calculateGrade(obtNum, full);

      // If absent in subject or any mandatory component, or failed strict component pass
      if (isAbsent || hasComponentAbs) {
        gInfo = { grade: 'F', point: 0.0, percentage: 0 };
        isAbsent = true;
      } else if (failedComponent) {
        gInfo = { grade: 'F', point: 0.0, percentage: gInfo.percentage };
      }

      totalMarks += obtNum;
      maxMarks += full;

      if (!sub.is_optional) {
        mandatoryCount++;
        mandatoryGradePoints += gInfo.point;
        if (gInfo.grade === 'F') {
          hasFail = true;
          failedSubjects.push({
            code: sub.code || '',
            name_bn: sub.name_bn || sub.name || '',
            name_en: sub.name_en || sub.name_bn || sub.name || '',
            full_marks: full,
            marks_obtained: isAbsent ? 'ABS' : obtNum,
            grade: 'F',
            point: 0.0,
            is_absent: isAbsent,
            failed_component: failedComponent
          });
        }
      } else {
        // 4th Subject Bonus Rule: if GP > 2, add (GP - 2) to total
        const bonusPoint = gInfo.point > 2 ? (gInfo.point - 2) : 0;
        fourthSubjectInfo = {
          code: sub.code || '',
          name_bn: sub.name_bn,
          name_en: sub.name_en || sub.name_bn,
          full_marks: full,
          marks_obtained: isAbsent ? 'ABS' : obtNum,
          grade: gInfo.grade,
          point: gInfo.point,
          bonus_point: parseFloat(bonusPoint.toFixed(2))
        };
      }

      return {
        ...sub,
        full_marks: full,
        marks_obtained: isAbsent ? 'ABS' : obtNum,
        is_absent: isAbsent,
        has_component_abs: hasComponentAbs,
        discrepancy_warning: discrepancyWarning,
        failed_component: failedComponent,
        grade: gInfo.grade,
        point: gInfo.point
      };
    });

    // GPA Without 4th Subject
    const rawMandatoryGpa = mandatoryCount > 0 ? (mandatoryGradePoints / mandatoryCount) : 0;
    const gpaWithout4th = hasFail ? 0.0 : parseFloat(Math.min(5.0, rawMandatoryGpa).toFixed(2));

    // GPA With 4th Subject Bonus (GP above 2.00)
    const bonus = fourthSubjectInfo ? fourthSubjectInfo.bonus_point : 0;
    const totalPointsWithBonus = mandatoryGradePoints + bonus;
    let rawGpaWith4th = mandatoryCount > 0 ? (totalPointsWithBonus / mandatoryCount) : 0;
    if (rawGpaWith4th > 5.0) rawGpaWith4th = 5.0; // Max GPA cap is 5.00

    const finalGpa = hasFail ? 0.0 : parseFloat(rawGpaWith4th.toFixed(2));
    const finalGrade = hasFail ? 'F' : getGpaGrade(finalGpa);
    const status = hasFail ? 'Failed' : 'Passed';
    const failCount = failedSubjects.length;
    const failTextEn = failCount > 0 ? `Fail in ${failCount}` : '';
    const failTextBn = failCount > 0 ? `${toBnDigit(failCount)} বিষয়ে ফেল` : '';

    let remarks = 'উত্তীর্ণ';
    if (finalGrade === 'A+') remarks = 'চমৎকার (Outstanding)';
    else if (finalGrade === 'A') remarks = 'অতি উত্তম (Excellent)';
    else if (finalGrade === 'A-') remarks = 'উত্তম (Very Good)';
    else if (finalGrade === 'B' || finalGrade === 'C') remarks = 'ভালো (Good)';
    else if (finalGrade === 'D') remarks = 'সন্তোষজনক (Satisfactory)';
    else if (finalGrade === 'F') {
      if (failCount > 0) {
        remarks = `অকৃতকার্য (${failTextBn} / ${failTextEn})`;
      } else {
        remarks = 'অকৃতকার্য (Failed)';
      }
    }

    return {
      ...student,
      subjects: subjects,
      total_marks: totalMarks,
      max_possible_marks: maxMarks,
      gpa: finalGpa,
      gpa_without_4th: gpaWithout4th,
      fourth_subject_info: fourthSubjectInfo,
      grade: finalGrade,
      status: status,
      fail_count: failCount,
      failed_subjects: failedSubjects,
      fail_text_bn: failTextBn,
      fail_text_en: failTextEn,
      remarks: remarks
    };
  }

  /**
   * Sort & assign merit positions for a list of students in a class
   */
  function calculateClassPositions(students) {
    if (!Array.isArray(students)) return [];

    const calculated = students.map(s => calculateStudent(s));

    calculated.sort((a, b) => {
      if (a.status === 'Passed' && b.status !== 'Passed') return -1;
      if (a.status !== 'Passed' && b.status === 'Passed') return 1;
      if (b.gpa !== a.gpa) return b.gpa - a.gpa;
      if (b.total_marks !== a.total_marks) return b.total_marks - a.total_marks;
      return (parseInt(a.roll, 10) || 0) - (parseInt(b.roll, 10) || 0);
    });

    return calculated.map((st, idx) => ({
      ...st,
      position: idx + 1,
      class_position: idx + 1,
      merit_position: idx + 1
    }));
  }

  /**
   * Compute class level analytics & summary statistics
   */
  function getClassAnalytics(students) {
    if (!Array.isArray(students) || students.length === 0) {
      return {
        total_students: 0,
        appeared: 0,
        passed: 0,
        failed: 0,
        pass_rate: 0,
        gpa5_count: 0,
        avg_gpa: 0,
        avg_marks: 0,
        highest_marks: 0,
        grade_counts: { 'A+': 0, 'A': 0, 'A-': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 }
      };
    }

    let passed = 0;
    let failed = 0;
    let gpa5 = 0;
    let totalGpa = 0;
    let totalMarksSum = 0;
    let highestMarks = 0;
    const gradeCounts = { 'A+': 0, 'A': 0, 'A-': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };

    students.forEach(s => {
      if (s.status === 'Passed') {
        passed++;
        totalGpa += s.gpa;
      } else {
        failed++;
      }
      if (s.grade === 'A+' && s.status === 'Passed') {
        gpa5++;
      }
      if (gradeCounts[s.grade] !== undefined) {
        gradeCounts[s.grade]++;
      }
      totalMarksSum += s.total_marks || 0;
      if ((s.total_marks || 0) > highestMarks) {
        highestMarks = s.total_marks;
      }
    });

    const passRate = students.length > 0 ? parseFloat(((passed / students.length) * 100).toFixed(2)) : 0;
    const avgGpa = passed > 0 ? parseFloat((totalGpa / passed).toFixed(2)) : 0;
    const avgMarks = students.length > 0 ? parseFloat((totalMarksSum / students.length).toFixed(1)) : 0;

    return {
      total_students: students.length,
      appeared: students.length,
      passed: passed,
      failed: failed,
      pass_rate: passRate,
      gpa5_count: gpa5,
      avg_gpa: avgGpa,
      avg_marks: avgMarks,
      highest_marks: highestMarks,
      grade_counts: gradeCounts
    };
  }

  /**
   * Lightweight SVG QR Code Generator for official result verification
   */
  function generateVerificationQrSvg(url, size = 110) {
    const hash = Array.from(url).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000000007, 7);
    const matrix = [];
    const gridSize = 21;
    for (let r = 0; r < gridSize; r++) {
      const row = [];
      for (let c = 0; c < gridSize; c++) {
        const isTopLeft = (r < 7 && c < 7);
        const isTopRight = (r < 7 && c >= gridSize - 7);
        const isBottomLeft = (r >= gridSize - 7 && c < 7);

        if (isTopLeft || isTopRight || isBottomLeft) {
          const lr = isBottomLeft ? r - (gridSize - 7) : r;
          const lc = isTopRight ? c - (gridSize - 7) : c;
          if (lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4)) {
            row.push(1);
          } else {
            row.push(0);
          }
        } else if (r === 6 || c === 6) {
          row.push((r + c) % 2 === 0 ? 1 : 0);
        } else {
          const val = ((hash ^ (r * 37 + c * 17)) + (url.charCodeAt((r + c) % url.length) || 0)) % 3;
          row.push(val === 0 || val === 1 ? 1 : 0);
        }
      }
      matrix.push(row);
    }

    const cellSize = (size / gridSize).toFixed(2);
    let rects = '';
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (matrix[r][c] === 1) {
          rects += `<rect x="${(c * cellSize).toFixed(1)}" y="${(r * cellSize).toFixed(1)}" width="${cellSize}" height="${cellSize}" fill="#0f172a" />`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="mx-auto rounded-lg bg-white p-1 shadow-sm border border-slate-200">
      ${rects}
    </svg>`;
  }

  /**
   * Cryptographic-style verification token for anti-tampering verification
   */
  function generateVerificationSignature(student) {
    if (!student) return '';
    const raw = `${student.school_id || student.institution_id || ''}_${student.class_id || ''}_${student.roll || ''}_${student.exam_id || ''}_${student.total_marks || 0}_${student.gpa || 0}`;
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) + hash) + raw.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).toUpperCase();
  }

  // =========================================================================
  // FIREBASE FIRESTORE REST ENGINE & CONVERSION UTILS
  // =========================================================================
  const Firestore = {
    apiKey: "AIzaSyDcGqhXFilKia4mIanB7-a25Gd8AtCYsYA",
    projectId: "fayzar-autofill",

    get baseUrl() {
      return `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
    },

    toFirestoreFields(obj) {
      const fields = {};
      for (const [key, val] of Object.entries(obj)) {
        if (val === null || val === undefined) continue;
        if (typeof val === 'string') {
          fields[key] = { stringValue: val };
        } else if (typeof val === 'number') {
          fields[key] = Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
        } else if (typeof val === 'boolean') {
          fields[key] = { booleanValue: val };
        } else if (Array.isArray(val)) {
          fields[key] = {
            arrayValue: {
              values: val.map(item => {
                if (typeof item === 'string') return { stringValue: item };
                if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: item.toString() } : { doubleValue: item };
                if (typeof item === 'boolean') return { booleanValue: item };
                if (typeof item === 'object') return { mapValue: { fields: this.toFirestoreFields(item) } };
                return { stringValue: String(item) };
              })
            }
          };
        } else if (typeof val === 'object') {
          fields[key] = { mapValue: { fields: this.toFirestoreFields(val) } };
        }
      }
      return fields;
    },

    fromFirestoreDoc(doc) {
      if (!doc || !doc.fields) return null;
      const result = { id: doc.name ? doc.name.split('/').pop() : '' };

      function parseValue(v) {
        if (!v) return null;
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
        if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
        if (v.booleanValue !== undefined) return v.booleanValue;
        if (v.arrayValue !== undefined) {
          return (v.arrayValue.values || []).map(parseValue);
        }
        if (v.mapValue !== undefined) {
          const subObj = {};
          for (const [subKey, subVal] of Object.entries(v.mapValue.fields || {})) {
            subObj[subKey] = parseValue(subVal);
          }
          return subObj;
        }
        return null;
      }

      for (const [key, val] of Object.entries(doc.fields)) {
        result[key] = parseValue(val);
      }
      return result;
    },

    getStudentDocId(schoolId, year, examId, classId, roll) {
      const cleanSchool = (schoolId || 'dreamland-school').replace(/[^a-zA-Z0-9_-]/g, '');
      const cleanClass = (classId || 'nursery').replace(/[^a-zA-Z0-9_-]/g, '');
      const cleanExam = (examId || 'annual_2025').replace(/[^a-zA-Z0-9_-]/g, '');
      const cleanRoll = String(roll || '1').padStart(3, '0');
      return `${cleanSchool}_${year || '2025'}_${cleanExam}_${cleanClass}_${cleanRoll}`;
    },

    // Save individual student with Concurrency updateMask support
    async saveStudentToFirestore(student, fieldMask = null) {
      try {
        const docId = this.getStudentDocId(student.institution_id, student.year, student.exam_id, student.class_id, student.roll);
        let url = `${this.baseUrl}/results_students/${docId}?key=${this.apiKey}`;
        
        if (Array.isArray(fieldMask) && fieldMask.length > 0) {
          const maskParams = fieldMask.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
          url += `&${maskParams}`;
        }

        const fields = this.toFirestoreFields(student);
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields })
        });

        if (res.ok) {
          return { success: true, docId };
        } else {
          const err = await res.json().catch(() => ({}));
          console.warn('Firestore write warning:', err);
          return { success: false, error: err };
        }
      } catch (e) {
        console.warn('Firestore network warning:', e);
        return { success: false, error: e.message };
      }
    }
  };

  // =========================================================================
  // STORAGE & HYBRID SYNC (LOCAL-FIRST + FIRESTORE)
  // =========================================================================
  // =========================================================================
  const Storage = {
    CONFIG_KEY: 'fayzar_results_config_v3',
    DATA_KEY: 'fayzar_results_data_v3',
    CUSTOM_STUDENTS_KEY: 'fayzar_custom_students_v3',
    AUTH_USER_KEY: 'fayzar_result_current_user',
    IDB_NAME: 'FayzarResultsDB',
    IDB_STORE: 'results_store',
    _memoryUser: null,

    async _getIDB() {
      if (typeof indexedDB === 'undefined') return null;
      return new Promise((resolve) => {
        try {
          const req = indexedDB.open(this.IDB_NAME, 2);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(this.IDB_STORE)) {
              db.createObjectStore(this.IDB_STORE);
            }
          };
          req.onsuccess = (e) => resolve(e.target.result);
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    },

    async _idbGet(key) {
      try {
        const db = await this._getIDB();
        if (!db || !db.objectStoreNames.contains(this.IDB_STORE)) return null;
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(this.IDB_STORE, 'readonly');
            const getReq = tx.objectStore(this.IDB_STORE).get(key);
            getReq.onsuccess = () => resolve(getReq.result || null);
            getReq.onerror = () => resolve(null);
          } catch (e) {
            resolve(null);
          }
        });
      } catch (e) {
        return null;
      }
    },

    async _idbSet(key, val) {
      try {
        const db = await this._getIDB();
        if (!db || !db.objectStoreNames.contains(this.IDB_STORE)) return false;
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(this.IDB_STORE, 'readwrite');
            const putReq = tx.objectStore(this.IDB_STORE).put(val, key);
            putReq.onsuccess = () => resolve(true);
            putReq.onerror = () => resolve(false);
          } catch (e) {
            resolve(false);
          }
        });
      } catch (e) {
        return false;
      }
    },

    _writeLocalConfig(config) {
      if (!config) return;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
        }
      } catch (e) {
        console.warn('Local storage config write warning:', e);
      }
      if (typeof window !== 'undefined') {
        window.DEFAULT_RESULTS_CONFIG = config;
      }
    },

    async loadConfig() {
      const isHttp = (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http'));
      if (isHttp && typeof fetch !== 'undefined') {
        try {
          const res = await fetch('/api/results/config', { cache: 'no-cache' });
          if (res.ok) {
            const cfg = await res.json();
            if (cfg && Array.isArray(cfg.institutions) && cfg.institutions.length > 0) {
              this._writeLocalConfig(cfg);
              await this._idbSet(this.CONFIG_KEY, cfg);
              return cfg;
            }
          }
        } catch (e) {}

        try {
          const res2 = await fetch('data/results_config.json', { cache: 'no-cache' });
          if (res2.ok) {
            const cfg2 = await res2.json();
            if (cfg2 && Array.isArray(cfg2.institutions) && cfg2.institutions.length > 0) {
              this._writeLocalConfig(cfg2);
              await this._idbSet(this.CONFIG_KEY, cfg2);
              return cfg2;
            }
          }
        } catch (e) {}
      }

      // Check IndexedDB
      const idbConfig = await this._idbGet(this.CONFIG_KEY);
      if (idbConfig && Array.isArray(idbConfig.institutions) && idbConfig.institutions.length > 0) {
        if (typeof window !== 'undefined') window.DEFAULT_RESULTS_CONFIG = idbConfig;
        return idbConfig;
      }

      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(this.CONFIG_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && Array.isArray(parsed.institutions) && parsed.institutions.length > 0) {
              return parsed;
            }
          } catch (e) {}
        }
      }

      if (typeof window !== 'undefined' && window.DEFAULT_RESULTS_CONFIG && Array.isArray(window.DEFAULT_RESULTS_CONFIG.institutions)) {
        return window.DEFAULT_RESULTS_CONFIG;
      }
      return (typeof window !== 'undefined' && window.DEFAULT_RESULTS_CONFIG) || {};
    },

    async saveConfig(config) {
      if (!config) return;
      this._writeLocalConfig(config);
      await this._idbSet(this.CONFIG_KEY, config);

      if (typeof fetch !== 'undefined') {
        try {
          await fetch('/api/results/save-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          });
        } catch (e) {
          try {
            await fetch('/api/save-results-config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(config)
            });
          } catch (err) {}
        }
      }
    },

    _writeLocalStudents(students) {
      if (!Array.isArray(students)) return;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.DATA_KEY, JSON.stringify(students));
        }
      } catch (e) {
        console.warn('Local storage students write warning (possible quota):', e);
      }
      if (typeof window !== 'undefined') {
        window.DEFAULT_RESULTS_DATA = students;
      }
    },

    async getCustomStudents() {
      let list = [];
      try {
        const idbCustom = await this._idbGet(this.CUSTOM_STUDENTS_KEY);
        if (Array.isArray(idbCustom) && idbCustom.length > 0) {
          list = idbCustom;
        }
      } catch (e) {}

      if (list.length === 0 && typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(this.CUSTOM_STUDENTS_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
          }
        } catch (e) {}
      }
      return list;
    },

    async saveCustomStudents(customList) {
      if (!Array.isArray(customList)) return;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.CUSTOM_STUDENTS_KEY, JSON.stringify(customList));
        }
      } catch (e) {
        console.warn('Custom students localStorage write warning:', e);
      }
      await this._idbSet(this.CUSTOM_STUDENTS_KEY, customList);
    },

    async loadStudents() {
      // 1. First get local cached students from IndexedDB or localStorage
      let localStudents = [];
      try {
        const idbData = await this._idbGet(this.DATA_KEY);
        if (Array.isArray(idbData) && idbData.length > 0) {
          localStudents = idbData;
        } else if (typeof localStorage !== 'undefined') {
          const cached = localStorage.getItem(this.DATA_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localStudents = parsed;
            }
          }
        }
      } catch (e) {}

      // 2. Fetch server data if HTTP
      let serverStudents = null;
      const isHttp = (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http'));
      if (isHttp && typeof fetch !== 'undefined') {
        try {
          const res = await fetch('/api/results/data', { cache: 'no-cache' });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) serverStudents = data;
          }
        } catch (e) {}

        if (!serverStudents) {
          try {
            const res2 = await fetch('data/results_data.json', { cache: 'no-cache' });
            if (res2.ok) {
              const data2 = await res2.json();
              if (Array.isArray(data2) && data2.length > 0) serverStudents = data2;
            }
          } catch (e) {}
        }
      }

      if (!serverStudents && typeof window !== 'undefined' && Array.isArray(window.DEFAULT_RESULTS_DATA) && window.DEFAULT_RESULTS_DATA.length > 0) {
        serverStudents = window.DEFAULT_RESULTS_DATA;
      }

      // 3. SMART MERGE:
      // Never delete locally added students or newer offline edits!
      let finalStudents = [];
      const customStudents = await this.getCustomStudents();

      if (serverStudents && Array.isArray(serverStudents) && localStudents.length > 0) {
        const serverMap = new Map(serverStudents.map(s => [s.id, s]));
        const localMap = new Map(localStudents.map(s => [s.id, s]));

        // Merge existing students
        serverStudents.forEach(s => {
          const localMatch = localMap.get(s.id);
          if (localMatch) {
            const localUp = localMatch.updated_at || 0;
            const serverUp = s.updated_at || 0;
            if (localUp >= serverUp) {
              finalStudents.push(localMatch);
            } else {
              finalStudents.push(s);
            }
          } else {
            finalStudents.push(s);
          }
        });

        // Retain any local-created students not present on server
        let newlyAddedCount = 0;
        localStudents.forEach(ls => {
          if (!serverMap.has(ls.id)) {
            finalStudents.push(ls);
            newlyAddedCount++;
          }
        });

        // If local had new students or offline updates, sync back to server in background
        if (newlyAddedCount > 0) {
          this.saveStudents(finalStudents);
        }
      } else if (serverStudents && Array.isArray(serverStudents) && serverStudents.length > 0) {
        finalStudents = [...serverStudents];
      } else if (localStudents.length > 0) {
        finalStudents = [...localStudents];
      }

      // Always guarantee any custom-added student from delta storage is included
      if (customStudents.length > 0) {
        const currentFinalMap = new Map(finalStudents.map(s => [s.id, s]));
        let deltaAdded = false;
        customStudents.forEach(cs => {
          if (!currentFinalMap.has(cs.id)) {
            finalStudents.push(cs);
            currentFinalMap.set(cs.id, cs);
            deltaAdded = true;
          } else {
            const existing = currentFinalMap.get(cs.id);
            if ((cs.updated_at || 0) > (existing.updated_at || 0)) {
              Object.assign(existing, cs);
              deltaAdded = true;
            }
          }
        });
        if (deltaAdded) {
          this._writeLocalStudents(finalStudents);
          await this._idbSet(this.DATA_KEY, finalStudents);
        }
      }

      if (finalStudents.length > 0) {
        this._writeLocalStudents(finalStudents);
        await this._idbSet(this.DATA_KEY, finalStudents);
        return finalStudents;
      }
      return [];
    },

    async saveStudents(students) {
      if (!Array.isArray(students)) return;
      const now = Date.now();
      students.forEach(s => {
        if (!s.updated_at) s.updated_at = now;
      });
      this._writeLocalStudents(students);
      await this._idbSet(this.DATA_KEY, students);

      // Track newly created / custom students in dedicated lightweight delta storage
      try {
        const customStudents = students.filter(s => s.is_custom || (typeof s.id === 'string' && s.id.startsWith('st_')));
        if (customStudents.length > 0) {
          await this.saveCustomStudents(customStudents);
        }
      } catch (e) {}

      if (typeof fetch !== 'undefined') {
        try {
          await fetch('/api/results/save-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(students)
          });
        } catch (e) {
          try {
            await fetch('/api/save-results-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(students)
            });
          } catch (err) {}
        }
      }
    },

    async resetToDefault() {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.CONFIG_KEY);
        localStorage.removeItem(this.DATA_KEY);
        localStorage.removeItem(this.CUSTOM_STUDENTS_KEY);
      }
      await this._idbSet(this.CONFIG_KEY, null);
      await this._idbSet(this.DATA_KEY, null);
      await this._idbSet(this.CUSTOM_STUDENTS_KEY, null);
      const config = await this.loadConfig();
      const students = await this.loadStudents();
      return { config, students };
    },

    // Authentication Session (SSO-enabled across tabs & admin.html)
    getCurrentUser() {
      try {
        let raw = null;
        if (typeof sessionStorage !== 'undefined') {
          raw = sessionStorage.getItem(this.AUTH_USER_KEY);
        }
        if (!raw && typeof localStorage !== 'undefined') {
          raw = localStorage.getItem(this.AUTH_USER_KEY);
        }
        if (raw) return JSON.parse(raw);

        // If user explicitly switched out / logged out from results admin, don't auto SSO
        const isSwitchedOut = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('fayzar_result_switched_out') === 'true');
        if (isSwitchedOut) {
          return this._memoryUser || null;
        }

        // Auto-SSO from Main Web Admin Suite (admin.html)
        const isMainAdminActive = 
          (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('fayzar_admin_session') === 'true') ||
          (typeof localStorage !== 'undefined' && localStorage.getItem('fayzar_admin_session') === 'true');

        if (isMainAdminActive) {
          const autoSuperAdmin = {
            role: 'super_admin',
            role_title: 'ওয়েব সুপার অ্যাডমিন (ফয়জার কম্পিউটার)',
            name: 'ফয়জার কম্পিউটার অ্যাডমিন',
            canBatchPrint: true,
            canPublish: true,
            canSwitchSchool: true,
            canManageUsers: true,
            school_id: null
          };
          this.setCurrentUser(autoSuperAdmin);
          return autoSuperAdmin;
        }

        return this._memoryUser || null;
      } catch (e) {
        return null;
      }
    },

    setCurrentUser(user) {
      this._memoryUser = user;
      try {
        if (user && typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('fayzar_result_switched_out');
        }
        const val = user ? JSON.stringify(user) : null;
        if (typeof sessionStorage !== 'undefined') {
          if (val) sessionStorage.setItem(this.AUTH_USER_KEY, val);
          else sessionStorage.removeItem(this.AUTH_USER_KEY);
        }
        if (typeof localStorage !== 'undefined') {
          if (val) localStorage.setItem(this.AUTH_USER_KEY, val);
          else localStorage.removeItem(this.AUTH_USER_KEY);
        }
      } catch(e) {}
    },

    logout() {
      this._memoryUser = null;
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(this.AUTH_USER_KEY);
          sessionStorage.removeItem('fayzar_admin_authenticated');
          sessionStorage.removeItem('fayzar_admin_session');
          sessionStorage.setItem('fayzar_result_switched_out', 'true');
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(this.AUTH_USER_KEY);
          localStorage.removeItem('fayzar_admin_authenticated');
          localStorage.removeItem('fayzar_admin_session');
          localStorage.removeItem('fayzar_admin_pin');
        }
      } catch(e) {}
    }
  };

  // =========================================================================
  // 3-TIER RBAC AUTHENTICATION ENGINE
  // =========================================================================
  async function authenticatePin(rawPin) {
    if (!rawPin) return { success: false, error: 'অনুগ্রহ করে পিন নম্বর দিন।' };
    
    // Normalize Bengali digits
    const pin = toEnDigit(rawPin.trim()).toLowerCase();
    const config = await Storage.loadConfig();

    // 1. Check Super Admin (Web Admin - Fayzar Computer)
    let superPins = (config && Array.isArray(config.super_admin_pins)) ? [...config.super_admin_pins] : ['101919', 'fayzar', 'admin'];
    // Never allow Dreamland master PIN (1234) to match as Super Admin
    superPins = superPins.filter(p => String(p).trim().toLowerCase() !== '1234');

    if (typeof localStorage !== 'undefined') {
      const customPin = localStorage.getItem('fayzar_admin_pin');
      if (customPin && customPin.toLowerCase() !== '1234' && !superPins.includes(customPin.toLowerCase())) {
        superPins.unshift(customPin.toLowerCase());
      }
    }
    if (config && config.super_admin_pin && String(config.super_admin_pin).toLowerCase() !== '1234' && !superPins.includes(String(config.super_admin_pin).toLowerCase())) {
      superPins.unshift(String(config.super_admin_pin).toLowerCase());
    }

    if (superPins.includes(pin)) {
      const user = {
        role: 'super_admin',
        role_title: 'ওয়েব সুপার অ্যাডমিন (ফয়জার কম্পিউটার)',
        name: 'ফয়জার কম্পিউটার অ্যাডমিন',
        canBatchPrint: true,
        canPublish: true, // EXCLUSIVE: Only Super Admin can publish!
        canSwitchSchool: true,
        canManageUsers: true,
        school_id: null
      };
      Storage.setCurrentUser(user);
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('fayzar_admin_authenticated', 'true');
      if (typeof localStorage !== 'undefined') localStorage.setItem('fayzar_admin_authenticated', 'true');
      return { success: true, user };
    }

    // 2. Check School Master Admin (Each School isolated)
    const institutions = (config && Array.isArray(config.institutions) && config.institutions.length > 0)
      ? config.institutions
      : (config && config.institution ? [config.institution] : []);

    for (const inst of institutions) {
      if (inst.master_pin && String(inst.master_pin).trim().toLowerCase() === pin) {
        const user = {
          role: 'school_master',
          role_title: `${inst.name_bn} মাস্টার অ্যাডমিন`,
          name: `${inst.name_bn} প্রধান`,
          school_id: inst.id,
          school_name: inst.name_bn,
          canBatchPrint: true, // Batch Print enabled for School Master
          canPublish: false,   // Protected for Web Super Admin
          canSwitchSchool: false,
          canManageUsers: false
        };
        Storage.setCurrentUser(user);
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('fayzar_admin_authenticated', 'true');
        if (typeof localStorage !== 'undefined') localStorage.setItem('fayzar_admin_authenticated', 'true');
        return { success: true, user };
      }

        // 3. Check Subject Teachers within schools
        if (Array.isArray(inst.teachers)) {
          for (const teacher of inst.teachers) {
            if (teacher.pin && String(teacher.pin).trim() === pin) {
              const user = {
                role: 'teacher',
                role_title: `বিষয় শিক্ষক: ${teacher.name}`,
                name: teacher.name,
                teacher_id: teacher.id,
                school_id: inst.id,
                school_name: inst.name_bn,
                assigned_subjects: teacher.assigned_subjects || [],
                classes: teacher.classes || [],
                class_assignments: teacher.class_assignments || null,
                canBatchPrint: true, // Batch Print enabled
                canPublish: false,
                canSwitchSchool: false,
                canManageUsers: false
              };
              Storage.setCurrentUser(user);
              if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('fayzar_admin_authenticated', 'true');
              if (typeof localStorage !== 'undefined') localStorage.setItem('fayzar_admin_authenticated', 'true');
              return { success: true, user };
            }
          }
        }
      }

      return { success: false, error: 'ভুল পিন নম্বর! সঠিক অ্যাডমিন, স্কুল মাস্টার বা শিক্ষক পিন দিন।' };
    }

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

  function isJuniorSecondaryClass(classId) {
    if (!classId) return false;
    const cid = String(classId).toLowerCase();
    return cid.includes('class_6') || cid.includes('class_7') || cid.includes('class_8') ||
           cid.includes('class6') || cid.includes('class7') || cid.includes('class8') ||
           cid.includes('৬ষ্ঠ') || cid.includes('৭ম') || cid.includes('৮ম') ||
           cid.includes('class_6_daiya') || cid.includes('class_6_defodil') ||
           cid.includes('madrasah_class_6') || cid.includes('madrasah_class_7') || cid.includes('madrasah_class_8');
  }

  const ResultEngine = {
    DEFAULT_GRADING_SCALE,
    calculateGrade,
    getGpaGrade,
    toBnDigit,
    toEnDigit,
    formatGpa,
    calculateStudent,
    calculateClassPositions,
    getClassAnalytics,
    generateVerificationQrSvg,
    generateVerificationSignature,
    isSecondaryClass,
    isJuniorSecondaryClass,
    Firestore,
    Storage,
    authenticatePin
  };

  if (typeof window !== 'undefined') {
    window.ResultEngine = ResultEngine;
  }
  if (typeof global !== 'undefined') {
    global.ResultEngine = ResultEngine;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResultEngine;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
