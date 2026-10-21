/**
 * A02_RULES_v3 — অফলাইন টেস্ট স্যুট (tests/rules2.test.mjs)
 * সুইচ: __FZ_ON_RULES2 / FZ_ON=RULES2, বন্ধের ওভাররাইড: __FZ_OFF_RULES2 / FZ_OFF=RULES2
 * শর্ত:
 * ১) সুইচ চালু থাকলে a02-এর প্রত্যাশিত দাগ, পাতা-ফ্রেম, খাড়া চিত্র-দণ্ড, সংখ্যা-বাক্স, ধূসর ছক ও ফুটার পট্টি সংশোধন সক্রিয় থাকবে।
 * ২) সুইচ চালু থাকলেও a03 (পাতা ১ ও পাতা ২)-এর IR এবং ডকএক্স XML ১০০% বাইট-বাই-বাইট সুইচ-বন্ধ অবস্থার সমান থাকবে (কোনো রিগ্রেশন হবে না)।
 * ৩) সুইচ বন্ধ থাকলে (বা __FZ_OFF_RULES2 ওভাররাইডে) সব আউটপুট বাইট-বাই-বাইট অপরিবর্তিত থাকবে।
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err && err.message ? err.message : err}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'শর্ত ব্যর্থ হয়েছে');
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'মান মেলেনি'}: প্রত্যাশিত ${JSON.stringify(expected)}, পাওয়া গেছে ${JSON.stringify(actual)}`);
  }
}

// প্রোডাকশনের ১৪টি বেস সুইচ নাম ধরে স্পষ্টভাবে পিন করা (switch-defaults.js রিকোয়ার না করে)
const PROD_SWITCHES = [
  'WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX',
  'VSPACE', 'BOXSPLIT', 'SERIALHANG', 'A07FIX2', 'A14FIX3',
  'WIDTH', 'A16FIX3', 'A14RULES', 'A07FIX3'
];

const BASE5 = ['WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX'];

const ALL_SWITCHES = [
  ...PROD_SWITCHES,
  'RULEFIX', 'RULES2', 'TABLEGRID', 'ROTTEXT', 'LINEGAP'
];

function resetSwitches() {
  for (const k of ALL_SWITCHES) {
    delete globalThis['__FZ_ON_' + k];
    delete globalThis['__FZ_OFF_' + k];
    if (process && process.env) {
      delete process.env['__FZ_ON_' + k];
      delete process.env['__FZ_OFF_' + k];
    }
  }
  if (process && process.env) {
    delete process.env.FZ_ON;
    delete process.env.FZ_OFF;
  }
}

function loadModules() {
  const files = [
    'js/layout-engine/faithful/page-geometry.js',
    'js/layout-engine/faithful/layout-ir.js',
    'js/layout-engine/faithful/line-fit.js',
    'js/layout-engine/faithful/faithful-docx-builder.js'
  ];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    delete require.cache[require.resolve(abs)];
  }
  const PG = require(path.join(ROOT, files[0]));
  const IR = require(path.join(ROOT, files[1]));
  const LF = require(path.join(ROOT, files[2]));
  const DB = require(path.join(ROOT, files[3]));
  globalThis.FayzarPageGeometry = PG;
  globalThis.FayzarLayoutIR = IR;
  globalThis.FayzarLineFit = LF;
  globalThis.FayzarFaithfulDocx = DB;
  return { PG, IR, LF, DB };
}

function resolveGoldenDir(doc) {
  const prodRun = path.join(
    ROOT,
    'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG+A07FIX2+A14FIX3+WIDTH+A16FIX3+A14RULES+A07FIX3',
    doc
  );
  if (fs.existsSync(prodRun)) return prodRun;
  return path.join(ROOT, 'qa/golden-data/runs/base5', doc);
}

function loadGolden(doc) {
  const dir = resolveGoldenDir(doc);
  const meas = JSON.parse(fs.readFileSync(path.join(dir, 'measures.json'), 'utf8'));
  const cap = meas.cap || JSON.parse(fs.readFileSync(path.join(dir, 'capture.json'), 'utf8'));
  const goldIr = JSON.parse(fs.readFileSync(path.join(dir, 'ir.json'), 'utf8'));
  return { cap, meas, goldIr };
}

function attachCropFiguresFromGolden(ir, goldIr) {
  ir.pages.forEach((p, pi) => {
    const gp = goldIr.pages[pi];
    if (!gp) return;
    (p.bands || []).forEach((b, bi) => {
      const gb = gp.bands && gp.bands[bi];
      if (!gb) return;
      (b.cells || []).forEach((c, ci) => {
        const gc = gb.cells && gb.cells[ci];
        if (!gc) return;
        (c.items || []).forEach((it, ii) => {
          const git = gc.items && gc.items[ii];
          if (it && git && it.kind === 'figure' && git.image) {
            it.image = Object.assign({}, git.image);
            it.widthPt = git.widthPt;
            it.heightPt = git.heightPt;
          }
        });
      });
    });
  });
}

function runPipeline(doc, onSwitches = [], offSwitches = [], envMode = false, mutateMeas = null) {
  resetSwitches();
  if (envMode) {
    if (onSwitches.length) process.env.FZ_ON = onSwitches.join(',');
    if (offSwitches.length) process.env.FZ_OFF = offSwitches.join(',');
  } else {
    for (const k of onSwitches) globalThis['__FZ_ON_' + k] = true;
    for (const k of offSwitches) globalThis['__FZ_OFF_' + k] = true;
  }
  const { IR, LF, DB } = loadModules();
  const { cap, meas, goldIr } = loadGolden(doc);
  if (typeof mutateMeas === 'function') mutateMeas(meas);
  const ir = IR.build(cap, meas.measures, meas.pageInfo);
  attachCropFiguresFromGolden(ir, goldIr);
  const irBeforeFit = JSON.stringify(ir);
  LF.fit(ir);
  const irAfterFit = JSON.stringify(ir);
  const { xml } = DB.bodyXml(ir);
  return { ir, irBeforeFit, irAfterFit, xml };
}

console.log('=== A02_RULES_v3 (RULES2) টেস্ট স্যুট ===');

// ১) সুইচ বন্ধ অবস্থায় (এবং __FZ_OFF_RULES2 ওভাররাইডে) বাইট-বাই-বাইট অভিন্নতা যাচাই
const a02ProdOff = runPipeline('a02', PROD_SWITCHES);
const a03ProdOff = runPipeline('a03', PROD_SWITCHES);
const a02Base5Off = runPipeline('a02', BASE5);
const a03Base5Off = runPipeline('a03', BASE5);
const a02PlainOff = runPipeline('a02', []);
const a03PlainOff = runPipeline('a03', []);

test('১. সুইচ বন্ধ থাকলে a02 ও a03-এর প্রাক-নির্মিত গোল্ডেন ir.json থেকে তৈরি XML বাইট-বাই-বাইট অপরিবর্তিত থাকে', () => {
  for (const doc of ['a02', 'a03']) {
    const { goldIr } = loadGolden(doc);
    resetSwitches();
    for (const k of PROD_SWITCHES) globalThis['__FZ_ON_' + k] = true;
    const { DB } = loadModules();
    const { xml: xmlOff } = DB.bodyXml(JSON.parse(JSON.stringify(goldIr)));

    globalThis.__FZ_ON_RULES2 = true;
    globalThis.__FZ_OFF_RULES2 = true;
    const { xml: xmlOverride } = DB.bodyXml(JSON.parse(JSON.stringify(goldIr)));
    assertEqual(xmlOverride, xmlOff, `${doc} প্রাক-নির্মিত IR থেকে তৈরি XML বাইট-বাই-বাইট অভিন্ন হতে হবে`);
  }
  resetSwitches();
});

test('২. __FZ_ON_RULES2 এবং __FZ_OFF_RULES2 একসাথে থাকলে পূর্ণ পাইপলাইনে সুইচ বন্ধ হয়ে বাইট-বাই-বাইট আগের আউটপুট দেয় (a02 ও a03)', () => {
  const a02Override = runPipeline('a02', [...PROD_SWITCHES, 'RULES2'], ['RULES2']);
  const a03Override = runPipeline('a03', [...PROD_SWITCHES, 'RULES2'], ['RULES2']);
  assertEqual(a02Override.irBeforeFit, a02ProdOff.irBeforeFit, 'a02 irBeforeFit অভিন্ন হতে হবে');
  assertEqual(a02Override.irAfterFit, a02ProdOff.irAfterFit, 'a02 irAfterFit অভিন্ন হতে হবে');
  assertEqual(a02Override.xml, a02ProdOff.xml, 'a02 XML বাইট-বাই-বাইট অভিন্ন হতে হবে');
  assertEqual(a03Override.irBeforeFit, a03ProdOff.irBeforeFit, 'a03 irBeforeFit অভিন্ন হতে হবে');
  assertEqual(a03Override.irAfterFit, a03ProdOff.irAfterFit, 'a03 irAfterFit অভিন্ন হতে হবে');
  assertEqual(a03Override.xml, a03ProdOff.xml, 'a03 XML বাইট-বাই-বাইট অভিন্ন হতে হবে');

  const a02PlainOverride = runPipeline('a02', ['RULES2'], ['RULES2']);
  const a03PlainOverride = runPipeline('a03', ['RULES2'], ['RULES2']);
  assertEqual(a02PlainOverride.xml, a02PlainOff.xml, 'a02 ডিফল্ট XML বাইট-বাই-বাইট অভিন্ন হতে হবে');
  assertEqual(a03PlainOverride.xml, a03PlainOff.xml, 'a03 ডিফল্ট XML বাইট-বাই-বাইট অভিন্ন হতে হবে');
});

test('৩. FZ_ON=RULES2 ও FZ_OFF=RULES2 এনভায়রনমেন্ট ভেরিয়েবল সঠিকভাবে কাজ করে', () => {
  const a02EnvOn = runPipeline('a02', [...PROD_SWITCHES, 'RULES2'], [], true);
  const a02GlobalOn = runPipeline('a02', [...PROD_SWITCHES, 'RULES2'], [], false);
  assertEqual(a02EnvOn.xml, a02GlobalOn.xml, 'FZ_ON=RULES2 এবং __FZ_ON_RULES2 একই XML দেবে');

  const a02EnvOff = runPipeline('a02', [...PROD_SWITCHES, 'RULES2'], ['RULES2'], true);
  assertEqual(a02EnvOff.xml, a02ProdOff.xml, 'FZ_OFF=RULES2 দিলে বাইট-বাই-বাইট প্রোডাকশন XML দেবে');
});

// ২) a02-এ RULES2 চালু অবস্থায় প্রত্যাশিত দাগ ও কাঠামো যাচাই
const a02ProdR2 = runPipeline('a02', [...PROD_SWITCHES, 'RULES2']);
const a02Base5R2 = runPipeline('a02', [...BASE5, 'RULES2']);
const a02StandaloneR2 = runPipeline('a02', ['RULES2']);

test('৪. RULES2 চালু থাকলে a02-এর পাতা-ফ্রেম (page.frame.spacePt) মূলের বর্ডার অবস্থানে (top:9, left:12, right:11, bottom:2) বসে', () => {
  const sp = a02ProdR2.ir.pages[0].frame.spacePt;
  assertEqual(sp.top, 9, 'ফ্রেমের ওপরের দূরত্ব 9pt হতে হবে (যাতে top বর্ডার 6.5pt-এর বদলে ~11.5pt-এ বসে)');
  assertEqual(sp.left, 12, 'ফ্রেমের বাম দূরত্ব 12pt হতে হবে (যাতে left বর্ডার ~13.5pt-এ বসে)');
  assertEqual(sp.right, 11, 'ফ্রেমের ডান দূরত্ব 11pt হতে হবে (যাতে right বর্ডার ~538.4pt-এ বসে)');
  assertEqual(sp.bottom, 2, 'ফ্রেমের নিচের দূরত্ব 2pt হতে হবে (যাতে bottom বর্ডার 762pt-এর বদলে ~760pt-এ বসে)');
  assert(
    a02ProdR2.xml.includes('<w:top w:val="single" w:sz="12" w:space="9" w:color="000000"/>'),
    'sectPr-এ top w:space="9" থাকতে হবে'
  );
  assert(
    a02ProdR2.xml.includes('<w:bottom w:val="single" w:sz="12" w:space="2" w:color="000000"/>'),
    'sectPr-এ bottom w:space="2" থাকতে হবে'
  );
});

test('৫. প্রাক-নির্মিত ir.json-এও repairRules2Ir পাতা-ফ্রেমের spacePt সঠিকভাবে পুনরুদ্ধার করে', () => {
  resetSwitches();
  for (const k of [...PROD_SWITCHES, 'RULES2']) globalThis['__FZ_ON_' + k] = true;
  const { LF } = loadModules();
  const { goldIr } = loadGolden('a02');
  const cloned = JSON.parse(JSON.stringify(goldIr));
  LF.repairRules2Ir(cloned);
  const sp = cloned.pages[0].frame.spacePt;
  assertEqual(sp.top, 9, 'প্রাক-নির্মিত IR-এ top=9');
  assertEqual(sp.left, 12, 'প্রাক-নির্মিত IR-এ left=12');
  assertEqual(sp.right, 11, 'প্রাক-নির্মিত IR-এ right=11');
  assertEqual(sp.bottom, 2, 'প্রাক-নির্মিত IR-এ bottom=2');
});

test('৬. RULES2 চালু থাকলে a02-এর Band 20 খাড়া চিত্র-দণ্ড ("NOC প্রদানকারী...") পূর্ণ উচ্চতা (88.3pt), সঠিক প্রস্থ (15.3pt) ও শূন্য বাম-ইনডেন্ট পায়', () => {
  const vbar = a02Base5R2.ir.pages[0].bands[20].cells[2].items[0];
  assertEqual(vbar.kind, 'figure', 'Band 20 Cell 2 Item 0 একটি figure');
  assertEqual(vbar.heightPt, 88.3, 'খাড়া চিত্র-দণ্ডের উচ্চতা 56.2pt থেকে 88.3pt-এ পুনরুদ্ধার হতে হবে');
  assertEqual(vbar.widthPt, 15.3, 'খাড়া চিত্র-দণ্ডের প্রস্থ 10.6pt থেকে 15.3pt-এ পুনরুদ্ধার হতে হবে');
  assertEqual(vbar.indentPt, 0, 'খাড়া চিত্র-দণ্ডের বাম-ইনডেন্ট 2.6pt থেকে 0pt হতে হবে যাতে x=264..270 দাগ ঠিক জায়গায় বসে');
  assert(
    !a02Base5R2.xml.includes('<w:spacing w:before="92" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="52"/>'),
    'খাড়া চিত্র-দণ্ডের অনুচ্ছেদে বাড়তি w:before="92" বা w:ind w:left="52" থাকবে না'
  );
  assert(
    a02Base5R2.xml.includes('<w:spacing w:before="19" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/>'),
    'খাড়া চিত্র-দণ্ডের অনুচ্ছেদে w:before="19" এবং বাম-ইনডেন্টবিহীন বিন্যাস থাকতে হবে'
  );
});

test('৭. RULES2 চালু থাকলে সাধারণ চিত্র (যেমন a02 Band 0-এর সরকারি লোগো) অপরিবর্তিত থাকে এবং পরের শিরোনাম নিচে সরে না', () => {
  const logo = a02Base5R2.ir.pages[0].bands[0].cells[0].items[0];
  assertEqual(logo.heightPt, 56.4, 'সাধারণ লোগো চিত্রের উচ্চতা 56.4pt অপরিবর্তিত থাকবে');
  assert(
    a02Base5R2.xml.includes('<w:spacing w:before="21" w:after="0" w:line="414" w:lineRule="exact"/>'),
    'Band 1 শিরোনামের w:before="21" অপরিবর্তিত থাকবে (RULEFIX-এর মতো 85 হবে না)'
  );
});

test('৮. RULES2 চালু থাকলে a02-এর ১×৮ ও ১×১৭ সংখ্যা-বাক্স (জন্ম তারিখ, NID, অবসর গ্রহণের তারিখ) এবং ০৫ নং পরিবারবর্গের ছক সঠিকভাবে গঠিত হয়', () => {
  const p0 = a02StandaloneR2.ir.pages[0];
  // ০৪। অবসর গ্রহণের তারিখ (১×৮, দিন-মাস-বছর ফাঁকসহ, Band 15)
  const retTbl = p0.bands[15].cells[1].items[0];
  assertEqual(retTbl._digitBoxStrip, true, 'অবসর গ্রহণের তারিখ ছকে _digitBoxStrip=true');
  assert(Array.isArray(retTbl.smallBoxesPt) && retTbl.smallBoxesPt.length === 8, '৮টি ছোট বাক্স (smallBoxesPt) থাকতে হবে');
  const gap1 = Math.round((retTbl.smallBoxesPt[2].x0 - retTbl.smallBoxesPt[1].x1) * 10) / 10;
  const gap2 = Math.round((retTbl.smallBoxesPt[4].x0 - retTbl.smallBoxesPt[3].x1) * 10) / 10;
  assert(gap1 >= 3 && gap2 >= 3, 'দিন-মাস এবং মাস-বছরের মাঝে ~3.6pt ফাঁক থাকতে হবে');

  // ০৫। পরিবারবর্গের বিবরণ ছক (Band 17)
  const famTbl = a02ProdR2.ir.pages[0].bands[17].cells[0].items[0];
  assertEqual(famTbl.headShade, 'D9D9D9', 'শিরোনাম সারির ছায়া D9D9D9');
  assertEqual(famTbl.exactRuleHeights, true, 'exactRuleHeights=true');
  assertEqual(famTbl.heightPt, 91.7, 'মাপা আড়া-রেখা অনুযায়ী ছকের উচ্চতা 91.7pt');
  assert(Array.isArray(famTbl.vRuleBands) && famTbl.vRuleBands[0][2] === false, 'TBLMERGE-এর উপ-কলাম বিভাজনে vRuleBands অক্ষুণ্ণ থাকবে');
});

test('৯. RULES2 চালু থাকলে a02-এর ধূসর ফুটার পট্টি (Band 25) পূর্ণ-প্রস্থ পট্টি ও মূল বডি-ফন্ট (11pt / sz=22) পায়', () => {
  const footer = a02ProdR2.ir.pages[0].bands[25].cells[0].items[0];
  assertEqual(footer.fullWidthShadeBar, true, 'ফুটার পট্টিতে fullWidthShadeBar=true');
  assertEqual(footer.fontPt, 11, 'ফুটার পট্টির ফন্ট 14.5pt থেকে সংশোধিত হয়ে 11pt (bodyFont) হবে');
  assertEqual(footer.indentPt, 0, 'ফুটার পট্টির indentPt=0');
  assertEqual(footer.centerShiftPt, null, 'ফুটার পট্টির centerShiftPt=null');
});

// ৩) a03-এ RULES2 চালু থাকলে পাতা ১ ও পাতা ২ সম্পূর্ণ অপরিবর্তিত থাকা (১০০% বাইট-বাই-বাইট অভিন্নতা) যাচাই
const a03ProdR2 = runPipeline('a03', [...PROD_SWITCHES, 'RULES2']);
const a03Base5R2 = runPipeline('a03', [...BASE5, 'RULES2']);

test('১০. RULES2 চালু থাকলে a03-এর পূর্ণ IR (irBeforeFit, irAfterFit) এবং ডকএক্স XML সুইচ-বন্ধ অবস্থার সাথে ১০০% বাইট-বাই-বাইট অভিন্ন থাকে', () => {
  assertEqual(a03ProdR2.irBeforeFit, a03ProdOff.irBeforeFit, 'প্রোডাকশন সুইচে a03 irBeforeFit ১০০% অভিন্ন হতে হবে');
  assertEqual(a03ProdR2.irAfterFit, a03ProdOff.irAfterFit, 'প্রোডাকশন সুইচে a03 irAfterFit ১০০% অভিন্ন হতে হবে');
  assertEqual(a03ProdR2.xml, a03ProdOff.xml, 'প্রোডাকশন সুইচে a03 ডকএক্স XML ১০০% বাইট-বাই-বাইট অভিন্ন হতে হবে');
  assertEqual(a03Base5R2.xml, a03Base5Off.xml, 'BASE5 সুইচেও a03 ডকএক্স XML ১০০% বাইট-বাই-বাইট অভিন্ন হতে হবে');
});

test('১১. RULES2 চালু থাকলে a03 পাতা ১-এর প্রথম ছকের কলাম-প্রস্থ (8608/2072), ৩টি শিরোনামের ইনডেন্ট (1860/1824/1872) এবং ~৬৩তম এলিমেন্টের নিচের-বর্ডার অনুচ্ছেদ অক্ষুণ্ণ থাকে', () => {
  // ১) পাতা ১-এর প্রথম ছকের gridCol 8608/2072 (8948/1732 নয়) এবং শিরোনামের ইনডেন্ট 1860, 1824, 1872 (1520, 1484, 1532 নয়)
  assert(
    a03ProdR2.xml.includes('<w:tblGrid><w:gridCol w:w="8608"/><w:gridCol w:w="2072"/></w:tblGrid>'),
    'a03 পাতা ১-এর প্রথম ছকে gridCol 8608/2072 অক্ষুণ্ণ থাকতে হবে'
  );
  assert(
    !a03ProdR2.xml.includes('<w:gridCol w:w="8948"/><w:gridCol w:w="1732"/>'),
    'a03 পাতা ১-এর প্রথম ছকে ভুল gridCol 8948/1732 থাকা যাবে না'
  );
  assert(
    a03ProdR2.xml.includes('<w:ind w:left="1860"/><w:jc w:val="center"/>') &&
    a03ProdR2.xml.includes('<w:ind w:left="1824"/><w:jc w:val="center"/>') &&
    a03ProdR2.xml.includes('<w:ind w:left="1872"/><w:jc w:val="center"/>'),
    'a03 পাতা ১-এর ৩টি শিরোনাম লাইনের বাম-ইনডেন্ট (1860, 1824, 1872) অক্ষুণ্ণ থাকতে হবে'
  );
  // ২) দ্বিতীয় বক্সের ভেতরে "লিঙ্গ : পুরুষ □ মহিলা □"-এর নিচের অনুভূমিক বিভাজক রেখা (<w:pBdr><w:bottom w:val="single" w:sz="4".../>) অক্ষুণ্ণ থাকা
  const genderRuleRe = /লিঙ্গ\s*:\s*<\/w:t>[\s\S]*?<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"\/><\/w:pBdr><w:spacing w:before="0" w:after="0" w:line="600" w:lineRule="exact"\/>[\s\S]*?<\/w:p><w:p><w:pPr><w:spacing w:before="60"[\s\S]*?ধর্ম\s*:/;
  assert(
    genderRuleRe.test(a03ProdR2.xml),
    'a03 পাতা ১-এর ~৬৩তম এলিমেন্টে "লিঙ্গ :"-এর নিচে এবং "ধর্ম :"-এর আগে <w:pBdr><w:bottom w:val="single" w:sz="4".../> বিভাজক অনুচ্ছেদ থাকতে হবে'
  );
});

test('১২. a03 পাতা ১-এর pageInfo-তে ছবির বর্ডার (x=483.4) ও বক্সের দাগ (x=289.3) vrules হিসেবে থাকলেও RULES2 তা উপেক্ষা করে পাতা ১ ও ২ অপরিবর্তিত রাখে', () => {
  const a03WithInjectedVR = runPipeline('a03', [...PROD_SWITCHES, 'RULES2'], [], false, (meas) => {
    meas.pageInfo[1].vrules = [
      { x: 36.2, y: 150.7, h: 256.8, y0: 150.7, y1: 407.5, t: 1.5 },
      { x: 36.2, y: 423.4, h: 273.6, y0: 423.4, y1: 697, t: 1.5 },
      { x: 289.3, y: 569.3, h: 127.4, y0: 569.3, y1: 696.7, t: 0.5 },
      { x: 483.4, y: 49.4, h: 92.1, y0: 49.4, y1: 141.5, t: 1 },
      { x: 541.5, y: 150.7, h: 256.8, y0: 150.7, y1: 407.5, t: 1.5 },
      { x: 541.5, y: 423.4, h: 273.6, y0: 423.4, y1: 697, t: 1.5 },
      { x: 569.8, y: 49.4, h: 92.1, y0: 49.4, y1: 141.5, t: 1 }
    ];
    meas.pageInfo[1].boxes = meas.pageInfo[1].boxes.filter((b) => !b.dashed);
  });
  assertEqual(a03WithInjectedVR.xml, a03ProdOff.xml, 'ইনজেক্ট করা vrules থাকলেও a03 XML ১০০% বাইট-বাই-বাইট অভিন্ন থাকবে');
});

test('১৩. page-geometry.js-এ RULES2 সুইচ ছোট/উপ-আয়তে কলাম-স্ক্যান চালায় কিন্তু পূর্ণ-পাতার মাপে (W>=400, H>=400) ভুয়া বক্স-বর্ডার তোলে না', () => {
  resetSwitches();
  const { PG: pgOff } = loadModules();
  assertEqual(pgOff.rules2On(), false, 'ডিফল্ট অবস্থায় PG.rules2On() = false');

  // ১) কৃত্রিম ছোট মাস্ক (১০০×৬০ পিক্সেল): সংযুক্ত খাড়া রেখা (x=50, y=5..50)
  const W = 100, H = 60;
  const mask = new Uint8Array(W * H);
  for (let x = 5; x < 95; x++) mask[5 * W + x] = 1;
  for (let y = 5; y <= 50; y++) mask[y * W + 50] = 1;
  const m = { W, H, mask };

  const vrOff = pgOff.verticalRules(m, { pxPerPt: 1 });
  assertEqual(vrOff.length, 0, 'সুইচ বন্ধ থাকলে সংযুক্ত চওড়া খণ্ডের ভেতরের খাড়া দাগ components-এ আলাদা হয় না');

  globalThis.__FZ_ON_RULES2 = true;
  assertEqual(pgOff.rules2On(), true, 'সুইচ চালু করলে PG.rules2On() = true');
  const vrOn = pgOff.verticalRules(m, { pxPerPt: 1 });
  assert(vrOn.length === 1 && Math.abs(vrOn[0].x - 50) <= 1 && vrOn[0].h >= 40, 'RULES2 চালু থাকলে উপ-আয়ত/ছোট মাস্কে সংযুক্ত খাড়া দাগ (x=50) শনাক্ত হয়');

  // ২) পূর্ণ-পাতার মাস্ক (৫৯৫×৮৪২, কোনো box/rect ছাড়া): ছবির বক্সের বর্ডার vrules হিসেবে ঢুকবে না
  const pW = 595, pH = 842;
  const pMask = new Uint8Array(pW * pH);
  for (let x = 483; x <= 570; x++) { pMask[49 * pW + x] = 1; pMask[141 * pW + x] = 1; }
  for (let y = 49; y <= 141; y++) { pMask[y * pW + 483] = 1; pMask[y * pW + 570] = 1; }
  const pm = { W: pW, H: pH, mask: pMask };
  const pVrOn = pgOff.verticalRules(pm, { pxPerPt: 1 });
  assertEqual(pVrOn.length, 0, 'পূর্ণ-পাতার স্ক্যানে (box/rect ছাড়া) ছবির চারপাশের বক্স-বর্ডার vrules হিসেবে উঠবে না');
  resetSwitches();
});

console.log(`\nফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
