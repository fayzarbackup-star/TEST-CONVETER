// QA/ক্যালিব্রেশন: জানা ফন্ট-আকারের লেখা (SutonnyMJ বিজয় / SutonnyOMJ ইউনিকোড / Times) Word-এ বানিয়ে, PDF করে,
// আমাদের মাপার ইঞ্জিনে কালি-উচ্চতা ও লাইন-দূরত্ব মেপে অনুপাত বের করে (FayzarLayoutIR.INK_RATIO ইত্যাদি)।
// চালানো (অ্যাপ-সার্ভার localhost:3008 চালু): node qa/calibrate-ink.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer';

const OUT = path.resolve(process.argv[2] || 'calib');
fs.mkdirSync(OUT, { recursive: true });
const SIZES = [9, 10, 12, 14, 18, 24];
const BN = 'আমাদের ছোট নদী চলে বাঁকে বাঁকে, দুখু মিয়ার বাবা মারা যান।';
const EN = 'Question No-1: Word Meaning (85-100) The cow gives us milk.';
const BN3 = ['উত্তর: নববর্ষের দিন দোকানে হালখাতা হয়।', 'মাঝিরা ঢোল বাজিয়ে নৌকা চালায় নদীর বুকে।', 'যুদ্ধ শেষে দুখু মিয়া কলকাতায় চলে আসেন।'];
const EN3 = ['a) Who is Mita? She is a student of class two.', 'b) How old is she? She is seven years old now.', 'c) Which class is she in? She reads in class two.'];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 600000 });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });
  const files = await page.evaluate(async (SIZES, BN, EN, BN3, EN3) => {
    const items = [];
    const para = (text, fs, extra) => Object.assign({ kind: 'para', type: 'paragraph', text, lines: [text], keepLines: false, fontPt: fs, align: 'l', spaceBeforePt: fs * 1.4, indentPt: 0 }, extra || {});
    SIZES.forEach((s) => items.push(para(BN, s)));
    SIZES.forEach((s) => items.push(para(EN, s)));
    // বহু-লাইন (Word-এর সাধারণ single spacing) — লাইন-দূরত্বের অনুপাত
    [10, 12].forEach((s) => items.push(para(BN3.join(' '), s, { lines: BN3, keepLines: true, lineRule: 'auto' })));
    [10, 12].forEach((s) => items.push(para(EN3.join(' '), s, { lines: EN3, keepLines: true, lineRule: 'auto' })));
    // অক্ষর-শ্রেণি অনুযায়ী (১২pt ও ২০pt): বাংলা — কার নেই / ওপরে-কার / নিচে-কার / দুটোই; ইংরেজি — x-উচ্চতা / বড়হাতের / নিচে-ঝোলা / দুটোই
    const V = ['কখগঘ নমপরবল চজটড', 'কিকী গিনী টিপে লৈ', 'কুকূ দুরু পুবু মৃ', 'কিকু গীতু নিরু পুষি', 'acemnorsuvwxz', 'Class Two Total Marks', 'gypq jumpy pug', 'Question gypsy (85)'];
    const items2 = [];
    [12, 20].forEach((s) => V.forEach((t) => items2.push(para(t, s))));
    const pg = (its) => ({ widthPt: 595.3, heightPt: 841.9, margins: { top: 40, left: 50, right: 30, bottom: 30 }, bands: [{ kind: 'flow', gapBeforePt: 0, cells: [{ x0: 50, x1: 565, items: its }] }] });
    const ir = { pages: [pg(items), pg(items2)] };
    const enc = async (b) => { const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
    const out = {};
    for (const fmt of ['docx-unicode', 'docx-bijoy']) out[fmt] = await enc((await window.FayzarFaithful.produce(ir, fmt)).blob);
    return out;
  }, SIZES, BN, EN, BN3, EN3);
  for (const [k, v] of Object.entries(files)) fs.writeFileSync(path.join(OUT, k + '.docx'), Buffer.from(v, 'base64'));
  for (const k of Object.keys(files)) {
    execFileSync('powershell', ['-File', 'qa/word-to-pdf.ps1', path.join(OUT, k + '.docx'), path.join(OUT, k + '.pdf')], { stdio: 'inherit' });
  }
  // মাপা: ১৫০ DPI-তে পাতা, কালি-লাইন
  const res = {};
  for (const k of Object.keys(files)) {
    const b64 = fs.readFileSync(path.join(OUT, k + '.pdf')).toString('base64');
    res[k] = await page.evaluate(async (b64, DPI) => {
      const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      const doc = await lib.getDocument({ data: u }).promise;
      const all = [];
      for (let pn = 1; pn <= doc.numPages; pn++) {
        const pg = await doc.getPage(pn);
        const vp = pg.getViewport({ scale: DPI / 72 });
        const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        const img = c.getContext('2d').getImageData(0, 0, c.width, c.height);
        const G = window.FayzarPageGeometry;
        const m = G.inkMask(img);
        const comps = G.components(m, null, 4);
        const lines = G.linesOf(comps, m.H);
        const ppt = DPI / 72;
        lines.forEach((l) => all.push({ p: pn, y: +(l.y0 / ppt).toFixed(1), h: +((l.y1 - l.y0 + 1) / ppt).toFixed(2), w: +((l.x1 - l.x0 + 1) / ppt).toFixed(1) }));
      }
      return all;
    }, b64, 150);
  }
  // লাইনগুলো ক্রমে: BN×৬, EN×৬, BN3(১০)×৩, BN3(১২)×৩, EN3(১০)×৩, EN3(১২)×৩
  const report = {};
  for (const [k, lines] of Object.entries(res)) {
    const r = { bn: [], en: [], pitchBn: [], pitchEn: [] };
    if (lines.length < 24) { report[k] = { error: 'lines=' + lines.length, lines }; continue; }
    SIZES.forEach((s, i) => r.bn.push(+(lines[i].h / s).toFixed(3)));
    SIZES.forEach((s, i) => r.en.push(+(lines[6 + i].h / s).toFixed(3)));
    [[12, 10], [15, 12]].forEach(([at, s]) => r.pitchBn.push(+(((lines[at + 2].y - lines[at].y) / 2) / s).toFixed(3)));
    [[18, 10], [21, 12]].forEach(([at, s]) => r.pitchEn.push(+(((lines[at + 2].y - lines[at].y) / 2) / s).toFixed(3)));
    r.multiInkBn = [12, 13, 14].map((i) => +(lines[i].h / 10).toFixed(3));
    r.multiInkEn = [18, 19, 20].map((i) => +(lines[i].h / 10).toFixed(3));
    // শেষের ১৬টি লাইন = অক্ষর-শ্রেণি (১২pt×৮, ২০pt×৮)
    const tail = lines.slice(-16);
    r.classes = ['bnPlain', 'bnUpper', 'bnLower', 'bnBoth', 'enX', 'enCaps', 'enDesc', 'enBoth'].map((nm, j) => [nm, +(tail[j].h / 12).toFixed(3), +(tail[8 + j].h / 20).toFixed(3)]);
    report[k] = r;
  }
  fs.writeFileSync(path.join(OUT, 'calibration.json'), JSON.stringify({ res, report }, null, 1));
  console.log(JSON.stringify(report, null, 1));
} finally { await browser.close(); }
