/**
 * হুবহু-মোড ফরম্যাট-শক্তিবৃদ্ধি (২০২৬-১০-১১, নমুনা g41 = ইংরেজি সিভি: ধূসর অংশ-পটি, রেফারেন্স-ছক, সই-ছবি, ইটালিক লেবেল, 2^{nd}):
 *  - ছক: শুধু ওপর-নিচের সীমানা ⇒ Gemini-র লাইন-সারি এক সারির বহু-লাইনের ঘর (mergeLineRows)
 *  - সই: অর্থহীন লেখা ("cccccccccc") ⇒ ছবি (isScribble); সই-রেখা "_____" লেখাই থাকে
 *  - পটি: লেখার পেছনের রং (blockShade) — পাতার পটভূমির তুলনায়; গাঢ় পটিতে সাদা লেখা
 *  - চিহ্ন: **মোটা**, *বাঁকা*, ^{উপরে} ⇒ আলাদা রান (runsFor); অনুচ্ছেদ-ছায়া / লেখা-ছায়া (pPr, shadeRun)
 *  - লাইনে-বসানো: পাতার নিচে Gemini-র জমা সরণে শিকল এক লাইন নিচে সরে না (snapBoxesToLines-এর পুনরাবৃত্ত পূর্বাভাস)
 *   node --test tests/g41-faithful-format.test.mjs
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
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));

test('mergeLineRows: ওপর-নিচ সীমানা মাত্র ⇒ ১ সারি, ঘরে লাইনগুলো \\n দিয়ে; জাল না থাকলে বা ব্যান্ড = সারি হলে বদল নয়', () => {
  const rows = [['1. Rahim', '2. Karim'], ['Manager', 'Professor'], ['Cell : 017', 'Cell : 018']];
  assert.deepEqual(IR.mergeLineRows(rows, { hasGrid: true, hRulesPt: [100, 160] }), [['1. Rahim\nManager\nCell : 017', '2. Karim\nProfessor\nCell : 018']]);
  assert.equal(IR.mergeLineRows(rows, { hasGrid: false, hRulesPt: [100, 160] }), null, 'সীমানাহীন ছক নয়');
  assert.equal(IR.mergeLineRows(rows, { hasGrid: true, hRulesPt: [100, 120, 140, 160] }), null, 'প্রতিটি সারির নিজের রেখা');
  // দুই ব্যান্ড: লাইন-কেন্দ্র দিয়ে বণ্টন (শিরোনাম-সারি + বহু-লাইনের সারি)
  const r2 = [['Name', 'Post'], ['Rahim', 'Head'], ['(acting)', '']];
  assert.deepEqual(IR.mergeLineRows(r2, { hasGrid: true, hRulesPt: [0, 20, 60], textLinesPt: [10, 30, 45] }), [['Name', 'Post'], ['Rahim\n(acting)', 'Head']]);
  assert.equal(IR.mergeLineRows(r2, { hasGrid: true, hRulesPt: [0, 20, 60], textLinesPt: [10, 30] }), null, 'লাইন-কেন্দ্র সংখ্যায় না মিললে অনুমান নয়');
  // কলাম ধরে পড়া (g41 নতুন ক্যাপচার): মাঝের একটি লাইনেই '|' ⇒ কলাম ১ = তার আগ পর্যন্ত, কলাম ২ = বাকি
  const cm = [['1. Rahim'], ['Manager'], ['Cell : 017', '2. Karim'], ['Professor'], ['Cell : 018']];
  assert.deepEqual(IR.mergeLineRows(cm, { hasGrid: true, hRulesPt: [100, 160] }), [['1. Rahim\nManager\nCell : 017', '2. Karim\nProfessor\nCell : 018']]);
  // প্রথম সারিতেই '|', বাকিগুলো এক-ঘরের ⇒ অনিশ্চিত (f1 ফরমে এমন সারি জোড়া দিলে ছক ভেঙে যেত) ⇒ বদল নয়
  assert.equal(IR.mergeLineRows([['A', 'B'], ['a2'], ['a3']], { hasGrid: true, hRulesPt: [100, 160] }), null);
});

test('বহু-লাইনের ট্যাব-ব্লক ⇒ প্রতি লাইনে আলাদা অনুচ্ছেদ; পরের লাইনে প্রথম-লাইন-ইনডেন্ট নয়', () => {
  const xml = D.paraXml({ kind: 'para', fontPt: 12, tabLines: ['Board\t: Rajshahi', 'Result\t: GPA 5'], tabStops: [100], indentPt: 10, firstIndentPt: 20 }, 0, { media: [] });
  assert.equal((xml.match(/<w:p>/g) || []).length, 2);
  assert.ok(!/w:firstLine/.test(xml.split('</w:p>')[1]), 'দ্বিতীয় লাইনে প্রথম-লাইন-ইনডেন্ট নয়');
});

test('isScribble: হাতের সই ⇒ ছবি; সই-রেখা/বিন্দু, আসল নাম ⇒ লেখা', () => {
  assert.equal(IR.isScribble('cccccccccc'), true);
  assert.equal(IR.isScribble('xjkwrtzq'), true);
  assert.equal(IR.isScribble('____________'), false);
  assert.equal(IR.isScribble('..............'), false);
  assert.equal(IR.isScribble('Md. Mahfuzul Haque'), false);
  assert.equal(IR.isScribble('(মোঃ হায়দার গনি)'), false);
  const it = IR.toItem({ type: 'signature', box: [800, 100, 830, 300], lines: ['cccccccccc'], text: 'cccccccccc' }, null);
  assert.equal(it.kind, 'figure');
  assert.equal(IR.toItem({ type: 'signature', box: [800, 100, 830, 300], lines: ['__________'], text: '__________' }, null).kind, 'para');
});

// কৃত্রিম ছবি (RGBA): সাদা পাতায় ধূসর পটি + কালো লেখা-দাগ, আর একটি কালো ব্যান্ডে সাদা লেখা
function img(W, H, paint) { const data = new Uint8ClampedArray(W * H * 4).fill(255); paint((x, y, v) => { const i = (y * W + x) * 4; data[i] = v[0]; data[i + 1] = v[1]; data[i + 2] = v[2]; }); return { width: W, height: H, data }; }
test('blockShade: ধূসর পটি ⇒ রং; সাদা পটভূমি ⇒ null; কালো ব্যান্ড ⇒ dark; ধূসর কাগজের স্ক্যানে ভুয়া ছায়া নয়', () => {
  const W = 400, H = 400;
  const im = img(W, H, (set) => {
    for (let y = 100; y < 120; y++) for (let x = 40; x < 360; x++) set(x, y, [211, 211, 211]);          // ধূসর পটি
    for (let y = 104; y < 116; y++) for (let x = 50; x < 150; x += 3) set(x, y, [0, 0, 0]);             // পটিতে লেখা
    for (let y = 200; y < 212; y++) for (let x = 50; x < 150; x += 3) set(x, y, [0, 0, 0]);             // সাদায় লেখা
    for (let y = 300; y < 320; y++) for (let x = 40; x < 200; x++) set(x, y, (x % 7 === 0 ? [255, 255, 255] : [0, 0, 0]));   // কালো ব্যান্ড, সাদা লেখা
  });
  const box = (y0, y1, x0, x1) => [y0 / H * 1000, x0 / W * 1000, y1 / H * 1000, x1 / W * 1000];
  const pageL = G.pageBackground(im);
  assert.equal(pageL, 255);
  assert.deepEqual(G.blockShade(im, box(101, 119, 41, 359), { pageL }), { fill: 'D3D3D3', dark: false });
  assert.equal(G.blockShade(im, box(198, 214, 41, 359), { pageL }), null);
  assert.equal(G.blockShade(im, box(301, 319, 41, 199), { pageL }).dark, true);
  // পুরো পাতা ধূসর কাগজ (স্ক্যান) ⇒ পটভূমিও ধূসর ⇒ ছায়া নয়
  const grey = img(200, 200, (set) => { for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) set(x, y, [228, 228, 228]); for (let y = 50; y < 62; y++) for (let x = 20; x < 120; x += 3) set(x, y, [0, 0, 0]); });
  assert.equal(G.blockShade(grey, [240, 50, 320, 650], { pageL: G.pageBackground(grey) }), null);
});

test('runsFor: **মোটা**, *বাঁকা*, ^{উপরে}, একসাথে **2^{nd} Class** — চিহ্ন লেখায় থাকে না', () => {
  const x = D.runsFor('*Name of University* : **2^{nd} Class**', { fontPt: 12 });
  assert.doesNotMatch(x, /\*|\^\{/);
  assert.match(x, /<w:i\/>[\s\S]*Name of University/);
  assert.match(x, /<w:vertAlign w:val="superscript"\/>[\s\S]*?>nd</);
  assert.match(x, /<w:b\/>[\s\S]*Class/);
  assert.equal(D.runsFor('5 * 3 * 2', { fontPt: 12 }).includes('5 * 3 * 2'), true, 'গুণচিহ্ন (ফাঁকসহ) ইটালিক নয়');
});

test('ছায়া: পূর্ণ-প্রস্থ পটি ⇒ অনুচ্ছেদ-ছায়া (pPr-এ tabs-এর আগে); shadeRun ⇒ লেখা-ছায়া; গাঢ় পটিতে সাদা লেখা', () => {
  const p = D.pPr({ kind: 'para', fontPt: 12, shade: 'D3D3D3', align: 'l' }, 0);
  assert.match(p, /<w:pPr><w:shd w:val="clear" w:color="auto" w:fill="D3D3D3"\/>/);
  assert.doesNotMatch(D.pPr({ kind: 'para', fontPt: 12, shade: '000000', shadeRun: true }, 0), /w:shd/);
  const r = D.runsFor('ক্যাশ মেমো', { fontPt: 14, shade: '000000', shadeRun: true, color: 'FFFFFF' });
  assert.match(r, /<w:color w:val="FFFFFF"\/><w:sz /);
  assert.match(r, /<w:shd w:val="clear" w:color="auto" w:fill="000000"\/>(<w:lang[^>]*\/>)?<\/w:rPr>/);
  // layout-ir: মাঝে-বসানো, বক্স লেখার কাছাকাছি ⇒ shadeRun; চওড়া বক্স ⇒ অনুচ্ছেদ
  const tight = IR.toItem({ type: 'heading', box: [0, 400, 20, 600], lines: ['ক্যাশ মেমো'], align: 'c' }, { rectPt: { x: 0, y: 0, w: 80, h: 12 }, geminiPt: { w: 100 }, align: 'c', shade: { fill: '000000', dark: true } });
  assert.equal(tight.shadeRun, true); assert.equal(tight.color, 'FFFFFF');
  const wide = IR.toItem({ type: 'heading', box: [0, 120, 20, 870], lines: ['Career Objective'], align: 'l' }, { rectPt: { x: 0, y: 0, w: 90, h: 12 }, geminiPt: { w: 450 }, align: 'l', shade: { fill: 'D3D3D3', dark: false } });
  assert.equal(wide.shadeRun, undefined); assert.equal(wide.shade, 'D3D3D3');
});

test('line-fit: চিহ্ন (*বাঁকা*, ^{উপরে}) মাপে ধরা হয় না', () => {
  const measure = (s) => s.length * 50;   // অক্ষরপ্রতি ৫০px @১০০px
  const it = { kind: 'para', fontPt: 10, lines: ['*ab* ^{c}'], align: 'l' };
  assert.equal(LF.fitItem(it, 1000, measure), null, '"ab c" = ৪ অক্ষর ⇒ আঁটে');
});

test('snapBoxesToLines: Gemini-র ধাপ আসলের চেয়ে বড় (নিচে জমা ভুল ≈১.৫ লাইন) ⇒ প্রতিটি ব্লক নিজের লাইনে, ক্রম অক্ষত', () => {
  // কৃত্রিম মাস্ক: ১০টি লেখার লাইন, আসল ধাপ ২০px; Gemini-র বক্স ধাপ ২৩px (ক্রমে সরে যায়)
  const W = 600, H = 1000, mask = new Uint8Array(W * H);
  const lineY = Array.from({ length: 10 }, (_, k) => 100 + k * 20);
  lineY.forEach((y) => { for (let yy = y; yy < y + 10; yy++) for (let x = 60; x < 400; x++) if (x % 9) mask[yy * W + x] = 1; });
  const m = { W, H, mask };
  const comps = G.components(m, null, 4);
  const blocks = lineY.map((y, k) => { const gy = 100 + k * 23; return { i: k, type: 'list_item', lines: ['x'], box: [gy / H * 1000, 50 / W * 1000, (gy + 10) / H * 1000, 420 / W * 1000] }; });
  const out = G.snapBoxesToLines(m, comps, blocks);
  const got = blocks.map((b) => (out[b.i] ? Math.round(out[b.i][0] / 1000 * H) : null));
  got.forEach((y, k) => assert.ok(y != null && Math.abs(y - (lineY[k] - 1)) <= 2, `ব্লক ${k}: ${y} বনাম ${lineY[k]}`));
});
