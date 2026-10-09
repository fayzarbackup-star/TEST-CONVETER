/**
 * Part-19.4 — কালপুরুষে প্রশ্নপত্রের মাপ। Word-এ কালপুরুষের single লাইন ১.৫৭৫em, সুতন্নীএমজে ১.১৬৯em
 * ⇒ একই প্ল্যানে ইউনিকোড .docx দ্বিতীয় পাতায় গড়াত (৪র্থ শ্রেণির পত্র)। শেষ ফাইল ইউনিকোড (targetFont
 * 'unicode') হলে প্রশ্নপত্রের লাইন-গুণক ০.৭২ (Word-এ মাপা: ১ পাতা, শেষ লাইন বিজয়ের সমান উচ্চতায়)।
 * বিজয় বা targetFont না দিলে আগের মতো ২৪০ (single)।
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const [n, p] of [['FayzarLayoutUnits', 'js/layout-engine/layout-units.js'], ['CqBookletPlanner', 'js/layout-engine/cq-booklet-planner.js'],
  ['McqLayoutPlanner', 'js/layout-engine/mcq-layout-planner.js'], ['TextRunProcessor', 'js/layout-engine/text-run-processor.js'],
  ['FayzarExamRenumber', 'js/layout-engine/exam-renumber.js'], ['FayzarFrontmatter', 'js/layout-engine/frontmatter-header.js'],
  ['QuestionEngine', 'js/engines/question-engine.js'], ['DocClassifier', 'js/engines/doc-classifier.js']]) {
  const m = require(path.join(ROOT, p));
  if (m && !globalThis[n]) globalThis[n] = m;
}
const U = globalThis.FayzarLayoutUnits;
const E = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const CLASS4 = fs.readFileSync(path.join(ROOT, 'tests/fixtures/primary-class4-bangla.input.md'), 'utf8').replace(/^---[\s\S]*?---\s*/, '');
const MCQ = '১। কোনটি ফল?\nক. আম খ. জাম গ. কাঁঠাল ঘ. লিচু\n২। কোনটি ফুল?\nক. গোলাপ খ. আম গ. জাম ঘ. কলা';

async function lines(text, type, opts) {
  const out = await E.generateWordDoc(text, type, { format: 'docx', ...opts });
  const buf = Buffer.isBuffer(out) ? out : Buffer.from(await out.arrayBuffer());
  const xml = await (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');
  return new Set([...xml.matchAll(/w:line="(\d+)" w:lineRule="auto"/g)].map((m) => +m[1]).filter((v) => v >= 120));
}

test('examLineFactor: শুধু unicode ⇒ ০.৭২', () => {
  assert.equal(U.examLineFactor('unicode'), 0.72);
  for (const f of ['bijoy', undefined, '', 'SutonnyMJ']) assert.equal(U.examLineFactor(f), 1);
});

test('৪র্থ শ্রেণির পত্র: ইউনিকোড ⇒ w:line ১৭৩; বিজয়/অজানা ⇒ ২৪০ (আগের মতো)', async () => {
  assert.deepEqual([...await lines(CLASS4, 'EXAM_GENERAL', { targetFont: 'unicode' })], [173]);
  assert.deepEqual([...await lines(CLASS4, 'EXAM_GENERAL', { targetFont: 'bijoy' })], [240]);
  assert.deepEqual([...await lines(CLASS4, 'EXAM_GENERAL', {})], [240]);
  assert.deepEqual([...await lines(CLASS4, 'EXAM_GENERAL', { targetFont: 'unicode', font: 'SutonnyMJ' })], [240]);
});

test('MCQ পত্রেও একই নিয়ম', async () => {
  assert.ok([...await lines(MCQ, 'EXAM_MCQ', { targetFont: 'unicode' })].every((v) => v === 173));
  assert.ok([...await lines(MCQ, 'EXAM_MCQ', { targetFont: 'bijoy' })].every((v) => v === 240));
});
