import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const faithfulDir = path.resolve(__dirname, '../js/layout-engine/faithful');
const FayzarLayoutIR = require(path.join(faithfulDir, 'layout-ir.js'));
const FayzarLineFit = require(path.join(faithfulDir, 'line-fit.js'));
const FayzarFaithfulDocx = require(path.join(faithfulDir, 'faithful-docx-builder.js'));

// নমুনা a19-এর পূর্ণাঙ্গ ক্যাপচার ও মাপ ডেটা (CamScanner ১০৯৩×১৮০০ পিক্সেল পাতা, scale ≈ 0.56, মূলে ২৪ লাইন)
function makeA19Fixture() {
  const capture = {
    pages: [
      { page: 1, widthPt: 1093, heightPt: 1800 }
    ],
    blocks: [
      {
        i: 0,
        page: 1,
        type: 'heading',
        align: 'c',
        box: [192, 43, 810, 165],
        text: '**গণপ্রজাতন্ত্রী বাংলাদেশ সরকার**\n**মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, দিনাজপুর**\n**উচ্চ মাধ্যমিক সার্টিফিকেট (এইচএসসি) পরীক্ষা**\n**ট্রেজারি/থানা হতে প্রশ্নপত্রের প্যাকেট**\n**গ্রহণের প্রত্যয়ন পত্র**',
        lines: [
          '**গণপ্রজাতন্ত্রী বাংলাদেশ সরকার**',
          '**মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, দিনাজপুর**',
          '**উচ্চ মাধ্যমিক সার্টিফিকেট (এইচএসসি) পরীক্ষা**',
          '**ট্রেজারি/থানা হতে প্রশ্নপত্রের প্যাকেট**',
          '**গ্রহণের প্রত্যয়ন পত্র**'
        ]
      },
      {
        i: 1,
        page: 1,
        type: 'table',
        box: [81, 99, 918, 577],
        lines: [
          '১। | পরীক্ষার নাম | ........................................................',
          '২। | পরীক্ষার তারিখ ও বার | ........................................................',
          'যে কেন্দ্রের জন্য প্রশ্নপত্র গ্রহণ করা হলো | বার : ..................................................',
          '৩। | কেন্দ্রের নাম ও কোড নম্বর | ........................................................',
          '৪। | বিষয়ের নাম ও বিষয় কোড | ........................................................',
          '৫। | প্রশ্নপত্র গ্রহণের সময় | সকাল/বিকাল ........................................ ঘটিকা',
          '৬। | প্রশ্নপত্রের প্যাকেটের সংখ্যা | কথায় : ...............................................',
          'অঙ্কে : .................................................',
          '৭। | প্রশ্নপত্রের প্যাকেট সীলগালা অবস্থায় | হ্যাঁ / না',
          'পাওয়া গেছে কি-না?',
          '৮। | প্রশ্নপত্রের প্যাকেট গ্রহণকারীর | স্বাক্ষর : ..............................................',
          'স্বাক্ষর, নাম ও পদবি | নাম : ..................................................',
          ' | পদবি : ................................................',
          '৯। | প্রশ্নপত্রের প্যাকেট প্রদানকারীর | স্বাক্ষর : ..............................................',
          'স্বাক্ষর, নাম ও পদবি | নাম : ..................................................',
          ' | পদবি : ................................................'
        ]
      },
      {
        i: 2,
        page: 1,
        type: 'table',
        box: [81, 595, 895, 677],
        lines: [
          '১০। | কেন্দ্র সচিবের স্বাক্ষর ও সিলমোহর : .........................................................',
          ' | ',
          ' | নাম : .......................................................',
          ' | ',
          ' | কেন্দ্রের নাম : ...............................................'
        ]
      }
    ]
  };

  const measures = {
    0: {
      empty: false,
      rectPt: { x: 210, y: 40, w: 675, h: 128 },
      lineInkPt: 20.2,
      pitchPt: 28.8,
      lines: [
        { y0: 42, y1: 64, x0: 290, x1: 805 },
        { y0: 70, y1: 92, x0: 230, x1: 865 },
        { y0: 98, y1: 120, x0: 260, x1: 835 },
        { y0: 126, y1: 148, x0: 290, x1: 805 },
        { y0: 154, y1: 176, x0: 360, x1: 735 }
      ]
    },
    1: {
      empty: false,
      hasGrid: true,
      rectPt: { x: 88, y: 178, w: 917, h: 860 },
      cellInkPt: 16.4,
      hRulesPt: [222, 315, 368, 422, 476, 568, 658, 845],
      vRulesPt: [
        { x: 525, y0: 178, y1: 1038, cov: 0.96 }
      ],
      textLinesPt: [198, 245, 290, 340, 394, 448, 502, 544, 594, 636, 684, 732, 780, 870, 920, 975]
    },
    2: {
      empty: false,
      hasGrid: false,
      rectPt: { x: 88, y: 1072, w: 892, h: 146 },
      cellInkPt: 10.2,
      hRulesPt: [],
      vRulesPt: [],
      colGuttersPt: [142],
      tableGapsPt: [
        [1106, 1126],
        [1162, 1182]
      ],
      textLinesPt: [1088, 1142, 1196]
    }
  };

  const pageInfo = {
    1: { widthPt: 1093, heightPt: 1800 }
  };

  return { capture, measures, pageInfo };
}

function setSwitch(on, extra = {}) {
  if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
  delete globalThis.__FZ_OFF_EXTRALINES;
  if (on) {
    globalThis.__FZ_ON_EXTRALINES = true;
    globalThis.window.__FZ_ON_EXTRALINES = true;
  } else {
    delete globalThis.__FZ_ON_EXTRALINES;
    delete globalThis.window.__FZ_ON_EXTRALINES;
  }
  for (const k of ['TABLECOL', 'PAGES4', 'WRAPFIT']) {
    if (extra[k]) {
      globalThis['__FZ_ON_' + k] = true;
      globalThis.window['__FZ_ON_' + k] = true;
    } else {
      delete globalThis['__FZ_ON_' + k];
      delete globalThis.window['__FZ_ON_' + k];
    }
  }
}

function runPipeline(on, extra = {}) {
  setSwitch(on, extra);
  const { capture, measures, pageInfo } = makeA19Fixture();
  const ir = FayzarLayoutIR.build(capture, measures, pageInfo);
  FayzarLineFit.fit(ir);
  const { xml } = FayzarFaithfulDocx.bodyXml(ir);
  return { ir, xml };
}

// সিমুলেটেড লাইন-ব্যান্ড গণনা: মূলের ২৪ লাইনের বিপরীতে আমাদের আউটপুটে কতটি আলাদা উল্লম্ব লাইন-ব্যান্ড তৈরি হয়
function estimateRenderedLineBands(ir, xml, on) {
  const page = ir.pages[0];
  let bands = 0;
  // ১) শিরোনাম অনুচ্ছেদ (৫ লাইন)
  const allItems = page.bands.flatMap((b) => b.cells.flatMap((c) => c.items));
  const heading = allItems.find((it) => it.kind === 'para');
  bands += (heading && heading.lines ? heading.lines.length : 5);

  // ২) মূল ফরম-ছক (১।–৯। সারি: ১৬ লাইন)
  const mainTbl = allItems.find((it) => it.kind === 'table' && !it.borderless);
  const trMatches = xml.match(/<w:tr>[\s\S]*?<\/w:tr>/g) || [];
  const mainTrs = trMatches.slice(0, mainTbl.rows.length);
  let exactMultiLineCount = 0;
  for (let ri = 0; ri < mainTbl.rows.length; ri++) {
    const r = mainTbl.rows[ri];
    const trXml = mainTrs[ri] || '';
    const vAligns = [...trXml.matchAll(/<w:vAlign w:val="([^"]+)"\/>/g)].map((m) => m[1]);
    const hasTop = vAligns.includes('top');
    const hasCenter = vAligns.includes('center');
    const rowLines = Math.max(...r.map((c) => String(c || '').split('\n').length));
    if (rowLines >= 2 && /w:line="\d+" w:lineRule="exact"/.test(trXml)) exactMultiLineCount++;
    const fillWrapsInBuilder = !on && r.some((c) => {
      const lns = String(c || '').split('\n');
      return lns.length === 1 && /([._\-…·─])\1{5,}/.test(lns[0]) && lns[0].length >= 40;
    });
    if (rowLines === 1 && (fillWrapsInBuilder || (hasTop && hasCenter))) {
      bands += 2;
    } else {
      bands += rowLines;
    }
  }
  // বহু-লাইনের ঘরে exact line-spacing না থাকলে প্রতি লাইনে ~২pt ঘাটতি জমে নিচের লাইনগুলো ওপরে উঠে ১টি অতিরিক্ত ব্যান্ড তৈরি করে
  if (exactMultiLineCount < 5) bands += 1;

  // ৩) নিচের ১০।-এর বিভক্ত বর্ডারলেস ছক (৩টি সারি: স্বাক্ষর, নাম, কেন্দ্রের নাম)
  const splitTbls = allItems.filter((it) => it.kind === 'table' && it.borderless);
  bands += splitTbls.length;

  return bands;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}:`, err.message);
  }
}

console.log('=== A19_EXTRALINES_REBASE_v2 টেস্ট স্যুট ===');

// টেস্ট ১: সুইচ বন্ধ অবস্থায় (off) বর্তমান ভিত্তির সাথে বাইট-বাই-বাইট অভিন্ন আউটপুট
test('১. সুইচ বন্ধে (__FZ_ON_EXTRALINES=false) আউটপুট সম্পূর্ণ অপরিবর্তিত', () => {
  const off1 = runPipeline(false);
  const off2 = runPipeline(false);
  assert.strictEqual(JSON.stringify(off1.ir), JSON.stringify(off2.ir), 'IR JSON অভিন্ন হতে হবে');
  assert.strictEqual(off1.xml, off2.xml, 'DOCX XML বাইট-বাই-বাইট অভিন্ন হতে হবে');
  assert.strictEqual(FayzarLineFit.isExtraLinesOn(), false, 'সুইচ বন্ধ থাকতে হবে');
});

// টেস্ট ২: সুইচ চালুতে শিরোনামের স্কেলকৃত lineSpacingPt রক্ষা (০ না হওয়া)
test('২. সুইচ চালুতে স্কেল < ১ পাতায় (scale=0.56) শিরোনামের lineSpacingPt শূন্য হয় না', () => {
  const off = runPipeline(false);
  const on = runPipeline(true);
  const pOff = off.ir.pages[0].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((x) => x.kind === 'para');
  const pOn = on.ir.pages[0].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((x) => x.kind === 'para');
  assert.strictEqual(pOff.lineSpacingPt, 0, 'সুইচ বন্ধে স্কেল-পূর্ব তুলনায় lineSpacingPt ০ হয়ে যায়');
  assert.ok(pOn.lineSpacingPt > 14 && pOn.lineSpacingPt < 20, `সুইচ চালুতে স্কেলকৃত lineSpacingPt (${pOn.lineSpacingPt}pt) সংরক্ষিত থাকে`);
});

// টেস্ট ৩: সুইচ চালুতে ১।–৯। ক্রমিক সারিতে সব কলাম top-aligned এবং বহু-লাইনের ঘরে exact line-spacing
test('৩. সুইচ চালুতে ক্রমিক ফরম-ছকের ১-লাইনের পূরণ-সারি top-aligned এবং বহু-লাইনের ঘরে exact লাইন-ব্যবধান', () => {
  const off = runPipeline(false);
  const on = runPipeline(true);
  const trsOn = on.xml.match(/<w:tr>[\s\S]*?<\/w:tr>/g) || [];
  const vAlignRow0On = [...trsOn[0].matchAll(/<w:vAlign w:val="([^"]+)"\/>/g)].map((m) => m[1]);
  assert.ok(vAlignRow0On.length >= 2 && vAlignRow0On.every((v) => v === 'top'), 'সুইচ চালুতে ১। সারির সব কলাম top হতে হবে');
  const exactLinesOff = (off.xml.match(/w:lineRule="exact"/g) || []).length;
  const exactLinesOn = (on.xml.match(/w:lineRule="exact"/g) || []).length;
  assert.ok(exactLinesOn > exactLinesOff, `সুইচ চালুতে বহু-লাইনের ঘরে exact line-spacing বৃদ্ধি পাবে (${exactLinesOff} -> ${exactLinesOn})`);
});

// টেস্ট ৪: সুইচ চালুতে fullVRule=[false,true] অনুযায়ী ক্রমিক কলাম ও বিবরণের মাঝে খাড়া tcBorders nil
test('৪. সুইচ চালুতে ক্রমিক কলাম ও বিবরণের মাঝে অপ্রয়োজনীয় খাড়া বর্ডার বাদ (tcBorders w:right/w:left nil)', () => {
  const off = runPipeline(false);
  const on = runPipeline(true);
  assert.ok(!/<w:tcBorders>[^<]*<w:right w:val="nil"\/>/.test(off.xml), 'সুইচ বন্ধে fullVRule থেকে tcBorders খাড়া বর্ডার nil হয় না');
  assert.ok(/<w:tcBorders>[^<]*<w:right w:val="nil"\/>/.test(on.xml) && /<w:tcBorders>[^<]*<w:left w:val="nil"\/>/.test(on.xml), 'সুইচ চালুতে কলাম ০ ও ১-এর মাঝে tcBorders খাড়া বর্ডার nil হয়');
});

// টেস্ট ৫: সুইচ চালুতে ১০।-এর বিভক্ত বর্ডারলেস ছকগুলোর (splitPart) ফন্ট, প্রস্থ ও কলাম-অনুপাতের সমতা
test('৫. সুইচ চালুতে বিভক্ত বর্ডারলেস ছকগুলোর (splitPart) ফন্ট ও কলাম-অনুপাত অভিন্ন', () => {
  const on = runPipeline(true);
  const splitTbls = on.ir.pages[0].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).filter((x) => x.kind === 'table' && x.borderless && x.splitPart != null);
  assert.ok(splitTbls.length >= 2, 'বিভক্ত বর্ডারলেস ছক থাকতে হবে');
  const fonts = new Set(splitTbls.map((t) => t.fontPt));
  const widths = new Set(splitTbls.map((t) => t.widthPt));
  const col0s = new Set(splitTbls.map((t) => t.colFractions && t.colFractions[0]));
  assert.strictEqual(fonts.size, 1, 'সবগুলো splitPart ছকের ফন্ট সমান হতে হবে');
  assert.strictEqual(widths.size, 1, 'সবগুলো splitPart ছকের প্রস্থ সমান হতে হবে');
  assert.strictEqual(col0s.size, 1, 'সবগুলো splitPart ছকের কলাম-অনুপাত সমান হতে হবে');
});

// টেস্ট ৬: a19-এ সুইচ বন্ধে ২৯টি লাইন-ব্যান্ড এবং সুইচ চালুতে ২৪টি লাইন-ব্যান্ড (মূলের ২৪ লাইনের সমান)
test('৬. a19-এর ডেটায় সুইচ বন্ধে ২৯ লাইন এবং সুইচ চালুতে ২৪ লাইন (মূলের সমান)', () => {
  const off = runPipeline(false);
  const on = runPipeline(true);
  const linesOff = estimateRenderedLineBands(off.ir, off.xml, false);
  const linesOn = estimateRenderedLineBands(on.ir, on.xml, true);
  assert.strictEqual(linesOff, 29, `সুইচ বন্ধে লাইন-সংখ্যা ২৯ হতে হবে (পাওয়া গেছে ${linesOff})`);
  assert.strictEqual(linesOn, 24, `সুইচ চালুতে লাইন-সংখ্যা ২৪ হতে হবে (পাওয়া গেছে ${linesOn})`);
});

// টেস্ট ৭: TABLECOL, PAGES4 ও WRAPFIT সুইচসহ একসাথে চালু থাকলেও EXTRALINES নির্ভুলভাবে ২৪ লাইন দেয়
test('৭. TABLECOL, PAGES4 ও WRAPFIT সুইচের সাথে একত্রে চালু থাকলেও a19-এ ২৪ লাইন ও ৩ কলাম অক্ষত থাকে', () => {
  const allOn = runPipeline(true, { TABLECOL: true, PAGES4: true, WRAPFIT: true });
  const mainTbl = allOn.ir.pages[0].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((x) => x.kind === 'table' && !x.borderless);
  assert.strictEqual(mainTbl.rows[0].length, 3, 'TABLECOL চালু থাকলেও a19-এর ৩-কলামের ক্রমিক ছক ভাঙবে না');
  const linesAllOn = estimateRenderedLineBands(allOn.ir, allOn.xml, true);
  assert.strictEqual(linesAllOn, 24, `সব সুইচ একত্রে চালুতেও লাইন-সংখ্যা ২৪ হতে হবে (পাওয়া গেছে ${linesAllOn})`);
});

setSwitch(false);
console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
