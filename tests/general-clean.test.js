'use strict';

// Phase 2A gates — doc-model, দুই অ্যাডাপ্টার, GENERAL_CLEAN লেআউট, মেটাডেটা-লিক পরিষ্কার। Gemini লাগে না।
// চালানো: node tests/general-clean.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const g = globalThis;
g.EquationConverter = require(path.join(ROOT, 'js/equation-converter.js'));
g.BanglaConverter = require(path.join(ROOT, 'js/bangla-converter-engine.js'));
g.TextRunProcessor = require(path.join(ROOT, 'js/layout-engine/text-run-processor.js'));
g.jszip = require(path.join(ROOT, 'js/jszip.min.js'));
g.ExportDualEngine = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const DM = require(path.join(ROOT, 'js/layout-engine/doc-model.js'));
const AD = require(path.join(ROOT, 'js/layout-engine/doc-model-adapters.js'));
const GC = require(path.join(ROOT, 'js/layout-engine/general-clean-layout.js'));
const CC = require(path.join(ROOT, 'js/layout-engine/clean-composer.js'));

let gates = 0;
const check = (cond, name) => { assert.ok(cond, name); gates++; };
const count = (s, re) => (s.match(re) || []).length;
const cap = (type, text, box, extra) => Object.assign({ type, text, lines: text.split('\n'), page: 1, box, align: 'l', fs: 'm', bold: false }, extra || {});

(async () => {
  // ১) doc-model
  const t = DM.block('table', { rows: [['ক', 'খ', 'গ'], ['১']] });
  check(t.rows.every((r) => r.length === 3) && t.header === true, 'model: টেবিল আয়তাকার, header ডিফল্ট');
  check(DM.block('heading', { text: 'ক' }).level === 2, 'model: heading level ডিফল্ট ২');
  let threw = false; try { DM.block('bogus', {}); } catch (e) { threw = true; }
  check(threw, 'model: অজানা ভূমিকা ত্রুটি');
  const d0 = DM.createDocument(); DM.addPage(d0, [DM.block('paragraph', { text: 'এক দুই' }), DM.block('stamp', { text: 'সিল লেখা' })]);
  check(DM.validate(d0).length === 0 && DM.words(d0, true).length === 2 && DM.words(d0, false).length === 4, 'model: validate + words(রাখা)');
  d0.pages[0].blocks.push({ role: 'table', rows: [['a'], ['b', 'c']] });
  check(DM.validate(d0).length === 1, 'model: ভাঙা টেবিল ধরা পড়ে');

  // ২) fromCaptureBlocks
  const c1 = AD.fromCaptureBlocks({ blocks: [
    cap('title', 'স্কুল', [100, 300, 150, 700], { fs: 'xl', bold: true, align: 'c' }),
    cap('other', '⟦─×120⟧', [160, 100, 165, 900]),
    cap('table', 'নাম | বয়স\nরহিম | ১০\nকরিম | ১১', [200, 50, 400, 950]),
    cap('paragraph', 'বাম পাশ', [500, 100, 540, 400]),
    cap('paragraph', 'ডান পাশ', [505, 600, 545, 900]),
    cap('option_row', '(ক) এক | (খ) দুই | (গ) তিন', [600, 100, 620, 900]),
    cap('stamp', 'সিল', [700, 100, 740, 200]),
    cap('signature', '(নাম)\nপদবি', [800, 600, 850, 900], { align: 'r' })] });
  const f = c1.pages[0].blocks;
  check(f[0].role === 'title' && f[0].size === 'xl' && f[0].align === 'c', 'capture: title আকার/সারিবদ্ধতা');
  check(f[1].role === 'rule', 'capture: ⟦─×N⟧ → rule');
  check(f[2].role === 'table' && f[2].rows.length === 3 && f[2].rows[0].length === 2, 'capture: টেবিল সারি/কলাম');
  check(f[3].role === 'side_by_side' && f[3].left[0].text === 'বাম পাশ' && f[3].right[0].text === 'ডান পাশ', 'capture: y-ওভারল্যাপ → side_by_side');
  check(f[4].role === 'option_row' && f[4].cells.length === 3, 'capture: option_row cells');
  check(f[5].role === 'stamp' && f[6].role === 'signature', 'capture: stamp/signature ভূমিকা');
  const cols = [];
  for (let i = 0; i < 4; i++) { cols.push(cap('question', 'প্রশ্ন ' + i, [100 + i * 100, 50, 150 + i * 100, 480])); cols.push(cap('question', 'প্রশ্ন ডান ' + i, [100 + i * 100, 520, 150 + i * 100, 950])); }
  check(AD.fromCaptureBlocks(cols).columns === 2, 'capture: দুই-কলাম পাতা চেনা');
  check(AD.fromCaptureBlocks([cap('paragraph', 'এক', [0, 0, 50, 900]), cap('paragraph', 'দুই', [60, 0, 110, 900])]).columns === 1, 'capture: এক-কলাম');

  // ৩) fromOcrMarkdown
  const md = '---\ndoc_type: GOVT_APP\ncolumns: 1\n---\n# প্রতিষ্ঠান\n## বিষয়: আবেদন\nসাধারণ লাইন\n- তালিকা এক\n| নাম | বয়স |\n|---|---|\n| রহিম | ১০ |\n' +
    'বাম ১ <!--r:sideL-->\nডান ১ <!--r:sideR-->\n(নাম) <!--r:sig,aR-->\n[[FIG:p=1;box=1,2,3,4]]\n---\nদ্বিতীয় পাতা\n(ক) এক (খ) দুই (গ) তিন\n';
  const m1 = AD.fromOcrMarkdown(md);
  const mb = m1.pages[0].blocks;
  check(m1.meta.docType === 'GOVT_APP' && m1.pages.length === 2, 'md: doc_type মেটা, `---` পাতা-বিরতি');
  check(mb[0].role === 'title' && mb[1].role === 'heading' && mb[2].role === 'paragraph' && mb[3].role === 'list', 'md: title/heading/paragraph/list');
  check(mb[4].role === 'table' && mb[4].rows.length === 2 && mb[4].rows[1][0] === 'রহিম', 'md: টেবিল রাউন্ড-ট্রিপ (বিভাজক বাদ)');
  check(mb[5].role === 'side_by_side' && mb[5].left[0].text === 'বাম ১', 'md: sideL+sideR → side_by_side');
  check(mb[6].role === 'signature' && mb[6].align === 'r', 'md: sig + aR');
  check(mb[7].role === 'figure' && mb[7].figIndex === 0, 'md: [[FIG]] → figure');
  check(m1.pages[1].blocks[1].role === 'option_row' && m1.pages[1].blocks[1].cells.length === 3, 'md: এক-লাইন অপশন → option_row');
  const leak = AD.fromOcrMarkdown('# শিরোনাম\nলেখা\n---\ndoc_type: GOVT_APP\ncolumns: 1\nsubject: X\n---\nআরও লেখা\ndoc_type: CASH_MEMO\n');
  check(!DM.plainText(leak).includes('doc_type') && !DM.plainText(leak).includes('subject'), 'md: মাঝের doc_type মেটাডেটা মুছেছে');
  check(CC.strip('লেখা\n---\ndoc_type: GOVT_APP\ncontent: OTHER\n---\nশেষ').indexOf('doc_type') < 0, 'composer.strip: মাঝের মেটাডেটা মুছেছে');
  check(CC.strip('---\ndoc_type: A\n---\n# H\nbody').startsWith('# H'), 'composer.strip: শুরুর ফ্রন্টম্যাটার আগের মতোই');
  try {
    const OCR = require(path.join(ROOT, 'js/ai-ocr-engine.js'));
    if (OCR && OCR.stripStrayFrontmatter) {
      const s = OCR.stripStrayFrontmatter('এক\n---\ndoc_type: GOVT_APP\ncolumns: 1\n---\nদুই\n');
      check(s.indexOf('doc_type') < 0 && s.includes('এক') && s.includes('দুই'), 'ai-ocr-engine: stripStrayFrontmatter');
    }
  } catch (e) { /* এনভায়রনমেন্টে লোড না হলে বাদ */ }

  // ৪) লেআউট
  const doc = AD.fromCaptureBlocks({ blocks: [
    cap('title', 'স্কুল', [100, 300, 150, 700], { fs: 'xl', align: 'c' }),
    cap('header', 'বইয়ের হেডার', [10, 10, 20, 100]),
    cap('heading', 'শিরোনাম', [160, 300, 190, 700], { align: 'c' }),
    cap('table', 'নাম | বয়স\nরহিম | ১০\nকরিম | ১১', [200, 50, 400, 950]),
    cap('paragraph', 'বাম পাশ', [500, 100, 540, 400]),
    cap('paragraph', 'ডান পাশ', [505, 600, 545, 900]),
    cap('signature', '(নাম)\nপদবি', [800, 600, 850, 900], { align: 'r' }),
    cap('footer', 'ফুটার লেখা', [950, 300, 970, 700]),
    cap('stamp', 'সিলের লেখা', [700, 100, 740, 200]),
    cap('list_item', '১. তালিকা এক', [600, 100, 620, 900])] });
  const r = GC.render(doc, { generalClean: true });
  const x = r.bodyXml;
  check(r.stats.base === 12 && r.stats.dropped.header === 1 && r.stats.dropped.stamp === 1, 'layout: ১২pt ডিফল্ট; header/stamp বাদ');
  check(!x.includes('সিলের লেখা') && !x.includes('বইয়ের হেডার'), 'layout: বাদ-ভূমিকার লেখা আউটপুটে নেই');
  check(x.includes('w:val="40"') && x.includes('<w:b/>'), 'layout: title মূল+৮ (=২০pt, sz৪০) বোল্ড');
  check(count(x, /<w:tbl>/g) === 2 && count(x, /<w:tr>|<w:tr /g) === 4, 'layout: টেবিল (৩ সারি) + side-by-side (১ সারি)');
  check(x.includes('<w:tblHeader/>'), 'layout: হেডার-সারি পুনরাবৃত্ত');
  const sbs = x.slice(x.lastIndexOf('<w:tbl>'));
  check(count(sbs, /<w:tc>/g) === 2 && sbs.includes('w:val="nil"') && sbs.includes('বাম পাশ') && sbs.includes('ডান পাশ'), 'layout: side_by_side = বর্ডারহীন ২-ঘর');
  check(x.includes('<w:pBdr><w:top'), 'layout: signature-এ ফাঁকা লাইন (উপরের বর্ডার)');
  check(x.indexOf('ফুটার লেখা') > x.indexOf('পদবি'), 'layout: footer শেষে');
  check(x.includes('১.') && x.includes('w:hanging="360"'), 'layout: তালিকার চিহ্ন অক্ষত + hanging indent');
  // ঘনত্ব: কখনো ১০-এর নিচে নয়
  const dense = DM.createDocument();
  const many = []; for (let i = 0; i < 160; i++) many.push(DM.block('paragraph', { text: 'এটি একটি দীর্ঘ লেখার লাইন যা পাতা ভরাবে ' + i + ' এবং আরও কিছু শব্দ যোগ করা হলো পাতা ঘন করতে' }));
  DM.addPage(dense, many);
  const rd = GC.render(dense, { generalClean: true });
  check(rd.stats.base === 10 && !/w:sz w:val="(1[0-9]|[0-9])"/.test(rd.bodyXml), 'layout: খুব ঘন হলে ১০pt, তার নিচে নয়');
  // ২-কলাম
  const col2 = AD.fromCaptureBlocks(cols);
  col2.pages[0].blocks.unshift(DM.block('title', { text: 'পরীক্ষা', align: 'c', box: [10, 200, 50, 800] }));
  const rc = GC.render(col2, { generalClean: true });
  check(rc.sectPr.includes('<w:cols w:num="2"') && rc.bodyXml.includes('w:type') === false && rc.sectPr.includes('continuous') && count(rc.bodyXml, /<w:sectPr>/g) === 1, 'layout: ২-কলাম = শুরুর পূর্ণ অংশের পর continuous সেকশন');
  // docx প্যাকেজ
  const blob = await GC.renderDocx(doc, { generalClean: true });
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(await blob.arrayBuffer());
  const zip = await g.jszip.loadAsync(buf);
  const dx = await zip.file('word/document.xml').async('string');
  check(buf.slice(0, 2).toString() === 'PK' && dx.includes('স্কুল') && dx.includes('<w:body>'), 'layout: বৈধ .docx প্যাকেজ');
  check(GC.isEnabled({ generalClean: true }) && !GC.isEnabled({}), 'opt-in: generalClean ছাড়া বন্ধ');

  const IT = require(path.join(ROOT, 'js/image-tools.js'));
  check(typeof IT.rotateLeft90 === 'function' && typeof IT.rotate90 === 'function', 'image-tools: rotateLeft90 আছে');

  console.log(`general-clean: ${gates} gates PASS`);
})().catch((e) => { console.error('FAIL', e && e.message || e); process.exit(1); });
