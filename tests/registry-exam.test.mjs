#!/usr/bin/env node
/**
 * A2_REGISTRY_EXAM_v6 — প্রশ্নপত্র (EXAM_*) রেজিস্ট্রিতে (WORK_PLAN E3-এর শেষ ধাপ)
 *
 *   node tests/registry-exam.test.mjs
 *
 * ফিক্সচার `cq-*` (৮টি), `mcq-*` (৫টি), `combined`, `primary-class4-bangla`, `math-equations`
 * (মোট ১৬টি ফিক্সচার) দিয়ে যাচাই:
 *  ১. সুইচ বন্ধ (`__FZ_ON_REGISTRY` = false/undefined) বনাম সুইচ চালু (`__FZ_ON_REGISTRY` = true)
 *     অবস্থায় `FayzarPipeline.process`-এর পার্স-ফল (JSON) ও HTML আউটপুট বাইট-বাই-বাইট এক।
 *  ২. বুকলেট মোড (`orientation: 'landscape'`) এবং এক-কলাম/প্রাথমিক প্রোফাইল (`EXAM_PRIMARY`, `EXAM_ONECOL`)
 *     উভয় ক্ষেত্রেই সুইচ বন্ধ বনাম চালুতে পার্স-JSON ও HTML হুবহু এক।
 *  ৩. সুইচ বন্ধ থাকলে রেজিস্ট্রির `parse`/`renderHtml` ডাকা হয় না এবং সুইচ চালু থাকলে ডাকা হয়।
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// প্রজেক্ট রুট বা স্বতন্ত্র বান্ডেল উভয় পরিবেশে মডিউল লোড
for (const [n, p] of [
  ['FayzarLayoutUnits', 'js/layout-engine/layout-units.js'],
  ['CqBookletPlanner', 'js/layout-engine/cq-booklet-planner.js'],
  ['McqLayoutPlanner', 'js/layout-engine/mcq-layout-planner.js'],
  ['FayzarGeneralParser', 'js/layout-engine/general-paper-parser.js'],
  ['TextRunProcessor', 'js/layout-engine/text-run-processor.js'],
  ['FayzarFrontmatter', 'js/layout-engine/frontmatter-header.js'],
  ['FayzarExamRenumber', 'js/layout-engine/exam-renumber.js'],
  ['EquationConverter', 'js/equation-converter.js'],
  ['DocClassifier', 'js/engines/doc-classifier.js'],
  ['QuestionEngine', 'js/engines/question-engine.js'],
  ['FayzarLayoutRegistry', 'js/layout-engine/layout-registry.js']
]) {
  const fullPath = path.join(ROOT, p);
  if (fs.existsSync(fullPath)) {
    const m = require(fullPath);
    if (m && !globalThis[n]) globalThis[n] = m;
  }
}

// স্বতন্ত্র বান্ডেল পরিবেশে অনুপস্থিত ঐচ্ছিক মডিউলগুলোর জন্য হালকা শিম (যাতে বারবার ডিস্কে ব্যর্থ require না ঘটে)
if (!globalThis.EquationConverter) globalThis.EquationConverter = {};
if (!globalThis.DocClassifier) globalThis.DocClassifier = {};
if (!globalThis.FayzarExamRenumber) globalThis.FayzarExamRenumber = { isExamType: () => false };

// স্বতন্ত্র বান্ডেল পরিবেশে frontmatter-header.js না থাকলে ন্যূনতম ফ্রন্টম্যাটার স্প্লিটার ও হেডার অ্যাপ্লায়ার
if (!globalThis.FayzarFrontmatter) {
  globalThis.FayzarFrontmatter = {
    split(text) {
      const s = String(text || '');
      const m = s.match(/^\uFEFF?\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
      if (!m) return { fields: null, body: s };
      const fields = {};
      for (const ln of m[1].split(/\r?\n/)) {
        const kv = ln.match(/^\s*([A-Za-z0-9_\-]+)\s*:\s*(.*)$/);
        if (kv) {
          const k = kv[1].trim();
          const v = kv[2].trim().replace(/^['"]|['"]$/g, '');
          fields[k] = v;
          fields[k.toLowerCase()] = v;
        }
      }
      return { fields, body: s.slice(m[0].length) };
    },
    applyToHeader(header, fields) {
      if (!header || !fields) return;
      if (!header.institute && fields.institute) header.institute = fields.institute;
      if (!header.location && fields.location) header.location = fields.location;
      if (!header.exam && fields.exam) header.exam = fields.exam;
      if (!header.time && fields.time) header.time = fields.time;
      if (!header.marks && (fields.fullMarks || fields.fullmarks || fields.marks)) {
        header.marks = fields.fullMarks || fields.fullmarks || fields.marks;
      }
    }
  };
}

const Pipeline = require(path.join(ROOT, 'js/layout-engine/fayzar-pipeline.js'));
const Registry = globalThis.FayzarLayoutRegistry;

const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');

const FIXTURES = [
  { name: 'combined', file: 'combined.input.md', docType: 'EXAM_COMBINED' },
  { name: 'cq-booklet-2', file: 'cq-booklet-2.input.md', docType: 'EXAM_CQ' },
  { name: 'cq-booklet-6', file: 'cq-booklet-6.input.md', docType: 'EXAM_CQ' },
  { name: 'cq-booklet-10', file: 'cq-booklet-10.input.md', docType: 'EXAM_CQ' },
  { name: 'cq-booklet-16', file: 'cq-booklet-16.input.md', docType: 'EXAM_CQ' },
  { name: 'cq-inline-numbering', file: 'cq-inline-numbering.input.md', docType: 'EXAM_CQ' },
  { name: 'cq-long', file: 'cq-long.input.md', docType: 'EXAM_CQ' },
  { name: 'cq-marks-edge', file: 'cq-marks-edge.input.md', docType: 'EXAM_CQ' },
  { name: 'cq-short', file: 'cq-short.input.md', docType: 'EXAM_CQ' },
  { name: 'math-equations', file: 'math-equations.input.md', docType: 'EXAM_MATH' },
  { name: 'mcq-header-fallback', file: 'mcq-header-fallback.input.md', docType: 'EXAM_MCQ' },
  { name: 'mcq-long-options', file: 'mcq-long-options.input.md', docType: 'EXAM_MCQ' },
  { name: 'mcq-mixed-options', file: 'mcq-mixed-options.input.md', docType: 'EXAM_MCQ' },
  { name: 'mcq-pure-28', file: 'mcq-pure-28.input.md', docType: 'EXAM_MCQ' },
  { name: 'mcq-shrink-21', file: 'mcq-shrink-21.input.md', docType: 'EXAM_MCQ' },
  { name: 'primary-class4-bangla', file: 'primary-class4-bangla.input.md', docType: 'EXAM_GENERAL' }
];

async function runWithSwitch(flagValue, fn) {
  const prev = globalThis.__FZ_ON_REGISTRY;
  try {
    if (flagValue === undefined) {
      delete globalThis.__FZ_ON_REGISTRY;
    } else {
      globalThis.__FZ_ON_REGISTRY = flagValue;
    }
    return await fn();
  } finally {
    if (prev === undefined) {
      delete globalThis.__FZ_ON_REGISTRY;
    } else {
      globalThis.__FZ_ON_REGISTRY = prev;
    }
  }
}

let passedGates = 0;
let failedGates = 0;
const failures = [];

async function checkGate(name, fn) {
  try {
    await fn();
    passedGates++;
  } catch (err) {
    failedGates++;
    failures.push(`${name} — ${err && err.message ? err.message : String(err)}`);
  }
}

// ১. ১৬টি ফিক্সচারে (cq-*, mcq-*, combined, primary-class4-bangla, math-equations) সুইচ বন্ধ বনাম চালু অবস্থায় সমতা যাচাই
for (const item of FIXTURES) {
  const raw = fx(item.file);
  await checkGate(
    `ফিক্সচার "${item.name}" (${item.docType}): সুইচ বন্ধ বনাম চালুতে পার্স-JSON ও HTML হুবহু এক`,
    async () => {
      for (const font of ['unicode', 'bijoy']) {
        for (const orientation of ['portrait', 'landscape']) {
          const opts = {
            docType: item.docType,
            outputFormat: 'html',
            font,
            orientation,
            noCombinedPromotion: true
          };
          const offRes = await runWithSwitch(false, () => Pipeline.process(raw, opts));
          const onRes = await runWithSwitch(true, () => Pipeline.process(raw, opts));

          assert.equal(offRes.success, true, `${item.name} (${font}/${orientation}) switch off failed`);
          assert.equal(onRes.success, true, `${item.name} (${font}/${orientation}) switch on failed`);
          assert.equal(onRes.docType, item.docType);
          assert.deepEqual(onRes.parsedData, offRes.parsedData);
          assert.equal(
            JSON.stringify(onRes.parsedData),
            JSON.stringify(offRes.parsedData),
            `${item.name} (${font}/${orientation}): parsedData JSON অমিল`
          );
          assert.equal(
            onRes.content,
            offRes.content,
            `${item.name} (${font}/${orientation}): HTML আউটপুট বাইট-বাই-বাইট এক নয়`
          );
        }
      }
    }
  );
}

// ২. EXAM_PRIMARY ও EXAM_ONECOL রেজিস্ট্রি এন্ট্রি ও প্রোফাইল যাচাই
await checkGate(
  'EXAM_PRIMARY ও EXAM_ONECOL এন্ট্রি রেজিস্ট্রিতে নিবন্ধিত এবং পার্স/HTML রেন্ডার কার্যকর',
  async () => {
    const primEntry = Registry.get('EXAM_PRIMARY');
    const onecolEntry = Registry.get('EXAM_ONECOL');
    assert.ok(primEntry && primEntry.id === 'EXAM_PRIMARY', 'EXAM_PRIMARY এন্ট্রি পাওয়া যায়নি');
    assert.ok(onecolEntry && onecolEntry.id === 'EXAM_ONECOL', 'EXAM_ONECOL এন্ট্রি পাওয়া যায়নি');

    const primRaw = fx('primary-class4-bangla.input.md');
    const generalOff = await runWithSwitch(false, () =>
      Pipeline.process(primRaw, { docType: 'EXAM_GENERAL', outputFormat: 'html', noCombinedPromotion: true })
    );
    const generalOn = await runWithSwitch(true, () =>
      Pipeline.process(primRaw, { docType: 'EXAM_GENERAL', outputFormat: 'html', noCombinedPromotion: true })
    );
    assert.equal(JSON.stringify(generalOn.parsedData), JSON.stringify(generalOff.parsedData));
    assert.equal(generalOn.content, generalOff.content);

    const mathRaw = fx('math-equations.input.md');
    const mathOff = await runWithSwitch(false, () =>
      Pipeline.process(mathRaw, { docType: 'EXAM_MATH', outputFormat: 'html', noCombinedPromotion: true })
    );
    const mathOn = await runWithSwitch(true, () =>
      Pipeline.process(mathRaw, { docType: 'EXAM_MATH', outputFormat: 'html', noCombinedPromotion: true })
    );
    assert.equal(JSON.stringify(mathOn.parsedData), JSON.stringify(mathOff.parsedData));
    assert.equal(mathOn.content, mathOff.content);
  }
);

// ৩. প্রতিটি EXAM_* ডক-টাইপে সুইচ বন্ধ থাকলে রেজিস্ট্রি ডাকা হয় না এবং সুইচ চালু থাকলে রেজিস্ট্রির parse ও renderHtml ডাকা হয়
for (const [docType, sampleFile] of [
  ['EXAM_CQ', 'cq-short.input.md'],
  ['EXAM_MCQ', 'mcq-pure-28.input.md'],
  ['EXAM_COMBINED', 'combined.input.md'],
  ['EXAM_GENERAL', 'primary-class4-bangla.input.md'],
  ['EXAM_MATH', 'math-equations.input.md']
]) {
  await checkGate(
    `সুইচ নিয়ন্ত্রণ (${docType}): বন্ধে রেজিস্ট্রি ডাকা হয় না, চালুতে parse ও renderHtml ডাকা হয়`,
    async () => {
      const entry = Registry.get(docType);
      assert.ok(entry, `${docType} এন্ট্রি রেজিস্ট্রিতে পাওয়া যায়নি`);
      const origParse = entry.parse;
      const origRenderHtml = entry.renderHtml;
      let parseCount = 0;
      let renderCount = 0;

      entry.parse = function (...args) {
        parseCount++;
        return origParse.apply(this, args);
      };
      entry.renderHtml = function (...args) {
        renderCount++;
        return origRenderHtml.apply(this, args);
      };

      try {
        const raw = fx(sampleFile);
        await runWithSwitch(false, () =>
          Pipeline.process(raw, { docType, outputFormat: 'html', noCombinedPromotion: true })
        );
        assert.equal(parseCount, 0, `${docType}: সুইচ বন্ধ থাকলে entry.parse ডাকা যাবে না`);
        assert.equal(renderCount, 0, `${docType}: সুইচ বন্ধ থাকলে entry.renderHtml ডাকা যাবে না`);

        await runWithSwitch(true, () =>
          Pipeline.process(raw, { docType, outputFormat: 'html', noCombinedPromotion: true })
        );
        assert.equal(parseCount, 1, `${docType}: সুইচ চালু থাকলে entry.parse ১ বার ডাকা হবে`);
        assert.equal(renderCount, 1, `${docType}: সুইচ চালু থাকলে entry.renderHtml ১ বার ডাকা হবে`);
      } finally {
        entry.parse = origParse;
        entry.renderHtml = origRenderHtml;
      }
    }
  );
}

console.log('=== A2_REGISTRY_EXAM_v6 পরীক্ষা রিপোর্ট (EXAM_CQ / EXAM_MCQ / EXAM_COMBINED / EXAM_GENERAL / EXAM_MATH) ===');
console.log(`মোট যাচাইকৃত গেট: ${passedGates + failedGates}`);
if (failures.length > 0) {
  console.error('\nগেট ত্রুটি:');
  for (const f of failures) console.error('  - ' + f);
}
console.log(`\nফলাফল: ${passedGates} পাস, ${failedGates} ব্যর্থ`);
process.exit(failedGates > 0 ? 1 : 0);
