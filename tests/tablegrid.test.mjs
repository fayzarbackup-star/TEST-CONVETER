/**
 * B_TABLE_FIX_v7 — হুবহু-মোডে টেবিল রেখা-জাল পরীক্ষা (WORK_PLAN B2, সুইচ __FZ_ON_TABLEGRID)
 * ========================================================================================
 * কৃত্রিম রেখা-জাল (page-geometry.js → layout-ir.js → faithful-docx-builder.js) থেকে:
 *  ১) কলাম-সীমা ও অসমান কলাম-প্রস্থ (verticalRules / horizontalRules / tableRowBands)
 *  ২) অনুভূমিক ও খাড়া রেখা আলাদা (insideH বনাম insideV)
 *  ৩) সারি ও ঘর Merge (mergeLineRows, gridSpan, vMerge) — মেট্রিক ও ক্যানভাস উভয় পথে এবং সহায়ক মডিউল (FayzarHeaderMerge / FayzarGridFirst) সক্রিয় থাকা অবস্থায়ও
 *  ৪) ফাঁকা সারিতে ও সাদা ফাঁকে টেবিল ভাগ (splitTableAtGaps) — মেট্রিক ও সহায়ক মডিউল সক্রিয় থাকা অবস্থায়ও
 *  ৫) পাশাপাশি ছোট বাক্স শনাক্তকরণ ও বর্ডার সংরক্ষণ (detectSmallBoxes / smallBoxesPt)
 *  ৬) শিরোনাম-ঘরের মোটা লেখা (bold) ও নিচে-দাগ (underline)
 *  ৭) সুইচ বন্ধে (__FZ_ON_TABLEGRID = false) আউটপুট বাইট-বাই-বাইট অপরিবর্তিত থাকা
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const PG = require('../js/layout-engine/faithful/page-geometry.js');
const IR = require('../js/layout-engine/faithful/layout-ir.js');
const Docx = require('../js/layout-engine/faithful/faithful-docx-builder.js');

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ব্যর্থ: ${name}${detail ? ' — ' + detail : ''}`);
  }
}

/** কৃত্রিম কালি-মানচিত্র (W×H) তৈরির সহায়ক */
function makeCanvasMask(W, H) {
  const mask = new Uint8Array(W * H);
  const drawHLine = (x0, x1, y, t = 2) => {
    for (let dy = 0; dy < t; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= H) continue;
      for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) mask[yy * W + x] = 1;
    }
  };
  const drawVLine = (x, y0, y1, t = 2) => {
    for (let dx = 0; dx < t; dx++) {
      const xx = x + dx;
      if (xx < 0 || xx >= W) continue;
      for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) mask[y * W + xx] = 1;
    }
  };
  const drawRect = (x0, y0, x1, y1, t = 2) => {
    drawHLine(x0, x1, y0, t);
    drawHLine(x0, x1, y1 - t + 1, t);
    drawVLine(x0, y0, y1, t);
    drawVLine(x1 - t + 1, y0, y1, t);
  };
  const drawTextBlob = (x0, y0, w, h, stroke = 2) => {
    for (let x = x0; x < x0 + w; x += stroke + 2) {
      for (let dx = 0; dx < stroke && x + dx < x0 + w; dx++) {
        for (let y = y0; y < y0 + h; y++) mask[y * W + (x + dx)] = 1;
      }
    }
  };
  return { W, H, mask, drawHLine, drawVLine, drawRect, drawTextBlob };
}

function wrapTableIr(tblItems) {
  const items = Array.isArray(tblItems) ? tblItems : [tblItems];
  return {
    pages: [{
      page: 1,
      widthPt: 595.3,
      heightPt: 841.9,
      margins: { top: 54, right: 54, bottom: 54, left: 54 },
      scale: 1,
      bodyFontPt: 12,
      bands: items.map((it, idx) => ({
        kind: 'flow',
        gapBeforePt: idx ? 12 : 0,
        y0: it.rect ? it.rect.y : 100 + idx * 100,
        y1: it.rect ? it.rect.y + it.rect.h : 180 + idx * 100,
        cells: [{ x0: 54, x1: 541.3, items: [it] }]
      }))
    }],
    warnings: []
  };
}

// ============================================================================
// ১. সুইচ বন্ধে (__FZ_ON_TABLEGRID = false) আচরণ অপরিবর্তিত যাচাই
// ============================================================================
console.log('১. সুইচ বন্ধে (__FZ_ON_TABLEGRID = false) অপরিবর্তিত আউটপুট যাচাই:');
{
  delete globalThis.__FZ_ON_TABLEGRID;

  const block = {
    i: 0,
    type: 'table',
    page: 1,
    box: [100, 100, 300, 900],
    lines: [
      'ক্রমিক | বিবরণ | মন্তব্য',
      '১ | বই ক্রয় | সম্পন্ন',
      ' |  | ',
      '২ | খাতা ক্রয় | বাকি'
    ]
  };
  const m = {
    empty: false,
    hasGrid: true,
    rectPt: { x: 60, y: 100, w: 400, h: 120 },
    hRulesPt: [100, 220],
    vRulesPt: [{ x: 60, cov: 1 }, { x: 140, cov: 1 }, { x: 340, cov: 1 }, { x: 460, cov: 1 }],
    headBold: true,
    headUnderline: true
  };

  const itemOff1 = IR.toItem(block, JSON.parse(JSON.stringify(m)), {});
  const xmlOff1 = Docx.bodyXml(wrapTableIr(JSON.parse(JSON.stringify(itemOff1)))).xml;

  globalThis.__FZ_ON_TABLEGRID = true;
  const itemOn = IR.toItem(block, JSON.parse(JSON.stringify(m)), {});
  const xmlOn = Docx.bodyXml(wrapTableIr(JSON.parse(JSON.stringify(itemOn)))).xml;

  globalThis.__FZ_ON_TABLEGRID = false;
  const itemOff2 = IR.toItem(block, JSON.parse(JSON.stringify(m)), {});
  const xmlOff2 = Docx.bodyXml(wrapTableIr(JSON.parse(JSON.stringify(itemOff2)))).xml;

  check('সুইচ বন্ধে ও পুনরায় বন্ধে IR আউটপুট হুবহু এক', JSON.stringify(itemOff1) === JSON.stringify(itemOff2));
  check('সুইচ বন্ধে ও পুনরায় বন্ধে DOCX XML বাইট-বাই-বাইট হুবহু এক', xmlOff1 === xmlOff2);
  check('সুইচ চালু করলে নতুন B2 বৈশিষ্ট্য সক্রিয় হয়', xmlOn !== xmlOff1);
}

// ============================================================================
// ২. কৃত্রিম রেখা-জাল → কলাম-সীমা ও প্রত্যাশিত কলাম-প্রস্থ (verticalRules/horizontalRules/tableRowBands)
// ============================================================================
console.log('\n২. কৃত্রিম রেখা-জাল থেকে কলাম-সীমা ও কলাম-প্রস্থ যাচাই:');
{
  globalThis.__FZ_ON_TABLEGRID = true;

  // ৬০০×৪০০ ক্যানভাসে x = 60, 140, 340, 460 (প্রস্থ: 80, 200, 120; অনুপাত: 0.20, 0.50, 0.30)
  // এবং y = 80, 120, 160, 200 (৩টি সারি-ব্যান্ড)
  const cv = makeCanvasMask(600, 400);
  [80, 120, 160, 200].forEach((y) => cv.drawHLine(60, 460, y, 2));
  [60, 140, 340, 460].forEach((x) => cv.drawVLine(x, 80, 200, 2));

  const vRules = PG.verticalRules(cv, { box: [150, 80, 550, 800], pxPerPt: 1 });
  const hRules = PG.horizontalRules(cv, { pxPerPt: 1 });
  const rowBands = PG.tableRowBands(cv, [150, 80, 550, 800], { pxPerPt: 1 });

  check('page-geometry.verticalRules আড়াআড়ি দাগে জোড়া থাকা ৪টি খাড়া রেখা (60, 140, 340, 460) শনাক্ত করেছে',
    vRules.length === 4 && Math.abs(vRules[0].x - 60) <= 2 && Math.abs(vRules[1].x - 140) <= 2 && Math.abs(vRules[2].x - 340) <= 2 && Math.abs(vRules[3].x - 460) <= 2);
  check('page-geometry.horizontalRules ৪টি আনুভূমিক রেখা (80, 120, 160, 200) শনাক্ত করেছে',
    hRules.length === 4);
  check('page-geometry.tableRowBands ঠিক ৩টি সারি-ব্যান্ড শনাক্ত করেছে',
    Array.isArray(rowBands) && rowBands.length === 3);

  const bm = PG.blockMetrics(cv, [150, 80, 550, 800], { isTable: true, pxPerPt: 1 });
  const tblBlock = {
    i: 0,
    type: 'table',
    page: 1,
    box: [150, 80, 550, 800],
    lines: [
      'ক্রমিক | বিবরণ | টাকার পরিমাণ',
      '১ | আসবাবপত্র সরবরাহ | ৫০০০',
      '২ | মেরামত ব্যয় | ২০০০'
    ]
  };
  const tblItem = IR.toItem(tblBlock, bm, {});
  check('রেখা-জাল থেকে কলাম-প্রস্থের অনুপাত (0.20 : 0.50 : 0.30) নিখুঁতভাবে নির্ণীত হয়েছে',
    Array.isArray(tblItem.colFractions) && tblItem.colFractions.length === 3
    && Math.abs(tblItem.colFractions[0] - 0.2) < 0.02
    && Math.abs(tblItem.colFractions[1] - 0.5) < 0.02
    && Math.abs(tblItem.colFractions[2] - 0.3) < 0.02);

  const xml = Docx.bodyXml(wrapTableIr(Object.assign({}, tblItem, { widthPt: 400 }))).xml;
  const gridCols = [...xml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => +m[1]);
  check('DOCX w:gridCol প্রস্থসমূহ রেখা-জালের অনুপাত (২য় কলাম ১ম কলামের ২.৫ গুণ) মেনে তৈরি হয়েছে',
    gridCols.length === 3 && Math.abs(gridCols[1] / gridCols[0] - 2.5) < 0.15);
}

// ============================================================================
// ৩. কৃত্রিম রেখা-জাল → সারি ও ঘর Merge (mergeLineRows, gridSpan, vMerge)
// ============================================================================
console.log('\n৩. কৃত্রিম রেখা-জাল থেকে সারি ও ঘর Merge যাচাই:');
{
  globalThis.__FZ_ON_TABLEGRID = true;

  // ক) সারি-ব্যান্ড থেকে বহু-লাইনের সারি Merge (৪টি মুদ্রিত লাইন কিন্তু ২টি সারি-ব্যান্ড)
  const mergedRows = IR.mergeLineRows(
    [
      ['১।', 'প্রথম সারির প্রথম লাইন'],
      ['', 'প্রথম সারির দ্বিতীয় লাইন'],
      ['২।', 'দ্বিতীয় সারির প্রথম লাইন'],
      ['', 'দ্বিতীয় সারির দ্বিতীয় লাইন']
    ],
    {
      empty: false,
      tableRowBands: [{ y0: 100, y1: 140 }, { y0: 140, y1: 180 }],
      textLinesPt: [112, 128, 152, 168]
    }
  );
  check('tableRowBands অনুযায়ী ৪টি মুদ্রিত লাইন ২টি সারিতে (ঘরে \\n-সহ) Merge হয়েছে',
    Array.isArray(mergedRows) && mergedRows.length === 2
    && mergedRows[0][1] === 'প্রথম সারির প্রথম লাইন\nপ্রথম সারির দ্বিতীয় লাইন'
    && mergedRows[1][1] === 'দ্বিতীয় সারির প্রথম লাইন\nদ্বিতীয় সারির দ্বিতীয় লাইন');

  // খ) আংশিক খাড়া ও অনুভূমিক রেখা থেকে অনুভূমিক (gridSpan) ও উল্লম্ব (vMerge) ঘর Merge
  const spanBlock = {
    i: 0,
    type: 'table',
    page: 1,
    box: [100, 100, 300, 900],
    lines: [
      'বার্ষিক প্রতিবেদন ছক |  | ',
      'বিভাগ | খাত ১ | ১০০',
      ' | খাত ২ | ২০০'
    ]
  };
  const spanMetrics = {
    empty: false,
    hasGrid: true,
    rectPt: { x: 60, y: 100, w: 300, h: 90 },
    hRulesPt: [100, 130, 160, 190],
    // ২য় সারি-রেখা (y=160) ১ম কলাম (60..160) এড়িয়ে শুধু 160..360 পর্যন্ত বিস্তৃত ⇒ ১ম কলামে ২য় ও ৩য় সারি উল্লম্ব Merge
    hRuleSpansPt: [[60, 360], [60, 360], [160, 360], [60, 360]],
    // ভেতরের খাড়া দাগ দুটি (x=160, 260) ১ম সারি (100..130) এড়িয়ে y=130..190 পর্যন্ত ⇒ ১ম সারিতে ৩ কলাম জুড়ে gridSpan
    vRulesPt: [
      { x: 60, y0: 100, y1: 190, cov: 1 },
      { x: 160, y0: 130, y1: 190, cov: 0.67 },
      { x: 260, y0: 130, y1: 190, cov: 0.67 },
      { x: 360, y0: 100, y1: 190, cov: 1 }
    ]
  };
  const spanTbl = IR.toItem(spanBlock, spanMetrics, {});
  const spanXml = Docx.bodyXml(wrapTableIr(Object.assign({}, spanTbl, { widthPt: 300, heightPt: 90 }))).xml;

  check('আংশিক খাড়া রেখা থেকে ১ম সারিতে ৩-কলাম জুড়ে অনুভূমিক Merge (<w:gridSpan w:val="3"/>) হয়েছে',
    spanXml.includes('<w:gridSpan w:val="3"/>'));
  check('আংশিক অনুভূমিক রেখা থেকে ১ম কলামে উল্লম্ব Merge (<w:vMerge w:val="restart"/> ও <w:vMerge/>) হয়েছে',
    spanXml.includes('<w:vMerge w:val="restart"/>') && spanXml.includes('<w:vMerge/>'));

  // গ) সরাসরি ক্যানভাস (PG.blockMetrics) থেকে আংশিক খাড়া ও অনুভূমিক রেখা মাপা এবং Merge যাচাই
  const cvSpan = makeCanvasMask(450, 260);
  cvSpan.drawHLine(60, 360, 100, 2);
  cvSpan.drawHLine(60, 360, 130, 2);
  cvSpan.drawHLine(160, 360, 160, 2); // ১ম কলাম (60..160) এড়িয়ে আংশিক অনুভূমিক রেখা
  cvSpan.drawHLine(60, 360, 190, 2);
  cvSpan.drawVLine(60, 100, 191, 2);
  cvSpan.drawVLine(160, 130, 191, 2); // ১ম সারি (100..130) এড়িয়ে আংশিক খাড়া রেখা
  cvSpan.drawVLine(260, 130, 191, 2); // ১ম সারি (100..130) এড়িয়ে আংশিক খাড়া রেখা
  cvSpan.drawVLine(360, 100, 191, 2);
  const bmSpan = PG.blockMetrics(cvSpan, [300, 100, 800, 900], { isTable: true, pxPerPt: 1 });
  const cvSpanTbl = IR.toItem(spanBlock, bmSpan, {});
  const cvSpanXml = Docx.bodyXml(wrapTableIr(Object.assign({}, cvSpanTbl, { widthPt: 300, heightPt: 90 }))).xml;
  check('ক্যানভাস থেকে মাপা আংশিক রেখা-জালেও gridSpan="3" এবং vMerge (restart ও continue) সঠিকভাবে তৈরি হয়েছে',
    cvSpanXml.includes('<w:gridSpan w:val="3"/>') && cvSpanXml.includes('<w:vMerge w:val="restart"/>') && cvSpanXml.includes('<w:vMerge/>'));
}

// ============================================================================
// ৪. ফাঁকা সারিতে ও সাদা ফাঁকে টেবিল ভাগ (splitTableAtGaps)
// ============================================================================
console.log('\n৪. ফাঁকা সারিতে টেবিল ভাগ যাচাই:');
{
  globalThis.__FZ_ON_TABLEGRID = true;

  const multiTblBlock = {
    i: 0,
    type: 'table',
    page: 1,
    box: [100, 100, 400, 900],
    lines: [
      'A | Apple',
      'B | Ball',
      ' | ',
      'C | Cat',
      'D | Dog'
    ]
  };
  const splitParts = IR.toItem(multiTblBlock, {
    empty: false,
    hasGrid: true,
    rectPt: { x: 60, y: 100, w: 360, h: 160 },
    tableGapsPt: [[170, 190]]
  }, {});

  check('ফাঁকা সারিতে টেবিল ভাগ হয়ে ২টি আলাদা টেবিল আইটেম তৈরি হয়েছে',
    Array.isArray(splitParts) && splitParts.length === 2
    && splitParts[0].rows.length === 2 && splitParts[1].rows.length === 2);

  // tableGapsPt না থাকলেও ফাঁকা সারিতে স্বয়ংক্রিয় ভাগ যাচাই
  const splitByEmptyRow = IR.toItem(multiTblBlock, {
    empty: false,
    hasGrid: false,
    rectPt: { x: 60, y: 100, w: 360, h: 160 }
  }, {});
  check('tableGapsPt ছাড়াও ফাঁকা বিভাজক সারিতে ২টি আলাদা টেবিলে ভাগ হয়েছে',
    Array.isArray(splitByEmptyRow) && splitByEmptyRow.length === 2);

  const splitXml = Docx.bodyXml(wrapTableIr(splitParts)).xml;
  const tblCount = (splitXml.match(/<w:tbl>/g) || []).length;
  check('DOCX XML-এ ২টি পৃথক <w:tbl> তৈরি হয়েছে', tblCount === 2);
}

// ============================================================================
// ৫. অনুভূমিক আর খাড়া রেখা আলাদা (insideH বনাম insideV)
// ============================================================================
console.log('\n৫. অনুভূমিক আর খাড়া রেখা আলাদা (insideH / insideV) যাচাই:');
{
  globalThis.__FZ_ON_TABLEGRID = true;

  // নামতার ছক: শুধু বাইরের চার পাশের রেখা + খাড়া কলাম-রেখা আছে, ভেতরে কোনো অনুভূমিক সারি-রেখা নেই
  const namtaBlock = {
    i: 0,
    type: 'table',
    page: 1,
    box: [100, 100, 300, 900],
    lines: [
      '২ × ১ = ২ | ৩ × ১ = ৩',
      '২ × ২ = ৪ | ৩ × ২ = ৬',
      '২ × ৩ = ৬ | ৩ × ৩ = ৯'
    ]
  };
  const namtaItem = IR.toItem(namtaBlock, {
    empty: false,
    hasGrid: true,
    rectPt: { x: 60, y: 100, w: 320, h: 90 },
    hRulesPt: [100, 190], // শুধু ওপর ও নিচের রেখা
    vRulesPt: [{ x: 60, cov: 1 }, { x: 220, cov: 1 }, { x: 380, cov: 1 }]
  }, {});
  const namtaXml = Docx.bodyXml(wrapTableIr(Object.assign({}, namtaItem, { widthPt: 320, heightPt: 90 }))).xml;

  check('নামতার ছকে ভেতরের অনুভূমিক রেখা বন্ধ (<w:insideH w:val="nil"/>) এবং খাড়া রেখা চালু (<w:insideV w:val="single") আছে',
    namtaXml.includes('<w:insideH w:val="nil"/>') && namtaXml.includes('<w:insideV w:val="single"'));

  // শুধু অনুভূমিক রেখাওয়ালা ছক (খাড়া রেখা নেই)
  const hOnlyItem = IR.toItem(namtaBlock, {
    empty: false,
    hasGrid: true,
    rectPt: { x: 60, y: 100, w: 320, h: 90 },
    hRulesPt: [100, 130, 160, 190],
    vRulesPt: []
  }, {});
  const hOnlyXml = Docx.bodyXml(wrapTableIr(Object.assign({}, hOnlyItem, { widthPt: 320, heightPt: 90 }))).xml;

  check('শুধু-অনুভূমিক ছকে <w:insideH w:val="single" চালু এবং <w:insideV w:val="nil"/> বন্ধ আছে',
    hOnlyXml.includes('<w:insideH w:val="single"') && hOnlyXml.includes('<w:insideV w:val="nil"/>'));
}

// ============================================================================
// ৬. পাশাপাশি ছোট বাক্স চেনা ও শিরোনাম-ঘরের মোটা লেখা/নিচে-দাগ
// ============================================================================
console.log('\n৬. পাশাপাশি ছোট বাক্স ও শিরোনাম-ঘরের মোটা/নিচে-দাগ যাচাই:');
{
  globalThis.__FZ_ON_TABLEGRID = true;

  // ক) ৪টি আলাদা ছোট বাক্স পাশাপাশি (মাঝে ২০px ফাঁক)
  const cvBoxes = makeCanvasMask(500, 120);
  cvBoxes.drawRect(40, 30, 90, 70, 2);
  cvBoxes.drawRect(110, 30, 160, 70, 2);
  cvBoxes.drawRect(180, 30, 230, 70, 2);
  cvBoxes.drawRect(250, 30, 300, 70, 2);

  const bmBoxes = PG.blockMetrics(cvBoxes, [100, 50, 800, 700], { isTable: true, pxPerPt: 1 });
  check('পাশাপাশি ৪টি ছোট বাক্স শনাক্ত হয়েছে (smallBoxesPt.length === 4 ও hasGrid === true)',
    bmBoxes.hasGrid === true && Array.isArray(bmBoxes.smallBoxesPt) && bmBoxes.smallBoxesPt.length === 4);

  const boxRowItem = IR.toItem({
    i: 0,
    type: 'table',
    page: 1,
    box: [100, 50, 800, 700],
    lines: ['২৫ | ৪২ | ১৯ | ৩৮']
  }, bmBoxes, {});
  const boxRowXml = Docx.bodyXml(wrapTableIr(boxRowItem)).xml;
  const borderedCells = (boxRowXml.match(/<w:tcBorders><w:top w:val="single"/g) || []).length;
  check('DOCX-এ ৪টি ছোট বাক্সের প্রতিটির নিজস্ব ৪-পাশের বর্ডার এবং মাঝের ফাঁকা স্থান বর্ডারহীন হিসেবে তৈরি হয়েছে',
    borderedCells === 4 && (boxRowXml.match(/<w:gridCol /g) || []).length === 7);

  // খ) শিরোনাম-ঘরের মোটা লেখা (bold) ও নিচে-দাগ (underline)
  const cvHdr = makeCanvasMask(400, 180);
  cvHdr.drawRect(40, 20, 340, 120, 2);
  cvHdr.drawHLine(40, 340, 60, 2);
  cvHdr.drawVLine(180, 20, 120, 2);
  // শিরোনাম সারিতে (y=32..46) মোটা কালি (stroke=4) ও নিচে-দাগ (y=50)
  cvHdr.drawTextBlob(60, 32, 80, 14, 4);
  cvHdr.drawHLine(60, 140, 50, 2);
  // বডি সারিতে (y=75..89) সাধারণ কালি (stroke=2)
  cvHdr.drawTextBlob(60, 75, 80, 14, 2);

  const bmHdr = PG.blockMetrics(cvHdr, [50, 50, 800, 900], { isTable: true, pxPerPt: 1 });
  check('কালি-মাপ থেকে শিরোনাম-ঘরের মোটা লেখা (headBold) ও নিচে-দাগ (headUnderline) শনাক্ত হয়েছে',
    bmHdr.headBold === true && bmHdr.headUnderline === true);

  const hdrTblItem = IR.toItem({
    i: 0,
    type: 'table',
    page: 1,
    box: [50, 50, 800, 900],
    lines: [
      'শিরোনাম ১ | শিরোনাম ২',
      'তথ্য ১ | তথ্য ২'
    ]
  }, bmHdr, {});
  const hdrXml = Docx.bodyXml(wrapTableIr(hdrTblItem)).xml;
  const firstRowXml = (/<w:tr>[\s\S]*?<\/w:tr>/.exec(hdrXml) || [''])[0];
  check('DOCX-এ টেবিলের শিরোনাম-সারিতে মোটা (<w:b/>) ও নিচে-দাগ (<w:u w:val="single"/>) যুক্ত হয়েছে',
    firstRowXml.includes('<w:b/>') && firstRowXml.includes('<w:u w:val="single"/>'));
}

// ============================================================================
// ৭. পূর্ণ প্রজেক্ট পরিবেশে (FayzarHeaderMerge ও FayzarGridFirst সক্রিয়) সামঞ্জস্য যাচাই
// ============================================================================
console.log('\n৭. সহায়ক মডিউল (FayzarHeaderMerge ও FayzarGridFirst) সক্রিয় অবস্থায় Merge ও টেবিল ভাগ যাচাই:');
{
  globalThis.__FZ_ON_TABLEGRID = true;
  const prevHM = globalThis.FayzarHeaderMerge;
  const prevGF = globalThis.FayzarGridFirst;

  // পূর্ণ রিপোজিটরিতে header-merge.js ও grid-first.js থাকলে যে আচরণ ঘটে তা কৃত্রিমভাবে সক্রিয় করে পরীক্ষা
  globalThis.FayzarHeaderMerge = {
    applyHeaderMerge(rows, m) {
      if (!m || m.empty || !m.hasGrid || !Array.isArray(rows) || rows.length < 2) return rows;
      const r0 = rows[0], r1 = rows[1];
      if (r0.every((c) => String(c || '').length <= 25) && r1.every((c) => String(c || '').length <= 25) && !/^[০-৯0-9]/.test(String(r1[0] || '').trim())) {
        return [r0.map((c, j) => [c, r1[j]].filter(Boolean).join('\n')), ...rows.slice(2)];
      }
      return rows;
    }
  };
  globalThis.FayzarGridFirst = {
    applyGridFirst(tbl) {
      tbl.gridFirst = true;
      tbl.gridSpans = (tbl.rows || []).map(() => null);
      tbl.vMerges = (tbl.rows || []).map(() => null);
    }
  };

  const spanBlock2 = {
    i: 0,
    type: 'table',
    page: 1,
    box: [100, 100, 300, 900],
    lines: [
      'বার্ষিক প্রতিবেদন ছক |  | ',
      'বিভাগ | খাত ১ | ১০০',
      ' | খাত ২ | ২০০'
    ]
  };
  const spanMetrics2 = {
    empty: false,
    hasGrid: true,
    rectPt: { x: 60, y: 100, w: 300, h: 90 },
    hRulesPt: [100, 130, 160, 190],
    hRuleSpansPt: [[60, 360], [60, 360], [160, 360], [60, 360]],
    vRulesPt: [
      { x: 60, y0: 100, y1: 190, cov: 1 },
      { x: 160, y0: 130, y1: 190, cov: 0.67 },
      { x: 260, y0: 130, y1: 190, cov: 0.67 },
      { x: 360, y0: 100, y1: 190, cov: 1 }
    ]
  };
  const spanTbl2 = IR.toItem(spanBlock2, spanMetrics2, {});
  const spanXml2 = Docx.bodyXml(wrapTableIr(Object.assign({}, spanTbl2, { widthPt: 300, heightPt: 90 }))).xml;

  check('সহায়ক মডিউল সক্রিয় থাকলেও ১ম সারিতে ৩-কলাম জুড়ে <w:gridSpan w:val="3"/> ও ১ম কলামে <w:vMerge/> অক্ষুণ্ণ আছে',
    spanXml2.includes('<w:gridSpan w:val="3"/>') && spanXml2.includes('<w:vMerge w:val="restart"/>') && spanXml2.includes('<w:vMerge/>'));

  const multiTblBlock2 = {
    i: 0,
    type: 'table',
    page: 1,
    box: [100, 100, 400, 900],
    lines: [
      'A | Apple',
      'B | Ball',
      ' | ',
      'C | Cat',
      'D | Dog'
    ]
  };
  const splitParts2 = IR.toItem(multiTblBlock2, {
    empty: false,
    hasGrid: true,
    rectPt: { x: 60, y: 100, w: 360, h: 160 },
    tableGapsPt: [[170, 190]]
  }, {});

  check('সহায়ক মডিউল সক্রিয় থাকলেও ফাঁকা সারিতে টেবিল ভাগ হয়ে ২টি ২-সারির টেবিল তৈরি হয়েছে',
    Array.isArray(splitParts2) && splitParts2.length === 2
    && splitParts2[0].rows.length === 2 && splitParts2[1].rows.length === 2);

  if (prevHM === undefined) delete globalThis.FayzarHeaderMerge; else globalThis.FayzarHeaderMerge = prevHM;
  if (prevGF === undefined) delete globalThis.FayzarGridFirst; else globalThis.FayzarGridFirst = prevGF;
  delete globalThis.__FZ_ON_TABLEGRID;
}

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
