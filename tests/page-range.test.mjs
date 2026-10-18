/**
 * D_WIRE_G3_v6 — হুবহু-মোডে পাতা-পরিসর (G3) ইউনিট টেস্ট
 * Node পরিবেশে বাইরের কোনো নির্ভরতা বা DOM ছাড়াই চলে।
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const FayzarFaithful = require('../js/layout-engine/faithful/faithful-pipeline.js');
globalThis.FayzarFaithful = FayzarFaithful;
const FayzarFaithfulUI = require('../js/faithful-mode-ui.js');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
  } catch (err) {
    failed++;
    console.error(`ব্যর্থ: ${name} ->`, err && err.message ? err.message : err);
  }
}

// ১. "2-5,8" এবং বৈধ পরিসর পার্সিং
await test('"2-5,8" পার্স করলে [2, 3, 4, 5, 8] পাতা ও সঠিক ইন্ডেক্স পাওয়া যায়', () => {
  const res = FayzarFaithfulUI.parsePageRange('2-5,8', 10);
  assert.equal(res.ok, true);
  assert.equal(res.valid, true);
  assert.deepEqual(res.pages, [2, 3, 4, 5, 8]);
  assert.deepEqual(res.indices, [1, 2, 3, 4, 7]);
  assert.deepEqual(res.outOfRange, []);
});

await test('বাংলা সংখ্যা "১–৩" ও "২-৫, ৮" এবং "সব" সঠিকভাবে পার্স হয়', () => {
  const r1 = FayzarFaithfulUI.parsePageRange('১–৩', 10);
  assert.equal(r1.ok, true);
  assert.deepEqual(r1.pages, [1, 2, 3]);

  const r2 = FayzarFaithfulUI.parsePageRange('২-৫, ৮', 10);
  assert.equal(r2.ok, true);
  assert.deepEqual(r2.pages, [2, 3, 4, 5, 8]);

  const rAll = FayzarFaithfulUI.parsePageRange('সব', 5);
  assert.equal(rAll.ok, true);
  assert.deepEqual(rAll.pages, [1, 2, 3, 4, 5]);
});

await test('এলোমেলো ও ডুপ্লিকেট পরিসর ("8, 2-4, 3, 5") ক্রমানুসারে ও ডুপ্লিকেট ছাড়া আসে', () => {
  const res = FayzarFaithfulUI.parsePageRange('8, 2-4, 3, 5', 10);
  assert.equal(res.ok, true);
  assert.deepEqual(res.pages, [2, 3, 4, 5, 8]);
});

// ২. ভুল ইনপুট (Invalid input) যাচাই
await test('ফাঁকা ইনপুট বা শুধু কমা দিলে ok: false ফেরত দেয়', () => {
  assert.equal(FayzarFaithfulUI.parsePageRange('', 10).ok, false);
  assert.equal(FayzarFaithfulUI.parsePageRange('   ', 10).ok, false);
  assert.equal(FayzarFaithfulUI.parsePageRange(',', 10).ok, false);
  assert.equal(FayzarFaithfulUI.parsePageRange('2,,5', 10).ok, false);
});

await test('অক্ষর বা অসংগত টোকেন ("abc", "2-a", "1-2-3", "2-", "-5") ভুল ইনপুট হিসেবে শনাক্ত হয়', () => {
  for (const bad of ['abc', '2-a', 'a-5', '1-2-3', '2-', '-5', '@#']) {
    const res = FayzarFaithfulUI.parsePageRange(bad, 10);
    assert.equal(res.ok, false, `"${bad}" ভুল ইনপুট হওয়া উচিত`);
    assert.ok(res.invalidTokens.length > 0);
  }
});

await test('০ বা ঋণাত্মক পাতা এবং উল্টো পরিসর ("5-2", "১০-৪") ভুল ইনপুট হিসেবে প্রত্যাখ্যাত হয়', () => {
  assert.equal(FayzarFaithfulUI.parsePageRange('0', 10).ok, false);
  assert.equal(FayzarFaithfulUI.parsePageRange('0-3', 10).ok, false);
  assert.equal(FayzarFaithfulUI.parsePageRange('5-2', 10).ok, false);
  assert.equal(FayzarFaithfulUI.parsePageRange('১০-৪', 10).ok, false);
});

// ৩. পাতা-সংখ্যার বাইরে (Out of range) যাচাই
await test('আংশিক পাতা-সংখ্যার বাইরে ("2-5,8" যখন মোট পাতা ৬) হলে বৈধ পাতাগুলো থাকে ও outOfRange-এ [8] থাকে', () => {
  const res = FayzarFaithfulUI.parsePageRange('2-5,8', 6);
  assert.equal(res.ok, true);
  assert.deepEqual(res.pages, [2, 3, 4, 5]);
  assert.deepEqual(res.outOfRange, [8]);
});

await test('সম্পূর্ণ পাতা-সংখ্যার বাইরে ("8-10" যখন মোট পাতা ৫) হলে ok: false ও outOfRange-এ [8,9,10] থাকে', () => {
  const res = FayzarFaithfulUI.parsePageRange('8-10', 5);
  assert.equal(res.ok, false);
  assert.deepEqual(res.pages, []);
  assert.deepEqual(res.outOfRange, [8, 9, 10]);
  assert.ok(res.error && res.error.includes('বাইরে'));
});

await test('২ পাতার ফাইলে "১–৩" বাছলে [1, 2] নির্বাচিত হয় এবং ৩ outOfRange-এ যায়', () => {
  const res = FayzarFaithfulUI.parsePageRange('১–৩', 2);
  assert.equal(res.ok, true);
  assert.deepEqual(res.pages, [1, 2]);
  assert.deepEqual(res.outOfRange, [3]);
});

// ৪. সুইচ (__FZ_ON_PAGERANGE) ও একক অনুরোধে পাইপলাইন যাচাই
await test('সুইচ বন্ধ থাকলে পাতা-পরিসর সত্ত্বেও সব পাতা অপরিবর্তিত থাকে', () => {
  delete globalThis.__FZ_ON_PAGERANGE;
  assert.equal(FayzarFaithfulUI.isPageRangeOn(), false);
  const queue = [{ page: 1 }, { page: 2 }, { page: 3 }, { page: 4 }, { page: 5 }];
  const sel = FayzarFaithfulUI.selectQueuePages(queue, '2-3');
  assert.equal(sel.queue.length, 5);
});

await test('সুইচ চালু থাকলে নির্বাচিত পাতাই ("2-5,8") এক অনুরোধে faithful-pipeline-এ যায়', async () => {
  globalThis.__FZ_ON_PAGERANGE = true;
  assert.equal(FayzarFaithfulUI.isPageRangeOn(), true);

  const fullQueue = Array.from({ length: 10 }, (_, i) => ({ name: `doc.pdf (পৃষ্ঠা ${i + 1})`, pdfPage: i + 1 }));
  let captureCallCount = 0;
  let capturedQueue = null;

  globalThis.FayzarFaithfulCapture = {
    async run(q) {
      captureCallCount++;
      capturedQueue = q;
      return {
        blocks: q.map((it, idx) => ({ i: idx, page: idx + 1, type: 'para', text: `Page ${it.pdfPage}` })),
        issues: []
      };
    }
  };

  FayzarFaithfulUI.setRangeSpec('custom', '2-5,8');
  const sel = FayzarFaithfulUI.selectQueuePages(fullQueue);
  assert.equal(sel.ok, true);
  assert.deepEqual(sel.pages, [2, 3, 4, 5, 8]);
  assert.deepEqual(sel.queue.map((x) => x.pdfPage), [2, 3, 4, 5, 8]);

  const cap = await FayzarFaithful.capture(fullQueue, { pageRange: '2-5,8' });
  assert.equal(captureCallCount, 1, 'Gemini ক্যাপচার অনুরোধ একটাই হতে হবে');
  assert.equal(capturedQueue.length, 5);
  assert.deepEqual(capturedQueue.map((x) => x.pdfPage), [2, 3, 4, 5, 8]);
  assert.deepEqual(cap.selectedPages, [2, 3, 4, 5, 8]);
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
