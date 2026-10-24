// GATE8: c3 লেআউট-ছক চিহ্ন + এক-পাতা আঁটানো (FZ_OFF_FIT1) — Gemini লাগে না
// চালানো: node tests/gate8.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
// FIT1 এখন ডিফল্ট বন্ধ — এই টেস্ট চালু অবস্থাটা যাচাই করে
if (!process.env.FZ_OFF_FIT1) process.env.FZ_ON_FIT1 = '1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const g = globalThis;
g.EquationConverter = require(path.join(ROOT, 'js/equation-converter.js'));
g.BanglaConverter = require(path.join(ROOT, 'js/bangla-converter-engine.js'));
g.TextRunProcessor = require(path.join(ROOT, 'js/layout-engine/text-run-processor.js'));
g.jszip = require(path.join(ROOT, 'js/jszip.min.js'));
g.ExportDualEngine = require(path.join(ROOT, 'js/engines/export-dual-engine.js'));
const DM = require(path.join(ROOT, 'js/layout-engine/doc-model.js'));
const AD = require(path.join(ROOT, 'js/layout-engine/doc-model-adapters.js'));
const GC = require(path.join(ROOT, 'js/layout-engine/general-clean-layout.js'));
const SC = require(path.join(ROOT, 'js/layout-engine/self-check.js'));
const S = path.join(ROOT, 'scratch/samples/new/2026-10-22/out');
const GOLD = path.join(ROOT, 'eval/golden-set');

let pass = 0, fail = 0;
const ck = (c, n) => { if (c) pass++; else { fail++; console.log('ব্যর্থ:', n); } };
const docOf = (id) => AD.fromCapture(JSON.parse(fs.readFileSync(path.join(S, id, 'capture.json'), 'utf8')), {});
const buf = async (doc) => { const b = await GC.renderDocx(doc, { generalClean: true }); return Buffer.isBuffer(b) ? b : Buffer.from(await b.arrayBuffer()); };
const tmp = fs.mkdtempSync(path.join(process.env.TEMP || ROOT, 'gate8-'));
function c3Of(id, b) {
  const d = path.join(tmp, id); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'clean.docx'), b);
  fs.writeFileSync(path.join(d, 'kept-text.md'), DM.plainText(docOf(id)) + '\n');
  const p = spawnSync(process.execPath, [path.join(ROOT, 'qa/usability-score.mjs'), path.join(d, 'clean.docx'), path.join(GOLD, id, 'expected.json'), path.join(d, 'kept-text.md')], { encoding: 'utf8' });
  return JSON.parse(p.stdout).checks.c3;
}

// (ক)(খ) c3 পাস
for (const [id, tag] of [['T25_jpeg', 'ক'], ['T21_jpeg', 'খ']]) {
  const c = c3Of(id, await buf(docOf(id)));
  ck(c.pass, `(${tag}) ${id} c3 পাস ${JSON.stringify(c.value)}`);
}

// (গ) চিহ্নহীন বর্ডারওয়ালা আসল ছক গোনা হয়; চিহ্নযুক্ত বর্ডারওয়ালা ছক গোনা হয় না
const bd = '<w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/></w:tblBorders>';
const tbl = (cap) => `<w:tbl><w:tblPr>${bd}${cap}</w:tblPr><w:tblGrid><w:gridCol w:w="1"/></w:tblGrid><w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl>`;
ck(SC.isLayoutTable(tbl('')) === false, '(গ) চিহ্নহীন বর্ডারওয়ালা ছক আসল ছক');
ck(SC.isLayoutTable(tbl('<w:tblCaption w:val="fz-layout"/>')) === true, '(গ) চিহ্নযুক্ত ছক লেআউট-ছক');

// (ঘ) est ও ফন্ট; (ঙ) সুইচ বন্ধে আগের মতো
const estOf = (id) => GC.render(docOf(id), { generalClean: true }).stats;
const notes = [];
for (const id of ['T21_jpeg', 'T07_jpeg']) {
  process.env.FZ_OFF_FIT1 = '1';
  const old = estOf(id); const oldBuf = await buf(docOf(id));
  delete process.env.FZ_OFF_FIT1;
  const nw = estOf(id); const newBuf = await buf(docOf(id));
  ck(nw.estPages < old.estPages, `(ঘ) ${id} est কমেছে ${old.estPages} → ${nw.estPages}`);
  ck(nw.base >= 10, `(ঘ) ${id} ফন্ট ≥১০ (${nw.base})`);
  if (nw.estPages > 1.05) notes.push(`${id} est=${nw.estPages} (>১.০৫: ১০pt/০.৫" সীমায় আর কমানো যায়নি)`);
  process.env.FZ_OFF_FIT1 = '1';
  const again = await buf(docOf(id)); const again2 = estOf(id);
  delete process.env.FZ_OFF_FIT1;
  ck(oldBuf.equals(again) && old.estPages === again2.estPages, `(ঙ) ${id} FZ_OFF_FIT1 স্থির`);
  ck(old.estPages > 1.05 && newBuf.length > 0, `(ঙ) ${id} পুরোনো est ছিল >১`);
}
// (ঙ) সুইচ বন্ধে লাইন-ফাঁক বদলায় না: styles-এ ২৭৬ ফাঁক বহাল
process.env.FZ_OFF_FIT1 = '1';
const offSt = GC.render(docOf('T07_jpeg'), { generalClean: true });
ck(!offSt.stylesXml.includes('w:line="200"') && !offSt.stylesXml.includes('w:line="240"') && offSt.stats.margin >= 720, '(ঙ) FZ_OFF_FIT1: নতুন লাইন-ফাঁক নেই');
delete process.env.FZ_OFF_FIT1;

// (চ) পুরোনো self-check টেস্ট
const r = spawnSync(process.execPath, [path.join(ROOT, 'tests/self-check.test.js')], { encoding: 'utf8' });
ck(r.status === 0, '(চ) tests/self-check.test.js পাস');

notes.forEach((n) => console.log('নোট:', n));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`ফলাফল: ${pass} পাস, ${fail} ব্যর্থ`);
process.exit(fail ? 1 : 0);
