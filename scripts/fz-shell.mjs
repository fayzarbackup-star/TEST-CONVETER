// ফয়জার এআই কম্পোজ — সব পাতায় অভিন্ন হেডার/ফুটার বসানো বা হালনাগাদ করা (একক উৎস)।
// চালানো: node scripts/fz-shell.mjs   (আবার চালালে মার্কারের ভেতরের অংশ নতুন করে বসে; বাকি পাতা অপরিবর্তিত)
// মার্কার: <!-- FZ-HEAD -->, <!-- FZ-NAV:START/END -->, <!-- FZ-FOOT:START/END -->
// প্রথমবার মার্কার না থাকলে: পাতার পুরোনো প্রথম <nav>/<header> ও <footer> ব্লক এর বদলে বসে (কনফিগ অনুযায়ী)।
import fs from 'node:fs';

const BRAND_SVG = '<svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true"><path d="M35 4C18 4 6 13 6 26c0 4 1 7 3 10 2-9 9-17 19-21-8 6-13 13-15 22 3 1 6 1 9 0C33 33 37 18 35 4z" fill="#2E8B5E"/></svg>';

// ২০২৬-১০-০৬: index.html = কাজ (আপলোড → ওয়ার্কস্পেস); সার্ভিস/টুলস ও নমুনা আলাদা পাতায়
const LINKS = [
  ['index.html', 'হোম'],
  ['services.html', 'সার্ভিস'],
  ['samples.html', 'নমুনা'],
  ['samples.html#how', 'কীভাবে কাজ করে'],
  ['index.html#history', 'ইতিহাস', 'fz-hist'],
  ['#login', 'লগইন', 'fz-soon'],
  ['#register', 'রেজিস্ট্রেশন', 'fz-cta fz-soon']
];
const FOOT_TOOLS = [
  ['index.html', 'ছবি / PDF → Word'],
  ['services.html#tool-text', 'ইউনিকোড ⇄ বিজয়'],
  ['services.html#tool-word', 'Word ফাইল → বিজয়'],
  ['services.html#tool-doc', 'DOCX → DOC (Word 2003)'],
  ['services.html#tool-md', 'MD → Word'],
  ['studio.html', 'ওয়ার্ড স্টুডিও']
];

// পাতা-নির্দিষ্ট বোতাম (পুরোনো id রাখা হয়েছে — theme-lang.js / পাতার নিজস্ব স্ক্রিপ্ট এগুলো খোঁজে)
const TOOLS = {
  none: '',
  index: '<div class="fz-lang"><button type="button" id="lang-btn-bn" onclick="setLanguage(\'bn\')" class="px-2 bg-emerald-800 text-white">বাং</button><button type="button" id="lang-btn-en" onclick="setLanguage(\'en\')" class="px-2 bg-white text-emerald-800">EN</button></div>' +
    '<button type="button" id="theme-toggle-btn" class="fz-icon-btn" title="ডে / নাইট মোড"><i id="theme-icon" class="fa-solid fa-moon"></i></button>',
  docConverter: '<button type="button" id="doc-theme-toggle-btn" class="fz-icon-btn" title="ডে / নাইট মোড"><i class="fa-solid fa-moon dark:hidden"></i><i class="fa-solid fa-sun hidden dark:inline text-amber-300"></i></button>'
};

const nav = (tools, isStatic) => [
  '<!-- FZ-NAV:START — scripts/fz-shell.mjs থেকে তৈরি; এখানে হাতে বদলাবেন না -->',
  `<header class="fz-nav${isStatic ? ' fz-static' : ''}">`,
  '  <div class="fz-nav-in">',
  `    <a href="index.html" class="fz-brand" aria-label="ফয়জার এআই কম্পোজ — হোম">${BRAND_SVG}<span class="fz-full">ফয়জার এআই কম্পোজ</span><span class="fz-short">AI Compose</span></a>`,
  '    <nav class="fz-links" id="fzLinks" aria-label="প্রধান মেনু">',
  ...LINKS.map(([href, label, cls]) => `      <a href="${href}"${cls ? ` class="${cls}"` : ''}>${label}</a>`),
  '    </nav>',
  `    <div class="fz-tools">${TOOLS[tools]}<button type="button" class="fz-burger" id="fzBurger" aria-label="মেনু" aria-expanded="false"><span></span><span></span><span></span></button></div>`,
  '  </div>',
  '</header>',
  '<!-- FZ-NAV:END -->'
].join('\n');

const FOOT = [
  '<!-- FZ-FOOT:START — scripts/fz-shell.mjs থেকে তৈরি; এখানে হাতে বদলাবেন না -->',
  '<footer class="fz-foot">',
  '  <div class="fz-foot-in">',
  '    <div><div class="fz-foot-brand">ফয়জার এআই কম্পোজ</div><p>ফয়জার কম্পিউটার এন্ড ফটোস্ট্যাট — ছবি ও PDF থেকে Word, বাংলা ফন্ট-রূপান্তর ও প্রশ্নপত্রের লেআউট।</p><p>সরকার অনুমোদিত ডিজিটাল ও উন্মুক্ত ভূমিসেবা কেন্দ্র (LSFC)। অনুমোদন নং: দিনাজ/ফুল/এলএসএসএফসি-০৭/২০২৫</p></div>',
  '    <div><h4>টুলস</h4><ul>' + FOOT_TOOLS.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('') + '</ul></div>',
  '    <div><h4>কাজের সময়</h4><ul><li>শনি – বৃহস্পতি: সকাল ৮:০০ – রাত ৯:০০</li><li>শুক্রবার: বিকাল ৪:০০ – রাত ৯:০০</li><li>স্বত্বাধিকারী: মোঃ ফয়জার আলী</li><li>ইমেইল: fayzar.computer@gmail.com</li></ul></div>',
  '    <div><h4>দোকানের ঠিকানা</h4><p>ফুলবাড়ী সরকারি কলেজ গেটের পশ্চিম পার্শ্বে, ফুলবাড়ী, দিনাজপুর - ৫২৬০</p><p><a href="tel:01717101919">০১৭১৭-১০১৯১৯</a> · <a href="https://wa.me/8801717101919" target="_blank" rel="noopener">হোয়াটসঅ্যাপ</a></p></div>',
  '  </div>',
  '  <div class="fz-copy"><span>© <span id="currentYear">২০২৬</span> ফয়জার কম্পিউটার এন্ড ফটোস্ট্যাট। সর্বস্বত্ব সংরক্ষিত।</span><span><a href="portal.html">জব পোর্টাল</a> · <a href="tools.html">ছবি ও স্বাক্ষর রিসাইজার</a> · <a href="results.html">ফলাফল</a> · <a href="admin.html">এডমিন</a></span></div>',
  '</footer>',
  '<!-- FZ-FOOT:END -->'
].join('\n');

const HEAD = '<!-- FZ-HEAD --><link rel="stylesheet" href="css/fayzar-theme.css"><script src="js/fayzar-nav.js" defer></script>';

// oldNav: প্রথমবার কোন ব্লক বদলাবে ('nav' | 'header' | 'insert' = <body> এর ঠিক পরে বসাও)
// oldFoot: 'footer' | 'none' (ফুটার দেওয়া হবে না — পূর্ণ-পর্দার অ্যাপ-পাতা)
const PAGES = [
  { file: 'index.html', tools: 'none', oldNav: 'insert', oldFoot: 'none' },
  { file: 'services.html', tools: 'none', oldNav: 'insert', oldFoot: 'none' },
  { file: 'samples.html', tools: 'none', oldNav: 'insert', oldFoot: 'none' },
  { file: 'ocr-classic.html', tools: 'index', oldNav: 'nav', oldFoot: 'footer',
    title: 'পুরোনো OCR পাতা (রক্ষণাবেক্ষণ) | ফয়জার এআই কম্পোজ' },
  { file: 'doc-converter.html', tools: 'docConverter', oldNav: 'header', oldFoot: 'footer',
    title: 'ওয়ার্ড ডকুমেন্ট ইউনিকোড ➔ বিজয় কনভার্টার | ফয়জার এআই কম্পোজ' },
  { file: 'docx-to-doc.html', tools: 'none', oldNav: 'header', oldFoot: 'footer',
    title: 'DOCX থেকে DOC (Word 2003) কনভার্টার | ফয়জার এআই কম্পোজ' },
  { file: 'layout-studio.html', tools: 'none', oldNav: 'insert', oldFoot: 'none', isStatic: true,
    title: 'লেআউট স্টুডিও — MD থেকে Word | ফয়জার এআই কম্পোজ' }
];

function replaceBlock(src, open, close) {
  const re = new RegExp(`<${open}[\\s>][\\s\\S]*?</${close}>`);
  if (!re.test(src)) throw new Error(`<${open}> ব্লক পাওয়া যায়নি`);
  return src.replace(re, '@@FZ@@');
}

for (const p of PAGES) {
  let s = fs.readFileSync(p.file, 'utf8');
  const before = s;
  // হেড
  if (!s.includes('<!-- FZ-HEAD -->')) s = s.replace('</head>', `  ${HEAD}\n</head>`);
  // নেভ
  const navHtml = nav(p.tools, p.isStatic);
  if (s.includes('<!-- FZ-NAV:START')) s = s.replace(/<!-- FZ-NAV:START[\s\S]*?<!-- FZ-NAV:END -->/, () => navHtml);
  else if (p.oldNav === 'insert') s = s.replace(/<body[^>]*>/, (m) => `${m}\n${navHtml}`);
  else s = replaceBlock(s, p.oldNav, p.oldNav).replace('@@FZ@@', () => navHtml);
  // ফুটার
  if (s.includes('<!-- FZ-FOOT:START')) s = s.replace(/<!-- FZ-FOOT:START[\s\S]*?<!-- FZ-FOOT:END -->/, () => FOOT);
  else if (p.oldFoot === 'footer') s = replaceBlock(s, 'footer', 'footer').replace('@@FZ@@', () => FOOT);
  // শিরোনাম
  if (p.title) {
    s = s.replace(/<title>[\s\S]*?<\/title>/, `<title>${p.title}</title>`);
    s = s.replace(/<meta name="title" content="[^"]*">/, `<meta name="title" content="${p.title}">`);
  }
  if (s !== before) { fs.writeFileSync(p.file, s); console.log('updated', p.file); } else console.log('unchanged', p.file);
}
