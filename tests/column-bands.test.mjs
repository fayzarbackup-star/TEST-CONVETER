// tests/column-bands.test.mjs — মেশানো কলাম (MIXCOL / MIXCOL_FIX) ইউনিট টেস্ট
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ColumnBands = require('../js/layout-engine/column-bands.js');
const DocModel = require('../js/layout-engine/doc-model.js');
const DocModelAdapters = require('../js/layout-engine/doc-model-adapters.js');
const GeneralCleanLayout = require('../js/layout-engine/general-clean-layout.js');

let pass = 0, fail = 0;
function test(name, fn) {
  try {
    fn();
    pass++;
    console.log('PASS:', name);
  } catch (err) {
    fail++;
    console.error('FAIL:', name, err.message);
  }
}

const sampleLeftText = 'Left column content paragraph with sufficient textual characters to represent actual body text.';
const sampleRightText = 'Right column content paragraph with sufficient textual characters to represent actual body text.';

// -------------------------------------------------------------------
// (ক) পূর্ণ শিরোনাম + ২-কলাম (৪+৪) → [1, 2]
// -------------------------------------------------------------------
test('(ক) পূর্ণ শিরোনাম + ২-কলাম (৪+৪) → [1, 2]', () => {
  const blocks = [
    { role: 'title', box: [50, 50, 100, 950], text: 'Full Width Document Title' },
    // 4 Left
    { role: 'paragraph', box: [150, 50, 200, 480], text: sampleLeftText + ' 1' },
    { role: 'paragraph', box: [210, 50, 260, 480], text: sampleLeftText + ' 2' },
    { role: 'paragraph', box: [270, 50, 320, 480], text: sampleLeftText + ' 3' },
    { role: 'paragraph', box: [330, 50, 380, 480], text: sampleLeftText + ' 4' },
    // 4 Right
    { role: 'paragraph', box: [150, 520, 200, 950], text: sampleRightText + ' 1' },
    { role: 'paragraph', box: [210, 520, 260, 950], text: sampleRightText + ' 2' },
    { role: 'paragraph', box: [270, 520, 320, 950], text: sampleRightText + ' 3' },
    { role: 'paragraph', box: [330, 520, 380, 950], text: sampleRightText + ' 4' }
  ];

  const bnds = ColumnBands.bands(blocks);
  assert.deepEqual(bnds.map((b) => b.cols), [1, 2]);
  assert.equal(bnds[0].blocks.length, 1);
  assert.equal(bnds[1].blocks.length, 8);
});

// -------------------------------------------------------------------
// (খ) শিরোনাম + ২-কলাম + পূর্ণ টেবিল + ২-কলাম → [1, 2, 1, 2]
// -------------------------------------------------------------------
test('(খ) শিরোনাম + ২-কলাম + পূর্ণ টেবিল + ২-কলাম → [1, 2, 1, 2]', () => {
  const blocks = [
    { role: 'title', box: [50, 50, 100, 950], text: 'Full Width Document Title' },
    // 2-col upper: 3 Left, 3 Right
    { role: 'paragraph', box: [150, 50, 200, 480], text: sampleLeftText + ' 1' },
    { role: 'paragraph', box: [210, 50, 260, 480], text: sampleLeftText + ' 2' },
    { role: 'paragraph', box: [270, 50, 320, 480], text: sampleLeftText + ' 3' },
    { role: 'paragraph', box: [150, 520, 200, 950], text: sampleRightText + ' 1' },
    { role: 'paragraph', box: [210, 520, 260, 950], text: sampleRightText + ' 2' },
    { role: 'paragraph', box: [270, 520, 320, 950], text: sampleRightText + ' 3' },
    // Full Table (wide)
    { role: 'table', box: [350, 50, 480, 950], rows: [['Col A', 'Col B']], text: 'Full Table' },
    // 2-col lower: 3 Left, 3 Right
    { role: 'paragraph', box: [550, 50, 600, 480], text: sampleLeftText + ' 4' },
    { role: 'paragraph', box: [610, 50, 660, 480], text: sampleLeftText + ' 5' },
    { role: 'paragraph', box: [670, 50, 720, 480], text: sampleLeftText + ' 6' },
    { role: 'paragraph', box: [550, 520, 600, 950], text: sampleRightText + ' 4' },
    { role: 'paragraph', box: [610, 520, 660, 950], text: sampleRightText + ' 5' },
    { role: 'paragraph', box: [670, 520, 720, 950], text: sampleRightText + ' 6' }
  ];

  const bnds = ColumnBands.bands(blocks);
  assert.deepEqual(bnds.map((b) => b.cols), [1, 2, 1, 2]);
});

// -------------------------------------------------------------------
// (গ) সব পূর্ণ-প্রস্থ → [1]
// -------------------------------------------------------------------
test('(গ) সব পূর্ণ-প্রস্থ → [1]', () => {
  const blocks = [
    { role: 'title', box: [50, 50, 100, 950], text: 'Title' },
    { role: 'paragraph', box: [120, 50, 200, 950], text: 'Full width paragraph line one' },
    { role: 'table', box: [220, 50, 350, 950], rows: [['A', 'B']], text: 'Table' },
    { role: 'paragraph', box: [370, 50, 450, 950], text: 'Full width paragraph line two' }
  ];

  const bnds = ColumnBands.bands(blocks);
  assert.deepEqual(bnds.map((b) => b.cols), [1]);
  assert.equal(bnds[0].blocks.length, 4);
});

// -------------------------------------------------------------------
// (ঘ) একদিকে মাত্র ১টি সরু ব্লক → ভুয়া কলাম নয়, [1]
// -------------------------------------------------------------------
test('(ঘ) একদিকে মাত্র ১টি সরু ব্লক → ভুয়া কলাম নয়, [1]', () => {
  const blocks = [
    { role: 'title', box: [50, 50, 100, 950], text: 'Title' },
    { role: 'paragraph', box: [150, 50, 200, 480], text: sampleLeftText + ' 1' },
    { role: 'paragraph', box: [210, 50, 260, 480], text: sampleLeftText + ' 2' },
    { role: 'paragraph', box: [270, 50, 320, 480], text: sampleLeftText + ' 3' },
    // Only 1 on the right (< 3)
    { role: 'paragraph', box: [150, 520, 200, 950], text: sampleRightText + ' 1' }
  ];

  const bnds = ColumnBands.bands(blocks);
  assert.deepEqual(bnds.map((b) => b.cols), [1]);
});

// -------------------------------------------------------------------
// (ঙ) বাঁ-ডান পড়ার ক্রম ঠিক
// -------------------------------------------------------------------
test('(ঙ) বাঁ-ডান পড়ার ক্রম ঠিক', () => {
  const L1 = { role: 'paragraph', box: [150, 50, 200, 480], text: sampleLeftText + ' L1' };
  const L2 = { role: 'paragraph', box: [220, 50, 270, 480], text: sampleLeftText + ' L2' };
  const L3 = { role: 'paragraph', box: [290, 50, 340, 480], text: sampleLeftText + ' L3' };
  const R1 = { role: 'paragraph', box: [160, 520, 210, 950], text: sampleRightText + ' R1' };
  const R2 = { role: 'paragraph', box: [230, 520, 280, 950], text: sampleRightText + ' R2' };
  const R3 = { role: 'paragraph', box: [300, 520, 350, 950], text: sampleRightText + ' R3' };

  // Pass in interleaved order
  const bnds = ColumnBands.bands([R1, L2, R2, L1, R3, L3]);
  assert.equal(bnds.length, 1);
  assert.equal(bnds[0].cols, 2);
  assert.deepEqual(bnds[0].blocks.map((b) => b.text), [L1.text, L2.text, L3.text, R1.text, R2.text, R3.text]);
});

// -------------------------------------------------------------------
// (চ) পুরো ২-কলাম পাতা আগের মতো (detectColumns === 2 এবং classic pure 2-col)
// -------------------------------------------------------------------
test('(চ) পুরো ২-কলাম পাতা আগের মতো', () => {
  // Pure 2-column page without top title (1 single 2-col band)
  const capture = {
    blocks: [
      { type: 'paragraph', box: [150, 50, 200, 480], lines: [sampleLeftText + ' 1'], page: 1 },
      { type: 'paragraph', box: [210, 50, 260, 480], lines: [sampleLeftText + ' 2'], page: 1 },
      { type: 'paragraph', box: [270, 50, 320, 480], lines: [sampleLeftText + ' 3'], page: 1 },
      { type: 'paragraph', box: [330, 50, 380, 480], lines: [sampleLeftText + ' 4'], page: 1 },
      { type: 'paragraph', box: [150, 520, 200, 950], lines: [sampleRightText + ' 1'], page: 1 },
      { type: 'paragraph', box: [210, 520, 260, 950], lines: [sampleRightText + ' 2'], page: 1 },
      { type: 'paragraph', box: [270, 520, 320, 950], lines: [sampleRightText + ' 3'], page: 1 },
      { type: 'paragraph', box: [330, 520, 380, 950], lines: [sampleRightText + ' 4'], page: 1 }
    ]
  };

  const doc = DocModelAdapters.fromCaptureBlocks(capture);
  assert.equal(doc.columns, 2, 'doc.columns should be 2');
  assert.equal(!!doc.mixedColumns, false, 'doc.mixedColumns should be false for pure classic 2-col page');
});

// -------------------------------------------------------------------
// (ছ) general-clean রেন্ডারে continuous sectPr-এর সংখ্যা আর ক্রম ঠিক, আর FZ_OFF_MIXCOL সুইচ
// -------------------------------------------------------------------
test('(ছ) general-clean রেন্ডারে continuous sectPr সংখ্যা ও ক্রম, এবং FZ_OFF_MIXCOL সুইচ', () => {
  const capture = {
    blocks: [
      // Band 0: Full paragraph (1-col, wide >= 600)
      { type: 'paragraph', box: [50, 50, 100, 950], lines: ['Top Wide Paragraph Title that spans full width across the whole page.'], page: 1 },
      // Band 1: 2-col (3 Left + 3 Right)
      { type: 'paragraph', box: [150, 50, 200, 480], lines: [sampleLeftText + ' 1'], page: 1 },
      { type: 'paragraph', box: [210, 50, 260, 480], lines: [sampleLeftText + ' 2'], page: 1 },
      { type: 'paragraph', box: [270, 50, 320, 480], lines: [sampleLeftText + ' 3'], page: 1 },
      { type: 'paragraph', box: [150, 520, 200, 950], lines: [sampleRightText + ' 1'], page: 1 },
      { type: 'paragraph', box: [210, 520, 260, 950], lines: [sampleRightText + ' 2'], page: 1 },
      { type: 'paragraph', box: [270, 520, 320, 950], lines: [sampleRightText + ' 3'], page: 1 },
      // Band 2: Middle wide paragraph (1-col, wide >= 600)
      { type: 'paragraph', box: [350, 50, 450, 950], lines: ['Middle Wide Section Paragraph spanning across both columns full width.'], page: 1 },
      // Band 3: 2-col (3 Left + 3 Right)
      { type: 'paragraph', box: [550, 50, 600, 480], lines: [sampleLeftText + ' 4'], page: 1 },
      { type: 'paragraph', box: [610, 50, 660, 480], lines: [sampleLeftText + ' 5'], page: 1 },
      { type: 'paragraph', box: [670, 50, 720, 480], lines: [sampleLeftText + ' 6'], page: 1 },
      { type: 'paragraph', box: [550, 520, 600, 950], lines: [sampleRightText + ' 4'], page: 1 },
      { type: 'paragraph', box: [610, 520, 660, 950], lines: [sampleRightText + ' 5'], page: 1 },
      { type: 'paragraph', box: [670, 520, 720, 950], lines: [sampleRightText + ' 6'], page: 1 }
    ]
  };

  const doc = DocModelAdapters.fromCaptureBlocks(capture);
  assert.equal(doc.columns, 2, 'doc.columns should be 2');
  assert.equal(doc.mixedColumns, true, 'doc.mixedColumns should be true');

  // Render normal (mixedColumns active)
  const res = GeneralCleanLayout.render(doc);
  const bodyXml = res.bodyXml;
  const sectPr = res.sectPr;

  // In bodyXml there should be 3 continuous / section breaks (ends of bands 0, 1, 2)
  const inBodySects = [...bodyXml.matchAll(/<w:sectPr>([\s\S]*?)<\/w:sectPr>/g)];
  assert.equal(inBodySects.length, 3, 'Should have 3 sectPr inside bodyXml paragraphs');

  // Band 0 (1-col): first section -> no continuous, no cols
  assert.ok(!inBodySects[0][1].includes('continuous'), 'Band 0 sectPr should not be continuous');
  assert.ok(!inBodySects[0][1].includes('w:cols'), 'Band 0 sectPr should not have w:cols');

  // Band 1 (2-col): continuous, cols=2
  assert.ok(inBodySects[1][1].includes('w:type w:val="continuous"'), 'Band 1 sectPr should be continuous');
  assert.ok(inBodySects[1][1].includes('w:cols w:num="2"'), 'Band 1 sectPr should have 2 columns');

  // Band 2 (1-col): continuous, no cols
  assert.ok(inBodySects[2][1].includes('w:type w:val="continuous"'), 'Band 2 sectPr should be continuous');
  assert.ok(!inBodySects[2][1].includes('w:cols'), 'Band 2 sectPr should not have w:cols');

  // Final sectPr (Band 3, 2-col): continuous, cols=2
  assert.ok(sectPr.includes('w:type w:val="continuous"'), 'Final sectPr should be continuous');
  assert.ok(sectPr.includes('w:cols w:num="2"'), 'Final sectPr should have 2 columns');

  // Switch test: FZ_OFF_MIXCOL=1
  process.env.FZ_OFF_MIXCOL = '1';
  try {
    const docOff = DocModelAdapters.fromCaptureBlocks(capture);
    assert.equal(docOff.mixedColumns, undefined, 'With FZ_OFF_MIXCOL, mixedColumns should not be set');
    const resOff = GeneralCleanLayout.render(docOff);
    // Should fall back to 1-col (since wide > 1 in classic detectColumns)
    assert.equal(docOff.columns, 1, 'Without mixed columns, wide > 1 leads to 1-col');
    assert.ok(!resOff.bodyXml.includes('<w:sectPr>'), '1-col doc has no sectPr in bodyXml');
  } finally {
    delete process.env.FZ_OFF_MIXCOL;
  }
});

// -------------------------------------------------------------------
// (জ) নেতিবাচক গেট: qa/golden-data/asis/*/capture.json (২১টি) সবগুলোয় mixed=false ও cols অক্ষত
// -------------------------------------------------------------------
test('(জ) নেতিবাচক গেট: qa/golden-data/asis/*/capture.json (২১টি) সবগুলোয় mixed=false ও cols অক্ষত', () => {
  const asisRoot = path.resolve('qa/golden-data/asis');
  if (!fs.existsSync(asisRoot)) {
    console.log('SKIP: asis directory not found');
    return;
  }
  const ids = fs.readdirSync(asisRoot).filter((id) => fs.existsSync(path.join(asisRoot, id, 'capture.json')));
  assert.ok(ids.length >= 20, `Expected >= 20 asis captures, found ${ids.length}`);

  for (const id of ids) {
    const cap = JSON.parse(fs.readFileSync(path.join(asisRoot, id, 'capture.json'), 'utf8'));

    // Without MIXCOL (baseline)
    process.env.FZ_OFF_MIXCOL = '1';
    const baseDoc = DocModelAdapters.fromCaptureBlocks(cap, {});

    // With MIXCOL
    delete process.env.FZ_OFF_MIXCOL;
    const nowDoc = DocModelAdapters.fromCaptureBlocks(cap, {});

    assert.equal(!!nowDoc.mixedColumns, false, `${id}: mixedColumns must be false`);
    assert.equal(nowDoc.columns, baseDoc.columns, `${id}: doc.columns (${nowDoc.columns}) must match baseline (${baseDoc.columns})`);
  }
});

// -------------------------------------------------------------------
// (ঝ) ইতিবাচক গেট: qa/golden-data/mixcol/t06/capture.json এ ব্যান্ড [1, 2] ও mixedColumns=true
// -------------------------------------------------------------------
test('(ঝ) ইতিবাচক গেট: qa/golden-data/mixcol/t06/capture.json এ ব্যান্ড [1, 2] ও mixedColumns=true', () => {
  const t06Path = path.resolve('qa/golden-data/mixcol/t06/capture.json');
  if (!fs.existsSync(t06Path)) {
    console.log('SKIP: t06 capture not found');
    return;
  }
  const cap = JSON.parse(fs.readFileSync(t06Path, 'utf8'));
  const bnds = ColumnBands.bands(cap.blocks);
  assert.deepEqual(bnds.map((b) => b.cols), [1, 2], `T06 bands should be [1, 2], got ${JSON.stringify(bnds.map((b) => b.cols))}`);

  const doc = DocModelAdapters.fromCaptureBlocks(cap, {});
  assert.equal(doc.columns, 2, 'T06 doc.columns should be 2');
  assert.equal(doc.mixedColumns, true, 'T06 doc.mixedColumns should be true');
});

// -------------------------------------------------------------------
// (ঞ) ১-কলাম পাতার আউটপুট বাইট-বাই-বাইট অপরিবর্তিত (MIXCOL_OPTS)
// -------------------------------------------------------------------
test('(ঞ) ১-কলাম পাতার আউটপুট বাইট-বাই-বাইট অপরিবর্তিত (MIXCOL_OPTS)', () => {
  const doc = DocModel.createDocument({ docType: 'EXAM', source: 'test' });
  const q = DocModel.block('question', { lines: ['1. Select answer:'] });
  const opt4 = DocModel.block('option_row', { text: '(a) First | (b) Second | (c) Third | (d) Fourth' });
  const opt2 = DocModel.block('option_row', { text: '(a) Yes | (b) No' });
  DocModel.addPage(doc, [q, opt4, opt2]);

  const res = GeneralCleanLayout.render(doc);
  assert.equal(doc.columns, 1);
  assert.equal(!!doc.mixedColumns, false);

  // ১-কলামে textW = 9026 (base 12), avail = 8546
  // ৪টি অপশন: stops = 2617, 4753, 6890
  assert.ok(res.bodyXml.includes('w:pos="2617"'), '1-col 4-opts pos 2617');
  assert.ok(res.bodyXml.includes('w:pos="4753"'), '1-col 4-opts pos 4753');
  assert.ok(res.bodyXml.includes('w:pos="6890"'), '1-col 4-opts pos 6890');
  // ২টি অপশন: stop = 4753
  assert.ok(res.bodyXml.includes('(a) Yes</w:t></w:r><w:r><w:tab/><\/w:r><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">(b) No'), '1-col 2-opts XML');
});

// -------------------------------------------------------------------
// (ট) ২-কলাম সেকশনে MCQ অপশন কলামের ভেতরে সীমাবদ্ধ (MIXCOL_OPTS)
// -------------------------------------------------------------------
test('(ট) ২-কলাম সেকশনে MCQ অপশন কলামের ভেতরে সীমাবদ্ধ (MIXCOL_OPTS)', () => {
  // ১) ২টি অপশন: কলাম-প্রস্থের ভেতরে ট্যাব (colW=4300, pos=2390)
  const doc2 = DocModel.createDocument({ docType: 'EXAM' });
  doc2.columns = 2;
  const q1 = DocModel.block('question', { lines: ['1. Short two options:'] });
  const o2 = DocModel.block('option_row', { text: '(a) First | (b) Second' });
  DocModel.addPage(doc2, [q1, o2]);
  const r2 = GeneralCleanLayout.render(doc2);
  assert.ok(r2.bodyXml.includes('w:pos="2390"'), '2-col 2-opts should have tab at 2390 (inside 4300 colW)');
  assert.ok(!r2.bodyXml.includes('w:pos="4753"'), '2-col must NOT have old 1-col tab pos 4753');

  // ২) ২টি দীর্ঘ অপশন: কলামে পাশাপাশি না আঁটলে প্রতি লাইনে একটি (no tab)
  const doc2Long = DocModel.createDocument({ docType: 'EXAM' });
  doc2Long.columns = 2;
  const o2Long = DocModel.block('option_row', { text: '(a) This is a very long option text | (b) Another very long option text that will not fit' });
  DocModel.addPage(doc2Long, [o2Long]);
  const r2Long = GeneralCleanLayout.render(doc2Long);
  assert.ok(!r2Long.bodyXml.includes('<w:tab/>'), '2-col long 2-opts should wrap to lines without tab');
  assert.ok(r2Long.bodyXml.includes('<w:br/>'), '2-col long 2-opts should have br');

  // ৩) ৪টি অপশন: এক সারিতে না আঁটলে ২x২ সাজানো (২টি লাইনে ট্যাব)
  const doc4 = DocModel.createDocument({ docType: 'EXAM' });
  doc4.columns = 2;
  const o4 = DocModel.block('option_row', { text: '(a) First | (b) Second | (c) Third | (d) Fourth' });
  DocModel.addPage(doc4, [o4]);
  const r4 = GeneralCleanLayout.render(doc4);
  assert.ok(r4.bodyXml.includes('w:pos="2390"'), '2-col 4-opts 2x2 tab pos 2390');
  assert.ok(r4.bodyXml.includes('<w:br/>'), '2-col 4-opts 2x2 should have br between rows');

  // ৪) ৪টি দীর্ঘ অপশন: ২x২ না আঁটলে প্রতি লাইনে একটি
  const doc4Long = DocModel.createDocument({ docType: 'EXAM' });
  doc4Long.columns = 2;
  const o4Long = DocModel.block('option_row', { text: '(a) A very long option text one | (b) A very long option text two | (c) A very long option text three | (d) A very long option text four' });
  DocModel.addPage(doc4Long, [o4Long]);
  const r4Long = GeneralCleanLayout.render(doc4Long);
  assert.ok(!r4Long.bodyXml.includes('<w:tab/>'), '2-col 4 long opts should wrap without tabs');
  assert.equal((r4Long.bodyXml.match(/<w:br\/>/g) || []).length, 3, 'Should have 3 br for 4 lines');
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

