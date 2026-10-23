// Usage: node qa/usability-score.mjs <docx> <expected.json> [ocr-text.md]
// Prints a JSON scorecard {id, checks, safetyPass, lookPass}. Read-only.
// চেকের কোড একটাই: js/layout-engine/self-check.js (প্রোডাকশনের স্ব-যাচাইও এটা ব্যবহার করে)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import JSZip from 'jszip';

const require = createRequire(import.meta.url);
const SC = require('../js/layout-engine/self-check.js');

const [docxPath, expPath, ocrPath] = process.argv.slice(2);
if (!docxPath || !expPath) {
  console.error('usage: node qa/usability-score.mjs <docx> <expected.json> [ocr-text.md]');
  process.exit(2);
}

const exp = JSON.parse(fs.readFileSync(expPath, 'utf8'));
const id = path.basename(path.dirname(path.resolve(expPath)));
const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
const docXml = await zip.file('word/document.xml').async('string');
const stylesXml = zip.file('word/styles.xml') ? await zip.file('word/styles.xml').async('string') : '';
const src = ocrPath && fs.existsSync(ocrPath) ? fs.readFileSync(ocrPath, 'utf8') : undefined;

const checks = SC.computeChecks(docXml, stylesXml, exp, src);
const safetyPass = ['c1', 'c2', 'c3'].every((k) => checks[k].pass);
const lookPass = ['c5', 'c6', 'c7', 'c8', 'c9'].every((k) => checks[k].pass);
console.log(JSON.stringify({ id, checks, safetyPass, lookPass }));
