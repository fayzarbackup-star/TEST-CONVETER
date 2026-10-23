/**
 * Fayzar — doc-model (Phase 2A, FINAL_WORK_PLAN M2) — শুধু ডেটা-কাঠামো, কোনো রেন্ডার নয়
 * ===================================================================================
 * document = { version:1, meta:{docType,source}, columns:1|2, pages:[ { index, blocks:[block…] } ] }
 * block    = { role, text, lines[], align:'l'|'c'|'r', size:'s'|'m'|'l'|'xl'|null, bold, italic, underline,
 *              level (heading ১–৩), box:[y0,x0,y1,x1] (০–১০০০, উৎসের জায়গা), page, marks:{signature,stamp,note} }
 * role     = title|heading|paragraph|list|table|side_by_side|signature|stamp|note|question|option_row|figure
 *            + label_value|footer|rule|header|page_number|other  (ডিফল্ট নীতিতে header/page_number/other/stamp/note বাদ)
 * বিশেষ ক্ষেত্র:
 *   table        → rows: string[][] (আয়তাকার), header: bool        option_row → cells: string[]
 *   side_by_side → left: block[], right: block[]  (বর্ডারহীন ২-কলাম)   figure → figIndex (ঐচ্ছিক; QZFIGnQZ মার্কার)
 * GENERAL_CLEAN শুধু এই কাঠামো পড়ে; উৎস-বিশেষ জ্ঞান থাকে অ্যাডাপ্টারে (doc-model-adapters.js)।
 */
(function (global) {
  'use strict';

  const ROLES = ['title', 'heading', 'paragraph', 'list', 'table', 'side_by_side', 'signature', 'stamp', 'note', 'question',
    'option_row', 'figure', 'label_value', 'footer', 'rule', 'header', 'page_number', 'other'];
  const ALIGN = { l: 'l', c: 'c', r: 'r', left: 'l', center: 'c', right: 'r' };
  const DROPPED = ['header', 'page_number', 'other', 'stamp', 'note'];       // v1: আউটপুটে রাখা হয় না (§৬)

  const str = (v) => (v == null ? '' : String(v));

  /** ব্লক তৈরি + স্বাভাবিকীকরণ */
  function block(role, props) {
    if (ROLES.indexOf(role) < 0) throw new Error('doc-model: অজানা ভূমিকা ' + role);
    const p = props || {};
    const b = { role, text: '', lines: [], align: ALIGN[p.align] || 'l', size: p.size || null, bold: !!p.bold, italic: !!p.italic,
      underline: !!p.underline, level: p.level || 0, box: p.box || null, page: p.page || 1, marks: p.marks || {} };
    if (role === 'table') {
      const rows = (p.rows || []).map((r) => r.map(str));
      const n = rows.reduce((m, r) => Math.max(m, r.length), 0);
      b.rows = rows.map((r) => r.concat(Array(n - r.length).fill('')));
      b.header = p.header !== false;
      b.text = b.rows.map((r) => r.join(' | ')).join('\n');
    } else if (role === 'side_by_side') {
      b.left = (p.left || []).slice(); b.right = (p.right || []).slice();
      b.text = b.left.concat(b.right).map((x) => x.text).join('\n');
    } else {
      b.lines = Array.isArray(p.lines) && p.lines.length ? p.lines.map(str) : str(p.text).split('\n');
      b.text = b.lines.join('\n');
      if (role === 'option_row') b.cells = Array.isArray(p.cells) ? p.cells.map(str) : b.text.split(/\s*\|\s*/).filter((x) => x !== '');
      if (role === 'figure' && p.figIndex != null) b.figIndex = p.figIndex;
    }
    if (role === 'heading' && !b.level) b.level = 2;
    return b;
  }

  function createDocument(meta) {
    return { version: 1, meta: Object.assign({ docType: '', source: '' }, meta || {}), columns: 1, pages: [] };
  }
  function addPage(doc, blocks) {
    const pg = { index: doc.pages.length + 1, blocks: [] };
    doc.pages.push(pg);
    (blocks || []).forEach((b) => pg.blocks.push(b));
    return pg;
  }

  /** সব ব্লক (পাতা ধরে, side_by_side-এর ভেতরের ব্লকও) — fn(block, pageIndex) */
  function walk(doc, fn) {
    const rec = (b, pi) => { fn(b, pi); if (b.role === 'side_by_side') b.left.concat(b.right).forEach((c) => rec(c, pi)); };
    doc.pages.forEach((pg) => pg.blocks.forEach((b) => rec(b, pg.index)));
  }
  function flat(doc) { const out = []; walk(doc, (b) => { if (b.role !== 'side_by_side') out.push(b); }); return out; }
  function isKept(b) { return DROPPED.indexOf(b.role) < 0; }

  /** রাখা-ভূমিকাগুলোর শব্দ (সম্পূর্ণতা-যাচাইয়ের জন্য) */
  function words(doc, onlyKept) {
    const out = [];
    flat(doc).forEach((b) => {
      if (onlyKept && !isKept(b)) return;
      const t = b.role === 'table' ? b.rows.map((r) => r.join(' ')).join(' ') : b.text;
      t.replace(/\*\*/g, ' ').split(/\s+/).forEach((w) => { if (w && /[\p{L}\p{N}]/u.test(w)) out.push(w); });
    });
    return out;
  }
  function plainText(doc) { return flat(doc).filter(isKept).map((b) => b.text).join('\n'); }

  /** কাঠামোগত ত্রুটির তালিকা (খালি = ঠিক) */
  function validate(doc) {
    const errs = [];
    if (!doc || doc.version !== 1 || !Array.isArray(doc.pages)) return ['doc: version/pages ঠিক নেই'];
    walk(doc, (b, pi) => {
      if (ROLES.indexOf(b.role) < 0) errs.push('p' + pi + ': অজানা ভূমিকা ' + b.role);
      if (b.role === 'table' && b.rows.some((r) => r.length !== b.rows[0].length)) errs.push('p' + pi + ': টেবিল আয়তাকার নয়');
      if (b.role === 'side_by_side' && (!b.left.length || !b.right.length)) errs.push('p' + pi + ': side_by_side-এর এক পাশ খালি');
    });
    return errs;
  }

  const FayzarDocModel = { ROLES, DROPPED, block, createDocument, addPage, walk, flat, isKept, words, plainText, validate };
  global.FayzarDocModel = FayzarDocModel;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarDocModel;
})(typeof globalThis !== 'undefined' ? globalThis : this);
