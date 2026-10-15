/**
 * TEMPLATE_COMPOSE_PLAN T2 — টেমপ্লেট-গ্যালারি (প্রথম দল: প্রশ্নপত্র)।
 * চুক্তি: ছাঁচ বাছলে ফ্রন্টম্যাটার তালাবদ্ধ → ক্লাসিফায়ার ছাঁচের doc_type, প্ল্যানার ছাঁচের প্রোফাইল নেয়
 * (Gemini-র তথ্য/শ্রেণি-নিয়ম যা-ই বলুক); ব্যবহারকারীর "১ কলাম" তবু জেতে; ছাঁচ না বাছলে আগের আচরণ অপরিবর্তিত।
 *   node tests/t2-template-composer.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const [n, p] of [['FayzarLayoutUnits', 'js/layout-engine/layout-units.js'], ['CqBookletPlanner', 'js/layout-engine/cq-booklet-planner.js'],
  ['McqLayoutPlanner', 'js/layout-engine/mcq-layout-planner.js'], ['TextRunProcessor', 'js/layout-engine/text-run-processor.js'],
  ['FayzarExamRenumber', 'js/layout-engine/exam-renumber.js'], ['FayzarFrontmatter', 'js/layout-engine/frontmatter-header.js'],
  ['QuestionEngine', 'js/engines/question-engine.js'], ['DocClassifier', 'js/engines/doc-classifier.js'],
  ['FayzarApplicationLayout', 'js/layout-engine/application-layout.js'], ['FayzarLetterLayout', 'js/layout-engine/letter-layout.js'],
  ['FayzarCertificateLayout', 'js/layout-engine/certificate-layout.js'], ['FayzarCashMemoLayout', 'js/layout-engine/cash-memo-layout.js'],
  ['FayzarReceiptLayout', 'js/layout-engine/receipt-layout.js'], ['FayzarCvLayout', 'js/layout-engine/cv-layout.js'],
  ['FayzarEnCvLayout', 'js/layout-engine/en-cv-layout.js']]) {
  const m = require(path.join(ROOT, p));
  if (m && !globalThis[n]) globalThis[n] = m;
}
const T = require(path.join(ROOT, 'js/layout-engine/template-composer.js'));
const C = globalThis.DocClassifier, P = globalThis.CqBookletPlanner, FM = globalThis.FayzarFrontmatter;
const E = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');

const CLASS4 = fx('primary-class4-bangla.input.md');   // ৪র্থ শ্রেণি ⇒ নিয়মে EXAM_PRIMARY (ল্যান্ডস্কেপ)
const CQ = fx('real-ocr/hmathcq.md');   // আসল OCR: ৪টি সৃজনশীল-ব্লক (কৃত্রিম cq-short-এর "[উদ্দীপক ১]" ধরন structureStats গোনে না)
const MCQ = fx('mcq-pure-28.input.md');

// সাইটের ডাউনলোড-পথের মতো: classify → ফ্রন্টম্যাটার-বাদ লেখা + __frontmatter
async function siteDocx(text, opts = {}) {
  const type = C.classify(text).type;
  const sp = FM.split(text);
  const out = await E.generateWordDoc(sp.body.trim(), type, { format: 'docx', __frontmatter: sp.fields, ...opts });
  const buf = Buffer.isBuffer(out) ? out : Buffer.from(await out.arrayBuffer());
  return { type, xml: await (await JSZip.loadAsync(buf)).file('word/document.xml').async('string') };
}
const landscape = (xml) => /w:orient="landscape"/.test(xml);

test('রেজিস্ট্রি: প্রশ্নপত্রের ৬টি ছাঁচ, অনন্য id, বৈধ doc_type ও প্রোফাইল, আইকন', () => {
  const exam = T.REGISTRY.filter((t) => t.group === 'exam');
  assert.equal(exam.length, 6);
  assert.equal(new Set(T.REGISTRY.map((t) => t.id)).size, T.REGISTRY.length);
  for (const t of exam) {
    assert.ok(C.DOC_TYPES[t.doc_type], t.id + ' doc_type');
    if (t.profile) assert.ok(P.LAYOUT_PROFILES[t.profile], t.id + ' profile');
    assert.match(T.icon(t.icon), /<svg[^>]*>.*<rect/);
    assert.match(T.promptHint(t), new RegExp('doc_type: ' + t.doc_type));
  }
});

test('enforce: doc_type প্রথমে, তালা ও প্রোফাইল; Gemini-র অন্য তথ্য অক্ষত; পুরোনো ধরন-লাইন বাদ', () => {
  const src = '---\ndoc_type: EXAM_GENERAL\ninstitute: আদর্শ স্কুল\ngrade: 8\nlayout: X\n---\n১। প্রশ্ন';
  const { text } = T.enforce(src, 'exam-primary');
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/)[1].split('\n');
  assert.deepEqual(fm.slice(0, 4), ['doc_type: EXAM_GENERAL', 'layout_lock: true', 'template: exam-primary', 'layout_profile: EXAM_PRIMARY']);
  assert.ok(fm.includes('institute: আদর্শ স্কুল') && fm.includes('grade: 8') && !fm.includes('layout: X'));
  assert.match(text, /\n---\n১। প্রশ্ন$/);
  // ফ্রন্টম্যাটার না থাকলেও তৈরি হয়
  assert.match(T.enforce('১। প্রশ্ন', 'exam-mcq').text, /^---\ndoc_type: EXAM_MCQ\nlayout_lock: true\ntemplate: exam-mcq\n---\n১। প্রশ্ন$/);
  // অজানা ছাঁচ ⇒ অপরিবর্তিত
  assert.equal(T.enforce(src, 'nope').text, src);
});

test('ক্লাসিফায়ার: তালা থাকলে ছাঁচের ধরন (তথ্য/শ্রেণি-নিয়ম উপেক্ষা); তালা না থাকলে আগের মতো', () => {
  assert.equal(C.classify(CLASS4).type, 'EXAM_GENERAL');
  assert.equal(C.classify(T.enforce(CLASS4, 'exam-cq').text).type, 'EXAM_CQ');
  assert.equal(C.classify(T.enforce(CQ, 'exam-math').text).type, 'EXAM_MATH');
  assert.equal(C.classify(T.enforce(MCQ, 'exam-mcq').text).type, 'EXAM_MCQ');
  assert.equal(C.classify(T.enforce(CQ, 'exam-combined').text).type, 'EXAM_COMBINED');
  // অচেনা doc_type-এ তালা ⇒ আগের নিয়মে
  assert.notEqual(C.classify('---\ndoc_type: WHATEVER\nlayout_lock: true\n---\n১। প্রশ্ন').reason || '', 'Template lock: WHATEVER');
});

test('প্ল্যানার: layout_profile অগ্রাধিকার; ব্যবহারকারীর "১ কলাম" তবু জেতে', () => {
  const fm = (p) => ({ __frontmatter: { layout_profile: p, grade: '4' } });
  assert.equal(P.layoutKey('EXAM_GENERAL', { header: {} }, { __frontmatter: { grade: '4' } }), 'EXAM_PRIMARY');
  assert.equal(P.layoutKey('EXAM_GENERAL', { header: {} }, fm('EXAM_GENERAL')), 'EXAM_GENERAL');
  assert.equal(P.layoutKey('EXAM_GENERAL', { header: {} }, { __frontmatter: { layout_profile: 'EXAM_PRIMARY', grade: '9' } }), 'EXAM_PRIMARY');
  assert.equal(P.layoutKey('EXAM_GENERAL', { header: {} }, Object.assign(fm('EXAM_PRIMARY'), { layoutColumns: 1 })), 'EXAM_ONECOL');
  assert.equal(P.layoutKey('EXAM_CQ', { header: {} }, { __frontmatter: { layout_profile: 'BOGUS' } }), 'EXAM_CQ');
});

test('আসল .docx: সাধারণ-ছাঁচে ৪র্থ শ্রেণিও লম্বালম্বি; প্রাথমিক-ছাঁচে ল্যান্ডস্কেপ; ছাঁচ ছাড়া আগের মতো', async () => {
  const plain = await siteDocx(CLASS4);
  assert.ok(landscape(plain.xml), 'no template: class 4 → primary landscape (unchanged)');
  const gen = await siteDocx(T.enforce(CLASS4, 'exam-general').text);
  assert.equal(gen.type, 'EXAM_GENERAL');
  assert.ok(!landscape(gen.xml), 'general template → portrait');
  const prim = await siteDocx(T.enforce(CLASS4, 'exam-primary').text);
  assert.ok(landscape(prim.xml), 'primary template → landscape');
  const cq = await siteDocx(T.enforce(CQ, 'exam-cq').text);
  assert.equal(cq.type, 'EXAM_CQ');
  assert.ok(landscape(cq.xml), 'CQ template → landscape booklet');
});

// ---------------------------------------------------------------- দল ২: প্রত্যয়ন ও সনদ
const PR_SCHOOL = fx('prottoyon-school.input.md');
const CERT_L = fx('cert-landscape.input.md');   // ফ্রন্টম্যাটারে page_orientation: landscape
const CERT_STUB = fx('cert-stub.input.md');
const CT = globalThis.FayzarCertificateLayout;

test('প্রত্যয়ন-দল: ৪টি ছাঁচ, আইকন, অফিস-গঠনের নির্দেশ; enforce দিক তালাবদ্ধ করে', () => {
  const cert = T.REGISTRY.filter((t) => t.group === 'cert');
  assert.deepEqual(cert.map((t) => t.id), ['prottoyon-school', 'prottoyon-up', 'cert-landscape', 'cert-stub']);
  for (const t of cert) {
    assert.match(T.icon(t.icon), /<svg[^>]*>.*<rect/);
    assert.match(T.promptHint(t), /never invent/);
  }
  assert.ok(T.GROUPS.some((g) => g.id === 'cert'));
  const { text } = T.enforce(CERT_L, 'prottoyon-school');
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/)[1];
  assert.match(fm, /^page_orientation: portrait$/m);
  assert.ok(!/landscape/.test(fm), 'old orientation dropped');
  assert.equal(C.classify(text).type, 'PROTTOYON');
});

test('আসল .docx: প্রত্যয়ন-ছাঁচ লম্বালম্বি (ল্যান্ডস্কেপ-উৎসেও), সনদ-ছাঁচ ল্যান্ডস্কেপ, মুড়ি-ছাঁচে মুড়ি', async () => {
  const plain = await siteDocx(PR_SCHOOL);
  assert.ok(!landscape(plain.xml), 'no template: school prottoyon portrait (unchanged)');
  const p = await siteDocx(T.enforce(CERT_L, 'prottoyon-school').text);
  assert.equal(p.type, 'PROTTOYON');
  assert.ok(!landscape(p.xml), 'prottoyon template forces portrait');
  const l = await siteDocx(T.enforce(PR_SCHOOL, 'cert-landscape').text);
  assert.ok(landscape(l.xml), 'certificate template → landscape');
  const s = T.enforce(CERT_STUB, 'cert-stub').text;
  assert.ok(landscape((await siteDocx(s)).xml));
  assert.equal(CT.parse(FM.split(s).body).variant, 'stub');
});

test('সতর্কবার্তা: ছাঁচের গঠন না মিললে, মিললে নয়', () => {
  assert.equal(T.enforce(PR_SCHOOL, 'prottoyon-school').warnings.length, 0);
  assert.equal(T.enforce(CERT_STUB, 'cert-stub').warnings.length, 0);
  assert.ok(T.enforce(PR_SCHOOL, 'cert-stub').warnings.some((w) => /মুড়ি|মুড়ি/.test(w)));
  assert.ok(T.enforce(MCQ, 'prottoyon-up').warnings.some((w) => /শিরোনাম/.test(w)));
  assert.equal(T.enforce(CQ, 'exam-cq').warnings.length, 0);
  assert.equal(T.enforce(MCQ, 'exam-mcq').warnings.length, 0);
  assert.ok(T.enforce(MCQ, 'exam-cq').warnings.some((w) => /সৃজনশীল/.test(w)));
  assert.ok(T.enforce(CQ, 'exam-mcq').warnings.some((w) => /বহুনির্বাচনি/.test(w)));
  assert.ok(T.enforce('', 'exam-cq').warnings.length === 1);
});

// ---------------------------------------------------------------- দল ৩: প্যাড ও আবেদন
const PAD_APP = fx('pad-school-app.input.md');
const PAD_NOTICE = fx('pad-notice.input.md');   // ফ্রন্টম্যাটার ছাড়া শ্রেণিকারী OFFICIAL_NOTICE বলে
const APP_JOB = fx('app-job.input.md');
const APP_HOLD = fx('app-holding.input.md');
// letter-layout মার্জিন বামে ০.৭৫" (১০৮০), application-layout ১.২৫" (১৮০০)
const leftMargin = (xml) => Number((xml.match(/<w:pgMar [^>]*w:left="(\d+)"/) || [])[1]);

test('প্যাড-দল: ৪টি ছাঁচ, আইকন; প্যাডে অফিস-নির্দেশ ("#"), আবেদনে "#" নিষেধ', () => {
  const pad = T.REGISTRY.filter((t) => t.group === 'pad');
  assert.deepEqual(pad.map((t) => t.id), ['pad-letter', 'pad-notice', 'app-general', 'app-job']);
  assert.ok(T.GROUPS.some((g) => g.id === 'pad'));
  for (const t of pad) {
    assert.ok(C.DOC_TYPES[t.doc_type], t.id);
    assert.match(T.icon(t.icon), /<svg[^>]*>.*<rect/);
    assert.match(T.promptHint(t), /never invent/);
  }
  assert.match(T.promptHint('pad-letter'), /"# <institution/);
  assert.match(T.promptHint('app-job'), /never write a "#" heading/);
  assert.ok(!/"# <institution/.test(T.promptHint('app-general')));
});

test('ক্লাসিফায়ার ও আসল .docx: নোটিশ-ছাঁচে প্যাড-লেআউট, আবেদন-ছাঁচে আবেদন-লেআউট', async () => {
  assert.equal(C.classify(FM.split(PAD_NOTICE).body).type, 'OFFICIAL_NOTICE');   // ছাঁচ ছাড়া শুধু লেখা ⇒ নোটিশ
  const n = await siteDocx(T.enforce(PAD_NOTICE, 'pad-notice').text);
  assert.equal(n.type, 'OFFICE_PAD');
  assert.equal(leftMargin(n.xml), 1080);
  const j = await siteDocx(T.enforce(APP_JOB, 'app-job').text);
  assert.equal(j.type, 'GOVT_APP');
  assert.equal(leftMargin(j.xml), 1800);
  assert.equal((await siteDocx(T.enforce(PAD_APP, 'pad-letter').text)).type, 'OFFICE_PAD');
});

test('বরাবর-ছাড়া নোটিশ: "বিজ্ঞপ্তি"/"অফিস আদেশ" শিরোনাম (মাঝে বোল্ড), প্যাড-মাথায় বা অনুচ্ছেদে মেশে না', () => {
  const LL = globalThis.FayzarLetterLayout;
  const kinds = (t) => LL.parse(t, 'pad').blocks.map((b) => b.kind + (b.kind === 'title' ? ':' + b.text : ''));
  const head = '# আদর্শ উচ্চ বিদ্যালয়\nফুলবাড়ী, দিনাজপুর\n';
  const body = 'এতদ্বারা সকল শিক্ষার্থীকে জানানো যাচ্ছে যে, আগামী ০৫/১০/২০২৬ তারিখে বিদ্যালয় বন্ধ থাকবে।\nপ্রধান শিক্ষক';
  assert.deepEqual(kinds(head + 'স্মারক নং- ১২ তারিখ: ০১/১০/২০২৬\nবিজ্ঞপ্তি\n' + body), ['letterhead', 'memoDate', 'title:বিজ্ঞপ্তি', 'para', 'signature']);
  assert.deepEqual(kinds(head + 'অফিস আদেশ\n' + body), ['letterhead', 'title:অফিস আদেশ', 'para', 'signature']);
});

test('সতর্কবার্তা (প্যাড-দল): প্যাড না থাকলে, বরাবর/বিষয় না থাকলে, আবেদনে প্যাড থাকলে', () => {
  assert.equal(T.enforce(PAD_APP, 'pad-letter').warnings.length, 0);
  assert.equal(T.enforce(PAD_NOTICE, 'pad-notice').warnings.length, 0);
  assert.equal(T.enforce(APP_JOB, 'app-job').warnings.length, 0);
  assert.equal(T.enforce(APP_HOLD, 'app-general').warnings.length, 0);
  assert.ok(T.enforce(APP_JOB, 'pad-letter').warnings.some((w) => /প্যাডের শিরোনাম/.test(w)));
  assert.ok(T.enforce(PR_SCHOOL, 'app-general').warnings.some((w) => /বরাবর/.test(w)));
  assert.ok(T.enforce(PAD_APP, 'app-general').warnings.some((w) => /অফিস প্যাড/.test(w)));
});

// ---------------------------------------------------------------- দল ৪: ক্যাশমেমো
const MEMO_BLANK = fx('cash-memo-blank.input.md');   // ফ্রন্টম্যাটারে copies: 2
const MEMO_ITEMS = fx('cash-memo-items.input.md');
const cols = (xml) => Number((xml.match(/<w:cols w:num="(\d+)"/) || [])[1]);

test('ক্যাশমেমো-দল: ৫টি ছাঁচ, আইকন, নির্দেশ (এক কপি, কিছু বানানো নয়); copies তালাবদ্ধ', () => {
  const memo = T.REGISTRY.filter((t) => t.group === 'memo');
  assert.deepEqual(memo.map((t) => t.id), ['memo-1up', 'memo-2up', 'memo-3up', 'receipt', 'voucher']);
  assert.ok(T.GROUPS.some((g) => g.id === 'memo'));
  for (const t of memo) {
    assert.match(T.icon(t.icon), /<svg[^>]*>.*<rect/);
    assert.match(T.promptHint(t), /ONE copy[\s\S]*(?:Never|never) invent/i);
    if (t.fmt === 'memo') assert.ok(!/"# <institution/.test(T.promptHint(t)));
  }
  const fm = T.enforce(MEMO_BLANK, 'memo-3up').text.match(/^---\n([\s\S]*?)\n---\n/)[1];
  assert.match(fm, /^copies: 3$/m);
  assert.ok(!/copies: 2/.test(fm), 'old copies dropped');
  assert.equal(C.classify(T.enforce(MEMO_BLANK, 'memo-3up').text).type, 'CASH_MEMO');
});

test('আসল .docx: ২-আপ ছাঁচে ২ কলাম, ৩-আপ ছাঁচে ৩ কলাম, দুটোই ল্যান্ডস্কেপ', async () => {
  const two = await siteDocx(T.enforce(MEMO_ITEMS, 'memo-2up').text);
  assert.equal(two.type, 'CASH_MEMO');
  assert.equal(cols(two.xml), 2);
  assert.ok(landscape(two.xml));
  const three = await siteDocx(T.enforce(MEMO_BLANK, 'memo-3up').text);
  assert.equal(cols(three.xml), 3);
  assert.ok(landscape(three.xml));
});

test('সতর্কবার্তা (মেমো): শিরোনাম/ছক না থাকলে', () => {
  assert.equal(T.enforce(MEMO_BLANK, 'memo-2up').warnings.length, 0);
  assert.equal(T.enforce(MEMO_ITEMS, 'memo-3up').warnings.length, 0);
  const w = T.enforce(PR_SCHOOL, 'memo-2up').warnings;
  assert.ok(w.some((x) => /ক্যাশ মেমো/.test(x)) && w.some((x) => /ছক/.test(x)));
});

// ---- ১-আপ, রসিদ, ভাউচার (মালিকের সিদ্ধান্ত ২০২৬-১০-১১: ১-আপ A5 লম্বালম্বি; রসিদ/ভাউচার নমুনা ছাড়া প্রচলিত নকশা)
const RECEIPT = fx('receipt.input.md');
const VOUCHER = fx('voucher.input.md');
const RL = globalThis.FayzarReceiptLayout;
const pgW = (xml) => Number((xml.match(/<w:pgSz w:w="(\d+)"/) || [])[1]);
async function siteRtf(text) {
  const type = C.classify(text).type;
  const sp = FM.split(text);
  const out = await E.generateWordDoc(sp.body.trim(), type, { format: 'doc', __frontmatter: sp.fields });
  return typeof out === 'string' ? out : await out.text();
}

test('১-আপ মেমো: A5 লম্বালম্বি, এক কলাম (.docx ও .doc); ছাঁচ ছাড়া মেমো আগের মতো ২-আপ', async () => {
  const one = await siteDocx(T.enforce(MEMO_ITEMS, 'memo-1up').text);
  assert.equal(pgW(one.xml), 8391);
  assert.ok(!landscape(one.xml));
  assert.equal(cols(one.xml), 1);
  const rtf = await siteRtf(T.enforce(MEMO_ITEMS, 'memo-1up').text);
  assert.match(rtf, /\\paperw8391\\paperh11906\\margl/);
  assert.match(rtf, /\\cols1\\/);
  assert.equal(cols((await siteDocx(MEMO_BLANK)).xml), 2, 'no template: unchanged');
});

test('রসিদ-পার্স: মাথা, শিরোনাম, ঘর, বাক্য, টাকার বাক্স, দুই স্বাক্ষর', () => {
  const m = RL.parse(RECEIPT, { memoKind: 'receipt' });
  assert.equal(m.variant, 'receipt');
  assert.deepEqual(m.header.map((h) => h.role), ['bis', 'shop', 'addr', 'contact']);
  assert.match(m.title, /প্রাপ্তির রসিদ/);
  assert.deepEqual(m.blocks.map((b) => b.kind), ['fields', 'para', 'amount', 'sign']);
  assert.deepEqual(m.blocks[0].segs.map((s) => s.label), ['রসিদ নং:', 'তারিখ:']);
  assert.equal(m.blocks[2].value, '৫০০/-');
  assert.equal(m.blocks[3].parts.length, 2);
});

test('ভাউচার-পার্স: ছক (মোট আলাদা), কথায়, তিন স্বাক্ষর; ছকে কমপক্ষে ৬ সারি', () => {
  const m = RL.parse(VOUCHER, { memoKind: 'voucher' });
  assert.equal(m.copies, 1);
  assert.deepEqual(m.blocks.map((b) => b.kind), ['fields', 'fields', 'table', 'fields', 'sign']);
  const t = m.blocks[2];
  assert.equal(t.items.length, 2);
  assert.equal(t.total.value, '১১৫০');
  assert.deepEqual(RL._fillers(t), ['৩', '৪', '৫', '৬']);
  assert.equal(m.blocks[4].parts.length, 3);
});

test('রাউটিং: memo_kind-তালা ছাড়া রসিদ-লেখাও ক্যাশমেমো-লেআউটে (আগের আচরণ)', () => {
  assert.equal(RL.wants(RECEIPT), false);
  assert.equal(RL.wants(T.enforce(RECEIPT, 'receipt').text), true);
  assert.equal(RL.wants(T.enforce(RECEIPT, 'memo-2up').text), false);
});

test('আসল .docx/.doc: রসিদ ল্যান্ডস্কেপ ২ কলামে টাকার বাক্স; ভাউচার A5 লম্বালম্বি, ৮ সারির ছক', async () => {
  const r = await siteDocx(T.enforce(RECEIPT, 'receipt').text);
  assert.equal(r.type, 'CASH_MEMO');
  assert.ok(landscape(r.xml));
  assert.equal(cols(r.xml), 2);
  assert.match(r.xml, /<w:pBdr>/);
  assert.equal((r.xml.match(/<w:br w:type="column"\/>/g) || []).length, 1);
  const v = await siteDocx(T.enforce(VOUCHER, 'voucher').text);
  assert.equal(pgW(v.xml), 8391);
  assert.ok(!landscape(v.xml));
  assert.equal((v.xml.match(/<w:tr>/g) || []).length, 8);   // হেডার + ২ পণ্য + ৪ ফাঁকা + মোট
  const rtf = await siteRtf(T.enforce(VOUCHER, 'voucher').text);
  assert.match(rtf, /\\paperw8391/);
  assert.equal((rtf.match(/\\row\}/g) || []).length, 8);
  const rr = await siteRtf(T.enforce(RECEIPT, 'receipt').text);
  assert.match(rr, /\\landscape/);
  assert.match(rr, /\\cols2\\/);
});

test('সতর্কবার্তা (রসিদ/ভাউচার): শিরোনাম না থাকলে; ভাউচারে ছক না থাকলে', () => {
  assert.equal(T.enforce(RECEIPT, 'receipt').warnings.length, 0);
  assert.equal(T.enforce(VOUCHER, 'voucher').warnings.length, 0);
  assert.ok(T.enforce(MEMO_BLANK, 'receipt').warnings.some((w) => /শিরোনাম/.test(w)));
  assert.ok(T.enforce(RECEIPT, 'voucher').warnings.some((w) => /ছক/.test(w)));
});

// ---------------------------------------------------------------- T2 গ্রহণযোগ্যতা: প্রতিটি ছাঁচের সোনালি খসড়া → .docx-সারাংশের স্ন্যাপশট
// (run-regression-এর নিয়মে: না থাকলে বা UPDATE=1 হলে লেখে; নইলে মেলায়)
const GOLDEN = {
  'exam-cq': 'real-ocr/hmathcq.md', 'exam-math': 'real-ocr/hmathcq.md', 'exam-mcq': 'mcq-pure-28.input.md', 'exam-combined': 'real-ocr/hmathcq.md',
  'exam-general': 'primary-class4-bangla.input.md', 'exam-primary': 'primary-class4-bangla.input.md',
  'prottoyon-school': 'prottoyon-school.input.md', 'prottoyon-up': 'prottoyon-up.input.md', 'cert-landscape': 'cert-landscape.input.md', 'cert-stub': 'cert-stub.input.md',
  'pad-letter': 'pad-school-app.input.md', 'pad-notice': 'pad-notice.input.md', 'app-general': 'app-holding.input.md', 'app-job': 'app-job.input.md',
  'memo-1up': 'cash-memo-items.input.md', 'memo-2up': 'cash-memo-items.input.md', 'memo-3up': 'cash-memo-blank.input.md', receipt: 'receipt.input.md', voucher: 'voucher.input.md',
  'cv-bangla': 'cv-basic.input.md', 'cv-biodata': 'cv-biodata.input.md', 'cv-english': 'cv-english-shop.md'
};

test('সোনালি স্ন্যাপশট: প্রতিটি ছাঁচ → ধরন, পাতা, কলাম, টেবিল/সারি/অনুচ্ছেদ-সংখ্যা অপরিবর্তিত', async () => {
  assert.deepEqual(Object.keys(GOLDEN).sort(), T.REGISTRY.map((t) => t.id).sort(), 'every template has a golden draft');
  const snap = {};
  for (const t of T.REGISTRY) {
    const d = await siteDocx(T.enforce(fx(GOLDEN[t.id]), t.id).text);
    const n = (re) => (d.xml.match(re) || []).length;
    snap[t.id] = [d.type, landscape(d.xml) ? 'L' : 'P', 'w' + pgW(d.xml), 'cols' + (cols(d.xml) || 1), 'tbl' + n(/<w:tbl>/g), 'tr' + n(/<w:tr[ >]/g), 'p' + n(/<w:p[ >]/g)].join(' ');
  }
  const file = path.join(ROOT, 'tests/baseline/t2-templates.snap.json');
  if (process.env.UPDATE || !fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(snap, null, 2) + '\n', 'utf8');
  assert.deepEqual(snap, JSON.parse(fs.readFileSync(file, 'utf8')));
});

// ---------------------------------------------------------------- দল ৫: জীবনবৃত্তান্ত
const CV_BASIC = fx('cv-basic.input.md');
const CV_BIO = fx('cv-biodata.input.md');
const CV_EN = fx('cv-english.input.md');

test('সিভি-দল: ৩টি ছাঁচ, আইকন, সিভি-নির্দেশ (বাংলায় সারি, ছক, তারিখ/স্বাক্ষর; কিছু বানানো নয়)', () => {
  const cv = T.REGISTRY.filter((t) => t.group === 'cv');
  assert.deepEqual(cv.map((t) => t.id), ['cv-bangla', 'cv-biodata', 'cv-english']);
  assert.ok(T.GROUPS.some((g) => g.id === 'cv'));
  for (const t of cv) {
    assert.match(T.icon(t.icon), /<svg[^>]*>.*<rect/);
    assert.match(T.promptHint(t), t.fmt === 'cven' ? /doc_type: CV_RESUME[\s\S]*CURRICULUM VITAE[\s\S]*"## [\s\S]*never invent/
      : /doc_type: CV_RESUME[\s\S]*label ঃ value[\s\S]*never invent/);
  }
  assert.equal(C.classify(T.enforce(CV_BIO, 'cv-bangla').text).type, 'CV_RESUME');
});

test('আসল .docx: সিভি-ছাঁচে বাংলা সিভি-লেআউট (৩২pt শিরোনাম, A4 লম্বালম্বি)', async () => {
  for (const [src, id] of [[CV_BASIC, 'cv-bangla'], [CV_BIO, 'cv-biodata']]) {
    const d = await siteDocx(T.enforce(src, id).text);
    assert.equal(d.type, 'CV_RESUME', id);
    assert.ok(!landscape(d.xml), id);
    assert.match(d.xml, /<w:sz w:val="64"\/>/, id + ': cv-layout title');
  }
});

test('সতর্কবার্তা (সিভি): ইংরেজি লেখা, শিরোনাম বা তথ্য-সারি না থাকলে', () => {
  assert.equal(T.enforce(CV_BASIC, 'cv-bangla').warnings.length, 0);
  assert.equal(T.enforce(CV_BIO, 'cv-biodata').warnings.length, 0);
  assert.ok(T.enforce(CV_EN, 'cv-bangla').warnings.some((w) => /ইংরেজি/.test(w)));
  assert.ok(T.enforce(PR_SCHOOL, 'cv-bangla').warnings.some((x) => /শিরোনাম/.test(x)));
  const w = T.enforce('# জীবন বৃত্তান্ত\nআমি একজন পরিশ্রমী ও সৎ মানুষ।', 'cv-bangla').warnings;
  assert.ok(!w.some((x) => /শিরোনাম/.test(x)) && w.some((x) => /তথ্য-সারি/.test(x)));
});

// ---- ইংরেজি সিভি (দোকানের ৩টি নমুনা Taher Khan / Najmul / Anu mama — একই ছাঁচ)
// .input.md নয়: সাধারণ রিগ্রেশন/হুবহু-হার্নেস তালা ছাড়াই চালায় (তখন পুরোনো ইঞ্জিন) — এ ফিক্সচার শুধু ছাঁচের জন্য
const CV_EN_SHOP = fx('cv-english-shop.md');
const EN = globalThis.FayzarEnCvLayout;

test('ইংরেজি সিভি-পার্স: মাথা (শিরোনাম/OF/নাম/যোগাযোগ), অংশ, পরীক্ষা, সারি, বুলেট, ছক, শেষে দাগ/নাম/তারিখ', () => {
  const m = EN.parse(CV_EN_SHOP);
  const h = m.blocks[0];
  assert.equal(h.kind, 'head');
  assert.deepEqual([h.title, h.of, h.name], ['CURRICULUM VITAE', 'OF', 'MD. EXAMPLE RAHMAN']);
  assert.equal(h.lines.length, 4);
  assert.ok(h.lines[3].b && !h.lines[0].b, 'cell phone bold');
  assert.deepEqual(m.blocks.filter((b) => b.kind === 'heading').map((b) => b.text),
    ['Career Objective', 'Educational Qualification:', 'Experience', 'Competitive Strength', 'Language Skill', 'Personal Information', 'Declaration']);
  assert.deepEqual(m.blocks.filter((b) => b.kind === 'sub').map((b) => b.text.slice(-5)), ['(HSC)', '(SSC)']);
  const pi = m.blocks.filter((b) => b.kind === 'kv').pop();
  assert.equal(pi.rows.length, 11);
  assert.deepEqual(pi.rows[3].more, ['P.S: Fulbari, District: Dinajpur'], 'address continuation under the value');
  assert.equal(m.blocks.find((b) => b.kind === 'bullets').items.length, 3);
  assert.equal(m.blocks.find((b) => b.kind === 'table').rows.length, 3);
  assert.equal(m.blocks.filter((b) => b.kind === 'para').length, 6, 'objective + 4 experience lines + declaration');
  assert.deepEqual(m.blocks.pop(), { kind: 'footer', sign: ['(Md. Example Rahman)'], date: 'Date: ........' });
});

test('রাউটিং: তালা cv-english বা তালা ছাড়া ইংরেজি সিভি ⇒ ইংরেজি-লেআউট; বাংলা সিভি বা অন্য সিভি-তালা ⇒ না', async () => {
  assert.equal(EN.wants(CV_EN_SHOP), true, 'auto: English CV → new layout');
  assert.equal(EN.wants(CV_EN), true);
  assert.equal(EN.wants(T.enforce(CV_EN_SHOP, 'cv-english').text), true);
  assert.equal(EN.wants('x', { __frontmatter: { template: 'cv-english' } }), true);
  assert.equal(EN.wants(T.enforce(CV_EN_SHOP, 'cv-bangla').text), false);
  assert.equal(EN.wants(CV_BASIC), false, 'Bangla CV stays on cv-layout');
  const auto = await siteDocx(CV_EN_SHOP);
  assert.equal((auto.xml.match(/w:fill="737373"/g) || []).length, 7, 'no lock: new layout too');
});

test('আসল .docx/.doc: A4 লম্বালম্বি, ধূসর অংশ-পটি সাদা লেখায়, ছবির বাক্স, Arial Black শিরোনাম, ভাষার ছক', async () => {
  const d = await siteDocx(T.enforce(CV_EN_SHOP, 'cv-english').text);
  assert.equal(d.type, 'CV_RESUME');
  assert.ok(!landscape(d.xml));
  assert.equal(pgW(d.xml), 11906);
  assert.equal((d.xml.match(/w:fill="737373"/g) || []).length, 7);
  assert.equal((d.xml.match(/<w:color w:val="FFFFFF"\/>/g) || []).length, 7);
  assert.match(d.xml, /w:ascii="Arial Black"[^]*?CURRICULUM VITAE/);
  assert.match(d.xml, /<w:tcBorders>(?:<w:(?:top|left|bottom|right) w:val="single"[^>]*\/>){4}<\/w:tcBorders>/, 'photo box');
  assert.match(d.xml, /<w:tab w:val="left" w:pos="3510"\/><w:tab w:val="left" w:pos="3880"\/>/);
  assert.ok(!/<\/w:tbl><w:tbl>/.test(d.xml), 'tables never touch (Word would merge them)');
  const rtf = await siteRtf(T.enforce(CV_EN_SHOP, 'cv-english').text);
  assert.match(rtf, /\\paperw11906\\paperh16838\\margl1440\\margr720\\margt720\\margb720/);
  assert.equal((rtf.match(/\\clcbpat3/g) || []).length, 7);
  assert.match(rtf, /\{\\f2 CURRICULUM VITAE\}/);
  assert.equal((rtf.match(/\{\\trowd/g) || []).length, 1 + 7 + 3, 'head + 7 bars + 3 table rows');
  assert.equal((rtf.match(/\{/g) || []).length, (rtf.match(/\}/g) || []).length, 'balanced RTF groups');
});

test('ইংরেজি সিভি HTML-প্রিভিউ: মাথা, ছবির বাক্স, ধূসর পটি', () => {
  const html = EN.renderHtml(EN.parse(CV_EN_SHOP), {});
  assert.match(html, /CURRICULUM VITAE/);
  assert.equal((html.match(/background: #737373/g) || []).length, 7);
  assert.match(html, /border: 1px solid #000; box-sizing: border-box; flex: none;/);
});

test('সতর্কবার্তা (ইংরেজি সিভি): বাংলা লেখা, নাম বা তথ্য-সারি না থাকলে', () => {
  assert.equal(T.enforce(CV_EN_SHOP, 'cv-english').warnings.length, 0);
  assert.equal(T.enforce(CV_EN, 'cv-english').warnings.length, 0);
  assert.ok(T.enforce(CV_BASIC, 'cv-english').warnings.some((w) => /বাংলা/.test(w)));
  const w = T.enforce('## Career Objective\nTo build a career.', 'cv-english').warnings;
  assert.ok(w.some((x) => /নাম/.test(x)) && w.some((x) => /তথ্য-সারি/.test(x)));
});
