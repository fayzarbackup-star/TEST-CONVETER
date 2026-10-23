'use strict';

// Phase 4 gates — নকশা-পত্র v1: প্রম্পট, ট্যাগ-পার্সার (ফ্রন্টম্যাটার/নতুন ভূমিকা/g/hdr/cw/mg/[?]), fromDesignSheet, অঙ্ক-লিপি, পুরোনো ক্যাপচার। Gemini লাগে না।
// চালানো: node tests/design-sheet.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const g = globalThis;
g.EquationConverter = require(path.join(ROOT, 'js/equation-converter.js'));
g.BanglaConverter = require(path.join(ROOT, 'js/bangla-converter-engine.js'));
g.TextRunProcessor = require(path.join(ROOT, 'js/layout-engine/text-run-processor.js'));
g.jszip = require(path.join(ROOT, 'js/jszip.min.js'));
g.ExportDualEngine = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const P = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-prompt.js'));
const T = require(path.join(ROOT, 'js/layout-engine/faithful/layout-tags.js'));
const DM = require(path.join(ROOT, 'js/layout-engine/doc-model.js'));
const AD = require(path.join(ROOT, 'js/layout-engine/doc-model-adapters.js'));
const GC = require(path.join(ROOT, 'js/layout-engine/general-clean-layout.js'));

let gates = 0;
const check = (cond, name) => { assert.ok(cond, name); gates++; };

(async () => {
  // ১) প্রম্পট: ডিফল্ট অপরিবর্তিত, designSheet-এ নতুন নিয়ম
  const def = P.build({ pageCount: 1 }), ds = P.build({ pageCount: 1, designSheet: true });
  check(!/DESIGN-SHEET/.test(def) && !/marginal_note/.test(def), 'prompt: ডিফল্টে নকশা-পত্র নিয়ম নেই');
  check(/doc_type:/.test(ds) && /digits:/.test(ds) && /orientation:/.test(ds) && /columns:/.test(ds), 'prompt: ফ্রন্টম্যাটার ক্ষেত্র');
  check(P.DESIGN_ROLES.every((r) => ds.indexOf(r) >= 0), 'prompt: ৫টি নতুন ভূমিকা');
  check(/g=<id>/.test(ds) && /hdr=<N>/.test(ds) && /cw=/.test(ds) && /mg=/.test(ds) && /\[\?\]/.test(ds), 'prompt: g/hdr/cw/mg/[?]');
  check(/NEVER convert Bengali to English or English to Bengali/.test(ds), 'prompt: অঙ্ক-লিপি অটুট নিয়ম');
  check(/Do NOT repeat the frontmatter/.test(P.continuation({ pageCount: 1, designSheet: true })), 'prompt: continuation-এ ফ্রন্টম্যাটার পুনরাবৃত্তি নয়');

  // ২) পার্সার — নতুন ফরম্যাট
  const NEW = [
    '---', 'doc_type: letter', 'page: A4', 'orientation: portrait', 'columns: 1', 'digits: en', '---',
    '[[B:t=title;p=1;box=20,300,70,700;al=c;fs=xl;b=1]]', 'আবেদনপত্র',
    '[[B:t=date;p=1;box=80,700,110,950;al=r;fs=m;b=0;g=1]]', 'Date: 23/10/2026',
    '[[B:t=recipient;p=1;box=80,50,160,400;al=l;fs=m;b=0;g=1]]', 'বরাবর', 'প্রধান শিক্ষক',
    '[[B:t=subject;p=1;box=170,50,200,900;al=l;fs=m;b=1]]', 'বিষয়: ছুটির আবেদন',
    '[[B:t=salutation;p=1;box=210,50,235,300;al=l;fs=m;b=0]]', 'জনাব,',
    '[[B:t=marginal_note;p=1;box=300,2,500,40;al=l;fs=s;b=0]]', 'মার্জিন নোট',
    '[[B:t=paragraph;p=1;box=240,50,300,900;al=j;fs=m;b=0]]', 'আমার ফোন 01711223344 এবং রোল 25 কিন্তু এই শব্দ [?] পড়া যায়নি।',
    '[[B:t=table;p=1;box=320,50,600,950;al=l;fs=m;b=0;hdr=2;cw=10:40:25:25;mg=0.2.2.1/1.0.1.2]]',
    'ক্রম | বিবরণ | পরিমাণ | ', ' | | টাকা | সংখ্যা', '1 | চাল | 500 | 5',
    '[[B:t=signature;p=1;box=700,600,760,950;al=r;fs=m;b=0]]', 'প্রধান শিক্ষক',
    '[এআই অডিট নোট ও পরিবর্তনসমূহ: ঠিক আছে]'
  ].join('\n');
  const pn = T.parse(NEW);
  check(pn.frontmatter && pn.frontmatter.docType === 'letter' && pn.frontmatter.page === 'A4' && pn.frontmatter.orientation === 'portrait'
    && pn.frontmatter.columns === 1 && pn.frontmatter.digits === 'en', 'parse: ফ্রন্টম্যাটার');
  check(!pn.issues.some((i) => i.kind === 'untagged_preamble'), 'parse: ফ্রন্টম্যাটার প্রিঅ্যাম্বল-ত্রুটি নয়');
  check(pn.blocks.length === 9, 'parse: ৯টি ব্লক ' + pn.blocks.length);
  const ty = pn.blocks.map((b) => b.type).join();
  check(ty === 'title,date,recipient,subject,salutation,marginal_note,paragraph,table,signature', 'parse: নতুন ভূমিকা অটুট ' + ty);
  check(pn.blocks[1].group === '1' && pn.blocks[2].group === '1' && pn.blocks[0].group === undefined, 'parse: g গ্রুপ-আইডি');
  const tb = pn.blocks[7];
  check(tb.hdr === 2 && tb.cw.join(':') === '10:40:25:25' && tb.merges.length === 2 && tb.merges[0].cs === 2 && tb.merges[1].rs === 2, 'parse: টেবিল hdr/cw/mg');
  check(pn.blocks[6].unreadable === 1 && /\[\?\]/.test(pn.blocks[6].text), 'parse: [?] গোনা ও লেখায় অটুট');
  check(pn.blocks[6].text.indexOf('01711223344') >= 0 && pn.blocks[6].text.indexOf('25') >= 0 && !/[০-৯]/.test(pn.blocks[6].text), 'parse: ইংরেজি অঙ্ক ইংরেজিই');
  check(!pn.blocks.some((b) => b.unknownType), 'parse: অজানা ধরন নেই');

  // বাংলা অঙ্ক বাংলাই থাকে
  const bnp = T.parse('---\ndoc_type: form\ndigits: bn\n---\n[[B:t=paragraph;p=1;box=10,10,100,900;al=l;fs=m;b=0]]\nমোবাইল ০১৭১১২২৩৩৪৪, রোল ২৫');
  check(bnp.frontmatter.digits === 'bn' && bnp.blocks[0].text === 'মোবাইল ০১৭১১২২৩৩৪৪, রোল ২৫', 'parse: বাংলা অঙ্ক বাংলাই');

  // অজানা ধরন চিহ্নিত
  const unk = T.parse('[[B:t=banana;p=1;box=10,10,100,900;al=l]]\nx');
  check(unk.blocks[0].type === 'other' && unk.blocks[0].unknownType === 'banana', 'parse: অজানা ধরন → other + unknownType');

  // ৩) পুরোনো ক্যাপচার (নতুন ট্যাগ ছাড়া) আগের মতো
  const OLD = '[[B:t=paragraph;p=1;box=10,10,100,900;al=l;fs=m;b=0;it=0;u=0]]\nপুরোনো লেখা\n[[B:t=table;p=1;box=120,10,300,900;al=l;fs=m;b=0]]\nক | খ\n১ | ২';
  const po = T.parse(OLD);
  check(po.frontmatter === undefined && po.blocks.length === 2 && po.blocks[0].group === undefined && po.blocks[1].hdr === undefined
    && po.blocks[1].cw === undefined && po.blocks[1].merges === undefined && po.blocks[0].unreadable === undefined, 'parse: পুরোনো ফরম্যাটে নতুন ক্ষেত্র নেই');
  check(T.parse('---\nশুধু সাধারণ ---\n[[B:t=paragraph;p=1;box=10,10,100,900]]\nক').frontmatter === undefined, 'parse: key:value ছাড়া --- ফ্রন্টম্যাটার নয়');

  // ৪) fromDesignSheet
  const doc = AD.fromCapture(pn);
  check(DM.validate(doc).length === 0, 'ds: doc-model বৈধ');
  check(doc.meta.source === 'design-sheet' && doc.meta.digits === 'en' && doc.meta.orientation === 'portrait', 'ds: meta');
  const bl = doc.pages[0].blocks;
  const sbs = bl.find((b) => b.role === 'side_by_side');
  check(sbs && sbs.left.length === 1 && sbs.right.length === 1 && sbs.left[0].marks.variant === 'recipient' && sbs.right[0].marks.variant === 'date', 'ds: g=1 → side_by_side (বামে recipient, ডানে date)');
  const sub = DM.flat(doc).find((b) => b.marks && b.marks.variant === 'subject');
  check(sub && sub.bold === true && sub.role === 'paragraph', 'ds: subject → bold paragraph');
  check(DM.flat(doc).find((b) => b.marks && b.marks.variant === 'salutation'), 'ds: salutation');
  const mn = DM.flat(doc).find((b) => b.text === 'মার্জিন নোট');
  check(mn && mn.role === 'note' && !DM.isKept(mn), 'ds: marginal_note বাদ (v1)');
  check(!/মার্জিন/.test(DM.plainText(doc)), 'ds: marginal_note আউটপুট-লেখায় নেই');
  const dt = DM.flat(doc).find((b) => b.role === 'table');
  check(dt.headerRows === 2 && dt.colRatios.length === 4 && dt.merges.length === 2, 'ds: টেবিল headerRows/colRatios/merges');
  check(DM.flat(doc).find((b) => b.role === 'signature'), 'ds: signature ভূমিকা');
  check(DM.plainText(doc).indexOf('01711223344') >= 0 && !/[০-৯]/.test(DM.plainText(doc).replace(/ক্রম|সংখ্যা/g, '')), 'ds: অঙ্ক-লিপি অটুট (ইংরেজি)');
  const bd = AD.fromCapture(bnp);
  check(DM.plainText(bd).indexOf('০১৭১১২২৩৩৪৪') >= 0, 'ds: বাংলা অঙ্ক অটুট');

  // digits: en ঘোষিত অথচ বাংলা অঙ্ক এলে (মডেলের ভুল রূপান্তর) অ্যাডাপ্টার ইংরেজিতে ফেরায়; keepDigits দিলে নয়
  const wrong = T.parse('---\ndoc_type: table_sheet\ndigits: en\n---\n[[B:t=paragraph;p=1;box=10,10,100,900;al=l]]\nমোবাইল ০১৭১১২২৩৩৪৪');
  check(DM.plainText(AD.fromCapture(wrong)) === 'মোবাইল 01711223344', 'ds: digits=en হলে বাংলা অঙ্ক → ইংরেজি');
  check(DM.plainText(AD.fromCapture(wrong, { keepDigits: true })) === 'মোবাইল ০১৭১১২২৩৩৪৪', 'ds: keepDigits=true হলে অপরিবর্তিত');

  // figure-ট্যাগের পরের লেখা হারায় না (figText → অনুচ্ছেদ)
  const ft = T.parse('---\ndoc_type: letter\n---\n[[B:t=figure;p=1;box=10,10,100,900]]\nইউসুফ আলম\nম্যানেজার');
  check(ft.blocks[0].text === '' && ft.blocks[0].figText === 'ইউসুফ আলম\nম্যানেজার', 'parse: figure-পরের লেখা figText-এ');
  check(DM.plainText(AD.fromCapture(ft)).trim() === 'ইউসুফ আলম\nম্যানেজার', 'ds: figText উদ্ধার');

  // টেবিলের লাইন ' | | x' — ফাঁকা প্রথম ঘর কলাম সরায় না
  const lead = T.parse('---\ndoc_type: other\n---\n[[B:t=table;p=1;box=10,10,100,900;hdr=2]]\nক | খ | গ\n | | ঘ\nচ | ছ | ');
  const lt = DM.flat(AD.fromCapture(lead)).find((b) => b.role === 'table');
  check(lt.rows[1].join('/') === '//ঘ' && lt.rows[2].join('/') === 'চ/ছ/' && lt.rows.every((r) => r.length === 3), 'ds: টেবিলে শুরুর/শেষের ফাঁকা ঘর অটুট');

  // রাউটিং: ফ্রন্টম্যাটার না থাকলে পুরোনো অ্যাডাপ্টার
  const docOld = AD.fromCapture(po);
  check(docOld.meta.source === 'capture', 'route: পুরোনো ক্যাপচার → fromCaptureBlocks');
  check(AD.fromCapture(pn).meta.source === 'design-sheet', 'route: নতুন → fromDesignSheet');

  // ৫) রেন্ডার: merged টেবিল XML (gridSpan/vMerge) + কলাম-অনুপাত; পুরোনো টেবিল অপরিবর্তিত
  const xml = GC.render(doc, { generalClean: true });
  const body = (xml.bodyXml || xml.xml || xml.body || '');
  const blob = await GC.renderDocx(doc, { generalClean: true });
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(await blob.arrayBuffer());
  const zip = await g.jszip.loadAsync(buf);
  const dx = await zip.file('word/document.xml').async('string');
  check(/w:gridSpan w:val="2"/.test(dx) && /w:vMerge w:val="restart"/.test(dx) && /<w:vMerge\/>/.test(dx), 'render: gridSpan + vMerge');
  check((dx.match(/<w:tblHeader\/>/g) || []).length === 2, 'render: ২টি শিরোনাম-সারি');
  const oldXml = await (async () => {
    const b2 = await GC.renderDocx(docOld, { generalClean: true });
    const z2 = await g.jszip.loadAsync(Buffer.isBuffer(b2) ? b2 : Buffer.from(await b2.arrayBuffer()));
    return z2.file('word/document.xml').async('string');
  })();
  check(!/gridSpan|vMerge/.test(oldXml) && (oldXml.match(/<w:tblHeader\/>/g) || []).length === 1, 'render: পুরোনো টেবিল অপরিবর্তিত (১ header সারি, মার্জ নেই)');
  void body;

  console.log(`design-sheet: ${gates} gates PASS`);
})().catch((e) => { console.error('FAIL', e && e.message || e); process.exit(1); });
