/**
 * `.doc` ইকুয়েশন-ইনস্পেক্টর (Part-9g ডায়াগনস্টিক) — v2
 *   node qa/inspect-doc-fields.mjs "<path-to-file.doc>"
 *
 * যা দেখায়:
 *   ১) প্রতিটি EQ ফিল্ডের CODE (Word যা গুনে আঁকে) ও RESULT (স্টোর করা প্রদর্শন) — পাশাপাশি
 *   ২) CODE↔RESULT সিগনেচার মিল (n-1 বনাম n+1 ধরার জন্য) — সুইচ-সিনট্যাক্স নরমালাইজ করে
 *   ৩) ফিল্ডের বাইরে একই রাশি দ্বিতীয়বার (ডুপ্লিকেশন)
 *   ৪) ৯f নীতিমালা: OMML/ম্যাথ-জোন শূন্য, ফিল্ড ট্রিপল সমান
 */
import fs from 'fs';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('ব্যবহার: node qa/inspect-doc-fields.mjs "<file.doc>"'); process.exit(1); }
const s = fs.readFileSync(file, 'utf8');
const cnt = (re) => (s.match(re) || []).length;

// সিগনেচার: শুধু অক্ষর+সংখ্যা (সুইচ/স্পেস/বন্ধনী/কমা বাদ) — \F(1,a) ≡ 1/ a
const sig = (t) => String(t).replace(/\\[A-Za-z]+\d*/g, '').replace(/[^0-9A-Za-z\u0980-\u09FF]/g, '').toLowerCase();

console.log('══ ফাইল:', file);
console.log('   আকার:', s.length, 'বাইট');
console.log('   EQ ফিল্ড:', cnt(/mso-element:field-begin/g), '/ sep:', cnt(/mso-element:field-separator/g), '/ end:', cnt(/mso-element:field-end/g));
console.log('   OMML (m:):', cnt(/<\/?m:[a-zA-Z]/g), '| ম্যাথ-জোন (\\mmath):', cnt(/\\mmath/g), '| <i> সংখ্যা-ভুল:', cnt(/<i>[0-9]/g));
console.log();

const re = /mso-element:field-begin[^>]*><\/span>([\s\S]*?)<span[^>]*mso-element:field-separator[^>]*><\/span>([\s\S]*?)(?=<!--\[if supportFields\]><span[^>]*field-end)/g;
let m, n = 0; const bad = []; const fields = [];
while ((m = re.exec(s)) !== null) {
  n++;
  const code = m[1].replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const result = m[2].replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  fields.push({ code, result });
  const a = sig(code.replace(/^\s*EQ\s*/i, '')), b = sig(result);
  if (a && b && !(a === b || a.includes(b) || b.includes(a))) bad.push({ n, code, result });
  if (n <= 6) { console.log(`#${String(n).padStart(2)} CODE  : ${code.slice(0, 76)}`); console.log(`     RESULT: ${result.slice(0, 76)}`); }
}
console.log();
console.log(`মোট ফিল্ড: ${n}`);
console.log(bad.length ? `⚠ CODE≠RESULT: ${bad.length}টি:` : '✅ প্রতি ফিল্ডের CODE ও RESULT মিল (n±1 জাতীয় মিসম্যাচ নেই)');
for (const p of bad.slice(0, 10)) console.log(`   #${p.n}\n     CODE  : ${p.code.slice(0, 88)}\n     RESULT: ${p.result.slice(0, 88)}`);

// ডুপ্লিকেশন: সম্পূর্ণ ফিল্ড (কোড+ফলাফল) বাদ দেওয়ার পরেও একই রাশি আছে?
const outside = s.replace(/<span[^>]*field-begin[\s\S]*?<span[^>]*field-end[^>]*><\/span>/g, ' ')
                  .replace(/<!--[\s\S]*?-->/g, ' ');
const plain = outside.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');
let dup = 0;
for (const f of fields) {
  const k = sig(f.result).slice(0, 8);
  if (k.length >= 6 && sig(plain).includes(k)) { dup++; if (dup <= 5) console.log(`⚠ বাইরেও আছে: "${f.result.slice(0, 50)}"`); }
}
console.log(dup ? `⚠ সম্ভাব্য ডুপ্লিকেশন: ${dup}টি` : '✅ ফিল্ডের বাইরে ডুপ্লিকেট রাশি নেই');
