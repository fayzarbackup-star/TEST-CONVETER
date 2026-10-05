'use strict';

// Part-17.5/17.6 gates — হুবহু-লেআউট: পাতা-মাপা (FayzarPageGeometry), নকশা (FayzarLayoutIR), মাস্টার .docx (FayzarFaithfulDocx)।
// কৃত্রিম কালি-পাতা (আয়তক্ষেত্র = মুদ্রিত লাইন) — প্রত্যাশিত মান হাতে হিসাবযোগ্য। চালানো: node tests/part-17.5-faithful-layout.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const G = require(path.join(ROOT, 'js/layout-engine/faithful/page-geometry.js'));
const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const D = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));

let gates = 0;
const check = (cond, msg) => { assert.ok(cond, msg); gates++; };

/** সাদা পাতা W×H, কালো আয়তক্ষেত্র [x0,y0,x1,y1] (সীমাসহ) */
function page(W, H, rects) {
  const data = new Uint8ClampedArray(W * H * 4).fill(255);
  for (const [x0, y0, x1, y1] of rects) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = (y * W + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0; }
  return { width: W, height: H, data };
}
const box = (W, H, x0, y0, x1, y1) => [y0 / H * 1000, x0 / W * 1000, y1 / H * 1000, x1 / W * 1000];

(async () => {
  // ---- ১) পাতা-মাপা ----
  const W = 600, H = 800;
  // অনুচ্ছেদ: ৩ লাইন, কালি ১০px, দূরত্ব ২০px; শেষ লাইন ছোট ⇒ দুপাশে সমান
  const just = page(W, H, [[100, 100, 400, 109], [100, 120, 400, 129], [100, 140, 250, 149]]);
  const mj = G.inkMask(just);
  check(mj.mask.reduce((a, v) => a + v, 0) === 301 * 10 * 2 + 151 * 10, 'inkMask: ঠিক কালো পিক্সেল-সংখ্যা');
  const cj = G.components(mj, null, 4);
  check(cj.length === 3, 'components: ৩টি আলাদা লাইন-খণ্ড');
  const bj = G.blockMetrics(mj, box(W, H, 90, 90, 420, 160), { pxPerPt: 1, comps: cj });
  check(bj.lines.length === 3, 'blockMetrics: ৩ লাইন');
  check(bj.pitchPt === 20 && bj.lineInkPt === 10, 'blockMetrics: লাইন-দূরত্ব ২০, কালি ১০');
  check(bj.fontPt === 17.5, 'estimateFontPt: ২০/১.১৫ ≈ ১৭.৫pt (ক্যালিব্রেটেড single spacing)');
  check(bj.align === 'j' && bj.firstIndentPt === 0, 'দুপাশে-সমান, ইনডেন্ট নেই');
  check(Math.abs(bj.rectPt.x - 100) < 0.01 && Math.abs(bj.rectPt.w - 301) < 0.01, 'rectPt = আসল কালির সীমা (Gemini-বক্স নয়)');
  check(bj.ragged === false, 'পূর্ণ লাইন ⇒ ragged নয়');

  // ঝুলন্ত ইনডেন্ট ("খ. …" প্রথম লাইন বাঁয়ে) — আগে ভুল করে "ডানে" হতো
  const hang = page(W, H, [[100, 100, 400, 109], [130, 120, 400, 129], [130, 140, 400, 149]]);
  const mh = G.inkMask(hang);
  const bh = G.blockMetrics(mh, box(W, H, 90, 90, 420, 160), { pxPerPt: 1 });
  check(bh.firstIndentPt === -30, 'ঝুলন্ত ইনডেন্ট −৩০pt');
  check(bh.align !== 'r', 'ঝুলন্ত ইনডেন্ট "ডানে" ধরা হয় না');

  // প্রথম-লাইন ইনডেন্ট
  const ind = page(W, H, [[124, 100, 400, 109], [100, 120, 400, 129], [100, 140, 400, 149]]);
  const bi = G.blockMetrics(G.inkMask(ind), box(W, H, 90, 90, 420, 160), { pxPerPt: 1 });
  check(bi.firstIndentPt === 24, 'প্রথম-লাইন ইনডেন্ট +২৪pt');

  // মাঝখানে বসানো (দুই পাশে সমান ফাঁক, লাইন ভিন্ন দৈর্ঘ্যের)
  const cen = page(W, H, [[200, 100, 400, 109], [250, 120, 350, 129], [220, 140, 380, 149]]);
  const bc = G.blockMetrics(G.inkMask(cen), box(W, H, 100, 90, 500, 160), { pxPerPt: 1 });
  check(bc.align === 'c', 'মাঝে-বসানো লেখা = c');

  // ছোট-বড় লাইন (ঠিকানা/কবিতা) ⇒ ragged
  const rag = page(W, H, [[100, 100, 400, 109], [100, 120, 220, 129], [100, 140, 200, 149], [100, 160, 180, 169]]);
  check(G.blockMetrics(G.inkMask(rag), box(W, H, 90, 90, 420, 180), { pxPerPt: 1 }).ragged === true, 'অসমান লাইন ⇒ ragged');

  // বাংলা মাত্রা/নিচের কারের ছোট টুকরো ⇒ আলাদা লাইন নয়
  const kar = page(W, H, [[100, 100, 400, 111], [150, 113, 160, 115], [100, 130, 400, 141]]);
  check(G.linesOf(G.components(G.inkMask(kar), null, 4), H).length === 2, 'linesOf: কারের টুকরো লাইনের সাথে জোড়া');

  // ফাঁকা বক্স ⇒ Gemini-র মাপ
  const be = G.blockMetrics(mj, box(W, H, 450, 500, 550, 600), { pxPerPt: 1 });
  check(be.empty && be.lines.length === 0 && be.rectPt === be.geminiPt, 'কালি নেই ⇒ empty, Gemini-বক্স রাখা');

  // pxPerPt রূপান্তর
  const b2 = G.blockMetrics(mj, box(W, H, 90, 90, 420, 160), { pxPerPt: 2 });
  check(b2.pitchPt === 10 && b2.rectPt.x === 50, 'pxPerPt=২ ⇒ pt অর্ধেক');

  const pm = G.pageMargins(mj, { pxPerPt: 1 });
  check(pm.top === 100 && pm.left === 100 && pm.right === W - 1 - 400 && pm.bottom === H - 1 - 149, 'pageMargins = কালির সীমা');
  check(G.pageMargins(G.inkMask(page(50, 50, [])), {}).top === 54, 'ফাঁকা পাতা ⇒ ডিফল্ট মার্জিন');
  check(G.estimateFontPt(12, 0) === 12 && G.estimateFontPt(500, 0) === 48 && G.estimateFontPt(1, 0) === 6, 'এক-লাইন ফন্ট ও সীমা ৬–৪৮');

  // ---- Part-17.7: পাতার ফ্রেম ও টেবিলের রেখা-জাল ----
  const FR = (x0, y0, x1, y1, t) => [[x0, y0, x1, y0 + t], [x0, y1 - t, x1, y1], [x0, y0, x0 + t, y1], [x1 - t, y0, x1, y1]];
  const framed = page(W, H, [...FR(20, 20, 580, 780, 2), ...FR(26, 26, 574, 774, 1), [100, 300, 400, 309], [100, 320, 400, 329]]);
  const mf = G.inkMask(framed), cf = G.components(mf, null, 4);
  const fr = G.detectFrame(mf, { pxPerPt: 1, comps: cf });
  check(fr && fr.style === 'double' && fr.rectPt.x === 20, 'detectFrame: দ্বৈত ফ্রেম ও বাইরের সীমা');
  check(G.detectFrame(mj, { pxPerPt: 1 }) === null, 'detectFrame: ফ্রেম নেই ⇒ null');
  // টেবিল-বক্স পাতার মাঝখানে (ফ্রেমের কেন্দ্র ভেতরে) — ফ্রেম ব্লকে ঢোকে না
  const bf = G.blockMetrics(mf, box(W, H, 90, 280, 420, 340), { pxPerPt: 1, comps: cf });
  check(Math.abs(bf.rectPt.x - 100) < 0.01 && bf.rectPt.h < 40, 'blockMetrics: পাতার ফ্রেম ব্লকের মাপে নেই');
  check(G.pageMargins(mf, { pxPerPt: 1, comps: cf }).left === 100, 'pageMargins: ফ্রেম বাদ দিয়ে লেখার সীমা');
  const grid = page(W, H, [...FR(100, 100, 400, 200, 1), [100, 150, 400, 150], [250, 100, 250, 200], [120, 120, 140, 130]]);
  check(G.blockMetrics(G.inkMask(grid), box(W, H, 95, 95, 405, 205), { pxPerPt: 1 }).hasGrid === true, 'hasGrid: রেখা-জালের টেবিল');
  check(bj.hasGrid === false, 'hasGrid: সাধারণ লেখায় জাল নেই');
  // ভাঙা সরু রেখা (প্রতি ১০px-এ ১px ফাঁক) — খণ্ড ছোট, কিন্তু রেখা-গণনায় জাল
  const dashed = [];
  for (const yy of [100, 150, 200]) for (let xx = 100; xx < 400; xx += 10) dashed.push([xx, yy, xx + 8, yy]);
  dashed.push([120, 120, 140, 130]);
  check(G.countHLines(G.inkMask(page(W, H, dashed)), { x0: 95, y0: 95, x1: 405, y1: 205 }) === 3, 'countHLines: ভাঙা রেখাও গোনা');
  check(G.blockMetrics(G.inkMask(page(W, H, dashed)), box(W, H, 95, 95, 405, 205), { pxPerPt: 1, isTable: true }).hasGrid === true, 'hasGrid: সরু ভাঙা রেখার টেবিল');
  check(G.blockMetrics(mj, box(W, H, 90, 90, 420, 160), { pxPerPt: 1, isTable: true }).hasGrid === true &&
    G.blockMetrics(mj, box(W, H, 90, 90, 420, 160), { pxPerPt: 1 }).hasGrid === false, 'রেখা-গণনা শুধু টেবিল-ব্লকে');

  // গা-ঘেঁষা দুই ছবি (ওপরে ২০০–২৮০, নিচে ২৮৫–৩৬০); ওপরেরটির কাটা আয়ত নিচেরটিতে ঢুকেছে ⇒ ফাঁকা সারিতে কাটা
  const PL = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-pipeline.js'));
  const two = page(W, H, [[100, 200, 300, 280], [100, 285, 300, 360]]);
  const cut = PL.splitFromNeighbor(two, { x: 100, y: 200, w: 201, h: 140 }, { x: 100, y: 200, w: 201, h: 90 }, { x: 100, y: 282, w: 201, h: 80 });
  check(cut.y === 200 && cut.y + cut.h >= 281 && cut.y + cut.h <= 285, 'splitFromNeighbor: পাশের ছবির আগে ফাঁকা সারিতে কাটা');
  const noTouch = PL.splitFromNeighbor(two, { x: 100, y: 200, w: 201, h: 81 }, { x: 100, y: 200, w: 201, h: 81 }, { x: 100, y: 285, w: 201, h: 76 });
  check(noTouch.h === 81, 'splitFromNeighbor: না ঢুকলে অপরিবর্তিত');

  // ---- Part-17.8: লাইনের ভেতরের ফাঁক (ট্যাব), নিচে-দাগ, খাড়া বিভাজক ----
  // "র        আষাঢ়।" ×২ লাইন: অংশ ১ (১০০–১১৫), অংশ ২ (২০০–২৮০)
  const tabPg = page(W, H, [[100, 100, 115, 111], [200, 100, 280, 111], [100, 130, 115, 141], [200, 130, 290, 141]]);
  const bt = G.blockMetrics(G.inkMask(tabPg), box(W, H, 90, 90, 300, 150), { pxPerPt: 1 });
  check(bt.lineSegs.length === 2 && bt.lineSegs[0].length === 2 && bt.lineSegs[0][1].x === 200, 'lineSegs: চওড়া ফাঁকে দুই অংশ');
  const tabbed = IR.toItem({ type: 'list_item', text: 'র আষাঢ়।\nশ ময়না।', lines: ['র আষাঢ়।', 'শ ময়না।'], box: [1, 1, 2, 2] }, bt);
  check(tabbed.tabLines && tabbed.tabLines[0] === 'র\tআষাঢ়।' && tabbed.tabLines[1] === 'শ\tময়না।' && tabbed.tabStopsSrc[0] === 200, 'tabify: শব্দ ঠিক অংশে, ট্যাব মাপা অবস্থানে');
  const three = IR.toItem({ type: 'paragraph', text: 'a b c d', lines: ['ক. এক দুই ১'], box: [1, 1, 2, 2] },
    { empty: false, rectPt: { x: 0, y: 0, w: 400, h: 12 }, lines: [{}], lineSegs: [[{ x: 0, w: 30 }, { x: 60, w: 200 }, { x: 380, w: 10 }]], lineInkPt: 12 });
  check(three.tabLines[0] === 'ক.\tএক দুই\t১', 'tabify: তিন অংশ (চিহ্ন, লেখা, শেষের নম্বর)');
  check(IR.toItem({ type: 'paragraph', text: 'x', lines: ['x y'] }, { empty: false, rectPt: { x: 0, y: 0, w: 10, h: 10 }, lines: [{}], lineSegs: [[{ x: 0, w: 10 }]] }).tabLines === null, 'tabify: ফাঁক না থাকলে ট্যাব নয়');
  // নিচে-দাগ
  const ul = page(W, H, [[100, 100, 300, 111], [100, 114, 300, 115]]);
  check(G.blockMetrics(G.inkMask(ul), box(W, H, 90, 90, 310, 120), { pxPerPt: 1 }).underline === true, 'underline: লেখার নিচের দাগ শনাক্ত');
  // অক্ষর-সদৃশ লেখা: মাথায় মাত্রা-রেখা + খাড়া দাগ (বাংলার মতো) — নিচে দাগ নেই
  const letters = [[100, 200, 300, 201]];
  for (let x = 100; x < 300; x += 6) letters.push([x, 200, x + 2, 211]);
  const bl = G.blockMetrics(G.inkMask(page(W, H, letters)), box(W, H, 90, 190, 310, 220), { pxPerPt: 1 });
  check(bl.underline === false, 'underline: সাধারণ লেখায় (মাথায় মাত্রা) নেই');
  const bl2 = G.blockMetrics(G.inkMask(page(W, H, [...letters, [100, 212, 300, 213]])), box(W, H, 90, 190, 310, 220), { pxPerPt: 1 });
  check(bl2.underline === true, 'underline: অক্ষরে লেগে থাকা নিচে-দাগও শনাক্ত');
  // রেখার পুরুত্ব: সরু (২px) বনাম মোটা (৪px) খাড়া দাগ
  const thick = [[100, 200, 300, 202]];   // মোটা লেখায় মাথার রেখাও পুরু
  for (let x = 100; x < 300; x += 8) thick.push([x, 200, x + 3, 211]);
  const bt2 = G.blockMetrics(G.inkMask(page(W, H, thick)), box(W, H, 90, 190, 310, 220), { pxPerPt: 1 });
  check(bt2.strokePt > bl.strokePt * 1.25, 'strokePt: মোটা লেখার রেখা বেশি পুরু');
  // হেলানো: খাড়া দাগগুলো ডানে হেলানো (ওপরের অংশ ডানে)
  const sl = [];
  for (let x = 100; x < 300; x += 10) for (let y = 0; y < 12; y++) { const dx = Math.round((11 - y) * 0.25); sl.push([x + dx, 200 + y, x + dx + 1, 200 + y]); }
  const bsl = G.blockMetrics(G.inkMask(page(W, H, sl)), box(W, H, 90, 190, 320, 220), { pxPerPt: 1 });
  check(bsl.slant >= 0.15 && bl.slant === 0, 'slant: হেলানো লেখা শনাক্ত, সোজা লেখা নয়');
  // খাড়া বিভাজক: দুই কলাম + মাঝে দাগ — লাইন মাপা নষ্ট হয় না, দাগ আলাদা শনাক্ত
  const vr = page(W, H, [[100, 100, 200, 111], [100, 130, 200, 141], [100, 160, 200, 171], [250, 95, 251, 180], [300, 100, 400, 111], [300, 130, 400, 141]]);
  const mv = G.inkMask(vr);
  check(G.blockMetrics(mv, box(W, H, 90, 90, 410, 185), { pxPerPt: 1 }).lines.length === 3, 'খাড়া দাগ লাইন-মাপে নেই');
  const vrs = G.verticalRules(mv, { pxPerPt: 1 });
  check(vrs.length === 1 && Math.abs(vrs[0].x - 250.5) < 0.01, 'verticalRules: দাগ শনাক্ত');
  const pageV = { xform: { left: 0, top: 0, x0: 0, y0: 0, scale: 1 }, bands: [{ kind: 'grid', y0: 100, y1: 172, cells: [
    { x0: 50, x1: 250, items: [{ kind: 'para', rect: { x: 100, y: 100, w: 100, h: 72 }, indentPt: 50 }] },
    { x0: 250, x1: 545, items: [{ kind: 'para', rect: { x: 300, y: 100, w: 100, h: 42 }, indentPt: 50, tabStops: [80] }] }] }] };
  IR.applyVerticalRules ? IR.applyVerticalRules(pageV, vrs) : null;
  check(pageV.bands[0].cells[0].ruleRight === true && pageV.bands[0].cells[1].x0 === 250.5 && pageV.bands[0].cells[1].items[0].tabStops[0] === 79.5, 'applyVerticalRules: কলাম-সীমা দাগে, ডান ঘরের ট্যাব সমন্বয়');
  // টেবিলের ঘরের লেখা-উচ্চতা (জাল বাদ)
  const tblPg = page(W, H, [...FR(100, 100, 400, 200, 1), [100, 150, 400, 150], [250, 100, 250, 200], [120, 115, 160, 129], [270, 115, 300, 129], [120, 165, 150, 179], [270, 165, 310, 179]]);
  const btb = G.blockMetrics(G.inkMask(tblPg), box(W, H, 95, 95, 405, 205), { pxPerPt: 1, isTable: true });
  check(btb.hasGrid && btb.cellInkPt === 15, 'cellInkPt: ঘরের লেখার উচ্চতা');
  check(btb.colGuttersPt.length === 1 && btb.colGuttersPt[0] > 160 && btb.colGuttersPt[0] < 270, 'কলাম-ফাঁক মাপা');
  const tItem = IR.toItem({ type: 'table', lines: ['অ | আ', 'ই | ঈ'], box: [1, 1, 2, 2] }, btb);
  check(Math.abs(tItem.cellFontSrc - 15 / 0.8) < 0.01, 'ঘরের ফন্ট: অক্ষর-শ্রেণির ক্যালিব্রেটেড অনুপাতে (কার নেই ⇒ ০.৮)');
  const P = require(path.join(ROOT, 'js/layout-engine/faithful/layout-tags.js'));
  const pt = P.parseTagBody('t=heading;p=2;box=1,2,3,4;b=1;it=1;u=1');
  check(pt.italic === true && pt.underline === true && pt.bold === true && pt.type === 'heading', 'ট্যাগ: it/u পড়া');

  // ---- Part-17.9: ক্যালিব্রেটেড অক্ষর-শ্রেণি অনুপাত ----
  check(IR.inkRatioFor('দুখু মিয়ার বাবা মারা যান') === 1 && IR.inkRatioFor('শাপলা') === 0.8 && IR.inkRatioFor('কিনি') === 0.83 && IR.inkRatioFor('পুকুর') === 0.85, 'inkRatioFor: বাংলা শ্রেণি');
  check(Math.abs(IR.inkRatioFor('Class Two') - 0.71) < 1e-9 && Math.abs(IR.inkRatioFor('Question (85)') - 0.92) < 1e-9 && IR.inkRatioFor('ace') === 0.47, 'inkRatioFor: ইংরেজি শ্রেণি');
  // Gemini-বক্সের ক্রমবর্ধমান সরণ: আসল-y = ১.০৪ × Gemini-y − ৫
  const dBlocks = [], dMeas = [];
  for (let k = 0; k < 20; k++) {
    const gy = 100 + k * 40, real = 1.04 * gy - 5;
    dBlocks.push({ type: 'paragraph', lines: ['x'], box: [gy - 8, 100, gy + 8, 600] });
    dMeas.push({ empty: false, lines: [{}], rectPt: { x: 100, y: (real - 7) / 1000 * 842, w: 300, h: 14 / 1000 * 842 } });
  }
  dMeas[5] = { empty: false, lines: [{}], rectPt: { x: 100, y: 0.9 * 842, w: 300, h: 10 } };   // একটি বহিরাগত
  const fit = G.fitBoxDrift(dBlocks, dMeas, 842);
  check(fit && Math.abs(fit.a - 1.04) < 0.005 && Math.abs(fit.b + 5) < 1, 'fitBoxDrift: রৈখিক সরণ ধরা (বহিরাগত বাদ)');
  check(Math.abs(G.applyDrift([500, 10, 520, 90], fit)[0] - 515) < 1, 'applyDrift: বক্স সংশোধন');
  const noDrift = dBlocks.map((b, k) => ({ empty: false, lines: [{}], rectPt: { x: 100, y: ((b.box[0] + b.box[2]) / 2 - 7) / 1000 * 842, w: 300, h: 14 / 1000 * 842 } }));
  check(G.fitBoxDrift(dBlocks, noDrift, 842) === null, 'fitBoxDrift: সরণ নেই ⇒ null');

  // আলাদা ছোট টেবিল (ফাঁকসহ) — Gemini এক টেবিলে ফাঁকা সারি দিয়ে দেয় ⇒ ভাগ
  const twoT = page(W, H, [...FR(100, 100, 400, 140, 1), [100, 120, 400, 120], [120, 105, 140, 115], [120, 125, 140, 135],
    ...FR(100, 160, 400, 200, 1), [100, 180, 400, 180], [120, 165, 140, 175], [120, 185, 140, 195]]);
  const btt = G.blockMetrics(G.inkMask(twoT), box(W, H, 95, 95, 405, 205), { pxPerPt: 1, isTable: true });
  check(btt.tableGapsPt.length === 1 && btt.tableGapsPt[0][0] > 140 && btt.tableGapsPt[0][1] <= 160, 'tableGapsPt: দুই টেবিলের মাঝের সাদা ফাঁক');
  const split = IR.toItem({ type: 'table', lines: ['1 | A', '2 | B', ' | ', '1 | C', '2 | D'], box: [1, 1, 2, 2] }, btt);
  check(Array.isArray(split) && split.length === 2 && split[0].rows.length === 2 && split[1].rows[0][1] === 'C' && split[1].rect.y >= 150, 'ফাঁকা সারিতে টেবিল ভাগ, নিজ নিজ আয়ত');
  const answerRows = IR.toItem({ type: 'table', lines: ['Q | A', '1 | ', ' | '], box: [1, 1, 2, 2] }, btb);
  check(!Array.isArray(answerRows), 'সাদা ফাঁক না থাকলে ফাঁকা সারি থাকে (উত্তরের ঘর)');

  // লাইনে বসানো: দুই লাইন (১০০–১১২, ১৩০–১৪২); Gemini-বক্স ৪০% লাইন ওপরে সরে আছে
  const two2 = page(W, H, [[100, 100, 200, 112], [210, 102, 300, 112], [100, 130, 220, 142], [230, 132, 320, 142]]);
  const m2 = G.inkMask(two2), c2 = G.components(m2, null, 4);
  const sb = [{ i: 0, type: 'paragraph', lines: ['a'], box: box(W, H, 95, 88, 330, 104) }, { i: 1, type: 'paragraph', lines: ['b'], box: box(W, H, 95, 118, 330, 134) }];
  const sn = G.snapBoxesToLines(m2, c2, sb);
  const toPx = (bx) => [bx[0] / 1000 * H, bx[2] / 1000 * H];
  check(sn[0] && toPx(sn[0])[0] <= 100 && toPx(sn[0])[1] >= 112 && toPx(sn[1])[0] <= 130 && toPx(sn[1])[1] >= 142 && toPx(sn[1])[0] > 115, 'snapBoxesToLines: সরে-থাকা বক্স নিজ নিজ পূর্ণ লাইনে');
  const bm0 = G.blockMetrics(m2, sb[0].box, { pxPerPt: 1, comps: c2 }), bm1 = G.blockMetrics(m2, sn[0], { pxPerPt: 1, comps: c2 });
  check((bm0.empty || bm0.rectPt.w < 200) && bm1.rectPt.w >= 200 && bm1.lines.length === 1, 'বসানোর আগে লাইন হারায়, পরে পুরো লাইন মাপে আসে');

  // ---- ২) নকশা: toItem ----
  const mPara = { empty: false, rectPt: { x: 100, y: 100, w: 300, h: 50 }, lines: [{}, {}, {}], lineInkPt: 12, pitchPt: 18, align: 'j', firstIndentPt: 20, ragged: false };
  const ti = IR.toItem({ type: 'paragraph', text: 'ক খ', lines: ['ক', 'খ', 'গ'], box: [1, 1, 2, 2] }, mPara);
  check(ti.kind === 'para' && ti.align === 'j' && ti.firstIndentPt === 20 && ti.lineSpacingPt === 18 && !ti.keepLines, 'toItem: অনুচ্ছেদ — মাপা অবস্থান/ইনডেন্ট/দূরত্ব');
  check(IR.toItem({ type: 'figure', box: [1, 1, 2, 2] }, null).kind === 'figure', 'toItem: চিত্র');
  const rot = IR.toItem({ type: 'paragraph', text: 'x', lines: ['x'], box: [1, 1, 2, 2] }, { empty: false, rectPt: { x: 0, y: 0, w: 10, h: 100 }, lines: [] });
  check(rot.kind === 'figure' && rot.rotatedText, 'toItem: খাড়া লেখা ⇒ ছবি');
  const tb = IR.toItem({ type: 'table', lines: ['ক | খ', '১ | ২', ''] }, null);
  check(tb.kind === 'table' && tb.rows.length === 2 && tb.rows[1][1] === '২', 'toItem: টেবিল-সারি ভাগ');
  check(IR.toItem({ type: 'signature', text: 'a', lines: ['a', 'b'] }, null).keepLines, 'toItem: স্বাক্ষর ⇒ লাইন-ভাঙন রাখা');
  check(IR.toItem({ type: 'heading', text: 'শিরোনাম', lines: ['শিরোনাম'] }, null).bold, 'toItem: শিরোনাম মোটা');

  // ---- ৩) স্বাভাবিককরণ ----
  const mk = (x, y, w, h, ink, nLines, type) => ({ kind: 'para', type: type || 'paragraph', lines: Array(nLines).fill('কিকু'), text: 'কিকু', rect: { x, y, w, h }, m: { lineInkPt: ink, lines: Array(nLines).fill({}), pitchPt: ink * 1.4 }, firstIndentPt: 0, lineSpacingPt: ink * 1.4 });
  // ডিজিটাল পাতা: কালি ১৫ ⇒ ফন্ট ১২ ⇒ আসল মাপ
  const dItems = [mk(60, 70, 470, 100, 12, 5), mk(60, 200, 470, 60, 12, 3)];
  const dn = IR.normalizePage(dItems, { widthPt: 595.3, heightPt: 841.9 });
  check(dn.scale === 1 && dn.bodyFontPt === 12 && dn.margins.left === 60 && dn.margins.top === 70, 'ডিজিটাল পাতা: আসল মাপ ও মূল মার্জিন');
  check(dItems.every((it) => it.fontPt === 12), 'মূল-লেখা = ১২pt');
  // ক্যামেরা-ছবি: কালি ৫০ ⇒ ফন্ট ৪০ ⇒ ১২pt-এ নামানো, A4
  const cItems = [mk(100, 100, 1500, 400, 50, 6), mk(100, 600, 1500, 300, 50, 4)];
  const cn = IR.normalizePage(cItems, { widthPt: 1800, heightPt: 2400 });
  check(cn.widthPt === 595.3 && cn.heightPt === 841.9, 'ক্যামেরা-পাতা ⇒ A4 খাড়া');
  check(cn.scale < 0.35 && cn.bodyFontPt === 12, 'ক্যামেরা-পাতা ⇒ ছোট করা, মূল-লেখা ১২pt');
  check(cItems.every((it) => it.rect.x + it.rect.w <= 595.3 - 18 + 0.01), 'সব অংশ কাগজের ভেতরে');
  // অনির্ভরযোগ্য মাপ (৪ লাইনের অনুচ্ছেদে ১টি মাপা লাইন) ⇒ মূল-লেখার আকার, দূরত্ব বাদ
  const uItems = [mk(60, 70, 470, 100, 12, 5), mk(60, 70, 470, 100, 12, 5), Object.assign(mk(60, 300, 470, 100, 60, 1), { lines: ['a', 'b', 'c', 'd'] })];
  IR.normalizePage(uItems, { widthPt: 595.3, heightPt: 841.9 });
  check(uItems[2].fontPt === 12 && uItems[2].lineSpacingPt === 0, 'অনির্ভরযোগ্য মাপ ⇒ মূল-আকার');
  // সাধারণ লেখার ফন্ট-অনুপাত সীমিত, শিরোনাম নয়
  const hItems = [mk(60, 70, 470, 100, 12, 8), mk(60, 300, 470, 30, 30, 1), mk(60, 400, 470, 30, 30, 1, 'title')];
  IR.normalizePage(hItems, { widthPt: 595.3, heightPt: 841.9 });
  check(hItems[1].fontPt === 15.5 && hItems[2].fontPt === 30, 'অনুপাত-সীমা: সাধারণ ≤১.৩×, শিরোনাম মুক্ত');

  // ছোট শব্দ (কালি কম উঁচু) ⇒ মূল-আকারের নিচে নয়
  const sItems = [mk(60, 70, 470, 100, 12, 8), Object.assign(mk(60, 300, 60, 10, 10, 1, 'label_value'), { text: 'শাপলা' })];
  IR.normalizePage(sItems, { widthPt: 595.3, heightPt: 841.9 });
  check(sItems[1].fontPt === 12, 'ছোট লেবেল ছোট ফন্টে নামে না');

  // ---- ৪) সারি ও কলাম ----
  const pg = { widthPt: 595.3, heightPt: 841.9, margins: { top: 50, left: 50, right: 45.3 } };
  const A = { kind: 'para', type: 'paragraph', rect: { x: 50, y: 100, w: 250, h: 40 } };
  const B = { kind: 'para', type: 'paragraph', rect: { x: 320, y: 105, w: 200, h: 30 } };
  const Cc = { kind: 'para', type: 'paragraph', rect: { x: 60, y: 200, w: 400, h: 20 } };
  const bands = IR.bandsOf([Cc, B, A], pg);
  check(bands.length === 2 && bands[0].kind === 'grid' && bands[1].kind === 'flow', 'পাশাপাশি ⇒ গ্রিড, নিচে ⇒ প্রবাহ');
  check(bands[0].cells.length === 2 && bands[0].cells[0].x0 === 50 && bands[0].cells[1].x0 === 310, 'কলাম-সীমা = মাঝামাঝি');
  check(bands[0].gapBeforePt === 50 && bands[1].gapBeforePt === 60, 'সারির আগের ফাঁক মাপা');
  check(bands[1].cells[0].items[0].indentPt === 10, 'বাম-ইনডেন্ট = কলাম-শুরু থেকে দূরত্ব');
  // মাঝে/ডানে বসানো: বাম-ইনডেন্ট নয়, কেন্দ্র-সরণ / ডান-দূরত্ব
  const Tc = { kind: 'para', type: 'title', align: 'c', rect: { x: 150, y: 300, w: 300, h: 30 } };
  const Rr = { kind: 'para', type: 'paragraph', align: 'r', rect: { x: 400, y: 400, w: 100, h: 15 } };
  const bcr = IR.bandsOf([Tc, Rr], pg);
  const tci = bcr[0].cells[0].items[0], rri = bcr[1].cells[0].items[0];
  check(tci.centerShiftPt === 0 && rri.rightIndentPt === 50, 'কেন্দ্র-সরণ ও ডান-দূরত্ব মাপা');
  const xc = D.bodyXml({ pages: [{ widthPt: 595.3, heightPt: 841.9, margins: { top: 50, left: 50, right: 45.3, bottom: 36 }, bands: [{ kind: 'flow', gapBeforePt: 0, cells: [{ items: [Object.assign({}, tci, { text: 'শিরোনাম', lines: ['শিরোনাম'], indentPt: 100 }), Object.assign({}, rri, { text: 'ডানে', lines: ['ডানে'], indentPt: 350 })] }] }] }] }).xml;
  check(!/w:left="2000"/.test(xc) && !/w:left="7000"/.test(xc) && /w:right="1000"/.test(xc), 'মাঝে/ডানে লেখায় বাম-ইনডেন্ট দুবার নয়');

  const noBox = IR.bandsOf([{ kind: 'para', type: 'paragraph' }], pg);
  check(noBox.length === 1 && noBox[0].cells[0].items.length === 1, 'বক্স-ছাড়া ব্লক হারায় না');

  const sp = { bands: [{ kind: 'flow', cells: [{ items: [{ kind: 'para', type: 'option', indentPt: 20 }, { kind: 'para', type: 'option', indentPt: 24 }, { kind: 'para', type: 'option', indentPt: 60 }] }] }] };
  IR.snapIndents(sp);
  const ids = sp.bands[0].cells[0].items.map((x) => x.indentPt);
  check(ids[0] === ids[1] && ids[2] === 60, 'snapIndents: কাছাকাছি ইনডেন্ট এক, দূরেরটা আলাদা');

  // হালকা ছাপা: মাপা ইনডেন্ট ৪৫, কিন্তু Gemini-বক্স অন্য তিনটির সাথে একই বাম প্রান্তে ⇒ ২৪
  const fa = { bands: [{ kind: 'flow', cells: [{ items: [
    { kind: 'para', type: 'question', indentPt: 24, box: [0, 78, 1, 900] }, { kind: 'para', type: 'question', indentPt: 24, box: [0, 78, 1, 900] },
    { kind: 'para', type: 'question', indentPt: 45, box: [0, 81, 1, 900] }, { kind: 'para', type: 'question', indentPt: 24, box: [0, 79, 1, 900] },
    { kind: 'para', type: 'question', indentPt: 80, box: [0, 140, 1, 900] }] }] }] };
  IR.snapIndents(fa);
  const fi = fa.bands[0].cells[0].items.map((x) => x.indentPt);
  check(fi[2] === 24, 'snapIndents: হালকা-ছাপার ভুল ইনডেন্ট Gemini-বক্সে ঠিক');
  check(fi[4] === 80, 'snapIndents: সত্যিকার ভেতরের অনুচ্ছেদ (বক্সও ভেতরে) অপরিবর্তিত');

  const sf = { bands: [{ kind: 'flow', cells: [{ items: [
    { kind: 'para', type: 'option', fontPt: 10 }, { kind: 'para', type: 'option', fontPt: 10 }, { kind: 'para', type: 'option', fontPt: 10.5 },
    { kind: 'para', type: 'option', fontPt: 20 }, { kind: 'para', type: 'option', fontPt: 10 },
    { kind: 'para', type: 'heading', fontPt: 12 }, { kind: 'para', type: 'heading', fontPt: 10 }] }] }] };
  IR.snapFonts(sf);
  const fsz = sf.bands[0].cells[0].items.map((x) => x.fontPt);
  check(fsz[2] === 10 && fsz[3] === 20, 'snapFonts: কাছাকাছি অপশন এক আকার, অনেক বড়টা আলাদা');
  check(fsz[5] === 12 && fsz[6] === 10, 'snapFonts: শিরোনাম অপরিবর্তিত');

  // ---- ৫) build (ক্যাপচার + মাপ ⇒ নকশা) ----
  const cap = {
    blocks: [
      { i: 0, type: 'heading', page: 1, box: [100, 100, 130, 900], text: 'শিরোনাম', lines: ['শিরোনাম'] },
      { i: 1, type: 'paragraph', page: 1, box: [150, 100, 300, 900], text: 'অনুচ্ছেদ', lines: ['এক', 'দুই', 'তিন'] },
      { i: 2, type: 'paragraph', page: 2, box: null, text: 'বক্স নেই', lines: ['বক্স নেই'] }
    ], pages: []
  };
  const meas = {
    0: { empty: false, rectPt: { x: 60, y: 70, w: 470, h: 22 }, lines: [{}], lineInkPt: 20, pitchPt: 0, align: 'c' },
    1: { empty: false, rectPt: { x: 60, y: 110, w: 470, h: 60 }, lines: [{}, {}, {}], lineInkPt: 15, pitchPt: 20, align: 'j', firstIndentPt: 0 }
  };
  const ir = IR.build(cap, meas, { 1: { widthPt: 595.3, heightPt: 841.9 } });
  check(ir.pages.length === 2 && ir.pages[0].bands.length === 2, 'build: ২ পাতা, প্রথম পাতায় ২ সারি');
  check(ir.warnings.length === 1 && ir.warnings[0].kind === 'block_without_box', 'build: বক্স-ছাড়া ব্লক সতর্কতায়');
  check(ir.pages[0].bands[0].cells[0].items[0].align === 'c' && ir.pages[0].bands[0].cells[0].items[0].bold, 'build: শিরোনাম মাঝে ও মোটা');

  // ---- ৬) মাস্টার .docx ----
  const fig = { kind: 'figure', widthPt: 100, heightPt: 50, image: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=', pxW: 200, pxH: 100 } };
  const ir2 = {
    pages: [
      { widthPt: 595.3, heightPt: 841.9, margins: { top: 54, left: 60, right: 50, bottom: 36 }, bands: [
        { kind: 'flow', gapBeforePt: 0, cells: [{ items: [
          { kind: 'para', text: 'ঠিকানা', lines: ['লাইন ১', 'লাইন ২'], keepLines: true, fontPt: 12, align: 'l', indentPt: 30, firstIndentPt: -20, spaceBeforePt: 0 },
          fig] }] },
        { kind: 'grid', gapBeforePt: 12, cells: [{ x0: 60, x1: 300, items: [{ kind: 'para', text: 'বাম', lines: ['বাম'], fontPt: 12, align: 'l' }] }, { x0: 300, x1: 545, items: [{ kind: 'para', text: 'ডান', lines: ['ডান'], fontPt: 12, align: 'r' }] }] }
      ] },
      { widthPt: 841.9, heightPt: 595.3, margins: { top: 54, left: 54, right: 54, bottom: 36 }, bands: [
        { kind: 'flow', gapBeforePt: 0, cells: [{ items: [{ kind: 'table', rows: [['ক', 'খ'], ['১']], fontPt: 11, widthPt: 300 }] }] }] }
    ]
  };
  const { xml, media } = D.bodyXml(ir2);
  check((xml.match(/<w:sectPr>/g) || []).length === 2 && (xml.match(/w:val="nextPage"/g) || []).length === 2, 'প্রতি মূল পাতা = আলাদা সেকশন, নতুন পাতায়');
  check(/w:orient="landscape"/.test(xml), 'আড়াআড়ি পাতা ঠিক');
  check(/<w:br\/>/.test(xml) && /w:hanging="400"/.test(xml) && /w:left="1000"/.test(xml), 'লাইন-ভাঙন রাখা ও ঝুলন্ত ইনডেন্ট');
  check(media.length === 1 && media[0].name === 'fimg1.png' && /cx="1270000"/.test(xml), 'চিত্র: মিডিয়া ও মাপা প্রস্থ');
  check(/<w:insideV w:val="nil"\/>/.test(xml) && /w:lineRule="exact"/.test(xml), 'গ্রিড = সীমানাহীন টেবিল + ফাঁকের স্পেসার');
  check(/<w:insideV w:val="single"/.test(xml) && (xml.match(/<w:tc>/g) || []).length === 2 + 4, 'আসল টেবিল সীমানাসহ, খালি ঘরও থাকে');
  check(/SutonnyOMJ/.test(xml), 'ফন্ট SutonnyOMJ');

  // Part-17.7: পাতার বর্ডার, সীমানাহীন টেবিল, ঘরের ভেতরে চিত্র, তালিকা লাইন-ভাঙন
  const ir3 = { pages: [{ widthPt: 595.3, heightPt: 841.9, margins: { top: 54, left: 60, right: 50, bottom: 36 }, frame: { style: 'double', spacePt: { top: 20, left: 24, right: 24, bottom: 20 } }, bands: [
    { kind: 'flow', gapBeforePt: 0, cells: [{ items: [
      { kind: 'table', rows: [['ক', 'খ']], borderless: true, widthPt: 200, fontPt: 12 },
      { kind: 'table', rows: [['Queen', ''], ['Cat', '']], widthPt: 300, fontPt: 12, cellFigures: [Object.assign({}, fig, { widthPt: 400, heightPt: 200, cell: [1, 1] })] }] }] }] }] };
  const x3 = D.bodyXml(ir3).xml;
  check(/<w:pgBorders w:offsetFrom="text"><w:top w:val="double"[^>]*w:space="20"/.test(x3), 'পাতার দ্বৈত বর্ডার, মাপা দূরত্বে');
  check((x3.match(/<w:insideV w:val="nil"\/>/g) || []).length === 1 && /<w:insideV w:val="single"/.test(x3), 'রেখাহীন টেবিল সীমানাহীন, জালের টেবিল সীমানাসহ');
  const tcs = x3.split('<w:tc>');
  check(/<w:drawing>/.test(tcs[tcs.length - 1]) && !/<w:drawing>/.test(tcs[tcs.length - 2]), 'চিত্র ঠিক ঘরে (সারি ২, কলাম ২)');
  check(/cx="1803400"/.test(x3), 'ঘরের চিত্র ঘরের প্রস্থে আঁটানো (142pt)');
  check(/<w:top w:w="0" w:type="dxa"\/>/.test(x3), 'টেবিলের ঘর-মার্জিন স্পষ্ট (.doc-এ বাড়তি উচ্চতা নয়)');
  // Part-17.8: সারির উচ্চতা, ঘরে মাঝে, ট্যাব, ইটালিক/নিচে-দাগ, খাড়া দাগ
  const x4 = D.bodyXml({ pages: [{ widthPt: 595.3, heightPt: 841.9, margins: { top: 54, left: 60, right: 50, bottom: 36 }, bands: [
    { kind: 'flow', gapBeforePt: 0, cells: [{ items: [
      { kind: 'table', rows: [['ক', 'খ'], ['গ', 'ঘ']], widthPt: 200, heightPt: 60, fontPt: 10 },
      { kind: 'para', text: 'র আষাঢ়।', lines: ['র আষাঢ়।', 'শ ময়না।'], tabLines: ['র\tআষাঢ়।', 'শ\tময়না।'], tabStops: [80], keepLines: true, fontPt: 10, align: 'j', italic: true, underline: true }] }] },
    { kind: 'grid', gapBeforePt: 0, cells: [{ x0: 60, x1: 300, ruleRight: true, items: [{ kind: 'para', text: 'a', lines: ['a'], fontPt: 10, align: 'l' }] }, { x0: 300, x1: 545, items: [{ kind: 'para', text: 'b', lines: ['b'], fontPt: 10, align: 'l' }] }] }] }] }).xml;
  check(/<w:trHeight w:val="600" w:hRule="(atLeast|exact)"\/>/.test(x4) && /<w:vAlign w:val="center"\/>/.test(x4), 'টেবিল: সারির উচ্চতা মূলের মতো, লেখা মাঝে');
  check(/<w:tabs><w:tab w:val="left" w:pos="1600"\/><\/w:tabs>/.test(x4) && (x4.match(/<w:tab\/>/g) || []).length === 2, 'ট্যাব-স্টপ ও ট্যাব-অক্ষর');
  check(/<w:i\/>/.test(x4) && /<w:u w:val="single"\/>/.test(x4), 'ইটালিক ও নিচে-দাগ');
  check(!/<w:jc w:val="both"\/>/.test(x4), 'হাতে-ভাঙা লাইনে দুপাশে-সমান নয়');
  check(/<w:right w:val="single" w:sz="6"/.test(x4), 'কলামের মাঝের খাড়া দাগ');
  check(IR.toItem({ type: 'list_item', text: 'অ\nআ', lines: ['অ = অজ', 'আ = আম'] }, null).keepLines, 'তালিকার প্রতিটি লাইন আলাদা');
  // nestFiguresInTables build-এর ভেতরের — build দিয়ে যাচাই
  const capN = { blocks: [{ i: 0, type: 'table', page: 1, box: [0, 0, 1, 1], lines: ['a | ', 'b | '] }, { i: 1, type: 'figure', page: 1, box: [0, 0, 1, 1] }, { i: 2, type: 'figure', page: 1, box: [0, 0, 1, 1] }] };
  const measN = { 0: { empty: false, rectPt: { x: 60, y: 60, w: 200, h: 100 }, lines: [], hasGrid: true }, 1: { empty: false, rectPt: { x: 180, y: 120, w: 50, h: 30 }, lines: [] }, 2: { empty: false, rectPt: { x: 60, y: 400, w: 50, h: 30 }, lines: [] } };
  const irN = IR.build(capN, measN, { 1: { widthPt: 595.3, heightPt: 841.9 } });
  const allItems = irN.pages[0].bands.flatMap((b) => b.cells.flatMap((c) => c.items));
  const tN = allItems.find((x) => x.kind === 'table');
  check(tN.cellFigures && tN.cellFigures.length === 1 && tN.cellFigures[0].cell.join() === '1,1', 'টেবিলের ভেতরের চিত্র ঘরে নেস্ট');
  check(allItems.filter((x) => x.kind === 'figure').length === 1 && !tN.borderless, 'বাইরের চিত্র আলাদা থাকে; জালের টেবিল সীমানাসহ');

  // Part-17.9: ওপর-থেকে-ওপর দূরত্বে ফাঁক; অংশ-মোটা
  const pgT = { widthPt: 595.3, heightPt: 841.9, margins: { top: 50, left: 50, right: 50, bottom: 36 }, bands: [
    { kind: 'flow', gapBeforePt: 0, y0: 50, cells: [{ items: [{ kind: 'para', text: 'এক', lines: ['এক'], fontPt: 10, align: 'l', rect: { x: 50, y: 50, w: 50, h: 10 } }] }] },
    { kind: 'flow', gapBeforePt: 10, y0: 70, cells: [{ items: [{ kind: 'para', text: '**উচ্চারণ:** আল-হুম্মা', lines: ['**উচ্চারণ:** আল-হুম্মা'], fontPt: 10, align: 'l', rect: { x: 50, y: 70, w: 50, h: 10 } }] }] }] };
  const xt = D.bodyXml({ pages: [pgT] }).xml;
  // দ্বিতীয় অনুচ্ছেদ: ৭০ − ৫০ − (১০×১.১৫) = ৮.৫pt = ১৭০ twip
  check(/w:before="170"/.test(xt) && /w:line="230" w:lineRule="exact"/.test(xt), 'ফাঁক = ওপর-থেকে-ওপর − আগের উচ্চতা; লাইন ১.১৫×ফন্ট');
  check((xt.match(/<w:b\/>/g) || []).length === 1 && !/\*\*/.test(xt), 'অংশ-মোটা: শুধু চিহ্নিত অংশ মোটা, চিহ্ন মুছে');

  const bin = await D.build(ir2, { JSZip, type: 'uint8array' });
  const z = await JSZip.loadAsync(bin);
  const doc = await z.file('word/document.xml').async('string');
  check(doc.startsWith('<?xml') && /<w:body>.*<\/w:body>/s.test(doc), 'docx: document.xml গঠন');
  check(!!z.file('word/media/fimg1.png') && /rIdFimg1/.test(await z.file('word/_rels/document.xml.rels').async('string')), 'docx: ছবি ও সম্পর্ক');
  check(!!z.file('word/styles.xml') && !!z.file('[Content_Types].xml'), 'docx: স্টাইল ও কন্টেন্ট-টাইপ');
  // খালি নকশাও ভাঙে না
  const emptyDoc = await D.build({ pages: [] }, { JSZip, type: 'uint8array' });
  check(emptyDoc.length > 500, 'খালি নকশা ⇒ বৈধ ফাঁকা ফাইল');

  console.log(`Part-17.5 faithful-layout: ${gates} passed`);
})().catch((e) => { console.error('FAIL', e && e.message || e); process.exit(1); });
