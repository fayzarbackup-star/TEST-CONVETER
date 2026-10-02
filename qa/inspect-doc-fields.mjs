/**
 * `.doc` ইকুয়েশন-ইনস্পেক্টর — v3 (Part-9i: ক্লিন-ফিল্ড সাপোর্ট)
 *   node qa/inspect-doc-fields.mjs "<path-to-file.doc>"
 *
 * যা দেখায়:
 *   ১) প্রতিটি EQ ফিল্ডের CODE ও RESULT (৯i-তে result নেই — separator-ও নেই)
 *   ২) ফিল্ড-গঠন শ্রেণি: ৯i ক্লিন (sep 0) / ৯h খালি-ক্যাশ (sep আছে) / ৯f ক্যাশ-সহ (ডুপ-ঝুঁকি)
 *   ৩) CODE↔RESULT সিগনেচার মিল (যেখানে result আছে)
 *   ৪) ৯f নীতিমালা: OMML/ম্যাথ-জোন শূন্য
 */
import fs from 'fs';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('ব্যবহার: node qa/inspect-doc-fields.mjs "<file.doc>"'); process.exit(1); }
const s = fs.readFileSync(file, 'utf8');
const cnt = (re) => (s.match(re) || []).length;

const sig = (t) => String(t).replace(/\\[A-Za-z]+\d*/g, '').replace(/[^0-9A-Za-z\u0980-\u09FF]/g, '').toLowerCase();

const fields_begin = cnt(/mso-element:field-begin/g);
const seps = cnt(/mso-element:field-separator/g);
const ends = cnt(/mso-element:field-end/g);

console.log('══ ফাইল:', file);
console.log('   আকার:', s.length, 'বাইট');
console.log('   EQ ফিল্ড:', fields_begin, '/ sep:', seps, '/ end:', ends, '| MsoFieldCode span:', cnt(/class="MsoFieldCode"/g));
console.log('   OMML (m:):', cnt(/<\/?m:[a-zA-Z]/g), '| ম্যাথ-জোন (\\mmath):', cnt(/\\mmath/g), '| <i> সংখ্যা-ভুল:', cnt(/<i>[0-9]/g));
{
  const ital = (s.match(/<i>([^<]*)<\/i>/g) || []).map((r) => r.slice(3, -4));
  const inCode = (s.match(/mso-element:field-begin[\s\S]{0,900}?mso-element:field-end/g) || [])
    .reduce((n, reg) => n + (reg.match(/<i>/g) || []).length, 0);
  const bad = ital.filter((x) => !/^[A-Za-z]+$/.test(x));
  console.log('   Part-9k ইটালিক: মোট', ital.length, '| ফিল্ড-কোডের ভেতরে', inCode, '| অস্বাভাবিক (সংখ্যা/সুইচ):', bad.length);
}
console.log();

// code = begin→(separator?result)?  , terminator = field-end (lookahead: দুই কাঠামোতেই কাজ করে)
const re = /mso-element:field-begin[^>]*><\/span>([\s\S]*?)(?:<span[^>]*mso-element:field-separator[^>]*><\/span>([\s\S]*?))?(?=<span[^>]*mso-element:field-end)/g;
let m, n = 0; const bad = []; const fields = [];
while ((m = re.exec(s)) !== null) {
  n++;
  const code = m[1].replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const result = (m[2] || '').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  fields.push({ code, result, hasSep: m[2] !== undefined });
  if (result) {
    const a = sig(code.replace(/^\s*EQ\s*/i, '')), b = sig(result);
    if (a && b && !(a === b || a.includes(b) || b.includes(a))) bad.push({ n, code, result });
  }
  if (n <= 6) { console.log(`#${String(n).padStart(2)} CODE  : ${code.slice(0, 76)}`); console.log(`     RESULT: ${result ? result.slice(0, 76) : '(ক্যাশ নেই)'}`); }
}
console.log();
console.log(`মোট ফিল্ড: ${n}`);
const cachedCount = fields.filter((f) => f.result && f.result.length > 1).length;
const sepCount = fields.filter((f) => f.hasSep).length;
if (n === 0) {
  console.log('ℹ কোনো EQ ফিল্ড নেই (plain মোডের ফাইল)');
} else if (sepCount === 0 && ends === n) {
  console.log(`✅ ৯i ক্লিন ফিল্ড: ${n}/${n} — begin+কোড+end একই block, separator/ক্যাশ-টেক্সট শূন্য`);
  console.log('   ⇒ Word 2003-এ ডাবল-ক্লিক-এডিটে কিছু ঢোকার সুযোগই নেই');
} else if (cachedCount === 0) {
  console.log(`✅ ৯h স্টাইল: খালি-ক্যাশ (sep ${sepCount}/${n}) — এডিটে ডুপ হবে না`);
} else {
  console.log(`⚠ ${cachedCount}টি ফিল্ডে ক্যাশ-ফলাফল টেক্সট (sep ${sepCount}/${n}) — Word 2003-এ ডাবল-ক্লিক-এডিটে ডুপ-ঝুঁকি (৯f-স্টাইল ফাইল)`);
}
console.log(bad.length ? `⚠ CODE≠RESULT: ${bad.length}টি:` : '✅ CODE/ফলাফল সংক্রান্ত কোনো অসঙ্গতি নেই');
for (const p of bad.slice(0, 10)) console.log(`   #${p.n}\n     CODE  : ${p.code.slice(0, 88)}\n     RESULT: ${p.result.slice(0, 88)}`);

// ডুপ্লিকেশন: সম্পূর্ণ ফিল্ড (begin→end) বাদ দেওয়ার পরেও একই রাশি আছে?
const outside = s.replace(/<span[^>]*field-begin[\s\S]*?<span[^>]*field-end[^>]*><\/span>/g, ' ')
                  .replace(/<!--[\s\S]*?-->/g, ' ');
const plain = outside.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');
let dup = 0;
for (const f of fields) {
  if (!f.result) continue;
  const k = sig(f.result).slice(0, 8);
  if (k.length >= 6 && sig(plain).includes(k)) { dup++; if (dup <= 5) console.log(`⚠ বাইরেও আছে: "${f.result.slice(0, 50)}"`); }
}
console.log(dup ? `⚠ সম্ভাব্য ডুপ্লিকেশন: ${dup}টি` : '✅ ফিল্ডের বাইরে ডুপ্লিকেট রাশি নেই');
