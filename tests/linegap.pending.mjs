import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASIS_DIR = path.join(ROOT, 'qa/golden-data/asis');

const LayoutIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LineFit = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const Builder = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function setLineGapFlag(on, off = false) {
  delete globalThis.__FZ_ON_LINEGAP;
  delete globalThis.__FZ_OFF_LINEGAP;
  if (process && process.env) {
    delete process.env.__FZ_ON_LINEGAP;
    delete process.env.__FZ_OFF_LINEGAP;
    delete process.env.FZ_ON;
    delete process.env.FZ_OFF;
  }
  if (on) globalThis.__FZ_ON_LINEGAP = true;
  if (off) globalThis.__FZ_OFF_LINEGAP = true;
}

const FILL_G = /([._\-…·─])\1{5,}/g;
const SPACING_KAR_RE = /[\u0982\u0983\u09be-\u09c0\u09c7\u09c8\u09cb\u09cc\u09d7]/g;
function canvasMeasure(s) {
  const str = String(s || '');
  const fills = (str.match(FILL_G) || []).join('');
  const noFill = str.replace(FILL_G, '');
  const bLen = noFill.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
  const karLen = (noFill.match(SPACING_KAR_RE) || []).length;
  return bLen * 43 + karLen * 16 + fills.length * 33.3;
}

/**
 * ডিস্কে qa/golden-data/asis/<id>/ir.json থাকলে সরাসরি লোড করে;
 * সংক্ষিপ্ত বান্ডেলে কোনো নমুনা (যেমন a10, a04, a13, a01) অনুপস্থিত থাকলে প্রতিনিধিত্বমূলক ফিক্সচার ব্যবহার করে।
 */
function loadSampleIr(id) {
  const irPath = path.join(ASIS_DIR, id, 'ir.json');
  const scorePath = path.join(ASIS_DIR, id, 'layout-score.json');
  const measPath = path.join(ASIS_DIR, id, 'measures.json');
  if (fs.existsSync(irPath)) {
    const ir = JSON.parse(fs.readFileSync(irPath, 'utf8'));
    const score = fs.existsSync(scorePath) ? JSON.parse(fs.readFileSync(scorePath, 'utf8')) : null;
    const measures = fs.existsSync(measPath) ? JSON.parse(fs.readFileSync(measPath, 'utf8')) : null;
    const truthPages = (score && score.pages && score.pages.truth) || ir.pages.length;
    return { id, ir, measures, truthPages, fromDisk: true };
  }
  if (id === 'a10') {
    const makeScaledPage = (pn) => ({
      page: pn,
      widthPt: 595,
      heightPt: 842,
      scale: 0.32,
      bodyFontPt: 11.5,
      margins: { top: 24, right: 28, bottom: 24, left: 28 },
      bands: [
        {
          kind: 'flow',
          gapBeforePt: 0,
          y0: 24,
          y1: 62,
          cells: [{
            x0: 28,
            x1: 567,
            items: [{
              kind: 'para',
              type: 'paragraph',
              text: '**টীকাঃ-** যথাযথ পদ্ধতিতে তদন্তের মাধ্যমে ফরমটি পূরণ করিতে হইবে।\nপ্রার্থীর সনদ ও বৃত্তান্ত যাচাইপূর্বক প্রত্যয়ন করিতে হইবে।\nকোনো তথ্য গোপন করিলে আইনানুগ ব্যবস্থা গৃহীত হইবে।',
              lines: [
                '**টীকাঃ-** যথাযথ পদ্ধতিতে তদন্তের মাধ্যমে ফরমটি পূরণ করিতে হইবে।',
                'প্রার্থীর সনদ ও বৃত্তান্ত যাচাইপূর্বক প্রত্যয়ন করিতে হইবে।',
                'কোনো তথ্য গোপন করিলে আইনানুগ ব্যবস্থা গৃহীত হইবে।'
              ],
              diag: { lines: 2, wPt: null },
              keepLines: true,
              fontPt: 15,
              bold: true,
              align: 'j',
              indentPt: 0,
              firstIndentPt: 0,
              lineSpacingPt: 0,
              spaceBeforePt: 0,
              rect: { x: 28, y: 24, w: 539, h: 38 }
            }]
          }]
        },
        {
          kind: 'flow',
          gapBeforePt: 8,
          y0: 70,
          y1: 230,
          cells: [{
            x0: 28,
            x1: 567,
            items: [{
              kind: 'table',
              type: 'table',
              rows: [
                ['ক্রমিক', 'প্রতিষ্ঠানের নাম ও অবস্থান', 'ভর্তির তারিখ', 'পরিত্যাগের তারিখ', 'কারণ'],
                ['', '', '', '', ''],
                ['', '', '', '', ''],
                ['', '', '', '', '']
              ],
              borderless: false,
              fontPt: 10,
              widthPt: 539,
              heightPt: 160,
              colFractions: [0.1, 0.35, 0.18, 0.18, 0.19],
              srcRulesPt: [70, 102, 134, 166, 198, 230],
              rowHeightsPt: [100, 100, 100, 200],
              rect: { x: 28, y: 70, w: 539, h: 160 }
            }]
          }]
        },
        {
          kind: 'flow',
          gapBeforePt: 8,
          y0: 238,
          y1: 239.8,
          cells: [{
            x0: 28,
            x1: 567,
            items: [{
              kind: 'para',
              type: 'other',
              text: '--------------------------------------------------------------------------------',
              lines: ['--------------------------------------------------------------------------------'],
              keepLines: true,
              fontPt: 8.5,
              bold: false,
              align: 'l',
              indentPt: 0,
              firstIndentPt: 0,
              lineSpacingPt: 0,
              spaceBeforePt: 0,
              rect: { x: 28, y: 238, w: 539, h: 1.8 }
            }]
          }]
        }
      ]
    });
    return {
      id: 'a10',
      ir: { pages: [makeScaledPage(1), makeScaledPage(2), makeScaledPage(3), makeScaledPage(4)], warnings: [] },
      measures: null,
      truthPages: 4,
      fromDisk: false
    };
  }
  if (id === 'a04') {
    const makeRegTablePage = (pn) => ({
      page: pn,
      widthPt: 595,
      heightPt: 842,
      scale: 1,
      bodyFontPt: 10,
      margins: { top: 24, right: 24, bottom: 24, left: 24 },
      bands: [{
        kind: 'flow',
        gapBeforePt: 0,
        y0: 24,
        y1: 524,
        cells: [{
          x0: 24,
          x1: 571,
          items: [{
            kind: 'table',
            type: 'table',
            rows: Array.from({ length: 18 }, (_, ri) =>
              Array.from({ length: 12 }, (__, ci) => (ri === 0 ? `কলাম ${ci + 1}` : ''))
            ),
            borderless: false,
            fontPt: 10,
            widthPt: 547,
            heightPt: 500,
            colFractions: [0.035, 0.08, 0.14, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.105],
            rowHeightsPt: Array.from({ length: 18 }, () => 36),
            rect: { x: 24, y: 24, w: 547, h: 500 }
          }]
        }]
      }]
    });
    const makeProsePage = (pn) => ({
      page: pn,
      widthPt: 595,
      heightPt: 842,
      scale: 1,
      bodyFontPt: 12,
      margins: { top: 36, right: 36, bottom: 36, left: 36 },
      bands: [{
        kind: 'flow',
        gapBeforePt: 0,
        y0: 36,
        y1: 116,
        cells: [{
          x0: 36,
          x1: 559,
          items: [{
            kind: 'para',
            type: 'paragraph',
            text: 'এই নির্দেশিকায় বর্ণিত নিয়মাবলী অনুসরণপূর্বক সংশ্লিষ্ট রেজিস্টার ছক যথাযথভাবে পূরণ ও সংরক্ষণ করিতে হইবে এবং প্রতি মাসের শেষে প্রতিবেদন দাখিল করিতে হইবে।',
            lines: ['এই নির্দেশিকায় বর্ণিত নিয়মাবলী অনুসরণপূর্বক সংশ্লিষ্ট রেজিস্টার ছক যথাযথভাবে পূরণ ও সংরক্ষণ করিতে হইবে এবং প্রতি মাসের শেষে প্রতিবেদন দাখিল করিতে হইবে।'],
            diag: { lines: 5, wPt: 11.5 },
            keepLines: false,
            fontPt: 12,
            bold: false,
            align: 'j',
            indentPt: 0,
            firstIndentPt: 0,
            lineSpacingPt: 18,
            spaceBeforePt: 0,
            rect: { x: 36, y: 36, w: 523, h: 80 }
          }]
        }]
      }]
    });
    return {
      id: 'a04',
      ir: { pages: [makeRegTablePage(1), makeRegTablePage(2), makeProsePage(3), makeProsePage(4)], warnings: [] },
      measures: null,
      truthPages: 4,
      fromDisk: false
    };
  }
  if (id === 'a13' || id === 'a01') {
    const makeCleanPage = (pn) => ({
      page: pn,
      widthPt: 595,
      heightPt: 842,
      scale: 1,
      bodyFontPt: 12,
      margins: { top: 48, right: 48, bottom: 48, left: 48 },
      bands: [
        {
          kind: 'flow',
          gapBeforePt: 0,
          y0: 48,
          y1: 68,
          cells: [{
            x0: 48,
            x1: 547,
            items: [{
              kind: 'para',
              type: 'heading',
              text: id === 'a13' ? 'প্রত্যয়ন পত্র' : 'উত্তরাধিকার সনদ ফরম',
              lines: [id === 'a13' ? 'প্রত্যয়ন পত্র' : 'উত্তরাধিকার সনদ ফরম'],
              diag: { lines: 1, wPt: 14 },
              keepLines: true,
              fontPt: 14,
              bold: true,
              align: 'c',
              indentPt: 0,
              firstIndentPt: 0,
              lineSpacingPt: 16,
              spaceBeforePt: 0,
              rect: { x: 220, y: 48, w: 155, h: 18 }
            }]
          }]
        },
        {
          kind: 'flow',
          gapBeforePt: 12,
          y0: 80,
          y1: 96,
          cells: [{
            x0: 48,
            x1: 547,
            items: [{
              kind: 'para',
              type: 'paragraph',
              text: '০১। আবেদনকারীর নাম : ............................................................................................................',
              lines: ['০১। আবেদনকারীর নাম : ............................................................................................................'],
              diag: { lines: 1, wPt: 4.5 },
              keepLines: false,
              fontPt: 12,
              bold: false,
              align: 'l',
              indentPt: 0,
              firstIndentPt: 0,
              lineSpacingPt: 14,
              spaceBeforePt: 0,
              rect: { x: 48, y: 80, w: 499, h: 14 }
            }]
          }]
        }
      ]
    });
    return {
      id,
      ir: { pages: [makeCleanPage(1)], warnings: [] },
      measures: null,
      truthPages: 1,
      fromDisk: false
    };
  }
  throw new Error(`Sample ${id} not found at ${irPath}`);
}

/**
 * একটি IR-এর মোট মাপা ব্লক-উচ্চতা (sum of rect.h) এবং আউটপুট ব্লক-উচ্চতা (sum of itemH / planPage els.h) গণনা
 */
function computeIrHeightMetrics(ir) {
  let measuredH = 0;
  let outputItemH = 0;
  let plannedBlockH = 0;
  let overflowPages = 0;
  let minFontRatio = 1;
  let anyPageFixed = false;

  for (const page of ir.pages) {
    const planned = Builder.planPage(page);
    if (page._lineGapFixed) anyPageFixed = true;
    const mb0 = page.margins.bottom;
    const sectBottom = page.frame ? mb0 : Math.min(mb0, Math.max(10, mb0 - 36));
    const realLimit = page.heightPt - sectBottom;
    const boxExtra = (page.boxes || []).reduce((a, b) => a + (b.cardBox ? 0 : 2 * (b.sz || 6) / 8), 0);
    const pagePlannedEnd = page.margins.top + planned.els.reduce((a, e) => a + e.before * planned.f + e.h, 0) + boxExtra;
    if (pagePlannedEnd > realLimit + 2) overflowPages++;

    plannedBlockH += planned.els.reduce((a, e) => a + (e.it && e.it.floatAt ? Builder.itemH(e.it) : e.h), 0);

    for (const band of page.bands || []) {
      for (const cell of band.cells || []) {
        for (const it of cell.items || []) {
          if (!it || !it.rect || !(it.rect.h > 0)) continue;
          const inBottom = it.kind === 'figure' && (it.rect.y + it.rect.h > page.heightPt - page.margins.bottom - 1);
          if (inBottom) continue;
          measuredH += it.rect.h;
          outputItemH += Builder.itemH(it);
          if (it.fit && it.fit.fontFrom && it.fontPt) {
            minFontRatio = Math.min(minFontRatio, it.fontPt / it.fit.fontFrom);
          }
        }
      }
    }
  }

  const diffRatioItem = measuredH > 0 ? (outputItemH - measuredH) / measuredH : 0;
  const diffRatioPlan = measuredH > 0 ? (plannedBlockH - measuredH) / measuredH : 0;
  return {
    measuredH,
    outputItemH,
    plannedBlockH,
    diffRatioItem,
    diffRatioPlan,
    overflowPages,
    minFontRatio,
    anyPageFixed,
    pageCount: ir.pages.length
  };
}

function countDocxSections(xml) {
  return (String(xml || '').match(/<w:sectPr\b/g) || []).length;
}

test('LINEGAP switch is OFF by default and preserves exact baseline behavior when OFF or disabled via __FZ_OFF_LINEGAP', () => {
  setLineGapFlag(false, false);
  assert.equal(LayoutIR.lineGapOn(), false, 'LayoutIR.lineGapOn() must be false by default');
  assert.equal(LineFit.isLineGapOn(), false, 'LineFit.isLineGapOn() must be false by default');
  assert.equal(Builder.lineGapOn(), false, 'Builder.lineGapOn() must be false by default');

  const { ir: baseIr } = loadSampleIr('a14');
  const irDefault = deepClone(baseIr);
  LineFit.fit(irDefault, canvasMeasure);
  const xmlDefault = Builder.bodyXml(irDefault).xml;

  setLineGapFlag(true, true);
  assert.equal(LayoutIR.lineGapOn(), false, '__FZ_OFF_LINEGAP must override __FZ_ON_LINEGAP');
  assert.equal(LineFit.isLineGapOn(), false, '__FZ_OFF_LINEGAP must override __FZ_ON_LINEGAP in LineFit');
  assert.equal(Builder.lineGapOn(), false, '__FZ_OFF_LINEGAP must override __FZ_ON_LINEGAP in Builder');

  const irExplicitOff = deepClone(baseIr);
  LineFit.fit(irExplicitOff, canvasMeasure);
  const xmlExplicitOff = Builder.bodyXml(irExplicitOff).xml;

  assert.equal(xmlExplicitOff, xmlDefault, 'Output XML with __FZ_OFF_LINEGAP must be 100% identical to default OFF');
  setLineGapFlag(false, false);
});

test('LINEGAP ON leaves non-anomalous files (a03, a13, a01) 100% unchanged', () => {
  for (const id of ['a03', 'a13', 'a01']) {
    const sample = loadSampleIr(id);

    for (const measFn of [undefined, canvasMeasure]) {
      setLineGapFlag(false, false);
      const irOff = deepClone(sample.ir);
      LineFit.fit(irOff, measFn);
      const xmlOff = Builder.bodyXml(irOff).xml;

      setLineGapFlag(true, false);
      const irOn = deepClone(sample.ir);
      LineFit.fit(irOn, measFn);
      const xmlOn = Builder.bodyXml(irOn).xml;

      assert.equal(xmlOn, xmlOff, `${id}: DOCX XML with LINEGAP ON must be 100% identical to LINEGAP OFF`);

      if (sample.measures && sample.measures.cap) {
        setLineGapFlag(false, false);
        const builtOff = LayoutIR.build(sample.measures.cap, sample.measures.measures, sample.measures.pageInfo);
        LineFit.fit(builtOff, measFn);
        const builtXmlOff = Builder.bodyXml(builtOff).xml;

        setLineGapFlag(true, false);
        const builtOn = LayoutIR.build(sample.measures.cap, sample.measures.measures, sample.measures.pageInfo);
        LineFit.fit(builtOn, measFn);
        const builtXmlOn = Builder.bodyXml(builtOn).xml;

        assert.equal(builtXmlOn, builtXmlOff, `${id}: Full LayoutIR.build -> DOCX XML with LINEGAP ON must be 100% identical to OFF`);
      }
    }
  }
  setLineGapFlag(false, false);
});

test('LINEGAP ON keeps total IR block height within ±5% of measured height, improves a14 without page overflow, and preserves exact page count for a14, a04, and a10', () => {
  for (const id of ['a14', 'a04', 'a10']) {
    const sample = loadSampleIr(id);

    for (const measFn of [undefined, canvasMeasure]) {
      setLineGapFlag(false, false);
      const irOff = deepClone(sample.ir);
      LineFit.fit(irOff, measFn);
      const metricsOff = computeIrHeightMetrics(irOff);

      setLineGapFlag(true, false);
      assert.equal(LayoutIR.lineGapOn(), true);
      assert.equal(LineFit.isLineGapOn(), true);
      assert.equal(Builder.lineGapOn(), true);

      const irOn = deepClone(sample.ir);
      LineFit.fit(irOn, measFn);
      const metricsOn = computeIrHeightMetrics(irOn);
      const { xml } = Builder.bodyXml(irOn);

      assert.equal(metricsOn.anyPageFixed, true, `${id}: must be detected and repaired when LINEGAP is ON`);
      assert.ok(
        Math.abs(metricsOn.diffRatioItem) <= 0.05,
        `${id}: itemH total (${metricsOn.outputItemH.toFixed(1)}pt) must be within ±5% of measured height (${metricsOn.measuredH.toFixed(1)}pt), got ${(metricsOn.diffRatioItem * 100).toFixed(2)}% (was ${(metricsOff.diffRatioItem * 100).toFixed(2)}% when OFF)`
      );
      assert.ok(
        Math.abs(metricsOn.diffRatioItem) < Math.abs(metricsOff.diffRatioItem),
        `${id}: LINEGAP ON must reduce block height excess vs OFF (${(metricsOn.diffRatioItem * 100).toFixed(2)}% vs ${(metricsOff.diffRatioItem * 100).toFixed(2)}%)`
      );
      assert.ok(
        Math.abs(metricsOn.diffRatioPlan) <= 0.05,
        `${id}: planned block height (${metricsOn.plannedBlockH.toFixed(1)}pt) must be within ±5% of measured height (${metricsOn.measuredH.toFixed(1)}pt), got ${(metricsOn.diffRatioPlan * 100).toFixed(2)}%`
      );
      assert.equal(metricsOn.pageCount, sample.truthPages, `${id}: IR page count must equal truth (${sample.truthPages})`);
      assert.equal(countDocxSections(xml), sample.truthPages, `${id}: DOCX sectPr count must equal truth (${sample.truthPages})`);
      assert.equal(metricsOn.overflowPages, 0, `${id}: zero pages may overflow printable height when LINEGAP is ON`);
      assert.ok(metricsOn.minFontRatio >= 0.85, `${id}: font scaling must not drop below 85%, got ${(metricsOn.minFontRatio * 100).toFixed(1)}%`);

      if (id === 'a14') {
        const p2Tbl = irOn.pages[1].bands[23].cells[0].items[0];
        assert.equal(p2Tbl.exactRuleHeights, true, 'a14 P2 B23 attestation table must have exactRuleHeights=true');
        assert.equal(p2Tbl.heightPt, 210.7, 'a14 P2 B23 attestation table heightPt must equal exact rule span 210.7pt');
        assert.equal(Builder.itemH(p2Tbl), 210.7, 'a14 P2 B23 itemH must be 210.7pt (down from 227.4pt in OFF)');
        assert.equal(irOn.pages[1].bands[4].cells[0].items[0].keepLines, true, 'a14 P2 B4 2-line fill paragraph must have keepLines=true so it stays 2 lines instead of wrapping to 3');
        assert.equal(irOn.pages[2].bands.length, 15, 'a14 P3 merged list_item band (১০। & ১১।) must be split into 15 distinct bands');
      }
    }
  }
  setLineGapFlag(false, false);
});

test('LINEGAP ON passes across all real samples in qa/golden-data/asis/ without regressing good files or overflowing pages', () => {
  const ids = fs.existsSync(ASIS_DIR)
    ? fs.readdirSync(ASIS_DIR).filter((d) => fs.existsSync(path.join(ASIS_DIR, d, 'ir.json'))).sort()
    : [];
  assert.ok(ids.length > 0, 'At least one golden sample must exist in qa/golden-data/asis/');

  for (const id of ids) {
    const sample = loadSampleIr(id);

    setLineGapFlag(false, false);
    const irOff = deepClone(sample.ir);
    LineFit.fit(irOff);
    const metricsOff = computeIrHeightMetrics(irOff);
    const xmlOff = Builder.bodyXml(irOff).xml;

    setLineGapFlag(true, false);
    const irOn = deepClone(sample.ir);
    LineFit.fit(irOn);
    const metricsOn = computeIrHeightMetrics(irOn);
    const { xml: xmlOn } = Builder.bodyXml(irOn);

    if (metricsOn.anyPageFixed) {
      assert.ok(
        Math.abs(metricsOn.diffRatioItem) <= 0.05,
        `${id}: repaired sample total block height ratio ${(metricsOn.diffRatioItem * 100).toFixed(2)}% exceeds ±5% (OFF was ${(metricsOff.diffRatioItem * 100).toFixed(2)}%)`
      );
    } else {
      assert.equal(xmlOn, xmlOff, `${id}: non-anomalous sample must remain 100% unchanged when LINEGAP is ON`);
    }
    assert.equal(metricsOn.pageCount, sample.truthPages, `${id}: page count must match truth (${sample.truthPages})`);
    assert.equal(countDocxSections(xmlOn), sample.truthPages, `${id}: DOCX section count must match truth (${sample.truthPages})`);
    assert.equal(metricsOn.overflowPages, 0, `${id}: zero pages may overflow printable area`);
    assert.ok(metricsOn.minFontRatio >= 0.85, `${id}: font scale must stay >= 85%`);
  }
  setLineGapFlag(false, false);
});
