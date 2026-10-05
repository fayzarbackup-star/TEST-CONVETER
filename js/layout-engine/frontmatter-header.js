/**
 * Fayzar — ফ্রন্টম্যাটার → প্রশ্নপত্র-হেডার (FayzarFrontmatter)
 * ============================================================
 * Gemini OCR প্রম্পট (gemini-prompt-factory.js) ফাইলের শুরুতে `---` ব্লকে institute / exam /
 * grade / subject / time / fullMarks দেয়। আগে এই ব্লক শুধু মুছে ফেলা হতো ⇒ সঠিক তথ্য থাকা
 * সত্ত্বেও হেডারে ফলব্যাক প্লেসহোল্ডার বসত। এখানে ব্লকটি পড়ে হেডারের **ফাঁকা** ঘর পূরণ হয়;
 * মূল লেখা থেকে পার্স করা মান সবসময় অগ্রাধিকার পায় (ফ্রন্টম্যাটার কেবল ঘাটতি মেটায়)।
 */
(function (global) {
  'use strict';

  const FM_RE = /^﻿?\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

  // `[প্রতিষ্ঠানের নাম]`-জাতীয় টেমপ্লেট-প্লেসহোল্ডার, ফাঁকা বা N/A মান বাদ
  function clean(v) {
    const s = String(v == null ? '' : v).trim().replace(/^["']|["']$/g, '').trim();
    if (!s || /^\[.*\]$/.test(s) || /^(?:n\/?a|null|none|-+|…+|\.{3,})$/i.test(s)) return '';
    return s;
  }

  const FayzarFrontmatter = {
    /** @returns {{ fields: object|null, body: string }} */
    split(text) {
      const src = String(text == null ? '' : text);
      const m = src.match(FM_RE);
      if (!m) return { fields: null, body: src };
      const fields = {};
      for (const line of m[1].split(/\r?\n/)) {
        const kv = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
        if (kv) fields[kv[1].toLowerCase().replace(/-/g, '_')] = clean(kv[2]);
      }
      return { fields, body: src.slice(m[0].length) };
    },

    /** ফ্রন্টম্যাটার-ফিল্ড → হেডার-মডেলের নাম */
    toHeader(fields) {
      const f = fields || {};
      const grade = f.grade || f.class || '';
      const subject = f.subject || '';
      const isEn = /^[\x00-\x7F]*$/.test(grade + subject) && /[A-Za-z]/.test(grade + subject);
      const cls = grade && subject
        ? (isEn ? 'Class: ' + grade + '  |  Subject: ' + subject : 'শ্রেণি: ' + grade + '  |  বিষয়: ' + subject)
        : (grade ? (isEn ? 'Class: ' : 'শ্রেণি: ') + grade : (subject ? (isEn ? 'Subject: ' : 'বিষয়: ') + subject : ''));
      return {
        institute: f.institute || f.institution || f.school || '',
        location: f.address || f.location || '',
        exam: f.exam || f.exam_name || '',
        classAndSubject: cls,
        time: f.time || f.duration || '',
        marks: f.fullmarks || f.full_marks || f.marks || f.total_marks || ''
      };
    },

    /** শুধু ফাঁকা হেডার-ঘর পূরণ (উৎস-লেখার মান অক্ষত) — header অবজেক্টটিই বদলায় ও ফেরত দেয় */
    applyToHeader(header, fields) {
      const h = header || {};
      if (!fields) return h;
      const fm = this.toHeader(fields);
      for (const k of Object.keys(fm)) {
        if (fm[k] && !(h[k] && String(h[k]).trim())) h[k] = fm[k];
      }
      return h;
    }
  };

  global.FayzarFrontmatter = FayzarFrontmatter;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarFrontmatter;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
