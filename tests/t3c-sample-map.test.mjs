/**
 * T3c (docs/T3_PLAN.md §৪ স্তর ২) — Gemini-ম্যাপ: কখন কল, প্রম্পট-ডেটা, উত্তর-যাচাই, ক্যাশ, ব্যর্থতায় স্থানীয় ম্যাপ।
 * আসল কল নয় — নকল request (executeGeminiRequest-এর একই স্বাক্ষর)।
 *   node --test tests/t3c-sample-map.test.mjs
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ST = require(path.join(ROOT, 'js/layout-engine/sample-template.js'));

const P = (type, lines, extra = {}) => Object.assign({ kind: 'para', type, lines, text: lines.join('\n'), fontPt: 13, align: 'l', keepLines: lines.length > 1, rect: null }, extra);
const page = (items) => ({ page: 1, widthPt: 595, heightPt: 842, margins: { top: 40, right: 40, bottom: 40, left: 50 }, bands: [{ kind: 'flow', cells: [{ x0: 50, x1: 555, items }] }] });
// নুক্তা এক রূপে (মডিউল য়/ড়/ঢ় যুক্ত-রূপে রাখে)
const N = (s) => String(s).replace(/য়/g, 'য়').replace(/ড়/g, 'ড়').replace(/ঢ়/g, 'ঢ়');
const txt = (ir) => ir.pages[0].bands[0].cells[0].items.map((it) => N(it.kind === 'table' ? it.rows.map((r) => r.join('|')).join('/') : (it.tabLines || it.lines).join('/')));

// আবেদনের মতো: প্রাপক-ঠিকানা, মূল লেখা (২ অনুচ্ছেদ), স্বাক্ষর, টেবিল
const APP = { pages: [page([
  P('title', ['নমুনা উচ্চ বিদ্যালয়'], { align: 'c' }),
  P('paragraph', ['বরাবর,', 'প্রধান শিক্ষক', 'আগের বিদ্যালয়']),
  P('paragraph', ['আগের আবেদনের প্রথম অনুচ্ছেদ যা অনেক লম্বা।'], { align: 'j' }),
  P('paragraph', ['আগের আবেদনের দ্বিতীয় অনুচ্ছেদ।'], { align: 'j' }),
  P('paragraph', ['বিনীত নিবেদক', 'আগের আবেদনকারী']),
  { kind: 'table', type: 'table', rows: [['নাম', 'পদ'], ['আগের', 'সভাপতি']], fontPt: 12, widthPt: 400 }
])] };
// খসড়া: স্বাক্ষর আগে (ক্রম আলাদা), মূল লেখা ৩ অনুচ্ছেদ (নমুনায় ২) ⇒ স্থানীয়ভাবে মূল লেখা মেলে না ⇒ Gemini
const DRAFT = `বিনীত নিবেদক
রহিমা খাতুন

বরাবর,
প্রধান শিক্ষক
নমুনা উচ্চ বিদ্যালয়

সবিনয় নিবেদন এই যে, আমি আপনার বিদ্যালয়ের ছাত্রী।

আমার পারিবারিক কারণে ছুটি প্রয়োজন।

অতএব তিন দিনের ছুটি মঞ্জুর করতে মর্জি হয়।

| নাম | পদ |
|---|---|
| করিম | সদস্য |
`;

const tpl = ST.toTemplate(APP);
beforeEach(() => ST._clearMapCache());

test('স্থানীয় প্রথম-লাইন মিল: খসড়ায় স্বাক্ষর আগে এলেও "বরাবর,"/"বিনীত নিবেদক" ঠিক স্লটে; টেবিলও', () => {
  const parts = ST.splitContent(DRAFT);
  const local = ST.matchLocal(tpl.slots, parts);
  const at = (re) => tpl.slots.find((s) => re.test(s.sampleText)).id;
  const pt = (re) => parts.find((p) => re.test(p.text || '')).id;
  assert.equal(local.map[at(/বরাবর/)], pt(/বরাবর/));
  assert.equal(local.map[at(/নিবেদক/)], pt(/রহিমা/));
  assert.ok(local.map[tpl.slots.find((s) => s.kind === 'table').id]);
  assert.deepEqual(local.unmatchedSlots.length, 2, 'মূল লেখার ২ স্লট (৩ অংশের সাথে সংখ্যা মেলে না)');
  assert.equal(local.unusedParts.length, 3);
});

test('কখন কল: অব্যবহৃত অংশ আর প্রার্থী স্লট দুটোই থাকলে; সব স্থানীয়ভাবে মিললে কল নয়', async () => {
  const parts = ST.splitContent(DRAFT);
  const local = ST.matchLocal(tpl.slots, parts);
  assert.equal(ST.needsRemote(tpl.slots, parts, local), true);
  let calls = 0;
  const r = await ST.mapWithGemini(tpl, ST.splitContent('নমুনা উচ্চ বিদ্যালয়'), ST.matchLocal(tpl.slots, ST.splitContent('নমুনা উচ্চ বিদ্যালয়')), { request: async () => { calls++; return '{}'; } });
  assert.equal(r.called, false);
  assert.equal(calls, 0);
});

test('প্রম্পট-ডেটা: শুধু প্রার্থী (আগে-মেলানো স্লট/অংশ নয়), নমুনা-লেখা ছোট করে; নির্দেশে "শুধু JSON", "লেখা বদল নয়", স্থির-নিয়ম', () => {
  const parts = ST.splitContent(DRAFT);
  const local = ST.matchLocal(tpl.slots, parts);
  const { prompt, data } = ST.buildMapPrompt(tpl.slots, parts, local);
  assert.match(prompt, /JSON only/);
  assert.match(prompt, /Never write, translate or change any text/);
  assert.match(prompt, /role "fixed"/);
  const d = JSON.parse(data.replace(/^DATA:\n/, ''));
  for (const id of Object.keys(local.map)) assert.ok(!d.slots.some((s) => s.id === id), 'মেলানো স্লট নয়: ' + id);
  for (const p of d.parts) assert.ok(local.unusedParts.includes(p.id));
  assert.ok(d.slots.every((s) => s.sample.length <= 91));
  assert.ok(data.length < 2500, 'ছোট অনুরোধ');
});

test('উত্তর-যাচাই: অচেনা id, এক অংশ দুবার, টেবিল↔লেখা, JSON-নয় — বাদ; ```json বেড়া সহ্য', () => {
  const parts = ST.splitContent(DRAFT);
  const local = ST.matchLocal(tpl.slots, parts);
  const c = ST.mapCandidates(tpl.slots, parts, local);
  const [para, para2] = c.slots.filter((s) => s.kind === 'para');
  const pText = c.parts.find((p) => p.kind === 'para');
  assert.ok(para && para2 && pText);
  const ans = '```json\n' + JSON.stringify({ map: { [para.id]: pText.id, s99: pText.id, [para2.id]: pText.id } }) + '\n```';
  const r = ST.parseMap(ans, tpl.slots, parts, local);
  assert.deepEqual(r.map, { [para.id]: pText.id });
  assert.deepEqual(r.rejected.map((x) => x.reason), ['unknown_id', 'part_twice']);
  assert.equal(ST.parseMap('দুঃখিত, পারছি না', tpl.slots, parts, local).rejected[0].reason, 'not_json');
  // আগে-মেলানো স্লটে Gemini কিছু দিলে বাদ
  const someMapped = Object.keys(local.map)[0];
  if (someMapped) assert.equal(ST.parseMap(JSON.stringify({ map: { [someMapped]: pText.id } }), tpl.slots, parts, local).map[someMapped], undefined);
});

test('টেবিল-স্লটে লেখা-অংশ / লেখা-স্লটে টেবিল-অংশ ⇒ বাদ', () => {
  const parts = ST.splitContent('শুধু অনুচ্ছেদ\n\n| ক | খ |\n|---|---|\n| ১ | ২ |');
  const local = { map: {}, present: [], unusedParts: parts.map((p) => p.id), unmatchedSlots: [] };
  const tblSlot = tpl.slots.find((s) => s.kind === 'table'), paraSlot = tpl.slots.find((s) => s.kind === 'para');
  const r = ST.parseMap(JSON.stringify({ map: { [tblSlot.id]: 'p1', [paraSlot.id]: 'p2' } }), tpl.slots, parts, local);
  assert.deepEqual(r.map, {});
  assert.deepEqual(r.rejected.map((x) => x.reason), ['table_mismatch', 'table_mismatch']);
});

test('পূর্ণ পথ (নকল Gemini): ম্যাপমতো পূরণ, না-ম্যাপ অংশ ক্রমমতো অতিরিক্তে, স্থির শিরোনাম অক্ষত, আগের তথ্য নেই', async () => {
  const parts = ST.splitContent(DRAFT);
  const local = ST.matchLocal(tpl.slots, parts);
  const c = ST.mapCandidates(tpl.slots, parts, local);
  const R = (re) => new RegExp(N(re.source));
  const by = (re) => c.parts.find((p) => R(re).test(N(p.text || '')));
  const slot = (re) => c.slots.find((s) => R(re).test(N(s.sampleText)));
  // Gemini: প্রথম অনুচ্ছেদ → প্রথম স্লট, শেষ অনুচ্ছেদ ("অতএব") → দ্বিতীয় স্লট; মাঝেরটি বাকি
  const fake = { map: { [slot(/প্রথম অনুচ্ছেদ/).id]: by(/^সবিন/).id, [slot(/দ্বিতীয় অনুচ্ছেদ/).id]: by(/^অতএব/).id } };
  let seen = null;
  const r = await ST.composeAsync(tpl, DRAFT, { request: async (key, media, onStream, prompt, extra) => { seen = { media, prompt, extra }; return JSON.stringify(fake); } });
  assert.deepEqual(seen.media, [], 'শুধু লেখা, কোনো ছবি নয়');
  assert.match(seen.extra, /^DATA:/);
  assert.equal(r.remote.called, true);
  const t = txt(r.ir);
  assert.deepEqual(t, [
    'নমুনা উচ্চ বিদ্যালয়',
    'বরাবর,/প্রধান শিক্ষক/নমুনা উচ্চ বিদ্যালয়',
    'সবিনয় নিবেদন এই যে, আমি আপনার বিদ্যালয়ের ছাত্রী।',
    'আমার পারিবারিক কারণে ছুটি প্রয়োজন।',          // অতিরিক্ত: খসড়ায় আগের অংশ ("সবিনয়")-এর স্লটের ঠিক পরে
    'অতএব তিন দিনের ছুটি মঞ্জুর করতে মর্জি হয়।',
    'বিনীত নিবেদক/রহিমা খাতুন',
    'নাম|পদ/করিম|সদস্য'
  ].map(N));
  assert.equal(r.report.extras.length, 1);
});

test('ক্যাশ: একই ছাঁচ+খসড়ায় দ্বিতীয়বার কল নয়', async () => {
  let calls = 0;
  const req = async () => { calls++; return '{"map":{}}'; };
  await ST.composeAsync(tpl, DRAFT, { request: req });
  const r2 = await ST.composeAsync(tpl, DRAFT, { request: req });
  assert.equal(calls, 1);
  assert.equal(r2.remote.cached, true);
});

test('ব্যর্থতা (নেটওয়ার্ক / JSON-নয়): কাজ থামে না — স্থানীয় ম্যাপ + অতিরিক্ত, সতর্কবার্তা; খসড়ার লেখা হারায় না', async () => {
  for (const req of [async () => { throw new Error('503'); }, async () => 'not json']) {
    ST._clearMapCache();
    const r = await ST.composeAsync(tpl, DRAFT, { request: req });
    assert.ok(r.report.warnings.some((w) => w.kind === 'map_failed'));
    const all = txt(r.ir).join('\n');
    for (const w of ['রহিমা খাতুন', 'সবিনয় নিবেদন', 'অতএব তিন দিনের', 'করিম']) assert.ok(all.includes(N(w)), w);
    assert.doesNotMatch(all, /আগের আবেদনের|আগের আবেদনকারী/, 'ব্যর্থ হলেও আগের তথ্য নয়');
  }
  const off = await ST.composeAsync(tpl, DRAFT, { remote: false });
  assert.equal(off.remote.called, false);
});

test('T3d setRole: দলনেতা বা যমজ — দুটোই বদলায়, auto-চিহ্ন ওঠে; ভুল role/id-তে কিছু নয়', () => {
  const slots = [{ id: 's1', role: 'var', auto: 'letterhead' }, { id: 's2', role: 'var', twinOf: 's1', auto: 'letterhead' }, { id: 's3', role: 'var' }];
  assert.equal(ST.setRole(slots, 's2', 'fixed'), 2);
  assert.deepEqual(slots.map((s) => s.role), ['fixed', 'fixed', 'var']);
  assert.equal(slots[0].auto, undefined);
  assert.equal(ST.setRole(slots, 's3', 'x'), 0);
  assert.equal(ST.setRole(slots, 'নেই', 'var'), 0);
});

test('T3d রেডিমেড-প্রস্তাব: ধরন + লেখা দেখে; প্রশ্নপত্র/অজানায় প্রস্তাব নয়', () => {
  const TC = require(path.join(ROOT, 'js/layout-engine/template-composer.js'));
  const R = TC.REGISTRY;
  const id = (info) => (ST.suggestReadymade(info, R) || {}).id || null;
  assert.equal(id({ docType: 'CV_RESUME', text: 'CURRICULUM VITAE Name Father' }), 'cv-english');
  assert.equal(id({ docType: 'CV_RESUME', text: 'জীবন বৃত্তান্ত নাম পিতার নাম' }), 'cv-bangla');
  assert.equal(id({ docType: 'CASH_MEMO', text: 'ক্যাশ মেমো', slots: [{ id: 's1' }, { id: 's2', twinOf: 's1' }] }), 'memo-2up');
  assert.equal(id({ docType: 'CASH_MEMO', text: 'ক্যাশ মেমো', slots: [] }), 'memo-1up');
  assert.equal(id({ docType: 'CASH_MEMO', text: 'টাকা প্রাপ্তির রসিদ' }), 'receipt');
  assert.equal(id({ docType: 'PROTTOYON', text: 'ইউনিয়ন পরিষদ প্রত্যয়ন' }), 'prottoyon-up');
  assert.equal(id({ docType: 'PROTTOYON', text: 'সরকারি প্রাথমিক বিদ্যালয়' }), 'prottoyon-school');
  assert.equal(id({ docType: 'GOVT_APP', text: 'সহকারী শিক্ষক পদে নিয়োগের আবেদন' }), 'app-job');
  assert.equal(id({ docType: 'EXAM_CQ', text: 'প্রশ্ন' }), null);
  assert.equal(id({ docType: undefined, text: '' }), null);
});

test('ইঞ্জিন না থাকলে (Node) কল নয়, স্থানীয়ভাবেই', async () => {
  const r = await ST.composeAsync(tpl, DRAFT, {});
  assert.equal(r.remote.error, 'no_engine');
  assert.ok(r.report.warnings.some((w) => w.kind === 'map_failed'));
});
