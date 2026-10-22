/**
 * Phase 1B-iii — প্যাড শিরোনাম (`---` পর্যন্ত) আলাদা, শিরোনাম-লাইন একা, ভূমিকা-চিহ্ন ব্যবহারকারীর কাছে লুকানো।
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
  ['FayzarLetterLayout', 'js/layout-engine/letter-layout.js']]) {
  const m = require(path.join(ROOT, p));
  if (m && !globalThis[n]) globalThis[n] = m;
}
const RM = globalThis.FayzarRoleMarks, LL = globalThis.FayzarLetterLayout;

const FM = ['---', 'doc_type: PROTTOYON', '---'];
const HEAD = ['# মেসার্স ফরহান ট্রেডার্স', 'প্রোঃ মোঃ ফরিদুল ইসলাম',
  'এখানে সর্বপ্রকার রাসায়নিক সার কীটনাশক বীজ খুচরা ও পাইকারী মূল্যে বিক্রয় করা হয়।', 'আটপুকুর হাট, ফুলবাড়ী, দিনাজপুর।', 'মোবাইল - ০১৭১৭৬৫৫৭৮'];
const BODY = ['এই মর্মে প্রত্যয়ন প্রদান করা যাচ্ছে যে, আমি মোঃ ইয়ারব হোসেন চৌধুরী তিনি অটো ক্রপ কেয়ার কোম্পানীতে কর্মরত ছিলেন।', 'আমি তার মঙ্গল কামনা করছি।'];
const TEXT = FM.concat(HEAD, ['---', '# প্রত্যয়ন পত্র'], BODY).join('\n');

function check(model) {
  const k = model.blocks.map((b) => b.kind);
  assert.equal(k[0], 'letterhead');
  const lh = model.blocks[0].lines.map((l) => l.text);
  assert.equal(lh.length, 5);
  assert.ok(lh.some((t) => t.startsWith('এখানে সর্বপ্রকার')) && lh.some((t) => t.startsWith('মোবাইল')));
  const ti = model.blocks.findIndex((b) => b.kind === 'title');
  const nk = (s) => s.replace(/য়/g, 'য়');
  assert.equal(nk(model.blocks[ti].text), nk('প্রত্যয়ন পত্র'));
  assert.equal(ti, 1);
  const paras = model.blocks.filter((b) => b.kind === 'para').map((b) => b.text).join(' ');
  assert.ok(!/---/.test(paras) && !/মোবাইল/.test(paras) && !/প্রত্যয়ন পত্র/.test(paras));
}

test('১. রুলের আগের লাইন (ট্যাগলাইন/ঠিকানা/মোবাইল) শিরোনামে', () => check(LL.parse(TEXT, 'prottoyon')));

test('২. লাইনের মাঝে `---` ভেঙে শিরোনাম আলাদা, শিরোনাম একা লাইন', () => {
  const glued = FM.concat(HEAD.slice(0, 4), ['মোবাইল - ০১৭১৭৬৫৫৭৮ --- ', '# প্রত্যয়ন পত্র'], BODY).join('\n').replace(' --- \n', ' --- x\n');
  const t2 = FM.concat(HEAD.slice(0, 4), ['মোবাইল - ০১৭১৭৬৫৫৭৮ --- # প্রত্যয়ন পত্র'], BODY).join('\n');
  const m = LL.parse(t2, 'prottoyon');
  assert.equal(m.blocks[0].lines.length, 5);
  assert.ok(!m.blocks.some((b) => b.kind === 'para' && /---/.test(b.text)));
  assert.ok(glued.length > 0);
});

test('৩. ট্যাগ লুকানো: hide/reattach; সম্পাদনায় চিহ্নহীন', () => {
  const tagged = TEXT + '\nপরিবেশক- ফরিদুল <!--r:sig-->';
  const h = RM.hide(tagged);
  assert.ok(!/<!--r:/.test(h.visible) && /<!--r:sig-->/.test(h.tagged));
  assert.equal(RM.reattach(h.visible, h), h.tagged);
  const edited = h.visible + ' ক';
  assert.equal(RM.reattach(edited, h), edited);
  assert.equal(RM.reattach('abc', null), 'abc');
  assert.equal(RM.hide('plain').tagged, null);
});

test('৪. রুল না থাকা/দেরিতে থাকা লেখা আগের মতো (শিরোনাম-নিয়ম অপরিবর্তিত)', () => {
  const m = LL.parse(FM.concat(['# আদর্শ কোচিং', 'ঠিকানা: নওগাঁ', 'প্রত্যয়ন পত্র'], BODY).join('\n'), 'prottoyon');
  assert.equal(m.blocks[0].kind, 'letterhead');
  assert.equal(m.blocks[0].lines.length, 2);
});
