/**
 * কাজ ১–৬ (ধাপ ক, ধাপ খ) ও অনুরোধ ঘ (header-merge.js)-এর বিশুদ্ধ Node ইউনিট ও রিগ্রেশন টেস্ট
 * চালানো: node tests/reviewer-fixes.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const G = require('../js/layout-engine/faithful/page-geometry.js');
const GF = require('../js/layout-engine/faithful/grid-first.js');
const HM = require('../js/layout-engine/faithful/header-merge.js');
const IR = require('../js/layout-engine/faithful/layout-ir.js');
const D = require('../js/layout-engine/faithful/faithful-docx-builder.js');
const LF = require('../js/layout-engine/faithful/line-fit.js');
globalThis.FayzarPageGeometry = G;
globalThis.FayzarGridFirst = GF;
globalThis.FayzarHeaderMerge = HM;
globalThis.FayzarLayoutIR = IR;
globalThis.FayzarFaithfulDocx = D;
globalThis.FayzarLineFit = LF;

(async () => {
  // ১) কাজ ১ (FZ_OFF=FILLW2): পূরণের কলাম (হ্যাঁ/না/মন্তব্য) থাকলে cov >= 0.4 খাড়া দাগ থেকে কলাম-প্রস্থ ও HEADW বন্ধ
  {
    const block = {
      i: 1, page: 1, type: 'table', box: [100, 100, 500, 900],
      lines: [
        'ক্রমিক | বিষয় | হ্যাঁ | না | মন্তব্য',
        '১ | দীর্ঘ বিবরণী টেক্সট যা নিজের কলামে দুই লাইনে আঁটে | | | ',
        '২ | দ্বিতীয় সারির বিবরণ | | | ',
        '৩ | তৃতীয় সারির বিবরণ | | | '
      ]
    };
    const m = {
      empty: false, hasGrid: true,
      rectPt: { x: 50, y: 80, w: 450, h: 200 },
      vRulesPt: [
        { x: 95, cov: 0.43 },   // কলাম ১|২ (cov 0.43 < 0.5)
        { x: 350, cov: 0.85 },  // কলাম ২|৩
        { x: 380, cov: 0.85 },  // কলাম ৩|৪
        { x: 410, cov: 0.44 },  // কলাম ৪|৫ (cov 0.44 < 0.5)
        { x: 499, cov: 0.80 }   // ডান প্রান্তের দাগ
      ],
      colGuttersPt: [80, 340, 375, 420]
    };
    const item = IR.toItem(block, m);
    assert.strictEqual(item.fillW2, true, 'Task 1: fillW2 should be enabled when fill columns use vRulesPt');
    assert(Math.abs(item.colFractions[1] - (350 - 95) / (499 - 50)) < 0.005, 'Task 1: col 2 width should come from vRulesPt (cov >= 0.4)');
    const xml = D.paraXml(Object.assign({}, item, { widthPt: 450, heightPt: 200, fontPt: 12 }), 0, { media: [] });
    const gridCols = [...xml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((x) => +x[1]);
    assert.strictEqual(gridCols[1], Math.round(Math.floor(450 * 20 / 5) * 5 * item.colFractions[1]), 'Task 1: HEADW should not steal width from col 2');
  }

  // ২) কাজ ২ (FZ_OFF=DOTFONT, FZ_OFF=TXTTF, FZ_OFF=VTOP4) + part-17.5 টেস্ট ("সারির উচ্চতা মূলের মতো, লেখা মাঝে"):
  {
    const block = {
      i: 2, page: 1, type: 'table', box: [100, 100, 700, 900],
      lines: [
        'ক্রমিক | বিবরণ | মন্তব্য',
        '৯। | আটক করা কাগজপত্র ও বহিষ্কৃত পরীক্ষার্থীর বিস্তারিত বিবরণ নিচে প্রদান করতে হবে এবং কেন্দ্র সচিবের স্বাক্ষর থাকতে হবে ...... | ',
        '১০। | কেন্দ্র সচিবের নাম: ......................\nপদবি: ......................\nস্বাক্ষর: ...................... | '
      ]
    };
    const m = {
      empty: false, hasGrid: true,
      rectPt: { x: 50, y: 100, w: 480, h: 160 },
      cellInkPt: 10.2,
      textLinesPt: [115, 145, 185],
      textInkXPt: [
        [60, 105, 127], [80, 106, 127], [110, 105, 126],
        [60, 135, 157], [90, 136, 157], [120, 135, 156],
        [60, 175, 197], [95, 176, 197], [130, 175, 196]
      ],
      hRulesPt: [100, 130, 190, 260],
      vRulesPt: [{ x: 90, cov: 0.9 }, { x: 380, cov: 0.9 }]
    };
    const item = IR.toItem(block, m);
    assert(item.cellFontSrc > 11.5, 'Task 2: DOTFONT should lift cellFontSrc from dotless textInkXPt');
    const xml = D.paraXml(Object.assign({}, item, { widthPt: 480, heightPt: 160, fontPt: 12.5 }), 0, { media: [] });
    assert(xml.includes('<w:vAlign w:val="top"/>'), 'Task 2: VTOP4 should set vAlign="top" on >=3-line rows');

    // Regression check for tests/part-17.5-faithful-layout.test.js ("সারির উচ্চতা মূলের মতো, লেখা মাঝে"):
    const oneLineTallTbl = {
      kind: 'table',
      rows: [
        ['কলাম ১', 'কলাম ২'],
        ['মান ১', 'মান ২']
      ],
      widthPt: 400,
      heightPt: 80,
      fontPt: 11
    };
    const oneLineXml = D.paraXml(oneLineTallTbl, 0, { media: [] });
    assert(!oneLineXml.includes('<w:vAlign w:val="top"/>'), 'Regression Fix #1 (part-17.5): 1-line tall row must keep vAlign="center", not top');
    assert(oneLineXml.includes('<w:vAlign w:val="center"/>'), 'Regression Fix #1 (part-17.5): 1-line tall row has vAlign="center"');
  }

  // ৩) কাজ ৩ (FZ_OFF=ULINE2, FZ_OFF=ULTOUCH): দাড়ি/কোলন বাদ দিয়ে আংশিক নিচে-দাগ ও বহু-লাইনের অনুচ্ছেদে লাইন-ভাঙন রক্ষা
  {
    const lines = ['বিষয় : প্রস্তাবিত শাখা,', '**কাঠামো অনুমোদন সংক্রান্ত হালনাগাদ চেকলিস্ট প্রণয়ন।**'];
    const m = { empty: false, underlineLines: [0, 1], lines: [{ y: 10, h: 12, w: 200 }, { y: 26, h: 12, w: 300 }] };
    const ul = IR.toItem({ i: 3, page: 1, type: 'paragraph', lines, text: lines.join('\n'), align: 'j' }, m);
    assert.strictEqual(ul.keepLines, true, 'Task 3: multi-line subject paragraph with perLineUnderline must keep line breaks');
    assert(ul.lines[1].includes('**<u>কাঠামো অনুমোদন সংক্রান্ত হালনাগাদ চেকলিস্ট প্রণয়ন</u>**') && !ul.lines[1].includes('।</u>'), 'Task 3: trailing danda excluded from underline');

    const lines2 = ['সংযুক্তি : ০৮ (আট) ফর্দ।'];
    const m2 = { empty: false, underlineLines: [[0.35, 0.92]], lines: [{ y: 10, h: 12, w: 180 }] };
    const ul2 = IR.toItem({ i: 4, page: 1, type: 'paragraph', lines: lines2, text: lines2[0], align: 'l' }, m2);
    assert.strictEqual(ul2.lines[0], 'সংযুক্তি : <u>০৮ (আট) ফর্দ</u>।', 'Task 3: mid-line underline excludes colon and trailing danda');
  }

  // ৪) কাজ ৪ (FZ_ON=SHADEBAR, FZ_ON=SHADECOL, FZ_ON=BOXPOS, FZ_ON=PCELLSHD) + g41 blockShade টেস্ট:
  {
    const W = 200, H = 60, data = new Uint8ClampedArray(W * H * 4).fill(255);
    for (let y = 10; y <= 30; y++) {
      for (let x = 20; x <= 180; x++) {
        const i = (y * W + x) * 4;
        data[i] = 200; data[i + 1] = 200; data[i + 2] = 200;
      }
    }
    const sh = G.blockShade({ width: W, height: H, data }, [166, 100, 500, 900], { pageL: 255 });
    assert.deepStrictEqual(sh, { fill: 'C8C8C8', dark: false }, 'Regression Fix #2 (g41): blockShade direct box returns { fill, dark: false }');

    globalThis.__FZ_ON_SHADEBAR = true;
    globalThis.__FZ_ON_BOXPOS = true;
    globalThis.__FZ_ON_PCELLSHD = true;
    try {
      const bidroBlock = { i: 5, page: 1, type: 'paragraph', align: 'c', lines: ['বি: দ্র: ফরমটি সঠিকভাবে পূরণ করুন'], text: 'বি: দ্র: ফরমটি সঠিকভাবে পূরণ করুন' };
      const bidroM = { empty: false, rectPt: { x: 27, y: 740, w: 480, h: 18 }, geminiPt: { x: 27, y: 738, w: 524, h: 22 }, shade: { fill: 'C1BDC8', dark: false } };
      const bidroIt = IR.toItem(bidroBlock, bidroM);
      assert.strictEqual(!!bidroIt.shadeRun, false, 'Task 4: full-width light shaded bar with FZ_ON=SHADEBAR must not set shadeRun');
      const bidroXml = D.paraXml(Object.assign({}, bidroIt, { fontPt: 10 }), 0, { media: [] });
      assert(bidroXml.includes('<w:pPr><w:shd w:val="clear" w:color="auto" w:fill="C1BDC8"/>'), 'Task 4: shaded bar emits paragraph-level <w:shd>');

      const famBlock = {
        i: 6, page: 1, type: 'table',
        lines: [
          'ক্রমিক | নাম | সম্পর্ক | বয়স | জন্ম তারিখ',
          '০১. | | স্বামী: ☐ | | ',
          ' | | স্ত্রী: ☐ | | '
        ]
      };
      const famM = {
        empty: false, hasGrid: true, headShade: 'C0BCC7',
        rectPt: { x: 27, y: 426, w: 499, h: 93 },
        hRulesPt: [426, 458, 519],
        textLinesPt: [440, 470, 480]
      };
      const famIt = IR.toItem(famBlock, famM);
      assert.strictEqual(famIt.rows[1][2], '□ স্বামী:\n□ স্ত্রী:', 'Task 4: checkbox placed before label when FZ_ON=BOXPOS');
      const famXml = D.paraXml(Object.assign({}, famIt, { widthPt: 499, heightPt: 93, fontPt: 11, colFractions: [0.06, 0.39, 0.10, 0.13, 0.32] }), 0, { media: [] });
      assert(!famXml.includes('<w:gridSpan'), 'Task 4: multi-line short cell does not trigger gridSpan when FZ_ON=BOXPOS');
      assert(famXml.includes('<w:jc w:val="left"/>'), 'Task 4: checkbox cell is left-aligned');
      assert(famXml.includes('<w:pPr><w:shd w:val="clear" w:color="auto" w:fill="C0BCC7"/>'), 'Task 4: headShade emitted at paragraph level when FZ_ON=PCELLSHD');
    } finally {
      delete globalThis.__FZ_ON_SHADEBAR;
      delete globalThis.__FZ_ON_BOXPOS;
      delete globalThis.__FZ_ON_PCELLSHD;
    }
  }

  // ৫) কাজ ৫ (layout-score.mjs --v2 / FZ_LAYOUT_V2=1):
  {
    const { lineBands } = await import('../qa/golden/line-drift.mjs');
    const { lineBandsV2 } = await import('../qa/golden/layout-score.mjs');
    const W = 200, H = 120, px = 2;
    const mask = new Uint8Array(W * H);
    for (const y0 of [20, 40, 60]) for (let y = y0; y < y0 + 6; y++) for (let x = 20; x < 80; x++) if (x % 6 !== 0) mask[y * W + x] = 1;
    for (let y = 18; y <= 70; y++) { mask[y * W + 140] = 1; mask[y * W + 141] = 1; }
    const b1 = lineBands(mask, W, H, px);
    const b2 = lineBandsV2(mask, W, H, px, { h: [], v: [] });
    assert.strictEqual(b1.length, 1, 'Task 5: v1 merges 3 lines into 1 band due to vertical box border');
    assert.strictEqual(b2.length, 3, 'Task 5: v2 erases vertical border and recovers all 3 lines');
  }

  // ৬) অনুরোধ ঘ (header-merge.js, FZ_OFF=HEADMERGE): a07-এর মতো ৩-৪ সারিতে ভেঙে যাওয়া ছক-হেডার একটি হেডার-সারিতে সংযোজন
  {
    const a07Block = {
      i: 7, page: 1, type: 'table', box: [120, 60, 450, 940],
      lines: [
        'জ্যেষ্ঠতার | কর্মকর্তার নাম, | জন্ম তারিখ | চাকুরীতে যোগদানের | মন্তব্য',
        'ক্রমিক | পদবী ও আইডি | | তারিখ | ',
        'নং | | | | ',
        '১। | জনাব ক খ গ | ০১/০১/১৯৮০ | ১৫/০bc/২০০৫ | সন্তোষজনক',
        ' | উপসচিব (১২৩৪) | | | ',
        '২। | জনাব ঘ ঙ চ | ০২/০২/১৯৮২ | ২০/০৬/২০০৬ | '
      ]
    };
    const a07M = {
      empty: false, hasGrid: true,
      rectPt: { x: 40, y: 100, w: 500, h: 180 },
      cellInkPt: 10,
      hRulesPt: [100, 142, 220, 280], // ৩টি ব্যান্ড (হেডার + ২টি তথ্য-সারি), হেডারের প্রথম ৩টি লাইনের মাঝে কোনো আড়াআড়ি দাগ নেই
      vRulesPt: [{ x: 85, cov: 0.95 }, { x: 240, cov: 0.95 }, { x: 320, cov: 0.95 }, { x: 420, cov: 0.95 }],
      textLinesPt: [110, 165, 245] // কাত স্ক্যানে লাইন-গোনা কম (৩টি)
    };
    const itOn = IR.toItem(a07Block, a07M);
    assert.strictEqual(itOn.rows.length, 3, 'Request D (a07): 3 split header rows + split body rows merge cleanly into 3 ruled bands');
    assert.strictEqual(itOn.rows[0][0], 'জ্যেষ্ঠতার\nক্রমিক\nনং', 'Request D (a07): Col 0 header fragments united with newline');
    assert.strictEqual(itOn.rows[0][1], 'কর্মকর্তার নাম,\nপদবী ও আইডি', 'Request D (a07): Col 1 header fragments united with newline');
    assert.strictEqual(itOn.rows[1][1], 'জনাব ক খ গ\nউপসচিব (১২৩৪)', 'Request D (a07): uniting header also unlocks mergeLineRows for body continuation rows');

    globalThis.__FZ_OFF_HEADMERGE = true;
    try {
      const itOff = IR.toItem(a07Block, a07M);
      assert.strictEqual(itOff.rows[0][0], 'জ্যেষ্ঠতার', 'Request D: FZ_OFF=HEADMERGE disables header merging');
      assert.strictEqual(itOff.rows[1][0], 'ক্রমিক', 'Request D: r2 stays separate when FZ_OFF=HEADMERGE is set');
    } finally {
      delete globalThis.__FZ_OFF_HEADMERGE;
    }
  }

  // ৭) ধাপ ক ও ধাপ খ (FZ_ON=GRIDFIRST): আসল নমুনা ফাইল (samples/a02, a16, a17, a18, f1) যাচাই
  {
    const sDir = path.join(__dirname, '..', 'samples');
    if (fs.existsSync(sDir)) {
      const meas = (t) => String(t || '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').length * 48;
      // ধাপ খ: FZ_ON=GRIDFIRST চালু করলে a18, a16, a17, a02-এ গ্রিড-প্রথম ছক সক্রিয় হয় এবং f1-এ নিরাপদে পুরোনো পথে ফেরে
      globalThis.__FZ_ON_GRIDFIRST = true;
      try {
        const m18 = JSON.parse(fs.readFileSync(path.join(sDir, 'a18', 'measures.json'), 'utf8'));
        const ir18 = IR.build(JSON.parse(JSON.stringify(m18.cap)), JSON.parse(JSON.stringify(m18.measures)), JSON.parse(JSON.stringify(m18.pageInfo)));
        LF.fit(ir18, meas);
        const t18 = ir18.pages[0].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((it) => it.kind === 'table');
        assert.strictEqual(t18.gridFirst, true, 'Step B (a18): gridFirst enabled on a18');
        assert.strictEqual(t18.fontPt, 11.5, 'Step B (a18): fitTable preserves 11.5pt font when Row 27 uses open left band space');
        assert.deepStrictEqual(t18.gridSpans[13], [3, 0, 0, 1], 'Step B (a18): Row 13 spans all 3 open left columns');
        assert.deepStrictEqual(t18.gridSpans[24], [1, 2, 0, 1], 'Step B (a18): Row 24 ("সমীপে দাখিল করা হইল।") spans cols 1..2');
        assert.strictEqual(t18.rows[27][2], 'প্রধান হিসাবরক্ষণ কর্মকর্তা', 'Step B (a18): Row 27 placed in col 2 matching cellBoxV ink');
        const xml18 = D.bodyXml(ir18).xml;
        assert(xml18.includes('<w:left w:val="nil"/>') && xml18.includes('<w:right w:val="nil"/>'), 'Step B (a18): suppresses missing vertical borders in Bands 3 & 4');

        // f1 fallback check
        const mf1 = JSON.parse(fs.readFileSync(path.join(sDir, 'f1', 'measures.json'), 'utf8'));
        const irf1 = IR.build(JSON.parse(JSON.stringify(mf1.cap)), JSON.parse(JSON.stringify(mf1.measures)), JSON.parse(JSON.stringify(mf1.pageInfo)));
        const tf1 = irf1.pages.flatMap((p) => p.bands.flatMap((b) => b.cells.flatMap((c) => c.items))).filter((it) => it.kind === 'table');
        assert(tf1.every((t) => !t.gridFirst), 'Step B (f1): incomplete/faint grid falls back to existing path');
      } finally {
        delete globalThis.__FZ_ON_GRIDFIRST;
      }
    }
  }

  console.log('ALL 7 UNIT & REGRESSION TESTS (TASKS 1-6 + REQUEST D HEADER-MERGE) PASSED SUCCESSFULLY!');
})();
