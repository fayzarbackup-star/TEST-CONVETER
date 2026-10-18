/**
 * ============================================================================
 * G_CHUNK_v5 — অফলাইন ইউনিট টেস্ট (tests/ocr-chunk.test.mjs)
 * ============================================================================
 * যাচাইয়ের বিষয়সমূহ (কোনো নেটওয়ার্ক ছাড়া):
 *   ১. ভাগ-পরিকল্পনা (পাতা-সংখ্যা > ৮, প্রতি ভাগ ৫–৮ পাতা, প্রতি ভাগ ≤ ~৭০০KB base64)
 *   ২. হুবহু-মোড (faithful) এবং সুইচ (window.__FZ_ON_CHUNK) বন্ধে আচরণ অপরিবর্তিত
 *   ৩. অগ্রগতি বার্তা ("ভাগ ২/৪ চলছে…") স্ট্যাটাস ও টোস্টে প্রদর্শন
 *   ৪. ভাগের উত্তর জোড়া (ফ্রন্টম্যাটার শুধু প্রথম ভাগের, exam-renumber.js দিয়ে প্রশ্ন-নম্বর চালু, পাতা-বিরতি বজায়)
 *   ৫. একটি ভাগ ব্যর্থ হলে শুধু সেটিরই পুনঃচেষ্টা (proxy-failure-policy.js মেনে) এবং তবুও ব্যর্থ হলে বাকি ফলসহ স্পষ্ট বার্তা
 * ============================================================================
 */

import assert from 'node:assert/strict';
import engine, {
  planOcrChunks,
  splitMediaIntoChunks,
  mergeOcrChunks,
  runChunkedOcr,
  formatChunkProgress,
  estimateBase64Bytes,
  processWithChunking
} from '../js/ai-ocr-engine.js';

let proxyPolicy = null;
try {
  const m = await import('../js/proxy-failure-policy.js');
  proxyPolicy = m.default || m;
} catch (_) {
  proxyPolicy = null;
}

let examRenumber = null;
try {
  const m = await import('../js/layout-engine/exam-renumber.js');
  examRenumber = m.default || m;
} catch (_) {
  const BN = '\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef';
  examRenumber = {
    isExamType: (t) => /^EXAM[_\s-]?/i.test(String(t == null ? '' : t).trim()),
    toBengaliDigits: (n) => String(n).replace(/[0-9]/g, (d) => BN[+d]),
    renumberExamSections(parsedData) {
      for (const sec of (parsedData && parsedData.sections) || []) {
        const qs = (sec && sec.questions) || [];
        if (!qs.length || sec.keepNumbers) continue;
        const useBn = /[০-৯]/.test(String((qs[0] && qs[0].num) || '')) || !/[0-9]/.test(String((qs[0] && qs[0].num) || ''));
        qs.forEach((q, i) => {
          if (q) q.num = useBn ? this.toBengaliDigits(i + 1) : String(i + 1);
        });
      }
      return parsedData;
    }
  };
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err && err.stack ? err.stack : err}`);
  }
}

/** নির্দিষ্ট বাইট আকারের কৃত্রিম পাতা তৈরি */
function makePages(count, base64BytesPerPage = 60 * 1024) {
  const payload = 'A'.repeat(base64BytesPerPage);
  return Array.from({ length: count }, (_, idx) => ({
    name: `page_${idx + 1}.jpg`,
    mimeType: 'image/jpeg',
    data: `data:image/jpeg;base64,${payload}`,
    pdfPage: idx + 1
  }));
}

// ১. এক্সপোর্ট যাচাই
await test('১. প্রয়োজনীয় ফাংশনগুলো আলাদা করে export হয়েছে', () => {
  assert.equal(typeof planOcrChunks, 'function');
  assert.equal(typeof splitMediaIntoChunks, 'function');
  assert.equal(typeof mergeOcrChunks, 'function');
  assert.equal(typeof runChunkedOcr, 'function');
  assert.equal(typeof formatChunkProgress, 'function');
  assert.equal(typeof estimateBase64Bytes, 'function');
  assert.equal(typeof processWithChunking, 'function');
  assert.equal(typeof engine.planOcrChunks, 'function');
  assert.equal(typeof engine.mergeOcrChunks, 'function');
  assert.equal(typeof engine.runChunkedOcr, 'function');
});

// ২. ভাগ-পরিকল্পনা: পাতা ≤ ৮ হলে ভাগ হবে না
await test('২. পাতা-সংখ্যা ≤ ৮ হলে কোনো ভাগ না করে একসাথে পাঠানো হয়', () => {
  const pages5 = makePages(5, 80 * 1024);
  const chunks5 = planOcrChunks(pages5);
  assert.equal(chunks5.length, 1);
  assert.equal(chunks5[0].length, 5);

  const pages8 = makePages(8, 80 * 1024);
  const chunks8 = planOcrChunks(pages8);
  assert.equal(chunks8.length, 1);
  assert.equal(chunks8[0].length, 8);
});

// ৩. ভাগ-পরিকল্পনা: পাতা > ৮ হলে ৫–৮ পাতা করে ভাগ
await test('৩. সাধারণ (লেআউট) মোডে পাতা > ৮ হলে ৫–৮ পাতা করে সুষম ভাগ হয়', () => {
  for (const totalPages of [10, 11, 12, 13, 14, 15, 16, 18, 20]) {
    const pages = makePages(totalPages, 60 * 1024);
    const chunks = planOcrChunks(pages);
    assert.ok(chunks.length >= 2, `${totalPages} পাতায় অন্তত ২টি ভাগ হওয়া উচিত`);
    let countSum = 0;
    for (const ch of chunks) {
      assert.ok(ch.length >= 5 && ch.length <= 8, `${totalPages} পাতায় প্রতিটি ভাগে ৫–৮ পাতা থাকার কথা, পাওয়া গেছে ${ch.length}`);
      assert.ok(ch.totalBytes <= 700 * 1024, 'প্রতি ভাগের বাইট ৭০০KB-এর নিচে থাকতে হবে');
      countSum += ch.length;
    }
    assert.equal(countSum, totalPages);
  }
});

// ৪. ভাগ-পরিকল্পনা: পেলোড বাইট সীমা (≤ ~৭০০KB base64)
await test('৪. পেলোড বাইট দেখে ভাগের আকার নিয়ন্ত্রিত হয় (প্রতি ভাগ ≤ ~৭০০KB base64)', () => {
  const maxBytes = 700 * 1024;
  // প্রতি পাতা ১৩০KB হলে ৫ পাতায় ৬৫০KB (≤ ৭০০KB), কিন্তু ৬ পাতায় ৭৮০KB (> ৭০০KB)
  const pages10 = makePages(10, 130 * 1024);
  const chunks10 = planOcrChunks(pages10);
  assert.equal(chunks10.length, 2);
  assert.equal(chunks10[0].length, 5);
  assert.equal(chunks10[1].length, 5);
  for (const ch of chunks10) {
    assert.ok(ch.totalBytes <= maxBytes, `ভাগের আকার ${ch.totalBytes} বাইট ৭০০KB সীমা ছাড়িয়েছে`);
  }

  // প্রতি পাতা ২২০KB হলে ৩ পাতায় ৬৬০KB (≤ ৭০০KB), ৪ পাতায় ৮৮০KB (> ৭০০KB)
  const pages9Heavy = makePages(9, 220 * 1024);
  const chunksHeavy = planOcrChunks(pages9Heavy);
  assert.equal(chunksHeavy.length, 3);
  for (const ch of chunksHeavy) {
    assert.equal(ch.length, 3);
    assert.ok(ch.totalBytes <= maxBytes);
  }
});

// ৫. হুবহু-মোড (faithful) এবং সুইচ বন্ধের আচরণ
await test('৫. হুবহু-মোড (faithful) এবং সুইচ বন্ধে আচরণ অপরিবর্তিত থাকে', () => {
  const pages12 = makePages(12, 70 * 1024);

  // হুবহু-মোডে ১২ পাতা থাকলেও ভাগ হবে না
  const faithfulChunks = planOcrChunks(pages12, { mode: 'faithful' });
  assert.equal(faithfulChunks.length, 1);
  assert.equal(faithfulChunks[0].length, 12);

  // সুইচ বন্ধ থাকলে respectSwitch: true দিলে ভাগ হবে না
  delete globalThis.__FZ_ON_CHUNK;
  const switchOffChunks = planOcrChunks(pages12, { respectSwitch: true });
  assert.equal(switchOffChunks.length, 1);
  assert.equal(switchOffChunks[0].length, 12);

  // পুরনো সংখ্যাসূচক splitMediaIntoChunks(items, 3) আগের মতোই কাজ করে
  const legacyChunks = splitMediaIntoChunks(pages12, 3);
  assert.equal(legacyChunks.length, 4);
  assert.equal(legacyChunks[0].length, 3);
});

// ৬. অগ্রগতি বার্তা যাচাই ("ভাগ ২/৪ চলছে…")
await test('৬. অগ্রগতি বার্তা হুবহু "ভাগ ২/৪ চলছে…" ফরম্যাটে তৈরি হয়', () => {
  assert.equal(formatChunkProgress(1, 4), 'ভাগ ১/৪ চলছে…');
  assert.equal(formatChunkProgress(2, 4), 'ভাগ ২/৪ চলছে…');
  assert.equal(formatChunkProgress(4, 4), 'ভাগ ৪/৪ চলছে…');
});

// ৭. উত্তর জোড়া: ফ্রন্টম্যাটার শুধু প্রথম ভাগের রাখা ও প্রশ্ন-নম্বর চালু থাকা (exam-renumber.js সহ)
await test('৭. উত্তর-জোড়া: প্রথম ভাগের ফ্রন্টম্যাটার থাকে এবং পরের ভাগে প্রশ্ন-নম্বর চালু থাকে', () => {
  let renumberCalled = 0;
  const wrappedRenumber = {
    ...examRenumber,
    renumberExamSections(parsedData, opts) {
      renumberCalled++;
      return examRenumber.renumberExamSections(parsedData, opts);
    }
  };

  const chunk1 = [
    '---',
    'doc_type: EXAM_CQ',
    'columns: 2',
    'subject: পদার্থবিজ্ঞান',
    '---',
    '# আদর্শ উচ্চ বিদ্যালয়',
    '## সৃজনশীল প্রশ্ন',
    '১। প্রথম উদ্দীপকটি পড়ো:',
    'ক. বেগ কী?\t১',
    'খ. ত্বরণ ব্যাখ্যা করো।\t২',
    '২। দ্বিতীয় উদ্দীপকটি পড়ো:',
    'ক. বল কী?\t১'
  ].join('\n');

  const chunk2 = [
    '---',
    'doc_type: EXAM_CQ',
    'columns: 2',
    'subject: পদার্থবিজ্ঞান',
    '---',
    '# আদর্শ উচ্চ বিদ্যালয়',
    '## সৃজনশীল প্রশ্ন',
    '১। তৃতীয় উদ্দীপকটি পড়ো:',
    'ক. কাজ কী?\t১',
    '২। চতুর্থ উদ্দীপকটি পড়ো:',
    'ক. ক্ষমতা কী?\t১'
  ].join('\n');

  const merged = mergeOcrChunks([chunk1, chunk2], { examRenumber: wrappedRenumber });

  // exam-renumber.js আসলেই কল হয়েছে কি না
  assert.equal(renumberCalled, 1);

  // ফ্রন্টম্যাটার শুধু একবার (শুরুতে) আছে কি না
  const fmMatches = merged.match(/^---\r?\n[\s\S]*?\r?\n---/gm) || [];
  assert.equal(fmMatches.length, 1);
  assert.ok(merged.startsWith('---\ndoc_type: EXAM_CQ'));

  // পরের ভাগের প্রশ্ন ১।, ২। বদলে ৩।, ৪। হয়েছে কি না
  assert.ok(merged.includes('১। প্রথম উদ্দীপকটি পড়ো:'));
  assert.ok(merged.includes('২। দ্বিতীয় উদ্দীপকটি পড়ো:'));
  assert.ok(merged.includes('৩। তৃতীয় উদ্দীপকটি পড়ো:'));
  assert.ok(merged.includes('৪। চতুর্থ উদ্দীপকটি পড়ো:'));
  assert.ok(!merged.includes('১। তৃতীয় উদ্দীপকটি পড়ো:'));
});

// ৮. উত্তর জোড়া: পাতা-বিরতি চিহ্ন ও বিভাগ-বিরতি বজায় থাকা
await test('৮. উত্তর-জোড়া: পাতা-বিরতি চিহ্ন ও নতুন বিভাগের স্বতন্ত্র নম্বরায়ন বজায় থাকে', () => {
  const chunk1 = [
    '---',
    'doc_type: EXAM_COMBINED',
    'columns: 2',
    '---',
    '## ক-বিভাগ (সৃজনশীল প্রশ্ন)',
    '১। প্রথম প্রশ্ন',
    '---PAGE_BREAK---',
    '২। দ্বিতীয় প্রশ্ন'
  ].join('\n');

  const chunk2 = [
    '---',
    'doc_type: EXAM_COMBINED',
    'columns: 2',
    '---',
    '১। তৃতীয় প্রশ্ন',
    '<!-- PAGE_BREAK -->',
    '---SECTION_BREAK:MCQ---',
    '## খ-বিভাগ (বহুনির্বাচনি প্রশ্ন)',
    '১। নিচের কোনটি মৌলিক পদার্থ?',
    '\tক. পানি\tখ. লোহা\tগ. লবণ\tঘ. চিনি'
  ].join('\n');

  const merged = mergeOcrChunks([chunk1, chunk2]);

  // পাতা-বিরতি চিহ্নগুলো অক্ষত আছে
  assert.ok(merged.includes('---PAGE_BREAK---'));
  assert.ok(merged.includes('<!-- PAGE_BREAK -->'));
  assert.ok(merged.includes('---SECTION_BREAK:MCQ---'));

  // ক-বিভাগের ৩য় প্রশ্নটি ৩। হয়েছে এবং খ-বিভাগের ১ম MCQ ১। থেকেই শুরু হয়েছে
  assert.ok(merged.includes('৩। তৃতীয় প্রশ্ন'));
  assert.ok(merged.includes('১। নিচের কোনটি মৌলিক পদার্থ?'));
});

// ৯. একটি ভাগ ব্যর্থ হলে শুধু সেটাই পুনঃচেষ্টা (proxy-failure-policy.js মেনে)
await test('৯. কোনো ভাগ ব্যর্থ হলে শুধু সেটাই আবার চেষ্টা হয় এবং সফল হলে পূর্ণ উত্তর মেলে', async () => {
  const pages12 = makePages(12, 60 * 1024); // ৬ + ৬ পাতার ২টি ভাগ
  const callCounts = [0, 0];
  const progressLogs = [];
  const toastLogs = [];

  const mockRequest = async (chunk, idx) => {
    callCounts[idx]++;
    if (idx === 1 && callCounts[idx] === 1) {
      const err = new Error('Proxy HTTP 502');
      err.proxyStatus = 502;
      err.proxyBody = { error: 'upstream_failed', lastError: { status: 503, detail: 'high demand' } };
      throw err;
    }
    if (idx === 0) {
      return '---\ndoc_type: EXAM_CQ\n---\n১। প্রথম ভাগের প্রশ্ন ১\n২। প্রথম ভাগের প্রশ্ন ২';
    }
    return '---\ndoc_type: EXAM_CQ\n---\n১। দ্বিতীয় ভাগের প্রশ্ন ১\n২। দ্বিতীয় ভাগের প্রশ্ন ২';
  };

  const out = await runChunkedOcr(pages12, mockRequest, {
    proxyPolicy,
    examRenumber,
    onProgress: (msg) => progressLogs.push(msg),
    onToast: (msg) => toastLogs.push(msg)
  });

  // ১ম ভাগ মাত্র ১ বার এবং ২য় ভাগ ২ বার (১ বার ব্যর্থ + ১ বার পুনঃচেষ্টা) কল হয়েছে
  assert.deepEqual(callCounts, [1, 2]);

  // অগ্রগতি বার্তা যাচাই
  assert.ok(progressLogs.includes('ভাগ ১/২ চলছে…'));
  assert.ok(progressLogs.includes('ভাগ ২/২ চলছে…'));
  assert.ok(toastLogs.includes('ভাগ ২/২ চলছে…'));

  // উত্তর সঠিকভাবে জোড়া ও ধারাবাহিক নম্বরায়িত হয়েছে
  assert.ok(out.includes('১। প্রথম ভাগের প্রশ্ন ১'));
  assert.ok(out.includes('৩। দ্বিতীয় ভাগের প্রশ্ন ১'));
  assert.ok(out.includes('৪। দ্বিতীয় ভাগের প্রশ্ন ২'));
});

// ১০. পুনঃচেষ্টার পরও একটি ভাগ ব্যর্থ হলে বাকি ফলসহ স্পষ্ট বার্তা এবং fatal_input-এ অযথা পুনঃচেষ্টা না করা
await test('১০. পুনঃচেষ্টাতেও ব্যর্থ হলে বাকি সফল ভাগের ফলসহ স্পষ্ট বার্তা দেয় (proxy-failure-policy মেনে)', async () => {
  const pages18 = makePages(18, 60 * 1024); // ৩টি ভাগ (৬ + ৬ + ৬ পাতা)
  const callCounts = [0, 0, 0];

  const mockRequest = async (chunk, idx) => {
    callCounts[idx]++;
    if (idx === 1) {
      // ২য় ভাগে বারবার সার্ভার ত্রুটি
      const err = new Error('Worker timeout');
      err.proxyStatus = 502;
      err.proxyBody = { error: 'timeout', lastError: { status: 504, detail: 'Gateway timeout' } };
      throw err;
    }
    if (idx === 0) {
      return '---\ndoc_type: EXAM_CQ\n---\n১। প্রথম ভাগের প্রশ্ন';
    }
    return '---\ndoc_type: EXAM_CQ\n---\n১। তৃতীয় ভাগের প্রশ্ন';
  };

  const out = await runChunkedOcr(pages18, mockRequest, {
    proxyPolicy,
    examRenumber,
    maxRetries: 1
  });

  // ১ম ও ৩য় ভাগ ১ বার করে, ২য় ভাগ ২ বার (মূল + ১ পুনঃচেষ্টা) কল হয়েছে
  assert.deepEqual(callCounts, [1, 2, 1]);

  // ১ম ও ৩য় ভাগের ফলাফল আছে এবং প্রশ্ন নম্বর ধারাবাহিক (১। -> ২।)
  assert.ok(out.includes('১। প্রথম ভাগের প্রশ্ন'));
  assert.ok(out.includes('২। তৃতীয় ভাগের প্রশ্ন'));

  // ২য় ভাগের ব্যর্থতার স্পষ্ট বাংলা বার্তা আছে
  assert.ok(out.includes('[অসম্পূর্ণ: ভাগ ২/৩'));
  assert.ok(out.includes('বাকি ভাগের ফলাফল সংরক্ষিত আছে'));

  // fatal_input (400)-এর ক্ষেত্রে proxy-failure-policy অনুযায়ী পুনঃচেষ্টা হবে না (১ বারই থামবে)
  const fatalCalls = [0, 0];
  await runChunkedOcr(makePages(10, 50 * 1024), async (chunk, idx) => {
    fatalCalls[idx]++;
    if (idx === 1) {
      const err = new Error('Invalid image');
      err.proxyStatus = 502;
      err.proxyBody = {
        lastError: { status: 400, detail: 'Unable to process input image' },
        attempts: [{ class: 'FATAL_INPUT' }]
      };
      throw err;
    }
    return '---\ndoc_type: EXAM_CQ\n---\n১। প্রথম প্রশ্ন';
  }, { proxyPolicy, examRenumber, maxRetries: 2 });

  assert.deepEqual(fatalCalls, [1, 1]);
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
