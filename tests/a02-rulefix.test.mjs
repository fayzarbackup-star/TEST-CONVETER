/**
 * A02_RULES_v1 — নমুনা a02-এ রেখা/বাক্স, ছকের বর্ডার, লোগো ও সংখ্যা-বাক্সের উচ্চতা এবং অবস্থান যাচাইয়ের টেস্ট।
 * চালানোর নিয়ম: node tests/a02-rulefix.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// মডিউলগুলো লোড করা
require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const { FayzarLineFit, FayzarLayoutIR, FayzarFaithfulDocx } = globalThis;

// নমুনা a02-এর ডেটা লোড করা
const captureData = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a02/capture.json'), 'utf8'));
const measuresData = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a02/measures.json'), 'utf8'));
const irSavedData = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a02/ir.json'), 'utf8'));
const layoutScoreData = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a02/layout-score.json'), 'utf8'));
const lineDriftData = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/asis/a02/line-drift.json'), 'utf8'));

const clone = (obj) => JSON.parse(JSON.stringify(obj));

function setSwitch(on, viaEnv = false) {
  delete globalThis.__FZ_ON_RULEFIX;
  delete globalThis.__FZ_OFF_RULEFIX;
  if (globalThis.window) delete globalThis.window.__FZ_ON_RULEFIX;
  if (typeof process !== 'undefined' && process.env) {
    delete process.env.__FZ_ON_RULEFIX;
    delete process.env.FZ_ON;
  }
  if (on) {
    if (viaEnv) {
      process.env.FZ_ON = 'RULEFIX';
    } else {
      globalThis.window = globalThis.window || globalThis;
      globalThis.window.__FZ_ON_RULEFIX = true;
      globalThis.__FZ_ON_RULEFIX = true;
    }
  }
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ পাস: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ব্যর্থ: ${name}`);
    console.error('  কারণ:', err && err.message ? err.message : err);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'শর্ত পূরণ হয়নি');
}

// বেসলাইন (সুইচ বন্ধ অবস্থায়) আউটপুট সংরক্ষণ
setSwitch(false);
const baseIrBuilt = FayzarLayoutIR.build(clone(measuresData.cap), clone(measuresData.measures), clone(measuresData.pageInfo));
const baseBodySaved = FayzarFaithfulDocx.bodyXml(clone(irSavedData));
const baseBodyBuilt = FayzarFaithfulDocx.bodyXml(clone(baseIrBuilt));
const basePlan = FayzarFaithfulDocx.planPage(clone(irSavedData.pages[0]));

// ১. সুইচ বন্ধ অবস্থায় বাইট-বাই-বাইট অভিন্নতা যাচাই
await test('১. সুইচ বন্ধ অবস্থায় (ডিফল্ট) IR, planPage, XML ও DOCX বাইট-বাই-বাইট অপরিবর্তিত থাকে', async () => {
  setSwitch(false);
  const irOff = FayzarLayoutIR.build(clone(measuresData.cap), clone(measuresData.measures), clone(measuresData.pageInfo));
  assert(JSON.stringify(irOff) === JSON.stringify(baseIrBuilt), 'সুইচ বন্ধে নির্মিত IR বদলে গেছে');

  // সুইচ বন্ধে ir.json-এর মূল কাঠামোগত মান অপরিবর্তিত থাকা যাচাই
  const pageOff = irOff.pages[0];
  assert(pageOff.frame.spacePt.top === 13.9 && pageOff.frame.spacePt.left === 14.4 && pageOff.frame.spacePt.right === 13.4 && pageOff.frame.spacePt.bottom === 4,
    'সুইচ বন্ধে page.frame.spacePt আগের মানে নেই');
  const greyTblOff = pageOff.bands[17].cells[0].items[0];
  assert(greyTblOff.headShade === 'C0BCC7', 'সুইচ বন্ধে headShade C0BCC7 থাকা উচিত');
  assert(JSON.stringify(greyTblOff.fullVRule) === JSON.stringify([false, false, false, true]), 'সুইচ বন্ধে fullVRule আগের মতো নেই');

  const bodyOff = FayzarFaithfulDocx.bodyXml(clone(irSavedData));
  assert(bodyOff.xml === baseBodySaved.xml, 'সুইচ বন্ধে bodyXml আউটপুট বাইট-বাই-বাইট এক নয়');

  const docxA = await FayzarFaithfulDocx.build(clone(irSavedData), { type: 'uint8array', JSZip: FayzarFaithfulDocx.MiniJSZip });
  const docxB = await FayzarFaithfulDocx.build(clone(irSavedData), { type: 'uint8array', JSZip: FayzarFaithfulDocx.MiniJSZip });
  assert(Buffer.compare(Buffer.from(docxA), Buffer.from(docxB)) === 0, 'সুইচ বন্ধে DOCX বাইনারি অভিন্ন নয়');
});

// ২. window.__FZ_ON_RULEFIX এবং FZ_ON=RULEFIX উভয় সুইচ কাজ করা যাচাই
await test('২. window.__FZ_ON_RULEFIX এবং FZ_ON=RULEFIX উভয় সুইচেই নতুন আচরণ সক্রিয় হয় এবং উভয়ের আউটপুট অভিন্ন', async () => {
  setSwitch(true, false);
  assert(FayzarLineFit.isRuleFixOn() === true, 'window.__FZ_ON_RULEFIX সুইচ সক্রিয় হয়নি');
  const xmlWin = FayzarFaithfulDocx.bodyXml(clone(irSavedData)).xml;

  setSwitch(true, true);
  assert(FayzarLineFit.isRuleFixOn() === true, 'FZ_ON=RULEFIX সুইচ সক্রিয় হয়নি');
  const xmlEnv = FayzarFaithfulDocx.bodyXml(clone(irSavedData)).xml;

  assert(xmlWin === xmlEnv, 'window.__FZ_ON_RULEFIX এবং FZ_ON=RULEFIX-এর XML আউটপুট অভিন্ন নয়');
  assert(xmlWin !== baseBodySaved.xml, 'সুইচ চালু করলেও আউটপুট বদলায়নি');

  setSwitch(false);
  assert(FayzarLineFit.isRuleFixOn() === false, 'সুইচ বন্ধ করার পরও সক্রিয় রয়েছে');
  const xmlAfterOff = FayzarFaithfulDocx.bodyXml(clone(irSavedData)).xml;
  assert(xmlAfterOff === baseBodySaved.xml, 'সুইচ পুনরায় বন্ধ করার পর বাইট-বাই-বাইট আগের অবস্থায় ফেরেনি');
});

// ৩. পাতার চারপাশের ফ্রেম-বর্ডার (উপরে, নিচে, বামে, ডানে) মূলের অবস্থানে আসা যাচাই
await test('৩. সুইচ চালু করলে পাতার চারপাশের ফ্রেম-বর্ডার মূলের অবস্থানে (y=11.75, 760.25 ও x=13.75, 538.25) আসে', async () => {
  setSwitch(true);
  const irOn = FayzarLayoutIR.build(clone(measuresData.cap), clone(measuresData.measures), clone(measuresData.pageInfo));
  const p = irOn.pages[0];
  const sp = p.frame.spacePt;

  // Word-এ offsetFrom="text"-এ বর্ডারের অবস্থান:
  const topBorderY = p.margins.top - sp.top;
  const leftBorderX = p.margins.left - sp.left;
  const rightBorderX = (p.widthPt - p.margins.right) + sp.right;
  const bottomBorderY = (p.heightPt - p.margins.bottom) + sp.bottom;

  const origH = layoutScoreData.per[0].rules.orig.h;
  const origV = layoutScoreData.per[0].rules.orig.v;

  assert(Math.abs(topBorderY - origH[0]) <= 1.5, `উপরের ফ্রেম-রেখা মূলের (11.75) কাছে আসেনি: ${topBorderY}`);
  assert(Math.abs(bottomBorderY - origH[origH.length - 1]) <= 1.5, `নিচের ফ্রেম-রেখা মূলের (760.25) কাছে আসেনি: ${bottomBorderY}`);
  assert(Math.abs(leftBorderX - origV[0]) <= 1.5, `বামের ফ্রেম-রেখা মূলের (13.75) কাছে আসেনি: ${leftBorderX}`);
  assert(Math.abs(rightBorderX - origV[origV.length - 1]) <= 1.5, `ডানের ফ্রেম-রেখা মূলের (538.25) কাছে আসেনি: ${rightBorderX}`);
});

// ৪. ০৪ নং ক্রমিকের (অবসর গ্রহণের তারিখ) সংখ্যা-বাক্সে দিন-মাস-বছরের মাঝের ২টি ফাঁক ও বাড়তি রেখা/লাইন নিরসন যাচাই
await test('৪. ০৪ নং ক্রমিকের ৮-ঘর সংখ্যা-বাক্সে দিন-মাস-বছরের ২টি বর্ডারহীন ফাঁক তৈরি হয় (বাড়তি ২টি রেখা 383.25, 400.75 ও বাড়তি ২টি লাইন দূর হয়)', async () => {
  setSwitch(true);
  const irOn = FayzarLayoutIR.build(clone(measuresData.cap), clone(measuresData.measures), clone(measuresData.pageInfo));
  const retTbl = irOn.pages[0].bands[15].cells[1].items[0];
  assert(Array.isArray(retTbl.smallBoxesPt) && retTbl.smallBoxesPt.length === 8, '০৪ নং সংখ্যা-বাক্সে ৮টি smallBoxesPt তৈরি হয়নি');

  // দিন (২ ঘর) | ফাঁক | মাস (২ ঘর) | ফাঁক | বছর (৪ ঘর)
  const gap1 = retTbl.smallBoxesPt[2].x0 - retTbl.smallBoxesPt[1].x1;
  const gap2 = retTbl.smallBoxesPt[4].x0 - retTbl.smallBoxesPt[3].x1;
  assert(gap1 >= 3 && gap1 <= 5, `দিন ও মাসের মাঝের ফাঁক সঠিক নয়: ${gap1}`);
  assert(gap2 >= 3 && gap2 <= 5, `মাস ও বছরের মাঝের ফাঁক সঠিক নয়: ${gap2}`);

  // XML-এ ১০টি কলাম (৮টি বর্ডারযুক্ত ঘর + ২টি বর্ডারহীন ফাঁক-ঘর) ও টেবিল-বর্ডার nil থাকা যাচাই
  const { xml } = FayzarFaithfulDocx.bodyXml(clone(irSavedData));
  const innerTbls = [...xml.matchAll(/<w:tbl>(?:(?!<w:tbl>)[\s\S])*?<\/w:tbl>/g)].map((m) => m[0]);
  const retXml = innerTbls.find((t) => (t.match(/<w:gridCol /g) || []).length === 10);
  assert(retXml, 'XML-এ ০৪ নং সংখ্যা-বাক্সের ১০-কলামের (৮ ঘর + ২ ফাঁক) টেবিল পাওয়া যায়নি');
  const tcBordersCount = (retXml.match(/<w:tcBorders>/g) || []).length;
  assert(tcBordersCount === 8, `১০টি ঘরের মধ্যে ঠিক ৮টি ঘরে বর্ডার থাকার কথা, পাওয়া গেছে: ${tcBordersCount}`);
});

// ৫. সংখ্যা-বাক্সগুলোর উচ্চতা (hgt) ও বাম-অবস্থান (tblInd) মূলের সাথে মেলা যাচাই
await test('৫. ৩টি সংখ্যা-বাক্সের উচ্চতা (exact ~15.5–16.3pt) ও বাম-অবস্থান (+5.4pt ডান-সরণমুক্ত) মূলের সাথে মেলে', async () => {
  setSwitch(true);
  const irCopy = clone(irSavedData);
  const { xml } = FayzarFaithfulDocx.bodyXml(irCopy);

  // ০৩ নং ক্রমিকের ১৭-ঘর NID বক্স: উচ্চতা 375.2 - 358.9 = 16.3pt (আগে 17.3pt atLeast হয়ে নিচের রেখা 376.75-এ নামত)
  const nidTbl = irCopy.pages[0].bands[14].cells[1].items[0];
  assert(Math.abs(nidTbl.heightPt - 16.3) <= 0.2, `NID বক্সের উচ্চতা 16.3pt হয়নি: ${nidTbl.heightPt}`);
  const nidBottomY = nidTbl.rect.y + nidTbl.heightPt;
  assert(Math.abs(nidBottomY - 375.25) <= 0.5, `NID বক্সের নিচের রেখা মূলের 375.25-এর কাছে আসেনি: ${nidBottomY}`);

  // সংখ্যা-বাক্সের বাম ইনডেন্টে +108 dxa (+5.4pt) বাড়তি যোগ না হওয়া যাচাই:
  // তারিখঃ বক্স: indentPt = 1pt (20 dxa, আগে 128 dxa ছিল)
  // NID বক্স: indentPt = 9.8pt (196 dxa, আগে 304 dxa ছিল)
  // অবসর গ্রহণের তারিখ বক্স: indentPt = 32.4pt (648 dxa, আগে 756 dxa ছিল)
  assert(xml.includes('<w:tblInd w:w="20" w:type="dxa"/>'), 'তারিখঃ বক্সের tblInd 20 dxa হয়নি');
  assert(xml.includes('<w:tblInd w:w="196" w:type="dxa"/>'), 'NID বক্সের tblInd 196 dxa হয়নি');
  assert(xml.includes('<w:tblInd w:w="648" w:type="dxa"/>'), 'অবসর গ্রহণের তারিখ বক্সের tblInd 648 dxa হয়নি');
});

// ৬. ধূসর টেবিলের (০৫ নং ক্রমিক) খাড়া ও আড়া বর্ডারগুলোর অবস্থান ও সংখ্যা মূলের সাথে মেলা যাচাই
await test('৬. ধূসর টেবিলের ৬টি খাড়া বর্ডার (27.25, 55.25, 253, 300.5, 367.25, 525.75) ও ৪টি আড়া বর্ডার (427.25, 457.5, 488, 518.5) মূলের জায়গায় আসে', async () => {
  setSwitch(true);
  const irOn = FayzarLayoutIR.build(clone(measuresData.cap), clone(measuresData.measures), clone(measuresData.pageInfo));
  const greyTbl = irOn.pages[0].bands[17].cells[0].items[0];

  // ১) সব কলাম-বিভাজক রেখা পূর্ণ-উচ্চতার (fullVRule = [true, true, true, true]) যাতে ৩য় ও ৪র্থ কলাম মার্জ না হয়
  assert(Array.isArray(greyTbl.fullVRule) && greyTbl.fullVRule.length === 4 && greyTbl.fullVRule.every(Boolean),
    `ধূসর টেবিলের fullVRule সবগুলো true হয়নি: ${JSON.stringify(greyTbl.fullVRule)}`);

  // ২) কলামের খাড়া বর্ডারগুলোর অবস্থান যাচাই
  const R = greyTbl.rect;
  let accX = R.x;
  const vEdges = [R.x, ...greyTbl.colFractions.map((f) => (accX += f * R.w, accX))];
  const expectedV = [27.25, 55.25, 253, 300.5, 367.25, 525.75];
  expectedV.forEach((exp, idx) => {
    assert(Math.abs(vEdges[idx] - exp) <= 0.8, `ধূসর টেবিলের ${idx}-নং খাড়া বর্ডার মূলের (${exp}) কাছে আসেনি: ${vEdges[idx].toFixed(2)}`);
  });

  // ৩) আড়া বর্ডারগুলোর অবস্থান যাচাই
  let accY = greyTbl.srcRulesPt[0];
  const hEdges = [accY, ...greyTbl.rowHeightsPt.map((h) => (accY += h, accY))];
  const expectedH = [427.25, 457.5, 488, 518.5];
  expectedH.forEach((exp, idx) => {
    assert(Math.abs(hEdges[idx] - exp) <= 1.0, `ধূসর টেবিলের ${idx}-নং আড়া বর্ডার মূলের (${exp}) কাছে আসেনি: ${hEdges[idx].toFixed(2)}`);
  });

  // ৪) শিরোনাম-সারির পটভূমি হালকা ধূসর (D9D9D9) হওয়া যাতে উপরের (427.25) ও নিচের (457.5) বর্ডার গ্রাস না হয়
  assert(greyTbl.headShade === 'D9D9D9', `ধূসর টেবিলের headShade D9D9D9 হয়নি: ${greyTbl.headShade}`);

  // ৫) XML-এ ২য় ও ৩য় সারিতে কোনো gridSpan না থাকা (৫টি কলামই আলাদা থাকা) যাচাই
  const { xml } = FayzarFaithfulDocx.bodyXml(clone(irSavedData));
  assert(!xml.includes('<w:gridSpan'), 'ধূসর টেবিলে অপ্রয়োজনীয় gridSpan রয়ে গেছে');
});

// ৭. লোগো, খাড়া চিত্র (ব্লক ২৬), বিন্দু-রেখা ও নিচের ধূসর পট্টির উচ্চতা ও অবস্থান যাচাই
await test('৭. লোগো (55.2pt) ও খাড়া চিত্রের (88.3pt) উচ্চতা এবং নিচের ধূসর পট্টির অবস্থান (y=737.9) মূলের সাথে মেলে', async () => {
  setSwitch(true);
  const page = clone(irSavedData.pages[0]);
  const { els, f } = FayzarFaithfulDocx.planPage(page);
  assert(f === 1, `পাতার উল্লম্ব অনুপাত f=1 থাকা উচিত, পাওয়া গেছে: ${f}`);

  // ১) উপরের লোগো (Band 0): উচ্চতা 55.2pt (আগে 56.4 + 2 = 58.4pt ছিল)
  const logoIt = page.bands[0].cells[0].items[0];
  assert(Math.abs(logoIt.heightPt - 55.2) <= 0.2, `লোগোর উচ্চতা 55.2pt হয়নি: ${logoIt.heightPt}`);
  assert(Math.abs(els[0].h - 55.2) <= 0.2, `planPage-এ লোগোর উচ্চতা 55.2pt হয়নি: ${els[0].h}`);

  // ২) Band 20-এর খাড়া চিত্র ("NOC প্রদানকারী কর্মকর্তা কর্তৃক পূরণীয়", ব্লক ২৬): উচ্চতা 88.3pt (আগে 56.2pt ছিল)
  const vertFig = page.bands[20].cells[2].items[0];
  assert(Math.abs(vertFig.heightPt - 88.3) <= 0.2, `খাড়া চিত্রের উচ্চতা 88.3pt হয়নি: ${vertFig.heightPt}`);

  // ৩) নিচের ধূসর পট্টি (Band 25, "বিঃ দ্রঃ..."): ফন্ট 11pt, centerShiftPt 0, shadeRun false, এবং অবস্থান ~736.7pt (কালি 737.9pt)
  const footerIt = page.bands[25].cells[0].items[0];
  assert(footerIt.fontPt === 11, `নিচের পট্টির ফন্ট 11pt হয়নি: ${footerIt.fontPt}`);
  assert(footerIt.centerShiftPt === 0 && footerIt.indentPt === 0, 'নিচের পট্টির কেন্দ্র-সরণ ০ হয়নি');
  assert(footerIt.shadeRun === false, 'নিচের পট্টির shadeRun false হয়নি');

  let curY = page.margins.top;
  const starts = els.map((e) => {
    const s = curY + e.before * f;
    curY = s + e.h;
    return s;
  });
  // নিচের পট্টির শুরু ~736.7pt (কালি 737.9pt, আগে 724.7pt-এ উঠে গিয়েছিল)
  assert(Math.abs(starts[25] - 736.7) <= 1.5, `নিচের পট্টির উল্লম্ব অবস্থান মূলের কাছে আসেনি: ${starts[25]}`);
  assert(curY <= 755, `পাতার শেষ অবস্থান সীমার বাইরে গেছে: ${curY}`);
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
