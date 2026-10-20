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

const GF = require('../js/layout-engine/faithful/grid-first.js');
const IR = require('../js/layout-engine/faithful/layout-ir.js');
const LF = require('../js/layout-engine/faithful/line-fit.js');
const FB = require('../js/layout-engine/faithful/faithful-docx-builder.js');

function resetSwitches() {
  delete globalThis.__FZ_ON_TBLMERGE;
  delete globalThis.__FZ_OFF_TBLMERGE;
  if (typeof process !== 'undefined' && process.env) {
    delete process.env.__FZ_ON_TBLMERGE;
    delete process.env.__FZ_OFF_TBLMERGE;
    delete process.env.FZ_ON;
    delete process.env.FZ_OFF;
  }
}

function resolveSampleDir(id) {
  const candidates = [
    path.join(ASIS_DIR, id),
    path.resolve(ROOT, '../work/qa/golden-data/asis', id)
  ];
  for (const d of candidates) {
    if (fs.existsSync(path.join(d, 'ir.json'))) return d;
  }
  return path.join(ASIS_DIR, id);
}

function loadSample(id) {
  const dir = resolveSampleDir(id);
  const ir = JSON.parse(fs.readFileSync(path.join(dir, 'ir.json'), 'utf8'));
  const lsPath = path.join(dir, 'layout-score.json');
  const abLsPath = path.join(ROOT, 'scratch/ab', id, 'off/layout-score.json');
  const ls = fs.existsSync(lsPath)
    ? JSON.parse(fs.readFileSync(lsPath, 'utf8'))
    : (fs.existsSync(abLsPath) ? JSON.parse(fs.readFileSync(abLsPath, 'utf8')) : null);
  const capPath = path.join(dir, 'capture.json');
  const cap = fs.existsSync(capPath) ? JSON.parse(fs.readFileSync(capPath, 'utf8')) : null;
  const measPath = path.join(dir, 'measures.json');
  const meas = fs.existsSync(measPath) ? JSON.parse(fs.readFileSync(measPath, 'utf8')) : null;
  return { ir, ls, cap, meas };
}

function estimatePageRules(page, lsPage) {
  const baseH = (lsPage && lsPage.rules && lsPage.rules.ours && lsPage.rules.ours.h) ? lsPage.rules.ours.h.slice() : [];
  const baseV = (lsPage && lsPage.rules && lsPage.rules.ours && lsPage.rules.ours.v) ? lsPage.rules.ours.v.slice() : [];
  const tables = (page.bands || [])
    .flatMap((b) => (b.cells || []).flatMap((c) => c.items || []))
    .filter((it) => it && it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 1);

  const multiColTables = tables.filter((t) => Math.max(...t.rows.map((r) => r.length)) >= 2 && t.rect);
  const keepH = baseH.filter((y) => !multiColTables.some((t) => y >= t.rect.y - 3 && y <= t.rect.y + Math.max(t.rect.h, t.heightPt || 0) + 3));
  const keepV = baseV.filter((x) => !multiColTables.some((t) => t.rows.length >= 2 && x >= t.rect.x - 3 && x <= t.rect.x + t.rect.w + 3));

  for (const t of multiColTables) {
    const nCols = Math.max(...t.rows.map((r) => r.length));
    const y0 = Array.isArray(t.srcRulesPt) && t.srcRulesPt.length ? t.srcRulesPt[0] : t.rect.y;
    if (t.rows.length === 1 && nCols >= 4) {
      const hasGaps = Array.isArray(t.smallBoxesPt) && t.smallBoxesPt.some((b, i) => i > 0 && (b.x0 - t.smallBoxesPt[i - 1].x1) >= 2.5);
      if (hasGaps) continue;
      const bh = t.boxRuleHeightPt || (t.heightPt ? t.heightPt + 1.55 : t.rect.h);
      keepH.push(Math.round(y0 * 100) / 100, Math.round((y0 + bh) * 100) / 100);
      continue;
    }
    const isDarkHeader = t.headShade && /^[0-9A-Fa-f]{6}$/.test(t.headShade) && (() => {
      const r = parseInt(t.headShade.slice(0, 2), 16);
      const g = parseInt(t.headShade.slice(2, 4), 16);
      const b = parseInt(t.headShade.slice(4, 6), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) < 215;
    })();
    const rbh = Array.isArray(t.rowHeightsPt) && t.rowHeightsPt.length === t.rows.length
      ? t.rowHeightsPt
      : t.rows.map(() => (t.heightPt || t.rect.h) / t.rows.length);
    let curY = y0;
    if (!isDarkHeader) keepH.push(Math.round(curY * 100) / 100);
    for (let ri = 0; ri < t.rows.length; ri++) {
      curY += rbh[ri] + (t.exactRuleHeights ? 0 : 0.45);
      const sameBandNext = Array.isArray(t.rowBand) && ri < t.rows.length - 1 && t.rowBand[ri] === t.rowBand[ri + 1];
      if (!sameBandNext && !(ri === 0 && isDarkHeader)) {
        keepH.push(Math.round(curY * 100) / 100);
      }
    }
    const wPt = t.widthPt || t.rect.w;
    const fr = Array.isArray(t.colFractions) && t.colFractions.length === nCols ? t.colFractions : new Array(nCols).fill(1 / nCols);
    let curX = t.rect.x;
    keepV.push(Math.round(curX * 100) / 100);
    for (let ci = 0; ci < nCols; ci++) {
      curX += wPt * fr[ci];
      const hasV = ci === nCols - 1 || !Array.isArray(t.fullVRule) || t.fullVRule[ci] !== false;
      if (hasV) keepV.push(Math.round(curX * 100) / 100);
    }
  }
  return { h: keepH.sort((a, b) => a - b), v: keepV.sort((a, b) => a - b) };
}

const unmatched = (a, b, tol = 3) => a.filter((x) => !b.some((y) => Math.abs(x - y) <= tol)).length;

test('TABLE_MERGE_v2: switch OFF keeps output 100% identical to baseline and is fully reversible', () => {
  resetSwitches();
  assert.equal(GF.tblMergeOn(), false);
  assert.equal(IR.tblMergeOn(), false);
  assert.equal(LF.isTblMergeOn(), false);

  for (const id of ['a02', 'a03', 'a04', 'a07']) {
    if (!fs.existsSync(path.join(resolveSampleDir(id), 'ir.json'))) continue;
    const { ir: irBase } = loadSample(id);
    const irSnapBefore = JSON.stringify(irBase);
    LF.fit(irBase);
    assert.equal(JSON.stringify(irBase), irSnapBefore, `${id}: IR must remain untouched after LF.fit when TBLMERGE is OFF`);
    const xmlBase = FB.bodyXml(irBase).xml;

    // Turn switch ON, then OFF on the same IR object and verify 100% identical restoration
    const { ir: irToggle } = loadSample(id);
    globalThis.__FZ_ON_TBLMERGE = true;
    LF.fit(irToggle);
    FB.bodyXml(irToggle);

    globalThis.__FZ_OFF_TBLMERGE = true;
    LF.fit(irToggle);
    const xmlOffOverride = FB.bodyXml(irToggle).xml;
    assert.equal(xmlOffOverride, xmlBase, `${id}: __FZ_OFF_TBLMERGE must restore 100% identical baseline XML`);

    resetSwitches();
    LF.fit(irToggle);
    const xmlRestored = FB.bodyXml(irToggle).xml;
    assert.equal(xmlRestored, xmlBase, `${id}: turning TBLMERGE OFF must restore 100% identical baseline XML`);
  }
});

test('TABLE_MERGE_v2: a07 Page 1 preserves all 6 full-height column dividers without low-coverage ink noise deleting x=401.04', () => {
  resetSwitches();
  const { cap, meas } = loadSample('a07');
  assert.ok(cap && meas, 'a07 capture.json and measures.json must be available');

  const irOff = IR.build(cap, meas.measures || meas.blocks || meas, meas.pageInfo || {});
  LF.fit(irOff);
  const xmlOff = FB.bodyXml(irOff).xml;

  globalThis.__FZ_ON_TBLMERGE = true;
  const irOn = IR.build(cap, meas.measures || meas.blocks || meas, meas.pageInfo || {});
  LF.fit(irOn);
  const xmlOn = FB.bodyXml(irOn).xml;

  const tblP1Off = irOff.pages[0].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((it) => it.kind === 'table');
  const tblP1On = irOn.pages[0].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((it) => it.kind === 'table');

  // Verify Page 1 7-column seniority table keeps all 6 fullVRule=true and balanced column widths (cols 5..7 ~ 74-78pt, never crushed to 33-41pt)
  assert.deepEqual(tblP1On.fullVRule, [true, true, true, true, true, true], 'a07 P1: all 6 interior vertical rules must remain fullVRule=true');
  assert.deepEqual(tblP1On.colFractions, tblP1Off.colFractions, 'a07 P1: colFractions must not be corrupted by low-coverage header ink strokes around x=401.04');
  assert.ok(tblP1On.colFractions[5] > 0.14 && tblP1On.colFractions[6] > 0.14, 'a07 P1: columns 6 and 7 must keep their ~15% width');

  // Verify the entire 5-page a07 output suffers zero degradation compared to baseline
  assert.equal(xmlOn, xmlOff, 'a07: XML across all 5 pages must remain 100% uncorrupted when TBLMERGE is ON');
  resetSwitches();
});

test('TABLE_MERGE_v2: a02 emits gridSpan & vMerge > 0, true <w:tblGrid>, cell padding/row heights, and reduces format-check rulesMiss', () => {
  resetSwitches();
  if (!fs.existsSync(path.join(resolveSampleDir('a02'), 'ir.json'))) return;
  const { ir: irOff, ls } = loadSample('a02');
  LF.fit(irOff);
  const xmlOff = FB.bodyXml(irOff).xml;
  const rulesOff = estimatePageRules(irOff.pages[0], ls.per[0]);
  const origRules = ls.per[0].rules.orig;
  const missOff = unmatched(origRules.h, rulesOff.h) + unmatched(origRules.v, rulesOff.v);
  const extraOff = unmatched(rulesOff.h, origRules.h) + unmatched(rulesOff.v, origRules.v);

  const { ir: irOn } = loadSample('a02');
  const parasBefore = JSON.stringify(
    irOn.pages[0].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).filter((it) => it.kind === 'para')
  );

  globalThis.__FZ_ON_TBLMERGE = true;
  LF.fit(irOn);

  const parasAfterRepair = JSON.stringify(
    irOn.pages[0].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).filter((it) => it.kind === 'para')
  );
  assert.equal(parasAfterRepair, parasBefore, 'a02: regular paragraphs must not be touched by TABLE_MERGE');

  const xmlOn = FB.bodyXml(irOn).xml;

  const gridSpanCountOn = (xmlOn.match(/<w:gridSpan\b/g) || []).length;
  const vMergeCountOn = (xmlOn.match(/<w:vMerge\b/g) || []).length;
  const vMergeCountOff = (xmlOff.match(/<w:vMerge\b/g) || []).length;

  assert.ok(gridSpanCountOn > 0, `a02: expected gridSpan > 0 when TBLMERGE is ON, got ${gridSpanCountOn}`);
  assert.ok(vMergeCountOn > 0, `a02: expected vMerge > 0 when TBLMERGE is ON, got ${vMergeCountOn}`);
  assert.equal(vMergeCountOff, 0, 'a02: baseline had 0 vMerge');
  assert.ok(gridSpanCountOn + vMergeCountOn > (xmlOff.match(/<w:gridSpan\b/g) || []).length + vMergeCountOff);

  const famTbl = irOn.pages[0].bands[17].cells[0].items[0];
  assert.ok(Array.isArray(famTbl.cells) && famTbl.cells.length === 5, 'a02 family table has 5 sub-rows in IR');
  assert.equal(famTbl.cells[0][2].span, 2, 'a02 header "সম্পর্ক (টিক দিন)" has span=2');
  assert.equal(famTbl.cells[0][3].span, 0, 'a02 covered header cell has span=0');
  assert.equal(famTbl.cells[1][0].vmerge, 'restart', 'a02 body row 1 col 0 starts vMerge');
  assert.equal(famTbl.cells[2][0].vmerge, 'continue', 'a02 body row 2 col 0 continues vMerge');
  assert.equal(famTbl.cellPaddingPt, 1.4, 'a02 family table cellPaddingPt set from geometry');
  assert.deepEqual(famTbl.rowHeightsPt, [30.3, 15.4, 15.3, 15.4, 15.3], 'a02 rowHeightsPt derived from srcRulesPt');

  const rulesOn = estimatePageRules(irOn.pages[0], ls.per[0]);
  const missOn = unmatched(origRules.h, rulesOn.h) + unmatched(origRules.v, rulesOn.v);
  const extraOn = unmatched(rulesOn.h, origRules.h) + unmatched(rulesOn.v, origRules.v);
  assert.ok(missOn < missOff, `a02: rulesMiss must decrease when TBLMERGE is ON (${missOff} -> ${missOn})`);
  assert.ok(extraOn <= extraOff, `a02: rulesExtra must not increase when TBLMERGE is ON (${extraOff} -> ${extraOn})`);
  resetSwitches();
});

test('TABLE_MERGE_v2: a03 preserves GF2 split-box alignment and box-framed digit strip height; a04 derives multi-tier gridSpan & vMerge', () => {
  resetSwitches();
  if (fs.existsSync(path.join(resolveSampleDir('a03'), 'ir.json'))) {
    const { ir: a03Off } = loadSample('a03');
    LF.fit(a03Off);
    const xml03Off = FB.bodyXml(a03Off).xml;

    const { ir: a03On } = loadSample('a03');
    globalThis.__FZ_ON_TBLMERGE = true;
    LF.fit(a03On);
    const xml03On = FB.bodyXml(a03On).xml;
    assert.equal(xml03On, xml03Off, 'a03: GF2 split-box header alignment and box-framed digit strip heights must not be degraded');
  }

  if (fs.existsSync(path.join(resolveSampleDir('a04'), 'ir.json'))) {
    globalThis.__FZ_ON_TBLMERGE = true;
    const { ir: a04On } = loadSample('a04');
    LF.fit(a04On);
    const xml04On = FB.bodyXml(a04On).xml;
    const gs04On = (xml04On.match(/<w:gridSpan\b/g) || []).length;
    const vm04On = (xml04On.match(/<w:vMerge\b/g) || []).length;
    assert.ok(gs04On > 0, `a04: expected gridSpan > 0, got ${gs04On}`);
    assert.ok(vm04On > 0, `a04: expected vMerge > 0, got ${vm04On}`);

    const regTblP1 = a04On.pages[0].bands[3].cells[0].items[0];
    assert.equal(regTblP1.cells[0][0].vmerge, 'restart');
    assert.equal(regTblP1.cells[1][0].vmerge, 'continue');
    assert.equal(regTblP1.cells[0][3].span, 5);
    assert.equal(regTblP1.cells[0][8].span, 5);
    assert.equal(regTblP1.cellPaddingPt, 1);
  }
  resetSwitches();
});
