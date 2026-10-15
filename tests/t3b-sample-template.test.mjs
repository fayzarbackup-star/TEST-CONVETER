/**
 * T3b (docs/T3_PLAN.md §৪) — নমুনার নকশা ⇒ স্লট ⇒ খসড়া বসানো (FayzarSampleTemplate)।
 * ফিক্সচার: হাতে বানানো নকশা (g24-প্রত্যয়ন ও g01-২-আপ-মেমোর গঠন, কাল্পনিক নাম) — ব্যক্তিগত তথ্য নয়।
 * আসল সোনালি নকশা (`qa/golden-data`, ব্যক্তিগত) থাকলে বাড়তি পরীক্ষা, না থাকলে স্কিপ।
 * মালিকের নিয়ম: না-মেলা var স্লট খালি/"......" — নমুনার আগের তথ্য কখনো নয়; খসড়ার লেখা কখনো হারায় না।
 *   node --test tests/t3b-sample-template.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ST = require(path.join(ROOT, 'js/layout-engine/sample-template.js'));
const D = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));

const P = (type, lines, extra = {}) => Object.assign({ kind: 'para', type, lines, text: lines.join('\n'), fontPt: 13, align: 'l', keepLines: lines.length > 1, rect: null }, extra);
const page = (bands) => ({ page: 1, widthPt: 595.3, heightPt: 841.9, margins: { top: 40, right: 40, bottom: 40, left: 50 }, bands });
const flow = (items) => ({ kind: 'flow', cells: [{ x0: 50, x1: 555, items }] });
const grid = (a, b) => ({ kind: 'grid', y0: 0, y1: 0, cells: [{ x0: 50, x1: 300, items: a }, { x0: 305, x1: 555, items: b }] });

// প্রত্যয়ন (g24-এর গঠন)
const PROTTOYON = { pages: [page([flow([
  P('heading', ['গণপ্রজাতন্ত্রী বাংলাদেশ সরকার'], { align: 'c' }),
  P('title', ['নমুনাপুর সরকারি প্রাথমিক বিদ্যালয়'], { align: 'c', bold: true }),
  P('heading', ['ডাকঘরঃ নমুনাহাট, উপজেলাঃ ফুলবাড়ী'], { align: 'c' }),
  P('other', ['────────────────────────────']),
  P('label_value', ['তারিখঃ .........................\tখ্রি.'], { tabLines: ['তারিখঃ .........................\tখ্রি.'], tabStops: [300], fontPt: 12, fit: { fontFrom: 13 } }),
  P('heading', ['প্রত্যয়ন পত্র'], { align: 'c', bold: true }),
  P('paragraph', ['এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, আগের ছাত্র কাল্পনিক, পিতা: আগের পিতা, অত্র বিদ্যালয়ের ছাত্র।'], { align: 'j' }),
  P('paragraph', ['আমি তার জীবনের সর্বাঙ্গীন মঙ্গল কামনা করছি।']),
  P('signature', ['(প্রধান শিক্ষক নমুনা)', 'প্রধান শিক্ষক'], { align: 'c' })
])])], warnings: [] };

const DRAFT_P = `---
doc_type: PROTTOYON
---
তারিখঃ ১১/১০/২০২৬

# প্রত্যয়ন পত্র

এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, রাকিব হাসান, পিতা: আব্দুল কাদের, অত্র বিদ্যালয়ের ৫ম শ্রেণির নিয়মিত ছাত্র।

আমি তার জীবনের সর্বাঙ্গীন মঙ্গল কামনা করছি।
`;

// ২-আপ ক্যাশমেমো (g01-এর গঠন)
const twin = (mk) => grid([mk()], [mk()]);
const MEMO_TABLE = () => ({ kind: 'table', type: 'table', rows: [['ক্রমিক', 'বিবরণ', 'পরিমাণ', 'দর', 'টাকা'], ['', '', '', '', ''], ['', '', '', 'সর্বমোট:', '']], fontPt: 12, widthPt: 240, heightPt: 320,
  cellAligns: [['c', 'c', 'c', 'c', 'c'], [null, null, null, null, null], [null, null, null, 'r', null]], cellFigures: [{ cell: [1, 1], widthPt: 20, heightPt: 20, image: { dataUrl: 'data:image/png;base64,AAAA' } }] });
const MEMO = { pages: [page([
  twin(() => P('title', ['নমুনা কম্পিউটার'], { align: 'c' })),
  twin(() => P('paragraph', ['এখানে কম্পোজ ও ফটোকপি করা হয়।'], { align: 'c' })),
  twin(() => P('paragraph', ['মোবাইল: ০১৭০০-০০০০০০'], { align: 'c' })),
  twin(() => P('heading', ['ক্যাশ মেমো'], { align: 'c', bold: true })),
  twin(() => P('paragraph', ['নাম:.................................   তারিখ: ..............'])),
  twin(() => P('paragraph', ['ঠিকানা: আগের ক্রেতার গ্রাম'])),
  twin(MEMO_TABLE),
  twin(() => P('paragraph', ['কথায়: ..............................'])),
  twin(() => P('signature', ['ক্রেতার স্বাক্ষর']))
])], warnings: [] };

const DRAFT_M = `# ক্যাশ মেমো

নাম: করিম উদ্দিন
তারিখ: ১০/১০/২০২৬

| বিবরণ | পরিমাণ | দর | টাকা |
|---|---|---|---|
| কম্পোজ | ১০ পাতা | ১৫ | ১৫০ |
| ফটোকপি | ২০ কপি | ২ | ৪০ |
| সর্বমোট | | | ১৯০ |
`;

const items = (ir) => { const out = []; ir.pages.forEach((p) => p.bands.forEach((b) => b.cells.forEach((c, ci) => c.items.forEach((it) => out.push(Object.assign({ ci }, it)))))); return out; };
const txt = (it) => (it.kind === 'table' ? it.rows.map((r) => r.join(' | ')).join('\n') : (it.tabLines || it.lines || [it.text]).join('\n'));
const allText = (ir) => items(ir).map(txt).join('\n');

// ------------------------------------------------------------------ লেবেল-মান চেনা
test('parseKv: "লেবেল: মান" / "**মাধ্যমঃ-** …" / বিসর্গ-শব্দ ও সংক্ষেপ নয়', () => {
  assert.deepEqual(ST.parseKv('নাম: করিম'), { pre: '', label: 'নাম', colon: ': ', value: 'করিম' });
  assert.equal(ST.parseKv('**মাধ্যমঃ-** যথাযথ কর্তৃপক্ষ').label, 'মাধ্যম');
  assert.equal(ST.parseKv('**মাধ্যমঃ-** যথাযথ কর্তৃপক্ষ').value, 'যথাযথ কর্তৃপক্ষ');
  assert.equal(ST.parseKv('তারিখঃ.........').value, '.........');
  assert.equal(ST.parseKv('দুঃখজনক ঘটনা'), null, 'বিসর্গ শব্দের ভেতরে');
  assert.equal(ST.parseKv('প্রোঃ মোঃ নমুনা আলী'), null, 'সংক্ষেপ');
  assert.equal(ST.parseKv('এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, মোঃ কাল্পনিক, পিতা: কেউ'), null, 'লম্বা বাক্য');
  assert.equal(ST.parseKv('১০:৩০'), null);
  assert.equal(ST.labelKey("Father's Name"), ST.labelKey('পিতার নাম'));
  assert.equal(ST.labelKey('Mobile'), ST.labelKey('মোবাইল নং'));
});

test('kvSegs: ট্যাব সবসময় ভাগ, ৩+ ফাঁক শুধু ২+ লেবেল-মানে', () => {
  assert.deepEqual(ST.kvSegs('তারিখঃ .....\tখ্রি.').map((x) => x.k), [0]);
  assert.deepEqual(ST.kvSegs('নাম: ......   তারিখ: ......').map((x) => x.kv.label), ['নাম', 'তারিখ']);
  assert.deepEqual(ST.kvSegs('ঠিকানা: গ্রাম   পোস্ট অফিস').map((x) => x.kv.value), ['গ্রাম   পোস্ট অফিস']);
});

// ------------------------------------------------------------------ স্লট
test('fromIR (প্রত্যয়ন): মাথা/শিরোনাম/স্বাক্ষর স্থির; তারিখ লেবেল-মান; অনুচ্ছেদ পরিবর্তনশীল; রেখা-লাইন স্লট নয়', () => {
  const s = ST.fromIR(PROTTOYON);
  assert.deepEqual(s.map((x) => x.kind + ':' + x.role), ['heading:fixed', 'heading:fixed', 'heading:fixed', 'kv:var', 'heading:fixed', 'para:var', 'para:var', 'sign:fixed']);
  assert.equal(s[3].label, 'তারিখ');
  assert.deepEqual(s[3].path, { l: 0, s: 0, p: 0, b: 0, c: 0, i: 4 });
});

test('fromIR (২-আপ মেমো): যমজ দল; প্যাড-মাথার মাঝে-বসানো অনুচ্ছেদ/মোবাইল স্থির (auto letterhead); এক লাইনে দুই লেবেল-মান', () => {
  const s = ST.fromIR(MEMO);
  const lead = s.filter((x) => !x.twinOf);
  assert.equal(s.filter((x) => x.twinOf).length, lead.length, 'প্রতিটির একটি যমজ');
  assert.deepEqual(lead.filter((x) => x.auto === 'letterhead').map((x) => ST._cmp(x.sampleText)), ['এখানে কম্পোজ ও ফটোকপি করা হয়।', '০১৭০০-০০০০০০'].map(ST._cmp));
  assert.ok(s.filter((x) => x.twinOf && x.auto === 'letterhead').length === 2, 'যমজও স্থির');
  assert.deepEqual(lead.filter((x) => x.kind === 'kv' && x.role === 'var').map((x) => ST._cmp(x.label)), ['নাম', 'তারিখ', 'ঠিকানা', 'কথায়'].map(ST._cmp));
  assert.equal(lead.find((x) => x.kind === 'table').cols, 5);
});

test('সিভি-মাথা (নিচে স্থির শিরোনাম নেই): মাঝে-বসানো নাম পরিবর্তনশীলই থাকে (আগের নাম ফাঁস নয়)', () => {
  const cv = { pages: [page([flow([P('title', ['CURRICULUM VITAE'], { align: 'c' }), P('paragraph', ['MD. OLD PERSON'], { align: 'c' }), P('paragraph', ['Cell: 01700000000'], { align: 'c' }), P('heading', ['Career Objective'])])])] };
  const s = ST.fromIR(cv);
  assert.equal(s[1].role, 'var');
  assert.equal(s[2].role, 'var');
});

// ------------------------------------------------------------------ খসড়া-অংশ
test('splitContent: ফ্রন্টম্যাটার বাদ; শিরোনাম, লেবেল-মান, অনুচ্ছেদ (একাধিক লাইন), তালিকা, টেবিল', () => {
  const parts = ST.splitContent('---\ndoc_type: X\n---\n# শিরোনাম\n\nনাম: করিম   তারিখ: ১০/১০\nবরাবর,\nপ্রধান শিক্ষক\n\n- এক\n- দুই\n\n| ক | খ |\n|---|---|\n| ১ | ২ |\n');
  assert.deepEqual(parts.map((p) => p.kind), ['heading', 'kv', 'kv', 'para', 'list', 'list', 'table']);
  assert.deepEqual(parts[3].lines, ['বরাবর,', 'প্রধান শিক্ষক']);
  assert.deepEqual(parts[6].rows, [['ক', 'খ'], ['১', '২']]);
  assert.equal(parts[6].header, true);
});

// ------------------------------------------------------------------ মিলানো + পূরণ
test('প্রত্যয়ন: তারিখ বসে (ট্যাবের লেজ "খ্রি." অক্ষত, ফন্ট আগের মাপে), মূল অনুচ্ছেদ ক্রম-মিলে, শিরোনাম আবার বসে না', () => {
  const tpl = ST.toTemplate(PROTTOYON, { name: 'প্রত্যয়ন' });
  const r = ST.compose(tpl, DRAFT_P);
  assert.deepEqual(r.local.unusedParts, []);
  assert.deepEqual(r.report.extras, []);
  assert.deepEqual(r.report.blank, []);
  const it = items(r.ir);
  assert.deepEqual(it[4].tabLines, ['তারিখঃ ১১/১০/২০২৬\tখ্রি.']);
  assert.equal(it[4].fontPt, 13, 'আগের line-fit-এর ছোট ফন্ট ফেরত');
  assert.match(txt(it[6]), /রাকিব হাসান/);
  assert.doesNotMatch(allText(r.ir), /আগের ছাত্র|আগের পিতা/, 'আগের তথ্য ফাঁস নয়');
  assert.equal((allText(r.ir).match(/প্রত্যয়ন পত্র/g) || []).length, 1);
  assert.match(txt(it[0]), /গণপ্রজাতন্ত্রী/);
});

test('ক্যাশমেমো: দুই কপিতে একই পূরণ; টেবিল-শিরোনাম রেখে সারি, ক্রমিক নিজে, মোট "সর্বমোট"-এ, ফর্ম-উচ্চতা অক্ষত, নমুনার চিত্র বাদ', () => {
  const tpl = ST.toTemplate(MEMO);
  const r = ST.compose(tpl, DRAFT_M);
  const it = items(r.ir);
  const left = it.filter((x) => x.ci === 0), right = it.filter((x) => x.ci === 1);
  assert.deepEqual(left.map(txt), right.map(txt), 'যমজ কপি হুবহু');
  assert.equal(txt(left[4]), 'নাম: করিম উদ্দিন   তারিখ: ১০/১০/২০২৬');
  assert.match(txt(left[5]), /^ঠিকানা: \.{12,}$/, 'না-মেলা মান ⇒ বিন্দু');
  const t = left.find((x) => x.kind === 'table');
  assert.deepEqual(t.rows, [['ক্রমিক', 'বিবরণ', 'পরিমাণ', 'দর', 'টাকা'], ['১', 'কম্পোজ', '১০ পাতা', '১৫', '১৫০'], ['২', 'ফটোকপি', '২০ কপি', '২', '৪০'], ['', '', '', '', ''], ['', '', '', 'সর্বমোট:', '১৯০']]);
  assert.equal(t.heightPt, 320);
  assert.equal(t.cellAligns, null);
  assert.deepEqual(t.cellFigures, []);
  assert.match(txt(left[1]), /কম্পোজ ও ফটোকপি/, 'প্যাড-মাথা অক্ষত');
  assert.match(txt(left[2]), /০১৭০০-০০০০০০/);
  assert.match(txt(left[7]), /^কথায়: \.+$/);
  assert.doesNotMatch(allText(r.ir), /আগের ক্রেতা/);
});

test('অতিরিক্ত: কোথাও না বসা অংশ খসড়ায় তার আগের বসানো অংশের (টেবিল) ঠিক পরে — ক্রম অক্ষত, লেখা হারায় না, যমজেও', () => {
  const tpl = ST.toTemplate(MEMO);
  const r = ST.compose(tpl, DRAFT_M + '\nবিশেষ দ্রষ্টব্য: বাকি ৫০ টাকা পরে দেবে\n\nধন্যবাদান্তে আবার আসবেন\n');
  assert.equal(r.report.extras.length, 2);
  const text = allText(r.ir);
  assert.equal((text.match(/বাকি ৫০ টাকা পরে দেবে/g) || []).length, 2, 'দুই কপিতেই');
  assert.match(text, /ধন্যবাদান্তে আবার আসবেন/);
  const it = items(r.ir).filter((x) => x.ci === 0);
  const k = it.findIndex((x) => x.extra);
  assert.equal(it[k - 1].kind, 'table', 'খসড়ায় আগের অংশ (টেবিল)-এর ঠিক পরে');
  assert.match(txt(it[k]), /বাকি ৫০ টাকা/);
  assert.match(txt(it[k + 1]), /ধন্যবাদান্তে/, 'অতিরিক্তের নিজেদের ক্রমও অক্ষত');
  assert.match(txt(it[k + 2]), /^কথায়/);
});

test('লেবেল-শুরু লম্বা অনুচ্ছেদ ("**বিষয়ঃ** …" কয়েক লাইন): খসড়ার "বিষয়: …" সেখানে, নমুনার লেবেল-রূপে', () => {
  const ir = { pages: [page([flow([P('paragraph', ['**বিষয়ঃ** আগের বিষয়ের লম্বা লেখা যা', 'দ্বিতীয় লাইনে গেছে।'], { keepLines: false }), P('paragraph', ['জনাব,'])])])] };
  const tpl = ST.toTemplate(ir);
  assert.equal(tpl.slots[0].kind, 'para');
  assert.equal(ST._cmp(tpl.slots[0].label), ST._cmp('বিষয়'));
  const r = ST.compose(tpl, 'বিষয়: নতুন ছুটির আবেদন\n\nজনাব,');
  const it = items(r.ir);
  assert.deepEqual(it[0].lines, ['**বিষয়ঃ** নতুন ছুটির আবেদন']);
  assert.deepEqual(r.report.extras, []);
  assert.doesNotMatch(allText(r.ir), /আগের বিষয়/);
});

test('বাইরের (Gemini) ম্যাপ স্থানীয় ম্যাপের ওপরে; টেবিল-স্লটে লেখা দিলে টেবিল খালি আর লেখা অতিরিক্তে', () => {
  const tpl = ST.toTemplate(PROTTOYON);
  const parts = ST.splitContent('নতুন অনুচ্ছেদ এক\n\nনতুন অনুচ্ছেদ দুই');
  const out = ST.fill(tpl, parts, { s6: 'p2', s7: 'p1' });
  const it = items(out.ir);
  assert.equal(txt(it[6]), 'নতুন অনুচ্ছেদ দুই');
  assert.equal(txt(it[7]), 'নতুন অনুচ্ছেদ এক');
  const memo = ST.toTemplate(MEMO);
  const tId = memo.slots.find((s) => s.kind === 'table' && !s.twinOf).id;
  const o2 = ST.fill(memo, ST.splitContent('শুধু লেখা'), { [tId]: 'p1' });
  assert.match(allText(o2.ir), /শুধু লেখা/);
  assert.equal(o2.report.extras.length, 1);
});

test('কিছুই না মিললে: সব var খালি/বিন্দু, স্থির অক্ষত — নমুনার কোনো var-লেখা থাকে না', () => {
  const tpl = ST.toTemplate(PROTTOYON);
  const out = ST.fill(tpl, [], {});
  const text = allText(out.ir);
  assert.doesNotMatch(text, /আগের ছাত্র|মঙ্গল কামনা/);
  assert.match(text, /নমুনাপুর সরকারি প্রাথমিক বিদ্যালয়/);
  assert.match(text, /তারিখঃ \.{20,}\tখ্রি\./, 'বিন্দু-সারি আগের মতোই');
});

test('slimIR: মাপ/বক্স বাদ, চিত্র থাকে; মূল নকশা অপরিবর্তিত', () => {
  const ir = { pages: [page([flow([Object.assign(P('paragraph', ['ক']), { m: { big: [1, 2, 3] }, diag: {}, box: [0, 0, 1, 1] }), { kind: 'figure', box: [1, 1, 2, 2], image: { dataUrl: 'data:image/png;base64,AA' }, widthPt: 10 }])])] };
  const s = ST.slimIR(ir);
  const [a, f] = s.pages[0].bands[0].cells[0].items;
  assert.equal(a.m, undefined); assert.equal(a.box, undefined); assert.equal(f.box, undefined);
  assert.equal(f.image.dataUrl, 'data:image/png;base64,AA');
  assert.ok(ir.pages[0].bands[0].cells[0].items[0].m, 'মূল অক্ষত');
});

test('পূরণ-করা নকশা চালু builder-এ .docx হয় (faithful-docx-builder অপরিবর্তিত)', async () => {
  for (const [ir, md] of [[PROTTOYON, DRAFT_P], [MEMO, DRAFT_M]]) {
    const r = ST.compose(ST.toTemplate(ir), md);
    const bin = await D.build(r.ir, { JSZip, type: 'uint8array' });
    const xml = await (await JSZip.loadAsync(bin)).file('word/document.xml').async('string');
    assert.ok(/<w:body>/.test(xml));
    assert.ok(xml.includes(md === DRAFT_P ? 'রাকিব হাসান' : 'করিম উদ্দিন'));
  }
});

// ------------------------------------------------------------------ T3e-তে শেখা নিয়ম
test('T3e ব্যক্তিগত তথ্য: সিভি-মাথার নাম/স্বাক্ষরের নাম নমুনার "Full Name"-এর মানে থাকলে স্থির নয় (auto personal)', () => {
  const cv = { pages: [page([flow([
    P('title', ['CURRICULUM VITAE'], { align: 'c' }), P('heading', ['OLD PERSON KHAN'], { align: 'c' }),
    P('paragraph', ['Full Name : Md. Old Person Khan']), P('signature', ['__________', '(Md. Old Person Khan)'])
  ])])] };
  const s = ST.fromIR(cv);
  assert.deepEqual(s.map((x) => x.role + (x.auto ? ':' + x.auto : '')), ['fixed', 'var:personal', 'var', 'var:personal']);
  const r = ST.compose(ST.toTemplate(cv), '# CURRICULUM VITAE\n\n# NEW PERSON ALI\n\nFull Name: Md. New Person Ali\n\n__________\n(Md. New Person Ali)');
  assert.doesNotMatch(allText(r.ir), /Old Person/i, 'আগের নাম কোথাও নেই');
  assert.match(allText(r.ir), /NEW PERSON ALI/);
});

test('T3e লেবেল-মান: ক্রমিকসহ ("০১। নাম ঃ"), ট্যাবে সাজানো, খালি-মানের পরের ট্যাবে মান — সব চেনা; ক্রমিকসহ খসড়া-লাইন তালিকা নয়', () => {
  assert.equal(ST.parseKv('০১। নাম : করিম').label, 'নাম');
  assert.equal(ST.parseKv('০১। নাম : করিম').pre, '০১। ');
  assert.deepEqual(ST.kvSegs('০২।\tপিতার নাম\t:\tমোঃ রহিম').map((x) => x.kv.value), ['মোঃ রহিম']);
  assert.deepEqual(ST.kvSegs('জন্ম তারিখ :\t০৬/০৭/২০০৩').map((x) => ST._cmp(x.kv.value)), [ST._cmp('০৬/০৭/২০০৩')], 'খালি-মানের পরের ট্যাবই মান (নইলে আগের তারিখ থেকে যেত)');
  const parts = ST.splitContent('০১। নাম ঃ মোঃ রফিক\n০২। পিতার নাম ঃ মোঃ করিম\n\n১। শাপলা\n২। গোলাপ');
  assert.deepEqual(parts.map((p) => p.kind), ['kv', 'kv', 'list', 'list']);
  const ir = { pages: [page([flow([P('paragraph', ['জন্ম তারিখ :\t০৬/০৭/২০০৩'], { tabLines: ['জন্ম তারিখ :\t০৬/০৭/২০০৩'], tabStops: [100] })])])] };
  const out = ST.compose(ST.toTemplate(ir), 'জন্ম তারিখ: ১২/০৩/২০০০');
  assert.doesNotMatch(allText(out.ir), /০৬\/০৭\/২০০৩/);
  const blank = ST.fill(ST.toTemplate(ir), [], {});
  assert.doesNotMatch(allText(blank.ir), /০৬\/০৭\/২০০৩/, 'না মিললেও আগের তারিখ নয়');
});

test('T3e খসড়া-ভাগ: সম্বোধন ("জনাব,") আলাদা অংশ; মানের ভেতরের চেনা লেবেল ("… তারিখ: …") আলাদা, কিন্তু ঠিকানার অংশ ("P.O:") একসাথে; বন্ধনীর কোলন লেবেল নয়', () => {
  const p = ST.splitContent('জনাব,\nউপযুক্ত বিষয়ের আলোকে জানানো যাচ্ছে।\n\nসূত্র: ৩৮.০০.১২ তারিখ: ১৬ মার্চ ২০২৬\n\nVill: West Para, P.O: Melabari (5260)\n\n(নমুনা নাম)\nপ্রধান শিক্ষক (চ: দা:)');
  assert.deepEqual(p.map((x) => x.kind + (x.label ? ':' + x.label : '')), ['para', 'para', 'kv:সূত্র', 'kv:তারিখ', 'kv:Vill', 'para']);
  assert.equal(p[4].value, 'West Para, P.O: Melabari (5260)');
  assert.deepEqual(p[5].lines, ['(নমুনা নাম)', 'প্রধান শিক্ষক (চ: দা:)']);
});

test('T3e ঠিকানা: অংশ-লেবেল নিজের ঠিকানার ভেতরে মেলে (বর্তমান ≠ স্থায়ী); নমুনায় আলাদা স্লট না থাকলে পরের লাইন একই স্লটে জোড়া', () => {
  const ir = { pages: [page([flow([
    P('paragraph', ['বর্তমান ঠিকানা : আগের গ্রাম']), P('paragraph', ['উপজেলা : আগের উপজেলা১']),
    P('paragraph', ['স্থায়ী ঠিকানা : আগের স্থায়ী']), P('paragraph', ['মোবাইল : ০১৭০০'])
  ])])] };
  const md = 'স্থায়ী ঠিকানা: নতুনপাড়া\nউপজেলা: নতুন উপজেলা\nজেলা: দিনাজপুর\n\nমোবাইল: ০১৯০০';
  const r = ST.compose(ST.toTemplate(ir), md);
  const t = items(r.ir).map(txt);
  assert.match(t[1], /^উপজেলা : \.+$/, 'বর্তমান-ঠিকানার উপজেলা স্থায়ী-ঠিকানার উপজেলা নেয় না');
  assert.equal(ST._cmp(t[2]), ST._cmp('স্থায়ী ঠিকানা : নতুনপাড়া, উপজেলা: নতুন উপজেলা, জেলা: দিনাজপুর'));
  assert.deepEqual(r.report.extras, []);
  assert.doesNotMatch(t.join('\n'), /আগের/);
});

// ------------------------------------------------------------------ আসল সোনালি নকশা (থাকলে)
const GOLD = path.join(ROOT, 'qa/golden-data');
const goldIR = (id) => { const f = path.join(GOLD, id, 'faithful-pdf/ir.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
test('আসল নকশা g24/g01 (ব্যক্তিগত, থাকলে): খসড়ার সব লেখা ফাইলে, নমুনার var-লেখা নয়', { skip: !goldIR('g24') && 'qa/golden-data নেই' }, () => {
  for (const [id, md, must] of [['g24', DRAFT_P, ['রাকিব হাসান', '১১/১০/২০২৬']], ['g01', DRAFT_M, ['করিম উদ্দিন', 'কম্পোজ', '১৯০']]]) {
    const ir = goldIR(id); if (!ir) continue;
    const tpl = ST.toTemplate(ir);
    const r = ST.compose(tpl, md);
    const text = allText(r.ir);
    for (const m of must) assert.ok(text.includes(m), id + ': ' + m);
    assert.deepEqual(r.report.extras, [], id + ': সব অংশ স্লটে');
    // ফাঁস-পরীক্ষা: পূরণ/খালি হওয়া var-স্লটের নমুনা-লেখা (বিন্দু ও খসড়াতেও থাকা ছক-লেখা ছাড়া) আর নেই
    const gone = tpl.slots.filter((s) => s.role === 'var' && !s.twinOf && s.kind !== 'table' && ST._cmp(s.sampleText).length > 6 && !/^[.…·_\-]+$/.test(s.sampleText.trim())
      && !ST._cmp(md).includes(ST._cmp(s.sampleText)));
    for (const s of gone) assert.ok(!ST._cmp(text).includes(ST._cmp(s.sampleText)), id + ' leak: ' + s.sampleText.slice(0, 30));
  }
});
