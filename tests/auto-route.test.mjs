// tests/auto-route.test.mjs — স্বয়ংক্রিয় পথ-বাছাই (Auto-Route) ইউনিট টেস্ট
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AutoRoute = require('../js/auto-route.js');

let pass = 0, fail = 0;
function test(name, fn) {
  try {
    fn();
    pass++;
    console.log('PASS:', name);
  } catch (err) {
    fail++;
    console.error('FAIL:', name, err.message);
  }
}

// Global state backup and restore helpers
const origLocation = globalThis.location;
const origLocalStorage = globalThis.localStorage;

function resetGlobals() {
  delete globalThis.location;
  delete globalThis.localStorage;
}

// -------------------------------------------------------------------
// ১. ডিফল্ট ক্ষেত্র: কোনো ওভাররাইড না থাকলে সবসময় template (reason 'default')
// -------------------------------------------------------------------
test('ডিফল্ট ক্ষেত্র: template ও reason default', () => {
  resetGlobals();
  globalThis.location = { search: '' };
  globalThis.localStorage = { getItem: () => null };

  const res = AutoRoute.decide({});
  assert.equal(res.mode, 'template', 'Mode should be template');
  assert.equal(res.reason, 'default', 'Reason should be default');
});

// -------------------------------------------------------------------
// ২. URL ওভাররাইড: ?mode=faithful থাকলে faithful (reason 'override')
// -------------------------------------------------------------------
test('URL ওভাররাইড: ?mode=faithful হলে faithful', () => {
  resetGlobals();
  globalThis.location = { search: '?mode=faithful' };
  globalThis.localStorage = { getItem: () => null };

  const res = AutoRoute.decide({});
  assert.equal(res.mode, 'faithful', 'Mode should be faithful');
  assert.equal(res.reason, 'override', 'Reason should be override');
});

test('URL ওভাররাইড: একাধিক কুয়েরি প্যারামিটারের মাঝে mode=faithful', () => {
  resetGlobals();
  globalThis.location = { search: '?doc=1&mode=faithful&lang=bn' };
  globalThis.localStorage = { getItem: () => null };

  const res = AutoRoute.decide({});
  assert.equal(res.mode, 'faithful', 'Mode should be faithful');
  assert.equal(res.reason, 'override', 'Reason should be override');
});

test('URL অন্যান্য মান: ?mode=template হলে ডিফল্ট template', () => {
  resetGlobals();
  globalThis.location = { search: '?mode=template' };
  globalThis.localStorage = { getItem: () => null };

  const res = AutoRoute.decide({});
  assert.equal(res.mode, 'template', 'Mode should be template');
  assert.equal(res.reason, 'default', 'Reason should be default');
});

// -------------------------------------------------------------------
// ৩. localStorage ওভাররাইড: FZ_ON_FAITHFUL = '1' থাকলে faithful
// -------------------------------------------------------------------
test('localStorage ওভাররাইড: FZ_ON_FAITHFUL=1 হলে faithful', () => {
  resetGlobals();
  globalThis.location = { search: '' };
  globalThis.localStorage = {
    getItem: (key) => (key === 'FZ_ON_FAITHFUL' ? '1' : null)
  };

  const res = AutoRoute.decide({});
  assert.equal(res.mode, 'faithful', 'Mode should be faithful');
  assert.equal(res.reason, 'override', 'Reason should be override');
});

test('localStorage অন্যান্য মান: FZ_ON_FAITHFUL=0 হলে template', () => {
  resetGlobals();
  globalThis.location = { search: '' };
  globalThis.localStorage = {
    getItem: (key) => (key === 'FZ_ON_FAITHFUL' ? '0' : null)
  };

  const res = AutoRoute.decide({});
  assert.equal(res.mode, 'template', 'Mode should be template');
  assert.equal(res.reason, 'default', 'Reason should be default');
});

// -------------------------------------------------------------------
// ৪. localStorage এক্সেপশন সহনশীলতা (SecurityError / private mode)
// -------------------------------------------------------------------
test('localStorage ত্রুটি ছুড়ে দিলেও নিরাপদে template ফেরত দেয়', () => {
  resetGlobals();
  globalThis.location = { search: '' };
  globalThis.localStorage = {
    getItem: () => { throw new Error('SecurityError: Access is denied'); }
  };

  const res = AutoRoute.decide({});
  assert.equal(res.mode, 'template');
  assert.equal(res.reason, 'default');
});

// -------------------------------------------------------------------
// ৫. signals অবজেক্টের হ্যান্ডলিং (ভবিষ্যতের doc_type প্রস্তুতি)
// -------------------------------------------------------------------
test('signals অবজেক্ট গ্রহণ করে নিরাপদে চলে', () => {
  resetGlobals();
  globalThis.location = { search: '' };
  globalThis.localStorage = { getItem: () => null };

  const res = AutoRoute.decide({ doc_type: 'exam_question', pages: 2 });
  assert.equal(res.mode, 'template');
  assert.equal(res.reason, 'default');
});

// Clean up globals
resetGlobals();
if (origLocation !== undefined) globalThis.location = origLocation;
if (origLocalStorage !== undefined) globalThis.localStorage = origLocalStorage;

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
