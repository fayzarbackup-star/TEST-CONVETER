/**
 * Part-19.1 — বাংলা জীবনবৃত্তান্ত (CV_RESUME) লেআউট (দোকানের নমুনা "Bangla জীবন বৃত্তন্ত.doc"; মাপ cv-layout.js-এর মাথায়)
 * নকশা: A4, মার্জিন উপরে/বামে ১", ডানে/নিচে ০.৫"; শিরোনাম বোল্ড-আন্ডারলাইন ৩২pt; "০১। লেবেল<ট্যাব>ঃ মান" ১৬pt ও ১.৭;
 * ঠিকানার দ্বিতীয় লাইন মানের নিচে; শিক্ষাগত যোগ্যতা বর্ডারসহ টেবিল; নিচে বামে তারিখ, ডানে দাগের নিচে স্বাক্ষর।
 * বাংলা সিভি নতুন লেআউটে, ইংরেজি সিভি পুরোনো CVEngine-এ। ফিক্সচার বেনামি।
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
  ['FayzarCvLayout', 'js/layout-engine/cv-layout.js']]) {
  const m = require(path.join(ROOT, p));
  if (m && !globalThis[n]) globalThis[n] = m;
}
const CL = globalThis.FayzarCvLayout;
const C = globalThis.DocClassifier;
const E = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const Pipeline = require(path.join(ROOT, 'js/layout-engine/fayzar-pipeline.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');
const BASIC = fx('cv-basic.input.md'), BIO = fx('cv-biodata.input.md'), LONG = fx('cv-long.input.md'), EN = fx('cv-english.input.md');
// নুকতা এক রূপে — precomposed য়/ড়/ঢ় (মডেলও তাই করে)
const N = (s) => String(s).replace(/য়/g, 'য়').replace(/ড়/g, 'ড়').replace(/ঢ়/g, 'ঢ়');
const kinds = (m) => m.blocks.map((b) => b.kind).join(' > ');
const rows = (m) => m.blocks.filter((b) => b.kind === 'kv').flatMap((b) => b.rows);

async function docx(text, font) {
  const out = await E.generateWordDoc(text, 'CV_RESUME', { format: 'docx', font });
  return (await JSZip.loadAsync(Buffer.from(await out.arrayBuffer()))).file('word/document.xml').async('string');
}
async function rtf(text, font) {
  const b = E.generateWordDoc(text, 'CV_RESUME', { format: 'doc', font });
  return Buffer.from(await b.arrayBuffer()).toString('utf8');
}

// ------------------------------------------------------------- ধরন ও প্রম্পট
test('ক্লাসিফিকেশন: CV_RESUME (content: OTHER থাকলেও প্রশ্নপত্র নয়); চিঠির ভেতরের সিভি GOVT_APP', () => {
  for (const t of [BASIC, BIO, LONG, EN]) assert.equal(C.classify(t).type, 'CV_RESUME');
  const app = BASIC.replace('doc_type: CV_RESUME', 'doc_type: GOVT_APP');
  assert.equal(C.classify(app).type, 'GOVT_APP');
});

test('OCR প্রম্পট: GOVT_APP-এর পরে CV_RESUME নিয়ম, চিঠির ভেতরের সিভি → GOVT_APP', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/ai-ocr-engine.js'), 'utf8');
  const gov = src.indexOf('doc_type: GOVT_APP, columns: 1');
  const cv = src.indexOf('doc_type: CV_RESUME, columns: 1');
  assert.ok(gov > 0 && cv > gov, 'CV_RESUME নিয়ম GOVT_APP লাইনের পরে');
  assert.match(src.slice(cv, cv + 300), /stays GOVT_APP/);
});

test('বাংলা/ইংরেজি বাছাই: isBangla', () => {
  assert.equal(CL.isBangla(BASIC), true);
  assert.equal(CL.isBangla(BIO), true);
  assert.equal(CL.isBangla(EN), false);
});

// ------------------------------------------------------------- পার্স
test('পার্স (নম্বর + ঃ): শিরোনাম → সারি → শিক্ষাগত যোগ্যতা → টেবিল → তারিখ/স্বাক্ষর; ঠিকানার দ্বিতীয় লাইন মানের নিচে', () => {
  const m = CL.parse(BASIC);
  assert.equal(kinds(m), 'title > kv > heading > table > footer');
  const r = rows(m);
  assert.equal(r.length, 8, '"উপজেলাঃ …" নতুন সারি নয়');
  assert.deepEqual([r[0].num, r[0].label, r[0].sep, r[0].value], ['০১', 'নাম', 'ঃ', 'মোঃ রফিকুল ইসলাম'], '"মোঃ" মানের ভেতরে অক্ষত');
  assert.equal(r[3].more.join('|'), 'উপজেলাঃ সদর, জেলাঃ দিনাজপুর');
  assert.equal(m.blocks.find((b) => b.kind === 'table').rows.length, 3);
  const f = m.blocks.find((b) => b.kind === 'footer');
  assert.equal(f.date, 'তারিখঃ ................ইং');
  assert.deepEqual(f.sign, ['স্বাক্ষর']);
});

test('পার্স (বায়োডাটা, নম্বর ছাড়া ":"): শিরোনাম-অংশ, অঙ্গীকার অনুচ্ছেদ জোড়া, এক লাইনে তারিখ+স্বাক্ষর ও নিচে নাম', () => {
  const m = CL.parse(BIO);
  assert.equal(kinds(m), 'title > heading > kv > heading > para > footer');
  const r = rows(m);
  assert.equal(r.length, 6);
  assert.ok(r.every((x) => x.sep === ':' && !x.num), 'উৎসের বিভাজক অক্ষত');
  assert.equal(r[3].more.join('|'), 'মিরপুর, ঢাকা');
  assert.ok(m.blocks.find((b) => b.kind === 'para').text.endsWith(N('বাধ্য থাকব।')), 'দুই লাইন এক অনুচ্ছেদে');
  const f = m.blocks.find((b) => b.kind === 'footer');
  assert.equal(f.date, 'তারিখ: ০৫/০৯/২০২৬');
  assert.deepEqual(f.sign, ['স্বাক্ষর', N('(সুমাইয়া আক্তার)')]);
});

test('পার্স-নিরাপত্তা: "মোঃ" সংক্ষেপ বিভাজক নয় — রেফারেন্সের লাইন অনুচ্ছেদ থাকে', () => {
  const m = CL.parse(LONG);
  assert.equal(kinds(m), 'title > kv > heading > table > heading > para > heading > para > footer');
  assert.equal(rows(m).length, 20);
  assert.ok(m.blocks.filter((b) => b.kind === 'para')[0].text.startsWith(N('জনাব মোঃ কামরুল ইসলাম')));
});

// ------------------------------------------------------------- এক পাতায় ধরানো
test('এক পাতা: ছোট সিভি সাধারণ ধাপে; লম্বা সিভি ছোট ধাপে, কোনো ধাপে না ধরলে সবচেয়ে ছোট ধাপ (বড় নয়)', () => {
  const st = (t, b) => CL.geometry(CL.parse(t), { isBijoy: b }).fitStep;
  assert.equal(st(BASIC, true), 0);
  assert.equal(st(BIO, true), 0);
  assert.equal(st(LONG, true), CL.STEPS.length - 1);
  assert.equal(st(LONG, false), CL.STEPS.length - 1);
  assert.equal(CL.STEPS[CL.STEPS.length - 1].sz, 24);   // সর্বনিম্ন ১২pt (ব্যবহারকারী) — এর বেশি লম্বা হলে ২ পাতা
  const g = CL.geometry(CL.parse(BASIC), { isBijoy: true });
  assert.ok(CL.estimateHeight(CL.parse(BASIC), g, true) <= g.usableH);
  assert.equal(CL.geometry(CL.parse(LONG), { noFit: true }).fitStep, 0);
});

test('২ পাতা হলে তারিখ/স্বাক্ষর শেষ লেখার সাথে: ফুটারের আগের অনুচ্ছেদ ও ফাঁকা লাইনে keepNext/\\keepn', () => {
  const m = CL.parse(LONG);
  assert.equal(m.blocks[m.blocks.length - 1].kind, 'footer');
  const h = { runs: (t) => '<w:r><w:t>' + t + '</w:t></w:r>', rtf: (t) => t, isBijoy: true };
  const x = CL.renderDocx(m, h);
  const before = x.slice(0, x.lastIndexOf('<w:tbl>'));   // ফুটার = শেষ টেবিল
  const paras = before.split('<w:p>').slice(-3);   // শেষ লেখা + ২টি ফাঁকা লাইন
  for (const p of paras) assert.ok(p.startsWith('<w:pPr><w:keepNext/>'), p.slice(0, 60));
  assert.equal((x.match(/<w:keepNext\/><w:keepNext\/>/g) || []).length, 0);
  const r = CL.renderRtf(m, h);
  const rb = r.slice(0, r.lastIndexOf('{\\trowd'));
  for (const p of rb.split('{\\pard').slice(-3)) assert.ok(p.startsWith('\\plain\\keepn'), p.slice(0, 40));
});

// ------------------------------------------------------------- .docx
test('.docx: A4, মার্জিন ১"/০.৫", শিরোনাম বোল্ড-আন্ডারলাইন ৩২pt, ১৬pt ও ১.৭, মানের ট্যাব, নাম বোল্ড, টেবিল বর্ডারসহ, স্বাক্ষরের দাগ', async () => {
  const xml = await docx(BASIC, 'bijoy');
  assert.match(xml, /<w:pgSz w:w="11906" w:h="16838"\/>/);
  assert.match(xml, /<w:pgMar w:top="1440" w:right="720" w:bottom="720" w:left="1440"/);
  assert.match(xml, /<w:b\/><w:u w:val="single"\/><w:sz w:val="64"\/>/, 'শিরোনাম ৩২pt');
  assert.match(xml, /w:line="408" w:lineRule="auto"\/>/, '১.৭ লাইন');
  const tab = +(xml.match(/<w:tab w:val="left" w:pos="(\d+)"\/>/) || [])[1];
  assert.ok(tab >= 2600 && tab <= 4600, 'মানের ট্যাব দীর্ঘতম লেবেলের পরে (পেলাম ' + tab + ')');
  assert.match(xml, /<w:ind w:left="(\d+)" w:hanging="\1"\/>/, 'মোড়ানো মান ট্যাবের নিচে');
  assert.match(xml, /<w:tblBorders><w:top w:val="single"/, 'শিক্ষাগত যোগ্যতা বর্ডারসহ');
  assert.match(xml, /<w:tblBorders><w:top w:val="nil"\/>/, 'তারিখ/স্বাক্ষর সীমানাহীন টেবিলে');
  assert.match(xml, /<w:pBdr><w:top w:val="single"/, 'স্বাক্ষরের উপরে দাগ');
  const uni = await docx(BASIC, 'Kalpurush');
  assert.ok(uni.includes('জীবন বৃত্তান্ত') && uni.includes('উপজেলাঃ সদর'), 'লেখা অক্ষত (ইউনিকোড ফাইলে খোঁজা)');
  assert.match(uni, /<w:b\/>(?:<w:[^>]*\/>)*<\/w:rPr><w:t[^>]*>ঃ মোঃ রফিকুল ইসলাম/, 'নামের মান বোল্ড');
});

// ------------------------------------------------------------- Word 2003
test('.doc (Word 2003 RTF): একই মাপ, ট্যাব-স্টপ, একটিই ডকুমেন্ট, স্বাক্ষর-সারি ভাঙে না', async () => {
  const s = await rtf(BASIC, 'bijoy');
  assert.match(s, /\\paperw11906\\paperh16838\\margl1440\\margr720\\margt1440\\margb720/);
  assert.match(s, /\\fs64/);
  assert.match(s, /\\li(\d+)\\fi-\1\\tx\d+/);
  assert.match(s, /\\trkeep/);
  assert.equal((s.match(/\{\\rtf1/g) || []).length, 1);
});

// ------------------------------------------------------------- প্রিভিউ = ডাউনলোড; ইংরেজি পুরোনো ইঞ্জিনে
test('প্রিভিউ: পাইপলাইন একই মডেল থেকে; ইংরেজি সিভি পুরোনো ইঞ্জিনে', async () => {
  const r = await Pipeline.process(BIO, { outputFormat: 'html', font: 'bijoy' });
  assert.equal(r.docType, 'CV_RESUME');
  assert.equal(r.parsedData.kind, 'CV_LAYOUT');
  assert.match(r.content, /official-cv-layout/);
  assert.match(r.content, /border-top: 1px solid #000/);
  assert.equal((r.content.match(/class="paper-sheet/g) || []).length, 1);
  const en = await Pipeline.process(EN, { outputFormat: 'html', font: 'Kalpurush' });
  assert.equal(en.docType, 'CV_RESUME');
  assert.notEqual(en.parsedData && en.parsedData.kind, 'CV_LAYOUT');
  assert.doesNotMatch(en.content || '', /official-cv-layout/);
});
