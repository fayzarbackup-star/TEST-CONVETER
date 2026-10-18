#!/usr/bin/env node
/**
 * C_CLS_PAD_v5 / C_CLS_PAD_FIX_v6: প্যাড-নোটিশ ও প্যাড-আবেদন → OFFICE_PAD এবং টেমপ্লেট-তালা যাচাই টেস্ট
 *
 *   node tests/cls-pad-v5.test.mjs
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const FDIR = path.join(ROOT, 'tests', 'fixtures');
const EXPECTED_PATH = path.join(FDIR, 'classify-expected.json');

const require = createRequire(import.meta.url);
const DocClassifier = require(path.join(ROOT, 'js', 'engines', 'doc-classifier.js'));
const tcPath = path.join(ROOT, 'js', 'layout-engine', 'template-composer.js');
const TemplateComposer = fs.existsSync(tcPath) ? require(tcPath) : null;

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(detail ? `${name} — ${detail}` : name);
  }
}

function stripFrontmatter(md) {
  return String(md || '').replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n)?/, '');
}

function stripDocTypeFromFrontmatter(md) {
  return String(md || '').replace(/^---\s*\r?\n([\s\S]*?)\r?\n---/, (_m, fm) => {
    const kept = fm
      .split(/\r?\n/)
      .filter((line) => !/^\s*(?:doc_type|type|layout)\s*:/i.test(line))
      .join('\n');
    return kept.trim() ? `---\n${kept}\n---` : '';
  });
}

const FALLBACK_PAD_NOTICE = `---
doc_type: OFFICE_PAD
columns: 1
content: OTHER
---
# দিনাজপুর জেলা আহ্বায়ক কমিটি
(অস্থায়ী কার্যালয়: গণেশতলা, দিনাজপুর)
স্মারক: সংগঠন/দিনা/শোকজ/২০২৬/০২ তারিখ: ১৯/০৫/২০২৬ খ্রি.
বরাবর,
জনাব করিম উদ্দিন
জেলা সদস্য, দিনাজপুর ও সদস্য, চিরিরবন্দর উপজেলা শাখা
বিষয়: কারণ দর্শানোর নোটিশ।
জনাব,
সংগঠনের দিনাজপুর জেলা শাখার এবং চিরিরবন্দর উপজেলা শাখার দায়িত্বশীল পদে আসীন থেকে ইতোপূর্বে সতর্ক করার পরও আপনার বিরুদ্ধে সাংগঠনিক শৃঙ্খলা ভঙ্গের অভিযোগ পাওয়া গেছে। তাই উক্ত অভিযোগের ভিত্তিতে আপনার বিরুদ্ধে কেন স্থায়ী সাংগঠনিক শাস্তিমূলক ব্যবস্থা গ্রহণ করা হবে না, এই মর্মে আগামী ২৪/০৫/২০২৬ খ্রি. তারিখের মধ্যে জেলা কার্যালয়ে উপস্থিত হয়ে ব্যাখ্যা প্রদানের নির্দেশ দেওয়া হলো।
(আবুল হাসান)
আহ্বায়ক
দিনাজপুর জেলা শাখা
(মোঃ রফিকুল ইসলাম)
সদস্য সচিব (ভারপ্রাপ্ত)
দিনাজপুর জেলা শাখা
অনুলিপি প্রেরণ:
১। মুখ্য সংগঠক (উত্তরাঞ্চল)।
২। রংপুর বিভাগীয় সাংগঠনিক সম্পাদক।
৩। প্রধান, শৃঙ্খলা কমিটি।`;

const FALLBACK_PAD_SCHOOL_APP = `---
doc_type: OFFICE_PAD
columns: 1
content: OTHER
---
গণপ্রজাতন্ত্রী বাংলাদেশ সরকার
# গোকুল সরকারি প্রাথমিক বিদ্যালয়
ডাকঘর: মেলাবাড়ী, উপজেলা: ফুলবাড়ী, জেলা: দিনাজপুর।
স্থাপিত: ১৯৯১ খ্রি. বিদ্যালয় কোড: ৯৯-৭০৩০৮৯০৫৪
বরাবর,
উপজেলা নির্বাহী অফিসার।
ফুলবাড়ী, দিনাজপুর।
মাধ্যম: যথাযথ কর্তৃপক্ষ
বিষয়: গোকুল সরকারি প্রাথমিক বিদ্যালয় "ব্যবস্থাপনা কমিটি" গঠন নিমিত্তে বিদ্যোৎসাহী পুরুষ ও মহিলা সদস্য মনোনীত প্রসঙ্গে।
সূত্র: ৩৮.০০.০০০০.০০.০০৮.৯৯.০০০৪.২০-১২৬ তারিখ: ১৬ মার্চ ২০২৬
জনাব,
উপযুক্ত বিষয়ের আলোকে অত্র বিদ্যালয়ের ব্যবস্থাপনা কমিটি গঠনের নিমিত্তে নিম্নোক্ত ছকে বর্ণিত বিদ্যালয়ে অধ্যয়নরত ছাত্র-ছাত্রীদের অভিভাবকদের মধ্য হতে একজন করে বিদ্যোৎসাহী পুরুষ ও মহিলা সদস্য অন্তর্ভুক্তি কল্পে আপনাকে মনোনীত ও অনুমোদনের জন্য সবিনয়ে অনুরোধ করছি।
| ক্যাটাগরি | ক্র: | নাম | পিতা/স্বামীর নাম | শিক্ষাগত যোগ্যতা | ঠিকানা |
|---|---|---|---|---|---|
| বিদ্যোৎসাহী পুরুষ | ১ | রহিম চন্দ্র | করিম চন্দ্র সরকার | এইচএসসি | গ্রাম: গোকুল, ডাকঘর: মেলাবাড়ী |
| | ২ | কার্তিক চন্দ্র | ব্রজেন চন্দ্র | এসএসসি | গ্রাম: গোকুল, ডাকঘর: মেলাবাড়ী |
| বিদ্যোৎসাহী মহিলা | ১ | মোছাঃ নাসিমা বেগম | মোঃ মজনুল হোসেন | বি.এ | গ্রাম: গোকুল, ডাকঘর: মেলাবাড়ী |
| | ২ | অর্চনা রানী | তপন চন্দ্র | এসএসসি | গ্রাম: গোকুল, ডাকঘর: মেলাবাড়ী |
তারিখ:
(মায়মুনা কবিতা)
প্রধান শিক্ষক (চ: দা:)
গোকুল সরকারি প্রাথমিক বিদ্যালয়
ফুলবাড়ী, দিনাজপুর।`;

// ১) লক্ষ্য ফিক্সচারদ্বয়: pad-notice.input.md ও pad-school-app.input.md → OFFICE_PAD
const padNoticePath = path.join(FDIR, 'pad-notice.input.md');
const padSchoolPath = path.join(FDIR, 'pad-school-app.input.md');
const padNoticeRaw = fs.existsSync(padNoticePath) ? fs.readFileSync(padNoticePath, 'utf8') : FALLBACK_PAD_NOTICE;
const padNoticeBody = stripFrontmatter(padNoticeRaw);
const padNoticeNoDt = stripDocTypeFromFrontmatter(padNoticeRaw);

const padSchoolRaw = fs.existsSync(padSchoolPath) ? fs.readFileSync(padSchoolPath, 'utf8') : FALLBACK_PAD_SCHOOL_APP;
const padSchoolBody = stripFrontmatter(padSchoolRaw);
const padSchoolNoDt = stripDocTypeFromFrontmatter(padSchoolRaw);

const resNoticeBody = DocClassifier.classify(padNoticeBody);
const resNoticeNoDt = DocClassifier.classify(padNoticeNoDt);
const resNoticeRaw = DocClassifier.classify(padNoticeRaw);

check(
  'pad-notice.input.md (মূল লেখা) → OFFICE_PAD',
  resNoticeBody.type === 'OFFICE_PAD',
  `প্রাপ্ত: ${resNoticeBody.type} (confidence: ${resNoticeBody.confidence})`
);
check(
  'pad-notice.input.md (doc_type ছাড়া FM) → OFFICE_PAD',
  resNoticeNoDt.type === 'OFFICE_PAD',
  `প্রাপ্ত: ${resNoticeNoDt.type}`
);
check(
  'pad-notice.input.md (পূর্ণ ফিক্সচার) → OFFICE_PAD',
  resNoticeRaw.type === 'OFFICE_PAD',
  `প্রাপ্ত: ${resNoticeRaw.type}`
);

const resSchoolBody = DocClassifier.classify(padSchoolBody);
const resSchoolNoDt = DocClassifier.classify(padSchoolNoDt);
const resSchoolRaw = DocClassifier.classify(padSchoolRaw);

check(
  'pad-school-app.input.md (মূল লেখা) → OFFICE_PAD',
  resSchoolBody.type === 'OFFICE_PAD',
  `প্রাপ্ত: ${resSchoolBody.type} (confidence: ${resSchoolBody.confidence})`
);
check(
  'pad-school-app.input.md (doc_type ছাড়া FM) → OFFICE_PAD',
  resSchoolNoDt.type === 'OFFICE_PAD',
  `প্রাপ্ত: ${resSchoolNoDt.type}`
);
check(
  'pad-school-app.input.md (পূর্ণ ফিক্সচার) → OFFICE_PAD',
  resSchoolRaw.type === 'OFFICE_PAD',
  `প্রাপ্ত: ${resSchoolRaw.type}`
);

// ২) সিন্থেটিক প্যাড-নোটিশ ও প্যাড-আবেদন নমুনা → OFFICE_PAD
const syntheticPadNotice = [
  '# ফুলবাড়ী বণিক সমিতি',
  'প্রধান কার্যালয়: বাজার রোড, ফুলবাড়ী, দিনাজপুর। মোবাইল: ০১৭০০-০০০০০০',
  'স্মারক নং: ফবস/২০২৬/১৫ তারিখ: ২০/০৫/২০২৬ খ্রি.',
  'বিজ্ঞপ্তি',
  'এতদ্বারা সমিতির সকল সদস্যের সদয় অবগতির জন্য জানানো যাচ্ছে যে আগামী শুক্রবার বার্ষিক সাধারণ সভা অনুষ্ঠিত হবে।',
  'অনুলিপি:',
  '১। নোটিশ বোর্ড'
].join('\n');

const syntheticPadAppWithNibedok = [
  '# আদর্শ মহাবিদ্যালয়',
  'ডাকঘর: ফুলবাড়ী, উপজেলা: ফুলবাড়ী, জেলা: দিনাজপুর।',
  'স্থাপিত: ১৯৮৫ খ্রি., EIIN: 120000, ফোন: ০১৭০০-১১১১১১',
  'স্মারক নং: আম/২০২৬/৪৪ তারিখ: ১৮/০৫/২০২৬ খ্রি.',
  'বরাবর,',
  'চেয়ারম্যান,',
  'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, দিনাজপুর।',
  'বিষয়: নতুন শাখা অনুমোদনের জন্য আবেদন।',
  'জনাব,',
  'বিনীত নিবেদন এই যে, আমাদের কলেজে বিজ্ঞান বিভাগে অতিরিক্ত শাখা খোলা প্রয়োজন। অতএব, বিনীত প্রার্থনা এই যে উক্ত বিষয়ে অনুমোদন দানে বাধিত করবেন।',
  'নিবেদক',
  'অধ্যক্ষ, আদর্শ মহাবিদ্যালয়'
].join('\n');

check(
  'সিন্থেটিক প্যাড-বিজ্ঞপ্তি (লেটারহেড + স্মারক + তারিখ + বিজ্ঞপ্তি) → OFFICE_PAD',
  DocClassifier.classify(syntheticPadNotice).type === 'OFFICE_PAD',
  `প্রাপ্ত: ${DocClassifier.classify(syntheticPadNotice).type}`
);
check(
  'সিন্থেটিক প্যাড-আবেদন (লেটারহেড + স্মারক + তারিখ + বিনীত নিবেদন/নিবেদক) → OFFICE_PAD',
  DocClassifier.classify(syntheticPadAppWithNibedok).type === 'OFFICE_PAD',
  `প্রাপ্ত: ${DocClassifier.classify(syntheticPadAppWithNibedok).type}`
);

// ৩) আসল OFFICIAL_NOTICE (প্যাড-হেডার ছাড়া) অপরিবর্তিত থাকে
const genuineNotice1 = [
  'জরুরি বিজ্ঞপ্তি',
  'স্মারক নং: বাউবি/২০২৬/১০ তারিখ: ২০/০৫/২০২৬ খ্রি.',
  'এতদ্বারা সংশ্লিষ্ট সকলের সদয় অবগতির জন্য জানানো যাচ্ছে যে আগামীকাল অফিসের কার্যক্রম বন্ধ থাকবে।',
  'অনুলিপি: ১। নোটিশ বোর্ড'
].join('\n');

const genuineNotice2 = [
  'অফিস আদেশ',
  'এতদ্বারা সকল কর্মকর্তা ও কর্মচারীদের জ্ঞাতার্থে জানানো যাচ্ছে যে আগামী রবিবার সকাল ৯টায় উপস্থিত থাকতে হবে।',
  'অনুলিপি প্রেরণ করা হলো।'
].join('\n');

const genuineNotice3 = [
  'গোকুল উচ্চ বিদ্যালয়',
  'নোটিশ',
  'এতদ্বারা বিদ্যালয়ের সকল শিক্ষার্থীদের সদয় অবগতির জন্য জানানো যাচ্ছে যে আগামীকাল ক্লাস স্থগিত থাকবে।'
].join('\n');

check(
  'আসল OFFICIAL_NOTICE (জরুরি বিজ্ঞপ্তি + স্মারক নং, লেটারহেড ছাড়া) → OFFICIAL_NOTICE',
  DocClassifier.classify(genuineNotice1).type === 'OFFICIAL_NOTICE',
  `প্রাপ্ত: ${DocClassifier.classify(genuineNotice1).type}`
);
check(
  'আসল OFFICIAL_NOTICE (অফিস আদেশ + জ্ঞাতার্থে) → OFFICIAL_NOTICE',
  DocClassifier.classify(genuineNotice2).type === 'OFFICIAL_NOTICE',
  `প্রাপ্ত: ${DocClassifier.classify(genuineNotice2).type}`
);
check(
  'আসল OFFICIAL_NOTICE (সাধারণ স্কুল নোটিশ, প্যাড-মেটা ও স্মারক ছাড়া) → OFFICIAL_NOTICE',
  DocClassifier.classify(genuineNotice3).type === 'OFFICIAL_NOTICE',
  `প্রাপ্ত: ${DocClassifier.classify(genuineNotice3).type}`
);

// ৪) আসল GOVT_APP (লেটারহেড ছাড়া সাধারণ আবেদন) অপরিবর্তিত থাকে
const genuineApp = [
  'তারিখ: ১০/০৫/২০২৬ খ্রি.',
  'বরাবর,',
  'প্রধান শিক্ষক,',
  'গোকুল সরকারি প্রাথমিক বিদ্যালয়, ফুলবাড়ী, দিনাজপুর।',
  'বিষয়: তিন দিনের ছুটির জন্য আবেদন।',
  'জনাব,',
  'বিনীত নিবেদন এই যে, আমি আপনার বিদ্যালয়ের পঞ্চম শ্রেণির একজন নিয়মিত ছাত্র। অসুস্থতার কারণে বিদ্যালয়ে উপস্থিত হতে পারিনি।',
  'অতএব, বিনীত প্রার্থনা আমাকে তিন দিনের ছুটি মঞ্জুর করে বাধিত করবেন।',
  'নিবেদক',
  'মোঃ করিম, রোল: ০১'
].join('\n');

check(
  'আসল GOVT_APP (সাধারণ ছুটির আবেদন) → GOVT_APP',
  DocClassifier.classify(genuineApp).type === 'GOVT_APP',
  `প্রাপ্ত: ${DocClassifier.classify(genuineApp).type}`
);

// ৫) টেমপ্লেট-তালা (layout_lock / layout_profile / template) থাকলে তালাই শেষ কথা — প্যাড-নিয়ম চলবে না
const lockedAppOnPad = `---\ndoc_type: GOVT_APP\nlayout_lock: true\ntemplate: app-general\n---\n${padSchoolBody}`;
const profileLockedAppOnPad = `---\ndoc_type: GOVT_APP\nlayout_profile: GOVT_APP\n---\n${padSchoolBody}`;
const templateLockedNotice = `---\ndoc_type: OFFICIAL_NOTICE\ntemplate: notice-plain\n---\n${padNoticeBody}`;

check(
  'ফ্রন্টম্যাটারে layout_lock: true থাকলে প্যাড-লেখাতেও ছাঁচের GOVT_APP জেতে',
  DocClassifier.classify(lockedAppOnPad).type === 'GOVT_APP',
  `প্রাপ্ত: ${DocClassifier.classify(lockedAppOnPad).type}`
);
check(
  'ফ্রন্টম্যাটারে layout_profile থাকলে প্যাড-লেখাতেও ছাঁচের GOVT_APP জেতে',
  DocClassifier.classify(profileLockedAppOnPad).type === 'GOVT_APP',
  `প্রাপ্ত: ${DocClassifier.classify(profileLockedAppOnPad).type}`
);
check(
  'ফ্রন্টম্যাটারে template তালা থাকলে ছাঁচের ধরন জেতে',
  DocClassifier.classify(templateLockedNotice).type === 'OFFICIAL_NOTICE',
  `প্রাপ্ত: ${DocClassifier.classify(templateLockedNotice).type}`
);

if (TemplateComposer && typeof TemplateComposer.enforce === 'function') {
  check(
    'TemplateComposer.enforce(padSchoolRaw, "app-general") → GOVT_APP',
    DocClassifier.classify(TemplateComposer.enforce(padSchoolRaw, 'app-general').text).type === 'GOVT_APP'
  );
  check(
    'TemplateComposer.enforce(padSchoolRaw, "app-job") → GOVT_APP',
    DocClassifier.classify(TemplateComposer.enforce(padSchoolRaw, 'app-job').text).type === 'GOVT_APP'
  );
  check(
    'TemplateComposer.enforce(padNoticeRaw, "pad-notice") → OFFICE_PAD',
    DocClassifier.classify(TemplateComposer.enforce(padNoticeRaw, 'pad-notice').text).type === 'OFFICE_PAD'
  );
  check(
    'TemplateComposer.enforce(padSchoolRaw, "pad-letter") → OFFICE_PAD',
    DocClassifier.classify(TemplateComposer.enforce(padSchoolRaw, 'pad-letter').text).type === 'OFFICE_PAD'
  );
}

// ৬) সব ৩৩টি ফিক্সচারে ০ অমিল (bodyOnly, noDocTypeFm, raw) — যদি ফিক্সচার ফোল্ডার উপস্থিত থাকে
if (fs.existsSync(EXPECTED_PATH)) {
  const rawJson = JSON.parse(fs.readFileSync(EXPECTED_PATH, 'utf8'));
  const expectedMap = rawJson.fixtures;
  const fixtureFiles = fs.readdirSync(FDIR).filter((f) => f.endsWith('.input.md')).sort();

  for (const file of fixtureFiles) {
    const exp = expectedMap[file];
    const rawText = fs.readFileSync(path.join(FDIR, file), 'utf8');
    const bodyText = stripFrontmatter(rawText);
    const noDtText = stripDocTypeFromFrontmatter(rawText);

    const rBody = DocClassifier.classify(bodyText);
    const lBody = DocClassifier.promoteCombined(rBody.type, bodyText);
    const rNoDt = DocClassifier.classify(noDtText);
    const lNoDt = DocClassifier.promoteCombined(rNoDt.type, noDtText);
    const rRaw = DocClassifier.classify(rawText);
    const lRaw = DocClassifier.promoteCombined(rRaw.type, rawText);

    check(
      `ফিক্সচার (মূল লেখা): ${file} → ${exp.doc_type}/${exp.layout}`,
      rBody.type === exp.doc_type && lBody === exp.layout,
      `প্রাপ্ত: ${rBody.type}/${lBody}`
    );
    check(
      `ফিক্সচার (doc_type ছাড়া FM): ${file} → ${exp.doc_type}/${exp.layout}`,
      rNoDt.type === exp.doc_type && lNoDt === exp.layout,
      `প্রাপ্ত: ${rNoDt.type}/${lNoDt}`
    );
    check(
      `ফিক্সচার (পূর্ণ): ${file} → ${exp.doc_type}/${exp.layout}`,
      rRaw.type === exp.doc_type && lRaw === exp.layout,
      `প্রাপ্ত: ${rRaw.type}/${lRaw}`
    );
  }
}

// ৭) সুইচ বন্ধে (__FZ_OFF_CLSFIX = true এবং FZ_OFF=CLSFIX) পুরোনো আচরণ বাইট-বাই-বাইট অক্ষুণ্ণ
globalThis.__FZ_OFF_CLSFIX = true;
try {
  check(
    'সুইচ বন্ধে _clsFix() === false (__FZ_OFF_CLSFIX)',
    DocClassifier._clsFix() === false
  );
  const offNotice = DocClassifier.classify(padNoticeBody);
  const offSchool = DocClassifier.classify(padSchoolBody);
  check(
    'সুইচ বন্ধে pad-notice.input.md (মূল লেখা) → পুরোনো OFFICIAL_NOTICE (score:10)',
    offNotice.type === 'OFFICIAL_NOTICE' && offNotice.confidence === 10,
    `প্রাপ্ত: ${offNotice.type} (confidence: ${offNotice.confidence})`
  );
  check(
    'সুইচ বন্ধে pad-school-app.input.md (মূল লেখা) → পুরোনো GOVT_APP (score:12)',
    offSchool.type === 'GOVT_APP' && offSchool.confidence === 12,
    `প্রাপ্ত: ${offSchool.type} (confidence: ${offSchool.confidence})`
  );
} finally {
  delete globalThis.__FZ_OFF_CLSFIX;
}

const prevEnv = process.env.FZ_OFF;
process.env.FZ_OFF = 'CLSFIX';
try {
  check(
    'সুইচ বন্ধে _clsFix() === false (FZ_OFF=CLSFIX)',
    DocClassifier._clsFix() === false
  );
  const offNoticeEnv = DocClassifier.classify(padNoticeBody);
  const offSchoolEnv = DocClassifier.classify(padSchoolBody);
  check(
    'FZ_OFF=CLSFIX অবস্থায় pad-notice ও pad-school-app পুরোনো ফল দেয়',
    offNoticeEnv.type === 'OFFICIAL_NOTICE' && offSchoolEnv.type === 'GOVT_APP'
  );
} finally {
  if (prevEnv === undefined) delete process.env.FZ_OFF;
  else process.env.FZ_OFF = prevEnv;
}

if (failures.length > 0) {
  console.error('ব্যর্থ টেস্টসমূহ:');
  for (const f of failures) console.error('  ✗ ' + f);
}

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
process.exit(failed > 0 ? 1 : 0);
