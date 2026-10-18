import { createRequire } from 'module';
import assert from 'assert';

const require = createRequire(import.meta.url);

// ব্রাউজার গ্লোবাল সিমুলেশন (Node পরিবেশে)
const storageMap = new Map();
const sessionMap = new Map();
globalThis.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k)
};
globalThis.sessionStorage = {
  getItem: (k) => (sessionMap.has(k) ? sessionMap.get(k) : null),
  setItem: (k, v) => sessionMap.set(k, String(v)),
  removeItem: (k) => sessionMap.delete(k)
};
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}

const FayzarLayoutIR = require('../js/layout-engine/faithful/layout-ir.js');
const FayzarFaithfulDocx = require('../js/layout-engine/faithful/faithful-docx-builder.js');
const FayzarFaithful = require('../js/layout-engine/faithful/faithful-pipeline.js');
const FayzarLineFit = require('../js/layout-engine/faithful/line-fit.js');
const FayzarDocxPreview = require('../js/layout-engine/docx-preview-render.js');
const FayzarExport = require('../js/layout-engine/fayzar-export.js');
const ConverterStudioBridge = require('../js/engines/converter-studio-bridge.js');
const FayzarStudioFaithful = require('../js/studio-controller.js');

let passed = 0;
let failed = 0;

async function checkAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}: ${err && err.stack ? err.stack : err}`);
  } finally {
    delete globalThis.__FZ_ON_FAITHFUL_STUDIO;
    delete globalThis.__FZ_ON_DOCX_PREVIEW;
    delete globalThis.__FZ_ON_PAGERANGE;
    delete globalThis.__FZ_ON_FONTPICK;
    delete globalThis.__FZ_UNICODE_FONT;
    ConverterStudioBridge.clearTransferData();
  }
}

function sampleIrFixture() {
  return {
    pages: [
      {
        page: 1,
        widthPt: 595.3,
        heightPt: 841.9,
        margins: { top: 54, right: 54, bottom: 54, left: 54 },
        scale: 1,
        bodyFontPt: 12,
        boxes: [],
        bands: [
          {
            kind: 'flow',
            gapBeforePt: 0,
            y0: 58,
            y1: 76,
            cells: [
              {
                x0: 54,
                x1: 541.3,
                items: [
                  {
                    kind: 'para',
                    type: 'heading',
                    text: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার',
                    lines: ['গণপ্রজাতন্ত্রী বাংলাদেশ সরকার'],
                    fontPt: 14,
                    bold: true,
                    align: 'c',
                    indentPt: 0,
                    spaceBeforePt: 0,
                    lineSpacingPt: 16,
                    rect: { x: 160, y: 58, w: 275, h: 18 }
                  }
                ]
              }
            ]
          },
          {
            kind: 'grid',
            gapBeforePt: 10,
            y0: 88,
            y1: 106,
            cells: [
              {
                x0: 54,
                x1: 300,
                items: [
                  {
                    kind: 'para',
                    type: 'body',
                    text: 'স্মারক নং- ১০১/২০২৬',
                    lines: ['স্মারক নং- ১০১/২০২৬'],
                    fontPt: 11,
                    bold: false,
                    align: 'l',
                    indentPt: 0,
                    spaceBeforePt: 0,
                    lineSpacingPt: 14,
                    rect: { x: 54, y: 88, w: 180, h: 14 }
                  }
                ]
              },
              {
                x0: 300,
                x1: 541.3,
                items: [
                  {
                    kind: 'para',
                    type: 'body',
                    text: 'তারিখ: ১৮ অক্টোবর ২০২৬',
                    lines: ['তারিখ: ১৮ অক্টোবর ২০২৬'],
                    fontPt: 11,
                    bold: false,
                    align: 'r',
                    indentPt: 0,
                    rightIndentPt: 4,
                    spaceBeforePt: 0,
                    lineSpacingPt: 14,
                    rect: { x: 380, y: 88, w: 157, h: 14 }
                  }
                ]
              }
            ]
          },
          {
            kind: 'flow',
            gapBeforePt: 14,
            y0: 120,
            y1: 156,
            cells: [
              {
                x0: 54,
                x1: 541.3,
                items: [
                  {
                    kind: 'para',
                    type: 'body',
                    text: 'বিষয়: বার্ষিক সাধারণ সভার নোটিশ প্রদান প্রসঙ্গে।',
                    lines: ['বিষয়: বার্ষিক সাধারণ সভার নোটিশ প্রদান প্রসঙ্গে।'],
                    fontPt: 12,
                    bold: true,
                    align: 'l',
                    indentPt: 12,
                    spaceBeforePt: 6,
                    lineSpacingPt: 15,
                    rect: { x: 66, y: 120, w: 360, h: 16 }
                  }
                ]
              }
            ]
          },
          {
            kind: 'flow',
            gapBeforePt: 16,
            y0: 172,
            y1: 232,
            cells: [
              {
                x0: 54,
                x1: 541.3,
                items: [
                  {
                    kind: 'table',
                    fontPt: 11,
                    widthPt: 480,
                    heightPt: 52,
                    indentPt: 0,
                    spaceBeforePt: 8,
                    colFractions: [0.25, 0.75],
                    rowHeightsPt: [24, 28],
                    rowHeightsExact: true,
                    rows: [
                      ['ক্রমিক', 'বিবরণ'],
                      ['০১', 'মূল সভার কার্যবিবরণী অনুমোদন']
                    ],
                    rect: { x: 54, y: 172, w: 480, h: 52 }
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    warnings: []
  };
}

async function unpackDocxXml(docxBlobOrBytes) {
  const zip = await FayzarFaithfulDocx.MiniJSZip.loadAsync(docxBlobOrBytes);
  const docFile = zip.file('word/document.xml');
  const stylesFile = zip.file('word/styles.xml');
  const relsFile = zip.file('word/_rels/document.xml.rels');
  return {
    documentXml: docFile ? await docFile.async('string') : '',
    stylesXml: stylesFile ? await stylesFile.async('string') : '',
    relsXml: relsFile ? await relsFile.async('string') : ''
  };
}

function stripTextNodesFromXml(xml) {
  return String(xml).replace(/<w:t(?:\s+[^>]*)?>[\s\S]*?<\/w:t>/g, '<w:t/>');
}

console.log('=== A1_F3_REBASE_v8: হুবহু-মোড → স্টুডিও (Rebase) টেস্ট ===');

await checkAsync('১. IR → অনুচ্ছেদের লেখা বদল → নতুন মাস্টার .docx-এ বদলানো লেখা আছে কিন্তু অন্য সব XML অপরিবর্তিত', async () => {
  globalThis.__FZ_ON_FAITHFUL_STUDIO = true;
  const ir = sampleIrFixture();

  // প্রথম মাস্টার .docx তৈরি
  const master1 = await FayzarFaithfulDocx.build(ir, { type: 'uint8array' });
  const { documentXml: xml1, stylesXml: styles1 } = await unpackDocxXml(master1);

  assert.ok(xml1.includes('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার'), 'মূল শিরোনাম থাকতে হবে');
  assert.ok(xml1.includes('বিষয়: বার্ষিক সাধারণ সভার নোটিশ প্রদান প্রসঙ্গে।'), 'মূল বিষয়ের লেখা থাকতে হবে');

  // ব্লক-তালিকা থেকে লেখা বদল
  FayzarFaithfulDocx.updateBlockText(ir, 0, 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার — শিক্ষা মন্ত্রণালয়');
  FayzarFaithfulDocx.updateBlockText(ir, 3, 'বিষয়: জরুরি বিশেষ সাধারণ সভার সংশোধিত নোটিশ।');

  const master2 = await FayzarFaithfulDocx.build(ir, { type: 'uint8array' });
  const { documentXml: xml2, stylesXml: styles2 } = await unpackDocxXml(master2);

  // নতুন লেখা উপস্থিত এবং পুরোনো লেখা প্রতিস্থাপিত
  assert.ok(xml2.includes('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার — শিক্ষা মন্ত্রণালয়'), 'বদলানো শিরোনাম নতুন .docx-এ থাকতে হবে');
  assert.ok(xml2.includes('বিষয়: জরুরি বিশেষ সাধারণ সভার সংশোধিত নোটিশ।'), 'বদলানো বিষয়ের লেখা নতুন .docx-এ থাকতে হবে');
  assert.ok(!xml2.includes('বিষয়: বার্ষিক সাধারণ সভার নোটিশ প্রদান প্রসঙ্গে।'), 'পুরোনো বিষয়ের লেখা আর থাকবে না');

  // অন্য সব XML (লেআউট, অবস্থান, ফাঁক, ফন্ট, ইনডেন্ট, টেবিল, সেকশন) হুবহু অপরিবর্তিত
  assert.strictEqual(styles2, styles1, 'styles.xml অপরিবর্তিত থাকতে হবে');
  assert.strictEqual(
    stripTextNodesFromXml(xml2),
    stripTextNodesFromXml(xml1),
    '<w:t> ছাড়া অন্য সব XML ট্যাগ ও অ্যাট্রিবিউট ১০০% অপরিবর্তিত থাকতে হবে'
  );

  // নতুন লেখাকে পুরোনো লেখায় ফিরিয়ে দিলে পুরো document.xml অক্ষরে-অক্ষরে সমান
  const restoredXml = xml2
    .replace('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার — শিক্ষা মন্ত্রণালয়', 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার')
    .replace('বিষয়: জরুরি বিশেষ সাধারণ সভার সংশোধিত নোটিশ।', 'বিষয়: বার্ষিক সাধারণ সভার নোটিশ প্রদান প্রসঙ্গে।');
  assert.strictEqual(restoredXml, xml1, 'লেখা বাদে অন্য সব XML হুবহু এক হতে হবে');
});

await checkAsync('২. IR → সরাসরি item.text বদল এবং গ্রিড ও টেবিল ব্লকের লেখা বদল → লেআউট XML অপরিবর্তিত', async () => {
  globalThis.__FZ_ON_FAITHFUL_STUDIO = true;
  const ir = sampleIrFixture();

  const masterBefore = await FayzarFaithfulDocx.build(ir, { type: 'uint8array' });
  const { documentXml: xmlBefore } = await unpackDocxXml(masterBefore);

  // ১) সরাসরি item.text মিউটেশন (lines না ছুঁয়েও)
  ir.pages[0].bands[1].cells[0].items[0].text = 'স্মারক নং- ৯৯৯/২০২৬ (সংশোধিত)';
  // ২) টেবিল ব্লকের লেখা বদল
  FayzarFaithfulDocx.updateBlockText(ir, 4, 'ক্রমিক\tবিবরণ\n০১\tবাজেট ও বার্ষিক প্রতিবেদন চূড়ান্ত অনুমোদন');

  const masterAfter = await FayzarFaithfulDocx.build(ir, { type: 'uint8array' });
  const { documentXml: xmlAfter } = await unpackDocxXml(masterAfter);

  assert.ok(xmlAfter.includes('স্মারক নং- ৯৯৯/২০২৬ (সংশোধিত)'), 'গ্রিড ঘরের নতুন লেখা থাকতে হবে');
  assert.ok(xmlAfter.includes('বাজেট ও বার্ষিক প্রতিবেদন চূড়ান্ত অনুমোদন'), 'টেবিল ঘরের নতুন লেখা থাকতে হবে');
  assert.strictEqual(
    stripTextNodesFromXml(xmlAfter),
    stripTextNodesFromXml(xmlBefore),
    'গ্রিড ও টেবিলের লেখা বদলালেও কলাম-প্রস্থ, সারি-উচ্চতা ও অন্য সব XML অপরিবর্তিত থাকতে হবে'
  );
});

await checkAsync('৩. কনভার্টার → স্টুডিও সেতু (ConverterStudioBridge): IR ও মাস্টার .docx পাঠানো ও গ্রহণ', async () => {
  globalThis.__FZ_ON_FAITHFUL_STUDIO = true;
  const ir = sampleIrFixture();
  const masterDocx = await FayzarFaithfulDocx.build(ir, { type: 'uint8array' });

  const sent = ConverterStudioBridge.sendToStudio({
    ir,
    masterDocx,
    fileName: 'Notice_Faithful.pdf'
  });

  assert.ok(sent, 'sendToStudio সফল পেলোড ফেরত দেবে');
  assert.strictEqual(sent.mode, 'faithful');
  assert.ok(sent.ir && Array.isArray(sent.ir.pages), 'পেলোডে IR থাকতে হবে');
  assert.ok(sent.masterDocx, 'পেলোডে মাস্টার .docx থাকতে হবে');
  assert.ok(sent.text.includes('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার'), 'IR থেকে স্বয়ংক্রিয়ভাবে লেখা নিষ্কাশিত হবে');

  const received = ConverterStudioBridge.getTransferData();
  assert.ok(received, 'getTransferData() ডেটা ফেরত দেবে');
  assert.strictEqual(received.mode, 'faithful');
  assert.strictEqual(received.fileName, 'Notice_Faithful.pdf');
  assert.ok(received.ir && received.ir.pages.length === 1, 'হস্তান্তরিত IR অক্ষত থাকতে হবে');
  assert.ok(received.masterDocx, 'হস্তান্তরিত মাস্টার .docx পাওয়া যাবে');

  const { documentXml } = await unpackDocxXml(received.masterDocx);
  assert.ok(documentXml.includes('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার'), 'হস্তান্তরিত মাস্টার .docx বৈধ হতে হবে');
});

await checkAsync('৪. FayzarFaithful.produce ও sendToStudio: পাইপলাইন থেকে সরাসরি স্টুডিওতে IR ও মাস্টার .docx প্রেরণ', async () => {
  globalThis.__FZ_ON_FAITHFUL_STUDIO = true;
  const ir = sampleIrFixture();

  const res = await FayzarFaithful.produce(ir, 'docx-unicode', {
    fileName: 'Pipeline_Doc',
    sendToStudio: true
  });

  assert.ok(res.ir, 'produce ফলাফলে ir থাকবে');
  assert.ok(res.masterDocx, 'produce ফলাফলে masterDocx থাকবে');

  const transferred = ConverterStudioBridge.getTransferData();
  assert.ok(transferred && transferred.ir && transferred.masterDocx, 'সেতুতে IR ও masterDocx পৌঁছাবে');
});

await checkAsync('৫. স্টুডিওতে IR লোড: FayzarDocxPreview দিয়ে মাস্টার .docx প্রিভিউ এবং অনুপস্থিতিতে সহজ HTML প্রিভিউ ফলব্যাক', async () => {
  globalThis.__FZ_ON_FAITHFUL_STUDIO = true;
  const ir = sampleIrFixture();
  const masterDocx = await FayzarFaithfulDocx.build(ir, { type: 'uint8array' });

  ConverterStudioBridge.sendToStudio({ ir, masterDocx, fileName: 'Studio_Preview_Test' });
  const transferred = ConverterStudioBridge.getTransferData();

  const previewContainer = { innerHTML: '' };
  const blockListContainer = {
    innerHTML: '',
    _inputs: [],
    querySelectorAll() { return this._inputs; }
  };
  const inputText = { value: '' };

  // ক) FayzarDocxPreview সক্রিয় অবস্থায় মাস্টার .docx থেকে প্রিভিউ
  const loaded = await FayzarStudioFaithful.loadFromBridge(transferred, {
    previewContainer,
    blockListContainer,
    inputText
  });

  assert.ok(loaded && loaded.preview, 'স্টুডিওতে হুবহু-মোড লোড হতে হবে');
  assert.strictEqual(loaded.preview.mode, 'docx-preview', 'FayzarDocxPreview থাকলে docx-preview ব্যবহৃত হবে');
  assert.ok(previewContainer.innerHTML.includes('fz-page'), 'প্রিভিউতে .fz-page পাতা তৈরি হবে');
  assert.ok(previewContainer.innerHTML.includes('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার'), 'প্রিভিউতে মূল লেখা থাকবে');
  assert.ok(blockListContainer.innerHTML.includes('faithful-block-input'), 'বামে সম্পাদনাযোগ্য ব্লকের তালিকা তৈরি হবে');
  assert.strictEqual(loaded.blocks.length, 5, 'মোট ৫টি সম্পাদনাযোগ্য ব্লক (৪টি অনুচ্ছেদ + ১টি ছক) পাওয়া যাবে');

  // খ) FayzarDocxPreview নিষ্ক্রিয় থাকলে সহজ HTML প্রিভিউ ফলব্যাক
  globalThis.__FZ_ON_DOCX_PREVIEW = false;
  const fallbackRes = await FayzarStudioFaithful.renderPreview({ previewContainer });
  assert.strictEqual(fallbackRes.mode, 'simple-html', 'FayzarDocxPreview না থাকলে simple-html ফলব্যাক ব্যবহৃত হবে');
  assert.ok(previewContainer.innerHTML.includes('faithful-fallback-page'), 'ফলব্যাক প্রিভিউ পাতা রেন্ডার হবে');
  assert.ok(previewContainer.innerHTML.includes('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার'), 'ফলব্যাক প্রিভিউতেও সব ব্লকের লেখা থাকবে');
});

await checkAsync('৬. স্টুডিওতে বামের ব্লক-তালিকা সম্পাদনা → FayzarFaithfulDocx.build দিয়ে নতুন মাস্টার .docx ও FayzarExport.produce দিয়ে নামানো', async () => {
  globalThis.__FZ_ON_FAITHFUL_STUDIO = true;
  const ir = sampleIrFixture();
  const masterDocx0 = await FayzarFaithfulDocx.build(ir, { type: 'uint8array' });
  const { documentXml: xml0 } = await unpackDocxXml(masterDocx0);

  ConverterStudioBridge.sendToStudio({ ir, masterDocx: masterDocx0, fileName: 'Edited_Studio_Doc' });

  const previewContainer = { innerHTML: '' };
  const blockListContainer = { innerHTML: '' };
  const inputText = { value: '' };

  await FayzarStudioFaithful.loadFromBridge(ConverterStudioBridge.getTransferData(), {
    previewContainer,
    blockListContainer,
    inputText
  });

  // বামের ব্লকের তালিকা থেকে ২য় ব্লক (index 1: স্মারক নং) ও ৪র্থ ব্লক (index 3: বিষয়) সম্পাদনা
  await FayzarStudioFaithful.updateBlock(1, 'স্মারক নং- ৭৭৭/স্টুডিও-সম্পাদিত');
  await FayzarStudioFaithful.updateBlock('p0-b2-c0-i0', 'বিষয়: স্টুডিও থেকে সম্পাদিত চূড়ান্ত বিজ্ঞপ্তি।');

  // প্রিভিউ হালনাগাদ হয়েছে কিনা যাচাই
  assert.ok(previewContainer.innerHTML.includes('স্মারক নং- ৭৭৭/স্টুডিও-সম্পাদিত'), 'প্রিভিউতে সম্পাদিত স্মারক নং দেখা যাবে');
  assert.ok(previewContainer.innerHTML.includes('বিষয়: স্টুডিও থেকে সম্পাদিত চূড়ান্ত বিজ্ঞপ্তি।'), 'প্রিভিউতে সম্পাদিত বিষয় দেখা যাবে');

  // FayzarExport.produce দিয়ে ইউনিকোড .docx নামানো
  const exported = await FayzarStudioFaithful.rebuildAndExport('docx', 'unicode');
  assert.ok(exported && exported.blob, 'রপ্তানিকৃত ফাইল পাওয়া যাবে');
  assert.ok(Array.isArray(exported.steps) && exported.steps.includes('master-docx:faithful'), 'FayzarExport.produce-এ master-docx:faithful ধাপ চলবে');

  const { documentXml: xmlExported } = await unpackDocxXml(exported.blob);
  assert.ok(xmlExported.includes('স্মারক নং- ৭৭৭/স্টুডিও-সম্পাদিত'), 'রপ্তানিকৃত .docx-এ নতুন স্মারক নং থাকবে');
  assert.ok(xmlExported.includes('বিষয়: স্টুডিও থেকে সম্পাদিত চূড়ান্ত বিজ্ঞপ্তি।'), 'রপ্তানিকৃত .docx-এ নতুন বিষয় থাকবে');

  // লেআউট ও অবস্থান ১০০% অক্ষত আছে কিনা যাচাই
  assert.strictEqual(
    stripTextNodesFromXml(xmlExported),
    stripTextNodesFromXml(xml0),
    'স্টুডিও থেকে সম্পাদনা ও রপ্তানির পর লেআউট/অবস্থান XML ১০০% অপরিবর্তিত থাকতে হবে'
  );
});

await checkAsync('৭. স্টুডিও থেকে বিজয় .docx ও Word 2003 .doc রপ্তানি (FayzarExport.produce একক পথ)', async () => {
  globalThis.__FZ_ON_FAITHFUL_STUDIO = true;
  const ir = sampleIrFixture();
  const masterDocx0 = await FayzarFaithfulDocx.build(ir, { type: 'uint8array' });

  ConverterStudioBridge.sendToStudio({ ir, masterDocx: masterDocx0, fileName: 'Bijoy_Export_Test' });
  await FayzarStudioFaithful.loadFromBridge(ConverterStudioBridge.getTransferData(), {});
  await FayzarStudioFaithful.updateBlock(0, 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার (সংশোধিত)');

  let capturedMasterInHandler = null;
  globalThis.DocxHandler = {
    async convertDocx(masterBlob) {
      capturedMasterInHandler = masterBlob;
      return { convertedBlob: masterBlob };
    }
  };
  globalThis.DocxToDocConverter = function () {
    this.convertDocxToDoc = async (bijoyBlob, opts) => {
      assert.strictEqual(opts.honorCellMargins, true, 'হুবহু-মোডের মাস্টারে honorCellMargins সক্রিয় থাকবে');
      return { blob: bijoyBlob };
    };
  };

  try {
    const resDoc = await FayzarStudioFaithful.rebuildAndExport('doc', 'bijoy');
    assert.deepStrictEqual(resDoc.steps, ['master-docx:faithful', 'bijoy-docx', 'doc']);
    assert.ok(capturedMasterInHandler, 'DocxHandler নতুন মাস্টার .docx পাবে');
    const { documentXml } = await unpackDocxXml(capturedMasterInHandler);
    assert.ok(documentXml.includes('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার (সংশোধিত)'), 'রপ্তানি পথে সম্পাদিত মাস্টার .docx ব্যবহৃত হবে');
  } finally {
    delete globalThis.DocxHandler;
    delete globalThis.DocxToDocConverter;
  }
});

await checkAsync('৮. গেট-যাচাই: __FZ_ON_FAITHFUL_STUDIO বন্ধ থাকলে সব মডিউলের আচরণ হুবহু আগের মতো', async () => {
  delete globalThis.__FZ_ON_FAITHFUL_STUDIO;

  // ক) সেতুতে text ছাড়া শুধু ir দিলে আগের মতোই false ফেরত দেবে
  const ir = sampleIrFixture();
  assert.strictEqual(ConverterStudioBridge.sendToStudio({ ir }), false, 'সুইচ বন্ধ থাকলে text ছাড়া sendToStudio false দেবে');

  // খ) সাধারণ text পাঠালে পেলোডে কোনো অতিরিক্ত ক্ষেত্র (ir/masterDocx/mode) যুক্ত হবে না
  const normalPayload = ConverterStudioBridge.sendToStudio({ text: 'সাধারণ পরীক্ষা', fileName: 'Test.docx' });
  assert.strictEqual(normalPayload.ir, undefined, 'সুইচ বন্ধ থাকলে ir থাকবে না');
  assert.strictEqual(normalPayload.masterDocx, undefined, 'সুইচ বন্ধ থাকলে masterDocx থাকবে না');
  assert.strictEqual(normalPayload.mode, undefined, 'সুইচ বন্ধ থাকলে mode থাকবে না');

  // গ) সুইচ বন্ধ থাকলে FayzarFaithfulDocx.bodyXml কোনো _fzLayoutSnap যোগ করে না এবং extractBlocks খালি অ্যারে দেয়
  const irClean = sampleIrFixture();
  const bodyOut = FayzarFaithfulDocx.bodyXml(irClean);
  assert.ok(bodyOut && typeof bodyOut.xml === 'string' && bodyOut.xml.includes('<w:sectPr>'), 'সুইচ বন্ধ থাকলেও সাধারণ bodyXml স্বাভাবিকভাবে কাজ করবে');
  assert.strictEqual(irClean.pages[0].bands[0].cells[0].items[0]._fzLayoutSnap, undefined, 'সুইচ বন্ধ থাকলে _fzLayoutSnap যোগ হবে না');
  assert.deepStrictEqual(FayzarFaithfulDocx.extractBlocks(irClean), [], 'সুইচ বন্ধ থাকলে extractBlocks খালি তালিকা দেবে');
});

await checkAsync('৯. রিবেস অখণ্ডতা যাচাই: PAGERANGE, FONTPICK ও studioFit সুইচসমূহ সম্পূর্ণ অক্ষত', async () => {
  // G3: __FZ_ON_PAGERANGE যাচাই
  assert.strictEqual(typeof FayzarFaithful.isPageRangeOn, 'function', 'isPageRangeOn থাকতে হবে');
  assert.strictEqual(typeof FayzarFaithful.parsePageRange, 'function', 'parsePageRange থাকতে হবে');
  assert.strictEqual(typeof FayzarFaithful.filterQueueByRange, 'function', 'filterQueueByRange থাকতে হবে');
  globalThis.__FZ_ON_PAGERANGE = true;
  const pr = FayzarFaithful.parsePageRange('১-৩, ৫', 6);
  assert.strictEqual(pr.ok, true);
  assert.deepStrictEqual(pr.pages, [1, 2, 3, 5]);

  // B7: __FZ_ON_FONTPICK যাচাই
  assert.ok(Array.isArray(FayzarFaithfulDocx.UNICODE_FONTS), 'UNICODE_FONTS থাকতে হবে');
  assert.strictEqual(typeof FayzarFaithfulDocx.resolveDocxFont, 'function', 'resolveDocxFont থাকতে হবে');
  assert.strictEqual(typeof FayzarLineFit.isFontPickOn, 'function', 'FayzarLineFit.isFontPickOn থাকতে হবে');
  globalThis.__FZ_ON_FONTPICK = true;
  assert.strictEqual(FayzarFaithfulDocx.resolveDocxFont('Kalpurush'), 'Kalpurush');
  const ir = sampleIrFixture();
  const bodyKalpurush = FayzarFaithfulDocx.bodyXml(ir, { font: 'Kalpurush' });
  assert.ok(bodyKalpurush.xml.includes('Kalpurush'), 'FONTPICK চালু থাকলে নির্বাচিত ফন্ট ব্যবহৃত হবে');
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
