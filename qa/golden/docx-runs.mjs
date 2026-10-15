// WORK_PLAN A1: .docx-এর XML থেকে অনুচ্ছেদ-ক্রমে রান (লেখা, ফন্ট, আকার, মোটা, হেলানো, নিচে-দাগ, রং) — স্টাইল-উত্তরাধিকারসহ।
// মূল দেহের অনুচ্ছেদ (টেবিল-ঘরসহ) আর টেক্সটবক্সের অনুচ্ছেদ আলাদা। বাংলা (জটিল-লিপি) অক্ষরে Word যেমন cs-ফন্ট/szCs/bCs নেয়, তেমনই।
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const kids = (n) => { const o = []; for (let c = n && n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) o.push(c); return o; };
const child = (n, name) => kids(n).find((c) => c.localName === name) || null;
const attr = (n, a) => (n ? n.getAttributeNS(W, a) || n.getAttribute('w:' + a) || null : null);
const toggle = (n) => (n ? !/^(0|false|off)$/i.test(attr(n, 'val') || '1') : undefined);

function readRPr(rPr) {
  if (!rPr) return {};
  const o = {};
  const f = child(rPr, 'rFonts');
  if (f) for (const k of ['ascii', 'hAnsi', 'cs', 'eastAsia']) { const v = attr(f, k); if (v) o[k] = v; }
  const sz = child(rPr, 'sz'), szCs = child(rPr, 'szCs');
  if (sz) o.sz = Number(attr(sz, 'val')) / 2;
  if (szCs) o.szCs = Number(attr(szCs, 'val')) / 2;
  for (const k of ['b', 'bCs', 'i', 'iCs']) { const n = child(rPr, k); if (n) o[k] = toggle(n); }
  const u = child(rPr, 'u'); if (u) o.u = (attr(u, 'val') || 'single') !== 'none';
  const c = child(rPr, 'color'); if (c) o.color = attr(c, 'val');
  return o;
}

function loadStyles(xml) {
  const st = { defaults: {}, byId: {}, defaultPara: null };
  if (!xml) return st;
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const dd = doc.getElementsByTagNameNS(W, 'rPrDefault')[0];
  if (dd) st.defaults = readRPr(child(dd, 'rPr'));
  const list = doc.getElementsByTagNameNS(W, 'style');
  for (let i = 0; i < list.length; i++) {
    const s = list[i], id = attr(s, 'styleId');
    st.byId[id] = { basedOn: attr(child(s, 'basedOn'), 'val'), rPr: readRPr(child(s, 'rPr')), type: attr(s, 'type') };
    if (attr(s, 'type') === 'paragraph' && /^(1|true|on)$/i.test(attr(s, 'default') || '')) st.defaultPara = id;
  }
  return st;
}
function chain(st, id, seen = new Set()) {
  if (!id || !st.byId[id] || seen.has(id)) return {};
  seen.add(id);
  return Object.assign({}, chain(st, st.byId[id].basedOn, seen), st.byId[id].rPr);
}

function runText(r) {
  let t = '';
  for (const c of kids(r)) {
    if (c.localName === 't') t += c.textContent;
    else if (c.localName === 'tab' || c.localName === 'ptab') t += '\t';
    else if (c.localName === 'br' || c.localName === 'cr') t += '\n';
    else if (c.localName === 'noBreakHyphen') t += '-';
  }
  return t;
}

const HAS_BN = /[ঀ-৿]/;
function effective(p, raw) {
  const bn = HAS_BN.test(raw);
  return {
    font: (bn ? p.cs || p.ascii || p.hAnsi : p.ascii || p.hAnsi || p.cs) || null,
    size: (bn ? p.szCs || p.sz : p.sz || p.szCs) || null,
    b: (bn ? (p.bCs !== undefined ? p.bCs : p.b) : p.b) ? -1 : 0,
    i: (bn ? (p.iCs !== undefined ? p.iCs : p.i) : p.i) ? -1 : 0,
    u: p.u ? 1 : 0,
    color: p.color || null
  };
}

// অনুচ্ছেদের সব রান — মন্তব্য/মুছে-ফেলা/টেক্সটবক্স/Fallback বাদ; ফিল্ডের কোড বাদ, ফল রাখা
function collectRuns(p, base, st, out) {
  let inCode = 0;
  const walk = (n) => {
    for (const c of kids(n)) {
      const ln = c.localName;
      if (ln === 'txbxContent' || ln === 'Fallback' || ln === 'del' || ln === 'pPr' || ln === 'drawing' || ln === 'pict') continue;
      if (ln === 'r') {
        const fc = child(c, 'fldChar');
        if (fc) { const ty = attr(fc, 'fldCharType'); if (ty === 'begin') inCode++; else if (ty === 'separate' && inCode) inCode--; continue; }
        if (inCode) continue;
        const t = runText(c); if (!t) continue;
        const rPr = child(c, 'rPr');
        const rs = rPr ? chain(st, attr(child(rPr, 'rStyle'), 'val')) : {};
        const props = Object.assign({}, base, rs, readRPr(rPr));
        const e = effective(props, t);
        const last = out[out.length - 1];
        if (last && last.font === e.font && last.size === e.size && last.b === e.b && last.i === e.i && last.u === e.u && last.color === e.color) last.t += t;
        else out.push(Object.assign({ t }, e));
        continue;
      }
      walk(c);
    }
  };
  walk(p);
  return out;
}

export async function docxParagraphRuns(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const st = loadStyles(zip.file('word/styles.xml') ? await zip.file('word/styles.xml').async('string') : null);
  const doc = new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'), 'text/xml');
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  const paras = [], boxes = [];
  const paraRuns = (p) => {
    const ps = child(child(p, 'pPr'), 'pStyle');
    // pPr/rPr শুধু অনুচ্ছেদ-চিহ্নের — রানে প্রযোজ্য নয়
    const base = Object.assign({}, st.defaults, chain(st, attr(ps, 'val') || st.defaultPara));
    return collectRuns(p, base, st, []);
  };
  // টেক্সটবক্স: প্রতিটি txbxContent একটি বাক্স (Fallback-এর অনুলিপি বাদ)
  const boxWalk = (n) => {
    for (const c of kids(n)) {
      if (c.localName === 'Fallback') continue;
      if (c.localName === 'txbxContent') { boxes.push(kids(c).filter((x) => x.localName === 'p').map((p) => ({ runs: paraRuns(p) }))); continue; }
      boxWalk(c);
    }
  };
  const walk = (n) => {
    for (const c of kids(n)) {
      if (c.localName === 'p') { paras.push({ runs: paraRuns(c) }); boxWalk(c); continue; }
      if (c.localName === 'sectPr' || c.localName === 'Fallback') continue;
      walk(c); // tbl/tr/tc/sdt/sdtContent/customXml
    }
  };
  walk(body);
  for (const p of paras) p.text = p.runs.map((r) => r.t).join('');
  return { paras, boxes };
}
