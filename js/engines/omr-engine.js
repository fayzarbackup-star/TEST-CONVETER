/**
 * Fayzar Publishing Studio - OMR & Answer Key Generator
 * Generates print-ready A4 OMR Sheets and Teacher's Answer Keys from MCQ questions.
 */

(function(global) {
  'use strict';

  const OmrEngine = {
    generateOmrSheetHtml(title = 'বিজ্ঞান রেসিডেন্সিয়াল মডেল স্কুল', totalQuestions = 30, options = {}) {
      const isBijoy = options.font === 'bijoy';
      const fontClass = isBijoy ? 'font-sutonny' : 'font-kalpurush';
      const questionsCount = Math.min(Math.max(totalQuestions, 20), 50);

      let html = `<div class="omr-sheet ${fontClass} p-4 bg-white text-black max-w-2xl mx-auto border-2 border-black">`;

      // Header
      html += `<div class="text-center border-b-2 border-black pb-2 mb-3">`;
      html += `<h2 class="text-lg sm:text-xl font-black">${this.escape(title)}</h2>`;
      html += `<div class="text-xs sm:text-sm font-bold mt-0.5">নৈর্ব্যক্তিক অভীক্ষার উত্তরপত্র (OMR SHEET)</div>`;
      html += `<div class="text-[11px] text-slate-700 mt-1 italic">নির্দেশিকা: বল পয়েন্ট কলম দ্বারা বৃত্তটি সম্পূর্ণ ভরাট করুন। কোনো অবস্থাতেই কাটাকাটি করা যাবে না।</div>`;
      html += `</div>`;

      // Student Meta & Roll/Reg Bubble Grids
      html += `<div class="grid grid-cols-2 gap-4 border border-black p-2 mb-3 text-xs">`;

      // Left: Student Info
      html += `<div class="space-y-2">`;
      html += `<div><strong>পরীক্ষার্থীর নাম:</strong> .................................................</div>`;
      html += `<div><strong>শ্রেণি:</strong> ..................... <strong>শাখা:</strong> .....................</div>`;
      html += `<div><strong>বিষয়:</strong> .....................................................</div>`;
      html += `<div><strong>তারিখ:</strong> ..................... <strong>সেট কোড:</strong> <span class="border border-black px-2 py-0.5 font-bold">ক</span></div>`;
      html += `</div>`;

      // Right: Roll Number Bubbles
      html += `<div class="border-l border-black pl-3">`;
      html += `<div class="font-bold text-center mb-1">রোল নম্বর</div>`;
      html += `<div class="flex justify-center gap-1.5 text-[10px]">`;
      for (let col = 0; col < 4; col++) {
        html += `<div class="flex flex-col items-center">`;
        html += `<div class="border border-black w-4 h-4 mb-1 text-center font-bold"></div>`;
        for (let d = 0; d <= 9; d++) {
          html += `<div class="w-3.5 h-3.5 rounded-full border border-black text-center leading-none text-[9px] mb-0.5 flex items-center justify-center">${d}</div>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
      html += `</div>`;

      html += `</div>`; // end meta grid

      // Questions Bubble Grid (2 Columns: 1-15, 16-30 or 1-25, 26-50)
      const half = Math.ceil(questionsCount / 2);
      html += `<div class="grid grid-cols-2 gap-6 border-t-2 border-black pt-3">`;

      // Col 1
      html += `<div class="space-y-1 text-xs">`;
      for (let i = 1; i <= half; i++) {
        html += this.renderOmrRow(i);
      }
      html += `</div>`;

      // Col 2
      html += `<div class="space-y-1 text-xs border-l border-slate-300 pl-4">`;
      for (let i = half + 1; i <= questionsCount; i++) {
        html += this.renderOmrRow(i);
      }
      html += `</div>`;

      html += `</div>`; // end questions grid

      // Footer
      html += `<div class="mt-4 pt-4 border-t border-black flex justify-between text-[11px] font-bold">`;
      html += `<div>কক্ষ প্রত্যবেক্ষকের স্বাক্ষর: .................................</div>`;
      html += `<div>মোট সঠিক উত্তর: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</div>`;
      html += `</div>`;

      html += `</div>`; // end omr-sheet

      return html;
    },

    renderOmrRow(qNum) {
      const bnNum = this.toBengaliNumber(qNum);
      const options = ['ক', 'খ', 'গ', 'ঘ'];
      let row = `<div class="flex items-center justify-between py-0.5 border-b border-slate-200">`;
      row += `<div class="w-7 font-bold text-right pr-2">${bnNum}।</div>`;
      row += `<div class="flex items-center gap-2">`;
      for (const opt of options) {
        row += `<div class="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[10px] font-bold text-slate-800">${opt}</div>`;
      }
      row += `</div>`;
      row += `</div>`;
      return row;
    },

    generateAnswerKeyHtml(title = 'উত্তরমালা', answers = []) {
      let html = `<div class="answer-key-sheet p-4 bg-white text-black max-w-xl mx-auto border border-black text-sm">`;
      html += `<div class="text-center border-b pb-2 mb-3">`;
      html += `<h3 class="font-bold text-base">${this.escape(title)}</h3>`;
      html += `<div class="text-xs text-slate-600">শিক্ষক ও মূল্যায়নের জন্য প্রস্তুতকৃত সঠিক উত্তরমালা</div>`;
      html += `</div>`;

      html += `<div class="grid grid-cols-5 gap-2 text-xs text-center">`;
      for (let i = 0; i < answers.length; i++) {
        const item = answers[i];
        html += `<div class="p-1 border border-slate-300 rounded bg-slate-50">`;
        html += `<span class="font-bold">${this.toBengaliNumber(i + 1)}:</span> <span class="text-emerald-700 font-black">${this.escape(item.answer || 'ক')}</span>`;
        html += `</div>`;
      }
      html += `</div>`;
      html += `</div>`;

      return html;
    },

    toBengaliNumber(n) {
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(n).replace(/\d/g, d => bnDigits[parseInt(d, 10)]);
    },

    escape(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = OmrEngine;
  if (typeof window !== 'undefined') window.OmrEngine = OmrEngine;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
