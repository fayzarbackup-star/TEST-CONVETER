/**
 * INDENT_v1 — ইনডেন্ট, অ্যালাইনমেন্ট, ট্যাব-স্টপ, ঘরের প্যাডিং ও twip রূপান্তর যাচাই পরীক্ষা
 * চালানোর নিয়ম: node tests/indent.test.mjs
 * শূন্য বাহ্যিক নির্ভরতা — সম্পূর্ণ অফলাইনে চলে।
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ডিফল্ট ৫টি সুইচ চালু করা
['WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX'].forEach((k) => { globalThis['__FZ_ON_' + k] = true; }); // টেস্ট যে ভিত্তিতে লেখা — প্রোডাকশন-ডিফল্ট বদলালেও স্থির
const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`✗ ব্যর্থ: ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

function bytesEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function loadRun(name) {
  const dir = path.join(ROOT, 'qa/golden-data/runs/base5', name);
  const measures = JSON.parse(fs.readFileSync(path.join(dir, 'measures.json'), 'utf8'));
  const ir = JSON.parse(fs.readFileSync(path.join(dir, 'ir.json'), 'utf8'));
  return { measures, ir };
}

function setIndentSwitch(on, off = false) {
  if (on) {
    globalThis.__FZ_ON_INDENT = true;
    process.env.FZ_ON = 'WRAPFIT,NESTBOX,TBLMERGE,A03FIX,A16FIX,INDENT';
  } else {
    delete globalThis.__FZ_ON_INDENT;
    process.env.FZ_ON = 'WRAPFIT,NESTBOX,TBLMERGE,A03FIX,A16FIX';
  }
  if (off) {
    globalThis.__FZ_OFF_INDENT = true;
    process.env.FZ_OFF = 'INDENT';
  } else {
    delete globalThis.__FZ_OFF_INDENT;
    delete process.env.FZ_OFF;
  }
}

const runs = {
  a09: loadRun('a09'),
  a12: loadRun('a12'),
  a16: loadRun('a16')
};

// ============================================================================
// ১. সুইচ বন্ধ (ডিফল্ট) ও FZ_OFF=INDENT অবস্থায় ১০০% বাইট-টু-বাইট অভিন্নতা যাচাই
// ============================================================================
setIndentSwitch(false, false);
check('ডিফল্ট অবস্থায় IR.indentOn() === false', IR.indentOn() === false);
check('ডিফল্ট অবস্থায় LF.isIndentOn() === false', LF.isIndentOn() === false);

const baseline = {};
for (const [name, data] of Object.entries(runs)) {
  setIndentSwitch(false, false);
  const irFromBuildOff = IR.build(clone(data.measures.cap), clone(data.measures.measures), clone(data.measures.pageInfo));
  LF.fit(irFromBuildOff);
  const xmlFromBuildOff = DB.bodyXml(clone(irFromBuildOff)).xml;
  const xmlFromSavedOff = DB.bodyXml(clone(data.ir)).xml;
  const docxFromSavedOff = await DB.build(clone(data.ir), { JSZip: DB.MiniJSZip, type: 'uint8array' });
  baseline[name] = {
    irJson: JSON.stringify(irFromBuildOff),
    xmlBuild: xmlFromBuildOff,
    xmlSaved: xmlFromSavedOff,
    docxSaved: docxFromSavedOff
  };

  // সুইচ চালু করেও যখন __FZ_OFF_INDENT=true দেওয়া হয় তখনও যেন ১০০% অভিন্ন থাকে
  setIndentSwitch(true, true);
  check(`${name}: FZ_OFF=INDENT থাকলে IR.indentOn() === false`, IR.indentOn() === false);
  const irForceOff = IR.build(clone(data.measures.cap), clone(data.measures.measures), clone(data.measures.pageInfo));
  LF.fit(irForceOff);
  const xmlForceOffBuild = DB.bodyXml(clone(irForceOff)).xml;
  const xmlForceOffSaved = DB.bodyXml(clone(data.ir)).xml;
  const docxForceOffSaved = await DB.build(clone(data.ir), { JSZip: DB.MiniJSZip, type: 'uint8array' });

  check(`${name}: FZ_OFF=INDENT অবস্থায় নির্মিত IR হুবহু অপরিবর্তিত`, JSON.stringify(irForceOff) === baseline[name].irJson);
  check(`${name}: FZ_OFF=INDENT অবস্থায় নির্মিত XML হুবহু অপরিবর্তিত`, xmlForceOffBuild === baseline[name].xmlBuild);
  check(`${name}: FZ_OFF=INDENT অবস্থায় সংরক্ষিত IR থেকে XML হুবহু অপরিবর্তিত`, xmlForceOffSaved === baseline[name].xmlSaved);
  check(`${name}: FZ_OFF=INDENT অবস্থায় .docx বাইনারি ১০০% বাইট-টু-বাইট অভিন্ন`, bytesEqual(docxForceOffSaved, baseline[name].docxSaved));
}

// ============================================================================
// ২. সুইচ চালু (__FZ_ON_INDENT=true / FZ_ON=INDENT) অবস্থায় প্রত্যাশিত ind / tabs / jc যাচাই
// ============================================================================
setIndentSwitch(true, false);
check('সুইচ চালু অবস্থায় IR.indentOn() === true', IR.indentOn() === true);
check('সুইচ চালু অবস্থায় LF.isIndentOn() === true', LF.isIndentOn() === true);

// --- ২ক. a12 যাচাই (প্রথম-লাইন ইনডেন্ট, ক্রমিক স্ন্যাপ, কোলনহীন ট্যাব-অনুচ্ছেদ ও ডান-অর্ধেকের স্বাক্ষর ব্লক) ---
{
  const irSaved = clone(runs.a12.ir);
  LF.fit(irSaved);
  const xmlSaved = DB.bodyXml(clone(irSaved)).xml;
  const docxSavedOn = await DB.build(clone(irSaved), { JSZip: DB.MiniJSZip, type: 'uint8array' });
  check('a12: সুইচ চালু করলে আউটপুট XML পরিবর্তিত হয়', xmlSaved !== baseline.a12.xmlSaved);
  check('a12: সুইচ চালু করলে বৈধ .docx ফাইল তৈরি হয় (PK হেডার)', docxSavedOn.length > 1000 && docxSavedOn[0] === 0x50 && docxSavedOn[1] === 0x4b);

  const irBuilt = IR.build(clone(runs.a12.measures.cap), clone(runs.a12.measures.measures), clone(runs.a12.measures.pageInfo));
  LF.fit(irBuilt);

  for (const [label, ir] of [['saved-IR', irSaved], ['built-IR', irBuilt]]) {
    const p1 = ir.pages[0];
    const avW = p1.widthPt - p1.margins.left - p1.margins.right;

    // ব্যান্ড ৩: প্রথম লাইনের ইনডেন্ট (firstIndentPt = 36pt -> w:firstLine="720") পুনরুদ্ধার
    const b3 = p1.bands[3].cells[0].items[0];
    const ppr3 = DB.pPr(b3, 0);
    check(`a12 (${label}) ব্যান্ড ৩: firstIndentPt === 36`, b3.firstIndentPt === 36, `পাওয়া গেছে ${b3.firstIndentPt}`);
    check(`a12 (${label}) ব্যান্ড ৩: pPr-এ w:firstLine="720" ও w:jc="both"`, ppr3.includes('w:firstLine="720"') && ppr3.includes('w:jc w:val="both"'), ppr3);

    // ব্যান্ড ৭ ও ৮ ("৩।" ও "৪।"): হালকা কালির বিচ্যুত ইনডেন্ট 8.6pt থেকে 0.5pt (w:left="10")-এ স্ন্যাপ
    const b7 = p1.bands[7].cells[0].items[0];
    const b8 = p1.bands[8].cells[0].items[0];
    check(`a12 (${label}) ব্যান্ড ৭ ("৩।"): indentPt === 0.5 ও w:left="10"`, b7.indentPt === 0.5 && DB.pPr(b7, 0).includes('w:left="10"'));
    check(`a12 (${label}) ব্যান্ড ৮ ("৪।"): indentPt === 0.5 ও w:left="10"`, b8.indentPt === 0.5 && DB.pPr(b8, 0).includes('w:left="10"'));

    // ব্যান্ড ১৫ ("(২)\tআমি আরও ঘোষণা..."): ভ্রান্ত ২য় ট্যাব-স্টপ (888) ও ধারাবাহিক লাইনের \t\t অপসারণ, একক <w:p> ও w:jc="both"
    const b15 = p1.bands[15].cells[0].items[0];
    const xml15 = DB.paraXml(b15, 0, { media: [], availW: avW });
    check(`a12 (${label}) ব্যান্ড ১৫: একক ট্যাব-স্টপ [36] ও fontPt === 12`, b15.tabStops.length === 1 && b15.tabStops[0] === 36 && b15.fontPt === 12);
    check(`a12 (${label}) ব্যান্ড ১৫: ২য় ও ৩য় লাইনে শুরুতে বাড়তি \\t নেই`, !b15.tabLines[1].startsWith('\t') && !b15.tabLines[2].startsWith('\t'));
    check(`a12 (${label}) ব্যান্ড ১৫: একক <w:p> অনুচ্ছেদ ও w:jc="both"`, (xml15.match(/<w:p>/g) || []).length === 1 && xml15.includes('w:pos="720"') && !xml15.includes('w:pos="888"') && xml15.includes('w:jc w:val="both"'));

    // ব্যান্ড ১৮ ("নিয়ন্ত্রণকারী কর্তৃপক্ষের তারিখসহ স্বাক্ষর\nসীলমোহর (নামযুক্ত)"): indentPt=305.8, fi=-36, w:left="6836", w:hanging="720", w:jc="left"
    const b18 = p1.bands[18].cells[0].items[0];
    const ppr18 = DB.pPr(b18, 0);
    check(`a12 (${label}) ব্যান্ড ১৮: indentPt === 305.8 ও firstIndentPt === -36`, b18.indentPt === 305.8 && b18.firstIndentPt === -36);
    check(`a12 (${label}) ব্যান্ড ১৮: w:left="6836" w:hanging="720" ও w:jc="left"`, ppr18.includes('w:left="6836"') && ppr18.includes('w:hanging="720"') && ppr18.includes('w:jc w:val="left"'), ppr18);
  }
}

// --- ২খ. a09 যাচাই (ব্লক বাম-ইনডেন্ট, ইনলাইন লিডার ট্যাব-স্টপ, ঝুলন্ত ক্রমিক তালিকা ও স্বাক্ষর ব্লক) ---
{
  const irSaved = clone(runs.a09.ir);
  LF.fit(irSaved);
  const xmlSaved = DB.bodyXml(clone(irSaved)).xml;
  const docxSavedOn = await DB.build(clone(irSaved), { JSZip: DB.MiniJSZip, type: 'uint8array' });
  check('a09: সুইচ চালু করলে আউটপুট XML পরিবর্তিত হয়', xmlSaved !== baseline.a09.xmlSaved);
  check('a09: সুইচ চালু করলে বৈধ .docx ফাইল তৈরি হয় (PK হেডার)', docxSavedOn.length > 1000 && docxSavedOn[0] === 0x50 && docxSavedOn[1] === 0x4b);

  const irBuilt = IR.build(clone(runs.a09.measures.cap), clone(runs.a09.measures.measures), clone(runs.a09.measures.pageInfo));
  LF.fit(irBuilt);

  for (const [label, ir] of [['saved-IR', irSaved], ['built-IR', irBuilt]]) {
    const p1 = ir.pages[0];
    const avW = p1.widthPt - p1.margins.left - p1.margins.right;

    // ব্যান্ড ১ (শিরোনাম): প্রস্থ-ভিত্তিক ফন্ট 14pt ও কেন্দ্র-সরণ w:right="20"
    const b1 = p1.bands[1].cells[0].items[0];
    const ppr1 = DB.pPr(b1, 0);
    check(`a09 (${label}) ব্যান্ড ১: fontPt === 14 ও w:right="20"`, b1.fontPt === 14 && ppr1.includes('w:right="20"'), ppr1);

    // ব্যান্ড ৩ আইটেম ১ ("বর্তমান ঠিকানা: --------"): একক প্রান্তিক পূরণ-রেখায় ডান-লিডার ট্যাব (w:pos="8956")
    const b3i1 = p1.bands[3].cells[0].items[1];
    const xml3i1 = DB.paraXml(b3i1, 0, { media: [], availW: avW });
    check(`a09 (${label}) ব্যান্ড ৩ আইটেম ১: ডান হাইফেন লিডার ট্যাব w:pos="8956"`, xml3i1.includes('w:val="right" w:leader="hyphen" w:pos="8956"'), xml3i1);

    // ব্যান্ড ৬ ("উপজেলা: --- জেলা: ---এর") ও ব্যান্ড ৭ ("বৈধ উত্তরাধিকারী... ---কে"): পূর্ণ প্রস্থের লিডার ট্যাব-স্টপ
    const xml6 = DB.paraXml(p1.bands[6].cells[0].items[0], 0, { media: [], availW: avW });
    const xml7 = DB.paraXml(p1.bands[7].cells[0].items[0], 0, { media: [], availW: avW });
    check(`a09 (${label}) ব্যান্ড ৬: ২য় লিডার ট্যাব-স্টপ w:pos="9090"`, xml6.includes('w:pos="9090"'), xml6);
    check(`a09 (${label}) ব্যান্ড ৭: লিডার ট্যাব-স্টপ w:pos="9166"`, xml7.includes('w:pos="9166"'), xml7);

    // ব্যান্ড ৮ ("অভিভাবক নিযুক্ত করিলাম...") ও ব্যান্ড ১২ ("বি:দ্র: মনোনীত ব্যক্তিগণ..."): ব্লক বাম-ইনডেন্ট 36pt (w:left="720") পুনরুদ্ধার
    const b8 = p1.bands[8].cells[0].items[0];
    const b12 = p1.bands[12].cells[0].items[0];
    check(`a09 (${label}) ব্যান্ড ৮: indentPt === 36 ও w:left="720"`, b8.indentPt === 36 && DB.pPr(b8, 0).includes('w:left="720"'));
    check(`a09 (${label}) ব্যান্ড ১২: indentPt === 36, fontPt === 12 ও w:left="720"`, b12.indentPt === 36 && b12.fontPt === 12 && DB.pPr(b12, 0).includes('w:left="720"'));

    // ব্যান্ড ১০ ("২।\t----- নং ক্রমিকে..."): একক ট্যাব-স্টপ [36.5], fi=-36.5, w:left="730" w:hanging="730", একক <w:p> ও w:jc="both"
    const b10 = p1.bands[10].cells[0].items[0];
    const xml10 = DB.paraXml(b10, 0, { media: [], availW: avW });
    check(`a09 (${label}) ব্যান্ড ১০: একক ট্যাব-স্টপ [36.5], fi === -36.5 ও fontPt === 12`, b10.tabStops.length === 1 && b10.tabStops[0] === 36.5 && b10.firstIndentPt === -36.5 && b10.fontPt === 12);
    check(`a09 (${label}) ব্যান্ড ১০: একক <w:p>, w:left="730" w:hanging="730" ও w:jc="both"`, (xml10.match(/<w:p>/g) || []).length === 1 && xml10.includes('w:left="730" w:hanging="730"') && !xml10.includes('w:pos="898"') && xml10.includes('w:jc w:val="both"'));

    // ব্যান্ড ১১ ("৩।\tউপর্যুক্ত স্বাক্ষরকারীগণ..."): ফন্ট 12pt পুনরুদ্ধার
    const b11 = p1.bands[11].cells[0].items[0];
    check(`a09 (${label}) ব্যান্ড ১১: fontPt === 12`, b11.fontPt === 12);

    // ব্যান্ড ১৪ ("সিটি কর্পোরেশনের কাউন্সিলর...\nসীলমোহর (নামযুক্ত)"): indentPt=170.4, fi=-128, w:left="5968" w:hanging="2560", w:jc="left"
    const b14 = p1.bands[14].cells[0].items[0];
    const ppr14 = DB.pPr(b14, 0);
    check(`a09 (${label}) ব্যান্ড ১৪: indentPt === 170.4 ও firstIndentPt === -128`, b14.indentPt === 170.4 && b14.firstIndentPt === -128);
    check(`a09 (${label}) ব্যান্ড ১৪: w:left="5968" w:hanging="2560" ও w:jc="left"`, ppr14.includes('w:left="5968"') && ppr14.includes('w:hanging="2560"') && ppr14.includes('w:jc w:val="left"'), ppr14);
  }
}

// --- ২গ. a16 যাচাই (স্মারকপত্র, প্রচ্ছদ বুলেট, চেকলিস্ট শিরোনাম/উপ-শিরোনাম, ছকের ক্রমিক কলাম ও অণু-স্বাক্ষর চিত্র) ---
{
  const irSaved = clone(runs.a16.ir);
  LF.fit(irSaved);
  const xmlSaved = DB.bodyXml(clone(irSaved)).xml;
  const docxSavedOn = await DB.build(clone(irSaved), { JSZip: DB.MiniJSZip, type: 'uint8array' });
  check('a16: সুইচ চালু করলে আউটপুট XML পরিবর্তিত হয়', xmlSaved !== baseline.a16.xmlSaved);
  check('a16: সুইচ চালু করলে বৈধ .docx ফাইল তৈরি হয় (PK হেডার)', docxSavedOn.length > 1000 && docxSavedOn[0] === 0x50 && docxSavedOn[1] === 0x4b);

  const irBuilt = IR.build(clone(runs.a16.measures.cap), clone(runs.a16.measures.measures), clone(runs.a16.measures.pageInfo));
  LF.fit(irBuilt);

  for (const [label, ir] of [['saved-IR', irSaved], ['built-IR', irBuilt]]) {
    const p1 = ir.pages[0];
    const avW1 = p1.widthPt - p1.margins.left - p1.margins.right;

    // পাতা ১ ব্যান্ড ১ ("স্মারক নং-..."): প্রকৃত বাম-ইনডেন্ট 40.3pt, keepJust=true ও w:jc="both"
    const p1b1 = p1.bands[1].cells[0].items[0];
    check(`a16 (${label}) পাতা ১ ব্যান্ড ১: indentPt === 40.3 ও keepJust === true`, p1b1.indentPt === 40.3 && p1b1.keepJust === true && DB.pPr(p1b1, 0).includes('w:jc w:val="both"'));

    // পাতা ১ ব্যান্ড ২ ("পদ সৃজন, পদ স্থায়ীকরণ..."): প্রথম-লাইন ইনডেন্টযুক্ত অনুচ্ছেদের বাম-ইনডেন্ট 44.6pt (w:left="892")
    const p1b2 = p1.bands[2].cells[0].items[0];
    check(`a16 (${label}) পাতা ১ ব্যান্ড ২: indentPt === 44.6 ও w:left="892"`, p1b2.indentPt === 44.6 && DB.pPr(p1b2, 0).includes('w:left="892"'));

    // পাতা ১ ব্যান্ড ৫ ("**পুর্শিয়া আক্তার**..."): কেন্দ্র-অ্যালাইনমেন্ট (align='c', centerShiftPt=160.8, w:left="6432", w:jc="center")
    const p1b5 = p1.bands[5].cells[0].items[0];
    const ppr1b5 = DB.pPr(p1b5, 0);
    check(`a16 (${label}) পাতা ১ ব্যান্ড ৫: align === 'c', centerShiftPt === 160.8 ও w:jc="center"`, p1b5.align === 'c' && p1b5.centerShiftPt === 160.8 && ppr1b5.includes('w:left="6432"') && ppr1b5.includes('w:jc w:val="center"'), ppr1b5);

    // পাতা ১ ব্যান্ড ৯, ১১, ১৩ ("২.", "৪.", "৬."): stripGhostDots-এর পরেও একক <w:p> ও w:jc="both" অক্ষুণ্ণ থাকা
    for (const bi of [9, 11, 13]) {
      const it = p1.bands[bi].cells[0].items[0];
      const xmlIt = DB.paraXml(it, 0, { media: [], availW: avW1 });
      check(`a16 (${label}) পাতা ১ ব্যান্ড ${bi}: একক <w:p> ও w:jc="both"`, (xmlIt.match(/<w:p>/g) || []).length === 1 && xmlIt.includes('<w:br/>') && xmlIt.includes('w:jc w:val="both"'));
    }

    // পাতা ২: বুলেট তালিকার ফন্ট 21pt (ব্যান্ড ০, ১, ২, ৪)
    const p2 = ir.pages[1];
    check(`a16 (${label}) পাতা ২ বুলেট তালিকা: ব্যান্ড ০,১,২,৪-এর fontPt === 21`, [0, 1, 2, 4].every((bi) => p2.bands[bi].cells[0].items[0].fontPt === 21));

    // পাতা ৩ উপ-শিরোনাম (13.5pt), পাতা ৫ শিরোনাম (19.5pt) ও পাতা ৮ উপ-শিরোনামের কেন্দ্র-সরণ (centerShiftPt = -8.9 -> w:right="356")
    const p3b1 = ir.pages[2].bands[1].cells[0].items[0];
    const p5b0 = ir.pages[4].bands[0].cells[0].items[0];
    const p8b1 = ir.pages[7].bands[1].cells[0].items[0];
    check(`a16 (${label}) পাতা ৩ উপ-শিরোনাম: fontPt === 13.5`, p3b1.fontPt === 13.5);
    check(`a16 (${label}) পাতা ৫ শিরোনাম: fontPt === 19.5`, p5b0.fontPt === 19.5);
    check(`a16 (${label}) পাতা ৮ উপ-শিরোনাম: centerShiftPt === -8.9 ও w:right="356"`, p8b1.centerShiftPt === -8.9 && DB.pPr(p8b1, 0).includes('w:right="356"'));

    // পাতা ৩–৯ চেকলিস্ট ছকের প্রথম কলাম (ক্রঃ নং) মাঝখানে ('c') সাজানো
    for (const pi of [2, 3, 4, 5, 6, 7, 8]) {
      const tbl = ir.pages[pi].bands.flatMap((b) => b.cells.flatMap((c) => c.items)).find((x) => x.kind === 'table');
      check(`a16 (${label}) পাতা ${pi + 1} চেকলিস্ট ছক: colAligns[0] === 'c'`, tbl && Array.isArray(tbl.colAligns) && tbl.colAligns[0] === 'c');
    }
  }

  // সংরক্ষিত IR-এ প্যাডিংযুক্ত অণু-স্বাক্ষর চিত্রের (পাতা ৩, ৪, ৬, ৭, ৮, ৯) উচ্চতা ও প্রস্থ পুনরুদ্ধার যাচাই
  const p3Fig = irSaved.pages[2].bands[3].cells[0].items[0];
  check('a16 (saved-IR) পাতা ৩ অণু-স্বাক্ষর চিত্র: heightPt === 25.2, widthPt === 58.4 ও indentPt === 169.4', p3Fig.heightPt === 25.2 && p3Fig.widthPt === 58.4 && p3Fig.indentPt === 169.4);
}

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
