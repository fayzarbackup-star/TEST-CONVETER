// SERIALHANG একক-টেস্ট: ক্রমিক-অনুচ্ছেদে ট্যাব + ঝুলন্ত ইনডেন্ট; অক্রমিক/কেন্দ্রিত/আগেই-ঝুলন্ত অনুচ্ছেদ অক্ষত
import assert from 'node:assert';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SH = require('../js/layout-engine/faithful/serial-hang.js');

let pass = 0;
const t = (name, fn) => { fn(); pass++; };

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
console.log(`serial-hang: ${pass}/5`);
