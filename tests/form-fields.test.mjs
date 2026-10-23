/**
 * কাজ FORMTPL_v1 — পর্ব ৬: ফরম-ছাঁচ (GENERAL_CLEAN পথে) ইউনিট ও ইন্টিগ্রেশন টেস্ট
 * চালানো: node tests/form-fields.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DM = require(path.join(ROOT, 'js/layout-engine/doc-model.js'));
require(path.join(ROOT, 'js/layout-engine/role-marks.js'));
const AD = require(path.join(ROOT, 'js/layout-engine/doc-model-adapters.js'));
const FF = require(path.join(ROOT, 'js/layout-engine/form-fields.js'));
const GC = require(path.join(ROOT, 'js/layout-engine/general-clean-layout.js'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failed++;
    console.error(`ব্যর্থ [${name}]:`, err && err.message ? err.message : err);
  }
}

function makeDoc(blocks, meta) {
  const doc = DM.createDocument(meta || {});
  DM.addPage(doc, blocks);
  return doc;
}

// (ক) ডট-লিডার ট্যাব XML: লেবেল + ডান-সারিবদ্ধ dot-leader ট্যাব, ডট কখনো বোল্ড নয়, একই ফরমে সব লেবেলের ফন্ট-মাপ সমান
test('(ক) ডট-লিডার ট্যাব XML ও নিচে-ডট/রেখা, ডট বোল্ড নয়, লেবেল ফন্ট-মাপ সমান', () => {
  const doc = makeDoc([
    DM.block('paragraph', { text: 'নাম: ........', bold: true, size: 's', box: [100, 40, 120, 950] }),
    DM.block('paragraph', { text: 'ঠিকানা:\n................', bold: false, size: 'l', box: [140, 40, 180, 950] }),
    DM.block('label_value', { text: 'পেশা:', bold: false, size: 'm', box: [200, 40, 220, 950] })
  ]);
  const r = GC.render(doc, { generalClean: true });
  const xml = r.bodyXml;

  // ১. ডান-সারিবদ্ধ dot-leader ট্যাব (w:tab w:leader="dot" w:val="right") পাতার ডান সীমা পর্যন্ত
  const rightEdge = 11906 - 2 * r.stats.margin;
  assert.ok(xml.includes(`<w:tab w:leader="dot" w:val="right" w:pos="${rightEdge}"/>`), 'ডান সীমা পর্যন্ত dot-leader ট্যাব থাকতে হবে');
  assert.equal((xml.match(/<w:tab w:leader="dot"/g) || []).length, 3, '৩টি ডট-লিডার ঘর তৈরি হতে হবে');

  // ২. ডট কখনো বোল্ড নয় (ট্যাব রানে <w:b/> থাকা যাবে না)
  const tabRuns = xml.match(/<w:r>(?:(?!<\/w:r>).)*<w:tab\/>(?:(?!<\/w:r>).)*<\/w:r>/g) || [];
  assert.equal(tabRuns.length, 3, '৩টি ট্যাব রান থাকতে হবে');
  tabRuns.forEach((tr) => {
    assert.ok(!tr.includes('<w:b/>'), 'ডট-লিডার ট্যাব রানে কখনো <w:b/> থাকতে পারবে না');
  });

  // ৩. একই ফরমে সব লেবেলের ফন্ট-মাপ সমান (size='s' ও size='l' থাকা সত্ত্বেও সব লেবেলের w:sz সমান)
  const szVals = Array.from(xml.matchAll(/<w:sz w:val="(\d+)"\/>/g)).map((m) => m[1]);
  assert.ok(szVals.length >= 3 && szVals.every((v) => v === szVals[0]), 'একই ফরমে সব লেবেলের ফন্ট-মাপ সমান হতে হবে');
});

// (খ) এক সারিতে ২ ঘর: একাধিক ট্যাব-স্টপ, প্রস্থ অনুপাতে
test('(খ) এক সারিতে ২ ঘর (এক ব্লকে ও পাশাপাশি দুই ব্লকে)', () => {
  const doc = makeDoc([
    DM.block('paragraph', { text: 'পিতার নাম ....... মাতার নাম .......', box: [100, 40, 120, 950] }),
    DM.block('paragraph', { text: 'রক্তের গ্রুপ : ....................', box: [150, 40, 170, 440] }),
    DM.block('paragraph', { text: 'লিঙ্গ: ....................', box: [152, 460, 172, 950] })
  ]);
  const r = GC.render(doc, { generalClean: true });
  const paras = r.bodyXml.match(/<w:p>[\s\S]*?<\/w:p>/g) || [];
  assert.equal(paras.length, 2, 'দুটি সারি ২টি অনুচ্ছেদে রেন্ডার হতে হবে');

  paras.forEach((p, idx) => {
    const posMatches = Array.from(p.matchAll(/<w:tab w:leader="dot" w:val="right" w:pos="(\d+)"\/>/g)).map((m) => Number(m[1]));
    assert.equal(posMatches.length, 2, `সারি ${idx + 1}-এ ২টি ডট-লিডার ট্যাব-স্টপ থাকতে হবে`);
    assert.ok(posMatches[0] > 1000 && posMatches[0] < posMatches[1], 'প্রথম ট্যাব-স্টপ দ্বিতীয়টির বামে ও প্রস্থ অনুপাতে হতে হবে');
    assert.equal(posMatches[1], 11906 - 2 * r.stats.margin, 'শেষ ট্যাব-স্টপ পাতার ডান সীমায় হতে হবে');
  });
});

// (গ) ছবির ঘর (passport photo box): ডানে নির্দিষ্ট মাপের সীমানাওয়ালা ফাঁকা ঘর, পাশের ঘরগুলো বাঁয়ে
test('(গ) ছবির ঘর (ডানে সীমানাওয়ালা ফাঁকা ঘর, বাঁয়ে পাশের ঘরগুলো)', () => {
  const doc = makeDoc([
    DM.block('paragraph', { text: 'নাম : ....................', box: [130, 40, 150, 740] }),
    DM.block('figure', { text: '', box: [120, 768, 250, 945] }),
    DM.block('paragraph', { text: 'পিতার নাম : ....................', box: [175, 40, 195, 740] }),
    DM.block('paragraph', { text: 'মাতার নাম : ....................', box: [215, 40, 235, 740] })
  ]);
  const r = GC.render(doc, { generalClean: true });
  const xml = r.bodyXml;

  // ফ্রেমহীন ২-কলাম টেবিল
  assert.ok(xml.includes('<w:tbl>'), 'ছবির ঘরের জন্য টেবিল থাকতে হবে');
  assert.ok(xml.includes('<w:tblBorders><w:top w:val="nil"/>'), 'মূল টেবিলটি ফ্রেমহীন (nil border) হতে হবে');

  // বাম কোষে পাশের ডট-লিডার ঘরগুলো এবং ডান কোষে চারপাশে single বর্ডারযুক্ত ফাঁকা ঘর
  const cells = xml.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || [];
  assert.equal(cells.length, 2, 'টেবিলে বাম ও ডান ২টি কোষ থাকতে হবে');
  assert.ok(cells[0].includes('নাম :') && cells[0].includes('পিতার নাম :') && cells[0].includes('মাতার নাম :'), 'পাশের ঘরগুলো বাম কোষে থাকতে হবে');
  assert.ok(cells[0].includes('<w:tab w:leader="dot"'), 'বাম কোষের ঘরগুলোতে ডট-লিডার ট্যাব থাকতে হবে');
  assert.ok(cells[1].includes('<w:tcBorders><w:top w:val="single"') && cells[1].includes('<w:right w:val="single"'), 'ডান কোষে নির্দিষ্ট মাপের সীমানা (single border) থাকতে হবে');
});

// (ঘ) ☐ চেকবক্স সারি: ☐ চিহ্ন + লেবেল, ট্যাবে সারিবদ্ধ
test('(ঘ) ☐ চেকবক্স সারি (☐ চিহ্ন + লেবেল, ট্যাবে সারিবদ্ধ)', () => {
  const doc = makeDoc([
    DM.block('paragraph', { text: 'সদস্যের ধরন: ☐ সাধারণ ☐ আজীবন ☐ দাতা', box: [100, 40, 120, 950] }),
    DM.block('paragraph', { text: '[ ] হ্যাঁ [ ] না', box: [140, 40, 160, 500] })
  ]);
  const r = GC.render(doc, { generalClean: true });
  const paras = r.bodyXml.match(/<w:p>[\s\S]*?<\/w:p>/g) || [];
  assert.equal(paras.length, 2, '২টি চেকবক্স সারি থাকতে হবে');
  assert.ok(paras[0].includes('☐ সাধারণ') && paras[0].includes('☐ আজীবন') && paras[0].includes('☐ দাতা'), '☐ চিহ্ন + লেবেল থাকতে হবে');
  assert.ok(paras[0].includes('<w:tabs><w:tab w:val="left"') && paras[0].includes('<w:tab/>'), 'চেকবক্সগুলো ট্যাবে সারিবদ্ধ হতে হবে');
  assert.ok(paras[1].includes('☐ হ্যাঁ') && paras[1].includes('☐ না') && paras[1].includes('<w:tab/>'), '[ ] চিহ্ন ☐-এ রূপান্তরিত ও ট্যাবে সারিবদ্ধ হতে হবে');
});

// (ঙ) কাটার রেখা: "-----✂-----" বা ডটেড কাটার রেখা → পূর্ণ-প্রস্থ ড্যাশড নিচ-সীমানার অনুচ্ছেদ
test('(ঙ) কাটার রেখা (পূর্ণ-প্রস্থ ড্যাশড নিচ-সীমানার অনুচ্ছেদ)', () => {
  const doc = makeDoc([
    DM.block('paragraph', { text: 'উপরের অংশ : ............', box: [100, 40, 120, 950] }),
    DM.block('paragraph', { text: '-----✂-----', box: [500, 40, 515, 950] }),
    DM.block('paragraph', { text: '. . . . . . . . . . . .', box: [700, 40, 715, 950] })
  ]);
  const r = GC.render(doc, { generalClean: true });
  const dashedCount = (r.bodyXml.match(/<w:pBdr><w:bottom w:val="dashed"/g) || []).length;
  assert.equal(dashedCount, 2, 'কাঁচি ও ডটেড উভয় কাটার রেখা ড্যাশড নিচ-সীমানার অনুচ্ছেদে রূপান্তরিত হতে হবে');
  assert.ok(!r.bodyXml.includes('✂'), 'কাটার রেখার অনুচ্ছেদে অতিরিক্ত টেক্সট না থেকে পূর্ণ-প্রস্থ ড্যাশড বর্ডার থাকতে হবে');
});

// (চ) ফরম নেই এমন doc-এ আউটপুট অপরিবর্তিত
test('(চ) ফরম নেই এমন doc-এ আউটপুট বাইট-বাই-বাইট অপরিবর্তিত', () => {
  const nonFormDoc = AD.fromCaptureBlocks({
    blocks: [
      { type: 'title', text: 'বার্ষিক প্রতিবেদন', lines: ['বার্ষিক প্রতিবেদন'], page: 1, box: [80, 250, 130, 750], align: 'c', fs: 'xl', bold: true },
      { type: 'heading', text: 'ভূমিকা', lines: ['ভূমিকা'], page: 1, box: [150, 100, 180, 400], align: 'l', fs: 'l', bold: true },
      { type: 'paragraph', text: 'এটি একটি সাধারণ অনুচ্ছেদ যেখানে কোনো ফরমের ঘর নেই।', lines: ['এটি একটি সাধারণ অনুচ্ছেদ যেখানে কোনো ফরমের ঘর নেই।'], page: 1, box: [200, 100, 240, 900], align: 'l', fs: 'm', bold: false },
      { type: 'other', text: '⟦─×120⟧', lines: ['⟦─×120⟧'], page: 1, box: [250, 100, 255, 900], align: 'l', fs: 'm', bold: false },
      { type: 'table', text: 'ক্রম | বিবরণ\n১ | বই', lines: ['ক্রম | বিবরণ', '১ | বই'], page: 1, box: [280, 100, 380, 900], align: 'l', fs: 'm', bold: false },
      { type: 'list_item', text: '১. প্রথম দফা', lines: ['১. প্রথম দফা'], page: 1, box: [400, 100, 430, 900], align: 'l', fs: 'm', bold: false },
      { type: 'signature', text: 'স্বাক্ষর\nপরিচালক', lines: ['স্বাক্ষর', 'পরিচালক'], page: 1, box: [800, 600, 860, 900], align: 'r', fs: 'm', bold: false },
      { type: 'footer', text: 'পৃষ্ঠা ১', lines: ['পৃষ্ঠা ১'], page: 1, box: [940, 400, 960, 600], align: 'c', fs: 's', bold: false }
    ]
  });

  assert.equal(FF.hasFormFields(nonFormDoc), false, 'সাধারণ ডকুমেন্টে hasFormFields false হতে হবে');
  const rDefault = GC.render(nonFormDoc, { generalClean: true });
  globalThis.FZ_OFF_FORMTPL = true;
  const rOff = GC.render(nonFormDoc, { generalClean: true });
  delete globalThis.FZ_OFF_FORMTPL;

  assert.equal(rDefault.bodyXml, rOff.bodyXml, 'ফরম নেই এমন doc-এ bodyXml বাইট-বাই-বাইট অভিন্ন হতে হবে');
  assert.equal(rDefault.sectPr, rOff.sectPr, 'ফরম নেই এমন doc-এ sectPr বাইট-বাই-বাইট অভিন্ন হতে হবে');
  assert.equal(rDefault.stylesXml, rOff.stylesXml, 'ফরম নেই এমন doc-এ stylesXml বাইট-বাই-বাইট অভিন্ন হতে হবে');
  assert.deepEqual(rDefault.stats, rOff.stats, 'ফরম নেই এমন doc-এ stats হুবহু অভিন্ন হতে হবে');
});

// (ছ) সুইচ বন্ধে অপরিবর্তিত (FZ_OFF_FORMTPL)
test('(ছ) FZ_OFF_FORMTPL সুইচ বন্ধে আউটপুট বাইট-বাই-বাইট আগের মতো', () => {
  const capPath = path.join(ROOT, 'sample/T21_capture.json');
  const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
  const doc = AD.fromCapture(cap);

  globalThis.FZ_OFF_FORMTPL = true;
  const rOffGlobal = GC.render(doc, { generalClean: true });
  delete globalThis.FZ_OFF_FORMTPL;

  process.env.FZ_OFF_FORMTPL = '1';
  const rOffEnv = GC.render(doc, { generalClean: true });
  delete process.env.FZ_OFF_FORMTPL;

  assert.equal(rOffGlobal.bodyXml, rOffEnv.bodyXml, 'গ্লোবাল ও env উভয় সুইচেই একই পুরোনো আউটপুট হতে হবে');
  assert.ok(!rOffGlobal.bodyXml.includes('w:leader="dot"'), 'সুইচ বন্ধ থাকলে কোনো dot-leader ট্যাব তৈরি হবে না');
  assert.ok(rOffGlobal.bodyXml.includes('নাম : ................................................................................'), 'সুইচ বন্ধ থাকলে ডটগুলো সাধারণ অনুচ্ছেদ হিসেবেই থাকবে');
});

// (জ) T21 ক্যাপচার থেকে কমপক্ষে ৮টি ডট-লিডার ঘর এবং ১ পাতায় আঁটানো
test('(জ) T21 ক্যাপচার থেকে কমপক্ষে ৮টি ডট-লিডার ঘর, ছবির ঘর, চেকবক্স, কাটার রেখা ও ১ পাতায় আঁটানো', () => {
  const capPath = path.join(ROOT, 'sample/T21_capture.json');
  const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
  const doc = AD.fromCapture(cap);
  const r = GC.render(doc, { generalClean: true });
  const xml = r.bodyXml;

  // কমপক্ষে ৮টি ডট-লিডার ঘর
  const dotLeaderStops = (xml.match(/<w:tab w:leader="dot"/g) || []).length;
  const dotLeaderParas = (xml.match(/<w:p>(?:(?!<\/w:p>).)*<w:tab w:leader="dot"[\s\S]*?<\/w:p>/g) || []).length;
  assert.ok(dotLeaderParas >= 8 && dotLeaderStops >= 8, `কমপক্ষে ৮টি ডট-লিডার ঘর থাকতে হবে (পাওয়া গেছে ${dotLeaderParas}টি সারি, ${dotLeaderStops}টি ঘর)`);

  // ছবির ঘর (উপরে ও নিচে ২টি)
  const photoTables = (xml.match(/<w:tbl>/g) || []).length;
  assert.ok(photoTables >= 2, 'T21-এ ছবির ঘরের টেবিল থাকতে হবে');

  // ☐ চেকবক্স সারি
  assert.ok(xml.includes('☐ আছে') && xml.includes('☐ নেই'), 'T21-এ ☐ আছে / ☐ নেই চেকবক্স সারি থাকতে হবে');

  // কাটা অংশ (ড্যাশড নিচ-সীমানা)
  assert.ok(xml.includes('<w:pBdr><w:bottom w:val="dashed"'), 'T21-এ সদস্য অংশের আগে কাটার রেখা থাকতে হবে');

  // এক পাতায় আঁটানো: ফন্ট ১০pt (কখনো ১০pt-এর নিচে নয়) এবং লাইন-ফাঁক কমানো
  assert.equal(r.stats.base, 10, '১ পাতার ঘন ফরমে ফন্ট ১০pt হতে হবে');
  const allSz = Array.from(xml.matchAll(/<w:sz w:val="(\d+)"\/>/g)).map((m) => Number(m[1]));
  assert.ok(allSz.length > 0 && allSz.every((v) => v >= 20), 'কোনো ফন্ট ১০pt (sz=20)-এর নিচে হতে পারবে না');
  assert.ok(!r.stylesXml.includes('w:line="276"'), 'এক পাতায় আঁটানোর জন্য লাইন-ফাঁক ২৭৬ থেকে কমানো হতে হবে');
});

console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
if (failed > 0) process.exit(1);
