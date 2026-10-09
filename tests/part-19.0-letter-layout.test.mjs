/**
 * Part-19.0 — প্যাড/অফিস চিঠি (OFFICE_PAD) ও প্রত্যয়নপত্র (PROTTOYON) লেআউট (দোকানের নমুনা Pad.doc, Pad Ap.doc, Prottyon.doc)
 * নকশা: A4, মার্জিন ০.৫" (মূল লেখা আরও ০.২৫" ভেতরে); প্যাড-শিরোনাম মাঝে (নাম বোল্ড ৩৬pt) + নিচে দাগ;
 * চিঠির অংশ আবেদন-মডিউলের ব্লকে; স্বাক্ষর ডানে মাঝে-সাজানো, দুইজন হলে পাশাপাশি; প্রত্যয়নে শিরোনাম বোল্ড-আন্ডারলাইন ২৫pt,
 * মূল লেখা ১৬pt ও লাইন ১.৫। লম্বা হলে ধাপে ধাপে ছোট করে এক পাতায় (Word-এ মাপা)।
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
  ['TextRunProcessor', 'js/layout-engine/text-run-processor.js'], ['FayzarFrontmatter', 'js/layout-engine/frontmatter-header.js'],
  ['DocClassifier', 'js/engines/doc-classifier.js'], ['FayzarApplicationLayout', 'js/layout-engine/application-layout.js'],
  ['FayzarLetterLayout', 'js/layout-engine/letter-layout.js']]) {
  const m = require(path.join(ROOT, p));
  if (m && !globalThis[n]) globalThis[n] = m;
}
const LL = globalThis.FayzarLetterLayout;
const C = globalThis.DocClassifier;
const E = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const Pipeline = require(path.join(ROOT, 'js/layout-engine/fayzar-pipeline.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');
const NOTICE = fx('pad-notice.input.md'), SCHOOL_APP = fx('pad-school-app.input.md');
const PR_SCHOOL = fx('prottoyon-school.input.md'), PR_UP = fx('prottoyon-up.input.md');
const N = (s) => String(s).replace(/য়/g, 'য়').replace(/ড়/g, 'ড়');   // নুকতা এক রূপে (মডেলও তাই করে)
const kinds = (m) => m.blocks.map((b) => b.kind + (b.role ? '/' + b.role : '')).join(' > ');
const roles = (m) => m.blocks[0].lines.map((l) => l.role).join(',');

async function docx(text, docType, font) {
  const out = await E.generateWordDoc(text, docType, { format: 'docx', font });
  return (await JSZip.loadAsync(Buffer.from(await out.arrayBuffer()))).file('word/document.xml').async('string');
}
async function rtf(text, docType, font) {
  const b = E.generateWordDoc(text, docType, { format: 'doc', font });
  return Buffer.from(await b.arrayBuffer()).toString('utf8');
}

// ------------------------------------------------------------- ধরন ও পার্স
test('ক্লাসিফিকেশন: Gemini-র doc_type অনুযায়ী OFFICE_PAD / PROTTOYON', () => {
  assert.equal(C.classify(NOTICE).type, 'OFFICE_PAD');
  assert.equal(C.classify(SCHOOL_APP).type, 'OFFICE_PAD');
  assert.equal(C.classify(PR_SCHOOL).type, 'PROTTOYON');
  assert.equal(C.classify(PR_UP).type, 'PROTTOYON');
});

test('পার্স (প্যাড): শিরোনাম → চিঠির অংশ (আবেদন-ব্লক) → স্বাক্ষর → অনুলিপি; ক্রম অক্ষত', () => {
  const n = LL.parse(NOTICE, 'pad');
  assert.equal(kinds(n), 'letterhead > memoDate > lines/receiver > subject > line/salutation > para/body > signature > list/copy');
  assert.equal(roles(n), 'org,addr');
  const sig = n.blocks.find((b) => b.kind === 'signature');
  assert.equal(sig.groups.length, 2, 'আহ্বায়ক ও সদস্য সচিব পাশাপাশি');
  assert.deepEqual(sig.groups.map((g) => g[1]), [N('আহ্বায়ক'), N('সদস্য সচিব (ভারপ্রাপ্ত)')]);
  assert.equal(n.blocks.find((b) => b.kind === 'list').items.length, 3);

  const a = LL.parse(SCHOOL_APP, 'pad');
  assert.equal(kinds(a), 'letterhead > lines/receiver > line/via > subject > memoDate > line/salutation > para/body > table > line/date > signature');
  assert.equal(roles(a), 'top,org,addr,meta');
  assert.equal(a.blocks.find((b) => b.kind === 'signature').groups[0].length, 4);
});

test('পার্স (প্রত্যয়ন): কার্যালয়-লাইন নামের উপরে ছোট; উদ্ধৃতিসহ শিরোনাম; বন্ধনী-ছাড়া নাম ও ইংরেজি স্বাক্ষর', () => {
  const s = LL.parse(PR_SCHOOL, 'prottoyon');
  assert.equal(kinds(s), 'letterhead > memoDate > title > para/body > para/body > para/body > signature');
  assert.equal(roles(s), 'top,org,meta,addr,meta');
  assert.equal(s.blocks[0].lines[1].text, N('হাবিবপুর দ্বি-মুখী উচ্চ বিদ্যালয়'));
  assert.equal(s.blocks.find((b) => b.kind === 'signature').groups[0][0], N('মোঃ দেলোয়ার হোসেন'), 'পদবির আগের নামও স্বাক্ষরে');
  assert.ok(s.blocks.find((b) => b.kind === 'para').text.startsWith(N('এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, সঞ্জয় কুমার দাস,')), '** বাদ, লেখা অক্ষত');

  const u = LL.parse(PR_UP, 'prottoyon');
  assert.equal(kinds(u), 'letterhead > memoDate > title > para/body > para/body > para/body > signature');
  assert.equal(roles(u), 'top,top,org,addr');
  assert.equal(u.blocks.find((b) => b.kind === 'title').text, N('“নাম সংশোধনী প্রত্যয়নপত্র”'));
  assert.equal(u.blocks.find((b) => b.kind === 'signature').groups[0][0], 'Seal & Signature');
});

test('পার্স-নিরাপত্তা: "বরাবর" নিচের পদবি স্বাক্ষর নয়; প্যাড ছাড়া চিঠিতে শিরোনাম-ব্লক নেই; তথ্য-সারি একসাথে', () => {
  const t = ['তারিখ: ০১/০১/২০২৬', 'বরাবর,', 'প্রধান শিক্ষক', 'ক খ উচ্চ বিদ্যালয়', 'বিষয়: ছুটির আবেদন।', 'জনাব,',
    'বিনীত নিবেদন এই যে, আমি অসুস্থ থাকায় গত তিন দিন বিদ্যালয়ে উপস্থিত হতে পারিনি। তাই ছুটি মঞ্জুরের আবেদন করছি।', 'নিবেদক,', 'রহিম'].join('\n');
  const m = LL.parse(t, 'pad');
  assert.ok(!m.blocks.some((b) => b.kind === 'letterhead'));
  assert.ok(!m.blocks.some((b) => b.kind === 'signature'), 'নাম/পদবি-চিহ্ন নেই → আবেদন-মডিউলের নিবেদক-ব্লক');
  assert.ok(m.blocks.some((b) => b.kind === 'closing'));
  assert.equal(m.blocks.find((b) => b.kind === 'lines').lines.join('|'), N('প্রধান শিক্ষক|ক খ উচ্চ বিদ্যালয়'));

  const f = LL.parse(['# ক খ সরকারি প্রাথমিক বিদ্যালয়', 'প্রত্যয়নপত্র', 'নাম: রহিম', 'পিতা: করিম', 'মাতা: রহিমা', 'সে অত্র বিদ্যালয়ের নিয়মিত ছাত্র।', '(মোঃ আলম)', 'প্রধান শিক্ষক'].join('\n'), 'prottoyon');
  assert.equal(kinds(f), 'letterhead > title > fields > para/body > signature');
  assert.equal(f.blocks[2].lines.length, 3);
});

// ------------------------------------------------------------- .docx
test('.docx (প্রত্যয়ন): A4, মার্জিন ০.৫" + ০.২৫", শিরোনাম বোল্ড-আন্ডারলাইন ২৫pt, মূল লেখা ১৬pt ও ১.৫, দাগ, স্বাক্ষর ডানে মাঝে', async () => {
  const xml = await docx(PR_SCHOOL, 'PROTTOYON', 'bijoy');
  assert.match(xml, /<w:pgSz w:w="11906" w:h="16838"\/>/);
  assert.match(xml, /<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="1080"/);
  assert.match(xml, /<w:pBdr><w:bottom w:val="single" w:sz="18"[^>]*\/><\/w:pBdr><w:spacing [^>]*\/><w:ind w:left="-360"\/><w:jc w:val="center"\/>/, 'শিরোনামের নিচে দাগ, পুরো প্রস্থে (pPr-এর ক্রম ঠিক)');
  const orgSz = +(xml.match(/<w:b\/><w:sz w:val="(\d+)"\/>/) || [])[1];
  assert.ok(orgSz >= 44 && orgSz <= 72, 'প্রতিষ্ঠানের নাম বোল্ড, ৩৬pt থেকে এক লাইনে ধরা পর্যন্ত ছোট (পেলাম ' + orgSz + ')');
  const short = await docx(PR_SCHOOL.replace('হাবিবপুর দ্বি-মুখী উচ্চ বিদ্যালয়', 'ক খ বিদ্যালয়'), 'PROTTOYON', 'bijoy');
  assert.match(short, /<w:b\/><w:sz w:val="72"\/>/, 'ছোট নাম পুরো ৩৬pt');
  assert.match(xml, /<w:b\/><w:u w:val="single"\/><w:sz w:val="50"\/>/, 'শিরোনাম বোল্ড-আন্ডারলাইন ২৫pt');
  assert.match(xml, /w:line="360" w:lineRule="auto"\/><w:jc w:val="both"\/><\/w:pPr><w:r><w:rPr><w:sz w:val="32"\/>/, 'মূল লেখা ১৬pt, ১.৫, দুই-পাশে সমান');
  assert.match(xml, /<w:ind w:left="\d{4}"\/><w:jc w:val="center"\/><\/w:pPr><w:r><w:rPr><w:sz w:val="28"\/>/, 'স্বাক্ষর ডানে, মাঝে, ১৪pt');
  assert.doesNotMatch(xml, /certificate-document|স্বাক্ষর ও সিলমোহর/, 'পুরোনো ইঞ্জিনের বানানো লেখা নেই');
});

test('.docx (প্যাড): দুইজনের স্বাক্ষর সীমানাহীন টেবিলে পাশাপাশি; স্মারক-তারিখ ডান-ট্যাবে; অনুলিপি', async () => {
  const xml = await docx(NOTICE, 'OFFICE_PAD', 'bijoy');
  assert.match(xml, /<w:tblBorders><w:top w:val="nil"\/>[\s\S]*?<w:gridCol w:w="\d+"\/><w:gridCol w:w="\d+"\/><\/w:tblGrid>/);
  assert.match(xml, /<w:tab w:val="right" w:pos="10106"\/>/);
  assert.ok((await docx(NOTICE, 'OFFICE_PAD', 'Kalpurush')).includes('অনুলিপি প্রেরণ:'), 'অনুলিপি (ইউনিকোড ফাইলে খোঁজা)');
  const tbl = await docx(SCHOOL_APP, 'OFFICE_PAD', 'bijoy');
  assert.match(tbl, /<w:tblBorders><w:top w:val="single"/, 'ছকের টেবিল বর্ডারসহ (আবেদন-মডিউল)');
});

// ------------------------------------------------------------- Word 2003
test('.doc (Word 2003 RTF): একই মাপ, শিরোনামের দাগ, একটিই ডকুমেন্ট (ভেতরে আবেদন-ব্লক body-only)', async () => {
  const s = await rtf(NOTICE, 'OFFICE_PAD', 'bijoy');
  assert.match(s, /\\paperw11906\\paperh16838\\margl1080\\margr720\\margt720\\margb720/);
  assert.match(s, /\\brdrb\\brdrs\\brdrw30/);
  assert.equal((s.match(/\{\\rtf1/g) || []).length, 1);
  assert.match(s, /\\cellx\d+\\cellx\d+/, 'দুই স্বাক্ষর পাশাপাশি');
  const p = await rtf(PR_UP, 'PROTTOYON', 'bijoy');
  assert.match(p, /\\qc\\li\d+ /, 'স্বাক্ষর ডানে মাঝে');
  assert.match(p, /\{\\b \{\\ul /, 'শিরোনাম বোল্ড-আন্ডারলাইন');
  assert.equal((p.match(/\{\\rtf1/g) || []).length, 1);
});

// ------------------------------------------------------------- এক পাতায় ধরানো (Word-এ মাপা ২০২৬-১০-০৯)
test('এক পাতা: বিজয়ে সব নমুনা সাধারণ বা কাছের ধাপে; কালপুরুষে আঁটসাঁট ধাপে', () => {
  const st = (t, v, b) => LL.geometry(LL.parse(t, v), { isBijoy: b }).fitStep;
  assert.equal(st(NOTICE, 'pad', true), 0);
  assert.equal(st(SCHOOL_APP, 'pad', true), 0);
  assert.equal(st(PR_SCHOOL, 'prottoyon', true), 0);
  assert.equal(st(PR_UP, 'prottoyon', true), 1, 'Word-এ মাপা: ধাপ ০-এ দুই পাতা (৮৩৪pt), ধাপ ১-এ এক পাতা');
  assert.equal(st(SCHOOL_APP, 'pad', false), 3, 'কালপুরুষ: ধাপ ২-এ দুই পাতা, ধাপ ৩-এ এক পাতা');
  assert.equal(st(PR_UP, 'prottoyon', false), 3);
});

// ------------------------------------------------------------- প্রিভিউ = ডাউনলোড
test('প্রিভিউ: পাইপলাইন একই মডেল থেকে — প্যাড-দাগ, শিরোনাম, স্বাক্ষর', async () => {
  const r = await Pipeline.process(PR_UP, { outputFormat: 'html', font: 'bijoy' });
  assert.equal(r.docType, 'PROTTOYON');
  assert.equal(r.parsedData.kind, 'LETTER_LAYOUT');
  assert.match(r.content, /official-letter-layout letter-prottoyon/);
  assert.match(r.content, /border-bottom: 2px solid #000/);
  assert.match(r.content, /text-decoration: underline/);
  assert.match(r.content, /Seal &amp; Signature/);
  const pad = await Pipeline.process(SCHOOL_APP, { outputFormat: 'html', font: 'bijoy' });
  assert.equal(pad.docType, 'OFFICE_PAD');
  assert.match(pad.content, /<table/);
  assert.match(pad.content, /বরাবর,/);
  assert.equal((pad.content.match(/class="paper-sheet/g) || []).length, 1, 'আবেদন-ব্লক নিজের পাতা বানায় না');
});
