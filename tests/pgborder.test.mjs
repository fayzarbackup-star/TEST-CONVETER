/**
 * D_B8_BORDER_v8 — .doc-এ পাতার বর্ডারের দূরত্ব (WORK_PLAN B8, FAITHFUL #৩৪) ইউনিট টেস্ট
 * Node পরিবেশে বাইরের কোনো লাইব্রেরি ছাড়াই চলে।
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Node পরিবেশের জন্য হালকা XML DOMParser ও JSZip মক (কোনো বাহ্যিক নির্ভরতা ছাড়া)
class MiniElement {
  constructor(tagName, attrs = {}, children = [], text = '') {
    this.nodeType = 1;
    this.nodeName = tagName;
    this.localName = tagName.split(':').pop();
    this._attrs = attrs;
    this.childNodes = children;
    this._text = text;
  }
  get textContent() {
    return this._text + this.childNodes.map((c) => (c.nodeType === 3 ? c.textContent : c.textContent || '')).join('');
  }
  getAttribute(name) {
    if (Object.prototype.hasOwnProperty.call(this._attrs, name)) return this._attrs[name];
    const bare = name.split(':').pop();
    for (const k of Object.keys(this._attrs)) {
      if (k === bare || k.split(':').pop() === bare) return this._attrs[k];
    }
    return null;
  }
  querySelectorAll(selector) {
    const targets = selector.split(',').map((s) => s.trim().split('|').pop().split(':').pop());
    const out = [];
    const walk = (node) => {
      for (const ch of node.childNodes || []) {
        if (ch.nodeType === 1) {
          if (targets.includes(ch.localName) || targets.includes(ch.nodeName)) out.push(ch);
          walk(ch);
        }
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}

function parseXml(xmlStr) {
  const src = String(xmlStr || '').replace(/<\?xml[^>]*\?>/g, '').trim();
  let pos = 0;
  function parseAttrs(attrStr) {
    const attrs = {};
    const re = /([A-Za-z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let m;
    while ((m = re.exec(attrStr)) !== null) {
      attrs[m[1]] = m[2] !== undefined ? m[2] : m[3];
    }
    return attrs;
  }
  function parseNodes() {
    const nodes = [];
    while (pos < src.length) {
      const lt = src.indexOf('<', pos);
      if (lt === -1) {
        const txt = src.slice(pos);
        if (txt) nodes.push({ nodeType: 3, textContent: txt });
        break;
      }
      if (lt > pos) {
        const txt = src.slice(pos, lt);
        if (txt.trim()) nodes.push({ nodeType: 3, textContent: txt });
      }
      if (src.startsWith('</', lt)) {
        pos = lt;
        break;
      }
      const gt = src.indexOf('>', lt);
      if (gt === -1) break;
      const rawTag = src.slice(lt + 1, gt);
      const selfClose = rawTag.endsWith('/');
      const cleanTag = selfClose ? rawTag.slice(0, -1).trim() : rawTag.trim();
      const spIdx = cleanTag.search(/\s/);
      const tagName = spIdx === -1 ? cleanTag : cleanTag.slice(0, spIdx);
      const attrPart = spIdx === -1 ? '' : cleanTag.slice(spIdx + 1);
      const attrs = parseAttrs(attrPart);
      pos = gt + 1;
      if (selfClose) {
        nodes.push(new MiniElement(tagName, attrs, []));
      } else {
        const children = parseNodes();
        const closeEnd = src.indexOf('>', pos);
        pos = closeEnd === -1 ? src.length : closeEnd + 1;
        nodes.push(new MiniElement(tagName, attrs, children));
      }
    }
    return nodes;
  }
  const top = parseNodes();
  const docEl = top.find((n) => n.nodeType === 1) || new MiniElement('root', {}, top);
  return {
    documentElement: docEl,
    childNodes: [docEl],
    querySelector: (s) => (docEl.localName === s ? docEl : docEl.querySelector(s)),
    querySelectorAll: (s) => docEl.querySelectorAll(s)
  };
}

globalThis.DOMParser = class {
  parseFromString(str) { return parseXml(str); }
};

globalThis.JSZip = {
  async loadAsync(pkg) {
    const files = pkg && pkg._files ? pkg._files : pkg;
    return {
      file(path) {
        if (!files || !Object.prototype.hasOwnProperty.call(files, path)) return null;
        return { async: async () => files[path] };
      }
    };
  }
};

const FayzarFaithfulDocx = require('../js/layout-engine/faithful/faithful-docx-builder.js');
const DocxToDocConverter = require('../js/docx-to-doc-engine.js');

function makeSyntheticDocx(sectPrXml) {
  return {
    name: 'test_border.docx',
    _files: {
      'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>পাতার বর্ডার পরীক্ষা</w:t></w:r></w:p>${sectPrXml}</w:body></w:document>`,
      'word/styles.xml': `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:styles>`,
      'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
    }
  };
}

function normalizeTimestamps(html) {
  return String(html).replace(/<o:(Created|LastSaved)>[^<]*<\/o:\1>/g, '<o:$1>FIXED</o:$1>');
}

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

// ১. সুইচ বন্ধে অপরিবর্তিত আচরণ
await test('সুইচ (__FZ_ON_PGBORDER) বন্ধ থাকলে faithful-docx-builder ও docx-to-doc আউটপুট অপরিবর্তিত থাকে', async () => {
  delete globalThis.__FZ_ON_PGBORDER;
  const page = {
    widthPt: 595.3,
    heightPt: 841.9,
    margins: { top: 36, right: 36, bottom: 36, left: 36 },
    frame: { style: 'single', spacePt: { top: 12, right: 12, bottom: 12, left: 12 } }
  };
  const sectXmlOff = FayzarFaithfulDocx.sectPr(page, true);
  assert.match(sectXmlOff, /<w:pgBorders w:offsetFrom="text">/);
  assert.match(sectXmlOff, /w:space="12"/);

  const conv = new DocxToDocConverter();
  const docx = makeSyntheticDocx(
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="900" w:bottom="1000" w:left="1000"/>` +
    `<w:pgBorders w:offsetFrom="text"><w:top w:val="single" w:sz="12" w:space="12"/><w:left w:val="single" w:sz="12" w:space="15"/><w:bottom w:val="single" w:sz="12" w:space="14"/><w:right w:val="single" w:sz="12" w:space="10"/></w:pgBorders></w:sectPr>`
  );
  const resOff = await conv.convertDocxToDoc(docx, { pageSize: 'a4' });
  const htmlOff = await resOff.blob.text();
  // সুইচ বন্ধে পুরোনো ইঞ্চি-রাউন্ডিং (1000/1440 -> 0.69in = 49.68pt; 49.68 - 15 = 34.7pt) ও data-space বিহীন VML
  assert.match(htmlOff, /margin-left:34\.7pt/);
  assert.doesNotMatch(htmlOff, /data-space=/);
});

// ২. কনভার্টার-পাতার অন্য .doc আউটপুট অপরিবর্তিত (যেখানে pgBorders নেই)
await test('pgBorders নেই এমন সাধারণ .docx ফাইলে সুইচ চালু বা বন্ধে .doc আউটপুট বাইট-বাই-বাইট এক থাকে', async () => {
  const normalDocx = makeSyntheticDocx(
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="864" w:right="864" w:bottom="864" w:left="864"/><w:cols w:num="2" w:space="288"/></w:sectPr>`
  );
  delete globalThis.__FZ_ON_PGBORDER;
  const htmlOff = normalizeTimestamps(await (await new DocxToDocConverter().convertDocxToDoc(normalDocx)).blob.text());

  globalThis.__FZ_ON_PGBORDER = true;
  const htmlOn = normalizeTimestamps(await (await new DocxToDocConverter().convertDocxToDoc(normalDocx)).blob.text());

  assert.equal(htmlOn, htmlOff, 'বর্ডারহীন সাধারণ .doc আউটপুট বাইট-বাই-বাইট অভিন্ন হতে হবে');
});

// ৩. faithful-docx-builder.js-এ offsetFrom="page" ও space মান যাচাই
await test('সুইচ চালু থাকলে কিনারা-দূরত্ব ≤৩১pt হলে sectPr-এ offsetFrom="page" ও কিনারা-space বসে, >৩১pt হলে offsetFrom="text" থাকে', () => {
  globalThis.__FZ_ON_PGBORDER = true;

  // মার্জিন ৩৬pt, লেখা থেকে বর্ডার ১২pt -> পাতার কিনারা থেকে দূরত্ব ২৪pt (≤৩১pt) => offsetFrom="page", w:space="24"
  const pageNearEdge = {
    widthPt: 595.3,
    heightPt: 841.9,
    margins: { top: 36, right: 34, bottom: 36, left: 38 },
    frame: { style: 'single', spacePt: { top: 12, right: 10, bottom: 14, left: 16 } }
  };
  const xmlPageMode = FayzarFaithfulDocx.sectPr(pageNearEdge, true);
  assert.match(xmlPageMode, /<w:pgBorders w:offsetFrom="page">/);
  assert.match(xmlPageMode, /<w:top w:val="single" w:sz="12" w:space="24"/);
  assert.match(xmlPageMode, /<w:left w:val="single" w:sz="12" w:space="22"/);
  assert.match(xmlPageMode, /<w:bottom w:val="single" w:sz="12" w:space="22"/);
  assert.match(xmlPageMode, /<w:right w:val="single" w:sz="12" w:space="24"/);

  // মার্জিন ৫৪pt, লেখা থেকে বর্ডার ১২pt -> পাতার কিনারা থেকে দূরত্ব ৪২pt (>৩১pt) => offsetFrom="text", w:space="12"
  const pageDeepMargin = {
    widthPt: 595.3,
    heightPt: 841.9,
    margins: { top: 54, right: 54, bottom: 54, left: 54 },
    frame: { style: 'double', spacePt: { top: 12, right: 12, bottom: 12, left: 12 } }
  };
  const xmlTextMode = FayzarFaithfulDocx.sectPr(pageDeepMargin, true);
  assert.match(xmlTextMode, /<w:pgBorders w:offsetFrom="text">/);
  assert.match(xmlTextMode, /<w:top w:val="double" w:sz="6" w:space="12"/);
});

// ৪. কৃত্রিম docx-এ pgBorders (offsetFrom="text") -> .doc রূপান্তরের পরে নিখুঁত দূরত্ব রক্ষিত
await test('কৃত্রিম docx-এ pgBorders (offsetFrom="text") রূপান্তরের পরে নিখুঁত কিনারা-দূরত্ব ও space মান রক্ষিত থাকে', async () => {
  globalThis.__FZ_ON_PGBORDER = true;
  // পাতা: 11906×16838 twips = 595.3×841.9 pt
  // মার্জিন: top=1000 (50pt), right=900 (45pt), bottom=1000 (50pt), left=1000 (50pt)
  // বর্ডার space (লেখা থেকে): top=12, right=10, bottom=14, left=15
  // প্রত্যাশিত কিনারা-দূরত্ব: left = 50-15 = 35.0pt, top = 50-12 = 38.0pt, right = 45-10 = 35.0pt, bottom = 50-14 = 36.0pt
  // প্রত্যাশিত ফ্রেম আকার: width = 595.3 - 35 - 35 = 525.3pt, height = 841.9 - 38 - 36 = 767.9pt
  const docx = makeSyntheticDocx(
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="900" w:bottom="1000" w:left="1000"/>` +
    `<w:pgBorders w:offsetFrom="text">` +
      `<w:top w:val="single" w:sz="12" w:space="12" w:color="000000"/>` +
      `<w:left w:val="single" w:sz="12" w:space="15" w:color="000000"/>` +
      `<w:bottom w:val="single" w:sz="12" w:space="14" w:color="000000"/>` +
      `<w:right w:val="single" w:sz="12" w:space="10" w:color="000000"/>` +
    `</w:pgBorders></w:sectPr>`
  );

  const conv = new DocxToDocConverter();
  const res = await conv.convertDocxToDoc(docx, { pageSize: 'a4' });
  const html = await res.blob.text();

  assert.match(html, /margin-left:35\.0pt;margin-top:38\.0pt;width:525\.3pt;height:767\.9pt/);
  assert.match(html, /data-offset-from="text"/);
  assert.match(html, /data-space="12,10,14,15"/);
});

// ৫. কৃত্রিম docx-এ pgBorders (offsetFrom="page") -> .doc রূপান্তরের পরে দূরত্ব ও offsetFrom রক্ষিত
await test('কৃত্রিম docx-এ pgBorders (offsetFrom="page") রূপান্তরের পরে mso-page-border-offset-from:page ও padding দূরত্ব রক্ষিত থাকে', async () => {
  globalThis.__FZ_ON_PGBORDER = true;
  const docx = makeSyntheticDocx(
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>` +
    `<w:pgBorders w:offsetFrom="page">` +
      `<w:top w:val="double" w:sz="6" w:space="24" w:color="000000"/>` +
      `<w:right w:val="double" w:sz="6" w:space="20" w:color="000000"/>` +
      `<w:bottom w:val="double" w:sz="6" w:space="22" w:color="000000"/>` +
      `<w:left w:val="double" w:sz="6" w:space="18" w:color="000000"/>` +
    `</w:pgBorders></w:sectPr>`
  );

  const conv = new DocxToDocConverter();
  const res = await conv.convertDocxToDoc(docx, { pageSize: 'a4' });
  const html = await res.blob.text();

  assert.match(html, /mso-page-border-offset-from:page;/);
  assert.match(html, /padding:24\.0pt 20\.0pt 22\.0pt 18\.0pt;/);
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
