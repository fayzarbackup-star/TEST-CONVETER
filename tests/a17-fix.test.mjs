import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const LayoutIR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LineFit = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DocxBuilder = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

function resolveA17Dir() {
  const candidates = [
    path.join(ROOT, 'qa/golden-data/asis/a17'),
    path.join(ROOT, 'samples/a17')
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'ir.json'))) return dir;
  }
  throw new Error('Could not find a17 data directory in qa/golden-data/asis/a17 or samples/a17');
}

const A17_DIR = resolveA17Dir();
const rawCapture = JSON.parse(fs.readFileSync(path.join(A17_DIR, 'capture.json'), 'utf8'));
const rawMeasures = JSON.parse(fs.readFileSync(path.join(A17_DIR, 'measures.json'), 'utf8'));
const rawIrJson = fs.readFileSync(path.join(A17_DIR, 'ir.json'), 'utf8');

function cloneCapture() {
  return JSON.parse(JSON.stringify(rawCapture));
}
function cloneIr() {
  return JSON.parse(rawIrJson);
}

function setSwitch(on) {
  if (on) {
    globalThis.__FZ_ON_A17FIX = true;
    delete globalThis.__FZ_OFF_A17FIX;
    if (typeof globalThis.window === 'object' && globalThis.window) {
      globalThis.window.__FZ_ON_A17FIX = true;
    }
  } else {
    delete globalThis.__FZ_ON_A17FIX;
    delete globalThis.__FZ_OFF_A17FIX;
    if (typeof globalThis.window === 'object' && globalThis.window) {
      delete globalThis.window.__FZ_ON_A17FIX;
    }
  }
}

test('A17FIX switch OFF preserves baseline behavior across IR.build, LineFit.fit, planPage, and bodyXml', () => {
  setSwitch(false);
  assert.equal(LayoutIR.a17FixOn(), false);
  assert.equal(LineFit.isA17FixOn(), false);

  const ir = cloneIr();
  // Page 1 baseline has 0 boxes and fontPt=29
  assert.equal((ir.pages[0].boxes || []).length, 0);
  assert.equal(ir.pages[0].bands[0].cells[0].items[0].fontPt, 29);

  // Page 2 baseline has clipped fontPt=15.5 and centerShiftPt=13.7 on Bands 9 & 18, and lineSpacingPt=0 on Band 7
  assert.equal(ir.pages[1].bands[9].cells[0].items[0].fontPt, 15.5);
  assert.equal(ir.pages[1].bands[9].cells[0].items[0].centerShiftPt, 13.7);
  assert.equal(ir.pages[1].bands[7].cells[0].items[0].lineSpacingPt, 0);
  assert.equal(ir.pages[1].bands[25].cells[0].items[0].align, 'l');

  // Page 3 baseline has Band 19 at y0=748
  assert.equal(ir.pages[2].bands[19].y0, 748);

  // Page 10 baseline has table fontPt=9.5
  assert.equal(ir.pages[9].bands[4].cells[0].items[0].fontPt, 9.5);

  const p1Plan = DocxBuilder.planPage(ir.pages[0]);
  assert.equal((ir.pages[0].boxes || []).length, 0);
  assert.ok(Math.abs(p1Plan.els[0].h - 100.1) < 1, 'Baseline Page 1 band height without card boxes is ~100.1pt');
});

test('A17FIX switch ON fixes Page 1 dashed card grid boxes and typography (both build and ir.json paths)', () => {
  setSwitch(true);
  try {
    assert.equal(LayoutIR.a17FixOn(), true);
    assert.equal(LineFit.isA17FixOn(), true);

    const built = LayoutIR.build(cloneCapture(), rawMeasures.measures, rawMeasures.pageInfo);
    LineFit.fit(built);
    const loaded = cloneIr();
    LineFit.fit(loaded);

    for (const [label, doc] of [['built', built], ['ir.json', loaded]]) {
      const p1 = doc.pages[0];
      assert.equal((p1.boxes || []).length, 8, `${label}: Page 1 must recover all 8 dashed card boxes`);
      for (const bx of p1.boxes) {
        assert.equal(bx.dashed, true, `${label}: Card box must be dashed`);
        assert.equal(bx.cardBox, true, `${label}: Card box flag must be set`);
        assert.equal(bx.sz, 24, `${label}: Card border size must be 24`);
      }
      const c0 = p1.bands[0].cells[0].items[0];
      assert.equal(c0.fontPt, 21, `${label}: Card font size must be 21pt`);
      assert.equal(c0.bold, true, `${label}: Card text must be bold`);
      assert.equal(c0.lineSpacingPt, 34, `${label}: Card line spacing must be 34pt exact`);

      const plan = DocxBuilder.planPage(p1);
      assert.equal(plan.f, 1, `${label}: Page 1 must fit without gap compression`);
      assert.equal(plan.els.length, 4, `${label}: Page 1 must have 4 grid rows`);
      plan.els.forEach((el) => assert.equal(el.h, 180, `${label}: Each card row must be 180pt tall`));

      const xml = DocxBuilder.bodyXml({ pages: [p1] }).xml;
      const dashedMatches = xml.match(/w:val="dashed" w:sz="24"/g) || [];
      assert.equal(dashedMatches.length, 32, `${label}: Page 1 XML must contain 32 dashed card borders (8 boxes x 4 sides)`);
    }
  } finally {
    setSwitch(false);
  }
});

test('A17FIX switch ON fixes Page 2 clipped headings, multi-line pitch, repeated slip consistency, and cut-line offset', () => {
  setSwitch(true);
  try {
    const built = LayoutIR.build(cloneCapture(), rawMeasures.measures, rawMeasures.pageInfo);
    LineFit.fit(built);
    const loaded = cloneIr();
    LineFit.fit(loaded);

    for (const [label, doc] of [['built', built], ['ir.json', loaded]]) {
      const p2 = doc.pages[1];
      const b9 = p2.bands[9].cells[0].items[0];
      const b18 = p2.bands[18].cells[0].items[0];
      assert.ok(b9.fontPt >= 23, `${label}: Slip 2 heading font must be restored from 15.5pt to >=23pt (got ${b9.fontPt})`);
      assert.equal(b9.centerShiftPt, 0, `${label}: Slip 2 heading spurious centerShiftPt (+13.7pt) must be cleared`);
      assert.ok(b18.fontPt >= 23, `${label}: Slip 3 heading font must be restored from 15.5pt to >=23pt (got ${b18.fontPt})`);
      assert.equal(b18.centerShiftPt, 0, `${label}: Slip 3 heading spurious centerShiftPt (+13.7pt) must be cleared`);

      // Repeated sub-headings Band 1, 10, 19 unified bold=false
      assert.equal(p2.bands[1].cells[0].items[0].bold, false, `${label}: Band 1 bold unified with Bands 10 & 19`);

      // Multi-line "বিঃ দ্রঃ" paragraphs (Bands 7, 16, 25) have scaled lineSpacingPt (~18.8..20pt), justified keepJust, and left indent
      for (const bi of [7, 16, 25]) {
        const it = p2.bands[bi].cells[0].items[0];
        assert.ok(it.lineSpacingPt >= 18 && it.lineSpacingPt <= 20.5, `${label}: Band ${bi} lineSpacingPt must be ~19pt (got ${it.lineSpacingPt})`);
        assert.equal(it.align, 'j', `${label}: Band ${bi} align must be 'j'`);
        assert.equal(it.keepLines, true, `${label}: Band ${bi} keepLines must be true`);
        assert.equal(it.keepJust, true, `${label}: Band ${bi} keepJust must be true`);
        assert.ok(it.indentPt >= 4.5 && it.indentPt <= 6.5, `${label}: Band ${bi} indentPt must be preserved (~5.7pt, got ${it.indentPt})`);
      }
    }
  } finally {
    setSwitch(false);
  }
});

test('A17FIX switch ON fixes Page 3 empty-tail shifted flow group (Bands 19..21)', () => {
  setSwitch(true);
  try {
    const built = LayoutIR.build(cloneCapture(), rawMeasures.measures, rawMeasures.pageInfo);
    LineFit.fit(built);
    const loaded = cloneIr();
    LineFit.fit(loaded);

    for (const [label, doc] of [['built', built], ['ir.json', loaded]]) {
      const p3 = doc.pages[2];
      // Shifted up by 1 pitch (~28.2pt) from [748.0, 776.2, 797.7] to [719.8, 748.0, 776.2]
      assert.ok(Math.abs(p3.bands[19].y0 - 719.8) <= 0.5, `${label}: Page 3 Band 19 y0 must shift to ~719.8pt (got ${p3.bands[19].y0})`);
      assert.ok(Math.abs(p3.bands[20].y0 - 748.0) <= 0.5, `${label}: Page 3 Band 20 y0 must shift to ~748.0pt (got ${p3.bands[20].y0})`);
      assert.ok(Math.abs(p3.bands[21].y0 - 776.2) <= 0.5, `${label}: Page 3 Band 21 y0 must shift to ~776.2pt (got ${p3.bands[21].y0})`);
      assert.ok(Math.abs(p3.bands[19].gapBeforePt - 15.1) <= 1.0, `${label}: Page 3 Band 19 gapBeforePt must be ~15.1pt (got ${p3.bands[19].gapBeforePt})`);
    }
  } finally {
    setSwitch(false);
  }
});

test('A17FIX switch ON fixes Page 5 multi-wrap list_item (Band 6), Page 6 form tables/rules/signatures, and Page 7 grid ruleBelow', () => {
  setSwitch(true);
  try {
    const built = LayoutIR.build(cloneCapture(), rawMeasures.measures, rawMeasures.pageInfo);
    LineFit.fit(built);
    const loaded = cloneIr();
    LineFit.fit(loaded);

    for (const [label, doc] of [['built', built], ['ir.json', loaded]]) {
      // Page 5 Band 6
      const p5b6 = doc.pages[4].bands[6].cells[0].items[0];
      assert.ok(p5b6.fontPt >= 13, `${label}: Page 5 Band 6 fontPt must not shrink to 11pt (got ${p5b6.fontPt})`);
      assert.equal(p5b6.firstIndentPt, -35.3, `${label}: Page 5 Band 6 hanging indent must be preserved (-35.3pt)`);
      assert.equal(p5b6._multiWrapList, true, `${label}: Page 5 Band 6 must be marked as _multiWrapList`);
      const p5Plan = DocxBuilder.planPage(doc.pages[4]);
      assert.ok(p5Plan.els[6].h >= 60, `${label}: Page 5 Band 6 planned height must reflect 4+ wrapped lines (got ${p5Plan.els[6].h})`);

      // Page 6 Band 2 grid ruleBelow, Band 3 deduped underline, Band 4 firstIndentPt=17.4, Band 8 centered signatures
      const p6 = doc.pages[5];
      assert.ok(p6.bands[2].ruleBelow && Math.abs(p6.bands[2].ruleBelow.srcY - 125.1) <= 0.5, `${label}: Page 6 Band 2 must have ruleBelow at 125.1pt`);
      assert.equal(p6.bands[3].cells[0].items[0].underline, false, `${label}: Page 6 Band 3 duplicate underline must be cleared`);
      assert.ok(p6.bands[3].cells[0].items[0].ruleBelow, `${label}: Page 6 Band 3 ruleBelow must be preserved`);
      assert.equal(p6.bands[4].cells[0].items[0].firstIndentPt, 17.4, `${label}: Page 6 Band 4 firstIndentPt must be 17.4pt`);
      assert.ok(p6.bands[4].cells[0].items[0].lineSpacingPt >= 16, `${label}: Page 6 Band 4 lineSpacingPt must be >=16pt`);
      assert.equal(p6.bands[8].cells[0].items[0].align, 'c', `${label}: Page 6 Band 8 cell 0 must be centered`);
      assert.equal(p6.bands[8].cells[1].items[0].align, 'c', `${label}: Page 6 Band 8 cell 1 must be centered`);
      assert.equal(p6.bands[8].cells[1].items[0].firstIndentPt, 0, `${label}: Page 6 Band 8 cell 1 firstIndentPt must be 0`);

      const p6Xml = DocxBuilder.bodyXml({ pages: [p6] }).xml;
      assert.ok(p6Xml.includes('<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="single"'), `${label}: Page 6 Band 5 open-sided form table must omit top/left/right outer borders`);

      // Page 7 Band 10 grid ruleBelow gap
      const p7 = doc.pages[6];
      const p7Plan = DocxBuilder.planPage(p7);
      assert.ok(p7.bands[10].ruleBelow && p7.bands[10].ruleBelow._gapPt >= 20, `${label}: Page 7 Band 10 ruleBelow gap must be >=20pt (got ${p7.bands[10].ruleBelow && p7.bands[10].ruleBelow._gapPt})`);
    }
  } finally {
    setSwitch(false);
  }
});

test('A17FIX switch ON fixes Page 8 display heading, label font, Page 9 hanging indent, and Page 10 lastRowSpan table', () => {
  setSwitch(true);
  try {
    const built = LayoutIR.build(cloneCapture(), rawMeasures.measures, rawMeasures.pageInfo);
    LineFit.fit(built);
    const loaded = cloneIr();
    LineFit.fit(loaded);

    for (const [label, doc] of [['built', built], ['ir.json', loaded]]) {
      // Page 8
      const p8 = doc.pages[7];
      for (const bi of [2, 9, 16]) {
        const f = p8.bands[bi].cells[0].items[0].fontPt;
        assert.ok(f >= 44 && f <= 46, `${label}: Page 8 Band ${bi} ("উদ্বৃত্ত") fontPt must be ~45.5pt instead of 60pt (got ${f})`);
      }
      for (const bi of [5, 12, 19]) {
        const f = p8.bands[bi].cells[0].items[0].fontPt;
        assert.equal(f, 24.5, `${label}: Page 8 Band ${bi} ("প্রেরক :") fontPt must match 24.5pt (got ${f})`);
      }
      for (const bi of [0, 7, 14]) {
        const it = p8.bands[bi].cells[0].items[0];
        assert.equal(it.fontPt, 13.5, `${label}: Page 8 Band ${bi} fontPt must remain 13.5pt`);
        assert.ok(it.lineSpacingPt >= 19, `${label}: Page 8 Band ${bi} lineSpacingPt must be ~19.6pt (got ${it.lineSpacingPt})`);
      }

      // Page 9 Band 10 hanging indent
      const p9b10 = doc.pages[8].bands[10].cells[0].items[0];
      assert.equal(p9b10.firstIndentPt, -34.7, `${label}: Page 9 Band 10 hanging indent must be -34.7pt`);

      // Page 10 Band 4 table fontPt and last row height
      const p10 = doc.pages[9];
      const p10t = p10.bands[4].cells[0].items[0];
      assert.equal(p10t.fontPt, 11.5, `${label}: Page 10 table fontPt must remain 11.5pt instead of shrinking to 9.5pt`);
      const p10Xml = DocxBuilder.bodyXml({ pages: [p10] }).xml;
      const trHeights = [...p10Xml.matchAll(/w:trHeight w:val="(\d+)"/g)].map((m) => +m[1] / 20);
      assert.equal(trHeights.length, 22, `${label}: Page 10 table must have 22 rows`);
      assert.ok(trHeights[21] <= 18, `${label}: Page 10 table Row 21 ('সর্বমোট =') height must be ~16.7pt instead of 26pt (got ${trHeights[21]})`);
    }
  } finally {
    setSwitch(false);
  }
});
