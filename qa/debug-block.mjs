// QA/নির্ণয়: একটি পাতার নির্দিষ্ট ব্লক-বক্সে মাপার ইঞ্জিন কী দেখে — কাত-কোণ, খণ্ড, লাইন, অংশ।
// চালানো (localhost:3008): node qa/debug-block.mjs <pdf> <page> <capture.json> <block-index,...>
import fs from 'node:fs';
import puppeteer from 'puppeteer';
const [PDF, PN, CAP, IDX] = process.argv.slice(2);
const cap = JSON.parse(fs.readFileSync(CAP, 'utf8'));
const idx = IDX.split(',').map(Number);
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  const r = await page.evaluate(async (b64, name, pn, blocks) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    await window.FayzarAiOcrEngine.handleFiles([new File([u], name, { type: 'application/pdf' })]);
    const item = window.FayzarAiOcrEngine.state.filesQueue[pn - 1];
    const X = window.FayzarFaithful, G = window.FayzarPageGeometry, FX = window.FayzarFigureExtractor;
    let { img, widthPt } = await X.measureImage(item);
    const ang = FX.estimateSkew(img);
    const m = G.inkMask(img), ppt = img.width / widthPt, comps = G.components(m, null, 4);
    return { ang, W: img.width, H: img.height, ppt, out: blocks.map((b) => {
      const me = G.blockMetrics(m, b.box, { pxPerPt: ppt, comps });
      const bx0 = b.box[1] / 1000 * img.width, by0 = b.box[0] / 1000 * img.height, bx1 = b.box[3] / 1000 * img.width, by1 = b.box[2] / 1000 * img.height;
      const near = comps.filter((c) => c.x1 >= bx0 - 20 && c.x0 <= bx1 + 20 && c.y1 >= by0 - 20 && c.y0 <= by1 + 20).map((c) => [c.x0, c.y0, c.x1, c.y1, c.n]);
      return { i: b.i, text: b.text.slice(0, 30), boxPx: [bx0, by0, bx1, by1].map(Math.round), rect: me.rectPt, lines: me.lines, segs: me.lineSegs, near: near.slice(0, 60) };
    }) };
  }, fs.readFileSync(PDF).toString('base64'), 'x.pdf', Number(PN), cap.blocks.filter((b) => idx.includes(b.i)));
  console.log('skew', r.ang, 'W', r.W, 'H', r.H, 'ppt', r.ppt);
  for (const o of r.out) console.log(JSON.stringify(o, (k, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v)));
} finally { await browser.close(); }
