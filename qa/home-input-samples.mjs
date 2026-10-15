// হোম-পাতার INPUT নমুনা-ছবি (কৃত্রিম, প্রদর্শনের জন্য): হাতের লেখা, পুরোনো কাগজ, প্রশ্নপত্রের খসড়া, বাংলা-ইংরেজি মিশ্রিত।
// বিজয় (MJ) ফন্টে লেখার জন্য unicodeToBijoy (js/bangla-converter-engine.js) ব্যবহার — কোর ফাইল শুধু পড়া হয়।
// চালানো (সার্ভার লাগে না): node qa/home-input-samples.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const OUT = path.resolve(process.argv[2] || 'ui-revamp/img');
fs.mkdirSync(OUT, { recursive: true });
const fontData = (f) => 'data:font/ttf;base64,' + fs.readFileSync(f).toString('base64');
const HAND = fontData('C:/Windows/Fonts/DhakarChithiMJ-Regular.ttf');
const SUT = fontData('fonts/SutonnyMJ-Regular.ttf');

// লেখা: স্ট্রিং = বাংলা (বিজয়ে রূপান্তর), {en} = ইংরেজি, {del} = কাটা, {ins} = ওপরে যোগ, {m} = মার্জিনে নম্বর
const PAGES = {
  'in-hand': { kind: 'hand', lines: [
    ['বাড়ির কাজ — বাংলা ২য় পত্র'],
    ['তারিখ: ১২/০৩/২০২৬'],
    ['১। সন্ধি কাকে বলে? উদাহরণ দাও।'],
    ['উত্তর: পাশাপাশি দুটি ধ্বনির মিলনকে সন্ধি'],
    ['বলে। যেমন: বিদ্যা + আলয় = বিদ্যালয়।'],
    ['২। কারক কত প্রকার ও কী কী?'],
    ['উত্তর: কারক ছয় প্রকার — কর্তা, কর্ম,'],
    ['করণ, সম্প্রদান, অপাদান ও অধিকরণ।'],
    ['৩। সমাস কাকে বলে? দুটি উদাহরণ দাও।'],
    ['উত্তর: অর্থসম্বন্ধ আছে এমন একাধিক পদের'],
    ['একপদে পরিণত হওয়াকে সমাস বলে।']
  ] },
  'in-old': { kind: 'old', lines: [
    ['বরাবর'],
    ['প্রধান শিক্ষক'],
    ['ফুলবাড়ী উচ্চ বিদ্যালয়, দিনাজপুর।'],
    [''],
    ['বিষয়: বিনা বেতনে অধ্যয়নের জন্য আবেদন।'],
    [''],
    ['জনাব,'],
    ['বিনীত নিবেদন এই যে, আমি আপনার বিদ্যালয়ের'],
    ['অষ্টম শ্রেণির একজন নিয়মিত ছাত্র। আমার পিতা'],
    ['একজন দরিদ্র কৃষক। তাঁহার পক্ষে আমার পড়ার'],
    ['খরচ বহন করা অত্যন্ত কষ্টকর হইয়া পড়িয়াছে।'],
    ['অতএব, মহোদয়ের নিকট আকুল আবেদন, আমাকে'],
    ['বিনা বেতনে অধ্যয়নের সুযোগ দানে বাধিত করিবেন।'],
    [''],
    ['তারিখ: ১৪ই মার্চ, ১৯৮৭ ইং'],
    ['বিনীত নিবেদক — আব্দুর রহিম, রোল: ৭']
  ] },
  'in-draft': { kind: 'draft', lines: [
    ['খসড়া — ৭ম শ্রেণি, বিজ্ঞান (অর্ধবার্ষিক)'],
    ['১। ', { del: 'উদ্ভিদের' }, ' সালোকসংশ্লেষণ কাকে বলে?', { m: '২' }],
    ['২। কোষের ', { ins: 'প্রধান' }, ' অংশগুলোর নাম লেখো।', { m: '৩' }],
    ['৩। চিত্রসহ ফুলের গঠন বর্ণনা করো।', { m: '৫' }],
    ['৪। ', { del: 'শব্দ কীভাবে' }, ' আলোর প্রতিফলন কী?', { m: '২' }],
    ['৫। ', { en: 'pH' }, ' মান ৭ এর কম হলে দ্রবণটি কী?', { m: '১' }],
    ['৬। পার্থক্য লেখো: অম্ল ও ক্ষার।', { m: '৪' }],
    ['৭। খাদ্য শৃঙ্খল কী? একটি ', { del: 'ছবি' }, ' উদাহরণ দাও।', { m: '৩' }],
    ['৮। শক্তির রূপান্তর বলতে কী বোঝ?', { m: '২' }],
    ['', { note: '→ ৮ নং প্রশ্ন বাদ দিলে মোট ২২' }]
  ] },
  'in-mixed': { kind: 'print', lines: [
    ['অধ্যায় ২ — কম্পিউটার পরিচিতি (', { en: 'Introduction to Computer' }, ')'],
    [''],
    ['কম্পিউটারের মস্তিষ্ক হলো ', { en: 'CPU (Central Processing Unit)' }, '। এটি তিনটি'],
    ['অংশে বিভক্ত: ', { en: 'ALU, Control Unit' }, ' এবং ', { en: 'Register' }, '।'],
    [''],
    [{ en: '• ' }, { en: 'RAM (Random Access Memory)' }, ' — অস্থায়ী মেমোরি; বিদ্যুৎ'],
    ['  চলে গেলে তথ্য মুছে যায়।'],
    [{ en: '• ' }, { en: 'ROM (Read Only Memory)' }, ' — স্থায়ী মেমোরি।'],
    [{ en: '• ' }, 'ইনপুট ডিভাইস: ', { en: 'Keyboard, Mouse, Scanner' }, '।'],
    [{ en: '• ' }, 'আউটপুট ডিভাইস: ', { en: 'Monitor, Printer, Speaker' }, '।'],
    [''],
    ['১ ', { en: 'KB = 1024 Byte' }, ', ১ ', { en: 'MB = 1024 KB' }, ' এবং ১ ', { en: 'GB = 1024 MB' }, '।'],
    ['প্রশ্ন: ', { en: 'Hardware' }, ' ও ', { en: 'Software' }, ' এর মধ্যে পার্থক্য লেখো।']
  ] }
};

const CSS = `
@font-face { font-family: 'Hand'; src: url(${HAND}); }
@font-face { font-family: 'Sut'; src: url(${SUT}); }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 520px; height: 680px; overflow: hidden; }
.pg { position: relative; width: 520px; height: 680px; padding: 46px 30px 30px 62px; overflow: hidden; }
.en { font-family: 'Times New Roman', serif; }
/* হাতের লেখা: রুল-টানা খাতা, নীল কালি */
.hand { background: #FDFDF8 repeating-linear-gradient(180deg, transparent 0 39px, #B9D3EA 39px 40px); background-position: 0 30px; color: #1D3C8F; font-family: 'Hand'; font-size: 25px; line-height: 40px; }
.hand::before { content: ''; position: absolute; left: 50px; top: 0; bottom: 0; width: 2px; background: #E8A1A1; }
.hand .l:nth-child(odd) { transform: rotate(-.5deg); } .hand .l:nth-child(3n) { transform: translateX(3px) rotate(.4deg); }
.hand .l:first-child { font-size: 29px; text-decoration: underline; }
/* পুরোনো কাগজ: হলদে-বাদামি, দাগ, ভাঁজ, মলিন কালি */
.old { background: radial-gradient(ellipse at 30% 20%, #F1E2B8, #E2C98C 60%, #CDAE6A); color: #4A3418; font-family: 'Sut'; font-size: 21px; line-height: 33px; padding-left: 44px; }
.old .l { opacity: .86; filter: blur(.25px); }
.old::after { content: ''; position: absolute; inset: 0; background:
  radial-gradient(circle at 78% 72%, rgba(120,80,20,.28) 0 38px, transparent 70px),
  radial-gradient(circle at 15% 88%, rgba(110,70,20,.18) 0 24px, transparent 50px),
  linear-gradient(90deg, transparent 49.6%, rgba(90,60,20,.22) 50%, transparent 50.4%),
  linear-gradient(180deg, transparent 49.7%, rgba(90,60,20,.18) 50%, transparent 50.3%); mix-blend-mode: multiply; }
/* খসড়া: সাদা কাগজ, হাতের লেখা, কাটাকুটি, মার্জিনে নম্বর */
.draft { background: #FFFFFE; color: #20222A; font-family: 'Hand'; font-size: 24px; line-height: 50px; padding-right: 64px; }
.draft .l:first-child { font-size: 27px; text-decoration: underline; margin-bottom: 6px; }
.draft .l { position: relative; }
.draft del { text-decoration: none; position: relative; } .draft del::after { content: ''; position: absolute; left: -2px; right: -2px; top: 52%; height: 2.5px; background: #1D3C8F; transform: rotate(-3deg); }
.draft ins { text-decoration: none; position: relative; color: #1D3C8F; font-size: 19px; top: -16px; margin: 0 -6px; }
.draft .m { position: absolute; right: -50px; top: 6px; width: 34px; height: 34px; line-height: 34px; text-align: center; border: 2px solid #C0392B; border-radius: 50%; color: #C0392B; font-size: 21px; }
.draft .note { color: #C0392B; font-size: 21px; }
/* ছাপা হ্যান্ডআউট: ফটোকপির ধূসর টোন */
.print { background: #F6F6F3; color: #1A1A1A; font-family: 'Sut'; font-size: 20px; line-height: 34px; padding-left: 40px; filter: contrast(1.05); }
.print .l:first-child { font-size: 23px; font-weight: bold; }
.print .en { font-size: 17px; }
.print::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,.07), transparent 12%, transparent 88%, rgba(0,0,0,.09)); }
`;

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 520, height: 680, deviceScaleFactor: 2 });
  await page.setContent('<!doctype html><html><head></head><body></body></html>');
  await page.addScriptTag({ path: 'js/bangla-converter-engine.js' });
  for (const [name, spec] of Object.entries(PAGES)) {
    await page.evaluate((css, spec) => {
      const B = (s) => window.BanglaConverter.unicodeToBijoy(s);
      const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const html = spec.lines.map((parts) => '<div class="l">' + parts.map((p) => {
        if (typeof p === 'string') return p ? esc(B(p)) : '&nbsp;';
        if (p.en) return '<span class="en">' + esc(p.en) + '</span>';
        if (p.del) return '<del>' + esc(B(p.del)) + '</del>';
        if (p.ins) return '<ins>^' + esc(B(p.ins)) + '</ins>';
        if (p.m) return '<span class="m">' + esc(B(p.m)) + '</span>';
        if (p.note) return '<span class="note">' + esc(B(p.note)) + '</span>';
        return '';
      }).join('') + '</div>').join('');
      document.documentElement.innerHTML = '<head><style>' + css + '</style></head><body><div class="pg ' + spec.kind + '">' + html + '</div></body>';
    }, CSS, spec);
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 300));
    const file = path.join(OUT, name + '.png');
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 520, height: 680 } });
    console.log('wrote', file);
  }
} finally { await browser.close(); }
