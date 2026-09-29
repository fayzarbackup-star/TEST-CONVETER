/**
 * Fayzar Publishing Studio - Stamp Deed & Agreement Engine
 * Formats 300 Taka Non-Judicial Stamp Deeds with 3.5" Page-1 Spacer and Legal Tables.
 */

(function(global) {
  'use strict';

  const StampEngine = {
    DEFAULT_STAMP_TOP_MARGIN_INCH: 3.5,

    parseDeed(rawText) {
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      const deed = {
        title: 'অঙ্গীকারনামা দলিল',
        firstParty: '',
        secondParty: '',
        preamble: '',
        clauses: [],
        schedule: {
          district: '',
          thana: '',
          mouza: '',
          jlNo: '',
          rows: []
        },
        closing: '',
        witnesses: []
      };

      let currentSection = 'header';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/অঙ্গীকার\s*নামা|চুক্তিপত্র|বায়নানামা|ভাড়া\s*চুক্তি/i.test(line) && line.length < 40) {
          deed.title = line;
          continue;
        }

        if (/বরাবর[ঃ:]/i.test(line)) {
          deed.firstParty = line.replace(/বরাবর[ঃ:]/i, '').trim();
          continue;
        }

        if (/লিখিতং[ঃ:]/i.test(line)) {
          deed.secondParty = line.replace(/লিখিতং[ঃ:]/i, '').trim();
          continue;
        }

        if (/পরম\s*করু/i.test(line)) {
          deed.preamble = line;
          currentSection = 'clauses';
          continue;
        }

        if (/তফসিল|তফশিল/i.test(line)) {
          currentSection = 'schedule';
          continue;
        }

        if (/এতদ্বার্থে\s*স্বেচ্ছায়|অত্র\s*দলিল\s*পড়িয়া/i.test(line)) {
          deed.closing = line;
          currentSection = 'witness';
          continue;
        }

        if (/(?:স্বাক্ষী|সাক্ষী)(?:গণের|র)?\s*(?:নাম)?/i.test(line)) {
          currentSection = 'witness';
          continue;
        }

        // Process based on active section
        if (currentSection === 'schedule') {
          if (/জেলা|মৌজা|উপজেলা/.test(line)) {
            const dM = line.match(/জেলা[ঃ:]\s*([^\s,]+)/);
            const uM = line.match(/উপজেলা[ঃ:]\s*([^\s,]+)/);
            const mM = line.match(/মৌজা[ঃ:]\s*([^\s,]+)/);
            const jM = line.match(/জে\.?এল\.?নং[ঃ:\s]*([^\s,]+)/);
            if (dM) deed.schedule.district = dM[1];
            if (uM) deed.schedule.thana = uM[1];
            if (mM) deed.schedule.mouza = mM[1];
            if (jM) deed.schedule.jlNo = jM[1];
          } else if (line.includes('\t') || /খতিয়ান|দাগ|শতক|একর/.test(line)) {
            deed.schedule.rows.push(line);
          }
        } else if (currentSection === 'witness') {
          if (line.match(/^[\(০-৯\d\)\.\-\।]/) || /নাম[ঃ:]/i.test(line) || (deed.witnesses.length > 0 && !line.includes('পক্ষ'))) {
            deed.witnesses.push(line);
          }
        } else if (currentSection === 'clauses') {
          deed.clauses.push(line);
        } else {
          // Pre-preamble lines
          if (!deed.firstParty && line.includes('১ম পক্ষ')) deed.firstParty = line;
          else if (!deed.secondParty && line.includes('২য় পক্ষ')) deed.secondParty = line;
          else if (!deed.preamble) deed.preamble = line;
        }
      }

      return deed;
    },

    renderToHtml(deed, options = {}) {
      const topMarginInch = options.topMargin || this.DEFAULT_STAMP_TOP_MARGIN_INCH;
      const isBijoy = options.font === 'bijoy';
      const fontClass = isBijoy ? 'font-sutonny' : 'font-kalpurush';

      let html = `<div class="stamp-document ${fontClass} text-justify leading-relaxed text-sm">`;

      // Page 1 Stamp Reserved Area
      html += `<div class="stamp-header-spacer border-b-2 border-dashed border-rose-400/60 bg-amber-50/40 p-4 mb-4 text-center text-xs text-rose-600 font-bold" style="min-height: ${topMarginInch * 96}px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center;">`;
      html += `<span><i class="fas fa-stamp mr-1"></i> [৩০০ টাকার সরকারি নন-জুডিশিয়াল স্ট্যাম্প ও সিলের জন্য সংরক্ষিত ৩.৫ ইঞ্চি ফাঁকা স্থান]</span>`;
      html += `<span class="text-[10px] text-slate-500">(প্রিন্ট করার সময় এই অংশটি স্বয়ংক্রিয়ভাবে ফাঁকা থাকবে)</span>`;
      html += `</div>`;

      // Deed Title
      html += `<h2 class="text-center font-black text-lg sm:text-xl underline mb-4">${this.escape(deed.title || 'অঙ্গীকারনামা দলিল')}</h2>`;

      // Parties
      if (deed.firstParty) {
        html += `<div class="mb-3 text-justify">`;
        html += `<strong class="font-bold text-slate-900">বরাবর:</strong> ${this.escape(deed.firstParty)}`;
        html += `</div>`;
      }

      if (deed.secondParty) {
        html += `<div class="mb-4 text-justify">`;
        html += `<strong class="font-bold text-slate-900">লিখিতং:</strong> ${this.escape(deed.secondParty)}`;
        html += `</div>`;
      }

      // Preamble
      if (deed.preamble) {
        html += `<p class="mb-3 font-semibold indent-8 leading-relaxed">${this.escape(deed.preamble)}</p>`;
      }

      // Clauses
      if (deed.clauses && deed.clauses.length > 0) {
        html += `<div class="space-y-2 mb-4">`;
        deed.clauses.forEach((cl, idx) => {
          html += `<p class="leading-relaxed indent-4">${this.escape(cl)}</p>`;
        });
        html += `</div>`;
      }

      // Schedule Table
      if (deed.schedule && (deed.schedule.mouza || deed.schedule.rows.length > 0)) {
        html += `<div class="my-4 border border-slate-700 p-2 rounded bg-slate-50/50">`;
        html += `<div class="text-center font-bold underline mb-1">তফসিল বিবরণ</div>`;
        if (deed.schedule.district || deed.schedule.mouza) {
          html += `<div class="text-xs text-center mb-2 font-medium">জেলা: ${this.escape(deed.schedule.district || 'দিনাজপুর')}, উপজেলা: ${this.escape(deed.schedule.thana || 'ফুলবাড়ী')}, মৌজা: ${this.escape(deed.schedule.mouza || '')}, জে.এল.নং: ${this.escape(deed.schedule.jlNo || '')}</div>`;
        }

        if (deed.schedule.rows.length > 0) {
          html += `<table class="w-full text-xs border-collapse border border-slate-600 text-center">`;
          html += `<thead class="bg-slate-200"><tr><th class="border border-slate-600 p-1">খতিয়ান নং</th><th class="border border-slate-600 p-1">দাগ নং</th><th class="border border-slate-600 p-1">রকম</th><th class="border border-slate-600 p-1">জমির পরিমাণ</th></tr></thead>`;
          html += `<tbody>`;
          for (const row of deed.schedule.rows) {
            const cells = row.split(/\t+|\s{2,}/);
            html += `<tr>`;
            for (let c = 0; c < 4; c++) {
              html += `<td class="border border-slate-600 p-1">${this.escape(cells[c] || '-')}</td>`;
            }
            html += `</tr>`;
          }
          html += `</tbody></table>`;
        }
        html += `</div>`;
      }

      // Closing
      if (deed.closing) {
        html += `<p class="my-4 leading-relaxed">${this.escape(deed.closing)}</p>`;
      }

      // Witness & Signatures Block
      html += `<div class="mt-8 pt-4 border-t border-slate-400 grid grid-cols-2 gap-6 text-xs">`;
      html += `<div>`;
      html += `<div class="font-bold mb-2 underline">স্বাক্ষীগণের নাম ও ঠিকানা:</div>`;
      html += `<div class="space-y-3 text-slate-700">`;
      html += `<div>(০১) নাম: .....................................................<br>পিতা: .....................................................<br>গ্রাম: .....................................................</div>`;
      html += `<div>(০২) নাম: .....................................................<br>পিতা: .....................................................<br>গ্রাম: .....................................................</div>`;
      html += `</div>`;
      html += `</div>`;

      html += `<div class="flex flex-col justify-between items-end text-right pr-4">`;
      html += `<div></div>`;
      html += `<div class="pt-8 border-t border-slate-600 w-48 text-center font-bold">`;
      html += `সম্পাদনকারীর স্বাক্ষর / টিপসহি`;
      html += `</div>`;
      html += `</div>`;
      html += `</div>`;

      html += `</div>`; // end stamp-document

      return html;
    },

    escape(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = StampEngine;
  if (typeof window !== 'undefined') window.StampEngine = StampEngine;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
