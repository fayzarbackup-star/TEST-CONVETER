#!/usr/bin/env node
/**
 * WORK_PLAN C2 + C3: শ্রেণিবিভাগের স্কোর ও ভিত্তিরেখা যাচাই (DocClassifier Score & Baseline Gate)
 *
 *   node tests/classify-score.test.mjs
 *   node tests/run-all.mjs --only=classify-score
 *
 * প্রতিটি ফিক্সচারে `DocClassifier` চালিয়ে প্রত্যাশিত `doc_type` ও `layout`-এর সাথে
 * মিল (%) এবং অমিলের তালিকা প্রিন্ট করে। সংরক্ষিত ভিত্তিরেখা (baseline)-এর নিচে নামলে
 * কিংবা কোনো লেআউটের স্কোর কমলে টেস্ট ব্যর্থ হয় (exit 1)।
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
const classifierCandidates = [
  path.join(ROOT, 'js', 'engines', 'doc-classifier.js'),
  path.join(ROOT, 'doc-classifier.js')
];
const classifierPath = classifierCandidates.find((p) => fs.existsSync(p));
if (!classifierPath) {
  console.error('DocClassifier পাওয়া যায়নি: js/engines/doc-classifier.js');
  console.log('ফলাফল: 0 পাস, 1 ব্যর্থ');
  process.exit(1);
}
const DocClassifier = require(classifierPath);

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

function runClassifier(text) {
  const res = DocClassifier.classify(text);
  const layout = DocClassifier.promoteCombined(res.type, text);
  return {
    doc_type: res.type,
    layout,
    confidence: res.confidence,
    reason: res.reason || (res.allScores && res.allScores[0] ? `score:${res.allScores[0].score}` : 'default')
  };
}

const rawJson = JSON.parse(fs.readFileSync(EXPECTED_PATH, 'utf8'));
const baseline = rawJson._baseline || {};
const expectedMap = rawJson.fixtures || Object.fromEntries(
  Object.entries(rawJson).filter(([k]) => !k.startsWith('_'))
);

const fixtureFiles = fs.readdirSync(FDIR)
  .filter((f) => f.endsWith('.input.md'))
  .sort();

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

// গেট ১: ফিক্সচার তালিকা ও স্কিমা যাচাই
const missingInExpected = fixtureFiles.filter((f) => !expectedMap[f]);
const extraInExpected = Object.keys(expectedMap).filter((f) => !fixtureFiles.includes(f));
checkGate(
  'সব ফিক্সচার classify-expected.json-এ তালিকাভুক্ত',
  missingInExpected.length === 0 && extraInExpected.length === 0 && fixtureFiles.length === (baseline.total_fixtures || 33),
  `missing=[${missingInExpected.join(',')}], extra=[${extraInExpected.join(',')}], count=${fixtureFiles.length}`
);

const validTypes = new Set(Object.values(DocClassifier.DOC_TYPES));
const invalidEntries = Object.entries(expectedMap).filter(
  ([, v]) => !v || !validTypes.has(v.doc_type) || !validTypes.has(v.layout)
);
checkGate(
  'প্রত্যাশিত doc_type ও layout বৈধ DOC_TYPES',
  invalidEntries.length === 0,
  invalidEntries.map(([k]) => k).join(', ')
);

// প্রতিটি ফিক্সচারে DocClassifier চালানো:
// (ক) bodyOnly: ফ্রন্টম্যাটার ছাড়া মূল লেখার শ্রেণিবিভাগ (আসল ক্লাসিফায়ার সক্ষমতা)
// (খ) noDocTypeFm: ফ্রন্টম্যাটার থেকে শুধু doc_type সরিয়ে (Part-18.6 layoutFromFacts যাচাই)
// (গ) raw: পূর্ণ ফিক্সচার (ফ্রন্টম্যাটারসহ পাইপলাইন যাচাই)
let bodyMatches = 0;
let certainTotal = 0;
let certainBodyMatches = 0;
let rawMatches = 0;
let noDtMatches = 0;

const bodyMismatches = [];
const noDtMismatches = [];
const rawMismatches = [];
const cqZeroBlockFiles = [];
const layoutStats = {};

for (const file of fixtureFiles) {
  const exp = expectedMap[file];
  const rawText = fs.readFileSync(path.join(FDIR, file), 'utf8');
  const bodyText = stripFrontmatter(rawText);
  const noDtText = stripDocTypeFromFrontmatter(rawText);

  const resBody = runClassifier(bodyText);
  const resNoDt = runClassifier(noDtText);
  const resRaw = runClassifier(rawText);
  const stats = DocClassifier.structureStats(bodyText);

  if (!layoutStats[exp.layout]) {
    layoutStats[exp.layout] = { total: 0, bodyMatches: 0, rawMatches: 0, noDtMatches: 0 };
  }
  layoutStats[exp.layout].total++;

  const isBodyMatch = resBody.doc_type === exp.doc_type && resBody.layout === exp.layout;
  const isNoDtMatch = resNoDt.doc_type === exp.doc_type && resNoDt.layout === exp.layout;
  const isRawMatch = resRaw.doc_type === exp.doc_type && resRaw.layout === exp.layout;

  if (isBodyMatch) {
    bodyMatches++;
    layoutStats[exp.layout].bodyMatches++;
  } else {
    bodyMismatches.push({
      file,
      expected: `${exp.doc_type}/${exp.layout}`,
      actual: `${resBody.doc_type}/${resBody.layout}`,
      uncertain: Boolean(exp.uncertain),
      alt: exp.alt_doc_type || null,
      confidence: resBody.confidence,
      reason: resBody.reason
    });
  }

  if (!exp.uncertain) {
    certainTotal++;
    if (isBodyMatch) certainBodyMatches++;
  }

  if (isNoDtMatch) {
    noDtMatches++;
    layoutStats[exp.layout].noDtMatches++;
  } else {
    noDtMismatches.push({
      file,
      expected: exp.layout,
      actual: resNoDt.layout,
      reason: resNoDt.reason
    });
  }

  if (isRawMatch) {
    rawMatches++;
    layoutStats[exp.layout].rawMatches++;
  } else {
    rawMismatches.push({
      file,
      expected: exp.layout,
      actual: resRaw.layout,
      reason: resRaw.reason
    });
  }

  if (['EXAM_CQ', 'EXAM_COMBINED'].includes(exp.layout) && stats.cqBlocks === 0) {
    cqZeroBlockFiles.push(file);
  }

  // ফিক্সচার-স্তরের রিগ্রেশন গেট: আগে যে নমুনা মিলত, সেটি যেন নষ্ট না হয়
  if (exp.baseline_body_match === true) {
    checkGate(
      `ফিক্সচার স্থিতিশীলতা (body): ${file}`,
      isBodyMatch,
      `expected ${exp.doc_type}, got ${resBody.doc_type} (${resBody.reason})`
    );
  }
}

const total = fixtureFiles.length;
const bodyPct = ((bodyMatches / total) * 100).toFixed(1);
const certainPct = certainTotal ? ((certainBodyMatches / certainTotal) * 100).toFixed(1) : '0.0';
const noDtPct = ((noDtMatches / total) * 100).toFixed(1);
const rawPct = ((rawMatches / total) * 100).toFixed(1);

// সামগ্রিক ভিত্তিরেখা গেটসমূহ
checkGate(
  `সামগ্রিক মূল-লেখা (body-only) স্কোর >= ভিত্তিরেখা (${baseline.body_only_matches}/${total})`,
  bodyMatches >= (baseline.body_only_matches ?? 26),
  `current=${bodyMatches}/${total} (${bodyPct}%), baseline=${baseline.body_only_matches}/${total}`
);

checkGate(
  `নিশ্চিত নমুনার (non-uncertain) স্কোর >= ভিত্তিরেখা (${baseline.certain_body_matches}/${certainTotal})`,
  certainBodyMatches >= (baseline.certain_body_matches ?? 24),
  `current=${certainBodyMatches}/${certainTotal} (${certainPct}%), baseline=${baseline.certain_body_matches}/${certainTotal}`
);

checkGate(
  `ফ্রন্টম্যাটারসহ (raw) স্কোর >= ভিত্তিরেখা (${baseline.raw_with_frontmatter_matches}/${total})`,
  rawMatches >= (baseline.raw_with_frontmatter_matches ?? 33),
  `current=${rawMatches}/${total} (${rawPct}%), baseline=${baseline.raw_with_frontmatter_matches}/${total}`
);

checkGate(
  `doc_type-বিহীন ফ্রন্টম্যাটার (facts-only) স্কোর >= ভিত্তিরেখা (${baseline.frontmatter_without_doctype_matches}/${total})`,
  noDtMatches >= (baseline.frontmatter_without_doctype_matches ?? 15),
  `current=${noDtMatches}/${total} (${noDtPct}%), baseline=${baseline.frontmatter_without_doctype_matches}/${total}`
);

// লেআউট-ভিত্তিক রিগ্রেশন গেট (WORK_PLAN C3: "কোনো লেআউটের স্কোর কমলে টেস্ট ব্যর্থ হবে")
for (const [layout, bStat] of Object.entries(baseline.by_layout || {})) {
  const cur = layoutStats[layout] || { total: 0, bodyMatches: 0, rawMatches: 0 };
  checkGate(
    `লেআউট ভিত্তিরেখা (${layout})`,
    cur.bodyMatches >= bStat.body_matches && cur.rawMatches >= bStat.raw_matches,
    `${layout}: body ${cur.bodyMatches}/${cur.total} (baseline ${bStat.body_matches}), raw ${cur.rawMatches}/${cur.total} (baseline ${bStat.raw_matches})`
  );
}

// সংক্ষিপ্ত রিপোর্ট প্রিন্ট (WORK_PLAN নীতি: সংক্ষিপ্ত ও স্পষ্ট)
console.log('=== DocClassifier শ্রেণিবিভাগ স্কোর (WORK_PLAN C2/C3) ===');
console.log(`১) মূল লেখা (ফ্রন্টম্যাটার ছাড়া): ${bodyMatches}/${total} মিল (${bodyPct}%)  [ভিত্তিরেখা: ${baseline.body_only_matches}/${total}]`);
console.log(`   - নিশ্চিত নমুনা (uncertain:false): ${certainBodyMatches}/${certainTotal} মিল (${certainPct}%)`);
console.log(`২) তথ্য-ভিত্তিক (doc_type ছাড়া FM):  ${noDtMatches}/${total} মিল (${noDtPct}%)  [ভিত্তিরেখা: ${baseline.frontmatter_without_doctype_matches}/${total}]`);
console.log(`৩) পূর্ণ ফিক্সচার (ফ্রন্টম্যাটারসহ):  ${rawMatches}/${total} মিল (${rawPct}%)  [ভিত্তিরেখা: ${baseline.raw_with_frontmatter_matches}/${total}]`);

console.log('\nলেআউট-ভিত্তিক মিল (মূল লেখা | পূর্ণ ফিক্সচার):');
for (const [layout, st] of Object.entries(layoutStats)) {
  const b = (baseline.by_layout && baseline.by_layout[layout]) ? baseline.by_layout[layout].body_matches : st.bodyMatches;
  console.log(`  - ${layout.padEnd(15)} : ${String(st.bodyMatches).padStart(2)}/${st.total} (ভিত্তিরেখা ${b}/${st.total}) | পূর্ণ: ${st.rawMatches}/${st.total}`);
}

console.log(`\nমূল লেখায় অমিল (Mismatches: ${bodyMismatches.length}/${total}):`);
for (const m of bodyMismatches) {
  const tag = m.uncertain ? ` [uncertain${m.alt ? ', alt=' + m.alt : ''}]` : ' [BUG]';
  console.log(`  ✗ ${m.file.padEnd(30)} প্রত্যাশিত=${m.expected.padEnd(23)} প্রাপ্ত=${m.actual.padEnd(31)} (${m.reason})${tag}`);
}

if (noDtMismatches.length > bodyMismatches.length) {
  const contentOtherBugs = noDtMismatches.filter((m) => /content=OTHER/i.test(m.reason));
  console.log(`\nনোট: ফ্রন্টম্যাটারে doc_type না থাকলে কিন্তু 'content: OTHER' থাকলে layoutFromFacts() ${contentOtherBugs.length}টি অ-প্রশ্নপত্র নমুনাকে EXAM_GENERAL বানিয়ে দেয়।`);
}
if (cqZeroBlockFiles.length > 0) {
  console.log(`নোট: structureStats()-এ cqBlocks=0 এসেছে ${cqZeroBlockFiles.length}টি সৃজনশীল ফাইলে (ইনলাইন '১. ক.' বা নম্বরহীন উপ-প্রশ্ন): ${cqZeroBlockFiles.join(', ')}`);
}

if (gateFailures.length > 0) {
  console.error('\nREGRESSION / গেট ত্রুটি:');
  for (const gf of gateFailures) {
    console.error(`  - ${gf}`);
  }
}

console.log(`\nফলাফল: ${passedGates} পাস, ${failedGates} ব্যর্থ`);
process.exit(failedGates > 0 ? 1 : 0);