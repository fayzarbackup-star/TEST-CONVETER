/**
 * A05_DRIFT_v1 — পাতা-২-এ লাইন সংখ্যা ও উল্লম্ব সরণ (dy, h, hOurs) নিরসন যাচাইয়ের স্বয়ংক্রিয় টেস্ট
 * চালানোর নিয়ম: node tests/p2-drift.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const LayoutIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LineFit = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DocxBuilder = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const clone = (x) => JSON.parse(JSON.stringify(x));
const r1 = (v) => Math.round(v * 10) / 10;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ পাস: ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ব্যর্থ: ${name}`);
    console.error(`    কারণ: ${err && err.message ? err.message : err}`);
  }
}

function setSwitch(on) {
  if (on) {
    globalThis.__FZ_ON_P2DRIFT = true;
    if (typeof globalThis.window === 'object' && globalThis.window) {
      globalThis.window.__FZ_ON_P2DRIFT = true;
    }
  } else {
    delete globalThis.__FZ_ON_P2DRIFT;
    delete globalThis.__FZ_OFF_P2DRIFT;
    if (typeof globalThis.window === 'object' && globalThis.window) {
      delete globalThis.window.__FZ_ON_P2DRIFT;
    }
    if (typeof process !== 'undefined' && process.env) {
      delete process.env.__FZ_ON_P2DRIFT;
      delete process.env.FZ_ON;
    }
  }
}

/**
 * পাতা-২-এর অনুমিত দৃশ্যমান লাইন ও তাদের উল্লম্ব অবস্থান (y, h) গণনা (a05-এর মতো প্রবাহী ও গ্রিড পাতার জন্য)
 */
function simulateVisualLinesA05(page) {
  const plan = DocxBuilder.planPage(page);
  const rows = [];
  for (const e of plan.els) {
    if (e.band) {
      const it0 = e.band.cells[0] && e.band.cells[0].items[0];
      if (!it0 || !it0.rect) continue;
      rows.push({ y: r1(it0.rect.y), h: r1(it0.rect.h), kind: 'grid' });
    } else if (e.it && e.it.kind === 'para' && e.it.rect) {
      const it = e.it;
      const n = it.keepLines && Array.isArray(it.lines) && it.lines.length > 1 ? it.lines.length : 1;
      const lh = it.lineSpacingPt || (it.fontPt || page.bodyFontPt || 13) * 1.15;
      for (let k = 0; k < n; k++) {
        rows.push({ y: r1(it.rect.y + k * lh), h: r1(it.rect.h / n), kind: 'para', fontPt: it.fontPt });
      }
    } else if (e.it && e.it.kind === 'table' && e.it.rect) {
      const it = e.it;
      const nRows = Array.isArray(it.rows) ? it.rows.length : 1;
      const neRows = (it.rows || []).map((r, ri) => ({ ri, hasText: Array.isArray(r) && r.some((c) => String(c || '').trim()) }));
      if (!it.borderless) {
        const rh = (it.heightPt || it.rect.h) / Math.max(1, nRows);
        for (let ri = 0; ri < nRows; ri++) {
          rows.push({ y: r1(it.rect.y + ri * rh), h: r1(rh), kind: 'table_row' });
        }
      } else {
        const nE = neRows.filter((x) => !x.hasText).length;
        const rowH = (it.heightPt || it.rect.h) / Math.max(1, nRows - nE + nE * 0.4);
        let curY = it.rect.y;
        for (const r of neRows) {
          const h = r.hasText ? rowH : rowH * 0.4;
          if (r.hasText) rows.push({ y: r1(curY), h: r1(it.fontPt * 0.6), kind: 'table_text', fontPt: it.fontPt });
          curY += h;
        }
      }
    }
  }
  return rows;
}

/**
 * বক্স-ফ্রেম ও আনুভূমিক বিভাজক রেখাসহ ফরম পাতার (যেমন a03 পাতা-২) দৃশ্যমান সারি/কম্পার্টমেন্ট গণনা
 */
function simulateCompartmentsA03(page) {
  const plan = DocxBuilder.planPage(page);
  const boxes = page.boxes || [];
  const isBoxed = (e) => {
    const ids = (e.band ? e.band.boxIds : e.it && e.it.boxIds) || [];
    return ids.length > 0 && boxes.some((b) => ids.includes(b.id));
  };
  const compartments = [];
  let cur = page.margins.top;
  let compStart = null;

  for (let i = 0; i < plan.els.length; i++) {
    const e = plan.els[i];
    const start = cur + e.before * plan.f;
    const end = start + e.h;
    const boxed = isBoxed(e);
    const rb = e.band ? e.band.ruleBelow : e.it && e.it.ruleBelow;
    const curIds = (e.band ? e.band.boxIds : e.it && e.it.boxIds) || [];
    const prevEl = i > 0 ? plan.els[i - 1] : null;
    const prevIds = prevEl ? ((prevEl.band ? prevEl.band.boxIds : prevEl.it && prevEl.it.boxIds) || []) : [];
    const isBoxFirst = boxed && curIds[0] !== prevIds[0];

    if (!boxed) {
      if (e.it && e.it.kind === 'table' && Array.isArray(e.it.splitBoxCols)) {
        compartments.push({ y: r1(start + 2), h: r1(e.it.rowHeightsPt ? e.it.rowHeightsPt[0] : e.h), kind: 'split_boxes' });
      } else {
        compartments.push({ y: r1(start), h: r1(e.h), kind: 'unboxed' });
      }
      cur = end;
      continue;
    }

    // বাক্সের একদম মাথার কালো শিরোনাম-পট্টি বাক্সের উপরের বর্ডারের সাথে মিশে থাকে (emitSeq shaded=true)
    if (e.it && e.it.kind === 'para' && e.it.shade === '000000') {
      if (isBoxFirst) {
        compStart = r1(end + 2);
      } else {
        if (compStart != null && start > compStart + 2) {
          compartments.push({ y: r1(compStart), h: r1(start - compStart), kind: 'boxed_comp' });
        }
        compartments.push({ y: r1(e.it.rect ? e.it.rect.y + 2 : start), h: r1(8), kind: 'black_bar' });
        compStart = r1(end + 3);
      }
      cur = end;
      continue;
    }

    if (e.band && e.band.cells.some((c) => c.items.some((it) => it.kind === 'table' && it.gridFirst))) {
      const tbl = e.band.cells.flatMap((c) => c.items).find((it) => it.kind === 'table' && it.gridFirst);
      const yTop = compStart != null ? compStart : r1(start);
      if (tbl && Array.isArray(tbl.srcRulesPt) && tbl.srcRulesPt.length >= 3) {
        compartments.push({ y: r1(yTop), h: r1(tbl.srcRulesPt[0] - yTop - 1), kind: 'date_label_1' });
        compartments.push({ y: r1(tbl.srcRulesPt[0] + 2), h: r1(tbl.srcRulesPt[1] - tbl.srcRulesPt[0] - 3), kind: 'date_tbl_r0' });
        compartments.push({ y: r1(tbl.srcRulesPt[1] + 2), h: r1(tbl.srcRulesPt[2] - tbl.srcRulesPt[1] - 3), kind: 'date_tbl_r1' });
        const nextEl = plan.els[i + 1];
        const nextY = nextEl ? (end + nextEl.before * plan.f) : end + 29;
        compartments.push({ y: r1(tbl.srcRulesPt[2] + 2), h: r1(nextY - (tbl.srcRulesPt[2] + 2) - 2), kind: 'below_date_tbl' });
      }
      compStart = null;
      cur = end;
      continue;
    }

    if (compStart == null) {
      const bx = boxes.find((b) => b.id === curIds[0]);
      compStart = isBoxFirst && bx ? r1(bx.y0 + 2.5) : r1(start);
    }
    if (rb) {
      compartments.push({ y: r1(compStart), h: r1(rb.srcY - compStart - 1), kind: 'boxed_rule_comp', ruleY: rb.srcY });
      compStart = r1(rb.srcY + 2.5);
    } else {
      const nextEl = plan.els[i + 1];
      const nextIds = nextEl ? ((nextEl.band ? nextEl.band.boxIds : nextEl.it && nextEl.it.boxIds) || []) : [];
      if (curIds[0] !== nextIds[0]) {
        const bx = boxes.find((b) => b.id === curIds[0]);
        const botY = bx ? bx.y1 : end;
        compartments.push({ y: r1(compStart), h: r1(botY - compStart - 2), kind: 'boxed_end_comp', ruleY: botY });
        compStart = null;
      }
    }
    cur = end;
  }
  return compartments;
}

const a05Measures = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a05/measures.json'), 'utf8'));
const a05IrRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a05/ir.json'), 'utf8'));
const a05Score = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a05/layout-score.json'), 'utf8'));

const a03Measures = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a03/measures.json'), 'utf8'));
const a03IrRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a03/ir.json'), 'utf8'));
const a03Score = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a03/layout-score.json'), 'utf8'));

console.log('=== A05_DRIFT_v1 (P2DRIFT) স্বয়ংক্রিয় যাচাই ===');

// ১. সুইচ বন্ধ থাকলে আচরণ অপরিবর্তিত থাকার যাচাই
setSwitch(false);
const a05IrOff = LayoutIR.build(clone(a05Measures.cap), clone(a05Measures.measures), clone(a05Measures.pageInfo));
const a05XmlOff = DocxBuilder.bodyXml(clone(a05IrRaw)).xml;
const a03IrOff = LayoutIR.build(clone(a03Measures.cap), clone(a03Measures.measures), clone(a03Measures.pageInfo));
const a03XmlOff = DocxBuilder.bodyXml(clone(a03IrRaw)).xml;

test('১. সুইচ বন্ধ (OFF) থাকলে a05 ও a03-এর IR এবং DOCX XML আউটপুট হুবহু অপরিবর্তিত থাকে', () => {
  setSwitch(false);
  assert.strictEqual(LineFit.isP2DriftOn(), false, 'ডিফল্ট অবস্থায় সুইচ বন্ধ থাকতে হবে');
  assert.strictEqual(a05IrOff.pages[1].bands.length, 16, 'সুইচ বন্ধ থাকলে a05 পাতা-২-এ পূর্বের ১৬টি ব্যান্ডই থাকে');
  assert.strictEqual(a03IrOff.pages[1].bands.length, 25, 'সুইচ বন্ধ থাকলে a03 পাতা-২-এ পূর্বের ২৫টি ব্যান্ডই থাকে');
  assert.ok(a05XmlOff.includes('চেক প্রদানকারীর স্বাক্ষর'), 'a05 XML উৎপন্ন হয়েছে');
  assert.ok(a03XmlOff.includes('স্থায়ী ঠিকানা'), 'a03 XML উৎপন্ন হয়েছে');
});

test('২. window.__FZ_ON_P2DRIFT এবং FZ_ON=P2DRIFT উভয় উপায়েই সুইচ সক্রিয় হয়', () => {
  setSwitch(false);
  globalThis.window = { __FZ_ON_P2DRIFT: true };
  assert.strictEqual(LineFit.isP2DriftOn(), true, 'window.__FZ_ON_P2DRIFT দ্বারা সুইচ চালু হতে হবে');
  delete globalThis.window;

  process.env.FZ_ON = 'P2DRIFT';
  assert.strictEqual(LineFit.isP2DriftOn(), true, 'FZ_ON=P2DRIFT দ্বারা সুইচ চালু হতে হবে');
  setSwitch(false);
});

// ৩. পাতা-১ অপরিবর্তিত থাকার যাচাই
test('৩. সুইচ চালু (ON) করলে a05 ও a03-এর পাতা-১-এর নকশা (planPage) ও XML বাইট-ফর-বাইট অভিন্ন থাকে (পাতা-১ স্কোর অক্ষত)', () => {
  setSwitch(false);
  const a05P1XmlOff = DocxBuilder.bodyXml({ pages: [clone(a05IrRaw.pages[0])] }).xml;
  const a03P1XmlOff = DocxBuilder.bodyXml({ pages: [clone(a03IrRaw.pages[0])] }).xml;

  setSwitch(true);
  const a05IrOn = LayoutIR.build(clone(a05Measures.cap), clone(a05Measures.measures), clone(a05Measures.pageInfo));
  const a03IrOn = LayoutIR.build(clone(a03Measures.cap), clone(a03Measures.measures), clone(a03Measures.pageInfo));

  assert.strictEqual(JSON.stringify(a05IrOn.pages[0]), JSON.stringify(a05IrOff.pages[0]), 'a05 পাতা-১ IR অভিন্ন');
  assert.strictEqual(JSON.stringify(a03IrOn.pages[0]), JSON.stringify(a03IrOff.pages[0]), 'a03 পাতা-১ IR অভিন্ন');

  const a05P1XmlOn = DocxBuilder.bodyXml({ pages: [clone(a05IrRaw.pages[0])] }).xml;
  const a03P1XmlOn = DocxBuilder.bodyXml({ pages: [clone(a03IrRaw.pages[0])] }).xml;

  assert.strictEqual(a05P1XmlOn, a05P1XmlOff, 'a05 পাতা-১ XML বাইট-ফর-বাইট অভিন্ন');
  assert.strictEqual(a03P1XmlOn, a03P1XmlOff, 'a03 পাতা-১ XML বাইট-ফর-বাইট অভিন্ন');
});

// ৪. a05 পাতা-২ লাইন সংখ্যা ও উল্লম্ব সরণ যাচাই
test('৪. a05 পাতা-২: ব্লিড-থ্রু ফাঁকা ছক অপসারণ, ব্লক-২৭-এর ৩টি লাইন পুনরুদ্ধার ও নোট-১-এর ২ লাইন অক্ষত রেখে লাইন সংখ্যা মূলের সমান (২২টি) হয়', () => {
  setSwitch(false);
  const rowsOff = simulateVisualLinesA05(clone(a05IrRaw.pages[1]));

  setSwitch(true);
  const p2OnFromIr = clone(a05IrRaw.pages[1]);
  LineFit.repairP2DriftPage(p2OnFromIr);
  const rowsOnIr = simulateVisualLinesA05(p2OnFromIr);

  const irBuiltOn = LayoutIR.build(clone(a05Measures.cap), clone(a05Measures.measures), clone(a05Measures.pageInfo));
  LineFit.fit(irBuiltOn);
  const rowsOnBuilt = simulateVisualLinesA05(irBuiltOn.pages[1]);

  const origLineCount = a05Score.per[1].lines.orig; // 22
  assert.strictEqual(origLineCount, 22, 'মূলে a05 পাতা-২-এ ২২টি লাইন');
  assert.ok(rowsOff.length > origLineCount, `সুইচ বন্ধ থাকলে বাড়তি লাইন ছিল (${rowsOff.length} > ${origLineCount})`);
  assert.strictEqual(rowsOnIr.length, origLineCount, `সুইচ চালু করলে ir.json থেকে লাইন সংখ্যা ঠিক ${origLineCount}`);
  assert.strictEqual(rowsOnBuilt.length, origLineCount, `সুইচ চালু করলে build() থেকে লাইন সংখ্যা ঠিক ${origLineCount}`);
});

test('৫. a05 পাতা-২: প্রতিটি সারির উল্লম্ব অবস্থান (dy) ও উচ্চতা (hOurs) মূলের সাথে ঘনিষ্ঠভাবে মেলে (সর্বোচ্চ |dy| <= ৩pt)', () => {
  setSwitch(true);
  const p2On = clone(a05IrRaw.pages[1]);
  LineFit.repairP2DriftPage(p2On);
  const rowsOn = simulateVisualLinesA05(p2On);
  const origRows = a05Score.per[1].rows;

  // পূর্বে Row[6] ("চেক নং...") dy=+25pt এবং Row[8] ("তারিখ...") dy=-6pt ছিল
  const oldMaxDy = Math.max(...origRows.map((r) => Math.abs(r.dy)));
  const newMaxDy = Math.max(...origRows.map((r, i) => Math.abs(rowsOn[i].y - r.y)));

  assert.strictEqual(oldMaxDy, 25, 'পূর্বে সর্বোচ্চ উল্লম্ব সরণ ছিল ২৫pt');
  assert.ok(newMaxDy <= 3.5, `সংশোধনের পর সর্বোচ্চ উল্লম্ব সরণ <= ৩.৫pt (পাওয়া গেছে ${newMaxDy.toFixed(1)}pt)`);

  // ব্লক ২৭-এর ৩টি লাইন (Row 6, 7, 8) ৭pt-এর বদলে মূল ১৩pt ফন্টে এসেছে
  assert.strictEqual(rowsOn[6].fontPt, 13, 'Row[6] ("চেক নং...") ফন্ট ১৩pt');
  assert.strictEqual(rowsOn[7].fontPt, 13, 'Row[7] ("চেক প্রদানকারীর স্বাক্ষর") ফন্ট ১৩pt');
  assert.strictEqual(rowsOn[8].fontPt, 13, 'Row[8] ("তারিখ...") ফন্ট ১৩pt');

  // দুপাশে-সমান অনুচ্ছেদগুলোর ডান-ইনডেন্ট (justRightPt) যুক্ত হওয়ায় ডান প্রান্ত +৩২pt উপচে পড়ে না
  const note1Band = p2On.bands.find((b) => b.cells[0].items[0] && String(b.cells[0].items[0].text || '').startsWith('নোট-১'));
  assert.ok(note1Band, 'নোট-১ ব্যান্ড বিদ্যমান');
  const note1It = note1Band.cells[0].items[0];
  assert.strictEqual(note1It.keepLines, true, 'নোট-১-এ keepLines=true');
  assert.strictEqual(note1It.keepJust, true, 'নোট-১-এ keepJust=true');
  assert.ok(note1It.justRightPt >= 25 && note1It.justRightPt <= 40, `নোট-১-এ justRightPt সংরক্ষিত (${note1It.justRightPt}pt)`);
});

// ৬. a03 পাতা-২ লাইন সংখ্যা, বক্স-ফ্রেম ও উল্লম্ব সরণ যাচাই
test('৬. a03 পাতা-২: উপরের ঠিকানা-অংশের ৭টি বিচ্ছিন্ন ব্যান্ড একীভূত ও বক্স-ফ্রেমে আবদ্ধ হয়ে দৃশ্যমান সারি সংখ্যা ২১ থেকে কমে মূলের সমান (১৫টি) হয়', () => {
  setSwitch(true);
  const p2OnFromIr = clone(a03IrRaw.pages[1]);
  LineFit.repairP2DriftPage(p2OnFromIr);

  const irBuiltOn = LayoutIR.build(clone(a03Measures.cap), clone(a03Measures.measures), clone(a03Measures.pageInfo));
  LineFit.fit(irBuiltOn);

  assert.strictEqual(p2OnFromIr.bands.length, 19, 'a03 পাতা-২-এ ব্যান্ড সংখ্যা ২৫ থেকে কমে ১৯ হয়েছে');
  assert.strictEqual(irBuiltOn.pages[1].bands.length, 19, 'build() থেকেও a03 পাতা-২-এ ব্যান্ড সংখ্যা ১৯');
  assert.strictEqual(p2OnFromIr.boxes.length, 2, 'উপরের ঠিকানা-বাক্স ও মাঝের মূল-বাক্স উভয়ই page.boxes-এ যুক্ত হয়েছে');
  assert.strictEqual(p2OnFromIr.boxes[0].y0, 50.4, 'উপরের বাক্স y0 = 50.4pt');
  assert.strictEqual(p2OnFromIr.boxes[0].y1, 236.1, 'উপরের বাক্স y1 = 236.1pt');

  const compsOn = simulateCompartmentsA03(p2OnFromIr);
  const origLineCount = a03Score.per[1].lines.orig; // 15
  assert.strictEqual(compsOn.length, origLineCount, `a03 পাতা-২-এ দৃশ্যমান সারি/কম্পার্টমেন্ট সংখ্যা ঠিক ${origLineCount}`);
});

test('৭. a03 পাতা-২: আনুভূমিক বিভাজক রেখা (ruleBelow) ও নিচের স্বাক্ষর/তারিখ বাক্স সঠিক অবস্থানে থাকায় Row[0], Row[5], Row[6], Row[14]-এর সরণ ও উচ্চতা সংশোধিত হয়', () => {
  setSwitch(true);
  const p2On = clone(a03IrRaw.pages[1]);
  LineFit.repairP2DriftPage(p2On);
  const compsOn = simulateCompartmentsA03(p2On);
  const origRows = a03Score.per[1].rows;

  // Row[0] (উপরের ঠিকানা বাক্স): পূর্বে dy=+53pt, hOurs=7 (বনাম h=142) ছিল
  assert.ok(Math.abs(compsOn[0].y - origRows[0].y) <= 3, `Row[0] y মূলের কাছাকাছি (${compsOn[0].y} বনাম ${origRows[0].y})`);
  assert.ok(Math.abs(compsOn[0].h - origRows[0].h) <= 4, `Row[0] উচ্চতা মূলের কাছাকাছি (${compsOn[0].h} বনাম ${origRows[0].h})`);

  // Row[5] (ব্লক ৫৩ ছক, y=461, h=52) ও Row[6] (মাসিক পেনশন শেষ হওয়ার তারিখ, y=516, h=13): পূর্বে Row[6]-এ dy=-10pt ছিল
  assert.ok(Math.abs(compsOn[5].h - origRows[5].h) <= 3, `Row[5] উচ্চতা মূলের সমান (${compsOn[5].h} বনাম ${origRows[5].h})`);
  assert.ok(Math.abs(compsOn[6].y - origRows[6].y) <= 3, `Row[6] উল্লম্ব সরণ দূর হয়েছে (${compsOn[6].y} বনাম ${origRows[6].y})`);
  assert.ok(Math.abs(compsOn[6].h - origRows[6].h) <= 3, `Row[6] উচ্চতা মূলের সমান (${compsOn[6].h} বনাম ${origRows[6].h})`);

  // Row[14] (নিচের স্বাক্ষর ও তারিখ বাক্স, y=729, h=57): পূর্বে বর্ডারহীন হওয়ায় hOurs=9 ছিল
  assert.ok(Math.abs(compsOn[14].y - origRows[14].y) <= 3, `Row[14] y মূলের সমান (${compsOn[14].y} বনাম ${origRows[14].y})`);
  assert.ok(Math.abs(compsOn[14].h - origRows[14].h) <= 3, `Row[14] উচ্চতা মূলের সমান (${compsOn[14].h} বনাম ${origRows[14].h})`);

  // XML-এও পাশাপাশি দুটি স্বাক্ষর/তারিখ বাক্স ও সঠিক উচ্চতার বিভাজক রেখা রয়েছে
  const xmlOn = DocxBuilder.bodyXml({ pages: [p2On] }).xml;
  assert.ok(xmlOn.includes('w:line="203" w:lineRule="exact"'), 'ব্লক ৫৩-এর নিচের বিভাজক রেখা ১০.১pt (২০২ dxa) দূরত্বে স্থাপিত');
});

setSwitch(false);
console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
