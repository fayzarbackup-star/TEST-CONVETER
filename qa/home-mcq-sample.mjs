// QA/হোম-পাতা: চিত্রসহ গণিত MCQ নমুনা (qa/samples/16-mcq-math-figure.md) → একক রপ্তানি-পথে .doc / .docx
// চালানো (localhost:3008 চালু): node qa/home-mcq-sample.mjs <figure.png> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const [figPath, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const md = fs.readFileSync('qa/samples/16-mcq-math-figure.md', 'utf8');
const fig = 'data:image/png;base64,' + fs.readFileSync(figPath).toString('base64');

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 600000 });
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  const out = await page.evaluate(async (md, fig) => {
    const X = window.FayzarFigureExtractor;
    const { text, ids } = X.replaceTagsWithMarkers(md);
    const figures = { [ids[0]]: { dataUrl: fig, pxW: 600, pxH: 450, cssW: 168, align: 'center', source: 'ocr', page: 1 } };
    const enc = async (b) => { const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
    const r = {};
    for (const fmt of ['doc', 'docx-bijoy']) {
      const res = await window.FayzarExport.produce(text, { format: fmt, docType: 'EXAM_MCQ', figures });
      r[fmt] = { b64: await enc(res.blob), steps: res.steps.join('>') };
    }
    return r;
  }, md, fig);
  for (const [fmt, v] of Object.entries(out)) {
    const name = fmt === 'doc' ? 'mcq-math-Word2003.doc' : 'mcq-math-Bijoy.docx';
    fs.writeFileSync(path.join(outDir, name), Buffer.from(v.b64, 'base64'));
    console.log(name, v.steps);
  }
  if (errs.length) console.log('page errors:', errs.join(' | '));
} finally { await browser.close(); }
