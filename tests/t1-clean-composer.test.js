'use strict';

// TEMPLATE_COMPOSE_PLAN T1 gates — ক্লিন ওয়ার্ড (FayzarCleanComposer): ১-কলাম, টেবিল/সমীকরণ/মিশ্র রান অক্ষত, কপি/.txt/.md।
// চালানো: node tests/t1-clean-composer.test.js

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const g = globalThis;
g.EquationConverter = require(path.join(ROOT, 'js/equation-converter.js'));
g.BanglaConverter = require(path.join(ROOT, 'js/bangla-converter-engine.js'));
g.TextRunProcessor = require(path.join(ROOT, 'js/layout-engine/text-run-processor.js'));
g.jszip = require(path.join(ROOT, 'js/jszip.min.js'));
g.ExportDualEngine = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const C = require(path.join(ROOT, 'js/layout-engine/clean-composer.js'));
const JSZip = g.jszip;

let gates = 0;
const check = (cond, name) => { assert.ok(cond, name); gates++; };
const fx = (f) => fs.readFileSync(path.join(ROOT, 'tests/fixtures', f), 'utf8');
const count = (s, re) => (s.match(re) || []).length;

(async () => {
  // ১) পার্স: ফ্রন্টম্যাটার/অডিট/চিত্র-ট্যাগ/পৃষ্ঠা-মার্কার বাদ, হেডারের ইংরেজি চাবি বাদ, টেবিলের বিভাজক-সারি বাদ
  const md = '---\ndoc_type: EXAM_GENERAL\n---\n# institute: ফয়জার স্কুল\n===== পৃষ্ঠা ১/২ =====\n[[FIG: p=1; box=1,2,3,4]]\n| ক | খ |\n|---|:-:|\n| $|x|$ | ২ |\n\n- প্রথম\n\tক. দেখাও।\t২\n[এআই অডিট নোট ও পরিবর্তনসমূহ: ঠিক আছে]';
  const bl = C.parse(md);
  check(bl[0].kind === 'heading' && bl[0].text === 'ফয়জার স্কুল', 'heading key stripped');
  check(bl[1].kind === 'table' && bl[1].rows.length === 2 && bl[1].rows[1][0] === '$|x|$', 'table: separator dropped, pipe inside math kept');
  check(bl[2].bullet && bl[2].text === 'প্রথম' && bl[3].indent === 1, 'bullet and tab indent');
  check(bl.length === 4 && !bl.some((b) => /অডিট|FIG|পৃষ্ঠা|doc_type/.test(b.text || '')), 'frontmatter/audit/fig/page marker removed');

  // ২) আসল OCR (class8sci): প্রতিটি টেবিল-সারি ও ঘর, সমীকরণ OMML, মিশ্র রান
  const sci = fx('real-ocr/class8sci.md');
  const { xml, blocks } = C.bodyXml(sci);
  const tables = blocks.filter((b) => b.kind === 'table');
  const mdRows = sci.split('\n').filter((l) => /^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l)).length;
  check(tables.length >= 1 && count(xml, /<w:tbl>/g) === tables.length, 'every table emitted');
  check(count(xml, /<w:tr>/g) === mdRows, `all table rows kept (${mdRows})`);
  check(count(xml, /<w:tc>/g) === tables.reduce((s, t) => s + t.rows.length * t.rows[0].length, 0), 'all cells kept');
  check(/<m:oMath/.test(xml), 'equations as editable OMML');
  check(/w:ascii="Times New Roman"/.test(xml) && /w:ascii="Kalpurush"/.test(xml), 'mixed Bengali/English runs');
  check(!/w:cols|w:sectPr[^]*<w:cols/.test(xml) && !/\[\[FIG/.test(xml), 'no columns, no raw figure tags');

  // ৩) গণিত (hmathcq): নম্বর ডান-ট্যাবে; লেখা হারায় না (প্রতিটি বাংলা শব্দ XML-এ)
  const hm = fx('real-ocr/hmathcq.md');
  const hx = C.bodyXml(hm).xml;
  check(count(hx, /<w:tab w:val="right" w:pos="9026"\/>/g) >= 6, 'marks on right tab stop');
  const words = (C.plainText(hm).match(/[ঀ-৿]{3,}/g) || []);
  const missing = words.filter((w) => hx.indexOf(w) === -1);
  check(words.length > 50 && missing.length === 0, 'every Bengali word present in docx (' + missing.slice(0, 3).join(',') + ')');

  // ৪) মাস্টার .docx: খোলা যায়, Heading স্টাইল, কালপুরুষ ১২pt, লাইন ১.১৫, A4
  const out = await C.renderDocx(sci);
  const zip = await JSZip.loadAsync(typeof out.arrayBuffer === 'function' ? await out.arrayBuffer() : out);
  const doc = await zip.file('word/document.xml').async('string');
  const sty = await zip.file('word/styles.xml').async('string');
  check(/<w:pStyle w:val="Heading2"\/>/.test(doc) && /w:styleId="Heading1"/.test(sty), 'Word heading styles');
  check(/w:ascii="Kalpurush"/.test(sty) && /w:sz w:val="24"/.test(sty) && /w:line="276"/.test(sty), 'Kalpurush 12pt, 1.15 line');
  check(/<w:pgSz w:w="11906" w:h="16838"\/>/.test(doc) && count(doc, /<w:sectPr>/g) === 1, 'A4, single section');

  // ৫) কপি/.txt ও .md
  const pt = C.plainText(sci);
  check(!/^---|doc_type|\$|\*\*|^#|\[\[FIG|^\|/m.test(pt), 'plain text has no markdown/frontmatter/tags');
  check(/\t/.test(pt) && /NaOH/.test(pt), 'table cells tab-separated, content kept');
  const mdo = C.markdown(sci);
  check(/\$NaOH\$/.test(mdo) && !/doc_type|\[\[FIG/.test(mdo), '.md keeps LaTeX, drops frontmatter/tags');

  console.log(`T1 clean-composer: ${gates} passed`);
})().catch((e) => { console.error(e); process.exit(1); });
