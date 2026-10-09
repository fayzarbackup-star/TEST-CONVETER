/**
 * Part-19.3 — আসল Gemini OCR-এ যা ভাঙছিল (Word COM-এ নমুনার সাথে মেপে ঠিক করা)
 * ১. প্যাডে লেখা আবেদন: Gemini বলে GOVT_APP ⇒ আগে প্যাড ছাড়া সাধারণ আবেদন; এখন পাইপলাইনে OFFICE_PAD (letter-layout)।
 *    "#" শিরোনাম-চিহ্ন stripOcrArtifacts মুছে ফেলে, তাই কাঁচা লেখায় LetterLayout.hasLetterhead দেখা হয়।
 * ২. সনদ: গ্রেড-ছক প্রতিষ্ঠান-নামের আগে এলে মাথা হারাত; দুই পাতার দুটি সনদ মুড়ি ভাবা হতো; একা "*" বিভাজক।
 * ৩. একক সনদ নমুনা Dreamland-এর মতো: গ্রেড-ছক ডান-উপরে নামের আগে, মার্জিন ০.৪", তারিখ-স্বাক্ষর একই উচ্চতায় বোল্ড।
 * ফিক্সচার বেনামি (real-ocr/cert-two-pages.md = আসল OCR, নাম/মোবাইল বদলানো)।
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
  ['FayzarLetterLayout', 'js/layout-engine/letter-layout.js'], ['FayzarCertificateLayout', 'js/layout-engine/certificate-layout.js']]) {
  const m = require(path.join(ROOT, p));
  if (m && !globalThis[n]) globalThis[n] = m;
}
const LL = globalThis.FayzarLetterLayout;
const CT = globalThis.FayzarCertificateLayout;
const E = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const Pipeline = require(path.join(ROOT, 'js/layout-engine/fayzar-pipeline.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');
const body = (t) => t.replace(/^---[\s\S]*?---\n/, '');

// আসল OCR-এর মতো: একই প্যাড-আবেদন, শুধু doc_type GOVT_APP
const PAD_AS_APP = fx('pad-school-app.input.md').replace(/doc_type:\s*OFFICE_PAD/, 'doc_type: GOVT_APP');
const TWO = fx('real-ocr/cert-two-pages.md');

test('hasLetterhead: প্যাড-আবেদনে হ্যাঁ; সাধারণ আবেদনে (প্যাড নেই) না', () => {
  assert.equal(LL.hasLetterhead(body(PAD_AS_APP)), true);
  for (const f of ['app-job.input.md', 'app-holding.input.md', 'app-correction.input.md']) assert.equal(LL.hasLetterhead(fx(f)), false, f);
});

test('পাইপলাইন: GOVT_APP + প্যাড ⇒ OFFICE_PAD (letter-layout); সাধারণ আবেদন GOVT_APP-ই', async () => {
  const r = await Pipeline.process(body(PAD_AS_APP), { docType: 'GOVT_APP', outputFormat: 'html' });
  assert.equal(r.docType, 'OFFICE_PAD');
  assert.equal(r.parsedData.kind, 'LETTER_LAYOUT');
  assert.equal(r.parsedData.blocks[0].kind, 'letterhead');
  const j = await Pipeline.process(body(fx('app-job.input.md')), { docType: 'GOVT_APP', outputFormat: 'html' });
  assert.equal(j.docType, 'GOVT_APP');
});

test('সনদ: আগে গ্রেড-ছক এলেও মাথা ধরা পড়ে; দুই পূর্ণ সনদ ⇒ দুটি একক (মুড়ি নয়)', () => {
  const m = CT.parse(TWO);
  assert.equal(m.variant, 'single');
  assert.equal(m.parts.length, 2);
  for (const p of m.parts) {
    assert.deepEqual(p.head.map((h) => h.role), ['org', 'addr', 'meta']);
    assert.equal(p.tables.length, 1);
    assert.ok(p.title);
    assert.equal(p.footer.sign.length, 4);
  }
});

test('একক সনদ docx: ছক নামের আগে, মার্জিন ৫৭৬, দুই সনদে পাতা-বিরতি, তারিখ-স্বাক্ষরে মাঝ-ট্যাব', async () => {
  const out = await E.generateWordDoc(TWO, 'PROTTOYON', { format: 'docx', font: 'bijoy' });
  const x = await (await JSZip.loadAsync(Buffer.from(await out.arrayBuffer()))).file('word/document.xml').async('string');
  const b = x.slice(x.indexOf('<w:body>'));
  assert.ok(b.indexOf('<w:tbl>') < b.indexOf('<w:sz w:val="94"/>'), 'গ্রেড-ছক প্রতিষ্ঠান-নামের আগে');
  assert.match(x, /<w:pgMar w:top="576" w:right="576" w:bottom="576" w:left="576"/);
  assert.equal((x.match(/<w:br w:type="page"\/>/g) || []).length, 1);
  assert.match(x, /<w:tab w:val="center" w:pos="\d+"\/>/);
});

test('মুড়ি: একা "*" বিভাজক; রাঙামাটি ফিক্সচার আগের মতো মুড়ি+মূল', () => {
  assert.equal(CT.RX.hr.test('*'), true);
  assert.equal(CT.parse(fx('cert-stub.input.md')).variant, 'stub');
});
