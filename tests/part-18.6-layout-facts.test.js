'use strict';

// Part-18.6 — তথ্য-ভিত্তিক লেআউট (ব্যবহারকারীর রিপোর্ট ২০২৬-১০-০৬):
//  ১) ৫ম শ্রেণির গণিত জোর করে সৃজনশীল বুকলেটে যেত (Gemini: EXAM_MATH)
//  ২) সিলেবাস/মানবণ্টন-পাতা জোর করে যৌথে যেত (Gemini: EXAM_COMBINED)
//  এখন Gemini তথ্য দেয় (grade/content/sections), লেআউট ক্লাসিফায়ারের নিয়মে, দাবি লেখার গঠন দিয়ে যাচাই।
// ফিক্সচার: tests/fixtures/real-ocr/*.md — আসল ফাইলে আসল Gemini-আউটপুট (qa/real-ocr-probe.mjs)।
// চালানো: node tests/part-18.6-layout-facts.test.js

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
globalThis.window = globalThis.window || globalThis;
require(path.join(ROOT, 'js/engines/doc-classifier.js'));
const D = globalThis.DocClassifier;

let gates = 0;
const check = (cond, msg) => { assert.ok(cond, msg); gates++; };
const real = (n) => fs.readFileSync(path.join(ROOT, 'tests/fixtures/real-ocr', n + '.md'), 'utf8');

// ---- ১) আসল OCR-আউটপুট ----
const c5 = D.classify(real('class5'));
check(c5.type === 'EXAM_GENERAL', '৫ম শ্রেণি (MCQ+শূন্যস্থান+সংক্ষিপ্ত+সমস্যা) → সাধারণ, সৃজনশীল নয় · ' + c5.reason);
check(D.promoteCombined(c5.type, real('class5')) === 'EXAM_GENERAL', '৫ম শ্রেণি যৌথে ওঠে না');
const c2 = D.classify(real('class2syllabus'));
check(c2.type === 'EXAM_GENERAL', 'সিলেবাস/মানবণ্টন → সাধারণ, যৌথ নয় · ' + c2.reason);
const c8 = D.classify(real('class8sci'));
check(c8.type === 'EXAM_COMBINED', '৮ম বিজ্ঞান (সৃজনশীল+সংক্ষিপ্ত+বহুনির্বাচনি) → যৌথ · ' + c8.reason);
const s8 = D.structureStats(real('class8sci'));
check(s8.cqBlocks >= 5 && s8.mcqBlocks >= 15, '৮ম বিজ্ঞানের গঠন: সৃজনশীল ' + s8.cqBlocks + ', বহুনির্বাচনি ' + s8.mcqBlocks);

const cm = D.classify(real('hmathcq'));
check(cm.type === 'EXAM_MATH', 'উচ্চতর গণিত, শুধু সৃজনশীল → সৃজনশীল-বুকলেট (EXAM_MATH) · ' + cm.reason);

// ---- ২) শ্রেণি পড়া ----
check(D.parseGrade('৫') === 5 && D.parseGrade('পঞ্চম') === 5 && D.parseGrade('Class Five') === 5 && D.parseGrade('৯ম') === 9, 'শ্রেণি: ৫ / পঞ্চম / Five / ৯ম');
check(D.parseGrade('0') === 0 && D.parseGrade('') === 0, 'শ্রেণি নেই → 0');

// ---- ৩) নিয়ম ----
const cqBody = ['## সৃজনশীল প্রশ্ন', '১। উদ্দীপকটি পড়ো।', 'ক. প্রথম উপপ্রশ্নটি কী? ১', 'খ. দ্বিতীয় উপপ্রশ্ন ব্যাখ্যা করো। ২', 'গ. তৃতীয় উপপ্রশ্ন নির্ণয় করো। ৩', 'ঘ. চতুর্থ উপপ্রশ্ন বিশ্লেষণ করো। ৪'].join('\n');
const mcqBody = ['## বহুনির্বাচনি প্রশ্ন', '১। কোনটি সঠিক?', 'ক. এক', 'খ. দুই', 'গ. তিন', 'ঘ. চার', '২। কোনটি ভুল?', 'ক. ক', 'খ. খ', 'গ. গ', 'ঘ. ঘ'].join('\n');
const fm = (o) => '---\n' + Object.entries(o).map(([k, v]) => k + ': ' + v).join('\n') + '\n---\n';
check(D.classify(fm({ doc_type: 'EXAM_COMBINED', grade: 9, content: 'QUESTION_PAPER', sections: 'cq:1' }) + cqBody).type === 'EXAM_CQ', 'শুধু সৃজনশীল (৯ম) → CQ, Gemini-র "যৌথ" দাবি সত্ত্বেও');
check(D.classify(fm({ doc_type: 'EXAM_CQ', grade: 10, subject: 'গণিত', content: 'QUESTION_PAPER', sections: 'cq:1' }) + cqBody).type === 'EXAM_MATH', 'গণিতের শুধু-সৃজনশীল → EXAM_MATH');
check(D.classify(fm({ doc_type: 'EXAM_CQ', grade: 9, content: 'QUESTION_PAPER', sections: 'cq:1, mcq:2' }) + cqBody + '\n' + mcqBody).type === 'EXAM_COMBINED', 'সৃজনশীল + বহুনির্বাচনি → যৌথ');
check(D.classify(fm({ doc_type: 'EXAM_COMBINED', grade: 9, content: 'QUESTION_PAPER', sections: 'mcq:2' }) + mcqBody).type === 'EXAM_MCQ', 'শুধু বহুনির্বাচনি → MCQ');
check(D.classify(fm({ doc_type: 'EXAM_CQ', grade: 9, content: 'QUESTION_PAPER', sections: 'cq:3' }) + mcqBody).type !== 'EXAM_CQ', 'সৃজনশীল দাবি, কিন্তু লেখায় সৃজনশীল-গঠন নেই → CQ নয়');
check(D.classify(fm({ doc_type: 'EXAM_CQ', grade: 7, content: 'QUESTION_PAPER', sections: 'cq:1, matching:5' }) + cqBody).type === 'EXAM_GENERAL', 'অন্য ধরন (মিলকরণ) থাকলে → সাধারণ');
check(D.classify(fm({ doc_type: 'EXAM_CQ', grade: 3, content: 'QUESTION_PAPER', sections: 'cq:1' }) + cqBody).type === 'EXAM_GENERAL', 'প্রাথমিক (৩য়) → সবসময় সাধারণ');
check(D.classify(fm({ doc_type: 'OFFICE_PAD', grade: 0, content: 'OTHER' }) + 'স্মারক নং ১২\nবিষয়: সভা').type === 'OFFICE_PAD', 'অফিস-ধরন (doc_type) অপরিবর্তিত');
// তথ্য ছাড়া পুরোনো লেখা: যৌথ দাবি কিন্তু সৃজনশীল-গঠন নেই → সাধারণ
check(D.classify(fm({ doc_type: 'EXAM_COMBINED' }) + '## প্রশ্ন নং-১: কবিতা লিখন\nপাঠ্যবই থেকে\n## প্রশ্ন নং-২: শব্দার্থ\nপৃষ্ঠা ৪৮').type === 'EXAM_GENERAL', 'তথ্যহীন "যৌথ" দাবি, গঠন নেই → সাধারণ');
// সাধারণ পত্রে বহুনির্বাচনি অংশ থাকলেও যৌথ নয়
check(D.promoteCombined('EXAM_GENERAL', '১। প্রশ্ন\n' + mcqBody + '\n' + mcqBody.replace(/১।|২।/g, '৩।')) === 'EXAM_GENERAL', 'সাধারণ পত্র বহুনির্বাচনি অংশের কারণে যৌথে ওঠে না');

// ---- ৪) Part-18.7: সাধারণ-ফরম্যাটের স্তরযুক্ত পত্র (৫ম শ্রেণি) — (১)-উপপ্রশ্ন + বিকল্প চ্যাপ্টা হয় না ----
require(path.join(ROOT, 'js/layout-engine/general-paper-parser.js'));
const GP = globalThis.FayzarGeneralParser;
const body5 = real('class5').replace(/^---[\s\S]*?\n---\n?/, '');
check(GP.isNested(body5), '৫ম শ্রেণির পত্র স্তরযুক্ত হিসেবে চেনে');
const secs = GP.parseSections(body5);
const s1 = secs[0].questions;
check(s1[0].num === '১' && /১ x ১০ = ১০/.test(s1[0].text) && s1[0].options.length === 0, 'প্রশ্ন ১ = নির্দেশনা + নম্বর (১ x ১০ = ১০)');
const items = s1.filter((q) => /^\([০-৯]+\)/.test(q.text));
check(items.length === 10 && items.every((q) => q.options.length === 4 && q.num === ''), '(১)…(১০) — প্রতিটির নিজের ৪টি বিকল্প, নম্বর অপরিবর্তিত');
const q2 = s1.find((q) => q.num === '২'), q3 = s1.find((q) => q.num === '৩');
check(q2 && q2.subQuestions.length === 10 && q2.options.length === 0, 'প্রশ্ন ২: ১০টি শূন্যস্থান উপ-প্রশ্ন (বিকল্প নয়)');
check(q3 && q3.subQuestions.length === 16, 'প্রশ্ন ৩: ১৬টি সংক্ষিপ্ত উপ-প্রশ্ন (ট–ত পর্যন্ত আলাদা)');
const probSec = secs.find((x) => /সমস্যা/.test(x.title));
check(probSec && probSec.questions.length === 8 && probSec.questions[0].num === '৪', 'সমস্যা-অংশ: শিরোনাম + ৪–১১ নং প্রশ্ন');
check(probSec.questions[0].subQuestions[0].mark === '৪', 'উপ-প্রশ্নের নম্বর (ডানে) আলাদা');
check(secs.every((x) => x.keepNumbers), 'মূল নম্বর অপরিবর্তিত (renumber বাদ)');
check(!GP.isNested(real('class8sci')), 'সাধারণ সৃজনশীল/বহুনির্বাচনি পত্রে এই পার্সার চলে না');

console.log(`Part-18.6 layout-facts gates: ${gates} passed, 0 failed`);
