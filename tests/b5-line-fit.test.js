'use strict';

// WORK_PLAN B5 gates — হুবহু-লেআউট লাইন-আঁটানো (line-fit) আর রেখা-লাইনের leader-ট্যাব (builder)।
// চালানো: node tests/b5-line-fit.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));

let gates = 0;
const check = (cond, name) => { assert.ok(cond, name); gates++; };
// নকল মাপ: প্রতি অক্ষর ৫০px (১০০px আকারে) ⇒ ১২pt-এ প্রতি অক্ষর ৬pt
const measure = (t) => String(t).length * 50;
const para = (o) => Object.assign({ kind: 'para', fontPt: 12, lines: ['x'.repeat(60)], keepLines: false, align: 'l', indentPt: 0 }, o);

// ১) আঁটে ⇒ কিছুই বদলায় না
const a = para({ lines: ['x'.repeat(50)], indentPt: 20 });
check(LF.fitItem(a, 400, measure) === null && a.indentPt === 20 && a.fontPt === 12, 'fitting line untouched');

// ২) ইনডেন্ট কমালেই আঁটে (g01 ধরন: ঘর ৩৯৯, লেখা ৩৬০, ইনডেন্ট ৩৫) ⇒ ফন্ট অপরিবর্তিত
const b = para({ indentPt: 35 });
const fb = LF.fitItem(b, 399, measure);
check(fb && b.fontPt === 12 && b.indentPt < 35 && 360 + b.indentPt <= 399 * 0.98 + 0.01, 'indent reduced, font kept');

// ৩) কেন্দ্র-সরণ কমে, দিক থাকে
const c = para({ align: 'c', centerShiftPt: -20 });
LF.fitItem(c, 380, measure);
check(c.centerShiftPt <= 0 && 360 + 2 * Math.abs(c.centerShiftPt) <= 380 * 0.98 + 0.01 && c.fontPt === 12, 'center shift reduced, sign kept');

// ৪) ডান-ইনডেন্ট
const r = para({ align: 'r', rightIndentPt: 50 });
LF.fitItem(r, 400, measure);
check(r.rightIndentPt <= 400 * 0.98 - 360 + 0.01 && r.fontPt === 12, 'right indent reduced');

// ৫) পুরো প্রস্থেও না আঁটলে ফন্ট ছোট (০.৫ ধাপে), কিন্তু ৮৫%-এর নিচে নয়
const d = para({ indentPt: 10 });
LF.fitItem(d, 340, measure);
check(d.indentPt === 0 && d.fontPt < 12 && d.fontPt >= 12 * 0.85 && d.fontPt * 30 <= 340 * 0.98 + 0.01, 'font shrinks to fit full width');
const e = para({ lines: ['x'.repeat(120)] });
LF.fitItem(e, 300, measure);
check(e.fontPt >= 12 * 0.85 - 0.5 && e.fit && e.fit.fontFrom === 12, 'shrink limited to 85%');

// ৬) বাদ: প্রবাহিত বহু-লাইন, ট্যাব-লাইন, সমীকরণ, রেখা-লাইন, টেবিল
check(LF.fitItem(para({ lines: ['x'.repeat(60), 'y'.repeat(60)] }), 300, measure) === null, 'flowing multi-line paragraph skipped');
check(LF.fitItem(para({ tabLines: ['a\tb'] }), 100, measure) === null, 'tab lines skipped');
check(LF.fitItem(para({ lines: ['$x^2$' + 'x'.repeat(60)] }), 100, measure) === null, 'equations skipped');
check(LF.fitItem(para({ lines: ['─'.repeat(90)] }), 100, measure) === null, 'rule lines skipped (leader tab handles them)');
check(LF.fitItem({ kind: 'table', fontPt: 12, rows: [['x'.repeat(90)]] }, 100, measure) === null, 'tables skipped');

// ৭) হাতে-ভাঙা লাইন: সবচেয়ে চওড়া লাইন ধরে
const k = para({ keepLines: true, lines: ['x'.repeat(30), 'x'.repeat(62)], indentPt: 30 });
LF.fitItem(k, 390, measure);
check(372 + k.indentPt <= 390 * 0.98 + 0.01, 'keepLines uses the widest line');

// ৭খ) পূরণ-সারি আগে ছোট হয়, ফন্ট/ইনডেন্ট নয়
const f = para({ lines: ['নাম: ' + '.'.repeat(70)], indentPt: 10 });
LF.fitItem(f, 300, measure);
check(f.fontPt === 12 && f.indentPt === 10 && f.lines[0].startsWith('নাম: ') && f.lines[0].length * 6 <= 300 * 0.98 - 10 + 0.01 && f.fit.fillsCut === 1, 'fill run shortened, font and indent kept');

// ৮) পুরো নকশা
const ir = { pages: [{ bands: [{ kind: 'grid', cells: [{ x0: 25, x1: 424, items: [para({ indentPt: 35 }), para({ lines: ['ok'] })] }] }] }] };
check(LF.fit(ir, measure) === 1, 'fit() counts changed items only');

// ৯) builder: রেখা-লাইন ⇒ মাপা প্রস্থে leader-ট্যাব, কোনো রেখা-অক্ষর নয়
globalThis.FayzarExportDualEngine = undefined;
const D = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));
const page = (items) => ({ page: 1, widthPt: 595, heightPt: 842, margins: { top: 36, left: 36, right: 36, bottom: 36 },
  bands: [{ kind: 'flow', y0: 36, y1: 100, cells: [{ x0: 36, x1: 559, items }] }] });
const x = D.bodyXml({ pages: [page([para({ lines: ['─'.repeat(90)], rect: { x: 46, y: 40, w: 300, h: 5 }, indentPt: 10 })])] }).xml;
check(/w:leader="underscore"/.test(x) && !/─/.test(x) && /w:pos="6180"/.test(x), 'rule line → underscore leader tab at measured width');
const x2 = D.bodyXml({ pages: [page([para({ keepLines: true, lines: ['-'.repeat(40), '.'.repeat(30)], rect: { x: 46, y: 40, w: 200, h: 20 } })])] }).xml;
check((x2.match(/<w:tab w:val="right" w:leader="(hyphen|dot)"/g) || []).length === 2, 'each rule line its own paragraph, leader by character');

console.log(`B5 line-fit: ${gates} passed`);
