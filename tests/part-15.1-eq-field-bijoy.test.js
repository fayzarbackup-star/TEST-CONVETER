'use strict';

// Part-15.1 / 15.5 regression gates — Word 2003 EQ ফিল্ড (js/layout-engine/eq-field-rtf.js)
//  - RTF-এ EQ-সুইচ লিটারাল ব্যাকস্ল্যাশসহ `\\F(` `\\R(` `\\S\\up4(` (একক `\F` RTF-পার্সার ফেলে দিত ⇒ "(3,5)")
//  - চলক-অক্ষর ইটালিক `{\i x}`, সংখ্যা/সুইচ/ফাংশন-নাম খাড়া
//  - বিজয়: ল্যাটিন → \f1 (TNR), বাংলা → বিজয়-কোড + \f0 (SutonnyMJ); ইউনিকোড: একক \f1 রান, বাংলা অঙ্ক কোড-পয়েন্টে
// চালানো: node tests/part-15.1-eq-field-bijoy.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
globalThis.Blob = globalThis.Blob || require('node:buffer').Blob;
require(path.join(ROOT, 'tests/lib/harness.js')).loadEngines();
const { ExportDualEngine } = globalThis;
const EqF = require(path.join(ROOT, 'js/layout-engine/eq-field-rtf.js'));

let gates = 0;
const check = (cond, msg) => { assert.ok(cond, msg); gates++; };
const fieldOf = (rtf) => (String(rtf).match(/\{\\field\{\\\*\\fldinst [\s\S]*?\}\{\\fldrslt \}\}/) || [''])[0];

// ১) বিজয়: \frac{৩}{৫} + \sqrt{x^2 + 1}
const bij = fieldOf(ExportDualEngine.formatRtfText('$\\frac{৩}{৫} + \\sqrt{x^2 + 1}$', { font: 'bijoy' }));
check(bij.length > 0 && bij.startsWith('{\\field{\\*\\fldinst EQ '), 'Bijoy: EQ field emitted with "fldinst EQ"');
check(bij.includes('{\\f0 3}') && bij.includes('{\\f0 5}'), 'Bijoy: ৩/৫ as Bijoy code in SutonnyMJ run');
check(!/\\u24(3[4-9]|4[0-3])\?/.test(bij), 'Bijoy: no raw Unicode Bengali digit in field');
check(bij.includes('\\\\F(') && bij.includes('\\\\R(') && bij.includes('\\\\S\\\\up'), 'EQ switches written with literal backslash (\\\\F, \\\\R, \\\\S\\\\up)');
check(!/[^\\]\\F\(/.test(bij) && !/[^\\]\\R\(/.test(bij), 'no single-backslash switch left (RTF would drop it)');
check(bij.includes('{\\i x}'), 'variable x italic');
check(!/\{\\i [0-9]/.test(bij) && !/\{\\i (?:F|R|S|up)\}/.test(bij), 'digits and switches never italic');
check((bij.match(/\{/g) || []).length === (bij.match(/\}/g) || []).length, 'Bijoy: braces balanced');

// ২) ইউনিকোড
const uni = fieldOf(ExportDualEngine.formatRtfText('$\\frac{৩}{৫}$', { font: 'unicode' }));
check(uni === '{\\field{\\*\\fldinst EQ {\\f1 \\\\F(\\u2537?,\\u2539?)}}{\\fldrslt }}', 'Unicode: single latin run, Bengali digit code points kept, switch escaped');

// ৩) মডিউল সরাসরি
check(EqF.build('\\F(1,2)', { isBijoy: true, toBijoy: (t) => t }) === '{\\field{\\*\\fldinst EQ {\\f1 \\\\F(1,2)}}{\\fldrslt }}', 'module: ASCII-only field');
const bnText = EqF.build('\\F(ক,২)', { isBijoy: true, toBijoy: (t) => (t === 'ক' ? 'K' : t === '২' ? '2' : t) });
check(bnText.includes('{\\f0 K}') && bnText.includes('{\\f0 2}'), 'module: Bangla letters/digits converted via toBijoy');
check(EqF.italicVars('\\\\F(x^2 + 2x, \\\\S\\\\up4(n))') === '\\\\F({\\i x}^2 + 2{\\i x}, \\\\S\\\\up4({\\i n}))', 'italicVars: vars italic, switches/digits upright');
check(EqF.italicVars('sin x + log{\\super\\fs16 2} y') === 'sin {\\i x} + log{\\super\\fs16 2} {\\i y}', 'italicVars: function names & RTF control words untouched');

// ৪) ঘাতওয়ালা রাশি এখন EQ-ফিল্ড (Part-15.7); কোনো সুইচ-ছাড়া রাশি ফিল্ড-ছাড়া ইটালিক
const powField = fieldOf(ExportDualEngine.formatRtfText('$P = 1 - x + x^2$', { font: 'bijoy' }));
check(powField.includes('{\\i P}') && powField.includes('{\\i x}\\\\S\\\\up4(}{\\f1\\fs16 2}'), 'P = 1 - x + x² → EQ field, vars italic, exponent 8pt');
const plain = ExportDualEngine.formatRtfText('$y = x - 3$', { font: 'bijoy' });
check(!plain.includes('fldinst') && plain.includes('{\\i y} = {\\i x} - 3'), 'switch-free expression stays plain italic text');

// ৫) Part-15.6: EQ-ফিল্ডের ভেতরের ঘাত কেবল আর্গুমেন্টটুকু ৮pt
const root = fieldOf(ExportDualEngine.formatRtfText('$\\sqrt{x^2 + 1}$', { font: 'bijoy' }));
check(root.includes('\\\\S\\\\up4(}{\\f1\\fs16 2}{\\f1 ) + 1)'), 'EQ field: exponent argument alone at \\fs16, rest at base size');
check(EqF.splitRuns('a\\S\\up4(2)b').map((r) => r.small).join() === 'false,true,false', 'splitRuns: only the \\S\\up argument is small');

console.log(`Part-15.1/15.5 eq-field gates: ${gates} passed, 0 failed`);
