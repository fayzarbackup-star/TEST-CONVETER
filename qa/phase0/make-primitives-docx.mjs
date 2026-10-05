// ধাপ ০(খ): "হুবহু" মোডের সব মৌলিক উপাদানসহ একটি নমুনা .docx (Word-এ খোলা = সত্যের মানদণ্ড)।
// চালানো: node qa/phase0/make-primitives-docx.mjs <out.docx>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const JSZip = require('../../node_modules/jszip');
const OUT = process.argv[2] || 'qa/phase0/primitives.docx';

const F = 'SutonnyOMJ';
const rpr = (o = {}) => `<w:rPr><w:rFonts w:ascii="${F}" w:hAnsi="${F}" w:cs="${F}"/>${o.b ? '<w:b/>' : ''}${o.i ? '<w:i/>' : ''}${o.u ? '<w:u w:val="single"/>' : ''}<w:sz w:val="${o.sz || 24}"/><w:szCs w:val="${o.sz || 24}"/></w:rPr>`;
// চিহ্ন (P01X…) আলাদা রানে — প্রোডাকশন-নির্মাতাও বাংলা/ইংরেজি আলাদা রানে ভাগ করে (মিশ্র রানে বিজয়ে ইংরেজি হারায় — ধাপ ০-এ ধরা পড়া বাগ)
const r1 = (t, o) => `<w:r>${rpr(o)}<w:t xml:space="preserve">${t}</w:t></w:r>`;
const r = (t, o) => { const m = /^([A-Z0-9]+X[A-Z0-9]+ )([\s\S]*)$/.exec(t); return m ? r1(m[1], o) + (m[2] ? r1(m[2], o) : '') : r1(t, o); };
const tab = () => `<w:r><w:tab/></w:r>`;
const p = (runs, ppr = '') => `<w:p><w:pPr>${ppr}</w:pPr>${runs}</w:p>`;
const jc = (v) => `<w:jc w:val="${v}"/>`;
const sectBreak = (cols, extra = '') => `<w:p><w:pPr><w:sectPr><w:type w:val="continuous"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="567" w:footer="567" w:gutter="0"/><w:cols w:num="${cols}" w:space="567"${extra}/></w:sectPr></w:pPr></w:p>`;
const bdr = (on) => on ? `<w:tcBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/></w:tcBorders>` : `<w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders>`;
const tc = (w, content, o = {}) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.span ? `<w:gridSpan w:val="${o.span}"/>` : ''}${o.vm ? `<w:vMerge${o.vm === 'restart' ? ' w:val="restart"' : ''}/>` : ''}${bdr(o.border !== false)}${o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : ''}</w:tcPr>${content}</w:tc>`;
const tbl = (widths, rows, o = {}) => `<w:tbl><w:tblPr><w:tblW w:w="${o.w || widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/>${o.jc ? `<w:jc w:val="${o.jc}"/>` : ''}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.map((row) => `<w:tr>${row}</w:tr>`).join('')}</w:tbl>`;

// 1x1 PNG স্থানধারক ছবি (লাল বর্গ) — ছোট বাস্তব PNG
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
const inlineImg = (rid, cx, cy, id) => `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="img${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="img${id}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
const anchorImg = (rid, cx, cy, id, xEmu, yEmu) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="2" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${xEmu}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${yEmu}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="${id}" name="anc${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="anc${id}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;

const body = [
  // ১ কলাম অংশ: শিরোনাম, অবস্থান, ইনডেন্ট, ট্যাব, অনুচ্ছেদ-রেখা
  p(r('P01XCENTER গণপ্রজাতন্ত্রী বাংলাদেশ সরকার', { b: true, sz: 32 }), jc('center')),
  p(r('P02XRIGHT তারিখ: ০৫/১০/২০২৬', { sz: 22 }), jc('right')),
  p(r('P03XBORDER নিচে রেখাসহ শিরোনাম', { b: true, u: true }), '<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="000000"/></w:pBdr>' + jc('center')),
  p(r('P04XINDENT বাম ইনডেন্ট ১ ইঞ্চি, প্রথম লাইন ঝুলন্ত — এই অনুচ্ছেদটি যথেষ্ট লম্বা যাতে একাধিক লাইনে যায় এবং ইনডেন্টের ফল স্পষ্ট দেখা যায়।'), '<w:ind w:left="1440" w:hanging="360"/><w:spacing w:before="120" w:after="120" w:line="300" w:lineRule="auto"/>'),
  p(r('P05XTABS নাম') + tab() + r('মাঝে') + tab() + r('ডানে') + tab() + r('১২.৫০'), '<w:tabs><w:tab w:val="center" w:pos="4800"/><w:tab w:val="right" w:pos="9600"/><w:tab w:val="decimal" w:pos="9000"/></w:tabs>'),
  p(r('P06XDOTLEADER বিষয়') + tab() + r('পৃষ্ঠা ৫'), '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9600"/></w:tabs>'),
  p(r('P07XINLINEIMG ছবি: ') + inlineImg('rIdImg1', 914400, 457200, 10)),
  // T1: বর্ডারসহ, ঘর জোড়া (gridSpan + vMerge), ছায়া, ১০০% নয় (৬ ইঞ্চি)
  tbl([2880, 2880, 2880], [
    tc(5760, p(r('T1XSPAN2 দুই কলাম জোড়া', { b: true }), jc('center')), { span: 2, shade: 'D9D9D9' }) + tc(2880, p(r('T1XC13'))),
    tc(2880, p(r('T1XVMERGE লম্বা জোড়া')), { vm: 'restart' }) + tc(2880, p(r('T1XC22'))) + tc(2880, p(r('T1XC23'))),
    tc(2880, p(''), { vm: 'cont' }) + tc(2880, p(r('T1XC32'))) + tc(2880, p(r('T1XC33')))
  ], { jc: 'center' }),
  p(r('P08XAFTER-T1')),
  // T2: বর্ডারহীন লেআউট-টেবিল (লোগো | নাম | তারিখ) — ভেতরে নেস্টেড টেবিল
  tbl([2000, 5600, 2000], [
    tc(2000, p(inlineImg('rIdImg1', 640080, 640080, 11)), { border: false }) +
    tc(5600, p(r('T2XMID প্রতিষ্ঠানের নাম', { b: true, sz: 28 }), jc('center')) + tbl([2800, 2800], [
      tc(2800, p(r('T3XNESTED-A'))) + tc(2800, p(r('T3XNESTED-B')))
    ]) + p(''), { border: false }) +
    tc(2000, p(r('T2XRIGHT স্মারক নং'), jc('right')), { border: false })
  ]),
  p(r('P09XANCHOR ভাসমান ছবি এই অনুচ্ছেদে নোঙর করা') + anchorImg('rIdImg1', 731520, 731520, 12, 5486400, 7315200)),
  sectBreak(1),
  // ২ কলাম অংশ
  p(r('P10XCOL2 দ্বিতীয় অংশটি দুই কলামে। '.repeat(12))),
  p(r('P11XCOL2 আরও লেখা যাতে দ্বিতীয় কলামে গড়িয়ে যায়। '.repeat(14))),
  sectBreak(2, ' w:sep="1"'),
  p(r('P12XBACK1 আবার এক কলাম।'))
].join('');

const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="rIdHdr"/><w:footerReference w:type="default" r:id="rIdFtr"/><w:pgSz w:w="12240" w:h="20160"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="567" w:footer="567" w:gutter="0"/><w:cols w:space="567"/></w:sectPr></w:body></w:document>`;
const hdr = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${p(r('H01XHEADER হেডারের লেখা'), jc('center'))}</w:hdr>`;
const ftr = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${p(r('F01XFOOTER ফুটারের লেখা'), jc('right'))}</w:ftr>`;

const zip = new JSZip();
zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/><Relationship Id="rIdHdr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFtr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`);
zip.file('word/document.xml', doc);
zip.file('word/header1.xml', hdr);
zip.file('word/footer1.xml', ftr);
zip.file('word/media/image1.png', png);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, await zip.generateAsync({ type: 'nodebuffer' }));
console.log('wrote', OUT);
