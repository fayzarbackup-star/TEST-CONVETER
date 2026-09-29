/**
 * Fayzar Publishing Studio - Class & Exam Routine Engine
 * Formats institutional class routines, examination schedules, and period timetables.
 * 100% Offline Vanilla JS.
 */

(function(global) {
  'use strict';

  const RoutineEngine = {
    /**
     * Parses raw text into structured routine data.
     */
    parseRoutine(rawText) {
      if (!rawText) return null;
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

      const routine = {
        institute: '',
        title: 'ক্লাস রুটিন',
        session: '',
        classInfo: '',
        headers: ['বার / দিন', '১ম ঘণ্টা', '২য় ঘণ্টা', '৩য় ঘণ্টা', '৪র্থ ঘণ্টা'],
        rows: []
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!routine.institute && /স্কুল|কলেজ|মাদরাসা|বিদ্যালয়|একাডেমী|ইনস্টিটিউট/i.test(line) && line.length < 90) {
          routine.institute = line;
          continue;
        }

        if (/রুটিন|সময়সূচি|সময়সূচী|পরীক্ষার\s*রুটিন/i.test(line) && line.length < 70) {
          routine.title = line;
          continue;
        }

        if (/শিক্ষাবর্ষ|সেশন|তারিখ/i.test(line) && line.length < 50) {
          routine.session = line;
          continue;
        }

        if (/শ্রেণি|শাখা|বিভাগ/i.test(line) && line.length < 50) {
          routine.classInfo = line;
          continue;
        }

        // Header detection (e.g. বার | ১ম | ২য় ...)
        if (/বার|দিন|তারিখ/i.test(line) && (line.includes('|') || line.includes('\t'))) {
          const cells = line.split(/[|\t]+/).map(c => c.trim()).filter(Boolean);
          if (cells.length >= 2) {
            routine.headers = cells;
            continue;
          }
        }

        // Row detection (রবিবার: বাংলা | গণিত... or pipe/tab delimited)
        if (line.includes('|') || line.includes('\t') || /^(শনিবার|রবিবার|সোমবার|মঙ্গলবার|বুধবার|বৃহস্পতিবার|শুক্রবার)[ঃ:\s]/i.test(line)) {
          let day = '';
          let rest = line;

          const dayMatch = line.match(/^(শনিবার|রবিবার|সোমবার|মঙ্গলবার|বুধবার|বৃহস্পতিবার|শুক্রবার)[ঃ:\s]*(.*)/i);
          if (dayMatch) {
            day = dayMatch[1];
            rest = dayMatch[2];
          }

          let cells = rest.split(/[|\t]+/).map(c => c.trim()).filter(Boolean);
          if (day) {
            cells = [day, ...cells];
          }

          if (cells.length > 0) {
            routine.rows.push(cells);
          }
        }
      }

      // Default sample rows if parsed is empty
      if (routine.rows.length === 0) {
        routine.rows = [
          ['রবিবার', 'বাংলা', 'ইংরেজি', 'গণিত', 'বিজ্ঞান'],
          ['সোমবার', 'ইংরেজি', 'গণিত', 'বাংলা', 'সমাজ'],
          ['মঙ্গলবার', 'গণিত', 'বিজ্ঞান', 'ধর্ম', 'বাংলা'],
          ['বুধবার', 'সমাজ', 'ইংরেজি', 'গণিত', 'আইসিটি'],
          ['বৃহস্পতিবার', 'বিজ্ঞান', 'বাংলা', 'চিত্রাঙ্কন', 'শরীরচর্চা']
        ];
      }

      return routine;
    },

    /**
     * Renders routine into HTML table for Studio WYSIWYG preview.
     */
    renderToHtml(routine, options = {}) {
      if (!routine) return '<div class="text-center py-8 text-rose-500 font-bold">রুটিন ডাটা পাওয়া যায়নি</div>';

      const isBijoy = options.font === 'bijoy';
      const fontClass = isBijoy ? 'font-sutonny' : 'font-kalpurush';

      let html = `<div class="routine-document ${fontClass} text-center p-4">`;

      if (routine.institute) {
        html += `<h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">${this.esc(routine.institute)}</h1>`;
      }
      if (routine.title) {
        html += `<h2 class="text-lg font-bold text-slate-800 dark:text-slate-200 underline mb-2">${this.esc(routine.title)}</h2>`;
      }
      if (routine.session || routine.classInfo) {
        html += `<div class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-4">${this.esc([routine.classInfo, routine.session].filter(Boolean).join(' | '))}</div>`;
      }

      html += `<div class="overflow-x-auto my-4"><table class="w-full text-xs sm:text-sm border-collapse border border-slate-700 text-center">`;
      html += `<thead class="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"><tr>`;
      for (const h of routine.headers) {
        html += `<th class="border border-slate-600 p-2">${this.esc(h)}</th>`;
      }
      html += `</tr></thead><tbody>`;

      for (const row of routine.rows) {
        html += `<tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40">`;
        for (let c = 0; c < routine.headers.length; c++) {
          const val = row[c] || '-';
          const isDayCol = c === 0;
          html += `<td class="border border-slate-600 p-2 ${isDayCol ? 'font-bold bg-slate-100 dark:bg-slate-800/60' : ''}">${this.esc(val)}</td>`;
        }
        html += `</tr>`;
      }

      html += `</tbody></table></div>`;

      // Footer Signatures
      html += `<div class="mt-8 pt-6 flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-300 px-6">`;
      html += `<div>শ্রেণি শিক্ষকের স্বাক্ষর</div>`;
      html += `<div>রুটিন কমিটির স্বাক্ষর</div>`;
      html += `<div>প্রধান শিক্ষক / অধ্যক্ষ</div>`;
      html += `</div>`;

      html += `</div>`;
      return html;
    },

    esc(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RoutineEngine;
  if (typeof window !== 'undefined') window.RoutineEngine = RoutineEngine;
  if (typeof globalThis !== 'undefined') globalThis.RoutineEngine = RoutineEngine;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
