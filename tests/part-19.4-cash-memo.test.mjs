/**
 * Part-19.4 — ক্যাশমেমো ২-আপ/৩-আপ (cash-memo-layout.js), দোকানের নমুনা থেকে:
 *  ২-আপ ফাঁকা মেমো (এক লম্বা সারি, শুধু খাড়া দাগ) · ৩-আপ পণ্য-তালিকা (প্রতি পণ্য এক সারি + নম্বরসহ ফাঁকা সারি)।
 *  প্রতি কলামে ঠিক এক কপি — কপির মাঝে কলাম-ব্রেক, কপি কলাম ছাপিয়ে যাবে না (Word-এ মাপা; এখানে মডেলের চুক্তি)।
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
  ['DocClassifier', 'js/engines/doc-classifier.js'], ['FayzarCashMemoLayout', 'js/layout-engine/cash-memo-layout.js']]) {
  const m = require(path.join(ROOT, p));
  if (m && !globalThis[n]) globalThis[n] = m;
}
const CM = globalThis.FayzarCashMemoLayout;
const C = globalThis.DocClassifier;
const E = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const Pipeline = require(path.join(ROOT, 'js/layout-engine/fayzar-pipeline.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');
const BLANK = fx('cash-memo-blank.input.md');
const ITEMS = fx('cash-memo-items.input.md');

async function docx(text, opts = {}) {
  const out = await E.generateWordDoc(text, 'CASH_MEMO', { format: 'docx', ...opts });
  return (await JSZip.loadAsync(Buffer.from(await out.arrayBuffer()))).file('word/document.xml').async('string');
}

test('শ্রেণিবিভাগ: doc_type CASH_MEMO', () => {
  assert.equal(C.classify(BLANK).type, 'CASH_MEMO');
  assert.equal(C.classify(ITEMS).type, 'CASH_MEMO');
  assert.equal(C.classify(BLANK.replace('CASH_MEMO', 'MEMO')).type, 'CASH_MEMO');
});

test('পার্স: মাথার ভূমিকা, শিরোনাম, ঘর, ছক, মোট, কথায়, স্বাক্ষর', () => {
  const m = CM.parse(BLANK);
  assert.equal(m.copies, 2);
  assert.deepEqual(m.header.map((h) => h.role), ['bis', 'shop', 'prop', 'serv', 'addr', 'contact']);
  assert.equal(m.title, 'ক্যাশ মেমো');
  assert.deepEqual(m.fields.map((f) => f.map((s) => s.label)), [['নাম:', 'তারিখ:'], ['ঠিকানা:']]);
  assert.ok(m.fields.flat().every((s) => s.value === ''), 'ডট = ফাঁকা ঘর');
  assert.deepEqual(m.table.head, ['ক্রমিক', 'বিবরণ', 'পরিমাণ', 'দর', 'টাকা']);
  assert.equal(m.table.blank, true);
  assert.equal(m.total.label, 'সর্বমোট:');
  assert.equal(m.inWords[0].label, 'কথায়:');   // য় precomposed (norm)
  assert.deepEqual(m.sign, { left: 'ক্রেতার স্বাক্ষর', right: 'বিক্রেতার স্বাক্ষর' });

  const n = CM.parse(ITEMS);
  assert.equal(n.copies, 3);
  assert.equal(n.table.items.length, 22, 'শুধু-নম্বরের ফাঁকা সারি (২৩, ২৪) বাদ — পরে কলাম ভরে আবার আসে');
  assert.equal(n.total.label, 'মোট=');
  assert.deepEqual(n.fields[0].map((s) => s.label), ['নাম', 'অর্ডার তাং-']);
  assert.equal(n.fields[0][1].value, '...../...../......', 'তারিখের ছাঁচ অক্ষত');
});

test('কপি-সংখ্যা: options.copies > ফ্রন্টম্যাটার > ২', () => {
  assert.equal(CM.parse(BLANK, { copies: 3 }).copies, 3);
  assert.equal(CM.parse(BLANK.replace('copies: 2\n', '')).copies, 2);
  assert.equal(CM.parse(body(ITEMS), { __frontmatter: { copies: '৩' } }).copies, 3);
});
const body = (t) => t.replace(/^---[\s\S]*?---\s*/, '');

test('জ্যামিতি: কলামে ধরে (উচ্চতার হিসাব), ৩-আপ ছোট সাইজ, ফাঁকা সারির ক্রমিক ধারাবাহিক', () => {
  for (const [t, up] of [[BLANK, 2], [ITEMS, 3]]) {
    for (const isBijoy of [true, false]) {
      const m = CM.parse(t);
      const g = CM.geometry(m, { isBijoy });
      assert.equal(g.up, up);
      assert.ok(CM._fill(m, g) >= 0, 'কলামে ধরে: ' + up + (isBijoy ? ' বিজয়' : ' ইউনিকোড'));
      assert.equal(g.colW, Math.floor((g.usableW - g.gap * (up - 1)) / up));
      assert.equal(g.lineK, isBijoy ? 1 : 0.72);
    }
  }
  const m = CM.parse(ITEMS), g = CM.geometry(m, { isBijoy: true });
  assert.ok(g.sz <= 20 && g.sz >= 16);
  assert.ok(g.fillerRows >= 1);
  assert.equal(CM._serial(m, 1), '২৩');
  const b = CM.parse(BLANK), gb = CM.geometry(b, { isBijoy: true });
  assert.equal(gb.sz, 24);
  assert.ok(gb.tallRowH > gb.rowH * 10, 'ফাঁকা মেমোর লম্বা সারি');
});

test('DOCX: ল্যান্ডস্কেপ, কপি-সংখ্যার কলাম, কপির মাঝে কলাম-ব্রেক (খালি অনুচ্ছেদ নয়), কালো বাক্স, exact সারি', async () => {
  const x = await docx(BLANK, { targetFont: 'bijoy' });
  assert.match(x, /<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"\/>/);
  assert.match(x, /<w:cols w:num="2" w:space="864"\/>/);
  assert.equal((x.match(/<w:br w:type="column"\/>/g) || []).length, 1);
  assert.doesNotMatch(x, /<w:p><w:r><w:br w:type="column"\/><\/w:r><\/w:p>/);
  assert.equal((x.match(/<w:tbl>/g) || []).length, 2);
  assert.match(x, /<w:color w:val="FFFFFF"\/><w:shd w:val="clear" w:color="auto" w:fill="000000"\/>/);
  assert.doesNotMatch(x, /w:hRule="atLeast"/);
  assert.match(x, /w:leader="dot"/);
  const y = await docx(ITEMS, { targetFont: 'bijoy' });
  assert.match(y, /<w:cols w:num="3" w:space="576"\/>/);
  assert.equal((y.match(/<w:br w:type="column"\/>/g) || []).length, 2);
  assert.equal((y.match(/<w:tbl>/g) || []).length, 3);
});

test('ইউনিকোড শেষ ফাইল: লাইন ০.৭২ (প্রশ্নপত্রের মতো); বিজয়: ২৪০', async () => {
  const u = await docx(BLANK, { targetFont: 'unicode' });
  const b = await docx(BLANK, { targetFont: 'bijoy' });
  assert.ok(u.includes('w:line="173" w:lineRule="auto"'));
  assert.ok(!b.includes('w:line="173"') && b.includes('w:line="240" w:lineRule="auto"'));
});

test('খালি ঘর/অনুচ্ছেদে নিজের সাইজের স্পেস-রান (docx→doc-এ ১২pt-এর &nbsp; নয়)', async () => {
  const y = await docx(ITEMS, { targetFont: 'bijoy' });
  const emptyCells = (y.match(/<\/w:pPr><\/w:p><\/w:tc>/g) || []).length;
  assert.equal(emptyCells, 0);
});

test('RTF ও HTML প্রিভিউ: একই মডেল', async () => {
  const blob = await E.generateWordDoc(ITEMS, 'CASH_MEMO', { format: 'doc', font: 'bijoy' });
  const rtf = Buffer.from(await blob.arrayBuffer()).toString('utf8');
  assert.match(rtf, /\\cols3\\colsx576/);
  assert.equal((rtf.match(/\\column/g) || []).length, 2);
  assert.match(rtf, /\\landscape/);
  const r = await Pipeline.process(body(BLANK), { docType: 'CASH_MEMO', outputFormat: 'html', __frontmatter: { copies: '2' } });
  assert.equal(r.parsedData.kind, 'CASH_MEMO_LAYOUT');
  assert.match(r.content, /official-cash-memo-layout/);
  assert.equal((r.content.match(/<table/g) || []).length, 2);
});
