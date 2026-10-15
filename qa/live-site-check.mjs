// QA: লাইভ সাইটে (Cloudflare Pages) নতুন ফাইল পৌঁছেছে কি না — প্রতিটি ফাইলে চিহ্ন-শব্দ খোঁজা।
// চালানো: node qa/live-site-check.mjs [baseUrl=https://fayzar-conveter.pages.dev]
const B = (process.argv[2] || 'https://fayzar-conveter.pages.dev').replace(/\/+$/, '');
const checks = [
  ['/index.html', ['figure-transfer-store.js', 'figure-extractor.js', 'figure-review-ui.js', 'fayzar-export.js']],
  ['/studio.html', ['figure-transfer-store.js', 'figure-extractor.js']],
  ['/js/layout-engine/figure-extractor.js', ['estimateSkew', 'clearBorderFragments', 'normalizePlacement']],
  ['/js/layout-engine/doc-mhtml-packager.js', ['sizeImgTags']],
  ['/js/figure-review-ui.js', ['turn(0.5)']],
  ['/js/ai-ocr-engine.js', ['prepareSourceFigures', "'LOCATION'"]],
  ['/js/proxy-failure-policy.js', ["'location'"]],
  ['/js/engines/question-engine.js', ['Part-16.3']]
];
let bad = 0;
for (const [p, needles] of checks) {
  const r = await fetch(B + p + '?nocache=' + Date.now());
  const t = await r.text();
  const res = needles.map((n) => (t.includes(n) ? '✓ ' : (bad++, '✗ ')) + n);
  console.log(String(r.status).padEnd(4), p.padEnd(42), res.join('  '));
}
console.log(bad ? `⚠️ ${bad} চিহ্ন পাওয়া যায়নি` : '✅ সব নতুন ফাইল লাইভে আছে');
