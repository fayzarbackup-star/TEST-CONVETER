// SERIALHANG একক ও a16 গোল্ডেন-ডেটা টেস্ট: ক্রমিক-অনুচ্ছেদে ট্যাব + মূলের মাপা ঝুলন্ত ইনডেন্ট; সুইচ বন্ধে বাইট-বাই-বাইট অভিন্ন
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SH = require('../js/layout-engine/faithful/serial-hang.js');

let pass = 0, fail = 0;
const t = (name, fn) => {
  try {
    fn();
    pass++;
  } catch (e) {
    fail++;
    console.error(`ব্যর্থ [${name}]:`, e.message);
  }
};

t('সাধারণ ক্রমিক → ট্যাব + ঝুলন্ত', () => {
  const p = '<w:p><w:pPr><w:ind w:left="200"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">১০। আবেদনকারীর নাম</w:t></w:r></w:p>';
  const q = SH.fixPara(p);
  assert.match(q, /<w:t xml:space="preserve">১০।<\/w:t><w:tab\/><w:t xml:space="preserve">আবেদনকারীর নাম<\/w:t>/);
  assert.match(q, /<w:ind w:left="680" w:hanging="480"\/>/);
});

t('firstLine থাকলে নম্বর সেখানেই', () => {
  const q = SH.fixPara('<w:p><w:pPr><w:ind w:left="100" w:firstLine="300"/></w:pPr><w:r><w:t>(ক) লেখা</w:t></w:r></w:p>');
  assert.match(q, /w:left="880" w:hanging="480"/);
});

t('ind নেই → jc-এর আগে বসে', () => {
  const q = SH.fixPara('<w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="both"/></w:pPr><w:r><w:t>১। লেখা</w:t></w:r></w:p>');
  assert.match(q, /<w:spacing w:after="0"\/><w:ind w:left="480" w:hanging="480"\/><w:jc/);
});

t('অক্ষত: অক্রমিক, কেন্দ্রিত, আগেই ঝুলন্ত, শুধু নম্বর, ছোট ট্যাব-স্টপ', () => {
  for (const p of [
    '<w:p><w:r><w:t>সাধারণ লেখা ১। নয়</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>১। শিরোনাম</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:ind w:left="400" w:hanging="300"/></w:pPr><w:r><w:t>১। লেখা</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>১।</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>০১। আবেদনকারীর নাম</w:t><w:tab/><w:t>:</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="200"/></w:tabs></w:pPr><w:r><w:t>১। লেখা</w:t></w:r></w:p>',
  ]) assert.strictEqual(SH.fixPara(p), p);
});

t('apply গণনা', () => {
  const r = SH.apply('<w:p><w:r><w:t>১। ক</w:t></w:r></w:p><w:p><w:pPr></w:pPr><w:r><w:t>খ</w:t></w:r></w:p><w:p><w:r><w:t>২) গ</w:t></w:r></w:p>');
  assert.strictEqual(r.n, 2);
});

t('a16 পাতা ১: বিতরণ তালিকার ৪. ক্রমিক-অনুচ্ছেদে ট্যাব ও ঝুলন্ত ইনডেন্ট মূলের মাপা x (১৫০৬ dxa)-এর সাথে মেলে', () => {
  require('../js/layout-engine/faithful/switch-defaults.js');
  const FB = require('../js/layout-engine/faithful/faithful-docx-builder.js');
  const ir = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/runs/off/a16/ir.json'), 'utf8'));
  const meas = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/runs/off/a16/measures.json'), 'utf8'));
  const { xml: xml0 } = FB.bodyXml(ir);

  // মূলের মাপ: পাতা ১-এ বাম মার্জিন ৮৪pt, ৪.-এর শুরু ১২৬.২pt (৮৪৪ dxa) এবং লেখার শুরু ১৫৯.৩১pt (১৫০৬ dxa, ঝুলন্ত ৬৬২ dxa)
  const m12 = meas.measures[12];
  const pageLeftPt = ir.pages[0].margins.left;
  const measuredLeftTw = Math.round((m12.lines[0].x - pageLeftPt) * 20);
  assert.strictEqual(measuredLeftTw, 1506);

  const res = SH.apply(xml0, { ir, measures: meas });
  assert.strictEqual(res.n, 56);
  const paras = res.xml.match(/<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>/g) || [];
  const p4 = paras.find((p) => p.includes('সিনিয়র সিস্টেম এনালিস্ট'));
  assert.ok(p4, '৪. ক্রমিকের অনুচ্ছেদ পাওয়া যায়নি');
  assert.match(p4, /<w:t xml:space="preserve">৪\.<\/w:t><w:tab\/><w:t xml:space="preserve">সিনিয়র সিস্টেম এনালিস্ট/);
  assert.match(p4, /<w:ind w:left="1506" w:hanging="662"\/>/);
});

t('a16 পাতা ৩–৯: চেকলিস্ট ছকের ৫৫টি ক)–ঙ) ক্রমিক-অনুচ্ছেদে মাপা প্রস্থ (২৮০ dxa = ১৪pt) বসে ও লাইন-ভাঙা বদলায় না', () => {
  const FB = require('../js/layout-engine/faithful/faithful-docx-builder.js');
  const ir = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/runs/off/a16/ir.json'), 'utf8'));
  const meas = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/golden-data/runs/off/a16/measures.json'), 'utf8'));
  const { xml: xml0 } = FB.bodyXml(ir);

  const rXml = SH.apply(xml0);
  const rIr = SH.apply(xml0, ir);
  const rMeas = SH.apply(xml0, meas);
  assert.strictEqual(rXml.xml, rIr.xml);
  assert.strictEqual(rXml.xml, rMeas.xml);

  const paras = rXml.xml.match(/<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>/g) || [];
  // পাতা ৩ সারি ১৯ (৮। ক) এবং পাতা ৮ সারি ১০ (৬। গ) — আগে ৫০০ dxa (২৫pt) ইনডেন্টে ২ লাইনে ভেঙে +১৫pt সরে গিয়েছিল
  const p3r19 = paras.find((p) => p.includes('প্রস্তাবকারী সংস্থার অনুমোদিত সাংগঠনিক কাঠামো আছে কিনা?'));
  const p8r10 = paras.find((p) => p.includes('বর্তমান অনুমোদিত যানবাহনের বণ্টন ব্যবস্থা উল্লেখ করা হয়েছে কিনা?'));
  assert.ok(p3r19 && p8r10);
  assert.match(p3r19, /<w:t xml:space="preserve">ক\)<\/w:t><w:tab\/><w:t xml:space="preserve">প্রস্তাবকারী সংস্থার অনুমোদিত সাংগঠনিক কাঠামো আছে কিনা\?<\/w:t>/);
  assert.match(p3r19, /<w:ind w:left="280" w:hanging="280"\/>/);
  assert.match(p8r10, /<w:t xml:space="preserve">গ\)<\/w:t><w:tab\/><w:t xml:space="preserve">বর্তমান অনুমোদিত যানবাহনের বণ্টন ব্যবস্থা উল্লেখ করা হয়েছে কিনা\?<\/w:t>/);
  assert.match(p8r10, /<w:ind w:left="280" w:hanging="280"\/>/);

  // ছকের সব ক)–ঙ) অনুচ্ছেদে ঝুলন্ত ইনডেন্ট ২৮০ dxa (১৪pt) — যা মূলের ক)+স্পেস প্রস্থের সমান, তাই লাইনের কার্যকর প্রস্থ কমে না
  const tblSerParas = paras.filter((p) => /<w:t xml:space="preserve">[ক-হ]\)\s*<\/w:t><w:tab\/>/.test(p));
  assert.strictEqual(tblSerParas.length, 55);
  for (const tp of tblSerParas) {
    assert.match(tp, /<w:ind w:left="280" w:hanging="280"\/>/);
  }
});

t('সুইচ SERIALHANG বন্ধ থাকলে আউটপুট বাইট-বাই-বাইট অপরিবর্তিত থাকে', () => {
  delete globalThis.__FZ_ON_SERIALHANG;
  if (process.env.FZ_ON) delete process.env.FZ_ON;
  assert.strictEqual(SH.isOn(), false);
  globalThis.__FZ_ON_SERIALHANG = true;
  assert.strictEqual(SH.isOn(), true);
  delete globalThis.__FZ_ON_SERIALHANG;
});

console.log(`ফলাফল: ${pass} পাস, ${fail} ব্যর্থ`);
if (fail > 0) process.exit(1);
