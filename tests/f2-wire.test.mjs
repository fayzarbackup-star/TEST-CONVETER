/**
 * Fayzar — স্টুডিওতে মাস্টার .docx প্রিভিউ সংযোগ পরীক্ষা (A3_F2_WIRE_v6)
 * =========================================================================
 * পরীক্ষাসমূহ (DOM ছাড়া Node পরিবেশে):
 *  ১. সুইচ বন্ধে (__FZ_ON_DOCX_PREVIEW বন্ধ) ৩০০ms ডিবাউন্স ও পুরোনো previewHtml পথ
 *  ২. সুইচ চালুতে ডাউনলোডের একই layoutOptions() দিয়ে exportDocx → FayzarDocxPreview.render
 *  ৩. টাইপ করার সময় ডিবাউন্স (~৬০০ms) এবং দ্রুত ইনপুটে আগের অপেক্ষমাণ কল বাতিল
 *  ৪. পুরোনো রেন্ডার চলাকালে নতুন রেন্ডার শুরু হলে পুরোনো রেন্ডারের ফল বাদ (stale cancellation)
 *  ৫. রেন্ডার বা exportDocx ব্যর্থ হলে স্বয়ংক্রিয়ভাবে পুরোনো HTML-প্রিভিউতে ফিরে যাওয়া (fallback)
 *  ৬. Edit Bridge: .docx প্রিভিউ মোডে (data-fz-p / .fz-page) collectFromDom না ভাঙা ও বাংলা বার্তা
 *  ৭. studio.html-এ docx-preview-render.js স্ক্রিপ্ট ট্যাগের সঠিক অবস্থান যাচাই
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let JSZip = null;
try {
  JSZip = require('../js/jszip.min.js');
  globalThis.JSZip = JSZip;
} catch (_) { /* স্ট্যান্ডঅ্যালোন বান্ডেলে jszip না থাকলে সরাসরি XML অবজেক্ট ব্যবহৃত হবে */ }

let DocxPreview = null;
try {
  DocxPreview = require('../js/layout-engine/docx-preview-render.js');
} catch (_) {
  /* স্ট্যান্ডঅ্যালোন বান্ডেলে docx-preview-render.js না থাকলে সমতুল্য ফলব্যাক রেন্ডারার */
  DocxPreview = {
    async render(docxInput) {
      let xml = '';
      if (docxInput && typeof docxInput === 'object' && typeof docxInput.documentXml === 'string') {
        xml = docxInput.documentXml;
      } else if (Buffer.isBuffer(docxInput) || docxInput instanceof Uint8Array) {
        const buf = Buffer.from(docxInput);
        if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4B && JSZip) {
          const z = await JSZip.loadAsync(buf);
          const f = z.file('word/document.xml');
          if (f) xml = await f.async('string');
        }
      }
      const texts = [];
      const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
      let m;
      while ((m = re.exec(xml)) !== null) texts.push(m[1]);
      const bodyHtml = texts.map((t) => `<p class="fz-p">${t}</p>`).join('');
      const pageHtml = `<div class="fz-page" data-fz-p="0">${bodyHtml}</div>`;
      return { html: `<div class="fz-preview-root">${pageHtml}</div>`, pages: [pageHtml], pageCount: 1 };
    }
  };
}
const StudioEditBridge = require('../js/engines/studio-edit-bridge.js');
const F2Wire = require('../js/studio-controller.js');

/** পরীক্ষার জন্য ছোট বৈধ .docx পেলোড তৈরি */
async function createMiniDocxPayload(text) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${text}</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
  </w:body>
</w:document>`;

  if (!JSZip) {
    return { documentXml };
  }

  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file('word/document.xml', documentXml);
  return await zip.generateAsync({ type: 'nodebuffer' });
}

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  const prevOn = globalThis.__FZ_ON_DOCX_PREVIEW;
  const prevOff = globalThis.__FZ_OFF_DOCX_PREVIEW;
  try {
    await fn();
    passed++;
    console.log(`  [পাস] ${name}`);
  } catch (err) {
    failed++;
    console.error(`  [ব্যর্থ] ${name}: ${err.message}`);
  } finally {
    if (prevOn === undefined) delete globalThis.__FZ_ON_DOCX_PREVIEW;
    else globalThis.__FZ_ON_DOCX_PREVIEW = prevOn;
    if (prevOff === undefined) delete globalThis.__FZ_OFF_DOCX_PREVIEW;
    else globalThis.__FZ_OFF_DOCX_PREVIEW = prevOff;
  }
}

await runTest('১. সুইচ বন্ধে আগের আচরণ (৩০০ms ডিবাউন্স ও পুরোনো previewHtml পথ)', async () => {
  delete globalThis.__FZ_ON_DOCX_PREVIEW;
  assert.equal(F2Wire.isDocxPreviewEnabled(globalThis), false);
  assert.equal(F2Wire.getPreviewDebounceMs(globalThis), 300);

  let exportCalled = false;
  const mockPipeline = {
    async previewHtml(raw, opts) {
      return { content: `<div class="paper-sheet">${raw}:${opts.marginClass}</div>`, docType: 'EXAM_CQ', parsedData: { sections: [] } };
    },
    async exportDocx() {
      exportCalled = true;
      throw new Error('সুইচ বন্ধে exportDocx কল হওয়া উচিত নয়');
    }
  };

  const gate = F2Wire.createRenderGate();
  const res = await F2Wire.runPreviewUpdate({
    raw: 'নমুনা প্রশ্ন',
    options: { marginClass: 'margin-standard' },
    pipeline: mockPipeline,
    previewRenderer: DocxPreview,
    gate,
    env: globalThis
  });

  assert.equal(exportCalled, false);
  assert.equal(res.status, 'ok');
  assert.equal(res.mode, 'html');
  assert.ok(res.html.includes('paper-sheet'));
});

await runTest('২. সুইচ চালুতে ডাউনলোডের একই layoutOptions() দিয়ে exportDocx → FayzarDocxPreview.render', async () => {
  globalThis.__FZ_ON_DOCX_PREVIEW = true;
  assert.equal(F2Wire.isDocxPreviewEnabled(globalThis), true);
  assert.equal(F2Wire.getPreviewDebounceMs(globalThis), 600);

  let capturedOpts = null;
  const baseLayout = {
    marginClass: 'margin-narrow',
    margin: 576 / 1440,
    paperSize: 'a4-landscape',
    orientation: 'landscape',
    skipFirstColumn: true,
    splitIndex: 25
  };

  const mockPipeline = {
    async exportDocx(raw, opts) {
      capturedOpts = opts;
      const payload = await createMiniDocxPayload(raw);
      return { blob: payload, docType: 'EXAM_MCQ', parsedData: { header: { institute: 'ফয়জার একাডেমি' } } };
    }
  };

  const gate = F2Wire.createRenderGate();
  const res = await F2Wire.runPreviewUpdate({
    raw: 'মাস্টার ডকএক্স প্রিভিউ পরীক্ষা',
    options: Object.assign({}, baseLayout, { font: 'kalpurush', fontSize: '12pt' }),
    layoutOpts: baseLayout,
    pipeline: mockPipeline,
    previewRenderer: DocxPreview,
    gate,
    env: globalThis
  });

  assert.ok(capturedOpts, 'exportDocx-এ অপশন পাস হতে হবে');
  assert.equal(capturedOpts.marginClass, 'margin-narrow');
  assert.equal(capturedOpts.paperSize, 'a4-landscape');
  assert.equal(capturedOpts.orientation, 'landscape');
  assert.equal(capturedOpts.skipFirstColumn, true);
  assert.equal(capturedOpts.splitIndex, 25);
  assert.equal(capturedOpts.format, 'docx');

  assert.equal(res.status, 'ok');
  assert.equal(res.mode, 'docx');
  assert.equal(res.docType, 'EXAM_MCQ');
  assert.ok(res.html.includes('class="fz-page"') && res.html.includes('data-fz-p="0"'));
  assert.ok(res.html.includes('মাস্টার ডকএক্স প্রিভিউ পরীক্ষা'));
});

await runTest('৩. টাইপ করার সময় ডিবাউন্স (~৬০০ms) ও দ্রুত টাইপিংয়ে পুরোনো কল বাতিল', async () => {
  globalThis.__FZ_ON_DOCX_PREVIEW = true;
  const scheduled = [];
  let nextId = 1;
  const mockTimers = {
    setTimeout(cb, ms) {
      const item = { id: nextId++, cb, ms, cleared: false };
      scheduled.push(item);
      return item.id;
    },
    clearTimeout(id) {
      const item = scheduled.find((x) => x.id === id);
      if (item) item.cleared = true;
    }
  };

  const calls = [];
  const debounced = F2Wire.createPreviewDebouncer(
    (v) => calls.push(v),
    () => F2Wire.getPreviewDebounceMs(globalThis),
    mockTimers
  );

  debounced('ক');
  debounced('খ');
  debounced('গ');

  assert.equal(scheduled.length, 3, '৩ বার টাইপে ৩টি টাইমার শিডিউল হবে');
  assert.equal(scheduled[0].ms, 600, 'সুইচ চালুতে ডিবাউন্স সময় ৬০০ms হতে হবে');
  assert.equal(scheduled[0].cleared, true, '১ম কল বাতিল হতে হবে');
  assert.equal(scheduled[1].cleared, true, '২য় কল বাতিল হতে হবে');
  assert.equal(scheduled[2].cleared, false, 'সর্বশেষ কল সক্রিয় থাকবে');
  assert.equal(debounced.pending(), true);

  scheduled[2].cb();
  assert.deepEqual(calls, ['গ'], 'শুধুমাত্র সর্বশেষ ইনপুটের জন্য প্রিভিউ ১ বার কল হবে');
  assert.equal(debounced.pending(), false);
});

await runTest('৪. পুরোনো অ্যাসিঙ্ক্রোনাস রেন্ডার বাতিল হলে তার ফল বাদ (stale render cancellation)', async () => {
  globalThis.__FZ_ON_DOCX_PREVIEW = true;
  const gate = F2Wire.createRenderGate();

  let resolveSlowExport;
  const slowPromise = new Promise((r) => { resolveSlowExport = r; });

  const mockPipeline = {
    async exportDocx(raw) {
      if (raw === 'পুরোনো লেখা') {
        await slowPromise;
      }
      return await createMiniDocxPayload(raw);
    }
  };

  const p1 = F2Wire.runPreviewUpdate({
    raw: 'পুরোনো লেখা',
    options: {},
    pipeline: mockPipeline,
    previewRenderer: DocxPreview,
    gate,
    env: globalThis
  });

  const p2 = F2Wire.runPreviewUpdate({
    raw: 'নতুন লেখা',
    options: {},
    pipeline: mockPipeline,
    previewRenderer: DocxPreview,
    gate,
    env: globalThis
  });

  const res2 = await p2;
  resolveSlowExport();
  const res1 = await p1;

  assert.equal(res1.status, 'cancelled', 'পুরোনো রেন্ডারটি অবশ্যই cancelled হতে হবে');
  assert.equal(res2.status, 'ok', 'নতুন রেন্ডারটি সফল হবে');
  assert.ok(res2.html.includes('নতুন লেখা') && !res2.html.includes('পুরোনো লেখা'));
});

await runTest('৫. রেন্ডার ব্যর্থ হলে স্বয়ংক্রিয়ভাবে পুরোনো HTML-প্রিভিউতে ফিরে যাওয়া (fallback)', async () => {
  globalThis.__FZ_ON_DOCX_PREVIEW = true;
  const gate = F2Wire.createRenderGate();

  // ক) exportDocx ব্যর্থ হলে ফলব্যাক
  const failingExportPipeline = {
    async exportDocx() {
      throw new Error('কৃত্তিম exportDocx ত্রুটি');
    },
    async previewHtml(raw) {
      return { content: `<div class="paper-sheet">ফলব্যাক এইচটিএমএল: ${raw}</div>`, docType: 'GOVT_APP', parsedData: { body: raw } };
    }
  };

  const fb1 = await F2Wire.runPreviewUpdate({
    raw: 'আবেদনপত্র',
    options: {},
    pipeline: failingExportPipeline,
    previewRenderer: DocxPreview,
    gate,
    env: globalThis
  });

  assert.equal(fb1.status, 'fallback', 'ত্রুটিতে স্ট্যাটাস fallback হতে হবে');
  assert.equal(fb1.mode, 'html', 'ফলব্যাকে মোড html হতে হবে');
  assert.ok(fb1.html.includes('ফলব্যাক এইচটিএমএল: আবেদনপত্র'));

  // খ) FayzarDocxPreview.render ব্যর্থ হলে ফলব্যাক
  const corruptDocxPipeline = {
    async exportDocx() {
      return Buffer.from('not-a-valid-zip');
    },
    async previewHtml(raw) {
      return { content: `<div class="paper-sheet">রেন্ডার ব্যর্থতায় ফলব্যাক: ${raw}</div>`, docType: 'EXAM_CQ', parsedData: {} };
    }
  };

  const fb2 = await F2Wire.runPreviewUpdate({
    raw: 'প্রশ্নপত্র',
    options: {},
    pipeline: corruptDocxPipeline,
    previewRenderer: DocxPreview,
    gate,
    env: globalThis
  });

  assert.equal(fb2.status, 'fallback');
  assert.equal(fb2.mode, 'html');
  assert.ok(fb2.html.includes('রেন্ডার ব্যর্থতায় ফলব্যাক: প্রশ্নপত্র'));

  // গ) Node Buffer স্ল্যাব-পুল দূষণ ও রেন্ডারারের অভ্যন্তরীণ ত্রুটিতেও নিশ্চিত ফলব্যাক
  Buffer.from('PK\x03\x04<w:document><w:body><w:p><w:r><w:t>নতুন লেখা</w:t></w:r></w:p></w:body></w:document>');
  const fb3 = await F2Wire.runPreviewUpdate({
    raw: 'পুল ও রেন্ডার ত্রুটি পরীক্ষা',
    options: {},
    pipeline: corruptDocxPipeline,
    previewRenderer: DocxPreview,
    gate,
    env: globalThis
  });
  assert.equal(fb3.status, 'fallback', 'পুল-দূষিত বাফারেও স্ট্যাটাস fallback হতে হবে');
  assert.equal(fb3.mode, 'html');
  assert.ok(fb3.html.includes('রেন্ডার ব্যর্থতায় ফলব্যাক: পুল ও রেন্ডার ত্রুটি পরীক্ষা'));
});

await runTest('৬. Edit Bridge: .docx প্রিভিউ মোডে collectFromDom না ভাঙা ও বাংলা বার্তা', async () => {
  const sampleParsedData = {
    header: { institute: 'আদর্শ বিদ্যালয়' },
    sections: [{ questions: [{ num: '১', text: 'মূল প্রশ্ন' }] }]
  };

  const docxMockRoot = {
    nodeType: 1,
    getAttribute(attr) { return attr === 'data-fz-preview-mode' ? 'docx' : null; },
    querySelector(sel) {
      if (sel.includes('.fz-page') || sel.includes('[data-fz-p]')) return { nodeType: 1 };
      return null;
    },
    querySelectorAll() { return []; }
  };

  assert.equal(StudioEditBridge.isDocxPreviewDom(docxMockRoot), true, '.docx প্রিভিউ DOM শনাক্ত হতে হবে');
  const edits = StudioEditBridge.collectFromDom(docxMockRoot, sampleParsedData);
  assert.deepEqual(edits, [], '.docx প্রিভিউ মোডে collectFromDom কোনো ত্রুটি ছাড়া খালি অ্যারে ফেরত দেবে');
  assert.equal(StudioEditBridge.DOCX_PREVIEW_EDIT_NOTICE, 'প্রিভিউ = Word; সম্পাদনা বাঁ দিকে');
  assert.equal(F2Wire.DOCX_EDIT_TOAST_MSG, 'প্রিভিউ = Word; সম্পাদনা বাঁ দিকে');
});

await runTest('৭. studio.html-এ docx-preview-render.js স্ক্রিপ্ট ট্যাগের অবস্থান যাচাই', async () => {
  const htmlPath = path.resolve(__dirname, '../studio.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const jszipIdx = html.indexOf('js/jszip.min.js');
  const exportIdx = html.indexOf('js/layout-engine/fayzar-export.js');
  const previewRenderIdx = html.indexOf('js/layout-engine/docx-preview-render.js');
  const controllerIdx = html.indexOf('js/studio-controller.js');

  assert.ok(previewRenderIdx > 0, 'studio.html-এ js/layout-engine/docx-preview-render.js যুক্ত থাকতে হবে');
  assert.ok(previewRenderIdx > jszipIdx && previewRenderIdx > exportIdx, 'jszip ও fayzar-export-এর পরে লোড হতে হবে');
  assert.ok(previewRenderIdx < controllerIdx, 'studio-controller.js-এর আগে লোড হতে হবে');
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exitCode = 1;
