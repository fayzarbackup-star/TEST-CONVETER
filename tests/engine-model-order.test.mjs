/**
 * part-7b: ক্লায়েন্ট ইঞ্জিনের মডেল-অগ্রাধিকার ক্রম — স্থায়ী স্ট্যাটিক চেক।
 *   node tests/engine-model-order.test.mjs
 * নিয়ম (ব্যবহারকারীর নির্দেশ): auto মোডে কখনোই এলোমেলো মডেল নয় —
 *   #1 gemini-3-flash-preview → #2 gemini-3.8-flash → #3 gemini-3.6-flash
 */
import fs from 'fs';
const src = fs.readFileSync(new URL('../js/ai-ocr-engine.js', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); };

const m = src.match(/candidateModels = \[\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\s*\]/);
T('auto মোডে তিন-মডেল তালিকা ঠিক ক্রমে (৩-flash → ৩.৮ → ৩.৬)',
  !!m && m[1] === 'gemini-3-flash-preview' && m[2] === 'gemini-3.8-flash' && m[3] === 'gemini-3.6-flash',
  m && m.slice(1));

T('তালিকায় দ্বিতীয় মডেল ৩.৮-flash বাদ পড়েনি', src.includes("'gemini-3.8-flash',         // #2"));

const rnd = src.match(/Math\.random/g) || [];
T('মডেল/কি-নির্বাচনে Math.random নেই (শুধু jobId-তে অনুমোদিত)', rnd.length <= 1, { count: rnd.length });

T('কভারেজ-গার্ড ও ম্যান্ডেট উপস্থিত (৫+ পৃষ্ঠা)', src.includes('MULTI-PAGE COVERAGE MANDATE') && src.includes('applyPageCoverageGuard'));

console.log(`\nফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
