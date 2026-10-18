#!/usr/bin/env node
/**
 * C_SCORE_v6 — সাধারণ পথের স্কোর-যন্ত্র (WORK_PLAN C1 + C3)
 *
 *   node tests/layout-score.test.mjs
 *   node tests/layout-score.test.mjs --save-baseline
 *
 * প্রতিটি ফিক্সচার (tests/fixtures/*.input.md) → DocClassifier.classify →
 * FayzarPipeline পার্স + HTML চালিয়ে যাচাই করে:
 *   ১) doc_type মিল
 *   ২) সাব-লেআউট মিল (classify-expected.json অনুযায়ী)
 *   ৩) পার্স-ত্রুটি নেই
 *   ৪) HTML-এ প্রত্যাশিত মূল অংশ (শিরোনাম, প্রশ্ন-সংখ্যা/সারি-সংখ্যা) আছে
 * এবং সংরক্ষিত ভিত্তি (tests/baseline/layout-score.json)-এর সাথে তুলনা করে।
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
const BASELINE_PATH = path.join(ROOT, 'tests', 'baseline', 'layout-score.json');
const SAVE_BASELINE = process.argv.includes('--save-baseline');

const require = createRequire(import.meta.url);

// ব্রাউজার/নোড দ্বৈত সামঞ্জস্যের জন্য উপলব্ধ সব ইঞ্জিন ও লেআউট মডিউল লোড করা
const MODULE_CANDIDATES = [
  ['FayzarLayoutUnits', 'js/layout-engine/layout-units.js'],
  ['CqBookletPlanner', 'js/layout-engine/cq-booklet-planner.js'],
  ['TextRunProcessor', 'js/layout-engine/text-run-processor.js'],
  ['FayzarFrontmatter', 'js/layout-engine/frontmatter-header.js'],
  ['FayzarExamRenumber', 'js/layout-engine/exam-renumber.js'],
  ['DocClassifier', 'js/engines/doc-classifier.js'],
  ['QuestionEngine', 'js/engines/question-engine.js'],
  ['StampEngine', 'js/engines/stamp-engine.js'],
  ['ApplicationEngine', 'js/engines/application-engine.js'],
  ['AdmitCardEngine', 'js/engines/admit-card-engine.js'],
  ['SalarySlipEngine', 'js/engines/salary-slip-engine.js'],
  ['RoutineEngine', 'js/engines/routine-engine.js'],
  ['CVEngine', 'js/engines/cv-engine.js'],
  ['CertificateEngine', 'js/engines/certificate-engine.js'],
  ['FayzarApplicationLayout', 'js/layout-engine/application-layout.js'],
  ['FayzarCertificateLayout', 'js/layout-engine/certificate-layout.js'],
  ['FayzarEnCvLayout', 'js/layout-engine/en-cv-layout.js'],
  ['FayzarReceiptLayout', 'js/layout-engine/receipt-layout.js'],
  ['FayzarCashMemoLayout', 'js/layout-engine/cash-memo-layout.js'],
  ['FayzarCvLayout', 'js/layout-engine/cv-layout.js'],
  ['FayzarLetterLayout', 'js/layout-engine/letter-layout.js'],
  ['FayzarLayoutRegistry', 'js/layout-engine/layout-registry.js'],
  ['ExportDualEngine', 'js/engines/export-dual-engine.js'],
  ['FayzarPipeline', 'js/layout-engine/fayzar-pipeline.js']
];

for (const [globalName, relPath] of MODULE_CANDIDATES) {
  const fullPath = path.join(ROOT, relPath);
  if (fs.existsSync(fullPath)) {
    try {
      const mod = require(fullPath);
      if (mod && !globalThis[globalName]) globalThis[globalName] = mod;
    } catch (_e) {
      // ঐচ্ছিক মডিউল লোড না হলে পাইপলাইনের নিজস্ব ফেলব্যাক কাজ করবে
    }
  }
}

// যদি মিনিমাল বান্ডেলে frontmatter-header.js না থাকে, তাহলে ফ্রন্টম্যাটার বিভাজক শিম যোগ করা
if (!globalThis.FayzarFrontmatter) {
  globalThis.FayzarFrontmatter = {
    split(txt) {
      const s = String(txt || '');
      const m = s.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n)?/);
      if (!m) return { fields: null, body: s };
      const fields = {};
      for (const line of m[1].split(/\r?\n/)) {
        const kv = line.match(/^\s*([A-Za-z0-9_]+)\s*:\s*(.+?)\s*$/);
        if (kv) fields[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
      }
      return { fields, body: s.slice(m[0].length) };
    },
    applyToHeader(header, fields) {
      if (!header || !fields) return;
      for (const [k, v] of Object.entries(fields)) {
        if (v && !header[k]) header[k] = v;
      }
    }
  };
}

const DocClassifier = globalThis.DocClassifier;
const FayzarPipeline = globalThis.FayzarPipeline;

if (!DocClassifier || !FayzarPipeline) {
  console.error('DocClassifier বা FayzarPipeline পাওয়া যায়নি');
  console.log('ফলাফল: 0 পাস, 1 ব্যর্থ');
  process.exit(1);
}

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

/** বাংলা ও ইউনিকোড টেক্সট সমতাকরণ (HTML ট্যাগ ও বিরামচিহ্ন বাদে) */
function normPlain(s) {
  return String(s || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .normalize('NFC')
    .replace(/\u09AF\u09BC/g, '\u09DF')
    .replace(/\u09A1\u09BC/g, '\u09DC')
    .replace(/\u09A2\u09BC/g, '\u09DD')
    .replace(/[:ঃ\-–—.,;।!?'"“”‘’()\[\]{}*#|/\\+_~`=]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** ফ্রন্টম্যাটার ও মূল লেখা আলাদা করা */
function splitFrontmatter(raw) {
  const s = String(raw || '');
  const m = s.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n)?/);
  if (!m) return { fields: {}, body: s };
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^\s*([A-Za-z0-9_]+)\s*:\s*(.+?)\s*$/);
    if (kv) fields[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return { fields, body: s.slice(m[0].length) };
}

/** একটি স্ট্রিংয়ে নির্দিষ্ট শব্দগুচ্ছ কতবার আছে তা গণনা */
function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) break;
    count++;
    pos = idx + needle.length;
  }
  return count;
}

/**
 * প্রতিটি ফিক্সচার থেকে প্রত্যাশিত শিরোনাম এবং মূল অংশ (প্রশ্ন-সংখ্যা / সারি-সংখ্যা) নির্ণয়
 */
function deriveExpectedContentSpec(rawText, exp) {
  const { fields, body } = splitFrontmatter(rawText);
  const normBody = body
    .normalize('NFC')
    .replace(/\u09AF\u09BC/g, '\u09DF')
    .replace(/\u09A1\u09BC/g, '\u09DC')
    .replace(/\u09A2\u09BC/g, '\u09DD');
  const lines = normBody.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const isExam = /^EXAM_/.test(exp.doc_type);

  // ১. প্রত্যাশিত শিরোনাম নির্ণয়
  let title = '';
  const h1 = lines.find((l) => /^#{1,3}\s+\S/.test(l));
  if (h1) {
    title = normPlain(h1);
  } else if (fields.institute) {
    title = normPlain(fields.institute);
  } else {
    const subj = lines.find((l) => /^বিষয়\s*[:ঃ]/.test(l));
    if (subj) {
      title = normPlain(subj.replace(/^বিষয়\s*[:ঃ]\s*/, '')).split(' ').slice(0, 4).join(' ');
    } else if (lines.length > 0) {
      title = normPlain(lines[0].replace(/^[০-৯\d]+[।.)]\s*/, '')).split(' ').slice(0, 5).join(' ');
    }
  }

  // ২. প্রশ্ন-সংখ্যা (পরীক্ষার ফিক্সচার) অথবা টেবিল/কাঠামোগত সারি-সংখ্যা নির্ণয়
  if (isExam) {
    const qStart = /^(?:#{1,6}\s*)?(?:প্রশ্ন\s*(?:নং)?[\s\-:ঃ.]*)?\(?([০-৯\d]{1,3})\s*[।.)]\s*(.*)$/;
    const inlineSub = /^(?:#{1,6}\s*)?(?:প্রশ্ন\s*(?:নং)?[\s\-:ঃ.]*)?\(?([০-৯\d]{1,3})\s*[।.)]\s*\(?\s*([কখগঘ])\s*[.)।]\s*(.*)$/;
    const anchors = [];
    let lastQNum = null;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^---\s*SECTION_BREAK/i.test(l)) {
        lastQNum = null;
        continue;
      }
      const inM = l.match(inlineSub);
      const qM = l.match(qStart);
      if (qM) {
        if (inM && lastQNum === inM[1]) continue;
        lastQNum = qM[1];
        let srcText = inM ? inM[3] : qM[2];
        if (/^নিচের\s+প্রশ্নগুলোর\s+উত্তর/i.test(srcText.trim()) && lines[i + 1]) {
          const nextSub = lines.slice(i + 1, i + 6).find((nl) => /^\(?\s*ক\s*[.)।]\s*\S/.test(nl));
          if (nextSub) srcText = nextSub.replace(/^\(?\s*ক\s*[.)।]\s*/, '');
        }
        const firstSeg = srcText
          .split(/\$[^$]*\$/)
          .map((s) => normPlain(s.replace(/[\[\(]?[০-৯\d]{1,2}[\]\)]?\s*$/, '')))
          .find((s) => s.length >= 2) || normPlain(qM[1]);
        anchors.push(firstSeg.split(' ').filter(Boolean).slice(0, 2).join(' '));
      }
    }
    return { kind: 'questions', label: 'q', title, count: anchors.length, anchors };
  }

  const tblLines = lines.filter((l) => /^\|.*\|$/.test(l) && !/^\|[\s\-:|]+\|$/.test(l));
  if (tblLines.length > 0) {
    const anchors = [];
    for (const tl of tblLines) {
      const cells = tl.split('|').map((c) => normPlain(c)).filter(Boolean);
      if (cells.length === 1 && /^[০-৯\d]+$/.test(cells[0])) continue;
      const nonNum = cells.find((c) => !/^[০-৯\d]+$/.test(c)) || cells[0];
      if (nonNum) anchors.push(nonNum.split(' ').slice(0, 2).join(' '));
    }
    return { kind: 'table_rows', label: 'row', title, count: anchors.length, anchors };
  }

  // টেবিলহীন অ-পরীক্ষা দলিলের মূল কাঠামোগত সারি (হেডার, স্মারক/তথ্য-ঘর, মূল বক্তব্য, স্বাক্ষর/অনুলিপি)
  const anchors = [];
  for (const l of lines) {
    if (/^(\*\*\*|---)$/.test(l) || /^seal\s*&\s*signature$/i.test(l) || /^স্বাক্ষর$/.test(l)) continue;
    const strippedLabel = l
      .replace(/^#{1,6}\s*/, '')
      .replace(/^[০-৯\d]+\s*[।.)]\s*/, '')
      .replace(/^(?:স্মারক|সূত্র|রেফ|Ref|ক্রমিক)\s*(?:নং|নম্বর)?\s*[:ঃ\-]\s*/i, '');
    const segments = strippedLabel
      .split(/\.{3,}|\s{2,}|[:ঃ]/)
      .map((s) => normPlain(s))
      .filter((s) => s.length >= 2);
    if (segments.length > 0) {
      const chosen = segments.find((s) => s.split(' ').length >= 2) || segments[0];
      anchors.push(chosen.split(' ').slice(0, 2).join(' '));
    }
  }
  return { kind: 'rows', label: 'row', title, count: anchors.length, anchors };
}

/** সাব-লেআউট ও মেটাডেটা যাচাই */
function verifySubLayout(exp, clsBodyType, bodyText, clsRawType, rawText, pipeRes) {
  const promotedBody = DocClassifier.promoteCombined(clsBodyType, bodyText);
  const promotedRaw = DocClassifier.promoteCombined(clsRawType, rawText);
  if (promotedBody !== exp.layout || promotedRaw !== exp.layout || pipeRes.docType !== exp.layout) {
    return false;
  }
  if (![1, 2].includes(exp.columns)) return false;
  if (!['portrait', 'landscape'].includes(exp.page_orientation)) return false;

  const pd = pipeRes.parsedData;
  if (!pd || pd.__fzDocType !== exp.layout) return false;

  if (!pd.isFallback) {
    if (exp.copies && typeof pd.copies === 'number' && pd.copies !== exp.copies) {
      return false;
    }
    if (pd.kind) {
      const validKindsByLayout = {
        GOVT_APP: ['GOVT_APP_LAYOUT'],
        CASH_MEMO: ['CASH_MEMO_LAYOUT', 'RECEIPT_LAYOUT'],
        PROTTOYON: ['CERT_LAYOUT', 'LETTER_LAYOUT'],
        OFFICE_PAD: ['LETTER_LAYOUT'],
        CV_RESUME: ['CV_LAYOUT', 'EN_CV_LAYOUT']
      };
      const allowed = validKindsByLayout[exp.layout];
      if (allowed && !allowed.includes(pd.kind)) return false;
    }
  }
  return true;
}

const rawExpectedJson = JSON.parse(fs.readFileSync(EXPECTED_PATH, 'utf8'));
const expectedMap = rawExpectedJson.fixtures || Object.fromEntries(
  Object.entries(rawExpectedJson).filter(([k]) => !k.startsWith('_'))
);
const fixtureFiles = fs.readdirSync(FDIR).filter((f) => f.endsWith('.input.md')).sort();

checkGate(
  'সব ফিক্সচার classify-expected.json-এ উপস্থিত',
  fixtureFiles.length === 33 && fixtureFiles.every((f) => Boolean(expectedMap[f])),
  `count=${fixtureFiles.length}`
);

const results = {};
const layoutBuckets = {};
let docTypeMatchCount = 0;
let subLayoutMatchCount = 0;
let parseOkCount = 0;
let htmlContentOkCount = 0;
let totalScoreSum = 0;

for (const file of fixtureFiles) {
  const exp = expectedMap[file];
  const rawText = fs.readFileSync(path.join(FDIR, file), 'utf8');
  const { body: bodyText } = splitFrontmatter(rawText);

  // ১) DocClassifier.classify (মূল লেখা ও পূর্ণ ফিক্সচার)
  const clsBody = DocClassifier.classify(bodyText);
  const clsRaw = DocClassifier.classify(rawText);

  // ২) FayzarPipeline পার্স + HTML রেন্ডার
  const pipeRes = await FayzarPipeline.process(rawText, {
    outputFormat: 'html'
  });

  // মাপ ১: doc_type মিল (২৫)
  const docTypeMatch = clsBody.type === exp.doc_type && clsRaw.type === exp.doc_type && pipeRes.docType === exp.doc_type;
  if (docTypeMatch) docTypeMatchCount++;

  // মাপ ২: সাব-লেআউট মিল (২৫)
  const subLayoutMatch = verifySubLayout(exp, clsBody.type, bodyText, clsRaw.type, rawText, pipeRes);
  if (subLayoutMatch) subLayoutMatchCount++;

  // মাপ ৩: পার্স-ত্রুটি নেই (২৫)
  const parseOk = Boolean(
    pipeRes &&
    pipeRes.success === true &&
    !pipeRes.error &&
    pipeRes.parsedData &&
    typeof pipeRes.content === 'string' &&
    pipeRes.content.trim().length > 0
  );
  if (parseOk) parseOkCount++;

  // মাপ ৪: HTML-এ প্রত্যাশিত মূল অংশ — শিরোনাম (১০) + প্রশ্ন-সংখ্যা/সারি-সংখ্যা (১৫) = ২৫
  const spec = deriveExpectedContentSpec(rawText, exp);
  const htmlPlain = normPlain(pipeRes.content || '');
  const htmlTitleOk = Boolean(spec.title && htmlPlain.includes(spec.title));

  // প্রতিটি প্রত্যাশিত প্রশ্ন/সারির উপস্থিতি গণনা (পুনরাবৃত্তি থাকলে সংখ্যাও যাচাই)
  const neededByAnchor = new Map();
  for (const a of spec.anchors) {
    neededByAnchor.set(a, (neededByAnchor.get(a) || 0) + 1);
  }
  let matchedUnits = 0;
  for (const [anchor, needed] of neededByAnchor.entries()) {
    const found = countOccurrences(htmlPlain, anchor);
    matchedUnits += Math.min(found, needed);
  }
  const copiesHtmlOk = (!exp.copies || (pipeRes.parsedData && pipeRes.parsedData.isFallback))
    ? true
    : ((pipeRes.content.match(/<table\b/gi) || []).length >= exp.copies);

  const htmlUnitsOk = spec.count > 0 && matchedUnits === spec.count && copiesHtmlOk;
  if (htmlTitleOk && htmlUnitsOk) htmlContentOkCount++;

  const unitPoints = spec.count > 0 ? Math.round(15 * (matchedUnits / spec.count)) : 0;
  const score =
    (docTypeMatch ? 25 : 0) +
    (subLayoutMatch ? 25 : 0) +
    (parseOk ? 25 : 0) +
    (htmlTitleOk ? 10 : 0) +
    (copiesHtmlOk ? unitPoints : 0);

  totalScoreSum += score;

  if (!layoutBuckets[exp.layout]) {
    layoutBuckets[exp.layout] = { total: 0, scoreSum: 0 };
  }
  layoutBuckets[exp.layout].total++;
  layoutBuckets[exp.layout].scoreSum += score;

  results[file] = {
    doc_type: exp.doc_type,
    layout: exp.layout,
    columns: exp.columns,
    page_orientation: exp.page_orientation,
    ...(exp.copies ? { copies: exp.copies } : {}),
    score,
    metrics: {
      doc_type_match: docTypeMatch,
      sub_layout_match: subLayoutMatch,
      parse_ok: parseOk,
      html_title_ok: htmlTitleOk,
      html_units_ok: htmlUnitsOk
    },
    expected_units: {
      kind: spec.kind,
      label: spec.label,
      count: spec.count,
      matched: matchedUnits
    }
  };

  checkGate(`doc_type ও সাব-লেআউট মিল: ${file}`, docTypeMatch && subLayoutMatch, `got ${pipeRes.docType}, expected ${exp.doc_type}/${exp.layout}`);
  checkGate(`পার্স ও HTML মূল অংশ (${spec.label}:${matchedUnits}/${spec.count}): ${file}`, parseOk && htmlTitleOk && htmlUnitsOk, `titleOk=${htmlTitleOk}, units=${matchedUnits}/${spec.count}`);
}

const totalFixtures = fixtureFiles.length;
const avgScore = Number((totalScoreSum / totalFixtures).toFixed(2));
const minScore = Math.min(...Object.values(results).map((r) => r.score));

const byLayoutSummary = {};
for (const [lay, b] of Object.entries(layoutBuckets)) {
  byLayoutSummary[lay] = {
    total: b.total,
    average_score: Number((b.scoreSum / b.total).toFixed(2))
  };
}

const baselinePayload = {
  _baseline: {
    description: 'WORK_PLAN C1 + C3 layout pipeline score baseline across 33 OCR markdown fixtures',
    total_fixtures: totalFixtures,
    average_score: avgScore,
    min_score: minScore,
    doc_type_matches: docTypeMatchCount,
    sub_layout_matches: subLayoutMatchCount,
    parse_ok_count: parseOkCount,
    html_content_matches: htmlContentOkCount,
    by_layout: byLayoutSummary
  },
  average_score: avgScore,
  total_fixtures: totalFixtures,
  fixtures: Object.fromEntries(
    Object.entries(results).map(([k, v]) => [
      k,
      {
        doc_type: v.doc_type,
        layout: v.layout,
        columns: v.columns,
        page_orientation: v.page_orientation,
        ...(v.copies ? { copies: v.copies } : {}),
        score: v.score,
        metrics: v.metrics,
        expected_units: {
          kind: v.expected_units.kind,
          count: v.expected_units.count
        }
      }
    ])
  )
};

if (SAVE_BASELINE) {
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baselinePayload, null, 2) + '\n', 'utf8');
}

checkGate(
  'স্কোর-ভিত্তি ফাইল (tests/baseline/layout-score.json) বিদ্যমান',
  fs.existsSync(BASELINE_PATH),
  BASELINE_PATH
);

let baselineAvg = avgScore;
if (fs.existsSync(BASELINE_PATH)) {
  const savedBaseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  const baseFixtures = savedBaseline.fixtures || {};
  baselineAvg = (savedBaseline._baseline && savedBaseline._baseline.average_score) ?? savedBaseline.average_score ?? 100;

  for (const file of fixtureFiles) {
    const cur = results[file];
    const bEntry = baseFixtures[file];
    const bScore = typeof bEntry === 'number' ? bEntry : (bEntry && typeof bEntry.score === 'number' ? bEntry.score : undefined);
    checkGate(
      `ভিত্তিরেখা স্কোর অক্ষুণ্ণ: ${file}`,
      typeof bScore === 'number' && cur.score >= bScore,
      `current=${cur.score}, baseline=${bScore}`
    );
  }

  checkGate(
    `সামগ্রিক গড় স্কোর >= ভিত্তিরেখা (${avgScore} >= ${baselineAvg})`,
    avgScore >= baselineAvg,
    `current=${avgScore}, baseline=${baselineAvg}`
  );
}

// সংক্ষিপ্ত সারাংশ (≤৩০ লাইন: প্রতি ফিক্সচারে স্কোর ও গড়)
console.log('=== সাধারণ পথের লেআউট স্কোর সারাংশ (WORK_PLAN C1 + C3) ===');
console.log(`মাপ: doc_type=${docTypeMatchCount}/${totalFixtures} | sub_layout=${subLayoutMatchCount}/${totalFixtures} | parse_ok=${parseOkCount}/${totalFixtures} | html_ok=${htmlContentOkCount}/${totalFixtures}`);

const cellFmt = (f) => {
  const r = results[f];
  const u = `${r.expected_units.label}:${r.expected_units.matched}/${r.expected_units.count}`;
  return `${f.replace(/\.input\.md$/, '').padEnd(22)} ${String(r.score).padStart(3)}/100 (${u.padEnd(8)})`;
};
for (let i = 0; i < fixtureFiles.length; i += 2) {
  const left = cellFmt(fixtureFiles[i]);
  const right = fixtureFiles[i + 1] ? ' | ' + cellFmt(fixtureFiles[i + 1]) : '';
  console.log(`  ${left}${right}`);
}

console.log(`সামগ্রিক গড় স্কোর: ${avgScore.toFixed(1)}/100 (${avgScore.toFixed(1)}%) [ভিত্তিরেখা: ${Number(baselineAvg).toFixed(1)}/100, সর্বনিম্ন: ${minScore}/100]`);
if (gateFailures.length > 0) {
  console.error(`গেট ত্রুটি (${gateFailures.length}): ${gateFailures.slice(0, 3).join(' | ')}`);
}
console.log(`ফলাফল: ${passedGates} পাস, ${failedGates} ব্যর্থ`);
process.exit(failedGates > 0 ? 1 : 0);
