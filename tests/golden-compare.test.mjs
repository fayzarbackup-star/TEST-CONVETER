// WORK_PLAN A4: সোনালি-তুলনা (qa/golden/compare-truth.mjs) — নিজের সাথে ১০০, বিকৃতিতে কমে, বিজয় রান ইউনিকোড হয়।
import test from 'node:test';
import assert from 'node:assert/strict';
import { compare, norm } from '../qa/golden/compare-truth.mjs';
import { finalize, isBijoyRun } from '../qa/golden/finalize-golden.mjs';

const P = (n, page, y, t, size = 12, b = 0, extra = {}) => Object.assign({ n, page, x: 72, y, yEnd: y, lines: 1, inTable: false, al: 0, runs: [{ t, font: 'Kalpurush', size, b, i: 0, u: 0, color: 0 }] }, extra);
const doc = (paras, tables = [], pages = 1) => finalize({ pages, page: { w: 595, h: 842, orient: 0 }, paragraphs: paras, tables, shapes: [] });
const tbl = (rows, cols, widths, texts) => ({ n: 1, rows, cols, page: 1, x: 72, y: 300, cells: texts.map((t, k) => ({ row: Math.floor(k / cols) + 1, col: (k % cols) + 1, w: widths[k % cols], h: 20, t, shading: -16777216 })) });

const base = () => doc([P(1, 1, 72, 'বিষয়: ছুটির আবেদন', 14, 1), P(2, 1, 100, 'আমি আপনার বিদ্যালয়ের দশম শ্রেণির ছাত্র।'), P(3, 1, 130, 'নাম: .................')],
  [tbl(2, 2, [100, 300], ['ক্রমিক', 'বিবরণ', '১', 'খাতা'])]);

test('নিজের সাথে তুলনা = ১০০', () => {
  const t = base();
  assert.equal(compare(t, t).score, 100);
});

test('অবস্থান, আকার, টেবিল বিকৃত হলে স্কোর কমে ও মেট্রিক ঠিক', () => {
  const t = base();
  const o = doc([P(1, 1, 92, 'বিষয়: ছুটির আবেদন', 12, 0), P(2, 1, 120, 'আমি আপনার বিদ্যালয়ের দশম শ্রেণির ছাত্র।'), P(3, 1, 150, 'নাম: ....')],
    [tbl(2, 2, [200, 200], ['ক্রমিক', 'বিবরণ', '১', 'খাতা'])], 2);
  const m = compare(t, o);
  assert.equal(m.pos.dyMedian, 20);
  assert.equal(m.pages.ok, false);
  assert.equal(m.tables.gridOk, 1);
  assert.ok(m.tables.widthErr > 0.2);
  assert.ok(m.text.recall > 0.95, 'ফাঁকা-রেখার বিন্দু-সংখ্যা লেখার মিলে গোনা হয় না');
  assert.ok(m.score < 85 && m.score > 40, 'score=' + m.score);
});

test('বিজয় রান ইউনিকোডে রূপান্তর; ইউনিকোড/ইংরেজি অপরিবর্তিত', () => {
  assert.equal(isBijoyRun('SutonnyMJ', 'Avgvi'), true);
  assert.equal(isBijoyRun('SutonnyOMJ', 'আমার'), false);
  assert.equal(isBijoyRun('Times New Roman', 'Hello'), false);
  const f = finalize({ pages: 1, page: { w: 595, h: 842 }, paragraphs: { n: 1, page: 1, x: 0, y: 0, runs: { t: 'Avgvi', font: 'SutonnyMJ', size: 12 } }, tables: [], shapes: [] });
  assert.equal(f.paragraphs[0].t, 'আমার');
  assert.equal(f.summary.bijoyShare, 1);
  assert.equal(norm(' নাম : .... '), 'নাম');
});
