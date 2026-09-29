/**
 * Fayzar Publishing Studio - Admit Card Generator Engine
 * Generates print-ready Admit Cards: 2×2 grid on A4 Portrait.
 * Supports standard Bangladesh Board / School examination admit card format.
 */

(function(global) {
  'use strict';

  const AdmitCardEngine = {

    /**
     * Parses raw text into structured admit card data.
     * Expected format:
     *   প্রতিষ্ঠানের নাম
     *   পরীক্ষার নাম
     *   বিষয়: গণিত
     *   শ্রেণি: দশম
     *   তারিখ: ১৫ সেপ্টেম্বর ২০২৫
     *   সময়: সকাল ১০টা — দুপুর ১টা
     *   পূর্ণমান: ১০০ | পাসমান: ৩৩
     *   [পরীক্ষার্থীর তালিকা — একটি লাইনে একজন]
     *   রোল: ১০১ | নাম: মোহাম্মদ রাফি | শ্রেণি: ১০ | শাখা: বিজ্ঞান
     */
    parseAdmitData(rawText) {
      if (!rawText) return null;
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

      const data = {
        institute: '',
        examName: '',
        subject: '',
        classAndSection: '',
        date: '',
        time: '',
        fullMarks: '',
        passMarks: '',
        students: []
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!data.institute && /স্কুল|কলেজ|মাদরাসা|বিদ্যালয়|একাডেমী|প্রতিষ্ঠান/i.test(line) && line.length < 80) {
          data.institute = line; continue;
        }
        if (!data.examName && /পরীক্ষা|মূল্যায়ন|টার্ম|নির্বাচনী|বার্ষিক|অর্ধ-বার্ষিক/i.test(line) && line.length < 60) {
          data.examName = line; continue;
        }
        const subMatch = line.match(/^বিষয়[ঃ:]\s*(.+)/i);
        if (subMatch) { data.subject = subMatch[1].trim(); continue; }

        const classMatch = line.match(/^শ্রেণ[িী][ঃ:]\s*(.+)/i);
        if (classMatch) { data.classAndSection = classMatch[1].trim(); continue; }

        const dateMatch = line.match(/^তারিখ[ঃ:]\s*(.+)/i);
        if (dateMatch) { data.date = dateMatch[1].trim(); continue; }

        const timeMatch = line.match(/^সময়[ঃ:]\s*(.+)/i);
        if (timeMatch) { data.time = timeMatch[1].trim(); continue; }

        const marksMatch = line.match(/^পূর্ণমান[ঃ:]\s*([\d০-৯]+)/i);
        if (marksMatch) {
          data.fullMarks = marksMatch[1].trim();
          const passMatch = line.match(/পাসমান[ঃ:]\s*([\d০-৯]+)/i);
          if (passMatch) data.passMarks = passMatch[1].trim();
          continue;
        }

        // Student entries: রোল: ১০১ | নাম: রাফি | শ্রেণি: ১০ | শাখা: বিজ্ঞান
        const rollMatch = line.match(/রোল[ঃ:]?\s*([\d০-৯]+)/i);
        if (rollMatch) {
          const student = { roll: rollMatch[1] };
          const nameMatch = line.match(/নাম[ঃ:]?\s*([^|]+)/i);
          if (nameMatch) student.name = nameMatch[1].trim();
          const secMatch = line.match(/শাখা[ঃ:]?\s*([^|]+)/i);
          if (secMatch) student.section = secMatch[1].trim();
          const regMatch = line.match(/রেজিষ্ট্রেশন[ঃ:]?\s*([^|]+)/i);
          if (regMatch) student.reg = regMatch[1].trim();
          data.students.push(student);
        }
      }

      // If no students parsed, create 4 blank placeholders
      if (data.students.length === 0) {
        for (let i = 1; i <= 4; i++) {
          data.students.push({ roll: '...', name: '...', section: '...' });
        }
      }

      return data;
    },

    /**
     * Renders a single admit card HTML block.
     */
    renderSingleCard(data, student, options = {}) {
      const fontClass = options.font === 'bijoy' ? 'font-sutonny' : 'font-kalpurush';
      return `
      <div class="${fontClass}" style="
        border: 2px solid #1a1a2e;
        border-radius: 6px;
        padding: 10px 12px;
        width: 48%;
        display: inline-block;
        vertical-align: top;
        box-sizing: border-box;
        font-size: 10pt;
        color: #0f172a;
        page-break-inside: avoid;
        background: #fff;
        margin: 4px;
        min-height: 130mm;
        position: relative;
      ">
        <!-- Top bar -->
        <div style="background: #1a1a2e; color: #fff; text-align: center; padding: 5px; margin: -10px -12px 8px -12px; border-radius: 4px 4px 0 0;">
          <div style="font-weight: 900; font-size: 11pt; letter-spacing: 0.5px;">${this.esc(data.institute) || 'প্রতিষ্ঠানের নাম'}</div>
          <div style="font-size: 9pt; font-weight: bold; opacity: 0.9;">প্রবেশপত্র (ADMIT CARD)</div>
        </div>

        <!-- Exam Info -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 9.5pt;">
          <tr>
            <td style="font-weight: bold; width: 38%; padding: 2px 0;">পরীক্ষা:</td>
            <td style="padding: 2px 0;">${this.esc(data.examName) || '—'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">বিষয়:</td>
            <td>${this.esc(data.subject) || '—'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">শ্রেণি:</td>
            <td>${this.esc(data.classAndSection) || '—'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">তারিখ:</td>
            <td>${this.esc(data.date) || '—'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">সময়:</td>
            <td>${this.esc(data.time) || '—'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">পূর্ণমান:</td>
            <td>${this.esc(data.fullMarks) || '—'}${data.passMarks ? ' | পাসমান: ' + this.esc(data.passMarks) : ''}</td>
          </tr>
        </table>

        <hr style="border: none; border-top: 1.5px dashed #999; margin: 6px 0;">

        <!-- Student Info -->
        <div style="display: flex; gap: 8px; align-items: flex-start;">
          <div style="flex: 1;">
            <table style="width: 100%; font-size: 9.5pt; border-collapse: collapse;">
              <tr>
                <td style="font-weight: bold; width: 38%; padding: 2.5px 0;">রোল নং:</td>
                <td style="font-weight: 900; font-size: 11pt; color: #1a1a2e;">${this.esc(student.roll) || '...'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 2.5px 0;">নাম:</td>
                <td>${this.esc(student.name) || '.........................................'}</td>
              </tr>
              ${student.reg ? `<tr><td style="font-weight: bold;">রেজি. নং:</td><td>${this.esc(student.reg)}</td></tr>` : ''}
              <tr>
                <td style="font-weight: bold; padding: 2.5px 0;">শাখা:</td>
                <td>${this.esc(student.section) || '—'}</td>
              </tr>
            </table>
          </div>
          <!-- Photo Box -->
          <div style="width: 28mm; height: 33mm; border: 1.5px solid #666; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #999; text-align: center; flex-shrink: 0;">
            ছবি<br>(Photo)
          </div>
        </div>

        <!-- Signature area -->
        <div style="margin-top: auto; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8.5pt; border-top: 1px solid #ddd; margin-top: 10px;">
          <div style="text-align: center;">
            <div style="border-top: 1px solid #333; width: 70px; margin: 0 auto;"></div>
            <div>পরীক্ষার্থীর স্বাক্ষর</div>
          </div>
          <div style="text-align: center;">
            <div style="border-top: 1px solid #333; width: 70px; margin: 0 auto;"></div>
            <div>প্রধান শিক্ষকের স্বাক্ষর</div>
          </div>
        </div>
      </div>`;
    },

    /**
     * Renders all admit cards in a 2×2 grid layout (A4 Portrait).
     */
    renderToHtml(data, options = {}) {
      if (!data) return '<div class="text-center py-10 text-red-500">প্রবেশপত্রের তথ্য পাওয়া যায়নি।</div>';

      const students = data.students.length > 0 ? data.students : [
        { roll: '...', name: '...', section: '...' },
        { roll: '...', name: '...', section: '...' },
        { roll: '...', name: '...', section: '...' },
        { roll: '...', name: '...', section: '...' }
      ];

      // Group into pages of 4 cards (2×2)
      const pages = [];
      for (let i = 0; i < students.length; i += 4) {
        pages.push(students.slice(i, i + 4));
      }

      let html = '';
      pages.forEach((pageStudents, pi) => {
        html += `<div class="paper-sheet size-a4-portrait ${options.marginClass || 'margin-standard'}" style="font-family: inherit;">`;
        html += '<div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between;">';
        pageStudents.forEach(student => {
          html += this.renderSingleCard(data, student, options);
        });
        // Fill empty slots with blank cards if less than 4
        for (let e = pageStudents.length; e < 4; e++) {
          html += this.renderSingleCard(data, { roll: '...', name: '...', section: '...' }, options);
        }
        html += '</div>';
        html += '</div>';
      });

      return html;
    },

    esc(text) {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdmitCardEngine;
  } else {
    global.AdmitCardEngine = AdmitCardEngine;
  }

})(typeof window !== 'undefined' ? window : this);
