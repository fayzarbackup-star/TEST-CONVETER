/**
 * Fayzar — মাস্টার .docx প্রিভিউ রেন্ডারার পরীক্ষা (A3_F2_DOCXPREVIEW_v5)
 * =========================================================================
 * পরীক্ষাসমূহ:
 *  ১. অনুচ্ছেদ, রান শৈলী (ফন্ট, সাইজ, বোল্ড, ইটালিক, আন্ডারলাইন, রং, সুপার/সাবস্ক্রিপ্ট) ও data-fz-p সূচক
 *  ২. টেবিল (grid, gridSpan → colspan, vMerge → rowspan, বর্ডার, ঘর-মার্জিন, শেডিং)
 *  ৩. পাতার মাপ/আড়াআড়ি (sectPr) ও ১/২ কলাম লেআউট (w:cols)
 *  ৪. ট্যাব-স্টপ ও ডট লিডার (w:tabs, w:tab w:leader="dot")
 *  ৫. OMML সমীকরণ (m:f ভগ্নাংশ, m:sSup ঘাত, m:sSub সাবস্ক্রিপ্ট, m:rad বর্গমূল)
 *  ৬. এমবেডেড ছবি (w:drawing + word/media + rels) ও পাতা-বিরতি (স্পষ্ট ও উচ্চতা মেপে স্বয়ংক্রিয় .fz-page ভাগ)
 *  ৭. প্রজেক্টের DocxBuilder ও ExportDualEngine দিয়ে তৈরি আসল মাস্টার .docx রেন্ডারিং যাচাই
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const JSZip = require('../js/jszip.min.js');
globalThis.JSZip = JSZip;
const DocxBuilder = require('../js/layout-engine/docx-builder.js');
const ExportDualEngine = require('../js/engines/export-dual-engine.js');
const DocxPreview = require('../js/layout-engine/docx-preview-render.js');

/** কৃত্রিম .docx বাফার তৈরির সহায়ক */
async function buildSampleDocx(bodyXml, options = {}) {
  const zip = new JSZip();
  const fontName = options.fontName || 'Kalpurush';

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  const extraRels = options.extraRels || '';
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${extraRels}
</Relationships>`);

  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`);

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
${bodyXml}
  </w:body>
</w:document>`);

  if (options.media) {
    for (const [path, base64Data] of Object.entries(options.media)) {
      zip.file(path, base64Data, { base64: true });
    }
  }

  return await zip.generateAsync({ type: 'nodebuffer' });
}

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  const prev = globalThis.__FZ_ON_DOCX_PREVIEW;
  try {
    await fn();
    passed++;
    console.log(`  [পাস] ${name}`);
  } catch (err) {
    failed++;
    console.error(`  [ব্যর্থ] ${name}: ${err.message}`);
  } finally {
    if (prev === undefined) delete globalThis.__FZ_ON_DOCX_PREVIEW;
    else globalThis.__FZ_ON_DOCX_PREVIEW = prev;
  }
}

await runTest('১. অনুচ্ছেদ, রান শৈলী ও data-fz-p সম্পাদনা সূচক', async () => {
  const bodyXml = `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="120" w:after="60" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="32"/><w:color w:val="1E3A8A"/></w:rPr>
        <w:t>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:ind w:left="360" w:firstLine="360"/>
        <w:spacing w:line="300" w:lineRule="exact"/>
      </w:pPr>
      <w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">সূত্র: H</w:t></w:r>
      <w:r><w:rPr><w:vertAlign w:val="subscript"/></w:rPr><w:t>2</w:t></w:r>
      <w:r><w:t>O এবং E=mc</w:t></w:r>
      <w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:t>2</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>`;

  const buf = await buildSampleDocx(bodyXml);
  const html = await DocxPreview.renderToHtmlString(buf);

  assert.ok(html.includes('class="fz-page"'), '.fz-page পাতা তৈরি হতে হবে');
  assert.ok(html.includes('data-fz-p="0"') && html.includes('data-fz-p="1"'), 'প্রতিটি অনুচ্ছেদে ক্রমিক data-fz-p সূচক থাকতে হবে');
  assert.ok(html.includes('text-align:center'), 'কেন্দ্রিক অনুচ্ছেদ (jc=center) থাকতে হবে');
  assert.ok(html.includes('text-align:justify'), 'উভয়-প্রান্ত অনুচ্ছেদ (jc=both -> justify) থাকতে হবে');
  assert.ok(html.includes('font-weight:bold') && html.includes('text-decoration:underline'), 'বোল্ড ও আন্ডারলাইন রান থাকতে হবে');
  assert.ok(html.includes('font-size:16pt') && html.includes('color:#1E3A8A'), '১৬pt ফন্ট সাইজ ও রং থাকতে হবে');
  assert.ok(html.includes('<sub') && html.includes('<sup'), 'সাবস্ক্রিপ্ট ও সুপারস্ক্রিপ্ট ট্যাগ থাকতে হবে');
});

await runTest('২. টেবিল (grid, gridSpan → colspan, vMerge → rowspan, বর্ডার ও শেডিং)', async () => {
  const bodyXml = `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:color="000000"/>
          <w:left w:val="single" w:sz="8" w:color="000000"/>
          <w:bottom w:val="single" w:sz="8" w:color="000000"/>
          <w:right w:val="single" w:sz="8" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:color="000000"/>
          <w:insideV w:val="single" w:sz="4" w:color="000000"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="60" w:type="dxa"/>
          <w:left w:w="90" w:type="dxa"/>
          <w:bottom w:w="60" w:type="dxa"/>
          <w:right w:w="90" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="3000"/>
        <w:gridCol w:w="3000"/>
        <w:gridCol w:w="3000"/>
      </w:tblGrid>
      <w:tr>
        <w:trPr><w:tblHeader/></w:trPr>
        <w:tc>
          <w:tcPr><w:vMerge w:val="restart"/><w:shd w:val="clear" w:fill="E2E8F0"/></w:tcPr>
          <w:p><w:r><w:t>ক্রমিক</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="2"/><w:shd w:val="clear" w:fill="E2E8F0"/></w:tcPr>
          <w:p><w:r><w:t>বিবরণ ও মন্তব্য</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:vMerge/></w:tcPr>
          <w:p/>
        </w:tc>
        <w:tc><w:p><w:r><w:t>কলাম ২</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>কলাম ৩</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>`;

  const buf = await buildSampleDocx(bodyXml);
  const html = await DocxPreview.renderToHtmlString(buf);

  assert.ok(html.includes('<table class="fz-tbl"'), 'টেবিল ট্যাগ থাকতে হবে');
  assert.ok(html.includes('<colgroup>'), 'tblGrid থেকে colgroup তৈরি হতে হবে');
  assert.ok(html.includes('colspan="2"'), 'gridSpan=2 থেকে colspan="2" হতে হবে');
  assert.ok(html.includes('rowspan="2"'), 'vMerge restart/continue থেকে rowspan="2" হতে হবে');
  assert.ok(html.includes('background-color:#E2E8F0'), 'ঘরের শেডিং রং থাকতে হবে');
  assert.ok(html.includes('padding:4px 6px 4px 6px'), 'tblCellMar (60/90 dxa -> 4px/6px) ঘর-মার্জিন থাকতে হবে');
});

await runTest('৩. পাতার মাপ/আড়াআড়ি (sectPr) ও ২-কলাম লেআউট (w:cols)', async () => {
  const bodyXml = `
    <w:p><w:r><w:t>১ম কলামের প্রশ্ন</w:t></w:r></w:p>
    <w:p><w:r><w:br w:type="column"/><w:t>২য় কলামের প্রশ্ন</w:t></w:r></w:p>
    <w:sectPr>
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
      <w:cols w:num="2" w:space="360" w:sep="1"/>
    </w:sectPr>`;

  const buf = await buildSampleDocx(bodyXml);
  const html = await DocxPreview.renderToHtmlString(buf);

  assert.ok(html.includes('fz-landscape') && html.includes('data-orient="landscape"'), 'আড়াআড়ি (landscape) পাতা শনাক্ত হতে হবে');
  assert.ok(html.includes('width:1123px') && html.includes('min-height:794px'), 'A4 আড়াআড়ি মাপ (pt->px = ৪/৩ অনুযায়ী ১১২৩×৭৯৪ px) হতে হবে');
  assert.ok(html.includes('data-cols="2"') && html.includes('column-count:2'), '২-কলাম লেআউট থাকতে হবে');
  assert.ok(html.includes('column-rule:1px solid #000000'), 'কলাম বিভাজক রেখা (w:sep="1") থাকতে হবে');
  assert.ok(html.includes('class="fz-col-break"'), 'কলাম-বিরতি থাকতে হবে');
});

await runTest('৪. ট্যাব-স্টপ ও ডট লিডার (w:tabs, w:tab w:leader="dot")', async () => {
  const bodyXml = `
    <w:p>
      <w:pPr>
        <w:tabs>
          <w:tab w:val="right" w:pos="9000" w:leader="dot"/>
        </w:tabs>
      </w:pPr>
      <w:r><w:t>১. ভূমিকা</w:t></w:r>
      <w:r><w:tab/></w:r>
      <w:r><w:t>০৫</w:t></w:r>
    </w:p>`;

  const buf = await buildSampleDocx(bodyXml);
  const html = await DocxPreview.renderToHtmlString(buf);

  assert.ok(html.includes('fz-tab-leader-dot'), 'ডট লিডার ক্লাস থাকতে হবে');
  assert.ok(html.includes('data-tab-val="right"') && html.includes('data-tab-pos="9000"'), 'ট্যাব-স্টপের অবস্থান ও মান থাকতে হবে');
  assert.ok(html.includes('1px dotted currentColor'), 'ডট লিডারের বর্ডার স্টাইল থাকতে হবে');
});

await runTest('৫. OMML সমীকরণ (m:f ভগ্নাংশ, m:sSup/sSub ঘাত ও সাবস্ক্রিপ্ট, m:rad বর্গমূল)', async () => {
  const bodyXml = `
    <w:p>
      <w:r><w:t>সমীকরণ: </w:t></w:r>
      <m:oMath>
        <m:f>
          <m:num><m:r><m:t>a+b</m:t></m:r></m:num>
          <m:den><m:r><m:t>c+d</m:t></m:r></m:den>
        </m:f>
        <m:r><m:t>=</m:t></m:r>
        <m:sSup>
          <m:e><m:r><m:t>x</m:t></m:r></m:e>
          <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
        </m:sSup>
        <m:sSub>
          <m:e><m:r><m:t>y</m:t></m:r></m:e>
          <m:sub><m:r><m:t>i</m:t></m:r></m:sub>
        </m:sSub>
        <m:rad>
          <m:deg><m:r><m:t>3</m:t></m:r></m:deg>
          <m:e><m:r><m:t>z</m:t></m:r></m:e>
        </m:rad>
      </m:oMath>
    </w:p>`;

  const buf = await buildSampleDocx(bodyXml);
  const html = await DocxPreview.renderToHtmlString(buf);

  assert.ok(html.includes('class="fz-omath"'), 'OMML কন্টেইনার থাকতে হবে');
  assert.ok(html.includes('class="fz-math-frac"') && html.includes('class="fz-math-num"') && html.includes('class="fz-math-den"'), 'ভগ্নাংশ (m:f) লব ও হর থাকতে হবে');
  assert.ok(html.includes('a+b') && html.includes('c+d'), 'ভগ্নাংশের ভেতরের টেক্সট থাকতে হবে');
  assert.ok(html.includes('class="fz-math-ssup"') && html.includes('class="fz-math-ssub"'), 'ঘাত (m:sSup) ও সাবস্ক্রিপ্ট (m:sSub) থাকতে হবে');
  assert.ok(html.includes('class="fz-math-rad"') && html.includes('&radic;'), 'বর্গমূল (m:rad) চিহ্ন ও রেডিক্যান্ড থাকতে হবে');
});

await runTest('৬. এমবেডেড ছবি (w:drawing) এবং স্বয়ংক্রিয় ও স্পষ্ট পাতা-ভাগ (.fz-page)', async () => {
  // ১×১ পিক্সেল স্বচ্ছ PNG (base64)
  const tinyPngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const manyParas = Array.from({ length: 45 }, (_, i) =>
    `<w:p><w:pPr><w:spacing w:before="120" w:after="120" w:line="360" w:lineRule="auto"/></w:pPr><w:r><w:sz w:val="28"/><w:t>অনুচ্ছেদ ক্রমিক নং ${i + 1} — স্বয়ংক্রিয় উচ্চতা মেপে পাতা ভাগের পরীক্ষা।</w:t></w:r></w:p>`
  ).join('\n');

  const bodyXml = `
    <w:p>
      <w:r>
        <w:drawing>
          <wp:inline>
            <wp:extent cx="952500" cy="476250"/>
            <a:graphic><a:graphicData><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:blipFill><a:blip r:embed="rIdImg1"/></pic:blipFill>
            </pic:pic></a:graphicData></a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
    ${manyParas}`;

  const buf = await buildSampleDocx(bodyXml, {
    extraRels: '<Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>',
    media: { 'word/media/image1.png': tinyPngB64 }
  });

  const container = { innerHTML: '' };
  const res = await DocxPreview.render(buf, container);

  assert.ok(res.pages.length >= 2, `৪৫টি বড় অনুচ্ছেদে স্বয়ংক্রিয়ভাবে অন্তত ২টি পাতা (.fz-page) তৈরি হতে হবে (পাওয়া গেছে: ${res.pages.length})`);
  assert.ok(container.innerHTML.includes('class="fz-drawing"'), 'ড্রয়িং ইমেজ ট্যাগ থাকতে হবে');
  assert.ok(container.innerHTML.includes('data:image/png;base64,'), 'এমবেডেড ছবির base64 data URI থাকতে হবে');
  assert.ok(container.innerHTML.includes('width:100px;height:50px;'), 'EMU (952500x476250) থেকে সঠিক পিক্সেল মাপ (100x50px) হতে হবে');

  // সুইচ স্পষ্টভাবে false করলে null ফেরত দেওয়ার পরীক্ষা
  globalThis.__FZ_ON_DOCX_PREVIEW = false;
  assert.equal(await DocxPreview.render(buf, container), null, 'সুইচ false হলে render() null ফেরত দেবে');
});

await runTest('৭. DocxBuilder ও ExportDualEngine দিয়ে তৈরি মাস্টার .docx রেন্ডারিং', async () => {
  const p1 = DocxBuilder.paragraph(
    DocxBuilder.run('বার্ষিক পরীক্ষা — ২০২৬', { bold: true, underline: 'single', size: '32' }),
    { jc: 'center', spacing: { before: '80', after: '80', line: '240' } }
  );
  const p2 = DocxBuilder.paragraph(
    DocxBuilder.run('বিষয়: গণিত') + DocxBuilder.runTab() + DocxBuilder.run('পূর্ণমান: ১০০', { bold: true }),
    { tabs: [{ val: 'right', pos: '9000' }] }
  );
  const tbl = DocxBuilder.table(
    DocxBuilder.tableRow(
      DocxBuilder.tableCell(DocxBuilder.paragraph(DocxBuilder.run('প্রশ্ন', { bold: true })), { width: '4500', shading: 'F1F5F9' }) +
      DocxBuilder.tableCell(DocxBuilder.paragraph(DocxBuilder.run('মান', { bold: true })), { width: '4500', shading: 'F1F5F9' }),
      { isHeader: true }
    ),
    { width: '9000', jc: 'center' }
  );
  const sect = DocxBuilder.sectionProperties({
    page: { width: '16838', height: '11906', orient: 'landscape', margins: { top: '720', right: '720', bottom: '720', left: '720' } },
    cols: '2'
  });

  const docxBuf = await ExportDualEngine._packageDocx(p1 + p2 + tbl + sect, 'Kalpurush');
  const res = await DocxPreview.render(docxBuf, null);

  assert.equal(res.pages.length, 1);
  assert.ok(res.html.includes('বার্ষিক পরীক্ষা — ২০২৬') && res.html.includes('পূর্ণমান: ১০০'));
  assert.ok(res.html.includes('background-color:#F1F5F9'));
  assert.ok(res.html.includes('data-cols="2"'));
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exitCode = 1;
