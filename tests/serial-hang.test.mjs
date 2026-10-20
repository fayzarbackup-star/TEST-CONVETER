// SERIALHANG একক-টেস্ট: ক্রমিক-অনুচ্ছেদে ট্যাব + ঝুলন্ত ইনডেন্ট; অক্রমিক/কেন্দ্রিত/আগেই-ঝুলন্ত অনুচ্ছেদ অক্ষত
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SH = require('../js/layout-engine/faithful/serial-hang.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

t('a14 ফর্ম-লাইন অক্ষত: ফিল-ডট, ট্যাব-লিডার, একাধিক ক্রমিক ও কোলন-লেবেল অপরিবর্তিত', () => {
  const prevOn = globalThis.__FZ_ON_SERIALHANG;
  globalThis.__FZ_ON_SERIALHANG = true;
  try {
    assert.strictEqual(SH.isOn(), true);
    const formParas = [
      '<w:p><w:pPr><w:ind w:left="58"/></w:pPr><w:r><w:t xml:space="preserve">০১। আবেদনকারীর নাম : ............................................................................ মোবাইল নং .............................................</w:t></w:r></w:p>',
      '<w:p><w:pPr><w:ind w:left="58"/></w:pPr><w:r><w:t xml:space="preserve">০২। (ক) পিতার নাম : ........................................................................................................................</w:t></w:r></w:p>',
      '<w:p><w:pPr><w:ind w:left="58"/></w:pPr><w:r><w:t xml:space="preserve">(খ) মাতার নাম : .........................................................................................................................</w:t></w:r></w:p>',
      '<w:p><w:pPr><w:ind w:left="58"/></w:pPr><w:r><w:t xml:space="preserve">০৩। বর্তমান কলেজের নাম : ............................................................................... কলেজ কোড ............... EIIN ...............</w:t></w:r></w:p>',
      '<w:p><w:pPr><w:ind w:left="58"/></w:pPr><w:r><w:t xml:space="preserve">০৪। ভর্তিচ্ছু কলেজের নাম : ................................................... কলেজ কোড .................... EIIN ................</w:t></w:r></w:p>',
      '<w:p><w:pPr><w:spacing w:before="93" w:after="0" w:line="265" w:lineRule="exact"/><w:ind w:left="58"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:sz w:val="23"/></w:rPr><w:t xml:space="preserve">০৫। অধ্যয়নরত পাঠ্য বিষয় :</w:t></w:r></w:p>',
      '<w:p><w:pPr><w:ind w:left="634"/></w:pPr><w:r><w:t xml:space="preserve">১) বাংলা ২) ইংরেজী ৩) তথ্য ও যোগাযোগ প্রযুক্তি ৪) ............................................... ৫)</w:t></w:r></w:p>',
      '<w:p><w:pPr><w:tabs><w:tab w:val="left" w:leader="dot" w:pos="3898"/><w:tab w:val="left" w:leader="dot" w:pos="7389"/></w:tabs><w:ind w:left="518"/></w:pPr><w:r><w:t xml:space="preserve">৬) </w:t></w:r><w:r><w:tab/></w:r><w:r><w:t xml:space="preserve"> ৭) </w:t></w:r><w:r><w:tab/></w:r><w:r><w:t xml:space="preserve"> (৪র্থ বিষয়)।</w:t></w:r></w:p>',
      '<w:p><w:pPr><w:ind w:left="58"/></w:pPr><w:r><w:t xml:space="preserve">০৬। এস.এস.সি পাশের রোল নং .................................. রেজিস্ট্রেশন নং .................................. পাশের সন ....................</w:t></w:r></w:p>',
      '<w:p><w:pPr><w:spacing w:before="55" w:after="0" w:line="265" w:lineRule="exact"/><w:ind w:left="58"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:sz w:val="23"/></w:rPr><w:t xml:space="preserve">০৭। ছাড়পত্র গ্রহণের কারণ : (অভিভাবক-এর বদলী/অনিবার্য/যুক্তিগ্রাহ্য কারণের প্রামাণ্য কাগজপত্র আবেদনের সঙ্গে যুক্ত করতে হবে)।</w:t></w:r></w:p>',
      '<w:p><w:pPr><w:ind w:left="58"/></w:pPr><w:r><w:t xml:space="preserve">০৮। জমাকৃত সোনালী সেবার রশিদ নং- ........................... তারিখ: ........................... শাখার নাম .............................</w:t></w:r></w:p>',
    ];
    for (const p of formParas) {
      assert.strictEqual(SH.fixPara(p), p);
    }
    const joined = formParas.join('');
    const res = SH.apply(joined);
    assert.strictEqual(res.n, 0);
    assert.strictEqual(res.xml, joined);
  } finally {
    globalThis.__FZ_ON_SERIALHANG = prevOn;
  }
});

t('a14 ডেটায় সুইচ চালু থাকলে পাতা ২-এর সব ফর্ম-লাইন অপরিবর্তিত ও পাতা ৩-এ pos=3898 দূষণমুক্ত', () => {
  const prevOn = globalThis.__FZ_ON_SERIALHANG;
  globalThis.__FZ_ON_SERIALHANG = true;
  try {
    // পাতা ২-এর লিডার-ট্যাব (pos="3898", left="518") যেন পাতা ৩-এর ক্রমিক অনুচ্ছেদে (left="460") না ছড়ায়
    const p2Form6 = '<w:p><w:pPr><w:tabs><w:tab w:val="left" w:leader="dot" w:pos="3898"/><w:tab w:val="left" w:leader="dot" w:pos="7389"/></w:tabs><w:ind w:left="518"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:sz w:val="23"/></w:rPr><w:t xml:space="preserve">৬) </w:t></w:r><w:r><w:tab/></w:r><w:r><w:t xml:space="preserve"> ৭) </w:t></w:r><w:r><w:tab/></w:r><w:r><w:t xml:space="preserve"> (৪র্থ বিষয়)।</w:t></w:r></w:p>';
    const p3Item2 = '<w:p><w:pPr><w:ind w:left="460"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">২। অনিয়মিত শিক্ষার্থীদের ছাড়পত্রের মাধ্যমে কলেজ পরিবর্তনের অনুমতি দেয়া হয় না।</w:t></w:r></w:p>';
    const r = SH.apply(p2Form6 + p3Item2);
    assert.strictEqual(r.n, 1);
    assert.ok(r.xml.startsWith(p2Form6), 'পাতা ২-এর ফর্ম-লাইন অপরিবর্তিত থাকতে হবে');
    assert.doesNotMatch(r.xml, /w:left="3898"/, 'পাতা ২-এর ৩৮৯৮ ট্যাব-স্টপ পাতা ৩-এ যাবে না');
    assert.match(r.xml, /<w:ind w:left="729" w:hanging="269"\/>/);

    // সংযুক্ত a14/ir.json ও faithful-docx-builder থাকলে পূর্ণ ডকুমেন্টে যাচাই
    const irPath = path.resolve(__dirname, '../qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX/a14/ir.json');
    if (fs.existsSync(irPath)) {
      const Builder = require('../js/layout-engine/faithful/faithful-docx-builder.js');
      const ir = JSON.parse(fs.readFileSync(irPath, 'utf8'));
      const { xml: xmlOff } = Builder.bodyXml(ir);
      const { xml: xmlOn } = SH.apply(xmlOff, ir);
      // পাতা ২ সেকশন (প্রথম sectPr-এর পর থেকে দ্বিতীয় sectPr পর্যন্ত) সম্পূর্ণ অপরিবর্তিত থাকবে
      const sectsOff = xmlOff.split(/<\/w:sectPr>/);
      const sectsOn = xmlOn.split(/<\/w:sectPr>/);
      assert.strictEqual(sectsOn[1], sectsOff[1], 'a14 পাতা ২ (আবেদন ফরম)-এর কোনো অনুচ্ছেদ বদলাবে না');
      assert.doesNotMatch(xmlOn, /w:hanging="3438"|w:hanging="3527"/, 'পাতা ৩-এ অতিকায় ঝুলন্ত ইনডেন্ট বসবে না');
    }
  } finally {
    globalThis.__FZ_ON_SERIALHANG = prevOn;
  }
});

t('ঝুলন্ত ইনডেন্টে লাইন-সংখ্যা বাড়লে অনুচ্ছেদ অক্ষত থাকে', () => {
  // ২য় লাইনটি (<w:br/>-এর পরে) ১ লাইনে আঁটে (প্রস্থ ৪২১২ dxa <= ৪৩০০ dxa); কিন্তু ঝুলন্ত ইনডেন্ট (+২৬৯ dxa) দিলে ২ লাইনে ভেঙে যায়
  const tightPara = '<w:p><w:pPr><w:ind w:left="100"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">১। প্রথম লাইন</w:t></w:r><w:r><w:br/></w:r><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">দ্বিতীয় লাইনটি অনেক লম্বা হওয়ায় ইনডেন্ট বাড়ালেই ভেঙে যাবে</w:t></w:r></w:p>';
  assert.strictEqual(SH.fixPara(tightPara, { availTw: 4400 }), tightPara);
});

console.log(`serial-hang: ${pass}/${pass + fail}`);
console.log(`ফলাফল: ${pass} পাস, ${fail} ব্যর্থ`);
if (fail > 0) process.exit(1);
