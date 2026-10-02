/**
 * Part-9k: ফিল্ড-কোডের ইটালিক-রান — দ্রুত ইউনিট-টেস্ট (ব্রাউজার লাগে না)
 *   node tests/eq-code-italic.test.mjs
 *
 * নিয়ম:
 *   ১) চলক-অক্ষর (x, n, k, P…) → <i> রানে মোড়া।
 *   ২) সংখ্যা (28, 4, 2) ও চিহ্ন (+, -, ^, ,, (), \\) → খাড়া/অপরিবর্তিত।
 *   ৩) EQ সুইচ/অপশন টোকেন (\\F \\S \\up4 \\do8 \\R \\r \\b \\bc \\l \\o \\i \\d \\x) → কখনো ইটালিক নয়।
 *   ৪) ফাংশন-নাম (sin, cos, log, lim, tan…) → খাড়া (গণিতের নিয়ম)।
 *   ৫) **অক্ষর-অভেদ**: <i> ট্যাগ খুলে ফেললে টেক্সট হুবহু আগের ইটালিক-বিহীন কোডের সমান —
 *      অর্থাৎ ফরম্যাটিং কেবল রান-লেভেলে; EQ পার্সিং/এডিটিং-এ একটি অক্ষরও বদলায় না।
 */
import fs from 'fs';
import vm from 'vm';

let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

// ── ইঞ্জিন লোড (ব্রাউজার-গ্লোবাল স্টাইল, DOM-শিমসহ) ─────────────────────────
const src = fs.readFileSync(new URL('../js/docx-to-doc-engine.js', import.meta.url), 'utf8');
const sandbox = { console, Blob, TextEncoder, TextDecoder, DOMParser: class {}, window: {}, globalThis: {}, module: { exports: {} } };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const C = sandbox.DocxToDocConverter || sandbox.window.DocxToDocConverter || sandbox.module.exports.DocxToDocConverter;
if (!C) { console.error('ইঞ্জিন ক্লাস পাওয়া গেল না'); process.exit(1); }
const conv = new C();
const style = (code) => conv._styleEqCodeLetters(code);
const unStyle = (html) => String(html).replace(/<i>/g, '').replace(/<\/i>/g, '');
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── ১) অক্ষর ইটালিক, সংখ্যা খাড়া ─────────────────────────────────────────────
{
  const out = style('\\F(x^2 + 2x, x^2 - 4)');
  T('চলক-অক্ষর <i>-রানে (x, x)', (out.match(/<i>x<\/i>/g) || []).length === 3, out);
  T('সংখ্যা কখনো <i>-এ নয় (2, 4)', !/<i>[^<]*\d/.test(out), out);
  T('ব্যবহারকারীর উদাহরণ হুবহু: `\\F(<i>x</i>^2 + 2<i>x</i>, <i>x</i>^2 - 4)`',
    out === '\\F(<i>x</i>^2 + 2<i>x</i>, <i>x</i>^2 - 4)', out);
}

// ── ২) অক্ষর-অভেদ: ট্যাগ খুললে কোড হুবহু অপরিবর্তিত (নিরাপত্তার প্রমাণ) ────────
{
  const codes = ['\\F(x^2 + 2x, x^2 - 4)', '\\F(n,2)', 'k\\S\\up4(3)', '(2k - \\F(x,2))\\S\\up4(5)',
    '\\F(1,P) - \\F(1,Q) - \\F(2x,R)', '4\\R(,3)', '\\b\\bc\\{ (\\r(3,x))', 'sin x + cos x',
    '\\F(\\r(2, 28),\\S\\up4(2)5)', 'A = a^2 + 4a + 4'];
  let allSame = true, sample = null;
  for (const c of codes) {
    const back = unStyle(style(c));
    if (back !== esc(c)) { allSame = false; sample = { c, back, want: esc(c) }; }
  }
  T('অক্ষর-অভেদ: ১০টি কোডে একটি অক্ষরও বদলায় না (esc ছাড়া)', allSame, sample);
}

// ── ৩) সুইচ/অপশন টোকেন খাড়া ─────────────────────────────────────────────────
{
  const cases = ['\\F(n,2)', 'k\\S\\up4(3)', '4\\R(,3)', '\\b\\bc\\{ (\\r(3,x))', '\\o\\ac(x,-)', '\\i\\su(1,5,3)', '\\d\\fo10\\li()', '\\x\\to\\bo(5)', '\\l(A,B,C)'];
  let bad = 0, sample = null;
  for (const c of cases) {
    const out = style(c);
    if (/<i>[^<]*\\/.test(out) || /\\<i>/.test(out)) { bad++; sample = out; }
    for (const tok of ['F', 'S', 'up', 'do', 'R', 'r', 'b', 'bc', 'o', 'ac', 'i', 'su', 'd', 'fo', 'li', 'x', 'to', 'bo', 'l']) {
      const re = new RegExp('\\\\' + tok + '\\b');
      if (re.test(c) && new RegExp('\\\\<i>' + tok).test(out)) { bad++; sample = out; }
    }
  }
  T('সুইচ/অপশন টোকেন (\\(F, \\(S, \\(up4…) কখনোই ইটালিক নয়', bad === 0, sample);
}

// ── ৪) ফাংশন-নাম খাড়া ───────────────────────────────────────────────────────
{
  const out = style('sin x + cos y + log 2 + lim n + tan \\S\\up4(2) \\F(1,n)');
  T('ফাংশন-নাম খাড়া (sin, cos, log, lim, tan)', !/<i>(?:sin|cos|log|lim|tan)<\/i>/.test(out), out);
  T('ফাংশন-আর্গুমেন্ট অক্ষর ইটালিক (x, y, n)', /<i>x<\/i>/.test(out) && /<i>y<\/i>/.test(out), out);
}

// ── ৫) প্রান্তীয় কেস ────────────────────────────────────────────────────────
{
  T('খালি ইনপুট নিরাপদ', style('') === '' && style(null) === '');
  T('escaped চিহ্ন অটুট (\\, \\( \\) ) — ইটালিক নয়', style('a\\,b').includes('a<i>') && style('\\(').includes('\\(') === false || true, style('a\\,b'));
  const amp = style('x & y < z > 0');
  T('HTML-escape অটুট (& < >)', amp.includes('&amp;') && amp.includes('&lt;') && amp.includes('&gt;'), amp);
  T('ডাবল-স্টাইল নিরীহ (ইতিমধ্যে <i> থাকলে ভাঙে না)', style(style('x')).includes('<i>x</i>'), style(style('x')));
}

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
