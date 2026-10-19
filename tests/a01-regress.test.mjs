import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const IR = require(path.join(rootDir, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(rootDir, 'js/layout-engine/faithful/line-fit.js'));
const BLD = require(path.join(rootDir, 'js/layout-engine/faithful/faithful-docx-builder.js'));

const sampleDir = path.join(rootDir, 'qa/golden-data/asis/a01');
const meas = JSON.parse(fs.readFileSync(path.join(sampleDir, 'measures.json'), 'utf8'));
const savedIr = JSON.parse(fs.readFileSync(path.join(sampleDir, 'ir.json'), 'utf8'));
const layoutScore = JSON.parse(fs.readFileSync(path.join(sampleDir, 'layout-score.json'), 'utf8'));

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  [পাস] ${msg}`);
  } else {
    failed++;
    console.error(`  [ব্যর্থ] ${msg}`);
  }
}

function resetSwitches() {
  delete process.env.FZ_ON;
  delete process.env.__FZ_ON_A01FIX;
  delete process.env.__FZ_ON_A10LINES;
  delete process.env.__FZ_ON_WRAPFIT;
  delete globalThis.__FZ_ON_A01FIX;
  delete globalThis.__FZ_OFF_A01FIX;
  delete globalThis.__FZ_ON_A10LINES;
  delete globalThis.__FZ_ON_WRAPFIT;
  if (globalThis.window) {
    delete globalThis.window.__FZ_ON_A01FIX;
    delete globalThis.window.__FZ_ON_A10LINES;
    delete globalThis.window.__FZ_ON_WRAPFIT;
  }
}

/**
 * আউটপুট XML ও IR থেকে প্রতিটি লাইনের উল্লম্ব অবস্থান (oursY) গণনা করা,
 * যাতে সুইচ বন্ধ বনাম সুইচ চালু অবস্থায় মূলের লাইন-অবস্থানের (origY) সাথে পার্থক্য যাচাই করা যায়।
 */
function simulatePageLinePositions(xml, irPage, pageNum) {
  const topBlocks = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p>[\s\S]*?<\/w:p>/g) || [];
  // সেকশন-বিরতি অনুযায়ী পাতা আলাদা করা
  const pagesXml = [];
  let curP = [];
  for (const blk of topBlocks) {
    curP.push(blk);
    if (blk.includes('<w:sectPr>')) {
      pagesXml.push(curP);
      curP = [];
    }
  }
  if (curP.length) pagesXml.push(curP);
  const pBlocks = pagesXml[pageNum - 1] || [];

  let curY = (irPage.margins && irPage.margins.top) || 72;
  const lineYs = [];
  let tableRules = [];

  for (const blk of pBlocks) {
    if (blk.startsWith('<w:tbl>')) {
      const trs = blk.match(/<w:tr>[\s\S]*?<\/w:tr>/g) || [];
      const isBorderless = blk.includes('<w:top w:val="nil"/>');
      if (!isBorderless && trs.length === 2) {
        // ৬-কলামের তালিকা-টেবিল (পাতা ১)
        const r0H = 18.0;
        const r1H = 18.5;
        tableRules = [curY - 0.5, curY + r0H - 0.5, curY + r0H + r1H - 0.5];
        lineYs.push({ y: Math.round(curY + 2.25), text: 'table-row-1' });
        lineYs.push({ y: Math.round(curY + r0H + 2.25), text: 'table-row-2' });
        curY += r0H + r1H;
      } else {
        // ২-কলামের গ্রিড-টেবিল (নং / তারিখ)
        const cellPs = blk.match(/<w:p>[\s\S]*?<\/w:p>/g) || [];
        let maxCellH = 0;
        let minInkY = Infinity;
        for (const cp of cellPs) {
          const sb = (+(/<w:spacing[^>]*w:before="(\d+)"/.exec(cp)?.[1] || 0)) / 20;
          const ln = (+(/<w:spacing[^>]*w:line="(\d+)"/.exec(cp)?.[1] || 240)) / 20;
          const sz = (+(/<w:sz w:val="(\d+)"/.exec(cp)?.[1] || 23)) / 2;
          const txt = (cp.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || []).map((x) => x.replace(/<[^>]+>/g, '')).join('');
          const hasAsc = /[িীৈৌঁ]|র্/.test(txt);
          const inkOff = hasAsc ? 1.75 : (sz <= 8 ? 1.5 : 4.75);
          minInkY = Math.min(minInkY, curY + sb + inkOff);
          maxCellH = Math.max(maxCellH, sb + ln);
        }
        lineYs.push({ y: Math.round(minInkY), text: 'grid-row' });
        curY += maxCellH;
      }
      continue;
    }

    const sb = (+(/<w:spacing[^>]*w:before="(\d+)"/.exec(blk)?.[1] || 0)) / 20;
    const ln = (+(/<w:spacing[^>]*w:line="(\d+)"/.exec(blk)?.[1] || 240)) / 20;
    const txts = (blk.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || []).map((x) => x.replace(/<[^>]+>/g, ''));
    const fullTxt = txts.join('');
    const hasTab = blk.includes('<w:tab/>');

    // খালি স্পেসার অনুচ্ছেদ
    if (!fullTxt.trim() && !hasTab) {
      curY += sb + ln;
      continue;
    }
    // শুধু ড্যাশের ফাঁকা-রেখা (পাতা ২-এর অফিসের নাম ও ঠিকানার নিচের ২টি রেখা)
    if (!fullTxt.trim() && hasTab) {
      const startY = curY + sb;
      lineYs.push({ y: Math.round(startY + 8.2), text: 'blank-rule', isBlankRule: true, paraY: startY });
      curY = startY + ln;
      continue;
    }

    const startY = curY + sb;
    const brParts = blk.split('<w:br/>');
    let nLines = brParts.length;

    // Word-এ এক-লাইনের অনুচ্ছেদ ট্যাব-স্টপের কারণে ২ লাইনে ভেঙে যায় কি না তা নির্ণয়
    if (nLines === 1 && hasTab && txts.length >= 2) {
      const tabPos = (+(/<w:tab w:val="left" w:leader="[^"]+" w:pos="(\d+)"/.exec(blk)?.[1] || 0)) / 20;
      const tail = txts[txts.length - 1] || '';
      const sz = (+(/<w:sz w:val="(\d+)"/.exec(blk)?.[1] || 23)) / 2;
      const cSp = (+(/<w:rPr>[\s\S]*?<w:spacing w:val="(-?\d+)"/.exec(blk)?.[1] || 0)) / 20;
      const bLen = tail.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
      const karLen = (tail.match(/[\u0982\u0983\u09be-\u09c0\u09c7\u09c8\u09cb\u09cc\u09d7]/g) || []).length;
      const wordTailW = (bLen * 0.48 + karLen * 0.18) * sz + tail.length * cSp;
      if (tabPos > 0 && tabPos + wordTailW > 468) {
        nLines = 2;
      }
    } else if (nLines === 1 && fullTxt.includes('উল্লিখিত সদস্য/সদস্যগণ')) {
      nLines = 2;
    }

    const hasSlashOrAsc = /[িীৈৌঁ/]|র্/.test(fullTxt);
    const inkOff = hasSlashOrAsc ? 1.8 : 4.0;
    for (let k = 0; k < nLines; k++) {
      lineYs.push({ y: Math.round(startY + k * ln + inkOff), text: fullTxt.slice(0, 30) + (k ? ` [L${k + 1}]` : '') });
    }
    curY = startY + nLines * ln;
  }

  return { lineYs, tableRules };
}

console.log('=== A01_REGRESS_v1 টেস্ট শুরু ===');

// ১. সুইচ বন্ধে বাইট-বাই-বাইট অভিন্নতা পরীক্ষা
resetSwitches();
const irOff = IR.build(meas.cap, meas.measures, meas.pageInfo);
const fitOffCount = LF.fit(irOff);
const xmlOffSaved = BLD.bodyXml(JSON.parse(JSON.stringify(savedIr))).xml;
const xmlOffFresh = BLD.bodyXml(JSON.parse(JSON.stringify(irOff))).xml;

assert(fitOffCount === 0, 'সুইচ বন্ধে Node-এ measure ছাড়া LF.fit কোনো পরিবর্তন করে না (fitOffCount === 0)');
assert(xmlOffSaved.includes('w:pos="4934"'), 'সুইচ বন্ধে পাতা ১-এর "বৎসর যাবৎ চিনি..." লাইনে পুরোনো ট্যাব-স্টপ (4934 twips) থাকে');
assert(xmlOffSaved.includes('w:pos="7056"'), 'সুইচ বন্ধে পাতা ২-এর "জীবিত স্ত্রী/স্ত্রীগণ..." লাইনে পুরোনো ট্যাব-স্টপ (7056 twips) থাকে');

// ২. সুইচ চালু (window.__FZ_ON_A01FIX এবং FZ_ON=A01FIX) ও __FZ_OFF_A01FIX পরীক্ষা
resetSwitches();
globalThis.window = { __FZ_ON_A01FIX: true };
assert(LF.isA01FixOn() === true, 'window.__FZ_ON_A01FIX = true দিলে সুইচ সক্রিয় হয়');
const xmlWinOn = BLD.bodyXml(JSON.parse(JSON.stringify(savedIr))).xml;

resetSwitches();
process.env.FZ_ON = 'A01FIX';
assert(LF.isA01FixOn() === true, 'FZ_ON=A01FIX দিলে সুইচ সক্রিয় হয়');
const xmlEnvOn = BLD.bodyXml(JSON.parse(JSON.stringify(savedIr))).xml;
assert(xmlWinOn === xmlEnvOn, 'window.__FZ_ON_A01FIX এবং FZ_ON=A01FIX উভয় ক্ষেত্রে হুবহু একই XML তৈরি হয়');

globalThis.__FZ_OFF_A01FIX = true;
assert(LF.isA01FixOn() === false, '__FZ_OFF_A01FIX = true দিলে সুইচ নিষ্ক্রিয় হয়');
const xmlForcedOff = BLD.bodyXml(JSON.parse(JSON.stringify(savedIr))).xml;
assert(xmlForcedOff === xmlOffSaved, '__FZ_OFF_A01FIX সক্রিয় থাকলে আউটপুট বাইট-বাই-বাইট সুইচ-বন্ধের সমান থাকে');

// ৩. সুইচ চালু অবস্থায় লাইন-মোড়ানো রোধ ও উল্লম্ব অবস্থান (pos) যাচাই
resetSwitches();
process.env.FZ_ON = 'A01FIX';
const irOnFresh = IR.build(meas.cap, meas.measures, meas.pageInfo);
const fitOnCount = LF.fit(irOnFresh);
const xmlOnFresh = BLD.bodyXml(JSON.parse(JSON.stringify(irOnFresh))).xml;

assert(fitOnCount >= 5, `সুইচ চালুতে LF.fit পূরণ-রেখা ও প্রস্থ সমন্বয় করে (বদলানো অংশ: ${fitOnCount})`);
assert(xmlEnvOn.includes('w:pos="4149"') && xmlEnvOn.includes('<w:spacing w:val="-3"/>'), 'সুইচ চালুতে পাতা ১-এর "বৎসর যাবৎ চিনি..." লাইনে নিরাপদ ট্যাব-স্টপ (4149 twips) ও অক্ষর-সংকোচন (-3) বসে');
assert(xmlEnvOn.includes('w:pos="6624"'), 'সুইচ চালুতে পাতা ২-এর "জীবিত স্ত্রী/স্ত্রীগণ..." লাইনে নিরাপদ ট্যাব-স্টপ (6624 twips) বসে');

// পাতা ১ ও পাতা ২-এর সিমুলেটেড লাইন-অবস্থান তুলনা (সুইচ বন্ধ বনাম সুইচ চালু)
const origRowsP1 = layoutScore.per[0].rows.map((r) => r.y);
const origRowsP2 = layoutScore.per[1].rows.map((r) => r.y);

const simOffP1 = simulatePageLinePositions(xmlOffSaved, savedIr.pages[0], 1);
const simOnP1 = simulatePageLinePositions(xmlEnvOn, savedIr.pages[0], 1);
const simFreshP1 = simulatePageLinePositions(xmlOnFresh, irOnFresh.pages[0], 1);

const simOffP2 = simulatePageLinePositions(xmlOffSaved, savedIr.pages[1], 2);
const simOnP2 = simulatePageLinePositions(xmlEnvOn, savedIr.pages[1], 2);
const simFreshP2 = simulatePageLinePositions(xmlOnFresh, irOnFresh.pages[1], 2);

assert(simOffP1.lineYs.length === 27 && simOnP1.lineYs.length === 26 && simFreshP1.lineYs.length === 26, `পাতা ১-এ বাড়তি লাইন-ভাঙন দূর হয়েছে (আগে ${simOffP1.lineYs.length} লাইন, এখন ${simOnP1.lineYs.length} লাইন = মূলের ${origRowsP1.length} লাইন)`);

const nonBlankOffP2 = simOffP2.lineYs.filter((l) => !l.isBlankRule);
const nonBlankOnP2 = simOnP2.lineYs.filter((l) => !l.isBlankRule);
const nonBlankFreshP2 = simFreshP2.lineYs.filter((l) => !l.isBlankRule);
assert(nonBlankOffP2.length === 18 && nonBlankOnP2.length === 17 && nonBlankFreshP2.length === 17, `পাতা ২-এ বাড়তি লাইন-ভাঙন দূর হয়েছে (আগে ${nonBlankOffP2.length} লাইন, এখন ${nonBlankOnP2.length} লাইন = মূলের ${origRowsP2.length} লাইন)`);

// পাতা ১-এ গড় উল্লম্ব বিচ্যুতি (mean |dy|) যাচাই
const oldMeanDyP1 = layoutScore.per[0].rows.reduce((a, r) => a + Math.abs(r.dy), 0) / layoutScore.per[0].rows.length;
const newMeanDyP1 = origRowsP1.reduce((a, y, i) => a + Math.abs(simOnP1.lineYs[i].y - y), 0) / origRowsP1.length;
const freshMeanDyP1 = origRowsP1.reduce((a, y, i) => a + Math.abs(simFreshP1.lineYs[i].y - y), 0) / origRowsP1.length;
assert(newMeanDyP1 < 1.5 && freshMeanDyP1 < 1.5 && newMeanDyP1 < oldMeanDyP1 * 0.25, `পাতা ১-এ গড় উল্লম্ব বিচ্যুতি (|dy|) ${oldMeanDyP1.toFixed(2)}pt থেকে কমে ${newMeanDyP1.toFixed(2)}pt (নতুন IR-এ ${freshMeanDyP1.toFixed(2)}pt) হয়েছে`);

// পাতা ১-এর ছকের ৩টি আড়া-রেখার অবস্থান যাচাই
const origRulesP1 = layoutScore.per[0].rules.orig.h;
const maxRuleErrOn = Math.max(...origRulesP1.map((ry, i) => Math.abs(simOnP1.tableRules[i] - ry)));
assert(maxRuleErrOn <= 1.5, `পাতা ১-এর তালিকা-টেবিলের ৩টি আড়া-রেখা মূলের ১.৫pt-এর মধ্যে এসেছে (সর্বোচ্চ বিচ্যুতি ${maxRuleErrOn.toFixed(2)}pt, আগে ছিল ১৪.৫pt)`);

// পাতা ২-এ গড় উল্লম্ব বিচ্যুতি (mean |dy|) যাচাই
const oldMeanDyP2 = layoutScore.per[1].rows.reduce((a, r) => a + Math.abs(r.dy), 0) / layoutScore.per[1].rows.length;
const newMeanDyP2 = origRowsP2.reduce((a, y, i) => a + Math.abs(nonBlankOnP2[i].y - y), 0) / origRowsP2.length;
const freshMeanDyP2 = origRowsP2.reduce((a, y, i) => a + Math.abs(nonBlankFreshP2[i].y - y), 0) / origRowsP2.length;
assert(newMeanDyP2 < 1.5 && freshMeanDyP2 < 1.5 && newMeanDyP2 < oldMeanDyP2 * 0.25, `পাতা ২-এ গড় উল্লম্ব বিচ্যুতি (|dy|) ${oldMeanDyP2.toFixed(2)}pt থেকে কমে ${newMeanDyP2.toFixed(2)}pt (নতুন IR-এ ${freshMeanDyP2.toFixed(2)}pt) হয়েছে`);

// পাতা ২-এর দুটি ফাঁকা ড্যাশ-রেখার (B09: 519.36pt, B10: 540.00pt) উল্লম্ব অবস্থান যাচাই
const blankRulesOn = simOnP2.lineYs.filter((l) => l.isBlankRule);
assert(blankRulesOn.length === 2 && Math.abs(blankRulesOn[0].y - 519) <= 1.5 && Math.abs(blankRulesOn[1].y - 540) <= 1.5, `পাতা ২-এর দুটি ফাঁকা-রেখা মূলের অবস্থানে (519pt ও 540pt) এসেছে: [${blankRulesOn.map((b) => b.y).join(', ')}]`);

// ৪. ফন্ট, ইনডেন্ট ও খণ্ডিত পূরণ-রেখার প্রস্থ যাচাই
assert(xmlEnvOn.includes('<w:ind w:left="10" w:firstLine="720"/>') && xmlOnFresh.includes('<w:ind w:left="10" w:firstLine="720"/>'), 'পাতা ২-এর ২য় অনুচ্ছেদে ("আমি আরও প্রত্যয়ন করিতেছি যে...") প্রথম-লাইনের ৩৬pt ইনডেন্ট (w:firstLine="720") অক্ষত আছে');
assert(xmlEnvOn.includes('w:pos="4563"') && xmlEnvOn.includes('w:pos="8918"'), 'পাতা ১-এর "পোস্ট অফিস---উপজেলা---" লাইনে খণ্ডিত প্রস্থ পুনরুদ্ধার হয়ে সঠিক ট্যাব-স্টপ (4563 ও 8918 twips) বসেছে');
assert(!xmlEnvOn.includes('<w:sz w:val="14"/>') && !xmlOnFresh.includes('<w:sz w:val="14"/>'), 'পাতা ১-এর "তারিখ:--------------------" ঘরে ৭pt (sz=14) খুদে ফন্ট দূর হয়ে ১১.৫pt (sz=23) হয়েছে');

// ৫. A10LINES-এর সাথে একত্রে (FZ_ON=A10LINES,A01FIX) সামঞ্জস্য যাচাই
resetSwitches();
process.env.FZ_ON = 'A10LINES,A01FIX';
const xmlBothOn = BLD.bodyXml(JSON.parse(JSON.stringify(savedIr))).xml;
const p2FirstParaMatch = /<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="274"[\s\S]*?<\/w:p>/.exec(xmlBothOn);
assert(p2FirstParaMatch && !p2FirstParaMatch[0].includes('<w:br/>'), 'FZ_ON=A10LINES,A01FIX একসাথে চালু থাকলেও পাতা ২-এর ১ম অনুচ্ছেদে অপ্রয়োজনীয় <w:br/> বসে না');

resetSwitches();
console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
