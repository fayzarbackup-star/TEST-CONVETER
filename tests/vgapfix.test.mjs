import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ভিত্তি সুইচসমূহ নাম ধরে সক্রিয় করা (switch-defaults.js require না করে)
const BASE_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES', 'A14FIX4', 'RULES2',
  'A13FIX', 'A16FIX5', 'A14FIX5', 'A07FIX5', 'A12FIX',
  'A02FIX', 'A06FIX', 'A07FIX6', 'F1FIX', 'A18FIX',
  'A08FIX', 'A16FIX6', 'F1FIX2'
];

function enableBaseSwitches() {
  for (const name of BASE_SWITCHES) {
    globalThis['__FZ_ON_' + name] = true;
    delete globalThis['__FZ_OFF_' + name];
  }
}

enableBaseSwitches();

const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// সব শীর্ষ-স্তরের এবং নেস্টেড <w:tbl> ব্লকের গ্রিড ও ঘরের প্রস্থের সমতা যাচাই
function extractTables(xml) {
  const tables = [];
  const stack = [];
  const tagRe = /<\/?w:tbl(?=\s|>)/g;
  let m;
  while ((m = tagRe.exec(xml)) !== null) {
    if (m[0] === '<w:tbl') {
      stack.push(m.index);
    } else if (stack.length > 0) {
      const start = stack.pop();
      const end = m.index + '</w:tbl>'.length;
      if (stack.length === 0) {
        tables.push(xml.slice(start, end));
      }
    }
  }
  return tables;
}

function stripNestedTables(tblXml) {
  let out = '';
  let depth = 0;
  let lastIdx = 0;
  const tagRe = /<\/?w:tbl(?=\s|>)/g;
  let m;
  while ((m = tagRe.exec(tblXml)) !== null) {
    if (m[0] === '<w:tbl') {
      if (depth === 1) {
        out += tblXml.slice(lastIdx, m.index);
      }
      depth++;
    } else {
      depth--;
      if (depth === 1) {
        lastIdx = m.index + '</w:tbl>'.length;
      }
    }
  }
  out += tblXml.slice(lastIdx);
  return out;
}

function verifyTableGridInvariants(xml, label) {
  const tables = extractTables(xml);
  let allValid = tables.length > 0;
  for (let ti = 0; ti < tables.length; ti++) {
    const shallow = stripNestedTables(tables[ti]);
    const tblWMatch = /<w:tblPr>[\s\S]*?<w:tblW w:w="(\d+)"/.exec(shallow);
    const gridMatches = [...shallow.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)];
    if (!tblWMatch || gridMatches.length === 0) {
      allValid = false;
      continue;
    }
    const tblW = Number(tblWMatch[1]);
    const gridCols = gridMatches.map((g) => Number(g[1]));
    const gridSum = gridCols.reduce((a, b) => a + b, 0);
    if (gridSum !== tblW) {
      allValid = false;
    }
    const gridBounds = [];
    let acc = 0;
    for (const gw of gridCols) {
      acc += gw;
      gridBounds.push(acc);
    }
    const trMatches = [...shallow.matchAll(/<w:tr(?:\s|>[\s\S]*?)<\/w:tr>/g)];
    for (const trm of trMatches) {
      const trXml = trm[0];
      const tcMatches = [...trXml.matchAll(/<w:tcPr>([\s\S]*?)<\/w:tcPr>/g)];
      let rowW = 0;
      let colIdx = 0;
      for (const tcm of tcMatches) {
        const tcPr = tcm[1];
        const wMatch = /<w:tcW w:w="(\d+)"/.exec(tcPr);
        const spanMatch = /<w:gridSpan w:val="(\d+)"\/>/.exec(tcPr);
        const span = spanMatch ? Number(spanMatch[1]) : 1;
        const cellW = wMatch ? Number(wMatch[1]) : 0;
        const expectedW = gridCols.slice(colIdx, colIdx + span).reduce((a, b) => a + b, 0);
        if (cellW !== expectedW) {
          allValid = false;
        }
        rowW += cellW;
        colIdx += span;
        if (!gridBounds.includes(rowW)) {
          allValid = false;
        }
      }
      if (rowW !== tblW || colIdx !== gridCols.length) {
        allValid = false;
      }
    }
  }
  check(`${label}: প্রতিটি সারিতে ঘরের প্রস্থের যোগফল = টেবিলের প্রস্থ এবং সব সারির কলাম-সীমা একই গ্রিডে`, allValid);
}

function loadMeasures(relDir) {
  const p = path.join(ROOT, relDir, 'measures.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// ১) সুইচ API ও টগল পরীক্ষা
console.log('=== ১. VGAPFIX সুইচ API পরীক্ষা ===');
globalThis.__FZ_ON_VGAPFIX = false;
delete globalThis.__FZ_OFF_VGAPFIX;
check('সুইচ ডিফল্টভাবে বন্ধ থাকলে vgapFixOn() === false', IR.vgapFixOn() === false && LF.isVGapFixOn() === false && DB.vgapFixOn() === false);

globalThis.__FZ_ON_VGAPFIX = true;
check('__FZ_ON_VGAPFIX = true হলে vgapFixOn() === true', IR.vgapFixOn() === true && LF.isVGapFixOn() === true && DB.vgapFixOn() === true);

globalThis.__FZ_OFF_VGAPFIX = true;
check('__FZ_OFF_VGAPFIX = true হলে অগ্রাধিকার পেয়ে বন্ধ থাকে', IR.vgapFixOn() === false && LF.isVGapFixOn() === false && DB.vgapFixOn() === false);
delete globalThis.__FZ_OFF_VGAPFIX;

// ২) f1 (পাতা ৩: ৪×১ বর্ডারলেস সংযুক্তি ছকে ছোট ফন্টের শীর্ষ সারির প্রকৃত উচ্চতা ও লাইন-পিচ)
console.log('=== ২. f1 (পাতা ৩ বর্ডারলেস ছকের উল্লম্ব স্পেসিং) পরীক্ষা ===');
{
  const m = loadMeasures('qa/golden-data/runs/S28_d1eed75b/f1');
  globalThis.__FZ_ON_VGAPFIX = false;
  const irOff = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff);
  const xmlOff = DB.bodyXml(irOff).xml;
  const tblOff = irOff.pages[2].bands[0].cells[0].items[0];

  globalThis.__FZ_ON_VGAPFIX = true;
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn);
  const xmlOn = DB.bodyXml(irOn).xml;
  const tblOn = irOn.pages[2].bands[0].cells[0].items[0];

  check('f1 সুইচ বন্ধ থাকলে exactRuleHeights নিষ্ক্রিয় ও সারি ০ উচ্চতা 8.5pt', !tblOff.exactRuleHeights && tblOff.rowHeightsPt[0] === 8.5);
  check('f1 সুইচ চালু থাকলে exactRuleHeights সক্রিয় এবং সারি উচ্চতা [10, 20.5, 20.5, 11.5]pt', tblOn.exactRuleHeights === true && JSON.stringify(tblOn.rowHeightsPt) === JSON.stringify([10, 20.5, 20.5, 11.5]));
  check('f1 সুইচ চালু থাকলে DOCX XML-এ সারি ০-এ exact উচ্চতা 200 dxa (২৭৬ dxa স্ফীতি নিরসন)', xmlOn.includes('<w:trHeight w:val="200" w:hRule="exact"/>') && !xmlOff.includes('<w:trHeight w:val="200" w:hRule="exact"/>'));

  // টগল পুনরুদ্ধার পরীক্ষা
  globalThis.__FZ_ON_VGAPFIX = true;
  const irToggle = IR.build(m.cap, m.measures, m.pageInfo);
  globalThis.__FZ_OFF_VGAPFIX = true;
  LF.fit(irToggle);
  const xmlRestored = DB.bodyXml(irToggle).xml;
  delete globalThis.__FZ_OFF_VGAPFIX;
  check('f1 সুইচ চালু থেকে বন্ধ করলে DOCX XML বাইট-টু-বাইট অপরিবর্তিত অবস্থায় ফিরে আসে', xmlRestored === xmlOff);
  verifyTableGridInvariants(xmlOn, 'f1');
}

// ৩) a16 (পাতা ১: বাম মার্জিনে খাড়া-রেখার ওভারলে উপ-খণ্ড বিভাজন ও অতিরিক্ত টিক অপসারণ)
console.log('=== ৩. a16 (পাতা ১ খাড়া-রেখা ওভারলে টিক বিভাজন) পরীক্ষা ===');
{
  const m = loadMeasures('qa/golden-data/runs/S27_62af339e/a16');
  globalThis.__FZ_ON_VGAPFIX = false;
  const irOff = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff);
  const xmlOff = DB.bodyXml(irOff).xml;
  const ovsOff = irOff.pages[0]._a16Fix5Overlays || [];

  globalThis.__FZ_ON_VGAPFIX = true;
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn);
  const xmlOn = DB.bodyXml(irOn).xml;
  const ovsOn = irOn.pages[0]._a16Fix5Overlays || [];

  check('a16 সুইচ বন্ধ থাকলে y=199.2 ও y=287.2 টিক থাকে', ovsOff.some((o) => o.y === 199.2) && ovsOff.some((o) => o.y === 287.2));
  check('a16 সুইচ চালু থাকলে y=196.8 ও y=199.5 দুটি উপ-খণ্ড থাকে এবং y=287.2 অতিরিক্ত টিক অপসারিত হয়', ovsOn.some((o) => o.y === 196.8 && o.h === 1.8) && ovsOn.some((o) => o.y === 199.5 && o.h === 6.5) && !ovsOn.some((o) => o.y === 287.2));

  globalThis.__FZ_ON_VGAPFIX = true;
  const irToggle = IR.build(m.cap, m.measures, m.pageInfo);
  globalThis.__FZ_OFF_VGAPFIX = true;
  LF.fit(irToggle);
  const xmlRestored = DB.bodyXml(irToggle).xml;
  delete globalThis.__FZ_OFF_VGAPFIX;
  check('a16 সুইচ চালু থেকে বন্ধ করলে DOCX XML বাইট-টু-বাইট অপরিবর্তিত অবস্থায় ফিরে আসে', xmlRestored === xmlOff);
  verifyTableGridInvariants(xmlOn, 'a16');
}

// ৪) a14 (পাতা ১: নিচের প্রাপক ও অণু-স্বাক্ষর ওভারল্যাপ এবং পাতা ৩: সংযুক্ত ২-লাইনের সেতু ওভারলে)
console.log('=== ৪. a14 (পাতা ১ স্বাক্ষর-প্রাপক সংযোগ ও পাতা ৩ সেতু ওভারলে) পরীক্ষা ===');
{
  const m = loadMeasures('qa/golden-data/runs/S27_62af339e/a14');
  globalThis.__FZ_ON_VGAPFIX = false;
  const irOff = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff);
  const xmlOff = DB.bodyXml(irOff).xml;

  globalThis.__FZ_ON_VGAPFIX = true;
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn);
  const xmlOn = DB.bodyXml(irOn).xml;

  const p1LeftItOn = irOn.pages[0].bands[14].cells[0].items[0];
  const p1InitFigOn = irOn.pages[0].bands[13].cells[0].items[1];
  const p3OvsOn = irOn.pages[2]._a16Fix5Overlays || [];

  check('a14 পাতা ১ সুইচ চালু থাকলে প্রাপক ব্লকের লাইন-পিচ 16pt এবং অণু-স্বাক্ষরের উচ্চতা >= 44.5pt', p1LeftItOn.lineSpacingPt === 16 && p1InitFigOn.heightPt >= 44.5);
  check('a14 পাতা ৩ সুইচ চালু থাকলে ২-লাইনের উল্লম্ব সেতু ওভারলে সংযুক্ত হয়', p3OvsOn.length === 1 && p3OvsOn[0].h === 6);

  globalThis.__FZ_ON_VGAPFIX = true;
  const irToggle = IR.build(m.cap, m.measures, m.pageInfo);
  globalThis.__FZ_OFF_VGAPFIX = true;
  LF.fit(irToggle);
  const xmlRestored = DB.bodyXml(irToggle).xml;
  delete globalThis.__FZ_OFF_VGAPFIX;
  check('a14 সুইচ চালু থেকে বন্ধ করলে DOCX XML বাইট-টু-বাইট অপরিবর্তিত অবস্থায় ফিরে আসে', xmlRestored === xmlOff);
}

// ৫) a03 (পাতা ১ ও পাতা ২: বাক্সের ভেতরে পূর্ণ-প্রস্থ কালো ব্যানারের নিচের প্যাডিং ও ইনডেন্ট নিরসন)
console.log('=== ৫. a03 (পাতা ১ ও ২ কালো ব্যানারের উল্লম্ব প্যাডিং) পরীক্ষা ===');
{
  const m = loadMeasures('qa/golden-data/runs/S26_3b93d252/a03');
  globalThis.__FZ_ON_VGAPFIX = false;
  const irOff = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff);
  const xmlOff = DB.bodyXml(irOff).xml;

  globalThis.__FZ_ON_VGAPFIX = true;
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn);
  const xmlOn = DB.bodyXml(irOn).xml;

  const p1BannerOn = irOn.pages[0].bands[1].cells[0].items[0];
  const p2BannerOn = irOn.pages[1].bands[14].cells[0].items[0];

  check('a03 পাতা ১ ও পাতা ২ সুইচ চালু থাকলে কালো ব্যানারের exact লাইন-উচ্চতা 21pt ও 16.6pt এবং indentPt === 0', p1BannerOn.lineSpacingPt === 21 && p2BannerOn.lineSpacingPt === 16.6 && p2BannerOn.indentPt === 0);
  check('a03 সুইচ চালু থাকলে DOCX XML-এ w:line="420" এবং w:line="332" নির্গত হয়', xmlOn.includes('w:line="420" w:lineRule="exact"') && xmlOn.includes('w:line="332" w:lineRule="exact"'));

  globalThis.__FZ_ON_VGAPFIX = true;
  const irToggle = IR.build(m.cap, m.measures, m.pageInfo);
  globalThis.__FZ_OFF_VGAPFIX = true;
  LF.fit(irToggle);
  const xmlRestored = DB.bodyXml(irToggle).xml;
  delete globalThis.__FZ_OFF_VGAPFIX;
  check('a03 সুইচ চালু থেকে বন্ধ করলে DOCX XML বাইট-টু-বাইট অপরিবর্তিত অবস্থায় ফিরে আসে', xmlRestored === xmlOff);
  verifyTableGridInvariants(xmlOn, 'a03');
}

// ৬) a07 (পাতা ৩ ও পাতা ৪: বহু-লাইনের ছক-ঘরে ইডেমপোটেন্ট ড্যাশ-পূরণ ও ৩-লাইনের ঘরের লাইন-পিচ এবং পূর্ণ টেবিল-গ্রিড অক্ষত রাখা)
console.log('=== ৬. a07 (পাতা ৩ ও ৪ ছক-ঘরের ইডেমপোটেন্ট ড্যাশ ও গ্রিড অখণ্ডতা) পরীক্ষা ===');
{
  const m = loadMeasures('qa/golden-data/runs/S25_18025270/a07');
  globalThis.__FZ_ON_VGAPFIX = false;
  const irOff = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOff);
  const xmlOff = DB.bodyXml(irOff).xml;
  const p3CellOff = irOff.pages[2].bands[2].cells[0].items[0].rows[1][2];

  globalThis.__FZ_ON_VGAPFIX = true;
  const irOn = IR.build(m.cap, m.measures, m.pageInfo);
  LF.fit(irOn);
  const xmlOn = DB.bodyXml(irOn).xml;
  const p3TblOn = irOn.pages[2].bands[2].cells[0].items[0];
  const p4TblOn = irOn.pages[3].bands[2].cells[0].items[0];
  const p3CellOn = p3TblOn.rows[1][2];

  check('a07 পাতা ৩ সুইচ বন্ধ থাকলে বারবার কলে ২৪-ড্যাশ স্ফীতি ঘটে, কিন্তু চালু থাকলে ১০/৮ ড্যাশে স্থির থাকে', /-{20,}/.test(p3CellOff) && !/-{11,}/.test(p3CellOn));
  check('a07 পাতা ৩ (৭×৩) ও পাতা ৪ (১২×৪) ছক দুটি ভাঙা হয়নি এবং সারি-সংখ্যা সম্পূর্ণ অক্ষত', p3TblOn.rows.length === 7 && p4TblOn.rows.length === 12 && p4TblOn._a07MultiLinePitch === 15.6);

  globalThis.__FZ_ON_VGAPFIX = true;
  const irToggle = IR.build(m.cap, m.measures, m.pageInfo);
  globalThis.__FZ_OFF_VGAPFIX = true;
  LF.fit(irToggle);
  const xmlRestored = DB.bodyXml(irToggle).xml;
  delete globalThis.__FZ_OFF_VGAPFIX;
  check('a07 সুইচ চালু থেকে বন্ধ করলে DOCX XML বাইট-টু-বাইট অপরিবর্তিত অবস্থায় ফিরে আসে', xmlRestored === xmlOff);
  verifyTableGridInvariants(xmlOn, 'a07');
}

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
