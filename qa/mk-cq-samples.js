#!/usr/bin/env node
/**
 * Part-11 — সৃজনশীল বুকলেট স্যাম্পল জেনারেটর
 * -------------------------------------------
 * `tests/fixtures/cq-long.input.md` ও `cq-short.input.md`-এর **বাংলা লেখা হাতে টাইপ না করে**
 * (কোডপয়েন্ট-দূষিত নতুন টেক্সট এড়ানো) পুনর্ব্যবহার করে প্রকৃত CQ ফরম্যাটের স্যাম্পল বানায়:
 *
 *   [উদ্দীপক N]  →  উদ্দীপক
 *   ১. স্টেম:
 *   ক. … ১ / খ. … ২ / গ. … ৩ / ঘ. … ৪   →  subQuestions + mark
 *   --- অথবা ---                          →  বিকল্প প্রশ্ন ডিভাইডার
 *   | ক | খ |                             →  সাদামাটা ছক (বক্সহীন উদ্দীপকের অংশ)
 *
 * আউটপুট: tests/fixtures/cq-booklet-*.input.md  (regression fixture)
 *          proof/samples/cq-booklet-*.{md}      (প্রমাণ-সংকলনের উৎস)
 *
 *   node qa/mk-cq-samples.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FX = path.join(ROOT, 'tests', 'fixtures');
const SAMPLES = path.join(ROOT, 'proof', 'samples');

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';
const bn = (n) => String(n).split('').map((d) => (d >= '0' && d <= '9' ? BANGLA_DIGITS[+d] : d)).join('');

function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+)\s*:\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return { fm, body: raw.slice(m[0].length) };
}

/** উৎস ফিক্সচার থেকে উদ্দীপক-গ্রুপ আকারে প্রশ্ন সংগ্রহ */
function readGroups(file) {
  const { fm, body } = splitFrontmatter(fs.readFileSync(file, 'utf8'));
  const groups = [];
  let cur = null;
  for (const lineRaw of body.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line) continue;
    const g = line.match(/^\[উদ্দীপক\s*([০-৯\d]+)\]$/);
    if (g) {
      cur = { title: line, context: [], subs: [] };
      groups.push(cur);
      continue;
    }
    if (!cur) continue;
    const q = line.match(/^([০-৯\d]+)[।.)]\s*([কখগঘ])[।.)]?\s*(.*)$/);
    if (q) { cur.subs.push({ text: q[3].trim() }); continue; }
    if (/^([০-৯\d]+)[।.)]/.test(line)) { continue; }
    cur.context.push(line);
  }
  return { fm, groups: groups.filter((x) => x.subs.length > 0) };
}

function block(idx, grp, opts) {
  const o = opts || {};
  const labels = ['ক', 'খ', 'গ', 'ঘ'];
  const marks = [1, 2, 3, 4];
  const out = [];
  // (১) উদ্দীপক-ব্লক — parser `নিচের উদ্দীপকটি` লাইন থেকে preContext ধরে
  out.push('নিচের উদ্দীপকটি পড়ে প্রশ্নগুলোর উত্তর দাও:');
  for (const c of grp.context.slice(0, 2)) out.push(c);
  out.push('');
  // (২) প্রশ্নের স্টেম — এর পরের অ-নম্বরিত লাইনগুলো q.stimulus-এ ওঠে
  out.push(bn(idx + 1) + '. নিচের প্রশ্নগুলোর উত্তর দাও:');
  if (o.table) {
    out.push('| বিবরণ | মান |', '| --- | --- |', '| উদ্দীপক ' + bn(idx + 1) + ' | ' + bn(idx + 1) + ' |');
  }
  // (৩) উপ-প্রশ্ন + খাঁটি নম্বর; বিকল্প প্রশ্ন থাকলে মাঝখানে অথবা ডিভাইডার
  const subs = grp.subs.slice(0, 4);
  subs.forEach((sb, i) => {
    out.push(labels[i] + '. ' + sb.text + ' ' + bn(marks[i]));
    if (o.alt && i === 1 && subs.length > 3) {
      out.push('--- অথবা ---');
      out.push(labels[i] + '. ' + subs[subs.length - 1].text + ' ' + bn(marks[i]));
    }
  });
  out.push('');
  return out;
}

function paper(fm, groups, opts) {
  const o = opts || {};
  const L = ['---', 'doc_type: EXAM_CQ', 'columns: 2'];
  const put = (k, v) => { if (v !== undefined && v !== '') L.push(k + ': "' + v + '"'); };
  put('institute', fm.institute);
  put('location', fm.location);
  put('exam', fm.exam);
  put('class', fm.class);
  put('subject', fm.subject);
  put('time', fm.time);
  put('fullMarks', fm.fullMarks);
  L.push('---', '');
  for (let i = 0; i < groups.length; i++) L.push.apply(L, block(i, groups[i], o));
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function cycle(src, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(src[i % src.length]);
  return out;
}

function main() {
  const long = readGroups(path.join(FX, 'cq-long.input.md'));
  const short = readGroups(path.join(FX, 'cq-short.input.md'));
  const pool = long.groups.concat(short.groups);
  if (pool.length < 2) throw new Error('উৎস ফিক্সচারে যথেষ্ট উদ্দীপক-গ্রুপ নেই');

  const fm = Object.assign({}, long.fm, { location: long.fm.location || 'রংপুর জেলা' });
  const files = [
    { id: 'cq-booklet-2', groups: cycle(pool, 2), opts: {}, tag: 'ছোট পত্র — পৃষ্ঠা ১-এই বসে যায়' },
    { id: 'cq-booklet-6', groups: cycle(pool, 6), opts: { alt: true }, tag: 'আট+ উপ-প্রশ্ন — দুই কলামে ছড়ায়' },
    { id: 'cq-booklet-10', groups: cycle(pool, 10), opts: { alt: true, table: true }, tag: 'লম্বা পত্র — উপচানো অংশ ব্যাক কভারে ভরে' },
    { id: 'cq-booklet-16', groups: cycle(pool, 16), opts: { alt: true, table: true }, tag: 'অতি লম্বা পত্র — ব্যালান্স ও ইম্পোজিশন যাচাই' }
  ];

  // প্রিফ-স্যাম্পল: হেডার-লাইনসহ প্লেইন সংস্করণ (ইউজার যেমন OCR টেক্সট পেস্ট করেন),
  // কারণ parseQuestionPaper YAML frontmatter পড়ে না — হেডার ব্লক তবু দেখানোর জন্য
  const headerLines = [fm.institute, fm.location, fm.exam,
    (fm.class ? 'শ্রেণিঃ ' + fm.class : '') + (fm.subject ? ' | বিষয়ঃ ' + fm.subject : ''),
    (fm.time ? 'সময়: ' + fm.time : '') + (fm.fullMarks ? '   পূর্ণমান: ' + fm.fullMarks : '')].filter(Boolean);

  if (!fs.existsSync(SAMPLES)) fs.mkdirSync(SAMPLES, { recursive: true });
  for (const f of files) {
    const txt = paper(fm, f.groups, f.opts);
    fs.writeFileSync(path.join(FX, f.id + '.input.md'), txt, 'utf8');
    fs.writeFileSync(path.join(SAMPLES, f.id + '.md'), txt, 'utf8');
    fs.writeFileSync(path.join(SAMPLES, f.id + '.plain.md'), headerLines.join('\n') + '\n\n' + txt.split(/\r?\n---\r?\n/)[1] + '\n', 'utf8');
    console.log('✓ ' + f.id + '  (' + f.groups.length + ' উদ্দীপক-গ্রুপ) — ' + f.tag);
  }
}

main();
