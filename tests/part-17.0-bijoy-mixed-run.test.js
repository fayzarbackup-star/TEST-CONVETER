'use strict';

// Part-17.0 gates — বিজয় রূপান্তরে (DocxHandler u2b) মিশ্র বাংলা-ইংরেজি রানের ইংরেজি অংশ হারাত।
// ধাপ ০ (হুবহু-লেআউট আগাম পরীক্ষা, ২০২৬-১০-০৫)-এ ধরা: "০৫/১০/২০২৬" → "05102026", "১০০% (A+B)/2" → "100",
// "ISBN 978-984" উধাও। কারণ: ইংরেজি সেগমেন্টের নতুন রান অনুচ্ছেদে বসানো হতো না।
// চালানো: node tests/part-17.0-bijoy-mixed-run.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const { DOMParser, XMLSerializer } = require(path.join(ROOT, 'node_modules/@xmldom/xmldom'));
globalThis.DOMParser = DOMParser;
globalThis.XMLSerializer = XMLSerializer;
const BC = require(path.join(ROOT, 'js/bangla-converter-engine.js'));
globalThis.BanglaConverter = BC.BanglaConverter || BC;
const DH = require(path.join(ROOT, 'js/docx-handler.js'));
const Handler = DH.DocxHandler || DH;

let gates = 0;
const check = (cond, msg) => { assert.ok(cond, msg); gates++; };

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function runOn(text, font) {
  const xml = `<w:document xmlns:w="${W}"><w:body><w:p><w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p></w:body></w:document>`;
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const p = doc.getElementsByTagName('w:p')[0];
  const inst = typeof Handler === 'function' ? new Handler() : Handler;
  inst._step2_convertTextToBijoy(p, doc, { direction: 'u2b' }, true, 'SutonnyMJ', { convertedRuns: 0 }, { originalSample: [], convertedSample: [] });
  const ts = Array.from(doc.getElementsByTagName('w:t')).map((t) => t.textContent).join('');
  return ts;
}

for (const font of ['Kalpurush', 'SutonnyOMJ']) {
  const out1 = runOn('তারিখ: ০৫/১০/২০২৬ এবং মোট ১০০% (A+B)/2', font);
  check(out1.includes('05/10/2026'), font + ': date slashes kept → ' + out1);
  check(out1.includes('100% (A+B)/2'), font + ': % and English expression kept → ' + out1);
  const out2 = runOn('P01XCENTER গণপ্রজাতন্ত্রী', font);
  check(out2.startsWith('P01XCENTER '), font + ': leading English kept → ' + out2);
  const out3 = runOn('ISBN 978-984 লেখো', font);
  check(out3.includes('ISBN 978-984'), font + ': English with hyphen kept → ' + out3);
  check(/†j‡Lv/.test(out3), font + ': Bangla part still converted to Bijoy → ' + out3);
  const order = runOn('ক A খ B', font);
  check(order.indexOf('A') < order.indexOf('B') && order.indexOf('A') > 0, font + ': segment order preserved → ' + order);
}

console.log(`Part-17.0 bijoy mixed-run: ${gates} passed`);
