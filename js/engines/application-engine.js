/**
 * Fayzar Publishing Studio - Official Application & Certificate Engine
 * Formats official administrative applications, rectification tables, and testimonials.
 */

(function(global) {
  'use strict';

  const ApplicationEngine = {
    parseApplication(rawText) {
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      const app = {
        date: '',
        memoNo: '',
        receiver: [],
        subject: '',
        salutation: 'জনাব,',
        paragraphs: [],
        table: null,
        prayer: '',
        applicant: [],
        attachments: []
      };

      let state = 'header';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/^তারিখ[ঃ:]\s*(.+)/i.test(line)) {
          app.date = line.match(/^তারিখ[ঃ:]\s*(.+)/i)[1].trim();
          continue;
        }

        if (/^স্মারক\s*(নং)?\s*[ঃ:\-]?\s*(.+)/i.test(line)) {
          app.memoNo = line;
          continue;
        }

        if (/^বরাবর[,:\s]/i.test(line)) {
          state = 'receiver';
          const recPart = line.replace(/^বরাবর[,:\s]*/i, '').trim();
          if (recPart) app.receiver.push(recPart);
          continue;
        }

        if (/^বিষয়[ঃ:]\s*(.+)/i.test(line)) {
          app.subject = line.match(/^বিষয়[ঃ:]\s*(.+)/i)[1].trim();
          state = 'body';
          continue;
        }

        if (/^(জনাব|মহোদয়)[,:]?/i.test(line)) {
          app.salutation = line;
          state = 'body';
          continue;
        }

        if (/^অতএব[,:\s]/i.test(line)) {
          app.prayer = line;
          state = 'prayer';
          continue;
        }

        if (/^(নিবেদক|বিনীত নিবেদক|আবেদনকারী)[-:\s]?/i.test(line)) {
          state = 'applicant';
          const appPart = line.replace(/^(নিবেদক|বিনীত নিবেদক|আবেদনকারী)[-:\s]*/i, '').trim();
          if (appPart) app.applicant.push(appPart);
          continue;
        }

        if (/^সংযুক্তি[ঃ:]/i.test(line)) {
          state = 'attachments';
          continue;
        }

        // Check for table row (e.g. ভুল তথ্য vs সঠিক তথ্য)
        if (line.includes('\t') || (/ভুল/i.test(line) && /সঠিক/i.test(line))) {
          if (!app.table) app.table = [];
          app.table.push(line);
          continue;
        }

        // Section routing
        if (state === 'receiver') {
          app.receiver.push(line);
        } else if (state === 'applicant') {
          app.applicant.push(line);
        } else if (state === 'attachments') {
          app.attachments.push(line);
        } else if (state === 'prayer') {
          app.prayer += ' ' + line;
        } else {
          app.paragraphs.push(line);
        }
      }

      return app;
    },

    renderToHtml(app, options = {}) {
      const isBijoy = options.font === 'bijoy';
      const fontClass = isBijoy ? 'font-sutonny' : 'font-kalpurush';

      let html = `<div class="official-application ${fontClass} text-justify text-sm leading-relaxed p-2 sm:p-4">`;

      // Date / Memo
      html += `<div class="flex justify-between items-center mb-4 text-xs sm:text-sm font-semibold">`;
      html += `<div>${app.memoNo ? this.escape(app.memoNo) : ''}</div>`;
      html += `<div>${app.date ? 'তারিখ: ' + this.escape(app.date) : 'তারিখ: .......................'}</div>`;
      html += `</div>`;

      // Receiver
      html += `<div class="mb-4">`;
      html += `<div class="font-bold">বরাবর,</div>`;
      for (const rec of app.receiver) {
        html += `<div class="pl-4 font-medium">${this.escape(rec)}</div>`;
      }
      html += `</div>`;

      // Subject
      if (app.subject) {
        html += `<div class="my-4 font-bold text-sm sm:text-base border-b-2 border-slate-700 pb-1">`;
        html += `বিষয়: <span class="underline">${this.escape(app.subject)}</span>`;
        html += `</div>`;
      }

      // Salutation
      html += `<div class="font-bold mb-2">${this.escape(app.salutation || 'জনাব,')}</div>`;

      // Paragraphs
      for (const p of app.paragraphs) {
        html += `<p class="mb-3 leading-relaxed indent-8">${this.escape(p)}</p>`;
      }

      // Rectification / Comparison Table
      if (app.table && app.table.length > 0) {
        html += `<div class="my-4 overflow-x-auto">`;
        html += `<table class="w-full text-xs sm:text-sm border-collapse border border-slate-700 text-center">`;
        html += `<thead class="bg-slate-200"><tr><th class="border border-slate-700 p-2">মালিকানার ভুল তথ্য</th><th class="border border-slate-700 p-2">চাহিত সঠিক তথ্য</th></tr></thead>`;
        html += `<tbody>`;
        for (const row of app.table) {
          const cells = row.split(/\t+|\s{3,}/);
          if (cells.length >= 2) {
            html += `<tr><td class="border border-slate-700 p-2 text-rose-700 font-semibold">${this.escape(cells[0])}</td><td class="border border-slate-700 p-2 text-emerald-800 font-bold">${this.escape(cells[1])}</td></tr>`;
          }
        }
        html += `</tbody></table></div>`;
      }

      // Prayer
      if (app.prayer) {
        html += `<p class="my-4 leading-relaxed indent-8 font-medium">${this.escape(app.prayer)}</p>`;
      }

      // Bottom Grid (Attachments on left, Applicant on right)
      html += `<div class="mt-8 pt-4 flex flex-col sm:flex-row justify-between items-start gap-6 text-xs sm:text-sm">`;

      // Left: Attachments
      html += `<div class="w-full sm:w-1/2">`;
      if (app.attachments && app.attachments.length > 0) {
        html += `<div class="font-bold underline mb-1">সংযুক্তি:</div>`;
        html += `<ul class="list-none space-y-1 text-slate-700">`;
        for (const att of app.attachments) {
          html += `<li>${this.escape(att)}</li>`;
        }
        html += `</ul>`;
      }
      html += `</div>`;

      // Right: Applicant Block
      html += `<div class="w-full sm:w-1/2 text-right">`;
      html += `<div class="font-bold mb-1">বিনীত নিবেদক,</div>`;
      html += `<div class="pt-6">`;
      for (const ap of app.applicant) {
        html += `<div class="font-semibold">${this.escape(ap)}</div>`;
      }
      html += `</div>`;
      html += `</div>`;

      html += `</div>`; // end bottom grid

      html += `</div>`; // end official-application

      return html;
    },

    escape(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ApplicationEngine;
  if (typeof window !== 'undefined') window.ApplicationEngine = ApplicationEngine;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
