#!/usr/bin/env node
/**
 * লেআউট-রেজিস্ট্রি যাচাই পরীক্ষা (Layout Registry Unit & Integration Tests)
 *
 *   node tests/layout-registry.test.mjs
 *
 * docs/LAYOUT_REGISTRY.md (অনুচ্ছেদ ২.১, ২.২, ৪.১) অনুযায়ী `FayzarLayoutRegistry`-এর
 * আলিয়াস সমাধান, উপ-লেআউট নির্বাচন (`selectSubLayout`), ডিফল্ট ও ওভাররাইড সেটিংস,
 * অজানা `docType` → `null`, পার্স/রেন্ডার ডেলিগেশন, সকল `ARCHETYPE_TO_DOCTYPE` এন্ট্রি
 * এবং `__FZ_ON_REGISTRY` সুইচ-নিয়ন্ত্রিত `ArchetypeMap` হুক যাচাই করে।
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);

const registryPath = path.join(ROOT, 'js', 'layout-engine', 'layout-registry.js');
const archetypePath = path.join(ROOT, 'js', 'layout-engine', 'archetype-map.js');
const cashMemoPath = path.join(ROOT, 'js', 'layout-engine', 'cash-memo-layout.js');
const receiptPath = path.join(ROOT, 'js', 'layout-engine', 'receipt-layout.js');

const FayzarLayoutRegistry = require(registryPath);
const ArchetypeMap = require(archetypePath);

const FayzarCashMemoLayout = fs.existsSync(cashMemoPath)
  ? require(cashMemoPath)
  : (global.FayzarCashMemoLayout = {
      parse: (raw) => ({ kind: 'CASH_MEMO_LAYOUT', raw }),
      renderHtml: (m) => `<div class="cash-memo">${m.kind}</div>`,
      renderDocx: (m, h) => h.runs(m.kind, { sz: 20 }),
      renderRtf: (m, h) => h.rtf(m.kind)
    });

const FayzarReceiptLayout = fs.existsSync(receiptPath)
  ? require(receiptPath)
  : (global.FayzarReceiptLayout = {
      parse: (raw, opts = {}) => ({
        kind: 'RECEIPT_LAYOUT',
        variant: opts.memoKind === 'voucher' ? 'voucher' : 'receipt',
        raw
      }),
      renderHtml: (m) => `<div class="receipt-${m.variant}">${m.kind}</div>`,
      renderDocx: (m, h) => h.runs(`${m.kind}:${m.variant}`, { sz: 20 }),
      renderRtf: (m, h) => h.rtf(`${m.kind}:${m.variant}`)
    });

let passedGates = 0;
let failedGates = 0;
const gateFailures = [];

function checkGate(name, ok, detail = '') {
  if (ok) {
    passedGates++;
  } else {
    failedGates++;
    gateFailures.push(detail ? `${name} — ${detail}` : name);
  }
}

// ============================================================================
// গেট ১: UMD এক্সপোর্ট ও মৌলিক মেথডসমূহ
// ============================================================================
checkGate(
  'UMD এক্সপোর্ট ও global.FayzarLayoutRegistry উপস্থিত',
  Boolean(FayzarLayoutRegistry) && global.FayzarLayoutRegistry === FayzarLayoutRegistry,
  'global.FayzarLayoutRegistry পাওয়া যায়নি'
);

checkGate(
  'আবশ্যক পদ্ধতি (register, get, list, resolve) বিদ্যমান',
  typeof FayzarLayoutRegistry.register === 'function' &&
    typeof FayzarLayoutRegistry.get === 'function' &&
    typeof FayzarLayoutRegistry.list === 'function' &&
    typeof FayzarLayoutRegistry.resolve === 'function',
  'এক বা একাধিক মেথড অনুপস্থিত'
);

const allEntries = FayzarLayoutRegistry.list();
checkGate(
  'list() নিবন্ধিত এন্ট্রির তালিকা প্রদান করে এবং CASH_MEMO ও সকল DOC_TYPE অন্তর্ভুক্ত',
  Array.isArray(allEntries) &&
    allEntries.length >= 15 &&
    allEntries.some((e) => e && e.id === 'CASH_MEMO'),
  `entries count=${Array.isArray(allEntries) ? allEntries.length : 'not-array'}`
);

// ============================================================================
// গেট ২: CASH_MEMO এন্ট্রি মেটাডেটা ও আলিয়াস (Aliases) যাচাই
// ============================================================================
const cashMemoEntry = FayzarLayoutRegistry.get('CASH_MEMO');
checkGate(
  'get("CASH_MEMO") মূল এন্ট্রি রিটার্ন করে',
  Boolean(cashMemoEntry) && cashMemoEntry.id === 'CASH_MEMO',
  `got ${cashMemoEntry ? cashMemoEntry.id : 'null'}`
);

const expectedAliases = ['CASHMEMO', 'MEMO', 'RECEIPT', 'MONEY_RECEIPT', 'VOUCHER'];
checkGate(
  'CASH_MEMO এন্ট্রির aliases তালিকা সঠিক',
  Boolean(cashMemoEntry) &&
    Array.isArray(cashMemoEntry.aliases) &&
    expectedAliases.every((a) => cashMemoEntry.aliases.includes(a)) &&
    cashMemoEntry.aliases.length === expectedAliases.length,
  `aliases=${JSON.stringify(cashMemoEntry && cashMemoEntry.aliases)}`
);

for (const alias of expectedAliases) {
  const byAlias = FayzarLayoutRegistry.get(alias);
  const byLower = FayzarLayoutRegistry.get(alias.toLowerCase());
  checkGate(
    `get("${alias}") ও ছোট হাতের আলিয়াস CASH_MEMO এন্ট্রি দেয়`,
    byAlias === cashMemoEntry && byLower === cashMemoEntry,
    `alias=${alias} -> ${byAlias ? byAlias.id : 'null'}`
  );
}

const expectedSubLayouts = ['cash-memo', 'receipt', 'voucher'];
checkGate(
  'CASH_MEMO মেটাডেটা (subLayouts, labelBn, category, isNonExam) সঠিক',
  Boolean(cashMemoEntry) &&
    JSON.stringify(cashMemoEntry.subLayouts) === JSON.stringify(expectedSubLayouts) &&
    cashMemoEntry.labelBn === 'ক্যাশ মেমো / রসিদ / ভাউচার' &&
    cashMemoEntry.category === 'commerce' &&
    cashMemoEntry.isNonExam === true,
  `meta=${JSON.stringify({
    subLayouts: cashMemoEntry && cashMemoEntry.subLayouts,
    labelBn: cashMemoEntry && cashMemoEntry.labelBn,
    category: cashMemoEntry && cashMemoEntry.category,
    isNonExam: cashMemoEntry && cashMemoEntry.isNonExam
  })}`
);

// ============================================================================
// গেট ৩: defaultSettings ও resolve() সেটিংস যাচাই
// ============================================================================
const expectedDefaults = {
  paper: 'A4',
  orientation: 'landscape',
  columns: 1,
  booklet: false,
  copies: 2,
  fontSizePt: 10,
  lineSpacing: 1.15,
  marginsTwips: { top: 720, bottom: 720, left: 720, right: 720 }
};

checkGate(
  'CASH_MEMO.defaultSettings স্পেসিফিকেশন অনুযায়ী হুবহু সঠিক',
  Boolean(cashMemoEntry) &&
    JSON.stringify(cashMemoEntry.defaultSettings) === JSON.stringify(expectedDefaults),
  `actual=${JSON.stringify(cashMemoEntry && cashMemoEntry.defaultSettings)}`
);

const resolvedDefault = FayzarLayoutRegistry.resolve('CASH_MEMO', {}, '# বিসমিল্লাহ স্টোর\nক্যাশ মেমো');
checkGate(
  'resolve("CASH_MEMO", {}, text) সঠিক { entry, subLayout, settings } রিটার্ন করে',
  Boolean(resolvedDefault) &&
    resolvedDefault.entry === cashMemoEntry &&
    resolvedDefault.subLayout === 'cash-memo' &&
    JSON.stringify(resolvedDefault.settings) === JSON.stringify(expectedDefaults),
  `resolved=${JSON.stringify(resolvedDefault && { subLayout: resolvedDefault.subLayout, settings: resolvedDefault.settings })}`
);

// সেটিংস মিউটেশন সুরক্ষা ও ফ্রন্টম্যাটার ওভাররাইড যাচাই
resolvedDefault.settings.copies = 99;
resolvedDefault.settings.marginsTwips.top = 9999;
checkGate(
  'resolve() থেকে প্রাপ্ত settings পরিবর্তন করলে মূল defaultSettings অপরিবর্তিত থাকে',
  cashMemoEntry.defaultSettings.copies === 2 && cashMemoEntry.defaultSettings.marginsTwips.top === 720,
  `defaultSettings=${JSON.stringify(cashMemoEntry.defaultSettings)}`
);

const resolvedOverride = FayzarLayoutRegistry.resolve(
  'MEMO',
  { copies: 3, orientation: 'portrait', fontSizePt: 9, marginsTwips: { top: 500 } },
  '# আল-আমিন স্টোর'
);
checkGate(
  'resolve() আলিয়াস ও ফ্রন্টম্যাটার সেটিংস ওভাররাইড সমর্থন করে',
  Boolean(resolvedOverride) &&
    resolvedOverride.entry === cashMemoEntry &&
    resolvedOverride.settings.copies === 3 &&
    resolvedOverride.settings.orientation === 'portrait' &&
    resolvedOverride.settings.fontSizePt === 9 &&
    resolvedOverride.settings.marginsTwips.top === 500 &&
    resolvedOverride.settings.marginsTwips.bottom === 720,
  `override settings=${JSON.stringify(resolvedOverride && resolvedOverride.settings)}`
);

// ============================================================================
// গেট ৪: selectSubLayout — উপ-লেআউট নির্বাচন ও ফ্রন্টম্যাটার অগ্রাধিকার
// ============================================================================
checkGate(
  'selectSubLayout: "টাকা প্রাপ্তির রসিদ" -> "receipt"',
  cashMemoEntry.selectSubLayout({}, '# জনতা ফাউন্ডেশন\nটাকা প্রাপ্তির রসিদ\nনাম: করিম') === 'receipt' &&
    FayzarLayoutRegistry.resolve('CASH_MEMO', {}, 'টাকা প্রাপ্তির রসিদ').subLayout === 'receipt',
  'receipt শনাক্ত হয়নি'
);

checkGate(
  'selectSubLayout: "মানি রিসিট" -> "receipt"',
  cashMemoEntry.selectSubLayout({}, '# আদর্শ বিদ্যালয়\nমানি রিসিট\nরসিদ নং: ১০১') === 'receipt' &&
    FayzarLayoutRegistry.resolve('RECEIPT', {}, 'মানি রিসিট').subLayout === 'receipt',
  'মানি রিসিট -> receipt শনাক্ত হয়নি'
);

checkGate(
  'selectSubLayout: "ভাউচার" -> "voucher"',
  cashMemoEntry.selectSubLayout({}, '# মেসার্স করিম ট্রেডার্স\nভাউচার\n| ক্রমিক | বিবরণ | টাকা |') === 'voucher' &&
    FayzarLayoutRegistry.resolve('VOUCHER', {}, 'ভাউচার নং: ১২').subLayout === 'voucher',
  'ভাউচার -> voucher শনাক্ত হয়নি'
);

checkGate(
  'selectSubLayout: "খরচের ভাউচার" -> "voucher"',
  cashMemoEntry.selectSubLayout({}, '# পদ্মা এন্টারপ্রাইজ\nখরচের ভাউচার\nতারিখ: ১৮/১০/২০২৬') === 'voucher' &&
    FayzarLayoutRegistry.resolve('CASH_MEMO', {}, 'খরচের ভাউচার').subLayout === 'voucher',
  'খরচের ভাউচার -> voucher শনাক্ত হয়নি'
);

checkGate(
  'selectSubLayout: সাধারণ ক্যাশমেমো বা অন্য লেখা -> "cash-memo"',
  cashMemoEntry.selectSubLayout({}, '# বিসমিল্লাহ স্টোর\nক্যাশ মেমো\n| ক্রমিক | বিবরণ | পরিমাণ | দর | টাকা |') === 'cash-memo' &&
    cashMemoEntry.selectSubLayout({}, 'সাধারণ মেমো টেক্সট') === 'cash-memo',
  'ডিফল্ট cash-memo পাওয়া যায়নি'
);

checkGate(
  'selectSubLayout: ফ্রন্টম্যাটারে স্পষ্ট sub_layout থাকলে লেখার চেয়ে সেটি অগ্রাধিকার পায়',
  cashMemoEntry.selectSubLayout({ sub_layout: 'voucher' }, 'টাকা প্রাপ্তির রসিদ') === 'voucher' &&
    cashMemoEntry.selectSubLayout({ sub_layout: 'receipt' }, 'খরচের ভাউচার') === 'receipt' &&
    cashMemoEntry.selectSubLayout({ sub_layout: 'cash-memo' }, 'টাকা প্রাপ্তির রসিদ ও ভাউচার') === 'cash-memo' &&
    FayzarLayoutRegistry.resolve('CASH_MEMO', { sub_layout: 'voucher' }, 'মানি রিসিট').subLayout === 'voucher',
  'frontmatter sub_layout অগ্রাধিকার কাজ করেনি'
);

// ============================================================================
// গেট ৫: অজানা docType -> null
// ============================================================================
checkGate(
  'get() ও resolve(): অজানা বা ফাঁকা docType হলে null রিটার্ন করে',
  FayzarLayoutRegistry.get('UNKNOWN_DOCTYPE') === null &&
    FayzarLayoutRegistry.get('') === null &&
    FayzarLayoutRegistry.get(null) === null &&
    FayzarLayoutRegistry.resolve('UNKNOWN_DOCTYPE', {}, 'ক্যাশ মেমো') === null &&
    FayzarLayoutRegistry.resolve('', {}, 'টাকা প্রাপ্তির রসিদ') === null &&
    FayzarLayoutRegistry.resolve(null, {}, 'ভাউচার') === null,
  'অজানা docType-এ null পাওয়া যায়নি'
);

// ============================================================================
// গেট ৬: parse / renderHtml / renderDocx / renderRtf ডেলিগেশন ও Error যাচাই
// ============================================================================
const sampleCashMemoMd = [
  '---',
  'doc_type: CASH_MEMO',
  'copies: 2',
  '---',
  '# বিসমিল্লাহ স্টোর',
  'প্রোঃ মোঃ আব্দুল করিম',
  'ক্যাশ মেমো',
  'নাম: ...................... তারিখ: ......................',
  '| ক্রমিক | বিবরণ | পরিমাণ | দর | টাকা |',
  '| --- | --- | --- | --- | --- |',
  '| ১ | খাতা | ২ ডজন | ২০০ | ৪০০ |',
  '| সর্বমোট | | | | ৪০০ |',
  'কথায়: চারশত টাকা মাত্র।',
  'ক্রেতার স্বাক্ষর                      বিক্রেতার স্বাক্ষর'
].join('\n');

const sampleReceiptMd = [
  '---',
  'doc_type: CASH_MEMO',
  'memo_kind: receipt',
  'copies: 2',
  '---',
  '# আল-ফালাহ একাডেমি',
  'টাকা প্রাপ্তির রসিদ',
  'রসিদ নং: ১০৫    তারিখ: ১৮/১০/২০২৬',
  'জনাব/বেগম আব্দুল্লাহ হতে এক হাজার টাকা মাত্র নগদ বুঝিয়া পাইলাম।',
  'টাকা: ১০০০/-',
  'প্রাপকের স্বাক্ষর                      আদায়কারীর স্বাক্ষর'
].join('\n');

const sampleVoucherMd = [
  '---',
  'doc_type: CASH_MEMO',
  'memo_kind: voucher',
  'copies: 1',
  '---',
  '# মেসার্স করিম ট্রেডার্স',
  'খরচের ভাউচার',
  'ভাউচার নং: ১২    তারিখ: ১৮/১০/২০২৬',
  '| ক্রমিক | বিবরণ | টাকা |',
  '| --- | --- | --- |',
  '| ১ | যাতায়াত খরচ | ৫০০ |',
  '| মোট | | ৫০০ |',
  'প্রস্তুতকারী          হিসাবরক্ষক          অনুমোদনকারী'
].join('\n');

const docxHelper = {
  runs: (t, st) => `<w:r><w:rPr><w:sz w:val="${(st && st.sz) || 20}"/></w:rPr><w:t>${t}</w:t></w:r>`
};
const rtfHelper = {
  rtf: (t) => String(t || '')
};

// ৬.১ cash-memo ডেলিগেশন যাচাই
const cmAst = cashMemoEntry.parse(sampleCashMemoMd, { subLayout: 'cash-memo' });
const cmAstDirect = FayzarCashMemoLayout.parse(sampleCashMemoMd, { subLayout: 'cash-memo' });
checkGate(
  'parse/render (cash-memo): FayzarCashMemoLayout-এর সাথে হুবহু মিলে যায়',
  cmAst.kind === 'CASH_MEMO_LAYOUT' &&
    JSON.stringify(cmAst) === JSON.stringify(cmAstDirect) &&
    cashMemoEntry.renderHtml(cmAst) === FayzarCashMemoLayout.renderHtml(cmAst) &&
    cashMemoEntry.renderDocx(cmAst, docxHelper) === FayzarCashMemoLayout.renderDocx(cmAst, docxHelper) &&
    cashMemoEntry.renderRtf(cmAst, rtfHelper) === FayzarCashMemoLayout.renderRtf(cmAst, rtfHelper),
  'cash-memo ডেলিগেশনে অমিল'
);

// ৬.২ receipt ডেলিগেশন যাচাই
const rcAst = cashMemoEntry.parse(sampleReceiptMd, { subLayout: 'receipt' });
const rcAstDirect = FayzarReceiptLayout.parse(sampleReceiptMd, { memoKind: 'receipt', subLayout: 'receipt' });
checkGate(
  'parse/render (receipt): FayzarReceiptLayout-এর সাথে হুবহু মিলে যায়',
  rcAst.kind === 'RECEIPT_LAYOUT' &&
    rcAst.variant === 'receipt' &&
    JSON.stringify(rcAst) === JSON.stringify(rcAstDirect) &&
    cashMemoEntry.renderHtml(rcAst) === FayzarReceiptLayout.renderHtml(rcAst) &&
    cashMemoEntry.renderDocx(rcAst, docxHelper) === FayzarReceiptLayout.renderDocx(rcAst, docxHelper) &&
    cashMemoEntry.renderRtf(rcAst, rtfHelper) === FayzarReceiptLayout.renderRtf(rcAst, rtfHelper),
  'receipt ডেলিগেশনে অমিল'
);

// ৬.৩ voucher ডেলিগেশন যাচাই (voucher আপাতত receipt মডিউল ব্যবহার করে)
const vcAst = cashMemoEntry.parse(sampleVoucherMd, { subLayout: 'voucher' });
const vcAstDirect = FayzarReceiptLayout.parse(sampleVoucherMd, { memoKind: 'voucher', subLayout: 'voucher' });
checkGate(
  'parse/render (voucher): FayzarReceiptLayout (variant=voucher)-এর সাথে হুবহু মিলে যায়',
  vcAst.kind === 'RECEIPT_LAYOUT' &&
    vcAst.variant === 'voucher' &&
    JSON.stringify(vcAst) === JSON.stringify(vcAstDirect) &&
    cashMemoEntry.renderHtml(vcAst) === FayzarReceiptLayout.renderHtml(vcAst) &&
    cashMemoEntry.renderDocx(vcAst, docxHelper) === FayzarReceiptLayout.renderDocx(vcAst, docxHelper) &&
    cashMemoEntry.renderRtf(vcAst, rtfHelper) === FayzarReceiptLayout.renderRtf(vcAst, rtfHelper),
  'voucher ডেলিগেশনে অমিল'
);

// ৬.৪ মডিউল না থাকলে স্পষ্ট Error ছোড়ে কি না যাচাই
const savedCashMemoMod = global.FayzarCashMemoLayout;
const savedReceiptMod = global.FayzarReceiptLayout;
let missingCashMemoThrew = false;
let missingReceiptThrew = false;
try {
  delete global.FayzarCashMemoLayout;
  cashMemoEntry.parse(sampleCashMemoMd, { subLayout: 'cash-memo' });
} catch (err) {
  missingCashMemoThrew = err instanceof Error && /FayzarCashMemoLayout/.test(err.message);
} finally {
  global.FayzarCashMemoLayout = savedCashMemoMod;
}

try {
  delete global.FayzarReceiptLayout;
  cashMemoEntry.parse(sampleReceiptMd, { subLayout: 'receipt' });
} catch (err) {
  missingReceiptThrew = err instanceof Error && /FayzarReceiptLayout/.test(err.message);
} finally {
  global.FayzarReceiptLayout = savedReceiptMod;
}

checkGate(
  'লেআউট মডিউল অনুপস্থিত থাকলে parse/render স্পষ্ট Error ছোড়ে',
  missingCashMemoThrew && missingReceiptThrew,
  `cashMemoError=${missingCashMemoThrew}, receiptError=${missingReceiptThrew}`
);

// ============================================================================
// গেট ৭: ArchetypeMap হুক (__FZ_ON_REGISTRY সুইচ-নিয়ন্ত্রিত) ও ফলব্যাক আচরণ যাচাই
// ============================================================================
const savedSwitch = global.__FZ_ON_REGISTRY;

// ৭.১ সুইচ বন্ধ (ডিফল্ট) থাকলে রেজিস্ট্রি লোড থাকা সত্ত্বেও toDocType আগের মতো কাজ করে
delete global.__FZ_ON_REGISTRY;
checkGate(
  'ArchetypeMap: __FZ_ON_REGISTRY বন্ধ থাকলে রেজিস্ট্রি লোড থাকলেও toDocType আগের মতো আচরণ করে',
  ArchetypeMap.toDocType('CASH_MEMO') === 'GENERAL' &&
    ArchetypeMap.toDocType('RECEIPT') === 'GENERAL' &&
    ArchetypeMap.toDocType('VOUCHER') === 'GENERAL' &&
    ArchetypeMap.toDocType('bengali_combined_exam_paper') === 'EXAM_COMBINED' &&
    ArchetypeMap.toDocType('bengali_cq_paper') === 'EXAM_CQ' &&
    ArchetypeMap.toDocType('bengali_mcq_paper') === 'EXAM_MCQ' &&
    ArchetypeMap.toDocType('govt_application') === 'GOVT_APP' &&
    ArchetypeMap.toDocType('unknown_archetype') === 'GENERAL' &&
    ArchetypeMap.toDocType('') === 'GENERAL' &&
    ArchetypeMap.toDocType(null) === 'GENERAL',
  `switch off CASH_MEMO -> ${ArchetypeMap.toDocType('CASH_MEMO')}`
);

// ৭.২ সুইচ চালু (__FZ_ON_REGISTRY = true) থাকলে রেজিস্ট্রি হুক সক্রিয় হয়
global.__FZ_ON_REGISTRY = true;
checkGate(
  'ArchetypeMap: __FZ_ON_REGISTRY চালু থাকলে CASH_MEMO ও এর আলিয়াসগুলো ম্যাপ হয়',
  ArchetypeMap.toDocType('CASH_MEMO') === 'CASH_MEMO' &&
    ArchetypeMap.toDocType('RECEIPT') === 'CASH_MEMO' &&
    ArchetypeMap.toDocType('VOUCHER') === 'CASH_MEMO' &&
    ArchetypeMap.toDocType('cash-memo') === 'CASH_MEMO',
  `got ${ArchetypeMap.toDocType('CASH_MEMO')}`
);

checkGate(
  'ArchetypeMap: __FZ_ON_REGISTRY চালু থাকলেও বিদ্যমান আর্কিটাইপগুলোর আচরণ হুবহু অপরিবর্তিত',
  ArchetypeMap.toDocType('bengali_combined_exam_paper') === 'EXAM_COMBINED' &&
    ArchetypeMap.toDocType('bengali_cq_paper') === 'EXAM_CQ' &&
    ArchetypeMap.toDocType('bengali_mcq_paper') === 'EXAM_MCQ' &&
    ArchetypeMap.toDocType('govt_application') === 'GOVT_APP' &&
    ArchetypeMap.toDocType('unknown_archetype') === 'GENERAL' &&
    ArchetypeMap.toDocType('') === 'GENERAL' &&
    ArchetypeMap.toDocType(null) === 'GENERAL',
  'বিদ্যমান আর্কিটাইপ ম্যাপিং পরিবর্তিত হয়েছে'
);

const savedRegistry = global.FayzarLayoutRegistry;
let withoutRegistryOk = false;
try {
  delete global.FayzarLayoutRegistry;
  withoutRegistryOk =
    ArchetypeMap.toDocType('bengali_cq_paper') === 'EXAM_CQ' &&
    ArchetypeMap.toDocType('office_pad') === 'OFFICE_PAD' &&
    ArchetypeMap.toDocType('CASH_MEMO') === 'GENERAL' &&
    ArchetypeMap.toDocType(null) === 'GENERAL';
} finally {
  global.FayzarLayoutRegistry = savedRegistry;
  if (savedSwitch === undefined) {
    delete global.__FZ_ON_REGISTRY;
  } else {
    global.__FZ_ON_REGISTRY = savedSwitch;
  }
}

checkGate(
  'ArchetypeMap: FayzarLayoutRegistry না থাকলে বিদ্যমান আচরণ হুবহু অপরিবর্তিত',
  withoutRegistryOk,
  'রেজিস্ট্রি ছাড়া ফলব্যাক আচরণ ব্যর্থ'
);

// ============================================================================
// গেট ৮: ARCHETYPE_TO_DOCTYPE-এর প্রতিটি আর্কিটাইপের রেজিস্ট্রি এন্ট্রি যাচাই (১৬টি গেট)
// ============================================================================
const archetypeEntries = Object.entries(ArchetypeMap.ARCHETYPE_TO_DOCTYPE);

for (const [archetypeKey, expectedDocType] of archetypeEntries) {
  const byArchetype = FayzarLayoutRegistry.get(archetypeKey);
  const byDocType = FayzarLayoutRegistry.get(expectedDocType);
  const resolvedArch = FayzarLayoutRegistry.resolve(archetypeKey, {}, '');
  const resolvedDoc = FayzarLayoutRegistry.resolve(expectedDocType, {}, '');

  delete global.__FZ_ON_REGISTRY;
  const mappedWhenOff = ArchetypeMap.toDocType(archetypeKey);

  global.__FZ_ON_REGISTRY = true;
  const mappedWhenOn = ArchetypeMap.toDocType(archetypeKey);
  const mappedDocTypeWhenOn = ArchetypeMap.toDocType(expectedDocType);
  delete global.__FZ_ON_REGISTRY;

  const expectedSubLayout = archetypeKey.replace(/_/g, '-');
  const ok =
    Boolean(byArchetype) &&
    Boolean(byDocType) &&
    byArchetype === byDocType &&
    byArchetype.id === expectedDocType &&
    Array.isArray(byArchetype.archetypes) &&
    byArchetype.archetypes.includes(archetypeKey) &&
    Array.isArray(byArchetype.aliases) &&
    byArchetype.aliases.includes(archetypeKey) &&
    Array.isArray(byArchetype.subLayouts) &&
    byArchetype.subLayouts.includes(expectedSubLayout) &&
    Boolean(byArchetype.defaultSettings) &&
    typeof byArchetype.defaultSettings.paper === 'string' &&
    Boolean(resolvedArch) &&
    resolvedArch.entry === byDocType &&
    resolvedArch.subLayout === expectedSubLayout &&
    Boolean(resolvedDoc) &&
    resolvedDoc.entry === byDocType &&
    mappedWhenOff === expectedDocType &&
    mappedWhenOn === expectedDocType &&
    mappedDocTypeWhenOn === expectedDocType;

  checkGate(
    `আর্কিটাইপ রেজিস্ট্রি গেট: "${archetypeKey}" -> "${expectedDocType}" (subLayout="${expectedSubLayout}")`,
    ok,
    `byArch=${byArchetype && byArchetype.id}, subLayout=${resolvedArch && resolvedArch.subLayout}, off=${mappedWhenOff}, on=${mappedWhenOn}`
  );
}

if (savedSwitch === undefined) {
  delete global.__FZ_ON_REGISTRY;
} else {
  global.__FZ_ON_REGISTRY = savedSwitch;
}

// ============================================================================
// সংক্ষিপ্ত রিপোর্ট প্রিন্ট
// ============================================================================
console.log('=== FayzarLayoutRegistry পরীক্ষা রিপোর্ট (CASH_MEMO + ARCHETYPE_TO_DOCTYPE) ===');
console.log(`মোট যাচাইকৃত গেট: ${passedGates + failedGates}`);

if (gateFailures.length > 0) {
  console.error('\nগেট ত্রুটি:');
  for (const gf of gateFailures) {
    console.error(`  - ${gf}`);
  }
}

console.log(`\nফলাফল: ${passedGates} পাস, ${failedGates} ব্যর্থ`);
process.exit(failedGates > 0 ? 1 : 0);
