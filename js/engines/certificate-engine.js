/**
 * Fayzar Publishing Studio - Official Certificate & Testimonial Engine
 * Specializes in institutional letterhead pads, character certificates,
 * experience certificates, and testimonials (প্রত্যয়নপত্র, প্রশংসাপত্র, অভিজ্ঞতার সনদপত্র).
 */

(function(global) {
  'use strict';

  const CertificateEngine = {
    /**
     * Parses raw certificate/testimonial text into structured institutional data.
     */
    parseCertificate(rawText) {
      if (!rawText) return null;
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

      const cert = {
        institute: '',
        location: '',
        details: '',
        memoNo: '',
        date: '',
        title: '',
        paragraphs: [],
        signatory: []
      };

      let state = 'header';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. Date & Memo detection
        if (/^তারিখ[ঃ:\-]?\s*(.+)/i.test(line)) {
          cert.date = line.match(/^তারিখ[ঃ:\-]?\s*(.+)/i)[1].trim();
          continue;
        }
        const memoMatch = line.match(/^স্মারক\s*(?:নং)?\s*[ঃ:\-]?\s*(.+)/i);
        if (memoMatch) {
          cert.memoNo = memoMatch[1].trim();
          continue;
        }

        // 2. Title detection (প্রত্যয়নপত্র, অভিজ্ঞতার সনদপত্র, প্রশংসাপত্র, চারিত্রিক সনদপত্র, ইত্যাদি)
        if (/^(?:অভিজ্ঞতার\s*সনদপত্র|প্রত্যয়ন\s*পত্র|প্রত্যয়নপত্র|প্রশংসাপত্র|চারিত্রিক\s*সনদপত্র|নাগরিক\s*সনদপত্র|ওয়ারিশ\s*সনদপত্র|সনদপত্র|CERTIFICATE|TESTIMONIAL)$/i.test(line) ||
            (/(?:সনদপত্র|প্রত্যয়নপত্র|প্রশংসাপত্র)/.test(line) && line.length < 35 && !line.includes('এই মর্মে') && !line.includes('করা যাচ্ছে'))) {
          cert.title = line;
          state = 'body';
          continue;
        }

        // 3. Signatory detection at the end of document
        if (/^\(?\s*(?:মোঃ|মোছাঃ|শ্রী|ড\.|প্রফেসর|অধ্যক্ষ|প্রধান\s*শিক্ষক|সভাপতি|সম্পাদক|ইমাম)/i.test(line) && state === 'body' && cert.paragraphs.length > 0) {
          state = 'signatory';
          cert.signatory.push(line);
          continue;
        }

        if (state === 'signatory') {
          cert.signatory.push(line);
          continue;
        }

        // 4. Header block parsing (Institute, Location, Est/Details)
        if (state === 'header') {
          if (!cert.institute) {
            cert.institute = line;
          } else if (!cert.location && /গ্রাম|ডাকঘর|উপজেলা|জেলা|সড়ক|রোড|ফুলবাড়ী|দিনাজপুর|ঢাকা/i.test(line)) {
            cert.location = line;
          } else if (!cert.details && /স্থাপিত|রেজি|ইআইআইএন|মোবাইল|ফোন|কোড/i.test(line)) {
            cert.details = line;
          } else if (!cert.location) {
            cert.location = line;
          } else {
            // If another line before title/body, treat as details or title
            if (/সনদ|প্রত্যয়ন|প্রশংসা/i.test(line)) {
              cert.title = line;
              state = 'body';
            } else {
              cert.details += (cert.details ? ', ' : '') + line;
            }
          }
          continue;
        }

        // 5. Body paragraphs
        if (state === 'body') {
          cert.paragraphs.push(line);
        }
      }

      // Default title fallback if missing
      if (!cert.title) {
        cert.title = 'প্রত্যয়নপত্র';
      }

      return cert;
    },

    /**
     * Renders Certificate as an authentic Institutional Letterhead Pad HTML document.
     */
    renderToHtml(cert, options = {}) {
      if (!cert) return '';
      const isBijoy = options.font === 'bijoy';
      const fontClass = isBijoy ? 'font-sutonny' : 'font-kalpurush';

      let html = `<div class="certificate-document ${fontClass} p-8 sm:p-12 mx-auto" style="max-width: 800px; min-height: 980px; display: flex; flex-direction: column; justify-content: space-between;">`;

      // Top Content Wrapper
      html += `<div>`;

      // 1. INSTITUTIONAL LETTERHEAD PAD (প্রতিষ্ঠানের প্যাড)
      html += `<div class="cert-pad text-center pb-3 border-b-2 border-slate-900 mb-4" style="border-bottom: 3px double #0f172a;">`;
      if (cert.institute) {
        html += `<h1 class="cert-institute font-black text-2xl sm:text-3xl text-slate-900 tracking-wide" style="font-size: 24pt; line-height: 1.2; margin: 0;">${this.escape(cert.institute)}</h1>`;
      }
      if (cert.location) {
        html += `<div class="cert-location font-semibold text-sm sm:text-base text-slate-700 mt-1" style="font-size: 13pt; line-height: 1.3;">${this.escape(cert.location)}</div>`;
      }
      if (cert.details) {
        html += `<div class="cert-details font-medium text-xs sm:text-sm text-slate-600 mt-0.5" style="font-size: 11pt;">${this.escape(cert.details)}</div>`;
      }
      html += `</div>`;

      // 2. MEMO & DATE ROW
      html += `<div class="cert-meta flex justify-between items-center text-xs sm:text-sm font-semibold text-slate-800 mb-8" style="font-size: 12pt;">`;
      html += `<div>${cert.memoNo ? 'স্মারক নং: ' + this.escape(cert.memoNo) : 'স্মারক নং: ........................................'}</div>`;
      html += `<div>${cert.date ? 'তারিখ: ' + this.escape(cert.date) : 'তারিখ: ........................................'}</div>`;
      html += `</div>`;

      // 3. CERTIFICATE TITLE (বক্স বা ফ্রেম সহ সনদপত্রের নাম)
      html += `<div class="cert-title-container text-center my-6">`;
      html += `<span class="cert-title inline-block px-8 py-1.5 font-bold text-lg sm:text-xl border-2 border-slate-800 rounded shadow-sm bg-slate-50" style="font-size: 17pt; letter-spacing: 0.5px;">${this.escape(cert.title)}</span>`;
      html += `</div>`;

      // 4. BODY PARAGRAPHS (মূল বক্তব্য)
      html += `<div class="cert-body text-justify leading-loose my-6" style="font-size: 14pt; line-height: 2.1; color: #0f172a;">`;
      for (const p of cert.paragraphs) {
        html += `<p class="mb-4" style="text-indent: 2.5rem; margin-bottom: 1.25rem;">${this.escape(p)}</p>`;
      }
      html += `</div>`;

      html += `</div>`; // End top wrapper

      // 5. SIGNATORY BLOCK (সিল ও স্বাক্ষর)
      html += `<div class="cert-footer flex justify-end mt-12 pt-6">`;
      html += `<div class="cert-signatory text-center" style="min-width: 260px; font-size: 12pt; line-height: 1.4;">`;
      html += `<div class="cert-sign-space mb-2" style="height: 55px; border-bottom: 1px dashed #64748b;"></div>`;
      if (cert.signatory && cert.signatory.length > 0) {
        for (let i = 0; i < cert.signatory.length; i++) {
          const s = cert.signatory[i];
          const isName = i === 0 || /^\(/.test(s) || /^(?:মোঃ|মোছাঃ|শ্রী|ড\.|প্রফেসর)/.test(s);
          const isTitle = /^(?:অধ্যক্ষ|প্রধান\s*শিক্ষক|সভাপতি|সম্পাদক|ইমাম|সহকারী|প্রভাষক|ম্যানেজার|পরিচালক|স্বাক্ষর|সিলমোহর)/i.test(s) || i === 1;
          html += `<div class="${isName ? 'font-bold' : isTitle ? 'font-semibold text-slate-800' : 'text-slate-600'}">${this.escape(s)}</div>`;
        }
      } else {
        html += `<div class="font-bold">স্বাক্ষর ও সিলমোহর</div>`;
        html += `<div class="text-xs text-slate-600">সভাপতি / প্রধান শিক্ষক</div>`;
      }
      html += `</div>`;
      html += `</div>`;

      html += `</div>`;
      return html;
    },

    escape(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CertificateEngine;
  if (typeof window !== 'undefined') window.CertificateEngine = CertificateEngine;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
