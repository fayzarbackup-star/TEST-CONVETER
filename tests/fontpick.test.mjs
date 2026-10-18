/**
 * D_B7_FONT_v7 — হুবহু-মোডে ইউনিকোড ফন্ট বাছাই (B7) ইউনিট টেস্ট
 * Node পরিবেশে বাইরের কোনো লাইব্রেরি বা DOM ছাড়াই চলে।
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const FayzarLineFit = require('../js/layout-engine/faithful/line-fit.js');
const FayzarFaithfulDocx = require('../js/layout-engine/faithful/faithful-docx-builder.js');
globalThis.FayzarLineFit = FayzarLineFit;
globalThis.FayzarFaithfulDocx = FayzarFaithfulDocx;
const FayzarFaithfulUI = require('../js/faithful-mode-ui.js');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
  } catch (err) {
    failed++;
    console.error(`ব্যর্থ: ${name} ->`, err && err.message ? err.message : err);
  }
}

function makeSampleIr(fontName) {
  return {
    font: fontName,
    pages: [
      {
        page: 1,
        widthPt: 595.3,
        heightPt: 841.9,
        margins: { top: 54, right: 54, bottom: 54, left: 54 },
        bands: [
          {
            kind: 'flow',
            y0: 70,
            cells: [
              {
                x0: 54,
                x1: 541.3,
                items: [
                  {
                    kind: 'para',
                    type: 'body',
                    text: 'ফয়জার এআই কম্পোজ — ইউনিকোড ফন্ট পরীক্ষা',
                    lines: ['ফয়জার এআই কম্পোজ — ইউনিকোড ফন্ট পরীক্ষা'],
                    keepLines: true,
                    fontPt: 12,
                    align: 'l',
                    rect: { x: 54, y: 70, w: 300, h: 16 }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };
}

// ১. সুইচ (__FZ_ON_FONTPICK) বন্ধ থাকলে আচরণ ও আউটপুট বাইট-বাই-বাইট অপরিবর্তিত
await test('সুইচ বন্ধ থাকলে ডিফল্ট ফন্ট ও docx XML বাইট-বাই-বাইট অপরিবর্তিত (SutonnyOMJ)', () => {
  delete globalThis.__FZ_ON_FONTPICK;
  delete globalThis.__FZ_UNICODE_FONT;
  assert.equal(FayzarFaithfulUI.isFontPickOn(), false);
  assert.equal(FayzarLineFit.isFontPickOn(), false);

  const baseXml = FayzarFaithfulDocx.bodyXml(makeSampleIr()).xml;
  globalThis.__FZ_UNICODE_FONT = 'Kalpurush';
  const offWithFontXml = FayzarFaithfulDocx.bodyXml(makeSampleIr('Kalpurush'), { font: 'Kalpurush' }).xml;

  assert.equal(offWithFontXml, baseXml, 'সুইচ বন্ধ থাকলে আউটপুট বাইট-বাই-বাইট এক হতে হবে');
  assert.match(offWithFontXml, /w:rFonts w:ascii="SutonnyOMJ" w:hAnsi="SutonnyOMJ" w:cs="SutonnyOMJ"/);
  assert.doesNotMatch(offWithFontXml, /Kalpurush/);
  delete globalThis.__FZ_UNICODE_FONT;
});

await test('সুইচ বন্ধ থাকলে line-fit প্রস্থ-অনুপাত গুণ করে না (অপরিবর্তিত)', () => {
  delete globalThis.__FZ_ON_FONTPICK;
  const measure = (s) => s.length * 50;
  const wSutonny = FayzarLineFit.lineWidthPt('বাংলা লেখা', { fontPt: 12, font: 'SutonnyOMJ' }, measure, 'SutonnyOMJ');
  const wKalpurush = FayzarLineFit.lineWidthPt('বাংলা লেখা', { fontPt: 12, font: 'Kalpurush' }, measure, 'Kalpurush');
  assert.equal(wSutonny, wKalpurush);
});

// ২. ব্রাউজারে ফন্ট আছে কি না যাচাই (document.fonts.check এবং ক্যানভাস fallback)
await test('document.fonts.check দিয়ে ৪টি ফন্ট (Kalpurush, SutonnyOMJ, Nikosh, SolaimanLipi) যাচাই হয়', () => {
  globalThis.__FZ_ON_FONTPICK = true;
  const mockDoc = {
    fonts: {
      check(spec) {
        return spec.includes('Kalpurush') || spec.includes('Nikosh');
      }
    }
  };
  const avail = FayzarFaithfulUI.detectAvailableFonts(mockDoc);
  assert.equal(avail.SutonnyOMJ, false);
  assert.equal(avail.Kalpurush, true);
  assert.equal(avail.Nikosh, true);
  assert.equal(avail.SolaimanLipi, false);
});

await test('document.fonts না থাকলে ক্যানভাস measureText fallback দিয়ে ফন্ট শনাক্ত হয়', () => {
  globalThis.__FZ_ON_FONTPICK = true;
  const mockCanvasDoc = {
    createElement(tag) {
      if (tag !== 'canvas') return null;
      return {
        getContext() {
          return {
            font: '',
            measureText(str) {
              if (this.font.includes('SolaimanLipi')) return { width: str.length * 19.5 };
              if (this.font.includes('monospace')) return { width: str.length * 22 };
              return { width: str.length * 21 };
            }
          };
        }
      };
    }
  };
  assert.equal(FayzarFaithfulUI.isFontAvailable('SolaimanLipi', mockCanvasDoc), true);
  assert.equal(FayzarFaithfulUI.isFontAvailable('SutonnyOMJ', mockCanvasDoc), false);
});

// ৩. ডিফল্ট ফন্ট বাছাই-যুক্তি (SutonnyOMJ থাকলে সেটিই, না থাকলে Kalpurush)
await test('SutonnyOMJ থাকলে ডিফল্ট SutonnyOMJ, না থাকলে Kalpurush বাছাই হয়', () => {
  globalThis.__FZ_ON_FONTPICK = true;
  assert.equal(
    FayzarFaithfulUI.pickDefaultFont({ SutonnyOMJ: true, Kalpurush: true, Nikosh: true, SolaimanLipi: true }),
    'SutonnyOMJ'
  );
  assert.equal(
    FayzarFaithfulUI.pickDefaultFont({ SutonnyOMJ: false, Kalpurush: true, Nikosh: true, SolaimanLipi: false }),
    'Kalpurush'
  );
  assert.equal(
    FayzarFaithfulUI.pickDefaultFont({ SutonnyOMJ: false, Kalpurush: false, Nikosh: false, SolaimanLipi: false }),
    'Kalpurush'
  );
});

// ৪. docx XML ও styles.xml-এ w:rFonts যাচাই
await test('সুইচ চালু থাকলে বাছাইকৃত ফন্ট (Kalpurush, SutonnyOMJ, Nikosh, SolaimanLipi) docx XML-এর w:rFonts-এ বসে', async () => {
  globalThis.__FZ_ON_FONTPICK = true;

  for (const font of ['SutonnyOMJ', 'Kalpurush', 'Nikosh', 'SolaimanLipi']) {
    FayzarFaithfulUI.setSelectedFont(font);
    const runXml = FayzarFaithfulDocx.runsFor('বাংলা পরীক্ষা', { fontPt: 12 });
    assert.match(
      runXml,
      new RegExp(`w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"`),
      `${font} রানে w:rFonts থাকা আবশ্যক`
    );

    const body = FayzarFaithfulDocx.bodyXml(makeSampleIr(font), { font });
    assert.match(
      body.xml,
      new RegExp(`w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"`),
      `${font} bodyXml-এ w:rFonts থাকা আবশ্যক`
    );

    // JSZip মক দিয়ে build()-এ styles.xml ও document.xml যাচাই
    const files = {};
    class MockJSZip {
      file(name, content) { files[name] = content; }
      async generateAsync() { return files; }
    }
    await FayzarFaithfulDocx.build(makeSampleIr(font), { font, JSZip: MockJSZip });
    assert.match(files['word/styles.xml'], new RegExp(`w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"`));
    assert.match(files['word/document.xml'], new RegExp(`w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"`));
  }
});

// ৫. ফন্ট বদলালে line-fit প্রস্থ-অনুপাত (Kalpurush ×1.00, SutonnyOMJ ×0.94) যাচাই
await test('line-fit.js-এ Kalpurush ×1.00 এবং SutonnyOMJ ×0.94 অনুপাতে প্রস্থ মাপে ও ফন্ট বদলে পুনরায় ফিট করে', () => {
  globalThis.__FZ_ON_FONTPICK = true;
  assert.equal(FayzarLineFit.getFontWidthRatio('Kalpurush'), 1.00);
  assert.equal(FayzarLineFit.getFontWidthRatio('SutonnyOMJ'), 0.94);

  const measure = (s) => s.length * 100; // প্রতি অক্ষর ১০০px @ ১০০px ফন্ট = ১pt/অক্ষর/pt
  const item = { fontPt: 10, bold: false };
  const text = 'কখগঘঙচছজঝঞ'; // ১০ অক্ষর -> ১০০pt (×১.০০) অথবা ৯৪pt (×০.৯৪)

  const wKal = FayzarLineFit.lineWidthPt(text, item, measure, 'Kalpurush');
  const wSut = FayzarLineFit.lineWidthPt(text, item, measure, 'SutonnyOMJ');
  assert.equal(Math.round(wKal * 100) / 100, 100);
  assert.equal(Math.round(wSut * 100) / 100, 94);

  // এমন প্রস্থের ঘর (৯৮pt, SAFE=0.98 সহ ৯৬.০৪pt) যেখানে SutonnyOMJ (৯৪pt) আঁটে কিন্তু Kalpurush (১০০pt) না এঁটে ছোট হয়
  const ir = makeSampleIr('SutonnyOMJ');
  const cell = ir.pages[0].bands[0].cells[0];
  cell.x0 = 0;
  cell.x1 = 98; // avail = 98 * 0.98 = 96.04pt
  const para = cell.items[0];
  para.text = text;
  para.lines = [text];
  para.fontPt = 10;
  para.rect = { x: 0, y: 70, w: 95, h: 14 };

  FayzarFaithfulUI.setSelectedFont('SutonnyOMJ', { ir, measure });
  assert.equal(para.fontPt, 10, 'SutonnyOMJ (×0.94 = 94pt) ৯৬.০৪pt ঘরে ফন্ট না কমিয়েই আঁটবে');

  FayzarFaithfulUI.setSelectedFont('Kalpurush', { ir, measure });
  assert.ok(para.fontPt < 10, 'Kalpurush (×1.00 = 100pt) ৯৬.০৪pt ঘরে আঁটাতে ফন্ট ছোট হবে');
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
