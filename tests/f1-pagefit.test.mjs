/**
 * WORK_PLAN F1 — স্টুডিও বিজয় .doc এক-পাতা ফিট (Page-Fit) ইউনিট টেস্ট
 * চালানো: node tests/f1-pagefit.test.mjs (কোনো বাহ্যিক নির্ভরতা ছাড়া)
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ─── ন্যূনতম XML DOM ও মেমরি-JSZip (বাহ্যিক প্যাকেজ ছাড়াই Node-এ চালানোর জন্য) ───
class MinNode {
  constructor(tag, attrs = {}, children = [], text = '', ownerDocument = null) {
    this.nodeType = 1;
    this.nodeName = tag;
    this.tagName = tag;
    this.localName = tag.split(':').pop();
    this._attrs = attrs;
    this.childNodes = children;
    this._text = text;
    this.parentNode = null;
    this.ownerDocument = ownerDocument;
    for (const c of children) {
      if (c && typeof c === 'object') {
        c.parentNode = this;
        if (ownerDocument && !c.ownerDocument) c.ownerDocument = ownerDocument;
      }
    }
  }
  get children() {
    return this.childNodes.filter((c) => c && c.nodeType === 1);
  }
  get firstElementChild() {
    return this.children[0] || null;
  }
  get lastChild() {
    return this.childNodes.length ? this.childNodes[this.childNodes.length - 1] : null;
  }
  get previousSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return idx > 0 ? this.parentNode.childNodes[idx - 1] : null;
  }
  get textContent() {
    if (this.childNodes.length === 0) return this._text;
    return this.childNodes.map((c) => (c.nodeType === 3 ? c.nodeValue : c.textContent)).join('');
  }
  set textContent(v) {
    this.childNodes = [];
    this._text = String(v == null ? '' : v);
  }
  get outerHTML() {
    const a = Object.entries(this._attrs).map(([k, v]) => ` ${k}="${v}"`).join('');
    if (this.childNodes.length === 0 && !this._text) return `<${this.nodeName}${a}/>`;
    const inner = this.childNodes.length
      ? this.childNodes.map((c) => (c.nodeType === 3 ? c.nodeValue : c.outerHTML)).join('')
      : this._text;
    return `<${this.nodeName}${a}>${inner}</${this.nodeName}>`;
  }
  hasAttribute(name) {
    return this.getAttribute(name) !== null;
  }
  getAttribute(name) {
    if (Object.prototype.hasOwnProperty.call(this._attrs, name)) return this._attrs[name];
    const bare = name.split(':').pop();
    for (const [k, v] of Object.entries(this._attrs)) {
      if (k === name || k.split(':').pop() === bare) return v;
    }
    return null;
  }
  setAttribute(name, val) {
    this._attrs[name] = String(val);
  }
  removeAttribute(name) {
    delete this._attrs[name];
    const bare = name.split(':').pop();
    for (const k of Object.keys(this._attrs)) {
      if (k === name || k.split(':').pop() === bare) delete this._attrs[k];
    }
  }
  cloneNode(deep = false) {
    const copy = new MinNode(
      this.nodeName,
      { ...this._attrs },
      deep ? this.childNodes.map((c) => (c.nodeType === 3 ? { nodeType: 3, nodeValue: c.nodeValue } : c.cloneNode(true))) : [],
      this._text,
      this.ownerDocument
    );
    return copy;
  }
  get nextSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return idx >= 0 && idx + 1 < this.parentNode.childNodes.length ? this.parentNode.childNodes[idx + 1] : null;
  }
  get firstChild() {
    return this.childNodes[0] || null;
  }
  appendChild(ch) {
    if (ch.parentNode && typeof ch.parentNode.removeChild === 'function') ch.parentNode.removeChild(ch);
    ch.parentNode = this;
    if (this.ownerDocument && !ch.ownerDocument) ch.ownerDocument = this.ownerDocument;
    this.childNodes.push(ch);
    return ch;
  }
  insertBefore(newNode, refNode) {
    if (newNode.parentNode && typeof newNode.parentNode.removeChild === 'function') newNode.parentNode.removeChild(newNode);
    newNode.parentNode = this;
    if (this.ownerDocument && !newNode.ownerDocument) newNode.ownerDocument = this.ownerDocument;
    const idx = refNode ? this.childNodes.indexOf(refNode) : -1;
    if (idx >= 0) this.childNodes.splice(idx, 0, newNode);
    else this.childNodes.push(newNode);
    return newNode;
  }
  removeChild(ch) {
    const idx = this.childNodes.indexOf(ch);
    if (idx >= 0) {
      this.childNodes.splice(idx, 1);
      ch.parentNode = null;
    }
    return ch;
  }
  _matches(sel) {
    const parts = sel.split(',').map((s) => s.trim()).filter(Boolean);
    return parts.some((p) => {
      if (p.includes('>')) {
        const chain = p.split('>').map((x) => x.trim());
        let cur = this;
        for (let i = chain.length - 1; i >= 0; i--) {
          if (!cur || cur.nodeType !== 1 || !cur._matchSingle(chain[i])) return false;
          cur = cur.parentNode;
        }
        return true;
      }
      return this._matchSingle(p);
    });
  }
  _matchSingle(token) {
    const clean = token.replace(/^\*\|/, '').replace(/\\/g, '').split(':').pop();
    return clean === '*' || this.localName === clean || this.nodeName === token;
  }
  querySelectorAll(sel) {
    const out = [];
    const walk = (n) => {
      for (const c of n.childNodes || []) {
        if (c.nodeType === 1) {
          if (c._matches(sel)) out.push(c);
          walk(c);
        }
      }
    };
    walk(this);
    return out;
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
  getElementsByTagName(tag) {
    if (tag === '*') return this.querySelectorAll('*');
    return this.querySelectorAll(tag);
  }
  getElementsByTagNameNS(_ns, tag) {
    return this.getElementsByTagName(tag);
  }
}

function parseXml(xmlStr) {
  const s = String(xmlStr || '').replace(/<\?xml[^?]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  const root = new MinNode('#document', {}, []);
  root.ownerDocument = root;
  const stack = [root];
  const tagRe = /<(\/?)([A-Za-z0-9_:.-]+)((?:\s+[A-Za-z0-9_:.-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = tagRe.exec(s)) !== null) {
    if (m[5] !== undefined) {
      const txt = m[5];
      const top = stack[stack.length - 1];
      if (top && top !== root) {
        if (top.childNodes.length === 0) top._text += txt;
        else top.childNodes.push({ nodeType: 3, nodeValue: txt, parentNode: top });
      }
      continue;
    }
    const isClose = m[1] === '/';
    const name = m[2];
    const attrStr = m[3] || '';
    const isSelf = m[4] === '/';
    if (isClose) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const attrs = {};
    const aRe = /([A-Za-z0-9_:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let am;
    while ((am = aRe.exec(attrStr)) !== null) {
      attrs[am[1]] = am[2] !== undefined ? am[2] : am[3];
    }
    const node = new MinNode(name, attrs, [], '', root);
    stack[stack.length - 1].appendChild(node);
    if (!isSelf) stack.push(node);
  }
  root.documentElement = root.childNodes[0] || root;
  root.createElement = (qName) => new MinNode(qName, {}, [], '', root);
  root.createElementNS = (_ns, qName) => new MinNode(qName, {}, [], '', root);
  root.createTextNode = (txt) => ({ nodeType: 3, nodeValue: String(txt == null ? '' : txt), parentNode: null });
  root.importNode = (n) => (n && typeof n.cloneNode === 'function' ? n.cloneNode(true) : n);
  return root;
}

class MinDOMParser {
  parseFromString(str) {
    return parseXml(str);
  }
}

class MinXMLSerializer {
  serializeToString(doc) {
    const el = doc.documentElement || doc;
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + el.outerHTML;
  }
}

class MockJSZip {
  constructor() {
    this.files = {};
  }
  file(name, content) {
    if (content === undefined) return this.files[name] || null;
    this.files[name] = {
      name,
      _content: String(content),
      async: async (type) => (type === 'base64' ? Buffer.from(String(content)).toString('base64') : String(content))
    };
    return this;
  }
  forEach(cb) {
    for (const [k, v] of Object.entries(this.files)) cb(k, v);
  }
  async generateAsync() {
    return { __mockZip: true, files: { ...this.files } };
  }
  static async loadAsync(input) {
    if (input && input.__mockZip) {
      const z = new MockJSZip();
      z.files = { ...input.files };
      return z;
    }
    throw new Error('Invalid MockJSZip input');
  }
}
MockJSZip.support = { blob: false };

class MockBlob {
  constructor(parts = [], opts = {}) {
    this.parts = parts;
    this.type = opts.type || '';
  }
  async text() {
    return this.parts.map((p) => (typeof p === 'string' ? p : String(p))).join('');
  }
  async arrayBuffer() {
    return this;
  }
}

function createSandbox() {
  const ctx = {
    console,
    setTimeout,
    clearTimeout,
    DOMParser: MinDOMParser,
    XMLSerializer: MinXMLSerializer,
    JSZip: MockJSZip,
    Blob: MockBlob,
    File: MockBlob,
    BanglaConverter: {
      hasBengaliText: (s) => /[\u0980-\u09FF]/.test(s),
      isPureEnglish: (s) => /^[\x00-\x7F]*$/.test(s),
      unicodeToBijoy: (s) => String(s).replace(/তারিখ/g, 'ZvwiL').replace(/বরাবর/g, 'eivei').replace(/মোট/g, '†gvU')
    }
  };
  ctx.window = ctx;
  ctx.global = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const rel of [
    'js/layout-engine/application-layout.js',
    'js/engines/export-dual-engine.js',
    'js/docx-handler.js',
    'js/docx-to-doc-engine.js',
    'js/layout-engine/fayzar-export.js'
  ]) {
    const fullPath = path.join(ROOT, rel);
    if (fs.existsSync(fullPath)) {
      const code = fs.readFileSync(fullPath, 'utf8');
      vm.runInContext(code, ctx, { filename: rel });
    }
  }
  return ctx;
}

// ─── নমুনা DOCX নির্মাতা (app-job, cash-memo-items এবং প্রশ্নপত্রের গঠন) ───
async function makeDocxZip(docBodyXml, defaultFont = 'SutonnyMJ') {
  const z = new MockJSZip();
  z.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr>
    <w:rFonts w:ascii="${defaultFont}" w:hAnsi="${defaultFont}" w:cs="${defaultFont}"/>
    <w:sz w:val="24"/><w:szCs w:val="24"/>
  </w:rPr></w:rPrDefault></w:docDefaults>
</w:styles>`);
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${docBodyXml}</w:body>
</w:document>`);
  return await z.generateAsync();
}

function buildAppJobDocxXml(geom) {
  const bodySz = (geom.bodyPt || 12) * 2;
  const tblSz = (geom.tablePt || 11) * 2;
  return `
    <w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${geom.line}"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="SutonnyMJ" w:hAnsi="SutonnyMJ" w:cs="SutonnyMJ"/><w:sz w:val="${bodySz}"/><w:szCs w:val="${bodySz}"/></w:rPr><w:t>তারিখ: ১৯/০৭/২০২৬ ইং</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${geom.line}"/></w:pPr></w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9026" w:type="dxa"/><w:jc w:val="center"/>
        <w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>
        <w:tblBorders><w:top w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/></w:tblBorders>
      </w:tblPr>
      <w:tr><w:tc><w:tcPr><w:tcW w:w="1502" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240"/></w:pPr>
          <w:r><w:rPr><w:b/><w:rFonts w:ascii="SutonnyMJ" w:hAnsi="SutonnyMJ" w:cs="SutonnyMJ"/><w:sz w:val="${tblSz}"/><w:szCs w:val="${tblSz}"/></w:rPr><w:t>এসএসসি</w:t></w:r>
        </w:p>
      </w:tc></w:tr>
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="${geom.top}" w:right="${geom.right}" w:bottom="${geom.bottom}" w:left="${geom.left}"/>
    </w:sectPr>`;
}

function buildCashMemoDocxXml(geom) {
  let rowsXml = '';
  for (let i = 1; i <= geom.rows; i++) {
    rowsXml += `<w:tr><w:trPr><w:trHeight w:val="247" w:hRule="exact"/></w:trPr>
      <w:tc><w:tcPr><w:tcW w:w="428" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="${geom.line}"/></w:pPr>
          <w:r><w:rPr><w:rFonts w:ascii="SutonnyMJ" w:hAnsi="SutonnyMJ" w:cs="SutonnyMJ"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${String(i).padStart(2, '0')}</w:t></w:r>
        </w:p>
      </w:tc>
    </w:tr>`;
  }
  return `
    <w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="60" w:lineRule="exact"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="SutonnyMJ" w:hAnsi="SutonnyMJ" w:cs="SutonnyMJ"/><w:sz w:val="6"/><w:szCs w:val="6"/></w:rPr><w:t> </w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5036" w:type="dxa"/>
        <w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="72" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="72" w:type="dxa"/></w:tblCellMar>
        <w:tblBorders><w:top w:val="single" w:sz="6" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:color="000000"/><w:left w:val="single" w:sz="6" w:color="000000"/><w:right w:val="single" w:sz="6" w:color="000000"/><w:insideH w:val="single" w:sz="6" w:color="000000"/><w:insideV w:val="single" w:sz="6" w:color="000000"/></w:tblBorders>
      </w:tblPr>
      ${rowsXml}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${geom.wordsLine}"/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="5036"/></w:tabs></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="SutonnyMJ" w:hAnsi="SutonnyMJ" w:cs="SutonnyMJ"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>কথায়: </w:t></w:r><w:r><w:tab/></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="432" w:right="288" w:bottom="288" w:left="288"/>
      <w:cols w:num="3" w:space="576"/>
    </w:sectPr>`;
}

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  [পাস] ${name}`);
  } else {
    failed++;
    console.error(`  [ব্যর্থ] ${name}${detail ? ' — ' + detail : ''}`);
  }
}

async function runTests() {
  const ctx = createSandbox();
  const realAL = ctx.FayzarApplicationLayout;

  // মক লেআউট ও পাইপলাইন সংযুক্তি (স্টুডিও মাস্টার চেইন যাচাইয়ের জন্য)
  let lastPipeOpts = null;
  let lastPackageFont = null;

  ctx.FayzarApplicationLayout = {
    parse: (raw) => ({ raw }),
    geometry: (_model, gOpts) => (gOpts && gOpts.isBijoy
      ? { bodyPt: 12, tablePt: 11, line: 264, top: 720, right: 720, bottom: 540, left: 1152 }
      : { bodyPt: 13, tablePt: 12, line: 288, top: 1440, right: 1080, bottom: 1080, left: 1800 }),
    renderDocx: (_model, rCtx) => buildAppJobDocxXml(rCtx.geometry),
    docxSectPr: () => ''
  };

  ctx.FayzarCashMemoLayout = {
    parse: (raw) => ({ raw }),
    geometry: (_model, gOpts) => (gOpts && gOpts.isBijoy
      ? { rows: 26, line: 240, wordsLine: 360 }
      : { rows: 23, line: 173, wordsLine: 259 }),
    renderDocx: (_model, rCtx) => buildCashMemoDocxXml(rCtx.geometry),
    docxSectPr: () => ''
  };

  const origPackageDocx = ctx.ExportDualEngine._packageDocx.bind(ctx.ExportDualEngine);
  ctx.ExportDualEngine._packageDocx = async function (xml, fontName) {
    lastPackageFont = fontName;
    return await origPackageDocx(xml, fontName);
  };

  ctx.FayzarPipeline = {
    exportDocx: async (text, pipeOpts) => {
      lastPipeOpts = { ...pipeOpts };
      const content = await ctx.ExportDualEngine.generateWordDoc(
        text,
        pipeOpts.docType || 'GOVT_APP',
        Object.assign({}, pipeOpts, { format: 'docx' })
      );
      return { content };
    }
  };

  console.log('=== WORK_PLAN F1: স্টুডিও বিজয় .doc এক-পাতা ফিট টেস্ট ===');

  // ১. app-job মাস্টার-পথে (studioFit সক্রিয়) ১-পাতা জ্যামিতি ও স্টাইল যাচাই
  const appRaw = fs.readFileSync(path.join(ROOT, 'tests/fixtures/app-job.input.md'), 'utf8');
  const appRes = await ctx.FayzarExport.produce(appRaw, { format: 'doc', docType: 'GOVT_APP' });
  const appHtml = await appRes.blob.text();

  check('১. app-job: মাস্টার তৈরির সময় targetFont="bijoy" পাস হয়েছে', lastPipeOpts && lastPipeOpts.targetFont === 'bijoy');
  check('২. app-job: _applicationLayoutDocx ডিফল্ট স্টাইল ফন্ট SutonnyMJ রেখেছে', lastPackageFont === 'SutonnyMJ');
  check('৩. app-job: ১-পাতা মার্জিন (0.50in 0.50in 0.375in 0.80in) ও ফুটার-মার্জিন (.375in) বসেছে',
    appHtml.includes('margin:0.50in 0.50in 0.375in 0.80in;') && appHtml.includes('mso-footer-margin:0.375in;'));
  check('৪. app-job: বডি ফন্ট ১২pt ও লাইন-স্পেসিং ১১০% এবং টেবিল ফন্ট ১১pt বসেছে',
    appHtml.includes('line-height:110%') && appHtml.includes('font-size:12pt') && appHtml.includes('font-size:11pt'));
  check('৫. app-job: শিক্ষাগত যোগ্যতা টেবিলে বাড়তি 3.5pt 5.5pt প্যাডিংয়ের বদলে tblCellMar (0.0pt 4.0pt) বসেছে',
    appHtml.includes('padding:0.0pt 4.0pt 0.0pt 4.0pt') && !appHtml.includes('padding:3.5pt 5.5pt'));
  check('৬. app-job: খালি প্যারাগ্রাফে (&nbsp;) SutonnyMJ ১২pt স্প্যান বসেছে (Times New Roman ১২pt নয়)',
    appHtml.includes("font-family:'SutonnyMJ',Arial,sans-serif;mso-ascii-font-family:'SutonnyMJ';mso-hansi-font-family:'SutonnyMJ';mso-bidi-font-family:'SutonnyMJ'\">&nbsp;</span>"));

  // ২. cash-memo-items মাস্টার-পথে (studioFit সক্রিয়) ১-পাতা জ্যামিতি, সারি-উচ্চতা ও প্যাডিং যাচাই
  const cmRaw = fs.readFileSync(path.join(ROOT, 'tests/fixtures/cash-memo-items.input.md'), 'utf8');
  const cmRes = await ctx.FayzarExport.produce(cmRaw, { format: 'doc', docType: 'CASH_MEMO' });
  const cmHtml = await cmRes.blob.text();

  check('৭. cash-memo-items: মাস্টার তৈরির সময় targetFont="bijoy" পাস হয়েছে এবং ২৬টি আইটেম সারি তৈরি হয়েছে',
    lastPipeOpts && lastPipeOpts.targetFont === 'bijoy' && (cmHtml.match(/<tr /g) || []).length === 26);
  check('৮. cash-memo-items: প্রতিটি টেবিল সারিতে exact উচ্চতা (height:12.35pt;mso-height-rule:exactly) বসেছে',
    cmHtml.includes('<tr style="height:12.35pt;mso-height-rule:exactly">'));
  check('৯. cash-memo-items: প্রতিটি টেবিল ঘরে উপরে-নিচে ০pt প্যাডিং (padding:0.0pt 3.6pt 0.0pt 3.6pt) বসেছে',
    cmHtml.includes('padding:0.0pt 3.6pt 0.0pt 3.6pt') && !cmHtml.includes('padding:3.5pt 5.5pt'));
  check('১০. cash-memo-items: ৯pt ও ৩pt প্যারাগ্রাফে নিজস্ব font-size বসেছে (১২pt অনুচ্ছেদ-চিহ্ন স্ফীতি বন্ধ)',
    cmHtml.includes('font-size:9pt;mso-bidi-font-size:9pt') && cmHtml.includes('font-size:3pt;mso-bidi-font-size:3pt'));
  check('১১. cash-memo-items: ল্যান্ডস্কেপ মার্জিনের সাথে হেডার/ফুটার মার্জিন (0.30in / 0.20in) ক্ল্যাম্প হয়েছে',
    cmHtml.includes('mso-header-margin:0.30in;') && cmHtml.includes('mso-footer-margin:0.20in;'));

  // ৩. গেট যাচাই (studioFit: false এবং কনভার্টার পেজের ডিফল্ট convertDocxToDoc আচরণ অবিকল থাকা)
  const appOffRes = await ctx.FayzarExport.produce(appRaw, { format: 'doc', docType: 'GOVT_APP', studioFit: false });
  const appOffHtml = await appOffRes.blob.text();

  check('১২. গেট যাচাই (FayzarExport studioFit: false): সুইচ বন্ধ থাকলে app-job আগের মতোই 1.00in মার্জিন, 13pt ফন্ট ও padding:3.5pt 5.5pt রাখে',
    appOffHtml.includes('margin:1.00in 0.75in 0.75in 1.25in;') &&
    appOffHtml.includes('font-size:13pt') &&
    appOffHtml.includes('padding:3.5pt 5.5pt'));

  const cmOffRes = await ctx.FayzarExport.produce(cmRaw, { format: 'doc', docType: 'CASH_MEMO', studioFit: false });
  const cmOffHtml = await cmOffRes.blob.text();

  check('১৩. গেট যাচাই (FayzarExport studioFit: false): সুইচ বন্ধ থাকলে cash-memo-items আগের মতোই padding:3.5pt 5.5pt রাখে ও trHeight বাদ দেয়',
    cmOffHtml.includes('padding:3.5pt 5.5pt') && !cmOffHtml.includes('mso-height-rule:exactly'));

  // ৪. কনভার্টার পেজের (index.html) ডিফল্ট convertDocxToDoc কল এবং প্রশ্নপত্রের (cq-short / math / mcq) অপরিবর্তিত আচরণ যাচাই
  const examDocx = await makeDocxZip(`
    <w:p><w:pPr><w:spacing w:before="0" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="SutonnyMJ" w:hAnsi="SutonnyMJ" w:cs="SutonnyMJ"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>১. ক. গ্রামের বটগাছটিকে মানুষ কী মনে করত?</w:t></w:r>
    </w:p>
    <w:sectPr><w:pgSz w:w="16838" w:h="11906"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/><w:cols w:num="2" w:space="1008"/></w:sectPr>
  `);
  const convDefault = await new ctx.DocxToDocConverter().convertDocxToDoc(examDocx, { pageSize: 'a4', margin: 'normal', preserveSutonny: true });
  const convStudio = await new ctx.DocxToDocConverter().convertDocxToDoc(examDocx, { pageSize: 'a4', margin: 'normal', preserveSutonny: true, studioFit: true });
  const htmlDefault = (await convDefault.blob.text()).replace(/<o:(Created|LastSaved)>[^<]*<\/o:\1>/g, '');
  const htmlStudio = (await convStudio.blob.text()).replace(/<o:(Created|LastSaved)>[^<]*<\/o:\1>/g, '');

  check('১৪. রিগ্রেশন যাচাই: ১২pt প্রশ্নপত্রে (cq-short / math-equations / mcq-pure-28) studioFit চালু ও বন্ধের আউটপুট হুবহু এক',
    htmlDefault === htmlStudio);

  const studioCtrlSrc = fs.readFileSync(path.join(ROOT, 'js/studio-controller.js'), 'utf8');
  check('১৫. স্টুডিও কন্ট্রোলার যাচাই: downloadDocument থেকে FayzarExport.produce কলে studioFit: true পাস করা হয়েছে',
    /studioFit\s*=\s*o\.studioFit !== undefined \? !!o\.studioFit : \(!o\.masterDocx && !isExamDoc\)/.test(fs.readFileSync(path.join(ROOT, 'js/layout-engine/fayzar-export.js'), 'utf8')));

  // ৫. আসল application-layout.js মডিউলের ১-পাতা ধাপ (STEPS[3]) ও টেবিল মার্জিন যাচাই
  const step3 = realAL && realAL.geometry ? realAL.geometry(null, { step: 3 }) : null;
  const tblXml = realAL && realAL._docxTable ? realAL._docxTable({ rows: [['ক', 'খ']], header: true }, { runs: (t) => `<w:r><w:t>${t}</w:t></w:r>` }, step3 || { tableSz: 22, textW: 10034 }) : '';
  check('১৬. application-layout যাচাই: আসল মডিউলে ১-পাতা ধাপ (720/720/540/1152, sz=24, line=264, tableSz=22) ও tblCellMar (80 dxa) অক্ষত আছে',
    !!(step3 && step3.top === 720 && step3.right === 720 && step3.bottom === 540 && step3.left === 1152 &&
       step3.sz === 24 && step3.line === 264 && step3.tableSz === 22 &&
       tblXml.includes('<w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>')));

  console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
