'use strict';

// ২০২৬-১০-১৪ গেট — row-ink realign (a05): Gemini-সারি ⇒ মাপা রেখা-ভাগ, কপি-সারি বাদ, ফাঁকা সারি ফেরত, শিরোনাম-উপসারি জোড়া;
// page-geometry otsuThreshold। চালানো: node tests/faithful-row-realign.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const RI = require(path.join(ROOT, 'js/layout-engine/faithful/row-ink.js'));
const G = require(path.join(ROOT, 'js/layout-engine/faithful/page-geometry.js'));

let gates = 0;
const check = (cond, msg) => { assert.ok(cond, msg); gates++; };
const keys = (rows) => rows.map((r) => r.filter(Boolean).join('/') || '-');

// a05-এর ছোট রূপ: শিরোনাম + উপ-শিরোনাম (মূলে এক ভাগ), "বেতন" দুবার (মূলে একবার + ২ ফাঁকা), "ভাতা" তিনবার (মূলে একবার + ২ ফাঁকা)
const rows = [
  ['কোড', 'বিবরণ', 'রেট', 'অঙ্ক', ''],
  ['', '', 'টাকা', 'পয়সা', 'টাকা', 'পয়সা'],
  ['১', 'বেতন', '', '', ''],
  ['১', 'বেতন', '', '', ''],
  ['২', 'বাড়ী', '', '', ''],
  ['৩', 'ভাতা', '', '', ''],
  ['৩', 'ভাতা', '', '', ''],
  ['৩', 'ভাতা', '', '', ''],
  ['', 'মোট', '', '', '']
];
const inked = [1, 1, 0, 0, 1, 1, 0, 0, 1].map(Boolean);
const r = RI.realign(rows, inked);
check(r && r.rows.length === inked.length, 'ভাগ-প্রতি একটি সারি');
check(keys(r.rows).join(',') === 'কোড/বিবরণ/রেট\nটাকা/পয়সা/অঙ্ক\nটাকা/পয়সা,১/বেতন,-,-,২/বাড়ী,৩/ভাতা,-,-,মোট', 'কপি বাদ, ফাঁকা ভাগে ফাঁকা সারি, উপ-শিরোনাম অনুপাতে জোড়া: ' + keys(r.rows).join(','));

// অনন্য লেখা-সারি কখনো বাদ নয় (ভাগ কম হলে null বা কালিহীন ভাগে বসে)
const r2 = RI.realign([['ক'], ['খ'], ['গ']], [true, false, true]);
check(r2 && keys(r2.rows).join(',') === 'ক,খ,গ', 'অনন্য সারি থাকে');
check(RI.realign([['ক'], ['খ'], ['গ']], [true, true]) === null, 'ভাগ কম ⇒ null');

// Otsu: ঝকঝকে পাতা ⇒ ১৬০; ফিকে ধূসর লেখা (১৮০) সাদায় ⇒ ১৬০-এর বেশি
const img = (fg, n) => { const d = new Uint8ClampedArray(100 * 4).fill(255); for (let i = 0; i < n; i++) d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = fg; return { width: 10, height: 10, data: d }; };
check(G.otsuThreshold(img(0, 20)) === 160, 'কালো লেখা ⇒ ১৬০');
const t = G.otsuThreshold(img(185, 20));
check(t > 160 && t <= 205, 'ফিকে লেখা ⇒ উঁচু সীমা ' + t);

console.log(`faithful-row-realign: ${gates} passed`);
