import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const TEST_DIR = 'C:\\Users\\Admin\\Downloads\\TEST FILE';
const labels = JSON.parse(fs.readFileSync('qa/auto-prep-labels.json', 'utf8'));
const files = fs.readdirSync(TEST_DIR)
  .filter((f) => /\.(jpe?g|png)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.goto('file:///' + path.resolve('index.html').replace(/\\/g, '/'));

let rotPass = 0, splitPass = 0, rotTotal = 0, splitTotal = 0;

for (const f of files) {
  rotTotal++;
  const buf = fs.readFileSync(path.join(TEST_DIR, f));
  const mime = f.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const b64 = 'data:' + mime + ';base64,' + buf.toString('base64');

  const res = await page.evaluate(async (dataUrl) => {
    const im = new Image();
    await new Promise((r) => { im.onload = r; im.src = dataUrl; });
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(im, 0, 0);
    const idata = ctx.getImageData(0, 0, c.width, c.height);
    const AP = window.FayzarAutoPrep;
    const g = AP.toGray(idata, 800);
    const w = g.width, h = g.height, mask = g.bin, gray = g.gray;

    // 1. Find paper content bounding box (to ignore dark desk borders)
    let pMinX = w, pMaxX = 0, pMinY = h, pMaxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (gray[y * w + x] > 155) {
          if (x < pMinX) pMinX = x;
          if (x > pMaxX) pMaxX = x;
          if (y < pMinY) pMinY = y;
          if (y > pMaxY) pMaxY = y;
        }
      }
    }
    if (pMaxX <= pMinX || pMaxY <= pMinY) {
      pMinX = Math.floor(w * 0.05); pMaxX = Math.floor(w * 0.95);
      pMinY = Math.floor(h * 0.05); pMaxY = Math.floor(h * 0.95);
    }

    // 2. Suppress long continuous lines (table borders, rules)
    const cleanMask = new Uint8Array(w * h);
    cleanMask.set(mask);
    for (let x = 0; x < w; x++) {
      let run = 0;
      for (let y = 0; y < h; y++) {
        if (mask[y * w + x]) run++;
        else {
          if (run >= 45) { for (let yy = y - run; yy < y; yy++) cleanMask[yy * w + x] = 0; }
          run = 0;
        }
      }
      if (run >= 45) { for (let yy = h - run; yy < h; yy++) cleanMask[yy * w + x] = 0; }
    }
    for (let y = 0; y < h; y++) {
      let run = 0;
      for (let x = 0; x < w; x++) {
        if (mask[y * w + x]) run++;
        else {
          if (run >= 55) { for (let xx = x - run; xx < x; xx++) cleanMask[y * w + xx] = 0; }
          run = 0;
        }
      }
      if (run >= 55) { for (let xx = w - run; xx < w; xx++) cleanMask[y * w + xx] = 0; }
    }

    // 3. Compute R and C variance INSIDE paper bounds
    const pw = pMaxX - pMinX + 1, ph = pMaxY - pMinY + 1;
    const y0 = pMinY + Math.floor(ph * 0.1), y1 = pMaxY - Math.floor(ph * 0.1);
    const x0 = pMinX + Math.floor(pw * 0.1), x1 = pMaxX - Math.floor(pw * 0.1);

    const R = new Float64Array(Math.max(1, y1 - y0));
    const C = new Float64Array(Math.max(1, x1 - x0));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (cleanMask[y * w + x]) { R[y - y0]++; C[x - x0]++; }
      }
    }

    let meanR = 0, meanC = 0;
    for (let i = 0; i < R.length; i++) meanR += R[i]; meanR /= R.length;
    for (let i = 0; i < C.length; i++) meanC += C[i]; meanC /= C.length;

    let varR = 0, varC = 0;
    for (let i = 0; i < R.length; i++) varR += (R[i] - meanR) ** 2; varR /= R.length;
    for (let i = 0; i < C.length; i++) varC += (C[i] - meanC) ** 2; varC /= C.length;

    const normVarR = varR / Math.max(1, meanR * meanR);
    const normVarC = varC / Math.max(1, meanC * meanC);
    const ratio = normVarC / Math.max(1e-4, normVarR);

    // 4. Sideways 2-page book check (e.g. T-14):
    // Portrait image with a horizontal gutter dividing top and bottom pages
    let hasHorizSpine = false;
    if (h > w * 1.15) {
      let minRowEdges = Infinity, bestY = -1;
      for (let y = Math.floor(h * 0.42); y <= Math.floor(h * 0.58); y++) {
        let edges = 0;
        for (let x = Math.floor(w * 0.2); x < Math.floor(w * 0.8); x++) if (mask[y * w + x]) edges++;
        if (edges < minRowEdges) { minRowEdges = edges; bestY = y; }
      }
      let topInk = 0, botInk = 0;
      for (let y = Math.floor(h * 0.1); y < bestY - 15; y++) {
        for (let x = Math.floor(w * 0.2); x < Math.floor(w * 0.8); x++) if (mask[y * w + x]) topInk++;
      }
      for (let y = bestY + 15; y < Math.floor(h * 0.9); y++) {
        for (let x = Math.floor(w * 0.2); x < Math.floor(w * 0.8); x++) if (mask[y * w + x]) botInk++;
      }
      // Top and bottom both have complete pages, horizontal crease has near-zero edges
      if (minRowEdges <= 5 && topInk > 2500 && botInk > 2500 && ratio >= 1.4) {
        hasHorizSpine = true;
      }
    }

    let detectedRot = 0;
    if (hasHorizSpine) {
      detectedRot = 270;
    } else if (ratio >= 2.0) {
      // Single-page document with strong vertical text (e.g. T-3)
      detectedRot = 90;
    }

    // 5. Spread detection after rotation
    let rotW = w, rotH = h, rotMask = mask, rotGray = gray;
    if (detectedRot !== 0) {
      const rc = document.createElement('canvas');
      rc.width = (detectedRot === 90 || detectedRot === 270) ? c.height : c.width;
      rc.height = (detectedRot === 90 || detectedRot === 270) ? c.width : c.height;
      const rctx = rc.getContext('2d');
      rctx.fillStyle = '#fff'; rctx.fillRect(0, 0, rc.width, rc.height);
      if (detectedRot === 90) { rctx.translate(rc.width, 0); rctx.rotate(Math.PI / 2); }
      else if (detectedRot === 270) { rctx.translate(0, rc.height); rctx.rotate(-Math.PI / 2); }
      rctx.drawImage(c, 0, 0);
      const rg = AP.toGray(rctx.getImageData(0, 0, rc.width, rc.height), 800);
      rotW = rg.width; rotH = rg.height; rotMask = rg.bin; rotGray = rg.gray;
    }

    let split = false;
    if (rotW / rotH >= 1.15 && rotH / (rotW / 2) >= 1.1) {
      const edgeDensity = new Float64Array(rotW);
      for (let y = Math.floor(rotH * 0.15); y < Math.floor(rotH * 0.85); y++) {
        for (let x = 1; x < rotW - 1; x++) {
          const gx = Math.abs(rotGray[y * rotW + x + 1] - rotGray[y * rotW + x - 1]);
          if (gx > 25) edgeDensity[x]++;
        }
      }
      let minEdges = Infinity, splitX = -1;
      for (let x = Math.floor(rotW * 0.42); x <= Math.floor(rotW * 0.58); x++) {
        let s = 0;
        for (let dx = -2; dx <= 2; dx++) s += edgeDensity[x + dx];
        s /= 5;
        if (s < minEdges) { minEdges = s; splitX = x; }
      }
      let leftEdges = 0, rightEdges = 0;
      for (let x = Math.floor(rotW * 0.15); x < splitX - 15; x++) leftEdges += edgeDensity[x];
      for (let x = splitX + 15; x < Math.floor(rotW * 0.85); x++) rightEdges += edgeDensity[x];

      if (minEdges <= 5 && leftEdges > 2000 && rightEdges > 2000) {
        split = true;
      }
    }

    return { rot: detectedRot, split, ratio: ratio.toFixed(2), hasHorizSpine };
  }, b64);

  const exp = labels[f];
  const rOk = res.rot === exp.rotate;
  if (rOk) rotPass++;
  let sOk = true;
  if (exp.split !== null) {
    splitTotal++;
    sOk = res.split === exp.split;
    if (sOk) splitPass++;
  }
  const st = (rOk && sOk) ? 'PASS' : 'FAIL';
  console.log(`[${st}] ${f.padEnd(14)} rot: got=${res.rot} exp=${exp.rotate} | split: got=${res.split} exp=${exp.split}`);
}

console.log(`\n=== FINAL TEST RESULTS ===`);
console.log(`Rotate match: ${rotPass}/${rotTotal} (${(rotPass / rotTotal * 100).toFixed(1)}%)`);
console.log(`Split match:  ${splitPass}/${splitTotal} (${(splitPass / splitTotal * 100).toFixed(1)}%)`);
await browser.close();
