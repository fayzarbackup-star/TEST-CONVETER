#!/usr/bin/env node
/**
 * A2_REGISTRY_E3_v5 — বাকি লেআউটগুলো রেজিস্ট্রিতে (আবেদন, চিঠি/প্যাড, সনদ/প্রত্যয়ন, সিভি)
 *
 *   node tests/registry-e3.test.mjs
 *
 * ফিক্সচার `app-*`, `pad-*`, `prottoyon-*`, `cert-*`, `cv-*` (মোট ১৩টি ফিক্সচার) দিয়ে যাচাই:
 *  ১. সুইচ বন্ধ (`__FZ_ON_REGISTRY` = false/undefined) বনাম সুইচ চালু (`__FZ_ON_REGISTRY` = true)
 *     অবস্থায় `FayzarPipeline.process`-এর পার্স-ফল (JSON) ও HTML আউটপুট বাইট-বাই-বাইট এক।
 *  ২. `OFFICIAL_NOTICE` ও `CV` আলিয়াস রাউটিং এবং সুইচ বন্ধ/চালু অবস্থায় রেজিস্ট্রির
 *     `parse` ও `renderHtml` কল হওয়া না-হওয়ার গেট যাচাই।
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
  ['TextRunProcessor', 'js/layout-engine/text-run-processor.js'],
  ['FayzarFrontmatter', 'js/layout-engine/frontmatter-header.js'],
  ['DocClassifier', 'js/engines/doc-classifier.js'],
  ['FayzarApplicationLayout', 'js/layout-engine/application-layout.js'],
  ['FayzarLetterLayout', 'js/layout-engine/letter-layout.js'],
  ['FayzarCertificateLayout', 'js/layout-engine/certificate-layout.js'],
  ['FayzarCvLayout', 'js/layout-engine/cv-layout.js'],
  ['FayzarEnCvLayout', 'js/layout-engine/en-cv-layout.js'],
  ['FayzarLayoutRegistry', 'js/layout-engine/layout-registry.js']
]) {
  const fullPath = path.join(ROOT, p);
  if (fs.existsSync(fullPath)) {
    const m = require(fullPath);
    if (m && !globalThis[n]) globalThis[n] = m;
  }
}

// স্বতন্ত্র বান্ডেল পরিবেশে frontmatter-header.js না থাকলে ন্যূনতম ফ্রন্টম্যাটার স্প্লিটার
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
    applyToHeader() {}
  };
}

const Pipeline = require(path.join(ROOT, 'js/layout-engine/fayzar-pipeline.js'));
const Registry = globalThis.FayzarLayoutRegistry;

const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');

const FIXTURES = [
  { name: 'app-correction', file: 'app-correction.input.md', docType: 'GOVT_APP', expectedKind: 'GOVT_APP_LAYOUT' },
  { name: 'app-holding', file: 'app-holding.input.md', docType: 'GOVT_APP', expectedKind: 'GOVT_APP_LAYOUT' },
  { name: 'app-job', file: 'app-job.input.md', docType: 'GOVT_APP', expectedKind: 'GOVT_APP_LAYOUT' },
  { name: 'pad-notice', file: 'pad-notice.input.md', docType: 'OFFICE_PAD', expectedKind: 'LETTER_LAYOUT' },
  { name: 'pad-school-app', file: 'pad-school-app.input.md', docType: 'OFFICE_PAD', expectedKind: 'LETTER_LAYOUT' },
  { name: 'prottoyon-school', file: 'prottoyon-school.input.md', docType: 'PROTTOYON', expectedKind: 'LETTER_LAYOUT' },
  { name: 'prottoyon-up', file: 'prottoyon-up.input.md', docType: 'PROTTOYON', expectedKind: 'LETTER_LAYOUT' },
  { name: 'cert-landscape', file: 'cert-landscape.input.md', docType: 'PROTTOYON', expectedKind: 'CERT_LAYOUT' },
  { name: 'cert-stub', file: 'cert-stub.input.md', docType: 'PROTTOYON', expectedKind: 'CERT_LAYOUT' },
  { name: 'cv-basic', file: 'cv-basic.input.md', docType: 'CV_RESUME', expectedKind: 'CV_LAYOUT' },
  { name: 'cv-biodata', file: 'cv-biodata.input.md', docType: 'CV_RESUME', expectedKind: 'CV_LAYOUT' },
  { name: 'cv-english', file: 'cv-english.input.md', docType: 'CV_RESUME', expectedKind: 'EN_CV_LAYOUT' },
  { name: 'cv-long', file: 'cv-long.input.md', docType: 'CV_RESUME', expectedKind: 'CV_LAYOUT' }
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

// ১. ১৩টি ফিক্সচারে (app-*, pad-*, prottoyon-*, cert-*, cv-*) সুইচ বন্ধ বনাম চালু অবস্থায় সমতা যাচাই
for (const item of FIXTURES) {
  const raw = fx(item.file);
  await checkGate(
    `ফিক্সচার "${item.name}" (${item.docType} -> ${item.expectedKind}): সুইচ বন্ধ বনাম চালুতে পার্স-JSON ও HTML হুবহু এক`,
    async () => {
      for (const font of ['unicode', 'bijoy']) {
        const offRes = await runWithSwitch(false, () =>
          Pipeline.process(raw, { docType: item.docType, outputFormat: 'html', font })
        );
        const onRes = await runWithSwitch(true, () =>
          Pipeline.process(raw, { docType: item.docType, outputFormat: 'html', font })
        );

        assert.equal(offRes.success, true, `${item.name} (${font}) switch off failed`);
        assert.equal(onRes.success, true, `${item.name} (${font}) switch on failed`);
        assert.equal(offRes.parsedData.kind, item.expectedKind, `${item.name} expected ${item.expectedKind}`);
        assert.equal(onRes.parsedData.kind, item.expectedKind, `${item.name} switch on expected ${item.expectedKind}`);
        assert.deepEqual(onRes.parsedData, offRes.parsedData);
        assert.equal(
          JSON.stringify(onRes.parsedData),
          JSON.stringify(offRes.parsedData),
          `${item.name} (${font}): parsedData JSON অমিল`
        );
        assert.equal(
          onRes.content,
          offRes.content,
          `${item.name} (${font}): HTML আউটপুট বাইট-বাই-বাইট এক নয়`
        );
      }
    }
  );
}

// ২. OFFICIAL_NOTICE রেজিস্ট্রি রাউটিং যাচাই (letter-layout-এর সাথে হুবহু এক)
await checkGate(
  'OFFICIAL_NOTICE: সুইচ চালুতে letter-layout (pad) এর সাথে পার্স-JSON ও HTML হুবহু এক',
  async () => {
    const raw = fx('pad-notice.input.md');
    const padRes = await runWithSwitch(false, () =>
      Pipeline.process(raw, { docType: 'OFFICE_PAD', outputFormat: 'html' })
    );
    const noticeOnRes = await runWithSwitch(true, () =>
      Pipeline.process(raw, { docType: 'OFFICIAL_NOTICE', outputFormat: 'html' })
    );
    assert.equal(noticeOnRes.parsedData.kind, 'LETTER_LAYOUT');
    const padClone = Object.assign({}, padRes.parsedData, { __fzDocType: 'OFFICIAL_NOTICE' });
    assert.equal(JSON.stringify(noticeOnRes.parsedData), JSON.stringify(padClone));
    assert.equal(noticeOnRes.content, padRes.content);
  }
);

// ৩. প্রতিটি ডক-টাইপে সুইচ বন্ধ থাকলে রেজিস্ট্রি ডাকা হয় না এবং সুইচ চালু থাকলে রেজিস্ট্রির parse ও renderHtml ডাকা হয়
for (const [docType, sampleFile] of [
  ['GOVT_APP', 'app-correction.input.md'],
  ['OFFICE_PAD', 'pad-notice.input.md'],
  ['PROTTOYON', 'prottoyon-school.input.md'],
  ['CV_RESUME', 'cv-basic.input.md']
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
          Pipeline.process(raw, { docType, outputFormat: 'html' })
        );
        assert.equal(parseCount, 0, `${docType}: সুইচ বন্ধ থাকলে entry.parse ডাকা যাবে না`);
        assert.equal(renderCount, 0, `${docType}: সুইচ বন্ধ থাকলে entry.renderHtml ডাকা যাবে না`);

        await runWithSwitch(true, () =>
          Pipeline.process(raw, { docType, outputFormat: 'html' })
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

console.log('=== A2_REGISTRY_E3_v5 পরীক্ষা রিপোর্ট (GOVT_APP / OFFICE_PAD / PROTTOYON / CERT / CV) ===');
console.log(`মোট যাচাইকৃত গেট: ${passedGates + failedGates}`);
if (failures.length > 0) {
  console.error('\nগেট ত্রুটি:');
  for (const f of failures) console.error('  - ' + f);
}
console.log(`\nফলাফল: ${passedGates} পাস, ${failedGates} ব্যর্থ`);
process.exit(failedGates > 0 ? 1 : 0);
