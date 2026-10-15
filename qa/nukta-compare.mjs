// QA: produce() — composeNukta চালু বনাম বন্ধ; document.xml লেখা (নুক্তা-সমরূপ করে) মিলছে কি না
import fs from 'node:fs';
import puppeteer from 'puppeteer';

const FILES = fs.readdirSync('qa/samples').filter((f) => f.endsWith('.md')).map((f) => 'qa/samples/' + f)
  .concat(['cq-short', 'mcq-mixed-options', 'combined', 'math-equations'].map((n) => `tests/fixtures/${n}.input.md`));
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 600000 });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  for (const f of FILES) {
    const text = fs.readFileSync(f, 'utf8');
    const r = await page.evaluate(async (text) => {
      const X = window.FayzarExport, orig = X.composeNukta;
      const C = (s) => orig.call(X, s);
      const get = async () => {
        const res = await X.produce(text, { format: 'docx-unicode' });
        const z = await window.JSZip.loadAsync(await res.blob.arrayBuffer());
        const xml = await z.file('word/document.xml').async('string');
        return C(xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
      };
      const on = await get();
      X.composeNukta = (s) => String(s == null ? '' : s);
      let off;
      try { off = await get(); } finally { X.composeNukta = orig; }
      if (on === off) return 'same';
      let i = 0; while (on[i] === off[i]) i++;
      return 'DIFF @' + i + '\n  on : ' + on.slice(Math.max(0, i - 60), i + 80) + '\n  off: ' + off.slice(Math.max(0, i - 60), i + 80);
    }, text);
    console.log(f, r);
  }
} finally { await browser.close(); }
