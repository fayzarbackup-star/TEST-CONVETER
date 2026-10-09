/**
 * সোর্স-ফিডেলিটি টেস্ট
 *   node tests/source-fidelity.test.mjs
 *
 * নীতি (ব্যবহারকারীর নির্দেশ): **সোর্স ফাইলে যা আছে, হুবহু তাই আউটপুটে থাকবে।**
 * কোনো লাইন নিঃশব্দে হারাবে না, কাঠামো জোর করে পুনর্গঠন হবে না, কোনো তথ্য
 * আবিষ্কারও হবে না। প্রশ্ন মিসিং থাকলে সেটিও সোর্সের মতোই থাকবে।
 *
 * এই টেস্ট যা পাহারা দেয়:
 *   ১. প্রতিটি সোর্স-লাইন পার্সারের কোনো-না-কোনো ফিল্ডে টিকে আছে
 *   ২. প্রশ্ন-নম্বরের আগের উদ্দীপক পরের প্রশ্নের সাথে যায় (আগেরটির সাথে নয়)
 *   ৩. হেডারে বডির লেখা ঢুকে পড়ে না (`মানুষ`-এর ভেতরের `মান` ধরে ফেলার বাগ)
 *
 * সম্পূর্ণ অফলাইন — নেটওয়ার্ক বা ব্রাউজার লাগে না।
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const H = require(path.join(__dirname, 'lib', 'harness.js'));

const engines = H.loadEngines();

let pass = 0, fail = 0;
const T = (name, cond, extra) => {
  if (cond) { pass++; console.log('✅ ' + name); }
  else { fail++; console.log('❌ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};

// নুকতা-রূপ এক (য়/ড়/ঢ়) — কিছু পার্সার লেখাকে একক-অক্ষর রূপে রাখে; তুলনা যেন রূপের ওপর নির্ভর না করে
const norm = (s) => String(s == null ? '' : s).replace(/য়/g, 'য়').replace(/ড়/g, 'ড়').replace(/ঢ়/g, 'ঢ়').replace(/\s+/g, ' ').trim();

/** পার্সারের সব ফিল্ড এক জায়গায় (হেডার + সেকশন + প্রশ্ন + সাব + অপশন) */
function parsedBag(parsed) {
  // Part-19.2: সনদ-লেআউট — অংশভিত্তিক (মুড়ি/মূল): মাথা, ছক, শিরোনাম, ব্লক, তারিখ/স্বাক্ষর
  if (Array.isArray(parsed.parts)) {
    return parsed.parts.map((p) => parsedBag({ blocks: [].concat(p.head.map((x) => ({ text: x.text })), p.tables, [{ text: p.title }], p.blocks, p.footer ? [p.footer] : []) })).join(' \u0001 ');
  }
  const out = [];
  // Part-18.9: আবেদনপত্র-লেআউটের মডেল (ব্লক-তালিকা) — একই নীতি: উৎসের প্রতিটি লাইন কোনো ব্লকে টিকে থাকবে
  for (const b of parsed.blocks || []) {
    out.push(b.text, b.label, b.left, b.right, b.total);
    (b.lines || []).forEach((x) => out.push(typeof x === 'string' ? x : x.text));   // Part-19.0: প্যাড-শিরোনামের লাইন {text, role}
    (b.groups || []).forEach((g) => g.forEach((x) => out.push(x)));                  // Part-19.0: স্বাক্ষর-দল
    (b.items || []).forEach((x) => out.push(typeof x === 'string' ? x : [x.num, x.text, x.count].join(' ')));
    (b.rows || []).forEach((r) => out.push(Array.isArray(r) ? r.join(' ') : [r.num, r.label, r.value].concat(r.more || []).join(' ')));
    out.push(b.date); (Array.isArray(b.sign) ? b.sign : []).forEach((x) => out.push(x));   // Part-19.1: সিভির তারিখ/স্বাক্ষর
  }
  // Part-19.1: ইংরেজি সিভি পুরোনো CVEngine-এ (title/personalInfo/education/…)
  const flat = (v) => (v == null ? [] : typeof v === 'object' ? Object.values(v).flatMap(flat) : [String(v)]);
  for (const k of ['title', 'name', 'contact', 'personalInfo', 'education', 'experience', 'skills', 'declaration']) {
    if (!parsed.blocks && !parsed.sections && parsed[k] != null) flat(parsed[k]).forEach((x) => out.push(x));
  }
  if (!parsed.blocks && Array.isArray(parsed.education) && parsed.education.length) out.push('শিক্ষাগত যোগ্যতা (Educational Qualifications)');   // শিরোনাম রেন্ডারার নিজে বসায় (cv-engine.js)
  const h = parsed.header || {};
  Object.values(h).forEach((v) => v && out.push(v));
  if (parsed.auditNote) out.push(parsed.auditNote);
  for (const sec of parsed.sections || []) {
    if (sec.title) out.push(sec.title);
    for (const q of sec.questions || []) {
      out.push(q.preContext, q.text, q.stimulus);
      (q.statements || []).forEach((x) => out.push(x));
      (q.subQuestions || []).forEach((x) => out.push(x.text));
      (q.options || []).forEach((x) => out.push(x.text));
    }
  }
  return norm(out.filter(Boolean).join(' \u0001 '));
}

/**
 * লাইন-ভিত্তিক হুবহু মিল নয়, **শব্দ-ভিত্তিক** তুলনা — কারণ:
 *   • নম্বর/লেবেল/মার্ক আলাদা ফিল্ডে যায় (`১।`, `ক.`, `২`)
 *   • `সময়:` / `পূর্ণমানঃ` লেবেল রেন্ডারার নিজে বসায়, পার্সার শুধু মান রাখে
 *   • LaTeX (`$...$`) OMML/EQ-তে রূপান্তরিত হয়, হুবহু থাকে না
 * তাই প্রতিটি লাইনের অর্থবহ শব্দগুলোর ৮০%+ পার্সারে টিকে আছে কি না দেখা হয়।
 * একটি অনুচ্ছেদ পুরো হারিয়ে গেলে স্কোর ০% হবে — ঠিক সেটিই ধরতে চাই।
 */
const LABEL_WORDS = /^(?:সময়|পূর্ণমান|পূর্ণমানঃ|মান|মানঃ|নম্বর|marks?|time)$/i;

function wordScore(rawLine, bag) {
  let l = norm(rawLine);
  if (!l || /^---/.test(l) || /^\|/.test(l)) return null;
  const words = l
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/\.{3,}|…+/g, ' ')   // ডট-লিডার (সংযুক্তির "…… ১ কপি") সাজসজ্জা, লেখা নয়
    .split(/[\s|,।:ঃ()\[\]]+/)
    .filter((w) => w.length >= 4 && !/^[\u09E6-\u09EF\d]+$/.test(w) && !LABEL_WORDS.test(w));
  if (words.length < 2) return null;
  const found = words.filter((w) => bag.includes(w)).length;
  return { pct: Math.round((found / words.length) * 100), words: words.length };
}

// ───────────────────────── (ক) কোনো লাইন হারায় না ─────────────────────────
console.log('— (ক) প্রতিটি সোর্স-লাইন টিকে আছে —');
let totalLines = 0, lostTotal = 0;
for (const fx of H.listFixtures()) {
  const parsed = engines.Pipeline._parseByDocType(fx.docType || 'EXAM_CQ', fx.body, {});
  const bag = parsedBag(parsed);
  const lost = [];
  for (const raw of fx.body.split('\n')) {
    const sc = wordScore(raw, bag);
    if (!sc) continue;
    totalLines++;
    if (sc.pct < 80) { lost.push(sc.pct + '% · ' + norm(raw).slice(0, 44)); lostTotal++; }
  }
  T(`${fx.id}: সব লাইন টিকে আছে`, lost.length === 0, lost.slice(0, 3));
}
console.log(`   (মোট ${totalLines}টি লাইন যাচাই, হারিয়েছে ${lostTotal}টি)\n`);

// ──────────── (খ) উদ্দীপক পরের প্রশ্নের সাথে, আগেরটির সাথে নয় ────────────
console.log('— (খ) উদ্দীপকের অবস্থান —');
const twoStim = [
  '[উদ্দীপক ১]',
  'প্রথম উদ্দীপকের অনুচ্ছেদ এখানে লেখা আছে।',
  '',
  '১। ক. প্রথম প্রশ্ন? ১',
  '১। খ. দ্বিতীয় প্রশ্ন? ২',
  '',
  '[উদ্দীপক ২]',
  'দ্বিতীয় উদ্দীপকের অনুচ্ছেদ এখানে লেখা আছে।',
  '',
  '২। ক. তৃতীয় প্রশ্ন? ১',
  '২। খ. চতুর্থ প্রশ্ন? ২'
].join('\n');

const p2 = engines.Pipeline._parseByDocType('EXAM_CQ', twoStim, {});
const qs2 = (p2.sections || []).flatMap((s) => s.questions || []);
const holder1 = qs2.find((q) => (String(q.preContext || '') + String(q.stimulus || '')).includes('প্রথম উদ্দীপকের'));
const holder2 = qs2.find((q) => (String(q.preContext || '') + String(q.stimulus || '')).includes('দ্বিতীয় উদ্দীপকের'));

T('প্রথম উদ্দীপক সংরক্ষিত আছে', !!holder1);
T('প্রথম উদ্দীপক প্রশ্ন ১-এর সাথে', holder1 && holder1.num === '১', holder1 && holder1.num);
T('দ্বিতীয় উদ্দীপক সংরক্ষিত আছে', !!holder2);
T('দ্বিতীয় উদ্দীপক প্রশ্ন ২-এর সাথে (১-এর শেষে নয়)', holder2 && holder2.num === '২', holder2 && holder2.num);
T('কোনো প্রশ্নের stimulus-এ ভুলভাবে পরের উদ্দীপক ঢোকেনি',
  !qs2.some((q) => String(q.stimulus || '').includes('দ্বিতীয় উদ্দীপকের') && q.num === '১'));

// ───────────── (গ) হেডার-স্ক্যান বডির লেখা গিলে ফেলে না ─────────────
console.log('\n— (গ) হেডার বনাম বডি —');
const trap = [
  '[উদ্দীপক ১]',
  'ঝড়ে গাছের ডাল ভেঙে পড়লে গ্রামের মানুষ চিন্তিত হয়ে পড়ে।',
  '',
  '১। ক. মানুষ কী মনে করত? ১'
].join('\n');
const pt = engines.Pipeline._parseByDocType('EXAM_CQ', trap, {});
T('"মানুষ" শব্দ দেখে header.marks-এ আবর্জনা ঢোকে না',
  !String(pt.header.marks || '').includes('চিন্তিত'), pt.header.marks);
T('বডির অনুচ্ছেদ header.instructions-এ যায় না',
  !String(pt.header.instructions || '').includes('উদ্দীপক'), pt.header.instructions);
T('অনুচ্ছেদটি প্রশ্নের preContext/stimulus-এ আছে',
  (pt.sections || []).flatMap((s) => s.questions || []).some((q) => (String(q.preContext || '') + String(q.stimulus || '')).includes('চিন্তিত')));

// প্রকৃত পূর্ণমান হেডার ঠিকই ধরা পড়ে
const okHead = ['সময়: ২ ঘণ্টা | পূর্ণমান: ৭০', '', '১। ক. প্রশ্ন? ১'].join('\n');
const ph = engines.Pipeline._parseByDocType('EXAM_CQ', okHead, {});
T('প্রকৃত "পূর্ণমান: ৭০" হেডারে ঠিকই ধরা পড়ে', String(ph.header.marks || '').includes('৭০'), ph.header.marks);

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
