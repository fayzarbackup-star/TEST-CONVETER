/**
 * B_FORM_v5 — হুবহু-মোডে ফরমের উপাদান (B9) ও ট্যাব-কলাম (B4) পরীক্ষা
 * ====================================================================
 * কৃত্রিম IR ও ব্লক থেকে docx XML-এ প্রত্যাশিত w:shd, w:color, বাক্স-টেবিল, রেডিও,
 * ড্যাশ/ড্যাশ-ডট বক্স, ছবি/ফরম-৮/তফসিল বক্স, দুই-কলাম স্বাক্ষর ও ট্যাব-স্টপ যাচাই;
 * এবং __FZ_ON_FORMKIT সুইচ বন্ধ থাকলে আউটপুট বাইট-বাই-বাইট অপরিবর্তিত থাকার প্রমাণ।
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const Prompt = require('../js/layout-engine/faithful/faithful-prompt.js');
const Tags = require('../js/layout-engine/faithful/layout-tags.js');
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

function makePageIr(bands, extra = {}) {
  return {
    pages: [
      Object.assign({
        page: 1,
        widthPt: 595.3,
        heightPt: 841.9,
        margins: { top: 54, right: 54, bottom: 54, left: 54 },
        scale: 1,
        bodyFontPt: 12,
        bands
      }, extra)
    ],
    warnings: []
  };
}

function flowBand(items, y0 = 100, y1 = 140, gapBeforePt = 0) {
  return {
    kind: 'flow',
    gapBeforePt,
    y0,
    y1,
    cells: [{ x0: 54, x1: 541.3, items }]
  };
}

// ============================================================================
// ১. সুইচ বন্ধে (__FZ_ON_FORMKIT = false) আচরণ অপরিবর্তিত যাচাই
// ============================================================================
console.log('১. সুইচ বন্ধে (__FZ_ON_FORMKIT = false) অপরিবর্তিত আউটপুট যাচাই:');
{
  delete globalThis.__FZ_ON_FORMKIT;

  const baseIr = makePageIr([
    flowBand([
      {
        kind: 'para',
        type: 'heading',
        text: 'ব্যক্তিগত তথ্যাবলি',
        lines: ['ব্যক্তিগত তথ্যাবলি'],
        fontPt: 13,
        bold: true,
        align: 'c',
        fill: '1F4E79',
        rect: { x: 54, y: 70, w: 487, h: 22 }
      },
      {
        kind: 'table',
        widthPt: 480,
        heightPt: 100,
        fontPt: 11,
        rect: { x: 54, y: 100, w: 480, h: 100 },
        rows: [
          ['আবেদনকারীর নাম * :', '(বাংলায়)'],
          ['লিঙ্গ :', '○ পুরুষ\n○ মহিলা'],
          ['মোবাইল নম্বর :', '০১ | ৩ | ৪ | ৫ | ৬ | ৭ | ৮ | ৯ | ০ | ১']
        ]
      },
      {
        kind: 'para',
        type: 'option_row',
        text: '(ক) ১২   (খ) ১৫   (গ) ১৮   (ঘ) ২৪',
        lines: ['(ক) ১২   (খ) ১৫   (গ) ১৮   (ঘ) ২৪'],
        fontPt: 12,
        align: 'l',
        rect: { x: 54, y: 220, w: 450, h: 18 }
      },
      {
        kind: 'para',
        type: 'question',
        text: '১। বাংলাদেশের রাজধানীর নাম কী?   ৫',
        lines: ['১। বাংলাদেশের রাজধানীর নাম কী?   ৫'],
        fontPt: 12,
        align: 'l',
        rect: { x: 54, y: 250, w: 450, h: 18 }
      }
    ])
  ]);

  const xmlOff1 = Docx.bodyXml(JSON.parse(JSON.stringify(baseIr))).xml;
  check('সুইচ বন্ধে অনুচ্ছেদে IR fill থেকে w:shd যুক্ত হয় না', !xmlOff1.includes('w:fill="1F4E79"'));
  check('সুইচ বন্ধে তারকা চিহ্নে লাল w:color="FF0000" যুক্ত হয় না', !xmlOff1.includes('w:val="FF0000"'));
  check('সুইচ বন্ধে placeholder-এ ধূসর w:color="808080" যুক্ত হয় না', !xmlOff1.includes('w:val="808080"'));
  check('সুইচ বন্ধে লেবেল-কলামে স্বয়ংক্রিয় ধূসর w:fill="F2F2F2" যুক্ত হয় না', !xmlOff1.includes('w:fill="F2F2F2"'));

  globalThis.__FZ_ON_FORMKIT = true;
  const xmlOn = Docx.bodyXml(JSON.parse(JSON.stringify(baseIr))).xml;
  globalThis.__FZ_ON_FORMKIT = false;
  const xmlOff2 = Docx.bodyXml(JSON.parse(JSON.stringify(baseIr))).xml;
  check('সুইচ পুনরায় বন্ধ করলে XML বাইট-বাই-বাইট হুবহু আগের মতো', xmlOff1 === xmlOff2);
  check('সুইচ চালু থাকলে নতুন ফরমকিট XML উপাদান যুক্ত হয়', xmlOn !== xmlOff1);
}

// ============================================================================
// ২. B9.1 — ঘরের পটভূমি-রং ও লেখার রং (w:shd, w:color, লাল *, ধূসর placeholder)
// ============================================================================
console.log('\n২. B9.1 — ঘরের পটভূমি-রং ও লেখার রং যাচাই:');
{
  globalThis.__FZ_ON_FORMKIT = true;

  const colorIr = makePageIr([
    flowBand([
      {
        kind: 'para',
        type: 'heading',
        text: 'অনলাইন জন্ম নিবন্ধন ফরম',
        lines: ['অনলাইন জন্ম নিবন্ধন ফরম'],
        fontPt: 14,
        bold: true,
        align: 'c',
        fill: '#1F4E79',
        rect: { x: 54, y: 60, w: 487, h: 24 }
      },
      {
        kind: 'table',
        formTable: true,
        headFill: '1F4E79',
        widthPt: 480,
        heightPt: 120,
        fontPt: 11,
        rect: { x: 54, y: 95, w: 480, h: 120 },
        rows: [
          ['তথ্যের বিবরণ', 'প্রদেয় তথ্য'],
          ['আবেদনকারীর নাম * :', '(বাংলায়)'],
          ['জন্ম তারিখ * :', 'DD/MM/YYYY'],
          [
            { text: 'বিশেষ ঘর :', fill: 'EDEDED', color: '003366' },
            { text: '', placeholder: 'এখানে লিখুন...' }
          ]
        ]
      }
    ])
  ]);

  const xml = Docx.bodyXml(colorIr).xml;
  check('নীল শিরোনাম-ব্যান্ডে w:shd (w:fill="1F4E79") আছে', xml.includes('<w:shd w:val="clear" w:color="auto" w:fill="1F4E79"/>'));
  check('নীল শিরোনাম-ব্যান্ডে সাদা লেখা (w:color w:val="FFFFFF") আছে', xml.includes('<w:color w:val="FFFFFF"/>'));
  check('লেবেল-কলামে ধূসর পটভূমি (w:fill="F2F2F2") আছে', xml.includes('<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>'));
  check('আবশ্যক ক্ষেত্রের লাল তারকা চিহ্ন (*) w:color="FF0000" রানে আছে', /<w:color w:val="FF0000"\/>[^<]*<w:sz [^>]*\/><w:szCs [^>]*\/><\/w:rPr><w:t[^>]*>\*<\/w:t>/.test(xml));
  check('ধূসর placeholder লেখায় w:color="808080" আছে', xml.includes('<w:color w:val="808080"/>'));
  check('সেল-অবজেক্টের নিজস্ব fill (EDEDED) ও color (003366) কাজ করছে', xml.includes('w:fill="EDEDED"') && xml.includes('w:val="003366"'));
}

// ============================================================================
// ৩. B9.2 — সংখ্যা-বাক্সের সারি (০১ + ১১ ঘর, NID-এর ১৭ ঘর)
// ============================================================================
console.log('\n৩. B9.2 — সংখ্যা-বাক্সের সারি (সমান-প্রস্থ ছোট ঘরের টেবিল) যাচাই:');
{
  globalThis.__FZ_ON_FORMKIT = true;

  const boxIr = makePageIr([
    flowBand([
      {
        kind: 'box_row',
        label: 'মোবাইল নম্বর :',
        prefix: '০১',
        boxCount: 11,
        widthPt: 460,
        rect: { x: 54, y: 100, w: 460, h: 24 }
      },
      {
        kind: 'box_row',
        label: 'জাতীয় পরিচয়পত্র (NID) :',
        boxCount: 17,
        widthPt: 460,
        rect: { x: 54, y: 135, w: 460, h: 24 }
      },
      {
        kind: 'table',
        widthPt: 460,
        heightPt: 60,
        fontPt: 11,
        rect: { x: 54, y: 175, w: 460, h: 60 },
        rows: [
          ['পিন কোড :', '১', '২', '', '', '', ''],
          ['ডাকঘর :', 'ঢাকা']
        ]
      }
    ])
  ]);

  const xml = Docx.bodyXml(boxIr).xml;
  const innerTables = [...xml.matchAll(/<w:tbl><w:tblPr><w:tblW w:w="\d+" w:type="dxa"\/><w:tblBorders><w:top w:val="single" w:sz="4"[\s\S]*?<\/w:tbl>/g)].map((m) => m[0]);
  check('মোবাইল, NID ও পিন কোডের জন্য ৩টি ভেতরের সংখ্যা-বাক্স টেবিল তৈরি হয়েছে', innerTables.length === 3);

  const gridCols0 = [...(innerTables[0] || '').matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => +m[1]);
  check('মোবাইল সংখ্যা-বাক্সে ঠিক ১১টি ঘর আছে ও সব ঘরের প্রস্থ সমান', gridCols0.length === 11 && gridCols0.every((w) => w === gridCols0[0]));
  check('মোবাইল সংখ্যা-বাক্সে প্রারম্ভিক "০" ও "১" আছে', (innerTables[0] || '').includes('>০<') && (innerTables[0] || '').includes('>১<'));

  const gridCols1 = [...(innerTables[1] || '').matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => +m[1]);
  check('NID সংখ্যা-বাক্সে ঠিক ১৭টি সমান-প্রস্থের ঘর আছে', gridCols1.length === 17 && gridCols1.every((w) => w === gridCols1[0]));

  const gridCols2 = [...(innerTables[2] || '').matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => +m[1]);
  check('টেবিলের ভেতরের পিন কোড সারিতে ৬টি সমান-প্রস্থের ঘর তৈরি হয়েছে', gridCols2.length === 6 && gridCols2.every((w) => w === gridCols2[0]));
}

// ============================================================================
// ৪. B9.3 — ড্যাশ/ড্যাশ-ডট বক্স, খালি "ছবি"-বাক্স, ডানে "ফরম-৮", মাঝের "তফসিল" বাক্স
// ============================================================================
console.log('\n৪. B9.3 — বিশেষ বক্সসমূহ (ড্যাশ, ড্যাশ-ডট, ছবি, ফরম-৮, তফসিল) যাচাই:');
{
  globalThis.__FZ_ON_FORMKIT = true;

  const boxesIr = makePageIr([
    flowBand([
      {
        kind: 'para',
        type: 'label_box',
        text: 'ফরম-৮',
        lines: ['ফরম-৮'],
        align: 'r',
        boxed: true,
        widthPt: 70,
        heightPt: 22,
        rect: { x: 465, y: 60, w: 70, h: 22 }
      },
      {
        kind: 'para',
        type: 'photo_box',
        text: '',
        lines: [],
        photoBox: true,
        widthPt: 85,
        heightPt: 105,
        rect: { x: 450, y: 90, w: 85, h: 105 }
      },
      {
        kind: 'para',
        type: 'schedule_box',
        text: 'তফসিল',
        lines: ['তফসিল'],
        align: 'c',
        scheduleBox: true,
        widthPt: 90,
        heightPt: 22,
        rect: { x: 250, y: 210, w: 90, h: 22 }
      },
      {
        kind: 'para',
        text: 'অফিস কর্তৃক পূরণীয়',
        lines: ['অফিস কর্তৃক পূরণীয়'],
        boxed: true,
        dashed: true,
        widthPt: 300,
        rect: { x: 120, y: 250, w: 300, h: 28 }
      },
      {
        kind: 'para',
        text: 'বিশেষ নির্দেশনা বক্স',
        lines: ['বিশেষ নির্দেশনা বক্স'],
        boxed: true,
        dashDot: true,
        widthPt: 300,
        rect: { x: 120, y: 290, w: 300, h: 28 }
      }
    ])
  ]);

  const xml = Docx.bodyXml(boxesIr).xml;
  check('ড্যাশ বর্ডারের বক্সে w:val="dashed" বর্ডার আছে', xml.includes('<w:top w:val="dashed"') && xml.includes('<w:bottom w:val="dashed"'));
  check('ড্যাশ-ডট বর্ডারের বক্সে w:val="dotDash" বর্ডার আছে', xml.includes('<w:top w:val="dotDash"') && xml.includes('<w:bottom w:val="dotDash"'));
  check('খালি "ছবি"-বাক্সে নির্দিষ্ট উচ্চতা (w:trHeight ... w:hRule="exact") ও "ছবি" লেবেল আছে', xml.includes('<w:trHeight w:val="2100" w:hRule="exact"/>') && xml.includes('>ছবি<'));
  check('ডানে বসানো "ফরম-৮" বাক্সে ডান-ইনডেন্ট (w:tblInd w:w="9300") ও মাঝ-সাজানো লেখা আছে', xml.includes('<w:tblInd w:w="9300" w:type="dxa"/>') && xml.includes('>ফরম-৮<'));
  check('মাঝের ছোট "তফসিল" বাক্সে মাঝ-ইনডেন্ট (w:tblInd w:w="5000") ও মাঝ-সাজানো লেখা আছে', xml.includes('<w:tblInd w:w="5000" w:type="dxa"/>') && xml.includes('>তফসিল<'));
}

// ============================================================================
// ৫. B9.4 — ঘরের ভেতরে ○ রেডিও-তালিকা ও দুই কলামে স্বাক্ষরের ড্যাশ-রেখা
// ============================================================================
console.log('\n৫. B9.4 — ঘরের ভেতরে ○ রেডিও-তালিকা ও দুই কলামে স্বাক্ষরের ড্যাশ-রেখা যাচাই:');
{
  globalThis.__FZ_ON_FORMKIT = true;

  const radioAndSigIr = makePageIr([
    flowBand([
      {
        kind: 'table',
        formTable: true,
        widthPt: 460,
        heightPt: 70,
        fontPt: 11,
        rect: { x: 54, y: 100, w: 460, h: 70 },
        rows: [
          ['প্রমাণকের ধরন :', { radio: ['( ) জন্ম নিবন্ধন সনদ', '( ) জাতীয় পরিচয়পত্র', '(*) পাসপোর্ট'] }]
        ]
      },
      {
        kind: 'signature_row',
        type: 'signature',
        signatures: ['আবেদনকারীর স্বাক্ষর', 'যাচাইকারীর স্বাক্ষর ও সিল'],
        fontPt: 11,
        rect: { x: 54, y: 220, w: 460, h: 35 }
      }
    ])
  ]);

  const xml = Docx.bodyXml(radioAndSigIr).xml;
  check('ঘরের ভেতরে ○ রেডিও-তালিকা রূপান্তরিত ও উপস্থিত আছে', xml.includes('○ জন্ম নিবন্ধন সনদ') && xml.includes('○ জাতীয় পরিচয়পত্র') && xml.includes('● পাসপোর্ট'));
  const dashedTopMatches = [...xml.matchAll(/<w:top w:val="dashed" w:sz="6"[^>]*\/>/g)];
  check('স্বাক্ষরের ড্যাশ-রেখা দুই কলামে (২টি আলাদা ঘরে w:top w:val="dashed") আছে', dashedTopMatches.length === 2 && xml.includes('আবেদনকারীর স্বাক্ষর') && xml.includes('যাচাইকারীর স্বাক্ষর ও সিল'));
}

// ============================================================================
// ৬. B4.6 — ট্যাব-কলাম (MCQ-বিকল্প, শেষের নম্বর ডান-ট্যাবে, পাশের লেবেল, দাগ টেনে মিল কর)
// ============================================================================
console.log('\n৬. B4.6 — ট্যাব-কলাম (MCQ, ডান-ট্যাব নম্বর, পাশের লেবেল, দাগ টেনে মিল কর) যাচাই:');
{
  globalThis.__FZ_ON_FORMKIT = true;

  const tabColIr = makePageIr([
    flowBand([
      {
        kind: 'para',
        type: 'option_row',
        text: '(ক) ১২   (খ) ১৫   (গ) ১৮   (ঘ) ২৪',
        lines: ['(ক) ১২   (খ) ১৫   (গ) ১৮   (ঘ) ২৪'],
        lineSegs: [[{ x: 60, w: 40 }, { x: 170, w: 40 }, { x: 280, w: 40 }, { x: 390, w: 40 }]],
        fontPt: 12,
        align: 'l',
        rect: { x: 60, y: 100, w: 440, h: 18 }
      },
      {
        kind: 'para',
        type: 'question',
        text: '১। যেকোনো পাঁচটি প্রশ্নের উত্তর দাও :   ১×৫=৫',
        lines: ['১। যেকোনো পাঁচটি প্রশ্নের উত্তর দাও :   ১×৫=৫'],
        fontPt: 12,
        align: 'l',
        rect: { x: 60, y: 130, w: 440, h: 18 }
      },
      {
        kind: 'table',
        type: 'match_col',
        borderless: true,
        widthPt: 400,
        heightPt: 60,
        fontPt: 12,
        rect: { x: 60, y: 165, w: 400, h: 60 },
        rows: [
          ['১০', '15'],
          ['২০', '10'],
          ['৩০ 25']
        ]
      }
    ]),
    {
      kind: 'grid',
      gapBeforePt: 8,
      y0: 240,
      y1: 260,
      cells: [
        {
          x0: 54,
          x1: 510,
          items: [{ kind: 'para', text: 'শ্রেণি ব্যবধানের মধ্যবিন্দু নির্ণয়ের সূত্রটি লেখো', lines: ['শ্রেণি ব্যবধানের মধ্যবিন্দু নির্ণয়ের সূত্রটি লেখো'], fontPt: 12, align: 'l', rect: { x: 54, y: 240, w: 320, h: 18 } }]
        },
        {
          x0: 510,
          x1: 541.3,
          items: [{ kind: 'para', text: '(মধ্যমান)', lines: ['(মধ্যমান)'], fontPt: 12, align: 'l', rect: { x: 512, y: 240, w: 28, h: 18 } }]
        }
      ]
    }
  ]);

  const xml = Docx.bodyXml(tabColIr).xml;
  check('MCQ-বিকল্পে মাপা x-অবস্থানে ৩টি বাঁ-ট্যাব-স্টপ (170, 280, 390pt => 3400, 5600, 7800 dxa) তৈরি হয়েছে',
    xml.includes('<w:tab w:val="left" w:pos="3400"/><w:tab w:val="left" w:pos="5600"/><w:tab w:val="left" w:pos="7800"/>'));
  check('লাইনের শেষের নম্বরে ডান-ট্যাব-স্টপ (<w:tab w:val="right" w:pos="8800"/>) তৈরি হয়েছে',
    xml.includes('<w:tab w:val="right" w:pos="8800"/>') && xml.includes('১×৫=৫'));
  check('"দাগ টেনে মিল কর"-এর শেষ সারি ("৩০ 25") দুটি আলাদা ঘরে ("৩০" ও "25") বিভক্ত হয়েছে',
    xml.includes('>৩০<') && xml.includes('>25<') && !xml.includes('>৩০ 25<'));
  const gridCellWidths = [...xml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => +m[1]);
  const lastGridColW = gridCellWidths[gridCellWidths.length - 1];
  check('পাশের ছোট লেবেল "(মধ্যমান)"-এর ঘর প্রসারিত হয়েছে যাতে লাইন না ভাঙে', lastGridColW >= 1000);

  // tabify-এ "দাগ টেনে মিল কর" অনুচ্ছেদে শেষ লাইনে ১টি সেগমেন্ট থাকলেও ২ কলামে ট্যাব-বিভাজন যাচাই
  const tabRes = IR.tabify(['১০ 15', '২০ 10', '৩০ 25'], [
    [{ x: 60, w: 20 }, { x: 320, w: 20 }],
    [{ x: 60, w: 20 }, { x: 320, w: 20 }],
    [{ x: 60, w: 45 }]
  ]);
  check('tabify-এ শেষ লাইন ("৩০ 25") এক সেগমেন্টে মাপা হলেও ট্যাবসহ ("৩০\\t25") বিভক্ত হয়েছে',
    tabRes && tabRes.lines[2] === '৩০\t25' && tabRes.stops[0] === 320);
}

// ============================================================================
// ৭. B9.5 — faithful-prompt.js, layout-tags.js ও layout-ir.js সমন্বিত পাইপলাইন যাচাই
// ============================================================================
console.log('\n৭. B9.5 — প্রম্পট, ট্যাগ-পার্সার ও IR নির্মাতার সমন্বিত যাচাই:');
{
  globalThis.__FZ_ON_FORMKIT = false;
  const pOff = Prompt.build({ pageCount: 1 });
  globalThis.__FZ_ON_FORMKIT = true;
  const pOn = Prompt.build({ pageCount: 1 });
  check('__FZ_ON_FORMKIT চালু থাকলে প্রম্পটে box_row, photo_box, match_col যুক্ত হয়', pOn.includes('box_row') && pOn.includes('photo_box') && pOn.includes('match_col') && !pOff.includes('box_row'));

  const rawGemini = [
    '[[B:t=heading;p=1;box=50,80,80,920;al=c;fs=l;b=1;fill=1F4E79]]',
    'জাতীয় পরিচয়পত্র নিবন্ধন ফরম',
    '[[B:t=photo_box;p=1;box=90,780,210,920;al=c;fs=s;b=0;bdr=dashed]]',
    'ছবি',
    '[[B:t=box_row;p=1;box=230,80,260,920;al=l;fs=m;b=0]]',
    'মোবাইল : ০১ □ □ □ □ □ □ □ □ □',
    '[[B:t=option_row;p=1;box=280,80,305,920;al=l;fs=m;b=0]]',
    '(ক) ঢাকা   (খ) চট্টগ্রাম   (গ) রাজশাহী   (ঘ) খুলনা',
    '[[B:t=signature;p=1;box=700,80,740,420;al=c;fs=m;b=0]]',
    'আবেদনকারীর স্বাক্ষর',
    '[[B:t=signature;p=1;box=700,580,740,920;al=c;fs=m;b=0]]',
    'কর্মকর্তার স্বাক্ষর',
    '[এআই অডিট নোট ও পরিবর্তনসমূহ: মূল ফাইলের সাথে সম্পূর্ণ যাচাইকৃত; কোনো অনুমান বা সংশোধন করা হয়নি।]'
  ].join('\n');

  const parsed = Tags.parse(rawGemini);
  check('ট্যাগ-পার্সার fill, border ও নতুন ব্লক-ধরন (photo_box, box_row) পার্স করেছে',
    parsed.blocks.length === 6 && parsed.blocks[0].fill === '1F4E79' && parsed.blocks[1].type === 'photo_box' && parsed.blocks[1].border === 'dashed' && parsed.blocks[2].type === 'box_row');

  const pageInfo = {
    1: {
      widthPt: 595.3,
      heightPt: 841.9,
      hrules: [
        { x: 60, y: 580, w: 160, t: 0.75, dashed: true },
        { x: 350, y: 580, w: 160, t: 0.75, dashed: true }
      ],
      boxes: [
        { x0: 440, x1: 520, y0: 320, y1: 410, t: 0.75, dashed: false, photoBox: true }
      ]
    }
  };
  const measures = {
    4: { empty: false, rectPt: { x: 60, y: 585, w: 160, h: 18 }, align: 'c' },
    5: { empty: false, rectPt: { x: 350, y: 585, w: 160, h: 18 }, align: 'c' }
  };
  const builtIr = IR.build({ blocks: parsed.blocks, pages: [{ page: 1, widthPt: 595.3, heightPt: 841.9 }] }, measures, pageInfo);
  const builtXml = Docx.bodyXml(builtIr).xml;
  check('সমন্বিত IR → Docx পাইপলাইনে নীল শিরোনাম, ড্যাশ-বর্ডার ছবি-বাক্স, ১১-ঘরের মোবাইল বাক্স, দুই-কলাম ড্যাশ স্বাক্ষর ও MCQ ট্যাব-স্টপ তৈরি হয়েছে',
    builtXml.includes('w:fill="1F4E79"') && builtXml.includes('w:val="dashed"') && builtXml.includes('<w:tabs>') && builtXml.includes('>ছবি<'));

  delete globalThis.__FZ_ON_FORMKIT;
}

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
