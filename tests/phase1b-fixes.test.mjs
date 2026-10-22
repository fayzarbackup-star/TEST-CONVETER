/**
 * Phase 1B — (1.1) সাধারণ সনদ মুড়ি+মূল নয়; (1.4) অনুচ্ছেদের ভেতরের ইনলাইন (a)…(j) ভাঙে না, নম্বর কল্পিত নয়, "Marks: 50" হেডার
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CT = require(path.join(ROOT, 'js/layout-engine/certificate-layout.js'));
const QE = require(path.join(ROOT, 'js/engines/question-engine.js'));

test('1.1: লেটারহেড + --- + সাধারণ প্রত্যয়ন (নাম শেষে আবার) ⇒ মুড়ি+মূল নয়', () => {
  const md = ['# মেসার্স ক খ ট্রেডার্স', 'প্রো: অমুক তমুক', 'এখানে সার ও বীজ বিক্রয় করা হয়।', 'বাজার, জেলা।', 'মোবাইল - ০১৭১৭১২৩৪৫৬',
    '---', '# প্রত্যয়ন পত্র',
    'এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, আমি অমুক, পিতা- তমুক, ঠিকানাঃ বাজার, জেলাঃ ঢাকা। তিনি অমুক কোম্পানীতে কর্মরত ছিলেন। তার পারিবারিক সমস্যার কারণে অব্যাহতি গ্রহণ করেন।',
    'তার কাছে কোন ধরনের ব্যক্তিগত আর্থিক দেনা পাওনা নাই।', 'আমি তার ভবিষ্যৎ জীবনের মঙ্গল কামনা করছি।', 'পরিবেশক- ফরিদুল',
    'মেসার্স ক খ ট্রেডার্স', 'প্রো: অমুক তমুক', 'বাজার, জেলা।', 'মোবাঃ ০১৭১৭-১২৩৪৫৬', 'মেসার্স ক খ ট্রেডার্স'].join('\n');
  assert.equal(CT.wants(md, {}), false);
});

test('1.1: সত্যিকার মুড়ি+মূল (দ্বিতীয় অংশ একই শিরোনামে শুরু) এখনও ধরা পড়ে', () => {
  const half = ['# স্কুল নাম', 'সনদ', 'নাম: ক', 'তারিখ: ১', 'স্বাক্ষর'];
  assert.equal(CT.wants(half.join('\n') + '\n---\n' + half.join('\n'), {}), true);
});

test('1.4: অনুচ্ছেদের ইনলাইন (a)…(j) ভাঙে না; নম্বর কল্পিত নয়; Marks: 50 হেডারে', () => {
  const md = ['# School', 'Class: Six', 'Time: 2 hours\tMarks: 50', '## Part A (Marks: 30)',
    '1. Read the text and identify.\t$.5 \\times 10 = 05$',
    'Hasib is a (a) brave boy who lives (b) in a small (c) village. He (d) saw a man (e) quickly ran (f) weak (g) kind (h) happy (i) because (j) Alas!',
    '2. Another question?\t3'].join('\n');
  const p = QE.parseQuestionPaper(md, { docType: 'EXAM_COMBINED' });
  const q = p.sections.flatMap((s) => s.questions)[0];
  assert.equal(q.subQuestions.length, 0);
  assert.equal(q.options.length, 0);
  assert.match(q.stimulus, /^Hasib is a \(a\) brave boy/);
  assert.equal(p.header.marks, '50');
  assert.equal(p.header.time, '2 hours');
});
