const assert = require('assert');

// Load the engines in Node environment
const BanglaConverter = require('./js/bangla-converter-engine.js');
const QuestionEngine = require('./js/engines/question-engine.js');

console.log('--- Running Basic Unit Tests ---');

function testBanglaConverter() {
  console.log('Testing BanglaConverterEngine...');
  
  const bConverter = typeof BanglaConverter === 'function' ? BanglaConverter : (BanglaConverter.unicodeToBijoy ? BanglaConverter : null);
  assert(bConverter, 'BanglaConverter should be exported');

  const testUnicode = 'আমি বাংলায় গান গাই';
  const expectedBijoy = 'Avwg evsjvq Mvb MvB'; // Basic sanity check
  
  const result = bConverter.unicodeToBijoy(testUnicode);
  
  assert.strictEqual(result, expectedBijoy, `Expected ${expectedBijoy} but got ${result}`);
  console.log('✅ BanglaConverter basic tests passed.');
}

function testQuestionEngine() {
  console.log('Testing QuestionEngine (Strong Assertions)...');
  
  const qEngine = typeof QuestionEngine === 'object' ? QuestionEngine : null;
  assert(qEngine, 'QuestionEngine should be exported');

  const sampleCQ = `
---SECTION_BREAK:MCQ---
নিচের উদ্দীপকটি পড় এবং ১ ও ২ নং প্রশ্নের উত্তর দাও:
রহিম একটি বই পড়ছে।

১. রহিম কী পড়ছে?
ক) বই
খ) খাতা
গ) কলম
ঘ) পেন্সিল

২. রহিমের বইয়ের রং কী হতে পারে?
i. লাল
ii. নীল
iii. সবুজ
নিচের কোনটি সঠিক?
ক) i ও ii
খ) i ও iii
গ) ii ও iii
ঘ) i, ii ও iii
  `.trim();

  const parsed = qEngine.parseQuestionPaper(sampleCQ);
  assert(parsed.sections, 'Should have sections');
  assert.strictEqual(parsed.sections.length, 1, 'Should have 1 section');
  
  const qs = parsed.sections[0].questions;
  assert.strictEqual(qs.length, 2, 'Should have 2 questions');
  
  // Test Question 1 (Stimulus + Options)
  assert.strictEqual(qs[0].preContext, 'নিচের উদ্দীপকটি পড় এবং ১ ও ২ নং প্রশ্নের উত্তর দাও:\nরহিম একটি বই পড়ছে।', 'Stimulus should match exactly');
  assert.strictEqual(qs[0].text, 'রহিম কী পড়ছে?', 'Question text should match');
  assert.strictEqual(qs[0].options[0].text, 'বই', 'Option 1 should match');
  assert.strictEqual(qs[0].options[3].text, 'পেন্সিল', 'Option 4 should match');
  
  // Test Question 2 (Roman Numerals)
  assert.strictEqual(qs[1].text, 'রহিমের বইয়ের রং কী হতে পারে?', 'Question 2 text should match');
  assert.strictEqual(qs[1].statements.length, 4, 'Should have 4 statements (3 roman + 1 question)');
  assert.strictEqual(qs[1].statements[0], 'i. লাল', 'Statement 1 should match');
  assert.strictEqual(qs[1].statements[2], 'iii. সবুজ', 'Statement 3 should match');
  assert.strictEqual(qs[1].options[0].text, 'i ও ii', 'Nested option should match');

  console.log('✅ QuestionEngine strong assertions passed.');
}

try {
  testBanglaConverter();
  testQuestionEngine();
  console.log('🎉 All baseline tests passed successfully!');
} catch (err) {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
}
