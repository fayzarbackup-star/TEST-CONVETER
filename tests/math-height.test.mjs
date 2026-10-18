import { createRequire } from 'module';
import assert from 'assert';

const require = createRequire(import.meta.url);
const IR = require('../js/layout-engine/faithful/layout-ir.js');
const Builder = require('../js/layout-engine/faithful/faithful-docx-builder.js');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}: ${err && err.message ? err.message : err}`);
  } finally {
    delete globalThis.__FZ_ON_MATHH;
  }
}

function approxEq(actual, expected, eps = 1e-6, msg = '') {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(`${msg ? msg + ' — ' : ''}expected ${expected}, got ${actual}`);
  }
}

console.log('=== A1_MATHH_v3: গণিত-লাইনের উচ্চতা ও প্রান্তিক ক্ষেত্র টেস্ট ===');

// ১. mathKindOf — প্রতিটি ধরন (frac / নেস্টেড frac / rad / sup / math / null)
check('mathKindOf: সাধারণ ভগ্নাংশ (\\frac, \\dfrac, \\tfrac, \\cfrac)', () => {
  assert.strictEqual(IR.mathKindOf('\\frac{a}{b}'), 'frac');
  assert.strictEqual(IR.mathKindOf('\\dfrac{1}{2}'), 'frac');
  assert.strictEqual(IR.mathKindOf('\\tfrac{x}{y}'), 'frac');
  assert.strictEqual(IR.mathKindOf('\\cfrac{1}{1+x}'), 'frac');
  assert.strictEqual(Builder.mathKindOf('\\frac{ক}{খ}'), 'frac');
});

check('mathKindOf: নেস্টেড ভগ্নাংশ, দ্বিপদী, ম্যাট্রিক্স ও ইউনিকোড ভগ্নাংশ (frac)', () => {
  assert.strictEqual(IR.mathKindOf('\\frac{\\frac{1}{2}}{3}'), 'frac');
  assert.strictEqual(IR.mathKindOf('\\frac{1}{1 + \\frac{2}{3}}'), 'frac');
  assert.strictEqual(IR.mathKindOf('½ + ¾'), 'frac');
  assert.strictEqual(IR.mathKindOf('(a+b)/(c+d)'), 'frac');
  assert.strictEqual(Builder.mathKindOf('\\binom{n}{k}'), 'frac');
  assert.strictEqual(Builder.mathKindOf('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'), 'frac');
  assert.strictEqual(Builder.mathKindOf('\\sum_{i=1}^{n} i'), 'frac');
});

check('mathKindOf: মূল ও বড় সমাকলন/সমষ্টি চিহ্ন (rad)', () => {
  assert.strictEqual(IR.mathKindOf('\\sqrt{x+1}'), 'rad');
  assert.strictEqual(IR.mathKindOf('\\sqrt[3]{27}'), 'rad');
  assert.strictEqual(IR.mathKindOf('√(x+1)'), 'rad');
  assert.strictEqual(IR.mathKindOf('∛8 + ∜16'), 'rad');
  assert.strictEqual(Builder.mathKindOf('\\int f(x) dx'), 'rad');
  assert.strictEqual(Builder.mathKindOf('∑ x'), 'rad');
});

check('mathKindOf: সূচক ও সহগ — LaTeX, HTML ও ইউনিকোড (², ₃) (sup)', () => {
  assert.strictEqual(IR.mathKindOf('x^{2} + y_{1}'), 'sup');
  assert.strictEqual(IR.mathKindOf('a^2 + b_3'), 'sup');
  assert.strictEqual(IR.mathKindOf('ক^২ + খ_১'), 'sup');
  assert.strictEqual(IR.mathKindOf('x²'), 'sup');
  assert.strictEqual(IR.mathKindOf('H₂O + x₃'), 'sup');
  assert.strictEqual(Builder.mathKindOf('x<sup>2</sup>'), 'sup');
  assert.strictEqual(Builder.mathKindOf('y<sub>3</sub>'), 'sup');
});

check('mathKindOf: সাধারণ সমীকরণ (math)', () => {
  assert.strictEqual(IR.mathKindOf('\\alpha + \\beta = \\pi'), 'math');
  assert.strictEqual(IR.mathKindOf('\\sin\\theta + \\cos\\theta = 1'), 'math');
  assert.strictEqual(IR.mathKindOf('$x + y = z$'), 'math');
  assert.strictEqual(IR.mathKindOf('⟦eq: x + y⟧'), 'math');
  assert.strictEqual(IR.mathKindOf('a ≤ b ≠ c'), 'math');
  assert.strictEqual(Builder.mathKindOf('', { hasEquation: true }), 'math');
});

check('mathKindOf: সমীকরণহীন সাধারণ বাংলা ও ইংরেজি লেখা (null)', () => {
  assert.strictEqual(IR.mathKindOf('সাধারণ বাংলা অনুচ্ছেদ'), null);
  assert.strictEqual(IR.mathKindOf('Plain English text 123'), null);
  assert.strictEqual(IR.mathKindOf(''), null);
  assert.strictEqual(Builder.mathKindOf(null), null);
});

check('mathKindOf: hint ও লেখার ধরনের অগ্রাধিকার (frac > rad > sup > math)', () => {
  assert.strictEqual(IR.mathKindOf('\\frac{1}{2}', { mathKind: 'sup' }), 'frac');
  assert.strictEqual(Builder.mathKindOf('\\sqrt{x}', { mathKind: 'math' }), 'rad');
  assert.strictEqual(IR.mathKindOf('x²', { hasEquation: true }), 'sup');
  assert.strictEqual(IR.mathKindOf('সাধারণ লেখা', { mathKind: 'frac' }), 'frac');
  assert.strictEqual(Builder.mathKindOf('সাধারণ লেখা', { isFraction: true }), 'frac');
});

// ২. mathLineExtraPt — প্রতিটি ধরন (frac / নেস্টেড frac / rad / sup / math / null)
check('mathLineExtraPt: সাধারণ ভগ্নাংশ (frac ⇒ ১.০৫ × ফন্ট)', () => {
  const fs = 12;
  approxEq(IR.mathLineExtraPt('\\frac{1}{2}', fs), fs * 1.05, 1e-6);
  approxEq(Builder.mathLineExtraPt('\\dfrac{a+b}{c+d}', fs), fs * 1.05, 1e-6);
  approxEq(IR.mathLineExtraPt('½', 10), 10 * 1.05, 1e-6);
});

check('mathLineExtraPt: নেস্টেড ভগ্নাংশ (নেস্টেড frac ⇒ ১.৪৫ × ফন্ট)', () => {
  const fs = 12;
  approxEq(IR.mathLineExtraPt('\\frac{\\frac{1}{2}}{3}', fs), fs * 1.45, 1e-6);
  approxEq(IR.mathLineExtraPt('\\frac{1}{1 + \\frac{2}{3}}', fs), fs * 1.45, 1e-6);
  approxEq(Builder.mathLineExtraPt('\\frac{x^{2} + \\frac{1}{2}}{y}', fs), fs * 1.45, 1e-6);
});

check('mathLineExtraPt: মূল চিহ্ন (rad ⇒ সাধারণ ০.৪৫×, ভেতরে সূচক থাকলে ০.৫৫×)', () => {
  const fs = 12;
  approxEq(IR.mathLineExtraPt('\\sqrt{x+1}', fs), fs * 0.45, 1e-6);
  approxEq(Builder.mathLineExtraPt('√(a+b)', fs), fs * 0.45, 1e-6);
  approxEq(IR.mathLineExtraPt('\\sqrt{x^2+1}', fs), fs * 0.55, 1e-6);
  approxEq(IR.mathLineExtraPt('\\sqrt{x²+1}', fs), fs * 0.55, 1e-6);
  approxEq(Builder.mathLineExtraPt('√(x²+y²)', fs), fs * 0.55, 1e-6);
});

check('mathLineExtraPt: সূচক ও সহগ (sup ⇒ একক ০.২৮×, উপর-নিচ উভয় ০.৩৮×)', () => {
  const fs = 12;
  approxEq(IR.mathLineExtraPt('x^{2}', fs), fs * 0.28, 1e-6);
  approxEq(IR.mathLineExtraPt('x_{3}', fs), fs * 0.28, 1e-6);
  approxEq(IR.mathLineExtraPt('x²', fs), fs * 0.28, 1e-6);
  approxEq(IR.mathLineExtraPt('x₃', fs), fs * 0.28, 1e-6);
  approxEq(IR.mathLineExtraPt('x^{2}_{3}', fs), fs * 0.38, 1e-6);
  approxEq(Builder.mathLineExtraPt('x² + y₃', fs), fs * 0.38, 1e-6);
});

check('mathLineExtraPt: সাধারণ সমীকরণ (math ⇒ ০.১২×) ও সমীকরণহীন (null ⇒ ০)', () => {
  const fs = 12;
  approxEq(IR.mathLineExtraPt('\\alpha + \\beta', fs), fs * 0.12, 1e-6);
  approxEq(Builder.mathLineExtraPt('$a + b = c$', fs), fs * 0.12, 1e-6);
  approxEq(IR.mathLineExtraPt('সাধারণ বাংলা লেখা', fs), 0, 1e-6);
  approxEq(Builder.mathLineExtraPt('', fs), 0, 1e-6);
});

// ৩. inkRatioFor — প্রতিটি ধরন (MATHH চালু ও বন্ধ)
check('inkRatioFor: MATHH চালু থাকলে frac (১.৭৫), নেস্টেড frac (১.৭৫), rad (১.৩), sup (১.১২)', () => {
  globalThis.__FZ_ON_MATHH = true;
  approxEq(IR.inkRatioFor('\\frac{1}{2}'), 1.75, 1e-6);
  approxEq(IR.inkRatioFor('\\frac{\\frac{1}{2}}{3}'), 1.75, 1e-6);
  approxEq(IR.inkRatioFor('\\sqrt{x}'), 1.3, 1e-6);
  approxEq(IR.inkRatioFor('x² + y₃'), 1.12, 1e-6);
});

check('inkRatioFor: MATHH চালু থাকলে math ও null-এ অক্ষর-শ্রেণির স্বাভাবিক অনুপাত', () => {
  globalThis.__FZ_ON_MATHH = true;
  approxEq(IR.inkRatioFor('α + β = ∞'), IR.INK_RATIO, 1e-6);
  approxEq(IR.inkRatioFor('কখগ'), 0.8, 1e-6);
  approxEq(IR.inkRatioFor('কিমি'), 0.83, 1e-6);
  approxEq(IR.inkRatioFor('কুল'), 0.85, 1e-6);
  approxEq(IR.inkRatioFor('কৃষি'), 1.0, 1e-6);
});

check('inkRatioFor: সুইচ বন্ধে (__FZ_ON_MATHH = false) আগের মান দেয়', () => {
  globalThis.__FZ_ON_MATHH = false;
  approxEq(IR.inkRatioFor('\\frac{1}{2}'), 0.92, 1e-6);
  approxEq(IR.inkRatioFor('\\frac{\\frac{1}{2}}{3}'), 0.92, 1e-6);
  approxEq(IR.inkRatioFor('\\sqrt{x}'), 0.92, 1e-6);
  approxEq(IR.inkRatioFor('x²'), 0.47, 1e-6);
  approxEq(IR.inkRatioFor('কখগ'), 0.8, 1e-6);
});

// ৪. সুইচ বন্ধে itemH ও textH আগের মান দেয় কিনা
check('সুইচ বন্ধে textH ও itemH: সমীকরণযুক্ত অনুচ্ছেদে আগের মান অপরিবর্তিত', () => {
  globalThis.__FZ_ON_MATHH = false;
  const para1 = {
    kind: 'para',
    fontPt: 12,
    text: 'মান নির্ণয় কর: \\frac{x+1}{x-1}',
    lines: ['মান নির্ণয় কর: \\frac{x+1}{x-1}'],
    rect: { x: 54, y: 100, w: 300, h: 30 }
  };
  approxEq(Builder.textH(para1), 12 * 1.15, 1e-6);
  approxEq(Builder.itemH(para1), 12 * 1.15, 1e-6);

  const para2 = {
    kind: 'para',
    fontPt: 10,
    keepLines: true,
    lines: ['১) \\frac{1}{2}', '২) \\sqrt{x^2+1}', '৩) x² + y₃'],
    text: '১) \\frac{1}{2}\n২) \\sqrt{x^2+1}\n৩) x² + y₃'
  };
  approxEq(Builder.textH(para2), 3 * 10 * 1.15, 1e-6);
  approxEq(Builder.itemH(para2), 3 * 10 * 1.15, 1e-6);
});

check('সুইচ বন্ধে itemH: সমীকরণযুক্ত টেবিল ও চিত্রে আগের মান অপরিবর্তিত', () => {
  globalThis.__FZ_ON_MATHH = false;
  const tbl = {
    kind: 'table',
    fontPt: 11,
    widthPt: 400,
    heightPt: 40,
    rows: [
      ['১', '\\frac{a}{b} + \\frac{c}{d}'],
      ['২', 'সাধারণ সারি']
    ]
  };
  approxEq(Builder.itemH(tbl), 40.5, 1e-6);

  const fig = { kind: 'figure', heightPt: 45 };
  approxEq(Builder.itemH(fig), 47, 1e-6);
});

// ৫. প্রান্তিক ক্ষেত্র ১: একই লাইনে একাধিক ভগ্নাংশ
check('প্রান্তিক ক্ষেত্র ১ক: একই লাইনে একাধিক ভগ্নাংশে mathLineExtraPt কেবল ১ বার (১.০৫×) গণনা করে', () => {
  globalThis.__FZ_ON_MATHH = true;
  const fs = 12;
  approxEq(IR.mathLineExtraPt('\\frac{1}{2} + \\frac{3}{4}', fs), fs * 1.05, 1e-6);
  approxEq(IR.mathLineExtraPt('\\frac{1}{2} + \\frac{3}{4} - \\frac{5}{6} = 0', fs), fs * 1.05, 1e-6);
  approxEq(Builder.mathLineExtraPt('\\frac{x^{2}+1}{x-1} + \\frac{y_{1}+1}{y-1} = 2', fs), fs * 1.05, 1e-6);
});

check('প্রান্তিক ক্ষেত্র ১খ: একই লাইনে একাধিক ভগ্নাংশে mathExtraH, textH ও itemH দ্বিগুণ হয় না', () => {
  globalThis.__FZ_ON_MATHH = true;
  const fs = 12;
  const line = '\\frac{x^{2}+1}{x-1} + \\frac{y^{2}+1}{y-1} = 2';
  const para = {
    kind: 'para',
    fontPt: fs,
    text: line,
    lines: [line],
    rect: { x: 54, y: 120, w: 80, h: 24 }
  };
  approxEq(Builder.mathExtraH(para), fs * 1.05, 1e-6);
  approxEq(Builder.textH(para), fs * 1.15 + fs * 1.05, 1e-6);
  approxEq(Builder.itemH(para), fs * 1.15 + fs * 1.05, 1e-6);
});

// ৬. প্রান্তিক ক্ষেত্র ২: টেবিল-ঘরে \frac + বাংলা লেখা
check('প্রান্তিক ক্ষেত্র ২ক: মাপা সারি-উচ্চতা (rowHeightsPt) যথেষ্ট হলে \\frac + বাংলা লেখায় উচ্চতা দ্বিগুণ হয় না', () => {
  globalThis.__FZ_ON_MATHH = true;
  const tbl = {
    kind: 'table',
    fontPt: 11,
    widthPt: 400,
    heightPt: 55,
    rowHeightsPt: [30, 25],
    rows: [
      ['১', 'মান নির্ণয় কর: \\frac{ক+খ}{গ+ঘ} যেখানে ক ও খ ধনাত্মক'],
      ['২', 'সাধারণ বাংলা সারি']
    ]
  };
  approxEq(Builder.itemH(tbl), 55.5, 1e-6);
});

check('প্রান্তিক ক্ষেত্র ২খ: ফাঁকা সারিসহ টেবিলে \\frac + বাংলা লেখায় itemH দ্বিতীয়বার অতিরিক্ত উচ্চতা যোগ করে না', () => {
  globalThis.__FZ_ON_MATHH = true;
  const tbl = {
    kind: 'table',
    fontPt: 11,
    widthPt: 400,
    heightPt: 100,
    rows: [
      ['১', 'ভগ্নাংশ \\frac{x+1}{x-1} এর মান নির্ণয় কর'],
      ['২', 'সাধারণ বাংলা লেখা'],
      ['', '']
    ]
  };
  approxEq(Builder.itemH(tbl), 100.5, 1e-6);
});

check('প্রান্তিক ক্ষেত্র ২গ: উচ্চতাবিহীন টেবিলে \\frac + বাংলা লেখায় ঠিক ১ বার অতিরিক্ত উচ্চতা যোগ হয় ও exact লাইন-ক্লিপিং থাকে না', () => {
  globalThis.__FZ_ON_MATHH = true;
  const fs = 11;
  const tbl = {
    kind: 'table',
    fontPt: fs,
    widthPt: 400,
    rows: [
      ['১', 'মান নির্ণয় কর: \\frac{ক}{খ} এবং বাংলা বিবরণ']
    ]
  };
  approxEq(Builder.itemH(tbl), fs * 1.25 + fs * 1.05 + 0.5 + 0.75, 1e-6);

  // টেবিলের সমীকরণ-ঘরে w:lineRule="exact" বসে ভগ্নাংশ যেন কেটে না যায়
  const tblFitted = {
    kind: 'table',
    fontPt: 11,
    widthPt: 400,
    heightPt: 34,
    rowHeightsPt: [17, 17],
    rows: [
      ['১', 'মান \\frac{ক}{খ} নির্ণয়'],
      ['২', 'সাধারণ লেখা']
    ]
  };
  const { xml } = Builder.bodyXml({
    pages: [{
      page: 1, widthPt: 595, heightPt: 842,
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bands: [{ kind: 'flow', y0: 50, y1: 100, cells: [{ x0: 50, x1: 545, items: [tblFitted] }] }]
    }]
  });
  const firstRowMatch = /<w:tr>[\s\S]*?<\/w:tr>/.exec(xml);
  assert.ok(firstRowMatch && !/w:lineRule="exact"/.test(firstRowMatch[0]), 'সমীকরণ-ঘরে exact লাইন-ক্লিপিং নেই');
});

check('প্রান্তিক ক্ষেত্র ২ঘ: IR.build-এ একটি ঘরে \\frac + বাংলা লেখা থাকলে পুরো টেবিলের ফন্ট নষ্ট হয় না', () => {
  globalThis.__FZ_ON_MATHH = true;
  const capture = {
    pages: [{ page: 1, widthPt: 595, heightPt: 842 }],
    blocks: [{
      i: 0, page: 1, type: 'table', box: [100, 100, 200, 500],
      lines: [
        'ক্রমিক | বিবরণ',
        '১ | ভগ্নাংশ \\frac{a+b}{c+d} এবং বাংলা লেখা',
        '২ | সাধারণ বাংলা লাইন'
      ]
    }]
  };
  const measures = {
    0: { rectPt: { x: 60, y: 80, w: 400, h: 75 }, cellInkPt: 9.5, hasGrid: true, hRulesPt: [80, 105, 130, 155], textLinesPt: [92, 118, 142] }
  };
  const ir = IR.build(capture, measures, { 1: { widthPt: 595, heightPt: 842 } });
  const builtTbl = ir.pages[0].bands[0].cells[0].items[0];
  approxEq(builtTbl.fontPt, 9.5, 0.5);
});

// ৭. প্রান্তিক ক্ষেত্র ৩: ইউনিকোড সূচক (², ₃)
check('প্রান্তিক ক্ষেত্র ৩ক: একই লাইনে একাধিক ইউনিকোড সূচক (², ₃) থাকলে অতিরিক্ত উচ্চতা দ্বিগুণ হয় না', () => {
  globalThis.__FZ_ON_MATHH = true;
  const fs = 12;
  const pSupOnly = {
    kind: 'para',
    fontPt: fs,
    text: 'ক্ষেত্রফল = x² + y² + z² বর্গ একক',
    lines: ['ক্ষেত্রফল = x² + y² + z² বর্গ একক']
  };
  approxEq(Builder.mathExtraH(pSupOnly), fs * 0.28, 1e-6);

  const pSubOnly = {
    kind: 'para',
    fontPt: fs,
    text: 'সংকেত: H₂O + CO₂ + x₃',
    lines: ['সংকেত: H₂O + CO₂ + x₃']
  };
  approxEq(Builder.mathExtraH(pSubOnly), fs * 0.28, 1e-6);

  const pBoth = {
    kind: 'para',
    fontPt: fs,
    text: 'সমীকরণ: x² + H₂O + y₃',
    lines: ['সমীকরণ: x² + H₂O + y₃']
  };
  approxEq(Builder.mathExtraH(pBoth), fs * 0.38, 1e-6);
});

check('প্রান্তিক ক্ষেত্র ৩খ: বহুলইন অনুচ্ছেদে এক লাইনে ইউনিকোড সূচক/ভগ্নাংশ ও অন্য লাইনে সাধারণ বাংলা থাকলে দ্বিগুণ হয় না', () => {
  globalThis.__FZ_ON_MATHH = true;
  const fs = 12;
  const pTwoLines = {
    kind: 'para',
    fontPt: fs,
    hasEquation: true,
    mathKind: 'sup',
    text: '১) ক্ষেত্রফল = ১০ মি²\n২) সাধারণ বাংলা লাইন',
    lines: ['১) ক্ষেত্রফল = ১০ মি²', '২) সাধারণ বাংলা লাইন']
  };
  approxEq(Builder.mathExtraH(pTwoLines), fs * 0.28, 1e-6);

  // IR.build-এর mathExtraPt-এও শুধু সমীকরণ-যুক্ত লাইনের বাড়তি উচ্চতা যোগ হয়
  const capture = {
    pages: [{ page: 1, widthPt: 595, heightPt: 842 }],
    blocks: [{
      i: 0, page: 1, type: 'paragraph', box: [100, 100, 150, 400],
      lines: ['১) ক্ষেত্রফল = ১০ মি²', '২) সাধারণ বাংলা লাইন'],
      text: '১) ক্ষেত্রফল = ১০ মি²\n২) সাধারণ বাংলা লাইন'
    }]
  };
  const ir = IR.build(capture, {}, { 1: { widthPt: 595, heightPt: 842 } });
  const item = ir.pages[0].bands[0].cells[0].items[0];
  approxEq(item.mathExtraPt, Math.round(12 * 0.28 * 10) / 10, 1e-6);
});

check('প্রান্তিক ক্ষেত্র ৩গ: মাপা lineSpacingPt ইতিমধ্যে যথেষ্ট বড় হলে ইউনিকোড সূচকের উচ্চতা দ্বিতীয়বার যোগ হয় না', () => {
  globalThis.__FZ_ON_MATHH = true;
  const fs = 12;
  const pMeasuredLs = {
    kind: 'para',
    fontPt: fs,
    lineSpacingPt: 18,
    text: 'ক্ষেত্রফল = ১০ মি² ও আয়তন = ২০ মি³',
    lines: ['ক্ষেত্রফল = ১০ মি² ও আয়তন = ২০ মি³']
  };
  approxEq(Builder.mathExtraH(pMeasuredLs), 0, 1e-6);
  approxEq(Builder.textH(pMeasuredLs), 18, 1e-6);
});

// ৮. planPage-এ ফাঁক কমানোর (সর্বোচ্চ ৭৫%) নিয়ম শুধু MATHH চালু থাকলে খাটে
const makeOverflowPage = (needExtra) => ({
  page: 1,
  widthPt: 595,
  heightPt: 300,
  margins: { top: 40, bottom: 40, left: 50, right: 50 },
  bands: [
    {
      kind: 'flow',
      y0: 40,
      y1: 280,
      cells: [{
        x0: 50,
        x1: 545,
        items: [
          { kind: 'figure', heightPt: 98, rect: { x: 50, y: 40, w: 200, h: 98 } },
          { kind: 'figure', heightPt: 98 + needExtra, rect: { x: 50, y: 240, w: 200, h: 98 + needExtra } }
        ]
      }]
    }
  ]
});

check('planPage: সুইচ বন্ধে (__FZ_ON_MATHH = false) ফাঁক সর্বোচ্চ ৬০% কমে (৭৫% নিয়ম খাটে না)', () => {
  globalThis.__FZ_ON_MATHH = false;
  const resOff = Builder.planPage(makeOverflowPage(14)); // প্রাথমিক before = 100, need = 70
  approxEq(resOff.els[1].before, 40, 1e-6);
  approxEq(resOff.f, 0.75, 1e-6);
});

check('planPage: MATHH চালু থাকলে (__FZ_ON_MATHH = true) ৭৫% পর্যন্ত ফাঁক সরাসরি কমে', () => {
  globalThis.__FZ_ON_MATHH = true;
  const resOn70 = Builder.planPage(makeOverflowPage(14)); // প্রাথমিক before = 100, need = 70
  approxEq(resOn70.els[1].before, 30, 1e-6);
  approxEq(resOn70.f, 1, 1e-6);
});

check('planPage: MATHH চালু থাকলে ঘাটতি ৭৫%-এর বেশি হলেও ফাঁক ৭৫%-এর বেশি কমে না (≥২৫% অক্ষত)', () => {
  globalThis.__FZ_ON_MATHH = true;
  const resOn85 = Builder.planPage(makeOverflowPage(29)); // প্রাথমিক before = 100, need = 85 (> 75)
  approxEq(resOn85.els[1].before, 25, 1e-6);
  approxEq(resOn85.f, 1, 1e-6);
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
