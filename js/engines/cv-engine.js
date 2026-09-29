/**
 * Fayzar Publishing Studio - Curriculum Vitae & Bio-data Engine
 * Formats professional Bengali CVs, Bio-data (জীবনবৃত্তান্ত), and Job Resumes.
 * 100% Offline Vanilla JS.
 */

(function(global) {
  'use strict';

  const CVEngine = {
    /**
     * Parses raw text into structured CV data.
     */
    parseCV(rawText) {
      if (!rawText) return null;
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

      const cv = {
        name: '',
        title: 'জীবনবৃত্তান্ত (CURRICULUM VITAE)',
        contact: {
          phone: '',
          email: '',
          address: ''
        },
        personalInfo: [],  // { label, value }
        education: [],     // { exam, board, year, gpa }
        experience: [],
        skills: [],
        declaration: 'আমি অঙ্গীকার করিতেছি যে, উপরে বর্ণিত সকল তথ্য সম্পূর্ণ সত্য ও সঠিক।'
      };

      let section = 'personal';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!cv.name && /^(?:নাম|নামঃ|নাম:)\s*(.+)/i.test(line)) {
          cv.name = line.replace(/^(?:নাম|নামঃ|নাম:)\s*/i, '').trim();
          continue;
        }

        if (/জীবনবৃত্তান্ত|বায়োডাটা|বায়োডাটা|CURRICULUM\s*VITAE|RESUME/i.test(line) && line.length < 50) {
          cv.title = line;
          continue;
        }

        // Section switches
        if (/শিক্ষাগত\s*যোগ্যতা|Education/i.test(line)) {
          section = 'education';
          continue;
        }
        if (/অভিজ্ঞতা|কর্ম\s*অভিজ্ঞতা|Experience/i.test(line)) {
          section = 'experience';
          continue;
        }
        if (/দক্ষতা|কম্পিউটার\s*দক্ষতা|ভাষাগত\s*দক্ষতা|Skills/i.test(line)) {
          section = 'skills';
          continue;
        }
        if (/অঙ্গীকার|ঘোষণা|Declaration/i.test(line)) {
          section = 'declaration';
          continue;
        }

        // Contact detection
        const phoneMatch = line.match(/(?:মোবাইল|ফোন|Phone|Cell)[ঃ:\s]*([\d\+০-৯\s\-]+)/i);
        if (phoneMatch) cv.contact.phone = phoneMatch[1].trim();

        const emailMatch = line.match(/(?:ইমেইল|ই-মেইল|Email)[ঃ:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (emailMatch) cv.contact.email = emailMatch[1].trim();

        if (section === 'education') {
          if (line.includes('|') || line.includes('\t') || /এস\.?এস\.?সি|এইচ\.?এস\.?সি|স্নাতক|মাস্টার্স|দাখিল|আলিম/i.test(line)) {
            const parts = line.split(/[|\t]+/).map(p => p.trim()).filter(Boolean);
            if (parts.length >= 3) {
              cv.education.push({
                exam: parts[0] || '',
                board: parts[1] || '',
                year: parts[2] || '',
                gpa: parts[3] || ''
              });
            } else {
              cv.education.push({ exam: line, board: '', year: '', gpa: '' });
            }
          }
        } else if (section === 'experience') {
          cv.experience.push(line);
        } else if (section === 'skills') {
          cv.skills.push(line);
        } else if (section === 'declaration') {
          cv.declaration = line;
        } else {
          // Personal info key-value
          const kvMatch = line.match(/^(.+?)[ঃ:]\s*(.+)/);
          if (kvMatch) {
            const key = kvMatch[1].trim();
            const val = kvMatch[2].trim();
            if (!cv.name && /নাম/i.test(key) && !/পিতা|মাতা/i.test(key)) {
              cv.name = val;
            } else {
              cv.personalInfo.push({ label: key, value: val });
            }
          } else if (!cv.name && i === 0 && line.length < 40) {
            cv.name = line;
          }
        }
      }

      return cv;
    },

    /**
     * Renders CV to HTML for Studio preview.
     */
    renderToHtml(cv, options = {}) {
      if (!cv) return '<div class="text-center py-8 text-rose-500 font-bold">সিভি ডাটা পাওয়া যায়নি</div>';

      const isBijoy = options.font === 'bijoy';
      const fontClass = isBijoy ? 'font-sutonny' : 'font-kalpurush';

      let html = `<div class="cv-document ${fontClass} text-left p-4 leading-relaxed text-sm">`;

      // Header
      html += `<div class="text-center border-b-2 border-slate-700 pb-3 mb-4">`;
      html += `<h1 class="text-2xl font-black text-slate-900 dark:text-slate-100">${this.esc(cv.name || 'নাম')}</h1>`;
      html += `<div class="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">${this.esc(cv.title)}</div>`;
      if (cv.contact.phone || cv.contact.email) {
        html += `<div class="text-xs text-slate-600 dark:text-slate-400 mt-1">${this.esc([cv.contact.phone ? 'মোবাইল: ' + cv.contact.phone : '', cv.contact.email ? 'ইমেইল: ' + cv.contact.email : ''].filter(Boolean).join(' | '))}</div>`;
      }
      html += `</div>`;

      // Personal Details
      if (cv.personalInfo.length > 0) {
        html += `<div class="mb-4">`;
        html += `<h3 class="font-bold text-sm border-b border-slate-400 pb-1 mb-2 text-slate-800 dark:text-slate-200">ব্যক্তিগত বিবরণী (Personal Details)</h3>`;
        html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">`;
        for (const item of cv.personalInfo) {
          html += `<div><span class="font-bold text-slate-700 dark:text-slate-300">${this.esc(item.label)}:</span> <span class="text-slate-900 dark:text-slate-100">${this.esc(item.value)}</span></div>`;
        }
        html += `</div></div>`;
      }

      // Education Table
      if (cv.education.length > 0) {
        html += `<div class="mb-4">`;
        html += `<h3 class="font-bold text-sm border-b border-slate-400 pb-1 mb-2 text-slate-800 dark:text-slate-200">শিক্ষাগত যোগ্যতা (Educational Qualifications)</h3>`;
        html += `<table class="w-full text-xs border-collapse border border-slate-600 text-center">`;
        html += `<thead class="bg-slate-200 dark:bg-slate-800 font-bold"><tr><th class="border border-slate-600 p-1">পরীক্ষার নাম</th><th class="border border-slate-600 p-1">বোর্ড / বিশ্ববিদ্যালয়</th><th class="border border-slate-600 p-1">পাসের সাল</th><th class="border border-slate-600 p-1">জিপিএ / বিভাগ</th></tr></thead><tbody>`;
        for (const ed of cv.education) {
          html += `<tr><td class="border border-slate-600 p-1 text-left pl-2">${this.esc(ed.exam)}</td><td class="border border-slate-600 p-1">${this.esc(ed.board || '-')}</td><td class="border border-slate-600 p-1">${this.esc(ed.year || '-')}</td><td class="border border-slate-600 p-1 font-semibold">${this.esc(ed.gpa || '-')}</td></tr>`;
        }
        html += `</tbody></table></div>`;
      }

      // Experience & Skills
      if (cv.experience.length > 0) {
        html += `<div class="mb-4"><h3 class="font-bold text-sm border-b border-slate-400 pb-1 mb-1">কর্ম অভিজ্ঞতা</h3><ul class="list-disc pl-5 text-xs space-y-1">`;
        for (const ex of cv.experience) html += `<li>${this.esc(ex)}</li>`;
        html += `</ul></div>`;
      }

      if (cv.skills.length > 0) {
        html += `<div class="mb-4"><h3 class="font-bold text-sm border-b border-slate-400 pb-1 mb-1">দক্ষতা ও প্রশিক্ষণ</h3><ul class="list-disc pl-5 text-xs space-y-1">`;
        for (const sk of cv.skills) html += `<li>${this.esc(sk)}</li>`;
        html += `</ul></div>`;
      }

      // Declaration & Signature
      html += `<div class="mt-8 pt-4 border-t border-slate-400 flex justify-between items-end text-xs">`;
      html += `<div class="max-w-[60%] text-[11px] text-slate-600 dark:text-slate-400">${this.esc(cv.declaration)}</div>`;
      html += `<div class="text-center font-bold border-t border-slate-700 pt-1 w-40">আবেদনকারীর স্বাক্ষর</div>`;
      html += `</div>`;

      html += `</div>`;
      return html;
    },

    esc(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CVEngine;
  if (typeof window !== 'undefined') window.CVEngine = CVEngine;
  if (typeof globalThis !== 'undefined') globalThis.CVEngine = CVEngine;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
