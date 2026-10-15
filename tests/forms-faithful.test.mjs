/**
 * হুবহু-মোড ফরম-শক্তিবৃদ্ধি (২০২৬-১০-১২, as-is নমুনা f1 অনলাইন-ফরম, a03 পেনশন-ফরম):
 *  - foldBoxRows: লেবেল|মান ছকে সংখ্যা-বাক্স-সারি ⇒ ২ কলাম (বাক্স মান-ঘরে চিহ্ন), রেডিও-লাইন ⇒ আগের মান-ঘরে
 *  - mergeLineRows: কলাম-সংখ্যা ভিন্ন হলে জোড়া নয় (হালকা সারি-রেখা না ধরা ফরম)
 *  - builder: বাক্স-চিহ্ন ⇒ ঘরের ভেতরে ছোট টেবিল; rowWeights ⇒ লাইন-অনুপাতে সারি-উচ্চতা
 *  - darkBandMask: কালো ব্যান্ডের সাদা লেখা উল্টো মাস্কে (মাত্রা-সারি বাদ পড়ে না, ভেতরের হালকা রেখা লেখা নয়)
 *   node --test tests/forms-faithful.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const G = require(path.join(ROOT, 'js/layout-engine/faithful/page-geometry.js'));
const D = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const FORM = [
  ['প্রতিষ্ঠান সংক্রান্ত তথ্য', ''],
  ['মোবাইল নম্বর *', '0', '1', '', '', '', '', '', '', '', '', ''],
  ['EIIN *', ''],
  ['স্তর', '○ নিম্ন মাধ্যমিক'],
  ['○ মাধ্যমিক'],
  ['○ উচ্চ মাধ্যমিক'],
  ['জেলা', '']
];

test('foldBoxRows: বাক্স-সারি ⇒ ২ কলাম + চিহ্ন; রেডিও-লাইন আগের মান-ঘরে; সাধারণ ছক বদলায় না', () => {
  const f = IR.foldBoxRows(FORM);
  assert.equal(f.length, 5);
  assert.ok(f.every((r) => r.length === 2));
  assert.equal(f[1][1], IR.BOX_MARK + ['0', '1', '', '', '', '', '', '', '', '', ''].join(IR.BOX_SEP));
  assert.equal(f[3][1], '○ নিম্ন মাধ্যমিক\n○ মাধ্যমিক\n○ উচ্চ মাধ্যমিক');
  assert.equal(IR.foldBoxRows([['ক', 'খ', 'গ'], ['ঘ', 'ঙ', 'চ'], ['১', '২', '৩'], ['a', 'b', 'c']]), null, '৩-কলামের আসল ছক');
  assert.equal(IR.foldBoxRows([['নাম', 'রহিম'], ['পদ', 'প্রধান'], ['ফোন', '017'], ['ঠিকানা', 'ঢাকা']]), null, 'বাক্স/রেডিও নেই');
  assert.equal(IR.foldBoxRows([['নাম', 'রহিম'], ['মোট', '১২৩৪', '৫৬৭', 'বেশি লেখা', 'ক', 'খ'], ['পদ', 'প্রধান'], ['○ হ্যাঁ']]), null, 'লম্বা ঘর থাকলে বাক্স-সারি নয়');
});

test('mergeLineRows: কলাম-সংখ্যা ভিন্ন ⇒ জোড়া নয়', () => {
  assert.equal(IR.mergeLineRows([['ক', 'খ'], ['গ'], ['ঘ', 'ঙ'], ['চ', 'ছ']], { hasGrid: true, hRulesPt: [0, 40, 80] , textLinesPt: [10, 20, 50, 60] }), null);
});

test('builder: বাক্স-চিহ্ন ⇒ ভেতরের টেবিল (প্রতি ঘরে একটি বাক্স); rowWeights ⇒ লাইন-অনুপাতে "অন্তত" উচ্চতা', () => {
  const f = IR.foldBoxRows(FORM);
  const item = { kind: 'table', rows: f, fontPt: 10, widthPt: 400, heightPt: 140, colAligns: ['l', 'l'], rowWeights: [1, 1, 1, 3, 1] };
  const xml = D.paraXml(item, 0, { media: [] });
  assert.ok(!xml.includes('\u0001') && !xml.includes('\u0002'), 'চিহ্ন লেখায় ফাঁস নয়');
  assert.equal((xml.match(/<w:tbl>/g) || []).length, 2, 'বাইরের + বাক্সের টেবিল');
  const inner = xml.slice(xml.indexOf('<w:tbl>', 10));
  assert.equal((inner.match(/<w:gridCol /g) || []).length, 11, '১১টি বাক্স');
  const hs = [...xml.matchAll(/<w:trHeight w:val="(\d+)" w:hRule="(\w+)"/g)].map((m) => [+m[1], m[2]]);
  assert.equal(hs.length, 5);
  assert.ok(hs.every((h) => h[1] === 'atLeast'));
  // ২০২৬-১০-১৩: সীমানাওয়ালা "অন্তত" সারি থেকে বর্ডারের ০.৭৫pt (১৫ twip) বাদ লেখা হয় (Word যোগ করে) ⇒ যোগ করে অনুপাত
  assert.ok(Math.abs((hs[3][0] + 15) / (hs[0][0] + 15) - 3) < 0.05, 'রেডিও-সারি তিনগুণ');
});

test('tabify: লেবেল : মান — অনুপাতে ভাগ কোলনের পরে পড়লেও ভাগ কোলনে', () => {
  // ছোট প্রথম অংশ হলেও (অনুপাতে "Father’s Name : Md." | "Golap Hossin" হতো)
  const r = IR.tabify(['➤ Father’s Name : Md. Golap Hossin'], [[{ x: 0, w: 120 }, { x: 140, w: 60 }]]);
  assert.equal(r.lines[0], '➤ Father’s Name :\tMd. Golap Hossin', 'একা কোলন অনুপাতের দিকে; রূপ পরে alignTabStops এক করে');
  const r2 = IR.tabify(['Name: Rahim Uddin'], [[{ x: 0, w: 20 }, { x: 80, w: 70 }]]);
  assert.equal(r2.lines[0], 'Name:\tRahim Uddin');
});

test('alignTabStops: পরপর ব্যান্ডে কোলন এক রূপে (সমতায় "\\t: "), স্টপ এক; ঠিকানার পরের লাইন ট্যাবে; শিক্ষাগত তালিকায় ফাঁকা ট্যাব ভরাট', () => {
  const P = (tabLines, stop) => ({ kind: 'para', tabLines, tabStops: [stop] });
  // "লেবেল :\t" ২টি বনাম "\t: মান" ২টি (সমতা) ⇒ "\t: "
  const a = P(['Name :\tRahim'], 100), b = P(['Father’s Name\t: Karim'], 108), c = P(['Address :\tVill : X,', 'P.S : Sadar'], 104);
  b.tabLines.push('Mother’s Name\t: Rahima');
  const d = P(['Univ : National', 'Board\t: Rajshahi', 'Result\t: 5.00'], 90);
  const page = { bands: [a, b, c].map((it) => ({ cells: [{ x0: 72, items: [it] }] })).concat([{ cells: [{ x0: 72, items: [{ kind: 'para', lines: ['Heading'] }] }] }, { cells: [{ x0: 72, items: [d] }] }]) };
  IR.alignTabStops(page);
  // দুই-স্টপ (২০২৬-১০-১২): "লেবেল\t:\tমান" — কোলন আর মান দুটোই রুলারে লক; মান-স্টপ = কোলন-স্টপ + ০.৭em
  assert.deepEqual([a, b, c].map((x) => x.tabLines[0]), ['Name\t:\tRahim', 'Father’s Name\t:\tKarim', 'Address\t:\tVill : X,']);
  assert.equal(c.tabLines[1], '\t\tP.S : Sadar');
  assert.deepEqual([a, b, c].map((x) => x.tabStops), [[108, 116.4], [108, 116.4], [108, 116.4]]);
  assert.equal(d.tabLines[0], 'Univ\t:\tNational');
});

test('alignTabStops: "লেবেল :\\tমান" সংখ্যাগরিষ্ঠ হলেও কোলন আলাদা কলামে (সিভি fresh2); পরের ট্যাবহীন লাইন মানের কলামে; builder দুই স্টপ লেখে', () => {
  const P = (tabLines, stop) => ({ kind: 'para', fontPt: 10, indentPt: 10, tabLines, tabStops: [stop] });
  const a = P(['Name :\tRahim'], 100), b = P(['Age :\t30'], 102), c = P(['Address :\tVill : X,'], 101);
  // ঠিকানার দ্বিতীয় লাইন Gemini আলাদা item দেয় (ট্যাবহীন, মানের নিচে শুরু) ⇒ "\t\t", দলের অংশ
  const cont = { kind: 'para', fontPt: 10, indentPt: 108, lines: ['P.S : Sadar'] };
  const d = P(['Sex\t: Male'], 101);
  // মানের কলাম থেকে দূরে শুরু হওয়া ট্যাবহীন লাইন (শিরোনাম) দল ভাঙে, বদলায় না
  const head = { kind: 'para', fontPt: 10, indentPt: 10, lines: ['Name of University : National'] };
  IR.alignTabStops({ bands: [a, b, c, cont, d, head].map((it) => ({ cells: [{ x0: 0, items: [it] }] })) });
  assert.deepEqual([a, b, c, d].map((x) => x.tabLines[0]), ['Name\t:\tRahim', 'Age\t:\t30', 'Address\t:\tVill : X,', 'Sex\t:\tMale']);
  assert.deepEqual(a.tabStops, [102, 109]);
  assert.deepEqual(cont.tabLines, ['\t\tP.S : Sadar']);
  assert.deepEqual(cont.tabStops, [102, 109]);
  assert.equal(cont.indentPt, 10);
  assert.equal(head.tabLines, undefined);
  // সিভি (মালিকের স্ক্রিনশট ২): দলের আগে/পরে ট্যাবহীন "লেবেল : মান" (একই ইনডেন্ট, লেবেল কোলন-কলামের আগে শেষ) ⇒ দলে
  const K = (t, w) => ({ kind: 'para', fontPt: 10, indentPt: 10, lines: [t], rect: { x: 10, y: 0, w, h: 12 } });
  const u = K('Name of University : National University', 190), v = K('Name of Institution : Dinajpur Govt. College', 200);
  const long = K('A very long label that passes the colon column : X', 250);
  const e = P(['Discipline\t: Philosophy'], 100), f = P(['Passing Year :\t2016'], 100);
  const w2 = K('Remark : Good', 60);
  const kvPage = { bands: [long, u, v, e, f, w2].map((it) => ({ cells: [{ x0: 0, items: [it] }] })) };
  IR.alignTabStops(kvPage);
  assert.deepEqual([u, v, e, f, w2].map((it) => it.tabLines[0]), ['Name of University\t:\tNational University', 'Name of Institution\t:\tDinajpur Govt. College', 'Discipline\t:\tPhilosophy', 'Passing Year\t:\t2016', 'Remark\t:\tGood']);
  assert.deepEqual(u.tabStops, [100, 107]);
  assert.equal(long.tabLines, undefined, 'লেবেল কোলন-কলাম পেরোলে বদলায় না');
  const x = P(['Name\t:\tRahim'], 108); x.tabStops = [108, 116.4];
  const xml = D.paraXml(x, 0, { media: [] });
  assert.match(xml, /<w:tabs><w:tab w:val="left" w:pos="2160"\/><w:tab w:val="left" w:pos="2328"\/><\/w:tabs>/);
  assert.equal((xml.match(/<w:tab\/>/g) || []).length, 2, 'লাইনে দুটি ট্যাব');
});

test('unifyMargins: পুরো ফাইলে এক; ডান ≤ বাঁ; নিচ = ওপর তবে কালি-ফাঁকের বেশি নয়; প্রচলিত মানে', () => {
  const pg = (m, bottomInk) => ({ page: { widthPt: 595, heightPt: 842, margins: m }, items: [{ rect: { x: 80, y: 100, w: 300, h: 842 - bottomInk - 100 } }] });
  const s = [pg({ top: 59, left: 210, right: 70, bottom: 36 }, 80), pg({ top: 57, left: 56.5, right: 90, bottom: 36 }, 75)];
  IR.unifyMargins(s);
  assert.deepEqual(s[0].page.margins, { top: 56.7, left: 56.7, right: 56.7, bottom: 56.7 }, 'কালি-ফাঁক ৭৫ ≥ ওপর+১৪ ⇒ নিচ = ওপর');
  assert.deepEqual(s[1].page.margins, s[0].page.margins);
  const t = [pg({ top: 72, left: 72, right: 72, bottom: 36 }, 40)];
  IR.unifyMargins(t);
  assert.equal(t[0].page.margins.bottom, 36, 'কালি-ফাঁক ৪০ (< ওপর+১৪) ⇒ আগের নিরাপদ ৩৬');
  const u = [pg({ top: 22, left: 25, right: 20, bottom: 36 }, 30)];
  IR.unifyMargins(u);
  assert.equal(u[0].page.margins.right, 18, 'বাঁ/ডান প্রচলিত মানে শুধু কমে (২০ ⇒ ১৮, ২১.৬ নয়)');
  assert.equal(u[0].page.margins.bottom, 28, 'ফাঁক ৩০ ⇒ নিচ ২৮ (উপচাবে না)');
});

test('darkBandMask: কালো ব্যান্ডের সাদা লেখা কালি; মাত্রা-সারি (কম গাঢ়) বাদ পড়ে না; সাদা পাতায় null', () => {
  const W = 200, H = 100, data = new Uint8ClampedArray(W * H * 4).fill(255);
  const px = (x, y, v) => { const i = (y * W + x) * 4; data[i] = data[i + 1] = data[i + 2] = v; };
  for (let y = 30; y < 60; y++) for (let x = 10; x < 190; x++) px(x, y, 20);         // ব্যান্ড
  for (let x = 40; x < 170; x++) if ((x - 40) % 32 < 28) px(x, 38, 255);             // মাত্রা: শব্দের ফাঁকে ভাঙা, মোট ~৬৩% সাদা (<৫০% গাঢ়)
  for (let x = 12; x < 188; x++) px(x, 55, 255);                                     // ব্যান্ডের ভেতরের টানা হালকা রেখা
  for (let y = 39; y < 50; y++) for (let x = 40; x < 170; x += 6) { px(x, y, 255); px(x + 1, y, 255); }   // অক্ষরের খাড়া দাগ
  const img = { width: W, height: H, data };
  const box = [380, 50, 520, 950];
  const m = G.darkBandMask(img, box);
  assert.ok(m, 'ব্যান্ড পাওয়া গেল');
  assert.equal(m.mask[38 * W + 90], 1, 'ভাঙা মাত্রা-সারি লেখা (বাদ পড়ে না)');
  assert.equal(m.mask[55 * W + 100], 0, 'টানা হালকা রেখা লেখা নয়');
  assert.equal(m.mask[45 * W + 40], 1, 'অক্ষরের দাগ কালি');
  assert.equal(m.mask[45 * W + 43], 0, 'ব্যান্ডের গাঢ় অংশ কালি নয়');
  const white = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4).fill(255) };
  assert.equal(G.darkBandMask(white, box), null);
});
