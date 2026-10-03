/**
 * Part-14.0 — Studio Figure Pipeline (P0-1/P0-2/P0-3/P0-4 + P1)
 *   node tests/part14-0-studio-figure.test.mjs
 *
 * যাচাই:
 *   P0-2: ব্রিজ ফিগার/লেবেল (A/B/C) লিক করে না; মার্কার অটুট
 *   P0-4: ভ্যালিড টার্গেট ছাড়া ইনসার্ট হয় না + মিথ্যা টোস্ট নেই
 *   P0-1: .docx-এ media+<w:drawing>, .doc-এ RTF \pict\pngblip
 *   P0-3: typing/re-render/reload-এ চিত্র টেকে; History/AutoSave ধরে
 *   P1:   Esc/ব্যাকড্রপে মডাল বন্ধ; মিসিং বোতাম-আইডি সোর্সে আছে
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

const FP = require(path.join(ROOT, 'js/engines/studio-figure-pipeline.js'));
const JSZip = require(path.join(ROOT, 'js/jszip.min.js'));
const BRIDGE = require(path.join(ROOT, 'js/engines/studio-edit-bridge.js'));
const CTRL = fs.readFileSync(path.join(ROOT, 'js/studio-controller.js'), 'utf8');
const BRIDGE_SRC = fs.readFileSync(path.join(ROOT, 'js/engines/studio-edit-bridge.js'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');

// ───────────────────────── ১) মার্কার-হেল্পার ─────────────────────────
console.log('\n— (১) মার্কার-মডেল —');
{
  T('markerFor(7) → QZFIG7QZ', FP.markerFor(7) === 'QZFIG7QZ');
  T('hasMarkers সত্য/মিথ্যা ঠিক', FP.hasMarkers('ক খ QZFIG1QZ') && !FP.hasMarkers('ক খ'));
  const ex = FP.extractMarkers('ক. প্রশ্ন QZFIG2QZ খ. আরেকটি QZFIG11QZ');
  T('extractMarkers: ২টি, ক্রম ও id ঠিক', ex.length === 2 && ex[0].id === 2 && ex[1].id === 11, ex);
  T('stripMarkers: মার্কার ছাড়া পরিচ্ছন্ন টেক্সট',
    FP.stripMarkers('ক. প্রশ্ন  QZFIG2QZ  খ. উত্তর') === 'ক. প্রশ্ন খ. উত্তর', FP.stripMarkers('ক. প্রশ্ন  QZFIG2QZ  খ. উত্তর'));
  T('preserveMarkers: হারানো মার্কার ফেরে (টেক্সট-এডিটে চিত্র টেকে)',
    FP.preserveMarkers('সম্পাদিত প্রশ্ন', 'মূল প্রশ্ন QZFIG3QZ') === 'সম্পাদিত প্রশ্ন QZFIG3QZ');
  T('preserveMarkers: আগে থাকলে ডাবল হয় না',
    FP.preserveMarkers('প্রশ্ন QZFIG3QZ', 'মূল QZFIG3QZ') === 'প্রশ্ন QZFIG3QZ');
  T('pruneMarkers: মৃত মার্কার সরায়, জীবিত রাখে',
    FP.pruneMarkers('ক QZFIG1QZ খ QZFIG9QZ', [1]) === 'ক QZFIG1QZ খ ');
  T('tinyPngDataUrl সত্যিকারের PNG', FP.dataUrlToBytes(FP.tinyPngDataUrl())[0] === 0x89);

  // ── ফিক্স-২ রুট-কজ: রান-ভাগকারী টোকেনাইজার কেন পুরনো টোকেন ভাঙত ──
  const BNC = require(path.join(ROOT, 'js/bangla-converter-engine.js'));
  const segNew = BNC.splitMixedBengaliAndEnglish('প্রশ্ন: QZFIG1QZ');
  T('নতুন মার্কার একক english-রানে অটুট (এক্সপোর্টে হুবহু মেলে)',
    segNew.length === 2 && segNew[0].type === 'bengali' && segNew[1].type === 'english' &&
    segNew[1].text.trim() === 'QZFIG1QZ', segNew);
  const segOld = BNC.splitMixedBengaliAndEnglish('প্রশ্ন: @@FIG1@@');
  T('পুরনো টোকেন সত্যিই দুই রানে ভাগ হত (রুট-কজ প্রমাণ)',
    segOld.length === 2 && /@@$/.test(segOld[0].text) && /^FIG1@@/.test(segOld[1].text), segOld);
  T('Bijoy-রূপান্তরে মার্কার অপরিবর্তিত', BNC.unicodeToBijoy('QZFIG1QZ') === 'QZFIG1QZ', BNC.unicodeToBijoy('QZFIG1QZ'));
  const segMixed = BNC.splitMixedBengaliAndEnglish('ক. সূত্র লেখো QZFIG3QZ');
  T('বাংলা-টেক্সটের পাশেও মার্কার ভাঙে না', segMixed.some((s) => s.type === 'english' && s.text.includes('QZFIG3QZ')), segMixed);
}

// ───────────────────────── ২) RTF (.doc) ─────────────────────────
console.log('\n— (২) .doc — RTF \\pict\\pngblip —');
{
  const fig = { id: 1, dataUrl: FP.tinyPngDataUrl(), mime: 'image/png', pxW: 400, pxH: 200, cssW: 180, align: 'center' };
  const pict = FP.buildRtfPict(fig);
  T('pict-গ্রুপ: pngblip + picw/pich + goal', /^\{\\pict\\pngblip\\picw400\\pich200\\picwgoal2700\\pichgoal1350 [0-9A-F]+\}$/.test(pict), pict.slice(0, 60));
  const hexMatch = /\s([0-9A-F]+)\}$/.exec(pict);
  const bytes = hexMatch ? Buffer.from(hexMatch[1], 'hex') : Buffer.alloc(0);
  T('hex → আসল PNG বাইট (৮৯ ৫০ ৪E ৪৭)', bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47);
  T('JPEG-ফিগারে jpegblip', /\{\\pict\\jpegblip/.test(FP.buildRtfPict(Object.assign({}, fig, { mime: 'image/jpeg' }))));

  const rtf = '{\\rtf1\\ansi\\deff0\n{\\pard\\ql ১। নিচের ছবি দেখো: QZFIG1QZ\\par}\n}';
  const res = FP.injectIntoRtfSync(rtf, { 1: fig });
  T('মার্কার → pict (১টি)', res.replaced === 1 && res.text.includes('\\pngblip'));
  T('আউটপুটে কোনো মার্কার অবশিষ্ট নেই', !/QZFIG\d+QZ/.test(res.text));
  T('RTF-কাঠামো অটুট (\\rtf1 … শেষ })', res.text.startsWith('{\\rtf1') && res.text.trimEnd().endsWith('}'));
  // রান-সীমানায় ভাঙা মার্কার (পুরনো @-টোকেনের মতো) — tolerant fallback
  const splitRtf = String.raw`{\rtf1 উঃ QZ}{\f1 FIG1QZ \par}`;
  const resSplit = FP.injectIntoRtfSync(splitRtf, { 1: fig });
  T('ভাঙা মার্কারও pict হয় (tolerant fallback)', resSplit.replaced === 1 && resSplit.tolerant === 1 && !/QZFIG/.test(resSplit.text),
    { r: resSplit.replaced, t: resSplit.tolerant });
  T('tolerant-পথে RTF ব্রেস-ব্যালান্স ঠিক', (resSplit.text.match(/{/g) || []).length === (resSplit.text.match(/}/g) || []).length);
  const statsObj = {};
  FP.injectIntoRtfSync(rtf, { 1: fig }, statsObj);
  T('স্ট্যাটস রিপোর্ট (found/replaced/stripped) ঠিক', statsObj.found === 1 && statsObj.replaced === 1 && statsObj.stripped === 0, statsObj);

  const resMissing = FP.injectIntoRtfSync(rtf, {});
  T('ফিগার-স্টোর খালি হলে মান-না-লেখা মার্কারও মুছে যায়', resMissing.replaced === 0 && !/QZFIG\d+QZ/.test(resMissing.text));
  const deadStats = {};
  FP.injectIntoRtfSync(rtf, {}, deadStats);
  T('মৃত মার্কার-স্ট্রিপের হিসাব (stripped) ঠিক', deadStats.replaced === 0 && deadStats.stripped === 1, deadStats);
}

// ───────────────────────── ৩) DOCX — media + rels + drawing ─────────────────────────
console.log('\n— (৩) .docx — word/media + <w:drawing> —');
{
  const fig = { id: 1, dataUrl: FP.tinyPngDataUrl(), mime: 'image/png', pxW: 400, pxH: 200, cssW: 180, align: 'center', name: 'সমকোণী ত্রিভুজ' };
  const mkPkg = async () => {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>');
    zip.file('word/_rels/document.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:p><w:r><w:t xml:space="preserve">১। ছবি দেখো: QZFIG1QZ</w:t></w:r></w:p><w:p><w:r><w:t>পরের প্রশ্ন</w:t></w:r></w:p></w:body></w:document>');
    return await zip.generateAsync({ type: 'nodebuffer' });
  };

  const out = await FP.injectIntoDocx(await mkPkg(), { 1: fig });
  const zip = await JSZip.loadAsync(out);
  const names = Object.keys(zip.files);
  T('word/media/figure1.png তৈরি', names.includes('word/media/figure1.png'));
  const media = await zip.file('word/media/figure1.png').async('nodebuffer');
  T('media-বাইট = মূল PNG', media[0] === 0x89 && media[1] === 0x50 && media.length > 50, media.length);
  const doc = await zip.file('word/document.xml').async('string');
  T('document.xml-এ <w:drawing>', /<w:drawing>/.test(doc));
  T('r:embed = rIdFig1', /<a:blip r:embed="rIdFig1"\/>/.test(doc));
  T('ছবি-প্যারাগ্রাফ + কেন্দ্র-প্রান্তিককরণ', /<w:p><w:pPr><w:spacing[^>]*\/><w:jc w:val="center"\/><\/w:pPr><w:r><w:drawing>/.test(doc));
  T('মার্কার সম্পূর্ণ মুছে গেছে', !/QZFIG\d+QZ/.test(doc));
  T('আগের লেখা অটুট', doc.includes('পরের প্রশ্ন'));
  T('drawing প্যারাগ্রাফটি প্রশ্ন-প্যারাগ্রাফের পরে', doc.indexOf('<w:drawing>') > doc.indexOf('ছবি দেখো'));
  const rels = await zip.file('word/_rels/document.xml.rels').async('string');
  T('rels-এ image-সম্পর্ক যোগ', rels.includes('Id="rIdFig1"') && rels.includes('Target="media/figure1.png"'));
  T('rId1 (styles) অটুট', rels.includes('Id="rId1"'));
  const types = await zip.file('[Content_Types].xml').async('string');
  T('[Content_Types]-এ png ডিফল্ট', /<Default Extension="png" ContentType="image\/png"\/>/.test(types));

  // দুই ফিগার — সিরিয়াল
  const two = '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:p><w:r><w:t>A QZFIG1QZ</w:t></w:r></w:p><w:p><w:r><w:t>B QZFIG2QZ</w:t></w:r></w:p></w:body></w:document>';
  const zip2 = new JSZip();
  zip2.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>');
  zip2.file('word/document.xml', two);
  const out2 = await FP.injectIntoDocx(await zip2.generateAsync({ type: 'nodebuffer' }), { 1: fig, 2: Object.assign({}, fig, { id: 2, align: 'left' }) });
  const z2 = await JSZip.loadAsync(out2);
  const doc2 = await z2.file('word/document.xml').async('string');
  T('দুই ফিগার → figure1/figure2 + rIdFig2', Object.keys(z2.files).includes('word/media/figure2.png') && /r:embed="rIdFig2"/.test(doc2));
  T('বাম-প্রান্তিককরণ মানা হয় (align:left)', /<w:jc w:val="left"\/>/.test(doc2));
}

// ───────────────────────── ৪) ব্রিজ — নীরব দূষণ বন্ধ (P0-2) ─────────────────────────
console.log('\n— (৪) Edit Bridge — চিত্র/লেবেল লিক বন্ধ —');
{
  T('ব্রিজে textWithoutFigures আছে', typeof BRIDGE.textWithoutFigures === 'function' || BRIDGE_SRC.includes('function textWithoutFigures'));
  T('ক্লোন থেকে .studio-figure-wrapper বাদ পড়ে',
    /clone\.querySelectorAll\('\.studio-figure-wrapper, \.figure-toolbar'\)\.forEach\(function \(n\) \{ n\.remove\(\); \}\)/.test(BRIDGE_SRC));
  T('তুলনায় মার্কার বাদ (stripFigMarkers)',
    BRIDGE.stripFigMarkers('প্রশ্ন QZFIG1QZ') === 'প্রশ্ন');
  T('মান-লেখার সময় মার্কার অটুট (preserveFigMarkers)',
    BRIDGE.preserveFigMarkers('সম্পাদিত', 'মূল QZFIG2QZ') === 'সম্পাদিত QZFIG2QZ');
  T('nodeText এখন ফিগার-সচেতন', /function nodeText\(el\) \{[\s\S]{0,160}stripFigMarkers\(textWithoutFigures\(el\)\)/.test(BRIDGE_SRC));
  const cqPaths = (BRIDGE_SRC.match(/fieldValue\(/g) || []).length;
  T('স্টেম/উপ-প্রশ্ন/অপশনে fieldValue ব্যবহৃত (≥৩)', cqPaths >= 3, cqPaths);
  T('স্টিমুলাস-মানেও মার্কার-সংরক্ষণ', /multiLine\(preserveFigMarkers\(textWithoutFigures\(stimEl\)/.test(BRIDGE_SRC));
  T('আগের লিক-পথ (সরাসরি innerText মান) আর নেই',
    !/local\[SP \+ '\.text'\] = oneLine\(tEl\.innerText/.test(BRIDGE_SRC) && !/local\[OP \+ '\.text'\] = oneLine\(tEl\.innerText/.test(BRIDGE_SRC));
}

// ───────────────────────── ৫) কন্ট্রোলার — গার্ড/এস্কেপ/স্টোর সোর্স-গেট ─────────────────────────
console.log('\n— (৫) কন্ট্রোলার সোর্স-গেট —');
{
  T('ভ্যালিড-টার্গেট রেজলভার (P0-4)', /function resolveInsertTarget\(\)/.test(CTRL));
  T('গাইডেন্স-বার্তা: একটাই ধ্রুবক NO_CARET_MSG (কার্সর-বার্তা), ≥৩ জায়গায় ব্যবহৃত',
    CTRL.includes('NO_CARET_MSG') && CTRL.includes('কার্সর রাখুন') && (CTRL.match(/NO_CARET_MSG/g) || []).length >= 3,
    (CTRL.match(/NO_CARET_MSG/g) || []).length);
  T('ডায়াগ্রাম/আপলোড → insertFigureFromElement', (CTRL.match(/insertFigureFromElement\(/g) || []).length >= 3);
  T('applyFiguresToPreview: রেন্ডার-হুক + ডিফাইন', /if \(typeof applyFiguresToPreview === 'function'\) applyFiguresToPreview\(\);/.test(CTRL) && /function applyFiguresToPreview\(\)/.test(CTRL));
  T('__figures পিন (parsedData.__figures)', /currentParsedData\.__figures = studioState\.figures/.test(CTRL));
  T('AutoSave-এ figures + কোটা-গার্ড', /figures: studioState\.figures \|\| \{\}/.test(CTRL) && /catch \(quotaErr\)/.test(CTRL));
  T('History-তে figures snapshot/restore', /figures: JSON\.parse\(JSON\.stringify\(studioState\.figures \|\| \{\}\)\)/.test(CTRL) && /studioState\.figures = state\.figures/.test(CTRL));
  T('downloadDocument-এ ফিগার-ইনজেকশন (২ ফরম্যাট) + সৎ স্ট্যাটস-রিপোর্ট',
    /injectIntoDocx\(blob, figStore, \{ stats: _figStats \}\)/.test(CTRL) &&
    /injectIntoRtf\(blob, figStore, \{ stats: _figStats \}\)/.test(CTRL) &&
    /_missed > 0/.test(CTRL));

  // ── Part-14.0 (P0-4) কঠোর-গার্ডের সোর্স-গেট ──
  T('P0-4: স্টেল টেক্সটবক্স-ক্যারেট আর বৈধ টার্গেট নয়',
    !CTRL.includes("return { kind: 'textarea', at: _lastCaretTarget.at"));
  T('P0-4: স্টেল lastSavedRange ফলব্যাক সরানো হয়েছে',
    !/return \{ kind: 'preview', range: lastSavedRange/.test(CTRL));
  T('P0-4: রিবন/মডালে ফোকাস-রক্ষা (mousedown-preventDefault)',
    /_FOCUS_KEEP_SEL/.test(CTRL) && /addEventListener\('mousedown'[\s\S]{0,260}preventDefault\(\)/.test(CTRL));
  T('P0-4: সিম্বল বোতাম সত্যি-ইনসার্টেই কেবল সফল-টোস্ট',
    /const ok = insertContentAtCaret\(/.test(CTRL) && /else showToast\(NO_CARET_MSG, 'warning'\)/.test(CTRL));
  T('P0-3: প্রিভিউ-ফিল্ডে টেক্সট এখন সোর্সে বসে (fieldSourceIndex পথ)',
    /if \(!isHtml && t\.kind === 'preview' && t\.fieldEl\)/.test(CTRL));
  T('Esc → closeStudioModals', /document\.addEventListener\('keydown'[\s\S]{0,120}Escape[\s\S]{0,80}closeStudioModals\(\)/.test(CTRL));
  T('ব্যাকড্রপ-ক্লিক → closeStudioModals', /m\.addEventListener\('click', \(e\) => \{ if \(e\.target === m\) closeStudioModals\(\); \}\)/.test(CTRL));
  T('টুলবার ডেলিগেটেড (clone-চক্র বন্ধ)', /_figDelegated/.test(CTRL) && !/const newBtn = btn\.cloneNode\(true\);/.test(CTRL));
  T('ডিলিট → স্টোর + সোর্স দুই জায়গা থেকেই মোছে', /act === 'delete'[\s\S]{0,220}delete studioState\.figures\[id\][\s\S]{0,120}removeMarkerFromSource\(id\)/.test(CTRL));
  T('studio.html: দুইটি মিসিং বোতাম-আইডি যোগ', /id="btn-quick-insert-math"/.test(HTML) && /id="btn-quick-insert-diagram"/.test(HTML));
  T('studio.html: ফিগার-পাইপলাইন স্ক্রিপ্ট ঢুকেছে (কন্ট্রোলারের আগে)',
    HTML.indexOf('studio-figure-pipeline.js') > 0 && HTML.indexOf('studio-figure-pipeline.js') < HTML.indexOf('js/studio-controller.js'));
}

// ───────────────────────── ৬) ব্রাউজার E2E ─────────────────────────
let chromium = null;
for (const from of [path.join(ROOT, 'package.json'), path.join(os.homedir(), 'qa', 'package.json')]) {
  try { chromium = createRequire(from)('playwright').chromium; break; } catch (e) {}
}
if (!chromium) {
  console.log('SKIP: playwright নেই — E2E এড়ানো হলো (ভুয়া পাস নয়)');
} else {
  console.log('\n— (৬) ব্রাউজার E2E: ইনসার্ট → typing → এক্সপোর্ট → reload —');
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
  const server = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const fp = path.join(ROOT, u === '/' ? 'studio.html' : u);
    if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { r.writeHead(404); return r.end('nf'); }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(r);
  });
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  const BASE = `http://127.0.0.1:${server.address().port}`;
  let browser = null;
  try {
    browser = await chromium.launch();
  } catch (e) {
    console.log('SKIP: chromium চালু হলো না — E2E এড়ানো হলো (ভুয়া পাস নয়): ' + String(e).slice(0, 140));
  }
  if (browser) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    window.__blobs = [];
    const o = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (x) => { try { window.__blobs.push(x); } catch (e) {} return o(x); };
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.route('**', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
  await page.goto(`${BASE}/studio.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FayzarPipeline && window.StudioFigurePipeline && window.StudioEditBridge, { timeout: 45000 });
  await page.evaluate(() => localStorage.clear());

  const doc = '১. নিচের চিত্রটি দেখে উত্তর দাও:\nক. সূত্র লেখো। ২\nখ. হিসাব করো। ৪\n';
  const grab = async (menuId, kind) => {
    await page.evaluate(() => { window.__blobs.length = 0; });
    await page.evaluate((id) => document.getElementById(id).click(), menuId);
    await page.waitForFunction(() => window.__blobs.length > 0, { timeout: 40000 }).catch(() => {});
    return await page.evaluate(async (k) => {
      if (!window.__blobs.length) return null;
      if (k === 'text') return await window.__blobs[0].text();
      const ab = await window.__blobs[0].arrayBuffer(); const u8 = new Uint8Array(ab);
      let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    }, kind);
  };

  await page.selectOption('#mode-select', 'EXAM_CQ');
  await page.waitForTimeout(700);
  await page.fill('#input-text', doc);
  await page.waitForTimeout(1600);
  T('E2E: প্রিভিউতে CQ প্রশ্ন এসেছে', await page.evaluate(() => document.querySelectorAll('#preview-container .cq-q-item').length) === 1);

  // ── ইনসার্ট (প্রিভিউ-কারেট থেকে)
  await page.click('#preview-container .cq-text');
  await page.waitForTimeout(250);
  await page.click('.word-tab-btn[data-tab="tab-insert"]');
  await page.waitForTimeout(200);
  await page.click('#btn-ribbon-insert-diagram');
  await page.waitForTimeout(300);
  await page.click('.diagram-preset-card[data-diagram="right-triangle"]');
  await page.waitForTimeout(900);
  const ins = await page.evaluate(() => {
    const ta = document.getElementById('input-text').value;
    const pc = document.getElementById('preview-container');
    return {
      markerInSource: /QZFIG\d+QZ/.test(ta),
      wrappers: pc.querySelectorAll('.studio-figure-wrapper').length,
      imgPng: /^data:image\/png/.test((pc.querySelector('.studio-figure-wrapper img') || {}).src || ''),
      markerVisible: /QZFIG\d+QZ/.test(pc.innerText),
      storeCount: Object.keys((window.StudioFigurePipeline && window.StudioFigurePipeline.collectStore(null, null)) || {}).length,
      modalClosed: document.getElementById('modal-diagrams').classList.contains('hidden')
    };
  });
  T('ইনসার্ট: সোর্সে মার্কার বসেছে', ins.markerInSource);
  T('ইনসার্ট: প্রিভিউতে চিত্র-র্যাপার + PNG data-URL', ins.wrappers === 1 && ins.imgPng, ins);
  T('ইনসার্ট: প্রিভিউতে মার্কার-টেক্সট আর দেখা যায় না', !ins.markerVisible);
  T('ইনসার্ট: মডাল বন্ধ হয়েছে', ins.modalClosed);

  // ── P0-3: টাইপ করলে চিত্র টেকে
  await page.click('#input-text');
  await page.keyboard.type('XYZ ');
  await page.waitForTimeout(1400);
  const afterTyping = await page.evaluate(() => ({
    wrappers: document.querySelectorAll('#preview-container .studio-figure-wrapper').length,
    markerInSource: /QZFIG\d+QZ/.test(document.getElementById('input-text').value),
    xyzInPreview: document.getElementById('preview-container').innerText.includes('XYZ')
  }));
  T('P0-3: টাইপ করার পরেও চিত্র অটুট (re-render-নিরাপদ)', afterTyping.wrappers === 1 && afterTyping.markerInSource, afterTyping);
  T('P0-3: নতুন টাইপ করা লেখাও প্রিভিউতে এসেছে', afterTyping.xyzInPreview);

  // ── টুলবার: রিসাইজ + ডিলিট (পরে আবার ইনসার্ট করে যাচাই)
  const resized = await page.evaluate(() => {
    const wrap = document.querySelector('#preview-container .studio-figure-wrapper');
    const img = wrap.querySelector('img');
    const btn = wrap.querySelector('.figure-toolbar button[data-fig-act="sz-lg"]');
    btn.click();
    return img.style.width;
  });
  T('টুলবার: রিসাইজ কার্যকর (260px) + স্টোরে লেখা', resized === '260px', resized);

  // ── এক্সপোর্ট: .doc (RTF \pict) + .docx (media + drawing)
  const rtf = await grab('menu-export-doc-unicode', 'text');
  const rtfHasPict = /\\pict\\pngblip/.test(rtf || '');
  const rtfNoMarker = !/QZFIG\d+QZ/.test(rtf || '');
  const rtfNoLeak = !/\bB C A\b/.test((rtf || '').replace(/\\'[0-9a-f]{2}/gi, ''));
  T('.doc: RTF-এ \\pict\\pngblip চিত্র ঢুকেছে', rtfHasPict);
  T('.doc: কোনো মার্কার অবশিষ্ট নেই', rtfNoMarker);
  T('.doc: SVG-লেবেল (A/B/C) প্রশ্নের টেক্সটে লিক করেনি', rtfNoLeak);

  const b64 = await grab('menu-export-docx-unicode', 'b64');
  {
    const zip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
    const names = Object.keys(zip.files);
    const xml = await zip.file('word/document.xml').async('string');
    const plain = xml.replace(/<[^>]+>/g, '');
    T('.docx: word/media/figure1.png আছে', names.includes('word/media/figure1.png'));
    T('.docx: <w:drawing> + r:embed পেয়ার', /<w:drawing>/.test(xml) && /<a:blip r:embed="rIdFig1"\/>/.test(xml));
    T('.docx: কোনো মার্কার নেই', !/QZFIG\d+QZ/.test(xml));
    T('.docx: প্রশ্নের লেখা অটুট', plain.includes('নিচের চিত্রটি দেখে উত্তর দাও'));
    T('.docx: লেবেল-লিক নেই (B C A নয়)', !/\bB C A\b/.test(plain));
  }

  // ── দুই ফরম্যাট × দুই ফন্ট-মোড: legacy (Bijoy) পথেও চিত্র যায় ──
  {
    const rtfB = await grab('menu-export-doc-bijoy', 'text');
    T('.doc (Bijoy legacy): RTF pict চিত্র ঢুকেছে', /\\pict\\pngblip/.test(rtfB || ''), (rtfB || '').length);
    T('.doc (Bijoy legacy): কোনো মার্কার অবশিষ্ট নেই', !/QZFIG\d+QZ/.test(rtfB || ''));
    const b64B = await grab('menu-export-docx-bijoy', 'b64');
    const zipB = await JSZip.loadAsync(Buffer.from(b64B, 'base64'));
    const xmlB = await zipB.file('word/document.xml').async('string');
    T('.docx (Bijoy legacy): media + <w:drawing>',
      Object.keys(zipB.files).includes('word/media/figure1.png') && /<w:drawing>/.test(xmlB));
    T('.docx (Bijoy legacy): কোনো মার্কার অবশিষ্ট নেই', !/QZFIG\d+QZ/.test(xmlB));
  }

  // ── P0-4: কার্সর ছাড়া ইনসার্ট → কিছুই বসে না + গাইডেন্স টোস্ট
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FayzarPipeline && window.StudioFigurePipeline, { timeout: 45000 });
  await page.evaluate(() => localStorage.clear());
  await page.selectOption('#mode-select', 'EXAM_CQ');
  await page.waitForTimeout(600);
  await page.fill('#input-text', doc);
  await page.waitForTimeout(1500);
  const beforeVal = await page.evaluate(() => document.getElementById('input-text').value);
  await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
  await page.click('.word-tab-btn[data-tab="tab-insert"]');
  await page.waitForTimeout(200);
  await page.click('#btn-ribbon-insert-math');
  await page.waitForTimeout(300);
  await page.click('.math-tab-btn[data-math-cat="sets"]');
  await page.waitForTimeout(150);
  await page.click('#math-grid-container .math-symbol-btn >> nth=0');
  await page.waitForTimeout(400);
  const guard = await page.evaluate((b) => {
    const toast = document.getElementById('studio-toast');
    return {
      valueUnchanged: document.getElementById('input-text').value === b,
      toastVisible: !!toast && !toast.classList.contains('hidden') && toast.offsetParent !== null,
      toastText: (document.getElementById('toast-msg') || {}).textContent || '',
      falseSuccess: /ইনসার্ট হয়েছে/.test((document.getElementById('toast-msg') || {}).textContent || '')
    };
  }, beforeVal);
  T('P0-4: কার্সর ছাড়া কিছুই ইনসার্ট হয়নি', guard.valueUnchanged);
  T('P0-4: মিথ্যা "ইনসার্ট হয়েছে" টোস্ট নেই', !guard.falseSuccess, guard.toastText);
  T('P0-4: সঠিক গাইডেন্স-বার্তা দেখানো হয়েছে', /কার্সর/.test(guard.toastText), guard.toastText);

  // ── P1: Esc/ব্যাকড্রপ + কুইক-বোতাম
  await page.waitForTimeout(300);
  const modalOpenAfterEsc = await page.evaluate(async () => {
    const m = document.getElementById('modal-math-symbols');
    const wasOpen = !m.classList.contains('hidden');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise((r) => setTimeout(r, 120));
    return { wasOpen, closed: m.classList.contains('hidden') };
  });
  T('P1: Esc-এ মডাল বন্ধ হয়', modalOpenAfterEsc.wasOpen && modalOpenAfterEsc.closed, modalOpenAfterEsc);

  const backdrop = await page.evaluate(async () => {
    document.getElementById('btn-quick-insert-math').click();
    await new Promise((r) => setTimeout(r, 150));
    const m = document.getElementById('modal-math-symbols');
    const opened = !m.classList.contains('hidden');
    m.dispatchEvent(new MouseEvent('click', { bubbles: true }));   // ব্যাকড্রপেই ক্লিক (target === m)
    await new Promise((r) => setTimeout(r, 120));
    return { opened, closed: m.classList.contains('hidden') };
  });
  T('P1: ব্যাকড্রপ-ক্লিকে মডাল বন্ধ', backdrop.opened && backdrop.closed, backdrop);
  const quickBtns = await page.evaluate(() => ({
    math: !!document.getElementById('btn-quick-insert-math'),
    diagram: !!document.getElementById('btn-quick-insert-diagram')
  }));
  T('P1: দুইটি কুইক-বোতাম DOM-এ আছে (মৃত রেফারেন্স নেই)', quickBtns.math && quickBtns.diagram, quickBtns);
  const quickOpens = await page.evaluate(async () => {
    document.getElementById('btn-quick-insert-diagram').click();
    await new Promise((r) => setTimeout(r, 150));
    const opened = !document.getElementById('modal-diagrams').classList.contains('hidden');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return opened;
  });
  T('P1: কুইক-ডায়াগ্রাম-বোতাম মডাল খোলে', quickOpens);

  // ── P0-3 (reload): সেভ বোতামের মাধ্যমে সেশন সেভ → reload → চিত্র ফেরে
  {
    await page.evaluate(() => { window.__blobs.length = 0; });
    await page.click('#preview-container .cq-text');
    await page.waitForTimeout(200);
    await page.click('.word-tab-btn[data-tab="tab-insert"]');
    await page.waitForTimeout(150);
    await page.click('#btn-ribbon-insert-diagram');
    await page.waitForTimeout(250);
    await page.click('.diagram-preset-card[data-diagram="circle-radius"]');
    await page.waitForTimeout(800);
    const beforeReload = await page.evaluate(() => ({
      wrappers: document.querySelectorAll('#preview-container .studio-figure-wrapper').length,
      marker: /QZFIG\d+QZ/.test(document.getElementById('input-text').value)
    }));
    // AutoSave.save() — সেশন সেভ (quick-access save = ডাউনলোড, তাই সরাসরি localStorage-চেক)
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('fayzar_studio_session_v3') || 'null');
      return raw ? Object.keys(raw) : null;
    });
    await page.waitForTimeout(31000);   // AutoSave টাইমার (৩০s) — সেশন নিজে লেখে
    const saved = await page.evaluate(() => {
      const raw = localStorage.getItem('fayzar_studio_session_v3');
      const s = raw ? JSON.parse(raw) : null;
      return { hasFigures: !!(s && s.figures && Object.keys(s.figures).length), bytes: raw ? raw.length : 0 };
    });
    T('P0-3: AutoSave সেশনে ফিগার-স্টোর সংরক্ষিত', saved.hasFigures, saved);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.FayzarPipeline && window.StudioFigurePipeline, { timeout: 45000 });
    await page.waitForTimeout(2200);
    const afterReload = await page.evaluate(() => ({
      wrappers: document.querySelectorAll('#preview-container .studio-figure-wrapper').length,
      marker: /QZFIG\d+QZ/.test(document.getElementById('input-text').value)
    }));
    T('P0-3: reload-এর পরেও চিত্র ফিরে এসেছে', beforeReload.wrappers === 1 && afterReload.wrappers === 1, { beforeReload, afterReload });
  }

  T('ব্রাউজার-এরর শূন্য', errs.length === 0, errs.slice(0, 3));
  await browser.close();
  }
  server.close();
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
