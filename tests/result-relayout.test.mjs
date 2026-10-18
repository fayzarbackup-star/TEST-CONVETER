/**
 * D_RELAYOUT_v5 — ফলাফল-পাতায় লেআউট/সেটিং বদল ও "ঠিক হয়নি?" ইউনিট টেস্ট
 * Node পরিবেশে বাইরের কোনো লাইব্রেরি বা DOM ছাড়াই চলে।
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ArchetypeMap = require('../js/layout-engine/archetype-map.js');
globalThis.ArchetypeMap = ArchetypeMap;
const FayzarRelayout = require('../js/result-relayout.js');

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

// ১. সুইচ (__FZ_ON_RELAYOUT) যাচাই
await test('সুইচ বন্ধ থাকলে isEnabled() false ফেরত দেয়', () => {
  delete globalThis.__FZ_ON_RELAYOUT;
  assert.equal(FayzarRelayout.isEnabled(), false);
});

await test('সুইচ চালু থাকলে isEnabled() true ফেরত দেয়', () => {
  globalThis.__FZ_ON_RELAYOUT = true;
  assert.equal(FayzarRelayout.isEnabled(), true);
});

// ২. D1: লেআউট অপশন তৈরি ও বাংলা নাম যাচাই
await test('ArchetypeMap থেকে সব লেআউট অপশন ও বাংলা নাম তৈরি হয়', () => {
  const opts = FayzarRelayout.getLayoutOptions();
  const keys = Object.keys(ArchetypeMap.ARCHETYPE_TO_DOCTYPE);
  assert.equal(opts.length, keys.length);
  for (const item of opts) {
    assert.ok(item.id, 'id থাকতে হবে');
    assert.equal(item.docType, ArchetypeMap.ARCHETYPE_TO_DOCTYPE[item.archetype]);
    assert.ok(item.label && item.label.length > 2, 'বাংলা নাম থাকতে হবে');
  }
});

await test('আর্কেটাইপ ও DOC_TYPE উভয় থেকেই সঠিক বাংলা নাম ও docType পাওয়া যায়', () => {
  assert.equal(FayzarRelayout.resolveDocType('bengali_cq_paper'), 'EXAM_CQ');
  assert.equal(FayzarRelayout.resolveDocType('legal_deed_contract'), 'STAMP_DEED');
  assert.equal(FayzarRelayout.resolveDocType('EXAM_MCQ'), 'EXAM_MCQ');
  assert.equal(FayzarRelayout.getBanglaLabel('bengali_cq_paper'), 'সৃজনশীল প্রশ্নপত্র');
  assert.equal(FayzarRelayout.getBanglaLabel('PROTTOYON'), 'প্রত্যয়নপত্র / সনদ');
});

await test('মার্কডাউন থেকে বর্তমান লেআউট সঠিকভাবে শনাক্ত হয় (detectLayout)', () => {
  const mdWithFm = '---\ndoc_type: EXAM_MCQ\ninstitution: আদর্শ বিদ্যালয়\n---\n১. নিচের কোনটি সঠিক?';
  const det1 = FayzarRelayout.detectLayout(mdWithFm);
  assert.equal(det1.docType, 'EXAM_MCQ');
  assert.ok(det1.label.includes('বহুনির্বাচনি'));

  const det2 = FayzarRelayout.detectLayout('সাধারণ অনুচ্ছেদ', {
    classify: () => ({ type: 'GOVT_APP' })
  });
  assert.equal(det2.docType, 'GOVT_APP');
  assert.ok(det2.label.includes('আবেদনপত্র'));
});

// ৩. D1: ফ্রন্টম্যাটারে layout_lock ও doc_type বসানো
await test('ফ্রন্টম্যাটারহীন মার্কডাউনে doc_type ও layout_lock: true যুক্ত হয়', () => {
  const raw = '১। ক) সৃজনশীল প্রশ্ন\nখ) অনুধাবন প্রশ্ন';
  const out = FayzarRelayout.applyFrontmatter(raw, 'bengali_cq_paper');
  assert.match(out, /^---\n/);
  assert.match(out, /doc_type: EXAM_CQ/);
  assert.match(out, /layout_lock: true/);
  assert.match(out, /archetype: bengali_cq_paper/);
  assert.ok(out.endsWith(raw));
});

await test('বিদ্যমান ফ্রন্টম্যাটারের অন্যান্য তথ্য অক্ষত রেখে doc_type ও layout_lock আপডেট হয়', () => {
  const raw = '---\ndoc_type: GENERAL\nlayout_lock: false\ninstitution: রংপুর জিলা স্কুল\nsubject: গণিত\n---\nপ্রশ্ন ১। x + y = 5';
  const out = FayzarRelayout.applyFrontmatter(raw, 'math_science_paper', {
    columns: 2,
    pageSize: 'Legal',
    orientation: 'আড়াআড়ি',
    booklet: 'হ্যাঁ',
    fontSize: '১২'
  });
  const parsed = FayzarRelayout.parseFrontmatter(out);
  assert.equal(parsed.fields.doc_type, 'EXAM_MATH');
  assert.equal(parsed.fields.layout_lock, 'true');
  assert.equal(parsed.fields.archetype, 'math_science_paper');
  assert.equal(parsed.fields.institution, 'রংপুর জিলা স্কুল');
  assert.equal(parsed.fields.subject, 'গণিত');
  assert.equal(parsed.fields.columns, '2');
  assert.equal(parsed.fields.page_size, 'legal');
  assert.equal(parsed.fields.page_orientation, 'landscape');
  assert.equal(parsed.fields.booklet, 'true');
  assert.equal(parsed.fields.font_size, '12');
  assert.equal(parsed.body.trim(), 'প্রশ্ন ১। x + y = 5');
});

// ৪. D2: সেটিংস প্যানেলের অপশন তৈরি (FayzarExport.produce-এর জন্য)
await test('কলাম ১/২, পাতা A4/Legal/Letter, লম্বালম্বি/আড়াআড়ি, বুকলেট হ্যাঁ/না, ফন্ট-সাইজ থেকে সঠিক অপশন তৈরি হয়', () => {
  const opt1 = FayzarRelayout.buildExportOptions(
    {
      columns: '২',
      pageSize: 'Legal',
      orientation: 'আড়াআড়ি',
      booklet: 'হ্যাঁ',
      fontSize: '১৩'
    },
    { format: 'docx-bijoy', layout: 'bengali_cq_paper' }
  );
  assert.equal(opt1.format, 'docx-bijoy');
  assert.equal(opt1.docType, 'EXAM_CQ');
  assert.equal(opt1.columns, 2);
  assert.equal(opt1.pageSize, 'legal');
  assert.equal(opt1.pageSizeLabel, 'Legal');
  assert.equal(opt1.orientation, 'landscape');
  assert.equal(opt1.landscape, true);
  assert.equal(opt1.booklet, true);
  assert.equal(opt1.fontSize, 13);
  assert.equal(opt1.__frontmatter.layout_lock, true);
  assert.equal(opt1.__frontmatter.doc_type, 'EXAM_CQ');

  const opt2 = FayzarRelayout.buildExportOptions(
    {
      columns: 1,
      pageSize: 'Letter',
      orientation: 'লম্বালম্বি',
      booklet: 'না',
      fontSize: 11
    },
    { format: 'doc', layout: 'govt_application' }
  );
  assert.equal(opt2.docType, 'GOVT_APP');
  assert.equal(opt2.columns, 1);
  assert.equal(opt2.pageSize, 'letter');
  assert.equal(opt2.orientation, 'portrait');
  assert.equal(opt2.landscape, false);
  assert.equal(opt2.booklet, false);
  assert.equal(opt2.fontSize, 11);
});

// ৫. D4: খতিয়ান (localStorage 'fz_relayout_log') ও ফাইল-হ্যাশ বর্জন যাচাই
await test('localStorage fz_relayout_log-এ "শনাক্ত X → বাছাই Y", সময় ও শুধু মেটা সংরক্ষিত হয় (ফাইল-হ্যাশ নয়)', () => {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  FayzarRelayout.clearLogs();

  const entry = FayzarRelayout.recordLog('bengali_standard_question_paper', 'bengali_cq_paper', {
    columns: 2,
    pageSize: 'a4',
    fileHash: 'abc123sha256',
    hash: 'deadbeef',
    sha256: '999999',
    fileName: 'secret.pdf',
    text: 'পুরো টেক্সট রাখা যাবে না'
  });

  assert.match(entry.transition, /^শনাক্ত .+ → বাছাই .+$/);
  assert.equal(entry.codeTransition, 'শনাক্ত bengali_standard_question_paper → বাছাই bengali_cq_paper');
  assert.equal(typeof entry.at, 'number');
  assert.ok(entry.time.includes('T'));
  assert.equal(entry.meta.columns, 2);
  assert.equal(entry.meta.pageSize, 'a4');
  assert.equal('fileHash' in entry.meta, false);
  assert.equal('hash' in entry.meta, false);
  assert.equal('sha256' in entry.meta, false);
  assert.equal('fileName' in entry.meta, false);
  assert.equal('text' in entry.meta, false);

  const rawJson = store.fz_relayout_log;
  assert.ok(rawJson, 'localStorage-এ fz_relayout_log থাকতে হবে');
  assert.equal(rawJson.includes('abc123sha256'), false);
  assert.equal(rawJson.includes('secret.pdf'), false);
  const parsedLogs = FayzarRelayout.getLogs();
  assert.equal(parsedLogs.length, 1);
  assert.equal(parsedLogs[0].to, 'bengali_cq_paper');
});

await test('localStorage ত্রুটি দিলেও try/catch-এর কারণে recordLog ক্র্যাশ করে না', () => {
  globalThis.localStorage = {
    getItem: () => { throw new Error('Storage disabled'); },
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: () => { throw new Error('Storage disabled'); }
  };
  assert.doesNotThrow(() => {
    const rec = FayzarRelayout.recordLog('GENERAL', 'OFFICE_PAD', { columns: 1 });
    assert.ok(rec.transition.includes('→ বাছাই'));
  });
});

// ৬. D1 + D2 + মাপকাঠি (<৫ সেকেন্ড): সেশনের Markdown থেকে OCR ছাড়াই পুনরায় রপ্তানি
await test('reExport সেশনের Markdown থেকে OCR না ডেকেই <৫ সেকেন্ডে নতুন ফাইল রপ্তানি করে', async () => {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  FayzarRelayout.clearLogs();

  let ocrCalled = false;
  globalThis.FayzarAiOcrEngine = {
    state: { unicodeText: 'প্রশ্ন ১। নিচের উদ্দীপকটি পড়ো।' },
    startUnifiedOcr: async () => { ocrCalled = true; }
  };

  let exportedText = '';
  let exportedOpts = null;
  const mockExporter = {
    async produce(text, opt) {
      exportedText = text;
      exportedOpts = opt;
      return { blob: { size: text.length }, format: opt.format, steps: ['master-docx', 'doc'] };
    }
  };

  const res = await FayzarRelayout.reExport({
    layout: 'bengali_cq_paper',
    settings: { columns: 2, pageSize: 'A4', orientation: 'landscape', booklet: true, fontSize: 11 },
    format: 'doc',
    exporter: mockExporter
  });

  assert.equal(res.ok, true);
  assert.equal(ocrCalled, false, 'লেআউট বদলে আবার OCR ডাকা যাবে না');
  assert.ok(res.durationMs < 5000, 'রপ্তানি ৫ সেকেন্ডের কম সময়ে হতে হবে');
  assert.match(exportedText, /doc_type: EXAM_CQ/);
  assert.match(exportedText, /layout_lock: true/);
  assert.equal(exportedOpts.columns, 2);
  assert.equal(exportedOpts.pageSize, 'a4');
  assert.equal(exportedOpts.orientation, 'landscape');
  assert.equal(exportedOpts.booklet, true);
  assert.equal(exportedOpts.fontSize, 11);
});

// ৭. D3: "ঠিক হয়নি?" → requestReOcr হুক যাচাই
await test('requestReOcr কারণ ছাড়া বা নিশ্চিত না করলে OCR ডাকে না, নিশ্চিত করলে বিশেষ প্রম্পটসহ ডাকে', async () => {
  let calledWithPrompt = null;
  FayzarRelayout.setReOcrHandler(async (prompt) => {
    calledWithPrompt = prompt;
  });

  const emptyRes = await FayzarRelayout.requestReOcr('   ', { confirmed: true });
  assert.equal(emptyRes.ok, false);
  assert.equal(calledWithPrompt, null);

  const unconfirmedRes = await FayzarRelayout.requestReOcr('ডান কলামের লেখা বাদ পড়েছে', { confirmed: false });
  assert.equal(unconfirmedRes.ok, false);
  assert.equal(unconfirmedRes.cancelled, true);
  assert.equal(calledWithPrompt, null);

  const okRes = await FayzarRelayout.requestReOcr('ডান কলামের লেখা বাদ পড়েছে', { confirmed: true });
  assert.equal(okRes.ok, true);
  assert.ok(calledWithPrompt && calledWithPrompt.includes('ডান কলামের লেখা বাদ পড়েছে'));
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
