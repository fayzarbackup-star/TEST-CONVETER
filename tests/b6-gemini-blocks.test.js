'use strict';

// WORK_PLAN B6 gates — Gemini-র ভাঙা ব্লক-ট্যাগ সহনশীলভাবে পড়া (g33: একক `]`-এ বন্ধ ট্যাগ)।
// চালানো: node tests/b6-gemini-blocks.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const L = require(path.join(ROOT, 'js/layout-engine/faithful/layout-tags.js'));

let gates = 0;
const check = (cond, name) => { assert.ok(cond, name); gates++; };

// ১) g33-এর আসল ধরন: box-এর পরে বাড়তি `]`, তারপর একক `]`-এ বন্ধ ট্যাগ, পাতা-২
const g33 = [
  '[[B:t=paragraph;p=1;box=640,530,905,958];al=j;fs=m;b=0;it=0;u=0]]',
  'frightened and beat its wings.',
  '[[B:t=question;p=1;box=908,530,922,958];al=l;fs=m;b=1;it=0;u=0]',
  '1. Choose the correct answer.',
  '[[B:t=option_row;p=2;box=63,63,77,448];al=l;fs=m;p=2;b=0;it=0;u=0]',
  '(a) yes (b) no',
  '[[B:t=paragraph;p=2;box=80,41,94,357];al=l;fs=m;b=0;it=0;u=0] ',
  'last line'
].join('\n');
const p = L.parse(g33);
check(p.blocks.length === 4, 'single-] tags start their own block');
check(p.blocks[0].lines.length === 1, 'previous block no longer swallows following tags');
check(p.blocks[1].type === 'question' && p.blocks[1].bold === true && p.blocks[1].box.join() === '908,530,922,958', 'question meta read');
check(p.blocks[2].page === 2 && p.blocks[3].page === 2, 'page-2 blocks land on page 2');
check(p.blocks.every((b) => !b.lines.some((l) => /\[\[B:/.test(l))), 'no tag text leaks into lines');

// ২) সাধারণ `]]` ট্যাগ অপরিবর্তিত; লাইনের মাঝের `]` ট্যাগ বন্ধ করে না
const q = L.parse('[[B:t=paragraph;p=1;box=1,2,30,40]]\nক [১] খ\n[[B:t=heading;p=1;box=31,2,40,40;b=1]]\nশিরোনাম');
check(q.blocks.length === 2 && q.blocks[0].text === 'ক [১] খ' && q.blocks[1].type === 'heading', 'normal ]] tags and inline ] unchanged');

// ৩) লেখার লাইন যা `]`-এ শেষ, কিন্তু ট্যাগ নয় ⇒ লেখাই থাকে
const r = L.parse('[[B:t=paragraph;p=1;box=1,2,30,40]]\n[নম্বর ১০]');
check(r.blocks.length === 1 && r.blocks[0].text === '[নম্বর ১০]', 'bracketed text line is not a tag');

console.log(`B6 gemini-blocks: ${gates} passed`);
