// QA: একই সৃজনশীল প্রশ্ন — "শুধু সৃজনশীল" (EXAM_CQ) বনাম "যৌথ" (EXAM_COMBINED)-এর সৃজনশীল অংশ — .doc তৈরি।
// চালানো (localhost:3008 চালু): node qa/cq-vs-combined.mjs <real-ocr.md> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const [src, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const full = fs.readFileSync(src, 'utf8');
const [head, rest] = [full.match(/^---[\s\S]*?\n---\n?/)[0], full.replace(/^---[\s\S]*?\n---\n?/, '')];
const cqOnly = head.replace(/sections:.*$/m, 'sections: cq:7').replace(/doc_type:.*$/m, 'doc_type: EXAM_CQ') + rest.split(/---\s*SECTION_?BREAK:MCQ---/)[0];
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 600000 });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  for (const [name, text, docType] of [['cq-only', cqOnly, 'EXAM_CQ'], ['combined', full, 'EXAM_COMBINED']]) {
    const b64 = await page.evaluate(async (text, docType) => {
      const r = await window.FayzarExport.produce(text, { format: 'doc', docType });
      const a = new Uint8Array(await r.blob.arrayBuffer()); let s = '';
      for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
      return btoa(s);
    }, text, docType);
    fs.writeFileSync(path.join(outDir, name + '.doc'), Buffer.from(b64, 'base64'));
    console.log('wrote', name);
  }
} finally { await browser.close(); }
