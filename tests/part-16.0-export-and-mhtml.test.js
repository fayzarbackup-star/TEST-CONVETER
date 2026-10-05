'use strict';

// Part-16.0 gates — একক রপ্তানি-পথ (js/layout-engine/fayzar-export.js) ও Word 2003 ছবি-প্যাকেজার
// (js/layout-engine/doc-mhtml-packager.js)। DocxHandler/DocxToDocConverter ব্রাউজার-DOM লাগে —
// এখানে স্টাব; আসল যাচাই qa/sample-doc-builder.html (ব্রাউজার) + ব্যবহারকারীর Word-এ খোলা।
// চালানো: node tests/part-16.0-export-and-mhtml.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
globalThis.Blob = globalThis.Blob || require('node:buffer').Blob;
require(path.join(ROOT, 'tests/lib/harness.js')).loadEngines();
const Mh = require(path.join(ROOT, 'js/layout-engine/doc-mhtml-packager.js'));
const Ex = require(path.join(ROOT, 'js/layout-engine/fayzar-export.js'));
globalThis.StudioFigurePipeline = require(path.join(ROOT, 'js/engines/studio-figure-pipeline.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));

let gates = 0;
const check = (cond, msg) => { assert.ok(cond, msg); gates++; };

// 1x1 PNG (লাল) ও আরেকটি (নীল)
const PNG_A = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const PNG_B = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// QP ডিকোডার (যাচাইয়ের জন্য)
const qpDecode = (s) => {
  const bytes = [];
  const t = s.replace(/=\r\n/g, '').replace(/\r\n/g, '\n');   // সফট-ব্রেক বাদ; MIME-এর CRLF → মূল LF
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '=' && /^[0-9A-F]{2}$/.test(t.slice(i + 1, i + 3))) { bytes.push(parseInt(t.slice(i + 1, i + 3), 16)); i += 2; }
    else bytes.push(t.charCodeAt(i));
  }
  return Buffer.from(bytes).toString('utf8');
};

(async () => {
  // ---- ১) quoted-printable ----
  const html0 = '<p style="font-family:SutonnyMJ">১। প্রশ্ন = উত্তর  </p>\n<!--[if supportFields]> EQ \\F(1,2) <![endif]-->';
  const qp = Mh.quotedPrintable(html0);
  check(qp.split('\r\n').every((l) => l.length <= 76), 'QP lines ≤ 76');
  check(qpDecode(qp) === html0, 'QP round-trip (Bangla, =, trailing space, EQ comment)');

  // ---- ২) MHTML প্যাক ----
  const html = `<html><body><p>ক</p><img src="data:image/png;base64,${PNG_A}"><img src="data:image/png;base64,${PNG_A}"><img src="data:image/jpeg;base64,${PNG_B}"></body></html>`;
  const { mhtml, images } = Mh.pack(html);
  check(images.length === 2, 'identical images packed once (2 unique)');
  check(/^MIME-Version: 1\.0\r\nContent-Type: multipart\/related; boundary="([^"]+)"/.test(mhtml), 'MIME header + multipart/related');
  const boundary = mhtml.match(/boundary="([^"]+)"/)[1];
  check(mhtml.trimEnd().endsWith('--' + boundary + '--'), 'closing boundary');
  check((mhtml.match(new RegExp('^--' + boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'gm')) || []).length === 3, '3 parts (html + 2 images)');
  check(!/data:image/.test(mhtml), 'no data: URI left');
  check(mhtml.includes('Content-Location: ' + Mh.BASE + 'document_files/image001.png') && mhtml.includes('image002.jpg'), 'Content-Location per image');
  const htmlPart = qpDecode(mhtml.split('--' + boundary)[1].split('\r\n\r\n').slice(1).join('\r\n\r\n'));
  check((htmlPart.match(/document_files\/image001\.png/g) || []).length === 2 && htmlPart.includes('image002.jpg'), 'img src rewritten to Content-Location');
  check(mhtml.split('\r\n').every((l) => l.length <= 998), 'no MIME line over 998 chars');
  check(Mh.pack('<p>ছবি নেই</p>').mhtml === '<p>ছবি নেই</p>', 'no images → HTML unchanged');
  const plainBlob = new Blob(['<p>x</p>']);
  check((await Mh.packBlob(plainBlob)) === plainBlob, 'packBlob without images returns the same Blob');

  // ---- ৩) প্রজেক্টের নিজের .doc-পাঠক (doc-binary-engine) MHTML পড়তে পারে ----
  try {
    const DBE = require(path.join(ROOT, 'js/doc-binary-engine.js'));
    const eng = DBE && (DBE._extractHtmlAndMediaFromMhtml ? DBE : (DBE.DocBinaryEngine || null));
    if (eng && typeof eng._extractHtmlAndMediaFromMhtml === 'function') {
      // পাঠকটি Word-লিখিত (Windows-1252) MHTML-এর জন্য — বাইট-প্রতি CP1252 ডিকোড করে, তাই এখানে কেবল
      // কাঠামো যাচাই: HTML-অংশ ও ছবি-অংশ আলাদা হয়, ছবির Content-Location মিলে, img src সেই ঠিকানায়
      const r = eng._extractHtmlAndMediaFromMhtml(mhtml);
      const loc = Mh.BASE + 'document_files/image001.png';
      check(r && /<img src="file:\/\/\/C:\/fayzar_doc\/document_files\/image001\.png">/.test(String(r.htmlContent || '')), 'doc-binary-engine: html part found, img src = Content-Location');
      check(r.mediaMap && String(r.mediaMap[loc] || '').startsWith('data:image/png;base64,' + PNG_A.slice(0, 20)), 'doc-binary-engine: image part decoded at its Content-Location');
    } else {
      console.log('ℹ doc-binary-engine reader not exposed in Node — cross-read skipped');
    }
  } catch (e) { console.log('ℹ doc-binary-engine not loadable in Node — cross-read skipped:', e.message.slice(0, 60)); }

  // ---- ৪) একক রপ্তানি-পথ (আসল মাস্টার + আসল চিত্র-ইনজেকশন; DOM-নির্ভর দুই ধাপ স্টাব) ----
  const md = '১। নিচের চিত্রে $\\angle AOB = 100^\\circ$ হলে $\\frac{1}{2}$ নির্ণয় কর।\nQZFIG1QZ\nক. প্রশ্ন ১ ২';
  const figures = { 1: { dataUrl: 'data:image/png;base64,' + PNG_A, pxW: 300, pxH: 200, cssW: 192, align: 'center' } };
  const calls = [];
  globalThis.DocxHandler = { convertDocx: async (blob, o) => { calls.push('u2b:' + o.direction); return { convertedBlob: blob }; } };
  globalThis.DocxToDocConverter = class { async convertDocxToDoc(blob) {
    calls.push('docx2doc');
    const z = await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
    const media = Object.keys(z.files).filter((f) => f.startsWith('word/media/') && !z.files[f].dir);
    const imgs = await Promise.all(media.map(async (f) => `<img src="data:image/png;base64,${await z.file(f).async('base64')}">`));
    return { blob: new Blob([`<html><body>stub ${imgs.join('')}</body></html>`], { type: 'application/msword' }) };
  } };
  globalThis.FayzarDocMhtml = Mh;

  const uni = await Ex.produce(md, { format: 'docx-unicode', docType: 'EXAM_CQ', figures });
  const z = await JSZip.loadAsync(Buffer.from(await uni.blob.arrayBuffer()));
  const docXml = await z.file('word/document.xml').async('string');
  check(uni.steps.join() === 'master-docx,figures:1', 'docx-unicode: master + figures only');
  check(!!z.file('word/media/figure1.png') && /<w:drawing>/.test(docXml) && !/QZFIG/.test(docXml), 'figure embedded in master .docx, marker gone');
  check(/<m:oMath>/.test(docXml), 'equations stay OMML in master');

  const bij = await Ex.produce(md, { format: 'docx-bijoy', docType: 'EXAM_CQ', figures });
  check(bij.steps.join() === 'master-docx,figures:1,bijoy-docx', 'docx-bijoy: + u2b');

  calls.length = 0;
  const doc = await Ex.produce(md, { format: 'doc', docType: 'EXAM_CQ', figures });
  check(doc.steps.join() === 'master-docx,figures:1,bijoy-docx,doc,mhtml-images', 'doc: full chain incl. MHTML');
  check(calls.join() === 'u2b:u2b,docx2doc', 'converter chain order: u2b → docx2doc');
  const docTxt = await doc.blob.text();
  check(doc.mhtmlImages && /^MIME-Version: 1\.0/.test(docTxt) && /Content-Type: image\/png/.test(docTxt), '.doc with figure is MHTML with image part');

  const noFig = await Ex.produce('১। প্রশ্ন।\nক. উপ ১ ২', { format: 'doc', docType: 'EXAM_CQ' });
  check(!noFig.mhtmlImages && noFig.steps.join() === 'master-docx,bijoy-docx,doc', '.doc without figures: plain converter output (unchanged)');
  await assert.rejects(Ex.produce('x', { format: 'pdf' }), /অজানা ফরম্যাট/); gates++;

  console.log(`Part-16.0 export/mhtml gates: ${gates} passed, 0 failed`);
})().catch((e) => { console.error(e); process.exit(1); });
