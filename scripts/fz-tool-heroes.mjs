// এককালীন: টুল-পাতার পুরোনো ব্যানার → অভিন্ন .fz-tool-hero (css/fayzar-theme.css)। আবার চালালে কিছু বদলায় না।
import fs from 'node:fs';

const hero = (kicker, h1, lead, chips) => [
  '<!-- FZ-HERO -->',
  '<section class="fz-tool-hero">',
  '  <div class="fz-in">',
  `    <span class="fz-kicker">${kicker}</span>`,
  `    <h1 class="fz-h1">${h1}</h1>`,
  `    <p class="fz-lead">${lead}</p>`,
  `    <div class="fz-chips">${chips.map((c) => (c.startsWith('<a') ? c : `<span>${c}</span>`)).join('')}</div>`,
  '  </div>',
  '</section>'
].join('\n');

function edit(file, fn) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.includes('<!-- FZ-HERO -->')) { console.log('skip (already)', file); return; }
  const out = fn(s);
  fs.writeFileSync(file, out);
  console.log('updated', file);
}
function cut(s, startRe, endRe) {
  const a = s.search(startRe);
  if (a < 0) throw new Error('start not found: ' + startRe);
  const rest = s.slice(a);
  const m = rest.match(endRe);
  if (!m) throw new Error('end not found: ' + endRe);
  return s.slice(0, a) + s.slice(a + m.index + m[0].length);
}

// ১) OCR পাতা (index.html): main-এর ভেতরের হিরো-বার সরিয়ে main-এর আগে ব্যানার
edit('index.html', (s) => {
  s = cut(s, /<!-- Top Integrated Hero Bar/, /\n\s*(?=<!-- Smart Auto-Layout System Active Badge -->)/);
  const h = hero('এআই OCR · ইউনিকোড ⇄ বিজয়',
    '<span data-i18n="converter_page_title">OCR ও বাংলা কনভার্টার</span>',
    '<span data-i18n="converter_page_subtitle">ছবি ও PDF থেকে Word, আর ইউনিকোড ⇄ বিজয় রূপান্তর</span>',
    ['ইউনিকোড .docx · বিজয় .docx · Word 2003 .doc', 'সমীকরণ এডিটযোগ্য', 'প্রশ্নপত্রের ২-কলাম লেআউট', '<a href="#converter-details">বিস্তারিত বিবরণ ও FAQ</a>']);
  return s.replace(/<main class="container mx-auto max-w-6xl/, (m) => `${h}\n\n  ${m}`);
});

// ২) ডকুমেন্ট কনভার্টার: গাঢ় নীল ব্যানার → হালকা সবুজ
edit('doc-converter.html', (s) => {
  const re = /<section class="relative bg-gradient-to-b from-slate-900[\s\S]*?<\/section>/;
  if (!re.test(s)) throw new Error('doc-converter hero not found');
  return s.replace(re, () => hero('মাইক্রোসফট ওয়ার্ড ফাইলের জন্য বাংলা কনভার্টার',
    'ওয়ার্ড ডকুমেন্ট <span class="fz-accent">ইউনিকোড ➔ বিজয়</span> কনভার্টার',
    'টেবিল, ছবি, হেডার-ফুটার, বোল্ড-ইটালিক ও ফন্ট-সাইজ ঠিক রেখে পুরো .docx ফাইল বিজয়ে রূপান্তর করুন। শেষে .docx ও Word 2003 .doc — দুটোই নামাতে পারবেন।',
    ['ব্রাউজারেই প্রসেস — ফাইল সার্ভারে যায় না', 'টেবিল ও বক্স বজায়', 'SutonnyMJ ফন্ট স্বয়ংক্রিয়', 'একাধিক ফাইল একসাথে']));
});

// ৩) DOCX → DOC: main-এর ভেতরের শিরোনাম-ব্লক সরিয়ে main-এর আগে ব্যানার
edit('docx-to-doc.html', (s) => {
  s = cut(s, /<!-- Hero Title & Badges -->/, /\n\s*(?=<!-- Main Converter Workspace -->)/);
  const h = hero('স্কুল ও মাদ্রাসার প্রশ্নপত্রের জন্য বিশেষ উপযোগী',
    'ওয়ার্ড <span class="fz-accent">DOCX ➔ DOC (Word 2003)</span> কনভার্টার',
    'নতুন .docx ফাইলকে Office 2003-এ খোলার উপযোগী .doc ফাইলে রূপান্তর করুন — প্রশ্নপত্রের টেবিল, মার্জিন ও SutonnyMJ ফন্ট ঠিক রেখে।',
    ['Word 97–2003 (.doc)', 'টেবিল ও মার্জিন বজায়', 'বাংলা ফন্ট অক্ষুণ্ণ']);
  return s.replace(/<main class="flex-grow container mx-auto max-w-6xl/, (m) => `${h}\n\n  ${m}`);
});
