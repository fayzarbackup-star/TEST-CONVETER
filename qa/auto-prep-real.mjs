// qa/auto-prep-real.mjs — আসল ছবিতে স্বয়ংক্রিয় পাতা-প্রস্তুতি যাচাই ও লেবেল মিল
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const TEST_DIR = 'C:\\Users\\Admin\\Downloads\\TEST FILE';
const OUT_DIR = path.resolve('scratch/agent-out/autoprep');
fs.mkdirSync(OUT_DIR, { recursive: true });

const labelsPath = path.resolve('qa/auto-prep-labels.json');
const labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));

const csvPath = path.join(OUT_DIR, 'summary.csv');
const csvRows = ['নাম,rotate,exp_rot,split,exp_split,inkPreservedPct,crop,সময়ms,status'];

const files = fs.readdirSync(TEST_DIR)
  .filter((f) => /\.(jpe?g|png)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

console.log(`আসল ছবি সংখ্যা: ${files.length} (${TEST_DIR})\n`);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--allow-file-access-from-files']
});

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  await page.goto(pathToFileURL(path.resolve('index.html')).href, { waitUntil: 'load' });

  let rotPass = 0, rotTotal = 0;
  let splitPass = 0, splitTotal = 0;
  let textCutCount = 0;
  let totalTimeMs = 0;

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const fullPath = path.join(TEST_DIR, file);
    const buf = fs.readFileSync(fullPath);
    const mime = /\.png$/i.test(file) ? 'image/png' : 'image/jpeg';
    const b64 = `data:${mime};base64,` + buf.toString('base64');
    const exp = labels[file] || { rotate: 0, split: false };

    const result = await page.evaluate(async (dataUrl, name) => {
      const AP = window.FayzarAutoPrep;
      if (!AP || !AP.autoPrep) throw new Error('FayzarAutoPrep লোড হয়নি');

      const t0 = performance.now();
      const inItem = { name: name, base64: dataUrl, isPdf: false };
      const outItems = await AP.autoPrep(inItem);
      const elapsed = Math.round(performance.now() - t0);

      const meta = (outItems[0] && outItems[0].autoPrepMeta) || {
        rotate: 0,
        split: outItems.length > 1,
        skew: 0,
        crop: 'none',
        timeMs: elapsed
      };

      const loadImg = (src) => new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
      });

      const origImg = await loadImg(dataUrl);
      const outImgs = await Promise.all(outItems.map((it) => loadImg(it.base64)));

      // কালির পরিমাপ ও কালি রক্ষা যাচাই
      const origC = document.createElement('canvas');
      origC.width = origImg.naturalWidth; origC.height = origImg.naturalHeight;
      const origCtx = origC.getContext('2d');
      origCtx.drawImage(origImg, 0, 0);
      const origG = AP.toGray(origCtx.getImageData(0, 0, origC.width, origC.height), 800);
      let origInk = 0;
      for (let i = 0; i < origG.bin.length; i++) origInk += origG.bin[i];

      let outInkTotal = 0;
      for (const oImg of outImgs) {
        const oC = document.createElement('canvas');
        oC.width = oImg.naturalWidth; oC.height = oImg.naturalHeight;
        const oCtx = oC.getContext('2d');
        oCtx.drawImage(oImg, 0, 0);
        const oG = AP.toGray(oCtx.getImageData(0, 0, oC.width, oC.height), 800);
        for (let i = 0; i < oG.bin.length; i++) outInkTotal += oG.bin[i];
      }

      const inkRatio = origInk > 0 ? (outInkTotal / origInk) : 1;
      const inkPct = Math.min(100, Number((inkRatio * 100).toFixed(2)));

      // পাশাপাশি (Side-by-Side) তুলনামূলক ক্যানভাস
      const targetH = 600;
      const origScale = targetH / origImg.naturalHeight;
      const origW = Math.round(origImg.naturalWidth * origScale);

      let totalOutW = 0;
      const outScales = outImgs.map((im) => {
        const sc = targetH / im.naturalHeight;
        const w = Math.round(im.naturalWidth * sc);
        totalOutW += w;
        return { img: im, w: w, sc: sc };
      });

      const pad = 16;
      const labelH = 32;
      const totalCanvasW = origW + totalOutW + pad * 3;
      const totalCanvasH = targetH + labelH + pad * 2;

      const c = document.createElement('canvas');
      c.width = totalCanvasW; c.height = totalCanvasH;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, totalCanvasW, totalCanvasH);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`আগে: ${name} (${origImg.naturalWidth}×${origImg.naturalHeight})`, pad, pad + 16);
      ctx.drawImage(origImg, pad, pad + labelH, origW, targetH);

      let curX = pad + origW + pad;
      const metaLabel = `পরে: rot=${meta.rotate}° split=${meta.split || outItems.length > 1} crop=${meta.crop} ink=${inkPct}% [${elapsed}ms]`;
      ctx.fillText(metaLabel, curX, pad + 16);

      outScales.forEach(({ img, w }) => {
        ctx.drawImage(img, curX, pad + labelH, w, targetH);
        curX += w + 8;
      });

      return {
        meta: meta,
        elapsed: elapsed,
        splitCount: outItems.length,
        inkPct: inkPct,
        sideBySideB64: c.toDataURL('image/png').split(',')[1]
      };
    }, b64, file);

    const isSplit = result.meta.split || result.splitCount > 1;
    const rotOk = result.meta.rotate === exp.rotate;
    rotTotal++;
    if (rotOk) rotPass++;

    let splitOk = true;
    if (exp.split !== null) {
      splitTotal++;
      splitOk = isSplit === exp.split;
      if (splitOk) splitPass++;
    }

    const isTextCut = result.inkPct < 99.5;
    if (isTextCut) textCutCount++;

    const status = (rotOk && splitOk && !isTextCut) ? 'PASS' : 'FAIL';
    totalTimeMs += result.elapsed;

    // সেভ PNG
    const baseName = file.replace(/\.[^.]+$/, '');
    fs.writeFileSync(path.join(OUT_DIR, `${baseName}.png`), Buffer.from(result.sideBySideB64, 'base64'));

    // CSV রো
    csvRows.push(`"${file}",${result.meta.rotate},${exp.rotate},${isSplit},${exp.split},${result.inkPct},"${result.meta.crop}",${result.elapsed},"${status}"`);

    console.log(`[${status}] ${file.padEnd(14)} rot=${result.meta.rotate}° (exp ${exp.rotate}°) | split=${isSplit} (exp ${exp.split}) | ink=${result.inkPct}% | crop=${result.meta.crop} | ${result.elapsed}ms`);
  }

  fs.writeFileSync(csvPath, csvRows.join('\n') + '\n', 'utf8');

  const avgTime = Math.round(totalTimeMs / files.length);

  console.log('\n=== আসল ছবি যাচাই সারাংশ ===');
  console.log(`মোট ছবি: ${files.length}`);
  console.log(`ঘোরানো মিল (Rotate): ${rotPass}/${rotTotal} (${(rotPass / rotTotal * 100).toFixed(1)}%)`);
  console.log(`ভাগ মিল (Split):      ${splitPass}/${splitTotal} (${(splitPass / splitTotal * 100).toFixed(1)}%)`);
  console.log(`লেখা কাটা (Text cut): ${textCutCount} (লক্ষ্য: ০)`);
  console.log(`গড় সময় প্রতি ছবি:  ${avgTime}ms`);
  console.log(`ফলাফল CSV: ${csvPath}`);
} finally {
  await browser.close();
}
