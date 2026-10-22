/**
 * Phase 1B-ii (fix 1.3) — OCR-র হালকা ভূমিকা-চিহ্ন <!--r:..--> : হাতে-লেখা T01-ধাঁচের লেখা, Gemini ছাড়া।
 * চিহ্নহীন পুরোনো লেখায় আউটপুট হুবহু আগের মতো; চিহ্ন-সহ লেখায় স্বাক্ষর/সিল ডানে-নিচে, মার্জিন-নোট ছোট।
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const [n, p] of [['FayzarLayoutUnits', 'js/layout-engine/layout-units.js'], ['CqBookletPlanner', 'js/layout-engine/cq-booklet-planner.js'],
  ['FayzarRoleMarks', 'js/layout-engine/role-marks.js'], ['FayzarApplicationLayout', 'js/layout-engine/application-layout.js'],
  ['FayzarLetterLayout', 'js/layout-engine/letter-layout.js'], ['FayzarCertificateLayout', 'js/layout-engine/certificate-layout.js']]) {
  const m = require(path.join(ROOT, p));
  if (m && !globalThis[n]) globalThis[n] = m;
}
const RM = globalThis.FayzarRoleMarks, LL = globalThis.FayzarLetterLayout, CT = globalThis.FayzarCertificateLayout, AL = globalThis.FayzarApplicationLayout;

const PLAIN = [
  '---', 'doc_type: PROTTOYON', '---',
  '# আদর্শ কোচিং সেন্টার', 'ঠিকানা: মেইন রোড, নওগাঁ', 'মোবাইল: ০১৭০০-০০০০০০', 'প্রত্যয়ন পত্র',
  'এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, রাহিম উদ্দিন আমাদের প্রতিষ্ঠানের একজন নিয়মিত ছাত্র ছিল।',
  'তার সুস্বাস্থ্য ও উজ্জ্বল ভবিষ্যৎ কামনা করি।',
  'সিল', '(মোঃ করিম)', 'প্রধান শিক্ষক'
].join('\n');
const TAGGED = PLAIN.replace('সিল', 'সিল <!--r:stamp-->').replace('(মোঃ করিম)', '(মোঃ করিম) <!--r:sig-->').replace('প্রধান শিক্ষক', 'প্রধান শিক্ষক <!--r:sig-->');

test('চিহ্নহীন লেখা: extract অপরিবর্তিত, মডেল হুবহু আগের', () => {
  const ex = RM.extract(PLAIN);
  assert.equal(ex.text, PLAIN); assert.equal(ex.count, 0);
  assert.deepEqual(LL.parse(PLAIN, 'prottoyon'), LL.parse(PLAIN, 'prottoyon'));
  assert.equal(RM.gate(PLAIN), PLAIN);
});

test('চিহ্ন-সহ লেখা: চিহ্ন মুছে একই লেখা; স্বাক্ষর-ব্লকে সিল সহ ডানে', () => {
  assert.equal(RM.strip(TAGGED), PLAIN);
  const m = LL.parse(TAGGED, 'prottoyon');
  const sig = m.blocks.find((b) => b.kind === 'signature');
  assert.ok(sig, 'signature block');
  assert.deepEqual(sig.groups, [['সিল', '(মোঃ করিম)', 'প্রধান শিক্ষক']]);
  assert.ok(!JSON.stringify(m).includes('<!--'));
  // প্যাড-শিরোনাম আগের মতোই শিরোনাম থাকে
  assert.equal(m.blocks[0].kind, 'letterhead');
});

test('sideL/sideR: দুই-গ্রুপ পাশাপাশি স্বাক্ষর', () => {
  const one = PLAIN.replace('সিল', 'সিল <!--r:stamp,sideL-->').replace('(মোঃ করিম)', '(মোঃ করিম) <!--r:sig,sideR-->');
  assert.equal(LL.parse(one, 'prottoyon').blocks.find((b) => b.kind === 'signature').groups.length, 1, 'সিল একা পাশে ⇒ টেবিল নয়');
  const t = PLAIN.replace('সিল', 'সিল <!--r:sig,sideL-->').replace('(মোঃ করিম)', '(মোঃ করিম) <!--r:sig,sideR-->').replace('প্রধান শিক্ষক', 'প্রধান শিক্ষক <!--r:sig-->');
  const sig = LL.parse(t, 'prottoyon').blocks.find((b) => b.kind === 'signature');
  assert.equal(sig.groups.length, 2);
  assert.deepEqual(sig.groups[0], ['সিল']);
  assert.deepEqual(sig.groups[1], ['(মোঃ করিম)', 'প্রধান শিক্ষক']);
});

test('note: মার্জিন-নোট আলাদা ছোট ব্লক, মূল লেখায় নয়', () => {
  const t = PLAIN.replace('তার সুস্বাস্থ্য', 'নোট: কপি সংরক্ষিত <!--r:note-->\nতার সুস্বাস্থ্য');
  const m = LL.parse(t, 'prottoyon');
  const nb = m.blocks.find((b) => b.small);
  assert.deepEqual(nb.lines, ['নোট: কপি সংরক্ষিত']);
  assert.ok(!m.blocks.some((b) => b.kind === 'para' && /কপি সংরক্ষিত/.test(b.text || '')));
});

test('সনদ ও আবেদন পার্সে চিহ্ন লিক করে না', () => {
  const c = CT.parse(TAGGED);
  assert.ok(!JSON.stringify(c).includes('<!--'));
  const a = AL.parse('বরাবর,\nপ্রধান শিক্ষক\nবিষয়: ছুটির আবেদন\nজনাব,\nআমি ছুটি চাই।\nবিনীত নিবেদক,\nরহিম <!--r:sig-->');
  assert.ok(!JSON.stringify(a).includes('<!--'));
});

test('gate: অন্য doc_type-এ চিহ্ন মুছে যায়, PROTTOYON-এ থাকে', () => {
  assert.ok(RM.gate(TAGGED).includes('<!--r:'));
  assert.ok(!RM.gate(TAGGED.replace('PROTTOYON', 'EXAM_GENERAL')).includes('<!--r:'));
});
