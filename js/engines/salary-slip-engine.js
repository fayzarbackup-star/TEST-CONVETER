/**
 * Fayzar Publishing Studio - Salary Slip / Pay Slip Generator Engine
 * Generates professional Bengali pay slips for schools, offices, NGOs.
 * Supports: Monthly, Quarterly, Annual formats.
 */

(function(global) {
  'use strict';

  const SalarySlipEngine = {

    /**
     * Parses raw text into structured salary data.
     * Expected format (flexible):
     *   প্রতিষ্ঠান: বিজ্ঞান রেসিডেন্সিয়াল মডেল স্কুল
     *   মাস: সেপ্টেম্বর ২০২৫
     *   নাম: মোঃ আবদুল করিম
     *   পদ: সহকারী শিক্ষক
     *   বিভাগ: বিজ্ঞান বিভাগ
     *   মূল বেতন: ১৬,০০০
     *   বাড়ি ভাড়া ভাতা: ৪,০০০
     *   চিকিৎসা ভাতা: ১,৫০০
     *   যাতায়াত ভাতা: ৮০০
     *   --- কর্তন ---
     *   ভবিষ্যৎ তহবিল: ১,৬০০
     *   আয়কর: ০
     *   বিবিধ কর্তন: ০
     */
    parseSalaryData(rawText) {
      if (!rawText) return null;
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

      const data = {
        institute: '',
        month: '',
        name: '',
        designation: '',
        department: '',
        employeeId: '',
        joinDate: '',
        earnings: [],   // { label, amount }
        deductions: [], // { label, amount }
        notes: ''
      };

      let mode = 'earnings'; // 'earnings' or 'deductions'

      const parseAmount = (str) => {
        // Remove commas, convert Bengali digits to ASCII via charCode arithmetic
        return str.replace(/,/g, '').replace(/[০-৯]/g, d => d.charCodeAt(0) - 0x09E6).trim();
      };

      for (const line of lines) {
        // Section divider
        if (/^---\s*কর্তন|^কর্তন সমূহ|^বিয়োগ/i.test(line)) { mode = 'deductions'; continue; }
        if (/^---\s*আয়|^আয় সমূহ|^মোট আয়/i.test(line)) { mode = 'earnings'; continue; }

        // Named fields
        const instMatch = line.match(/^প্রতিষ্ঠান[ঃ:]?\s*(.+)/i);
        if (instMatch) { data.institute = instMatch[1].trim(); continue; }

        const monthMatch = line.match(/^(?:মাস|সময়কাল)[ঃ:]?\s*(.+)/i);
        if (monthMatch) { data.month = monthMatch[1].trim(); continue; }

        const nameMatch = line.match(/^(?:নাম|কর্মীর নাম)[ঃ:]?\s*(.+)/i);
        if (nameMatch) { data.name = nameMatch[1].trim(); continue; }

        const desigMatch = line.match(/^(?:পদ|পদবি|পদবী)[ঃ:]?\s*(.+)/i);
        if (desigMatch) { data.designation = desigMatch[1].trim(); continue; }

        const deptMatch = line.match(/^(?:বিভাগ|শাখা|সেকশন)[ঃ:]?\s*(.+)/i);
        if (deptMatch) { data.department = deptMatch[1].trim(); continue; }

        const empIdMatch = line.match(/^(?:কর্মী নং|আইডি|ID)[ঃ:]?\s*(.+)/i);
        if (empIdMatch) { data.employeeId = empIdMatch[1].trim(); continue; }

        const joinMatch = line.match(/^(?:যোগদান|যোগদানের তারিখ)[ঃ:]?\s*(.+)/i);
        if (joinMatch) { data.joinDate = joinMatch[1].trim(); continue; }

        // Earnings / Deductions: "লেবেল: পরিমাণ"
        const amountMatch = line.match(/^(.+?)[ঃ:]\s*([\d,০-৯]+(?:\.\d+)?)\s*(?:টাকা)?$/);
        if (amountMatch) {
          const entry = { label: amountMatch[1].trim(), amount: parseAmount(amountMatch[2]) };
          if (mode === 'deductions') {
            data.deductions.push(entry);
          } else {
            data.earnings.push(entry);
          }
          continue;
        }

        // If no institute detected, first line is institute
        if (!data.institute && line.length < 80 && line.length > 3) {
          data.institute = line;
        }
      }

      // Defaults
      if (data.earnings.length === 0) {
        data.earnings = [
          { label: 'মূল বেতন', amount: '0' },
          { label: 'বাড়ি ভাড়া ভাতা', amount: '0' },
          { label: 'চিকিৎসা ভাতা', amount: '0' },
        ];
      }
      if (data.deductions.length === 0) {
        data.deductions = [
          { label: 'ভবিষ্যৎ তহবিল', amount: '0' },
          { label: 'আয়কর', amount: '0' },
        ];
      }

      // Totals
      data.totalEarnings = data.earnings.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      data.totalDeductions = data.deductions.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      data.netSalary = data.totalEarnings - data.totalDeductions;

      return data;
    },

    /**
     * Formats a number with Bengali comma-separated style.
     */
    formatMoney(num) {
      if (isNaN(num)) return '০';
      return num.toLocaleString('bn-BD');
    },

    /**
     * Renders salary slip HTML.
     */
    renderToHtml(data, options = {}) {
      if (!data) return '<div class="text-center py-10 text-red-500">বেতন স্লিপের তথ্য পাওয়া যায়নি।</div>';

      const fontClass = options.font === 'bijoy' ? 'font-sutonny' : 'font-kalpurush';
      const fs = options.fontSize || '11pt';

      const rows = Math.max(data.earnings.length, data.deductions.length);
      let tableRows = '';
      for (let i = 0; i < rows; i++) {
        const earn = data.earnings[i] || { label: '', amount: '' };
        const deduct = data.deductions[i] || { label: '', amount: '' };
        tableRows += `
        <tr>
          <td style="padding: 4px 6px; border: 1px solid #c0c0c0;">${this.esc(earn.label)}</td>
          <td style="padding: 4px 6px; border: 1px solid #c0c0c0; text-align: right; font-weight: bold;">${earn.amount ? earn.amount : ''}</td>
          <td style="padding: 4px 6px; border: 1px solid #c0c0c0;">${this.esc(deduct.label)}</td>
          <td style="padding: 4px 6px; border: 1px solid #c0c0c0; text-align: right; font-weight: bold; color: #b91c1c;">${deduct.amount ? deduct.amount : ''}</td>
        </tr>`;
      }

      return `
      <div class="paper-sheet size-a4-portrait ${options.marginClass || 'margin-standard'} ${fontClass}" style="font-size: ${fs};">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 3px double #1a1a2e; padding-bottom: 10px; margin-bottom: 12px;">
          <div style="font-size: 15pt; font-weight: 900; color: #1a1a2e;">${this.esc(data.institute) || 'প্রতিষ্ঠানের নাম'}</div>
          <div style="font-size: 12pt; font-weight: bold; color: #374151; margin-top: 4px;">বেতন স্লিপ / Pay Slip</div>
          <div style="font-size: 10pt; color: #6b7280; margin-top: 2px;">মাস: ${this.esc(data.month) || '—'}</div>
        </div>

        <!-- Employee Info Grid -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10pt;">
          <tr>
            <td style="padding: 3px 0; width: 22%; font-weight: bold;">কর্মীর নাম:</td>
            <td style="padding: 3px 8px; width: 38%; border-bottom: 1px solid #999;">${this.esc(data.name) || '—'}</td>
            <td style="padding: 3px 0; width: 18%; font-weight: bold;">পদবি:</td>
            <td style="padding: 3px 8px; border-bottom: 1px solid #999;">${this.esc(data.designation) || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; font-weight: bold;">বিভাগ:</td>
            <td style="padding: 3px 8px; border-bottom: 1px solid #999;">${this.esc(data.department) || '—'}</td>
            <td style="padding: 3px 0; font-weight: bold;">কর্মী নং:</td>
            <td style="padding: 3px 8px; border-bottom: 1px solid #999;">${this.esc(data.employeeId) || '—'}</td>
          </tr>
          ${data.joinDate ? `<tr><td style="padding: 3px 0; font-weight: bold;">যোগদান:</td><td style="padding: 3px 8px;" colspan="3">${this.esc(data.joinDate)}</td></tr>` : ''}
        </table>

        <!-- Earnings & Deductions Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 12px;">
          <thead>
            <tr style="background: #1a1a2e; color: #fff;">
              <th style="padding: 6px 8px; text-align: left; border: 1px solid #1a1a2e;" colspan="2">আয় (Earnings)</th>
              <th style="padding: 6px 8px; text-align: left; border: 1px solid #1a1a2e;" colspan="2">কর্তন (Deductions)</th>
            </tr>
            <tr style="background: #e8eaf6; font-weight: bold; font-size: 9pt;">
              <th style="padding: 4px 6px; border: 1px solid #c0c0c0; text-align: left;">বিবরণ</th>
              <th style="padding: 4px 6px; border: 1px solid #c0c0c0; text-align: right;">পরিমাণ (টাকা)</th>
              <th style="padding: 4px 6px; border: 1px solid #c0c0c0; text-align: left;">বিবরণ</th>
              <th style="padding: 4px 6px; border: 1px solid #c0c0c0; text-align: right;">পরিমাণ (টাকা)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: 900;">
              <td style="padding: 5px 6px; border: 1px solid #c0c0c0;">মোট আয়</td>
              <td style="padding: 5px 6px; border: 1px solid #c0c0c0; text-align: right; color: #166534;">${this.formatMoney(data.totalEarnings)}</td>
              <td style="padding: 5px 6px; border: 1px solid #c0c0c0;">মোট কর্তন</td>
              <td style="padding: 5px 6px; border: 1px solid #c0c0c0; text-align: right; color: #b91c1c;">${this.formatMoney(data.totalDeductions)}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Net Salary Highlight -->
        <div style="background: #1a1a2e; color: #fff; padding: 10px 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 12pt;">
          <span style="font-weight: bold;">নিট বেতন (Net Salary)</span>
          <span style="font-size: 15pt; font-weight: 900; color: #fbbf24;">${this.formatMoney(data.netSalary)} টাকা</span>
        </div>

        <!-- Signature Area -->
        <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 10pt;">
          <div style="text-align: center;">
            <div style="border-top: 1.5px solid #333; width: 110px; margin: 0 auto 4px;"></div>
            <div>কর্মীর স্বাক্ষর</div>
            <div style="color: #6b7280; font-size: 9pt;">তারিখ: …………………</div>
          </div>
          <div style="text-align: center;">
            <div style="border-top: 1.5px solid #333; width: 110px; margin: 0 auto 4px;"></div>
            <div>হিসাব বিভাগ</div>
            <div style="color: #6b7280; font-size: 9pt;">তারিখ: …………………</div>
          </div>
          <div style="text-align: center;">
            <div style="border-top: 1.5px solid #333; width: 110px; margin: 0 auto 4px;"></div>
            <div>প্রধান কর্মকর্তা / অধ্যক্ষ</div>
            <div style="color: #6b7280; font-size: 9pt;">তারিখ: …………………</div>
          </div>
        </div>

        <!-- Footer Note -->
        <div style="margin-top: 20px; text-align: center; font-size: 8.5pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px;">
          এটি কম্পিউটার মুদ্রিত — কোনো স্বাক্ষরের প্রয়োজন নেই | ফয়জার কম্পিউটার, ফুলবাড়ী, দিনাজপুর
        </div>
      </div>`;
    },

    esc(text) {
      if (!text) return '';
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SalarySlipEngine;
  } else {
    global.SalarySlipEngine = SalarySlipEngine;
  }

})(typeof window !== 'undefined' ? window : this);
