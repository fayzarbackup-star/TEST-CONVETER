/**
 * T3a (docs/T3_PLAN.md §৩) — "আমার টেমপ্লেট" ভান্ডার: সেভ/তালিকা/নাম-বদল/মোছা, সীমা (৫০টি, ৪ পাতা), রপ্তানি↔আমদানি।
 * ইন-মেমরি ব্যাকএন্ড (IndexedDB-র একই চুক্তি) — কোনো npm প্যাকেজ নয়।
 *   node --test tests/t3a-template-store.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TS = require(path.join(ROOT, 'js/template-store.js'));

const page = (n) => ({ page: n, widthPt: 595, heightPt: 842, bands: [{ kind: 'flow', cells: [{ x0: 0, x1: 500, items: [{ kind: 'para', type: 'label_value', text: 'নাম: রহিম' }] }] }] });
const tpl = (name, pages = 1, extra = {}) => Object.assign({ name, ir: { pages: Array.from({ length: pages }, (_, i) => page(i + 1)), warnings: [] },
  slots: [{ id: 's1', kind: 'kv', role: 'var', label: 'নাম' }], thumb: 'data:image/jpeg;base64,AAAA', source: { kind: 'image', hash: 'h1' } }, extra);
const fresh = () => TS.create(TS.memoryBackend());

test('সেভ → তালিকা (হালকা রূপ, নতুনটি আগে) → get পূর্ণ রেকর্ড', async () => {
  const S = fresh();
  const a = await S.save(tpl('  প্রত্যয়ন   ছাঁচ '));
  await new Promise((r) => setTimeout(r, 3));
  const b = await S.save(tpl('সিভি', 2));
  assert.equal(a.name, 'প্রত্যয়ন ছাঁচ', 'নাম পরিষ্কার');
  assert.equal(b.pages, 2);
  assert.match(a.id, /^t[0-9a-z]+$/);
  const list = await S.list();
  assert.deepEqual(list.map((x) => x.name), ['সিভি', 'প্রত্যয়ন ছাঁচ']);
  assert.equal(list[0].ir, undefined, 'তালিকায় নকশা নেই');
  const full = await S.get(a.id);
  assert.equal(full.ir.pages[0].bands[0].cells[0].items[0].text, 'নাম: রহিম');
  assert.equal(full.version, 1);
});

test('হালনাগাদ (একই id): createdAt অক্ষত, updatedAt নতুন; নাম-বদল; মোছা', async () => {
  const S = fresh();
  const a = await S.save(tpl('ক'));
  await new Promise((r) => setTimeout(r, 3));
  const a2 = await S.save(Object.assign({}, a, { name: 'খ' }));
  assert.equal(a2.id, a.id);
  assert.equal(a2.createdAt, a.createdAt);
  assert.ok(a2.updatedAt > a.updatedAt);
  assert.equal((await S.rename(a.id, ' গ ')).name, 'গ');
  await assert.rejects(S.rename(a.id, '  '), { code: 'INVALID' });
  await assert.rejects(S.rename('নেই', 'x'), { code: 'NOT_FOUND' });
  await S.remove(a.id);
  assert.equal((await S.list()).length, 0);
  assert.equal(await S.get(a.id), null);
});

test('যাচাই: নাম/নকশা না থাকলে, ৪ পাতার বেশি হলে সেভ হয় না', async () => {
  const S = fresh();
  await assert.rejects(S.save(tpl('')), { code: 'INVALID' });
  await assert.rejects(S.save({ name: 'x', ir: { pages: [] } }), { code: 'INVALID' });
  await assert.rejects(S.save(tpl('বড়', 5)), (e) => e.code === 'INVALID' && /৪ পাতা/.test(e.message));
  assert.ok((await S.save(tpl('চার', 4))).id);
  assert.deepEqual(TS.validate(tpl('ঠিক')), []);
});

test('সীমা: ৫০টির পরে নতুন নয় (হালনাগাদ চলে)', async () => {
  const S = fresh();
  let first;
  for (let i = 0; i < TS.LIMITS.maxTemplates; i++) { const r = await S.save(tpl('ছাঁচ ' + i)); if (!i) first = r; }
  await assert.rejects(S.save(tpl('৫১তম')), (e) => e.code === 'LIMIT' && /৫০/.test(e.message));
  assert.ok(await S.save(Object.assign({}, first, { name: 'বদলানো' })), 'পুরোনোটির হালনাগাদ সীমায় আটকায় না');
});

test('রপ্তানি → অন্য কম্পিউটারে আমদানি: নকশা/স্লট/থাম্ব হুবহু, নতুন id', async () => {
  const A = fresh();
  const a = await A.save(tpl('জীবনবৃত্তান্ত', 2));
  const b = await A.save(tpl('মেমো'));
  const one = await A.exportFile(a.id);
  assert.equal(one.filename, 'জীবনবৃত্তান্ত.fayzar-template');
  const both = await A.exportFile([a.id, b.id]);
  assert.equal(both.filename, 'আমার-টেমপ্লেট-২টি.fayzar-template');
  const B = fresh();
  const res = await B.importFile(both.text);
  assert.equal(res.added.length, 2);
  assert.equal(res.skipped.length, 0);
  const got = await B.get(res.added.find((x) => x.name === 'জীবনবৃত্তান্ত').id);
  assert.notEqual(got.id, a.id, 'নতুন id');
  assert.deepEqual(got.ir, a.ir);
  assert.deepEqual(got.slots, a.slots);
  assert.equal(got.thumb, a.thumb);
  assert.equal(got.createdAt, a.createdAt);
});

test('আমদানি: একই নাম থাকলে "(২)" যোগ, কখনো ওপরে লেখা নয়; খারাপ ফাইল/নতুন সংস্করণ/ভুল ছাঁচ', async () => {
  const S = fresh();
  const a = await S.save(tpl('প্যাড'));
  const f = await S.exportFile(a.id);
  const r = await S.importFile(f.text);
  assert.equal(r.added[0].name, 'প্যাড (২)');
  assert.equal((await S.list()).length, 2);
  assert.equal((await S.get(a.id)).name, 'প্যাড', 'আগেরটি অক্ষত');
  await assert.rejects(S.importFile('not json'), { code: 'BAD_FILE' });
  await assert.rejects(S.importFile(JSON.stringify({ format: 'other', templates: [] })), { code: 'BAD_FILE' });
  await assert.rejects(S.importFile(JSON.stringify({ format: 'fayzar-template', formatVersion: 99, templates: [] })), { code: 'NEWER' });
  const mixed = JSON.stringify({ format: 'fayzar-template', formatVersion: 1, templates: [tpl('ভালো'), tpl('বড়', 6), { name: 'খালি' }] });
  const m = await S.importFile(mixed);
  assert.deepEqual(m.added.map((x) => x.name), ['ভালো']);
  assert.deepEqual(m.skipped.map((x) => x.name), ['বড়', 'খালি']);
});

test('আমদানি সীমায় থামে (৫০টির বেশি নয়)', async () => {
  const S = fresh();
  for (let i = 0; i < 49; i++) await S.save(tpl('ছ' + i));
  const file = JSON.stringify({ format: 'fayzar-template', formatVersion: 1, templates: [tpl('নতুন ১'), tpl('নতুন ২'), tpl('নতুন ৩')] });
  const r = await S.importFile(file);
  assert.equal(r.added.length, 1);
  assert.equal(r.skipped.length, 1, 'সীমায় পৌঁছে থামা');
  assert.equal(r.skipped[0].reason.includes('৫০'), true);
  assert.equal((await S.list()).length, 50);
});

test('ডিফল্ট ভান্ডার IndexedDB না থাকলে স্পষ্ট ত্রুটি দেয় (Node)', async () => {
  await assert.rejects(TS.list(), { code: 'NO_IDB' });
});
