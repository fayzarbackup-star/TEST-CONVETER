/**
 * A2_REGISTRY_E2_v4 — ক্যাশমেমো/রসিদ পাইপলাইনে রেজিস্ট্রির মাধ্যমে রাউটিং (__FZ_ON_REGISTRY সুইচের পেছনে)
 *
 * ৪টি ফিক্সচার (`cash-memo-blank`, `cash-memo-items`, `receipt`, `voucher`) দিয়ে যাচাই:
 *  ১. সুইচ বন্ধ (`__FZ_ON_REGISTRY` = false/undefined) বনাম সুইচ চালু (`__FZ_ON_REGISTRY` = true)
 *     অবস্থায় `FayzarPipeline.process` / `_parseByDocType` / `_renderHtml`-এর পার্স-ফল (JSON)
 *     এবং HTML আউটপুট বাইট-বাই-বাইট এক।
 *  ২. `memo_kind: receipt` ও `memo_kind: voucher` ছাঁচ-তালা থাকলেও (`RECEIPT_LAYOUT` পথে)
 *     সুইচ বন্ধ বনাম চালু অবস্থায় পার্স-ফল (JSON) ও HTML হুবহু এক।
 *  ৩. সুইচ চালু থাকলে রেজিস্ট্রির `CASH_MEMO` এন্ট্রির `parse` ও `renderHtml` প্রকৃতই ব্যবহৃত হয়,
 *     এবং সুইচ বন্ধ থাকলে সরাসরি পুরোনো পথে চলে।
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ঐচ্ছিক ও আবশ্যক মডিউল লোড (প্রজেক্ট রুট ও স্বতন্ত্র বান্ডেল উভয় পরিবেশে কার্যকর)
for (const [n, p] of [
  ['FayzarLayoutUnits', 'js/layout-engine/layout-units.js'],
  ['CqBookletPlanner', 'js/layout-engine/cq-booklet-planner.js'],
  ['TextRunProcessor', 'js/layout-engine/text-run-processor.js'],
  ['FayzarFrontmatter', 'js/layout-engine/frontmatter-header.js'],
  ['DocClassifier', 'js/engines/doc-classifier.js'],
  ['FayzarReceiptLayout', 'js/layout-engine/receipt-layout.js'],
  ['FayzarCashMemoLayout', 'js/layout-engine/cash-memo-layout.js'],
  ['FayzarLayoutRegistry', 'js/layout-engine/layout-registry.js']
]) {
  const fullPath = path.join(ROOT, p);
  if (fs.existsSync(fullPath)) {
    const m = require(fullPath);
    if (m && !globalThis[n]) globalThis[n] = m;
  }
}

const Pipeline = require(path.join(ROOT, 'js/layout-engine/fayzar-pipeline.js'));
const Registry = globalThis.FayzarLayoutRegistry;

const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');
const FIXTURES = [
  ['cash-memo-blank', fx('cash-memo-blank.input.md')],
  ['cash-memo-items', fx('cash-memo-items.input.md')],
  ['receipt', fx('receipt.input.md')],
  ['voucher', fx('voucher.input.md')]
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

for (const [name, raw] of FIXTURES) {
  test(`ফিক্সচার "${name}": সুইচ বন্ধ বনাম চালু অবস্থায় পার্স-ফল (JSON) ও HTML বাইট-বাই-বাইট এক`, async () => {
    for (const font of ['unicode', 'bijoy']) {
      const offRes = await runWithSwitch(false, () =>
        Pipeline.process(raw, { docType: 'CASH_MEMO', outputFormat: 'html', font })
      );
      const onRes = await runWithSwitch(true, () =>
        Pipeline.process(raw, { docType: 'CASH_MEMO', outputFormat: 'html', font })
      );

      assert.equal(offRes.success, true);
      assert.equal(onRes.success, true);
      assert.equal(onRes.docType, 'CASH_MEMO');
      assert.deepEqual(onRes.parsedData, offRes.parsedData);
      assert.equal(
        JSON.stringify(onRes.parsedData),
        JSON.stringify(offRes.parsedData),
        `${name} (${font}): parsedData JSON অমিল`
      );
      assert.equal(
        onRes.content,
        offRes.content,
        `${name} (${font}): HTML আউটপুট বাইট-বাই-বাইট এক নয়`
      );
    }
  });
}

test('রসিদ ও ভাউচার (memo_kind তালাসহ RECEIPT_LAYOUT পথ): সুইচ বন্ধ বনাম চালু অবস্থায় পার্স-ফল ও HTML হুবহু এক', async () => {
  const receiptRaw = fx('receipt.input.md');
  const voucherRaw = fx('voucher.input.md');

  for (const [name, raw, memoKind] of [
    ['receipt (memo_kind=receipt)', receiptRaw, 'receipt'],
    ['voucher (memo_kind=voucher)', voucherRaw, 'voucher']
  ]) {
    const opts = {
      docType: 'CASH_MEMO',
      outputFormat: 'html',
      memoKind,
      __frontmatter: { doc_type: 'CASH_MEMO', columns: '1', memo_kind: memoKind }
    };
    const offRes = await runWithSwitch(false, () => Pipeline.process(raw, opts));
    const onRes = await runWithSwitch(true, () => Pipeline.process(raw, opts));

    assert.equal(offRes.parsedData.kind, 'RECEIPT_LAYOUT', `${name}: RECEIPT_LAYOUT প্রত্যাশিত`);
    assert.equal(onRes.parsedData.kind, 'RECEIPT_LAYOUT', `${name}: সুইচ চালুতেও RECEIPT_LAYOUT প্রত্যাশিত`);
    assert.equal(JSON.stringify(onRes.parsedData), JSON.stringify(offRes.parsedData));
    assert.equal(onRes.content, offRes.content);
  }
});

test('সুইচ নিয়ন্ত্রণ: বন্ধ থাকলে রেজিস্ট্রি ডাকা হয় না, চালু থাকলে রেজিস্ট্রির parse ও renderHtml ডাকা হয়', async () => {
  const entry = Registry.get('CASH_MEMO');
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
    const raw = fx('cash-memo-blank.input.md');
    await runWithSwitch(false, () =>
      Pipeline.process(raw, { docType: 'CASH_MEMO', outputFormat: 'html' })
    );
    assert.equal(parseCount, 0, 'সুইচ বন্ধ থাকলে entry.parse ডাকা যাবে না');
    assert.equal(renderCount, 0, 'সুইচ বন্ধ থাকলে entry.renderHtml ডাকা যাবে না');

    await runWithSwitch(true, () =>
      Pipeline.process(raw, { docType: 'CASH_MEMO', outputFormat: 'html' })
    );
    assert.equal(parseCount, 1, 'সুইচ চালু থাকলে entry.parse ১ বার ডাকা হবে');
    assert.equal(renderCount, 1, 'সুইচ চালু থাকলে entry.renderHtml ১ বার ডাকা হবে');
  } finally {
    entry.parse = origParse;
    entry.renderHtml = origRenderHtml;
  }
});
